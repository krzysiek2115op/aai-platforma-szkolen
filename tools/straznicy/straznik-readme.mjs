/**
 * Strażnik README: liczby i spisy w README są pilnowane maszynowo.
 *
 * PO CO. Dokumentacja starzeje się CICHO — nikt nie zmienia README
 * „na złość", po prostu dopisuje strażnika albo skrypt i zapomina
 * o tabeli. Złapane na gorącym uczynku 2026-08-19: tabela strażników
 * wymieniała 13 z 16 plików, moduł 1 miał nieaktualny „następny krok",
 * a sekcja CI twierdziła, że testów jeszcze nie ma (było ich 36).
 * README, które podaje konkrety, jest najcenniejsze — i tylko ono
 * potrafi kłamać. Wzorzec ze strony głównej (verify-readme tamże
 * pilnuje 15 klas rzeczy); tu zaczynamy od czterech najbardziej
 * u nas kruchych.
 *
 * CO SPRAWDZA:
 *   1. Każdy plik tools/straznicy/straznik-*.mjs ma wiersz w tabeli
 *      sekcji „Strażnicy i CI" — i odwrotnie: każdy `straznik-…`
 *      z tabeli istnieje na dysku (martwy wiersz też jest kłamstwem).
 *   2. Każdy skrypt z package.json ma wiersz w sekcji „Skrypty"
 *      (pretest wolno pominąć — to część `npm test`, nie komenda
 *      do wołania ręcznie).
 *   3. Liczba scenariuszy podana w README (wzorzec „NN scenariuszy")
 *      = liczba plików lekcja-*.md w tresc-kursow/.
 *   4. Spis treści w <details> wskazuje istniejące nagłówki `##`
 *      (kotwice liczone tak, jak robi to GitHub).
 *
 * CZEGO NIE SPRAWDZA: wersji (straznik-wersji), linków do plików
 * (straznik-linkow) — jeden fakt, jeden strażnik.
 *
 * Użycie: node tools/straznicy/straznik-readme.mjs
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

if (!existsSync("README.md")) process.exit(0);
const readme = readFileSync("README.md", "utf8");
const bledy = [];

// ---- 1. strażnicy: pliki ↔ tabela ----
const naDysku = readdirSync(join("tools", "straznicy"))
  .filter((n) => /^straznik-.*\.mjs$/.test(n))
  .map((n) => n.replace(/\.mjs$/, ""));
const wTabeli = [...readme.matchAll(/^\| `(straznik-[\w-]+)`/gm)].map((m) => m[1]);
for (const s of naDysku) {
  if (!wTabeli.includes(s)) {
    bledy.push(`README, tabela strażników: brak wiersza dla ${s}.mjs (plik istnieje).`);
  }
}
for (const s of wTabeli) {
  if (!naDysku.includes(s)) {
    bledy.push(`README, tabela strażników: wiersz ${s} bez pliku na dysku — martwy wpis.`);
  }
}

// ---- 2. skrypty npm ↔ sekcja Skrypty ----
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const POMIJANE_SKRYPTY = new Set(["pretest"]); // części innych komend, nie woła się ich ręcznie
for (const nazwa of Object.keys(pkg.scripts ?? {})) {
  if (POMIJANE_SKRYPTY.has(nazwa)) continue;
  if (!readme.includes(`npm run ${nazwa}`) && !(nazwa === "test" && readme.includes("npm test"))) {
    bledy.push(`README, sekcja Skrypty: brak komendy „npm run ${nazwa}" z package.json.`);
  }
}

// ---- 3. liczba scenariuszy ----
function policzScenariusze(katalog) {
  let n = 0;
  for (const wpis of readdirSync(katalog)) {
    const pelna = join(katalog, wpis);
    if (statSync(pelna).isDirectory()) n += policzScenariusze(pelna);
    else if (/^lekcja-.*\.md$/.test(wpis)) n += 1;
  }
  return n;
}
if (existsSync("tresc-kursow")) {
  const naDysku = policzScenariusze("tresc-kursow");
  const wReadme = [...readme.matchAll(/(\d+)\s+scenariusz/g)].map((m) => Number(m[1]));
  for (const liczba of wReadme) {
    if (liczba !== naDysku) {
      bledy.push(
        `README podaje „${liczba} scenariuszy", a w tresc-kursow/ jest ${naDysku} plików lekcji.`,
      );
    }
  }
}

// ---- 4. spis treści → kotwice nagłówków ----
/** Kotwica jak u GitHuba: małe litery, spacje → myślniki, znaki specjalne wycięte. */
function kotwica(naglowek) {
  return naglowek
    .toLowerCase()
    .replace(/[`*_]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
}
const naglowki = [...readme.matchAll(/^## (.+)$/gm)].map((m) => kotwica(m[1]));
const spis = readme.match(/<details>[\s\S]*?<\/details>/);
if (spis) {
  for (const [, cel] of spis[0].matchAll(/\]\(#([^)]+)\)/g)) {
    if (!naglowki.includes(cel)) {
      bledy.push(`README, spis treści: kotwica #${cel} nie wskazuje żadnego nagłówka ##.`);
    }
  }
}

if (bledy.length > 0) {
  console.error("straznik-readme:");
  for (const b of bledy) console.error(`  - ${b}`);
  const n = bledy.length;
  const r10 = n % 10, r100 = n % 100;
  const forma = n === 1 ? "usterka" : r10 >= 2 && r10 <= 4 && (r100 < 12 || r100 > 14) ? "usterki" : "usterek";
  console.error(`\n  ${n} ${forma} — README ma podawać stan faktyczny, nie historyczny.`);
  process.exit(1);
}
console.log(
  `straznik-readme: README zgodne ze stanem repo (${naDysku.length} strażników w tabeli, skrypty npm pokryte, kotwice spisu treści całe).`,
);
