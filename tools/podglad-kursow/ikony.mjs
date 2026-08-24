/**
 * Ikony jako wklejony SVG.
 *
 * Strona sprzedażowa bierze ikony z `lucide-react` — ale to komponenty
 * Reacta, więc w statycznym HTML-u nie istnieją. Dokładanie biblioteki
 * ikon do podglądu łamałoby wprost wytyczną wydajnościową właściciela
 * („minimalna liczba nowych assetów, żadnych ciężkich bibliotek"), a
 * pobieranie sprite'a to dodatkowe żądanie na każdą stronę.
 *
 * Kształty są przerysowane z tego samego zestawu (Lucide, ISC) i mają te
 * same parametry rysunku co ikony na stronie: siatka 24, `stroke-width: 2`,
 * zaokrąglone końce. Dzięki temu ikona w widoku kursu wygląda jak ikona na
 * stronie sprzedażowej, mimo że nie przechodzi przez Reacta.
 */

const OTOCZKA =
  'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';

const KSZTALTY = {
  strzalkaPrawo: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  strzalkaLewo: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
  szewron: '<path d="m6 9 6 6 6-6"/>',
  ptaszek: '<path d="M20 6 9 17l-5-5"/>',
  play: '<path d="m6 3 14 9-14 9V3z"/>',
  cel: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  iskra:
    '<path d="M9.94 14.06 2 22"/><path d="M14 6.5 15.5 3 17 6.5 20.5 8 17 9.5 15.5 13 14 9.5 10.5 8z"/><path d="m6 14 1 2.5L9.5 18 7 19l-1 2.5L5 19l-2.5-1L5 16.5z"/>',
  terminal: '<path d="m4 17 6-6-6-6"/><path d="M12 19h8"/>',
  kompas:
    '<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>',
  klucz:
    '<path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/><circle cx="12" cy="12" r="4"/>',
  most: '<path d="M6 20V10"/><path d="M18 20V10"/><path d="M2 10h20"/><path d="M12 20V4"/><path d="M4 20h16"/>',
  pytanie:
    '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  kopiuj:
    '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  lista: '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',
  ksiazka:
    '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
};

/**
 * Sygnet Automatic AI — „A złożone z dwóch modułów i impulsu”.
 *
 * Przepisany co do współrzędnej z `components/brand/AutomaticMark.tsx`
 * (wariant `mono`, czyli impuls w kolorze bieżącym), bo to ZNAK MARKI:
 * przybliżenie w rodzaju „dwie kreski i poprzeczka” byłoby innym logo.
 * Ma własny viewBox 48×48 i pełne wypełnienia, więc nie mieści się
 * w otoczce ikon kreskowych.
 */
const ZNAK = `<svg viewBox="0 0 48 48" aria-hidden="true">
<path d="M8 43 L26.5 4.5" fill="none" stroke="currentColor" stroke-width="5.2" stroke-linecap="butt"/>
<path d="M23.21 14.38 L40 43" fill="none" stroke="currentColor" stroke-width="5.2" stroke-linecap="butt"/>
<rect x="12.8" y="26.2" width="22.2" height="5.4" fill="currentColor"/>
</svg>`;

/** Jedna ikona jako gotowy string SVG. */
export function ikona(nazwa) {
  if (nazwa === "znak") return ZNAK;
  const ksztalt = KSZTALTY[nazwa];
  if (!ksztalt) throw new Error(`nie znam ikony „${nazwa}”`);
  return `<svg ${OTOCZKA}>${ksztalt}</svg>`;
}
