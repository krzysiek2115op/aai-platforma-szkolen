# Dziennik zmian

Format wg [Keep a Changelog](https://keepachangelog.com/pl/1.1.0/),
wersjonowanie [SemVer](https://semver.org/lang/pl/). Najnowszy wpis na górze.
Pierwszy nagłówek wersji w tym pliku jest **źródłem prawdy o wersji projektu**
— pilnuje tego `tools/straznicy/straznik-wersji.mjs`.

## [0.6.0] — 2026-08-17

Dział 3 Pluginu 1 — dyspozytor (bramka B3: testy zielone, goldeny JSON,
straznik-ajax potwierdza jeden kanał, audyt CRUD w changelogu).

### Dodane
- **Kanał JSON** (odczyt serwerowy — [modules/m1-sklep/odczyt.ts](modules/m1-sklep/odczyt.ts)):
  `listaKursow` (katalog, tylko opublikowane), `szczegolyKursu`
  (pełny kurs z sekcjami/modułami/lekcjami), `listaKursowKreatora`;
  wyjście walidowane Zod-em.
- **Dyspozytor — JEDEN AJAX** ([modules/m1-sklep/dyspozytor.ts](modules/m1-sklep/dyspozytor.ts)):
  akcje `zapisz` (insert/edycja + pełna podmiana sekcji i modułów),
  `usun`, `publikuj` — każda w osobnej transakcji z aktorem audytu
  (`app.actor`); usuwanie jawnie od dołu, żeby każdy wpis changelogu
  znał kurs; walidacja Zod na wejściu (czytelne błędy: `walidacja`,
  `brak-dostepu`, `nie-znaleziono`, `duplikat`); dostęp tymczasowo
  tokenem `KREATOR_TOKEN` (pełny auth da Plugin 3).
- **Endpoint HTTP** [app/api/szkolenia/route.ts](app/api/szkolenia/route.ts) —
  jedyny AJAX pluginu (POST), cienka warstwa nad dyspozytorem, bez SQL.
- **Kontrakty Zod** ([modules/m1-sklep/typy.ts](modules/m1-sklep/typy.ts)):
  karty/szczegóły kursu, akcje jako `discriminatedUnion`, typy TS
  wyprowadzane ze schematów.
- **straznik-ajax** — w app/api może istnieć tylko jeden endpoint na
  moduł i żaden endpoint-sierota (WYTYCZNE §8).
- **Testy B3** ([modules/m1-sklep/dyspozytor.test.ts](modules/m1-sklep/dyspozytor.test.ts),
  razem 15/15): walidacja, token, zapis z audytem wszystkich tabel,
  duplikat sluga, publikacja, edycja z podmianą modułów, usuwanie +
  **golden odpowiedzi JSON** [goldeny/d3-odczyt.json](goldeny/d3-odczyt.json);
  testy biegną sekwencyjnie (`--test-concurrency=1`, wspólna baza).
- Dokumentacja techniczna D3 (WYTYCZNE N2) w
  [docs/dokumentacja-techniczna/d3/](docs/dokumentacja-techniczna/d3/):
  Next.js Route Handlers (reference + guide), Zod 4 (podstawy, API,
  błędy) + ZRODLA.md.
- `.env.example`: `KREATOR_TOKEN` (sekret lokalnie w `.env`).

## [0.5.0] — 2026-08-17

Dział 2 Pluginu 1 — baza `db1_kursy` (bramka B2: testy dowodzą, że
migracje wstają od zera i triggery logują każdą operację; golden schematu).

### Dodane
- **Baza db1_kursy w kontenerze** ([docker-compose.yml](docker-compose.yml),
  postgres:17-alpine; lokalnym silnikiem jest podman — `npm run db1:up`);
  [.env.example](.env.example) z `DB1_URL` (sekrety tylko w ignorowanym `.env`).
- **Migracje czystym SQL** ([modules/m1-sklep/db/migrations/](modules/m1-sklep/db/migrations/)):
  `001-tabele.sql` — courses, course_sections, course_modules,
  course_lessons, course_changelog (wg ERD z DIAGRAMU) + indeksy;
  `002-triggery-audytu.sql` — wspólna funkcja `m1_audyt()` na WSZYSTKICH
  czterech tabelach treści (create/update/delete → stan przed/po w JSONB,
  aktor z `app.actor`), auto-`updated_at`, changelog niezmienny
  (UPDATE/DELETE/TRUNCATE odrzucane triggerem).
- **Runner migracji** ([modules/m1-sklep/db/migruj.ts](modules/m1-sklep/db/migruj.ts)):
  transakcje per migracja, sha256 w tabeli `_migracje` — zmieniona po
  fakcie migracja zatrzymuje przebieg. Klient puli pg tylko w module
  ([modules/m1-sklep/db/klient.ts](modules/m1-sklep/db/klient.ts)).
- **Testy B2** ([modules/m1-sklep/db/migracje.test.ts](modules/m1-sklep/db/migracje.test.ts),
  `npm test`, node --test): od zera, idempotencja, audyt wszystkich tabel
  (lekcje dostają course_id z lookupu), niezmienność changelogu oraz
  **golden schematu** [goldeny/d2-schemat.json](goldeny/d2-schemat.json)
  (odtworzenie po świadomej zmianie: `GOLDEN_ZAPISZ=1 npm test`).
- **straznik-migracji** — numeracja NNN bez dziur, MANIFEST.json z sha256:
  migracja zmieniona po fakcie nie przejdzie pre-commita ani CI.
- CI: job „Baza db1_kursy" z usługą postgres — `npm test` na każdym PR.
- Dokumentacja techniczna D2 (WYTYCZNE N2) w
  [docs/dokumentacja-techniczna/d2/](docs/dokumentacja-techniczna/d2/):
  CREATE TRIGGER, plpgsql (NEW/OLD/TG_OP), JSONB, CREATE FUNCTION,
  node-postgres (Pool, zapytania parametryzowane), obraz Dockera postgres
  + ZRODLA.md (PostgreSQL 18, pg 8.23).

## [0.4.0] — 2026-08-17

Dział 1 Pluginu 1 — fundament aplikacji (do bramki B1: ocena właściciela
na localhost:3001).

### Dodane
- Szkielet aplikacji **Next.js 16.3.1 + React 19 + TypeScript (strict) +
  Tailwind 4** z serwerem, dev/start na porcie **3001**; wersje i konfiguracja
  zgodne ze stroną główną (tsconfig, ESLint flat config, postcss).
- Design system „Volt" przejęty ze strony głównej ([app/globals.css](app/globals.css)):
  tokeny `@theme` (void/panel/fg/steel/volt/line, fonty Geist, skala typo),
  utilities `container-site`/`bg-grid`/`panel`/maski, efekty CTA.
- Strona [/szkolenia](app/szkolenia/page.tsx): hero wg wzorca PageHero,
  siatka kart-placeholderów (prawdziwe kursy z bazy od Działu 4), pasek CTA;
  korzeń `/` przekierowuje na `/szkolenia`. Nagłówek wg strony głównej;
  **stopka przejęta 1:1** (uwaga właściciela przy B1): HUD statusu,
  statement, SVG wordmark na szynie zasilającej z impulsem, scena canvas
  „pył danych" (FooterScene), animacje wejść Reveal z wyłącznikiem
  bezpieczeństwa `html.js` i przejścia stron (template.tsx).
- Stub publicznego API modułu ([modules/m1-sklep/index.ts](modules/m1-sklep/index.ts))
  — jedyna przyszła warstwa z dostępem do bazy.
- **straznik-granic** — klient SQL i connection stringi tylko w `modules/`,
  zakaz importów między modułami i importów z bebechów modułu spoza niego
  (BAZA → DZIAŁ → STRONA, WYTYCZNE §8).
- **straznik-ci** — gdy istnieje package.json, CI musi uruchamiać
  npm ci → lint → tsc → build (test dojdzie od Działu 2).
- CI: job „Kod aplikacji" (lint → tsc → build) w [ci.yml](.github/workflows/ci.yml).
- Dokumentacja techniczna D1 (WYTYCZNE N2) pobrana z sieci do
  [docs/dokumentacja-techniczna/d1/](docs/dokumentacja-techniczna/d1/):
  Next.js 16.3.1 (instalacja, layouty, struktura, CSS, fonty) + Tailwind 4.3
  (instalacja w Next.js, `@theme`) + ZRODLA.md (URL, data, wersja).

## [0.3.4] — 2026-08-17

### Dodane
- [CLAUDE.md](CLAUDE.md) — strażnik ciągłości kontekstu: auto-ładowany
  w każdej sesji, wskazuje dokumenty źródłowe, twarde zasady i NASTĘPNY
  KROK; aktualizowany przy każdym kroku zmieniającym stan projektu.
  Uzupełnia goldena przed-clear (pamięć Claude): przed każdym /clear
  sweep rozmowy — decyzje na nośnik trwały, zero strat.

## [0.3.3] — 2026-08-16

### Zmienione
- WYTYCZNE §8 doprecyzowane przez właściciela: AJAX nie musi być jedynym
  kanałem do bazy — obok idzie **kanał JSON** (odczyt serwerowy przy
  renderowaniu: szybciej + SEO). AJAX zostaje JEDEN i obsługuje akcje
  po załadowaniu strony (kreator). Diagram przepływu zaktualizowany.

## [0.3.2] — 2026-08-16

### Dodane
- **WYTYCZNE §8 „Wystrzał"** (nowa wytyczna właściciela): z jednej bazy
  danych idzie tylko JEDEN kanał AJAX — jeden plugin = jeden AJAX;
  dział-dyspozytor jako jedyny rozmawia z bazą i rozdziela JSON stronom.
  Pilnować będzie `straznik-ajax`.

### Zmienione
- Diagram przepływu Pluginu 1: trzy tory zastąpione JEDNYM wystrzałem
  BAZA —AJAX→ DZIAŁ-DYSPOZYTOR —JSON→ 3 strony; Dział 3 to teraz
  dyspozytor (akcje: lista/szczegoly/zapisz/usun/publikuj).

## [0.3.1] — 2026-08-16

### Zmienione
- Diagram przepływu danych Pluginu 1 przerysowany po uwadze właściciela:
  **każdy dział ma własny tor** BAZA —AJAX→ DZIAŁ —JSON→ STRONA i nie
  dotyka torów innych działów; nie istnieje wspólny kanał z bazy do
  wszystkich działów.

## [0.3.0] — 2026-08-16

Diagram Pluginu 1 do oceny właściciela.

### Dodane
- [docs/plugin-1/DIAGRAM.md](docs/plugin-1/DIAGRAM.md) — podział Pluginu 1
  na 7 działów z bramkami jakości B1–B7 po każdym dziale, diagram przepływu
  danych wg zasady **BAZA → DZIAŁ → STRONA** (konwencja
  z mp-offer-automation-suite), schemat ERD bazy `db1_kursy` z changelogiem
  pisanym triggerami, plan dokumentacji technicznej per dział (WYTYCZNE N2)
  i plan nowych strażników (granic, migracji, CI).
- Ustalenie: agenci AI tylko jako bramki jakości (przegląd agent+krytyk
  w B7), codzienna kontrola należy do skryptów — strażników, testów, goldenów.
- Localhost do oceny wyglądu: strona główna z klonu na porcie 3000,
  Plugin 1 będzie na 3001.

## [0.2.0] — 2026-08-16

Wytyczne właściciela + licencja. Nadal bez kodu aplikacji.

### Dodane
- [docs/WYTYCZNE.md](docs/WYTYCZNE.md) — wiążące wytyczne projektu:
  procedura naprawy wstecznej `.bak`, pilnowanie statusów GitHuba,
  goldeny (dla agentów i regresji napraw), weryfikacja co krok,
  pobierana dokumentacja techniczna; zasady nadrzędne: każdy agent
  ma krytyka, każdy dział dostaje oryginalną dokumentację z sieci.
- Licencja **GPL-2.0** ([LICENSE](LICENSE)) + deklaracja w README.
- [rejestr/znane-bledy.json](rejestr/znane-bledy.json) — rejestr realnych
  błędów projektu (schemat klasa/dowód/skutek/test z projektu egzaminacyjnego).
- `straznik-licencji` — LICENSE = GPL v2 i deklaracja w README, na stałe.
- `.gitignore`: pliki `*.bak` nie wchodzą do repo (migawką jest gałąź `bak/…`).

## [0.1.0] — 2026-08-16

Fundament repozytorium — jeszcze bez kodu aplikacji.

### Dodane
- Plan całego projektu ([docs/PLAN.md](docs/PLAN.md)): 3 moduły („pluginy"),
  3 bazy PostgreSQL, decyzje architektoniczne, workflow branchy.
- Workflow Weryfikacja-PR: branch → commit → CI → merge → release
  ([CONTRIBUTING.md](CONTRIBUTING.md)).
- CI (GitHub Actions): strażnicy + skan sekretów gitleaks (binarka przypięta
  po SHA-256).
- Strażnicy (`tools/straznicy/`) z automatycznym podpięciem — runner sam
  znajduje pliki `straznik-*.mjs`:
  - `straznik-wersji` — README deklaruje wersję zgodną z CHANGELOG,
  - `straznik-linkow` — względne linki w Markdown prowadzą do istniejących plików.
- Haki gita (`.githooks/`): pre-commit (blokada sekretów i `.env` + strażnicy),
  pre-push (blokada bezpośredniego pusha na `main`).
- Branch `plugin-1-sklep-kursow` pod przyszłe prace nad modułem 1.
