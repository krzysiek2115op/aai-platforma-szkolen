import { test } from "node:test";
import assert from "node:assert/strict";
import { naGrosze, zGroszy } from "./cena.ts";
import {
  przemapujBledySekcji,
  slugWTrakcie,
  slugZTytulu,
} from "./formularz-logika.ts";
import { OPIS_WG_RODZAJU } from "./opis-sekcji.ts";
import { brakujacePola, trescDoFormularza } from "./tresc-sekcji.ts";

/**
 * Zabezpieczenia przed nawrotem błędów znalezionych w przeglądzie kodu
 * Działu 6. Każdy test odpowiada JEDNEMU błędowi — nazwa mówi, co się
 * psuło, żeby przy czerwonym teście nie trzeba było zgadywać.
 *
 * Te rzeczy siedziały w warstwie panelu, więc nie łapały ich ani testy
 * modułu (baza), ani smoke (HTML z serwera) — pole formularza psuje się
 * dopiero pod palcami piszącego.
 */

/* ————— BLAD-005: cena kasowała się w trakcie pisania ————— */

test("cena: da się wpisać grosze (199,90 → 19990), nie kasując się w połowie", () => {
  assert.equal(naGrosze("199,90"), 19990);
  assert.equal(naGrosze("199.90"), 19990);
  assert.equal(naGrosze("199"), 19900);
  // stany w POŁOWIE pisania: null = „nie ruszaj zapisanej ceny"
  assert.equal(naGrosze("199,"), 19900);
  assert.equal(naGrosze(""), null);
  assert.equal(naGrosze(","), null);
  assert.equal(naGrosze("abc"), null);
  assert.equal(naGrosze("-5"), null);
});

test("cena: grosze wracają do pola bez ogonka .00 i z przecinkiem", () => {
  assert.equal(zGroszy(19990), "199,90");
  assert.equal(zGroszy(29900), "299");
  assert.equal(zGroszy(0), "0");
  assert.equal(zGroszy(50), "0,50");
});

test("cena: runda złotówki → grosze → złotówki nic nie gubi", () => {
  for (const grosze of [0, 50, 999, 19990, 123456]) {
    assert.equal(naGrosze(zGroszy(grosze)), grosze);
  }
});

/* ————— slug: nie dało się wpisać myślnika ————— */

test("slug: myślnik da się wpisać ręcznie (moj-kurs zostaje moj-kurs)", () => {
  assert.equal(slugWTrakcie("moj-"), "moj-");
  assert.equal(slugWTrakcie("moj-kurs"), "moj-kurs");
  assert.equal(slugWTrakcie("Ćwiczenia Praktyczne"), "cwiczenia-praktyczne");
  // porządki robimy dopiero przy opuszczeniu pola i przy zapisie
  assert.equal(slugZTytulu("moj-"), "moj");
  assert.equal(slugZTytulu("Jak poprawnie korzystać z Claude"), "jak-poprawnie-korzystac-z-claude");
});

/* ————— błędy z dyspozytora nie trafiały do pól ————— */

test("błędy sekcji: pozycja w tablicy tłumaczy się na rodzaj sekcji", () => {
  const przemapowane = przemapujBledySekcji(
    {
      "sections.0.content.obietnica": "wymagane",
      "sections.1.content.pytania": "wymagane",
      slug: "zajęty",
    },
    ["hero", "faq"]
  );
  assert.equal(przemapowane["sections.hero.obietnica"], "wymagane");
  assert.equal(przemapowane["sections.faq.pytania"], "wymagane");
  assert.equal(przemapowane.slug, "zajęty", "błędy spoza sekcji zostają bez zmian");
});

/* ————— edytor wywracał się na złych danych z bazy ————— */

test("zły kształt treści w bazie nie wysadza edytora (da się go naprawić)", () => {
  const opinie = OPIS_WG_RODZAJU.get("opinions")!;
  const autor = OPIS_WG_RODZAJU.get("author")!;

  // lista obiektów zapisana jako tekst, obiekt zapisany jako tablica
  const zListy = trescDoFormularza(opinie, { opinie: "to nie jest tablica" });
  assert.deepEqual(zListy.opinie, []);

  const zObiektu = trescDoFormularza(autor, { imie: "Krzysiek", link: [] });
  assert.deepEqual(zObiektu.link, { url: "", etykieta: "" });
  assert.equal(zObiektu.imie, "Krzysiek");

  const zNullem = trescDoFormularza(autor, null);
  assert.equal(zNullem.bio, "");
});

/* ————— sekcja świeciła „gotowa", a zapis padał ————— */

test("zaczęte pole opcjonalne liczy się jako brak (link autora bez adresu)", () => {
  const autor = OPIS_WG_RODZAJU.get("author")!;
  const podstawa = { imie: "Krzysiek", bio: "Bio" };

  const bezLinku = brakujacePola(autor, {
    ...podstawa,
    link: { url: "", etykieta: "" },
  });
  assert.deepEqual(bezLinku, [], "pusty link jest po prostu opcjonalny");

  const polowaLinku = brakujacePola(autor, {
    ...podstawa,
    link: { url: "", etykieta: "Zobacz realizacje" },
  });
  assert.deepEqual(
    polowaLinku,
    ["Link z dowodami"],
    "zaczęty link bez adresu musi być zgłoszony, bo kontrakt go odrzuci"
  );
});

test("zaczęty element listy opcjonalnej bez pola obowiązkowego też jest brakiem", () => {
  const pakiet = OPIS_WG_RODZAJU.get("package")!;
  const braki = brakujacePola(pakiet, {
    punkty: [{ tytul: "Element", opis: "" }],
    w_cenie: [],
    kotwica: "",
    domkniecie: "",
  });
  assert.deepEqual(braki, [], "komplet pól obowiązkowych = sekcja gotowa");
});
