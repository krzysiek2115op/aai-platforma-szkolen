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

/**
 * Karta na liście kreatora: kurs w KAŻDYM statusie + licznik tego, co
 * już w nim jest (sekcje/moduły/lekcje). Właściciel na jednym ekranie
 * widzi, który kurs jest pusty, a który gotowy do publikacji.
 */
export const KartaKreatora = KartaKursu.extend({
  badge: z.string().nullable(),
  level: PoziomKursu.nullable(),
  updated_at: z.date(),
  sections_count: z.int().nonnegative(),
  modules_count: z.int().nonnegative(),
  lessons_count: z.int().nonnegative(),
  /** ile lekcji ma już napisaną treść — postęp największej roboty
   *  kroku 3 widoczny bez wchodzenia w kurs */
  lessons_tresc_count: z.int().nonnegative(),
});
export type KartaKreatora = z.infer<typeof KartaKreatora>;

export const LekcjaKursu = z.object({
  id: z.uuid(),
  position: z.int().nonnegative(),
  title: z.string(),
  /** ile zajmie PRZEROBIENIE lekcji (decyzja właściciela 2026-08-19:
   *  kurs jest tekstowy, więc to nie jest długość filmu) */
  duration_min: z.int().positive().nullable(),
  preview: z.boolean(),
  /** czy lekcja ma już treść — SAMA flaga, nigdy tekst: strona
   *  sprzedażowa i katalog nie mają prawa ciągnąć materiału zza
   *  logowania (i nie zapłacą za to wydajnością) */
  ma_tresc: z.boolean(),
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
  /** konkrety warunków zakupu pokazywane w sekcji oferty (co w cenie) */
  w_cenie: z.array(z.string()).optional(),
  /** zdanie domykające ofertę tuż nad CTA */
  domkniecie: z.string().optional(),
});

export const TrescAutor = z.object({
  imie: z.string(),
  rola: z.string().optional(),
  bio: z.string(),
  atuty: z.array(z.string()).optional(),
  /** osobisty powód stworzenia kursu — buduje zaufanie mocniej niż bio */
  cytat: z.string().optional(),
  /** czym zajmuje się na co dzień: konkretne obszary pracy */
  czym_sie_zajmuje: z.array(z.string()).optional(),
  /** dokąd zajrzeć po dowody (np. portfolio) */
  link: z.object({ url: z.url(), etykieta: z.string() }).optional(),
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

/**
 * Rodzaj sekcji → jej schemat treści. JEDNA prawda dla obu stron:
 * strona sprzedażowa parsuje tym `content` z bazy, a kreator z tego
 * samego miejsca wie, jakie pola pokazać. Nowy rodzaj sekcji dopisany
 * do `SekcjaRodzaj` bez wpisu tutaj nie skompiluje się (Record wymaga
 * kompletu), a bez edytora — nie przejdzie `straznik-kreatora`.
 */
export const SCHEMATY_SEKCJI = {
  hero: TrescHero,
  problem: TrescProblem,
  benefits: TrescKorzysci,
  package: TrescPakiet,
  positioning: TrescPozycjonowanie,
  for_whom: TrescDlaKogo,
  transformation: TrescTransformacja,
  opinions: TrescOpinie,
  author: TrescAutor,
  guarantee: TrescGwarancja,
  comparison: TrescPorownanie,
  faq: TrescFaq,
} as const satisfies Record<z.infer<typeof SekcjaRodzaj>, z.ZodObject>;

export type SekcjaRodzajNazwa = keyof typeof SCHEMATY_SEKCJI;

/* ————— treść lekcji (materiał kursu, kolumny z migracji 006) —————
 * Decyzja właściciela z 2026-08-19: kurs jest TEKSTOWY (lekcje na
 * platformie za logowaniem + PDF jako dodatek), więc kontrakt nagrania
 * wideo tu NIE POWSTAJE — żadnego hostingu, długości filmu ani napisów.
 * Uzasadnienie i odrzucone opcje: docs/plugin-1/PRODUKCJA-MATERIALU-KROK-3.md. */

/** Dodatek do lekcji: ściągawka, workbook, odsyłacz do dokumentacji. */
export const MaterialLekcji = z.object({
  rodzaj: z.enum(["pdf", "plik", "link"]),
  tytul: z.string().min(1).max(160),
  /** adres pliku w `public/` albo pełny URL — jak okładka kursu
   *  (decyzja właściciela z D6: adres, nie wgrywanie) */
  url: z.string().min(1).max(500),
  opis: z.string().max(400).optional(),
});
export type MaterialLekcji = z.infer<typeof MaterialLekcji>;

/**
 * Treść jednej lekcji. Markdown, bo tym są scenariusze z D7 i tym
 * będzie import do WordPressa — konwersja po drodze byłaby stratą.
 *
 * Limit 120 000 znaków to ~66 stron znormalizowanych na lekcję, przy
 * najdłuższej dzisiejszej lekcji poniżej 20 000. Bierze się z limitu
 * rozmiaru żądania (krok 2), nie z fantazji.
 */
export const TrescLekcji = z.object({
  tresc: z.string().max(120_000),
  materialy: z.array(MaterialLekcji).max(12).default([]),
});
export type TrescLekcji = z.infer<typeof TrescLekcji>;

/** Co kreator dostaje, otwierając lekcję do pisania. */
export const LekcjaZTrescia = z.object({
  id: z.uuid(),
  title: z.string(),
  tresc: z.string(),
  materialy: z.array(MaterialLekcji),
});
export type LekcjaZTrescia = z.infer<typeof LekcjaZTrescia>;

/* ————— kanał AJAX (wystrzał — akcje dyspozytora) ————— */

/**
 * Sekcja z kreatora. `content` NIE jest workiem na cokolwiek: musi
 * przejść schemat SWOJEGO rodzaju.
 *
 * DLACZEGO TAK OSTRO. Strona sprzedażowa czyta sekcje przez safeParse
 * i po cichu pomija te o złym kształcie — to dobra decyzja dla strony
 * (jeden zły rekord nie wysadza całego kursu), ale fatalna jako jedyna
 * kontrola: zapis „przechodził", a sekcja znikała ze strony bez słowa
 * wyjaśnienia. Teraz zła treść nie ma prawa wejść do bazy, a kreator
 * dostaje ścieżkę do konkretnego pola.
 */
const SekcjaWejscie = z
  .object({
    kind: SekcjaRodzaj,
    position: z.int().nonnegative(),
    content: z.record(z.string(), z.unknown()).default({}),
  })
  .superRefine((sekcja, ctx) => {
    const wynik = SCHEMATY_SEKCJI[sekcja.kind].safeParse(sekcja.content);
    if (wynik.success) return;
    for (const problem of wynik.error.issues) {
      ctx.addIssue({
        code: "custom",
        path: ["content", ...problem.path],
        message: problem.message,
      });
    }
  });

/**
 * DLACZEGO LEKCJA I MODUŁ MAJĄ `id`. Do 0.26.0 zapis programu robił
 * pełną podmianę (DELETE + INSERT), więc każdy zapis nadawał lekcjom
 * NOWE identyfikatory. Póki lekcja była samym tytułem, nie bolało.
 * Od chwili, gdy wisi na niej treść kursu (migracja 006), byłaby to
 * pułapka na utratę danych: przestawienie kolejności modułów kasowałoby
 * dorobek 91 lekcji. Kreator odsyła więc id wczytanych wierszy, a
 * dyspozytor je AKTUALIZUJE; znikają tylko te, których w wejściu nie ma.
 * Brak id = nowy wiersz (tak dodaje się lekcję w panelu).
 */
const LekcjaWejscie = z.object({
  id: z.uuid().optional(),
  position: z.int().nonnegative(),
  title: z.string().min(1),
  duration_min: z.int().positive().nullish(),
  preview: z.boolean().default(false),
});

const ModulWejscie = z.object({
  id: z.uuid().optional(),
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
  /**
   * Treść lekcji jedzie OSOBNĄ akcją, nie w zapisie kursu. Powód jest
   * dwojaki: ładunek (41 lekcji tekstu to setki kilobajtów w jednym
   * żądaniu, przy limicie rozmiaru ciała z kroku 2) i ryzyko (pisanie
   * lekcji nie ma prawa przepisywać przy okazji całego programu).
   */
  z.object({
    akcja: z.literal("zapisz-tresc-lekcji"),
    token: z.string(),
    id: z.uuid(),
    tresc: TrescLekcji,
  }),
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
