/**
 * Strażnik prozy lekcji: to, co czyta klient, jest sprawdzalne i wierne.
 *
 * PO CO. Od etapu 3 kroku 3 materiał kursu żyje w plikach
 * `tresc-kursow/<kurs>/modul-N/proza-M-*.md`, a stamtąd wchodzi do bazy
 * narzędziem `npm run db1:tresc`. Pliki są ŹRÓDŁEM PRAWDY (decyzja
 * właściciela 2026-08-19), więc muszą być pilnowane jak scenariusze —
 * inaczej wada wchodzi do repo dziś, a wychodzi na jaw dopiero przy
 * wgrywaniu albo, gorzej, u kupującego.
 *
 * DLACZEGO OSOBNY STRAŻNIK, A NIE ROZSZERZENIE straznik-scenariuszy.
 * Tamten zbiera pliki wzorcem `lekcja-*.md` i żąda od nich SCEN
 * (`[EKRAN]`, `[NARRACJA]`, czasy) — proza z definicji ich nie ma i mieć
 * nie może. Wspólny strażnik musiałby rozgałęziać każdą regułę; osobny
 * pilnuje dokładnie tego, co prozę odróżnia.
 *
 * CO SPRAWDZA (w plikach `tresc-kursow/**\/proza-*.md`):
 *   1. plik przechodzi przez `czytajProze` — czyli ma kompletny
 *      frontmatter zgodny ze ścieżką, treść, tabelę „Zgodność ze
 *      źródłem" o wymaganej głębokości i mieści się w kontrakcie
 *      `TrescLekcji`. Ta sama funkcja, której używa narzędzie wgrywania,
 *      więc CI odrzuca dokładnie to, co odrzuciłby serwer;
 *   2. do każdej prozy istnieje scenariusz o TYM SAMYM TYTULE — proza nie
 *      wymyśla lekcji spoza programu. Po tytule, nie po numerze: cięcie
 *      Kursu 2 (decyzja właściciela 2026-08-22) usunęło z programu
 *      dziewiętnaście lekcji, więc numer prozy to pozycja w NOWYM
 *      programie, a numer scenariusza został przy starym. Dopasowanie po
 *      numerze świeciło się wtedy na zielono, dowodząc istnienia CUDZEJ
 *      lekcji (`proza-3-czym-jest-pull-request.md` znajdowało
 *      `lekcja-3-tworzenie-i-prowadzenie-issue.md`) — czyli kontrola
 *      celowała w nazwę pliku zamiast w to, czego naprawdę pilnuje;
 *   3. proza nie niesie znaczników nagrania (`[EKRAN]`, `[NARRACJA]`) —
 *      to sygnał, że ktoś wkleił scenariusz zamiast napisać tekst;
 *   4. znaczniki miejsc na zrzuty są domknięte (`<!-- ZRZUT: … -->`),
 *      bo osobny przelot na końcu produkcji ma je znaleźć wszystkie;
 *   5. plik nie kończy się śmieciem po narzędziu zapisu (BLAD-008:
 *      `</content>`, `</invoke>` na 31 plikach treści).
 *
 * Użycie: node tools/straznicy/straznik-prozy.mjs
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { BladProzy, WZORZEC_PROZY, czytajProze } from "../../lib/proza-lekcji.ts";

const KATALOG = "tresc-kursow";
const SMIECI = /<\/(content|invoke|function_calls|parameter)>\s*$/;
const bledy = [];
let sprawdzone = 0;
let miejscaNaZrzuty = 0;

if (existsSync(KATALOG)) {
  for (const wpisKursu of readdirSync(KATALOG, { withFileTypes: true })) {
    if (!wpisKursu.isDirectory()) continue;
    const kp = join(KATALOG, wpisKursu.name);

    for (const modul of readdirSync(kp)) {
      if (!/^modul-\d+$/.test(modul)) continue;
      const mp = join(kp, modul);

      for (const plik of readdirSync(mp)) {
        const numer = plik.match(WZORZEC_PROZY)?.[1];
        if (!numer) continue;

        const sciezka = join(mp, plik);
        const surowy = readFileSync(sciezka, "utf8");
        sprawdzone++;

        // --- 1. ten sam rygor, co przy wgrywaniu ---
        try {
          czytajProze(surowy, sciezka);
        } catch (b) {
          bledy.push(
            `${sciezka}: ${b instanceof BladProzy ? b.message : String(b)}`
          );
        }

        // --- 2. proza nie wymyśla lekcji spoza programu ---
        const tytulProzy = /^lekcja:\s*\d+\s*[—-]\s*(.+)$/m
          .exec(surowy.slice(0, surowy.indexOf("\n---", 4)))?.[1]
          ?.trim();
        const scenariusz = readdirSync(mp)
          .filter((s) => /^lekcja-\d+-.*\.md$/.test(s))
          .some((s) => {
            const tekst = readFileSync(join(mp, s), "utf8");
            const koniec = tekst.indexOf("\n---", 4);
            if (koniec === -1) return false;
            const tytul = /^lekcja:\s*\d+\s*[—-]\s*(.+)$/m
              .exec(tekst.slice(0, koniec))?.[1]
              ?.trim();
            return tytul !== undefined && tytul === tytulProzy;
          });
        if (!scenariusz) {
          bledy.push(
            `${sciezka}: żaden scenariusz w tym module nie nosi tytułu „${tytulProzy ?? "?"}” — proza opisuje lekcję, której program nie zna.`
          );
        }

        // --- 3. proza to nie wklejony scenariusz ---
        for (const znacznik of ["[EKRAN]", "[NARRACJA]"]) {
          if (surowy.includes(znacznik)) {
            bledy.push(
              `${sciezka}: znacznik nagrania ${znacznik} w prozie — kurs jest TEKSTOWY, klient ma dostać tekst, a nie zapis planu nagrania.`
            );
          }
        }

        // --- 4. miejsca na zrzuty muszą dać się znaleźć ---
        for (const linia of surowy.split("\n")) {
          if (!linia.includes("<!-- ZRZUT:")) continue;
          miejscaNaZrzuty++;
          if (!linia.trimEnd().endsWith("-->")) {
            bledy.push(
              `${sciezka}: niedomknięty znacznik zrzutu — przelot zrzutów na końcu produkcji go przeoczy: „${linia.trim()}”`
            );
          }
        }

        // --- 5. nawrót BLAD-008 ---
        if (SMIECI.test(surowy.trimEnd())) {
          bledy.push(
            `${sciezka}: plik kończy się śmieciem po narzędziu zapisu (BLAD-008).`
          );
        }
      }
    }
  }
}

if (bledy.length > 0) {
  console.error("straznik-prozy:");
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}

console.log(
  sprawdzone === 0
    ? "straznik-prozy: nie ma jeszcze plików prozy — pilnuję kodu, nie planów."
    : `straznik-prozy: lekcji prozy w porządku: ${sprawdzone}; miejsc na zrzuty do przelotu końcowego: ${miejscaNaZrzuty}.`
);
