/**
 * Rastry ikony marki — 192, 512 i wariant `maskable`.
 *
 * PO CO, SKORO MAMY `app/icon.svg`. Bo samo SVG nie wystarcza tam, gdzie
 * ikona przestaje być favikonem: Android przy instalacji skrótu z manifestu
 * sięga po PNG, a bez wariantu `maskable` dokłada do znaku WŁASNE tło
 * i przycina go własną maską — nasz sygnet dostałby wtedy białe kółko pod
 * spodem i obcięte ramiona. Ten sam wniosek zapisało repo strony głównej
 * przy swoim `manifest.ts`; bierzemy stamtąd POMYSŁ, nie plik (WYTYCZNE:
 * tamto repo jest tylko do odczytu, a ich skrypt stoi na `sharp`, którego
 * nie mamy i nie chcemy dokładać).
 *
 * DLACZEGO PRZEGLĄDARKA, A NIE BIBLIOTEKA. Bo tak już rasteryzujemy
 * okładki (`tools/okladki-png.mjs`, P5): rig z `puppeteer-core`
 * i systemowym Firefoksem żyje w scratchpadzie sesji, NIGDY
 * w `package.json`. Pomiar z P5 jest dalej prawdziwy — kontener nie ma
 * ANI JEDNEGO rasteryzatora SVG (`Imagick::queryFormats("*SVG*")` zwraca
 * pustą listę, GD SVG nie czyta, `rsvg-convert`/`inkscape` nie istnieją).
 *
 * PNG JEST ARTEFAKTEM REPOZYTORIUM — leży w `public/`, a obok niego skrót
 * źródła. Bez skrótu „czy raster jest aktualny" dałoby się sprawdzić tylko
 * okiem, a znak zmieniony w SVG i niewyrenderowany wygląda identycznie jak
 * zrobiony poprawnie.
 *
 * Użycie:
 *   ZRZUTY_RIG=/tmp/rig node tools/ikony-marki.mjs
 *   node tools/ikony-marki.mjs --sprawdz     (bez przeglądarki)
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const KORZEN = join(dirname(fileURLToPath(import.meta.url)), "..");
const TYLKO_SPRAWDZ = process.argv.includes("--sprawdz");

const ZRODLO = join(KORZEN, "app/icon.svg");

/**
 * Trzy rastry, bo odpowiadają na trzy różne pytania systemu:
 *   - 192 i 512 to rozmiary, o które pyta manifest przy instalacji skrótu;
 *   - `maskable` to ten sam znak wpisany w BEZPIECZNY OBSZAR (środkowe
 *     80% płótna). Android przycina ikonę maskowaną do własnego kształtu
 *     (koło, kwadrat ze ściętymi rogami, „squircle"), więc znak narysowany
 *     na całym płótnie traci ramiona. Marginesu nie zgadujemy: to wymóg
 *     specyfikacji `purpose: maskable`.
 *   - `apple-icon` to konwencja plikowa Next.js — 180×180, bez maski,
 *     bo iOS sam zaokrągla róg.
 */
const ZADANIA = [
  { plik: "icon-192.png", katalog: "public", bok: 192, margines: 0 },
  { plik: "icon-512.png", katalog: "public", bok: 512, margines: 0 },
  { plik: "icon-maskable.png", katalog: "public", bok: 512, margines: 0.1 },
  // `app/`, nie `public/` — to konwencja plikowa Next.js: plik o tej nazwie
  // w `app/` sam staje się `<link rel="apple-touch-icon">`.
  { plik: "apple-icon.png", katalog: "app", bok: 180, margines: 0 },
];

const skrot = (tekst) => createHash("sha256").update(tekst).digest("hex").slice(0, 16);
const sciezkaSkrotu = (png) => `${png}.sha256`;

/** Skrót niesie TREŚĆ ŹRÓDŁA i parametry — inny margines to inny obraz. */
const odcisk = (svg, zadanie) => skrot(`${svg}|${zadanie.bok}|${zadanie.margines}`);

if (!existsSync(ZRODLO)) {
  console.error(`ikony-marki: brak źródła ${ZRODLO}`);
  process.exit(1);
}
const svg = readFileSync(ZRODLO, "utf8");

/* ── tryb sprawdzania: bez przeglądarki ──────────────────────────────── */

if (TYLKO_SPRAWDZ) {
  const braki = [];
  for (const zadanie of ZADANIA) {
    const png = join(KORZEN, zadanie.katalog, zadanie.plik);
    if (!existsSync(png)) {
      braki.push(`${zadanie.katalog}/${zadanie.plik}: brak rastra — uruchom \`ZRZUTY_RIG=<rig> node tools/ikony-marki.mjs\``);
      continue;
    }
    const zapisany = existsSync(sciezkaSkrotu(png)) ? readFileSync(sciezkaSkrotu(png), "utf8").trim() : "";
    if (zapisany !== odcisk(svg, zadanie)) {
      braki.push(`${zadanie.katalog}/${zadanie.plik}: raster pochodzi z INNEJ wersji znaku — przerenderuj \`node tools/ikony-marki.mjs\``);
    }
  }
  if (braki.length > 0) {
    console.error(`ikony-marki: ${braki.length} usterek:`);
    for (const b of braki) console.error(`  - ${b}`);
    process.exit(1);
  }
  console.log(`ikony-marki: ${ZADANIA.length} rastrów ma aktualne źródło.`);
  process.exit(0);
}

/* ── render ──────────────────────────────────────────────────────────── */

const RIG = process.env.ZRZUTY_RIG;
if (!RIG) {
  console.error(
    "ikony-marki: ustaw ZRZUTY_RIG na katalog z zainstalowanym `puppeteer-core`.\n" +
      "  mkdir -p /tmp/rig && cd /tmp/rig && npm init -y && npm i puppeteer-core"
  );
  process.exit(1);
}
const puppeteer = createRequire(`${RIG}/`)("puppeteer-core");

const przegladarka = await puppeteer.launch({
  browser: "firefox",
  executablePath: process.env.FIREFOX ?? "/usr/bin/firefox",
  protocol: "webDriverBiDi",
  headless: true,
});

try {
  for (const zadanie of ZADANIA) {
    const karta = await przegladarka.newPage();
    await karta.setViewport({ width: zadanie.bok, height: zadanie.bok });

    /*
     * SVG idzie jako TREŚĆ STRONY, nie plikiem — inaczej przeglądarka
     * dokłada własne marginesy i białe tło (lekcja z okładek).
     * Tło płótna bierzemy z samego znaku (`#08090b` — jego `rect`), więc
     * margines wariantu maskowanego nie jest widoczny jako ramka.
     */
    const skala = 1 - 2 * zadanie.margines;
    await karta.setContent(
      `<!doctype html><meta charset="utf-8">` +
        `<style>html,body{margin:0;padding:0;background:#08090b;` +
        `display:flex;align-items:center;justify-content:center;` +
        `width:100vw;height:100vh;overflow:hidden}` +
        `svg{display:block;width:${(skala * 100).toFixed(2)}vw;height:auto}</style>` +
        svg,
      { waitUntil: "load" }
    );

    const obraz = await karta.screenshot({ type: "png" });
    await karta.close();

    const png = join(KORZEN, zadanie.katalog, zadanie.plik);
    writeFileSync(png, obraz);
    writeFileSync(sciezkaSkrotu(png), `${odcisk(svg, zadanie)}\n`);
    console.log(`  ${zadanie.katalog}/${zadanie.plik} — ${(obraz.length / 1024).toFixed(0)} kB, ${zadanie.bok}×${zadanie.bok}`);
  }
} finally {
  await przegladarka.close();
}
console.log(`ikony-marki: ${ZADANIA.length} rastrów wyrenderowanych.`);
