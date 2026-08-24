# Next.js — not-found.js i funkcja notFound()

> Źródło: https://nextjs.org/docs/app/api-reference/file-conventions/not-found
> Data pobrania: 2026-08-17 · Wersja docs: Next.js 16.3.1 (lastUpdated: 2026-07-10)
> Pobrano przez WebFetch (oryginalna dokumentacja).

## Streszczenie (PL)

- Dwie konwencje obsługi „nie znaleziono":
  - **`not-found.js`** — UI renderowane, gdy w segmencie trasy zostanie
    rzucona funkcja **`notFound()`** (z `next/navigation`). Dla D4: strona
    kursu, którego nie ma w bazie → `notFound()`.
  - **`global-not-found.js`** (eksperymentalne, flaga
    `experimental.globalNotFound`) — globalna 404 dla URL-i niepasujących
    do żadnej trasy; omija layouty, musi zwracać pełny dokument HTML.
- Statusy HTTP: `200` dla odpowiedzi streamowanych, `404` dla
  niestreamowanych.
- Komponenty `not-found` NIE przyjmują żadnych propsów.
- Root `app/not-found.js` obsługuje także WSZYSTKIE niedopasowane URL-e
  całej aplikacji.
- `not-found` jest domyślnie komponentem serwerowym — może być `async`
  i pobierać dane.
- W hierarchii komponentów `not-found.js` renderuje się między `loading.js`
  a `page.js` (wewnątrz Suspense z `loading.js` i error boundary z `error.js`).
- Next.js automatycznie dodaje `<meta name="robots" content="noindex" />`
  dla stron ze statusem 404.

## Podstawowy `not-found.tsx`

```tsx
// app/not-found.tsx
import Link from 'next/link'

export default function NotFound() {
  return (
    <div>
      <h2>Not Found</h2>
      <p>Could not find requested resource</p>
      <Link href="/">Return Home</Link>
    </div>
  )
}
```

(Ten sam wzorzec działa per segment, np. `app/blog/not-found.js`.)

## `not-found` z pobieraniem danych (async Server Component)

```tsx
// app/not-found.tsx
import Link from 'next/link'
import { headers } from 'next/headers'

export default async function NotFound() {
  const headersList = await headers()
  const domain = headersList.get('host')
  const data = await getSiteData(domain)
  return (
    <div>
      <h2>Not Found: {data.name}</h2>
      <p>Could not find requested resource</p>
      <p>
        View <Link href="/blog">all posts</Link>
      </p>
    </div>
  )
}
```

> Jeśli potrzebne są hooki klienckie (np. `usePathname`), dane trzeba
> pobierać po stronie klienta.

## `global-not-found.js` (eksperymentalne)

Włączenie flagi:

```tsx
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    globalNotFound: true,
  },
}

export default nextConfig
```

Plik w korzeniu `app/`:

```tsx
// app/global-not-found.tsx
// Import global styles and fonts
import './globals.css'
import { Inter } from 'next/font/google'
import type { Metadata } from 'next'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '404 - Page Not Found',
  description: 'The page you are looking for does not exist.',
}

export default function GlobalNotFound() {
  return (
    <html lang="en" className={inter.className}>
      <body>
        <h1>404 - Page Not Found</h1>
        <p>This page does not exist.</p>
      </body>
    </html>
  )
}
```

Kiedy przydatne: wiele root layoutów (np. `app/(admin)/layout.tsx` i
`app/(shop)/layout.tsx`) albo root layout z dynamicznym segmentem
(np. `app/[country]/layout.tsx`).

## Historia wersji

| Wersja    | Zmiany                                              |
| --------- | --------------------------------------------------- |
| `v15.4.0` | `global-not-found.js` introduced (experimental).    |
| `v13.3.0` | Root `app/not-found` handles global unmatched URLs. |
| `v13.0.0` | `not-found` introduced.                             |

## Powiązanie (funkcja `notFound()`)

Funkcja `notFound()` z `next/navigation` (osobna strona referencji:
`/docs/app/api-reference/functions/not-found`) rzuca błąd przerywający render
segmentu i powoduje wyrenderowanie najbliższego `not-found.js`. Typowy wzorzec
dla D4:

```tsx
import { notFound } from 'next/navigation'

const kurs = await pobierzKurs(slug) // funkcja działu (odczyt z bazy)
if (!kurs) notFound()
```
