import type { OpisPol, PoleSekcji } from "./opis-pol";

/**
 * Co kreator pokazuje przy pisaniu LEKCJI — czyli materiału kursu,
 * który kupujący czyta po zalogowaniu.
 *
 * Ten sam mechanizm co przy sekcjach sprzedażowych (`opis-sekcji.ts`):
 * kształt tego, co WOLNO zapisać, trzyma kontrakt Zod modułu
 * (`TrescLekcji` + `MaterialLekcji`), a tutaj jest wyłącznie obsługa
 * w panelu — kontrolka, polska etykieta, podpowiedź. Rozjazd między
 * jednym a drugim wyłapuje `straznik-kreatora`: od kroku 3 pilnuje
 * także treści lekcji, nie tylko sekcji. Pole dodane do kontraktu bez
 * miejsca w panelu = czerwone CI, bo właściciel nie ma go czym
 * wypełnić.
 *
 * Czego tu NIE MA i nie będzie bez nowej decyzji właściciela: pól
 * nagrania wideo (hosting, długość filmu, napisy). Kurs jest tekstowy
 * — decyzja z 2026-08-19, docs/plugin-1/PRODUKCJA-MATERIALU-KROK-3.md.
 */

export type OpisLekcji = OpisPol & {
  nazwa: string;
  /** po co ta treść jest — właściciel ma wiedzieć, co pisze */
  cel: string;
  pola: PoleSekcji[];
};

/** Limit z kontraktu `TrescLekcji.tresc` — panel liczy do niego znaki. */
export const LIMIT_ZNAKOW = 120_000;

/** Limit z kontraktu `TrescLekcji.materialy`. */
export const LIMIT_MATERIALOW = 12;

export const OPIS_LEKCJI: OpisLekcji = {
  nazwa: "Treść lekcji",
  cel: "Materiał dla kupującego — czyta go po zalogowaniu, nie ma go na stronie sprzedażowej.",
  pola: [
    {
      pole: "tresc",
      etykieta: "Treść lekcji (Markdown)",
      typ: "akapit",
      wymagane: true,
      wiersze: 24,
      podpowiedz:
        "Markdown — dokładnie ten sam format co scenariusze w tresc-kursow/. Pusto = lekcja jeszcze bez materiału (liczniki pokazują ją jako pustą).",
      placeholder: "## Co zrobimy w tej lekcji\n\nProza, bloki terminala, prompty do skopiowania.",
    },
    {
      pole: "materialy",
      etykieta: "Materiały dodatkowe",
      typ: "lista-obiektow",
      nazwaElementu: "materiał",
      maks: LIMIT_MATERIALOW,
      podpowiedz:
        "Dodatki do lekcji: PDF, ściągawka, odsyłacz do dokumentacji. PDF jest dodatkiem, nie rdzeniem kursu.",
      pola: [
        {
          pole: "rodzaj",
          etykieta: "Rodzaj",
          typ: "wybor",
          wymagane: true,
          opcje: [
            { wartosc: "pdf", tekst: "PDF" },
            { wartosc: "plik", tekst: "Plik do pobrania" },
            { wartosc: "link", tekst: "Odsyłacz" },
          ],
        },
        {
          pole: "tytul",
          etykieta: "Tytuł",
          typ: "tekst",
          wymagane: true,
          placeholder: "Ściągawka: komendy z tej lekcji",
        },
        {
          pole: "url",
          etykieta: "Adres",
          typ: "url",
          wymagane: true,
          placeholder: "/dodatki/sciagawka.pdf",
          podpowiedz: "Ścieżka w katalogu public/ albo pełny adres — jak okładka kursu.",
        },
        { pole: "opis", etykieta: "Opis", typ: "tekst" },
      ],
    },
  ],
};
