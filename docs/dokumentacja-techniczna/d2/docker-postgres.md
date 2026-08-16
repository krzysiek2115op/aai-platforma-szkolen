# Oficjalny obraz Docker `postgres`

> Źródło: https://hub.docker.com/_/postgres
> Pobrano: 2026-08-17 (WebFetch) · Aktualne tagi: `latest` = PostgreSQL 18.6;
> wspierane też 17.11, 16.15, 15.19, 14.24 (oraz beta 19)

## Zmienne środowiskowe POSTGRES_* (streszczenie PL + cytaty)

- **POSTGRES_PASSWORD** — WYMAGANA, nie może być pusta. Ustawia hasło superużytkownika.
  Oryginał: "This environment variable is required for you to use the PostgreSQL image.
  It must not be empty or undefined. This environment variable sets the superuser
  password for PostgreSQL."
- **POSTGRES_USER** — opcjonalna; wraz z POSTGRES_PASSWORD tworzy użytkownika-superusera
  i bazę o tej samej nazwie. Domyślnie `postgres`.
- **POSTGRES_DB** — opcjonalna; inna nazwa domyślnej bazy tworzonej przy pierwszym starcie.
  Domyślnie = wartość POSTGRES_USER.
- **POSTGRES_INITDB_ARGS** — opcjonalna; argumenty przekazywane do `initdb`
  (string rozdzielany spacjami).
- **POSTGRES_HOST_AUTH_METHOD** — opcjonalna; metoda auth dla połączeń hostowych
  (wszystkie bazy/użytkownicy/adresy). Domyślnie `scram-sha-256` (w 14+; `md5` w starszych).
- **PGDATA** — zmienna samego serwera postgres (nie Dockera); skrypt entrypoint ją respektuje —
  pozwala wskazać podkatalog danych.

## Sekrety: sufiks _FILE

Zamiast wartości w env można podać plik (np. Docker secret w `/run/secrets/<nazwa>`).
Wspierane dla: POSTGRES_INITDB_ARGS, POSTGRES_PASSWORD, POSTGRES_USER, POSTGRES_DB.

```bash
$ docker run --name some-postgres -e POSTGRES_PASSWORD_FILE=/run/secrets/postgres-passwd -d postgres
```

## Skrypty inicjalizacyjne: /docker-entrypoint-initdb.d

Oryginał: "If you would like to do additional initialization in an image derived from
this one, add one or more *.sql, *.sql.gz, or *.sh scripts under
/docker-entrypoint-initdb.d (creating the directory if necessary). After the entrypoint
calls initdb to create the default postgres user and database, it will run any *.sql
files, run any executable *.sh scripts, and source any non-executable *.sh scripts
found in that directory to do further initialization before starting the service."

Kluczowe (PL):
- Wykonywane TYLKO przy pierwszym starcie (pusty katalog danych) — istniejąca baza pomija initdb.d.
- Kolejność: posortowane nazwy plików wg bieżącej locale (domyślnie `en_US.utf8`) —
  stąd konwencja prefiksów `01-...sql`, `02-...sql` dla migracji.
- Obsługiwane: `*.sql`, `*.sql.gz`, `*.sh` (wykonywalne — uruchamiane; niewykonywalne — source'owane).

## Uruchomienie i wolumeny (oryginał)

```bash
$ docker run --name some-postgres -e POSTGRES_PASSWORD=mysecretpassword -d postgres
```

Compose (oryginał z docs):

```yaml
# Use postgres/example user/password credentials

services:

  db:
    image: postgres
    restart: always
    # set shared memory limit when using docker compose
    shm_size: 128mb
    # or set shared memory limit when deploy via swarm stack
    #volumes:
    #  - type: tmpfs
    #    target: /dev/shm
    #    tmpfs:
    #      size: 134217728 # 128*2^20 bytes = 128Mb
    environment:
      POSTGRES_PASSWORD: example

  adminer:
    image: adminer
    restart: always
    ports:
      - 8080:8080
```

Trwałość danych: montować wolumen na katalog danych `/var/lib/postgresql/data`
(nazwany wolumen Dockera lub bind mount), np. `-v pgdata:/var/lib/postgresql/data`.

## Zastosowanie w D2 (db1_kursy)

- Obraz przypięty do konkretnej wersji (np. `postgres:18`), nie `latest`.
- `POSTGRES_DB=db1_kursy`, hasło przez `POSTGRES_PASSWORD` (docelowo `_FILE`).
- Migracje czystym SQL jako ponumerowane pliki w `/docker-entrypoint-initdb.d/`
  (montowane katalogiem) + nazwany wolumen na dane.
