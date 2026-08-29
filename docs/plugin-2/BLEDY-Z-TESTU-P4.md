# Błędy z testu ręcznego właściciela (P4, 2026-08-29) — i klasy do przeszukania

**Status: ZAPISANE, NIENAPRAWIONE.** Właściciel testował sam na `:8892` po
kroku P4 i znalazł trzy rzeczy. Naprawa i **szczegółowe polowanie na całe
klasy** odbywa się w NASTĘPNEJ sesji (kontekst tej był pełny).

Rejestr: [rejestr/znane-bledy.json](../../rejestr/znane-bledy.json),
wpisy **BLAD-023, BLAD-024, BLAD-025**.

## 1. Co zgłosił właściciel

| # | Objaw (jego słowami) | Co widać na zrzucie |
|---|---|---|
| **BLAD-023** | „nie da się kupić jednego kursu, zawsze w koszyku są 2" | klik „Dołączam" na kursie Claude → kasa z DWOMA kursami i **648,00 zł**; do tego komunikat „You cannot add another … to your cart" |
| **BLAD-024** | „sekcja po polsku powinna być" | kasa: „Order summary", „Contact information", „Billing address", „Payment options", „Add coupons" |
| **BLAD-025** | „po założeniu konta mail zepsuty" | „[Automatic AI…] **Password Changed**" od `WordPress <wordpress@127.0.0.1>`, goły tekst po angielsku |

## 2. Trop, którego NIE zdążyłem rozstrzygnąć

Na zrzucie kasy, pod pozycją „Jak poprawnie korzystać z Claude", widnieje
**`cudza edycja 1787936224`** — wygląda na metę POZYCJI ZAMÓWIENIA, czyli
napis wyświetlany klientowi pod nazwą produktu.

Sprawdziłem meta samego produktu 675 i 676 — **są czyste** (poza `total_sales`
i `_download_*`). Czyli ślad siedzi gdzie indziej: w metadanych pozycji
koszyka/zamówienia albo w danych sesji. Liczba wygląda na **znacznik czasu**,
a fraza „cudza edycja" pada w tym repo w komentarzu
`class-aai-platnosci-zapis.php` przy haku B13 (przywracanie znaczników po
cudzym zapisie produktu) — **podejrzenie: ślad po którymś smoke'u, który
symuluje cudzą edycję produktu i zostawia po sobie metę widoczną klientowi.**

**To jest pierwsza rzecz do rozstrzygnięcia po `/clear`** — bo jeśli
potwierdzone, znaczy że smoke pisze do danych, które widzi klient.

## 3. Klasy do przeszukania — SZCZEGÓŁOWO, w następnej sesji

Właściciel: „poszukaj podobnej klasy błędów bardzo szczegółowo, dużo ich jest".
Cztery klasy wyprowadzone z trzech objawów:

### Klasa A — obietnica przycisku ≠ to, co dostaje klient
BLAD-023 jest jej przypadkiem. Do przejrzenia **każde** miejsce, gdzie coś
obiecujemy liczbą albo nazwą: cena w hero, na karcie katalogu, w sekcji
oferty, w danych strukturalnych, w mailu, w koszyku, w kasie i w potwierdzeniu
zamówienia. Pytanie kontrolne: **czy klient, który kliknie, dostanie
DOKŁADNIE to, co przeczytał?**

### Klasa B — cudzy język na ścieżce klienta
BLAD-024. Do przejrzenia **każda strona i każdy komunikat, którego nie
piszemy sami**: koszyk, kasa, konto, odzyskiwanie hasła, komunikaty błędów
kasy, strony Tutora za logowaniem, maile WooCommerce. Uwaga przy naprawie:
część naszych smoke'ów asertuje ANGIELSKIE napisy — zmiana języka je wywali
i trzeba to zrobić świadomie, nie po cichu.

### Klasa C — maile spoza naszej warstwy
BLAD-025. Do wypisania **komplet** wiadomości, które mogą wyjść na ścieżce
klienta i właściciela: rdzeń WordPressa (zmiana hasła, reset, nowy
użytkownik), WooCommerce (nowe konto, otrzymane zamówienie, w realizacji,
zrealizowane, anulowane, zwrot, faktura), Tutor. Dla każdej rozstrzygnąć:
**zostaje / gasimy / przejmujemy** — i sprawdzić NADAWCĘ (dziś `wordpress@`
przy części z nich; na produkcji to SPF i spam).

### Klasa D — ślady testów widoczne dla klienta
Trop z sekcji 2. Do przejrzenia: co nasze smoke'i piszą do danych, których
NIE sprzątają — meta produktów i pozycji zamówień, sesje koszyka, konta,
opcje. Reguła z sweepu P2 („smoke, który zostawia produkt, każe następnym
mierzyć własne śmieci") ma tu drugą stronę: **śmieć widoczny klientowi jest
gorszy niż śmieć widoczny bramce.**

## 3b. BLAD-026 — znalezione przy sweepie, poważniejsze niż tamte trzy

**Instalacja używa HPOS.** Zamówienia mieszkają w `wp_wc_orders` (jest ich
**148**), a `SELECT COUNT(*) FROM wp_posts WHERE post_type='shop_order'`
oddaje **0** — pod HPOS ta tabela jest pusta z definicji.

Tym zapytaniem liczyły zamówienia **`smoke-wp-zakup` i `smoke-wp-maile`**
w swoim „rachunku sumienia" (*smoke nie zostawił zamówienia*) — czyli
porównywały **0 z 0** i przechodziły niezależnie od tego, ile śmieci
zostawiły. Stąd 148 zamówień narosłych przez wiele przebiegów. Tym samym
zapytaniem mierzyłem stan środowiska przez CAŁĄ tę sesję, więc **każde moje
zdanie „środowisko czyste, zamówienia 0" nie dowodziło niczego.**

Kontrola `wp aai-platnosci sprawdz` jest **czysta** — pyta przez
`wc_get_orders()`, czyli publiczne API, które czyta właściwy nośnik. To ona
złapałaby prawdziwy problem; ślepe były testy i moje pomiary.

Klasa jest ta sama co „sprawdzenie, które mówi »zero«, bywa ślepe po OBU
stronach" ze sweepu W2 — i **piąta klasa do przeszukania**: gdzie jeszcze
mierzymy cudze dane po strukturze, którą cudza wtyczka mogła zmienić?

## 4. Stan środowiska, w jakim to zostało

- **SPRZEDAŻ OTWARTA** (`wp aai-platnosci sprzedaz zamknij` żeby cofnąć),
  bramka: przelew bankowy.
- W skrzynce `http://127.0.0.1:8893` leży komplet z zakupu na
  `podglad@example.test` (mail 1, mail 2 i wiadomości WooCommerce) oraz
  zakupy właściciela.
- **148 zamówień** (HPOS), konta i zapisy z testów **NIE są posprzątane** — celowo,
  bo są materiałem dowodowym dla klas A–D. Sprzątać dopiero po ich zbadaniu.
- Kod P4 jest kompletny i przejrzany (10 commitów, wersja 0.50.0),
  bramki zielone. Te trzy błędy to **wynik testu ręcznego, nie regresja**.

---

# 5. ŚLEDZTWO PO `/clear` (2026-08-29) — wyniki

Każde zdanie niżej jest **zmierzone na `:8892`**, nie wyczytane z kodu.
Środowisko zastane: sprzedaż otwarta, 148 zamówień, konta z testu.

## 5.1 Trop „cudza edycja 1787936224" — ROZSTRZYGNIĘTY

To **nie meta**, tylko `post_excerpt` produktu **675** (krótki opis produktu
WooCommerce). Klient widzi go pod nazwą kursu **w kasie i w koszyku**, a
publiczne Store API oddaje go każdemu:

```
GET /wp-json/wc/store/v1/products/675
  short_description = "<p>cudza edycja 1787936224</p>"
```

Autorem NIE jest smoke: `smoke-wp-produkty.mjs:184` pisze `smoke-cudzy-zapis`
i tylko na produkt TESTOWY. To ślad po ręcznym dowodzeniu haka B13 na żywym
produkcie 675 w poprzedniej sesji.

**Przyczyna głębsza, ważniejsza niż sam śmieć:** `Aai_Platnosci_Zapis`
ustawia na produkcie nazwę, status, widoczność i cenę — **opisu nie dotyka
w ogóle**. Pole jest niczyje, więc cokolwiek tam wpadnie, klient to czyta.
A treść mamy gotową: `courses.short_desc` („Nie kolejne nagrania o AI, tylko
system pracy…") jedzie do Tutora i **nie jedzie do Woo**.

Do tego produkt **nie ma okładki** (`_thumbnail_id` pusty) — w kasie widać
szary placeholder zamiast kursu.

## 5.2 Zamówienia-widma: przyczyna była inna, niż zapisałem

BLAD-026 opisywał ślepy licznik. Prawdziwa przyczyna narastania śmieci jest
groźniejsza i też zmierzona:

```
$o = wc_create_order(); $id = 1627;
wp_delete_post( 1627, true );   → zamówień przed 148, po 148  (NIC NIE SKASOWAŁ)
wc_get_order( 1627 )            → NADAL ISTNIEJE (status pending)
$order->delete( true )          → skasowane
```

`smoke-wp-zakup.mjs:338` sprząta zamówienia przez `wp_delete_post()`, które
**pod HPOS nie kasuje niczego**. `smoke-wp-maile.mjs:389` robi to poprawnie
(`$o->delete( true )`).

**Kogo to dotyka:** 146 ze 147 zamówień należy do konta **`klient-test`** —
tego samego, na które właściciel loguje się do testu ręcznego (W6 wymaga
`npm run wp:klient`). Na `/my-account/orders/` widzi 146 pozycji
**„199,00 zł for 0 items"**. Jedyne prawdziwe zamówienie to #1625
(jan.testowy, 299,00 zł, 1 pozycja).

**Trzecia warstwa tej samej klasy:** `wc_get_orders( status => 'any' )` też
nie widzi wszystkiego — oddaje 147, a w tabeli jest 148. Brakujący wiersz to
`wc-checkout-draft` (porzucony koszyk), status, który Woo **zna**
(`wc_get_order_statuses()` go wymienia), ale `'any'` go nie obejmuje.
Rachunek sumienia przepisany na `wc_get_orders()` byłby ślepy na porzucone kasy.

## 5.3 BLAD-023 potwierdzony i domierzony

Świeża sesja gościa, dwa kliknięcia:

| krok | co obiecuje strona | co jest w kasie |
|---|---|---|
| „Dołączam za 299,00 zł" (Claude) | 299,00 zł | 299,00 zł ✔ |
| „Dołączam za 349,00 zł" (GitHub) | 349,00 zł | **648,00 zł** ✘ |
| ten sam kurs drugi raz | — | „You cannot add another … to your cart" |

Trzeci wiersz to skutek naszego `_sold_individually` (B14): my chcieliśmy
„jeden kurs", Woo rozumie „jedna sztuka **tego** produktu".

## 5.4 Obietnice bez pokrycia znalezione przy okazji (klasa A)

- **Regulamin nie istnieje.** Kasa mówi „By proceeding with your purchase you
  agree to our **Terms and Conditions** and **Privacy Policy**", a
  `woocommerce_terms_page_id` jest **puste** — zdanie idzie bez linków.
- **Polityka prywatności celuje w szkic WordPressa**: `wp_page_for_privacy_policy = 3`
  → strona „Privacy Policy", status **`draft`**, treść to domyślne
  „Suggested text: Our website address is:". Prawdziwa polityka motywu leży
  pod ID 21 („Polityka prywatności", `publish`).
- **Katalog obiecuje „30 dni gwarancji zwrotu"** i „Dostęp bez limitu", a
  zwroty to dopiero P5 — procedury nie ma.
- **Region dla czytników ekranu na kasie mówi nieprawdę**: „There are no
  payment methods available. Please contact us for help placing your order."
  — element `div.a11y-speak-region`, 1×1 px, `clip: inset(50%)`, więc **oko
  go nie widzi, czytnik ekranu odczytuje**. Przelew bankowy jest wybrany
  i „Place Order" działa. To usterka dostępności, nie blokada zakupu.
- **Konto mówi o wysyłce:** „manage your shipping and billing addresses" przy
  kursie cyfrowym; zakładka **„Downloads"** jest pusta i pusta zostanie —
  produkt NIE jest `downloadable` (zmierzone: `is_downloadable() = nie`).

## 5.5 Klasa B — mapa cudzego języka na ścieżce klienta

Instalacja stoi na **`en_US`**, `wp language core list --status=installed`
jest **pusta**, `wp-content/languages` nie istnieje. Sieć z kontenera działa
i paczka `pl_PL` jest do pobrania — naprawa wykonalna.

| miejsce | co widzi klient |
|---|---|
| kasa | Contact information · Billing address · Payment options · Order summary · Add coupons · Place Order · Add a note to your order · „has been added to your cart" · „Total price for 1 … item" |
| koszyk | Products in cart · PRODUCT · DETAILS · TOTAL · CART TOTALS · Estimated total · Proceed to Checkout |
| logowanie | Username or email · Password · Remember me · Log in · Lost your password? |
| **ustawianie hasła z naszego maila** | **„Enter a new password below. New password \* Required … Save"** |
| konto | Dashboard · Orders · Downloads · Addresses · Account details · Log out · „Hello Klient Testowy (not …? Log out)" |
| zamówienia | Order · Date · Status · Total · Actions · Processing · Completed · Cancelled · „for 0 items" |
| edycja konta | First name · Last name · Display name · Password change · Save changes |

Najgorszy punkt to wiersz pogrubiony: **pierwszy krok klienta po zakupie**
prowadzi z polskiego maila premium na angielski ekran.

## 5.6 Klasa C — komplet poczty ze skrzynki (6 wiadomości)

| nadawca | temat | język | czyje |
|---|---|---|---|
| `Automatic AI <admin@example.test>` | Ustaw hasło i wejdź na swoje konto | PL | **nasze** |
| `Automatic AI <admin@example.test>` | Twój kurs jest gotowy | PL | **nasze** |
| `Automatic AI <admin@example.test>` | Your … order has been received! | EN | Woo → klient |
| `Automatic AI <admin@example.test>` | Your … order is on its way! | EN | Woo → klient |
| `Automatic AI <admin@example.test>` | You've got a new order: #1625 | EN | Woo → właściciel |
| **`WordPress <wordpress@127.0.0.1>`** | **[…] Password Changed** | EN | rdzeń WP (BLAD-025) |

Dwóch nadawców w jednej ścieżce. Nasze maile są zdrowe (sprawdzone: polskie,
linki do naszych stron, klucz resetu w mailu 1, `/szkolenia/moje/` w mailu 2).

## 5.7 Klasa E — gdzie jeszcze pytamy o cudzą strukturę

- **Kod wtyczek jest czysty pod tym kątem**: zamówienia czytamy przez
  `wc_get_orders()`, a typ wpisu kursu bierzemy od Tutora
  (`tutor()->course_post_type`, `class-aai-platnosci-zapis.php:477`).
- **Jeden rozjazd u nas**: `class-aai-platnosci-ustawienia.php:591` ma
  `post_type = 'courses'` wpisane na sztywno w `JOIN`, choć sąsiedni plik
  pyta o to Tutora. Zmiana typu po stronie Tutora oślepi kontrolę zamiast ją
  zaczerwienić.
- Zapisy kursanta czytamy po `post_type='tutor_enrolled'` w `wp_posts` — dziś
  to prawda (Tutor 4.0.7), ale to ta sama klasa co HPOS: cudza wtyczka może
  przenieść nośnik i nasze „zero" przestanie cokolwiek znaczyć.

## 5.8 Co ta sesja zostawiła w środowisku

- Skasowane: zamówienie kontrolne **1627** (dowód na `wp_delete_post`).
- Zostawione: **dwie sesje koszyka gościa** z produktami (pomiar BLAD-023),
  wygasną same; 147 zamówień i konta — nietknięte, jak prosił właściciel.

---

# 6. NAPRAWY N1–N6 — ZROBIONE (2026-08-29, wersja 0.51.0)

Wszystkie pięć klas przeszukane, sześć etapów wykonanych, każdy zamknięty
osobnym commitem dopiero po weryfikacji uruchomieniowej. Pełny rozpis:
CHANGELOG 0.51.0. Rejestr: BLAD-023…026 rozliczone, dopisane **BLAD-027**
(pole widoczne klientowi było niczyje) i **BLAD-028** (pomiar oparty na
cudzym tekście umiera po zmianie języka).

| etap | co naprawione | dowód |
|---|---|---|
| N1 | opis i nazwa produktu z `courses.short_desc` / `title`, oba przez `wp_slash()`; kontrola widzi rozjazd | smoke wp-produkty **84** |
| N2 | w koszyku zostaje jeden nasz kurs, cudze produkty nietknięte; „już w koszyku" to `notice`, nie `error` | smoke wp-zakup **38** |
| N3 | `postaw.sh` ustawia pl_PL i weryfikuje artefaktem; nowy `smoke-wp-jezyk` | smoke wp-jezyk **24** |
| N4 | jeden nadawca poczty — tylko wartość domyślna WordPressa | smoke wp-maile **46** |
| N5 | sprzątanie przez `$order->delete()`, liczenie jawną listą statusów | test negatywny: „przed 195, po 202" |
| N6 | typ wpisu pytany u Tutora, polityka prywatności wskazuje stronę motywu | kontrola kod 1 → 0 |

## 6.1 Co znalazł dopiero SWEEP (nie etapy)

**`smoke-wp-motyw` zamykał sklep za sobą.** Otwierał sprzedaż na czas pomiaru
koszyka, a w `finally` robił `delete_option()` — czyli zamykał ją niezależnie
od stanu zastanego. Do P4 bez znaczenia (sprzedaż i tak była zamknięta), po P4
mylące: po przebiegu bramek wyglądu strona kursu przestaje pokazywać przycisk
zakupu i wygląda to jak awaria. Trafiłem na to, gdy krzyżowy pomiar ścieżki
klienta padł na braku przycisku. **„Przywróć stan" to co innego niż „skasuj
ustawienie".**

## 6.2 Krzyżowa weryfikacja N1×N2×N3 na jednym ekranie

Ścieżka właściciela z testu ręcznego (klik Claude → klik GitHub), zmierzona
w przeglądarce po naprawach:

```
opis kursu w kasie : jest („GitHub wytłumaczony po ludzku…")
„cudza edycja"     : brak
kursów w kasie     : 1  (349,00 zł — dokładnie tyle, co obiecał przycisk)
angielskie frazy   : 0
```

## 6.3 Stan dowodów i środowiska na koniec

`npm run check` **kod 0** (strażnicy 35/35, testy 83/83, lint, tsc, build,
7 smoke'ów prototypu), audyt mutacyjny **217** (215 złapanych, 0 przeoczonych,
0 martwych), smoke'i WP: motyw **90** · kreator 96 · produkty 84 · front 84 ·
maile 46 · tutor 44 · zakup 38 · lekcja 36 · dane 30 · język 24 · płatności 23
· panel 54; `wp:sprawdz` 73/73 co do znaku, `wp:tutor` 0 różnic, `postaw.sh`
kod 0, `aai-platnosci sprawdz` kod 0.

Środowisko `:8892`: **1 zamówienie** (prawdziwy zakup właściciela #1625 —
materiał dowodowy), 2 produkty, 2 powiązania, 9 dostaw, 3 konta, **sprzedaż
OTWARTA**. Konto `klient-test` ma **0 zamówień** — było 146.

## 6.4 Decyzje właściciela (2026-08-29, po merge'u 0.51.0)

Zadane jako pytania doprecyzowujące, rozstrzygnięte przez właściciela.
**Wszystkie trzy są DO WYKONANIA — żadna nie jest jeszcze w kodzie.**

| # | rzecz | rozstrzygnięcie | co to znaczy wykonawczo |
|---|---|---|---|
| 1 | **regulamin** | **zdejmujemy zdanie** z kasy do czasu, aż regulamin powstanie | Woo drukuje „Kontynuując zamówienie wyrażasz zgodę na nasze Warunki i zasady oraz Politykę prywatności" z bloku kasy. Polityka ZOSTAJE (jest podpięta i klikalna) — znika tylko powołanie się na nieistniejące „Warunki i zasady". Regulamin i tak będzie potrzebny przed pierwszym klientem, razem z prawdziwą bramką płatności |
| 2 | **gwarancja 30 dni** | **zostaje** — obietnicę ma zrealizować P5 | To jest **WYMAGANIE DLA P5**, nie pozycja otwarta: zwrot w 30 dni ma działać i odbierać dostęp do kursu. Sprzedaż i tak nie ruszy przed P5 (bramka testowa `bacs`, środowisko robocze), więc żaden prawdziwy klient nie zdąży się na nią powołać |
| 3 | **okładka produktu** | **renderujemy PNG przy synchronizacji** | Okładka SVG z wtyczki ma być zamieniona na PNG i wgrana do mediów jako miniatura produktu — klient widzi prawdziwą okładkę, a biblioteka mediów NIE musi przyjmować SVG (świadomie odrzucone: SVG może nieść skrypt). Przy wykonaniu sprawdzić, co da się zrobić **bez dokładania zależności** |

**Kolejność dalszych prac (decyzja właściciela 2026-08-29):**
**test ręczny właściciela na 0.51.0 → dopiero potem P5.** Uzasadnienie jest
w tym dokumencie od początku: właściciel znalazł klikaniem pięć rzeczy, których
nie złapało 35 strażników, 201 mutacji i jedenaście smoke'ów. Trzy decyzje
powyżej wchodzą razem z poprawkami z tego testu — jedną gałęzią, żeby P5
zaczynało się na czystym stanie.

## 6.5 Zapis historyczny — co było otwarte przed tymi decyzjami

- **Regulamin** — kasa mówi „wyrażasz zgodę na nasze Warunki i zasady",
  a strony nie ma (`woocommerce_terms_page_id` puste). Polityka prywatności
  jest już podpięta i klikalna.
- **Gwarancja zwrotu 30 dni** obiecywana w katalogu, przy zwrotach
  zaplanowanych dopiero na P5.
- **Okładka produktu w kasie** — dziś szary zastępnik. Nasze okładki to pliki
  SVG we wtyczce, a WordPress domyślnie nie przyjmuje SVG do biblioteki
  mediów; do rozstrzygnięcia: zostawić, renderować PNG przy synchronizacji,
  albo dopuścić SVG.
