/**
 * Strażnik progów: liczby w tabeli pomiarów README muszą pochodzić
 * z ZAPISANEGO przebiegu Lighthouse'a, nie z pamięci.
 *
 * PO CO. Tabela wyników to jedyne miejsce w repo, gdzie wynik pracy jest
 * liczbą, a nie kodem — i jedyne, którego nie pilnuje żaden test. Liczba
 * raz wpisana wygląda tak samo rok później, choćby strona przez ten rok
 * spuchła dwukrotnie. To ta sama klasa błędu, którą złapaliśmy przy
 * miniaturach OG (0.24.0): weryfikacja sprawdzała PROCES, nie ARTEFAKT.
 *
 * Reguła jest więc prosta: README nie ma prawa twierdzić niczego, czego
 * nie ma w goldeny/pomiary-lighthouse.json — a golden powstaje wyłącznie
 * z `node tools/pomiar-lighthouse.mjs`, który liczby bierze z przebiegów.
 *
 * CO ŁAPIE:
 *   - liczbę w README, której nie ma w goldenie (wpisaną „na oko"),
 *   - wiersz tabeli bez odpowiednika w goldenie i odwrotnie,
 *   - golden bez metryczki pomiaru (data, narzędzie, adres, liczba
 *     przebiegów) — wynik bez warunków pomiaru jest nieweryfikowalny,
 *   - pomiar z mniej niż 5 przebiegów: dokumentacja Lighthouse'a
 *     (docs/variability.md) mówi wprost, że mediana z 5 jest dwa razy
 *     stabilniejsza od pojedynczego przebiegu, a rozrzut TBT na tej
 *     stronie sięgał 50–200 ms.
 *
 * Użycie: node tools/straznicy/straznik-progow.mjs
 */
import { existsSync, readFileSync } from "node:fs";

const GOLDEN = "goldeny/pomiary-lighthouse.json";
const README = "README.md";
const MIN_PRZEBIEGOW = 5;

const bledy = [];

/**
 * Wiersze tabeli pomiarów w README:
 *   | `/szkolenia` | mobile | 100 | 100 | 100 | 100 | 1,7 s | 0 | 73 ms |
 * Pierwsza komórka to ścieżka w grawisach, druga „mobile"/„desktop" —
 * inne tabele w README nie pasują do tego wzorca.
 */
const WZORZEC_WIERSZA = /^\|\s*`([^`]+)`\s*\|\s*(mobile|desktop)\s*\|([^\n]+)\|/gm;

const readmeTresc = readFileSync(README, "utf8");
const wiersze = [...readmeTresc.matchAll(WZORZEC_WIERSZA)];

if (!existsSync(GOLDEN)) {
  /*
   * Brak goldenu SAM W SOBIE nie jest kłamstwem — dopóki README niczego
   * nie twierdzi. Tabela z myślnikami („niezmierzone") jest stanem
   * uczciwym i strażnik ma ją przepuścić; dopiero wpisana liczba bez
   * pokrycia w zapisanym przebiegu jest błędem.
   */
  const twierdzace = wiersze.filter(
    ([, , , reszta]) => !reszta.split("|").map((k) => k.trim()).slice(0, 4).every((k) => k === "—" || k === "-")
  );
  if (twierdzace.length > 0) {
    bledy.push(
      `${README}: tabela podaje ${twierdzace.length} wyników, a ${GOLDEN} nie istnieje — liczby nie mają czym się wylegitymować. Uruchom: node tools/pomiar-psi.mjs`
    );
  }
} else {
  const golden = JSON.parse(readFileSync(GOLDEN, "utf8"));

  for (const pole of ["narzedzie", "data", "adres", "przebiegow", "agregat"]) {
    if (!golden[pole]) {
      bledy.push(`${GOLDEN}: brak pola \`${pole}\` — wynik bez warunków pomiaru jest nieweryfikowalny.`);
    }
  }

  if (golden.przebiegow && golden.przebiegow < MIN_PRZEBIEGOW) {
    bledy.push(
      `${GOLDEN}: pomiar z ${golden.przebiegow} przebiegów, wymagane ${MIN_PRZEBIEGOW} — pojedynczy przebieg mieści się w szumie (rozrzut TBT 50–200 ms).`
    );
  }

  if (wiersze.length === 0) {
    bledy.push(`${README}: nie znalazłem tabeli pomiarów — a golden istnieje. Tabela zniknęła albo zmienił się jej format.`);
  }

  const wGoldenie = new Set();
  for (const [sciezka, tryby] of Object.entries(golden.strony ?? {})) {
    for (const tryb of Object.keys(tryby)) wGoldenie.add(`${sciezka}|${tryb}`);
  }

  const wReadme = new Set();

  for (const [, sciezka, tryb, reszta] of wiersze) {
    const klucz = `${sciezka}|${tryb}`;

    /*
     * Wiersz z samymi myślnikami znaczy „niezmierzone" i NICZEGO nie
     * twierdzi — nie wchodzi do porównania z goldenem. Dzięki temu
     * tabela-szkielet (format gotowy, liczb brak) jest stanem uczciwym,
     * a golden bez wiersza w tabeli dalej jest błędem: wynik istnieje,
     * dokumentacja go ukrywa.
     */
    const komorkiWiersza = reszta.split("|").map((k) => k.trim());
    if (komorkiWiersza.slice(0, 4).every((k) => k === "—" || k === "-")) continue;

    wReadme.add(klucz);

    const dane = golden.strony?.[sciezka]?.[tryb];
    if (!dane) {
      bledy.push(`${README}: wiersz „${sciezka} / ${tryb}" nie ma odpowiednika w ${GOLDEN} — skąd te liczby?`);
      continue;
    }

    // Cztery pierwsze komórki to oceny kategorii (0–100) — te muszą zgadzać się CO DO JEDNOSTKI.
    const komorki = reszta.split("|").map((k) => k.trim());
    const oceny = komorki.slice(0, 4).map((k) => Number(k.replace(/\*\*/g, "")));
    const oczekiwane = [dane.wydajnosc, dane.dostepnosc, dane.praktyki, dane.seo];
    const nazwy = ["wydajność", "dostępność", "dobre praktyki", "SEO"];

    oceny.forEach((wartosc, i) => {
      if (!Number.isFinite(wartosc)) {
        bledy.push(`${README}: „${sciezka} / ${tryb}" — kolumna ${nazwy[i]} nie jest liczbą (${komorki[i]}).`);
      } else if (wartosc !== oczekiwane[i]) {
        bledy.push(
          `${README}: „${sciezka} / ${tryb}" — ${nazwy[i]} = ${wartosc}, a zapisany przebieg mówi ${oczekiwane[i]}. Liczba w README nie może wyprzedzać pomiaru.`
        );
      }
    });
  }

  for (const klucz of wGoldenie) {
    if (!wReadme.has(klucz)) {
      const [sciezka, tryb] = klucz.split("|");
      bledy.push(`${README}: zapisany przebieg ma „${sciezka} / ${tryb}", a tabela go nie pokazuje — wynik zniknął z dokumentacji.`);
    }
  }
}

if (bledy.length > 0) {
  console.error("straznik-progow:");
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}

if (!existsSync(GOLDEN)) {
  console.log("straznik-progow: brak zapisanego przebiegu, ale README niczego nie twierdzi — zgodne.");
} else {
  const g = JSON.parse(readFileSync(GOLDEN, "utf8"));
  const ile = Object.values(g.strony).reduce((s, t) => s + Object.keys(t).length, 0);
  console.log(
    `straznik-progow: ${ile} wyników w tabeli zgodnych z zapisanym przebiegiem (${g.narzedzie}, ${g.agregat} z ${g.przebiegow}, ${g.data}).`
  );
}
