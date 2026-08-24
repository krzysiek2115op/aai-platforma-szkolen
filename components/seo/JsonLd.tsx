import { nonceCsp } from "@/lib/csp-nonce";

/**
 * Dane strukturalne (JSON-LD) w jednym, bezpiecznym opakowaniu.
 *
 * PO CO OSOBNY KOMPONENT. Bo jedno miejsce zapisu to jedno miejsce, gdzie
 * trzeba pamiętać o ucieczce znaku `<`. Bez niej treść kursu zawierająca
 * `</script>` — a nasze kursy uczą o kodzie, więc to nie jest scenariusz
 * teoretyczny — zamknęłaby blok skryptu i wszystko po nim przeglądarka
 * potraktowałaby jako HTML. To jest wstrzyknięcie skryptu, nie literówka.
 *
 * `JSON.stringify` sam z siebie NIE ucieka `<`, dlatego robimy to tutaj.
 *
 * NONCE czytamy TUTAJ, a nie przyjmujemy we właściwości. Danych
 * strukturalnych jest pięć rodzajów w trzech plikach i dokładają się
 * kolejne — przy przekazywaniu z góry prędzej czy później ktoś by
 * o nim zapomniał, a skutkiem byłaby sekcja danych strukturalnych
 * wycięta przez politykę bez śladu w kodzie. Polityka bez `unsafe-inline`
 * dotyczy KAŻDEGO znacznika `<script>`, także takiego, którego
 * przeglądarka nie wykonuje.
 */
export default async function JsonLd({ dane }: { dane: object }) {
  const nonce = await nonceCsp();
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(dane).replace(/</g, "\\u003c"),
      }}
    />
  );
}
