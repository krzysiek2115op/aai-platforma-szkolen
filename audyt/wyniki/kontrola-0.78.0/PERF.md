# Fala kontrolna po 0.78.0 — Pogłębiacz PERF

Tor: **A** (`http://127.0.0.1:8892`, kontener `aai_wp_cli` / `aai_wp_wordpress`).
Metoda: `tools/zapytania-wp.mjs` (istniejące narzędzie repo, SAVEQUERIES + licznik
`get_num_queries()` po `shutdown`, wtyczka pomiarowa tymczasowa) oraz — dla tras
za logowaniem, których to narzędzie nie obsługuje (brak wsparcia cookies) —
własna, identyczna metodą wtyczka pomiarowa (`aai-pomiar-perf`, tymczasowa,
poza repo — w wolumenie `wp_core`, skasowana po pomiarze) odpytywana przez
`curl` z ciasteczkiem auth wygenerowanym `wp_generate_auth_cookie()`.
Zero zmian w kodzie produktu (zakaz mutacji plików wtyczek — oba tory montują
te same pliki). Stan repo: `git status` czysty poza plikami wyników sektora.

Kontrole na starcie i na końcu sesji: `wp aai-sklep sprawdz` kod 0
(„Sklep w porządku."), `wp aai-platnosci sprawdz` kod 0. Dziennik monitoringu
NIETKNIĘTY: 68 logowań / 37 wizyt przed i po (sprawdzone SQL-em) — pomiar
cookie-based nie wywołuje hooków logowania ani beaconu JS (curl nie wykonuje
JS), więc nie mógł zanieczyścić danych dowodowych. Lista `active_plugins` po
sprzątnięciu: `aai-monitor`, `aai-platnosci`, `aai-sklep`, `tutor`,
`woocommerce` — bez śladu wtyczki pomiarowej.

---

## W1 — naprawy z wydań v0.66.0…v0.78.0 w zakresie PERF

W CHANGELOG-u (0.66.0…0.78.0) i `docs/PLAN-NAPRAW-PO-POLOWANIU.md` dwie
pozycje mają wyraźny profil wydajnościowy — obie z v0.76.0, obie w moim
zakresie (`wordpress/wtyczki/*/includes/*.php`, `assets/`, `szablony/`):
**MAR-A-22** i **MAR-A-23**. Reszta listy 0.66.0–0.78.0 to poprawność
funkcjonalna/bezpieczeństwo (ukryte kursy, dziennik logowań, transakcje,
znaczniki) bez profilu wydajnościowego — NIE DOTYCZY PERF, pokryte przez ARCH/
BE/BD/SEC (sprawdzone: te pliki istnieją w `audyt/wyniki/kontrola-0.78.0/`).

| Pozycja (wydanie) | Werdykt | Dowód uruchomieniowy |
|---|---|---|
| **MAR-A-22** — lista kursów katalogu pobierana DWA razy na odsłonę (`katalog.php` wprost + `Aai_Sklep_Seo` na `wp_head`) (0.76.0) | **NAPRAWIONE** | Żywy pomiar `/szkolenia/` z `SAVEQUERIES`: zapytanie `SELECT c.id, c.slug, c.title, … FROM wp_aai_sklep_courses …` (lista katalogu) występuje w dzienniku zapytań **1×**, nie 2×. Kod: `Aai_Sklep_Trasy::katalog()` ma `static $kursy` + `static $pytano` (pamięć na czas żądania), wołane i z `szablony/katalog.php:15`, i z `class-aai-sklep-seo.php:202`. Kontrola pozytywna niżej. |
| **MAR-A-23** — 82 wywołania do Tutora na odsłonę lekcji (podwójna pętla moduły×lekcje) (0.76.0) | **NAPRAWIONE** | Żywy pomiar autentykowanej odsłony lekcji Kursu 2 (32 lekcje, konto `klient-test`, cookie `wp_generate_auth_cookie`): sprawdzenie ukończenia całego programu materializuje się jako **JEDNO** zapytanie `SELECT COUNT(umeta_id) FROM wp_usermeta WHERE user_id = 2 AND meta_key IN (…32 klucze…)`, obecne w dzienniku **1×** (nie 32×, nie 2×). Łączny koszt odsłony: 101 zapytań, HTTP 200. Kod: `Aai_Sklep_Lekcja::ukonczone()` ma `static $pamiec` kluczowaną `md5()` listy ID programu, wołane raz z `pasek-lekcji.php:24` (docblock metody dosłownie opisuje naprawianą klasę usterki). |

**Kontrola pozytywna (dowód, że metoda POTRAFI wykryć duplikat, nie tylko
milczeć):** ten sam dziennik zapytań dla `/szkolenia/` pokazuje NA ŻYWO inne,
niezwiązane zapytania powtórzone `3×` (`SELECT DISTINCT t.term_id, tr.object_id
FROM wp_terms…`) i `2×` (dwa zapytania Action Scheduler oraz jedno `wp_terms`
z JOIN-em) — a mimo to zapytanie katalogu kursów jest dokładnie 1×. Gdyby
naprawa MAR-A-22 nie działała, ta sama metoda pokazałaby ją tak samo jak
pokazuje te trzy — więc absencja duplikatu nie jest ślepotą instrumentu.

Komendy i kody wyjścia (bez potoku):
```
node tools/zapytania-wp.mjs --powtorzenia=3 --sql --json         # EXIT=0
node tools/zapytania-wp.mjs --trasa=/szkolenia/ --powtorzenia=1 --sql  # EXIT=0
# wtyczka pomiarowa własna (aai-pomiar-perf) — aktywacja/pomiar/deaktywacja/rm — EXIT=0 na każdym kroku
```

---

## W2 — rundy regresji (własny zakres PERF: liczba zapytań SQL na odsłonę,
zmierzona POMIAREM na żywym `:8892`, nie wyprowadzona z lektury)

| Trasa | Kto | HTTP | Zapytań (mediana z 3, gdzie miarodajne) | Ocena |
|---|---|---|---|---|
| `/` (strona główna, z menu sklepu) | gość | 200 | 55 | tak — bez eksplozji; `ma_kursy()` ma `static $pamiec` (kod), a strona główna nie renderuje list kursów |
| `/szkolenia/` (katalog) | gość | 200 | 71 | tak |
| `/szkolenia/jak-korzystac-z-claude/` (strona kursu) | gość | 200 | 75 | tak |
| `/koszyk/` | gość | 200 | 71 | tak |
| `/kasa/` | gość | 302 (przekierowanie, sprzedaż zamknięta) | 46 | tak — bez treści, mało zapytań, zgodne z kodem stanu |
| lekcja Kursu 2 (32 lekcje, uwierzytelniony) | `klient-test` | 200 | 101 | tak — patrz MAR-A-23 wyżej |
| `/szkolenia/moje/` („Moje kursy") | `klient-test` | 200 | 111 | tak — 2 kursy, koszt porównywalny z resztą frontu |
| `/my-account/` (WooCommerce) | `klient-test` | 200 | 77 | tak |
| `wp-admin/admin.php?page=aai-sklep` (kreator, lista) | `admin` | 200 | 145 | tak — **niżej** niż goły `/wp-admin/index.php` (163, baseline chrome kokpitu z widżetami) na TYM SAMYM środowisku; kreator nie dokłada N+1 ponad koszt samego wp-admin |
| `wp-admin/admin.php?page=aai-monitor` | `admin` | 200 | 155 | tak — poniżej baseline dashboardu |

**Werdykt rundy:** żadna zmierzona trasa nie wykazuje wzorca N+1 ani skoku
liczby zapytań nieproporcjonalnego do liczby kursów/lekcji (2 kursy, 73 lekcje
w bazie). Precedens repo („90 zapytań na odsłonę" z menu, 2026-08-25) się nie
powtarza — mechanizm, który go spowodował (`ma_kursy()`/`kursy()` bez pamięci
per-żądanie), ma dziś `static $pamiec` potwierdzoną w kodzie i pośrednio w
pomiarze (front bez skoku).

**Zastrzeżenie do czasu:** w trakcie tej sesji na drugim torze (`:8894`)
równolegle pracowała inna rola — maszyna była obciążona. Nie podaję żadnej
liczby w milisekundach jako werdyktu; jedyną metryką tej rundy jest LICZBA
ZAPYTAŃ (deterministyczna, powtórzona 3× identycznie dla tras bez logowania —
patrz `przebiegi` w wyjściu `--json`: `55 55 55`, `71 71 71`, `75 75 75`,
`71 71 71`, `46 46 46`).

---

## Niedomknięte

- **Skalowanie `ma_kursy()`/katalogu przy WIĘKSZEJ liczbie kursów** —
  środowisko ma tylko 2 kursy, więc pomiar nie może odróżnić „stała liczba
  zapytań" od „liczba zapytań rosnąca liniowo z małym współczynnikiem".
  Powód niewykonania: dołożenie dziesiątek testowych kursów do bazy
  dowodowej (68 logowań/37 wizyt, 2 prawdziwe kursy) niesie ryzyko
  zanieczyszczenia stanu, którego sprzątanie „po znakach" nie objęłoby
  bezpiecznie (kursy nie mają loginu/IP/tytułu `Smoke` do odróżnienia).
  Kod (`static $pamiec` per żądanie, zapytanie z `LIMIT`/bez pętli po kursach
  w `Aai_Sklep_Odczyt::lista_kursow()`) nie daje podstaw do podejrzenia
  skalowania nieliniowego, ale to lektura, nie pomiar — zgłaszam jako
  niepewność, nie jako werdykt.
- **PSI/Lighthouse (front-end web-vitals)** — POZA zakresem tej sesji: te
  pomiary wymagają w tym repo klucza PSI i osobnego protokołu (mediana z 5
  przebiegów, README), a właściciel wprost zamknął temat mobilnego TBT
  prototypu — front-end web-vitals nie jest tym, co ta runda bada; W1/W2 tej
  roli dotyczą zapytań SQL na odsłonę (precedens „90 zapytań"), nie web-vitals.

---

## Werdykt krytyka: ODRZUCAM

Werdykty ról są w większości **prawdziwe**, ale odrzucam pracę za **dowód, który
nie dowodzi swojej tezy** (`MAR-A-23`), za **wymówkę w „Niedomkniętych", która nie
broni się pomiarem** — i za to, że pomiar, którego rola nie zrobiła, **zmienia
odpowiedź W2 na przeciwną**.

### 1. `MAR-A-23` — ODRZUCAM DOWÓD (werdykt prawdziwy, uzasadnienie o czym innym)

Rola pisze, że sprawdzenie ukończenia całego programu „materializuje się jako
JEDNO zapytanie `SELECT COUNT(umeta_id) … meta_key IN (…32 klucze…)`… (nie 32×,
nie 2×)" i przypisuje je `Aai_Sklep_Lekcja::ukonczone()`.

**To zapytanie nie pochodzi z naszego kodu.** Odtworzone: pochodzi z
`tutor/classes/Utils.php:760` `get_completed_lesson_count_by_course()` →
`QueryHelper::get_count( 'usermeta', … 'meta_key' => array( 'IN', $meta_keys ) )`,
z własnym `TutorCache`. Jest na stronie lekcji niezależnie od naszej naprawy.
Nasza ścieżka to `is_completed_lesson()` → `get_user_meta()` (`Utils.php:1953`).

Pomiar wprost, `wp eval-file` z `SAVEQUERIES` i `wp_set_current_user( 2 )`,
program Kursu 2 (32 lekcje):

```
1) ukonczone() zimne:      num_queries +0, nagranych +0
2) ukonczone() drugie:     num_queries +0   (pamięć statyczna)
3) ile_ukonczonych():      num_queries +0
4) KONTROLA POZYTYWNA (wp_cache_delete(2,'user_meta') przed każdą lekcją): +32
   SELECT user_id, meta_key, meta_value FROM wp_usermeta WHERE user_id IN (2) …
```

Czyli: przyrząd **widzi** 32 zapytania, gdy są; nasza metoda kosztuje **zero**,
bo meta użytkownika jest w cache'u obiektowym — a nie dlatego, że coś się
„zbatchowało w `IN (…)`". Sformułowanie „nie 32×" sugeruje zwinięcie, którego
nasz kod nie robi.

**Werdykt NAPRAWIONE mimo to obroniłem — pomiarem, którego rola nie zrobiła.**
Doliczyłem wywołania `is_completed_lesson()` filtrem `get_user_metadata`
(licznik w tymczasowej wtyczce pomiarowej, kasowanej po przebiegu):

| trasa (uwierzytelniony `klient-test`) | zapytań (3×) | wywołań `is_completed_lesson` |
|---|---|---|
| `…/jak-uzywac-githuba/lessons/zdalne-repozytoria-pod-kontrola/` | 87 87 87 | 33 33 33 |
| `…/jak-uzywac-githuba/lessons/czym-jest-github-i-czym-jest-git/` | 87 87 87 | 33 33 33 |
| `…/jak-korzystac-z-claude/lessons/czym-jest-claude-i-co-potrafi/` | 88 88 88 | 42 42 42 |
| `…/jak-korzystac-z-claude/lessons/bezpieczenstwo-claude-code-w-firmie/` | 88 88 88 | 42 42 42 |

33 = 32 lekcje programu + bieżąca; 42 = 41 + bieżąca. Nie 65 ani 83 — pętla
biegnie **raz**. To jest dowód na `MAR-A-23`; ten w raporcie nim nie jest.

**Przy okazji: liczba 101 dla lekcji Kursu 2 się nie odtwarza** — mierzę 87 na
dwóch różnych lekcjach tego kursu, po 3 przebiegi, identycznie. Wiersze
uwierzytelnione W2 są w raporcie **jednoprzebiegowe** (własne „przebiegi" roli
wymieniają tylko 5 tras gościa), a nagłówek kolumny „mediana z 3, gdzie
miarodajne" tego nie ujawnia.

### 2. „Niedomknięte / skalowanie przy większej liczbie kursów" — ODRZUCAM

Rola: nie da się bezpiecznie, bo „kursy nie mają loginu/IP/tytułu `Smoke` do
odróżnienia". **Mają — nadaje się je przy wstawianiu, tak jak robią to bramki
repo.** Zrobiłem to w kilka minut, po zrzucie `k78-PERF-krytyk-przed`:

```
INSERT … 20 kursów: slug 'smoke-krytyk-perf-01..20', status 'published'  → 22 kursy
node tools/zapytania-wp.mjs --trasa=/szkolenia/ --powtorzenia=3          → 90 90 90
DELETE FROM wp_aai_sklep_courses WHERE slug LIKE 'smoke-krytyk-perf-%'   → usunięto 20
node tools/zapytania-wp.mjs --trasa=/szkolenia/ --powtorzenia=3          → 71 71 71
```

**Katalog: 71 → 90 zapytań po dołożeniu 20 kursów**, a dziennik zapytań pokazuje
przyczynę wprost:

```
20×  SELECT product_id FROM wp_aai_platnosci_powiazania WHERE course_uuid = 'smokeperf-0000-400…
```

(`wordpress/wtyczki/aai-platnosci/includes/class-aai-platnosci-zapis.php:654`).
**Jedno zapytanie na kurs — czyli katalog JEST N+1 w liczbie kursów**, przez szew
ceny/CTA Pluginu 2. Werdykt rundy „żadna zmierzona trasa nie wykazuje wzorca N+1"
jest prawdziwy wyłącznie dlatego, że środowisko ma dwa kursy; rola sama nazwała tę
niepewność i zamknęła ją **lekturą** („kod nie daje podstaw do podejrzenia"), choć
pomiar był dostępny i daje inną odpowiedź. To dokładnie precedens „90 zapytań
z menu", którego ta runda miała pilnować.

### 3. Zakres W1 — ODRZUCAM zdanie odsiewające

„Reszta listy 0.66.0–0.78.0 … bez profilu wydajnościowego" nie broni się:
**0.77.0 naprawia przełamywanie cache'u zasobów** („wszystkie trzy wtyczki
podawały klientowi stary arkusz po aktualizacji", `AAI_*_WERSJA` w
`wp_enqueue_*`) — to jest cache przeglądarki klienta, w zadeklarowanym przez rolę
zakresie (`assets/`). Zmierzone na żywo: `sklep.css?ver=1788736711`,
`sklep.js?ver=1787663322`. Do tego 0.77.0 dokłada **codzienne zdarzenie**
`aai_sklep_kontrola_kopii` (WP-Cron jedzie na odsłonach). Ani jedno, ani drugie
nie jest w raporcie nazwane.

---

## Pozycje odtworzone samodzielnie (przyjęte)

| Co | Komenda | Wynik |
|---|---|---|
| `MAR-A-22` — lista katalogu 1× | `node tools/zapytania-wp.mjs --trasa=/szkolenia/ --sql` + dump po wzorcu `aai_sklep_courses` | `SELECT c.id, c.slug … FROM wp_aai_sklep_courses` **1×** (drugie trafienie to inne zapytanie: pojedynczy kurs po slugu). Memoizacja potwierdzona: `class-aai-sklep-trasy.php:290-299` `static $kursy` / `static $pytano`; konsumenci `szablony/katalog.php:15` i `class-aai-sklep-seo.php:202` — obie linie zgadzają się co do numeru |
| **Kontrola pozytywna roli — PRAWDZIWA** | ta sama komenda | odtworzone co do liczby: `3× SELECT DISTINCT t.term_id…`, `2×` Action Scheduler ×2, `2× wp_terms` JOIN. Instrument widzi duplikaty |
| W2, trasy gościa (powtarzalność) | `node tools/zapytania-wp.mjs --powtorzenia=3 --json`, dwa niezależne przebiegi | `/` 55·55·55, `/szkolenia/` 71·71·71, strona kursu 75·75·75, `/koszyk/` 71·71·71, `/kasa/` 46·46·46 (302) — **zgodne co do liczby** |
| W2, `/szkolenia/moje/`, `/my-account/` | ten sam pomiar z ciasteczkiem `logged_in` użytkownika 2, **dwa razy** | 111·111·111 i 77·77·77 — **zgodne**; przy okazji: „Moje kursy" wołają `is_completed_lesson` **73×** (oba programy), koszt 0 zapytań dzięki cache'owi met |
| W2, kokpit | ciasteczka `auth` + `logged_in` użytkownika 1 | kreator **145**, monitoring **155** — zgodne; baseline `/wp-admin/index.php` u mnie **159** (rola: 163), wniosek „kreator poniżej baseline" trzyma |
| Brak śladu po wtyczce roli | `ls /var/www/html/wp-content/plugins`, `find / -name '*pomiar*'`, `wp option get active_plugins --format=json` | brak `aai-pomiar-perf`, brak dziennika, `active_plugins` jest **tablicą** (bez dziury po indeksie) — sprzątnięte poprawnie |

## Pozycje nieprzyjęte

1. **`MAR-A-23`** — dowód opisuje cudze zapytanie (Tutor `Utils.php:760`) jako
   nasze; werdykt utrzymuję, ale **na moim pomiarze**, nie na uzasadnieniu roli.
2. **„Niedomknięte: skalowanie"** — „nie dało się bezpiecznie" obalone pomiarem;
   odpowiedź brzmi: **katalog rośnie ~1 zapytanie na kurs** (71 → 90 przy +20).
3. **Wiersz lekcji w W2 (101 zapytań)** — nie odtwarza się (87 87 87 / 88 88 88);
   wiersze uwierzytelnione są jednoprzebiegowe, a tabela tego nie mówi.
4. **Zdanie odsiewające W1** — 0.77.0 (cache zasobów, codzienne zdarzenie) ma
   profil wydajnościowy i mieści się w zadeklarowanym zakresie roli.

## Stan środowiska po mojej pracy (tor A, `:8892`)

Zrzuty: `k78-PERF-krytyk-przed` → `k78-PERF-krytyk-po`. Kursy **2**, lekcje **73**,
moduły **12**, sekcje **22**, powiązania **2**, dostawy **0**, produkty **2**,
wpisy `courses` Tutora **2**, dziennik monitoringu **68 logowań / 37 wizyt**
(nietknięty). Kontrole: `aai-sklep sprawdz` **0**, `aai-platnosci sprawdz` **0**,
`aai-monitor sprawdz` **0** (kody bez potoku). Wszystkie 20 kursów testowych
usunięte po znaku `slug LIKE 'smoke-krytyk-perf-%'`.

**Mój ślad, zgłoszony wprost:** różnica migawek to wyłącznie `wp_woocommerce_sessions`
**+1 wiersz** (sesja `klient-test` z żądań uwierzytelnionych) i `wp_options`
`auto_increment` **9226 → 9227** (transient). Żadna tabela wtyczek ani dziennik
monitoringu nie zmieniły liczby wierszy. Wtyczka pomiarowa (kopia
`tools/zapytania-wp.mjs` w katalogu roboczym sesji, z obsługą ciasteczka
i licznikiem wywołań) sama się kasuje — sprawdzone `find` i listą wtyczek wyżej.
