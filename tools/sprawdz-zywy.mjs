/**
 * „Wysłałem pliki" to nie to samo co „strona działa".
 *
 * GitHub Pages przebudowuje się z opóźnieniem i potrafi jeszcze przez
 * chwilę serwować POPRZEDNI build — albo 404, jeśli publikacja nie
 * doszła. Ten skrypt czeka, aż żywy adres zacznie oddawać dokładnie ten
 * build, który właśnie wysłaliśmy. Idea ze strony głównej
 * (scripts/verify-live.mjs), realizacja inna — patrz niżej.
 *
 * JAK ROZPOZNAJEMY BUILD: porównaniem treści, bajt w bajt.
 * Pages serwuje statyczne pliki bez żadnej obróbki, więc odpowiedź jest
 * identyczna z plikiem w `out/` — sprawdzone pomiarem, nie założeniem
 * (99 232 bajty po obu stronach).
 *
 * HISTORIA DZIUR W TYM SKRYPCIE — obie tej samej klasy („weryfikacja
 * ślepa na artefakt"), obie znalezione dopiero na żywym adresie:
 *
 * 1. Pierwsza wersja szukała identyfikatora buildu wzorcem
 *    `/_next/static/<coś>/`, a ten pasuje do `/_next/static/chunks/`
 *    — czyli słowa „chunks", takiego samego w KAŻDYM buildzie Next.
 *    Weryfikacja potwierdzała wyłącznie, że pod adresem stoi
 *    jakakolwiek strona Next.
 *
 * 2. Druga wersja porównywała JEDEN plik: szkolenia.html. Gdy zmiana
 *    żyje wyłącznie w treści chunka (CSS/JS), a NAZWA chunka się nie
 *    zmienia — w tej wersji Next nazwy chunków NIE pochodzą z treści
 *    (`2xhax4x7zwkk0.css` został sobą po zmianie stylów) — HTML jest
 *    bajt w bajt identyczny z poprzednim deploymentem i weryfikacja
 *    przechodziła na zielono PRZECIW STAREMU buildowi. Do tego edge
 *    cache Pages (max-age=600) jeszcze przez ≤10 minut oddawał starą
 *    treść spod niezmienionego adresu, więc pomiar PSI mierzył
 *    poprzednią wersję strony. Dlatego teraz porównujemy TAKŻE każdy
 *    chunk, a zapytania znaczymy parametrem — omija stare kopie na
 *    krawędziach CDN i dowodzi stanu ORIGINU. Konsekwencja dla
 *    pomiarów pozostaje: po deployu odczekać ≥10 minut, bo PSI pyta
 *    bez znacznika.
 *
 * Użycie: node tools/sprawdz-zywy.mjs <adres-bazowy> <katalog-out> <strona.html> [sekundy]
 *   np.   node tools/sprawdz-zywy.mjs https://…/szkolenia-podglad/ out szkolenia.html 300
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const [adresBazowy, katalogOut, stronaHtml, sekundy = "300"] = process.argv.slice(2);
if (!adresBazowy || !katalogOut || !stronaHtml) {
  console.error("użycie: node tools/sprawdz-zywy.mjs <adres-bazowy> <katalog-out> <strona.html> [sekundy]");
  process.exit(1);
}

/** Znacznik zapytania: omija stare kopie na krawędziach CDN (originu nie zmienia). */
const ZNACZNIK = `sprawdz=${Date.now()}`;

/** Strona wejściowa + KAŻDY chunk — pliki, których nazwa nie zmienia się z treścią. */
const doSprawdzenia = [
  stronaHtml,
  ...readdirSync(join(katalogOut, "_next/static/chunks")).map((p) => `_next/static/chunks/${p}`),
];

const koniec = Date.now() + Number(sekundy) * 1000;
let ostatni = "jeszcze nie pytałem";

while (Date.now() < koniec) {
  let zgodnych = 0;
  for (const sciezka of doSprawdzenia) {
    const oczekiwany = readFileSync(join(katalogOut, sciezka));
    // szkolenia.html żyje pod adresem bez rozszerzenia
    const zywyAdres = `${adresBazowy}${sciezka.replace(/\.html$/, "")}?${ZNACZNIK}`;
    try {
      const odp = await fetch(zywyAdres, { cache: "no-store" });
      if (!odp.ok) {
        ostatni = `${sciezka}: HTTP ${odp.status}`;
        break;
      }
      const zywy = Buffer.from(await odp.arrayBuffer());
      if (!zywy.equals(oczekiwany)) {
        ostatni = `${sciezka}: inna treść (żywy ${zywy.length} B, lokalny ${oczekiwany.length} B) — Pages jeszcze przebudowuje`;
        break;
      }
      zgodnych += 1;
    } catch (blad) {
      ostatni = `${sciezka}: ${blad instanceof Error ? blad.message : String(blad)}`;
      break;
    }
  }
  if (zgodnych === doSprawdzenia.length) {
    console.log(
      `✔ żywy adres serwuje DOKŁADNIE ten build (${doSprawdzenia.length} plików zgodnych, w tym każdy chunk): ${adresBazowy}${stronaHtml.replace(/\.html$/, "")}`
    );
    process.exit(0);
  }
  await new Promise((r) => setTimeout(r, 5000));
}

console.error(`✖ sprawdz-zywy: ${adresBazowy} nie zaczął serwować tego builda w ${sekundy} s (ostatnio: ${ostatni}).`);
process.exit(1);
