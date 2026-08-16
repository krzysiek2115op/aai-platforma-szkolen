# Next.js — Moduł fontów (next/font)

> Źródło: https://nextjs.org/docs/app/api-reference/components/font
> Data pobrania: 2026-08-17 | Wersja dokumentacji: Next.js 16.3.1 (lastUpdated 2025-08-06)
> Uwaga: przykłady w oficjalnej dokumentacji używają Inter/Roboto; fonty Geist ładuje się identycznie (`import { Geist, Geist_Mono } from 'next/font/google'`) — to standard szablonu create-next-app.

`next/font` automatycznie optymalizuje fonty (także własne) i usuwa zewnętrzne żądania sieciowe (prywatność + wydajność). Wbudowany **self-hosting** dowolnego pliku fontu — bez layout shift. Google Fonts pobierane w czasie builda i serwowane z własnych zasobów statycznych — **przeglądarka nie wysyła żadnych żądań do Google**.

## Google Fonts — podstawowe użycie

```tsx
// app/layout.tsx
import { Inter } from 'next/font/google'

// Dla fontu variable nie trzeba podawać wagi
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.className}>
      <body>{children}</body>
    </html>
  )
}
```

Font nie-variable wymaga wagi:

```tsx
import { Roboto } from 'next/font/google'

const roboto = Roboto({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
})
```

Wiele wag/stylów tablicą:

```jsx
const roboto = Roboto({
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  display: 'swap',
})
```

Nazwy wieloczłonowe z podkreślnikiem: `Roboto Mono` → `Roboto_Mono`.

## Opcje (referencja)

| Klucz                | google | local | Typ                        | Wymagane |
| -------------------- | ------ | ----- | -------------------------- | -------- |
| `src`                | ✗      | ✓     | String / Array of Objects  | Tak (local) |
| `weight`             | ✓      | ✓     | String / Array             | Tak, jeśli font NIE jest variable |
| `style`              | ✓      | ✓     | String / Array             | —        |
| `subsets`            | ✓      | ✗     | Array of Strings           | —        |
| `axes`               | ✓      | ✗     | Array of Strings           | —        |
| `display`            | ✓      | ✓     | String                     | — (domyślnie `'swap'`) |
| `preload`            | ✓      | ✓     | Boolean                    | — (domyślnie `true`) |
| `fallback`           | ✓      | ✓     | Array of Strings           | —        |
| `adjustFontFallback` | ✓      | ✓     | Boolean / String           | — (google: `true`; local: `'Arial'`) |
| `variable`           | ✓      | ✓     | String                     | —        |
| `declarations`       | ✗      | ✓     | Array of Objects           | —        |

Wybrane szczegóły:

- `subsets: ['latin']` — które podzbiory preloadować (brak przy `preload: true` daje ostrzeżenie).
- `weight: '100 900'` — zakres dla fontu variable; `weight: ['100','400','900']` — tablica dla nie-variable.
- `display`: `'auto' | 'block' | 'swap' | 'fallback' | 'optional'`.
- `fallback: ['system-ui', 'arial']`.
- `variable: '--my-font'` — nazwa zmiennej CSS (metoda CSS variables).
- `declarations: [{ prop: 'ascent-override', value: '90%' }]` (tylko local).

## Fonty lokalne

```tsx
// app/layout.tsx
import localFont from 'next/font/local'

// Pliki fontów można kolokować w `app`
const myFont = localFont({
  src: './my-font.woff2',
  display: 'swap',
})
```

Wiele plików jednej rodziny:

```js
const roboto = localFont({
  src: [
    { path: './Roboto-Regular.woff2', weight: '400', style: 'normal' },
    { path: './Roboto-Italic.woff2', weight: '400', style: 'italic' },
    { path: './Roboto-Bold.woff2', weight: '700', style: 'normal' },
    { path: './Roboto-BoldItalic.woff2', weight: '700', style: 'italic' },
  ],
})
```

## Integracja z Tailwind CSS (przez zmienne CSS)

```tsx
// app/layout.tsx
import { Inter, Roboto_Mono } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const roboto_mono = Roboto_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto-mono',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${roboto_mono.variable} antialiased`}
    >
      <body>{children}</body>
    </html>
  )
}
```

Podpięcie zmiennych do motywu Tailwind 4 (`@theme inline`):

```css
/* global.css */
@import 'tailwindcss';

@theme inline {
  --font-sans: var(--font-inter);
  --font-mono: var(--font-roboto-mono);
}
```

Potem klasy `font-sans` / `font-mono` używają tych fontów. (W Tailwind v3 — `theme.extend.fontFamily` w `tailwind.config.js`.)

## Sposoby aplikowania stylów

- `className` — `<p className={inter.className}>Hello</p>`
- `style` — `<p style={inter.style}>Hello</p>`
- Zmienne CSS — klasa `inter.variable` na kontenerze + `font-family: var(--font-inter)` w CSS.

## Wiele fontów / plik definicji fontów

Każde wywołanie funkcji fontu hostuje font jako osobną instancję — ten sam font ładuj **w jednym miejscu** i importuj obiekt tam, gdzie potrzebny:

```ts
// styles/fonts.ts
import { Inter, Lora, Source_Sans_3 } from 'next/font/google'
import localFont from 'next/font/local'

const inter = Inter()
const lora = Lora()
const sourceCodePro400 = Source_Sans_3({ weight: '400' })
const sourceCodePro700 = Source_Sans_3({ weight: '700' })
const greatVibes = localFont({ src: './GreatVibes-Regular.ttf' })

export { inter, lora, sourceCodePro400, sourceCodePro700, greatVibes }
```

Każdy nowy font = dodatkowy zasób do pobrania — używaj oszczędnie.

## Preloading

Font jest preloadowany tylko na trasach, gdzie go użyto:

- w unikalnej stronie → tylko trasa tej strony,
- w layoucie → wszystkie trasy objęte layoutem,
- w root layoucie → wszystkie trasy.

## Historia wersji

| Wersja    | Zmiana                                                |
| --------- | ----------------------------------------------------- |
| `v13.2.0` | `@next/font` → `next/font` (bez osobnej instalacji)   |
| `v13.0.0` | Dodano `@next/font`                                   |
