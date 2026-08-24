/**
 * Strażnik podglądu kursów: wygenerowany widok treści kursu trzyma się kupy.
 *
 * PO CO. `tools/podglad-kursow.mjs` składa to, co klient dostaje PO zakupie:
 * 76 stron HTML z 73 lekcji prozy i 148 zrzutów. Generator nie ma jak zgłosić
 * usterki, którą sam wyprodukował — a redesign 0.34.0 znalazł trzy takie,
 * żyjące w repo od dawna i niewidoczne dla wszystkich pozostałych kontroli:
 * strona wejściowa nigdy nie ładowała Geista (`../zasoby/` z korzenia celowało
 * POZA katalog wyjściowy), 7 zrzutów nie wyświetlało się wcale (dwa obrazy
 * w sąsiednich wierszach Markdowna to jeden akapit, a dopasowanie brało tylko
 * obraz sam w akapicie), 29 podpisów pokazywało dosłowne `&quot;` (podwójna
 * ucieczka znaków). Wszystkie trzy to ta sama klasa: HTML powstaje poprawnie
 * SKŁADNIOWO, więc build jest zielony, a produkt jest zepsuty.
 *
 * Kontrole tamtej tury żyły w katalogu roboczym sesji i przepadły razem z nim.
 * Ten plik jest ich trwałą wersją (decyzja właściciela 2026-08-24).
 *
 * CO SPRAWDZA — na WYGENEROWANYM artefakcie, nie na kodzie generatora:
 *   1. Martwe odsyłacze — każdy `href`/`src` wskazujący plik lokalny
 *      istnieje na dysku (klasa: strona wejściowa bez fontu).
 *   2. Każdy `<img>` ma `width` i `height` — bez nich 148 zrzutów przesuwa
 *      treść przy ładowaniu (CLS), a to samo repo mierzy CLS = 0 w README.
 *   3. Podpis i `alt` bez PODWÓJNEJ ucieczki (`&amp;quot;` — czytelnik widzi
 *      wtedy dosłowne „&quot;"). Sama `&quot;` jest poprawnym HTML-em
 *      i nie jest usterką — mylenie obu poziomów daje 33 fałszywe alarmy.
 *   4. Klikalność: każda lekcja kursu ma odsyłacz ze spisu kursu, a każda
 *      strona lekcji wraca do spisu (nikt nie zostaje w ślepym zaułku).
 *   5. Komplet: stron lekcji tyle, ile plików prozy; zrzutów w `zasoby/`
 *      tyle, ile wpięć w prozie — cicha utrata pliku jest widoczna.
 *
 * DLACZEGO NIE GENERUJE SAM. Generator wymaga `marked` z riga poza repo
 * (ZRZUTY_RIG) — jak `test-asercji.mjs`. Bez podglądu strażnik NIE pada:
 * mówi, że tę część pominął, dokładnie jak straznik-scenariuszy przy braku
 * dokumentacji D7 w CI. Wskazanie katalogu: PODGLAD_KURSOW=<katalog>,
 * inaczej sprawdzane są miejsca domyślne.
 *
 * Użycie:
 *   ZRZUTY_RIG=/tmp/rig node tools/podglad-kursow.mjs --wyjscie /tmp/podglad-kursow
 *   PODGLAD_KURSOW=/tmp/podglad-kursow node tools/straznicy/straznik-podgladu-kursow.mjs
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";

const KANDYDACI = [
  process.env.PODGLAD_KURSOW,
  "/tmp/podglad-kursow",
  join(process.env.TMPDIR ?? "/tmp", "podglad-kursow"),
].filter(Boolean);

const katalog = KANDYDACI.find((k) => existsSync(join(k, "index.html")));
if (!katalog) {
  console.log(
    "straznik-podgladu-kursow: pominięte — nie znalazłem wygenerowanego podglądu.\n" +
      "  Zbuduj go: ZRZUTY_RIG=<rig> node tools/podglad-kursow.mjs --wyjscie <katalog poza repo>\n" +
      "  i wskaż: PODGLAD_KURSOW=<katalog>. (Generator wymaga `marked` z riga — jak test-asercji.)",
  );
  process.exit(0);
}

const bledy = [];

/** Wszystkie pliki .html w drzewie podglądu. */
function strony(kat) {
  const wynik = [];
  for (const wpis of readdirSync(kat)) {
    const pelna = join(kat, wpis);
    if (statSync(pelna).isDirectory()) wynik.push(...strony(pelna));
    else if (wpis.endsWith(".html")) wynik.push(pelna);
  }
  return wynik;
}

const pliki = strony(katalog);
if (pliki.length === 0) bledy.push("podgląd nie ma ani jednej strony HTML.");

// ---- 1-3. odsyłacze, wymiary obrazów, podwójna ucieczka ----
let obrazow = 0;
for (const plik of pliki) {
  const html = readFileSync(plik, "utf8");
  const gdzie = plik.slice(katalog.length + 1);

  // 1. cele lokalne muszą istnieć (pomijamy kotwice, adresy zewnętrzne i data:)
  for (const [, atrybut, cel] of html.matchAll(/(href|src)="([^"]+)"/g)) {
    if (/^(#|https?:|mailto:|data:|\/\/)/.test(cel)) continue;
    const sciezka = resolve(dirname(plik), cel.split("#")[0].split("?")[0]);
    if (!existsSync(sciezka)) {
      bledy.push(`${gdzie}: martwy odsyłacz ${atrybut}="${cel}" — pliku nie ma na dysku.`);
    }
  }

  // 2. każdy obraz z wymiarami (CLS)
  for (const [, znacznik] of html.matchAll(/<img\s([^>]*)>/g)) {
    obrazow += 1;
    if (!/\bwidth="\d+"/.test(znacznik) || !/\bheight="\d+"/.test(znacznik)) {
      const src = znacznik.match(/src="([^"]+)"/)?.[1] ?? "(bez src)";
      bledy.push(`${gdzie}: <img src="${src}"> bez width/height — obraz przesunie treść przy ładowaniu.`);
    }
  }

  // 3. PODWÓJNA ucieczka — `&amp;quot;` renderuje się czytelnikowi jako
  // dosłowny tekst „&quot;". Sama `&quot;` jest POPRAWNA (to zwykły znak
  // cudzysłowu w HTML) i strażnik nie ma prawa jej tykać: pierwsza wersja
  // tej kontroli oskarżyła o usterkę 33 poprawne podpisy, bo myliła oba
  // poziomy. Klasa naprawiona w 0.34.0 — tu pilnujemy nawrotu.
  for (const [, tekst] of html.matchAll(/<figcaption>([\s\S]*?)<\/figcaption>/g)) {
    const encja = tekst.match(/&amp;(quot|amp|lt|gt|#\d+);/);
    if (encja) bledy.push(`${gdzie}: podpis zrzutu pokazuje dosłowne „&${encja[1]};" — ucieczka zrobiona dwa razy.`);
  }
  for (const [, alt] of html.matchAll(/\salt="([^"]*)"/g)) {
    const encja = alt.match(/&amp;(quot|amp|lt|gt|#\d+);/);
    if (encja) bledy.push(`${gdzie}: alt obrazu niesie „&${encja[1]};" — ucieczka zrobiona dwa razy.`);
  }
}

// ---- 4. klikalność: spis → lekcja → spis ----
for (const spis of pliki.filter((p) => p.endsWith("index.html") && p !== join(katalog, "index.html"))) {
  const kursKat = dirname(spis);
  const html = readFileSync(spis, "utf8");
  const wskazane = new Set(
    [...html.matchAll(/href="([^"]+\.html)"/g)].map(([, c]) => c.split("#")[0]),
  );
  for (const lekcja of readdirSync(kursKat).filter((n) => /^m\d+-l\d+\.html$/.test(n))) {
    if (!wskazane.has(lekcja)) {
      bledy.push(`${kursKat.slice(katalog.length + 1)}/index.html: lekcja ${lekcja} istnieje, ale nic do niej nie prowadzi.`);
    }
    const trescLekcji = readFileSync(join(kursKat, lekcja), "utf8");
    if (!/href="index\.html"/.test(trescLekcji)) {
      bledy.push(`${kursKat.slice(katalog.length + 1)}/${lekcja}: brak powrotu do spisu kursu — ślepy zaułek.`);
    }
  }
}

// ---- 5. komplet stron i zrzutów wobec ŹRÓDŁA (tresc-kursow/) ----
function policz(kat, wzorzec) {
  let n = 0;
  for (const wpis of readdirSync(kat)) {
    const pelna = join(kat, wpis);
    if (statSync(pelna).isDirectory()) n += policz(pelna, wzorzec);
    else if (wzorzec.test(wpis)) n += 1;
  }
  return n;
}
if (existsSync("tresc-kursow")) {
  const prozy = policz("tresc-kursow", /^proza-.*\.md$/);
  const stronLekcji = pliki.filter((p) => /m\d+-l\d+\.html$/.test(p)).length;
  if (prozy !== stronLekcji) {
    bledy.push(`podgląd ma ${stronLekcji} stron lekcji, a plików prozy jest ${prozy} — któraś lekcja nie weszła.`);
  }
  const zrzutowZrodlo = policz("tresc-kursow", /\.webp$/);
  if (obrazow > 0 && zrzutowZrodlo > 0) {
    const zasoby = join(katalog, "zasoby");
    const zrzutowWyjscie = existsSync(zasoby)
      ? readdirSync(zasoby).filter((n) => n.endsWith(".webp")).length
      : 0;
    if (zrzutowWyjscie !== zrzutowZrodlo) {
      bledy.push(
        `podgląd niesie ${zrzutowWyjscie} zrzutów, a w tresc-kursow/ jest ${zrzutowZrodlo} — cicha utrata pliku.`,
      );
    }
  }
}

if (bledy.length > 0) {
  console.error("straznik-podgladu-kursow:");
  for (const b of bledy.slice(0, 40)) console.error(`  - ${b}`);
  if (bledy.length > 40) console.error(`  … i ${bledy.length - 40} więcej.`);
  const n = bledy.length;
  const r10 = n % 10, r100 = n % 100;
  const forma = n === 1 ? "usterka" : r10 >= 2 && r10 <= 4 && (r100 < 12 || r100 > 14) ? "usterki" : "usterek";
  console.error(`\n  ${n} ${forma} — to jest widok, za który klient zapłacił.`);
  process.exit(1);
}
console.log(
  `straznik-podgladu-kursow: ${pliki.length} stron bez martwych odsyłaczy, ${obrazow} obrazów z wymiarami, podpisy czyste, każda lekcja klikalna w obie strony.`,
);
