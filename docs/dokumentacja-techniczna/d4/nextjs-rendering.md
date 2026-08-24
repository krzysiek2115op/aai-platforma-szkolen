# Next.js — Tryby renderowania: statyczny vs dynamiczny (Partial Prerendering / Cache Components)

> Źródła:
> - https://nextjs.org/docs/app/getting-started/caching — sekcje Prerendering/PPR
>   (URL z zadania `/getting-started/partial-prerendering` PRZEKIEROWUJE tutaj)
> - https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config
> Data pobrania: 2026-08-17 · Wersja docs: Next.js 16.3.1
> Pobrano przez WebFetch (oryginalna dokumentacja).

## WAŻNE — zmiana modelu w Next.js 16

Z Version History strony Route Segment Config (v16.0.0):

> `dynamic`, `dynamicParams`, `revalidate`, and `fetchCache` **removed** when
> Cache Components is enabled. See Caching and Revalidating (Previous Model)
> (`/docs/app/guides/caching-without-cache-components`).

Czyli:
- **Z `cacheComponents: true`** (docelowy model Next 16): NIE MA
  `export const dynamic` / `export const revalidate` / `fetchCache`.
  O tym, co statyczne a co dynamiczne, decydują `'use cache'`, `<Suspense>`
  i rodzaj użytych API. Domyślny tryb renderowania to **Partial Prerendering
  (PPR)**.
- **Bez Cache Components** (poprzedni model): `export const dynamic`
  (`'auto' | 'force-dynamic' | 'error' | 'force-static'`) i `export const
  revalidate` nadal działają — opis w przewodniku
  `caching-without-cache-components`. Route Segment Config w 16.3.1 wymienia
  już tylko: `dynamicParams` (bool, domyślnie `true`), `runtime`
  (`'nodejs' | 'edge'` — edge deprecated), `preferredRegion` (deprecated),
  `maxDuration`.

## Streszczenie (PL) — kiedy statyczne, kiedy dynamiczne (model Cache Components)

Podczas builda Next.js renderuje drzewo komponentów trasy; los każdego
komponentu zależy od użytych API:

- **`use cache`** → wynik cache'owany i włączany do **statycznego shella**
  (o ile lifetime nie jest za krótki — patrz `cacheLife`, „short-lived").
- **`<Suspense>`** → fallback trafia do statycznego shella, treść **streamuje
  się dynamicznie w request time**.
- **Wartości przewidywalne** (importy modułów, `fs.readFileSync`, czyste
  obliczenia, synchroniczne bazy typu `better-sqlite3` / `node:sqlite`)
  → prerenderowane automatycznie, część statycznego HTML.
- **Wartości losowe / czas** (`Math.random()`, `Date.now()`,
  `crypto.randomUUID()`) → wymagają jawnej decyzji: `connection()` +
  `<Suspense>` (unikalne per żądanie) albo `use cache` (wspólna wartość).
- **Runtime APIs** (`cookies()`, `headers()`, `searchParams`, dynamiczne
  `params` bez `generateStaticParams`) → tylko w request time; komponent
  owinąć w `<Suspense>`. Odczyt `cookies()` NIE przełącza już całej trasy
  na dynamiczną (inaczej niż w poprzednim modelu).

Efekt buildu: **statyczny shell** (HTML + RSC payload) serwowany prosto z CDN;
dynamiczne dziury dostreamowują się w request time. To jest **Partial
Prerendering (PPR)** — domyślne zachowanie z Cache Components.

Dla D4: strona katalogu z danymi z bazy przez funkcję działu z `'use cache'`
+ `cacheTag` = treść w statycznym shellu, rewalidowana tagiem; fragmenty
zależne od żądania — za `<Suspense>`.

## Statyczne + cache'owane + dynamiczne na jednej stronie (przykład z docs)

```tsx
// app/blog/page.tsx
import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { cacheLife, cacheTag } from 'next/cache'
import Link from 'next/link'

export default function BlogPage() {
  return (
    <>
      {/* Static content - prerendered automatically */}
      <header>
        <h1>Our Blog</h1>
        <nav>
          <Link href="/">Home</Link> | <Link href="/about">About</Link>
        </nav>
      </header>

      {/* Cached dynamic content - included in the static shell */}
      <BlogPosts />

      {/* Runtime dynamic content - streams at request time */}
      <Suspense fallback={<p>Loading your preferences...</p>}>
        <UserPreferences />
      </Suspense>
    </>
  )
}

type Post = { id: string; title: string; author: string; date: string }

// Everyone sees the same blog posts (revalidated every hour)
async function BlogPosts() {
  'use cache'
  cacheLife('hours')
  cacheTag('posts')

  const res = await fetch('https://api.vercel.app/blog')
  const posts: Post[] = await res.json()

  return (
    <section>
      <h2>Latest Posts</h2>
      <ul>
        {posts.map((post) => (
          <li key={post.id}>
            <h3>{post.title}</h3>
            <p>
              By {post.author} on {post.date}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}

// UI that depends on a value stored in cookies
async function UserPreferences() {
  const theme = (await cookies()).get('theme')?.value || 'light'
  const favoriteCategory = (await cookies()).get('category')?.value

  return (
    <aside>
      <p>Your theme: {theme}</p>
      {favoriteCategory && <p>Favorite category: {favoriteCategory}</p>}
    </aside>
  )
}
```

## Wartości losowe / czas — unikalne per żądanie

```tsx
// page.tsx
import { connection } from 'next/server'
import { Suspense } from 'react'

async function UniqueContent() {
  await connection()
  const uuid = crypto.randomUUID()
  return <p>Request ID: {uuid}</p>
}

export default function Page() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <UniqueContent />
    </Suspense>
  )
}
```

## Maksymalizacja statycznego shella — `params` głębiej w drzewie

```tsx
// app/shop/[slug]/layout.tsx
import { Suspense } from 'react'

// Not async: this layout never awaits params
export default function Layout({
  children,
  params,
}: LayoutProps<'/shop/[slug]'>) {
  return (
    <div>
      <Sidebar />
      <Suspense fallback={<h1>Loading...</h1>}>
        {/* await happens inside the boundary, so the shell still renders */}
        {params.then(({ slug }) => (
          <SlugHeading slug={slug} />
        ))}
      </Suspense>
      {children}
    </div>
  )
}

function SlugHeading({ slug }: { slug: string }) {
  return <h1>{slug}</h1>
}
```

Im głębiej w drzewie siedzi asynchroniczna praca, tym więcej strony da się
prerenderować. Ta sama zasada dotyczy `cookies()`, `headers()`,
`searchParams` i fetchy danych.

## ISR z Cache Components

W trasach z dynamicznymi segmentami `generateStaticParams` prerenderuje
wskazane URL-e podczas builda. Pozostałe URL-e dostają natychmiast **App
Shell**, a konkretna wersja strony jest dorenderowywana w tle i cache'owana
dla kolejnych odwiedzających. Pełny opis:
`/docs/app/guides/incremental-static-regeneration-cache-components`.

## Boty i crawlery

Przeglądarki dostają statyczny shell natychmiast; boty (wykrywane po
user agent) dostają całą stronę wyrenderowaną dynamicznie w request time
(pełny HTML po zakończeniu renderu) — dane, na których opiera się shell,
muszą być dostępne także w request time.

## Route Segment Config (16.3.1) — co zostało

| Opcja             | Typ                                                     | Domyślnie                  |
| ----------------- | ------------------------------------------------------- | -------------------------- |
| `dynamicParams`   | `boolean`                                               | `true`                     |
| `runtime`         | `'nodejs' \| 'edge' (deprecated)`                       | `'nodejs'`                 |
| `preferredRegion` | `'auto' \| 'global' \| 'home' \| string \| string[]` (deprecated) | `'auto'`         |
| `maxDuration`     | `number`                                                | wg platformy deploymentu   |
