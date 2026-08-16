# Next.js — Instalacja

> Źródło: https://nextjs.org/docs/app/getting-started/installation
> Data pobrania: 2026-08-17 | Wersja dokumentacji: Next.js 16.3.1 (lastUpdated 2026-07-21)

## Szybki start

Utworzenie nowej aplikacji, wejście do katalogu i start serwera dev (domyślnie `http://localhost:3000`):

```bash
npx create-next-app@latest my-app --yes
cd my-app
npm run dev
```

Flaga `--yes` pomija pytania i używa domyślnych ustawień: **TypeScript, Tailwind CSS, ESLint, App Router, Turbopack**, alias importów `@/*`, plus plik `AGENTS.md` (z `CLAUDE.md`, który się do niego odwołuje) dla agentów kodujących.

## Wymagania systemowe

- Node.js **minimum 20.9**
- Systemy: macOS, Windows (w tym WSL), Linux
- TypeScript minimum **v5.1.0**

## Wspierane przeglądarki

Chrome 111+, Edge 111+, Firefox 111+, Safari 16.4+ (bez konfiguracji).

## Tworzenie przez CLI (interaktywnie)

```bash
npx create-next-app@latest
```

Pytania przy instalacji:

```txt
What is your project named? my-app
Would you like to use the recommended Next.js defaults?
    Yes, use recommended defaults - TypeScript, ESLint, Tailwind CSS, App Router, AGENTS.md
    No, reuse previous settings
    No, customize settings - Choose your own preferences
```

Przy wyborze `customize settings`:

```txt
Would you like to use TypeScript? No / Yes
Which linter would you like to use? ESLint / Biome / None
Would you like to use React Compiler? No / Yes
Would you like to use Tailwind CSS? No / Yes
Would you like your code inside a `src/` directory? No / Yes
Would you like to use App Router? (recommended) No / Yes
Would you like to customize the import alias (`@/*` by default)? No / Yes
What import alias would you like configured? @/*
Would you like to include AGENTS.md to guide coding agents to write up-to-date Next.js code? No / Yes
```

## Instalacja ręczna

```bash
npm i next@latest react@latest react-dom@latest
```

Uwaga: App Router używa wbudowanych wydań React canary (zawierają stabilne zmiany React 19), ale `react` i `react-dom` i tak deklaruje się w `package.json` dla zgodności z narzędziami.

Skrypty w `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "lint:fix": "eslint --fix"
  }
}
```

- `next dev` — serwer deweloperski z **Turbopackiem (domyślny bundler)**; Webpack: `next dev --webpack`
- `next build` — build produkcyjny
- `next start` — serwer produkcyjny

### Katalog `app`

Next.js używa routingu opartego o system plików. W katalogu `app` musi istnieć **root layout** (`layout.tsx`) zawierający tagi `<html>` i `<body>`:

```tsx
// app/layout.tsx
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

Strona główna:

```tsx
// app/page.tsx
export default function Page() {
  return <h1>Hello, Next.js!</h1>
}
```

Oba pliki renderują się przy wejściu na `/`. Jeśli zapomnisz o root layoucie, `next dev` utworzy go automatycznie. Opcjonalnie można trzymać kod w folderze `src/`.

### Folder `public` (opcjonalny)

Statyczne zasoby (obrazy, fonty) w katalogu głównym projektu; dostępne od bazowego URL — `public/profile.png` → `/profile.png`:

```tsx
import Image from 'next/image'

export default function Page() {
  return <Image src="/profile.png" alt="Profile" width={100} height={100} />
}
```

## TypeScript

Wbudowane wsparcie — zmień plik na `.ts`/`.tsx` i uruchom `next dev`; Next.js sam doinstaluje zależności i utworzy `tsconfig.json`. W VS Code: paleta poleceń → "TypeScript: Select TypeScript Version" → "Use Workspace Version".

## Linting

Od **Next.js 16** `next build` NIE uruchamia już lintera automatycznie — linter odpalasz przez skrypty NPM. Wybór: ESLint (pełne reguły) lub Biome (szybki linter + formatter). Migracja ze starego `next lint`:

```bash
npx @next/codemod@canary next-lint-to-eslint-cli .
```

Zalecany format konfiguracji ESLint: `eslint.config.mjs`.

## Aliasy importów (absolute imports)

Opcje `baseUrl` i `paths` w `tsconfig.json` / `jsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": "src/",
    "paths": {
      "@/styles/*": ["styles/*"],
      "@/components/*": ["components/*"]
    }
  }
}
```

```jsx
// Przed
import { Button } from '../../../components/button'
// Po
import { Button } from '@/components/button'
```

Ścieżki w `paths` są względne wobec `baseUrl`.

## Aktualizacja Next.js

```bash
npx next upgrade
```

Aktualizacja odświeża też dokumentację dołączoną do pakietu w `node_modules/next/dist/docs/` — agenci AI mogą pracować na docsach zainstalowanej wersji zamiast z pamięci treningowej.
