# Fala kontrolna 0.65.0 — dziennik przebiegu (orkiestracja, nośnik B)

Sesja 2026-09-05, gałąź `re-audyt/sektor-re-audytu` od `2f1aeb6`. Decyzje D12–D16
w `audyt/PLAN-BUDOWY.md`. Kody wyjścia mierzone BEZ potoku.

## Kolejność po `/clear` — wykonanie

| # | Krok | Wynik |
|---|---|---|
| 1 | niezmiennik `git diff main --name-only -- . ':!audyt' ':!re-audyt' \| wc -l` | **0** |
| 1 | wejście policzone komendą z planu | **33** (ARCH 5 · PERF 7 · PRIV 5 · FE 3 · INT 3 · WDR 3 · BD 2 · BE 2 · REPO 1 · SEC 1 · USP 1) |
| 1 | `.claude/agents/` | 80 definicji, generat obecny |
| 2 | R17 (D15) | strażnik sektora **kod 1 → 0**; szczegóły niżej |
| 3 | tor B | pierwszy `postaw.sh` **kod 1** (patrz „Znalezisko orkiestracji”), po przypięciu wersji — niżej |
| 4 | `--zrzut=k-baza` (tor A) | kod 0, 81 tabel, media 1345, wtyczki 5, skrót `f8fd841d…` |

## R17 wykonane (D15)

Sedno: `zdejmijProbe()` w `status.mjs` zostawiało wpisy próby w `historia` BEZ
znacznika — tylko adnotacja podawała chwilę. Reguła 17 brała pierwszy wpis
z historii za wejście Pogłębiacza SEC (2026-09-01, próba E7.6) i porównywała
z końcem działu SEC audytu (2026-09-03) → fałszywy alarm.

Zmiany (wszystkie w sektorze, kod produktu nietknięty):
- `audyt/tools/straznik-sektora-audytu.mjs`: `chwilaWejscia()` pomija wpisy
  historii z polem `proba`; uwaga na wyjściu wymienia takie wpisy po nazwie;
- `audyt/tools/status.mjs`: `zdejmijProbe()` znakuje wpisy sprzed wejścia polem
  `proba` (samokontrola `--test`: nowa asercja, 76 ✓, kod 0);
- dane: `audyt/stan/re-audyt-f1-SEC.json` i `-WALID.json` — po jednym wpisie
  sprzed chwili z adnotacji oznaczonym `proba: "E7.6"`;
- `audyt/tools/audyt-straznika-sektora.mjs`: mutacja „wpis próbny BEZ pola
  `proba` MUSI zapalać regułę” + kontrprzykład „ten sam wpis oznaczony nie jest
  wejściem”.

Test negatywny na PRAWDZIWYM pliku SEC: zdjęcie pola z wpisu → strażnik kod 1
(dokładnie 1 komunikat R17), przywrócenie → kod 0.

## Znalezisko orkiestracji (dla WDR, nie naprawiane — sektor nie naprawia)

`postaw.sh` na ŚWIEŻEJ instancji (tor B) pada na kroku „Instaluję woocommerce”:
`wp plugin install woocommerce` bierze z wp.org NAJNOWSZE Woo, które wymaga WP ≥ 7.0,
a obraz w `compose.yml` jest przypięty do `wordpress:6.9.4-php8.4-apache`
(komunikat: „This plugin does not work with your version of WordPress. Minimum
WordPress requirement is 7.0”). Tor A działa, bo Woo 11.0.1 i Tutor 4.0.7 były
zainstalowane wcześniej — `postaw.sh` jest idempotentny TYLKO na bazie, która je
już ma. Ta sama klasa co AUD-WDR-F1-002 (skrypt sprawdzany na bazie z historią).
Obejście na torze B (operacja środowiskowa, zero zmian w repo):
`wp plugin install woocommerce --version=11.0.1` i `tutor --version=4.0.7`
w `aai_wp_b_cli`, potem ponowny `postaw.sh`.

Pamięć: przed torem B dostępne 2 GB (plan wymagał ≥ 2), po pierwszym postawieniu 2 GB.

## Tor B — postawiony i wypełniony (09:31–09:34)

Po przypięciu wersji: `postaw.sh` **kod 0**, pamięć po: dostępne 2 GB (≥ 1 GB — tor B
zostaje). `postaw.sh` NIE wgrywa danych — tor B był pusty (0 kursów, 11 mediów).
Łańcuch z `STACK_NAZWA=aai_wp_b WP_PORT=8894 MAILPIT_PORT=8895 WP_ADRES=http://127.0.0.1:8894`:
`wp:import` (111 utworzonych) → `wp:sync` (87 w Tutorze) → `wp:zrzuty` → `wp:klient` →
`aai-platnosci sprzedaz otworz` — wszystkie **kod 0**; kontrole `aai-platnosci sprawdz`
i `aai-sklep sprawdz-tutora` kod 0, `wp:sprawdz` (W2) kod 0. Zrzut `--zrzut=k-baza-b`
kod 0: 75 tabel (świeża instalacja ma mniej tabel Woo niż tor A z historią — 81),
media 1347, skrót `8601172d…`. Tor B różni się od A danymi: 0 zamówień, monitoring pusty.

**Pułapki orkiestracji dwóch torów (zmierzone):**
- `srodowisko.mjs` bierze kontener ze `STACK_NAZWA`, nie z `WP_PORT` — samo
  `WP_PORT=8894 --liczniki` policzyło TOR A (identyczne liczby: 26/30/1829). Każda rola
  toru B dostaje w poleceniu komplet czterech zmiennych;
- WP-CLI w kontenerze wymaga `--path=/var/www/html` — bez tego „not a registered
  wp command” wygląda jak martwy bind mount, a jest błędem wywołania;
- **samokontrola `srodowisko.mjs --test` (R31 strażnika sektora) jest ślepa na tory**:
  asercja „nikt inny nie pracuje na środowisku” szuka dowolnego `podman exec`, więc
  `wp:klient` na `aai_wp_b_cli` zapalił ją dla toru A. Przy D14 reguła daje fałszywy
  alarm zawsze, gdy drugi tor cokolwiek robi;
- audyt mutacyjny strażnika sektora (`audyt-straznika-sektora.mjs`) zatrzymał się
  trzy razy PRZED mutacjami na trzech różnych regułach (R31, R15+R31, R25), za każdym
  razem gdy równolegle biegł podman albo agent roli; każda z tych samokontroli
  uruchomiona osobno przechodzi (kod 0). Samokontrole tworzą pliki tymczasowe
  o stałych nazwach i nie są bezpieczne przy pracy równoległej — **audyt mutacyjny
  R17 do powtórzenia w oknie ciszy** (żadna rola, żaden podman). Zapisane jako
  usterka narzędzia sektora, nie produktu.

## Przebieg ról

| Rola | Tor | Start | Wynik roli | Krytyk |
|---|---|---|---|---|
| PROTO | A + `:3001` | 13:25 | 13:33 — wejście 0; 7 zgłoszeń PROTO fali 1 poza `wordpress/`, diff napraw w zakresie PROTO = 1 linia `package.json`; 10 porównań `:3001` vs `:8892` (cena, waluta, JSON-LD, FAQ, katalog, „brak klucza”) bez regresji; jedyny rozjazd `PreOrder` vs `InStock` sprzed 0.65.0 | krytyk **PRZERWANY 13:36** limitem sesji API (429) przed dopisaniem werdyktu — **powtórzyć** (wymaga `npm run dev` `:3001`) |
| WDR | B (postaw od zera) | 13:25 | **PRZERWANE 13:36** limitem sesji API (429) po `postaw.sh --skasuj` + `postaw.sh` + `wp:import` (kod 0); `wp:sync`/`wp:zrzuty`/`wp:klient` NIE wykonane, plik `WDR.md` NIE powstał — **rolę powtórzyć od początku** | — |
| QA | A+B (samo) | 12:00 | 12:35 — wejście 0; 7 ręcznych mutacji nowych reguł 0.65.0 (`straznik-monitora-wp` 15b/15c, `straznik-platnosci-wp` 16/43/44/45, `straznik-tutora`) → każda czerwona z właściwym komunikatem, przywrócenie `diff` IDENTICAL; `smoke:wp-platnosci` 23, `zakup` 58, `zwroty` 2×39, `monitor` 181; audyt mutacyjny 351 (349 złapanych, 0 przeoczonych, 0 martwych) kod 0; `npm run check` kod 0; regresje 0/10; wyrównał hasło `klient-test` toru A do `.env` (6 fałszywych czerwonych `smoke-wp-monitor` z rozjazdu haseł); repo `wordpress tools package.json` czyste | 13:23 **ODRZUCAM**: (1) rola nie zmutowała ŻADNEJ asercji smoke'a — krytyk zdjął zamek 1 w `zamowienie_znika()` i `smoke-wp-zakup` dał 58/58 (dwie asercje „zamek 1 nie trzyma” ŚLEPE; produkt chroni statycznie reguła 43); (2) nowych gałęzi decyzyjnych w trzech strażnikach jest 17, nie 10 — 6 bez dedykowanej mutacji w audycie, krytyk zmutował każdą: wszystkie żyją; liczby roli (349/351, 2 pominięte = `straznik-podgladu-kursow`, `check` kod 0) potwierdzone; repo i oba tory przywrócone kod 0 |
| USP | B | 11:31 | 11:44 — AUD-USP-F1-001 NAPRAWIONE (`tools/zapytania-wp.mjs`, `SAVEQUERIES` tylko w tymczasowej wtyczce narzędzia); powtarzalność 3×3 na 4 trasach: mediany 75/77/72/75, 0 odchylenia (jedna odstająca 81 przy pierwszym koszyku); liczy WSZYSTKIE zapytania — nazwane w nagłówku; `--liczniki` dwa odczyty identyczne co do skrótu; regresje 0/6; niedomknięte `/kasa/` | 11:58 **PRZEPUSZCZAM** — liczby roli co do sztuki (75/77/72/75, odstająca 81), kod 1 przy suficie; obalone: narzędzie ZOSTAWIA ślad `recently_activated` w `wp_options` (rola mierzyła bazę już po pierwszym uruchomieniu narzędzia), wyjaśnienie „81 = cache obiektowy” niemożliwe (brak object cache); nie sprawdzone przez rolę: przerwanie sygnałem zostawia `active_plugins` z dziurą, `fetch` bez ciasteczek — liczby zalogowanego (114) nieodtwarzalne tym narzędziem, `/kasa/` = 302/49; 0 odchylenia nie jest artefaktem cache (sprawdzone po `apache2ctl graceful`) |
| SEC | B | 11:00 | 11:14 — REA-SEC-F1-003 **NIENAPRAWIONE**: replay oryginalnego PoC (POST `application/json` bez ciastka/nonce'a) → 204 i nowy klucz w `aai_obwod_csp_raport`; naprawa `5d4b875` sito typu treści blokuje tylko `text/plain`/brak nagłówka; zasięg klasy bez zmian: 2 rejestracje `admin_post_nopriv_` (kolektor + beacon), beacon ma 4 warstwy, kolektor 1; regresje 0/8 wejść (kreator nonce+`manage_options`, beacon po migracji soli, blokada koszyka, podwójny zakup, `sieroty --usun` tylko CLI, hak dostarczania) | 11:28 **PRZEPUSZCZAM werdykt wpisu / ODRZUCAM rundy**: NIENAPRAWIONE potwierdzone co do znaku (`application/json`, `application/csp-report` zapisują; `text/plain` nie); brzmienie: naprawa CZĘŚCIOWA, zakres świadomie węższy i technicznie wymuszony (nonce/Origin niemożliwe w raportach CSP), ale `NAPRAWY-PO-AUDYCIE.md` liczy ją w „32 z 33” — pozostałość nienazwana; zmierzone sufity: 60/min/IP, klucz 7746 znaków nieprzycinany, po 200 rodzajach prawdziwe naruszenia CSP przepadają po cichu; sito weszło w `ce09189`, nie `5d4b875`; 2 z 8 „rund na żywo” to lektura/grep; **zasięg klasy wzorcem, nie klasą**: 28 anonimowych `POST /wp-login.php` → 28 wierszy dziennika logowań w 1,4 s bez limitera i sufitu (zapis = decyzja D6, brak sufitu nieodkryty); pominięte wejście zmienione w 0.65.0: `class-aai-monitor-logowania.php` |
| PERF | B | 10:29 | 10:41 — 7/7 NAPRAWIONE pomiarem (zapytania-wp.mjs + general_log + curl): katalog 75, kurs 77 zapytań stabilne 3×, `produkt_kursu()` 5 → 1, `osierocone()` 0 per-wiersz, no-cache na lekcji, `Cache-Control` na statykach; regresje 0/6; niedomknięte: REA-PERF-F1-001 z fali 1 (liczba ~13 miejsc N+1) nierozstrzygnięte w aparacie | 10:58 **ODRZUCAM** raport, 7/7 werdyktów POTWIERDZONE własnym pomiarem: dowód roli pod AUD-PERF-F1-001 mierzył pustkę (`aai-platnosci sprawdz` nie woła `dane_kursu()`; właściwa komenda `sprawdz-tutora`: 2 zapytania o lekcje na 12 modułów, 0 per moduł); lekcja dowodowa była `preview=1` (krytyk domierzył płatną: no-store u gościa i klienta); „`/kasa/` 49” to 302; katalog 75 / kurs 77 / lekcja-gość 72 / lekcja-klient 94 / koszyk 75 / Moje kursy 114 — WSZYSTKIE zapytania żądania, nie tylko nasze; poza wpisem: 148 zrzutów z `uploads/` bez `Cache-Control` |
| FE | A | 11:15 | 11:31 — 3/3 NAPRAWIONE (podpisy okresów kafelków „ostatnie 90/400 dni” na żywo w kokpicie; PLN na całej ścieżce kurs → koszyk → kasa w przeglądarce; panel kreatora „299 zł”, test negatywny kontroli USD → kod 1); regresje 0/5, `smoke:wp-front` 86/86, `smoke:wp-motyw` 91/91 (rig `/tmp/rig-fe`) | 11:50 **PRZEPUSZCZAM** 3/3 — odtworzone szerzej (podpisy kafelków przeciw DANYM: nieudane 7 dni = 6; JSON-LD `priceCurrency` PLN, Store API, `/my-account/orders/` bez USD; zasięg REA-FE-F1-002 kompletny: dokładnie 2 twarde „zł” w `aai-sklep`); obserwacje: waluta Tutora zostaje `USD` (na ścieżkę klienta nie wychodzi), `class-aai-sklep-seo.php:285` ma `PLN` na twardo — rozjazd pilnowany kodem wyjścia, nie usunięty z renderu; hasło `klient-test` w `.env` NIEAKTUALNE dla toru A (nadpisane przez `wp:klient` toru B) |
| PRIV | A | 10:54 | 11:04 — 4 NAPRAWIONE (AUD-PRIV-F1-001 maska hasło-kształtnej wartości, -002 zdanie w kasie z linkiem albo bez zdania w obu stanach opcji, -003 deklaracja o User-Agent skorygowana, REA-PRIV-F1-002), REA-PRIV-F1-001 **NIENAPRAWIONE decyzją właściciela** (treść prawna, „przed pierwszym klientem”; sprzeczność żywa: `/polityka-cookies/` ładuje `pomiar.js` z `sessionStorage`); regresje 0/7; ślady sprzątnięte po ID | 11:13 **ODRZUCAM**: AUD-PRIV-F1-001 **NIENAPRAWIONE** — dosłowna wartość z pierwotnego zgłoszenia `PRIVAUDYT_TajneHaslo123` zapisuje się dziś jako `PRI…(23 znaków)`; `sanitize_user($x, true) === $x` uznaje KAŻDE hasło bez znaku specjalnego za kształt loginu (`Haslo123` → `Has…`), drugi punkt wejścia `/my-account/` (formularz Woo) tak samo; polityka (`prywatnosc.php:91`) twierdzi „nie zapisujemy haseł ani ich fragmentów” — nieprawda; pozostałe 4 werdykty PRZEPUSZCZAM zapisem (trzy stany opcji polityki, pełny UA zgodny z deklaracją, decyzja właściciela w NAPRAWY:114, zasięg 4 stron bez zmian) |
| BD | A | 10:24 | 10:36 — 2/2 NAPRAWIONE (AUD-BD-F1-001: przerwana synchronizacja → `sync` doprowiązuje sierotę zamiast tworzyć drugi produkt; REA-BD-F1-001: skasowana lekcja kopii Tutora odtworzona jednym `sync`, pilnuje `straznik-tutora`); droga danych 73/73 sha256, Tutor 0 różnic, 3× `wp:import` idempotentne; regresje 0/7; obserwacja poza wejściem: `Aai_Platnosci_Zapis::zdejmij_kurs()` nietestowane | 10:52 **ODRZUCAM**: AUD-BD-F1-001 tylko CZĘŚCIOWO — rola odtworzyła stan „produkt ze znacznikiem bez powiązania”, a przerwanie hakiem `save_post_product` zostawia produkt `draft` z ZEREM met (znacznik pisze `save_meta_data()` 53 linie po `wp_insert_post`); na tym stanie `sync` → `utworzone 1` (drugi produkt `publish`, stary osierocony), `sprawdz` kod 0 — wpływ czynny w węższym oknie, niewykrywalny (kontrola pyta o inną metę); scenariusz roli potwierdzony; REA-BD-F1-001 PRZEPUSZCZAM jako POTWIERDZONE + PILNOWANE (commit `de8d1ee` dodał tylko regułę strażnika); 73/73 sha256 policzone samodzielnie |
| REPO | — (bez toru) | 10:26 | 10:33 — AUD-REPO-F1-009 NAPRAWIONE; **1 regresja** (REPO-R6): sekcja „Gdzie co leży” README podaje 135/18/140 plików, `git ls-files` daje 136/19/141 — pięć commitów sesji napraw po `ce09189` dołożyło pliki bez aktualizacji liczników, `straznik-readme` tej sekcji nie czyta; obserwacja: komenda `sieroty` bez wiersza w `wordpress/README.md` | 10:44 **ODRZUCAM** pracę roli (werdykt NAPRAWIONE i regresja liczników POTWIERDZONE komendą): fałszywy cytat `git log`; przeoczone `README.md:52` „33 potwierdzone usterki NAPRAWIONE” wobec „32 z 33” w CHANGELOG i NAPRAWY-PO-AUDYCIE; `aai-sklep` zmieniony w 0.65.0 (9 plików) bez podbicia wersji `0.6.0`, gdy dwie siostrzane wtyczki podbito; nagłówek `straznik-readme` opisuje 6 reguł przy 8 w kodzie; pozostałe 11 liczb bloku „Gdzie co leży” i trzy źródła wersji zgodne; strażnicy 39/39 |
| PIK | — (bez toru) | 10:27 | 10:37 — wejście 0; **1 regresja**: naprawy 0.65.0 bez procedury WYTYCZNE §1 (zero gałęzi `bak/2026-09*`, `rejestr/znane-bledy.json` bez wpisu `AUD-`/`REA-`, ostatni wpis 2026-08-30), żadna z D1–D11 tego nie zwalnia; 6 pozycji bez regresji; obserwacja = ta sama co REPO-R6 (liczniki README) | 10:48 **ODRZUCAM**: fakty odtworzone (0 gałęzi `bak/2026-09*`, 0 wpisów `AUD-`/`REA-` w rejestrze), ale to NIE regresja 0.65.0 — utrwalona praktyka: 11 wydań bez wpisu do rejestru, 15 bez `bak/*`, w tym 0.59.0; kroki 3 i 5 WYTYCZNE §1 spełnione (+378 linii strażników); trzy obietnice dotknięte naprawami (C1, zamówienie mieszane, BLAD-018) sprawdzone przez krytyka — trzymają; `admin_post_` 8 = 8; blok kodów wyjścia roli zawiera nieprawdziwe EXIT=0 |
| INT | A | 09:33 | 10:04 — 3/3 NAPRAWIONE (AUD-INT-F1-001, REA-INT-F1-001, REA-INT-F1-003), regresje 0/7; niedomknięte: 38 osieroconych `wp_postmeta` (sprzątnięte przywróceniem `k-baza`) | 10:21 **ODRZUCAM**: AUD-INT-F1-001 i REA-INT-F1-001 PRZEPUSZCZAM (szerzej niż rola — także ścieżka Kosz → Usuń trwale); REA-INT-F1-003 ODRZUCAM: zamówienie MIESZANE (kurs + produkt) po skasowaniu zostawia 1 wiersz `wp_tutor_earnings` i 3 notatki (zamek 1 `same_kursy()` wychodzi przed sprzątaniem) — klasa żyje, jest tylko WYKRYWANA (`sprawdz` kod 1); R2 roli ślepa na `class-aai-sklep-tutor.php:305`; dług smoke-toolingu potwierdzony: 265 osieroconych `post_id` w `wp_postmeta` na bazie bazowej |
| ARCH | B | 10:05 | 10:13 — 4 NAPRAWIONE (AUD-ARCH-F1-001/003/004, REA-ARCH-F1-003), REA-ARCH-F1-002 NIE DOTYCZY PRODUKTU; regresje 0/7; własny graf: 0 cykli w 55 klasach; skutek uboczny: `wp_options` +5, actionscheduler +1 (housekeeping Woo), przywrócenie `k-baza-b` kod 0 | 10:26 **PRZEPUSZCZAM** — 5/5 odtworzone szerzej (własny graf Tarjan z kontrprzykładem na `a516fe4~1`: dokładnie 3 cykle fali 1; regeneracja soli omija `wp_options`; cały kształt `Cta::stan()`); dwa defekty dowodu roli bez wpływu na werdykty (zmyślona przyczyna 301 = `user_trailingslashit`; deaktywacja `aai-platnosci` przestawia produkty na `draft` — rola liczyła wiersze, nie stany) |
| BE | B | 09:37 | 09:49 — AUD-BE-F1-001 **NIENAPRAWIONE** (mechanizm tak, wpływ nie: chmod 000 na `class-aai-sklep-tutor.php` → 500 na całej witrynie przez `Aai_Sklep_Lekcja::policz()` bez `class_exists`), REA-BE-F1-001 NAPRAWIONE; 1 regresja = to samo; środowisko wróciło | 10:03 **ODRZUCAM** werdykt NIENAPRAWIONE: mechanizm z wpisu (try/catch w `plugins_loaded`) JEST; residuum to osobna klasa — statyczne wywołanie klasy wtyczki bez `class_exists()` z zarejestrowanego haka albo z poziomu pliku, zmierzone 3 pliki/42 (`class-aai-sklep-tutor.php`, `class-aai-sklep-moje.php`, `class-aai-platnosci-ustawienia.php`); REA-BE-F1-001 PRZEPUSZCZAM |

**Pułapka przywracania (BE):** `--przywroc=k-baza-b` zatrzymał się na rozjeździe mediów
1347 → 1348 — dodatkowy plik to `uploads/wc-logs/fatal-errors-<data>-<hash>.log`, który
WooCommerce zapisał przy fatalach PHP wywołanych testem `chmod 000`. Skasowany jawną
ścieżką, przywrócenie kod 0. **Każda rola, która wywołuje fatal, zostawia ten ślad poza
bazą** — wpisane do polecenia kolejnych ról/krytyków.

**Pułapka przywracania (INT, tor A):** `--przywroc=k-baza` kod 1 przez SAME BAJTY mediów
(liczba plików bez zmian) — dwa dzienniki `uploads/wc-logs/` (`transactional-emails-*`,
`fatal-errors-*`) URÓSŁY, bo INT puszczał `smoke-wp-maile`/`smoke-wp-zakup`. Dzienniki Woo
leżą poza bazą i rosną przy każdej roli wysyłającej pocztę albo wywołującej fatal, więc
ścisła asercja W2 na mediach zapala się po każdej takiej roli. Oba skasowane, zrzut `k-baza`
ODNOWIONY na czystych mediach (baza była już w stanie ze zrzutu: skrót `f8fd841d…` bez
zmian; media 1345 → 1343), `--przywroc=k-baza` kod 0. Ślad: `k-INT-po` (skrót `307a3b76…`).
Lekcja dla narzędzia sektora (nie naprawiana teraz): porównanie mediów powinno pomijać
`wc-logs/` albo role muszą kasować dzienniki po sobie — wpisane do poleceń kolejnych ról.

**Decyzja orkiestracji:** USP NIE idzie „bez toru” mimo zapisu w planie — jego jedyny wpis
(AUD-USP-F1-001, narzędzie liczące zapytania SQL na odsłonę) da się skontrolować tylko
uruchomieniowo, a pytanie działu o powtarzalność pomiaru wymaga żywej instalacji;
odsłony GET mogłyby zaburzyć liczniki roli pracującej równolegle na torze. USP wchodzi
na wolny tor po PERF, jak w kolejności planu (REPO, USP, WDR).

**Decyzja orkiestracji (11:30) — QA NIE wchodzi równolegle z żadną rolą:** oba tory
montują TEN SAM katalog `wordpress/wtyczki/` z repo (bind mount), więc mutacja pliku
PHP na dysku (audyt mutacyjny strażników, psucie przedmiotu bramki, `chmod 000`) jest
widoczna na OBU torach naraz. To tłumaczy też padnięcie `smoke-wp-maile` 9/61 u INT
(tor A, ~09:45) w oknie, w którym BE na torze B trzymał `class-aai-sklep-tutor.php`
z `chmod 000` — INT przypisał to własnemu równoległemu uruchomieniu bramek, a przyczyna
mogła być cudza. Konsekwencja: **QA biegnie SAMO, gdy oba tory są bezczynne**; role
mutujące pliki nie mogą dzielić czasu z rolami mierzącymi. Kolejność dalsza: USP (tor B,
bez mutacji plików) równolegle z FE (tor A) → QA samo → PROTO (`:3001` + tor A) →
WDR (tor B, `postaw.sh` od zera, na końcu).

**Pułapka orkiestracji (FE, 11:50):** `npm run wp:klient` na torze B ZAPISAŁ nowe hasło
`klient-test` do wspólnego `wordpress/srodowisko/.env`, więc konto na torze A ma hasło
sprzed, a `.env` mówi co innego — krytyk FE musiał podmienić hash na czas pomiaru
i przywrócić go co do znaku. Jeden `.env` na dwa tory = jeszcze jedno sprzężenie torów
(obok bind mountu `wordpress/wtyczki/`).

## Audyt mutacyjny R17 — okno ciszy (12:36–12:58)

Pełny `audyt-straznika-sektora.mjs` NIE mieści się w 10 min (każda mutacja uruchamia
cały strażnik z samokontrolami narzędzi) — przebieg ubity limitem czasu. **Ubity audyt
zostawił NIEPRZYWRÓCONĄ mutację w `status.mjs`** (`WOLNE_OD_IZOLACJI` z dziewięcioma
rolami zamiast dwóch): SIGTERM omija `finally`, a kolejne przebiegi padały na R26
„status.mjs --test nie przechodzi” — wyglądało jak kolizja, było śladem po zabiciu.
Cofnięte jedną linią (kontrola: `git diff --stat status.mjs` = tylko +5 D15).
**Lekcja narzędzia sektora: audyt mutacyjny bez zapisu kopii na dysku przed mutacją
nie jest bezpieczny wobec przerwania; `pkill -f <nazwa>` trafia we własną powłokę
(kod 144) — zabijać po PID.**
Przebieg CELOWANY `--tylko=próbn|proba|PRÓB` (nie jest dowodem sektora): **13 mutacji,
0 przeoczonych, 0 martwych** — w tym nowa „wpis próbny BEZ pola `proba` MUSI zapalać
regułę” ZŁAPANA (R17) i kontrprzykład „wpis OZNACZONY `proba` nie jest wejściem”
przepuszczony słusznie. Pełny audyt: na końcu fali, w tle, limit 60 min.

## Przerwanie 13:36 — limit sesji API (HTTP 429, reset 13:10, wznowienie 15:42)

Stan w chwili przerwania: **12 z 14 działów zamkniętych po krytyku** (INT, BE, BD, ARCH,
PERF, PRIV, SEC, FE, REPO, USP, QA, PIK), PROTO ma wynik roli BEZ werdyktu krytyka, WDR
nie ma wyniku (rola ubita w połowie łańcucha danych na torze B). Zostaje: WDR od nowa,
krytyk PROTO, krytyk WDR, bilans w `WYNIK.md`, pełny audyt mutacyjny strażnika sektora
w tle (limit 60 min, nic równolegle), commit sektora, docs-PR do `main`.

**Stan torów po wznowieniu (15:42):** tor A = `k-baza` (przywrócony po krytyku QA, kod 0),
dev server `:3001` ZATRZYMANY; tor B = świeża instalacja WDR z zaimportowanymi kursami
(2/22/12/73, powiązania 2, media 1347, WP 6.9.4, Woo 11.0.1, Tutor 4.0.7 — czyli WDR
obszedł upadek `postaw.sh` przypięciem wersji, jak orkiestracja rano), bez `wp:klient`
i bez zrzutu bazowego dla nowej instalacji (`k-baza-b` jest ze STAREJ instalacji toru B —
po WDR trzeba zrobić `k-baza-b2` albo nie przywracać, bo WDR jest ostatni na torze B).

**PUŁAPKA (kosztowała 2355 linii, odzyskane z gita):** `npm run dev` (Next 16) przy
starcie „dopisuje” swój blok do `CLAUDE.md` i tym razem **UCIĄŁ plik** od sekcji „TRZY
OSTATNIE KROKI” do końca (`git diff --stat CLAUDE.md` = 2355 deletions). Plik był czysty
na starcie sesji, więc `git checkout -- CLAUDE.md` przywrócił 3522 linie. Po KAŻDYM
uruchomieniu deva na tej gałęzi: `git diff --stat CLAUDE.md` — inaczej niezmiennik sektora
(0 plików poza `audyt/`) pęka po cichu, a commit mógłby wciągnąć okaleczony CLAUDE.md.

**Po wznowieniu Krzysiek przekazał przegląd Mariusza** — zapisany w `PLAN-DO-NIEDZIELI.md`
(ten katalog) razem z planem napraw; to jest NASTĘPNY KROK po domknięciu fali.
