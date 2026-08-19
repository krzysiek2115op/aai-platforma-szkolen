import { zasob } from "@/lib/podglad";

/*
 * Fonty Geist z LOKALNYCH subsetów (public/fonts, licencja SIL OFL obok
 * plików) — własny @font-face + jawny preload, już NIE next/font/local.
 *
 * DLACZEGO NIE next/font/local. Nie emituje `<link rel="preload">`
 * w tym projekcie w ogóle (sprawdzone w obu trybach: serwerowym
 * i statycznym — manifest .next/server/next-font-manifest.json zna
 * pliki, znacznik nie powstaje). Font jechał więc łańcuchem
 * HTML → CSS → font i dojeżdżał PO pierwszym malowaniu, a podmiana
 * przemalowywała tekst. Skutki zmierzone na serwerach Google (PSI):
 * CLS 0,14–0,17 na desktopie (statystyki hero łamały się na dwie
 * linie fontem zastępczym i wskakiwały w jedną Geistem — widać to
 * na klatkach filmu z pomiaru) i LCP ~2,0 s na mobile (FCP 1,05 s,
 * LCP dopiero przy przemalowaniu tekstu). Lighthouse podpisał
 * przyczynę wprost: „Web font loaded".
 *
 * DLACZEGO WŁASNY @font-face NIE grozi nawrotem BLAD-001. Tamten błąd
 * brał się z klas CSS pakietu `geist`, RÓŻNYCH między renderem serwera
 * i klienta (mismatch hydratacji na <html>). Tu żadnych klas nie ma:
 * rodziny wchodzą stałą nazwą przez --font-sans/--font-mono
 * w globals.css, a <html> nie nosi już nic od fontów. Pakiet `geist`
 * dalej blokuje straznik-fontow.
 *
 * ZASTĘPNIKI Z KOREKTĄ METRYK. Wartości ascent/descent/size-adjust są
 * przepisane 1:1 z tego, co generował next/font (liczone z metryk
 * realnych plików .woff2). Stoją na local(Arial) — tam, gdzie Ariala
 * nie ma (Linux, w tym serwery pomiarowe Google), korekta przepada
 * i stos leci dalej. Dlatego rdzeniem naprawy jest preload, a korekta
 * metryk tylko siatką bezpieczeństwa na wolne łącza.
 *
 * Adresy przechodzą przez zasob(): w podglądzie statycznym pliki
 * z public/ żyją pod basePath GitHub Pages (jak okładki kursów).
 */

/** Pliki do `<link rel="preload">` w layoucie — oba fonty, bo oba są nad zgięciem (nagłówki sans + statystyki mono). */
export const PLIKI_FONTOW = [
  zasob("/fonts/Geist-subset.woff2"),
  zasob("/fonts/GeistMono-subset.woff2"),
] as const;

/** Deklaracje @font-face — layout wstrzykuje je raz, React hoistuje do <head>. */
export const FONT_FACE_CSS = `
@font-face {
  font-family: "Geist";
  src: url(${PLIKI_FONTOW[0]}) format("woff2");
  font-display: swap;
  font-weight: 400 700;
}
@font-face {
  font-family: "Geist Fallback";
  src: local("Arial");
  ascent-override: 94.56%;
  descent-override: 27.76%;
  line-gap-override: 0%;
  size-adjust: 106.28%;
}
@font-face {
  font-family: "Geist Mono";
  src: url(${PLIKI_FONTOW[1]}) format("woff2");
  font-display: swap;
  font-weight: 400 700;
}
@font-face {
  font-family: "Geist Mono Fallback";
  src: local("Arial");
  ascent-override: 76.43%;
  descent-override: 22.43%;
  line-gap-override: 0%;
  size-adjust: 131.49%;
}
`;
