import type { OpisPol, PoleSekcji, PoleProste } from "./opis-pol";

/**
 * Treść opisana polami — co pokazać w pustym formularzu, co wysłać do
 * bazy i czego jeszcze brakuje. Obsługuje KAŻDY opis pól: sekcje
 * sprzedażowe (`opis-sekcji.ts`) i treść lekcji (`opis-lekcji.ts`).
 *
 * Logika siedzi OSOBNO od komponentów, bo to ona decyduje, czy treść
 * właściciela dojdzie do bazy w całości — a takie rzeczy chcemy mieć
 * pokryte testem i goldenem, nie klikaniem po panelu.
 *
 * Zasada czyszczenia: puste pole opcjonalne NIE jedzie do bazy (żeby
 * strona nie renderowała pustych akapitów i pustych list), a puste pole
 * obowiązkowe jedzie jak stoi — niech odrzuci je walidacja Zod
 * dyspozytora i wróci czytelnym błędem przy tym polu.
 */

export type Tresc = Record<string, unknown>;

const pustyTekst = (w: unknown) => typeof w === "string" && w.trim() === "";

/**
 * Pusta wartość pola prostego. Lista zamknięta („wybor") dostaje
 * PIERWSZĄ opcję, nie pustkę: kontrakt trzyma tam enum, więc pusty
 * string i tak nie przeszedłby walidacji, a właściciel zobaczyłby błąd
 * przy polu, którego nawet nie tknął.
 */
function pustaWartoscProstego(pole: PoleProste): string {
  return pole.typ === "wybor" ? (pole.opcje?.[0]?.wartosc ?? "") : "";
}

/** Świeży element listy obiektów — używa go też panel przy „Dodaj". */
export function pustyElement(pola: PoleProste[]): Record<string, unknown> {
  return Object.fromEntries(pola.map((p) => [p.pole, pustaWartoscProstego(p)]));
}

function pustaWartoscPola(pole: PoleSekcji): unknown {
  switch (pole.typ) {
    case "lista-tekstow":
      return [];
    case "lista-obiektow":
      return [];
    case "obiekt":
      return pustyElement(pole.pola);
    default:
      return pustaWartoscProstego(pole);
  }
}

/**
 * Czy element listy/obiektu jest ZACZĘTY. Pola „wybor" się nie liczą —
 * mają wartość od pierwszej chwili (patrz wyżej), więc świeżo dodany,
 * jeszcze niewypełniony materiał wyglądałby przez nie na rozpoczęty
 * i pojechałby do bazy jako pusty wpis zamiast po cichu wypaść.
 */
function zaczety(pola: PoleProste[], element: Record<string, unknown> | undefined): boolean {
  return pola
    .filter((p) => p.typ !== "wybor")
    .some((p) => !pustyTekst(element?.[p.pole]) && element?.[p.pole] !== undefined);
}

/** Świeża, pusta treść sekcji — wszystkie pola widoczne od razu. */
export function pustaTresc(opis: OpisPol): Tresc {
  return Object.fromEntries(opis.pola.map((p) => [p.pole, pustaWartoscPola(p)]));
}

/**
 * Treść z bazy → stan formularza. Braki uzupełniamy pustymi wartościami,
 * żeby edytor pokazał WSZYSTKIE pola rodzaju, także te dodane do
 * kontraktu już po zapisaniu kursu.
 */
export function trescDoFormularza(opis: OpisPol, zBazy: unknown): Tresc {
  const zrodlo = (zBazy ?? {}) as Tresc;
  const wynik: Tresc = {};
  for (const pole of opis.pola) {
    const wartosc = zrodlo[pole.pole];
    if (wartosc === undefined || wartosc === null) {
      wynik[pole.pole] = pustaWartoscPola(pole);
      continue;
    }
    // Kształt z bazy bierzemy z ograniczonym zaufaniem: to JSONB, a do
    // bazy pisze też seed i (kiedyś) ręczny SQL. Wartość w złym
    // kształcie zamieniamy na pustą — edytor ma pozwolić NAPRAWIĆ taki
    // rekord, a nie wysypać się przy jego wczytywaniu.
    if (pole.typ === "obiekt") {
      const obiekt =
        typeof wartosc === "object" && !Array.isArray(wartosc)
          ? (wartosc as Record<string, unknown>)
          : {};
      wynik[pole.pole] = Object.fromEntries(
        pole.pola.map((p) => [p.pole, obiekt[p.pole] ?? pustaWartoscProstego(p)])
      );
    } else if (pole.typ === "lista-obiektow") {
      const lista = Array.isArray(wartosc)
        ? (wartosc as Array<Record<string, unknown>>)
        : [];
      wynik[pole.pole] = lista.map((el) =>
        Object.fromEntries(
          pole.pola.map((p) => [p.pole, (el ?? {})[p.pole] ?? pustaWartoscProstego(p)])
        )
      );
    } else if (pole.typ === "lista-tekstow") {
      wynik[pole.pole] = Array.isArray(wartosc)
        ? wartosc.map((t) => String(t ?? ""))
        : [];
    } else {
      wynik[pole.pole] = typeof wartosc === "string" ? wartosc : "";
    }
  }
  return wynik;
}

/** Czyści obiekt zagnieżdżony: puste pola opcjonalne wypadają. */
function oczyscObiekt(
  pola: PoleProste[],
  wartosc: Record<string, unknown>
): Record<string, unknown> {
  const wynik: Record<string, unknown> = {};
  for (const p of pola) {
    const w = wartosc?.[p.pole];
    if (pustyTekst(w) && !p.wymagane) continue;
    wynik[p.pole] = typeof w === "string" ? w.trim() : (w ?? "");
  }
  return wynik;
}

/** Stan formularza → treść wysyłana do bazy (bez pustych opcjonalnych). */
export function oczyscTresc(opis: OpisPol, stan: Tresc): Tresc {
  const wynik: Tresc = {};

  for (const pole of opis.pola) {
    const wartosc = stan[pole.pole];

    if (pole.typ === "lista-tekstow") {
      const lista = ((wartosc as string[]) ?? [])
        .map((t) => t.trim())
        .filter((t) => t !== "");
      if (lista.length === 0 && !pole.wymagane) continue;
      wynik[pole.pole] = lista;
      continue;
    }

    if (pole.typ === "lista-obiektow") {
      const lista = ((wartosc as Array<Record<string, unknown>>) ?? [])
        // element pusty w każdym polu = niedokończony wpis, nie treść
        .filter((el) => zaczety(pole.pola, el))
        .map((el) => oczyscObiekt(pole.pola, el));
      if (lista.length === 0 && !pole.wymagane) continue;
      wynik[pole.pole] = lista;
      continue;
    }

    if (pole.typ === "obiekt") {
      const obiekt = (wartosc as Record<string, unknown>) ?? {};
      const wypelniony = zaczety(pole.pola, obiekt);
      if (!wypelniony && !pole.wymagane) continue;
      wynik[pole.pole] = oczyscObiekt(pole.pola, obiekt);
      continue;
    }

    if (pustyTekst(wartosc) && !pole.wymagane) continue;
    wynik[pole.pole] = typeof wartosc === "string" ? wartosc.trim() : wartosc;
  }

  return wynik;
}

/**
 * Czego brakuje, żeby sekcja była kompletna — po polach OBOWIĄZKOWYCH
 * (wymagalność pilnuje straznik-kreatora, więc lustrzanie odbija Zod).
 * Kreator pokazuje to jako stan sekcji, zanim właściciel kliknie zapis.
 */
export function brakujacePola(opis: OpisPol, stan: Tresc): string[] {
  const braki: string[] = [];

  for (const pole of opis.pola) {
    const wartosc = stan[pole.pole];

    // Pole OPCJONALNE, ale ZACZĘTE, musi być dokończone: obiekt `link`
    // autora z samą etykietą i bez adresu przechodzi przez „opcjonalne",
    // a kontrakt go odrzuci — sekcja świeciłaby „gotowa", a zapis by
    // padał. Pusty w całości → nadal opcjonalny, zero hałasu.
    if (!pole.wymagane) {
      if (pole.typ === "obiekt") {
        const obiekt = (wartosc as Record<string, unknown>) ?? {};
        if (
          zaczety(pole.pola, obiekt) &&
          pole.pola.some((p) => p.wymagane && pustyTekst(obiekt[p.pole]))
        ) {
          braki.push(pole.etykieta);
        }
      } else if (pole.typ === "lista-obiektow") {
        const lista = (wartosc as Array<Record<string, unknown>>) ?? [];
        const zaczete = lista.filter((el) => zaczety(pole.pola, el));
        if (
          zaczete.some((el) =>
            pole.pola.some((p) => p.wymagane && pustyTekst(el?.[p.pole]))
          )
        ) {
          braki.push(pole.etykieta);
        }
      }
      continue;
    }

    if (pole.typ === "lista-tekstow") {
      const lista = ((wartosc as string[]) ?? []).filter((t) => t?.trim());
      if (lista.length === 0) braki.push(pole.etykieta);
      continue;
    }
    if (pole.typ === "lista-obiektow") {
      const lista = ((wartosc as Array<Record<string, unknown>>) ?? []).filter(
        (el) => pole.pola.every((p) => !p.wymagane || !pustyTekst(el?.[p.pole]))
      );
      if (lista.length === 0) braki.push(pole.etykieta);
      continue;
    }
    if (pole.typ === "obiekt") {
      const obiekt = (wartosc as Record<string, unknown>) ?? {};
      if (pole.pola.some((p) => p.wymagane && pustyTekst(obiekt[p.pole]))) {
        braki.push(pole.etykieta);
      }
      continue;
    }
    if (typeof wartosc !== "string" || wartosc.trim() === "") {
      braki.push(pole.etykieta);
    }
  }

  return braki;
}
