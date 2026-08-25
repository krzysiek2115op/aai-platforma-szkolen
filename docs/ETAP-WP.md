# Etap WordPress — ustalenia z rozmowy 2026-08-19

Dokument powstał, bo dwie nasze własne decyzje z 2026-08-18 stały ze sobą
w sprzeczności, a rozmowa nie jest nośnikiem trwałym:

- „sklep zostanie **przepisany 1:1 na wtyczkę WP**" (PLAN.md, decyzja zespołu),
- „materiał **nie będzie hostowany własnym kodem**, do rozważenia gotowy LMS"
  (CLAUDE.md, ten sam dzień, wieczorem).

Jeśli LMS bierze konta, sprzedaż i dostęp do materiału, to przepisywanie
CRUD-a na PHP dublowałoby funkcje, które LMS ma z pudełka — razem
z polskimi fakturami i płatnościami, których Plugin 2 nawet nie zaczął.
Rozmowa rozstrzygnęła to podziałem odpowiedzialności (niżej).

## Decyzje właściciela (2026-08-19)

1. **Wszystko na WordPressie.** Strona główna Automatic AI **jest już
   przekonwertowana na WP** i tam będzie docelowo hostowana (hosting
   + domena, nie VPS/Node). **Doprecyzowanie 2026-08-19:** konwersję
   zrobił kolega z zespołu i ma ją u siebie lokalnie — **my jej nie
   mamy** ani w repo, ani na dysku. To nie zmienia kierunku, zmienia
   kolejność pracy (patrz „Praca bez dostępu do motywu").
2. **Podstrona `/szkolenia` to WTYCZKA do tej strony.** Po wpięciu
   wtyczki w menu pojawia się pozycja „Szkolenia", a pod nią katalog,
   strony sprzedażowe i e-booki. Wtyczka ma się **dopasowywać** do
   strony — wchodzi w istniejący wygląd, nie stawia obok drugiego świata.
   Tą samą drogą dołączą pozostałe moduły (Plugin 2 — płatności,
   Plugin 3 — panel): **cała automatyzacja jako wtyczki jednej instalacji.**
3. **Podział odpowiedzialności (hybryda), a nie przepisywanie wszystkiego.**
   Nasz kod renderuje to, w co włożyliśmy 29 wydań pracy (katalog, strony
   sprzedażowe, kreator treści); gotowy LMS bierze to, czego nie mamy
   wcale (konta, koszyk, płatności, faktury, dostęp za logowaniem).
4. **LMS pierwszego wyboru: Tutor LMS (darmowy core) + WooCommerce.**
   Plan B: **Publigo BOX** — 1797 zł netto (PLUS) / 2997 zł (PRO)
   jednorazowo, polskie faktury (Fakturownia/wFirma/iFirma) i płatności
   (Tpay/PayU/P24/BLIK) w komplecie, 15 dni testów. Publigo **GO**
   (87–297 zł/mies.) odpada z góry: nie pozwala wgrywać własnych wtyczek,
   więc nasza wtyczka nie miałaby jak tam wejść.
5. **Kolejność: dokumentacja i research TERAZ, kod po kursach.**
   Etap WP nie czeka bezczynnie na krok 3, ale kodu wtyczki nie piszemy,
   zanim właściciel nie oceni gotowych kursów (bramka B7).

## Decyzje właściciela (2026-08-25) — START etapu WP

Rozmowa otwierająca etap. Właściciel doprecyzował architekturę całości i zamknął
pytania, które ten dokument trzymał otwarte od 2026-08-19. **Te decyzje mają
pierwszeństwo przed wcześniejszymi zapisami w tym pliku**; miejsca, które
przestały być prawdziwe, są niżej poprawione, a nie zostawione do domyślenia.

### Architektura całości

**Strona Automatic AI = MOTYW. Nasza praca = TRZY WTYCZKI do tego motywu:**

| Wtyczka | Zakres |
|---|---|
| **Plugin 1 — sklep z kursami** | katalog `/szkolenia`, strony sprzedażowe, kreator treści, audyt |
| **Plugin 2 — płatności** | warstwa sprzedaży i dostawy na styku z WooCommerce |
| **Plugin 3 — panel admina** | panel, monitoring, `page_visits` |

1. **Hybryda z 2026-08-19 ZOSTAJE**: Tutor LMS bierze konta i dostęp do
   materiału, WooCommerce koszyk, płatności i faktury. Nasze wtyczki nie
   przepisują tego, co te dwie mają z pudełka.
2. **Każda wtyczka ma własny komplet tabel z WŁASNYM PREFIKSEM** w bazie
   WordPressa (nie osobne bazy MySQL). Izolacja logiczna zostaje — jedna
   wtyczka nie dotyka cudzych tabel — ale działają transakcje, `JOIN`
   z `wp_users`/`wp_posts`, `dbDelta`, jeden backup i standardowy `$wpdb`.
   To rozstrzyga, co znaczy „trzy moduły, trzy bazy" z PLAN.md w realiach WP.
3. **Kod trzech wtyczek żyje w TYM repo**, w katalogu `wordpress/`. Prototyp
   Next.js zostaje obok jako specyfikacja wykonawcza i źródło treści.
4. **Kolejność: 1 → 2 → 3.** Po każdej wtyczce test ręczny na lokalnym WP
   z motywem Automatic AI; **wtyczka nie jest skończona, dopóki nie przejdzie
   tego testu** — znalezione usterki poprawiamy przed przejściem dalej.
   Na samym końcu, gdy stoją wszystkie trzy, dochodzi test całości: czy
   współpracują i czy projekt ma sens architektoniczny.
5. **Środowisko stawiamy OD RAZU**, nie po napisaniu kodu.

### Plugin 1 — czego właściciel wymaga wprost

- **Po wpięciu wtyczki pozycja „Szkolenia" ma pojawić się w menu strony
  automatycznie** — bez ręcznego dłubania w motywie.
- **Adresy zostają jak w prototypie**: `/szkolenia` (katalog) →
  `/szkolenia/<slug>` (strona sprzedażowa kursu). Strona kursu jest
  podstroną katalogu, tak jak dziś lokalnie i w publicznym podglądzie.

### Źródło prawdy o kursie: NASZE TABELE, do Tutora idzie kopia

Kreator z D6 zostaje nasz co do pola (12 rodzajów sekcji, program, treść lekcji,
audyt zmian), a przy publikacji wtyczka **synchronizuje kurs do wpisów Tutora** —
tak, jak robi to już `wordpress/import-kursy.php` (87 obiektów, treść zgodna co
do znaku, klucz `_aai_zrodlo_uuid`, idempotentnie).

**Uczciwie o koszcie tej decyzji:** są wtedy dwie kopie treści. Synchronizacja
musi być **jednokierunkowa** (nasze tabele → Tutor, nigdy odwrotnie) i pilnowana
strażnikiem zgodności, inaczej rozjadą się po cichu — a to jest dokładnie ta
klasa błędu, która w tym projekcie kosztowała najwięcej (BLAD-015, znalezisko #1
przeglądu B7).

### Widok lekcji: NASZE szablony w miejsce Tutorowych

Wygląd z 0.34.0 (przyjęty przez właściciela) przenosimy do szablonów Tutora
(`tutor/templates/`). Po to został wyjęty do `tools/podglad-kursow/` jako CSS
i szablony, a nie komponenty Reacta. Klient ma widzieć jeden świat od katalogu
po lekcję. Koszt: przy dużych aktualizacjach Tutora szablony trzeba przejrzeć.

### Pozycja „Szkolenia" w menu: na razie podmiana nagłówka w locie

Z pięciu dróg (tabela w rozdziale o motywie) właściciel wybrał **drogę 4** —
wtyczka przechwytuje wyjście nagłówka i wstrzykuje pozycję przed `</nav>`.
Powód: nie wymaga niczyjej zgody i działa od razu, a etap i tak zaczyna się od
postawienia lokalnego WP, gdzie **sprawdzimy na żywo, czy wpięcie działa
i czy podstrona się tworzy**.

**Ta droga jest krucha i wiemy o tym**: motyw jest generowany, więc regeneracja
zmieni klasy Tailwinda i pozycja może zniknąć PO CICHU. Dlatego wchodzi razem
ze **strażnikiem**, który sprawdza, że pozycja naprawdę jest w wyjściowym HTML —
ochrona, której brak nie objawia się błędem, to w tym repo powód do strażnika,
nie do notatki. Droga 2 (hak `do_action` w generatorze motywu) zostaje jako
rekomendacja na wdrożenie, gdyby podmiana nie utrzymała się między regeneracjami.

### E-BOOKI: NIGDY. Decyzja na zawsze

**Nie będzie żadnych e-booków ani PDF-ów jako produktu ani jako dodatku.**
To zamyka pytanie otwarte nr 5 tego dokumentu i **unieważnia wcześniejszy zapis
o PDF jako dodatku do pobrania** (PRODUKCJA-MATERIALU-KROK-3.md, 2026-08-19).

Produktem jest **wyłącznie kurs tekstowy na platformie za logowaniem**. Stan
bazy już to potwierdza: 2 kursy typu `kurs`, zero typu `ebook`, zero materiałów
dodatkowych na 73 lekcjach — więc nic nie trzeba usuwać z treści, a strony
sprzedażowe niczego takiego nie obiecują (sprawdzone zapytaniem, nie z pamięci).

### Mail po zakupie: link do ustawienia hasła, NIE hasło w treści

Klient dostaje **jedną wiadomość w stylu premium Automatic AI**: powitanie, co
dokładnie kupił, mini instrukcja co gdzie kliknąć, i jeden duży przycisk
**Ustaw hasło i wejdź do kursu** (link jednorazowy). Klika, ustawia własne
hasło, ląduje w kursie.

Właściciel chciał pierwotnie hasła wprost w treści maila; po przedstawieniu
zagrożenia (hasło zostaje w skrzynce bezterminowo, idzie przez serwery poczty
otwartym tekstem, wraca przy każdym przeszukaniu skrzynki) **wybrał wariant
z linkiem**. Dla klienta to nawet mniej pracy niż przepisywanie hasła.
To potwierdza — a nie zmienia — zapis z 2026-08-20 o niewysyłaniu haseł mailem.

## Podział odpowiedzialności

| Obszar | Kto | Dlaczego tak |
|---|---|---|
| Katalog `/szkolenia`, strony sprzedażowe | **nasza wtyczka** | tu leży design premium i kontrakty sekcji z D5/D6 — to jest nasz wkład, nie CRUD |
| Kreator treści (kurs, program, sekcje) | **nasza wtyczka** | panel właściciela, strażnik rozjazdu kontrakt ↔ panel; w WP: ekran w kokpicie + REST/admin-ajax |
| Treść lekcji za logowaniem, postęp | **Tutor LMS** | konta, ograniczenie dostępu, postęp — gotowe i utrzymywane |
| Koszyk, płatności, faktury | **WooCommerce + wtyczka faktur** | polskie prawo podatkowe; tego nie piszemy sami |
| ~~E-booki / PDF (dodatki)~~ | — | **skreślone 2026-08-25: e-booków ani PDF-ów nie będzie nigdy** |
| Audyt zmian treści | **nasza wtyczka** | własne tabele + logika audytu, odpowiednik `course_changelog` z D2 |

## Co zostaje z prototypu Next.js

- **Specyfikacja wykonawcza**: design, kontrakty treści sekcji, przepływ
  BAZA → DZIAŁ → STRONA, jeden kanał zapisu, strażnicy, goldeny, testy.
  Wersja WP ma odtworzyć zachowanie, nie kod.
- **Treść to dane**: 2 kursy z bazy PostgreSQL → MySQL skryptem
  migracyjnym (jednorazowo, idempotentnie — wzorzec z `mp-test-env`).
- **Zabezpieczenia z kroku 2 mają odpowiedniki w WP**, nie znikają:
  CSP nagłówkiem, ograniczanie tempa (nośnik: baza albo obiekt cache WP),
  limity wejścia w sanitizacji, generyczne komunikaty błędów,
  nonce WP + `current_user_can()` zamiast tokenu z `.env`.

## Wzorce, które MAMY lokalnie (nie zaczynamy od zera)

| Ścieżka | Co daje |
|---|---|
| `/home/krzysiek/mp-test-env` | **najważniejszy wzorzec**: nasze własne środowisko WP z wtyczkami `mp-*` (`mp-sales-workflow` ma pełną strukturę: `blueprint/`, `docs/`, `includes/`, `uninstall.php`, `readme.txt`), zainstalowany WooCommerce, worktree `wt-p1`/`wt-p2`/`wt-audyt`, katalogi `narzedzia/` i `testy/` |
| `/home/krzysiek/zlecenia stron internetowych/czarodziejski-dworek/wordpress` | motyw WP + `PACZKA-DLA-KLIENTA` + `blueprint.json` — wzorzec oddania projektu klientowi |
| `/home/krzysiek/kredyt-kompas-wp` | `wp-content` + `blueprint.json` + `build-parts.py` |

> **Korekta zapisu:** CLAUDE.md do 2026-08-19 twierdził, że ściąga WP leży
> „w katalogu `wordpress/` w repo strony głównej". Tam **nie ma** takiego
> katalogu — sprawdzone. Ściągi są w projektach wymienionych wyżej.

## Pytania otwarte — do rozstrzygnięcia przed pisaniem kodu

1. ~~Jak zdobyć motyw strony głównej?~~ **MAMY GO 2026-08-20** — kolega
   z zespołu wypchnął całą konwersję do repo `MatthewPlugins/automatic-ai`,
   gałąź `main`, katalog `wordpress/`. Szczegóły i konsekwencje: sekcja
   „Motyw Automatic AI" niżej.
2. ~~Motyw blokowy (FSE) czy klasyczny?~~ **KLASYCZNY** — `header.php`,
   `footer.php`, `front-page.php`, `page.php`, zero `theme.json`
   i zero `templates/`. Wtyczka przechwytuje `template_include`.
3. ~~Co znaczy „dopasowuje się do strony"?~~ **Własny arkusz wtyczki
   z tymi samymi wartościami** — nie dziedziczenie, bo nie ma czego
   dziedziczyć: motyw nie ma `theme.json`, a jego CSS to skompilowany
   Tailwind (157 zmiennych, wszystkie `--tw-*`, czyli wewnętrzne
   Tailwinda, nie tokeny designu). Uzasadnienie niżej.
4. ~~Tutor LMS na realnej treści~~ **SPRAWDZONE 2026-08-19** — uniesie
   (59 kB lekcja renderuje się w 6,6 ms, cały Kurs 2 wszedł bez ubytku),
   da się ostylować (własne zmienne `--tutor-*` + szablony do nadpisania),
   dostęp za logowaniem działa z pudełka. Liczby: sekcja „Tutor LMS na
   realnej treści" niżej. Zostaje ścieżka zakupu przez WooCommerce.
5. ~~Czy e-booki są osobnym produktem, czy dodatkiem do kursu~~
   **ZAMKNIĘTE 2026-08-25: nie będzie ani jednego, ani drugiego.** Produktem
   jest wyłącznie kurs tekstowy za logowaniem — decyzja właściciela na zawsze,
   sekcja E-BOOKI: NIGDY wyżej.

### Jak wygląda dostarczenie kursu po zakupie (odpowiedź udzielona 2026-08-20)

Właściciel zapytał, czy po zakupie idzie PDF na maila plus link i hasło.
Odpowiedź z zapisanych decyzji, żeby nie wyprowadzać jej od nowa:

- **Hasła NIE wysyłamy mailem.** Kupujący zakłada konto przy kasie
  WooCommerce i sam ustawia hasło (albo dostaje link do jego ustawienia).
- Po zaksięgowaniu płatności WooCommerce zapisuje go na kurs w Tutorze,
  a mail po zakupie niesie potwierdzenie, fakturę i link „przejdź do
  kursu". Materiał czyta **za logowaniem**, nie z załącznika.
- ~~PDF to dodatek do pobrania~~ — **nieaktualne od 2026-08-25**: nie będzie
  żadnych PDF-ów ani e-booków. Mail niesie powitanie, mini instrukcję i jeden
  przycisk do ustawienia hasła; materiał czyta się wyłącznie za logowaniem.

**Czego jeszcze NIE sprawdziliśmy:** ścieżki „zapłata → automatyczny
zapis na kurs" na naszym środowisku. Pomiar z 2026-08-19 potwierdził
tylko, że Tutor unosi długie lekcje i że dostęp za logowaniem działa
z pudełka. Komenda generująca PDF też jeszcze nie istnieje.

## Praca bez dostępu do motywu (ustalenie 2026-08-19)

> **Nieaktualne od 2026-08-20 — motyw mamy** (sekcja „Motyw Automatic AI").
> Sekcja zostaje, bo jej rozstrzygnięcia dalej obowiązują: wtyczka ma być
> agnostyczna wobec motywu i testowana na dwóch rodzajach naraz. Jeden
> wiersz tabeli okazał się nieprawdziwy i jest poprawiony niżej.

Nie czekamy z założonymi rękami — projektujemy wtyczkę **agnostycznie
wobec motywu**, żeby wpięcie u kolegi było wpięciem, a nie przepisywaniem:

| Warstwa | Czy zależy od motywu | Co robimy teraz |
|---|---|---|
| Dokumentacja WP, `$wpdb`, własne tabele, audyt | **nie** | robimy od razu |
| Kontrakty treści, migracja Postgres → MySQL | **nie** | robimy od razu |
| Kreator w kokpicie WP (ekran + REST/nonce) | **nie** | kokpit ma własny wygląd, niezależny od motywu frontu |
| Szablony katalogu i stron sprzedażowych | **tak** | własne style z fallbackiem; jeśli motyw ma `theme.json`, dziedziczymy jego zmienne (kolory, typografia, odstępy) |
| Pozycja „Szkolenia" w menu | **TAK — i to bardziej, niż sądziliśmy** | ~~standardowe API WP~~ **nieprawda dla tego motywu**: nawigacja jest wpisana na sztywno w `header.php`, bez `wp_nav_menu()`. Pozycja wchodzi zmianą w źródle Next.js + regeneracją motywu — patrz „Motyw Automatic AI" |

**Warunek bezpieczeństwa: testujemy na DWÓCH rodzajach motywu naraz.**
W `mp-test-env` są już oba: `twentytwentyfive` (blokowy, FSE) oraz
`kredyt-kompas` (klasyczny). Wtyczka, która wygląda poprawnie na obu,
wejdzie w motyw Automatic AI bez niespodzianek — a jeśli nie wejdzie,
zobaczymy to na własnym środowisku, nie na produkcji kolegi.

## Motyw Automatic AI — mamy go (2026-08-20)

Kolega z zespołu wypchnął całą konwersję: **repo `MatthewPlugins/automatic-ai`,
gałąź `main`, katalog `wordpress/`** — motyw, treść i skrypty (216 plików,
6,1 MB). To **koryguje zapis z 2026-08-19**, że takiego katalogu tam nie ma:
wtedy faktycznie go nie było, teraz jest.

> Repo strony głównej pozostaje **tylko do odczytu** (WYTYCZNE, zakaz po
> BLAD-007 — także dla zmian niecommitowanych). Motyw bierzemy przez
> sparse checkout do katalogu roboczego; lokalnego klonu nie dotykamy.

### Co tam leży

| Ścieżka | Co to |
|---|---|
| `wp/theme/automatic-ai/` | motyw: `header.php`, `footer.php`, `front-page.php` (80 kB), `functions.php`, `index.php`, `page.php`, `style.css`, `static/` |
| `import/*.json` | treść strony wyeksportowana z builda (strony, wpisy, blog, menu) |
| `skrypty/` | `start.sh` (Docker: WP + MariaDB, `:8890`), importy PHP, eksport statyczny, **`generuj-motyw.mjs`** |
| `docker-compose.yml`, `README.md` | warsztat i instrukcja |

### Osiem faktów, które przesądzają o projekcie wtyczki

1. **Motyw jest KLASYCZNY.** `index.php` i `page.php` to dosłownie
   `get_header()` → `<main id="tresc">` → `get_footer()`. Nasza wtyczka
   wchodzi przez `template_include` i renderuje własny `<main>` — dokładnie
   tak, jak `/szkolenia` działa dziś w prototypie.
2. **Motyw jest GENEROWANY** przez `skrypty/generuj-motyw.mjs` z builda
   Next.js, a `style.css` mówi wprost: *„nie edytować ręcznie"*. Cokolwiek
   dopiszemy do motywu, zniknie przy następnej regeneracji — **wszystko musi
   siedzieć we wtyczce**.
3. **Nie ma `theme.json`.** Nie ma więc presetów `--wp--preset--*` do
   dziedziczenia, a `functions.php` dodatkowo robi
   `wp_dequeue_style('global-styles')`.
4. **CSS to skompilowany Tailwind** (jeden chunk, 87 kB): 157 zmiennych,
   wszystkie `--tw-*` — czyli wewnętrzne zmienne Tailwinda, nie tokeny
   designu. Tailwind emituje reguły **tylko dla klas użytych w źródle**,
   więc wtyczka nie może „użyć klas motywu": klasy, której nie ma na stronie
   głównej, po prostu nie ma w arkuszu. **Wniosek: wtyczka wnosi własny
   arkusz**, a „dopasowanie" znaczy te same wartości (kolory, typografia,
   promienie, cienie), nie wspólny mechanizm.
5. **Nawigacja jest wpisana na sztywno w `header.php`** — zero
   `wp_nav_menu()`, zero `register_nav_menu()`. To **obala wcześniejszy zapis
   z tabeli „Praca bez dostępu do motywu"**, że pozycję w menu doda
   standardowe API WP. Nie doda. Pozycja „Szkolenia" wymaga zmiany
   w **źródle Next.js** i regeneracji motywu — czyli prośby do kolegi albo
   PR-a do repo strony głównej, nie kodu w naszej wtyczce. Pięć możliwych
   dróg z oceną: sekcja „Pozycja »Szkolenia« w menu" na końcu rozdziału.
6. **Motyw przejmuje SEO i `<head>`**: usuwa `rel_canonical`, `wp_shortlink`,
   ustawia własny tytuł przez `pre_get_document_title`, a kanoniki i Open
   Graph wypycha z post meta `_aai_*`. Nasze strony kursów **nie dostaną
   kanonika od WordPressa** — wtyczka musi go dodać sama (mamy to gotowe
   z kroku 1: `lib/seo.ts`, kanoniki, OG, JSON-LD).
7. **Motyw usuwa `wpautop` i `wptexturize`** z `the_content`. Treść lekcji
   z naszego kreatora musi wejść jako **gotowy HTML** — puste linie nie zamienią
   się w akapity.

Dobra wiadomość: `wp_head()` jest na miejscu, a struktura
`get_header()` / `<main>` / `get_footer()` jest dokładnie tym, czego
potrzebuje wtyczka renderująca własne strony.

8. **Motyw trzyma CAŁY swój CSS w WARSTWACH kaskady, a wtyczki nie.**
   To Tailwind 4: `@layer properties, theme, base, components, utilities`.
   Arkusze Tutora i WooCommerce są poza warstwami, a w kaskadzie CSS
   **reguła bez warstwy bije każdą regułę w warstwie** — niezależnie od
   specyficzności I od kolejności ładowania. Na stronie, gdzie CSS Tutora
   jest obecny, **każda jego reguła wygrywa z każdą klasą motywu**, choć
   motyw ładuje się ostatni.

   Konsekwencje, wszystkie zmierzone (2026-08-25, wersja 0.40.0):

   * to jest prawdziwy powód kolizji `.text-label` z 0.38.0 — nie
     kolejność i nie specyficzność. Tamta naprawa (zdjęcie CSS-u Tutora
     ze stron motywu) działa tylko tam, gdzie wolno go zdjąć; **na
     własnych stronach Tutora kolizja żyła dalej** i malowała na jasno
     nagłówek oraz stopkę motywu;
   * nadpisanie z naszej wtyczki musi być **poza warstwami** (jest) — ale
     wtedy bije też klasy motywu, więc do przywrócenia jego wartości
     służy `revert-layer`, nie przepisywanie ich ręcznie;
   * **nasze strony w W3 są bezpieczne dopóki nie ładują CSS-u Tutora**
     — tego pilnuje `Aai_Sklep_Zasoby`. Gdyby kiedyś musiały, obowiązuje
     ta sama reguła co wyżej.

   Do tego motyw ma nagłówek `position: fixed` (72 px) i **nie rezerwuje
   pod niego miejsca**: jego własne strony robią to same (`pt-28`,
   `md:pt-36`). Każdy szablon spoza motywu — Tutora i **nasz** — musi
   dodać ten odstęp sam, inaczej treść wjeżdża pod nawigację.

### Tutor LMS na PRAWDZIWYM motywie — sprawdzone

Motyw wgrany do naszego środowiska oceny (obok `twentytwentyfive`
i `twentytwentyone`) i włączony:

| Strona | Wynik |
|---|---|
| strona kursu (50 lekcji) | HTTP 200, 111 kB, **0,096 s** |
| lekcja 59 kB, zalogowany | HTTP 200, 192 kB, **0,136 s**, treść widoczna |
| nawigacja Automatic AI na stronie kursu | **jest** — Tutor renderuje się wewnątrz motywu |
| arkusze | motyw + trzy arkusze Tutora obok siebie |

**Ale zrzuty pokazują dwie różne sytuacje** — i to jest najważniejszy wniosek
tego dnia:

![strona kursu Tutora na motywie Automatic AI](zrzuty/tutor-na-motywie-kurs.png)

**Strona kursu** wchodzi w motyw i tam się z nim **gryzie**: Automatic AI jest
ciemny, a Tutor wstawia jasne karty („Free / Enroll Now", program, placeholder
okładki) i ciemny tekst nagłówków, który na ciemnym tle prawie znika. Interfejs
jest po angielsku. To jednak **teren naszej wtyczki** — katalog i strony
sprzedażowe robimy sami, więc tej strony Tutora po prostu nie użyjemy.

![widok lekcji Tutora](zrzuty/tutor-na-motywie-lekcja.png)

**Widok lekcji za logowaniem to osobny, pełnoekranowy ekran Tutora** — nie
wchodzi w motyw wcale (brak nagłówka Automatic AI) i dzięki temu jest spójny
sam w sobie: pasek z tytułem kursu, panel programu z 7 modułami, treść,
Previous/Next. **Nasza treść renderuje się w nim poprawnie.** To teren Tutora
i tam jego wygląd jest do zaakceptowania — do dociągnięcia zmiennymi
`--tutor-*` i tłumaczeniem interfejsu.

> **Uczciwie o zrzucie lekcji:** gołe gwiazdki i akapit-na-linię to usterka
> mojego prowizorycznego konwertera Markdown → HTML użytego do wrzucenia
> treści (wytłuszczenie przez wiele linii, `<p>` na każdą linię), **nie wina
> Tutora**. Docelowo treść przychodzi z naszego kreatora jako gotowy HTML.

Do wyłączenia przy wdrożeniu: onboardingowy modal Tutora („Take the Tour")
zasłaniający materiał przy pierwszym wejściu.

### Co z tego wynika dla podziału odpowiedzialności

Podział z tego dokumentu **broni się na dowodach**: strony sprzedażowe i katalog
zostają nasze (bo tam Tutor nie pasuje wizualnie i tak czy owak nie ma tam nic,
czego byśmy nie mieli lepiej), a materiał za logowaniem bierze Tutor (bo tam ma
własny, spójny ekran, konta i ograniczenie dostępu z pudełka).

### Pozycja „Szkolenia" w menu — pięć dróg (2026-08-21)

W tym motywie WordPress nie ma się gdzie wpiąć: jedyny hak w całym
`header.php` to `wp_head()` — zero `wp_nav_menu()`, zero `wp_body_open()`,
zero `do_action`/`apply_filters` w okolicy nawigacji. Filtr
`wp_nav_menu_items`, którym wtyczka normalnie dokłada pozycję, odpala się
tylko wtedy, gdy motyw woła `wp_nav_menu()` — a ten nie woła. Stąd pięć
realnych dróg:

| Droga | Ocena |
|---|---|
| 1. Zmiana w źródle Next.js + regeneracja motywu | czysto i trwale, ale to zmiana w cudzym repo (u nas read-only) — i każdy kolejny moduł znaczy kolejną prośbę |
| 2. **Jednorazowy hak w generatorze**: `do_action('aai_nawigacja_dodatkowa')` przed `</nav>` (w headerze i w szablonie menu mobilnego) | **REKOMENDACJA** — jedna drobna prośba do kolegi, po której każdy nasz moduł (Plugin 1–3) dokłada pozycję własnym kodem, bez wracania do repo głównego |
| 3. Motyw-dziecko nadpisujący `header.php` | przesuwa problem zamiast go rozwiązać: motyw jest generowany, więc każda regeneracja rodzica = ręczne przenoszenie zmian do dziecka |
| 4. Bufor wyjścia (`ob_start`) i podmiana HTML nagłówka we wtyczce | bez ruszania repo głównego, ale kruche — regeneracja zmienia klasy Tailwinda i pozycja znika PO CICHU |
| 5. JavaScript dopisujący pozycję do DOM | menu miga przy wczytaniu, gorzej dla SEO i czytników ekranu |

**Wybór drogi jeszcze NIE zapadł** — i nie musi: decyzją właściciela
z 2026-08-17 wejście do `/szkolenia` z paska menu robimy dopiero przy
finalnym wdrożeniu. Do tego czasu podstrona żyje pod własnym adresem.
Droga 2 jest rekomendacją agenta, bo jest w duchu decyzji „cała
automatyzacja jako wtyczki jednej instalacji": raz otwarta furtka
w motywie służy wszystkim trzem pluginom.

### Test finalny wtyczek — na lokalnej kopii strony (decyzja właściciela, 2026-08-21)

Gdy wszystkie wtyczki będą gotowe (Plugin 1 — sklep, Plugin 2 — płatności,
Plugin 3 — panel), testujemy je **także na lokalnym WP z warsztatu
w `wordpress/`** — `bash skrypty/start.sh` stawia tam WP + MariaDB na
`:8890` z motywem Automatic AI i treścią strony 1:1. To najbliższa
produkcji kopia, jaką mamy: prawdziwy motyw, prawdziwa treść, prawdziwe
menu.

Matryca testów się przez to nie kurczy, tylko wydłuża:

1. **w trakcie budowy** — jak dotąd, dwa rodzaje motywu naraz
   (`twentytwentyfive` blokowy + klasyczny): wtyczka zostaje agnostyczna
   wobec motywu;
2. **po komplecie wtyczek** — test całości na lokalnej kopii strony
   (warsztat `wordpress/`), jako ostatnia bramka przed wdrożeniem na
   hosting.

Zastrzeżenie techniczne do sprawdzenia przed testem finalnym: warsztat
zakłada **Dockera** (`docker-compose.yml`, `docker compose run --rm cli`),
a u nas Dockera nie ma — używamy podmana. Albo `podman-compose` łyknie ich
plik, albo stawiamy odpowiednik podmanem (jak środowisko oceny Tutora).

## Tutor LMS na realnej treści — pomiar, nie ulotka (2026-08-19)

Punkt 4 „Pytań otwartych" rozstrzygnięty na dowodach: postawiliśmy lokalnie
WordPressa 7.0.1 z **Tutor LMS 4.0.6 (darmowy core)** i **WooCommerce 11.0.1**,
i wrzuciliśmy **cały Kurs 2 — 7 modułów, 50 lekcji, 1143 kB treści**
(prawdziwe scenariusze z `tresc-kursow/jak-uzywac-githuba/`, nie atrapy).

Środowisko stoi obok istniejących instalacji `mp-test-env`, niczego w nich
nie ruszając: `/home/krzysiek/mp-test-env/wp-tutor/`, kontenery `tutor-wp`
i `tutor-db` (podman, sieć `tutor-net`), adres `http://localhost:8091`,
logowanie `admin` / `admin123`.

### Czy uniesie długie lekcje tekstowe — TAK

| Pomiar | Wynik |
|---|---|
| najdłuższa lekcja (Codespaces) | 59 kB treści, render `the_content` **6,6 ms** |
| ta sama lekcja end-to-end, zalogowany | HTTP 200, 209 kB, **0,32 s** |
| strona kursu z programem 50 lekcji | HTTP 200, 138 kB, **0,89 s** |
| kreator kursu Tutora z 50 lekcjami | HTTP 200, **0,23 s** |
| lista lekcji w kokpicie | HTTP 200, 0,48 s |
| `post_content` w MySQL | `longtext` — sufit 4 GB, nasze 59 kB to 0,001% |
| `max_allowed_packet` | 16 MB (domyślne) — z zapasem na najdłuższą lekcję |

Treść przeżywa filtry WordPressa bez ubytku (59 kB wejścia → 60 kB wyjścia,
16 nagłówków i bloki kodu na miejscu). Tutor widzi **7 modułów i 50 lekcji**,
czyli nasza struktura kurs → moduł → lekcja mapuje się 1:1 na jego
`courses` → `topics` → `lesson`.

**Dostęp za logowaniem działa z pudełka:** gość dostaje stronę lekcji
z HTTP 200, ale **bez treści** — w jej miejscu jest wezwanie do zapisu na
kurs. To dokładnie ta funkcja, której nie mamy wcale i której nie chcemy
pisać sami.

### Czy da się ostylować — TAK, ale nie „samo z siebie"

| Sprawdzone | Wynik |
|---|---|
| motyw blokowy (Twenty Twenty-Five, FSE) | kurs i lekcja renderują się poprawnie |
| motyw klasyczny (Twenty Twenty-One) | to samo, ten sam program (29 znaczników programu w obu) |
| czy Tutor czyta `theme.json` | **NIE** — zero odwołań do `--wp--preset--*` w jego CSS |
| własny system zmiennych | **21 zmiennych `--tutor-*`** (kolory, odstępy, typografia) |
| nadpisywanie szablonów | `tutor/templates/` w motywie (albo filtr ścieżki z naszej wtyczki) |

Wniosek dla wtyczki: Tutor wnosi własny arkusz (`tutor-front.min.css`,
139 kB) i **nie dziedziczy wyglądu motywu automatycznie**. Spięcie z naszym
designem to przemapowanie tokenów na zmienne `--tutor-*` plus nadpisanie
szablonów tam, gdzie układ ma się różnić — robota policzalna, nie przepisywanie
LMS-u. To potwierdza podział odpowiedzialności z tego dokumentu: Tutor bierze
konta i dostęp, wygląd zostaje nasz.

### Czego NIE sprawdzono

- pełnej ścieżki zakupu (WooCommerce → zapis na kurs) — wymaga skonfigurowanej
  bramki i produktu; następny krok po decyzji o LMS,
- zachowania przy wielu kursach i wielu użytkownikach naraz,
- Publigo BOX (plan B) — nie ma darmowej wersji do postawienia obok.

## Krok W3 zrobiony (2026-08-25, wersja 0.41.0) — czego się przy nim nauczyliśmy

`/szkolenia` i `/szkolenia/<slug>` renderuje wtyczka z naszych tabel, pozycja
„Szkolenia" jest w obu nawigacjach motywu, a `/courses/*` oddaje 301 na nasze
adresy. Pełny wykaz zmian: CHANGELOG 0.41.0. Niżej wyłącznie to, co **zmienia
plan dalszych kroków**.

### Ósmy fakt o motywie doczekał się dziewiątego: `.page-enter` ma `transform`

Motyw wpisuje klasę `.page-enter` w HTML swoich stron, a jej klatki animują
`transform` z wypełnieniem `both`. To BLAD-003/004 z prototypu, przyniesione
tym razem przez cudzy arkusz: **przodek z transformacją odbiera potomkom
`position: fixed` ekran jako układ odniesienia**. Nasz `<main>` tej klasy nie
dostaje, ale reguła obowiązuje na przyszłość — **każdy element `fixed` (pigułka
kursu, żywe tło, przyszły panel lekcji z W5) emitujemy POZA `<main>`**. Pilnuje
tego `straznik-frontu-wp` i `smoke-wp-front`.

Do tego `volt.js` przy otwartym menu mobilnym ustawia `inert` na `body > main`
i `body > footer`. Nasze elementy poza `<main>` tego nie dostają, więc ich
`z-index` musi być NIŻSZY niż `z-40` overlaya — inaczej zostaną klikalne pod
zasłoną.

### Strona kursu chowa nawigację motywu

Obie belki są `position: fixed` u góry, więc bez tego po prostu na siebie
nachodzą. Tak samo działa prototyp (`NavbarPrzelacznik`) i taki wygląd
właściciel przyjął przy B5. Powrót do reszty serwisu daje sygnet w pigułce.
**Konsekwencja dla W5:** widok lekcji też będzie miał własną belkę i też będzie
musiał rozstrzygnąć to samo.

### Tutor 4.0.7 ma DRUGĄ rodzinę tokenów

Instalacja podniosła się z 4.0.6 do 4.0.7 i przyniosła obok starych
`--tutor-color-*` zestaw semantyczny: `--tutor-surface-*`, `--tutor-text-*`,
`--tutor-icon-*`, `--tutor-border-*`, `--tutor-button-*`, `--tutor-actions-*`
(305 zmiennych). To on steruje **logowaniem, rejestracją i panelem kursanta** —
czyli tym, co klient zobaczy po zakupie. Mapowanie z 0.40.0 tam nie sięgało:
formularz miał białe pola i granatowy przycisk. `assets/tutor-motyw.css` mapuje
teraz obie rodziny.

**Wniosek na etap WP: wersję Tutora trzeba przypiąć albo świadomie pilnować.**
Aktualizacja LMS-a potrafi przemalować strony, których nie tykaliśmy, a objawu
nie widać w żadnym logu. Dziś pilnuje tego `smoke-wp-motyw` — i to on to
znalazł.

### `/courses/*` przestało być mierzalne — i to była właściwa zmiana pomiaru

Skoro te adresy oddają 301, `smoke-wp-motyw` mierzy teraz strony Tutora, które
NAPRAWDĘ zobaczy człowiek: `/dashboard/` i `/student-registration/`. Przy okazji
wyszło, że `Aai_Sklep_Zasoby` nie rozpoznawał rejestracji, koszyka ani kasy
Tutora — pytał tylko o panel kursanta.

### Czego W3 celowo NIE ruszył

- **Widok lekcji i szablony Tutora** → W5. Wygląd leży gotowy
  w `tools/podglad-kursow/`.
- **Kreator w kokpicie** → W4. Na froncie nie ma dziś żadnego wejścia do
  edycji; szkice ogląda `manage_options` pod normalnym adresem kursu.
- **Zakup** → Plugin 2. CTA prowadzi do kontaktu, a `Offer.availability`
  mówi `PreOrder`. Zmiana na `InStock` należy do tego samego kroku,
  w którym ruszy koszyk.
- **Tłumaczenie interfejsu Tutora** — panel logowania mówi po angielsku
  („Sign In", „Keep me signed in"). To zadanie lokalizacyjne, nie wygląd;
  do zrobienia razem z W5 albo W6.

## Plugin 2 — co to znaczy „płatności" (doprecyzowanie 2026-08-25)

Pytanie właściciela po obejrzeniu W3: *przycisk „Dołączam za 299 zł" prowadzi
teraz na `/kontakt` — to chwilowe? w Pluginie 2 dodamy podstronę bramki
płatności?*

**`/kontakt` jest chwilowe. Własnej bramki ani własnej kasy NIE PISZEMY.**

Wynika to wprost z podziału odpowiedzialności ustalonego 2026-08-19 i
potwierdzonego 2026-08-25: **WooCommerce** bierze koszyk, kasę, płatności
i faktury (ma własne podstrony `/koszyk/`, `/zamowienie/`), a sama bramka
(Tpay/PayU/Przelewy24/BLIK) to **wtyczka do WooCommerce**, nie nasz kod.
Napisanie własnej kasy dublowałoby to, co tamte mają z pudełka, i wciągałoby
nas w zgodność z przepisami o obsłudze płatności.

**Plugin 2 jest SZWEM, nie sklepem.** Cztery rzeczy:

| # | Zakres |
|---|---|
| 1 | powiązanie kursu z naszych tabel z produktem WooCommerce |
| 2 | po opłaconym zamówieniu — zapis kupującego na kurs w Tutor LMS |
| 3 | mail „Ustaw hasło i wejdź do kursu" (link jednorazowy, NIE hasło w treści) |
| 4 | przełączenie CTA z `/kontakt` na koszyk oraz `Offer.availability` `PreOrder` → `InStock` |

Punkt 4 pilnuje dziś `smoke-wp-front`: dopóki zakup jest placeholderem, dane
strukturalne mają mówić `PreOrder`. Zmiana na `InStock` należy do tego samego
kroku, w którym ruszy koszyk — nie wcześniej.

### Pytanie otwarte przed Pluginem 2: gdzie mieszka CENA

Dziś `price_grosze` jest w naszej tabeli `courses`. Produkt WooCommerce będzie
miał własną cenę. To **dwie kopie tej samej liczby**, czyli dokładnie ta klasa
ryzyka, którą znamy z pary „nasze tabele ↔ Tutor" (ETAP-WP.md wyżej: rozjazd
dwóch kopii to główne ryzyko tej architektury). Dwie drogi:

- **nasze tabele są źródłem, cena idzie do Woo przy publikacji** — spójne
  z resztą architektury i z kreatorem, ale wymaga strażnika zgodności;
- **cenę oddajemy WooCommerce** — jedno miejsce prawdy o pieniądzach
  (promocje, kupony, podatki są i tak Woo), ale kreator przestaje o niej
  decydować, a katalog musi ją czytać z produktu.

**Decyzja należy do właściciela i ma zapaść PRZED pisaniem Pluginu 2.**

## Następne kroki

1. ~~Poprosić kolegę o katalog motywu~~ **NIEAKTUALNE 2026-08-20** —
   kolega wypchnął CAŁĄ konwersję do repo (sekcja „Motyw Automatic AI").
2. ~~Celowany komplet dokumentacji WP~~ **ZROBIONE 2026-08-19**:
   947 plików (9,6 MB) w `docs/dokumentacja-techniczna/wordpress/`,
   poza gitem; w repo `ZRODLA.md` z zakresem i uzasadnieniem cięć oraz
   `tools/pobierz-dokumentacje-wp.mjs` (odtwarza komplet jedną komendą,
   idempotentnie). Zakres: pięć podręczników developer.wordpress.org
   w całości (wtyczki, motywy, Common APIs, REST, standardy kodu),
   theme.json i motywy blokowe z Block Editor Handbook, 102 hasła Code
   Reference wybrane imiennie (klasa `wpdb`, `dbDelta`, nonce'y,
   uprawnienia, sanitizacja, trasy i szablony), dokumentacja dewelopera
   WooCommerce, Tutor LMS i wybór z manuala MySQL (typy, `utf8mb4`,
   indeksy, transakcje, wyzwalacze pod audyt).
3. ~~Postawić lokalnie WP + Tutor LMS + WooCommerce i wrzucić jeden nasz
   kurs~~ **ZROBIONE 2026-08-19** — środowisko stoi
   (`/home/krzysiek/mp-test-env/wp-tutor/`, `podman start tutor-db tutor-wp`,
   `http://localhost:8091`), Kurs 2 w środku, pomiary wyżej. Do domknięcia
   decyzji o LMS zostaje ścieżka zakupu WooCommerce → zapis na kurs.
4. Dopiero potem kod wtyczki, wg Weryfikacji-PR i z tymi samymi
   strażnikami co prototyp.
5. Po ukończeniu WSZYSTKICH wtyczek — test całości na lokalnym WP
   z warsztatu `wordpress/` (sekcja „Test finalny wtyczek" wyżej).
