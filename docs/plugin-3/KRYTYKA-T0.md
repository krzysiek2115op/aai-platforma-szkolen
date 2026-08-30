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

## Przegląd całościowy (2026-08-30) — czy Plugin 3 pasuje do Pluginów 1 i 2

Na polecenie właściciela: ocena schematu **znając cały projekt**, nie tylko
ten dokument. Cztery znaleziska, wszystkie potwierdzone pomiarem w repo
i wprowadzone.

| # | Znalezisko | Dowód | Naprawa |
|---|---|---|---|
| **K1 KRYTYCZNE** | Wystrzał przez **trasę REST** łamał konwencję obu poprzednich modułów, a nie był nazwany odstępstwem | W repo jest **0** wywołań `register_rest_route` i **0** `wp_ajax_*`, za to **6** akcji `admin_post_*` w Pluginie 1. CLAUDE.md i DIAGRAM P2 mówią wprost: „w WordPressie wystrzałem JEST `admin-post.php`". Sprawdzone też, że gościa obsługuje `admin_post_nopriv_{action}` (`wp-admin/admin-post.php:43–58`) — czyli konwencja **wystarcza** dla beaconu | Wystrzałem jest **akcja `admin-post.php` z `nopriv`**. **Efekt uboczny: pułapka F9 przestaje nas dotyczyć** — ciało czytamy z `php://input` sami, więc nie zależymy od tego, jak REST traktuje `text/plain` |
| **K2 POWAŻNE** | Brak rozdzielenia ról „kontrola nigdy nie pisze" (L11 z krytyki P0 Pluginu 2) | Plugin 2 ma to nazwane wprost (`class-aai-platnosci-ustawienia.php:5,577`); mój schemat wspominał o tym w prozie, ale nie miał niezmiennika | Doszedł **N16** z przepisem i mutacją |
| **K3 POWAŻNE** | Niezmienniki nie miały przypisania do kroków — zgłaszał to krytyk A, a ja wprowadziłem to tylko połowicznie | `grep -c "niezmienniki zamykane"` → **0** | Tabela kroków ma teraz kolumnę i **każdy z N1–N18 jest zamykany w konkretnym kroku** |
| **K4 POWAŻNE** | Nazwa wtyczki `aai-panel` była źródłem kolizji w całym repo | Konwencja: strażnik nazywany od wtyczki (`straznik-platnosci-wp` ← `aai-platnosci`), więc dla `aai-panel` wyszedłby `straznik-panelu-wp` — a „panel" w tym repo znaczy **kreator** (`smoke:wp-panel` mierzy kreator, `Aai_Sklep_Panel*`, `.aai-panel` zajęte) | Wtyczka nazywa się **`aai-monitor`**: `straznik-monitora-wp`, `smoke-wp-monitor`, tabele `wp_aai_monitor_*`, prefiks `aai-monitor-`. Kolizja znika u źródła, konwencja nazw wraca |

**Sprawdzone i spójne z resztą projektu — nie szukać drugi raz:** brak CSP
na froncie WP (beacon nie jest blokowany); `straznik-platnosci-wp` skanuje
wyłącznie swój katalog, więc nowy strażnik go nie dubluje; `uninstall.php`
obu wtyczek domyślnie nie kasuje danych — nasz robi tak samo; kontrola
`sprawdz` mieszka w klasie CLI (wzór P2); klasa odczytu oddzielona od
zapisu istnieje w P1 (`class-aai-sklep-odczyt.php`) — nasza nazwa i rola
pasują; objętość dokumentu (585 wierszy) mieści się między P1 (208)
a P2 (677).

## Domknięcie uwag K1–K4 (2026-08-30) — po akceptacji schematu

Właściciel przyjął schemat („akceptuję diagram, lecz poprawmy") z warunkiem:
uwagi K1–K4 wprowadzić **bezpiecznie, bez regresji, ze sprawdzeniem przed
i po**. Sprawdzenie **przed** obaliło założenie, że wszystkie cztery są już
wprowadzone — dwie były niekompletne, w tym jedna niebezpiecznie.

| # | Stan zastany | Dowód (mój, uruchomieniowy) |
|---|---|---|
| **K1** | **NIEKOMPLETNA**: sześć miejsc mówiło wyłącznie o `admin_post_nopriv_`. `admin-post.php` rozgałęzia się po `is_user_logged_in()` (`:36`) na DWA rozłączne haki, a D3 każe liczyć wizyty wszystkim oprócz adminów — **strony lekcji są za logowaniem**, więc kod z tego schematu zapisałby zero odsłon lekcji. Do tego nigdzie nie stało, że nazwa akcji musi jechać w query stringu | Na istniejącej akcji Pluginu 1 `aai_sklep_zapisz_kurs` (zarejestrowanej TYLKO jako `admin_post_`): gość → **400**, `admin` → **403**, `klient-test` (subscriber) → **403**. Oraz: `?action=X` + ciało JSON → **400**, akcja tylko w ciele JSON → **HTTP 200 i cisza** |
| **K2** | **KOMPLETNA** — N16 obecny, powtórzony w wierszu CLI, zamykany w T1 | odczyt schematu |
| **K3** | **KOMPLETNA co do pokrycia, błędna co do jednego przypisania** — N15 zamykany w T3, choć jego dowód wymaga dziennika logowań (T2) | odczyt przepisu N15: „przemianowanie tabeli → **logowanie** → `sprawdz` kod 1" |
| **K4** | **KOMPLETNA co do nazwy, z nieprawdą po mechanicznej zamianie** — wiersz o prefiksie twierdził, że „`aai-monitor` jest już zajęty w Pluginie 1", a dwa zdania dalej, że ma zero trafień | pomiar w repo: `aai-panel` **49**, `aai-mono` **43**, `aai-monitor` **0** |

Co dołożone: fakty **F17**/**F18**, pułapki **P14**/**P15**, niezmiennik
**N18** z testem negatywnym, N15 przeniesiony do T2, wiersz prefiksu
poprawiony i podparty pomiarem.

**Sprawdzenie „po":** `aai-monitor`, `Aai_Monitor`, `straznik-monitora-wp`
i `smoke-wp-monitor` mają w repo dalej **zero** trafień poza dokumentami
Pluginu 3; oba diagramy renderują się bez błędu; N1–N18 rozłącznie
przypisane do T1–T3; ani jedno zdanie o Pluginach 1 i 2 nie tknięte.

**Osobno naprawiona kolizja scalania, której nie widać w treści:** gałąź
`docs/schemat-pluginu-3` stała **4 commity za `main`**, a jej `CLAUDE.md`
nie znał sweepów #95 i #96 (74 wiersze). Merge PR-a cofnąłby cudzą pracę.
`main` scalony do gałęzi PRZED poprawkami — po scaleniu gałąź różni się od
`main` **wyłącznie** dwoma dokumentami Pluginu 3.
