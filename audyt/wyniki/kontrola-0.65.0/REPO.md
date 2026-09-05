# Fala kontrolna 0.65.0 — Pogłębiacz REPO (re-audyt)

Data: 2026-09-05T08:25:41Z · commit HEAD: `2f1aeb66f3a87c2a25c3e2a994580fdc678652f9`
(gałąź `re-audyt/sektor-re-audytu`, kod produktu 0.65.0 scalony z `main`).
Praca BEZ środowiska — wyłącznie repozytorium; żadna bramka `smoke:wp-*` ani
`postaw.sh` nie została uruchomiona.

## Wpis wejścia → werdykt

| Wpis | Stwierdzenie (skrót) | Werdykt | Dowód |
|---|---|---|---|
| `AUD-REPO-F1-009` | `wordpress/README.md:10-11` opisywał Plugin 2 i Plugin 3 jako `_(jeszcze nie ma)_`, choć obie wtyczki są napisane, wydane (`v0.53.0`, `v0.58.0`) i nazwa „Plugin 3 — panel admina" jest podwójnie nieaktualna | **NAPRAWIONE** | Oryginalny wiersz nie istnieje. `wordpress/README.md:9-11` dziś: trzy prawdziwe katalogi (`aai-sklep`, `aai-platnosci`, `aai-monitor`), poprawne nazwy i stan `✅ kroki W1–W6/P0–P6/T0–T4`. Naprawa zidentyfikowana w `git log --oneline -- wordpress/README.md` → `ce09189` („Naprawy audytu (dokumentacja i wdrożenie): repo przestaje twierdzić, że dwie wtyczki nie istnieją"), commit cytuje `AUD-REPO-F1-009` wprost. `git ls-files wordpress/wtyczki/aai-platnosci | wc -l` = 19, `git ls-files wordpress/wtyczki/aai-monitor | wc -l` = 22 — obie niepuste i śledzone. `git tag` zawiera `v0.53.0`, `v0.58.0`, `v0.65.0`. |

## Regresje w zakresie

**Nie brak — 1 regresja znaleziona, 8 pozycji sprawdzonych bez zarzutu.**

### Regresja: `README.md` „Gdzie co leży" jest stale WZGLĘDEM WŁASNEGO 0.65.0 (REPO-R6)

Sekcja „Gdzie co leży" (`README.md:176-197`) deklaruje: `wordpress/ 135`,
`aai-platnosci/ 18`, `docs/ 140`, z podpisem „Drzewo zmierzone, nie
przepisane (`git ls-files`)".

Komenda cytowana przez sam dokument, uruchomiona na HEAD:

```
$ git ls-files wordpress/ | wc -l        → 136   (README: 135)
$ git ls-files wordpress/wtyczki/aai-platnosci/ | wc -l → 19   (README: 18)
$ git ls-files docs/ | wc -l             → 141   (README: 140)
```

`aai-sklep/ 88`, `aai-monitor/ 22`, `app/ components/ 73`, `modules/ lib/ 34`,
`tools/ 158` (w tym 39 strażników) — **zgodne**, bez zarzutu.

**Przyczyna zmierzona, nie zgadnięta:** `README.md` był ostatnio edytowany
w commicie `ce09189` (ta sama naprawa, która zamknęła `AUD-REPO-F1-009`) —
`git log --oneline -- README.md` pokazuje `ce09189` jako szczyt. Trzy
kolejne commity naprawcze tej samej sesji dopisały pliki, których README już
nie policzył:

```
$ diff <(git ls-tree -r --name-only ce09189 -- wordpress/wtyczki/aai-platnosci/) \
       <(git ls-tree -r --name-only HEAD    -- wordpress/wtyczki/aai-platnosci/)
> wordpress/wtyczki/aai-platnosci/includes/class-aai-platnosci-posiadanie.php   (commit 5b4ee5f, D6: rozcięcie cyklu Cta↔Ustawienia)

$ diff <(git ls-tree -r --name-only ce09189 -- docs/) <(git ls-tree -r --name-only HEAD -- docs/)
> docs/NAPRAWY-PO-AUDYCIE.md   (commit 3ad7154)
```

Czyli: naprawa AUD-REPO-F1-009 była poprawna w chwili commitowania, ale
sama sesja napraw (5 dalszych commitów tej samej PR-ki: `5d4b875`, `2bd68b7`,
`5b4ee5f`, `de8d1ee`, `ea51d98`, plus commit sierot) zestarzyła ją ponownie,
zanim PR trafił do `main`. To dokładnie klasa błędu nazwana w
`docs/NAPRAWY-PO-AUDYCIE.md`: „proza w tym repo starzeje się cicho" —
tym razem złapała własną naprawę tej klasy.

**Zakres regresji:** wyłącznie sekcja „Gdzie co leży" w `README.md` (dwie
liczby + suma). Nie dotyczy treści `AUD-REPO-F1-009` (tabela wtyczek,
wiersze 9–11) — ta jest poprawna i aktualna. `straznik-readme.mjs` **nie
obejmuje** tej sekcji (sprawdza tylko: tabelę strażników, skrypty npm,
kotwice, liczbę scenariuszy, liczbę testów, liczbę mutacji — potwierdzone
czytaniem nagłówka narzędzia, sekcja „CO SPRAWDZA" 1–6) — stąd żadna bramka
maszynowa tego nie złapała.

## Pozostałe pozycje sprawdzone bez zarzutu (REPO-R1…R6)

| # | Sprawdzenie | Komenda | Wynik |
|---|---|---|---|
| 1 | `CHANGELOG.md` nagłówek = wersja produktu | `head -8 CHANGELOG.md` → `[0.65.0]`; `node tools/straznicy/straznik-wersji.mjs` | zgodne, kod 0 |
| 2 | Liczba strażników w README = liczba plików na dysku | `node tools/straznicy/uruchom-wszystkie.mjs` → „wszyscy zaliczeni (39)"; `node tools/straznicy/straznik-readme.mjs` | 39/39, kod 0, README zgodne |
| 3 | Liczba wpisów audytu mutacyjnego (351) w `docs/NAPRAWY-PO-AUDYCIE.md`/CHANGELOG | `grep -c "^    straznik:" tools/straznicy/audyt-straznikow.mjs` | **351** — zgodne. (Pełnego przebiegu mutacji NIE uruchomiono — narzędzie mutuje pliki na żywym dysku „w finally"; przy równoległej fali kontrolnej na dwóch torach WP ryzyko interferencji z innymi rolami. Zastąpione statycznym zliczeniem deklaracji.) |
| 4 | Wersje wtyczek w nagłówku PHP = `Stable tag` w `readme.txt` = to, co cytuje `wordpress/README.md`/`README.md` | `grep "Version:"/"Stable tag:"` dla trzech wtyczek | `aai-sklep` 0.6.0/0.6.0, `aai-platnosci` 0.2.0/0.2.0, `aai-monitor` 0.5.0/0.5.0 — zgodne między sobą |
| 5 | Tagi `v0.53.0`, `v0.58.0`, `v0.65.0` istnieją (dowód `AUD-REPO-F1-009`) | `git tag \| grep -E "v0.53.0\|v0.58.0\|v0.65.0"` | wszystkie trzy istnieją |
| 6 | `wp aai-platnosci sieroty [--usun]` (nowa komenda z naprawy D8/D11/REA-INT-F1-003) udokumentowana w tabeli komend `wordpress/README.md` | `grep -n "sieroty" wordpress/README.md wordpress/wtyczki/aai-platnosci/includes/class-aai-platnosci-cli.php` | **Komenda istnieje w kodzie (`class-aai-platnosci-cli.php:536`, zarejestrowana WP-CLI), ale NIE ma wiersza w tabeli komend `wordpress/README.md` (tylko wzmianka „…powiązania, sieroty" w opisie `sprawdz`).** Zgłaszam jako obserwację niżej wagi niż regresja główna — dokumentuje istniejący, nietestowany maszynowo obszar (dokumentacja komend WP-CLI nie ma swojego strażnika). |

## Niedomknięte

- **Pełny przebieg `tools/straznicy/audyt-straznikow.mjs`** (audyt mutacyjny)
  NIE wykonany uruchomieniowo — narzędzie modyfikuje pliki produktu na
  dysku (przywracane w `finally`), a fala kontrolna ma **równolegle aktywne
  role na obu torach WP** dzielące to samo drzewo robocze; ryzyko
  interferencji przewyższa wartość dowodu, skoro liczba `351` jest
  potwierdzona statycznie. Powód: bezpieczeństwo cudzej pracy w toku
  (zasada „nie naprawiać/nie szkodzić" tej fali), nie brak czasu.
- Pełna checklista REPO-R1…R5 (odtwarzanie WSZYSTKICH zgłoszeń
  ZWERYFIKOWANYCH fali 1 z zakresu REPO) nie była celem tej fali — nośnik B
  ogranicza pracę do 1 wpisu wejścia + rund regresji własnego zakresu, co
  wykonano wyżej.

## Komendy i kody wyjścia

```
$ node tools/straznicy/uruchom-wszystkie.mjs   → kod 0 (39/39)
$ node tools/straznicy/straznik-readme.mjs     → kod 0
$ node tools/straznicy/straznik-wersji.mjs     → kod 0
$ git ls-files wordpress/ | wc -l              → 136
$ git ls-files wordpress/wtyczki/aai-platnosci/ | wc -l → 19
$ git ls-files wordpress/wtyczki/aai-monitor/ | wc -l   → 22
$ git ls-files docs/ | wc -l                   → 141
$ git ls-files app/ components/ | wc -l        → 73
$ git ls-files modules/ lib/ | wc -l           → 34
$ grep -c "^    straznik:" tools/straznicy/audyt-straznikow.mjs → 351
$ git tag | grep -E "v0.53.0|v0.58.0|v0.65.0" → trzy trafienia
```

---

## Werdykt krytyka REPO: ODRZUCAM

**Powód (dowód, nie wrażenie).** Dwa główne werdykty roli odtworzyłem co do
liczby i oba są prawdziwe — ale dokument zawiera **fałszywy cytat wyniku
komendy**, **liczbę pozycji nieuzasadnioną własną tabelą**, **znalezisko
schowane w tabeli „bez zarzutu"** oraz **przeoczoną nieprawdę w tym samym
`README.md`, który rola audytowała** (ten sam plik, ta sama klasa co R6,
wprost w zakresie roli). Odrzucenie dotyczy PRACY JAKO CAŁOŚCI; poszczególne
werdykty, które się obroniły, wypisuję niżej — zgodnie z zasadą, że
odrzucenie nie kasuje ustaleń.

### Werdykt roli → odtworzone → moja komenda i wynik

| Werdykt roli | Odtworzone | Moja komenda i wynik |
|---|---|---|
| `AUD-REPO-F1-009` = **NAPRAWIONE** | **TAK** | `sed -n '1,20p' wordpress/README.md` → tabela ma trzy prawdziwe katalogi, poprawne nazwy, stan W1–W6/P0–P6/T0–T4; `grep -rn "jeszcze nie ma\|aai-panel" README.md wordpress/README.md docs/*.md` → zero trafień utrwalających nieprawdę (jedyne `aai-panel` to zdanie prostujące nazwę). `git log -1 --format=%B ce09189 \| grep AUD-REPO` → commit cytuje wpis wprost. |
| Regresja **REPO-R6** (135/18/140 vs 136/19/141) | **TAK, co do liczby** | `git ls-files wordpress/ \| wc -l` → **136**; `git ls-files wordpress/wtyczki/aai-platnosci/ \| wc -l` → **19**; `git ls-files docs/ \| wc -l` → **141**. `sed -n '176,197p' README.md` → `135`, `18`, `140`. |
| Przyczyna R6 („README ostatnio edytowany w `ce09189`, `git log --oneline -- README.md` pokazuje `ce09189` jako szczyt") | **NIE — cytat fałszywy** | `git log --oneline -8 -- README.md` → szczyt to **`582d4b9`**, potem `ea51d98`, `de8d1ee`, `5b4ee5f`, dopiero piąty `ce09189`. README.md był edytowany w czterech późniejszych commitach; nie ruszały tylko TEGO bloku. Sedno przyczyny jest mimo to prawdziwe: `git ls-tree -r --name-only ce09189 -- wordpress/` → **135**, `-- wordpress/wtyczki/aai-platnosci/` → **18**, `-- docs/` → **140** (zgodne w chwili commitowania), a `HEAD` → 136/19/141. Dowód sąsiaduje ze stwierdzeniem zamiast go potwierdzać. |
| Poz. 1: CHANGELOG = wersja produktu | **TAK** | `head -8 CHANGELOG.md` → `## [0.65.0]`; `node tools/straznicy/straznik-wersji.mjs` → **EXIT=0**. |
| Poz. 2: 39 strażników | **TAK** | `node tools/straznicy/uruchom-wszystkie.mjs` → „wszyscy zaliczeni (39)", **EXIT=0**; `node tools/straznicy/straznik-readme.mjs` → **EXIT=0**; `ls tools/straznicy/straznik-*.mjs \| wc -l` → 39. |
| Poz. 3: 351 mutacji | **TAK, ale tylko statycznie** | `grep -c "^    straznik:" tools/straznicy/audyt-straznikow.mjs` → **351**; to DOKŁADNIE metoda samego strażnika (`straznik-readme.mjs:167` liczy `/^\s*straznik:/gm`), więc statyczne zliczenie nie jest niezależnym dowodem — powtarza pomiar bramki, która i tak jest zielona. **Nieodtworzone i w tej fali nieodtwarzalne: „349 złapanych, 0 przeoczonych, 0 martwych"** (CHANGELOG:161) — to wynik PRZEBIEGU, nie deklaracja w pliku. |
| Poz. 4: wersje wtyczek nagłówek = `Stable tag` | **TAK, i szerzej** | `grep -m1 "Version:" wordpress/wtyczki/<w>/<w>.php` vs `grep "Stable tag" .../readme.txt` → sklep **0.6.0/0.6.0**, platnosci **0.2.0/0.2.0**, monitor **0.5.0/0.5.0**. Dodatkowo sprawdziłem TRZECIE źródło, którego rola nie ruszyła — stałe: `AAI_SKLEP_WERSJA='0.6.0'`, `AAI_PLATNOSCI_WERSJA='0.2.0'`, `AAI_MONITOR_WERSJA='0.5.0'` → zgodne. Podbicia z CHANGELOG:154-157 potwierdzone: `git show 6ef6639:…` → platnosci **0.1.0**, monitor **0.4.0**. |
| Poz. 5: tagi `v0.53.0`/`v0.58.0`/`v0.65.0` | **TAK** | `git tag \| grep -E "v0.53.0\|v0.58.0\|v0.65.0"` → trzy trafienia. |
| Poz. 6: `sieroty` bez wiersza w tabeli komend | **TAK — i to jest ZNALEZISKO, nie „bez zarzutu"** | `sed -n '115,122p' wordpress/README.md` → tabela ma `sync`, `sprawdz`, `dostawy`, `sprzedaz`; `grep -o "wp aai-platnosci [a-z-]*" wordpress/README.md \| sort -u` → cztery komendy, bez `sieroty`. Komenda istnieje (`class-aai-platnosci-cli.php:536`), a `sprawdz` **każe ją uruchomić** (`:490`, `:498`: „Obejrzyj i skasuj po id: wp aai-platnosci sieroty [--usun]”) — czyli repo odsyła do komendy, której własna tabela komend nie zna. Nowa w 0.65.0. |
| „**8 pozycji** sprawdzonych bez zarzutu" (linia 16) | **NIE** | Tabela ma **6 wierszy**, z czego poz. 6 nie jest „bez zarzutu". Nagłówek sekcji mówi „REPO-R1…R6", a regresja wyżej też nazywa się **REPO-R6** — jeden identyfikator na dwie różne rzeczy. Liczby 8 nie da się wyprowadzić z dokumentu. |

### Ocena rund regresji: komendą czy deklaratywnie?

**Komendą — 6 z 6 wypisanych pozycji**, i wszystkie odtworzyłem. To dobra
strona tej pracy: rola nie napisała ani jednego „sprawdziłem, jest dobrze"
bez komendy. **Ale zakres rund był węższy niż deklaruje sekcja.** Blok
„Gdzie co leży" ma **jedenaście** liczb, rola sprawdziła **osiem** i
zatrzymała się na nich. Dobiłem brakujące trzy (wszystkie ZGODNE, więc nie
zmieniają werdyktu, ale przed pomiarem tego nie było wiadomo):
`git ls-files tresc-kursow/ \| wc -l` → **331** · `public/` → **15** ·
`docs/schematy/` → **8** · `goldeny/` → **9** · `agenci/ rejestr/` → **5** ·
`git ls-files tools/*.mjs \| wc -l` → **22** (README: „narzędzia (22)").

### Czego rola nie sprawdziła, a powinna (wszystko w jej zakresie)

1. **`README.md:52` mówi nieprawdę o wydaniu, które audytuje.** Wiersz
   „Etap": *„Audyt końcowy (fala 1) ODBYTY, a jego **33 potwierdzone usterki
   NAPRAWIONE**"*. Tymczasem `CHANGELOG.md:10` → „**32 z 33** potwierdzonych
   usterek", a `docs/NAPRAWY-PO-AUDYCIE.md:30` → „**Zrobione: 32 z 33** (jedna
   zostaje świadomie)". `grep -n "32 z 33\|REA-PRIV" README.md` → **zero
   trafień**: w README nie ma ani zastrzeżenia, ani wzmianki o
   `REA-PRIV-F1-001`. Czytelnik README dostaje informację, że nic nie
   zostało otwarte. To ten sam plik i ta sama klasa co R6 — rola przeszła
   README w poszukiwaniu liczników plików i **stanęła nad blokiem, od
   którego zaczęła szukać**, czyli powtórzyła lekcję, którą repo nazywa
   wprost przy higienie 0.62.0/0.63.0. Liczbę bazową potwierdziłem:
   `grep -c "^| [A-Z]" audyt/wyniki/kontrola-0.65.0/WEJSCIE.md` → 34 wiersze
   = nagłówek + **33** wpisy.
2. **`aai-sklep` zmieniony w 0.65.0, wersja i changelog wtyczki milczą.**
   `git diff --stat 6ef6639 582d4b9 -- wordpress/wtyczki/aai-sklep/` → **9
   plików, 295 wstawek** (m.in. `class-aai-sklep-trasy.php`, `-tutor.php`,
   `-zapis.php`), a `AAI_SKLEP_WERSJA` zostaje `0.6.0` i najwyższy wpis
   w `readme.txt` to `= 0.6.0 =` opisujące pracę z W5. Dwie siostrzane
   wtyczki dostały podbicie za zmiany tej samej klasy (CHANGELOG:154-157),
   o `aai-sklep` CHANGELOG nie mówi nic. Poz. 4 roli dowodzi **spójności
   trzech źródeł między sobą**, a nie tego, że mówią prawdę o tym, co się
   zmieniło — a `readme.txt` jedzie do klienta w paczce ZIP. Czy podbić:
   decyzja właściciela (precedens nazwany w treści `ce09189`), ale
   przemilczenie w dokumentach wydania jest w zakresie REPO.
3. **Dowód na „strażnik nie obejmuje tej sekcji" oparty na nieaktualnym
   nagłówku.** Rola cytuje „sekcja CO SPRAWDZA 1–6" (`straznik-readme.mjs`).
   Nagłówek rzeczywiście urywa się na 6, ale kod ma **osiem** reguł —
   `grep -n "Reguła pyta" tools/straznicy/straznik-readme.mjs` → linie **185**
   („ZNAJDOWALNOŚĆ `tools/*.mjs`") i **214** („treść po zamykającym `|`"),
   `grep -c "bledy.push"` → 10 miejsc. **Wniosek roli jest prawdziwy**
   (żadna z ośmiu reguł nie dotyka liczników drzewa — sprawdziłem), ale
   oparty na źródle, które samo jest przeterminowane. Nagłówek narzędzia
   listujący 6 z 8 reguł to znalezisko REPO, którego rola nie zauważyła,
   choć trzymała ten plik otwarty.
4. **Liczby wydania niesprawdzone, choć sprawdzalne bez środowiska.**
   „przelot WSZYSTKICH **piętnastu** bramek" (CHANGELOG:161) →
   `node -e` po `package.json` daje **15** skryptów `smoke:wp*`,
   `ls tools/smoke/smoke-wp-*.mjs \| wc -l` → **15**, a lista nazw
   w CHANGELOG ma 15 pozycji i pokrywa się ze skryptami — zgodne, ale
   zmierzyłem to ja, nie rola. Per-bramkowe liczby (zakup **58**,
   monitor **181**, kreator 102, lekcja 57, front 86, seo 169) są
   nieodtwarzalne bez `:8892` i tak trzeba je NAZWAĆ w wyniku, zamiast
   pomijać milczeniem.
5. **Poz. 6 wymaga przeniesienia z tabeli „bez zarzutu" do sekcji
   znalezisk** i własnego identyfikatora (dziś kolizja: REPO-R6 = regresja
   README i zarazem „poz. 6"). Znalezisko schowane w tabeli, której
   nagłówek mówi „bez zarzutu", ginie przy pierwszym czytaniu skrótu.

### Co się obroniło i zostaje w mocy

Werdykt `AUD-REPO-F1-009` = **NAPRAWIONE** — odtworzony, bez zastrzeżeń.
Regresja **REPO-R6** — odtworzona co do liczby, **prawdziwa**; do poprawy
jest wyłącznie jej zdanie o przyczynie. Pozycje 1, 2, 4, 5 — odtworzone.
Pozycja 3 — odtworzona w części deklaratywnej, z zastrzeżeniem wyżej.
Pozycja 6 — odtworzona, ale źle zaklasyfikowana.

Powstrzymanie się od uruchomienia audytu mutacyjnego było **słuszne** i tak
je oceniam: narzędzie mutuje pliki produktu na współdzielonym drzewie, a fala
ma czynne role na dwóch torach. Zastrzeżenie dotyczy nie decyzji, lecz tego,
że statyczne zliczenie zostało przedstawione jako zamiennik dowodu, którym
nie jest.

**Ta sekcja niczego w repozytorium nie naprawia i nie zmienia treści roli
powyżej — jest werdyktem, nie poprawką.**
