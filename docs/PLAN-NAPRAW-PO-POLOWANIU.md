# Plan napraw po polowaniu — kolejność wg SZKODY DLA KLIENTA

**To NIE jest wynik sektora.** Materiał wykonawczy do napraw na gałęzi od `main`.
Powstał 2026-09-05 z trzech sond polowania (13 znalezisk w płatnościach,
29 w architekturze, 8 w dokumentacji = **50**) plus otwarte pozycje fali
kontrolnej 0.65.0.

**Gdzie leży materiał źródłowy.** Pełne raporty sond
(`PLATNOSCI.md`, `ARCHITEKTURA.md`, `DOKUMENTACJA.md`) i wyniki działów fali
kontrolnej leżą **na gałęzi sektora `re-audyt/sektor-re-audytu`**, w
`audyt/wyniki/polowanie-mariusz/` i `audyt/wyniki/kontrola-0.65.0/`. **`main`
nie ma katalogu `audyt/` i to jest celowe** — sektory audytu żyją na własnych
gałęziach (niezmiennik sektora: `git diff main --name-only -- . ':!audyt'`).
Ten plik jest ich wyciągiem wykonawczym, przeniesionym na `main`, bo naprawy
robi się właśnie stąd.

## Decyzje właściciela z 2026-09-05 (wiążące)

1. **„Ukryj" ZOSTAJE kupującym** — ukryty kurs znika z katalogu, wyszukiwarki
   i sprzedaży, ale **zostaje w „Moich kursach" tego, kto go kupił**, z etykietą
   o wycofaniu ze sprzedaży. To dotrzymanie decyzji **C1** (2026-08-31), nie jej
   zmiana. Odrzucone: „zostaw jak jest, tylko ostrzegaj" oraz „dołóż inną drogę".
2. **Zakres: WSZYSTKO, co znaleźliśmy.** Agent zgłosił, że ~50 pozycji nie zmieści
   się do niedzieli przy dyscyplinie tego repo (gałąź → test negatywny → bramki →
   PR → zielone CI); właściciel potwierdził zakres. Konsekwencja robocza:
   **naprawy idą w kolejności poniżej, a po każdej turze podawana jest liczba
   pozostałych** — żeby ciąć dało się w dowolnym momencie, a nie dopiero na końcu.
3. **Polowanie domykamy tylko na terenie QA/testy.** Teren „audyt" (0,5 pkt,
   dotyczy narzędzi sektora, nie produktu) — odłożony.

## Skąd priorytety

Nie z ocen zewnętrznego recenzenta, tylko z pytania **„kto i co przez to traci"**.
Oceny Mariusza (płatności 8 · dokumentacja 8,5 · architektura 9 · QA 9 · audyt 9,5 ·
security/SEO/BD 10) wskazały TEREN i to zadziałało — ale w tym terenie znaleźliśmy
częściowo co innego, niż on widział. Dowód, że jego lista nie jest nadzbiorem naszej:
dał **security 10/10**, a mamy tam czynny wyciek fragmentów haseł.

---

## P0 — klient płacący traci coś ALBO instalacja jest niemożliwa

| # | Pozycja | Źródło | Sedno |
|---|---|---|---|
| 1 | **„Ukryj" zabiera kupującemu drogę do kursu** | Z-0 + MAR-A-01, potwierdzone pomiarem na `klient-test` | 2 zapisy w Tutorze, `ma_kursy()=NIE`, `kursy()=0`; strona mówi „nie ma żadnego kursu". Naprawa: rozdzielić `lista_kursow()` na dwa pytania (katalog vs moje kursy) i przejść **wszystkich 12 konsumentów** — 5 ma złą semantykę, w tym `sync` i kontrola rozjazdu P2 |
| 2 | **Fragmenty haseł w dzienniku logowań** | AUD-PRIV-F1-001, krytyk PRIV | `sanitize_user($x,true)===$x` uznaje każde hasło bez znaku specjalnego za login → `PRI…(23 znaków)` na 90 dni; także przez `/my-account/`; polityka twierdzi, że haseł nie zapisujemy |
| 3 | **13 rejestracji pod jednym `try`, zamek wycieku OSTATNI** | MAR-A-06, potwierdzone w kodzie | `aai-sklep.php:150`; pierwsza rejestracja to odwołanie do BAZY. Rzut w którejkolwiek z 12 wcześniejszych → `Aai_Sklep_Lekcja::zarejestruj()` (`:63-64`) nie zakłada zamków → `?post_type=lesson` znowu oddaje **73 lekcje** anonimowi. Witryna działa, notka widoczna tylko dla admina |
| 4 | **`postaw.sh` PADA u obcego klienta + rozjazd wersji w 9 plikach** | M1 + WDR + krytyk WDR | `wp plugin install woocommerce` bez `--version` ciągnie Woo wymagające WP ≥ 7.0 przy obrazie 6.9.4; `set -euo pipefail` przerywa całość. Obietnica „WordPress 6.5+" nieprawdziwa. **9 miejsc, nie 4** — dochodzą `docs/plugin-1/schematy.drawio:120` i podgląd SVG (pilnowany po `sha256`) |
| 5 | **Instalator P2 przestawia 13 cudzych ustawień bez punktu przywracania** | MAR-A-02 | Woo, Tutor, treść dwóch stron; deaktywacja cofa **jedną**; wartość „przed" żyje tylko na wyjściu CLI. Klient wyłączający wtyczkę zostaje z Tutorem w trybie `wc` bez szwu |

## P1 — dane albo decyzje właściciela obchodzone po cichu

| # | Pozycja | Źródło |
|---|---|---|
| 6 | `post_status => 'any'` nie obejmuje kosza → duplikat kopii → `kupujacy()`=0 → **hamulec C2 nie pyta o kupujących** | Z-9 |
| 7 | Okno bez znacznika przy tworzeniu produktu Woo; `sync` tworzy drugi produkt, `sprawdz` kod 0 | AUD-BD-F1-001 (krytyk BD) |
| 8 | `dostawy` bez drogi zamknięcia wpisu → kontrola kod 1 **na zawsze** → blokuje `postaw.sh`, czyli krok zerowy każdego testu ręcznego | Z-2 |
| 9 | `usun_nadmiar()` kasuje na twardo wpisy z Course Buildera wbrew obietnicy README/CLAUDE.md | Z-10 |
| 10 | Zamówienie MIESZANE zostawia `wp_tutor_earnings` + 3 notatki | REA-INT-F1-003 (krytyk INT) |
| 11 | Hamulce operacji niszczącej degradują na „zezwól" (`0` nieodróżnialne od zmierzonego zera); 2 z 7 szwów permisywne | MAR-A-03 |
| 12 | `ma_kursy()` w menu bez `try/catch` → awaria Tutora daje 500 na całej witrynie, **łącznie z kasą** | Z-12 |
| 13 | Kolektor CSP przyjmuje `application/json` bez integralności; dziennik logowań bez sufitu (28 wierszy/1,4 s) | REA-SEC-F1-003 (krytyk SEC) |

## P2 — bramki ślepe (każda UKRYWA kolejne błędy)

| # | Pozycja | Źródło |
|---|---|---|
| 14 | Obie bramki dowodzące C1 sprawdzają **bezpośredni adres lekcji** — drogę, której klient nie zna; jedynej, którą ma, nie sprawdza nic | znalezione przy Z-0 |
| 15 | Dwie asercje `smoke-wp-zakup` „zamek 1 nie trzyma" — zdjęcie zamka daje 58/58 | krytyk QA |
| 16 | 6 z 17 nowych gałęzi strażników 0.65.0 bez dedykowanej mutacji | krytyk QA |
| 17 | Bramka ochrony Course Buildera tworzy obcy wpis **bez `post_parent`** — obiekt, którego pętla nie odwiedza. **Dziewiąty test po pustce w tym projekcie** | Z-10 |
| 18 | `readme.txt` i `Version` wtyczek nie pilnuje ŻADEN strażnik → **dwa różne archiwa `aai-sklep-0.6.0.zip`**; `paczki/` nieczyszczone | krytyk WDR |
| 19 | Kontrola waluty wychodzi kodem 0 **przed** sprawdzeniem waluty przy nieaktywnym Pluginie 1 | krytyk WDR |
| — | **teren QA/testy do przeszukania** (decyzja 3) — sonda jeszcze nieuruchomiona | — |

## P3 — dokumentacja (wszystkie potwierdzone komendą)

| # | Pozycja | Źródło |
|---|---|---|
| 20 | `CONTRIBUTING.md` nigdy nie przeszedł higieny (2026-08-30 vs 2026-08-31): „3 bazy" (jest 1), branch „od `plugin-X-…`" (nigdy nie istniały), „hosting Node.js" (zastąpiony 2026-08-18). **Dokument źródłowy nr 4 w CLAUDE.md** | D1 |
| 21 | README:451 nazywa `docs/security-checklist.md` „utrzymywanym"; plik nietknięty od 2026-08-19, **zero** wzmianek o trzech wtyczkach, Woo i Tutorze | D2 |
| 22 | README:54 „higiena repo — TRWA" przeczy README:52 **dwa wiersze wyżej**; ten sam wiersz mówi „audyt — wytyczne poda właściciel" | D5 |
| 23 | `docs/plugin-3/DIAGRAM.md:632-633` — 4 i 5 komórek przy nagłówku o 3 → **2677 znaków niewidocznych na GitHubie**; `straznik-readme` czyta tylko README | D3 |
| 24 | `straznik-csp` mówi „Dziewięć" i wypisuje 10; `straznik-limitera` „Jedenaście" i 13; błąd w **trzech** dokumentach | D4 |
| 25 | README:159 — 2 tabele Pluginu 3 zamiast 3 (lista do backupu pomija sól podpisu); „CI: cztery joby" → 5; `wordpress/README.md` opisuje 3 z 8 komend | D6, D7, D8 |
| 26 | README:52 „33 usterki NAPRAWIONE" (jest 32 z 33); liczniki 135/18/140 vs 136/19/141; `aai-sklep` 9 plików bez podbicia wersji; nagłówek `straznik-readme` 6 reguł przy 8 | krytyk REPO |

## P4 — reszta (pełna lista w raportach sond)

- **Architektura**: MAR-A-04, 05 (zawężone przez agenta głównego — `straznik-granic` skanuje prototyp i jest o tym uczciwy), 07–29 (26 pozycji).
- **Płatności**: Z-1, Z-3 … Z-8, Z-11 (8 pozycji).
- **Prototyp**: `materialy: .default([])` kasuje materiały lekcji — ta sama klasa, którą produkt zamknął w 0.65.0 (`REA-BE-F1-001`); prototyp jest specyfikacją wykonawczą, więc dziś przeczy produktowi.
- **M2 (maile)**: brak `Reply-To`; `wyslano` znaczy „PHPMailer przyjął", nie „klient dostał", i nigdzie tego nie napisano; martwe miejsce przy `admin_email = wordpress@host`.
- **Do decyzji właściciela, nie do naprawy**: `REA-PRIV-F1-001` (polityka prywatności — treść prawna, prawnik, „przed pierwszym klientem").

## Reguły wykonania (z WYTYCZNE i z lekcji tego repo)

1. Gałąź od `main`, **nigdy w sektorze** (zasada 2: sektory nie naprawiają).
2. Każda naprawa: **test negatywny** — bez niego nie wiadomo, czy bramka mierzy swoje.
3. Wzorce strażników celują w **ROZSTRZYGNIĘCIE**, nie w nazwę ani napis — dziewięć nawrotów tej pułapki w tym projekcie.
4. Kody wyjścia **bez potoku** (`| tail` je maskuje; w zsh zmienna to `pipestatus`).
5. Po każdym `npm run dev`: `git diff --stat CLAUDE.md` i `git checkout -- CLAUDE.md` (Next 16 ucina plik o 2355 linii).
6. Po przełączeniu gałęzi: `podman-compose down && ./postaw.sh` (bind mount trzyma inode).
7. PHP wtyczek edytować tylko, gdy żaden smoke ani `postaw.sh` nie biegnie na `:8892`.
