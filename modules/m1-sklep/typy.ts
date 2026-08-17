import { z } from "zod";

/**
 * Kontrakty modułu m1-sklep — walidacja Zod na KAŻDEJ granicy
 * (DIAGRAM D3): wejście dyspozytora (AJAX) i kształt danych oddawanych
 * kanałem JSON. Typy TS wyprowadzane ze schematów — jedna prawda.
 */

export const KursTyp = z.enum(["ebook", "kurs"]);
export const KursStatus = z.enum(["draft", "published", "archived"]);
export const SekcjaRodzaj = z.enum([
  "hero",
  "benefits",
  "for_whom",
  "faq",
  "guarantee",
  "opinions",
  "package",
  "author",
  "problem",
  "positioning",
  "transformation",
  "comparison",
]);

/* ————— kanał JSON (odczyt serwerowy) ————— */

export const KartaKursu = z.object({
  id: z.uuid(),
  slug: z.string(),
  title: z.string(),
  type: KursTyp,
  short_desc: z.string().nullable(),
  price_grosze: z.int().nonnegative(),
  cover_url: z.string().nullable(),
  status: KursStatus,
});
export type KartaKursu = z.infer<typeof KartaKursu>;

/** Poziom trudności kursu (kolumna courses.level, migracja 004). */
export const PoziomKursu = z.enum([
  "podstawowy",
  "sredniozaawansowany",
  "zaawansowany",
]);

/**
 * Karta katalogu premium: karta + statystyki liczone w bazie
 * (moduły/lekcje/łączny czas) + badge i poziom z kolumn kursu.
 */
export const KartaKatalogu = KartaKursu.extend({
  badge: z.string().nullable(),
  level: PoziomKursu.nullable(),
  modules_count: z.int().nonnegative(),
  lessons_count: z.int().nonnegative(),
  total_min: z.int().nonnegative(),
});
export type KartaKatalogu = z.infer<typeof KartaKatalogu>;

export const LekcjaKursu = z.object({
  id: z.uuid(),
  position: z.int().nonnegative(),
  title: z.string(),
  duration_min: z.int().positive().nullable(),
  preview: z.boolean(),
});

export const ModulKursu = z.object({
  id: z.uuid(),
  position: z.int().nonnegative(),
  title: z.string(),
  summary: z.string().nullable(),
  lessons: z.array(LekcjaKursu),
});

export const SekcjaKursu = z.object({
  id: z.uuid(),
  kind: SekcjaRodzaj,
  position: z.int().nonnegative(),
  content: z.record(z.string(), z.unknown()),
});

export const SzczegolyKursu = KartaKursu.extend({
  badge: z.string().nullable(),
  level: PoziomKursu.nullable(),
  sections: z.array(SekcjaKursu),
  modules: z.array(ModulKursu),
});
export type SzczegolyKursu = z.infer<typeof SzczegolyKursu>;

/* ————— treść sekcji strony sprzedażowej (content JSONB) —————
 * Strona parsuje content przez safeParse — sekcja o złym kształcie
 * jest pomijana zamiast wysadzać render (dane wpisze kreator w D6). */

export const TrescHero = z.object({
  /** nagłówek nad tytułem kursu, np. obietnica efektu */
  obietnica: z.string(),
  /** krótkie rozwinięcie pod tytułem */
  rozwiniecie: z.string().optional(),
  /** jednozdaniowe „dla kogo" w hero (brief CDS: hero odpowiada od razu) */
  dla_kogo: z.string().optional(),
});

export const TrescKorzysci = z.object({
  punkty: z.array(
    z.object({ tytul: z.string(), opis: z.string().optional() })
  ),
});

export const TrescDlaKogo = z.object({
  punkty: z.array(z.string()),
  /** uczciwe „to NIE jest dla Ciebie, jeśli…" — wzorzec z analizy wzoru */
  nie_dla: z.array(z.string()).optional(),
});

export const TrescPakiet = z.object({
  punkty: z.array(
    z.object({ tytul: z.string(), opis: z.string().optional() })
  ),
  /** kotwica cenowa — z czym porównać cenę kursu */
  kotwica: z.string().optional(),
});

export const TrescAutor = z.object({
  imie: z.string(),
  rola: z.string().optional(),
  bio: z.string(),
  atuty: z.array(z.string()).optional(),
});

/** „Dlaczego ten kurs" — sprzedajemy zmianę: problem → rozwiązanie → rezultat. */
export const TrescProblem = z.object({
  wstep: z.string(),
  problem: z.string(),
  rozwiazanie: z.string(),
  rezultat: z.string(),
});

/** „To NIE jest / to JEST" — pozycjonowanie produktu. */
export const TrescPozycjonowanie = z.object({
  nie_jest: z.array(z.string()),
  jest: z.array(z.string()),
});

/** Efekt przed / po — transformacja klienta. */
export const TrescTransformacja = z.object({
  przed: z.array(z.string()),
  po: z.array(z.string()),
});

/** Samodzielna nauka vs kurs — porównanie bez taniego marketingu. */
export const TrescPorownanie = z.object({
  alternatywa_nazwa: z.string(),
  alternatywa: z.array(z.string()),
  kurs: z.array(z.string()),
});

export const TrescOpinie = z.object({
  opinie: z.array(
    z.object({
      tekst: z.string(),
      autor: z.string(),
      rola: z.string().optional(),
    })
  ),
});

export const TrescGwarancja = z.object({
  naglowek: z.string(),
  tekst: z.string(),
});

export const TrescFaq = z.object({
  pytania: z.array(
    z.object({ pytanie: z.string(), odpowiedz: z.string() })
  ),
});

/* ————— kanał AJAX (wystrzał — akcje dyspozytora) ————— */

const SekcjaWejscie = z.object({
  kind: SekcjaRodzaj,
  position: z.int().nonnegative(),
  content: z.record(z.string(), z.unknown()).default({}),
});

const LekcjaWejscie = z.object({
  position: z.int().nonnegative(),
  title: z.string().min(1),
  duration_min: z.int().positive().nullish(),
  preview: z.boolean().default(false),
});

const ModulWejscie = z.object({
  position: z.int().nonnegative(),
  title: z.string().min(1),
  summary: z.string().nullish(),
  lessons: z.array(LekcjaWejscie).default([]),
});

export const KursWejscie = z.object({
  /** brak id = nowy kurs; id = edycja istniejącego */
  id: z.uuid().optional(),
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "slug: tylko małe litery, cyfry i myślniki"),
  title: z.string().min(1).max(200),
  type: KursTyp,
  short_desc: z.string().max(500).nullish(),
  price_grosze: z.int().nonnegative(),
  cover_url: z.string().max(500).nullish(),
  badge: z.string().max(40).nullish(),
  level: PoziomKursu.nullish(),
  /** podanie tablicy = pełna podmiana sekcji/modułów kursu */
  sections: z.array(SekcjaWejscie).optional(),
  modules: z.array(ModulWejscie).optional(),
});

export const AkcjaDyspozytora = z.discriminatedUnion("akcja", [
  z.object({ akcja: z.literal("zapisz"), token: z.string(), kurs: KursWejscie }),
  z.object({ akcja: z.literal("usun"), token: z.string(), id: z.uuid() }),
  z.object({
    akcja: z.literal("publikuj"),
    token: z.string(),
    id: z.uuid(),
    status: KursStatus.exclude(["draft"]).default("published"),
  }),
]);
export type AkcjaDyspozytora = z.infer<typeof AkcjaDyspozytora>;

/** Odpowiedź dyspozytora — zawsze ten sam kształt. */
export type WynikDyspozytora =
  | { ok: true; akcja: AkcjaDyspozytora["akcja"]; id: string }
  | { ok: false; blad: string; szczegoly?: unknown };
