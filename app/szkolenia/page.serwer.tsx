/**
 * KATALOG — wariant SERWEROWY (tryb domyślny, `npm run build`).
 *
 * Cała treść strony żyje w ./widok.tsx; ten plik dokłada wyłącznie to,
 * co RÓŻNI oba tryby — a różnić się musi w konfiguracji segmentu, którą
 * kompilator Next parsuje statycznie i nie przyjmuje w niej żadnego
 * warunku („can't recognize the exported `dynamic` field… It needs to be
 * a static string"). Dlatego zamiast jednego pliku z `if`-em mamy dwa
 * pliki-łuski, a wybiera między nimi `pageExtensions` z next.config.ts:
 * w trybie serwerowym widoczne jest `serwer.tsx`, w podglądzie
 * `statyczny.tsx`. Nigdy oba naraz.
 *
 * Parę plików trzyma razem straznik-podgladu: trasa mająca jeden wariant
 * bez drugiego to trasa, która w którymś trybie po cichu znika.
 */
export { default, metadata } from "./widok";

// Kanał JSON czyta bazę przy KAŻDYM żądaniu (WYTYCZNE §8) — katalog
// pokazuje to, co właściciel zapisał przed sekundą, bez przebudowy.
export const dynamic = "force-dynamic";
