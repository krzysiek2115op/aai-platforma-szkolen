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
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const KATALOG_STRAZNIKOW = join("tools", "straznicy");

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
  // Wzorce kotwiczone do `run:` — sama OBECNOŚĆ słowa w pliku to za
  // mało (audyt mutacyjny 2026-08-19: po wycięciu kroku lint strażnik
  // dalej był zielony, bo filtr ścieżek joba „zakres" zawiera tekst
  // „eslint.config" — słowo pasowało, krok nie istniał).
  const wymagane = [
    ["npm ci", /run:\s*.*npm ci\b/],
    ["lint", /run:\s*.*(npm run lint\b|next lint\b|eslint\b)/],
    ["tsc (kontrola typów)", /run:\s*.*tsc\b/],
    ["build", /run:\s*.*(npm run build\b|next build\b)/],
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

  // Strażnik czytający KONTRAKTY z kodu (import z modules/) potrzebuje
  // zależności — inaczej pada w CI na „ERR_MODULE_NOT_FOUND: zod",
  // choć lokalnie jest zielony (bo tu node_modules są). Zdarzyło się
  // to przy straznik-kreatora na PR #18.
  const czytajaKod = readdirSync(KATALOG_STRAZNIKOW)
    // pomijamy siebie: wzorzec „modules/" występuje tu jako reguła
    // wykrywania, nie jako prawdziwy import
    .filter((n) => /^straznik-.*\.mjs$/.test(n) && n !== "straznik-ci.mjs")
    .filter((n) =>
      // statyczny `from "…/modules/…"` ORAZ dynamiczny `import("…/modules/…")`
      // — strażnicy czytający kontrakty używają tej drugiej formy
      /(?:from\s+|import\(\s*)["'][^"']*modules\//.test(
        readFileSync(join(KATALOG_STRAZNIKOW, n), "utf8")
      )
    );
  if (czytajaKod.length > 0) {
    const jobStraznikow = ci.split(/^  \w[\w-]*:/m).find((j) => /straznic|uruchom-wszystkie/i.test(j));
    if (jobStraznikow && !/npm ci\b/.test(jobStraznikow)) {
      bledy.push(
        `${SCIEZKA_CI}: ${czytajaKod.join(", ")} czyta kontrakty z modules/, więc wymaga zależności — job strażników nie ma kroku „npm ci" i padnie w CI mimo zielonych strażników lokalnie.`
      );
    }
  }
}

if (bledy.length > 0) {
  console.error("straznik-ci:");
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}
