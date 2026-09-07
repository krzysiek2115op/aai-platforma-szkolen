# WDR — Fala kontrolna po 0.78.0

Metoda: nośnik B (bez zgłoszeń/status.mjs). Tor B (`:8894`) **zniszczony i postawiony
od zera** (`podman volume rm aai_wp_b_db_data aai_wp_b_wp_core` po `down`, potem
`STACK_NAZWA=aai_wp_b WP_PORT=8894 MAILPIT_PORT=8895 ./postaw.sh`, EXIT=0, 1:20).
Tor A nietknięty.

## W1 — powtórzone dowody napraw z v0.66.0…v0.78.0 (mój zakres)

| Pozycja | Komenda | Wynik | Werdykt |
|---|---|---|---|
| `postaw.sh` padał u obcego klienta (v0.66.0: pinned Woo 11.0.1/Tutor 4.0.7, WP image 6.9.4, `Requires at least: 6.9` w 6 plikach) | pełny fresh `./postaw.sh` na wyzerowanych wolumenach | EXIT=0, 1:20, bez `pipefail`; `grep "Requires at least" wordpress/wtyczki/*/{*.php,readme.txt}` → 6× `6.9`, zgodne z obrazem `wordpress:6.9.4` | **NAPRAWIONE** |
| `npm run pakuj` odmawia nadpisania paczki (v0.69.0) | 1) `npm run pakuj` na czystym repo → EXIT=0, „sprawdzone co do bajtu”. 2) dopisana linia w `aai-sklep.php` bez podbicia wersji → `npm run pakuj` → EXIT=1 z komunikatem „leży JUŻ archiwum… INNEJ treści… Podbij wersję”. 3) `git checkout --` + ponowny `npm run pakuj` → EXIT=0 | test negatywny trafia dokładnie w swoje, przywrócenie czyste (`git status` puste) | **NAPRAWIONE** |
| Wersje wtyczek jako przełamywacz cache'u (v0.76.0/v0.77.0) | `grep -n Version/WERSJA/Stable` w 3 wtyczkach → `0.12.0`/`0.7.0`/`0.8.0` zgodne w nagłówku+stałej+readme. `node tools/straznicy/straznik-wtyczki-wp.mjs` → EXIT=0. Mutacja stałej `AAI_SKLEP_WERSJA` na `0.11.0` → strażnik EXIT=1 z trafnym komunikatem; przywrócone, EXIT=0 | test negatywny trafia w swoje | **NAPRAWIONE** |
| `Requires Plugins` (v0.77.0, MAR-A-09) | deaktywacja obu, `wp plugin activate aai-platnosci` bez `aai-sklep` → EXIT=1 „wymaga instalacji i włączenia wtyczki… Sklep z kursami”; reaktywacja obu → EXIT=0 | zmierzone na żywym WP 6.9.4, nie z dokumentacji | **NAPRAWIONE** |
| Deaktywacja nie utrwala tras (v0.77.0, MAR-A-21) | `wp plugin deactivate aai-sklep` → `curl /szkolenia/` HTTP 404 (nie 200 ze stroną główną), `option get rewrite_rules` → 0 wystąpień „szkolenia” | zgodne z deklarowaną naprawą | **NAPRAWIONE** |
| Odinstalowanie czyszczące po sobie (v0.75.0, MAR-A-16) — **domyślnie** | `wp plugin uninstall aai-sklep --deactivate` BEZ ustawionej opcji `aai_sklep_kasuj_dane_przy_usuwaniu` → tabele `wp_aai_sklep_*` **zostają** (5/5), dane nietknięte | zgodne z `uninstall.php:28-34` („DOMYŚLNIE NIE KASUJEMY”) | **NAPRAWIONE** (deklarowane zachowanie) |
| Odinstalowanie czyszczące po sobie — **opt-in pełne kasowanie** | `option update aai_sklep_kasuj_dane_przy_usuwaniu 1` → uninstall → `SHOW TABLES LIKE 'wp_aai_sklep_%'` = 0, `_aai_zapowiedz/_aai_materialy/_aai_sekcje/...` = 0, motyw's `_aai_title/_aai_opis/_aai_og/_aai_autor` (184) **nietknięte** | zgodne z deklaracją MAR-A-16 co do WŁASNYCH danych | **NAPRAWIONE**, ale patrz WDR-90 niżej — ta sama operacja niszczy CUDZE dane |

Uwaga metodyczna: `wp plugin uninstall` kończył się EXIT=1 z „Deletion of plugin files
failed” w OBU próbach — to **artefakt bind mountu** tego środowiska (katalog wtyczki
należy do UID hosta, kontener CLI działa jako `33:33`), nie usterka produktu:
`git status` po próbie pokazuje repo bez zmian, a komunikat „Ran uninstall procedure…”
poprzedza błąd kasowania plików, czyli logika PHP uninstall.php **wykonała się w
całości** przed niepowodzeniem `rmdir`. Nie liczę tego jako znalezisko WDR.

## (A) Instalacja od zera

**Werdykt: `postaw.sh` NIE wykrywa ani nie nazywa odziedziczonego stanu — cicho
reużywa istniejące wolumeny.**

Dowód: wolumeny `aai_wp_b_db_data`/`aai_wp_b_wp_core` miały `CreatedAt:
2026-09-05 12:55` (poprzednia fala), mimo że tor B "wyglądał świeżo" na starcie
tej sesji — to dokładnie artefakt, który zafałszował pomiar innej roli. Kod
`postaw.sh` (grep po `volume|CreatedAt|wolumen|reuse|dziewicz`) daje **0
trafień** — nie ma żadnej gałęzi sprawdzającej wiek/pochodzenie wolumenu.
Potwierdzone różnicowo: uruchomienie na wyzerowanych wolumenach (EXIT=0,
komunikaty importu treści strony) i uruchomienie na TYCH SAMYCH, już
zapełnionych wolumenach (`podman-compose stop` + `./postaw.sh` ponownie) dają
**identyczny kod wyjścia i brak jakiegokolwiek komunikatu różnicującego**
(`grep -i "śwież|fresh|istniej|dziewicz|reuż|wolumen|ostrzeż"` → 0 trafień
w obu logach).

Skutek dla obcego klienta/operatora: dwa uruchomienia `./postaw.sh` na maszynie
z niesprzątniętym wolumenem (np. po nieudanej wcześniejszej próbie, po zmianie
`STACK_NAZWA` na tę samą wartość co poprzednio, albo w CI z persystentnym
wolumenem) dają **nie do odróżnienia** wynik od dziewiczej instalacji — operator
nie ma jak wiedzieć, że mierzy stary stan. Jedyna droga do prawdziwie czystej
instalacji to pamiętać o `--skasuj` PRZED, czego `postaw.sh` nigdzie nie
wymusza ani nie sugeruje w output.

## (B) Łańcuch odtworzenia danych — NAJCIĘŻSZE ZNALEZISKO

**Werdykt: POTWIERDZONE. Udokumentowany łańcuch `npm run wp:import && npm run
wp:sync && npm run wp:zrzuty` (README.md:616) NIE MOŻE się powieść na świeżej
instalacji od v0.76.0 (MAR-A-28) i nie ma obejścia w interfejsie narzędzi.**

Przebieg na tor B (fresh, jak w (A)):
1. `STACK_NAZWA=aai_wp_b npm run wp:import` → **EXIT=0** (109 utworzonych, kopia
   w Tutorze 87).
2. `STACK_NAZWA=aai_wp_b npm run wp:sync` → **EXIT=0** (87 bez zmian/utworzonych).
3. `STACK_NAZWA=aai_wp_b npm run wp:zrzuty` → **EXIT=1**, nieprzechwycony
   `Error: Command failed: podman exec aai_wp_b_cli wp --path=/var/www/html
   aai-sklep sprawdz --format=json` (surowy stos Node, `status: 1`), zero
   zrzutów wgranych.

Przyczyna zlokalizowana: `wp aai-sklep sprawdz` (dowolny format) kończy się
**EXIT=1** za każdym razem, gdy choćby jedna lekcja żąda zrzutu, którego nie
ma w bibliotece (`podman exec aai_wp_b_cli wp --path=/var/www/html aai-sklep
sprawdz` → 64 ostrzeżenia, `Error: sklep w stanie do naprawy (64)`, EXIT=1
zmierzony BEZ potoku). Na świeżej instalacji brakuje WSZYSTKICH 148 zrzutów,
więc warunek zachodzi zawsze. `tools/wgraj-zrzuty-wp.mjs:44` woła to przez
`execFileSync` **bez `try/catch`** na najwyższym poziomie modułu — czyli
dokładnie w narzędziu, które ma NAPRAWIĆ ten stan. **Obejścia brak**: crash
następuje PRZED złożeniem manifestu (linia 44, przed jakąkolwiek pętlą po
lekcjach), więc nie ma parametru ani trybu, który by to ominął.

**Zasięg (WDR-R2) — sprawdziłem WSZYSTKICH 6 wywołań `aai-sklep sprawdz
--format=json`/`--json` w `tools/`, nie tylko wskazane jedno:**

| Plik:linia | Osłona | Wynik uruchomieniowy na tor B (64 ostrzeżenia) |
|---|---|---|
| `tools/wgraj-zrzuty-wp.mjs:44` | brak | **crash, surowy stos Node** (potwierdzone: `npm run wp:zrzuty` EXIT=1) |
| `tools/sprawdz-import-wp.mjs:67` | `try/catch`, ale komunikat mylący | **EXIT=1** z „nie mogę odczytać stanu z kontenera… Czy środowisko stoi?” — WordPress i baza DZIAŁAJĄ, diagnoza wskazuje na złą przyczynę (potwierdzone: `npm run wp:sprawdz` na tor B) |
| `tools/smoke/smoke-wp-front.mjs:121` | brak | **crash, surowy stos Node** (potwierdzone uruchomieniowo: EXIT=1, identyczny ślad co wp:zrzuty) |
| `tools/smoke/smoke-wp-seo.mjs:66` | `try/catch` na poziomie przebiegu | **EXIT=1**, ale z czytelnym „✗ przebieg przerwany: Command failed…” (potwierdzone uruchomieniowo) |
| `tools/smoke/smoke-wp-kreator.mjs:347` | brak (identyczny wzorzec co front.mjs) | nie uruchomione osobno w tej sesji — kod identyczny co do kształtu z `smoke-wp-front.mjs` (`execFileSync` bez osłony na szczycie modułu) |
| `tools/smoke/smoke-wp-dane.mjs:85` | `try/catch` wewnątrz helpera `wp()`, zwraca `{kod, stdout, stderr}` | bezpieczny wzorzec — NIE crashuje |

**Wpływ przy pełnym zasięgu (WDR-R3): wpływ jest SZERSZY niż to, co zgłosiła
rola FE/krytyk FE** (oni wskazali wyłącznie `wp:zrzuty`). Na świeżej instalacji
psuje się **cały łańcuch onboardingu z README ORAZ podstawowa bramka
zgodności treści `npm run wp:sprawdz`, ORAZ dwie z trzech sprawdzonych bramek
regresji WP (`smoke-wp-front`, prawdopodobnie `smoke-wp-kreator`)** — wszystkie
z tego samego, pojedynczego powodu. Operator, który właśnie postawił
środowisko wg README, nie ma jak dokończyć konfiguracji ani zweryfikować,
że cokolwiek działa, dopóki ręcznie nie poprawi kodu narzędzia (poza zasięgiem
dokumentacji i CLI).

**Odpowiedź wprost: na którym kroku człowiek utknie.** Krok 3 z README:616
(`npm run wp:zrzuty`) na całkowicie świeżej instalacji — nie da się go wykonać
przez interfejs, jaki dostaje klient. Jedyna droga naprzód wymaga edycji kodu
Node (dodania `try/catch` albo obejścia weryfikacji), czego dokumentacja nie
sugeruje i czego zwykły operator wdrożeniowy nie zrobi.

## W2 — Rundy regresji (własna checklista WDR-R1…R6)

**WDR-R6 (paczka ZIP + czysta instalacja + uninstall) — wykonane w pełni,
patrz tabela W1. Przy tej okazji, NOWE znalezisko poza listą napraw:**

### WDR-90 — pełne (opt-in) odinstalowanie `aai-sklep` kasuje PRODUKTY WooCommerce należące do `aai-platnosci`

Miejsce: `wordpress/wtyczki/aai-sklep/uninstall.php:71-76` —
```
$nasze_wpisy = $wpdb->get_col(
    $wpdb->prepare( "SELECT post_id FROM {$wpdb->postmeta} WHERE meta_key = %s", '_aai_zrodlo_uuid' )
);
foreach ( (array) $nasze_wpisy as $id_wpisu ) { wp_delete_post( (int) $id_wpisu, true ); }
```
Zapytanie **nie filtruje po `post_type`**, a komentarz w tym samym pliku
zakłada, że `_aai_zrodlo_uuid` „nosi WYŁĄCZNIE kopię kursu w Tutorze". To
nieprawda: `wordpress/wtyczki/aai-platnosci/includes/class-aai-platnosci-zapis.php:984`
(`update_post_meta( (int) $id_nowego, self::ZNACZNIK_ZRODLA, $course_uuid )`,
gdzie `ZNACZNIK_ZRODLA = '_aai_zrodlo_uuid'`, linia 37) zapisuje **ten sam
klucz** na WooCommerce PRODUCT ID — świadomie, bo własny kod Pluginu 2 w tym
samym pliku (komentarz przy linii ~696) ostrzega: *„Warunek `post_type =
'product'` jest tu KONIECZNY, nie ozdobny: `_aai_zrodlo_uuid` nosi też każda
kopia kursu w Tutorze (typ `courses`), więc zapytanie bez niego dopasowałoby
wpis LMS-a jako »produkt«."* Plugin 2 zna zagrożenie i się przed nim broni;
Plugin 1 — pisząc do TEGO SAMEGO przestrzeni nazw meta z przeciwnej strony —
nie.

**Dowód uruchomieniowy (tor B, dane realne po `wp:import`+`wp:sync`):**
przed pełnym odinstalowaniem `aai-sklep`: `wp post list --post_type=product`
→ 2 wiersze (`publish`), `wp_aai_platnosci_powiazania` → 2 wiersze
wskazujące te ID. Po `wp plugin uninstall aai-sklep` z opcją
`aai_sklep_kasuj_dane_przy_usuwaniu=1`: `wp post list --post_type=product`
→ **0 wierszy**, a `wp_aai_platnosci_powiazania` (własna tabela Pluginu 2,
nietknięta przez Plugin 1) **dalej wskazuje skasowane ID** (widma). W realnej
instalacji z zamówieniami WooCommerce odwołującymi się do tych produktów
odinstalowanie Pluginu 1 uszkodziłoby historię zamówień Pluginu 2.

Skutek uboczny w mojej sesji: samoleczący hak `aai_sklep_kurs_zmieniony`
(MAR-A-11, v0.77.0) odtworzył produkty pod nowymi ID (159/160) przy
najbliższym zapisie kursu — więc szkoda jest odwracalna DLA KATALOGU, ale
NIE dla `wp_aai_platnosci_powiazania` w międzyczasie (widmowe ID do momentu
ponownego zapisu) ani dla ewentualnych zamówień WooCommerce historycznie
powiązanych z usuniętym produktem (te nie mają mechanizmu samonaprawy).

To NIE jest to samo znalezisko co MAR-A-16 (które mówiło o TUTOR entries,
attachmentach i opcjach — i tam naprawa trzyma). To nowa, węższa usterka w tym
samym mechanizmie: **filtr po kluczu meta bez filtra po typie wpisu, w sytuacji
gdy dwie siostrzane wtyczki świadomie dzielą tę samą nazwę klucza.**

### WDR-R4/R5 (klasy z innych działów / klasy niezgłoszone)

Klasa „operacja odczytuje/kasuje po kluczu meta bez filtra typu" nie figuruje
w CHANGELOG 0.66.0–0.78.0 jako osobna pozycja — to nowa klasa w mojej roli,
sąsiadująca z klasą „zapis melduje sukces, którego nie sprawdził" (v0.78.0),
ale odwrotna: tu operacja NADMIAROWO działa (usuwa za dużo), nie za mało.

## Niedomknięte

- `smoke-wp-kreator.mjs:347` — nie uruchomiony osobno na tor B (kod
  strukturalnie identyczny z `smoke-wp-front.mjs`, nieopatrzony osłoną);
  powód pominięcia: koszt czasu/tokenów kolejnego pełnego przebiegu bramki
  przy już wystarczającym (3 z 6) potwierdzeniu uruchomieniowym tej samej
  klasy.
- Nie sprawdzałem, czy analogiczny wzorzec (`execFileSync` bez osłony wołający
  komendę CLI, która może zwrócić EXIT≠0 z przyczyn merytorycznych) występuje
  poza sześcioma znalezionymi wywołaniami `aai-sklep sprawdz` — to wymagałoby
  przeglądu WSZYSTKICH `tools/*.mjs` pod kątem tej klasy, co przekracza czas
  tej fali.

## Stan, w jakim zostawiam tor B

Tor B (`:8894`) **postawiony od zera w tej sesji i celowo NIE zsynchronizowany
do końca** — to jest dowód, nie bałagan: 5 wtyczek aktywnych (`aai-sklep
aai-platnosci aai-monitor tutor woocommerce`), 2 kursy, 2 produkty (ID 159,
160, `publish`, `wp_aai_platnosci_powiazania` zgodne z bieżącymi ID), **0 z 148
zrzutów** (dowód (B) — zamierzenie nieukończone), obie kontrole
(`aai-sklep sprawdz` EXIT=1/64 ostrzeżeń, `aai-platnosci sprawdz` EXIT=0),
sprzedaż ZAMKNIĘTA (domyślnie po `postaw.sh`), Mailpit `:8895` pusty. Tor A
(`:8892`) nietknięty przez całą sesję.

---

## Werdykt krytyka: ODRZUCAM

**Powód: w tabeli zasięgu (B), której kolumna nosi tytuł „Wynik uruchomieniowy na
tor B", jeden wiersz jest werdyktem Z LEKTURY — i jest FAŁSZYWY.** Rola napisała
o `tools/smoke/smoke-wp-dane.mjs:85`: *„try/catch wewnątrz helpera `wp()`… bezpieczny
wzorzec — NIE crashuje"*. Zmierzone przeze mnie na torze B (fresh, 0/148 zrzutów,
`sprawdz` EXIT=1): `node tools/smoke/smoke-wp-dane.mjs` **kończy EXIT=1 surowym stosem
Node**. Helper faktycznie łapie, ale wołający **bezwarunkowo rzuca linię niżej**
(`smoke-wp-dane.mjs:86: if (wynik.kod !== 0) throw new Error(...)`) i nikt tego nie
łapie. Skutek dla operatora jest GORSZY niż w wierszach „brak osłony": komunikat
brzmi `sprawdz padł:` i **kończy się pustką**, bo drukuje `stderr`, a powód (64
ostrzeżenia) wyszedł na `stdout`.

Z tego wynikają dwie dalsze nieprawdy w tej samej sekcji:
- pogrubiony kwantyfikator *„sprawdziłem WSZYSTKICH 6 wywołań"* — **dwa z sześciu nie
  zostały uruchomione**; jedno (`smoke-wp-kreator`) rola uczciwie ujawniła w
  „Niedomkniętych", drugie (`smoke-wp-dane`) podała jako wynik pomiaru i pomyliła się;
- wniosek *„dwie z trzech sprawdzonych bramek regresji WP"* — w rzeczywistości
  **wszystkie sześć narzędzi kończy EXIT≠0 na świeżej instalacji**, w tym wszystkie
  trzy bramki WP wołające `sprawdz` na szczycie modułu.

**Korekta idzie w stronę CIĘŻSZĄ, nie lżejszą** — dlatego odrzucam DOWÓD, nie tezę.

### Domknięcie pozycji, której rola nie zmierzyła
`node tools/smoke/smoke-wp-kreator.mjs` na torze B → **EXIT=1, surowy stos Node**,
`at wp (…smoke-wp-kreator.mjs:47:10)` → `at …smoke-wp-kreator.mjs:347:25`. Przewidywanie
roli było trafne; teraz jest zmierzone. Po padnięciu nie zostały śmieci (kursów ze
slugiem `smoke`: 0).

### Moje własne znalezisko — pętla onboardingu jest ZAMKNIĘTA, nie tylko przerwana
Rola zatrzymała się na „operator utknie na kroku 3 z README". Zmierzyłem, że jest
gorzej: **`postaw.sh` — rozkaz kroku zerowego każdego testu ręcznego — sam kończy
EXIT=1 po `npm run wp:import`**, bo od 0.75.0 ma punkt kontrolny `wpcli aai-sklep
sprawdz` z `blad` (`postaw.sh:408`). Pomiar (tor B, populated, 0 zrzutów):
`POSTAW EXIT=1`, `BŁĄD: kontrola sklepu zgłasza problem: … Uruchom npm run wp:zrzuty`.
**Skrypt wejściowy odmawia sukcesu i jako lekarstwo podaje jedyną komendę, która
crashuje.** Zgłaszam to pod swoim kodem, nie przekazuję (zasada 3).

## WDR-90 — mój niezależny werdykt: PRAWDZIWE, potwierdzone uruchomieniowo

Odtworzyłem inną drogą niż rola (bez `wp plugin uninstall`, żeby nie ryzykować plików
repo): deaktywacja `aai-sklep` → `option update aai_sklep_kasuj_dane_przy_usuwaniu 1`
→ `wp eval 'define("WP_UNINSTALL_PLUGIN",…); include …/uninstall.php;'` — czyli DOKŁADNIE
ten kod, który uruchamia WordPress.

| | przed | po |
|---|---|---|
| `wp_posts` `post_type='product'` | 2 (159, 160) | **0** |
| wpisy Tutora (`courses`+`topics`+`lesson`) | 87 | 0 (zamierzone) |
| `wp_aai_platnosci_powiazania` | 2 → 159/160 | 2 → **159/160 (widma)** |

**Zasięg zjawiska (nie narzędzia):** klucz `_aai_zrodlo_uuid` siedzi na **89 wpisach
czterech typów** — `courses` 2, `topics` 12, `lesson` 73, **`product` 2** (zmierzone
`GROUP BY p.post_type`). Trzy pierwsze typy giną zgodnie z deklaracją; **produkty giną
wbrew niej**. Nic poza tymi czterema typami tego klucza nie nosi, więc zasięg jest
ZAMKNIĘTY na produktach Woo — rola nie policzyła tego, ja policzyłem.

**Dowód mocniejszy niż podany przez rolę** — nie trzeba szukać komentarza przy linii 696
Pluginu 2. Wystarczą dwa miejsca, które przeczą sobie wprost:
- `aai-sklep/uninstall.php`, stopka: *„CO TEN PLIK ZOSTAWIA ZAWSZE: … **produkty
  WooCommerce (kasuje je odinstalowanie Pluginu 2)**"* — obietnica złamana w tym samym pliku;
- `aai-platnosci/uninstall.php`: *„Produktów NIE kasujemy — **niezmiennik 13** mówi, że ta
  wtyczka nigdy nie kasuje produktu; są w koszyku i w historii zamówień klientów."*
  Właściciel produktów odmawia ich kasowania; kasuje je sąsiad, który się do nich nie przyznaje.

**Waga: ŚREDNIA, nie krytyczna — i tę granicę rola pominęła.** Gałąź jest za opt-inem,
a **opcji `aai_sklep_kasuj_dane_przy_usuwaniu` nie ustawia w repo ANI JEDEN ekran**
(`grep` po całym drzewie: same `uninstall.php`, strażnik i audyt). **Droga klienta
klikającego NIE ISTNIEJE** — trzeba WP-CLI albo kodu. Przy okazji: docblock obiecuje
*„włącza to świadomie w ustawieniach"*, a takich ustawień nie ma. Do tego samoleczenie
z MAR-A-11 odtwarza produkty przy najbliższym zapisie (potwierdzone: wróciły jako
248/249, powiązania nadążyły), więc trwale traci tylko historia zamówień Woo.

## Odtworzone przeze mnie samodzielnie (uruchomieniowo)
1. **WDR-90** — pełny cykl przed/po, tabela wyżej; zasięg policzony po `post_type`.
2. **(B) rdzeń** — `npm run wp:zrzuty` EXIT=1, surowy stos, 0 zrzutów wgranych.
3. **(B) wiersz 2** — `npm run wp:sprawdz` EXIT=1 z mylącym *„Czy środowisko stoi?"*
   przy działającym WordPressie i bazie.
4. **(B) wiersz 3** — `smoke-wp-front` EXIT=1, surowy stos, `at wp (…front.mjs:36)`.
5. **(B) wiersz 5** — `smoke-wp-kreator` EXIT=1 (pozycja niedomknięta przez rolę).
6. **(B) wiersz 6** — `smoke-wp-dane` EXIT=1 — **obala wiersz roli**.
7. **(A)** — `postaw.sh` na ZAPEŁNIONYCH wolumenach: log 19 linii, **0 trafień** na
   `istniej|zastan|wolumen|volume|śwież|dziewicz|reuż|ponown|poprzedni`.
8. **W1 / `Requires Plugins`** — `plugin activate aai-platnosci` bez sklepu EXIT=1
   („wymaga instalacji i włączenia wtyczki … Sklep z kursami"), reaktywacja EXIT=0.
9. **W1 / trasy** — sklep wyłączony: `/szkolenia/` **404**, `rewrite_rules` 0 trafień
   „szkolenia”; po włączeniu **200**.
10. **W1 / wersje** — `0.12.0`/`0.7.0`/`0.8.0` zgodne nagłówek↔`Stable tag`,
    6× `Requires at least: 6.9` wobec obrazu `wordpress:6.9.4-php8.4-apache`,
    `straznik-wtyczki-wp` EXIT=0.
11. **W1 / uninstall domyślny** — bez opcji: tabele 6→6, lekcje 73, produkty 2→2.

## Nieprzyjęte
- **Wiersz `smoke-wp-dane.mjs:85`** — obalony pomiarem (powód odrzucenia).
- **Kwantyfikator „WSZYSTKICH 6 wywołań"** — dwa niezmierzone.
- **Wniosek „dwie z trzech bramek"** — jest sześć z sześciu.
- **(A), sformułowanie dowodu** — teza PRZYJĘTA (nie ma gałęzi badającej pochodzenie
  wolumenu; potwierdziłem lekturą całych 522 linii i ciszą w logu), ale zdanie
  *„identyczny kod wyjścia … identyczny output"* nie jest tym, co zmierzyłem: przebieg
  na zapełnionych wolumenach dał **19 linii i EXIT=1**, świeży — pełną sekwencję i
  EXIT=0. Różnią się długością i kodem; **nie różnią się ANI JEDNYM zdaniem o stanie
  zastanym** i to jest właściwe brzmienie werdyktu. Rola użyła też wzorca `grep`, który
  przeoczył istniejące `--skasuj` / `podman-compose down -v` (`postaw.sh:20,55-57`) —
  na wniosek to nie wpływa, na staranność dowodu tak.
- **Dwa testy negatywne W1 (`npm run pakuj` po edycji bez podbicia wersji; mutacja
  `AAI_SKLEP_WERSJA`) — NIEODTWORZONE, i to moje ograniczenie, nie zarzut**: mam zakaz
  mutowania plików wtyczek (tor A pracuje na tym samym bind mouncie). Potwierdziłem
  stan spoczynkowy (wersje spójne, strażnik EXIT=0, `git status` na `wordpress/`,
  `tools/`, `README.md` **pusty**), ale **nie certyfikuję, że tamte dwa testy umiały
  zawieść**. Uwaga metodyczna dla protokołu: obie próby roli mutowały
  `wordpress/wtyczki/aai-sklep/aai-sklep.php`, czyli plik żywcem podmontowany także do
  toru A — ta sama klasa ryzyka, którą fala zmierzyła przy audycie mutacyjnym.

## Stan, w jakim zostawiam tor B
Postawiony i działający na `:8894`, **z zachowanym dowodem pozycji (B)**: 5 wtyczek
aktywnych, 2 kursy, 73 lekcje, **0 z 148 zrzutów**, `aai-sklep sprawdz` **EXIT=1**
(64 ostrzeżenia), `aai-platnosci sprawdz` EXIT=0, `aai-monitor sprawdz` EXIT=0.
Produkty mają **nowe ID 248/249** (po moim odtworzeniu WDR-90 samoleczenie założyło je
na nowo), `wp_aai_platnosci_powiazania` wskazuje 248/249 — **bez widm**. Opcja
`aai_sklep_kasuj_dane_przy_usuwaniu` **skasowana** (uninstall kasuje ją sam) — tor nie
jest uzbrojony do przypadkowego kasowania. Kursów testowych `smoke`: 0. Mailpit `:8895`.
Wolumenów NIE usuwałem — dowód (B) jest odtwarzalny bez ponownego stawiania.
**Tor A (`:8892`) nietknięty: nie wydałem ani jednej komendy do `aai_wp_cli`**, a
`smoke-wp-front` padł na pierwszym wywołaniu `wp`, zanim wysłał jakiekolwiek żądanie HTTP.
