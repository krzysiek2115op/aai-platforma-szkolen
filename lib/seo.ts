import { BAZOWA_SCIEZKA, PODGLAD_STATYCZNY } from "@/lib/podglad";

/**
 * SEO — jedno miejsce, w którym rozstrzyga się GDZIE ta wersja stoi
 * i CZY wolno ją indeksować.
 *
 * DLACZEGO OSOBNY PLIK, A NIE STAŁE PRZY STRONACH. Bo adres kanoniczny,
 * OpenGraph, `robots.txt`, sitemapa i JSON-LD muszą mówić o TYM SAMYM
 * adresie. Rozjazd między nimi to klasyczny błąd SEO, który nie daje
 * żadnego objawu: strona wygląda dobrze, a wyszukiwarka dostaje trzy
 * sprzeczne wersje prawdy o tym, czym jest.
 */

export const MARKA = "Automatic AI";

/** Domena docelowa — jeszcze niekupiona (jak `data/site.ts` strony głównej). */
export const DOMENA_DOCELOWA = "https://automaticai.pl";

/** Host podglądu na GitHub Pages (repo MatthewPlugins/szkolenia-podglad). */
const HOST_PODGLADU = "https://matthewplugins.github.io";

/**
 * Adres, pod którym ta wersja NAPRAWDĘ stoi — z podkatalogiem Pages,
 * jeśli to podgląd.
 *
 * Kanoniczny adres ma wskazywać na miejsce, w którym strona istnieje,
 * a nie na domenę, której jeszcze nie kupiliśmy. Podgląd wskazuje więc
 * sam na siebie: jest spójny, a przed indeksem chroni go `noindex`,
 * nie zmyślony kanonik.
 */
export const ADRES_BAZOWY = PODGLAD_STATYCZNY
  ? `${HOST_PODGLADU}${BAZOWA_SCIEZKA}`
  : DOMENA_DOCELOWA;

/**
 * Czy wolno indeksować. DOMYŚLNIE NIE — i to jest właściwa strona
 * ostrożności: treść stron sprzedażowych jest jeszcze ROBOCZA, a opinie
 * to jawne placeholdery. Wpuszczenie tego do Google zaszkodziłoby marce
 * i późniejszemu SEO domeny docelowej. Zdejmujemy dopiero przy
 * publikacji produkcyjnej (etap WordPressa).
 *
 * `SEO_INDEKSOWANIE=1` służy DZIŚ do jednego: zmierzenia kolumny SEO
 * w Lighthousie. `noindex` jest tam punktowanym audytem („Page is
 * blocked from indexing"), więc bez tej furtki nie dałoby się zobaczyć
 * prawdziwego wyniku — a wpisanie do README liczby zaniżonej przez
 * własne ustawienie byłoby myleniem samych siebie. Protokół pomiaru
 * opisuje README.
 */
export const INDEKSOWANIE = process.env.SEO_INDEKSOWANIE === "1";

/**
 * Pełny adres strony. Sklejamy sami, zamiast polegać na `metadataBase`
 * Next.js: przy podglądzie baza ma podkatalog (`/szkolenia-podglad`),
 * a `new URL("/szkolenia", "https://host/szkolenia-podglad")` daje
 * `https://host/szkolenia` — czyli po cichu GUBI podkatalog. Kanonik
 * wskazywałby wtedy na nieistniejący adres.
 */
export function adres(sciezka: string): string {
  const czysta = sciezka.startsWith("/") ? sciezka : `/${sciezka}`;
  return `${ADRES_BAZOWY}${czysta === "/" ? "" : czysta}`;
}

/** Cena w groszach → format wymagany przez schema.org (kropka, 2 miejsca). */
export function cenaSchema(grosze: number): string {
  return (grosze / 100).toFixed(2);
}

/** Minuty → czas trwania ISO 8601 (np. 720 → „PT12H"), dla schema.org. */
export function czasIso(minuty: number): string {
  const godziny = Math.floor(minuty / 60);
  const reszta = minuty % 60;
  if (godziny === 0) return `PT${reszta}M`;
  return reszta === 0 ? `PT${godziny}H` : `PT${godziny}H${reszta}M`;
}
