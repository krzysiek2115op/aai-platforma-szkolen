/**
 * Strażnik odmiany: polskie liczebniki idą przez lib/odmiana.ts,
 * nie przez ręczne „if (n === 1)".
 *
 * PO CO. Feedback właściciela z B5: liczby z bazy mają czytać się
 * naturalnie — „2 moduły", nie „2 modułów". Powstało do tego
 * lib/odmiana.ts (trzy formy: 1 / 2–4 / 5+). Mimo to w kreatorze
 * wróciła ręczna wersja z dwiema formami („1 kurs" / „3 w bazie"),
 * bo przy pisaniu nowego widoku łatwiej dopisać ternar niż sięgnąć
 * po funkcję. Dwie formy NIE WYSTARCZĄ w polskim — stąd ten strażnik.
 *
 * CO ŁAPIE: ternar, którego obie gałęzie to pojedyncze polskie słowa
 * o wspólnym rdzeniu (np. `? "kurs" : "kursy"`, `? "lekcja" : "lekcje"`).
 * Taki zapis prawie zawsze znaczy „odmieniam liczebnik na piechotę".
 *
 * Pomijamy lib/odmiana.ts (tam te formy są danymi, nie błędem)
 * i pliki testów.
 *
 * Użycie: node tools/straznicy/straznik-odmiany.mjs
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const KATALOGI = ["app", "components", "lib"];
const POMIJANE_PLIKI = [join("lib", "odmiana.ts")];
const ROZSZERZENIA = /\.(ts|tsx)$/;

/** `? "slowo" : "slowo"` — obie gałęzie to jedno polskie słowo */
const TERNAR =
  /\?\s*["']([a-ząćęłńóśźż]{4,})["']\s*:\s*["']([a-ząćęłńóśźż]{4,})["']/gi;

const bledy = [];

function pliki(katalog) {
  const wynik = [];
  for (const nazwa of readdirSync(katalog)) {
    const sciezka = join(katalog, nazwa);
    if (statSync(sciezka).isDirectory()) wynik.push(...pliki(sciezka));
    else if (ROZSZERZENIA.test(nazwa) && !nazwa.includes(".test."))
      wynik.push(sciezka);
  }
  return wynik;
}

/** Czy to dwie formy tego samego słowa (wspólny rdzeń 4 znaków). */
function tenSamRdzen(a, b) {
  if (a === b) return false;
  return a.slice(0, 4).toLowerCase() === b.slice(0, 4).toLowerCase();
}

for (const katalog of KATALOGI) {
  if (!existsSync(katalog)) continue;
  for (const plik of pliki(katalog)) {
    const wzgledna = relative(".", plik);
    if (POMIJANE_PLIKI.includes(wzgledna)) continue;

    const tresc = readFileSync(plik, "utf8");
    for (const [dopasowanie, jeden, wiele] of tresc.matchAll(TERNAR)) {
      if (!tenSamRdzen(jeden, wiele)) continue;
      const linia = tresc.slice(0, tresc.indexOf(dopasowanie)).split("\n").length;
      bledy.push(
        `${wzgledna}:${linia}: ręczna odmiana „${jeden}"/„${wiele}" — polski ma TRZY formy (1 / 2–4 / 5+), więc ternar zawsze skłamie przy jednej z nich. Użyj odmien()/slowo() z lib/odmiana.ts.`
      );
    }
  }
}

if (bledy.length > 0) {
  console.error("straznik-odmiany:");
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}
