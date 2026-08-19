"use client";

import type { WynikDyspozytora } from "@/modules/m1-sklep";

/**
 * Wystrzał AJAX z przeglądarki — JEDYNY kanał, którym kreator zmienia
 * dane (WYTYCZNE §8). Token leci automatycznie ciastkiem bramy
 * (HttpOnly), więc nie ma go w tym pliku ani nigdzie w bundlu klienta.
 *
 * Import jest `import type` — kontrakt modułu tak, kod modułu (z pg
 * i SQL-em) nigdy nie trafia do przeglądarki.
 */

export type Akcja =
  | { akcja: "zapisz"; kurs: Record<string, unknown> }
  | { akcja: "usun"; id: string }
  /** treść JEDNEJ lekcji — osobno od zapisu kursu (ładunek i ryzyko
   *  przepisania programu przy okazji pisania lekcji, patrz typy.ts) */
  | { akcja: "zapisz-tresc-lekcji"; id: string; tresc: Record<string, unknown> }
  | { akcja: "publikuj"; id: string; status?: "published" | "archived" };

export async function wystrzel(akcja: Akcja): Promise<WynikDyspozytora> {
  let odpowiedz: Response;
  try {
    odpowiedz = await fetch("/api/szkolenia", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(akcja),
    });
  } catch {
    return { ok: false, blad: "brak-polaczenia" };
  }
  try {
    return (await odpowiedz.json()) as WynikDyspozytora;
  } catch {
    return { ok: false, blad: `serwer-${odpowiedz.status}` };
  }
}

const KOMUNIKATY: Record<string, string> = {
  walidacja: "Formularz ma błędy — popraw zaznaczone pola.",
  "brak-dostepu": "Sesja kreatora wygasła. Zaloguj się tokenem ponownie.",
  "nie-znaleziono": "Tego kursu już nie ma w bazie.",
  duplikat: "Ten adres (slug) jest już zajęty przez inny kurs.",
  "nieprawidlowy-json": "Serwer nie zrozumiał żądania.",
  "brak-polaczenia": "Brak połączenia z serwerem.",
};

/** Kod błędu dyspozytora → zdanie dla właściciela. */
export function komunikat(wynik: WynikDyspozytora): string {
  if (wynik.ok) return "";
  return KOMUNIKATY[wynik.blad] ?? `Nie udało się: ${wynik.blad}`;
}

/**
 * Błędy walidacji z dyspozytora (pole → wiadomość) — formularz
 * podświetla dokładnie to pole, którego nie przyjęła baza.
 */
export function bledyPol(wynik: WynikDyspozytora): Record<string, string> {
  if (wynik.ok || !Array.isArray(wynik.szczegoly)) return {};
  const mapa: Record<string, string> = {};
  for (const s of wynik.szczegoly as Array<{ pole?: string; wiadomosc?: string }>) {
    if (s.pole) mapa[s.pole.replace(/^kurs\./, "")] = s.wiadomosc ?? "Błąd";
  }
  return mapa;
}
