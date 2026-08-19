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

/* ————— treść lekcji (materiał kursu, kolumny z migracji 006) —————
 * Decyzja właściciela z 2026-08-19: kurs jest TEKSTOWY (lekcje na
 * platformie za logowaniem + PDF jako dodatek), więc kontrakt nagrania
 * wideo tu NIE POWSTAJE — żadnego hostingu, długości filmu ani napisów.
 * Uzasadnienie i odrzucone opcje: docs/plugin-1/PRODUKCJA-MATERIALU-KROK-3.md.
 *
 * Kształt materiału stoi TUTAJ, w części odczytowej, bo czyta go kreator
 * (`trescLekcji`). Wejście — czyli to, co panel WYSYŁA — opisuje
 * `TrescLekcji` niżej, pod stałymi limitów, gdzie widzi je
 * `straznik-limitow`. Limitu na odczycie świadomie nie ma: dane
 * przyszły z naszej bazy, a sufit w tym miejscu kończyłby się
 * zniknięciem lekcji przy pierwszej rozbieżności.
 */

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
 * Co kreator dostaje, otwierając lekcję do pisania.
 *
 * Poza samą treścią jedzie KONTEKST (kurs, moduł, numer w programie).
 * Nie jest ozdobą: edytor lekcji to osobna trasa, więc bez tego panel
 * nie miałby jak nazwać tego, co właściciel pisze, ani dokąd wrócić —
 * a przy 91 lekcjach pomyłka o jedną lekcję kosztuje godzinę pracy.
 */
export const LekcjaZTrescia = z.object({
  id: z.uuid(),
  title: z.string(),
  tresc: z.string(),
  materialy: z.array(MaterialLekcji),
  kurs_id: z.uuid(),
  kurs_tytul: z.string(),
  modul_tytul: z.string(),
  /** numeracja jak w programie na stronie: „3.4" */
  numer: z.string(),
});
export type LekcjaZTrescia = z.infer<typeof LekcjaZTrescia>;

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

/* ————— limity wejścia —————
 *
 * Kontrakty ograniczały dotąd pola KURSU (slug 120, title 200,
 * short_desc 500), ale treść sekcji była gołym `z.string()`, a tablice
 * `sections`/`modules`/`lessons` nie miały górnej granicy. Jedyny AJAX
 * jest wystawiony na świat, więc „bez granicy" znaczyło tyle, co
 * „ile zmieści się w ciele żądania".
 *
 * Liczby nie są wzięte z sufitu — pomiar bazy z 2026-08-19: najdłuższy
 * tekst w treści sekcji ma 191 znaków, najliczniejsza lista 10 pozycji,
 * kurs ma najwyżej 12 sekcji, 7 modułów i 11 lekcji w module. Limity
 * stoją rząd wielkości wyżej: mają odcinać nadużycie, nie pracę.
 *
 * TE SAME SCHEMATY CZYTA STRONA (safeParse treści z bazy), więc limit
 * za ciasny nie objawiłby się błędem zapisu, tylko ZNIKNIĘCIEM sekcji
 * ze strony sprzedażowej. Stąd duży zapas — i stąd reguła: obniżenie
 * któregoś limitu wymaga ponownego pomiaru bazy, nie samego przeczucia.
 */
export const LIMIT_KROTKI = 200; // tytuły, etykiety, nazwy, autorzy
export const LIMIT_AKAPIT = 2000; // opisy, bio, odpowiedzi, cytaty
export const LIMIT_ADRESU = 500; // adresy (okładka, link autora)
export const LIMIT_LISTY = 50; // pozycji w liście wewnątrz sekcji
export const LIMIT_SEKCJI = 50; // sekcji na kurs (rodzajów jest 12)
export const LIMIT_MODULOW = 50; // modułów na kurs
export const LIMIT_LEKCJI = 200; // lekcji w jednym module
export const LIMIT_POZYCJI = 999; // wartość pola `position`
export const LIMIT_CZASU_MIN = 24 * 60; // lekcja nie trwa dłużej niż dobę
export const LIMIT_TOKENU = 500; // token przychodzi z sieci jak każde pole
/** 100 000 zł w groszach. Kolumna to `integer`, więc bez sufitu wartość
 *  powyżej 2 147 483 647 kończyłaby się błędem BAZY, a nie walidacji. */
export const SUFIT_CENY = 10_000_000;

const krotki = () => z.string().max(LIMIT_KROTKI);
const akapit = () => z.string().max(LIMIT_AKAPIT);
const lista = <T extends z.ZodType>(element: T) =>
  z.array(element).max(LIMIT_LISTY);

/* ————— treść sekcji strony sprzedażowej (content JSONB) —————
 * Strona parsuje content przez safeParse — sekcja o złym kształcie
 * jest pomijana zamiast wysadzać render (dane wpisuje kreator z D6). */

export const TrescHero = z.object({
  /** nagłówek nad tytułem kursu, np. obietnica efektu */
  obietnica: akapit(),
  /** krótkie rozwinięcie pod tytułem */
  rozwiniecie: akapit().optional(),
  /** jednozdaniowe „dla kogo" w hero (brief CDS: hero odpowiada od razu) */
  dla_kogo: akapit().optional(),
});

export const TrescKorzysci = z.object({
  punkty: lista(z.object({ tytul: krotki(), opis: akapit().optional() })),
});

export const TrescDlaKogo = z.object({
  punkty: lista(akapit()),
  /** uczciwe „to NIE jest dla Ciebie, jeśli…" — wzorzec z analizy wzoru */
  nie_dla: lista(akapit()).optional(),
});

export const TrescPakiet = z.object({
  punkty: lista(z.object({ tytul: krotki(), opis: akapit().optional() })),
  /** kotwica cenowa — z czym porównać cenę kursu */
  kotwica: akapit().optional(),
  /** konkrety warunków zakupu pokazywane w sekcji oferty (co w cenie) */
  w_cenie: lista(akapit()).optional(),
  /** zdanie domykające ofertę tuż nad CTA */
  domkniecie: akapit().optional(),
});

export const TrescAutor = z.object({
  imie: krotki(),
  rola: krotki().optional(),
  bio: akapit(),
  atuty: lista(akapit()).optional(),
  /** osobisty powód stworzenia kursu — buduje zaufanie mocniej niż bio */
  cytat: akapit().optional(),
  /** czym zajmuje się na co dzień: konkretne obszary pracy */
  czym_sie_zajmuje: lista(akapit()).optional(),
  /** dokąd zajrzeć po dowody (np. portfolio) */
  link: z
    .object({ url: z.url().max(LIMIT_ADRESU), etykieta: krotki() })
    .optional(),
});

/** „Dlaczego ten kurs" — sprzedajemy zmianę: problem → rozwiązanie → rezultat. */
export const TrescProblem = z.object({
  wstep: akapit(),
  problem: akapit(),
  rozwiazanie: akapit(),
  rezultat: akapit(),
});

/** „To NIE jest / to JEST" — pozycjonowanie produktu. */
export const TrescPozycjonowanie = z.object({
  nie_jest: lista(akapit()),
  jest: lista(akapit()),
});

/** Efekt przed / po — transformacja klienta. */
export const TrescTransformacja = z.object({
  przed: lista(akapit()),
  po: lista(akapit()),
});

/** Samodzielna nauka vs kurs — porównanie bez taniego marketingu. */
export const TrescPorownanie = z.object({
  alternatywa_nazwa: krotki(),
  alternatywa: lista(akapit()),
  kurs: lista(akapit()),
});

export const TrescOpinie = z.object({
  opinie: lista(
    z.object({
      tekst: akapit(),
      autor: krotki(),
      rola: krotki().optional(),
    })
  ),
});

export const TrescGwarancja = z.object({
  naglowek: krotki(),
  tekst: akapit(),
});

export const TrescFaq = z.object({
  pytania: lista(z.object({ pytanie: krotki(), odpowiedz: akapit() })),
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
    position: z.int().nonnegative().max(LIMIT_POZYCJI),
    // Klucz rekordu też przychodzi z sieci: bez sufitu dałoby się
    // przysłać nazwę pola na megabajt (odpadnie przy oczyszczaniu
    // treści, ale najpierw wyląduje w pamięci procesu).
    content: z.record(z.string().max(LIMIT_KROTKI), z.unknown()).default({}),
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
  })
  .transform((sekcja) => ({
    ...sekcja,
    /**
     * Do bazy idzie WYNIK schematu, nie surowy obiekt. Bez tego kroku
     * limity długości dałoby się obejść jednym nieznanym kluczem:
     * `content` jest workiem `Record<string, unknown>`, schemat rodzaju
     * tylko go SPRAWDZAŁ, a zapisywaliśmy całość — więc pole, którego
     * kontrakt nie zna, wchodziło do JSONB bez żadnej granicy i bez
     * szans pojawienia się na stronie.
     */
    content: SCHEMATY_SEKCJI[sekcja.kind].parse(sekcja.content) as Record<
      string,
      unknown
    >,
  }));

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
  position: z.int().nonnegative().max(LIMIT_POZYCJI),
  title: z.string().min(1).max(LIMIT_KROTKI),
  duration_min: z.int().positive().max(LIMIT_CZASU_MIN).nullish(),
  preview: z.boolean().default(false),
});

const ModulWejscie = z.object({
  id: z.uuid().optional(),
  position: z.int().nonnegative().max(LIMIT_POZYCJI),
  title: z.string().min(1).max(LIMIT_KROTKI),
  summary: z.string().max(LIMIT_AKAPIT).nullish(),
  lessons: z.array(LekcjaWejscie).max(LIMIT_LEKCJI).default([]),
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
  price_grosze: z.int().nonnegative().max(SUFIT_CENY),
  cover_url: z.string().max(LIMIT_ADRESU).nullish(),
  badge: z.string().max(40).nullish(),
  level: PoziomKursu.nullish(),
  /** podanie tablicy = pełna podmiana sekcji/modułów kursu */
  sections: z.array(SekcjaWejscie).max(LIMIT_SEKCJI).optional(),
  modules: z.array(ModulWejscie).max(LIMIT_MODULOW).optional(),
});

export const AkcjaDyspozytora = z.discriminatedUnion("akcja", [
  z.object({ akcja: z.literal("zapisz"), token: z.string().max(LIMIT_TOKENU), kurs: KursWejscie }),
  z.object({ akcja: z.literal("usun"), token: z.string().max(LIMIT_TOKENU), id: z.uuid() }),
  /**
   * Treść lekcji jedzie OSOBNĄ akcją, nie w zapisie kursu. Powód jest
   * dwojaki: ładunek (41 lekcji tekstu to setki kilobajtów w jednym
   * żądaniu, przy limicie rozmiaru ciała z kroku 2) i ryzyko (pisanie
   * lekcji nie ma prawa przepisywać przy okazji całego programu).
   */
  z.object({
    akcja: z.literal("zapisz-tresc-lekcji"),
    token: z.string().max(LIMIT_TOKENU),
    id: z.uuid(),
    tresc: TrescLekcji,
  }),
  z.object({
    akcja: z.literal("publikuj"),
    token: z.string().max(LIMIT_TOKENU),
    id: z.uuid(),
    status: KursStatus.exclude(["draft"]).default("published"),
  }),
]);
export type AkcjaDyspozytora = z.infer<typeof AkcjaDyspozytora>;

/** Odpowiedź dyspozytora — zawsze ten sam kształt. */
export type WynikDyspozytora =
  | { ok: true; akcja: AkcjaDyspozytora["akcja"]; id: string }
  | { ok: false; blad: string; szczegoly?: unknown };
