/**
 * Strażnik wagi dokumentacji: masa dokumentacji producentów nie ma prawa
 * wejść do repozytorium.
 *
 * PO CO TO ISTNIEJE. Kolejne działy potrzebują oryginalnej dokumentacji
 * wydawców (WYTYCZNE §7 i N2): Dział 7 wziął Anthropic i GitHuba (~2200
 * plików, 55 MB), etap WordPressa bierze WordPressa, WooCommerce, Tutor LMS
 * i manual MySQL-a. Decyzją właściciela z 2026-08-18 pliki zostają LOKALNIE,
 * a repo dostaje opis źródeł i skrypt odtwarzający komplet. Powód jest
 * twardy: git przechowuje każdą wersję każdego pliku na stałe, więc jeden
 * pochopny `git add -A` obciąża każde przyszłe klonowanie już NA ZAWSZE —
 * a `.gitignore` nie chroni przed `git add -f` ani przed regułą skasowaną
 * w przyszłej sesji. Odkręcenie wymaga przepisania historii, czyli operacji,
 * której przy wypchniętej gałęzi praktycznie się nie robi. Dlatego pilnuje
 * tego strażnik, a nie sama konwencja.
 *
 * SKĄD WIE, CO JEST MASOWE. Z MANIFESTÓW samych skryptów pobierających:
 * każdy `tools/pobierz-dokumentacje-*.mjs` eksportuje `KATALOG_DZIALU`
 * i `KATALOGI_MASOWE`, a strażnik je importuje (import niczego nie pobiera —
 * skrypty ruszają dopiero uruchomione wprost). Własna kopia listy w strażniku
 * rozjechałaby się po cichu przy dopisaniu nowego źródła — to jest dokładnie
 * klasa BLAD-013, gdzie strażnik trzymał się NAZWY z kodu zamiast jego
 * ZACHOWANIA i zzieleniał na mutacji, którą wcześniej łapał. Skrypt bez
 * manifestu jest tu błędem, bo tworzyłby masę, o której strażnik nie wie.
 *
 * CO ŁAPIE.
 *  1. Skrypt pobierający bez manifestu — strażnik byłby na niego ślepy.
 *  2. Katalog masowy, który przestał być ignorowany (skasowana reguła
 *     w `.gitignore`). Pytamy gita o ZACHOWANIE dla konkretnej ścieżki
 *     (`git check-ignore`), nie o brzmienie reguły — regułę wolno przepisać
 *     na inny zapis, byle skutek został.
 *  3. Śledzony plik w katalogu masowym — `git add -f` obchodzi `.gitignore`.
 *  4. Przekroczenie budżetu wagi śledzonych plików w
 *     `docs/dokumentacja-techniczna/` — furtką jest podkatalog `cytowane/`
 *     (fragmenty przywoływane przez lekcje) i on ma pozostać fragmentem,
 *     a nie kopią całego manuala wnoszoną tylnymi drzwiami.
 *
 * Użycie: node tools/straznicy/straznik-wagi-dokumentacji.mjs
 */
import { execFileSync, spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { dirname, join, posix } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const KATALOG = "docs/dokumentacja-techniczna";
const BUDZET_BAJTOW = 8 * 1024 * 1024;
const KATALOG_NARZEDZI = join(dirname(fileURLToPath(import.meta.url)), "..");

const bledy = [];

/* ── 1. manifesty skryptów pobierających ── */

const skrypty = readdirSync(KATALOG_NARZEDZI)
  .filter((f) => f.startsWith("pobierz-dokumentacje-") && f.endsWith(".mjs"))
  .sort();

if (skrypty.length === 0) {
  bledy.push("Nie znaleziono żadnego skryptu pobierającego dokumentację — to samo w sobie jest błędem.");
}

/** Katalogi, które skrypty deklarują jako swoje — pary [ścieżka, skrypt]. */
const masowe = [];

for (const plik of skrypty) {
  const modul = await import(pathToFileURL(join(KATALOG_NARZEDZI, plik)).href);
  const dzial = modul.KATALOG_DZIALU;
  const katalogi = modul.KATALOGI_MASOWE;
  if (typeof dzial !== "string" || !Array.isArray(katalogi) || katalogi.length === 0) {
    bledy.push(
      `tools/${plik} nie eksportuje manifestu (KATALOG_DZIALU + KATALOGI_MASOWE).`,
      "  Bez manifestu strażnik nie wie, co ten skrypt kładzie na dysku, i nie ochroni repo.",
    );
    continue;
  }
  for (const k of katalogi) masowe.push({ sciezka: posix.join(dzial, k), skrypt: `tools/${plik}` });
}

/* ── 2. czy git nadal ignoruje każdy katalog masowy ── */

for (const { sciezka, skrypt } of masowe) {
  // pytamy o plik W katalogu, bo to on jest tym, co realnie wpadłoby do repo
  const wynik = spawnSync("git", ["check-ignore", "--no-index", "-q", posix.join(sciezka, "probny.md")]);
  if (wynik.status !== 0) {
    bledy.push(
      `git NIE ignoruje ${sciezka}/ — masa dokumentacji może wejść do repozytorium.`,
      `  Ten katalog zapowiada ${skrypt}; przywróć regułę w .gitignore.`,
    );
  }
}

/* ── 3. czy coś z katalogów masowych jest już śledzone ── */

const sledzone = execFileSync("git", ["ls-files", "--", KATALOG], { encoding: "utf8" })
  .split("\n")
  .map((s) => s.trim())
  .filter(Boolean);

const wpuszczone = sledzone.filter((p) => masowe.some(({ sciezka }) => p.startsWith(sciezka + "/")));
if (wpuszczone.length > 0) {
  bledy.push(
    `${wpuszczone.length} plików dokumentacji producentów jest ŚLEDZONYCH przez gita — mają zostać lokalnie.`,
    `  na przykład: ${wpuszczone.slice(0, 3).join(", ")}`,
    "  Usuń je z indeksu (git rm --cached <ścieżka>), a odtwarzaj skryptem pobierającym.",
  );
}

/* ── 4. budżet wagi ── */

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
