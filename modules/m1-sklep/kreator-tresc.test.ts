import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pulaDb1, zamknijDb1 } from "./db/klient.ts";
import { migruj } from "./db/migruj.ts";
import {
  przelaczNaBazeTestowa,
  upewnijSieZeBazaTestowa,
} from "./db/testowa-baza.ts";
import { obsluzAkcje } from "./dyspozytor.ts";
import { szczegolyKursuPoId } from "./odczyt.ts";
import { SCHEMATY_SEKCJI } from "./typy.ts";
import {
  OPIS_SEKCJI,
  type OpisSekcji,
  type PoleProste,
} from "../../components/kreator/opis-sekcji.ts";
import {
  brakujacePola,
  oczyscTresc,
  pustaTresc,
  trescDoFormularza,
  type Tresc,
} from "../../components/kreator/tresc-sekcji.ts";

/**
 * Dowód, że treść z kreatora dochodzi do bazy W CAŁOŚCI (bramka B6).
 *
 * Klucz do tego testu: przykładowa treść NIE jest pisana ręcznie, tylko
 * generowana z opisu pól kreatora. Dzięki temu pole dodane do kontraktu
 * i do kreatora automatycznie wchodzi do rundy zapis → odczyt i do
 * goldenu — nie da się dołożyć pola, które po cichu ginie po drodze.
 *
 * Goldeny:
 *   goldeny/d6-kreator.json — pełny opis formularza (12 rodzajów sekcji),
 *   goldeny/d6-runda.json   — kurs z KOMPLETEM pól po przejściu przez bazę.
 * Odtworzenie po świadomej zmianie: GOLDEN_ZAPISZ=1 npm test
 */

const JEST_BAZA = Boolean(process.env.DB1_URL);
const TOKEN = "token-testowy-d6-tresc";
const KATALOG = dirname(fileURLToPath(import.meta.url));
const GOLDEN_OPIS = join(KATALOG, "../../goldeny/d6-kreator.json");
const GOLDEN_RUNDA = join(KATALOG, "../../goldeny/d6-runda.json");

before(async () => {
  if (!JEST_BAZA) return;
  process.env.KREATOR_TOKEN = TOKEN;
  upewnijSieZeBazaTestowa(await przelaczNaBazeTestowa());
  const klient = await pulaDb1().connect();
  await klient.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await migruj(klient);
  klient.release();
});

after(async () => {
  await zamknijDb1();
});

/** Deterministyczna wartość pola prostego — golden ma być stabilny. */
function wartoscProsta(sciezka: string, pole: PoleProste): string {
  if (pole.typ === "url") return `https://przyklad.pl/${sciezka}`;
  return `${sciezka} — treść`;
}

/** Treść sekcji z KAŻDYM polem wypełnionym (także opcjonalnym). */
function pelnaTresc(opis: OpisSekcji): Tresc {
  const tresc: Tresc = {};
  for (const pole of opis.pola) {
    const sciezka = `${opis.rodzaj}.${pole.pole}`;
    if (pole.typ === "lista-tekstow") {
      tresc[pole.pole] = [`${sciezka} 1`, `${sciezka} 2`];
    } else if (pole.typ === "lista-obiektow") {
      tresc[pole.pole] = [1, 2].map((n) =>
        Object.fromEntries(
          pole.pola.map((p) => [p.pole, wartoscProsta(`${sciezka}.${n}.${p.pole}`, p)])
        )
      );
    } else if (pole.typ === "obiekt") {
      tresc[pole.pole] = Object.fromEntries(
        pole.pola.map((p) => [p.pole, wartoscProsta(`${sciezka}.${p.pole}`, p)])
      );
    } else {
      tresc[pole.pole] = wartoscProsta(sciezka, pole);
    }
  }
  return tresc;
}

/** Treść tylko z polami obowiązkowymi — reszta zostaje pusta. */
function minimalnaTresc(opis: OpisSekcji): Tresc {
  const pelna = pelnaTresc(opis);
  const pusta = pustaTresc(opis);
  return Object.fromEntries(
    opis.pola.map((p) => [p.pole, p.wymagane ? pelna[p.pole] : pusta[p.pole]])
  );
}

function golden(sciezka: string, stan: unknown, nazwa: string) {
  if (process.env.GOLDEN_ZAPISZ) {
    writeFileSync(sciezka, JSON.stringify(stan, null, 2) + "\n");
    return;
  }
  let wzorzec: unknown;
  try {
    wzorzec = JSON.parse(readFileSync(sciezka, "utf8"));
  } catch {
    assert.fail(`Brak goldenu ${nazwa} — wygeneruj: GOLDEN_ZAPISZ=1 npm test`);
  }
  assert.deepEqual(stan, wzorzec);
}

test("kreator produkuje treść, którą przyjmuje kontrakt Zod — każdy rodzaj sekcji", () => {
  for (const opis of OPIS_SEKCJI) {
    const schemat = SCHEMATY_SEKCJI[opis.rodzaj];
    const pelna = schemat.safeParse(oczyscTresc(opis, pelnaTresc(opis)));
    assert.ok(
      pelna.success,
      `sekcja ${opis.rodzaj} z kompletem pól odrzucona: ${JSON.stringify(pelna.error?.issues)}`
    );
    const minimalna = schemat.safeParse(oczyscTresc(opis, minimalnaTresc(opis)));
    assert.ok(
      minimalna.success,
      `sekcja ${opis.rodzaj} z samymi polami obowiązkowymi odrzucona: ${JSON.stringify(minimalna.error?.issues)}`
    );
  }
});

test("puste pola opcjonalne nie idą do bazy (strona nie rysuje pustek)", () => {
  for (const opis of OPIS_SEKCJI) {
    const oczyszczona = oczyscTresc(opis, minimalnaTresc(opis));
    for (const pole of opis.pola) {
      if (pole.wymagane) continue;
      assert.ok(
        !(pole.pole in oczyszczona),
        `sekcja ${opis.rodzaj}: puste opcjonalne pole "${pole.pole}" poszłoby do bazy`
      );
    }
  }
});

test("pusta sekcja zgłasza dokładnie swoje pola obowiązkowe", () => {
  for (const opis of OPIS_SEKCJI) {
    const braki = brakujacePola(opis, pustaTresc(opis));
    const oczekiwane = opis.pola.filter((p) => p.wymagane).map((p) => p.etykieta);
    assert.deepEqual(braki, oczekiwane, `sekcja ${opis.rodzaj}`);
  }
});

test("treść z bazy wraca do formularza bez zmian (edycja nie gubi pól)", () => {
  for (const opis of OPIS_SEKCJI) {
    const zBazy = oczyscTresc(opis, pelnaTresc(opis));
    const wFormularzu = trescDoFormularza(opis, zBazy);
    assert.deepEqual(
      oczyscTresc(opis, wFormularzu),
      zBazy,
      `sekcja ${opis.rodzaj}: edycja bez zmian zmieniła treść`
    );
  }
});

test("golden opisu formularza kreatora", () => {
  golden(
    GOLDEN_OPIS,
    OPIS_SEKCJI.map((o) => ({
      rodzaj: o.rodzaj,
      nazwa: o.nazwa,
      pola: o.pola.map((p) => ({
        pole: p.pole,
        typ: p.typ,
        wymagane: Boolean(p.wymagane),
        ...("pola" in p ? { podpola: p.pola.map((s) => s.pole) } : {}),
      })),
    })),
    "goldeny/d6-kreator.json"
  );
});

test(
  "RUNDA: kurs z kompletem pól przechodzi kreator → baza → odczyt bez straty",
  { skip: !JEST_BAZA },
  async () => {
    const sections = OPIS_SEKCJI.map((opis) => ({
      kind: opis.rodzaj,
      position: 0,
      content: oczyscTresc(opis, pelnaTresc(opis)),
    }));

    const wynik = await obsluzAkcje(
      {
        akcja: "zapisz",
        token: TOKEN,
        kurs: {
          slug: "runda-d6",
          title: "Runda D6",
          type: "kurs",
          short_desc: "Kurs z kompletem pól — dowód rundy kreatora.",
          price_grosze: 39900,
          badge: "Runda",
          level: "zaawansowany",
          sections,
          modules: [
            {
              position: 0,
              title: "Moduł pierwszy",
              summary: "Opis modułu pierwszego",
              lessons: [
                { position: 0, title: "Lekcja 1.1", duration_min: 12, preview: true },
                { position: 1, title: "Lekcja 1.2", duration_min: 8, preview: false },
              ],
            },
            {
              position: 1,
              title: "Moduł drugi",
              summary: null,
              lessons: [
                { position: 0, title: "Lekcja 2.1", duration_min: null, preview: false },
              ],
            },
          ],
        },
      },
      { aktor: "test-d6-runda" }
    );
    assert.equal(wynik.ok, true, JSON.stringify(wynik));
    const id = (wynik as { id: string }).id;

    const kurs = await szczegolyKursuPoId(id);
    assert.ok(kurs);
    assert.equal(kurs.sections.length, OPIS_SEKCJI.length, "zginęła sekcja");

    // treść każdej sekcji wróciła DOKŁADNIE taka, jaka poszła
    const zBazyWgRodzaju = new Map(kurs.sections.map((s) => [s.kind, s]));
    for (const wyslana of sections) {
      const zBazy = zBazyWgRodzaju.get(wyslana.kind);
      assert.ok(zBazy, `brak sekcji ${wyslana.kind} po odczycie`);
      assert.deepEqual(
        zBazy.content,
        wyslana.content,
        `sekcja ${wyslana.kind} wróciła zmieniona`
      );
    }

    golden(
      GOLDEN_RUNDA,
      {
        badge: kurs.badge,
        level: kurs.level,
        sekcje: [...kurs.sections]
          .sort((a, b) => a.kind.localeCompare(b.kind))
          .map((s) => ({ kind: s.kind, content: s.content })),
        moduly: kurs.modules.map((m) => ({
          position: m.position,
          title: m.title,
          summary: m.summary,
          lessons: m.lessons.map((l) => ({
            position: l.position,
            title: l.title,
            duration_min: l.duration_min,
            preview: l.preview,
          })),
        })),
      },
      "goldeny/d6-runda.json"
    );

    await obsluzAkcje({ akcja: "usun", token: TOKEN, id });
  }
);
