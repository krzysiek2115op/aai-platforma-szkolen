# RAPORT KOŃCOWY — SEKTOR RE-AUDYT, FALA 1

> **Autor: rola `RAP` sektora RE-AUDYT (agent `rea-rap`), 2026-09-05.**
> Rola nie ma narzędzia `Write` ani `Edit`; plik powstał komendą powłoki, na wyraźne
> polecenie agenta uruchamiającego. Odpowiednik z sektora AUDYT
> (`audyt/wyniki/RAPORT-F1-AUDYT.md`) zapisał orkiestrator, bo tamta rola takiego
> polecenia nie dostała — brak nośnika raportu jest przedmiotem `AUD-RAP-F1-001`.
> Ten raport **nie proponuje napraw** (W2, zasada nadrzędna 2): sektor znajduje
> i wskazuje.

**Wszystkie liczby niżej pochodzą z komend podanych obok nich, uruchomionych
2026-09-05 po zamknięciu dwudziestu pozostałych ról.** Żadna nie jest przepisana
z dziennika przebiegu ani z meldunku innej roli. Trzy liczby dziennika, które
sprawdziłem i które okazały się nieprawdziwe, są nazwane w sekcji 5.

---

## 1. Liczby

`RAP-R6`: `node audyt/tools/status.mjs --pokaz` przed rozpoczęciem raportu — **20 z 21
ról sektora RE-AUDYT ma status ZAKOŃCZONE**, dwudziesta pierwsza to `RAP` (ta rola).
Żadna rola nie została pominięta.

| Rzecz | Wartość | Skąd |
|---|---|---|
| Plików `*.json` w `audyt/zgloszenia/` | **225**, wszystkie `fala: 1` | odczyt katalogu po polu `fala` |
| **Wpisy PRÓBNE (wyłączone z każdej liczby niżej)** | **3** — `AUD-PIK-F1-001`/E6, `REA-SEC-F1-001`/E7, `REA-SEC-F1-002`/E7 | `polacz-sektory.mjs --fala=1`, nota `pominięte wpisy PRÓBNE` |
| Wpisów nie-próbnych fali 1 | **222** (sektor audyt **124**, sektor re-audyt **98**) | odczyt katalogu, pole `sektor` |
| Wpisów wg przedrostka identyfikatora | `AUD-*` **125**, `REA-*` **100** | odczyt katalogu |
| Statusy wpisów re-audytu | **57 ZWERYFIKOWANE · 41 DO WERYFIKACJI** | pole `status` |
| Werdykt krytyka (re-audyt) | **PRZEPUSZCZAM 41 · ODRZUCAM 22 · brak 35** | `werdykt.mjs --pokaz`, pole `werdykt.krytyk` |
| Werdykt weryfikatora (re-audyt) | **ISTNIEJE 75 · ODRZUCONE 12 · brak 11** | pole `werdykt.weryfikator` |
| Potwierdzone dwustronnie (PRZEPUSZCZAM + ISTNIEJE) | **35** | oba pola naraz |
| Miejsce liniowe / mechanizm (re-audyt) | **43 / 55** | pole `miejsce.rodzaj` |
| Różnych plików, w które celuje re-audyt | **49** | pole `miejsce.plik` |

**Te same werdykty policzone RAZEM Z PRÓBAMI dają 76 ISTNIEJE i 13 ODRZUCONE.**
Różnica to dokładnie dwa wpisy próbne etapu E7. Podaję obie liczby, bo obie krążą
po dokumentach sektora, a różnią się metodą, nie danymi.

### Miejsca, nie wpisy

Wpis nie równa się miejscu: dziewięć wpisów opisuje miejsce, które opisał już inny wpis.

| Rzecz | Wartość | Skąd |
|---|---|---|
| **Różnych miejsc (haszy) w fali 1** | **213** przy 222 wpisach | `polacz-sektory.mjs --fala=1` → `miejsc razem: 213` |
| Potwierdzone przez **oba** sektory | **4** | ta sama komenda |
| Tylko audyt | **118** | ta sama komenda |
| Tylko re-audyt | **91** | ta sama komenda |
| Różnych miejsc audytu / re-audytu osobno | **122 / 95** | przeliczenie haszy per sektor |

### Gdzie sektor patrzył

Podział wpisów re-audytu wg katalogu, w którym leży wskazane miejsce:

| Obszar | Wpisów |
|---|---|
| **Aparat audytu** (`audyt/*`, `re-audyt/*`) | **57** |
| Narzędzia repozytorium (`tools/straznicy`, `tools/smoke`) | 15 |
| **Produkt: wtyczki WordPressa** (`wordpress/wtyczki/*`) | **15** |
| Produkt: środowisko i README WP | 3 |
| Dokumentacja (`docs/*`) | 4 |
| Prototyp Next.js | 3 |
| `rejestr/znane-bledy.json` | 1 |

**Pięćdziesiąt siedem z dziewięćdziesięciu ośmiu wpisów re-audytu (58%) dotyczy
narzędzi i definicji samego audytu, a osiemnaście — produktu WordPressowego.**
Sektor AUDYT ma ten sam rozkład (70 z 124, czyli 56%, w aparacie). To jest liczba
o zakresie pracy, nie ocena: obie fale zbadały głównie własne stanowisko pomiarowe.

### Wpisy wg działu (re-audyt, bez prób)

`PSIARZ 13 · KIER 10 · WALID 8 · KON 7 · PERF 6 · PRIV 5 · SKUT 5 · ARCH 4 · INT 4 ·
PROTO 4 · SEC 4 · STRAZ 4 · WDR 4 · FE 3 · QA 3 · RAP 3 · REPO 3 · USP 3 · BE 2 ·
PIK 2 · BD 1`

---

## 2. Status wpisu składa się z DWÓCH niezależnych ocen — i w dziesięciu wypadkach się rozeszły

Krytyk roli ocenia **dowód i pracę roli**; weryfikator (`WALID`) ocenia **istnienie
zjawiska**. To są różne pytania, więc rozejście nie jest sprzecznością procesu.

**Dziesięć wpisów re-audytu ma werdykt krytyka ODRZUCAM przy werdykcie weryfikatora
ISTNIEJE:** `REA-KIER-F1-007`, `REA-KON-F1-003`, `REA-PSIARZ-F1-001`, `-004`, `-006`,
`-007`, `-008`, `-010`, `REA-REPO-F1-002`, `REA-STRAZ-F1-003`.
(W sektorze AUDYT takich wpisów są dwa: `AUD-ARCH-F1-002`, `AUD-REPO-F1-008`; jeden
wpis ma rozejście odwrotne — `AUD-FE-F1-003`, PRZEPUSZCZAM przy ODRZUCONE.)

**Dwadzieścia dwa wpisy re-audytu noszą status `ZWERYFIKOWANE`, mając co najmniej
jeden werdykt odrzucający; dwanaście z nich ma odrzucające OBA.** Status pyta
o obecność werdyktów, nie o ich wartość (`komplet()` w `werdykt.mjs:94`, przedmiot
`AUD-RAP-F1-003`). Czytelnik, który weźmie samo słowo `ZWERYFIKOWANE` za
potwierdzenie znaleziska, pomyli się w 22 wypadkach na 57.

**Liczba znalezisk re-audytu potwierdzonych po obu stronach wynosi 35.**

---

## 3. Powtórzone miejsca: osiem grup, dziewięć nadmiarowych wpisów

| Hasz | Wpisy | Plik |
|---|---|---|
| `515c6afe` | `AUD-ARCH-F1-002` + `REA-ARCH-F1-002` | `wordpress/wtyczki/aai-monitor/includes/class-aai-monitor-zapis.php` |
| `2ed53243` | `AUD-GOLD-F1-003` + `REA-KIER-F1-002` | `audyt/tools/status.mjs` |
| `a3e39974` | `AUD-PRIV-F1-002` + `REA-PRIV-F1-002` | `wordpress/wtyczki/aai-platnosci/includes/class-aai-platnosci-kasa.php` |
| `7811eda6` | `AUD-REPO-F1-009` + `REA-WDR-F1-002` | `wordpress/README.md` |
| `f71004b1` | `AUD-KON-F1-021` + `AUD-WDR-F1-005` | `audyt/ROLE.md` |
| `c6022e27` | `AUD-PERF-F1-004` + `AUD-SEC-F1-002` | `…/class-aai-monitor-wizyty.php` |
| `72b51cd1` | `REA-PSIARZ-F1-008` + `REA-QA-F1-001` | `tools/straznicy/straznik-obietnic.mjs` |
| `2c4e967b` | `REA-PSIARZ-F1-009` + `REA-STRAZ-F1-003` + `REA-USP-F1-001` | `tools/straznicy/straznik-readme.mjs` |

Cztery pierwsze grupy są **międzysektorowe** — to jest właśnie ten stan, dla którego
istnieje hasz miejsca: audyt i re-audyt trafiły w to samo. Cztery ostatnie są
**wewnątrzsektorowe** (2 w audycie, 2 w re-audycie) i tam to samo miejsce liczy się
dziś dwa albo trzy razy w rachunku po wpisach.

**Dziewiąta grupa istnieje tylko z próbą:** `REA-SEC-F1-001` (PRÓBA E7) ma hasz
identyczny z `REA-SEC-F1-003`, czyli próba etapu E7 została w fali złożona ponownie
jako wpis prawdziwy. Po odsianiu prób grup jest **osiem**, nie dziewięć.

---

## 4. Plik `audyt/wyniki/polaczone-f1.json` — co z nim zrobiłem i czego nie umie

**Zastałem go z wartością `razem: 199` (oba 4 · tylko audyt 118 · tylko re-audyt 77),
przy katalogu dającym w tej samej chwili 210 miejsc.** Rozjazd wziął się z 23 wpisów
złożonych po ostatnim przebiegu narzędzia.

**DECYZJA: odświeżyłem plik** — `node audyt/tools/polacz-sektory.mjs --fala=1`, kod 0.
Powód: to jedyny maszynowy nośnik wyniku fali, a `polacz-sektory.mjs` jest krokiem 3
procedury tej roli; przeliczenie jest pomiarem, nie zmianą cudzego werdyktu.
Kopię stanu sprzed przeliczenia zachowałem poza repozytorium i jej liczby cytuję wyżej.
**Kodu narzędzia nie tknąłem.** Plik niesie dziś `razem: 213 · oba 4 · tylko audyt 118 ·
tylko re-audyt 91`.

**Liczby z tego narzędzia są obarczone dwiema wadami zmierzonymi w tej fali i nie
wolno podawać ich jako czystych:**

1. **Gubi pięć wpisów po cichu.** Mapa po haszu trzyma jeden wpis audytu i jeden wpis
   re-audytu, więc drugi wpis o tym samym haszu W OBRĘBIE SEKTORA nadpisuje pierwszy —
   bez licznika i bez słowa w wyjściu (`REA-KIER-F1-006`, ZWERYFIKOWANE).
   Zmierzone dziś na odświeżonym pliku: w artefakcie jest **217 z 222** wpisów
   nie-próbnych; brakuje `AUD-KON-F1-021`, `AUD-PERF-F1-004`, `REA-PSIARZ-F1-008`,
   `REA-PSIARZ-F1-009`, `REA-STRAZ-F1-003`. Liczba MIEJSC (213) jest przy tym
   poprawna — gubione są wpisy, nie miejsca.
2. **Wybiera innego reprezentanta hasza niż `porownaj-cykle.mjs`.** Dla hasza
   powtórzonego to narzędzie zostawia wpis ostatni, a `porownaj-cykle.mjs` pierwszy
   (`REA-KON-F1-005`, ZWERYFIKOWANE). Skutek zmierzony przez weryfikatora przy
   `REA-STRAZ-F1-003`: adnotacje walidatora „to jedno miejsce, nie trzy” siedzą na
   wpisach, które z artefaktu wypadają, a wpis zachowany (`REA-USP-F1-001`) niesie
   uzasadnienie „hasz nie pokrywa się z żadnym innym wpisem obu sektorów” — wydane,
   zanim powstały dwa pozostałe wpisy tego hasza. **Artefakt mówi więc dziś
   o unikalności tego miejsca nieprawdę i nie ma pola, po którym dałoby się to
   zauważyć bez ponownego przeliczenia katalogu.**

Trzecia wada tego samego artefaktu — brak chwili powstania i rozmiaru wejścia, przez
który kopia przestarzała jest nie do odróżnienia od świeżej — jest przedmiotem
własnego zgłoszenia tej roli, `REA-RAP-F1-003`.

---

## 5. Trzy liczby w dzienniku przebiegu, które są nieprawdziwe

Sprawdzone własnym przeliczeniem katalogu i drzewa git, nie przepisane z cudzego wpisu.

1. **`audyt/PLAN-BUDOWY.md:2879` (i to samo zdanie w linii 2721): „Werdykty walidatora
   (jego przebieg) — 53 wpisy: 43 ISTNIEJE, 10 ODRZUCONE, 0 bez werdyktu”.**
   Prawdziwa liczba dla przebiegu z 2026-09-04 (blok 17:32–18:19Z) po odsianiu prób to
   **51 wpisów: 42 ISTNIEJE, 9 ODRZUCONE**. Liczba 53 powstaje z doliczenia dwóch
   wpisów próbnych etapu E7 — w tym werdyktu wydanego **2026-09-01T22:47:26Z**, czyli
   trzy dni przed tym przebiegiem i w ramach próby, nie fali.
2. **Ta sama tabela dziennika, wiersz wyżej („PRZERWANIE CZWARTE”, `PLAN-BUDOWY.md:2875`):
   „Wpisów w sektorze — 199 (audyt 125 + re-audyt 74)”.** W drzewie commita
   zamykającego tamten stan (`c40352e`) jest **125 plików `AUD-*` i 75 plików `REA-*`**,
   czyli **200**, nie 199.
3. **Komunikat commita `c40352e`: „Wpisów `REA-*`: 27 → 74 (199 w sektorze)”.**
   `git ls-tree -r --name-only c40352e -- audyt/zgloszenia` daje **75** plików `REA-*`.

Rozjazd jest jednokierunkowy: dziennik liczy z próbami tam, gdzie sektor liczy bez nich,
a raz podaje liczbę o jeden mniejszą od zawartości własnego commita.
Wpis `REA-KIER-F1-007`, który zgłosił punkt 1, ma werdykt krytyka **ODRZUCAM** i werdykt
weryfikatora **ISTNIEJE**; powyższe liczby przeliczyłem sam i powołuję się na własny
pomiar oraz na werdykt weryfikatora, nie na sam wpis.

---

## 6. CZEGO RE-AUDYT FALI 1 NIE SPRAWDZIŁ

To jest wynik roli, nie jej porażka. Wszystko niżej jest zmierzone.

### 6.1 Pozycje zamknięte jako niedomknięte

`node audyt/tools/status.mjs --pokaz` — cztery role zostawiły otwarte pozycje:

- **`WALID-R2`** (walidator) — „czy dowód uruchomieniowy daje się powtórzyć”.
  Dla dziesięciu wpisów `PSIARZ` dowodem jest **mutacja śledzonego pliku produktu**,
  a definicja weryfikatora daje mu `Bash` bez `Write` i `Edit`. Drugiego przebiegu
  **nie było**; zastąpiono go rozstrzygnięciem statycznym. Konflikt narzędzi opisuje
  `REA-WALID-F1-006` (krytyk PRZEPUSZCZAM, bez weryfikatora).
- **`KIER-R3`** — komplet werdyktów. Nieosiągalny z budowy sektora: wpisy własne
  krytyków nie mają krytyka, wpisy o weryfikatorze nie mają weryfikatora
  (`REA-KIER-F1-008`).
- **`KIER-R4`** — tabela granic. Brakujące wiersze wymagają decyzji spoza sektora
  (`REA-KIER-F1-005`, `REA-KON-F1-003`).
- **`USP-90`** — pozycja otwarta Pogłębiacza USP.
- **`PSIARZ`** zamknął rundę 1 z **dziewiętnastoma pozycjami CUDZYCH ról** w polu
  `niedomkniete`: `PRIV-R1`, `PRIV-R2`, `PRIV-90`, `WDR-R5`, `WDR-R6`, `WDR-90`,
  `KIER-90`, `PIK-R6`, `PROTO-R2`, `PROTO-R6`, `ARCH-R4`, `USP-R6`, `SEC-R5`, `INT-R2`,
  `FE-R4`, `BE-R6`, `QA-R2`, `REPO-R1`, `REPO-R5`. Narzędzie stanu przyjmuje dowolny kod
  o poprawnym kształcie, bez sprawdzania, czy należy do roli zapisującej
  (`REA-PSIARZ-F1-013`). **Dziewiętnaście pozycji jest więc zapisanych jako otwarte
  w cudzym imieniu, a role, których dotyczą, mają status ZAKOŃCZONE bez uwag.**

Pliki stanu ról **nie niosą powodu** otwartej pozycji — tylko jej kod. Powód każdej
z nich istnieje wyłącznie w meldunku sesji, który nie jest artefaktem repozytorium.

### 6.2 Zakresy, które nie obejmują produktu

**Pogłębiacz `BD` (baza danych i migracja) nie ma w zakresie ANI JEDNEGO pliku PHP
wtyczek WordPressa** — człon jego komendy celujący w warstwę tabel, zapisu, importu
i odczytu zwraca zero plików (`REA-KON-F1-001`, ZWERYFIKOWANE). Dział zamknął falę
z **jednym** wpisem, a ten jeden wpis nie mówi nic o warstwie danych produktu.

### 6.3 Działy audytu bez odpowiednika w re-audycie

Sektor RE-AUDYT ma **14 Pogłębiaczy**: `SEC FE BE BD QA PERF ARCH INT PRIV REPO WDR
PROTO PIK USP`. Sektor AUDYT ma ponadto działy **`GOLD`** i **`WER`**, które
w re-audycie **nie mają żadnego odpowiednika** — ich **dwanaście** wpisów fali 1
(`GOLD` 6, `WER` 6) nie zostało przez re-audyt ani pogłębione, ani zmierzone co do
zasięgu. Dodatkowo wszystkie pięć pozycji działu `WER` sektora AUDYT
(`WER-01…WER-05`) zostało zamkniętych jako **niedomknięte** przy suficie pięciu rund.

### 6.4 Miejsca znane audytowi, nieznane re-audytowi

**118 z 213 miejsc fali 1 zna wyłącznie sektor AUDYT.** Re-audyt trafił w to samo
miejsce co audyt **cztery razy**. Wśród nienadgonionych są miejsca **potwierdzone
dwustronnie przez audyt**: `REA-KON-F1-002` (ZWERYFIKOWANE) wymienia z nazwy
**21 zgłoszeń audytu o PRODUKCIE ze statusem ZWERYFIKOWANE, PRZEPUSZCZAM i ISTNIEJE,
po których w re-audycie fali 1 nie ma żadnego śladu** — ani wpisu o tym samym haszu,
ani wpisu o tym samym pliku.

### 6.5 Powtarzalność — główna obietnica metody — nie została zmierzona

`node audyt/tools/porownaj-cykle.mjs --sektor=re-audyt` → **kod 1**, komunikat:
„fala 1 = 98 zgłoszeń, fala 2 = 0; brak fali 2 (ani wpisu, ani roli ze stanem
ZAKOŃCZONE). Porównanie wymaga obu fal.” To samo dla sektora audyt (kod 1, fala 1 =
124). Kod 1 znaczy tu **brak fali**, nie defekt audytu (K4″).

**Konsekwencja dla `RAP-R4`: rozjazdu fal nie da się dziś NAZWAĆ.** Wynik `ZGODNE`,
`NADZBIÓR` ani `SPRZECZNE` nie istnieje w żadnej z dwóch stron, bo drugiej strony nie
ma. Wszystko, co ten raport podaje, opisuje **jeden przebieg**, i nie odpowiada na
pytanie, czy drugi przebieg znalazłby to samo. Uruchomienie fali 2 wymaga osobnego
zielonego światła właściciela.

Dwie rzeczy, które o powtarzalności **już wiadomo bez fali 2**, obie ze statusem
ZWERYFIKOWANE: wynik re-audytu **zależy od kolejności ról** — cztery role własne
i ich krytycy złożyli wpisy po tym, jak `WALID` zapisał ZAKOŃCZONE
(`REA-KON-F1-004`); oraz reprezentant powtórzonego hasza zależy od **kolejności
alfabetycznej kodów działów** (`REA-KON-F1-005`).

### 6.6 Wpisy bez oceny — granica metody, nie zaniedbanie

- **Jedenaście wpisów re-audytu nie ma werdyktu weryfikatora.** Osiem to zgłoszenia
  samej roli `WALID` (`REA-WALID-F1-001…008`) — **walidator nie weryfikuje siebie,
  a drugiego weryfikatora sektor nie ma**. Trzy pozostałe to zgłoszenia tej roli
  (`REA-RAP-F1-001…003`), złożone po zamknięciu `WALID`: **wpisy roli ostatniej nie
  mogą zostać zweryfikowane wewnątrz własnej fali.**
- **Trzydzieści pięć wpisów re-audytu nie ma werdyktu krytyka.** W większości są to
  własne zgłoszenia krytyków ról — nikt nie ocenia pracy krytyka. Liczba dotyczy
  wyłącznie sektora re-audyt; w sektorze audyt takich wpisów jest 28.
- Adnotacja `REA-KIER-F1-004` mówiła o **33 wpisach bez weryfikatora**; była prawdziwa
  w chwili pomiaru (2026-09-04, przed rundą 2 walidatora) i jest dziś nieaktualna —
  druga runda `WALID` wydała **36 werdyktów** (33 ISTNIEJE, 3 ODRZUCONE) i zamknęła tę
  lukę do jedenastu.

### 6.7 Rzeczy poza zakresem obu sektorów w tej fali

- **Kursy** — poza zakresem sektora z rozstrzygnięcia budowy.
- **Prototyp Next.js** — 3 wpisy re-audytu; serwer `:3001` był ubity od zakończenia
  roli `PROTO`, więc pozycja `PROTO-R6` nie miała czego mierzyć.
- **Wartości początku i końca RE-AUDYTU.** `node audyt/tools/migawka-wartosci.mjs
  --porownaj` daje dziś **kod 1** i wypisuje ten sam rozjazd, który opisał raport
  sektora AUDYT (logowania 21→26, wizyty 17→30, dostawy 0→6, changelog 1447→1491,
  media 1348/32 040 025 B → 1343/31 888 625 B). **Ten pomiar nie mówi nic o re-audycie**:
  migawka `po` pochodzi z zakończenia sektora AUDYT i nie została od tego czasu
  nadpisana. Migawka „po” dla re-audytu powstaje po tej roli, w protokole orkiestratora.

---

## 7. Co sektor zostawił nietknięte

| Kontrola | Wynik | Komenda |
|---|---|---|
| Niezmiennik sektora | **0 zmienionych plików** | `git diff main --name-only -- . ':!audyt' ':!re-audyt'` |
| Środowisko `:8892` | **kod 0**, stan bazowy | `node audyt/tools/srodowisko.mjs --sprawdz --fala=1` |
| Liczniki żywej bazy wobec zrzutu `f1-baza` | **równe** | ta sama komenda, punkt „liczniki żywej bazy” |
| Pięć wtyczek aktywnych | `aai-monitor, aai-platnosci, aai-sklep, tutor, woocommerce` | ta sama komenda |

Dowodem roli `PSIARZ` była w tej fali **mutacja śledzonych plików** — tak opisuje ją
`REA-WALID-F1-006` dla dziesięciu wpisów `REA-PSIARZ-F1-001…010`. Zmierzony dziś
niezmiennik wynosi **0**, czyli po tych mutacjach nie został w drzewie żaden ślad.

Dane właściciela w tabelach monitoringu (**26 logowań, 30 wizyt**) są nietknięte:
ta rola nie pisała do bazy, nie wykonywała zrzutów i nie przywracała bazy.

---

## 8. Własne zgłoszenia tej roli

Trzy, wszystkie z pozycji własnej checklisty, wszystkie o narzędziach, z których raport
bierze liczby. Hasze sprawdzone po całym katalogu przed złożeniem — zero kolizji.

| ID | Pozycja | Miejsce | Rzecz |
|---|---|---|---|
| `REA-RAP-F1-001` | RAP-R1 | `audyt/tools/werdykt.mjs`, blok `--pokaz` | Wypis 459 225 bajtów kończy się `process.exit(0)`; przez POTOK gubi część danych bez ostrzeżenia i z kodem 0. Zmierzone: 10 przebiegów przez potok → **jeden oddał 221 934 bajty (48%)**, 10 przebiegów z przekierowaniem do pliku → wszystkie pełne. Ten sam potok policzył wiersze zgłoszeń raz jako 140, raz jako 170, przy prawdziwych **222**. |
| `REA-RAP-F1-002` | RAP-R5 | `audyt/tools/status.mjs`, licznik `ZGŁOSZEŃ W SEKTORZE` | Jedyny licznik zgłoszeń w sektorze liczy wpisy PRÓBNE razem z wynikiem fali i nie dopisuje o tym słowa; `polacz-sektory.mjs` i `porownaj-cykle.mjs` robią odwrotnie. Dwie liczby o tej samej fali, jedno milczenie o metodzie. |
| `REA-RAP-F1-003` | RAP-R1 | `audyt/tools/polacz-sektory.mjs`, obiekt zapisywany do `polaczone-f<N>.json` | Artefakt wyniku nie ma ani chwili powstania, ani rozmiaru wejścia, więc kopia przestarzała jest nie do odróżnienia od świeżej. Zmierzone w tej fali: plik twierdził „199 miejsc”, gdy katalog dawał 210. |

Żadne z tych trzech zgłoszeń nie ma jeszcze werdyktu — patrz punkt 6.6.

---

## 9. Pozycje niedomknięte tej roli

**Brak.** Checklista `RAP-R1…R6` przejdzona w całości.
`RAP-R4` jest **odpowiedziana, nie pominięta**: rozjazd fal nie da się nazwać, bo
fala 2 nie istnieje, i jest to stan procesu potwierdzony kodem wyjścia narzędzia
(punkt 6.5), a nie luka w pracy roli.
