/**
 * Tryb PODGLĄDU STATYCZNEGO — jedno miejsce, w którym aplikacja wie,
 * że właśnie buduje się do `out/` zamiast chodzić na serwerze.
 *
 * PO CO ISTNIEJE. Plugin 1 z założenia działa Z SERWEREM (kanał JSON
 * czyta bazę przy żądaniu, dyspozytor ją zmienia). Ale krok 1 planu
 * domknięcia wymaga POMIARU narzędziami Google na żywym adresie,
 * a jedyny darmowy hosting, jaki mamy, to GitHub Pages — czyli same
 * pliki, bez Node'a. Dlatego obok trybu serwerowego istnieje drugi:
 * katalog i strony kursów renderują się Z BAZY W CZASIE BUILDA,
 * a kreator i AJAX są z eksportu WYKLUCZONE (patrz next.config.ts).
 *
 * To DODATEK do pomiarów i prezentacji, nie zamiana architektury —
 * prototyp serwerowy zostaje nietknięty. Plan: docs/plugin-1/PLAN-FINAL-PLUGINU-1.md.
 *
 * DLACZEGO STAŁA, A NIE `process.env` W KAŻDYM PLIKU. Bo tryb rozstrzyga
 * się w kilku miejscach naraz (konfiguracja tras, brama kreatora, ścieżki
 * zasobów) i rozjazd między nimi dałby build, który jest „trochę
 * statyczny" — najgorszy możliwy wynik. Jedna stała = jedna prawda,
 * a strażnik podglądu pilnuje, że nikt nie czyta zmiennej na skróty.
 */

/** Czy budujemy statyczny podgląd (`PODGLAD_STATYCZNY=1 npm run build`). */
export const PODGLAD_STATYCZNY = process.env.PODGLAD_STATYCZNY === "1";

/**
 * Podkatalog, spod którego serwuje GitHub Pages (np. `/szkolenia-podglad`).
 *
 * Pages z repozytorium projektowego NIE serwuje z korzenia domeny, tylko
 * z podkatalogu o nazwie repo. Next sam poprawia adresy w `next/link`
 * i imporcie statycznym, ale NIE dotyka zwykłych atrybutów `src` —
 * a okładki kursów przychodzą jako ścieżka Z BAZY (`cover_url`), więc
 * bez tej stałej wskazywałyby na nieistniejący adres w korzeniu.
 */
export const BAZOWA_SCIEZKA = process.env.PAGES_BASE_PATH ?? "";

/**
 * Adres zasobu z `/public` przepuszczony przez `basePath`.
 *
 * Dotyczy WYŁĄCZNIE ścieżek, które Next widzi dopiero w czasie
 * renderowania (dane z bazy). Adresy zewnętrzne (`https://…`,
 * `//…`, `data:`) zostawiamy bez zmian — nie są nasze.
 */
export function zasob(sciezka: string): string {
  if (!BAZOWA_SCIEZKA) return sciezka;
  if (!sciezka.startsWith("/") || sciezka.startsWith("//")) return sciezka;
  if (sciezka.startsWith(`${BAZOWA_SCIEZKA}/`)) return sciezka;
  return `${BAZOWA_SCIEZKA}${sciezka}`;
}
