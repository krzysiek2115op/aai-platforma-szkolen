import type { SekcjaRodzajNazwa } from "@/modules/m1-sklep";

/**
 * Co kreator pokazuje dla każdego rodzaju sekcji sprzedażowej.
 *
 * Kształt treści (co WOLNO zapisać) opisują schematy Zod w module —
 * `SCHEMATY_SEKCJI`. Ten plik mówi tylko, jak te pola OBSŁUŻYĆ w panelu:
 * jaka kontrolka, jaka etykieta po polsku, jaka podpowiedź. Rozjazd
 * między jednym a drugim (pole dodane do kontraktu, zapomniane
 * w kreatorze) wyłapuje `tools/straznicy/straznik-kreatora.mjs` —
 * właściciel nie może stracić dostępu do pola, które strona renderuje.
 *
 * KOLEJNOŚĆ na liście = kolejność sekcji na stronie sprzedażowej
 * (app/szkolenia/[slug]/page.tsx). Strona bierze po JEDNEJ sekcji
 * każdego rodzaju i układa je w stałym porządku wynikającym
 * z psychologii scrolla (brief D5) — dlatego kreator nie udaje, że
 * kolejność da się przestawiać.
 */

import type { OpisPol, PoleProste, PoleSekcji } from "./opis-pol";

/** Typy opisu pól mieszkają w opis-pol.ts — dzieli je z opisem lekcji. */
export type { OpisPol, PoleProste, PoleSekcji };

export type OpisSekcji = {
  rodzaj: SekcjaRodzajNazwa;
  nazwa: string;
  /** po co ta sekcja jest na stronie — właściciel ma wiedzieć, co pisze */
  cel: string;
  pola: PoleSekcji[];
};

export const OPIS_SEKCJI: OpisSekcji[] = [
  {
    rodzaj: "hero",
    nazwa: "Hero — pierwszy ekran",
    cel: "Pierwsze 3 sekundy: obietnica efektu, nie opis produktu.",
    pola: [
      {
        pole: "obietnica",
        etykieta: "Obietnica",
        typ: "tekst",
        wymagane: true,
        placeholder: "Zamień Claude w narzędzie, które realnie skraca Twoją pracę",
        podpowiedz: "Nagłówek nad tytułem kursu — efekt, nie temat.",
      },
      {
        pole: "rozwiniecie",
        etykieta: "Rozwinięcie",
        typ: "akapit",
        podpowiedz: "Jedno–dwa zdania pod tytułem: co konkretnie dostaje kupujący.",
      },
      {
        pole: "dla_kogo",
        etykieta: "Dla kogo (jedno zdanie)",
        typ: "tekst",
        podpowiedz: "Hero ma od razu odpowiadać, czy to kurs dla tej osoby.",
      },
    ],
  },
  {
    rodzaj: "problem",
    nazwa: "Dlaczego ten kurs",
    cel: "Sprzedajemy zmianę: problem → rozwiązanie → rezultat.",
    pola: [
      { pole: "wstep", etykieta: "Wstęp", typ: "akapit", wymagane: true },
      {
        pole: "problem",
        etykieta: "Problem",
        typ: "akapit",
        wymagane: true,
        podpowiedz: "Sytuacja, którą czytelnik rozpozna u siebie.",
      },
      { pole: "rozwiazanie", etykieta: "Rozwiązanie", typ: "akapit", wymagane: true },
      {
        pole: "rezultat",
        etykieta: "Rezultat",
        typ: "akapit",
        wymagane: true,
        podpowiedz: "Stan PO kursie — mierzalny, nie ogólnikowy.",
      },
    ],
  },
  {
    rodzaj: "benefits",
    nazwa: "Korzyści",
    cel: "Co kupujący będzie UMIAŁ, nie co jest w środku.",
    pola: [
      {
        pole: "punkty",
        etykieta: "Korzyści",
        typ: "lista-obiektow",
        nazwaElementu: "korzyść",
        wymagane: true,
        pola: [
          { pole: "tytul", etykieta: "Tytuł", typ: "tekst", wymagane: true },
          { pole: "opis", etykieta: "Opis", typ: "akapit" },
        ],
      },
    ],
  },
  {
    rodzaj: "package",
    nazwa: "Co otrzymujesz (oferta)",
    cel: "Konkret za cenę + kotwica cenowa i zdanie domykające nad CTA.",
    pola: [
      {
        pole: "punkty",
        etykieta: "Elementy pakietu",
        typ: "lista-obiektow",
        nazwaElementu: "element",
        wymagane: true,
        pola: [
          { pole: "tytul", etykieta: "Tytuł", typ: "tekst", wymagane: true },
          { pole: "opis", etykieta: "Opis", typ: "akapit" },
        ],
      },
      {
        pole: "kotwica",
        etykieta: "Kotwica cenowa",
        typ: "akapit",
        podpowiedz: "Z czym porównać cenę, żeby wyglądała na to, czym jest.",
      },
      {
        pole: "w_cenie",
        etykieta: "W cenie",
        typ: "lista-tekstow",
        nazwaElementu: "pozycja",
        podpowiedz: "Warunki zakupu pokazywane przy cenie (np. dostęp bezterminowy).",
      },
      {
        pole: "domkniecie",
        etykieta: "Zdanie domykające",
        typ: "akapit",
        podpowiedz: "Ostatnie zdanie tuż nad przyciskiem zakupu.",
      },
    ],
  },
  {
    rodzaj: "positioning",
    nazwa: "To NIE jest / to JEST",
    cel: "Ucina złe oczekiwania, zanim staną się zwrotem pieniędzy.",
    pola: [
      {
        pole: "nie_jest",
        etykieta: "To NIE jest",
        typ: "lista-tekstow",
        nazwaElementu: "punkt",
        wymagane: true,
      },
      {
        pole: "jest",
        etykieta: "To JEST",
        typ: "lista-tekstow",
        nazwaElementu: "punkt",
        wymagane: true,
      },
    ],
  },
  {
    rodzaj: "for_whom",
    nazwa: "Dla kogo",
    cel: "Kto skorzysta — i uczciwie: kto nie.",
    pola: [
      {
        pole: "punkty",
        etykieta: "Kurs jest dla Ciebie, jeśli…",
        typ: "lista-tekstow",
        nazwaElementu: "punkt",
        wymagane: true,
      },
      {
        pole: "nie_dla",
        etykieta: "To NIE jest dla Ciebie, jeśli…",
        typ: "lista-tekstow",
        nazwaElementu: "punkt",
        podpowiedz: "Uczciwe odsianie buduje zaufanie mocniej niż obietnice.",
      },
    ],
  },
  {
    rodzaj: "transformation",
    nazwa: "Przed / po",
    cel: "Ta sama osoba przed kursem i po nim.",
    pola: [
      {
        pole: "przed",
        etykieta: "Przed",
        typ: "lista-tekstow",
        nazwaElementu: "punkt",
        wymagane: true,
      },
      {
        pole: "po",
        etykieta: "Po",
        typ: "lista-tekstow",
        nazwaElementu: "punkt",
        wymagane: true,
      },
    ],
  },
  {
    rodzaj: "opinions",
    nazwa: "Opinie",
    cel: "Dowód społeczny — konkretna osoba, konkretny efekt.",
    pola: [
      {
        pole: "opinie",
        etykieta: "Opinie",
        typ: "lista-obiektow",
        nazwaElementu: "opinia",
        wymagane: true,
        pola: [
          { pole: "tekst", etykieta: "Treść opinii", typ: "akapit", wymagane: true },
          { pole: "autor", etykieta: "Autor", typ: "tekst", wymagane: true },
          { pole: "rola", etykieta: "Rola / firma", typ: "tekst" },
        ],
      },
    ],
  },
  {
    rodzaj: "author",
    nazwa: "Autor",
    cel: "Dlaczego akurat Ty uczysz tego tematu.",
    pola: [
      { pole: "imie", etykieta: "Imię i nazwisko", typ: "tekst", wymagane: true },
      { pole: "rola", etykieta: "Rola", typ: "tekst", placeholder: "Twórca Automatic AI" },
      { pole: "bio", etykieta: "Bio", typ: "akapit", wymagane: true },
      {
        pole: "cytat",
        etykieta: "Osobisty powód stworzenia kursu",
        typ: "akapit",
        podpowiedz: "Buduje zaufanie mocniej niż lista osiągnięć.",
      },
      {
        pole: "atuty",
        etykieta: "Atuty",
        typ: "lista-tekstow",
        nazwaElementu: "atut",
      },
      {
        pole: "czym_sie_zajmuje",
        etykieta: "Czym się zajmuję na co dzień",
        typ: "lista-tekstow",
        nazwaElementu: "obszar",
      },
      {
        pole: "link",
        etykieta: "Link z dowodami",
        typ: "obiekt",
        podpowiedz: "Np. portfolio. Zostaw puste, jeśli nie chcesz linku.",
        pola: [
          {
            pole: "url",
            etykieta: "Adres",
            typ: "url",
            wymagane: true,
            placeholder: "https://automaticai.pl",
          },
          {
            pole: "etykieta",
            etykieta: "Napis na linku",
            typ: "tekst",
            wymagane: true,
            placeholder: "Zobacz realizacje",
          },
        ],
      },
    ],
  },
  {
    rodzaj: "guarantee",
    nazwa: "Gwarancja",
    cel: "Zdejmuje ryzyko z kupującego.",
    pola: [
      { pole: "naglowek", etykieta: "Nagłówek", typ: "tekst", wymagane: true },
      { pole: "tekst", etykieta: "Treść", typ: "akapit", wymagane: true },
    ],
  },
  {
    rodzaj: "comparison",
    nazwa: "Porównanie z alternatywą",
    cel: "Uczciwe zestawienie z samodzielną nauką lub innym rozwiązaniem.",
    pola: [
      {
        pole: "alternatywa_nazwa",
        etykieta: "Nazwa alternatywy",
        typ: "tekst",
        wymagane: true,
        placeholder: "Nauka na własną rękę",
      },
      {
        pole: "alternatywa",
        etykieta: "Alternatywa — jak to wygląda",
        typ: "lista-tekstow",
        nazwaElementu: "punkt",
        wymagane: true,
      },
      {
        pole: "kurs",
        etykieta: "Ten kurs — jak to wygląda",
        typ: "lista-tekstow",
        nazwaElementu: "punkt",
        wymagane: true,
      },
    ],
  },
  {
    rodzaj: "faq",
    nazwa: "FAQ",
    cel: "Ostatnie obiekcje przed zakupem.",
    pola: [
      {
        pole: "pytania",
        etykieta: "Pytania",
        typ: "lista-obiektow",
        nazwaElementu: "pytanie",
        wymagane: true,
        pola: [
          { pole: "pytanie", etykieta: "Pytanie", typ: "tekst", wymagane: true },
          { pole: "odpowiedz", etykieta: "Odpowiedź", typ: "akapit", wymagane: true },
        ],
      },
    ],
  },
];

/** Szybki dostęp po rodzaju — używa go edytor i golden. */
export const OPIS_WG_RODZAJU = new Map(OPIS_SEKCJI.map((o) => [o.rodzaj, o]));
