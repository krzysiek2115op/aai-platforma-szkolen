# Next.js — Pobieranie danych (Fetching Data)

> Źródło: https://nextjs.org/docs/app/getting-started/fetching-data
> Data pobrania: 2026-08-17 · Wersja docs: Next.js 16.3.1 (lastUpdated: 2026-08-11)
> Pobrano przez WebFetch (oryginalna dokumentacja, nie z pamięci modelu).

## Streszczenie (PL)

- Dane pobiera się w **komponentach serwerowych** dowolnym asynchronicznym I/O:
  (1) `fetch` API, (2) **ORM lub klient bazy danych bezpośrednio**.
- **Kluczowe dla D4**: komponenty serwerowe renderują się na serwerze, więc
  poświadczenia i logika zapytań NIE trafiają do bundla klienta — można
  bezpiecznie odpytywać bazę przez funkcję działu (BAZA → DZIAŁ → STRONA,
  bez fetch HTTP).
- Identyczne wywołania `fetch` w drzewie komponentów są **memoizowane**
  w ramach jednego żądania.
- `fetch` domyślnie NIE jest cache'owany i blokuje render do zakończenia;
  cache przez dyrektywę `use cache`, świeże dane przez `<Suspense>` (streaming).
- **Streaming**: (a) `loading.js` obok `page.js` — streamuje całą stronę,
  (b) `<Suspense>` — granularnie wybrane fragmenty.
- Wzorce: sekwencyjne pobieranie (zależne dane), równoległe (`Promise.all`),
  współdzielenie wyniku przez `React.cache` (deduplikacja w obrębie żądania).
- W komponentach klienckich: React `use()` (promise z serwera jako prop)
  albo SWR / React Query.

## Fetch przez `fetch` API (komponent serwerowy)

```tsx
// app/blog/page.tsx
export default async function Page() {
  const data = await fetch('https://api.vercel.app/blog')
  const posts = await data.json()
  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  )
}
```

## ORM / baza danych bezpośrednio (wzorzec dla D4)

```tsx
// app/blog/page.tsx
import { db, posts } from '@/lib/db'

export default async function Page() {
  const allPosts = await db.select().from(posts)
  return (
    <ul>
      {allPosts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  )
}
```

> Uwaga docs: nadal trzeba dbać o uwierzytelnienie/autoryzację żądań —
> patrz Data Security Guide (`/docs/app/guides/data-security`).

## Streaming — `loading.js`

```tsx
// app/blog/loading.tsx
export default function Loading() {
  // Define the Loading UI here
  return <div>Loading...</div>
}
```

`loading.js` jest automatycznie zagnieżdżany w `layout.js` i owija `page.js`
granicą `<Suspense>`. Uwaga: layout czytający runtime data (`cookies()`,
`headers()`, niecache'owany fetch) NIE korzysta z `loading.js` tego samego
segmentu — blokuje nawigację; lepiej `<Suspense>` bliżej danych.

## Streaming — `<Suspense>` (granularnie)

```tsx
// app/blog/page.tsx
import { Suspense } from 'react'
import BlogList from '@/components/BlogList'
import BlogListSkeleton from '@/components/BlogListSkeleton'

export default function BlogPage() {
  return (
    <div>
      {/* This content will be sent to the client immediately */}
      <header>
        <h1>Welcome to the Blog</h1>
        <p>Read the latest posts below.</p>
      </header>
      <main>
        {/* If there's any dynamic content inside this boundary, it will be streamed in */}
        <Suspense fallback={<BlogListSkeleton />}>
          <BlogList />
        </Suspense>
      </main>
    </div>
  )
}
```

## Pobieranie sekwencyjne (dane zależne)

```tsx
// app/artist/[username]/page.tsx
export default async function Page({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  // Get artist information
  const artist = await getArtist(username)

  return (
    <>
      <h1>{artist.name}</h1>
      {/* Show fallback UI while the Playlists component is loading */}
      <Suspense fallback={<div>Loading...</div>}>
        {/* Pass the artist ID to the Playlists component */}
        <Playlists artistID={artist.id} />
      </Suspense>
    </>
  )
}

async function Playlists({ artistID }: { artistID: string }) {
  // Use the artist ID to fetch playlists
  const playlists = await getArtistPlaylists(artistID)

  return (
    <ul>
      {playlists.map((playlist) => (
        <li key={playlist.id}>{playlist.name}</li>
      ))}
    </ul>
  )
}
```

## Pobieranie równoległe (`Promise.all`)

```tsx
// app/artist/[username]/page.tsx
import Albums from './albums'

async function getArtist(username: string) {
  const res = await fetch(`https://api.example.com/artist/${username}`)
  return res.json()
}

async function getAlbums(username: string) {
  const res = await fetch(`https://api.example.com/artist/${username}/albums`)
  return res.json()
}

export default async function Page({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params

  // Initiate requests
  const artistData = getArtist(username)
  const albumsData = getAlbums(username)

  const [artist, albums] = await Promise.all([artistData, albumsData])

  return (
    <>
      <h1>{artist.name}</h1>
      <Albums list={albums} />
    </>
  )
}
```

> Good to know (docs): jeśli jedno żądanie w `Promise.all` padnie, pada całość
> — alternatywa: `Promise.allSettled`.

## Deduplikacja przez `React.cache` (wzorzec dla funkcji działu)

```ts
// app/lib/user.ts
import { cache } from 'react'

export const getUser = cache(async () => {
  const res = await fetch('https://api.example.com/user')
  return res.json()
})
```

```tsx
// app/dashboard/page.tsx
import { getUser } from '../lib/user'

export default async function DashboardPage() {
  const user = await getUser() // Cached - same request, no duplicate fetch
  return <h1>Dashboard for {user.name}</h1>
}
```

> `React.cache` działa TYLKO w obrębie bieżącego żądania — każde żądanie ma
> własny zakres memoizacji, bez współdzielenia między żądaniami.

## Komponenty klienckie — `use()` (streaming promise z serwera)

```tsx
// app/blog/page.tsx
import Posts from '@/app/ui/posts'
import { Suspense } from 'react'

export default function Page() {
  // Don't await the data fetching function
  const posts = getPosts()

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Posts posts={posts} />
    </Suspense>
  )
}
```

```tsx
// app/ui/posts.tsx
'use client'
import { use } from 'react'

export default function Posts({
  posts,
}: {
  posts: Promise<{ id: string; title: string }[]>
}) {
  const allPosts = use(posts)

  return (
    <ul>
      {allPosts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  )
}
```
