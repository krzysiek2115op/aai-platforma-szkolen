import { pulaDb1 } from "./db/klient.ts";
import { KartaKursu, SzczegolyKursu } from "./typy.ts";

/**
 * Kanał JSON — odczyt serwerowy (WYTYCZNE §8, doprecyzowanie 2026-08-16):
 * dział czyta bazę i oddaje stronom GOTOWE dane już przy renderowaniu
 * (katalog, strona sprzedażowa → szybciej + SEO). To NIE jest AJAX —
 * jedyny AJAX pluginu to dyspozytor (dyspozytor.ts).
 *
 * Wyjście też przechodzi walidację Zod — strona nigdy nie dostanie
 * kształtu innego niż zadeklarowany (DIAGRAM: „walidacja Zod na wejściu
 * i wyjściu").
 */

const KOLUMNY_KARTY =
  "id, slug, title, type, short_desc, price_grosze, cover_url, status";

/** Katalog /szkolenia: wyłącznie kursy opublikowane, najnowsze pierwsze. */
export async function listaKursow(): Promise<KartaKursu[]> {
  const { rows } = await pulaDb1().query(
    `SELECT ${KOLUMNY_KARTY} FROM courses
     WHERE status = 'published' ORDER BY created_at DESC`
  );
  return rows.map((r) => KartaKursu.parse(r));
}

/** Kreator: wszystkie kursy niezależnie od statusu. */
export async function listaKursowKreatora(): Promise<KartaKursu[]> {
  const { rows } = await pulaDb1().query(
    `SELECT ${KOLUMNY_KARTY} FROM courses ORDER BY created_at DESC`
  );
  return rows.map((r) => KartaKursu.parse(r));
}

/**
 * Strona sprzedażowa /szkolenia/[slug]: pełny kurs z sekcjami,
 * modułami i lekcjami. Domyślnie tylko opublikowane; kreator może
 * poprosić też o szkice.
 */
export async function szczegolyKursu(
  slug: string,
  opcje: { takzeSzkice?: boolean } = {}
): Promise<SzczegolyKursu | null> {
  const pula = pulaDb1();
  const { rows } = await pula.query(
    `SELECT ${KOLUMNY_KARTY} FROM courses
     WHERE slug = $1 ${opcje.takzeSzkice ? "" : "AND status = 'published'"}`,
    [slug]
  );
  const kurs = rows[0];
  if (!kurs) return null;

  const [sekcje, moduly] = await Promise.all([
    pula.query(
      `SELECT id, kind, position, content FROM course_sections
       WHERE course_id = $1 ORDER BY kind, position`,
      [kurs.id]
    ),
    pula.query(
      `SELECT m.id, m.position, m.title, m.summary,
              COALESCE(
                jsonb_agg(
                  jsonb_build_object(
                    'id', l.id, 'position', l.position, 'title', l.title,
                    'duration_min', l.duration_min, 'preview', l.preview
                  ) ORDER BY l.position
                ) FILTER (WHERE l.id IS NOT NULL),
                '[]'::jsonb
              ) AS lessons
       FROM course_modules m
       LEFT JOIN course_lessons l ON l.module_id = m.id
       WHERE m.course_id = $1
       GROUP BY m.id ORDER BY m.position`,
      [kurs.id]
    ),
  ]);

  return SzczegolyKursu.parse({
    ...kurs,
    sections: sekcje.rows,
    modules: moduly.rows,
  });
}
