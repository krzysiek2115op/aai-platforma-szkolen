# Krok P3a — ustawienia jako kod, polskie adresy, koszyk i kasa w wyglądzie motywu

**Status: PLAN ZATWIERDZONY przez właściciela 2026-08-29** („p3a jest okej",
z instrukcją: pytania doprecyzowujące zadawać w trakcie, gdy coś wyjdzie).
Plan przedstawiony wraz z czterema pytaniami i rekomendacjami — akceptacja
planu obejmuje rekomendacje. Gałąź: `feat/p3a-ustawienia-kasa`.

Rodzeństwo: [DIAGRAM.md](DIAGRAM.md) (sekcje 8, 16), [SWEEP-P2.md](SWEEP-P2.md)
(stan otwarty §4), [KRYTYKA-P0.md](KRYTYKA-P0.md) (B1, B12, B17, L8, L11).

## 1. Cztery rozstrzygnięcia (rekomendacje przyjęte z planem)

| # | Pytanie | Rozstrzygnięcie |
|---|---|---|
| 1 | przestawiać `monetize_by` na `wc` już teraz? | **TAK** — ale **sprzedaż ZAMKNIĘTA do P4**: produkty zostają `publish` (przestawienie na `draft` łamałoby niezmiennik 9 i zapalało kontrolę), a zakup blokuje filtr na dodawaniu do koszyka, zdejmowany dopiero gdy dostarczanie (P3b + P4) jest gotowe. Kontrola stan NAZYWA |
| 2 | polskie adresy — jak daleko? | `/koszyk/` + `/kasa/`; **`/my-account/` zostaje** (mamy już `/szkolenia/moje/`, drugi podobny adres myliłby klienta); **bez przekierowań 301** — nikt starych adresów nie zna. **ODSTĘPSTWO od decyzji 6 z 2026-08-26** (`/zamowienie/`, `/moje-konto/`) — przyjęte razem z planem P3a |
| 3 | puste strony Tutora 151/152 | **`draft`** — odwracalne, znika z witryny i indeksu, cudzych danych nie kasuje (ta sama zasada, dla której synchronizacja nie kasuje obcych wpisów). Zmierzone przed decyzją: obie mają **0 znaków treści** |
| 4 | wygląd koszyka i kasy | rozszerzenie **`aai-sklep/assets/woo-motyw.css`** (Plugin 1) — dwa arkusze dwóch wtyczek na tym samym cudzym markupie to klasa błędu z 0.40.0 (L8). Właściciel potwierdził, że P3a wolno dotknąć Pluginu 1 w tym miejscu |

## 2. Czego P3a NIE dotyka

| Rzecz | Należy do |
|---|---|
| CTA i jego trzy stany, cena z Woo na froncie, JSON-LD `InStock` | P3b |
| mechanizm domykania zamówień (`needs_processing`, auto-complete) | P3b |
| przekierowanie koszyk → kasa („prosto do kasy") | P3b — bez CTA nie ma czego przekierowywać |
| maile, tabela `dostawy`, konto przy zakupie | P4 |
| **mail Woo `customer_new_account` — zostaje WŁĄCZONY** | P4 — wyłączenie go przed powstaniem naszego maila 1 zostawiałoby każde nowe konto bez żadnego linku do hasła (klasa K1); tabela sekcji 8 DIAGRAM podaje stan docelowy, o momencie decyduje bezpieczeństwo |
| pełny dowód B1 (gość + oba ustawienia → zamówienie POWSTAJE) | P3b — wymaga przebiegu zakupu; P3a pilnuje samych WARTOŚCI pary opcji |
| regulamin, prawdziwa bramka, faktury | przed pierwszym klientem / po P6 |

## 3. Weryfikacja zerowa — cztery fakty z zainstalowanego kodu (2026-08-29)

Zmierzone przed zamrożeniem projektu blokady (zasada schematu: prawdą jest kod):

1. **`is_course_purchasable` przy silniku `wc` czyta wyłącznie meta**
   (`price_type` + `product_id`; `WooCommerce.php:406-428`) — **nigdy nie pyta
   `WC_Product::is_purchasable()`**. Blokada na poziomie koszyka NIE otwiera
   więc okna klasy B2 (zapis `completed` na niezapłaconym zamówieniu).
2. **`Utils::get_option` robi `apply_filters( $key, $value )`** — mechanika
   filtrów B17 potwierdzona; filtr działa tylko dla klucza obecnego w tablicy
   opcji, wartości przełączników to `'on'`/`'off'`.
3. **Cała integracja WC Tutora rejestruje się za `if ( 'wc' !== $monetize_by )
   return;`** (`WooCommerce.php`, konstruktor) — po przestawieniu na `wc`
   handler `save_post_product` Tutora zaczyna działać, więc smoke produktów
   dostaje asercję wstępną `monetize_by === 'wc'` i od tej pory mierzy CUDZE
   przywracanie znaczników (zapowiedziane w SWEEP-P2.md §4).
4. **Filtr `woocommerce_add_to_cart_validation` pokrywa wszystkie cztery
   ścieżki**: form handler (`?add-to-cart=`, `class-wc-form-handler.php:981`),
   AJAX (`class-wc-ajax.php:520`), Store API — kasa blokowa
   (`StoreApi/Utilities/CartController.php:335`) **oraz wczytanie sesji
   koszyka** (`class-wc-cart-session.php:615`) — produkt włożony do koszyka
   przed blokadą wypadnie z niego przy następnym wczytaniu.

## 4. Przebieg — sześć etapów

1. **`Aai_Platnosci_Ustawienia`** — jedno źródło wartości docelowych sekcji 8:
   `monetize_by = wc`, `tutor_woocommerce_order_auto_complete = on`,
   `woocommerce_enable_guest_checkout = no`,
   `woocommerce_enable_signup_and_login_from_checkout = yes` (B1 — bez tego
   kasa oddaje 403 każdemu niezalogowanemu). **Ustawia** aktywacja wtyczki
   i `wp aai-platnosci sync --napraw` (role rozdzielone wg L11 — kontrola
   NIGDY nie pisze). **Filtry B17** na dwóch krytycznych kluczach Tutora
   (`monetize_by`, auto-complete): wartość w bazie ORAZ filtr; kontrola MÓWI
   o rozjeździe bazy z filtrem, zamiast po cichu przywracać.
2. **Blokada sprzedaży do P4**: filtr `woocommerce_add_to_cart_validation`
   odrzuca produkty z tabeli `powiazania` z komunikatem (sprzedaż jeszcze
   nie ruszyła), dopóki flaga otwarcia nie jest ustawiona. Flaga = opcja
   z filtrem (jak B17), domyślnie ZAMKNIĘTE; zdejmuje ją dopiero P4.
   Kontrola nazywa stan „SPRZEDAŻ ZAMKNIĘTA (do P4)" — kod 0, to stan
   projektowany.
3. **Adresy PL**: slug strony 6 `cart → koszyk`, strony 7 `checkout → kasa`
   (przez `--napraw`, idempotentnie); `/my-account/` bez zmian. Strony
   Tutora **151/152 → `draft`**.
4. **Wygląd koszyka i kasy**: rozszerzenie `woo-motyw.css`
   + `Aai_Sklep_Styl_Woo` w Pluginie 1; zero nowych warunków — pyta
   istniejące `Aai_Sklep_Zasoby::strona_woo()`.
5. **Kontrola** `wp aai-platnosci sprawdz`: wartości wszystkich ustawień
   z sekcji 8 (z rozjazdem baza↔filtr), slugi stron, status 151/152, stan
   blokady, asercja danych B12 (`_tutor_wc_guest_customer_id` na wpisie
   kursu = kod 1).
6. **Dowody**: `smoke-wp-motyw` + `/koszyk/` i `/kasa/` (asercja „zakres
   trafił w ≥ 1 element"; pomiar kasy z produktem w koszyku — smoke otwiera
   blokadę NA CZAS pomiaru na własnym kursie testowym i przywraca);
   `smoke-wp-produkty` z asercją wstępną `monetize_by === 'wc'`; rozszerzenie
   `straznik-platnosci-wp` (blokada istnieje i jest domyślnie zamknięta,
   filtry B17 rejestrowane bezwarunkowo) + mutacje z `oczekiwanySlad`;
   README + CHANGELOG; przegląd agent+krytyk wg `agenci/przeglad-pr/`;
   PR → **merge wyłącznie za zgodą właściciela**.

## 5. Ryzyka nazwane z góry

- **Okno P3a→P4**: po przestawieniu silnika zakup byłby technicznie możliwy,
  a dostarczanie jeszcze nie istnieje — dlatego blokada z etapu 2 wchodzi
  W TYM SAMYM commicie co przestawienie silnika, nie osobno.
- **Deaktywacja Woo cofa `monetize_by` na `free`** (U1) — kontrola to widzi
  (rozjazd baza↔filtr) i mówi, co zrobić.
- **Zmiana sluga kasy** może dotknąć smoke'ów Pluginu 1, które mierzą
  `/my-account/` — sprawdzić WSZYSTKIE odwołania do `/cart/` i `/checkout/`
  w smoke'ach i stylach przed zmianą (klasa L7: twarde asercje adresów).

## 6. Pomiary z wdrożenia na `:8892` (2026-08-29)

- `sync --napraw` wykonał **8 zmian** (silnik, auto-complete, para kasy,
  dwa sluggi, dwie strony Tutora na draft); drugi przebieg — **0 zmian**
  (idempotencja); kontrola po naprawie — **kod 0**.
- `/koszyk/` → 200; **`/kasa/` z pustym koszykiem → 302 na `/koszyk/`**
  (zachowanie Woo — kasę mierzy się z pozycją w koszyku, co smoke musi
  uwzględniać); `/cart-2/`, `/checkout-2/` → 404.
- **Stare adresy `/cart/` i `/checkout/` oddają 404, nie 301** —
  `wp_old_slug_redirect` nie obejmuje stron (hierarchicznych typów).
  Wcześniejsze zdanie „WordPress sam przekieruje 301" było z dokumentacji,
  nie z pomiaru — poprawione też w komunikacie `napraw`. Stan 404 jest
  zgodny z rozstrzygnięciem 2 (nikt starych adresów nie znał).
- Kolejność ładowania wtyczek MA znaczenie dla filtra B17: Tutor bootuje
  przy include i od razu czyta `monetize_by`, więc filtry rejestrują się
  przy include `aai-platnosci` (stoi w `active_plugins` przed `tutor`),
  a strażnikiem kolejności jest kontrola (rozjazd baza↔filtr = kod 1).
- Klucz nieobecny w `tutor_option` NIE przechodzi przez filtr
  (`get_option` zwraca domyślną bez `apply_filters`) — zmierzone na
  `tutor_woocommerce_order_auto_complete` przed naprawą; dokładnie dlatego
  naprawa pisze bazę, a filtr tylko broni.


## 7. Wynik implementacji (2026-08-29)

Wszystkie sześć etapów zrobione (commity `7ef9e27` + `124ab4d`).

| Dowód | Wynik |
|---|---|
| `npm run check` | kod 0 (strażnicy 35/35, testy 83/83) |
| audyt mutacyjny | **181** (179 złapanych, 0 przeoczonych, 0 martwych, 2 pominięte) |
| `smoke:wp-motyw` | **89** sprawdzeń, **9 stron** — koszyk i kasa z produktem w koszyku gościa |
| `smoke:wp-produkty` | **71** (z asercją wstępną `monetize_by = wc`) |
| pozostałe smoke'i WP | płatności 23 · front 84 · tutor 44 · lekcja 35 · kreator 96 · panel 54 · dane 30 |
| `wp aai-platnosci sprawdz` | kod 0; test negatywny slug/silnik → kod 1 → `--napraw` → kod 0 |
| `postaw.sh` | kod 0 (punkt koszyka pyta instalację o adres — L7 naprawione) |
| środowisko po przebiegach | produkty 2, powiazania 2, dostawy 0 |

**Trzy rzeczy znalezione po drodze i naprawione w tym samym kroku:**
1. `smoke-wp-platnosci` mierzył silnik PRZEZ filtr B17 (klasa 5 — maskował
   wyzerowanie bazy przez deaktywację Woo) i zostawiał po sobie rozjazd
   (klasa 6) — migawka z surowej bazy + sprzątanie `sync --napraw`;
2. pisanie do wpisów stron wyprowadzone do warstwy zapisu — złapał WŁASNY
   strażnik („jedyny pisarz" obejmuje też strony);
3. punkt kontrolny koszyka w `postaw.sh` miał wpisany stary adres `/cart/`
   (klasa L7 z ryzyk planu) — pyta teraz instalację przez `get_permalink()`;
   jego przypadek „strona nie istnieje" gasi już wcześniejsza warstwa
   (kontrola ustawień, zmierzone testem negatywnym).

**ZOSTAJE do domknięcia kroku:** przegląd agent+krytyk wg
`agenci/przeglad-pr/`, PR, merge za zgodą właściciela.

## 8. Przegląd przed PR-em (2026-08-29) — trzy znaleziska, wszystkie rozliczone

Recenzent (Sonnet, zamknięta lista 10 pytań) + krytyk (agent główny,
potwierdzenia URUCHOMIENIOWE wg `agenci/przeglad-pr/KRYTYK.md`).

| # | Znalezisko | Werdykt krytyka | Naprawa |
|---|---|---|---|
| 1 | **KRYTYCZNE: `dopisz_klase_bloku()` podmieniał PREFIKS klasy** — trafiał w każdy blok zagnieżdżony o tej samej nazwie początkowej i rozbijał jego klasę (`…-cart-items-block` → `…-cart has-dark-controls-items-block`) | **POTWIERDZONE pomiarem**: 13 uszkodzeń na stronie 6, 22 na stronie 7 (żywe dane). Cicho, bo blok Woo zwraca zapisaną treść bez regeneracji | dopasowanie na **granicy atrybutu** + podmiana tylko pierwszego wystąpienia; **dane naprawione** (0 uszkodzeń, klasa zewnętrzna na miejscu); test na sztucznym bloku: dziecko nietknięte, klasa raz, drugi przebieg bez zmian. Pilnują: reguła 13b strażnika + mutacja + **kontrola DANYCH** w `sprawdz` (rozbite nazwy = kod 1) |
| 2 | INFO: niezmiennik 12 ślepy na rejestrację WARUNKOWĄ z wywołaniem bez wcięcia | **POTWIERDZONE mutacją-pytaniem** (strażnik kod 0 na `if ( is_admin() ) { … }`) | wzorzec liczy **głębokość klamer**, nie pozycję w linii; mutacja odtwarza dokładnie ten wariant |
| 3 | NISKIE: docblock obiecywał „wszystkie cztery ścieżki", a REST Orders API filtra nie woła | **POTWIERDZONE** (zero trafień w `rest-api/` i `src/Internal/RestApi/`) | docblock prostuje: cztery ścieżki KLIENTA + REST Orders nazwany jako świadomie poza zasięgiem (wymaga klucza API z prawem zapisu; dostarczania i tak nie ma do P4) |

**Siedem pytań bez znalezisk** (sprawdzone — nie szukać drugi raz): filtr
blokady obejmuje „zamów ponownie" przez `populate_cart_from_order`; nazwy
filtrów `monetize_by` i auto-complete nie mają w Tutorze/Woo/motywie drugiego
znaczenia; Tutor nie przywraca stron 151/152 na `publish` (tworzy je tylko
przy `page_id == 0`); `czy_produkt_kursu()` idzie po kluczu UNIQUE; smoke
koszyka nie crashuje przy nieudanym dodaniu (finally zamyka flagę i kontekst);
400 w teście negatywnym blokady nie może przyjść z braku nonce'a (to 401/403);
`napraw()` nie fatalizuje przy braku Woo albo Tutora.
