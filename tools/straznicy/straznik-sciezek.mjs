/**
 * Strażnik ścieżek: adres URL pliku NIE JEST ścieżką w systemie plików.
 *
 * PO CO TO ISTNIEJE (BLAD-014, audyt 2026-08-24). Katalog roboczy projektu
 * nazywa się „Pod strona Szkolenia ” — ze spacjami. `import.meta.url` koduje
 * spację jako `%20`, więc dwa popularne skróty milczkiem przestają działać:
 *
 *   1. `import.meta.url === `file://${process.argv[1]}``  — porównanie łańcucha
 *      URL ze ścieżką systemową. W katalogu ze spacją NIGDY nie jest prawdziwe,
 *      więc blok CLI narzędzia się nie uruchamia: program kończy się kodem 0,
 *      nie wypisawszy nic. `tools/zrzuty/manifest.mjs` — jedyne źródło prawdy
 *      o stanie przelotu zrzutów — milczał w ten sposób, a CLAUDE.md kazał
 *      liczyć nim stan. Cisza wyglądała jak zieleń.
 *   2. `new URL("x.mjs", import.meta.url).pathname` jako ścieżka do pliku —
 *      oddaje `/home/.../Pod%20strona%20Szkolenia%20/x.mjs`, czyli plik,
 *      którego nie ma. Tak padało 15 testów w `tools/zrzuty/test-asercji.mjs`
 *      i tak spawn dostawał złą ścieżkę w `tools/zrzuty/kolejka.mjs`.
 *
 * CO ŁAPIE. W plikach `*.mjs`/`*.ts`/`*.tsx` (bez node_modules i .next):
 *   - sklejkę `file://` z `process.argv[1]`,
 *   - `.pathname` wzięte z `new URL(..., import.meta.url)`.
 * Poprawna forma w obu przypadkach: `fileURLToPath(...)` z `node:url`,
 * a przy porównaniu dodatkowo `resolve(process.argv[1])`.
 *
 * Użycie: node tools/straznicy/straznik-sciezek.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Dwa pliki pomijamy, bo w OBU wzorce muszą stać JAKO DANE, nie jako kod:
 * ten strażnik (definicje wzorców) i audyt mutacyjny (celowo psuje narzędzia
 * z powrotem do złej formy, żeby sprawdzić, czy strażnik to widzi).
 * Wyjątek jest wąski — dwie konkretne ścieżki, nie wzorzec nazwy.
 */
const WLASNY_PLIK = fileURLToPath(import.meta.url);
const AUDYT_MUTACYJNY = resolve("tools/straznicy/audyt-straznikow.mjs");

const POMIJANE = new Set(["node_modules", ".next", ".git", "out", "docs", "tresc-kursow"]);
const WZORCE = [
  [/`file:\/\/\$\{\s*process\.argv\[1\]\s*\}`/, "sklejka `file://${process.argv[1]}` — w katalogu ze spacją nigdy nie zrówna się z import.meta.url; użyj fileURLToPath + resolve"],
  [/new URL\([^)]*import\.meta\.url\s*\)\s*\.pathname/, "`.pathname` z URL-a pliku to adres URL, nie ścieżka (spacja → %20); użyj fileURLToPath(new URL(...))"],
];

const bledy = [];
let sprawdzone = 0;

function chodz(katalog) {
  for (const wpis of readdirSync(katalog)) {
    if (POMIJANE.has(wpis) || wpis.startsWith(".")) continue;
    const sciezka = join(katalog, wpis);
    if (statSync(sciezka).isDirectory()) { chodz(sciezka); continue; }
    if (!/\.(mjs|ts|tsx)$/.test(wpis)) continue;
    if (resolve(sciezka) === WLASNY_PLIK || resolve(sciezka) === AUDYT_MUTACYJNY) continue;
    sprawdzone++;
    const tresc = readFileSync(sciezka, "utf8");
    tresc.split("\n").forEach((wiersz, i) => {
      for (const [wzorzec, powod] of WZORCE) {
        if (wzorzec.test(wiersz)) bledy.push(`${sciezka}:${i + 1} — ${powod}`);
      }
    });
  }
}
chodz(".");

if (bledy.length > 0) {
  console.error("straznik-sciezek:");
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}
console.log(`straznik-sciezek: OK (przejrzanych plików: ${sprawdzone})`);
