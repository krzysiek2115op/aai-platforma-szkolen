/**
 * Strażnik fontów: Geist wyłącznie przez next/font/local, nigdy przez
 * pakiet `geist`.
 *
 * PO CO. Realny błąd z bramki B5 (rejestr/znane-bledy.json: BLAD-001):
 * pakiet `geist` potrafił wygenerować RÓŻNE klasy CSS fontu w renderze
 * serwera i klienta, co wywalało błąd hydratacji na <html> (widoczny
 * w konsoli na każdej stronie). U nas fonty idą z własnych subsetów
 * woff2 w public/fonts przez własny @font-face + jawny preload
 * (lib/fonts.ts — tam uzasadnienie, czemu nie next/font/local:
 * nie emitował preloadu i podmiana fontu psuła CLS/LCP).
 *
 * CO ŁAPIE: każdy import z pakietu `geist` (geist/font/sans itd.)
 * w plikach źródłowych oraz obecność `geist` w dependencies
 * package.json. Ten błąd nie ma prawa wrócić niezauważony.
 *
 * Użycie: node tools/straznicy/straznik-fontow.mjs
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const POMIJANE = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
  "straznicy",
]);
const ROZSZERZENIA = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const IMPORT_GEIST = /(?:from\s+["']|require\(\s*["']|import\(\s*["'])geist(?:["'/])/;

const bledy = [];

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

for (const plik of pliki(process.cwd())) {
  if (IMPORT_GEIST.test(readFileSync(plik, "utf8"))) {
    bledy.push(
      `${relative(process.cwd(), plik)}: import z pakietu geist — fonty ładujemy własnym @font-face z public/fonts (lib/fonts.ts), pakiet geist psuł hydratację (BLAD-001).`
    );
  }
}

if (existsSync("package.json")) {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  if (pkg.dependencies?.geist || pkg.devDependencies?.geist) {
    bledy.push(
      "package.json: zależność `geist` — usuń; fonty idą z public/fonts własnym @font-face (BLAD-001)."
    );
  }
}

if (bledy.length > 0) {
  console.error("straznik-fontow:");
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}
