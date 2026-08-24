# Next.js — CSS (Tailwind, CSS Modules, Global CSS)

> Źródło: https://nextjs.org/docs/app/getting-started/css
> Data pobrania: 2026-08-17 | Wersja dokumentacji: Next.js 16.3.1 (lastUpdated 2026-03-20)

Sposoby stylowania: Tailwind CSS, CSS Modules, Global CSS, zewnętrzne arkusze, Sass, CSS-in-JS.

## Tailwind CSS (zalecany do większości stylowania)

Instalacja:

```bash
npm install -D tailwindcss @tailwindcss/postcss
```

Plugin PostCSS w `postcss.config.mjs`:

```js
// postcss.config.mjs
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

Import Tailwinda w globalnym CSS:

```css
/* app/globals.css */
@import 'tailwindcss';
```

Import pliku CSS w root layoucie:

```tsx
// app/layout.tsx
import './globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

Użycie klas narzędziowych:

```tsx
// app/page.tsx
export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1 className="text-4xl font-bold">Welcome to Next.js!</h1>
    </main>
  )
}
```

Dla bardzo starych przeglądarek — osobny przewodnik Tailwind CSS v3.

## CSS Modules

Lokalny zasięg klas (unikalne nazwy, brak kolizji). Plik z rozszerzeniem `.module.css`:

```css
/* app/blog/blog.module.css */
.blog {
  padding: 24px;
}
```

```tsx
// app/blog/page.tsx
import styles from './blog.module.css'

export default function Page() {
  return <main className={styles.blog}></main>
}
```

## Global CSS

Import w root layoucie stosuje style do **każdej trasy**:

```css
/* app/global.css */
body {
  padding: 20px 20px 60px;
  max-width: 680px;
  margin: 0 auto;
}
```

```tsx
// app/layout.tsx
import './global.css'
```

Uwaga: style globalne można importować w dowolnym layoucie/stronie/komponencie w `app`, ale arkusze nie są usuwane przy nawigacji między trasami — możliwe konflikty. Zalecenie: global CSS tylko dla naprawdę globalnych rzeczy (np. baza Tailwinda), **Tailwind** do stylowania komponentów, **CSS Modules** do niestandardowych styli o lokalnym zasięgu.

## Zewnętrzne arkusze

Arkusze z paczek npm można importować wszędzie w `app`:

```tsx
// app/layout.tsx
import 'bootstrap/dist/css/bootstrap.css'
```

W React 19 działa też `<link rel="stylesheet" href="..." />`.

## Kolejność i scalanie (Ordering / Merging)

W buildzie produkcyjnym Next.js automatycznie scala arkusze; **kolejność CSS zależy od kolejności importów w kodzie**:

```tsx
// page.tsx — base-button.module.css będzie przed page.module.css
import { BaseButton } from './base-button'
import styles from './page.module.css'

export default function Page() {
  return <BaseButton className={styles.primary} />
}
```

Rekomendacje:

- Importy CSS trzymaj w jednym pliku wejściowym; globalne style i Tailwind importuj w korzeniu aplikacji.
- Spójna konwencja nazw modułów: `<name>.module.css`.
- Wyłącz auto-sortowanie importów (np. ESLint `sort-imports`).
- Kontrola chunków: opcja `cssChunking` w `next.config.js`.

## Development vs Production

- Dev (`next dev`): natychmiastowe aktualizacje CSS przez Fast Refresh.
- Produkcja (`next build`): CSS scalony do zminifikowanych, dzielonych plików `.css` per trasa.
- Kolejność CSS może różnić się w dev — zawsze weryfikuj ostateczny build (`next build`).
