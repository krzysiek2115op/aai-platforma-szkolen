# Źródła dokumentacji — etap WordPress

Oryginalna dokumentacja pobrana z sieci (WYTYCZNE §7 i N2) jako baza
merytoryczna wtyczki `/szkolenia` dla WordPressa. Kod PHP ma powstawać
z TEJ dokumentacji, nie z pamięci modelu: pamięć myli wersje API, a
w WordPressie różnica między `$wpdb->prepare()` a sklejaniem zapytania to
różnica między wtyczką a dziurą w sklepie.

Data pobrania: **2026-08-19**. Zakres wynika z podziału odpowiedzialności
ustalonego w [docs/ETAP-WP.md](../../ETAP-WP.md): nasza wtyczka bierze
katalog, strony sprzedażowe, kreator i audyt; Tutor LMS i WooCommerce biorą
konta, koszyk, płatności, faktury i dostęp do materiału za logowaniem.

> [!IMPORTANT]
> **Pliki źródłowe NIE leżą w repozytorium — zostają lokalnie.** To 947
> plików i 9,6 MB, a git przechowuje każdą wersję na stałe, więc raz
> wpuszczone ciążyłyby każdemu klonowaniu już zawsze. Do repo idzie to, co
> czyni źródła weryfikowalnymi: ten opis i skrypt odtwarzający komplet.
>
> **Odtworzenie po świeżym klonie** (~20 min; idempotentne — pomija to, co
> już jest, więc przerwane pobieranie wznawia się bez strat):
> ```bash
> node tools/pobierz-dokumentacje-wp.mjs
> ```
> Pilnuje tego `straznik-wagi-dokumentacji`: masa dokumentacji nie ma prawa
> trafić do gita nawet przez `git add -f`, a katalogi, które ten skrypt
> zapowiada, muszą pozostać ignorowane.

## Co pobieramy

| Katalog | Źródło | Sposób pobrania | Plików |
|---|---|---|---|
| `wp-wtyczki/` | [Plugin Handbook](https://developer.wordpress.org/plugins/) | REST WordPressa (`wp/v2/plugin-handbook`) → HTML na markdown | **101** (komplet) |
| `wp-motywy/` | [Theme Handbook](https://developer.wordpress.org/themes/) | REST (`wp/v2/theme-handbook`) | **138** (komplet; 1 strona pusta u wydawcy) |
| `wp-api/` | [Common APIs Handbook](https://developer.wordpress.org/apis/) | REST (`wp/v2/apis-handbook`) | **45** (komplet) |
| `wp-rest/` | [REST API Handbook](https://developer.wordpress.org/rest-api/) | REST (`wp/v2/rest-api-handbook`) | **62** (komplet) |
| `wp-standardy/` | [Coding Standards](https://developer.wordpress.org/coding-standards/) | REST (`wp/v2/wpcs-handbook`) | **13** (komplet) |
| `wp-bloki/` | [Block Editor Handbook](https://developer.wordpress.org/block-editor/) | REST (`wp/v2/blocks-handbook`) | **50** z 572 — zakres niżej |
| `wp-referencja/` | [Code Reference](https://developer.wordpress.org/reference/) | strony HTML → markdown | **102** z ponad 3600 — zakres niżej |
| `woocommerce/` | [dokumentacja dewelopera WooCommerce](https://developer.woocommerce.com/docs/) | markdown wprost z monorepo `woocommerce/woocommerce` (`docs/**.md`) | **216** z 297 — zakres niżej |
| `tutor-lms/` | [dokumentacja Tutor LMS](https://docs.themeum.com/tutor-lms/) | REST (`wp/v2/docs`, filtr po adresie) | **170** z 277 — zakres niżej |
| `mysql/` | [MySQL 8.4 Reference Manual](https://dev.mysql.com/doc/refman/8.4/en/) | strony HTML → markdown, lista stron w skrypcie | **50** (wybór) |

Razem **947** plików, 9,6 MB.

### Trzy kanały, bo wydawcy publikują różnie

1. **REST API WordPressa.** `developer.wordpress.org` i `docs.themeum.com`
   same stoją na WordPressie, więc oddają podręczniki przez
   `/wp-json/wp/v2/<typ>`. To kanał oficjalny, nie scraping — bierzemy
   `content.rendered` i zamieniamy HTML na markdown.
2. **Repozytorium GitHuba.** WooCommerce trzyma dokumentację dewelopera
   w monorepo jako gotowy markdown — bez konwersji, bez strat.
3. **Zwykły HTML.** Manual MySQL-a i Code Reference nie mają innego kanału
   (typy `wp-parser-*` w REST oddają tytuł i odsyłacz, ale **nie mają pola
   `content`** — sprawdzone). Z każdej strony wycinany jest sam artykuł,
   reszta to powtórzone menu i stopka.

## Zakresy — co odpadło i dlaczego

### Block Editor Handbook: 50 z 572

Nie budujemy bloków w JavaScripcie. Potrzebna jest warstwa, przez którą
wtyczka **dziedziczy wygląd motywu** — bo wymóg właściciela brzmi
„wtyczka ma się dopasowywać do strony, nie stawiać obok drugiego świata".

**W zakresie:** `theme-json-reference` (theme.json i style globalne),
`block-api`, `filters`, `getting-started/fundamentals`,
`how-to-guides/themes`, `curating-the-editor-experience`,
`enqueueing-assets-in-the-editor`.

| Odrzucone | Stron | Dlaczego |
|---|---|---|
| `reference-guides/components` | 131 | biblioteka komponentów React edytora — my renderujemy PHP-em |
| `reference-guides/core-blocks` | 129 | katalog bloków rdzenia; wtyczka ich nie definiuje |
| `reference-guides/packages` | 127 | API paczek `@wordpress/*` dla wtyczek pisanych w JS |
| `contributors/*` | 28 | jak współtworzyć Gutenberga — nie nasza rola |
| `data`, `slotfills`, `interactivity-api`, `explanations/architecture` | ~52 | wnętrzności edytora; wracamy po nie, gdy kreator pójdzie na bloki |

### Code Reference: 102 hasła z ponad 3600

Przy pisaniu PHP liczy się DOKŁADNA sygnatura, lista parametrów
i wartości domyślne — nie ogólne wrażenie, że „coś takiego istnieje".
Bierzemy więc imiennie to, czego wtyczka użyje, i **lista rośnie razem
z kodem**: klasa `wpdb`, 88 funkcji i 13 haków, pogrupowanych w skrypcie
tak, jak działy prototypu (własne tabele i audyt → D2, jedyny kanał zapisu
i REST → D3, uprawnienia i sanitizacja → krok 2 planu, trasy i szablony →
D4/D5, kokpit kreatora → D6). Strona hasła niesie też ŹRÓDŁO funkcji
i uwagi społeczności — przy `dbDelta()` to właśnie one opisują słynne
wymagania formatowania zapytań.

### WooCommerce: 216 z 297

**W zakresie:** `getting-started`, `apis`, `best-practices`,
`code-snippets`, `extensions`, `features`, `theming`, `wc-cli`.

| Odrzucone | Plików | Dlaczego |
|---|---|---|
| `block-development` | 43 | bloki koszyka i kasy — Woo odpowiada za kasę, my jej nie przerabiamy |
| `contribution` | 30 | jak współtworzyć WooCommerce |
| `woo-marketplace`, `_docu-tools` | 8 | sprzedaż rozszerzeń w sklepie Woo i narzędzia do dokumentacji |

`wc-cli` zostaje świadomie: migracja treści z PostgreSQL do MySQL
(dwa kursy, 91 lekcji) pójdzie skryptem, a WP-CLI jest do tego najkrótszą
drogą.

### Tutor LMS: 170 z 277

**W zakresie:** dokumentacja dewelopera, ustawienia, budowa kursu, własna
sprzedaż i bramki płatności, migracja, dodatki, poradniki, rozwiązywanie
problemów, menu i szablony — plus integracja z **WooCommerce**, bo na niej
stoi cała sprzedaż.

| Odrzucone | Stron | Dlaczego |
|---|---|---|
| `third-party-integration/*` bez WooCommerce | 86 | Elementor, Divi i inne page buildery, których nie używamy |
| `kirki-integration` | 8 | elementy personalizacji pod bibliotekę, której nie mamy |
| strony-rozdzielacze | 13 | puste u wydawcy (sama gałąź spisu treści) — skrypt liczy je osobno, nie jako błąd |

### MySQL: 50 stron

Wybór pod przeniesienie schematu z PostgreSQL: typy danych, kodowanie
(`utf8mb4` — polskie znaki), indeksy, klucze obce, transakcje i poziomy
izolacji, **wyzwalacze** (odpowiednik audytu `course_changelog` z Działu 2)
oraz `CREATE`/`ALTER TABLE` i InnoDB. Lista slugów stoi w skrypcie.
Wersja 8.4 to bieżące LTS; dla tych rozdziałów 8.0 i MariaDB nie różnią się
w sposób, który zmieniałby projekt schematu.

## Świadomie poza zakresem

| Czego nie ma | Dlaczego |
|---|---|
| WP-CLI Handbook (`make.wordpress.org/cli`) | do migracji wystarcza `wc-cli` z WooCommerce; dobierzemy, gdy skrypt migracyjny tego zażąda |
| Advanced Administration Handbook | sprawy serwera i hostingu — nie warstwa wtyczki |
| Playground Handbook, SCF Handbook | nie używamy ani Playgrounda, ani Secure Custom Fields |
| motyw Automatic AI | konwersję ma kolega z zespołu; do czasu jej otrzymania projektujemy agnostycznie wobec motywu i testujemy na `twentytwentyfive` (blokowy) oraz `kredyt-kompas` (klasyczny) |

## Zasady użycia

1. Kod wtyczki powstaje z plików tego katalogu, nie z pamięci modelu.
   Gdy czegoś tu nie ma — najpierw dopobieramy (dopisując zakres do skryptu
   i do tej tabeli), potem piszemy.
2. Fragmenty faktycznie przywoływane przez decyzje projektowe kopiujemy do
   podkatalogu `cytowane/` — ten JEST w repozytorium, żeby dało się
   sprawdzić zgodność bez pobierania całości.
3. Dokumentacja to migawka z daty pobrania. Przy większej zmianie
   w projekcie wtyczki odświeżyć pliki i datę w tej tabeli.
4. Zakres jest zapisany KODEM w
   [tools/pobierz-dokumentacje-wp.mjs](../../../tools/pobierz-dokumentacje-wp.mjs),
   więc rozszerzenie = dopisanie sekcji i ponowne uruchomienie skryptu.
