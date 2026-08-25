/**
 * Dowód, że kursy przeszły z Postgresa do tabel wtyczki BEZ ZMIANY.
 *
 * PO CO OSOBNE NARZĘDZIE. Import melduje własny sukces, a to jest opinia
 * jednej strony. Bramka kroku W2 brzmi „73 lekcje zgodne CO DO ZNAKU",
 * więc dowód musi porównać DWIE BAZY: prototypowego Postgresa i MySQL
 * WordPressa. Ten skrypt jest jedynym miejscem, które widzi obie naraz.
 *
 * JAK MIERZY TREŚĆ. Skrótem `sha256` całego łańcucha, nie sumą znaków.
 * Sumy potknęły się już raz (migracja 0.36.0): `LENGTH()` w MySQL liczy
 * BAJTY, a `.length` w JavaScripcie jednostki UTF-16, więc porównanie
 * pokazało „utratę" 47 tys. znaków, a różnicą było siedem emoji spoza
 * BMP. Skrót jest odporny i na to, i na kodowanie transportu. Liczby
 * znaków sprawdzamy OSOBNO, w trzech niezależnych rachunkach (punkty
 * kodowe w JS, `mb_strlen` w PHP, `CHAR_LENGTH` w SQL) — rozjazd dwóch
 * ostatnich znaczyłby, że połączenie ma inne kodowanie niż tabela.
 *
 * CZEGO NIE ROBI. Niczego nie naprawia i niczego nie zapisuje. Kod
 * wyjścia 1 znaczy rozjazd — i wtedy patrzy się na listę niżej.
 *
 * Użycie:
 *   node --env-file=.env tools/sprawdz-import-wp.mjs
 *   STACK_NAZWA=aai_wp node --env-file=.env tools/sprawdz-import-wp.mjs
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import {
  listaKursowKreatora,
  szczegolyKursuPoId,
  trescLekcji,
  zamknijDb1,
} from "../modules/m1-sklep/index.ts";

const STACK = process.env.STACK_NAZWA ?? "aai_wp";
const KONTENER = `${STACK}_cli`;

const bledy = [];
/** Rzeczy, które się zgodziły — żeby raport mówił, CO sprawdzono. */
const zgodne = { kursy: 0, sekcje: 0, moduly: 0, lekcje: 0, tresc: 0 };

const sha256 = (s) => createHash("sha256").update(s, "utf8").digest("hex");
/** Znaki liczone punktami kodowymi — patrz nagłówek. */
const znakow = (s) => [...s].length;

function niezgodnosc(gdzie, co, oczekiwano, jest) {
  bledy.push(
    `${gdzie}: ${co} — Postgres ${JSON.stringify(oczekiwano)}, WordPress ${JSON.stringify(jest)}`
  );
}

/** Porównanie pola po polu; `null` i brak wartości znaczą to samo. */
function porownajPola(gdzie, pola, lewy, prawy) {
  for (const pole of pola) {
    const a = lewy[pole] ?? null;
    const b = prawy[pole] ?? null;
    if (a !== b) niezgodnosc(gdzie, pole, a, b);
  }
}

// ── 1. Stan po stronie WordPressa ──────────────────────────────────────────

let stanWp;
try {
  const wyjscie = execFileSync(
    "podman",
    ["exec", KONTENER, "wp", "--path=/var/www/html", "aai-sklep", "sprawdz", "--format=json"],
    { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }
  );
  stanWp = JSON.parse(wyjscie);
} catch (blad) {
  console.error(
    `sprawdz-import-wp: nie mogę odczytać stanu z kontenera ${KONTENER}.\n` +
      "Czy środowisko stoi? `cd wordpress/srodowisko && ./postaw.sh`\n" +
      String(blad.stderr ?? blad.message)
  );
  process.exit(1);
}

// ── 2. Stan po stronie prototypu ───────────────────────────────────────────

const kursyPg = [];
for (const karta of await listaKursowKreatora()) {
  const kurs = await szczegolyKursuPoId(karta.id);
  if (!kurs) continue;
  const moduly = [];
  for (const m of kurs.modules) {
    const lekcje = [];
    for (const l of m.lessons) {
      const pelna = await trescLekcji(l.id);
      lekcje.push({ ...l, tresc: pelna?.tresc ?? "", materialy: pelna?.materialy ?? [] });
    }
    moduly.push({ ...m, lekcje });
  }
  kursyPg.push({ ...kurs, moduly });
}
await zamknijDb1();

// ── 3. Porównanie ──────────────────────────────────────────────────────────

const wpPoId = new Map(stanWp.kursy.map((k) => [k.id, k]));

for (const kurs of kursyPg) {
  const wp = wpPoId.get(kurs.id);
  if (!wp) {
    bledy.push(`kurs ${kurs.slug} (${kurs.id}): nie ma go w tabelach WordPressa`);
    continue;
  }
  wpPoId.delete(kurs.id);
  porownajPola(
    `kurs ${kurs.slug}`,
    ["slug", "title", "type", "short_desc", "price_grosze", "cover_url", "status", "badge", "level"],
    kurs,
    wp
  );
  zgodne.kursy += 1;

  // sekcje
  const sekcjeWp = new Map(wp.sekcje.map((s) => [s.id, s]));
  for (const s of kurs.sections) {
    const t = sekcjeWp.get(s.id);
    if (!t) {
      bledy.push(`kurs ${kurs.slug}: brak sekcji ${s.kind} (${s.id})`);
      continue;
    }
    sekcjeWp.delete(s.id);
    if (s.kind !== t.kind) niezgodnosc(`kurs ${kurs.slug}, sekcja ${s.id}`, "kind", s.kind, t.kind);
    // Struktura, nie skrót: pusty obiekt zamieniony w pustą listę dałby
    // ten sam rozmiar i inne dane. `isDeepStrictEqual` rozróżnia [] i {}.
    if (!isDeepStrictEqual(s.content, t.content)) {
      bledy.push(`kurs ${kurs.slug}, sekcja ${s.kind}: treść sekcji różni się strukturą`);
    }
    zgodne.sekcje += 1;
  }
  for (const zbedna of sekcjeWp.values()) {
    bledy.push(`kurs ${kurs.slug}: WordPress ma sekcję spoza prototypu (${zbedna.kind}, ${zbedna.id})`);
  }

  // moduły i lekcje
  const modulyWp = new Map(wp.moduly.map((m) => [m.id, m]));
  for (const m of kurs.moduly) {
    const t = modulyWp.get(m.id);
    if (!t) {
      bledy.push(`kurs ${kurs.slug}: brak modułu „${m.title}" (${m.id})`);
      continue;
    }
    modulyWp.delete(m.id);
    porownajPola(`kurs ${kurs.slug}, moduł ${m.position + 1}`, ["position", "title", "summary"], m, t);
    zgodne.moduly += 1;

    const lekcjeWp = new Map(t.lekcje.map((l) => [l.id, l]));
    for (const l of m.lekcje) {
      const w = lekcjeWp.get(l.id);
      const gdzie = `lekcja ${m.position + 1}.${l.position + 1} („${l.title}")`;
      if (!w) {
        bledy.push(`kurs ${kurs.slug}: brak lekcji ${gdzie}`);
        continue;
      }
      lekcjeWp.delete(l.id);
      porownajPola(gdzie, ["position", "title", "duration_min", "preview"], l, w);
      if (!isDeepStrictEqual(l.materialy, w.materials)) {
        bledy.push(`${gdzie}: materiały dodatkowe różnią się strukturą`);
      }
      zgodne.lekcje += 1;

      // ── BRAMKA: treść co do znaku ──
      const skrotPg = sha256(l.tresc);
      const znakowPg = znakow(l.tresc);
      let ok = true;
      if (skrotPg !== w.sha256) {
        bledy.push(`${gdzie}: TREŚĆ SIĘ RÓŻNI (sha256 ${skrotPg.slice(0, 12)}… ≠ ${String(w.sha256).slice(0, 12)}…)`);
        ok = false;
      }
      if (znakowPg !== w.znakow_php) {
        niezgodnosc(gdzie, "liczba znaków", znakowPg, w.znakow_php);
        ok = false;
      }
      if (w.znakow_php !== w.znakow_sql) {
        bledy.push(
          `${gdzie}: MySQL liczy ${w.znakow_sql} znaków, a PHP ${w.znakow_php} — połączenie ma inne kodowanie niż tabela`
        );
        ok = false;
      }
      if (ok) zgodne.tresc += 1;
    }
    for (const zbedna of lekcjeWp.values()) {
      bledy.push(`kurs ${kurs.slug}: WordPress ma lekcję spoza prototypu („${zbedna.title}", ${zbedna.id})`);
    }
  }
  for (const zbedny of modulyWp.values()) {
    bledy.push(`kurs ${kurs.slug}: WordPress ma moduł spoza prototypu („${zbedny.title}", ${zbedny.id})`);
  }
}
for (const zbedny of wpPoId.values()) {
  bledy.push(`WordPress ma kurs spoza prototypu (${zbedny.slug}, ${zbedny.id})`);
}

// ── 4. Liczności z drugiej strony — na wypadek, gdyby pętla czegoś nie odwiedziła ──

const lekcjiPg = kursyPg.reduce((n, k) => n + k.moduly.reduce((m, mod) => m + mod.lekcje.length, 0), 0);
const oczekiwane = {
  courses: kursyPg.length,
  sections: kursyPg.reduce((n, k) => n + k.sections.length, 0),
  modules: kursyPg.reduce((n, k) => n + k.moduly.length, 0),
  lessons: lekcjiPg,
};
for (const [tabela, ile] of Object.entries(oczekiwane)) {
  if (stanWp.tabele[tabela] !== ile) {
    niezgodnosc("liczba wierszy", tabela, ile, stanWp.tabele[tabela]);
  }
}

// ── 5. Werdykt ─────────────────────────────────────────────────────────────

const bajtow = stanWp.kursy
  .flatMap((k) => k.moduly.flatMap((m) => m.lekcje))
  .reduce((n, l) => n + l.bajtow_sql, 0);

console.log(
  `sprawdz-import-wp: ${zgodne.kursy} kursów, ${zgodne.sekcje} sekcji, ` +
    `${zgodne.moduly} modułów, ${zgodne.lekcje} lekcji.`
);
console.log(
  `  treść: ${zgodne.tresc} z ${lekcjiPg} zgodnych CO DO ZNAKU ` +
    `(${bajtow.toLocaleString("pl")} bajtów w MySQL — bajty to nie znaki, patrz nagłówek).`
);

if (bledy.length > 0) {
  console.error(`\nROZJAZD (${bledy.length}):`);
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}

if (zgodne.tresc !== lekcjiPg) {
  console.error("\nBRAMKA NIEZALICZONA: nie każda lekcja przeszła porównanie treści.");
  process.exit(1);
}

console.log("\n✔ Bramka W2 zaliczona: obie bazy niosą tę samą treść.");
