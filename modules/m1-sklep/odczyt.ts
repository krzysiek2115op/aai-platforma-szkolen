import { pulaDb1 } from "./db/klient.ts";
import { KartaKatalogu, KartaKreatora, SzczegolyKursu } from "./typy.ts";

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

/**
 * Katalog /szkolenia: wyłącznie kursy opublikowane, najnowsze pierwsze.
 * Karta premium — statystyki (moduły/lekcje/czas) liczy baza, nie strona.
 */
export async function listaKursow(): Promise<KartaKatalogu[]> {
  const { rows } = await pulaDb1().query(
    `SELECT c.id, c.slug, c.title, c.type, c.short_desc, c.price_grosze,
            c.cover_url, c.status, c.badge, c.level,
            count(DISTINCT m.id)::int  AS modules_count,
            count(l.id)::int           AS lessons_count,
            COALESCE(sum(l.duration_min), 0)::int AS total_min
     FROM courses c
     LEFT JOIN course_modules m ON m.course_id = c.id
     LEFT JOIN course_lessons l ON l.module_id = m.id
     WHERE c.status = 'published'
     GROUP BY c.id
     ORDER BY c.created_at DESC`
  );
  return rows.map((r) => KartaKatalogu.parse(r));
}

/**
 * Kreator: wszystkie kursy niezależnie od statusu, z licznikami treści.
 * Liczy baza — kreator nigdy nie zgaduje, ile kurs ma już materiału.
 */
export async function listaKursowKreatora(): Promise<KartaKreatora[]> {
  const { rows } = await pulaDb1().query(
    `SELECT c.id, c.slug, c.title, c.type, c.short_desc, c.price_grosze,
            c.cover_url, c.status, c.badge, c.level, c.updated_at,
            (SELECT count(*) FROM course_sections s WHERE s.course_id = c.id)::int
              AS sections_count,
            (SELECT count(*) FROM course_modules m WHERE m.course_id = c.id)::int
              AS modules_count,
            (SELECT count(*) FROM course_lessons l
              JOIN course_modules m ON m.id = l.module_id
              WHERE m.course_id = c.id)::int AS lessons_count
     FROM courses c
     ORDER BY c.updated_at DESC`
  );
  return rows.map((r) => KartaKreatora.parse(r));
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
  const { rows } = await pulaDb1().query(
    `SELECT ${KOLUMNY_KARTY}, badge, level FROM courses
     WHERE slug = $1 ${opcje.takzeSzkice ? "" : "AND status = 'published'"}`,
    [slug]
  );
  return rows[0] ? dolozTresc(rows[0]) : null;
}

/**
 * Kreator edytuje kurs po id (slug bywa właśnie zmieniany, więc nie
 * nadaje się na klucz edycji) i widzi kurs w każdym statusie.
 */
export async function szczegolyKursuPoId(
  id: string
): Promise<SzczegolyKursu | null> {
  const { rows } = await pulaDb1().query(
    `SELECT ${KOLUMNY_KARTY}, badge, level FROM courses WHERE id = $1`,
    [id]
  );
  return rows[0] ? dolozTresc(rows[0]) : null;
}

/** Wspólny rdzeń obu odczytów: do wiersza kursu dokłada sekcje i program. */
async function dolozTresc(
  kurs: Record<string, unknown>
): Promise<SzczegolyKursu> {
  const pula = pulaDb1();
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
