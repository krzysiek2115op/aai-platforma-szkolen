/**
 * „Wysłałem pliki" to nie to samo co „strona działa".
 *
 * GitHub Pages przebudowuje się z opóźnieniem i potrafi jeszcze przez
 * chwilę serwować POPRZEDNI build — albo 404, jeśli publikacja nie
 * doszła. Ten skrypt czeka, aż żywy adres zacznie oddawać dokładnie ten
 * build, który właśnie wysłaliśmy. Idea ze strony głównej
 * (scripts/verify-live.mjs), realizacja inna — patrz niżej.
 *
 * JAK ROZPOZNAJEMY BUILD: porównaniem CAŁEJ treści, bajt w bajt.
 * Pages serwuje statyczne pliki bez żadnej obróbki, więc odpowiedź jest
 * identyczna z plikiem w `out/` — sprawdzone pomiarem, nie założeniem
 * (99 232 bajty po obu stronach).
 *
 * PIERWSZA WERSJA TEGO SKRYPTU BYŁA DZIURAWA i warto pamiętać jak:
 * szukała identyfikatora buildu wzorcem `/_next/static/<coś>/`, a ten
 * pasuje do `/_next/static/chunks/` — czyli do słowa „chunks", które
 * jest takie samo w KAŻDYM buildzie Next. Weryfikacja przechodziła na
 * zielono, potwierdzając wyłącznie to, że pod adresem stoi jakakolwiek
 * strona Next. Prawdziwy identyfikator buildu (katalog `out/_next/<id>`)
 * w ogóle nie występuje w HTML-u, więc nie było czego szukać.
 *
 * Użycie: node tools/sprawdz-zywy.mjs <adres> <plik-lokalny> [sekundy]
 */
import { readFileSync } from "node:fs";

const [adres, plikLokalny, sekundy = "300"] = process.argv.slice(2);
if (!adres || !plikLokalny) {
  console.error("użycie: node tools/sprawdz-zywy.mjs <adres> <plik-lokalny> [sekundy]");
  process.exit(1);
}

const oczekiwany = readFileSync(plikLokalny);
const koniec = Date.now() + Number(sekundy) * 1000;
let ostatni = "jeszcze nie pytałem";

while (Date.now() < koniec) {
  try {
    const odp = await fetch(adres, { cache: "no-store" });
    if (odp.ok) {
      const zywy = Buffer.from(await odp.arrayBuffer());
      if (zywy.equals(oczekiwany)) {
        console.log(`✔ żywy adres serwuje DOKŁADNIE ten build (${zywy.length} B): ${adres}`);
        process.exit(0);
      }
      ostatni = `inna treść (żywy ${zywy.length} B, lokalny ${oczekiwany.length} B) — Pages jeszcze przebudowuje`;
    } else {
      ostatni = `HTTP ${odp.status}`;
    }
  } catch (blad) {
    ostatni = blad instanceof Error ? blad.message : String(blad);
  }
  await new Promise((r) => setTimeout(r, 5000));
}

console.error(`✖ sprawdz-zywy: ${adres} nie zaczął serwować tego builda w ${sekundy} s (ostatnio: ${ostatni}).`);
process.exit(1);
