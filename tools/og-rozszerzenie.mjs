/**
 * Nadaje obrazom Open Graph rozszerzenie `.png` i przestawia na nie
 * odwołania w zbudowanych plikach.
 *
 * PROBLEM (lekcja z repo strony głównej, zweryfikowana tam na żywym
 * adresie): konwencja `app/**\/opengraph-image.tsx` przy `output: "export"`
 * produkuje plik BEZ rozszerzenia. Hosting statyczny dobiera Content-Type
 * po rozszerzeniu, więc GitHub Pages podaje go jako
 * `application/octet-stream`. Scrapery Facebooka, LinkedIna i X-a
 * wymagają typu `image/*` — link idzie w świat bez miniatury, a strona
 * wygląda przy tym na w pełni poprawną.
 *
 * DLACZEGO PO BUILDZIE, A NIE W METADANYCH: konwencja plikowa Next ma
 * pierwszeństwo przed `metadata.openGraph.images`, więc jawne wskazanie
 * adresu zmieniłoby tylko `twitter:image`, a `og:image` i tak wróciłby
 * do trasy bez rozszerzenia.
 *
 * Plik bez rozszerzenia ZOSTAJE obok kopii — gdyby ktoś miał zapisany
 * stary adres, nadal dostanie obrazek (choć z gorszym typem).
 *
 * Użycie: node tools/og-rozszerzenie.mjs [katalog=out]
 */
import { copyFileSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, sep } from "node:path";

const KATALOG = process.argv[2] ?? "out";

function wszystkie(katalog) {
  return readdirSync(katalog, { withFileTypes: true }).flatMap((wpis) =>
    wpis.isDirectory() ? wszystkie(join(katalog, wpis.name)) : [join(katalog, wpis.name)]
  );
}

const pliki = wszystkie(KATALOG);

// 1. KAŻDY obraz OG, nie tylko ten z korzenia. Pierwsza wersja skryptu na
//    stronie głównej przepisywała jedynie obraz strony głównej, a odwołania
//    w podstronach dostawały `.png` bez istniejącego pliku — trzy adresy
//    wskazywały na 404 i wyglądało to na sukces.
const zrodla = pliki.filter((p) => p.endsWith(`${sep}opengraph-image`));
for (const zrodlo of zrodla) copyFileSync(zrodlo, `${zrodlo}.png`);

// 2. Odwołania w HTML-u i w ładunkach RSC (.txt) — Next umieszcza adres
//    obrazka w obu, a rozjazd między nimi byłby trudny do zauważenia.
let przestawione = 0;
let dotkniete = 0;
for (const plik of pliki) {
  if (!/\.(html|txt)$/.test(plik)) continue;
  const przed = readFileSync(plik, "utf8");
  const po = przed
    .replaceAll("/opengraph-image?", "/opengraph-image.png?")
    .replaceAll('/opengraph-image"', '/opengraph-image.png"');
  if (po !== przed) {
    writeFileSync(plik, po);
    dotkniete++;
    przestawione += przed.split("/opengraph-image").length - 1;
  }
}

if (zrodla.length === 0) {
  console.error("og-rozszerzenie: nie znalazłem ŻADNEGO obrazu OG — konwencja plikowa przestała działać?");
  process.exit(1);
}

console.log(
  `og-rozszerzenie: ${zrodla.length} obrazów skopiowanych na .png, ${przestawione} odwołań w ${dotkniete} plikach.`
);
