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
