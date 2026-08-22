// Sprawdza, czy KAŻDY cytat w pliku `docs/…/cytowane/<plik>.md` stoi
// DOSŁOWNIE w oryginalnej dokumentacji.
//
// Po co: plik cytatów jest w repo po to, żeby dało się sprawdzić tezę
// lekcji BEZ pobierania 55 MB źródeł. Jeśli cytat się rozjedzie z
// oryginałem, plik przestaje być dowodem, a zaczyna być drugim źródłem
// prawdy — czyli dokładnie tym, czemu miał zapobiec.
//
// Co ZŁAPAŁ przy pierwszym uruchomieniu (moduł 5 Kursu 2, 2026-08-22):
// dwa CICHE SKRÓTY — miejsca, w których cytat urywał zdanie albo punkt
// listy bez znaku `[…]`. Oba wyglądały na wierne, bo każde zdanie
// z osobna było prawdziwe; niecytowany był dopiero OGON (tail) punktu.
// Dlatego narzędzie skleja cały blok `>` w jeden ciąg i wymaga, żeby
// występował w oryginale bez przerw — elipsa `[…]` jawnie dzieli blok
// na kawałki sprawdzane osobno.
//
// UWAGA: wymaga pobranej dokumentacji (poza gitem):
//   node tools/pobierz-dokumentacje-d7.mjs
// Dlatego to NARZĘDZIE, a nie strażnik w CI — w CI źródeł nie ma.
//
// Użycie:
//   node tools/cytaty-zgodne.mjs <plik-cytatow.md> <katalog-zrodel> [prefiks-sekcji…]
// Przykład (tylko sekcje lekcji żywych, z pominięciem wyciętych):
//   node tools/cytaty-zgodne.mjs \
//     docs/dokumentacja-techniczna/d7/cytowane/github--modul-5.md \
//     docs/dokumentacja-techniczna/d7/github/actions \
//     D7-5.1 D7-5.2 D7-5.3 D7-5.6
//
// Kod wyjścia: 0 = wszystkie cytaty dosłowne, 1 = rozjazd, 2 = błąd użycia.
// Sprawdzone testem negatywnym: podmiana jednego słowa („job" → „run")
// w cytacie daje kod 1 i wskazuje blok.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const [plikCytatow, katalogZrodel, ...prefiksy] = process.argv.slice(2);
if (!plikCytatow || !katalogZrodel) {
  console.error("użycie: node tools/cytaty-zgodne.mjs <plik-cytatow.md> <katalog-zrodel> [prefiks-sekcji…]");
  process.exit(2);
}

/** Sprowadza oryginał i cytat do wspólnej postaci: bez ikon, odsyłaczy,
 *  punktorów, pogrubień i łamania wierszy. Sens zostaje, formatowanie nie. */
function normalizuj(s) {
  return s
    .replace(/<svg[\s\S]*?<\/svg>/g, " ")
    .replace(/^\s*>\s?/gm, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\\\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\]/g, "")
    .replace(/\*\*/g, "")
    .replace(/^\s*[*-]\s+/gm, " ")
    .replace(/^\s*\d+\.\s+/gm, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wszystkieMd(katalog) {
  const wynik = [];
  for (const wpis of readdirSync(katalog)) {
    const p = join(katalog, wpis);
    if (statSync(p).isDirectory()) wynik.push(...wszystkieMd(p));
    else if (wpis.endsWith(".md")) wynik.push(p);
  }
  return wynik;
}

const zrodla = wszystkieMd(katalogZrodel)
  .map((p) => normalizuj(readFileSync(p, "utf8")))
  .join("\n");

const tekst = readFileSync(plikCytatow, "utf8");
const czesci = tekst.split(/\n## (?=\S)/);
const bledy = [];
let zbadane = 0;

for (const czesc of czesci) {
  const naglowek = czesc.split("\n")[0];
  const kod = naglowek.split(" ")[0];
  if (prefiksy.length && !prefiksy.includes(kod)) continue;
  // Blok kończy się na gołej linii `>` — to akapit, a nie ciąg dalszy.
  // Bez tego dwa akapity źródła sklejają się w jeden ciąg, którego
  // w oryginale nie ma, i narzędzie zgłasza rozjazd tam, gdzie go nie ma.
  for (const blok of czesc.match(/^> .*(?:\n> .*)*/gm) ?? []) {
    const surowy = blok.replace(/^> ?/gm, "");
    // pomijamy własne komentarze redakcyjne w cudzysłowie blokowym
    if (/^\*\*/.test(surowy.trim())) continue;
    for (const kawalek of surowy.split("[…]")) {
      const k = normalizuj(kawalek);
      if (k.length < 25) continue;
      zbadane++;
      if (!zrodla.includes(k)) bledy.push(`${kod}: ${k.slice(0, 110)}`);
    }
  }
}

console.log(`cytaty-zgodne: sprawdzonych fragmentów ${zbadane}`);
if (bledy.length) {
  console.error(`ROZJAZD Z ORYGINAŁEM (${bledy.length}):`);
  for (const b of bledy) console.error("  - " + b);
  console.error("\nJeśli skrót jest zamierzony, zaznacz go w cytacie znakiem […].");
  process.exit(1);
}
console.log("cytaty-zgodne: wszystkie fragmenty stoją dosłownie w oryginale.");
