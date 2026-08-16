# Praca w tym repo

Konkrety specyficzne dla tego projektu. Konwencje przejęte z
[matthewplugins.pl](https://github.com/MatthewPlugins/matthewplugins.pl)
i z projektu egzaminacyjnego „3 pluginy 3 bazy danych".

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
6. **Deploy** — gdy będzie co i gdzie wdrażać (docelowy hosting Node.js).

## Wersjonowanie (SemVer, projekt przedprodukcyjny)

- `0.X.0` — każdy większy krok (ukończony etap, nowa funkcjonalność),
- `0.X.Y` — poprawki w ramach etapu,
- `1.0.0` — komplet: 3 moduły + 3 bazy, zaakceptowane przez właściciela.

## Konwencje commitów

```
feat:   nowa funkcjonalność
fix:    naprawa błędu
docs:   dokumentacja (README, plan, changelog)
chore:  infrastruktura repo, CI, narzędzia
test:   testy
refactor: zmiana kodu bez zmiany zachowania
```

## Strażnicy

Katalog `tools/straznicy/`. Zasada z matthewplugins.pl: **kontrola jest
warta tyle, ile jej podpięcie** — dlatego runner `uruchom-wszystkie.mjs`
sam znajduje każdy plik `straznik-*.mjs`. Nowy strażnik = nowy plik w tym
katalogu, nic więcej. CI i pre-commit uruchamiają runnera, nie pojedyncze
skrypty.

Lokalne uruchomienie:

```bash
node tools/straznicy/uruchom-wszystkie.mjs
```

## Zasady twarde

- Repo `MatthewPlugins/matthewplugins.pl` — **tylko do odczytu** (wzorce,
  design, konwencje). Żadnych pushy tam do końca projektu.
- Sekrety wyłącznie w `.env` (ignorowany); wzorcem jest `.env.example`.
- Moduł łączy się tylko ze SWOJĄ bazą; komunikacja między modułami przez
  ich publiczne API, nigdy przez cudze tabele.
- README ma mówić prawdę o bieżącym stanie projektu — aktualizacja README
  jest częścią definicji ukończenia każdego kroku.
