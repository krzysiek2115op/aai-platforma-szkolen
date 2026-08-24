/**
 * Eksport treści Pluginu 1 z PostgreSQL do formatu importowalnego w WordPressie.
 *
 * PO CO. Prototyp Next.js + Postgres jest specyfikacją; produkcja idzie na
 * WordPressa (decyzja zespołu 2026-08-18). Dane muszą przejść razem z kodem —
 * dwa kursy, 6+6 modułów, 73 lekcje prozy i 12 rodzajów sekcji sprzedażowych
 * to dorobek, którego nikt nie odtworzy ręcznie.
 *
 * DLACZEGO JSON, A NIE SQL. Zrzut SQL wiąże się z prefiksem tabel, kolejnością
 * ID i wersją silnika — przy pierwszej rozbieżności import wysypuje się w środku
 * i zostawia bazę w połowie. JSON jest formatem pośrednim: czyta go
 * `wordpress/import-kursy.php` przez WP-CLI i wykłada dane FUNKCJAMI WordPressa
 * (`wp_insert_post`, `update_post_meta`), więc WP sam nadaje ID, sam dba
 * o rewizje i sam waliduje. Ten sam wzorzec ma repo strony głównej dla wpisów
 * bloga (`wordpress/skrypty/import-blog.php`) — sprawdzony na produkcji.
 *
 * SKĄD BIERZE DANE. Wyłącznie z publicznego API modułu (`modules/m1-sklep`),
 * nigdy po surowym SQL — tego pilnuje `straznik-granic`, a przy okazji dostajemy
 * walidację kontraktami Zod za darmo: co nie przejdzie kontraktu, nie wyjedzie
 * do WordPressa.
 *
 * CZEGO NIE ROBI. Nie dotyka WordPressa — to czysty eksport do pliku. Import
 * i jego idempotencja żyją po stronie PHP. Nie eksportuje `course_changelog`
 * (audyt prototypu zostaje w prototypie; wtyczka WP prowadzi własny) ani plików
 * okładek (to zasoby, nie treść — wchodzą osobno przez bibliotekę mediów WP).
 *
 * Użycie:
 *   node --env-file=.env tools/eksport-wp.mjs                    # → eksport-wp/kursy.json
 *   node --env-file=.env tools/eksport-wp.mjs --do <katalog>
 *   node --env-file=.env tools/eksport-wp.mjs --sprawdz          # tylko raport, bez zapisu
 */
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  listaKursowKreatora,
  szczegolyKursuPoId,
  trescLekcji,
  zamknijDb1,
} from "../modules/m1-sklep/index.ts";

const args = process.argv.slice(2);
const tylkoSprawdz = args.includes("--sprawdz");
const katalog = resolve(args[args.indexOf("--do") + 1] ?? "eksport-wp");

/**
 * Mapa naszych rodzajów sekcji na pola, które Tutor LMS rozumie natywnie.
 *
 * Tutor pokrywa CZTERY z naszych dwunastu sekcji własnymi kluczami meta
 * (sprawdzone w kodzie wtyczki 4.0.6, nie zgadnięte). Reszta — hero, faq,
 * gwarancja, opinie, autor, problem, pozycjonowanie, transformacja,
 * porównanie — nie ma tam odpowiednika i należy do NASZEJ wtyczki: to jest
 * dokładnie ta część sklepu, której gotowy LMS nie robi.
 *
 * Wartość `null` znaczy „zostaje w naszej wtyczce", nie „do wyrzucenia".
 */
const SEKCJA_NA_TUTOR = {
  benefits: "_tutor_course_benefits",
  for_whom: "_tutor_course_target_audience",
  package: "_tutor_course_material_includes",
  problem: "_tutor_course_requirements",
  hero: null,
  faq: null,
  guarantee: null,
  opinions: null,
  author: null,
  positioning: null,
  transformation: null,
  comparison: null,
};

/** Status kursu → status posta WP. Szkic nie może stać się publiczny przez pomyłkę. */
const STATUS_NA_WP = { draft: "draft", published: "publish", archived: "private" };

/**
 * Poziom kursu → wartość `_tutor_course_level`.
 * Tutor przyjmuje beginner/intermediate/expert/all_levels; nasze nazwy są polskie.
 */
const POZIOM_NA_TUTOR = {
  podstawowy: "beginner",
  sredniozaawansowany: "intermediate",
  zaawansowany: "expert",
};

const kursy = [];
const ostrzezenia = [];

for (const karta of await listaKursowKreatora()) {
  const kurs = await szczegolyKursuPoId(karta.id);
  if (!kurs) {
    ostrzezenia.push(`kurs ${karta.id} zniknął między listą a odczytem — pomijam`);
    continue;
  }

  const moduly = [];
  for (const m of kurs.modules) {
    const lekcje = [];
    for (const l of m.lessons) {
      // Treść lekcji NIE jest w szczegółach kursu (to towar zza bramki —
      // pilnuje straznik-tresci-lekcji). Bierzemy ją osobno, po jednej.
      const pelna = await trescLekcji(l.id);
      if (l.ma_tresc && !pelna?.tresc) {
        ostrzezenia.push(`lekcja ${l.id} („${l.title}") deklaruje treść, a odczyt zwrócił pustkę`);
      }
      lekcje.push({
        zrodlo_uuid: l.id,
        pozycja: l.position,
        tytul: l.title,
        czas_min: l.duration_min,
        zapowiedz: l.preview,
        tresc: pelna?.tresc ?? "",
        materialy: pelna?.materialy ?? [],
      });
    }
    moduly.push({
      zrodlo_uuid: m.id,
      pozycja: m.position,
      tytul: m.title,
      opis: m.summary ?? "",
      lekcje,
    });
  }

  const sekcje_tutor = {};
  const sekcje_nasze = [];
  for (const s of kurs.sections) {
    const klucz = SEKCJA_NA_TUTOR[s.kind];
    if (klucz) sekcje_tutor[klucz] = s.content;
    else sekcje_nasze.push({ rodzaj: s.kind, pozycja: s.position, tresc: s.content });
  }

  if (kurs.level && !POZIOM_NA_TUTOR[kurs.level]) {
    ostrzezenia.push(`kurs ${kurs.slug}: poziom „${kurs.level}" nie ma odpowiednika w Tutorze`);
  }

  kursy.push({
    zrodlo_uuid: kurs.id,
    slug: kurs.slug,
    tytul: kurs.title,
    typ: kurs.type,
    zajawka: kurs.short_desc ?? "",
    cena_grosze: kurs.price_grosze,
    okladka_url: kurs.cover_url ?? "",
    status_wp: STATUS_NA_WP[kurs.status] ?? "draft",
    poziom_tutor: kurs.level ? POZIOM_NA_TUTOR[kurs.level] ?? "" : "",
    badge: kurs.badge ?? "",
    sekcje_tutor,
    sekcje_nasze,
    moduly,
  });
}

const lekcjiRazem = kursy.reduce(
  (n, k) => n + k.moduly.reduce((m, mod) => m + mod.lekcje.length, 0),
  0
);
const znakowTresci = kursy.reduce(
  (n, k) => n + k.moduly.reduce((m, mod) => m + mod.lekcje.reduce((z, l) => z + l.tresc.length, 0), 0),
  0
);

const paczka = {
  _o_pliku:
    "Eksport treści Pluginu 1 do WordPressa. Wykłada go wordpress/import-kursy.php " +
    "przez WP-CLI (idempotentnie, po kluczu zrodlo_uuid). Generowany przez " +
    "tools/eksport-wp.mjs — NIE edytować ręcznie.",
  wersja_formatu: 1,
  kursy,
};

console.log(`kursów: ${kursy.length}`);
for (const k of kursy) {
  const lekcji = k.moduly.reduce((n, m) => n + m.lekcje.length, 0);
  console.log(
    `  ${k.slug}: ${k.moduly.length} modułów, ${lekcji} lekcji, ` +
      `${Object.keys(k.sekcje_tutor).length} sekcji do Tutora, ${k.sekcje_nasze.length} do naszej wtyczki, ` +
      `status ${k.status_wp}`
  );
}
console.log(`lekcji razem: ${lekcjiRazem}, znaków treści: ${znakowTresci.toLocaleString("pl")}`);

if (ostrzezenia.length) {
  console.error("\nOSTRZEŻENIA:");
  for (const o of ostrzezenia) console.error(`  - ${o}`);
}

if (tylkoSprawdz) {
  console.log("\n--sprawdz: nic nie zapisałem.");
} else {
  if (!existsSync(katalog)) mkdirSync(katalog, { recursive: true });
  const plik = join(katalog, "kursy.json");
  writeFileSync(plik, JSON.stringify(paczka, null, 2) + "\n");
  console.log(`\n→ ${plik}`);
}

await zamknijDb1();
// Ostrzeżenie o pustej treści to rozjazd danych, nie kosmetyka — niech woła kodem wyjścia.
process.exit(ostrzezenia.length ? 2 : 0);
