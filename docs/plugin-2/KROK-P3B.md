# Krok P3b — CTA w trzech stanach, cena z Woo, domykanie zamówienia

**Status: PLAN ZATWIERDZONY przez właściciela 2026-08-29** („Akceptuję powyższy
plan i realizuj go dokładnie krok po kroku"). Gałąź: `feat/p3b-cta-i-cena`.

Rodzeństwo: [KROK-P3A.md](KROK-P3A.md) (poprzedni krok), [DIAGRAM.md](DIAGRAM.md)
(sekcje 4, 16), [KRYTYKA-P0.md](KRYTYKA-P0.md) (K2, K3, B16, B18).

## 1. Cztery rozstrzygnięcia właściciela (2026-08-29)

| # | Pytanie | Rozstrzygnięcie |
|---|---|---|
| 1 | kiedy klient dostaje dostęp przy przelewie? | **dopiero po potwierdzeniu wpłaty** — zamówienie stoi na `on-hold`, dostęp powstaje po oznaczeniu go jako opłacone. Konsekwencja dla P4: mail „Ustaw hasło" MUSI wyjść przy `on-hold`, nie przy `completed` (klasa K1) |
| 2 | która bramka do testów | **`bacs`** (przelew bankowy) — zostawia `on-hold`, czyli testuje trudną ścieżkę; włączona tylko na `:8892` |
| 3 | gdzie cena efektywna z Woo | **strona kursu I katalog** — wszędzie, gdzie klient widzi liczbę, widzi tę samą co w kasie; koszt: pamięć na żądanie + pomiar liczby zapytań |
| 4 | rozjazd kreator↔strona przy promocji | **zdanie przy polu ceny** w kreatorze; kreator zostaje jedynym miejscem ceny katalogowej |

## 2. Czego P3b NIE dotyka

| Rzecz | Należy do |
|---|---|
| maile (potwierdzenie Woo, nasz z linkiem do hasła), tabela `dostawy` | P4 |
| konto klienta przy zakupie | P4 |
| **zdjęcie blokady sprzedaży** | P4 — P3b otwiera ją wyłącznie na czas pomiaru, jak smoke w P3a |
| prawdziwa bramka płatności, regulamin, faktury | przed pierwszym klientem / po P6 |
| zwroty i przypadki brzegowe | P5 |

## 3. Etap E5 — pomiar mechanizmu domykania (2026-08-29)

**Zmierzone na żywej instalacji `:8892`**, na własnym kursie testowym
(uuid `…0p3b05`, produkt 969, kopia w Tutorze 968, `purchasable = TAK`),
kontem `klient-test` (21). Każdy odczyt dostępu w OSOBNYM żądaniu —
`is_enrolled()` w tym samym żądaniu, w którym powstał zapis, kłamie.
Po pomiarze środowisko wróciło do stanu wyjściowego (produkty 2,
powiązania 2, zamówienia 0, `_tutor_wc_guest_customer_id` 0, obie
kontrole kod 0).

| # | Ścieżka | Status zamówienia | Status zapisu | Dostęp |
|---|---|---|---|---|
| A | `bacs`, ręcznie `on-hold → completed` | `completed` | `completed` | **TAK** |
| A-bis | `bacs`, ręcznie `on-hold → processing` | `processing` | `processing` | **NIE** ⚠ |
| B | `bacs` + `payment_complete()` | `processing` | `processing` | **NIE** ⚠ |
| C | filtr `needs_processing → false` + `payment_complete()` | `completed` | `completed` | **TAK** |
| D | produkt `downloadable`+`virtual` + `payment_complete()` | `completed` | `completed` | TAK (0 pobrań) |
| E | metoda spoza czarnej listy Tutora + `payment_complete()` | `completed` | `completed` | **TAK** |

### Mechanika, z której to wynika (przeczytana w kodzie, potwierdzona pomiarem)

1. `EnrollmentModel::do_enroll()` nadaje zapisowi `pending`, gdy kurs jest
   `purchasable`, a `completed` gdy nie jest — czyli **nasz szew z P2 zamyka
   okno B2**: kurs jest purchasable (`price_type` + `product_id`), więc zapis
   startuje jako niedostęp. Zmierzone: `purchasable = TAK`.
2. `WooCommerce::enrolled_courses_status_change()` przy KAŻDEJ zmianie statusu
   zamówienia ustawia status zapisu **równy statusowi zamówienia** — chyba że
   `should_order_auto_complete()`, wtedy `completed`.
3. `should_order_auto_complete()` zwraca `true` bezwarunkowo, **gdy zamówienie
   jest już `completed`** (gałąź `else`). Dlatego ścieżka A działa bez naszego
   kodu, mimo że `bacs` jest na czarnej liście.
4. Czarna lista `['cod','cheque','bacs']` blokuje wyłącznie domknięcie
   **z `processing`**. Stąd A-bis i B.
5. `WC_Order::needs_processing()` liczy `! ( is_downloadable() && is_virtual() )`
   przez filtr `woocommerce_order_item_needs_processing`, a wynik zapisuje
   w **cache obiektowym grupy `orders` na dobę**, kluczem per zamówienie
   (nie transient). Bez trwałego cache znika po żądaniu; z Redisem żyłby dobę.

### Dwie dziury, które to odsłania

- **A-bis: admin klika w panelu „Processing" zamiast „Complete"** — klient
  zapłacił, wpłata potwierdzona, dostępu nie ma i nic tego nie sygnalizuje.
- **B: bramka woła `payment_complete()` przy metodzie z czarnej listy** —
  to samo, bez udziału człowieka.

### Wybór mechanizmu

**Wariant C (filtr `needs_processing`) — przyjęty**, zgodnie z B18 z krytyki P0.
Zamyka B u źródła: produkt kursu nigdy nie wymaga obsługi, więc `payment_complete()`
prowadzi prosto do `completed` i klient dostaje dostęp jednym mailem zamiast dwóch.
Filtr dostaje `$product`, więc obejmuje **wyłącznie produkty kursów** — cudze
produkty w tym samym sklepie zachowują się jak dotąd.

**Wariant D (`downloadable`) — odrzucony**, choć zmierzony jako działający:
zmienia DANE produktu (a szew nadpisuje produkt przy każdym zapisie kursu, więc
doszłoby kolejne pole do synchronizacji i kolejny rozjazd do pilnowania), kłamie
o naturze produktu przy decyzji „e-booki NIGDY", i włącza w panelu produktu
zakładkę plików, której właściciel nigdy nie wypełni.

**Wariant E pokazuje, że ścieżka docelowa (prawdziwa bramka) domyka się sama** —
auto-complete Tutora działa dla metod spoza czarnej listy. Filtr C jest więc
potrzebny dla przelewu i metod ręcznych, a przy karcie/BLIK-u nie szkodzi.

**A-bis zostaje otwarte** — filtr C go nie zamyka, bo ręczna zmiana statusu nie
przechodzi przez `payment_complete()`. Rozstrzygnięcie: patrz sekcja 4.

## 4. Rozstrzygnięcie A-bis (właściciel, 2026-08-29)

**Zamówienie KURSU wchodzące w `processing` domykamy automatycznie na
`completed`.** Uzasadnienie właściciela przyjęte z rekomendacją: produkt cyfrowy
nie ma czego „realizować", więc `processing` jest dla niego stanem bez treści.
Zgodne z rozstrzygnięciem 1 — `processing` w WooCommerce znaczy „płatność
otrzymana", więc dostęp dalej powstaje po potwierdzeniu wpłaty, a nie przed nią.

Hak dotyczy **wyłącznie zamówień zawierających nasze produkty** (tabela
`powiazania`); zamówienia bez kursu zachowują się jak dotąd. Odrzucone warianty:
samo ostrzeżenie w kontroli (dziura żyje między kliknięciem a zajrzeniem do
kokpitu) i wycięcie statusu z panelu (głębsze wejście w cudzy panel, kruche
wobec przyszłych wersji Woo).

## 5. Etap E5 — wykonanie (2026-08-29)

Powstała klasa `Aai_Platnosci_Dostarczanie` z dwoma mechanizmami:
filtrem `woocommerce_order_item_needs_processing` (produkt kursu nigdy nie
wymaga obsługi → `payment_complete()` prowadzi prosto do `completed`, jeden
mail zamiast dwóch) i hakiem `woocommerce_order_status_processing` (siatka na
ręczną zmianę statusu w panelu).

`woocommerce_order_status_processing`, a nie `..._status_changed`, bo ten drugi
odpala się wyłącznie przy niepustym `from` — zamówienie utworzone od razu ze
statusem `processing` przeszłoby mu pod nosem.

### Dowód różnicowy — te same ścieżki przed naprawą i po niej

| Ścieżka | Przed | Po |
|---|---|---|
| `bacs` + `payment_complete()` | `processing`, dostęp **NIE** | `completed`, dostęp **TAK** |
| `bacs`, ręcznie `on-hold → processing` | `processing`, dostęp **NIE** | `completed`, dostęp **TAK** |
| cudzy produkt + `payment_complete()` | `processing` | `processing` (bez zmian) |
| cudzy produkt, ręcznie `processing` | `processing` | `processing` (bez zmian) |

### Znalezisko własne przy weryfikacji — potwierdzone uruchomieniowo przed naprawą

Pierwsza wersja pytała, czy zamówienie **zawiera** kurs. Zamówienie mieszane
(kurs + cudzy produkt fizyczny) dostawało wtedy `completed` — czyli właściciel
widziałby „zrealizowane" przy nienadanej paczce. Zmierzone: zamówienie
z dwiema pozycjami kończyło jako `completed`.

Naprawione: domykamy tylko zamówienia złożone **wyłącznie** z kursów
(`same_kursy()`); mieszane zostają w `processing`, bo tam ten status jest
prawdziwy — jest co wysłać. Po naprawie zmierzone ponownie: mieszane
`processing`, samo kursy `completed` z dostępem.

Po każdej serii pomiarów środowisko wracało do stanu wyjściowego
(produkty 2, powiązania 2, zamówienia 0, zapisy 1, kontrola kod 0).

### Drugie znalezisko — złapał WŁASNY strażnik

Pierwsza wersja klasy dostarczania wołała `$order->set_status()` i `->save()`
u siebie, czyli pisała do wpisu poza warstwą zapisu — `straznik-platnosci-wp`
odrzucił to natychmiast (ta sama reguła wyprowadziła do warstwy trzy metody
przy P3a). Zapis przeniesiony do `Aai_Platnosci_Zapis::zamknij_zamowienie()`;
w klasie dostarczania została DECYZJA, w warstwie ZMIANA STANU. Bezpiecznik
na status stoi po stronie zapisu, bo między decyzją a zapisem może zadziałać
ktoś inny.

Po przeniesieniu wszystkie cztery ścieżki zmierzone ponownie — bez zmian
w wyniku (kurs + `payment_complete()` → `completed`; kurs ręcznie
`processing` → `completed`; mieszane → `processing`; cudzy → `processing`;
dostęp TAK).

## 6. Etap E1 — jedno źródło ceny (2026-08-29)

**Szew:** filtr `aai_sklep_cena_kursu` (grosze + kurs). Plugin 1 dostał
`Aai_Sklep_Widok::cena_grosze()` — jedyne miejsce, z którego front i dane
strukturalne biorą cenę; Plugin 2 dostał `Aai_Platnosci_Cena`, który podmienia
ją na cenę EFEKTYWNĄ z WooCommerce (`WC_Product::get_price()`, czyli
z promocją). Bez Pluginu 2 filtru nikt nie obsługuje i strona pokazuje cenę
katalogową — dokładnie jak dotąd.

**Sześć miejsc frontu** przeszło na `cena_grosze()`: karta katalogu, hero
(napis CTA i liczba), sekcja oferty, domykające CTA, `Offer.price` w JSON-LD.
**Panel kreatora został przy cenie katalogowej** (rozstrzygnięcie 4) — tak samo
warstwa danych, import, raport i kopia do Tutora, bo tam cena katalogowa
jest prawdą źródłową.

### Pomiar na żywej stronie

| Co | Bez promocji | Po ustawieniu promocji 99 zł w Woo |
|---|---|---|
| cena w treści strony kursu | `199,00 zł` | **`99,00 zł`** |
| `Offer.price` w JSON-LD | `199.00` | **`99.00`** |
| karta w katalogu | `199,00 zł` | **`99,00 zł`** |
| `price_grosze` w bazie (kreator) | 19900 | 19900 (bez zmian) |

Strona i dane strukturalne pokazują **tę samą liczbę** — czyli K2 z krytyki
zamknięte. Ceny prawdziwych kursów po całym pomiarze bez zmian
(299,00 zł i 349,00 zł).

**Pamięć na żądanie zmierzona, nie założona:** cztery odczyty tego samego
kursu (hero, oferta, napis przycisku, JSON-LD) dają **jedno** wywołanie filtra.

**Dwa testy negatywne:** produkt z pustą ceną → cena katalogowa (pusta cena
w Woo to brak danych, nie „za darmo" — „0 zł" na stronie sprzedażowej byłoby
gorsze); kurs bez powiązania z produktem → cena katalogowa.

## 7. Etapy E2–E4 — adres, CTA, dostępność (2026-08-29)

### E2 — rozszczepienie adresu

`adres_zakupu()` obsługiwał dwa różne znaczenia: przycisk „Dołączam" i zdanie
„Masz inne pytanie? **Napisz do nas**" pod FAQ. Oba prowadziły do kontaktu, więc
różnica była niewidoczna — do chwili, w której przycisk zaczął prowadzić do
kasy. Wtedy pytający klient trafiłby prosto do płatności. Metoda rozdzielona na
`adres_kontaktu()` (FAQ) i `cta_kursu()` (przycisk); starej nazwy nie ma
w kodzie ani razu.

### E3 — CTA w czterech stanach

Filtr `aai_sklep_cta_kursu` zwraca adres i napis; obsługuje go
`Aai_Platnosci_Cta`. Bez Pluginu 2 przycisk prowadzi do kontaktu, jak dotąd.

| Stan | Warunek | Adres | Napis |
|---|---|---|---|
| 1. sprzedaż zamknięta | flaga P4 nieustawiona | `/kontakt` | „Dołączam za 299,00 zł" |
| 2. klient ma kurs | zapis Tutora **ukończony** | `/szkolenia/moje/` | „Przejdź do kursu" |
| 3. zamówienie czeka na wpłatę | zapis Tutora w dowolnym statusie | `/szkolenia/moje/` | „Zamówienie w toku" |
| 4. zakup | sprzedaż otwarta, produkt `publish` | `/kasa/?add-to-cart=<id>` | napis z ceną |

**Stan 3 nie był w planie — wyszedł z pomiaru E5.** Przy przelewie zamówienie
stoi na `on-hold`, zapis Tutora też, a dostępu nie ma; bez tego stanu klient,
który właśnie zamówił kurs, widziałby zachętę „Dołączam za 299,00 zł"
i mógłby zamówić drugi raz. Pytamy o ZAPIS, nie o dostęp — `dostep` jest
prawdziwy także dla lekcji-zapowiedzi i dla administratora (pułapka z W6).

**„Prosto do kasy" zmierzone, nie założone:** po wejściu na
`/kasa/?add-to-cart=<id>` WooCommerce ustawia `woocommerce_items_in_cart = 1`
i `woocommerce_cart_hash`; to samo żądanie bez parametru nie ustawia żadnego
z nich. Pozycji nie widać w HTML, bo blok kasy dociąga je przez Store API —
dlatego pomiar idzie po ciasteczkach, a nie po treści strony.

**Dwa testy negatywne:** gość przy otwartej sprzedaży dostaje kasę (nie
„Przejdź do kursu"); kurs bez produktu dostaje kontakt.

### E4 — `PreOrder` → `InStock` z tego samego źródła

Filtr `aai_sklep_dostepnosc_kursu`. Obsługuje go **ta sama klasa i ta sama
metoda** `produkt_do_kupienia()`, z której korzysta przycisk — więc strona
mówiąca „kup teraz" nie może deklarować `PreOrder` ani odwrotnie. Dostępność
NIE pyta o oglądającego: dane strukturalne czyta robot, czyli gość, a stan
„mam już ten kurs" dotyczy jednego człowieka.

| Stan sprzedaży | `availability` w JSON-LD | `href` wszystkich trzech CTA |
|---|---|---|
| otwarta | `https://schema.org/InStock` | `/kasa/?add-to-cart=<id>` |
| zamknięta | `https://schema.org/PreOrder` | `/kontakt` |

Prawdziwe kursy w czasie całego pomiaru: `PreOrder` i `/kontakt` — bez zmian.

## 8. Etap E6 — dowody (2026-08-29)

**Strażnik** `straznik-platnosci-wp` dostał pięć niezmienników P3b, każdy
celujący w ZACHOWANIE, nie w nazwę (ta klasa błędu wracała trzykrotnie:
0.29.0, 0.44.0, 0.47.0):

| # | Niezmiennik | Co chroni |
|---|---|---|
| 14 | odmowa domknięcia na CUDZYM produkcie | zamówienie mieszane nie wygląda na zrealizowane |
| 15 | filtr obsługi oddaje wartość WEJŚCIOWĄ | cudze produkty zachowują zachowanie WooCommerce |
| 16 | przycisk pyta o ZAPIS (`is_enrolled`) | „Przejdź do kursu” nie dla zapowiedzi i admina |
| 17 | warunek sprzedaży badany **dokładnie raz** | przycisk i oferta nie mogą się rozjechać (K2) |
| 18 | dostępność nie pyta o oglądającego | oferta opisuje kurs, nie jednego człowieka |

Niezmiennik 17 celowo **liczy miejsca**, w których badany jest warunek
sprzedaży, zamiast pytać o nazwę metody — nazwa da się przemianować, a dwa
miejsca to zawsze możliwy rozjazd.

**Audyt mutacyjny: 183 → 188**, każda nowa mutacja z `oczekiwanySlad`.
Wynik: **186 złapanych, 0 przeoczonych, 0 martwych**.

**Smoke `npm run smoke:wp-zakup` — 27 sprawdzeń** na własnym kursie testowym,
ze sprzątaniem w `finally` (razem z produktem — smoke, który zostawia produkt,
każe następnym przebiegom mierzyć własne śmieci; sweep P2).

### Trzy testy negatywne — każdy trafia tylko w swój przypadek

| Co zepsute | Padło | Które sprawdzenia |
|---|---|---|
| filtr ceny wyłączony | **3 z 27** | cena na stronie, w JSON-LD i na karcie katalogu |
| filtr CTA wyłączony | **5 z 27** | cztery stany przycisku + dostępność oferty |
| dostarczanie wyłączone | **3 z 27** | obie ścieżki domykania + dostęp po opłacie |

**Test negatywny wykrył ślepe sprawdzenie w moim własnym smoke'u:** pierwsza
wersja pytała `katalog.includes("99,00 zł")`, a napis „199,00 zł” **zawiera**
„99,00 zł” — sprawdzenie przechodziło także wtedy, gdy karta pokazywała cenę
katalogową (padły 2 zamiast 3). Ta sama klasa co `endsWith("199.00")` przy P2.
Naprawione: cena wyciągana z klasy karty i porównywana wzorcem CAŁEJ wartości.

**Pułapka narzędziowa z tego etapu (warta zapamiętania):** w Pythonie
`io.open(p, "w").write(f(s))` **obcina plik, zanim policzy argument** — wyjątek
w `f(s)` zostawia plik pusty. Tak zniknął cały smoke (jeszcze niecommitowany).
Kolejność: najpierw policz treść i sprawdź ją asercją, dopiero potem otwieraj
plik do zapisu.

## 9. Przegląd przed PR-em (2026-08-29) — cztery znaleziska, wszystkie prawdziwe

Recenzent (Sonnet, **zamknięta lista 10 pytań** — decyzja właściciela o koszcie
tokenów, jak przy P3a), krytyk = agent główny, każde znalezisko potwierdzone
URUCHOMIENIOWO PRZED naprawą (`agenci/przeglad-pr/KRYTYK.md`).

| # | Znalezisko | Potwierdzenie | Naprawa |
|---|---|---|---|
| 1 | **Anulowane zamówienie blokowało zakup NA ZAWSZE.** Stan „Zamówienie w toku” pytał o samo ISTNIENIE zapisu Tutora, a Tutor tworzy zapis przy składaniu zamówienia i nigdy go nie kasuje — anulowanie tylko przestawia status | **zmierzone**: zamówienie → `cancelled` → zapis `cancelled` → CTA dalej „Zamówienie w toku”, przycisk zakupu zniknął | stan czyta STATUS zapisu; trwające to tylko `pending`, `on-hold`, `processing`. Status bierzemy przez `get_post_status()` z `ID` oddawanego przez `is_enrolled()` — bez własnego SQL-a do cudzej tabeli |
| 2 | **Produkt `publish` z pustą ceną obiecywał zakup**, którego WooCommerce odmawia (`is_purchasable()` wymaga niepustej ceny) | **zmierzone**: `is_purchasable() = NIE`, a CTA → `/kasa/?add-to-cart=`, oferta → `InStock` | `produkt_do_kupienia()` pyta też `is_purchasable()`; jedna zmiana naprawia przycisk I dane strukturalne, bo obie rzeczy pytają tej samej metody |
| 3 | **Domknięcie odwracało kolejność maili i notatek** — hak biegnie w środku cudzego przejścia statusu, więc reszta TAMTEGO przejścia dojeżdżała po nadaniu `completed` | **zmierzone na notatkach** 298–301: „z Processing na Completed” PRZED „z On hold na Processing”, mail „Processing” po mailu „Completed” | domknięcie odłożone na `shutdown`; po naprawie kolejność naturalna: Processing → mail „Processing” → mail „Completed” → Completed |
| 4 | **Cena bez podatku nie była pilnowana** — `get_price()` nie dolicza VAT-u, więc obietnica „na stronie ta sama liczba co w kasie” trzyma się tylko przy wyłączonym naliczaniu | potwierdzone w kodzie Woo + `woocommerce_calc_taxes = no` na instalacji | kontrola oddaje **kod 1**, gdy ktoś włączy podatki przed przeliczeniem ceny efektywnej (test negatywny: włączenie → kod 1, wyłączenie → kod 0) |

**Piąte pytanie recenzenta bez znaleziska** (nie szukać drugi raz): produkty
wariantowe (nasze kursy to zawsze `WC_Product_Simple`, a dla cudzych wariantów
filtr oddaje wartość wejściową), pamięć ceny na żądanie (zapis w kreatorze idzie
przez POST→redirect→GET, więc render to zawsze nowe żądanie), podwójne kliknięcie
CTA (`_sold_individually` — WooCommerce odmawia drugiego dodania), `ItemList`
katalogu (nie niesie ceny ani dostępności, więc nie ma czego rozjechać),
walidacja adresu z filtra (`esc_url` odfiltrowuje `javascript:`) oraz komplet
wywołań `::cta(` po zmianie sygnatury (trzy, wszystkie zaktualizowane).

### Dowody po naprawach

- `straznik-platnosci-wp`: **trzy nowe niezmienniki** (19 — pyta o kupowalność,
  20 — stan zamówienia po STATUSIE zapisu, 21 — domknięcie na koniec żądania).
- Audyt mutacyjny **188 → 191**, każda nowa z `oczekiwanySlad`; wynik:
  189 złapanych, 0 przeoczonych, 0 martwych.
- `smoke-wp-zakup` **27 → 32 sprawdzenia** (anulowanie, produkt niekupowalny
  ×2, kolejność notatek).
- **Trzy testy negatywne po naprawach**, każdy trafia tylko w swój przypadek:
  cofnięte `is_purchasable()` → 2 z 32; cofnięte filtrowanie statusów → 1 z 32;
  cofnięte odłożenie na `shutdown` → 1 z 32.

**Pułapka pomiaru z tego przeglądu:** nowy blok sprawdzeń wstawiony w środek
smoke'a zaburzył stan następnym blokom (klient miał już kurs, więc „Zamówienie
w toku” nie mogło paść, a B16 liczył zapisy od zera). Trzy padnięcia wyglądały
jak błąd kodu, a były błędem KOLEJNOŚCI w teście — blok trzeba było przenieść
na czysty stan.
