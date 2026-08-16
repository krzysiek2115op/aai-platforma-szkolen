# Next.js — Route Handlers (`route.js`) — API Reference

> Źródło: https://nextjs.org/docs/app/api-reference/file-conventions/route
> Data pobrania: 2026-08-17 · Wersja docs Next.js: **16.3.1** (lastUpdated w frontmatterze: 2026-04-30)

## Streszczenie (PL)

Route Handlers pozwalają tworzyć własne handlery żądań HTTP dla danej trasy,
oparte o webowe API `Request` / `Response`. Plik `route.ts` w katalogu `app`
eksportuje funkcje o nazwach metod HTTP.

Kluczowe fakty dla D3 (dyspozytor — jeden endpoint AJAX POST):

- **Obsługiwane metody**: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`.
  Jeśli `OPTIONS` nie jest zdefiniowany, Next.js implementuje go automatycznie
  (nagłówek `Allow` wg zdefiniowanych metod).
- **Parametr `request`** to `NextRequest` (rozszerzenie webowego `Request`) —
  daje m.in. `request.cookies` i sparsowany URL `request.nextUrl`
  (w tym `nextUrl.searchParams`).
- **Parametr `context.params`** to **Promise** (od v15: `const { slug } = await params`).
- **Body żądania**: `await request.json()` (JSON) lub `await request.formData()`
  (FormData — wszystkie wartości są stringami; docs wprost zalecają walidację,
  np. `zod-form-data`).
- **Cache/dynamika**: od v15 `GET` domyślnie **dynamiczny** (nie cache'owany).
  Cache przez segment config (`export const revalidate = 60`) itd.
- **Segment config**: `dynamic`, `dynamicParams`, `revalidate`, `fetchCache`,
  `runtime` (`'nodejs'`), `preferredRegion` (deprecated).
- **Typowanie kontekstu**: globalny helper `RouteContext<'/users/[id]'>`
  (typy generowane przy `next dev` / `next build` / `next typegen`, bez importu).
- Odpowiedź: `Response.json({...})` albo `new Response(body, { status, headers })`.
- Webhooki/odczyt surowego body: `await request.text()`; błędy zwracać jako
  `Response` ze statusem (np. 400).

## Podstawowy handler

```ts
// route.ts
export async function GET() {
  return Response.json({ message: 'Hello World' })
}
```

## Metody HTTP

```ts
// route.ts
export async function GET(request: Request) {}

export async function HEAD(request: Request) {}

export async function POST(request: Request) {}

export async function PUT(request: Request) {}

export async function DELETE(request: Request) {}

export async function PATCH(request: Request) {}

// If `OPTIONS` is not defined, Next.js will automatically implement `OPTIONS` and set the appropriate Response `Allow` header depending on the other methods defined in the Route Handler.
export async function OPTIONS(request: Request) {}
```

## Parametr `request` (`NextRequest`)

```ts
// route.ts
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const url = request.nextUrl
}
```

## Parametr `context` — `params` jako Promise

```ts
// app/dashboard/[team]/route.ts
export async function GET(
  request: Request,
  { params }: { params: Promise<{ team: string }> }
) {
  const { team } = await params
}
```

| Example                          | URL            | `params`                           |
| -------------------------------- | -------------- | ---------------------------------- |
| `app/dashboard/[team]/route.js`  | `/dashboard/1` | `Promise<{ team: '1' }>`           |
| `app/shop/[tag]/[item]/route.js` | `/shop/1/2`    | `Promise<{ tag: '1', item: '2' }>` |
| `app/blog/[...slug]/route.js`    | `/blog/1/2`    | `Promise<{ slug: ['1', '2'] }>`    |

## Route Context Helper (typowany kontekst)

```ts
// app/users/[id]/route.ts
import type { NextRequest } from 'next/server'

export async function GET(_req: NextRequest, ctx: RouteContext<'/users/[id]'>) {
  const { id } = await ctx.params
  return Response.json({ id })
}
```

> Types are generated during `next dev`, `next build` or `next typegen`.
> After type generation, the `RouteContext` helper is globally available.

## Cookies

```ts
// route.ts
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()

  const a = cookieStore.get('a')
  const b = cookieStore.set('b', '1')
  const c = cookieStore.delete('c')
}
```

Alternatywnie przez nagłówek `Set-Cookie` w odpowiedzi:

```ts
// app/api/route.ts
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')

  return new Response('Hello, Next.js!', {
    status: 200,
    headers: { 'Set-Cookie': `token=${token.value}` },
  })
}
```

Lub bezpośrednio z żądania:

```ts
// app/api/route.ts
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('token')
}
```

## Headers

```ts
// route.ts
import { headers } from 'next/headers'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const headersList = await headers()
  const referer = headersList.get('referer')
}
```

Instancja `headers()` jest tylko do odczytu — nagłówki odpowiedzi ustawia się
w zwracanym `Response`:

```ts
// app/api/route.ts
import { headers } from 'next/headers'

export async function GET(request: Request) {
  const headersList = await headers()
  const referer = headersList.get('referer')

  return new Response('Hello, Next.js!', {
    status: 200,
    headers: { referer: referer },
  })
}
```

## Revalidacja cache

```ts
// app/posts/route.ts
export const revalidate = 60

export async function GET() {
  const data = await fetch('https://api.vercel.app/blog')
  const posts = await data.json()

  return Response.json(posts)
}
```

## Redirect

```ts
// app/api/route.ts
import { redirect } from 'next/navigation'

export async function GET(request: Request) {
  redirect('https://nextjs.org/')
}
```

## Dynamiczne segmenty

```ts
// app/items/[slug]/route.ts
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params // 'a', 'b', or 'c'
}
```

Można łączyć z `generateStaticParams` (statyczna generacja odpowiedzi dla
wskazanych params w build time; z Cache Components — w połączeniu z `use cache`).

## Query params (`nextUrl.searchParams`)

```ts
// app/api/search/route.ts
import { type NextRequest } from 'next/server'

export function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('query')
  // query is "hello" for /api/search?query=hello
}
```

## Body żądania — JSON (kluczowe dla dyspozytora D3)

```ts
// app/items/route.ts
export async function POST(request: Request) {
  const res = await request.json()
  return Response.json({ res })
}
```

## Body żądania — FormData

```ts
// app/items/route.ts
export async function POST(request: Request) {
  const formData = await request.formData()
  const name = formData.get('name')
  const email = formData.get('email')
  return Response.json({ name, email })
}
```

> Since `formData` data are all strings, you may want to use `zod-form-data`
> to validate the request and retrieve data in the format you prefer (e.g. `number`).

## Streaming (Web API)

```ts
// app/api/route.ts
// https://developer.mozilla.org/docs/Web/API/ReadableStream#convert_async_iterator_to_stream
function iteratorToStream(iterator: any) {
  return new ReadableStream({
    async pull(controller) {
      const { value, done } = await iterator.next()

      if (done) {
        controller.close()
      } else {
        controller.enqueue(value)
      }
    },
  })
}

function sleep(time: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, time)
  })
}

const encoder = new TextEncoder()

async function* makeIterator() {
  yield encoder.encode('<p>One</p>')
  await sleep(200)
  yield encoder.encode('<p>Two</p>')
  await sleep(200)
  yield encoder.encode('<p>Three</p>')
}

export async function GET() {
  const iterator = makeIterator()
  const stream = iteratorToStream(iterator)

  return new Response(stream)
}
```

## CORS

```ts
// app/api/route.ts
export async function GET(request: Request) {
  return new Response('Hello, Next.js!', {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
```

> Dla wielu handlerów naraz: Proxy albo `headers` w `next.config.js`.

## Webhooki (surowe body + obsługa błędu)

```ts
// app/api/route.ts
export async function POST(request: Request) {
  try {
    const text = await request.text()
    // Process the webhook payload
  } catch (error) {
    return new Response(`Webhook error: ${error.message}`, {
      status: 400,
    })
  }

  return new Response('Success!', {
    status: 200,
  })
}
```

## Odpowiedzi nie-UI (np. XML)

```ts
// app/rss.xml/route.ts
export async function GET() {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">

<channel>
  <title>Next.js Documentation</title>
  <link>https://nextjs.org/docs</link>
  <description>The React Framework for the Web</description>
</channel>

</rss>`,
    {
      headers: {
        'Content-Type': 'text/xml',
      },
    }
  )
}
```

## Segment Config Options

```ts
// app/items/route.ts
export const dynamic = 'auto'
export const dynamicParams = true
export const revalidate = false
export const fetchCache = 'auto'
export const runtime = 'nodejs'
export const preferredRegion = 'auto' // deprecated
```

## Historia wersji

| Version      | Changes                                                                   |
| ------------ | ------------------------------------------------------------------------- |
| `v15.0.0-RC` | `context.params` is now a promise. A codemod is available                 |
| `v15.0.0-RC` | The default caching for `GET` handlers was changed from static to dynamic |
| `v13.2.0`    | Route Handlers are introduced.                                            |
