# Dziennik zmian

Format wg [Keep a Changelog](https://keepachangelog.com/pl/1.1.0/),
wersjonowanie [SemVer](https://semver.org/lang/pl/). Najnowszy wpis na górze.
Pierwszy nagłówek wersji w tym pliku jest **źródłem prawdy o wersji projektu**
— pilnuje tego `tools/straznicy/straznik-wersji.mjs`.

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
