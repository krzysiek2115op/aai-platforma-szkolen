import { listaKursow } from "@/modules/m1-sklep";

/**
 * STRONA KURSU — wariant PODGLĄDU STATYCZNEGO.
 *
 * Treść w ./widok.tsx; tutaj lista stron do wyprodukowania i twarde
 * domknięcie zbioru adresów.
 */
export { default, generateMetadata } from "./widok";

/**
 * Podgląd zna WYŁĄCZNIE slugi z listy niżej — każdy inny adres oddaje
 * 404 z pliku. `output: "export"` i tak nie wspiera `dynamicParams: true`
 * (nie ma serwera, który dorenderowałby brakującą stronę), więc mówimy
 * to wprost, zamiast liczyć na domyślne zachowanie.
 */
export const dynamicParams = false;

/**
 * Adresy stron bierzemy z BAZY, nie z listy w kodzie — i to z dokładnie
 * tego samego wywołania co katalog (`listaKursow`). Dzięki temu podgląd
 * nie może pokazać w siatce kursu, którego strona nie istnieje, ani
 * odwrotnie. Szkice nie wchodzą: kanał JSON ich nie wydaje, a podgląd
 * jest zawsze widokiem gościa (lib/kreator-dostep.ts).
 */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const kursy = await listaKursow();
  return kursy.map((kurs) => ({ slug: kurs.slug }));
}
