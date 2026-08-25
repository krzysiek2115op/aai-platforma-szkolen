# Zod — Error customization (obsługa i format błędów)

> Źródło: https://zod.dev/error-customization
> Data pobrania: 2026-08-17 · Wersja: **Zod 4** (stable, dokumentowana na zod.dev)

## Streszczenie (PL)

Jak dostosować komunikaty błędów walidacji w Zod 4 — istotne dla odpowiedzi
400 z dyspozytora D3:

- **`ZodError`** ma tablicę **`.issues`** — każde issue zawiera `message`
  i ustrukturyzowane metadane (m.in. `code`, `path`, `input`).
- **Parametr `error`** — każde API Zoda przyjmuje komunikat jako string albo
  funkcję (error map). Funkcja dostaje kontekst (`code`, `input`, `inst`,
  `path`; dla `.min()` też `minimum`, `inclusive` itp.). Zwrócenie `undefined`
  przekazuje decyzję dalej w łańcuchu precedencji.
- **Per-parse** — error map przekazana do `parse`/`safeParse` obowiązuje dla
  jednego parsowania; `iss` to discriminated union — rozgałęziać po `iss.code`.
  Flaga `reportInput: true` dołącza dane wejściowe do błędu.
- **Globalnie** — `z.config({ customError: ... })`.
- **i18n** — locale z `zod/locales` (50+ języków; pakiet `zod` ładuje `en`
  automatycznie, Zod Mini wymaga ręcznego ładowania). Dla projektu: dostępne
  jest locale polskie (`z.config(z.locales.pl())` wg tego samego wzorca).
- **Precedencja** (od najwyższej): błędy na poziomie schematu → per-parse →
  globalne → locale.

## Parametr `error`

```javascript
z.string("Not a string!");
z.string().min(5, "Too short!");
z.string({ error: "Bad!" });
z.string().min(5, { error: "Too short!" });
```

Error mapy dostają obiekt kontekstu z właściwościami takimi jak `code`,
`input`, `inst`, `path`; dodatkowe właściwości zależą od API
(np. `minimum`, `inclusive` dla `.min()`).

Zwrócenie `undefined` z error mapy przekazuje sprawę do następnej mapy
w łańcuchu precedencji.

## Per-parse

```javascript
schema.parse(12, {
  error: iss => "per-parse custom error"
});
```

Obiekt `iss` jest discriminated union — użyj właściwości `code`, by obsłużyć
konkretne typy błędów.

Dołączenie danych wejściowych do błędu:

```javascript
z.string().parse(12, { reportInput: true })
```

## Globalna konfiguracja

```javascript
z.config({
  customError: (iss) => {
    if (iss.code === "invalid_type") {
      return `invalid type, expected ${iss.expected}`;
    }
  },
});
```

## Internacjonalizacja (locale)

```javascript
z.config(z.locales.en());
```

Locale ładuje się z `zod/locales` (50+ języków). Pakiet `zod` ładuje `en`
automatycznie; Zod Mini wymaga ręcznego załadowania.

## Precedencja błędów (od najwyższej do najniższej)

1. Błędy na poziomie schematu (hard-coded, parametr `error`)
2. Per-parse error mapy
3. Globalne error mapy (`z.config({ customError })`)
4. Locale error mapy
