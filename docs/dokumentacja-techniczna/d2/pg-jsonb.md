# Typy JSON / jsonb (operatory, indeksy, to_jsonb)

> Źródła: https://www.postgresql.org/docs/current/datatype-json.html
> oraz (dla to_jsonb): https://www.postgresql.org/docs/current/functions-json.html
> Pobrano: 2026-08-17 (WebFetch) · Wersja dokumentacji: PostgreSQL 18 (current, 18.6)

## json vs jsonb (streszczenie PL)

| Aspekt | `json` | `jsonb` |
|---|---|---|
| Przechowywanie | dokładna kopia tekstu wejściowego | zdekomponowany format binarny |
| Odczyt/przetwarzanie | wolniejsze (ponowne parsowanie) | znacznie szybsze |
| Zapis | szybszy | nieco wolniejszy (narzut konwersji) |
| Białe znaki | zachowane | niezachowane |
| Kolejność kluczy | zachowana | niezachowana |
| Duplikaty kluczy | wszystkie zachowane (funkcje używają ostatniej) | tylko ostatnia wartość |
| Indeksowanie | brak | GIN, btree, hash |

Rekomendacja z dokumentacji (oryginał): "In general, most applications should prefer
to store JSON data as `jsonb`, unless there are quite specialized needs, such as legacy
assumptions about ordering of object keys."

## Operatory zawierania i istnienia (oryginał)

Zawieranie `@>` (i odwrotność `<@`):

```sql
-- Simple scalar/primitive values contain only the identical value:
SELECT '"foo"'::jsonb @> '"foo"'::jsonb;

-- The array on the right side is contained within the one on the left:
SELECT '[1, 2, 3]'::jsonb @> '[1, 3]'::jsonb;

-- Order of array elements is not significant, so this is also true:
SELECT '[1, 2, 3]'::jsonb @> '[3, 1]'::jsonb;

-- Duplicate array elements don't matter either:
SELECT '[1, 2, 3]'::jsonb @> '[1, 2, 2]'::jsonb;

-- The object with a single pair on the right side is contained
-- within the object on the left side:
SELECT '{"product": "PostgreSQL", "version": 9.4, "jsonb": true}'::jsonb @> '{"version": 9.4}'::jsonb;

-- The array on the right side is not considered contained within the
-- array on the left, even though a similar array is nested within it:
SELECT '[1, 2, [1, 3]]'::jsonb @> '[1, 3]'::jsonb;  -- yields false

-- But with a layer of nesting, it is contained:
SELECT '[1, 2, [1, 3]]'::jsonb @> '[[1, 3]]'::jsonb;

-- Similarly, containment is not reported here:
SELECT '{"foo": {"bar": "baz"}}'::jsonb @> '{"bar": "baz"}'::jsonb;  -- yields false

-- A top-level key and an empty object is contained:
SELECT '{"foo": {"bar": "baz"}}'::jsonb @> '{"foo": {}}'::jsonb;

-- This array contains the primitive string value:
SELECT '["foo", "bar"]'::jsonb @> '"bar"'::jsonb;

-- This exception is not reciprocal -- non-containment is reported here:
SELECT '"bar"'::jsonb @> '["bar"]'::jsonb;  -- yields false
```

Istnienie `?` (oraz `?|` = którykolwiek z kluczy, `?&` = wszystkie klucze):

```sql
-- String exists as array element:
SELECT '["foo", "bar", "baz"]'::jsonb ? 'bar';

-- String exists as object key:
SELECT '{"foo": "bar"}'::jsonb ? 'foo';

-- Object values are not considered:
SELECT '{"foo": "bar"}'::jsonb ? 'bar';  -- yields false

-- As with containment, existence must match at the top level:
SELECT '{"foo": {"bar": "baz"}}'::jsonb ? 'bar'; -- yields false

-- A string is considered to exist if it matches a primitive JSON string:
SELECT '"foo"'::jsonb ? 'foo';
```

Dodatkowo: `@?` i `@@` — dopasowania jsonpath.

## Subskrypty jsonb (oryginał, wybrane)

```sql
-- Extract object value by key
SELECT ('{"a": 1}'::jsonb)['a'];

-- Extract nested object value by key path
SELECT ('{"a": {"b": {"c": 1}}}'::jsonb)['a']['b']['c'];

-- Extract array element by index
SELECT ('[1, "2", null]'::jsonb)[1];

-- Update object value by key. Note the quotes around '1': the assigned
-- value must be of the jsonb type as well
UPDATE table_name SET jsonb_field['key'] = '1';

-- Filter records using a WHERE clause with subscripting. Since the result of
-- subscripting is jsonb, the value we compare it against must also be jsonb.
-- The double quotes make "value" also a valid jsonb string.
SELECT * FROM table_name WHERE jsonb_field['key'] = '"value"';
```

## Indeksowanie GIN (oryginał)

```sql
-- domyślna klasa operatorów: wspiera ?, ?|, ?&, @>, @?, @@
CREATE INDEX idxgin ON api USING GIN (jdoc);

-- jsonb_path_ops: mniejszy/szybszy, wspiera tylko @>, @?, @@
CREATE INDEX idxginp ON api USING GIN (jdoc jsonb_path_ops);

-- indeks na wyrażeniu
CREATE INDEX idxgintags ON api USING GIN ((jdoc -> 'tags'));

-- Find documents in which the key "company" has value "Magnafone"
SELECT jdoc->'guid', jdoc->'name' FROM api WHERE jdoc @> '{"company": "Magnafone"}';

-- Find documents in which the key "tags" contains array element "qui"
SELECT jdoc->'guid', jdoc->'name' FROM api WHERE jdoc @> '{"tags": ["qui"]}';

-- jsonpath matching
SELECT jdoc->'guid', jdoc->'name' FROM api WHERE jdoc @? '$.tags[*] ? (@ == "qui")';
SELECT jdoc->'guid', jdoc->'name' FROM api WHERE jdoc @@ '$.tags[*] == "qui"';
```

Poza GIN możliwe też `btree` i `hash` — do porównań równości całych dokumentów.

## to_jsonb (z functions-json.html — kluczowe dla triggera audytu)

Sygnatura (oryginał):

```
to_json ( anyelement ) → json
to_jsonb ( anyelement ) → jsonb
```

Opis (PL): konwertuje dowolną wartość SQL na `json`/`jsonb`. Tablice i typy złożone
(w tym rekordy wierszy — `NEW`/`OLD` w triggerze!) są konwertowane rekurencyjnie na
tablice i obiekty JSON. Skalar inny niż liczba/boolean/null trafia jako string JSON.

Przykłady (oryginał):

```sql
to_json('Fred said "Hi."'::text)
→ "Fred said \"Hi.\""

to_jsonb(row(42, 'Fred said "Hi."'::text))
→ {"f1": 42, "f2": "Fred said \"Hi.\""}

row_to_json(row(1,'foo'))
→ {"f1":1,"f2":"foo"}
```

## Zastosowanie w D2 (db1_kursy)

Kolumny `stan_przed jsonb` / `stan_po jsonb` w tabeli changelog wypełniamy przez
`to_jsonb(OLD)` / `to_jsonb(NEW)` w funkcji triggera. Do wyszukiwania po treści
zmian nadaje się indeks GIN (`@>` na `stan_po`).
