# Test całości trzech wtyczek — ostatni krok etapu WordPress

**CZYTAĆ PRZED PRACĄ.** To jest dokument roboczy ostatniej pozycji etapu WP
(decyzja właściciela 2026-08-25): czy `aai-sklep`, `aai-platnosci`
i `aai-monitor` **współpracują** i czy projekt trzyma się kupy
architektonicznie. Każda z nich przeszła własny test i własny przegląd
OSOBNO (W6, P6, T4). Nikt nigdy nie sprawdzał ich RAZEM.

Gałąź: **`docs/panel-zostaje-jaki-jest`** (nazwa z pierwszego commita — niesie
też zapis o odwołaniu rozbudowy ekranu). Merge dopiero po zaliczeniu testu
ręcznego (decyzja właściciela 2026-08-31).

## Zakres, zatwierdzony przez właściciela 2026-08-31

| Pytanie | Decyzja |
|---|---|
| Co robimy | **przegląd architektury I test ręczny** (nie samo jedno) |
| Środowisko | **odtworzone OD ZERA**, z zrzutem danych dowodowych i przywróceniem |
| Warsztat motywu `:8890` | **pomijamy** (decyzja z 2026-08-21 zostaje na później) |
| Kto przegląda | **recenzenci-agenci na rozłącznych szwach, agent główny jako krytyk** — żadne znalezisko nie wchodzi bez potwierdzenia URUCHOMIENIOWEGO |

## Jak przebiegł krok

- **E0 — środowisko od zera.** `./postaw.sh --skasuj && ./postaw.sh`, potem
  `wp:import` → `wp:sync` → `wp:zrzuty` → `wp:klient`. **Pierwsze znalezisko
  wypadło już tutaj** (niżej, pozycja 9).
- **E1 — wszystkie bramki.** `npm run check` (strażnicy 37/37, testy 83/83)
  + czternaście bramek WP. Dwie padły — obie z powodu STANU środowiska, nie
  kodu (pozycja 8).
- **E2 — trzej recenzenci** na rozłącznych obszarach: własność danych ·
  szwy i odporność · powierzchnia dla człowieka. Razem **19 znalezisk**;
  każde weryfikowałem sam, uruchomieniowo, przed przyjęciem.

## Weryfikacja znalezisk (werdykty krytyka)

### POTWIERDZONE i NAPRAWIONE

| # | Co | Dowód uruchomieniowy |
|---|---|---|
| 1 | **Wyciek CAŁEGO produktu**: `/?post_type=lesson` oddawało gościowi 73 lekcje prozy (8 stron × 10, 116 kB w jednym `<main>`), to samo kanałem RSS | przed: 8 stron z prozą + 11 wystąpień w RSS; po: 0, 0 i **404** |
| 3 | **Brak JEDNEGO pliku wtyczki = HTTP 500 na całej witrynie** (monitoring i szew płatności) | przed: bez `class-aai-monitor-tabele.php` → **500**; po: brak każdego z 11 plików → **200** |
| 6 | **Każde 404 poza `/szkolenia/` to pusty ekran** (motyw nie ma `404.php`) | `<main>` **24 znaki** na `/cart/`, `/checkout/`, `/courses/x/`; po naprawie **881** i właściwy tekst |
| 5 | **`/product/<slug>/` = druga strona sprzedażowa** kursu w wyglądzie Woo, z ceną i „Dodaj do koszyka" | przed 200, po **301** na `/szkolenia/<slug>/` |
| 7 | **Strażnicy NIE pilnowali zakazu pisania do cudzych tabel**, choć kod to obiecywał | mutacja (zapis Pluginu 2 do tabeli lekcji Pluginu 1) przechodziła **37/37 zielonych**; po naprawie zapala regułę |
| 8 | **Dwie bramki z czternastu przechodziły tylko dzięki śmieciom po ręcznych testach** | `wp-zwroty` padał 2/39 przy zamkniętej sprzedaży; `wp-jezyk` padał, bo na czystej instalacji nie ma konta roli `customer` |
| 9 | **`postaw.sh` nie wstawał OD ZERA** — polskie pliki wtyczek instalowały się, zanim WooCommerce i Tutor w ogóle istniały | przed **kod 1** („Billing address" po angielsku), po **kod 0** w 65 s |
| 10 | `/kontakt` bez ukośnika → 301 | `curl -I` |

### POTWIERDZONE I WYKONANE (decyzje właściciela 2026-08-31)

| # | Co | Jak zamknięte |
|---|---|---|
| 2 | **„Ukryj" odbierało dostęp KUPUJĄCYM**: status `archived` przepisywał 73 lekcje na `private`, klient dostawał **404**, a obie kontrole kończyły **kodem 0** | **C1 zrobione.** Status kopii to dziś DWIE mapy: kurs ukryty zostaje `private`, materiał (moduły, lekcje) zostaje `publish`. Zapowiedzi gasną razem z kursem |
| — | **„Dostęp od razu po zakupie"** przy jedynej włączonej bramce (przelew) | **C3 zrobione.** Strona mówi „Dostęp zaraz po zaksięgowaniu wpłaty"; FAQ tłumaczy to zdaniem. Zmienione w obu bazach, w szablonie WP i w prototypie. **Samo brzmienie jest propozycją agenta — właściciel może je zmienić**, prawdziwość zdania pilnuje bramka, nie jego dokładne słowa |
| — | **Usunięcie kursu, który ktoś kupił**, przechodziło bez pytania | **C2 zrobione.** Panel pyta „ten kurs ma N kupujących — stracą dostęp" i wymaga drugiego kliknięcia; bramka siedzi w warstwie zapisu, więc chroni też komendę |
| 4 | **Po wyłączeniu Pluginu 1 sprzedaż DALEJ DZIAŁA**, a kontrola pisała „Sprzedaż nie działa" i kończyła kodem 0 | **Zrobione.** Kontrola liczy kupowalne produkty i przy niezerowym wyniku kończy **kodem 1**. Zachowania sprzedaży NIE zmieniamy — od zamykania sklepu jest komenda |

**Co zostało zmierzone, a nie wyprowadzone** (przy C1; wszystko w kodzie Tutora):

- `get_enrolled_courses_ids_by_user()` pyta **wyłącznie o wpisy zapisów** — o status
  kursu nie pyta w ogóle, więc „Moje kursy" działa i przy kursie `private`;
- `has_enrolled_content_access()` sprowadza się do `is_enrolled()` — dostęp
  do lekcji jest **niezależny od statusu wpisu**;
- **`Course::enroll_now()` to publiczny handler POST**, który po zalogowaniu
  i nonce'ie zapisuje na KAŻDY kurs niebędący `purchasable` — a kurs zdjęty ze
  sprzedaży taki właśnie jest (`price_type = free`). Zatrzymuje go **wyłącznie
  status `private`**; `draft` też by przepuścił. Test negatywny: przy wariancie
  `publish` obcy zapisał się na ukryty kurs i dostał cały materiał
  („obcy zapisany: TAK");
- `count_enrolled_users_by_course()` liczy zapisy `completed` — to jest liczba
  kupujących w komunikacie C2.

**Trzy pułapki własnych pomiarów z tej tury** (wszystkie złapane, nim zdążyły
skłamać):

1. **`Input::has()` Tutora czyta `$_REQUEST`, nie `$_POST`** — pierwszy test
   darmowego zapisu ustawiał tylko `$_POST`, więc `enroll_now()` wychodził
   pierwszym `return` i OBIE gałęzie dawały „nie zapisany". Test wyglądał na
   dowód, a był ciszą.
2. **`grep && node` przerwał łańcuch** — grep nic nie znalazł, więc strażnik
   w ogóle się nie uruchomił, a `kod: 1` pochodził od grepa. Test negatywny
   „przeszedł" bez uruchomienia mierzonego programu.
3. **Asercja na całej stronie zamiast na wierszu** — pomiar „czy lista pyta
   o kupujących" pytał o CAŁY ekran i zapalił się od razu, bo prawdziwe kursy
   kupujących MAJĄ (`klient-test`). Zawężony do wiersza własnego kursu.
4. **ASCII-owy cudzysłów wewnątrz polskiego cytatu wywala strażnika** — `„…"`
   w łańcuchu JS ujętym w `"` kończy ten łańcuch w środku zdania i plik
   przestaje się parsować. Zdarzyło mi się to **trzy razy w jednej sesji**,
   za każdym razem w komunikacie dla człowieka. Domykaj polskim `”` albo
   nie używaj cudzysłowu w komunikacie.
5. **Reguła pytająca o WZMIANKĘ zamiast o zmianę stanu** — dziesiąty nawrót
   tej pułapki w projekcie, tym razem w regule napisanej pół godziny wcześniej:
   13. reguła higieny zapaliła się na sondzie, która stan sprzedaży wyłącznie
   CZYTA. Rozliczamy tylko to, co stan ZMIENIA.

### PLAUZYBILNE, DZIŚ NIECZYNNE (hardening, nie awaria)

- ~~**Pusty uuid w `Aai_Platnosci_Zapis::kurs_tutora('')`**~~ **ZAMKNIĘTE**
  (2026-08-31): metoda odrzuca pusty identyfikator, jak `znajdz_po_uuid`
  w Pluginie 1 od P5. Naprawa była jednym warunkiem, a klasa błędu raz już
  w tym projekcie zniszczyła dane. Reguła 41 `straznik-platnosci-wp`.
- **Brak memoizacji `cta_kursu()` i `ma_kursy()`** — ~7 nadmiarowych zapytań
  na odsłonę strony kursu; ta sama klasa kosztu, którą naprawiono przy W6
  (menu za 90 zapytań). Nie zmierzone osobno.
- **Beacon monitoringu biegnie za CAŁYM `admin_init` cudzych wtyczek** — dziś
  bez objawu (warunek Tutor Pro fałszywy), ale `wp_die()` w cudzym callbacku
  uciszyłby pomiar bezobjawowo.
- **Menu mobilne podświetla dwie pozycje na `/szkolenia/moje/`** (skrypt
  motywu dopasowuje po prefiksie ścieżki) — nie weryfikowane przeglądarką.
- **Ścieżki z numerem zamówienia w tabeli ruchu** (`/kasa/order-received/2590/`)
  wobec zdania polityki „nie da się ustalić, kto oglądał" — do rozstrzygnięcia
  razem z resztą polityki (pozycja „przed pierwszym klientem").
- **`Aai_Sklep_Menu::wstrzyknij()` bez `try/catch`** w callbacku bufora
  wyjścia — sam recenzent nazwał to najsłabszym znaleziskiem; nie umiem
  wskazać rzucającego.

### OBALONE POMIAREM

- **„Wyszukiwarka witryny wypuszcza prozę lekcji"** — NIE wypuszcza.
  Zmierzone przy ZDJĘTEJ osłonie: zero wyników z lekcji. Wcześniejsze „dwa
  trafienia" to powtórzona fraza zapytania w `<title>` i w odnośniku do
  kanału. Asercja pyta więc o WYNIKI, nie o obecność frazy.

## Pułapki tego kroku (wrócą)

1. **`set_404()` NIE opróżnia pętli.** Motyw bez `404.php` spada na
   `index.php` i drukuje znalezione wpisy — po pierwszej wersji naprawy
   wycieku proza leciała dalej, przy kodzie 200. Zapytanie musi dostać
   PUSTY wynik (`post__in => [0]`), a kod odpowiedzi trzeba nadać osobno.
2. **Asercja może być ślepa na format, którego nie zna.** `tekst()` zdejmuje
   znaczniki wzorcem `<[^>]+>`, a proza w kanale RSS siedzi w `<![CDATA[…]]>`,
   gdzie pierwszy `>` bywa w środku treści — sprawdzenie przechodziło przy
   11 wyciekających lekcjach. Pytaj o treść bez skryptów, nie o wynik `tekst()`.
3. **Kanał błędów wywraca kontrole PO sabotażu.** Testy „usuń plik" zostawiają
   wpis w kanale błędów obu wtyczek i `sprawdz` świeci kod 1, dopóki alarmu
   nie zdejmiesz (`wp aai-monitor wyczysc-blad`, `wp option delete
   aai_platnosci_blad`). To jest dowód, że kanał działa — nie regresja.
4. **Bramka może przechodzić dzięki cudzym śmieciom.** Dwie z czternastu
   wymagały stanu, który zostawał po ręcznych testach właściciela (otwarta
   sprzedaż, konto roli `customer`). Bramka ma sama tworzyć swoją scenę
   i przywracać stan DOKŁADNIE zastany — brak opcji przywraca się jej
   skasowaniem, nie zapisaniem pustej wartości.
5. **Reguła strażnika o „starcie w try/catch" łatwo zapala się na poprawnym
   kodzie** — pierwsza wersja liczyła też wywołanie z wnętrza `catch`
   (raport o błędzie strzeżony `class_exists`).

## Stan bramek (zmierzony 2026-08-31, po wykonaniu C1–C3 i pozycji 4)

`npm run check` kod **0** (strażnicy **37/37**, testy **83/83**, lint, tsc,
build, 7 bramek prototypu). Audyt mutacyjny **305** mutacji, 303 złapane,
**0 przeoczonych, 0 martwych**, 2 pominięte (strażnicy warunkowi bez
materiału). Czternaście bramek WP zielonych:

| bramka | sprawdzeń | bramka | sprawdzeń |
|---|---|---|---|
| monitor | 174 | zakup | 41 |
| kreator | **102** (było 96) | zwroty | 39 |
| motyw | 91 | dane | 30 |
| front | **86** (było 84) | język | 25 |
| produkty | 85 | płatności | 23 |
| maile | 62 | tutor | 44 |
| lekcja | **57** (było 47) | panel | 55 |

Dane Pluginu 1 nietknięte: proza **73/73 co do znaku**, kopia w Tutorze
**0 różnic**, obie kontrole (`aai-platnosci sprawdz`, `aai-monitor sprawdz`)
kod 0.

**`smoke-wp-motyw` padł RAZ w pełnym przelocie (2 z 91) i przechodzi
osobno** — to znany, nieustalony objaw z T1 i T2, nie regresja tej tury:
próba powtórzenia parą `jezyk → motyw` dała zielone, a kod tego kroku nie
dotyka ani frontu, ani logowania.

## Stan środowiska po tym kroku

- `:8892` postawione, pięć wtyczek aktywnych, kursy 2, lekcje z treścią **73**,
  zrzuty 148, produkty 2, powiązania 2, dostawy 0, zamówienia 0, konta:
  `admin`, `klient-test`. **Sprzedaż ZAMKNIĘTA** (opcji nie ma — to jest stan
  domyślny; otworzyć przed testem ręcznym komendą `wp aai-platnosci sprzedaz
  otworz`).
- **Dane monitoringu właściciela z testu T4 na miejscu**: **12 logowań,
  16 odsłon, 6 sesji**. Po drodze doszły dwa wiersze z 2026-08-31 03:07 i 03:09
  (ślad po ubitej bramce z poprzedniej sesji) — skasowane **jawną listą
  identyfikatorów**, nigdy zakresem.
- **NIE wróciły** cztery zamówienia i trzy konta z wcześniejszych testów
  właściciela — po skasowaniu bazy ich identyfikatory nie istnieją, a wstawianie
  ich na siłę dałoby dane, które kłamią. **Pełny zrzut bazy sprzed odtworzenia:
  `~/.cache/aai-kopie/pelny-zrzut-przed-testem-calosci.sql`** (14 MB, poza
  repozytorium — niesie dane osobowe).

## Naprawiona przy okazji bramka języka

`smoke-wp-jezyk` wywracał się w pełnym przelocie, zanim cokolwiek zmierzył:
stan sprzedaży czytał komendą `wp option get`, a ta kończy **jedynką**, gdy
opcji nie ma — a nie ma jej po odtworzeniu środowiska ani po żadnej bramce,
która przywraca stan skasowaniem. Czyta teraz `get_option( …, "" )` i
przywraca stan **dokładnie zastany** (brak opcji kasowaniem, wartość zapisem;
„zamknij" zapisywało „nie", czyli ślad, którego nie było). Pilnuje **13. reguła
`straznik-higieny-smokow`** z dwiema mutacjami.

## Rozstrzygnięcia właściciela z 2026-08-31 (wszystkie wykonane)

| # | Pytanie | Decyzja |
|---|---|---|
| C1 | co z materiałem ukrytego kursu | kurs znika ze sklepu, **kto go kupił — czyta dalej** |
| C1b | co z darmowymi zapowiedziami ukrytego kursu | **gasną razem z kursem** (zapowiedź jest narzędziem sprzedaży) |
| C2 | usunięcie kursu z kupującymi | **potwierdzenie z LICZBĄ**, drugie kliknięcie |
| C2b | kod wyjścia kontroli po takim usunięciu | **kod 1 tylko wtedy, gdy kurs miał kupujących**; sierota po kursie testowym zostaje informacją |
| C3 | zdanie „Dostęp od razu po zakupie" | **zmienić na prawdziwe** |
| 4 | wyłączony Plugin 1 a sprzedaż | **kontrola ma mówić prawdę i świecić kodem 1**; zachowania sprzedaży nie zmieniamy |

Sprostowanie do C2, na wypadek powrotu do tematu: „Usuń kurs" kasuje kurs
**całkowicie** — z naszych tabel, z Tutora, wszystkim kupującym naraz. Nie ma
czegoś takiego jak usunięcie kursu jednemu klientowi; odebranie dostępu jednej
osobie to zwrot zamówienia w WooCommerce (zrobione w P5).

**Przycisk „Usuń" NIE JEST nowy** — jest w kokpicie od kroku W4 (commit
`f31b69f`, 2026-08-25), bo warstwa zapisu musiała umieć kasować od pierwszego
dnia: bez tego bramki nie miałyby jak posprzątać własnych kursów testowych
inaczej niż surowym SQL-em, czyli omijając jedyną warstwę pisującą do naszych
tabel. C2 niczego nie dodało — dołożyło hamulec.

Właściciel dostał trzy warianty i wybrał pierwszy (2026-08-31):
**(1) dołożyć hamulec** — przycisk zostaje, ale pyta liczbą i chce drugiego
kliknięcia; (2) zablokować na głucho, z drogą wyjścia tylko komendą;
(3) wyjąć przycisk z kokpitu, zostawiając kasowanie bramkom i komendzie.
Warianty 2 i 3 są **odrzucone**, nie „na później".

## Co zostaje do zrobienia

1. ~~Scenariusz testu ręcznego dla właściciela~~ **NAPISANY:
   [TEST-RECZNY-CALOSC.md](TEST-RECZNY-CALOSC.md)** — jedna ścieżka
   w dziesięciu krokach przez wszystkie trzy wtyczki, z zaznaczonymi SZWAMI
   i tabelą „czego nie zgłaszać". Przelot kontrolny przed oddaniem:
   `node --env-file=.env tools/smoke/przelot-calosc.mjs` — **37/37**
   (sonda, nie bramka; nie wchodzi do `npm run check`).
   **TEST ZALICZONY** — patrz sekcja niżej.
2. ~~Test właściciela → poprawki → CHANGELOG + README → PR → tag → release~~
   **ZROBIONE**: PR #107 zmergowany do `main`, tag `v0.59.0` + release.
3. Pozycje z listy „plauzybilne" **poza pustym uuid zostają otwarte świadomie** —
   żadna nie jest dziś czynna, a każda dotyka cudzego kodu albo wydajności,
   nie poprawności.

## TEST RĘCZNY ZALICZONY (właściciel, 2026-08-31)

**Właściciel przeszedł scenariusz [TEST-RECZNY-CALOSC.md](TEST-RECZNY-CALOSC.md)
i go zaliczył. Etap WordPressa jest tym samym ZAMKNIĘTY** — trzy wtyczki mają
własne testy ręczne (W6, P6, T4), a ta jedna ścieżka sprawdziła je RAZEM:
gość → zakup nowym kontem → poczta → klient czyta lekcję → kreator → „Ukryj"
→ „Usuń" → monitoring → strona motywu.

### Czego ten dokument o mało nie stracił

Wynik testu **przez chwilę nie istniał w repo**. Ten dokument warunkował merge
jego zaliczeniem („Merge dopiero po zaliczeniu testu ręcznego"), PR #107 został
zmergowany i wydany jako `v0.59.0` — a nigdzie nie było napisane, czy test się
odbył. Znalezione przy **higienie repo 2026-08-31** i uzupełnione na
potwierdzenie właściciela.

**Lekcja na audyt końcowy i na każdą przyszłą bramkę ręczną: bramka, której
WYNIK nie trafia do repo, po tygodniu jest nie do odróżnienia od bramki,
której nie było.** W6, P6 i T4 mają swoje zapisy z datą i nazwiskiem
decydenta; ta jedna ich nie miała, choć była z nich wszystkich najszersza.
