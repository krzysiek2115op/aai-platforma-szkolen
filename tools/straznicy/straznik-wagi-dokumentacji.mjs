/**
 * Strażnik wagi dokumentacji: masa dokumentacji producentów nie ma prawa
 * wejść do repozytorium.
 *
 * PO CO TO ISTNIEJE. Dział 7 potrzebuje oryginalnej dokumentacji Anthropic
 * i GitHuba (WYTYCZNE §7 i N2) — to ~2200 plików i 55 MB. Decyzją
 * właściciela z 2026-08-18 pliki zostają LOKALNIE, a repo dostaje opis
 * źródeł i skrypt odtwarzający komplet. Powód jest twardy: git przechowuje
 * każdą wersję każdego pliku na stałe, więc jeden pochopny `git add -A`
 * obciąża każde przyszłe klonowanie już NA ZAWSZE — a `.gitignore` nie
 * chroni przed `git add -f` ani przed regułą skasowaną w przyszłej sesji.
 * Odkręcenie wymaga przepisania historii, czyli operacji, której przy
 * wypchniętej gałęzi praktycznie się nie robi. Dlatego pilnuje tego
 * strażnik, a nie sama konwencja.
 *
 * CO ŁAPIE.
 *  1. Śledzony plik w katalogu masowym (`claude-platform/`, `claude-code/`,
 *     `github/`) — te mają zostać poza repo.
 *  2. Przekroczenie budżetu wagi śledzonych plików w
 *     `docs/dokumentacja-techniczna/` — furtką jest podkatalog `cytowane/`
 *     (fragmenty przywoływane przez lekcje) i on ma pozostać fragmentem,
 *     a nie kopią całego manuala wnoszoną tylnymi drzwiami.
 *
 * Użycie: node tools/straznicy/straznik-wagi-dokumentacji.mjs
 */
import { execFileSync } from "node:child_process";
import { statSync } from "node:fs";

const KATALOG = "docs/dokumentacja-techniczna";
const KATALOGI_MASOWE = ["claude-platform", "claude-code", "github"];
const BUDZET_BAJTOW = 8 * 1024 * 1024;

const sledzone = execFileSync("git", ["ls-files", "--", KATALOG], { encoding: "utf8" })
  .split("\n")
  .map((s) => s.trim())
  .filter(Boolean);

const bledy = [];

const masowe = sledzone.filter((p) =>
  KATALOGI_MASOWE.some((k) => p.split("/").includes(k)),
);
if (masowe.length > 0) {
  bledy.push(
    `${masowe.length} plików dokumentacji producentów jest ŚLEDZONYCH przez gita — mają zostać lokalnie.`,
    `  na przykład: ${masowe.slice(0, 3).join(", ")}`,
    "  Usuń je z indeksu (git rm --cached <ścieżka>), a odtwarzaj skryptem:",
    "  node tools/pobierz-dokumentacje-d7.mjs",
  );
}

let razem = 0;
for (const p of sledzone) {
  try {
    razem += statSync(p).size;
  } catch {
    // plik śledzony, ale usunięty z dysku — waga nieistotna dla tej kontroli
  }
}
if (razem > BUDZET_BAJTOW) {
  const mb = (b) => (b / 1024 / 1024).toFixed(1);
  bledy.push(
    `Śledzona dokumentacja waży ${mb(razem)} MB — budżet to ${mb(BUDZET_BAJTOW)} MB.`,
    "  Do repo trafiają wyłącznie fragmenty CYTOWANE przez lekcje, nie całe manuale.",
  );
}

if (bledy.length > 0) {
  console.error("straznik-wagi-dokumentacji:");
  for (const b of bledy) console.error(`  ${b}`);
  process.exit(1);
}
