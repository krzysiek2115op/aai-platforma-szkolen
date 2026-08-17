# Next.js — Komponent `<Image>` (next/image)

> Źródło: https://nextjs.org/docs/app/api-reference/components/image
> Data pobrania: 2026-08-17 · Wersja docs: Next.js 16.3.1 (lastUpdated: 2026-05-04)
> Pobrano przez WebFetch (oryginalna dokumentacja).

## Streszczenie (PL)

- `next/image` rozszerza `<img>` o automatyczną optymalizację obrazów
  (rozmiary, formaty WebP/AVIF, lazy loading, brak layout shift).
- **Wymagane propsy**: `src`, `alt`; ponadto `width` + `height` (chyba że
  import statyczny albo `fill`).
- `width`/`height` = rozmiar intrinsic (proporcje, rezerwacja miejsca),
  NIE rozmiar renderowany (ten kontroluje CSS).
- **`fill`** — obraz wypełnia rodzica; rodzic musi mieć
  `position: relative/fixed/absolute`; kadrowanie przez
  `style={{ objectFit: 'cover' }}`.
- **`sizes`** — obowiązkowe przy `fill`/responsywnym CSS; bez `sizes`
  przeglądarka zakłada `100vw` (pobiera za duże pliki).
- **Zmiany w Next 16**: `priority` **deprecated** → nowy prop **`preload`**;
  konfiguracja `qualities` wymagana (domyślnie `[75]`).
- **Obrazy zdalne** (okładki kursów z zewnętrznego hosta): URL w `src` +
  obowiązkowa lista **`remotePatterns`** w `next.config.js` (jak najbardziej
  precyzyjna); przy remote trzeba ręcznie podać `width`, `height`
  (i opcjonalnie `blurDataURL`).
- `placeholder="blur"` + `blurDataURL` — mały (≤10px) data URL jako
  rozmycie podczas ładowania; przy imporcie statycznym jpg/png/webp/avif
  `blurDataURL` generuje się automatycznie.
- SVG domyślnie nieoptymalizowane (`unoptimized` automatycznie dla `.svg`).
- Config `domains` deprecated (od v14) na rzecz `remotePatterns`.

## Podstawowe użycie

```jsx
// app/page.js
import Image from 'next/image'

export default function Page() {
  return (
    <Image
      src="/profile.png"
      width={500}
      height={500}
      alt="Picture of the author"
    />
  )
}
```

## Najważniejsze propsy (z tabeli referencji)

| Prop          | Przykład                                  | Typ             | Status     |
| ------------- | ----------------------------------------- | --------------- | ---------- |
| `src`         | `src="/profile.png"`                      | String          | Wymagany   |
| `alt`         | `alt="Picture of the author"`             | String          | Wymagany   |
| `width`       | `width={500}`                             | Integer (px)    | -          |
| `height`      | `height={500}`                            | Integer (px)    | -          |
| `fill`        | `fill={true}`                             | Boolean         | -          |
| `sizes`       | `sizes="(max-width: 768px) 100vw, 33vw"`  | String          | -          |
| `quality`     | `quality={80}`                            | Integer (1-100) | -          |
| `preload`     | `preload={true}`                          | Boolean         | -          |
| `placeholder` | `placeholder="blur"`                      | String          | -          |
| `loading`     | `loading="lazy"`                          | String          | -          |
| `blurDataURL` | `blurDataURL="data:image/jpeg..."`        | String          | -          |
| `unoptimized` | `unoptimized={true}`                      | Boolean         | -          |
| `style`       | `style={{objectFit: "contain"}}`          | Object          | -          |

Uwaga: `priority` — deprecated od Next.js 16 na rzecz `preload`;
`onLoadingComplete` — deprecated od v14 na rzecz `onLoad`.

## `fill` + `sizes` (typowy wzorzec siatki okładek kursów)

```jsx
import Image from 'next/image'

export default function Page() {
  return (
    <div className="grid-element">
      <Image
        fill
        src="/example.png"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
    </div>
  )
}
```

Przy `fill` rodzic musi mieć `position: relative` (lub `display: block`):

```jsx
<div style={{ position: 'relative' }}>
  <Image fill src="/my-image.png" alt="My Image" />
</div>
```

## Obrazy zdalne (remote images)

```jsx
// app/page.js
import Image from 'next/image'

export default function Page() {
  return (
    <Image
      src="https://s3.amazonaws.com/my-bucket/profile.png"
      alt="Picture of the author"
      width={500}
      height={500}
    />
  )
}
```

> Next.js nie ma dostępu do zdalnych plików podczas builda — `width`,
> `height` (i opcjonalny `blurDataURL`) trzeba podać ręcznie.

### `remotePatterns` w `next.config.js` (obowiązkowe dla remote)

```js
// next.config.js
module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 's3.amazonaws.com',
        port: '',
        pathname: '/my-bucket/**',
        search: '',
      },
    ],
  },
}
```

Krótsza forma (od v15.3.0, obiekty `URL`):

```js
// next.config.js
module.exports = {
  images: {
    remotePatterns: [new URL('https://example.com/account123/**')],
  },
}
```

Wildcardy: `*` = jeden segment/subdomena, `**` = dowolna liczba segmentów
(na końcu pathname / na początku hostname). Pomijanie `protocol`/`port`/
`pathname`/`search` = domyślny wildcard `**` (niezalecane — ryzyko nadużyć).
Niedopasowany URL → `400 Bad Request`.

### `localPatterns` (ograniczenie ścieżek lokalnych)

```js
// next.config.js
module.exports = {
  images: {
    localPatterns: [
      {
        pathname: '/assets/images/**',
        search: '',
      },
    ],
  },
}
```

## Obraz responsywny ze zdalnym URL

```jsx
// components/page.js
import Image from 'next/image'

export default function Page({ photoUrl }) {
  return (
    <Image
      src={photoUrl}
      alt="Picture of the author"
      sizes="100vw"
      style={{
        width: '100%',
        height: 'auto',
      }}
      width={500}
      height={300}
    />
  )
}
```

## `placeholder="blur"`

```jsx
<Image placeholder="blur" blurDataURL="..." />
```

- Import statyczny jpg/png/webp/avif → `blurDataURL` automatyczne.
- Obraz dynamiczny/zdalny → `blurDataURL` ręcznie (np. png-pixel.com,
  biblioteka Plaiceholder); zalecany bardzo mały obraz (≤10px).

## Konfiguracja jakości i formatów (Next 16)

```js
// next.config.js
module.exports = {
  images: {
    qualities: [25, 50, 75, 100],
  },
}
```

> Pole `qualities` jest WYMAGANE od Next.js 16 (domyślnie `[75]`); prop
> `quality` musi pasować do listy (inaczej użyta zostanie najbliższa
> dozwolona wartość).

```js
// next.config.js
module.exports = {
  images: {
    formats: ['image/avif', 'image/webp'],
  },
}
```

## Wybrane wpisy Version History

| Wersja    | Zmiany                                                                                        |
| --------- | --------------------------------------------------------------------------------------------- |
| `v16.0.0` | `qualities` domyślnie `[75]`, dodano `preload`, `priority` deprecated, dodano `maximumRedirects` |
| `v15.3.0` | `remotePatterns` wspiera tablicę obiektów `URL`                                                |
| `v14.0.0` | `onLoadingComplete` i config `domains` deprecated                                              |
| `v12.3.0` | `remotePatterns` i `unoptimized` stabilne                                                      |
| `v10.0.0` | `next/image` wprowadzone                                                                       |
