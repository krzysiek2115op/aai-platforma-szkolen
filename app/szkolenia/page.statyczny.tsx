/**
 * KATALOG — wariant PODGLĄDU STATYCZNEGO (`npm run build:podglad`).
 *
 * Ten sam widok (./widok.tsx), inny moment odczytu bazy: raz, w czasie
 * builda, prosto do pliku HTML w `out/`. Powód istnienia i mechanizm
 * wyboru wariantu — patrz ./page.serwer.tsx.
 *
 * Nie ma tu `dynamic`: w `output: "export"` statyczność jest jedyną
 * możliwością, więc deklarowanie jej byłoby ozdobnikiem.
 */
export { default, metadata } from "./widok";
