import type { Metadata, Viewport } from "next";
import { GeistSansSubset, GeistMonoSubset } from "@/lib/fonts";
import NavbarPrzelacznik from "@/components/NavbarPrzelacznik";
import Footer from "@/components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Szkolenia — MatthewPlugins.pl",
    template: "%s — MatthewPlugins.pl",
  },
  description:
    "Kursy i ebooki MatthewPlugins — praktyczna wiedza o AI, agentach i automatyzacji procesów.",
  // Aplikacja przedprodukcyjna (localhost/VPS testowy) — indeksowanie
  // włączymy dopiero po merge do strony głównej.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#08090b" };

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pl"
      className={`${GeistSansSubset.variable} ${GeistMonoSubset.variable}`}
      // Inline skrypt niżej dokłada klasę `js` do <html> PRZED hydratacją
      // (wyłącznik bezpieczeństwa animacji) — bez tego tłumika React
      // zgłasza mismatch atrybutów na <html> (BLAD-001); wzorzec 1:1
      // ze strony głównej.
      suppressHydrationWarning
    >
      <body>
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
