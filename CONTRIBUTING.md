# Praca w tym repo

Konkrety specyficzne dla tego projektu. Konwencje przejęte z
[automatic-ai](https://github.com/MatthewPlugins/automatic-ai)
i z projektu egzaminacyjnego „3 pluginy 3 bazy danych" — to nazwa zadania,
nie opis dzisiejszej architektury (patrz „Wersjonowanie" niżej).

## Pierwsze uruchomienie

```bash
git config core.hooksPath .githooks
```

Ta komenda (raz, w swoim klonie) włącza dwa haki:

- **`pre-commit`** — blokuje pliki `.env` i jawne sekrety w commicie,
  uruchamia strażników. Sekundy, nie minuty.
- **`pre-push`** — blokuje bezpośredni push na `main`; zmiany idą przez PR.

Git celowo nie pozwala repozytorium narzucić haków — każdy wykonuje
tę komendę u siebie. Oba haki da się ominąć (`--no-verify`) — to furtka
na świadomy wyjątek, nie zaproszenie.

## Workflow: Weryfikacja-PR

Każdy krok projektu — także mały — przechodzi tę samą ścieżkę:

```
branch → commit(y) → push → PR → CI zielone → merge → (release, deploy gdy potrzebne)
```

1. **Branch** od gałęzi, na której toczy się praca (moduły: od swojego
   brancha `plugin-X-…`; sprawy repo: od `main`).
2. **Commity** — po polsku, z prefiksem (niżej), przy każdym większym kroku.
3. **PR** z krótkim opisem CO i PO CO. CI musi być zielone przed merge.
4. **Merge** — squash dla drobnicy, merge commit dla większych całości.
5. **Release** — po każdym WIĘKSZYM kroku: podbicie wersji w `CHANGELOG.md`
   i `README.md` (tabela „Stan projektu"), tag `vX.Y.Z`, release na GitHubie
   z opisem z changeloga. Rozjazd wersji zatrzyma `straznik-wersji`.
6. **Deploy** — gdy będzie co i gdzie wdrażać. Produktem są **wtyczki
   WordPressa** (decyzja zespołu 2026-08-18), więc wdrożenie to hosting WP
   z motywem Automatic AI, nie serwer Node.js; paczki robi `npm run pakuj`,
   instrukcja dla klienta: [docs/INSTRUKCJA-INSTALACJI.md](docs/INSTRUKCJA-INSTALACJI.md).

## Wersjonowanie (SemVer, projekt przedprodukcyjny)

- `0.X.0` — każdy większy krok (ukończony etap, nowa funkcjonalność),
- `0.X.Y` — poprawki w ramach etapu,
- `1.0.0` — komplet: trzy wtyczki WordPressa (`aai-sklep`, `aai-platnosci`,
  `aai-monitor`) z własnymi tabelami w bazie WP, zaakceptowane przez
  właściciela. Trzy osobne bazy z pierwotnego planu nigdy nie powstały:
  jedyną bazą Postgresa jest `db1_kursy` prototypu, a wtyczki trzymają dane
  w tabelach z własnym prefiksem w bazie WordPressa.

## Konwencje commitów

**Temat commita opisuje SKUTEK, nie czynność** — po polsku, w jednym
zdaniu, tak żeby historia dała się czytać jak dziennik projektu:

```
Widok kupionego kursu ma własnego strażnika, nie tylko pamięć sesji
README przestaje kłamać liczbami, a strażnik pilnuje każdej kotwicy
Dokumenty wiedzą, że widok kursu jest przyjęty, a dev psuje produkcyjny build
```

Nie „dodano strażnika" ani „poprawiono README": z listy commitów ma być
widać, co się w projekcie ZMIENIŁO, a nie jaką czynność ktoś wykonał.
Konwencja przejęta z repo strony głównej po przeglądzie jego historii.

**Ciało commita niesie dowody**: co sprawdzone i czym (kody wyjścia bez
potoku), a przy naprawach dokumentacji — sekcje „co było nieprawdą" i
„czego nie zmieniłem, bo było prawdą". Wycofany własny wniosek zapisuje
się wprost; to tańsze niż powtórne wpadnięcie w tę samą pułapkę.

Prefiksy `feat:`/`fix:`/`docs:`/`chore:`/`test:`/`refactor:` zostają
dozwolone dla drobnicy (literówka, bump wersji) i są w historii repo do
wersji 0.21.0 — ale nie są wymagane i nie zastępują zdania o skutku.

## Strażnicy

Katalog `tools/straznicy/`. Zasada ze strony głównej Automatic AI: **kontrola jest
warta tyle, ile jej podpięcie** — dlatego runner `uruchom-wszystkie.mjs`
sam znajduje każdy plik `straznik-*.mjs`. Nowy strażnik = nowy plik w tym
katalogu, nic więcej. CI i pre-commit uruchamiają runnera, nie pojedyncze
skrypty.

Lokalne uruchomienie:

```bash
node tools/straznicy/uruchom-wszystkie.mjs   # sami strażnicy, sekundy
npm run check                                # pełna bramka: to, co przechodzi CI
```

`npm run check` = strażnicy → lint → tsc → testy → build → siedem smoke'ów.
Kody wyjścia sprawdzaj **bez potoku** — `node skrypt | tail` maskuje kod
wyjścia i zielony ogon potrafi zasłonić czerwony wynik.

## Zasady twarde

- **Bramka kasuje wyłącznie to, co sama zrobiła.** Środowisko warsztatu jest
  wspólne z właścicielem — skrzynka łapacza poczty, zamówienia, konta, zapisy
  na kursy. Smoke bierze więc na starcie migawkę stanu i przywraca go na
  końcu, zamiast czyścić zasób do zera: „przywróć stan" to co innego niż
  „wyczyść wszystko". Do tego każda taka bramka kończy **rachunkiem
  sumienia** — porównaniem stanu po przebiegu ze stanem sprzed, także dla
  danych CUDZYCH (sweep P5: smoke liczący wyłącznie własne ślady nie zauważył
  skasowania 18 lekcji Kursu 2). Poczta ma na to wspólny moduł
  `tools/smoke/poczta.mjs`; pilnuje tego `straznik-higieny-smokow`.
- Repo `MatthewPlugins/automatic-ai` (strona główna) — **tylko do odczytu** (wzorce,
  design, konwencje). Żadnych pushy tam do końca projektu.
- Sekrety wyłącznie w `.env` (ignorowany); wzorcem jest `.env.example`.
- Moduł łączy się tylko ze SWOJĄ bazą; komunikacja między modułami przez
  ich publiczne API, nigdy przez cudze tabele.
- README ma mówić prawdę o bieżącym stanie projektu — aktualizacja README
  jest częścią definicji ukończenia każdego kroku.
- **Polskie cudzysłowy w łańcuchach PHP**: `„` jest znakiem spoza ASCII, ale
  `"` już nie. Napisany po polsku komunikat `"tekst „coś" dalej"` kończy
  łańcuch w środku i daje `syntax error, unexpected identifier` — parser
  wskazuje wtedy zdanie, nie cudzysłów. Domykaj `”` albo nie używaj
  cudzysłowów w komunikatach. (Kosztowało dwa przebiegi 2026-08-25.)
