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
   + domena, nie VPS/Node).
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

1. **Gdzie leży konwersja strony głównej na WP?** Ścieżka lokalna albo
   repo — potrzebna, żeby wtyczka miała się do czego dopasować.
   *(Nie znaleziono lokalnie: `mp-test-env` niesie motyw `kredyt-kompas`,
   nie Automatic AI.)*
2. **Motyw blokowy (FSE) czy klasyczny?** Od tego zależy wszystko
   w warstwie widoku: czy wtyczka wstawia szablony blokami, czy
   przechwytuje `template_include`, i jak dokłada pozycję do menu.
3. **Co konkretnie znaczy „dopasowuje się do strony"?** Dziedziczenie
   zmiennych CSS z motywu, `theme.json`, czy własny design system
   wtyczki? Odpowiedź decyduje, ile z `components/kurs/*` przenosimy 1:1.
4. **Tutor LMS na realnej treści** — sprawdzić na JEDNYM naszym kursie,
   zanim wybór zostanie zamknięty (czy uniesie długie lekcje tekstowe,
   czy da się ostylować, jak wygląda dostęp po zakupie).
5. Czy e-booki są osobnym produktem, czy dodatkiem do kursu (wpływa na
   układ katalogu i na to, co widzi WooCommerce). **Właściciel zapytał
   o to wprost 2026-08-20** („czy PDF idzie na maila kupującego") —
   pytanie zostaje otwarte do etapu WP.

### Jak wygląda dostarczenie kursu po zakupie (odpowiedź udzielona 2026-08-20)

Właściciel zapytał, czy po zakupie idzie PDF na maila plus link i hasło.
Odpowiedź z zapisanych decyzji, żeby nie wyprowadzać jej od nowa:

- **Hasła NIE wysyłamy mailem.** Kupujący zakłada konto przy kasie
  WooCommerce i sam ustawia hasło (albo dostaje link do jego ustawienia).
- Po zaksięgowaniu płatności WooCommerce zapisuje go na kurs w Tutorze,
  a mail po zakupie niesie potwierdzenie, fakturę i link „przejdź do
  kursu". Materiał czyta **za logowaniem**, nie z załącznika.
- **PDF to dodatek do pobrania** (link w koncie kupującego), nie rdzeń —
  powody odrzucenia PDF-a jako produktu: PRODUKCJA-MATERIALU-KROK-3.md.

**Czego jeszcze NIE sprawdziliśmy:** ścieżki „zapłata → automatyczny
zapis na kurs" na naszym środowisku. Pomiar z 2026-08-19 potwierdził
tylko, że Tutor unosi długie lekcje i że dostęp za logowaniem działa
z pudełka. Komenda generująca PDF też jeszcze nie istnieje.

## Następne kroki

1. Wskazać lokalizację WP strony głównej i ustalić rodzaj motywu (1–3 wyżej).
2. **Celowany komplet dokumentacji WP do repo** (WYTYCZNE N2,
   `docs/dokumentacja-techniczna/wordpress/` + `ZRODLA.md`): Plugin
   Handbook, `$wpdb`/`dbDelta`/własne tabele, REST API, bezpieczeństwo
   (nonces, sanitizacja, capabilities), z manuala MySQL: typy, indeksy,
   transakcje, triggery. Nie zrzucamy całych manuali — tylko to, czego
   dział używa; skrypt pobierający jak `tools/pobierz-dokumentacje-d7.mjs`.
3. Postawić lokalnie WP + Tutor LMS + WooCommerce i wrzucić jeden nasz
   kurs — **decyzja o LMS zapada na dowodach, nie na ulotkach**.
4. Dopiero potem kod wtyczki, wg Weryfikacji-PR i z tymi samymi
   strażnikami co prototyp.
