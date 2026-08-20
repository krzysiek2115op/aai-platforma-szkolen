# Krok 3 planu domknięcia — kursy zrobione do końca, w narzędziu

Dokument roboczy kroku (wzorem [KROK-2-ZABEZPIECZENIA.md](KROK-2-ZABEZPIECZENIA.md)).
Podstawa: [PLAN-FINAL-PLUGINU-1.md](PLAN-FINAL-PLUGINU-1.md) („Krok 3") oraz
decyzje właściciela w [PRODUKCJA-MATERIALU-KROK-3.md](PRODUKCJA-MATERIALU-KROK-3.md).
Bramka: **B7 — właściciel ocenia GOTOWE kursy.**

Stan: **w toku od 2026-08-19.** Aktualizować przy każdym domkniętym etapie.

## Gdzie pracujemy

Osobny worktree **`/home/krzysiek/Pod-strona-Szkolenia-krok3`**, gałąź
`feat/tresc-lekcji-kursow` (etap 3; etap 2 zamknięty na `feat/kreator-tresc-lekcji`).
Krok 2 siedzi w katalogu głównym
(`/home/krzysiek/Pod strona Szkolenia `). Reguła po incydencie
z 2026-08-19: **żaden czat nie przełącza gałęzi w cudzym katalogu.**

W worktree są dowiązania (poza gitem, wykluczone lokalnie
w `.git/worktrees/*/info/exclude`): `.env` oraz trzy katalogi źródeł D7
(`claude-code`, `claude-platform`, `github`). Po świeżym
`git worktree add` trzeba je odtworzyć, inaczej `straznik-scenariuszy`
mówi, że pominął kontrolę źródeł.

**`node_modules` musi być KOPIĄ, nie dowiązaniem** (zapisane
2026-08-19, kosztowało jeden nieudany build): Turbopack odrzuca
dowiązanie wychodzące poza katalog projektu —
`Symlink [project]/node_modules is invalid, it points out of the
filesystem root`, i `npm run build` pada, choć testy i strażnicy chodzą.
Tanio i bez drugiego `npm ci`:
`cp -al "/home/krzysiek/Pod strona Szkolenia /node_modules" node_modules`
(twarde dowiązania — 425 MB zajmuje raz, nie dwa).

Druga pułapka worktree, złapana testem negatywnym: `git add` odmawia
dodania pliku „przez dowiązanie", więc mutacja
`straznik-wagi-dokumentacji` celująca w `d7/github/` wyglądała na
**dziurę w strażniku**, którą nie jest. Mutacja celuje teraz w ścieżkę
bez dowiązania (`docs/dokumentacja-techniczna/github/`) i sprząta po
sobie także katalog.

Wspólne z krokiem 2 zostają: baza `db1_kursy`, baza testowa
`db1_kursy_test` i port 3001.

## Cztery etapy kroku

| # | Etap | Stan |
|---|---|---|
| 1 | Propozycja produkcji materiału → decyzja właściciela | ✅ zrobione (PR #32) |
| 2 | Kreator przejmuje treść lekcji i materiały | ✅ zrobione (0.30.0, PR #36 zmergowany) |
| 3 | Dogęszczenie Kursu 1 + proza 91 lekcji, treść wchodzi skryptem przez AJAX kreatora | 🚧 w robocie — sześć decyzji podjętych, niżej |
| 4 | Finalna treść stron sprzedażowych kreatorem → B7 | ⏳ |

## Stan na 2026-08-19 wieczorem

**Etap 2 zamknięty: PR #36 zmergowany, wersja 0.30.0.** Decyzja
właściciela z 2026-08-19: merge na DOWODACH LOKALNYCH, bo CI stoi do
1 września (wyczerpane minuty Actions organizacji) — tak samo jak przy
0.21.0 i 0.25.0. Po powrocie CI zostaje do potwierdzenia skan sekretów
(gitleaks), jako jedyny bez lokalnego odpowiednika.

Dowody przy merge'u: testy 62/62, strażnicy 24/24, audyt mutacji 71/71
(0 przeoczonych, 0 martwych), tsc i lint czyste, oba buildy zielone,
siedem smoke'ów zielonych, każdy nowy test sprawdzony testem negatywnym.

Numer to 0.30.0, nie 0.28.0: krok 2 domknął się w międzyczasie trzema
wydaniami (0.27.0 brama AJAX-a, 0.28.0 limity wejścia, 0.29.0 zamknięcie
kroku). Ta gałąź scalała bazę DWA razy — protokół pracy równoległej
z KROK-2-ZABEZPIECZENIA.md działa, ale kosztuje: przy drugim scaleniu
doszło przeniesienie `MaterialLekcji` i `LekcjaZTrescia` do odczytowej
części `typy.ts` (konwencja `straznik-limitow`: region limitów to samo
wejście), a sufity pól materiału przejął `straznik-tresci-lekcji`.

## Etap 3 — sześć decyzji PODJĘTYCH (właściciel, 2026-08-19 wieczorem)

Rozstrzygnięte po pytaniach agenta, przed napisaniem choćby zdania treści.
Zapisane z uzasadnieniami, bo za pół roku nikt nie odtworzy, dlaczego wybór
wypadł tak, a nie inaczej.

1. **Produkt BEZ ZMIAN: platforma za logowaniem + PDF jako dodatek.**
   Właściciel podniósł wątpliwość — „czemu w ogóle wprowadzać lekcje do
   bazy, skoro można złożyć e-booki gotowym narzędziem z internetu".
   Rozstrzygnięta po wyjaśnieniu: narzędzia typu Canva / Designrr /
   Beacon **składają** tekst, a nie piszą go, więc nie zdejmują ani
   godziny z pisania prozy — zmieniają wyłącznie to, gdzie ląduje gotowy
   tekst. Powody odrzucenia PDF-a jako rdzenia (cena nie do obrony,
   wyciek pliku kończy sprzedaż, aktualizacje dostarczane ręcznie, ginie
   design premium) zostają w mocy, a doszedł jeszcze jeden: przy
   produkcie-pliku sklep i kreator nie mają czego obsługiwać.
2. **Proza lekcji powstaje ZE ŹRÓDEŁ, scenariusz jest BRIEFEM** (tezy,
   granice, callbacki, zdanie zamykające) — nie redakcją scenariusza
   i nie mechaniczną konwersją znaczników. Tylko ta droga dogęszcza
   Kurs 1 i daje tekst do czytania zamiast zapisu nagrania.
3. **Źródłem prawdy są PLIKI W REPO**, baza dostaje kopię. Proza żyje
   obok scenariusza, wchodzi PR-em (da się recenzować), chroni ją golden
   — jak scenariusze z D7. Utrata bazy nie kasuje pracy.
4. **Treść wprowadza SKRYPT idący tą samą drogą co kreator** —
   `tools/wgraj-tresc-lekcji.mjs` → jedyny AJAX `/api/szkolenia`, akcja
   `zapisz-tresc-lekcji`, token z `.env`. To **nie jest seed**: bazy nie
   dotyka wprost, przechodzi przez kontrakt Zod, limity wejścia i
   dyspozytora dokładnie tak jak panel, więc zasada „jedna baza = jeden
   AJAX" zostaje nienaruszona. Panel zostaje do oglądania i drobnych
   poprawek, ale **poprawki merytoryczne robimy w pliku i wgrywamy
   ponownie** — inaczej repo i baza się rozjadą.
5. **Kurs 1 dogęszczamy tylko na poziomie PROZY.** Scenariusze Kursu 1
   zostają jak są (ślad D7 i podstawa pod ewentualne wideo); gęstość
   dokłada się przy pisaniu prozy, prosto ze wskazanych w programie
   źródeł. Jeden przelot zamiast dwóch.
6. **PDF generowany z tych samych plików JEDNĄ KOMENDĄ** (krok builda,
   szablon w naszej typografii) — nie składany ręcznie w zewnętrznym
   narzędziu. Powód wprost z decyzji 3: skład poza repo oznaczałby
   wklejanie 91 lekcji do przeglądarki przy każdej korekcie, bez PR-a
   i bez goldena.

### Pomiar, na którym stoi decyzja 5 (2026-08-19)

| Kurs | Scenariuszy | Objętość scenariuszy |
|---|---|---|
| Jak poprawnie korzystać z Claude | 41 | **311 kB** |
| Jak poprawnie używać GitHuba | 50 | **1027 kB** |

Kurs 1 jest **3,3× chudszy na lekcję**, nie tylko „91 stron kontra 292" —
i to on kosztuje więcej (499 zł kontra 399 zł). Najdłuższy dzisiejszy
scenariusz ma 54 kB, więc każda lekcja mieści się w limicie
`TrescLekcji` (120 000 znaków) i w jednym żądaniu z zapasem.

### Co zostaje otwarte świadomie

- **517 miejsc `[EKRAN]`** — bloki terminala wchodzą tekstem od razu,
  zrzuty interfejsu osobnym przelotem NA KOŃCU (decyzja z
  PRODUKCJA-MATERIALU-KROK-3.md; to najszybciej starzejąca się część).
- **Sufit ciała żądania 2 MB** (krok 2) — przy wgrywaniu jedna lekcja
  to jedno żądanie, więc sufit nie jest zagrożony; przeliczyć dopiero,
  gdyby kiedyś wgrywać moduł hurtem.

## Etap 3 — stan produkcji (aktualizować po KAŻDYM module)

### Narzędzia i ochrona — ZROBIONE (2026-08-20)

| Co | Gdzie | Dowód |
|---|---|---|
| `npm run db1:tresc` — proza wchodzi drogą kreatora | `tools/wgraj-tresc-lekcji.ts` | 3 testy negatywne po HTTP: zły token, rozjazd tytułu, niezgodność ze ścieżką — każdy kończy się kodem 1 BEZ wysłania czegokolwiek |
| czysta warstwa czytająca prozę | `lib/proza-lekcji.ts` + testy | audyt mutacyjny 6/6 (numeracja, tytuł, ścieżka, sufit kontraktu, porównanie z bazą) + 3/3 (tabela zgodności) |
| `straznik-prozy` | `tools/straznicy/straznik-prozy.mjs` | 4 mutacje w audycie, wszystkie łapane |

**Format pliku prozy** (`tresc-kursow/<kurs>/modul-N/proza-M-<temat>.md`):
frontmatter (`kurs`, `modul: N — tytuł`, `lekcja: M — tytuł`, `zrodla`,
opcjonalnie `materialy` jako tablica JSON) → treść dla klienta →
`## Zgodność ze źródłem`. **Wszystko od nagłówka zgodności w dół jest
ucinane przed wysyłką do bazy**, ale jego BRAK zatrzymuje wgrywanie.
Miejsca na zrzuty: `<!-- ZRZUT: opis -->` (niewidoczne dla czytającego,
znajdowalne dla przelotu zrzutów na końcu produkcji).

**Nazwa `proza-`, nie `lekcja-`**: trzej strażnicy treści zbierają pliki
wzorcem `lekcja-*.md` i zażądaliby od prozy scen oraz tabeli zgodności
scenariusza. Inny przedrostek nie zmusza do rozluźniania działających
strażników.

### Moduł 1 Kursu 1 — ZAMKNIĘTY I WGRANY (2026-08-20)

Sześć lekcji, **82 965 znaków prozy dla klienta** (scenariusze tego
samego modułu to 38 kB razem ze scenami i tabelami). Liczby poniżej są
PO przebiegu cytatów, czyli tym, co realnie siedzi w bazie:

| Lekcja | Znaków | Wierszy zgodności |
|---|---|---|
| 1.1 Czym jest Claude i co potrafi (WZORZEC) | 11 346 | 25 |
| 1.2 Rodzina modeli | 15 073 | 33 |
| 1.3 Jak dobrać model | 14 112 | 34 |
| 1.4 Cennik | 13 999 | 35 |
| 1.5 Okno kontekstu | 14 019 | 35 |
| 1.6 Słowniczek | 14 416 | 34 |

Tryb: równoległy z briefem (`modul-1/BRIEF-prozy-modulu.md`), fale 3 + 2,
przegląd pierwszej fali przed puszczeniem drugiej. Przelot spójności:
łańcuch mostów trzyma się **co do zdania**, zero wycieków tematów przez
granice, zero drugiej osoby małą literą, zero znaczników nagrania w prozie.

**KOSZT — POMIAR, nie szacunek:** 107 + 199 + 151 + 139 + 173 tys.
tokenów na pięć lekcji = **~152 tys. na lekcję**, wobec ~90 tys. przy
scenariuszach D7. Powód: autorzy czytają źródła w CAŁOŚCI i w oryginale
(cennik 41 kB, dobór modelu 85 kB w dwóch plikach) i budują tabele po
33–35 wierszy. Ekstrapolacja na 91 lekcji: **13–14 mln tokenów** —
największa pojedyncza pozycja kosztowa Pluginu 1. Właściciel zna tę
liczbę i podtrzymuje decyzję o Opusie dla subagentów.

### Przebieg cytatów modułu 1 — WYNIK (2026-08-20)

Druga bramka jakości zamknięta. **195 sprawdzonych wierszy** tabel
zgodności (25/33/34/35/35/34) przy dziewięciu źródłach przeczytanych
w całości i w oryginale. Wynik: **7 usterek naprawionych**, zero tez bez
pokrycia, zero błędnych liczb — wszystkie ceny, mnożniki cache, progi
zwrotu, tokeny narzędzi i daty zgadzają się co do cyfry.

Wszystkie siedem to **ten sam gatunek usterki: zgubione zawężenie** —
proza brała regułę ze źródła i gubiła warunek, przy którym ta reguła
obowiązuje. To jest klasa do pilnowania w kolejnych modułach:

| Lekcja | Co gubiło warunek |
|---|---|
| 1.2 | „przetwarzanie wsadowe ma wyższy sufit" — źródło daje 300k wyjścia **tylko** Opusowi 5/4.8/4.7/4.6 i Sonnetowi 5/4.6, i **tylko** z nagłówkiem beta `output-300k-2026-03-24`; Fable 5 i Haiku 4.5 na liście nie ma |
| 1.5 | „nowsze modele Opus i Sonnet zachowują bloki myślenia" — źródło podaje twarde progi: Opus 4.5+, Sonnet 4.6+ (oraz Fable 5, Mythos 5, Mythos Preview) |
| 1.3 | czas 4,5 vs 7,9 minuty przypisany całej czwórce testów — źródło mierzy to na **DeepWideSearch** |
| 1.3 | macierz wyboru: urwane „advanced research, knowledge work" (Opus 5) i „and extended thinking" (Haiku 4.5) |
| 1.1 | „infrastruktura zarządzana **przez Anthropic**" — źródło mówi „managed infrastructure", a środowiskiem może być **self-hosted sandbox na własnej infrastrukturze**; ta sama usterka widziana z drugiej strony to pominięta szósta pozycja listy „kiedy to ma sens" |
| 1.1 | „tutaj zaczyna **99% ludzi**" — liczby nie ma w żadnym ze źródeł |
| 1.1 | „Claude jest **najlepszy** w…" wobec „excels at …, **and more**"; „wszystko, co Claude oferuje" wobec „Claude's **API surface** is organized into five areas" |

Doszło **siedem plików cytatów** (`claude-platform--managed-agents--overview.md`,
`--build-with-claude--overview.md`, `--about-claude--models--overview.md`,
`--models--choosing-a-model.md`, `--models--optimizing-for-cost-and-intelligence.md`,
`--about-claude--pricing.md`, `--build-with-claude--context-windows.md`),
a `--intro.md` i `--glossary.md` zostały uzupełnione. Uwaga do wcześniejszej
notatki: istniał też `claude-platform--models-i-cennik.md` z czasów
scenariuszy (7 kB, sekcje L1.2–L1.5) — za cienki pod prozę o 33–35
wierszach zgodności, ale nie była to pustka.

**LEKCJA ORGANIZACYJNA — raport przepadł, PRACA NIE.** Notatka sprzed
`/clear` mówiła, że przebieg cytatów „edytował pliki", a repo pokazywało
czysty `git status`, pusty `git stash` i zero plików w commicie. Wniosek
„przebieg nie zostawił śladu" był **fałszywy**: subagent wciąż żył w tle
i zameldował się kwadrans później, w następnej sesji. Zdążyłem w tym
czasie puścić trzy własne przeglądy tych samych plików — zderzenia
zapisów nie było tylko dlatego, że obie strony edytowały punktowo,
w rozłączne linie.

**Reguła na przyszłość: zanim uznasz przebieg w tle za przepadły
i puścisz go od nowa, sprawdź, czy nie żyje.** Czysty `git status` nie
dowodzi, że agent nie pracuje — dowodzi, że jeszcze nie zapisał.
Objawem żywego przebiegu są świeże czasy modyfikacji plików
(`ls --time-style=+%H:%M:%S`) mimo czystego drzewa.

### Domknięcie modułu 1 — ZROBIONE (2026-08-20)

1. ~~Sprawdzić wynik przebiegu cytatów~~ — wynik wyżej.
2. ~~Strażnicy i testy~~ — **25/25** i **75/75**, kody wyjścia bez potoku.
3. ~~Wgrać moduł~~ — `npm run db1:tresc`: 6 lekcji, 6 wgranych, 0 bez zmian.
4. ~~Jeden commit na moduł~~.
5. **Pokazać właścicielowi w kreatorze** — zrobione 2026-08-20, moduł
   jest w bazie i czeka na ocenę.
6. ~~Dopisać ocenę modułu do `tresc-kursow/POSTEP.md`~~.

### DECYZJA WŁAŚCICIELA (2026-08-20): moduł 2 powstaje RÓWNOLEGLE z oceną modułu 1

Rytm „przystanek po KAŻDYM module" zostaje jako zasada, ale **przy
module 2 właściciel świadomie go zawiesił**: moduł 2 (prompt engineering,
5 lekcji) ma powstać w CAŁOŚCI — brief, fale autorów, przelot spójności,
przebieg cytatów — nie czekając, aż właściciel obejrzy moduł 1
w kreatorze.

Przedstawione i odrzucone: wariant „sam brief, fale po ocenie" (tańszy
o ryzyko przeróbek) oraz całkowity postój. Właściciel zna cenę tej
decyzji: **~760 tys. tokenów powstaje, zanim zobaczy modułowi 1
poprawki przebiegu cytatów**, i jeżeli jego ocena zmieni format albo
ton, przeróbka obejmie pięć gotowych lekcji, a nie jeden tani dokument.
Przesłanka za: format lekcji 1.1 został już wcześniej zaakceptowany bez
poprawek, więc ryzyko zmiany formatu jest małe.

**Czego ta decyzja NIE zmienia:** przy module 3 i dalszych wracamy do
pytania właściciela — to była zgoda punktowa na moduł 2, nie zniesienie
rytmu.

### DECYZJA WŁAŚCICIELA (2026-08-20): moduł 3 rusza w TRZECIM czacie, równolegle

Zapowiedziane pytanie „przy module 3 pytamy ponownie" zostało rozstrzygnięte
zanim padło: właściciel poprosił o **prompt startowy dla równoległego czatu**,
który weźmie moduł 3, podczas gdy ten czat kończy moduł 2. To znaczy, że rytm
„przystanek po każdym module" jest zawieszony także przy module 3 — i że
produkcja idzie teraz DWOMA torami naraz.

Cena tej decyzji, znana właścicielowi: moduł 3 ma **osiem lekcji**, czyli około
**1,2 mln tokenów** (po ~152 tys. na lekcję z pomiaru modułu 1). Razem
z modułem 2 (~760 tys.) powstaje więc blisko **2 mln tokenów treści, zanim
właściciel oceni moduł 1**. Przesłanka za: format lekcji 1.1 przeszedł bez
poprawek, więc ryzyko przeróbki formatu jest małe; przeróbka merytoryczna
i tak dotknęłaby pojedynczych zdań, nie struktury.

**Podział terytoriów przy trzech czatach jednego repo:**

| Czat | Katalog | Gałąź | Teren |
|---|---|---|---|
| krok 2 / główny | `/home/krzysiek/Pod strona Szkolenia ` | `plugin-1-sklep-kursow` | wszystko poza treścią kursów |
| moduł 2 | `/home/krzysiek/Pod-strona-Szkolenia-krok3` | `feat/tresc-lekcji-kursow` | `tresc-kursow/…/modul-2/**` |
| moduł 3 | `/home/krzysiek/Pod-strona-Szkolenia-modul3` | `feat/tresc-lekcji-modul-3` (od `feat/tresc-lekcji-kursow`) | `tresc-kursow/…/modul-3/**` |

Reguła bez zmian: **żaden czat nie przełącza gałęzi w cudzym katalogu.**
Pliki wspólne (`POSTEP.md`, ten dokument) każdy dopisuje NA KOŃCU własną
sekcją; konflikt przy scalaniu jest tekstowy, zasada — zachować OBIE zmiany.
Baza `db1_kursy` i tokeny są wspólne, ale `npm run db1:tresc` wysyła wyłącznie
pliki, które się zmieniły, więc czaty nie kasują sobie lekcji.

### Moduł 2 Kursu 1 — ZAMKNIĘTY I WGRANY (2026-08-20)

Pięć lekcji, **77 963 znaki prozy dla klienta**, 164 wiersze zgodności.
Wgrane `npm run db1:tresc` (5 wgranych, 6 bez zmian). Pełny rozbiór
przebiegu — cztery sygnały jakości, gatunki usterek, koszt i to, co
z trybu ma zostać — w [tresc-kursow/POSTEP.md](../../tresc-kursow/POSTEP.md),
sekcja „Jak wypadł moduł 2 Kursu 1".

Trzy rzeczy, które muszą przetrwać `/clear`:

1. **Bramka cytatów znalazła 10 usterek i ani jednej złej liczby.**
   Zgubione zawężenie dalej dominuje (4 z 10), ale doszły gatunki, których
   moduł 1 nie miał: teza bez pokrycia (autor dopowiada wniosek, którego
   źródło nie orzeka), wiersz osierocony (tabela dowodzi tezy usuniętej
   z prozy) i zły adres sekcji. **Przy kolejnych modułach szukać wszystkich
   czterech**, nie samych zawężeń.
2. **Dokumentacja bywa sprzeczna sama ze sobą i to jest pułapka na autora.**
   `effort.md` mówi w jednej sekcji, że effort obejmuje wszystkie tokeny
   odpowiedzi, a w sekcji Opus 5 — że nie steruje długością widocznej
   odpowiedzi. Autor 2.3 uogólnił to drugie zdanie na wszystkie modele.
   Sześć takich rozjazdów spisano w raporcie bramki (m.in. prefill, którego
   strona o spójności nadal uczy, a strona najlepszych praktyk uznaje za
   usunięty).
3. **Błąd może siedzieć w BRIEFIE, nie w autorze.** Brief modułu 2 podawał
   jako tezę ze źródła hierarchię „najpierw model i effort, potem prompt".
   Autor 2.1 odmówił jej napisania i miał rację; to samo zdanie stoi
   w scenariuszu D7 (lekcja 2.1, scena 2), który jest pod goldenem —
   **poprawka scenariusza czeka na decyzję właściciela.**

**Lekcja organizacyjna:** nie commitować katalogu, gdy w środku piszą
autorzy (`git add -A <katalog>` zgarnął wersje pośrednie dwóch lekcji).
Plik po pliku. Druga: autor, który padnie na limicie sesji z kompletnym
plikiem, **nie wymaga powtórki** — 2.3 została dokończona przeglądem
zamiast pisana od nowa, co oszczędziło ~150 tys. tokenów.

**Stan po module 2:** proza 11 z 91 lekcji. Następny w tym torze —
moduł 4 Kursu 1 („Claude Code: systemy pracy, które skalują"), bo moduł 3
powstaje równolegle w osobnym czacie. **Przy module 4 wraca pytanie
o rytm** — zgoda na pracę bez przystanku była punktowa (moduł 2), a przy
module 3 właściciel przedłużył ją decyzją o trzecim torze.

### Znaleziska z modułu 1 do decyzji przy publikacji kursu

| Znalezisko | Skąd | Co z tym |
|---|---|---|
| **Cena wprowadzająca Sonneta 5 wygasa 31 sierpnia 2026** — notatka mówi też o odwołanej podwyżce z 1 września | `pricing.md` | **Sprawdzić przed publikacją kursu, i to po 1 września 2026** — migawka jest z sierpnia, więc zdanie o odwołanej podwyżce jest w niej obietnicą na przyszłość; lekcja 1.4 podaje ceny z migawki i mówi, gdzie sprawdzić aktualne |
| Dokumentacja opisuje **Sonneta 5 dwoma różnymi zdaniami** (`intro.md` vs `overview.md`); dla pozostałych modeli opisy są zgodne | oba pliki | Rozbrojone jawnie w lekcji 1.2 — kurs cytuje oba brzmienia i nazywa rozjazd (wzorem lekcji 5.7 Kursu 2 przy skrócie CD) |
| Kompakcja kontekstu jest w źródle „podstawową strategią" i **jednocześnie w becie**, tylko dla modeli 4.6+ | `context-windows.md` | Napisane wprost, z ostrzeżeniem przed opieraniem na tym firmowego procesu |
| **Najmocniejsze modele NIE mają świadomości kontekstu** (mają: Sonnet 5, Haiku 4.5; nie mają: Opus 4.7+, Fable 5, Mythos 5) | `context-windows.md` | Kontrintuicyjne wobec narracji „biorę najmocniejszy" — zostawione jako oznaczone zaskoczenie |
| **Przykład „10 000 zgłoszeń ≈ $37" w dokumentacji się nie domyka** (wychodzi tylko przy policzeniu całości po stawce wejścia, mimo podanej stawki wyjścia) | `pricing.md` | Liczba przepisana wiernie; usterka jest po stronie Anthropica |
| Modele legacy bywają **droższe** od aktualnych następców (Sonnet 4.6/4.5 $3/$15 wobec Sonnet 5 $2/$10) | `models/overview.md` | Użyte w 1.2 jako argument za migracją |
| Fable 5 używa tokenizera od Opus 4.7 — ten sam tekst to **~30% więcej tokenów** niż na starszych modelach | `models/overview.md` | Podkopuje naiwne porównywanie cen za MTok między pokoleniami |
| **Przelicznik tokena rozjeżdża się w dwóch plikach**: „3.5 English characters" (`glossary.md`) kontra „approximately 4 characters or 0.75 words" (`pricing.md` FAQ) | przebieg cytatów | **Rozbrojone redakcyjnie w 1.6**: lekcja nazywa rozjazd wprost i odsyła po twardą liczbę do narzędzia liczenia tokenów; sprzeczność zostaje po stronie Anthropica |
| **Zakres zniżki „regional/multi-region 10%"** opisany dwiema różnymi listami modeli (`pricing.md` kontra `models/overview.md`) | przebieg cytatów | Sens ten sam, brzmienie inne — przy aktualizacji treści łatwo o rozbieżność; trzymać się `pricing.md` |
| **Macierz wyboru reklamuje wycofywany parametr**: `choosing-a-model.md` sprzedaje Haiku 4.5 hasłem „extended thinking", a `extended-thinking` jest DEPRECATED i na 4.7+ zwraca 400 | przebieg cytatów | Formalnie zgodne (Haiku 4.5 jest sprzed 4.7), ale mylące; ta sama pułapka co korekta źródła przy L2.4 |
| **Artefakty migawki w `models/overview.md`**: numery przypisów przyklejone do wartości („Jan 20262", „claude-fable-53") | przebieg cytatów | Do prozy nie weszły; **ostrzec autorów kolejnych modułów**, żeby nie przepisali ich jako części identyfikatora albo daty |

## Etap 2 — co już jest (commit „lekcja umie nieść treść kursu")

Warstwa danych, testy 45/45, strażnicy 21/21:

- **migracja 006** — `course_lessons.content` (markdown) i `materials`
  (jsonb, check „to tablica"), indeks częściowy pod licznik lekcji
  z treścią. **Ani jednej kolumny pod wideo** — kurs jest tekstowy;
  gdyby wideo wróciło, dojdzie osobną migracją;
- **kontrakty** w `typy.ts`: `MaterialLekcji`, `TrescLekcji`
  (limit 120 000 znaków, max 12 materiałów), `LekcjaZTrescia`,
  flaga `LekcjaKursu.ma_tresc`, licznik `KartaKreatora.lessons_tresc_count`;
- **akcja `zapisz-tresc-lekcji`** w dyspozytorze (osobna, jednolekcyjna);
- **stabilne id** modułów i lekcji przy zapisie programu;
- **`trescLekcji(id)`** w odczycie — osobno od strony sprzedażowej.

### Dwie decyzje projektowe, które trzeba znać przed dalszą pracą

1. **Treść NIE jedzie w zapisie kursu.** 41 lekcji tekstu w jednym
   żądaniu to setki kilobajtów, a krok 2 wprowadza limit rozmiaru
   ciała. Do tego pisanie lekcji nie ma prawa przepisywać przy okazji
   całego programu. Stąd osobna akcja na jedną lekcję.
2. **Zapis programu nie wolno, żeby kasował lekcje.** Do 0.26.0 robił
   `DELETE` + `INSERT`, więc każdy zapis nadawał lekcjom nowe id —
   z treścią na wierszu byłaby to pułapka na utratę danych. Teraz
   wiersz z wejścia jest aktualizowany, znikają tylko te, których
   w wejściu nie ma. **Zamiana modułów miejscami łamie unikalność
   `(course_id, position)` w stanie pośrednim**, dlatego transakcja
   woła `SET CONSTRAINTS ALL DEFERRED` (ograniczenia są `DEFERRABLE`
   od migracji 001 — ktoś to przewidział).
   Pilnuje tego test „zapis programu z id NIE kasuje treści ani
   identyfikatorów"; sprawdzony testem negatywnym (usunięcie filtra
   po id z kasowania lekcji → czerwony).

### Uczciwa granica dzisiejszej ochrony

Test „strona widzi FLAGĘ, nigdy tekstu lekcji" dowodzi, że **kontrakt**
`LekcjaKursu` obcina treść (Zod strippuje nieznane pola). NIE dowodzi,
że zapytanie SQL jej nie pobiera — gdyby ktoś dołożył `content` do
`jsonb_build_object` w `dolozTresc`, baza czytałaby tekst 91 lekcji
przy każdym renderze katalogu, a test dalej byłby zielony. Kandydat na
strażnika przy panelu.

## Etap 2 — panel (0.27.0, domknięty)

- **osobna trasa `/szkolenia/kreator/lekcja/[id]`** zamiast czwartej
  zakładki kursu. Powód jest ilościowy: lekcja mieści 120 000 znaków,
  więc formularz kursu woziłby przy każdym wejściu materiał 41 lekcji.
  Kanał JSON czyta DOKŁADNIE jedną lekcję (`trescLekcji`), zapis idzie
  osobną akcją;
- **wejście z zakładki Program** — przycisk „Treść" przy lekcji, ze
  stanem z bazy (`ma_tresc`), plus licznik „Z treścią" nad listą;
- **opis pól lekcji** `components/kreator/opis-lekcji.ts` na wzór
  `opis-sekcji.ts`; typy opisu przeniesione do wspólnego `opis-pol.ts`,
  a kontrolki do `PolaOpisane.tsx` (dotąd siedziały w `EdytorSekcji`) —
  jeden renderer na oba edytory, inaczej `straznik-kreatora` pilnowałby
  zgodności z kontraktem tylko w jednym z nich;
- **`straznik-kreatora` obejmuje treść lekcji** i dodatkowo sprawdza
  listy zamknięte: opcje w panelu muszą być tym samym zbiorem co enum
  kontraktu (4 nowe mutacje w audycie);
- **nowy `straznik-tresci-lekcji`** (2 mutacje) — domyka „uczciwą
  granicę" opisaną niżej: pilnuje, że wspólny odczyt strony nie wybiera
  z lekcji `content`/`materials` i że `LekcjaKursu` nie ma pola treści;
- **`tools/smoke/smoke-lekcje.ts`** — dowód po HTTP: brama, wystrzał
  treści z samego ciastka, BRAK materiału w katalogu i na stronie
  sprzedażowej opublikowanego kursu, 404 na śmieciach, a zapis programu
  nie kasuje napisanej treści. Sprawdzony dwoma testami negatywnymi
  (zdjęta brama → czerwony; formularz bez `id` lekcji → czerwony);
- `KREATOR.md`: rozdział „Pisanie lekcji"; goldeny: `d6-lekcja.json`.

### Luka, którą trzeba było domknąć przy panelu

Warstwa danych umiała trzymać identyfikatory, ale **panel ich nie
odsyłał** — formularz kursu wysyłał moduły i lekcje bez `id`. Przy
dyspozytorze kasującym wiersze spoza wejścia znaczyło to tyle, że
pierwszy zapis kursu skasowałby treść wszystkich lekcji i wstawił
program od nowa. Teraz `id` jedzie w obie strony, a po zapisie
formularz **przyjmuje stan z serwera** (świeże `id` dopiero co dodanych
lekcji), bo inaczej drugi zapis powtarzałby ten sam błąd.

## Etap 2 — czego świadomie NIE ma

- **renderera Markdowna** — podgląd pokazuje tekst z zachowanymi
  łamaniami i mówi o tym wprost; skład przyjdzie z platformą kursu,
  a udawanie go w panelu kłamałoby o wyglądzie gotowej lekcji;
- **pól wideo** — kurs jest tekstowy (decyzja z 2026-08-19);
- **przenoszenia lekcji między modułami** i wgrywania plików —
  materiały to adres, jak okładka kursu (decyzja z D6).

## Terytoria i pliki wspólne

Krok 3 wszedł na dwa pliki kroku 2 — inaczej się nie dało, bo treść
lekcji przechodzi przez ścieżkę zapisu:

| Plik | Czyj wg podziału | Co zrobił krok 3 |
|---|---|---|
| `modules/m1-sklep/dyspozytor.ts` | krok 2 | nowa akcja + stabilne id (zmiany dopisane, nic nie usunięte) |
| `modules/m1-sklep/typy.ts` | wspólny | nowe kontrakty; **wszystkie pola tekstowe mają `.max()`, tablice mają górną granicę** — pod `straznik-limitow` z PR 3 kroku 2 |
| `modules/m1-sklep/odczyt.ts` | niczyj wg tabeli | flaga `ma_tresc`, licznik, `trescLekcji()` (+ kontekst kursu/modułu dla panelu) |
| `tools/straznicy/audyt-straznikow.mjs` | wspólny | 6 nowych mutacji + naprawa mutacji ślepej w worktree |
| `.github/workflows/ci.yml` | wspólny | krok „Smoke pisania lekcji" |

Konflikty przy scalaniu będą tekstowe. Zasada bez zmian: zachować
OBIE zmiany.
