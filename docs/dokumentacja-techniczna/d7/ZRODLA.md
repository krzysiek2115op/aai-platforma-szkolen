# Źródła dokumentacji — Dział 7 (treść kursów)

Oryginalna dokumentacja pobrana z sieci (WYTYCZNE §7 i N2) jako baza
merytoryczna treści obu kursów. Każda lekcja kursu wskazuje plik(i)
źródłowe z tego katalogu — zero zmyślania.

Data pobrania: **2026-08-18**. Format: markdown serwowany oficjalnie
przez wydawców (nie scraping HTML).

> [!IMPORTANT]
> **Pliki źródłowe NIE leżą w repozytorium — zostają lokalnie.** Decyzja
> właściciela z 2026-08-18: to 2219 plików i 55 MB, a git przechowuje każdą
> wersję na stałe, więc raz wpuszczone ciążyłyby każdemu klonowaniu już
> zawsze. Do repo idzie to, co czyni źródła weryfikowalnymi: ten opis
> i skrypt odtwarzający komplet.
>
> **Odtworzenie po świeżym klonie** (~15 min; idempotentne — pomija to,
> co już jest, więc przerwane pobieranie wznawia się bez strat):
> ```bash
> node tools/pobierz-dokumentacje-d7.mjs
> ```
> Pilnuje tego `straznik-wagi-dokumentacji`: masa dokumentacji nie ma
> prawa trafić do gita nawet przez `git add -f`.

## Co pobieramy

| Katalog | Źródło | Sposób pobrania | Stron |
|---|---|---|---|
| `claude-platform/` | https://platform.claude.com/docs (Anthropic Developer Documentation) | indeks `https://docs.claude.com/llms.txt` → strony `*.md` | **566** (komplet) |
| `claude-code/` | https://code.claude.com/docs (Claude Code) | indeks `https://code.claude.com/docs/llms.txt` → strony `*.md` | **187** (komplet) |
| `github/` | https://docs.github.com (GitHub Docs) | Page List API `…/api/pagelist/en/free-pro-team@latest` → Article API `…/api/article/body?pathname=…` (kanał markdown wskazany przez GitHub w `llms.txt`) | **1466** z 3192 — zakres niżej |

Razem **2219** plików, 55 MB (`claude-platform` 32 MB, `github` 15 MB,
`claude-code` 7,8 MB).

## Zakres GitHuba — co odpadło i dlaczego

Pełne `docs.github.com` to 3192 artykuły wersji free-pro-team@latest
(bez wariantów Enterprise Server). Kurs „Jak poprawnie używać GitHuba"
uczy PRACY z GitHubem, więc bierzemy sekcje o tej pracy, a nie cały
serwis. **W zakresie:** `get-started`, `repositories`, `pull-requests`,
`issues`, `authentication`, `organizations`, `account-and-profile`,
`actions`, `codespaces`, `pages`, `packages`, `webhooks`, `desktop`,
`github-cli`, `communities`, `discussions`, `search-github` oraz
z bezpieczeństwa część praktyczna (`getting-started`, `concepts`,
`tutorials` i how-to o sekretach, łańcuchu dostaw i alertach).

**Poza zakresem:**

| Odrzucone | Stron | Dlaczego |
|---|---|---|
| `copilot` | 551 | konkurencyjne narzędzie AI — o pracy z AI uczy kurs 1, na dokumentacji Claude |
| `rest`, `graphql`, `apps` | 428 | API dla autorów integracji, nie dla użytkownika GitHuba |
| `code-security` (how-tos i reference GHAS) | ~390 | funkcje na licencji Advanced Security — kursant ich nie ma |
| `billing`, `migrations`, `site-policy`, `education`, `sponsors`, `nonprofit`, `support`, `integrations`, `subscriptions-and-notifications` | ~440 | rozliczenia, regulaminy i programy — nie materiał szkoleniowy |

Zakres jest zapisany kodem w stałej `SEKCJE_GITHUBA`
([tools/pobierz-dokumentacje-d7.mjs](../../../tools/pobierz-dokumentacje-d7.mjs)),
więc rozszerzenie kursu = dopisanie sekcji i ponowne uruchomienie skryptu.

## Który kurs czerpie skąd

- **Kurs 1 „Jak poprawnie korzystać z Claude"** → `claude-platform/`
  (platforma, API, prompt engineering, agenty i narzędzia) oraz
  `claude-code/` (praca z Claude Code — systemy pracy, o których mówi
  strona sprzedażowa).
- **Kurs 2 „Jak poprawnie używać GitHuba"** → `github/` (od
  `get-started/` przez `repositories/`, `pull-requests/`, `issues/`
  i `actions/` po `authentication/`).

## Zasady użycia (wiążące dla treści D7)

1. Treść lekcji powstaje WYŁĄCZNIE z plików tego katalogu — nie
   z pamięci modelu. Gdy czegoś tu nie ma, najpierw dopobieramy
   (i dopisujemy do tej tabeli), potem piszemy.
2. Kursy w 100% zgodne z programem: moduły/lekcje = spis treści
   realnego materiału; strona nie obiecuje niczego spoza programu.
3. Fragmenty faktycznie przywoływane przez lekcje kopiujemy do
   podkatalogu `cytowane/` — ten JEST w repozytorium, żeby dało się
   sprawdzić zgodność lekcji ze źródłem bez pobierania 55 MB.
4. Dokumentacja to migawka z daty pobrania — przy aktualizacji treści
   kursu odświeżyć pliki i datę w tej tabeli.
