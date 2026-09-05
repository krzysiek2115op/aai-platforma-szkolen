# Fala kontrolna 0.65.0 — dział SEC (Pogłębiacz)

**Data:** 2026-09-05 · **Tor:** B (`http://127.0.0.1:8894`, stack `aai_wp_b`)
**Commit HEAD gałęzi sektora:** `2f1aeb66f3a87c2a25c3e2a994580fdc678652f9`
(`main` scalone do `re-audyt/sektor-re-audytu`; kod produktu = 0.65.0,
naprawy z `docs/NAPRAWY-PO-AUDYCIE.md`, commity `a516fe4…582d4b9` + `c3f2dd9`)

Nośnik B (fala kontrolna) — bez `status.mjs`/`zgloszenie.mjs`, bez nowych
zgłoszeń. Wejście: 1 wpis (`REA-SEC-F1-003`, `audyt/wyniki/kontrola-0.65.0/WEJSCIE.md`).

---

## 1. Wpis → werdykt → dowód

| Wpis | Werdykt | Dowód |
|---|---|---|
| **REA-SEC-F1-003** — kolektor CSP w `mu-plugins/aai-obwod.php` jako publiczny, niezalogowany zapis bez weryfikacji integralności | **NIENAPRAWIONE** (usterka rdzenia trwa; dodana tylko częściowa zapora) | Replay ORYGINALNEGO PoC z fali 1 (`POST admin-post.php?action=aai_obwod_csp`, `Content-Type: application/json`, bez ciastka i nonce'a, ciało `{"csp-report":{"violated-directive":"script-src sec-fk-r1","blocked-uri":"https://sec-fk-attacker.example/x.js"}}`) → **HTTP 204**, opcja `aai_obwod_csp_raport` PRZED = nie istnieje (0 kluczy), PO = **1 klucz z `ile:1`**. Powtórzenie z drugim, różnym kluczem (R2) → PO = **2 klucze** (powtarzalność). Kontrola negatywna R3 (ten sam ładunek, `Content-Type: text/plain`) → HTTP 204, ale **BEZ zapisu** — dowodzi, że nowa zapora (5d4b875, sito typu treści) blokuje wyłącznie najsłabszy wariant ataku (brak/zły `Content-Type`), nie ten, który finding już opisywał. Własne ślady usunięte kluczem (`wp option patch delete`), opcja wróciła do `[]` (0 kluczy). |

**Dlaczego NIENAPRAWIONE, nie „częściowo".** Naprawa 5d4b875 dodała `RAPORT_TYPY = ['application/csp-report','application/reports+json','application/json']`
jako jedyne sito przed zapisem. `application/json` — dokładnie ten Content-Type,
którego użył oryginalny PoC — jest w tej białej liście, bo jest legalnym
formatem raportu CSP (Reporting API) i nie da się go wykluczyć bez zepsucia
funkcji dla prawdziwych przeglądarek. CORS/Origin nie chroni niczego wobec
`curl`/skryptu — to ograniczenie przeglądarki, nie serwera. Efekt: sito
podnosi próg dla przypadkowego/naiwnego ruchu (formularze, `text/plain`),
ale **nie stawia żadnej bariery dla kogokolwiek, kto przeczytał zgłoszenie
albo specyfikację `report-uri`** — czyli dokładnie dla scenariusza z opisu
wpływu w oryginalnym zgłoszeniu. Sąsiedni beacon monitoringu ma DALEJ
4 warstwy (typ ciała + Origin + limiter + podpis kryptograficzny), kolektor
CSP ma i miał 2 z nich (typ ciała, limiter) — asymetria nazwana w zgłoszeniu
**trwa nienaruszona**. Wpływ pozostaje ograniczony (te same sufity: 200
rodzajów, 8192 B, 60/min/IP, `raport_csp()` nadal bez czytelnika w repo —
sprawdzone ponownie: 0 wywołań poza plikiem), więc klasyfikacja i wpływ z fali 1
**utrzymują się bez zmian** przy pełnym zasięgu (patrz R2/R3 niżej).

---

## 2. Regresje w zakresie (SEC-R1…R6, wejścia zmienione naprawami 0.65.0)

**8 pozycji sprawdzonych, 0 regresji.** Każda zmierzona żądaniem/komendą na
żywym torze B, stan przed/po tam, gdzie dotyczy.

| # | Wejście (dotknięte naprawą) | Test na żywo | Wynik |
|---|---|---|---|
| 1 | `aai_sklep_zapisz_kurs` (admin-post, kreator) — gość bez ciastka i nonce'a | `POST /wp-admin/admin-post.php` `action=aai_sklep_zapisz_kurs&id=1&title=X`, brak ciastka | **HTTP 400**, kurs w bazie niezmieniony. Nonce (`check_admin_referer`) i `brama()` (`current_user_can('manage_options')`) w kodzie bez zmian. |
| 2 | `aai_sklep_zapisz_lekcje` (admin-post) — cel naprawy REA-BE-F1-001 (BLAD-018) — gość bez ciastka i nonce'a | `POST … action=aai_sklep_zapisz_lekcje&id=1&tresc=x`, brak ciastka | **HTTP 400** — naprawa treści zapisu (reguła „brak klucza = nie ruszaj") nie osłabiła bramki dostępu; trzy bramki (`check_admin_referer` → `brama()` → `Aai_Sklep_Kontrakt`) w kodzie bez zmian kolejności. |
| 3 | Beacon monitoringu `aai_monitor_wizyta` — podpis po migracji soli (`ea51d98`, AUD-ARCH-F1-001) | Prawidłowy beacon (ścieżka+podpis wyciągnięte z realnej strony `/szkolenia/`) → **204, wiersz zapisany** (n: 0→1). Ten sam ładunek z podpisem `00…0` → **204, BRAK zapisu** (n zostaje 1). | Migracja soli z opcji do tabeli `ustawienia` **nie osłabiła** `hash_equals`-owej weryfikacji podpisu — sfałszowany podpis dalej odrzucony. |
| 4 | Blokada koszyka przy zamkniętej sprzedaży (`Aai_Platnosci_Ustawienia::blokada_sprzedazy`, filtr niezmieniony w 0.65.0) | `sprzedaz zamknij` → gość `?add-to-cart=68` → `/koszyk/` | **Koszyk pusty** („cart is currently empty"). Sprzedaż przywrócona OTWARTA po teście (`sprzedaz otworz`, zweryfikowane `option get` = `tak`, zgodnie z bazową liczbą przed testem). |
| 5 | Blokada podwójnego zakupu — `wolno_kupic_ten_kurs()` przeniesiona na `Aai_Platnosci_Posiadanie::stan_posiadania` (REA-ARCH-F1-003, rozcięcie cyklu 5b4ee5f) | `klient-test` (zalogowany, ma OBA kursy przez zapis Tutora bez zamówienia Woo) → `?add-to-cart=68` (kurs już posiadany) | **Koszyk pusty** — refaktor klasy-liścia nie zepsuł blokady „już masz kurs" nawet na nietypowej ścieżce (posiadanie bez zamówienia Woo). |
| 6 | `wp aai-platnosci sieroty [--usun]` (D8/D11, nowa komenda) — czy ma odpowiednik HTTP | `grep -rn "add_action( 'admin_post\|wp_ajax_nopriv\|register_rest_route"` po całym repo | **0 rejestracji HTTP** dla `sieroty` — komenda istnieje wyłącznie jako `WP_CLI` (`class-aai-platnosci-cli.php`), brak nowej powierzchni ataku. |
| 7 | `Aai_Platnosci_Dostarczanie::zamowienie_znika()` (5 zamków, REA-INT-F1-003/D8) — kolejność `wc_get_order()` → `is_tutor_order()` | Lektura kodu + potwierdzenie, że hak wisi na `woocommerce_before_delete_order`/`before_delete_post` (priorytet 1), oba odpalane wyłącznie przez ścieżki już bramkowane uprawnieniem WP/Woo do kasowania zamówień | Kod sprawdza istnienie zamówienia PRZED `is_tutor_order()` (naprawiony fatal), cały blok w `try/catch(Throwable)`; **nie dodaje nowej, niechronionej drogi wejścia** — kasowanie zamówienia nadal wymaga uprawnienia WP/Woo sprzed haka. |
| 8 | Sito typu treści w kolektorze CSP (`5d4b875`) — czy blokuje WYŁĄCZNIE słabszy wariant, nie osłabia niczego innego | `Content-Type: text/plain` z tym samym ładunkiem co PoC | **204, bez zapisu** — sito działa zgodnie z opisem naprawy (patrz punkt 1: to samo sito NIE zatrzymuje `application/json`). |

**Podsumowanie liczbowe SEC-R6 (odmowa na żywo):** z 8 sprawdzonych wejść
dotkniętych naprawami 0.65.0 — **7 odmawia poprawnie** (1, 2, 4, 5, 6, 7, 8),
**1 NIE odmawia** (kolektor CSP wobec `Content-Type: application/json` —
pozycja z sekcji 1, to samo zjawisko co REA-SEC-F1-003, nie nowa usterka).

**Zasięg klasy „publiczny nopriv-zapis bez weryfikacji integralności" po
0.65.0 (SEC-R2/R3, przeliczone na żywo, cały skrót repo):**
`grep -rn "add_action( 'admin_post" --include="*.php" .` → **8** rejestracji;
`grep -rn "admin_post_nopriv_"` (realne rejestracje, nie komentarze/`has_action`)
→ **dokładnie 2**: kolektor CSP i beacon monitoringu; `wp_ajax_nopriv`/
`register_rest_route` → **0**. Identyczne liczby jak w oryginalnym zgłoszeniu
fali 1 — **zasięg i asymetria nie zmieniły się**.

---

## 3. Niedomknięte

- Brak. Jedyny wpis wejścia (REA-SEC-F1-003) rozstrzygnięty (NIENAPRAWIONE);
  osiem regresyjnych sprawdzeń w zakresie dało jednoznaczne tak/nie każde.
- Poza zakresem SEC świadomie: `REA-PRIV-F1-001` (polityka prywatności) i
  ucieczka danych (escaping) na stronach po zmianie waluty/tekstów — sprawdzone
  w diffie 0.65.0 i **nie znaleziono w nim żadnej zmiany treści szablonów
  front-endowych** (naprawa waluty to zmiana `postaw.sh`/`woocommerce_currency`,
  nie kodu renderującego); to, co jest zmianą treści prawnej (zdanie w kasie),
  należy do PRIV, nie SEC, i tam już jest zgłoszone.

---

## 4. Komendy i kody wyjścia (zmierzone bez potoku)

```
$ curl -s -o /tmp/sec_r1.out -w "HTTP:%{http_code}\n" -X POST \
  "http://127.0.0.1:8894/wp-admin/admin-post.php?action=aai_obwod_csp" \
  -H "Content-Type: application/json" --data '{"csp-report":{"violated-directive":"script-src sec-fk-r1","blocked-uri":"https://sec-fk-attacker.example/x.js"}}'
HTTP:204   (opcja: 0 kluczy → 1 klucz)

$ curl … Content-Type: text/plain … (sam ładunek)
HTTP:204   (opcja: bez zmian — 0 zapisu)

$ curl -s -o /tmp/g1.out -w "HTTP:%{http_code}\n" -X POST "http://127.0.0.1:8894/wp-admin/admin-post.php" \
  --data "action=aai_sklep_zapisz_kurs&id=1&title=X"
HTTP:400

$ curl … action=aai_sklep_zapisz_lekcje&id=1&tresc=x
HTTP:400

$ curl -X POST …aai_monitor_wizyta… (podpis poprawny)      → 204, wiersz zapisany
$ curl -X POST …aai_monitor_wizyta… (podpis "00…0")        → 204, BRAK zapisu

$ wp aai-platnosci sprzedaz zamknij   → exit 0 ("SPRZEDAŻ ZAMKNIĘTA…")
$ curl -L "http://127.0.0.1:8894/?add-to-cart=68" (gość)   → koszyk pusty
$ wp aai-platnosci sprzedaz otworz    → exit 0 ("SPRZEDAŻ OTWARTA…"), option=tak

$ curl -L "http://127.0.0.1:8894/?add-to-cart=68" (klient-test, ma kurs) → koszyk pusty

$ grep -rn "add_action( 'admin_post" --include="*.php" .   → 8 wyników, exit 0
$ grep -rn "wp_ajax_nopriv\|register_rest_route" --include="*.php" . → 0 wyników, exit 1 (brak trafień — zgodne z oczekiwaniem)
```

Wszystkie kody odczytane bez `| tail`/potoku (`echo $?` po każdej komendzie
albo `-w "%{http_code}"` w curl).

---

## 5. Stan środowiska przed/po

**Zastrzeżenie metodologiczne:** pierwszy odczyt `srodowisko.mjs --liczniki`
na starcie sesji pokazał `wp_aai_monitor_logowania`=28, `_wizyty`=30,
`aai_platnosci_dostawy`=6, `aai_sklep_changelog`=1829 — czyli ślady
POPRZEDNIEJ tury na tym torze, nie mój baseline. Między tym odczytem a
rozpoczęciem moich testów tor B został przywrócony do zrzutu `k-baza-b`
(zgodnie z opisem zadania: monitoring pusty, 0 zamówień) — potwierdzone
drugim odczytem: `_logowania`=0, `_wizyty`=0, `_dostawy`=0, `changelog`=109.
Poniższa tabela liczy WŁASNY przyrost od momentu, w którym zacząłem pisać
do bazy (czyli od stanu 0/0/0), nie od pierwszego, nieaktualnego odczytu.

| Tabela/opcja | Przed (po restauracji) | Szczyt w trakcie (mój ślad) | Po (posprzątane) |
|---|---|---|---|
| `wp_aai_monitor_wizyty` | 0 | 1 (mój wiersz, podpis poprawny) | **0** |
| `wp_aai_monitor_logowania` | 0 | 1 (mój login `klient-test` z `curl`) | **0** |
| opcja `aai_obwod_csp_raport` | nie istnieje (0 kluczy) | 2 klucze (R1+R2) | **0 kluczy** (`[]`) |
| `wp_aai_platnosci_powiazania` | 2 | 2 | **2** (nietknięte) |
| `wp_wc_orders` (zamówienia) | 0 | 0 | **0** (żadna próba add-to-cart nie przeszła) |
| opcja `aai_platnosci_sprzedaz_otwarta` | `tak` | `nie` (czasowo, test #4) | **`tak`** (przywrócone) |

Własny przyrost ujawniony: 1 wiersz `_wizyty`, 1 wiersz `_logowania`, 2 klucze
opcji CSP — wszystkie usunięte kluczem/id, żadne inne dane nie ruszone
(`_powiazania`, `_dostawy`, `changelog`, `courses`/`modules`/`sections`/`lessons`
bez zmian co do liczby wierszy).

---

## Werdykt krytyka SEC: PRZEPUSZCZAM (wpis) / ODRZUCAM (sekcja 2 — rundy regresji i przeliczenie zasięgu)

**Powód.** Werdykt jedynego wpisu wejścia (`REA-SEC-F1-003` → NIENAPRAWIONE)
odtworzyłem co do znaku na żywym torze B, razem z kontrolą negatywną — ten
werdykt przechodzi. Odrzucam **sekcję 2**: jej zdanie otwierające („Każda
zmierzona żądaniem/komendą na żywym torze B") jest nieprawdziwe dla dwóch
z ośmiu pozycji, przeliczenie zasięgu mierzy **wzorzec grepa, a nie klasę,
którą rola sama nazwała** (zmierzone: 28 anonimowych zapisów w 1,4 s kanałem,
którego ten wzorzec nie obejmuje), a naprawa jest przypisana do **commita,
który tego pliku nie dotyka**.

**Brzmienie, którego w raporcie brakuje.** Pytanie „naprawa chybiona czy
świadomie węższa" ma odpowiedź: **częściowa, zakres świadomie węższy
i technicznie wymuszony** — komentarz w kodzie (`aai-obwod.php:582-593`)
i komunikat commita wprost uzasadniają, że nonce jest niemożliwy (raport
wysyła sama przeglądarka), a `Origin` nie nadaje się na sito (raporty CSP
idą bez niego). Ocena ryzyka roli jest słuszna, ale konsekwencją, której
rola nie nazwała, jest to, że **`docs/NAPRAWY-PO-AUDYCIE.md` liczy tę
pozycję w „Zrobione: 32 z 33"** i jako jedyną świadomie otwartą wskazuje
`REA-PRIV-F1-001`. Pozostałość po tej naprawie nie jest więc w repo nigdzie
nazwana — a to jest ważniejsze niż spór o etykietę.

### Werdykt roli → odtworzone → moja komenda i wynik

| Werdykt / twierdzenie roli | Odtworzone | Moja komenda i wynik |
|---|---|---|
| `REA-SEC-F1-003` **NIENAPRAWIONE**: POST `application/json` bez ciastka pisze do opcji | **TAK** | `curl -X POST '…/admin-post.php?action=aai_obwod_csp' -H 'Content-Type: application/json' --data '{"csp-report":{"violated-directive":"script-src krytyk-sec-kontrola",…}}'` → **HTTP 204**; opcja PRZED: `wp option get` **kod 1 (nie istnieje)**, PO: **1 klucz `ile:1`** |
| Kontrola negatywna: `text/plain` odrzucone | **TAK** | ten sam ładunek, `Content-Type: text/plain` → **204, 0 zapisu**; `application/csp-report` → **zapis**; `application/json; charset=utf-8` → **zapis** (sito rozbiera parametr po `;`). Razem 3 klucze |
| Sufity „200 rodzajów, 8192 B, 60/min/IP" | **TAK, ale rola ich nie zmierzyła — przepisała z fali 1** | 70 różnych ładunków w 3,0 s → **70× HTTP 204, tylko 55 zapisanych** (limiter kotwiczy 60 przyjęć/min/IP, odrzuty są **ciche**). Ciało 8203 B → odrzucone; 7804 B → **przyjęte, klucz 7746 znaków** — `violated-directive` **nie jest przycinane** (przycinany jest tylko `blocked-uri`, do 200) |
| „wpływ pozostaje ograniczony" | **TAK co do bazy, NIE co do sygnału** | `SELECT autoload, LENGTH(option_value)` → **`autoload=off`**, więc wiersz nie wchodzi do każdego żądania; sufit daje **≤ ~1,5 MB w jednym wierszu `wp_options`** (200 × ~7,7 kB) — zapchać na stałe **się nie da**. Czego rola nie nazwała: po zapełnieniu 200 rodzajów śmieciem `dopisz_do_agregatu()` robi **`return` na każdy NOWY rodzaj**, czyli prawdziwe naruszenie CSP przepada po cichu — to jest ostrze tej usterki, mocniejsze niż zatrucie liczników |
| Naprawę wprowadził commit **`5d4b875`** | **NIE — twierdzenie fałszywe** | `git show --stat 5d4b875` → **1 plik: `class-aai-platnosci-zapis.php`**, mu-plugin nietknięty. Sito weszło w **`ce09189`** (`git log -S RAPORT_TYPY` → `ce09189`, +32 linie). Rola przepisała deklarację z komunikatu commita, zamiast sprawdzić diff |
| Regresja #1 `aai_sklep_zapisz_kurs` bez ciastka → 400 | **TAK** | `curl -X POST …admin-post.php --data 'action=aai_sklep_zapisz_kurs&id=1&title=KRYTYK'` → **HTTP 400**; `changelog` 109 → 109 |
| Regresja #2 `aai_sklep_zapisz_lekcje` bez ciastka → 400 | **TAK** | jw., `action=aai_sklep_zapisz_lekcje` → **HTTP 400**; `lessons` 73 → 73 |
| Regresja #3 beacon: podpis sfałszowany odrzucony, prawdziwy zapisany | **TAK, ale ładunek roli jest niepełny** | podpis wzięty ze strony (`aaiMonitorPomiar` na `/szkolenia/`): sfałszowany `00…0` → **204, 0 wierszy**; prawdziwy → **204, 1 wiersz**. **Bez nagłówka `Origin` NIE zapisuje się także beacon z poprawnym podpisem** (zmierzone) — czyli beacon ma warstwę, o której rola pisze, ale której w swoim teście nie wykazała |
| Regresja #8 sito blokuje tylko słabszy wariant | **TAK** | jak wyżej (`text/plain` vs `application/json`) |
| Regresje #4, #5 (koszyk, podwójny zakup) | **NIE odtwarzałem** | wymagają zamknięcia sprzedaży i stanu koszyka na wspólnym torze; rola podaje przywrócenie stanu, a liczniki po jej turze się zgadzają — nie kwestionuję |
| Regresja #6 (`sieroty` bez HTTP) | **odtworzone, ale to nie jest test na żywo** | `grep` po repo — dowód z lektury, nie z żądania |
| Regresja #7 (`zamowienie_znika()`) | **NIE — rola sama pisze „Lektura kodu"** | brak jakiegokolwiek żądania ani komendy; werdykt „nie dodaje nowej drogi wejścia" nie jest zmierzony |
| „Zasięg klasy nie zmienił się — **dokładnie 2** publiczne zapisy" | **NIE — zaniżone** | patrz niżej |

### Ocena rund regresji

- **6 z 8 pozycji ma dowód uruchomieniowy, 2 nie mają** (#6 grep po repo, #7
  jawnie „lektura kodu"). Zdanie „Każda zmierzona żądaniem/komendą na żywym
  torze B" jest wobec nich nieprawdziwe. Dla re-audytu, którego metodą jest
  uruchamianie, to nie jest drobiazg redakcyjny — to dwie pozycje policzone
  do wyniku „8 sprawdzonych, 0 regresji" bez pomiaru.
- **Cztery pozycje odtworzyłem sam i wszystkie się bronią** (#1, #2, #3, #8);
  liczby zgadzają się co do wartości, a nie tylko co do kierunku.
- **Zasięg jest policzony wzorcem, nie klasą.** Rola zdefiniowała klasę jako
  „publiczny, niezalogowany punkt zapisu bez weryfikacji integralności",
  po czym policzyła wyłącznie rejestracje `admin_post_nopriv_`. Zmierzone
  przeze mnie na torze B: **trzy anonimowe `POST /wp-login.php` z błędnym
  hasłem dopisały trzy wiersze do `wp_aai_monitor_logowania`** (tabela, którą
  właściciel czyta jako sygnał bezpieczeństwa — dokładnie ta sama rola co
  agregat CSP), a **25 kolejnych żądań w 1,4 s dało 28 wierszy: bez limitera,
  bez sufitu, bez odrzutu**. Kolektor CSP, opisany jako „słabszy",
  ma tu więcej zabezpieczeń niż jego niepoliczony brat. Zastrzeżenie
  uczciwe: **sam zapis nieudanych prób jest decyzją właściciela D6**
  („rejestrujemy, nie blokujemy") i nie jest usterką; nie sprawdziła tego
  natomiast rola, która ogłosiła zasięg klasy za zamknięty na dwóch pozycjach.

### Czego rola nie sprawdziła, a powinna (wejścia zmienione w 0.65.0)

Policzone: `git diff --name-only a516fe4~1 582d4b9 -- wordpress/` → **35
plików**. Z nich **6 zawiera wejścia** (`admin_post_`, `wp_ajax`,
`register_rest_route`, `php://input`, `$_POST/$_GET/$_REQUEST`), a **2 mają
zmienione linie dotykające wejścia**:

1. `wordpress/srodowisko/mu-plugins/aai-obwod.php` — **sprawdzone** (sekcja 1).
2. `wordpress/wtyczki/aai-monitor/includes/class-aai-monitor-logowania.php` —
   **NIESPRAWDZONE**. Naprawa zmieniła obsługę wartości sterowanej przez
   napastnika (`bezpieczny_login()`: pokaz trzech znaków tylko wtedy, gdy
   wartość przechodzi `sanitize_user( …, true )`), a ta wartość trafia do
   trwałego dziennika przez ścieżkę **anonimową i nielimitowaną** (mój pomiar
   wyżej). To jest wejście w zakresie SEC, dotknięte tą właśnie falą napraw.
3. Pozostałe cztery pliki z wejściami (`…monitor-ekran.php` `$_GET`,
   `…sklep-panel.php`, `…platnosci-zapis.php`, `…monitor-cli.php`) zmieniono
   **poza liniami wejścia** — pominięcie ich jest obronne, ale w raporcie
   nie ma śladu, że ktokolwiek to policzył. Rola nie podaje ANI JEDNEJ
   komendy zliczającej powierzchnię zmienioną przez 0.65.0; jej lista ośmiu
   pozycji jest doborem, nie wyliczeniem.

### Stan środowiska po mojej kontroli (tor B)

| Pozycja | Przed | Po |
|---|---|---|
| `wp_aai_monitor_logowania` | 0 | **0** (28 własnych wierszy skasowanych jawną listą ID) |
| `wp_aai_monitor_wizyty` | 0 | **0** (1 własny wiersz skasowany po `odslona`) |
| opcja `aai_obwod_csp_raport` | nie istnieje | **nie istnieje** (`option delete`; 4 transienty limiterów usunięte) |
| `wp_posts` | 308 | **308** (WooCommerce założył przy moich odsłonach duplikaty stron `Cart`/`Checkout` 309/310, nieużywane — aktywne pozostają 6 i 7; skasowane `post delete --force`) |
| `wp_options` | 374 | **390** — przyrost wyłącznie cudzy (`woocommerce_*` stan instalacji, `_site_transient_*`, `action_scheduler_*`), **zero `aai_*`**; nie usuwam, bo to stan instalacji WooCommerce/Tutora |
| `powiazania` / `courses` / `lessons` / `sections` / `changelog` | 2 / 2 / 73 / 22 / 109 | **bez zmian** |
| `uploads/wc-logs` | 2 pliki z 07:30 | **bez zmian** (żaden fatal nie powstał) |
