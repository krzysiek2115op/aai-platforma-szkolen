# node-postgres — API pg.Pool (pula połączeń)

> Źródło: https://node-postgres.com/apis/pool
> Pobrano: 2026-08-17 (WebFetch) · Wersja pakietu `pg` (npm latest): 8.23.0
> (strona docs nie podaje numeru wersji)

## Opcje konstruktora (streszczenie PL, wartości domyślne z docs)

| Opcja | Domyślnie | Znaczenie |
|---|---|---|
| `connectionTimeoutMillis` | `0` (brak limitu) | ms oczekiwania na nowe połączenie klienta zanim padnie timeout |
| `idleTimeoutMillis` | `10000` | ms bezczynności klienta przed rozłączeniem; `0` wyłącza |
| `max` | `10` | maksymalna liczba klientów w puli |
| `min` | `0` | minimum utrzymywanych klientów (obecnie tylko chroni przed ewikcją) |
| `allowExitOnIdle` | `false` | pozwala pętli zdarzeń Node zakończyć się, gdy wszyscy klienci bezczynni |
| `maxUses` | `Infinity` | ile razy klient może być wypożyczony, zanim zostanie wymieniony |
| `maxLifetimeSeconds` | `0` (wyłączone) | maksymalny całkowity czas życia połączenia (s) |
| `onConnect` | — | callback (może być async) uruchamiany raz na nowego klienta, zanim trafi do puli |
| `pipeline` | `false` | włącza pipelining zapytań na tworzonych klientach |

Pool przyjmuje też wszystkie opcje Client (user/password/host/port/database/connectionString...).

## pool.query() — pojedyncze zapytania

```javascript
import { Pool } from 'pg'
const pool = new Pool()
const result = await pool.query('SELECT $1::text as name', ['brianc'])
console.log(result.rows[0].name) // brianc
```

## pool.connect() — wypożyczenie klienta (np. transakcje)

```javascript
import { Pool } from 'pg'
const pool = new Pool()
const client = await pool.connect()
await client.query('SELECT NOW()')
client.release()
```

KRYTYCZNE (z docs): klienta **trzeba** zwolnić (`client.release()`) po zakończeniu pracy
— inaczej pula się wyczerpie i kolejne `connect()` będą wisieć lub padać na timeout.

Zniszczenie klienta zamiast zwrotu do puli (np. po błędzie):

```javascript
const client = await pool.connect()
await client.query('SELECT NOW()')
await client.release(true)
```

## pool.end() — zamknięcie puli

```javascript
import { Pool } from 'pg'
const pool = new Pool()
await pool.end()
```

## Zdarzenia puli (streszczenie PL)

| Zdarzenie | Kiedy |
|---|---|
| `connect` | pula nawiązała nowe połączenie z PostgreSQL |
| `acquire` | klient wypożyczony z puli |
| `error` | błąd na bezczynnym kliencie; klient jest automatycznie zamykany i usuwany z puli |
| `release` | klient zwrócony do puli |
| `remove` | klient zamknięty i usunięty z puli |

Zawsze podpinać `pool.on('error', ...)` — nieobsłużony błąd bezczynnego klienta może ubić proces.

## Właściwości puli

- `pool.totalCount` — łączna liczba istniejących klientów w puli
- `pool.idleCount` — liczba bezczynnych (niewypożyczonych) klientów
- `pool.waitingCount` — liczba żądań czekających w kolejce na wolnego klienta

## Zastosowanie w D2 (db1_kursy)

Jeden współdzielony `Pool` (moduł singleton) dla kanału JSON i akcji kreatora;
transakcje (migracje, wieloetapowe zapisy) przez `pool.connect()` + `try/finally { client.release() }`.
