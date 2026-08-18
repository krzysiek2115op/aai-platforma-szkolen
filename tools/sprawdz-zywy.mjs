/**
 * „Wysłałem pliki" to nie to samo co „strona działa".
 *
 * GitHub Pages przebudowuje się z opóźnieniem i potrafi jeszcze przez
 * chwilę serwować POPRZEDNI build — albo 404, jeśli publikacja nie
 * doszła. Ten skrypt czeka, aż żywy adres zacznie oddawać dokładnie ten
 * build, który właśnie wysłaliśmy, i dopiero wtedy pozwala ogłosić
 * sukces. Wzorzec ze strony głównej (scripts/verify-live.mjs).
 *
 * Rozpoznajemy build po znaczniku, który jest w każdej stronie Next
 * i zmienia się z każdym buildem: identyfikatorze paczki w ścieżkach
 * /_next/static/<id>/. Porównanie „czy HTML jest identyczny" nie
 * zadziała, bo Pages dokłada własne nagłówki i potrafi zmienić
 * kodowanie.
 *
 * Użycie: node tools/sprawdz-zywy.mjs <adres> <plik-lokalny> [sekundy]
 */
const [adres, plikLokalny, sekundy = "240"] = process.argv.slice(2);
if (!adres || !plikLokalny) {
  console.error("użycie: node tools/sprawdz-zywy.mjs <adres> <plik-lokalny> [sekundy]");
  process.exit(1);
}

const { readFileSync } = await import("node:fs");
const lokalny = readFileSync(plikLokalny, "utf8");
const znacznik = lokalny.match(/\/_next\/static\/([^/"']+)\//)?.[1];
if (!znacznik) {
  console.error(`sprawdz-zywy: w ${plikLokalny} nie ma identyfikatora buildu — nie ma po czym rozpoznać wersji.`);
  process.exit(1);
}

const koniec = Date.now() + Number(sekundy) * 1000;
let ostatni = "start";

while (Date.now() < koniec) {
  try {
    const odp = await fetch(adres, { cache: "no-store" });
    if (odp.ok) {
      const html = await odp.text();
      if (html.includes(znacznik)) {
        console.log(`✔ żywy adres serwuje ten build (${znacznik}): ${adres}`);
        process.exit(0);
      }
      ostatni = `stary build (szukam ${znacznik})`;
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
