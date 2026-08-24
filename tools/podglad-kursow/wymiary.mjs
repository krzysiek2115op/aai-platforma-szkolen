/**
 * Wymiary obrazu WebP czytane z nagłówka pliku.
 *
 * PO CO. Zrzut wstawiony bez `width`/`height` rezerwuje zero miejsca, dopóki
 * się nie pobierze — a wtedy przepycha tekst w dół. To jest CLS, czyli
 * dokładnie ta metryka, którą projekt trzyma na zerze na `/szkolenia`
 * (README, tabela pomiarów; historia napraw przy 0.25.0 — fonty potrafiły
 * dać 0,14–0,17 i było to traktowane jak usterka). Lekcja z 148 zrzutami bez
 * wymiarów skakałaby przy każdym doładowaniu obrazu.
 *
 * DLACZEGO WŁASNY PARSER, A NIE BIBLIOTEKA. Wytyczna wydajnościowa
 * właściciela mówi wprost: minimum nowych zależności. Cała potrzebna wiedza
 * to kilkanaście bajtów nagłówka, a `sharp`/`image-size` w narzędziu
 * autorskim to kolejny pakiet do utrzymania (lekcja z D5: narzędzia nie
 * wchodzą do zależności produktu).
 *
 * Format WebP (RIFF): bajty 0–3 „RIFF”, 8–11 „WEBP”, 12–15 nazwa pierwszego
 * chunku. Obsługujemy wszystkie trzy warianty, bo o tym, który wyjdzie,
 * decyduje koder, nie my — dziś wszystkie 148 zrzutów to VP8 stratny, ale
 * jedno przekodowanie i byłby VP8L.
 */
import { openSync, readSync, closeSync } from "node:fs";

/**
 * @returns {{szerokosc: number, wysokosc: number} | null} null, gdy plik nie
 * jest WebP-em, który umiemy przeczytać — wtedy wołający po prostu nie poda
 * wymiarów (obraz zadziała, straci tylko rezerwację miejsca).
 */
export function wymiaryWebp(sciezka) {
  let uchwyt;
  try {
    uchwyt = openSync(sciezka, "r");
  } catch {
    return null;
  }
  try {
    const bufor = Buffer.alloc(32);
    const wczytane = readSync(uchwyt, bufor, 0, 32, 0);
    if (wczytane < 30) return null;
    if (bufor.toString("ascii", 0, 4) !== "RIFF") return null;
    if (bufor.toString("ascii", 8, 12) !== "WEBP") return null;

    const rodzaj = bufor.toString("ascii", 12, 16);

    if (rodzaj === "VP8 ") {
      // klatka stratna: 3 B znacznika, 3 B kodu startowego 9D 01 2A, potem
      // szerokość i wysokość po 14 bitów w 16-bitowych słowach little-endian
      if (bufor[23] !== 0x9d || bufor[24] !== 0x01 || bufor[25] !== 0x2a) {
        return null;
      }
      return {
        szerokosc: bufor.readUInt16LE(26) & 0x3fff,
        wysokosc: bufor.readUInt16LE(28) & 0x3fff,
      };
    }

    if (rodzaj === "VP8L") {
      // bezstratny: po bajcie sygnatury 0x2F idą 14 bitów szerokości i 14
      // wysokości, upakowane bitowo — obie zapisane jako „o jeden mniej”
      if (bufor[20] !== 0x2f) return null;
      const bity =
        bufor[21] | (bufor[22] << 8) | (bufor[23] << 16) | (bufor[24] << 24);
      return {
        szerokosc: (bity & 0x3fff) + 1,
        wysokosc: ((bity >> 14) & 0x3fff) + 1,
      };
    }

    if (rodzaj === "VP8X") {
      // rozszerzony: kanwa zapisana jako dwie liczby 24-bitowe „o jeden mniej”
      return {
        szerokosc: (bufor[24] | (bufor[25] << 8) | (bufor[26] << 16)) + 1,
        wysokosc: (bufor[27] | (bufor[28] << 8) | (bufor[29] << 16)) + 1,
      };
    }

    return null;
  } catch {
    return null;
  } finally {
    closeSync(uchwyt);
  }
}
