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
});

export const TrescKorzysci = z.object({
  punkty: z.array(
    z.object({ tytul: z.string(), opis: z.string().optional() })
  ),
});

export const TrescDlaKogo = z.object({
  punkty: z.array(z.string()),
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
