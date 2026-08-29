# Krok P4 — konto przy zakupie, dwa maile, tabela `dostawy`, otwarcie sprzedaży

**Status: PLAN ZATWIERDZONY przez właściciela 2026-08-29** („akceptuję plan”),
razem z siedmioma rekomendacjami z sekcji 1. Gałąź: `feat/p4-konto-i-maile`.

Rodzeństwo: [KROK-P3B.md](KROK-P3B.md) (poprzedni krok), [DIAGRAM.md](DIAGRAM.md)
(sekcje 4, 5, 8, 9, 10, 16), [KRYTYKA-P0.md](KRYTYKA-P0.md) (K1, B6, B8, B9, B10, B16).

## 1. Siedem rozstrzygnięć właściciela (2026-08-29)

| # | Pytanie | Rozstrzygnięcie |
|---|---|---|
| 1 | łapacz maili w środowisku | **TAK — Mailpit** (kontener + mu-plugin SMTP pisany przez `postaw.sh`, poza wtyczką). Bez niego ani smoke, ani właściciel nie zobaczy wiadomości: `wp_mail()` w tym środowisku **pada** (zmierzone, §3) |
| 2 | co przy awarii `wp_mail()` | znacznik zostaje, `wynik` niesie błąd, **ostrzeżenie w kokpicie**, `sprawdz` → **kod 1**, ręczna ponowka komendą. Automatycznego ponawiania NIE ma — nie mamy kolejki, a cicha pętla retry jest gorsza niż głośna odmowa |
| 3 | czy mail 1 wymienia kurs | **nie** — powitanie + jeden przycisk „Ustaw hasło” + co dalej. Kurs nazywa mail 2. Powód zmierzony: przy tym haku zamówienie **jeszcze nie istnieje** (§3, fakt 1) |
| 4 | dokąd prowadzi link do hasła | **strona WooCommerce** `/my-account/lost-password/?action=newaccount&key=…&login=…` — dokładnie ta trasa, której używa własny mail Woo; mamy jej styl (`woo-motyw.css`), a `wp-login.php` wyrzuciłby klienta na surowy ekran WordPressa |
| 5 | kto otwiera sprzedaż | **świadoma komenda**, nigdy aktywacja wtyczki. Domyślnie zamknięte |
| 6 | czy B10 (odmowa drugiego zakupu posiadanego kursu) wchodzi do P4 | **tak** — to P4 zdejmuje blokadę, więc to P4 tworzy dziurę |
| 7 | wygląd maili | **własny HTML** w naszych barwach, jedna kolumna, jeden przycisk, wersja tekstowa obok. Klient nigdy nie widzi wyglądu Woo/Tutora (decyzja z W6), a mail jest punktem styku jak każdy inny |

Przyjęte bez pytania (zapowiedziane w planie): mail 2 idzie **jeden na zamówienie**
i wymienia wszystkie kursy z tego zamówienia; `dostawy` dostaje trzecie zdarzenie
`dostep`; maile nie niosą hasła **nigdy** (niezmiennik 8); klucz resetu wyłącznie
dla konta założonego w tym samym żądaniu (B9).

## 2. Czego P4 nie dotyka

| Rzecz | Należy do |
|---|---|
| prawdziwa bramka płatności, faktury, VAT, regulamin | krok po P6 / przed pierwszym klientem |
| zwroty, zwrot częściowy, zamówienia-zombie | P5 |
| test ręczny właściciela | P6 |
| treść lekcji, kreator, wygląd stron kursu | Plugin 1 — zamknięty |
| SPF/DKIM, adres nadawcy na prawdziwej domenie | hosting + domena |
| obietnice handlowe stron sprzedażowych | decyzja właściciela, nie kod |

## 3. Etap E0 — weryfikacja zerowa (2026-08-29)

Pięć założeń planu miałem z **odczytu** cudzego kodu. Etap E0 zmierzył je
uruchomieniowo: instrumentacja hakami w mu-pluginie (poza wtyczką), prawdziwa
kasa blokowa przez Store API na `:8892`, kurs testowy `…0p4e00` i produkt 1277.
Po pomiarze środowisko wróciło do stanu wyjściowego (produkty 2, powiązania 2,
zamówienia 0, dostawy 0, sprzedaż zamknięta, `sprawdz` kod 0).

### Co potwierdzone

| # | Fakt | Pomiar |
|---|---|---|
| 1 | kasa blokowa zakłada konto **sama, bez checkboksa** (`guest_checkout=no` + `signup_and_login=yes`), a `woocommerce_created_customer` leci **raz i PRZED** powstaniem zamówienia | log: `created_customer user=40 zalogowany=0` → dopiero potem `new_order order=1279 status=pending` |
| 2 | ścieżka `bacs`: `checkout-draft → pending → on-hold`, zapis kursanta powstaje jako `on-hold`, **`tutor_after_enrolled` NIE leci** | log przebiegu; zapis 1280 `on-hold`, `_tutor_enrolled_by_order_id = 1279` |
| 3 | po ręcznym `on-hold → completed` **`tutor_after_enrolled` leci dokładnie raz** | log: jeden wpis haka |

### Cztery znaleziska, które zmieniają kod

1. **`tutor_after_enrolled` melduje NIEAKTUALNY status zapisu.** Na ścieżce
   produkcyjnej (`payment_complete()` + nasz filtr `needs_processing`) hak
   zameldował `status=pending`, a baza w tej samej chwili miała `completed`.
   Przyczyna: `Utils::course_enrol_status_change()` pisze **surowym
   `$wpdb->update` po `wp_posts`** i nie czyści cache’u wpisu (`Utils.php:2478`).
   **Konsekwencja:** naturalna bramka „wyślij mail 2 tylko, gdy zapis jest
   `completed`” **nigdy by nie wysłała** na ścieżce produkcyjnej. Status zapisu
   czytamy zapytaniem, nie `get_post_status()`.
2. **Trzeci argument `woocommerce_created_customer` to `bool`, nie hasło** —
   docblock Woo mówi „The generated password”, a zmierzona długość wartości to
   **1** (`true` → `"1"`). Nasz kod nie ma prawa go użyć jako hasła (i nie używa —
   niezmiennik 8), ale komentarz w kodzie musi mówić prawdę z pomiaru.
3. **Żadna bramka płatności nie była włączona.** Przy otwartej sprzedaży kasa
   oddawała **400 `woocommerce_rest_checkout_payment_method_disabled`** — czyli
   „sprzedaż otwarta” bez włączonej bramki znaczy „nikt nie kupi niczego”, bez
   jednego objawu na stronie. Bramkę włącza **środowisko** (`postaw.sh`), bo
   w prawdziwym sklepie robi to właściciel wybraną bramką; **kontrola ma o tym
   mówić** (nowy wiersz: sprzedaż otwarta + zero włączonych bramek = kod 1).
4. **Woo wysyła własny mail „account has been created”** i jest on dziś
   **włączony** (brak wiersza `woocommerce_customer_new_account_settings` =
   domyślne `yes`). To on musi zgasnąć w chwili, w której zapala się nasz mail 1
   — inaczej dwa klucze resetu unieważniają się nawzajem (B8).

### Rzecz do zapamiętania o mailach Woo

Klient przy `bacs` dostaje z samego WooCommerce **dwie** wiadomości: „order has
been received” (`on-hold`) i „is on its way” (`completed`). Nasz mail 2 jest
trzecią i to on niesie przycisk do kursu. Nie wyłączamy maili Woo — są
potwierdzeniem transakcji; wyłączamy **tylko** ten jeden, którego zadanie
przejmujemy (konto + hasło).

## 4. Etap E1 — środowisko widzi wychodzącą pocztę (2026-08-29)

`wordpress/srodowisko/` dostało **Mailpit** (`axllent/mailpit:v1.31.0`,
`127.0.0.1:8893`) i mu-plugin `mu-plugins/aai-poczta-warsztatu.php`, który
przestawia PHPMailer WordPressa na SMTP łapacza. Plik leży w repo, bo
środowisko jest u nas kodem — ale **nie należy do żadnej wtyczki** i montuje
go wyłącznie nasz `compose.yml`.

`phpmailer_init`, a nie `pre_wp_mail`: ten drugi przerywa wysyłkę i podstawia
własną odpowiedź, więc mierzylibyśmy własną atrapę zamiast tego, co naprawdę
wychodzi z WordPressa (nagłówki, typ treści, wersja tekstowa, kodowanie).

`postaw.sh` dostał trzy rzeczy: czekanie na łapacz, **włączenie przelewu
`bacs`** (bramka warsztatu — E0, fakt 3; w prawdziwym sklepie bramkę wybiera
właściciel, więc to ustawienie ŚRODOWISKA, nie wtyczki) i **weryfikację
artefaktem**: kasuje skrzynkę, wysyła prawdziwą wiadomość z unikalnym tematem
i czyta ją z drugiej strony przez API Mailpita.

### Znalezisko E1 — mount pojedynczego pliku odpina się po cichu

Pierwsza wersja montowała **sam plik** mu-plugina. Test negatywny (zły host
SMTP) **przeszedł na zielono** — i to był objaw, nie fałszywy alarm: bind mount
pojedynczego pliku trzyma jego **INODE**, a `sed -i`, `git checkout` i większość
edytorów piszą przez plik tymczasowy i `rename`. Kontener dalej podawał STARĄ
treść, więc mierzyłem plik, którego już nie było. To ta sama rodzina co „martwy
bind mount katalogu" z W2, ale groźniejsza: tam wtyczka znikała i było to
widać, tu wszystko wyglądało poprawnie.

Naprawa: montujemy **katalog** `mu-plugins` (w WordPressie pusty z definicji,
więc nic nie zasłania). Dodatkowa korzyść: plik doraźnej instrumentacji
położony w tym katalogu widać w `git status`, więc nie da się go zapomnieć —
w wolumenie kontenera był niewidzialny.

### Dwa testy negatywne (po naprawie mountu)

| Co zepsute | Co powiedziała weryfikacja |
|---|---|
| host SMTP `mailpit-nie-ma` | `wp_mail() oddało false — PHPMailer nie trafił do Mailpita` |
| udawana wysyłka (`pre_wp_mail` → `true`) | `wiadomość nie dojechała do łapacza (temat postaw-… nie ma go w skrzynce)` |

Drugi test jest tu ważniejszy: pilnuje, żeby sprawdzenie nie zadowoliło się
odpowiedzią `true` z `wp_mail()`, która o dostarczeniu nie mówi nic.

## 5. Etap E2 — dwa maile (2026-08-29)

Powstała `Aai_Platnosci_Maile`: mail 1 na `woocommerce_created_customer`,
mail 2 na `tutor_after_enrolled`, oba wysyłane na `shutdown`, oba ze
znacznikiem w `dostawy` zapisanym **synchronicznie** (atomowy `INSERT`
z UNIQUE — cudzy hak potrafi pobiec rekurencyjnie, B6). Do warstwy zapisu
doszły dwa odczyty: `kurs_produktu()` (odwrotność `produkt_kursu()`) i
`status_zapisu()` (czyta status z bazy, bo `get_post_status()` w tym żądaniu
kłamie — E0).

`Aai_Platnosci_Ustawienia` wyłącza mail WooCommerce „nowe konto" (opcja
+ filtr obronny B17) i **przywraca go przy deaktywacji** — nasz mail znika
razem z wtyczką, a konto bez żadnego linku do hasła to klasa K1.

### Pomiar na żywej instalacji — prawdziwa kasa blokowa, prawdziwa poczta

| Co | Wynik |
|---|---|
| zakup gościa przez Store API (`bacs`) | konto 41, zamówienie `on-hold` |
| skrzynka po zakupie | **mail 1 „Ustaw hasło i wejdź"** + potwierdzenie zamówienia Woo; maila „account has been created" **NIE MA** |
| link z maila 1 | **200**, pole nowego hasła, zero komunikatu o złym kluczu, strona w NASZYM wyglądzie (`woo-motyw.css`) |
| po ręcznym `on-hold → completed` | **mail 2 „Twój kurs jest gotowy"** z nazwą kursu Z NASZEJ TABELI i przyciskiem do `/szkolenia/moje/` |
| dziennik `dostawy` | `mail_konta/41 = wyslano`, `dostep/1285 = przyznany`, `mail_kursu/1285 = wyslano` |
| hak `tutor_after_enrolled` odpalony **dwa razy** w nowym żądaniu | **0 maili** — znacznik trzyma |
| zamówienie na **dwa kursy** | **jeden** mail „Twoje kursy są gotowe", obie nazwy w treści, jeden wiersz `mail_kursu` i jeden `dostep` |
| link otwarty **po 25 h** | pole hasła znika, strona degraduje się do formularza „Lost your password" — czyli klient ma drogę dalej, a mail zapowiadał termin |

Każdy mail wychodzi jako **HTML + wersja tekstowa** (`AltBody` przez
`phpmailer_init`, zdejmowany w `finally` — filtr zostawiony w miejscu
doklejałby naszą wersję tekstową do cudzych wiadomości). Typ treści idzie
**nagłówkiem**, nie globalnym `wp_mail_content_type`.

### Obserwacja spoza zakresu P4

Strona `/my-account/lost-password/`, do której prowadzi mail 1, mówi po
**angielsku** („Lost your password?", „Reset password") — instalacja stoi na
`en_US`. To dotyczy wszystkich napisów WooCommerce i Tutora, więc jest
decyzją o CAŁEJ witrynie (język WordPressa + tłumaczenia), nie o naszym
mailu. Do listy „przed pierwszym klientem", nie do tego kroku.

## 6. Etapy E3–E4 — dziennik, otwarcie sprzedaży, B10 (2026-08-29)

**E3.** `wp aai-platnosci dostawy [--ponow=zdarzenie-ukosnik-id]` pokazuje
dziennik i ponawia wysyłkę (jedyna droga, którą mail wychodzi drugi raz —
znacznik broni przed duplikatem z cudzej rekurencji, nie przed decyzją
właściciela). `sprawdz` dostał `bledy_dostaw()`: wiadomość z wynikiem innym
niż `wyslano` **albo z pustym** (żądanie padło między znacznikiem a wysyłką)
= kod 1 z komendą naprawczą; do tego opłacone zamówienie z kursem bez wiersza
`dostep` (okno 30 dni, sufit 100 zamówień — nazwane wprost). Porażka wysyłki
idzie też do kokpitu pod własnym kluczem `mail:…` — udana ponowka zdejmuje
DOKŁADNIE swój komunikat, a rada w kokpicie zależy od rodzaju błędu (rada
„kliknij Zapisz kurs" przy niedoręczonym mailu byłaby nieskuteczna).

**E4.** `wp aai-platnosci sprzedaz otworz|zamknij` — sprzedaży nie otwiera
aktywacja ani aktualizacja; komenda ostrzega, gdy nie ma żadnej włączonej
bramki. Dwie asercje `smoke-wp-front` (przycisk oferty, `availability`)
czytają stan sprzedaży **z instalacji** i mają oczekiwania dla OBU stanów —
smoke zielony przy zamkniętej i przy otwartej (84/84 × 2).

**B10 zmierzone prawdziwą ścieżką klienta** (HTTP `?add-to-cart=` z ciastkiem
zalogowanego; `WC()->cart->add_to_cart()` w Woo 11 **w ogóle nie woła**
`woocommerce_add_to_cart_validation` — zero trafień w `class-wc-cart.php`,
filtr żyje w form handlerze, AJAX-ie i wczytaniu sesji, więc pierwszy pomiar
przez API koszyka był atrapą):

| Stan zapisu Tutora | Pozycji po `?add-to-cart` | Komunikat |
|---|---|---|
| `completed` | **0** | „Ten kurs już masz — znajdziesz go na stronie »Moje kursy«…" |
| `on-hold` | **0** | „Zamówienie na ten kurs już czeka na płatność…" |
| brak zapisu | **1** | — (odmowa trafia tylko w swój przypadek) |

Decyzję „czy ten człowiek ma ten kurs" podejmuje **jedna metoda**
(`Aai_Platnosci_Cta::stan_posiadania()`) — pyta jej przycisk na stronie ORAZ
blokada koszyka; dwie kopie tego warunku rozjechałyby się przy pierwszej
zmianie.

### Trzy znaleziska E3–E4 (własne pomiary, naprawione przed commitem)

1. **Zagnieżdżony `shutdown` gubił mail 2.** Ręczna zmiana statusu na
   `processing` domykana jest odroczeniem na `shutdown` (P3b); to domknięcie
   odpala `tutor_after_enrolled` — a nasze zgłoszenie wysyłki trafiało do
   akcji, która WŁAŚNIE trwa, i WordPress już go nie wołał. Zmierzone:
   znacznik `mail_kursu` z pustym wynikiem, w skrzynce cztery maile Woo
   i ani jednego naszego — klient miał dostęp i nie wiedział o tym.
   Naprawa: `doing_action( 'shutdown' )` → wysyłka od razu. Dowód
   różnicowy na świeżym zamówieniu: `mail_kursu = wyslano`, mail w skrzynce.
2. **Aktywacja meldowała udaną naprawę jako błąd.** Lista zmian z `napraw()`
   szła do kanału komunikatów, który kontrola traktuje jako rozjazd — zwykła
   aktywacja zostawiała `sprawdz` na czerwono z opisem rzeczy, która się
   UDAŁA. Zmiany widać w `sync --napraw`, stan w kontroli; do kanału błędów
   idzie wyłącznie awaria.
3. **Smoke zakupu zostawiał dziennik dostaw.** Zamówienia smoke'a przechodzą
   przez `completed`, więc dostają wiersze `dostep`/`mail_kursu`; sprzątanie
   kasowało zamówienia, a wiersze zostawały — kolejne bramki mierzyłyby
   własne śmieci (ta sama klasa co produkty-sieroty ze sweepu P2). Sprząta
   też dziennik.

### Odmowy koszyka były NIEME — naprawa w `napraw()`

Strony koszyka i kasy z tej instalacji **nie mają** bloku
`woocommerce/store-notices`, a motyw klasyczny renderuje samą treść strony —
klasyczne komunikaty WooCommerce nie miały się gdzie wydrukować. Zmierzone:
klient z kursem po `?add-to-cart` lądował na pustym koszyku bez słowa.
`napraw()` **dopisuje** blok na początek treści obu stron (prepend, niczego
nie podmienia — lekcja rozbitych klas z P3a), kontrola zgłasza brak (kod 1),
druga naprawa nic nie robi. Po naprawie ten sam scenariusz pokazuje pełne
zdanie odmowy.

Do tego test negatywny kontroli bramek: `bacs` wyłączony + sprzedaż otwarta
→ kod 1 z komunikatem; przywrócenie → kod 0.

## 7. Etap E5 — dowody (2026-08-29)

**Strażnik** `straznik-platnosci-wp` dostał sześć niezmienników P4, każdy
celujący w ZACHOWANIE, nie w nazwę:

| # | Niezmiennik | Co chroni |
|---|---|---|
| 22 | wysyłka stoi za wynikiem `dostawa_odnotuj()` | rekurencyjny hak Tutora nie wysyła maila dwa razy (B6) |
| 23 | argument hasła z haka Woo jest porzucany | hasło nigdy nie trafia do treści (niezmiennik 8) |
| 24 | zero `get_billing_email()` | klucz resetu nie idzie pod cudzy adres (B9) |
| 25 | kolejka pyta `doing_action('shutdown')` | mail 2 z odroczonego domknięcia nie przepada |
| 26 | status zapisu z bazy, nie `get_post_status()` | bramka „dopiero po dostępie” w ogóle działa (E0) |
| 27 | deaktywacja przywraca mail Woo | konto po deaktywacji nie zostaje bez linku (K1) |

Niezmiennik 20 (stan „zamówienie w toku”) **przepisany**: pytał o nazwę
`stan_klienta(`, więc refactor wynoszący decyzję do `stan_posiadania()`
zapalił go mimo zachowanej gwarancji — **czwarty nawrót wzorca na nazwę**
(0.29.0, 0.44.0, 0.47.0, c6c9c97). Teraz szuka KAŻDEGO rozstrzygnięcia
`return self::W_TOKU` i wymaga przy nim odczytu statusu.

**Audyt mutacyjny 191 → 198**, każda nowa z `oczekiwanySlad`. Wynik:
**196 złapanych, 0 przeoczonych, 0 martwych**, 2 pominięte (brak materiału).

**`npm run smoke:wp-maile` — 38 sprawdzeń** na żywej instalacji, wiadomości
czytane **z łapacza poczty**, nie z podstawionego `pre_wp_mail` (ten mierzyłby
własną atrapę zamiast tego, co wyszło z WordPressa). Smoke sprząta po sobie
do zera: produkty, zamówienia, konta, zapisy i **dziennik dostaw**.

### Testy negatywne — i dwa z nich obnażyły ślepe sprawdzenia

| Co zepsute | Padło | Które sprawdzenia |
|---|---|---|
| znacznik maila 2 przestaje bramkować | **1 z 31** | powtórzony hak wysyła drugi raz |
| adresatem adres rozliczeniowy (B9) | **1 z 31** | mail 1 poszedł pod cudzy adres |
| bramka statusu zapisu wycięta | **3 z 33** | mail przed dostępem + znacznik + brak maila po opłacie |
| wysyłka nie przeżywa `shutdown` | **3 z 38** | ścieżka „admin klika Processing” + pusty wynik w dzienniku |
| mail Woo „nowe konto” włączony | **2 z 38** | podwójny link do hasła |

**Dwa sprawdzenia były ślepe i wykrył je dopiero test negatywny** — dokładnie
po to się je robi:

1. **„mail 2 nie wychodzi przed opłatą” nie mierzyło niczego.** Zamówienie na
   `on-hold` nie odpala `tutor_after_enrolled` w ogóle, więc wycięcie bramki
   statusu nic tam nie zmieniało. Bramkę sprawdzamy teraz WPROST: odpalamy hak
   ręcznie na zapisie, który nie jest `completed`.
2. **Ścieżki „admin klika Processing” w smoke'u nie było.** Wszystkie
   domknięcia szły przez `update_status('completed')`, czyli z pominięciem
   odroczonego domknięcia z P3b — a to właśnie tam żył błąd zagnieżdżonego
   `shutdown`. Ścieżka ma teraz własny blok.

Do tego dwie ślepoty w samym smoke'u, złapane przy pierwszym uruchomieniu:
sprawdzenie „nie ma hasła w treści” zapalało się na własnym napisie „Ustaw
hasło: https://…” (pyta teraz o wartość PO dwukropku), a odczyt linku przez
`fetch` gubił ciastko, którym WooCommerce przenosi klucz przez przekierowanie
— więc mierzył formularz „zapomniałem hasła” zamiast formularza ustawienia
hasła.

## 8. Własne znaleziska po E5 (2026-08-29)

### Ponowienie wysyłało klucz resetu komukolwiek

`wp aai-platnosci dostawy --ponow=mail_konta/1` — literówka w identyfikatorze
— **wysyłał świeży klucz resetu hasła administratorowi**, nie zostawiał śladu
(`dostawa_wynik()` aktualizuje wiersz, którego nie ma) i meldował
**„Success: wysłano ponownie”**. Trzy nieprawdy w jednym poleceniu, a przy
okazji każdy nowy klucz unieważnia poprzedni — czyli pomyłka odbierałaby
czekającemu klientowi jego jedyny link (B8).

Zmierzone przed naprawą: dziennik 0 wierszy, w skrzynce wiadomość na adres
administratora. Po naprawie: kod 1, zero wiadomości, komunikat mówi wprost,
że ponawiamy tylko rzeczy już zlecone. Smoke pilnuje tego dwoma sprawdzeniami
(38 → 40), test negatywny zapala dokładnie je.

### Deaktywacja — zmierzona, nie zadeklarowana

| Krok | Mail Woo „nowe konto” | Kupowalne produkty kursów |
|---|---|---|
| przed | `no` (nasz mail 1 go zastępuje) | 2 |
| po deaktywacji wtyczki | **`yes`** — wraca, bo nasz mail znika razem z nią (K1) | **0** (gwarancja z P1 dalej trzyma) |
| po ponownej aktywacji | `no` | 2, kontrola kod 0 |

## 9. Przegląd przed PR-em (2026-08-29) — dziesięć pytań, cztery znaleziska

Recenzent (Sonnet, **zamknięta lista 10 pytań** — decyzja właściciela
o koszcie tokenów, jak przy P3a i P3b), krytykiem agent główny. Recenzent
czytał też prawdziwe źródła WooCommerce 11.0.1 i Tutora 4.0.7 zamontowane
w środowisku, zamiast zgadywać zachowanie cudzego kodu.

**Każde znalezisko potwierdzone URUCHOMIENIOWO PRZED naprawą.** Sześć
odpowiedzi „czysto" przyjęte — jedna z nich (5) po tym, jak recenzent sam
obalił własną hipotezę, sprawdzając w `Utils::course_enrol_status_change()`,
że `cancelled`/`refunded`/`failed` trafiają na zapis 1:1 i żaden nie jest
w `ZAMOWIENIE_TRWA`.

| # | Znalezisko | Potwierdzenie | Naprawa |
|---|---|---|---|
| 7 | **Blokada koszyka nie łapie `Throwable`.** Filtr biegnie przy dodawaniu do koszyka i woła naszą tabelę oraz `tutor_utils()` Tutora; ta sama decyzja przy RYSOWANIU przycisku była osłonięta | **zmierzone**: wstrzyknięty wyjątek → `?add-to-cart=` oddał **HTTP 500 i planszę „krytyczny błąd"**, a strona kursu z tym samym wyjątkiem oddała **200** | cały łańcuch w `try`; po wyjątku **odmawiamy** (fail closed) z uprzejmym komunikatem, błąd jedzie do kokpitu. Po naprawie ta sama awaria: 200, koszyk pusty, komunikat |
| 1a | **Gość może zapłacić i nie dostać nic.** `WOO_DOCELOWE` nie ma filtrów obronnych (mają je tylko klucze Tutora), więc `woocommerce_enable_guest_checkout` może zdryfować na `yes` | **zmierzone**: po włączeniu zakupu gościa anonimowy klient przeszedł całą kasę Store API, zamówienie `completed`, a skutek to `customer_id = 0`, **0 zapisów w Tutorze, 0 wierszy `dostawy`, 0 naszych maili** | `da_sie_dostarczyc()`: gość + włączony zakup gościa = odmowa **przed pobraniem pieniędzy**. W stanie docelowym gałąź nie odpala się nigdy (zmierzone: gość dalej kupuje, konto powstaje w kasie) |
| 1b | **Konto założone POZA kasą nie dostaje maila 1.** `wp-admin`, `POST /wc/v3/customers` i `wp user create` nie idą przez `wc_create_new_customer()`, więc hak nie odpala — a zamówienie założone takiemu klientowi dostarcza mail 2 normalnie | **zmierzone**: klient dostał „Twój kurs jest gotowy" i **ani jednego linku do hasła**; mail 2 mówił „ustaw je na stronie logowania", nie podając gdzie | mail 2 niesie **odnośnik do strony odzyskiwania hasła** (bez klucza — niezmiennik 8, więc nie unieważnia maila 1) |
| 6 | **Kontrola ślepa poza oknem 30 dni / sufitem 100 zamówień** | **zmierzone**: opłacone zamówienie z kursem sprzed 40 dni, bez wiersza `dostep`, przechodziło jako **Success, kod 0** | okno i sufit **usunięte**. Koszt zamykamy inaczej: pytamy o same IDENTYFIKATORY zamówień, a pełne zamówienie wczytujemy wyłącznie dla tych bez wiersza `dostep` — w zdrowym sklepie dla żadnego |

**Znalezisko 3 (`ponow()` bez sprawdzenia dziennika) znalazłem niezależnie
przed raportem recenzenta** i naprawiłem — potwierdzenie z dwóch stron.

### Znalezisko 4 — realne, ODŁOŻONE do P5 (świadomie)

`kursy_zamowienia()` składa listę z pozycji zamówienia, nie ze stanu zapisu
każdego kursu. Dwa skutki: kurs, którego zapis padł w połowie pętli Tutora,
i tak zostanie wymieniony; a kurs odpięty od produktu między zakupem
a ręcznym ponowieniem **zniknie z listy po cichu**. Oba wymagają zdarzeń
rzadkich (przerwana pętla Tutora, usunięcie kursu ze sklepu + ręczne
ponowienie starej dostawy), żaden nie odbiera dostępu ani pieniędzy,
a obie naprawy dokładają sprzężenie z kolejnym API Tutora na ścieżce, która
dziś działa. **P5 ma w zakresie dokładnie „przypadki brzegowe"** — tam to
należy, i tam trafia z tym opisem.

### Znalezisko 10 — nagłówek CLI mówił nieprawdę

„Kody wyjścia" w `class-aai-platnosci-cli.php` opisywały kod 1 jako
**jedyny** przypadek „wtyczka aktywna, a jej tabel nie ma" — opis z P1, gdy
to była prawda. Po pięciu krokach kod 1 znaczy też rozjazd ustawień, ceny,
duplikat uuid, sierotę, otwartą sprzedaż bez bramki i niedoręczoną
wiadomość. Nagłówek nie wymienia już przypadków (spis i tak by się
rozjechał), tylko mówi, że **powód czerwieni podaje sama komenda**.

### Dwa niezmienniki więcej i piąty nawrót starej pułapki

Doszły reguły **28** (blokada koszyka łapie `Throwable` i po wyjątku
odmawia) i **29** (jakieś ROZSTRZYGNIĘCIE zależy od stanu
`woocommerce_enable_guest_checkout`). Pierwsza wersja reguły 29 pytała
o samą OBECNOŚĆ napisów `is_user_logged_in` i nazwy opcji w pliku — a obie
występują tam też gdzie indziej, więc mutacja podmieniająca całe
rozstrzygnięcie na `return true;` **przeszła**. To piąty nawrót wzorca na
napis w tym repo (0.29.0, 0.44.0, 0.47.0, c6c9c97 — i teraz mój własny),
złapany przez audyt mutacyjny w tym samym przebiegu, w którym powstał.

### Dowody po naprawach

- Strażnicy **35/35**; audyt mutacyjny **200**: **198 złapanych,
  0 przeoczonych, 0 martwych**, 2 pominięte (brak materiału).
- `npm run check` kod 0; smoke: maile **40** · zakup 32 · produkty 71 ·
  front 84 · kreator 96 · panel 54 · motyw 89 · tutor 44 · lekcja 35 ·
  dane 30 · płatności 23.
- Dane Pluginu 1 nietknięte; środowisko po wszystkim: produkty 2,
  powiązania 2, zamówienia 0, dostawy 0, **sprzedaż zamknięta**.
