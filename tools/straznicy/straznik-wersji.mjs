/**
 * Strażnik wersji: README musi mówić prawdę o wersji projektu.
 *
 * Źródłem prawdy jest najnowszy wpis w CHANGELOG.md (pierwszy nagłówek
 * `## [X.Y.Z]`). Strażnik pilnuje, żeby:
 *
 *   1. CHANGELOG.md istniał i miał poprawny wpis wersji,
 *   2. README.md deklarował DOKŁADNIE tę samą wersję,
 *   3. wpis w CHANGELOG miał datę (format ## [X.Y.Z] — RRRR-MM-DD).
 *
 * PO CO. Właściciel wymaga, żeby README było „zawsze świeże i zgodne
 * z prawdą". Rozjazd wersji to najłatwiejszy do wykrycia symptom
 * nieaktualnego README — i najczęstszy, bo o podbiciu wersji w dwóch
 * miejscach naraz łatwo zapomnieć przy wydaniu.
 *
 * Użycie: node tools/straznicy/straznik-wersji.mjs
 */
import { readFileSync } from "node:fs";

const bledy = [];

let changelog = "";
try {
  changelog = readFileSync("CHANGELOG.md", "utf8");
} catch {
  bledy.push("Brak CHANGELOG.md w korzeniu repo.");
}

let wersja = null;
if (changelog) {
  const m = changelog.match(/^## \[(\d+\.\d+\.\d+)\] — (\d{4}-\d{2}-\d{2})/m);
  if (!m) {
    bledy.push(
      "CHANGELOG.md: brak wpisu w formacie `## [X.Y.Z] — RRRR-MM-DD`."
    );
  } else {
    wersja = m[1];
  }
}

if (wersja) {
  const readme = readFileSync("README.md", "utf8");
  if (!readme.includes(`**${wersja}**`)) {
    bledy.push(
      `README.md nie deklaruje bieżącej wersji **${wersja}** z CHANGELOG.md — zaktualizuj tabelę „Stan projektu".`
    );
  }
}

if (bledy.length > 0) {
  console.error("straznik-wersji:");
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}
