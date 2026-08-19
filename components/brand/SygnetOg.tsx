/**
 * Sygnet Automatic AI dla obrazów Open Graph.
 *
 * DLACZEGO OSOBNA KOPIA ZAMIAST <AutomaticMark />: obrazy OG renderuje
 * Satori (`next/og`), które nie zna ani `currentColor`, ani zmiennych CSS
 * — kolory muszą być wpisane wprost. Geometria jest identyczna co do
 * jednostki z components/brand/AutomaticMark.tsx; zmiana znaku to zmiana
 * w OBU plikach. Wzorzec i uzasadnienie: components/brand/SygnetOg.tsx
 * w repo strony głównej.
 */
const FG = "#F5F5F5";
const VOLT = "#BFFF38";

export function Sygnet({ rozmiar, kolor = FG }: { rozmiar: number; kolor?: string }) {
  return (
    <svg width={rozmiar} height={rozmiar} viewBox="0 0 48 48">
      <path d="M8 43 L26.5 4.5" fill="none" stroke={kolor} strokeWidth="5.2" />
      <path d="M23.21 14.38 L40 43" fill="none" stroke={kolor} strokeWidth="5.2" />
      <rect x="12.8" y="26.2" width="22.2" height="5.4" fill={VOLT} />
    </svg>
  );
}
