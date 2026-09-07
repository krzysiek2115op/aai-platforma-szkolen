# REPO — fala kontrolna po 0.78.0

Gałąź `re-audyt/sektor-re-audytu`, `main` = v0.78.0. Środowisko WP NIE dotknięte
(oba tory zajęte) — komendy WP-mutujące i audyt mutacyjny NIE uruchamiane, zgodnie
z zakazem. Kody wyjścia mierzone BEZ potoku.

## W1 — naprawy v0.66.0…v0.78.0 dotykające REPO (dokumentacja, tura P3, `v0.70.0`)

| Pozycja (CHANGELOG 0.70.0) | Werdykt | Dowód komendą |
|---|---|---|
| CONTRIBUTING: hosting Node.js / „3 moduły + 3 bazy" sprostowane | **NAPRAWIONE** | `grep -n -i "hosting\|3 moduł\|3 bazy" CONTRIBUTING.md` → linia 41-42: „docelowy produkt to trzy wtyczki WordPressa… hosting WP z motywem, nie serwer Node.js"; linia 5 to nazwa projektu egzaminacyjnego, nie deklaracja stanu |
| README: `docs/security-checklist.md` przestaje być „utrzymywany" | **NAPRAWIONE** | `grep -n "security-checklist" README.md` → linia 458-464: wprost „nie był ruszany od 2026-08-19… zero wzmianek o trzech wtyczkach" |
| README: „CI: pięć jobów" (było cztery) | **NAPRAWIONE** | `grep -n "^  [a-zA-Z_-]*:$" .github/workflows/ci.yml` → 5 jobów (`zakres, straznicy, aplikacja, baza, security`); `grep -n "CI:" README.md` → „pięć jobów" |
| `straznik-csp`: „Dziesięć niezmienników" (było dziewięć) | **NAPRAWIONE** | `sed -n '11,22p' tools/straznicy/straznik-csp.mjs` → lista 1–10 kompletna, zgodna z deklaracją |
| `straznik-limitera`: „Trzynaście niezmienników" (było jedenaście) | **NAPRAWIONE** | `sed -n '10,26p' tools/straznicy/straznik-limitera.mjs` → lista 1–13 kompletna |
| Licznik `wordpress/` 135→136, `docs/` 140→142 | **CZĘŚCIOWO / REGRESJA PO NAPRAWIE** | `git ls-files wordpress/ \| wc -l` → **137** (deklarowane w README linia 190: 136); `git ls-files docs/ \| wc -l` → **142** (zgodne). Przyczyna: `git diff --name-status v0.70.0 v0.78.0 -- wordpress/ \| grep '^A'` → dodany `class-aai-sklep-zaleznosci.php` (P1 naprawy, `v0.67.0`) — naprawa była poprawna W CHWILI wydania 0.70.0, drift powstał PÓŹNIEJ i nikt nie zaktualizował „Gdzie co leży". Żaden strażnik tego nie pilnuje (`grep -n "wordpress\|docs/" tools/straznicy/straznik-readme.mjs` — reguły 1–9 nie obejmują drzewa katalogów). **NOWE ZNALEZISKO REPO-90.** |
| Reguła 9 `straznik-readme` — wiersz tabeli Markdown dłuższy niż nagłówek, WSZYSTKIE `.md` w repo | **NAPRAWIONE** | `sed -n '236,282p' tools/straznicy/straznik-readme.mjs` — pętla po `git ls-files '*.md'`, samokontrola zakresu (`dokumenty.length===0`, `sprawdzonychTabel===0`); `node tools/straznicy/straznik-readme.mjs` → kod **0**, „tabele w całym repo bez uciętych wierszy" |
| `Edit\|Write` matcher nie rozbity na `Edit\| Write` | **NAPRAWIONE** | `grep -rn "Edit\| Write" --include="*.md" .` → 0 trafień; `grep -rn "Edit\\\\|Write" CHANGELOG.md` → poprawna forma obecna |
| Wersje wtyczek podbite (0.7.0/0.3.0/0.6.0 na 0.70.0, dalej podbijane) | **NAPRAWIONE** (stan bieżący 0.78.0) | `grep -n "^Version:" wordpress/wtyczki/*/aai-*.php` → aai-sklep 0.12.0, aai-platnosci 0.7.0, aai-monitor 0.8.0 — zgodne z CHANGELOG 0.78.0 |
| CLAUDE.md: „P1 W TOKU" przy P1/P2 wydanych | **NIE ZWERYFIKOWANE — POZA ZAKRESEM** | Polecenie zabrania czytania CLAUDE.md w tej roli; brak weryfikacji |

## W2 — rundy regresji (REPO-R1…R6, R90)

| # | Pytanie | Tak/nie | Dowód |
|---|---|---|---|
| REPO-R1 | Zgłoszenia ZWERYFIKOWANE z REPO odtwarzalne uruchomieniowo? | **TAK (wtórnie)** | Środowisko WP niedostępne w tej roli. Wg BE.md tej fali: „15/15 bramek WP" na wartościach zgodnych z bazowymi z `PLAN-BUDOWY.md` (dane 30 · front 89 · … · seo 172) — **źródło wtórne**, nie zmierzone tu bezpośrednio |
| REPO-R2 | Ile wystąpień klasy „liczba w dokumencie ≠ wynik komendy" w zakresie REPO? | **1 świeże** (wordpress/ 136→137) + **1 pomniejsze** poza kodem produktu | `rejestr/znane-bledy.json` pole `"wersja": "0.25.0"` niezmienione mimo wpisów do BLAD-030 (dodany 2026-08-30, `git log -S'"BLAD-030"' -- rejestr/znane-bledy.json`) — pole bez zdefiniowanego kontraktu w żadnym dokumencie, żaden strażnik go nie pilnuje; niska szkodliwość, ale ta sama klasa |
| REPO-R3 | Klasyfikacja/wpływ audytu (REA-REPO-F1-*) utrzymują się przy pełnym zasięgu? | **TAK** | `ls audyt/zgloszenia/ \| grep REPO` → 15 `AUD-` + 3 `REA-` z fali 1, poza zakresem tej fali (już zamknięte fala kontrolna 0.65.0); żadna nowa naprawa 0.66–0.78 ich nie dotyka |
| REPO-R4 | Klasy z innych działów obecne w zakresie REPO? | **TAK** | Trzy defekty oprzyrządowania zlecone przez orkiestrację (glob z klamrami, `grep --include` w kontenerze, niezmiennik PLAN-BUDOWY) — patrz niżej |
| REPO-R5 | Mechanizm tej samej klasy, którego audyt nie zgłosił? | **TAK** | `.gitattributes`/`package.json` brak pola `"version"` powtarzającego CHANGELOG — nieszkodliwe, bo README deklaruje CHANGELOG jako źródło prawdy (`head -5 CHANGELOG.md`), ale to NOWY mechanizm bez strażnika |
| REPO-R6 | Liczba w dokumencie = wynik podanej komendy? | **NIE (patrz R2)** | jw. |
| REPO-90 | Inne, poza checklistą, mogące skrzywdzić klienta/dane? | **NIE nowych poza R2** | Sprawdzone: CHANGELOG wersje monotoniczne (`grep -n "^## \[" CHANGELOG.md`), `straznik-wersji` kod 0, `docs/schematy` przez `straznik-schematow` kod 0 (w pętli 41/39 strażników — brak błędów) |

## Trzy defekty oprzyrządowania zlecone przez orkiestrację

1. **`git ls-files` nie rozwija klamr `{a,b}`** — **POTWIERDZONE**: `git ls-files ':(glob)…*{class-aai-sklep-tutor,class-aai-sklep-moje}.php'` → 0 trafień mimo istnienia obu plików (`git ls-files ':(glob)…/*.php' | wc -l` → 30 w tym katalogu). Prawdziwa klasa błędu w komendach zakresu ról.
2. **`grep --include` w kontenerach WP zwraca 0** — **POTWIERDZONE POŚREDNIO, nie do zmierzenia z tej roli** (zakaz dotykania WP). Lokalnie (repo, nie kontener) `grep -rl "tutor_option" wordpress/wtyczki --include="*.php"` daje **2**, identycznie jak bez `--include` — czyli defekt jest specyficzny dla `grep` WEWNĄTRZ kontenerów (busybox), nie ogólny. Niezależnie potwierdzony przez role SEC i ARCH tej fali (`audyt/wyniki/kontrola-0.78.0/ARCH.md:183-185`, `SEC.md:134`).
3. **Niezmiennik sektora w `PLAN-BUDOWY.md`, sekcja „FALA KONTROLNA PO 0.78.0", krok 1** — **NIEPOTWIERDZONE W ZGŁOSZONEJ FORMIE**. Krok 1 (linia 5615-5617, commit `014db6d`) ma POPRAWNĄ komendę od chwili napisania: `git diff main --name-only -- . ':!audyt' ':!re-audyt' | wc -l` → zmierzone **0**. Wersja dająca **86** (`git diff main --name-only -- . ':!audyt' | wc -l`, bez drugiego wykluczenia) istnieje w PLIKU, ale pod **inną, wcześniejszą sekcją** („Fakty zmierzone przy E1", linia 5207) i jest tam JAWNIE oznaczona jako *„Zapis historyczny"* z odsyłaczem do bieżącej komendy — dokładnie konwencja tego repo dla nieaktualnych zapisów (§CLAUDE.md: „zapisy nieaktualne oznaczane, nie kasowane"). Wg tej konwencji **to nie jest złamanie prawdziwości**. Zgłoszenie orkiestracji wskazuje złą lokalizację/kontekst — koryguję to jako meta-znalezisko.

## Zakres modułu REPO (komenda z AGENT.md)

`git ls-files -- README.md CLAUDE.md CHANGELOG.md CONTRIBUTING.md LICENSE …` → **81** plików
(oczekiwane wg AGENT.md: 79, zmierzone 2026-09-01). **Rozjazd wyjaśniony, NIE jest KON-R1**:
`docs/NAPRAWY-PO-AUDYCIE.md` i `docs/PLAN-NAPRAW-PO-POLOWANIU.md` dodane po 2026-09-01
(`git log --diff-filter=A --name-only --since=2026-09-01 -- 'docs/*.md'`) — legalny przyrost
zakresu, komenda działa poprawnie.

## Niedomknięte

- **CLAUDE.md** (`P1 W TOKU`) — poza zakresem tej roli z polecenia wprost; nie weryfikowane.
- **`smoke:wp-*` i inne bramki WP** — zakaz środowiskowy; liczby 15/15 przyjęte z BE.md/PLAN-BUDOWY.md
  jako **źródło wtórne**, nie zmierzone bezpośrednio przez REPO.
- **Audyt mutacyjny (452)** — zakaz wprost (mutuje pliki wtyczek); przyjęty ze zgodnych,
  niezależnych źródeł wtórnych BD.md i BE.md.

## Podsumowanie

W1: 8 pozycji NAPRAWIONE, 1 CZĘŚCIOWA/nowy drift (wordpress/ 136→137), 1 poza zakresem.
W2: jedno nowe drobne znalezisko (pole `wersja` w `rejestr/znane-bledy.json` nieaktualizowane
od 0.25.0 mimo wpisów do BLAD-030). Trzy zlecone defekty oprzyrządowania: dwa potwierdzone,
jeden obalony jako źle zlokalizowany (zapis jest poprawnie oznaczony jako historyczny).
Nic z tego nie naprawiam (zasada 2).

## Werdykt krytyka: ODRZUCAM

**Powód (jeden zdaniem):** teza główna roli — „naprawa liczników z `0.70.0` była
poprawna w chwili wydania, drift powstał później" — jest **fałszywa dla części
zakresu**, a kwantyfikator „**1** świeże wystąpienie klasy" jest nieprawdziwy:
w tym samym bloku README rozjeżdżają się **trzy** liczby, a jedna z nich była
nieprawdą **już w dniu wydania `v0.70.0`**. Do tego atrybucja wersji w dowodzie
jest zmyślona, a drugie „nowe" znalezisko jest powtórzeniem zweryfikowanego wpisu
fali 1.

### Pozycje odtworzone samodzielnie i PRZYJĘTE

| Pozycja roli | Moja komenda | Wynik |
|---|---|---|
| CONTRIBUTING (hosting Node.js / „3 bazy") | `grep -niE "node\.js\|3 bazy" CONTRIBUTING.md` | :42 sprostowane, :5 to nazwa zadania — **stoi** |
| README: security-checklist nie „utrzymywany" | `grep -n "security-checklist" README.md` | :458 z legendą stanu — **stoi** |
| README: „CI: pięć jobów" | parser `jobs:` w `ci.yml` (mój pierwszy `grep -cE` dał mylące 6) | **5**: `zakres straznicy aplikacja baza security` — **stoi** |
| `straznik-csp` „Dziesięć" / `straznik-limitera` „Trzynaście" | `grep -n` w obu plikach | zgodne — **stoi** |
| Reguła 9 `straznik-readme` | `node tools/straznicy/straznik-readme.mjs` BEZ potoku | kod **0** — **stoi** |
| Wersje wtyczek | `grep "Version:" wordpress/wtyczki/*/aai-*.php` | 0.12.0 / 0.7.0 / 0.8.0 — **stoi** |
| Zakres roli 79 → 81 to legalny przyrost | komenda zakresu z `AGENT.md` + `git log --diff-filter=A --since=2026-09-01 -- 'docs/*.md'` | **81**; dokładnie 2 nowe pliki — **stoi**, to nie `KON-R1` |
| **Obalenie tezy orkiestracji o niezmienniku** | `sed -n '5206,5209p'` i `'5615,5617p' audyt/PLAN-BUDOWY.md` (odczyt) + oba warianty komendy | pełna → **0**, bez `':!re-audyt'` → **86**; wariant 86 stoi WYŁĄCZNIE w sekcji „Fakty zmierzone przy E1", **jawnie oznaczony „Zapis historyczny"** z odsyłaczem. **Rola ma rację, potwierdzam niezależnie** |
| Defekt oprzyrządowania 1 i 2 (klamry, `grep --include` w kontenerze) | — | znane, potwierdzone przez inne role; **przyjęte** |

### Pozycje NIEPRZYJĘTE

**1. Atrybucja wersji w dowodzie jest zmyślona.** Rola pisze: dodany
`class-aai-sklep-zaleznosci.php` — „**P1 naprawy, `v0.67.0`**".
`git log --diff-filter=A --format='%h %ad' --date=short -- wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-zaleznosci.php`
→ **`358796c`, 2026-09-06, „Kontrola sklepu uczy się zawodzić…"**;
`git tag --contains 358796c` → pierwszy tag **`v0.75.0`** (MAR-A-07, tura P4), nie
`v0.67.0`, nie P1. Prompt roli kazał sprawdzić chronologię dokładnie tą komendą —
nie została wykonana, wersja podana z pamięci. Kierunek wniosku (drift po 0.70.0)
przetrwał przypadkiem.

**2. Kwantyfikator „1 świeże" jest fałszywy — w TYM SAMYM bloku README są trzy
rozjazdy, a jeden obala tezę roli.** Zmierzyłem KAŻDĄ liczbę bloku „Gdzie co leży"
(`git ls-files <ścieżka> | wc -l`):

| README | zmierzone | werdykt |
|---|---|---|
| `wordpress/` **136** | **137** | rozjazd — jedyny zgłoszony przez rolę |
| `aai-sklep/` **88** | **89** | **rozjazd przeoczony** (3 linie niżej) |
| `aai-platnosci/` **18** | **19** | **rozjazd przeoczony** (5 linii niżej) |
| `aai-monitor/` 22, `tresc-kursow/` 331, `docs/` 142, `tools/` 158, `docs/schematy/` 8, `goldeny/` 9, `public/` 15, app+components 73, modules+lib 34, agenci+rejestr 5 | zgodne | — |

Chronologia, którą rola powinna była podać:
`git ls-tree -r --name-only v0.70.0 -- wordpress/wtyczki/aai-platnosci/ | wc -l` → **19**,
a `git diff v0.69.0 v0.70.0 -- README.md` pokazuje, że tura P3 podniosła tylko
`wordpress/ 135→136` i `docs/ 140→142`. Czyli **`aai-platnosci 18` było nieprawdą
JUŻ W CHWILI wydania `v0.70.0`** i tura higieny go nie ruszyła — to nie drift, tylko
**dokładnie ten precedens, którym rola się posługuje**: przelot poprawił dwie liczby
i zatrzymał się nad nimi, a nieprawda tej samej klasy leżała pięć linii niżej.
Rola powtórzyła ten sam błąd metody, opisując go.

**3. Drugie „nowe" znalezisko nie jest nowe.** Pole `"wersja": "0.25.0"`
w `rejestr/znane-bledy.json` to **`REA-REPO-F1-002`, pozycja `REPO-R5`, status
ZWERYFIKOWANE** (odczytane z `audyt/zgloszenia/REA-REPO-F1-002.json`) — ten sam plik,
ta sama teza, z werdyktami weryfikatora i krytyka. Rola sama otwiera wpisy
`REA-REPO-F1-*` w `REPO-R3`, a mimo to podaje to jako świeże w `R2`/`R5`, **bez
oznaczenia jako powtórzenie i z zasięgiem uboższym niż fala 1** (tam policzono:
19 z 30 wpisów przybyło po zamrożeniu, a commit `adf5880` kończył się na `BLAD-011`,
nie `BLAD-013`). Powtórzenie bez pogłębienia = `KON-R5`.

### Werdykt o dwóch nowych znaleziskach roli

**(a) `wordpress/` 136 vs 137 — ZJAWISKO PRAWDZIWE, opis wadliwy, waga WYŻSZA niż
podana.** Sam rozjazd potwierdzam co do sztuki (137 na gałęzi i na `main`).
Kontrakt **istnieje i jest jawny**: blok poprzedza zdanie „Drzewo **zmierzone, nie
przepisane** (`git ls-files`)", więc każda z tych liczb jest twierdzeniem
o wyniku komendy. Ale znalezisko jest **niedomierzone trzykrotnie** (jedna z trzech
pozycji), ma **fałszywą atrybucję wersji** i **fałszywy wniosek** „naprawa była
poprawna w chwili wydania" — nieprawdziwy dla `aai-platnosci`. Prawdziwe brzmienie:
**trzy rozjechane liczby, dwie z driftu po `v0.75.0`, jedna przeoczona przez samą
turę higieny `v0.70.0`.** Że **żaden strażnik tego nie pilnuje**, potwierdzam:
`straznik-readme` kod 0 przy trzech nieprawdziwych liczbach — reguły 7 i 8 dotyczą
`tools/*.mjs` i wierszy tabel, nie tego bloku.

**(b) `rejestr/znane-bledy.json` pole `wersja` — ZJAWISKO PRAWDZIWE, ale NIE JEST
NOWE i nie ma kontraktu.** Zgodnie z pytaniem orkiestracji sprawdziłem obie rzeczy:
`git grep -n "znane-bledy"` poza `audyt/` trafia wyłącznie w komentarze „PO CO"
trzech strażników i prozę — **żadne narzędzie tego pola nie czyta**, więc bez
kontraktu to obserwacja, nie usterka. Waga: **niska**, i tak ją fala 1 rozstrzygnęła.
Jako pozycja tej fali **nie wnosi nic ponad `REA-REPO-F1-002`** — przeciwnie, gubi
policzony zasięg, który był tam jedyną wartością re-audytu ponad audyt.

**Odrzucenie nie kasuje pracy roli** — osiem pozycji W1, obalenie tezy o niezmienniku
i wyjaśnienie zakresu 81 stoją i są odtworzone. Odrzucam **dowód i zasięg**, nie
istnienie zjawiska. Kolejna fala ma trafić w `README.md` blok „Gdzie co leży"
i podać **trzy** liczby: 137, 89, 19 — oraz nazwać `aai-platnosci` jako nieprawdę
zastaną, nie drift.
