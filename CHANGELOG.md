# Dziennik zmian

Format wg [Keep a Changelog](https://keepachangelog.com/pl/1.1.0/),
wersjonowanie [SemVer](https://semver.org/lang/pl/). Najnowszy wpis na górze.
Pierwszy nagłówek wersji w tym pliku jest **źródłem prawdy o wersji projektu**
— pilnuje tego `tools/straznicy/straznik-wersji.mjs`.

## [0.58.0] — 2026-08-31

### T4 zaliczone — poprawki z testu ręcznego właściciela

**Plugin 3 (`aai-monitor`) przeszedł test ręczny na czterech ścieżkach**
(2026-08-31). Przebieg, liczby i decyzje:
[TEST-RECZNY-T4.md](docs/plugin-3/TEST-RECZNY-T4.md).

Test zachował się dokładnie tak, jak miał: **wyciągnął rzecz, której nie
widziała żadna z 14 bramek WP**, a jednocześnie **dwa zgłoszenia okazały się
poprawnym zachowaniem** i zostały zamknięte pomiarem zamiast naprawą.

### Zmienione

- **Każdy kafelek niesie własny okres** (decyzja właściciela **T4-D1**).
  Pod kafelkami stało zdanie „Kafelki liczą wszystko od początku pomiaru”,
  a drugi kafelek nazywał się wprost „Nieudane próby (7 dni)” — jedno zdanie
  opisywało cztery liczby, z których jedna liczy się inaczej, więc o niej
  kłamało. Teraz każda liczba ma pod sobą swój okres („od początku pomiaru”
  albo „ostatnie 7 dni”), a wspólne zdanie mówi już wyłącznie o tym, gdzie
  szukać okna czasu — czyli o tym, co w nim było prawdą.
  **Okresu NIE WOLNO zdjąć w imię zwięzłości:** cofnęłoby to naprawę A3
  z przeglądu T3, po której liczby przestały nazywać się samymi „Odsłony”
  i „Sesje” (właściciel czytał je wtedy jako ruch dzisiejszy).

### Naprawione w dowodach

- **Nic nie sprawdzało CIĄGŁOŚCI SESJI** — luka znaleziona w teście ręcznym,
  nie przez bramkę. `smoke-wp-monitor` pytał wyłącznie o DŁUGOŚĆ
  identyfikatora (32 znaki), czyli o to, czy sito go przepuści. Gdyby
  `idSesji()` przestało czytać `sessionStorage`, każda odsłona dostałaby
  świeży identyfikator: „Sesje” na ekranie zrównałyby się z „Odsłonami”,
  właściciel czytałby liczbę stron jako liczbę odwiedzających, a **wszystkie
  pozostałe sprawdzenia świeciłyby na zielono**. Trzy odsłony z jednej karty
  muszą mieć teraz JEDEN identyfikator; test negatywny (skasowany `getItem`)
  zapala dokładnie to sprawdzenie i tylko je.
- **Nic nie pilnowało napisów przy liczbach**, dlatego sprzeczność
  z kafelkami mogła powstać i przetrwać do testu ręcznego. Bramka liczy teraz
  NIEPUSTE podpisy okresu (tyle, ile kafelków) i odmawia powrotu wspólnego
  zdania o jednym okresie dla wszystkich.
- **SIÓDMY NAWRÓT PUŁAPKI „WZORZEC NA OBECNOŚĆ, NIE NA ROZSTRZYGNIĘCIE”** —
  i tym razem wpadła w nią reguła pisana w tym samym przeglądzie, który ją
  opisuje. Pierwsza wersja liczyła znaczniki `class="aai-monitor-okres"`,
  więc mutacja ustawiająca okres na PUSTY łańcuch przeszła na zielono:
  znacznik był, podpisu nie było. Wzorzec pyta teraz o treść między
  znacznikami. Poprzednie nawroty: 0.29.0 (nazwa metody), 0.44.0 (nazwa
  stałej), 0.47.0 (napis), c6c9c97, dwa razy w P4.

### Zamknięte pomiarem, BEZ zmiany kodu (dwa zgłoszenia z testu)

- **„Czas jest niższy niż na zegarku”** (18 s przy ~30 s czytania, 37 s przy
  ~60 s). Zmierzone rigiem na żywej instalacji: 30 s czytania bez przerwy →
  **30 130 ms** w bazie; 15 s + 10 s ukryte + 15 s → **30 016 ms**, czyli
  obie części czytania w środku, przerwa wycięta. **Zegar jest dokładny co do
  dziesiątych sekundy, a naprawa B1 z przeglądu T3 trzyma.** Właściciel
  przełączał pulpity — a zmiana pulpitu chowa okno tak samo jak przełączenie
  karty, więc liczby pokazywały prawdziwy czas WIDOCZNOŚCI, zgodnie z tym, co
  obiecuje podpis ekranu.
- **„Cztery sesje przy jednym oknie prywatnym”.** Zmierzone: cztery strony
  przeklikane w JEDNEJ karcie (katalog → kurs → lekcja płatna → lekcja
  darmowa) trzymają jeden identyfikator, także na trasach lekcji. Część
  adresów została otwarta z linków, czyli w nowych kartach — a nowa karta to
  z definicji nowa sesja („drzewo kart”, nie „osoba”), tak jak podpisano na
  ekranie.

### Higiena pomiarów

Każdy pomiar tej sesji dopisywał wiersze do tabel właściciela, więc każdy był
robiony od migawki `MAX(id)` i sprzątany po sobie — łącznie z wierszami po
logowaniach `curl`. Stan po teście wrócił co do wiersza do danych właściciela.

### Ustalone na następny krok (NIE wchodzi tutaj)

Właściciel zamówił rozbudowę ekranu i zdecydował (**T4-D4**), że to
**osobny krok** z własnym planem, pytaniami i zgodą — żeby nie mieszać
„naprawy tego, co zgłosił” z „nową funkcją” w jednym przeglądzie. Zakres
i uzasadnienie: TEST-RECZNY-T4.md, sekcja decyzji.

**KOREKTA (2026-08-31, po wydaniu tej wersji): właściciel odwołał ten krok**
— „zostawmy panel taki, jaki jest, najważniejsze informacje są". Ekran
zostaje w wersji 0.58.0, a zakres z TEST-RECZNY-T4.md jest zapisem
historycznym. Następny krok projektu to TEST CAŁOŚCI trzech wtyczek.

## [0.57.0] — 2026-08-31

### Naprawy z przeglądu T3 (2026-08-31)

**Przegląd pary agent+krytyk dał 21 znalezisk; dwadzieścia potwierdzono
URUCHOMIENIOWO, jedno obalono.** Naprawy w czterech turach, każda z testami
negatywnymi. Werdykt każdego znaleziska:
[docs/plugin-3/PRZEGLAD-T3.md](docs/plugin-3/PRZEGLAD-T3.md).

**Złe dane (tura 1):**

- **Czas aktywny urywał się przy pierwszym przełączeniu karty** — 1500 ms
  + przerwa + 4000 ms dawało w bazie `trwanie_ms = 1559`, choć ekran
  obiecuje „ile realnie czytali". Skrypt wysyła teraz beacon przy KAŻDYM
  zniknięciu karty, a jeden wiersz na odsłonę robi nowa kolumna `odslona`
  (32 hex) ze swoim UNIQUE. Po naprawie: 5530 ms, jeden wiersz. Czas
  i moment wejścia zmieniają się MONOTONICZNIE w SQL-u (`GREATEST`,
  `LEAST`), bo `sendBeacon` niczego nie obiecuje o kolejności dostarczenia.
- **Limiter nie był limitem „na minutę", tylko kumulacyjnym** —
  `set_transient` odnawia TTL przy każdym zapisie, więc okno nie kończyło
  się nigdy, dopóki przerwy były krótsze niż minuta (zmierzone: dwa beacony
  w odstępie 5 s przesunęły koniec okna o 5 s). Za wspólnym adresem jeden
  zapętlony klient gasił pomiar CAŁEJ witryny, przy kontroli kod 0. Okno
  jest kotwiczone do pełnej minuty zegara, a licznik rośnie WYŁĄCZNIE
  o beacony przyjęte — trzy odrzucone podnosiły go wcześniej do 3.
- **Sufit 4 h przesuwał MOMENT WEJŚCIA** — `wiek_ms` = 9 h dawał wejście
  „4 h temu", czyli wizytę w złej godzinie, a przy oknie „dziś" w złej
  dobie. Sufity są dwa i robią co innego: czas czytania PRZYCINAMY przy
  4 h, wiek ponad 30 dni ODRZUCAMY — przycięty wiek to zmyślony znacznik
  czasu, a nie niedokładność.
- **Strony bramki logowania liczyły się jako przeczytane lekcje** — gość na
  płatnej lekcji dostaje HTTP 200, skrypt pomiaru i zero prozy. Doszła
  kolumna `bramka`, a jej wartość wchodzi **do podpisywanego materiału**,
  więc beacon z podniesioną albo zdjętą flagą jest odrzucany. Odbicia
  zostają w tabeli (to jedyny ślad po kimś, kto chciał wejść i nie mógł),
  ale mają własną liczbę i własną listę. Monitoring nie wie, co jest
  bramką: pyta filtrem `aai_monitor_strona_za_bramka`, a odpowiada widok
  lekcji Pluginu 1.
- **Kafelki liczyły całą historię, sekcja pod nimi wybrane okno** — przy
  identycznym napisie „Odsłony". Kafelki mówią teraz „łącznie".

**Odporność (tura 2):** sufit **250 000 wierszy** w retencji ruchu
(decyzja właściciela: sufit tak, deduplikacja nie — nie zmieniamy znaczenia
liczb); handler na cudzym haku bez deklaracji typu (`do_action( …, null )`
rzucało TypeError PRZY WYWOŁANIU, poza zasięgiem `try`, i kładło cały
kokpit — sama wartość domyślna NIE wystarcza); liczba przysłana jako
łańcuch przestaje cicho stawać się zerem; sito pochodzenia zawodzi na
zamknięto.

**Dowody, które były pozorne (tura 3):** cztery reguły strażnika pytały
o OBECNOŚĆ NAZWY zamiast o rozstrzygnięcie (mutacje przechodziły na
zielono); wykluczenia administratora w wystrzale nie pilnowało NIC; asercja
o oknie ruchu przechodziła dla dowolnego okna; `straznik-higieny-smokow`
nie znał tabeli ruchu.

**Nieprawdy w kodzie (tura 4):** sól podpisu powstaje zapisem, który NIE
nadpisuje — `add_option()` pisze `INSERT … ON DUPLICATE KEY UPDATE`, więc
przy wyścigu kasował sól zwycięzcy, a jego strony były już w przeglądarkach
z podpisami liczonymi starą wartością; komentarz przy sprzątaniu wizyt
mówił o znaczniku, którego bramka nie używa (klasa BLAD-018).

**Decyzja właściciela (2026-08-30) wykonana:** kontrola porównuje
pochodzenie kokpitu (`admin_url()`) z pochodzeniem witryny (`home_url()`)
i **świeci kodem 1** przy różnicy — rozjazd czyni beacon żądaniem
cross-origin (403 na preflighcie, zero zapisów) przy kontroli meldującej
„w porządku".

**SZEŚĆ BŁĘDÓW POWSTAŁO W SAMYCH NAPRAWACH** i wszystkie wyszły z testów
negatywnych, nie z lektury: dwie ślepe reguły strażnika (jedna szukała
sygnatury w pliku rejestracji zamiast w klasie, druga uznawała za
rozliczenie każdą asercję w środku testu), blok pomiaru sufitu KASUJĄCY
CUDZE WIERSZE (przez co końcowy rachunek sumienia przestawał cokolwiek
znaczyć — po zdjęciu sprzątania bramka DALEJ świeciła na zielono), poprawka
zabierająca dwóm istniejącym asercjom ich zmienną, martwa asercja łapiąca
komunikat przez `ob_start()` mimo że `WP_CLI::error()` kończy proces, oraz
**dziewiąty nawrót pułapki „wzorzec na napis"** — tym razem w regule
napisanej PO opisaniu tej pułapki w tym samym przeglądzie.

**Stan dowodów:** `npm run check` kod 0 (strażnicy **37/37**), audyt
mutacyjny 273 → **288** (286 złapanych, 0 przeoczonych, 0 martwych),
`smoke-wp-monitor` 129 → **170 sprawdzeń**, czternaście bramek WP zielonych
(dane 30 · front 84 · tutor 44 · lekcja 39 · kreator 97 · panel 55 ·
płatności 23 · produkty 85 · zakup 41 · zwroty 39 · maile 62 · język 25 ·
motyw 91 · monitoring 170), proza **73/73 co do znaku**, kopia w Tutorze
**0 różnic**, kontrola kod 0.

---

### Krok T3 — timer wizyt (2026-08-30)

**Timer wizyt działa** — krok T3 zaakceptowanego schematu
([docs/plugin-3/DIAGRAM.md](docs/plugin-3/DIAGRAM.md)). Kontrola melduje
„Czujki: logowania, ruch", a ekran pokazuje, które strony są czytane i jak
długo. **Ten krok poprzedził AUDYT PLANU** na polecenie właściciela; audyt
znalazł sześć błędów krytycznych w planie, który sam napisałem, i wszystkie
zostały naprawione PRZED pierwszą linią kodu. Pomiary, znaleziska i lista
testów: [docs/plugin-3/KROK-T3.md](docs/plugin-3/KROK-T3.md).

### Dodane

- **`Aai_Monitor_Wizyty` — wystrzał**: akcja `admin-post.php` zarejestrowana
  **pod obiema nazwami** (`admin_post_nopriv_*` i `admin_post_*`), z nazwą
  w query stringu, czytająca ciało z `php://input` **strumieniem z sufitem
  1024 B**. Sito w kolejności wynikającej z kosztu: uprawnienie → typ ciała
  → pochodzenie → limiter → ciało. Odpowiedź **zawsze 204**, tak samo na
  przyjęcie i na odrzut.
- **`Aai_Monitor_Podpis` — dowód, że stronę wyrenderował WordPress.**
  Ścieżka nie jest sprawdzana pytaniem „czy taka trasa istnieje", tylko
  podpisem wydanym przy renderze, liczonym **własną solą z opcji**.
- **`Aai_Monitor_Pomiar` + `assets/pomiar.js`** — timer w przeglądarce:
  czas **aktywny** (zegar stoi przy ukrytej karcie), **jedna wysyłka na
  odsłonę**, reset na `pageshow.persisted`, wyłączenie przy
  `navigator.webdriver`, `sessionStorage` w `try/catch`, Blob
  `application/json`. Ścieżka i podpis przychodzą **z serwera** i wracają
  nietknięte.
- **Sekcja „Ruch" na ekranie**: okna dziś / 7 dni / 30 dni liczone od
  **północy czasu witryny**, podsumowanie (odsłony, sesje, czas łączny
  i średni) i dziesięć najczęściej oglądanych stron.
- **Kontrola** pyta o **obie** nazwy akcji przez rejestr haków (nigdy
  żądaniem HTTP — kontener CLI nie dosięga `:8892`) i o sól podpisu.
- **Wpis o pomiarze ruchu w polityce prywatności** — dwiema drogami, jak
  w T2: natywny mechanizm WordPressa i gotowy fragment w repo.

### Zmienione

- **Warstwa zapisu liczy moment wejścia z WIEKU beaconu**, nie z czasu
  trwania. Odkąd czas znaczy „aktywny", stara formuła zapisywałaby kartę
  czytaną dwie minuty i zamkniętą po ośmiu godzinach jako wejście sprzed
  chwili.
- **Schemat (§5, §7)**: sito ścieżki na podpisie zamiast `url_to_postid()`,
  obowiązkowy `Content-Type`, `wiek_ms` w kontrakcie, indeksy rozstrzygnięte
  pomiarem. Doszły fakty **F19–F24** i pułapki **P16–P19**.
- **`smoke-wp-monitor`: 76 → 129 sprawdzeń** i od teraz **wymaga
  `ZRZUTY_RIG`** — endpoint sprawdzony `fetch`em nie dowodzi niczego, bo
  odrzut wygląda tak samo jak przyjęcie.
- **`straznik-monitora-wp`: 13 → 18 reguł**, audyt mutacyjny **265 → 273**.
  Reguła N1 zawężona do ekranu (wystrzał MUSI mieć akcję) i w tym samym
  ruchu wzmocniona o kontrakt wystrzału.

### Naprawione

- **Ekran drukował dosłowne `&quot;`** w dwóch miejscach, w tym
  w komunikacie z kroku T1 — ta sama klasa co 29 podpisów w podglądzie
  kursów (0.34.0). Pilnuje tego teraz reguła strażnika.
- **Podawanie skryptu nie łapało `Throwable`**, choć biegnie przy renderze
  każdej strony frontu, także kasy. Złapał to strażnik z T2, nie recenzja.

### Liczby z pomiaru, nie z założenia

| Co | Wartość | Skąd |
|---|---|---|
| sufit ciała żądania | **1024 B** | realny najdłuższy beacon 168 B, maksimum kontraktu 270 B |
| sufit beaconów na minutę | **300** | sterowana przeglądarka wyciska 294 odsłony/min z jednego adresu |
| indeksy tabeli ruchu | **bez zmian** | pokrywające dają 34 ms na ekranie, a kosztują zapis 2,9× droższy i 33 MB |
| sufit czasu | 4 h, **przycinany** | uśpiona karta to nie atak |

### Zapamiętane pułapki

- **`url_to_postid()` nie rozpoznaje ani jednej naszej trasy** (zero dla
  katalogu, stron sprzedażowych, 73 lekcji i strony głównej).
- **Cross-origin beacon `text/plain` DOCHODZI, `application/json` nie** —
  ochrona wynika z wymogu typu, nie z sita na `Origin`.
- **`Origin` jest wysyłany także same-origin**, wbrew MDN.
- **`pagehide` i `visibilitychange` odpalają w tej samej milisekundzie**;
  powrót z bfcache przywraca stronę z zachowanym stanem JS.
- **Limit 64 KiB `sendBeacon` nie zadziałał** — beacon 70 kB doszedł
  w całości; tempo 26 363 beacony/s.
- **Strona 404 renderuje się dla dowolnego adresu**, więc podawanie tam
  skryptu rozdawałoby podpisy na zmyślone ścieżki.
- **Node trzyma połączenia keep-alive**, a Apache zrywa bezczynne —
  zerwane połączenie wygląda jak awaria endpointu, którą nie jest.
- **`goBack()` i `history.back()` przez BiDi nie działają** (timeout 30 s,
  adres bez zmian, zepsuta sesja), a strona z bfcache nie emituje `load`.

## [0.56.0] — 2026-08-30

**Dziennik logowań działa** — krok T2 zaakceptowanego schematu
([docs/plugin-3/DIAGRAM.md](docs/plugin-3/DIAGRAM.md)). Wtyczka po T1 miała
bazę i ekran, ale ani jednego producenta danych; kontrola meldowała wprost
„żadna czujka nie jest podpięta". Teraz melduje „Czujki: logowania", a ekran
pokazuje, kto i skąd wchodził na konta. **Ten krok nie dotyka pomiaru ruchu**
— beacon, `pomiar.js`, sito i limiter wchodzą w T3.

### Dodane

- **`Aai_Monitor_Logowania` — trzy haki rdzenia**, każdy w
  `try/catch ( Throwable )`: `set_logged_in_cookie` tworzy wiersz ze źródłem
  `sesja`, `wp_login` doprecyzowuje je na `formularz`, `wp_login_failed`
  zapisuje nieudaną próbę z podanym loginem — **nigdy z hasłem**. Gdy
  `wp_login` nie zastanie świeżego wiersza, tworzy własny: cudza wtyczka
  logująca programowo nie ma przepaść z dziennika bez śladu.
- **`Aai_Monitor_Zadanie`** — jedyne miejsce, w którym powstaje adres IP
  i nazwa przeglądarki. `X-Forwarded-For` świadomie NIE jest czytany: ten
  nagłówek ustawia klient, a adres podrobiony przez napastnika jest gorszy
  niż adres bramy — pierwszy kłamie, drugi tylko milczy.
- **`Aai_Monitor_Prywatnosc`** — wpis o dzienniku dla polityki prywatności
  przez natywne `wp_add_privacy_policy_content()`, plus ten sam tekst gotowy
  do wklejenia w [docs/plugin-3/POLITYKA-PRYWATNOSCI.md](docs/plugin-3/POLITYKA-PRYWATNOSCI.md).
  Dwie drogi, bo prawdziwa polityka mieszka w treści MOTYWU, generowanego ze
  źródła strony głównej — repozytorium tylko do odczytu. Treść mówi „do 90 dni
  **od ostatniej aktywności**", nie „90 dni": retencja jest leniwa z definicji,
  więc twarda obietnica byłaby na cichej instalacji nieprawdziwa.
- **`tools/smoke/dziennik.mjs`** — wspólny moduł higieny wzorem `poczta.mjs`
  z 0.54.0: migawka na starcie, kasowanie wyłącznie wierszy powstałych po niej,
  rachunek sumienia z liczby wpisów. Wpięty w **siedem bramek**.
- **Cztery reguły `straznik-monitora-wp`** (8 → 12) i **dwie
  `straznik-higieny-smokow`** (7 → 9); audyt mutacyjny **247 → 255**, smoke
  monitoringu **57 → 76 sprawdzeń**.

### Zmienione

- **Tabela kroków w schemacie mówi prawdę o T2.** Wiersz obiecywał retencję
  90 dni, jej drugi wyzwalacz i sekcję „Logowania" ekranu — wszystkie trzy
  były już zrobione w T1. Zakres kroku to więc producenci danych i ich bramki,
  a nie lista z tamtego wiersza.

### Naprawione

- **Smoke monitoringu kasował CUDZE wiersze dziennika.** Test retencji cofał
  czas o 400 dni wierszowi wybranemu przez `MIN(id)` z całej tabeli i oddawał
  go retencji. Do T2 było to bezpieczne (w tabeli nie było nic poza wierszami
  smoke'a), od T2 trafiało w najstarszy CUDZY wiersz — zmierzone: kasował wpis
  zostawiony przez smoke kreatora. Na instalacji właściciela zniknąłby jego
  najstarszy wpis logowania, czyli dowód po włamaniu. Złapał to **rachunek
  sumienia liczący CAŁĄ tabelę**, nie własne ślady (lekcja z P5).
- **Siedem bramek zaśmiecało dziennik** — razem osiem wierszy na pełny przelot.
  Bez tego licznik nieudanych prób z 7 dni, jedyna funkcja alarmowa ekranu,
  pokazywałby serie wyprodukowane przez własne testy.

### Zmierzone w cudzym kodzie i we własnym

Trzy rzeczy sprawdzone URUCHOMIENIOWO **przed** napisaniem kodu, bo od nich
zależał projekt:

1. **`set_logged_in_cookie` nie odpala się przy każdym żądaniu zalogowanego**
   — pięć kolejnych odsłon `/wp-admin/` na gotowej sesji nie dołożyło ani
   jednej linii. Dziennik rośnie w tempie LOGOWAŃ, nie odsłon.
2. **Auto-login z kasy odpala WYŁĄCZNIE ten hak, bez `wp_login`** (F3). Sam
   `wp_login` przegapiłby więc ścieżkę każdego nowego klienta, a sam
   `set_logged_in_cookie` nie odróżniłby kasy od formularza. Stąd dwa haki
   i dedup, a nie jeden hak.
3. **`wp_add_privacy_policy_content()` odmawia pracy poza `wp-admin` i przed
   `admin_init`** (`plugin.php:2429`) — w obu wypadkach woła
   `_doing_it_wrong()` i wychodzi bez dodania czegokolwiek. Wywołanie
   z `plugins_loaded` nie dodałoby NIC, a objawem byłby najwyżej wpis w logu
   przy `WP_DEBUG`.

**Pomiar obalił grep w obie strony.** Listy bramek zaśmiecających dziennik nie
da się wygrepować: wzorzec wskazywał `platnosci` (który tylko asertuje kod 200
ekranu logowania) i przegapiał `produkty` oraz `zakup`, bo one nie dotykają
`wp-login.php` — sesję zakłada im WooCommerce w środku składania zamówienia.
**Pierwszy przelot też kłamał, ciszej:** `jezyk`, `panel` i `motyw` pokazały
„zostawia 0", bo w ogóle się nie uruchomiły (brak `ZRZUTY_RIG`); kod wyjścia 1
był jedynym śladem. **Pomiar bez sprawdzenia kodu wyjścia mierzy ciszę, nie
stan.**

### Trzy ślepoty złapane własnymi testami negatywnymi

Wszystkie trzy przechodziły na zielono, gdy powinny były się zapalić:

- **asercja „hasło nigdy w dzienniku"** patrzyła tylko na wiersz PORAŻKI.
  Mutacja dopisująca `$_POST['pwd']` do handlera UDANEGO logowania przeszła —
  a przy udanym logowaniu formularzem to pole jest ustawione tak samo. Pyta
  teraz o WSZYSTKIE wiersze przebiegu i WSZYSTKIE użyte hasła;
- **reguła „bramka logująca się sprząta"** stała wyłącznie na wzorcu
  zachowania i nie widziała `zakup` ani `produkty` — te nie logują się ani
  jedną własną instrukcją. Obok wzorca stoi teraz jawna lista ZMIERZONYCH,
  z komendą do powtórzenia pomiaru;
- **reguła „bramka rozlicza się z dziennika"** liczyła WYSTĄPIENIA wywołania
  i przechodziła po zamianie asercji na `true === true`, bo drugie wywołanie
  zostawało w komunikacie błędu. Pyta teraz o PORÓWNANIE, domykając nawiasy
  licząc głębokość — regex urywał się na uchwycie `(k) => wp(...)`.

**Strażnik złapał też moją własną nową klasę**: `Aai_Monitor_Prywatnosc::dodaj()`
wisi na `admin_init`, który biegnie przy KAŻDYM żądaniu do kokpitu, także
cudzym. Naprawiony został kod, nie reguła — dowód, że reguła celuje
w zachowanie, a nie w listę znanych haków.

### Przegląd przed PR-em — dziewięć rzeczy, które przechodziły na zielono

Para agent+krytyk wg [agenci/przeglad-pr/](agenci/przeglad-pr/): dwóch
recenzentów na rozłącznych obszarach (cudzy kod i bezpieczeństwo /
sprawdzalność bramek), krytykiem agent główny. **Każde znalezisko
potwierdzone URUCHOMIENIOWO przed naprawą.**

**W kodzie wtyczki:**

- **hasło wpisane w pole loginu szło do bazy jawnym tekstem** na 90 dni
  i na ekran administratora. Rdzeń puszcza tę wartość przez
  `sanitize_user()`, które w trybie nieścisłym **nie usuwa** `@ ! # $ % & _ -`
  ani cyfr — zmierzone: `MojeTajneHaslo#2026` przechodziło bez zmiany.
  Przeczyło to trzem miejscom naraz, w tym zdaniu z polityki prywatności
  czytanemu przez osobę, której dane dotyczą. Nieistniejące konta są teraz
  **maskowane** (`Moj…(19 znaków)` — zostaje wzorzec ataku, znika sekret),
  istniejące zapisujemy dosłownie;
- **dedup gubił całe logowanie**: sesja jednego konta i `wp_login` drugiego
  w jednym procesie dawały JEDEN wiersz — drugie zdarzenie znikało,
  pierwsze dostawało cudzą etykietę. Trzymamy parę [wiersz, konto];
- **`ArgumentCountError` omijał `try`** (powstaje przy wywołaniu, nie w ciele)
  i leciał do kasy — parametry mają wartości domyślne;
- **`sanitize_text_field` ucinał user-agenta** na pierwszym `<`:
  `Mozilla/5.0 <script>…` zapisywało się jako `Mozilla/5.0`, czyli
  kasowaliśmy przypadek, dla którego ta kolumna istnieje;
- **cudzy callback padający na priorytecie 5 zabierał nam zdarzenie** —
  haki idą z priorytetem 1.

**W bramkach — wszystkie o tym, że dowód był pozorny:**

- **rachunek sumienia był MARTWY w sześciu z siedmiu bramek**: wpięcie
  postawiło asercję ZA `process.exit(1)`, gdzie nikt nie czyta już tablicy
  błędów. Mutacja psująca ją przechodziła z kodem 0;
- **reguła o `catch ( Throwable )` była ślepa** — pytała o obecność słowa,
  więc instrukcja linię przed `try` przechodziła, a Error wychodził do kasy;
- **nic nie pilnowało, że producent jest podpięty**: zdjęcie jednej linii
  dawało martwy dziennik przy obu strażnikach zielonych i kontroli kod 0.
  Kontrola świeci teraz **kod 1**, gdy nie ma ani jednej czujki;
- **komentarz o sprzątaniu opisywał mechanizm, którego w kodzie nie ma**
  (klasa BLAD-018).

**Mój pomiar bramek był zanieczyszczony.** Przypisałem wpisy bramkom
`produkty` i `zakup`, które ich nie tworzą — w tle biegły **moje własne**
żądania HTTP przy sprawdzaniu polityki prywatności, a licznik nie wie, czyj
jest wiersz. Czysty przelot mierzy `AUTO_INCREMENT` (sprzątanie kasuje ślad,
licznika nie cofa): wpisy tworzy **pięć bramek plus smoke monitoringu**, nie
siedem. Obie pułapki pomiaru — ta i wcześniejsza (bramki bez `ZRZUTY_RIG`
pokazujące fałszywe „zostawia 0") — zapisane w module.

### Stan dowodów

Strażnicy **37/37**, audyt mutacyjny **260** (258 złapanych, 0 przeoczonych,
0 martwych, 2 pominięte — strażnicy warunkowi bez materiału), smoke
monitoringu **84**, wszystkie bramki WP zielone. Dane Pluginów 1 i 2 nietknięte.

Jedna z mutacji tego kroku **umarła** po zmianie priorytetu haków — złapał
to audyt, a wzorzec nie pyta już o liczbę w `add_action`.

## [0.55.0] — 2026-08-30

**Plugin 3 (`aai-monitor`) ma fundament i ekran** — krok T1 zaakceptowanego
schematu ([docs/plugin-3/DIAGRAM.md](docs/plugin-3/DIAGRAM.md)). Trzecia
i ostatnia wtyczka projektu: dziennik logowań i pomiar ruchu — dwie rzeczy,
których nie ma ani WordPress, ani WooCommerce, ani Tutor. Ten krok **nie
rejestruje jeszcze niczego**: producenci danych (haki logowania, beacon
wizyt) wchodzą w T2 i T3. Powstaje baza, warstwa zapisu, ekran w kokpicie,
kontrola i bramki.

### Dodane

- **Wtyczka `aai-monitor`** wzorem W1/P1: dwie tabele przez `dbDelta`
  (`logowania` — dane osobowe, okno 90 dni; `wizyty` — anonimowe, okno
  400 dni, **bez ani jednej kolumny łączącej z kontem**, decyzja D3),
  `Aai_Monitor_Zapis` jako jedyny pisarz, `Aai_Monitor_Odczyt` jako kanał
  JSON, który NIGDY nie pisze, `Aai_Monitor_Zaleznosci` z wersjami
  dowiedzionych faktów, kanał błędów i `uninstall.php`, który domyślnie
  **nie kasuje danych** — dziennik logowań jest materiałem dowodowym po
  incydencie.
- **Ekran w kokpicie** (menu Automatic AI → Monitoring, `manage_options`,
  decyzja D1): kafelki, tabela ostatnich logowań z filtrem „tylko nieudane"
  i sekcja ruchu. **Czysty odczyt** — zero akcji, zero `wp_ajax_*`, zero
  formularzy POST, zero nonce'ów; filtr jedzie GET-em. Rejestracja menu
  z **priorytetem 20**, bo wtyczki ładują się alfabetycznie i bez tego nasza
  pozycja wchodziłaby do podmenu PRZED pozycjami Pluginu 1.
- **Ekran mówi prawdę o tym, co zbiera.** Producenci danych meldują się
  jako „czujki", a ekran pyta o nie zamiast mieć wpisane w tekst — dziś mówi
  wprost: „baza stoi, ale nic nie zbiera danych". Bez tego pusta lista nie
  odróżnia „nikt nie próbował" od „nic nie działa", a to różnica między
  dobrą wiadomością a awarią.
- **`wp aai-monitor sprawdz`** (kod 1 przy braku tabel, awarii w kanale
  błędów albo retencji, która miała okazję i nie zadziałała) oraz
  `wp aai-monitor wyczysc-blad`. Kontrola **nigdy nie pisze** i **nigdy nie
  pyta o siebie żądaniem HTTP** — kontener WP-CLI nie dosięga `:8892`,
  więc kontrola po sieci byłaby czerwona zawsze i wywracała `postaw.sh`.
- **37. strażnik `straznik-monitora-wp`** (8 reguł, 9 mutacji + kontrprzykład)
  i **`npm run smoke:wp-monitor`** (57 sprawdzeń na żywej instalacji).
  Środowisko: mount w OBU usługach compose, aktywacja i punkt kontrolny
  w `postaw.sh`.
- **Blok „KOREKTA 2026-08-30" w [docs/PLAN.md](docs/PLAN.md) §4** z werdyktem
  dla KAŻDEJ pozycji pierwotnego planu — własnego logowania, kont admina ani
  bazy `db3_monitoring` nie piszemy.

### Zmienione

- **Trzy obietnice o Pluginie 3 przestały być nieprawdą.** Repo w trzech
  miejscach zapowiadało rzeczy, których ten moduł nie zrobi: własną rolę
  redaktora kursów (kod Pluginu 1), „pełne logowanie da Plugin 3"
  (KREATOR.md) i „pełny auth da Plugin 3" (DIAGRAM Pluginu 1). Konta i role
  ma WordPress, konta klientów dowiózł Plugin 2, a **osobnej roli redaktora
  świadomie nie będzie** (decyzja właściciela 2026-08-30).
- **Brute force nie znika po cichu.** Wiersz checklisty zabezpieczeń
  obiecywał, że Plugin 3 dowiezie konta, sesje, reset hasła I ochronę przed
  łamaniem hasła. Trzy pierwsze są zrobione; czwarta zostaje **otwarta
  jawnie**, z decyzją właściciela: dziennik **rejestruje** próby, nikogo nie
  blokuje, a decyzja o blokowaniu zapadnie, gdy dane pokażą, że problem
  istnieje.

### Naprawione

- **`straznik-wtyczki-wp` był ŚLEPY na SQL sklejony konkatenacją** (nowa
  reguła 10). Jego reguła o wartościach przez `prepare()` czyta łańcuch
  podany WPROST do `$wpdb->…`, więc zapytanie złożone linijkę wyżej
  i podane zmienną przechodziło bez sprawdzenia. Nie hipoteza: obszedłem tę
  regułę PRZYPADKIEM, pisząc retencję — na jednym miejscu strażnik się
  zapalił, drugie, identyczne, przemilczał. Kod monitoringu ma teraz każdy
  literał SQL przy swoim wywołaniu, a reguła 10 pilnuje tego we wszystkich
  trzech wtyczkach (zmierzone: zero istniejących naruszeń).
- **`wp aai-monitor wyczysc-blad` nie istniała**, choć kontrola kazała ją
  uruchomić: WP-CLI **nie zamienia podkreślenia w nazwie metody na myślnik**,
  więc komenda nazywała się `wyczysc_blad`. Naprawia `@subcommand`. Złapał
  to smoke, nie recenzja — komunikat radzący rzecz nieskuteczną jest gorszy
  niż brak rady (lekcja z P4).

### Dowody

`npm run check` kod 0 (strażnicy **37/37**), audyt mutacyjny **247**
(245 złapanych, 0 przeoczonych, 0 martwych), `postaw.sh` kod 0 z punktem
kontrolnym monitoringu, `smoke:wp-monitor` **57**, dane Pluginów 1 i 2
nietknięte. Każde nowe sprawdzenie ma test negatywny: kolumna `ip` dopisana
do tabeli ruchu zapala **dokładnie jedno** sprawdzenie, kontrola zmuszona do
zapisu zapala pomiar N16, a formularz POST wstawiony do ekranu zapala obie
asercje czystego odczytu.

## [0.54.0] — 2026-08-30

**Higiena bramek wobec wspólnych zasobów** — naprawy po teście ręcznym P6.
Skrzynka łapacza poczty, zamówienia i zapisy na kursy są w warsztacie wspólne
z właścicielem, a bramki traktowały je tak, jakby były wyłącznie ich. Punkt
wyjścia: **czwarte zgłoszenie z P6** („zniknął mail Ustaw hasło”) — mail
wyszedł i został odebrany, zniknął PODGLĄD, bo bramka wyczyściła całą skrzynkę.

### Zmienione

- **Bramka kasuje wyłącznie to, co sama wysłała.** Zmierzone przelotem
  wszystkich 13 smoke'ów WP z licznikiem przed/po (poczta, zapisy na kursy,
  produkty, dostawy, powiązania, wpisy Tutora, zamówienia): `smoke-wp-zakup`
  zostawiał **21 wiadomości** na przebieg, `smoke-wp-zwroty` **15**,
  a `smoke-wp-maile` odwrotnie — kasował **CAŁĄ skrzynkę** (36 → 0),
  trzynaście razy w trakcie przebiegu. To samo robił `postaw.sh`, dwa razy,
  a jest rozkazem kroku zerowego każdego testu ręcznego.
  Powstał wspólny moduł **`tools/smoke/poczta.mjs`**: migawka identyfikatorów
  ZASTANYCH na starcie, kasowanie wyłącznie tego, czego w niej nie ma.
  Izolacja pomiaru w `smoke-wp-maile` zostaje bez zmian — zawężamy pole
  widzenia zamiast czyścić cudze, więc asercje „wyszedł dokładnie jeden mail”
  liczą to samo co wcześniej. `postaw.sh` kasuje własną wiadomość kontrolną
  po identyfikatorze, znalezionym przez `/api/v1/search`.
  Dowód: przy dwóch obcych wiadomościach w skrzynce wszystkie trzy bramki
  i `postaw.sh` zostawiają je nietknięte (2 → 2, te same tematy). **BLAD-029.**
- **Rachunek sumienia o dwie pozycje**: skrzynka wróciła do stanu sprzed
  przebiegu oraz liczba zapisów na kursy (`tutor_enrolled`) bez zmian —
  liczona **GLOBALNIE**, nie po własnym kursie. Sprawdzeń: `smoke-wp-maile`
  60 → **62**, `smoke-wp-zakup` 38 → **40**, `smoke-wp-zwroty` 37 → **39**.
- **Reguła zapisana w CONTRIBUTING** („Zasady twarde”), bo dotąd żyła tylko
  w opisach pojedynczych smoke'ów w README — czyli nie było czego egzekwować.

### Naprawione

- **Sierota `tutor_enrolled` #2153 zawyżała statystykę prawdziwego Kursu 1.**
  `post_author = 0`, `_tutor_enrolled_by_order_id = 2152` przy zamówieniu,
  którego już nie ma. **Kasowanie zamówienia NIE kasuje zapisu w Tutorze**,
  a sprzątanie po własnym kursie takiego wpisu nie widzi — bo siedzi on na
  cudzym. Tutor liczył 5 zapisanych zamiast 4; po skasowaniu licznik spadł do
  4 (mierzone OSOBNYM żądaniem — w tym samym Tutor oddaje wartość sprzed
  kasowania, pułapka z W6). Żaden dzisiejszy smoke takich sierot nie
  produkuje: przelot 13 bramek dał 6 → 6, więc nowa asercja jest
  profilaktyką, nie naprawą czynnego wycieku. **BLAD-030.**
- **Dwie martwe stałe**: `POCZTA` w `smoke-wp-zwroty` (od P5, nigdy nieużyta —
  dziś bramka naprawdę czyta i sprząta pocztę, więc stała ma sens) oraz `ADRES`
  w `smoke-wp-maile`, jedyne ostrzeżenie ESLinta w tych plikach, starsze niż
  ta gałąź (potwierdzone uruchomieniem lintera na wersji z `main`).

### Dodane

- **36. strażnik `straznik-higieny-smokow`** (8 mutacji w audycie, w tym
  kontrprzykład). Siedem reguł; **trzy z nich sprawdzane URUCHOMIENIOWO**,
  przez podstawiony `fetch` — bo różnica między „posprzątaj po sobie”
  a „wyczyść wszystko” to jedno pole w ładunku żądania, a wzorzec na kod tej
  klasy niezmiennika nie utrzyma. Bramkę „wysyła pocztę” rozpoznaje po
  wywołaniach cudzego interfejsu (`wc_create_order`, `payment_complete`,
  `woocommerce_created_customer`, `tutor_after_enrolled`), nie po nazwie
  pliku — nowy smoke dostanie regułę automatycznie. Audyt mutacyjny
  227 → **236** (234 złapane, 0 przeoczonych, 0 martwych, 2 pominięte).

### Zapamiętane

- **`DELETE /api/v1/messages` bez listy `IDs` znaczy w Mailpicie „skasuj
  wszystko”.** Sprzątanie, które nie ma czego skasować, nie może więc wysłać
  tego żądania w ogóle — pusta lista wyczyściłaby skrzynkę właściciela.
  Pilnuje tego osobna reguła strażnika, sprawdzana uruchomieniowo.
- **Migawka ucięta limitem zamienia cudze wiadomości we własne.** Mailpit
  stronicuje listę (domyślnie 50 na stronę), więc moduł czyta do skutku
  i porównuje z `total`; rozbieżność ZATRZYMUJE przebieg, zamiast po cichu
  kasować cudze.
- **Siódmy nawrót pułapki „wzorzec na napis” — tym razem w MOIM kodzie.**
  Pierwsza wersja reguły rachunku sumienia szukała napisu „poczty” wewnątrz
  wywołania `sprawdz(`, czyli wisiała na nazwie zmiennej `pocztyPo`. Pyta
  teraz o zachowanie: stan skrzynki odczytany DWA RAZY, a druga wartość
  w asercji. Kontrprzykład w audycie sprawdza, że przemianowanie zmiennych
  niczego nie psuje. (Poprzednie nawroty: 0.29.0, 0.44.0, 0.47.0, c6c9c97,
  dwa razy w P4.)
- **Mutacja przypięta do KSZTAŁTU kodu umiera po pierwszym refactorze.**
  Mutacja „niepełna migawka przechodzi” przestała pasować, gdy odczyt dostał
  drugie podejście — audyt zameldował ją jako MARTWĄ. Celuje teraz w skutek
  (lista oddana mimo rozbieżności z `total`), nie w kształt bloku.
- **Sprzątanie w `finally` nie może rzucać.** Wyjątek stamtąd przesłoniłby
  prawdziwy błąd z bloku `try`; notujemy go więc na stderr, a niewróconą
  skrzynkę i tak zapala rachunek sumienia.
- **Zamiana tekstu w całym pliku trafia też tam, gdzie nie patrzysz.**
  Przemianowanie licznika w `smoke-wp-zakup` weszło przy okazji w istniejące
  sprawdzenie B16 (powtórny zakup), które porównywało wtedy liczbę globalną
  z lokalną. Złapane czytaniem diffu, nie testem — stąd nawyk: po każdej
  zamianie hurtowej przeczytać `git diff` po wzorcu, nie tylko wynik.

## [0.53.0] — 2026-08-30

**Trzy naprawy z testu ręcznego P6** — właściciel przeszedł ścieżkę zakupu
z odegraną bramką płatności i zgłosił trzy rzeczy; każda potwierdzona
uruchomieniowo przed naprawą, każda naprawa z testem negatywnym.
Scenariusz i przebieg testu:
[docs/plugin-2/TEST-RECZNY-P6.md](docs/plugin-2/TEST-RECZNY-P6.md).

### Zmienione

- **Przy płatności natychmiastowej klient dostaje JEDEN mail, nie dwa
  w tej samej sekundzie.** Zgłoszenie: „po co mail o gotowym kursie, na
  który mogę wejść bez hasła — a drugi każe mi ustawić hasło". Zmierzone:
  kasa loguje kupującego na 14 dni (`wc_set_customer_auth_cookie()`,
  `class-wc-checkout.php:1262`), więc przy bramce domykającej zamówienie
  w tym samym żądaniu mail 1 „Ustaw hasło i wejdź" był szumem obok maila 2,
  który i tak niesie odnośnik do ustawienia hasła. Teraz mail 1 jest
  wtedy **świadomie pomijany** — z wpisem w dzienniku dostaw
  (`pominięto: opłacone od razu…`), który kontrola ma za stan poprawny.
  **Gwarancja K1 stoi dalej i jest pilnowana**: pominąć wolno DOPIERO po
  odczytanym z dziennika „wyslano" maila 2 — gdy poczta leży, mail 1
  wychodzi jak zawsze (zmierzone sceną z uszkodzoną wysyłką). Przelew
  (`bacs`) bez zmian: konto i opłata to osobne żądania w odstępie dni,
  klient dostaje obie wiadomości jak dotąd.
- **Menu ma pozycję „Moje konto"** (Plugin 1, za decyzją właściciela) —
  obok „Moich kursów", w obu nawigacjach motywu, wyłącznie dla
  zalogowanego. Zgłoszenie: z „Moich kursów" nie było JAK wrócić do
  zamówień i ustawień — zmierzone: zero odnośników do konta na całej
  stronie; drzwi z W6 („Moje kursy" pierwszą pozycją menu konta) były
  jednokierunkowe. Na stronach konta pozycja dostaje `aria-current`
  (przez `is_account_page()`, bo to nie nasza trasa); dla każdego
  zalogowanego, nie tylko klienta z kursem — konto ma też ten, kto czeka
  na przelew.
- **Rdzeń nie mailuje już administratora o każdej zmianie hasła.**
  Zgłoszenie: gołe „Hasło użytkownika … zostało zmienione" w skrzynce.
  To `wp_password_change_notification()` (pluggable.php) — powiadomienie
  DO WŁAŚCICIELA, nie do klienta (klient z tej funkcji nie dostaje nic,
  zmierzone przy P4); przy sprzedaży dawałoby jeden mail na każdego
  klienta, który ustawi hasło z naszego linku. Zdjęty callback, nie
  podmieniona funkcja pluggable (dwie wtyczki definiujące tę samą to
  fatal; zdjęcie znika z deaktywacją wtyczki). Mail DO KLIENTA z linkiem
  „ustaw nowe hasło" — inny mechanizm — nietknięty, zmierzone resetem
  po naprawie.

### Naprawione

- **`npm run wp:klient` zakładał konto bez dostępu do kursów** — zepsute
  od P2: odkąd kursy są płatne, `do_enroll()` nadaje zapisowi `pending`
  („czeka na opłatę"), a dostęp daje wyłącznie `completed`. Konto testowe
  udawało nie klienta, tylko kogoś, kto zaczął zakup; narzędzie samo to
  zgłaszało kodem 1, ale nikt go nie uruchamiał od W6. Status podnoszony
  jawnie (jak w `smoke-wp-lekcja`, z tego samego powodu), istniejące
  zapisy podnoszone zamiast dublowane — trzy przebiegi z rzędu dają dwa
  zapisy `completed`, zero maili, zero wpisów w dzienniku.

### Dowody

- `smoke-wp-maile` 46 → **60 sprawdzeń** (trzy sceny: płatność
  natychmiastowa → jeden mail i kontrola kod 0; padnięty mail 2 → mail 1
  wychodzi i kontrola kod 1; reset hasła → zero maila do admina, reset
  działa), `smoke-wp-front` 82 → **84** (gość nie widzi „Moich kursów"
  ani „Mojego konta"), `smoke-wp-lekcja` 36 → **38** (zalogowany z kursem
  widzi obie pozycje). Testy negatywne każdej asercji: pominięcie
  bezwarunkowe, brak drogi zapasowej, pozycja ukryta zalogowanemu,
  pozycja pokazana gościowi — każdy pada dokładnie na swoim sprawdzeniu.
- **Dwie reguły `straznik-platnosci-wp`** (36: mail 1 pomijany wyłącznie
  po potwierdzonym mailu 2 i tylko on — obie połowy, w wysyłce
  i w kontroli; 37: powiadomienie admina zdjęte w `zarejestruj()`)
  i **cztery mutacje** w audycie: 223 → **227** (wszystkie złapane
  z właściwym śladem).

## [0.52.0] — 2026-08-29

**Krok P5 — zwroty i przypadki brzegowe.** Zakres rozstrzygnął właściciel:
gwarancji 30 dni nie realizujemy, więc strona przestaje ją obiecywać; zwrot
MIERZYMY i zostawiamy dowód. Pełny opis, pomiary i pułapki:
[docs/plugin-2/KROK-P5.md](docs/plugin-2/KROK-P5.md).

### Rozstrzygnięcie, które zmieniło krok

Krok wchodził z wymaganiem „gwarancja 30 dni MA DZIAŁAĆ". Przy planie
przedstawiłem właścicielowi rozróżnienie trzech rzeczy: **gwarancja** (nasza
dobrowolna obietnica — da się zdjąć), **ustawowe 14 dni odstąpienia** (nie
znika przez skasowanie sekcji; wyłącza je dopiero zgoda w kasie na
natychmiastowe dostarczenie — pozycja „przed pierwszym klientem") oraz
**techniczny zwrot** (potrzebny niezależnie: obciążenie zwrotne, podwójna
płatność, pomyłkowy zakup, reklamacja). Wybrany wariant skrócony: zdejmij
obietnicę, zmierz mechanizm.

### Dodane

- **`smoke-wp-zwroty` (35 sprawdzeń)** — dowód, że klik „Refund" w panelu
  WooCommerce ODBIERA dostęp do kursu. Zmierzone: odbiera **bez ani jednej
  linijki naszego kodu** (`enrolled_courses_status_change()` Tutora ustawia
  status zapisu równy statusowi zamówienia). Smoke nie dokłada mechanizmu —
  utrwala cudze zachowanie jako NASZE WYMAGANIE, żeby aktualizacja Tutora nie
  zabrała go po cichu; wtedy sklep oddawałby pieniądze i zostawiał materiał,
  a nic by tego nie zgłosiło. Dostęp sprawdzany na czterech drogach, którymi
  klient go widzi: zapis w Tutorze, `is_enrolled`, lista „Moich kursów", treść
  lekcji.
- **`npm run db1:sekcje`** (`tools/wgraj-sekcje.ts`) — bezpieczna droga dla
  poprawek treści sprzedażowej. `db1:seed` zaczyna od `akcja: "usun"`, czyli
  **kasuje prozę 73 lekcji**, żeby zmienić jedno zdanie; narzędzie wysyła same
  sekcje BEZ klucza `modules`.
- **`node tools/okladki-png.mjs`** — okładki SVG → PNG jako artefakt
  repozytorium, ze skrótem źródła obok (`--sprawdz` wykrywa okładkę zmienioną
  w SVG i niewyrenderowaną).
- **Dwie reguły `straznik-platnosci-wp`** (34, 35) i **pięć mutacji** w audycie:
  217 → **222** (220 złapanych, 0 przeoczonych, 0 martwych).
- **Dwie kontrole w `wp aai-platnosci sprawdz`**: zamówienie kursu wiszące
  w `processing` (klient zapłacił i nie ma dostępu) oraz obecność Tutor Pro
  (ma własny zapis ceny, więc unieważnia dowody jednokierunkowości z P2).

### Zmienione

- **Strona przestaje obiecywać zwrot pieniędzy.** Obietnica siedziała
  w CZTERECH miejscach na kurs: pozycja „Gwarancja 30 dni" w korzyściach,
  wiersz w liście „w cenie", cała sekcja `guarantee` i pytanie FAQ, którego
  jedyną odpowiedzią była gwarancja — plus pływak w hero katalogu, osobno
  w WordPressie i w prototypie. Pytania FAQ usunięte w całości, zamiast
  dopisywania im nowej odpowiedzi (zmyślanie obietnicy byłoby powtórzeniem
  naprawianego błędu). Rodzaj sekcji `guarantee` ZOSTAJE w kontrakcie —
  zniknęła treść, nie możliwość.
- **Kasa nie powołuje się już na nieistniejący regulamin.** WooCommerce
  drukował „wyrażasz zgodę na nasze Warunki i zasady oraz Politykę
  prywatności", choć strony regulaminu nie ma — a przy jej braku NIE usuwa
  wzmianki, tylko drukuje ją bez odnośnika. Klient czyta teraz „Kontynuując
  zamówienie, wyrażasz zgodę na naszą Politykę prywatności." z klikalnym
  odnośnikiem. Zrobione filtrem na drzewie bloków W PAMIĘCI, nie zapisem do
  treści strony (`str_replace` w cudzej treści uszkodził przy P3a 13 bloków
  koszyka i 22 kasy bez jednego objawu).
- **Produkt w koszyku i w kasie ma okładkę kursu** zamiast szarego zastępnika.
  Decyzja właściciela zakładała renderowanie PNG przy synchronizacji, ale to
  niewykonalne: `Imagick::queryFormats("*SVG*")` w kontenerze zwraca PUSTĄ
  listę, GD SVG nie czyta, `rsvg-convert`/`inkscape`/`convert` nie istnieją.
  Render jest KWADRATOWY (1200×1200), bo WooCommerce składa miniaturę
  przycięciem 300×300 — z tytułu „Jak poprawnie korzystać z Claude" zostawało
  „poprawnie / zystać z Claude".
- **Okładki mówią „AUTOMATIC AI"** — wszystkie cztery pliki niosły
  „[ KURS · MATTHEWPLUGINS.PL ]", czyli markę sprzed rebrandingu z 2026-08-18.
- **Odnośnik pozycji koszyka prowadzi tam, gdzie powinien.**
  `tutor_update_product_url()` kończy się BEZ `return` dla produktu spoza
  kursów, więc filtr dostawał `null` i cudza pozycja traciła klikalność
  (zmierzone). Nasz kurs prowadzi teraz prosto na `/szkolenia/<slug>/`,
  a nie na `/courses/…`, które i tak przekierowujemy.
- **Załącznik okładki ma tekst alternatywny** (Store API oddawało `alt: ""`).

### Naprawione w schemacie

- **DIAGRAM §10, niezmiennik 14** zapowiadał test „`product_id` bez
  `price_type` → zapis ma `pending`, nie `completed`". Zmierzone: taki stan
  daje **`completed`**, czyli pełny dostęp bez zapłaty — to samo zagrożenie B2,
  tylko objaw opisany na opak (`do_enroll()` nadaje `pending`, gdy kurs JEST
  sprzedawalny). Smoke mierzy teraz dwie sceny: zła kolejność rozdaje kurs za
  darmo, nasza nie tworzy zapisu wcale.
- **Cztery pułapki z §13 miały puste dowody** mimo deklaracji w dokumencie
  (11 — odnośnik pozycji, 8 — wiszące zamówienia, 3 — Tutor Pro,
  14 — `is_tutor_order()`). Wszystkie zamknięte.

### Naprawione — znalezisko sweepu krzyżowego (cicha utrata treści)

- **Wpis o PUSTYM identyfikatorze przejmował cudzy moduł w Tutorze i kasował
  jego lekcje.** Zapytanie `meta_value => ''` dopasowuje pierwszy lepszy wpis
  danego typu, więc kopia „znajdowała" moduł innego kursu, przejmowała go
  (tytuł, rodzic, uuid), a sprzątanie nadmiaru kasowało jego lekcje. Tak
  zniknęło **18 lekcji Kursu 2** z kopii — bez jednego objawu; nasze tabele
  były nietknięte, więc bramki treści niczego nie zgłaszały.
  **Ścieżka właściciela była bezpieczna** (kontrakt kreatora nadaje uuid od
  W4); dziura otwierała się przy wywołaniach warstwy zapisu z pominięciem
  kontraktu, czyli w naszych smoke'ach. Naprawione na dwóch poziomach:
  `znajdz_po_uuid()` odrzuca pusty uuid, a warstwa zapisu nadaje uuid nowemu
  modułowi i lekcji. Droga do przyczyny i dowody: KROK-P5.md §8b.
- **Rachunek sumienia smoke'a liczył wyłącznie własne ślady**, więc
  przepuszczał zniszczenie cudzych danych. `smoke-wp-zwroty` pyta teraz także
  o liczbę wpisów Tutora i o dziennik dostaw (37 sprawdzeń).

### Dowody

`npm run check` **kod 0** (strażnicy **35/35**, testy 83/83, lint, tsc, build,
7 smoke'ów prototypu), audyt mutacyjny **222**, dane Pluginu 1 nietknięte
(proza **73/73 co do znaku**, kopia w Tutorze **0 różnic**).

Testy negatywne, każdy trafia tylko w swoje: zdjęty hak Tutora → 9 z 33;
wyłączony mail Woo o zwrocie → 1 z 33; zdjęty filtr odnośnika → 2 z 35;
mutacja nazwy bloku kasy → 1 z 5; udawany Tutor Pro → kontrola kod 1;
zamówienie kursu w `processing` → kontrola kod 1.

### Pułapki zapisane, żeby nie wróciły

`tutor()->wc` NIE ISTNIEJE, więc pierwszy test negatywny nic nie wyłączył
i smoke przechodził — ślepota testu wyglądająca jak dowód.
`waitForSelector(".wc-block-cart-items__row")` trafia w SZKIELET ładowania
koszyka, nie w treść. Test negatywny wiszącego zamówienia nie zadziałał,
dopóki statusu nie ustawiono prosto w tabeli HPOS — bo mechanizm z P3b domknął
zamówienie w tym samym żądaniu. `echo $?` po potoku z `grep` czyta kod GREPA.

## [0.51.0] — 2026-08-29

**Naprawa pięciu błędów z testu ręcznego właściciela — i klasy, którą one
odsłoniły: bramki mierzyły mechanizmy, nie doświadczenie klienta.**
Właściciel znalazł klikaniem to, czego nie złapało 35 strażników, 201 mutacji
i jedenaście smoke'ów. Śledztwo, dowody i mapa pięciu klas:
[docs/plugin-2/BLEDY-Z-TESTU-P4.md](docs/plugin-2/BLEDY-Z-TESTU-P4.md) §5.

### Naprawione

- **N1 — w kasie klient czyta opis kursu, nie cudzy tekst (BLAD-027).**
  Woo drukuje `short_description` produktu pod nazwą pozycji w koszyku
  i w podsumowaniu zamówienia, a Store API oddaje je publicznie. Kopia tego
  pola **nie ustawiała**, więc było niczyje — na produkcie 675 stała przez to
  „cudza edycja 1787936224”, ślad po ręcznym dowodzeniu haka B13. Źródłem
  jest teraz `courses.short_desc`, ta sama kolumna, którą do Tutora kopiuje
  `Aai_Sklep_Tutor`. Oba pola widoczne dla klienta jadą przez `wp_slash()` —
  **zmierzone na Woo 11.0.1**: `set_short_description()` i `set_name()`
  kończą w `wp_insert_post()`, które puszcza wartość przez `wp_unslash()`,
  więc bez posłodzenia ginie każdy backslash (`C:\Users`, sekwencja `\n`;
  kurs o Gicie takich pełen). Przy okazji naprawiona ta sama usterka
  na **nazwie** produktu, uśpiona od P2. Kontrola: rozjazd nazwy albo opisu
  to kod 1 z komendą naprawy w komunikacie.
- **N2 — przycisk mówi prawdę o kwocie w kasie (BLAD-023).** Klik „Dołączam
  za 299,00 zł”, potem „za 349,00 zł” dawał w kasie **648,00 zł**. Decyzja
  właściciela: jeden kurs na raz. Po dodaniu kursu pozostałe **nasze** kursy
  wypadają z koszyka, **cudze produkty zostają** (zmierzone: cudzy towar
  + dwa kursy → cudzy towar i jeden kurs), a podmiana nie jest cicha. Druga
  połowa zgłoszenia: powtórne kliknięcie tego samego kursu przestało być
  czerwonym błędem „You cannot add another…” — nasza walidacja biegnie przed
  wyjątkiem `WC_Cart::add_to_cart()` i mówi „Ten kurs już czeka w Twoim
  koszyku” jako `notice`. `sold_individually` zostaje (B14).
- **N3 — klient płaci po polsku (BLAD-024).** Język ustawia **instalacja**,
  nie wtyczka: `postaw.sh` instaluje pl_PL rdzenia i tłumaczenia wtyczek,
  a weryfikuje **artefaktem** — pyta WordPressa o przetłumaczony napis z kasy,
  bo samo `locale = pl_PL` bez plików tłumaczeń dalej daje angielską stronę.
  Bramką po naszej stronie jest nowy **`smoke-wp-jezyk`**: przechodzi
  w przeglądarce całą ścieżkę klienta (z **ekranem ustawiania hasła z naszego
  maila**, czyli pierwszym krokiem po zakupie) i pada na każdej z 35 fraz
  zmierzonych przed naprawą.
- **N4 — cała poczta od jednego nadawcy (BLAD-025).** Filtry `wp_mail_from`
  i `wp_mail_from_name` na priorytecie 1 podmieniają **wyłącznie wartość
  domyślną** WordPressa (`wordpress@<host>` / „WordPress”) na adres sklepu;
  nadawcy ustawionego świadomie (wtyczka SMTP) nie ruszamy. **Sprostowanie do
  zgłoszenia, zmierzone:** ta wiadomość idzie do **administratora**, nie do
  klienta (`pluggable.php:2187`) — klient po ustawieniu hasła nie dostaje nic
  i od razu jest zalogowany. Sam mail zostaje, zgodnie z decyzją właściciela.
- **N5 — sprzątanie po testach naprawdę sprząta (BLAD-026, BLAD-028).**
  Zapisana była łagodniejsza połowa (ślepy licznik). **Prawdziwa przyczyna
  146 zamówień-widm**: sprzątanie wołało `wp_delete_post()`, które pod HPOS
  **nie kasuje niczego** — zamówienie przeżywa, a smoke melduje porządek.
  Trzecia warstwa: `wc_get_orders(status: 'any')` też nie widzi wszystkiego
  (194 przy 195 wierszach — pomija `checkout-draft`), więc liczymy jawną listą
  `wc_get_order_statuses()`. Posprzątane **201 zamówień-śmieci**; na koncie
  `klient-test`, na którym właściciel ogląda sklep oczami klienta, zostało 0.
- **N6 — nasz rozjazd tej samej klasy.** Kontrola pytała o wpisy kursów
  `post_type = 'courses'` wpisanym na sztywno, choć sąsiedni plik pyta o to
  Tutora od P2. Do tego `postaw.sh` wskazuje teraz Woo **opublikowaną**
  politykę prywatności motywu zamiast szkicu WordPressa („Suggested text:
  Our website address is:”) — zdanie w kasie ma wreszcie działający odnośnik.

### Zmierzone w cudzym kodzie (nie wyprowadzać od nowa)

- `wp_delete_post()` na zamówieniu HPOS **nie kasuje niczego** i nie zgłasza
  błędu; kasuje dopiero `$order->delete( true )`.
- `wc_get_orders( status => 'any' )` **pomija `checkout-draft`**, choć Woo zna
  ten status — jawna lista `wc_get_order_statuses()` daje tyle, ile jest.
- `set_short_description()` i `set_name()` **zjadają backslashe** (przez
  `wp_unslash()` w `wp_insert_post()`); powtórny zapis slashy nie kumuluje.
  To rodzina pułapki `update_post_meta` z W2 — tam ratował nas `$wpdb`.
- Odmowę „You cannot add another…” rzuca `WC_Cart::add_to_cart()`
  (`class-wc-cart.php:1307`), a nasza walidacja biegnie **wcześniej**.
- WordPress 6.9 czyta tłumaczenia z **`.l10n.php`**, nie z `.mo` — dowód
  „bez tłumaczeń" wykonany na pliku `.mo` niczego nie zmienia.
- `wp_password_change_notification()` wysyła kopię **na `admin_email`**
  i pomija ją, gdy hasło zmienia sam administrator.

### Lekcje

- **Szósty nawrót pułapki „wzorzec na napis” — i tym razem spowodowałem go
  sam.** Dopięcie drugiego filtru do `woocommerce_add_to_cart_validation`
  oślepiło regułę 11, która pytała o samą nazwę haka: mutacja kasująca
  rejestrację **blokady sprzedaży** zaczęła przechodzić. Złapał to audyt
  mutacyjny, nie przegląd. Reguła pyta teraz o konkretny callback **oraz**
  o to, czy blokada sięga po stan sprzedaży.
- **Pomiar oparty na cudzym TEKŚCIE ma datę ważności** (BLAD-028): sprawdzenie
  kolejności przejść statusu czytało notatki Woo i umarło po spolszczeniu
  instalacji, meldując odwróconą kolejność przy poprawnej. Mierzy teraz
  zdarzenia, nie zdania.
- **Test negatywny na własnym teście**: pierwsza wersja pomiaru koszyka
  doklejała `-2` do uuid kursu i dostawała 38 znaków przy kolumnie `char(36)`,
  więc powiązanie zapisywało się obcięte i smoke meldował „wraca BLAD-023”
  przy poprawnie działającej regule. Test, który kłamie o kodzie, jest gorszy
  niż brak testu.
- **`git checkout -- <plik>` skasował niezacommitowaną pracę** przy
  przywracaniu po teście negatywnym. Do przywracania służy kopia zrobiona
  przed mutacją, nie git.

### Dowody

Strażnicy **35/35**, audyt mutacyjny **217** (215 złapanych, 0 przeoczonych,
0 martwych), smoke'i WP: język **24** · produkty **84** · zakup **38** ·
maile **46** · front 84 · motyw 89 · panel 54 · kreator 96 · lekcja 36 ·
tutor 44 · dane 30 · płatności 23; `wp:sprawdz` 73/73 co do znaku,
`wp:tutor` 0 różnic, `postaw.sh` kod 0, kontrola `aai-platnosci sprawdz`
kod 0. Każde nowe sprawdzenie ma test negatywny.

### Zostaje do decyzji właściciela

Regulamin („Warunki i zasady” w kasie prowadzi donikąd — strony nie ma),
gwarancja zwrotu 30 dni obiecywana w katalogu przy zwrotach zaplanowanych
dopiero na P5, oraz okładka produktu w kasie (dziś szary zastępnik — nasze
okładki to pliki SVG, a WordPress domyślnie ich nie przyjmuje do mediów).

## [0.50.0] — 2026-08-29

**Krok P4: klient dostaje konto, do którego umie wejść, i wie, że kurs na
niego czeka.** Plan kroku, rozstrzygnięcia właściciela i pomiary:
[docs/plugin-2/KROK-P4.md](docs/plugin-2/KROK-P4.md).

### Dodane

- **Dwa maile dostarczenia** (`Aai_Platnosci_Maile`): „Ustaw hasło i wejdź"
  przy powstaniu konta (`woocommerce_created_customer`) i „Twój kurs jest
  gotowy" przy przyznaniu dostępu (`tutor_after_enrolled`). Nie jeden, bo to
  dwa różne zdarzenia: konto powstaje przy SKŁADANIU zamówienia, dostęp
  dopiero po opłacie — a przelew stoi na `on-hold` dwa dni (K1 z krytyki P0).
  Znacznik idempotencji zapisujemy **synchronicznie** (atomowy `INSERT`
  z UNIQUE w tabeli `dostawy`), wysyłkę odkładamy na `shutdown`: mail 2 składa
  treść z pozycji ZAMÓWIENIA, a hak leci osobno dla każdego kursu. Zmierzone:
  zamówienie na dwa kursy daje jeden mail z dwiema nazwami. Maile idą jako
  HTML z wersją tekstową obok; typ treści nagłówkiem, nie globalnym filtrem.
- **Dziennik dostarczenia**: `wp aai-platnosci dostawy [--ponow=…]` pokazuje,
  co klient dostał, i ponawia niedoręczoną wiadomość. Kontrola widzi
  wiadomość z wynikiem innym niż `wyslano` **albo z pustym** (żądanie padło
  między znacznikiem a wysyłką) oraz opłacone zamówienie z kursem bez
  odnotowanego dostępu — kod 1 z komendą naprawczą. Porażka wysyłki mówi też
  w kokpicie, pod własnym kluczem: udane ponowienie gasi DOKŁADNIE swój
  komunikat.
- **Otwarcie sprzedaży komendą** `wp aai-platnosci sprzedaz otworz|zamknij`.
  Nie robi tego aktywacja ani aktualizacja: kod bywa gotowy wcześniej niż
  regulamin, zgoda na natychmiastowe dostarczenie treści cyfrowej i prawdziwa
  bramka płatności. Komenda ostrzega, gdy nie ma ani jednej włączonej bramki.
- **Odmowa drugiego zakupu posiadanego kursu** (B10). `do_enroll()` Tutora
  wychodzi przed zapisem meta na zamówieniu, więc drugie zamówienie wzięłoby
  pieniądze i nigdy się nie domknęło. Decyzję „czy ten człowiek ma ten kurs"
  podejmuje JEDNA metoda (`Aai_Platnosci_Cta::stan_posiadania()`) — pyta jej
  przycisk na stronie i blokada koszyka.
- **Łapacz poczty w środowisku roboczym**: Mailpit (`127.0.0.1:8893`)
  + mu-plugin przestawiający PHPMailer na jego SMTP, oba montowane przez nasz
  `compose.yml`. `postaw.sh` weryfikuje pocztę ARTEFAKTEM: kasuje skrzynkę,
  wysyła prawdziwą wiadomość i czyta ją z drugiej strony; włącza też przelew
  `bacs` jako bramkę warsztatu.
- **`npm run smoke:wp-maile`** — 38 sprawdzeń na żywej instalacji, wiadomości
  czytane z łapacza, nie z podstawionego `pre_wp_mail`.

### Zmienione

- Mail WooCommerce „nowe konto" **wyłączony** (opcja + filtr obronny B17)
  i **przywracany przy deaktywacji** wtyczki: dwa klucze resetu unieważniają
  się nawzajem, ale konto bez ŻADNEGO linku do hasła jest gorsze (K1).
- Dwie asercje `smoke-wp-front` (przycisk oferty i `availability`) czytają
  stan sprzedaży Z INSTALACJI — smoke przechodzi przy sprzedaży zamkniętej
  i otwartej. Wpisany na sztywno `/kontakt` czynił z niego test, który pada
  dokładnie wtedy, gdy sklep zaczyna działać.
- `napraw()` **dopisuje blok komunikatów sklepu** na strony koszyka i kasy.
  Bez niego odmowy koszyka były NIEME: motyw jest klasyczny, a strony nie
  miały bloku `store-notices`, więc klient lądował na pustym koszyku bez
  słowa wyjaśnienia. Prepend, nigdy podmiana — lekcja rozbitych nazw klas
  z P3a.
- Aktywacja wtyczki **nie melduje już udanej naprawy ustawień jako błędu**:
  lista zmian szła do kanału komunikatów, który kontrola czyta jako rozjazd,
  więc zwykła aktywacja zostawiała `sprawdz` na czerwono.
- Komunikat kokpitu dobiera radę do RODZAJU błędu — „kliknij Zapisz kurs"
  przy niedoręczonym mailu byłoby radą nieskuteczną.

### Naprawione

- **Mail 2 przepadał na ścieżce „admin klika Processing"** (zmierzone):
  zamówienie wchodzące w `processing` domykamy odroczeniem na `shutdown`
  (P3b), a to domknięcie odpala `tutor_after_enrolled` — zgłoszenie wysyłki
  trafiało do akcji, KTÓRA WŁAŚNIE TRWA, i WordPress już go nie wołał.
  Znacznik zostawał z pustym wynikiem, w skrzynce były cztery maile
  WooCommerce i ani jednego naszego: klient miał dostęp i nie wiedział o tym.
  Naprawia pytanie `doing_action( 'shutdown' )`.
- **`smoke-wp-zakup` zostawiał wiersze dziennika** po skasowanych
  zamówieniach — kolejne bramki mierzyłyby własne śmieci (ta sama klasa co
  produkty-sieroty ze sweepu P2).
- **Blokada koszyka wywracała kasę** (przegląd, zmierzone): wyjątek z naszej
  tabeli albo z `tutor_utils()` oddawał klientowi **HTTP 500 i planszę
  „krytyczny błąd”** przy dodawaniu do koszyka — a ta sama decyzja przy
  rysowaniu przycisku była osłonięta i strona kursu oddawała 200. Cały
  łańcuch w `try`, a po wyjątku **odmawiamy**: wpuszczenie produktu przy
  nieznanym stanie znaczy zakup kursu, który klient może już mieć, i
  zamówienie, które nigdy się nie domknie.
- **Gość mógł zapłacić i nie dostać nic** (przegląd, zmierzone): po dryfie
  `woocommerce_enable_guest_checkout` na `yes` anonimowy klient przechodził
  całą kasę, a skutek to `customer_id = 0`, zero zapisów w Tutorze, zero
  wierszy `dostawy` i ani jednej naszej wiadomości. Kontrola to widziała,
  ale dopiero PO pobraniu pieniędzy — teraz odmawiamy przed.
- **Konto założone POZA kasą nie dostawało maila 1** (przegląd, zmierzone):
  `wp-admin`, `POST /wc/v3/customers` i `wp user create` nie idą przez
  `wc_create_new_customer()`, więc hak nie odpala, a mail 2 dochodzi
  normalnie — klient miał kurs i ani jednego linku do hasła. Mail 2 niesie
  odnośnik do odzyskiwania hasła (bez klucza, więc nie unieważnia maila 1).
- **Kontrola była ślepa poza oknem 30 dni** (przegląd, zmierzone): opłacone
  zamówienie z kursem sprzed 40 dni bez odnotowanego dostępu przechodziło
  jako `Success`. Okno i sufit usunięte.
- **Ponowienie wysyłało klucz resetu komukolwiek** (znalezione własnym
  pomiarem): `--ponow=mail_konta/1` posyłał świeży klucz administratorowi,
  nie zostawiał śladu i meldował sukces. Ponawiamy wyłącznie wiadomości
  już zlecone.
- **Klient trafiał na surowy ekran logowania WordPressa** (zgłosił właściciel
  po kliknięciu „Przejdź do kursu" w mailu): przycisk „Zaloguj się" na
  „Moich kursach" i na bramce lekcji szedł przez `wp_login_url()` prosto na
  `wp-login.php` — wbrew decyzji z W6 i niespójnie z linkiem „Ustaw hasło",
  który prowadzi na stronę konta WooCommerce w naszym wyglądzie. Adres składa
  teraz `Aai_Sklep_Moje::adres_logowania()`, a filtr `woocommerce_login_redirect`
  odsyła klienta TAM, SKĄD przyszedł (zmierzone: po zalogowaniu ląduje na
  `/szkolenia/moje/`, nie na stronie konta). Pilnuje `straznik-frontu-wp`;
  smoke lekcji utrwalał stare zachowanie i został poprawiony.
- **Nagłówek CLI mówił nieprawdę o kodach wyjścia** — opisywał kod 1 jako
  jedyny przypadek „brak tabel" (prawda w P1, nieprawda po pięciu krokach).

### Dowody

- Strażnicy **35/35** (sześć nowych niezmienników P4 w `straznik-platnosci-wp`);
  niezmiennik 20 przepisany, bo celował w NAZWĘ metody — czwarty nawrót tej
  klasy wzorca (0.29.0, 0.44.0, 0.47.0, c6c9c97).
- Audyt mutacyjny **200** (191 → 200): 198 złapanych, **0 przeoczonych,
  0 martwych**, 2 pominięte (brak materiału). Reguła 29 celowała najpierw
  w NAPIS, nie w zachowanie — mutacja podmieniająca całe rozstrzygnięcie
  przeszła; **piąty nawrót tej klasy w repo**, złapany przez audyt w tym
  samym przebiegu, w którym powstał.
- `npm run check` kod 0; smoke'i WP: maile **40** · zakup 32 · produkty 71 ·
  front 84 · kreator 96 · panel 54 · motyw 89 (9 stron) · tutor 44 ·
  lekcja 35 · dane 30 · płatności 23.
- Dane Pluginu 1 nietknięte: `wp:sprawdz` 73/73 co do znaku, `wp:tutor`
  87 obiektów, **0 różnic**.
- **Przegląd przed PR-em na zamkniętej liście 10 pytań**: cztery znaleziska,
  każde potwierdzone uruchomieniowo PRZED naprawą; sześć odpowiedzi „czysto".
  Piąte znalezisko (ponowienie) znalezione niezależnie przed raportem.
  Jedno znalezisko odłożone świadomie do P5 (lista kursów w mailu 2 przy
  przerwanej pętli Tutora albo odpiętym kursie) — szczegóły w KROK-P4.md §9.
- **Pięć testów negatywnych**, z których dwa obnażyły ŚLEPE sprawdzenia
  w naszym własnym smoke'u (bramka statusu zapisu nie była dotykana przez
  żaden scenariusz; ścieżki „admin klika Processing" w smoke'u nie było
  wcale) — oba mają teraz własne bloki.

## [0.49.0] — 2026-08-29

**Krok P3b: przycisk mówi to, co klient naprawdę może zrobić, a zamówienie
z kursem nie utyka w realizacji.** Plan kroku, rozstrzygnięcia właściciela
i pomiary: [docs/plugin-2/KROK-P3B.md](docs/plugin-2/KROK-P3B.md).

### Dodane

- **Dostarczanie dostępu** (`Aai_Platnosci_Dostarczanie`): filtr
  `woocommerce_order_item_needs_processing` (produkt kursu nigdy nie wymaga
  obsługi, więc `payment_complete()` prowadzi PROSTO do `completed` — klient
  dostaje jeden mail zamiast dwóch) plus hak `woocommerce_order_status_processing`
  jako siatka na ręczną zmianę statusu w panelu. Powód zmierzony, nie przyjęty
  z dokumentacji: **Tutor ma czarną listę metod płatności** (`bacs`, `cod`,
  `cheque`) i przy nich NIE domyka zamówienia stojącego w `processing` — więc
  zarówno przelew opłacony przez bramkę, jak i wpłata potwierdzona przyciskiem
  „Processing” zostawiały klienta bez kursu, bez jednego objawu.
  Zamówienia **mieszane zostają w `processing`**, bo tam ten status jest
  prawdziwy — jest co wysłać; zamówienia bez naszych kursów nie są dotykane.
- **Cena z jednego źródła** (`Aai_Sklep_Widok::cena_grosze()` + filtr
  `aai_sklep_cena_kursu` + `Aai_Platnosci_Cena`): strona kursu, karta katalogu
  i `Offer.price` w danych strukturalnych biorą cenę EFEKTYWNĄ z WooCommerce
  (czyli z promocją) — z **jednego** wywołania na kurs, pamiętanego na czas
  żądania (strona pyta o tę samą cenę cztery razy). Nasza tabela zostaje
  źródłem ceny KATALOGOWEJ i to ją pokazuje kreator (rozstrzygnięcie
  właściciela). Pusta cena w Woo nie znaczy „za darmo”, tylko brak danych —
  wtedy wraca cena katalogowa.
- **Przycisk zakupu w czterech stanach** (`aai_sklep_cta_kursu` +
  `Aai_Platnosci_Cta`): kontakt przy zamkniętej sprzedaży, kasa z produktem
  przy otwartej, „Przejdź do kursu” dla kogoś, kto kurs ma, i **„Zamówienie
  w toku”** dla kogoś, kto czeka na zaksięgowanie przelewu. Czwartego stanu
  nie było w planie — wyszedł z pomiaru: przy przelewie zapis Tutora stoi na
  `on-hold`, więc bez niego klient tuż po złożeniu zamówienia widziałby
  zachętę do drugiego zakupu. Pytamy Tutora o ZAPIS, nie o dostęp (dostęp jest
  prawdziwy także dla zapowiedzi i dla administratora — pułapka z W6).
- **`PreOrder` → `InStock`** z tej samej decyzji co przycisk
  (`aai_sklep_dostepnosc_kursu`, wspólna metoda `produkt_do_kupienia()`), więc
  strona mówiąca „kup teraz” nie może deklarować oferty niedostępnej (K2).
  Dostępność NIE pyta o oglądającego — dane strukturalne czyta robot, czyli gość.
- `straznik-platnosci-wp`: **pięć nowych niezmienników** (zamówienia mieszane
  nie są domykane, filtr oddaje cudzym produktom wartość wejściową, przycisk
  pyta o zapis, warunek sprzedaży badany DOKŁADNIE raz, dostępność niezależna
  od oglądającego) i 5 mutacji w audycie, każda z `oczekiwanySlad`.
  Audyt: 183 → **191** mutacji (w tym trzy ze znalezisk przeglądu).
- **`npm run smoke:wp-zakup`** (`tools/smoke/smoke-wp-zakup.mjs`, 27 sprawdzeń):
  cena w trzech miejscach naraz, cztery stany przycisku, zgodność z ofertą,
  domykanie obiema ścieżkami i B16 — wszystko na własnym kursie testowym,
  ze sprzątaniem w `finally`.

### Naprawione

- **Rozdzielony adres zakupu od adresu kontaktu.** Jedna metoda obsługiwała
  przycisk „Dołączam” i zdanie „Masz inne pytanie? Napisz do nas” pod FAQ —
  różnica była niewidoczna, dopóki oba prowadziły do kontaktu, a od tego kroku
  wysyłałaby pytającego klienta prosto do płatności.

### Naprawione po przeglądzie przed PR-em

Recenzent + krytyk (potwierdzenia URUCHOMIENIOWE przed każdą naprawą), cztery
znaleziska — wszystkie prawdziwe:

- **Anulowane zamówienie blokowało zakup NA ZAWSZE.** Tutor tworzy zapis już
  przy składaniu zamówienia i nigdy go nie kasuje — anulowanie i zwrot tylko
  przestawiają mu status. Stan „Zamówienie w toku” pytał o samo ISTNIENIE
  zapisu, więc klient z anulowanym zamówieniem tracił przycisk zakupu
  bezpowrotnie. Zmierzone: zamówienie na `cancelled` → zapis `cancelled` →
  CTA dalej „Zamówienie w toku”. Teraz stan czyta STATUS zapisu i uznaje za
  trwające tylko `pending`, `on-hold`, `processing`.
- **Produkt `publish` z pustą ceną obiecywał zakup, którego kasa odmawia.**
  `is_purchasable()` w WooCommerce wymaga niepustej ceny, a decyzja „czy da
  się kupić” pytała wyłącznie o status wpisu. Zmierzone: `is_purchasable()`
  false, a CTA prowadziło do kasy i oferta deklarowała `InStock`.
- **Domknięcie odwracało kolejność maili i notatek.** Hak biegnie W ŚRODKU
  cudzego przejścia statusu, więc zapis wykonany od razu pozwalał reszcie
  TAMTEGO przejścia dojechać już po nadaniu `completed`: klient dostawał
  „zamówienie zrealizowane”, a chwilę po nim „zamówienie w realizacji”.
  Zmierzone na notatkach zamówienia (298–301). Domknięcie idzie teraz na
  `shutdown`, po dokończeniu cudzego przejścia.
- **Cena bez podatku nie była niczym pilnowana.** `get_price()` nie dolicza
  VAT-u, więc obietnica „na stronie ta sama liczba co w kasie” trzyma się
  tylko przy wyłączonym naliczaniu podatku. Kontrola `wp aai-platnosci sprawdz`
  odpowiada teraz kodem 1, gdy ktoś włączy podatki przed przeliczeniem ceny.

### Zapamiętane (pułapki zmierzone w tym kroku)

- **`WC_Order::needs_processing()` liczy `is_downloadable() && is_virtual()`**,
  a wynik trzyma w **cache obiektowym grupy `orders` na dobę**, kluczem per
  zamówienie (nie transient). Bez trwałego cache znika po żądaniu; z Redisem
  zamówienie policzone przed instalacją wtyczki trzymałoby starą odpowiedź.
- **Zagnieżdżona zmiana statusu w haku jest bezpieczna**: WooCommerce zeruje
  `status_transition` PRZED odpaleniem haków. Tak samo domyka zamówienia Tutor.
- **`woocommerce_order_status_changed` odpala się tylko przy niepustym `from`** —
  zamówienie utworzone od razu w `processing` przeszłoby mu pod nosem; stąd hak
  na `woocommerce_order_status_processing`.
- **Blok kasy nie renderuje pozycji w HTML** (dociąga je przez Store API), więc
  „prosto do kasy” mierzy się ciasteczkami `woocommerce_items_in_cart`
  i `woocommerce_cart_hash`, a nie treścią strony.
- **`includes("99,00 zł")` przechodzi dla „199,00 zł”** — pierwsza wersja
  sprawdzenia karty katalogu była przez to ŚLEPA i wykrył to dopiero test
  negatywny. Ta sama klasa co `endsWith("199.00")` z P2: porównuj CAŁĄ wartość.

## [0.48.0] — 2026-08-29

**Krok P3a: sklep przechodzi na silnik WooCommerce — z zamkniętą sprzedażą,
polskimi adresami i kasą w wyglądzie motywu.** Plan kroku z czterema
rozstrzygnięciami właściciela: [docs/plugin-2/KROK-P3A.md](docs/plugin-2/KROK-P3A.md).

### Dodane

- **Ustawienia jako kod** (`Aai_Platnosci_Ustawienia`): jedno źródło wartości
  docelowych sekcji 8 schematu — `monetize_by = wc`, auto-complete Tutora,
  para opcji kasy (B1: bez `signup_and_login_from_checkout` kasa oddaje 403
  każdemu niezalogowanemu), wyłączona zasłona „Coming soon" Woo (jako blokada
  DZIURAWA — Store API przyjmowało produkty mimo zasłony, zmierzone; jako
  strona — anglojęzyczna plansza w cudzych fontach zamiast motywu).
  **Ustawia** aktywacja wtyczki i `wp aai-platnosci sync --napraw`; kontrola
  wyłącznie czyta (L11) i nazywa każdy rozjazd z instrukcją naprawy.
- **Filtry obronne B17** na `monetize_by` i auto-complete — rejestrowane PRZY
  INCLUDE pliku wtyczki, bo Tutor bootuje przy include i OD RAZU czyta silnik
  (filtr z `plugins_loaded` przychodziłby po odczycie i niczego nie bronił —
  zmierzone); wartość w bazie dla prawdy ekranu, filtr przeciw cudzej zmianie.
- **Blokada sprzedaży do P4**: filtr `woocommerce_add_to_cart_validation`
  odrzuca produkty kursów, dopóki kroku P4 nie ma — zamyka okno „klient płaci
  i nie dostaje nic" między uzbrojeniem silnika a dostarczaniem. Pokrywa form
  handler, AJAX, Store API i wczytanie sesji koszyka (produkt sprzed blokady
  wypada). Flaga `aai_platnosci_sprzedaz_otwarta` domyślnie PUSTA = zamknięte;
  blokada nie otwiera okna B2, bo `is_course_purchasable` Tutora czyta
  wyłącznie meta (zmierzone w kodzie 4.0.7).
- **Polskie adresy**: `/koszyk/` i `/kasa/` (stare `/cart/`, `/checkout/`
  oddają 404 — `wp_old_slug_redirect` nie obejmuje stron, zmierzone);
  `/my-account/` zostaje. Puste strony natywnej kasy Tutora (`cart-2`,
  `checkout-2`, 0 znaków) → `draft`.
- **Koszyk i kasa w wyglądzie motywu**: sekcja 9 `woo-motyw.css` (bloki:
  pola, select, komunikaty, przyciski z akcentem marki) + klasa
  `has-dark-controls` na blokach obu stron — CIEMNY wariant kontrolek
  z arkusza samego Woo, bo style komponentów bloków drukują się w środku
  BODY (zawsze po arkuszach z `<head>`) i przy równej specyficzności białe
  tła wygrywały z każdą zależnością enqueue (zmierzone; stąd też zależność
  `wc-blocks-style` w `Aai_Sklep_Styl_Woo`).
- `smoke-wp-motyw` mierzy **dziewięć stron (89 sprawdzeń)**: doszły koszyk
  i kasa Z PRODUKTEM w koszyku gościa (izolowany kontekst przeglądarki —
  dla zalogowanego Woo czyta sesję po user_id i koszyk gościa jest
  niewidzialny; produkt dodaje SAMA przeglądarka przez `?add-to-cart=`,
  bo sesja przenoszona z Node wyglądała identycznie co do bajta, a serwer
  i tak widział pustkę), z asercją adresu po wczytaniu (pusta kasa
  przekierowuje do koszyka — pomiar cudzej strony ma paść, nie przejść)
  i testem negatywnym blokady w tym samym przebiegu.
- `straznik-platnosci-wp`: **trzy nowe niezmienniki** (blokada istnieje
  i domyślnie zamknięta; rejestracja ustawień na poziomie pliku; kontrola
  nie pisze — dokładnie jedno wywołanie `napraw()` w CLI) + 5 mutacji
  w audycie (każda z `oczekiwanySlad`) i kontrprzykład.
- `smoke-wp-produkty`: asercja wstępna `monetize_by = wc` — od P3a test B13
  mierzy przywracanie znacznika po CUDZYM, realnym handlerze Tutora
  (zapowiedziane w SWEEP-P2.md §4).

### Naprawione

- `smoke-wp-platnosci` porównuje silnik z **surowej bazy**, nie przez
  `get_option()` — filtr B17 wymuszał `wc` po obu stronach migawki
  i maskował wyzerowanie bazy przez deaktywację Woo (klasa 5 walidacji);
  po teście deaktywacji smoke sprząta silnik przez `sync --napraw`
  (bez tego każdy przebieg zostawiał czerwoną kontrolę — klasa 6).
- Operacje na wpisach stron (slug, szkic, klasa bloku) przeniesione do
  warstwy zapisu (`strona_na_szkic`, `ustaw_slug_strony`,
  `dopisz_klase_bloku`) — złapał to WŁASNY strażnik: „jedyny pisarz"
  obejmuje też strony, nie tylko produkty.

### Naprawione po przeglądzie przed PR-em

- **CICHA UTRATA TREŚCI STRON**: `dopisz_klase_bloku()` podmieniał PREFIKS
  klasy, więc trafiał w KAŻDY blok zagnieżdżony o tej samej nazwie
  początkowej i rozbijał jego klasę (`…-cart-items-block` →
  `…-cart has-dark-controls-items-block`). Zmierzone na żywych danych:
  13 uszkodzeń w koszyku, 22 w kasie — bez jednego objawu, bo blok Woo
  zwraca zapisaną treść bez regeneracji. Dopasowanie idzie teraz na
  GRANICY ATRYBUTU i podmienia tylko pierwsze wystąpienie; treść stron
  naprawiona; pilnują: reguła strażnika, mutacja i **kontrola danych**
  w `sprawdz` (rozbite nazwy klas = kod 1).
- Niezmiennik „rejestracja na poziomie pliku" liczy **głębokość klamer**,
  nie pozycję w linii — był ślepy na rejestrację warunkową z wywołaniem
  przy lewym marginesie (zmierzone mutacją-pytaniem).
- Docblock blokady prostuje obietnicę „wszystkich czterech ścieżek":
  **REST Orders API** (`/wc/v3/orders`, v4) filtra nie woła i jest
  świadomie poza zasięgiem (wymaga klucza API z prawem zapisu).

Dowody: strażnicy 35/35 · audyt mutacyjny **183** (0 przeoczonych,
0 martwych) · smoke: motyw **89**, produkty **71**, płatności 23, front 84,
tutor 44, lekcja 35, kreator 96, dane 30 · `wp:sprawdz` 73/73 ·
`wp aai-platnosci sprawdz` kod 0 (test negatywny: zepsuty slug/silnik →
kod 1 → `--napraw` → kod 0).

## [0.47.0] — 2026-08-28

**Krok P2: kurs staje się produktem WooCommerce — i to w kolejności, która
nie rozdaje kursów za darmo.** Oba prawdziwe kursy mają produkty utworzone
z naszej ceny, powiązane z kopią w Tutorze, ukryte w katalogu Woo. Sprzedaży
to jeszcze nie uruchamia (`monetize_by` zostaje `tutor` do kroku P3a, CTA
dalej prowadzi na `/kontakt`) — to jest świadomy zakres kroku.

### Dodane

- **Szew kurs → produkt** (`Aai_Platnosci_Szew`, priorytet 20): po każdym
  zapisie kursu w Pluginie 1 powstaje produkt WooCommerce z naszej ceny.
  Kolejność jest treścią bezpieczeństwa (B2): produkt rodzi się jako
  **`draft`**, potem na wpisie kursu Tutora ląduje
  `_tutor_course_price_type = paid` **NAJPIERW** i `_tutor_course_product_id`
  **NA KOŃCU**, a `publish` przychodzi dopiero z kompletem warunków.
  Odwrotna kolejność sprawia, że `do_enroll()` tworzy zapis `completed`
  na niezapłaconym zamówieniu — klient dostaje kurs za darmo. Przy
  zdejmowaniu para rozpina się odwrotnie.
- **Pięć stanów kursu obsłużonych wg tabeli 9.3 schematu**: `published`
  + cena > 0 → `publish`; cena 0 → `draft` + `price_type = free`; szkic →
  `draft`, `price_type` **nietknięty**; `archived` → `draft`; kurs usunięty
  → `draft`, produkt **nigdy nie kasowany** (niezmiennik 13).
- **`wp aai-platnosci sync [<slug>] [--napraw-cene]`** + synchronizacja
  przy aktywacji wtyczki (U3). Kontrola `sprawdz` urosła o rozjazd ceny
  regularnej I ceny liczonej w kasie, widoczność w katalogu, znaczniki,
  powiązanie w Tutorze, duplikaty uuid oraz **kupowalne sieroty**
  (produkt `publish` bez opublikowanego kursu = kod 1).
- **`Aai_Sklep_Odczyt::kurs_po_id()`** w Pluginie 1 — jedyna uzgodniona
  z właścicielem zmiana w skończonej wtyczce (L2): czysty odczyt karty
  kursu po uuid, bez sekcji, programu i treści lekcji.
- **`npm run smoke:wp-produkty`** (42 sprawdzenia) — bramka P2. Mierzy
  m.in. KOLEJNOŚĆ powiązania **hakiem na `added_post_meta`**, a nie
  deklaracją; trzy przebiegi synchronizacji z niezmienionym `sha256`
  wiersza produktu **razem z meta** (liczniki by nie wystarczyły —
  przeszłyby także przy produktach tworzonych od nowa); przywracanie
  `_tutor_product` po CUDZYM zapisie produktu (B13).
- `straznik-platnosci-wp` urósł z 7 do **10 niezmienników** (kolejność B2
  w obie strony, narodziny produktu jako `draft`, ukrycie w katalogu),
  audyt mutacyjny z 169 do **173**.
- **Punkt kontrolny w `postaw.sh`**: środowisko nie melduje „gotowe",
  kiedy `wp aai-platnosci sprawdz` widzi rozjazd szwu.

### Naprawione

- **Kontrola była ŚLEPA na każdy rozjazd przez 10 minut po
  synchronizacji.** Próg „w trakcie" (B15) degradował do informacji
  WSZYSTKO — także zepsutą cenę. Teraz degradują się wyłącznie stany
  **niekompletne** (brak produktu, brak powiązania), które najbliższy
  `sync` dokończy sam; rozjazd WARTOŚCI to zawsze kod 1, a okno skrócone
  z 600 do 60 s. Znalazł to smoke P2.
- **Naprawa ceny liczonej w kasie (`_price`) jest JAWNA, bo inna być nie
  może.** Zmierzone w kodzie Woo 11.0.1
  (`class-wc-product-data-store-cpt.php:856`): to pole przelicza się
  wyłącznie przy REALNEJ zmianie `_regular_price`/`_sale_price` w bazie —
  `set_price()` przez API nie zapisuje go wcale, a ponowny zapis tej samej
  ceny niczego nie wywołuje. Naprawa wymaga więc przejścia przez cenę
  tymczasową, a to nie ma prawa dziać się po cichu przy każdym zapisie
  kursu. Stąd `sync --napraw-cene`: produkt schodzi na czas naprawy na
  `draft` (nikt nie kupi po cenie przejściowej), cena tymczasowa jest
  **wyższa** o grosz (niższa kasowałaby promocję — `:857`), a promocja
  i status wracają nietknięte. Zwykły `sync` tego pola nie rusza —
  pilnuje tego smoke.
- Dwa wzorce `straznik-platnosci-wp` oskarżały niewinnych: odczyt
  `get_sale_price()` (konieczny, żeby NIE nadpisać promocji) był brany
  za zapis, a regex callbacku urywał się na przecinku wewnątrz
  `array( self::class,`. Po poprawce audyt dalej łapie komplet mutacji.
- **Wadliwa mutacja w audycie** (odwrócenie kolejności zdejmowania)
  wstawiała `delete` do wnętrza `if`, więc kolejność zostawała poprawna
  i mutacja nic nie testowała. Audyt to pokazał jako „PRZEPUŚCIŁ" —
  mutacja, która nic nie sprawdza, jest groźniejsza niż jej brak
  (ta sama lekcja co w 0.35.0).

### Przegląd agent+krytyk — 41 znalezisk, wszystkie naprawione

Pierwszy przegląd wg `agenci/przeglad-pr/` (trzech recenzentów na rozłącznych
obszarach, krytykiem agent główny; żadne znalezisko bez niezależnego
potwierdzenia). **Najważniejsze:**

- **KRYTYCZNE: `synchronizuj_kurs()` zostawiała produkt `publish` bez kompletu
  warunków** — trzy wyjścia awaryjne nie dotykały statusu, więc skasowanie
  kopii kursu w Tutorze zostawiało KUPOWALNY produkt bez powiązania („klient
  płaci i nie dostaje nic"), a kod pisał przy tym „produkt zostaje draft".
  Potwierdzone uruchomieniowo. Teraz status nadaje **jedno** miejsce na końcu
  metody, bez ani jednego wczesnego `return`.
- **Kontrola meldowała sukces przy rozbrojonym szwie.** Cała integracja Tutora
  z Woo siedzi za `if ( 'wc' !== $monetize_by ) return;`, a instalacja stoi na
  `tutor` — czyli nikt po tamtej stronie nie czyta naszych kluczy. Kontrola
  nazywa teraz ten stan **SZEW ROZBROJONY** (przestawienie należy do P3a, ale
  ślepoty nie zostawiamy do P3a).
- **Bez Pluginu 1: BŁĄD KRYTYCZNY PHP i „Success" z kontroli.** Plugin 1 nie
  był w ogóle zależnością. Teraz jest — komendy kończą się komunikatem, a
  kontrola mówi wprost, że **kursów nie sprawdzono**.
- **Degradacja „w trakcie" szła po TREŚCI komunikatu** (wzorzec na napis —
  pułapka, która w tym repo zzieleniała trzy razy), a dwa z trzech śladów były
  MARTWE. Teraz rozjazdy mają **kody stanu**, degraduje się dokładnie jeden
  (brak powiązania tuż po synchronizacji), a znacznik czasu czytamy z kolumny
  `sync_ts`, nie z mety produktu, której w tym stanie nie ma.
- **Mutacja audytu była MASKOWANA**: łamała dwie reguły naraz, więc zostawała
  czerwona nawet po skasowaniu tej, którą testowała. Audyt dostał pole
  **`oczekiwanySlad`** — sprawdza, czy zapalił się WŁAŚCIWY komunikat; doszła
  też pierwsza mutacja na `_sale_price` (niezmiennik 3 stał dotąd na słowie).
- **Stan błędu jest per kurs i czyści go `sync`** — jeden globalny slot był
  zatrzaskiem (naprawa nie gasiła czerwonej kontroli) i kłamcą naraz (zapis
  kursu A kasował alarm kursu B).
- Dalej: `Throwable` w pętli synchronizacji i przy deaktywacji, `try/finally`
  w naprawie ceny (bez niego wyjątek zostawiał kurs poza sprzedażą), bramka
  na istnienie tabel przed tworzeniem produktu, `esc_like`, ostrzeżenie gdy
  nasza kopia ceny skasowałaby promocję właściciela, `'edit'` przy odczytach
  porównawczych, uuid z tabeli zamiast z mety, `--napraw-cene` honoruje slug,
  `kurs_po_id()` nie zwraca **wyzerowanych** liczników (zero kłamie cicho —
  brak klucza wywala się głośno).
- **Procedura odtworzenia środowiska ma teraz czwartą komendę**
  (`npm run wp:sync-platnosci`, wpięta w `npm run wp:import`): import
  wystrzeliwuje zapis kursu ZANIM powstanie kopia w Tutorze, więc bez niej
  produkty zostawały szkicami.

Smoke P2 urósł z **42 do 70 sprawdzeń**: testy negatywne dla wszystkich gałęzi
kontroli, zieleń wymagana PRZED i PO każdej próbie (klasa BLAD-022),
porównania przez równość zamiast końcówki, wszystkie synchronizacje ze slugiem
kursu testowego. Przy okazji własny pomiar złapał **usterkę funkcji
pomiarowej**: konkatenacja wiąże w PHP mocniej niż `?:`, więc pomiar warunków
zawsze zwracał prawdę.

### Dowody

Strażnicy **35/35**, audyt mutacyjny **174** (0 przeoczonych, 0 martwych),
`npm run check` kod 0, `postaw.sh` kod 0, smoke: `wp-produkty` **70**,
`wp-kreator` 96, `wp-front` 84, `wp-tutor` 44, `wp-lekcja` 35, `wp-dane` 30,
`wp-platnosci` 23; dane Pluginu 1 nietknięte: `wp:sprawdz` **73/73 co do
znaku**, `wp:tutor` **0 różnic**.

## [0.46.0] — 2026-08-28

**Plugin 2 ma zaakceptowany schemat i stojący fundament — krok P0 zaliczony,
krok P1 zrobiony.** Schemat (`docs/plugin-2/DIAGRAM.md`) przepisany jednym
przebiegiem wg 54 znalezisk trzech krytyków (`docs/plugin-2/KRYTYKA-P0.md`),
przebudowany wizualnie wg wzoru diagramu Pluginu 1 i zaakceptowany przez
właściciela; wtyczka `aai-platnosci` istnieje, jest aktywna na `:8892`
i przechodzi własny smoke na żywej instalacji.

### Decyzje właściciela (2026-08-28)

- **AJAX w kokpicie ODPADA** — „Plugin 2 nie wprowadza żadnego własnego
  AJAX-a"; wystrzałem jest `admin-post.php` Pluginu 1 (akcja „Zapisz kurs")
  plus kanały zakupowe WooCommerce; naprawa zbiorcza komendą
  `wp aai-platnosci sync` (DIAGRAM.md, sekcja 11).
- **Przed KAŻDYM krokiem Pluginów 2 i 3: plan przebiegu + pytania
  doprecyzowujące + zgoda właściciela — dopiero potem kod.** Najmniejszy
  błąd w tych modułach może być destrukcyjny dla całego projektu.
- Trzy decyzje o P1: wtyczka aktywna na `:8892` już od P1; kontrola
  `wp aai-platnosci sprawdz` wchodzi od razu w wersji minimalnej i tylko
  rośnie; katalog `agenci/` z WYTYCZNE §4 powstaje przy P1.

### Dodane

- **Wtyczka `aai-platnosci` (0.1.0)** — fundament szwu do WooCommerce
  i Tutora: szkielet wzorem `aai-sklep` (autoloader bez Composera, blokada
  `ABSPATH`, jedno źródło nazw tabel), **BAZA Pluginu 2 = dwie tabele**
  przez `dbDelta` — `wp_aai_platnosci_powiazania` (kurs ↔ produkt Woo,
  UNIQUE na obu kolumnach) i `wp_aai_platnosci_dostawy` (co klient naprawdę
  DOSTAŁ; **UNIQUE na parze zdarzenie+identyfikator = atomowa idempotencja
  maili**, zastępuje `add_option` z B6). `Aai_Platnosci_Zapis` to jedyny
  pisarz do obu tabel i do produktu Woo; deaktywacja przestawia produkty
  z `powiazania` na `draft` — nie kasuje niczego (L4, niezmiennik 13);
  `uninstall.php` domyślnie nie rusza danych (skasowanie `dostawy` przy
  przeinstalowaniu = maile do klientów DRUGI RAZ). Bez Woo/Tutora wtyczka
  zostaje aktywna i mówi o tym w kokpicie — komunikat, nie biały ekran.
- **`wp aai-platnosci sprawdz`** (wersja minimalna): tabele, obecność
  Woo/Tutora i ich wersje wobec dowiedzionych (4.0.7 / 11.0.1 — inna wersja
  to kod 0 z ostrzeżeniem i listą trzech faktów do ponownego potwierdzenia,
  L17); „Woo wyłączone" = kod 0 z komunikatem (stan nazwany, nie rozjazd —
  L11); brak tabel przy aktywnej wtyczce = kod 1.
- **`straznik-platnosci-wp`** (35. strażnik, 8 mutacji w audycie —
  7 niezmienników + kontrprzykład): zero `wp_ajax_*`, zero
  `add_rewrite_rule`, jednokierunkowość wobec Pluginu 1 (zero zapisów do
  `aai_sklep_*` i wywołań `Aai_Sklep_Zapis::`), zero kasowania produktów,
  cena nigdy metą i nigdy `_sale_price`, słuchacze `aai_sklep_*`
  z `catch(Throwable)`, produkt tylko z warstwy zapisu.
- **`npm run smoke:wp-platnosci`** (23 sprawdzenia na żywej instalacji) —
  bramka P1. Sprząta po sobie do zera i porównuje liczniki obu tabel ze
  stanem sprzed przebiegu.
- **Katalog `agenci/przeglad-pr/`** (AGENT.md, KRYTYK.md, SKILL.md, golden)
  — struktura z WYTYCZNE §4, zapowiadana „wraz z pierwszymi agentami"
  i nigdy nie założona. Utrwala procedurę przeglądu agent+krytyk używaną
  przy B7, W4/W6 i krytyce P0; golden = prawdziwe znalezisko klasy
  BLAD-018 ze wszystkimi czterema cechami dobrego znaleziska.
- Środowisko: `compose.yml` montuje `aai-platnosci` w obu kontenerach,
  `postaw.sh` aktywuje wtyczkę i weryfikuje jej tabele artefaktem.
  **Nowy mount wymaga odtworzenia kontenerów** (`podman-compose down &&
  ./postaw.sh`) — bind mount trzyma inode.

### Naprawione

- **Smoke złapał błąd klasy B4 jeszcze przed PR-em**: `powiazanie_ustaw`
  na `INSERT … ON DUPLICATE KEY UPDATE` reagowało na konflikt KAŻDEGO
  klucza unikalnego — próba powiązania zajętego produktu z drugim kursem
  po cichu „aktualizowała" cudzy wiersz i meldowała sukces. Teraz: jawny
  `UPDATE` po własnym kluczu albo czysty `INSERT`; konflikt UNIQUE
  w którymkolwiek = odmowa (`false`), nigdy cicha podmiana. Pilnuje tego
  sprawdzenie w smoke'u.

### Dowody

Strażnicy 35/35, audyt mutacyjny 169 (8 nowych: 8 złapanych, 0 przeoczonych,
0 martwych), `smoke:wp-platnosci` 23/23, `wp:sprawdz` 73/73 i `wp:tutor`
0 różnic (dane Pluginu 1 nietknięte), render 4/4 bloków mermaid schematu
z testem negatywnym.

## [0.45.0] — 2026-08-25

**Krok W6 dostaje narzędzia i scenariusz, zamiast zaczynać się od pytania
„co właściwie mam kliknąć".** Wtyczka `aai-sklep` nie jest skończona, dopóki
nie przejdzie testu ręcznego — a ten test odpowiada na pytanie, którego żaden
strażnik nie umie zadać: czy to, co widzi człowiek, ma sens i wygląda jak nasze.

### Dodane

- **`npm run smoke:wp-panel`** (`tools/smoke/smoke-wp-panel.mjs`, 54
  sprawdzenia) — pierwszy pomiar KOLEKTORA PANELU, czyli warstwy JavaScriptu,
  która składa wysyłkę kreatora. Mierzy w prawdziwej przeglądarce, na obu
  prawdziwych kursach: (a) JSON wkładany do pól ukrytych tuż przed wysyłką
  zgadza się z tym, co stoi w kontrolkach — tytuł modułu z pola modułu, tytuły
  lekcji z pól lekcji, co do sztuki; (b) **zapis, przy którym niczego nie
  dotknięto, odpowiada `bez_zmian`**, nie rusza skrótu stanu kursu i nie
  dopisuje się do dziennika zmian. To jest sprawdzenie, które by BLAD-019
  złapało. Test negatywny: usunięcie `data-aai-lekcja` z listy granic → 18
  z 54 sprawdzeń pada i nazywa klasę błędu. **Test negatywny trzeba puszczać
  na ZDROWYCH danych** — na już zepsutych tytuł modułu równa się tytułowi
  ostatniej lekcji, więc zapis niczego nie zmienia i pomiar przechodzi
  fałszywie.

- **`npm run wp:klient`** (`tools/wp-klient-testowy.mjs`) — zakłada konto
  KLIENTA (`klient-test`, rola `subscriber`) i zapisuje je na wszystkie
  opublikowane kursy. Idempotentne; `--usun` kasuje konto razem z zapisami.
  **Po co osobne konto:** administrator widzi materiał z definicji, więc
  oglądanie lekcji na własnym koncie odpowiada na pytanie „czy admin to
  zobaczy", a nie „czy klient to zobaczy". Do tego pasek narzędzi WordPressa
  przesuwa stronę o 32 px i zasłania pigułkę lekcji — dlatego konto ma go
  **zgaszonego** (`show_admin_bar_front`), tak jak zwykły klient.
  Hasło jedzie do `wordpress/srodowisko/.env` (poza gitem), nigdy do
  dokumentacji.
- **[docs/plugin-1/W6-TEST-RECZNY.md](docs/plugin-1/W6-TEST-RECZNY.md)** —
  scenariusz testu na cztery ścieżki (gość → klient po zakupie → właściciel
  w kreatorze → czy nie zepsuliśmy motywu), z liczbami wyjściowymi z bazy
  i **tabelą rzeczy POZA zakresem**, żeby nie zgłaszać jako błąd tego, co
  należy do Pluginu 2.

### Naprawione (własny przegląd po zaliczeniu ścieżek C i D)

- **Kurs o slugu `moje` wchodził do katalogu, ale nie miał strony
  sprzedażowej (BLAD-021).** Od tej wersji pod `/szkolenia/moje/` stoi lista
  kupionych kursów, a jej reguła przepisywania jest sprawdzana PRZED regułą
  slugu. Kontrakt kreatora pilnował tylko długości, znaków i zajętości przez
  inny kurs — więc kurs o takim adresie zapisywał się bez słowa protestu,
  dostawał kartę z ceną w katalogu, a kliknięcie tej karty prowadziło na
  „Moje kursy". Zmierzone na żywej instalacji: odpowiedź 200, dane w tabelach
  poprawne, zero ostrzeżeń — czyli klasa błędu bez objawu. Naprawa:
  `Aai_Sklep_Trasy::PODSTRONY` jest jednym źródłem dla reguł przepisywania,
  listy widoków i `zarezerwowane_slugi()`; kontrakt i import odmawiają
  komunikatem przy POLU `slug`. Klasa rośnie z każdą nową podstroną sklepu
  (koszyk, kasa, podziękowanie w Pluginie 2), więc pilnuje jej strażnik.
- **Cały blok „złe wejście" w `smoke-wp-kreator` przechodził z jednego
  wspólnego powodu (BLAD-022).** Warstwa akcji zawsze wstawiała klucze
  `sekcje` i `moduly` — a gdy pól nie przysłano, wstawiała `null`, który
  kontrakt słusznie odrzuca jako zły kształt. Każde żądanie bez tych dwóch
  pól wracało więc z „bledy", niezależnie od tego, co jeszcze było w nim złe,
  a blok testu tych pól nie niósł: sześć sprawdzeń udawało, że pilnuje
  kontraktu (wielkie litery w slugu, cena nie-liczba, pusty tytuł, nieznany
  poziom, zajęty adres), nie pilnując niczego. Wykryte testem negatywnym
  nowego sprawdzenia z BLAD-021: po wyłączeniu odmowy blok DALEJ był zielony.
  Przy okazji wyszła nieprawda widoczna dla człowieka: żądanie bez programu
  dostawało „Program ma zły kształt" zamiast obowiązującego w całej warstwie
  zapisu „brak klucza znaczy nie ruszaj" (BLAD-018). Naprawa: klucz, którego
  nie przysłano, nie wchodzi już do wejścia — łańcuch „nie przysłano → brak
  klucza → nie ruszaj" jest cały. Po naprawie każdy z dwóch testów
  negatywnych trafia w SWÓJ przypadek i tylko w niego.

### Naprawione (zgłoszenia właściciela z testu ręcznego W6)

- **Zwykły zapis w kreatorze przemianowywał WSZYSTKIE moduły kursu
  (BLAD-019).** Właściciel poprawił tytuł i cenę na zakładce *Kurs*, programu
  nie tknął — a sześć modułów Kursu 1 dostało tytuły swoich OSTATNICH lekcji
  („Fundamenty: poznaj Claude" → „Słowniczek pojęć — mów językiem AI"). Zapis
  zameldował sukces, kopia w Tutorze wiernie powtórzyła błędne tytuły
  (`wp:tutor` pokazywał 0 różnic, bo obie strony były już zepsute), a front
  wyświetlał złe nazwy w programie.
  **Mechanizm:** kontrolki panelu nie mają atrybutu `name` (`max_input_vars`
  ucina POST w milczeniu przy 41 lekcjach), więc wysyłkę składa
  `assets/panel.js`. Zakres zbierania pól zamykał `najblizszyKontener()`,
  który znał trzy granice: `data-aai-pole`, `data-aai-wiersz`,
  `data-aai-obiekt`. Wiersz lekcji niesie `data-aai-lekcja` — **tego znacznika
  na liście nie było**, więc pole `title` każdej lekcji przeciekało do obiektu
  modułu i nadpisywało jego tytuł; wygrywała ostatnia.
  **Naprawa:** granice zebrane w jedną listę `GRANICE_ZAKRESU`, obejmującą
  korzeń KAŻDEGO rekordu panelu (`data-aai-sekcja`, `data-aai-modul`,
  `data-aai-lekcja`). Dane odtworzone z Postgresa (`wp:import` + `wp:sync`),
  zgodność potwierdzona `wp:sprawdz` (73/73 treści co do znaku).
  **Dlaczego nie złapał tego żaden automat:** `smoke-wp-kreator` (95
  sprawdzeń) wysyła gotowy JSON POST-em i nigdy nie uruchamia przeglądarki,
  więc cały kolektor panelu był poza zasięgiem pomiaru. Ta luka ma teraz
  własny smoke (niżej).
- **Zapis, przy którym niczego nie dotknięto, meldował „Kurs zapisany"
  i puchł dziennik zmian (BLAD-020).** `Aai_Sklep_Zapis::json()` obiecywał
  w nagłówku „JSON o STAŁYM kształcie — ta sama wartość musi dawać ten sam
  łańcuch", a robił samo `wp_json_encode()`, które zachowuje kolejność kluczy
  tablicy. Klucze układa ten, kto akurat pisze: import w kolejności eksportu,
  panel w kolejności opisu pól. Skutek: pierwszy zapis po imporcie przepisywał
  wszystkie 24 sekcje obu kursów, dopisywał 24 wiersze do dziennika i pchał
  niepotrzebną synchronizację do Tutora — łamiąc decyzję właściciela z 0.37.0
  („audyt zapisuje tylko realne zmiany"). Nic się przy tym nie zapalało, bo
  dane były poprawne. Naprawia `Aai_Sklep_Zapis::uporzadkuj()`: klucze MAP
  porządkowane rekurencyjnie, LISTY nietknięte — ich kolejność JEST treścią.
  Znalezione POMIAREM przy budowaniu smoke'a kolektora: `wp:sprawdz` mówił
  „zero różnic" (porównuje strukturalnie), a `wp:import` w tej samej chwili
  przepisywał 10 sekcji.

- **Klient nie miał JAK trafić do kupionego kursu.** Logowanie WordPressa
  wyrzuca na `/my-account/`, a jedyną listą kupionych kursów był panel Tutora
  — pełnoekranowa aplikacja z własnym paskiem bocznym, własnym nagłówkiem
  i oknem powitalnym Tutora (ze zrzutem cudzego kursu fotografii i napisem
  „Hi, Sophia!"). Powstała **nasza strona `/szkolenia/moje/`**: lista kupionych
  kursów z paskiem postępu i przyciskiem „Kontynuuj naukę", prowadzącym do
  pierwszej NIEODHACZONEJ lekcji. Panel Tutora (`/dashboard/`
  i `/dashboard/courses/`) przekierowuje tam **302**. Pozycja **„Moje kursy"**
  wchodzi do obu nawigacji motywu, ale **tylko zalogowanemu klientowi, który
  ma choć jeden kurs** — gościowi nie pokazujemy drzwi, za którymi nic dla
  niego nie ma. Strona ma `noindex`: jej treść zależy od konta, a robot jest
  gościem.
- **Strony konta WooCommerce renderowały się bez stylów.** `/my-account/*`
  dostawało arkusze Woo, ale nie nasz arkusz integracji — obsługiwał wyłącznie
  strony Tutora — i nikt nie rezerwował miejsca pod nagłówek `fixed`. Menu
  konta lądowało w lewym górnym rogu POD nagłówkiem, ciemny tekst na ciemnym
  tle. To ta sama klasa błędu co 0.38.0/0.40.0 (reguły spoza warstw kaskady
  biją motyw). Powstał `Aai_Sklep_Styl_Woo` + `assets/woo-motyw.css`, bliźniak
  warstwy Tutora, pytający `Aai_Sklep_Zasoby::strona_woo()` — więc obejmie też
  koszyk i kasę, gdy przyjdą z Pluginem 2.
- **Strzałka „wróć" w lekcji odsyłała kupującego na CENNIK.** Właściciel cofnął
  się z lekcji i wylądował na stronie sprzedażowej kursu, który już ma —
  a jedynym wyjściem z tamtej strony jest przycisk „Dołącz". Odnośnik ma teraz
  dwie postacie: kto jest **zapisany na kurs**, wraca do „Moich kursów"; kto nie
  jest (gość na darmowej zapowiedzi, ktoś z wyszukiwarki) — na stronę
  sprzedażową, bo dla niego to jest właściwy następny krok. Pytamy Tutora
  o ZAPIS, nie o `dostep` z widoku: `dostep` jest prawdziwy także dla
  zapowiedzi i dla administratora, więc gość dostałby odnośnik do pustej listy.
- **Menu konta WooCommerce nie prowadziło do kursów.** Właściciel szukał ich
  klikając „Dashboard", a menu mówiło o zamówieniach, pobraniach i adresach.
  **„Moje kursy" są tam teraz PIERWSZĄ pozycją** — dla naszego produktu kurs
  jest ważniejszy niż faktura. Adres podmienia filtr `woocommerce_get_endpoint_url`,
  bo nasza strona nie jest endpointem konta i bez tego pozycja prowadziłaby
  do `/my-account/aai-moje-kursy/`, czyli do 404.
- **`smoke-wp-motyw` mierzy teraz SIEDEM stron** (było pięć): doszły
  `/my-account/` i `/szkolenia/moje/`, a `/dashboard/` ustąpił miejsca
  `/dashboard/retrieve-password/`, bo panel jest już nasz. **64 sprawdzenia.**
  `smoke-wp-front` pilnuje obu przekierowań panelu i tego, że gość nie widzi
  na „Moich kursach" ani jednego kafelka — **83 sprawdzenia** — a **65.**
  sprawdzenie smoke'a motywu pilnuje pierwszej pozycji menu konta.
  `smoke-wp-lekcja` sprawdza **obie postacie strzałki „wróć"** (34): stan
  kupującego robi POMIAREM — zapisuje administratora na kurs, pyta stronę
  i zapis cofa.

### Naprawione (przegląd kodu tej gałęzi)

Cztery znaleziska, wszystkie potwierdzone POMIAREM przed naprawą:

- **Menu podświetlało DWIE pozycje naraz.** „Moje kursy" powstaje przez
  sklonowanie ostatniego `<li>` — czyli wstawionej przed chwilą pozycji
  „Szkolenia", która na naszych stronach nosi już `aria-current`. Klon
  dziedziczył atrybut, a podmiana adresu doklejała nasz obok cudzego. Zmierzone
  na żywej stronie: katalog 2, strona kursu 2, „Moje kursy" 1. Klon jest teraz
  czyszczony przed wstawieniem.
- **Menu kosztowało 90 zapytań na KAŻDEJ odsłonie.** `pozycje()` wołało
  `Aai_Sklep_Moje::kursy()` raz na kotwicę nawigacji, a to **45 zapytań
  i 18,7 ms** (pomiar: 2 kursy, 73 lekcje), bo o ukończenie pyta Tutora lekcja
  po lekcji. Menu pyta teraz `ma_kursy()` — **3 zapytania, 2,8 ms** — a wynik
  `kursy()` jest pamiętany na czas żądania.
- **Widok prywatny nie zakazywał cache'owania.** „Moje kursy" oddawały 200 bez
  `nocache_headers()`; cache strony albo CDN bez reguły na ciasteczko logowania
  mógłby wydać listę kursów jednego klienta drugiemu.
- **`wp:klient` mógł zostawić konto z nieznanym hasłem** — hasło zmieniało się
  w WordPressie od razu, a do `.env` szło dopiero po weryfikacji.

**LEKCJA Z TESTU NEGATYWNEGO (nowa klasa):** sprawdzenie nagłówków
`Cache-Control` w smoke'u **NIE pilnowało naszej linii** — po usunięciu
`nocache_headers()` nagłówki i tak przychodzą, bo dokłada je coś innego
w stosie. Smoke pilnuje więc WŁASNOŚCI odpowiedzi, a naszej gwarancji pilnuje
`straznik-frontu-wp`. Jego pierwszy wzorzec też był ślepy: pytał
o `nocache_headers()` w promieniu 600 znaków od słowa `'moje'` i trafiał
w **drugie** wywołanie w tym samym pliku (gałąź 404) — pokazał to audyt
mutacyjny. Ta sama pułapka dotknęła samej mutacji: „pierwsze z brzegu"
`nocache_headers();` to było cudze wywołanie. Audyt: **156** mutacji.

### Świadomie BEZ zmian

**Cztery lekcje są darmowe dla każdego** — w naszych tabelach mają `preview = 1`:
pierwsza lekcja modułu 1 i jednego dalszego modułu w każdym kursie. Bramka
dostępu działa **zgodnie z tymi danymi**, więc to nie jest wyciek, tylko
próbka. Właściciel obejrzał liczby (18,5 tys. znaków na lekcję) i **zdecydował
2026-08-25: zostają wszystkie cztery.** Zapisane tutaj, żeby następne
zgłoszenie „lekcja otwiera się bez logowania" nie ruszyło śledztwa od nowa.

### Zapamiętane przy okazji

**`tutor_utils()->is_enrolled()` w tym samym żądaniu, w którym powstał zapis,
oddaje `false`** — Tutor trzyma zapisy w pamięci żądania. Sprawdzenie zaraz po
zapisie meldowałoby porażkę przy udanym zapisie, więc narzędzie weryfikuje
dostęp w **osobnym żądaniu**. Test negatywny (wyłączony zapis + skasowane
zapisy) wywala je z kodem wyjścia **1**, zmierzonym BEZ potoku.

## [0.44.0] — 2026-08-25

**Klient czyta lekcję w naszym wyglądzie, nie w cudzym.** Druga część kroku W5:
materiał kursu wyświetla NASZ szablon — ten sam wygląd, który właściciel przyjął
przy 0.34.0 — a nie strona Tutora.

### Dodane

- **`Aai_Sklep_Proza`** — renderer Markdownu w PHP, bez ani jednej zależności.
  Zakres ZMIERZONY na 73 plikach prozy: nagłówki, listy (także zagnieżdżone
  i numerowane), bloki kodu, tabele, cytaty, obrazy, odsyłacze, emfaza, linia
  pozioma. Rozpoznaje sekcje po nagłówkach, które w prozie JUŻ SĄ („Czego się
  nauczysz", „Zrób to teraz", „Zapamiętaj", „Co dalej") i pakuje je we własne
  pudełka z ikoną. **Ucieka wszystko** — materiał wchodzi kreatorem, czyli
  polem tekstowym. Konstrukcja, której nie zna, **zatrzymuje lekcję** zamiast
  pokazać klientowi `## Czego się nauczysz` jako zdanie.
- **`tools/sprawdz-proze-php.mjs`** (`npm run wp:proza`) — dowód różnicowy: te
  same 73 lekcje przez PHP i przez `marked` z narzędzia, którym powstał przyjęty
  podgląd; tekst musi zgadzać się **co do słowa**, struktura co do znacznika.
- **`Aai_Sklep_Zrzuty`** + `npm run wp:zrzuty` — 148 zrzutów w bibliotece
  mediów, idempotentnie (po `sha256`), kluczowane parą **lekcja + nazwa**, bo
  same nazwy powtarzają się między kursami i wewnątrz kursu. Treść w bazie
  zostaje nietknięta: ścieżka z prozy zamienia się w adres załącznika dopiero
  przy renderowaniu.
- **`Aai_Sklep_Lekcja`** + szablony `lekcja.php`, `czesci/pasek-lekcji.php`,
  `czesci/lekcja-odhacz.php`, `czesci/lekcja-bramka.php`, arkusz `lekcja.css`
  i skrypt `lekcja.js` — widok lekcji: pływająca pigułka z programem i spisem
  sekcji, hero z pozycją w kursie, treść w kolumnie czytania, zrzuty w figurach
  z zarezerwowanym miejscem, most „Co dalej", nawigacja poprzednia/następna.
- **`straznik-lekcji-wp`** (34. strażnik, 10 mutacji) i **`smoke-wp-lekcja`**
  (`npm run smoke:wp-lekcja`, 32 sprawdzenia z przelotem przez wszystkie
  73 lekcje).
- **`smoke-wp-motyw` mierzy PIĄTĄ stronę — widok lekcji** (47 sprawdzeń zamiast
  32). Widok lekcji jest jedyną mierzoną stroną **zza logowania** i jedyną, która
  mieszka pod adresem Tutora, więc na kolizję klas z 0.38.0 narażona jest
  najmocniej. Mierzymy ją **na końcu**: od chwili zalogowania każda kolejna
  odsłona niosłaby pasek narzędzi WordPressa, a cztery wcześniejsze strony mają
  wyglądać dokładnie tak, jak ogląda je gość. Adres lekcji **bierzemy z
  instalacji** (ta z największą liczbą zrzutów — jasne interfejsy najmocniej
  obciążają pytanie o jasne powierzchnie i kontrast), a nie z wpisanego sluga,
  który po pierwszej korekcie tytułu wskazywałby stronę 404 — też naszą i też
  ciemną, więc pomiar przechodziłby dalej.

### Zmienione

- **Postęp bierzemy z ukończeń Tutora**, nie z pamięci przeglądarki. Podgląd
  podpisywał postęp „nie na koncie", bo konta nie znał; tutaj klient jest
  zalogowany, więc podpis przestał być prawdą.
- **O dostęp pyta Tutor** (`has_enrolled_content_access`). Bez dostępu treść
  **nie jest w ogóle czytana** — materiał, którego nie wczytano, nie ma jak
  wyciec przez pomyłkę w szablonie.
- Strona lekcji **nie ładuje CSS-u ani JS-u Tutora** (`Aai_Sklep_Zasoby` wie,
  że to nasza strona), a **nagłówek motywu ustępuje pigułce** — tak samo jak
  na stronie kursu, bo obie belki są `fixed` u góry.

### Naprawione (znalezione dowodem różnicowym, w renderze prozy)

**Pomiar `/student-registration/` był ŚLEPY.** Zakres stron Tutora pytał
o `.tutor-wrap`, a ta strona renderuje ekran „Access Denied" w
`.tutor-disabled-wrapper` — więc cztery jej sprawdzenia (jasne plamy, kontrast,
nachodzenie, nieznane zapisy koloru) od 0.41.0 przechodziły **po pustce**,
meldując zero usterek bez oglądania ani jednego elementu. Zakres celuje teraz
w markup Tutora (`[class*='tutor-']:not(body)`), a przed nawrotem chroni nowa
asercja **„zakres trafił w co najmniej jeden element"**, dołożona na każdej
mierzonej stronie. To ona tę ślepotę wykryła — nie człowiek.

**Pomiar łapał pigułkę w losowej klatce animacji wjazdu** (`aai-pasek-wjazd`,
0,5 s): dwa przebiegi tej samej strony dawały dolną krawędź belki 61 px i 59 px,
a to właśnie ta liczba rozstrzyga, czy napis „wjeżdża pod belkę". Mierzymy teraz
po ustaniu ruchu — z filtrem na animacje nieskończone, bo samo `getAnimations()`
nigdy się nie kończy przy dryfujących blobach tła.

**Log smoke'a mówił nieprawdę**: drukował „0 jasnych plam" nawet wtedy, gdy lista
usterek pod spodem wypisywała sześć. Podaje teraz zmierzone liczby.

Pięć prawdziwych różnic wobec wzorca: emfaza bez reguły ograniczników GFM
(`** \ + Enter**` robiło się pogrubieniem), kursywa zagnieżdżona, kursywa
przez koniec wiersza, ogrodzenie kodu zamykane „na trzy" mimo czterech
apostrofów (lekcja o Markdownie pokazuje blok W BLOKU) oraz akapity w listach
zwartych. Zostały **dwie różnice świadome** — obie są usterkami `marked`
(próbuje emfazy przed kodem w linii), obie nazwane w kodzie dowodu.

### Dowody

Strażnicy **34/34**, audyt mutacyjny **155** (0 przeoczonych, 0 martwych),
`smoke-wp-lekcja` **32** (73 lekcje bez zatrzymania renderera, najdłuższa
odsłona **194 ms**), `smoke-wp-motyw` **47** (pięć stron), `smoke-wp-front` 78,
`smoke-wp-kreator` 95, `smoke-wp-dane` 30, dowód różnicowy **73/73**,
`wp:sprawdz` 73/73 co do znaku, `npm run check` zielone (testy 83/83).
Testy negatywne: renderer z wyłączoną kursywą wywala dowód na 57 lekcjach,
bramka przepuszczająca każdego wywala smoke na czterech sprawdzeniach, a przy
piątej stronie — jasne tło treści zapala plamy i kontrast **tylko na lekcji**,
pomiar bez zdjęcia paska narzędzi zapala samokontrolę układu, wyższa pigułka
chowa pod sobą cztery napisy hero.

Dowód, że zdjęcie paska narzędzi nie fałszuje pomiaru: przy realnie wyłączonym
pasku w profilu (`show_admin_bar_front=false`) strona lekcji ma **co do piksela**
ten sam układ, co przy dwóch regułach zdejmujących pasek — pigułka 0–68 px,
`<main>` 0–6990, hero 144–539, dokument 7642 px.

## [0.43.0] — 2026-08-25

**Kopia kursu w Tutor LMS przestaje starzeć się w milczeniu.** Pierwsza część
kroku W5: wtyczka kopiuje kurs do wpisów Tutora **po każdym zapisie**, a osobna
kontrola odpowiada na pytanie, czy obie kopie naprawdę są zgodne.

Do tego wydania kopia trafiała do Tutora RAZ, ręcznym `wordpress/import-kursy.php`.
Każda poprawka w kreatorze rozjeżdżała obie strony po cichu: właściciel widział
nową wersję w panelu, a klient po zalogowaniu czytał starą. Nic się przy tym nie
zapalało — a to jest w tym projekcie najdroższa klasa błędu (BLAD-015,
znalezisko #1 przeglądu B7).

### Dodane

- **`Aai_Sklep_Tutor`** — jedyne miejsce, które pisze do wpisów Tutora. Kopiuje
  kurs, moduły i lekcje (dopasowanie po `_aai_zrodlo_uuid`, nie po slugu),
  spłaszcza cztery sekcje do pól, które Tutor drukuje sam, a wszystkie dwanaście
  wkłada ze strukturą do `_aai_sekcje`. Kasuje w kopii to, czego nie ma już
  u nas — łącznie z całym kursem po jego usunięciu.
- **Wyzwalacz w warstwie zapisu**: `zapisz_kurs`, `zapisz_tresc_lekcji`,
  `ustaw_status` i `usun_kurs` ogłaszają zmianę akcją `aai_sklep_kurs_zmieniony`
  / `aai_sklep_kurs_usuniety`. Akcja, a nie wywołanie wprost — inaczej jedyne
  miejsce piszące do naszych tabel byłoby związane z cudzą wtyczką i jej brak
  byłby awarią zapisu.
- **`wp aai-sklep sync`** (`npm run wp:sync`) — pierwsze wypełnienie i naprawa
  po awarii — oraz **`wp aai-sklep sprawdz-tutora`** (`npm run wp:tutor`):
  porównuje obie kopie pole po polu i **kończy się kodem wyjścia 1**, gdy się
  rozjechały. Nazywa po imieniu trzy klasy rozjazdu: różnicę pola, sierotę po
  skasowanym obiekcie i wpis zrobiony poza kreatorem.
- **`straznik-tutora`** (33. strażnik, 12 mutacji w audycie) — pilnuje KODU:
  czy synchronizacja jest podpięta, czy jedzie w jedną stronę, czy każda droga
  zapisu ją ogłasza, czy wpisy Tutora rusza jedno miejsce, czy meta idzie przez
  `wp_slash`, czy spłaszczanie sekcji ma asercję i czy awaria kopii nie cofa
  zapisu właściciela.
- **`smoke-wp-tutor`** (`npm run smoke:wp-tutor`, 44 sprawdzenia) — pilnuje
  DANYCH na żywej instalacji, na własnym kursie: powstanie kopii, idempotencja
  (drugi import nie rusza ani jednego wpisu), zmiana tytułu i kolejności modułów,
  treść lekcji zgodna **co do znaku** (razem z backslashami, na których potknął
  się import w 0.36.0), publikacja, lekcja skasowana bez sieroty, okładka
  z biblioteki mediów jako miniatura i usunięcie całego kursu. Trzy z tych
  sprawdzeń to testy NEGATYWNE: ręczna zmiana w Course Builderze, sierota i wpis
  spoza kreatora — każdą kontrola musi zobaczyć.
- **Ostrzeżenie w kokpicie**, gdy kopia nie nadążyła. Cena decyzji „awaria kopii
  nie cofa zapisu" jest taka, że nieudana kopia byłaby niewidoczna; teraz błąd
  zostaje zapamiętany i widać go na każdym ekranie kreatora.
- **Filtr w audycie mutacyjnym**: `node tools/straznicy/audyt-straznikow.mjs
  straznik-tutora` puszcza same mutacje jednego strażnika. Pełny przebieg trwa
  kilka minut, a przy PISANIU strażnika potrzebna jest pętla zwrotna w sekundach.

### Zmienione

- **`wordpress/import-kursy.php` wycofany.** Jego mapy (status, poziom, cztery
  sekcje Tutora) przeniosły się do klasy wtyczki — tak, jak zapowiadał jego
  własny nagłówek. Skrypt umiał tylko przepisać eksport, więc kopia starzała się
  przy pierwszej poprawce z kreatora.
- **`wp aai-sklep import` raportuje też kopię w Tutorze** (i robi ją RAZ na kurs,
  na końcu, zamiast po każdym zapisie w pętli).
- Opis kursu jedzie do zajawki wpisu (`post_excerpt`), a treść wpisu zostaje
  **pusta świadomie**: stroną sprzedażową jest nasza `/szkolenia/<slug>`, na którą
  `/courses/<slug>/` i tak oddaje 301.

### Świadomie zostawione puste

- **Cena kursu w Tutorze zostaje `Free`.** Sprzedaż bierze WooCommerce (Plugin 2),
  a decyzja „gdzie mieszka cena" jeszcze nie zapadła. Wartość jedzie do kopii jako
  `_aai_cena_grosze`, żeby dana nie przepadła — ale kurs w Tutorze jest darmowy
  i to jest prawda, bo kupić się go tam nie da.
- **Miniatura wpisu tylko dla okładki z biblioteki mediów.** Okładki obu kursów
  to dziś pliki SVG jadące z wtyczką, a WordPress nie wpuszcza SVG do biblioteki
  — i nie zamierzamy tej blokady otwierać dla strony, którą klient ogląda pod
  naszym adresem. Okładka wybrana w kreatorze (od W4) staje się miniaturą od razu;
  pilnuje tego smoke.

### Dowody

Strażnicy **33/33**, audyt mutacyjny **145** (12 nowych, 0 przeoczonych,
0 martwych), `npm run check` zielone (testy **83/83**, build, smoke'i prototypu),
`smoke-wp-tutor` **44**, `smoke-wp-kreator` 95, `smoke-wp-front` 78,
`smoke-wp-motyw` 32, `smoke-wp-dane` 30, `wp:sprawdz` **73/73 zgodne co do
znaku**, `wp:tutor` **0 różnic na 87 obiektach**.

Test negatywny samego smoke'a: po odpięciu synchronizacji od warstwy zapisu
przebieg pada na ośmiu sprawdzeniach — czyli nie jest ślepy.

## [0.42.0] — 2026-08-25

**Właściciel może wreszcie zmienić treść w WordPressie.** Krok W4 etapu
WordPress: kreator z Działu 6 przeniesiony do kokpitu — kurs, program,
dwanaście rodzajów sekcji sprzedażowych i treść lekcji. Do tego wydania
jedyną drogą do treści był import z Postgresa komendą wiersza poleceń.

Wygląd panelu: **natywny kokpit WordPressa z akcentem volt** (decyzja
właściciela 2026-08-25). Okładkę wybiera się **z biblioteki mediów** — prototyp
odrzucił wgrywanie 2026-08-17 tylko dlatego, że nie miał gdzie trzymać plików.

### Dodane

- **Kreator w kokpicie** (`Aai_Sklep_Panel`) — menu „Automatic AI": lista
  kursów z licznikami postępu (sekcje, moduły, lekcje i **treść lekcji N/M**),
  edytor kursu z trzema zakładkami i JEDNYM zapisem, osobny edytor treści
  lekcji. Uprawnienie `manage_options` — to samo, którym W3 wpuszcza na
  szkice; token z prototypu **nie** jedzie do WordPressa, bo byłby drugim,
  słabszym systemem uprawnień obok istniejącego.
- **Kontrakt zapisu** (`Aai_Sklep_Kontrakt`) — to, czego W2 świadomie nie
  zrobił („kontrakt pól przychodzi z kreatorem w kroku W4"). Port `KursWejscie`,
  `TrescLekcji` i `MaterialLekcji` z `modules/m1-sklep/typy.ts` co do liczby,
  razem z blokadami z przeglądu B7: powtórzony `id` modułu albo lekcji,
  powtórzony rodzaj sekcji, powtórzona pozycja w jednym rodzicu. Błąd wraca ze
  **ścieżką do pola** (`moduly[2].lekcje[7].title`), a nie jako „zapis się nie
  powiódł".
- **Silnik opisu pól** (`Aai_Sklep_Pola`) — jedno miejsce, które wie, co znaczy
  „pole typu akapit". Odpowiada na cztery pytania naraz: czy treść z bazy da się
  wyświetlić, czy treść z formularza wolno zapisać, jak narysować kontrolkę
  i czego w sekcji brakuje. Port `components/kreator/tresc-sekcji.ts`.
- **Etykiety pól przeniesione DO KONTRAKTU** (`Aai_Sklep_Sekcje::SCHEMATY`).
  W prototypie mieszkały osobno (`opis-sekcji.ts`) i mogły rozjechać się
  z kontraktem — pilnował tego `straznik-kreatora`. Tutaj panel rysuje się
  z TEJ SAMEJ tablicy, którą sprawdzana jest treść, więc rozjazd jest
  **niemożliwy, a nie pilnowany** (to samo rozwiązanie, co `KOLEJNOSC`).
- **`Aai_Sklep_Sekcje::kolejnosc_w_panelu()`** — kolejność zakładek sekcji
  wyprowadzona z `KOLEJNOSC`, domknięta pętlą po wszystkich rodzajach. Rodzaj
  dopisany do kontraktu nie ma jak wypaść z panelu.
- **Warstwa odczytu panelu** (`Aai_Sklep_Odczyt_Panelu`) — osobno od odczytu
  dla strony, bo odpowiada na inne pytania: wszystkie stany kursu, sekcje
  **surowe** (bez pobłażliwego odsiewu — edytor ma pozwolić NAPRAWIĆ zły
  rekord, a nie ukryć go) i treść lekcji. Kolumnę `lessons.content` czyta
  wyłącznie ta klasa, za bramą uprawnień.
- **Trzy nowe drogi w warstwie zapisu**: `zapisz_tresc_lekcji()` (osobna akcja
  na materiał — ładunek i ryzyko, jak w prototypie), `ustaw_status()`
  (publikacja bez przepisywania kursu) oraz **rozróżnienie braku klucza
  `content`/`materials` od pustej wartości** — patrz „Naprawione".
- **`straznik-kreatora-wp`** (32. strażnik, 11 mutacji) i **`smoke-wp-kreator`**
  (`npm run smoke:wp-kreator`, 92 sprawdzenia) — szczegóły niżej.
- **`wp aai-sklep opis --format=json`** — komenda diagnostyczna z opisem pól.
  Dzięki niej smoke generuje przykładową treść Z KONTRAKTU, a nie z listy
  wpisanej w teście: pole dopisane do kontraktu samo wchodzi do rundy
  „zapisz → odczytaj". Mechanizm wprost z Działu 6.

### Naprawione

- **BLAD-017 — link autora ZNIKAŁ ze strony sprzedażowej.** Sekcja `author`
  obu kursów ma w bazie odnośnik `https://automaticai.pl`, a na żywej stronie
  napisu „Zobacz moje projekty" **nie było** (grep po HTML-u bez `<script>`:
  0 trafień). Kontrola pola typu `adres` używała `wp_http_validate_url()` —
  funkcji od SSRF, która rozwiązuje nazwę w DNS-ie i odrzuca hosty, których nie
  umie rozwiązać. `automaticai.pl` to domena docelowa, **jeszcze niekupiona**,
  więc każdy odnośnik do niej był po cichu odsiewany. Wyszło dopiero przy W4:
  ścisły kontrakt kreatora odrzucił poprawny adres komunikatem „podaj pełny
  adres http/https". Teraz pytamy o to, o co naprawdę chodzi — czy adres wolno
  **wydrukować**: biała lista schematów, odrzucenie loginu i hasła w adresie,
  zero DNS-u.
- **Zapis programu nie kasuje napisanej treści.** Do 0.41.0 warstwa zapisu
  budowała lekcję docelową jako `(string) ( $l['content'] ?? '' )`, więc BRAK
  klucza znaczył pustkę. Kreator wysyła sam spis treści (tytuły, kolejność,
  czasy) — pierwsze naciśnięcie „Zapisz kurs" wyczyściłoby prozę 73 lekcji
  i zameldowało sukces. Teraz brak klucza znaczy „nie ruszaj"; klucz podany,
  choćby pusty, dalej znaczy dokładnie to, co przyszło (import wysyła te
  kolumny zawsze, więc jego zachowanie jest bez zmian). Sprawdzone testem
  negatywnym: po zdjęciu tego rozróżnienia smoke zapala się na obu kursach.
- **Zajęty adres (slug) wskazuje POLE, nie awarię.** Bez tego baza odrzucała
  zapis kluczem `UNIQUE`, a panel mówił „zapis się nie powiódł" — czyli
  o czymś zupełnie innym niż to, co trzeba poprawić.
- **Brak klucza `sekcje`/`moduly` KASOWAŁ sekcje i program** (znalezione
  w przeglądzie kroku, potwierdzone uruchomieniowo: „po utworzeniu: sekcji=1
  moduly=1" → „po zapisie bez kluczy: sekcji=0 moduly=0"). Kontrakt i sam plik
  warstwy zapisu obiecywały co innego — „brak klucza znaczy nie ruszaj" — więc
  była to nieprawda w dokumentacji **o zachowaniu kasującym dane**. Panel
  zawsze wysyła oba klucze, więc z zewnątrz nie było tego widać; usterka
  czekała na pierwszego nowego klienta tej warstwy, czyli na synchronizację
  do Tutora w W5.
- **Zapis kursu ze starszej karty CICHO cofał publikację.** Formularz edytora
  niósł stan kursu w polu ukrytym, a publikację klika się na LIŚCIE — więc
  wystarczyło mieć edytor otwarty przed publikacją, żeby poprawka jednego
  zdania wyrzuciła kurs z katalogu z komunikatem „zapisano". Potwierdzone
  uruchomieniowo. Formularz nie niesie już stanu, a warstwa zapisu rozumie
  brak tego klucza jako „zostaw, jak jest".

### Zmienione

- **`Aai_Sklep_Trasy::widzi_szkice()`** pyta o `Aai_Sklep_Panel::UPRAWNIENIE`
  zamiast o wpisany na sztywno `manage_options` — jedno źródło odpowiedzi na
  pytanie „czy ta osoba zarządza sklepem".
- **Typ produktu `ebook` NIE wchodzi do panelu.** Prototyp ma go w enumie;
  właściciel zamknął ten temat 2026-08-25 słowem „na zawsze". Panel, który
  dawałby ebooka do wyboru, byłby zaproszeniem do złamania tej decyzji jednym
  kliknięciem. Oba kursy w bazie mają `kurs` — sprawdzone, nic nie staje się
  przez to nieedytowalne.
- **Pierwszy zapis kursu przez panel porządkuje kolejność kluczy w JSON-ie
  sekcji** (treść bez zmian co do znaku). Kolejne zapisy nie ruszają niczego —
  sprawdzone: drugi zapis oddaje „bez zmian" i zero wpisów w dzienniku audytu.

### Do zapamiętania

- **`add_submenu_page()` + `remove_submenu_page()` NIE robi ukrytej strony.**
  Wygląda na czystszą drogę i jest pułapką: `remove_submenu_page` wycina wpis
  z `$submenu`, a `get_admin_page_parent()` szuka rodzica właśnie tam — bez
  niego `admin.php` nie znajduje haka strony i oddaje **403 „Sorry, you are not
  allowed to access this page"**. Wygląda to jak błąd uprawnień, a jest błędem
  rejestracji. Ukrytą stronę robi `null` jako rodzic.
- **Sekcje i program jadą w POST jako JEDEN JSON**, a nie jako setki pól.
  `max_input_vars` (domyślnie 1000) ucina POST **w milczeniu**, a kurs z 41
  lekcjami wystawiłby setki pól — cicha utrata treści. Wysyłka całego kursu ma
  dziś **17 pól**. Pola ukryte z JSON-em startują wypełnione stanem z bazy, więc
  gdyby skrypt panelu nie wystartował, zapis jest pusty w skutkach zamiast
  czyścić kurs.
- **Treść lekcji NIE idzie przez `sanitize_text_field`** (skleiłoby Markdown
  w jedną linię), ale MUSI iść przez `wp_unslash` — WordPress dokłada do
  `$_POST` ukośniki, więc bez tego `C:\Users` z kursu o Gicie zapisałoby się
  jako `C:\\Users`. Sprawdzone testem negatywnym.
- **Test negatywny na warstwie zapisu KASUJE prawdziwe dane.** Mutacja „brak
  klucza `content` znaczy pustkę" wyczyściła prozę wszystkich 73 lekcji, bo
  smoke zapisuje też prawdziwe kursy (dowód, że panel ich nie rusza). Droga
  powrotna: `npm run wp:import` → `npm run wp:sprawdz` (73/73 co do znaku).
  Przed takim testem robić zrzut tabel.

### Stan dowodów

Strażnicy **32/32**, audyt mutacyjny **133** (0 przeoczonych, 0 martwych),
`smoke-wp-kreator` **95**, `smoke-wp-front` **78**, `smoke-wp-motyw` **32**,
`smoke-wp-dane` **30**, `wp:sprawdz` **73/73 co do znaku**, prototyp bez
regresji (`npm run check`).

Po napisaniu kroku wykonany został jego **przegląd** — pięć obszarów
(bezpieczeństwo wysyłek, bezpieczeństwo danych, zgodność z kontraktem
prototypu, zachowanie panelu, ucieczka znaków), każde znalezisko potwierdzone
uruchomieniowo na żywej instalacji, zanim powstała naprawa. Dwa znaleziska
realne (wyżej), trzy sprawdzenia bez zarzutu: zamiana pozycji modułów
przechodzi przez dwufazowe przestawianie MySQL-a, treść z `<script>`
i `onerror` jest uciekana i w panelu, i na stronie sprzedażowej, a odmowa
skasowania napisanej treści liczy także lekcje z usuwanych modułów.

## [0.41.0] — 2026-08-25

**Klient ogląda `/szkolenia` w naszym wyglądzie, a nie w Tutorowym.** Krok W3
etapu WordPress: katalog i strony sprzedażowe renderowane Z NASZYCH TABEL,
pozycja „Szkolenia" w menu motywu i jeden adres kanoniczny zamiast dwóch.

Przed tym wydaniem `/szkolenia` oddawało **404**, a `/szkolenia/<slug>` **301
na `/courses/<slug>/`** — czyli WordPress sam zgadywał slug i odsyłał na stronę
Tutora, której klient oglądać nie ma (potwierdzenie właściciela 2026-08-25).

### Dodane

- **Trasy `/szkolenia` i `/szkolenia/<slug>`** (`Aai_Sklep_Trasy`) — reguły
  przepisywania `top` + `template_include`. Reguła `top` odbiera WordPressowi
  zgadywanie adresu, które robiło tamto przekierowanie. Nieistniejący albo
  nieopublikowany kurs oddaje **prawdziwe 404** (kod, nie samą stronę) i naszą
  stronę „nie znaleziono" — motyw nie ma `404.php`, więc bez niej klient
  dostawał pusty `<main>`. Szkice widzi wyłącznie `manage_options`.
- **Warstwa odczytu** (`Aai_Sklep_Odczyt`) — port kanału JSON z prototypu.
  Liczniki (moduły, lekcje, minuty) liczy BAZA, nie szablon: dwa szablony
  liczące osobno prędzej czy później policzą co innego, a to była usterka
  z przeglądu B7 („41 41 lekcji" w miniaturze OG).
- **Kontrakt treści sekcji** (`Aai_Sklep_Sekcje`) — port `SCHEMATY_SEKCJI`
  z `modules/m1-sklep/typy.ts` razem z limitami co do liczby. Sekcja o złym
  kształcie **znika**, zamiast wysadzać stronę (odpowiednik `safeParse`).
  Tu też mieszka **jedno źródło prawdy o kolejności sekcji** — patrz niżej.
- **Katalog i strona sprzedażowa** — 12 rodzajów sekcji + hero, program,
  platforma, oferta i domknięcie; markup i zachowanie pól przepisane
  z `components/kurs/*` (wygląd przyjęty przy B5, wersja 0.12.1). Akordeony
  na natywnym `<details>` — program otwiera się także bez JavaScriptu, a
  wyszukiwarka widzi wszystkie tytuły lekcji.
- **`assets/sklep.css` i `assets/sklep.js`** — własny arkusz (tokeny motywu
  przez `var(--color-volt, #bfff38)`: wartość jego, awaria nasza) i ~200 linii
  skryptu bez zależności. Treść jest widoczna, gdy skryptu nie ma: chowamy ją
  dopiero pod `html.js`, a obserwator ma trzysekundowy strażnik ostatniej
  szansy.
- **Pozycja „Szkolenia" w nawigacji motywu** (`Aai_Sklep_Menu`) — `ob_start`
  na `get_header`. Wstrzyknięcie **klonuje ostatnią pozycję menu** i podmienia
  w niej adres, napis, numer porządkowy i opóźnienie kaskady; kotwiczy na
  `aria-label="Nawigacja główna"` / `"Nawigacja mobilna"`, czyli na TREŚCI.
  Motyw jest generowany — klasy Tailwinda zmienią się przy pierwszej
  regeneracji, a klon zawsze pasuje do tego, co motyw ma dzisiaj.
- **Tytuł, opis, kanonik, OpenGraph i JSON-LD** (`Aai_Sklep_Seo`) — motyw
  zdejmuje `rel_canonical` i ustawia tytuł tylko dla wpisów, a nasze strony
  wpisami nie są. `Offer.availability` zostaje **`PreOrder`**: zakup jest
  placeholderem do czasu Pluginu 2.
- **Przekierowania z Tutora** (decyzja właściciela 2026-08-25):
  `/courses/<slug>/` → **301** na `/szkolenia/<slug>/`, `/courses/` → `/szkolenia/`.
  Slug bierzemy z NASZYCH tabel po `_aai_zrodlo_uuid`, nie z `post_name`.
  Adresy lekcji zostają Tutora — nasze szablony wchodzą tam w W5.
- **`straznik-frontu-wp`** (31. strażnik, 9 mutacji) i **`smoke-wp-front`**
  (`npm run smoke:wp-front`, 78 sprawdzeń) — szczegóły niżej.

### Naprawione — znalezione POMIAREM, nie z pamięci

- **Okładki kursów oddawały 404.** `cover_url` wskazuje `/okladki/*.svg`,
  czyli adres z `public/` prototypu Next.js; na WordPressie nie ma tam nic
  i katalog rysował ikonę zepsutego obrazka z tekstem alternatywnym. Okładki
  jadą teraz Z WTYCZKĄ (`assets/okladki/`), a `Aai_Sklep_Widok::okladka()`
  szuka po kolei: pełny adres → plik w instalacji → plik przy wtyczce →
  `null`, czyli **zaprojektowany zastępnik zamiast zepsutego obrazka**.
- **Adresy bez ukośnika robiły z każdego kliknięcia przekierowanie.**
  Instalacja ma strukturę `/%postname%/`, więc `redirect_canonical` odsyłał
  `/szkolenia` → `/szkolenia/`. Teraz adresy składa `user_trailingslashit()`.
- **Pigułka kursu nachodziła na nagłówek motywu.** Obie belki są
  `position: fixed` u góry. Strona kursu chowa więc nawigację motywu i stawia
  w jej miejsce własną — tak samo jak prototyp (`NavbarPrzelacznik`), i taki
  wygląd właściciel przyjął przy B5.
- **`Aai_Sklep_Zasoby` nie rozpoznawał rejestracji, koszyka i kasy Tutora** —
  pytał tylko o panel kursanta. Te strony zostawały bez naszego arkusza, czyli
  z białym formularzem na ciemnym motywie.
- **Tutor 4.0.7 wprowadził DRUGĄ rodzinę tokenów** (`--tutor-surface-*`,
  `--tutor-text-*`, `--tutor-icon-*`, `--tutor-border-*`, `--tutor-button-*`,
  `--tutor-actions-*` — 305 zmiennych) i to ona steruje dziś logowaniem,
  rejestracją i panelem. Mapowanie z 0.40.0 tam nie sięgało: formularz miał
  białe pola i granatowy przycisk. `assets/tutor-motyw.css` mapuje teraz obie
  rodziny; przywrócony też font motywu (Tutor ustawia `Inter` na `body`, przez
  co ten sam napis w stopce zajmował dwie linie zamiast jednej — 45,5 px
  zamiast 22,75 px).

### Naprawione w samym POMIARZE — dwie dziury, które fałszowały wynik

- **`smoke-wp-motyw` czytał `color(srgb 0.749 1 0.219 / 0.1)` jak `rgb()`**,
  czyli składowe 0–1 traktował jak 0–255. Tak przeglądarka oddaje `color-mix()`,
  na którym stoi i motyw (Tailwind 4), i nasz arkusz — więc jasny akcent
  wychodził prawie czarny i kontrast 15:1 raportowany był jako **1,11:1**.
  Zapisu, którego pomiar nie umie rozebrać, nie zgadujemy: ląduje na liście
  `nieznane` i wywala smoke.
- **Tekst malowany gradientem** (`background-clip: text`, `color: transparent`)
  dostawał 1:1, bo wzór na kontrast dwóch płaskich kolorów nie ma jak go
  policzyć. Nie pomijamy go w milczeniu — bierzemy **najsłabszy przystanek
  gradientu**, czyli najgorszy przypadek, jaki ten napis może pokazać.

### Zmienione

- **`smoke-wp-motyw` mierzy teraz cztery strony zamiast dwóch**: nasze
  `/szkolenia/` i `/szkolenia/<slug>/` oraz — zamiast przekierowanych już
  `/courses/*` — panel kursanta i rejestrację, czyli strony Tutora, które
  NAPRAWDĘ zobaczy człowiek. Zakres pomiaru jest parametrem, a „belka u góry"
  to teraz nagłówek motywu **albo** nasza pigułka: pytanie „czy treść wjeżdża
  pod belkę" ma na stronie kursu inną belkę. 32 sprawdzenia.
- Porównanie stopki toleruje różnicę wysokości do 4 px (zaokrąglenia układu
  i moment wczytania fontu); tło, sposób układania i margines wewnętrzny
  porównujemy dalej co do znaku.
- **Kolejność sekcji strony sprzedażowej ma jedno źródło** —
  `Aai_Sklep_Sekcje::KOLEJNOSC`. Wcześniej szablon i warstwa SEO miały własne
  listy i **dało się je rozjechać**: test negatywny pokazał sekcję FAQ usuniętą
  ze strony, która nadal wystawiała `FAQPage` z pytaniami, których klient nie
  widzi. Teraz ten rozjazd jest niemożliwy, a nie pilnowany.
- Opis katalogu w danych `<meta>` nie mówi już o „ebookach" — właściciel
  zamknął ten temat na zawsze 2026-08-25 („E-BOOKI: NIGDY").

### Dowody

Strażnicy **31/31**, audyt mutacyjny **118 mutacji: 116 złapanych,
0 przeoczonych, 0 martwych**, `smoke-wp-front` **78 sprawdzeń**,
`smoke-wp-motyw` **32 sprawdzenia**, `smoke-wp-dane` **30**, `wp:sprawdz`
**73/73 treści zgodnych co do znaku** (dane nietknięte), prototyp bez regresji.

**Pięć testów negatywnych `smoke-wp-front`** (reguła po 0.24.0: każdy nowy test
sprawdzić testem negatywnym): zerwana kotwica menu, zdjęte przekierowanie
z `/courses/`, sekcja FAQ poza kolejnością, program bez lekcji, cena wycięta
z oferty. Dwa z nich zmusiły do wzmocnienia samego smoke'u — treść sprawdzamy
teraz w HTML-u **bez `<script>`** (inaczej dane strukturalne usprawiedliwiały
sekcję, której na stronie nie ma), a cenę **w sekcji oferty**, nie gdziekolwiek
na stronie.

**Audyt mutacyjny złapał dwie dziury w moim własnym strażniku**: blok
`prefers-reduced-motion` czytany „do końca pliku" usprawiedliwiał regułę
dopisaną po nim, a pierwsza wersja reguły o `position: fixed` znajdowała
`<main>` w komentarzu i oskarżała poprawny szablon. Obie naprawione,
kontrprzykład na tę drugą jest w audycie.

### Pułapka środowiska do zapamiętania

**`opcache.revalidate_freq = 2`** w kontenerze WordPressa: PHP sprawdza czas
modyfikacji pliku najwyżej raz na dwie sekundy. Testy negatywne puszczone
jeden po drugim mierzyły więc POPRZEDNI stan kodu — wynik wyglądał jak
„strażnik przepuścił mutację", a naprawdę serwer oddawał starą wersję. Między
zmianą pliku a pomiarem trzeba odczekać ≥ 3 s. To ta sama klasa co działający
`npm run dev` psujący produkcyjny build (0.34.0).

## [0.40.0] — 2026-08-25

**Strony Tutora wyglądają jak strona Automatic AI, a nie jak cudzy serwis.**
Zgłoszone zrzutem właściciela („nadal to samo z renderem, szukaj głębiej") —
poprzednia poprawka zdjęła z ekranu JSON, ale nie tknęła tego, co naprawdę
łamało wygląd.

### Znalezione — przyczyna leżała w KASKADZIE, nie w kolejności arkuszy

**Motyw to Tailwind 4 i trzyma CAŁY swój CSS w warstwach kaskady**
(`@layer properties, theme, base, components, utilities`). Arkusze Tutora są
POZA warstwami, a reguła bez warstwy **bije każdą regułę w warstwie —
niezależnie od specyficzności i od kolejności ładowania**. Na stronie, gdzie
CSS Tutora jest obecny, każda jego reguła wygrywa z każdą klasą motywu, choć
motyw ładuje się ostatni.

To jest prawdziwy powód kolizji `.text-label` z 0.38.0. Tamta naprawa
(zdjęcie CSS-u Tutora ze stron motywu) działa tylko tam, gdzie wolno go
zdjąć — **na własnych stronach Tutora kolizja żyła dalej** i malowała na
jasno nagłówek oraz stopkę motywu. Nic przy tym nie padało.

Do tego motyw ma nagłówek `position: fixed` (72 px) i **nie rezerwuje pod
niego miejsca**: jego własne strony robią to same (`pt-28`, `md:pt-36`),
a szablon Tutora daje `tutor-mt-16`, czyli 16 px. Stąd tytuł kursu pod
nawigacją.

### Dodane

- **`assets/tutor-motyw.css` + `Aai_Sklep_Styl_Tutora`** — warstwa
  integracji wchodząca WYŁĄCZNIE na strony Tutora (klasa `body`
  `aai-tutor-na-motywie`): odstęp pod nagłówek, 16 zmiennych `--tutor-*`
  przemapowanych na tokeny motywu, powierzchnie wpisane u Tutora hexem na
  sztywno, pola formularzy i akcent volt zamiast niebieskiego.
  Kolizję klas naprawia **`revert-layer`** — reguła bez warstwy cofa
  właściwość do wartości z warstwy motywu, więc nie zgadujemy jego wartości
  (są różne dla różnych elementów), tylko oddajemy mu głos.
  **To NIE jest łatka na jedną stronę:** `/dashboard/` i archiwum
  `/courses/` mają ten sam problem, a te strony zostają Tutora wg podziału
  z ETAP-WP.md.
- **`smoke-wp-motyw` (`npm run smoke:wp-motyw`)** — mierzy ŻYWĄ stronę
  w prawdziwej przeglądarce: nachodzenie na nagłówek, kontrast KAŻDEGO
  napisu (próg 4.5:1), jasne plamy w markupie Tutora (z pominięciem akcentu,
  liczone po złożeniu koloru z tłem — półprzezroczysty volt nie jest jasną
  plamą) oraz **stopkę motywu porównaną 1:1 ze stroną motywu**, co łapie
  kolizje klas, o których dziś nie wiemy. 14 sprawdzeń.
- Ósmy fakt o motywie w [ETAP-WP.md](docs/ETAP-WP.md) — warstwy kaskady
  i brak rezerwacji miejsca pod nagłówek. **Dotyczy też naszych stron
  w W3**: szablon spoza motywu musi dodać odstęp sam.

### Zmienione

- Komentarz `Aai_Sklep_Zasoby` mówił, że dequeue „zamyka całą klasę
  problemu". Zamyka ją tam, gdzie wolno zdjąć cudzy arkusz — teraz jest to
  napisane wprost, razem z drugą stroną medalu.
- Wtyczka w wersji 0.3.0.

### Dowody

Pomiar w przeglądarce (puppeteer-core + systemowy Firefox, rig
w scratchpadzie — nigdy w `package.json`): tytuł kursu **83 px pod
nagłówkiem** zamiast pod nim, kontrast tytułu **18,27:1**, **zero** napisów
poniżej 4,5:1 na obu stronach Tutora, **zero** jasnych plam poza akcentem,
stopka motywu **identyczna co do piksela** z tą samą stopką na stronie
motywu. Testy negatywne: mutacja zdejmująca odstęp → 3 elementy pod
nagłówkiem; mutacja zdejmująca `revert-layer` → 9 z 40 elementów stopki
rozjechanych; mutacja przywracająca białą kartę → jasna plama 87 079 px²
i dwa napisy poniżej progu.

## [0.39.1] — 2026-08-25

### Naprawione

- **Strona kursu w Tutorze wyświetlała człowiekowi surowy JSON** („What Will
  You Learn?", „Material Includes" — zgłoszone zrzutem właściciela). Tutor
  drukuje swoje cztery pola WPROST, dzieląc wartość po znakach nowej linii,
  a import wkładał tam nasze struktury zakodowane JSON-em. Nic się przy tym
  nie zapalało: dana wchodziła poprawnie, tylko nie nadawała się do czytania.
  `wordpress/import-kursy.php` spłaszcza teraz te cztery sekcje do linii
  (`Tytuł — opis`), a **wszystkie dwanaście** jedzie obok do `_aai_sekcje`
  ze strukturą, więc kopia w WordPressie jest kompletna niezależnie od tego,
  kto które pole czyta.
- Spłaszczenie ma **asercję**: sekcja, której kształt przestał pasować,
  zatrzymuje import zamiast wydrukować JSON na stronie kursu. Sprawdzone
  testem negatywnym (mutacja opróżniająca `punkty` → `Error: sekcja benefits
  nie dała się spłaszczyć…`, zero zapisów).
- `nie_dla` z sekcji „dla kogo" świadomie NIE wchodzi do
  `_tutor_course_target_audience`: pole Tutora znaczy „dla kogo JEST ten
  kurs", więc lista „to NIE jest dla Ciebie, jeśli…" zmieniłaby wymowę na
  przeciwną.

**To dotyczy wyłącznie KOPII dla Tutora.** Nasze tabele są nietknięte
(`npm run wp:sprawdz` → 73/73 co do znaku), a klient docelowo nie ogląda
szablonów Tutora: katalog i strony sprzedażowe robi W3, widok lekcji — W5.

## [0.39.0] — 2026-08-25

**Oba kursy są w tabelach wtyczki WordPressa — 73 lekcje zgodne co do znaku,
idempotencja potwierdzona dwa razy z rzędu.** Krok W2 z planu wtyczki
(W1 fundament → **W2 dane** → W3 front → W4 kreator → W5 Tutor → W6 test
ręczny właściciela).

### Dodane

- **Warstwa zapisu wtyczki** (`class-aai-sklep-zapis.php`) — jedyne miejsce,
  które pisze do naszych tabel. Port `modules/m1-sklep/dyspozytor.ts` z tymi
  samymi decyzjami: transakcja na kurs, upsert po uuid (identyfikatory
  z Postgresa jadą 1:1, więc klucz idempotencji jest kluczem głównym),
  kasowanie od dołu, **odmowa skasowania lekcji z napisaną treścią** bez
  jawnej zgody (decyzja D przeglądu B7) i **dziennik audytu tylko przy
  realnej zmianie** (decyzja E). Wiersz bez zmian nie dostaje nawet
  `UPDATE`-a — dlatego liczba wierszy dziennika jest ostrym testem
  idempotencji, a nie ozdobą.
- **Import i komendy WP-CLI**: `wp aai-sklep import <plik>`,
  `wp aai-sklep sprawdz [--format=json]`, `wp aai-sklep usun <slug|id>`
  (`class-aai-sklep-import.php`, `class-aai-sklep-raport.php`,
  `class-aai-sklep-cli.php`). Wtyczka w wersji 0.2.0.
- **`npm run wp:import`** — jedna komenda dla człowieka i dla skryptu:
  eksport z Postgresa → kopia do kontenera → import. Rozjazd tych dwóch
  dróg kosztował nas już wydanie (0.24.0, BLAD-012). Obok
  `npm run wp:eksport`, `npm run wp:sprawdz` i `npm run smoke:wp`.
- **`tools/sprawdz-import-wp.mjs`** — dowód porównujący **dwie bazy**, nie
  import z własnym meldunkiem: treść każdej lekcji przez `sha256`, liczby
  znaków w trzech niezależnych rachunkach (punkty kodowe w JS, `mb_strlen`
  w PHP, `CHAR_LENGTH` w SQL), struktury sekcji i materiałów porównywane
  głęboko (`[]` i `{}` to nie to samo).
- **`tools/smoke/smoke-wp-dane.mjs`** — 30 sprawdzeń na własnym kursie
  testowym: przestawianie kolejności modułów i lekcji, przeniesienie lekcji
  między modułami na zajętą pozycję, odmowa i zgoda przy kasowaniu treści,
  kasowanie sekcji i kursu, powrót liczników tabel do stanu sprzed
  przebiegu. Poza `npm run smoke` i poza CI — wymaga podmana.
- **Ósmy niezmiennik `straznik-wtyczki-wp`**: do naszych tabel pisze
  wyłącznie warstwa zapisu. To ten strażnik, który od 0.38.0 był zapowiadany
  w komentarzu schematu jako zamiennik utraconej gwarancji triggerów —
  w Postgresie dziennik pisała baza, tutaj pisze go PHP, więc gwarancję musi
  dać architektura. Audyt mutacyjny: 107 → **109 mutacji**.

### Zmienione

- **`tools/eksport-wp.mjs` oddaje wierny zrzut naszych tabel (format 2)**
  i przestaje wiedzieć cokolwiek o Tutorze: nazwa każdego pola jest nazwą
  kolumny, tej samej w Postgresie i w MySQL. Słowniki Tutora (statusy,
  poziomy, cztery sekcje, które Tutor ma u siebie) przeniosły się do
  `wordpress/import-kursy.php` — do kodu, który ich używa, i tam, gdzie
  W5 i tak będzie ich potrzebował w PHP. Ścieżka do Tutora została na tym
  formacie **ponownie udowodniona**, już na środowisku odtwarzalnym
  (`:8892`): 87 utworzonych → 0/0/87 → 0/0/87.
- **`straznik-wtyczki-wp`, niezmiennik 6 celuje w ZACHOWANIE, nie w nazwę.**
  Poprzednia wersja flagowała każdą zmienną w łańcuchu SQL, więc oskarżała
  też `"SELECT * FROM `$t_kursy`"` — a nazwy tabeli nie da się podać przez
  `prepare()` (to identyfikator, nie wartość). Teraz wolno wkleić wyłącznie
  zmienną wziętą z klasy tabel; każda inna to wartość i musi iść przez
  `prepare()`. Ta sama lekcja co przy `straznik-limitera` w 0.28.0.
- `eksport-wp/` wchodzi do `.gitignore` — to artefakt odtwarzalny jedną
  komendą, a nieśledzony katalog brudził drzewo wymagane przez
  `deploy:podglad`.

### Naprawione

- **`postaw.sh` pyta KONTENER, czy widzi wtyczkę.** Bind mount trzyma inode
  katalogu, więc gdy katalog zostanie na dysku odtworzony po starcie
  kontenera, w kontenerze zostaje pustka: pliki są, `podman inspect` pokazuje
  właściwą ścieżkę, a WordPress przestaje znać wtyczkę. Objaw wyglądał na
  błąd wtyczki, nie montażu; skrypt mówi teraz wprost, co naprawić.

### Zapamiętane (pełnia: [MIGRACJA-DO-WP.md](docs/plugin-1/MIGRACJA-DO-WP.md))

- **Pułapka `wp_slash` NIE dotyczy `$wpdb`.** `update_post_meta()` puszcza
  wartość przez `wp_unslash()` i zjada backslashe; `$wpdb->insert()`/`update()`
  tego nie robią. Warstwa zapisu przeszła idempotencję bez poprawek, a 38
  backslashy w 9 lekcjach dojechało bez zmiany.
- **Sprawdzenie, które mówi „zero", bywa ślepe po OBU stronach.** Pierwsze
  liczenie backslashy dało „0 i 0 — zgodne", bo oba wyrażenia szukały DWÓCH
  backslashy zamiast jednego. Zgodność zer nie jest dowodem.
- **MySQL nie umie odroczyć `UNIQUE`** (Postgres miał `DEFERRABLE`), więc
  zamiana kolejności dwóch modułów łamie ograniczenie w stanie pośrednim.
  Warstwa zapisu przestawia pozycje dwufazowo — najpierw poniżej zera, potem
  docelowo. Mutacja usuwająca ten krok wywala smoke natychmiast.

## [0.38.0] — 2026-08-25

**Etap WordPress wystartował: środowisko odtwarzalne jedną komendą, szkielet
wtyczki `aai-sklep` z tabelami w bazie WP i higiena zasobów, która przestaje
łamać stronę Automatic AI.** Krok W1 z planu wtyczki (W1 fundament → W2 dane →
W3 front → W4 kreator → W5 Tutor → W6 test ręczny właściciela).

### Dodane

- **Decyzje właściciela otwierające etap** (PR #64, sekcja „Decyzje właściciela
  (2026-08-25)" w [ETAP-WP.md](docs/ETAP-WP.md)): trzy wtyczki do motywu
  Automatic AI; hybryda z Tutor LMS + WooCommerce zostaje; własne tabele
  z prefiksem w bazie WP (nie osobne bazy); kod w tym repo; kolejność 1→2→3
  z testem ręcznym po każdej wtyczce; źródło prawdy o kursie w naszych
  tabelach (do Tutora kopia); nasze szablony lekcji; menu przez podmianę
  nagłówka ze strażnikiem; **e-booków nie będzie nigdy**; mail po zakupie
  z linkiem „Ustaw hasło", nie z hasłem.
- **Środowisko `wordpress/srodowisko/`** (compose + `postaw.sh`): WP + MariaDB
  + motyw Automatic AI + treść strony 1:1 + WooCommerce + Tutor LMS + nasze
  wtyczki montowane wprost z repo, na `127.0.0.1:8892`. Skrypt jest
  idempotentny i kończy WERYFIKACJĄ ARTEFAKTU (nawigacje motywu, aktywność
  wtyczki, istnienie tabel, higiena zasobów w obie strony). Motyw mieszka
  poza repo (`~/.cache/automatic-ai-warsztat`), bo strażnicy skanują dysk,
  nie git — pobrany do drzewa repo wywołał fałszywy alarm `straznik-seo`.
- **Wtyczka `aai-sklep` 0.1.0**: szkielet z autoloaderem bez Composera,
  pięć tabel `wp_aai_sklep_*` przez `dbDelta` (port `db1_kursy` z decyzjami
  przeglądu B7 wykonanymi w schemacie: `UNIQUE (course_id, kind)` bez
  `position`, treść lekcji jako `mediumtext` — `text` uciąłby dłuższą lekcję
  w milczeniu), `uninstall.php` domyślnie NIE kasujący danych. Audyt zmian
  pisze PHP, nie triggery — świadome odstępstwo od Działu 2 (uprawnienie
  TRIGGER bywa na hostingu odebrane), nazwane wprost i pilnowane strażnikiem.
- **`straznik-wtyczki-wp`** (30. strażnik) + 4 mutacje w audycie: blokada
  bezpośredniego wywołania plików PHP, jedno źródło nazw tabel, zapytania
  przez `prepare()`, komplet nagłówków, uninstall bez kasowania treści.

### Naprawione

- **Strona Automatic AI łamana przez CSS Tutora** (zrzuty właściciela):
  `tutor-front.min.css` definiuje globalne `.text-label` z jasnym tłem,
  a motyw używa tej samej nazwy na 30+ elementach — plakietki i marquee
  stopki jechały. Skan 249 klas motywu przeciw arkuszom wtyczek: jedna
  kolizja groźna, cztery nieszkodliwe; konwersja motywu ZDROWA (to samo
  było na starym :8091). Naprawa: `Aai_Sklep_Zasoby` — zasoby Tutora/Woo
  nie wchodzą na strony, które ich nie używają; gwarancją filtry
  `*_loader_src` (samo zdejmowanie z kolejki przepuszczało `wc-blocks-style`
  i `sourcebuster-js` — zmierzone). Dowody: 15/15 stron motywu czystych,
  koszyk trzyma 34 zasoby Woo, dashboard 4 zasoby Tutora, overflow 0 px,
  zrzuty przeglądarką. `postaw.sh` pilnuje odtąd OBU stron medalu.

## [0.37.0] — 2026-08-25

**Sześć decyzji właściciela po przeglądzie B7 — wykonane co do jednej.**
Przegląd z 0.36.0 zostawił sześć pozycji, których agent nie ruszał z własnej
inicjatywy, bo każda zmieniała zachowanie produktu albo kształt tabel przy
porcie na WordPressa. Właściciel rozstrzygnął komplet 2026-08-25. Decyzje
i uzasadnienia odrzuconych wariantów:
[docs/plugin-1/PRZEGLAD-B7.md](docs/plugin-1/PRZEGLAD-B7.md).

### Zmienione — schemat bazy

- **Jedna sekcja danego rodzaju na kurs** (migracja 008). `UNIQUE (course_id,
  kind, position)` dopuszczał dwie sekcje tego samego rodzaju, a strona czyta
  je przez `find(s => s.kind === kind)` — czyli o drugiej nigdy by się nie
  dowiedziała, a kreator skasowałby ją przy następnym zapisie bez słowa.
  W bazie wszystkie 24 sekcje miały `position = 0` (pomiar), więc kolumna była
  martwa od początku i jej jedynym skutkiem była ta pułapka. Zostaje
  `UNIQUE (course_id, kind)`, `position` znika ze schematu, z kontraktów,
  z panelu i z eksportu do WP. **Rozstrzygnięte świadomie PRZED pisaniem
  schematu MySQL**, żeby port nie odziedziczył konstrukcji, której sam
  prototyp nie używał. Powtórzony rodzaj odrzuca teraz kontrakt ze wskazaniem
  drugiej sekcji — do bazy nie dociera nawet konflikt unikalności, więc pomyłka
  w sekcjach nie wraca jako komunikat o „duplikacie sluga".
- **Audyt zapisuje tylko realne zmiany** (migracja 007). `course_changelog`
  miał 3068 wierszy / 4152 kB przy 908 kB rzeczywistej treści, bo zapis programu
  dotyka `UPDATE`-em KAŻDEJ lekcji — także nietkniętej — a trigger odkłada dwie
  kopie jej treści. `UPDATE`, po którym wiersz jest identyczny (z pominięciem
  `updated_at`, które i tak ustawia trigger), nie tworzy wpisu. Niezmienność
  dziennika, komplet triggerów i pełny stan przed/po zostają bez zmian.
  Odrzucony wariant „audyt bez kolumny `content`" chudłby mocniej, ale dziennik
  przestałby być śladem po UTRACIE treści — a to on był jedynym śladem przy
  najpoważniejszym znalezisku przeglądu.

### Dodane — trzy ochrony, których brak nie objawiał się błędem

- **Zapis kursu nie skasuje napisanej treści bez jawnej zgody.** Pełna podmiana
  programu jest cechą, ale jedynym, co chroniło 908 kB prozy, była pamięć panelu
  o odsyłaniu `id`: jedno żądanie `{"akcja":"zapisz","kurs":{"id":…,"modules":[]}}`
  czyściło kurs razem z materiałem i wracało z `ok: true`. Dyspozytor pyta teraz
  bazę, ile lekcji Z TREŚCIĄ wypadłoby z kursu, i bez `pozwol_skasowac_tresc`
  odmawia — zanim cokolwiek skasuje. Odpowiedź niesie liczbę, więc panel pyta raz
  i wprost, a świadome usunięcie lekcji z programu dalej jest możliwe. Usuwanie
  całego kursu bramki nie ma: tam intencja jest wyrażona wprost.
- **Brama nie przyjmuje tokenu z `.env.example`.** Dosłowna wartość z przykładu
  przechodziła, więc po `cp .env.example .env` hasłem do zapisu, publikacji
  i usuwania kursów zostawał łańcuch leżący w repozytorium. Odmowa dotyczy
  KONFIGURACJI, nie podanego tokenu: dopóki `KREATOR_TOKEN` jest pusty,
  przykładowy albo krótszy niż 24 znaki, nie wchodzi nikt — inaczej cisza
  wyglądałaby jak działający panel. Reguła w obu kanałach; tokeny w smoke'ach
  i CI wydłużone.
- **Prefetch przeglądarki dostaje CSP.** Matcher przepisany 1:1 z przewodnika
  Next pomijał żądania z nagłówkiem `purpose: prefetch` — a ten wysyła
  PRZEGLĄDARKA przy `<link rel="prefetch">` i regułach spekulacyjnych i dostaje
  wtedy pełny dokument HTML. Zmierzone na żywym serwerze przed naprawą:
  `/szkolenia` z tym nagłówkiem oddawało dokument z polityką `frame-ancestors
  'none'`, bez `script-src` i bez nonce'a. Pomijamy teraz wyłącznie prefetch
  ROUTERA (`next-router-prefetch`, który `next/link` wysyła razem z tamtym), więc
  zalecenie Nexta zostaje spełnione, a dokument dostaje pełną politykę.

### Naprawione

- **Limiter nie zdejmuje własnej blokady.** Sprzątanie dostawało okno BIEŻĄCEGO
  żądania i mierzyło nim wszystkie klucze, więc ruch wystrzałowy (okno 60 s)
  kasował blokady uwierzytelnień (okno 10 min) dziewięć minut przed terminem,
  który limiter sam podał w `Retry-After`. Druga połowa tej samej usterki:
  eksmisja przy przepełnieniu szła po kolejności WSTAWIENIA, więc świeżo nałożona
  blokada wypadała przed martwym kluczem sprzed godziny. Teraz każdy klucz jest
  mierzony własnym oknem, wypadają najdawniej aktywne, a klucz trzymający czynną
  blokadę — dopiero po wszystkich pozostałych.
- **`pre-commit`: obecność `.env.example` nie wyłącza już blokady `.env`.**
  Warunek pytał o skład commita zamiast o plik, więc dopisanie przykładu do tego
  samego commita otwierało drogę prawdziwemu `.env`. Doszły wzorce na NASZE
  sekrety (`KREATOR_TOKEN=`, hasło w `postgres://`), świadomie pomijające `docs/`
  i `.env.example` — hak, który krzyczy na cytat z manuala, kończy jako
  `--no-verify`. Sprawdzone sześcioma scenariuszami w osobnym repozytorium.

### Dokumentacja

- **[docs/PLAN.md](docs/PLAN.md) §2.4: sześć pozycji definicji ukończenia
  Pluginu 1 odhaczonych** (były zrobione, nigdy nie zaznaczone), z doprecyzowaniem
  przy audycie — „operacja" znaczy zmianę danych.
- **[KROK-3-KURSY.md](docs/plugin-1/KROK-3-KURSY.md): etapy 3 i 4 domknięte**
  (proza kompletna od 0.32.0, B7 zaliczona 2026-08-25).
- **Sufit 2 MB na ciało żądania zamknięty POMIAREM** — otwarta pozycja z kroku 2.
  Najdłuższa lekcja waży 21 790 znaków / 22 951 bajtów UTF-8 (mediana 11 848),
  a treść jedzie osobną akcją, więc 1307 kB całej prozy nigdy nie leci naraz.
  Sufit stoi ~90× nad największym realnym żądaniem — bez zmian.
- **Wymagania przeniesione do wtyczki** spisane w
  [MIGRACJA-DO-WP.md](docs/plugin-1/MIGRACJA-DO-WP.md): nośnik limitera, brak
  `position` przy sekcjach, pięć pozycji UX panelu (w tym **przenoszenie lekcji
  między modułami**, którego builder Tutora wymaga, a nasz dyspozytor nie umie).

### Domknięcie modułu

**Plugin 1 scalony na `main`** (PR #62), **gałąź domyślna wróciła na `main`**,
tag `v0.37.0` + release. `main` stał celowo 326 commitów w tyle, na 0.3.4 —
wg [PLAN.md §5](docs/PLAN.md) moduł wchodzi na gałąź główną dopiero po
ukończeniu i akceptacji całości. Trzy konflikty merge'a (README, WYTYCZNE,
`straznik-licencji`) rozwiązane wersją gałęzi modułu; drzewo scalenia
sprawdzone jako identyczne z `plugin-1-sklep-kursow`. Zmergowany też
**PR #59** (Dependabot: `lucide-react` 1.31 → 1.33, `@types/pg` 8.21 → 8.23.1)
— po pełnym `npm run check` lokalnie, bo CI stoi.

### Stan dowodów (CI stoi do 1 września — odtworzone lokalnie)

Strażnicy **29/29** (doszły 3 niezmienniki: własne okno klucza, siła tokenu
w obu kanałach, bramka nad kasowaniem treści), audyt mutacyjny **103 mutacje —
101 złapanych, 0 przeoczonych, 0 martwych** (2 pominięte warunkowo), testy
**83/83** (+6 regresji, każda sprawdzona mutacją), smoke'i **7/7**.
Audyt złapał po drodze DZIURĘ w moim własnym niezmienniku (wzorzec trafiał
w `limit.oknoMs` z innego miejsca pliku) i dwie MARTWE mutacje, które umarły
od zmiany liczby w README i od przepisania bramy tokenu.

## [0.36.0] — 2026-08-25

**Przegląd agent + krytyk przed bramką B7 i udowodniona droga danych do
WordPressa.** Właściciel zaliczył B7 (2026-08-25), ale polecił wykonać przegląd
mimo to — DIAGRAM.md wymaga go przy tej jednej bramce, a nigdy się nie odbył.
Decyzją tej samej rozmowy skrypt migracji Postgres → MySQL powstaje jeszcze
w Pluginie 1, po wcześniejszym poznaniu docelowego schematu.

### Naprawione — pięć znalezisk przeglądu, każde potwierdzone niezależnie

- **CICHA UTRATA TREŚCI: ten sam `id` modułu dwa razy w jednym zapisie.**
  Drugi przebieg pętli dyspozytora kasował lekcje zachowane przez pierwszy,
  transakcja się commitowała, a odpowiedź brzmiała `ok: true`. Sprawdzone
  uruchomieniowo na bazie testowej — lekcja z treścią znikała bez śladu.
  Kontrakt `KursWejscie` odrzuca teraz powtórzone identyfikatory modułów
  i lekcji; dwa testy regresji. To zabezpieczenie jest **potrzebne także we
  wtyczce WP**, bo builder Tutora wysyła całą strukturę kursu przy każdym zapisie.
- **Katalog obiecywał produkt, którego nie ma** — „Lekcje wideo krok po kroku"
  i „pliki źródłowe do pobrania" przy kursie TEKSTOWYM, w którym 0 z 73 lekcji
  ma jakikolwiek materiał. Ta sama klasa co BLAD-015, ale `straznik-obietnic`
  czytał wyłącznie seed, więc tekst zaszyty w kodzie widoku był poza jego
  zasięgiem. Strażnik obejmuje teraz 56 widoków z `app/` i `components/`.
- **Miniatura OpenGraph pokazywała „41 41 lekcji"** — `lekcje()` zwraca liczbę
  razem ze słowem, a szablon dokładał ją drugi raz. Obrazek idzie w świat przy
  każdym udostępnieniu linku; `smoke-seo` czyta JSON-LD, nie treść PNG.
- **Pula połączeń bez nasłuchiwacza `error`** — restart bazy albo reaper
  połączeń hostingu ubijał CAŁY proces Nexta, nie jedno żądanie.
- **Hak `pre-push` chronił `main`**, a praca od 0.18.0 idzie na gałąź domyślną
  `plugin-1-sklep-kursow`; bezpośredni push na nią przechodził bez słowa,
  omijając Weryfikację-PR bez śladu.

### Dodane — migracja danych do WordPressa (krok 4.2 planu)

- **`tools/eksport-wp.mjs`** — czyta bazę wyłącznie przez publiczne API modułu
  (więc kontrakty Zod walidują to, co wyjeżdża) i wykłada JSON.
- **`wordpress/import-kursy.php`** — idempotentny import przez WP-CLI, kluczem
  jest `_aai_zrodlo_uuid`, nie slug: slug kursu wolno zmienić w kreatorze,
  a moduły i lekcje slugów nie mają w ogóle.
- **[docs/plugin-1/MIGRACJA-DO-WP.md](docs/plugin-1/MIGRACJA-DO-WP.md)** —
  mapowanie pole po polu, wyprowadzone z ŻYWEJ instalacji (WP 7.0.1 + Tutor LMS
  4.0.6 + WooCommerce 11.0.1), z kluczami meta odczytanymi z KODU wtyczki.

**Dowód na czystej instalacji:** import 1 → 87 utworzonych (2 kursy, 12 modułów,
73 lekcje); importy 2 i 3 → 0/0/**87 bez zmian**; treść **73 z 73 zgodne CO DO
ZNAKU**. Struktura kurs → moduł → lekcja mapuje się 1:1; Tutor pokrywa cztery
z naszych dwunastu rodzajów sekcji, pozostałe osiem zostaje w naszej wtyczce —
to mierzalne uzasadnienie podziału odpowiedzialności z ETAP-WP.md.

### Dwie pułapki warte zapamiętania

- **WordPress zjada backslashe w meta** (`update_post_meta` puszcza wartość przez
  `wp_unslash`). Bez `wp_slash` ginie każdy `\` — czyli ścieżki `C:\Users`
  i sekwencje `\n` w kursie o Gicie. **Wykryte wyłącznie testem idempotencji:**
  pierwszy import wyglądał na w pełni udany.
- **`LENGTH()` w MySQL liczy bajty, a `.length` w JS jednostki UTF-16.** Pierwsze
  porównanie sum pokazało 977 625 wobec 929 838 i wyglądało jak utrata danych; po
  `CHAR_LENGTH()` została różnica 7 znaków — siedem emoji spoza BMP. **Sumy
  porównuj ostrożnie, treść porównuj znak w znak.**

### Zostawione do decyzji właściciela

Sześć pozycji z przeglądu, żadna nie ruszona z własnej inicjatywy — wszystkie
z uzasadnieniem w **[docs/plugin-1/PRZEGLAD-B7.md](docs/plugin-1/PRZEGLAD-B7.md)**:
sprzątanie limitera zdejmujące aktywną blokadę uwierzytelnień, brak kontroli siły
`KREATOR_TOKEN`, `UNIQUE` sekcji niepasujący do sposobu ich czytania (**do
rozstrzygnięcia PRZED schematem MySQL**), brak drugiej warstwy przy pełnej
podmianie programu, retencja dziennika audytu (4152 kB przy 908 kB treści)
i siedem drobiazgów UX kreatora.

### Co przegląd potwierdził jako zdrowe

Parametryzacja SQL pełna, granica modułu trzyma, kolejność „dostęp przed
kształtem" działa, treść lekcji nie ma jak wyciec, nonce CSP naprawdę
jednorazowy, licznika chybionych prób nie da się wyzerować śmieciowym żądaniem,
kontrakty zgodne ze schematem SQL, panel pokrywa kontrakt w 100%.

## [0.35.0] — 2026-08-24

**Higiena repozytorium — pełny audyt od A do Z.** Polecenie właściciela:
sprawdzić, czy repo odpowiada rzeczywistemu stanowi projektu, z repo strony
głównej (`automatic-ai`) jako przykładem dobrych praktyk, ale bez kopiowania
bezrefleksyjnego. Baseline przed pracą: strażnicy 28/28, testy 75/75, audyt
mutacyjny 90/90, `npm audit` 0 podatności, skan wzorców sekretów po historii
czysty. Nie znalazłem ani jednej pozycji CRITICAL — problemem nie był
bałagan, tylko **starzenie się liczb w dokumentacji** i odłożone sprzątanie
gałęzi.

### Naprawione — dokumenty, które kłamały o stanie

- **README podawało trzy nieprawdy naraz**: „62 testy" przy stanie 75,
  audyt mutacyjny „na 71 sposobów" przy stanie 90 i kotwicę
  `#szybki-start-po-sklonowaniu`, której nagłówek dawno nie ma. Ta ostatnia
  przeżyła, bo `straznik-readme` sprawdzał kotwice **wyłącznie w spisie
  treści** — link w prozie był poza jego zasięgiem.
- **`tresc-kursow/POSTEP.md`** wskazywał „← NASTĘPNY KROK: domknięcie
  działu [D7]" i „golden treści — jeszcze nierobiony", choć PR #22, tag
  `v0.21.0` i `goldeny/d7-tresc.json` istnieją od 2026-08-18. Plik jest
  wskazywany z CLAUDE.md jako licznik stanu, więc mylił każdą nową sesję.
- **`docs/plugin-1/PR-D6.md` i `PR-D7.md`** instruowały „po powrocie
  GitHuba uruchom `gh pr create`" — oba PR-y (#18, #22) zmergowane.
  Kroniki zostały nietknięte, doszły adnotacje historyczne.
- **Opis repozytorium na GitHubie** był sprzed rebrandingu (v0.17.0):
  „dla matthewplugins.pl — sklep z kursami/ebookami".
- **`CONTRIBUTING.md` przeczył praktyce**: wymagał prefiksów
  `feat:`/`fix:`, a repo od 0.22.0 pisze tematy opisujące SKUTEK. Dokument
  opisuje teraz stan faktyczny; prefiksy zostają dozwolone dla drobnicy.
- 5 ostrzeżeń ESLint (nieużywane importy i parametry w `tools/`).

### Dodane — kontrole i konfiguracja

- **`straznik-podgladu-kursow`** (29. strażnik) — sprawdza WYGENEROWANY
  widok treści kursu, czyli to, co klient dostaje po zakupie: martwe
  odsyłacze, `width`/`height` na każdym z 148 obrazów, podwójną ucieczkę
  w podpisach, klikalność spis → lekcja → spis, komplet stron i zrzutów
  wobec `tresc-kursow/`. Powstał, bo kontrole tej klasy z redesignu 0.34.0
  żyły w katalogu roboczym sesji i przepadły — trzy usterki, które wtedy
  znalazły (strona wejściowa bez fontu, 7 niewidocznych zrzutów, 29 podpisów
  z `&quot;`), dawały HTML poprawny SKŁADNIOWO, więc żadna istniejąca
  bramka ich nie widziała. Wymaga wygenerowanego podglądu; bez niego mówi
  wprost, że pominął, zamiast kłamać zielenią.
- **`npm run check`** — jedna bramka: strażnicy → lint → tsc → testy →
  build → siedem smoke'ów, w kolejności z CI. Plus `npm run smoke` osobno.
  Praktyka z repo strony głównej; u nas ta sekwencja istniała dotąd tylko
  w CI i w prozie README.
- **`.gitattributes`** — końce linii przestają zależeć od `core.autocrlf`
  każdego klonu; skrypty i haki zawsze LF (CRLF w shebangu = „bad
  interpreter"), 148 zrzutów `.webp` i fonty `.woff2` jawnie binarne.
  Renormalizacja sprawdzona przed commitem: zero zmian w drzewie.
- **`.editorconfig`**, **`.nvmrc`** i **`engines: node >=24`** — wymaganie
  z README mówią teraz także narzędzia.
- **`.github/PULL_REQUEST_TEMPLATE.md`** i **`.github/dependabot.yml`** —
  szablon PR z checklistą wskazującą realną bramkę; Dependabot z sufitami
  otwartych PR-ów i grupowaniem drobnicy, bo jego PR-y odpalają CI, którego
  limit minut organizacji stoi do 1 września. Blokady majorów mają warunek
  wyjścia zamiast ciszy.
- **Pole `wymaga` w audycie mutacyjnym** — mutacja strażnika WARUNKOWEGO
  jest pomijana przy braku materiału, zamiast raportować fałszywe
  „PRZEPUŚCIŁ mutację".

### Wycofane własne wnioski (audyt falsyfikowany jak kod)

- „Sześć plików w `modules/`/`lib/` nikt nie importuje" — pierwszy skan
  pomijał testy i narzędzia; wszystkie sześć jest używanych. Martwego kodu
  w repo nie ma.
- „`tools/podglad-kursow/styl.css` może być martwy po redesignie" — czyta
  go generator przez `style.mjs`. Żywy.
- „33 podpisy zrzutów mają podwójną ucieczkę" — pierwsza wersja nowego
  strażnika brała zwykłą encję `&quot;` za usterkę. Sprawdzenie źródła
  pokazało konwencję całego repo (1960 par `„…"` wobec zera `„…”`).
  Kontrola zawężona do `&amp;X;`, komentarz w kodzie ostrzega przed nawrotem.
- Pierwsza wersja wzorca „na NN sposobów" w `straznik-readme` była MARTWA
  (fraza łamie się w blockquote) — złapana testem negatywnym przed commitem.

### Drugi audyt złapał dwie usterki w pracy tego kroku

Powtórny przebieg po wszystkich zmianach (zasada: nie zakładaj, że skoro
zmieniłeś, to naprawiłeś) wykrył dwie rzeczy w kontrolach dopisanych wyżej:

- **Mutacja przypięta do konkretnej liczby umarła**, gdy README zmieniło
  93 → 95 sposobów. To ta sama klasa, co regresja z 0.28.0: wzorzec ma
  celować w ZACHOWANIE, nie w wartość. Obie mutacje liczbowe biorą teraz
  liczbę z tekstu i podbijają ją same.
- **Wzorzec `test\w*` w `straznik-readme` NIGDY nie pasował do formy
  „testów"** — `\w` w JavaScripcie nie obejmuje polskich znaków, więc
  kontrola milczała na prawdziwej treści README i tylko wyglądała na
  działającą. Maskowała to stara mutacja, która wpisywała formę „testy"
  (bez „ó"). Po zmianie mutacji na formę z ogonkiem audyt od razu
  zaraportował „strażnik PRZEPUŚCIŁ". Wzorce czytają teraz `\p{L}` z flagą
  `u`; sprawdzone testem negatywnym w obie strony.

Wniosek do zapamiętania: **mutacja, która maskuje ślepotę strażnika, jest
groźniejsza niż jej brak** — zielony audyt utwierdzał w tym, że kontrola
działa.

### Świadomie NIE zrobione

- **`"type": "module"` w package.json** — uciszyłoby ostrzeżenia
  `MODULE_TYPELESS` przy każdym uruchomieniu testów, ale zmienia sposób
  ładowania każdego pliku w projekcie. To nie jest zmiana do commita
  o higienie.
- **`version` w package.json** — wersja żyje w top CHANGELOG pod
  `straznik-wersji`; trzecie miejsce to trzecia okazja do rozjazdu.
- **CODE_OF_CONDUCT, CODEOWNERS, szablony zgłoszeń** z repo strony głównej —
  repozytorium jest prywatne i jednoosobowe, w historii ma 0 issues,
  a CODEOWNERS bez ochrony gałęzi (niedostępnej w planie Free) niczego nie
  wymusza. Zasady współpracy z tamtego kodeksu już obowiązują u nas przez
  `docs/WYTYCZNE.md`.
- **SECURITY.md** — `docs/security-checklist.md` robi to samo lepiej
  (pięć stanów, dowód przy każdym wierszu). Wróci przy publicznym repo.

### Sprzątnięte

- **Gałęzie po zmergowanych PR-ach** (decyzja właściciela 2026-08-24,
  wcześniej niż zakładał krok 4 planu): każda z nich była headem jednego
  z 57 zmergowanych PR-ów, sprawdzone `gh pr list` co do sztuki.
  Gałęzie `bak/*` zostają — to migawki procedury napraw (WYTYCZNE §1).

## [0.34.0] — 2026-08-24

**Redesign widoku treści kursu — to, co klient dostaje PO zakupie.**
Polecenie właściciela: doprowadzić widok kursu do poziomu strony sprzedażowej
`/szkolenia/[slug]`, bez dotykania treści lekcji. Decyzje właściciela podjęte
na starcie: wygląd żyje w **generatorze HTML** (nie w trasie Nexta — produkt
idzie na Tutor LMS, gdzie portuje się CSS i szablony, a nie komponenty
Reacta), nawigacja to **pływająca pigułka jak na stronie sprzedażowej**
(bez stałego panelu bocznego), a postęp to **pozycja w kursie plus pamięć
tej przeglądarki**.

### Dlaczego to nie było tylko upiększanie

Strona sprzedażowa pokazuje w sekcji „Tak wygląda kurs od środka" mockup
`OknoKursu` z modułami, statusami lekcji i paskami postępu, a pod nim
obiecuje: „zawsze wiesz, gdzie jesteś", „widzisz swój postęp lekcja po
lekcji", „to samo zobaczysz po zalogowaniu". Widok kursu nie miał **żadnej**
z tych trzech rzeczy — czyli obietnica ze strony sprzedażowej była
niedotrzymana, ta sama klasa usterki co BLAD-015 z audytu w 0.33.0.

### Dodane

- **Moduł `tools/podglad-kursow/`** — wygląd wyjęty z generatora do osobnych
  plików: `style.mjs` (tokeny 1:1 z `app/globals.css`), `szablony.mjs`,
  `tresc.mjs`, `skrypt.mjs`, `ikony.mjs`, `wymiary.mjs`. Generator odpowiada
  już tylko za przebieg.
- **Pływająca pigułka menu** wzorowana na `components/kurs/PasekKursu.tsx`:
  sygnet marki, rozwijany **program całego kursu** z zaznaczoną bieżącą
  lekcją, spis sekcji bieżącej lekcji, przycisk „Następna" i nitka postępu
  czytania. Oba menu stoją na `<details>`, więc działają bez JavaScriptu —
  to jedyna nawigacja po 73 lekcjach i nie ma prawa zależeć od skryptu.
- **Sekcje prozy dostały tożsamość.** Szkielet powtarza się w 73 lekcjach na
  73 („Czego się nauczysz", „Zrób to teraz (X minut)", „Zapamiętaj",
  „Co dalej") i w części z nich („Prompty z tej lekcji" 67, „Gdy coś nie
  działa" 46). Do tej wersji wszystkie renderowały się jako identyczny `<h2>`;
  teraz każda ma własne pudełko: cele z ptaszkami, ćwiczenie z odznaką czasu
  i numerowanymi krokami, biblioteka promptów z przyciskiem „Kopiuj",
  stonowany panel diagnostyczny, podsumowanie i most do następnej lekcji.
  **Rozpoznanie działa wyłącznie po nagłówkach, które w prozie już są** —
  ani jedno słowo treści nie zostało zmienione.
- **Żywe tło** strony kursu: siatka blueprint, dryfujące bloby, poświata za
  kursorem (jedna pętla rAF, tylko `transform`) i ziarno — wszystko
  przeniesione z `TloKursu`/`HeroKursu`, całość wygaszana przez
  `prefers-reduced-motion`.
- **Postęp czytania**: „lekcja 7 z 41" liczona z programu (prawdziwa zawsze),
  przycisk „Oznacz jako przeczytaną", ptaszki w spisie programu i pasek
  ukończenia kursu — stan w `localStorage`, **z podpisem wprost, że to pamięć
  tej przeglądarki, a nie konto**.
- **Strona kursu** przebudowana na akordeony modułów ze znacznikami lekcji
  (wzór: `OknoKursu`), kafelki liczbowe i pasek ukończenia; strona wejściowa
  na równe karty kursów.

### Naprawione

- **Strona wejściowa podglądu nigdy nie ładowała Geista.** `@font-face`
  miał wpisane na sztywno `../zasoby/`, co z `index.html` w korzeniu celowało
  poza katalog wyjściowy — przeglądarka podstawiała font systemowy. Arkusz
  jest teraz osobnym plikiem, więc ścieżki fontów liczą się względem niego.
- **Siedem zrzutów nie wyświetlało się w ogóle** (moduł 4 Kursu 2). Dwa
  obrazy zapisane w markdownie w sąsiednich wierszach marked skleja w jeden
  akapit, a dopasowanie obsługiwało tylko obraz sam w akapicie — takie pary
  zostawały surowym `<img src="zrzuty/…">` ze ścieżką ze źródła, której
  w wyjściu nie ma. Błąd istniał od powstania narzędzia.
- **29 podpisów zrzutów pokazywało dosłowne `&quot;`** zamiast cudzysłowu —
  tekst uciekany dwa razy (raz przez marked, raz przez generator).
- **Nagłówki sekcji pokazywały surowe odwrócone apostrofy** zamiast składać
  kod czcionką maszynową (21 nagłówków, np. „Plik \`SKILL.md\` — dwie
  części"); tytuł idzie teraz przez markdown w trybie liniowym.

### Wydajność

- Arkusz (43,7 kB) i skrypt (7,8 kB) wyciągnięte do `zasoby/` i wspólne dla
  76 stron — wcześniej szły wklejone do każdej z osobna. Strona lekcji: **77 kB
  → 30 kB**, a arkusz i skrypt pobierają się raz.
- **Wymiary każdego z 148 zrzutów czytane z nagłówka pliku WebP** i wpisywane
  w `width`/`height` — przeglądarka rezerwuje miejsce przed pobraniem obrazu
  (CLS; projekt trzyma tę metrykę na zerze od 0.25.0). Kontrola: 0 obrazów
  bez wymiarów.
- Zero nowych zależności: ikony to wklejony SVG (`lucide-react` to komponenty
  Reacta, w statycznym HTML-u nie istnieją), animacje wyłącznie na
  `transform`/`opacity`, nasłuchy scrolla pasywne z odczytem geometrii w rAF.
- Żaden element nie ma stanu ukrytego zależnego od JavaScriptu — wejście kart
  robi animacja CSS. Sprawdzone przebiegiem z **usuniętym** `widok.js`: treść,
  nawigacja i karty działają.

### Self-check przed wdrożeniem

Redesign przeszedł osobny przebieg kontrolny (polecenie właściciela: sprawdzić
własną pracę tak, jakby robił to drugi programista). Znalezione i naprawione:

- **Martwy kod na wszystkich 76 stronach.** Inline `<script>` w `<head>`
  dokładał klasę `js`, na której po zmianach nie wisiała już ani jedna reguła.
  Razem z nim wyleciał obserwator wejść elementów w widok: wejście miały
  **dwie karty na stronie wejściowej, obie nad zgięciem**, więc
  `IntersectionObserver` odpalał je natychmiast po wczytaniu i nie robił nic,
  czego nie robi animacja CSS — a wymagał stanu ukrytego i bramki na wypadek
  niewczytania skryptu. Zastąpione animacją w arkuszu: **skrypt 8460 → 7768 B**
  i zero ryzyka, że treść zostanie niewidoczna.
- **Arkusz przeniesiony z literału JavaScriptu do prawdziwego `styl.css`.**
  Pojedynczy odwrócony apostrof w komentarzu CSS zamykał literał i przerywał
  generator w losowym miejscu pliku — zdarzyło się to **cztery razy pod rząd**,
  a ostrzeżenie w nagłówku nie pomogło. Usunięta przyczyna, nie objaw; przy
  okazji arkusz przenosi się do szablonów Tutora przez skopiowanie pliku.
- **Ikona kopiowania była zdefiniowana dwa razy** (w `ikony.mjs` i przepisana
  ręcznie w skrypcie). Jedno źródło prawdy.
- **Cztery deklaracje `hover-lift` w trzech miejscach** ściągnięte do jednej
  klasy `.unos` — odpowiednika tej ze strony sprzedażowej.
- **Tekst niosący treść był za mały:** odznaka czasu ćwiczenia 9,6 px, nazwa
  modułu w rozwijanym programie 8,8 px, nagłówek kolumny tabeli 9,6 px.
  Podniesione; mikroetykiety ozdobne zostają w skali z `app/globals.css`.
- **Pozycja lekcji w rozwijanym programie miała 34 px wysokości** — pod palcem
  za mało. Na ekranach dotykowych rośnie do 44 px.
- **Brakowało łącza pomijającego nawigację** i obsługi **wymuszonych kolorów
  systemu** — obie rzeczy strona sprzedażowa ma, widok kursu nie miał.
- **Akordeon modułu otwierał się skokiem**, a `details.panel` na stronie
  sprzedażowej płynnie. Wyrównane (`::details-content`, progressive
  enhancement).
- **`textContent` sklejał sąsiadujące bloki** („01Czym właściwie jest
  ClaudeClaude to platforma…", „Zrób to teraz10 minut"). Wizualnie bez różnicy,
  ale czytniki ekranu i wyszukiwarka w przeglądarce dostawały zlepki.
- **Kod łamany w wąskiej kolumnie** dostawał obciętą ramkę na obu połówkach
  (`box-decoration-break: clone`), a kolor tekstu kodu powtarzał się dwa razy
  jako literał — teraz token.

**Czego kontrola NIE potwierdziła** (cztery fałszywe alarmy z moich własnych
testów, wszystkie sprawdzone do końca, zanim uznałem je za nieistotne): smoke'i
`d4`/`d5` padały, bo działający `next dev` pisze do tego samego `.next`, co
produkcyjny build — po czystym buildzie **7/7 zielonych**; „menu się nie
otwiera" brało się z dwóch kliknięć pod rząd w teście; „11 nieklikalnych
pozycji" to pozycje z ZAMKNIĘTEGO drugiego menu; „kontrast 1,05:1 na H1" to
nagłówek z gradientem (`color: transparent`), realnie ok. 8,4:1.

**Treść lekcji: 73 z 73 zgodne co do słowa** ze źródłem w `tresc-kursow/`
(porównanie automatyczne, po normalizacji składni markdowna). Jedyne różnice są
świadome i widoczne: numer sekcji `1.` renderuje się jako `01` w osobnym
polu, a czas ćwiczenia z nawiasu — jako odznaka.

**Stan dowodów po self-checku:** strażnicy 28/28, testy 75/75, audyt mutacyjny
90/90, **smoke'i aplikacji 7/7**, eslint czysty. Kontrola 76 stron: 0 martwych
odsyłaczy, 0 brakujących zasobów, 0 obrazów bez wymiarów, 0 błędów konsoli.
**CLS = 0 w 12 na 12 zmierzonych widoków** (3 szerokości × 4 strony, po
przewinięciu całej strony, żeby doładowały się obrazy). Wszystkie 41 pozycji
lekcji klikalne — sprawdzone trafieniem w punkt, nie samym istnieniem
odsyłacza. Stany kursu (pusty / rozpoczęty / ukończony / uszkodzona pamięć
przeglądarki) zachowują się poprawnie.

### Dowody

Strażnicy **28/28**, testy **75/75**, audyt mutacyjny **90/90**.
Kontrola całego wyjścia (76 stron): 0 martwych odsyłaczy, 0 brakujących
zasobów, 0 obrazów bez wymiarów, 0 błędów konsoli, brak przewijania poziomego
przy 390 / 820 / 1440 px — kontrola sprawdzona **testem negatywnym**
(podłożona nieistniejąca strona zapala 404). Widok zweryfikowany także bez
JavaScriptu i przez `file://`.

## [0.33.0] — 2026-08-24

**Audyt obu kursów i naprawa jego znalezisk.** Audyt (zakres ustalony przez
właściciela: tropy z `tresc-kursow/AUDYT-KONCOWY.md` + prawda o produkcie +
domknięcie miejsc na zrzuty) potwierdził, że treść jest zdrowa — 73 mosty
między lekcjami trzymają się co do zdania, powtórzeń nie ma, stan repozytorium
czytelnika jest spójny, podsumowania obu kursów przypisują tematy modułom
poprawnie — a rozjazd siedział **poza prozą**: w tekstach sprzedażowych,
w seedzie i w trzech narzędziach.

### Naprawione

- **Strony sprzedażowe obu kursów obiecywały inny produkt (BLAD-015).**
  Sekcje pochodziły z roboczych seedów sprzed Działu 7 i nigdy nie nadążyły
  za dwiema zmianami programu. Publiczny podgląd obiecywał „7 modułów wideo
  (31 lekcji)” przy 6 modułach i 41 lekcjach, „6 modułów wideo (26 lekcji)”
  przy 32 lekcjach Kursu 2, „moduł ratunkowy: restore, revert, reset” (te trzy
  komendy **nie padają w Kursie 2 ani razu**), „kilka godzin wideo”
  i „nagrywamy poprawki” (kurs jest TEKSTOWY — decyzja 2026-08-19), „Projekty
  i artefakty” w Kursie 1 (kurs ich nie uczy), „szablony do pobrania w plikach”
  (nie ma takich plików) oraz FAQ Kursu 2 z **odwrotną** kolejnością nauki
  („najpierw Git lokalnie” — kurs zaczyna w przeglądarce). Wszystko przepisane
  na stan faktyczny: liczby z bazy, obietnice zastąpione tym, co kurs realnie
  dowozi (ćwiczenie w każdej lekcji, prompty w 35 lekcjach, 10 lekcji z sekcją
  „Pytania do wykonawcy”, 88 zrzutów z prawdziwego GitHuba, tabela zgodności
  ze źródłem pod każdą lekcją). Sekcje wgrane do bazy dyspozytorem **bez
  klucza `modules`**, więc program i treść 73 lekcji zostały nietknięte.
- **Program Kursu 1 w seedzie był sprzed Działu 7** — to z niego wzięły się
  obietnice o „czatach, projektach i artefaktach”. Odtworzony z bazy, tak jak
  program Kursu 2 (seed ma być lustrem bazy, inaczej odtworzenie z niego
  rozjeżdża prozę z lekcjami).
- **Seed wykonywał się przy samym imporcie**, a zaczyna od kasowania kursów —
  czyli import pliku skasowałby treść 73 lekcji. Dołożona bramka
  main-module i eksport danych (`KURSY_SEED`).
- **Trzy narzędzia brały adres URL za ścieżkę systemową (BLAD-014).**
  W katalogu ze spacją w nazwie `import.meta.url` koduje ją jako `%20`, więc:
  `tools/zrzuty/manifest.mjs` — jedyne źródło prawdy o stanie przelotu zrzutów
  — **milczał i kończył się kodem 0**; `tools/zrzuty/test-asercji.mjs` padał
  na komplecie 15 testów; `tools/zrzuty/kolejka.mjs` podawał spawnowi ścieżkę
  z `%20`. Wszystkie trzy na `fileURLToPath`.
- **Bramka prywatności zrzutów przepuszczała dane rozbite na dwa elementy
  (BLAD-016).** Podmiana danych właściciela chodzi po węzłach tekstowych, więc
  adres w dwóch `<span>`-ach dostawał ją tylko w połowie, a na ekranie zostawał
  czytelny fragment. Test negatywny na to istniał od 2026-08-23, ale **był
  martwy**, bo cały plik testów padał na BLAD-014. Bramka dostaje teraz listę
  zastępników i odrzuca zrzut, gdy zastępnik przykleił się do innych znaków
  słowa. Testy asercji: 15/15, kod wyjścia sprawdzony bez potoku.
- **Obietnica z lekcji 3.1 Kursu 2 była niedowieziona:** zapowiadała, że moduł
  o bezpieczeństwie nauczy włączać *sześć* rzeczy, a moduł 6 dowozi pięć —
  prywatnego zgłaszania podatności nie ma w nim ani razu. Zapowiedź zawężona
  do stanu faktycznego (bez dopisywania treści, której kurs nie ma).
- Drobne: cudzysłów zamykający `”` w dwóch plikach i jedno `«…»` poza
  cytatem zagnieżdżonym → jednolite `„…"` w całej prozie; angielski zastępnik
  `BRANCH-NAME` w bloku kodu lekcji 4.8 → `NAZWA-GAŁĘZI` (kurs ma 93 polskie
  zastępniki i objaśnia je wprost).

### Zmienione

- **Powtarzana formuła zastrzeżenia źródłowego zdjęta z 20 lekcji Kursu 2.**
  Była jedynym powtórzeniem między lekcjami w całym materiale (i jedynym
  trafieniem w pomiarze podobieństwa), stała w 20 z 32 lekcji Kursu 2 i w 0
  z 41 lekcji Kursu 1. Gwarancję, którą niosła, daje tabela „Zgodność ze
  źródłem” pod KAŻDĄ z 73 lekcji — z dokładnością do miejsca w dokumentacji.
  Podobieństwo najbliższej pary spadło z 2,75% do 2,03%.
- **Dwanaście otwartych znaczników `<!-- ZRZUT: … -->` usuniętych** z prozy
  Kursu 1 (przelot zamknięty decyzją właściciela 2026-08-23). Sprawdzone
  miejsce po miejscu: żadne zdanie nie odsyłało do brakującego obrazu.
  Manifest liczy teraz 148 miejsc i 148 zrobionych.
- Mutacja `straznik-prozy` o niedomkniętym znaczniku zrzutu **wstawia** teraz
  znacznik, zamiast psuć istniejący — po usunięciu ostatnich dwunastu umarła
  po raz drugi (pierwszy raz 2026-08-23). Audyt mutacyjny złapał to od razu.

- **README kłamał w pięciu miejscach o własnym projekcie.** Zrzut katalogu
  w nagłówku linkował do `http://localhost:3001/szkolenia`, więc czytelnik na
  GitHubie trafiał we własny, nieuruchomiony serwer (publiczny adres podglądu
  istniał w repo od 0.23.0, tyle że w tabeli niżej). Sam zrzut był z 18 sierpnia
  i reklamował „13 MODUŁÓW · 57 LEKCJI · 11 GODZIN" przy realnych 12 · 73 · 20 —
  odtworzony z produkcyjnego `next start`, z asercją na liczby przed zapisem
  pliku. Do tego: „treść kursów jeszcze ROBOCZA" przy podglądzie na żywo,
  uzasadnienie `noindex` oparte na roboczej treści, „62 testy" przy 75 realnych
  i opis `npm run db1:seed`, który nie ostrzegał, że komenda NAJPIERW KASUJE
  kursy — czyli razem z prozą 73 lekcji.
- **Podgląd publiczny przebudowany** (zgoda właściciela 2026-08-24): żywy adres
  serwuje 0.33.0, kontrola po deployu daje **0 trafień** na wzorce nieprawd na
  obu stronach sprzedażowych, a katalog pokazuje 2 · 12 · 73 · 20.

### Dodane

- `straznik-obietnic` — sprzedaż nie ma prawa obiecywać czegoś spoza produktu:
  porównuje liczbę modułów, lekcji, minut i zrzutów deklarowaną w sekcjach
  z programem kursu i z prozą, zakazuje twierdzeń o wideo i sprawdza obietnice
  podzbioru („prompty w N lekcjach”). 3 mutacje, 5 testów negatywnych.
- `straznik-sciezek` — łapie klasę BLAD-014 (sklejka `file://` z `argv[1]`
  i `.pathname` z URL-a pliku) w całym repo. 2 mutacje, test negatywny.
- Wpisy **BLAD-014**, **BLAD-015** i **BLAD-016** w rejestrze znanych błędów.

### Dowody (CI stoi do 1 września — limit minut Actions)

Strażnicy **28/28**, audyt mutacyjny **90/90 złapanych, 0 przeoczonych,
0 martwych**, testy **75/75**, smoke'i D4/D5/D6/lekcje/SEO/CSP **6/6**
(kody wyjścia bez potoku), testy asercji zrzutów **15/15**, pliki prozy
zgodne z bazą **73/73**. Sweep regresyjny przed/po: zmieniły się dokładnie
34 lekcje, **73 mosty identyczne** po odjęciu dwóch świadomych zmian,
167 cytatów źródłowych bez zmian, 148 obrazów bez zmian, 0 martwych
odwołań, tabele zgodności bez zmian (1440 + 1011 wierszy).

## [0.32.0] — 2026-08-23

Krok 3 domknięty w warstwie treści: **oba kursy mają komplet prozy
w narzędziu i przelot zrzutów zamknięty**. Kurs 1: 41/41 lekcji, 566 221
znaków dla klienta; Kurs 2: 32/32 lekcje po cięciu mocnym, 367 412 znaków
— wszystko wgrane kreatorem (wgrywarka HTTP) i zweryfikowane dwustronnie
per lekcja (pliki ↔ SQL, zgodność co do znaku; różnica 7 znaków w sumach
to znaki spoza BMP — Postgres liczy znaki, JS jednostki UTF-16). Zrzuty:
**148 z 160 miejsc**, wszystkie pod bramkami rigu; 12 miejsc otwartych
DECYZJĄ właściciela (niżej).

### Dodane

- **proza modułów 2–6 Kursu 2** (26 lekcji ponad kalibracyjny moduł 1;
  dorobek obu czatów scalony na jedną gałąź `feat/tresc-k2-modul-2-3`)
  wraz z briefami modułów i mostami między lekcjami;
- **148 zrzutów ekranu w prozie obu kursów** (`tresc-kursow/**/zrzuty/*.webp`,
  ~40–90 kB każdy): Kurs 2 komplet 88/88, Kurs 1 60/72 — GitHub za
  logowaniem, panele Claude Code ze scenariuszy PTY, dokumentacja,
  rozmowy prowadzone na koncie właściciela (za jego zgodą, prompty
  DOSŁOWNIE z sekcji „Prompty z tej lekcji");
- **rig zrzutów w repo** (`tools/zrzuty/`): specyfikacje JSON z obowiązkową
  maszynową asercją treści (`wymagaTekstu` — fragmenty Z PODPISU, nigdy
  z tego, co wyszło; narzędzie ODMAWIA zapisu obrazu bez nich), bramka
  prywatności (`sprawdzPrywatnosc` + strukturalna kontrola tytułów rozmów
  na claude.ai), bramka `wymagaOdpowiedzi` (w kadrze MUSI leżeć odpowiedź
  modelu), akcje prowadzenia rozmowy (`wpiszWiersze` przez Shift+Enter,
  `czekajNaKoniec` po stabilności tekstu, `wgrajPlik`), rig TUI
  (scenariusze PTY + znaczniki + render xterm) i `wepnij.mjs` wpinający
  obrazy PO PODPISIE, nie po numerze wiersza;
- strażnicy: `straznik-asercji` (specyfikacja bez asercji = czerwone CI)
  i `straznik-odsylaczy-kursu`; razem 26, audyt mutacyjny 85/85;
- rejestr znalezisk przelotu (`tresc-kursow/ZNALEZISKA-PRZELOTU-ZRZUTOW.md`,
  35 pozycji): podpisy wyprzedzające ekran poprawiane W PROZIE, nigdy
  w asercji.

### Zmienione

- pięć podpisów zrzutów w Kursie 1 przestało obiecywać „dwa okna obok
  siebie" — claude.ai nie ma widoku dzielonego, a składanie ekranów
  z fragmentów łamie zasadę „zero zmyślania"; te same porównania
  pokazuje jedna rozmowa z dwoma promptami (znalezisko 31);
- lekcja 4.3 Kursu 1: scenariusz blokady `.env` prosi wprost o narzędzie
  Edit, bo przy zwykłej prośbie Claude zmienia plik komendą powłoki
  i hook `Edit|Write` nie ma czego blokować — dokładnie zawężenie, które
  ta lekcja podaje (znalezisko 33).

### Decyzje właściciela (2026-08-23)

- **przelot zrzutów ZAMKNIĘTY na 148/160 — do robienia zrzutów nie
  wracamy.** Dziewięć miejsc odrzucone z powodu kosztów (klucz API
  i doładowanie Konsoli: 5 × `api`, 2 × Konsola, strumieniowanie 5.5;
  aplikacja Claude na repozytorium demonstracyjnym dla `@claude` 4.6),
  trzy zablokował Cloudflare (2.4, 5.6, 5.8 — wyzwanie dla sterowanej
  przeglądarki nie mija; ręczne okno przechodzi). Te 12 miejsc
  rozstrzygamy przy domykaniu kursu poprawką podpisu i prozy albo
  usunięciem znacznika;
- **rozmowy demonstracyjne z konta claude.ai skasować, gdy wróci dostęp**
  — po potwierdzeniu listy z właścicielem;
- rozmowy na koncie właściciela prowadził agent (zgoda z początku fazy);
  klucz API NIE powstał, konto bez ruchu — widać to na zrzutach Konsoli.

## [0.31.0] — 2026-08-22

Krok 3, etap 3 w części Kursu 1: **komplet prozy w narzędziu — 41 z 41
lekcji, 565 394 znaki dla klienta, sześć modułów, wszystko w bazie drogą
kreatora i w repozytorium na jednej gałęzi.** Kurs 2 (0 z 50) czeka na
cięcie programu — decyzje niżej.

### Dodane

- proza modułu 3 „Claude Code: start i codzienna praca" (8 lekcji,
  148 086 znaków; PR #51) i modułu 5 „Claude przez API" (8 lekcji,
  93 079 znaków, ton „mapa dla decydenta"; PR #52) dociągnięte na trunk
  treści — dotąd żyły w worktree'ach swoich czatów, moduł 5 bez ani
  jednej kopii poza dyskiem;
- tabela postępu prozy w POSTEP.md pokazuje stan po scaleniu
  (41/91 lekcji projektu, Kurs 1 KOMPLETNY) zamiast stanu sprzed
  konsolidacji.

### Decyzje właściciela (2026-08-21/22)

- **17 lekcji bez bramki cytatów zostaje** (3.1–3.6, 5.1–5.3, 5.5–5.7,
  6.1–6.5): usterki tej klasy dotykają wyłącznie treści lekcji — nie
  systemu i nie strony sprzedażowej (strona nigdy nie renderuje treści
  lekcji; pilnuje `straznik-tresci-lekcji`);
- **program Kursu 2: cięcie MOCNE (~33–38 lekcji), ostateczna głębokość
  po pomiarze** — kalibracyjny moduł 1 K2 zmierzy realny koszt lekcji
  (źródła K2 są ~10× cieńsze na lekcję niż w K1, więc koszty K1 mogą
  być zawyżonym prognostykiem);
- **wejście autora**: wyciąg źródeł (−38%) + podział sekcji w briefie;
  BEZ cięcia do samych fragmentów (ochrona przed zgubionymi
  zawężeniami);
- **eksperyment grupowania w kalibracji**: jeden autor pisze dwie
  lekcje dzielące to samo źródło (czyta je raz);
- **bramka cytatów K2: wyrywkowa** — 2 najgęstsze lekcje na moduł.

### Dowody

Strażnicy 25/25 i testy 75/75 na każdym scalanym punkcie; weryfikacja
kompletu DWUSTRONNA: 41 plików prozy na gałęzi (6+5+8+8+8+6) i 41
lekcji z treścią w bazie zapytaniem SQL, nie logiem narzędzia. CI stoi
do 1 września (limit minut Actions) — merge na dowodach lokalnych, po
powrocie CI do potwierdzenia gitleaks.

## [0.30.0] — 2026-08-19

Krok 3 planu domknięcia Pluginu 1, **etap 2: kreator przejmuje treść
lekcji**. Warstwa danych weszła wcześniej (migracja 006, kontrakty,
akcja dyspozytora); to wydanie dokłada PANEL - czyli miejsce, w którym
właściciel naprawdę napisze materiał obu kursów.

Materiał kursu jest towarem: kupujący płaci za dostęp po zalogowaniu.
Dlatego pełny tekst czyta WYŁĄCZNIE nowa trasa kreatora, a katalog
i strona sprzedażowa dostają z bazy samą flagę „lekcja ma treść".

### Dodane

- **`/szkolenia/kreator/lekcja/[id]`** - pisanie treści JEDNEJ lekcji
  (Markdown + materiały dodatkowe), za bramą tokenu, z `noindex`.
  Osobna trasa, nie czwarta zakładka kursu: lekcja mieści 120 000
  znaków, więc formularz kursu woziłby przy każdym wejściu materiał
  wszystkich 41 lekcji.
- **Wejście z zakładki Program** - przycisk „Treść" przy lekcji (stan
  z bazy: napisana albo pusta) i licznik „Z treścią" nad listą modułów.
- **Licznik „Treść lekcji X/Y" na liście kursów** - postęp największej
  roboty kroku 3 widać bez wchodzenia w kurs; liczy baza (indeks
  częściowy z migracji 006), nie panel.
- **`components/kreator/opis-lekcji.ts`** - opis pól lekcji na wzór
  `opis-sekcji.ts`, wraz z limitami z kontraktu.
- **`straznik-tresci-lekcji`** - materiał zza logowania nie ma prawa
  wyjść wspólnym odczytem strony. Domyka lukę zapisaną przy warstwie
  danych: test „strona widzi flagę, nigdy tekstu" dowodził, że KONTRAKT
  obcina treść, ale nie że zapytanie jej nie pobiera.
- **`tools/smoke/smoke-lekcje.ts`** (+ krok w CI) - dowód po HTTP:
  brama, wystrzał treści z samego ciastka, 404 na śmieciach, BRAK
  materiału w katalogu i na stronie sprzedażowej OPUBLIKOWANEGO kursu
  oraz to, że zapis programu nie kasuje napisanej treści.
- Golden `goldeny/d6-lekcja.json` (opis pól lekcji) i runda
  „panel → baza → panel" dla treści lekcji w testach D6.

### Naprawione

- **Panel nie odsyłał identyfikatorów modułów i lekcji.** Warstwa
  danych umiała je utrzymać od 0.26.0, ale formularz kursu wysyłał
  program bez `id` - a dyspozytor kasuje wiersze spoza wejścia. Pierwszy
  zapis kursu skasowałby treść wszystkich lekcji i wstawił program od
  nowa. Teraz `id` jedzie w obie strony.
- **Formularz nie przyjmował stanu po zapisie.** Nowa lekcja dostaje
  `id` dopiero w bazie; bez przyjęcia odświeżonych danych z serwera
  drugi zapis powtarzałby błąd wyżej, a przycisk „Treść" nie pojawiał
  się aż do przeładowania strony.
- **Mutacja `straznik-wagi-dokumentacji` była ślepa w worktree** -
  `git add` odmawia dodania pliku „przez dowiązanie", więc audyt
  raportował dziurę w strażniku, której nie ma. Mutacja celuje teraz
  w ścieżkę bez dowiązania i sprząta po sobie katalog.

### Zmienione

- Kontrolki sterowane opisem pól wyprowadzone z `EdytorSekcji` do
  `components/kreator/PolaOpisane.tsx`, a typy opisu do `opis-pol.ts` -
  jeden renderer dla sekcji i lekcji. Inaczej `straznik-kreatora`
  pilnowałby zgodności z kontraktem tylko w jednym z dwóch edytorów.
- `straznik-kreatora` obejmuje treść lekcji i sprawdza dodatkowo listy
  zamknięte: opcje w panelu muszą być tym samym zbiorem co enum
  kontraktu (panel nie ma prawa podpowiadać wartości, której baza nie
  przyjmie, ani chować tej, którą przyjmuje).
- `trescLekcji()` oddaje też kontekst (kurs, moduł, numer w programie) -
  edytor lekcji to osobna trasa i bez tego nie miałby jak nazwać tego,
  co właściciel pisze, ani dokąd wrócić.

### Dowody

Testy 62/62, strażnicy 24/24, audyt mutacji 71/71 (0 przeoczonych,
0 martwych), smoke D4/D5/D6/lekcje/podgląd zielone na produkcyjnym
`next start`. Każdy nowy test sprawdzony testem negatywnym: 5 mutacji
logiki panelu i rundy przez bazę, 2 mutacje smoke'a (zdjęta brama =
czerwony, formularz bez `id` lekcji = czerwony). CI stoi do 1 września
(wyczerpane minuty Actions) - dowody są lokalne, jak przy 0.21.0
i 0.25.0.

Numer wydania to 0.30.0: krok 2 domknął się w międzyczasie trzema
wydaniami (0.27.0 brama AJAX-a, 0.28.0 limity wejścia, 0.29.0 zamknięcie
kroku), a protokół pracy równoległej mówi wprost — kto merguje pierwszy,
ten bierze numer; drugi scala bazę u siebie i przenumerowuje. Ta gałąź
scaliła bazę DWA razy i za każdym razem przeszła komplet dowodów.

Skutek scalenia z limitami wejścia (0.28.0) widać w `typy.ts`: kształt
`MaterialLekcji` i kontrakt odczytu `LekcjaZTrescia` stoją teraz
w części ODCZYTOWEJ pliku, zgodnie z konwencją `straznik-limitow`
(region limitów zaczyna się przy stałych i obejmuje wyłącznie wejście).
`TrescLekcji` — czyli to, co panel WYSYŁA — zostaje pod limitami, gdzie
strażnik ją widzi. Materiał lekcji przychodzi z sieci, a wypadł poza ten
region, więc sufity jego pól pilnuje odtąd `straznik-tresci-lekcji`
(czwarty niezmiennik + mutacja).
## [0.29.0] — 2026-08-19

**Krok 2 planu domknięcia Pluginu 1 ZAMKNIĘTY.** To wydanie nie zmienia
kodu — domyka krok: checklista bezpieczeństwa nie ma już ani jednej
pozycji możliwej do zrobienia w prototypie i pozostawionej otwartej.

Cztery wydania kroku: **0.26.0** pełne CSP z nonce'em, **0.27.0** brama
jedynego AJAX-a (limit tempa, kara czasowa, stały czas porównania
tokenu), **0.28.0** twarde limity wejścia, **0.29.0** domknięcie.

Bilans wejściowy z przeglądu: 14 otwartych pozycji (nie 18 — tamta
liczba liczyła linie z legendą, nie wiersze tabel), z czego dwie
okazały się zrobione w 0.24.0/0.25.0, pięć trafiło do prototypu,
pięć do specyfikacji wtyczki WP, trzy poza repo (decyzje właściciela:
2FA, branch protection, domena). Wszystkie pięć prototypowych zostało
zrobionych.

### Dodane

- **BLAD-013** w rejestrze: strażnik wiązany z NAZWĄ API zamiast
  z zachowaniem. `straznik-limitera` sprawdzał „limit tempa przed
  czytaniem ciała", opierając się na `request.json()`; gdy trasa
  przeszła na czytanie strumieniem, warunek zamilkł i strażnik
  zzieleniał na mutacji, którą wcześniej łapał. Wykrył to dopiero
  audyt mutacyjny — bez okresowego uruchamiania audytu ta klasa błędu
  jest NIEWYKRYWALNA, bo nie ma żadnego objawu.

### Zmienione

- Checklista bezpieczeństwa: stan 🚧 („w robocie w kroku 2") nie
  opisuje już żadnej pozycji; sekcja specyfikacji WP mówi o tych
  wzorcach w czasie przeszłym — istnieją w kodzie, nie w planach.
- `KROK-2-ZABEZPIECZENIA.md` i `CLAUDE.md` odnotowują domknięcie kroku
  wraz z tym, co świadomie ZOSTAJE otwarte: pozycje należące do
  wtyczki WP (RODO, konta klientów, honeypot, SPF/DKIM/DMARC, HTTPS
  i HSTS) oraz trzy decyzje właściciela poza repo.

### Stan dowodów na koniec kroku

Strażnicy **23/23**, audyt mutacyjny **64 złapane / 0 przeoczonych /
0 martwych**, testy **49/49**, smoke D4/D5/D6/CSP/SEO/podgląd zielone,
lint bez błędów. Wszystko odtwarzane lokalnie — CI organizacji stoi do
1 września (wyczerpany limit minut Actions).

## [0.28.0] — 2026-08-19

Krok 2 planu domknięcia Pluginu 1, **część 3: twarde limity wejścia**.
Kontrakty ograniczały pola kursu (slug 120, title 200, short_desc 500)
i to wyglądało na komplet. Nie było: treść sekcji była gołym
`z.string()`, tablice `sections`/`modules`/`lessons` nie miały sufitu
liczności, `price_grosze` mieściło wszystko aż do granicy kolumny
`integer`, a trasa wczytywała **całe ciało żądania do pamięci**, zanim
cokolwiek je zmierzyła.

Wszystkie liczby w tym wydaniu wzięły się z pomiaru bazy, nie z
przeczucia: najdłuższy tekst w treści sekcji ma **191 znaków**,
najliczniejsza lista **10 pozycji**, kurs ma najwyżej 12 sekcji,
7 modułów i 11 lekcji w module, a pełny zapis kursu waży **17 kB**.
Limity stoją rząd wielkości wyżej — mają odcinać nadużycie, nie pracę.

### Dodane

- Sufity długości i liczności w KAŻDYM polu wejścia: aliasy
  `krotki()` / `akapit()` / `lista()` w `modules/m1-sklep/typy.ts`
  plus nazwane stałe (`LIMIT_KROTKI`, `LIMIT_AKAPIT`, `LIMIT_LISTY`,
  `LIMIT_SEKCJI`, `LIMIT_MODULOW`, `LIMIT_LEKCJI`, `LIMIT_POZYCJI`,
  `LIMIT_CZASU_MIN`, `LIMIT_TOKENU`, `SUFIT_CENY`).
- **Sufit ciała żądania: 2 MB, mierzony STRUMIENIEM** przed
  parsowaniem JSON-a; przekroczenie to 413. `content-length`
  sprawdzamy najpierw, ale mu nie ufamy — może kłamać, a przy
  transferze porcjowanym w ogóle go nie ma.
- `straznik-limitow` — 10 niezmienników, 12 mutacji w audycie (w tym
  kontrprzykład: `z.string()` w kanale ODCZYTU sufitu nie potrzebuje,
  bo tamte dane przychodzą z naszej bazy).
- Pięć testów limitów w `dyspozytor.test.ts` i dwa dowody 413 w smoke
  D6 (ciało z zadeklarowanym rozmiarem oraz ciało bez `content-length`).

### Zmienione zachowanie

- **Treść sekcji jest OCZYSZCZANA schematem przed zapisem.** Do tej
  wersji `content` szedł do JSONB w całości, a schemat rodzaju tylko go
  sprawdzał — więc klucz spoza kontraktu wchodził do bazy bez żadnego
  limitu i bez szans pojawienia się na stronie. Same `.max()` byłyby
  przy tym dekoracją: limity omijało jedno nieznane pole.
- **Konflikt unikalności nie oddaje już komunikatu Postgresa.**
  Surowy tekst niesie nazwy ograniczeń, tabel i kolumn — czyli rysunek
  schematu bazy. Klient dostaje zdanie napisane przez nas, szczegół
  idzie do logu serwera, gdzie jest potrzebny przy diagnozie.
- Cena ponad sufit jest odrzucana walidacją, a nie błędem kolumny
  `integer` (2 147 483 647).

### Naprawione

- **Audyt mutacyjny złapał regresję kontroli z poprzedniego wydania:**
  `straznik-limitera` wiązał sprawdzenie „limit tempa PRZED czytaniem
  ciała" z nazwą `request.json()`. Ta trasa czyta teraz ciało
  strumieniem, więc warunek przestał cokolwiek znaczyć — strażnik
  pozostawał zielony przy mutacji, którą wcześniej łapał. Wzorzec
  patrzy teraz na pierwsze DOTKNIĘCIE ciała, jakąkolwiek drogą.
- `straznik-limitow` porównywał pozycję nazwy `cialoZSufitem`, trafiając
  w jej definicję na górze pliku zamiast w wywołanie — ta sama klasa
  błędu, złapana tym samym audytem, w tym samym przebiegu.

## [0.27.0] — 2026-08-19

Krok 2 planu domknięcia Pluginu 1, **część 2: brama jedynego AJAX-a**.
Do tej wersji zgadywanie tokenu kosztowało cokolwiek WYŁĄCZNIE
w formularzu logowania (700 ms kary od D6). Kanał sieciowy
`/api/szkolenia` — ten JEDYNY wystawiony na świat — nie miał ani kary,
ani limitu, ani nawet porównania tokenu w stałym czasie.

**Checklista mówiła w tym miejscu „✅" i nie kłamała — mówiła prawdę
o formularzu.** Wiersz nie zauważał, że obok stoją drugie drzwi, które
robią to samo bez żadnej z tych trzech ochron. Całe wydanie sprowadza
się do wyrównania obu wejść do tego samego zamka.

### Dodane

- `lib/limiter.ts` — okno przesuwne po adresie i akcji. Moduł CZYSTY
  (bez importów z `next/*`), więc granice okna sprawdza test jednostkowy
  z wstrzykniętym czasem, zamiast zgadywania ze zrzutów żywego serwera
  — ten sam układ, co `lib/csp.ts`. Dwa progi, bo bronią przed dwiema
  różnymi rzeczami: 60 wystrzałów na minutę z adresu (zalew) i 5
  CHYBIONYCH uwierzytelnień na 10 minut (zgadywanie).
- `lib/limiter.test.ts` — osiem dowodów: liczba przepuszczonych prób,
  granica okna co do milisekundy, prawdziwość `Retry-After`, brak
  przesuwania okna przez odrzucone próby, rozdział kluczy, zerowanie,
  sufit pamięci i czytanie adresu z nagłówków.
- `straznik-limitera` — 11 niezmienników, 14 mutacji w audycie (w tym
  kontrprzykład: `token === wzorzec` zacytowane w KOMENTARZU ma być
  przemilczane, bo strażnik oskarżający opisy jest strażnikiem,
  którego się wyłącza).
- Smoke D6 dowodzi bramy tempa **po HTTP**: seria chybionych tokenów
  kończy się odpowiedzią 429 z `Retry-After`, a poprawny token z tego
  samego adresu przechodzi mimo wyczerpanego licznika chybionych prób.
- Audyt strażników umie teraz mutację „skasuj plik" (`usunPlik`) — bez
  tego niezmiennika „test limitera musi istnieć" nie dałoby się
  sprawdzić inaczej niż deklaracją.

### Zmienione zachowanie

- Jedyny AJAX odmawia kodem **429 z nagłówkiem `Retry-After`** (RFC
  6585), treść generyczna — klient wie, że ma zwolnić, ale nie wie,
  w który licznik trafił.
- **Kara czasowa 700 ms działa też poza formularzem.** Stała
  przeprowadziła się do `lib/limiter.ts`, żeby oba kanały liczyły tak
  samo, a nie „tak samo z pamięci".
- Udane uwierzytelnienie **zeruje** licznik chybionych prób z tego
  adresu — właściciel, który raz wkleił zły token, nie pracuje dalej
  z licznikiem na skraju wyczerpania.

### Decyzje zapisane w kodzie, nie w głowie

- **Licznik chybionych prób pyta o WYNIK dyspozytora, zamiast oceniać
  token sam.** Dzięki temu żądanie z poprawnym tokenem nie ma jak w niego
  wpaść, choćby ktoś przed sekundą zgadywał z tego samego adresu (a
  zgadującego to nie ratuje — on z definicji poprawnego tokenu nie ma).
  Trasa dalej niczego nie autoryzuje: dowiaduje się z odpowiedzi.
- **Odrzucone próby nie wchodzą do okna.** Inaczej dobijanie się do
  zamkniętych drzwi przesuwałoby termin zwolnienia w nieskończoność,
  a `Retry-After` byłby zmyśloną liczbą. Limiter ogranicza TEMPO,
  nie karze.
- **Po wyczerpaniu limitu odpowiadamy natychmiast, bez kary czasowej** —
  700 ms trzymanego połączenia przy zalewie jest kosztem naszym, nie
  atakującego.
- **`x-forwarded-for` jest do podrobienia**, dopóki nie stoi przed nami
  proxy, które ten nagłówek nadpisuje. Zdanie stoi w kodzie i w
  specyfikacji wtyczki WP: limit po adresie podnosi KOSZT ataku i nie
  jest granicą bezpieczeństwa. Granicą jest porównanie tokenu w stałym
  czasie, docelowo uwierzytelnianie z Pluginu 3.
- **`timingSafeEqual` w dyspozytorze to KOPIA sześciu linii, nie import
  z `lib/`** — moduł ma zostać samowystarczalny jak wtyczka (WYTYCZNE
  §8), a `lib/kreator-dostep.ts` ciągnie `next/headers`.
- **Stan limitera siedzi w pamięci procesu** — świadomie, na czas
  prototypu. Do specyfikacji WP idzie REGUŁA (okno przesuwne po adresie
  i akcji), nie ta implementacja; tam nośnikiem będzie baza albo obiekt
  cache WordPressa.

### Naprawione

- **`modules/m1-sklep/dyspozytor.ts` porównywał token operatorem `===`.**
  Porównanie kończy się na pierwszym różnym bajcie, więc mierzalny czas
  odpowiedzi zdradzał, ile pierwszych znaków zgadło się poprawnie — a to
  zamienia zgadywanie tokenu w zgadywanie znak po znaku. Formularz
  liczył w stałym czasie od D6; wystawiony na świat kanał sieciowy nie.

## [0.26.0] — 2026-08-19

Krok 2 planu domknięcia Pluginu 1, **część 1: pełna polityka
bezpieczeństwa treści (CSP)**. Do tej wersji wysyłaliśmy sam
`frame-ancestors 'none'`, a resztę checklista odkładała do etapu
WordPressa z uzasadnieniem „w prototypie byłaby teatrem".

**Ta ocena była nieprawdziwa i to jest główna zmiana tego wydania.**
Jedynym realnym kosztem nonce'ów jest wymuszenie renderowania na
żądanie — a wszystkie nasze trasy z treścią są `force-dynamic` od D4/D5.
Płaciliśmy więc ten koszt od dawna, nie biorąc nic w zamian.

### Dodane

- `proxy.serwer.ts` — polityka nagłówkiem HTTP, nonce inny w każdym
  żądaniu. Nazwa z `serwer.*` nie jest kosmetyką: Proxy jest na liście
  „Unsupported Features" eksportu statycznego, więc plik `proxy.ts`
  wywróciłby `build:podglad`. Ten sam trik `pageExtensions`, którym
  rozdzielamy trasy kreatora i AJAX-a.
- `lib/csp.ts` — jedno źródło polityki dla obu trybów budowania
  (bez importów z `next/*`, bo czyta go też zwykły skrypt Node'a).
- `lib/csp-nonce.ts` — nonce dla znaczników, którym Next go nie nadaje.
- `tools/csp-podglad.mjs` — polityka dla podglądu w `<meta http-equiv>`
  z hashami skryptów, liczonymi z GOTOWYCH plików `out/`.
- `straznik-csp` (9 niezmienników, 10 mutacji) i `tools/smoke/smoke-csp.ts`
  (nagłówek na żywym serwerze + hashe w plikach podglądu).

### Zmienione zachowanie

- **Strona 404 i korzeń są renderowane na żądanie**, nie z prerenderu.
  To nie efekt uboczny, tylko warunek poprawności: pomiar pokazał
  24 skrypty na `/_not-found` i **zero nonce'ów** — pod `strict-dynamic`
  (który unieważnia `'self'`) nie wykonałby się żaden. Odczyt nagłówków
  w układzie korzenia przestawia te trasy na renderowanie na żądanie.
- `next.config.ts` zostaje z nagłówkami niezależnymi od żądania;
  wpis `frame-ancestors 'none'` jest tam teraz WARSTWĄ dla ścieżek poza
  zasięgiem proxy (pliki statyczne, prefetch), a nie polityką dokumentów.

### Decyzje zapisane w kodzie, nie w głowie

- **`style-src` stoi na `unsafe-inline` — świadomie.** React hoistuje
  arkusz `@font-face` i przy tym ZDEJMUJE mu `nonce`, a strona renderuje
  19 atrybutów `style="…"`, których nonce nie obejmuje z definicji.
  Obecność nonce'a w `style-src` kasuje `unsafe-inline`, więc wybór był
  binarny. Zmierzone: wariant „ostry" daje **21 naruszeń** na samym
  katalogu i gasi kroje pisma, czyli cofa pracę nad CLS z 0.25.0.
  Realną ochroną jest `script-src` i to jego pilnuje strażnik.
- `img-src` dopuszcza `https:`, bo kreator przyjmuje okładkę jako
  dowolny adres (decyzja właściciela z D6); `http:` zostaje zablokowany.
- Podgląd nie dostaje `strict-dynamic` (w eksporcie znaczniki
  `<script src>` stoją wprost w HTML-u) ani `frame-ancestors`
  (w `<meta>` ignorowane) — obie różnice są udokumentowanym kosztem
  hostingu bez nagłówków, nie przeoczeniem.

### Naprawione

- **BLAD-012**: `smoke-podglad` budował podgląd przez `npx next build`
  zamiast komendy `npm run build:podglad`, więc oglądał katalog `out/`
  BEZ kroków po buildzie — czyli inny artefakt niż ten, który wydaje
  deploy. Nawrót klasy błędu, która w 0.24.0 wypuściła podgląd
  z czterema martwymi miniaturami OG.
- `straznik-seo` oskarżał o „własny blok `application/ld+json`" pliki,
  które wspominają o nim w KOMENTARZU. Teraz pomija komentarze — jak
  `straznik-linkow` pomija bloki kodu. Reguła przypięta kontrprzykładem
  w audycie mutacyjnym.

### Dowody (CI stoi do 1 września — odtworzone lokalnie)

- strażnicy **21/21**, audyt mutacyjny: wszystkie mutacje ZŁAPANE,
  kontrprzykłady przemilczane;
- `smoke-csp` zielony, oba testy negatywne czerwone tam, gdzie trzeba
  (błędny nonce → „1 z 42 skryptów bez nonce'a"; pominięty hash →
  „skrypt bez swojego hasha w polityce");
- pomiar w prawdziwej przeglądarce (Firefox, `securitypolicyviolation`):
  **0 naruszeń i 0 błędów konsoli** na `/szkolenia`, stronie kursu, 404
  i kreatorze, w obu trybach budowania; hydratacja przechodzi, 4 reguły
  `@font-face` na miejscu, dane strukturalne nienaruszone.

## [0.25.0] — 2026-08-19

Krok 1 planu domknięcia Pluginu 1, **część 3 z 3: wydajność i pomiary**.
Liczby w tabeli README pochodzą z PageSpeed Insights (Lighthouse na
serwerach Google), mediana z 5 przebiegów, i są przypięte goldenem —
`straznik-progow` nie przepuści liczby bez pokrycia w zapisanym
przebiegu. Wynik: **desktop 100/100/100/100 na obu stronach (po 5
przebiegów z rzędu), mobile 96–97 wydajności** przy komplecie 100
w dostępności, dobrych praktykach i SEO. Mobilne 96–97 to artefakt
symulacji Lantern (dolicza łańcuch webfontu do tekstowego LCP;
obserwowane LCP na serwerach Google to ~450 ms) — **przyjęte decyzją
właściciela (2026-08-19), łagodzącą warunek „100 w każdej kolumnie"**.

### Naprawione (każda usterka znaleziona i potwierdzona pomiarem)

- **Podmiana fontu przesuwała stronę i opóźniała LCP** (desktop CLS
  0,137–0,166, mobile LCP przy dojeździe fontu). `next/font/local` nie
  emituje `<link rel="preload">` w tym projekcie w ogóle, więc font
  jechał łańcuchem HTML → CSS → font; statystyki hero łamały się
  fontem zastępczym na dwie linie i wskakiwały w jedną Geistem
  (widoczne na klatkach filmu z pomiaru PSI). Teraz: fonty
  z `public/fonts` własnym `@font-face` + jawny preload w layoucie
  (React hoistuje do `<head>`; `crossorigin` obowiązkowy, bo pobrania
  fontów są CORS-owe). **CLS = 0 na wszystkich czterech pomiarach.**
  To NIE jest nawrót BLAD-001 (tam winne były klasy CSS pakietu
  `geist` różne między serwerem a klientem; tu klas nie ma, a pakiet
  dalej blokuje `straznik-fontow`).
- **Korekta metryk zastępnika była martwa na Linuksie**: twarze
  fallbacku od next/font stały wyłącznie na `local(Arial)`, którego
  na Linuksie (w tym na serwerach pomiarowych Google) nie ma — tekst
  zastępczy renderował się o 8–11% węższy (zmierzone), więc dojazd
  Geista poszerzał bloki i Chrome rejestrował nowego kandydata LCP
  w chwili podmiany. `local()` dostał też **Liberation Sans**
  (metryczny bliźniak Ariala): geometria zastępnika = geometria
  Geista na każdej platformie.
- **Impuls wordmarku stopki udawał największą treść strony**: animacja
  chodziła od załadowania (stopka 4 ekrany niżej), a jej pierwszy
  przelot przez maskę tekstową Chrome rejestrował jako kandydata LCP
  o rozmiarze 183 600 px² — stąd LCP obu stron przybite do ~2,2 s na
  elemencie, którego nikt nie widział. Teraz `IntersectionObserver`
  FooterScene (ta sama bramka, która od 0.24.0 trzyma prewarm pyłu)
  ustawia `data-na-ekranie`, a CSS wstrzymuje animację
  (`animation-play-state: paused`) i zdejmuje malowanie grupy
  maskowanej (`visibility: hidden`), dopóki stopka nie wejdzie
  w widok. Bez JS bramki nie ma — dekoracja działa jak dotąd; przy
  porażce hydratacji wyłącznik 4 s przywraca całość. Zmierzone
  w przeglądarce: paused/hidden na górze, running/visible przy
  stopce, z powrotem paused po odjeździe.
- **Weryfikacja deploya była ślepa na zmiany w chunkach** (trzeci
  przedstawiciel klasy „weryfikacja ślepa na artefakt", drugi w samym
  skrypcie weryfikacji): nazwy chunków w tej wersji Next NIE pochodzą
  z treści, więc zmiana samego CSS dawała HTML bajt w bajt identyczny
  z poprzednim deploymentem — porównanie jednego pliku przechodziło
  przeciw STAREMU buildowi, a edge cache Pages (`max-age=600`) oddawał
  starą treść i **pomiar PSI zmierzył poprzednią wersję strony**.
  Wykryte, bo mobilne LCP nie drgnęło co do milisekundy po naprawie,
  która musiała je ruszyć. `sprawdz-zywy.mjs` porównuje teraz stronę
  wejściową ORAZ KAŻDY chunk (zapytania znaczone parametrem omijają
  krawędzie CDN — dowodzą stanu originu); protokół pomiaru nakazuje
  odczekać ≥10 minut po deployu.

### Dodane

- **`tools/pomiar-psi.mjs`** — pomiar na serwerach Google (klucz
  w `.env` jako `PAGESPEED_KLUCZ`), mediana z 5 przebiegów, zapis do
  `goldeny/pomiary-lighthouse.json` z datą i warunkami; kolumna SEO
  osobno z builda `SEO_INDEKSOWANIE=1` (nasz `noindex` zaniża ją o 31%
  kategorii), golden notuje to jawnie. Zmierzone: **SEO 100/100 na
  wszystkich czterech stronach × trybach, zero niezaliczonych audytów.**
- **`tools/pomiar-lighthouse.mjs`** — wariant lokalny do szybkiej pętli
  przy optymalizacji (lokalny Lighthouse mierzy także maszynę: ta sama
  strona dawała TBT 96–257 ms zależnie od obciążenia laptopa — do
  tabeli wchodzi wyłącznie PSI).
- **`straznik-progow`** — liczba w tabeli README musi zgadzać się co do
  jednostki z zapisanym przebiegiem; wiersz z myślnikami znaczy
  „niezmierzone" i niczego nie twierdzi; golden bez wiersza w tabeli
  = błąd (wynik istnieje, dokumentacja go ukrywa). Sprawdzony testami
  negatywnymi w obie strony.
- **Smoke'i pilnują fontów jako artefaktu** (lekcja miniatur OG
  z 0.24.0): `smoke-podglad` sprawdza w każdym publicznym HTML-u dwa
  RÓŻNE preloady fontów z `crossorigin`, z basePath i z plikiem
  istniejącym pod dokładnie tym adresem ze znacznika; `smoke-d4` to
  samo w trybie serwerowym. Oba potwierdzone testem negatywnym
  (preload→prefetch wywala oba).
- **Sekcja „Pomiar wydajności i SEO — protokół" w README przepisana**
  o lekcje sesji: PSI zamiast lokalnego Lighthouse'a, spokojna maszyna
  przy pętli lokalnej, deploy weryfikujący chunki, odczekanie ≥10 min
  po deployu, mediana z 5, tabela tylko z goldenu.

### Zmienione

- **Animacja `page-enter` tylko przy nawigacji klienckiej** (naprawa
  NO_FCP z 8986ec8, decyzja właściciela: fade przy pierwszym wejściu
  zostaje usunięty): `.page-enter` opakowuje całą treść od
  `opacity: 0`, a strona kursu nie ma poza nim żadnej treści — Chrome
  wstrzymuje animacje CSS w niewidocznym dokumencie i PSI zgłaszał
  NO_FCP („strona nie namalowała treści") na serwerach Google. Po
  naprawie strona kursu: 4/4 udane przebiegi desktop, wydajność 100.
  Obalony przy okazji komentarz w kodzie: `template.tsx` NIE remontuje
  się przy nawigacji w tej wersji Next, więc fade przejścia i tak nie
  działał — rozpoznanie nawigacji po `data-hydrated` (flaga modułowa
  nie przeżywa podziału na chunki).
- **Stopka liczy pył dopiero w widoku** (`prewarm()` FooterScene za
  bramką IntersectionObservera; dowód licznikiem jasnych pikseli:
  stary kod 237→261, nowy 0→252 po przewinięciu) i **impuls wordmarku
  chodzi tylko w widoku** (wyżej).
- **`app/icon.svg`** — bez niej przeglądarka pytała o `/favicon.ico`
  w korzeniu domeny (poza basePath) i dostawała 404; jedyny ubytek
  „dobrych praktyk": 96 → **100**.
- **Opisowe `alt` okładek** (tytuł Z BAZY — kursy z kreatora dostaną
  je same) i **tytuł katalogu 24 → 54 znaki** (obie usterki zgłosił
  audyt zewnętrzny; tytuł żyje w `app/szkolenia/widok.tsx`, layout ma
  tylko wartość domyślną).
- **Fonty przeniesione `assets/fonts` → `public/fonts`** (muszą być
  serwowane): nota SIL OFL jedzie z plikami, `straznik-licencji`
  i mutacja w audycie strażników patrzą na nową ścieżkę, odnośniki
  w dokumentacji zaktualizowane.

### Decyzje właściciela (2026-08-19)

- Fade przy pierwszym wejściu: **usunięty świadomie** (przy nawigacji
  i tak nie działał; naprawa NO_FCP go wymagała).
- Fonty: **self-hosting + preload** (wygląd bez zmian) zamiast
  `font-display: optional` (ryzyko pierwszej wizyty bez Geista).
- Mobile 96–97: **przyjęte jako artefakt symulacji** — warunek „100
  w każdej kolumnie" złagodzony; obserwowane LCP ~450 ms, wszystkie
  realne usterki naprawione pomiarem.

## [0.24.0] — 2026-08-19

Krok 1 planu domknięcia Pluginu 1, **część 2 z 3: SEO na stronie**.
Przed tym wpisem podstrona nie miała ANI JEDNEGO tagu OpenGraph, ani
jednego adresu kanonicznego, żadnego `robots.txt`, sitemapy ani danych
strukturalnych — sprawdzone w zbudowanym HTML-u, nie założone. Pomiary
Lighthouse'em są częścią 3; tu powstaje to, co będzie mierzone.

### Dodane
- **`lib/seo.ts`** — jedno miejsce rozstrzygające, GDZIE ta wersja stoi
  i CZY wolno ją indeksować. Kanonik, OpenGraph, `robots.txt`, sitemapa
  i JSON-LD muszą mówić o tym samym adresie; rozjazd między nimi to
  błąd bez objawu.
- **Adresy kanoniczne i OpenGraph** na katalogu i stronach kursów,
  `metadataBase` w układzie strony.
- **`app/robots.ts` i `app/sitemap.ts`** — generowane, nie pisane ręcznie,
  żeby nie mogły rozjechać się z metatagiem `robots`. Sitemapa czyta te
  same kursy co katalog. **Bez `lastModified`**: kuszące `new Date()`
  mówiłoby „treść się zmieniła" po każdym buildzie, także gdy zmienił
  się sam CSS — a to zmyślanie, tyle że w metadanych.
- **Miniatury Open Graph** (`next/og`): jedna wspólna dla korzenia
  i katalogu, **własna dla każdego kursu** — z tytułem, poziomem, liczbą
  lekcji, czasem materiału i ceną, wszystko z bazy. Bez nich każdy
  wklejony link wyglądał identycznie.
- **JSON-LD** — największy nieodrobiony zysk SEO dla sklepu z kursami:
  `Organization`, `BreadcrumbList`, `ItemList` (katalog), `Course`
  z `syllabusSections` i `hasCourseInstance`, `Offer` oraz `FAQPage`.
  Budowane z TEGO SAMEGO obiektu, który renderuje stronę.
- **`straznik-seo`** (19. strażnik, 6 niezmienników) + **6 mutacji**.
- **`tools/smoke/smoke-seo.ts`** w CI — sprawdza ZBUDOWANE pliki:
  kanonik = własny adres, dokładnie jeden `h1`, komplet OG, obraz OG
  istnieje na dysku, a **cena, tytuł i liczba modułów w danych
  strukturalnych zgadzają się z bazą**.
- **`tools/og-rozszerzenie.mjs`** — patrz „Naprawione".
- **Protokół pomiaru w README** wraz z pustą tabelą wyników. Myślniki
  znaczą „niezmierzone", nie „zero"; liczby wejdą z zapisanego przebiegu
  Lighthouse'a w części 3.

### Naprawione
- **Miniatury OG szłyby w świat jako `application/octet-stream`.**
  Konwencja `opengraph-image.tsx` przy `output: "export"` produkuje plik
  BEZ rozszerzenia, a hosting statyczny dobiera typ po rozszerzeniu —
  scrapery Facebooka, LinkedIna i X-a wymagają `image/*`, więc link
  poszedłby bez miniatury przy w pełni poprawnie wyglądającej stronie.
  Lekcja przejęta z repo strony głównej (tam zweryfikowana na żywym
  adresie); `tools/og-rozszerzenie.mjs` dokłada `.png` i przestawia
  odwołania w HTML-u ORAZ w ładunkach RSC.
- **Katalog `/szkolenia` nie dostawał miniatury w ogóle** — konwencja
  plikowa Next NIE dziedziczy się w dół, więc obraz z `app/` obsłużył
  korzeń, ale nie trasę potomną. Wykryte przy oglądaniu zbudowanego
  HTML-u. Rysunek wydzielony do komponentu, dwie cienkie trasy nad nim.
- **Liczebnik na miniaturze kursu odmieniany ręcznie** („41 lekcji")
  — poprawne dla 41, błędne dla 22. Przeszło przez `straznik-odmiany`,
  bo nie było ternarem. Teraz przez `lib/odmiana.ts`.

### Zmienione
- `robots: { index: false }` przestało być wpisane na sztywno w układzie
  strony — decyduje przełącznik `INDEKSOWANIE` z `lib/seo.ts`, wspólny
  dla metatagu, `robots.txt` i sitemapy. **Domyślnie nadal NIE
  indeksujemy.** `SEO_INDEKSOWANIE=1` służy dziś do jednego: zmierzenia
  kolumny SEO w Lighthousie, którą `noindex` punktowo zaniża.
- `app/robots.ts` i `app/sitemap.ts` mają `dynamic = "force-static"` —
  `output: "export"` wymaga tego jawnie. Ta sama wartość pasuje do trybu
  serwerowego, a przy wyłączonym indeksowaniu sitemapa NIE dotyka bazy,
  więc `npm run build` nadal przechodzi bez Postgresa (sprawdzone
  buildem z martwym adresem bazy).

### Świadome decyzje
- **`Offer.availability` = `PreOrder`, nie `InStock`.** Zakup jest dziś
  placeholderem prowadzącym do kontaktu — płatności przychodzą
  z Pluginem 2. `InStock` byłoby deklaracją, że da się kupić od ręki.
  Smoke pilnuje tej wartości; zmieniamy ją w tym samym kroku, w którym
  ruszy koszyk.
- **Miniatury OG bez firmowego kroju.** Satori nie czyta woff2, a my
  mamy subsety Geista właśnie w tym formacie. Krój systemowy jest
  kompromisem na obrazku podglądu, nie w identyfikacji.

## [0.23.0] — 2026-08-19

Krok 1 planu domknięcia Pluginu 1, część pierwsza: **tryb podglądu
statycznego**. Cel właściciela to SEO i wydajność mierzone narzędziami
Google na ŻYWYM adresie, a `/szkolenia` nie dawało się tam wystawić —
wszystkie trasy czytały bazę przy żądaniu, kreator stoi na ciastku,
a repo jest prywatne (Pages z prywatnego repo = plan płatny). Ten wpis
zdejmuje tę przeszkodę. Samego SEO i pomiarów tu jeszcze NIE MA — to
osobne kroki, żeby dowód każdego z nich dało się ocenić z osobna.

Decyzje właściciela na starcie kroku 1: publikujemy do nowego
**publicznego** repo `MatthewPlugins/szkolenia-podglad`; podgląd chodzi
z `noindex` (z zastrzeżeniem, że tabela pomiarów w README ma to
odnotować — patrz „Znane ograniczenia"); mierzymy na treści ROBOCZEJ,
a pomiary powtórzymy po złożeniu finalnych kursów w kreatorze.

### Dodane
- **Dwa tryby budowania z jednego kodu** (`next.config.ts`): serwerowy
  (bez zmian — Plugin 1 tak działa naprawdę) oraz podgląd statyczny
  `npm run build:podglad` → `out/`, z katalogiem i stronami kursów
  wyrenderowanymi **z bazy w czasie builda**. Rozdziela je
  `pageExtensions`: trasy tylko-serwerowe nazywają się `*.serwer.*`,
  warianty prerenderowane `*.statyczny.*`, a każdy tryb widzi wyłącznie
  swoje. Kreator i jedyny AJAX w eksporcie **nie istnieją** — nie ma
  trasy, nie ma pliku, nie ma czego wyciec.
- **`lib/podglad.ts`** — jedno źródło prawdy o trybie plus `zasob()`:
  Next poprawia `basePath` w `next/link` i imporcie statycznym, ale NIE
  w zwykłym `src`, a okładki kursów przychodzą ścieżką Z BAZY.
- **`tools/deploy-podglad.sh`** (`npm run deploy:podglad`) — publikacja
  wyłącznie zbudowanego `out/` do publicznego repo, ręcznie (limit minut
  Actions organizacji jest wyczerpany do 1 września). Skrypt ODMAWIA
  pracy z brudnego drzewa i przy leżącej bazie.
- **`tools/sprawdz-zywy.mjs`** — „wysłałem pliki" to nie to samo co
  „strona działa": czeka, aż żywy adres zacznie serwować DOKŁADNIE ten
  build, porównując treść **bajt w bajt** (Pages serwuje pliki statyczne
  bez obróbki — zmierzone: 99 232 B po obu stronach). Pierwsza wersja
  szukała identyfikatora buildu wzorcem `/_next/static/<coś>/` i była
  **dziurawa**: wzorzec pasował do słowa `chunks`, takiego samego
  w każdym buildzie Next, więc weryfikacja potwierdzała jedynie, że pod
  adresem stoi jakakolwiek strona Next. Złapane przy pierwszej realnej
  publikacji, po tym, jak skrypt wypisał „✔ ten build (chunks)".
- **`straznik-podgladu`** (18. strażnik) + **4 mutacje** w audycie —
  pięć niezmienników, w tym ten najważniejszy: brama kreatora musi
  odciąć się w podglądzie PRZED sięgnięciem po ciastko.
- **`tools/smoke/smoke-podglad.ts`** w CI — buduje własny eksport
  **celowo z `KREATOR_TOKEN` w środowisku** (czyli w warunkach, w których
  zepsuta brama wpisałaby nieopublikowane kursy do publicznych plików)
  i sprawdza, że szkic nie wyciekł, kreatora i AJAX-a nie ma, a `basePath`
  dochodzi też do zasobów z bazy. Test negatywny potwierdził, że smoke
  umie zapalić się na czerwono.

### Naprawione
- **`straznik-ajax` przechodziłby PUSTO** po zmianie nazwy endpointu na
  `route.serwer.ts` — jego wzorzec nazwy szukał wyłącznie `route.ts`,
  więc nie znalazłby ani jednego endpointu i wyglądałby dokładnie tak
  samo jak wtedy, gdy naprawdę nie ma nic do zgłoszenia. Wzorzec
  rozszerzony, sprawdzony testem negatywnym (drugi endpoint → czerwony).
- **Korzeń `/` w eksporcie oddawał stronę błędu Reacta.** `redirect()`
  wymaga serwera, ale w eksporcie **nie psuje builda** — cicho produkuje
  `out/index.html` z `__next_error__`. Wariant podglądu przekierowuje
  nagłówkiem `refresh` i daje zwykły odnośnik pod spodem; smoke sprawdza
  korzeń wprost.
- Linki w CHANGELOG-u do przeniesionych plików (`app/szkolenia/page.tsx`
  → `widok.tsx`, `route.ts` → `route.serwer.ts`) — treść wpisów bez
  zmian, poprawione wyłącznie cele odnośników.

### Zmienione
- Konfiguracja segmentu tras rozeszła się na cienkie łuski
  (`page.serwer.tsx` / `page.statyczny.tsx`) nad wspólnym `widok.tsx`.
  Powód jest twardy: kompilator Next parsuje `dynamic`,
  `dynamicParams` i `generateStaticParams` **statycznie** i odrzuca
  nawet zwykły warunek („can't recognize the exported `dynamic` field…
  It needs to be a static string"). Pierwsze podejście — jeden plik
  z warunkiem — nie skompilowało się; drugie, z `connection()` zamiast
  `dynamic`, skompilowało się, ale dodanie `generateStaticParams`
  przestawiło stronę kursu z `ƒ` na `●` (SSG) i `cookies()` z bramy
  kreatora zaczęło wywracać render błędem `DYNAMIC_SERVER_USAGE`.
  Dopiero rozdział na warianty przywrócił **identyczną** tablicę tras
  trybu serwerowego; potwierdzają to smoke'i D4/D5/D6.

### Opublikowane
- Podgląd żyje pod
  [matthewplugins.github.io/szkolenia-podglad/szkolenia](https://matthewplugins.github.io/szkolenia-podglad/szkolenia)
  (publiczne repo `MatthewPlugins/szkolenia-podglad`, gałąź `gh-pages`).
  Sprawdzone na żywym adresie: strony publiczne 200, kreator 404,
  `/api/szkolenia` 404, nieznany slug 404, okładki 200, tytuły kursów
  zgodne z bazą.

### Znane ograniczenia
- **`noindex` obniża wynik SEO w Lighthousie** (audyt „Page is blocked
  from indexing" jest punktowany). Pomiar rozejdzie się więc na dwa:
  wydajność/dostępność/dobre praktyki i Core Web Vitals na żywym
  adresie z `noindex`, a SEO na buildzie bez niego. Tabela w README
  dostanie kolumnę „warunki pomiaru" — inaczej byłaby prawdziwa
  liczbowo i myląca w treści.
- Podgląd **nie ma nagłówków bezpieczeństwa** — `output: "export"` nie
  wspiera `headers()`, a Pages i tak by ich nie wysłał. Prototyp
  serwerowy ma je bez zmian (dowodzi smoke D4). To znany koszt
  podglądu, nie regres.
- `robots: noindex` siedzi jeszcze na sztywno w `app/layout.tsx` —
  przełącznikiem stanie się w części SEO, razem z `robots.ts`,
  `sitemap.ts`, kanonicznymi adresami i JSON-LD.

## [0.22.0] — 2026-08-19

Dopracowanie repo po domknięciu treści D7 (decyzja właściciela:
najpierw porządek w repo i przekazanie wiedzy, potem kursy w narzędziu).
Wzorce przeniesione z przeglądu repo strony głównej `automatic-ai`
(v3.1.0) — jako IDEE dopasowane do naszej architektury (serwer + baza),
nie kopie: pełna mapa przeglądu i ranking lekcji w opisie PR.

### Naprawione
- **Monogram „MP" w paskach kursu i kreatora** (zgłosił właściciel) —
  ostatnia pozostałość po rebrandingu MatthewPlugins → Automatic AI
  (PR #20 podmienił navbar, stopkę i metadane, ale nie przycisk powrotu
  w dwóch pływających paskach). Teraz oba renderują sygnet
  `AutomaticMark`. Sprawdzone na żywej stronie: zero „MP" w HTML.
- **README kłamało w trzech miejscach**: tabela strażników wymieniała
  13 z 16, moduł 1 miał „następny krok: treść obu kursów" (kompletna
  od 0.21.0), a CI rzekomo „testy dojdą od Działu 2" (jest ich 36).
  Naprawione — a przeciw nawrotom patrz `straznik-readme` niżej.

### Dodane
- **Nagłówki bezpieczeństwa z serwera** (`next.config.ts`): nosniff,
  `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'` (kreator
  chodzi na ciastku — to obrona przed clickjackingiem), Referrer-Policy,
  Permissions-Policy. Strona główna musi wstrzykiwać CSP w HTML po
  buildzie (GitHub Pages nie daje nagłówków); my mamy serwer, więc
  przenieśliśmy IDEĘ, nie implementację. **Smoke D4 sprawdza nagłówki
  na produkcyjnym `next start`** — konfiguracja bez dowodu to deklaracja.
- **`docs/security-checklist.md`** — lista kontrolna bezpieczeństwa
  i SEO z pięciostanową legendą (✅ z dowodem / 🟡 / 🔧 poza repo /
  ⛔ nie dotyczy Z POWODEM / ⏳ etap WP). Struktura ze strony głównej,
  wypełnienie ODWROTNE: u nich backend „fizycznie nie istnieje",
  u nas istnieje i wymaga pokrycia. Sekcja 8 = gotowa specyfikacja
  bezpieczeństwa wtyczki WP (zbiera wszystkie ⏳).
- **`npm test` jedną komendą**: pretest `tools/db1-gotowa.mjs` sam
  podnosi kontener bazy, gdy port milczy; port czyta z
  docker-compose.yml i rozmawia wyłącznie z podmanem — pierwszą wersję,
  która czytała konfigurację aplikacji, słusznie zatrzymał
  `straznik-granic` (WYTYCZNE §8 obronione przed własnym narzędziem).
- **CI oszczędza minuty organizacji** (po sierpniowym wyczerpaniu
  limitu 2000 min — 1753 zużyła strona główna): `cancel-in-progress`,
  job „Zakres zmian" (zwykły `git diff`, bez akcji zewnętrznych) pomija
  build i smoke'i przy commitach czysto treściowych, `timeout-minutes`
  na każdym jobie. Strażnicy i skan sekretów chodzą ZAWSZE.
- **README po liftingu**: spis treści, sekcja „Skrypty" (komendy
  opisane pytaniem, na które odpowiadają), sekcja „SEO
  i bezpieczeństwo" (haczyk tylko tam, gdzie stoi strażnik/test/smoke),
  „Szybki start (nowa maszyna, od zera)" z weryfikacją zdrowia
  maszyny, ramki TIP/NOTE niosące historie realnych błędów
  (maskowanie kodów wyjścia potokiem, limit minut Actions).

### Zapisane decyzje właściciela (2026-08-19)
- porządek gałęzi dopiero PO ukończeniu Pluginu 1;
- właściciel NIE nagrywa wideo — kursy powstaną w narzędziu (kreator
  przejmie lekcje i nagrania; sposób produkcji materiału do osobnej
  propozycji z opcjami); B7 = ocena GOTOWYCH kursów.

## [0.21.0] — 2026-08-18

> [!WARNING]
> **Odstępstwo od reguły „czerwony check = STOP" (WYTYCZNE §1), decyzja
> właściciela 2026-08-18.** Ta wersja została zmergowana i otagowana przy
> CZERWONYM CI, bo CI **nie ruszył**: organizacja `MatthewPlugins` jest na
> planie Free (2000 minut Actions/miesiąc na repozytoria prywatne) i w
> sierpniu zużyła **2072 minuty** — z czego 1753 spaliło repo strony
> głównej `automatic-ai`, a nasze 253. Po przekroczeniu limitu każde
> zadanie pada 2 sekundy po starcie, z zerem kroków i bez logów. Limit
> odnawia się **1 września 2026**.
>
> W zamian pracę CI odtworzono LOKALNIE, kod wyjścia sprawdzany bez potoku
> (`node skrypt | tail` maskuje kod wyjścia — lekcja z Działu 5):
> strażnicy **16/16**, testy **36/36**, `npm run lint` czysto,
> `npm run build` przechodzi, smoke **D4/D5/D6** zielone. Dowód wisi
> w komentarzu przy PR #22. Jedyne, czego nie odtworzono lokalnie, to
> **skan sekretów (gitleaks)** — do potwierdzenia, gdy CI wróci.

### Dodane
- **TREŚĆ DZIAŁU 7 KOMPLETNA — 91 z 91 scenariuszy nagrań** (Kurs 1
  „Jak poprawnie korzystać z Claude": 6 modułów / 41 lekcji; Kurs 2
  „Jak poprawnie używać GitHuba": 7 modułów / 50 lekcji). W tej wersji
  domykają dział **trzy ostatnie moduły Kursu 2**:
  - **Moduł 5 „Automatyzacja: GitHub Actions" — 7 scenariuszy**
    (czym są Actions, pierwszy workflow, continuous integration,
    anatomia workflow, zmienne i konteksty, sekrety, continuous
    deployment). Cytaty: `cytowane/github--modul-5.md`.
  - **Moduł 6 „Bezpieczeństwo konta i kodu" — 6 scenariuszy**
    (2FA, klucze SSH, katalog funkcji bezpieczeństwa, włączanie ich
    w repozytorium, Dependabot, secret scanning). Cytaty:
    `cytowane/github--modul-6.md`.
  - **Moduł 7 „Ponad podstawy" — 5 scenariuszy** (GitHub CLI, GitHub
    Pages, Codespaces, wyszukiwanie, Discussions). Cytaty:
    `cytowane/github--modul-7.md`.
- **Golden treści obu kursów** (`goldeny/d7-tresc.json`
  + `straznik-goldenu-tresci`) — ochrona przed **cichą** utratą tekstu.
  Dla każdej lekcji suma kontrolna i cztery miary (bajty, wiersze,
  sceny, wiersze tabeli zgodności); strażnik pokazuje różnicę per pole
  („sceny: 9 → 7 (−2)"). Regeneracja wymaga podania powodu, więc golden
  jest zarazem dziennikiem zmian treści. Stan zapisany: **91 lekcji,
  506 scen, 1917 wierszy zgodności, 1307 kB**.
- **`straznik-odsylaczy-kursu`** — pilnuje wierności **własnemu
  kursowi**, a nie dokumentacji producenta: (A) odsyłacz „lekcja N.M"
  wskazuje lekcję, która istnieje w tym kursie; (B) zdanie mówiące
  o module nie wymienia tematu należącego do innego modułu. Mapa
  tematów powstaje z pól `lekcja:` w metrykach, więc aktualizuje się
  razem z kursem.
- **`tools/wyciag-zrodla.mjs`** — odchudza plik dokumentacji do prozy,
  tabel i jednego przykładu kodu na sekcję (wycina blobki SVG, odsyłacze
  do zrzutów, powtórzone warianty `<div class="ghd-tool …">`, ten sam
  przykład w ośmiu językach). Na źródłach modułu 4 Kursu 2: −38%.
  Każde cięcie zostawia ślad w stopce pliku.
- **`straznik-scenariuszy`** — mechaniczna kontrola każdego scenariusza:
  kompletna metryka zgodna ze ścieżką pliku, istnienie plików z `zrodla:`
  i niepustego pliku z `cytowane:`, obecność pięciu wymaganych sekcji,
  minimum 8 wierszy tabeli „Zgodność ze źródłem", przynajmniej jeden
  znacznik `[NARRACJA]`.

### Zmienione
- **Tryb produkcji treści: RÓWNOLEGŁY** (decyzja właściciela
  2026-08-18) — moduły 4, 5, 6 i 7 Kursu 2 powstały brefem agenta
  głównego + falami subagentów piszących po jednej lekcji.
  **Ani razu nie zaszedł warunek powrotu do trybu ręcznego**; oceny
  wszystkich czterech modułów wg czterech sygnałów jakości i koszty:
  `tresc-kursow/POSTEP.md`. Briefy modułów zostają w repo jako dowód
  produkcji i punkt odniesienia przy ocenie.
- **Plik cytatów powstaje osobnym przebiegiem subagenta PO całym module
  i jest traktowany jako DRUGA BRAMKA JAKOŚCI**, nie jako porządki —
  autor cytatów szuka zdania w oryginale, więc widzi, czego tam nie ma.
  Moduł 6: 4 wyłapane usterki, moduł 7: 10 (w tym 286 zweryfikowanych
  wierszy tabel zgodności co do numeru akapitu).
- **Cienkie źródła z programu (poniżej ~4 kB) uzupełniane plikami, które
  same wskazują jako dalszą lekturę** — w module 7 dotyczyło to czterech
  lekcji z pięciu (`about-codespaces.md` ma 785 B i jest samym spisem
  odsyłaczy): 23 pliki źródłowe zamiast 7 z programu. Dopisane ścieżki
  lądują w `zrodla:` i w tabeli zgodności.

### Naprawione
- **Nowa klasa usterki: wierność własnemu kursowi.** Finał Kursu 2
  (lekcja 7.5) streszcza siedem modułów i przypisał trzy tematy do
  złych: `.gitignore` modułowi 3 (jest w 2.4), gałęzie chronione
  modułowi 4 (są w 3.5), konflikty scalania modułowi 2 (są w 4.8).
  Nie łapał tego żaden strażnik ani tabela zgodności, bo to nie jest
  teza ze źródła. Naprawione, a przeciw nawrotom stoi
  `straznik-odsylaczy-kursu` (testy negatywne: łapie wszystkie trzy
  pomyłki, w tym wariant eliptyczny „Czwarty — jedenaście lekcji…",
  oraz odsyłacz do nieistniejącej lekcji). Audyt całego korpusu przed
  napisaniem strażnika: 0 martwych odsyłaczy w 91 scenariuszach.
- **Dziewięć usterek treści modułu 7** z przebiegu cytatów: dwie tezy
  bez pokrycia w źródle, dwa zgubione zawężenia (restart z karty
  przeglądarki tylko przy pracy w przeglądarce; rozszerzenia
  z Marketplace tylko w desktopowym VS Code albo kliencie webowym),
  trzy nieprecyzyjne wskazania w tabelach zgodności, dwa uogólnienia
  szersze niż źródło.
- **BLAD-008: artefakt narzędzia zapisu w 31 plikach treści** —
  wyczyszczone, strażnik przeciw nawrotom w `straznik-scenariuszy`
  (pomija bloki kodu, bo tam te znaczniki bywają treścią promptu).
- **`straznik-linkow` pomija bloki kodu i kod inline** — scenariusze
  uczące składni Markdowna zawierają przykłady `[tekst](sciezka)`, które
  nie są klikalnymi odsyłaczami. Sprawdzone testem negatywnym: prawdziwy
  martwy odsyłacz w prozie nadal wywala strażnika.

## [0.20.0] — 2026-08-18

### Dodane
- **Kurs 2 / Moduł 4 „Współpraca: issues i pull requesty" — 11 scenariuszy**
  (GitHub flow w zespole, issues i ich zakładanie, czym jest i jak się
  tworzy pull requesta, prośba o przegląd i praca z uwagami, robienie
  przeglądu, konflikty scalania, merge/squash/rebase, forki, wiązanie
  PR-a z issue). Cytaty źródłowe:
  `docs/dokumentacja-techniczna/d7/cytowane/github--modul-4.md`.
  **Stan treści D7: 73 z 91 scenariuszy (80%).**
- **Pierwszy moduł napisany trybem RÓWNOLEGŁYM** (decyzja właściciela
  2026-08-18). Przebieg: brief całego modułu z granicami tematów
  i callbackami → trzy fale subagentów (4 + 4 + 3), każdy pisze jedną
  lekcję → przelot spójności agenta głównego. Pierwsza fala została
  obejrzana PRZED puszczeniem kolejnych — wada systemowa nie miałaby
  jak powielić się na jedenaście lekcji. Brief zostaje w repo
  (`tresc-kursow/jak-uzywac-githuba/modul-4/BRIEF-modulu.md`), bo to on
  jest powodem, dla którego równoległe lekcje składają się w kurs.
  Ocena wg czterech sygnałów jakości i decyzja o kontynuowaniu trybu:
  `tresc-kursow/POSTEP.md`, sekcja „Jak wypadł moduł 4".

### Naprawione
- **BLAD-008: artefakt narzędzia zapisu w 31 plikach treści.** Pliki
  kończyły się dwiema liniami-śmieciami `</content>` i `</invoke>` —
  większość scenariuszy Kursu 2 (moduły 1–3), moduł 6 Kursu 1 i pięć
  plików cytatów źródłowych. Zgłosili to niezależnie dwaj subagenci
  piszący lekcje 4.7 i 4.9, którzy podglądali format w sąsiednich
  plikach — czyli artefakt zaczynał się już PROPAGOWAĆ do nowej treści.
  Wyczyszczone wszystkie 31; jedno wystąpienie `</content>` w lekcji 6.5
  Kursu 1 zostaje świadomie, bo jest w bloku kodu jako część szablonu
  promptu. Strażnik przeciw nawrotom: `straznik-scenariuszy` łapie te
  znaczniki w prozie scenariusza i w pliku cytatów, pomijając bloki kodu
  (sprawdzone testem negatywnym w obie strony).

## [0.19.0] — 2026-08-18

### Dodane
- **`tools/wyciag-zrodla.mjs`** — odchudzacz źródeł dokumentacji.
  Zostawia prozę, tabele i JEDEN przykład kodu na sekcję; wycina blobki
  `<svg>` ikon (jedna ikona to ~1,5 tys. znaków ścieżek wektorowych
  wklejonych w środek zdania), odsyłacze do zrzutów ekranu, powtórzone
  warianty tej samej instrukcji (`<div class="ghd-tool webui|cli|mac|…">`)
  i ścieżki wewnętrznych odsyłaczy (tytuł zostaje w cudzysłowie).
  Na źródłach modułu 4 Kursu 2: 104 kB → 64 kB (**−38%**; najbardziej
  zaśmiecone pliki −62%). Po co: od tego modułu lekcje pisze kilku
  subagentów RÓWNOLEGLE, więc każdy bajt śmiecia mnoży się przez liczbę
  agentów. Narzędzie niczego nie streszcza ani nie przepisuje — każde
  cięcie zostawia ślad w tekście albo w stopce pliku, bo cichy skrót
  byłby gorszy od braku narzędzia: agent nie wiedziałby, że czyta wersję
  niepełną.
- **`straznik-scenariuszy`** — mechaniczna kontrola KAŻDEGO scenariusza
  lekcji: kompletna metryka zgodna ze ścieżką pliku, istniejący
  i niepusty plik z `cytowane:`, istniejące pliki z `zrodla:`, komplet
  pięciu sekcji, przynajmniej jedna narracja do kamery oraz tabela
  „Zgodność ze źródłem" z minimum 8 wierszami. To warunek bezpieczeństwa
  dla pracy równoległej: w trybie ręcznym jeden agent widział wszystkie
  lekcje po kolei, w równoległym nie widzi ich nikt — więc część „na oko"
  zamieniamy na czerwone CI. Sprawdzony testami negatywnymi na każdej
  gałęzi (brak tabeli, tabela za krótka, martwy plik cytatów, rozjazd
  numeru modułu, brak `zrodla:`, scenariusz bez `[NARRACJA]`). Kontrola
  istnienia plików z `zrodla:` włącza się tylko wtedy, gdy dokumentacja
  jest rozpakowana lokalnie — w CI jej nie ma z założenia (55 MB poza
  gitem), a strażnik mówi wprost, że tę część pominął.

### Naprawione
- **13 scenariuszy wskazywało plik z cytatami, którego nie ma.** Moduły 1
  i 3 Kursu 1 pokazywały na `cytowane/claude-platform--pricing.md`,
  `cytowane/claude-code--pamiec.md` i podobne, podczas gdy cytaty zostały
  po drodze scalone do plików per moduł. Usterka niewidoczna gołym okiem
  i dokładnie tego rodzaju, po który powstał `straznik-scenariuszy`: bez
  niej po roku nie dałoby się sprawdzić, skąd wzięła się teza, bez
  pobierania 55 MB źródeł. Wskazania poprawione, a brakujące cytaty do
  lekcji 1.6 (słowniczek) dopisane jako `cytowane/claude-platform--glossary.md`.
- **Trzy tabele „Zgodność ze źródłem" były płytsze niż materiał lekcji**
  (K1/M1/L1, K1/M2/L1, K1/M5/L1 — 5–7 wierszy przy kilkunastu tezach
  w narracji). Uzupełnione o tezy, które w lekcjach padają, a w tabeli
  ich nie było: pola odpowiedzi API (`content` jako lista bloków,
  `stop_reason`, `usage`), rozbicie rodziny modeli i dwóch dróg budowania
  na osobne wiersze, trzy warunki wstępne prompt engineeringu.

## [0.18.0] — 2026-08-18

### Dodane
- **Źródła Działu 7 pobrane: 2219 stron oryginalnej dokumentacji**
  (WYTYCZNE §7 i N2) — Anthropic `claude-platform` 566/566
  i `claude-code` 187/187 (komplety), GitHub 1466 artykułów.
- **`tools/pobierz-dokumentacje-d7.mjs`** — idempotentny skrypt
  odtwarzający komplet źródeł jedną komendą. Tempo celowo wolne
  (2 wątki, przerwy, honorowanie `Retry-After`): pierwsze podejście
  szło 6 wątkami i `docs.github.com` odrzuciło HTTP 429 połowę
  z 2800 żądań, zostawiając dokumentację dziurawą — a to gorsze niż
  jej brak, bo nie widać, czego brakuje. Zakres GitHuba zapisany
  w kodzie (`SEKCJE_GITHUBA`), więc rozszerzenie kursu to dopisanie
  sekcji i ponowne uruchomienie.
- **`straznik-wagi-dokumentacji`** — pilnuje, żeby masa dokumentacji
  producentów nie weszła do gita, także przez `git add -f`.
  Zweryfikowany testami negatywnymi (obie gałęzie: pliki masowe
  i przekroczony budżet wagi).

### Zmienione
- **Gałąź domyślna repozytorium: `main` → `plugin-1-sklep-kursow`**
  (decyzja właściciela). GitHub renderuje stronę repozytorium z gałęzi
  domyślnej, a `main` stoi na wersji 0.3.4 — 34 commity w tyle, sprzed
  rebrandingu i bez podglądu katalogu. Odwiedzający widział projekt
  sprzed miesiąca pracy. Reguła PLAN.md §5 zostaje nienaruszona: na
  `main` nadal nic nie wchodzi przed ukończeniem Pluginu 1, a `main`
  jest od teraz CELOWO nieaktualny i nie jest źródłem prawdy o stanie
  projektu. Po domknięciu modułu: merge na `main` i powrót domyślnej.
- **Dokumentacja Działu 7 zostaje LOKALNIE, poza repozytorium**
  (decyzja właściciela). To 55 MB i ~2200 plików, a git przechowuje
  każdą wersję na stałe — raz wpuszczone ciążyłyby każdemu klonowaniu
  już zawsze, a odkręcenie wymagałoby przepisania historii. Do repo
  wchodzi to, co czyni źródła weryfikowalnymi: `ZRODLA.md` (z zakresem
  i uzasadnieniem cięć), skrypt odtwarzający i strażnik. Sens wytycznej
  zachowany: agent pracuje na oryginale, nie na pamięci modelu.
  WYTYCZNE N2 dostały doprecyzowanie „dokumentacja wielkiej skali"
  (próg 8 MB) — wytyczna powstała przy działach o kilkunastu plikach.
- **Zakres dokumentacji GitHuba przycięty: 3192 → 1466 stron.**
  Odpadły sekcje spoza kursu: `copilot` (551 — konkurencyjne narzędzie
  AI, o pracy z AI uczy kurs 1), `rest`/`graphql`/`apps` (428 — API dla
  autorów integracji), how-tos i reference GitHub Advanced Security
  (~390 — funkcje na licencji, których kursant nie ma) oraz rozliczenia,
  regulaminy i programy (~440). Uzasadnienie każdego cięcia w `ZRODLA.md`.
- `straznik-linkow` pomija `docs/dokumentacja-techniczna/` — to
  dosłowna dokumentacja producentów, a jej linki są absolutne względem
  serwisu źródłowego (`/en/webhooks/…`), więc jako ścieżki w repo nigdy
  nie istnieją. „Naprawienie" ich znaczyłoby zmienić oryginał, czego
  WYTYCZNE N2 zabraniają. Zweryfikowany testem negatywnym: martwy link
  w NASZEJ dokumentacji nadal zatrzymuje commit.

### Naprawione
- **BLAD-007: podgląd strony głównej wynosił link do prywatnego
  localhosta.** Klon repo strony głównej miał lokalną, NIEcommitowaną
  zmianę `data/navigation.ts` (wpis „Szkolenia" → `localhost:3001`),
  zapisaną wcześniej w CLAUDE.md jako bezpieczną, „bo nic nie
  pushujemy". Tymczasem `scripts/deploy.sh` buduje z KATALOGU
  ROBOCZEGO, nie z commitów — zmiana trafiła do statycznego eksportu
  i została wypchnięta na publiczne GitHub Pages, gdzie stała na
  wszystkich 215 stronach (navbar jest na każdej). Zgłosił właściciel.
  Naprawa: zmiana schowana do stasha (nie skasowana), publikacja
  ponowiona z czystego drzewa, zweryfikowana na żywym adresie
  (0 wystąpień na stronie głównej i podstronach). W CLAUDE.md sposób
  podglądu zastąpiony ZAKAZEM zostawiania jakichkolwiek zmian
  w klonie — podgląd podstrony żyje wyłącznie w tym repo.

## [0.17.1] — 2026-08-18

### Zmienione
- **Zapis decyzji zespołu: produkcja na WordPressie** (hosting
  + domena zamiast VPS/Node.js). PLAN.md dostał sekcję „DECYZJA
  ZESPOŁU 2026-08-18": kod Next.js D1–D6 to prototyp-specyfikacja,
  po Dziale 7 sklep zostanie przepisany na wtyczkę WP (PHP + MySQL)
  z migracją danych z PostgreSQL skryptem; zasady WYTYCZNYCH
  obowiązują w wersji WP bez zmian. Kolejność zatwierdzona przez
  właściciela: najpierw D7 (treść w prototypie), potem etap WP.
  README: wiersze Produkcja/Stack opisują prototyp i cel osobno.
  Przed startem etapu WP do repo trafi celowany komplet oryginalnej
  dokumentacji WordPressa i MySQL (WYTYCZNE N2).

## [0.17.0] — 2026-08-18

### Zmienione
- **Rebranding: MatthewPlugins.pl → Automatic AI** — w ślad za stroną
  główną (repo `MatthewPlugins/matthewplugins.pl` przemianowane na
  `MatthewPlugins/automatic-ai`, PR #84 tamtego repo; organizacja
  GitHuba zostaje `MatthewPlugins`). W podstronie: nowe logo w navbarze
  (sygnet `components/brand/AutomaticMark.tsx` skopiowany 1:1 ze strony
  głównej + napis „Automatic AI"), wordmark stopki `AUTOMATIC AI`
  na szynie zasilającej, copyright, metadane (`layout.tsx`,
  `/szkolenia`), pasek adresu w mockupie `OknoKursu`, adresy CTA
  i stopki na domenę docelową `automaticai.pl` (jak `data/site.ts`
  strony głównej — domena przed startem, sociale to placeholdery),
  placeholdery kreatora, seedy autora oraz cała dokumentacja
  (README, PLAN, CONTRIBUTING, BRIEF, CLAUDE.md).

### Dodane
- **Podgląd w README**: zrzut katalogu `/szkolenia`
  (`docs/zrzuty/podglad-szkolenia.png`) podlinkowany do
  `http://localhost:3001/szkolenia` + skrót komend startu.

## [0.16.2] — 2026-08-17

### Naprawione
- **„Sekcji strony nie mogę nigdzie dodać"** (zgłosił właściciel przy
  ocenie kreatora). Panel działał poprawnie — kurs miał już komplet
  12 rodzajów, więc przycisk „Dodaj" nie miał się gdzie pojawić — ale
  nigdzie tego nie mówił. Zakładka sekcji ma teraz nagłówek
  tłumaczący zasadę (lista niżej to komplet rodzajów, jakie potrafi
  pokazać strona; każdy występuje raz) i licznik stanu: „na stronie:
  11/12 · do dodania: 1" albo „masz komplet 12/12 — nie ma już czego
  dodać". Rodzaj zdjęty ze strony jest wprost oznaczony („nie ma jej
  na stronie") obok przycisku „Dodaj".
- Pomiar w przeglądarce potwierdził pełny cykl: komplet → kosz →
  „Dodaj" wraca i licznik schodzi na 11/12 → dodanie wraca na 12/12.

## [0.16.1] — 2026-08-17

Naprawy z przeglądu kodu całego Działu 6 (przed bramką B6). Zgodnie
z zasadą właściciela: **każdy błąd dostaje strażnika albo test**, żeby
nie miał jak wrócić.

### Naprawione
- **BLAD-005 — pole ceny kasowało wpis w trakcie pisania.** Kontrolka
  była sterowana wartością przeliczoną z groszy, więc stan pośredni
  („199,") wracał jako pusty string, `Number("")` dawało 0 i pole samo
  czyściło wpis: ceny z groszami były nie do wpisania, a kurs mógł
  zostać zapisany za 0 zł. Przeliczanie wydzielone do
  `components/kreator/cena.ts` (`naGrosze` oddaje `null` dla stanu
  w połowie pisania — zapisanej ceny wtedy nie ruszamy), przecinek
  równoważny kropce. **Test**: runda grosze → tekst → grosze.
- **BLAD-006 — dyspozytor przyjmował treść sekcji niezgodną z jej
  rodzajem.** Kształt `content` sprawdzała dopiero strona (safeParse),
  więc zapis „przechodził", a sekcja po cichu znikała ze strony bez
  słowa wyjaśnienia. Teraz `SekcjaWejscie` waliduje treść schematem
  swojego rodzaju i zwraca **ścieżkę do konkretnego pola**; kreator
  tłumaczy pozycję w tablicy na rodzaj sekcji i przeskakuje na
  właściwą zakładkę. **Test**: odrzucenie hero bez obietnicy ze
  ścieżką `kurs.sections.0.content.obietnica`.
- **Slug: nie dało się wpisać myślnika** — pełna normalizacja przy
  każdym znaku ucinała końcowy myślnik, więc „moj-kurs" stawało się
  „mojkurs". Przy pisaniu działa łagodniejsza normalizacja, porządki
  robią się przy opuszczeniu pola i przy zapisie.
- **Sekcja świeciła „gotowa", a zapis padał** — zaczęte pole
  opcjonalne (np. link autora z etykietą, bez adresu) nie było liczone
  jako brak. Teraz jest: puste w całości pozostaje opcjonalne, zaczęte
  musi być dokończone.
- **Zły kształt treści w bazie wysadzał edytor** (500 na
  `.map` nie-tablicy), czyli rekordu nie dało się naprawić z panelu.
  Wczytywanie traktuje JSONB z ograniczonym zaufaniem.
- **Ręczna odmiana liczebników** w nagłówku kreatora („3 w bazie") →
  `lib/odmiana.ts`. Nowy **`straznik-odmiany`** wyłapuje ternary
  odmieniające polskie słowa na piechotę (dwie formy nigdy nie
  wystarczą — polski ma trzy).

### Zmienione
- `npm test` obejmuje teraz także `components/**` i `lib/**` — błędy
  z warstwy panelu (pola formularza) nie były widoczne ani dla testów
  modułu, ani dla smoke'ów.
- Fixtury sekcji w testach D3 poprawione do zgodnych z kontraktem;
  golden `goldeny/d3-odczyt.json` odtworzony świadomie (diff obejmuje
  wyłącznie te dwie sekcje). Sprawdzone, że zaostrzenie nie koliduje
  z seedem właściciela — seed przechodzi na bazie `db1_kursy_test`.

## [0.16.0] — 2026-08-17

Dział 6, krok 3 z 3: podgląd przed publikacją i instrukcja obsługi.
Kreator kompletny — gotowy pod bramkę B6.

### Dodane
- **Podgląd szkicu** — właściciel z ważnym ciastkiem bramy ogląda
  stronę kursu przed publikacją (`/szkolenia/[slug]` przepuszcza wtedy
  szkice), z ostrzeżeniem w rogu: „Szkic — podgląd tylko dla Ciebie".
  Dla gościa ten sam adres to dalej **404**: kanał JSON filtruje po
  statusie, więc nie ma tam treści do wycieku. Smoke D6 pilnuje obu
  stron tej granicy naraz.
- Wejście do podglądu z dwóch miejsc: przycisk „Podgląd" przy każdym
  kursie na liście kreatora (wcześniej tylko przy opublikowanych)
  i „Podgląd strony kursu" w pasku zapisu edytora.
- **[docs/plugin-1/KREATOR.md](docs/plugin-1/KREATOR.md)** — instrukcja
  obsługi panelu dla właściciela: wejście, stany kursu, kolejność
  pracy, czego kreator NIE zrobi (stała kolejność sekcji, okładka jako
  adres pliku, cena w złotówkach) i tabela „gdy coś nie działa"
  z rozwiązaniem błędu „Nieprawidłowy token" po zmianie `.env`.

## [0.15.0] — 2026-08-17

Dział 6, krok 2 z 3: pełna treść kursu z panelu — 12 rodzajów sekcji
sprzedażowych i program (moduły + lekcje).

### Dodane
- **Edytor sekcji sprzedażowych** — wszystkie 12 rodzajów obsługiwane
  JEDNYM komponentem sterowanym opisem pól, nie dwunastoma
  formularzami: `components/kreator/opis-sekcji.ts` mówi, jaka
  kontrolka i etykieta, a kształt treści dalej pilnują schematy Zod.
  Karty w kolejności, w jakiej sekcje pojawiają się na stronie kursu;
  każda ma stan „gotowa" / „brakuje: …" liczony z pól obowiązkowych,
  więc widać braki bez zapisywania. Sekcja bez treści nie trafia na
  stronę.
- **`SCHEMATY_SEKCJI`** w `modules/m1-sklep/typy.ts` — mapa rodzaj →
  schemat treści; jedna prawda dla strony sprzedażowej i kreatora.
  Rodzaj bez wpisu nie skompiluje się.
- **Edytor programu** — moduły i lekcje z kolejnością na strzałki
  (pozycje liczone przy zapisie, więc numeracja nie ma jak się
  rozjechać), czasem lekcji i flagą zapowiedzi; nagłówek liczy moduły,
  lekcje i łączny czas polską odmianą (`lib/odmiana.ts`).
- **Zakładki w edytorze kursu**: Dane podstawowe / Sekcje strony
  (licznik X/12) / Program (moduły/lekcje). Zapis obejmuje całość —
  tablice `sections` i `modules` to pełna podmiana treści (kontrakt
  dyspozytora z D3).
- **`straznik-kreatora`** — pilnuje, że właściciel ma dostęp do
  KAŻDEGO pola, które strona potrafi wyrenderować: rodzaj sekcji bez
  edytora, pole w kontrakcie bez pola w panelu (i odwrotnie) oraz
  rozjazd wymagalności, także w polach zagnieżdżonych (listy obiektów,
  obiekt `link` autora). Zweryfikowany trzema testami negatywnymi.
- **Goldeny D6**: `goldeny/d6-kreator.json` (pełny opis formularza)
  i `goldeny/d6-runda.json` (kurs z KOMPLETEM pól po przejściu przez
  bazę). Testy `kreator-tresc.test.ts` (6) generują przykładową treść
  **z opisu pól**, więc nowe pole automatycznie wchodzi do rundy
  zapis → odczyt — nie da się dołożyć pola, które po cichu ginie.
  Dowód rundy: treść każdej z 12 sekcji wraca z bazy identyczna.
- Logika treści wydzielona do `components/kreator/tresc-sekcji.ts`
  (pusta treść, treść z bazy → formularz, czyszczenie przed zapisem,
  braki) — puste pole opcjonalne nie idzie do bazy, puste obowiązkowe
  idzie i wraca czytelnym błędem przy tym polu.

## [0.14.0] — 2026-08-17

Dział 6 (kreator kursów), krok 1 z 3: brama dostępu, lista kursów
i dane podstawowe. Treść sekcji sprzedażowych i program (moduły +
lekcje) dochodzą w kroku 2.

### Dodane
- **Kreator `/szkolenia/kreator`** — panel treści właściciela w języku
  wizualnym strony (własny pływający pasek `PasekKreatora`, Reveal/
  Cascade, `unos` na kartach): lista WSZYSTKICH kursów z licznikami
  treści liczonymi w bazie (sekcje / moduły / lekcje — zero na
  pomarańczowo, więc od razu widać, czego brakuje), publikacja,
  ukrycie, usuwanie z potwierdzeniem i podgląd strony kursu.
- **Edytor danych podstawowych `/szkolenia/kreator/[id]`** — slug
  (podpowiadany z tytułu, ale tylko dla NOWEGO kursu, żeby edycja nie
  zmieniła adresu opublikowanej strony), tytuł, typ, opis na kartę,
  cena wpisywana w złotówkach (baza trzyma grosze), okładka,
  **badge** i **poziom**. Błędy walidacji z dyspozytora wracają
  przypięte do konkretnych pól.
- **Brama na token** (`lib/kreator-dostep.ts` + akcje serwerowe
  `app/szkolenia/kreator/akcje.ts`): token trafia do ciastka
  **HttpOnly**, więc nie istnieje w JavaScripcie strony; porównanie
  w stałym czasie (`timingSafeEqual`) + kara czasowa za zły token.
  Flaga `Secure` zależy od protokołu żądania, nie od `NODE_ENV` —
  produkcyjny build oglądany na localhoście po http też się loguje.
- **Wejście do kreatora ze stron sklepu** (decyzja właściciela):
  dyskretna pigułka w rogu `/szkolenia` i strony kursu, renderowana
  WYŁĄCZNIE przy ważnym ciastku bramy — gość nie ma jej nawet
  w źródle strony. Na stronie kursu prowadzi wprost do edycji tego
  kursu. To wygoda, nie zabezpieczenie: dostępu pilnuje token.
- **Kanał JSON kreatora**: `szczegolyKursuPoId()` (edycja po id — slug
  bywa właśnie zmieniany) i `listaKursowKreatora()` rozszerzona
  o badge, poziom, datę zmiany i liczniki treści (kontrakt
  `KartaKreatora`).
- **Smoke `tools/smoke/smoke-d6.ts`** (CI, job „baza"): na produkcyjnym
  `next start` dowodzi, że bez ciastka kreator NIE pokazuje szkiców
  i AJAX odpowiada 403, a z ciastkiem przechodzi pełny cykl
  szkic → publikacja → katalog → usunięcie.
- **Testy `modules/m1-sklep/kreator.test.ts`** (6): szkic widoczny dla
  kreatora, liczniki z bazy, edycja po id, zmiana sluga bez gubienia
  kursu, ślad każdej operacji w `course_changelog`.
- Dokumentacja techniczna działu:
  [docs/dokumentacja-techniczna/d6](docs/dokumentacja-techniczna/d6/ZRODLA.md)
  — Server Actions, formularze i `cookies()` skopiowane z pakietu
  `next@16.3.1` (dokładnie ta wersja, na której chodzi aplikacja).

### Naprawione
- **BLAD-004 — pigułka kreatora chowała się pod stopką** (zgłosił
  właściciel). Klasa `.page-enter` opakowująca całą treść strony miała
  animację `opacity` z wypełnieniem `both`; wypełniana animacja stosuje
  swoją wartość także PO zakończeniu, więc kontekst układania zostawał
  na stałe i zamykał w sobie każdy element `position: fixed` z treści —
  stopka (późniejsze rodzeństwo) malowała się na wierzchu, a `z-index`
  nie miał jak pomóc. Wypełnienie zmienione na `backwards`: ten sam
  fade 0,3 s, kontekst znika po animacji. `straznik-fixed` rozszerzony
  o wypełnienia `forwards`/`both` (zweryfikowany testem negatywnym),
  wpis w [rejestrze błędów](rejestr/znane-bledy.json), migawka:
  gałąź `bak/2026-08-17-pigulka-admina-pod-stopka`. Dowód: pomiar
  w przeglądarce (`elementFromPoint` w środku pigułki po zescrollowaniu
  na dół oddaje link kreatora; przed naprawą oddawał DIV stopki).

### Zmienione
- **Dyspozytor sprawdza token PRZED walidacją kształtu** — żądanie bez
  tokenu dostaje `brak-dostepu` (403) zamiast mapy pól kontraktu
  w odpowiedzi `walidacja` (400). Obcy nie dostaje podpowiedzi, jak
  zbudować poprawne żądanie.
- **Jedyny AJAX bierze token z ciastka**, gdy nie ma go w treści
  żądania — endpoint pozostaje jeden (WYTYCZNE §8), a autoryzacja dalej
  należy wyłącznie do dyspozytora.
- `NavbarPrzelacznik` wyłącza globalny navbar na CAŁYM poddrzewie
  kreatora — inaczej lista kursów (pasuje do wzorca `[slug]`) byłaby
  bez navbara, a edycja kursu miałaby dwa paski naraz.

## [0.13.0] — 2026-08-17

### Zmienione
- **Licencja projektu: GPL-2.0 → MIT** (decyzja właściciela). Powód:
  zgodność z repozytorium strony głównej `matthewplugins.pl`, które jest
  na MIT — kod tej podstrony docelowo tam trafia, a przy copyleftcie
  wymagałoby to relicencjonowania. Nic nie wymuszało GPL: projekt nie
  jest pluginem WordPressa (czysty Next.js), a wszystkie zależności
  produkcyjne są permisywne (next/react/pg/zod — MIT, lucide-react —
  ISC). Zmiana objęła `LICENSE`, `package.json`, `package-lock.json`,
  README i wytyczną [WYTYCZNE §3](docs/WYTYCZNE.md) (z zapisanym
  uzasadnieniem decyzji).

### Dodane
- **Licencja fontów obok plików fontów**:
  [public/fonts/LICENSE-Geist-OFL.txt](public/fonts/LICENSE-Geist-OFL.txt)
  — Geist jest na SIL OFL 1.1 i licencja projektu (wcześniej GPL, teraz
  MIT) NIGDY go nie obejmowała; przy redystrybucji plików `.woff2` tekst
  OFL musi jechać razem z nimi. Tekst pobrany z oficjalnego repozytorium
  `vercel/geist-font`.
- `straznik-licencji` przepisany: pilnuje MIT w LICENSE, README
  i `package.json` (metadane pakietu potrafiły zostać po staremu),
  wyłapuje pozostałości „GPL-2.0" w README oraz brak tekstu OFL przy
  plikach fontów. Zweryfikowany testami negatywnymi.

## [0.12.1] — 2026-08-17

**Bramka B5 zaliczona przez właściciela (2026-08-17)** — Dział 5
(katalog + strona sprzedażowa kursu) domknięty; następny krok:
Dział 6 (kreator kursów).

### Naprawione
- **Pasek menu kursu znikał po zescrollowaniu w dół** (zgłosił właściciel
  przy B5; rejestr: **BLAD-003**). Przyczyna nie była w samym pasku:
  `@keyframes page-enter` animowały `transform`, a klasa `.page-enter`
  z [app/template.tsx](app/template.tsx) opakowuje CAŁĄ treść podstrony —
  element z animowanym transformem staje się układem odniesienia dla
  `position: fixed` potomków, więc pasek i tło strony kursu były
  przypięte do treści zamiast do okna. Navbar z layoutu działał
  poprawnie (stoi poza `template`), co maskowało źródło.
  Naprawa: przejście między podstronami animuje wyłącznie `opacity`.
  Pomiar w headless Firefoxie: przed naprawą pasek po scrollu miał
  `top: -9353px`, po naprawie `top: 0` przy `scrollY: 9353`.
- Przy okazji wraca do poprawnej pracy poświata tła strony kursu
  (`TloKursu`) — również `position: fixed`.

### Dodane
- `tools/straznicy/straznik-fixed.mjs` — blokuje powrót
  `transform`/`filter`/`perspective` do klatek i reguł klasy
  opakowującej treść (strażników jest teraz 10); zweryfikowany testem
  negatywnym (po przywróceniu starego CSS zgłasza błąd i zwraca 1).
- Wpis **BLAD-003** w [rejestr/znane-bledy.json](rejestr/znane-bledy.json);
  migawka sprzed naprawy: gałąź `bak/2026-08-17-pasek-fixed-transform`
  (procedura WYTYCZNE §1).

## [0.12.0] — 2026-08-17

Trzy poprawki wg feedbacku właściciela do B5 (nagłówek pozycjonowania,
sekcja Prowadzący, sekcja Dołącz).

### Zmienione
- **Nagłówek sekcji „Pozycjonowanie" bez wyszarzenia**: pierwsza linia
  szła w `text-steel` i czytała się jak przezroczysty efekt — teraz obie
  linie pełnym kolorem (druga akcentem volt).
- **Sekcja „Prowadzący" rozbudowana** ([SekcjaAutor](components/kurs/SekcjaAutor.tsx)):
  dwukolumnowy układ — wizytówka z bio i **cytatem „dlaczego zrobiłem
  ten kurs"**, obok **czym zajmuje się na co dzień** (chipy) i atuty
  jako osobne karty z kaskadą; link do portfolio. Kontrakt `TrescAutor`
  + opcjonalne `cytat`, `czym_sie_zajmuje`, `link {url, etykieta}`.
- **Sekcja „Dołącz" mocno wyeksponowana** ([SekcjaCena](components/kurs/SekcjaCena.tsx)):
  wychodzi z rytmu strony — własne tło (grid + dwa dryfujące gradienty),
  ramka volt, nagłówek „Co dokładnie dostajesz za X zł?" z realnymi
  liczbami z bazy; lewa kolumna to **pełne punkty pakietu z opisami**,
  prawa to sticky karta oferty: badge „Pełny dostęp", cena 5–6xl, lista
  **„w cenie"**, zdanie domykające, CTA pełnej szerokości i link
  powrotny do programu; pod spodem kotwica cenowa i gwarancja obok
  siebie. Kontrakt `TrescPakiet` + opcjonalne `w_cenie`, `domkniecie`.
- **Treść obu kursów rozbudowana** (robocza, bez zmyślonych warunków):
  pakiety z konkretnymi opisami (6 pozycji na kurs), mocniejsze kotwice
  cenowe, po 6 punktów „w cenie" (dostęp od razu, materiały od
  pierwszego dnia, aktualizacje bez dopłat, dostęp bez limitu, kontakt,
  gwarancja) oraz rozbudowane wizytówki prowadzącego.

## [0.11.0] — 2026-08-17

Poprawki Course Detail System wg feedbacku właściciela do B5
(5 punktów: czcionka/typografia, FAQ, pasek menu kursu, dłuższy
program, animacje premium).

### Dodane
- **Pasek menu KURSU** ([PasekKursu](components/kurs/PasekKursu.tsx)
  przeprojektowany): na stronie kursu globalny navbar ZNIKA
  ([NavbarPrzelacznik](components/NavbarPrzelacznik.tsx)), zamiast
  niego pływająca pigułka widoczna OD WEJŚCIA — znacznik „MP"
  (powrót do katalogu), zakładki sekcji z podświetleniem aktywnej
  (IntersectionObserver) i CTA „Dołącz"; bez JS pasek stoi (to jedyna
  nawigacja strony kursu), animowany wjazd.
- **Żywe tło strony kursu** ([TloKursu](components/kurs/TloKursu.tsx)):
  poświata podążająca za kursorem (jedna pętla rAF, transform-only)
  + dwa dryfujące bloby (keyframes CSS) pod całą treścią.
- **Animacje premium** (globals.css): hover-lift kart `.unos`
  (uniesienie + glow), płynne otwieranie akordeonów
  (`interpolate-size` — progressive enhancement), micro-interaction
  CTA (uniesienie przy hover, dociśnięcie przy kliknięciu), dryf
  gradientów `.dryf-a/.dryf-b`, wjazd paska `.pasek-wjazd`; wejścia
  Reveal/Cascade (fade + slide-up ze staggerem) we WSZYSTKICH
  sekcjach strony kursu; całość wyłączana przez
  `prefers-reduced-motion`.
- **Polska odmiana liczebników** ([lib/odmiana.ts](lib/odmiana.ts)):
  „2 moduły · 4 lekcje · 48 min materiału" zamiast „2 modułów ·
  4 lekcji · 0.8 h materiału" — katalog (karty + HUD), hero kursu
  i sekcja programu.

### Zmienione
- **FAQ rozbudowane do 10 pytań-obiekcji na kurs** (wzorzec stron
  kursowych: dostęp od kiedy/na jak długo, ile czasu zajmie, „czy
  dam radę", różnica vs darmowe materiały, bezpieczeństwo danych,
  aktualizacje, gwarancja) — treść ROBOCZA, spójna z resztą oferty.
- **Program znacznie dłuższy** (treść ROBOCZA pod szczegółowe
  omówienie tematów): kurs Claude 7 modułów / 31 lekcji (~6,5 h),
  kurs GitHub 6 modułów / 26 lekcji (~5 h); pakiety i korzyści
  zaktualizowane do nowych liczb.
- Golden `d5-program.html` odtworzony (Cascade + odmiana w programie);
  `d4-katalog.html` bez zmian.

## [0.10.0] — 2026-08-17

Course Detail System wg wiążącego briefu właściciela
([docs/plugin-1/BRIEF-STRONA-KURSU.md](docs/plugin-1/BRIEF-STRONA-KURSU.md),
B5 iteracja 3): strona kursu = premium product page + sales page + mini
sklep, złożona z reusable komponentów.

### Dodane
- **Reusable Course Detail System — [components/kurs/*](components/kurs/)**
  (16 komponentów): `Wspolne` (Etykieta, CtaZakupu, szkielet sekcji),
  `HeroKursu` (badge z realnymi liczbami z bazy, obietnica, „dla kogo",
  cena, 2 CTA, OknoKursu), `PasekKursu` (sticky nawigacja po scrollu:
  kotwice + aktywna sekcja z IntersectionObservera + CTA; progressive
  enhancement — bez JS strona kompletna), `SekcjaProblem` (wstęp-empatia
  + PROBLEM → ROZWIĄZANIE → REZULTAT), `SekcjaKorzysci`, `SekcjaPakiet`
  (+ kotwica cenowa), `SekcjaProgram` (akordeon z czasem modułów),
  `SekcjaPlatforma` („tak wygląda produkt po zakupie" — OknoKursu
  z prawdziwych danych), `SekcjaPozycjonowanie` (to NIE jest / to JEST),
  `SekcjaDlaKogo`, `SekcjaTransformacja` (przed / po), `SekcjaOpinie`,
  `SekcjaAutor`, `SekcjaCena` („ZA X ZŁ OTRZYMUJESZ ✓…" + gwarancja
  przy cenie + link powrotny do programu), `SekcjaPorownanie`
  (samodzielna nauka vs kurs, nieagresywnie), `SekcjaFaq` (+ kontakt
  pod FAQ), `FinalCta`. Kolejność sekcji = psychologia scrolla briefu;
  sekcje bez treści w bazie znikają, numeracja liczy się dynamicznie.
- Kontrakty: `SzczegolyKursu` + `badge`/`level` (hero pokazuje poziom),
  `TrescHero` + opcjonalne `dla_kogo`.
- Utility `scrollbar-none` (pas kotwic sticky nav na mobile).
- Smoke D5 sprawdza dodatkowo: sekcję `problem` (kind z migracji 005
  przechodzi całą drogę baza → strona), sticky nawigację i sekcję #cena.

### Zmienione
- **[app/szkolenia/[slug]/page.tsx](app/szkolenia/[slug]/page.tsx)** —
  przebudowana na CIENKĄ kompozycję komponentów `components/kurs/*`
  (cały markup sekcji wyniesiony do komponentów).
- **Katalog: karty RÓWNE** (decyzja właściciela — bez karty wyróżnionej):
  jedna `Karta` w siatce `md:grid-cols-2`, pełny opis bez ucinania,
  CTA „Sprawdź ofertę" na każdej karcie.
- Seedy: dłuższe opisy kart „dlaczego my, a nie inni"; oba kursy mają
  komplet sekcji CDS (problem/positioning/transformation/comparison,
  kurs GitHub dodatkowo for_whom/package/author/opinions/guarantee/faq)
  — treść ROBOCZA, bez zmyślonych danych (opinie = jawny placeholder).
- Goldeny odtworzone po zmianie markupu: `d3-odczyt.json` (badge/level
  w szczegółach), `d4-katalog.html` (karta równa), `d5-program.html`
  (program w szkielecie sekcji CDS).

## [0.9.0] — 2026-08-17

Redesign premium podstrony szkoleń wg briefu właściciela (B5, iteracja 2):
„digital product experience", nie podstrona informacyjna.

### Zmienione
- **Katalog [/szkolenia](app/szkolenia/widok.tsx) przeprojektowany od zera**:
  - hero z dwukolumnowym układem: mocny headline („Szkolenia, które
    zamieniają AI w przewagę."), dwa CTA (Poznaj szkolenia / Zobacz,
    co dostajesz) i HUD z PRAWDZIWYMI liczbami z bazy (produkty,
    moduły, lekcje, godziny);
  - **wizual produktu zamiast pustki**: mockup okna kursu zbudowany
    z realnych danych ([OknoKursu](components/szkolenia/OknoKursu.tsx)
    — sidebar modułów, lekcje, paski postępu) + floating cards
    (prompt z biblioteki, gwarancja 30 dni);
  - **interaktywność** ([HeroMotion](components/szkolenia/HeroMotion.tsx)):
    światło spotlight za kursorem, parallax 3 warstw, floaty — jedna
    pętla rAF, transform-only, `prefers-reduced-motion` wyłącza całość,
    bez JS treść kompletna;
  - pas tematów marquee (wzorzec strony głównej);
  - sekcja **„Nie kupujesz kolejnego kursu. Dostajesz gotowy system
    pracy."** — sticky statement + mockup i 6 warstw systemu
    (01 Wiedza → 06 Materiały) wjeżdżających kaskadą;
  - **katalog premium**: karta wyróżniona (najnowszy produkt na całą
    szerokość) + siatka; karty z okładką (hover-zoom), numerem /01,
    badge z bazy, typem, metadanymi z bazy (moduły · lekcje · godziny ·
    poziom), ceną i CTA.
- **Strona kursu**: nowe sekcje **„Pakiet"** (co dokładnie dostajesz +
  kotwica cenowa) i **„Prowadzący"**; „Dla kogo" dostała uczciwą kolumnę
  „a NIE jest, jeśli…"; numeracja sekcji liczona dynamicznie.

### Dodane
- Migracje: `003-rodzaje-sekcji` (kinds `package`, `author`),
  `004-karta-katalogu` (kolumny `badge`, `level`); dyspozytor i kreator
  zapisują nowe pola; kanał JSON `listaKursow` zwraca statystyki liczone
  w bazie (moduły/lekcje/czas).
- Okładki SVG w języku Volt ([public/okladki/](public/okladki/)) —
  robocze, do podmiany kreatorem w D6.
- Kontrakty Zod: `KartaKatalogu`, `TrescPakiet`, `TrescAutor`,
  `nie_dla` w `TrescDlaKogo`.
- Goldeny odtworzone świadomie: schemat d2 (nowe kolumny), karta
  katalogu d4 (nowa karta), program d5 (dynamiczna numeracja).

## [0.8.1] — 2026-08-17

Naprawy z pierwszej oceny B5 (procedura WYTYCZNE §1: migawka
`bak/2026-08-17-hydratacja-fontow` → branch fix → rejestr → strażnik).

### Naprawione
- **BLAD-001 — błąd hydratacji na każdej stronie**: pakiet `geist`
  generował różne klasy CSS fontów na serwerze i kliencie. Fonty idą
  teraz z lokalnych subsetów woff2 przez `next/font/local`
  ([lib/fonts.ts](lib/fonts.ts) + [public/fonts/](public/fonts/)) —
  wzorzec 1:1 ze strony głównej; pakiet `geist` usunięty. Nawrotów
  pilnuje nowy **straznik-fontow** (zakaz importu `geist` i zależności
  w package.json).
- **BLAD-002 — testy kasowały dane dev**: `npm test` robił
  `DROP SCHEMA` na wspólnej bazie `db1_kursy` — po testach katalog
  świecił pustką, a strony kursów dawały 404. Testy przełączają się
  teraz na osobną bazę `db1_kursy_test`
  ([modules/m1-sklep/db/testowa-baza.ts](modules/m1-sklep/db/testowa-baza.ts))
  z bezpiecznikiem: operacje niszczące wyłącznie na bazie `*_test`.
- Oba błędy w [rejestr/znane-bledy.json](rejestr/znane-bledy.json)
  (klasa/dowód/skutek/naprawa/strażnik).

## [0.8.0] — 2026-08-17

Dział 5 Pluginu 1 — strona sprzedażowa `/szkolenia/[slug]`
(bramka B5: golden HTML + smoke; czeka na ocenę właściciela; po
akceptacji 🏷 release).

### Dodane
- **Strona sprzedażowa** ([app/szkolenia/[slug]/page.tsx](app/szkolenia/[slug]/page.tsx))
  w pełni z bazy (kanał JSON `szczegolyKursu`): hero z obietnicą
  (sekcja `hero`) + cena i CTA od pierwszego ekranu → korzyści →
  **program z akordeonem modułów i lekcji** (czas trwania, badge
  „podgląd"; `<details>` — zero JS) → dla kogo → opinie → cena+CTA →
  gwarancja → FAQ → domykające CTA. Sekcje o złym/nieobecnym `content`
  są pomijane (safeParse), nie wysadzają strony; nieistniejący slug → 404.
  CTA zakupu = placeholder do Pluginu 2 (prowadzi do kontaktu);
  napis w 1. osobie („Dołączam…") wg analizy wzoru.
- **Kontrakty treści sekcji** (Zod, [modules/m1-sklep/typy.ts](modules/m1-sklep/typy.ts)):
  TrescHero/Korzysci/DlaKogo/Opinie/Gwarancja/Faq — kreator (D6)
  dostanie gotowe schematy.
- **Analiza wzoru sprzedażowego**
  [docs/plugin-1/WZOR-STRONA-SPRZEDAZOWA.md](docs/plugin-1/WZOR-STRONA-SPRZEDAZOWA.md)
  (claudedlafirm.pl — inspiracja, nie kopia): checklista wzorców
  perswazji dla treści kursów w D7.
- **Smoke test D5** ([tools/smoke/smoke-d5.ts](tools/smoke/smoke-d5.ts)):
  pełny kurs seedem → produkcyjny serwer → hero/korzyści/program/cena/
  FAQ obecne, 404 dla śmieci, **golden sekcji programu**
  [goldeny/d5-program.html](goldeny/d5-program.html); podpięty w CI.
- **Seed przykładów** ([tools/seed/seed-przyklady.ts](tools/seed/seed-przyklady.ts),
  `npm run db1:seed`): dwa docelowe kursy właściciela (decyzja
  2026-08-17) z treścią ROBOCZĄ do oceny wyglądu — „Jak poprawnie
  korzystać z Claude" (pełne sekcje) i „Jak poprawnie używać GitHuba";
  opinie to jawne placeholdery (bez zmyślonych recenzji). Finalna
  treść powstanie kreatorem w D7 (+ dokumentacja Claude i GitHuba).

### Zmienione
- `zamknijDb1` w publicznym API modułu (skrypty smoke/seed nie sięgają
  już do wnętrza modułu — wymusił straznik-granic).
- Golden katalogu (smoke D4) zawężony do karty kursu smoke — cała
  siatka pękała, gdy lokalna baza miała seedy przykładów.

## [0.7.0] — 2026-08-17

Dział 4 Pluginu 1 — katalog `/szkolenia` renderowany Z BAZY
(bramka B4: golden HTML + smoke test na produkcyjnym serwerze;
czeka na ocenę właściciela na localhost:3001).

### Zmienione
- [/szkolenia](app/szkolenia/widok.tsx): siatka kart czyta kursy z bazy
  kanałem JSON działu (`listaKursow()`, tylko opublikowane) — koniec
  placeholderów; karta: okładka (lub siatka „blueprint"), badge typu,
  cena z `Intl` (PLN), opis, CTA „Sprawdź ofertę" → `/szkolenia/[slug]`;
  pusty stan „Katalog w przygotowaniu"; strona dynamiczna
  (`force-dynamic` — bez zapiekania listy w buildzie).

### Dodane
- [app/not-found.tsx](app/not-found.tsx) — 404 w języku Volt
  (nieistniejące kursy wracają do katalogu).
- **Smoke test D4** ([tools/smoke/smoke-d4.ts](tools/smoke/smoke-d4.ts)):
  seed przez dyspozytor → produkcyjny `next start` → katalog zawiera
  kurs, cenę i link → **golden markupu siatki**
  [goldeny/d4-katalog.html](goldeny/d4-katalog.html) → sprzątanie.
  Podpięty w CI (job „baza": build + smoke).
- Dokumentacja techniczna D4 (WYTYCZNE N2) w
  [docs/dokumentacja-techniczna/d4/](docs/dokumentacja-techniczna/d4/):
  pobieranie danych, cache/rewalidacja, tryby renderowania, not-found,
  next/image + ZRODLA.md.

## [0.6.0] — 2026-08-17

Dział 3 Pluginu 1 — dyspozytor (bramka B3: testy zielone, goldeny JSON,
straznik-ajax potwierdza jeden kanał, audyt CRUD w changelogu).

### Dodane
- **Kanał JSON** (odczyt serwerowy — [modules/m1-sklep/odczyt.ts](modules/m1-sklep/odczyt.ts)):
  `listaKursow` (katalog, tylko opublikowane), `szczegolyKursu`
  (pełny kurs z sekcjami/modułami/lekcjami), `listaKursowKreatora`;
  wyjście walidowane Zod-em.
- **Dyspozytor — JEDEN AJAX** ([modules/m1-sklep/dyspozytor.ts](modules/m1-sklep/dyspozytor.ts)):
  akcje `zapisz` (insert/edycja + pełna podmiana sekcji i modułów),
  `usun`, `publikuj` — każda w osobnej transakcji z aktorem audytu
  (`app.actor`); usuwanie jawnie od dołu, żeby każdy wpis changelogu
  znał kurs; walidacja Zod na wejściu (czytelne błędy: `walidacja`,
  `brak-dostepu`, `nie-znaleziono`, `duplikat`); dostęp tymczasowo
  tokenem `KREATOR_TOKEN` (pełny auth da Plugin 3).
- **Endpoint HTTP** [app/api/szkolenia/route.serwer.ts](app/api/szkolenia/route.serwer.ts) —
  jedyny AJAX pluginu (POST), cienka warstwa nad dyspozytorem, bez SQL.
- **Kontrakty Zod** ([modules/m1-sklep/typy.ts](modules/m1-sklep/typy.ts)):
  karty/szczegóły kursu, akcje jako `discriminatedUnion`, typy TS
  wyprowadzane ze schematów.
- **straznik-ajax** — w app/api może istnieć tylko jeden endpoint na
  moduł i żaden endpoint-sierota (WYTYCZNE §8).
- **Testy B3** ([modules/m1-sklep/dyspozytor.test.ts](modules/m1-sklep/dyspozytor.test.ts),
  razem 15/15): walidacja, token, zapis z audytem wszystkich tabel,
  duplikat sluga, publikacja, edycja z podmianą modułów, usuwanie +
  **golden odpowiedzi JSON** [goldeny/d3-odczyt.json](goldeny/d3-odczyt.json);
  testy biegną sekwencyjnie (`--test-concurrency=1`, wspólna baza).
- Dokumentacja techniczna D3 (WYTYCZNE N2) w
  [docs/dokumentacja-techniczna/d3/](docs/dokumentacja-techniczna/d3/):
  Next.js Route Handlers (reference + guide), Zod 4 (podstawy, API,
  błędy) + ZRODLA.md.
- `.env.example`: `KREATOR_TOKEN` (sekret lokalnie w `.env`).

## [0.5.0] — 2026-08-17

Dział 2 Pluginu 1 — baza `db1_kursy` (bramka B2: testy dowodzą, że
migracje wstają od zera i triggery logują każdą operację; golden schematu).

### Dodane
- **Baza db1_kursy w kontenerze** ([docker-compose.yml](docker-compose.yml),
  postgres:17-alpine; lokalnym silnikiem jest podman — `npm run db1:up`);
  [.env.example](.env.example) z `DB1_URL` (sekrety tylko w ignorowanym `.env`).
- **Migracje czystym SQL** ([modules/m1-sklep/db/migrations/](modules/m1-sklep/db/migrations/)):
  `001-tabele.sql` — courses, course_sections, course_modules,
  course_lessons, course_changelog (wg ERD z DIAGRAMU) + indeksy;
  `002-triggery-audytu.sql` — wspólna funkcja `m1_audyt()` na WSZYSTKICH
  czterech tabelach treści (create/update/delete → stan przed/po w JSONB,
  aktor z `app.actor`), auto-`updated_at`, changelog niezmienny
  (UPDATE/DELETE/TRUNCATE odrzucane triggerem).
- **Runner migracji** ([modules/m1-sklep/db/migruj.ts](modules/m1-sklep/db/migruj.ts)):
  transakcje per migracja, sha256 w tabeli `_migracje` — zmieniona po
  fakcie migracja zatrzymuje przebieg. Klient puli pg tylko w module
  ([modules/m1-sklep/db/klient.ts](modules/m1-sklep/db/klient.ts)).
- **Testy B2** ([modules/m1-sklep/db/migracje.test.ts](modules/m1-sklep/db/migracje.test.ts),
  `npm test`, node --test): od zera, idempotencja, audyt wszystkich tabel
  (lekcje dostają course_id z lookupu), niezmienność changelogu oraz
  **golden schematu** [goldeny/d2-schemat.json](goldeny/d2-schemat.json)
  (odtworzenie po świadomej zmianie: `GOLDEN_ZAPISZ=1 npm test`).
- **straznik-migracji** — numeracja NNN bez dziur, MANIFEST.json z sha256:
  migracja zmieniona po fakcie nie przejdzie pre-commita ani CI.
- CI: job „Baza db1_kursy" z usługą postgres — `npm test` na każdym PR.
- Dokumentacja techniczna D2 (WYTYCZNE N2) w
  [docs/dokumentacja-techniczna/d2/](docs/dokumentacja-techniczna/d2/):
  CREATE TRIGGER, plpgsql (NEW/OLD/TG_OP), JSONB, CREATE FUNCTION,
  node-postgres (Pool, zapytania parametryzowane), obraz Dockera postgres
  + ZRODLA.md (PostgreSQL 18, pg 8.23).

## [0.4.0] — 2026-08-17

Dział 1 Pluginu 1 — fundament aplikacji (do bramki B1: ocena właściciela
na localhost:3001).

### Dodane
- Szkielet aplikacji **Next.js 16.3.1 + React 19 + TypeScript (strict) +
  Tailwind 4** z serwerem, dev/start na porcie **3001**; wersje i konfiguracja
  zgodne ze stroną główną (tsconfig, ESLint flat config, postcss).
- Design system „Volt" przejęty ze strony głównej ([app/globals.css](app/globals.css)):
  tokeny `@theme` (void/panel/fg/steel/volt/line, fonty Geist, skala typo),
  utilities `container-site`/`bg-grid`/`panel`/maski, efekty CTA.
- Strona [/szkolenia](app/szkolenia/widok.tsx): hero wg wzorca PageHero,
  siatka kart-placeholderów (prawdziwe kursy z bazy od Działu 4), pasek CTA;
  korzeń `/` przekierowuje na `/szkolenia`. Nagłówek wg strony głównej;
  **stopka przejęta 1:1** (uwaga właściciela przy B1): HUD statusu,
  statement, SVG wordmark na szynie zasilającej z impulsem, scena canvas
  „pył danych" (FooterScene), animacje wejść Reveal z wyłącznikiem
  bezpieczeństwa `html.js` i przejścia stron (template.tsx).
- Stub publicznego API modułu ([modules/m1-sklep/index.ts](modules/m1-sklep/index.ts))
  — jedyna przyszła warstwa z dostępem do bazy.
- **straznik-granic** — klient SQL i connection stringi tylko w `modules/`,
  zakaz importów między modułami i importów z bebechów modułu spoza niego
  (BAZA → DZIAŁ → STRONA, WYTYCZNE §8).
- **straznik-ci** — gdy istnieje package.json, CI musi uruchamiać
  npm ci → lint → tsc → build (test dojdzie od Działu 2).
- CI: job „Kod aplikacji" (lint → tsc → build) w [ci.yml](.github/workflows/ci.yml).
- Dokumentacja techniczna D1 (WYTYCZNE N2) pobrana z sieci do
  [docs/dokumentacja-techniczna/d1/](docs/dokumentacja-techniczna/d1/):
  Next.js 16.3.1 (instalacja, layouty, struktura, CSS, fonty) + Tailwind 4.3
  (instalacja w Next.js, `@theme`) + ZRODLA.md (URL, data, wersja).

## [0.3.4] — 2026-08-17

### Dodane
- [CLAUDE.md](CLAUDE.md) — strażnik ciągłości kontekstu: auto-ładowany
  w każdej sesji, wskazuje dokumenty źródłowe, twarde zasady i NASTĘPNY
  KROK; aktualizowany przy każdym kroku zmieniającym stan projektu.
  Uzupełnia goldena przed-clear (pamięć Claude): przed każdym /clear
  sweep rozmowy — decyzje na nośnik trwały, zero strat.

## [0.3.3] — 2026-08-16

### Zmienione
- WYTYCZNE §8 doprecyzowane przez właściciela: AJAX nie musi być jedynym
  kanałem do bazy — obok idzie **kanał JSON** (odczyt serwerowy przy
  renderowaniu: szybciej + SEO). AJAX zostaje JEDEN i obsługuje akcje
  po załadowaniu strony (kreator). Diagram przepływu zaktualizowany.

## [0.3.2] — 2026-08-16

### Dodane
- **WYTYCZNE §8 „Wystrzał"** (nowa wytyczna właściciela): z jednej bazy
  danych idzie tylko JEDEN kanał AJAX — jeden plugin = jeden AJAX;
  dział-dyspozytor jako jedyny rozmawia z bazą i rozdziela JSON stronom.
  Pilnować będzie `straznik-ajax`.

### Zmienione
- Diagram przepływu Pluginu 1: trzy tory zastąpione JEDNYM wystrzałem
  BAZA —AJAX→ DZIAŁ-DYSPOZYTOR —JSON→ 3 strony; Dział 3 to teraz
  dyspozytor (akcje: lista/szczegoly/zapisz/usun/publikuj).

## [0.3.1] — 2026-08-16

### Zmienione
- Diagram przepływu danych Pluginu 1 przerysowany po uwadze właściciela:
  **każdy dział ma własny tor** BAZA —AJAX→ DZIAŁ —JSON→ STRONA i nie
  dotyka torów innych działów; nie istnieje wspólny kanał z bazy do
  wszystkich działów.

## [0.3.0] — 2026-08-16

Diagram Pluginu 1 do oceny właściciela.

### Dodane
- [docs/plugin-1/DIAGRAM.md](docs/plugin-1/DIAGRAM.md) — podział Pluginu 1
  na 7 działów z bramkami jakości B1–B7 po każdym dziale, diagram przepływu
  danych wg zasady **BAZA → DZIAŁ → STRONA** (konwencja
  z mp-offer-automation-suite), schemat ERD bazy `db1_kursy` z changelogiem
  pisanym triggerami, plan dokumentacji technicznej per dział (WYTYCZNE N2)
  i plan nowych strażników (granic, migracji, CI).
- Ustalenie: agenci AI tylko jako bramki jakości (przegląd agent+krytyk
  w B7), codzienna kontrola należy do skryptów — strażników, testów, goldenów.
- Localhost do oceny wyglądu: strona główna z klonu na porcie 3000,
  Plugin 1 będzie na 3001.

## [0.2.0] — 2026-08-16

Wytyczne właściciela + licencja. Nadal bez kodu aplikacji.

### Dodane
- [docs/WYTYCZNE.md](docs/WYTYCZNE.md) — wiążące wytyczne projektu:
  procedura naprawy wstecznej `.bak`, pilnowanie statusów GitHuba,
  goldeny (dla agentów i regresji napraw), weryfikacja co krok,
  pobierana dokumentacja techniczna; zasady nadrzędne: każdy agent
  ma krytyka, każdy dział dostaje oryginalną dokumentację z sieci.
- Licencja **GPL-2.0** ([LICENSE](LICENSE)) + deklaracja w README.
- [rejestr/znane-bledy.json](rejestr/znane-bledy.json) — rejestr realnych
  błędów projektu (schemat klasa/dowód/skutek/test z projektu egzaminacyjnego).
- `straznik-licencji` — LICENSE = GPL v2 i deklaracja w README, na stałe.
- `.gitignore`: pliki `*.bak` nie wchodzą do repo (migawką jest gałąź `bak/…`).

## [0.1.0] — 2026-08-16

Fundament repozytorium — jeszcze bez kodu aplikacji.

### Dodane
- Plan całego projektu ([docs/PLAN.md](docs/PLAN.md)): 3 moduły („pluginy"),
  3 bazy PostgreSQL, decyzje architektoniczne, workflow branchy.
- Workflow Weryfikacja-PR: branch → commit → CI → merge → release
  ([CONTRIBUTING.md](CONTRIBUTING.md)).
- CI (GitHub Actions): strażnicy + skan sekretów gitleaks (binarka przypięta
  po SHA-256).
- Strażnicy (`tools/straznicy/`) z automatycznym podpięciem — runner sam
  znajduje pliki `straznik-*.mjs`:
  - `straznik-wersji` — README deklaruje wersję zgodną z CHANGELOG,
  - `straznik-linkow` — względne linki w Markdown prowadzą do istniejących plików.
- Haki gita (`.githooks/`): pre-commit (blokada sekretów i `.env` + strażnicy),
  pre-push (blokada bezpośredniego pusha na `main`).
- Branch `plugin-1-sklep-kursow` pod przyszłe prace nad modułem 1.
