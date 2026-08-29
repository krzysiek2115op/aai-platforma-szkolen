# Krok P5 — zwroty i przypadki brzegowe

**Status: ZROBIONY (2026-08-29), wersja 0.52.0, gałąź `feat/p5-brzegi`.**
Zakres ustalił właściciel po tym, jak pierwotny plan (pełny mechanizm zwrotów
z gwarancją 30 dni) okazał się nieporozumieniem — patrz §1.

Rodzeństwo: [KROK-P3B.md](KROK-P3B.md) (poprzedni krok wykonawczy),
[BLEDY-Z-TESTU-P4.md](BLEDY-Z-TESTU-P4.md) §6.4 (trzy decyzje, z których dwie
wchodzą tutaj), [DIAGRAM.md](DIAGRAM.md) (§13 pułapki, §16 bramki).

## 1. Jak zmienił się zakres kroku (właściciel, 2026-08-29)

Krok wszedł z wymaganiem odziedziczonym po P4: *„gwarancja 30 dni obiecywana
w katalogu MA DZIAŁAĆ i odbierać dostęp do kursu"*. Przy planie właściciel
rozstrzygnął inaczej:

> „może usuńmy sekcję ze strony sprzedażowej 30 dni na zwrot, po prostu klient
> kupuje i nie może zwrócić kursu — i to nam ułatwi i przyspieszy pracę"

Przed przyjęciem tego rozstrzygnięcia przedstawiłem mu rozróżnienie trzech
rzeczy, które łatwo zlepić w jedną:

| # | Rzecz | Czy da się „pominąć" |
|---|---|---|
| 1 | **gwarancja 30 dni** — dobrowolna obietnica handlowa, którą sami wpisaliśmy w katalog i w sekcje `guarantee` | **TAK.** Zdejmujemy i temat znika. Odwracalne |
| 2 | **ustawowe 14 dni odstąpienia** (konsument, treści cyfrowe) | **NIE przez skasowanie sekcji.** Wygasa dopiero, gdy klient w kasie wyraźnie zgodzi się na dostarczenie od razu i przyjmie do wiadomości utratę prawa odstąpienia — czyli przez checkbox, który schemat i tak trzyma w pozycji „przed pierwszym klientem" (§15). Nie jestem prawnikiem; do potwierdzenia z kimś, kto nim jest |
| 3 | **techniczny zwrot: klik „Refund" → czy klient traci dostęp** | **Potrzebne niezależnie od 1 i 2:** obciążenie zwrotne z banku, podwójna płatność, pomyłkowy zakup, reklamacja |

**Rozstrzygnięcie: wariant skrócony** — gwarancję zdejmujemy, zwrot MIERZYMY
i zostawiamy dowód, kodu piszemy tyle, ile pokaże pomiar. Odpadły: ścieżka
„poproś o zwrot", liczenie 30 dni w kodzie, zmiana zachowania przy zwrocie
częściowym.

Do tego weszły dwie decyzje z [BLEDY-Z-TESTU-P4.md](BLEDY-Z-TESTU-P4.md) §6.4:
zdjęcie z kasy zdania o „Warunkach i zasadach" oraz okładka produktu jako PNG.

## 2. Czego P5 NIE dotyka

| Rzecz | Należy do |
|---|---|
| zgoda na natychmiastowe dostarczenie treści cyfrowej (wyłącza ustawowe odstąpienie) | przed pierwszym prawdziwym klientem, razem z regulaminem i bramką |
| regulamin jako dokument | właściciel |
| prawdziwa bramka płatności, faktury, VAT | osobny krok po P6 |
| zobowiązania „dostęp bez limitu", „aktualizacje bez dopłat" | właściciel, przy uruchomieniu sprzedaży |
| test ręczny całości | P6 |

## 3. Etap E1 — pomiar zwrotu (2026-08-29)

**Zmierzone na żywej instalacji `:8892`**, na własnym kursie testowym, kontem
`klient-test`. Każdy odczyt dostępu w OSOBNYM żądaniu (`is_enrolled()` w tym
samym żądaniu, w którym powstał zapis, kłamie — pułapka z W6). Po pomiarze
środowisko wróciło do stanu wyjściowego.

| Ścieżka | Status zamówienia | Status zapisu | Dostęp | „Moje kursy" | Lekcja | Przycisk |
|---|---|---|---|---|---|---|
| zakup | `completed` | `completed` | **TAK** | jest | otwarta | „Przejdź do kursu" |
| **zwrot pełny** | `refunded` | `refunded` | **NIE** | znika | zamknięta | wraca „Dołączam za…" |
| **zwrot częściowy** (50 z 199 zł) | `completed` | `completed` | **TAK** | jest | otwarta | „Przejdź do kursu" |
| anulowanie | `cancelled` | `cancelled` | **NIE** | znika | zamknięta | wraca „Dołączam za…" |
| ponowny zakup po zwrocie | `completed` | `completed,cancelled` | **TAK** | jest | otwarta | „Przejdź do kursu" |

### Wniosek, który rozstrzygnął krok

**Zwrot odbiera dostęp bez ani jednej linijki naszego kodu.**
`WooCommerce::enrolled_courses_status_change()` Tutora ustawia status zapisu
równy statusowi zamówienia, a `get_enrolled_courses_ids_by_user()` filtruje po
tym statusie (`Utils.php:2260`). Klient dowiaduje się o zwrocie mailem Woo
`customer_refunded_order` — włączonym i adresowanym do klienta (sprawdzone).

Kodu więc nie pisaliśmy. Powstał **dowód**: `smoke-wp-zwroty` utrwala cudze
zachowanie jako NASZE WYMAGANIE, żeby aktualizacja Tutora albo WooCommerce nie
zabrała go po cichu — bo wtedy sklep oddawałby pieniądze i zostawiał materiał,
a nic by tego nie zgłosiło.

**Zwrot częściowy dostępu nie odbiera** i to zostaje (pułapka 7 schematu):
zwrot 50 zł ze 199 zł jest korektą ceny, nie rezygnacją z kursu. Sprawdzenie
w smoke'u pilnuje, żeby zmiana po stronie Tutora nie odebrała kursu komuś, kto
zapłacił niemal całość.

## 4. Etap E2 — strona przestaje obiecywać zwrot

Obietnica siedziała w **czterech miejscach na kurs**, nie w jednym: pozycja
„Gwarancja 30 dni" wśród korzyści pakietu, wiersz „Gwarancja zwrotu przez
30 dni" w liście „w cenie", cała sekcja `guarantee` oraz pytanie FAQ, którego
jedyną odpowiedzią była gwarancja. Do tego pływak w hero katalogu — osobno
w szablonie WordPressa i w prototypie.

Pytania FAQ („Co, jeśli kurs u mnie nie zadziała?" / „…nie jest dla mnie?")
**usunięte w całości**, zamiast dopisywania im nowej odpowiedzi: zmyślanie
obietnicy byłoby powtórzeniem błędu, który ta zmiana naprawia.

**W ich miejsce, decyzją właściciela (2026-08-29), weszło pytanie oparte na
FAKCIE**: „Mogę zajrzeć do kursu przed zakupem?" — bo każdy kurs ma **dwie
lekcje otwarte bez logowania**. Liczba jest zmierzona (po dwie na kurs, nie
cztery na jeden), a dostęp sprawdzony uruchomieniowo: gość dostaje HTTP 200
i całą treść lekcji.

Obietnica wymagała jednak DROGI, której nie było. Zmierzone: program
oznaczał te lekcje etykietą „podgląd", ale na całej stronie kursu nie było
**ani jednego odnośnika do lekcji** — klient czytał, że coś jest otwarte,
i nie miał jak tam wejść. Etykieta jest teraz odnośnikiem „przeczytaj za
darmo" (`Aai_Sklep_Tutor::adres_lekcji()`); bez kopii w Tutorze zostaje sam
napis, jak dotąd.

**Rodzaj sekcji `guarantee` ZOSTAJE w kontrakcie i ma swój szablon** — zniknęła
treść, nie możliwość. Decyzja jest odwracalna jednym wpisem w kreatorze.

### Narzędzie, którego brakowało: `npm run db1:sekcje`

Poprawki treści sprzedażowej nie miały bezpiecznej drogi do bazy.
`npm run db1:seed` zaczyna od `akcja: "usun"` — jest idempotentny przez
skasowanie kursu i utworzenie go od nowa, czyli **kasuje prozę 73 lekcji**,
żeby zmienić jedno zdanie. Przy audycie 0.33.0 obeszło się to jednorazowym
skryptem, którego nikt nie zachował.

`tools/wgraj-sekcje.ts` wysyła same sekcje BEZ klucza `modules` — warstwa
zapisu podmienia program tylko przy jego obecności (`if (kurs.modules)`,
sprawdzone w kodzie przed użyciem).

**Pierwsza wersja tego narzędzia miała błąd**: `...reszta` przenosiło `modules`
z seeda z powrotem do wejścia. Zatrzymał ją bezpiecznik `tresc-do-skasowania`
z 0.37.0 komunikatem „skasowałby napisaną treść 41 lekcji" — bezpiecznik pyta
o SKUTEK zapisu, nie o obecność klucza, i dlatego złapał to, czemu nie
zapobiegł komentarz w tym samym pliku.

Zmierzone po wgraniu do obu baz: proza 73 lekcji **co do znaku bez zmian**
(929 831 znaków przed i po), sekcje 24 → 22, moduły 12 bez zmian,
`wp:sprawdz` 73/73, `wp:tutor` 0 różnic. Na żywych stronach zero trafień na
„30 dni", „gwarancj" i „zwrot" — przy greppie sprawdzonym frazami, które tam są.

## 5. Etap E3 — zdanie o zgodach w kasie

WooCommerce drukował pod formularzem kasy „wyrażasz zgodę na nasze **Warunki
i zasady** oraz Politykę prywatności", choć strony regulaminu nie ma
(`woocommerce_terms_page_id` puste). **Przy braku strony Woo nie usuwa
wzmianki — drukuje ją bez odnośnika** (zmierzone w `checkout-frontend.js`:
`d.gu ? "<a…>Terms…</a>" : "Terms…"`), więc klient czytał, że zgadza się na
dokument, którego nie może przeczytać.

Klient czyta teraz: **„Kontynuując zamówienie, wyrażasz zgodę na naszą
Politykę prywatności."** z klikalnym odnośnikiem.

**Zrobione filtrem `render_block_data` na drzewie bloków W PAMIĘCI**, nie
zapisem do treści strony. Ta druga droga to `str_replace` w cudzej treści —
przy P3a uszkodziła 13 bloków koszyka i 22 kasy bez jednego objawu. Filtr
niczego nie utrwala: bez wtyczki wraca zdanie WooCommerce, i słusznie, bo bez
niej nikt tu nie kupuje.

Trzy fakty zmierzone w cudzym kodzie (nie wyprowadzać od nowa):
- blok `woocommerce/checkout-terms-block` **nie ma render_callbacku** — zdanie
  składa React, sterowany atrybutem `text` (`dangerouslySetInnerHTML: {__html:
  e || wt}`, czyli nasz tekst podmienia całe zdanie);
- atrybut z drzewa bloków dojeżdża do JS jako `data-text` (zmierzone
  `do_blocks()` na kopii treści, bez dotykania bazy);
- **filtr `render_block_data` dostaje blok NAJWYŻSZEGO poziomu** z całym
  drzewem w `innerBlocks` — bloki zagnieżdżone nie dostają własnego wywołania,
  więc po drzewie trzeba zejść samemu.

Test negatywny: mutacja nazwy bloku w stałej → wraca zdanie Woo o Warunkach,
pada **dokładnie jedno** sprawdzenie z pięciu.

## 6. Etap E4 — okładka produktu

W koszyku i w kasie klient widział szary zastępnik za kurs, za który płaci.

**Decyzja właściciela zakładała renderowanie PNG przy synchronizacji, ale to
niewykonalne**: `Imagick::queryFormats("*SVG*")` w kontenerze instalacji
zwraca **pustą listę**, GD SVG nie czyta, a `rsvg-convert`, `inkscape`
i `convert` nie istnieją. Renderowanie po stronie serwera wymagałoby dołożenia
delegata, którego na docelowym hostingu może nie być — i wtedy okładka
zniknęłaby po cichu.

**PNG jest więc artefaktem repozytorium** (`node tools/okladki-png.mjs`), leży
obok źródłowego SVG i jedzie z wtyczką jak każdy inny plik. Skrót źródła
zapisany obok (`*.png.sha256`), żeby `--sprawdz` wykrył okładkę zmienioną
w SVG i niewyrenderowaną. Wariant zatwierdzony przez właściciela.

**Render jest kwadratowy (1200×1200), choć okładka ma 16:9.** WooCommerce
składa miniaturę przycięciem `300×300` — zmierzone na wersji 1600×900: z tytułu
„Jak poprawnie korzystać z Claude" zostawało „poprawnie / zystać z Claude".
Ucięty napis wygląda jak awaria, nie jak projekt.

**Idempotencja jest wymogiem bramki P2** („sha produktu niezmieniony między
2. a 3. przebiegiem"): metoda pyta o STAN — jest już załącznik tego kursu
o tym skrócie pliku i produkt na niego wskazuje? nic nie robi. Zmierzone:
przebieg 1 „zaktualizowane 2", przebiegi 2 i 3 „bez zmian 2", załączników
stale 2.

Trzy rzeczy znalezione po drodze:
- **wszystkie cztery pliki okładek niosły napis „[ KURS · MATTHEWPLUGINS.PL ]"**
  — rebranding z 2026-08-18 ich nie objął. Poprawione na „AUTOMATIC AI", bo
  inaczej utrwaliłbym starą markę w bibliotece mediów;
- **załącznik szedł z pustym `alt`** (Store API oddawało `alt: ""`), więc
  czytnik ekranu mówił klientowi „obraz" i nic więcej. Uzupełniany także dla
  okładek wgranych wcześniej, nie tylko przy pierwszym wgraniu;
- **stara okładka zostawała w bibliotece** przy każdej poprawce. Kasujemy ją
  PRZED wgraniem nowej: przy odwrotnej kolejności WordPress zastaje zajętą
  nazwę i robi `…-1.png`, `…-2.png` — nazwę, która kłamie o historii pliku.
  Zakaz kasowania (niezmiennik 13) dotyczy PRODUKTU, nie załącznika, który
  sami tu wstawiliśmy i oznaczyliśmy własnym meta.

## 7. Etap E5 — przypadki brzegowe (bramka §16)

Bramka P5 mówi: *każdy wiersz sekcji 13 ma niepustą kolumnę „dowód"*.
Sprawdziłem wszystkie piętnaście **uruchomieniowo**, nie przez przeczytanie
dokumentu — i cztery deklaracje okazały się puste.

**Naprawdę pokryte (nie szukać drugi raz):** domykanie zamówienia i gałąź „już
completed" mierzy `smoke-wp-zakup` ZACHOWANIEM; znacznik `_tutor_product` —
smoke produktów; gość Tutora — kontrola; rekurencja haka, klucz hasła i adresat
maila — smoke maili; duplikaty uuid i stan „w trakcie" — kontrola.

| # | Luka | Co zmierzone | Naprawa |
|---|---|---|---|
| 11 | **`tutor_update_product_url()` zabiera cudzej pozycji odnośnik** | funkcja kończy się BEZ `return` dla produktu spoza kursów → filtr `woocommerce_cart_item_permalink` dostaje `null`; zmierzone: cudzy produkt → `NULL` | nasz filtr na priorytecie 20 (PO Tutorze) przywraca odnośnik; przy okazji odnośnik kursu prowadzi teraz **prosto** na `/szkolenia/<slug>/`, a nie na `/courses/…`, które i tak przekierowujemy |
| 8 | **zamówienie kursu wiszące w `processing`** | kontrola tego nie widziała; taki stan znaczy, że mechanizm domykania z P3b nie zadziałał, czyli klient zapłacił i NIE MA dostępu | kontrola kod 1; NIE zgłasza `on-hold` (przelew czeka), `pending` ani zamówień mieszanych |
| 3 | **Tutor Pro** | jednokierunkowość ceny stoi na tym, że nikt jej nie nadpisuje, a Pro ma własny zapis ceny kursu; kontrola milczała | kontrola mówi wprost, że dowody P2 przestają obowiązywać |
| 14 | **`is_tutor_order()`** | robi `->get_meta()` na wyniku `wc_get_order()` bez sprawdzenia istnienia → fatal na nieistniejącym zamówieniu | reguła strażnika, PREWENCYJNA (dziś nie wołamy jej ani razu) |

### Korekta schematu przy okazji

DIAGRAM §10 zapowiadał dla **niezmiennika 14** test: *„ręcznie `product_id` bez
`price_type` → zakup → zapis ma `pending`, nie `completed`"*. Zmierzone: taki
stan daje **`completed`**, czyli pełny dostęp bez zapłaty — to samo zagrożenie
B2, tylko objaw opisany na opak. `EnrollmentModel::do_enroll()` nadaje `pending`,
gdy kurs JEST sprzedawalny, a `completed`, gdy nie jest (niesprzedawalny uchodzi
za darmowy).

Smoke mierzy teraz dwie sceny: **zła kolejność rozdaje kurs za darmo** (asercja
pilnuje, że zagrożenie DALEJ istnieje — gdyby zniknęło, reguła kolejności
straciłaby powód i należałoby ją przemyśleć, a nie wozić w nieskończoność),
**nasza kolejność nie tworzy zapisu wcale**.

## 8. Dowody

| Bramka | Wynik |
|---|---|
| strażnicy | **35/35** (doszły dwie reguły w `straznik-platnosci-wp`: 34 i 35) |
| audyt mutacyjny | **222** mutacje: 220 złapanych, **0 przeoczonych, 0 martwych**, 2 pominięte (strażnicy warunkowi bez materiału) |
| `smoke-wp-zwroty` | **35 sprawdzeń** (nowy) |
| dane Pluginu 1 | proza **73/73 co do znaku**, kopia w Tutorze **0 różnic** |

### Testy negatywne — każdy trafia tylko w swoje

| Co zepsute | Padło |
|---|---|
| zdjęty hak Tutora `enrolled_courses_status_change` | **9 z 33** (w tym „po zwrocie zapis ma `pending` zamiast `refunded`") |
| wyłączony mail Woo o zwrocie | **1 z 33** |
| zdjęty filtr odnośnika pozycji koszyka | **2 z 35** |
| mutacja nazwy bloku w klasie kasy | **1 z 5** sprawdzeń pomiaru zgody |
| udawany Tutor Pro | kontrola **kod 1** |
| zamówienie kursu w `processing` starsze niż godzina | kontrola **kod 1** |

## 8b. SWEEP KRZYŻOWY — najpoważniejsze znalezisko kroku

Sweep miał potwierdzić, że etapy nie kolidują. Zamiast tego znalazł **cichą
utratę treści**, której nie widziała żadna bramka.

**Objaw.** Po komplecie smoke'ów kopia Kursu 2 w Tutorze miała **3 moduły
i 14 lekcji zamiast 6 i 32**, choć na starcie sesji `wp:tutor` mówił
„87 obiektów, 0 różnic". Nasze tabele były nietknięte — zniknęła tylko kopia.

**Droga do przyczyny (każdy krok pomiarem, nie lekturą):**

1. eksperyment różnicowy: `wp:sync` → 87 obiektów → jeden przebieg
   `smoke-wp-zwroty` → brak lekcji Kursu 2. Winowajca: smoke, nie import;
2. pomiar krokowy: samo **utworzenie** kursu testowego zabierało 5 lekcji
   cudzego kursu, jeszcze przed sprzątaniem;
3. podsłuch `before_delete_post` ze stosem wywołań: kasuje
   `Aai_Sklep_Tutor::usun_nadmiar` ← `synchronizuj_kurs` ← `na_zmianie`;
4. log argumentów: `usun_nadmiar` dostaje **poprawne** ID własnego kursu —
   czyli funkcja jest niewinna;
5. odczyt stanu: kasowane lekcje mają rodzica, który nosi tytuł **mojego**
   modułu testowego i **pusty uuid** — cudzy wpis został PRZEJĘTY;
6. `dane_kursu()` oddaje moduły i lekcje z pustym `id`, bo warstwa zapisu
   robi `(string) null` = `''`.

**Mechanizm.** Wiersz o pustym identyfikatorze trafia do
`znajdz_po_uuid('')`, a zapytanie `meta_value => ''` dopasowuje **pierwszy
lepszy wpis danego typu**. Kopia przejmuje wtedy cudzy moduł (tytuł, rodzic,
uuid), a `usun_nadmiar()` kasuje jego lekcje jako nadmiar. Bez jednego objawu.

**Zasięg — sprawdzony, nie założony.** Kontrakt kreatora (`Aai_Sklep_Kontrakt`)
nadaje nowym wierszom `wp_generate_uuid4()` od W4, więc **ścieżka właściciela
była bezpieczna**. Dziura otwierała się przy wywołaniach warstwy zapisu
z pominięciem kontraktu — czyli w naszych smoke'ach.

**Naprawa na dwóch poziomach**, bo jeden by nie wystarczył:

| Poziom | Zmiana | Po co |
|---|---|---|
| **obrona** | `znajdz_po_uuid()` odrzuca pusty uuid i zwraca 0 | żadne wejście, choćby najgorsze, nie może już przejąć cudzego wpisu |
| **poprawność** | warstwa zapisu nadaje uuid nowemu modułowi i lekcji (`identyfikator()`) | pusty identyfikator nie jest „brakiem danych", tylko daną, która zderza się z każdą inną pustą |

**Dowody:** `smoke-wp-zwroty` pyta teraz w rachunku sumienia także o **liczbę
wpisów Tutora** (37 sprawdzeń) — bo rachunek liczący wyłącznie własne ślady
przepuścił to bez mrugnięcia. Reguła w `straznik-tutora` celuje w ZACHOWANIE
(wyjście przy pustej wartości), nie w nazwę. Audyt mutacyjny 222 → **223**.
Test negatywny: cofnięcie obu warstw → pada **1 z 37**, z liczbami
(„przed 87, po 79").

## 9. Pułapki warte zapamiętania

1. **`tutor()->wc` NIE ISTNIEJE** („Config property wc does not exist") —
   pierwszy test negatywny nic nie wyłączył i smoke przechodził. Wyglądało to
   na dowód, a było ślepotą testu. Callback trzeba zdjąć po nazwie klasy prosto
   z `$wp_filter`.
2. **`waitForSelector(".wc-block-cart-items__row")` trafia w SZKIELET
   ładowania**, nie w treść — pomiar raportował brak okładki, choć Store API
   oddawało ją poprawnie. Czekać na obraz, nie na wiersz.
3. **Test negatywny wiszącego zamówienia najpierw nie zadziałał**, bo mechanizm
   z P3b domknął zamówienie w tym samym żądaniu. Status trzeba było ustawić
   prosto w tabeli HPOS. To dobra wiadomość o kodzie i zła o naiwnym teście.
4. **`echo $?` po potoku z `grep` czyta kod GREPA** — przez chwilę wyglądało,
   że kontrola oddaje 0 przy wypisanych błędach. Nawrót lekcji z D5.
5. **`db1:seed` kasuje kursy** — nie wolno go używać do poprawek treści
   sprzedażowej. Od teraz jest `db1:sekcje`.

## 10. Zostaje do decyzji właściciela

| Rzecz | Dlaczego nie rozstrzygnąłem sam |
|---|---|
| ~~puste miejsce po dwóch pytaniach FAQ~~ | **ROZSTRZYGNIĘTE 2026-08-29**: weszło pytanie o darmowe lekcje (§4) |
| **zgoda w kasie na natychmiastowe dostarczenie** (wyłącza ustawowe 14 dni) | wymaga regulaminu i najlepiej opinii prawnika; schemat trzyma to w pozycji „przed pierwszym klientem" |
| **kompozycja hero katalogu po usunięciu pływaka gwarancji** — zostały dwa pływaki zamiast trzech; bramka wyglądu (90/90, zero nachodzeń i plam) niczego nie zgłasza, ale to ocena estetyczna | wygląd katalogu właściciel przyjmował przy B5 |
