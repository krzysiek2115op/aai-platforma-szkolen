# CREATE TRIGGER (PostgreSQL)

> Źródło: https://www.postgresql.org/docs/current/sql-createtrigger.html
> Pobrano: 2026-08-17 (WebFetch) · Wersja dokumentacji: PostgreSQL 18 (current, 18.6)

## Składnia (oryginał)

```
CREATE [ OR REPLACE ] [ CONSTRAINT ] TRIGGER name { BEFORE | AFTER | INSTEAD OF } { event [ OR ... ] }
    ON table_name
    [ FROM referenced_table_name ]
    [ NOT DEFERRABLE | [ DEFERRABLE ] [ INITIALLY IMMEDIATE | INITIALLY DEFERRED ] ]
    [ REFERENCING { { OLD | NEW } TABLE [ AS ] transition_relation_name } [ ... ] ]
    [ FOR [ EACH ] { ROW | STATEMENT } ]
    [ WHEN ( condition ) ]
    EXECUTE { FUNCTION | PROCEDURE } function_name ( arguments )

where event can be one of:

    INSERT
    UPDATE [ OF column_name [, ... ] ]
    DELETE
    TRUNCATE
```

## Kluczowe parametry (streszczenie PL)

- **BEFORE | AFTER | INSTEAD OF** — kiedy funkcja jest wywoływana względem zdarzenia. Constraint trigger może być tylko `AFTER`.
- **FOR EACH ROW** — raz na każdy zmodyfikowany wiersz; **FOR EACH STATEMENT** — raz na całą instrukcję (domyślne, gdy nie podano). Constraint triggery tylko `FOR EACH ROW`.
- **event** — `INSERT`, `UPDATE [OF kolumny]`, `DELETE`, `TRUNCATE`; można łączyć przez `OR` (poza przypadkiem z tabelami przejściowymi). `UPDATE OF kolumna` odpala trigger tylko, gdy kolumna jest celem UPDATE.
- **WHEN (condition)** — warunek logiczny decydujący, czy funkcja faktycznie się wykona. W triggerach wierszowych można używać `OLD.kolumna` / `NEW.kolumna` (INSERT nie ma `OLD`, DELETE nie ma `NEW`). `INSTEAD OF` nie wspiera `WHEN`; `WHEN` nie może zawierać podzapytań.
- **REFERENCING ... TABLE** — tabele przejściowe (transition tables): `OLD TABLE` = obrazy wierszy sprzed UPDATE/DELETE, `NEW TABLE` = obrazy po UPDATE/INSERT. Tylko dla triggerów `AFTER` na zwykłych tabelach; nie dla constraint triggerów.
- **OR REPLACE** — tworzy nowy trigger albo zastępuje istniejący o tej samej nazwie na tej samej tabeli.

## Przykłady (oryginał)

```sql
-- Execute function whenever a row of accounts table is about to be updated
CREATE TRIGGER check_update
    BEFORE UPDATE ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION check_account_update();

-- Modify trigger to only execute if column balance is specified as UPDATE target
CREATE OR REPLACE TRIGGER check_update
    BEFORE UPDATE OF balance ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION check_account_update();

-- Execute function only if column balance has changed value
CREATE TRIGGER check_update
    BEFORE UPDATE ON accounts
    FOR EACH ROW
    WHEN (OLD.balance IS DISTINCT FROM NEW.balance)
    EXECUTE FUNCTION check_account_update();

-- Log updates only if something changed
CREATE TRIGGER log_update
    AFTER UPDATE ON accounts
    FOR EACH ROW
    WHEN (OLD.* IS DISTINCT FROM NEW.*)
    EXECUTE FUNCTION log_account_update();

-- Execute function for each row to insert rows into underlying tables of a view
CREATE TRIGGER view_insert
    INSTEAD OF INSERT ON my_view
    FOR EACH ROW
    EXECUTE FUNCTION view_insert_row();

-- Execute function for each statement using transition relations
CREATE TRIGGER transfer_insert
    AFTER INSERT ON transfer
    REFERENCING NEW TABLE AS inserted
    FOR EACH STATEMENT
    EXECUTE FUNCTION check_transfer_balances_to_zero();

-- Use both OLD and NEW transition tables
CREATE TRIGGER paired_items_update
    AFTER UPDATE ON paired_items
    REFERENCING NEW TABLE AS newtab OLD TABLE AS oldtab
    FOR EACH ROW
    EXECUTE FUNCTION check_matching_pairs();
```

## Uwagi

- Uprawnienia: trzeba mieć `TRIGGER` na tabeli oraz `EXECUTE` na funkcji triggera.
- Usuwanie: `DROP TRIGGER`.
- Nazwa triggera musi być unikalna w obrębie tabeli; nie może być kwalifikowana schematem (dziedziczy schemat tabeli).
- Tabele partycjonowane: trigger wierszowy jest klonowany na każdą istniejącą i przyszłą partycję; odłączenie partycji usuwa klony.

## Zastosowanie w D2 (db1_kursy)

Wzorzec audytu changelog: `AFTER INSERT OR UPDATE OR DELETE ON tabela FOR EACH ROW EXECUTE FUNCTION fn_audyt()` — szczegóły funkcji w `pg-plpgsql-triggery.md`, stan przed/po w JSONB w `pg-jsonb.md`.
