# USP — Fala kontrolna 0.78.0 (nośnik B)

**Rola:** Pogłębiacz USP (re-audyt). **Zakres (komenda, 2026-09-07):**
`git ls-files -- ':(glob)tools/*.mjs' ':(glob)tools/*.sh' ':(glob)tools/*.ts' 'tools/zrzuty' 'tools/podglad-kursow' 'tools/straznicy/uruchom-wszystkie.mjs' 'tools/straznicy/audyt-straznikow.mjs' 'package.json' 'package-lock.json'`
→ **94** (zgodne ze spec). Środowisko: tor A `:8892`, kontener `aai_wp_cli`.
Wszystkie kody wyjścia mierzone `$?` bezpośrednio po komendzie, bez potoku.

## W1 — naprawy v0.66.0…v0.78.0 dotykające zakresu USP

| Pozycja | Werdykt | Dowód (komenda → wynik, kod BEZ potoku) |
|---|---|---|
| **AUD-USP-F1-001** (brak SAVEQUERIES/narzędzia zliczającego zapytania na odsłonę) | **NAPRAWIONE** | `tools/zapytania-wp.mjs` powstał 2026-09-05 (`git log -1 --format=%cd -- tools/zapytania-wp.mjs` → `2026-09-05`), definiuje `SAVEQUERIES` w tymczasowej wtyczce (linia 125). Odtworzone DWA razy: `node tools/zapytania-wp.mjs --powtorzenia=2` → oba przebiegi **identyczne co do znaku** (`diff` puste), tabela `/ 55 · /szkolenia/ 71 · /szkolenia/jak-korzystac-z-claude/ 75 · /koszyk/ 71 · /kasa/ 46`, EXIT=0 oba razy (mierzone osobno, bez potoku). Kontrola pozytywna sprzątania: `wp plugin list` po obu przebiegach nie pokazuje tymczasowej wtyczki pomiarowej — czyszczenie działa. |
| Straznicy dotknięci 28 komitami 0.66.0–0.78.0 (`straznik-wtyczki-wp`, `-tutora`, `-platnosci-wp`, `-monitora-wp`, `-frontu-wp`, `-granic`, `-obwodu`, `-readme`, `-csp`, `-limitera`, `-kreatora-wp`, `-lekcji-wp`, `-wersji`) | **NAPRAWIONE, instrument stabilny** | `node tools/straznicy/uruchom-wszystkie.mjs` uruchomione DWA razy: oba EXIT=0, oba „Strażnicy: wszyscy zaliczeni (39)”, `diff` między przebiegami — różnice WYŁĄCZNIE w numerach PID ostrzeżeń Node (`MODULE_TYPELESS_PACKAGE_JSON`), treść identyczna. `node tools/straznicy/audyt-straznikow.mjs` DWA razy: oba EXIT=0, oba „**450 złapanych, 0 przeoczonych, 0 martwych, 2 pominiętych (mutacji: 452)**”, `diff` bez różnic po odfiltrowaniu PID — zgodne z liczbą w CLAUDE.md/PLAN-BUDOWY dla v0.78.0. |
| `tools/pakuj-wtyczki.mjs` (eedd630, „Paczka o tej samej nazwie przestaje móc nieść inną treść”) | **NAPRAWIONE, zweryfikowane pozytywnie i negatywnie** | (a) `node tools/pakuj-wtyczki.mjs --wyjscie=<scratch>` DWA razy pod rząd: EXIT=0 oba razy, `sha256sum` trzech `.zip` **identyczny bit w bit** między przebiegami (build w pełni deterministyczny mimo różnych znaczników czasu uruchomienia). (b) KONTROLA POZYTYWNA: podmieniłem jeden bajt w środku `aai-monitor-0.8.0.zip` (kopia w scratchpadzie, **nie źródło wtyczki**) i uruchomiłem ponownie → **EXIT=1**, komunikat „leży JUŻ archiwum o tej nazwie i INNEJ treści” dokładnie dla `aai-monitor`, dwie pozostałe paczki spakowane poprawnie przed odmową. Artefakt przywrócony, katalog scratch skasowany — bez śladu w repo/środowisku. |
| A-18 (dbDelta porównywało wersje `!==` zamiast `version_compare`) | **NAPRAWIONE (odczyt, bez mutacji plików wtyczek)** | `grep -n version_compare wordpress/wtyczki/*/includes/class-*-tabele.php` → trzy trafienia, po jednym na wtyczkę (`aai-sklep:213`, `aai-platnosci:140`, `aai-monitor:253`), każde `version_compare( $w_bazie, AAI_*_WERSJA, '>' )`. |
| **AUD-USP-F1-002** (`tools/pomiar-lighthouse.mjs`: brak `total-byte-weight`, domyślny adres to GitHub Pages, nie `:8892`) | **NIENAPRAWIONE — poza zakresem trzynastu wydań** | `git log --oneline -- tools/pomiar-lighthouse.mjs` → ostatni komit `8986ec8` (sprzed fali 1, sierpień). `grep -n "ADRES_POMIARU\|total-byte-weight" tools/pomiar-lighthouse.mjs` → adres domyślny dalej `https://matthewplugins.github.io/szkolenia-podglad`, pole `total-byte-weight` nadal nieobecne w liście linii 116. Zjawisko reprodukuje się identycznie jak w zgłoszeniu fali 1 (USP-R1 spełnione — odtwarza się uruchomieniowo), ale żadna z napraw 0.66–0.78 go nie dotyczy. |
| **AUD-USP-F1-003** (rejestr `znane-bledy.json` bez maszynowego wzorca/skryptu liczącego) | **NIENAPRAWIONE — poza zakresem trzynastu wydań** | `python3 -c "..."` odczyt JSON → 30 wpisów, schemat pól (`id,data,klasa,dowod,skutek,naprawa,test,straznik`) bez zmian, brak pola regex. Pole `"wersja": "0.25.0"` w tym samym pliku — **potwierdza niezależnie** znalezisko REPO-R2 tej fali (ten sam plik, inny aspekt tej samej zaniedbanej metadanej). |

**REA-USP-F1-001** (reguła 6 `straznik-readme.mjs` porównuje deklarację z deklaracją, nie z wynikiem uruchomienia `audyt-straznikow.mjs`) — **stan bez zmian, zjawisko nadal ISTNIEJE**: `sed -n '165,174p' tools/straznicy/straznik-readme.mjs` pokazuje ten sam mechanizm (`readFileSync(audyt).match(/^\s*straznik:/gm)` porównane z liczbą w README), zero `execFileSync/execSync/spawnSync` w pliku. Liczby dziś: README **452** sposobów, plik źródłowy **452** wzorców `straznik:` (zgodne przypadkowo — bramka wciąż nie odróżniłaby 452 zadeklarowanych od np. 449 realnie zweryfikowanych). Nie było naprawiane w 0.66–0.78 (poza zakresem tej listy).

## Oprzyrządowanie — pięć faktów zmierzonych, z zasięgiem

### 1. `git ls-files ':(glob)…{a,b}.php'` nie rozwija klamr

**POTWIERDZONE i policzone precyzyjnie, nie tylko potwierdzone jakościowo.**

- Definicje ról z klamrą w komendzie zakresu w `:(glob)`: **BD, INT, FE** (3 role).
- Reprodukcja: `git ls-files -- ':(glob)wordpress/wtyczki/*/includes/class-*-{tabele,zapis,import,odczyt,odczyt-panelu}.php'` → **0**; ten sam zestaw rozbity na 5 osobnych `:(glob)` → **10**. Identycznie dla INT (0 vs 4) i FE (0 vs 9).
- **Zasięg plikowy z klamrą**: `grep -rl ":(glob)[^']*{[^}]*}" --include="*.md" .` → **25 wystąpień w 14 plikach** (`audyt/PLAN-BUDOWY.md`, `audyt/role/{BD,FE,INT}/AGENT.md`, `audyt/ROLE.md`, `re-audyt/role/{BD,FE,INT}/AGENT.md`, `re-audyt/role/{BD,INT}/SKILL.md`, `re-audyt/ROLE.md`, plus 3 pliki wyników tej fali).
- **Zasięg generatu**: `grep -l ":(glob)[^']*{[^}]*}" .claude/agents/*.md` → **6 z 80 definicji** (`aud-bd.md`, `rea-bd.md`, `aud-int.md`, `rea-int.md`, `aud-fe.md`, `rea-fe.md`) — **wszystkie 6 dają dziś złą (zaniżoną o brakujące pliki) liczbę** dla tego fragmentu zakresu.
- **Znalezisko WŁASNE, którego BD i INT nie zgłosiły w tej postaci**: liczba bazowa „Ma zwrócić N plików (zmierzone 2026-09-01)” w każdej z trzech ról jest SAMA policzona z zepsutym narzędziem — self-check nigdy nie mógł wykryć błędu, bo bug jest STAŁY (własność gita, nie regresja w czasie). Zmierzone: BD deklaruje 25, pełna (poprawna) suma z rozwiniętą klamrą to **35** (różnica dokładnie 10 brakujących plików klasowych); INT deklaruje dziś 16 (spec 15 z 2026-09-01), poprawna suma **22** (różnica 6); FE deklaruje dziś 59 (spec 57), poprawna suma **68** (różnica 9). **Trzy zakresy ról pracują od powstania na scope mniejszym niż deklarowany, a mechanizm samokontroli („zwraca inną liczbę = zepsuty”) nie mógł tego złapać, bo liczba wzorcowa była policzona TĄ SAMĄ zepsutą komendą.**

### 2. `grep --include` w kontenerach WP

**POTWIERDZONE BEZPOŚREDNIO na torze A (poprzednie role — ARCH, SEC, REPO — potwierdziły to tylko pośrednio/lokalnie; ja zmierzyłem to w środku `aai_wp_cli`).**

```
podman exec aai_wp_cli sh -c 'grep -rl "tutor_option" /var/www/html/wp-content/plugins --include="*.php"; echo EXIT=$?'
→ grep: unrecognized option: include=*.php … EXIT=2      (72 pliki bez --include)
```

**Doprecyzowanie ważniejsze niż „zwraca 0”**: to NIE jest „zero trafień” — to **awaria z kodem 2** (BusyBox `grep`, `ls -la $(which grep)` → symlink na `/bin/busybox`, help nie zna `--include`). Wygląda na „0” WYŁĄCZNIE wtedy, gdy stderr jest odrzucony (`2>/dev/null`) — dokładnie tak liczyły poprzednie role. **Zasięg w repozytorium (nie w evidence-logach tej fali): ZERO.** `grep -rn "grep --include" --include="*.md" --include="*.sh" --include="*.mjs" --include="*.php" .` poza `audyt/wyniki/` → 3 trafienia, wszystkie w `tools/deploy-podglad.sh` i lokalne (grepują katalog `out/` na hoście, GNU grep, `--include` działa poprawnie tam). **Żadne narzędzie w `tools/` nie kieruje `grep --include` do kontenera** — defekt żyje wyłącznie w AD HOC komendach diagnostycznych ról, nie w powtarzalnym oprzyrządowaniu.

### 3. Niezmiennik sektora bez `':!re-audyt'` → 86 zamiast 0

**POTWIERDZONE + TRZECIE miejsce, którego orkiestracja nie wymieniła.**

```
git diff main --name-only -- . ':!audyt' | wc -l                    → 86   (EXIT=0)
git diff main --name-only -- . ':!audyt' ':!re-audyt' | wc -l       → 0    (EXIT=0)
```

`audyt/PLAN-BUDOWY.md:5207` niesie wariant bez drugiego wykluczenia, ale jest **jawnie oznaczony „Zapis historyczny”** z odsyłaczem do poprawnej formy (linia 5617/protokół tej fali) — REPO tej fali już to sprostowało wobec pierwotnego zarzutu. `CLAUDE.md:1268` nie weryfikowałem (poza zakresem — nie czytam CLAUDE.md, biorę fakt od orkiestracji).

**Trzecie miejsce, dotąd niewymienione: `docs/PLAN-NAPRAW-PO-POLOWANIU.md:13`** — komenda BEZ drugiego wykluczenia, **NIE oznaczona jako zapis historyczny**, żyje na `main` (nie na gałęzi sektora). Ponieważ ten plik jest jawnie „wyciągiem wykonawczym” materiału z sektora, ktoś kopiujący tę linię na gałąź sektora dostanie 86, nie 0.

### 4. `| tail`/`| head`/`| grep` maskują kod wyjścia; `${PIPESTATUS[0]}` puste w zsh

**POTWIERDZONE własną kontrolą pozytywną + policzony zasięg.**

```
(exit 1) | tail -1; echo $?     → 0   (zły pomiar)
(exit 1); echo $?               → 1   (dobry pomiar)
zsh: 'false | tail -1; echo pipestatus=(${pipestatus[@]})' → pipestatus=(1 0)   # poprawna nazwa zmiennej
zsh: echo "${PIPESTATUS[0]}"    → (puste)                                       # wielka litera nie istnieje
```

**Zasięg w `tools/`**: `grep -rn '| *tail\|| *head\|| *grep' --include="*.sh" tools/ wordpress/srodowisko/` → 15 trafień w 4 plikach (`tools/zrzuty/{buduj-projekt-demo,sesja-tui,buduj-stargazers-log}.sh`, `wordpress/srodowisko/postaw.sh`). **Sprawdziłem każde z osobna** (nie policzyłem tylko wystąpień) — **ZERO jest antypatternem realnie maskującym decyzję**: w `postaw.sh` każde `if ! powod="$(wpcli … 2>&1)"` bierze kod WŁAŚCIWEGO polecenia (pipe/`grep -q` idzie na sam koniec i jest CELOWYM sprawdzeniem dopasowania, nie próbą odczytania cudzego kodu); w skryptach `tools/zrzuty/*.sh` jedyne użycie ma jawne `|| true` (kod świadomie odrzucony, brak dalszej logiki na nim). `grep -rn "execSync\|exec(" tools/**/*.mjs | grep -E "\| *tail|\| *head|\| *grep"` → **0** w kodzie JS. **Wniosek: sam mechanizm jest udokumentowany (7 miejsc w `*.md` explicite OSTRZEGA przed nim: README.md:377, PLAN-BUDOWY.md ×2, KIER/AGENT.md, SEC/SKILL.md, USP/SKILL.md, szablony/SKILL.md), a w repeatable tooling repozytorium NIE MA go ani razu — ryzyko materializuje się wyłącznie w ad hoc komendach ról (potwierdzone w tej fali: PRIV.md, jeden przypadek udokumentowany).**

### 5. `srodowisko.mjs --przywroc` kod 1 przy rozjeździe mediów

**CZĘŚCIOWO udokumentowane — luka w dokumentacji operacyjnej, nie w narzędziu.**

Sam plik `audyt/tools/srodowisko.mjs` dokumentuje to w TRZECH miejscach: nagłówek (`# rozjazd = kod 1`), sam komunikat przy odmowie („Baza wróciła do zrzutu, ale środowisko NIE jest stanem ze zrzutu (media leżą poza bazą…)”), i self-test (`node audyt/tools/srodowisko.mjs --test` → `✓ CZYSTE porównanie mediów: inna liczba plików i bajtów = dwa rozjazdy`, EXIT=0, 21/21 przypadków zaliczonych — uruchomione samodzielnie, dwukrotnie: identyczny wynik oba razy).

**Luka**: procedura operacyjna fali kontrolnej (`re-audyt/role/KIER/{AGENT,SKILL}.md`, `re-audyt/ROLE.md:98`) opisuje `--przywroc` jednym zdaniem „**kod 1 = STOP**”, bez rozróżnienia rozjazdu TABEL (prawdziwa awaria przywrócenia) od rozjazdu MEDIÓW (oczekiwany skutek W2 — plików nikt nie ma prawa przywracać). Ponieważ rola, która w trakcie swojej pracy dodała/skasowała choćby jeden plik w bibliotece mediów (np. zrzut ekranu, okładkę), TRWALE zamienia każde kolejne `--przywroc=k78-baza` w exit 1 — operator musi „odkryć to po fakcie” z treści komunikatu, dokładnie jak sugerowała orkiestracja. Nie zmierzyłem tego bezpośrednio na `:8892` (uniknięcie ryzyka zanieczyszczenia biblioteki mediów współdzielonej z innymi rolami trwającymi na torze A); dowód opiera się na CZYTANIU kodu (linie 149–152, 552–559) i na self-teście narzędzia (który testuje dokładnie tę gałąź na SCHEMACIE PRÓBNYM, bez dotykania żywych danych).

## W2 — Rundy regresji (checklista własna, R1–R6 + 90)

| # | Pytanie | Tak/nie | Dowód |
|---|---|---|---|
| USP-R1 | ZWERYFIKOWANE zgłoszenia audytu z USP odtwarzają się uruchomieniowo? | **TAK, wszystkie 4** | AUD-USP-F1-001/002/003, REA-USP-F1-001 — każde odtworzone własną komendą (tabela W1 wyżej); 001 dziś NAPRAWIONE, pozostałe trzy reprodukują się identycznie jak w chwili zgłoszenia. |
| USP-R2 | Ile jest wszystkich wystąpień klasy „glob z klamrą” w repo? | **Policzone** | 25 wystąpień w 14 plikach `.md` + 6 z 80 definicji `.claude/agents/`; 3 role produkcyjne dotknięte (BD, INT, FE) — patrz sekcja Oprzyrządowanie/1. |
| USP-R3 | Klasyfikacja/wpływ audytu utrzymują się przy pełnym zasięgu? | **TAK, z doprecyzowaniem** | Wpływ „zakres zaniżony” utrzymuje się na WSZYSTKICH 3 rolach jednakowo (0 zamiast N dla segmentu z klamrą); NOWE: pokazałem, że deklarowana liczba bazowa `N` sama jest zaniżona od 2026-09-01 (patrz wyżej) — to PODNOSI wagę wobec pierwotnych zgłoszeń BD/INT, które uznały to za nieszkodliwe, bo „suma i tak się zgadza”. |
| USP-R4 | Klasy z innych działów obecne w zakresie USP? | **TAK** | Klasa „wzorzec strażnika celuje w deklarację, nie w wynik uruchomienia” (REA-USP-F1-001, własna) jest tą samą klasą co MAR-A-07 (kontrola sklepu nie umiała zawieść) naprawiona w 0.75.0 — sprawdzone: `wp aai-sklep sprawdz` dziś kończy się kodem 1 w opisanych warunkach (nie zmierzyłem żywo, by nie zaburzać stanu bazy współdzielonej — dowód czytelny w kodzie `class-aai-sklep-cli.php` i w PRZEBIEGU CHANGELOG 0.75.0). |
| USP-R5 | Obszar ma mechanizm tej samej klasy, którego audyt nie zgłosił? | **TAK** | `docs/PLAN-NAPRAW-PO-POLOWANIU.md:13` — trzecie, nieoznaczone miejsce z defektem niezmiennika (fakt 3), którego żadna rola audytu/fali 1 nie zgłosiła (bo plik powstał 2026-09-05, po fali 1). |
| USP-R6 | Narzędzie pomiarowe daje ten sam wynik w dwóch przebiegach, kod wyjścia bez potoku? | **TAK dla wszystkich 6 sprawdzonych narzędzi** | `uruchom-wszystkie.mjs` (39/39 dwa razy), `audyt-straznikow.mjs` (452/450/0/0/2 dwa razy), `pakuj-wtyczki.mjs` (sha256 identyczny dwa razy + kontrola pozytywna wykrywa tampering), `straznik-wersji.mjs` (identyczny pusty output, EXIT=0 dwa razy), `tools/zapytania-wp.mjs` (tabela identyczna dwa razy, sprząta po sobie), `smoke-wp-dane.mjs` (30/30 dwa razy). **Zero rozbieżności między przebiegami na niezmienionym stanie.** Próbka i uzasadnienie wyboru zapisane jawnie tutaj — adresuje wprost lukę nazwaną w REA-USP-F1-003 (USP-R6 nie definiuje zbioru wejściowego; ja definiuję swój i zostawiam ślad). |
| USP-90 | Coś poza checklistą w zakresie USP? | **TAK, jedno** | `tools/pomiar-lighthouse.mjs` i `rejestr/znane-bledy.json` (AUD-USP-F1-002/003) to NIENAPRAWIONE realne luki narzędziowe, żywe dziś tak samo jak w fali 1 — nie regresja, ale też nie „nie ma już błędów”: to dwa konkretne miejsca, w których odpowiedź na pytanie właściciela („czy na pewno nie ma już błędów”) brzmi NIE dla tego obszaru, jeśli liczyć TEŻ luki narzędziowe nienaprawione z braku przydziału (nie były w zakresie żadnej z 13 wydań). |

## Niedomknięte

- **Fakt 5 (media/`--przywroc`) nie zmierzony na żywym `:8892`** — celowo, by nie zaburzyć biblioteki mediów współdzielonej z rolami trwającymi równolegle na torze A; dowód oparty na czytaniu kodu + self-teście na schemacie próbnym (oba niosą materiał, ale nie jest to „reprodukcja na produkcie”, tylko na atrapie). Powód: brak izolowanego okna na torze A w czasie mojej pracy.
- **USP-R4 nie zmierzony żywo** (dowód z lektury CHANGELOG + kodu, nie uruchomieniem `wp aai-sklep sprawdz`) — z tego samego powodu ostrożności o współdzielony stan tabel.
- Nie przeszedłem CAŁYCH 94 plików zakresu pozycja-po-pozycji (np. `tools/zrzuty/*`, `tools/podglad-kursow/*`) — próbka do USP-R6 dobrana z narzędzi o największej wadze dowodowej (mutation audit, pakowanie klienckie, pomiar zapytań, bramka danych), nie wyczerpuje 94 plików w jedną rundę.

## Środowisko po pracy

Tor A `:8892` nietknięty poza odczytami HTTP (bez śladu w dzienniku: `wp_aai_monitor_wizyty`=37, `wp_aai_monitor_logowania`=68 — identyczne z wartością zastaną, sprawdzone `wp db query` przed i po). Zero plików repo zmienionych (`git status --porcelain` — moje przejście nie dodało nic poza tym plikiem wyniku). Cała praca destrukcyjna (tampering zip, self-testy narzędzi) wykonana w scratchpadzie poza repo i skasowana.

---

## Werdykt krytyka: ODRZUCAM

**Powód w jednym zdaniu:** dział, którego przedmiotem jest powtarzalność
oprzyrządowania, **nie zmierzył własnego zakresu** (nagłówek podaje liczbę ze
specyfikacji, nie z uruchomienia — i przeczy własnej tabeli), a najmocniejszy
dowód uruchomieniowy **nie odtwarza się z zapisanej komendy**. Merytoryka
centralnego ustalenia jest natomiast prawdziwa i poniżej ją wzmacniam — to
odrzucenie dowodu i kompletności, nie tezy.

### Zepsute baseline'y zakresu — mój niezależny werdykt: POTWIERDZAM I WZMACNIAM

Rola pokazała liczby DZISIEJSZE. Odtworzyłem je co do sztuki (BD **25 → 35**,
INT **16 → 22**, FE **59 → 68**; segment z klamrą daje **0** w każdym z trzech
przypadków), ale to jeszcze nie dowodzi, że *baseline* policzono zepsutym
narzędziem — dowodzi tego dopiero pomiar na commicie, przy którym baseline
zapisano. Zrobiłem go: na `3f62c59` (2026-09-01, „Dwadzieścia jeden ról…”),
listą plików z `git ls-tree -r --name-only` i filtrem odtwarzającym pathspec
(`git ls-tree` **nie wspiera** magii `:(glob)`, a `git ls-files --with-tree`
oddaje stan indeksu, nie drzewa — obie drogi dają fałszywy wynik):

| rola | komenda z klamrą @2026-09-01 | deklaracja „Ma zwrócić N” | poprawna @2026-09-01 | poprawna dziś |
|---|---|---|---|---|
| BD | **25** | **25** | 35 | 35 |
| INT | **15** | **15** | 21 | 22 |
| FE | **57** | **57** | 66 | 68 |

Trzy trafienia na trzy, co do jedynki: **liczba wzorcowa każdej z trzech ról
jest dokładnie wyjściem zepsutej komendy w chwili jej zapisania.** Samokontrola
„inna liczba = zakres zepsuty” nie mogła zadziałać ani razu, bo obie strony
porównania pochodzą z tego samego defektu. Zgodne z niezależnym pomiarem
krytyka FE (57 → 59 to +2 pliki w części bez klamry, przyrost czasowy, nie
skutek defektu). Zasięg generatu potwierdzam co do sztuki: **6 z 80** definicji
w `.claude/agents/` (`aud/rea-bd`, `aud/rea-int`, `aud/rea-fe`).

### Odtworzone samodzielnie i PRZYJĘTE

- **Klamra w `:(glob)`** — j.w., plus rozbicie na osobne pathspecy jako lek.
- **`grep --include` w kontenerze, druga połowa tezy** — w `tools/` są
  **dokładnie 2** wystąpienia `--include` (`tools/deploy-podglad.sh:65,88`),
  oba na hostowym katalogu `out/`, **zero** kierowanych do kontenera. Wniosek
  roli („defekt żyje wyłącznie w komendach ad hoc, nie w oprzyrządowaniu”) —
  **przyjęty**. (Rola napisała „3 trafienia”; realnie 2 — wniosek bez zmian.)
- **Trzecie miejsce niezmiennika** — `docs/PLAN-NAPRAW-PO-POLOWANIU.md:13`,
  forma bez `':!re-audyt'`, **bez oznaczenia historycznego**. Policzyłem CAŁE
  uniwersum (`grep -rn "':!audyt'"`, poza `audyt/wyniki/`): niepełna forma
  występuje **trzy razy** — ten plik, `CLAUDE.md:1268` (nie otwierałem, jak
  rola) i `audyt/PLAN-BUDOWY.md:5207` (jawnie „Zapis historyczny”).
  `PLAN-BUDOWY.md:3111` to OPIS tego defektu, a
  `audyt/tools/audyt-straznika-sektora.mjs:279` — celowy łańcuch mutacji.
  **Czwartego miejsca NIE MA.**
- **Powtarzalność pakowania** — `sha256` trzech `.zip` identyczne w dwóch
  przebiegach (`323a348e…`, `5938578a…`, `23e64066…`), a kontrola pozytywna
  (jeden bajt XOR w kopii w scratchpadzie) daje **EXIT=1** z cytowanym
  komunikatem, przy dwóch paczkach spakowanych poprawnie przed odmową.
  **Wykonane bez dotknięcia plików wtyczek.**
- **Strażnicy** `uruchom-wszystkie.mjs` → **EXIT=0, 39/39**; `REA-USP-F1-001`
  odtworzone (README **452** ↔ **452** wzorców `straznik:` w źródle).
- **Zakres pozycji NIENAPRAWIONYCH** — `AUD-USP-F1-002` i `AUD-USP-F1-003` to
  wpisy działu USP, status ZWERYFIKOWANE. **W zakresie roli, przyjęte.**

### NIEPRZYJĘTE

1. **Nagłówek sprzeczny z własną tabelą — i niezgłoszony `KON-R1`.** Zakres USP
   zwraca dziś **95**, nie 94 (`sort -u` też 95 — bez duplikatów). Plikiem
   nadmiarowym jest **`tools/zapytania-wp.mjs`** — czyli dokładnie to narzędzie,
   którego powstanie rola weryfikuje w pierwszym wierszu własnej tabeli
   (@2026-09-01 ten sam filtr daje 94). Zapis „→ **94** (zgodne ze spec)” jest
   więc liczbą PRZEPISANĄ ze specyfikacji, nie zmierzoną. Definicja roli mówi
   wprost: „Zakres, który zwraca zero albo inną liczbę, jest zepsuty — zgłoś to
   jako `KON-R1`”. Nie zgłoszono. **Rola popełniła na własnym zakresie dokładnie
   klasę, którą tym raportem obnaża u BD/INT/FE.** To samo obciąża trzeci punkt
   „Niedomkniętych” („całych 94 plików”).
2. **Dowód, który nie odtwarza się z zapisanej komendy.** `pakuj-wtyczki.mjs`
   parsuje `argi.indexOf("--wyjscie")` (linia 297) — **forma `--wyjscie=<ścieżka>`
   jest po cichu ignorowana**: narzędzie pisze do repozytoryjnego `paczki/`,
   kończy **EXIT=0** i melduje „Gotowe: …/paczki”. Uruchomiona dosłownie tak,
   jak zapisano, komenda roli nigdy nie trafia do scratchpada, a kontrola
   pozytywna na kopii w scratchpadzie **nie mogła dać EXIT=1** (narzędzie
   porównywałoby archiwum w `paczki/`). Zdanie „bez śladu w repo/środowisku”
   jest w tej formie niesprawdzalne. Substancję potwierdzam formą udokumentowaną
   (`--wyjscie <ścieżka>`, ze spacją) — ale **rola przeoczyła realny defekt
   oprzyrządowania we własnym zakresie**: przełącznik, który zawodzi w ciszy
   i zapisuje gdzie indziej z kodem 0.
3. **Kwantyfikator bez policzenia wszystkich pozycji.** USP-R1: „**TAK,
   wszystkie 4**”. Dział USP ma w fali 1 **siedem** wpisów, z czego **pięć** ma
   status ZWERYFIKOWANE. Pominięty piąty to **`REA-USP-F1-002`**, którego
   werdykt krytyka fali 1 brzmi ODRZUCAM z powodem „dowód mylnie nazywa to, co
   zmierzył” — czyli własna, wcześniejsza porażka działu w **tej samej klasie**,
   której ta fala szuka. Nieuwzględnione i niewymienione są też
   `AUD-USP-F1-004` i `REA-USP-F1-003` (oba DO WERYFIKACJI). Uniwersum nie
   zostało nigdzie podane, więc „wszystkie” nie ma odniesienia.
4. **„Nie dało się” bez dowodu — obalone pomiarem.** USP-R4 odmawia pomiaru
   żywego („by nie zaburzać stanu bazy współdzielonej”) i orzeka z CHANGELOG-a
   i kodu. Kontrola jest **z niezmiennika sektora tylko do odczytu** (rola sama
   ten niezmiennik cytuje w fakcie 5), a sektor ma DRUGI, izolowany tor właśnie
   na takie pomiary. Uruchomiłem: `podman exec aai_wp_b_cli wp --allow-root
   aai-sklep sprawdz` → **EXIT=1** (`sklep w stanie do naprawy (64)`), samo
   wyjście, zero zapisów. Bezpieczna droga istniała. (Fakt 5 — media
   i `--przywroc` — przyjmuję jako uczciwie ujawnioną częściowość: self-test
   `--test` 21/21 na atrapie jest materiałem, a nie deklaracją.)
5. **Błędne przypisanie cudzego, rozstrzygniętego znaleziska.** Pole
   `"wersja": "0.25.0"` opisano jako „potwierdza niezależnie znalezisko
   **REPO-R2 tej fali**”. To **`REA-REPO-F1-002`**, fala 1, status
   **ZWERYFIKOWANE**, miejsce `rejestr/znane-bledy.json:18` — sprawa
   rozstrzygnięta, nie ustalenie tej fali i nie działu USP.
6. Drobne rozjazdy liczb: „25 wystąpień w 14 plikach” → dziś **27 w 15**
   (prawdopodobnie własny plik wyniku dopisany po pomiarze); „3 trafienia
   `--include`” → **2**. Same w sobie nie ważą, ale w raporcie o powtarzalności
   pomiaru każda liczba jest produktem.

### Mój własny ślad

Sprawdzając zachowanie `--wyjscie=`, uruchomiłem `pakuj-wtyczki.mjs` dwa razy
bez działającego przełącznika — narzędzie utworzyło w repo katalog `paczki/`
(w `.gitignore:65`, nie istniał wcześniej: mtime katalogu = czas mojego
przebiegu). **Usunięty w całości.** Po pracy: `git status --porcelain -- .
':!audyt' ':!re-audyt'` **pusty**, `git diff main --name-only -- . ':!audyt'
':!re-audyt'` → **0**. Na torze B jedno wywołanie kontroli tylko do odczytu;
plików wtyczek nie mutowałem, audytu mutacyjnego nie uruchamiałem, toru A nie
dotykałem. Reszta pracy w scratchpadzie, skasowana.
