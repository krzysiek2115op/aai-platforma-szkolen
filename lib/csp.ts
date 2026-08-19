/**
 * POLITYKA CSP — jedno źródło prawdy dla OBU trybów budowania.
 *
 * Tryb serwerowy dostaje politykę nagłówkiem HTTP z `proxy.serwer.ts`
 * (z nonce'em na żądanie). Podgląd statyczny nie może dostać żadnego
 * nagłówka — GitHub Pages ich nie wysyła — więc `tools/csp-podglad.mjs`
 * wstrzykuje mu po buildzie `<meta http-equiv>` z HASHAMI zamiast
 * nonce'ów. Różnią się WYŁĄCZNIE źródłami skryptów i stylów; cała
 * reszta dyryktyw jest wspólna i mieszka tutaj.
 *
 * DLACZEGO WSPÓLNIE, SKORO TO DWA RÓŻNE ŚWIATY. Bo polityka zapisana
 * w dwóch miejscach prędzej czy później powie co innego, a rozjazd
 * w CSP nie objawia się błędem — objawia się cichą dziurą po jednej
 * stronie. Ten sam argument stoi za `lib/seo.ts` i `lib/podglad.ts`.
 *
 * Ten plik NIE MOŻE importować niczego z `next/*`: czyta go zarówno
 * proxy (runtime brzegowy), jak i zwykły skrypt Node'a po buildzie.
 * Czytanie nonce'a z żądania siedzi osobno, w `lib/csp-nonce.ts`.
 */

/**
 * Obrazy: `'self'` na nasze okładki i `data:`/`blob:` na to, co Next
 * generuje w locie. `https:` jest tu świadomie — kreator przyjmuje
 * okładkę jako DOWOLNY adres (decyzja właściciela z D6, bez uploadu),
 * więc polityka bez tego po cichu psułaby okładkę wpisaną z zewnątrz.
 * Zwykły `http:` zostaje zablokowany: obrazek po nieszyfrowanym
 * połączeniu i tak zapaliłby ostrzeżenie o mieszanej treści.
 */
export const ZRODLA_OBRAZOW = "'self' data: blob: https:";

/**
 * STYLE: `'unsafe-inline'` — decyzja świadoma, nie zaniechanie.
 *
 * Nonce'a nie da się tu użyć z dwóch niezależnych powodów, oba
 * zmierzone na wygenerowanym HTML-u, nie wyczytane:
 *
 *  1. React HOISTUJE arkusz `@font-face` z układu korzenia i przy tej
 *     okazji ZDEJMUJE mu atrybut `nonce` (w HTML-u zostaje sam
 *     `data-precedence`). Arkusz bez nonce'a wypadłby z polityki,
 *     a razem z nim kroje pisma — czyli wróciłby skok układu
 *     (CLS 0,14–0,17), który naprawialiśmy w 0.25.0.
 *  2. Strona renderuje 19 atrybutów `style="…"` (paski postępu,
 *     zmienne CSS pod poświatę). Nonce dotyczy ZNACZNIKÓW, nie
 *     atrybutów — te da się dopuścić wyłącznie przez `unsafe-inline`.
 *
 * A obecność nonce'a albo hasha w `style-src` KASUJE `unsafe-inline`
 * (reguła CSP), więc „i to, i to" nie istnieje. Wybór jest binarny:
 * albo działające style, albo pusta deklaracja ostrości.
 *
 * CZEGO TO NIE CHRONI, wprost: ktoś, kto potrafiłby wstrzyknąć HTML,
 * może wstrzyknąć styl. Ale kto potrafi wstrzyknąć HTML, ten wstrzyknie
 * też atrybut `style` — a tego i tak nie zablokujemy bez wywrócenia
 * strony. Realną ochroną jest `script-src`: nonce + `strict-dynamic`,
 * zero `unsafe-inline`, zero `unsafe-eval` w produkcji. Straznik-csp
 * pilnuje właśnie tego rozdziału — słowo unieważniające ochronę wolno
 * postawić w `style-src` i nigdzie indziej.
 */
export const ZRODLA_STYLOW = "'self' 'unsafe-inline'";

/**
 * Składa politykę z części zmiennych (skrypty, style) i stałych.
 *
 * `upgrade-insecure-requests` wchodzi WYŁĄCZNIE dla żądań po https —
 * dokładnie tak, jak flaga `secure` ciastka kreatora. Na localhoście
 * (smoke'i, ocena właściciela na `next start`) dyrektywa nie ma czego
 * podnosić, a potrafi zepsuć pobieranie zasobów.
 */
export function politykaCsp(opcje: {
  /** Pełna zawartość `script-src`, np. `'self' 'nonce-…' 'strict-dynamic'`. */
  skrypty: string;
  /** Pełna zawartość `style-src`. */
  style: string;
  /** Czy żądanie przyszło po https. */
  https: boolean;
}): string {
  return [
    "default-src 'self'",
    `script-src ${opcje.skrypty}`,
    `style-src ${opcje.style}`,
    `img-src ${ZRODLA_OBRAZOW}`,
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(opcje.https ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}
