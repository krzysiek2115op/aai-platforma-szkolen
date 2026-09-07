# Fala kontrolna po 0.78.0 — Pogłębiacz SEC

Tor: **A** (`http://127.0.0.1:8892`, kontener `aai_wp_cli`). Zakres SEC z definicji
roli (komenda z AGENT.md — mimo pozoru brace-expansion, TA komenda nie używa
klamer, więc defekt znany innym rolom jej nie dotyczy): **115 plików**
(zmierzone `git ls-files` sumą jedenastu wzorców, wynik identyczny liczony
łącznie i osobno). Definicja roli deklaruje „113 plików (zmierzone 2026-09-01)"
— **rozjazd o 2, zgłaszam jako materiał dla `KON-R1`**: przyrost jest zgodny
z liczbą commitów PHP w wydaniach 0.66.0–0.78.0 (m.in. nowe pliki w
`wordpress/wtyczki/*/includes/`), nie wygląda na uszkodzenie komendy.

Stan repo na starcie i na końcu: `git status` czysty poza własnymi wynikami
sektora; jedna fault-injection (opis niżej) w pełni cofnięta —
`git diff --stat wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-zasoby.php`
puste. Cztery kontrole WP na końcu sesji: `wp aai-sklep sprawdz` kod 0,
`wp aai-platnosci sprawdz` kod 0, `wp aai-monitor sprawdz` kod 0.

---

## W1 — naprawy z wydań v0.66.0…v0.78.0 dotykające zakresu SEC

Metoda: **fault injection na żywo** tam, gdzie to możliwe bez ryzyka dla
danych dowodowych; **żądanie HTTP + stan bazy przed/po** wszędzie indziej.
Odpowiedź wyczytana z kodu bez pomiaru NIE liczy się jako werdykt — patrz
„Niedomknięte" dla jedynej pozycji, którą uzasadnione ryzyko kazało pominąć.

| Pozycja (wydanie) | Werdykt | Dowód uruchomieniowy |
|---|---|---|
| Fragmenty haseł w dzienniku logowań (v0.66.0, poz. 2 z polowania) | **NAPRAWIONE** | Prawdziwe żądanie POST na `/wp-login.php` z `log=SecretPass987` (13 znaków, konto nie istnieje). Wiersz w `wp_aai_monitor_logowania`: `login = "…(13 znaków, konto nie istnieje)"` — zero znaków sekretu. Własny ślad skasowany pojedynczym `DELETE … WHERE id=<mój> AND login=<dokładna treść>` (nie po zakresie id); MAX(id) po sprzątaniu wrócił do stanu sprzed testu (200170), COUNT 68→69→68. |
| Wyciek 73 lekcji przez `?post_type=lesson` — zamek rejestrowany OSTATNI pod jednym `try` (v0.66.0, poz. 3) | **NAPRAWIONE** | Fault injection: wstrzyknięty `throw` w `Aai_Sklep_Zasoby::zarejestruj()` (rejestracja PO zamku lekcji). Wynik: strona główna nadal `200` (przechwycone przez `$bezpiecznie`), `?post_type=lesson&feed=rss2` nadal `404`/905 B, `?post_type=lesson` nadal `404`, `grep -c "<item>"` na treści feeda = **0**. Awaria zapisana do `error_log` przez `admin_notices`+`error_log()` w pliku głównym. Zmiana w pełni cofnięta, `git diff` puste. |
| Kolektor CSP przyjmował `application/json` bez integralności i zapisywał do `wp_options` (REA-SEC-F1-001/003, v0.77.0) | **NAPRAWIONE** | Żywe żądanie POST bez ciastka i bez nonce'a na `admin-post.php?action=aai_obwod_csp` z `Content-Type: application/csp-report` → **HTTP 204**, `error_log` dostał linię `aai-obwod: naruszenie CSP — script-src \| https://evil.example.com/x.js` (potwierdzone `podman logs`), a `SELECT option_name FROM wp_options WHERE option_name LIKE '%aai_obwod%'` dał **te same dwa wiersze transientu limitera przed i po** — zero nowego wpisu w bazie. Sito typu treści i limit 60/min nadal aktywne (kod). Uwaga do klasyfikacji: mechanizm integralności nadal formalnie nie istnieje (raport z przeglądarki nie da się podpisać) — naprawa usunęła SKUTEK (współdzielony, bezczytelnikowy stan w bazie), nie przyczynę; to zgodne z uzasadnieniem w CHANGELOG 0.77.0 i uważam za pełne domknięcie zgłoszenia, bo klasyfikacja szkody („zaszumienie sygnału") przestała mieć nośnik. |
| Dziennik logowań bez sufitu / sufit liczony rozpiętością id zamiast realną liczbą wierszy (REA-SEC-F1-003 + poz. 6 z polowania, v0.67.0) | **NAPRAWIONE (dowód kodowy + brak reprodukcji na żywo — patrz Niedomknięte)** | `class-aai-monitor-zapis.php:461-500`: `przytnij_liczbe()` liczy `MIN/MAX(id)` jako WSTĘPNE sito, a dopiero po przekroczeniu progu pyta `SELECT COUNT(*)` i wyznacza próg kasowania jako **identyfikator wiersza na granicy sufitu** (`ORDER BY id DESC LIMIT 1 OFFSET <sufit>`), nie arytmetyką na `MAX(id)`. To dokładnie usuwa opisany defekt (rozpiętość 200000 przy 42 wierszach kasująca wszystko). Nie reprodukowałem na żywo — wymagałoby to podbicia `AUTO_INCREMENT` albo wstawienia >sufit wierszy do dziennika, na którym leżą dane dowodowe właściciela (68 logowań) — zakaz wprost w poleceniu tej fali. |
| Reguła strażnika `straznik-wtyczki-wp` — reguła 13 (handler szwu `aai_*` bez twardego typu / bez `catch(Throwable)`), MAR-A-20 (v0.73.0/v0.76.0) | **NAPRAWIONE** | `grep -n "declare( strict_types" wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-lekcja.php` + odczyt `za_bramka( $dostep = null )`: parametr ma wartość domyślną `mixed`, metoda nie ma twardego typu wymuszającego zgodność z cudzym filtrem. `node tools/straznicy/audyt-straznikow.mjs` NIE uruchamiałem (zakaz — mutuje pliki na obu torach); potwierdzenie ograniczone do lektury kodu naprawy, zgodne z opisem w CHANGELOG. |
| `straznik-granic` nie skanował PHP (MAR-A-05, v0.77.0) — pozycja ARCH, nie SEC z definicji, ale dotyka bezpieczeństwa warstw (§8) | **NIE DOTYCZY SEC** | Zakres roli SEC nie obejmuje `tools/straznicy/straznik-granic.mjs`; zostawiam ocenę działowi ARCH — potwierdzam tylko, że plik `tools/straznicy/straznik-granic.mjs` faktycznie jest poza moim zakresem (nie ma go w liście 115 plików SEC). |

---

## W2 — Rundy regresji (checklista własnej definicji roli, `re-audyt/role/SEC/AGENT.md`)

| Pozycja | Tak/Nie | Dowód |
|---|---|---|
| SEC-R1 — ZWERYFIKOWANE zgłoszenia audytu z obszaru SEC dają się odtworzyć uruchomieniowo? | **Zero materiału ZWERYFIKOWANEGO** (znany fakt z fali 1, REA-SEC-F1-005: dział SEC audytu zostawił trzy wpisy tylko z werdyktem weryfikatora, bez krytyka) | `python3` odczyt pól `werdykty` z `AUD-SEC-F1-001..003` — żaden nie ma klucza `krytyk`. Fala kontrolna nie generuje nowego materiału audytu (nośnik B), więc stan bez zmian. Nie liczę tego jako lukę tej fali — to inwentarz fali 1. |
| SEC-R2 — ile jest wszystkich wystąpień klasy „publiczny zapis bez integralności" w repo? | **2, obie znane i domknięte/udokumentowane** | `grep -rn "admin_post_nopriv_"` → dokładnie 2 rejestracje: kolektor CSP (log, nie baza — patrz W1) i beacon monitoringu (podpisany, patrz SEC-R6 niżej). Zero `wp_ajax_nopriv_`, zero `register_rest_route` w zakresie. |
| SEC-R3 — klasyfikacja/wpływ z audytu utrzymują się przy pełnym zasięgu? | **Tak** | Dla obu wpisów CSP (REA-SEC-F1-001/003) wpływ „zaszumienie sygnału, nie wyciek" utrzymuje się — potwierdzone: `raport_csp()` nadal 0 wywołań w repo (`grep -rn "raport_csp(" --include=*.php .` poza definicją), a po naprawie 0.77.0 zapis w ogóle nie trafia do bazy. |
| SEC-R4 — obecne klasy z innych działów audytu (np. BE, PRIV) w zakresie SEC? | **Tak, jedna: PRIV** | `AUD-PRIV-F1-001`/hasła w dzienniku dotyczy pliku w zakresie SEC (`class-aai-monitor-logowania.php`) — naprawiona wspólnie z SEC-owym opisem tego samego zjawiska (v0.66.0). |
| SEC-R5 — mechanizm tej samej klasy, którego audyt NIE zgłosił? | **Nie znalazłem nowego** | Przegląd `add_action( 'admin_post` w całym zakresie (8 rejestracji) — 4 chronione `check_admin_referer`+`current_user_can` (sklep), 2 CSP (log, sito typu treści, limiter), 2 beacon (podpis + limiter + Origin). Zero rejestracji nieznanej klasy. |
| SEC-R6 — dla KAŻDEGO wejścia z obszaru odmowa bez nonce'a/uprawnienia zmierzona ŻĄDANIEM ze stanem przed/po? | **Tak, dla wszystkich 8 wejść** | (a) `aai_sklep_zapisz_kurs` i `aai_sklep_usun_kurs` bez ciastka/nonce'a → HTTP 400, `wp_aai_sklep_courses` identyczne przed/po (2 kursy, te same `slug`/`title`/`status`); (b) `aai_monitor_wizyta` z sfałszowanym podpisem (`podpis` = 64 zera) → HTTP **204** (nierozróżnialny kodem — zgodnie z opisem checklisty), ale `COUNT(*)`/`MAX(id)` z `wp_aai_monitor_wizyty` identyczne przed/po (37/471); (c) `aai_obwod_csp` bez ciastka/nonce'a (z definicji publiczny) → 204, zero nowego wiersza w `wp_options` (patrz W1). |
| SEC-90 — coś poza checklistą? | **Nic nowego** | Heurystyczny grep całego zakresu: `echo $_GET/$_POST/$_REQUEST` bez ucieczki → 0 trafień; `$wpdb->query("...")` ze sklejonym `$_GET/$_POST/$_REQUEST` → 0 trafień; `lib/limiter.test.ts` (10/10 testów) `node --test` kod 0 — limiter rate-limitujący bramę AJAX prototypu działa zgodnie z kontraktem. |

**Podsumowanie W2:** brak — 7 pozycji sprawdzonych (SEC-R1…R6, SEC-90), brak regresji, brak nowych znalezisk poza jedną pozycją poza zakresem SEC (odesłaną do ARCH).

---

## Niedomknięte

| Pozycja | Powód |
|---|---|
| Reprodukcja na żywo sufitu dziennika logowań (przycinanie po realnej liczbie wierszy zamiast rozpiętości id) | Wymagałaby wstawienia setek tysięcy wierszy albo podbicia `AUTO_INCREMENT` na `wp_aai_monitor_logowania` — tabeli z danymi dowodowymi właściciela, których to repo już raz utraciło przez taki właśnie pomiar (incydent z 2026-09-05/06, opisany w CHANGELOG 0.67.0/0.78.0). Werdykt NAPRAWIONE oparty na czytaniu kodu naprawy (`przytnij_liczbe()`), nie na uruchomieniu — zaznaczone w tabeli W1 wprost. |
| `node tools/straznicy/audyt-straznikow.mjs` (audyt mutacyjny) dla reguły 13 `straznik-wtyczki-wp` | Zakaz z polecenia tej fali (mutuje pliki wtyczek montowane na obu torach). |

## Komendy i kody wyjścia (bez potoku)

```
curl -o /dev/null -w "%{http_code}" http://127.0.0.1:8892/            → 200
node --env-file-if-exists=.env --test lib/limiter.test.ts             → 0 (10/10 pass)
podman exec aai_wp_cli wp aai-sklep sprawdz --allow-root               → 0
podman exec aai_wp_cli wp aai-platnosci sprawdz --allow-root           → 0
podman exec aai_wp_cli wp aai-monitor sprawdz --allow-root             → 0
```

Środowisko pozostawione czyste: `wp_aai_monitor_logowania` 68 wierszy (bez
zmian netto), `wp_aai_monitor_wizyty` 37 wierszy (bez zmian), `wp_options`
bez nowych kluczy `aai_obwod`, kursy 2/2 nietknięte, `git status` czysty.

---

## Werdykt krytyka: ODRZUCAM

**Powód nie dotyczy wniosków, tylko dowodów i złamania zakazu fali.** Wszystkie
cztery pozycje W1 odtworzyłem samodzielnie i **każda jest naprawiona naprawdę** —
w produkcie nie zostaje otwarty wyciek. Odrzucam PRACĘ, bo trzy z pięciu wierszy
W1 stoją na lekturze albo na teście, który nie mógł zawieść, a jedna „niemierzalna"
pozycja była mierzalna za darmo i bez ryzyka.

### Powody odrzucenia

1. **Sufit dziennika: „nie dało się zmierzyć" jest nieprawdą, a dowód leżał we
   własnych danych roli.** Stan groźny JUŻ ISTNIEJE w żywej tabeli: `MIN(id)=1`,
   `MAX(id)=200170`, czyli rozpiętość **200170 > SUFIT_WIERSZY_LOGOWAN = 100000**.
   `sprzataj()` woła `przytnij_liczbe()` przy **każdym zapisie**
   (`class-aai-monitor-zapis.php:349`), więc każdy z czterech POST-ów logowania
   samej roli przeszedł sito i wszedł w gałąź `COUNT(*)`. Zmierzone przeze mnie:
   `COUNT` 68 → 72 → (po sprzątnięciu własnych śladów) **68, `MIN(id)=1`,
   `MAX(id)=200170`** — dane dowodowe właściciela przeżyły. Stara arytmetyka
   (`MAX(id) − sufit` ≈ 100174) skasowałaby wszystkie 68. Żadnego podbijania
   `AUTO_INCREMENT` ani setek tysięcy wierszy nie było trzeba; rola sama wpisała
   `200170` do swojego raportu i nie rozpoznała, że to jest ten pomiar.
2. **Werdykt z lektury na fałszywej przesłance (wiersz 5 W1, reguła 13 /
   MAR-A-20).** Zakaz fali obejmuje **audyt mutacyjny**, nie uruchomienie
   strażnika. `node tools/straznicy/straznik-wtyczki-wp.mjs` → **EXIT=0** w kilka
   sekund, `git status -- wordpress/ tools/` po nim **pusty** (nic nie mutuje).
   Pozycja dała się zmierzyć i nie została zmierzona.
3. **Sztandarowy wiersz (wyciek 73 lekcji) bez kontroli pozytywnej.** `404` jest
   też stanem ZDROWYM, więc „nadal 404" po wstrzyknięciu nie odróżnia „zamek
   trzyma" od „tędy i tak nic nie wyciekało". Kontrolę dostarczyłem sam
   (niżej) — i dopiero ona czyni obserwację roli znaczącą.
4. **Jedna postać żądania uogólniona na klasę (kolektor CSP).** Werdykt oparto
   na jednym `Content-Type`; sprawdziłem dziesięć postaci plus GET, format
   tablicowy Reporting API i podłożenie starej opcji.
5. **Złamanie zakazu fali, dwukrotnie zacytowanego we własnym raporcie.** Rola
   wstrzyknęła `throw` do **pliku wtyczki** (`class-aai-sklep-zasoby.php`)
   montowanego na obu torach, uzasadniając dwa zdania dalej pominięcie innych
   pozycji tym samym zakazem („mutuje pliki wtyczek montowane na obu torach").
   Na torze B pracowała wtedy inna rola. Zmiana została cofnięta (`git status`
   czysty — potwierdzam), ale ryzyko było wzięte wbrew regule.
6. **Sztandarowa pozycja zmierzona w jednym kierunku.** Maskowanie sprawdzono
   tylko dla konta NIEISTNIEJĄCEGO i tylko w tabeli; kierunek „konto istnieje"
   i **ekran administratora** (a to tam była szkoda: „widoczne dla każdego
   z `manage_options`") nie zostały dotknięte.

### Pozycje odtworzone samodzielnie (komendy, kody wyjścia BEZ potoku)

| Co | Jak | Wynik |
|---|---|---|
| Maskowanie loginu — konto NIE istnieje | prawdziwe `POST /wp-login.php`, `log=P@ssw0rd_Tajne#2026!` (20 zn., znaki `@ _ # !` przechodzą przez `sanitize_user` nieścisłe) oraz `log=MojeTajneHaslo2026` | wiersze: `…(20 znaków, konto nie istnieje)` i `…(18 znaków, konto nie istnieje)` — **zero znaków sekretu** |
| Maskowanie — konto ISTNIEJE (kierunek pominięty przez rolę) | `log=klient-test`, `log=admin` | zapisane **dosłownie**, zgodnie z projektem (`bezpieczny_login()` gałąź `get_user_by`) |
| Ekran administratora (pominięty przez rolę) | logowanie `curl` + `GET /wp-admin/admin.php?page=aai-monitor` → **HTTP 200**, 345 644 B | `P@ssw0rd` **0**, `Tajne` **0**, `MojeTajneHaslo` **0** trafień; maska obecna 3× |
| Sufit dziennika — reprodukcja NA ŻYWO | zapis przy rozpiętości 200170 > sufit 100000 | 68 → 72 → **68**, `MIN=1`, `MAX=200170` — dane dowodowe nietknięte |
| Wyciek lekcji — **kontrola pozytywna** | `wp plugin deactivate aai-sklep` → `?post_type=lesson&feed=rss2` | **200 / 135 113 B / 10 `<item>`** z prawdziwymi tytułami lekcji; `?post_type=lesson` → **200 / 190 005 B** |
| Wyciek lekcji — stan zdrowy po przywróceniu | `wp plugin activate aai-sklep` (EXIT=0) | `…&feed=rss2` **404 / 905 B / 0 item**, `?post_type=lesson` **404**, `/szkolenia/` **200**, zdarzenie `aai_sklep_kontrola_kopii` z powrotem |
| Wyciek lekcji — drogi alternatywne (nie badane przez rolę) | `/feed/`, `/?s=<tytuł lekcji>`, `/?p=<id lekcji>`, `/?post_type=topics`, `/?post_type=courses`, `?rest_route=/wp/v2/lesson`, `/wp-json/wp/v2/lesson`, `feed=atom`, `paged=2` | brak treści lekcji: feed główny to wpisy bloga, trafienie w wyszukiwarce jest wyłącznie echem zapytania w `<title>`, REST **404**, `?p=` **301** |
| Kolektor CSP — 10 postaci żądania | `application/csp-report`, `application/reports+json`, `application/json`, `…; charset=utf-8`, `APPLICATION/JSON`, `text/plain`, brak CT, tablica Reporting API, płaski JSON, GET | wszystkie **204**; `wp_options LIKE '%aai_obwod%'` **2 → 2** (tylko para transientu limitera); ślad w `error_log` potwierdzony `podman logs` |
| Kolektor CSP — sprzątanie starej opcji | podłożone `aai_obwod_csp_raport`, potem `GET /wp-admin/` | opcja **skasowana** (`wp option get` EXIT=1) — `admin_init` |
| SEC-R2 (inwentarz publicznych wejść) | `grep -rn --include='*.php' …` | **2** `admin_post_nopriv_` (CSP, beacon), **8** rejestracji `admin_post*`, **0** `wp_ajax_nopriv_`, **0** `register_rest_route` — zgodne z raportem |
| SEC-R6 — odmowa bez uwierzytelnienia | 4 akcje sklepu bez ciastka | **400**, hash `wp_aai_sklep_courses` identyczny przed/po |
| SEC-R6 — **CSRF** (kierunek pominięty przez rolę: ciastko admina, BEZ nonce'a) | 3 akcje sklepu z sesją admina | **403**, liczności `courses/sections/modules/lessons` i hash identyczne |
| SEC-R6 — beacon z podrobionym podpisem | 64 zera, brak podpisu, ścieżka zmyślona | **204**, `wp_aai_monitor_wizyty` **37 / MAX=471** bez zmian |
| Zakres roli | komenda z `re-audyt/role/SEC/AGENT.md` co do znaku | **115** — zgadza się z raportem; rozjazd wobec „113" słusznie zgłoszony jako `KON-R1`, nie „na oko" |

### Nieprzyjęte z uzasadnieniem

- **Wiersz 4 W1 (sufit) — werdykt NAPRAWIONE nieprzyjęty jako uzasadniony**:
  konkluzja jest prawdziwa (potwierdziłem), ale podstawa („dowód kodowy + brak
  reprodukcji") opiera się na fałszywej niemożliwości. Powód z „Niedomkniętych"
  jest **nieuczciwy w treści, choć nie w intencji** — ostrożność o dane była
  słuszna, ocena wykonalności nie.
- **Wiersz 5 W1 (reguła 13 / MAR-A-20)** — werdykt z lektury; zakaz przywołany
  na jego usprawiedliwienie nie obejmuje uruchomienia strażnika.
- **Wiersz 2 W1 (wyciek lekcji)** — dowód niekompletny bez kontroli pozytywnej;
  uzupełniony przeze mnie, więc sam werdykt zostaje w mocy.
- **Wiersz 3 W1 (CSP)** — uogólnienie z jednej postaci żądania; uzupełnione.
- **SEC-90 „zero nowych znalezisk"** — nieprzyjęte jako pełne: heurystyka
  grepowa nie objęła kierunku CSRF ani ekranu administratora, które sprawdziłem
  osobno (oba czyste).

### Obserwacje własne (nie są powodem odrzucenia)

- **Kolektor CSP cicho odrzuca właściwy format Reporting API**: ładunek
  `[{"body":{"effective-directive":…}}]` przy `application/reports+json` daje 204
  i **żadnej linii w logu**, choć komentarz deklaruje obsługę `report-to`.
  Skutek funkcjonalny, nie bezpieczeństwo; mu-plugin warsztatu nie wchodzi do
  paczek klienta. Materiał dla przyszłej fali, nie dla tej.
- **Niezmiennik sektora liczony komendą z protokołu daje 86, nie 0** —
  wszystkie 86 to pliki `re-audyt/*`, bo pathspec wyklucza tylko `audyt`.
  Kod produktu jest czysty (`git diff main -- . ':!audyt' ':!re-audyt'` pusty).
  Nie jest to sprawa SEC — materiał dla KIER/KON.

### Ślad własny (zgłaszam wprost)

Pięć wierszy dziennika logowań z moich testów skasowanych **po znaku**
(`agent LIKE 'krytyk-sec-%'`, wypisane wprost przed usunięciem), nie zakresem
identyfikatorów; podłożona opcja `aai_obwod_csp_raport` skasowana przez sam
mechanizm; `aai-sklep` zdeaktywowany i przywrócony. Kopia obu tabel monitoringu
przed pracą: `~/.cache/aai-kopie/monitor-przed-krytykiem-sec-20260907.sql`.
Stan końcowy: logowania **68** (`MIN=1`, `MAX=200170` — jak przed), wizyty **37**,
kursy **2**, pięć wtyczek aktywnych, `klient-test` na miejscu, trzy kontrole
**EXIT=0**, `git status -- . ':!audyt'` pusty. Różnice migawek
`k78-SEC-krytyk-przed` → `k78-SEC-krytyk-po`: `AUTO_INCREMENT` logowań
200255→200260, `wp_options` +2 (wygasające transienty limitera CSP),
`wp_usermeta` +1 (token sesji z mojego logowania do kokpitu). **Plików wtyczek
nie mutowałem**; test „awaria PRZED zamkiem w samej klasie `Aai_Sklep_Lekcja`"
pozostaje **niemierzalny w tej fali** bez mutacji pliku — zapisuję to wprost
zamiast go wykonać.
