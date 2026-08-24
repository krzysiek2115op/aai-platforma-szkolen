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
 *   4. KAŻDA kotwica `](#…)` w README — nie tylko spis treści —
 *      wskazuje istniejący nagłówek `##`/`###` (kotwice liczone jak
 *      u GitHuba; bloki kodu pominięte). Klasa złapana 2026-08-24:
 *      link „pełny start" pod podglądem wskazywał
 *      #szybki-start-po-sklonowaniu, nagłówek dawno się nazywał
 *      inaczej, a kontrola patrzyła wyłącznie w <details>.
 *   5. Liczba testów w README („NN testów na osobnej bazie" i komentarz
 *      przy `npm test` w szybkim starcie) = statyczne zliczenie
 *      wywołań test()/it() w plikach *.test.ts. Obie frazy podawały
 *      62 przy stanie 75 — liczba wpisana raz, prawdziwa raz.
 *   6. Liczba sposobów audytu mutacyjnego („na NN sposobów") =
 *      liczba wpisów `straznik:` w audyt-straznikow.mjs. README
 *      podawało 71 przy stanie 90.
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
/** Druga forma — GitHub zamienia KAŻDĄ spację na myślnik osobno, więc
 *  nagłówek z „ — " daje dwa myślniki; akceptujemy obie formy. */
function kotwicaPojedynczo(naglowek) {
  return naglowek
    .toLowerCase()
    .replace(/[`*_]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/ /g, "-");
}
const naglowki = new Set(
  [...readme.matchAll(/^###? (.+)$/gm)].flatMap((m) => [kotwica(m[1]), kotwicaPojedynczo(m[1])]),
);
// Bloki kodu poza kontrolą — przykłady składni Markdowna nie są linkami
// (ta sama lekcja co w straznik-linkow).
const bezKodu = readme.replace(/```[\s\S]*?```/g, "");
for (const [, cel] of bezKodu.matchAll(/\]\(#([^)]+)\)/g)) {
  if (!naglowki.has(cel)) {
    bledy.push(`README: kotwica #${cel} nie wskazuje żadnego nagłówka ##/### — martwy link wewnętrzny.`);
  }
}

// ---- 5. liczba testów ----
// Dwie frazy CELOWANE (nie każde „NN testów" — README wymienia też
// podzbiory per obszar, np. „8 testów jednostkowych limitera", których
// suma nie równa się całości). Gdy fraza zniknie z README, kontrola
// po prostu nie ma czego sprawdzać — jak wzorzec scenariuszy wyżej.
function policzTesty(katalog) {
  let n = 0;
  for (const wpis of readdirSync(katalog)) {
    const pelna = join(katalog, wpis);
    if (wpis === "node_modules" || wpis.startsWith(".")) continue;
    if (statSync(pelna).isDirectory()) n += policzTesty(pelna);
    else if (/\.test\.ts$/.test(wpis)) {
      n += (readFileSync(pelna, "utf8").match(/^\s*(?:test|it)\(/gm) ?? []).length;
    }
  }
  return n;
}
{
  const testowNaDysku = ["modules", "components", "lib"]
    .filter((k) => existsSync(k))
    .reduce((suma, k) => suma + policzTesty(k), 0);
  const frazy = [
    ...readme.matchAll(/\((\d+) test\p{L}* na osobnej bazie/gu),
    ...readme.matchAll(/# (\d+) test\p{L}*;/gu),
  ];
  for (const [, liczba] of frazy) {
    if (Number(liczba) !== testowNaDysku) {
      bledy.push(
        `README podaje „${liczba} testów", a wywołań test()/it() w plikach *.test.ts jest ${testowNaDysku}.`,
      );
    }
  }
}

// ---- 6. liczba sposobów audytu mutacyjnego ----
{
  const audyt = join("tools", "straznicy", "audyt-straznikow.mjs");
  if (existsSync(audyt)) {
    const mutacji = (readFileSync(audyt, "utf8").match(/^\s*straznik:/gm) ?? []).length;
    for (const [, liczba] of readme.matchAll(/na[\s>]+(\d+) sposob/g)) {
      if (Number(liczba) !== mutacji) {
        bledy.push(
          `README podaje audyt „na ${liczba} sposobów", a mutacji w audyt-straznikow.mjs jest ${mutacji}.`,
        );
      }
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
  `straznik-readme: README zgodne ze stanem repo (${naDysku.length} strażników w tabeli, skrypty npm pokryte, kotwice i liczby testów/mutacji zgodne).`,
);
