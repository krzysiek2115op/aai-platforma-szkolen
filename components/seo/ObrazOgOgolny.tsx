import { ImageResponse } from "next/og";
import { Sygnet } from "@/components/brand/SygnetOg";

/**
 * Rysunek ogólnej miniatury Open Graph — JEDEN dla wszystkich tras, które
 * nie mają własnej (korzeń i katalog `/szkolenia`).
 *
 * DLACZEGO KOMPONENT, A NIE DWA PLIKI TRAS. Bo konwencja plikowa Next
 * NIE dziedziczy się w dół: trasa `/szkolenia` nie dostała obrazka
 * z `app/opengraph-image.tsx` i szła w świat bez miniatury, mimo że
 * korzeń ją miał. Sprawdzone w zbudowanym HTML-u, nie założone. Dwie
 * cienkie trasy nad wspólnym rysunkiem to jedyny sposób, żeby obie
 * miały obrazek i żeby nie dało się ich rozjechać.
 *
 * BEZ WŁASNEGO KROJU — świadomie. `next/og` musiałby wczytywać plik
 * kroju przy każdej generacji, a mamy subsety Geista w woff2, którego
 * Satori nie czyta. Krój systemowy jest tu akceptowalnym kompromisem:
 * to obrazek podglądu, nie element identyfikacji.
 *
 * Satori wstawia spację MIĘDZY każde dwa elementy rzędu flex — przy
 * „Automatic" + „AI" jest to dokładnie potrzebny odstęp międzywyrazowy,
 * więc NIE dokładać tu `gap` (podwoiłby się).
 */
export const ROZMIAR_OG = { width: 1200, height: 630 };

/* Kolory marki wpisane WPROST — Satori nie zna zmiennych CSS. */
const VOLT = "#BFFF38";
const VOID = "#08090B";
const STEEL = "#8F929C";
const FG = "#F5F5F5";

export function obrazOgOgolny() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          backgroundColor: VOID,
          backgroundImage:
            "linear-gradient(rgba(245,245,245,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(245,245,245,0.05) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Sygnet rozmiar={56} />
          <div style={{ display: "flex", fontSize: 36, fontWeight: 600 }}>
            <span style={{ color: FG }}>Automatic</span>
            <span style={{ color: VOLT }}>AI</span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 88,
            fontWeight: 700,
            letterSpacing: "-4px",
            lineHeight: 1.05,
            color: FG,
          }}
        >
          <span>Szkolenia, które zamieniają</span>
          <div style={{ display: "flex" }}>
            <span>AI w przewagę</span>
            <span style={{ color: VOLT }}>.</span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 26,
          }}
        >
          <span style={{ color: STEEL }}>Systemy pracy z Claude i GitHubem</span>
          <span style={{ color: VOLT }}>automaticai.pl/szkolenia</span>
        </div>
      </div>
    ),
    ROZMIAR_OG
  );
}
