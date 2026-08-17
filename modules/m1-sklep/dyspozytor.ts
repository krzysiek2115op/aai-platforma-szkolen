import type { PoolClient } from "pg";
import { pulaDb1 } from "./db/klient.ts";
import {
  AkcjaDyspozytora,
  type WynikDyspozytora,
} from "./typy.ts";

/**
 * DYSPOZYTOR — jedyny kanał AJAX Pluginu 1 (WYTYCZNE §8: „wystrzał",
 * jedna baza = JEDEN AJAX). Strony mówią mu, jakiej akcji potrzebują
 * (zapisz / usun / publikuj), a on oddaje JSON właściwej stronie.
 * Drugi endpoint AJAX dotykający bazy nie ma prawa powstać —
 * pilnuje straznik-ajax.
 *
 * Akcje są rozdzielone ostro (osobne funkcje, osobne transakcje) —
 * awaria jednej nie kładzie pozostałych. Każda operacja zostawia ślad
 * w course_changelog przez triggery (audyt z Działu 2) z aktorem
 * ustawianym per transakcja.
 *
 * Dostęp: tymczasowo prosty token (KREATOR_TOKEN w .env) — pełne
 * uwierzytelnianie da Plugin 3 (PLAN §2.3).
 */

function tokenPoprawny(token: string): boolean {
  const wzorzec = process.env.KREATOR_TOKEN;
  return Boolean(wzorzec) && token === wzorzec;
}

/** Transakcja z aktorem audytu — triggery zapisują, KTO zmienił. */
async function wTransakcji<T>(
  aktor: string,
  praca: (klient: PoolClient) => Promise<T>
): Promise<T> {
  const klient = await pulaDb1().connect();
  try {
    await klient.query("BEGIN");
    await klient.query("SELECT set_config('app.actor', $1, true)", [aktor]);
    const wynik = await praca(klient);
    await klient.query("COMMIT");
    return wynik;
  } catch (blad) {
    await klient.query("ROLLBACK");
    throw blad;
  } finally {
    klient.release();
  }
}

type AkcjaZapisz = Extract<AkcjaDyspozytora, { akcja: "zapisz" }>;

async function zapisz(dane: AkcjaZapisz, aktor: string): Promise<string> {
  const { kurs } = dane;
  return wTransakcji(aktor, async (k) => {
    let id: string;
    if (kurs.id) {
      const { rows } = await k.query(
        `UPDATE courses SET slug=$2, title=$3, type=$4, short_desc=$5,
                            price_grosze=$6, cover_url=$7, badge=$8, level=$9
         WHERE id=$1 RETURNING id`,
        [
          kurs.id,
          kurs.slug,
          kurs.title,
          kurs.type,
          kurs.short_desc ?? null,
          kurs.price_grosze,
          kurs.cover_url ?? null,
          kurs.badge ?? null,
          kurs.level ?? null,
        ]
      );
      if (rows.length === 0) throw new BladDyspozytora("nie-znaleziono");
      id = rows[0].id;
    } else {
      const { rows } = await k.query(
        `INSERT INTO courses (slug, title, type, short_desc, price_grosze,
                              cover_url, badge, level)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [
          kurs.slug,
          kurs.title,
          kurs.type,
          kurs.short_desc ?? null,
          kurs.price_grosze,
          kurs.cover_url ?? null,
          kurs.badge ?? null,
          kurs.level ?? null,
        ]
      );
      id = rows[0].id;
    }

    // Tablica w wejściu = pełna podmiana (kreator zawsze wysyła całość).
    if (kurs.sections) {
      await k.query("DELETE FROM course_sections WHERE course_id=$1", [id]);
      for (const s of kurs.sections) {
        await k.query(
          `INSERT INTO course_sections (course_id, kind, position, content)
           VALUES ($1, $2, $3, $4)`,
          [id, s.kind, s.position, JSON.stringify(s.content)]
        );
      }
    }
    if (kurs.modules) {
      // Od dołu (lekcje → moduły), nie kaskadą: trigger audytu lekcji
      // wylicza course_id z ISTNIEJĄCEGO jeszcze modułu — wpis w
      // changelogu zawsze wskazuje kurs. Kaskada FK zostaje jako
      // siatka bezpieczeństwa.
      await k.query(
        `DELETE FROM course_lessons
         WHERE module_id IN (SELECT id FROM course_modules WHERE course_id=$1)`,
        [id]
      );
      await k.query("DELETE FROM course_modules WHERE course_id=$1", [id]);
      for (const m of kurs.modules) {
        const {
          rows: [{ id: modulId }],
        } = await k.query(
          `INSERT INTO course_modules (course_id, position, title, summary)
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [id, m.position, m.title, m.summary ?? null]
        );
        for (const l of m.lessons) {
          await k.query(
            `INSERT INTO course_lessons (module_id, position, title, duration_min, preview)
             VALUES ($1, $2, $3, $4, $5)`,
            [modulId, l.position, l.title, l.duration_min ?? null, l.preview]
          );
        }
      }
    }
    return id;
  });
}

async function usun(id: string, aktor: string): Promise<string> {
  return wTransakcji(aktor, async (k) => {
    // Jawnie od dołu zamiast kaskady — każdy wpis audytu zna kurs
    // (por. komentarz w zapisz()).
    await k.query(
      `DELETE FROM course_lessons
       WHERE module_id IN (SELECT id FROM course_modules WHERE course_id=$1)`,
      [id]
    );
    await k.query("DELETE FROM course_modules WHERE course_id=$1", [id]);
    await k.query("DELETE FROM course_sections WHERE course_id=$1", [id]);
    const { rows } = await k.query(
      "DELETE FROM courses WHERE id=$1 RETURNING id",
      [id]
    );
    if (rows.length === 0) throw new BladDyspozytora("nie-znaleziono");
    return rows[0].id;
  });
}

async function publikuj(
  id: string,
  status: string,
  aktor: string
): Promise<string> {
  return wTransakcji(aktor, async (k) => {
    const { rows } = await k.query(
      "UPDATE courses SET status=$2 WHERE id=$1 RETURNING id",
      [id, status]
    );
    if (rows.length === 0) throw new BladDyspozytora("nie-znaleziono");
    return rows[0].id;
  });
}

class BladDyspozytora extends Error {}

/**
 * Jedyne wejście dyspozytora. Przyjmuje surowy JSON (unknown!),
 * waliduje Zod-em i rozdziela akcje. Nigdy nie rzuca — zawsze
 * zwraca WynikDyspozytora (strona dostaje czytelny błąd, nie 500).
 */
export async function obsluzAkcje(
  wejscie: unknown,
  opcje: { aktor?: string } = {}
): Promise<WynikDyspozytora> {
  // NAJPIERW dostęp, potem kształt: obcy nie dostaje w odpowiedzi mapy
  // pól kontraktu (i nie odróżnia „zły token" od „brak tokenu").
  const surowe = wejscie as { token?: unknown } | null;
  const token = typeof surowe?.token === "string" ? surowe.token : "";
  if (!tokenPoprawny(token)) {
    return { ok: false, blad: "brak-dostepu" };
  }

  const parsowanie = AkcjaDyspozytora.safeParse(wejscie);
  if (!parsowanie.success) {
    return {
      ok: false,
      blad: "walidacja",
      szczegoly: parsowanie.error.issues.map((i) => ({
        pole: i.path.join("."),
        kod: i.code,
        wiadomosc: i.message,
      })),
    };
  }
  const akcja = parsowanie.data;

  const aktor = opcje.aktor ?? "kreator";
  try {
    switch (akcja.akcja) {
      case "zapisz":
        return { ok: true, akcja: "zapisz", id: await zapisz(akcja, aktor) };
      case "usun":
        return { ok: true, akcja: "usun", id: await usun(akcja.id, aktor) };
      case "publikuj":
        return {
          ok: true,
          akcja: "publikuj",
          id: await publikuj(akcja.id, akcja.status, aktor),
        };
    }
  } catch (blad) {
    if (blad instanceof BladDyspozytora) {
      return { ok: false, blad: blad.message };
    }
    // Konflikt unikalności (np. slug zajęty) — czytelnie dla kreatora.
    if (
      typeof blad === "object" &&
      blad !== null &&
      (blad as { code?: string }).code === "23505"
    ) {
      return { ok: false, blad: "duplikat", szczegoly: String((blad as Error).message) };
    }
    throw blad; // prawdziwa awaria — niech route odda 500 i trafi do logów
  }
}
