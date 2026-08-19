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
 */
export default function JsonLd({ dane }: { dane: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(dane).replace(/</g, "\\u003c"),
      }}
    />
  );
}
