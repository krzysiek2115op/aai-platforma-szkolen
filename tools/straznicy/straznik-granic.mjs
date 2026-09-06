/**
 * Strażnik granic: dane idą BAZA → DZIAŁ → STRONA i nigdy na skróty.
 *
 * PO CO. Wytyczna WYTYCZNE §8 + DIAGRAM Pluginu 1: dostęp do SQL ma
 * WYŁĄCZNIE dział (katalogi modules/mX-…). Strona (app/) nie ma prawa dotknąć
 * bazy — ani przez import klienta SQL, ani przez connection string.
 * Moduły są odizolowane jak wtyczki: nie importują swojego kodu nawzajem
 * (komunikacja tylko przez publiczne API modułu).
 *
 * CO ŁAPIE (w plikach .ts/.tsx/.js/.jsx/.mjs poza node_modules/.next):
 *   1. import/require klienta bazy (pg, postgres, pg-promise, knex,
 *      drizzle-orm, @prisma/client, kysely) POZA katalogiem modules/,
 *   2. użycie connection stringów (DB1_URL/DB2_URL/DB3_URL,
 *      POSTGRES_URL, DATABASE_URL) poza modules/,
 *   3. import między modułami: plik z modules/mA-* importujący
 *      cokolwiek z modules/mB-*,
 *   4. import z wnętrza cudzego modułu przez app/ inny niż publiczne
 *      API (modules/mX-...(/index)?) — strona dostaje JSON od działu,
 *      nie grzebie w jego bebechach (db/, sql itd.).
 *
 * CO ŁAPIE W PHP PRODUKTU (pliki .php w katalogach `szablony`
 * każdej wtyczki, MAR-A-05):
 *   5. `$wpdb` w szablonie — widok dostaje gotowe dane od klasy wtyczki,
 *   6. sięganie po nazwy tabel (Aai_…_Tabele::) — to sprawa warstwy danych,
 *   7. wołanie warstwy zapisu z widoku — render nie zmienia stanu.
 *
 * Dopóki katalogów app/ i modules/ nie ma, strażnik przechodzi —
 * pilnuje kodu, nie planów.
 *
 * Użycie: node tools/straznicy/straznik-granic.mjs
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";

const KORZEN = process.cwd();
// straznicy: własny katalog — wzorce (DB1_URL, nazwy klientów SQL) występują
// tu jako reguły wykrywania, nie jako użycie bazy.
const POMIJANE = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
  "straznicy",
]);
const ROZSZERZENIA = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

const KLIENCI_SQL =
  /(?:from\s+["']|require\(\s*["'])(pg|postgres|pg-promise|knex|drizzle-orm|@prisma\/client|kysely)(?:["'/])/;
const CONNECTION_STRING = /\b(DB[123]_URL|POSTGRES_URL|DATABASE_URL)\b/;
const IMPORT_Z_MODULU =
  /(?:from\s+["']|require\(\s*["'])(?:@\/)?(?:\.\.\/)*modules\/(m\d+-[\w-]+)(\/[^"']*)?["']/g;

/** Rekurencyjnie zbiera pliki źródłowe. */
function pliki(katalog) {
  const wynik = [];
  for (const nazwa of readdirSync(katalog)) {
    if (POMIJANE.has(nazwa)) continue;
    const pelna = join(katalog, nazwa);
    const s = statSync(pelna);
    if (s.isDirectory()) wynik.push(...pliki(pelna));
    else if (ROZSZERZENIA.test(nazwa)) wynik.push(pelna);
  }
  return wynik;
}

/** Do jakiego modułu należy plik (mX-nazwa) albo null. */
function modulPliku(wzgledna) {
  const czesci = wzgledna.split(sep);
  if (czesci[0] === "modules" && czesci.length > 1) return czesci[1];
  return null;
}

const bledy = [];

if (existsSync(join(KORZEN, "app")) || existsSync(join(KORZEN, "modules"))) {
  for (const plik of pliki(KORZEN)) {
    const wzgledna = relative(KORZEN, plik);
    const tresc = readFileSync(plik, "utf8");
    const wlasnyModul = modulPliku(wzgledna);

    if (!wlasnyModul) {
      const sql = tresc.match(KLIENCI_SQL);
      if (sql) {
        bledy.push(
          `${wzgledna}: import klienta SQL („${sql[1]}") poza modules/ — z bazą rozmawia tylko dział.`
        );
      }
      if (CONNECTION_STRING.test(tresc)) {
        bledy.push(
          `${wzgledna}: connection string bazy poza modules/ — z bazą rozmawia tylko dział.`
        );
      }
    }

    for (const m of tresc.matchAll(IMPORT_Z_MODULU)) {
      const [, docelowy, glebiej] = m;
      if (wlasnyModul && wlasnyModul !== docelowy) {
        bledy.push(
          `${wzgledna}: moduł ${wlasnyModul} importuje z modułu ${docelowy} — moduły rozmawiają przez publiczne API, nie przez import kodu.`
        );
      }
      if (!wlasnyModul && glebiej && !/^\/index(\.[tj]s)?$/.test(glebiej)) {
        bledy.push(
          `${wzgledna}: import z wnętrza modułu ${docelowy} (…${glebiej}) — spoza modułu wolno importować tylko jego publiczne API (modules/${docelowy}).`
        );
      }
    }
  }
}

/* TA SAMA GRANICA W KODZIE, KTÓRY NAPRAWDĘ WDRAŻAMY (MAR-A-05).

   Ten strażnik nosił w nagłówku wytyczną §8 („strona nie ma prawa dotknąć
   bazy"), a skanował WYŁĄCZNIE pliki JS/TS prototypu — 240 plików w zasięgu,
   ZERO plików PHP produktu przy 108 istniejących. Reguła obowiązywała więc
   dokładnie tam, gdzie nic się nie wdraża: szablon wtyczki mógł zrobić
   `$wpdb->get_results()` i przejść `npm run check` bez śladu.

   Produktem są dziś trzy wtyczki WordPressa, a rolę „strony" pełnią ich
   szablony. Dostają gotowe dane od klas wtyczki — i to jest sprawdzane
   POMIAREM, nie deklaracją: w chwili dołożenia tej reguły `$wpdb`
   w szablonach nie było ani razu, więc jest ona zabezpieczeniem przed
   nawrotem, nie sprzątaniem. */
{
  const KATALOG_WTYCZEK = join(KORZEN, "wordpress", "wtyczki");
  if (existsSync(KATALOG_WTYCZEK)) {
    const szablony = [];
    const zbierz = (k) => {
      if (!existsSync(k)) return;
      for (const w of readdirSync(k)) {
        const sciezka = join(k, w);
        if (statSync(sciezka).isDirectory()) zbierz(sciezka);
        else if (w.endsWith(".php")) szablony.push(sciezka);
      }
    };
    for (const wtyczka of readdirSync(KATALOG_WTYCZEK)) {
      zbierz(join(KATALOG_WTYCZEK, wtyczka, "szablony"));
    }

    if (szablony.length < 20) {
      bledy.push(
        `wordpress/wtyczki/*/szablony: znalazłem ${szablony.length} szablonów przy oczekiwanych co najmniej 20 — reguła o granicy strona/baza przechodziłaby po pustce (samokontrola zakresu).`
      );
    }

    for (const plik of szablony) {
      const tresc = readFileSync(plik, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");
      const wzgledna = relative(KORZEN, plik);

      for (const m of tresc.matchAll(/\$wpdb\b/g)) {
        const nr = tresc.slice(0, m.index).split("\n").length;
        bledy.push(
          `${wzgledna}:${nr}: szablon dotyka bazy ($wpdb). Dane idą BAZA → DZIAŁ → STRONA (WYTYCZNE §8): szablon dostaje gotowe od klasy wtyczki, a zapytanie w widoku omija warstwę odczytu, jej pamięć podręczną i jej kontrakt (MAR-A-05).`
        );
      }
      for (const m of tresc.matchAll(/\bAai_\w+_Tabele::/g)) {
        const nr = tresc.slice(0, m.index).split("\n").length;
        bledy.push(
          `${wzgledna}:${nr}: szablon sięga po nazwy tabel (Aai_…_Tabele::). To pierwszy krok do zapytania w widoku — nazwy tabel są sprawą warstwy danych, nie strony (MAR-A-05).`
        );
      }
      for (const m of tresc.matchAll(/\bAai_\w+_Zapis::/g)) {
        const nr = tresc.slice(0, m.index).split("\n").length;
        bledy.push(
          `${wzgledna}:${nr}: szablon woła warstwę ZAPISU. Widok renderuje odpowiedź, a nie zmienia stan — zapis w szablonie wykona się przy każdym renderze, także przy tym z cudzego kodu (MAR-A-05).`
        );
      }
    }
  }
}

if (bledy.length > 0) {
  console.error("straznik-granic:");
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}
