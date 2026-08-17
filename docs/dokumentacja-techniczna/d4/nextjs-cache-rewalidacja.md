# Next.js — Cache i rewalidacja (Caching + Revalidating)

> Źródła:
> - https://nextjs.org/docs/app/getting-started/caching (URL z zadania
>   `/caching-and-revalidating` przekierowuje tutaj)
> - https://nextjs.org/docs/app/getting-started/revalidating
> Data pobrania: 2026-08-17 · Wersja docs: Next.js 16.3.1
> (caching lastUpdated: 2026-08-10, revalidating lastUpdated: 2026-06-25)
> Pobrano przez WebFetch (oryginalna dokumentacja).

## Streszczenie (PL)

- Aktualny model w Next.js 16 to **Cache Components** — włączany flagą
  `cacheComponents: true` w `next.config.ts`. Bez tej flagi obowiązuje
  „Previous Model" opisany w `/docs/app/guides/caching-without-cache-components`.
- Cache przez dyrektywę **`'use cache'`** na dwóch poziomach:
  **danych** (funkcja, np. `getProducts()`) i **UI** (komponent/strona/layout).
- Argumenty funkcji i domknięte wartości stają się częścią **klucza cache**.
- Zalecenie docs: każdą dyrektywę cache parować z **`cacheLife`**
  (bez niej — profil `default`).
- Świeże dane na każde żądanie: NIE `use cache`, tylko komponent w
  **`<Suspense>`** z fallbackiem (fallback trafia do statycznego shella,
  dane streamują się w request time).
- **Rewalidacja czasowa**: `cacheLife('hours')` itd.
  **Na żądanie**: `cacheTag()` + `revalidateTag()` (stale-while-revalidate),
  `updateTag()` (natychmiastowe wygaszenie, tylko Server Actions),
  `revalidatePath()` (cała ścieżka — używać, gdy nie znamy tagów; docs
  preferują tagi, bo są precyzyjniejsze).
- **Dla D4 (katalog kursów)**: dane z bazy, które zmieniają się rzadko →
  `use cache` + `cacheTag('kursy')` + długi `cacheLife`; po mutacji w kreatorze
  → `revalidateTag('kursy')`.

## Włączenie Cache Components

```ts
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  cacheComponents: true,
}

export default nextConfig
```

## Cache na poziomie danych (funkcja działu)

```tsx
// app/lib/data.ts
import { cacheLife } from 'next/cache'

export async function getUsers() {
  'use cache'
  cacheLife('hours')
  return db.query('SELECT * FROM users')
}
```

## Cache na poziomie UI (cała strona)

```tsx
// app/page.tsx
import { cacheLife } from 'next/cache'

export default async function Page() {
  'use cache'
  cacheLife('hours')

  const users = await db.query('SELECT * FROM users')

  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  )
}
```

> `"use cache"` na górze PLIKU cache'uje wszystkie eksportowane funkcje.

## Streaming danych bez cache (świeże na każde żądanie)

```tsx
// page.tsx
import { Suspense } from 'react'

async function LatestPosts() {
  const data = await fetch('https://api.example.com/posts')
  const posts = await data.json()
  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  )
}

export default function Page() {
  return (
    <>
      <h1>My Blog</h1>
      <Suspense fallback={<p>Loading posts...</p>}>
        <LatestPosts />
      </Suspense>
    </>
  )
}
```

## `cacheLife` — profile czasowe

| Profil    | `stale` | `revalidate` | `expire` |
| --------- | ------- | ------------ | -------- |
| `default` | 5m      | 15m          | never    |
| `seconds` | 30s     | 1s           | 60s      |
| `minutes` | 5m      | 1m           | 1h       |
| `hours`   | 5m      | 1h           | 1d       |
| `days`    | 5m      | 1d           | 1w       |
| `weeks`   | 5m      | 1w           | 30d      |
| `max`     | 5m      | 30d          | 1y       |

Konfiguracja własna:

```tsx
'use cache'
cacheLife({
  stale: 3600, // 1 hour until considered stale
  revalidate: 7200, // 2 hours until revalidated
  expire: 86400, // 1 day until expired
})
```

> Cache „short-lived" (profil `seconds`, `revalidate: 0` albo `expire` < 5 min)
> jest wykluczany z prerenderów i staje się dynamiczną dziurą.

## `cacheTag` — tagowanie danych

```tsx
// app/lib/data.ts
import { cacheTag } from 'next/cache'

export async function getProducts() {
  'use cache'
  cacheTag('products')
  return db.query('SELECT * FROM products')
}
```

## `revalidateTag` — inwalidacja przez tag (stale-while-revalidate)

```tsx
// app/lib/actions.ts
import { revalidateTag } from 'next/cache'

export async function updateUser(id: string) {
  // Mutate data
  revalidateTag('user', 'max') // Recommended: stale-while-revalidate
}
```

- Wywołanie w **Server Action** lub **Route Handler**.
- Drugi argument = jak długo można serwować stale content podczas
  odświeżania w tle (`'max'` = najdłuższe okno).

## `updateTag` — natychmiastowe wygaszenie (read-your-own-writes)

```tsx
// app/lib/actions.ts
import { updateTag } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createPost(formData: FormData) {
  const post = await db.post.create({
    data: {
      title: formData.get('title'),
      content: formData.get('content'),
    },
  })

  updateTag('posts')
  redirect(`/posts/${post.id}`)
}
```

|              | `updateTag`                                   | `revalidateTag`                      |
| ------------ | --------------------------------------------- | ------------------------------------ |
| **Gdzie**    | Tylko Server Actions                          | Server Actions i Route Handlers      |
| **Zachowanie** | Natychmiast wygasza cache                   | Stale-while-revalidate               |
| **Use case** | Read-your-own-writes (użytkownik widzi swoją zmianę) | Odświeżenie w tle (lekkie opóźnienie OK) |

## `revalidatePath` — inwalidacja całej ścieżki

```tsx
// app/lib/actions.ts
import { revalidatePath } from 'next/cache'

export async function updateUser(id: string) {
  // Mutate data
  revalidatePath('/profile')
}
```

> Good to know (docs): preferuj rewalidację tagami (`revalidateTag`/`updateTag`)
> — jest precyzyjniejsza i nie inwaliduje nadmiarowo.

## Runtime API a cache

Runtime APIs (`cookies`, `headers`, `searchParams`, `params`) wymagają danych
z żądania — komponenty ich używające owijać w `<Suspense>`:

```tsx
// page.tsx
import { cookies } from 'next/headers'
import { Suspense } from 'react'

async function UserGreeting() {
  const cookieStore = await cookies()
  const theme = cookieStore.get('theme')?.value || 'light'
  return <p>Your theme: {theme}</p>
}

export default function Page() {
  return (
    <>
      <h1>Dashboard</h1>
      <Suspense fallback={<p>Loading...</p>}>
        <UserGreeting />
      </Suspense>
    </>
  )
}
```

Wartości runtime można wyciągnąć i przekazać jako argument do funkcji
z `use cache` (stają się częścią klucza cache). Warianty dyrektywy:
`'use cache: private'` (cache tylko w przeglądarce), `'use cache: remote'`
(trwały, współdzielony cache handler — ważne na serverless, bo domyślny
in-memory store nie przeżywa żądań).

## Co cache'ować? (zalecenie docs)

Dane niezależne od runtime, które można serwować z cache przez pewien czas.
Treści bez potrzeby rewalidacji czasowej (np. CMS): `cacheTag` + długi
`cacheLife` (`max`) + webhook wywołujący `revalidateTag` przy zmianie treści.
