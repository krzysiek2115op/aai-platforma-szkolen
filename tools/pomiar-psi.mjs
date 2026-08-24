/**
 * Pomiar przez PageSpeed Insights → goldeny/pomiary-lighthouse.json.
 *
 * PO CO, SKORO JEST tools/pomiar-lighthouse.mjs. Bo lokalny Lighthouse
 * mierzy także maszynę, na której chodzi. Ta sama strona, ten sam build,
 * trzy serie po pięć przebiegów dały TBT 96, 102 i 257 ms — różnicę robiło
 * chwilowe obciążenie laptopa (raz był to zawieszony `pavucontrol`
 * zajmujący cały rdzeń). Symulacja Lighthouse'a skaluje zaobserwowane
 * czasy pracy procesora, więc zajęty komputer zaniża wynik strony.
 *
 * PageSpeed Insights uruchamia Lighthouse'a NA SERWERACH GOOGLE. Wynik nie
 * zależy od tego, co akurat robi nasz komputer — i to jest „narzędzie
 * Google", o które prosił właściciel. Lokalny pomiar zostaje jako
 * narzędzie diagnostyczne (szybka pętla przy optymalizacji, praca bez
 * sieci); do tabeli w README wchodzą liczby stąd.
 *
 * KLUCZ API. Bez klucza API ma limit dzienny dzielony ze wszystkimi
 * anonimowymi użytkownikami świata — wyczerpany, zanim zdążyliśmy zmierzyć
 * cokolwiek. Klucz jest darmowy (Google Cloud → „PageSpeed Insights API"
 * → Credentials) i NIE WCHODZI DO REPO: podajemy go zmienną środowiskową.
 *
 *   PAGESPEED_KLUCZ=… node tools/pomiar-psi.mjs
 *
 * CZEGO TO NARZĘDZIE NIE ZMIERZY. Kolumny SEO — bo mierzy żywy podgląd,
 * a ten chodzi z `noindex`, który zaniża kategorię SEO o dokładnie 31%
 * (audyt `is-crawlable` waży 93/23 przy sumie pozostałych 9). SEO mierzy
 * się na buildzie `SEO_INDEKSOWANIE=1` serwowanym lokalnie i wynik podaje
 * ręcznie przez SEO_KATALOG / SEO_KURS. Sieć nie ma tam znaczenia:
 * audyty SEO patrzą na znaczniki, nie na czasy.
 */
import { writeFileSync } from "node:fs";

const KLUCZ = process.env.PAGESPEED_KLUCZ;
const ADRES = process.env.ADRES_POMIARU || "https://matthewplugins.github.io/szkolenia-podglad";
const PRZEBIEGOW = Number(process.env.PRZEBIEGOW || 5);

/*
 * Oceny SEO zmierzone osobno, na buildzie bez `noindex`. Wpisywane
 * ręcznie, bo pochodzą z innego builda niż reszta tabeli — i właśnie
 * dlatego golden notuje to jawnie w polu `uwagaSeo`.
 */
const SEO_KATALOG = Number(process.env.SEO_KATALOG ?? 100);
const SEO_KURS = Number(process.env.SEO_KURS ?? 100);

if (!KLUCZ) {
  console.error(
    "pomiar-psi: brak PAGESPEED_KLUCZ.\n" +
      "Klucz jest darmowy (console.cloud.google.com → włącz „PageSpeed Insights API” → Credentials → API key)\n" +
      "i nie wchodzi do repo — podaj go zmienną środowiskową:\n" +
      "  PAGESPEED_KLUCZ=… node tools/pomiar-psi.mjs"
  );
  process.exit(2);
}

const STRONY = [
  { klucz: "/szkolenia", url: `${ADRES}/szkolenia`, seo: SEO_KATALOG },
  { klucz: "/szkolenia/[slug]", url: `${ADRES}/szkolenia/jak-korzystac-z-claude`, seo: SEO_KURS },
];
const TRYBY = ["mobile", "desktop"];

const mediana = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

async function zmierz(url, strategia) {
  const zapytanie = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  zapytanie.searchParams.set("url", url);
  zapytanie.searchParams.set("strategy", strategia);
  zapytanie.searchParams.set("key", KLUCZ);
  for (const k of ["performance", "accessibility", "best-practices", "seo"]) {
    zapytanie.searchParams.append("category", k);
  }

  // PSI potrafi zwrócić 500 przy przejściowym błędzie po swojej stronie.
  for (let proba = 1; proba <= 3; proba++) {
    const odp = await fetch(zapytanie);
    if (odp.ok) return odp.json();
    const tresc = await odp.text();
    if (proba === 3) throw new Error(`PSI ${odp.status}: ${tresc.slice(0, 300)}`);
    process.stderr.write(`    (PSI ${odp.status}, ponawiam ${proba}/3)\n`);
    await new Promise((r) => setTimeout(r, 5000));
  }
}

const strony = {};
let wersjaNarzedzia = "?";

for (const strona of STRONY) {
  strony[strona.klucz] = {};
  for (const tryb of TRYBY) {
    process.stderr.write(`  ${strona.klucz} (${tryb}):`);
    const wyniki = [];
    for (let i = 1; i <= PRZEBIEGOW; i++) {
      const d = await zmierz(strona.url, tryb);
      const lr = d.lighthouseResult;
      wersjaNarzedzia = lr.lighthouseVersion;
      const a = lr.audits;
      wyniki.push({
        wydajnosc: Math.round(lr.categories.performance.score * 100),
        dostepnosc: Math.round(lr.categories.accessibility.score * 100),
        praktyki: Math.round(lr.categories["best-practices"].score * 100),
        seo: strona.seo,
        LCP: Math.round(a["largest-contentful-paint"].numericValue),
        CLS: Number(a["cumulative-layout-shift"].numericValue.toFixed(3)),
        TBT: Math.round(a["total-blocking-time"].numericValue),
        FCP: Math.round(a["first-contentful-paint"].numericValue),
      });
      process.stderr.write(` ${wyniki.at(-1).wydajnosc}`);
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

const golden = {
  narzedzie: `PageSpeed Insights (Lighthouse ${wersjaNarzedzia})`,
  data: new Date().toISOString().slice(0, 10),
  adres: ADRES,
  przebiegow: PRZEBIEGOW,
  agregat: "mediana",
  uwagaSeo:
    "Kolumna SEO pochodzi z builda SEO_INDEKSOWANIE=1 serwowanego lokalnie; " +
    "na żywym podglądzie zaniża ją nasz własny noindex (audyt is-crawlable = 31% wagi kategorii).",
  uwagaPomiaru:
    "Pomiar wykonany na serwerach Google (PageSpeed Insights), nie na maszynie roboczej — " +
    "lokalny Lighthouse mierzy także obciążenie komputera (ta sama strona dawała TBT 96–257 ms).",
  strony,
};

writeFileSync("goldeny/pomiary-lighthouse.json", JSON.stringify(golden, null, 2) + "\n");
console.log(`pomiar-psi: zapisano goldeny/pomiary-lighthouse.json (${golden.narzedzie}, mediana z ${PRZEBIEGOW}).`);
