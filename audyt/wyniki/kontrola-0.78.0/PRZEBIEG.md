# Fala kontrolna po 0.78.0 — dziennik przebiegu

Protokół: `audyt/PLAN-BUDOWY.md`, sekcja „FALA KONTROLNA PO 0.78.0 — PROTOKÓŁ
PRZEBIEGU (2026-09-06)". Kod produktu: `main` na **v0.78.0**.

## Kroki wstępne (2026-09-06, wieczór)

| Krok | Komenda | Wynik |
|---|---|---|
| 1. Gałąź sektora | `git checkout re-audyt/sektor-re-audytu`; `git merge main` | „Już aktualne" — `main` scalony wcześniej (`af5e410`) |
| 1. Niezmiennik sektora | `git diff main --name-only -- . ':!audyt' ':!re-audyt' \| wc -l` | **0** |
| 2. Strażnik sektora | `node audyt/tools/straznik-sektora-audytu.mjs` (bez potoku) | **kod 0**; R11 nie zapalił się — goldeny ról przekotwiczone w `014db6d` |
| 3. Generat agentów | `ls .claude/agents/*.md \| wc -l` | **80** (w tym 42 `rea-*`) — generowanie zbędne |
| 4. Tor B | `STACK_NAZWA=aai_wp_b WP_PORT=8894 MAILPIT_PORT=8895 ./postaw.sh` | **kod 0**; `http://127.0.0.1:8894/szkolenia/` → 200 |
| 4. Pamięć | `free -m` przed / po | 3378 MB / **3122 MB** dostępne — próg 1 GB z zapasem, **tor B zostaje** |
| 4. Dane toru B | zapytanie SQL | kursy 2, lekcje z treścią **73**, załączniki 151 |
| 5. Zrzut bazowy A | `srodowisko.mjs --zrzut=k78-baza` | kod 0; 81 tabel, 9,3 MB, skrót `535eacd75a31ecd1…` |
| 5. Zrzut bazowy B | `WP_PORT=8894 STACK_NAZWA=aai_wp_b … --zrzut=k78-baza-b` | kod 0; 75 tabel, 6,1 MB, skrót `8b3ff70f2357878f…` |
| — Kontrole przed rolami | `wp aai-{sklep,platnosci,monitor} sprawdz` na obu torach | **6 × kod 0** |

**Decyzja orkiestracji:** dwa tory, zgodnie z protokołem — pamięć po
postawieniu toru B (3,1 GB) jest ponad progiem, przy którym protokół każe
zdjąć tor B.

## Przebieg ról

Kolejność wg wagi zmian w 0.66.0–0.78.0: BE, BD, INT, ARCH → SEC, PRIV,
PERF, FE → QA, REPO, USP → WDR, PROTO, PIK. Po każdej roli zrzut
`k78-<KOD>-po`, przywrócenie bazy, krytyk.

| Rola | Tor | Start | Wynik roli | Werdykt krytyka |
|---|---|---|---|---|
| BE | A | 22:33 → 00:15 | W1 **44/44 NAPRAWIONE**, 0 nienaprawionych, 8 poza zakresem plikowym; W2 BE-R1…R6 + BE-90 (R6 częściowo: 4 z 5 kluczy) | w toku |
| BD | B | 22:33 → 23:06 | W1 21/21 NAPRAWIONE, W2 BD-R1…R6 + BD-90 wszystkie TAK | **ODRZUCAM** — 20 z 22 pozycji W1 na lekturze kodu, nie na uruchomieniu |

**Po BD:** zrzut `k78-BD-po` (75 tabel, skrót `6c8253b8b951a0de…`), przywrócenie
`k78-baza-b` kod 0 — skrót żywej bazy wrócił do `8b3ff70f2357878f…`, czyli tor B
jest w stanie bazowym przed kolejną rolą.

**Decyzja orkiestracji:** ról bez toru (REPO, USP, PIK, PROTO) NIE uruchamiam
równolegle z rolami torowymi, mimo że protokół na to pozwala — ich checklisty
każą weryfikować liczby bramek WP, a bramka uruchomiona na zajętym torze mierzy
cudzy stan. To repozytorium ma udokumentowaną klasę „bramka padła na cudzych
śmieciach"; kolejność sekwencyjna kosztuje czas, kolizja kosztowałaby wiarygodność
wyniku.

**Po krytyku BD.** Werdykt ODRZUCAM nie unieważnia werdyktów roli — krytyk
odtworzył samodzielnie osiem cytowanych miejsc i wszystkie trafiają w tezę
swojego wiersza, a BD-R6 potwierdził komendą. Odrzucenie dotyczy DOWODU:
re-audyt ma uruchamiać, nie czytać. Krytyk zgłosił sam własny ślad
(uszkodzona meta `_aai_zrodlo_uuid` wpisu `topics #101` w teście negatywnym)
i naprawił go po kluczu, nie nadpisaniem.

**Stan toru B po krytyku, zmierzony niezależnie przez orkiestrację** (nie
przyjęty na słowo): cztery kontrole kod 0, kursy 2, moduły 12, lekcje 73,
met `ZEPSUTE%` **0**, `klient-test` obecny.

**Zmiana w szablonie polecenia od roli INT wzwyż** (wprost z odrzucenia BD):
dopisany akapit „WYMÓG DOWODU" — komenda i kod wyjścia dla każdej pozycji,
a przy niewykonalnym uruchomieniu wpis do „Niedomknięte" zamiast werdyktu
NAPRAWIONE na lekturze. Do tego zakaz audytu mutacyjnego przy zajętym drugim
torze: mutuje pliki wtyczek montowane przez oba stosy.

| INT | B | 23:20 → 23:37 | W1 9 pozycji uruchomieniowo (fault injection) — wszystkie NAPRAWIONE, 5 niedomkniętych; W2 strażnicy 39/39 | w toku |

**Po INT.** Rola zgłosiła sama, że skasowała opcję `aai_platnosci_stan_zastany`
bez pomiaru stanu przed, i zarekomendowała odbudowę toru. Tor B przywrócony
zrzutem `k78-baza-b` — skrót żywej bazy wrócił do `8b3ff70f2357878f…`, trzy
kontrole kod 0. Odbudowa `postaw.sh` niepotrzebna: przywrócenie bazy jest
dokładniejsze (wraca CAŁY stan zapisany, nie tylko klucze, które `napraw()`
umie odtworzyć) i tańsze.

**RÓŻNICA MIĘDZY TORAMI — zmierzona przez orkiestrację, do rozstrzygnięcia
przez rolę, nie przeze mnie.** Opcja `aai_platnosci_stan_zastany` (punkt
przywracania cudzych ustawień, naprawa z `v0.66.0`) ma na torze A pięć kluczy,
w tym `tutor_option:monetize_by`, a na torze B **nie istniała już w zrzucie
bazowym**: `grep -c` w `k78-baza-b.sql` → **0**, w `k78-baza.sql` → **1**.
Czyli świeża instalacja z `postaw.sh` nie ma punktu przywracania dla
`monetize_by`, a historyczna ma. Pytanie „poprawne zachowanie czy luka"
przekazane krytykowi INT z żądaniem odpowiedzi komendą — mieści się w jego
zakresie (cudza wtyczka i jej ustawienia). **Orkiestracja tego nie orzeka
i nie naprawia.**

**Krytyk INT: ODRZUCAM.** Siedem powodów, wszystkie o dowodzie: „NIE DOTYCZY"
chowające pozycję dotyczącą produktu (`MAR-A-13` — obalone jedną linią:
`property_exists(tutor(),'course_post_type')` = **false**, bo to właściwość
magiczna), werdykt zbiorczy z lektury komunikatu strażnika, wiersz bez
werdyktu, odpowiedź o zasięgu narzędzia zamiast zjawiska, dwie pozycje
niewykonane i **nieujawnione w „Niedomkniętych"**, oraz zrzut nazwany
„bazowym" zrobiony PO zmianach roli. Dziewięć pozycji odtworzył sam
i przyjął.

### KANDYDAT NA ZNALEZISKO — punkt przywracania cudzych ustawień

**Nie jest to jeszcze werdykt fali.** Zmierzone niezależnie przez krytyka INT
i przez orkiestrację, przekazane roli ARCH do rozstrzygnięcia w obie strony.

Naprawa `v0.66.0` obiecuje, że wyłączenie płatności nie zostawia cudzych
ustawień przestawionych. Na torze B (świeży `postaw.sh`, baza w stanie
bazowym) zmierzone **surowym odczytem z bazy, z pominięciem `get_option`**:

| Fakt | Wartość |
|---|---|
| `tutor_option['monetize_by']` w SUROWEJ bazie | `'wc'` |
| `woocommerce_enable_guest_checkout` | `'no'` |
| `aai_platnosci_stan_zastany` | **nie istnieje** (`grep -c` w `k78-baza-b.sql` = 0; w `k78-baza.sql` = 1, pięć kluczy) |
| czy `wordpress/srodowisko/` ustawia te wartości | **nie** (grep = 0) |
| gdzie wymuszane | `class-aai-platnosci-ustawienia.php:79` — `'monetize_by' => 'wc'` |

Krytyk INT zmierzył ponadto, że deaktywacja Pluginu 2 na tej bazie cofa
**wyłącznie mail Woo**, a gałąź `strona_slug:` (`…ustawienia.php:657`) zapisuje
do mapy BEZWARUNKOWO jako jedyna z czterech — więc `napraw()` po utracie mapy
odtwarza punkt przywracania wskazujący NASZE własne wartości.

**Kontrargument, który ARCH ma obalić albo potwierdzić:** mapa może nie
powstawać dlatego, że na świeżej instalacji nie było czego zapisać (klucza
mogło w ogóle nie być), a nie dlatego, że naprawa jest niedomknięta.
Rozstrzygnięcie wymaga pomiaru stanu `monetize_by` PRZED aktywacją naszej
wtyczki. **Orkiestracja tego nie orzeka i nie naprawia.**

| ARCH | B | 00:05 | w toku | — |


### INCYDENT ŚRODOWISKOWY PRZY ROLI BE — dane dowodowe właściciela

Rola BE zgłosiła sama dwa własne incydenty. **Drugi dotknął danych objętych
wyraźnym zakazem** i wymagał interwencji orkiestracji.

**1. Dziennik logowań (tor A).** BE wykonała zbiorczy `DELETE` na
`wp_aai_monitor_logowania` z filtrem po agencie (`node`/`curl`/`WP CLI`)
i usunęła **71 wierszy**, nie umiejąc odróżnić własnych śladów od starszych
wpisów. W dzienniku leżały **dane dowodowe właściciela z testu T4**, których
protokół zakazywał kasować. Stan po roli zmierzony: **26 logowań / 42 wizyty**.

**ODTWORZONE CO DO WIERSZA.** Zrzut bazowy `k78-baza` (zrobiony przed falą,
krok 5 protokołu) zawierał komplet: policzone w pliku SQL **68 logowań
i 37 wizyt** — dokładnie liczby z protokołu. Po `--przywroc=k78-baza` żywa
baza pokazuje **68 / 37**, `klient-test` obecny, trzy kontrole kod 0,
załączników 151, oba kursy `published` z pełną treścią (564 858 i 364 973
znaki). **To jest argument za krokiem 5 protokołu:** bez zrzutu bazowego
sprzed fali dane dowodowe byłyby nie do odzyskania — sama rola napisała
„nie da się odtworzyć".

**2. Czyszczenie treści przy wstrzykiwaniu usterki.** Fault injection na
pozycji „ukrycie kursu" przekazał `sekcje=[]` i `moduly=[]` — czyli PUSTE
tablice zamiast pominięcia kluczy — co wyczyściło **41 lekcji prawdziwego
kursu**. Rola wykryła to natychmiast, naprawiła `wp:import` i zweryfikowała
trzema bramkami. Warto zauważyć, że to **poprawne zachowanie kontraktu**
(„brak klucza = nie ruszaj" to co innego niż „pusta lista = skasuj"), a nie
usterka produktu — ale pokazuje, jak wąska jest ta granica przy pomiarach.

**Skutek uboczny przywracania:** `srodowisko.mjs --przywroc` zakończył się
**kodem 1** — poprawnie, bo media leżą poza bazą i ich nie przywraca
(32 028 326 → 32 058 401 bajtów, +30 kB miniatur wygenerowanych przez bramki).
Nadmiar, nie brak: kontrola sklepu, która od `v0.76.0` sprawdza kompletność
zrzutów wobec żądań prozy, kończy kodem 0.

### Krytycy ARCH-owego kandydata i BE — dwa werdykty

**ARCH: kandydat na znalezisko OBALONY.** Punkt przywracania
`aai_platnosci_stan_zastany` z `v0.66.0` **działa poprawnie** — dowód w obie
strony: (1) `napraw()` przy faktycznie nieobecnym kluczu zapisuje pozycję
w mapie, (2) to samo przez PRAWDZIWY hak aktywacji wtyczki, (3) Tutor sam
nigdy nie zapisuje `monetize_by` do bazy. Stan „brak mapy + `wc`" na torze B
to artefakt reużycia środowiska. **Zweryfikowane przez orkiestrację
niezależnie:** wolumen `aai_wp_b_db_data` powstał **2026-09-05**, czyli
w poprzedniej fali — dzisiejszy `postaw.sh` go REUŻYŁ, więc tor B **nie jest
dziewiczą instalacją**.

**KONSEKWENCJA DLA ROLI WDR:** `postaw.sh` z nową nazwą stosu nie daje
instalacji od zera, dopóki istnieje wolumen o tej nazwie. WDR ma sprawdzić,
czy obcy człowiek zainstaluje produkt u siebie — musi więc albo wymusić
dziewiczy wolumen, albo jawnie zapisać, że tego nie zmierzył.

**Krytyk BE: ODRZUCAM**, pięć powodów, wszystkie o dowodzie — w tym trzy
klasy powtórzone z wcześniejszych odrzuceń tej fali (werdykt z lektury,
werdykt zbiorczy z komunikatu narzędzia, „NIE DOTYCZY" chowające zmianę
w zakresie). Krytyk **obalił własną deklarację roli o zakresie**: raport
podawał 66 plików „zgodne z definicją", zmierzone tą samą komendą daje **68**
— czyli pozycja `KON-R1`, której rola nie zgłosiła. Zmierzył też WSZYSTKIE
pięć kluczy „brak = nie ruszaj" (rola deklarowała „4 z 5") i **żadnego
werdyktu roli nie obalił** — jeden poprawił własnym wstrzykiem
(`RENAME TABLE wp_aai_sklep_sections` → kontrola kod 1, po przywróceniu 22
wiersze i kod 0).

### RYZYKO METODYCZNE — audyt mutacyjny na dzielonym mouncie

Krytyk BE zgłosił rzecz, która dotyczy przebiegu, nie produktu: **rola BE
uruchomiła audyt mutacyjny w oknie 22:33–00:15**, czyli równolegle z pracą
BD i INT na torze B, który montuje **te same pliki wtyczek**. Zakaz wszedł
dopiero od roli INT, po odrzuceniu BD.

**Ocena orkiestracji:** okno ekspozycji na pojedynczą mutację jest krótkie
(narzędzie przywraca plik po każdej), ale ryzyko fałszywego pomiaru u BD
i INT jest realne i nie da się go dziś rozstrzygnąć wstecz. **Bilansu fali
to nie zmienia — obie te prace i tak zostały ODRZUCONE przez krytyków
z innych powodów**, więc nie stoją jako mocny dowód. Pozycja idzie do
`WYNIK.md` jako ograniczenie metody, a rola QA dostanie pytanie, czy audyt
mutacyjny na współdzielonym bind mouncie może zafałszować równoległy pomiar.

| ARCH | B | 23:37 → 00:05 | W1 9 z 25 commitów, 16 ujawnionych jako niedomknięte; W2 7/7 szwów; kandydat OBALONY | **ODRZUCAM** — wniosek prawdziwy, dowód nie dowodzi tezy |
| SEC | A | 00:52 → 01:05 | W1 4 pozycje (hasła, wyciek lekcji, kolektor CSP, sufit dziennika); W2 8 publicznych wejść zmierzonych żądaniem, „zero nowych klas" | w toku |


**Krytyk ARCH: ODRZUCAM — ale mechanizm potwierdził WŁASNĄ drogą.** To jest
najlepsza jak dotąd praca krytyka w tej fali: pokazał, że **test roli nie mógł
zawieść** (skasowała `tutor_option`, ale nie `tutor_version`, przez co gałąź
`Tutor::tutor_activate()` była nieosiągalna), a mimo to sam wykonał właściwy
test — `monetize_by='tutor'` → deaktywacja → aktywacja → mapa z wartością
`'tutor'`, deaktywacja oddaje `'tutor'`. **Cykl zamyka się na wartości
prawdziwej: w produkcie nie zostaje niedomknięta naprawa, zostaje niedomknięty
dowód.** Wykonał też test, którego rola odmówiła (`MAR-A-07`): zmiana nazwy
tabeli changelogu → kontrola kod 1 z właściwym komunikatem, po przywróceniu
kod 0.

### DRUGI DEFEKT OPRZYRZĄDOWANIA — `grep --include` w kontenerze

Zmierzone przez krytyka ARCH i **potwierdzone niezależnie przez orkiestrację**:
w kontenerach WP `grep -rl "tutor_option" --include="*.php" …` zwraca **0**,
a ta sama komenda bez `--include` — **70**. Każdy pomiar roli oparty na
`--include` w kontenerze **mierzył ciszę, nie stan**. Przekazywane odtąd
wszystkim rolom razem z defektem `git ls-files` i klamr.

### RYZYKO METODYCZNE, DRUGIE WYSTĄPIENIE — mutacja PLIKU przy zajętym drugim torze

Rola SEC dowiodła zamknięcia wycieku lekcji, wstrzykując `throw` do pliku
wtyczki. Dowód jest dobry, ale **pliki wtyczek montują OBA tory**, a w tym
oknie pracował krytyk ARCH na torze B. Mój pierwotny zakaz mówił „nie
uruchamiaj audytu mutacyjnego" i rola go nie złamała — złamany został nie
zakaz, tylko jego intencja.

**Poprawka od roli PRIV wzwyż:** zakaz brzmi „audyt mutacyjny **i wszelkie
mutowanie PLIKÓW wtyczek**", a jednocześnie jest **jawnie zawężony** — bazy
torów to osobne wolumeny (`aai_wp_b_db_data` vs `aai_wp_db_data`), więc
operacje na własnej bazie, zmiany nazw tabel, deaktywacja wtyczek
i wstrzykiwanie usterek przez opcje i mety **są dozwolone**. Powód zawężenia:
krytyk ARCH wykazał, że poprzednia rola użyła szerokiego zakazu **jako wymówki**
do niewykonania bezpiecznego testu bazodanowego.

| PRIV | B | 01:10 → 01:57 | W1 **6/6 NAPRAWIONE** (wyzwalacze SQL blokujące DELETE/UPDATE); W2 R1–R6 + R90, **nowe znalezisko PRIV-90** | w toku |
| PERF | A | 01:35 → 01:52 | W1 MAR-A-22 i MAR-A-23 **NAPRAWIONE** pomiarem `SAVEQUERIES`, z kontrolą pozytywną; W2 10 tras, brak N+1 | w toku |
| REPO | — (bez toru) | 02:05 | w toku | — |


**Krytyk SEC: ODRZUCAM pracę, NIE wnioski.** Odtworzył wszystkie cztery
pozycje W1 samodzielnie i każda jest naprawiona naprawdę. Dwie rzeczy z jego
pracy są wzorcowe i warto je powtarzać w kolejnych falach:

1. **Kontrola pozytywna zamiast samego „404".** Rola pokazała, że wyciek 73
   lekcji daje dziś 404 — a krytyk zauważył, że **404 to też stan zdrowy przy
   zepsutym pomiarze**. Wyłączył więc `aai-sklep` i zmierzył: kanał RSS oddał
   **200 / 135 113 B / 10 `<item>`** z prawdziwymi tytułami lekcji; po włączeniu
   404 / 905 B / 0. Dopiero to dowodzi, że zamek działa. Sprawdził dodatkowo
   dziewięć dróg alternatywnych — czyste.
2. **Obalił wymówkę „nie dało się zmierzyć bezpiecznie".** Rola nie odtworzyła
   sufitu dziennika w obawie o dane dowodowe; krytyk zmierzył to BEZ ryzyka
   (68 → 72 → 68 przy `MAX(id) = 200170`) i pokazał, że **stara arytmetyka
   skasowałaby wszystkie 68 wierszy właściciela**, a nowa ich nie rusza.
   „Nie dało się" wymaga dowodu tak samo jak „działa".

Dołożył też kierunek pominięty przez rolę: maskowanie hasła dla konta
ISTNIEJĄCEGO, ekran administratora (345 644 B, zero trafień na sekrety)
i CSRF bez nonce'a → **403** przy niezmienionym stanie.

**Zarzut proceduralny wobec roli SEC:** wstrzyknęła `throw` do pliku wtyczki
montowanego przez oba tory, gdy na torze B pracowała inna rola — dokładnie to
ryzyko, które opisano akapit wyżej.

### TRZECI DEFEKT OPRZYRZĄDOWANIA — komenda niezmiennika w protokole

Zgłoszone przez krytyka SEC, **potwierdzone przez orkiestrację**: komenda
z sekcji „FALA KONTROLNA PO 0.78.0" wyklucza wyłącznie `audyt`, więc na gałęzi
sektora daje **86**, nie 0 — bo nie wyklucza `re-audyt/`. Poprawna postać
(ta z pamięci projektu) to `git diff main --name-only -- . ':!audyt'
':!re-audyt' | wc -l` → **0**. Zmierzone obie: 86 kontra 0. Orkiestracja
od początku używała poprawnej, więc niezmiennik fali jest utrzymany —
ale **dokument protokołu podaje komendę, która zawsze zawiedzie**.

### OBSERWACJA SPOZA ODRZUCENIA — do rozstrzygnięcia w raporcie

Krytyk SEC zmierzył, że kolektor CSP **cicho gubi właściwy format Reporting
API** (`[{"body":…}]` → 204 i zero w dzienniku serwera). Waga niska: kolektor
żyje w mu-pluginie warsztatu, a `npm run pakuj` go nie bierze, więc do klienta
nie jedzie. Pozycja do `WYNIK.md`, nie do naprawy w sektorze.


**PRIV — metoda dowodu warta powtórzenia.** Rola użyła **wyzwalaczy SQL
blokujących pojedyncze zapytanie** (`BEFORE DELETE`/`BEFORE UPDATE`
z `SIGNAL`) — czyli tej samej techniki, którą powstała klasa napraw `0.78.0`.
Dzięki temu pokazała, że `sprzataj()` i `dostawa_wynik()` **naprawdę
zgłaszają** niepowodzenie, zamiast meldować sukces. Przy okazji złapała
własny fałszywy wynik, bo pierwszy odczyt szedł przez `| tail`, który maskuje
kod wyjścia.

**PRIV wypełnił lukę SEC:** sufit dziennika logowań, którego rola SEC nie
odtworzyła na torze A w obawie o dane dowodowe, PRIV zreprodukował na torze B
— gdzie ta tabela jest PUSTA. Ta sama pozycja została więc zmierzona z dwóch
stron: krytyk SEC pokazał, że nowa arytmetyka nie rusza 68 wierszy
właściciela, a PRIV — że stara by je skasowała.

**NOWE ZNALEZISKO PRIV-90 (do rozstrzygnięcia przez krytyka):** polityka
prywatności obiecuje zapis „pełnego" User-Agenta, a kod świadomie ucina go do
191 znaków (zmierzone: UA 242 znaki → zapis 191). Rozjazd dokument↔kod, czyli
klasa, którą to repozytorium traktuje poważnie. **Nie jest to pozycja
`REA-PRIV-F1-001`** (tamta dotyczy ciasteczek) — krytyk ma sprawdzić
niezależność komendą.

**Incydent zgłoszony przez PRIV, ROZSTRZYGNIĘTY przez orkiestrację jako
artefakt testów, nie regresja:** `aai-platnosci sprawdz` przeszło 0→1 przy
stronach Tutora 309/310. Rola ARCH przyznała się do ich utworzenia przy
własnych testach deaktywacji Pluginu 2; po przywróceniu bazy strony nie
istnieją, a trzy kontrole dają kod 0 (zmierzone). Wcześniejsze skojarzenie
z „pustymi stronami Tutora 151/152" z P3a było MOJE i było błędne — pod tymi
identyfikatorami leżą na torze B lekcje kursu, co sprawdziłem zapytaniem.

**PERF — wzorzec kontroli pozytywnej.** Rola nie poprzestała na „zapytanie
występuje 1×": pokazała, że **inne zapytania na tej samej odsłonie wychodzą
2× i 3×**, czyli że jej metoda UMIE zobaczyć duplikat, gdy ten istnieje.
`MAR-A-23` zmierzony na koncie zalogowanym: sprawdzenie ukończenia 32 lekcji
to **1 zapytanie z `IN (…)`**, nie 82 wywołania. Dziennik nietknięty (68/37
przed i po), kod produktu czysty.

**Decyzja orkiestracji:** rolę REPO puszczam **bez toru, równolegle**
z krytykiem PERF — jej praca to `git`, `grep` i strażniki, więc nie dotyka
instalacji WordPressa. Zakaz bramek WP i audytu mutacyjnego dostała wprost,
razem z poleceniem, by liczby wymagające bramek brać z wyników ról tej fali
i **oznaczać je jako źródło wtórne**, albo wpisywać do „Niedomknięte".
Trzeci defekt oprzyrządowania (komenda niezmiennika w PLAN-BUDOWY) trafił
do jej zakresu jako pozycja do zbadania — to dokument obiecujący liczbę,
której własna komenda nie oddaje.

### SPROSTOWANIE ORKIESTRACJI — „trzeci defekt oprzyrządowania" był ŹLE ZLOKALIZOWANY

Rola REPO **obaliła moją własną tezę** i ma rację. Sprawdzone komendą:

| Miejsce | Komenda | Wynik |
|---|---|---|
| `audyt/PLAN-BUDOWY.md:5617` — **krok 1 protokołu tej fali** | z `':!audyt' ':!re-audyt'` | **0** — poprawna |
| `audyt/PLAN-BUDOWY.md:5207` — inna, wcześniejsza sekcja | bez `':!re-audyt'` | 86 |
| **`CLAUDE.md:1268`** | bez `':!re-audyt'` | **86** |

**Fakt (86 kontra 0) był prawdziwy — moje przypisanie go protokołowi fali było
błędne.** Przyjąłem zgłoszenie krytyka SEC, zweryfikowałem samą liczbę i NIE
sprawdziłem, w której sekcji stoi cytowana komenda. To ta sama klasa, za którą
ta fala odrzuca role: **dowód potwierdzający liczbę, ale nie tezę**. Rolom od
PERF wzwyż przekazałem tę tezę w niepoprawnej postaci — sprostowana od roli QA.

**Zostaje jednak realny rozjazd, którego role NIE MOGŁY znaleźć:** zapis
w `CLAUDE.md:1268` deklaruje, że niezmiennik sektora „musi dać 0", a podana
tam komenda daje dziś **86**, bo powstał katalog `re-audyt/`. Role nie czytają
CLAUDE.md z definicji, więc zgłasza to orkiestracja.

**REPO — wynik.** W1: 8 z 10 pozycji tury dokumentacyjnej `v0.70.0`
NAPRAWIONE i zweryfikowane komendą. Dwa **nowe drobne znaleziska**:
1. **`wordpress/` liczy dziś 137 plików, README deklaruje 136** — naprawa
   z `0.70.0` była poprawna w chwili wydania, plik
   `class-aai-sklep-zaleznosci.php` doszedł później (`v0.67.0`) i nikt nie
   zaktualizował sekcji „Gdzie co leży". **Żaden strażnik tego nie pilnuje.**
2. **`rejestr/znane-bledy.json` ma pole `"wersja": "0.25.0"`** mimo wpisów aż
   do `BLAD-030` (2026-08-30) — bez zdefiniowanego kontraktu i bez strażnika.

Rozjazd zakresu roli (81 wobec 79 z baseline'u) **wyjaśniony i słusznie NIE
zgłoszony jako `KON-R1`**: dwa dokumenty planów powstały po dacie pomiaru.

### ZNALEZISKO O PRODUKCIE — katalog jest N+1 w liczbie kursów

**Zgłoszone przez krytyka PERF, z dowodem uruchomieniowym.** To pierwsze
znalezisko tej fali dotyczące ZACHOWANIA produktu, nie dowodu ani dokumentu.

Rola PERF zmierzyła 10 tras i orzekła „żadna nie wykazuje N+1", odkładając
skalowanie do „Niedomkniętych" jako ryzykowne dla danych. Krytyk **obalił tę
wymówkę i pokazał bezpieczną drogę**: kursy da się oznaczyć znakiem już przy
wstawianiu. Wstawił 20 wierszy ze slugiem `smoke-krytyk-perf-%`:

| Liczba kursów w bazie | Zapytań na `/szkolenia/` |
|---|---|
| 2 (stan bazowy) | **71** |
| 22 (20 dołożonych) | **90** |

W dzienniku zapytań: **`20× SELECT product_id FROM wp_aai_platnosci_powiazania
WHERE course_uuid = …`** (`class-aai-platnosci-zapis.php:654`) — po jednym na
kurs. Po usunięciu po znaku: 71, 71, 71 (trzy przebiegi).

**Wniosek „żadna trasa nie wykazuje N+1" trzyma się WYŁĄCZNIE przy dwóch
kursach w bazie.** Instalacja właściciela ma dziś dwa, więc dziś to nie boli
— ale koszt rośnie liniowo z katalogiem, a katalog ma rosnąć.

**Drugie ustalenie krytyka: dowód roli przy `MAR-A-23` dotyczył czego innego.**
Rola przypisała naszej metodzie zapytanie `SELECT COUNT(umeta_id) … IN (…32
klucze…)`, które w rzeczywistości pochodzi z **Tutora**
(`tutor/classes/Utils.php:760`) i jest na stronie niezależnie od naprawy.
Nasza ścieżka to `get_user_meta()` — zimny pomiar daje **+0 zapytań**, a
kontrola pozytywna (czyszczenie cache'u met przed każdą lekcją) **+32**, czyli
instrument widzi to, czego nie ma. **Werdykt NAPRAWIONE krytyk obronił WŁASNYM
pomiarem** (licznik wywołań przez filtr `get_user_metadata`: 33/33/33 na Kursie
2 i 42/42/42 na Kursie 1 — jeden przelot, nie 65/83).

### ZNALEZISKO O REPOZYTORIUM — trzy nieprawdziwe liczniki, strażnik milczy

**Zgłoszone przez rolę REPO jako JEDNA pozycja, powiększone przez jej krytyka
do TRZECH, zweryfikowane niezależnie przez orkiestrację co do sztuki:**

| Katalog | README deklaruje | `git ls-files` | |
|---|---|---|---|
| `wordpress/` | 136 | **137** | rozjazd |
| `wordpress/wtyczki/aai-sklep/` | 88 | **89** | rozjazd |
| `wordpress/wtyczki/aai-monitor/` | 22 | 22 | zgodne |
| `wordpress/wtyczki/aai-platnosci/` | 18 | **19** | rozjazd |
| `public/` | 15 | 15 | zgodne |
| `modules/` + `lib/` | 34 | 34 | zgodne |
| `app/` + `components/` | 73 | 73 | zgodne |

**`node tools/straznicy/straznik-readme.mjs` → kod 0** przy trzech nieprawdach.
Blok sam zapowiada się jako „Drzewo zmierzone, nie przepisane (`git ls-files`)",
więc **kontrakt istnieje** — nie pilnuje go żaden strażnik.

**Najciekawsze ustalenie krytyka:** rozjazd `aai-platnosci` 18→19 **był
nieprawdą już w chwili wydania `v0.70.0`** (`git ls-tree v0.70.0` → 19,
a `git diff v0.69.0 v0.70.0 -- README.md` podnosi wyłącznie `wordpress/`
i `docs/`). Czyli tura dokumentacyjna, która te liczniki naprawiała, poprawiła
dwa i **zatrzymała się nad nimi** — dokładnie ten precedens, którym rola się
posługiwała w swoim własnym raporcie. Rola powtórzyła go, zgłaszając „jedno
świeże" zamiast policzyć wszystkie pozycje bloku.

**Krytyk REPO obalił też atrybucję roli** (plik `class-aai-sklep-zaleznosci.php`
nie doszedł w `v0.67.0`, tylko commitem `358796c`, pierwszy tag `v0.75.0`) —
rola nie wykonała komendy `git log --diff-filter=A`, którą miała nakazaną.
Drugie „nowe" znalezisko roli (pole `wersja` w rejestrze błędów) **nie jest
nowe** — to pozycja rozstrzygnięta w fali 1, z lepiej policzonym zasięgiem.

**Krytyk potwierdził też niezależnie sprostowanie orkiestracji** o komendzie
niezmiennika: wariant dający 86 stoi w sekcji jawnie oznaczonej „Zapis
historyczny", a krok 1 protokołu tej fali jest poprawny.

**PIK — 9 z 11 obietnic klienckich NAPRAWIONE z dowodem.** Rola pracowała bez
toru (oba zajęte), więc pozycje wymagające żywej instalacji **jawnie oznaczyła
jako źródło wtórne** zamiast przepisywać cudze werdykty jako własny pomiar —
to jest dokładnie to, czego wymagało polecenie, i różni ją od ról odrzuconych
w tej fali. Potwierdzone m.in.: kurs ukryty zostaje kupującemu z etykietą
„Kurs wycofany ze sprzedaży — Twój dostęp zostaje", zamek wycieku 73 lekcji
jest **pierwszy** w kolejce rejestracji, kasa nie powołuje się na nieistniejący
regulamin, a strony sprzedażowe nie obiecują ebooków, wideo ani gwarancji
zwrotu — czyli obietnice świadomie wycofane przez właściciela pozostają
wycofane.

**TRZY LUKI FALI wskazane przez PIK — żadna rola ich nie zmierzyła
uruchomieniowo.** Zlecone krytykowi PIK, gdy zwolni się tor:
1. **Z-9** — hamulec C2 przy kursie, który ma kupującego, **i kopią w koszu**;
2. **hamulec C2** jako taki — potwierdzony w tej fali wyłącznie czytaniem kodu;
3. **C3** — zdanie „dostęp zaraz po zaksięgowaniu wpłaty": tekst jest na
   stronie, ale **mechanizm dynamiczny za nim** (bramka pytająca instalację
   o włączone metody płatności) nie został przez nikogo sprawdzony.

Wszystkie trzy dotyczą obietnic składanych KLIENTOWI, więc idą do domknięcia,
a nie do „Niedomkniętych" raportu.

**FE — 6/6 NAPRAWIONE, każda z kontrolą pozytywną, „Niedomknięte: brak".**
Potwierdzone m.in. `MAR-A-24`: klik NAPRAWDĘ odhacza lekcję, a podstawiony zły
nonce daje jawne odrzucenie — czyli sprawdzono SKUTEK, nie obecność formularza
w HTML (usterka polegała właśnie na tym, że HTML był poprawny).

**NOWE ZNALEZISKO FE-90 — narzędzie naprawcze pada, gdy jest potrzebne.**
`npm run wp:zrzuty` to dokumentowane remedium na brakujące zrzuty w lekcjach.
`tools/wgraj-zrzuty-wp.mjs:44` woła `wp aai-sklep sprawdz --format=json` przez
`execFileSync` **bez `try/catch`**, a ta kontrola od `v0.76.0` (naprawa
`MAR-A-28`) celowo zwraca **kod 1**, gdy brakuje choćby jednego zrzutu.
`execFileSync` rzuca przy niezerowym kodzie — więc narzędzie przerywa dokładnie
w sytuacji, dla której istnieje. Potwierdzone strukturalnie przez orkiestrację
w kodzie, uruchomieniowo przez rolę. **Klasa: naprawa zepsuła sąsiada** —
`MAR-A-28` zmieniła kontrakt kontroli i nikt nie sprawdził jej konsumentów.

### USP — ustalenie, które WYJAŚNIA wszystkie rozjazdy zakresu tej fali

**Bazowe liczby „Ma zwrócić N" w definicjach ról SAME zostały policzone
zepsutym narzędziem** (brace-glob) 2026-09-01. Realne liczebności: BD 25→**35**,
INT 16→**22**, FE 59→**68**. Czyli role, które sumiennie składały zakres ręcznie
i zgłaszały `KON-R1`, porównywały się z liczbą, która była zaniżona u źródła.
Defekt dotyka **3 ról = 6 z 80 definicji** w `.claude/agents/`.

**KOREKTA MOJEJ WŁASNEJ TEZY — druga w tej fali.** Przekazywałem rolom, że
`grep --include` w kontenerze „zwraca ZERO trafień zawsze". USP zmierzył
dokładniej i ma rację: to **kod wyjścia 2** z komunikatem `grep: unrecognized
option: include=*.php` (BusyBox nie zna tej opcji). Zweryfikowane przez
orkiestrację: `KOD=2`, komunikat dosłowny. **Zera nie widać dlatego, że
narzędzie milczy — widać je dlatego, że ja stłumiłem `stderr`** przez
`2>/dev/null` we własnym pomiarze. Narzędzie ogłasza swój błąd; to pomiar go
zagłuszył. Dobra wiadomość: w `tools/` jest **zero** wystąpień `--include`
kierowanych do kontenera, więc defekt dotyczy komend doraźnych, nie kodu repo.

**TRZECIE MIEJSCE niepełnego niezmiennika — tym razem BEZ oznaczenia
historycznego:** `docs/PLAN-NAPRAW-PO-POLOWANIU.md:13` niesie
`git diff main --name-only -- . ':!audyt'` w prozie o niezmienniku sektora.
Zweryfikowane przez orkiestrację. To dokument na `main`, nie zapis historyczny
— czyli jedyne z trzech miejsc, które naprawdę wprowadza w błąd.

**Pozostałe ustalenia USP:** `pakuj-wtyczki.mjs` daje **bit-identyczne** paczki
w dwóch przebiegach i poprawnie ODMAWIA (kod 1) przy podmienionej treści
(kontrola pozytywna na kopii, nie na źródle); strażniki i audyt mutacyjny są
instrumentem stabilnym (452/450/0/0 identycznie w dwóch przebiegach);
`tools/pomiar-lighthouse.mjs` celuje domyślnie w adres GitHub Pages i nie mierzy
`total-byte-weight` — pozycja spoza trzynastu wydań, zgłoszona jako
NIENAPRAWIONA.

### FE-90 URASTA — udokumentowana droga odtworzenia danych jest przerwana

**Krytyk FE zmierzył szerzej niż rola i podniósł wagę.** Przy **zerze** zrzutów
— czyli w stanie świeżej instalacji — `wp aai-sklep sprawdz` daje kod 1 z 64
ostrzeżeniami, a `wp:zrzuty` pada tak samo jak przy jednym brakującym pliku.
Skutek: **łańcuch udokumentowany w README:616**

```
npm run wp:import && npm run wp:sync && npm run wp:zrzuty
```

**nie może się powieść od `v0.76.0`** — nie tylko jako naprawa po awarii, ale
jako normalna droga postawienia danych od zera. Zweryfikowane przez
orkiestrację: łańcuch faktycznie stoi w README (linia 616) jako procedura
odtworzenia.

**Obejścia brak** — narzędzie pada PRZED utworzeniem manifestu, więc ratunek
podany przez rolę (wywołanie podkomendy WP-CLI z manifestem) działa wyłącznie
dzięki manifestowi z wcześniejszego UDANEGO przebiegu; świeża instalacja go nie
ma. Krytyk musiał złożyć manifest ręcznie.

**Trzy dalsze zarzuty krytyka wobec roli FE, wszystkie obalone pomiarem:**
1. `KON-R1` — liczba 68 poprawna, ale **przyczyna podana fałszywie**: 57
   z baseline'u to artefakt tego samego defektu `{a,b}`, który rola wymienia
   cztery linie wyżej (na commicie z 2026-09-01 zakres dawał 66, a bez
   dziewięciu plików `includes/` — dokładnie 57). Realny przyrost to **+2 pliki
   `.htaccess`**. To potwierdza ustalenie USP z innej strony;
2. „`tutor()->` … 0 trafień" **fałszywe dla własnego zakresu** — są 4 odwołania
   do właściwości obiektu Tutora (osłonięte `?? 'courses'`, więc nie czynna
   usterka, ale zdanie jest nieprawdziwe, nie ostrożne);
3. badanie przewijania poziomego odpowiadało **o metryce, nie o zjawisku**
   (`html { overflow-x: clip }`: `scrollWidth` = 900, ale `scrollX` po
   przewinięciu = 0), a strony sprzedażowej nie zmierzono wcale — więc
   „Niedomknięte: brak" nie było uczciwe.

**Na korzyść roli:** sześć werdyktów W1 krytyk odtworzył sam i wszystkie się
bronią, a `MAR-A-24` domknął **dowodem w bazie** (`_tutor_completed_lesson_id_76`
po kliknięciu; przy złym nonce odmowa i BRAK wiersza) — czyli mocniej, niż
zrobiła to rola.

### WDR — dwie pozycje priorytetowe POTWIERDZONE i jedno nowe znalezisko

**(A) `postaw.sh` nie wykrywa reużycia wolumenu.** Kod nie ma ŻADNEJ gałęzi
sprawdzającej pochodzenie wolumenu; uruchomienie na pustych i na zapełnionych
daje **identyczny output**. Operator nie ma jak odróżnić dziewiczej instalacji
od odziedziczonej — a właśnie to zafałszowało pomiar roli ARCH w tej fali
(uznała brak opcji za usterkę produktu; okazało się, że to artefakt reużycia).

**(B) Łańcuch odtworzenia danych — potwierdzony w warunkach naturalnych,
z ROZSZERZONYM zasięgiem.** WDR sprawdził WSZYSTKIE 6 wywołań
`wp aai-sklep sprawdz` w `tools/`:

| Plik | Zachowanie przy braku zrzutów |
|---|---|
| `tools/wgraj-zrzuty-wp.mjs:44` | **crash** przed złożeniem manifestu — obejścia brak |
| `tools/smoke/smoke-wp-front.mjs:121` | **crash** (potwierdzone uruchomieniowo) |
| `tools/smoke/smoke-wp-kreator.mjs` | **crash** (identyczny kod, niepotwierdzone osobno) |
| `tools/sprawdz-import-wp.mjs:67` | łapie wyjątek, ale melduje mylące „czy środowisko stoi?" |
| `tools/smoke/smoke-wp-seo.mjs` | czytelna obsługa |
| `tools/smoke/smoke-wp-dane.mjs` | bezpieczny |

Czyli zmiana kontraktu kontroli z `v0.76.0` przerwała nie tylko udokumentowaną
drogę odtworzenia danych, ale i **dwie bramki** — na świeżej instalacji padają
z niezrozumiałym komunikatem.

### NOWE ZNALEZISKO WDR-90 — odinstalowanie Pluginu 1 kasuje dane Pluginu 2

**Potwierdzone uruchomieniowo przez rolę (produkty 159/160 skasowane)
i strukturalnie przez orkiestrację w kodzie.**

`wordpress/wtyczki/aai-sklep/uninstall.php:71-76` wybiera wpisy do skasowania
zapytaniem `SELECT post_id FROM wp_postmeta WHERE meta_key = '_aai_zrodlo_uuid'`
— **bez filtra `post_type`**. Tego samego klucza używa Plugin 2 dla produktów
WooCommerce (`save_post_product`, `class-aai-platnosci-zapis.php:984`), przy
czym **Plugin 2 broni się filtrem `post_type = 'product'`, a Plugin 1 nie
filtruje wcale** — w kodzie Pluginu 2 stoi nawet komentarz ostrzegawczy o tym
współdzielonym kluczu.

Skutek: pełne (opt-in) odinstalowanie Pluginu 1 kasuje produkty należące do
Pluginu 2, a `wp_aai_platnosci_powiazania` zostaje z widmowymi identyfikatorami.
**Klasa: naruszenie granicy między wtyczkami** — czyli fundamentu tej
architektury („jedna wtyczka nie dotyka cudzych danych"). Operacja jest opt-in,
więc nie zdarzy się przypadkiem, ale jest udokumentowaną drogą dla klienta.

**Wszystkie 6 pozycji W1 roli WDR: NAPRAWIONE, każda z testem negatywnym** —
w tym `Requires Plugins` blokujące aktywację, deaktywacja oddająca 404 zamiast
utrwalonych tras, `npm run pakuj` odmawiające nadpisania paczki i odinstalowanie
zgodne z deklaracją.

**Stan toru B:** postawiony OD ZERA, celowo **0/148 zrzutów** — to dowód
pozycji (B), nie bałagan. Tor A nietknięty.

### QA — ostatnia rola, z wyłącznością. Odpowiedzi na trzy pytania fali

Rola dostała wyłączność (żadna inna nie pracowała na plikach), więc jako
JEDYNA mogła uruchomić audyt mutacyjny. Wynik: **450 z 452 złapanych, 0
martwych, 0 przeoczonych** — identycznie jak deklaruje CHANGELOG. Przegoniła
też osobiście **15/15 bramek WP** z liczbami co do sztuki zgodnymi ze stanem
wyjściowym `0.78.0`.

**1. Czy audyt mutacyjny na wspólnym mouncie fałszuje równoległy pomiar? TAK
— empirycznie.** Zmierzone: `opcache.revalidate_freq = 2`, `enable_cli = Off`
(WP-CLI widzi mutację natychmiast), a w realnym teście na `katalog.php`
**10 z 40 równoległych żądań HTTP trafiło w 106-milisekundowe okno mutacji
i zobaczyło zmutowaną treść**. Moja wcześniejsza ocena („okno krótkie, ryzyko
realne, wstecz nierozstrzygalne") była zbyt łagodna: ryzyko jest MIERZALNE
i wynosi ćwierć żądań w oknie. **To ograniczenie metody tej fali** — dotyczy
prac BD i INT z okna 22:33–00:15, obu i tak ODRZUCONYCH przez krytyków
z innych powodów. Zakaz wprowadzony po pierwszym odrzuceniu okazał się
konieczny, nie ostrożnościowy.

**2. Czy zmiana kontraktu kontroli w `v0.76.0` miała jakiegokolwiek
pytającego? NIE.** Trzy z sześciu narzędzi wołających `wp aai-sklep sprawdz`
przerywają bez `try/catch`, a `straznik-tutora.mjs` pilnuje wyłącznie strony
PRODUKUJĄCEJ kontrakt — nie jego konsumentów. Zmiana przeszła bez ani jednej
bramki po stronie odbiorców.

**3. Liczniki README — LUKA REGUŁY, nie świadome wyłączenie.** Docblock
`straznik-readme.mjs` wymienia dwa świadome wyłączenia (wersje, linki)
i **nie wymienia liczników drzewa plików**. QA policzyła wszystkie 12 pozycji
bloku „Gdzie co leży": **3 rozjazdy przy kodzie 0** — zgodnie z pomiarem
orkiestracji.

**Nowe znalezisko QA-R5:** `tools/smoke/smoke-wp-monitor.mjs:838` — generator
pierwszego identyfikatora odsłony jest deterministyczny, więc koliduje
(UNIQUE) z resztkami przerwanego wcześniejszego przebiegu i daje **mylący
komunikat bez wskazania przyczyny**. Zreprodukowane dwukrotnie; po usunięciu
przyczyny 184/184. To ta sama rodzina co „bramka ubita limitem czasu zostawia
ślady, a następny przebieg pada na cudzych śmieciach".

### DROBNY ROZJAZD W SAMYM PROTOKOLE FALI

Protokół podaje w stanie wyjściowym **„testy 83/83"**, a rzeczywisty stan
`0.78.0` to **84/84** — zmierzone przez orkiestrację (`npm test` kod 0) i
zgodne z CHANGELOG 0.78.0 (linie 236 i 367; liczba 83 pochodzi z wpisów
sprzed 0.73.0). Protokół mówi „każda liczba NIŻSZA = regresja albo brud", więc
błąd był w bezpieczną stronę i żadna rola nie wzięła 84 za regresję.

### Krytyk WDR: ODRZUCAM — ale KOREKTA IDZIE W STRONĘ CIĘŻSZĄ

To najpoważniejszy wynik fali. Krytyk nie osłabił tez roli — **wzmocnił je**,
obalając przy tym jej własny kwantyfikator.

**Nie „trzy z sześciu", tylko SZEŚĆ z SZEŚCIU.** Rola opisała
`tools/smoke/smoke-wp-dane.mjs:85` jako „bezpieczny wzorzec — NIE crashuje",
w kolumnie zatytułowanej „Wynik uruchomieniowy". Zmierzone przez krytyka:
**EXIT=1, surowy stos Node** — helper łapie wyjątek, ale wołający rzuca
bezwarunkowo linię niżej, a komunikat `sprawdz padł:` kończy się **pustką**,
bo drukuje `stderr`, gdy powód poszedł na `stdout`. Upada więc i kwantyfikator
„sprawdziłem WSZYSTKICH 6 wywołań" (dwa nie były uruchomione), i wniosek
„dwie z trzech bramek".

**PĘTLA ONBOARDINGU JEST ZAMKNIĘTA, NIE TYLKO PRZERWANA — znalezisko własne
krytyka, zweryfikowane przez orkiestrację.** `postaw.sh` — **rozkaz kroku
zerowego każdego testu ręcznego** — ma od `v0.75.0` punkt kontrolny
(`postaw.sh:408`: `if ! powod="$(wpcli aai-sklep sprawdz 2>&1)"; then blad …`),
więc na świeżej instalacji sam kończy **EXIT=1**, a jako lekarstwo drukuje
„Uruchom `npm run wp:zrzuty`" — **jedyną komendę, która crashuje**. Nowa
instalacja nie daje się postawić własną udokumentowaną drogą, a narzędzie
kieruje człowieka do komendy, która pada.

**WDR-90: PRAWDZIWE, zasięg POLICZONY, waga ŚREDNIA — i to doprecyzowanie jest
ważne.** Krytyk odtworzył kasowanie inną drogą (produkty 2 → 0) i policzył
zasięg zamiast go szacować: `_aai_zrodlo_uuid` siedzi na **89 wpisach czterech
typów** (`courses` 2, `topics` 12, `lesson` 73, **`product` 2**), nic poza tym.
Mocniejszy dowód niż podała rola siedzi w dwóch stopkach: `aai-sklep/uninstall.php`
obiecuje „ZOSTAWIA ZAWSZE… produkty WooCommerce", a `aai-platnosci/uninstall.php`
odmawia ich kasowania, powołując się na niezmiennik 13. **Właściciel produktów
ich nie rusza; kasuje je sąsiad, który się do tego nie przyznaje.**
**Granica, którą rola pominęła:** opcji `aai_sklep_kasuj_dane_przy_usuwaniu`
**nie ustawia w repo ANI JEDEN ekran** — zweryfikowane przez orkiestrację:
występuje wyłącznie w `uninstall.php` (docblock, odczyt, kasowanie), a docblock
obiecuje „w ustawieniach", których nie ma. **Drogi klikającego klienta więc nie
ma**, a samoleczenie z `MAR-A-11` odtwarza katalog — trwale traci tylko historia
zamówień Woo.

**ROLA WDR ZŁAMAŁA ZAKAZ MUTACJI PLIKÓW.** Jej dwa testy negatywne (`pakuj`,
mutacja `AAI_SKLEP_WERSJA`) wymagały zmiany `aai-sklep.php` — pliku
podmontowanego także do toru A. Krytyk **odmówił ich certyfikacji**, bo sam
zakazu nie łamie, i odnotował to wprost. Przy zmierzonym oknie ryzyka (10 z 40
żądań w 106 ms) to nie jest formalność.

### Krytyk PIK: ODRZUCAM za arytmetykę — ale TRZY LUKI DOMKNIĘTE, wszystkie NAPRAWIONE

| Luka | Dowód uruchomieniowy |
|---|---|
| **hamulec C2** | bez zgody → **ODMOWA** „ma 1 kupującego", kurs ocalał; **kontrola negatywna** (0 kupujących → PRZESZŁO) dowodzi, że test umiał zawieść; ze zgodą → PRZESZŁO, hak niósł liczbę `1`; panel: 2 z 4 formularzy pyta, po dodaniu kupującego **2→3** |
| **C2 z kopią w koszu** | scena udowodniona (`post_status => 'any'` → **0**, zapisy żyją), `kupujacy()` = 1, odmowa z liczbą, panel dalej pyta |
| **C3** | zdanie jest **statyczne i słusznie** — dynamiczna jest bramka. Wstrzyknięcie fałszywej obietnicy publicznym filtrem → **kod 1, dokładnie 2 sprawdzenia z 90**; po dorejestrowaniu bramki natychmiastowej ta sama strona → **88/88, kod 0** |

Ostatni wiersz to najlepszy pojedynczy dowód tej fali: bramka **zapala się na
nieprawdzie i sama się rozluźnia**, gdy nieprawda przestaje nią być.

**Defekt planu fali wykryty przez krytyka:** protokół zalicza PIK do ról „bez
toru", a jej rundy R1 i R6 **wprost wymagają żywej instalacji** — to było
źródło wszystkich trzech luk, nie niedbalstwo roli.

**Dryf toru A wykryty przez krytyka i naprawiony przez orkiestrację:** zastał
87 logowań (bazowo 68) i **3 kursy zamiast 2** — ślad `smoke-kreator-kurs` po
przerwanej bramce. Po `--przywroc=k78-baza`: **68 / 37 / 2**, zero śladów
`smoke`, trzy kontrole kod 0.

### Krytyk USP: ODRZUCAM — ale UDOWODNIŁ ustalenie roli WPROST

Rola pokazała liczby DZISIEJSZE; dowodu, że baseline policzono zepsutym
narzędziem, nie było. Krytyk zrobił go na commicie z 2026-09-01: komenda
z klamrą oddaje wtedy **BD 25, INT 15, FE 57 — dokładnie deklaracje „Ma
zwrócić N", co do jedynki**. Poprawne wtedy: 35 / 21 / 66; dziś 35 / 22 / 68.

> **Samokontrola nie mogła zadziałać, bo obie strony porównania pochodzą
> z tego samego defektu.**

Policzył też uniwersum miejsc niepełnego niezmiennika: **trzy, czwartego nie
ma** (dwa pozostałe trafienia to opis defektu i celowa mutacja w audycie).
Potwierdził, że `--include` w `tools/` występuje 2 razy, **oba na plikach
hosta, zero do kontenera**.

### CZWARTY DEFEKT OPRZYRZĄDOWANIA — `--wyjscie=` cicho ignorowane

Znalezione przez krytyka USP **w jego własnym zakresie**, zweryfikowane
uruchomieniowo przez orkiestrację: `tools/pakuj-wtyczki.mjs:297` czyta
przełącznik wyłącznie w formie `--wyjscie <ścieżka>` (`indexOf` + następny
argument). Forma `--wyjscie=<ścieżka>` przechodzi **bez ostrzeżenia**,
narzędzie kończy **kodem 0** i pisze do repozytoryjnego `paczki/`. Zmierzone:
katalog docelowy pusty, `paczki/` z czterema archiwami. Skutek dla fali:
kontrola pozytywna roli USP, wykonana „na kopii w scratchpadzie", **nie mogła
dać kodu 1** — mierzyła nie to, co deklarowała. (Ślad orkiestracji po tym
teście usunięty; `paczki/` jest poza gitem.)

### Domknięcie fali — strażnik zablokował commit orkiestracji i MIAŁ RACJĘ

Przy zapisie wyników `pre-commit` odrzucił commit: **`straznik-readme`
zgłosił cztery wiersze tabel z niezgodną liczbą komórek** w plikach
`ARCH.md:85`, `PIK.md:35`, `PROTO.md:47`, `REPO.md:18` — czyli dokładnie
regułę 9 z `v0.70.0`, **którą ta fala weryfikowała jako naprawioną**.

Ironia jest pouczająca: role opisujące defekty dokumentów **same je
popełniły**, a reguła złapała to natychmiast, na cudzych plikach, poza
README. To najlepszy dowód skuteczności tej reguły, jaki fala mogła
dostarczyć — mocniejszy niż jakikolwiek pomiar celowy.

**Naprawa dotyczyła FORMATU, nie treści** (orkiestracja nie edytuje werdyktów
ról): w trzech plikach zaescapowano `|` wewnątrz kodu inline, w `ARCH.md:85`
wstawiono brakujący separator kolumn między „Wynik" a „Dowód" — **cała treść
wiersza zachowana**. Po naprawie `straznik-readme` kod **0**.
