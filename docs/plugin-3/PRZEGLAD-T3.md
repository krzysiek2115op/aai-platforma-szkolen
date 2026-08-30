# Przegląd kroku T3 — raporty recenzentów i werdykty

**CZYTAĆ PRZED NAPRAWAMI.** Przegląd parą agent+krytyk (decyzja właściciela
2026-08-30, wariant z T2): dwóch recenzentów na rozłącznych obszarach,
agent główny jako krytyk. Dokument powstał PRZED naprawami, żeby przetrwały
`/clear`.

**Zasada obowiązująca przy naprawach: KAŻDE znalezisko potwierdzam
URUCHOMIENIOWO PRZED naprawą** — także te, które recenzent oznaczył jako
zmierzone. Recenzent bywa w błędzie, a naprawa niepotwierdzonego znaleziska
psuje działający kod.

Kolumna „werdykt" jest pusta do czasu mojej weryfikacji.

---

## Recenzent B — skrypt przeglądarki i bramki

Obszar: `assets/pomiar.js`, `straznik-monitora-wp.mjs` (reguły 14–18),
`smoke-wp-monitor.mjs` (blok 10), mutacje w audycie.
Higiena recenzenta: mutował wyłącznie kopie, pliki przywrócone co do bajtu
(`cmp` czysty), po pomiarach skasował 3 wiersze wizyt i 3 wpisy dziennika.

| # | Znalezisko | Dowód recenzenta | Werdykt |
|---|---|---|---|
| **B1** | **Czas aktywny URYWA SIĘ przy pierwszym przełączeniu karty.** Po `visibilitychange: hidden` flaga `wyslane` zostaje `true`, więc powrót do karty (`visible` bez `pageshow`) nie wznawia pomiaru — zegar liczy do zmiennej, której nikt nie odczyta | **uruchomieniowo:** 1500 ms widoczne → ukrycie → powrót → 4000 ms widoczne → ukrycie. W bazie **jeden wiersz, `trwanie_ms = 1531`** przy 5531 ms realnego czytania |  **POTWIERDZONE** — 1500 ms + przerwa + 4000 ms dało `trwanie_ms = 1559`. Naprawione (0.57.0): identyfikator odsłony + UNIQUE, beacon przy KAŻDYM ukryciu karty. Po naprawie 5530 ms, jeden wiersz |
| **B2** | **Trzy z sześciu wymagań reguły 16 pytają o OBECNOŚĆ NAZWY**, a jedno (`try/catch` przy `sessionStorage`) nie jest łapane przez NIC — ani strażnika, ani bramkę | **uruchomieniowo (mutacje na kopiach):** `navigator.webdriver` → zmienna: strażnik ZIELONY; zdjęty `catch` przy `getItem` (drugi `catch` zostaje): ZIELONY; skasowany startowy `ruszZegar()`: ZIELONY. `grep sessionStorage` w bramce → brak |  **POTWIERDZONE** na oryginale — trzy mutacje przeszły na zielono. Wszystkie sześć wymagań reguły 16 pyta teraz o rozstrzygnięcie; 4 nowe mutacje w audycie |
| **B3** | **`wejscie = now() − wiek_ms` — najcięższe znalezisko audytu (Z1) — nie jest sprawdzane ANI RAZU.** Podmiana na `teraz_utc()` albo na `-$trwanie` zostawia 129 sprawdzeń zielonych | analiza bloku 10 + sonda: `wiek_ms = 2345` → `wejscie` 2,3 s wstecz; `wiek = 9 h` → dokładnie 4 h (sufit) |  **OBALONE** — asercja na `wejscie` istnieje od T3 (blok 6) i podmiana na `teraz_utc()` wywala DWA sprawdzenia. Lukę „`-$trwanie`”, opisaną trafnie, zamknęła naprawa A5 |
| **B4** | **Wykluczenie ADMINISTRATORA w endpoincie nie jest pilnowane przez nic.** Mutacja kasująca blok `current_user_can` z `obsluz()` → strażnik ZIELONY, a bramka nigdy nie wysyła beaconu jako admin | **uruchomieniowo:** beacon z ciastkami admina → 0 wierszy (mechanizm żyje), mutacja → strażnik zielony |  **POTWIERDZONE** — mutacja kasująca wykluczenie przechodziła. Doszła reguła 14b + mutacja + pomiar beaconem z ciastkami administratora |
| **B5** | **Reguła 15 pyta o OBECNOŚĆ WYWOŁANIA, nie o decyzję** — `current_user_can(…) { return true; }` i `$blad = is_404();` przechodzą | **uruchomieniowo:** obie mutacje → strażnik ZIELONY (łapie je dopiero bramka 10h) |  **POTWIERDZONE** — obie mutacje przechodziły. Reguła 15 pyta teraz o `return false`; 2 mutacje |
| **B6** | **Reguła 14 „ciało strumieniem z sufitem" stoi na obecności `fread(`**, a bramka mierzy inną gałąź: wypełniacz 1025 B jest odrzucany wcześniej, na deklarowanym `Content-Length` | **uruchomieniowo:** `fread( …, 8 MB )` + `return $cialo` → strażnik ZIELONY; ciało `chunked` 2161 B → 400 jeszcze przed PHP |  **POTWIERDZONE co do strażnika** (`fread( …, 8 MB )` przechodziło) — reguła pyta teraz o sufit przy odczycie i odrzut po nim, 2 mutacje. **Sprostowanie:** ciało `chunked` NIE jest odrzucane przed PHP — zmierzone, dochodzi i dostaje 204 |
| **B7** | **Asercja „ekran zaznacza wybrane okno" przechodzi dla DOWOLNEGO zaznaczonego okna** — pyta tylko o obecność klasy po żądaniu `okno=30` | **uruchomieniowo:** `okno` puste → „dziś", `okno=7` → „7 dni", `okno=999` → „dziś" |  **POTWIERDZONE** — asercja pytała o obecność klasy. Bramka sprawdza teraz, KTÓRE okno jest zaznaczone (4 sprawdzenia) |
| **B8** | **Komentarz przy sprzątaniu wizyt mówi NIEPRAWDĘ o kodzie** (klasa BLAD-018): twierdzi „wizyty mają własny znacznik w ścieżce", a bramka używa prawdziwych adresów i kasuje `WHERE id > migawka` — czyli zabiera też cudze wiersze z okna przebiegu | lektura `smoke-wp-monitor.mjs:1094` + obserwacja równoległych zapisów |  **POTWIERDZONE** — komentarz mówił o znaczniku w ścieżce, którego bramka nie używa. Przepisany na prawdę o kodzie (kasowanie po granicy identyfikatora) razem z nazwaniem tego samego ograniczenia co przy dzienniku |
| **B9** | **`straznik-higieny-smokow` nie wie o tabeli `wizyty`** — reguły 8–9 dotyczą wyłącznie dziennika logowań. Pierwszy rig, który nadpisze `navigator.webdriver`, zacznie zawyżać ruch i nikt go nie zmusi do sprzątania | **HIPOTEZA** (nie mierzył przelotu wszystkich bramek) |  **POTWIERDZONE** — zero wystąpień słowa „wizyty” w strażniku higieny. Doszła reguła 12 (rozpoznanie po zachowaniu) + 2 mutacje |
| **B10** | **Nagłówek strażnika: „CZTERNAŚCIE NIEZMIENNIKÓW" przy 19 blokach, numer 14 użyty dwa razy, reguł 15–18 nie ma w wyliczeniu** | lektura pliku |  **POTWIERDZONE** — nagłówek mówił „CZTERNAŚCIE” przy 19 blokach. Poprawiony |

### Co recenzent B sprawdził i uznał za BEZ ZARZUTU

- **Blok sita (10b) zbudowany poprawnie**: otwiera i zamyka go beacon
  kontrolny, każdy zły beacon różni się od dobrego jednym polem, a odrzut
  1025 B jest naprawdę o rozmiarze (nadmiarowy klucz 20 B przechodzi).
- **`po === przed + 3` w 10i to mocna, nieślepa asercja** — łapie mutacje,
  które strażnik przepuszcza.
- **Asercja o stronie 404 ma zęby**: 404 renderuje stopkę z 7 znacznikami
  `<script src>`, więc brak `aaiMonitorPomiar` naprawdę coś znaczy.
- **Rachunek sumienia stoi PRZED końcowym `exit`** (lekcja 0.54.0), obejmuje
  obie tabele i dziennik; limiter przywraca stan, a skan `wp_options` szuka
  WZORCA adresu, nie konkretnego IP.
- **Ekran nie przecieka `/szkolenia/` poza sekcją Ruch** (dokładnie jedno
  wystąpienie), więc asercja 10k nie jest ślepa.

### Sprostowanie do raportu B

Recenzent ostrzegł, że „na `:8892` pracował ktoś jeszcze" (wiersze `deadbeef…`).
To **nie był nikt obcy — to drugi recenzent tego samego przeglądu**, pracujący
równolegle nad kodem PHP. Wniosek o mechanizmie (B8) zostaje w mocy, ale
scenariusz „bramka skasowała cudze dane" dotyczył naszej własnej pary agentów.

---

## Recenzent A — kod PHP wtyczki

Obszar: wystrzał, podpis, podawanie skryptu, warstwa zapisu, odczyt, ekran,
kontrola. Nie zmienił ani jednego pliku w repo; po pomiarach skasował
40 wierszy wizyt, 1 wpis dziennika, tabelę pomiarową 50 000 wierszy i opcję
roboczą. Stan końcowy: wizyty 0, logowania 0, kontrola kod 0.

| # | Znalezisko | Dowód recenzenta | Werdykt |
|---|---|---|---|
| **A1** | **Limiter NIE jest limitem „na minutę" — jest kumulacyjny.** `set_transient( $klucz, $ile + 1, 60 )` odnawia TTL przy KAŻDYM przyjętym beaconie, więc licznik nie wraca do zera, dopóki przerwy są krótsze niż 60 s. Realna reguła brzmi „300 żądań od ostatniej pełnej minuty CISZY" — odwrotnie niż mówi komentarz w kodzie. Do tego **beacon ODRZUCONY też zżera limit** (limiter stoi przed sprawdzeniem podpisu) | **uruchomieniowo:** dwa pomiary w odstępie 8 s — TTL przesunięty z `A+60` na `B+60`, licznik 1 → 2; osobno licznik 16 → 17 (przyjęty) → 18 (odrzucony) |  **POTWIERDZONE** — TTL przesunięty o 5 s przy liczniku 1 → 2; trzy odrzucone beacony podniosły licznik do 3. Okno kotwiczone do pełnej minuty, licznik rośnie tylko o beacony PRZYJĘTE |
| **A2** | **Jeden nieuwierzytelniony klient może zapchać tabelę**: podpis stoi jawnie w HTML, jest stały i wielokrotnego użytku. Koszt wiersza **191 B** → przy suficie limitera ~430 000 wierszy i ~80 MB **na dobę z jednego adresu**, przy retencji 400 dni i bez sufitu liczby wierszy. Ekran degraduje się razem z tabelą, bo kafelki robią `COUNT(*)` i `COUNT(DISTINCT sesja)` **bez okna czasu** — pełny skan 400 dni przy każdym otwarciu panelu | **uruchomieniowo:** 40 beaconów z jednym podpisem → 40 wierszy; waga wiersza zmierzona na tabeli 50 000 wierszy |  **POTWIERDZONE**. Decyzja właściciela: sufit wierszy TAK (250 000, ścina najstarsze), deduplikacja NIE — nie zmieniamy znaczenia liczb |
| **A3** | **Kafelki „Odsłony" i „Sesje" liczą CAŁĄ historię, a sekcja tuż pod nimi — wybrane okno.** Dwie liczby o tej samej nazwie i różnym znaczeniu, bez podpisu | **uruchomieniowo:** wiersz przestawiony na `−40 dni` → kafelki 40/14, sekcja (dziś/7/30) 39/13 |  **POTWIERDZONE** — wiersz sprzed 40 dni dawał kafelek 1 i sekcję 0 przy identycznym napisie. Kafelki mówią „łącznie” i mają podpis |
| **A4** | **Nic nie pilnuje, że `admin_url()` i `home_url()` mają to samo pochodzenie.** Cel beaconu składa `admin_url()`, a sito porównuje `Origin` z `home_url()`. Typowy rozjazd produkcyjny (`www` w jednym, brak w drugim; `FORCE_SSL_ADMIN`) czyni beacon cross-origin → preflight → 403 → **zero beaconów przy `sprawdz` kod 0** | **HIPOTEZA + zmierzona połowa:** `Origin` z innym portem jest odrzucany, więc każda różnica hosta/schematu/portu kasuje pomiar |  **PRZYJĘTE decyzją właściciela i ZROBIONE** — kontrola porównuje pochodzenie obu adresów i świeci kodem 1 przy różnicy; czyste porównanie łańcuchów, bez żadnego żądania (P11) |
| **A5** | **Sufit 4 h na `wiek_ms` PRZESUWA moment wejścia, a nie tylko obcina czas.** Karta zostawiona na noc zapisze wejście „4 h temu" — w złej godzinie, a przy oknie „dziś" często w złej dobie | **uruchomieniowo:** `wiek_ms = 99999999999` → `wejscie` dokładnie `teraz − 4 h`, `trwanie_ms = 1000` |  **POTWIERDZONE** — `wiek_ms` 9 h dawał wejście dokładnie „4 h temu”. Sufity są teraz dwa: czas czytania przycinany (4 h), wiek ponad 30 dni ODRZUCANY |
| **A6** | **Strony za bramką logowania liczą się jako przeczytane lekcje.** Gość na płatnej lekcji dostaje 200 i skrypt pomiaru, choć widzi tylko „Zaloguj się" — „top 10" pokaże je jako czytane | **uruchomieniowo:** lekcja spoza zapowiedzi → 200, skrypt obecny, zero nagłówków prozy w HTML |  **POTWIERDZONE** — gość na płatnej lekcji dostaje 200, skrypt i zero prozy. Decyzja właściciela: kolumna `bramka` + nazwanie na ekranie. Flaga wchodzi do PODPISU, więc jest niepodrabialna (sprawdzone) |
| **A7** | **Komentarz o wyścigu przy tworzeniu soli mówi nieprawdę** — `add_option()` robi `INSERT … ON DUPLICATE KEY UPDATE`, więc wygrywa OSTATNI, a przegrany proces dalej używa własnej soli z pamięci podręcznej. Strony wyrenderowane przez przegranego niosą podpisy, które nigdy nie przejdą sita | **uruchomieniowo:** dwa `add_option` → oba `true`, w bazie `SOL_B`, proces A zwraca `SOL_A` |  **POTWIERDZONE, ale mechanizm inny, niż opisał recenzent.** Nie chodzi o „przegranego z własną solą w cache” — `add_option()` sam NADPISUJE wiersz zwycięzcy. Pierwsza naprawa (odczyt z bazy) była POZORNA; sól powstaje teraz zapisem pustym przy konflikcie |
| **A8** | **`zrodlo()` zawodzi „na otwarto"**: wartość bez hosta daje pusty łańcuch po obu stronach porównania, więc gdyby `home_url()` kiedykolwiek go nie miało, `Origin: null` (piaskownicowana ramka) przeszedłby jako swój | **uruchomieniowo (refleksja):** `zrodlo("null") = ""`, `zrodlo("") = ""` |  **POTWIERDZONE** — `zrodlo('null') === zrodlo('')`. Sito zawodzi teraz na zamknięto. **Uwaga o dowodzie:** asercja „Origin: null odrzucony” przechodzi też BEZ naprawy — prawdziwy warunek (witryna bez hosta) mierzymy osobno |
| **A9** | **`Aai_Monitor_Ekran::zasoby( string $uchwyt )` to jedyny typowany parametr haka bez wartości domyślnej** — cudza wtyczka odpalająca `admin_enqueue_scripts` z `null` wywraca kokpit. `Aai_Monitor_Logowania` ma domyślne WSZĘDZIE, dokładnie z tego powodu (znalezisko (3) z przeglądu T2) | **uruchomieniowo:** `do_action( "admin_enqueue_scripts", null )` → `TypeError` poza `try` |  **POTWIERDZONE** — `do_action( …, null )` rzucało TypeError. **Sprostowanie:** sama wartość domyślna NIE wystarcza; typ musiał zniknąć z sygnatury. Doszła reguła 9b na WSZYSTKIE nasze handlery + 2 mutacje |
| **A10** | **Liczba przysłana jako ŁAŃCUCH cicho staje się zerem, a wiersz i tak powstaje.** Dziś nie boli (skrypt wysyła liczby), ale jedna zmiana po stronie klienta zamieni cały pomiar czasu w zera przy pełnej liczbie odsłon | **uruchomieniowo:** `{"trwanie_ms":"5000","wiek_ms":"9000"}` → wiersz z `trwanie_ms = 0`, `wejscie = teraz` |  **POTWIERDZONE** — `"5000"` dawało wiersz z czasem 0 i wejściem „przed chwilą”. Przyjmujemy zapis liczbowy |
| **A11** | **Każda odsłona kosztuje drugi, NIEBUFOROWALNY przebieg PHP.** Na hostingu z cache'em pełnych stron ruch anonimowy dziś nie dotyka PHP wcale; po T3 każda odsłona to jedno żądanie PHP z pełnym bootstrapem i `admin_init` | **uruchomieniowo:** odrzut 42,7–44,6 ms, przyjęcie 50,0 ms (12 prób); reszta **HIPOTEZA** — dotyczy przyszłego hostingu |  **PRZYJĘTE decyzją właściciela jako pozycja wdrożeniowa** — kodu nie ruszamy, optymalizacja pod nieznany hosting to zgadywanie |

### Co recenzent A sprawdził i uznał za BEZ ZARZUTU

1. **Wstrzyknięć nie ma** — wszystko przez `insert()`/`prepare()`, na ekranie
   każda wartość z ciała żądania przez `esc_html()`.
2. **Nie da się wyprosić podpisu na zmyśloną ścieżkę** — 11 wariantów (zły
   slug, `%3Cscript%3E`, dodatkowy segment pod istniejącą stroną i pod lekcją,
   `//`, `/index.php/foo`, brak ukośnika) → 404 albo 301, **ani jednego
   znacznika skryptu**. Query string jest ucinany przed podpisaniem.
3. **Sito działa dokładnie tak, jak obiecuje kontrakt** — odrzucone bez
   wiersza: `text/plain`, obce `Origin`, ten sam host z innym portem, brak
   `Origin` i `Referer` naraz, ciało 1025 B, 1200 B, **5 MB bez
   `Content-Length` (odrzut w 49 ms, bez wciągania do pamięci)**, POST
   form-urlencoded, GET z ładunkiem. Przyjęte: `application/json`,
   `APPLICATION/JSON; charset=UTF-8`, ciało 1024 B, `Referer` jako zapas.
4. **Strefy czasowe policzone poprawnie** — przy `gmt_offset = 2`:
   `granica_okna(1) = 2026-08-29 22:00 UTC`, `7 → 08-23 22:00`,
   `30 → 07-31 22:00`. Z14/P7 domknięte.
5. **Beacon ZALOGOWANEGO klienta dojeżdża** (N18/F17) — `admin_init`
   WooCommerce nie przekierowuje `admin-post.php` dla roli `subscriber`.
6. **Sito liczb i sesji trzyma się** — ujemne → 0, brak pola → 0,
   `1234.9` → 1234, `1e30` → sufit, `wiek < trwanie` podnoszone do `trwanie`.
7. **Różnica czasu odpowiedzi nic nie zdradza** — 50,0 ms przyjęcie wobec
   42,7–44,6 ms odrzut to koszt `INSERT`-a; `hash_equals()` jest stałoczasowe.
8. **Znacznik w HTML poprawny** — inline z danymi PRZED skryptem, `defer`
   przetrwał, uchwyt poza filtrami `Aai_Sklep_Zasoby`, skrypt obecny na
   wszystkich stronach frontu i **nieobecny na 404**.

---

## Plan napraw (wstępny — kolejność wykonania po `/clear`)

**Reguła nadrzędna: każde znalezisko potwierdzam URUCHOMIENIOWO PRZED
naprawą**, także te oznaczone przez recenzentów jako zmierzone. Kolumna
„werdykt" wyżej wypełnia się w trakcie.

### Tura 1 — kod produktu, rzeczy które dają ZŁE DANE

| # | Co | Dlaczego pierwsze |
|---|---|---|
| B1 | czas aktywny urywa się przy pierwszym przełączeniu karty | liczba na ekranie jest zaniżona wbrew temu, co ekran o sobie mówi |
| A1 | limiter kumulacyjny; odrzuty zżerają limit | za proxy jeden klient może po cichu wyłączyć pomiar dla całej witryny |
| A5 | sufit 4 h na `wiek_ms` przesuwa moment wejścia | wizyta ląduje w złej dobie — to wada, przed którą broni cały mechanizm |
| A6 | strony za bramką logowania liczone jako przeczytane lekcje | „top 10" ma odpowiadać na pytanie, co jest CZYTANE |
| A3 | kafelki liczą całą historię, sekcja — okno; ta sama nazwa | właściciel przeczyta kafelek jako dzisiejszy ruch |

### Tura 2 — kod produktu, odporność

A8 (`zrodlo()` na otwarto) · A9 (`zasoby()` bez wartości domyślnej) ·
A10 (liczba jako łańcuch — rozstrzygnąć: przyjmować czy odrzucać głośno) ·
A2 (okno czasu w zapytaniach kafelków; sufit wierszy do decyzji właściciela).

### Tura 3 — bramki, czyli dowody które są pozorne

B2 (trzy wzorce po nazwie + BRAK testu z zablokowanym `sessionStorage`) ·
B3 (zero asercji na `wejscie` — mechanizm z najcięższego znaleziska audytu) ·
B4 (brak beaconu jako admin) · B5 · B6 · B7 (asercja okna) ·
B9 (`straznik-higieny-smokow` bez tabeli wizyt) · B10 (numeracja reguł).

### Tura 4 — nieprawdy w dokumentacji (klasa BLAD-018)

A7 (komentarz o wyścigu soli obiecuje coś, czego nie ma) ·
B8 (komentarz przy sprzątaniu wizyt mówi o znaczniku w ścieżce, którego
bramka nie używa).

### Do decyzji właściciela — NIE naprawiam sam

| # | Pytanie |
|---|---|
| A2 | Czy dokładamy **sufit liczby wierszy** albo okno deduplikacji (ta sama para sesja+ścieżka raz na N minut)? To zmienia znaczenie danych, nie tylko odporność |
| A4 | Czy `sprawdz` ma świecić **kod 1**, gdy `admin_url()` i `home_url()` mają różne pochodzenie? (dziś rozjazd = zero beaconów przy zielonej kontroli) |
| A6 | Czy strony bramki logowania mają **znikać z pomiaru**, czy być **nazwane na ekranie**? Pierwsze traci informację o odbiciach, drugie zostawia mylącą liczbę |
| A11 | Pozycja wdrożeniowa: na hostingu z cache'em stron **każda odsłona to dodatkowy przebieg PHP**, którego dziś nie ma |


---

## Co z tego wyszło — stan po naprawach (2026-08-31, wersja 0.57.0)

**Dwadzieścia znalezisk potwierdzonych URUCHOMIENIOWO przed naprawą, jedno
(B3) obalone.** Naprawy poszły w czterech turach, każda osobnym commitem
i z własnymi testami negatywnymi.

**Trzy znaleziska okazały się PŁYTSZE, niż opisał recenzent** — i to jest
argument za regułą „potwierdź przed naprawą”, bo naprawa według opisu
byłaby w dwóch przypadkach pozorna:

- **A7** — recenzent widział wyścig w odczycie zwrotnym. Prawdziwa
  przyczyna leży wcześniej: `add_option()` pisze `INSERT … ON DUPLICATE
  KEY UPDATE`, czyli sam nadpisuje sól zwycięzcy. Moja pierwsza naprawa
  (czytanie wprost z bazy) przechodziła własny test negatywny na obu
  wersjach kodu — bo w bazie leżała już nasza sól.
- **A9** — wartość domyślna, którą recenzent wskazał jako lekarstwo, broni
  wyłącznie przed argumentem POMINIĘTYM. Z jawnym `null` typowany parametr
  dalej rzucał; typ musiał zniknąć z sygnatury.
- **B6** — recenzent zmierzył, że ciało `chunked` jest odrzucane przez
  serwer przed PHP (400). Zmierzone ponownie: DOCHODZI i dostaje 204,
  więc tę gałąź da się przetestować naprawdę.

**Sześć błędów powstało w samych naprawach** i wyszły wyłącznie z testów
negatywnych, nie z lektury: ślepa reguła 9b (szukała sygnatury w pliku
rejestracji, a nie w klasie), ślepa reguła 12 (uznawała za rozliczenie
każdą asercję w środku testu), blok pomiaru sufitu KASUJĄCY CUDZE WIERSZE
(przez co rachunek sumienia przestawał cokolwiek znaczyć), poprawka B7,
która zabrała dwóm istniejącym asercjom ich zmienną, ślepa reguła 15c
(wzorzec trafiał w `admin_url()` stojące w TREŚCI KOMUNIKATU — dziewiąty
nawrót pułapki, tym razem w regule napisanej po jej opisaniu w tym samym
przeglądzie) oraz martwa asercja A4, która łapała komunikat przez
`ob_start()`, choć `WP_CLI::error()` kończy proces — ta sama pułapka
zafałszowała wcześniej moją własną sondę.

**Stan dowodów:** `npm run check` kod 0 (strażnicy **37/37**), audyt
mutacyjny **287** (285 złapanych, 0 przeoczonych, 0 martwych),
`smoke-wp-monitor` **129 → 170 sprawdzeń**.

### Co zostaje otwarte

| # | Co | Dlaczego |
|---|---|---|
| A11 | dodatkowy przebieg PHP na hostingu z cache'em stron | pozycja wdrożeniowa — rozstrzygnięcie, gdy będzie znany hosting |
