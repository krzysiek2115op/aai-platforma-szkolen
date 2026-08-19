import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { PoolClient } from "pg";
import { pulaDb1, zamknijDb1 } from "./db/klient.ts";
import { migruj } from "./db/migruj.ts";
import {
  przelaczNaBazeTestowa,
  upewnijSieZeBazaTestowa,
} from "./db/testowa-baza.ts";
import { obsluzAkcje } from "./dyspozytor.ts";
import {
  listaKursowKreatora,
  szczegolyKursuPoId,
  trescLekcji,
} from "./odczyt.ts";

/**
 * Dowód rozszerzenia kreatora o TREŚĆ LEKCJI (krok 3, migracja 006).
 *
 * Najważniejszy test w tym pliku to „zapis programu nie kasuje treści":
 * do 0.26.0 zapis robił DELETE + INSERT całego programu, więc treść
 * wisząca na lekcji ginęłaby przy każdym przestawieniu kolejności.
 * Ten plik pilnuje, żeby ta pułapka nie wróciła.
 */

const JEST_BAZA = Boolean(process.env.DB1_URL);
const TOKEN = "token-testowy-tresc";

let klient: PoolClient;
let idKursu = "";
let idLekcji = "";
let idModulu = "";

const KURS = {
  slug: "kurs-tresci",
  title: "Kurs treści",
  type: "kurs" as const,
  price_grosze: 39900,
};

before(async () => {
  if (!JEST_BAZA) return;
  process.env.KREATOR_TOKEN = TOKEN;
  upewnijSieZeBazaTestowa(await przelaczNaBazeTestowa());
  klient = await pulaDb1().connect();
  await klient.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await migruj(klient);

  const wynik = await obsluzAkcje({
    akcja: "zapisz",
    token: TOKEN,
    kurs: {
      ...KURS,
      modules: [
        {
          position: 0,
          title: "Moduł pierwszy",
          lessons: [
            { position: 0, title: "Lekcja pierwsza", duration_min: 15 },
            { position: 1, title: "Lekcja druga", duration_min: 20 },
          ],
        },
        { position: 1, title: "Moduł drugi", lessons: [] },
      ],
    },
  });
  assert.equal(wynik.ok, true);
  idKursu = (wynik as { id: string }).id;
  const kurs = await szczegolyKursuPoId(idKursu);
  idModulu = kurs!.modules[0].id;
  idLekcji = kurs!.modules[0].lessons[0].id;
});

after(async () => {
  klient?.release();
  await zamknijDb1();
});

test("treść lekcji: zapis i odczyt w obie strony", { skip: !JEST_BAZA }, async () => {
  const przed = await trescLekcji(idLekcji);
  assert.deepEqual(przed, {
    id: idLekcji,
    title: "Lekcja pierwsza",
    tresc: "",
    materialy: [],
    // kontekst dla panelu: edytor lekcji to osobna trasa, więc musi
    // wiedzieć, czyją lekcję otworzył i dokąd wraca
    kurs_id: idKursu,
    kurs_tytul: "Kurs treści",
    modul_tytul: "Moduł pierwszy",
    numer: "1.1",
  });

  const wynik = await obsluzAkcje({
    akcja: "zapisz-tresc-lekcji",
    token: TOKEN,
    id: idLekcji,
    tresc: {
      tresc: "# Lekcja pierwsza\n\nTreść po polsku, z **markdownem**.",
      materialy: [
        { rodzaj: "pdf", tytul: "Ściągawka", url: "/dodatki/sciagawka.pdf" },
        {
          rodzaj: "link",
          tytul: "Dokumentacja",
          url: "https://example.test/docs",
          opis: "Źródło lekcji",
        },
      ],
    },
  });
  assert.deepEqual(wynik, {
    ok: true,
    akcja: "zapisz-tresc-lekcji",
    id: idLekcji,
  });

  const po = await trescLekcji(idLekcji);
  assert.equal(po?.tresc, "# Lekcja pierwsza\n\nTreść po polsku, z **markdownem**.");
  assert.equal(po?.materialy.length, 2);
  assert.equal(po?.materialy[1].opis, "Źródło lekcji");
});

test("strona widzi FLAGĘ, nigdy tekstu lekcji", { skip: !JEST_BAZA }, async () => {
  const kurs = await szczegolyKursuPoId(idKursu);
  const lekcje = kurs!.modules[0].lessons;
  assert.equal(lekcje[0].ma_tresc, true);
  assert.equal(lekcje[1].ma_tresc, false);
  // materiał zza logowania nie ma prawa wjechać do kształtu strony
  assert.equal("tresc" in lekcje[0], false);
  assert.equal("materialy" in lekcje[0], false);
});

test("lista kreatora liczy lekcje z treścią", { skip: !JEST_BAZA }, async () => {
  const lista = await listaKursowKreatora();
  const kurs = lista.find((k) => k.id === idKursu);
  assert.equal(kurs?.lessons_count, 2);
  assert.equal(kurs?.lessons_tresc_count, 1);
});

test(
  "zapis programu z id NIE kasuje treści ani identyfikatorów",
  { skip: !JEST_BAZA },
  async () => {
    // zamiana modułów miejscami + zmiana tytułu lekcji: najostrzejszy
    // przypadek, bo łamie unikalność (course_id, position) w stanie
    // pośrednim — stąd SET CONSTRAINTS ALL DEFERRED w dyspozytorze
    const kurs = await szczegolyKursuPoId(idKursu);
    const [pierwszy, drugi] = kurs!.modules;
    const wynik = await obsluzAkcje({
      akcja: "zapisz",
      token: TOKEN,
      kurs: {
        ...KURS,
        id: idKursu,
        modules: [
          { id: drugi.id, position: 0, title: "Moduł drugi", lessons: [] },
          {
            id: pierwszy.id,
            position: 1,
            title: "Moduł pierwszy",
            lessons: pierwszy.lessons.map((l) => ({
              id: l.id,
              position: l.position,
              title: `${l.title} (poprawiona)`,
              duration_min: l.duration_min,
              preview: l.preview,
            })),
          },
        ],
      },
    });
    assert.equal(wynik.ok, true);

    const po = await szczegolyKursuPoId(idKursu);
    assert.equal(po!.modules[0].title, "Moduł drugi");
    assert.equal(po!.modules[1].id, idModulu, "moduł zachował identyfikator");
    assert.equal(po!.modules[1].lessons[0].id, idLekcji, "lekcja zachowała identyfikator");
    assert.equal(po!.modules[1].lessons[0].title, "Lekcja pierwsza (poprawiona)");

    const tresc = await trescLekcji(idLekcji);
    assert.match(tresc!.tresc, /Treść po polsku/);
    assert.equal(tresc!.materialy.length, 2, "materiały przeżyły zapis programu");
  }
);

test("lekcja bez id w wejściu znika razem z treścią", { skip: !JEST_BAZA }, async () => {
  const kurs = await szczegolyKursuPoId(idKursu);
  const modul = kurs!.modules.find((m) => m.id === idModulu)!;
  const wynik = await obsluzAkcje({
    akcja: "zapisz",
    token: TOKEN,
    kurs: {
      ...KURS,
      id: idKursu,
      modules: [
        { id: modul.id, position: 0, title: "Moduł pierwszy", lessons: [] },
      ],
    },
  });
  assert.equal(wynik.ok, true);
  assert.equal(await trescLekcji(idLekcji), null);
  const po = await szczegolyKursuPoId(idKursu);
  assert.equal(po!.modules.length, 1, "moduł spoza wejścia usunięty");
});

test("obce id modułu → nie-znaleziono, bez cichego duplikatu", { skip: !JEST_BAZA }, async () => {
  const wynik = await obsluzAkcje({
    akcja: "zapisz",
    token: TOKEN,
    kurs: {
      ...KURS,
      id: idKursu,
      modules: [
        {
          id: "00000000-0000-4000-8000-000000000000",
          position: 0,
          title: "Podrzucony",
          lessons: [],
        },
      ],
    },
  });
  assert.deepEqual(wynik, { ok: false, blad: "nie-znaleziono" });
  const po = await szczegolyKursuPoId(idKursu);
  assert.equal(po!.modules.length, 1);
  assert.equal(po!.modules[0].title, "Moduł pierwszy");
});

test("treść nieistniejącej lekcji → nie-znaleziono", { skip: !JEST_BAZA }, async () => {
  const wynik = await obsluzAkcje({
    akcja: "zapisz-tresc-lekcji",
    token: TOKEN,
    id: "00000000-0000-4000-8000-000000000000",
    tresc: { tresc: "cokolwiek", materialy: [] },
  });
  assert.deepEqual(wynik, { ok: false, blad: "nie-znaleziono" });
});

test("limity wejścia: za długa treść i za dużo materiałów odpadają", { skip: !JEST_BAZA }, async () => {
  const zaDluga = await obsluzAkcje({
    akcja: "zapisz-tresc-lekcji",
    token: TOKEN,
    id: idLekcji,
    tresc: { tresc: "x".repeat(120_001), materialy: [] },
  });
  assert.equal(zaDluga.ok, false);
  assert.equal((zaDluga as { blad: string }).blad, "walidacja");

  const zaDuzo = await obsluzAkcje({
    akcja: "zapisz-tresc-lekcji",
    token: TOKEN,
    id: idLekcji,
    tresc: {
      tresc: "krótka",
      materialy: Array.from({ length: 13 }, (_, i) => ({
        rodzaj: "pdf" as const,
        tytul: `Dodatek ${i}`,
        url: `/dodatki/${i}.pdf`,
      })),
    },
  });
  assert.equal(zaDuzo.ok, false);
  assert.equal((zaDuzo as { blad: string }).blad, "walidacja");
});

test("bez tokenu treść lekcji nie wchodzi", { skip: !JEST_BAZA }, async () => {
  const wynik = await obsluzAkcje({
    akcja: "zapisz-tresc-lekcji",
    token: "nie-ten",
    id: idLekcji,
    tresc: { tresc: "wstrzyknięte", materialy: [] },
  });
  assert.deepEqual(wynik, { ok: false, blad: "brak-dostepu" });
});
