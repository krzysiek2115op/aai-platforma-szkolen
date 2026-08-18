/**
 * Strażnik scenariuszy: każdy scenariusz lekcji ma komplet metryki,
 * komplet sekcji i tabelę „Zgodność ze źródłem" — mechanicznie, nie na oko.
 *
 * PO CO TO ISTNIEJE. Od modułu 4 Kursu 2 lekcje pisze kilku subagentów
 * RÓWNOLEGLE (decyzja właściciela 2026-08-18, `tresc-kursow/POSTEP.md`).
 * W trybie ręcznym jeden agent widział wszystkie lekcje po kolei i sam
 * pilnował formatu; w trybie równoległym nikt nie widzi całości, a jedyna
 * kontrola przed commitem to przelot agenta głównego — czyli znowu „na oko".
 * Ten strażnik jest warunkiem bezpieczeństwa dla pracy równoległej: zamienia
 * część „na oko" na czerwone CI. Nie ocenia TREŚCI (od tego jest właściciel
 * i przelot spójności) — pilnuje rzeczy, które da się sprawdzić maszyną
 * i których brak zabija wartość materiału:
 *
 *   1. metryka (frontmatter) kompletna i zgodna ze ścieżką pliku,
 *   2. plik z `cytowane:` NAPRAWDĘ istnieje w repo — inaczej po roku nie da
 *      się sprawdzić, skąd wzięła się teza, bez pobierania 55 MB źródeł,
 *   3. pliki z `zrodla:` istnieją (o ile dokumentacja jest lokalnie),
 *   4. komplet sekcji scenariusza + narracja do kamery,
 *   5. tabela „Zgodność ze źródłem" z min. 8 wierszami — lekcja bez pokrycia
 *      tez w źródle to dokładnie to, czego właściciel zakazał („zero
 *      zmyślania"), a próg wyłapuje tabelę dopisaną pro forma.
 *
 * CZEGO NIE SPRAWDZA: czy cytat zgadza się ze źródłem co do słowa. Tego
 * maszyna nie rozstrzygnie — to jeden z czterech sygnałów jakości, które
 * w przelocie sprawdza agent główny, a ostatecznie właściciel.
 *
 * Użycie: node tools/straznicy/straznik-scenariuszy.mjs
 */
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, basename, sep } from "node:path";

const KATALOG = "tresc-kursow";
const KATALOG_ZRODEL = join("docs", "dokumentacja-techniczna", "d7");
const KATALOGI_MASOWE = ["claude-platform", "claude-code", "github"];
const MIN_WIERSZY_ZGODNOSCI = 8;

const KLUCZE_METRYKI = ["kurs", "modul", "lekcja", "czas_wideo", "zrodla", "cytowane"];
const WYMAGANE_SEKCJE = [
  "Cel lekcji",
  "Scenariusz nagrania",
  "Prompty z tej lekcji",
  "Materiały dodatkowe",
  "Zgodność ze źródłem",
];

if (!existsSync(KATALOG)) process.exit(0);

/** Czy dokumentacja producentów jest rozpakowana lokalnie (jest poza gitem). */
const zrodlaLokalnie = KATALOGI_MASOWE.some((k) => existsSync(join(KATALOG_ZRODEL, k)));

function znajdzScenariusze(katalog) {
  const znalezione = [];
  for (const wpis of readdirSync(katalog, { withFileTypes: true })) {
    const sciezka = join(katalog, wpis.name);
    if (wpis.isDirectory()) znalezione.push(...znajdzScenariusze(sciezka));
    else if (/^lekcja-\d+-.*\.md$/.test(wpis.name)) znalezione.push(sciezka);
  }
  return znalezione.sort();
}

/**
 * Wycina bloki kodu i kod w linii. Scenariusze uczą składni Markdowna, więc
 * w przykładach bywają „nagłówki" i „tabele", które nagłówkami tej lekcji nie
 * są — ta sama lekcja, którą odrobił już `straznik-linkow`.
 */
function bezKodu(tekst) {
  const wiersze = tekst.split("\n");
  const proza = [];
  let wKodzie = false;
  for (const w of wiersze) {
    if (/^\s*(`{3,}|~{3,})/.test(w)) {
      wKodzie = !wKodzie;
      proza.push("");
      continue;
    }
    proza.push(wKodzie ? "" : w.replace(/`[^`]*`/g, ""));
  }
  return proza.join("\n");
}

/** Prosty czytnik metryki — tyle YAML-a, ile scenariusze naprawdę używają. */
function czytajMetryke(tekst) {
  const dopasowanie = tekst.match(/^---\n([\s\S]*?)\n---\n/);
  if (!dopasowanie) return null;
  const metryka = {};
  let ostatniKlucz = null;
  for (const wiersz of dopasowanie[1].split("\n")) {
    const lista = wiersz.match(/^\s+-\s+(.*)$/);
    if (lista && ostatniKlucz) {
      if (!Array.isArray(metryka[ostatniKlucz])) metryka[ostatniKlucz] = [];
      metryka[ostatniKlucz].push(lista[1].trim());
      continue;
    }
    const para = wiersz.match(/^([a-z_]+):\s*(.*)$/);
    if (para) {
      ostatniKlucz = para[1];
      metryka[ostatniKlucz] = para[2].trim();
    }
  }
  return metryka;
}

/**
 * Ścieżka źródła bywa opatrzona notatką w nawiasie — „…/thinking.md (tryb
 * ręczny — WYCOFYWANY)". Notatka jest cenna dla czytelnika, więc zostaje
 * w pliku; do sprawdzenia istnienia bierzemy samą ścieżkę.
 */
function samaSciezka(wpis) {
  return wpis.replace(/\s*\(.*\)\s*$/, "").trim();
}

/** Liczy wiersze danych tabeli (bez nagłówka i bez linii `|---|---|`). */
function wierszeTabeli(tekst, poNaglowku) {
  const od = tekst.indexOf(poNaglowku);
  if (od === -1) return 0;
  const wiersze = tekst.slice(od).split("\n").slice(1);
  const dane = [];
  let wTabeli = false;
  for (const w of wiersze) {
    if (/^\s*\|/.test(w)) {
      wTabeli = true;
      if (!/^\s*\|[\s:|-]*\|\s*$/.test(w)) dane.push(w);
    } else if (wTabeli && w.trim() === "") {
      break; // pusta linia po tabeli kończy tabelę
    } else if (/^## /.test(w)) {
      break;
    }
  }
  return Math.max(0, dane.length - 1); // pierwszy wiersz to nagłówek kolumn
}

const scenariusze = znajdzScenariusze(KATALOG);
const bledy = [];

if (scenariusze.length === 0) {
  console.error(`straznik-scenariuszy: ${KATALOG}/ istnieje, ale nie ma w nim żadnego scenariusza.`);
  process.exit(1);
}

for (const plik of scenariusze) {
  const zle = (komunikat) => bledy.push(`${plik}: ${komunikat}`);
  const tresc = readFileSync(plik, "utf8");
  const metryka = czytajMetryke(tresc);

  if (!metryka) {
    zle("brak metryki (bloku --- na początku pliku).");
    continue;
  }

  for (const klucz of KLUCZE_METRYKI) {
    if (!metryka[klucz] || (typeof metryka[klucz] === "string" && metryka[klucz] === "")) {
      zle(`metryka bez pola „${klucz}".`);
    }
  }

  // Metryka musi zgadzać się ze ścieżką — inaczej lekcja „4.3" ląduje
  // w module 5 i nikt tego nie zauważy do nagrania.
  const czesci = plik.split(sep);
  const katalogKursu = czesci[1];
  const katalogModulu = czesci[2] ?? "";
  if (metryka.kurs && metryka.kurs !== katalogKursu) {
    zle(`metryka mówi kurs „${metryka.kurs}", a plik leży w „${katalogKursu}".`);
  }
  const nrModuluZeSciezki = katalogModulu.match(/^modul-(\d+)$/)?.[1];
  const nrModuluZMetryki = String(metryka.modul ?? "").match(/^(\d+)/)?.[1];
  if (nrModuluZeSciezki && nrModuluZMetryki && nrModuluZeSciezki !== nrModuluZMetryki) {
    zle(`metryka mówi moduł ${nrModuluZMetryki}, a plik leży w ${katalogModulu}.`);
  }
  const nrLekcjiZNazwy = basename(plik).match(/^lekcja-(\d+)/)?.[1];
  const nrLekcjiZMetryki = String(metryka.lekcja ?? "").match(/^(\d+)/)?.[1];
  if (nrLekcjiZNazwy && nrLekcjiZMetryki && nrLekcjiZNazwy !== nrLekcjiZMetryki) {
    zle(`metryka mówi lekcja ${nrLekcjiZMetryki}, a nazwa pliku mówi ${nrLekcjiZNazwy}.`);
  }

  // Cytaty SĄ w repo — ich brak sprawdzamy zawsze.
  if (typeof metryka.cytowane === "string" && metryka.cytowane) {
    const cyt = samaSciezka(metryka.cytowane);
    if (!existsSync(cyt)) {
      zle(`plik z cytatami nie istnieje: ${cyt}`);
    } else if (statSync(cyt).size === 0) {
      zle(`plik z cytatami jest pusty: ${cyt}`);
    }
  }

  // Źródła leżą POZA gitem (55 MB, decyzja właściciela) — w CI ich nie ma,
  // więc sprawdzamy je tylko wtedy, gdy dokumentacja jest rozpakowana.
  const zrodla = Array.isArray(metryka.zrodla) ? metryka.zrodla : [];
  if (zrodla.length === 0) zle(`pole „zrodla" nie wskazuje żadnego pliku.`);
  if (zrodlaLokalnie) {
    for (const wpis of zrodla) {
      const sciezka = samaSciezka(wpis);
      if (!existsSync(sciezka)) zle(`źródło nie istnieje: ${sciezka}`);
    }
  }

  const proza = bezKodu(tresc);
  for (const sekcja of WYMAGANE_SEKCJE) {
    if (!new RegExp(`^## ${sekcja}`, "m").test(proza)) {
      zle(`brak sekcji „## ${sekcja}".`);
    }
  }

  // Scenariusz ma być narracją do kamery, nie suchą listą — minimum to
  // jedno wskazanie, co mówi lektor.
  if (/^## Scenariusz nagrania/m.test(proza) && !/\[NARRACJA\]/.test(proza)) {
    zle(`„Scenariusz nagrania" bez ani jednego znacznika [NARRACJA].`);
  }

  if (/^## Zgodność ze źródłem/m.test(proza)) {
    const wiersze = wierszeTabeli(tresc, "## Zgodność ze źródłem");
    if (wiersze < MIN_WIERSZY_ZGODNOSCI) {
      zle(
        `tabela „Zgodność ze źródłem" ma ${wiersze} wiersz(y) — minimum to ${MIN_WIERSZY_ZGODNOSCI}.`,
      );
    }
  }
}

if (bledy.length > 0) {
  console.error("straznik-scenariuszy:");
  for (const b of bledy) console.error(`  - ${b}`);
  // Polska odmiana liczebnika — reguła jak w `lib/odmiana.ts`; strażnicy
  // nie importują kodu aplikacji, więc trzy formy stoją tutaj.
  const n = bledy.length;
  const reszta10 = n % 10;
  const reszta100 = n % 100;
  const forma =
    n === 1
      ? "usterka"
      : reszta10 >= 2 && reszta10 <= 4 && (reszta100 < 12 || reszta100 > 14)
        ? "usterki"
        : "usterek";
  console.error(`\n  ${n} ${forma} w ${scenariusze.length} scenariuszach.`);
  process.exit(1);
}

const notka = zrodlaLokalnie
  ? ""
  : " (źródła D7 nieobecne lokalnie — pominięto kontrolę istnienia plików z „zrodla:\")";
console.log(`straznik-scenariuszy: ${scenariusze.length} scenariuszy w porządku${notka}`);
