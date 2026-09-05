# Fala kontrolna 0.65.0 — Pogłębiacz BE — wynik

**Data:** 2026-09-05 (UTC 07:47) · **Tor:** B (`http://127.0.0.1:8894`, stack `aai_wp_b`) ·
**Commit HEAD (gałąź `re-audyt/sektor-re-audytu`):** `2f1aeb66f3a87c2a25c3e2a994580fdc678652f9`
(kod produktu 0.65.0, naprawy scalone `a516fe4…582d4b9`).

Nośnik: B (dokument), poza numeracją fal — bez `status.mjs`/`zgloszenie.mjs`.

---

## Wejście (2 wpisy działu BE, `audyt/wyniki/kontrola-0.65.0/WEJSCIE.md`)

| Wpis | Werdykt | Dowód (komenda + wynik) |
|---|---|---|
| **AUD-BE-F1-001** — start `aai-sklep` bez `try/catch` wokół 13 wywołań `::zarejestruj()` w `plugins_loaded` | **NIENAPRAWIONE** (wpływ, nie mechanizm) | Mechanizm cytowany w zgłoszeniu JEST naprawiony: `wordpress/wtyczki/aai-sklep/aai-sklep.php:150-172` ma teraz `try { … 13×::zarejestruj() … } catch ( Throwable $e )`. **Ale WPŁYW z tego samego zgłoszenia ("HTTP 500 na CAŁEJ witrynie przy KAŻDYM żądaniu" przy braku/nieczytelności JEDNEGO z trzynastu plików) reprodukuje się nadal**, przez ODRĘBNĄ, nieobjętą tym `try` ścieżkę: `chmod 000 includes/class-aai-sklep-tutor.php` → `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8894/` → **500** (powtórzone na `/`, `/szkolenia/` ×2, `/koszyk/` — za każdym razem 500; `podman logs aai_wp_b_wordpress` pokazuje NAJPIERW złapany komunikat z catcha `aai-sklep: nie udało się uruchomić sklepu z kursami: Class "Aai_Sklep_Tutor" not found`, a zaraz potem **DRUGI, NIEZŁAPANY** `PHP Fatal error: Uncaught Error: Class "Aai_Sklep_Tutor" not found in .../class-aai-sklep-lekcja.php:317`, wywołany z `Aai_Sklep_Zasoby::posprzataj()` (hak `wp_enqueue_scripts`, zarejestrowany WCZEŚNIEJ w tym samym `try`, zanim doszło do awarii przy `Tutor`) → `Aai_Sklep_Lekcja::czy_nasza()` → `dane()` → `policz()` (linia 317: `Aai_Sklep_Tutor::dostepny()` **bez `class_exists()`**). Po `chmod 644` przywrócenie: `/` → 200, `/szkolenia/` → 200. Kontrolna próba na pliku BEZ takiej zależności (`class-aai-sklep-sitemap.php`, chmod 000) **NIE** dała 500 (front 200, `/szkolenia/` 200) — czyli usterka jest specyficzna dla klas wołanych bez ochrony, nie uogólniona na wszystkie 13 plików. Zasięg tego konkretnego niezabezpieczonego wzorca: `grep -rn "Aai_Sklep_Tutor::" includes/*.php szablony/*.php` poza własnym plikiem = **25 wywołań**, z czego **tylko 1 plik** (`class-aai-sklep-panel.php`) ma `class_exists('Aai_Sklep_Tutor'...)` — pozostałe 24 wołania są bez gwarancji, że klasa istnieje, gdy jej plik jest zepsuty. |
| **REA-BE-F1-001** — `Aai_Sklep_Zapis::zapisz_tresc_lekcji()` nie stosuje „brak klucza znaczy nie ruszaj” dla `content`/`materials` | **NAPRAWIONE** | `class-aai-sklep-zapis.php:375-386`: `array_key_exists('tresc',...)` i `array_key_exists('materialy',...)` chronią oba pola (identyczny wzorzec jak `zapisz_kurs()` w liniach 636/642). Zmierzone uruchomieniowo na **syntetycznym** kursie `bbbb0000-0000-4000-8000-0000000re001` (`wp eval`, `podman exec aai_wp_b_cli`): (1) utworzono lekcję z `content='PROZA-KTORA-NIE-MA-ZNIKNAC'`, `materials={"plik":"oryginal"}`; (2) `zapisz_tresc_lekcji(id, ['materialy'=>['plik'=>'nowa-wersja']])` **bez klucza `tresc`** → `content` ZOSTAŁ `'PROZA-KTORA-NIE-MA-ZNIKNAC'` (nie wyzerowany), `materials` zaktualizowany; (3) symetrycznie, `zapisz_tresc_lekcji(id, ['tresc'=>'TRESC-ZOSTAJE-DRUGI-TEST'])` **bez klucza `materialy`** → `materials` ZOSTAŁ z kroku (2), `content` zmieniony; (4) **rozszerzenie ponad dowód w zgłoszeniu** (test z werdyktu krytyka): `zapisz_tresc_lekcji(id, array())` (pusta tablica) → `{"bez_zmian":1}`, oba pola nietknięte — poprzednio (wg werdyktu krytyka fali 1) pusta tablica kasowała OBA pola naraz. Sprzątanie: `usun_kurs()` na własnym syntetycznym kursie → liczniki `courses/sections/modules/lessons` wróciły do bazowych 2/22/12/73. |

**Uwaga do klasyfikacji AUD-BE-F1-001:** nie jest to „częściowa naprawa kosmetyczna" — jest to dokładnie ta sama, udokumentowana w repo klasa awarii (martwy bind mount, częściowy checkout, błąd wgrania na hostingu → brak/uszkodzenie jednego pliku klasy), a jej **skutek dla właściciela jest identyczny jak przed naprawą**: cała witryna (nie tylko katalog kursów) odpowiada 500 na każdym żądaniu, dopóki plik jest zepsuty. Naprawiono literalnie wskazany w zgłoszeniu brak (`try/catch` w `plugins_loaded`), ale nie naprawiono przyczyny źródłowej wskazanej we „wpływie” zgłoszenia.

---

## Rundy regresji w zakresie BE (checklista własna, `BE-R1…R6`, `BE-90`)

| Pozycja | Pytanie | Odpowiedź | Dowód |
|---|---|---|---|
| **BE-R1** | Czy oba ZWERYFIKOWANE zgłoszenia dają się odtworzyć uruchomieniowo? | **TAK** (dla obu; jedno pokazuje, że reprodukowany jest też ZACHOWANY problem) | Patrz tabela wejścia wyżej — obie reprodukcje wykonane WYWOŁANIEM (`chmod`+`curl`, `wp eval`), nie lekturą. |
| **BE-R2** | Ile jest wszystkich wystąpień klasy „start bez pełnej ochrony"? | **0/3 wtyczek ma dziurę w samym `try/catch` rejestracji** (wszystkie 3 pliki główne mają `CAŁOŚĆ W try/catch` — sprawdzone linia po linii: `aai-sklep.php:150-172`, `aai-platnosci.php` 5 bloków (aktywacja, 2×deaktywacja, `plugins_loaded:157-200`), `aai-monitor.php:124-168` — we wszystkich `add_action()` rejestrowane WEWNĄTRZ `try`). **Ale zasięg NIEZABEZPIECZONYCH DOWNSTREAM wywołań `Aai_Sklep_Tutor::` (klasa BE-90 niżej) = 25 miejsc, 24 bez `class_exists()`.** | `grep -n "try {" wordpress/wtyczki/*/*.php` + lektura kontekstu każdego bloku; `grep -rn "Aai_Sklep_Tutor::" wordpress/wtyczki/aai-sklep/{includes,szablony}/*.php \| grep -v class-aai-sklep-tutor.php \| wc -l` → 25; `grep -rln "class_exists( 'Aai_Sklep_Tutor'" …` → 1 plik. |
| **BE-R3** | Czy klasyfikacja i wpływ z audytu utrzymują się przy pełnym zasięgu? | **NIE dla AUD-BE-F1-001** — wpływ („HTTP 500 na całej witrynie") utrzymuje się MIMO naprawy, przez inną ścieżkę niż ta, którą naprawiono. **TAK dla REA-BE-F1-001** — wpływ (cicha utrata treści) faktycznie zniknął, potwierdzone symetrycznie na obu polach i na przypadku granicznym (pusta tablica). | Jak wyżej. |
| **BE-R4** | Czy w zakresie BE występują klasy znalezione przez inne działy audytu (spillover)? | Nie badano wyczerpująco — priorytet czasu poszedł w BE-R1/R2/R6 zgodnie z rolą („najdroższa klasa to cicha utrata treści, sprawdzaj WYWOŁANIEM”). Kontrole `aai-platnosci sprawdz` i `aai-monitor sprawdz` (obszary styku z ARCH/BD/PERF) dają **kod 0** na torze B — brak sygnału regresji widocznej z tych bramek. | `wp aai-platnosci sprawdz` → kod 0; `wp aai-monitor sprawdz` → kod 0. |
| **BE-R5** | Czy obszar ma mechanizm TEJ SAMEJ klasy (start bez pełnej ochrony), którego audyt NIE zgłosił? | **TAK — to jest właśnie znalezisko z AUD-BE-F1-001 wyżej.** Mechanizm „brak jednego pliku klasy → HTTP 500 na całej witrynie" NIE jest domknięty przez sam `try/catch` rejestracji; wymaga też ochrony w miejscach, gdzie JUŻ zarejestrowane haki (np. `Aai_Sklep_Zasoby::posprzataj()`) wołają klasy zarejestrowane PÓŹNIEJ w tej samej sekwencji `try`. | Reprodukcja wyżej. |
| **BE-R6** | Czy reguła „brak klucza znaczy nie ruszaj" (BLAD-018) trzyma się uruchomieniowo dla KAŻDEGO z pięciu kluczy? | **TAK, wszystkie 5/5** — `content`, `materials` (w `zapisz_tresc_lekcji`, zmierzone w tabeli wejścia) oraz `status`, `sekcje`, `moduly` (w `zapisz_kurs`, zmierzone osobno niżej). | Osobny syntetyczny kurs `cccc0000-0000-4000-8000-0000000re002`: utworzony z `status='published'`, 1 sekcją, 1 modułem → `zapisz_kurs()` wysłany BEZ kluczy `status`/`sekcje`/`moduly` (tylko `title`/`price_grosze` zmienione) → PO: `status` nadal `'published'`, sekcje=1, moduly=1 (nietknięte), `title`/`price_grosze` zmienione poprawnie. Kod `array_key_exists` potwierdzony w źródle: linie 544 (`status`), 568-569 (`sekcje`/`moduly`), 636/642 (`content`/`materials` w pętli lekcji `zapisz_kurs`), 380/384 (`tresc`/`materialy` w `zapisz_tresc_lekcji`). |
| **BE-90** | Coś poza listą, co może skrzywdzić klienta/dane, wykryte własnym pomiarem? | **TAK — to samo znalezisko co BE-R5/AUD-BE-F1-001**, zgłoszone tam w pełni; nie duplikuję osobnym wpisem, bo dotyczy DOKŁADNIE tego samego miejsca (`AAI_SKLEP_UPRAWNIENIE`/`plugins_loaded` aai-sklep.php) i tej samej klasy błędu, którą WEJŚCIE już obejmuje. | — |

---

## Regresje w zakresie

**1 pozycja regresji** (nie 0): **AUD-BE-F1-001 — naprawa niekompletna.** Try/catch wokół rejestracji w `plugins_loaded` DZIAŁA (łapie wyjątek, loguje, dodaje `admin_notice`), ale **nie zapobiega temu samemu skutkowi** (HTTP 500 na CAŁEJ witrynie z powodu JEDNEGO uszkodzonego pliku klasy), bo co najmniej jedno wcześniej zarejestrowane hak (`Aai_Sklep_Zasoby::posprzataj()` na `wp_enqueue_scripts`) woła później w tym samym żądaniu klasę (`Aai_Sklep_Tutor`), która nie została załadowana, i to wywołanie (`class-aai-sklep-lekcja.php:317`, `Aai_Sklep_Tutor::dostepny()`) NIE ma `class_exists()` ani innego zabezpieczenia. Skutek: właściciel dostaje dokładnie ten sam biały/500 ekran na całej witrynie, jaki finding miał wyeliminować — po prostu z innego miejsca w kodzie i z LOGIEM, który wygląda jak sukces naprawy (bo najpierw pojawia się złapany komunikat catcha), a chwilę później i tak leci nieprzechwycony fatal.

**Dowód reprodukcji (powtarzalny, kod wyjścia mierzony bez potoku):**
```
chmod 000 wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-tutor.php
sleep 3
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8894/            # → 500
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8894/szkolenia/  # → 500
chmod 644 wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-tutor.php
sleep 3
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8894/            # → 200 (przywrócone)
```
Kontrola różnicowa (plik BEZ tej klasy wady): `chmod 000` na `class-aai-sklep-sitemap.php` → front i `/szkolenia/` nadal **200** — pokazuje, że problem nie jest uogólniony na wszystkie 13 plików, tylko na te, których publiczne metody są wołane bez `class_exists()` przez WCZEŚNIEJ zarejestrowane haki.

---

## Niedomknięte

- **BE-R4 nie jest wyczerpująco zbadane** — sprawdzone tylko pośrednio przez zielone kontrole `aai-platnosci sprawdz`/`aai-monitor sprawdz`; pełne przeszukanie spillover z ARCH/BD/PERF/INT w kodzie BE (poza tym, co już wynikło z reprodukcji dwóch wpisów WEJŚCIA) wymagałoby osobnego przelotu, którego czas fali kontrolnej nie objął — priorytet poszedł zgodnie z rolą w cichą utratę treści (BE-R6) i w odtworzenie obu wpisów WEJŚCIA (BE-R1/R2/R3/R5).
- Nie sprawdzałem `aai-monitor` i `aai-platnosci` pod kątem TEJ SAMEJ klasy usterki (niezabezpieczone wywołania downstream po częściowym uszkodzeniu jednego pliku) — reprodukcja skupiła się na `aai-sklep`, bo to plik wskazany w AUD-BE-F1-001. Zasięg mógłby być szerszy niż jedna wtyczka.

---

## Komendy i kody wyjścia

Wszystkie mierzone bez potoku (`$?` po komendzie bez `|`, zgodnie z regułą sesji napraw).

| Komenda | Kod |
|---|---|
| `wp --path=/var/www/html aai-platnosci sprawdz` (kontener `aai_wp_b_cli`) | 0 |
| `wp --path=/var/www/html aai-monitor sprawdz` | 0 |
| `wp --path=/var/www/html aai-sklep sprawdz` | 0 |
| `curl -o /dev/null -w '%{http_code}' http://127.0.0.1:8894/` (stan zdrowy, przed i po testach) | 200 |
| `curl … /` (`class-aai-sklep-tutor.php` chmod 000) | 500 |
| `curl … /` (`class-aai-sklep-sitemap.php` chmod 000, kontrola różnicowa) | 200 |

---

## Stan środowiska przed/po

Liczone `STACK_NAZWA=aai_wp_b WP_PORT=8894 node audyt/tools/srodowisko.mjs --liczniki`.

| Tabela | Przed | Po |
|---|---|---|
| `wp_aai_sklep_courses` | 2 | 2 |
| `wp_aai_sklep_sections` | 22 | 22 |
| `wp_aai_sklep_modules` | 12 | 12 |
| `wp_aai_sklep_lessons` | 73 | 73 |
| `wp_aai_platnosci_powiazania` | 2 | 2 |
| `wp_aai_platnosci_dostawy` | 0 | 0 |
| `wp_aai_monitor_logowania` | 0 | 0 |
| `wp_aai_monitor_wizyty` | 0 | 0 |

**Własne ślady utworzone i sprzątnięte w tym przebiegu (jawną listą, nie zakresem):**
- syntetyczny kurs `bbbb0000-0000-4000-8000-0000000re001` (slug `rea-be-f1-001-repro`) — utworzony, zapisany dwukrotnie, skasowany `usun_kurs()`; osierocony produkt WooCommerce `post_id=312` (`_aai_zrodlo_uuid` = ten kurs, niezmiennik 13 — Plugin 2 nigdy nie kasuje produktu) skasowany ręcznie (`wp post delete 312 --force`), wiersz `wp_aai_platnosci_powiazania` dla tego kursu skasowany po dokładnym `course_uuid`.
- syntetyczny kurs `cccc0000-0000-4000-8000-0000000re002` (slug `rea-be-r6-repro`) — analogicznie utworzony, zapisany, skasowany; osierocony produkt `post_id=316` skasowany, wiersz powiązania skasowany po dokładnym `course_uuid`.
- Uprawnienia plików `class-aai-sklep-tutor.php` i `class-aai-sklep-sitemap.php` przywrócone do `644` (`git status` czysty po przebiegu).

`git status --short wordpress/` — czysty (brak niezacommitowanych zmian). Konta `klient-test`/`admin`, sprzedaż, zamówienia, dziennik monitoringu — nietknięte.

---

## Werdykt krytyka BE: ODRZUCAM

**Data:** 2026-09-05 (UTC 08:02) · Tor B (`http://127.0.0.1:8894`, stack `aai_wp_b`) · fala kontrolna, nośnik B.

**Powód (jedno zdanie):** reprodukcję HTTP 500 odtworzyłem co do linii i jest prawdziwa, ale werdykt
**NIENAPRAWIONE dla `AUD-BE-F1-001` nie broni się**, bo (a) uzasadnienie „dotyczy DOKŁADNIE tego samego
miejsca (`plugins_loaded` aai-sklep.php)" jest **sprzeczne z własnym dowodem roli** (fatal leci
z `class-aai-sklep-lekcja.php:317`, nie z pliku wskazanego w `miejsce.plik`), (b) **zasięg nie jest
policzony** — podane „25 wywołań `Aai_Sklep_Tutor::`" liczy miejsca wywołań, nie powierzchnię awarii,
i **nie obejmuje drugiego przypadku, który zmierzyłem** (idzie przez `Aai_Sklep_Moje`, bez udziału
`Aai_Sklep_Tutor`), oraz (c) ta sama awaria reprodukuje się w **`aai-platnosci`**, czyli we wtyczce,
którą zgłoszenie cytuje jako WZORZEC poprawnej ochrony — co obala przesłankę zgłoszenia i przesądza,
że residuum jest **osobną klasą, nie niedokończoną naprawą tego wpisu**.

### Werdykty wpisów wejścia

| Wpis | Werdykt roli | Odtworzone? | Moja komenda i wynik |
|---|---|---|---|
| `AUD-BE-F1-001` | **NIENAPRAWIONE** | **objaw TAK, werdykt NIE** | `chmod 000 …/class-aai-sklep-tutor.php; sleep 4; curl -o /dev/null -w '%{http_code}' …` → `/` **500**, `/szkolenia/` **500**, `/koszyk/` **500**, `/moje-konto/` **500**; `podman logs aai_wp_b_wordpress` → najpierw złapany `aai-sklep: nie udało się uruchomić…`, potem **niezłapany** `Uncaught Error: Class "Aai_Sklep_Tutor" not found in …/class-aai-sklep-lekcja.php:317`, ślad `#2 class-aai-sklep-zasoby.php(107) Aai_Sklep_Lekcja::czy_nasza()` → `#5 Aai_Sklep_Zasoby::posprzataj()` na `wp_enqueue_scripts` — **łańcuch roli potwierdzony co do linii**. Po `chmod 644` → `/` 200. **ALE**: mechanizm nazwany w `miejsce.mechanizm` („brak bloku try{}catch(Throwable) wokół trzynastu `::zarejestruj()`") **JEST obecny** (`aai-sklep.php:150-172`), a residuum siedzi w **innych plikach niż `miejsce.plik`**. Werdykt zgodny z `stwierdzenie`+`miejsce` to **NAPRAWIONE**, a residuum to **nowe znalezisko pod `BE-90`**. |
| `REA-BE-F1-001` | **NAPRAWIONE** | **TAK, w pełni** | `wp eval-file` na WŁASNYM kursie syntetycznym `dddd0000-…-00000krytbe1` (hooki `aai_sklep_kurs_zmieniony`/`_usuniety` zdjęte, więc **zero produktów-sierot** — w odróżnieniu od przebiegu roli): utworzenie `content='PROZA-KTORA-NIE-MA-ZNIKNAC'`, `materials={"plik":"oryginal"}`; **(1)** bez klucza `tresc` → `zaktualizowane=1`, `content` **nietknięty**, `materials` zmieniony; **(2)** bez klucza `materialy` → `content` zmieniony, `materials` **nietknięty**; **(3) pusta tablica** → `{"bez_zmian":1}`, **oba pola nietknięte**; **(4) ponad dowód roli:** `['materialy'=>null]` → `materials='null'` — to zapis klucza OBECNEGO, więc BLAD-018 nie jest złamany, ale warto wiedzieć. Kod potwierdzony: `class-aai-sklep-zapis.php:377/381` (`array_key_exists`). Sprzątnięte `usun_kurs()`, liczniki 2/22/12/73. **PRZEPUSZCZAM ten werdykt.** |

### Zasięg POLICZONY (czego rola nie zmierzyła)

Przelot **wszystkich 42 plików klas trzech wtyczek** (każdy: `chmod 000` → `sleep 4` → `curl /` i `/szkolenia/` → `chmod 644`):

| Wtyczka | Plików | Daje 500 | Które i którędy |
|---|---|---|---|
| `aai-sklep` | 13 | **2** | `class-aai-sklep-tutor.php` → `Zasoby::posprzataj` (`wp_enqueue_scripts`) → `Lekcja::policz()` → **`lekcja.php:317`**; **`class-aai-sklep-moje.php`** (rola tego NIE znalazła) → `Trasy::dodaj_reguly` (`init`) → **`trasy.php:81`** |
| `aai-platnosci` | 15 | **1** | **`class-aai-platnosci-ustawienia.php`** → **`aai-platnosci.php:63`**, wywołanie na POZIOMIE PLIKU (poza blokiem `try` z `plugins_loaded`; rejestracja B17 musi tam być, KROK-P3A.md §3) |
| `aai-monitor` | 14 | 0 | — |

**Co z tego wynika dla klasyfikacji:** 11 z 13 plików `aai-sklep` po naprawie **przestało** wywalać
witrynę, czyli `try/catch` zadziałał. Residuum (3 pliki na 42) **nie jest funkcją obecności `try/catch`** —
występuje tak samo we wtyczce, która ten `try/catch` ma od 2026-08-31 i którą zgłoszenie stawia za wzór.
Przesłanka zgłoszenia („siostry mają CAŁY start w try/catch **właśnie po to**, żeby brak jednego pliku
klasy nie wywalał całej witryny") jest więc **zmierzalnie niepełna**. Residuum to własna klasa:
**statyczne wywołanie klasy wtyczki bez `class_exists()`, z haka już zarejestrowanego albo z poziomu
pliku wtyczki** — i tak powinno być zgłoszone (`BE-90`), z tym zasięgiem, zamiast wchłonięte
w `AUD-BE-F1-001`.

### Ocena rund regresji (uruchomieniowe czy deklaratywne)

| Pozycja | Ocena | Uzasadnienie |
|---|---|---|
| `BE-R1` | **uruchomieniowa, przyjmuję** | `chmod`+`curl` i `wp eval` — odtworzyłem oba, zgodność co do linii. |
| `BE-R2` | **DEKLARATYWNA — odrzucam** | Odpowiedź „0/3 wtyczek ma dziurę" pochodzi z `grep 'try {'` i „lektury kontekstu", nie z uruchomienia. Pomiar ją **obala w tej części, która ma znaczenie**: `aai-platnosci` ma `try/catch` i **mimo to** oddaje 500 przy jednym uszkodzonym pliku. Dodatkowo podany zasięg (25/24) nie pokrywa klasy, którą ma opisywać. Re-audyt ma uruchamiać, nie czytać (P2). |
| `BE-R3` | **przyjmuję dla `REA-BE-F1-001`, odrzucam dla `AUD-BE-F1-001`** | Dla REA wpływ faktycznie zniknął (sprawdzone symetrycznie + pusta tablica). Dla AUD wniosek „wpływ utrzymuje się MIMO naprawy" jest prawdziwy jako OBSERWACJA, a fałszywy jako ATRYBUCJA do tego wpisu. |
| `BE-R4` | **niezrobiona i rola to przyznaje** | Zielone `sprawdz` trzech wtyczek (potwierdzam: `aai-platnosci`/`aai-sklep`/`aai-monitor` → kod **0**) nie jest badaniem spillover, tylko brakiem sygnału z bramek, które tej klasy nie mierzą. |
| `BE-R5` | **odrzucam w uzasadnieniu, przyjmuję w treści** | Mechanizm istnieje (potwierdzam pomiarem, w trzech miejscach), ale to NIE jest „właśnie znalezisko z `AUD-BE-F1-001`". |
| `BE-R6` | **uruchomieniowa, przyjmuję** | Odtworzyłem `content`/`materials`; `status`/`sekcje`/`moduly` chronione `array_key_exists` w `zapisz_kurs()` — tego akurat nie powtarzałem, dowód roli jest opisany dostatecznie, by go odtworzyć. |
| `BE-90` | **odrzucam** | Uzasadnienie niezgłaszania („DOKŁADNIE to samo miejsce … `plugins_loaded` aai-sklep.php") jest **sprzeczne z dowodem roli** — fatal pochodzi z `lekcja.php:317`, `trasy.php:81` i `aai-platnosci.php:63`. `BE-90` istnieje po to, żeby takie rzeczy wychodziły na wierzch, a tu posłużyło do ich schowania. |

### Czego rola nie sprawdziła, a powinna

1. **Nie policzyła powierzchni awarii.** Zbadała 2 pliki z 13 (jeden pozytywny, jeden kontrolny) i uogólniła. Prawdziwa liczba to **2 z 13** w `aai-sklep` — drugi (`class-aai-sklep-moje.php`) idzie **inną klasą i innym hakiem**, więc metryka „25 wywołań `Aai_Sklep_Tutor::`" go nie obejmuje.
2. **Nie sprawdziła wtyczek siostrzanych** — sama to wpisała w „Niedomknięte". To był krok rozstrzygający dla klasyfikacji: `aai-platnosci` reprodukuje ten sam objaw i przewraca przesłankę zgłoszenia.
3. **Nie rozliczyła się z całego śladu środowiskowego.** Tabela „przed/po" obejmuje 8 tabel i melduje parytet, a porównanie migawek `k-baza-b` → `k-BE-po` pokazuje **`wp_aai_sklep_changelog` 109 → 127 (+18)**, `wp_actionscheduler_actions/logs` +4 oraz **+1 plik w mediach** — to `wp-content/uploads/wc-logs/fatal-errors-*.log`, dokładnie ten, który wcześniej zatrzymał przywracanie środowiska. Przyrost dziennika audytu jest nieusuwalny i to w porządku, ale **ma być zadeklarowany**, a plik logu skasowany. (Mój przebieg: changelog 109 → **118**, media **1347 → 1347**, log skasowany, `git status wordpress/` czysty, uprawnienia wszystkich plików `644`, HTTP `/`, `/szkolenia/`, `/koszyk/` → **200**.)
4. **Nie zauważyła, że komentarz naprawy niesie dalej zdanie obalone w fali 1.** `class-aai-sklep-zapis.php` w bloku BLAD-018 pisze „woła ją też `wp aai-sklep proza <plik>`" — krytyk **i** weryfikator fali 1 zmierzyli niezależnie, że `proza` do bazy nie pisze w ogóle. Naprawa utrwaliła nieprawdę w komentarzu przy poprawionym kodzie.

### Stan środowiska po moim przebiegu

| Pozycja | Baseline (`k-baza-b`) | Po mnie |
|---|---|---|
| `courses` / `sections` / `modules` / `lessons` | 2 / 22 / 12 / 73 | **2 / 22 / 12 / 73** |
| `platnosci_powiazania` / `dostawy` | 2 / 0 | **2 / 0** |
| `monitor_logowania` / `wizyty` | 0 / 0 | **0 / 0** |
| `sklep_changelog` | 109 | **118** (+9 — mój dziennik audytu, niezmienny z założenia; jawnie deklaruję) |
| pliki w `uploads` | 1347 | **1347** (log `fatal-errors-*` skasowany) |
| uprawnienia plików wtyczek | 644 | **644** (przelot 42 plików przywrócony) |
| `git status --short wordpress/` | czysty | **czysty** |
| `aai-sklep|aai-platnosci|aai-monitor sprawdz` | kod 0 | **kod 0 / 0 / 0** |

Ślady własne, jawną listą: kurs syntetyczny `dddd0000-0000-4000-8000-00000krytbe1` (+ moduł `…krytbe2`,
lekcja `…krytbe3`) — utworzony i skasowany `usun_kurs()`; **produktu WooCommerce nie powstało**
(hooki synchronizacji zdjęte na czas pomiaru); plik `wc-logs/fatal-errors-2026-09-05-*.log` skasowany.
Portu 8892 i kontenerów bez `_b` nie dotykałem; `postaw.sh` nie uruchamiany.
