import type { MetadataRoute } from "next";
import { zasob } from "@/lib/podglad";
import { MARKA } from "@/lib/seo";

/**
 * Web app manifest — plik, którego brakowało nam wobec wzoru.
 *
 * PO CO. Bez manifestu przeglądarka nie wie, czym ta witryna jest jako
 * APLIKACJA: pod jaką nazwą zapisać skrót, jakim kolorem pomalować pasek
 * systemowy przy starcie i po którą ikonę sięgnąć. Lighthouse pyta o to
 * osobno od SEO, a wzór (repo strony głównej) ma ten plik od PR #131.
 *
 * `dynamic = "force-static"` MUSI tu być — dokładnie jak w `robots.ts`
 * i `sitemap.ts`. Bez tego `output: "export"` pada na „export const
 * dynamic … not configured on route" (pułapka zapisana przy 0.24.0,
 * potwierdzona przy tym pliku).
 *
 * ŚCIEŻKI PRZEZ `zasob()`, NIE WPROST. Next aplikuje `basePath` do
 * znacznika `<link rel="manifest">`, ale NIE do TREŚCI manifestu — więc
 * przy podglądzie na GitHub Pages (`/szkolenia-podglad`) `"/icon-192.png"`
 * wskazywałoby na korzeń domeny, czyli na 404. To ta sama klasa błędu,
 * dla której `cover_url` z bazy przechodzi przez `zasob()`.
 */
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `Szkolenia — ${MARKA}`,
    short_name: "Szkolenia",
    description:
      "Kursy Automatic AI — praktyczna wiedza o AI, agentach i automatyzacji procesów.",
    // Wejściem jest KATALOG, nie korzeń: pod korzeniem podstrony nie ma
    // nic, co byłoby produktem — a skrót ma otwierać to, po co klient go
    // zakładał.
    start_url: zasob("/szkolenia"),
    display: "standalone",
    background_color: "#08090b",
    theme_color: "#08090b",
    icons: [
      { src: zasob("/icon.svg"), sizes: "any", type: "image/svg+xml" },
      /*
       * Rastry z `node tools/ikony-marki.mjs`. Samo SVG nie wystarcza:
       * Android przy instalacji skrótu sięga po PNG, a bez wariantu
       * `maskable` dokłada własne tło i przycina znak własną maską.
       */
      { src: zasob("/icon-192.png"), sizes: "192x192", type: "image/png" },
      { src: zasob("/icon-512.png"), sizes: "512x512", type: "image/png" },
      {
        src: zasob("/icon-maskable.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
