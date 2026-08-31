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

### POTWIERDZONE, CZEKAJĄ NA WYKONANIE (decyzje właściciela 2026-08-31)

| # | Co | Decyzja |
|---|---|---|
| 2 | **„Ukryj" odbiera dostęp KUPUJĄCYM**: status `archived` przepisuje 73 lekcje na `private`, klient dostaje **404**, a obie kontrole kończą **kodem 0** | **C1: kurs znika ze sklepu, ale kto go kupił — czyta dalej.** Do wykonania |
| — | **„Dostęp od razu po zakupie"** na stronie kursu, przy jedynej włączonej bramce (przelew), gdzie dostęp powstaje po potwierdzeniu wpłaty | **C3: zdanie zmienić.** Do wykonania |
| 4 | **Po wyłączeniu Pluginu 1 sprzedaż DALEJ DZIAŁA**, a kontrola pisze „Sprzedaż nie działa" i kończy kodem 0 | do rozstrzygnięcia (produkt zostaje `publish`, walidacja koszyka przepuszcza — zmierzone) |
| — | **Usunięcie kursu, który ktoś kupił**, przechodzi bez pytania o kupujących | **C2: właściciel poprosił o pytanie doprecyzowujące** — patrz „Pytania otwarte" |

### PLAUZYBILNE, DZIŚ NIECZYNNE (hardening, nie awaria)

- **Pusty uuid w `Aai_Platnosci_Zapis::kurs_tutora('')`** — dziś zwraca `-1`
  (dwa kursy z tym meta, więc odmawia), ale przy JEDNYM kursie trafiłby
  w cudzy wpis. Plugin 1 ma tę obronę od P5 (`znajdz_po_uuid`), Plugin 2 nie.
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

## Stan bramek po naprawach (zmierzony, nie przepisany)

`npm run check` kod 0 (strażnicy **37/37**, testy **83/83**, lint, tsc, build,
7 bramek prototypu). Audyt mutacyjny **293** mutacje, 0 przeoczonych,
0 martwych. Czternaście bramek WP zielonych, w tym: lekcja **47** (było 44),
zakup 41, zwroty 39, maile 46, monitor 174, front 84, kreator 96, panel 54,
motyw 89, produkty 84, tutor 44, dane 30, język 25, płatności 23.
Dane Pluginu 1 nietknięte: proza **73/73 co do znaku**, kopia w Tutorze
**0 różnic**.

**SZÓSTA PUŁAPKA TEGO KROKU — KASKADA PO PRZERWANEJ BRAMCE.** Przelot
czternastu bramek pokazał trzy padnięcia (`zakup`, `zwroty`, `maile`)
z komunikatami o zostawionych produktach, zamówieniach, zapisach i poczcie.
Żadne z nich nie było prawdziwe: pierwsza bramka padła na MOJEJ zmianie
adresu kontaktu (asercja kodowała stary zapis bez ukośnika), przerwała się
w połowie i zostawiła scenę, na której następne bramki mierzyły ruchomy
punkt odniesienia. Po posprzątaniu te same trzy bramki, uruchomione po
kolei, przechodzą **41 / 39 / 46**. Wniosek na przyszłość: **po padnięciu
bramki nie czytaj wyników następnych** — najpierw przywróć stan.

## Stan środowiska po tym kroku

- `:8892` postawione **od zera**, pięć wtyczek aktywnych, kursy 2, lekcje
  z treścią **73**, zrzuty 148, produkty 2, powiązania 2, **zamówienia 0**,
  konta: `admin`, `klient-test`. **Sprzedaż ZAMKNIĘTA** (stan domyślny po
  odtworzeniu — otworzyć przed testem ręcznym).
- **Dane monitoringu właściciela z testu T4 przywrócone co do wiersza**:
  12 logowań, 16 odsłon, 6 sesji (konta przemapowane po loginie). Ślady po
  moich pomiarach i po przerwanej bramce monitoringu **skasowane** (rozpoznane
  po loginie `smoke-*`, adresie `203.0.113.0/24` i czasie mojej sesji);
  dziennik ma dziś dokładnie te 12 wierszy właściciela.
- **NIE wróciły** cztery zamówienia i trzy konta z jego wcześniejszych testów
  — po skasowaniu bazy ich identyfikatory nie istnieją, a wstawianie ich na
  siłę dałoby dane, które kłamią. **Pełny zrzut bazy sprzed odtworzenia leży
  w `~/.cache/aai-kopie/pelny-zrzut-przed-testem-calosci.sql`** (14 MB, poza
  repozytorium — niesie dane osobowe).

## Pytania otwarte (do właściciela)

**C2 — usunięcie kursu, który ktoś kupił.** Dziś cała ścieżka pyta wyłącznie
o TREŚĆ (`pozwol_skasowac_tresc`); nikt nie pyta, czy kurs ma właścicieli,
choć Tutor zna odpowiedź. Skasowanie zabiera wpisy Tutora NA TWARDO, klientowi
zostaje zapis wskazujący nieistniejący kurs, a `wp aai-platnosci sprawdz`
kończy kodem 0 (osierocony produkt jest u niego informacją). Pytanie
doprecyzowujące — **na czym ma polegać ochrona**:

1. **odmowa** — kursu z kupującymi po prostu nie da się skasować z panelu,
   dopóki ktoś go ma (najostrzejsze; wymaga drogi wyjścia dla właściciela,
   np. komendy z jawną flagą);
2. **potwierdzenie z liczbą** — panel mówi „ten kurs ma N kupujących, oni
   stracą dostęp" i każe potwierdzić drugim kliknięciem (wzorem odmowy
   skasowania treści lekcji);
3. **nic** — usunięcie zostaje jak jest, bo to świadoma decyzja właściciela
   i tak, a kupujących ma pilnować on sam.

Do tego drugie pytanie, niezależne: czy **kontrola** (`wp aai-platnosci
sprawdz`) ma po takim usunięciu świecić **kodem 1** (dziś: 0, „produkt
osierocony" jest informacją)?

## Co zostaje do zrobienia po `/clear`

1. **C1 — „Ukryj" przestaje odbierać dostęp kupującym** (decyzja właściciela):
   kurs znika ze sklepu, materiał zostaje czytelny dla tego, kto go kupił.
   Uwaga wykonawcza: dziś status naszego kursu jedzie w `Aai_Sklep_Tutor` na
   `post_status` KURSU, MODUŁÓW **i LEKCJI** (`STATUS_NA_WP`,
   `archived → private`), a `private` odcina każdego bez `read_private_posts`.
2. **C3 — zdanie „Dostęp od razu po zakupie"** na stronie kursu zmienić na
   prawdziwe przy przelewie.
3. **C2 — po odpowiedzi właściciela** (pytanie wyżej).
4. Rozstrzygnąć pozycję 4 (wyłączony Plugin 1 a sprzedaż) i pozycje z listy
   „plauzybilne" — które robimy teraz, a które zostają jawnie otwarte.
5. **Scenariusz testu ręcznego dla właściciela** (wzorem
   [W6-TEST-RECZNY.md](plugin-1/W6-TEST-RECZNY.md), [TEST-RECZNY-P6.md](plugin-2/TEST-RECZNY-P6.md),
   [TEST-RECZNY-T4.md](plugin-3/TEST-RECZNY-T4.md)) — JEDNA ścieżka przez
   wszystkie trzy wtyczki naraz, z tabelą „czego nie zgłaszać".
6. Test właściciela → poprawki → CHANGELOG + README → **PR jedną gałęzią**
   (razem z zapisem o odwołanej rozbudowie ekranu) → tag → release.
