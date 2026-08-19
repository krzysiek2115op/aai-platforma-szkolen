import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { PoolClient } from "pg";
import { pulaDb1, zamknijDb1 } from "./db/klient.ts";
import { migruj } from "./db/migruj.ts";
import {
  przelaczNaBazeTestowa,
  upewnijSieZeBazaTestowa,
} from "./db/testowa-baza.ts";
import { obsluzAkcje } from "./dyspozytor.ts";
import { listaKursow, szczegolyKursu } from "./odczyt.ts";
import {
  LIMIT_AKAPIT,
  LIMIT_LEKCJI,
  LIMIT_SEKCJI,
  SUFIT_CENY,
} from "./typy.ts";

/**
 * Dowód bramki B3: dyspozytor (JEDEN AJAX) obsługuje zapisz/usun/publikuj
 * z walidacją Zod, audyt CRUD widać w course_changelog, a kanał JSON
 * oddaje dokładnie zadeklarowany kształt (golden goldeny/d3-odczyt.json).
 *
 * Wymaga DB1_URL (jak testy D2). Golden odtwarzany świadomie:
 * GOLDEN_ZAPISZ=1 npm test.
 */

const JEST_BAZA = Boolean(process.env.DB1_URL);
const TOKEN = "token-testowy-b3";
const GOLDEN = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../goldeny/d3-odczyt.json"
);

let klient: PoolClient;

before(async () => {
  if (!JEST_BAZA) return;
  process.env.KREATOR_TOKEN = TOKEN;
  // osobna baza testowa — dane dev (seedy właściciela) są nietykalne
  upewnijSieZeBazaTestowa(await przelaczNaBazeTestowa());
  klient = await pulaDb1().connect();
  await klient.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await migruj(klient);
});

after(async () => {
  klient?.release();
  await zamknijDb1();
});

/** UUID-y i daty są niedeterministyczne — golden trzyma placeholdery. */
function znormalizuj(wartosc: unknown): unknown {
  if (typeof wartosc === "string") {
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(wartosc)) {
      return "<uuid>";
    }
    return wartosc;
  }
  if (Array.isArray(wartosc)) return wartosc.map(znormalizuj);
  if (wartosc && typeof wartosc === "object") {
    return Object.fromEntries(
      Object.entries(wartosc).map(([k, v]) => [k, znormalizuj(v)])
    );
  }
  return wartosc;
}

const KURS_WEJSCIE = {
  slug: "ai-w-praktyce",
  title: "AI w praktyce",
  type: "kurs",
  short_desc: "Od promptu do systemu.",
  price_grosze: 49900,
  cover_url: null,
  sections: [
    // treść zgodna z kontraktem SWOJEGO rodzaju — dyspozytor sprawdza
    // to od 0.16.1 (wcześniej wpuszczał dowolny obiekt, a sekcja
    // znikała potem ze strony bez słowa wyjaśnienia)
    { kind: "hero", position: 0, content: { obietnica: "Zbuduj system AI" } },
    {
      kind: "faq",
      position: 0,
      content: {
        pytania: [{ pytanie: "Dla kogo?", odpowiedz: "Dla praktyków." }],
      },
    },
  ],
  modules: [
    {
      position: 0,
      title: "Fundamenty",
      summary: "Prompty i konteksty",
      lessons: [
        { position: 0, title: "Pierwszy prompt", duration_min: 12, preview: true },
        { position: 1, title: "Kontekst", duration_min: 18, preview: false },
      ],
    },
  ],
};

let idKursu: string;

test("walidacja Zod: śmieciowe wejście → czytelny błąd, bez dotykania bazy", { skip: !JEST_BAZA }, async () => {
  const wynik = await obsluzAkcje({ akcja: "zapisz", token: TOKEN, kurs: { title: 42 } });
  assert.equal(wynik.ok, false);
  assert.equal(!wynik.ok && wynik.blad, "walidacja");
});

test("sekcja o treści niezgodnej z jej rodzajem → odrzucona ze ścieżką do pola", { skip: !JEST_BAZA }, async () => {
  const wynik = await obsluzAkcje({
    akcja: "zapisz",
    token: TOKEN,
    kurs: {
      slug: "sekcja-nie-do-pary",
      title: "Sekcja nie do pary",
      type: "kurs",
      price_grosze: 100,
      // hero bez obietnicy: strona i tak pominęłaby taką sekcję,
      // więc baza nie ma prawa jej przyjąć
      sections: [{ kind: "hero", position: 0, content: { cokolwiek: 1 } }],
    },
  });
  assert.equal(wynik.ok, false);
  assert.equal(!wynik.ok && wynik.blad, "walidacja");
  const pola = (!wynik.ok ? (wynik.szczegoly as Array<{ pole: string }>) : []).map(
    (s) => s.pole
  );
  assert.ok(
    pola.includes("kurs.sections.0.content.obietnica"),
    `błąd ma wskazywać konkretne pole sekcji, dostałem: ${JSON.stringify(pola)}`
  );
});

test("zły token → brak-dostepu", { skip: !JEST_BAZA }, async () => {
  const wynik = await obsluzAkcje({ akcja: "usun", token: "zly", id: crypto.randomUUID() });
  assert.deepEqual(wynik, { ok: false, blad: "brak-dostepu" });
});

test("zapisz: nowy kurs z sekcjami, modułami i lekcjami + audyt create", { skip: !JEST_BAZA }, async () => {
  const wynik = await obsluzAkcje(
    { akcja: "zapisz", token: TOKEN, kurs: KURS_WEJSCIE },
    { aktor: "test-b3" }
  );
  assert.equal(wynik.ok, true);
  idKursu = (wynik as { id: string }).id;

  const { rows } = await klient.query(
    `SELECT tabela, count(*)::int AS n FROM course_changelog
     WHERE course_id = $1 AND action = 'create' GROUP BY tabela ORDER BY tabela`,
    [idKursu]
  );
  assert.deepEqual(rows, [
    { tabela: "course_lessons", n: 2 },
    { tabela: "course_modules", n: 1 },
    { tabela: "course_sections", n: 2 },
    { tabela: "courses", n: 1 },
  ]);
  const { rows: [aktor] } = await klient.query(
    "SELECT DISTINCT actor FROM course_changelog WHERE course_id = $1",
    [idKursu]
  );
  assert.equal(aktor.actor, "test-b3");
});

test("duplikat sluga → czytelny błąd, nie wyjątek", { skip: !JEST_BAZA }, async () => {
  const wynik = await obsluzAkcje({ akcja: "zapisz", token: TOKEN, kurs: KURS_WEJSCIE });
  assert.equal(wynik.ok, false);
  assert.equal(!wynik.ok && wynik.blad, "duplikat");
});

test("szkic niewidoczny w katalogu; publikuj → widoczny", { skip: !JEST_BAZA }, async () => {
  assert.deepEqual(await listaKursow(), []);
  const wynik = await obsluzAkcje({ akcja: "publikuj", token: TOKEN, id: idKursu });
  assert.equal(wynik.ok, true);
  const lista = await listaKursow();
  assert.equal(lista.length, 1);
  assert.equal(lista[0].status, "published");
});

test("kanał JSON: szczegóły kursu zgodne z goldenem", { skip: !JEST_BAZA }, async () => {
  const kurs = await szczegolyKursu("ai-w-praktyce");
  assert.ok(kurs);
  const stan = znormalizuj(kurs);
  if (process.env.GOLDEN_ZAPISZ) {
    writeFileSync(GOLDEN, JSON.stringify(stan, null, 2) + "\n");
    return;
  }
  let golden: unknown;
  try {
    golden = JSON.parse(readFileSync(GOLDEN, "utf8"));
  } catch {
    assert.fail("Brak goldenu goldeny/d3-odczyt.json — wygeneruj: GOLDEN_ZAPISZ=1 npm test");
  }
  assert.deepEqual(stan, golden);
});

test("zapisz z id: edycja + pełna podmiana modułów, audyt update/delete", { skip: !JEST_BAZA }, async () => {
  const wynik = await obsluzAkcje({
    akcja: "zapisz",
    token: TOKEN,
    kurs: {
      ...KURS_WEJSCIE,
      id: idKursu,
      title: "AI w praktyce — edycja 2",
      modules: [{ position: 0, title: "Nowy program", lessons: [] }],
    },
  });
  assert.equal(wynik.ok, true);

  const kurs = await szczegolyKursu("ai-w-praktyce");
  assert.equal(kurs?.title, "AI w praktyce — edycja 2");
  assert.equal(kurs?.modules.length, 1);
  assert.equal(kurs?.modules[0].title, "Nowy program");

  const { rows: [audyt] } = await klient.query(
    `SELECT count(*) FILTER (WHERE action='update' AND tabela='courses')::int AS aktualizacje,
            count(*) FILTER (WHERE action='delete' AND tabela='course_lessons')::int AS usuniete_lekcje
     FROM course_changelog WHERE course_id = $1`,
    [idKursu]
  );
  assert.ok(audyt.aktualizacje >= 1);
  assert.equal(audyt.usuniete_lekcje, 2);
});

test("usun: kurs znika, ponowna próba → nie-znaleziono", { skip: !JEST_BAZA }, async () => {
  const wynik = await obsluzAkcje({ akcja: "usun", token: TOKEN, id: idKursu });
  assert.equal(wynik.ok, true);
  assert.equal(await szczegolyKursu("ai-w-praktyce", { takzeSzkice: true }), null);

  const ponownie = await obsluzAkcje({ akcja: "usun", token: TOKEN, id: idKursu });
  assert.deepEqual(ponownie, { ok: false, blad: "nie-znaleziono" });
});

/* ————— limity wejścia (0.28.0) —————
 * Kontrakt bez górnej granicy nie objawia się błędem: zapis „działa",
 * dopóki ktoś nie wyśle pola na megabajt. Te testy są jedynym miejscem,
 * gdzie granice są widoczne. Liczby biorą się z pomiaru bazy — patrz
 * komentarz przy stałych w typy.ts. */

test("tekst ponad limit akapitu → odrzucony ze ścieżką do pola", { skip: !JEST_BAZA }, async () => {
  const wynik = await obsluzAkcje({
    akcja: "zapisz",
    token: TOKEN,
    kurs: {
      slug: "limit-tekstu",
      title: "Limit tekstu",
      type: "kurs",
      price_grosze: 100,
      sections: [
        {
          kind: "hero",
          position: 0,
          content: { obietnica: "x".repeat(LIMIT_AKAPIT + 1) },
        },
      ],
    },
  });
  assert.equal(!wynik.ok && wynik.blad, "walidacja");
  const pola = (!wynik.ok ? (wynik.szczegoly as Array<{ pole: string }>) : []).map(
    (s) => s.pole
  );
  assert.ok(
    pola.includes("kurs.sections.0.content.obietnica"),
    `limit ma wskazać konkretne pole, dostałem: ${JSON.stringify(pola)}`
  );
});

test("liczność: więcej sekcji niż limit i więcej lekcji niż limit → odrzucone", { skip: !JEST_BAZA }, async () => {
  const zaDuzoSekcji = await obsluzAkcje({
    akcja: "zapisz",
    token: TOKEN,
    kurs: {
      slug: "limit-sekcji",
      title: "Limit sekcji",
      type: "kurs",
      price_grosze: 100,
      sections: Array.from({ length: LIMIT_SEKCJI + 1 }, (_, i) => ({
        kind: "guarantee" as const,
        position: i,
        content: { naglowek: "Gwarancja", tekst: "Treść gwarancji." },
      })),
    },
  });
  assert.equal(!zaDuzoSekcji.ok && zaDuzoSekcji.blad, "walidacja");

  const zaDuzoLekcji = await obsluzAkcje({
    akcja: "zapisz",
    token: TOKEN,
    kurs: {
      slug: "limit-lekcji",
      title: "Limit lekcji",
      type: "kurs",
      price_grosze: 100,
      modules: [
        {
          position: 0,
          title: "Moduł z nadmiarem",
          lessons: Array.from({ length: LIMIT_LEKCJI + 1 }, (_, i) => ({
            position: i,
            title: `Lekcja ${i}`,
            preview: false,
          })),
        },
      ],
    },
  });
  assert.equal(!zaDuzoLekcji.ok && zaDuzoLekcji.blad, "walidacja");
});

test("cena ponad sufit → odrzucona walidacją, nie błędem kolumny integer", { skip: !JEST_BAZA }, async () => {
  const wynik = await obsluzAkcje({
    akcja: "zapisz",
    token: TOKEN,
    kurs: {
      slug: "limit-ceny",
      title: "Limit ceny",
      type: "kurs",
      // bez sufitu ta wartość przeszłaby kontrakt i wywróciła się dopiero
      // w bazie (`integer` kończy się na 2 147 483 647) — czyli surowym
      // błędem Postgresa zamiast czytelnej walidacji
      price_grosze: SUFIT_CENY + 1,
    },
  });
  assert.equal(!wynik.ok && wynik.blad, "walidacja");
});

test("klucz spoza kontraktu nie wchodzi do bazy razem z treścią sekcji", { skip: !JEST_BAZA }, async () => {
  const zapis = await obsluzAkcje({
    akcja: "zapisz",
    token: TOKEN,
    kurs: {
      slug: "tresc-oczyszczona",
      title: "Treść oczyszczona",
      type: "kurs",
      price_grosze: 100,
      status: "published",
      sections: [
        {
          kind: "guarantee",
          position: 0,
          content: {
            naglowek: "Gwarancja",
            tekst: "Treść gwarancji.",
            // pole, którego kontrakt nie zna: bez oczyszczania wchodziło
            // do JSONB bez żadnego limitu i bez szans trafienia na stronę
            przemyt: "y".repeat(5000),
          },
        },
      ],
    },
  });
  assert.equal(zapis.ok, true, JSON.stringify(zapis));

  await obsluzAkcje({
    akcja: "publikuj",
    token: TOKEN,
    id: (zapis as { id: string }).id,
    status: "published",
  });
  const kurs = await szczegolyKursu("tresc-oczyszczona");
  const tresc = kurs?.sections[0].content as Record<string, unknown>;
  assert.deepEqual(Object.keys(tresc).sort(), ["naglowek", "tekst"]);
});

test("duplikat sluga: odpowiedź nie niesie komunikatu Postgresa", { skip: !JEST_BAZA }, async () => {
  const kurs = {
    slug: "tresc-oczyszczona",
    title: "Ten sam slug",
    type: "kurs" as const,
    price_grosze: 100,
  };
  const wynik = await obsluzAkcje({ akcja: "zapisz", token: TOKEN, kurs });
  assert.equal(!wynik.ok && wynik.blad, "duplikat");
  const szczegoly = String(!wynik.ok ? wynik.szczegoly : "");
  for (const zdradliwe of ["constraint", "duplicate key", "courses_slug"]) {
    assert.ok(
      !szczegoly.toLowerCase().includes(zdradliwe),
      `odpowiedź zdradza wnętrze bazy („${zdradliwe}"): ${szczegoly}`
    );
  }
});
