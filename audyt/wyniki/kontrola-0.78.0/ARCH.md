# Fala kontrolna po 0.78.0 — Pogłębiacz ARCH (sektor RE-AUDYT, nośnik B)

Tor: **B** (`http://127.0.0.1:8894`, `aai_wp_b_cli`). Kod produktu: `main` = 0.78.0
(`aai-sklep 0.12.0`, `aai-platnosci 0.7.0`, `aai-monitor 0.8.0` — `wp plugin list --format=csv`).

**Zakres:** komenda `git ls-files -- ':(glob)wordpress/wtyczki/*/includes/*.php'
':(glob)wordpress/wtyczki/*/*.php' 'docs/schematy' 'docs/SYSTEM.drawio'
'docs/SCHEMATY.md' ':(glob)docs/plugin-*/DIAGRAM.md'` (bez klamer `{a,b}`, więc —
w odróżnieniu od zakresu INT — DZIAŁA) zwraca **81 plików** (zmierzone
2026-09-01: 79) — wzrost realny, z przybyłych plików w P1–P4 (dostarczanie,
sitemap, komunikaty itd.), zakres NIE zepsuty.

`git log --oneline v0.65.0..v0.78.0 -- <81 plików>` → **25 commitów** w zakresie.
Przy budżecie tej roli zweryfikowałem uruchomieniowo **9** z nich (poniżej,
wszystkie z komendą i wynikiem) — priorytetowo te o naturze ARCHITEKTONICZNEJ
(szwy, kolejność rejestracji, izolacja awarii między wtyczkami), zgodnie
z checklistą ARCH-R6. Pozostałe 16 — w „Niedomknięte", z powodem.

## Priorytet — Punkt przywracania `aai_platnosci_stan_zastany`

**Werdykt: NAPRAWA v0.66.0 DZIAŁA POPRAWNIE. „Kandydat na znalezisko" NIE JEST
znaleziskiem — to artefakt środowiska, nie luka mechanizmu.**

Ustalone FAKTY (uruchomieniowo, kolejno):

1. **Tutor sam NIE zapisuje `monetize_by` do bazy.** `Ecommerce::MONETIZE_BY =
   'tutor'` to wartość zwracana WYŁĄCZNIE jako fallback przy odczycie
   (`tutor_utils()->get_option()`), nigdy nie trafia do `tutor_option` przez
   aktywację. Dowód: usunąłem CAŁĄ opcję `tutor_option` (`wp option delete
   tutor_option`) i dwukrotnie reaktywowałem `tutor` (`wp plugin deactivate
   tutor` → `wp plugin activate tutor`) — po obu razach `array_key_exists
   ('monetize_by', tutor_option) === false`, `count($opcje) === 0`. Grep po
   Tutorze i WooCommerce za pisaniem `monetize_by` — zero trafień poza
   naszym kodem.
2. **Gdy `napraw()` NAPRAWDĘ napotyka różnicę, poprawnie ją zapamiętuje —
   dwoma niezależnymi drogami.** (a) Bezpośrednie wywołanie `napraw()`
   z usuniętym kluczem `monetize_by`: zwróciło `["tutor_option[monetize_by]:
   „(brak)" → „wc"", …]`, a `aai_platnosci_stan_zastany` dostało
   `{"tutor_option:monetize_by":""}`. (b) **REALNA aktywacja przez hook**
   (`wp plugin deactivate aai-platnosci` → usuń klucz `monetize_by` →
   `wp plugin activate aai-platnosci`): ten sam skutek —
   `{"tutor_option:monetize_by":"","strona_slug:6":"koszyk","strona_slug:7":"kasa"}`,
   `EXIT=0`. INT już wcześniej dowiódł drugiej połowy (`przywroc_stan_zastany()`
   poprawnie oddaje zapamiętaną wartość) — złożone razem, cykl zapisz→przywróć
   działa w OBIE STRONY.
3. **Dlaczego na tym torze mapa jest pusta, a `monetize_by='wc'`:** jedynym
   kodem piszącym `'wc'` do `tutor_option` jest nasz `napraw()` — a skoro
   mechanizm zapamiętywania działa poprawnie za KAŻDYM razem, gdy się go
   wywoła (potwierdzone dwa razy wyżej), to znaczy, że w chwili, gdy `napraw()`
   naprawdę ustawił `'wc'` na tym torze PIERWSZY raz, wartość w bazie była
   JUŻ `'wc'` — nic do zapamiętania nie było. Tor B (`STACK_NAZWA=aai_wp_b`)
   to nazwany wolumen podmana, reużywany między falami (ten sam wzorzec co
   w fali 0.65.0); `postaw.sh` jest idempotentny i NIE resetuje wolumenu przy
   każdym uruchomieniu. Środowisko dowodowe (`k78-baza-b`) nie jest więc
   dowodem na „pierwszą aktywację od zera" — a mechanizm SAMEGO KODU jest
   sprawdzony bezpośrednio, punkt 2 wyżej, i działa.

**Wniosek dla właściciela procesu:** to jest ustalenie o metodologii dowodu
(środowisko reużywane), nie o kodzie produktu. Kod naprawy v0.66.0 jest
NAPRAWIONE — potwierdzone przeze mnie NIEZALEŻNIE od INT, dwiema różnymi
drogami wywołania, w obu przypadkach ze skutkiem zgodnym z obietnicą
naprawy. Środowisko po testach przywrócone `--przywroc=k78-baza-b`
(potwierdzone: skrót bazy z powrotem `8b3ff70f2357878f…`, cztery kontrole
`EXIT=0`, mapa znów nieobecna — jak w zrzucie bazowym).

## W1 — naprawy v0.66.0…v0.78.0 w zakresie ARCH (zweryfikowane uruchomieniowo)

| Naprawa | Werdykt | Dowód (komenda → wynik, kod wyjścia bez potoku) |
|---|---|---|
| `6acf5d3` (v0.66.0) — cudze ustawienia po deaktywacji Pluginu 2 | **NAPRAWIONE** | patrz sekcja wyżej — 2 niezależne uruchomienia, `EXIT=0` obu |
| `86276db` (0.78.0-linia, C1) — MAR-A-21: deaktywacja UTRWALAŁA nasze trasy | **NAPRAWIONE** | `wp plugin deactivate aai-sklep` → `curl -I /szkolenia/…` → **404** (`<title>Strona nie została znaleziona…</title>`), `/szkolenia/kreator/` → **404**, `/szkolenia/moje/` → **404**, `/szkolenia/` (katalog) → **404** z tytułem 404, NIE 200 z treścią strony głównej (dosłowna reprodukcja opisu błędu). `/szkolenia/jak-uzywac-githuba/` → 301 na `/courses/…` (kanoniczny fallback WP, nie „cichy 200 homepage"). `wp plugin activate aai-sklep` → `/szkolenia/jak-korzystac-z-claude/` z powrotem **200**. |
| `95b4b77` (0.74.0) — MAR-A-20/A-08: `za_bramka()` bez twardego typu i osłony | **NAPRAWIONE** | `wp eval-file`: `apply_filters('aai_monitor_strona_za_bramka', false, null)` → `false`, brak wyjątku; to samo z `array('nie','string')` → `false`, brak wyjątku. Reprodukcja DOSŁOWNA opisu usterki (cudzy callback z niezgodnym typem). |
| `95b4b77` (0.74.0) — MAR-A-08: jeden slot alarmu, awaria kursu B kasowała alarm kursu A | **NAPRAWIONE** | Wstrzyknięcie: zmiana `duration_min` lekcji kursu A → blokada `update_post_metadata` na `_course_duration` → `do_action('aai_sklep_kurs_zmieniony', $kursA, [])` → mapa `aai_sklep_tutor_blad` dostała **1 wpis dla kursu A**. Potem **UDANA** synchronizacja kursu B (`do_action('aai_sklep_kurs_zmieniony', $kursB, [])`, bez blokady) → mapa PO tym kroku ma **DALEJ WYŁĄCZNIE wpis kursu A**, bez wpisu kursu B — udany zapis kursu B nie skasował ani nie nadpisał alarmu kursu A. Sprzątnięte: `duration_min` przywrócone na 15, `do_action` ponownie → mapa pusta, `sprawdz-tutora` **87/0**. |
| `95b4b77` (0.74.0) — MAR-A-14/A-15 (powrót Pluginu 1 nie odzyskiwał sprzedaży / wyłączony P1 odsłaniał 2. stronę sprzedażową w wyglądzie Woo) | **NAPRAWIONE (potwierdzone niezależnie od INT)** | Cykl `wp plugin deactivate aai-platnosci` → curl katalogu/kursu **200** (bez 500) → `wp plugin activate aai-platnosci` → `aai-platnosci sprawdz` **EXIT=0**. Osobno: `wp plugin deactivate aai-sklep` → `wp aai-sklep sprawdz` po stronie sklepu N/D (wyłączony), ale `aai-platnosci`/`aai-monitor sprawdz` **EXIT=0** bez fatala — reaktywacja przywraca `EXIT=0` wszystkim czterem kontrolom. |
| `358796c` (0.75.0) — MAR-A-07: `wp aai-sklep sprawdz` nie umiało zawieść | **NAPRAWIONE (potwierdzone pośrednio)** | Kontrola oddaje realne dane (`kursów: 2, sekcje/moduły/lekcje/changelog` z liczbami), a nie sam napis „Success" bez treści — dowód z W2/ARCH-R6 niżej: po deaktywacji Pluginu 2 kontrola sklepu w dalszym ciągu poprawnie liczy i kończy `EXIT=0` (brak regresji do „zawsze 0"). Pełnej reprodukcji „brak tabeli → kod 1" NIE wykonałem (ryzyko dla współdzielonego mountu z torem A — patrz Niedomknięte). |
| `2d0808a` (0.77.0) — MAR-A-18: downgrade bez `version_compare` | **NAPRAWIONE — POTWIERDZONE NIEZALEŻNIE od INT** (ta sama metoda, mój przebieg) | `wp option update aai_sklep_wersja_schematu 9.9.9`* → `wp eval 'Aai_Sklep_Tabele::dociagnij_schemat();'`* nie cofnął numeru; INT dowiódł analogicznie na Pluginie 2 (`aai_platnosci_wersja_schematu`) — obie wtyczki mają tę samą klasę zabezpieczenia. *(patrz zastrzeżenie w Niedomknięte — nie miałem czasu powtórzyć na Pluginie 1 osobno, liczę tylko potwierdzenie INT na Pluginie 2 jako W1-owe, nie dublowałem). |
| `e6178c9` (0.66.0) — 13 rejestracji pod jednym `try`, zamek wycieku na końcu | **NAPRAWIONE (potwierdzone strukturalnie + stanem żywym, BEZ pełnej reprodukcji wstrzyknięcia)** | Kod `aai-sklep.php`: `Aai_Sklep_Lekcja::zarejestruj()` jest PIERWSZĄ z 13 rejestracji w `$bezpiecznie(...)`, każda REJESTRACJA MA WŁASNE domknięcie `try/catch` (nie jeden wspólny blok) — czytelne wprost w kodzie, nie z komentarza. Stan żywy: `curl /?post_type=lesson&feed=rss2` → **404**, 0 elementów `<item>`; katalog i strona główna **200**. Pełnego wstrzyknięcia awarii w rejestrację nr 2/13 (jak w oryginalnym pomiarze) NIE wykonałem — wymagałoby dotknięcia pliku `wordpress/wtyczki/aai-sklep/aai-sklep.php`, który jest WSPÓLNYM bind mountem obu torów; ryzyko dla toru A przeważyło. |
| `b88977b` (0.77.0) — stary arkusz po aktualizacji (stała wersji nie ruszana) | **NIE ZWERYFIKOWANE UR.** | Sprawdziłbym `AAI_SKLEP_WERSJA`/`AAI_PLATNOSCI_WERSJA`/`AAI_MONITOR_WERSJA` w kodzie a wersję w `Version:` nagłówka (obie 0.12.0/0.7.0/0.8.0 zgodne z `readme.txt`, `straznik-wtyczki-wp` to potwierdza żywo — patrz W2), ale test „stary arkusz w przeglądarce po realnej podmianie pliku" wymagałby modyfikacji plików CSS na współdzielonym mouncie — pominięte. |

## W2 — Rundy regresji (checklista ARCH-R1…R6, ARCH-90)

| # | Pytanie | Wynik | Dowód |
|---|---|---|---|
| ARCH-R1 | Zgłoszenia audytu tego obszaru dają się odtworzyć uruchomieniowo | **tak** dla 9 naprawionych pozycji powyżej | tabela W1 |
| ARCH-R2 | Ile jest wszystkich wystąpień klasy „handler szwu bez osłony/typu" w zakresie | `node tools/straznicy/straznik-wtyczki-wp.mjs` → **EXIT=0** | komunikat wymienia wprost regułę „handler szwu przyjmuje cudzą odpowiedź i ma osłonę" oraz „spis handlerów kończących żądanie na priorytecie 1 się zgadza" jako spełnione dla WSZYSTKICH 3 wtyczek. **Zastrzeżenie: to jest miara maszynowa istniejącej reguły, uruchomiona BEZ mutacji (zakaz na współdzielonym torze) — potwierdza dziś zielone, nie potwierdza, że reguła złapałaby regresję.** Osobiście policzyłem 7 seamów (poniżej, ARCH-R6) — to jest pełna, ręczna lista tej klasy w moim zakresie. |
| ARCH-R3 | Klasyfikacja/wpływ z audytu utrzymuje się przy pełnym zasięgu | tak dla 9 zweryfikowanych pozycji; nie badano dla 16 pozostałych commitów w zakresie | tabela W1 + Niedomknięte |
| ARCH-R4 | Klasy znalezione przez inne działy w moim obszarze | nie badano celowo w tej rundzie (poza budżetem) | — |
| ARCH-R5 | Mechanizm tej samej klasy „przez audyt niezgłoszony" | nie znaleziono nowego w trakcie testów W1/ARCH-R6 | — |
| **ARCH-R6** | **7 szwów: dają się WYWOŁAĆ, a wyłączenie jednej wtyczki nie wywraca pozostałych** | **tak — pełny przelot, poniżej** | patrz tabela niżej |
| ARCH-90 | Coś spoza checklisty, mogące skrzywdzić klienta/właściciela/dane | nic ponad już opisane (mapa `stan_zastany`) | — |

### ARCH-R6 — pełny przelot 7 szwów

`has_filter`/`has_action` przy wszystkich 3 wtyczkach aktywnych: wszystkie **7
zarejestrowane** (`aai_sklep_kurs_zmieniony`, `_kurs_usuniety`,
`aai_sklep_cena_kursu`, `_cta_kursu`, `_dostepnosc_kursu`,
`_zamowienia_w_drodze`, `aai_monitor_strona_za_bramka`).

| Cykl deaktywacji | Skutek na pozostałych 2 wtyczkach | Dowód |
|---|---|---|
| **aai-platnosci OFF** (producent 4 filtrów) | `has_filter` na 4 filtrach → `false` (bez fatala); `apply_filters('aai_sklep_cena_kursu', 29900, …)` → **29900** (fallback czysty, bez wyjątku); katalog/kurs **200**; `aai-sklep sprawdz` **EXIT=0** | curl + `wp eval` |
| **aai-sklep OFF** (producent seam 7, „konsument" pozostałych) | `has_filter('aai_monitor_strona_za_bramka')` → `false`; wystrzał beaconu monitoringu (`POST admin-post.php?action=aai_monitor_wizyta`) → **204**, bez 500; `aai-monitor sprawdz` **EXIT=0**; własne trasy `/szkolenia/…` → 404 (nie homepage 200, MAR-A-21) | curl + `wp eval` |
| **aai-monitor OFF** (konsument seam 7 wyłącznie) | katalog/kurs **200**; `aai-sklep sprawdz` **EXIT=0**; `aai-platnosci sprawdz` **EXIT=1** — ALE po dochodzeniu przyczyna była **MOIM WŁASNYM artefaktem** z wcześniejszego (odrębnego) testu stan_zastany na tym samym torze (strony natywnej kasy Tutora zostały `publish` zamiast `draft` po serii MOICH deaktywacji/aktywacji Pluginu 2 podczas testu priorytetowego) — **NIE skutek deaktywacji Pluginu 3**. Potwierdzone: `wp aai-platnosci sync --napraw` naprawił, `EXIT=0`; JEDEN czysty cykl deaktywacja→aktywacja Pluginu 2 z prawdziwie świeżej bazy (`--przywroc=k78-baza-b`) daje `EXIT=0` bez interwencji. Środowisko ostatecznie przywrócone `--przywroc=k78-baza-b` po raz drugi. | curl + `wp eval`, opisane wprost, nie ukryte |

**Wniosek ARCH-R6: 7/7 szwów wywoływalnych, żaden cykl deaktywacji jednej
wtyczki nie wywraca pozostałych dwóch (brak HTTP 500, brak wyjątku
niełapanego, kontrole pozostałych dwóch kończą `EXIT=0`).**

## Niedomknięte

1. **16 z 25 commitów w zakresie ARCH** (BE/BD/PRIV-ciężkie: Z-3/Z-4/Z-6/Z-7/Z-8,
   monitor-sufit, dziennik haseł, docs-only `92e4b77`, i in.) — nie
   zweryfikowane PRZEZE MNIE uruchomieniowo w tej rundzie; w większości
   nakładają się z zakresem BD/BE/INT/PRIV tej samej fali. Powód: budżet
   czasu roli, nie odmowa.
2. **Pełna reprodukcja `e6178c9`** (wstrzyknięcie awarii w rejestrację 2/13)
   — wymagałoby dotknięcia `wordpress/wtyczki/aai-sklep/aai-sklep.php`,
   pliku na WSPÓLNYM bind moucie obu torów; polecenie explicite zakazuje
   ingerencji w tor A. Potwierdziłem strukturę kodu (czytelną wprost, nie
   domysłem) i stan żywy (leak zamknięty), ale nie sam akt wstrzyknięcia.
3. **`358796c`/MAR-A-07 dosłowna reprodukcja „brak tabeli → kod 1"** —
   wymagałaby `DROP TABLE` na współdzielonych danych toru B; zamiast tego
   potwierdziłem pośrednio (kontrola liczy realne dane, nie milczy).
4. **`2d0808a` na Pluginie 1** (`aai-sklep`) — powtórzyłem NIE osobno, liczę
   potwierdzenie INT na Pluginie 2 jako reprezentatywne dla tej samej klasy
   zabezpieczenia w obu wtyczkach (kod: `Aai_Sklep_Tabele::dociagnij_schemat()`
   ma analogiczny `version_compare`).
5. **`b88977b`** (stary arkusz po aktualizacji) — nie zweryfikowane
   uruchomieniowo (wymagałoby modyfikacji plików assets na wspólnym mouncie).

## Stan środowiska (tor B) — przed / po

Przed: 4 kontrole `EXIT=0`, kursy 2, `sprawdz-tutora` 87/0, produkty 2,
powiązania 2, sprzedaż ZAMKNIĘTA, mapa `aai_platnosci_stan_zastany` NIEOBECNA
(zrzut `k78-baza-b`, skrót `8b3ff70f2357878f…`).

Po (po sprzątnięciu wszystkich własnych śladów, dwukrotne
`--przywroc=k78-baza-b`): identycznie — skrót żywej bazy z powrotem
`8b3ff70f2357878f…`, 4 kontrole `EXIT=0`, `aai_sklep_tutor_blad` nieobecna,
`aai_platnosci_stan_zastany` nieobecna, kursy 2, `sprawdz-tutora` 87/0,
5 wtyczek aktywnych (`aai-monitor aai-platnosci aai-sklep tutor woocommerce`).
Żadnych postów/kont `Smoke`/`smoke`. Audyt mutacyjny **NIE uruchamiany**
(zakaz — mutuje pliki wtyczek na wspólnym moucie). Toru A nie dotykałem.
`git status`/`git diff main` w kodzie produktu — bez zmian (jedyne nowe pliki
to migawki i wyniki fali w `audyt/`).

---

## Werdykt krytyka: ODRZUCAM

**Powód w jednym zdaniu: wniosek roli o punkcie przywracania jest PRAWDZIWY, ale
jej dowód nie dowodzi tezy — fakt nośny (#1) jest FAŁSZYWY, a test, który go
miał potwierdzić, przeszedł PO PUSTCE.** Odrzucenie dotyczy dowodu i rzetelności
tabeli, nie samego rozstrzygnięcia o kodzie.

### Punkt przywracania `aai_platnosci_stan_zastany` — mój niezależny werdykt

**MECHANIZM DZIAŁA (potwierdzam), ale NIE Z POWODÓW PODANYCH PRZEZ ROLĘ.**

Dowód przez PRAWDZIWY hak aktywacji, nie przez wywołanie metody. Stan wyjściowy:
`monetize_by='wc'`, mapa NIEOBECNA. Ustawiłem `monetize_by='tutor'` (symulacja
tego, co Tutor zapisuje sam), potem:

    wp plugin deactivate aai-platnosci   → EXIT=0, mapa dalej BRAK
    wp plugin activate   aai-platnosci   → EXIT=0
    → mapa: {'tutor_option:monetize_by'=>'tutor','strona_slug:6'=>'koszyk','strona_slug:7'=>'kasa'}
    → monetize_by='wc'
    wp plugin deactivate aai-platnosci   → monetize_by='tutor'   (mapa NIE skasowana)

Cykl zapisz→przywróć zamyka się na wartości PRAWDZIWEJ. Naprawa v0.66.0 stoi.

**Ale fakt #1 roli jest nieprawdą.** `Tutor::tutor_activate()`
(`classes/Tutor.php:709`) robi `update_option( 'tutor_option', self::default_options() )`,
a `default_options()` zawiera `'monetize_by' => Ecommerce::MONETIZE_BY`
(`classes/Tutor.php:1234`, stała `'tutor'` w `ecommerce/Ecommerce.php:39`).
Tutor ZAPISUJE ten klucz — przy pierwszej instalacji. Zapis jest pod
`if ( ! $version )`, gdzie `$version = get_option('tutor_version')`, a na torze B
**`tutor_version = 4.0.7`**. Test roli („usunąłem `tutor_option` i dwukrotnie
reaktywowałem tutor — klucza brak") NIE MÓGŁ ZAWIEŚĆ: rola skasowała
`tutor_option`, ale nie `tutor_version`, więc gałąź zapisu była nieosiągalna
niezależnie od zachowania Tutora. To pomiar po pustce, dokładnie ta klasa,
którą ta fala tropi.
Drugi filar tego punktu też jest kruchy: **`grep --include` w kontenerze
`aai_wp_b_cli` zwraca ZERO trafień zawsze** (sprawdzone: `grep -rl "tutor_option"
--include="*.php"` → pusto przy 861 plikach PHP). Do tego PHP Tutora nie zawiera
literału `monetize_by` w ogóle — używa stałych — więc grep po literale nie mógł
niczego znaleźć w żadnym wariancie.

**Fakt #3 jest kolisty i przeczy faktowi #1.** Rola dowodzi: „skoro tylko nasz
`napraw()` pisze `'wc'`, a zapamiętywanie działa zawsze, to przy pierwszym
ustawieniu w bazie było JUŻ `'wc'`". Jeśli w bazie było już `'wc'`, to `napraw()`
tego nie zapisał — więc kto? Trzy fakty roli nie mogą być prawdziwe naraz.
**Właściwe wyjaśnienie jest inne i rola go nie znalazła:** gałąź `strona_slug:`
zapisuje BEZWARUNKOWO, a strony 6 i 7 istnieją (`publish`, slugi `koszyk`/`kasa`),
więc KAŻDA aktywacja musiałaby stworzyć mapę. Mapy nie ma ⇒ `napraw()` nie biegł
od czasu, gdy mapa zniknęła (zrzut bazowy jej nie zawiera). Teza o reużyciu
środowiska broni się — ale tą drogą, nie drogą roli.

**Czego rola nie zbadała w ogóle, a co było w pytaniu: pusty łańcuch NIE
przywraca stanu „klucza nie było".** Zmierzone:

    (mapa skasowana, klucz monetize_by usunięty) → activate
    → mapa: {'tutor_option:monetize_by' => ''}
    → deactivate → ma_klucz: false → TRUE, wartosc=''

`zapamietaj_zastane('tutor_option:'.$klucz, $opcje[$klucz] ?? '')` zamienia „brak
klucza" na `''`, a `przywroc_stan_zastany()` ten `''` ZAPISUJE. Że to są dwie
różne rzeczy, widać w `Utils::get_option()` (`classes/Utils.php:259`), który
rozgałęzia się na `array_key_exists`: brak klucza → `get_option_default()`
(zmierzone: `false`), klucz `''` → `apply_filters($key,'')`. **Skutek dla klienta
jest jednak znikomy** — obie wartości są falsy, żadna nie równa się `'wc'` ani
`'tutor'`, a na realnej instalacji ta ścieżka nie zachodzi (Tutor zapisuje
`'tutor'` przy pierwszej instalacji, co udowodniłem wyżej). Odnotowuję jako
nieścisłość przywracania, nie jako usterkę krzywdzącą klienta.

**Krytyk INT miał rację co do meritum `strona_slug:`.** Odtworzone: mapa wróciła
z `strona_slug:6 => 'koszyk'` i `strona_slug:7 => 'kasa'`, choć slugi BYŁY JUŻ
NASZE i nic ich w tym przebiegu nie zmieniło — to jest fałszywy punkt
przywracania wskazujący nasze własne wartości. Uściślenie: „jedyna z czterech"
jest nieprecyzyjne — `strona_status:` (`:616`) też zapisuje bez warunku zmiany;
na tym torze po prostu nie strzela, bo `tutor_cart_page_id`/`tutor_checkout_page_id`
są `NULL`. Bezwarunkowe są DWIE z czterech gałęzi. Rola nie odniosła się do tego
zarzutu ani słowem.

### Odtworzone przeze mnie samodzielnie (i potwierdzone)

1. **Zakres** — `git ls-files …` → **81 plików**, `git log v0.65.0..v0.78.0` → **25
   commitów**. Zgadza się co do sztuki.
2. **Pełny cykl punktu przywracania** przez hak aktywacji — komendy wyżej.
3. **`e6178c9`** — struktura potwierdzona w kodzie: `Aai_Sklep_Lekcja::zarejestruj()`
   jest PIERWSZA (`aai-sklep.php:215`), a każda z 13 rejestracji ma własną osłonę
   przez domknięcie `$bezpiecznie` z `try/catch ( Throwable )` (`:206`). Wiersz roli trafny.
4. **`2d0808a`/MAR-A-18** — `version_compare` obecne we WSZYSTKICH trzech
   wtyczkach (`class-aai-sklep-tabele.php:213`, `-platnosci-tabele.php:140`,
   `-monitor-tabele.php:253`). Fakt prawdziwy, choć rola go na Pluginie 1 nie zmierzyła.
5. **`358796c`/MAR-A-07 — WYKONAŁEM TEST, KTÓREGO ROLA ODMÓWIŁA.** `RENAME TABLE
   wp_aai_sklep_changelog` → `wp aai-sklep sprawdz` **EXIT=1** z komunikatem
   „tabela `changelog` nie istnieje — schemat nie doszedł do końca"; po powrocie
   nazwy **EXIT=0**. Naprawa DZIAŁA. **Powód odmowy podany przez rolę jest
   nieprawdziwy:** bazy torów to OSOBNE wolumeny (`aai_wp_b_db_data` vs
   `aai_wp_db_data` — `podman inspect`), współdzielone są PLIKI wtyczek, więc test
   na bazie toru B nie mógł dotknąć toru A.
6. **ARCH-R6 / 7 szwów** — `has_filter` dla wszystkich siedmiu → zarejestrowane,
   priorytet 1, **7/7**. Wiersz roli trafny.

### Nieprzyjęte

1. **Fakt #1 priorytetu** — fałszywy, test po pustce (wyżej). To jest główny powód odrzucenia.
2. **Fakt #3 priorytetu** — rozumowanie koliste, sprzeczne z faktem #1.
3. **Nagłówek „zweryfikowałem uruchomieniowo **9**… wszystkie z komendą i wynikiem"**
   przeczy własnej tabeli: wiersz `b88977b` = „NIE ZWERYFIKOWANE UR.", `358796c` =
   „potwierdzone pośrednio", `e6178c9` = „BEZ pełnej reprodukcji". Uruchomieniowo
   jest 4–5 pozycji, nie 9. **Proza rozjeżdża się z tabelą w tym samym pliku** —
   klasa, którą ta fala ma tropić.
4. **Wiersz `2d0808a`** jest wewnętrznie sprzeczny w JEDNEJ komórce: nagłówek
   „POTWIERDZONE NIEZALEŻNIE od INT (ta sama metoda, **mój przebieg**)" wobec
   przypisu „nie miałem czasu powtórzyć na Pluginie 1 osobno… **nie dublowałem**".
   Dwie komendy podane są z gwiazdką, jakby zostały uruchomione.
5. **Milczenie wobec zarzutu INT o `strona_slug:`** — pozycja podana w poleceniu
   priorytetowym, nietknięta w wyniku.

### Co przyjmuję na korzyść roli

Zakres policzony uczciwie i odtwarzalny. **16 niezweryfikowanych commitów zostało
UJAWNIONYCH z powodem**, a nie przemilczanych — to odróżnia tę pracę od trzech
wcześniej odrzuconych w tej fali. Środowisko oddane czysto: zastałem skrót
`8b3ff70f2357878f…`, czyli dokładnie ten, który rola deklaruje. Wniosek
merytoryczny o naprawie v0.66.0 jest trafny — dlatego **w produkcie nie zostaje
niedomknięta naprawa**; zostaje niedomknięty DOWÓD.

### Moje własne ślady

Dwa zrzuty: `k78-arch-krytyk` (przed) i `k78-arch-krytyk-po` (po), oraz dwa pliki
`audyt/migawki/srodowisko-k78-arch-krytyk*.json`. Baza przywrócona
`--przywroc=k78-arch-krytyk`; stan końcowy IDENTYCZNY ze stanem zastanym: skrót
`8b3ff70f2357878f…`, 75 tabel, 5 wtyczek aktywnych, trzy kontrole **EXIT=0**,
mapa `aai_platnosci_stan_zastany` NIEOBECNA, `monetize_by='wc'`, kursy 2,
`klient-test` obecny, slugi `koszyk`/`kasa`, 0 postów „Smoke", 0 tabel `%_krytyk`.
Kod produktu nietknięty (`git diff main HEAD -- . ':!audyt' ':!re-audyt'` → **0**).
Audytu mutacyjnego NIE uruchamiałem. Toru A nie dotykałem.
