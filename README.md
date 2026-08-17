<div align="center">

# Pod strona Szkolenia

**Sklep z kursami i ebookami dla matthewplugins.pl** — podstrona `/szkolenia`:
katalog kursów, strony sprzedażowe, płatności z dostawą na e-mail
i panel administratora. Trzy odizolowane moduły, trzy osobne bazy danych.

[Plan projektu](docs/PLAN.md) ·
[Wytyczne](docs/WYTYCZNE.md) ·
[Współpraca i workflow](CONTRIBUTING.md) ·
[Dziennik zmian](CHANGELOG.md) ·
[Licencja MIT](LICENSE)

</div>

---

## Stan projektu

| | |
|---|---|
| **Wersja** | **0.14.0** |
| **Etap** | Działy 1–5 Pluginu 1 gotowe (B1–B5 zaliczone przez właściciela); Dział 6 w budowie — kreator kursów: brama na token, lista kursów i dane podstawowe (krok 1 z 3) |
| **Aktywny moduł** | 1 — Sklep z kursami ([diagram działów i bramek](docs/plugin-1/DIAGRAM.md)) |
| **Localhost** | strona główna: `:3000` (klon, tylko podgląd) · Plugin 1: `:3001` (`npm run dev`) |
| **Licencja** | MIT ([LICENSE](LICENSE)) — jak repo strony głównej; fonty Geist osobno na SIL OFL 1.1 ([assets/fonts/LICENSE-Geist-OFL.txt](assets/fonts/LICENSE-Geist-OFL.txt)) |
| **Produkcja** | brak — docelowo hosting Node.js/VPS, merge do repo strony głównej po akceptacji całości |

> [!IMPORTANT]
> To repozytorium jest budowane OSOBNO od strony głównej.
> Repo [matthewplugins.pl](https://github.com/MatthewPlugins/matthewplugins.pl)
> służy wyłącznie jako źródło wzorców (stack, design, strażnicy) — **nie
> wprowadzamy tam żadnych zmian** do czasu ukończenia i oceny tego projektu.

## Moduły („pluginy")

Każdy moduł ma własny branch, własną bazę PostgreSQL i własne API.
Moduły nie sięgają do cudzych tabel.

| # | Moduł | Branch | Baza | Zakres | Stan |
|---|-------|--------|------|--------|------|
| 1 | Sklep z kursami | `plugin-1-sklep-kursow` | `db1_kursy` | katalog `/szkolenia`, strona sprzedażowa kursu, kreator kursów, dziennik zmian (audyt CRUD) | 🔨 Dział 6/7: B1–B5 ✓ (katalog + strona kursu gotowe), następny krok: kreator kursów |
| 2 | Płatności | `plugin-2-platnosci` | `db2_klienci` | bramka płatności (adapter operatora), zamówienia, wysyłka kursu i potwierdzenia na e-mail | 🔒 po module 1 |
| 3 | Panel admina | `plugin-3-admin-panel` | `db3_monitoring` | podstrona tylko dla admina, log logowań (kto, kiedy, skąd), timer wizyt na stronie | 🔒 po module 2 |

Szczegóły — schematy tabel, podstrony, kryteria ukończenia — w
[docs/PLAN.md](docs/PLAN.md).

## Stack

Decyzja z 2026-08-16: ten sam stack co strona główna, żeby finalne wgranie
było zwykłym merge, nie przepisywaniem.

| Warstwa | Technologia |
|---|---|
| Framework | Next.js 16 — App Router, **z serwerem** (API routes / Server Actions) |
| Język | TypeScript (`strict`) |
| UI | React 19 + Tailwind CSS 4, design dziedziczony z matthewplugins.pl |
| Bazy | PostgreSQL ×3 (lokalnie Docker, produkcyjnie VPS/managed) |
| Walidacja | Zod na granicach API |
| Hosting | docelowo wykupiony hosting Node.js / VPS |

## Wytyczne projektu

Wiążące zasady od właściciela — pełna treść w [docs/WYTYCZNE.md](docs/WYTYCZNE.md):

- **naprawa wsteczna `.bak`** — błąd z przeszłości naprawiamy z migawki
  (gałąź `bak/…`), bez kolizji, z wpisem do [rejestru błędów](rejestr/znane-bledy.json)
  i nowym strażnikiem przeciw nawrotom;
- **statusy GitHuba są wiążące** — czerwone CI/audyt = stop, żadnego merge;
- **goldeny** — wzorcowe wyniki chronią naprawy przed psuciem reszty,
  a agentów przed spadkiem jakości;
- **każdy agent ma krytyka** — nigdy agent sam;
- **każdy dział dostaje oryginalną dokumentację techniczną** pobraną z sieci
  (`docs/dokumentacja-techniczna/<dział>/`);
- **weryfikacja co każdy krok** — workflow Weryfikacja-PR poniżej.

## Jak tu się pracuje

Pełny opis: [CONTRIBUTING.md](CONTRIBUTING.md). W skrócie — **Weryfikacja-PR**:

```
branch → commit → push → PR → CI zielone → merge → (release, deploy gdy potrzebne)
```

- każdy większy krok kończy się tagiem `vX.Y.Z` i releasem na GitHubie,
- wersję i historię trzyma [CHANGELOG.md](CHANGELOG.md),
- README jest aktualizowane przy każdym kroku, który zmienia stan projektu
  — pilnuje tego strażnik wersji.

## Strażnicy i CI

Zasada przejęta z matthewplugins.pl: *kontrola jest warta tyle, ile jej
podpięcie*. Runner `tools/straznicy/uruchom-wszystkie.mjs` sam wykrywa
każdy plik `straznik-*.mjs` — nowego strażnika nie da się „zapomnieć podpiąć".

| Kontrola | Gdzie działa | Co łapie |
|---|---|---|
| `straznik-wersji` | pre-commit + CI | rozjazd wersji README ↔ CHANGELOG |
| `straznik-linkow` | pre-commit + CI | martwe linki względne w Markdown |
| `straznik-licencji` | pre-commit + CI | brak/podmiana LICENSE (MIT), brak deklaracji w README, brak noty OFL przy plikach fontów |
| `straznik-granic` | pre-commit + CI | klient SQL / connection string poza `modules/`, importy między modułami, import z bebechów modułu (BAZA → DZIAŁ → STRONA) |
| `straznik-ci` | pre-commit + CI | package.json bez kroków `npm ci` → lint → tsc → build → test w CI |
| `straznik-migracji` | pre-commit + CI | migracje SQL z dziurą w numeracji albo zmienione po fakcie (sha256 ↔ MANIFEST.json) |
| `straznik-ajax` | pre-commit + CI | drugi endpoint AJAX modułu albo endpoint poza działem (WYTYCZNE §8: jedna baza = jeden wystrzał) |
| `straznik-fontow` | pre-commit + CI | import pakietu `geist` (psuł hydratację — BLAD-001); fonty tylko przez next/font/local |
| `straznik-fixed` | pre-commit + CI | `transform`/`filter` w klasie opakowującej treść — łamie `position: fixed` potomków, przez co pasek menu kursu znikał przy scrollu (BLAD-003) |
| blokada sekretów | pre-commit | pliki `.env`, tokeny/klucze w diffie |
| gitleaks (pinowany po SHA-256) | CI | sekrety w całej historii repo |
| blokada pusha na `main` | pre-push | zmiany na `main` poza PR-em |

CI uruchamia też job „Kod aplikacji": `npm ci` → lint → tsc → build
(testy dojdą od Działu 2 — pilnuje `straznik-ci`).

## Szybki start (po sklonowaniu)

```bash
git config core.hooksPath .githooks   # włącza haki — raz, obowiązkowo
npm ci                                # zależności (Node 24+)
cp .env.example .env                  # lokalna konfiguracja (DB1_URL)
npm run db1:up                        # baza db1_kursy (podman/docker compose)
npm run db1:migruj                    # migracje SQL + triggery audytu
npm run dev                           # Plugin 1 → http://localhost:3001/szkolenia
npm test                              # testy modułów (wymagają bazy)
node tools/straznicy/uruchom-wszystkie.mjs   # ręczne odpalenie strażników
```

### Kreator kursów (Dział 6)

Panel treści właściciela: `http://localhost:3001/szkolenia/kreator`.
Po zalogowaniu wejście jest też pod ręką na samych stronach sklepu —
dyskretna pigułka w rogu `/szkolenia` i strony kursu, widoczna
wyłącznie dla zalogowanego (gość nie ma jej nawet w źródle strony).
Wejście na token z `.env` (`KREATOR_TOKEN`) — trafia do ciastka
HttpOnly, więc nie ma go w JavaScripcie strony; pełne logowanie da
Plugin 3. Kreator czyta bazę kanałem JSON, a zmienia ją **wyłącznie**
przez jedyny wystrzał AJAX `app/api/szkolenia` — każda operacja
zostawia ślad w `course_changelog` (triggery bazy).

> [!IMPORTANT]
> Przy wdrożeniu za reverse proxy (nginx/Caddy) proxy MUSI przekazywać
> nagłówek `X-Forwarded-Proto` — z niego bierze się flaga `Secure`
> ciastka kreatora. Bez niego, gdy proxy przepisuje `Host` na
> `localhost`, ciastko z tokenem poleciałoby po https bez `Secure`.
