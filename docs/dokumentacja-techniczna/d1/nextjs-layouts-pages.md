# Next.js — Layouty i strony (App Router)

> Źródło: https://nextjs.org/docs/app/getting-started/layouts-and-pages
> Data pobrania: 2026-08-17 | Wersja dokumentacji: Next.js 16.3.1 (lastUpdated 2026-05-28)

Next.js używa **routingu opartego o system plików** — foldery i pliki definiują trasy.

## Tworzenie strony (page)

Strona = UI renderowane na konkretnej trasie. Plik `page` w katalogu `app` z domyślnym eksportem komponentu React:

```tsx
// app/page.tsx
export default function Page() {
  return <h1>Hello Next.js!</h1>
}
```

## Tworzenie layoutu

Layout = UI **współdzielone** między stronami. Przy nawigacji layouty zachowują stan, pozostają interaktywne i nie renderują się ponownie. Komponent przyjmuje prop `children` (strona lub zagnieżdżony layout):

```tsx
// app/layout.tsx
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  )
}
```

Layout w korzeniu `app` to **root layout** — jest **wymagany** i musi zawierać tagi `html` i `body`.

## Trasy zagnieżdżone

Trasa `/blog/[slug]` składa się z segmentów: `/` (root) → `blog` → `[slug]` (leaf).

- **Foldery** definiują segmenty URL.
- **Pliki** (`page`, `layout`) tworzą UI segmentu.

Trasa `/blog` = folder `app/blog/` z plikiem `page.tsx`:

```tsx
// app/blog/page.tsx
import { getPosts } from '@/lib/posts'
import { Post } from '@/ui/post'

export default async function Page() {
  const posts = await getPosts()

  return (
    <ul>
      {posts.map((post) => (
        <Post key={post.id} post={post} />
      ))}
    </ul>
  )
}
```

Głębsze zagnieżdżenie — folder `[slug]` w `blog`:

```tsx
// app/blog/[slug]/page.tsx
function generateStaticParams() {}

export default function Page() {
  return <h1>Hello, Blog Post Page!</h1>
}
```

Nazwa folderu w nawiasach kwadratowych (`[slug]`) tworzy **segment dynamiczny**.

## Zagnieżdżanie layoutów

Layouty w hierarchii folderów zagnieżdżają się automatycznie — rodzic opakowuje dziecko przez `children`:

```tsx
// app/blog/layout.tsx
export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <section>{children}</section>
}
```

Root layout (`app/layout.js`) opakowuje layout bloga (`app/blog/layout.js`), a ten — strony `app/blog/page.js` i `app/blog/[slug]/page.js`.

## Segmenty dynamiczne

`params` to **Promise** — trzeba użyć `await`:

```tsx
// app/blog/[slug]/page.tsx
export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = await getPost(slug)

  return (
    <div>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </div>
  )
}
```

## Search params

W stronie będącej Server Component — prop `searchParams` (też Promise):

```tsx
// app/page.tsx
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const filters = (await searchParams).filters
}
```

Użycie `searchParams` włącza **dynamiczne renderowanie** strony (wymaga żądania). Kiedy co:

- `searchParams` (prop) — gdy parametry służą do **ładowania danych** (paginacja, filtrowanie z bazy),
- `useSearchParams` (hook, Client Components) — gdy parametry używane **tylko po stronie klienta**,
- `new URLSearchParams(window.location.search)` — w callbackach/handlerach bez wywoływania re-renderów.

## Linkowanie między stronami

Komponent `<Link>` (rozszerza `<a>` o prefetching i nawigację client-side):

```tsx
// app/ui/post.tsx
import Link from 'next/link'
import { getPosts } from '@/lib/posts'

export default async function Posts() {
  const posts = await getPosts()

  return (
    <ul>
      {posts.map((post) => (
        <li key={post.slug}>
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        </li>
      ))}
    </ul>
  )
}
```

`<Link>` to podstawowy sposób nawigacji; zaawansowana nawigacja — hook `useRouter`.

## Route Props Helpers (typy globalne)

`PageProps` i `LayoutProps` — globalne typy pomocnicze (bez importu), generowane przy `next dev`, `next build` lub `next typegen`:

```tsx
// app/blog/[slug]/page.tsx
export default async function Page(props: PageProps<'/blog/[slug]'>) {
  const { slug } = await props.params
  return <h1>Blog post: {slug}</h1>
}
```

```tsx
// app/dashboard/layout.tsx
export default function Layout(props: LayoutProps<'/dashboard'>) {
  return (
    <section>
      {props.children}
      {/* Slot równoległy app/dashboard/@analytics: props.analytics */}
    </section>
  )
}
```

Trasy statyczne mają `params` rozwiązane do `{}`.
