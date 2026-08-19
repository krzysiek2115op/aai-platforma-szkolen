/**
 * Strażnik limitów wejścia: żadne pole przychodzące z sieci nie jest
 * nieograniczone.
 *
 * PO CO. Kontrakt bez górnej granicy nie objawia się błędem — zapis
 * „działa", dopóki ktoś nie wyśle pola na megabajt. Do 0.27.0 pola
 * kursu miały limity (slug 120, title 200, short_desc 500), ale treść
 * sekcji była gołym `z.string()`, tablice `sections`/`modules`/`lessons`
 * nie miały sufitu liczności, a trasa wczytywała CAŁE ciało żądania do
 * pamięci, zanim cokolwiek sprawdziła.
 *
 * CZEGO NIE PILNUJE: schematów kanału ODCZYTU (górna część `typy.ts`).
 * Tamte dane przychodzą z naszej bazy, a więc przeszły już walidację
 * przy zapisie; limit tam byłby rytuałem, a przy okazji groziłby
 * zniknięciem treści ze strony przy pierwszej rozbieżności.
 *
 * Dziesięć niezmienników, każdy z własną mutacją w audyt-straznikow:
 *   1. każde `z.string()` w schematach WEJŚCIA ma `.max(`,
 *   2. każda `z.array(` w schematach wejścia ma `.max(`,
 *   3. `z.url()` ma `.max(` (adres to też pole tekstowe),
 *   4. `price_grosze` ma sufit (kolumna to `integer`),
 *   5. token z sieci ma sufit długości,
 *   6. trasa czyta ciało z SUFITEM i odmawia kodem 413,
 *   7. trasa nie używa `request.json()` (wczytuje całość bez limitu),
 *   8. sufit działa PRZED parsowaniem JSON-a,
 *   9. treść sekcji jest OCZYSZCZANA schematem przed zapisem
 *      (bez tego limity omija jeden nieznany klucz),
 *  10. dyspozytor nie oddaje surowego komunikatu Postgresa.
 *
 * Użycie: node tools/straznicy/straznik-limitow.mjs
 */
import { readFileSync, existsSync } from "node:fs";

const bledy = [];
const czytaj = (p) => (existsSync(p) ? readFileSync(p, "utf8") : null);

/** Sam kod — opisy w tym repo cytują odrzucone rozwiązania. */
const kod = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/* 1–5: kontrakty wejścia */
const TYPY = "modules/m1-sklep/typy.ts";
const typy = czytaj(TYPY);

if (!typy) {
  bledy.push(`brak ${TYPY} — kontrakty modułu muszą istnieć`);
} else {
  const kodTypow = kod(typy);
  const poczatek = kodTypow.indexOf("export const LIMIT_KROTKI");
  if (poczatek < 0) {
    bledy.push(
      `${TYPY}: nie znalazłem bloku stałych limitów (LIMIT_KROTKI) — ` +
        "liczby mają stać w jednym miejscu, z pomiarem w komentarzu, " +
        "a nie być rozsypane po schematach"
    );
  }
  // Region wejścia: od stałych limitów w dół. Wszystko wyżej to kanał
  // odczytu, którego ten strażnik świadomie nie dotyczy.
  const region = poczatek < 0 ? "" : kodTypow.slice(poczatek);

  const bezSufitu = (wzorzec, nazwa) => {
    for (const trafienie of region.matchAll(wzorzec)) {
      const dalej = region.slice(
        trafienie.index + trafienie[0].length,
        trafienie.index + trafienie[0].length + 60
      );
      if (!dalej.includes(".max(")) {
        const wiersz = region.slice(0, trafienie.index).split("\n").length;
        bledy.push(
          `${TYPY}: ${nazwa} bez \`.max(\` w schemacie wejścia ` +
            `(≈${wiersz}. wiersz regionu limitów) — pole przychodzące ` +
            "z sieci byłoby ograniczone dopiero rozmiarem ciała żądania"
        );
      }
    }
  };

  bezSufitu(/z\.string\(\)/g, "`z.string()`");
  bezSufitu(/z\.array\(/g, "`z.array(`");
  bezSufitu(/z\.url\(\)/g, "`z.url()`");

  if (!/price_grosze:[^\n]*\.max\(/.test(region)) {
    bledy.push(
      `${TYPY}: \`price_grosze\` bez sufitu — kolumna jest typu ` +
        "`integer`, więc bez limitu w kontrakcie wartość powyżej " +
        "2 147 483 647 kończy się surowym błędem BAZY zamiast walidacji"
    );
  }
  if (!/token: z\.string\(\)\.max\(/.test(region)) {
    bledy.push(
      `${TYPY}: token bez sufitu długości — przychodzi z sieci jak każde ` +
        "inne pole i trafia do porównania w stałym czasie"
    );
  }
  if (!/\.transform\(/.test(region) || !/SCHEMATY_SEKCJI\[sekcja\.kind\]\.parse\(/.test(region)) {
    bledy.push(
      `${TYPY}: treść sekcji nie jest OCZYSZCZANA schematem przed zapisem ` +
        "— `content` jest workiem `Record<string, unknown>`, więc klucz " +
        "spoza kontraktu wchodziłby do JSONB bez żadnego limitu"
    );
  }
}

/* 6–8: trasa */
const TRASA = "app/api/szkolenia/route.serwer.ts";
const trasa = czytaj(TRASA);
if (!trasa) {
  bledy.push(`brak ${TRASA}`);
} else {
  const kodTrasy = kod(trasa);
  if (!/status:\s*413/.test(kodTrasy)) {
    bledy.push(
      `${TRASA}: brak odpowiedzi 413 — ciało ponad sufit musi być ` +
        "odrzucone własnym kodem, nie udawać błędu składni JSON-a"
    );
  }
  if (/request\.json\(\)/.test(kodTrasy)) {
    bledy.push(
      `${TRASA}: \`request.json()\` wczytuje CAŁE ciało do pamięci, zanim ` +
        "cokolwiek je zmierzy — sufit sprawdzany po tym byłby limitem, " +
        "który sam wykonuje atak. Czytamy strumieniem z licznikiem"
    );
  }
  // WYWOŁANIE, nie definicja: `async function cialoZSufitem` stoi na
  // górze pliku, więc porównywanie pozycji samej nazwy przepuszczało
  // mutację przenoszącą sufit pod parsowanie (złapane audytem).
  const pozycjaSufitu = kodTrasy.indexOf("await cialoZSufitem(");
  const pozycjaParsowania = kodTrasy.indexOf("JSON.parse");
  if (pozycjaSufitu < 0) {
    bledy.push(`${TRASA}: brak czytania ciała z sufitem (cialoZSufitem)`);
  } else if (pozycjaParsowania >= 0 && pozycjaSufitu > pozycjaParsowania) {
    bledy.push(
      `${TRASA}: sufit ciała sprawdzany PO parsowaniu JSON-a — parsowanie ` +
        "jest najdroższą częścią i to ono ma być chronione"
    );
  }
}

/* 9–10: dyspozytor */
const DYSPOZYTOR = "modules/m1-sklep/dyspozytor.ts";
const dyspozytor = czytaj(DYSPOZYTOR);
if (!dyspozytor) {
  bledy.push(`brak ${DYSPOZYTOR}`);
} else if (/szczegoly:\s*String\(/.test(kod(dyspozytor))) {
  bledy.push(
    `${DYSPOZYTOR}: surowy komunikat błędu w odpowiedzi — Postgres pisze ` +
      "w nim nazwy ograniczeń, tabel i kolumn, czyli rysunek schematu " +
      "bazy dla kogoś z zewnątrz. Szczegół idzie do logu serwera"
  );
}

/* testy limitów muszą istnieć */
const TESTY = "modules/m1-sklep/dyspozytor.test.ts";
const testy = czytaj(TESTY);
if (!testy || !/LIMIT_AKAPIT|SUFIT_CENY/.test(testy)) {
  bledy.push(
    `${TESTY}: brak testów limitów wejścia — granice bez testu są ` +
      "deklaracją; nikt nie zauważy, gdy przestaną obowiązywać"
  );
}

if (bledy.length > 0) {
  for (const b of bledy) console.error(`straznik-limitow: ${b}`);
  process.exit(1);
}

console.log(
  "straznik-limitow: pola wejścia mają sufity długości i liczności, " +
    "ciało żądania jest mierzone przed parsowaniem, błędy bazy nie wychodzą na zewnątrz."
);
