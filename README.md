<div align="center">

# Pod strona Szkolenia

**Sklep z kursami i ebookami dla Automatic AI** (dawniej matthewplugins.pl)
— podstrona `/szkolenia`: katalog kursów, strony sprzedażowe, płatności
z dostawą na e-mail i panel administratora. Trzy odizolowane moduły,
trzy osobne bazy danych.

[Plan projektu](docs/PLAN.md) ·
[Wytyczne](docs/WYTYCZNE.md) ·
[Współpraca i workflow](CONTRIBUTING.md) ·
[Dziennik zmian](CHANGELOG.md) ·
[Licencja MIT](LICENSE)

<br>

[![Podgląd katalogu /szkolenia](docs/zrzuty/podglad-szkolenia.png)](http://localhost:3001/szkolenia)

*Podgląd lokalny: [`http://localhost:3001/szkolenia`](http://localhost:3001/szkolenia)
— `npm run db1:up && npm run db1:migruj && npm run dev`
([pełny start](#szybki-start-po-sklonowaniu))*

</div>

---

## Stan projektu

| | |
|---|---|
| **Wersja** | **0.18.0** |
| **Etap** | Działy 1–6 Pluginu 1 gotowe — **B1–B6 zaliczone przez właściciela** (B6: 2026-08-17, kreator kursów); następny krok: Dział 7 — treść obu kursów z oryginalnej dokumentacji |
| **Aktywny moduł** | 1 — Sklep z kursami ([diagram działów i bramek](docs/plugin-1/DIAGRAM.md)) |
| **Gałąź domyślna** | `plugin-1-sklep-kursow` — tu żyje aktualny stan projektu. `main` jest **celowo nieaktualny** (wersja 0.3.4): moduł wchodzi na niego dopiero po ukończeniu i akceptacji całości ([PLAN.md §5](docs/PLAN.md)) |
| **Localhost** | strona główna: `:3000` (klon, tylko podgląd) · Plugin 1: `:3001` (`npm run dev`) |
| **Licencja** | MIT ([LICENSE](LICENSE)) — jak repo strony głównej; fonty Geist osobno na SIL OFL 1.1 ([assets/fonts/LICENSE-Geist-OFL.txt](assets/fonts/LICENSE-Geist-OFL.txt)) |
| **Produkcja** | brak — **docelowo WordPress na wykupionym hostingu i domenie** (decyzja zespołu 2026-08-18): sklep zostanie przepisany na wtyczkę WP (PHP + MySQL), a obecny kod Next.js jest prototypem-specyfikacją ([szczegóły](docs/PLAN.md#decyzja-zespołu-2026-08-18--produkcja-na-wordpressie-zastępuje-plan-hosting-nodejs--vps)) |

> [!IMPORTANT]
> To repozytorium jest budowane OSOBNO od strony głównej.
> Repo [automatic-ai](https://github.com/MatthewPlugins/automatic-ai)
> (dawniej `matthewplugins.pl`) służy wyłącznie jako źródło wzorców
> (stack, design, strażnicy) — **nie wprowadzamy tam żadnych zmian**
> do czasu ukończenia i oceny tego projektu.

## Moduły („pluginy")

Każdy moduł ma własny branch, własną bazę PostgreSQL i własne API.
Moduły nie sięgają do cudzych tabel.

| # | Moduł | Branch | Baza | Zakres | Stan |
|---|-------|--------|------|--------|------|
| 1 | Sklep z kursami | `plugin-1-sklep-kursow` | `db1_kursy` | katalog `/szkolenia`, strona sprzedażowa kursu, kreator kursów, dziennik zmian (audyt CRUD) | 🔨 Dział 7/7: B1–B6 ✓ (katalog, strona kursu i kreator gotowe), następny krok: treść obu kursów |
| 2 | Płatności | `plugin-2-platnosci` | `db2_klienci` | bramka płatności (adapter operatora), zamówienia, wysyłka kursu i potwierdzenia na e-mail | 🔒 po module 1 |
| 3 | Panel admina | `plugin-3-admin-panel` | `db3_monitoring` | podstrona tylko dla admina, log logowań (kto, kiedy, skąd), timer wizyt na stronie | 🔒 po module 2 |

Szczegóły — schematy tabel, podstrony, kryteria ukończenia — w
[docs/PLAN.md](docs/PLAN.md).

## Stack

Prototyp budujemy na stacku strony głównej; produkcyjnie (decyzja zespołu
2026-08-18) sklep zostanie przepisany na **wtyczkę WordPress (PHP + MySQL)**
— prototyp jest wtedy specyfikacją wyglądu i zachowania 1:1.

| Warstwa | Technologia (prototyp) | Docelowo (etap WP) |
|---|---|---|
| Framework | Next.js 16 — App Router, **z serwerem** (API routes / Server Actions) | wtyczka WordPress (PHP) |
| Język | TypeScript (`strict`) | PHP |
| UI | React 19 + Tailwind CSS 4, design dziedziczony ze strony głównej Automatic AI | ten sam design, szablony wtyczki |
| Bazy | PostgreSQL ×3 (lokalnie podman) | MySQL (hosting WP), migracja danych skryptem |
| Walidacja | Zod na granicach API | sanitizacja/walidacja WP |
| Hosting | localhost (dev) | wykupiony hosting z WordPressem + domena |

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

Zasada przejęta ze strony głównej Automatic AI: *kontrola jest warta tyle, ile jej
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
| `straznik-fixed` | pre-commit + CI | `transform`/`filter` w klasie opakowującej treść — łamie `position: fixed` potomków (BLAD-003); a także animacja z wypełnieniem `forwards`/`both`, która zostawia trwały kontekst układania i chowa te elementy pod stopką (BLAD-004) |
| `straznik-odmiany` | pre-commit + CI | ręczna odmiana polskich liczebników (ternar „kurs"/„kursy") zamiast `lib/odmiana.ts` — dwie formy nie wystarczą, polski ma trzy |
| `straznik-kreatora` | pre-commit + CI | pole lub rodzaj sekcji, który strona kursu potrafi wyrenderować, a kreator nie pozwala go wypełnić (rozjazd `SCHEMATY_SEKCJI` ↔ opis pól panelu, także w polach zagnieżdżonych) |
| `straznik-wagi-dokumentacji` | pre-commit + CI | masa dokumentacji producentów (55 MB, ~2200 plików) wpuszczona do gita — także przez `git add -f`; git trzyma każdą wersję na stałe, więc pomyłka jest nieodwracalna |
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

### Dokumentacja źródłowa kursów (Dział 7)

Treść kursów powstaje wyłącznie z oryginalnej dokumentacji Anthropic
i GitHuba (WYTYCZNE §7 i N2). Same pliki — 2219 stron, 55 MB — **nie są
w repozytorium**: git przechowuje każdą wersję na stałe, więc obciążałyby
każde klonowanie już zawsze. Zamiast nich jedzie skrypt, który odtwarza
komplet co do pliku:

```bash
node tools/pobierz-dokumentacje-d7.mjs   # ~15 min; pomija to, co już jest
```

Zakres i uzasadnienie cięć (GitHub: 1466 z 3192 artykułów):
[docs/dokumentacja-techniczna/d7/ZRODLA.md](docs/dokumentacja-techniczna/d7/ZRODLA.md).

### Kreator kursów (Dział 6)

Panel treści właściciela: `http://localhost:3001/szkolenia/kreator`.
Po zalogowaniu wejście jest też pod ręką na samych stronach sklepu —
dyskretna pigułka w rogu `/szkolenia` i strony kursu, widoczna
wyłącznie dla zalogowanego (gość nie ma jej nawet w źródle strony).
Pełna instrukcja obsługi: [docs/plugin-1/KREATOR.md](docs/plugin-1/KREATOR.md).
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
