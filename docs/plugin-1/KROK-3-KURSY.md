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
