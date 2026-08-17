import localFont from "next/font/local";

/*
 * Fonty Geist z LOKALNYCH subsetów przez next/font/local — dokładnie
 * wzorzec strony głównej (lib/fonts.ts), pliki skopiowane z jej repo
 * (licencja SIL OFL). NIE używamy pakietu `geist`: jego klasy CSS
 * potrafiły różnić się między renderem serwera a klienta i wywalały
 * błąd hydratacji na <html> (rejestr/znane-bledy.json: BLAD-001;
 * nawrotów pilnuje straznik-fontow).
 */

export const GeistSansSubset = localFont({
  src: "../assets/fonts/Geist-subset.woff2",
  variable: "--font-geist-sans",
  display: "swap",
  weight: "400 700",
  fallback: [
    "ui-sans-serif",
    "system-ui",
    "-apple-system",
    "Segoe UI",
    "Roboto",
    "Helvetica Neue",
    "Arial",
    "sans-serif",
  ],
});

export const GeistMonoSubset = localFont({
  src: "../assets/fonts/GeistMono-subset.woff2",
  variable: "--font-geist-mono",
  display: "swap",
  weight: "400 700",
  fallback: [
    "ui-monospace",
    "SFMono-Regular",
    "Menlo",
    "Consolas",
    "Liberation Mono",
    "monospace",
  ],
});
