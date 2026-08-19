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

## Podział odpowiedzialności

| Obszar | Kto | Dlaczego tak |
|---|---|---|
| Katalog `/szkolenia`, strony sprzedażowe | **nasza wtyczka** | tu leży design premium i kontrakty sekcji z D5/D6 — to jest nasz wkład, nie CRUD |
| Kreator treści (kurs, program, sekcje) | **nasza wtyczka** | panel właściciela, strażnik rozjazdu kontrakt ↔ panel; w WP: ekran w kokpicie + REST/admin-ajax |
| Treść lekcji za logowaniem, postęp | **Tutor LMS** | konta, ograniczenie dostępu, postęp — gotowe i utrzymywane |
| Koszyk, płatności, faktury | **WooCommerce + wtyczka faktur** | polskie prawo podatkowe; tego nie piszemy sami |
| E-booki / PDF (dodatki) | **WooCommerce** (produkt do pobrania) | dostarczanie plików po zakupie ma z pudełka |
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

1. **Jak zdobyć motyw strony głównej?** Konwersja jest u kolegi
   z zespołu, lokalnie jej nie mamy (sprawdzone: `mp-test-env` niesie
   motyw `kredyt-kompas`, nie Automatic AI). Do pracy wystarczy SAM
   KATALOG MOTYWU — `style.css`, `theme.json`, szablony — bez bazy,
   treści i uploadów. Kilka megabajtów, a odblokowuje wszystkie decyzje
   warstwy widoku.
2. **Motyw blokowy (FSE) czy klasyczny?** Od tego zależy wszystko
   w warstwie widoku: czy wtyczka wstawia szablony blokami, czy
   przechwytuje `template_include`, i jak dokłada pozycję do menu.
3. **Co konkretnie znaczy „dopasowuje się do strony"?** Dziedziczenie
   zmiennych CSS z motywu, `theme.json`, czy własny design system
   wtyczki? Odpowiedź decyduje, ile z `components/kurs/*` przenosimy 1:1.
4. ~~Tutor LMS na realnej treści~~ **SPRAWDZONE 2026-08-19** — uniesie
   (59 kB lekcja renderuje się w 6,6 ms, cały Kurs 2 wszedł bez ubytku),
   da się ostylować (własne zmienne `--tutor-*` + szablony do nadpisania),
   dostęp za logowaniem działa z pudełka. Liczby: sekcja „Tutor LMS na
   realnej treści" niżej. Zostaje ścieżka zakupu przez WooCommerce.
5. Czy e-booki są osobnym produktem, czy dodatkiem do kursu (wpływa na
   układ katalogu i na to, co widzi WooCommerce).

## Praca bez dostępu do motywu (ustalenie 2026-08-19)

Nie czekamy z założonymi rękami — projektujemy wtyczkę **agnostycznie
wobec motywu**, żeby wpięcie u kolegi było wpięciem, a nie przepisywaniem:

| Warstwa | Czy zależy od motywu | Co robimy teraz |
|---|---|---|
| Dokumentacja WP, `$wpdb`, własne tabele, audyt | **nie** | robimy od razu |
| Kontrakty treści, migracja Postgres → MySQL | **nie** | robimy od razu |
| Kreator w kokpicie WP (ekran + REST/nonce) | **nie** | kokpit ma własny wygląd, niezależny od motywu frontu |
| Szablony katalogu i stron sprzedażowych | **tak** | własne style z fallbackiem; jeśli motyw ma `theme.json`, dziedziczymy jego zmienne (kolory, typografia, odstępy) |
| Pozycja „Szkolenia" w menu | prawie nie | standardowe API WP działa i w motywach blokowych, i w klasycznych |

**Warunek bezpieczeństwa: testujemy na DWÓCH rodzajach motywu naraz.**
W `mp-test-env` są już oba: `twentytwentyfive` (blokowy, FSE) oraz
`kredyt-kompas` (klasyczny). Wtyczka, która wygląda poprawnie na obu,
wejdzie w motyw Automatic AI bez niespodzianek — a jeśli nie wejdzie,
zobaczymy to na własnym środowisku, nie na produkcji kolegi.

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

## Następne kroki

1. Poprosić kolegę o katalog motywu (bez bazy i treści) — do czasu, aż
   przyjdzie, pracujemy agnostycznie wobec motywu (sekcja wyżej).
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
