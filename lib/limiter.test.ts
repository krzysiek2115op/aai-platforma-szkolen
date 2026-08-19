import { test } from "node:test";
import assert from "node:assert/strict";
import {
  adresKlienta,
  utworzLimiter,
  type Limit,
} from "./limiter.ts";

/**
 * Dowody limitera bramy (krok 2, PR 2). Czas jest WSTRZYKIWANY, więc
 * granice okna sprawdzamy dokładnie i natychmiast — test okna
 * dziesięciominutowego, który naprawdę czeka dziesięć minut, nie
 * zostałby uruchomiony ani razu.
 *
 * Te testy są jedynym miejscem, gdzie widać zachowanie limitera na
 * granicy okna. Smoke pokazuje, że limit DZIAŁA po HTTP; tu pokazujemy,
 * że liczy to, co miał liczyć.
 */

const LIMIT: Limit = { proby: 3, oknoMs: 1000 };

test("przepuszcza dokładnie tyle prób, ile mówi limit, i odcina kolejną", () => {
  const limiter = utworzLimiter();
  const wyniki = [0, 1, 2, 3].map((i) =>
    limiter.odnotuj("wystrzal:1.2.3.4", LIMIT, 1000 + i)
  );

  assert.deepEqual(
    wyniki.map((w) => w.dozwolone),
    [true, true, true, false],
    "limit przepuścił inną liczbę prób niż zadeklarowana"
  );
  assert.deepEqual(
    wyniki.map((w) => w.pozostalo),
    [2, 1, 0, 0],
    "licznik pozostałych prób nie zgadza się z limitem"
  );
});

test("miejsce zwalnia się dokładnie po długości okna, nie wcześniej", () => {
  const limiter = utworzLimiter();
  for (const t of [1000, 1001, 1002]) limiter.odnotuj("k", LIMIT, t);

  assert.equal(
    limiter.odnotuj("k", LIMIT, 1999).dozwolone,
    false,
    "milisekundę przed końcem okna próba powinna być odrzucona"
  );
  assert.equal(
    limiter.odnotuj("k", LIMIT, 2000).dozwolone,
    true,
    "po pełnym oknie najstarsza próba musi wypaść i zwolnić miejsce"
  );
});

test("Retry-After nie kłamie: po zadeklarowanym czasie próba przechodzi", () => {
  const limiter = utworzLimiter();
  for (const t of [5000, 5100, 5200]) limiter.odnotuj("k", LIMIT, t);

  const odmowa = limiter.odnotuj("k", LIMIT, 5300);
  assert.equal(odmowa.dozwolone, false);
  assert.ok(odmowa.ponowZaS >= 1, "Retry-After poniżej sekundy jest bezużyteczny");

  const poCzekaniu = limiter.odnotuj("k", LIMIT, 5300 + odmowa.ponowZaS * 1000);
  assert.equal(
    poCzekaniu.dozwolone,
    true,
    "klient odczekał tyle, ile kazaliśmy, i nadal dostał odmowę"
  );
});

test("dobijanie się do zamkniętych drzwi nie przesuwa terminu zwolnienia", () => {
  // Gdyby odrzucone próby wchodziły do okna, atakujący blokowałby się
  // sam w nieskończoność — a właściciel wpadłby w tę samą pułapkę,
  // gdyby panel ponawiał żądanie automatycznie.
  const limiter = utworzLimiter();
  for (const t of [0, 1, 2] as const) limiter.odnotuj("k", LIMIT, t);
  for (let t = 3; t < 999; t++) limiter.odnotuj("k", LIMIT, t);

  assert.equal(
    limiter.odnotuj("k", LIMIT, 1000).dozwolone,
    true,
    "odrzucone próby przesunęły okno — limiter karze zamiast ograniczać tempo"
  );
});

test("klucze są rozdzielne: inny adres i inna akcja liczą się osobno", () => {
  const limiter = utworzLimiter();
  for (const t of [0, 1, 2]) limiter.odnotuj("wystrzal:1.2.3.4", LIMIT, t);

  assert.equal(
    limiter.odnotuj("wystrzal:9.9.9.9", LIMIT, 3).dozwolone,
    true,
    "limit jednego adresu odciął inny adres"
  );
  assert.equal(
    limiter.odnotuj("logowanie:1.2.3.4", LIMIT, 3).dozwolone,
    true,
    "wyczerpany limit wystrzału zamknął też logowanie z tego adresu"
  );
});

test("zapomnij() zeruje licznik — udane wejście kasuje chybione próby", () => {
  const limiter = utworzLimiter();
  for (const t of [0, 1, 2]) limiter.odnotuj("k", LIMIT, t);
  assert.equal(limiter.odnotuj("k", LIMIT, 3).dozwolone, false);

  limiter.zapomnij("k");
  assert.equal(
    limiter.odnotuj("k", LIMIT, 4).dozwolone,
    true,
    "po zapomnieniu klucza licznik musi startować od zera"
  );
});

test("mapa kluczy nie rośnie bez granic (limiter to nie wektor na pamięć)", () => {
  const limiter = utworzLimiter({ maksKluczy: 10 });
  for (let i = 0; i < 100; i++) limiter.odnotuj(`adres-${i}`, LIMIT, 10_000 + i);

  assert.ok(
    limiter.rozmiar() <= 11,
    `mapa urosła do ${limiter.rozmiar()} kluczy mimo progu 10`
  );
});

test("adresKlienta bierze pierwszy wpis z x-forwarded-for i go przycina", () => {
  const naglowki = (mapa: Record<string, string>) => ({
    get: (n: string) => mapa[n] ?? null,
  });

  assert.equal(
    adresKlienta(naglowki({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" })),
    "1.2.3.4",
    "z łańcucha proxy liczy się adres klienta, czyli pierwszy wpis"
  );
  assert.equal(
    adresKlienta(naglowki({ "x-real-ip": "5.6.7.8" })),
    "5.6.7.8",
    "bez x-forwarded-for zostaje x-real-ip"
  );
  assert.equal(
    adresKlienta(naglowki({})),
    "bez-adresu",
    "bez nagłówków wszyscy dzielą jeden kubełek, a nie żaden"
  );
  assert.equal(
    adresKlienta(naglowki({ "x-forwarded-for": "x".repeat(5000) })).length,
    45,
    "nagłówek sterowany przez klienta trafia do klucza mapy — musi być przycięty"
  );
});
