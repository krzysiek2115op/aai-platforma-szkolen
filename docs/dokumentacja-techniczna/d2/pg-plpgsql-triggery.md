# Funkcje wyzwalaczy w PL/pgSQL (NEW/OLD, TG_OP, audyt)

> Źródło: https://www.postgresql.org/docs/current/plpgsql-trigger.html
> Pobrano: 2026-08-17 (WebFetch) · Wersja dokumentacji: PostgreSQL 18 (current, 18.6)

## Zmienne specjalne w funkcji triggera (streszczenie PL)

| Zmienna | Typ | Znaczenie |
|---|---|---|
| `NEW` | record | nowy wiersz dla `INSERT`/`UPDATE` (triggery wierszowe); NULL w triggerach na poziomie instrukcji i dla `DELETE` |
| `OLD` | record | stary wiersz dla `UPDATE`/`DELETE`; NULL w triggerach na poziomie instrukcji i dla `INSERT` |
| `TG_NAME` | name | nazwa triggera, który się odpalił |
| `TG_WHEN` | text | `BEFORE`, `AFTER` lub `INSTEAD OF` |
| `TG_LEVEL` | text | `ROW` lub `STATEMENT` |
| `TG_OP` | text | operacja: `INSERT`, `UPDATE`, `DELETE` lub `TRUNCATE` |
| `TG_RELID` | oid | OID tabeli, która wywołała trigger (referencja do `pg_class.oid`) |
| `TG_TABLE_NAME` | name | nazwa tabeli wywołującej trigger |
| `TG_TABLE_SCHEMA` | name | schemat tej tabeli |
| `TG_NARGS` | integer | liczba argumentów z `CREATE TRIGGER` |
| `TG_ARGV` | text[] | argumenty z `CREATE TRIGGER`; indeks od 0, nieprawidłowy indeks → NULL |

## Wartość zwracana z triggera wierszowego (streszczenie PL)

- Funkcja musi zwrócić `NULL` albo rekord o strukturze dokładnie takiej jak tabela triggera.
- **BEFORE**: zwrot `NULL` = pomiń operację dla tego wiersza (dalsze triggery się nie odpalą, INSERT/UPDATE/DELETE nie zajdzie). Zwrot niepustego wiersza = operacja idzie dalej z tą wartością — modyfikując `NEW` można zmienić zapisywany wiersz. Dla `DELETE` zwracana wartość nie ma bezpośredniego efektu, ale musi być niepusta; idiom: `RETURN OLD` (bo `NEW` jest NULL).
- **INSTEAD OF**: `NULL` = nic nie zrobiono, pomiń resztę operacji dla wiersza; inaczej zwróć `NEW` (INSERT/UPDATE) lub `OLD` (DELETE).
- **AFTER** (wierszowe) i triggery na poziomie instrukcji: wartość zwracana jest zawsze ignorowana — może być `NULL`; trigger nadal może przerwać całość przez `RAISE`.

## Przykład audytu — trigger wierszowy (oryginał, Example 41.4)

```sql
CREATE TABLE emp (
    empname           text NOT NULL,
    salary            integer
);

CREATE TABLE emp_audit(
    operation         char(1)   NOT NULL,
    stamp             timestamp NOT NULL,
    userid            text      NOT NULL,
    empname           text      NOT NULL,
    salary            integer
);

CREATE OR REPLACE FUNCTION process_emp_audit() RETURNS TRIGGER AS $emp_audit$
    BEGIN
        --
        -- Create a row in emp_audit to reflect the operation performed on emp,
        -- making use of the special variable TG_OP to work out the operation.
        --
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO emp_audit SELECT 'D', now(), current_user, OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO emp_audit SELECT 'U', now(), current_user, NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO emp_audit SELECT 'I', now(), current_user, NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$emp_audit$ LANGUAGE plpgsql;

CREATE TRIGGER emp_audit
AFTER INSERT OR UPDATE OR DELETE ON emp
    FOR EACH ROW EXECUTE FUNCTION process_emp_audit();
```

## Przykład audytu — tabele przejściowe (oryginał, Example 41.7)

```sql
CREATE OR REPLACE FUNCTION process_emp_audit() RETURNS TRIGGER AS $emp_audit$
    BEGIN
        --
        -- Create rows in emp_audit to reflect the operations performed on emp,
        -- making use of the special variable TG_OP to work out the operation.
        --
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO emp_audit
                SELECT 'D', now(), current_user, o.* FROM old_table o;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO emp_audit
                SELECT 'U', now(), current_user, n.* FROM new_table n;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO emp_audit
                SELECT 'I', now(), current_user, n.* FROM new_table n;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$emp_audit$ LANGUAGE plpgsql;

CREATE TRIGGER emp_audit_ins
    AFTER INSERT ON emp
    REFERENCING NEW TABLE AS new_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_emp_audit();
CREATE TRIGGER emp_audit_upd
    AFTER UPDATE ON emp
    REFERENCING OLD TABLE AS old_table NEW TABLE AS new_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_emp_audit();
CREATE TRIGGER emp_audit_del
    AFTER DELETE ON emp
    REFERENCING OLD TABLE AS old_table
    FOR EACH STATEMENT EXECUTE FUNCTION process_emp_audit();
```

## Zastosowanie w D2 (db1_kursy — changelog JSONB)

Dla tabeli `changelog` ze stanem przed/po w JSONB łączymy powyższy wzorzec z `to_jsonb`:
w gałęzi `TG_OP = 'DELETE'` zapisujemy `to_jsonb(OLD)` jako stan_przed (stan_po NULL),
dla `UPDATE` — `to_jsonb(OLD)` i `to_jsonb(NEW)`, dla `INSERT` — tylko `to_jsonb(NEW)`.
Trigger `AFTER ... FOR EACH ROW`, zwrot `RETURN NULL`. Szczegóły `to_jsonb` → `pg-jsonb.md`.
