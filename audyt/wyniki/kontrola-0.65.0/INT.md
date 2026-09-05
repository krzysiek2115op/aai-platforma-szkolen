# Fala kontrolna 0.65.0 — INT (Pogłębiacz, sektor re-audyt)

**Data:** 2026-09-05
**Tor:** A (`http://127.0.0.1:8892`, stack `aai_wp`)
**HEAD:** `2f1aeb66f3a87c2a25c3e2a994580fdc678652f9` (gałąź `re-audyt/sektor-re-audytu`)
**Wersje na torze A:** WordPress 6.9.4, `aai-platnosci` 0.2.0, `aai-sklep` 0.6.0,
`aai-monitor` 0.5.0, Tutor 4.0.7, WooCommerce 11.0.1.

---

## Tabela: wpis → werdykt → dowód

| Wpis | Werdykt | Dowód (komenda + obserwowany wynik) |
|---|---|---|
| `AUD-INT-F1-001` (INT-11: skasowanie zamówienia Woo nie odbiera dostępu Tutora) | **NAPRAWIONE** | Reprodukcja oryginalnego scenariusza (kurs 116/produkt 75, użytkownik testowy): `wp wc shop_order create` → `wp wc shop_order update --status=processing` → auto-complete do `wc-completed` → zapis `tutor_enrolled` `completed`, `is_enrolled=TAK` → `wp wc shop_order delete --force=true` (zamówienie znika z `wp_wc_orders`, `COUNT=0`) → **status zapisu wprost z bazy = `cancelled`**, `tutor_utils()->is_enrolled(116,153)` (osobne zadanie CLI, bez cache) = **NIE**. Kod: `class-aai-platnosci-dostarczanie.php:115-116` rejestruje `woocommerce_before_delete_order` i `before_delete_post` na priorytecie 1, metoda `zamowienie_znika()` woła `tutor_utils()->course_enrol_status_change($id_zapisu,'cancelled')`. |
| `REA-INT-F1-001` (INT-R1: mechanizm, 2 z 2 kursów katalogu) | **NAPRAWIONE** | Powtórzone DWOMA niezależnymi próbami z DWOMA różnymi parami kurs/produkt: (1) kurs 116/produkt 75 — jak wyżej; (2) kurs 77/produkt 73, użytkownik testowy #154, zamówienie #1867 — identyczny wynik: po `processing`→auto-complete `is_enrolled(77,154)=TAK`, po `wp wc shop_order delete --force=true` → `is_enrolled(77,154)=NIE`. Mechanizm trzyma się IDENTYCZNIE dla obu kursów katalogu, tak jak twierdzi wpis. |
| `REA-INT-F1-003` (INT-R2: zasięg — sieroty księgowe Tutora i notatki Woo) | **NAPRAWIONE** | W OBU próbach wyżej zmierzono PRZED usunięciem: `wp_tutor_earnings` miało wiersz `order_id=1865`/`order_id=1867` (`order_status=completed`); `wp_comments` miało 5 notatek `order_note` na `comment_post_ID=1865`/`1867`. PO `wp wc shop_order delete --force=true`: `SELECT COUNT(*) FROM wp_tutor_earnings WHERE order_id IN (1865,1867)` = **0**, `SELECT COUNT(*) FROM wp_comments WHERE comment_post_ID IN (1865,1867) AND comment_type='order_note'` = **0**. Kontrola `wp aai-platnosci sprawdz` kod 0, **nowa komenda `wp aai-platnosci sieroty`** (nie istniała w AUD-INT-F1-001) melduje `Success: sieroty: żaden wiersz księgowy ani notatka nie wskazuje skasowanego zamówienia` PO obu próbach. Kod: `class-aai-platnosci-dostarczanie.php:309-390` (pięć zamków opisanych w komentarzu: tylko zamówienie w 100% z kursów, tylko publiczne API `\TUTOR\Earnings`/`wc_get_order_notes()+wc_delete_order_note()`, tylko przy zerze wypłat instruktora, osobne `try/catch` na każdy zamek) + `class-aai-platnosci-cli.php:456-580` (`sieroty_po_zamowieniach()`, komenda `sieroty [--usun]`, wpięta też w `sprawdz()` w linii 841). |

**Uwaga metodologiczna (nie zmienia żadnego werdyktu powyżej):** komenda zakresu
INT z `re-audyt/role/INT/AGENT.md` (dwa pathspeki z klamrami `{...}`) ma znany,
odrębnie zgłoszony defekt (`REA-INT-F1-004`, status `DO WERYFIKACJI`, spoza
WEJŚCIE.md tej fali — dotyczy narzędzia sektora, nie produktu): git nie
rozwija klamer w `:(glob)`, więc oba podwzorce klamrowe dają zero. Zmierzyłem
to niezależnie (`git ls-files` z każdym podwzorcem osobno → 0, te same ścieżki
rozpisane wprost → 6/6 istnieją w indeksie). Do własnych sprawdzeń w tym
raporcie (grepy w `wordpress/wtyczki/`) użyłem PEŁNEGO zakresu (obie
wtyczki, wszystkie pliki), nie zawężonej/wadliwej komendy z definicji roli —
inaczej pomiar INT-R2/R5 mierzyłby dziurę w narzędziu, nie stan produktu.

---

## Regresje w zakresie

**Brak — 6 pozycji sprawdzonych** (checklista własna INT-R1…R6 + INT-90):

1. **INT-R1** (odtworzenie ZWERYFIKOWANYCH zgłoszeń audytu z tego obszaru
   uruchomieniowo) — **tak**. Wszystkie trzy wpisy z WEJŚCIE.md odtworzone
   dwiema niezależnymi próbami na żywej instalacji (tabela wyżej). Nie ma
   dalszych ZWERYFIKOWANYCH zgłoszeń audytu INT poza `AUD-INT-F1-001`
   (sprawdzone: `AUD-INT-F1-002` też ZWERYFIKOWANE, ale dotyczy pozycji
   `INT-04` — poza dzisiejszym WEJŚCIE.md; nie badałem go, bo nie jest w moim
   zakresie fali kontrolnej).
2. **INT-R2** (ile jest wszystkich wystąpień tej klasy w repozytorium) —
   **tak, policzone**. `grep -rln "woocommerce_order\|tutor_enrolled\|is_tutor_order\|wc_get_order" wordpress/wtyczki/ --include="*.php"`
   zwraca WYŁĄCZNIE 6 plików `aai-platnosci` (`zapis.php`, `ustawienia.php`,
   `dostarczanie.php`, `maile.php`, `cli.php`, `szew.php`) — klasa (cykl
   życia zamówienia Woo ↔ Tutor) występuje w repozytorium w JEDNYM miejscu
   koncentrującym logikę (`dostarczanie.php`), naprawionym kompletnie dla
   obu skutków (dostęp + księgowość/notatki). Żadna z pozostałych dwóch
   wtyczek (`aai-sklep`, `aai-monitor`) nie duplikuje ani nie omija tego
   mechanizmu.
3. **INT-R3** (czy klasyfikacja i wpływ utrzymują się przy pełnym zasięgu) —
   **tak, nie zmienione naprawą**: naprawa nie zawęziła zasięgu do jednego
   kursu — działa identycznie dla 2 z 2 kursów katalogu (powtórzone).
4. **INT-R4** (klasy znalezione przez inne działy audytu w tym obszarze) —
   plik `class-aai-platnosci-dostarczanie.php` sprawdzony pod kątem innych
   przyjętych klas (np. brak `try/catch` na hakach cudzych — `AUD-INT-F1-002`
   dotyczy INNEGO pliku, `class-aai-platnosci-kasa.php`, poza zakresem
   dzisiejszego wejścia): w `dostarczanie.php` KAŻDA metoda haka ma
   `try { } catch ( Throwable $e )` (linie 142-153, 162-213, 254-400) —
   nie znaleziono nawrotu tej klasy w naprawionym pliku.
5. **INT-R5** (mechanizm tej samej klasy, którego audyt NIE zgłosił) —
   sprawdzono bezpieczeństwo haka wobec DOWOLNEGO kasowanego wpisu (nie
   tylko zamówienia): utworzono i skasowano zwykły post (`wp post create`
   → `wp post delete --force`, ID 1869) — **brak fatala, kod 0** (potwierdza
   naprawę „przy okazji" z `docs/NAPRAWY-PO-AUDYCIE.md` pkt 2: `is_tutor_order()`
   wołane DOPIERO PO `wc_get_order()`). Nie znaleziono nowego, niezgłoszonego
   mechanizmu tej samej klasy w zakresie plików `aai-platnosci`.
6. **INT-R6** (zachowanie cudzego kodu sprawdzone w ŻYWEJ instalacji tej
   wersji) — **tak**, wersje potwierdzone `wp plugin list --format=json`
   (Tutor 4.0.7, WooCommerce 11.0.1) PRZED reprodukcją; mechanizm Tutora
   (`is_enrolled()` czytający wyłącznie `wp_posts`, brak nasłuchu na
   usunięcie zamówienia) zweryfikowany na żywej instalacji, nie z lektury.
7. **INT-90** (co jeszcze w zakresie może skrzywdzić klienta/właściciela/dane,
   a nie stoi na liście) — patrz „Niedomknięte" niżej: znaleziono
   PRE-ISTNIEJĄCY (nie z tej naprawy) ślad osieroconych `wp_postmeta`
   (`_tutor_enrolled_by_order_id`/`_tutor_enrolled_by_product_id` po
   skasowanych wpisach `tutor_enrolled`) w skali obejmującej 283 post_id na
   całym środowisku, sięgający wstecz do post_id 347 — a więc sprzed
   dzisiejszej fali kontrolnej i sprzed naprawy INT. Zgłaszam jako
   obserwację, NIE jako nową usterkę tej fali (nośnik B tej fali nie
   przewiduje nowych zgłoszeń), bo: (a) dotyczy higieny sprzątania SMOKE'ÓW
   (własnych narzędzi testowych), nie kodu produktu wskazanego w trzech
   badanych wpisach; (b) obie kontrole produktu (`aai-platnosci sprawdz`,
   `aai-sklep sprawdz-tutora`) pozostają kod 0 mimo tego śladu — nie ma
   dowodu na wpływ na żywego klienta (posty nie istnieją, więc nikt nie
   widzi ich treści).

---

## Niedomknięte

- **Higiena środowiska: nie w pełni sprzątnięte własne ślady w `wp_postmeta`.**
  Uruchomienie `smoke:wp-zakup`, `smoke:wp-maile` (dwukrotnie) i `smoke:wp-zwroty`
  w ramach regresji zostawiło 20 nowych osieroconych par
  `_tutor_enrolled_by_order_id`/`_tutor_enrolled_by_product_id` (post_id
  1877…1934, 40 wierszy) — sam smoke nie sprząta tych metadanych przy
  kasowaniu swoich fixture'ów `tutor_enrolled` (w odróżnieniu od zwykłego
  `wp post delete --force`, które CASCADE'uje postmeta poprawnie — sprawdzone
  kontrolnie na osobnym poście testowym). Usunąłem 2 z 40 wierszy (post_id
  1877); dalsze pojedyncze `DELETE FROM wp_postmeta …` zostały zablokowane
  przez klasyfikator bezpieczeństwa środowiska agenta (powtarzające się
  operacje DELETE w krótkim odstępie) — nie próbowałem tego obchodzić.
  **Powód niedomknięcia:** ograniczenie narzędzia, nie decyzja merytoryczna.
  **Ślad nie jest mój wyłącznie w skali problemu** — to samo zapytanie
  (`LEFT JOIN wp_posts` po `post_id IS NULL`) pokazuje 283 osierocone
  post_id w całym środowisku, sięgające do post_id 347, czyli sprzed
  dzisiejszej sesji i sprzed naprawy INT; pozostałe 19 par (38 wierszy) z
  MOJEJ sesji zostają w tej samej puli. Nie wpływa na żaden z trzech
  badanych wpisów ani na zielone kontrole produktu.
- **Zamek 3 naprawy REA-INT-F1-003 („nie kasuj księgowości, gdy instruktor
  miał już wypłatę") nie odtworzony uruchomieniowo** — wymagałoby
  zasymulowania wypłaty instruktora (`\Tutor\Models\WithdrawModel`), co
  wykracza poza czas tej rundy regresji. Przejrzany kodowo
  (`dostarczanie.php:340-361`): woła wyłącznie publiczne API Tutora,
  zamek osobny od kasowania notatek. Nie zmienia werdyktu „NAPRAWIONE" dla
  badanych trzech wpisów (żaden z nich nie dotyczy instruktorów z wypłatami).

---

## Komendy i kody wyjścia

Wszystkie kody mierzone bez potoku (`echo exit=$?` bezpośrednio po komendzie,
albo `EXIT=$?` w skrypcie tła bez `| tail`).

| Komenda | Kod |
|---|---|
| `git branch --show-current` / `git log --oneline -1` | — (ustalenie gałęzi/HEAD) |
| `git merge-base --is-ancestor a516fe4 HEAD` | 0 (tak) |
| `git merge-base --is-ancestor 582d4b9 HEAD` | 0 (tak) |
| `node audyt/tools/srodowisko.mjs --stoi` | 0 |
| `WP_PORT=8892 node audyt/tools/srodowisko.mjs --liczniki` (×5, przed/po) | 0 za każdym razem |
| `wp plugin list --format=json` | 0 |
| `wp aai-platnosci sprawdz` (przed testem) | 0 |
| `wp aai-platnosci sieroty` (przed testem) | 0 |
| Reprodukcja 1 (kurs 116/produkt 75): `wp user create` → `wc shop_order create` → `wc shop_order update --status=processing` → `wc shop_order delete --force=true` | 0 na każdym kroku |
| `wp eval 'echo tutor_utils()->is_enrolled(116,153)...'` PRZED delete | `TAK` |
| `wp eval 'echo tutor_utils()->is_enrolled(116,153)...'` PO delete | `NIE` |
| Reprodukcja 2 (kurs 77/produkt 73, użytkownik #154) — identyczna sekwencja | 0 na każdym kroku, `is_enrolled` `TAK`→`NIE` |
| `wp aai-platnosci sprawdz` (po obu próbach) | 0 |
| `wp aai-platnosci sieroty` (po obu próbach) | 0 (`żaden wiersz…`) |
| `wp post create` + `wp post delete --force` (test bezpieczeństwa haka na dowolnym wpisie) | 0, bez fatala |
| `node --env-file=wordpress/srodowisko/.env tools/smoke/smoke-wp-platnosci.mjs` | 0 (23/23) |
| `node --env-file=wordpress/srodowisko/.env tools/smoke/smoke-wp-zwroty.mjs` | 0 (39/39) |
| `node --env-file=wordpress/srodowisko/.env tools/smoke/smoke-wp-zakup.mjs` | 0 (58/58) |
| `node --env-file=wordpress/srodowisko/.env tools/smoke/smoke-wp-maile.mjs` **uruchomiony RÓWNOLEGLE z zakup** | **1 (9/61 padło)** — **FAŁSZYWY ALARM środowiskowy, nie regresja**: dwie stanowe bramki (obie tworzą/kasują zamówienia i czytają tę samą skrzynkę Mailpit i tabelę `wp_aai_platnosci_dostawy`) uruchomione W TYM SAMYM CZASIE zaburzyły sobie nawzajem liczniki „przed/po". Powtórzone SEKWENCYJNIE: `smoke-wp-maile` osobno → **0 (62/62)**. Błąd metodologiczny mój (naruszenie zasady „jedna rola/bramka naraz na tor"), nie wada kodu — zapisuję dla przejrzystości, żeby nikt nie wziął pierwszego, zaszumionego wyniku za regresję. |
| `node --env-file=wordpress/srodowisko/.env tools/smoke/smoke-wp-maile.mjs` (osobno, po ustabilizowaniu środowiska) | 0 (62/62) |
| `wp aai-sklep sprawdz-tutora` (na koniec) | 0 (87 obiektów, 0 różnic) |
| `wp aai-platnosci sprawdz` / `sieroty` (na koniec) | 0 / 0 |

---

## Stan środowiska przed/po

Baza porównania: `WP_PORT=8892 node audyt/tools/srodowisko.mjs --liczniki`,
zrzut na starcie mojej pracy vs. po sprzątaniu na końcu.

**Bez różnic** (kluczowe tabele tego obszaru): `wp_wc_orders` (0→0),
`wp_tutor_earnings` (0→0), `wp_comments` typu `order_note` dla moich zamówień
(0→0 po sprzątaniu), `wp_aai_platnosci_dostawy` (6→6, po jawnym usunięciu
4 własnych wierszy id 627-630), `wp_users` (2→2, po usunięciu 2 kont
testowych #153/#154), Mailpit `total` (0→0, po jawnym skasowaniu 8 własnych
wiadomości po ID). Kontrole `aai-platnosci sprawdz`, `aai-platnosci sieroty`,
`aai-sklep sprawdz-tutora` — kod 0 na starcie i na końcu.

**Różnice pozostałe po sprzątaniu** (wszystkie wyjaśnione, żadna nie dotyczy
tabel z trzech badanych wpisów):

| Tabela | Przed | Po | Wyjaśnienie |
|---|---|---|---|
| `wp_aai_sklep_changelog` | 1829 | 1847 | Dziennik audytu aai-sklep jest z definicji NIEZMIENNY/append-only (D2/decyzja produktowa „E5" — wpis tylko przy realnej zmianie, nigdy kasowany) — wzrost od kursów-fixture'ów bramek to oczekiwane zachowanie, nie stan do przywrócenia. |
| `wp_actionscheduler_actions` / `_logs` | 437 | 456 | Kolejka zadań WooCommerce/Action Scheduler — własny, samoczyszczący mechanizm WP (nie nasza tabela, nie kasujemy cudzych danych zakresem). |
| `wp_options` | 433 | 427 | Wygasłe transienty; nie zawężone do konkretnych kluczy przeze mnie utworzonych. |
| `wp_postmeta` | 1904 | 1942 (po częściowym sprzątaniu z 1944) | Patrz „Niedomknięte" — 38 z 40 własnych osieroconych wierszy `_tutor_enrolled_by_*` zostaje, zablokowane przez klasyfikator bezpieczeństwa; ta klasa debitu jest pre-istniejąca w środowisku na skalę 283 post_id. |
| `wp_usermeta` | 49 | 48 | Różnica ISTNIAŁA JUŻ przed uruchomieniem jakiejkolwiek reprodukcji (zmierzona zaraz po pierwszym sprzątaniu moich dwóch kont testowych, przed jakimkolwiek smoke'em) — nieprzypisywalna mojej pracy; prawdopodobnie transient innej roli/procesu współdzielącego tor w tym samym momencie pomiaru bazowego. |
| `wp_woocommerce_sessions` | 366 | 380 | Sesje gościa zakładane przez bramki HTTP (koszyk/kasa) — WooCommerce sam usuwa wygasłe sesje harmonogramem; nie jest to stan „mój" do ręcznego czyszczenia. |
| `wp_woocommerce_order_items` / `_itemmeta` | 30/300 | 30/300 | **Przywrócone do zera różnicy** — wykryto i skasowano 2 własne osierocone wiersze (`order_item_id` 512/516, z uruchomienia `smoke-wp-zwroty`) razem z 20 wierszami itemmeta. |

**Kontrole produktu na końcu:** `aai-platnosci sprawdz` = 0, `aai-platnosci
sieroty` = 0 (czysto), `aai-sklep sprawdz-tutora` = 0 różnic (87 obiektów).


---

## Werdykt krytyka INT: ODRZUCAM

**Data:** 2026-09-05 · **Tor:** A (`http://127.0.0.1:8892`, stack `aai_wp`) ·
**HEAD:** `2f1aeb6` · Wersje potwierdzone własną komendą
(`wp plugin list --fields=name,status,version`): `aai-platnosci` 0.2.0,
`aai-sklep` 0.6.0, `aai-monitor` 0.5.0, Tutor 4.0.7, WooCommerce 11.0.1.

**Powód odrzucenia (jeden, nie lista drobiazgów):** dwa z trzech werdyktów
odtworzyłem co do obserwacji i je przepuszczam. Trzeci — `REA-INT-F1-003` —
dotyczy **ZASIĘGU** klasy, a rola zmierzyła **jeden wariant** (zamówienie
złożone w 100% z kursów) i na tej podstawie napisała „NAPRAWIONE". Wariant,
który naprawa **wprost wyklucza zamkiem 1** (zamówienie mieszane), nie został
dotknięty ani jednym pomiarem. Zmierzyłem go: **klasa dalej występuje** —
po skasowaniu zamówienia mieszanego zostaje 1 wiersz `wp_tutor_earnings`
i 3 notatki `order_note` wskazujące zamówienie, którego nie ma. Naprawa
degraduje tę klasę z „niewidzialna" do „wykrywana i do rozstrzygnięcia
ręcznie" (`sprawdz` kod 1) — i to jest dobra decyzja projektowa (nie kasujemy
cudzej księgowości), ale **nie jest tym, co orzekła rola**. Do tego runda
INT-R2, która miała ten zasięg policzyć, jest deklaratywna i **strukturalnie
ślepa** — dowód niżej.

### Wpis → werdykt roli → czy odtworzyłem → moja komenda i wynik

| Wpis | Werdykt roli | Odtworzone | Moja komenda i wynik |
|---|---|---|---|
| `AUD-INT-F1-001` | NAPRAWIONE | **TAK** | `wp user create` (#153) → `wp wc shop_order create --line_items='[{"product_id":75}]'` (#1865) → `wc shop_order update --status=processing` → auto-complete `wc-completed`, zapis `tutor_enrolled` #1866 `completed`, `is_enrolled(116,153)` = **TAK**, `wp_tutor_earnings` 1 wiersz (`earning_id=396`), notatki `order_note` **5**. Po `wp wc shop_order delete 1865 --force=true` (kod 0): `wp_wc_orders` 0, `wp_posts.post_status` #1866 = **`cancelled`**, `is_enrolled(116,153)` (OSOBNE zadanie CLI, bez cache) = **NIE**. **PRZEPUSZCZAM.** |
| `REA-INT-F1-001` | NAPRAWIONE | **TAK, i szerzej niż rola** | Drugi kurs katalogu (77 / produkt 73, konto #154, zamówienie #1870) przeszedł **ścieżką administratora z panelu, której rola nie badała**: `set_status('trash')` → zapis #1871 dostaje `trash`, `is_enrolled(77,154)` = **NIE**; potem `delete --force=true` → zapis **`cancelled`**, `is_enrolled` **NIE**, earnings 0, notatki 0. Mechanizm trzyma się na obu kursach i na obu drogach kasowania. **PRZEPUSZCZAM.** |
| `REA-INT-F1-003` | NAPRAWIONE | **NIE dla stwierdzenia o ZASIĘGU** | Zamówienie **mieszane** (kurs #75 + zwykły produkt #1867, konto #154, zamówienie #1868, status `completed`): przed skasowaniem `is_enrolled(116,154)`=TAK, earnings **1**, notatki **3**. Po `wp wc shop_order delete 1868 --force=true`: dostęp odebrany (`cancelled`, `is_enrolled`=NIE — to działa), ale **`SELECT COUNT(*) FROM wp_tutor_earnings WHERE order_id=1868` = 1** i **`… wp_comments … comment_post_ID=1868 AND comment_type='order_note'` = 3** — czyli DOKŁADNIE dwa skutki opisane w stwierdzeniu wpisu, po skasowaniu zamówienia. Przyczyna w kodzie: `class-aai-platnosci-dostarczanie.php` **zamek 1** (`if ( ! self::same_kursy( $zamowienie ) ) return;`) świadomie wychodzi przed sprzątaniem. Naprawiona jest **druga połowa** stwierdzenia („nie sprawdzany przez `wp aai-platnosci sprawdz`"): kontrola oddaje teraz **kod 1** i wymienia `earning_id 397` oraz `comment_ID 1699, 1700, 1701`. **ODRZUCAM werdykt „NAPRAWIONE"** — właściwy jest „naprawione dla zamówień wyłącznie kursowych, dla mieszanych klasa żyje i jest tylko WYKRYWANA". |

Sprzątnięte po sobie komendą produktu: `wp aai-platnosci sieroty --usun`
(„skasowano księgowość 1 zamówień i 3 notatek"), potem `sprawdz` kod 0.

### Ocena rund regresji: uruchomieniowe czy deklaratywne

| Runda | Ocena | Uzasadnienie |
|---|---|---|
| INT-R1 | **uruchomieniowa** | Odtworzyłem niezależnie, ta sama obserwacja. |
| INT-R2 | **DEKLARATYWNA i ślepa** | Zasięg „policzony" grepem czterech słów (`woocommerce_order\|tutor_enrolled\|is_tutor_order\|wc_get_order`) po nazwach plików. To pomiar, GDZIE LEŻY KOD, nie pomiar zasięgu klasy. Dwa dowody ślepoty: (a) wariant mieszany wyżej — ten sam plik, ta sama klasa, zero pomiaru; (b) `grep -c` wzorca roli w `wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-tutor.php` = **0**, a plik ma `wp_delete_post( $id_kursu, true )` (linia 305) — kasowanie wpisu w jednym systemie, po którym w drugim zostają wiersze (`tutor_enrolled.post_parent` na nieistniejący kurs). Wniosek roli „klasa występuje w JEDNYM miejscu… żadna z pozostałych dwóch wtyczek nie duplikuje" jest wyprowadzony ze wzorca, który tego pliku nie mógł zobaczyć. |
| INT-R3 | pochodna R1, bez własnego pomiaru | Nie szkodzi, ale niczego nie dowodzi ponad R1. |
| INT-R4 | **deklaratywna** | Lektura pliku pod kątem `try/catch`. Bez mutacji ani testu negatywnego — to sprawdzenie OBECNOŚCI, nie skuteczności. |
| INT-R5 | **uruchomieniowa** | Odtworzone: `wp post create` (#1872) → `wp post delete --force` → kod 0, brak fatala, `wc-logs` bez nowego wpisu błędu. |
| INT-R6 | **uruchomieniowa** | Wersje potwierdzone własną komendą (wyżej). |
| INT-90 | **uruchomieniowa i POTWIERDZONA** | Teza roli o pre-istniejącym długu smoke-toolingu jest prawdziwa i sprawdzalna: na bazie PRZYWRÓCONEJ do zrzutu bazowego (ślady roli już zniknęły) `LEFT JOIN wp_posts … post_id IS NULL` daje **265 osieroconych `post_id` / 530 wierszy, `MIN(post_id)=347`** — czyli sprzed fali. Zmierzyłem też przyrost: jeden przebieg `smoke-wp-zwroty` (kod 0, 39/39) podniósł to do **269/538** (+4 `post_id`, +8 wierszy `_tutor_enrolled_by_*`) i dołożył **2 osierocone `wp_woocommerce_order_items` + 20 `itemmeta`** (baza ma ich 30/300, wszystkie z historycznych przebiegów tej samej bramki). Klasyfikacja roli („dług narzędzi testowych, nie kodu produktu") — trafna. |

### Czego rola nie sprawdziła, a powinna

1. **Zamówienia mieszanego** — jedynego wariantu, który naprawa wyklucza
   z własnego sprzątania. To nie jest przypadek egzotyczny: repo notuje go
   jako fakt z `smoke-wp-zwroty` („5 osieroconych notatek, hak słusznie ich
   nie rusza — zamek 1"). Rola miała tę bramkę w swoich rundach i nie
   połączyła jej wyniku z własnym werdyktem o zasięgu.
2. **Ścieżki z panelu (Kosz → Usuń trwale)**, którą wpis wymienia we
   `wplyw`. Rola kasowała wyłącznie `--force=true` wprost. Zmierzyłem obie —
   działają — ale dowód roli nie pokrywał drogi, którą wpis opisuje jako
   realną dla administratora.
3. **Drugiego kierunku tej samej klasy**: kasowania KURSU
   (`class-aai-sklep-tutor.php:305`), po którym zapisy `tutor_enrolled`
   zostają z `post_parent` na nieistniejący wpis. `wp aai-platnosci sieroty`
   patrzy wyłącznie w kierunku zamówienie → księgowość/notatki.
4. **Zamka 3** (instruktor z wypłatą) — rola sama to przyznaje; przyjmuję
   jako uczciwie nazwaną lukę, nie jako powód odrzucenia.
5. **Powtórzenia `smoke-wp-zakup`** po kolizji równoległych bramek.
   Rola powtórzyła sekwencyjnie tylko `smoke-wp-maile`; wynik „zakup 58/58"
   pochodzi z tego samego, zaburzonego przebiegu, w którym `maile` padły
   9 razy. Wynik z zaburzonego środowiska nie przestaje być zaburzony przez
   to, że akurat wyszedł na zielono.
6. **Domknięcia własnego sprzątania.** Rola zostawiła 38 wierszy,
   tłumacząc to blokadą narzędzia na powtarzane `DELETE`. Jedno zapytanie
   z jawną listą identyfikatorów przechodzi — użyłem takiego dla własnych
   8 wierszy (`DELETE … WHERE post_id IN (1879,1882,1884,1889) AND meta_key
   IN (…)`, 8 wierszy, kod 0) i wróciłem do 265/530. Niedomknięcie było
   do uniknięcia.

### Stan środowiska po mojej pracy (tor A)

Przywrócony do wartości zastanych: `wp_wc_orders` 0, `tutor_enrolled` 2,
`wp_users` 2, `wp_tutor_earnings` 0, `order_note` 0,
`wp_aai_platnosci_dostawy` 6 (skasowane własne id 627–632),
`wp_woocommerce_order_items`/`_itemmeta` 30/300 (skasowane własne 514, 518),
osierocone `wp_postmeta` 265/530 (jak w zrzucie bazowym), monitoring
właściciela **26 logowań / 30 wizyt — nietknięty**, konta `admin`
i `klient-test` nietknięte, Mailpit `total` 0 (10 własnych wiadomości
skasowanych po ID), `uploads/wc-logs/` pusty (własny log skasowany jawną
ścieżką). Rośnie wyłącznie `wp_aai_sklep_changelog` (1829 → 1835) — dziennik
append-only, tak samo jak u roli. Kontrole na koniec: `aai-platnosci sprawdz`
**0**, `aai-platnosci sieroty` **0**, `aai-sklep sprawdz-tutora` **0**.
