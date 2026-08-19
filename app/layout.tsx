import type { Metadata, Viewport } from "next";
import { FONT_FACE_CSS, PLIKI_FONTOW } from "@/lib/fonts";
import NavbarPrzelacznik from "@/components/NavbarPrzelacznik";
import Footer from "@/components/Footer";
import JsonLd from "@/components/seo/JsonLd";
import { organizacja } from "@/lib/jsonld";
import { ADRES_BAZOWY, INDEKSOWANIE, MARKA } from "@/lib/seo";
import "./globals.css";

const OPIS =
  "Kursy i ebooki Automatic AI — praktyczna wiedza o AI, agentach i automatyzacji procesów.";

/*
 * Tytuł DOMYŚLNY — dla stron, które nie ustawiają własnego. Sam katalog
 * i strony kursów mają swoje (app/szkolenia/widok.tsx, [slug]/widok.tsx),
 * więc ten wchodzi na stronę wejściową.
 *
 * Opisuje temat, a nie kategorię: „Szkolenia — Automatic AI" (24 znaki)
 * nie mówiło wyszukiwarce ani człowiekowi nic o tym, czego uczymy —
 * audyt SEO na żywym adresie zgłosił go jako za krótki.
 *
 * Dotyczy WYŁĄCZNIE tej podstrony. Tytuł strony głównej Automatic AI
 * żyje w jej własnym repozytorium, które jest u nas tylko do odczytu.
 */
const TYTUL_DOMYSLNY = `Szkolenia z AI i automatyzacji procesów — ${MARKA}`;

export const metadata: Metadata = {
  metadataBase: new URL(ADRES_BAZOWY),
  title: {
    default: TYTUL_DOMYSLNY,
    // Strony kursów podstawiają własną nazwę: „Jak poprawnie korzystać
    // z Claude — Automatic AI". Szablon zostaje bez zmian, bo tytuł
    // kursu sam w sobie niesie temat.
    template: `%s — ${MARKA}`,
  },
  description: OPIS,
  // Indeksowanie DOMYŚLNIE WYŁĄCZONE — treść stron sprzedażowych jest
  // jeszcze robocza, a opinie to jawne placeholdery. Decyduje jedna
  // stała (lib/seo.ts), wspólna z robots.txt i sitemapą; trzy niezależne
  // ustawienia prędzej czy później powiedziałyby co innego.
  robots: INDEKSOWANIE
    ? { index: true, follow: true }
    : { index: false, follow: false },
  openGraph: {
    type: "website",
    siteName: MARKA,
    locale: "pl_PL",
    title: TYTUL_DOMYSLNY,
    description: OPIS,
  },
  twitter: { card: "summary_large_image", title: TYTUL_DOMYSLNY, description: OPIS },
};

export const viewport: Viewport = { themeColor: "#08090b" };

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pl"
      // Inline skrypt niżej dokłada klasę `js` do <html> PRZED hydratacją
      // (wyłącznik bezpieczeństwa animacji) — bez tego tłumika React
      // zgłasza mismatch atrybutów na <html> (BLAD-001); wzorzec 1:1
      // ze strony głównej.
      suppressHydrationWarning
    >
      <body>
        {/*
          Fonty: preload PRZED wszystkim + własny @font-face (lib/fonts.ts —
          tam pełne uzasadnienie). React hoistuje oba do <head>, więc font
          jedzie równolegle z CSS zamiast po nim; bez preloadu podmiana
          fontu przesuwała układ (CLS 0,14 na desktopie) i opóźniała LCP
          na mobile (~2,0 s przy FCP 1,05 s) — zmierzone przez PSI.
          crossOrigin obowiązkowy: pobrania fontów są zawsze CORS-owe,
          bez niego przeglądarka ściąga plik DRUGI raz.
        */}
        {PLIKI_FONTOW.map((href) => (
          <link
            key={href}
            rel="preload"
            as="font"
            type="font/woff2"
            href={href}
            crossOrigin="anonymous"
          />
        ))}
        <style href="geist-font-face" precedence="default">
          {FONT_FACE_CSS}
        </style>
        {/*
          Wyłącznik bezpieczeństwa animacji (wzorzec strony głównej):
          klasa `js` włącza stany ukryte animacji wejść; jeśli hydratacja
          nie potwierdzi się w 4 s (template.tsx ustawia data-hydrated),
          klasa znika i treść jest widoczna bez animacji.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){var d=document.documentElement;d.classList.add('js');" +
              "setTimeout(function(){if(!d.hasAttribute('data-hydrated'))" +
              "d.classList.remove('js')},4000)})()",
          }}
        />
        {/* Wizytówka marki — jedna na cały serwis, nie po jednej na stronę. */}
        <JsonLd dane={organizacja()} />
        <a href="#tresc" className="skip-link">
          Przejdź do treści
        </a>
        <NavbarPrzelacznik />
        <main id="tresc">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
