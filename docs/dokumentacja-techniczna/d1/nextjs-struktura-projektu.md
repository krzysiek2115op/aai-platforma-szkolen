# Next.js — Struktura projektu i konwencje plików

> Źródło: https://nextjs.org/docs/app/getting-started/project-structure
> Data pobrania: 2026-08-17 | Wersja dokumentacji: Next.js 16.3.1 (lastUpdated 2026-07-21)

## Foldery najwyższego poziomu

| Folder   | Przeznaczenie                               |
| -------- | ------------------------------------------- |
| `app`    | App Router                                  |
| `pages`  | Pages Router (starszy)                      |
| `public` | Zasoby statyczne serwowane od `/`           |
| `src`    | Opcjonalny folder na kod aplikacji          |

## Pliki najwyższego poziomu

| Plik                 | Przeznaczenie                                            |
| -------------------- | -------------------------------------------------------- |
| `next.config.js`     | Konfiguracja Next.js                                     |
| `package.json`       | Zależności i skrypty                                     |
| `instrumentation.ts` | OpenTelemetry / instrumentacja                           |
| `proxy.ts`           | Proxy żądań Next.js                                      |
| `.env`, `.env.local`, `.env.production`, `.env.development` | Zmienne środowiskowe (poza kontrolą wersji) |
| `eslint.config.mjs`  | Konfiguracja ESLint                                      |
| `.gitignore`         | Ignorowane pliki Git                                     |
| `next-env.d.ts`      | Deklaracje TS dla Next.js (poza kontrolą wersji)         |
| `tsconfig.json` / `jsconfig.json` | Konfiguracja TypeScript / JavaScript        |

## Pliki routingu (specjalne)

| Plik           | Rozszerzenia        | Rola                                  |
| -------------- | ------------------- | ------------------------------------- |
| `layout`       | `.js` `.jsx` `.tsx` | Layout (współdzielone UI)             |
| `page`         | `.js` `.jsx` `.tsx` | Strona (udostępnia trasę publicznie)  |
| `loading`      | `.js` `.jsx` `.tsx` | UI ładowania (skeleton, Suspense)     |
| `not-found`    | `.js` `.jsx` `.tsx` | UI "nie znaleziono"                   |
| `error`        | `.js` `.jsx` `.tsx` | UI błędu (error boundary)             |
| `global-error` | `.js` `.jsx` `.tsx` | Globalne UI błędu                     |
| `route`        | `.js` `.ts`         | Endpoint API                          |
| `template`     | `.js` `.jsx` `.tsx` | Layout renderowany od nowa            |
| `default`      | `.js` `.jsx` `.tsx` | Fallback dla tras równoległych        |

## Trasy zagnieżdżone

Foldery = segmenty URL. Trasa staje się publiczna dopiero, gdy istnieje plik `page` lub `route`.

| Ścieżka                     | URL             | Uwagi                          |
| --------------------------- | --------------- | ------------------------------ |
| `app/layout.tsx`            | —               | Root layout, opakowuje wszystko |
| `app/blog/layout.tsx`       | —               | Opakowuje `/blog` i potomków   |
| `app/page.tsx`              | `/`             | Trasa publiczna                |
| `app/blog/page.tsx`         | `/blog`         | Trasa publiczna                |
| `app/blog/authors/page.tsx` | `/blog/authors` | Trasa publiczna                |

## Trasy dynamiczne

| Ścieżka                         | Wzorce URL                                |
| ------------------------------- | ----------------------------------------- |
| `app/blog/[slug]/page.tsx`      | `/blog/my-first-post` (jeden parametr)    |
| `app/shop/[...slug]/page.tsx`   | `/shop/clothing`, `/shop/clothing/shirts` (catch-all) |
| `app/docs/[[...slug]]/page.tsx` | `/docs`, `/docs/layouts-and-pages` (opcjonalny catch-all) |

Wartości dostępne przez prop `params`.

## Grupy tras i foldery prywatne

| Ścieżka                         | URL     | Uwagi                                |
| ------------------------------- | ------- | ------------------------------------ |
| `app/(marketing)/page.tsx`      | `/`     | Grupa `(nazwa)` pomijana w URL       |
| `app/(shop)/cart/page.tsx`      | `/cart` | Wspólne layouty w obrębie `(shop)`   |
| `app/blog/_components/Post.tsx` | —       | `_folder` = prywatny, nieroutowalny  |
| `app/blog/_lib/data.ts`         | —       | Nieroutowalny, miejsce na utilsy     |

## Trasy równoległe i przechwytywane

| Wzorzec          | Znaczenie                  | Typowe użycie                       |
| ---------------- | -------------------------- | ----------------------------------- |
| `@folder`        | Nazwany slot               | Sidebar + główna treść              |
| `(.)folder`      | Przechwycenie tego poziomu | Podgląd trasy sąsiedniej w modalu   |
| `(..)folder`     | Przechwycenie rodzica      | Overlay dziecka rodzica             |
| `(..)(..)folder` | Dwa poziomy wyżej          | Głęboko zagnieżdżony overlay        |
| `(...)folder`    | Przechwycenie od korzenia  | Dowolna trasa w bieżącym widoku     |

## Konwencje plików metadanych

Ikony: `favicon.ico`, `icon` (`.ico` `.jpg` `.jpeg` `.png` `.svg` lub generowane `.js` `.ts` `.tsx`), `apple-icon` (`.jpg` `.jpeg` `.png` lub generowane).
Open Graph / Twitter: `opengraph-image`, `twitter-image` (`.jpg` `.jpeg` `.png` `.gif` lub generowane `.js` `.ts` `.tsx`).
SEO: `sitemap` (`.xml` lub `.js` `.ts`), `robots` (`.txt` lub `.js` `.ts`).

## Hierarchia komponentów

Komponenty z plików specjalnych renderują się w kolejności (rekurencyjnie w zagnieżdżonych trasach — dziecko WEWNĄTRZ rodzica):

1. `layout.js`
2. `template.js`
3. `error.js` (React error boundary)
4. `loading.js` (React suspense boundary)
5. `not-found.js` (error boundary dla "not found")
6. `page.js` lub zagnieżdżony `layout.js`

## Organizacja projektu

Next.js jest **nieopiniotwórczy** co do organizacji plików. Kluczowe mechanizmy:

- **Kolokacja** — pliki projektowe można bezpiecznie trzymać w segmentach `app`; do klienta trafia tylko to, co zwraca `page.js`/`route.js`. Trasa nie jest publiczna bez `page`/`route`.
- **Foldery prywatne** `_folderName` — wyłączają folder i podfoldery z routingu; przydatne do rozdzielenia logiki UI od routingu i unikania konfliktów nazw z przyszłymi konwencjami. Segment URL zaczynający się od podkreślnika: prefiks `%5F`.
- **Grupy tras** `(folderName)` — organizacja bez wpływu na URL; pozwalają na wiele zagnieżdżonych layoutów na tym samym poziomie, layout tylko dla podzbioru tras, oraz **wiele root layoutów** (usuń `app/layout.js`, dodaj `layout.js` w każdej grupie — każdy z własnym `<html>` i `<body>`).
- **Folder `src`** — oddziela kod aplikacji (w tym `app`) od plików konfiguracyjnych w korzeniu.

Typowe strategie (wybierz jedną i bądź konsekwentny):

1. Pliki projektu poza `app` (root: `components`, `lib`; `app` czysto routingowy).
2. Pliki projektu w folderach na szczycie `app`.
3. Podział wg funkcji/trasy — globalne w korzeniu `app`, specyficzne w segmentach, które ich używają.

Loading skeleton tylko dla jednej trasy: utwórz grupę np. `(overview)` i umieść w niej `loading.tsx` obok `page.tsx`.
