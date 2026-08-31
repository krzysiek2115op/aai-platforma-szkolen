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
 *
 * SPROSTOWANIE (2026-08-31, pomiar). Ten komentarz obiecywał wcześniej, że
 * „prawdziwą datę zmiany treści (`courses.updated_at`) wprowadzimy razem
 * z kanałem, który ją wydaje". To była nieprawda o naszym własnym
 * schemacie: trigger `m1_updated_at` ustawia `now()` przy KAŻDYM `UPDATE`
 * wiersza kursu, bez porównania starej i nowej wartości, a siedzi WYŁĄCZNIE
 * na tabeli `courses` — więc poprawka prozy lekcji, czyli jedyna zmiana,
 * która czytelnika obchodzi, w ogóle go nie dotyka. Ta data jest naraz
 * zawyżona (każdy zapis ceny ją podbija) i zaniżona (73 lekcje mogą się
 * zmienić bez śladu). Nie ma jej więc czym zastąpić `new Date()`.
 * Prawdziwą datę dałoby się wyprowadzić z dziennika audytu (migracja 007
 * zapisuje wyłącznie realne zmiany) — decyzja właściciela 2026-08-31:
 * nie robimy tego, mapa zostaje bez `lastModified`.
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
