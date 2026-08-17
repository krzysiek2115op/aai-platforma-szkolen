# Źródła dokumentacji technicznej — Dział D4 (strona katalogu)

Wszystkie strony pobrane przez WebFetch z nextjs.org (oryginalna
dokumentacja, nie z pamięci modelu). Wersja Next.js odczytana z frontmatteru
docs (`version:`).

| Plik | URL | Data pobrania | Wersja Next.js (frontmatter) |
| ---- | --- | ------------- | ---------------------------- |
| nextjs-fetch-danych.md | https://nextjs.org/docs/app/getting-started/fetching-data | 2026-08-17 | 16.3.1 (lastUpdated 2026-08-11) |
| nextjs-cache-rewalidacja.md | https://nextjs.org/docs/app/getting-started/caching + https://nextjs.org/docs/app/getting-started/revalidating | 2026-08-17 | 16.3.1 (lastUpdated 2026-08-10 / 2026-06-25) |
| nextjs-rendering.md | https://nextjs.org/docs/app/getting-started/caching (sekcje Prerendering/PPR) + https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config | 2026-08-17 | 16.3.1 (lastUpdated 2026-08-10 / 2026-04-30) |
| nextjs-not-found.md | https://nextjs.org/docs/app/api-reference/file-conventions/not-found | 2026-08-17 | 16.3.1 (lastUpdated 2026-07-10) |
| nextjs-image.md | https://nextjs.org/docs/app/api-reference/components/image | 2026-08-17 | 16.3.1 (lastUpdated 2026-05-04) |

## Odstępstwa od URL-i z zadania (przekierowania)

1. **`/docs/app/getting-started/caching-and-revalidating`** — nie istnieje
   pod tą nazwą; treść serwowana jako `/docs/app/getting-started/caching`
   (model Cache Components). Tematy rewalidacji (revalidateTag, updateTag,
   revalidatePath, cacheTag, cacheLife) są na osobnej stronie
   `/docs/app/getting-started/revalidating` — pobrano OBIE i połączono
   w `nextjs-cache-rewalidacja.md`.
2. **`/docs/app/getting-started/partial-prerendering`** — przekierowuje do
   `/docs/app/getting-started/caching`; PPR jest tam opisany jako domyślny
   model renderowania z Cache Components (sekcja „Prerendering").
3. **`export const dynamic`** — wg Route Segment Config (Version History,
   v16.0.0) opcje `dynamic`, `revalidate`, `fetchCache` zostały USUNIĘTE,
   gdy włączony jest Cache Components. Poprzedni model (z `export const
   dynamic`) opisuje przewodnik
   `/docs/app/guides/caching-without-cache-components` — odnotowano
   w `nextjs-rendering.md`.
