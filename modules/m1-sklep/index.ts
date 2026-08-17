/**
 * Publiczne API modułu m1-sklep (Plugin 1 — sklep z kursami).
 *
 * To JEDYNE miejsce, z którego kod spoza modułu (app/, przyszłe moduły)
 * może importować — pilnuje straznik-granic. Moduł jest jedyną warstwą
 * z dostępem do bazy db1_kursy, zgodnie z przepływem BAZA → DZIAŁ →
 * STRONA (WYTYCZNE §8, DIAGRAM Pluginu 1).
 *
 * Dwa kanały (i tylko dwa):
 *  - kanał JSON (odczyt serwerowy przy renderowaniu): listaKursow,
 *    szczegolyKursu, listaKursowKreatora,
 *  - kanał AJAX „wystrzał" (akcje po załadowaniu strony): obsluzAkcje —
 *    podpięty pod JEDYNY endpoint app/api/szkolenia (straznik-ajax).
 */
export { listaKursow, listaKursowKreatora, szczegolyKursu } from "./odczyt.ts";
export { obsluzAkcje } from "./dyspozytor.ts";
/** dla skryptów CLI/testów spoza modułu — domyka pulę połączeń */
export { zamknijDb1 } from "./db/klient.ts";
export {
  KartaKursu,
  SzczegolyKursu,
  AkcjaDyspozytora,
  TrescHero,
  TrescKorzysci,
  TrescDlaKogo,
  TrescOpinie,
  TrescGwarancja,
  TrescFaq,
  type WynikDyspozytora,
} from "./typy.ts";
