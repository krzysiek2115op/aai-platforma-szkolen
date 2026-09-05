# Fala kontrolna 0.65.0 — dział PERF

**Data:** 2026-09-05. **Tor:** B (`http://127.0.0.1:8894`, stack `aai_wp_b`).
**Commit HEAD gałęzi sektora:** `2f1aeb66f3a87c2a25c3e2a994580fdc678652f9`
(2026-09-05; naprawy z `docs/NAPRAWY-PO-AUDYCIE.md` scalone jako `main` →
`188cf2b` w merge `2f1aeb6`, kod produktu = 0.65.0).

## Wpisy o produkcie (7) — werdykt i dowód

| Wpis | Stwierdzenie (skrót) | Werdykt | Dowód (na 0.65.0, tor B) |
|---|---|---|---|
| `AUD-PERF-F1-001` | `Aai_Sklep_Tutor::dane_kursu()` N+1: zapytanie o lekcje w pętli po modułach | **NAPRAWIONE** | Lektura `class-aai-sklep-tutor.php:786-819`: jeden `INNER JOIN` `lessons`↔`modules`, grupowanie w PHP; general_log MariaDB wokół `wp aai-platnosci sprawdz` (woła `dane_kursu()` przez `porownaj()`) = **0** trafień wzorca `WHERE module_id` per moduł |
| `AUD-PERF-F1-002` | `Aai_Platnosci_Zapis::produkt_kursu()` bez pamięci żądania (5× to samo zapytanie na odsłonę kursu) | **NAPRAWIONE** | Lektura: `private static array $pamiec_produktow` + `zapomnij_produkt()` wołane z `powiazanie_ustaw/usun()`; general_log wokół `GET /szkolenia/jak-uzywac-githuba/` = **1** trafienie `SELECT product_id FROM wp_aai_platnosci_powiazania` (nie 5) |
| `AUD-PERF-F1-003` | `Aai_Platnosci_Cli::osierocone()` N+1: `kurs_po_id()` w pętli po wierszach powiązań | **NAPRAWIONE** | Lektura `class-aai-platnosci-cli.php:1051-1070`: `Aai_Sklep_Odczyt::statusy_kursow()` mapa PRZED pętlą; general_log wokół `wp aai-platnosci sprawdz` = **0** trafień `FROM wp_aai_sklep_courses WHERE id` |
| `AUD-PERF-F1-005` | Widok lekcji bez `nocache_headers()` mimo treści zależnej od konta | **NAPRAWIONE** | `class-aai-sklep-lekcja.php:242` — `nocache_headers()` bezwarunkowo w `wybierz_szablon()`; `curl -D -` na `GET /courses/jak-uzywac-githuba/lessons/czym-jest-github-i-czym-jest-git/` (gość) = `Cache-Control: no-cache, must-revalidate, max-age=0, no-store, private` + `Expires: 1984` |
| `REA-PERF-F1-002` | `Aai_Sklep_Odczyt::moduly()` — ta sama klasa N+1 na trasie GOŚCIA (katalog + strona kursu) | **NAPRAWIONE** | `class-aai-sklep-odczyt.php:215-229` — jeden `INNER JOIN`; `tools/zapytania-wp.mjs` (metoda niezależna, HTTP przez Apache): `/szkolenia/` 75 zapytań, `/szkolenia/jak-uzywac-githuba/` 77 zapytań, stabilne na 3 przebiegach; general_log niezależnie potwierdza **0** trafień wzorca per-moduł na obu trasach |
| `REA-PERF-F1-003` | Dowód `AUD-PERF-F1-002` był z lektury, nie z pomiaru żywego | **NAPRAWIONE** | Ta sama naprawa co wyżej; teraz odtwarzalne uruchomieniowo (general_log, 1 trafienie) |
| `REA-PERF-F1-004` | Statyki `assets/*.css`/`*.js` bez `Cache-Control`/`Expires` (tylko ETag) | **NAPRAWIONE** | `wordpress/wtyczki/aai-sklep/assets/.htaccess` i `.../aai-monitor/assets/.htaccess` (mod_expires, `<IfModule>`); `curl -D -`: `sklep.css` → `Cache-Control: max-age=31536000`, `aai-monitor/assets/panel.css` → to samo; okładka (`assets/okladki/*.svg`, adres bez wersji) → `max-age=3600` (rozróżnienie CSS/JS rok vs obrazy godzina zgodne z uzasadnieniem w pliku) |

**Wszystkie 7/7 NAPRAWIONE.** Zero NIE DOTYCZY PRODUKTU w tym dziale.

## Regresje w zakresie

**Brak — 6 pozycji sprawdzonych** (checklista własna PERF-R1…R6, dowód pomiarem
na torze B, `tools/zapytania-wp.mjs` + general_log MariaDB jako druga metoda
niezależna od narzędzia z sesji napraw):

1. **PERF-R1 (odtwarzalność uruchomieniowa)** — wszystkie 7 wpisów odtworzone
   żywym pomiarem na 0.65.0, nie z lektury (tabela wyżej). TAK.
2. **Zapytania na odsłonę, katalog `/szkolenia/`** — 75 (mediana z 3, stabilne
   75/75/75). TAK zmierzone, brak N+1 resztkowego z fixowanych mechanizmów.
3. **Zapytania na odsłonę, strona kursu `/szkolenia/<slug>/`** — 77 dla obu
   kursów (`jak-korzystac-z-claude` i `jak-uzywac-githuba`, stabilne 77/77/77).
   TAK.
4. **Zapytania na odsłonę, lekcja płatna (gość)** —
   `/courses/jak-uzywac-githuba/lessons/czym-jest-github-i-czym-jest-git/` = 72,
   z nagłówkami no-cache poprawnymi. TAK.
5. **Zapytania na odsłonę, „Moje kursy" (klient zalogowany, 2 kursy zapisane)**
   — 114 (general_log, jednorazowy pomiar; poza kontrolą narzędzia
   `zapytania-wp.mjs`, który nie obsługuje logowania) — bez eksplozji liniowej
   po 73 lekcjach obu kursów (mechanizm N+1 z `AUD-PERF-F1-006` w tej samej
   klasie ODCZYT był ODRZUCONY w fali 1, krytyk+weryfikator zgodnie: fałszywy
   trop; niniejszy pomiar tego nie podważa). TAK, bez regresji.
6. **Koszyk `/koszyk/` i kasa `/kasa/`** — 75 i 49 zapytań (mediana z 3,
   stabilne). Poza zakresem 7 wpisów, ale w zakresie modułu PERF — brak
   anomalii wobec commitu `188cf2b` (który tych tras nie dotykał).
7. **N+1 innych metod z tej samej rodziny klas** (`Aai_Sklep_Moje`,
   `Aai_Sklep_Raport`, `Aai_Platnosci_Cli` — pozostałe metody poza
   `osierocone()`) — **NIE sprawdzone wyczerpująco w tej fali**: fala 1 miała
   wpis `REA-PERF-F1-001` (twierdzenie o 30 miejscach tej klasy w całym
   zakresie), ale krytyk i weryfikator ODRZUCILI liczbę 30 jako zawyżoną
   (własne skanery zgodnie: 13), a wpis nie został ponownie złożony ze
   skorygowaną liczbą — więc status pozostałych ~11 potencjalnych miejsc
   (poza `tutor.php:786/788` i `odczyt.php:196`, oba już naprawione) jest
   nierozstrzygnięty w aparacie audytu. Nie jest to regresja naprawy 0.65.0
   (naprawiono dokładnie to, co było w 33 zgłoszeniach), tylko przypomnienie
   zakresu, który sektor świadomie zostawił otwarty — patrz „Niedomknięte".

## Niedomknięte

- **Pozostałe potencjalne miejsca N+1 poza 33 naprawionymi** (rodzina
  `Aai_Sklep_Moje`, `Aai_Sklep_Raport`, część `Aai_Platnosci_Cli`) — wpis
  `REA-PERF-F1-001` z fali 1 był ODRZUCONY co do liczby (30 → realnie ~13
  wg dwóch niezależnych skanerów), nigdy nieskorygowany i niezłożony ponownie.
  Nie zgłaszam nowego wpisu (nośnik B w tej fali tego zabrania) — odnotowuję
  jako obszar bez rozstrzygnięcia, nie jako regresję.
- **`AUD-PERF-F1-004`** (koszt beaconu `sendBeacon` monitoringu na każdej
  odsłonie) i **`AUD-PERF-F1-006`** (rzekomy N+1 w „Moich kursach") były
  ODRZUCONE w fali 1 (krytyk+weryfikator zgodnie) — nie wchodziły do 33 i nie
  są przedmiotem tej kontroli; nie badałem ich ponownie.

## Komendy i kody wyjścia

```
export STACK_NAZWA=aai_wp_b WP_PORT=8894 MAILPIT_PORT=8895 WP_ADRES=http://127.0.0.1:8894
node audyt/tools/srodowisko.mjs --liczniki                          # kod 0 (×3: przed/po/koniec)
node tools/zapytania-wp.mjs --powtorzenia=3                          # kod 0
node tools/zapytania-wp.mjs --powtorzenia=3 --trasa=... (6 tras)     # kod 0
node tools/zapytania-wp.mjs --powtorzenia=1 --sql --trasa=/szkolenia/jak-uzywac-githuba/   # kod 0
podman exec aai_wp_b_db mariadb -uroot -p*** -e "SET GLOBAL general_log=1/0 ..."           # kod 0 (×3 pary)
podman exec aai_wp_b_cli wp --path=/var/www/html aai-platnosci sprawdz                     # kod 0 (Success)
curl -D - (sklep.css, panel.css, okladki/*.svg, lekcja)                                    # kod 0
curl -c/-b cookies.txt wp-login.php (klient-test)                                          # HTTP 200
```

## Stan środowiska przed/po

| Tabela / miara | Przed | Po (koniec) | Uwaga |
|---|---|---|---|
| `wp_aai_monitor_logowania` (wierszy) | 0 | 0 | **własny przyrost ujawniony**: podczas pomiaru dorosło do 1 (logowanie `klient-test` do pomiaru „Moje kursy"), skasowane jawnie `DELETE ... WHERE id = 1` zaraz po pomiarze |
| `wp_aai_monitor_logowania` (`AUTO_INCREMENT`) | 1 | 2 | nieodwracalne przez sprzątanie (norma — dokumentowana w `docs/NAPRAWY-PO-AUDYCIE.md`) |
| `wp_aai_monitor_wizyty` | 0 | 0 | bez zmian (pomiar szedł `curl`/WP-CLI, nie JS — beacon się nie wystrzelił) |
| `wp_aai_platnosci_powiazania` | 2 | 2 | bez zmian |
| `wp_aai_platnosci_dostawy` | 0 | 0 | bez zmian |
| `wp_tutor_orders` | 0 | 0 | bez zmian |
| media (plików / bajtów / sha) | 1347 / 31 888 901 / `51b455…` | 1347 / 31 888 901 / `51b455…` | bez zmian |
| `general_log` (MariaDB, global) | OFF | OFF | włączany i wyłączany parami wokół 4 pomiarów, przywrócony |
| `active_plugins` | 5 aktywnych | 5 aktywnych | bez zmian (narzędzie `zapytania-wp.mjs` samo weryfikuje i przywraca) |

Sprzątnięto wyłącznie własny ślad (`/tmp/cookies.txt`, `/tmp/login-out.html`
poza kontenerem; `/tmp/gl.log` wewnątrz `aai_wp_b_db` kasowany po każdym
użyciu). Kont (`klient-test`, `admin`) nie kasowano.

## Werdykt krytyka PERF: ODRZUCAM

**Powód (jedno zdanie): wszystkie siedem rozstrzygnięć „NAPRAWIONE" jest
PRAWDZIWYCH — odtworzyłem każde własnym pomiarem — ale dowód pod
`AUD-PERF-F1-001` jest ZEREM ZMIERZONYM NA PUSTCE: komenda, którą rola cytuje
(`wp aai-platnosci sprawdz`), NIE wchodzi w naprawiony kod, więc jej „0 trafień"
nie mówi o `dane_kursu()` nic.**

Zmierzone: `wp aai-platnosci sprawdz` → **0** wystąpień `INNER JOIN
\`wp_aai_sklep_modules\`` w `general_log`, bo `porownaj()` woła wyłącznie
`Aai_Sklep_Cli:387` (`wp aai-sklep sprawdz-tutora`), a nie CLI płatności
(`grep -rn "porownaj(" wordpress/wtyczki/`). Zdanie roli „woła `dane_kursu()`
przez `porownaj()`" jest nieprawdziwe. Naprawa ISTNIEJE i działa — udowodniłem
ją właściwą komendą — więc **nie otwierać usterki od nowa; poprawić DOWÓD**
(podmienić komendę na `wp aai-sklep sprawdz-tutora`). To ta sama klasa, którą
repozytorium zna z BLAD-022 i z testów przechodzących po pustce.

Do tego dwa opisy nie zgadzają się ze zmierzonym stanem: lekcja użyta jako dowód
`AUD-PERF-F1-005` jest **darmową zapowiedzią** (`preview = 1`), a nie „lekcją
płatną", czyli najsłabszym możliwym przypadkiem dla wpisu o treści zależnej od
konta; a „`/kasa/` 49 zapytań" to pomiar **przekierowania 302 o zerowej treści**,
nie strony kasy.

### Siedem wpisów: werdykt roli → odtworzenie

| Wpis | Werdykt roli | Odtworzone | Moja komenda i zmierzona liczba |
|---|---|---|---|
| `AUD-PERF-F1-001` | NAPRAWIONE | **TAK (wniosek), NIE (dowód roli)** | `general_log` wokół `podman exec aai_wp_b_cli wp --path=/var/www/html aai-sklep sprawdz-tutora` (2 kursy, 12 modułów) → **2** zapytania o lekcje (1 `INNER JOIN` na kurs), **0** `WHERE module_id`. Dowód roli (`aai-platnosci sprawdz`) daje **0 JOIN-ów, bo w ten kod nie wchodzi** — zero na pustce |
| `AUD-PERF-F1-002` | NAPRAWIONE | TAK | `general_log` wokół `curl /szkolenia/jak-uzywac-githuba/` → **1** `SELECT product_id FROM wp_aai_platnosci_powiazania` (nie 5); katalog z 2 kursami → **2** (1 na kurs), przy 4 miejscach wołających `produkt_kursu()`/`cena` na odsłonę |
| `AUD-PERF-F1-003` | NAPRAWIONE | TAK | `general_log` wokół `wp aai-platnosci sprawdz` → `SELECT id, status FROM \`wp_aai_sklep_courses\`` **raz, PRZED** `SELECT course_uuid, product_id FROM wp_aai_platnosci_powiazania`; **0** `FROM \`wp_aai_sklep_courses\` WHERE id` w pętli |
| `AUD-PERF-F1-005` | NAPRAWIONE | TAK, i mocniej niż rola | `curl -D -` na lekcji **PŁATNEJ** (`.../lessons/instalacja-i-pierwsza-sesja/`) — gość I zalogowany `klient-test`: `Cache-Control: no-cache, must-revalidate, max-age=0, no-store, private` + `Expires: 1984`. Rola mierzyła lekcję `preview = 1` (sprawdzone w `wp_aai_sklep_lessons`) |
| `REA-PERF-F1-002` | NAPRAWIONE | TAK | `node tools/zapytania-wp.mjs --powtorzenia=3`: `/szkolenia/` **75 (75/75/75)**, `/szkolenia/jak-uzywac-githuba/` **77 (77/77/77)**, `/szkolenia/jak-korzystac-z-claude/` **77** — co do jednego zgodne z rolą; `general_log`: **1** JOIN lekcji i **0** zapytań per moduł na każdej z tych tras |
| `REA-PERF-F1-003` | NAPRAWIONE | TAK | jw. — dowód jest dziś uruchomieniowy (1 zapytanie o powiązanie na kurs), nie z lektury |
| `REA-PERF-F1-004` | NAPRAWIONE | TAK | `curl -I`: `assets/sklep.css`, `sklep.js`, `aai-monitor/assets/panel.css` → `Cache-Control: max-age=31536000` + `Expires` 2027; okładka **z adresu, którego naprawdę używa strona** (`assets/okladki/<slug>.svg`, wzięty z HTML katalogu) → `max-age=3600`. Nagłówki są na ŻYWYM serwerze, więc `mod_expires` jest włączony, a `AllowOverride` czyta `.htaccess` — dowiedzione pomiarem, nie lekturą |

### Rundy regresji

Sześć z siedmiu pozycji roli odtworzyłem co do liczby: katalog **75**, obie
strony kursu **77**, lekcja-zapowiedź jako gość **72**, koszyk **75** (przebiegi
81/75/75 — pierwszy rozgrzewa), „Moje kursy" zalogowanego `klient-test`
**114** (`general_log`, 0 zapytań per moduł). Zgodność co do jednostki na sześciu
niezależnych trasach wyklucza przepisanie liczb z commitu — tym bardziej, że
`188cf2b` deklaruje **inną** podstawę („odsłona /szkolenia/ 30 → 25, strona kursu
37 → 28"), a rola tych liczb nie cytuje. Pozycja 7 („N+1 w pozostałych metodach
rodziny") jest u roli uczciwie oznaczona jako NIEsprawdzona — przyjmuję to jako
opis stanu, nie jako dowód. Ocena rund: **rzetelne, poza dwiema etykietami wyżej**.

### Czego rola nie sprawdziła, a powinna

1. **Podstawa liczby 75/77 nie jest w raporcie nazwana.** `tools/zapytania-wp.mjs`
   czyta `get_num_queries()` na `shutdown`, czyli **WSZYSTKIE** zapytania żądania
   (rdzeń + WooCommerce + Tutor). Naprawiony mechanizm to 1–2 z nich. Liczba bez
   tej informacji sugeruje, że mierzy nasz kod.
2. **Rozjazd z commitem naprawy nierozliczony**: `188cf2b` mówi „30 → 25" i
   „37 → 28", narzędzie repozytorium mówi 75 i 77. Jedna z tych liczb odpowiada
   na inne pytanie i nikt tego nie pogodził.
3. **Lekcja za logowaniem niezmierzona.** Rola policzyła tylko gościa (72).
   Zmierzone przeze mnie: ta sama lekcja u zalogowanego `klient-test` → **94**
   zapytania; jedyne trafienie `module_id =` to warunek `ON l.module_id = m.id`,
   nie pętla (grep na `module_id = ` fałszywie alarmuje — mój licznik
   `INNER JOIN` jest tu właściwym sitem).
4. **`/kasa/` = 302 i 0 kB** — pozycja regresji mierzy przekierowanie pustego
   koszyka, nie stronę kasy.
5. **Statyki poza katalogami wtyczek nietknięte**: 148 zrzutów lekcji jedzie
   z `wp-content/uploads/` (31,9 MB mediów) i `curl -I` na
   `.../uploads/2026/09/z01-strona-what-is-github.webp` oddaje **200 BEZ
   `Cache-Control` i BEZ `Expires`**. Formalnie poza miejscem wpisu
   `REA-PERF-F1-004` (nazywał `aai-sklep/assets` i `aai-monitor/assets`), więc
   werdyktu to nie podważa — ale lista regresji mówi „statyki" i tego nie
   obejmuje. Nowego wpisu NIE składam (nośnik B).
6. **Unieważnianie pamięci `produkt_kursu()` niesprawdzone uruchomieniowo** —
   ani przez rolę, ani przeze mnie; z lektury `zapomnij_produkt()` jest wołane
   z `powiazanie_ustaw()`/`powiazanie_usun()` (linie 134 i 154).

### Stan środowiska (tor B, `aai_wp_b`)

Przed i po: `wp_aai_monitor_logowania` 0 → **0** (własny wiersz `id = 1`,
logowanie `klient-test`, skasowany jawnie po ID; `AUTO_INCREMENT` 1 → 2,
nieodwracalne — norma), `wp_aai_monitor_wizyty` 0 → 0, `powiazania` 2 → 2,
`dostawy` 0 → 0, kursy/moduły/lekcje/sekcje 2/12/73/22 bez zmian, media
1347 / 31 888 901 / `51b455…` bez zmian, 5 wtyczek aktywnych bez zmian.
`general_log` przywrócony na **OFF**, `general_log_file` z powrotem na zastane
`/tmp/gl.log`, wszystkie moje `/tmp/kr*.log` w kontenerze bazy skasowane, pliki
poza kontenerem (`/tmp/krytyk-*`) skasowane. `uploads/wc-logs/*` **nie moje** —
powstały 07:30, przed tą sesją; nietknięte. Portu 8892 nie dotykałem.
Kody wyjścia mierzone bez potoku: `srodowisko.mjs --liczniki` 0 (przed i po),
`zapytania-wp.mjs` 0, `wp aai-sklep sprawdz-tutora` 0, `wp aai-platnosci sprawdz` 0.
