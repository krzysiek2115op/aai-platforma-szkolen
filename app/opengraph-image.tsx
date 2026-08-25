import { obrazOgOgolny, ROZMIAR_OG } from "@/components/seo/ObrazOgOgolny";
import { MARKA } from "@/lib/seo";

/**
 * Miniatura Open Graph korzenia. Rysunek jest wspólny z katalogiem —
 * uzasadnienie i cała grafika: components/seo/ObrazOgOgolny.tsx.
 */
export const dynamic = "force-static";
export const alt = `Szkolenia — ${MARKA}`;
export const size = ROZMIAR_OG;
export const contentType = "image/png";

export default function ObrazOg() {
  return obrazOgOgolny();
}
