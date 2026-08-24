/**
 * Opis POLA formularza kreatora — wspólny język panelu.
 *
 * Kreator nie ma osobnych formularzy dla każdego rodzaju treści: jest
 * jeden komplet kontrolek (`PolaOpisane.tsx`), a o tym, co się rysuje,
 * decyduje LISTA OPISÓW PÓL. Do Działu 6 taką listą był wyłącznie opis
 * sekcji sprzedażowych (`opis-sekcji.ts`); od kroku 3 dochodzi opis
 * treści lekcji (`opis-lekcji.ts`), więc typy przeniosły się tutaj —
 * żeby opis lekcji nie musiał importować z opisu sekcji, z którym nie
 * ma nic wspólnego poza kształtem.
 *
 * Ten plik NIE mówi, co WOLNO zapisać — to robią schematy Zod modułu
 * (`SCHEMATY_SEKCJI`, `TrescLekcji`). Rozjazd między kontraktem
 * a panelem wyłapuje `tools/straznicy/straznik-kreatora.mjs`.
 */

export type PoleProste = {
  pole: string;
  etykieta: string;
  /** „wybor" = lista zamknięta (kontrakt trzyma enum) — wymaga `opcje` */
  typ: "tekst" | "akapit" | "url" | "wybor";
  podpowiedz?: string;
  wymagane?: boolean;
  placeholder?: string;
  /** wyłącznie dla `typ: "wybor"` */
  opcje?: Array<{ wartosc: string; tekst: string }>;
  /** wysokość pola „akapit" — treść lekcji to nie jest dwuzdaniowy opis */
  wiersze?: number;
};

export type PoleSekcji =
  | PoleProste
  | {
      pole: string;
      etykieta: string;
      typ: "lista-tekstow";
      podpowiedz?: string;
      wymagane?: boolean;
      placeholder?: string;
      nazwaElementu: string;
    }
  | {
      pole: string;
      etykieta: string;
      typ: "lista-obiektow";
      podpowiedz?: string;
      wymagane?: boolean;
      nazwaElementu: string;
      pola: PoleProste[];
      /** górna granica z kontraktu — panel przestaje pozwalać dodawać.
       *  To uprzejmość wobec piszącego, PRAWDĄ zostaje `.max()` w Zod. */
      maks?: number;
    }
  | {
      pole: string;
      etykieta: string;
      typ: "obiekt";
      podpowiedz?: string;
      wymagane?: boolean;
      pola: PoleProste[];
    };

/**
 * Cokolwiek, co da się wyrenderować i oczyścić opisem pól: sekcja
 * sprzedażowa, treść lekcji, a jutro dowolna następna warstwa treści.
 */
export type OpisPol = { pola: PoleSekcji[] };
