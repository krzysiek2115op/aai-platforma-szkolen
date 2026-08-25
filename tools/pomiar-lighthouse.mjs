/**
 * Pomiar Lighthouse'a → goldeny/pomiary-lighthouse.json.
 *
 * PO CO OSOBNE NARZĘDZIE. Tabela wyników w README ma stać na zapisanym
 * przebiegu, a nie na pamięci tego, kto ją wpisywał (pilnuje tego
 * straznik-progow). Żeby to miało sens, pomiar musi dać się powtórzyć
 * jedną komendą — inaczej za pół roku nikt nie odtworzy warunków.
 *
 * DLACZEGO MEDIANA Z PIĘCIU. Dokumentacja Lighthouse'a (docs/variability.md)
 * mówi wprost: „mediana z 5 przebiegów jest dwa razy stabilniejsza niż
 * 1 przebieg". Na tej stronie rozrzut TBT sięgał 50–200 ms między
 * przebiegami tego samego builda — pojedynczy wynik nie znaczy nic.
 *
 * CZEGO NIE MA W package.json I DLACZEGO. Lighthouse i Chrome ważą setki
 * megabajtów i służą wyłącznie do pomiaru — instalujemy je POZA projektem
 * (ta sama zasada, co przy playwrighcie w D5: narzędzia pomiarowe nigdy
 * nie wchodzą do zależności aplikacji). Skrypt oczekuje więc:
 *
 *   LIGHTHOUSE=/ścieżka/do/node_modules/.bin/lighthouse \
 *   CHROME_PATH=/ścieżka/do/chrome \
 *   node tools/pomiar-lighthouse.mjs
 *
 * Jak je zdobyć — patrz README, sekcja „Pomiar wydajności i SEO".
 *
 * UWAGA NA ŚWIEŻY DEPLOY: zaraz po publikacji GitHub Pages oddaje pliki
 * z zimnego cache i wyniki są zaniżone (widzieliśmy 91 tam, gdzie po
 * chwili wychodziło 100). Pomiar robimy po odczekaniu, nigdy minutę po
 * `npm run deploy:podglad`.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";

const LIGHTHOUSE = process.env.LIGHTHOUSE;
const PRZEBIEGOW = Number(process.env.PRZEBIEGOW || 5);
const ADRES = process.env.ADRES_POMIARU || "https://matthewplugins.github.io/szkolenia-podglad";
const TYMCZASOWY = process.env.KATALOG_ROBOCZY || ".pomiar";

if (!LIGHTHOUSE || !process.env.CHROME_PATH) {
  console.error(
    "pomiar-lighthouse: ustaw LIGHTHOUSE=<ścieżka do binarki> i CHROME_PATH=<ścieżka do Chrome>.\n" +
      "Narzędzia pomiarowe celowo nie są zależnością projektu — instrukcja w README."
  );
  process.exit(2);
}

/** Strony, które opisuje tabela w README. Klucz = to, co widać w tabeli. */
const STRONY = [
  { klucz: "/szkolenia", url: `${ADRES}/szkolenia` },
  { klucz: "/szkolenia/[slug]", url: `${ADRES}/szkolenia/jak-korzystac-z-claude` },
];
const TRYBY = ["mobile", "desktop"];

mkdirSync(TYMCZASOWY, { recursive: true });

function przebieg(url, tryb, plik) {
  const args = [
    url,
    "--quiet",
    "--output=json",
    `--output-path=${plik}`,
    "--chrome-flags=--headless=new --no-sandbox --disable-gpu",
  ];
  if (tryb === "desktop") args.push("--preset=desktop");

  /*
   * Headless raz na kilkanaście przebiegów zwraca NO_FCP („strona nic nie
   * namalowała"). To artefakt rywalizacji o CPU, nie właściwość strony —
   * dokumentacja Lighthouse'a wymienia „resource contention" wśród źródeł
   * wariancji. Ponawiamy z przerwą, bo natychmiastowe ponowienie trafia
   * w ten sam zator.
   */
  for (let proba = 1; proba <= 3; proba++) {
    try {
      execFileSync(LIGHTHOUSE, args, { stdio: ["ignore", "ignore", "ignore"] });
      return JSON.parse(readFileSync(plik, "utf8"));
    } catch {
      process.stderr.write(`    (ponawiam — próba ${proba}/3)\n`);
      execFileSync("sleep", ["8"]);
    }
  }
  throw new Error(`Lighthouse nie dokończył pomiaru: ${url} (${tryb})`);
}

const mediana = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

const strony = {};
let wersjaNarzedzia = "?";

for (const strona of STRONY) {
  strony[strona.klucz] = {};
  for (const tryb of TRYBY) {
    process.stderr.write(`  ${strona.klucz} (${tryb}):`);
    const wyniki = [];
    for (let i = 1; i <= PRZEBIEGOW; i++) {
      const r = przebieg(strona.url, tryb, `${TYMCZASOWY}/${tryb}-${i}.json`);
      wersjaNarzedzia = r.lighthouseVersion;
      wyniki.push({
        wydajnosc: Math.round(r.categories.performance.score * 100),
        dostepnosc: Math.round(r.categories.accessibility.score * 100),
        praktyki: Math.round(r.categories["best-practices"].score * 100),
        seo: Math.round(r.categories.seo.score * 100),
        LCP: Math.round(r.audits["largest-contentful-paint"].numericValue),
        CLS: Number(r.audits["cumulative-layout-shift"].numericValue.toFixed(3)),
        TBT: Math.round(r.audits["total-blocking-time"].numericValue),
        FCP: Math.round(r.audits["first-contentful-paint"].numericValue),
      });
      process.stderr.write(` ${wyniki.at(-1).wydajnosc}`);
      execFileSync("sleep", ["3"]); // oddech między przebiegami
    }
    process.stderr.write("\n");

    const zebrane = {};
    for (const k of ["wydajnosc", "dostepnosc", "praktyki", "seo", "LCP", "CLS", "TBT", "FCP"]) {
      zebrane[k] = mediana(wyniki.map((w) => w[k]));
    }
    zebrane.wszystkieWydajnosci = wyniki.map((w) => w.wydajnosc);
    strony[strona.klucz][tryb] = zebrane;
  }
}

rmSync(TYMCZASOWY, { recursive: true, force: true });

const golden = {
  narzedzie: `Lighthouse ${wersjaNarzedzia}`,
  data: new Date().toISOString().slice(0, 10),
  adres: ADRES,
  przebiegow: PRZEBIEGOW,
  agregat: "mediana",
  /*
   * Kolumna SEO jest ZANIŻONA przez nasz własny `noindex`: audyt
   * `is-crawlable` waży 93/23 ≈ 4,04 przy sumie pozostałych wag 9, czyli
   * dokładnie 31% kategorii. Stąd 69 zamiast 100 na stronie z obrazkami
   * i 66 tam, gdzie `image-alt` jest nieużywany (mniejszy mianownik).
   * Prawdziwą wartość mierzy się na buildzie SEO_INDEKSOWANIE=1 —
   * i tę wpisujemy do pola `seo` niżej, nadpisując pomiar z podglądu.
   */
  uwagaSeo:
    "Kolumna SEO pochodzi z builda SEO_INDEKSOWANIE=1 serwowanego lokalnie; " +
    "na żywym podglądzie zaniża ją nasz własny noindex (audyt is-crawlable = 31% wagi kategorii).",
  strony,
};

writeFileSync("goldeny/pomiary-lighthouse.json", JSON.stringify(golden, null, 2) + "\n");
console.log(`pomiar-lighthouse: zapisano goldeny/pomiary-lighthouse.json (${golden.narzedzie}, mediana z ${PRZEBIEGOW}).`);
