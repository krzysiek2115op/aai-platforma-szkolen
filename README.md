<div align="center">

# Pod strona Szkolenia

**Sklep z kursami i ebookami dla matthewplugins.pl** — podstrona `/szkolenia`:
katalog kursów, strony sprzedażowe, płatności z dostawą na e-mail
i panel administratora. Trzy odizolowane moduły, trzy osobne bazy danych.

[Plan projektu](docs/PLAN.md) ·
[Wytyczne](docs/WYTYCZNE.md) ·
[Współpraca i workflow](CONTRIBUTING.md) ·
[Dziennik zmian](CHANGELOG.md) ·
[Licencja GPL-2.0](LICENSE)

</div>

---

## Stan projektu

| | |
|---|---|
| **Wersja** | **0.2.0** |
| **Etap** | fundament repo + plan + wytyczne; kod aplikacji jeszcze nie powstał |
| **Aktywny moduł** | żaden — czekamy na diagram planu od właściciela |
| **Licencja** | GPL-2.0 ([LICENSE](LICENSE)) |
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
| 1 | Sklep z kursami | `plugin-1-sklep-kursow` | `db1_kursy` | katalog `/szkolenia`, strona sprzedażowa kursu, kreator kursów, dziennik zmian (audyt CRUD) | ⏳ oczekuje na wytyczne |
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
| `straznik-licencji` | pre-commit + CI | brak/podmiana LICENSE (GPL-2.0), brak deklaracji w README |
| blokada sekretów | pre-commit | pliki `.env`, tokeny/klucze w diffie |
| gitleaks (pinowany po SHA-256) | CI | sekrety w całej historii repo |
| blokada pusha na `main` | pre-push | zmiany na `main` poza PR-em |

Po dojściu kodu aplikacji CI rozrośnie się o `lint → tsc → test → build → smoke`.

## Szybki start (po sklonowaniu)

```bash
git config core.hooksPath .githooks   # włącza haki — raz, obowiązkowo
node tools/straznicy/uruchom-wszystkie.mjs   # ręczne odpalenie strażników
```

Kod aplikacji (Next.js, `npm ci`, `npm run dev`) pojawi się wraz z modułem 1
— ta sekcja zostanie wtedy rozbudowana.
