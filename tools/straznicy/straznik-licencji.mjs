/**
 * Strażnik licencji: projekt jest na GPL-2.0 i ma to być widoczne.
 *
 * PO CO. Wytyczna właściciela (docs/WYTYCZNE.md §3): licencja GPL 2.0
 * w projekcie I w README. Plik LICENSE łatwo zgubić przy porządkach,
 * a deklarację w README — przy przepisywaniu tabeli. Rozjazd = README
 * kłamie albo repo nie ma licencji.
 *
 * Sprawdza:
 *   1. LICENSE istnieje i zawiera nagłówek GNU GPL v2,
 *   2. README.md deklaruje licencję GPL-2.0.
 *
 * Użycie: node tools/straznicy/straznik-licencji.mjs
 */
import { readFileSync } from "node:fs";

const bledy = [];

let licencja = "";
try {
  licencja = readFileSync("LICENSE", "utf8");
} catch {
  bledy.push("Brak pliku LICENSE w korzeniu repo.");
}

if (licencja && !/GNU GENERAL PUBLIC LICENSE[\s\S]{0,80}Version 2/.test(licencja)) {
  bledy.push("LICENSE nie wygląda na GNU GPL v2 — wytyczna wymaga GPL-2.0.");
}

const readme = readFileSync("README.md", "utf8");
if (!readme.includes("GPL-2.0")) {
  bledy.push("README.md nie deklaruje licencji GPL-2.0.");
}

if (bledy.length > 0) {
  console.error("straznik-licencji:");
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}
