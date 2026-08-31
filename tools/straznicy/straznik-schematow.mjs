/**
 * Strażnik schematów draw.io — pilnuje, żeby rysunek nie rozjechał się
 * z kodem PO CICHU.
 *
 * PO CO. Właściciel zauważył to sam, zamawiając schematy: „.drawio to XML,
 * więc da się go trzymać w gicie — ale żaden strażnik nie pilnuje zgodności
 * rysunku z kodem". To jest dokładnie klasa błędu, którą ten projekt zna
 * z nazwiska: dokumentacja starzeje się CICHO. Nic się nie zapala, plik
 * dalej się otwiera, tylko opisuje architekturę sprzed trzech wersji —
 * a im dłużej wygląda na aktualny, tym bardziej się mu ufa. Ta sama klasa
 * co siedem nieprawdziwych deklaracji stanu znalezionych przy higienie repo
 * (0.62.0) i co tabela „Moduły" wskazująca gałęzie, które nie istnieją.
 *
 * CZEGO TEN STRAŻNIK NIE UMIE — i trzeba to wiedzieć, żeby mu nie ufać
 * ponad miarę. NIE sprawdza, czy strzałka wskazuje właściwą stronę, czy
 * opis w pudełku mówi prawdę, ani czy układ jest czytelny. Sprawdza
 * SŁOWNIK: że każda nazwa użyta na schemacie istnieje w kodzie i że żadna
 * klasa z kodu nie wypadła ze schematu. To łapie starzenie się przez
 * zmianę nazwy, usunięcie klasy i dołożenie nowej — czyli trzy sposoby,
 * na jakie ta dokumentacja naprawdę się zestarzeje.
 *
 * PIĘĆ NIEZMIENNIKÓW (każdy z własną mutacją w audyt-straznikow):
 *   1. każdy schemat z listy `SCHEMATY` istnieje i jest poprawnym XML-em
 *      — plik, którego draw.io nie otworzy, jest gorszy niż jego brak;
 *   2. każdy podgląd SVG istnieje (GitHub nie renderuje `.drawio`, więc
 *      bez podglądu schemat jest w repo niewidoczny);
 *   3. podgląd jest AKTUALNY — skrót źródła zgadza się z manifestem
 *      spisanym przy eksporcie (dat plików użyć się nie da: git ich nie
 *      przechowuje, więc po klonie wszystkie są identyczne);
 *   4. każda nazwa klasy `Aai_*` użyta na schemacie ISTNIEJE w kodzie;
 *   5. każda klasa wtyczek jest wymieniona na co najmniej jednym
 *      schemacie — to jest reguła łapiąca NOWY kod, o którym schemat
 *      milczy, czyli najczęstszy sposób starzenia się dokumentacji.
 *
 * Użycie: node tools/straznicy/straznik-schematow.mjs
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const WTYCZKI = "wordpress/wtyczki";
const MANIFEST = "docs/schematy/ZRODLA.json";

/**
 * Lista schematów — MUSI zgadzać się z `tools/schematy.mjs`.
 *
 * Czytamy ją stamtąd, zamiast przepisywać: dwie kopie tej samej listy
 * rozjechałyby się przy pierwszym nowym schemacie, a rozjazd byłby niemy
 * (nowy plik po prostu nie byłby sprawdzany). Ta sama zasada, która
 * w `straznik-wagi-dokumentacji` każe czytać manifest ze skryptu
 * pobierającego, zamiast trzymać własną listę nazw.
 */
const { SCHEMATY } = await import("../schematy.mjs");

const bledy = [];

/* ─── 1. Każdy schemat istnieje i jest poprawnym XML-em ─── */

/**
 * Bardzo prosty test poprawności XML: liczymy znaczniki otwierające
 * i zamykające `mxCell` oraz sprawdzamy, że wartości atrybutów nie niosą
 * surowego `<`.
 *
 * DLACZEGO NIE PARSER Z NPM. Bo nie dokładamy zależności do projektu, który
 * ich nie ma (ta sama decyzja co przy `Aai_Sklep_Proza`). A pułapka, przed
 * którą ten test broni, jest KONKRETNA i zmierzona: łamanie linii w etykiecie
 * musi jechać jako `&lt;br&gt;`, bo surowy `<br>` w wartości atrybutu to
 * niepoprawny XML — draw.io taki plik odrzuca przy otwarciu.
 */
function xmlWygladaPoprawnie(tresc) {
  const otwarte = (tresc.match(/<mxCell\b/g) ?? []).length;
  if (0 === otwarte) return "nie ma ani jednego <mxCell> — plik jest pusty";
  for (const dopasowanie of tresc.matchAll(/value="([^"]*)"/g)) {
    const wartosc = dopasowanie[1];

    // Surowy `<` wewnątrz wartości atrybutu — niepoprawny XML.
    if (wartosc.includes("<")) {
      return `surowy „<” w wartości atrybutu (użyj &lt;br&gt;): ${wartosc.slice(0, 60)}…`;
    }

    /*
     * CICHA UTRATA TEKSTU. Etykieta jest renderowana jako HTML, więc po
     * odszyfrowaniu XML-a `<kurs>` staje się dla przeglądarki NIEZNANYM
     * ZNACZNIKIEM i znika bez śladu — zmierzone renderem: „/szkolenia/<kurs>”
     * wychodziło jako „/szkolenia/”. Nic się przy tym nie zapala: plik jest
     * poprawnym XML-em, eksport kończy się kodem 0, a na obrazku po prostu
     * brakuje kawałka napisu.
     *
     * Jedyne uprawnione pojedyncze uciekłe `<` to nasze łamanie linii.
     * Wszystko inne ma być uciekłe DWA razy (`&amp;lt;`).
     */
    const podejrzane = wartosc.replaceAll("&lt;br&gt;", "");
    if (podejrzane.includes("&lt;")) {
      const gdzie = podejrzane.slice(Math.max(0, podejrzane.indexOf("&lt;") - 25), podejrzane.indexOf("&lt;") + 35);
      return (
        `etykieta niesie znacznik HTML, który zniknie przy renderze ` +
        `(użyj &amp;lt;): …${gdzie}…`
      );
    }
  }
  if (!tresc.includes("<mxfile") || !tresc.includes("</mxfile>")) {
    return "brak ramy <mxfile>…</mxfile>";
  }
  return null;
}

for (const schemat of SCHEMATY) {
  if (!existsSync(schemat.zrodlo)) {
    bledy.push(`Brak schematu: ${schemat.zrodlo}`);
    continue;
  }
  const problem = xmlWygladaPoprawnie(readFileSync(schemat.zrodlo, "utf8"));
  if (null !== problem) {
    bledy.push(`${schemat.zrodlo}: ${problem}`);
  }

  /* ─── 2. Każdy podgląd SVG istnieje ─── */
  for (const strona of schemat.strony) {
    if (!existsSync(strona.plik)) {
      bledy.push(
        `Brak podglądu ${strona.plik} — GitHub nie renderuje .drawio, ` +
          `więc bez SVG schemat jest w repo niewidoczny. Uruchom: npm run schematy`
      );
    }
  }
}

/* ─── 3. Podgląd jest AKTUALNY wobec źródła ─── */

if (!existsSync(MANIFEST)) {
  bledy.push(`Brak ${MANIFEST} — uruchom: npm run schematy`);
} else {
  const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
  for (const schemat of SCHEMATY) {
    if (!existsSync(schemat.zrodlo)) continue;
    const teraz = createHash("sha256")
      .update(readFileSync(schemat.zrodlo))
      .digest("hex");
    const zapisany = manifest[schemat.zrodlo];
    if (undefined === zapisany) {
      bledy.push(`${schemat.zrodlo} nie ma wpisu w ${MANIFEST} — uruchom: npm run schematy`);
    } else if (zapisany !== teraz) {
      bledy.push(
        `${schemat.zrodlo} zmienił się po ostatnim eksporcie — podgląd SVG ` +
          `pokazuje STARĄ wersję. Uruchom: npm run schematy`
      );
    }
  }
}

/* ─── 4 i 5. Słownik: nazwy na schemacie ↔ klasy w kodzie ─── */

/** Wszystkie klasy zadeklarowane w trzech wtyczkach. */
function klasyWKodzie() {
  const klasy = new Set();
  for (const wtyczka of readdirSync(WTYCZKI)) {
    const katalog = join(WTYCZKI, wtyczka, "includes");
    if (!existsSync(katalog)) continue;
    for (const plik of readdirSync(katalog)) {
      if (!plik.endsWith(".php")) continue;
      const tresc = readFileSync(join(katalog, plik), "utf8");
      for (const m of tresc.matchAll(/^\s*(?:final\s+|abstract\s+)?class\s+(Aai_[A-Za-z_]+)/gm)) {
        klasy.add(m[1]);
      }
    }
  }
  return klasy;
}

/** Nazwy klas wymienione na schematach. */
function klasyNaSchematach() {
  const nazwy = new Map(); // nazwa → pliki, w których wystąpiła
  for (const schemat of SCHEMATY) {
    if (!existsSync(schemat.zrodlo)) continue;
    const tresc = readFileSync(schemat.zrodlo, "utf8");
    for (const m of tresc.matchAll(/\bAai_[A-Za-z_]+\b/g)) {
      if (!nazwy.has(m[0])) nazwy.set(m[0], new Set());
      nazwy.get(m[0]).add(schemat.zrodlo);
    }
  }
  return nazwy;
}

const wKodzie = klasyWKodzie();
const naSchematach = klasyNaSchematach();

if (0 === wKodzie.size) {
  // SAMOKONTROLA ZAKRESU. Gdyby katalog wtyczek zniknął albo zmienił układ,
  // obie reguły niżej przechodziłyby PO PUSTCE i strażnik świeciłby na
  // zielono, nie sprawdzając niczego. Ta sama klasa ślepoty, która przy
  // T3 kazała dopisać asercję „zakres trafił w ≥1 element".
  bledy.push(
    `Nie znaleziono ANI JEDNEJ klasy w ${WTYCZKI} — reguły 4 i 5 nie mają czego sprawdzać.`
  );
}
if (0 === naSchematach.size) {
  bledy.push("Na schematach nie ma ANI JEDNEJ nazwy klasy — reguły 4 i 5 przeszłyby po pustce.");
}

// 4. Nazwa na schemacie, której nie ma w kodzie (literówka albo zmiana nazwy).
for (const [nazwa, pliki] of naSchematach) {
  if (!wKodzie.has(nazwa)) {
    bledy.push(
      `Schemat wymienia klasę „${nazwa}”, której NIE MA w kodzie ` +
        `(${[...pliki].join(", ")}). Zmieniono nazwę czy usunięto klasę?`
    );
  }
}

// 5. Klasa w kodzie, o której schemat milczy (nowy kod bez diagramu).
const brakujace = [...wKodzie].filter((k) => !naSchematach.has(k)).sort();
if (brakujace.length > 0) {
  bledy.push(
    `Te klasy istnieją w kodzie, ale nie ma ich na ŻADNYM schemacie:\n` +
      brakujace.map((k) => `    · ${k}`).join("\n") +
      `\n  Dopisz je do właściwego schematu (docs/plugin-N/schematy.drawio),` +
      `\n  a potem uruchom: npm run schematy`
  );
}

/* ─── wynik ─── */

if (bledy.length > 0) {
  console.error("straznik-schematow: ZNALEZIONO PROBLEMY\n");
  for (const blad of bledy) console.error(`  ✖ ${blad}`);
  console.error(
    `\n  ${bledy.length} ${1 === bledy.length ? "problem" : "problemów"}.`
  );
  process.exit(1);
}

console.log(
  `straznik-schematow: OK — ${SCHEMATY.length} schematów, ` +
    `${wKodzie.size} klas w kodzie, wszystkie na diagramach.`
);
