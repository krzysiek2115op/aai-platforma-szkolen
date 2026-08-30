# Krytyka schematu Pluginu 3 (T0) — znaleziska i werdykty

Procedura wg ZASADY 0 właściciela (2026-08-26) i WYTYCZNE N1: trzej
recenzenci na rozłącznych obszarach, krytykiem krytyków agent główny.
**Żadne znalezisko nie idzie do naprawy bez niezależnego potwierdzenia** —
kolejność potwierdzania z [KRYTYK.md](../../agenci/przeglad-pr/KRYTYK.md):
uruchomieniowo → czytaniem kodu → odrzucenie z powodem.

Recenzowany stan: commit `88fffa6` (po rebase na 0.54.0; w chwili krytyki `49f9c91`), [DIAGRAM.md](DIAGRAM.md).
Instalacja pomiarowa: **WordPress 6.9.4** + WooCommerce 11.0.1 + Tutor 4.0.7
na `:8892`.

Obszary: **A** architektura i kontrakty · **B** cudzy kod, wyścigi,
bezpieczeństwo · **C** prostota i sprawdzalność.

## Werdykty — co potwierdziłem WŁASNYMI rękami

Każdy wiersz odtworzony przeze mnie na żywej instalacji albo przeczytany
w kodzie; nie przyjęty na słowo recenzenta.

| # | Teza | Werdykt | Mój dowód |
|---|---|---|---|
| **B-1** | `sendBeacon(url, string)` idzie jako `text/plain`, a REST WP **nie parsuje** wtedy ciała | **POTWIERDZONE** | `WP_REST_Request` z `Content-Type: text/plain;charset=UTF-8` → `get_param('sciezka')` = **NULL**, `json_params` = 0, `body_params` = 0, ale `get_body()` niesie 80 B. Ten sam ładunek z `application/json` → `'/szkolenia/'`. Endpoint napisany na `get_param()` zapisałby **zero wierszy** z prawdziwej przeglądarki, a smoke curlem przechodziłby |
| **B-2** | Wyjątek z naszego handlera `set_logged_in_cookie` **wywala kasę** | **POTWIERDZONE** | Handler rzucający `RuntimeException` podpięty na ten hak → `wc_set_customer_auth_cookie( $klient )` **przepuszcza wyjątek na zewnątrz**. W prawdziwym żądaniu kasy = HTTP 500, zakup pada. Teza schematu „nie ma ścieżki, na której zepsuje sklep" (sekcja 3) była **FAŁSZYWA** |
| **B-3** | `REMOTE_ADDR` w tym środowisku to stała brama podmana | **POTWIERDZONE** | `wp_wc_orders.ip_address` dla zamówień 1625 / 2010 / 2590 → **`10.89.4.4`** dla wszystkich trzech (realne zakupy właściciela) |
| **B-4** | Nieudane logowanie **hasłem aplikacji REST** nie odpala `wp_login_failed` | **POTWIERDZONE** | `default-filters.php:509` → `determine_current_user` → `wp_validate_application_password`, a ta woła `wp_authenticate_application_password()` **bezpośrednio** (`user.php:536`), z pominięciem `wp_authenticate()`, gdzie jedynie żyje `wp_login_failed` (`pluggable.php:727`) |
| **B-5** | Limiter na transiencie jest **nieatomowy** | **POTWIERDZONE** | `wp_using_ext_object_cache()` → **NULL** (brak zewnętrznego cache), czyli transient = `wp_options`, czytaj-modyfikuj-zapisz, bez `INCR` i bez blokady |
| **B-8** | Emiterów `set_logged_in_cookie` bez `wp_login` jest więcej niż kasa | **POTWIERDZONE** | `tutor/classes/Student.php:156` i `tutor/classes/Instructor.php:189` wołają `wp_set_auth_cookie()` bez `wp_login` (dziś uśpione — natywne logowanie Tutora wyłączone — ale włączą się cicho) |
| **B-9** | Nagłówek faktów podaje złą wersję WP | **POTWIERDZONE dla schematu, ODRZUCONE dla CLAUDE.md** | `wp core version` → **6.9.4**, nie 7.0.1 — schemat poprawiony. Ale oba wystąpienia „WP 7.0.1" w CLAUDE.md (linie 797, 943) dotyczą **starego środowiska `tutor-wp` na `:8091`**, nie tej instalacji; kontener jest wyłączony od czterech dni („nieodtwarzalny zabytek"), więc nie mam dowodu, że tamten zapis jest fałszywy. **Nie ruszam go** — poprawianie zapisu bez dowodu wprowadziłoby nową nieprawdę zamiast usunąć starą |
| **C-5** | Niezmiennik N1 jest **ślepy i zdublowany** | **POTWIERDZONE** | `straznik-wtyczki-wp.mjs:60` iteruje po **wszystkich** katalogach `wordpress/wtyczki/`, a jego reguła zapisu (`:179`) wymaga `includes/class-<wtyczka>-zapis.php`. Objąłby `aai-panel` od pierwszego dnia. Mój N1 szukałby **literalnych nazw tabel**, których sekcja 7 zabrania używać poza jednym miejscem — nie znalazłby nic na żadnym kodzie, także zepsutym |
| **C-8** | „37. strażnik" to fałszywa liczba | **POTWIERDZONE** | `ls tools/straznicy/straznik-*.mjs \| wc -l` → **35** na tej gałęzi (36. żyje w PR #93, jeszcze niezmergowanym). Reguła projektu: liczby tylko z pomiaru |
| **A-1** | Menu Pluginu 3 przejmie odnośnik pozycji „Automatic AI" | **OBALONE co do mechanizmu, PRZYJĘTE co do wniosku** | Wierne odtworzenie rejestracji (`add_menu_page` Pluginu 1 sam tworzy pozycję o slugu rodzica na indeksie 0) → href nadrzędnej **pozostaje** `page=aai-sklep`. Ale kolejność podmenu wychodzi `aai-sklep, aai-sklep-kurs, aai-panel, aai-sklep` — nasza pozycja wchodzi **w środek**, przed pozycjami Pluginu 1. Priorytet 20 naprawia (nasza na końcu). Rozwiązanie recenzenta słuszne, uzasadnienie było błędne |
| **A-5** | Kontrola po HTTP jest niewykonalna z kontenera WP-CLI | **POTWIERDZONE** | `wp_remote_get( home_url('/') )` z `aai_wp_cli` → **cURL error 7: Failed to connect to 127.0.0.1:8892**. Kontrola po żądaniu byłaby czerwona zawsze i wywracała `postaw.sh` |
| **A-9** | Wtyczki montowane są w DWÓCH usługach compose | **POTWIERDZONE** | `grep -c "wtyczki/aai-sklep" compose.yml` → **2** (usługi `wordpress` i `cli`). Bez mountu w `cli` komenda `wp aai-panel sprawdz` nie istnieje, a bramka T1 pada w sposób wyglądający na błąd kodu |
| **A-2, A-3, A-4, A-6, A-7, A-8, A-10** | Braki we własnym tekście: kolumna `wejscie` bez producenta, przemilczana strefa czasowa, ekran i kanał odczytu bez kroku, brak kanału błędów, brak kontroli dryfu wersji, niekompletna korekta do PLAN.md, martwe odsyłacze | **PRZYJĘTE** | potwierdzone przeczytaniem schematu i wskazanych plików; wszystkie wprowadzone |
| **C-14** | Nazwa `.aai-panel` jest **zajęta** | **POTWIERDZONE** | Łańcuch `aai-panel` występuje już w `aai-sklep`: `szablony/katalog.php`, `assets/lekcja.css`, `assets/panel.css` |

Sprzeczności **w moim własnym tekście**, potwierdzone jego przeczytaniem
(C-2, C-3, C-6, C-9, C-10, C-11) — opisane niżej razem z naprawą.

## Znaleziska krytyczne i poważne — co z nich wynika

### Grupa 1: timer wizyt był nie do udowodnienia (B-1, C-1, C-2, C-7)

Najgroźniejszy splot. **B-1** znaczy, że endpoint napisany „normalnie"
zapisze zero wierszy z prawdziwej przeglądarki. **C-1**: pełna ścieżka
`pomiar.js → sendBeacon → REST → INSERT` nie miała w schemacie żadnego
wykonalnego dowodu — bo skrypt sam się wyłącza przy
`navigator.webdriver === true`, a jedyny rig projektu taki właśnie jest.
Do tego decyzja „204 na wszystko" odbierała ostatni objaw. Razem: rozjazd
klient–serwer byłby **bezobjawowy**, dokładnie klasa BLAD-019 („cała
warstwa JS kreatora poza zasięgiem pomiaru").

**C-2**: sekcja 5 mówiła „czas **przycinany** do sufitu", a N9 „czas ponad
sufit → **odrzut bez zapisu**" — kod i bramka pisane z dwóch zdań tego
samego dokumentu musiałyby się rozjechać.

**C-7**: „seria złych beaconów → liczba wierszy bez zmian" przechodzi także
na **martwym endpoincie** (404 też nie tworzy wierszy) — klasa BLAD-022.

### Grupa 2: dziennik logowań mógł zepsuć sklep i kłamać (B-2, B-4, B-6, B-8, C-6)

**B-2** to najpoważniejsze pojedyncze znalezisko: nasz nasłuch biegnie
**wewnątrz żądania kasy**, więc niezłapany wyjątek = HTTP 500 przy zakupie.
Teza o nieszkodliwości modułu była fałszywa.

**B-4**: schemat obiecywał, że porażki haseł aplikacji REST są w dzienniku —
nieprawda, brute-force po REST byłby niewidzialny.

**B-6**: retencja „przy zapisie" nie gwarantuje twardych 90 dni — przy
bezczynności wiersze z IP żyją dłużej, a polityka prywatności obiecywałaby
co innego niż robi mechanizm.

**C-6**: najczęstsza ścieżka (logowanie formularzem z dedupem INSERT+UPDATE)
nie miała ani niezmiennika, ani bramki — zepsuty UPDATE dawałby ciche
kłamstwo o źródle.

### Grupa 3: bramki i liczby (C-3, C-4, C-5, C-8, C-10)

**C-3**: `sprawdz` porównywał najstarszy wiersz do **zegara**, a retencja
jest leniwa z definicji — na cichej instalacji dawałby fałszywą czerwień
i psuł `postaw.sh`. **C-4**: dziennik logowań byłby zaśmiecany przez własne
bramki (8 smoke'ów loguje się do instalacji), a „licznik porażek z 7 dni"
— jedyna funkcja alarmowa ekranu — pokazywałby serie wyprodukowane przez
testy.

## Odrzucone i zmienione po weryfikacji

| # | Co | Werdykt |
|---|---|---|
| C-8 (część) | Odsyłacz do „higieny z 0.54.0" wskazuje nieistniejący artefakt | **PRZYJĘTE Z KOREKTĄ**: `tools/smoke/poczta.mjs` **istnieje** i 0.54.0 jest gotowe — ale w **PR #93**, jeszcze niezmergowanym. Recenzent czytał gałąź `docs/schemat-pluginu-3`, gdzie tego nie ma. Odsyłacz zostaje, z jawnym „(PR #93)" |
| B-7 (cross-origin) | Beacon z obcej domeny zawyża ruch | **PRZYJĘTE**, ale bez sprawdzania `Origin` jako jedynej tamy — nagłówek jest do podrobienia poza przeglądarką (jak `x-forwarded-for`, lekcja z limitera prototypu). Wchodzi razem z walidacją ścieżki przeciw realnym trasom |
| C-9 (`user_id`) | Kolumna bez czytelnika | **PRZYJĘTE INACZEJ**: nie usuwam kolumny — `user_id` jest jedynym pewnym identyfikatorem konta (login bywa zmieniany, a przy porażce jest śmieciem). Zamiast tego **ekran dostaje kolumnę „źródło"**, a proza nazywa czytelnika `user_id` wprost |

## Co z tego wchodzi do schematu

Przepisanie obejmuje: sprostowanie faktów (B-9 wersja, B-3 IP), naprawę
tez fałszywych (B-2 sekcja 3, B-4 sekcja 4), rozstrzygnięcie sprzeczności
(C-2), wykreślenie zdublowanego niezmiennika (C-5), poprawienie liczb
(C-8, C-10), dołożenie brakujących niezmienników (C-6 formularz, C-4
higiena dziennika, B-2 `try/catch`) i **rozstrzygnięcie sposobu dowodzenia
pełnej ścieżki beaconu** (C-1) — bez tego krok T3 byłby niesprawdzalny.

Stan po przepisaniu: [DIAGRAM.md](DIAGRAM.md), sekcja 0 („Co zmieniła
krytyka T0").
