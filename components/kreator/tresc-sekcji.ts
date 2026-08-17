import type { OpisSekcji, PoleSekcji, PoleProste } from "./opis-sekcji";

/**
 * Treść sekcji po stronie kreatora: co pokazać w pustym formularzu,
 * co wysłać do bazy i czego jeszcze brakuje.
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

function pustaWartoscPola(pole: PoleSekcji): unknown {
  switch (pole.typ) {
    case "lista-tekstow":
      return [];
    case "lista-obiektow":
      return [];
    case "obiekt":
      return Object.fromEntries(pole.pola.map((p) => [p.pole, ""]));
    default:
      return "";
  }
}

/** Świeża, pusta treść sekcji — wszystkie pola widoczne od razu. */
export function pustaTresc(opis: OpisSekcji): Tresc {
  return Object.fromEntries(opis.pola.map((p) => [p.pole, pustaWartoscPola(p)]));
}

/**
 * Treść z bazy → stan formularza. Braki uzupełniamy pustymi wartościami,
 * żeby edytor pokazał WSZYSTKIE pola rodzaju, także te dodane do
 * kontraktu już po zapisaniu kursu.
 */
export function trescDoFormularza(opis: OpisSekcji, zBazy: unknown): Tresc {
  const zrodlo = (zBazy ?? {}) as Tresc;
  const wynik: Tresc = {};
  for (const pole of opis.pola) {
    const wartosc = zrodlo[pole.pole];
    if (wartosc === undefined || wartosc === null) {
      wynik[pole.pole] = pustaWartoscPola(pole);
      continue;
    }
    if (pole.typ === "obiekt") {
      const obiekt = wartosc as Record<string, unknown>;
      wynik[pole.pole] = Object.fromEntries(
        pole.pola.map((p) => [p.pole, obiekt[p.pole] ?? ""])
      );
    } else if (pole.typ === "lista-obiektow") {
      wynik[pole.pole] = (wartosc as Array<Record<string, unknown>>).map((el) =>
        Object.fromEntries(pole.pola.map((p) => [p.pole, el[p.pole] ?? ""]))
      );
    } else {
      wynik[pole.pole] = wartosc;
    }
  }
  return wynik;
}

const pustyTekst = (w: unknown) => typeof w === "string" && w.trim() === "";

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
export function oczyscTresc(opis: OpisSekcji, stan: Tresc): Tresc {
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
        .filter((el) => pole.pola.some((p) => !pustyTekst(el?.[p.pole]) && el?.[p.pole] !== undefined))
        .map((el) => oczyscObiekt(pole.pola, el));
      if (lista.length === 0 && !pole.wymagane) continue;
      wynik[pole.pole] = lista;
      continue;
    }

    if (pole.typ === "obiekt") {
      const obiekt = (wartosc as Record<string, unknown>) ?? {};
      const wypelniony = pole.pola.some((p) => !pustyTekst(obiekt[p.pole]) && obiekt[p.pole] !== undefined);
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
export function brakujacePola(opis: OpisSekcji, stan: Tresc): string[] {
  const braki: string[] = [];

  for (const pole of opis.pola) {
    if (!pole.wymagane) continue;
    const wartosc = stan[pole.pole];

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
