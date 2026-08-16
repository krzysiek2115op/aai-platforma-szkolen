# CREATE FUNCTION (PostgreSQL)

> Źródło: https://www.postgresql.org/docs/current/sql-createfunction.html
> Pobrano: 2026-08-17 (WebFetch) · Wersja dokumentacji: PostgreSQL 18 (current, 18.6)

## Składnia (oryginał)

```
CREATE [ OR REPLACE ] FUNCTION
    name ( [ [ argmode ] [ argname ] argtype [ { DEFAULT | = } default_expr ] [, ...] ] )
    [ RETURNS rettype
      | RETURNS TABLE ( column_name column_type [, ...] ) ]
  { LANGUAGE lang_name
    | TRANSFORM { FOR TYPE type_name } [, ... ]
    | WINDOW
    | { IMMUTABLE | STABLE | VOLATILE }
    | [ NOT ] LEAKPROOF
    | { CALLED ON NULL INPUT | RETURNS NULL ON NULL INPUT | STRICT }
    | { [ EXTERNAL ] SECURITY INVOKER | [ EXTERNAL ] SECURITY DEFINER }
    | PARALLEL { UNSAFE | RESTRICTED | SAFE }
    | COST execution_cost
    | ROWS result_rows
    | SUPPORT support_function
    | SET configuration_parameter { TO value | = value | FROM CURRENT }
    | AS 'definition'
    | AS 'obj_file', 'link_symbol'
    | sql_body
  } ...
```

## Kluczowe parametry (streszczenie PL)

- **OR REPLACE** — tworzy nową lub zastępuje istniejącą funkcję; nie można przy tym zmienić nazwy, typów argumentów ani typu zwracanego. Zachowuje obiekty zależne (reguły, widoki, triggery) — w przeciwieństwie do DROP + CREATE.
- **RETURNS** — typ zwracany: skalar, `SETOF typ`, `RETURNS TABLE(...)`; dla funkcji wyzwalaczy: **`RETURNS trigger`**.
- **LANGUAGE** — `sql`, `c`, `internal` lub język proceduralny (np. `plpgsql`).
- **IMMUTABLE | STABLE | VOLATILE** — zmienność (domyślnie `VOLATILE`); wpływa na optymalizator.
- **SECURITY INVOKER | SECURITY DEFINER** — z czyimi uprawnieniami działa funkcja (domyślnie INVOKER). Przy DEFINER ustawiać bezpieczny `search_path` (przykład niżej).
- **AS 'definition'** — treść funkcji jako stała tekstowa; **dollar quoting** (`$$` lub `$tag$`) pozwala uniknąć escapowania cudzysłowów.
- **SET parametr = wartość** — parametr konfiguracyjny ustawiany na czas wykonania funkcji.

## Przykłady (oryginał)

```sql
CREATE FUNCTION add(integer, integer) RETURNS integer
    AS 'select $1 + $2;'
    LANGUAGE SQL
    IMMUTABLE
    RETURNS NULL ON NULL INPUT;
```

```sql
CREATE FUNCTION add(a integer, b integer) RETURNS integer
    LANGUAGE SQL
    IMMUTABLE
    RETURNS NULL ON NULL INPUT
    RETURN a + b;
```

```sql
CREATE OR REPLACE FUNCTION increment(i integer) RETURNS integer AS $$
        BEGIN
                RETURN i + 1;
        END;
$$ LANGUAGE plpgsql;
```

```sql
CREATE FUNCTION dup(in int, out f1 int, out f2 text)
    AS $$ SELECT $1, CAST($1 AS text) || ' is text' $$
    LANGUAGE SQL;

SELECT * FROM dup(42);
```

```sql
CREATE FUNCTION dup(int) RETURNS TABLE(f1 int, f2 text)
    AS $$ SELECT $1, CAST($1 AS text) || ' is text' $$
    LANGUAGE SQL;

SELECT * FROM dup(42);
```

```sql
CREATE FUNCTION check_password(uname TEXT, pass TEXT)
RETURNS BOOLEAN AS $$
DECLARE passed BOOLEAN;
BEGIN
        SELECT  (pwd = $2) INTO passed
        FROM    pwds
        WHERE   username = $1;

        RETURN passed;
END;
$$  LANGUAGE plpgsql
    SECURITY DEFINER
    -- Set a secure search_path: trusted schema(s), then 'pg_temp'.
    SET search_path = admin, pg_temp;
```

## Przeciążanie i usuwanie (streszczenie PL)

- Dozwolone jest wiele funkcji o tej samej nazwie z różnymi typami argumentów WEJŚCIOWYCH (parametry OUT są ignorowane przy rozróżnianiu):

```sql
CREATE FUNCTION foo(int) ...
CREATE FUNCTION foo(int, out text) ...  -- KONFLIKT z powyższą
```

- Wartości domyślne mogą tworzyć niejednoznaczność:

```sql
CREATE FUNCTION foo(int) ...
CREATE FUNCTION foo(int, int default 42) ...
-- wywołanie foo(10) zakończy się błędem niejednoznaczności
```

- DROP + ponowne CREATE tworzy NOWY byt — obiekty odwołujące się do starej funkcji trzeba odtworzyć; `CREATE OR REPLACE` tego unika.
- Nie można zmieniać nazw istniejących parametrów wejściowych; nazwy wyjściowych tylko gdy jest jeden.

## Zastosowanie w D2 (db1_kursy)

Funkcja audytu changelog: `CREATE OR REPLACE FUNCTION fn_audyt() RETURNS trigger AS $$ ... $$ LANGUAGE plpgsql;` — treść w dollar quoting; wzorzec ciała w `pg-plpgsql-triggery.md`.
