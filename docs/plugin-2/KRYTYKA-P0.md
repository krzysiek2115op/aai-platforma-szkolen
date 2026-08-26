# Krytyka schematu P0 — znaleziska do wprowadzenia

**Stan: schemat [DIAGRAM.md](DIAGRAM.md) NIE jest jeszcze poprawiony.** Ten plik
jest listą roboczą: każde znalezisko ma wagę, dowód i proponowane rozwiązanie.
Następna sesja ma je wprowadzić **jednym przepisaniem** dokumentu, a nie
poprawką po poprawce.

Przegląd prowadzony metodą z przeglądu B7: **trzech krytyków na rozłącznych
obszarach**, agent główny jako krytyk krytyków. Żadne znalezisko nie idzie do
naprawy bez niezależnego potwierdzenia w kodzie.

| Krytyk | Obszar | Stan |
|---|---|---|
| A | architektura i zgodność z kontraktami Pluginu 1 | **oddał, 14 znalezisk** |
| C | prostota, sprawdzalność niezmienników, realizm planu | **oddał, 19 znalezisk** |
| B | cudzy kod, wyścigi, baza, bezpieczeństwo, przypadki brzegowe | **oddał, 21 znalezisk — 5 krytycznych** |

---

## RZECZY, KTÓRE MUSZĄ ZMIENIĆ PROJEKT (krytyczne)

### K1. Klient dostaje konto, do którego nie ma jak wejść *(krytyk C)*

Konto powstaje przy **złożeniu** zamówienia, a jedyny mail z linkiem do hasła
wisi w schemacie na `completed`. Każde zamówienie, które tam nie dojdzie —
nieudana płatność, porzucona kasa, a przede wszystkim **`bacs → on-hold`, czyli
metoda testowa z P3** — zostawia konto z automatycznie wygenerowanym hasłem,
którego nikt nigdy nie pokazał, i zero wiadomości.

*Dowód:* DIAGRAM.md:70 (`L` podpięte tylko do `J`), :96 („mail
`customer_new_account` Woo wyłączamy"), :102 („zamówienie zatrzyma się na
`on-hold`"); `woocommerce_registration_generate_password = yes` w instalacji.

*Rozwiązanie:* **dwie wiadomości, bo to dwa różne zdarzenia.** „Ustaw hasło
i wejdź" na `woocommerce_created_customer`; „Twój kurs jest gotowy" na przejściu
do `completed`. Kolizja dwóch kluczy hasła znika sama, bo tylko jedna niesie
`get_password_reset_key()`. Znacznik idempotencji pierwszej siedzi na
**użytkowniku**, drugiej — na **zamówieniu** (poprawka do niezmiennika 7).
Bramka P4 dostaje trzeci przypadek: „zamówienie `bacs`, które nigdy nie doszło
do `completed` — klient dostał link do hasła".

### K2. Cena na stronie rozjedzie się z ceną w danych strukturalnych *(krytyk A)*

Schemat każe czytać cenę **efektywną** z Woo na front, a `Offer.price` w JSON-LD
dalej liczy z naszej kolumny. Jedna promocja ustawiona w Woo i strona mówi
„249 zł", a dane strukturalne „299.00" — przy czym komentarz w naszym własnym
kodzie ostrzega, że rozjazd oferty z rzeczywistością jest powodem do kary od
wyszukiwarki.

*Dowód:* `class-aai-sklep-seo.php:281` (`'price' => number_format( price_grosze / 100 … )`)
obok `:283`, komentarz `:256-260`; DIAGRAM.md sekcja 3 i 9.2.

*Rozwiązanie:* filtr obejmuje **także `Offer.price`** (i `priceValidUntil`),
a niezmiennik brzmi: *cena na stronie i cena w danych strukturalnych pochodzą
z tego samego wywołania*. Trzeciej możliwości nie ma — albo obie z Woo, albo
obie nasze.

### K3. Filtry ceny nie mają JAK się dowiedzieć, o który kurs chodzi *(krytyk A)*

`adres_zakupu()` nie przyjmuje ani jednego argumentu, `cta()` dostaje samą cenę
w groszach, `formatuj_cene()` dostaje `int`. `Aai_Sklep_Trasy::kurs()` zwraca
`null` wszędzie poza widokiem kursu — czyli **w katalogu, gdzie karty renderują
się w pętli**, „bieżący kurs" nie istnieje.

*Dowód:* `class-aai-sklep-widok.php:163`, `:318`, `:127`; `szablony/katalog.php:15`
i `:212`; `class-aai-sklep-trasy.php:195-207`.

*Rozwiązanie:* `adres_zakupu()`, `cta()` i nowe `cena_wyswietlana()` przyjmują
**tablicę kursu** (mają ją wszystkie miejsca wywołania: `hero.php:53,57`,
`czesci/cena.php:22,83`, `czesci/final-cta.php:26`, `czesci/karta.php:52`),
a filtr dostaje kurs drugim argumentem. Sekcja 9 musi **wymienić zmianę
sygnatur i cztery szablony** — inaczej „trzy zmiany, każda minimalna" jest
nieprawdą, którą odkryje dopiero implementacja.

### K4. Cztery niezmienniki nie dają się sprawdzić skryptem *(krytyk C)*

Sekcja 7 obiecuje „każdy sprawdzalny skryptem, nie oceną", a #1, #2, #6 i #12 są
kwantyfikatorem obejmującym cudzy kod, własnością przepływu danych albo
intencją. **#6 celuje w NAZWĘ** (`->save()`) — czyli w tę samą pułapkę, która
w tym repo zzieleniała już dwa razy (0.29.0, 0.44.0).

*Rozwiązania, każde mierzalne:*
- **#1** (nikt poza nami nie pisze do produktu) → pomiar stanu: `sha256` wiersza
  produktu razem z meta **przed i po** operacji, która produktu dotyczyć nie ma
  (`wp aai-sklep sync`, `import`, zapis lekcji) — równość wymagana. Ten sam
  chwyt, którym `smoke-wp-tutor` dowodzi, że przebieg niczego nie zostawił.
- **#2** (jednokierunkowość) → wtyczka `aai-platnosci` **nie zawiera ani jednego**
  `$wpdb->insert|update|delete|replace`, `INSERT INTO|UPDATE |DELETE FROM`
  ani wywołania `Aai_Sklep_Zapis::`. Greppable i obejmuje wszystkie drogi
  powrotne, nie tylko cenę.
- **#6** (`_tutor_product` po zapisie) → (a) `->save()` na produkcie pada
  w **dokładnie jednym** miejscu wtyczki (mutacja „dodaj drugie miejsce" jest
  czerwona); (b) smoke po KAŻDEJ ścieżce zapisu czyta `_tutor_product` z bazy
  i wymaga `yes`.
- **#12** (`adres_zakupu()` tylko do zakupu) → lista dozwolonych miejsc (plik +
  funkcja) zamiast słowa „zakup", plus **kontrprzykład w audycie mutacyjnym**:
  wstawienie `adres_zakupu()` do `faq.php` musi zapalić strażnika. Powiedzieć
  też, CZYJ strażnik tego pilnuje (dziś `straznik-frontu-wp`).
- **#4** (dzielenie przez 100) → nie grep, tylko smoke: zapisz `29999` →
  `get_regular_price('edit') === '299.99'`.

---

## RZECZY, KTÓRE UPRASZCZAJĄ ALBO UODPARNIAJĄ PROJEKT

### U1. Dostęp klienta nie musi wisieć na cudzej opcji *(krytyk C)*

Warunek Tutora ma cztery człony, z których każdy potrafi go wyłączyć bez
objawu, a `monetize_by` **sam wraca na `free`** po deaktywacji Woo. Tymczasem
WooCommerce domyka zamówienie sam, gdy pozycja jest wirtualna **i do pobrania** —
Tutor ustawia tylko `_virtual`, ale to jego ograniczenie, nie nasze.

*Dowód:* `woocommerce/includes/class-wc-order.php:1884` i `:174`;
`tutor/classes/WooCommerce.php:1020`; `tutor/classes/Course.php:3409`.

*Rozwiązanie:* na **naszym** produkcie ustawiać `_downloadable = 'yes'` (bez ani
jednego pliku) obok `_virtual`; opcja Tutora zostaje drugim pasem
bezpieczeństwa. **Nie przyjmować na słowo** — bramka P3 ma przejść ścieżkę
`processing → completed` z **wyłączonym** auto-complete Tutora. Jeśli pomiar nie
potwierdzi, zostaje wersja z diagramu, ale z pomiarem, nie z założeniem.

### U2. Nowa akcja w Pluginie 1 jest niepotrzebna *(krytyk C)*

`Aai_Sklep_Tutor::na_zmianie()` wisi na priorytecie **10**, więc słuchacz na
priorytecie **20** zastaje kopię w Tutorze już zrobioną — bez zmiany w cudzej
wtyczce. Jedyny wyjątek to import masowy (kopia wstrzymana), a tam i tak trzeba
odpalić komendę.

*Dowód:* `class-aai-sklep-tutor.php:103`; `class-aai-sklep-import.php:119`.

*Rozwiązanie:* priorytet 20 + `wp aai-platnosci sync`, która i tak musi
powstać (U3). Sekcja 9 schodzi z trzech zmian w Pluginie 1 do dwóch, znika jedno
API między wtyczkami. **Niezmiennik do dopisania:** co się stanie, gdy ktoś
zmieni priorytet Tutora.

### U3. Na istniejącej instalacji aktywacja nie stworzy ani jednego produktu *(krytyk C)*

Cały przepływ jest **wypychany** zdarzeniem zapisu kursu. Nasze dwa kursy siedzą
w tabelach od W2 i nikt ich dziś nie zapisuje — więc po aktywacji wtyczki
zostają niesprzedawalne, a jedyną naprawą jest ręczne kliknięcie „Zapisz kurs"
na każdym z osobna.

*Rozwiązanie:* `wp aai-platnosci sync [<slug>]` i `wp aai-platnosci sprawdz`
(wzorem `sprawdz-tutora`, kod wyjścia 1 przy rozjeździe), `sync` podpięty do
**aktywacji wtyczki**, i dopisek w CLAUDE.md: odtworzenie środowiska od zera
wymaga odtąd **czterech** komend, nie trzech.

### U4. AJAX z sekcji 8 wykreślić *(krytycy A i C, niezależnie)*

W całej wtyczce `aai-sklep` **nie ma ani jednego `wp_ajax_*`** — wszystkie akcje
kokpitu idą przez `admin-post.php` z `check_admin_referer` + `current_user_can`,
i tego pilnuje strażnik. Formuła schematu „autoryzacja jak w kreatorze W4" jest
nieścisła: W4 nie ma AJAX-a. Do tego naprawę jednego kursu **już da się zrobić**
przyciskiem „Zapisz kurs" (zapis bez zmian też wysyła kopię) oraz komendą.

*Dowód:* `class-aai-sklep-panel-akcje.php:56-59` i `:50-54`;
`straznik-kreatora-wp.mjs:218-250`; `grep -rn "wp_ajax" wordpress/wtyczki/aai-sklep/`
→ zero trafień; `class-aai-sklep-zapis.php:780-805`.

*Rozwiązanie:* sekcja 8 staje się jednym zdaniem — **„Plugin 2 nie wprowadza
żadnego własnego AJAX-a"** — co jest mocniejszym niezmiennikiem i tańszym
w pilnowaniu niż kontrakt jednej operacji. W kokpicie zostaje komunikat
o rozjeździe (jak dziś ostrzeżenie o kopii do Tutora) plus zdanie „kliknij
Zapisz kurs, żeby naprawić". Naprawa zbiorcza jedzie komendą z U3.

> **UWAGA — to wymaga rozstrzygnięcia właściciela**, bo koliduje z jego
> poleceniem „ajax z bazy danych" w schemacie. Odpowiedź, którą trzeba mu
> przedstawić: **w języku WordPressa wystrzałem JEST `admin-post.php`** — jeden
> kanał platformy, do którego podpina się nazwane akcje, każda z własnym
> kontraktem. Plugin 1 tak właśnie działa. Szkielet z WYTYCZNE §8 zostaje
> w całości, zmienia się tylko nazwa kanału.

---

## LUKI DO UZUPEŁNIENIA

| # | Luka | Dowód | Rozwiązanie |
|---|---|---|---|
| L1 | Brak wymogu łapania `Throwable` w słuchaczu — niezłapany wyjątek wyleci przez `zapisz_kurs()` i właściciel zamiast „Kurs zapisany" zobaczy błąd krytyczny; przy imporcie przerwie cały przebieg *(A)* | `class-aai-sklep-tutor.php:170-177`, `zapis.php:795-806`, `import.php:119-161` | niezmiennik + strażnik: każda metoda podpięta pod `aai_sklep_*` ma `catch ( Throwable` |
| L2 | Brak kanału ODCZYTU: akcja niesie sam uuid, a nie ma publicznego odczytu kursu po uuid (`szczegoly_kursu()` bierze **slug**, `dane_kursu()` prywatna, `Odczyt_Panelu` to warstwa panelu) *(A)* | `zapis.php:805`, `odczyt.php:90`, `odczyt-panelu.php:145` | trzeci argument akcji z gotową kartą kursu **albo** `Aai_Sklep_Odczyt::kurs_po_id( string $uuid )` — to realna kolejna zmiana w Pluginie 1, policzyć ją teraz |
| L3 | Deaktywacja Pluginu 2 **nie cofa** ustawień cudzych wtyczek — zostaje zgaszony mail Woo „nowe konto", więc każde nowe konto jest bez linku do hasła *(A)* | DIAGRAM.md sekcja 5 kontra 9.2 („bez Pluginu 2 wszystko zostaje jak dziś") | kolumna **„co przy deaktywacji"** przy każdej pozycji; zdanie z 9.2 ograniczyć do frontu, bo w obecnym brzmieniu jest nieprawdziwe |
| L4 | Brak historii wycofania: po deaktywacji produkty zostają `publish` i dalej sprzedawalne przez `?add-to-cart` *(C)* | brak sekcji o `uninstall.php`; wzorzec: `aai-sklep/uninstall.php:5-17` | deaktywacja przestawia produkty kursów na `draft` (nie kasuje — niezmiennik 13 zostaje); `uninstall.php` domyślnie nie rusza niczego i mówi, co zostawia; bramka P1: „po deaktywacji żaden produkt kursu nie jest kupowalny" |
| L5 | Sekcja 4 nie zna `aai_sklep_kurs_usuniety`, choć 6.1 wymaga na nie reakcji *(C)* | `zapis.php:125` kontra DIAGRAM.md:239 | druga krawędź w grafie + niezmiennik „po usunięciu kursu produkt ma status `draft`" + smoke z testem negatywnym |
| L6 | Brak stanu CTA **„masz ten kurs"** — kupujący dalej widzi „Dołączam za…" i może kupić drugi raz *(C)* | DIAGRAM.md:310 kontra `class-aai-sklep-moje.php` | trzeci stan CTA: zapisany → „Przejdź do kursu" (pierwsza nieodhaczona lekcja). **Pytać o ZAPIS, nie o `dostep`** — to już raz w tym repo pomyliło zapowiedź z zakupem (W6) |
| L7 | Po P3 smoke Pluginu 1 zacznie padać bez Pluginu 2 — twardo asertuje `/kontakt` i `PreOrder` *(A)* | `smoke-wp-front.mjs:194-195`, `:213-214` | oba sprawdzenia **warunkowe wobec aktywności `aai-platnosci`**; smoke przechodzi w OBU konfiguracjach |
| L8 | „Wygląd koszyka i kasy" jest dziś obowiązkiem Pluginu 1; dwa arkusze dwóch wtyczek na tym samym cudzym markupie = klasa błędu z 0.40.0 *(A)* | `class-aai-sklep-styl-woo.php:11-15`, `:60-62`; `zasoby.php:74-88` | napisać wprost: to ROZSZERZENIE `aai-sklep/assets/woo-motyw.css`; gdyby miało być w Pluginie 2 — pyta `Aai_Sklep_Zasoby::strona_woo()` i nie ma własnego warunku |
| L9 | Plugin 1 **zdejmuje wszystkie zasoby Woo** z naszych stron — każda wersja CTA z JS-em padnie bez jednego objawu *(A)* | `zasoby.php:83-88`, `:190-202`, `:205-218` | zdanie w sekcji 2: CTA jest zwykłym odnośnikiem GET **dlatego**, że zasoby Woo nie wchodzą na nasze strony; + niezmiennik „żadna nasza strona nie zależy od skryptu Woo" |
| L10 | Niezmiennik 11 (`PODSTRONY`) jest **niewykonalny** — stała prywatna, brak punktu rejestracji; a koszyk i kasa to **strony WP**, nie reguły przepisywania, więc BLAD-021 tej ścieżki nie dotyczy *(A i C)* | `trasy.php:81`, `:121-128`; `straznik-frontu-wp.mjs:328-336`; `woocommerce_cart_page_id=6`, `checkout=7` | napisać wprost „Plugin 2 nie dodaje żadnej trasy"; regułę BLAD-021 zostawić jako warunek **na przyszłość**, z adnotacją, że wymagałaby otwarcia `PODSTRONY` filtrem |
| L11 | Ta sama warstwa **ustawia i sprawdza** ustawienia — kontrola mierzy skutek własnego działania i nigdy nie będzie czerwona; a przy Woo wyłączonym przeczy bramce P1 *(C)* | DIAGRAM.md:185 kontra :267 i :351 | rozdzielić trzy role: **ustawianie** przy aktywacji i na `--napraw`, **kontrola** nigdy nie pisze, **stan „Woo wyłączone"** kończy się 0 z komunikatem (1 rezerwujemy dla działającego Woo z innym ustawieniem) |
| L12 | Tabela 6.1 mówi „brak produktu" w dwóch znaczeniach i w jednym z nich łamie niezmiennik 13 *(C)* | DIAGRAM.md:236-237 kontra :238 i :272 | rozbić na dwie kolumny: „gdy produktu jeszcze nie ma" / „gdy produkt już istnieje" (w obu przypadkach `draft`); dopisać, co z `_tutor_course_price_type` |
| L13 | `_aai_zrodlo_uuid` na produkcie = jeden klucz, dwóch właścicieli, dwa znaczenia *(A)* | `tutor.php:52`, `:812-824`; `trasy.php:347`; `moje.php:199-212` | własny klucz `_aai_platnosci_kurs_uuid` (dane Pluginu 2 pod własnym przedrostkiem) albo niezmiennik „każde wyszukanie po `_aai_zrodlo_uuid` podaje `post_type`" |
| L14 | `aai_platnosci_blad` „na ekran kreatora, jak przy Tutorze" — takiego haka nie ma *(A)* | `panel.php:564-585`, wywołania w `lista.php:24`, `kurs.php:81`, `lekcja.php:55` | albo `admin_notices` na ekranach `aai-sklep*`, albo `do_action( 'aai_sklep_stan_kopii' )` jako kolejna zmiana w Pluginie 1 |
| L15 | Sekcja 1 po cichu przenosi punkt 2 zakresu (zapis na kurs po opłacie) do Tutora *(A)* | `ETAP-WP.md` tabela czterech punktów kontra DIAGRAM.md sekcja 1 | jedno zdanie: „punkt 2 okazał się gotowy w Tutorze — zamiast go pisać, **włączamy** go ustawieniem i pilnujemy asercją" |
| L16 | „Kontrola rozjazdu **trzech** kopii ceny" dubluje `sprawdz-tutora`, które już porównuje `_aai_cena_grosze` — a tej kopii w repo **nikt nie czyta** *(C)* | `tutor.php:443`, `:326-331` | poprawić na „kontrola rozjazdu **naszej tabeli z produktem Woo**"; kopia w Tutorze zostaje daną historyczną, pilnuje jej `sprawdz-tutora` |
| L17 | Dokument stoi na internals Tutora 4.0.7 i Woo 11.0.1, a jedyną odpowiedzią jest „przypięcie wersji" — które nie wykrywa aktualizacji z kokpitu, a Woo nie jest w ogóle wymienione *(C)* | DIAGRAM.md:344, :15 | `wp aai-platnosci sprawdz` **porównuje wersje** z tymi, na których dowiedziono łańcuch, i przy różnicy mówi, co przemierzyć (kod 0 z ostrzeżeniem — aktualizacja to nie awaria); + lista trzech faktów do potwierdzenia po aktualizacji |

## BRAMKI DO POPRAWIENIA

| Krok | Co jest źle | Jak ma być |
|---|---|---|
| **P2** | „import ×3 → `0/0/N bez zmian`" mierzy liczniki **Pluginu 1**, nie produkty — przejdzie także wtedy, gdy produkty tworzą się od nowa przy każdym przebiegu *(C)* | liczba produktów po 1., 2. i 3. przebiegu identyczna; zero `INSERT`-ów typu `product` w 2. i 3.; `sha256` wiersza produktu + meta niezmieniony między 2. a 3. Druga połowa (kod 1 na zepsutej cenie) jest dobra — zostaje |
| **P3** | trzy kroki w jednym, w tym obszar, który w tym projekcie wracał trzy razy jako osobna naprawa (0.38.0, 0.40.0, W6); „adresy PL" nie występują nigdzie indziej w dokumencie *(C)* | rozbić na **P3a** (ustawienia + adresy + koszyk i kasa w wyglądzie motywu; bramka: `smoke-wp-motyw` z asercją „zakres trafił w ≥1 element") i **P3b** (CTA, cena z Woo, `InStock`, przebieg zakupu obiema ścieżkami). Rozstrzygnąć, co znaczy „adresy PL" i co ze stronami Tutora 151/152 |
| **P5** | „smoke na każdym przypadku z sekcji 10" jest niewykonalne — cztery z jedenastu wierszy sekcja 10 sama zostawia bez dowodu, a jeden wymagałby Tutor Pro *(C)* | czwarta kolumna **„dowód"** w sekcji 10 z wartością `smoke` / `kontrola` / `świadomie otwarte`; P5 = „każdy wiersz ma niepustą kolumnę dowodu, a każdy wiersz `smoke` ma test negatywny" |

## DROBIAZGI

- Sekcja 5 podaje „tryb gościa Tutora → wyłączone" bez adnotacji „(już jest)" —
  `enable_guest_course_cart` jest w tej instalacji **już** `false`. Dołożyć
  kolumnę **„stan dziś"** (trzy wiersze wymagają zmiany, dwa są docelowe). *(C)*
- Węzeł diagramu cytuje „Dołączam za 299 zł", a kod składa „Dołączam za
  299,00 zł" z twardymi spacjami (`widok.php:320`, `:128`). *(C)*
- ~~Odesłanie do „ośmiu decyzji właściciela" nie miało pokrycia w ETAP-WP.md~~
  **NAPRAWIONE 2026-08-26** — decyzje są w ETAP-WP.md, sekcja „DECYZJE
  WŁAŚCICIELA (2026-08-26): zakres Pluginu 2 doprecyzowany". *(A)*

## SPRAWDZONE I CZYSTE — nie szukać drugi raz *(krytyk A)*

- Reguła **„brak klucza znaczy nie ruszaj"** nie jest naruszona: Plugin 2 nie
  pisze do naszych tabel i nie przechodzi przez `Aai_Sklep_Zapis`.
- Kolejność sekcji (`Aai_Sklep_Sekcje::KOLEJNOSC`) i zakaz sięgania szablonów
  frontu po `lessons.content` — nietknięte.
- Dodatkowe meta na wpisie kursu Tutora **nie** zapali `wp aai-sklep
  sprawdz-tutora`: `rozjazdy_postu()` porównuje wyłącznie klucze z planu
  (`class-aai-sklep-tutor.php:598-606`).
- Trzy statusy kursu z sekcji 6.1 i cena `0` zgadzają się z kontraktem
  (`class-aai-sklep-kontrakt.php:81-83`, `:654-668`).
- Punkt 9.1 jest prawdziwy co do linii: `szablony/sekcje/faq.php:36` naprawdę
  woła `adres_zakupu()` dla „Napisz do nas".

---


---

# ZNALEZISKA KRYTYKA B (cudzy kod, wyścigi, bezpieczeństwo)

Wszystkie zweryfikowane w ŻYWYM kodzie Tutora 4.0.7 i WooCommerce 11.0.1.

## Krytyczne

### B1. Wyłączenie zakupu gościa BEZ włączenia rejestracji w kasie zamyka sklep

Store API sprawdza **parę** opcji: gdy rejestracja z kasy wyłączona **i** zakup
gościa wyłączony **i** klient niezalogowany — kasa rzuca **403
`woocommerce_rest_guest_checkout_disabled`** jeszcze przed utworzeniem konta.
W tej instalacji `woocommerce_enable_signup_and_login_from_checkout = no`, więc
wdrożenie sekcji 5 „jak napisano" sprawia, że **nikt nie kupi niczego**.

*Dowód:* `StoreApi/Routes/V1/Checkout.php:1056-1064`, `:1026-1035`;
`class-wc-checkout.php:236`, `:219`.
*Rozwiązanie:* dopisać **`woocommerce_enable_signup_and_login_from_checkout = yes`**
jako pozycję o tej samej wadze co auto-complete, z asercją i uzasadnieniem
(„bez tego kasa oddaje 403"). Smoke P3: wylogowany gość + oba ustawienia →
zamówienie POWSTAJE.

### B2. Zła kolejność zapisu pary „produkt + typ ceny" ROZDAJE KURS ZA DARMO

Jeśli `_tutor_course_product_id` trafi na wpis kursu **przed**
`_tutor_course_price_type = 'paid'`, to `product_belongs_with_course()` już
znajduje kurs (więc zapis się dzieje), a `is_course_purchasable()` jeszcze
zwraca `false` — i `do_enroll()` tworzy zapis od razu ze statusem
**`completed`**, na zamówieniu, które jest dopiero `pending`. **Klient dostaje
pełny dostęp bez zapłaty.** Po fatalu albo timeoucie okno zostaje **na stałe**
i dotyczy każdego kolejnego kupującego. Diagram sekcji 4 wymienia klucze
dokładnie w tej złej kolejności.

*Dowód:* `tutor/models/EnrollmentModel.php:91-95`; `tutor/classes/Utils.php:1131-1145`;
`tutor/classes/WooCommerce.php:406-428`; `tutor/classes/Utils.php:2722-2740`.
*Rozwiązanie:* niezmiennik kolejności — **`price_type = 'paid'` NAJPIERW,
`product_id` NA KOŃCU** (przy kasowaniu odwrotnie). Stan pośredni znaczy wtedy
„jeszcze niesprzedawalny", nigdy „darmowy". Smoke P5: ustawić ręcznie
`product_id` bez `price_type`, kupić, sprawdzić że zapis ma `pending`.

### B3. Procedura `import` → `sync` zostawia kupowalny produkt bez powiązania

Po `wp aai-sklep import` produkty istnieją i są `publish`, a
`_tutor_course_product_id` nie istnieje aż do osobnego `sync` — bo to właśnie
kopia do Tutora jest na czas importu wstrzymana. Sekcja 6.1 ten stan **nazywa
i akceptuje**, a jest to dokładnie stan „klient płaci i nie dostaje nic":
bez powiązania nie ma zapisu, nie ma `_is_tutor_order_for_course`,
`is_tutor_order()` jest fałszywe i zamówienie **nigdy nie dojdzie do
`completed`**.

*Dowód:* `class-aai-sklep-tutor.php:141-146`; `tutor/classes/Utils.php:2776-2781`;
`tutor/classes/WooCommerce.php:539-541`; `tutor/models/EnrollmentModel.php:119-140`.
*Rozwiązanie:* produkt powstaje jako **`draft`** i przechodzi na `publish`
DOPIERO w kroku powiązania (wspólny warunek: `price_type=paid` + `product_id`
+ kurs `published` + cena > 0). Do tego `Aai_Sklep_Import` wstrzymuje też naszą
kopię, tak jak Tutorową.

### B4. `_aai_zrodlo_uuid` NIE jest wolny — siedzi już na 90 wpisach z tymi samymi wartościami

Pomiar w instalacji: `SELECT post_id FROM wp_postmeta WHERE
meta_key='_aai_zrodlo_uuid'` → **90 wierszy** (kursy, moduły, lekcje Tutora),
a wartość dla kursu Claude jest **identyczna** z tą, którą Plugin 2 nadałby
produktowi. Każde zapytanie bez `post_type` rozstrzyga losowo.

*Rozwiązanie:* osobny klucz `_aai_platnosci_kurs_uuid` **albo** twardy zapis:
wyszukanie idzie z `post_type = 'product'`, a znalezienie więcej niż jednego
produktu = **błąd, nie „weź pierwszy"**. (Potwierdza znalezisko A/L13 —
z pomiarem.)

### B5. Zapis `_regular_price` metą zostawia `_price` po staremu — a kontrola tego NIE ZOBACZY

Cena, którą Woo naprawdę liczy w koszyku, siedzi w `_price`, wyliczanym
wyłącznie w `handle_updated_props()` podczas prawdziwego `$product->save()`.
Zapis samej mety `_regular_price` daje rozjazd: **katalog pokaże nową cenę,
kasa policzy starą** — a kontrola z sekcji 7 porównuje `get_regular_price('edit')`,
czyli dokładnie to pole, które zostało zaktualizowane. Kontrola jest ślepa na
ten błąd.

*Dowód:* `class-wc-product-data-store-cpt.php:870-877`, `:930`, `:452-456`.
*Rozwiązanie:* w sekcji 3 zamienić etykietę węzła na **`WC_Product::set_regular_price()`
+ `save()`**; niezmiennik: kod nie zawiera `update_post_meta` na
`_regular_price`/`_price`/`_sale_price`; kontrola porównuje **`get_price('edit')`
obok `get_regular_price('edit')`**.

## Poważne

| # | Znalezisko | Dowód | Rozwiązanie |
|---|---|---|---|
| B6 | **Znacznik idempotencji maila nie jest atomowy**, a obiekt zamówienia podany do haka jest w rekurencji NIEAKTUALNY — drugi mail generuje nowy klucz i **zabija link z pierwszego** | `wp_wc_orders_meta` bez UNIQUE; `class-wc-order.php:478` (`$this` jako 4. argument), `:286`; `tutor/classes/WooCommerce.php:559-563` | znacznik jako **wiersz z UNIQUE** — `add_option( "aai_platnosci_mail_{$order_id}", …, '', false )`, bo `wp_options.option_name` ma UNIQUE i `add_option` oddaje `false` przy wyścigu; niezmiennik: **hak nigdy nie czyta stanu z obiektu podanego przez Woo, zawsze ze świeżego `wc_get_order()`** |
| B7 | **Nie ustalono, na jakim haku i priorytecie wisi nasza strona łańcucha** — przed prio 9 nie ma jeszcze zapisu, na prio 10 wchodzimy w środek rekurencji, a `tutor_after_enrolled` nie pada w przebiegu zewnętrznym | `tutor/classes/WooCommerce.php:69`, `:76`, `:569-577`; `EnrollmentModel.php:144-147` | nasz hak to **`tutor_after_enrolled`** — jedyny sygnał znaczący „dostęp naprawdę przyznany"; `order_id` z `_tutor_enrolled_by_order_id`. Jeśli ma zostać `woocommerce_order_status_changed`, to prio **≥ 11** i z jawnym `is_tutor_order()` |
| B8 | **Link „Ustaw hasło" żyje 24 h**, a hasło wygenerowane przez Woo nie dociera żadnym innym kanałem; `wp_mail()` zwraca `false` po cichu | `wp-includes/user.php:3147`, `:3089-3096`; `class-wc-email-customer-new-account.php:221-227` | wydłużyć filtrem `password_reset_expiration` tylko dla naszych kluczy albo napisać termin w mailu; **druga droga**: widoczny odnośnik do `lost-password`; wynik `wp_mail()` na zamówienie i do kokpitu; przypadek P4: „link otwarty po 25 h" |
| B9 | **Mail z linkiem na adres z zamówienia = przejęcie konta.** Zamówienie założone w kokpicie na cudze `customer_id` z dowolnym adresem rozliczeniowym wyśle ważny klucz resetu pod ten adres | `StoreApi/Routes/V1/Checkout.php:1027-1029`; `tutor/classes/WooCommerce.php:720-740` | klucz `_aai_platnosci_konto_zalozone` ustawiany WYŁĄCZNIE z `woocommerce_created_customer` w tym samym żądaniu; link tylko przy tym znaczniku; adresatem **zawsze `$user->user_email`**, nigdy `get_billing_email()`; niezmiennik 8 rozszerzyć o „ani klucza resetu dla konta, którego to zamówienie nie założyło" |
| B10 | **Drugi zakup ukończonego kursu zabiera pieniądze i zostawia zamówienie, które NIGDY się nie domknie** — `do_enroll()` wychodzi PRZED zapisem meta na zamówieniu | `EnrollmentModel.php:84-89`, `:119-140`; `Utils.php:2776-2781`; `WooCommerce.php:539-541` | filtr `woocommerce_add_to_cart_validation` odrzucający kurs, na który klient ma zapis `completed`; pozycja w kontroli: zamówienia w `processing` starsze niż X godzin BEZ `_is_tutor_order_for_course` |
| B11 | **Bramka P3 „bacs → completed" nie sprawdza mechanizmu** — zamówienie już `completed` wpada w gałąź `else`, która zwraca `true` **bezwarunkowo**, z pominięciem wszystkich czterech warunków | `tutor/classes/WooCommerce.php:1011-1025`, `:1020`, `:969-972` | przebieg **z WP-CLI** (`is_admin()` fałszywe): metoda płatności spoza `cod/cheque/bacs`, `payment_complete()`, asercja że zamówienie SAMO doszło do `completed`; test negatywny z wyłączonym auto-complete |
| B12 | **Pułapka 8 pilnuje nie tej dźwigni** — `enable_guest_course_cart` nie zamyka gościnnej gałęzi zapisu; ta pyta wyłącznie o brak `customer_id` i sesję | `tutor/classes/WooCommerce.php:777-779`; `ecommerce-functions.php:171-178`; `Ecommerce.php:63-78` | przenieść tę opcję do „ustawiamy dla porządku, nic nie chroni"; asercję przepiąć na **dane**: żaden wpis kursu nie ma `_tutor_wc_guest_customer_id` (kod 1, jeśli ma) |
| B13 | **Pułapka 2 za wąska** — `_tutor_product` kasuje KAŻDY zapis produktu (masowa edycja, REST, `wc_scheduled_sales`, cudza wtyczka), nie tylko nasz | `tutor/classes/WooCommerce.php:60`, `:518-525` | własny hak na `save_post_product` z priorytetem **> 10**, przywracający `_tutor_product` i `_virtual` produktom z naszym uuid; niezmiennik przeformułować na zachowanie: „produkt kursu ZAWSZE ma `_tutor_product`" |
| B14 | **Brak `_sold_individually` + `quantity` w adresie CTA = klient płaci N razy, a zapisuje się raz** | `class-wc-form-handler.php:943`, `:955`; `abstract-wc-product.php:88`; `tutor/classes/Course.php:3280` | `_sold_individually = yes` do listy kluczy w sekcji 6 + kontrola; smoke P3: `?add-to-cart=ID&quantity=3` → koszyk ma 1 sztukę |
| B15 | **Kontrola nie odróżni „w trakcie" od „zepsute"** → fałszywy alarm w CI → wyciszenie kontroli, czyli utrata jedynej obrony na cudzy kod bez transakcji | brak `START TRANSACTION` w łańcuchu: `EnrollmentModel.php:110-140`, `WooCommerce.php:559-566` | **dwa progi**: „rozjazd" (kod 1) i „w trakcie" (kod 0 + komunikat), rozstrzygane po znaczniku czasu; pole `_aai_platnosci_sync_ts` na produkcie, żeby było po czym poznać |
| B16 | **Powracający niezalogowany klient dostanie 400 zamiast kasy** — przy wymuszonej rejestracji kasa zawsze woła `wc_create_new_customer()`, a ta przy znanym adresie zwraca `WP_Error` | `wc-user-functions.php:61-70`; `StoreApi/Routes/V1/Checkout.php:986-1005` | dorysować w sekcji 2 gałąź „klient ma już konto"; przypadek w P3 z powtórnym zakupem na ten sam adres; ustawienie z B1 daje blok logowania w kasie, czyli jedyne sensowne wyjście |
| B17 | **„Ustawienia jako KOD" zapisane do bazy da się cofnąć jednym kliknięciem**; `Utils::update_option()` to czytaj-modyfikuj-zapisz bez blokady, a Woo przy deaktywacji sam cofa `monetize_by` | `tutor/classes/Utils.php:277`, `:301` (`apply_filters( $key, $value )`), `:318-322`; `WooCommerce.php:871-884`; `Options_V2.php:1071-1076` | **wartość w bazie ORAZ filtr na kluczu**: baza po to, żeby ekran Tutora pokazywał prawdę, filtr po to, żeby zmiana na ekranie nie odcięła klientom dostępu. Uwaga: przełączniki zapisują się jako `'on'`/`'off'`, filtr działa tylko gdy klucz jest w tablicy |
| B18 | **Auto-complete Tutora to najwęższa z możliwych dźwigni** — WooCommerce daje filtr rozwiązujący problem u źródła | `class-wc-order.php:1884-1896` (`woocommerce_order_item_needs_processing`), `:174`; `tutor/classes/WooCommerce.php:1020` | głównym mechanizmem uczynić **filtr `woocommerce_order_item_needs_processing` zwracający `false` dla produktu z naszym uuid**; auto-complete Tutora zostaje drugim pasem. **Uwaga: wynik jest cache'owany** (`order-needs-processing-{id}`), więc filtr rejestrować na `plugins_loaded`, nie warunkowo. **To jest mocniejsze niż `_downloadable` z propozycji krytyka C** — porównać obie drogi przy przepisywaniu |

## Drobne

- **`is_tutor_order()` wywala fatal na nieistniejącym zamówieniu** (`wc_get_order()`
  zwraca `false`, a kod robi `->get_meta()` bez sprawdzenia) — nasza kontrola
  i komendy CLI będą chodzić po historii zamówień. Nigdy nie wołać jej na
  identyfikatorze z naszych danych bez wcześniejszego `wc_get_order()`.
  *Dowód:* `tutor/classes/Utils.php:2776-2781`.
- **Cena na froncie jest w PIĘCIU miejscach, nie czterech** — CTA renderuje się
  dwa razy (`hero.php:53`, `final-cta.php:26`), a etykieta z kwotą składa się
  jeszcze w `widok.php:320`; do tego `seo.php:281`. Lepszy niż poprawianie
  liczby jest niezmiennik: **żaden szablon nie formatuje ceny sam**.
- **„Przełączenie na `wc` wyłącza natywną warstwę Tutora w całości" jest za
  mocne** — `Ecommerce::__construct()` tworzy `Settings` i `Tax` przed
  sprawdzeniem silnika, więc ekrany ustawień handlowych zostają.
  *Dowód:* `tutor/ecommerce/Ecommerce.php:56-78`.

## RIG DO SPRAWDZANIA DIAGRAMÓW (odtworzenie)

Diagramy renderują się na GitHubie same, ale **sprawdzamy to renderem, nie na
oko**. Rig żyje w scratchpadzie sesji, nigdy w `package.json`:

```
mkdir -p <rig> && cd <rig> && npm init -y && npm i mermaid puppeteer-core
cp node_modules/mermaid/dist/mermaid.min.js .
# strona.html ładuje mermaid.min.js i woła mermaid.initialize({startOnLoad:false})
# skrypt: wyciąga bloki ```mermaid z .md, dla każdego mermaid.parse + mermaid.render
# w headless Firefoksie (puppeteer-core, executablePath /usr/bin/firefox,
# protocol: "webDriverBiDi"), kod wyjścia 1 przy pierwszym błędzie
```

Stan na 2026-08-26: **3 z 3 bloków** DIAGRAM.md renderuje się w mermaid 11.17.2.
Test negatywny (doklejony zepsuty blok) wywala sprawdzenie z kodem 1, a diagram
Pluginu 1 użyty jako kontrola przechodzi.
