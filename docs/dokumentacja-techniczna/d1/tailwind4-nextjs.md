# Tailwind CSS 4 — Instalacja w Next.js

> Źródło: https://tailwindcss.com/docs/installation/framework-guides/nextjs
> Data pobrania: 2026-08-17 | Wersja dokumentacji: Tailwind CSS v4.3

Oficjalny przewodnik instalacji Tailwind CSS 4 w Next.js (App Router, TypeScript, ESLint).

## Krok 1 — Utwórz projekt

```bash
npx create-next-app@latest my-project --typescript --eslint --app
cd my-project
```

## Krok 2 — Zainstaluj Tailwind CSS

```bash
npm install tailwindcss @tailwindcss/postcss postcss
```

## Krok 3 — Skonfiguruj pluginy PostCSS

Utwórz `postcss.config.mjs` w korzeniu projektu:

```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
export default config;
```

## Krok 4 — Zaimportuj Tailwind CSS

Dodaj do `./app/globals.css`:

```css
@import "tailwindcss";
```

Uwaga (Tailwind 4): brak `tailwind.config.js` i dyrektyw `@tailwind base/components/utilities` — cała konfiguracja przez CSS (`@import "tailwindcss"` + `@theme`).

## Krok 5 — Uruchom proces builda

```bash
npm run dev
```

## Krok 6 — Używaj klas Tailwinda

Przykład w `page.tsx`:

```tsx
export default function Home() {
  return (
    <h1 className="text-3xl font-bold underline">
      Hello world!
    </h1>
  )
}
```
