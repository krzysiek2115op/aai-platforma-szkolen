/**
 * Strażnik CI: skoro jest kod aplikacji, CI musi go naprawdę sprawdzać.
 *
 * PO CO. Zasada „kontrola jest warta tyle, ile jej podpięcie": zielone
 * CI, które nie uruchamia lint/tsc/build, kłamie. Ten strażnik pilnuje,
 * żeby wraz z pojawieniem się package.json w korzeniu repo workflow CI
 * zawierał komplet kroków jakości — i żeby nie dało się ich po cichu
 * wyciąć w przyszłym refaktorze workflow.
 *
 * CO ŁAPIE (tylko gdy istnieje package.json w korzeniu):
 *   1. brak pliku .github/workflows/ci.yml,
 *   2. brak w ci.yml któregoś z kroków: `npm ci`, lint, tsc, build,
 *   3. gdy package.json ma skrypt "test" — brak kroku testów w CI
 *      (testy wchodzą od Działu 2; wcześniej nie wymagamy).
 *
 * Dopóki package.json nie istnieje, strażnik przechodzi.
 *
 * Użycie: node tools/straznicy/straznik-ci.mjs
 */
import { readFileSync, existsSync } from "node:fs";

if (!existsSync("package.json")) process.exit(0);

const bledy = [];
const SCIEZKA_CI = ".github/workflows/ci.yml";

let ci = "";
if (!existsSync(SCIEZKA_CI)) {
  bledy.push(`Brak ${SCIEZKA_CI}, a package.json istnieje — kod bez CI.`);
} else {
  ci = readFileSync(SCIEZKA_CI, "utf8");
}

if (ci) {
  const wymagane = [
    ["npm ci", /npm ci\b/],
    ["lint", /npm run lint\b|next lint\b|eslint\b/],
    ["tsc (kontrola typów)", /tsc\b/],
    ["build", /npm run build\b|next build\b/],
  ];
  for (const [nazwa, wzorzec] of wymagane) {
    if (!wzorzec.test(ci)) {
      bledy.push(`${SCIEZKA_CI}: brak kroku „${nazwa}" — CI nie sprawdza kodu.`);
    }
  }

  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  if (pkg.scripts?.test && !/npm (run )?test\b|node --test\b/.test(ci)) {
    bledy.push(
      `${SCIEZKA_CI}: package.json ma skrypt "test", ale CI go nie uruchamia.`
    );
  }
}

if (bledy.length > 0) {
  console.error("straznik-ci:");
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}
