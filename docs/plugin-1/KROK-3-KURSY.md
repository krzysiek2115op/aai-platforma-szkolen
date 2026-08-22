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
**Od 2026-08-22 katalogi źródeł D7 odtwarzać jako KOPIE twardymi
dowiązaniami (`cp -al`), NIE symlinkami** — nowy `straznik-wagi-dokumentacji`
(z 5aa914d) pyta `git check-ignore`, a git odmawia ścieżek „przez
dowiązanie" (kod 128) i strażnik czerwieni się fałszywie. `.env` może
zostać symlinkiem — strażnik go nie sprawdza.

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
| 3 | Proza lekcji, treść wchodzi skryptem przez AJAX kreatora (dogęszczenie K1 odwołane 2026-08-20) | 🚧 w robocie — **Kurs 1 KOMPLETNY (41/41, v0.31.0)**; Kurs 2 czeka na cięcie + kalibrację |
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

### DECYZJA WŁAŚCICIELA (2026-08-20): krótsze kursy zamiast dłuższych, niższa cena

**To jest odwrócenie decyzji nr 2 z PRODUKCJA-MATERIALU-KROK-3.md.** Tam
obniżenie ceny było jawnie ODRZUCONE, a Kurs 1 miał zostać dogęszczony.
Po dwóch modułach (11 lekcji, ~1,9 mln tokenów, 152 → 172 tys. na lekcję)
właściciel uznał, że produkcja trwa za długo, i wybrał tamtą odrzuconą
opcję.

| Pozycja | Było | Jest |
|---|---|---|
| Cena Kursu 1 | 499 zł | **299 zł** |
| Cena Kursu 2 | 399 zł | **349 zł** |
| Program Kursu 2 | 7 modułów / 50 lekcji | **CIĘTY — mniej lekcji** |
| Widełki prozy | 12 000–16 000 znaków | **8 000–12 000 znaków** |
| Dogęszczanie Kursu 1 | tak | **nie** |

**Co jest już zrobione:** ceny w `tools/seed/seed-przyklady.ts` (29900
i 34900 groszy), widełki w `POSTEP.md`, odwrócenie zapisane w obu
dokumentach decyzyjnych i w CLAUDE.md.

**Co zostaje OTWARTE i wymaga roboty przed startem prozy Kursu 2:**

1. **Cena w BAZIE jest nadal stara** (49900 i 39900). Zmiana idzie
   kreatorem — zapis kursu wysyła też program, więc **nie robić tego
   skryptem seedującym**: `npm run db1:seed` wgrywa treść ROBOCZĄ
   i skasowałby wgraną prozę. Właściwe miejsca: panel kreatora albo
   etap 4 (finalne strony sprzedażowe).
2. **Które lekcje Kursu 2 wypadają** — decyzja nie zapadła. Potrzebna
   propozycja agenta: co wyciąć z 50 lekcji, żeby kurs dalej trzymał
   obietnicę ze strony sprzedażowej. Cięcie pociąga za sobą: nowy
   program w bazie (dyspozytorem), zmianę statystyk katalogu (dziś
   7 modułów / 50 lekcji / 745 min), korektę goldenów treści i liczników
   „91 scenariuszy" u strażników. **Scenariusze wyciętych lekcji zostają
   w repo jako ślad D7** — kasowanie ich niczego nie oszczędza,
   a `straznik-scenariuszy` liczy pliki.
3. **Nierówność gęstości** — moduły 1 i 2 Kursu 1 mają 14–18 tys. znaków
   na lekcję, dalsze będą miały 8–12 tys. Kurs będzie na początku
   gęstszy niż dalej. Świadomy koszt decyzji; przepisywanie modułów 1–2
   w dół kosztowałoby drugi raz tyle, co ich napisanie.

### NASTĘPNY KROK: moduł 4 Kursu 1

Moduł 3 powstaje równolegle w osobnym czacie (worktree
`Pod-strona-Szkolenia-modul3`), więc ten tor bierze **moduł 4 — „Claude
Code: systemy pracy, które skalują"** (6 lekcji: subagenci, skille,
hooki, MCP, pluginy, Agent Skills na platformie). Przepis bez zmian:
brief z dosłownymi mostami → fale autorów → przegląd pierwszej fali →
przelot spójności → bramka cytatów → `npm run db1:tresc` → commit.
**Nowe widełki 8–12 tys. wchodzą do briefu modułu 4.**

Most z modułu 3 trzeba będzie wziąć z drugiego czatu — jego lekcja 3.8
kończy się zdaniem prowadzącym do modułu 4.

### Moduł 4 Kursu 1 — ZAMKNIĘTY I WGRANY (2026-08-21)

Osiem lekcji, **92 453 znaki prozy dla klienta**, 236 wierszy zgodności.
Wgrane `npm run db1:tresc` (8 wgranych, 11 bez zmian) i **zweryfikowane
w bazie zapytaniem, nie w logu narzędzia**. Pełny rozbiór — cztery
sygnały jakości, gatunki usterek, koszt i pułapki narzędziowe — w
[tresc-kursow/POSTEP.md](../../tresc-kursow/POSTEP.md), sekcja „Jak
wypadł moduł 4 Kursu 1".

**Stan po module 4: proza 27 z 91 lekcji.** Kurs 1 ma cztery moduły
z sześciu — moduł 3 domknął równolegle drugi czat.

Pięć rzeczy, które muszą przetrwać `/clear`:

1. **KOSZT ROŚNIE, A NIE MALEJE — decyzja z 2026-08-20 nie przyniosła
   oszczędności.** Moduł 4 kosztował **~267 tys. tokenów na lekcję**
   wobec 172 tys. w module 2, mimo lekcji krótszych o jedną trzecią.
   Pomiar, nie szacunek: 2,14 mln na osiem lekcji z bramką. **O koszcie
   decyduje GRUBOŚĆ ŹRÓDŁA, nie długość lekcji** — autor czyta 95–345 kB
   w oryginale niezależnie od tego, ile z tego napisze. Moduły 5–6
   Kursu 1 i Kurs 2 mają źródła cieńsze, więc ta liczba nie musi się
   powtórzyć; **ale gdyby właściciel liczył na oszczędność wprost
   z krótszych lekcji, to założenie się nie potwierdziło.**
2. **Bramka cytatów znalazła 16 usterek** (moduł 1: 7, moduł 2: 10) przy
   239 wierszach i **zero złych adresów sekcji**. Zgubione zawężenie
   dalej dominuje (11 z 16). Doszła **nowa klasa: instrukcja, która by
   nie zadziałała** — lekcja kazała sprzątać worktree komendą, którą
   Claude Code blokuje. Przy kolejnych modułach sprawdzać nie tylko, czy
   zdanie jest prawdziwe, ale **czy podana komenda wykona się
   u czytelnika**.
3. **Brief pomylił się cztery razy, autorzy mieli rację cztery razy.**
   Stąd reguła, która wchodzi do wszystkich następnych briefów: **brief
   nie może żądać tezy ze źródła spoza listy źródeł danej lekcji.** Druga:
   listy „ma pokryć" trzeba pisać pod widełki — pełne pokrycie lekcji 4.1
   dawało 19 809 znaków przy suficie 12 000.
4. **`wc -c` liczy bajty.** Polskie diakrytyki podwajają się, więc pomiar
   objętości zawyża o ~4,5%. Trzy lekcje fali 1 są przez to ~2% ponad
   sufitem (12 207–12 281 znaków) — **świadomie nie przycięte**, zapisane
   jawnie, żeby nikt nie odkrył tego później jako ukrytej niezgodności.
   Kontrakt `TrescLekcji` liczy znaki, więc miarą jest `wc -m`.
5. **Pułapki pracy równoległej, obie zmaterializowane:** strażnik prozy
   działa na całym drzewie, więc jeden niedokończony plik autora blokuje
   KAŻDY commit; a dwa równoległe przebiegi bramki cytujące ten sam plik
   źródłowy **nadpisały sobie nawzajem** plik w `cytowane/` mimo
   ostrzeżenia w nagłówku. Pliki cytatów przydzielać przebiegom
   rozłącznie.

### NASTĘPNY KROK po module 4

Kurs 1 ma jeszcze **moduł 5** („Claude przez API: pierwsze integracje",
8 lekcji) i **moduł 6** („Koszty, jakość i bezpieczeństwo w produkcji",
6 lekcji). Przepis bez zmian: brief z dosłownymi mostami → fale autorów
→ przegląd pierwszej fali → przelot spójności → bramka cytatów →
`npm run db1:tresc` → commit.

**Most z modułu 4 jest już ustalony** — lekcja 4.8 kończy się dosłownie:
„Masz komplet systemów, które sprawiają, że Claude Code skaluje się poza
jedną sesję i jedną osobę. W module piątym wychodzimy poza gotowe
narzędzia i pukamy do Claude bezpośrednio: API, czyli Claude wpięty
w Twoje własne oprogramowanie."

**Granica do pilnowania w module 5:** lekcja 5.6 „Agent Skills na
platformie" jest osobna od lekcji 4.2 o skillach w Claude Code — 4.2
dostała na ten temat jedno zdanie i odesłanie, więc 5.6 ma pełne pole.
Podobnie 5.3 „Tool use" wobec 4.4 (MCP).

**Dwie pozycje otwarte, niezależne od modułów** (bez zmian od 2026-08-20):
cena w BAZIE jest nadal stara (49900 i 39900 groszy — zmiana kreatorem
albo w etapie 4, **nie** `npm run db1:seed`, bo seed wgrałby treść
roboczą na miejsce prozy); oraz **program Kursu 2 ma zostać CIĘTY** i
decyzja, które lekcje wypadają, wciąż nie zapadła — wymaga propozycji
przed startem prozy Kursu 2.

### PLANOWANIE KURSU 2 — punkt startowy (przygotowane 2026-08-21)

**Stan torów po module 4:** moduły 5 i 6 Kursu 1 powstają w OSOBNYCH
czatach (decyzja właściciela 2026-08-21). Ten tor bierze **cięcie
programu Kursu 2** — pozycję otwartą od 2026-08-20, blokującą start
prozy Kursu 2.

**Program dziś w bazie** (`jak-uzywac-githuba`, 0 lekcji z prozą):

| # | Moduł | Lekcji | Minut |
|---|---|---|---|
| 1 | Start: Git, GitHub i pierwsze repozytorium | 6 | 95 |
| 2 | Codzienna praca z Gitem | 7 | 90 |
| 3 | Repozytorium jak u profesjonalisty | 8 | 115 |
| 4 | Współpraca: issues i pull requesty | 11 | 165 |
| 5 | Automatyzacja: GitHub Actions | 7 | 120 |
| 6 | Bezpieczeństwo konta i kodu | 6 | 95 |
| 7 | Ponad podstawy: narzędzia, które przyspieszają | 5 | 65 |
| | **razem** | **50** | **745** |

**Dlaczego cięcie w ogóle jest na stole — liczba, nie przeczucie.**
Przy zmierzonym koszcie z modułu 4 (267 tys. tokenów na lekcję) pełne
50 lekcji to **~13 mln tokenów**; przy koszcie modułu 2 (172 tys.) —
~8,6 mln. Scenariusze Kursu 2 są przy tym **3,3× grubsze na lekcję** niż
Kursu 1 (1027 kB kontra 311 kB), więc dolna granica jest mało prawdopodobna.
Każda wycięta lekcja to realne 170–270 tys. tokenów mniej.

**Czego wymaga propozycja cięcia** (do przedstawienia właścicielowi):

1. **Które lekcje wypadają i dlaczego** — z jawnym kryterium, nie „ta
   wygląda mniej ważnie". Kandydaci narzucający się z samej struktury:
   moduł 4 ma 11 lekcji przy średniej 7, moduł 7 („Ponad podstawy") jest
   z definicji dodatkiem, a `about-codespaces.md` ma 785 B i jest samym
   spisem odsyłaczy (patrz CLAUDE.md, uwagi o cienkich źródłach modułu 7).
2. **Sprawdzenie obietnicy strony sprzedażowej.** Wymóg właściciela
   z D7: **strona nie może obiecywać niczego spoza programu.** Strona
   Kursu 2 ma 12 sekcji w bazie (`hero`, `problem`, `positioning`,
   `transformation`, `comparison`, `for_whom`, `package`, `author`,
   `opinions`, `guarantee`, `faq`, `benefits`) — **każdą trzeba
   przeczytać przeciw nowemu programowi**, bo to ona jest umową
   z klientem. Sekcja `package` i `benefits` są najbardziej narażone.
3. **Co cięcie pociąga technicznie** (sprawdzone, nie zgadnięte):

| Co | Gdzie | Uwaga |
|---|---|---|
| program w bazie | dyspozytorem, nie seedem | `npm run db1:seed` wgrałby treść ROBOCZĄ na miejsce prozy — **nie używać** |
| statystyki katalogu (7 modułów / 50 lekcji / 745 min) | renderowane z bazy na `/szkolenia` | zmienią się same po zmianie programu |
| `tools/seed/seed-przyklady.ts` | seed | trzyma ten sam program — rozjedzie się z bazą, jeśli go nie poprawić |
| `goldeny/d7-tresc.json` | golden treści | pilnuje 91 scenariuszy; **scenariusze wyciętych lekcji ZOSTAJĄ w repo** jako ślad D7 (decyzja z 2026-08-18), więc golden i `straznik-scenariuszy` (91) **nie zmieniają się** |
| `docs/plugin-1/PROGRAM-KURSOW-D7.md` | dokument programu | zaakceptowany 2026-08-18 — cięcie wymaga **nowej akceptacji właściciela**, tak jak wtedy |

4. **Czego cięcie NIE zmienia:** ceny (299/349 zł — decyzja z 2026-08-20),
   widełek prozy (8–12 tys. znaków), reguły „każda teza ma pokrycie
   w źródle", bramki cytatów ani trybu równoległego.

**Kolejność, która wynika z zależności:** propozycja cięcia → akceptacja
właściciela → program w bazie dyspozytorem → **dopiero potem** brief
i proza pierwszego modułu Kursu 2. Pisanie prozy przed cięciem groziłoby
napisaniem lekcji, która wypadnie.

**Wzorzec briefu do wykorzystania:**
[`tresc-kursow/jak-korzystac-z-claude/modul-4/BRIEF-prozy-modulu.md`](../../tresc-kursow/jak-korzystac-z-claude/modul-4/BRIEF-prozy-modulu.md)
— najbogatszy z dotychczasowych (tabele podziału grubych źródeł, sześć
postaci zawężenia, procedura budżetu przez pomiar, tabela znalezisk).

### KONSOLIDACJA KURSU 1 — ZROBIONA (2026-08-22) i decyzje pod Kurs 2

**Kurs 1 jest kompletny i scalony**: PR #51 (moduł 3) i PR #52
(moduł 5) weszły na trunk treści; zweryfikowane DWUSTRONNIE — 41 plików
prozy na gałęzi i 41 lekcji z treścią w bazie (SQL, nie log narzędzia).
Wersja 0.31.0. Konflikty scalania (POSTEP.md, KROK-3-KURSY.md) częściowo
PRZEPLECIONE przez wspólny boilerplate sekcji — rozwiązane rekonstrukcją
pełnych sekcji, nie kasowaniem znaczników w miejscu.

**Decyzje właściciela z 2026-08-21/22** (pytania po zbadaniu gruntu;
wszystkie cztery odpowiedzi = rekomendacje agenta):

1. **Bramka cytatów 17 lekcji Kursu 1: zostaje jak jest** (0 tokenów).
   Warunek właściciela sprawdzony w kodzie: usterki dotykają WYŁĄCZNIE
   treści lekcji — nie systemu, nie strony sprzedażowej.
2. **Cięcie K2: MOCNE (~33–38 lekcji), głębokość ostatecznie po
   pomiarze.** Propozycja cięcia powstaje od razu; kalibracyjny moduł 1
   K2 mierzy realny koszt lekcji; ostateczną listę cięć właściciel
   klepie z liczbami w ręku. Moduł 1 jest bezpieczny — żaden wariant
   cięcia go nie rusza.
3. **Wejście autora: wyciąg + podział sekcji** (jak od modułu 4 K1);
   BEZ podawania samych fragmentów — zgubione zawężenia żyją
   w kontekście wokół fragmentu.
4. **Grupowanie lekcji o wspólnym źródle u jednego autora —
   PRZETESTOWAĆ w kalibracji.** Jakość mierzona jak zwykle (4 sygnały
   + bramka); trzyma → reguła dla K2, nie trzyma → powrót do
   1 autor = 1 lekcja.
5. **Bramka cytatów K2: wyrywkowa** — 2 najgęstsze lekcje na moduł
   (~200 tys. tokenów/moduł), reszta lekcji z jawnie zapisanym
   ryzykiem, jak w K1.

**Kolejność robót K2** (aktualizuje kolejność z sekcji „PLANOWANIE
KURSU 2" wyżej — kalibracja wchodzi PRZED ostateczną akceptacją cięcia):
propozycja cięcia (agent) → **kalibracja: moduł 1 K2 w jednym czacie**
(ton + wzorzec formatu K2 + pomiar kosztu + test grupowania) →
akceptacja wzorca i OSTATECZNEJ listy cięć przez właściciela → program
w bazie dyspozytorem → **3 czaty równoległe** na pozostałe moduły
(worktree per czat, gałęzie `feat/tresc-k2-modul-N`, mosty dosłowne
w briefach z góry, pliki cytatów przydzielane rozłącznie, `db1:tresc`
zawsze z filtrem `--kurs --modul --sprawdz`).

### PROPOZYCJA MOCNEGO CIĘCIA KURSU 2 (2026-08-22) — czeka na akceptację po kalibracji

Przygotowana na decyzję właściciela „tnij mocno, głębokość ostatecznie po
pomiarze". **Program w bazie zmieniamy DOPIERO po akceptacji ostatecznej
listy** — kalibracja modułu 1 idzie przed nią, bo moduł 1 nie jest ruszany
żadnym wariantem.

**Jawne kryteria cięcia** (w tej kolejności):

1. **Rdzeń obietnicy sprzedażowej** — hero+benefits: commity, gałęzie,
   historia, pull requesty i współpraca, GitHub jako bezpieczna kopia,
   podstawowe bezpieczeństwo. Lekcja poza rdzeniem = kandydat.
2. **Adresat** — samouk/przedsiębiorca bez programowania, najczęściej
   pracujący sam (FAQ obiecuje „nie musisz umieć programować" i odpowiada
   na „pracuję sam"). Tematy czysto korporacyjno-deweloperskie wypadają.
3. **Koszt produkcji jako tiebreaker** — scenariusze modułu 7 ważą
   43 kB/lekcję (moduły 1–3: 10–12 kB/lekcję).

**Proponowana lista — z 50 do 31 lekcji (19 wypada), ~480 min:**

| Moduł | Zostaje | Wypada (powód: kryterium) |
|---|---|---|
| 1. Start (6→5) | 1.1–1.5 | 1.6 „Git od środka" (2: teoria internals zbędna nieprogramiście) |
| 2. Codzienna praca (7→6) | 2.1–2.5, 2.7 (ściąga = obietnica z `package`) | 2.6 „Rebase bez strachu" (2: zaawansowane; decyzyjny kawałek zostaje w 4.9) |
| 3. Repo profesjonalisty (8→5) | 3.1, 3.2, 3.3, 3.5, 3.6 | 3.4 Licencja, 3.7 LFS, 3.8 Szablony (1+2: poza rdzeniem, niszowe) |
| 4. Współpraca (11→7) | 4.1, 4.2, 4.4, 4.5, 4.6, 4.8, 4.9 | 4.3 Prowadzenie issue (nadmiar obok 4.2), 4.7 Robienie review (2: solo-adresat), 4.10 Forki (1: wkład w OSS poza rdzeniem), 4.11 PR↔issue (drobiazg do wzmianki w 4.5) |
| 5. Actions (7→4) | 5.1, 5.2, 5.3, 5.6 (sekrety=bezpieczeństwo) | 5.4 Anatomia, 5.5 Zmienne i konteksty (referencyjne), 5.7 CD (2: deploy nieprogramisty nie idzie przez Actions) |
| 6. Bezpieczeństwo (6→4) | 6.1, 6.2, 6.4, 6.6 | 6.3 Przegląd funkcji (nadmiar obok konkretów), 6.5 Dependabot (2: bez własnych zależności) |
| 7. Ponad podstawy (5→0) | — | cały moduł (3: z definicji dodatek, najdroższy na lekcję; 7.3 Codespaces ma źródło 785 B) |

**Mikro-wariant do rozważenia:** uratować 7.2 „GitHub Pages" jako ostatnią
lekcję modułu 3 (realna wartość dla przedsiębiorcy: strona z repozytorium)
— wtedy 32 lekcje, ~495 min.

**Sprawdzenie 12 sekcji strony przeciw nowemu programowi — wynik:**
rdzeń obietnicy (hero, benefits, positioning, transformation, comparison,
for_whom, faq) jest pokryty przez 31 lekcji. **ALE roboczy `package`
kłamie już DZIŚ przy 50 lekcjach**: obiecuje „6 modułów wideo (26 lekcji)"
(kurs jest tekstowy i ma 7 modułów), a `package`+`benefits` obiecują
„moduł ratunkowy: restore/revert/reset", którego nie niesie ŻADEN tytuł
z 50. Wniosek: sekcje sprzedażowe są rozjechane niezależnie od cięcia
i będą pisane od nowa w etapie 4 pod ostateczny program — to tam
rozstrzygnie się też los obietnicy restore/revert/reset (przepisać
obietnicę albo dodać lekcję ratunkową do programu).

**Co cięcie pociąga technicznie** (bez zmian wobec punktu startowego
z 2026-08-21): program dyspozytorem (nie seedem!), statystyki katalogu
zmienią się same, `tools/seed/seed-przyklady.ts` do korekty, scenariusze
wyciętych lekcji ZOSTAJĄ w repo (golden i straznik-scenariuszy bez zmian),
cena w bazie nadal do zmiany kreatorem (29900/34900).

### KALIBRACJA — moduł 1 K2 z testem A/B Opus vs Sonnet (decyzja właściciela 2026-08-22)

**Decyzja właściciela 2026-08-22 zmienia ustawienie modelu autorów
z 2026-08-18 w trybie POMIAROWYM:** kalibracyjny moduł 1 K2 (6 lekcji,
nieruszany cięciem) piszą autorzy w podziale **3 lekcje Opus 5 + 3 lekcje
Sonnet 5**; bramka cytatów na kalibracji jest **PEŁNA (wszystkie 6 lekcji,
jednorazowo jako przyrząd pomiarowy ~600 tys. tokenów)** — potem wraca
wyrywkowa 2/moduł. Bramka-weryfikator ZAWSZE na Opusie.

Cele kalibracji (wszystkie naraz):
1. **TON i wzorzec formatu K2** — pierwsza gotowa lekcja = wzorzec dla
   3 czatów (jak lekcja 1.1 w K1); akceptuje właściciel.
2. **Pomiar realnego kosztu lekcji K2** (źródła GitHuba są ~10× cieńsze
   niż Claude w K1 — 170–270 tys./lekcję z K1 może być zawyżone).
3. **Test A/B modelu autorów**: porównanie trafności bramki, 4 sygnałów
   i kosztu między ramionami. Sonnet przejmuje resztę K2 tylko przy
   jakości bez spadku — inaczej zostaje Opus (decyzja z 2026-08-18).
4. **Test grupowania**: jeśli brief znajdzie parę lekcji o wspólnym
   źródle, jeden autor pisze obie (czyta źródło raz) — po jednej parze
   na ramię, żeby nie mylić efektu modelu z efektem grupowania.

Przydział lekcji do ramion robi brief (dopasować trudnością, nie
kolejnością). Ostateczną listę cięć i wybór modelu właściciel klepie
PO kalibracji, z liczbami. Potem: program dyspozytorem → **3 czaty**
na modułы 2–6 (worktree per czat, gałęzie `feat/tresc-k2-modul-N`,
mosty dosłowne w briefach, pliki cytatów rozłącznie, `db1:tresc`
zawsze z filtrem).

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

## Moduł 3 Kursu 1 — trzeci tor (czat modułu 3, od 2026-08-20)

Worktree `/home/krzysiek/Pod-strona-Szkolenia-modul3`, gałąź
`feat/tresc-lekcji-modul-3` (od `feat/tresc-lekcji-kursow`). Osiem
lekcji, trzy fale (3 + 3 + 2). Brief:
[modul-3/BRIEF-prozy-modulu.md](../../tresc-kursow/jak-korzystac-z-claude/modul-3/BRIEF-prozy-modulu.md).

### Co brief modułu 3 wnosi ponad brief modułu 1

Materiał wymusił dwie rzeczy, których przy module 1 nie było:

- **podział CZTERECH grubych źródeł** między lekcje: `settings.md`
  (334 kB), `commands.md` (154 kB, sama tabela komend ma 108 wierszy),
  `permissions.md` + `permission-modes.md` (131 kB razem) oraz
  `best-practices.md` (39 kB, czytany przez trzy lekcje naraz). Bez tego
  lekcja 3.8 byłaby przedrukiem tabeli ustawień, a 3.6 katalogiem komend;
- **trzynaście imiennie wypisanych siedlisk „zgubionego zawężenia"** —
  jedynej klasy usterki, jaką przebieg cytatów znalazł w module 1 (7 z 7).
  W tej dokumentacji wracają jako: na jakim systemie, w jakim trybie
  uprawnień, na jakim planie, od której wersji Claude Code, w którym
  zakresie ustawień, w którym terminalu.

### Fala 1 (lekcje 3.1–3.3) — ZROBIONA, oceniona

Napisana ze źródeł `how-claude-code-works.md`, `quickstart.md` + `setup.md`
i `common-workflows.md`, czytanych w oryginale i w całości. Przegląd:

| Sygnał jakości | Wynik |
|---|---|
| Mosty | **czysto** — każda lekcja kończy się dosłownie zdaniem z briefu, 3.1 otwiera się podjęciem końcówki modułu 2 |
| Tabele zgodności | 47 / 39 / 39 wierszy przy progu 8 |
| Zawężenia | utrzymane te trudne: „inteligencja kodu wymaga wtyczek", chmura = Anthropic **albo** self-hosted organizacji, punkty kontrolne pomijają dowiązania i nie obejmują systemów zdalnych, MEMORY.md ładuje 200 linii **albo** 25 kB — co wypadnie wcześniej |
| Lanie wody | brak — każda sekcja odpowiada sekcji źródła |

### LEKCJA: widełki objętości potrafią wyciąć rusztowanie dla adresata

Brief dawał 12–16 tys. znaków, lekcje wyszły na 21–23 tys. Autorzy
**sami zaczęli przycinać** — i w chwili wyczerpania limitu sesji mieli
już wycięte: definicję terminala i katalogu roboczego, wyjaśnienia „co
to są testy", „co to jest refaktoryzacja", „co to jest pull request",
rozpoznanie PowerShell kontra CMD oraz zawężenie o samoczynnych
aktualizacjach tylko instalacji natywnych. Czyli **dokładnie to, czego
brief od nich żądał dla adresata-nieprogramisty**.

Cięcie cofnięte (`git checkout` do commitu fali 1). Wniosek do briefów
kolejnych modułów: **widełki są budżetem, nie limitem** — przy kolizji
wygrywa zawężenie ze źródła i wyjaśnienie dla adresata, a nie liczba
znaków. Zapisane w briefie modułu 3 jako reguła nadrzędna.

### DECYZJA WŁAŚCICIELA (2026-08-20): niższa cena zamiast dogęszczania

Właściciel **odwołał dogęszczanie Kursu 1** i wybrał **obniżenie ceny**.
To zmiana decyzji z 2026-08-19
([PRODUKCJA-MATERIALU-KROK-3.md](PRODUKCJA-MATERIALU-KROK-3.md)), gdzie
dogęszczenie wybrano właśnie po to, żeby ceny nie ruszać, a obniżkę
jawnie odrzucono. Powód zmiany: koszt pracy.

Co z tego wynika:

- widełki dla lekcji **3.4–3.8**: 12–16 tys. znaków (reguła nadrzędna
  wyżej zostaje);
- **fala 1 zostaje bez przycinania** — przerabianie gotowego tekstu to
  ten sam koszt, którego decyzja unika; moduł będzie lekko nierówny
  i to jest świadome;
- **cena w bazie NIE jest jeszcze zmieniona.** Kurs 1 stoi na 499 zł
  wobec 399 zł Kursu 2. Nowa kwota nie została podana, a zmiana ceny
  nie należy do terytorium czatu modułu 3 (to pole kursu, nie treść
  lekcji) — wchodzi kreatorem albo dyspozytorem, gdy właściciel poda
  wysokość. **Do odhaczenia przed bramką B7.**

### Moduł 3 — ZAMKNIĘTY I WGRANY (2026-08-20)

Osiem lekcji, **148 086 znaków prozy**, wgrane `npm run db1:tresc`
drogą kreatora (8 wgranych, 0 bez zmian). Pełny rozpis lekcji, sygnałów
jakości i kosztu: [tresc-kursow/POSTEP.md](../../tresc-kursow/POSTEP.md),
sekcja „Moduł 3 Kursu 1".

**DECYZJE WŁAŚCICIELA (2026-08-20) o zakresie bramki cytatów:**

1. Bramka objęła **tylko lekcje 3.7 i 3.8** (nie osiem) — ze względu na
   koszt. Wynik: 70 wierszy sprawdzonych, **13 usterek naprawionych**.
2. Po poznaniu tego wyniku właściciel został zapytany ponownie, bo
   liczba zmieniła rachunek: **trafność bramki wyniosła 18,6% wobec
   3,6% w module 1** — pięć razy więcej. Decyzja: **sześciu lekcji
   3.1–3.6 NIE sprawdzamy; właściciel przejrzy je sam w kreatorze.**

**Co z tego wynika i o czym trzeba pamiętać przy B7:** usterki tej klasy
są niewidoczne przy zwykłym czytaniu. Zdanie brzmi sensownie i JEST
prawdziwe — brakuje mu tylko warunku ze źródła (plan, wersja, system,
tryb, zakres ustawień), a tego nie da się wykryć bez zajrzenia do
dokumentacji. Lekcje 3.1–3.6 idą więc do oceny właściciela z jawnie
zapisanym ryzykiem, a nie jako materiał po dwóch bramkach.

**Wniosek do zaplanowania modułu 4** (ta sama klasa źródeł — subagenci,
skille, hooki, MCP, pluginy, CI): przy dokumentacji Claude Code bramka
cytatów nie jest formalnością, tylko wykrywa co piątą tezę. Warto ją
wliczyć w koszt modułu z góry, zamiast decydować po fakcie.
### Moduł 5 Kursu 1 — ZAMKNIĘTY I WGRANY (2026-08-21, czwarty tor)

Osiem lekcji, **93 tys. znaków prozy**, wgrane `npm run db1:tresc` drogą
kreatora. Pełny rozbiór — cztery sygnały jakości, wynik bramki, koszt,
pięć usterek scenariuszy D7 — w [tresc-kursow/POSTEP.md](../../tresc-kursow/POSTEP.md),
sekcja „Moduł 5 Kursu 1". Brief:
[modul-5/BRIEF-prozy-modulu.md](../../tresc-kursow/jak-korzystac-z-claude/modul-5/BRIEF-prozy-modulu.md).

**Stan prozy: 35 z 91 lekcji** (Kurs 1 kompletny w modułach 1–5; moduł 4
domknął się równolegle w drugim torze).

Cztery rzeczy, które muszą przetrwać `/clear`:

1. **DECYZJA WŁAŚCICIELA (2026-08-21): moduł o API jest MAPĄ DLA
   DECYDENTA.** Zero instrukcji wykonawczych, kod wyłącznie jako
   ilustracja do rozpoznania, `Pytania do wykonawcy` zamiast promptów
   tam, gdzie prompt nie działa w czacie. Odrzucono wariant
   „czytelnik uruchamia pierwsze wywołanie" i pełny kurs techniczny.
   **Skutek uboczny wart zapamiętania: przy tym tonie widełki
   8–12 tys. znaków są wykonalne** — moduł 3, pisany instruktażowo,
   przy tej samej klasie źródeł dawał 17–23 tys. Gdyby kolejny moduł
   znów rozpychał się ponad widełki, pierwsze pytanie brzmi: czy to
   materiał, czy instruktaż.
2. **Bramka cytatów znów zawężona przez właściciela do dwóch lekcji**
   (5.4 i 5.8): 69 wierszy, **13 usterek**, trafność 20,0% i 11,8%.
   Sześć lekcji bez bramki, z ryzykiem zapisanym jawnie — tak samo jak
   3.1–3.6.
3. **NOWY PODGATUNEK USTERKI: gubione modalności angielskie.** `might`,
   `can`, `up to` tłumaczone jako pewniki — „can use **up to** three
   times more" stało się „mniej więcej trzy razy więcej", czyli sufit
   zamienił się w wartość typową. Wszystkie dziewięć usterek lekcji 5.8
   było tym wzorcem. **Przy każdej kolejnej prozie z angielskiego źródła
   szukać tego osobno**, bo po polsku jest niewidoczne.
4. **PUŁAPKA PRACY RÓWNOLEGŁEJ — `npm run db1:tresc` bez filtra wgrywa
   CUDZE moduły.** Narzędzie zbiera wszystkie zmienione pliki prozy
   w worktree, a każdy worktree niesie kopie cudzych modułów sprzed
   swojego odgałęzienia. Przy wgrywaniu modułu 5 nadpisałem w bazie
   lekcje **4.1 i 4.3** wersjami starszymi o dwie godziny (pliki w repo
   sąsiada nietknięte — ucierpiała tylko baza; naprawione w dwie minuty
   ponownym wgraniem z jego worktree). **Odtąd wgrywamy zawsze
   z filtrem i po suchym biegu:**
   `npm run db1:tresc -- --kurs jak-korzystac-z-claude --modul N --sprawdz`,
   a dopiero potem bez `--sprawdz`. Filtr istniał od początku — to była
   pomyłka operatora, nie wada narzędzia.

**Do rozważenia przy domykaniu Kursu 1:** dokumentacja platformy okazała
się sprzeczna sama ze sobą w czterech miejscach (dostępność skilli
między powierzchniami, liczba nagłówków beta przy skillach, status ZDR
plików kontra PDF-ów, „per message" kontra „per turn" przy limicie
obrazów). Lekcje rozbrajają je jawnie, wzorem lekcji 1.2. Gdyby powstał
słowniczek kursu, to są gotowe hasła.

### Moduł 6 Kursu 1 — W TOKU (stan 2026-08-21 wieczorem)

> **NIEAKTUALNE — moduł 6 ZAMKNIĘTY 2026-08-21** (PR #49/#50, 6 lekcji,
> 70 848 znaków; pełny rozbiór w POSTEP.md). Sekcja zostaje jako zapis
> stanu z wieczora przed domknięciem.

Worktree `/home/krzysiek/Pod-strona-Szkolenia-modul6`, gałąź
`feat/tresc-lekcji-modul-6` (od `feat/tresc-lekcji-kursow`), port **3010**.
Pełny rozbiór przebiegu — cztery sygnały jakości, poprawki przepisu, koszty
i to, co zostaje do zrobienia — w [tresc-kursow/POSTEP.md](../../tresc-kursow/POSTEP.md),
sekcja „Moduł 6 Kursu 1".

**Pięć z sześciu lekcji zamkniętych** (11 483–11 993 znaków, 26–33 wiersze
zgodności): `3b0e50c`, `cafe25d`, `442657f`, `d99aa33`, `d7f527f`, przy
briefie w `42128c3`. **Lekcja 6.6 napisana, ale nieskrócona** (20 267 znaków
przy sufycie 12 000) i niezacommitowana.

Trzy rzeczy, które muszą przetrwać `/clear`:

1. **Decyzja właściciela o tonie (2026-08-21): ton idzie za tematem, nie za
   numerem modułu.** 6.1–6.4 to „mapa dla decydenta" jak moduł 5, 6.5 mapa
   z gotowymi promptami, **6.6 lekcja WYKONAWCZA jak moduły 3–4** — bo
   Claude Code to narzędzie, w którym czytelnik siedzi sam od modułu 3.
2. **Największa granica tego modułu jest WSTECZNA.** Bufor, wsad i pola
   `usage` są już w lekcjach 1.4 i 1.5, i to z liczbami. Brief odgradza je
   jawnie: mnożniki i procent zniżki są w 6.1/6.2 **callbackiem**, nie
   odkryciem, a cały budżet znaków idzie na mechanikę. Przy każdej korekcie
   treści tego modułu sprawdzać tę granicę jako pierwszą.
3. **Scenariusze modułu mają siedem znanych usterek** (spis w briefie,
   sprawdzone w oryginale). Autorzy żadnej nie powielili. Poprawek samych
   scenariuszy NIE robimy — są pod goldenem, decyduje właściciel.

**Następny krok:** skrócić 6.6 do widełek, przelot spójności, bramka
cytatów, `straznik-prozy`, wgranie `npm run db1:tresc` na porcie 3010.

### KALIBRACJA — WYNIK (2026-08-22): moduł 1 Kursu 2 zamknięty, trzy decyzje czekają

Moduł 1 Kursu 2 gotowy i w bazie (6 lekcji, 64 418 znaków — szczegóły
w [tresc-kursow/POSTEP.md](../../tresc-kursow/POSTEP.md)). Poniżej to, po co
kalibracja była robiona: **liczby do trzech decyzji właściciela.**

#### 1. Test A/B Opus kontra Sonnet — JAKOŚĆ NIE DO ODRÓŻNIENIA

Przydział: Opus pisał 1.1, 1.3, 1.6; Sonnet 1.2, 1.4, 1.5. Waga źródeł
rdzennych prawie równa (20,2 kB kontra 19,6 kB), każde ramię dostało jedną
lekcję gęstą od definicji. Bramka cytatów: trzy weryfikatory na Opusie, każdy
z jedną lekcją z każdego ramienia.

| Miara | Opus 5 | Sonnet 5 |
|---|---|---|
| Tokeny na lekcję | **232 379** | **214 349** (−8,4%) |
| Czas łącznie | 69,7 min | **41,9 min** (−40%) |
| Sprawdzonych wierszy zgodności | 89 | 90 |
| **Usterek znalezionych przez bramkę** | **20** | **20** |
| w tym zmieniających treść dla klienta | 8 | 8 |
| Średnia długość lekcji | **11 745 znaków** | 9 330 znaków |
| Lekcje pod sufitem/podłogą widełek | 3× blisko sufitu | 1× **poniżej podłogi** (7 760), autor nie zauważył |

**Wniosek: bramka nie odróżnia ramion.** Ani liczbą usterek (20 kontra 20 przy
niemal identycznej liczbie sprawdzonych wierszy), ani ich ciężarem (8 kontra 8
zmieniających treść). Obaj autorzy odmawiali tez bez pokrycia, obaj sami
zgłaszali sprzeczności w dokumentacji, obaj czytali oryginały.

**Różnice są gdzie indziej i są realne:**
- **Opus pisze o 26% dłuższe lekcje za 8% wyższą cenę** — czyli tańszy na znak.
  Sonnet trzyma się dolnej granicy widełek i raz z niej wypadł.
- **Sonnet jest o 40% szybszy** — to liczy się przy pracy równoległej.
- **Opus raportuje głębiej** (9 udokumentowanych pułapek przy lekcji 1.3 kontra
  1–2 na lekcję u Sonneta), ale **na jakość oddanego tekstu to się nie przełożyło**.
- **Autorzy obu modeli mierzą objętość własnym wycinkiem pliku i mylą się do 900
  znaków.** Do promptu każdego autora MUSI wejść komenda mierząca kontraktem:
  `node --input-type=module -e 'import {czytajProze} from "./lib/proza-lekcji.ts"; import {readFileSync} from "node:fs"; const p=process.argv[1]; console.log([...czytajProze(readFileSync(p,"utf8"),p).tresc].length);' <plik>`

#### 2. Test grupowania — WYNIK NEGATYWNY, NIE POWTARZAĆ

Po jednej parze na ramię, obie pisane w JEDNEJ sesji autora (kontynuacja, nie
nowy subagent). W obu ramionach druga lekcja pary okazała się **najdroższą
lekcją swojego ramienia**:

| Para | 1. lekcja | 2. lekcja | wzrost |
|---|---|---|---|
| Sonnet 1.4 → 1.5 | 194 137 | 281 702 | **+45%** |
| Opus 1.1 → 1.6 | 189 698 | 310 116 | **+63%** |

Mechanizm: druga lekcja dopłaca za przesyłanie narosłego kontekstu w każdej
turze (lekcja 1.5 miała tylko 13 wywołań narzędzi i najwyższy rachunek ramienia).
Grupowanie **daje czas i spójność** (−30% czasu, autorzy potwierdzili, że
rozpoznali wzorzec serii bez analizy od zera), ale **kosztuje tokeny**.
**Rekomendacja: 1 autor = 1 lekcja.** Oszczędność jest większa niż cokolwiek,
co da wybór modelu.

#### 3. Zmierzony koszt lekcji Kursu 2 — podstawa ostatecznej listy cięć

| Pozycja | Tokeny |
|---|---|
| Autorzy, 6 lekcji | 1 340 186 |
| Pełna bramka cytatów (3 weryfikatory) | 533 837 |
| **Razem moduł 1** | **1 874 023** |
| Na lekcję z PEŁNĄ bramką | 312 337 |
| **Na lekcję z bramką WYRYWKOWĄ (2/moduł, jak w planie)** | **~253 000** |

Przy 1 autorze = 1 lekcji (bez grupowania) koszt lekcji spada do **~195 000**
autorsko + ~30 000 bramki ≈ **225 000**.

**Co to znaczy dla listy cięć** (moduł 1 już zrobiony, liczby dotyczą reszty):

| Wariant | Lekcji zostaje | Do napisania | Szacunek tokenów |
|---|---|---|---|
| bez cięcia | 50 | 44 | **9,9–13,7 mln** |
| cięcie mocne (propozycja) | 31 | 25 | **5,6–7,8 mln** |
| cięcie mocne + ratunek 7.2 Pages | 32 | 26 | 5,9–8,1 mln |

Widełki biorą się z rozrzutu: dolna granica przy 1 autorze = 1 lekcji i bramce
wyrywkowej, górna przy dzisiejszym trybie.

#### 4. Korekta listy zakazanych obietnic (znalezisko bramki A)

Lista zakazów wymieniała **Dependabota**, ale lekcja **6.4 „Zabezpiecz swoje
repozytorium" ZOSTAJE** w najostrzejszym wariancie cięcia, a to ona niesie graf
zależności, alerty Dependabota i przeglądy zależności (46 wystąpień nazwy).
Wypada tylko dedykowana 6.5. **Do rozstrzygnięcia: albo zdjąć Dependabota
z listy zakazów, albo wyciąć także 6.4.**

#### 5. Do przekazania czatom modułów 2–6

- Most wyjściowy modułu 1, DOSŁOWNIE (moduł 2 otwiera się jego podjęciem):
  „Masz konto, narzędzia, repozytorium na GitHubie i jego kopię na dysku, a do
  tego rozumiesz, co Git robi pod spodem: migawki, gałęzie i dwuetapowy zapis.
  W module drugim zamieniamy to w codzienny rytm pracy: gałąź, zmiana, commit,
  wypchnięcie na GitHuba i pobranie zmian z powrotem."
- Czytelnik wchodzi do modułu 2 **z jednym wykonanym `git push`** (ćwiczenie 1.6).
- Projekt przewodni: `hello-world` (piaskownica z 1.2) i `stargazers-log`
  (projekt kursu od 1.4, sklonowany na dysk w 1.5).
- Definicja repozytorium rosła przez cztery lekcje i jest **domknięta** w 1.6 —
  moduł 2 nie zaczyna jej od nowa.
- Termin **„stagizować"** wprowadzony w 1.6 jako kalka z angielskim w nawiasie;
  jeśli ma być polska nazwa, decyzja obowiązuje cały Kurs 2.
- **Uzasadnienie polecenia oddzielać od treści polecenia** — autor przepisze je
  do prozy jako tezę dokumentacji (zdarzyło się przy 1.4).

#### 6. CO OSZCZĘDZA TOKENY BEZ UTRATY JAKOŚCI — ranking z pomiaru

Uporządkowane wg zmierzonego wpływu, nie wg przeczucia. Pierwsze trzy pozycje
mają **zerowy koszt jakościowy** — wynikają wprost z liczb tego modułu.

| # | Zmiana | Oszczędność | Koszt jakości |
|---|---|---|---|
| 1 | **Cięcie programu** (44 lekcje → 25) | **4,3–5,9 mln tokenów** | decyzja właściciela o zakresie kursu, nie o jakości lekcji |
| 2 | **1 autor = 1 lekcja** (koniec grupowania) | ~40% na lekcjach, które byłyby drugie w parze; przy 25 lekcjach ok. **1,2 mln** | **żaden** — jakość obu par była równa reszcie; tracimy tylko 30% czasu i trochę spójności, którą i tak wymusza brief |
| 3 | **Bramka wyrywkowa 2 lekcje/moduł** (zamiast pełnej) | **~355 tys. na moduł sześciolekcyjny** | znany i przyjęty: reszta lekcji z jawnie zapisanym ryzykiem, jak w Kursie 1 |
| 4 | **Komenda mierząca kontraktem w prompcie autora** | 1–7 przelotów cięcia mniej na lekcję (1.6 potrzebowała **siedmiu**, 1.3 trzech) | **żaden** — przeciwnie, usuwa lekcje spod widełek |
| 5 | **Węższy przydział źródeł w briefie** | lekcja 1.3 przeczytała 6 plików i pierwszą wersję miała o 66% za długą | uwaga: to samo cięcie źródeł zabrało 1.5 materiał i wypadła pod podłogę — ciąć źródła, nie tematy |
| 6 | **Drobne poprawki robi agent główny, nie autor** | wybudzenie autora kosztuje 90–280 tys.; poprawka redakcyjna kosztuje kilka tysięcy | **żaden**, dopóki poprawka jest chirurgiczna i sprawdzona przeciw źródłu |
| 7 | **Sonnet zamiast Opusa** | 8,4% | **pozorna** — Sonnet pisze o 26% krótsze lekcje, więc NA ZNAK jest droższy. Sensowna dopiero razem z pozycją 4, która wymusza długość |

**Pakiet rekomendowany dla modułu sześciolekcyjnego:** dziś 1,87 mln → po
zmianach 1–4 około **1,35 mln (−28%)**, przy tej samej bramce jakości. Razem
z cięciem programu cały pozostały Kurs 2 mieści się w **5,6–6,3 mln** zamiast
9,9–13,7 mln.

**Czego NIE oszczędzać** (to są dźwignie jakości, nie kosztu): czytania źródeł
w oryginale zamiast w wyciągu, tabeli zgodności 20–30 wierszy, dosłownych
mostów między lekcjami i przeglądu pierwszej fali przed drugą. Każda z tych
rzeczy zapłaciła za siebie w tym module co najmniej raz.

### DECYZJE WŁAŚCICIELA PO KALIBRACJI (2026-08-22 wieczorem) — WIĄŻĄCE dla modułów 2–6

Podjęte z liczbami z kalibracji w ręku. **Czytać przed startem każdego czatu Kursu 2.**

1. **CIĘCIE MOCNE ZATWIERDZONE, program ma 32 lekcje.** Propozycja z tego
   dokumentu wchodzi w całości w modułach 2–7 (moduł 7 znika), a **moduł 1
   zachowuje sześć lekcji — lekcja 1.6 „Git od środka" ZOSTAJE**, bo jest już
   napisana, sprawdzona bramką i wgrana, więc jej wycięcie nie oszczędza ani
   jednego tokena, a domyka progresję definicji i jako jedyna tłumaczy
   dwuetapowy zapis `add` → `commit`. **Do napisania zostaje 26 lekcji.**

| Moduł | Lekcji po cięciu | Które zostają |
|---|---|---|
| 1 Start | 6 (gotowe) | 1.1–1.6 |
| 2 Codzienna praca | 6 | 2.1–2.5, 2.7 |
| 3 Repozytorium profesjonalisty | 5 | 3.1, 3.2, 3.3, 3.5, 3.6 |
| 4 Współpraca | 7 | 4.1, 4.2, 4.4, 4.5, 4.6, 4.8, 4.9 |
| 5 Actions | 4 | 5.1, 5.2, 5.3, 5.6 |
| 6 Bezpieczeństwo | 4 | 6.1, 6.2, 6.4, 6.6 |
| 7 Ponad podstawy | 0 | — |
| **razem** | **32** | **26 do napisania** |

2. **AUTORZY NA SONNECIE 5** — zmiana decyzji z 2026-08-18, na dowodach
   kalibracji (bramka nie odróżniła ramion: 20 usterek na 89 wierszy u Opusa,
   20 na 90 u Sonneta, po 8 ciężkich). **Warunek konieczny, bez którego decyzja
   nie obowiązuje: w promptcie KAŻDEGO autora musi być komenda mierząca
   objętość kontraktem** (niżej) — Sonnet pisze krócej i raz wypadł pod dolną
   granicę widełek, czego jego autor nie zauważył.
   **Weryfikatory bramki cytatów zostają na OPUSIE.**

3. **DWA CZATY RÓWNOLEGŁE**, podział minimalizujący liczbę szwów między czatami
   (tylko jeden most przechodzi przez granicę czatów):

| Czat | Moduły | Lekcji | Gałąź | Worktree |
|---|---|---|---|---|
| A | 2 i 3 | 11 | `feat/tresc-k2-modul-2-3` | `../Pod-strona-Szkolenia-k2-A` |
| B | 4, 5 i 6 | 15 | `feat/tresc-k2-modul-4-6` | `../Pod-strona-Szkolenia-k2-B` |

4. **KONIEC GRUPOWANIA: 1 autor = 1 lekcja.** Test wypadł negatywnie w obu
   ramionach (druga lekcja w sesji: +45% u Sonneta, +63% u Opusa).

#### Obowiązkowe w promptcie każdego autora (wynik kalibracji)

```
node --input-type=module -e 'import {czytajProze} from "./lib/proza-lekcji.ts"; import {readFileSync} from "node:fs"; const p=process.argv[1]; console.log([...czytajProze(readFileSync(p,"utf8"),p).tresc].length);' <plik>
```

Autorzy mierzą `wc -m` własnym wycinkiem pliku i mylą się do 900 znaków —
liczy się wyłącznie pomiar kontraktu (bez frontmatteru i bez tabeli zgodności).
Procedura bez zmian: pisz sekcję → zmierz → przytnij natychmiast.

#### ⚠️ PIERWSZE ZADANIE CZATU A — wprowadzenie ciętego programu do bazy

**NIEBEZPIECZNA OPERACJA, przeczytać w całości przed wykonaniem.** Dyspozytor
**kasuje wiersze spoza wejścia**, więc zapis kursu bez identyfikatorów modułów
i lekcji **skasuje treść, która już jest w bazie** — w tym całą prozę modułu 1
Kursu 2 (6 lekcji, 64 418 znaków) . Zasady:

1. Najpierw **odczytaj obecny program z bazy razem z `id`** (kanał JSON
   kreatora, `szczegolyKursuPoId`), nie odtwarzaj go z pliku.
2. Wyślij strukturę **z zachowanymi `id` wszystkich lekcji, które zostają** —
   wtedy dyspozytor je aktualizuje zamiast tworzyć na nowo.
3. Lekcje wycinane po prostu **nie wchodzą do wejścia** — dyspozytor je usunie.
4. **NIE UŻYWAĆ `npm run db1:seed`** — wgrałby treść roboczą na miejsce prozy.
5. Po operacji sprawdzić SQL-em, że lekcje modułu 1 nadal mają treść
   (`length(content)` sześć razy niezerowe), a katalog `/szkolenia` pokazuje
   32 lekcje.
6. Poprawić `tools/seed/seed-przyklady.ts`, żeby seed nie rozjechał się
   z bazą, i statystyki w `PROGRAM-KURSOW-D7.md`.

#### Most z modułu 1 do modułu 2 — DOSŁOWNIE

Moduł 1 kończy się zdaniem, którego podjęciem **musi** otworzyć się lekcja 2.1:

„Masz konto, narzędzia, repozytorium na GitHubie i jego kopię na dysku, a do
tego rozumiesz, co Git robi pod spodem: migawki, gałęzie i dwuetapowy zapis.
W module drugim zamieniamy to w codzienny rytm pracy: gałąź, zmiana, commit,
wypchnięcie na GitHuba i pobranie zmian z powrotem."

Szew między czatami: **czat A ustala zdanie zamykające moduł 3 w swoim briefie
i przekazuje je czatowi B, zanim B napisze lekcję 4.1.**

#### Stan czytelnika wchodzącego do modułu 2

- Projekt przewodni: `hello-world` (piaskownica z 1.2, do wyrzucenia)
  i `stargazers-log` (projekt kursu od 1.4, sklonowany na dysk w 1.5).
- Ma za sobą **jeden wykonany `git push`** z terminala (ćwiczenie 1.6).
- Zna dziewięć komend Gita z 1.6, ale tylko z opisu — ściąga jest w 2.7.
- Definicja repozytorium **domknięta w 1.6** — moduł 2 nie zaczyna jej od nowa.
- Termin **„stagizować"** wprowadzony w 1.6 jako kalka z angielskim w nawiasie.
- Tożsamość Gita ustawiona dwa razy (komendą w 1.3, kreatorem Desktopa w 1.5).

#### Otwarte świadomie

- **Dependabot zostaje w kursie przez lekcję 6.4** („Zabezpiecz swoje
  repozytorium" — graf zależności, alerty, przeglądy zależności). Z listy
  zakazanych obietnic **zdejmujemy Dependabota**; wypada tylko dedykowana 6.5.
- **Sekcje sprzedażowe Kursu 2 są rozjechane niezależnie od cięcia** (roboczy
  `package` obiecuje „6 modułów wideo (26 lekcji)" i „moduł ratunkowy
  restore/revert/reset", którego nie niesie żaden tytuł). Pisane od nowa
  w etapie 4, pod program 32-lekcyjny.
- **Przelot zrzutów ekranu** na końcu produkcji: 94 miejsca w prozie.
### CZAT B Kursu 2 (moduły 4, 5, 6) — stan na 2026-08-22, po fali 2 modułu 5

Worktree `/home/krzysiek/Pod-strona-Szkolenia-k2-B`, gałąź
`feat/tresc-k2-modul-4-6` (od `feat/tresc-k2-modul-1`), port dev 3013.
`node_modules` i trzy katalogi `docs/dokumentacja-techniczna/d7/*` są
KOPIAMI (`cp -al`), `.env` dowiązaniem.

**Moduł 4 — sześć lekcji (4.2–4.7) po przeglądzie i po bramce cytatów.**
Objętości mierzone kontraktem: 11 639 / 11 909 / 11 802 / 11 945 /
11 988 / 11 944 znaków. Domknięcia zgodne z tabelą mostów co do znaku,
mosty wejściowe podjęte (próg: żaden wspólny ciąg dłuższy niż 40 znaków).

**Moduł 5 — fala 1 gotowa i przejrzana**: 5.1 „Zrozum GitHub Actions"
(11 876) i 5.2 „Pierwszy workflow w 10 minut" (11 780). Oba mosty
podjęte, domknięcia co do znaku, strażnicy zieleni.

**Zablokowane na czacie A (bez zmian, sprawdzone 2026-08-22):**
1. **Lekcja 4.1** — otwiera się podjęciem zdania, którym czat A zamyka
   moduł 3. W briefie modułu 4 stoi `⛔ CZEKA NA CZAT A`. Czat A nie ma
   jeszcze ANI JEDNEJ lekcji prozy modułu 3 (w jego worktree leżą same
   scenariusze `lekcja-*.md`) ani briefu prozy tego modułu, więc zdania
   nie będzie prędko. Reszta modułu 4 go nie potrzebuje.
2. **Wgrywanie treści do bazy** — ma sens dopiero po tym, jak czat A
   wprowadzi cięty program. Dziś w bazie stoi stary program 50-lekcyjny,
   więc dopasowanie po pozycji i tytule odrzuci prozę (i dobrze — to ten
   strażnik, nie usterka). Komenda, gdy przyjdzie pora:
   `npm run db1:tresc -- --kurs jak-uzywac-githuba --modul N --sprawdz`,
   potem bez `--sprawdz`, zawsze z `--adres http://localhost:3013`.

#### Co dał przelot spójności modułu 4 (trzy usterki, wszystkie naprawione)

Najważniejsze: **usterka „most przepisany, nie podjęty" nie była
jednorazowa.** Wyszła w 4.7, a przelot znalazł ją jeszcze dwa razy —
4.2 przepisywała domknięcie 4.1 ciągiem 121 znaków (całe pierwsze
zdanie) plus 100 znaków z drugiego, a 4.4 domknięcie 4.3 ciągiem
88 znaków, z dopisanym jednym słowem „już". Trzech autorów na sześciu.
**Wniosek na następne fale: to trzeba sprawdzać MASZYNOWO** — próg
40 znaków wspólnego ciągu między domknięciem poprzedniej lekcji
a pierwszym akapitem następnej. Prompt autora dostał od tej pory jawne
ostrzeżenie i zapowiedź takiego sprawdzenia; w fali 1 modułu 5 usterka
nie wystąpiła ani razu (autor 5.2 zgłosił nawet, że złapał ją u siebie
w pierwszym szkicu i przepisał akapit).

Poza tym: ćwiczenie 4.4 odsyłało po numer issue „do poprzedniej lekcji",
a issue zakłada się w 4.2 — po cięciu programu poprzednia to 4.3.
**Klasa usterki do zapamiętania: odsyłacz „poprzednia lekcja" trzeba
sprawdzać przeciw NOWEJ numeracji, nie przeciw scenariuszom.**
Lekcja 4.6 jako jedyna zamykała cudzysłowy znakiem `”` zamiast `"`
(33 wystąpienia) — konwencja Kursu 2 to `„tekst"`, wzięta z modułu 1.

#### Bramka cytatów modułu 4 — wyrywkowa, 4.4 i 4.7, weryfikatory na Opusie

**4.7: dwie usterki istotne, cztery drobne.** Największa: rada „kasuj
gałąź od razu po scaleniu" była **wnioskiem autora podanym jako teza
dokumentacji** — źródło nie mówi o kasowaniu gałęzi ani słowa, a rada
zdążyła rozejść się na cztery miejsca (proza, ćwiczenie, ściąga,
„Zapamiętaj"). Druga: „zawsze wyrzuca puste" rozszerzało źródło, które
mówi o commitach pustych OD POCZĄTKU. Drobne: zgubione „deviates
slightly", mylnie przetłumaczone „on top of an ancestor commit", sekcja
„Jak wybierać" przecząca własnej lekcji („liniowość z zachowanymi
commitami"), wniosek o podpisach i objaśnienie `--no-ff` udające treść
dokumentacji.

**4.4: pięć usterek istotnych.** W bloku cytatu stało **dopisane zdanie
diagnozy**, którego w źródle nie ma — formatowanie sugerowało, że
cytuje dokumentację. Dwie tezy o zachowaniu GitHuba bez pokrycia
(odwrócony base/compare, rzekomo proponowana nowa gałąź przy edycji
z **Files changed**). Wypadła druga ścieżka słowa kluczowego — **w treści
commita**, wraz z zastrzeżeniem, że taki pull request NIE zostanie
wypisany jako powiązany. Wiersz tabeli zgodności opisywał treść, której
w lekcji nie ma. Dopisane ze wskazanej sekcji: warianty zapisu
(`Closes: #10`, `CLOSES #10`) i reguła odpinania.

**Trzy rzeczy warte zapamiętania z tej bramki:**
1. **Wniosek autora podany jako teza dokumentacji to najgroźniejszy
   gatunek** — brzmi sensownie, więc przechodzi przez przelot spójności
   i rozmnaża się do podsumowań. Oba weryfikatory znalazły po jednym
   takim przypadku, w dwóch niezależnych lekcjach.
2. **Dopisane zdanie WEWNĄTRZ bloku cytatu** to nowa odmiana tej samej
   klasy — warto szukać jej osobno, bo formatowanie kłamie.
3. **Cytaty weryfikatora sprawdziłem sam w oryginale przed wpisaniem**
   (cztery zdania w źródle 4.4, `grep`). Zgadzały się co do słowa, ale
   pierwszy `grep` ich nie znalazł przez wielkość liter — brak trafienia
   nie dowodzi, że zdania nie ma.

**Objętość: naprawy potrafią wypchnąć lekcję ponad sufit.** 4.7 po
poprawkach wyszło na 12 275 znaków i wróciło pod 12 000 przez cięcie
prozy redakcyjnej (zdania powtarzającego punkt z „Gdy coś nie działa",
rozwlekłych przeformułowań) — **nie treści ze źródła**. Przy lekcjach
oddawanych blisko sufitu trzeba na to budżet.

#### Fala 1 modułu 5 — co poprawił agent główny

Obie lekcje bez usterek klasy „teza bez pokrycia". Trzy poprawki
granic i jedna redakcyjna:
- **5.1** miała zrzut poświęcony liście szablonów workflow — to
  wyłączność 5.2; zrzut usunięty (zostały 2, w widełkach 2–4).
- **5.1** obiecywała, że o wdrażaniu „będzie mowa w całym module" —
  a lekcja o wdrożeniach wypadła z programu. Przepisane na opis
  („ten moduł zajmuje się sprawdzaniem zmian; wdrażanie zostawiamy
  jako to, co tym samym mechanizmem robią inni").
- **5.1** wspominała runnery samodzielnie hostowane dwa razy, a brief
  dopuszcza jedno zdanie — pierwsza wzmianka skrócona.
- **5.2** wymieniała pięć kategorii szablonów, w tym **Pages** —
  a tabela odniesień zakazuje wymieniania Pages, Codespaces, CLI
  i Discussions choćby jednym słowem (moduł 7 wypadł w całości).
  Zdanie zastąpione odesłaniem do `actions/starter-workflows`;
  osierocony wiersz tabeli zgodności usunięty.
- **5.2** miała w jednym bloku cytatu trzy zdania z różnym
  cudzysłowieniem — wszystkie trzy są z tej samej ramki Note źródła,
  więc blok znormalizowany. To ta sama klasa co usterka 4.4, tyle że
  bez skutku merytorycznego.

#### Trzy ustalenia z poprzedniego przebiegu, które nadal obowiązują

1. **Numer prozy to pozycja w NOWYM programie, nie numer scenariusza.**
   `lib/proza-lekcji.ts` wylicza pozycję z numeru w nazwie pliku
   i dodatkowo porównuje tytuł. Przeliczenie jest w tabeli na początku
   każdego briefu. Skutek uboczny: `proza-3-…` w module 4 to scenariusz
   `lekcja-4-…` i tak już zostanie.
2. **`straznik-prozy` był na to ślepy** — wiązał prozę ze scenariuszem
   po numerze, więc po cięciu potwierdzał istnienie CUDZEJ lekcji.
   Naprawione (dopasowanie po TYTULE, test negatywny, nowa mutacja).
   **Czat A ma ten sam rozjazd w modułach 2 i 3** — po scaleniu gałęzi
   dostanie naprawę za darmo, ale do tego czasu jego strażnik kłamie.
3. **Lekcja 4.1 jest PODGLĄDOWA** (`preview = true`; w Kursie 2 są dwie
   takie: 1.1 i 4.1). Musi bronić się bez kontekstu przed kimś, kto
   jeszcze nie kupił, i jednocześnie podjąć most z modułu 3. Sposób
   pogodzenia tych dwóch rzeczy jest w briefie.

**Dziury po lekcjach wyciętych — kto je przejmuje**: pełne tabele
w briefach prozy modułów 4, 5 i 6. Rzecz, którą najłatwiej przeoczyć
w module 5: czytanie pliku workflow linia po linii przechodzi z wyciętej
„Anatomii" do lekcji o CI, składnię `${{ … }}` wprowadza CI przy
`matrix`, „środowisko" to jedno zdanie definicji w lekcji o sekretach,
a wdrożenie (CD) wypada z kursu bez śladu.

#### Gdzie wylądowały wnioski (żeby nie szukać)

**Pięć reguł produkcji** wyprowadzonych z modułu 4 stoi w briefach prozy
modułów **5 i 6**, w sekcji „Reguły produkcji dopisane po module 4" tuż
przed „Fale i kolejność": most podjęty a nie przepisany (z progiem
40 znaków i wymogiem, żeby ostrzeżenie było w prompcie KAŻDEGO autora),
konwencja cudzysłowu `„tekst"`, dwa gatunki usterek dla bramki, odsyłacz
„poprzednia lekcja" kontra nowa numeracja, zapas pod sufitem widełek.
Tabela „Znaleziska przebiegu" w briefie modułu 4 jest uzupełniona
o siedem wierszy z tego przebiegu.

**`POSTEP.md` świadomie NIE jest jeszcze ruszony.** Wpisy powstają tam
przy zamknięciu modułu, a moduł 4 nie jest zamknięty (brakuje 4.1)
i moduł 5 jest w połowie. Drugi powód: `POSTEP.md` to plik wspólny obu
czatów Kursu 2 i edytowanie go w połowie pracy zaprasza konflikt przy
scalaniu gałęzi. Do zrobienia razem z zamknięciem modułu — łącznie
z wierszem tabeli „Kurs 2 (7 modułów) | 50 | — | ⬜ przed startem",
który jest nieaktualny od cięcia programu.

**Następny krok po powrocie: fala 2 modułu 5 — lekcje 5.3 „Continuous
Integration" i 5.4 „Sekrety w workflow"** (dwóch autorów na Sonnecie
równolegle, jeden autor = jedna lekcja, komenda mierząca objętość
w prompcie KAŻDEGO autora, jawne ostrzeżenie o moście podjętym zamiast
przepisanego). Potem przelot spójności modułu 5 i **bramka cytatów
wyrywkowa na 5.4 i 5.3** (weryfikatory na Opusie) — 5.4 jest najgęstsza
w module (liczby, limity, precedencja, cztery zastrzeżenia), a 5.3
niesie definicje plus czytany plik. Uwaga budżetowa z briefu: **bloki
kodu liczą się do widełek**, a plik `use-secrets.md` ma 28,9 kB
i przepisany w całości rozsadzi lekcję. Dopiero po module 5 — moduł 6.
Lekcja 4.1 czeka na czat A niezależnie od tego wszystkiego.


#### Fala 2 modułu 5 (2026-08-22) — 5.3 i 5.4 napisane, przejrzane, bramka cytatów TYLKO na 5.4

Moduł 5 ma komplet czterech lekcji. Objętości kontraktem: 11 876 /
11 780 / 11 709 / 11 788. Mosty wszystkie podjęte (LCS z domknięciem
poprzedniej lekcji: 26 z modułu 4 → 5.1, potem 36, 27, 19 przy progu 40),
domknięcia zgodne z tabelą briefu co do znaku, zrzuty 2–4 na lekcję,
strażnicy 25/25.

**PRZERWANE ŚWIADOMIE (limit usage właściciela): bramka cytatów lekcji
5.3 NIE ZOSTAŁA WYKONANA.** Weryfikator na Opusie został zatrzymany
w trakcie; zdążył potwierdzić jedno: **oba bloki YAML w 5.3 są
bajt w bajt zgodne ze źródłem**. Reszta pięciu przebiegów (wniosek
autora jako teza dokumentacji, dopiski w blokach cytatu, rozszerzenia
zakresu, tabela zgodności) czeka. **To jest następny krok modułu 5.**

**Bramka cytatów 5.4 — zrobiona, 1 usterka istotna i 3 drobne, wszystkie
naprawione.** Warte zapamiętania:
1. **ISTOTNA, nowa odmiana gatunku (a): cytat urwany w pół warunku.**
   Lekcja przytaczała ze źródła zdanie „job nie uzyska dostępu do
   sekretów środowiska bez zgody zatwierdzających", gubiąc zdanie
   POPRZEDNIE — „you **can enable** required reviewers". Bramka
   zatwierdzania jest OPCJĄ do włączenia, a nie właściwością sekretów
   środowiska. Usterka zdążyła rozejść się do „Zapamiętaj" i do tabeli
   zgodności. **Klasa do sprawdzania osobno: cytat jest prawdziwy, ale
   zaczyna się o zdanie za późno.**
2. Teza „`::add-mask::` wrzuca wartość do logu jako **gwiazdki**" —
   żadne z trzech źródeł nie mówi o gwiazdkach, tylko o „redacted".
   Gwiazdki to obserwacja z ekranu, nie teza dokumentacji.
3. Diagnozy w „Gdy coś nie działa" opisywały **widoczność elementów
   interfejsu** („nie widzisz przycisku"), a źródło mówi wyłącznie
   o uprawnieniu do ZAŁOŻENIA sekretu. Przepisane na „nie możesz założyć".
4. Poradnik mówił, że nazwa sekretu musi zgadzać się „co do liter",
   podczas gdy sekcja 3 tej samej lekcji poprawnie podaje, że nazwy są
   nieczułe na wielkość liter. **Sprzeczność wewnątrz jednej lekcji —
   warto o nią pytać wprost.**

**Przelot spójności modułu 5 — dwa znaleziska poza bramką:**
- **Powtórzenie 5.2 ↔ 5.3**: obie lekcje wykładały, że GitHub analizuje
  repozytorium i podsuwa szablony workflow. Szablony są na wyłączność
  5.2, więc 5.3 dostała powołanie zamiast drugiego wykładu. Tabela
  kolizji w briefie tego ryzyka nie wymieniała — wymieniała plik
  workflow i sześć pojęć.
- **Poprawki wypchnęły 5.4 ponad sufit** (12 016), wróciła cięciem prozy
  redakcyjnej do 11 844, a po bramce cytatów stoi na 11 788. Reguła 5
  briefu sprawdziła się co do joty.

**Sprawdzanie mostów jest już maszynowe.** Skrypt liczy najdłuższy
wspólny ciąg ciągły między sekcją `## Co dalej` poprzedniej lekcji
a pierwszym akapitem następnej (po normalizacji białych znaków), próg
40 znaków, sprawdzony testem negatywnym (sztuczna lekcja przepisująca
domknięcie: 284 znaki, kod wyjścia 1). **Leży w scratchpadzie sesji,
NIE w repo** — do `tools/` warto go przenieść przy domykaniu modułu,
bo `tools/` jest wspólne z czatem A. Przy przenoszeniu: ostatnią lekcję
poprzedniego modułu ma brać z odczytu katalogu, nie z ręcznie podanej
ścieżki — przy pierwszym pomiarze porównałem 5.1 z `proza-6` modułu 4,
a ostatnia lekcja tego modułu to `proza-7` (wynik i tak wyszedł
zielony, więc pomyłka była niewidoczna).

**Autorzy sprawdzają mosty sami i trafnie** — obaj podali LCS (27 i 19),
obie liczby potwierdzone moim skryptem. Ostrzeżenie w prompcie działa
drugą falę z rzędu: usterka „most przepisany" nie wystąpiła ani razu
od chwili jego dopisania.

**Blokady bez zmian:** lekcja 4.1 czeka na zdanie zamykające moduł 3 od
czatu A; wgrywanie treści do bazy czeka na cięty program od czatu A
(`npm run db1:tresc -- --kurs jak-uzywac-githuba --modul N --sprawdz`,
potem bez `--sprawdz`, zawsze z `--adres http://localhost:3013`).

**NASTĘPNY KROK po powrocie: bramka cytatów 5.3** (weryfikator na
Opusie, pięć osobnych przebiegów, do tego pytanie o cytat urwany w pół
warunku — punkt 1 wyżej), potem plik cytatów modułu 5
(`docs/dokumentacja-techniczna/d7/cytowane/github--modul-5.md` istnieje
od czasów scenariuszy D7 i wymaga przejrzenia pod prozę), potem moduł 6.

#### ⚠️ PUNKTY KONTROLI — OTWARTE (założone 2026-08-22, czat B)

Cztery usterki znalezione bramką cytatów w lekcji 5.4 są **naprawione
w pliku**, ale **klasa każdej z nich zostaje otwarta jako punkt
kontroli** — decyzja właściciela z 2026-08-22: nie wolno ich zgubić
przy `/clear` ani przy kolejnym sweepie. Naprawa jednej lekcji nie
zamyka klasy, bo bramki cytatów są WYRYWKOWE: w module 4 objęły 2 lekcje
z 6, w module 5 — 1 z 4 (5.3 przerwana na limicie usage).

| # | Usterka | Waga | Stan naprawy | **Co pozostaje do sprawdzenia** |
|---|---|---|---|---|
| U1 | **Cytat urwany w pół warunku** — przytoczone „job nie uzyska dostępu do sekretów środowiska bez zgody zatwierdzających" gubiło poprzedzające `you can enable required reviewers`; opcja wyglądała na właściwość mechanizmu | **ISTOTNA** | ✅ naprawione w **3 miejscach** (proza, „Zapamiętaj", tabela zgodności); brak nawrotu potwierdzony grepem | czy ta sama klasa nie siedzi w **5.1–5.3** (8 bloków cytatu razem) i w **czterech lekcjach modułu 4, których bramka nie objęła** (4.2, 4.3, 4.5, 4.6) |
| U2 | **Obserwacja z ekranu jako teza dokumentacji** — „`::add-mask::` wrzuca wartość do logu jako gwiazdki"; źródła mówią wyłącznie o zamazywaniu | drobna | ✅ naprawione w prozie i w opisie zrzutu | czy inne lekcje nie przypisują dokumentacji tego, co autor tylko zakłada, że zobaczy na ekranie |
| U3 | **Diagnoza opisuje widoczność interfejsu zamiast uprawnienia** — „Nie widzisz przycisku New repository secret", gdy źródło mówi o prawie do ZAŁOŻENIA sekretu | drobna | ✅ naprawione (2 pozycje w `## Gdy coś nie działa`) | sekcje `## Gdy coś nie działa` w pozostałych lekcjach modułów 4 i 5 — to typowe miejsce osiadania takich tez |
| U4 | **Sprzeczność wewnątrz jednej lekcji** — poradnik żądał nazwy zgodnej „co do liter", a sekcja merytoryczna tej samej lekcji podawała, że nazwy są nieczułe na wielkość liter | drobna | ✅ naprawione | czy poradnik i „Zapamiętaj" nie przeczą sekcjom merytorycznym w innych lekcjach |

**Jak te punkty zamknąć** (nie robić tego przed dokończeniem modułu 6 —
kolejność prac zostaje): przy bramce cytatów każdej kolejnej lekcji
weryfikator dostaje U1–U4 jako **osobne pytania** (są już wpisane do
briefu modułu 6 jako reguły produkcji 6 i 7 plus pytanie kontrolne
o sprzeczność wewnętrzną). Punkt zamyka się dopiero wtedy, gdy przejdzie
przez lekcje, których dotąd nikt nie sprawdzał — a nie wtedy, gdy
naprawiono lekcję, w której go znaleziono.

**Czego świadomie NIE obejmują**: 17 lekcji Kursu 1 bez bramki cytatów
(3.1–3.6, 5.1–5.3, 5.5–5.7, 6.1–6.5) — właściciel zdecydował 2026-08-22,
że zostają bez sprawdzenia. Ten zapis tamtej decyzji nie zmienia.

#### Narzędzie: `tools/most-lekcji.mjs` (w repo od 2026-08-22)

Skrypt liczy najdłuższy wspólny ciąg ciągły między sekcją `## Co dalej`
poprzedniej lekcji a pierwszym akapitem następnej (po normalizacji
białych znaków); próg 40 znaków, kod wyjścia 1 przy przekroczeniu.
Sprawdzony testem negatywnym (sztuczna lekcja przepisująca domknięcie:
284 znaki, wyjście 1) i pozytywnym na parach modułu 5. Był wcześniej
w scratchpadzie sesji — utrwalony, bo po `/clear` przepadał.
W nagłówku pliku stoi ostrzeżenie o pułapce, która raz już dała
fałszywie zielony pomiar (ręcznie podana ścieżka `proza-6` zamiast
ostatniej lekcji modułu, którą jest `proza-7`).

#### Modele w tej fali — dowód, nie domysł

Autorzy na **Sonnecie 5** (~155 i ~198 tys. tokenów na lekcję): mechanika
czysta od pierwszego strzału u obu — objętość w widełkach, most podjęty
i policzony przez autora, domknięcie co do znaku, konwencja cudzysłowu.
Usterki, które zostały, były **merytoryczne i wychodziły dopiero przy
czytaniu źródła** — czyli tam, gdzie pracuje weryfikator na **Opusie**
(~98 tys. tokenów na lekcję). To potwierdza podział z kalibracji
modułu 1 K2: autorzy Sonnet, bramka Opus. Nie schodzić z autorami
niżej i nie podnosić ich do Opusa bez nowej decyzji właściciela.

#### Co poprawił PRZELOT (przed bramką cytatów) — żeby weryfikator 5.3 nie liczył tego jako nowe

Agent główny czytał obie lekcje fali 2 przeciw źródłom w oryginale
i znalazł osiem rozjazdów, których żaden autor nie zgłosił. **Bramka
cytatów 5.3 jeszcze się nie odbyła — to jest lista rzeczy już
naprawionych w tej lekcji**, więc nie należy ich odkrywać po raz drugi
ani cofać.

**5.3 „Continuous Integration" — 4 poprawki (+ zdjęte powtórzenie o szablonach):**
- „`npm ci` **wymaga** pliku `package-lock.json`; bez niego zadziała
  `npm install`" — źródło mówi wyłącznie, CO która komenda instaluje.
  To był wniosek autora podany jak teza dokumentacji (gatunek (a)),
  prawdziwy w rzeczywistości, ale bez pokrycia w źródle;
- „instaluje wersje i **nie pozwala ich zmienić**" → źródło:
  `prevents updates to the **lock file**` (chroniony jest plik
  blokujący, nie wersje);
- „x… dopasowuje najnowsze wydanie **danej gałęzi wersji**" → źródło:
  `latest **minor and patch** release`;
- „runnery mają zainstalowane **menedżery npm**" → źródło: `npm **and
  Yarn** dependency managers`; zawężenie do npm jest zgodne z briefem,
  ale zdanie wyszło niegramatyczne i mówiło co innego.
Dwa wiersze tabeli zgodności opisywały starą treść — poprawione razem
z prozą.

**5.4 „Sekrety w workflow" — 4 poprawki przelotem (przed czterema z bramki):**
- limit sekretów organizacji podany jako reguła bezwzględna, gdy źródło
  warunkuje go progiem: `If the repository is assigned access to **more
  than 100** organization secrets`;
- „gdy workflow wyzwala **pull request** z forka" → źródło:
  `when a workflow is triggered from a forked repository`;
- „proces widoczny poleceniem `ps` **ujawnia parametry wywołania**" →
  źródło: `may be visible to other users (using the ps command)`, plus
  zgubiona lista alternatyw (`STDIN`, inne mechanizmy);
- krok YAML w „Prompty z tej lekcji" nie był oznaczony jako
  **Propozycja kursu** — w pozostałych lekcjach modułu taka etykieta
  stoi przy każdej treści spoza dokumentacji.

**Wniosek na przyszłe fale:** autorzy na Sonnecie oddają czystą
mechanikę, ale **rozszerzają tezy źródła w miejscach, które brzmią
oczywiście** („wymaga", „zawsze", dopowiedziany skutek). Przelot
spójności czytany przeciw ORYGINAŁOWI — nie przeciw tabeli zgodności
autora — łapie to przed bramką i taniej niż Opus.

**`POSTEP.md` nadal świadomie nietknięty**: wpis powstaje przy ZAMKNIĘCIU
modułu, a moduł 5 nie jest zamknięty (bramka 5.3 przerwana), tak samo
moduł 4 (brak lekcji 4.1 zablokowanej na czacie A).
