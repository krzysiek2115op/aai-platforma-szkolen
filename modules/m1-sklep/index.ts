/**
 * Publiczne API modułu m1-sklep (Plugin 1 — sklep z kursami).
 *
 * To JEDYNE miejsce, z którego kod spoza modułu (app/, przyszłe moduły)
 * może importować — pilnuje straznik-granic. Moduł jest też jedyną
 * warstwą z dostępem do bazy db1_kursy (DB1_URL), zgodnie z przepływem
 * BAZA → DZIAŁ → STRONA (WYTYCZNE §8, DIAGRAM Pluginu 1).
 *
 * Dział 1 zostawia moduł pusty: klient bazy dojdzie w Dziale 2,
 * kanał JSON (odczyt serwerowy) i dyspozytor AJAX — w Dziale 3.
 */
export {};
