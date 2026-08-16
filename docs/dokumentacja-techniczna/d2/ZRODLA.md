# Źródła dokumentacji technicznej — Dział D2 (baza db1_kursy)

Wszystkie pliki pobrane z ORYGINALNYCH stron przez WebFetch dnia 2026-08-17.
Każdy plik: polskie streszczenie + oryginalne fragmenty kodu/SQL bez tłumaczenia.

| Plik | URL | Data pobrania | Wersja narzędzia |
|---|---|---|---|
| pg-create-trigger.md | https://www.postgresql.org/docs/current/sql-createtrigger.html | 2026-08-17 | PostgreSQL 18 (current = 18.6) |
| pg-plpgsql-triggery.md | https://www.postgresql.org/docs/current/plpgsql-trigger.html | 2026-08-17 | PostgreSQL 18 (current = 18.6) |
| pg-jsonb.md | https://www.postgresql.org/docs/current/datatype-json.html + https://www.postgresql.org/docs/current/functions-json.html (to_jsonb) | 2026-08-17 | PostgreSQL 18 (current = 18.6) |
| pg-create-function.md | https://www.postgresql.org/docs/current/sql-createfunction.html | 2026-08-17 | PostgreSQL 18 (current = 18.6) |
| node-postgres-podstawy.md | https://node-postgres.com/features/connecting + https://node-postgres.com/features/queries | 2026-08-17 | pg 8.23.0 (npm latest; docs nie podają wersji na stronie) |
| node-postgres-pooling.md | https://node-postgres.com/apis/pool | 2026-08-17 | pg 8.23.0 (npm latest; docs nie podają wersji na stronie) |
| docker-postgres.md | https://hub.docker.com/_/postgres | 2026-08-17 | obraz postgres: `latest` = 18.6; zalecany tag przypięty `postgres:18` (wspierane: 17.11, 16.15, 15.19, 14.24) |

## Odstępstwa i uwagi

- Wszystkie URL-e z zadania odpowiedziały poprawnie — zapasowy URL GitHub
  (docker-library/docs) NIE był potrzebny.
- Strony node-postgres.com nie pokazują numeru wersji pakietu; wersję `pg` 8.23.0
  pobrano z rejestru npm: https://registry.npmjs.org/pg/latest (2026-08-17).
  Docs deklarują wsparcie Node 18.x/20.x/22.x/24.x.
- Sekcja datatype-json.html nie opisuje `to_jsonb` — opis dociągnięto z oficjalnej
  strony functions-json.html (ta sama domena) i włączono do pg-jsonb.md.
