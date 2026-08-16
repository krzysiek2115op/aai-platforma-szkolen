# Dziennik zmian

Format wg [Keep a Changelog](https://keepachangelog.com/pl/1.1.0/),
wersjonowanie [SemVer](https://semver.org/lang/pl/). Najnowszy wpis na górze.
Pierwszy nagłówek wersji w tym pliku jest **źródłem prawdy o wersji projektu**
— pilnuje tego `tools/straznicy/straznik-wersji.mjs`.

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
