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
