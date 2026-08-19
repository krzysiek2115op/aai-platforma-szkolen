import type { MetadataRoute } from "next";
import { INDEKSOWANIE, adres } from "@/lib/seo";
import { listaKursow } from "@/modules/m1-sklep";

/**
 * Mapa strony — z BAZY, nie z listy w kodzie. To ten sam odczyt, z którego
 * korzysta katalog (`listaKursow`), więc sitemapa nie może obiecać strony,
 * której nie ma, ani pominąć kursu, który jest.
 *
 * BEZ `lastModified`. Kuszące jest wstawić tu `new Date()`, ale to byłaby
 * nieprawda przy każdym buildzie: data mówiłaby „treść się zmieniła",
 * nawet gdy zmienił się tylko CSS. Wyszukiwarki uczą się ignorować takie
 * sygnały, a my mamy zasadę zero zmyślania — dotyczy też metadanych.
 * Prawdziwą datę zmiany treści (`courses.updated_at`) wprowadzimy razem
 * z kanałem, który ją wydaje.
 *
 * Przy wyłączonym indeksowaniu mapa jest PUSTA — spójnie z robots.txt.
 */
/**
 * `output: "export"` wymaga tego jawnie — bez niego build pada na
 * „export const dynamic … not configured on route". Ta sama wartość
 * pasuje do trybu serwerowego: mapa i tak powstaje raz na build, a przy
 * wyłączonym indeksowaniu (stan domyślny, także w CI) jest pusta i NIE
 * dotyka bazy — dzięki temu `npm run build` przechodzi bez Postgresa.
 */
export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!INDEKSOWANIE) return [];

  const kursy = await listaKursow();
  return [
    { url: adres("/szkolenia"), changeFrequency: "weekly", priority: 1 },
    ...kursy.map((kurs) => ({
      url: adres(`/szkolenia/${kurs.slug}`),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
