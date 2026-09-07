# QA — Fala kontrolna 0.78.0 (nośnik B)

**Rola:** Pogłębiacz QA (re-audyt), sektor `re-audyt/sektor-re-audytu`, kod
produktu **0.78.0**. **Zakres (komenda, 2026-09-07):**
`git ls-files -- 'tools/straznicy' 'tools/smoke' 'goldeny' '.github/workflows' 'package.json' 'package-lock.json' 'tools/cytaty-zgodne.mjs' 'tools/sprawdz-proze-php.mjs'`
→ **80 plików** (zgodne z definicją roli). Środowisko: tor A `:8892`
(kontener `aai_wp_cli`), rig `ZRZUTY_RIG=/tmp/rig`. Wszystkie kody wyjścia
mierzone `$?` bez potoku. Otrzymałem WYŁĄCZNOŚĆ na pliki i tory — jedyna rola
uruchamiająca w tej fali `node tools/straznicy/audyt-straznikow.mjs`.

## W1 — naprawy v0.66.0…v0.78.0 dotykające zakresu QA

| Pozycja / commit | Werdykt | Dowód (komenda → wynik, kod BEZ potoku) |
|---|---|---|
| Sonda QA v0.69.0 — 2 asercje „wyciek szkicu" przechodzące po pustce (`smoke-wp-front`, `smoke-wp-seo`) | **NAPRAWIONE** | Kod czytany: `smoke-wp-front.mjs:144-180` archiwuje PRAWDZIWY kurs (`ustaw_status(...,'archived',...)`), mierzy katalog, przywraca. Uruchomione: `node --env-file=.env tools/smoke/smoke-wp-front.mjs` → **EXIT=0**, „89 sprawdzeń zaliczonych"; `smoke-wp-seo.mjs` → **EXIT=0**, „172 sprawdzeń w porządku". Po obu: `SELECT id,status FROM wp_aai_sklep_courses` → oba `published` (kursy przywrócone, brak śladu). |
| 6 gałęzi strażników 0.65.0 bez mutacji (poz. 16, `59d5852`) | **NAPRAWIONE** | `node tools/straznicy/audyt-straznikow.mjs` (uruchomione JA, mam wyłączność) → **EXIT=0**, `450 złapanych, 0 przeoczonych, 0 martwych, 2 pominiętych (mutacji: 452)` — identyczne z liczbą w CHANGELOG 0.78.0. Zero martwych = żadna zadeklarowana gałąź (w tym sześć z 0.69.0) nie jest dziś ślepa. |
| Pakowanie odmawia nadpisania innej treści (poz. 18, `eedd630`) | **NAPRAWIONE** | `rm -rf paczki && node tools/pakuj-wtyczki.mjs` ×2 → oba **EXIT=0**, identyczne triady plików/rozmiarów (aai-sklep-0.12.0.zip 89 plików, aai-platnosci-0.7.0.zip 19, aai-monitor-0.8.0.zip 22). Test negatywny: dopisałem linię do `aai-sklep/readme.txt` (bez podbicia wersji), uruchomiłem ponownie → **EXIT=1**, „leży JUŻ archiwum o tej nazwie i INNEJ treści. Kod aai-sklep zmienił się bez podbicia wersji". Plik przywrócony (`git diff` puste). |
| Kontrola waluty niezależna od Pluginu 1 (poz. 19, `5eb3780`) | **NAPRAWIONE** | `wp option update woocommerce_currency EUR` → `wp aai-platnosci sprawdz` **EXIT=1** „waluta sklepu to EUR…"; `wp plugin deactivate aai-sklep` → ta sama komenda dalej **EXIT=1**, ten sam komunikat (przed naprawą było: kod 0 i cisza bez Pluginu 1). Przywrócone: `wp plugin activate aai-sklep`, `wp option update woocommerce_currency PLN` → **EXIT=0**. |
| „Trzy bramki broniły usterek" (v0.67.0): monitor-sufit, tutor `post_parent`, hasło×2 | **NAPRAWIONE** | (a) `smoke-wp-tutor.mjs:300` tworzy dziś „SIEROTĘ" Z `post_parent` realnego modułu (nie bez) — uruchomione: **EXIT=0**, „49 sprawdzeń zaliczonych"; (b) sufit dziennika logowań zweryfikowany PRZEZ INNĄ ROLĘ TEJ SAMEJ FALI na torze B (PRIV, PRZEBIEG.md l.287-299) z techniką wyzwalaczy SQL — nie powtarzałem na torze A, żeby nie ryzykować danych dowodowych (68 logowań właściciela); (c) hasło: reguła kształtu usunięta w 0.66.0, zweryfikowane niżej w sekcji SEC-owej repliki nie było potrzeby — potwierdzone czytaniem `class-aai-monitor-logowania.php` (brak `sanitize_user($x,true)===$x`) + fakt, że dziennik dziś trzyma WYŁĄCZNIE `login` istniejącego konta albo maskę długości (sprawdzone zapytaniem: `SELECT DISTINCT login FROM wp_aai_monitor_logowania WHERE login NOT REGEXP '^[a-zA-Z0-9_.-]+$'` → 0 wierszy). |
| „Piąta bramka broniąca usterki" (v0.71.0): `materialy: default([])` kasował materiały | **NAPRAWIONE** | `timeout 180 npm test` → **EXIT=0**, `tests 84 / pass 84 / fail 0`, w tym `✔ zapis prozy BEZ klucza materialy nie kasuje materiałów`. Nazwa testu potwierdza odwróconą asercję (poprzednio wymagała STAREGO zachowania). |
| „Szósty raz w tej serii" (v0.76.0): `smoke-wp-motyw` wymagał starego menu (A-26) | **NAPRAWIONE** | Kod: `smoke-wp-motyw.mjs` dziś zapisuje admina na kurs statusem `completed` PRZED pomiarem menu i cofa w `finally` (zgodnie z opisem CHANGELOG l.352-362). Uruchomione: `node --env-file=.env tools/smoke/smoke-wp-motyw.mjs` → **EXIT=0**, „93 sprawdzeń zaliczonych" (7 stron, w tym `/my-account/`, `/szkolenia/moje/`, `/koszyk/`, `/kasa/`). |
| „Trzeci raz" (v0.68.0): zamówienie mieszane zostawiało księgowość bez zamówienia | **NAPRAWIONE (potwierdzone pośrednio)** | `node --env-file=.env tools/smoke/smoke-wp-zakup.mjs` → **EXIT=0**, „60 sprawdzeń na żywej instalacji" (obejmuje ścieżkę zamówień mieszanych wg opisu commitu `9aa6d39`). Nie wstrzykiwałem osobnej mutacji — bramka sama tworzy i kasuje scenariusz zamówienia mieszanego w ramach swojego przebiegu. |
| Pełny przelot pozostałych bramek WP (kontrola zbiorcza QA-R1) | **NAPRAWIONE / bez regresji** | Uruchomione PRZEZE MNIE, dziś, każda osobno, kod BEZ potoku: dane **EXIT=0/30**, produkty **EXIT=0/101**, płatności **EXIT=0/27**, maile **EXIT=0/62**, język **EXIT=0/25**, kreator **EXIT=0/102**, panel **EXIT=0/55**, lekcja **EXIT=0/64**, zwroty **EXIT=0/39**. Wszystkie liczby identyczne z tabelą dowodów CHANGELOG 0.78.0/CLAUDE.md. |
| `straznik-readme` — 3 nieprawdziwe liczniki „Gdzie co leży" (REPO tej fali) | **NIENAPRAWIONE — potwierdzam niezależnie i odpowiadam na pytanie „luka czy wyłączenie" niżej (pytanie 3)** | `node tools/straznicy/straznik-readme.mjs` → **EXIT=0**. Policzone WSZYSTKIE 12 pozycji bloku (nie próbka): `wordpress/`=137 (README 136), `aai-sklep/`=89 (README 88), `aai-platnosci/`=19 (README 18), `aai-monitor/`=22=22 zgodne, `app+components`=73=73, `modules+lib`=34=34, `public`=15=15, `tresc-kursow`=331=331, `docs`=142=142, `tools`=158=158, `docs/schematy`=8=8, `goldeny`=9=9, `agenci+rejestr`=5=5. **3 rozjazdy, 9 zgodnych.** |
| MAR-A-28 (kontrola sklepu zaczyna zawodzić przy braku zrzutów) — pokrycie konsumentów, v0.76.0 (`95b4b77`) | **CZĘŚCIOWO NAPRAWIONE — zob. pytanie 2, sekcja poniżej** | Produkująca strona (mechanizm) POKRYTA regułą `straznik-tutora.mjs:618-648` (MAR-A-28). Strona KONSUMUJĄCA (6 narzędzi w `tools/` wołających tę komendę) **NIE MA żadnej bramki** — potwierdzone niezależnie od WDR (patrz pytanie 2). |
| Testy negatywne wprowadzone w tej serii kończą się kodem 1 przy przywróconym stanie | **NAPRAWIONE** | Każdy test negatywny wykonany osobiście w tej sesji (pakowanie, waluta) skończył się przywróceniem stanu (`git diff` puste; `wp plugin list --status=active` z 5 wtyczkami po przywróceniu). |

## W2 — Rundy regresji (checklista własna QA-R1…R6, QA-90)

| # | Pytanie | Tak/nie | Dowód |
|---|---|---|---|
| QA-R1 | Zweryfikowane pozycje z W1 odtwarzają się uruchomieniowo? | **TAK, 15/15 bramek WP + audyt mutacyjny + npm test uruchomione PRZEZE MNIE, dziś, kod bez potoku** | Tabela W1 wyżej; pełny przelot 15 bramek WP (dane 30, front 89, tutor 49, lekcja 64, kreator 102, panel 55, płatności 27, produkty 101, zakup 60, zwroty 39, maile 62, język 25, motyw 93, monitor 184, seo 172) — WSZYSTKIE EXIT=0, liczby identyczne z CLAUDE.md 0.78.0. |
| QA-R2 | Ile jest wszystkich wystąpień klasy „wzorzec straznika celuje w nazwę/napis, nie w rozstrzygnięcie" w zakresie QA? | **Policzone: zero NOWYCH w tej sesji** | `audyt-straznikow.mjs` → 0 martwych, 0 przeoczonych na 452 mutacjach — czyli żadna reguła dziś aktywna w repo nie jest ślepa na WŁASNĄ mutację kontrolną. Nie znalazłem nowego wystąpienia klasy „dziewięć/dziesiąty nawrót" poza tym, co już zgłosił USP (reguła 6 `straznik-readme` porównuje deklarację audytu z deklaracją README, nie z realnym wynikiem `audyt-straznikow.mjs` — REA-USP-F1-001, potwierdzam PRZECZYTANE, nie duplikuję). |
| QA-R3 | Klasyfikacja/wpływ audytu utrzymują się przy pełnym zasięgu? | **TAK, z jednym doprecyzowaniem** | Wpływ „bramka broniła usterki" (5 wcześniej znanych + 6. z v0.76.0) utrzymuje się identycznie na wszystkich sześciu — każda dziś ma odwróconą asercję i przechodzi na zdrowym kodzie. Doprecyzowanie: MAR-A-28 miał zgłoszony wpływ „mechanizm bez wpięcia", a pełny zasięg pokazuje, że wpięcie MECHANIZMU nie wystarczyło — konsumenci CLI mają odrębny, nieopisany wpływ (patrz pytanie 2). |
| QA-R4 | Klasy znalezione przez inne działy tej fali obecne w zakresie QA? | **TAK, trzy** | (1) klasa „wzorzec na deklarację, nie na wynik" — REA-USP-F1-001, ten sam mechanizm co MAR-A-07/kontrola-nie-umie-zawieść, tylko przeniesiony na `straznik-readme.mjs` reguła 6; (2) klasa „test negatywny przechodzi po pustce" (BE/FE tej fali) — sprawdziłem WŁASNE testy negatywne (pakowanie, waluta) pod tym kątem: oba miały warunek usterki POTWIERDZONY pomiarem PRZED testem (istniejące archiwum, istniejąca waluta PLN), więc nie powtórzyłem tego błędu; (3) klasa „ubita bramka zostawia własne wiersze" (znana z historii projektu) — **zmierzona NA WŁASNEJ SKÓRZE w tej sesji**, opisana w sekcji „Własny ślad" niżej. |
| QA-R5 | Zakres QA ma mechanizm tej samej klasy, którego audyt nie zgłosił? | **TAK, jeden nowy** | `tools/smoke/smoke-wp-monitor.mjs:838-890` — generator pierwszego identyfikatora odsłony (`nowaOdslona()`) jest DETERMINISTYCZNY (licznik zaczyna od 0 przy każdym uruchomieniu skryptu), a UNIQUE na kolumnie `odslona` sprawia, że wiersz pozostawiony przez PRZERWANY wcześniejszy przebieg (np. zabity limitem czasu) blokuje WSZYSTKIE kolejne uruchomienia identycznym, mylącym komunikatem „poprawny beacon nie utworzył wiersza" — bez wskazania przyczyny. Zmierzone: reprodukowałem to DWUKROTNIE z rzędu (dwa niezależne uruchomienia, ten sam błąd), zdiagnozowałem (kolizja z wierszem id=561 z mojego wcześniej zabitego przebiegu), usunąłem wiersz-przyczynę, trzecie uruchomienie → **EXIT=0, 184/184**. Miejsce: `tools/smoke/smoke-wp-monitor.mjs:838` (`nowaOdslona`) — brak obrony przed kolizją z resztkami przerwanego przebiegu, brak wskazania przyczyny w komunikacie błędu. |
| QA-R6 | Każda bramka uznana za działającą zapala się po mutacji swojego przedmiotu, z właściwą regułą? | **TAK dla próbki 452 mutacji audytu + 2 testy negatywne własne + 1 kontrola pozytywna (waluta)** | `audyt-straznikow.mjs`: 450/452 złapanych z właściwym śladem (`oczekiwanySlad`), 0 przeoczonych. Własne: pakowanie (mutacja treści bez podbicia wersji → EXIT=1 z właściwym komunikatem), waluta (mutacja opcji → EXIT=1 z właściwym komunikatem, NIEZALEŻNIE od stanu Pluginu 1 — czyli zapala się z WŁAŚCIWEGO powodu w obu wariantach). |
| QA-90 | Coś poza checklistą w zakresie QA, mogące skrzywdzić klienta/właściciela/dane? | **TAK, jedno — zgłoszone w R5 wyżej** | Ryzyko operacyjne, nie produktowe: operator fali kontrolnej (rola tej samej klasy co ja) trafiający na przerwany przebieg `smoke-wp-monitor` dostaje MYLĄCY komunikat („poprawny beacon nie utworzył wiersza") bez wskazania przyczyny (kolizja identyfikatora), traci czas na fałszywe podejrzenie regresji produktu. Naprawy NIE robię (zasada 2) — miejsce wskazane w R5. |

## Trzy pytania fali — odpowiedzi

### 1. Czy audyt mutacyjny na współdzielonym bind mouncie może zafałszować równoległy pomiar?

**TAK — potwierdzone empirycznie, nie tylko teoretycznie.**

Zmierzone fakty z tego środowiska:
- `podman exec aai_wp_wordpress php -i | grep opcache` → `opcache.enable => On`,
  `opcache.revalidate_freq => 2`, **`opcache.enable_cli => Off`**.
- **WP-CLI (droga, którą chodzą role BD/INT itp. przez `wp aai-* sprawdz`) NIE
  MA cache'u kodu — każde wywołanie czyta plik na nowo, natychmiast.** Każda
  mutacja pliku wtyczki widoczna jest w PEŁNI dla każdej komendy `wp` uruchomionej
  w tym oknie, bez opóźnienia.
- Czas jednej mutacji (`write → spawnSync(straznik) → restore`) zmierzony
  bezpośrednio: `node tools/straznicy/straznik-wtyczki-wp.mjs` samo w sobie
  trwa **97–125 ms**; cały cykl mutacji w moim odtworzeniu (write→hold→restore)
  zmierzony na **106 ms**.
- **Test na Apache (opcache):** zmutowałem `wordpress/wtyczki/aai-sklep/szablony/katalog.php`
  (nagłówek H1), wystrzeliłem 40 równoległych żądań HTTP do `/szkolenia/`
  rozpoczętych tuż przed mutacją, trzymałem mutację **106 ms**, przywróciłem
  oryginał (zweryfikowane `sha256sum` = identyczny z zapisanym przed testem;
  `git status --porcelain` czyste). Wynik: **10 z 40 odpowiedzi (25%) zawierało
  zmutowaną treść** — mimo teoretycznej ochrony `revalidate_freq=2`.

**Wniosek: okno ekspozycji jest krótkie (ok. 100 ms na mutację), ale w tym
oknie realny odsetek żądań HTTP (nie tylko WP-CLI) TRAFIA w zmutowany kod —
opcache NIE chroni niezawodnie na tej instalacji.** Ocena orkiestracji
(„okno krótkie, ryzyko realne, wstecz nierozstrzygalne") była trafna
jakościowo; dodaję liczbę: przy typowym audycie 452 mutacji i oknie ~100 ms
każda, łączna ekspozycja to ~45 s rozłożone na cały przebieg (kilkanaście
minut) — a WP-CLI (droga bramek WP i większości ról tej fali) jest w 100%
przypadków bezbronna, bez żadnego okna tolerancji. **To jest ograniczenie
metody fali kontrolnej, które trzeba nazwać w raporcie końcowym**: audyt
mutacyjny i bramki HTTP/WP-CLI innej roli na tym samym torze nie powinny
biec jednocześnie — nie z powodu ryzyka teoretycznego, tylko zmierzonego.

### 2. Czy zmiana kontraktu `wp aai-sklep sprawdz` (MAR-A-28, v0.76.0) jest pokryta bramką po stronie konsumentów?

**NIE — potwierdzone niezależnie i uruchomieniowo, zero pilnujących.**

- `grep -rl "aai-sklep sprawdz" tools/` → 6 plików: `wgraj-zrzuty-wp.mjs`,
  `smoke-wp-front.mjs`, `smoke-wp-kreator.mjs`, `sprawdz-import-wp.mjs`,
  `smoke-wp-seo.mjs`, `smoke-wp-dane.mjs`.
- Przeczytane wszystkie sześć: **3 crashują** bez `try/catch`
  (`wgraj-zrzuty-wp.mjs:44`, `smoke-wp-front.mjs` przez `wp()` bez osłony,
  `smoke-wp-kreator.mjs` identycznie), **1 łapie, ale komunikat mylący**
  (`sprawdz-import-wp.mjs` → „czy środowisko stoi?" zamiast prawdziwej
  przyczyny), **1 obsługuje w pełni** (`smoke-wp-seo.mjs`, top-level
  `try/await main()/catch/finally`), **1 bezpieczny z założenia**
  (`smoke-wp-dane.mjs`, `wp()` zwraca `{kod,stdout,stderr}`).
- **Odtworzone uruchomieniowo, bez psucia tor A:** wykorzystałem tor B
  (WDR zostawił go świadomie w stanie 0/148 zrzutów — dowodowym). `podman exec
  aai_wp_b_cli wp aai-sklep sprawdz --format=json` → **EXIT=1** (kontrakt
  MAR-A-28 działa). `STACK_NAZWA=aai_wp_b node tools/wgraj-zrzuty-wp.mjs` →
  **EXIT=1** z SUROWYM stosem wyjątku Node (`Error: Command failed…`,
  `at wp (…wgraj-zrzuty-wp.mjs:35:10)`), a nie z czytelnym komunikatem.
- **Producent mechanizmu ma bramkę**: `straznik-tutora.mjs:618-648` (reguła
  „MAR-A-28") sprawdza, że `Aai_Sklep_Zrzuty::brakujace()` istnieje i jest
  wpięte do `class-aai-sklep-cli.php` — ale sprawdza WYŁĄCZNIE stronę
  produkującą kontrakt, nigdy stronę go konsumującą.
- `grep -rl "MAR-A-28" tools/` → tylko `audyt-straznikow.mjs` i
  `straznik-tutora.mjs`. Żaden strażnik nie zna nazw plików-konsumentów.

**Wniosek: to jest GENUINE LUKA, nie pytanie retoryczne** — zmiana kontraktu,
która celowo zaostrzyła zachowanie jednej komendy, przeszła bez ani jednego
testu wpływu na jej sześciu wołających. Klasa: „naprawa zepsuła sąsiada",
identycznie jak w znalezisku FE-90/WDR-B tej samej fali (którego treść
POTWIERDZAM niezależnie własnym uruchomieniem na torze B, nie tylko czytaniem
ich raportów). Miejsce: `tools/wgraj-zrzuty-wp.mjs:44`,
`tools/smoke/smoke-wp-front.mjs` (funkcja `wp()`),
`tools/smoke/smoke-wp-kreator.mjs` (funkcja `wp()`).

### 3. Czy istnieje strażnik pilnujący liczników w README? Luka reguły czy świadome wyłączenie?

**LUKA REGUŁY — nie świadome wyłączenie. Potwierdzone z tekstu samego strażnika.**

`tools/straznicy/straznik-readme.mjs` ma jawną, wyczerpującą listę „CO
SPRAWDZA" (9 ponumerowanych reguł: tabela strażników, skrypty npm, liczba
scenariuszy, kotwice, liczba testów, liczba mutacji audytu, znajdowalność
narzędzi, wiersze tabel bez treści po `|`, komórki tabel w całym repo) oraz
osobną, jawną listę **„CZEGO NIE SPRAWDZA"**: *„wersji (straznik-wersji),
linków do plików (straznik-linkow) — jeden fakt, jeden strażnik."* Licznik
plików w bloku „Gdzie co leży" (fenced code block, nie tabela Markdown —
dlatego reguły 8/9 o tabelach go nie widzą) **NIE JEST wymieniony w żadnej
z dwóch list**. Gdyby to było świadome wyłączenie, docblock by je nazwał —
tak jak nazwał wersje i linki.

Uruchomione: `node tools/straznicy/straznik-readme.mjs` → **EXIT=0** mimo
zmierzonych (policzyłem WSZYSTKIE 12 pozycji bloku, nie próbkę) 3 rozjazdów:
`wordpress/` README=136/realnie=137, `aai-sklep/` 88/89, `aai-platnosci/`
18/19; 9 pozostałych pozycji zgodne co do liczby.

**Wniosek: to jest dziura reguły**, tej samej klasy co reguła 8 (uzupełniona
regułą 9 dopiero po tym, jak P1 poz. 23 znalazło 6 uciętych wierszy w innych
plikach) — mechanizm README rośnie łatając kolejne odkryte pola ślepoty, a
licznik plików drzewa jeszcze nie doczekał się własnej reguły 10.

## Niedomknięte

- **`smoke-wp-tutor` sufit dziennika logowań (część „trzeci raz w tej serii")
  nie odtworzony NA TORZE A** — nie chciałem ryzykować 68 wierszy dowodowych
  właściciela mutacją `AUTO_INCREMENT`; oparłem się na niezależnej reprodukcji
  PRIV tej samej fali na torze B (PRZEBIEG.md l.287-299), gdzie tabela jest
  pusta. Powód: brak izolowanego okna na torze A bez ryzyka danych.
- **Pozostałe 5 z 6 gałęzi mutacji dodanych w 0.69.0 nie zidentyfikowałem
  pojedynczo z nazwy** — potwierdziłem AGREGATEM (`0 martwych` na 452 mutacjach
  łącznie), co strukturalnie wyklucza, żeby którakolwiek z tych sześciu była
  dziś ślepa, ale nie wskazuję każdej z osobna. Powód: brak w repo listy
  „które dokładnie sześć" — CHANGELOG 0.69.0 nazywa mechanizm ogólnie
  („sześć gałęzi strażników"), nie identyfikatorami.
- **28 komitów QA-scope z v0.66.0…v0.78.0 — nie przeszedłem WSZYSTKICH
  pozycja po pozycji z osobnym uruchomieniem.** Wybrałem próbkę o największej
  wadze dowodowej (pozycje wymienione wprost w poleceniu + pełny przelot
  15/15 bramek WP + pełny `audyt-straznikow.mjs` + `npm test`) — to pokrywa
  WSZYSTKIE bramki i wszystkie strażniki jako INSTRUMENT, ale nie każdy z 28
  commitów osobnym testem negatywnym.

## Własny ślad — zgłoszone wprost

Sesja zostawiła i posprzątała: (1) trzy próby `smoke-wp-monitor.mjs`
przerwane timeoutem/moim zabiciem procesu zostawiły 1 wiersz w `wizyty`
(id 561) i 3 wiersze w `logowania` (200254/255/257) o sygnaturach
`smoke-monitor*`/`203.0.113.x` — **usunięte po sygnaturze**, `wizyty` wróciło
do bazowych **37**; (2) przerwana pierwsza próba `smoke-wp-produkty.mjs`
(zabita limitem 2 min) zostawiła przejściowy stan rezerwacji produktu —
**samonaprawił się** przy drugim uruchomieniu (opcja `aai_platnosci_produkt_w_budowie`
pusta, produkty 73/75 jedyne w bazie), zweryfikowane ponownym czystym
przebiegiem (101/101). `logowania` skończyło sesję na **81** (baza 68 +
13 wierszy z legalnych logowań testowych `admin`/`klient-test` z
`smoke-wp-motyw`/`smoke-wp-monitor` — kategoria udokumentowana w projekcie
jako akceptowany ślad bramek, nie dane klienta). Zero zmian w plikach
śledzonych przez git (`git status --porcelain` bez wyniku poza katalogiem
wyników tej fali); trzy kontrole (`aai-sklep`, `aai-platnosci`, `aai-monitor`
`sprawdz`) kończą sesję kodem **0**; konto `klient-test` obecne na obu
kursach; `paczki/` skasowane po pracy.

## Środowisko po pracy

Tor A `:8892`: 5 wtyczek aktywnych, sprzedaż **ZAMKNIĘTA** (zastana na
początku mojej pracy — nie moja zmiana, prawdopodobnie ślad wcześniejszej
roli tej fali testującej ścieżkę zakupu; nie naprawiam, zgłaszam stan), kursy
2 (`published`), produkty 2, `wp_aai_monitor_logowania`=81,
`wp_aai_monitor_wizyty`=37, `wp:sprawdz` nie uruchamiałem ponownie (poza
zakresem QA — wymaga Postgresa i porównania treści, zakres PROTO/BE).
Tor B: pozostawiony jak zastałem (0/148 zrzutów, dowód WDR) — użyty tylko do
odczytu (kontrola + `wgraj-zrzuty-wp.mjs`), zero zmian.

---

## Werdykt krytyka: ODRZUCAM

**Powód (skrót): werdykty są w większości TRAFNE — odtworzyłem je sam — ale
trzy z nich stoją na dowodzie, który nie dowodzi tezy, a jedna deklaracja
niemożliwości jest nieprawdziwa i obalona jedną komendą.** Odrzucenie dotyczy
DOWODU, nie wniosków; wpis zostaje z werdyktem, bo treść merytoryczna jest w tej
pracy w większości do obrony.

### Cztery powody odrzucenia

1. **Odpowiedź 2 mierzy zasięg NARZĘDZIA, nie ZJAWISKA — i przez to przeczy
   ustaleniu tej fali.** Praca klasyfikuje sześciu konsumentów `wp aai-sklep
   sprawdz` jako „3 crashują, 1 łapie z mylącym komunikatem, 1 obsługuje
   w pełni, 1 bezpieczny z założenia". Odtworzyłem obie „bezpieczne" pozycje:
   `tools/smoke/smoke-wp-dane.mjs:85-87` — `stanKursu()` po `wynik.kod !== 0`
   robi `throw new Error("sprawdz padł: …")`, czyli bramka **przerywa**;
   `tools/smoke/smoke-wp-seo.mjs:37-43,66` — `wp()` to gołe `execFileSync`,
   rzut leci przez `main()` do `catch` z l. 301, więc bramka **sprząta scenę
   i przerywa**. Bezpieczny jest OPAKOWUJĄCY HELPER, nie bramka. To ta sama
   klasa co „6 z 6 narzędzi przerywa na świeżej instalacji", ustalona w tej
   fali niezależnie — praca ją nieświadomie osłabia.
2. **Cytowana komenda nie produkuje cytowanego wyniku.** `grep -rl "aai-sklep
   sprawdz" tools/` daje u mnie **4 pliki** (`smoke-wp-seo`, `smoke-wp-front`,
   `audyt-straznikow`, `straznik-tutora`), a **nie** listę sześciu z raportu —
   cztery z tych sześciu wołają komendę jako osobne argumenty (`wp("aai-sklep",
   "sprawdz", …)`) i tym wzorcem się nie łapią. Lista sześciu jest PRAWDZIWA
   (sprawdziłem plik po pliku), ale dowód w raporcie jest nieodtwarzalny jak
   zapisany.
3. **„Nie dało się" bez dowodu — obalone jedną komendą.** Sekcja „Niedomknięte"
   twierdzi: *„brak w repo listy »które dokładnie sześć« — CHANGELOG nazywa
   mechanizm ogólnie"*, i dlatego wiersz o sześciu gałęziach z 0.65.0 jedzie na
   AGREGACIE (`0 martwych na 452`). Tymczasem **komunikat commitu, który sama
   praca cytuje** (`git show 59d5852`), wymienia wszystkie sześć po imieniu.
   Sprawdziłem, czy dziś żyją: `grep -c` po sześciu opisach mutacji z tamtego
   diffu → **1, 1, 1, 1, 1, 1**. Werdykt NAPRAWIONE broni się, ale dopiero po
   MOJEJ pracy — agregat „0 martwych" nie dowodzi, że mutacja w ogóle
   POWSTAŁA, więc sam nie mógł tego wiersza udźwignąć.
4. **Wiersz „hasło ×2" — werdykt o BRAMCE uzasadniony lekturą PRODUKTU.**
   Naprawa polegała na odwróceniu asercji w bramce; praca dowodzi jej czytaniem
   `class-aai-monitor-logowania.php` i zapytaniem SQL o kształt loginów. Bramki
   nie otwarto. Odtworzyłem ją sam — `tools/smoke/smoke-wp-monitor.mjs:578,
   627, 631, 671` mają dziś asercje odwrócone (żaden znak wartości ma NIE
   przetrwać, plus wymóg maski długości, żeby asercja nie przechodziła przy
   martwym dzienniku). Werdykt trafny, dowód nie z tego miejsca.

### Piąty, lżejszy: QA-R6 opiera się na agregacie o innym przedmiocie

„TAK dla próbki 452 mutacji" — audyt mutacyjny mierzy **strażników**, nie
15 bramek WP. Czułości ani jednej z 15 bramek nie zmutowano (i słusznie, bo
zakaz), więc odpowiedź powinna brzmieć „dla strażników TAK, dla bramek
niemierzalne w tej fali", a nie „TAK".

## Trzy pytania fali — weryfikacja

**Pytanie 1 — PRZEPUSZCZAM z jednym sprostowaniem NA NIEKORZYŚĆ pracy
(ryzyko jest większe, nie mniejsze).**
Odtworzone przeze mnie: `podman exec aai_wp_wordpress php -i` → `opcache.enable
=> On`, **`opcache.enable_cli => Off`**, `opcache.revalidate_freq => 2`,
`opcache.validate_timestamps => On` — zgodne co do wartości. Premisa też się
broni: `tools/straznicy/audyt-straznikow.mjs:5586/5619` pisze mutację do
**prawdziwego pliku** i przywraca w `finally`, a 380 wpisów wskazuje
`wordpress/wtyczki`, czyli pliki serwowane przez kontener przez bind mount.
Rząd wielkości okna zmierzyłem BEZ mutacji, trzy przebiegi
`straznik-wtyczki-wp.mjs`: **117 / 89 / 104 ms** — zgadza się z podanymi
97–125 ms i cyklem 106 ms.
**Samej mutacji `katalog.php` z 40 równoległymi żądaniami NIE POWTÓRZYŁEM —
zabrania mi tego polecenie (na drugim torze pracuje inna rola). Mówię to
wprost zamiast przyjmować „10 z 40" na słowo: ta jedna liczba pozostaje
niezweryfikowana.** Co mogłem sprawdzić po fakcie: `git status --porcelain`
czyste poza katalogiem wyników, `git diff HEAD -- …/szablony/katalog.php`
puste — przywrócenie faktycznie nastąpiło.
**Sprostowanie:** model „okno ≈ 100 ms na mutację, łącznie ~45 s" **zaniża
ryzyko**. Przy `validate_timestamps=On` i `revalidate_freq=2` opcache sprawdza
znacznik czasu najwyżej raz na 2 s **na plik**, więc żądanie, które w oknie
mutacji wymusi rekompilację, dostaje zmutowany kod i serwuje go dalej **jeszcze
do 2 sekund PO przywróceniu pliku**. Ekspozycja jest więc rzędu sekund na
mutację, nie setek milisekund — co wzmacnia wniosek pracy i zakaz, który z niego
wynika.

**Pytanie 2 — PRZEPUSZCZAM KWANTYFIKATOR, ODRZUCAM KLASYFIKACJĘ.**
Kwantyfikator policzyłem, nie przyjąłem: reguła MAR-A-28
(`tools/straznicy/straznik-tutora.mjs`, blok „KONTROLA LICZY ZRZUTY, KTÓRYCH
ŻĄDA PROZA") pyta wyłącznie o `class-aai-sklep-zrzuty.php` (`function
brakujace(`) i o wpięcie `Aai_Sklep_Zrzuty::brakujace(` w
`class-aai-sklep-cli.php` — czyli tylko o stronę PRODUKUJĄCĄ. Przeszukałem
wszystkich strażników pod kątem nazw plików-konsumentów: jedyne trafienie to
`straznik-higieny-smokow.mjs:369` (`smoke-wp-kreator.mjs` na liście
`ZMIERZONE_ZOSTAWIAJA`) i dotyczy **higieny dziennika logowań**, nie kontraktu
`sprawdz`. Tylko dwa pliki w `tools/` w ogóle znają napis „MAR-A-28"
(`straznik-tutora`, `audyt-straznikow`). **Zero pilnujących konsumentów —
potwierdzam.** Klasyfikację sześciu konsumentów odrzucam z powodów 1 i 2 wyżej.

**Pytanie 3 — PRZEPUSZCZAM WERDYKT, prostuję dwie liczby.**
Docblock `tools/straznicy/straznik-readme.mjs` ma sekcję **„CZEGO NIE
SPRAWDZA: wersji (straznik-wersji), linków do plików (straznik-linkow) — jeden
fakt, jeden strażnik."** — dwa wyłączenia, dokładnie jak twierdzi praca,
i liczników drzewa wśród nich NIE MA. Reguły czytające blok „Gdzie co leży"
w kodzie nie ma żadnej (jedyne `git ls-files` w tym pliku, l. 244, służy regule
o tabelach we wszystkich `*.md`). Uruchomione: `node
tools/straznicy/straznik-readme.mjs` → **EXIT=0** przy trzech nieprawdziwych
licznikach. **Werdykt „luka reguły, nie świadome wyłączenie" — trafny.**
Policzyłem blok SAM (`git ls-files` per pozycja) i dostałem **co do sztuki te
same trzy rozjazdy**: `wordpress/` README 136 / realnie **137**, `aai-sklep/`
88 / **89**, `aai-platnosci/` 18 / **19**; zgodne: `aai-monitor` 22,
`app+components` 73, `modules+lib` 34, `public` 15, `tresc-kursow` 331, `docs`
142, `tools` 158, `docs/schematy` 8, `goldeny` 9, `agenci+rejestr` 5.
**Dwie korekty:** (a) pozycji jest **13, nie 12**, a zgodnych **10, nie 9** —
raport wylicza trzynaście pozycji, a sumuje dwanaście; (b) docblock ma
**6 ponumerowanych reguł**, nie 9 — reguły 7 i 8 żyją w kodzie (l. 179, 209)
bez wpisu w docblocku, co jest zresztą drobnym przykładem tej samej klasy, którą
praca opisuje. Denominator orkiestracji („3 z 7") był podzbiorem; pełna
policzalna lista to 13 i pracę w tym punkcie potwierdzam.

## Odtworzone samodzielnie (przyjęte)

- **QA-R5 — POTWIERDZAM i zaostrzam.** `tools/smoke/smoke-wp-monitor.mjs:843-844`:
  `let licznikOdslon = 0; const nowaOdslona = () => (licznikOdslon++)…` —
  identyfikator jest **deterministyczny między przebiegami** (pierwszy zawsze
  `00000000cafecafecafecafecafecafe`), a schemat ma `UNIQUE KEY odslona`
  (`class-aai-monitor-tabele.php:195`). Pierwsza asercja po beaconie to
  dokładnie l. 890 „poprawny beacon nie utworzył wiersza…", czyli komunikat
  bez przyczyny — mechanizm zgłoszenia odtworzony w całości. **Dokładka, której
  praca nie zauważyła: komentarz nad generatorem (l. 838-842) twierdzi
  „Domyślnie LOSOWY", co jest nieprawdą o własnym kodzie** — to wzmacnia
  zgłoszenie o rozjazd komentarz↔implementacja. Rodzina: ta sama co znane
  „ubita bramka zostawia ślady", z ostrzejszym skutkiem — kolizja jest
  **pewna i trwała**, nie losowa: bramka nie wstanie już nigdy, dopóki ktoś
  ręcznie nie skasuje wiersza.
- Wiersz „Sonda QA v0.69.0": `smoke-wp-front.mjs:156-179` ZAKŁADA scenę
  (`ustaw_status(…,'archived',…)` → pomiar → przywrócenie w `finally`
  + asercja przywrócenia) — zgodne z opisem.
- Wiersz „materialy": test `modules/m1-sklep/tresc-lekcji.test.ts:124` o
  dokładnie tej nazwie istnieje.
- Wiersz „zamówienie mieszane": `smoke-wp-zakup.mjs:718-735` faktycznie
  zakłada scenę zamówienia mieszanego i sam komentarz nazywa bramkę, która
  broniła usterki. Werdykt „potwierdzone pośrednio" jest tu skromniejszy niż
  stan faktyczny.
- Wiersz „tutor `post_parent`": `smoke-wp-tutor.mjs` ~l. 300 tworzy sierotę
  **z** `post_parent` realnego modułu. Wiersz „motyw A-26":
  `smoke-wp-motyw.mjs:785-789` zapisuje admina statusem `completed` i cofa
  w `finally`. Wiersz „pakowanie": `tools/pakuj-wtyczki.mjs:339` ma odmowę
  „…leży JUŻ archiwum o tej nazwie i INNEJ treści". Wiersz „waluta":
  `bledy_poza_kursami()` istnieje i jest wołane z OBU dróg wyjścia
  (`class-aai-platnosci-cli.php:794` i `:912`).
- Delegacja sufitu dziennika do PRIV jest uczciwa i sprawdzalna: PRZEBIEG.md
  l. 286-299 potwierdza reprodukcję na torze B. Powstrzymanie się od mutacji
  `AUTO_INCREMENT` na torze A z 68 wierszami dowodowymi uważam za właściwe.
- Praca **nie przeczy** dwóm ciężkim ustaleniom fali (pętla onboardingu;
  odinstalowanie Pluginu 1 kasujące produkty Woo) — z jednym wyjątkiem
  opisanym w powodzie 1, gdzie osłabia pierwsze z nich.

## Nieprzyjęte

1. Klasyfikacja sześciu konsumentów `sprawdz` (odpowiedź 2) — zasięg narzędzia
   zamiast zasięgu zjawiska; `smoke-wp-dane` i `smoke-wp-seo` też przerywają.
2. `grep -rl "aai-sklep sprawdz" tools/` jako dowód listy sześciu — komenda
   daje inny wynik niż zacytowany.
3. Agregat „0 martwych na 452" jako dowód wiersza o sześciu gałęziach z 0.65.0,
   wraz z uzasadnieniem niemożliwości identyfikacji — obalone przez
   `git show 59d5852` (werdykt mimo to podtrzymuję na WŁASNYM dowodzie).
4. Dowód wiersza „hasło ×2" — z produktu, nie z bramki, której dotyczy naprawa.
5. QA-R6 „TAK" w zakresie 15 bramek WP — agregat mutacyjny dotyczy strażników.
6. Arytmetyka bloku drzewa („12 pozycji / 9 zgodnych") i opis docblocku
   („9 ponumerowanych reguł").

## Pozycje niemierzalne w tej fali (zamiast złamania zakazu)

- **Powtórzenie testu „10 z 40 żądań w oknie mutacji"** wymaga mutacji pliku
  wtyczki przy pracującej drugiej roli — nie wykonałem. Zweryfikowane zostały
  wszystkie POZOSTAŁE ogniwa tego dowodu (ustawienia opcache, mechanizm zapisu
  mutacji do prawdziwego pliku, rząd wielkości okna, czystość po przywróceniu);
  niezweryfikowany zostaje sam odsetek.
- **Czułość 15 bramek WP** (czy zapalają się po mutacji swojego przedmiotu) —
  z tego samego powodu.

## Ślad krytyka

Zero wierszy dołożonych do dziennika: **nie logowałem się nigdzie** (bez riga,
bez żądań HTTP), a wszystkie pomiary w kontenerze to odczyty (`php -i`,
`wp eval` z samymi `SELECT COUNT`, `wp option get`). Stan po mojej pracy
= stan zastany po przywróceniu przez orkiestrację: `wp_aai_monitor_logowania`
**68**, `wp_aai_monitor_wizyty` **37** (w tym dwa wiersze `/smoke-monitor/`
z 2026-09-05/06, obecne już w zrzucie `k78-baza` — nie moje i nie tej roli),
sprzedaż ZAMKNIĘTA (`option get` kod 1), `git status --porcelain -- ':!audyt'`
pusty. Toru B nie dotykałem ani razu. Niczego nie kasowałem.
