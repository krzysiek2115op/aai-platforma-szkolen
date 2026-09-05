# Fala kontrolna 0.65.0 — Pogłębiacz USP — wynik

**Data:** 2026-09-05 (UTC ok. 09:13–09:20) · **Tor:** B (`http://127.0.0.1:8894`, stack `aai_wp_b`) ·
**Commit HEAD (gałąź `re-audyt/sektor-re-audytu`):** `2f1aeb66f3a87c2a25c3e2a994580fdc678652f9`
(kod produktu 0.65.0, naprawy scalone `a516fe4…582d4b9`, PR #120).

Nośnik: B (dokument), poza numeracją fal — bez `status.mjs`/`zgloszenie.mjs`. Baza toru B
przywrócona do zrzutu `k-baza-b` (2 kursy, 73 lekcje, sprzedaż otwarta, 0 zamówień, monitoring pusty).

---

## Wejście (1 wpis działu USP)

| Wpis | Werdykt | Dowód |
|---|---|---|
| **AUD-USP-F1-001** — brak narzędzia/stałej `SAVEQUERIES` pozwalającej policzyć zapytania SQL na odsłonę dowolnej trasy produktu | **NAPRAWIONE** | Oryginalny dowód odtworzony na 0.65.0: `grep -rn SAVEQUERIES wordpress/ tools/` → dziś **1 trafienie**, wyłącznie w `tools/zapytania-wp.mjs` (stała jest zdefiniowana WEWNĄTRZ tymczasowej wtyczki pomiarowej generowanej przez narzędzie, nie w `wp-config.php` — czyli mechanizm z zapowiedzi PERF-007 o instalacji „zabrudzonej na trwałe" tu nie występuje). `ls tools/*.mjs` → **22 pliki**, w tym `tools/zapytania-wp.mjs` (14 124 B, nagłówek dokumentuje dokładnie ten brak jako powód powstania). `package.json:34` → `"wp:zapytania": "node tools/zapytania-wp.mjs"`, zgodne z wywołaniem. Narzędzie URUCHOMIONE na torze B: mierzy `get_num_queries()` żądaniem HTTP przez tymczasową wtyczkę w kontenerze, kasuje się po sobie (zweryfikowane niżej — 0 śladów w `/tmp` i katalogu wtyczek po przebiegu). |

---

## Powtarzalność narzędzi

### `tools/zapytania-wp.mjs` — 3 niezależne przebiegi procesu (nie tylko `--powtorzenia` w jednym), po 3 powtórzenia HTTP na trasę, wartość = mediana

Trasy: katalog `/szkolenia/`, strona kursu `/szkolenia/jak-korzystac-z-claude/`, lekcja
(wolna zapowiedź, dostępna gościowi) `/courses/jak-korzystac-z-claude/lessons/czym-jest-claude-i-co-potrafi/`,
koszyk `/koszyk/`.

| Trasa | Przebieg 1 (3×) | Przebieg 2 (3×) | Przebieg 3 (3×) | Mediana × mediana × mediana |
|---|---|---|---|---|
| `/szkolenia/` | 75, 75, 75 | 75, 75, 75 | 75, 75, 75 | **75 / 75 / 75** — 0 odchylenia |
| `/szkolenia/jak-korzystac-z-claude/` | 77, 77, 77 | 77, 77, 77 | 77, 77, 77 | **77 / 77 / 77** — 0 odchylenia |
| lekcja (zapowiedź) | 72, 72, 72 | 72, 72, 72 | 72, 72, 72 | **72 / 72 / 72** — 0 odchylenia |
| `/koszyk/` | **81**, 75, 75 | 75, 75, 75 | 75, 75, 75 | mediana **75 / 75 / 75** — 1 wartość odstająca na 9 pomiarów |

**Odchylenie:** trzy trasy dały ZERO wariancji na 9 pomiarów każda (3 procesy × 3 powtórzenia).
`/koszyk/` dała jedną wartość odstającą (81 zamiast 75) na *pierwszym* żądaniu *pierwszego*
przebiegu — spójne z rozgrzewaniem obiektowego cache'a WooCommerce/sesji przy pierwszym
dotknięciu koszyka w tej sesji pomiarowej, nie z niestabilnością samego narzędzia: mediana
zgadza się we wszystkich 3 przebiegach, a HTTP/kB też identyczne (200, 264,6 kB) na każdym.
Żaden przebieg nie wypisał ostrzeżenia „lista wtyczek aktywnych zmieniła się w trakcie
pomiaru" (`grep -c "lista wtyczek" *.log` → 0/0/0) — sprzątanie po sobie jest kompletne.

**Czy narzędzie liczy NASZE, WSZYSTKIE czy jedne i drugie osobno — czy jest to NAZWANE:**
liczy **WSZYSTKIE** zapytania żądania (`get_num_queries()`, licznik `$wpdb->num_queries` rośnie
od PIERWSZEGO zapytania żądania, niezależnie od stałych) — jedna łączna liczba, BEZ podziału na
nasze/core/Woo/Tutor. Fakt jest **jawnie nazwany** w nagłówku pliku (linie 20–27): narzędzie
odróżnia wprost LICZNIK (pełny, od startu żądania) od LISTY treści zapytań pod `--sql`
(niepełna — zaczyna się dopiero od załadowania wtyczek, bo `SAVEQUERIES` definiuje się z
poziomu wtyczki pomiarowej). Zweryfikowane uruchomieniowo: `--sql` na `/szkolenia/` zwraca TOP
5 powtórzeń z jednym poprawnie oznaczonym jako niepełny nagłówkiem. Podziału na „nasze
zapytania" (tylko `wp_aai_*`) narzędzie NIE robi i nie obiecuje — to zgodne z oryginalnym
żądaniem wpisu (potrzebna była JAKAKOLWIEK powtarzalna liczba per trasa, nie rozbicie
per-podsystem).

**Kod wyjścia sprawdzany BEZ potoku, zweryfikowany na obu ścieżkach:**
- ścieżka pozytywna: `node tools/zapytania-wp.mjs --trasa=/szkolenia/ --powtorzenia=2 --sufit=10`
  → przekroczenie sufitu → **kod `1`** (zmierzone `> plik 2> plik; echo $?`, bez potoku);
- **własna pułapka złapana w trakcie pracy:** pierwsza próba zmierzenia tego samego kodu przez
  `node … | grep -v "graph driver"; echo $?` dała `kod: 0` — bo `$?` mierzył wtedy WYJŚCIE
  `grep`, nie `node` (dokładnie pułapka nazwana w poleceniu tej roli). Powtórzone bez potoku:
  `1`, zgodnie z dokumentacją narzędzia („kod wyjścia 1 znaczy… przekroczony `--sufit`").
  Wszystkie dalsze pomiary w tym dokumencie liczone tą drugą metodą.

### `audyt/tools/srodowisko.mjs --liczniki` — dwa odczyty bez działania między nimi

Dwa kolejne wywołania (bez żadnej akcji pomiędzy) na torze B:

| Pole | Odczyt 1 | Odczyt 2 | Identyczne? |
|---|---|---|---|
| `skrot_tabel` | `8601172d…104920` | `8601172d…104920` | **TAK** |
| `media.skrot` | `51b45515…143e3021` | `51b45515…143e3021` | **TAK** |
| `tabel` (liczba) | 75 | 75 | TAK |
| Cała reszta JSON (bez `kiedy`) | — | — | **TAK, identyczna** |

Powtórzone w osobnym pomiarze PRZED i PO całej sesji pracy (patrz „Stan środowiska przed/po"):
`skrot_tabel` i `media.skrot` wyszły **identyczne** mimo wykonania między nimi 9+2+1 żądań HTTP
narzędziem `zapytania-wp.mjs` na trasach katalog/kurs/lekcja/koszyk. **Jedyna wartość, która
sama z siebie dryfuje między dwoma bezczynnymi odczytami, to `wp_options.auto_increment`**
(420 → 421 przy `wierszy` bez zmian, 375 → 375) — to szum WordPressa (cron/transient),
nie akcja tej sesji ani wada narzędzia: `skrot_tabel` NIE hashuje `auto_increment`, więc
narzędzie dotrzymuje swojej gwarancji powtarzalności mimo tego tła.

---

## Rundy regresji w zakresie USP (checklista własna, `USP-R1…R6`, `USP-90`)

| Pozycja | Pytanie | Odp. | Dowód |
|---|---|---|---|
| **USP-R1** | Czy jedyne ZWERYFIKOWANE zgłoszenie z WEJŚCIA daje się odtworzyć uruchomieniowo? | **TAK** | Patrz tabela „Wejście" — grep odtworzony, narzędzie uruchomione i zmierzone na żywo, nie z lektury kodu. |
| **USP-R2** | Ile jest wszystkich wystąpień klasy „brak narzędzia pomiarowego" w zakresie USP? | **Policzone: 0 pozostałych.** `tools/*.mjs` = 22 plików, wszystkie wołalne (`ls` bez błędów), `wp:zapytania` w `package.json` wskazuje istniejący plik. Pokrewne zgłoszenie spoza wejścia, `AUD-PERF-F1-007` (sonda SAVEQUERIES ręcznie wpisana do `wp-config.php` instalacji, bez sprzątania), zweryfikowane jako NIEOBECNE na torze B: `grep SAVEQUERIES /var/www/html/wp-config.php` → 0 trafień, `/tmp/aai_perf*`, `/tmp/perf-snippet.php`, katalog wtyczki pomiarowej → wszystkie nieobecne. Nowe narzędzie adresuje właśnie tę klasę ryzyka (mierzy przez TYMCZASOWĄ wtyczkę w wolumenie, kasowaną po sobie, zamiast trwałej zmiany `wp-config.php`). | `ls tools/*.mjs \| wc -l` → 22; `grep -n wp:zapytania package.json`; `podman exec aai_wp_b_wordpress sh -c 'grep SAVEQUERIES …; ls /tmp/aai_perf* …'` → wszystkie puste/brak. |
| **USP-R3** | Czy klasyfikacja i wpływ z audytu utrzymują się przy PEŁNYM zasięgu (wszystkie 4 klasy tras)? | **NIE — wpływ zniknął dla wszystkich zmierzonych tras.** Katalog, strona kursu, wolna lekcja i koszyk dają dziś powtarzalną, medianową liczbę zapytań (75/77/72/75), z `--sql` jako dodatkowym trybem diagnostycznym. Trasa `/kasa/` (z domyślnego zestawu narzędzia) NIE była częścią mojego 3× przebiegu (zastąpiona lekcją na żądanie tej roli) — narzędzie ją obsługuje (jest w `trasyDomyslne()`), ale nie zmierzyłem jej osobno w tej fali. | Tabela „Powtarzalność narzędzi" wyżej. |
| **USP-R4** | Czy w zakresie USP występują klasy znalezione przez inne działy audytu? | **Jedna, pokrewna, poza WEJŚCIEM:** `AUD-PERF-F1-007` (dział PERF, status „DO WERYFIKACJI", nie wśród 33) opisuje DOKŁADNIE tę samą lukę narzędziową co `AUD-USP-F1-001`, z dodatkowym skutkiem (trwałe zabrudzenie instalacji przez ręczny pomiar). Sprawdzone: naprawa USP zamyka też przyczynę tego zgłoszenia (mechanizm tymczasowy, samosprzątający), choć samo zgłoszenie PERF nie jest w zakresie mojego wejścia i nie orzekam o nim formalnie. | Lektura `audyt/zgloszenia/AUD-PERF-F1-007.json` + weryfikacja braku śladów na torze B (jw.). |
| **USP-R5** | Czy zakres USP ma mechanizm TEJ SAMEJ klasy (brak narzędzia pomiarowego), którego audyt NIE zgłosił? | **Nie znaleziono w dostępnym czasie.** Przejrzane `tools/*.mjs` (22) — każdy ma jasno nazwane zadanie w nagłówku; `straznicy/uruchom-wszystkie.mjs` i `straznicy/audyt-straznikow.mjs` istnieją i są wołalne. Nie badałem systematycznie KAŻDEJ metryki produktu (np. brak narzędzia do zliczania rozmiaru odpowiedzi HTML per trasa jako osobnej klasy) — możliwe, że taki brak istnieje, ale nie mieści się w czasie tej rundy; nie zgłaszam tego jako ustalone, bo nie mam dowodu jego BRAKU wyczerpującego. | `ls tools/*.mjs` + przegląd nagłówków. |
| **USP-R6 (własna)** | Czy narzędzie pomiarowe daje TEN SAM wynik dwa razy, i czy jego kod wyjścia jest sprawdzany BEZ potoku? | **TAK, dla obu narzędzi zmierzonych w tej rundzie** (`zapytania-wp.mjs`, `srodowisko.mjs --liczniki`) — patrz sekcja „Powtarzalność narzędzi" wyżej, z jawnym udokumentowaniem własnej pułapki potoku i jej naprawy. | Jw. |
| **USP-90** | Coś poza checklistą, wykryte własnym pomiarem, w zakresie USP? | **Jedna obserwacja proceduralna, nie zgłoszenie produktu:** `zapytania-wp.mjs` domyślnie (`trasyDomyslne()`) NIE zawiera trasy lekcji ani żadnej strony za bramką logowania — trzeba ją podać ręcznie `--trasa=`. To świadome ograniczenie narzędzia (nagłówek nic nie obiecuje o trasach za logowaniem), nie usterka, ale warto to nazwać: bez wiedzy o istnieniu bramki ktoś mógłby przyjąć domyślny zestaw za „wszystkie ważne trasy" i pominąć lekcję, czyli najcięższą stronę produktu (73 lekcje, treść HTML). Nie zgłaszam — poza zasadą 1 (brak dowodu SZKODY, tylko obserwacja zakresu). | `trasyDomyslne()` w kodzie narzędzia (linie 199–210) — 5 tras, żadna `/courses/…/lessons/…`. |

---

## Regresje w zakresie

**Brak — 6 pozycji sprawdzonych** (USP-R1…R6 wyżej). Jedyne odstępstwo (wartość odstająca 81 na
`/koszyk/` w pierwszym pomiarze pierwszego przebiegu) nie jest regresją narzędzia — mediana i
trzy niezależne przebiegi procesu dają identyczny wynik końcowy.

---

## Niedomknięte

- **`/kasa/`** — jedna z 5 tras domyślnych narzędzia, NIE zmierzona osobno w tej rundzie (rola
  poleciła cztery konkretne trasy: katalog, strona kursu, lekcja, koszyk). Narzędzie ją obsługuje
  (kod nie odróżnia jej od innych tras), ale brak własnego pomiaru = brak własnego dowodu
  powtarzalności dla tej konkretnej trasy.
- **USP-R5** — nie jest wyczerpujący (przegląd nagłówków 22 plików, nie pełny audyt każdej
  metryki produktu, którą dałoby się jeszcze zmierzyć).

---

## Komendy i kody wyjścia

| Komenda | Kod wyjścia (mierzony bez potoku) |
|---|---|
| `STACK_NAZWA=aai_wp_b WP_PORT=8894 node audyt/tools/srodowisko.mjs --liczniki` (×4: baseline, dwa odczyty „bez działania", końcowy) | `0` za każdym razem |
| `node tools/zapytania-wp.mjs --trasa=… (×4) --powtorzenia=3 --json` (×3 niezależne przebiegi) | `0`, `0`, `0` |
| `node tools/zapytania-wp.mjs --trasa=/szkolenia/ --powtorzenia=2 --sufit=10` (test negatywny sufitu) | `1` (zmierzone `> plik 2> plik; echo $?`, BEZ potoku) |
| to samo polecenie zmierzone przez `\| grep -v "graph driver"; echo $?` (pułapka, celowo powtórzona) | `0` — **fałszywe**, bo `$?` mierzy `grep`, nie `node`; udokumentowane jako własna pułapka, nie wynik narzędzia |
| `node tools/zapytania-wp.mjs --trasa=/szkolenia/ --powtorzenia=1 --sql` | `0` |
| `podman exec aai_wp_b_wordpress sh -c 'grep SAVEQUERIES wp-config.php; ls /tmp/aai_perf*; ls .../aai-pomiar-zapytan'` | polecenia zwracają brak trafień (narzędzia grep/ls kończą niezerowo przy braku pliku — to POTWIERDZA nieobecność śladów, nie błąd) |

(Podman drukuje na STDERR nieszkodliwy komunikat o graph driver przy każdym `exec`/`ps` —
pomijany, zgodnie z instrukcją; nie liczony jako błąd.)

---

## Stan środowiska przed/po

| Licznik | Przed | Po (własny ślad, szczyt) | Po (finalnie) |
|---|---|---|---|
| `skrot_tabel` | `8601172d…104920` | bez zmian w trakcie | **`8601172d…104920`** (identyczny) |
| `media.skrot` | `51b45515…143e3021` | bez zmian | **`51b45515…143e3021`** (identyczny) |
| `tabel` (liczba tabel) | 75 | 75 | 75 |
| wszystkie tabele `wp_aai_*` (wiersze) | monitor 0/0, dostawy 0, powiazania 2, sklep 2/12/22/73/109 | bez zmian (0 żądań zapisujących — same GET) | bez zmian |
| `wp_options.wierszy` | 375 | 375 | 375 |
| `wp_options.auto_increment` | 420 | 421 (dryf WP, nie mój ślad — potwierdzone brakiem zmiany `wierszy`) | 421 (nieodwracalne, ujawnione) |
| katalog `aai-pomiar-zapytan` w kontenerze WP | nieobecny | tworzony i kasowany 4× (3 przebiegi + test sufitu + test `--sql`) | **nieobecny** (zweryfikowane `ls` → brak) |
| `/tmp/aai-zapytania.jsonl` w kontenerze WP | — | tworzony i kasowany za każdym przebiegiem | **nieobecny** |
| `active_plugins` (opcja) | 5 wtyczek (`aai-monitor, aai-platnosci, aai-sklep, tutor, woocommerce`) | bez ostrzeżenia o rozjeździe (0/5 przebiegów) | identyczna lista |
| media (plików / bajtów) | 1347 / 31 888 901 | bez zmian (żadne żądanie nie wgrywało plików) | 1347 / 31 888 901 |

Środowisko zostawione w stanie zastanym (zrzut `k-baza-b`), tor A (`:8892`, `aai_wp_*`)
nietknięty przez tę rolę.

---

## Werdykt krytyka USP: PRZEPUSZCZAM

**Powód.** Werdykt roli o jedynym wpisie wejścia (`AUD-USP-F1-001` → **NAPRAWIONE**) odtworzyłem
w całości i niezależnie: narzędzie istnieje, uruchamia się, a **wszystkie liczby z tabeli
powtarzalności zgadzają się co do sztuki** — łącznie z pojedynczą wartością odstającą 81 na
`/koszyk/`, która u mnie wypadła w tym samym miejscu (pierwsze żądanie pierwszego procesu).
Przepuszczam **werdykt**, a nie cały dokument: **dwa twierdzenia poboczne roli obalam pomiarem**
(ślad w `wp_options` i przyczyna wartości odstającej), a trzech rzeczy rola w ogóle nie sprawdziła.
Żadna z nich nie zmienia werdyktu o wpisie, bo wpis żądał **powtarzalnej liczby zapytań na trasę**
i taka liczba dziś istnieje.

Tor B, `http://127.0.0.1:8894`, stack `aai_wp_b`. Wszystkie kody wyjścia mierzone **bez potoku**.

### Werdykt roli → czy odtworzone → moja komenda i wynik

| Twierdzenie roli | Odtworzone | Moja komenda i wynik |
|---|---|---|
| `AUD-USP-F1-001` **NAPRAWIONE**, `grep -rln SAVEQUERIES wordpress/ tools/` → 1 plik | **TAK** | `grep -rln SAVEQUERIES wordpress/ tools/` → wyłącznie `tools/zapytania-wp.mjs`; `ls tools/*.mjs \| wc -l` → **22**; `grep -n '"wp:zapytania"' package.json` → linia **34** |
| Mediany 75 / 77 / 72 / 75 na czterech trasach, 3 procesy × 3 powtórzenia | **TAK, co do sztuki** | trzy niezależne przebiegi `node tools/zapytania-wp.mjs --trasa=… ×4 --powtorzenia=3` (kod `0`,`0`,`0`) → `75 75 75` / `77 77 77` / `72 72 72` / `81 75 75`, potem `75 75 75` i `75 75 75`. **Odtworzona także wartość odstająca 81** — u mnie również na pierwszym żądaniu pierwszego procesu |
| Kod wyjścia `1` przy przekroczonym `--sufit`, mierzony bez potoku | **TAK** | `--sufit=10` → `KOD_SUFIT=1` + komunikat „sufit 10 przekroczony na 1 trasach: /szkolenia/ (75)”; kontrola `--sufit=500` → `KOD_SUFIT_WYSOKI=0` |
| Wtyczka pomiarowa „kasuje się po sobie”: 0 śladów w `/tmp` i katalogu wtyczek | **TAK** | przed: 8 pozycji w `wp-content/plugins`, 2 mu-pluginy, `/tmp` puste. Po pięciu przebiegach: **8 / 2 / puste**, `/tmp/aai-zapytania.jsonl` nie istnieje, `active_plugins` = czysta 5-elementowa **tablica** |
| „Liczy WSZYSTKIE zapytania, bez podziału na nasze/cudze — i to jest NAZWANE w nagłówku” | **TAK** | nagłówek pliku, linie 20–27, rozdziela LICZNIK (pełny) od LISTY `--sql` (niepełna). `--powtorzenia=1 --sql` → wydruk z jawnym „lista NIEPEŁNA”, a w TOP 5 widać obok siebie cudze (`wp_actionscheduler_actions`, `wp_terms`) i **nasze** (`SELECT c.id, c.slug … 2×`) — rozdział „nasze vs cudze” da się zrobić ręcznie z `--sql`, choć narzędzie go nie liczy |
| Czy wpis wymagał rozdziału `wp_aai_*` od cudzych | **TAK, rola ma rację** | `stwierdzenie` wpisu żąda dosłownie „policzyć liczbę zapytań SQL na odsłonę”, nie rozbicia per podsystem — rozdziału wpis nie wymaga |
| `srodowisko.mjs --liczniki` powtarzalne (`skrot_tabel`, `media.skrot`) | **TAK** | dwa odczyty przed/po całej mojej pracy: `skrot_tabel` i `media.skrot` **identyczne** po usunięciu mojego jedynego śladu (niżej); dryfuje wyłącznie `wp_options.auto_increment` (414 → 419) |
| „Środowisko zostawione w stanie zastanym”, `skrot_tabel` bez zmian mimo przebiegów narzędzia | **NIE — obalone** | `srodowisko.mjs --liczniki` przed/po **RÓŻNI SIĘ**: `skrot_tabel` `8601172d…` → `68f864e0…`, `wp_options.wierszy` 374 → 375. Przyczyna zmierzona: `wp plugin deactivate` każe WordPressowi zapisać opcję **`recently_activated`** = `{"aai-pomiar-zapytan\/aai-pomiar-zapytan.php":1788600529,…}` — trwały, **imienny** ślad narzędzia w bazie (widoczny w wp-admin jako „Recently Active”). Narzędzie sprząta katalog, dziennik i `active_plugins`, ale **tej opcji nie zna**. Po `wp option delete recently_activated` `skrot_tabel` wraca do wartości zastanej — czyli to był jedyny trwały ślad |
| Wartość odstająca 81 „spójna z rozgrzewaniem obiektowego cache’a WooCommerce” | **NIE — mechanizm niemożliwy** | `wp_using_ext_object_cache()` → **0**, `object-cache.php` → **brak**, `advanced-cache.php` → **brak**, `WP_CACHE` → **0**. Trwałego cache’a obiektowego ta instalacja nie ma, więc podana przyczyna nie może zachodzić. Sam wzorzec (81 na pierwszym żądaniu, potem 75) **odtworzyłem**, ale przyczyny nie ustaliłem; kandydat nieodrzucony przez rolę: kolejka Action Schedulera, której zapytania widać w `--sql`. To hipoteza podana jako ustalenie |

### Ocena rund regresji (USP-R1…R6, USP-90)

Sześć pozycji, wszystkie z dowodem uruchomieniowym albo z jawnie przyznanym brakiem — **przyjmuję**,
z trzema zastrzeżeniami:

- **USP-R1, R6 — mocne.** Odtworzyłem je w całości, łącznie z opisaną pułapką potoku (`$?` mierzył
  `grep`, nie `node`). Powtórzyłem oba kody wyjścia bez potoku: `1` i `0`.
- **USP-R2 — przyjmuję.** Sprawdziłem sam na torze B: `grep -c SAVEQUERIES wp-config.php` → **0**,
  `/tmp/aai_perf*` → brak. Ślad z `AUD-PERF-F1-007` na tym torze nie występuje.
- **USP-R3 — niepełna wobec własnego wpisu.** `stwierdzenie` wpisu wymienia **cztery** trasy:
  katalog, stronę kursu, **koszyk i KASĘ**. Rola zmierzyła katalog, kurs, **lekcję** i koszyk —
  czyli podmieniła trasę wymienioną we wpisie na trasę spoza niego i sama to odnotowała
  w „Niedomkniętych”. Domierzyłem: `/kasa/` → **HTTP 302, 49 zapytań, 0 kB**, bo gość z pustym
  koszykiem dostaje przekierowanie. Liczba dla kasy **istnieje i jest powtarzalna**, ale opisuje
  przekierowanie, nie stronę kasy — i tego rola nie sprawdziła ani nie nazwała.
- **USP-R5 — słaba i sama się do tego przyznaje** (przegląd nagłówków 22 plików). Przyjmuję jako
  uczciwie ograniczoną, nie jako ustalenie.
- **USP-90 — trafna obserwacja**, ale zatrzymana o krok za wcześnie: rzecz nie w tym, że trasy
  za bramką nie są w zestawie domyślnym, tylko że **narzędzie nie umie ich zmierzyć w ogóle**
  (patrz niżej).

### Czego rola nie sprawdziła, a powinna

1. **Zachowanie przy przerwaniu sygnałem.** Zmierzone: `timeout --signal=INT 15 node tools/zapytania-wp.mjs …`
   (dwa przebiegi, wynik identyczny). Katalog wtyczki i dziennik **znikają** — `finally` dochodzi do
   skutku, bo zabity `podman exec` wywraca `execFileSync` wyjątkiem. Ale opcja `active_plugins`
   zostaje **jako obiekt z dziurą w indeksach**: `{"0":…,"1":…,"3":…,"4":…,"5":…}` — dokładnie ten
   stan, który komentarz w samym narzędziu (linie 171–175) nazywa „nie tym samym, który
   zastaliśmy”. Dzieje się to **po cichu**, bez ani jednej linii na STDERR. Zwykły kolejny przebieg
   to goi (gałąź `!Array.isArray(surowe)` — sprawdzone: po nim znów czysta tablica), ale sam fakt,
   że przerwany pomiar zostawia zmieniony kształt opcji, powinien być w tym dokumencie.
2. **Trwały ślad `recently_activated` w `wp_options`** (patrz tabela) — rola twierdzi
   „`skrot_tabel` identyczny przed/po”, a u mnie **zmienił się** właśnie przez ten wiersz.
   Najprawdopodobniej rola miała ten wiersz już w odczycie bazowym, z własnego wcześniejszego
   przebiegu narzędzia — wtedy jej pomiar „przed/po” nie mógł tego pokazać. **Pomiar bazowy zrobiony
   po pierwszym uruchomieniu mierzonego narzędzia nie jest pomiarem stanu zastanego.**
3. **Granica sesyjna narzędzia — najpoważniejsze przemilczenie.** `odpytaj()` woła `fetch` **bez
   żadnych ciasteczek**, więc narzędzie mierzy **wyłącznie ruch gościa**. Liczby PERF dla odsłony
   zalogowanego klienta (114 vs 75) **nie dają się tym narzędziem odtworzyć w ogóle**, tak samo jak
   kasa z niepustym koszykiem czy płatna lekcja za bramką. Nagłówek pliku tego nie obiecuje, więc
   to nie jest nieprawda w kodzie — ale to jest granica, którą dział pomiarowy ma nazwać, zwłaszcza
   że domyślny zestaw tras zawiera `/kasa/` i `/koszyk/`, których koszt zależy od sesji.
4. **Czułość licznika (test negatywny, którego rola nie zrobiła).** „0 odchylenia” samo w sobie nie
   dowodzi, że licznik cokolwiek widzi. Domierzyłem siedem klas tras: `/` **58**, `/kasa/` **49**
   (302), 404 **53**, `/szkolenia/moje/` **58**, lekcja **72**, katalog **75**, kurs **77** —
   licznik rozróżnia, nie jest stałą.
5. **Czy „0 odchylenia” to artefakt cache’u.** Sprawdzone i **odrzucone**: brak `object-cache.php`
   i `advanced-cache.php`, `WP_CACHE` = 0, `wp_using_ext_object_cache()` = 0 (gdyby cache stron
   działał, liczba byłaby bliska zeru, a nie 75 — PHP i baza pracują przy każdym żądaniu). Opcache
   jest włączony (`opcache.enable = On`), ale kesuje skompilowany PHP, nie wyniki SQL; **domierzone
   po zimnym starcie**: `podman exec aai_wp_b_wordpress apache2ctl graceful`, a zaraz po nim
   pierwsze żądanie → dalej **75 / 77**. Stabilność liczb jest prawdziwa, nie maskowana.

### Stan toru B po mojej pracy

`STACK_NAZWA=aai_wp_b WP_PORT=8894 node audyt/tools/srodowisko.mjs --liczniki` przed i po:
`skrot_tabel` i `media.skrot` **identyczne**, `tabel` 75, wszystkie `wp_aai_*` bez zmian,
`wp_options.wierszy` 374 → 374. Jedyna różnica: `wp_options.auto_increment` **414 → 419**
(nieodwracalne, ujawnione). Skasowałem **własny** ślad `recently_activated` (jawną nazwą, nie
zakresem). Katalog wtyczek 8 pozycji, `/tmp` puste, `active_plugins` = czysta tablica 5 wtyczek.
`uploads/wc-logs/` zawiera dwa pliki z **07:30:34 UTC** — sprzed tej i sprzed poprzedniej sesji,
więc **nie moje**; zostawione. Tor A (`:8892`) nietknięty. Plików produktu w `wordpress/` nie ruszałem.
