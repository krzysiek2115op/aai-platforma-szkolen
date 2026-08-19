import type { NextConfig } from "next";

/**
 * DWA TRYBY BUDOWANIA, jedno źródło kodu.
 *
 * 1. SERWEROWY (domyślny, `npm run build`) — Plugin 1 tak działa naprawdę:
 *    backend, kanał JSON czytający bazę przy żądaniu, dyspozytor AJAX,
 *    kreator na ciastku HttpOnly. Dev i start na porcie 3001.
 *
 * 2. PODGLĄD STATYCZNY (`PODGLAD_STATYCZNY=1 npm run build:podglad`) —
 *    katalog i strony kursów wyrenderowane Z BAZY W CZASIE BUILDA do
 *    `out/`, żeby dało się je wrzucić na GitHub Pages i ZMIERZYĆ
 *    narzędziami Google (krok 1 planu domknięcia Pluginu 1). Prototyp
 *    serwerowy zostaje nietknięty — to dodatek do pomiarów.
 *
 * JAK OBA TRYBY DZIELĄ JEDEN KOD — przez `pageExtensions`.
 * Panel właściciela i endpoint mutujący bazę nie mają prawa istnieć
 * w publicznym podglądzie, a przy okazji obu Next i tak nie umiałby
 * wyeksportować (ciastka, akcje serwerowe i żądania z ciałem wymagają
 * serwera). Ich pliki tras nazywają się więc `page.serwer.tsx`
 * i `route.serwer.ts`, a rozszerzenie `serwer.*` trafia na listę
 * WYŁĄCZNIE w trybie serwerowym. W trybie podglądu Next tych plików
 * po prostu NIE WIDZI — nie ma trasy, nie ma HTML-a, nie ma czego
 * wyciec.
 *
 * Ten sam mechanizm rozstrzyga drugą różnicę: konfigurację segmentu
 * (`dynamic`, `dynamicParams`, `generateStaticParams`). Kompilator Next
 * parsuje ją STATYCZNIE i odrzuca wyrażenia warunkowe, więc trasa, która
 * ma zachowywać się inaczej w każdym trybie, dostaje dwie cienkie łuski
 * — `page.serwer.tsx` i `page.statyczny.tsx` — nad wspólnym `widok.tsx`.
 * Rozszerzenia `statyczny.*` widzi wyłącznie tryb podglądu. Pliki
 * neutralne (`layout.tsx`, `not-found.tsx`) zostają zwykłymi `tsx`,
 * bo są takie same w obu trybach.
 *
 * Dlaczego tak, a nie „skrypt przenosi katalogi przed buildem":
 * bo BLAD-007 nauczył nas, że publikacja buduje z KATALOGU ROBOCZEGO,
 * nie z commitów. Konfiguracja jest deklaratywna i nie zostawia brudu
 * w drzewie; przenoszenie plików zostawiłoby repo w stanie, w którym
 * czysty `git status` niczego nie gwarantuje. Pilnuje straznik-podgladu.
 *
 * Konfiguracja czyta zmienne środowiskowe wprost, bo `next.config.ts`
 * ładuje się przed aliasami ścieżek aplikacji — stała PODGLAD_STATYCZNY
 * z lib/podglad.ts jest odpowiednikiem dla kodu stron.
 */
const podglad = process.env.PODGLAD_STATYCZNY === "1";
const bazowaSciezka = process.env.PAGES_BASE_PATH;

/**
 * NAGŁÓWKI BEZPIECZEŃSTWA (wzorzec ze strony głównej przeniesiony jako
 * IDEA, nie implementacja): strona główna musi wstrzykiwać CSP w HTML
 * po buildzie, bo GitHub Pages nie pozwala ustawić żadnego nagłówka
 * HTTP. My na serwerze mamy nagłówki normalną drogą. Zestaw celowo
 * MINIMALNY i bez pełnego CSP: polityka z nonce'ami to decyzja etapu WP.
 * Stan i plan: docs/security-checklist.md.
 *
 * W trybie podglądu tej sekcji NIE MA — `output: "export"` nie wspiera
 * `headers()`, a Pages i tak by ich nie wysłał. To jest znany koszt
 * podglądu, wpisany do docs/security-checklist.md, a nie przeoczenie.
 */
const naglowkiBezpieczenstwa = [
  // Przeglądarka nie zgaduje typów plików (obrona przed podrzuceniem
  // HTML/JS pod niewinnym rozszerzeniem).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Nikt nie wkłada tej strony w <iframe> — kreator działa na ciastku
  // HttpOnly, a clickjacking to dokładnie atak na „kliknij w coś, co
  // jest cudzą stroną pod spodem".
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  // Adres źródłowy nie wycieka do obcych domen przy nawigacji.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Funkcji sprzętowych ta strona nie używa — mówimy to wprost.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = podglad
  ? {
      output: "export",
      basePath: bazowaSciezka || undefined,
      // `statyczny.*` zamiast `serwer.*`: kreator i AJAX znikają,
      // a trasy publiczne dostają wariant prerenderowany.
      pageExtensions: ["statyczny.tsx", "statyczny.ts", "tsx", "ts", "jsx", "js"],
    }
  : {
      // `serwer.*` PRZED domyślnymi: trasy tylko-serwerowe są widoczne.
      pageExtensions: ["serwer.tsx", "serwer.ts", "tsx", "ts", "jsx", "js"],
      async headers() {
        return [{ source: "/(.*)", headers: naglowkiBezpieczenstwa }];
      },
    };

export default nextConfig;
