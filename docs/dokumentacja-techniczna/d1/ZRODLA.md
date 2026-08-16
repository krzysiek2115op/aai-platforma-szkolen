# Źródła dokumentacji technicznej — Dział D1

Dokumentacja pobrana z oficjalnych stron przez WebFetch (nie z pamięci modelu).
Wszystkie URL-e działały bez przekierowań/404 — nie było potrzeby szukania zamienników.

| Plik | URL źródłowy | Data pobrania | Wersja narzędzia |
| ---- | ------------ | ------------- | ---------------- |
| nextjs-instalacja.md | https://nextjs.org/docs/app/getting-started/installation | 2026-08-17 | Next.js 16.3.1 |
| nextjs-layouts-pages.md | https://nextjs.org/docs/app/getting-started/layouts-and-pages | 2026-08-17 | Next.js 16.3.1 |
| nextjs-struktura-projektu.md | https://nextjs.org/docs/app/getting-started/project-structure | 2026-08-17 | Next.js 16.3.1 |
| nextjs-css.md | https://nextjs.org/docs/app/getting-started/css | 2026-08-17 | Next.js 16.3.1 |
| nextjs-fonty.md | https://nextjs.org/docs/app/api-reference/components/font | 2026-08-17 | Next.js 16.3.1 |
| tailwind4-nextjs.md | https://tailwindcss.com/docs/installation/framework-guides/nextjs | 2026-08-17 | Tailwind CSS v4.3 |
| tailwind4-theme.md | https://tailwindcss.com/docs/theme | 2026-08-17 | Tailwind CSS v4.3 |

## Uwagi

- Wersje odczytane z treści stron: nagłówki dokumentacji Next.js podają `version: 16.3.1`; strony Tailwind podają `v4.3`.
- Strona next/font nie zawiera przykładu z fontami Geist (przykłady: Inter, Roboto_Mono) — adnotacja o Geist dodana w nagłówku `nextjs-fonty.md` (ładowanie identyczne jak innych Google Fonts).
- Istotne dla D1: od Next.js 16 `next build` nie uruchamia lintera; Turbopack jest domyślnym bundlerem; Tailwind 4 konfiguruje się w CSS (`@import "tailwindcss"` + `@theme`), bez `tailwind.config.js`.
