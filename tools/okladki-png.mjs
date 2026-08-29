/**
 * Okładki kursów: SVG → PNG (artefakt w repo, nie zależność wtyczki).
 *
 * PO CO TO ISTNIEJE. Produkt WooCommerce pokazuje klientowi miniaturę
 * w koszyku, w kasie i w mailu — a nasze okładki to pliki SVG, których
 * WordPress domyślnie NIE przyjmuje do biblioteki mediów (SVG może nieść
 * skrypt; właściciel świadomie odrzucił dopuszczenie tego formatu
 * 2026-08-29). Klient widział więc szary zastępnik za kurs, za który płaci.
 *
 * DLACZEGO NIE RENDERUJEMY W PHP, JAK ZAKŁADAŁA PIERWSZA DECYZJA. Bo nie
 * ma czym. Zmierzone w kontenerze instalacji: `Imagick::queryFormats("*SVG*")`
 * zwraca PUSTĄ listę, GD SVG nie czyta, a `rsvg-convert`, `inkscape`
 * i `convert` nie istnieją. Renderowanie „przy synchronizacji" wymagałoby
 * dołożenia delegata do obrazu serwera — czyli zależności, której na
 * docelowym hostingu może nie być, i wtedy okładka zniknęłaby po cichu.
 *
 * DLATEGO PNG JEST ARTEFAKTEM REPOZYTORIUM: powstaje TU, jednym przebiegiem,
 * leży obok źródłowego SVG i jedzie z wtyczką jak każdy inny plik. Wtyczka
 * tylko go wgrywa. Ta sama zasada, co przy 148 zrzutach lekcji.
 *
 * RIG (przeglądarka) mieszka POZA projektem — nigdy w `package.json`:
 *   mkdir -p /tmp/rig && cd /tmp/rig && npm init -y && npm i puppeteer-core
 *   export ZRZUTY_RIG=/tmp/rig
 *
 * Użycie: ZRZUTY_RIG=/tmp/rig node tools/okladki-png.mjs [--sprawdz]
 *   --sprawdz  niczego nie zapisuje; kod 1, gdy któryś PNG nie istnieje
 *              albo nie odpowiada swojemu SVG (bramka dla strażnika).
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const KORZEN = join(dirname(fileURLToPath(import.meta.url)), "..");
const TYLKO_SPRAWDZ = process.argv.includes("--sprawdz");

/**
 * Katalogi z okładkami. Prototyp i wtyczka trzymają WŁASNE kopie tych
 * samych plików (wtyczka nie może sięgać do `public/` Nexta), więc PNG
 * powstaje w obu — inaczej rozjazd byłby niewidoczny do chwili, w której
 * ktoś porówna dwa sklepy.
 */
const KATALOGI = ["public/okladki", "wordpress/wtyczki/aai-sklep/assets/okladki"];

/**
 * Wyjście jest KWADRATOWE, choć okładka ma 16:9 — i to nie jest kaprys.
 * WooCommerce składa miniaturę produktu rozmiarem `woocommerce_thumbnail`,
 * czyli **przycięciem 300×300**. Zmierzone na wyrenderowanym pliku 1600×900:
 * z tytułu „Jak poprawnie korzystać z Claude" zostawało „poprawnie / zystać
 * z Claude" — obcięte z obu stron. Ucięty napis wygląda jak awaria, nie jak
 * projekt. Wpisujemy więc całą okładkę w kwadrat na jej własnym tle: klient
 * widzi kafelek, który skądś zna, a WooCommerce nie ma czego przycinać.
 */
const BOK = 1200;

const skrot = (tekst) => createHash("sha256").update(tekst).digest("hex").slice(0, 16);

/**
 * Skrót ŹRÓDŁA zapisujemy w pliku obok PNG. Bez tego „czy PNG jest
 * aktualny" dałoby się sprawdzić tylko okiem — a okładka zmieniona w SVG
 * i niewyrenderowana wygląda dokładnie tak samo jak zrobiona poprawnie.
 */
const sciezkaSkrotu = (png) => png.replace(/\.png$/, ".png.sha256");

const zadania = [];
for (const katalog of KATALOGI) {
  const pelny = join(KORZEN, katalog);
  for (const svg of ["jak-korzystac-z-claude.svg", "jak-uzywac-githuba.svg"]) {
    const zrodlo = join(pelny, svg);
    if (!existsSync(zrodlo)) {
      console.error(`okladki-png: brak pliku źródłowego ${katalog}/${svg}`);
      process.exit(1);
    }
    zadania.push({ zrodlo, png: zrodlo.replace(/\.svg$/, ".png"), etykieta: `${katalog}/${basename(svg)}` });
  }
}

/* ── tryb sprawdzania: bez przeglądarki ──────────────────────────────── */

if (TYLKO_SPRAWDZ) {
  const braki = [];
  for (const z of zadania) {
    const oczekiwany = skrot(readFileSync(z.zrodlo, "utf8"));
    if (!existsSync(z.png)) {
      braki.push(`${z.etykieta}: brak PNG — uruchom \`node tools/okladki-png.mjs\``);
      continue;
    }
    const zapisany = existsSync(sciezkaSkrotu(z.png)) ? readFileSync(sciezkaSkrotu(z.png), "utf8").trim() : "";
    if (zapisany !== oczekiwany) {
      braki.push(`${z.etykieta}: PNG pochodzi z INNEJ wersji SVG — przerenderuj \`node tools/okladki-png.mjs\``);
    }
  }
  if (braki.length) {
    console.error("okladki-png: " + braki.length + " usterek:");
    for (const b of braki) console.error("  - " + b);
    process.exit(1);
  }
  console.log(`okladki-png: ${zadania.length} okładek ma aktualny PNG.`);
  process.exit(0);
}

/* ── render ──────────────────────────────────────────────────────────── */

const RIG = process.env.ZRZUTY_RIG;
if (!RIG) {
  console.error(
    "okladki-png: ustaw ZRZUTY_RIG na katalog z zainstalowanym `puppeteer-core`.\n" +
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
  for (const z of zadania) {
    const svg = readFileSync(z.zrodlo, "utf8");
    const karta = await przegladarka.newPage();
    await karta.setViewport({ width: BOK, height: BOK });
    /*
     * Ładujemy SVG jako TREŚĆ STRONY, nie plikiem — inaczej przeglądarka
     * dokłada własne marginesy i tło, a zrzut wychodzi z białą ramką.
     * `data:`-URL odpada przez CSP przeglądarki dla nawigacji.
     *
     * Tło kwadratu bierzemy z samej okładki (`#08090b` — jej `rect`),
     * więc listwy nad i pod grafiką nie są widoczne jako listwy.
     */
    await karta.setContent(
      `<!doctype html><meta charset="utf-8">` +
        `<style>html,body{margin:0;padding:0;background:#08090b;display:flex;` +
        `align-items:center;justify-content:center;height:100vh}` +
        `svg{display:block;width:100vw;height:auto}</style>` +
        svg,
      { waitUntil: "load" }
    );
    const obraz = await karta.screenshot({ type: "png" });
    await karta.close();

    writeFileSync(z.png, obraz);
    writeFileSync(sciezkaSkrotu(z.png), skrot(svg) + "\n");
    console.log(`  ${z.etykieta.replace(/\.svg$/, ".png")} — ${(obraz.length / 1024).toFixed(0)} kB, ${BOK}×${BOK}`);
  }
} finally {
  await przegladarka.close();
}
console.log(`okladki-png: ${zadania.length} okładek wyrenderowanych.`);
