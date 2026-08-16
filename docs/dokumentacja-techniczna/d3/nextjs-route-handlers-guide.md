# Next.js — Route Handlers — Getting Started (przewodnik)

> Źródło: https://nextjs.org/docs/app/getting-started/route-handlers
> (URL z zadania `/route-handlers-and-middleware` prowadzi obecnie do tej strony —
> aktualny przewodnik nazywa się „Route Handlers"; część o middleware wydzielono.)
> Data pobrania: 2026-08-17 · Wersja docs Next.js: **16.3.1** (lastUpdated: 2026-03-03)

## Streszczenie (PL)

Przewodnik „Getting Started" o Route Handlers. Najważniejsze dla D3:

- **Konwencja**: handler definiuje się w pliku `route.js|ts` w katalogu `app`;
  może być zagnieżdżony dowolnie (jak `page.js`/`layout.js`), ale **nie może**
  istnieć `route.js` na tym samym poziomie segmentu co `page.js` (konflikt).
- Route Handlers to odpowiednik API Routes z Pages Routera — nie łączy się obu.
- **Metody**: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`;
  nieobsługiwana metoda → **405 Method Not Allowed** (Next.js zwraca sam).
- Next.js rozszerza webowe `Request`/`Response` o `NextRequest`/`NextResponse`.
- **Cache**: Route Handlers **domyślnie nie są cache'owane**. Cache można włączyć
  tylko dla `GET` (np. `export const dynamic = 'force-static'`); pozostałe metody
  nigdy nie są cache'owane, nawet w tym samym pliku obok cache'owanego `GET`.
- **Cache Components**: `GET` działa jak zwykłe trasy UI — request-time domyślnie,
  prerender gdy nie dotyka danych uncached/runtime; `use cache` tylko w funkcji
  pomocniczej (nie bezpośrednio w ciele handlera), rewalidacja wg `cacheLife`.
  Prerender przerywają: zapytania sieciowe/DB, async FS, właściwości request
  (`req.url`, `request.headers`, `request.cookies`, `request.body`), API runtime
  (`cookies()`, `headers()`, `connection()`), operacje niedeterministyczne.
- **Route Resolution**: `route` to najniższy prymityw routingu — nie uczestniczy
  w layoutach ani nawigacji klienckiej; jeden plik `route.js`/`page.js` przejmuje
  wszystkie metody HTTP danej trasy.
- **RouteContext**: globalny helper TS do typowania `context` (typy generowane
  przy `next dev`/`next build`/`next typegen`).

## Konwencja

```ts
// app/api/route.ts
export async function GET(request: Request) {}
```

> **Good to know**: Route Handlers are only available inside the `app` directory.
> They are the equivalent of API Routes inside the `pages` directory meaning you
> **do not** need to use API Routes and Route Handlers together.

## Cache dla `GET` (opt-in)

```ts
// app/items/route.ts
export const dynamic = 'force-static'

export async function GET() {
  const res = await fetch('https://data.mongodb-api.com/...', {
    headers: {
      'Content-Type': 'application/json',
      'API-Key': process.env.DATA_API_KEY,
    },
  })
  const data = await res.json()

  return Response.json({ data })
}
```

> **Good to know**: Other supported HTTP methods are **not** cached, even if they
> are placed alongside a `GET` method that is cached, in the same file.

## Cache Components — przykłady

Statyczny (prerender w build time):

```tsx
// app/api/project-info/route.ts
export async function GET() {
  return Response.json({
    projectName: 'Next.js',
  })
}
```

Dynamiczny (operacja niedeterministyczna przerywa prerender):

```tsx
// app/api/random-number/route.ts
export async function GET() {
  return Response.json({
    randomNumber: Math.random(),
  })
}
```

Dane runtime (`headers()` kończy prerender):

```tsx
// app/api/user-agent/route.ts
import { headers } from 'next/headers'

export async function GET() {
  const headersList = await headers()
  const userAgent = headersList.get('user-agent')

  return Response.json({ userAgent })
}
```

Cache'owanie danych przez `use cache` (w funkcji pomocniczej!):

```tsx
// app/api/products/route.ts
import { cacheLife } from 'next/cache'

export async function GET() {
  const products = await getProducts()
  return Response.json(products)
}

async function getProducts() {
  'use cache'
  cacheLife('hours')

  return await db.query('SELECT * FROM products')
}
```

> **Good to know**: `use cache` cannot be used directly inside a Route Handler
> body; extract it to a helper function. Cached responses revalidate according
> to `cacheLife` when a new request arrives.

## Route Resolution

| Page                 | Route              | Result     |
| -------------------- | ------------------ | ---------- |
| `app/page.js`        | `app/route.js`     | ✗ Conflict |
| `app/page.js`        | `app/api/route.js` | ✓ Valid    |
| `app/[user]/page.js` | `app/api/route.js` | ✓ Valid    |

```ts
// app/page.ts
export default function Page() {
  return <h1>Hello, Next.js!</h1>
}

// Conflict
// `app/route.ts`
export async function POST(request: Request) {}
```

## Route Context Helper

```ts
// app/users/[id]/route.ts
import type { NextRequest } from 'next/server'

export async function GET(_req: NextRequest, ctx: RouteContext<'/users/[id]'>) {
  const { id } = await ctx.params
  return Response.json({ id })
}
```

## Powiązane strony docs

- API reference: `/docs/app/api-reference/file-conventions/route`
- Backend for Frontend: `/docs/app/guides/backend-for-frontend`
