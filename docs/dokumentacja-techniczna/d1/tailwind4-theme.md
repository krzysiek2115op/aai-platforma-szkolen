# Tailwind CSS 4 — Zmienne motywu (@theme)

> Źródło: https://tailwindcss.com/docs/theme
> Data pobrania: 2026-08-17 | Wersja dokumentacji: Tailwind CSS v4.3

## Czym są zmienne motywu

Zmienne motywu to specjalne zmienne CSS definiowane dyrektywą `@theme`, które decydują, **jakie klasy narzędziowe istnieją** w projekcie (design tokens). W odróżnieniu od zwykłych zmiennych w `:root`:

- muszą być zdefiniowane na najwyższym poziomie (nie w selektorach/media queries),
- generują klasy narzędziowe.

Dodanie własnego koloru:

```css
@import "tailwindcss";

@theme {
  --color-mint-500: oklch(0.72 0.11 178);
}
```

Dostępne stają się np. `bg-mint-500`, `text-mint-500`, `fill-mint-500`. Tailwind generuje też zwykłą zmienną CSS:

```html
<div style="background-color: var(--color-mint-500)">
  <!-- ... -->
</div>
```

Reguła: `@theme` dla tokenów, które mają mapować się na klasy; `:root` dla zwykłych zmiennych bez klas.

## Przestrzenie nazw (namespaces)

| Namespace         | Klasy narzędziowe                          |
| ----------------- | ------------------------------------------ |
| `--color-*`       | kolory: `bg-red-500`, `text-sky-300`       |
| `--font-*`        | rodziny fontów: `font-sans`                |
| `--text-*`        | rozmiary tekstu: `text-xl`                 |
| `--font-weight-*` | grubości: `font-bold`                      |
| `--tracking-*`    | letter-spacing: `tracking-wide`            |
| `--leading-*`     | line-height: `leading-tight`               |
| `--breakpoint-*`  | warianty responsywne: `sm:*`               |
| `--container-*`   | container queries `@sm:*` i rozmiary       |
| `--spacing-*`     | odstępy/rozmiary: `px-4`, `max-h-16`       |
| `--radius-*`      | zaokrąglenia: `rounded-sm`                 |
| `--shadow-*`      | cienie: `shadow-md`                        |
| `--inset-shadow-*`| cienie wewnętrzne: `inset-shadow-xs`       |
| `--drop-shadow-*` | filtry drop-shadow: `drop-shadow-md`       |
| `--blur-*`        | rozmycia: `blur-md`                        |
| `--perspective-*` | perspektywa: `perspective-near`            |
| `--aspect-*`      | proporcje: `aspect-video`                  |
| `--ease-*`        | krzywe przejść: `ease-out`                 |
| `--animate-*`     | animacje: `animate-spin`                   |
| `--tab-size-*`    | tab size                                   |
| `--zoom-*`        | zoom                                       |

## Rozszerzanie motywu

```css
@import "tailwindcss";

@theme {
  --font-script: Great Vibes, cursive;
}
```

```html
<p class="font-script">This will use the Great Vibes font family.</p>
```

## Nadpisywanie domyślnych wartości

Pojedyncza zmienna:

```css
@import "tailwindcss";

@theme {
  --breakpoint-sm: 30rem;
}
```

Cała przestrzeń nazw (usuwa wszystkie domyślne kolory):

```css
@import "tailwindcss";

@theme {
  --color-*: initial;
  --color-white: #fff;
  --color-purple: #3f3cbb;
  --color-midnight: #121063;
  --color-tahiti: #3ab7bf;
  --color-bermuda: #78dcca;
}
```

Całkowite wyłączenie domyślnego motywu:

```css
@import "tailwindcss";

@theme {
  --*: initial;
  --spacing: 4px;
  --font-body: Inter, sans-serif;
  --color-lagoon: oklch(0.72 0.11 221.19);
  --color-coral: oklch(0.74 0.17 40.24);
  --color-driftwood: oklch(0.79 0.06 74.59);
  --color-tide: oklch(0.49 0.08 205.88);
  --color-dusk: oklch(0.82 0.15 72.09);
}
```

## Klatki animacji

```css
@import "tailwindcss";

@theme {
  --animate-fade-in-scale: fade-in-scale 0.3s ease-out;

  @keyframes fade-in-scale {
    0% {
      opacity: 0;
      transform: scale(0.95);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }
}
```

## `@theme inline` — odwołania do innych zmiennych

Gdy zmienna motywu odwołuje się do innej zmiennej (np. fontu z next/font), użyj opcji `inline` — klasy użyją **wartości** zmiennej zamiast referencji (unika problemu rozwiązywania zmiennych w miejscu definicji):

```css
@import "tailwindcss";

@theme inline {
  --font-sans: var(--font-inter);
}
```

## `@theme static` — generowanie wszystkich zmiennych

Domyślnie generowane są tylko używane zmienne CSS. Aby wygenerować wszystkie:

```css
@import "tailwindcss";

@theme static {
  --color-primary: var(--color-red-500);
  --color-secondary: var(--color-blue-500);
}
```

## Współdzielenie między projektami

```css
/* ./packages/brand/theme.css */
@theme {
  --*: initial;
  --spacing: 4px;
  --font-body: Inter, sans-serif;
  --color-lagoon: oklch(0.72 0.11 221.19);
  --color-coral: oklch(0.74 0.17 40.24);
}
```

```css
/* ./packages/admin/app.css */
@import "tailwindcss";
@import "../brand/theme.css";
```

## Używanie zmiennych motywu

Wszystkie kompilują się do zwykłych zmiennych CSS w `:root` — można używać we własnym CSS:

```css
@import "tailwindcss";

@layer components {
  .typography {
    p {
      font-size: var(--text-base);
      color: var(--color-gray-700);
    }
    h1 {
      font-size: var(--text-2xl--line-height);
      font-weight: var(--font-weight-semibold);
      color: var(--color-gray-950);
    }
  }
}
```

W wartościach arbitralnych:

```html
<div class="absolute inset-px rounded-[calc(var(--radius-xl)-1px)]"></div>
```

W JavaScript:

```js
let styles = getComputedStyle(document.documentElement);
let shadow = styles.getPropertyValue("--shadow-xl");
```

## Wybrane domyślne wartości motywu

```css
@theme {
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
  --font-serif: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;

  /* Odstępy */
  --spacing: 0.25rem;

  /* Breakpointy */
  --breakpoint-sm: 40rem;
  --breakpoint-md: 48rem;
  --breakpoint-lg: 64rem;
  --breakpoint-xl: 80rem;
  --breakpoint-2xl: 96rem;

  /* Typografia (przykłady) */
  --text-base: 1rem;
  --text-base--line-height: calc(1.5 / 1);
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-4xl: 2.25rem;

  /* Grubości fontów */
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* Zaokrąglenia */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
  --radius-2xl: 1rem;

  /* Cienie (przykłady) */
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);

  /* Easing */
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);

  /* Animacje */
  --animate-spin: spin 1s linear infinite;
  --animate-pulse: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  --animate-bounce: bounce 1s infinite;
}
```

Import `tailwindcss` to w rzeczywistości:

```css
@layer theme, base, components, utilities;
@import "./theme.css" layer(theme);
@import "./preflight.css" layer(base);
@import "./utilities.css" layer(utilities);
```

`theme.css` zawiera wszystkie domyślne zmienne — stąd klasy `bg-red-200`, `font-serif`, `shadow-sm` działają od razu.
