/**
 * STRONA KURSU — wariant SERWEROWY (tryb domyślny).
 *
 * Treść w ./widok.tsx. Tutaj tylko różnica trybu — uzasadnienie podziału
 * na łuski: app/szkolenia/page.serwer.tsx.
 *
 * BEZ `generateStaticParams` — i to jest istota tego pliku, nie
 * przeoczenie. Gdy trasa dostaje listę parametrów, Next uznaje ją za
 * prerenderowaną (SSG), a wtedy `cookies()` z bramy kreatora wywraca
 * render błędem DYNAMIC_SERVER_USAGE. Na serwerze slug ma się
 * rozstrzygać przy żądaniu, bo kurs może powstać między buildami.
 */
export { default, generateMetadata } from "./widok";

export const dynamic = "force-dynamic";
