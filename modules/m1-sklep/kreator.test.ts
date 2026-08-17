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
import { listaKursowKreatora, szczegolyKursuPoId } from "./odczyt.ts";

/**
 * Dowody kanału JSON kreatora (Dział 6, część bramki B6):
 *  - kreator widzi kursy w KAŻDYM statusie i wie, ile mają treści,
 *  - edycja odbywa się po id (slug bywa właśnie zmieniany),
 *  - badge i level przechodzą pełną drogę kreator → baza → odczyt.
 *
 * Wymaga DB1_URL (jak pozostałe testy modułu).
 */

const JEST_BAZA = Boolean(process.env.DB1_URL);
const TOKEN = "token-testowy-d6";

let klient: PoolClient;
let idKursu: string;

before(async () => {
  if (!JEST_BAZA) return;
  process.env.KREATOR_TOKEN = TOKEN;
  upewnijSieZeBazaTestowa(await przelaczNaBazeTestowa());
  klient = await pulaDb1().connect();
  await klient.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await migruj(klient);
});

after(async () => {
  klient?.release();
  await zamknijDb1();
});

const KURS = {
  slug: "kreator-d6",
  title: "Kurs z kreatora",
  type: "kurs" as const,
  short_desc: "Opis z kreatora.",
  price_grosze: 19900,
  badge: "Nowość",
  level: "sredniozaawansowany" as const,
  sections: [
    { kind: "hero" as const, position: 0, content: { obietnica: "Obietnica" } },
  ],
  modules: [
    {
      position: 0,
      title: "Moduł 1",
      lessons: [
        { position: 0, title: "Lekcja 1", duration_min: 10, preview: true },
        { position: 1, title: "Lekcja 2", duration_min: 5, preview: false },
      ],
    },
  ],
};

test("kreator zapisuje kurs z badge i poziomem", { skip: !JEST_BAZA }, async () => {
  const wynik = await obsluzAkcje(
    { akcja: "zapisz", token: TOKEN, kurs: KURS },
    { aktor: "test-d6" }
  );
  assert.equal(wynik.ok, true);
  idKursu = (wynik as { id: string }).id;
});

test("lista kreatora: szkic widoczny + liczniki treści z bazy", { skip: !JEST_BAZA }, async () => {
  const lista = await listaKursowKreatora();
  assert.equal(lista.length, 1);
  const [kurs] = lista;
  assert.equal(kurs.status, "draft", "nowy kurs powstaje jako szkic");
  assert.equal(kurs.badge, "Nowość");
  assert.equal(kurs.level, "sredniozaawansowany");
  assert.equal(kurs.sections_count, 1);
  assert.equal(kurs.modules_count, 1);
  assert.equal(kurs.lessons_count, 2);
  assert.ok(kurs.updated_at instanceof Date);
});

test("edycja po id: kurs w statusie draft jest do odczytania", { skip: !JEST_BAZA }, async () => {
  const kurs = await szczegolyKursuPoId(idKursu);
  assert.ok(kurs, "kreator musi widzieć szkic po id");
  assert.equal(kurs.badge, "Nowość");
  assert.equal(kurs.level, "sredniozaawansowany");
  assert.equal(kurs.sections.length, 1);
  assert.equal(kurs.modules[0].lessons.length, 2);
});

test("zmiana sluga w edycji nie gubi kursu (klucz edycji = id)", { skip: !JEST_BAZA }, async () => {
  const wynik = await obsluzAkcje({
    akcja: "zapisz",
    token: TOKEN,
    kurs: { ...KURS, id: idKursu, slug: "kreator-d6-nowy-adres", badge: null },
  });
  assert.equal(wynik.ok, true);

  const kurs = await szczegolyKursuPoId(idKursu);
  assert.equal(kurs?.slug, "kreator-d6-nowy-adres");
  assert.equal(kurs?.badge, null, "puste pole kreatora czyści kolumnę");
});

test("nieistniejące id → null (kreator pokaże 404, nie 500)", { skip: !JEST_BAZA }, async () => {
  assert.equal(await szczegolyKursuPoId(crypto.randomUUID()), null);
});

test("każda akcja kreatora zostawia ślad w changelogu", { skip: !JEST_BAZA }, async () => {
  await obsluzAkcje({ akcja: "publikuj", token: TOKEN, id: idKursu });
  await obsluzAkcje({ akcja: "usun", token: TOKEN, id: idKursu });

  const { rows } = await klient.query(
    `SELECT action, count(*)::int AS n FROM course_changelog
     WHERE course_id = $1 GROUP BY action ORDER BY action`,
    [idKursu]
  );
  const wg = Object.fromEntries(rows.map((r) => [r.action, r.n]));
  assert.ok(wg.create >= 4, "utworzenie kursu, sekcji, modułu i lekcji");
  assert.ok(wg.update >= 2, "edycja + publikacja");
  assert.ok(wg.delete >= 4, "usunięcie kursu razem z treścią");
  assert.equal(await szczegolyKursuPoId(idKursu), null);
});
