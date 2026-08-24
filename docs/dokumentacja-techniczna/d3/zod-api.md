# Zod — API (przegląd typów schematów)

> Źródło: https://zod.dev/api
> Data pobrania: 2026-08-17 · Wersja: **Zod 4** (stable, dokumentowana na zod.dev)

## Streszczenie (PL)

Przegląd typów schematów istotnych dla dyspozytora D3 (walidacja body akcji
zapisz/usun/publikuj):

- **`z.object`** — obiekt o znanych kluczach; warianty: `z.strictObject()`
  (odrzuca nieznane klucze — dobre na granicy API) i `z.looseObject()`
  (przepuszcza nieznane). Metody: `.extend()`, `.pick()`, `.omit()`,
  `.partial()`, `.required()`, `.shape`, `.keyof()`, `.catchall()`.
- **`z.string`** — łańcuchy + walidatory długości/wzorca; osobne walidatory
  formatów jako funkcje top-level w Zod 4: `z.email()`, `z.uuid()`, `z.url()` itd.
- **`z.number`** — zakresy (`gt/gte/lt/lte`), znak, `multipleOf`; całkowite:
  `z.int()`, `z.int32()`.
- **`z.enum`** — zamknięta lista wartości (idealne na pole `akcja`:
  np. `z.enum(["zapisz", "usun", "publikuj"])`); `.exclude()` / `.extract()`.
- **`z.array`** — tablice z ograniczeniami `min/max/length/nonempty`.
- **`z.union` / `z.discriminatedUnion`** — alternatywy; discriminated union
  po polu-dyskryminatorze (np. `akcja`) daje szybkie i czytelne rozgałęzienie
  payloadów w jednym endpoincie — wzorzec wprost pod dyspozytora D3.
- **`optional / nullable / nullish`** — `undefined` / `null` / oba.
- Dodatki: coercion (`z.coerce.*`), `.refine()`, `.transform()`, `.default()`.

## Obiekty

```typescript
const Person = z.object({
  name: z.string(),
  age: z.number(),
});
```

Warianty:

- `z.strictObject()` — throws on unknown keys
- `z.looseObject()` — passes unknown keys through

Metody obiektu: `.extend()` (add fields), `.pick()` (select specific keys),
`.omit()` (exclude keys), `.partial()` (make fields optional), `.required()`
(make fields required), `.shape` (access internal schemas), `.keyof()`
(create enum from keys), `.catchall()` (validate unknown keys).

## Stringi

```typescript
z.string().max(5).min(5).length(5).nonempty()
  .regex(/pattern/).startsWith("aaa").endsWith("zzz")
  .includes("---").uppercase().lowercase()
  .trim().toLowerCase().toUpperCase().normalize()
```

Walidatory formatów (Zod 4 — funkcje top-level):

- `z.email()`, `z.uuid()`, `z.url()`, `z.httpUrl()`
- `z.hostname()`, `z.e164()`, `z.emoji()`
- `z.base64()`, `z.base64url()`, `z.hex()`, `z.jwt()`
- `z.ipv4()`, `z.ipv6()`, `z.cidrv4()`, `z.cidrv6()`
- `z.mac()`, `z.creditCard()`
- `z.iso.date()`, `z.iso.time()`, `z.iso.datetime()`

## Liczby

```typescript
z.number().gt(5).gte(5).lt(5).lte(5)
  .positive().nonnegative().negative().nonpositive()
  .multipleOf(5)
```

Warianty: `z.int()`, `z.int32()`, `z.nan()`.

## Enumy

```typescript
const FishEnum = z.enum(["Salmon", "Tuna", "Trout"]);
FishEnum.exclude(["Salmon"]);
FishEnum.extract(["Salmon", "Trout"]);
```

## Tablice i krotki

```typescript
const stringArray = z.array(z.string());
stringArray.nonempty().min(5).max(5).length(5);

const MyTuple = z.tuple([z.string(), z.number(), z.boolean()]);
const variadicTuple = z.tuple([z.string()], z.number());
```

## Unie i unie dyskryminowane

```typescript
const stringOrNumber = z.union([z.string(), z.number()]);
z.xor([z.string(), z.number()]); // exactly one must match

const MyResult = z.discriminatedUnion("status", [
  z.object({ status: z.literal("success"), data: z.string() }),
  z.object({ status: z.literal("failed"), error: z.string() }),
]);
```

## Optional / Nullable / Nullish

```typescript
z.optional(z.literal("yoda")); // allows undefined
z.nullable(z.literal("yoda")); // allows null
z.nullish(z.literal("yoda")); // allows both
```

## Pozostałe (skrót)

- Coercion: `z.coerce.string()`, `z.coerce.number()`
- Refinements: `.refine()`, `.superRefine()`
- Transforms: `.transform()`, `.preprocess()`
- Defaults: `.default()`, `.prefault()`, `.catch()`
- Inne typy: `z.date()`, `z.set()`, `z.map()`, `z.instanceof()`
