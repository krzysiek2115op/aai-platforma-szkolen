/**
 * Strażnik frontu wtyczki (krok W3) — reguły, których złamanie NIE objawia
 * się błędem.
 *
 * PO CO OSOBNO OD SMOKE'ÓW. Smoke mierzy ŻYWĄ instalację i wymaga podmana,
 * więc nie chodzi w CI. Ten strażnik czyta KOD i chodzi wszędzie — łapie
 * rzeczy, które w dniu wprowadzenia jeszcze nie psują strony, a zepsują ją
 * po pierwszej regeneracji motywu, po dopisaniu rodzaju sekcji do kontraktu
 * albo po przeniesieniu jednego znacznika o dwie linijki wyżej.
 *
 * DZIEWIĘĆ NIEZMIENNIKÓW (każdy z własną mutacją w audyt-straznikow):
 *   1. każdy rodzaj sekcji z kontraktu ma szablon w `szablony/sekcje/`,
 *   2. …i każde POLE tego rodzaju jest gdzieś renderowane — pole bez
 *      renderu to treść wpisana kreatorem, której klient nie zobaczy,
 *   3. każdy rodzaj z kontraktu jest na liście `KOLEJNOSC`/`renderowane()`,
 *   4. wstrzyknięcie pozycji menu kotwiczy na TREŚCI (`aria-label`), nie na
 *      klasie Tailwinda — motyw jest generowany i klasy się zmienią,
 *   5. arkusz rezerwuje miejsce pod nagłówek `fixed` motywu (72 px),
 *   6. elementy `position: fixed` są emitowane POZA `<main>` (BLAD-003),
 *   7. istnieją obie reguły przekierowania z `/courses/*`,
 *   8. arkusz ma blok `prefers-reduced-motion` obejmujący każdą klasę,
 *      której nadaje animację,
 *   9. slug kursu nie może zająć adresu NASZEJ podstrony — kontrakt pyta
 *      o listę zarezerwowanych, a lista i reguły przepisywania biorą się
 *      z jednej stałej (BLAD-021: kurs w katalogu bez strony sprzedażowej).
 *
 * Użycie: node tools/straznicy/straznik-frontu-wp.mjs
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const WTYCZKA = "wordpress/wtyczki/aai-sklep";
const KONTRAKT = "modules/m1-sklep/typy.ts";
const bledy = [];

if (!existsSync(WTYCZKA)) {
  console.log("straznik-frontu-wp: pominięte — nie ma jeszcze wtyczki aai-sklep.");
  process.exit(0);
}

const czytaj = (sciezka) => readFileSync(join(WTYCZKA, sciezka), "utf8");

/** Kod bez komentarzy — reguły mają celować w ZACHOWANIE, nie w opis. */
const bezKomentarzy = (zrodlo) =>
  zrodlo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/** Wszystkie pliki szablonów — treść sklejona, bo pola bywają renderowane
 *  w innym pliku niż deklarowane (np. `w_cenie` pakietu w sekcji oferty). */
function szablony(katalog = "szablony") {
  const pelny = join(WTYCZKA, katalog);
  if (!existsSync(pelny)) return [];
  const wynik = [];
  for (const wpis of readdirSync(pelny)) {
    const wzgledny = join(katalog, wpis);
    if (statSync(join(WTYCZKA, wzgledny)).isDirectory()) wynik.push(...szablony(wzgledny));
    else if (wpis.endsWith(".php")) wynik.push(wzgledny);
  }
  return wynik;
}

const PLIKI_SZABLONOW = szablony();
const CALY_MARKUP = PLIKI_SZABLONOW.map(czytaj).join("\n");

/* ————————————————— kontrakt sekcji: rodzaje i ich pola ————————————————— */

/**
 * Rodzaje sekcji i ich pola prosto z kontraktu prototypu.
 *
 * Czytamy `typy.ts`, a nie własną listę: kontrakt jest wspólny dla obu światów
 * (prototyp renderuje nim stronę, wtyczka też), więc lista wpisana tutaj
 * zestarzałaby się przy pierwszym nowym polu — i nikt by tego nie zauważył,
 * bo strona dalej działa, tylko o jedno pole uboższa.
 */
function rodzajeZKontraktu() {
  if (!existsSync(KONTRAKT)) return null;
  const zrodlo = readFileSync(KONTRAKT, "utf8");

  const mapa = zrodlo.match(/export const SCHEMATY_SEKCJI = \{([\s\S]*?)\n\}/);
  if (!mapa) return null;

  const rodzaje = {};
  for (const [, rodzaj, nazwaSchematu] of mapa[1].matchAll(/^\s*(\w+):\s*(\w+),/gm)) {
    const schemat = zrodlo.match(
      new RegExp(`export const ${nazwaSchematu} = z\\.object\\(\\{([\\s\\S]*?)\\n\\}\\);`)
    );
    if (!schemat) continue;
    // Pola najwyższego poziomu ORAZ pola zagnieżdżone w listach obiektów —
    // klient nie widzi różnicy, więc strażnik też jej nie robi.
    rodzaje[rodzaj] = [...new Set([...schemat[1].matchAll(/(?:^|\{|,)\s*(\w+):\s*(?:krotki|akapit|lista|z\.)/gm)].map((t) => t[1]))];
  }
  return rodzaje;
}

const RODZAJE = rodzajeZKontraktu();

if (RODZAJE === null || Object.keys(RODZAJE).length === 0) {
  bledy.push(
    `${KONTRAKT}: nie udało się odczytać SCHEMATY_SEKCJI — strażnik nie ma z czym porównać szablonów. Zmiana kształtu kontraktu wymaga poprawienia tego strażnika, a nie wyłączenia go.`
  );
} else {
  /* 1. każdy rodzaj ma szablon */
  for (const rodzaj of Object.keys(RODZAJE)) {
    const plik = `szablony/sekcje/${rodzaj}.php`;
    if (!existsSync(join(WTYCZKA, plik))) {
      bledy.push(
        `${WTYCZKA}/${plik}: brak szablonu sekcji „${rodzaj}", choć rodzaj jest w kontrakcie. Kreator pozwoli wpisać tę treść, a strona sprzedażowa ją przemilczy.`
      );
    }
  }

  /* 2. każde pole kontraktu jest gdzieś renderowane */
  for (const [rodzaj, pola] of Object.entries(RODZAJE)) {
    /*
     * Pole liczy się jako renderowane, gdy jego NAZWA pada w szablonach —
     * czy to jako `$tresc['pole']`, czy jako klucz w tablicy, po której
     * szablon iteruje (tak robi sekcja „problem": problem → rozwiązanie →
     * rezultat to trzy kroki jednej pętli). Reguła celuje w ZACHOWANIE
     * („czy ktokolwiek o to pole pyta"), a nie w jeden sposób zapisu — to ta
     * sama lekcja co przy `straznik-limitera` w 0.28.0.
     */
    const brakujace = pola.filter(
      (pole) => !new RegExp(`['"\\[]${pole}['"\\]]`).test(CALY_MARKUP)
    );
    if (brakujace.length > 0) {
      bledy.push(
        `szablony: sekcja „${rodzaj}" ma w kontrakcie pola, których żaden szablon nie renderuje (${brakujace.join(", ")}). Treść wpisana kreatorem nie dojdzie do klienta, a nic się przy tym nie zapali.`
      );
    }
  }

  /* 3. każdy rodzaj jest na liście renderowanych */
  const klasaSekcji = czytaj("includes/class-aai-sklep-sekcje.php");
  const naLiscie = new Set(
    [...klasaSekcji.matchAll(/array\(\s*'(#?\w+)',\s*'[^']*'\s*\)/g)].map((t) => t[1])
  );
  // `hero` i `guarantee` renderują się poza listą kolejności — tak jak
  // w prototypie. Metoda `renderowane()` musi je wymieniać.
  for (const [, dodatkowe] of klasaSekcji.matchAll(/\$rodzaje = array\(([^)]*)\)/g)) {
    for (const [, nazwa] of dodatkowe.matchAll(/'(\w+)'/g)) naLiscie.add(nazwa);
  }
  const pominiete = Object.keys(RODZAJE).filter((r) => !naLiscie.has(r));
  if (pominiete.length > 0) {
    bledy.push(
      `includes/class-aai-sklep-sekcje.php: rodzaje sekcji spoza listy renderowanych (${pominiete.join(", ")}). Szablon istnieje, ale nikt go nie woła — i tak samo milczą dane strukturalne.`
    );
  }
}

/* ————————————————— 4. kotwice wstrzyknięcia menu ————————————————— */

const MENU = "includes/class-aai-sklep-menu.php";
if (!existsSync(join(WTYCZKA, MENU))) {
  bledy.push(`${WTYCZKA}/${MENU}: brak klasy wstrzykującej pozycję „Szkolenia" do menu motywu.`);
} else {
  const menu = czytaj(MENU);
  if (!/aria-label="/.test(menu)) {
    bledy.push(
      `${MENU}: wstrzyknięcie nie kotwiczy na atrybucie aria-label. Motyw Automatic AI jest GENEROWANY — jego klasy Tailwinda zmienią się przy pierwszej regeneracji, a pozycja „Szkolenia" zniknie po cichu. Etykieta dostępności zmienia się razem ze znaczeniem elementu, nie z wyglądem.`
    );
  }
  // Kod bez komentarzy: reguła ma celować w ZACHOWANIE, nie w opis.
  const kod = menu.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const klasyTailwinda = kod.match(/['"][^'"]*\b(?:lg:flex|text-steel|hover:text-fg|menu-item-in|flex-col)\b[^'"]*['"]/g);
  if (klasyTailwinda) {
    bledy.push(
      `${MENU}: kotwica oparta na klasie Tailwinda (${klasyTailwinda[0].slice(0, 50)}). Klasy motywu są generowane z cudzego builda — kotwica ma trzymać się treści (aria-label, href), a wygląd bierzemy z KLONU istniejącej pozycji.`
    );
  }
}

/* ————————————————— 5. odstęp pod nagłówek motywu ————————————————— */

const ARKUSZ = "assets/sklep.css";
if (!existsSync(join(WTYCZKA, ARKUSZ))) {
  bledy.push(`${WTYCZKA}/${ARKUSZ}: brak arkusza stron sklepu.`);
} else {
  const css = czytaj(ARKUSZ);

  const odstepy = [...css.matchAll(/--aai-odstep-naglowka:\s*([\d.]+)rem/g)].map((t) => Number(t[1]));
  if (odstepy.length < 2 || Math.min(...odstepy) < 7 || Math.max(...odstepy) < 9) {
    bledy.push(
      `${ARKUSZ}: brak rezerwy miejsca pod nagłówek motywu (--aai-odstep-naglowka ≥ 7rem, a od 768 px ≥ 9rem; znaleziono: ${odstepy.join(", ") || "nic"}). Nagłówek motywu ma position: fixed (72 px) i NIE rezerwuje pod siebie miejsca — jego własne strony robią to same (pt-28 / md:pt-36). Bez tego pierwsze zdanie oferty wjeżdża pod nawigację.`
    );
  }
  if (!/padding-top:\s*var\(\s*--aai-odstep-naglowka\s*\)/.test(css)) {
    bledy.push(
      `${ARKUSZ}: zmienna --aai-odstep-naglowka jest zadeklarowana, ale nic jej nie używa jako padding-top. Rezerwa, której nikt nie stosuje, nie jest rezerwą.`
    );
  }

  /* 8. każda klasa z animacją ma wygaszenie w prefers-reduced-motion */
  /*
   * Blok wygaszania czytamy DO ZAMYKAJĄCEJ KLAMRY, licząc zagnieżdżenia.
   * Pierwsza wersja brała „wszystko od @media do końca pliku", więc reguła
   * dopisana PO tym bloku sama siebie usprawiedliwiała — audyt mutacyjny
   * przepuścił klasę z animacją i bez wygaszenia. To ta sama klasa pomyłki
   * co wzorzec przypięty do nazwy metody zamiast do zachowania.
   */
  const spokoj = (() => {
    const start = css.indexOf("@media (prefers-reduced-motion: reduce)");
    if (start < 0) return "";
    let glebokosc = 0;
    for (let i = css.indexOf("{", start); i < css.length; i += 1) {
      if (css[i] === "{") glebokosc += 1;
      else if (css[i] === "}" && --glebokosc === 0) return css.slice(start, i + 1);
    }
    return css.slice(start);
  })();
  const animowane = new Set(
    [...css.matchAll(/\.(aai-[\w-]+)\s*\{[^}]*animation:/g)].map((t) => t[1])
  );
  const bezWygaszenia = [...animowane].filter((klasa) => !spokoj.includes(`.${klasa}`));
  if (bezWygaszenia.length > 0) {
    bledy.push(
      `${ARKUSZ}: klasy z animacją bez wygaszenia w @media (prefers-reduced-motion: reduce): ${bezWygaszenia.join(", ")}. Ruch, o którego wyłączenie ktoś poprosił systemowo, nie może wracać tylnymi drzwiami.`
    );
  }
}

/* ————————————————— 6. elementy `fixed` poza <main> ————————————————— */

const KURS = "szablony/kurs.php";
if (!existsSync(join(WTYCZKA, KURS))) {
  bledy.push(`${WTYCZKA}/${KURS}: brak szablonu strony kursu.`);
} else {
  /*
   * Komentarze OBCINAMY przed liczeniem pozycji. Pierwsza wersja tej reguły
   * znajdowała `<main` w bloku dokumentacyjnym na górze pliku (tam, gdzie
   * napisane jest, że te elementy mają stać POZA `<main>`) i oskarżała
   * poprawny szablon. Wzorzec w strażniku ma patrzeć na kod, nie na prozę.
   */
  const kurs = czytaj(KURS).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const main = kurs.indexOf("<main");
  for (const czesc of ["czesci/tlo.php", "czesci/pasek.php"]) {
    const poz = kurs.indexOf(czesc);
    if (poz < 0) {
      bledy.push(`${KURS}: nie woła ${czesc} — strona kursu bez żywego tła albo bez pigułki nawigacji.`);
    } else if (main >= 0 && poz > main) {
      bledy.push(
        `${KURS}: ${czesc} jest emitowane WEWNĄTRZ <main>. Ten element jest position: fixed, a motyw ma w swoim HTML klasę page-enter, której klatki animują transform z wypełnieniem both — przodek z transformacją odbiera potomkom „fixed" ekran jako układ odniesienia. To BLAD-003 i BLAD-004, tym razem przyniesione przez cudzy arkusz.`
      );
    }
  }
}

/* ————————————————— 7. przekierowania z /courses/* ————————————————— */

const TRASY = "includes/class-aai-sklep-trasy.php";
if (!existsSync(join(WTYCZKA, TRASY))) {
  bledy.push(`${WTYCZKA}/${TRASY}: brak klasy tras.`);
} else {
  const trasy = czytaj(TRASY).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  for (const [wzorzec, opis] of [
    [/is_post_type_archive\(\s*\$?\w+\s*\)/, "archiwum kursów Tutora (/courses/) → /szkolenia"],
    [/is_singular\(\s*\$?\w+\s*\)/, "strona kursu Tutora (/courses/<slug>/) → /szkolenia/<slug>"],
  ]) {
    if (!wzorzec.test(trasy)) {
      bledy.push(
        `${TRASY}: brak przekierowania: ${opis}. Decyzja właściciela z 2026-08-25: jeden adres kanoniczny i zero duplikatu w wyszukiwarce — klient nigdy nie ląduje na stronie w cudzym wyglądzie.`
      );
    }
  }
  if (!/wp_safe_redirect\([\s\S]{0,120}?,\s*301\s*\)/.test(trasy)) {
    bledy.push(
      `${TRASY}: przekierowania nie są trwałe (301). Tymczasowe (302) zostawia stary adres w indeksie wyszukiwarki, czyli nie robi tego, po co je dodaliśmy.`
    );
  }

  /*
   * WIDOK PRYWATNY MUSI ZAKAZAĆ CACHE'OWANIA WPROST.
   *
   * „Moje kursy" pokazują listę zależną od KONTA, więc odpowiedź odłożona na
   * półkę przez cache strony albo CDN bez reguły na ciasteczko logowania
   * trafiłaby do innego klienta.
   *
   * PILNUJE TEGO STRAŻNIK, A NIE SMOKE — i to jest wniosek z testu
   * negatywnego: po usunięciu `nocache_headers()` nagłówki i tak przychodzą,
   * bo dokłada je coś innego w stosie (sprawdzone na żywej stronie: identyczny
   * `Cache-Control` z naszym wywołaniem i bez niego). Smoke pilnuje więc
   * WŁASNOŚCI odpowiedzi, a tutaj pilnujemy NASZEJ gwarancji — bo cudza
   * uprzejmość może zniknąć z aktualizacją wtyczki i nikt się nie dowie.
   */
  /*
   * Wzorzec celuje w GAŁĄŹ, która zwraca szablon „moje", a nie w samo
   * sąsiedztwo słowa `'moje'`. Pierwsza wersja pytała o jedno i drugie
   * w promieniu 600 znaków i audyt pokazał, że PRZEPUSZCZA mutację: w tym
   * samym pliku jest drugie `nocache_headers()` (gałąź 404), więc wzorzec
   * trafiał w cudze wywołanie. Wzorce mają celować w ZACHOWANIE, nie
   * w bliskość napisów — nawrót lekcji z 0.29.0.
   */
  if (!/'moje'\s*===\s*\$widok\s*\)\s*\{[\s\S]{0,400}?nocache_headers\(\)[\s\S]{0,200}?szablony\/moje\.php/.test(trasy)) {
    bledy.push(
      `${TRASY}: widok „moje" nie woła nocache_headers(). To strona prywatna — jej treść zależy od konta oglądającego, więc odpowiedź nie ma prawa trafić do cache'u współdzielonego.`
    );
  }
}

/* ——— 9. slug kursu nie może zająć adresu NASZEJ podstrony ——— */

/*
 * BLAD-021. Adres kursu (`/szkolenia/<slug>/`) i adres naszej podstrony
 * (`/szkolenia/moje/`) mieszkają w jednej przestrzeni, a reguła podstrony
 * jest sprawdzana pierwsza. Kurs o slugu `moje` wchodził więc do katalogu,
 * miał kartę i cenę — ale jego strona sprzedażowa nie istniała: kliknięcie
 * karty prowadziło na „Moje kursy". Zmierzone na żywej instalacji, bez
 * jednego objawu po drodze (odpowiedź 200, dane poprawne, zero ostrzeżeń).
 *
 * Pilnujemy DWÓCH rzeczy naraz, bo każda z osobna daje się obejść:
 *  (a) kontrakt pyta o listę zarezerwowanych slugów — bez tego nie ma odmowy,
 *  (b) lista i reguły przepisywania biorą się z TEJ SAMEJ stałej — inaczej
 *      nowa podstrona dostanie regułę, ale nie trafi na listę zakazanych
 *      i klasa błędu wróci przy pierwszym rozbudowaniu sklepu.
 */
const PLIK_TRAS = "includes/class-aai-sklep-trasy.php";
const PLIK_KONTRAKTU_WP = "includes/class-aai-sklep-kontrakt.php";

if (existsSync(join(WTYCZKA, PLIK_TRAS)) && existsSync(join(WTYCZKA, PLIK_KONTRAKTU_WP))) {
  const trasy = bezKomentarzy(czytaj(PLIK_TRAS));
  const kontraktWp = bezKomentarzy(czytaj(PLIK_KONTRAKTU_WP));

  const walidatorSlugu = (kontraktWp.match(/function slug\([\s\S]*?\n\t\}/) ?? [""])[0];
  if (!walidatorSlugu.includes("zarezerwowane_slugi(")) {
    bledy.push(
      `${PLIK_KONTRAKTU_WP}: sprawdzanie slugu nie pyta o adresy zajęte przez nasze podstrony. Kurs o slugu naszej podstrony wejdzie do katalogu, ale jego strona sprzedażowa nie będzie istniała — klient kliknie kartę i trafi gdzie indziej, bez żadnego objawu (BLAD-021).`
    );
  }

  const zrodlaPodstron = ["zarezerwowane_slugi", "dodaj_reguly"].filter((nazwa) => {
    const cialo = (trasy.match(new RegExp(`function ${nazwa}\\([\\s\\S]*?\\n\\t\\}`)) ?? [""])[0];
    return cialo.includes("PODSTRONY");
  });
  if (zrodlaPodstron.length < 2) {
    bledy.push(
      `${PLIK_TRAS}: reguły przepisywania i lista zarezerwowanych slugów muszą brać się z TEJ SAMEJ stałej (\`PODSTRONY\`). Osobne listy rozjadą się przy pierwszej nowej podstronie: adres zadziała, a slug nie zostanie zakazany — czyli wróci BLAD-021. Z jednego źródła korzysta: ${zrodlaPodstron.join(", ") || "żadna z funkcji"}.`
    );
  }
}

if (bledy.length > 0) {
  console.error("straznik-frontu-wp:");
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}

console.log(
  `straznik-frontu-wp: front w porządku (${Object.keys(RODZAJE ?? {}).length} rodzajów sekcji z szablonami i polami, kotwice menu na treści, rezerwa pod nagłówek, fixed poza <main>, 301 z /courses/*, widok prywatny bez cache'u, wygaszanie ruchu, slug kursu nie zajmuje naszej podstrony).`
);
