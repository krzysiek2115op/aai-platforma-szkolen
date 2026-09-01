# Krytyka planu i realizacji sektorów — okiem krytyka (2026-09-02)

Polecenie właściciela nr 3 po E7.6: *„chcemy doprowadzić ten projekt audytowy
do perfekcji, żeby znalazł KAŻDY możliwy błąd w projekcie"*. Ten dokument robi
to, co robi każdy krytyk sektora: **domyślnie odrzuca** i przepuszcza tylko to,
co ma dowód. Przedmiotem nie jest produkt, tylko **sektory** — więc propozycje
napraw są tu dozwolone (W2 zakazuje naprawiać produkt, nie audyt).

**Dokument przeszedł własną bramkę.** Pierwszą wersję (17 znalezisk) ocenił
niezależny krytyk (agent `sedzia`, domyślnie odrzucający, 56 wywołań narzędzi):
**9 POTWIERDZONYCH, 7 OSŁABIONYCH, 1 OBALONE**, sześć kolizji w tabeli
propozycji i pięć przeoczeń — werdykt BLOKUJĘ. Wersja poniżej nanosi wszystko:
osłabione znaleziska mają poprawione dowody, obalone jest wycofane
(sekcja „Wycofane"), kolizje są usunięte z propozycji, a pięć przeoczeń weszło
jako znaleziska B8–B12 — z których B12 jest już **zamknięte kodem**.

Materiał: plan (wersja 4), `REGULAMIN.md`, `ROLE.md` × 2, 80 definicji,
12 narzędzi, dwie próby na sucho (E6, E7.6), wykonanie poleceń 1 i 2
(`WERYFIKACJA-PLANU.md`), werdykt sędziego. Każde znalezisko ma dowód komendą;
hipotezy są nazwane.

## Werdykt w trzech zdaniach

Sektory są zbudowane **rzetelnie jako maszyna do powtarzalnego sprawdzania
listy** — bramka odmawia wpisu bez dowodu, goldeny są mierzone tą samą funkcją,
co prawdziwe zgłoszenia, strażnik ma 22 kontrole i 68 mutacji, a obie próby
wyciągnęły usterki sektora, zanim zrobił to ktoś z zewnątrz. **Nie są jeszcze
maszyną do znajdowania KAŻDEGO błędu**: lista sprawdzeń znajduje klasy, które
ktoś już nazwał — 15 z 177 pozycji powstało wprost z rejestru 30 klas `BLAD-*`
(`ROLE.md:650-690`), a trzydziesta pierwsza klasa nie ma pozycji z definicji.
Do tego pięć rzeczy, na których stoi obietnica powtarzalności (K4′), żyje
dziś tylko w prozie promptów albo na kruchym kluczu: ślepota fali 2, kolejność
wejść, kanoniczny prompt roli, pokrycie każdej kontroli testem negatywnym
i **hash miejsca liczony z numeru linii**.

Poniżej **21 znalezisk** (16 z pierwszej wersji po korekcie + 5 sędziego)
w trzech klasach: A — bez tego audyt nie znajdzie każdego błędu; B — bez tego
wynik nie będzie wiarygodny (K4′); C — bez tego przebieg nie dojedzie do
końca. Potem: co zachować, wiedza z budowy, propozycje z kosztem, wycofane.

---

## A. Dlaczego audyt w tej postaci NIE znajdzie każdego błędu

### A1. Checklista znajduje klasy nazwane; trzydziesta pierwsza klasa nie ma pozycji z definicji

**Dowód.** `ROLE.md:650-690` odwzorowuje 30 klas `BLAD-*` na pozycje i notuje,
że „15 pozycji checklist powstało właśnie z tego przelotu"; `grep -nE
"^\| [A-Z]+-X" audyt/ROLE.md re-audyt/ROLE.md` → **0** pozycji otwartych.
Najcięższe błędy z historii repo (wyciek 73 lekcji, rozbicie klasy CSS
podmianą prefiksu, moduły przemianowane zapisem, sierota `tutor_enrolled`)
**mają dziś pozycje** — `SEC-06`, `FE-02`, `BD-12` — bo weszły do listy PO
tym, jak ktoś je nazwał. Sędzia słusznie obalił moją pierwszą wersję tego
zdania („żadna nie ma pozycji"); teza zostaje: pozycje istnieją, bo błędy
już się zdarzyły. Obie próby na sucho dały dwa znaleziska o sektorze na jedno
o produkcie.

**Konsekwencja.** K4′ („swobodny przegląd nie da tego samego wyniku") jest
prawdziwe — i dlatego sektor nie robi przeglądu swobodnego. Cena tego wyboru
nie jest nigdzie napisana: **audyt znajdzie to, co ma na liście, i nic ponadto.**

**Propozycja (do decyzji właściciela, bo modyfikuje K4′).** Jedna pozycja
otwarta na dział, **o kodzie numerycznym z zakresu 90–99** (np. `SEC-90`), bo
`KOD_POZYCJI` (`wspolne.mjs:166`) i reguły 7/13 strażnika liczą pozycje
wzorcem `<KOD>-[A-Z]?\d+` — litera `X` byłaby dla nich niewidzialna. Rygor
dowodu bez zmian. Porównanie fal: wpisy z pozycji 90–99 są **raportowane
osobno i liczone**, nigdy pomijane — inaczej powstaje furtka „przypisz do 90
i rozjazd znika". Klucz porównania to hash miejsca, więc pozycja jest polem
wpisu (`pozycja`), nie kluczem; filtr jest trywialny. Koszt: S.

### A2. Cztery z sześciu pozycji Pogłębiacza są ograniczone do klas, które znalazła fala 1 audytu

**Dowód.** `grep "^| [A-Z]*-R[0-9]* |" re-audyt/ROLE.md | grep -c -i "wpis\|zgłosze\|audyt"`
→ **75 ze 127** wspomina wpisy audytu. Sędzia rozbił to trafniej: na dział
`R1` i `R3` czysto wzmacniają (odtwórz, utrzymaj klasyfikację) — **2 z 6**;
`R2` liczy zasięg ZNALEZIONEJ klasy; `R4` i `R5` szukają przeoczeń audytu,
ale **wśród klas z fali 1** („lista klas z fali 1", `SEC-R5`); tylko `R6`
mierzy obszar niezależnie. Próba E7.6: `SEC-R1…R5` „BEZ MATERIAŁU".

**Konsekwencja.** Dział, w którym audyt nic nie znalazł, dostaje re-audyt
o mocy jednej pozycji (`R6`). Klasa, której nie nazwał ani audyt, ani
rejestr `BLAD-*`, nie ma w re-audycie wejścia.

**Propozycja.** Dla każdego Pogłębiacza co najmniej połowa pozycji jako
pomiar WSZYSTKIEGO w obszarze niezależnie od wyników audytu (typ `R6`:
wejścia, zapytania, zapisy do tabel, ucieczki wyjścia, haki cudzych wtyczek),
z listą zmierzonych elementów jako dowodem. Koszt: M.

### A3. Siedem szwów ma właścicieli, ale nie ma pozycji „ścieżka wartości od źródła do ostatniego czytelnika"

**Dowód.** `ARCH-01` pyta o martwy szew, `ARCH-R6` o to, czy szew się
wywołuje (potwierdzone przez sędziego); żadna pozycja żadnego działu nie pyta
o **przejście wartości** przez łańcuch zapis Pluginu 1 → akcja → produkt Woo
→ cena na stronie. `INT-08` wymienia `_price` dosłownie (mój pierwszy przykład
był chybiony), ale jako pole cudzego kodu, nie jako koniec ścieżki.

**Propozycja.** Siedem szwów = siedem pozycji „wartość od źródła do ostatniego
czytelnika, każdy przeskok z dowodem" w ARCH i siedem pomiarów w `rea-arch`.
Koszt: S.

### A4. Konrad pyta, czy KLASA ma pozycję; nikt nie pyta, czy POZYCJA łapie klasę

**Dowód.** `grep -oE "KON-[A-Z][0-9]+" audyt/ROLE.md` → wyłącznie `KON-A1…A6`
— **faza B nie ma ani jednej pozycji**. `KON-A3` pyta o klasę bez pozycji
(kierunek klasa → lista) i ten przelot już wykonano (`ROLE.md:650-690`).
Kierunku odwrotnego — czułości pozycji — nie pyta nic; usterki pozycji
(`PIK-08` w E6, `SEC-R6` w E7.6 → `REA-SEC-002`) znaleźli krytycy
przypadkiem.

**Propozycja.** Faza A′: dla każdej pozycji wskazać jeden REALNY błąd
z rejestru, który ta pozycja by złapała — pozycja bez takiego błędu jest
podejrzana o dekorację; i pozycje `KON-B1…Bn` dla fazy B, której dziś nie ma.
Koszt: M (jednorazowo, ~300 pozycji).

### A5. Kursy poza zakresem — a liczby programu na stronie sprzedażowej wynikają z treści kursów

**Dowód.** D4 wyklucza **331** plików `tresc-kursow/` (`git ls-files
tresc-kursow | wc -l`; 399 to całe wykluczenie D4 razem z cudzą
dokumentacją). Rozjazd z 0.33.0 (strona obiecywała moduł, którego nie było)
był rozjazdem LICZB, nie prozy. Zgodność treści bazy z plikami ma już pozycję
`BD-R6` (`re-audyt/ROLE.md:180`, `wp:import ×3` + `wp:sprawdz`) — mój
pierwszy zapis tego nie widział.

**Propozycja (zawężona).** Nie cofać D4. Do PIK jedna pozycja: liczba
modułów / lekcji / minut na stronie sprzedażowej = liczba w tabelach, bez
czytania prozy. Koszt: XS.

---

## B. Dlaczego wynik dwóch fal może wyjść „zgodny" albo „rozjechany" z powodów niezwiązanych z audytem

### B1. Ślepota fali 2 nie jest zapewniona — POTWIERDZONE przez sędziego

**Dowód.** `grep -rn "zgloszenia" .claude/agents/aud-sec.md audyt/szablony/AGENT.md`
→ 0; `grep -rn -i "nie czytaj\|nie wolno czytać"` → 0. Zakaz stoi wyłącznie
w `audyt/role/KIER/AGENT.md:225`. Każdy agent ma `Read`, `Grep`, `Bash`;
wpisy fali 1 są w drzewie tej samej gałęzi (`git ls-files audyt/zgloszenia`).
`porownaj-cykle.mjs:47` łapie tylko `znormalizuj(stwierdzenie)` identyczne
co do słowa.

**Konsekwencja.** Agent fali 2, który otworzy `audyt/zgloszenia/`, przepisze
listę własnymi słowami, a sektor uzna audyt za powtarzalny — także wtedy, gdy
jest zepsuty. Jedyny test odróżniający audyt dobry od złego przestaje działać.

**Propozycja (po korekcie sędziego — pierwsza wersja miała trzy kolizje).**
(1) Zakaz do szablonu `AGENT.md` + reguła strażnika + mutacja. (2) Fala 2
pracuje na **tym samym commicie** (inny commit dałby inne checklisty
i generat — rozjazd z narzędzia), ale w worktree ze **sparse checkoutem
wykluczającym `audyt/zgloszenia/` i `audyt/stan/`** fali 1; generat trzeba
w worktree wygenerować osobno (`.claude/agents/` jest poza gitem). (3)
`status.mjs --fala=2` odmawia `W TRAKCIE`, gdy w drzewie jest jakikolwiek wpis
z **polem** `fala: 1` (nie wzorcem nazwy — nazwy zgłoszeń fali nie niosą).
(4) `porownaj-cykle.mjs` oznacza nadmierną zgodność (identyczny zbiór i ta
sama kolejność) jako podejrzaną. Koszt: S + M.

### B2. Kolejność wejść (W5, K9′) nie ma nośnika ani egzekucji — POTWIERDZONE

**Dowód.** `grep -rn "dziennik wej" audyt/tools/` → 0; `audyt/stan/*.json`
bez pola czasu; `status.mjs` bez gałęzi egzekwującej W5 (cały plik
przeczytany przez sędziego). KIER-05 powołuje się na nośnik, którego nie ma.

**Propozycja (po korekcie).** `status.mjs` zapisuje `kiedy` przy każdej
zmianie statusu i odmawia `W TRAKCIE` roli `re-audyt/<KOD>`, dopóki
`audyt/<KOD>` nie jest `ZAKOŃCZONE` — **z wyjątkiem ról bez odpowiednika
w audycie** (`PSIARZ`, `SKUT`, `STRAZ`, `WALID`), które inaczej zostałyby
zablokowane na stałe. Koszt: S.

### B3. Nie ma kanonicznego promptu uruchomienia roli — POTWIERDZONE

**Dowód.** `ls audyt/tools | grep -i uruchom` → 0; `grep -rn -i "prompt
startowy\|uruchomienie roli" audyt/{STRUKTURA,REGULAMIN,PLAN-BUDOWY}.md` → 0
(trafienia w `REGULAMIN.md:112,499` to wymaganie, nie artefakt). Prompty E6
i E7.6 pisał agent główny w rozmowie.

**Konsekwencja.** Fala 2 dostanie inny prompt niż fala 1 — rozjazd policzony
jako defekt audytu będzie defektem uruchomienia; prompt skopiowany z rozmowy
o fali 1 przemyci wyniki (B1).

**Propozycja.** `uruchom-role.mjs --sektor --rola --fala` generuje prompt
z plików (`AGENT.md` + komenda zakresu + fala + adres briefu) i zapisuje jego
sha256 w stanie roli; `porownaj-cykle.mjs` odmawia porównania fal o różnych
hashach promptu. Koszt: M.

### B4. Status ZWERYFIKOWANE nie odróżnia potwierdzenia od odrzucenia — i porównanie fal tego nie filtruje

**Dowód.** `werdykt.mjs:211` nadaje ZWERYFIKOWANE przy KOMPLECIE werdyktów
(`komplet()`, `:92`); `AUD-PIK-001` z ODRZUCAM + ODRZUCONE ma ten status.
Sędzia trafnie wskazał adres: to **wierna realizacja §6 regulaminu**
(`REGULAMIN.md:125`: „problem został potwierdzony lub odrzucony"), więc
`werdykt.mjs` jest w porządku. Wada siedzi w `porownaj-cykle.mjs`, który
porównuje hashe **bez werdyktu**: wpis potwierdzony w fali 1 i odrzucony
w fali 2 wyjdą „zgodne". Sprzeczność krytyk↔weryfikator (PRZEPUSZCZAM +
NIE ISTNIEJE) nie ma właściciela.

**Propozycja (po korekcie — bez szóstego statusu, bo to ruszałoby §6,
`STATUSY` w `wspolne.mjs:41` i regułę 16).** Stan POCHODNY liczony
z werdyktów w locie (POTWIERDZONE / ODRZUCONE / SPORNE), nieprzechowywany
jako status; `porownaj-cykle.mjs` porównuje pary (hash, stan pochodny);
sporne rozstrzyga kierownik nową pozycją `KIER-08` i idą do raportu osobną
liczbą. Koszt: S.

### B5. Porównanie fal nie odróżnia nadzbioru od sprzeczności — POTWIERDZONE

**Dowód.** `porownaj-cykle.mjs:86` `zgodne = !tylkoW1.length && !tylkoW2.length
&& !innyDzial.length`; każda różnica → „ROZJAZD FAL = DEFEKT AUDYTU". Model
nie jest deterministyczny; fala 2 z tym samym PLUS jednym więcej = defekt.

**Propozycja.** Trzy wyniki: ZGODNE, NADZBIÓR (różnica jednostronna → trzeci
przebieg tylko na tych pozycjach), SPRZECZNE (obustronna → defekt). Czy
nadzbiór jest defektem — rozstrzyga właściciel (K4′); narzędzie ma to
przynajmniej nazwać. **Warunek wstępny: B8** — bez stabilnego klucza nadzbiór
będzie liczony z fałszywych różnic. Koszt: S.

### B6 — wycofane (patrz sekcja „Wycofane").

### B7. Pokrycie kontroli testem negatywnym nie jest artefaktem — POTWIERDZONE

**Dowód.** 22 kontrole; audyt mutacyjny melduje **68** (67 wpisów +
zgłoszenie-śmieć); `grep -oE "regu[łl][aęy]? [0-9]+" audyt/tools/audyt-straznika-sektora.mjs
| sort -u` → 11 numerów; `grep -c "regula:"` → 0.

**Propozycja.** Reguły drukują `R<numer>:`, mutacje deklarują `regula:`,
audyt drukuje macierz i czerwieni się przy regule bez mutacji — **z polem
`wymaga` dla trzech reguł warunkowych** (`pominiete.push` przy `BRAK_ROL`
i braku generatu), inaczej bramka będzie fałszywie czerwona. Koszt: S.

### B8. Hash miejsca liczy NUMER LINII — dwie fale opisujące ten sam błąd dostaną różne hashe (sędzia, przeoczenie 1)

**Dowód.** `wspolne.mjs:178` `hashMiejsca()` bierze `["linia", plik, String(linia),
znormalizuj(tresc)]`. Pomiar sędziego: ta sama treść pod linią 169 i 170
oraz jako mechanizm → trzy różne hashe. `porownaj-cykle.mjs` policzy to jako
„TYLKO F1" + „TYLKO F2" i ogłosi DEFEKT AUDYTU przy identycznym znalezisku.
To samo psuje W4: `polacz-sektory.mjs:29-36` łączy audyt (lektura → `linia`)
z re-audytem (pomiar → często `mechanizm`) po tym samym haszu, choć komentarz
narzędzia obiecuje łączenie „tych samych miejsc opisanych innymi słowami".

**Konsekwencja.** To jest **najczęstszy** fałszywy rozjazd, jaki wystąpi —
częstszy niż nadzbiór z B5 — i uderza w obie obietnice sektora naraz:
powtarzalność (K4′) i łączenie sektorów (W4).

**Propozycja.** Klucz porównania bez numeru linii: `(plik, znormalizowana
treść linii)` dla formy liniowej, `(plik, zakres)` dla mechanizmu, plus
**drugi klucz „ten sam plik i ten sam zakres/funkcja"** do raportowania par
niepołączonych. Numer linii zostaje w dowodzie, nie w kluczu. Wymaga zmiany
w `zgloszenie.mjs`, `polacz-sektory.mjs`, `porownaj-cykle.mjs` i goldenach
ról (reguła 11 liczy hashe). Koszt: M — i to jest **pozycja nr 1** na liście.

### B9. Samo narzędzie przecieka wynik fali 1 agentowi fali 2 (sędzia, przeoczenie 2)

**Dowód.** `zgloszenie.mjs:147` `nastepneId()` numeruje ciągle w obrębie
sektora i działu, a po zapisie drukuje „zgłoszeń w sektorze: N". Agent fali 2,
który zapisze pierwsze zgłoszenie i zobaczy `AUD-SEC-013`, wie, ile fala 1
znalazła w jego dziale — bez otwierania katalogu i mimo każdego zakazu
w prompcie.

**Propozycja.** Numeracja per fala (`AUD-SEC-F2-001` albo osobna pula) i
wyjście narzędzia bez licznika sektora dla agenta (licznik tylko w `--pokaz`
kierownika). Koszt: S.

### B10. Liczby pokrycia w prozie sektora rozjeżdżają się i nic tego nie pilnuje (sędzia, przeoczenie 3)

**Dowód.** `node audyt/tools/mapa.mjs` → `712 + 399 = 1111 / 1111` (po
plikach tej sesji). `audyt/ROLE.md:50-58` „W repo 921 · przypisane 522",
`PLAN-BUDOWY.md:741` „628 + 399 = 1027", `WERYFIKACJA-PLANU.md` „711 + 399
= 1110" (stan sprzed dopisania dwóch plików). Reguła 8 strażnika sprawdza
**tylko sieroty** (`straznik:229-234`), nie liczby w prozie.

**Konsekwencja.** Dokładnie to martwe pole, które w produkcie zamknął
`straznik-readme` (lekcja 0.62.0/0.63.0), sektor ma u siebie.

**Propozycja.** Reguła strażnika: każda liczba pokrycia w `ROLE.md` (sekcja
zakresu) musi równać się wynikowi `mapa.mjs`; PLAN-BUDOWY i WERYFIKACJA
jako zapis historyczny z datą. Koszt: S.

### B11. `status.mjs` nie waliduje numeru fali (sędzia, przeoczenie 4)

**Dowód.** `const fala = Number(wartosc("fala") ?? 1)` bez sprawdzenia;
`--fala=3` tworzy `audyt-f3-SEC.json`, `--fala=abc` → `audyt-fNaN-SEC.json`.
Reguła 17 waliduje sektor, rolę, kody pozycji i rundę — falę pomija.
`zgloszenie.mjs:48` waliduje falę poprawnie — dwa narzędzia, dwa rygory.

**Propozycja.** Fala ∈ {1, 2} w `status.mjs` i w regule 17, mutacja. Koszt: XS.

### B12. Rola procesowa bez znacznika modelu spadała po cichu na Sonneta (sędzia, przeoczenie 5) — **ZAMKNIĘTE 2026-09-02**

**Dowód.** Przed poprawką: `straznik:770` `if (!znacznik) return "sonnet"`
i `modelRoli() … ?? "sonnet"`; usunięcie `· **Opus**` z nagłówka `GOLD`
+ regeneracja dawało generat i pomiar zgodne co do Sonneta. Mutacja
„nieznany model" tego nie obejmowała — lekcja E8 tej krytyki („nieznana
wartość nie może spadać po cichu") zapisana i niewprowadzona.

**Stan po poprawce.** `wspolne.mjs` i reguła 21 rzucają błąd dla roli
procesowej bez znacznika (działy bez znacznika zostają na Sonnecie — D8);
mutacja „GOLD traci znacznik + regeneracja" → złapana z właściwym śladem;
kontrprzykład „dział ze znacznikiem Sonnet" → nie zapala. Audyt mutacyjny
**66 → 68**, 0 przeoczonych, 0 martwych.

---

## C. Dlaczego przebieg może nie dojechać do końca

### C1. Koszt jest rzędu budżetu, a nie ma reguły, co jest wynikiem częściowym — POTWIERDZONE

**Dowód.** 633 tys. tokenów na jedno znalezisko przez ścieżkę (E7.6), 518 tys.
(E6); **304 pozycje checklist** × 2 fale × krytycy; „rząd 25 mln na komplet".
Jedyny nośnik wyniku częściowego: `niedomkniete` w stanie roli;
`porownaj-cykle.mjs` nie przyjmuje `--dzial`.

**Propozycja.** Kolejność działów wg ryzyka zapisana w `STRUKTURA.md` (SEC, BD,
BE, INT — tam były utraty danych — potem reszta); porównanie fal PER DZIAŁ
(`--dzial=`); `status.mjs --tokeny=` po przebiegu, żeby kierownik widział koszt
rundy. Koszt: S.

### C2. Orkiestracja jest ręczna, a ma przewieźć ponad 150 uruchomień — POTWIERDZONE

**Dowód.** `PLAN-BUDOWY.md:903,960` — `KIER`, `GOLD`, `RAP`, `KON`, `SKUT`,
`STRAZ` nie uruchomiono w żadnej próbie; `ls audyt/tools` bez skryptu
orkiestracji; próby prowadził agent główny ręcznie.

**Propozycja.** `przebieg.mjs` drukujący NASTĘPNY krok z plików stanu (rola,
fala, prompt, co ma być zrobione) — kolejność wynika z danych, nie z pamięci
sesji; harness ma też narzędzie `Workflow`. **Próba sucha kierownika na trzech
istniejących wpisach próbnych** (KIER + GOLD + RAP + KON, bez działów,
~1 mln tokenów) zanim ruszy fala. Koszt: M + próba.

### C3. Środowisko jest wspólne, a działy uruchomieniowe mogą pracować równolegle — POTWIERDZONE

**Dowód.** `REGULAMIN.md:316,481` (K9′ dopuszcza równoległość); `grep -n
"KIER-00" audyt/ROLE.md` → 0; `migawka-wartosci.mjs:55` liczy pliki i bramki,
żadnego licznika tabel WP; pomiar równoległy zanieczyszcza liczniki (T2);
prototyp `:3001` nie stał w E7.6.

**Propozycja (po korekcie).** Re-audyt na środowisku **sekwencyjnie** — to
zawężenie w ramach K9′ („mogą", nie „muszą"), ale decyzję o tym zostawiam
właścicielowi. Reset środowiska **NIE przez `postaw.sh`** (skasowałby dane
dowodowe właściciela z T4: 12 logowań, 16 odsłon), tylko zrzut + przywrócenie
jak przy teście całości; migawka rozszerzona o liczniki tabel WP
i `AUTO_INCREMENT`; pozycja `KIER-00` „co musi stać" z komendą. Koszt: S.

### C4. Kontrola „agent nie pisze po produkcie" działa dopiero na końcu fali — POTWIERDZONE

**Dowód.** Reguła 1 strażnika (`:83`) i `migawka --porownaj` (`:95`) — po
fakcie; `status.mjs` nie sprawdza drzewa.

**Propozycja (po korekcie).** `status.mjs` przy każdej zmianie statusu
porównuje drzewo produktu z commitem przypiętym w migawce (`glowa_main`),
**nie z ruchomym `main`** — inaczej cudzy commit dependabota zatrzymałby
sektor; odmawia zapisu statusu przy różnicy. Koszt: XS.

### C5. Brief ma cztery pułapki pomiaru; brakuje co najmniej pięciu, które kosztowały najwięcej

**Dowód.** `sed -n '266,275p' audyt/BRIEF-PROJEKTU.md` → cztery pozycje,
w tym `opcache.revalidate_freq` (mój pierwszy zapis tego nie widział). Nie ma:
`is_enrolled()` w tym samym żądaniu, `LENGTH()` vs `CHAR_LENGTH()`,
`wp_delete_post` pod HPOS, `waitForSelector` w szkielet koszyka, `Origin` przy
same-origin. Każda zamienia prawdziwy pomiar w fałszywy wynik z „dowodem".

**Propozycja.** Dopisać pułapki będące **faktami o cudzym kodzie** (bezpieczne
wobec rozstrzygnięcia z 2026-09-01, że brief nie niesie naszych ocen); granicę
dla obserwacji pomiarowych stawia właściciel. Koszt: S.

---

## D. Co zrobiono dobrze i czego NIE ruszać

- **Bramka odmawia wpisu bez dowodu i bez miejsca** (`zgloszenie.mjs`, 18 samokontroli).
- **Goldeny ról mierzone tą samą funkcją, co zgłoszenia** (reguła 11) — golden nie zgnije po cichu.
- **Reguła 21 mierzy niezależnie od generatora i odrzuca cichy fallback** (po poleceniu 1 i B12).
- **Próby na sucho** — obie wyciągnęły usterki, których nie widziała żadna kontrola.
- **Mapa pokrycia z zerem sierot i wykluczeniami z POWODEM.**
- **Koszt zmierzony, nie oszacowany.**
- **Odrzucenie jako wynik** (E6) — sektor, który umie powiedzieć „nie".
- **Werdykt.mjs realizuje §6 dosłownie** — nie zmieniać statusów; zmienić porównanie (B4).
- **Migawka niesie `glowa_main` i skrót produktu** — zmiana kodu między falami zostanie wykryta.

## E. Wiedza zdobyta przy budowie (do przekazania dalej)

1. Pomiar wykonany tą samą funkcją, która produkuje mierzony artefakt, nie mierzy niczego (reguła 21 przed 2026-09-02).
2. Wzorzec na napis zamiast na rozstrzygnięcie wraca w każdej nowej regule — test negatywny jest obowiązkiem.
3. Rola bez materiału odhacza po pustce (PIK-08) — komenda zakresu z asercją „≠ 0".
4. Harness czyta rejestr agentów przy starcie — po regeneracji restart sesji.
5. Helper regenerujący po mutacji maskuje mutację, gdy bramka i generator dzielą funkcję.
6. Próba na sucho jednej ścieżki znajduje więcej usterek sektora niż przegląd definicji.
7. Znalezisko o sektorze to nie porażka — stosunek 2:1 przy budowie ma zmaleć w E8.
8. Nieznana wartość ANI BRAK wartości nie może spadać po cichu na domyślną (B12 — sam popełniłem tę połowę).
9. Stan bez znacznika czasu nie jest dziennikiem (B2).
10. Krytyka bez własnego krytyka miała 1 znalezisko obalone i 7 osłabionych na 17 — **zasada pary (WYTYCZNE N1) dotyczy także krytyki**.
11. Klucz porównania musi być stabilny wobec rzeczy, które NIE są treścią błędu (numer linii) — inaczej narzędzie mierzy przesunięcia kodu, nie audyt (B8).

## F. Propozycje — lista do decyzji właściciela, z kosztem

| # | Co | Znal. | Koszt | Rusza rozstrzygnięcie? |
|---|---|---|---|---|
| 1 | **Klucz porównania bez numeru linii** + drugi klucz „ten sam plik/zakres" | B8 | M | nie |
| 2 | Zakaz czytania fali 1 w szablonie + sparse checkout bez wpisów fali 1 na TYM SAMYM commicie + odmowa `status --fala=2` przy wpisie `fala: 1` + wykrywanie nadmiernej zgodności | B1 | S + M | nie |
| 3 | Numeracja zgłoszeń per fala, licznik sektora tylko w `--pokaz` | B9 | S | nie |
| 4 | `status.mjs`: znaczniki czasu, odmowa re-audytu przed `ZAKOŃCZONE` audytu (z wyjątkiem PSIARZ/SKUT/STRAZ/WALID), fala ∈ {1, 2}, porównanie drzewa z `glowa_main` | B2, B11, C4 | S | nie |
| 5 | Kanoniczny prompt roli z pliku + hash w stanie | B3 | M | nie |
| 6 | Stan pochodny werdyktów w porównaniu fal (nie nowy status); `KIER-08` dla spornych | B4 | S | nie (nie rusza §6) |
| 7 | Porównanie fal: ZGODNE / NADZBIÓR / SPRZECZNE, per dział | B5, C1 | S | **tak — K4′ (nadzbiór)** |
| 8 | Macierz reguła → mutacja z polem `wymaga` | B7 | S | nie |
| 9 | Reguła strażnika na liczby pokrycia w `ROLE.md` | B10 | S | nie |
| 10 | Pozycja otwarta `<KOD>-90` w każdym dziale, raportowana osobno, nigdy pomijana | A1 | S | **tak — K4′ (wyjątek)** |
| 11 | Pogłębiacze: ≥50% pozycji jako pomiar wszystkiego w obszarze | A2 | M | nie |
| 12 | Siedem szwów jako siedem ścieżek wartości w ARCH i `rea-arch` | A3 | S | nie |
| 13 | Konrad: faza A′ (czułość pozycji) i pozycje fazy B | A4 | M | nie |
| 14 | PIK: liczby programu na stronie wobec bazy | A5 | XS | nie |
| 15 | REGULAMIN: cykl = jeden commit produktu (`glowa_main`); PR-y dependabota **zostają niezmergowane** na czas E8 (bez edycji `.github/` — to złamałoby niezmiennik sektora) | — | XS | nie |
| 16 | Kolejność działów wg ryzyka, `--tokeny=` w stanie roli | C1 | S | nie |
| 17 | `przebieg.mjs` + próba sucha kierownika na 3 wpisach próbnych | C2 | M + ~1 mln | nie |
| 18 | Re-audyt sekwencyjnie na środowisku; reset przez zrzut/przywrócenie, nie `postaw.sh`; migawka z licznikami tabel WP; `KIER-00` | C3 | S | **zawęża K9′ — decyzja właściciela** |
| 19 | Brief: pułapki pomiaru będące faktami o cudzym kodzie | C5 | S | granica — właściciel |
| 20 | REGULAMIN: merge między gałęziami sektorów dozwolony (polecenie z 2026-09-02) | — | XS | nie |

**Rekomendacja kolejności, gdyby budżet miał starczyć tylko na część:**
1, 2, 3, 4, 6, 8 (wiarygodność wyniku — bez nich K4′ nie da się rozstrzygnąć,
a B8 psuje rachunek dla wszystkich pozostałych), potem 17 (próba kierownika —
jedyna rola, która nigdy nie pracowała, a od niej zależy wszystko), potem 10
i 11 (zdolność znajdowania nowego), reszta wg uznania. Pozycje 7, 10 i 18
wymagają słowa właściciela; pozostałe są wykonaniem tego, co plan obiecał,
a repo jeszcze nie ma.

## Wycofane

**B6 („kod może się zmienić między falami, a zasada mówi »najnowsza wersja«")
— OBALONE przez sędziego.** `audyt/migawki/przed.json` niesie `glowa_main`,
a `migawka-wartosci.mjs:102` porównuje wszystkie klucze — commit JEST
przypięty; `REGULAMIN.md:419-422` mówi wprost „AUDYT #2 na tym samym,
niezmienionym kodzie". Pierwsza wersja tego znaleziska zawierała zdanie
„sprawdzić?" — czyli złamała własną sekcję G. Zostaje z niego tylko pozycja
15 tabeli F (zasada, która ZAPOBIEGA, a nie tylko wykrywa).

## G. Czego ta krytyka NIE sprawdziła

- Nie uruchomiła żadnej roli — ocena mechaniki przebiegu opiera się na dwóch
  próbach (E6, E7.6), lekturze narzędzi i 56 pomiarach sędziego.
- Nie oceniała treści 304 pozycji checklist jedna po drugiej (to A4, faza A′).
- Nie mierzyła kosztu pozycji otwartej (A1) — hipoteza: tyle, co pozycja zwykła.
- Zdania bez komendy do sprawdzenia są błędem tego dokumentu i podlegają tej
  samej regule, co zgłoszenia sektora. Sędzia znalazł jedno takie (B6) —
  wycofane.
