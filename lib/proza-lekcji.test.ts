import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BladProzy,
  czyWymagaWgrania,
  czytajProze,
  dopasujDoProgramu,
  zeSciezkiPliku,
  type ProgramKursu,
} from "./proza-lekcji.ts";

/**
 * Dowody warstwy czytającej prozę lekcji (krok 3, etap 3).
 *
 * Pilnują trzech rzeczy, których pomyłka jest tania do popełnienia
 * i droga do zauważenia przy 91 plikach: przeliczenia numeracji
 * (katalogi liczą od 1, baza od 0), zgodności pliku z miejscem
 * w programie oraz limitów kontraktu — narzędzie ma odrzucać dokładnie
 * to, co odrzuci serwer, a nie dowiadywać się o tym z odpowiedzi 400.
 */

const SCIEZKA = "tresc-kursow/jak-korzystac-z-claude/modul-1/proza-1-czym-jest.md";

function plik(naglowki: string, tresc = "Pierwszy akapit lekcji.") {
  return `---\n${naglowki}\n---\n\n${tresc}\n`;
}

const POPRAWNY = plik(
  [
    "kurs: jak-korzystac-z-claude",
    "modul: 1 — Fundamenty: poznaj Claude",
    "lekcja: 1 — Czym jest Claude i co potrafi",
  ].join("\n")
);

const PROGRAM: ProgramKursu = {
  modules: [
    {
      position: 0,
      title: "Fundamenty: poznaj Claude",
      lessons: [
        { id: "11111111-1111-4111-8111-111111111111", position: 0, title: "Czym jest Claude i co potrafi" },
        { id: "22222222-2222-4222-8222-222222222222", position: 1, title: "Rodzina modeli: Opus, Sonnet, Haiku" },
      ],
    },
  ],
};

test("czyta plik prozy: numery, tytuły i treść bez frontmatteru", () => {
  const proza = czytajProze(POPRAWNY, SCIEZKA);
  assert.equal(proza.kurs, "jak-korzystac-z-claude");
  assert.equal(proza.modul, 1);
  assert.equal(proza.lekcja, 1);
  assert.equal(proza.tytulLekcji, "Czym jest Claude i co potrafi");
  assert.equal(proza.tresc, "Pierwszy akapit lekcji.");
  assert.deepEqual(proza.materialy, []);
});

test("czyta materiały dodatkowe podane tablicą JSON", () => {
  const zMaterialem = plik(
    [
      "kurs: jak-korzystac-z-claude",
      "modul: 1 — Fundamenty: poznaj Claude",
      "lekcja: 1 — Czym jest Claude i co potrafi",
      'materialy: [{"rodzaj": "pdf", "tytul": "Ściągawka", "url": "/materialy/a.pdf"}]',
    ].join("\n")
  );
  const proza = czytajProze(zMaterialem, SCIEZKA);
  assert.equal(proza.materialy.length, 1);
  assert.equal(proza.materialy[0].rodzaj, "pdf");
});

test("odrzuca frontmatter kłócący się ze ścieżką pliku", () => {
  const przesuniety = plik(
    [
      "kurs: jak-korzystac-z-claude",
      "modul: 1 — Fundamenty: poznaj Claude",
      "lekcja: 4 — Cennik: za co naprawdę płacisz",
    ].join("\n")
  );
  assert.throws(
    () => czytajProze(przesuniety, SCIEZKA),
    (b: Error) => b instanceof BladProzy && /ścieżk/.test(b.message)
  );
});

test("odrzuca plik bez treści pod frontmatterem", () => {
  const pusty = `---\nkurs: jak-korzystac-z-claude\nmodul: 1 — A\nlekcja: 1 — Czym jest Claude i co potrafi\n---\n\n   \n`;
  assert.throws(() => czytajProze(pusty, SCIEZKA), BladProzy);
});

test("odrzuca treść ponad sufit kontraktu, zamiast czekać na 400 z serwera", () => {
  const zaDluga = plik(
    [
      "kurs: jak-korzystac-z-claude",
      "modul: 1 — Fundamenty: poznaj Claude",
      "lekcja: 1 — Czym jest Claude i co potrafi",
    ].join("\n"),
    "x".repeat(120_001)
  );
  assert.throws(
    () => czytajProze(zaDluga, SCIEZKA),
    (b: Error) => b instanceof BladProzy && /kontrakcie/.test(b.message)
  );
});

test("odrzuca materiał niezgodny z kontraktem (nieznany rodzaj)", () => {
  const zly = plik(
    [
      "kurs: jak-korzystac-z-claude",
      "modul: 1 — Fundamenty: poznaj Claude",
      "lekcja: 1 — Czym jest Claude i co potrafi",
      'materialy: [{"rodzaj": "wideo", "tytul": "Nagranie", "url": "/a.mp4"}]',
    ].join("\n")
  );
  assert.throws(() => czytajProze(zly, SCIEZKA), BladProzy);
});

test("rozpoznaje pliki prozy po ścieżce i ignoruje scenariusze", () => {
  assert.deepEqual(zeSciezkiPliku(SCIEZKA), {
    kurs: "jak-korzystac-z-claude",
    modul: 1,
    lekcja: 1,
  });
  assert.equal(
    zeSciezkiPliku("tresc-kursow/jak-korzystac-z-claude/modul-1/lekcja-1-czym-jest.md"),
    null
  );
});

test("dopasowanie przelicza numerację: modul-1/proza-2 to position 0 i 1", () => {
  const proza = czytajProze(
    plik(
      [
        "kurs: jak-korzystac-z-claude",
        "modul: 1 — Fundamenty: poznaj Claude",
        "lekcja: 2 — Rodzina modeli: Opus, Sonnet, Haiku",
      ].join("\n")
    ),
    "tresc-kursow/jak-korzystac-z-claude/modul-1/proza-2-rodzina-modeli.md"
  );
  assert.equal(
    dopasujDoProgramu(proza, PROGRAM).id,
    "22222222-2222-4222-8222-222222222222"
  );
});

test("rozjazd tytułu zatrzymuje wgrywanie, zamiast nadpisać cudzą lekcję", () => {
  const proza = czytajProze(
    plik(
      [
        "kurs: jak-korzystac-z-claude",
        "modul: 1 — Fundamenty: poznaj Claude",
        "lekcja: 2 — Tytuł, którego w programie nie ma",
      ].join("\n")
    ),
    "tresc-kursow/jak-korzystac-z-claude/modul-1/proza-2-inny-tytul.md"
  );
  assert.throws(
    () => dopasujDoProgramu(proza, PROGRAM),
    (b: Error) => b instanceof BladProzy && /rozjeżdża/.test(b.message)
  );
});

test("lekcja spoza programu nie trafia nigdzie", () => {
  const proza = czytajProze(
    plik(
      [
        "kurs: jak-korzystac-z-claude",
        "modul: 9 — Moduł, którego nie ma",
        "lekcja: 1 — Czym jest Claude i co potrafi",
      ].join("\n")
    ),
    "tresc-kursow/jak-korzystac-z-claude/modul-9/proza-1-czym-jest.md"
  );
  assert.throws(() => dopasujDoProgramu(proza, PROGRAM), BladProzy);
});

test("wysyłamy tylko to, co się zmieniło", () => {
  const proza = czytajProze(POPRAWNY, SCIEZKA);
  assert.equal(czyWymagaWgrania(proza, null), true, "brak w bazie = wysyłamy");
  assert.equal(
    czyWymagaWgrania(proza, { tresc: proza.tresc, materialy: [] }),
    false,
    "identyczna treść nie ma po co jechać drugi raz"
  );
  assert.equal(
    czyWymagaWgrania(proza, { tresc: "co innego", materialy: [] }),
    true
  );
  assert.equal(
    czyWymagaWgrania(proza, {
      tresc: proza.tresc,
      materialy: [{ rodzaj: "link", tytul: "A", url: "/a" }],
    }),
    true,
    "zmiana samych materiałów też musi jechać"
  );
});
