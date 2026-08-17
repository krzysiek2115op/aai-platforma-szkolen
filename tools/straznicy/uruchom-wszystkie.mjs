/**
 * Uruchamia WSZYSTKICH strażników po kolei.
 *
 * PO CO TO ISTNIEJE. Lekcja z projektu strony głównej — dziś automatic-ai (verify-pipeline.mjs):
 * kontrola jest warta tyle, ile jej podpięcie. Strażnik, który istnieje w repo,
 * ale nie jest wywoływany przez CI, nie chroni przed niczym — a jego brak
 * wygląda dokładnie tak samo jak zielony build.
 *
 * Dlatego CI oraz hak pre-commit wywołują TEN plik, a on sam znajduje
 * wszystkich strażników po nazwie (straznik-*.mjs). Dopisanie nowego
 * strażnika = położenie pliku w tym katalogu. Nie da się go „zapomnieć
 * podpiąć", bo podpięcie jest automatyczne.
 *
 * Użycie: node tools/straznicy/uruchom-wszystkie.mjs
 */
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const KATALOG = dirname(fileURLToPath(import.meta.url));

const straznicy = readdirSync(KATALOG)
  .filter((f) => f.startsWith("straznik-") && f.endsWith(".mjs"))
  .sort();

if (straznicy.length === 0) {
  console.error("uruchom-wszystkie: nie znaleziono żadnego strażnika — to samo w sobie jest błędem.");
  process.exit(1);
}

let porazki = 0;

for (const plik of straznicy) {
  const wynik = spawnSync(process.execPath, [join(KATALOG, plik)], {
    stdio: "inherit",
  });
  if (wynik.status !== 0) {
    porazki++;
    console.error(`✖ ${plik} — NIEZALICZONY`);
  } else {
    console.log(`✔ ${plik}`);
  }
}

if (porazki > 0) {
  console.error(`\nStrażnicy: ${porazki}/${straznicy.length} niezaliczonych.`);
  process.exit(1);
}

console.log(`\nStrażnicy: wszyscy zaliczeni (${straznicy.length}).`);
