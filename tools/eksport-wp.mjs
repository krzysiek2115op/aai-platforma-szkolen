/**
 * Eksport treści Pluginu 1 z PostgreSQL do formatu importowalnego w WordPressie.
 *
 * PO CO. Prototyp Next.js + Postgres jest specyfikacją; produkcja idzie na
 * WordPressa (decyzja zespołu 2026-08-18). Dane muszą przejść razem z kodem —
 * dwa kursy, 6+6 modułów, 73 lekcje prozy i 12 rodzajów sekcji sprzedażowych
 * to dorobek, którego nikt nie odtworzy ręcznie.
 *
 * TEN PLIK ODDAJE WIERNY ZRZUT NASZYCH TABEL — i nic ponadto (format 2).
 * Nazwa każdego pola jest nazwą KOLUMNY, tej samej w Postgresie prototypu
 * i w MySQL wtyczki. Dzięki temu import nie mapuje niczego: kładzie wiersz
 * na wiersz, a cała klasa błędów „pole wyjechało pod inną nazwą" znika.
 *
 * DWIE DROGI, KTÓRE Z TEGO PLIKU WYCHODZĄ (decyzja właściciela 2026-08-25):
 *
 *   1. Postgres → NASZE tabele `wp_aai_sklep_*` (`wp aai-sklep import`)
 *      — to jest ŹRÓDŁO PRAWDY o kursie w docelowej instalacji.
 *   2. Postgres → Tutor LMS (`wordpress/import-kursy.php`)
 *      — kopia dla LMS-a, który dostarcza materiał za logowaniem.
 *
 * Słowniki Tutora (status posta, poziom kursu, cztery sekcje, które Tutor ma
 * u siebie) mieszkają po stronie PHP, w importerze, który ich używa. Wiedza
 * o cudzej wtyczce nie należy do eksportu z naszej bazy, a przy W5 — kiedy
 * kopię do Tutora będzie robiła nasza wtyczka — te mapy idą do jej klasy,
 * nie do skryptu w JavaScripcie.
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
 * Wersja formatu. Podbicie znaczy, że importer musi wiedzieć o zmianie —
 * dlatego oba importery odrzucają nieznaną wersję zamiast zgadywać.
 *
 * 1 → kształt pod Tutora (do 0.38.0),
 * 2 → wierny zrzut naszych tabel.
 */
const WERSJA_FORMATU = 2;

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
        id: l.id,
        position: l.position,
        title: l.title,
        duration_min: l.duration_min,
        preview: l.preview,
        content: pelna?.tresc ?? "",
        // Kolumna nazywa się `materials` po obu stronach; odczyt oddaje ją
        // pod polską nazwą, bo tak mówi kontrakt kreatora.
        materials: pelna?.materialy ?? [],
      });
    }
    moduly.push({
      id: m.id,
      position: m.position,
      title: m.title,
      summary: m.summary,
      lekcje,
    });
  }

  kursy.push({
    id: kurs.id,
    slug: kurs.slug,
    title: kurs.title,
    type: kurs.type,
    short_desc: kurs.short_desc,
    price_grosze: kurs.price_grosze,
    cover_url: kurs.cover_url,
    status: kurs.status,
    badge: kurs.badge,
    level: kurs.level,
    // Sekcja nie ma już pozycji (migracja 008): jeden rodzaj = jedna sekcja
    // na kurs. Kolejność sekcji na stronie jest kompozycją widoku, nie daną.
    sekcje: kurs.sections.map((s) => ({ id: s.id, kind: s.kind, content: s.content })),
    moduly,
  });
}

const lekcjiRazem = kursy.reduce(
  (n, k) => n + k.moduly.reduce((m, mod) => m + mod.lekcje.length, 0),
  0
);
/**
 * Znaki liczymy PUNKTAMI KODOWYMI (`[...s].length`), nie jednostkami UTF-16
 * (`s.length`). Przy migracji 0.36.0 porównanie sum pokazało „utratę" 7 znaków,
 * a byłoby to siedem emoji spoza BMP, które JavaScript liczy podwójnie.
 * Ta liczba jedzie do raportu i do porównania z `CHAR_LENGTH()` MySQL-a,
 * więc musi znaczyć to samo po obu stronach.
 */
const znakow = (s) => [...s].length;
const znakowTresci = kursy.reduce(
  (n, k) =>
    n + k.moduly.reduce((m, mod) => m + mod.lekcje.reduce((z, l) => z + znakow(l.content), 0), 0),
  0
);

const paczka = {
  _o_pliku:
    "Wierny zrzut tabel Pluginu 1 z Postgresa (format 2). Wykładają go: " +
    "`wp aai-sklep import` do tabel wp_aai_sklep_* (źródło prawdy) oraz " +
    "wordpress/import-kursy.php do Tutor LMS (kopia). Generowany przez " +
    "tools/eksport-wp.mjs — NIE edytować ręcznie.",
  wersja_formatu: WERSJA_FORMATU,
  kursy,
};

console.log(`kursów: ${kursy.length}`);
for (const k of kursy) {
  const lekcji = k.moduly.reduce((n, m) => n + m.lekcje.length, 0);
  console.log(
    `  ${k.slug}: ${k.moduly.length} modułów, ${lekcji} lekcji, ` +
      `${k.sekcje.length} sekcji, status ${k.status}`
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
