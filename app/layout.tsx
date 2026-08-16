import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import Navbar from "@/components/Navbar";
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
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body>
        <a href="#tresc" className="skip-link">
          Przejdź do treści
        </a>
        <Navbar />
        <main id="tresc">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
