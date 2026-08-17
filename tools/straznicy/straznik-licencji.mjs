/**
 * Strażnik licencji: projekt jest na MIT i ma to być widoczne — a fonty
 * mają własną licencję, której nie wolno zgubić.
 *
 * PO CO. Wytyczna właściciela (docs/WYTYCZNE.md §3): licencja MIT
 * w projekcie I w README (do 2026-08-17 było GPL-2.0; właściciel zmienił
 * na MIT dla zgodności z repo strony głównej). Plik LICENSE łatwo zgubić
 * przy porządkach, deklarację w README — przy przepisywaniu tabeli,
 * a `license` w package.json zostaje po staremu i kłamie w metadanych
 * pakietu. Osobna pułapka: pliki fontów Geist w assets/fonts/ są na
 * SIL OFL 1.1 — licencja projektu ich NIE obejmuje, więc tekst OFL musi
 * leżeć obok nich przy każdej redystrybucji.
 *
 * Sprawdza:
 *   1. LICENSE istnieje i jest tekstem MIT,
 *   2. README.md deklaruje licencję MIT i nie zostawia starego GPL-2.0,
 *   3. package.json ma "license": "MIT",
 *   4. przy plikach fontów leży tekst SIL OFL.
 *
 * Użycie: node tools/straznicy/straznik-licencji.mjs
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";

const bledy = [];

let licencja = "";
try {
  licencja = readFileSync("LICENSE", "utf8");
} catch {
  bledy.push("Brak pliku LICENSE w korzeniu repo.");
}

if (
  licencja &&
  !(
    /MIT License/i.test(licencja) &&
    /Permission is hereby granted, free of charge/i.test(licencja)
  )
) {
  bledy.push("LICENSE nie wygląda na tekst MIT — wytyczna (§3) wymaga MIT.");
}

const readme = readFileSync("README.md", "utf8");
if (!/licencj\w*\s+MIT|MIT \(\[LICENSE\]/i.test(readme)) {
  bledy.push("README.md nie deklaruje licencji MIT.");
}
if (/GPL-2\.0/.test(readme)) {
  bledy.push(
    "README.md wciąż wspomina GPL-2.0 — po zmianie licencji deklaracja musi być spójna."
  );
}

// package.json istnieje tylko na gałęziach z kodem aplikacji —
// na `main` (fundament repo) go nie ma i to jest w porządku.
if (existsSync("package.json")) {
  try {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    if (pkg.license !== "MIT") {
      bledy.push(`package.json: "license": "${pkg.license}" — powinno być "MIT".`);
    }
  } catch {
    bledy.push("package.json istnieje, ale nie da się go sparsować.");
  }
}

// Fonty mają własną licencję (SIL OFL) — tekst musi jechać razem z plikami.
const KATALOG_FONTOW = "assets/fonts";
if (existsSync(KATALOG_FONTOW)) {
  const pliki = readdirSync(KATALOG_FONTOW);
  const saFonty = pliki.some((p) => /\.(woff2?|ttf|otf)$/i.test(p));
  const jestOfl = pliki.some(
    (p) =>
      /licen[sc]e|ofl/i.test(p) &&
      /SIL OPEN FONT LICENSE/i.test(
        readFileSync(`${KATALOG_FONTOW}/${p}`, "utf8")
      )
  );
  if (saFonty && !jestOfl) {
    bledy.push(
      `${KATALOG_FONTOW}: są pliki fontów, ale brak tekstu SIL OFL — redystrybucja Geista wymaga dołączenia licencji fontu.`
    );
  }
}

if (bledy.length > 0) {
  console.error("straznik-licencji:");
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}
