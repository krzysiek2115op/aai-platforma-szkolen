/**
 * Strażnik SEO: metadane nie mogą po cichu zniknąć ani rozjechać się
 * między sobą.
 *
 * PO CO. SEO psuje się bez żadnego objawu. Strona bez kanonika wygląda
 * identycznie jak strona z kanonikiem; metatag `noindex` sprzeczny
 * z `robots.txt` renderuje się tak samo dobrze; blok JSON-LD wstawiony
 * z pominięciem ucieczki znaków wygląda poprawnie do dnia, w którym
 * w treści pojawi się `</script>`. Wszystkie te usterki widać dopiero
 * w narzędziach Google, tygodnie później.
 *
 * CZEGO PILNUJE (sześć niezmienników):
 *   1. każdy publiczny widok deklaruje WŁASNY kanoniczny adres,
 *   2. dane strukturalne wstawia wyłącznie komponent JsonLd — bo tam
 *      i tylko tam żyje ucieczka znaku `<` (obrona przed zamknięciem
 *      bloku skryptu treścią kursu; nasze kursy uczą o kodzie),
 *   3. `process.env.SEO_INDEKSOWANIE` czyta jedno miejsce (lib/seo.ts) —
 *      metatag `robots`, `robots.txt` i sitemapa muszą pytać o zgodę
 *      TEN SAM przełącznik, inaczej kiedyś powiedzą co innego,
 *   4. robots.txt i sitemapa istnieją i obie o ten przełącznik pytają,
 *   5. każdy obraz OG deklaruje `contentType` i `size` — bez nich Next
 *      nie wypisze `og:image:type`/`width`/`height`,
 *   6. układ strony ustawia `metadataBase` (bez niego adresy względne
 *      w metadanych nie mają się do czego odnieść).
 *
 * Użycie: node tools/straznicy/straznik-seo.mjs
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const bledy = [];
const KATALOG_STRAZNIKOW = join("tools", "straznicy");

function pliki(katalog, wynik = []) {
  for (const nazwa of readdirSync(katalog)) {
    if (["node_modules", ".next", "out", ".git", "docs", "tresc-kursow"].includes(nazwa)) continue;
    const pelna = join(katalog, nazwa);
    if (statSync(pelna).isDirectory()) pliki(pelna, wynik);
    else if (/\.(tsx?|jsx?|mjs)$/.test(nazwa)) wynik.push(pelna);
  }
  return wynik;
}

const wszystkie = pliki(".").map((p) => relative(".", p));

// --- 1. każdy publiczny widok ma własny kanonik ---------------------
// Widok = plik `widok.tsx` pod app/ (nasza konwencja: treść trasy
// oddzielona od wariantów trybu). Kanonik mówi wyszukiwarce, który adres
// jest tym właściwym — bez niego dwa adresy tej samej treści konkurują
// ze sobą i żaden nie wygrywa.
const widoki = wszystkie.filter((p) => p.startsWith("app" + "/") && p.endsWith("widok.tsx"));
if (widoki.length === 0) {
  bledy.push("nie znalazłem ŻADNEGO pliku widok.tsx pod app/ — konwencja się zmieniła, popraw strażnika ŚWIADOMIE.");
}
for (const widok of widoki) {
  const tresc = readFileSync(widok, "utf8");
  if (!/alternates:\s*\{\s*canonical/.test(tresc)) {
    bledy.push(`${widok}: brak kanonicznego adresu (alternates.canonical) — dwa adresy tej samej treści konkurowałyby ze sobą.`);
  }
  if (!/openGraph:/.test(tresc)) {
    bledy.push(`${widok}: brak sekcji openGraph — link do tej strony poszedłby w świat jako goła ramka z adresem.`);
  }
}

// --- 2. JSON-LD wyłącznie przez komponent ---------------------------
const KOMPONENT_JSONLD = join("components", "seo", "JsonLd.tsx");
if (!existsSync(KOMPONENT_JSONLD)) {
  bledy.push(`${KOMPONENT_JSONLD}: brak komponentu danych strukturalnych — nie ma gdzie żyć ucieczce znaku "<".`);
} else if (!readFileSync(KOMPONENT_JSONLD, "utf8").includes("\\\\u003c")) {
  bledy.push(`${KOMPONENT_JSONLD}: komponent nie ucieka znaku "<" — treść zawierająca </script> zamknęłaby blok skryptu.`);
}
// Komentarze wycinamy — inaczej strażnik oskarża OPISY. Ta sama reguła,
// co w straznik-linkow (przykłady składni w blokach kodu to nie linki):
// kontrola, która karze za wyjaśnienie własnego mechanizmu, jest kontrolą,
// którą się w końcu wyłącza. Prawdziwy blok w kodzie nadal wywala strażnika
// — pilnują tego mutacja i kontrprzykład w audyt-straznikow.
const bezKomentarzy = (tresc) =>
  tresc.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

for (const plik of wszystkie) {
  if (plik === KOMPONENT_JSONLD || plik.startsWith(KATALOG_STRAZNIKOW)) continue;
  if (bezKomentarzy(readFileSync(plik, "utf8")).includes("application/ld+json")) {
    bledy.push(`${plik}: własny blok application/ld+json — dane strukturalne wstawia WYŁĄCZNIE components/seo/JsonLd.tsx (tam jest ucieczka znaków).`);
  }
}

// --- 3. jedno źródło prawdy o indeksowaniu --------------------------
const ZRODLO_SEO = join("lib", "seo.ts");
for (const plik of wszystkie) {
  if (plik === ZRODLO_SEO || plik.startsWith(KATALOG_STRAZNIKOW)) continue;
  if (readFileSync(plik, "utf8").includes("process.env.SEO_INDEKSOWANIE")) {
    bledy.push(`${plik}: czyta process.env.SEO_INDEKSOWANIE na własną rękę — metatag robots, robots.txt i sitemapa mają pytać JEDEN przełącznik (lib/seo.ts).`);
  }
}

// --- 4. robots.txt i sitemapa istnieją i pytają o zgodę --------------
for (const [plik, opis] of [
  [join("app", "robots.ts"), "robots.txt"],
  [join("app", "sitemap.ts"), "sitemapa"],
]) {
  if (!existsSync(plik)) {
    bledy.push(`${plik}: brak — ${opis} nie powstanie, a wyszukiwarka nie dostanie żadnej instrukcji.`);
    continue;
  }
  if (!readFileSync(plik, "utf8").includes("INDEKSOWANIE")) {
    bledy.push(`${plik}: nie pyta o przełącznik INDEKSOWANIE — mógłby wpuścić roboty na roboczą treść mimo noindex w metatagu.`);
  }
}

// --- 5. obrazy OG deklarują typ i rozmiar ----------------------------
for (const plik of wszystkie.filter((p) => p.endsWith("opengraph-image.tsx"))) {
  const tresc = readFileSync(plik, "utf8");
  for (const pole of ["contentType", "size"]) {
    if (!new RegExp(`export const ${pole}`).test(tresc)) {
      bledy.push(`${plik}: brak "export const ${pole}" — Next nie wypisze pełnych metadanych obrazu OG.`);
    }
  }
}

// --- 6. metadataBase w układzie strony -------------------------------
const uklad = join("app", "layout.tsx");
if (!readFileSync(uklad, "utf8").includes("metadataBase")) {
  bledy.push(`${uklad}: brak metadataBase — adresy względne w metadanych nie mają się do czego odnieść.`);
}

// --- 7. manifest i rastry ikony marki --------------------------------
/*
 * Manifest to jedyny plik metadanych, który mówi, czym ta witryna jest
 * JAKO APLIKACJA (nazwa skrótu, kolor paska, ikona instalacji). Psuje się
 * tak samo cicho jak reszta SEO: bez rastrów Android podstawia własne tło
 * i przycina znak, a przy podglądzie na Pages ścieżka bez `basePath`
 * wskazuje na 404 w korzeniu domeny.
 *
 * Reguły pytają o ROZSTRZYGNIĘCIE, nie o obecność słowa „manifest".
 */
const MANIFEST = join("app", "manifest.ts");
if (!existsSync(MANIFEST)) {
  bledy.push(
    `${MANIFEST}: brak manifestu — przeglądarka nie wie, pod jaką nazwą i z jaką ikoną zapisać skrót do witryny.`
  );
} else {
  const manifest = readFileSync(MANIFEST, "utf8");
  if (!/export const dynamic = "force-static"/.test(manifest)) {
    bledy.push(
      `${MANIFEST}: brak \`dynamic = "force-static"\` — \`output: "export"\` padnie na tej trasie (ta sama pułapka co w robots.ts i sitemap.ts).`
    );
  }
  // Ścieżki ikon MUSZĄ iść przez zasob(): Next aplikuje basePath do
  // znacznika <link rel=manifest>, ale NIE do treści manifestu.
  const surowe = [...manifest.matchAll(/src:\s*"(\/[^"]+)"/g)].map((m) => m[1]);
  if (surowe.length > 0) {
    bledy.push(
      `${MANIFEST}: ${surowe.length} ścieżek ikon wpisanych wprost (${surowe.join(", ")}) zamiast przez \`zasob()\`. Przy podglądzie spod podkatalogu Pages wskazywałyby na korzeń domeny, czyli na 404.`
    );
  }
  if (!/zasob\(/.test(manifest)) {
    bledy.push(`${MANIFEST}: manifest nie przepuszcza ani jednej ścieżki przez \`zasob()\`.`);
  }
}

/*
 * Rastry: pilnuje ich `tools/ikony-marki.mjs --sprawdz`, bo tylko on zna
 * skrót ŹRÓDŁA. Ikona zmieniona w SVG i niewyrenderowana wygląda w repo
 * identycznie jak zrobiona poprawnie.
 */
for (const raster of ["public/icon-192.png", "public/icon-512.png", "public/icon-maskable.png", "app/apple-icon.png"]) {
  if (!existsSync(raster)) {
    bledy.push(
      `${raster}: brak rastra ikony — manifest obiecuje plik, którego nie ma. Uruchom \`ZRZUTY_RIG=<rig> node tools/ikony-marki.mjs\`.`
    );
  }
}

if (bledy.length > 0) {
  console.error("straznik-seo:");
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}

console.log(`straznik-seo: ${widoki.length} widoków z kanonikiem i OG, dane strukturalne w jednym miejscu, robots i sitemapa spięte z przełącznikiem, manifest ze ścieżkami przez zasob() i cztery rastry ikony.`);
