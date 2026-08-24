# Zod — Basic usage (podstawy)

> Źródło: https://zod.dev/basics
> Data pobrania: 2026-08-17 · Wersja: **Zod 4** (stable, dokumentowana na zod.dev)

## Streszczenie (PL)

Podstawowy cykl pracy z Zod: zdefiniuj schemat → parsuj dane → obsłuż błąd →
wywnioskuj typ TS. Kluczowe dla walidacji na granicach D3:

- `.parse(data)` — zwraca **zwalidowany głęboki klon** danych albo rzuca `ZodError`.
- `.parseAsync(data)` — wymagany, gdy schemat ma asynchroniczne refinementy/transformy.
- `.safeParse(data)` — **nie rzuca**; zwraca discriminated union:
  `{ success: true, data }` lub `{ success: false, error }` (`error` to `ZodError`
  z tablicą `.issues`). To preferowany wzorzec w Route Handlerze (dyspozytor):
  brak try/catch, jawna gałąź błędu → odpowiedź 400.
- `.safeParseAsync(data)` — wersja async.
- `z.infer<typeof Schema>` — wyciąga typ TS ze schematu (jedno źródło prawdy
  typu i walidacji). Gdy wejście ≠ wyjście (np. `.transform()`):
  `z.input<>` i `z.output<>`.

## Definiowanie schematu

```typescript
import * as z from "zod"; 

const Player = z.object({ 
  username: z.string(),
  xp: z.number()
});
```

## Parsowanie danych

`.parse()` — zwraca zwalidowany wynik albo rzuca `ZodError`:

```typescript
Player.parse({ username: "billie", xp: 100 }); 
// => { username: "billie", xp: 100 }
```

`.parseAsync()` — dla asynchronicznych refinementów/transformów:

```typescript
await Player.parseAsync({ username: "billie", xp: 100 });
```

## Obsługa błędów

Try/catch z `.parse()`:

```typescript
try {
  Player.parse({ username: 42, xp: "100" });
} catch(error){
  if(error instanceof z.ZodError){
    error.issues; // Array of validation issues
  }
}
```

`.safeParse()` — wynik jako discriminated union:

```typescript
const result = Player.safeParse({ username: 42, xp: "100" });
if (!result.success) {
  result.error;   // ZodError instance
} else {
  result.data;    // Validated data
}
```

`.safeParseAsync()`:

```typescript
await schema.safeParseAsync("hello");
```

## Wnioskowanie typów

```typescript
type Player = z.infer<typeof Player>;
const player: Player = { username: "billie", xp: 100 };
```

Gdy typ wejścia i wyjścia się różnią (transformy):

```typescript
const mySchema = z.string().transform((val) => val.length);
type MySchemaIn = z.input<typeof mySchema>;    // string
type MySchemaOut = z.output<typeof mySchema>;  // number
```
