# node-postgres (pg) — połączenia i zapytania

> Źródła: https://node-postgres.com/features/connecting oraz https://node-postgres.com/features/queries
> Pobrano: 2026-08-17 (WebFetch) · Wersja pakietu `pg` (npm latest): 8.23.0
> (docs nie podają numeru wersji na stronie; wsparcie Node: 18.x, 20.x, 22.x, 24.x)

Instalacja: `npm install pg`

## Połączenia

### Zmienne środowiskowe (jak libpq/psql)

Pool i Client automatycznie czytają te same zmienne środowiskowe co psql — konfiguracja poza kodem.

```javascript
import pg from 'pg'
const { Pool, Client } = pg

const pool = new Pool()
const res = await pool.query('SELECT NOW()')
await pool.end()

const client = new Client()
await client.connect()
const res = await client.query('SELECT NOW()')
await client.end()
```

Zmienne i wartości domyślne:

```
PGUSER=dbuser            # domyślnie: process.env.USER
PGPASSWORD=secretpassword # domyślnie: null
PGHOST=database.server.com # domyślnie: localhost
PGPORT=3211              # domyślnie: 5432
PGDATABASE=mydb          # domyślnie: process.env.USER
```

### Konfiguracja programowa

```javascript
import pg from 'pg'
const { Pool, Client } = pg

const pool = new Pool({
  user: 'dbuser',
  password: 'secretpassword',
  host: 'database.server.com',
  port: 3211,
  database: 'mydb',
})

console.log(await pool.query('SELECT NOW()'))

const client = new Client({
  user: 'dbuser',
  password: 'secretpassword',
  host: 'database.server.com',
  port: 3211,
  database: 'mydb',
})

await client.connect()
console.log(await client.query('SELECT NOW()'))
await client.end()
```

`password` może być też funkcją (sync/async) — np. dynamiczne tokeny chmurowe.

### Connection string (URI)

```javascript
import pg from 'pg'
const { Pool, Client } = pg
const connectionString = 'postgresql://dbuser:secretpassword@database.server.com:3211/mydb'

const pool = new Pool({
  connectionString,
})

await pool.query('SELECT NOW()')
await pool.end()

const client = new Client({
  connectionString,
})

await client.connect()
await client.query('SELECT NOW()')
await client.end()
```

(Format: `postgresql://user:haslo@host:port/baza` — typowe w hostingach typu Heroku, `DATABASE_URL`.)

### Gniazda unixowe

```javascript
import pg from 'pg'
const { Client } = pg
client = new Client({
  user: 'username',
  password: 'password',
  host: '/cloudsql/myproject:zone:mydb',
  database: 'database_name',
})
```

## Zapytania

### Proste zapytanie tekstowe

```javascript
await client.query('SELECT NOW() as now')
```

### Zapytania parametryzowane ($1, $2, ...)

OSTRZEŻENIE z dokumentacji (oryginał): "If you are passing parameters to your queries
you will want to avoid string concatenating parameters into the query text directly.
This can (and often does) lead to sql injection vulnerabilities." — nigdy nie sklejać
wartości do SQL; zawsze placeholdery.

```javascript
const text = 'INSERT INTO users(name, email) VALUES($1, $2) RETURNING *'
const values = ['brianc', 'brian.m.carlson@gmail.com']

const res = await client.query(text, values)
console.log(res.rows[0])
// { name: 'brianc', email: 'brian.m.carlson@gmail.com' }
```

### Obiekt konfiguracyjny zapytania

```javascript
const query = {
  text: 'INSERT INTO users(name, email) VALUES($1, $2)',
  values: ['brianc', 'brian.m.carlson@gmail.com'],
}

const res = await client.query(query)
console.log(res.rows[0])
```

### Prepared statements (pole `name`)

```javascript
const query = {
  name: 'fetch-user',
  text: 'SELECT * FROM user WHERE id = $1',
  values: [1],
}

const res = await client.query(query)
console.log(res.rows[0])
```

### Row mode: tablice zamiast obiektów

```javascript
const query = {
  text: 'SELECT $1::text as first_name, $2::text as last_name',
  values: ['Brian', 'Carlson'],
  rowMode: 'array',
}

const res = await client.query(query)
console.log(res.fields.map(field => field.name)) // ['first_name', 'last_name']
console.log(res.rows[0]) // ['Brian', 'Carlson']
```

### Własne parsowanie typów

```javascript
const query = {
  text: 'SELECT * from some_table',
  types: {
    getTypeParser: () => val => val,
  },
}
```

## Zastosowanie w D2 (db1_kursy)

Jeden `Pool` na moduł (konfiguracja przez `DATABASE_URL`/zmienne PG*), wszystkie
zapytania wyłącznie parametryzowane (`$1, $2`). Szczegóły puli → `node-postgres-pooling.md`.
