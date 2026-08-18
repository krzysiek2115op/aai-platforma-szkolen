import { obrazOgOgolny, ROZMIAR_OG } from "@/components/seo/ObrazOgOgolny";
import { MARKA } from "@/lib/seo";

/**
 * Miniatura Open Graph KATALOGU.
 *
 * Istnieje osobno, bo konwencja plikowa Next nie dziedziczy się w dół:
 * bez tego pliku `/szkolenia` szło w świat bez miniatury, choć korzeń
 * ją miał. Rysunek wspólny: components/seo/ObrazOgOgolny.tsx.
 */
export const dynamic = "force-static";
export const alt = `Szkolenia — ${MARKA}`;
export const size = ROZMIAR_OG;
export const contentType = "image/png";

export default function ObrazOgKatalogu() {
  return obrazOgOgolny();
}
