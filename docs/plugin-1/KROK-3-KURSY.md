# Krok 3 planu domknięcia — kursy zrobione do końca, w narzędziu

Dokument roboczy kroku (wzorem [KROK-2-ZABEZPIECZENIA.md](KROK-2-ZABEZPIECZENIA.md)).
Podstawa: [PLAN-FINAL-PLUGINU-1.md](PLAN-FINAL-PLUGINU-1.md) („Krok 3") oraz
decyzje właściciela w [PRODUKCJA-MATERIALU-KROK-3.md](PRODUKCJA-MATERIALU-KROK-3.md).
Bramka: **B7 — właściciel ocenia GOTOWE kursy.**

> [!NOTE]
> **KROK ZAMKNIĘTY, B7 ZALICZONA** (właściciel, 2026-08-25). Ten dokument
> jest DZIENNIKIEM zamkniętej pracy: nagłówki w rodzaju „NASTĘPNY KROK”
> i „W TOKU” w jego środku to zapisy chronologiczne z chwili pisania,
> nie polecenia na dziś. Stanu bieżącego szukaj w [CLAUDE.md](../../CLAUDE.md).

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
| 3 | Proza lekcji, treść wchodzi skryptem przez AJAX kreatora (dogęszczenie K1 odwołane 2026-08-20) | ✅ zrobione (v0.32.0) — **73 z 73 lekcji**: Kurs 1 41/41, Kurs 2 32/32; pliki zgodne z bazą co do znaku |
| 4 | Finalna treść stron sprzedażowych kreatorem → B7 | ✅ zrobione — strony przepisane na stan faktyczny w audycie (v0.33.0), **B7 zaliczona przez właściciela 2026-08-25** |

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

**DECYZJA WŁAŚCICIELA 2026-08-23 — AUDYT KOŃCOWY OBU KURSÓW.** Po dopisaniu
ostatniej lekcji Kursu 2 robimy **audyt spójności całości**: osobny przebieg
na Kursie 2 (32 lekcje) i osobny na Kursie 1 (41). Szuka wyłącznie tego, czego
przegląd modułowy zobaczyć nie mógł — dryfu terminologii między modułami
pisanymi przez różne czaty, obietnic składanych w jednym module a spełnianych
w innym, powtórzeń, ciągłości stanu repozytorium czytelnika i mostów
międzymodułowych. **Nie powtarza bramki cytatów i nie cofa długu 17 lekcji
Kursu 1.** Druga część decyzji: **tropy zbieramy OD ZARAZ**, przy domykaniu
każdego modułu, do
[`tresc-kursow/AUDYT-KONCOWY.md`](../../tresc-kursow/AUDYT-KONCOWY.md) —
jeden wiersz = jedno podejrzenie z adresem, gdzie je sprawdzić. Dotyczy obu
czatów; plik założył czat A na gałęzi `feat/tresc-k2-modul-2-3`.

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


### CIĘTY PROGRAM W BAZIE — ZROBIONE (2026-08-22, czat A)

Pierwsze zadanie czatu A wykonane wg procedury wyżej. **Proza modułu 1
przeżyła w komplecie.**

| Dowód | Wynik |
|---|---|
| droga zapisu | jedyny AJAX `POST /api/szkolenia`, akcja `zapisz`, HTTP 200 — nie seed, nie SQL |
| id w wejściu | wszystkie 32 lekcje i 6 modułów z zachowanym `id` (skrypt odmawiał wysyłki przy pierwszym braku) |
| bezpiecznik | skrypt przerywał, gdyby z programu wypadła lekcja z `ma_tresc` — sprawdzane przed wysłaniem, nie po |
| kopia zapasowa | `pg_dump` czterech tabel przed operacją (700 kB, w scratchpadzie sesji) |
| SQL po operacji | 6 lekcji modułu 1 z treścią: 11 816 + 10 430 + 11 956 + 9 559 + 8 758 + 11 899 = **64 418 znaków** — co do znaku tyle, ile przed cięciem |
| SQL po operacji | **6 modułów, 32 lekcje, 495 min**; sekcji sprzedażowych nadal **12**; Kurs 1 nadal **41 lekcji z treścią** |
| katalog `/szkolenia` | „6 modułów · 32 lekcje · 8 h 15 min materiału" |
| strażnicy | 25/25 zielonych po zmianach w dokumencie programu i w seedzie |

**DECYZJA TECHNICZNA, KTÓRA WIĄŻE TAKŻE CZAT B: numeracja lekcji zostaje
ORYGINALNA, a `position` ma dziury.** Moduł 2 to lekcje 1,2,3,4,5,**7**;
moduł 3 — 1,2,3,**5,6**; moduł 4 — 1,2,**4,5,6**,**8,9**; moduł 5 —
1,2,3,**6**; moduł 6 — 1,2,**4**,**6**. Powód nie jest kosmetyczny:
`lib/proza-lekcji.ts` wiąże numer pliku prozy z `position + 1`, a
`straznik-prozy` szuka scenariusza wzorcem `lekcja-<numer>-*.md` — po
przenumerowaniu `proza-6-*` w module 2 dopasowałaby się do scenariusza
*Rebase bez strachu* i przeszłaby przez strażnika bez słowa. Klient
numerów nie widzi (`SekcjaProgram` renderuje same tytuły, a proza modułu 1
odsyła słowami: „w poprzedniej lekcji", „w lekcji o konfiguracji Gita" —
nigdy „w lekcji 2.5"). Skutek dla obu czatów: **plik prozy nosi numer
z PROGRAM-KURSOW-D7.md**, czyli ściąga modułu 2 to `proza-7-sciaga-komend.md`,
a gałęzie chronione to `proza-5-galezie-chronione.md`.

**Czego cięcie NIE zmieniło** (sprawdzone, nie założone): sekcje
sprzedażowe (12, nietknięte — `zapisz` bez pola `sections` ich nie rusza),
treść lekcji Kursu 1, scenariusze D7 (91, golden i `straznik-scenariuszy`
bez zmian), cena.

**Dwie rzeczy zostają otwarte i NIE są robotą czatów treści:**

1. **Cena w bazie to nadal 39 900 gr**, a decyzja z 2026-08-20 mówi
   299/349 zł (29 900 / 34 900). Zmiana idzie kreatorem, przy sekcjach
   sprzedażowych — nie przy programie.
2. **Sekcje sprzedażowe Kursu 2 są rozjechane z programem** (roboczy
   `package` obiecuje „6 modułów wideo (26 lekcji)" i moduł ratunkowy
   restore/revert/reset, którego nie niesie żaden tytuł). Pisane od nowa
   w etapie 4, pod program 32-lekcyjny. `tools/seed/seed-przyklady.ts`
   dostał już nowy program (lustro bazy, z dziurami w pozycjach), ale
   jego sekcje zostają robocze — komentarz w pliku mówi to wprost.

**Uwaga o `straznik-odsylaczy-kursu`:** kontrola A sprawdza, czy odsyłacz
„lekcja N.M" wskazuje lekcję istniejącą **w scenariuszach**, a te zostają
w repo w komplecie 50 lekcji. Odsyłacz do lekcji **wyciętej** przejdzie
więc przez strażnika. Nie ma tu dla nas siatki — pilnuje tego tabela
granic w briefie modułu.

#### ⚠️ CZATY ROZJECHAŁY SIĘ NA TEJ DECYZJI — do rozstrzygnięcia przed scaleniem gałęzi (znalezisko czatu A, 2026-08-22)

Decyzja wyżej („numeracja ORYGINALNA, `position` ma dziury") wiąże oba
czaty, ale **czat B ponumerował prozę modułu 4 CIĄGLE** — sprawdzone
w `../Pod-strona-Szkolenia-k2-B` 2026-08-22.

| | czat A (moduły 2, 3) | czat B (moduł 4) |
|---|---|---|
| konwencja | numer z PROGRAM-KURSOW-D7.md, dziury zachowane | numer = pozycja w ciętym programie, bez dziur |
| pliki | `proza-1…5`, `proza-7` (moduł 2) | `proza-2…7` (moduł 4) |
| `straznik-prozy`, kontrola 2 | dopasowanie prozy do scenariusza **po numerze** | **przepisana na dopasowanie po TYTULE** |

**Co z tego wynika twardo** (nie hipoteza — `dopasujDoProgramu`
w `lib/proza-lekcji.ts` szuka lekcji po `position + 1`, a potem żąda
zgodności tytułu co do znaku):

- baza ma dziś w module 4 pozycje **0,1,3,4,5,7,8** (sprawdzone SQL-em
  2026-08-22), czyli numery plików **2,4,5,6,8,9**;
- z sześciu plików prozy czatu B **wgra się jeden** (`proza-2`, bo
  „Issues: planowanie pracy" stoi na pozycji 1 i tam dziury jeszcze nie
  ma). Pozostałe pięć **odbije się z błędem** „moduł 4 nie ma lekcji N";
- **nic się nie zepsuje po cichu** — tytuły są rozłączne, więc nie da się
  wgrać treści pod niewłaściwą lekcję. Awaria jest głośna i pusta
  (`Nie wysłałem NICZEGO`).

**Rekomendacja czatu A — synteza, nie wybór jednej strony:**

1. **Numeracja: zostaje wersja z dziurami.** Nie z pierwszeństwa, tylko
   dlatego, że tak stoi baza i tak stoi już wgrana proza modułów 1 i 2
   Kursu 2 — odwrócenie znaczy przenumerowanie bazy pod treścią, która
   w niej leży. Koszt drugiej drogi: czat B zmienia **6 nazw plików
   i 6 linii frontmatteru**, mechanicznie.
2. **Poprawka strażnika czatu B ZOSTAJE.** Dopasowanie po tytule jest
   lepsze od dopasowania po numerze i domyka dziurę, którą czat A opisał
   w briefie modułu 3: plik `proza-4-licencja.md` przechodzi dziś przez
   `straznik-prozy` bez słowa, bo scenariusz wyciętej lekcji leży
   w katalogu. Po scaleniu gałęzi **wersja czatu B wygrywa w tym pliku**.
3. Do sprawdzenia przy scaleniu: `tools/straznicy/straznik-prozy.mjs`
   rozjechał się między gałęziami i **będzie konfliktem** — to jedyny
   znany wspólny plik obu czatów poza dokumentacją.

**Decyzja należy do właściciela albo do czatu, który scala gałęzie** —
żaden czat treści nie zmienia numeracji w cudzym module.

#### Most z modułu 3 do modułu 4 — DOSŁOWNIE (dla czatu B)

Czat A ustalił zdanie zamykające moduł 3. **Lekcja 4.1 otwiera się jego
podjęciem**, tak jak 2.1 otwiera się zdaniem z 1.6:

> „Twoje repozytorium wygląda jak repozytorium profesjonalisty: ma
> czytelne README, opis złożony w Markdownie, chronioną gałąź główną
> i wydania z numerem wersji. W module czwartym otwierasz je na innych
> ludzi: poznajesz GitHub flow od strony zespołu, planujesz pracę
> w zgłoszeniach (ang. *issues*) i uczysz się proponować zmiany pull
> requestem."

Zdanie wymienia dokładnie to, co niosą pierwsze trzy lekcje modułu 4 po
cięciu (4.1 GitHub Flow, 4.2 Issues, 4.4 Czym jest pull request).

**Stan czytelnika wchodzącego do modułu 4** (do briefu czatu B):

- projekt przewodni `stargazers-log`, gałąź `add-starred-list` założona
  w lekcji 2.1 i wypchnięta na GitHuba;
- ma za sobą pełny rytm pracy własnej z terminala: gałąź → zmiana →
  `git add` → `git commit` → `git push`, a także `fetch`/`merge`/`pull`;
- zna `.gitignore` (trzy poziomy) i komendy `git remote …`;
- ma ściągę komend z lekcji 2.7 i wie, że po szczegóły wraca do lekcji;
- **NIE zna rebase** (2.6 wycięta) i nie zna forków (4.10 wycięta) —
  w module 4 nie wolno się na nie powoływać jako na rzecz „znaną";
- **strona ZESPOŁOWA GitHub flow jest nietknięta i czeka na 4.1**:
  lekcja 2.1 wzięła z `github-flow.md` wyłącznie sekcje „Introduction",
  „Prerequisites", „Create a branch" i „Make changes". Sekcje „Create
  a pull request", „Address review comments", „Merge your pull request"
  i „Delete your branch" **należą do 4.1** i nie zostały zużyte.

### MODUŁ 2 KURSU 2 — stan w połowie modułu (zapis historyczny; moduł ZAMKNIĘTY, patrz sekcja na końcu dokumentu)

**Fala 1 ZROBIONA I ZREDAGOWANA: lekcje 2.1, 2.2, 2.3.** Trzej autorzy na
Sonnecie 5, jeden autor = jedna lekcja, każdy z komendą mierzącą
kontraktem w prompcie.

| Lekcja | Znaków | Wierszy zgodności | Zrzutów | Koszt autora |
|---|---|---|---|---|
| 2.1 Przepływy pracy Git | 11 757 | 25 | 3 | 245 tys. |
| 2.2 Wypychanie commitów | 10 166 | 24 | 3 | 190 tys. |
| 2.3 Pobieranie zmian | 10 093 | 22 | 3 | 195 tys. |

**Komenda mierząca DZIAŁA** — to pierwszy przebieg, w którym żadna lekcja
nie wypadła z widełek 8 000–12 000 przy pierwszym oddaniu (w kalibracji
Sonnet raz zszedł do 7 760 i autor tego nie zauważył). Każdy z trzech
autorów sam zgłosił, ile razy przycinał.

**Autorzy odmówili tez bez pokrycia — trzy razy, wszystkie słusznie:**
cały wątek forków ze scenariusza 2.2 (`git remote add upstream`), „99%
przypadków" przy wyborze drogi odblokowania pusha (źródło nie stopniuje),
oraz draft-PR ze scenariusza 2.1 (teza prawdziwa, ale należy do lekcji
4.1). Autor 2.1 znalazł przy tym **sprzeczność w samym scenariuszu D7**:
zapowiada zatrzymanie przed pull requestami i zdanie dalej i tak zdradza
draft-PR.

**Poprawki agenta głównego (chirurgiczne, bez budzenia autorów):**

| Co | Gdzie | Dlaczego |
|---|---|---|
| most w `## Co dalej` wyjęty z cudzysłowu | 2.2 | moduł 1 podaje go prozą — cudzysłów wyglądał jak cytat z kogoś |
| „pokażę" → „pokazuje następna lekcja" | 2.2 | w całym module 1 nie ma 1. osoby liczby pojedynczej poza „cytuję" |
| „o której pisałem" → „o której była mowa" | 2.3 | jw. |
| „wymeldowywana jest gałąź" → „gałąź zostaje wybrana do pracy (ang. *checked out*)" | 2.3 | moduł 1 oddaje `checkout` jako przełączenie/wybór, nie „wymeldowanie" |
| **dopisany krok `git checkout main` w ćwiczeniu** | 2.3 | **usterka ciągłości**: po ćwiczeniu 2.2 czytelnik stoi na `add-starred-list`, a proza mówiła „scalasz ze swoim lokalnym `main`". Instrukcja była niewykonalna zgodnie z opisem |
| dopisana droga terminalowa dla systemów bez GitHub Desktop | 2.1 | ćwiczenie było wyłącznie w Desktopie, a dokumentacja podaje go tylko dla Windowsa i macOS (zawężenie znane z lekcji 1.5). Doszły dwa źródła i dwa wiersze zgodności |
| „Kroki 3 i 4 … nieodwracalnie" → „Krok 4 i krok 8 … da się usunąć" | 2.1 | zdanie było nieprawdziwe w obie strony: krok 8 też zmienia GitHuba, a gałąź zdalną kasuje się jedną komendą (uczy tego 2.2) |

**ZNALEZISKO DLA WŁAŚCICIELA — dotyczy CAŁEGO kursu, nie tego modułu.**
Nagłówek `## Zrób to teraz (N minut)` bywa dłuższy niż czas całej lekcji
z programu: 2.3 to lekcja 10-minutowa z ćwiczeniem na 15 minut, a
w module 1 lekcja 1.5 (15 min) ma ćwiczenie na 20 minut. Odkąd
`duration_min` znaczy „czas przerobienia lekcji" (decyzja 2026-08-19),
to sprzeczność, którą klient widzi na stronie sprzedażowej.
**Nie poprawiałem punktowo** — 41 lekcji Kursu 1 i moduł 1 Kursu 2 mają
ten sam wzorzec i są już zaakceptowane; poprawka ma sens tylko jako
jeden przelot po całości albo jako świadome „zostaje".

#### NASTĘPNY KROK (dokładnie od tego zacząć)

1. **Fala 2: lekcje 2.4 i 2.5** — dwaj autorzy na Sonnecie 5, po jednej
   lekcji, prompty budowane tak jak przy fali 1 (rozpiska źródeł i mosty
   są w briefie modułu, sekcje „2.4" i „2.5" oraz tabela mostów).
2. **Fala 3: lekcja 2.7** dopiero po 2.4 i 2.5 — ściąga zbiera komendy
   z GOTOWEJ prozy lekcji 1.1–2.5 i niczego nie uczy od nowa.
3. Przelot spójności całego modułu, potem **bramka cytatów na 2.2 i 2.5**
   (weryfikatory na Opusie, plik
   `docs/dokumentacja-techniczna/d7/cytowane/github--modul-2.md`).
4. `npm run db1:tresc -- --kurs jak-uzywac-githuba --modul 2 --adres http://localhost:3012 --sprawdz`,
   potem bez `--sprawdz`.
5. Wpis do `tresc-kursow/POSTEP.md` i jeden commit domykający moduł.
6. Dopiero potem brief modułu 3 (uwaga: źródło Markdownu ma 30 kB,
   a gałęzie chronione 21 kB — tam problemem jest NADMIAR źródła, więc
   rozpiska „co pomijasz" waży więcej niż w module 2).

**Czym pracować:** serwer deweloperski tego czatu stawiasz komendą
`cd /home/krzysiek/Pod-strona-Szkolenia-k2-A && npx next dev -p 3012`
(port 3012 należy do czatu A; przed startem `fuser -k 3012/tcp`).
Przelot mechaniczny (objętość kontraktem, mosty co do znaku, słowa
zakazane, druga osoba małą literą, domknięte znaczniki zrzutów,
odsyłacze numerem lekcji) był skryptem w scratchpadzie sesji —
odtworzenie zajmuje chwilę, bo wszystkie wzorce stoją w briefie modułu.

### CZTERY DECYZJE WŁAŚCICIELA (2026-08-22, przed przerwą czatu A)

1. **CENY ZMIENIONE W BAZIE — ZROBIONE.** Kurs 1 **49 900 → 29 900 gr**,
   Kurs 2 **39 900 → 34 900 gr**, zgodnie z decyzją z 2026-08-20.
   Polecenie właściciela brzmiało „zmień teraz, ale sprawdź szczegółowo,
   czy to z niczym nie koliduje" — więc co zostało sprawdzone:

| Sprawdzone | Wynik |
|---|---|
| gdzie żyje cena na stronie | **wyłącznie `price_grosze`** — żadna z 24 sekcji sprzedażowych obu kursów nie ma ceny wpisanej w treść, więc nie było czego poprawiać ręcznie |
| co poszło do dyspozytora | akcja `zapisz` **bez pola `sections` i bez `modules`** — program, sekcje i treść lekcji nietykane z definicji, nie z ostrożności |
| golden `d3-odczyt.json` (ma 49900) | to golden kursu **testowego** `ai-w-praktyce` w bazie testowej — nie dotyczy |
| testy i smoke'i z cenami | własne kursy fixture (`smoke-d5`, `smoke-podglad`, testy dyspozytora) — nie czytają kursów produkcyjnych |
| `tools/seed/seed-przyklady.ts` | **już miał nowe ceny** (29900 / 34900) — po zmianie seed i baza wreszcie się zgadzają |
| katalog `/szkolenia` | **nie pokazuje ceny w ogóle** → zrzut `docs/zrzuty/podglad-szkolenia.png` w README NIE zdezaktualizował się |
| strony kursów i dane strukturalne | `"price":"299.00"` i `"price":"349.00"` w JSON-LD; miniatury OG liczą cenę z bazy, więc odświeżą się przy najbliższym buildzie |
| `Offer.availability` | bez zmian — nadal `PreOrder`, bo zakup to placeholder |
| stan po operacji (SQL) | K1: 6 modułów, 41 lekcji, 41 z treścią, 562 960 znaków, 12 sekcji; K2: 6 modułów, 32 lekcje, 6 z treścią, 64 418 znaków, 12 sekcji |
| strażnicy | 25/25 |

   Kopia `courses` sprzed operacji leży w scratchpadzie sesji.
   **Jedyna przyszła konsekwencja: publiczny podgląd statyczny nadal
   serwuje stare ceny, dopóki ktoś nie uruchomi `npm run deploy:podglad`.**

2. **Sekcje sprzedażowe pisze etap 4, po obu czatach treści** — pod
   program, którego brzmienie będzie już znane w całości.
3. **Obietnica „moduł ratunkowy: restore/revert/reset" zostaje
   SKREŚLONA ze strony**, nie dopisujemy lekcji. Program zostaje na
   32 lekcjach i nie wymaga ponownej akceptacji.
4. **Sprzeczność „Zrób to teraz (N minut)" kontra czas lekcji z programu
   naprawia JEDEN PRZELOT po całości na końcu produkcji** — razem
   z przelotem zrzutów ekranu, po 91 lekcjach naraz. Nie poprawiamy
   punktowo w trakcie pisania.

#### Dwa znaleziska z tej weryfikacji (do etapu 4)

- **Sekcje sprzedażowe KURSU 1 kłamią tak samo jak Kursu 2**, a dotąd
  wiedzieliśmy tylko o Kursie 2. `package` obiecuje „7 modułów wideo
  (31 lekcji)" i „Wszystkie 31 lekcji", a kurs ma **6 modułów i 41 lekcji
  tekstu**; `faq` obu kursów mówi o „kilku godzinach wideo", choć wideo
  nie będzie (decyzja 2026-08-19). **Etap 4 obejmuje więc OBA kursy**,
  nie tylko Kurs 2.
- **Liczba 565 394 znaków Kursu 1 z CLAUDE.md nie jest pomiarem
  kontraktowym.** Pomiar przez `czytajProze` daje **562 960 znaków
  w 41 plikach — co do znaku tyle samo, ile stoi w bazie**. Nic nie
  zginęło; różnica bierze się z innej metody liczenia (całe pliki wobec
  samej treści dla klienta). Przy następnym porównaniu plik–baza używać
  pomiaru kontraktowego, inaczej wychodzi fałszywy alarm.

### MODUŁ 2 KURSU 2 — ZAMKNIĘTY I WGRANY (2026-08-22, czat A)

Sześć lekcji (2.1–2.5 + 2.7), **63 137 znaków** pomiaru kontraktowego,
w bazie i w repo. Pełne liczby, cztery sygnały jakości, koszty na lekcję
i wnioski z bramki: **[tresc-kursow/POSTEP.md](../../tresc-kursow/POSTEP.md)**,
sekcja „Moduł 2 Kursu 2".

**Weryfikacja dwustronna po wgraniu** (`db1:tresc` bez potoku, kod wyjścia 0):
Kurs 2 ma w bazie 6 modułów, 32 lekcje, 12 z treścią, 127 555 znaków.
**Proza modułu 1 nietknięta — 64 418 znaków co do znaku, tyle samo co przed
operacją.** Numeracja modułu 2 ma celową dziurę na pozycji 6 (wycięta lekcja
o rebase); plik ściągi nazywa się `proza-7-`, bo kontrakt wiąże numer pliku
z `position + 1`.

Trzy decyzje z kalibracji zdały pierwszy sprawdzian na pełnym module:
**żadna z sześciu lekcji nie wypadła z widełek przy pierwszym oddaniu** —
komenda mierząca w prompcie każdego autora działa. Autor 2.5 sam przyciął
szkic z 14 929 do 11 467 znaków w trzynastu mierzonych przebiegach.

#### DECYZJA WŁAŚCICIELA (2026-08-22) — REGUŁA NA CAŁY KURS

**Gdy dokumentacja GitHuba rozjedzie się z podręcznikiem samego narzędzia,
dokładamy podręcznik jako drugie źródło i odnotowujemy to w tabeli
zgodności.** Kurs nie powtarza nieprawdy tylko dlatego, że stoi w migawce
dokumentacji — ale też niczego nie zmyśla: korekta musi mieć własne,
wskazane źródło.

Powód: dokumentacja GitHuba twierdzi, że `git push` bez argumentów wysyła
wszystkie pasujące gałęzie. Podręcznik Gita mówi, że tryb działający w ten
sposób (`matching`) „przestał być domyślny w Gicie 2.0", a domyślny jest
`simple` — wypycha samą bieżącą gałąź (sprawdzone na Gicie 2.55.0,
`git help config`, hasło `push.default`). Lekcja 2.2 budowała na tym
kontrast, którego czytelnik u siebie nie zobaczy.

Zastosowane w sześciu miejscach (trzy w 2.2, trzy w ściądze 2.7), z podręcznikiem
Gita zadeklarowanym w `zrodla:` lekcji 2.2. **Wpisać do briefu każdego
kolejnego modułu**, sekcja „Reguły wspólne" — jest już w briefie modułu 2.

#### Trzy klasy usterek, których nie łapie żaden strażnik

Warte przeniesienia do briefu modułu 3 i do promptów weryfikatorów:

1. **Fałszywa pamięć kursu.** Lekcja powołuje się na ćwiczenie z wcześniejszej
   lekcji i myli się co do tego, co czytelnik tam zrobił (2.2 twierdziła, że
   w ćwiczeniu 1.6 padło `git push origin main`; padło gołe `git push` —
   a rozróżnienie tych form jest sercem lekcji 2.2). Weryfikować przeciw
   REALNEJ prozie poprzednich lekcji, nie z pamięci.
2. **Licznik wewnętrzny.** Lekcja trzy razy obiecuje pięć komunikatów błędu,
   a przy piątym pisze „trzeci i ostatni" — bo pięć operacji nie mapuje się
   1:1 na pięć błędów.
3. **Zawężenie żyjące w tabeli, a zgubione w prozie** — trzy razy w tym
   module. Autor pisze wiersz tabeli dokładnie, a w prozie skraca.
   **Sprawdzać prozę PRZECIW własnej tabeli autora, nie tylko przeciw źródłu.**

#### Ujednolicone oznaczenia zmiennych (do odwrócenia jedną komendą)

Moduł miał dwie konwencje: 2.3 używała angielskich `REMOTE-NAME`/`BRANCH-NAME`
(i wprost to czytelnikowi deklarowała), a 2.2 i 2.5 polskich
`NAZWA-ZDALNEGO`/`NAZWA-GAŁĘZI` dla tych samych pojęć. Zgłosił to autor ściągi,
bo na jednej kartce widać to najmocniej. Ujednolicone na **polskie** — tak mówi
reguła 7 briefu i tak robiły trzy lekcje z czterech. Tabele zgodności zachowują
notację źródła; `USERNAME/REPOSITORY` zostaje po angielsku, bo dokładnie tak
wygląda w adresach i w komunikatach Gita. **Obowiązuje w module 3.**

#### NASTĘPNY KROK CZATU A — ZROBIONE 2026-08-23 (zapis historyczny; aktualny stan na końcu dokumentu)

1. ~~**Brief prozy modułu 3**~~ **ZROBIONE 2026-08-22** —
   [tresc-kursow/jak-uzywac-githuba/modul-3/BRIEF-prozy-modulu.md](../../tresc-kursow/jak-uzywac-githuba/modul-3/BRIEF-prozy-modulu.md)
   (56 kB): trzy klasy usterek z modułu 2, reguła o podręczniku narzędzia,
   sekcja o NADMIARZE ŹRÓDŁA z wiążącą selekcją dla 3.3 (13 sekcji z 25)
   i 3.5 (3 ustawienia rozwinięte z 13), stan czytelnika sprawdzony
   `grep`-em w gotowej prozie, oba mosty zweryfikowane programowo.
   **Następne: fala 1 — lekcje 3.1, 3.2, 3.3 równolegle, trzej autorzy
   na Sonnecie, przegląd fali przed puszczeniem 3.5 i 3.6.**
   **Uwaga: w module 3 problemem jest NADMIAR źródła, nie niedobór** —
   źródło o Markdownie ma 30 kB, o gałęziach chronionych 21 kB. Rozpiska
   „co pomijasz" waży tam więcej niż w module 2, gdzie źródła miały 0,3–8,3 kB.
2. Moduł 3 po cięciu ma **pięć lekcji: 3.1, 3.2, 3.3, 3.5, 3.6** (wycięte 3.4
   o licencji i 3.7 o dużych plikach — obu NIE WOLNO obiecywać w prozie).
3. Most wejściowy jest już ustalony i **musi** zostać podjęty przez 3.1 —
   ostatnie zdanie lekcji 2.7: „Masz codzienny rytm pracy i jedną kartkę
   z komendami, po którą sięgniesz, gdy któraś wypadnie Ci z głowy. W module
   trzecim zajmiemy się tym, jak Twoje repozytorium wygląda z zewnątrz:
   dobrymi praktykami, README, formatowaniem w Markdownie, ochroną gałęzi
   głównej i wydaniami z numerem wersji."
4. **Szew między czatami: czat A ustala zdanie zamykające moduł 3 w swoim
   briefie i przekazuje je czatowi B, zanim B napisze lekcję 4.1.**
5. Bramka cytatów modułu 3: wyrywkowa, dwie najgęstsze lekcje, weryfikatory
   na Opusie.

**Czym pracować:** worktree `/home/krzysiek/Pod-strona-Szkolenia-k2-A`, gałąź
`feat/tresc-k2-modul-2-3`, port **3012** (`fuser -k 3012/tcp`, potem
`npx next dev -p 3012`). Przelot mechaniczny modułu (objętość kontraktem,
mosty co do znaku z autokontrolą przeciw briefowi, tematy wycięte, obietnice
lekcji, druga osoba małą literą, znaczniki zrzutów, tabela zgodności, nawrót
BLAD-008) był skryptem w scratchpadzie sesji — odtworzenie zajmuje chwilę,
bo wszystkie wzorce stoją w briefie modułu. **Nowy test sprawdzić testem
negatywnym**: przy tym skrypcie podrzucenie sześciu usterek wykryło, że
pierwotny wzorzec „lekcja o…" wywalał się na dozwolonych odsyłaczach WSTECZ.

### MODUŁ 3 KURSU 2 — ZAMKNIĘTY I WGRANY (2026-08-23, czat A)

Pięć lekcji (3.1–3.3 + 3.5, 3.6), **57 273 znaki** pomiaru kontraktowego,
w bazie i w repo. Pełne liczby, cztery sygnały jakości i znaleziska:
**[tresc-kursow/POSTEP.md](../../tresc-kursow/POSTEP.md)**, sekcja
„Moduł 3 Kursu 2".

**Weryfikacja dwustronna po wgraniu** (`db1:tresc --sprawdz` bez potoku,
kod wyjścia 0, „Bez zmian: 5. Do wgrania: 0."): Kurs 2 ma w bazie 6 modułów,
32 lekcje, **17 z treścią, 184 828 znaków**. **Proza modułów 1 i 2 nietknięta
co do znaku — 64 418 i 63 137, tyle samo co przed operacją.** Numeracja
modułu 3 ma celową dziurę na pozycji 4 (wycięta lekcja o licencji).

**Bramka cytatów (3.3 i 3.5, Opus) dała dwie usterki BLOKUJĄCE** — obie
takie, których nie złapałby żaden strażnik ani przelot mechaniczny, bo
zdanie jest prawdziwe w połowie przypadków. Opis w POSTEP.md; tu tylko
wniosek, który dotyczy dalszej pracy obu czatów:

> **Błąd w briefie wchodzi do prozy jako teza, bo autor pisze wiernie za
> briefem.** W tym module z briefu przyszły: błędny licznik ustawień
> („trzynaście" zamiast dwunastu), nieprawda o tym, co robi „Do not allow
> bypassing", i flaga `--force`, której nie ma w żadnym ze źródeł lekcji.
> Autorzy przepisali wszystkie trzy. **Liczby i zdania „co robi ta rzecz"
> sprawdzać przeciw źródłu W CHWILI PISANIA BRIEFU** — przy przeglądzie
> prozy brief jest już traktowany jak wzorzec, więc nikt go nie kwestionuje.

Druga rzecz warta przeniesienia: **poprawki bramki kosztują znaki**,
a widełki są twarde. Płacimy **selekcją, nie ściskaniem zdań** — w 3.5
wyleciało zdanie dublujące kolumnę tabeli obok i ściąga dublująca
„Zapamiętaj" (−432 znaki), w 3.3 wycięliśmy wzmianki zespołowe zamiast
dopisywać ich składnię (czytelnik pracuje sam).

#### NASTĘPNY KROK CZATU A (dokładnie od tego zacząć)

Czat A **skończył swoje terytorium**: moduły 2 i 3 Kursu 2 są napisane,
wgrane i zacommitowane na `feat/tresc-k2-modul-2-3`. Do zrobienia zostaje
to, czego nie da się zrobić w pojedynkę:

1. **Gałąź czeka na scalenie** — moduły 4–6 pisze czat B na własnej gałęzi;
   scalać wtedy, gdy obie strony są gotowe (patrz „CZATY ROZJECHAŁY SIĘ NA
   TEJ DECYZJI" wyżej — numeracja plików prozy).
2. **Most 3.6 → 4.1 stoi w prozie co do znaku.** Czat B pisze otwarcie
   modułu 4 pod to zdanie. Nic więcej nie przekazujemy.
3. **Tropy do audytu końcowego** dopisane do
   [`tresc-kursow/AUDYT-KONCOWY.md`](../../tresc-kursow/AUDYT-KONCOWY.md)
   — pięć nowych, w tym ścieżki kliknięć niesprawdzone wobec żywego
   interfejsu (do przelotu zrzutów) i cudzysłów zamykający.

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

#### Bramka cytatów 5.3 „Continuous Integration" — ZROBIONA (2026-08-22)

Pięć weryfikatorów na Opusie, równolegle, **każdy z jednym pytaniem**:
(1) wniosek autora jako teza dokumentacji + obserwacja z ekranu [U2];
(2) bloki cytatu `>` zdanie po zdaniu + cytat urwany w pół warunku [U1];
(3) zakres tez — kwantyfikatory, modalność, warunki, liczby, przekład;
(4) tabela zgodności wiersz po wierszu w TRZY strony (wiersz→źródło,
wiersz→lekcja, **lekcja→tabela**); (5) sekcje pomocnicze [U3, U4],
ćwiczenie, etykiety treści własnych. Każdy dostał zakaz edycji plików,
listę czterech rozjazdów naprawionych wcześniej przelotem (z zakazem
cofania) i informację, że bloki YAML są już potwierdzone bajt w bajt.
Wynik: **2 usterki istotne i 17 drobnych naprawionych**, 2 zgłoszenia
odrzucone jako fałszywy alarm.

**Rozdzielenie pytań opłaciło się mierzalnie — żadna z dwóch usterek
istotnych nie została znaleziona przez wszystkich pięciu.** Zbieżność
niezależnych przebiegów była za to najlepszym filtrem: siedem tez
zgłosiło po dwóch–trzech weryfikatorów i wszystkie siedem się obroniło.

**Usterka istotna 1 — `matrix` mnoży JOBY, nie „przebiegi".** Znalazły
niezależnie trzy przebiegi (1, 3, 5). Źródło: „Each version of Node.js
specified in the `node-version` array creates a **job** that runs the
same steps". Lekcja rozszerzała to raz na „uruchomi **cały plik**
dwukrotnie", raz na „**przebiegi**" — a `matrix` daje N jobów w JEDNYM
przebiegu. Skutek najgorszy z możliwych w poradniku: punkt
`## Gdy coś nie działa` obiecywał objaw, **który nigdy nie wystąpi**
(„Widzę dwa albo trzy przebiegi dla tego samego commita"), i przeczył
własnemu wyjaśnieniu dwa słowa dalej („osobny job"). Kurs ma na to
twardy słownik: 5.1 wprowadziła „przebieg" = *workflow run* ze swojego
źródła, więc to nie była luźna synonimia. Tabela zgodności była tu
akurat POPRAWNA — czyli tabela nie wyłapie usterki, której proza nie
zgłasza do sprawdzenia.

**Usterka istotna 2 — odsyłacz po NUMERZE modułu.** „znaczki, które
widziałeś na pull requestach **w module czwartym**" przy tabeli
odniesień briefu, która dla tego samego tematu podaje formę „widziałeś
je w module o współpracy" — a sama lekcja dziesięć linii niżej odsyła
poprawnie, po nazwie. Poprawione na formę z briefu.

**Nowa klasa usterki, warta zapamiętania: DOKLEJKA ZA MYŚLNIKIEM
w zdaniu otwartym formułą „Dokumentacja mówi wprost".** Trafiła się
trzy razy w jednej lekcji: „…jedna z wypchniętych zmian mogła być
przyczyną — **wracaj do ostatniego commita, nie do samego workflow**"
(źródło zostawia inne przyczyny otwarte, a błąd w samym pliku workflow
to typowa przyczyna czerwonego przebiegu); „instaluje zależności
z `package.json` — **ale bez tej samej gwarancji dokładnych wersji**"
(źródło o `npm install` mówi JEDNO zdanie opisowe i nic nie porównuje);
„budują kod **(jeśli projekt w ogóle ma taki krok)**" (semantyka
`--if-present` to wiedza o npm, nie teza dokumentacji GitHuba). Gatunek
(a) z briefu opisuje CAŁE zdanie bez pokrycia; ta odmiana chowa się
w ogonie zdania, którego pierwsza połowa jest wierna co do słowa —
i dlatego przechodzi przez czytanie „czy to zdanie jest w źródle".

**Rodzina usterek, która wyszła seryjnie: ZDJĘTA MODALNOŚĆ.** Pięć
miejsc, w których źródłowe „can / you can" zamieniło się w tryb
oznajmujący: „who **can** spend" → „programista spędza"; „workflows
that **can** build" → „workflow budują"; „**You can configure**" →
„konfigurujesz"; „**You can use** npm … to install dependencies" →
„workflow **musi mieć** zainstalowane zależności"; „You can build and
test updates **locally before pushing code**" → „serwera **lokalnego**"
(z tego ostatniego wyparował cały warunek: pierwszy wariant źródła to
robota u siebie PRZED pushem, a nie drugi rodzaj serwera). Każde
z osobna wygląda na stylistykę; razem robią z możliwości — wymóg.
**Do promptu autora na kolejne fale: modalność źródła jest treścią,
nie ozdobnikiem.**

**Trzeci wniosek: kierunek „lekcja → tabela" to jedyny, który coś
znalazł.** Wiersze tabeli wskazywały istniejące sekcje i opisywały
realną treść lekcji (kierunki 1 i 2 czyste, 20 wierszy), ale **dziewięć
tez postawionych w lekcji nie miało w tabeli wiersza** — w tym trzy
niosące ciężar: mechanizm polecania szablonów (na nim stoi pierwszy
punkt „Gdy coś nie działa"), ciągłe budowanie i testowanie po commicie
oraz semantyka `${{ … }}`, obiecana w „Czego się nauczysz"
i powtórzona w „Zapamiętaj". Dopisane sześć wierszy, w tym **dwa
z jawną etykietą „poza C i N"**: jeden dla `${{ … }}` (brief zleca to
zdanie 5.3, więc treść zostaje — brakowało oznaczenia, że źródło mówi
w tym miejscu wyłącznie o kontekście `matrix`), drugi dla runnera
startującego czysto i akcji `checkout`.

**Dwa zgłoszenia ODRZUCONE po sprawdzeniu w oryginale** — i to jest
lekcja o samej bramce. Dwa przebiegi zgłosiły runner „świeży przy
każdym przebiegu" i `checkout` „pobiera repozytorium na runner" jako
tezy bez pokrycia, bo w źródłach 5.3 ich nie ma. Są **legalnymi
odwołaniami wstecz**: 5.1 podaje oba z własnego źródła
(`understand-github-actions.md`, „Runners" i „Actions") i ma je
w swojej tabeli zgodności. Znalazł to jedyny weryfikator, który
przeczytał lekcje SĄSIEDNIE. **Wniosek do promptu weryfikatora:
zanim zgłosisz tezę bez pokrycia, sprawdź, czy kurs nie wprowadził jej
wcześniej z innego źródła** — inaczej bramka zaczyna kasować wiedzę
zbudowaną w poprzednich lekcjach. Zamiast usuwać, dopisaliśmy im
wiersze tabeli z etykietą pochodzenia.

**Objętość — reguła 5 briefu potwierdzona po raz drugi z rzędu.**
Naprawy wypchnęły lekcję z 11 709 na **11 999** (jeden znak pod
sufitem), więc margines odzyskany cięciem **prozy redakcyjnej**, nie
treści ze źródła: **11 835**. Tabela zgodności NIE liczy się do widełek
(`lib/proza-lekcji.ts`: `tresc` = markdown bez frontmatteru i bez
tabeli), więc wiersze dowodowe są darmowe — warto o tym pamiętać,
bo dopisanie sześciu wierszy wyglądało na wydatek, a nie było nim.

**Dowody po bramce:** strażnicy 25/25, mosty 27 (5.2→5.3) i 19
(5.3→5.4) przy progu 40, domknięcie `## Co dalej` zgodne z tabelą
mostów briefu co do znaku, zero znaków `”`.

##### Punkty kontroli U1–U4 — stan po bramce 5.3 (NADAL OTWARTE)

Weryfikatorzy dostali U1–U4 jako osobne pytania. Wynik:

| # | Co wyszło w 5.3 | Stan klasy |
|---|---|---|
| **U1** cytat urwany w pół warunku | wewnątrz trzech bloków `>` **nie wystąpił** — wszystkie trzy to wierne przekłady ciągłych fragmentów jednego akapitu źródła, bez sklejek. Wystąpiła za to **łagodniejsza odmiana poza blokami**: zgubiony warunek „locally **before pushing code**" i pięć zdjętych „can" | OTWARTA — nie sprawdzono 5.1, 5.2 ani 4.2, 4.3, 4.5, 4.6 |
| **U2** obserwacja z ekranu jako teza | nie wystąpiła w tej postaci; wystąpił za to jej krewny — **wiedza o npm** (`--if-present`) i **wniosek o `npm install`** podane jako teza dokumentacji | OTWARTA — j.w. |
| **U3** diagnoza opisuje widoczność interfejsu | **wystąpiła i była to usterka ISTOTNA** — „Widzę dwa albo trzy przebiegi", czyli opis ekranu, którego źródło nie opisuje i którego użytkownik nie zobaczy. Druga: „na podstawie faktycznej zawartości repozytorium" zamiast źródłowego „języka i frameworka" | OTWARTA, **potwierdzona jako realna w drugiej lekcji z rzędu** |
| **U4** sprzeczność wewnątrz lekcji | **wystąpiła** — nagłówek punktu poradnika („przebiegi") przeczył własnemu wyjaśnieniu („osobny job") w tej samej linii | OTWARTA, potwierdzona w drugiej lekcji z rzędu |

**U3 i U4 wyszły teraz dwa razy pod rząd, w lekcjach dwóch różnych
autorów.** To przestaje wyglądać na przypadek: obie klasy osiadają
w sekcji `## Gdy coś nie działa`, bo autor pisze ją z wyobrażenia
ekranu, a nie ze źródła. **Rekomendacja na moduł 6: nie czekać na
bramkę wyrywkową — przelot spójności ma czytać `## Gdy coś nie działa`
KAŻDEJ lekcji przeciw źródłu, pozycja po pozycji.** To najtańsze
miejsce, w którym te dwie klasy dają się złapać hurtem.

#### ⚠️ DZIURY W POZYCJACH LEKCJI W BAZIE — blokada wgrywania treści (2026-08-22)

**Zgłosił czat A dla modułu 4; sprawdziłem i dotyczy TAKŻE modułu 5.**
Cięcie programu skasowało lekcje, ale **nie przenumerowało pozostałych**,
więc `position` ma dziury. Stan w bazie (odczyt 2026-08-22, kurs
`jak-uzywac-githuba`):

| Moduł | `position` lekcji w bazie | Pliki prozy | Skutek |
|---|---|---|---|
| 4 | 0, 1, **3, 4, 5**, **7, 8** | `proza-2`…`proza-7` | rozjazd od trzeciej lekcji |
| 5 | 0, 1, 2, **5** | `proza-1`…`proza-4` | rozjazd na `proza-4` (Sekrety) |

**Mechanizm** (`lib/proza-lekcji.ts`, `dopasujDoProgramu`): pozycja liczona
jest z nazwy pliku jako `proza.lekcja - 1`, a potem sprawdzany jest TYTUŁ.
Plik `proza-4-sekrety-w-workflow.md` szuka więc `position === 3`, a „Sekrety
w workflow" stoją w bazie na `position === 5`.

**Wgrywanie wywali się głośno i niczego nie zepsuje** — to działa jak
strażnik, zgodnie z projektem. Ale komunikat jest **mylący i kosztuje rundę
debugowania**: dla modułu 5 powie „moduł 5 nie ma lekcji 4 (ma 4)" — czyli
zaprzeczy istnieniu lekcji i w tym samym zdaniu poda, że lekcji jest cztery.
Kto tego nie wie, zacznie szukać błędu w nazwie pliku albo w tytule.

**Czyja to robota:** program w bazie należy do **czatu A** — ten czat go nie
dotyka. Do zrobienia po stronie czatu A przy cięciu programu:
**przenumerować pozycje na ciągłe `0…N-1`** w modułach 4 i 5 (a przy okazji
sprawdzić pozostałe moduły Kursu 2 tym samym zapytaniem). Dopiero potem
`npm run db1:tresc -- --kurs jak-uzywac-githuba --modul N --sprawdz`.

**Do rozważenia niezależnie od kolejności prac:** komunikat błędu w
`dopasujDoProgramu` powinien wypisywać **dostępne pozycje i tytuły**, a nie
samą liczbę lekcji. Wtedy dziura w numeracji diagnozuje się sama, zamiast
wyglądać na błąd nazwy pliku. To zmiana w `lib/`, czyli **teren wspólny obu
czatów** — nie robię jej jednostronnie.

#### Plik cytatów modułu 5 — DRUGA BRAMKA, ZROBIONA (2026-08-22)

Dwa weryfikatory na Opusie, podział po lekcjach (5.1+5.2 i 5.3+5.4). Efekt:
**15 usterek istotnych i 8 drobnych naprawionych**, plik przenumerowany,
narzędzie sprawdzające utrwalone w repo.

**Główny wniosek, do powtórzenia przy module 6: plik cytatów nie zdawał
swojego jedynego zadania.** Wierność samych cytatów była wzorowa (5.1 — 35/35
tez pokrytych, wszystkie cytaty co do słowa; 5.3 i 5.4 — 38/38 bloków zgodnych,
zero zgubionej modalności). Zawodziło **POKRYCIE**: 24 tezy postawione
w lekcjach nie miały w pliku ani jednego zdania. Nie przypadkowe —
z wyraźnym wzorem:

- **kroki interfejsu i listy wypadały, treść wykładowa zostawała.** Brakowało
  całej listy „Prerequisites", zdania wprowadzającego krok 1 wraz z pierwszym
  wariantem, kroków 3–4 („Commit changes", okno „Propose changes"), ścieżki
  **Actions → New workflow → „Choose a workflow"**, kroków 6–8 zakładania
  sekretu repozytorium i całej ścieżki sekretu środowiska. Czyli dokładnie
  tego, co proza podaje jako instrukcję DO WYKONANIA;
- **brakowało artefaktów, które lekcja omawia najdokładniej**: pliku
  `Node.js CI`, który 5.3 czyta linia po linii (w pliku stał INNY przykład,
  z `npm install`), oraz przykładu Bash z 5.4, wklejonego w prozie dosłownie
  i będącego wzorcem dla promptu lekcji;
- **elipsa `[…]` wycinała akurat zdanie niosące tezę**: „GitHub Actions also
  redacts information that is recognized as sensitive" oraz dwa punkty limitu
  („All 100 repository secrets", „All 100 environment secrets");
- **cytat urywał się o zdanie za wcześnie** — blok o szablonach kończył się
  przed zdaniem o `actions/starter-workflows`, którego proza używa. To ta sama
  klasa co U1, tyle że po stronie pliku cytatów. Luka jest **odziedziczona po
  scenariuszu D7** i przetrwała pierwszą bramkę.

**Numeracja pliku naprawiona.** Sekcje miały starą numerację siedmiu lekcji,
więc „5.4" znaczyło dwie różne rzeczy (wyciętą „Anatomię workflow" i dzisiejsze
„Sekrety w workflow", których cytaty stoją pod `L5.6`). Rozwiązanie:
przedrostek **`D7-`** na starej numeracji + **tabela przelicznika** w nagłówku
+ ostrzeżenie przy każdej sekcji lekcji wyciętej. Cytatów lekcji wyciętych NIE
kasujemy — powołują się na nie scenariusze D7. Sprawdzone: nikt w repo nie
linkuje do kotwic sekcji, więc zmiana nagłówków niczego nie zepsuła.

**NOWE NARZĘDZIE: `tools/cytaty-zgodne.mjs`** — sprawdza maszynowo, czy każdy
cytat stoi DOSŁOWNIE w oryginale (normalizuje ikony SVG, odsyłacze, punktory,
pogrubienia i łamanie wierszy). Wymaga pobranej dokumentacji, więc jest
NARZĘDZIEM, nie strażnikiem CI. Wywołanie dla modułu 5:

```
node tools/cytaty-zgodne.mjs \
  docs/dokumentacja-techniczna/d7/cytowane/github--modul-5.md \
  docs/dokumentacja-techniczna/d7/github/actions \
  D7-5.1 D7-5.2 D7-5.3 D7-5.6
```

**Co złapało to narzędzie, a czego nie złapali weryfikatorzy: CICHY SKRÓT.**
Dwa miejsca, w których cytat urywał punkt listy bez `[…]` — jedno wklejone
przeze mnie w tej samej turze, jedno odziedziczone (cztery punkty ramki Note
o sekretach). Każde zdanie z osobna było prawdziwe; niecytowany był OGON
punktu, więc oko tego nie łapie. Dlatego narzędzie skleja cały blok `>`
w jeden ciąg i wymaga ciągłości w oryginale, a `[…]` jawnie dzieli blok na
kawałki sprawdzane osobno. Sprawdzone dwoma testami negatywnymi (podmiana
słowa „job" → „run" i skrócenie „Or, you can" → „Or you can": kod 1).

**Usterka prozy złapana przy okazji:** 5.4 miała w `## Gdy coś nie działa`
nagłówek „W logu widzisz pustkę zamiast **gwiazdek**" — bramka cytatów 5.4
zdjęła „gwiazdki" z ciała lekcji, ale nagłówek został. Naprawione. **Klasa
do zapamiętania: naprawa terminu w prozie musi objąć NAGŁÓWKI punktów, nie
tylko zdania.** Mój własny `grep` dał tu fałszywie negatywny wynik (szukałem
rdzenia „gwiazdk", a słowo brzmi „gwiazdek") — kolejne potwierdzenie reguły,
że brak trafienia niczego nie dowodzi.

**OTWARTA DECYZJA (teren wspólny obu czatów, NIE ruszam jednostronnie):**
pliki prozy nie mają we frontmatterze pola `cytowane:` — mają je wyłącznie
scenariusze `lekcja-*.md`. Sprawdzone: żaden z 16 plików prozy Kursu 2 go nie
ma, więc to konwencja całego kursu. Skutek jest realny: czytelnik prozy nie
dowie się z pliku, że plik cytatów istnieje, i pójdzie po 55 MB — czyli
dokładnie w to, czemu plik cytatów miał zapobiec. Do rozstrzygnięcia razem
z czatem A (dotyczy też modułów 1–3) i po sprawdzeniu, czy `straznik-prozy`
i kontrakt prozy przepuszczą nowe pole.

**Stan dowodów po obu bramkach:** strażnicy 25/25, `cytaty-zgodne` 115/115
fragmentów dosłownych, mosty 27 i 19 przy progu 40, objętości 11 835 (5.3)
i 11 798 (5.4).

#### NASTĘPNY KROK czatu B (stan na koniec 2026-08-22)

**Moduł 5 jest domknięty od strony treści i dowodów.** Cztery lekcje po
przelocie spójności, bramce cytatów prozy (5.4 i 5.3) i bramce pliku cytatów.
Objętości 11 876 / 11 780 / 11 835 / 11 798. Strażnicy 25/25,
`cytaty-zgodne` 115/115.

**Do zrobienia dalej, w tej kolejności:**

1. **Moduł 6 wg jego briefu** (`tresc-kursow/jak-uzywac-githuba/modul-6/BRIEF-prozy-modulu.md`)
   — reguły produkcji 1–10, w tym **trzy nowe, dopisane po bramkach modułu 5**
   (doklejka za myślnikiem; modalność źródła jako treść; `## Gdy coś nie
   działa` czytane przeciw źródłu pozycja po pozycji w KAŻDEJ lekcji).
   Autorzy na Sonnecie, jeden autor = jedna lekcja, bramki na Opusie.
   **Uwaga: lekcja 6.4 zamyka CAŁY KURS** — jej podsumowanie trzeba
   weryfikować przeciw REALNYM tytułom lekcji
   (`grep -h "^lekcja:" modul-*/*.md`), nie z pamięci; to lekcja z modułu 7
   Kursu 2, gdzie autor finału przypisał trzy tematy do złych modułów.
2. **Bramka cytatów prozy** dwóch najgęstszych lekcji modułu 6 + **bramka
   pliku cytatów** (`github--modul-6.md`) narzędziem `tools/cytaty-zgodne.mjs`.
   Plik modułu 6 najpewniej ma **ten sam rozjazd numeracji** co moduł 5
   (powstał dla programu D7 sprzed cięcia) — sprawdzić i przenumerować tym
   samym wzorcem `D7-…` + tabela przelicznika.
3. **Lekcja 4.1** — nadal czeka na zdanie zamykające moduł 3 od czatu A.
4. **Wgranie treści do bazy** — czeka na czat A: cięty program ORAZ
   **przenumerowanie pozycji lekcji na ciągłe `0…N-1`** (patrz sekcja
   „DZIURY W POZYCJACH LEKCJI W BAZIE" wyżej — dotyczy modułów 4 i 5).
5. **`POSTEP.md`** — ruszamy dopiero przy zamknięciu modułów; wpis obejmie
   moduły 4, 5 i 6 razem, wraz z nieaktualnym wierszem tabeli „Kurs 2
   (7 modułów) | 50 | — | ⬜ przed startem".

**Czego NIE robić:** nie dotykać programu w bazie, nie przełączać gałęzi
w cudzych katalogach, nie zamykać punktów kontroli U1–U4 (zamykają się
dopiero po przejściu przez lekcje, których bramka dotąd nie objęła:
4.2, 4.3, 4.5, 4.6 oraz 5.1, 5.2).

#### MODUŁ 6 NAPISANY — Kurs 2 ma komplet prozy (2026-08-22, czat B)

**Cztery lekcje, commit `09ecf0b`.** Objętości kontraktem: 11 760 (6.1 2FA) /
11 963 (6.2 klucze SSH) / 11 942 (6.3 zabezpiecz repozytorium) / 12 497
(6.4 secret scanning — ta jedna ma widełki 8 000–13 000, bo zamyka kurs).
Mosty 26 / 26 / 14 przy progu 40, domknięcia 6.1–6.3 zgodne z tabelą briefu
co do znaku, zrzuty 4/3/4/3, strażnicy 25/25.

**Podsumowanie kursu w 6.4 sprawdzone osobno** przeciw tabeli 32 lekcji
z briefu (to procedura po module, punkt 2): wszystkie sześć modułów opisane
po nazwie, żadnego tematu z listy zakazanej, zero obietnic dalszych części.
Klasa usterki z finału Kursu 1 nie wystąpiła.

##### Co znalazł przelot spójności (agent główny, przed bramką)

Czytanie przeciw ORYGINAŁOWI — nie przeciw tabeli autora — dało 16 usterek,
w tym 5 istotnych. Powtórzenie wniosku z modułu 5: autorzy na Sonnecie
oddają czystą mechanikę (objętość, most, domknięcie, cudzysłów — wszystko
za pierwszym razem u wszystkich czterech), a mylą się tam, gdzie trzeba
przeczytać źródło.

1. **6.1 — teza rozszerzona na sąsiedni mechanizm (ISTOTNA).** Passkey
   opisany jako „dostępny dopiero po TOTP albo SMS", bo tak jest z kluczem
   bezpieczeństwa i GitHub Mobile; źródło mówi wprost coś innego („If you
   don't use 2FA, using a passkey will skip the requirement to verify a new
   device via email"). Zdążyło wejść do „Zapamiętaj".
2. **6.3 — ścieżka interfejsu przeniesiona od sąsiada (ISTOTNA).** Alerty
   Dependabota włącza się według źródła przez ustawienia **konta** („Click
   your profile picture, then click Settings"); wszystkie inne sekcje tego
   samego pliku zaczynają się od „From the main page of your repository".
   Autor uogólnił ścieżkę na wszystkie przełączniki.
3. **6.4 — sprzeczność wewnątrz lekcji (ISTOTNA, U4 trzeci raz z rzędu).**
   Sekcja 1 powoływała się na przełącznik włączony w lekcji poprzedniej,
   sekcja 4 pisała, że publiczne repozytorium ma skanowanie „bez żadnego
   przełącznika do szukania".
4. **6.2 — modalność OSŁABIONA (ISTOTNA).** Patrz osobny akapit niżej.
5. Drobne: doklejki za myślnikiem (6.1, 6.4 ×2), zgubione zawężenia
   (`--apple-use-keychain` bez hasła, `exec ssh-agent bash`, „depending on
   the programming languages"), przykład wartości spolszczony („mój laptop"
   zamiast źródłowego `Personal laptop`), „jedyny wyjątek", który wyjątkiem
   nie był.

##### NOWY KIERUNEK REGUŁY 9: modalność bywa OSŁABIANA, nie tylko wzmacniana

Reguła 9 opisywała dotąd jeden kierunek — „can" zamieniane w tryb
oznajmujący albo w „musisz". W module 6 wyszedł kierunek odwrotny, dwa razy
i w dwóch lekcjach: 6.2 zamieniła `you will need to modify your ~/.ssh/config`
w „dokumentacja **zaleca**", a 6.3 przepisała w **bloku cytatu**
`you may not need to enable every feature` jako „**nie musisz** włączać
każdej funkcji". Skutek jest gorszy niż przy wzmacnianiu: czytelnik pomija
krok, który dokumentacja stawia jako wymóg. **Do promptu autora i
weryfikatora: oba kierunki są usterką.** Wpisane do promptów fali 2 i do
wszystkich ośmiu weryfikatorów tego modułu.

##### Bramka cytatów — osiem przebiegów, po cztery na dwie najgęstsze lekcje

Wskazanie briefu (6.2 i 6.3) utrzymane. Zamiast pięciu pytań jak w module 5
— cztery na lekcję, przez połączenie gatunku (a) z doklejką za myślnikiem:
(1) teza bez pokrycia + doklejka + obserwacja z ekranu; (2) bloki cytatu
zdanie po zdaniu + cytat urwany w pół warunku; (3) zakres, modalność w obie
strony, liczby, warunki, przekład, zawężenia systemowe; (4) tabela zgodności
w trzy strony + sekcje pomocnicze. **Siedem przebiegów skończyło się,
ósmy (6.3, tabela i sekcje pomocnicze) padł na limicie usage** — to jedyna
niezrobiona część bramki prozy tego modułu.

Wynik: **26 usterek zgłoszonych, wszystkie realne naprawione**; zero
fałszywych alarmów, w odróżnieniu od modułu 5 (tam dwa) — bo prompt niósł
listę rzeczy już naprawionych z zakazem cofania oraz polecenie sprawdzenia,
czy kurs nie wprowadził tezy wcześniej z innego źródła. Weryfikatorzy z tego
korzystali i jawnie odnotowywali, czego nie zgłaszają.

**Dwie nowe klasy usterek, warte przeniesienia do kolejnych bramek:**

- **TABELA ZGODNOŚCI NIE NADĄŻA ZA NAPRAWĄ PROZY.** Trzy niezależne przebiegi
  zgłosiły ten sam wiersz 6.2: proza miała już poprawione `Personal laptop`,
  a tabela dalej przypisywała dokumentacji przykład „mój laptop". To skutek
  uboczny NASZYCH napraw, nie pracy autora — **po każdej naprawie prozy
  trzeba przejść tabelę**. Ta sama mechanika co „naprawa terminu musi objąć
  nagłówki punktów" z modułu 5.
- **ŚCIĄGAWKA „Prompty z tej lekcji" MUSI ZNAĆ OSTRZEŻENIA WŁASNEJ LEKCJI.**
  Blok Windows w 6.2 podawał `clip < …` jako gotową komendę do wklejenia,
  podczas gdy sekcja merytoryczna tej samej lekcji ostrzegała, że w
  PowerShell/Windows Terminal zwraca ona `ParseError`. Sekcja z gotowcami
  jest czytana bez kontekstu — sprawdzać ją osobno przeciw poradnikowi.

**Zbieżność niezależnych przebiegów znów była najlepszym filtrem:** usterkę
istotną 6.3 (warunek grafu zależności rozciągnięty na „aktualizacje" i „resztę
łańcucha bezpieczeństwa", gdy źródło wiąże go tylko z alertami i przeglądem
zależności) zgłosiły dwa przebiegi niezależnie, a wiersz tabeli z „mój
laptop" — trzy.

**Weryfikatorzy zgłosili też cztery miejsca, w których ŹRÓDŁO SAMO JEST
NIEJEDNOZNACZNE** i słusznie ich nie rozstrzygnęli: czy przegląd zależności
włącza się sam z grafem czy wymaga Code Security; czy push protection jest
częścią Secret Protection czy funkcją do dobrania; czy „part of a team"
znaczy plan GitHub Team czy zespół w organizacji; czy publiczne repozytorium
w ogóle wymaga kliknięcia „Enable". Lekcja podaje w tych miejscach obie
wersje za źródłem — **nie rozstrzygać ich bez nowego źródła.** Osobno:
źródło SSH przeczy samo sobie przy `IgnoreUnknown UseKeychain` (proza mówi
`Host *.github.com`, blok do skopiowania — `Host github.com`); lekcja poszła
za blokiem kodu i tak zostaje.

##### NASTĘPNY KROK czatu B

1. **Bramka pliku cytatów modułu 6** — `docs/dokumentacja-techniczna/d7/cytowane/github--modul-6.md`
   (66 kB). **Sprawdzone: ma stary układ D7** — sekcje `L6.1`–`L6.6`, więc
   dzisiejsza lekcja 6.3 („Zabezpiecz swoje repozytorium") stoi pod `L6.4`,
   a 6.4 („Secret scanning") pod `L6.6`; `L6.3` i `L6.5` to lekcje wycięte
   z programu. Przenumerować wzorcem z modułu 5: przedrostek **`D7-`** na
   starej numeracji + tabela przelicznika w nagłówku + ostrzeżenie przy
   sekcjach lekcji wyciętych (cytatów lekcji wyciętych NIE kasujemy —
   powołują się na nie scenariusze D7). Potem narzędzie:
   `node tools/cytaty-zgodne.mjs docs/dokumentacja-techniczna/d7/cytowane/github--modul-6.md docs/dokumentacja-techniczna/d7/github D7-6.1 D7-6.2 D7-6.4 D7-6.6`
   (uwaga: źródła modułu 6 leżą w dwóch gałęziach drzewa — `github/authentication`
   dla 6.1–6.2 i `github/code-security` dla 6.3–6.4; sprawdzić, czy narzędzie
   przyjmie katalog `github` jako korzeń). Wzorzec z modułu 5 mówi, że ta
   bramka jest DRUGĄ BRAMKĄ JAKOŚCI, nie porządkami: w module 5 dała
   15 usterek istotnych, głównie **braków pokrycia** (kroki interfejsu i listy
   wypadały, treść wykładowa zostawała).
2. **Czwarty przebieg bramki 6.3** (tabela zgodności w trzy strony + sekcje
   pomocnicze) — padł na limicie usage, do powtórzenia. Pozostałe trzy
   przebiegi tej lekcji są zrobione.
3. **`POSTEP.md`** — wpis obejmie moduły 4, 5 i 6 razem, wraz z nieaktualnym
   wierszem tabeli „Kurs 2 (7 modułów) | 50 | — | ⬜ przed startem".
4. **Lekcja 4.1** — nadal czeka na zdanie zamykające moduł 3 od czatu A.
5. **Wgranie treści do bazy** — czeka na czat A podwójnie: cięty program ORAZ
   przenumerowanie pozycji lekcji na ciągłe `0…N-1` (sekcja „DZIURY
   W POZYCJACH LEKCJI W BAZIE" wyżej).

**Punkty kontroli U1–U4 zostają OTWARTE.** Bramka modułu 6 objęła 6.2 i 6.3;
6.1 i 6.4 sprawdził tylko przelot agenta głównego, a z modułów 4 i 5 nadal
nie mają bramki lekcje 4.2, 4.3, 4.5, 4.6 oraz 5.1 i 5.2. U3 i U4 wyszły
w tym module ponownie (6.3 i 6.4), co daje im trzecie potwierdzenie z rzędu.

#### Bramka pliku cytatów modułu 6 — ZROBIONA (2026-08-23), zero braków pokrycia

Trzy weryfikatory na Opusie równolegle: pokrycie 6.1+6.2, pokrycie 6.3+6.4
oraz zaległy czwarty przebieg bramki prozy 6.3. Plik przenumerowany wzorcem
z modułu 5 (`L6.x` → `D7-6.x`, tabela przelicznika, ostrzeżenia przy sekcjach
lekcji wyciętych `D7-6.3` i `D7-6.5`); `cytaty-zgodne` zielony na **195
fragmentach**.

**Pokrycie: 0 braków w czterech lekcjach** (6.1 21/21, 6.2 45/45, 6.3 33/33,
6.4 13/13). To odwrotnie niż w module 5, gdzie ta sama bramka dała 15 usterek
istotnych. **Powód jest w danych, nie w jakości prozy:** sekcje `D7-6.4`
i `D7-6.6` są praktycznie pełnym transkryptem swoich plików źródłowych — poza
plikiem cytatów zostały z nich DWA zdania, oba czysto odsyłaczowe. Moduł 5
cytował wybiórczo i stąd dziury. **Wniosek na kolejne moduły: ryzyko braku
pokrycia zależy od tego, jak wybiórczo powstawał plik cytatów w czasach
scenariuszy D7, a nie od tego, jak napisano prozę.** Warto to sprawdzić
najpierw — jeden `wc` na sekcji kontra `wc` na oryginale mówi, czego się
spodziewać.

##### Wierność cytatów: 12 rozjazdów, z tego 8 prawdziwych

Osiem to **ciche skróty** — cytat urywał punkt listy albo przeskakiwał blok
kodu bez `[…]`. Poprawione znakiem pominięcia; w jednym miejscu podmieniony
apostrof (`'` zamiast źródłowego `’`). Cztery pozostałe były szumem
normalizacji i dały narzędziu **trzy reguły SYMETRYCZNE** (stosowane tak samo
do oryginału i cytatu, więc niezdolne zamaskować różnicy w treści): znaczniki
HTML wariantów platformowych (`<span class="platform-mac">`), atrybut `copy`
we wskaźniku bloku kodu (```` ```text copy ````), odstęp zostawiony po
usuniętym octiconie (`select **Set up** <svg…/>, then click`).

**PUŁAPKA, która kosztowała jeden przebieg:** pierwsza wersja reguły HTML
(`<[^>]+>`) zjadała znak `<` w komendach powłoki (`pbcopy < plik`), łącząc go
w parę ze znacznikiem `>` cytatu blokowego z NASTĘPNEGO wiersza. Rozjazd
powstawał wyłącznie po stronie cytatu, więc wyglądał na usterkę treści.
Reguła musi stać ZA zdejmowaniem `>` i wymagać litery po `<`.

##### LUKA W SAMYM NARZĘDZIU, znaleziona testem negatywnym

`cytaty-zgodne` nie sprawdzał **bloków kodu stojących bez `> `** — widział
tylko cytaty blokowe. Podmiana `ubuntu-latest` → `ubuntu-newest` w czterech
miejscach modułu 5 przechodziła na zielono. Moduł 6 nie ma takich bloków
(sprawdzone: 0), więc jego bramki to nie dotyczyło, ale moduł 5 miał ich
sześć. Wszystkie sześć okazało się dosłowne, więc domknięcie luki było darmowe
— moduł 5 sprawdza teraz **121 fragmentów zamiast 115**.

**Pierwszy przebieg tego testu był ŚLEPY** (`sed` nie trafił wzorca, kod 0 nic
nie znaczył). To trzeci raz w tym repo, gdy brak trafienia udaje dowód.
Powtórzony na realnym wierszu — dopiero wtedy pokazał lukę.

##### Czwarty przebieg bramki prozy 6.3 — 4 usterki istotne, 6 drobnych

Najgroźniejsza to **nawrót naprawy, która nie objęła sekcji pomocniczych**:
sekcja 3 mówiła poprawnie, że alerty Dependabota włącza się przez ustawienia
KONTA, a ćwiczenie kazało kliknąć je w ekranie repozytorium, gdzie postawiły
czytelnika kroki 1–2. Ta sama mechanika co „naprawa terminu musi objąć nagłówki
punktów" z modułu 5. **Reguła: po naprawie prozy przejść ćwiczenie, „Zapamiętaj",
„Czego się nauczysz", gotowce i tabelę zgodności — naprawa sekcji merytorycznej
nie jest naprawą lekcji.**

Druga istotna pokazała, że **kierunki „lekcja → tabela" i „tabela → lekcja"
potrafią wskazać tę samą dziurę z dwóch stron**: „Czego się nauczysz"
obiecywało różnicę między aktualizacjami bezpieczeństwa a wersji, lekcja jej
nie stawiała, a wiersz tabeli ją opisywał. Jedno dopisane zdanie ze źródła
zamknęło oba kierunki.

Pozostałe dwie istotne to teza bez pokrycia w dopisku „żeby repozytorium było
bezpieczne" oraz **reguła 9 w kierunku wzmacniającym** w sekcjach skrótowych
(„nie trzeba" zamiast źródłowego „możesz nie potrzebować") — mimo że proza
miała to już poprawione.

**Objętość: reguła 5 briefu potwierdzona trzeci raz z rzędu.** Naprawy
wypchnęły 6.3 z 11 942 na **12 560**; margines odzyskany cięciem prozy
redakcyjnej (nie treści ze źródła) do **11 945**.

##### Dowody na koniec modułu 6

Strażnicy 25/25, `cytaty-zgodne` 195/195 (moduł 6) i 121/121 (moduł 5), mosty
26 / 26 / 14 przy progu 40, objętości 11 760 / 11 963 / 11 945 / 12 497
(6.4 ma widełki 8 000–13 000, bo zamyka kurs), zero znaków `”`.

##### Dwie rzeczy do zrobienia PRZY ZRZUTACH (nie teraz)

Weryfikator 6.1/6.2 zauważył, że dwie podpowiedzi zrzutów odwołują się do
napisów, których w migawce dokumentacji nie ma: `Enter this text code instead`
(6.1) i `randomart image` (6.2). `grep` po całym `d7/github/` nie znajduje ani
jednego. To nie są tezy prozy — ale kto będzie robił zrzuty, musi te napisy
sprawdzić w ŻYWYM interfejsie, nie w pliku cytatów.

##### NASTĘPNY KROK czatu B

**Terytorium czatu B jest oddane w całości poza lekcją 4.1** — 14 lekcji,
166 688 znaków, wszystkie bramki zamknięte. Zostaje:

1. **Lekcja 4.1** — czeka na zdanie zamykające moduł 3 od czatu A.
2. **Wgranie treści do bazy** — czeka na czat A podwójnie: cięty program ORAZ
   przenumerowanie pozycji lekcji na ciągłe `0…N-1`.
3. **Punkty kontroli U1–U4 zostają OTWARTE.** Bramka modułu 6 objęła 6.2 i 6.3;
   bez bramki prozy są nadal 6.1, 6.4 oraz 4.2, 4.3, 4.5, 4.6, 5.1 i 5.2.
   U3 i U4 wyszły w trzecim module z rzędu.
4. **`POSTEP.md` — ZROBIONE** (wpis obejmuje moduły 4, 5 i 6; nieaktualny
   wiersz „Kurs 2 (7 modułów) | 50 | — | ⬜ przed startem" zastąpiony wierszami
   modułów, z jawnym wskazaniem, że moduły 1–3 to terytorium czatu A).

#### DECYZJA WŁAŚCICIELA (2026-08-23): zrzuty dopiero po OBU kursach, na czacie A

Zapytany przy domykaniu modułów 4–6, właściciel rozstrzygnął: **teraz nie
robimy nic ze zrzutami** — ani samych zrzutów, ani audytu podpisów. **Przelot
zrzutów odbędzie się NA KOŃCU WSZYSTKICH KURSÓW, na czacie A, gdy skończy
swoją pracę.** To potwierdza i doprecyzowuje decyzję z 2026-08-19 (zrzuty
osobnym przelotem na końcu, bo starzeją się najszybciej): dochodzi wskazanie
CZATU i warunku startu — komplet prozy obu kursów.

**Stan do przekazania temu przelotowi:**
- miejsc `<!-- ZRZUT: … -->` w terytorium czatu B: **42** (moduł 4 — 16,
  moduł 5 — 12, moduł 6 — 14). `straznik-prozy` liczy je dla całej gałęzi
  („miejsc na zrzuty do przelotu końcowego"), więc licznik jest pod ręką;
- **prawdziwych zrzutów nie da się zrobić bez realnego repozytorium
  `stargazers-log`** z issues, pull requestami, przebiegami Actions, włączonym
  2FA, kluczem SSH i włączonymi funkcjami bezpieczeństwa — przelot końcowy
  musi to uwzględnić w budżecie;
- **dwa podpisy są już podejrzane** (znalazł weryfikator bramki 6.1/6.2):
  `Enter this text code instead` w 6.1 i `randomart image` w 6.2 — `grep` po
  całym `d7/github/` nie znajduje ani jednego. Nie są tezami prozy, ale przy
  robieniu zrzutu trzeba je sprawdzić w ŻYWYM interfejsie, nie w migawce
  dokumentacji. **Klasa do sprawdzenia hurtem przy tamtym przelocie: podpis
  zrzutu nazywa napis, którego dokumentacja nie zna.**

#### PUNKTY KONTROLI U1–U4, fala 1 (2026-08-23): moduł 4, lekcje 4.2, 4.3, 4.5, 4.6

Cztery weryfikatory na Opusie, po jednym na lekcję, każdy z U1–U4 jako CZTEREMA
osobnymi pytaniami. Wynik: **16 usterek istotnych i 38 drobnych, wszystkie
naprawione** (commit `d9cd4dd`).

**Główny wniosek: założenie, że te klasy wyczerpały się w module 5, było
błędne — wszystkie cztery wystąpiły w KAŻDEJ z czterech lekcji.** Bramka
wyrywkowa nie zastępuje przejścia po lekcjach, których nikt nie sprawdzał.

**U3 pozostaje najgroźniejsza i wychodzi w czwartym module z rzędu.** Dwa
przypadki warte zapamiętania:
- 4.2 miała w `## Gdy coś nie działa` pozycję **w całości wymyśloną przy
  biurku** — „Przycisk Submit new issue jest nieaktywny. Upewnij się, że pole
  Title nie jest puste". Dokumentacja nie mówi ani o nieaktywnym przycisku,
  ani o tym, że tytuł jest polem wymaganym; pozycja nie miała też wiersza
  w tabeli zgodności, więc **przeszła obok wszystkich dotychczasowych kontroli**;
- 4.6 tłumaczyła szary przycisk „Resolve conflicts" przyczyną, której źródło
  nie podaje („konflikt za trudny na edytor"), i **kategorycznie wykluczała
  brak uprawnień** — a to realna przyczyna przy pull requeście z cudzego forka.
  Źródło podaje wyłącznie wyjście, nie przyczynę.

**U4 w 4.2 — obietnica kontrolki, której czytelnik nie zobaczy.** Sekcja 3
poprawnie umieszcza typy issue na poziomie organizacji, a sekcja 6 kazała
ustawić typ w `stargazers-log` — prywatnym repozytorium na koncie osobistym.

**NOWA ODMIANA U1: „must" ROZCIĄGNIĘTE NA SĄSIEDNI PRZYPADEK.** 4.6 przeniosła
źródłowe „If the head branch is protected, you **must** create a new branch" na
gałąź domyślną, dla której źródło wprost dopuszcza aktualizację head. Z rady
zrobiła się twarda reguła — w checkliście z nagłówkiem „każda pozycja wprost ze
źródła". **Do sprawdzania osobno: czy imperatyw źródła nie objął przypadku
sąsiedniego.**

**Wzorzec, który powtórzył się w dwóch lekcjach: ZAMYKANIE LISTY OTWARTEJ
W ŹRÓDLE.** „dokładnie dwa przypadki" z „Merge conflicts **often happen**"
(4.6) oraz „pięć części, z których składa się **każdy** pull request" (4.3) —
przy czym drugie źródło tej samej lekcji wylicza jeszcze zakładkę **Findings**,
której lekcja nie zna, a ćwiczenie kazało znaleźć „wszystkie pięć".

**Klasa specyficzna dla lekcji bez bloków `>`:** żadna z czterech lekcji nie
używa cytatu blokowego — przytoczenia stoją kursywą z atrybucją („Dokumentacja
mówi…"). Weryfikatorzy sprawdzali je jako 13–28 osobnych tez na lekcję.
**Wniosek: `cytaty-zgodne` tych lekcji nie obejmuje** (narzędzie czyta bloki `>`
i bloki kodu), więc jedyną kontrolą wierności jest tu czytanie przez człowieka
albo weryfikatora.

**PUŁAPKA, W KTÓRĄ WPADŁEM SAM:** poprawka zdania zamykającego 4.3 („jedna
reguła" → „twarde reguły", bo 4.4 mówi o dwóch warunkach) sprawiła, że
domknięcie zaczęło dzielić **46 znaków** z pierwszym akapitem 4.4 przy progu 40
— `most-lekcji` zaświecił „MOST PRZEPISANY". Przeredagowane na „na których
wykłada się większość pierwszych prób", brief zsynchronizowany co do znaku.
**Reguła: zmiana zdania mostowego wymaga ponownego pomiaru mostu, nawet gdy
zmiana jest merytoryczna, a nie stylistyczna.**

**Objętość — reguła 5 czwarty raz z rzędu.** Naprawy wypchnęły CZTERY lekcje
ponad sufit naraz (12 427 / 12 512 / 12 529 / 12 600). Margines odzyskany
cięciem prozy redakcyjnej: ram przed cytatami („Zdanie warte zapamiętania
dosłownie, bo… Cytuję:" → „Cytuję:"), parafraz cytatu stojącego bezpośrednio
obok i dopowiedzeń skutku. Wynik: 11 787 / 11 785 / 11 791 / 11 885.
**Trymowanie zlecone osobnemu subagentowi z jawną listą tego, czego NIE wolno
ruszać** (cytaty, warunki, modalności, świeże naprawy, pierwszy akapit,
`## Co dalej`, komentarze `ZRZUT`) — sprawdziło się i przy okazji złapało moje
własne zdanie z błędem składniowym, wprowadzone przy naprawie U3 w 4.6.

##### Stan punktów kontroli po fali 1

| # | Objęte bramką | Zostaje do sprawdzenia |
|---|---|---|
| U1 | 4.2, 4.3, 4.5, 4.6 + 4.4, 4.7, 5.3, 5.4, 6.2, 6.3 | **5.1, 5.2, 6.1, 6.4** |
| U2 | j.w. | j.w. |
| U3 | j.w. | j.w. |
| U4 | j.w. | j.w. |

**FALA 2 — NASTĘPNY KROK czatu B: lekcje 5.1, 5.2, 6.1 i 6.4**, tym samym
przepisem (jeden weryfikator na lekcję, Opus, U1–U4 jako cztery osobne
pytania, zakaz edycji plików, polecenie sprawdzenia legalnych odwołań wstecz).
Po niej punkty kontroli **zamykają się dla całego terytorium czatu B** —
14 lekcji modułów 4–6. Budżet: fala 1 kosztowała ~380 tys. tokenów subagentów
plus ~130 tys. na trymowanie; fala 2 będzie tańsza (cztery lekcje zamiast
czterech dłuższych, moduły 5 i 6 mają krótsze źródła).

### ⬛ WARUNEK STARTU PRZELOTU ZRZUTÓW SPEŁNIONY (2026-08-23, czat A)

Właściciel potwierdził, że **czat B też skończył**, więc proza OBU kursów jest
kompletna i **zaczyna się przelot zrzutów — na czacie A**, zgodnie z decyzją
zapisaną przez czat B w sekcji „DECYZJA WŁAŚCICIELA (2026-08-23): zrzuty
dopiero po OBU kursach, na czacie A".

**Kolejność dalszych prac — decyzja właściciela 2026-08-23:**
przelot zrzutów → **ocena wizualna właściciela** (chce dostać linki do obu
kursów i przejrzeć je własnymi oczami) → **audyt końcowy obu kursów**
(`tresc-kursow/AUDYT-KONCOWY.md`) → zaplanowana zmiana dotycząca Pluginu 1.
**Do audytu ani do innych zadań NIE przechodzimy przed oceną właściciela.**

**Zmierzone 2026-08-23 (nie przepisywać z pamięci, przeliczyć przed pracą):**

| Gdzie | Miejsc `<!-- ZRZUT: … -->` |
|---|---|
| Kurs 1 (Claude), moduły 1–6 | **73** (12, 10, 22, 13, 9, 7) |
| Kurs 2, moduły 1–3 (czat A) | **55** (21, 18, 16) |
| Kurs 2, moduły 4–6 (czat B) | **42** (16, 12, 14) |
| **Razem** | **170** |

> **KOREKTA (2026-08-23, po starcie przelotu):** miejsc jest **173**, nie
> 170 — dopisana lekcja 4.1 wniosła trzy. **Liczby wyżej są historyczne;
> stan liczy `node tools/zrzuty/manifest.mjs` wprost z prozy** i nie da
> się go rozjechać z rzeczywistością. Drugą korektą jest podział pracy:
> bez zalogowanej przeglądarki da się zrobić **72** miejsca, a **68**
> wymaga sesji właściciela (pierwsze oszacowanie 96/44 brało ekrany
> ustawień GitHuba za publiczne).

`straznik-prozy` liczy je dla całej gałęzi („miejsc na zrzuty do przelotu
końcowego") — na gałęzi czatu A pokazuje 128, bo nie widzi modułów 4–6.

**517 miejsc `[EKRAN]` to CO INNEGO** — siedzą w scenariuszach D7
(`lekcja-*.md`), nie w prozie, i nie są przedmiotem tego przelotu.

**Trzy rzeczy, które zablokują przelot, jeśli się ich nie rozstrzygnie
NAJPIERW** (dwie pierwsze zapisał czat B, trzecia wychodzi z pomiaru):
1. **Nie ma czego fotografować bez realnego repozytorium `stargazers-log`**
   z issues, pull requestami, przebiegami Actions, włączonym 2FA, kluczem SSH
   i włączonymi funkcjami bezpieczeństwa. Kurs 1 potrzebuje analogicznie
   realnych ekranów Claude'a (claude.ai, konsola, Claude Code).
2. **Dwa podpisy nazywają napisy, których dokumentacja nie zna** — 6.1
   `Enter this text code instead` i 6.2 `randomart image`; `grep` po całym
   `d7/github/` nie znajduje ani jednego. Do sprawdzenia w ŻYWYM interfejsie.
   **Klasa do sprawdzenia hurtem: podpis zrzutu nazywa napis, którego
   dokumentacja nie zna.**
3. **Gdzie właściciel ma to obejrzeć.** Treść lekcji nie jest publiczna
   (decyzja o produkcie), więc jedyny widok prozy to panel kreatora
   `/szkolenia/kreator/lekcja/[id]` za ciastkiem tokenu; `/szkolenia`
   i `/szkolenia/<slug>` pokazują katalog i strony sprzedażowe, a podgląd
   statyczny na GitHub Pages nie niesie treści lekcji.

**Stan bazy w chwili tej decyzji** (odczyt 2026-08-23): Kurs 2 ma 32 lekcje,
**17 z treścią** (moduły 1–3, 184 828 znaków). **Moduły 4–6 NIE SĄ WGRANE** —
blokują je dziury w `position` opisane w sekcji „⚠️ DZIURY W POZYCJACH LEKCJI
W BAZIE"; pozycje w bazie to 4: `0,1,3,4,5,7,8`, 5: `0,1,2,5`, 6: `0,1,3,5`,
a czat B nazwał pliki ciągle (`proza-1…N`). To ta sama sprawa co „⚠️ CZATY
ROZJECHAŁY SIĘ NA TEJ DECYZJI" — **rozstrzygnięcie należy do właściciela
i musi paść przed scaleniem gałęzi.**

**Otwarte po stronie czatu B, do niezgubienia:** fala 2 punktów kontroli
U1–U4 dla lekcji **5.1, 5.2, 6.1 i 6.4** (tabela stanu w sekcji „PUNKTY
KONTROLI U1–U4, fala 1"). Fala 1 dała 16 usterek istotnych i 38 drobnych
w czterech lekcjach modułu 4 — wniosek czatu B brzmiał: **bramka wyrywkowa
nie zastępuje przejścia po lekcjach, których nikt nie sprawdzał.**

### PRZELOT ZRZUTÓW — DECYZJE WŁAŚCICIELA NA STARCIE (2026-08-23, czat A)

Cztery blokady rozstrzygnięte PRZED pierwszym zrzutem (pytania i odpowiedzi
w rozmowie czatu A):

1. **Ekrany GitHuba: konto właściciela (krzysiek2115op) + realne repo
   `stargazers-log`** zbudowane przez `gh` (issues, PR-y, Actions, release,
   ochrona gałęzi). **ZAKRES ZMIAN (doprecyzowanie właściciela 2026-08-23):
   wolno zmieniać WYŁĄCZNIE repozytorium `stargazers-log`. Ustawień konta
   — 2FA, klucze SSH — NIE włączamy;** te ekrany robimy jako podgląd
   formularzy przy partii po zalogowaniu. Ekrany za logowaniem: właściciel loguje się w sterowanym
   oknie Firefoksa, agent jedzie automatem po liście zrzutów.
   **REGUŁA PRYWATNOŚCI (wiążąca dla każdego zrzutu):** tam, gdzie w kadrze
   wystąpiłyby dane właściciela (lista jego repozytoriów, e-maile, itp.),
   zrzut jest PRZEGENEROWANY tak, żeby ich nie było — kadrowanie, a gdy
   lista/dana jest tematem zrzutu: podmiana w DOM-ie na przykładowe wartości
   PRZED zrobieniem zrzutu (chrom interfejsu pozostaje prawdziwy, dane są
   przykładowe). Nazwa użytkownika w kadrach neutralizowana tą samą drogą.
2. **Ekrany Claude: użyczenie sesji + Workbench** — rozmowy claude.ai
   prowadzone realnie wg promptów z lekcji, odpowiedzi API pokazywane
   w Workbenchu (bez osobnego klucza). Claude Code (TUI) i dokumentację
   agent robi sam.
3. **Przegląd właściciela: lokalny podgląd renderowany W STYLU STRONY**
   (kursy mają pasować wizualnie do strony sprzedażowej), serwowany tylko
   na localhost; do tego link do kreatora. **DECYZJA NA KONIEC PROJEKTU:
   oba kursy shostowane jako HTML przez GitHub Pages, linki-podglądy
   w README repo** — jak podgląd `/szkolenia` (szkolenia-podglad).
   Zapisana z uwagą zgłoszoną właścicielowi: to publikuje pełną treść
   płatnego kursu; właściciel zdecydował świadomie (cel: oddanie repo
   do oceny).
4. **Synteza numeracji ZATWIERDZONA i WYKONANA:** scalenie
   `feat/tresc-k2-modul-4-6` → gałąź czatu A (commit 63c4ed0, unia obu
   stron zweryfikowana nagłówek po nagłówku), 8 plików czatu B
   przemianowanych na numery z dziurami (m4: 4→ , 5, 6, 8, 9; m5: 6;
   m6: 4, 6) + 8 linii frontmatteru, strażnik czatu B (dopasowanie po
   TYTULE) obowiązuje. **Moduły 4–6 WGRANE do bazy** (`--sprawdz`
   przed każdym): Kurs 2 ma w bazie 31 z 32 lekcji, 351 276 znaków.
   Jedyna pusta: **4.1** (proza nie istniała — czat B czekał na most;
   most jest, proza 4.1 powstaje w tym przelocie pipeline'em
   z kalibracji).

**Konwersja numeracji dla fali 2 punktów kontroli** (lista czatu B była
w jego numeracji CIĄGŁEJ): „5.1, 5.2, 6.1, 6.4" znaczy w numeracji
programu **5.1, 5.2, 6.1, 6.6** — bramkę cytatów w module 6 przeszły
6.2 (klucze SSH) i 6.4 (zabezpiecz repo, u czatu B „6.3"), niesprawdzone
jest 6.6 (secret scanning, u czatu B „6.4").

**Blokada 2 po weryfikacji:** podpis 6.2 „randomart image" POTWIERDZONY
(`ssh-keygen` drukuje `The key's randomart image is:` — zrzut terminala,
bez GitHuba). Podpis 6.1 „Enter this text code instead" — brak i w migawce,
i w ŻYWEJ dokumentacji (ta mówi „setup key"); brzmienie ustali żywy ekran
2FA przy zrzucie. Klasa „podpis nazywa napis spoza dokumentacji" jest
w tym trybie sprawdzana z natury procesu: każdy zrzut powstaje z żywego
ekranu, więc podpis niezgodny z ekranem nie może przejść — rozjazdy
poprawiamy w podpisie I w prozie od razu.

**Gdzie żyją pliki zrzutów:** `tresc-kursow/<slug>/modul-N/zrzuty/*.webp`
— świadomie POZA `public/`, bo `public/` wchodzi w całości do eksportu
statycznego podglądu i lekcyjne zrzuty by wyciekły (ta sama klasa co
BLAD-007). W Markdownie lekcji: `![opis](zrzuty/plik.webp)` —
ścieżka względna od pliku lekcji (tak żąda `straznik-linkow`); import do WP przepisze ją jedną
regułą na adresy biblioteki mediów.

---

## Przelot zrzutów — CZAT B (Kurs 1) — stan na 2026-08-23

Worktree `/home/krzysiek/Pod-strona-Szkolenia-zrzuty-k1`, gałąź `feat/zrzuty-k1`.

**Gałąź odbita od `9b4abb2` (czubek gałęzi czatu A), a nie od
`plugin-1-sklep-kursow` — świadome odstępstwo od promptu startowego.** Powód:
rig przelotu (`tools/zrzuty/*`), brief i **10 gotowych zrzutów Kursu 1**
(moduły 1, 2, 5) leżą wyłącznie na gałęzi czatu A. Odbicie od gałęzi modułu
dałoby worktree bez rigu, a manifest policzyłby tamte 10 jako do zrobienia →
powtórzona praca i konflikt w prozie Kursu 1.

### Ile zrobione

Stan liczy `node tools/zrzuty/manifest.mjs --kurs K1` (36 do zrobienia teraz,
27 po zalogowaniu). **Wpiętych w prozę: 0** — zrzuty czekają na kadrowanie
i weryfikację wzrokową, więc licznik jeszcze się nie ruszył.

Materiał nagrany i sprawdzony stykówką (surowe strumienie w scratchpadzie
sesji, odtwarzalne komendą — patrz niżej): **ekrany gotowe do kadrowania**
dla `/config`, `/status`, `/permissions`, `/memory`, `/context`,
`/context all`, panelu pomocy `?`, `/mcp`, `/plugin` (zakładka Discover),
`/sandbox`, paska stanu po `Shift+Tab` oraz ekranu startowego sesji.

### Co blokuje resztę

1. **Konto jest na 98 % limitu sesji** (pasek Claude Code: „You've used 98 %
   of your session limit · resets 3:30am Europe/Warsaw"). Zrzuty wymagające
   ODPOWIEDZI MODELU — sekwencja wywołań narzędzi, wynik testów jako dowód,
   podgląd zmiany z pytaniem o zgodę, transkrypt `Ctrl+O`, panel subagentów,
   `/summarize-changes`, `/rewind` — czekają na odnowienie limitu.
   **To ten sam limit, z którego korzysta czat pracujący nad zrzutami**, więc
   nagrywanie ich teraz konkuruje z własną sesją.
2. Trzy podpisy wymagają decyzji, bo opisują montaż albo nieistniejące menu —
   znaleziska **B1–B3** w `tresc-kursow/ZNALEZISKA-PRZELOTU-ZRZUTOW.md`.

### Następny krok (po odnowieniu limitu)

1. `bash tools/zrzuty/buduj-projekt-demo.sh` — projekt demonstracyjny żyje
   w `/tmp` i nie przeżywa restartu maszyny.
2. `(cd "$ZRZUTY_RIG" && npm i puppeteer-core sharp @xterm/xterm)`.
3. Powtórzyć `tools/zrzuty/scenariusze/k1/panele-lokalne.txt` **z poprawką:
   pole wpisywania czyszczą DWA Esc, nie jeden** (przez to markery
   `menu-komend`, `menu-skille` i `sciezki` są zanieczyszczone sklejonym
   tekstem `/co/sum@/hooks`).
4. Dokadrować (`przytnijOd`/`przytnijDo` w spec.json), wpiąć `wepnij.mjs`,
   sprawdzić stykówką, commit po każdym domkniętym module.
5. Dopiero potem scenariusze wymagające modelu.

### Sweep repo przed `/clear` — czat B, 2026-08-23

**Premisa „36/36 zrzutów gotowych" NIE była spełniona** — `manifest.mjs --kurs K1`
podaje 36 miejsc do zrobienia i **0 wpiętych**. Gałąź „zweryfikuj kompletność
zrzutów" nie miała więc czego weryfikować; sweep objął to, co istnieje: repo,
rig i podpisy będące specyfikacją przyszłych zrzutów.

**Znaleziono 6, naprawiono 6, kolizji i regresji 0.**

| # | Co | Klasa | Naprawa |
|---|---|---|---|
| 1 | Podpisy w 3.1 i 3.7 obiecywały „**menu** trybów uprawnień po `Shift+Tab`" | podpis kontra żywy ekran | `Shift+Tab` przełącza tryb cyklicznie i zmienia pasek stanu — żadne menu nie wstaje; podpisy mówią teraz o pasku stanu |
| 2 | Podpis w 3.2 obiecywał przeglądarkę **i terminal obok** | podpis opisujący montaż (zakaz z zasady 1 briefu) | podpis nazywa jeden ekran: terminal w trakcie logowania |
| 3 | Podpis w 4.7 obiecywał **dwa terminale obok siebie** | jw. | podpis nazywa jedną sesję we własnym worktree |
| 4 | `wepnij.mjs` **padał** na wyjściu `manifest.mjs --json` (`obraz_plan` kontra `obraz`) | ukryty defekt wspólnego rigu — trafiłby OBA czaty przy wpinaniu | przyjmuje `obraz_plan ?? obraz`, a przy braku planu mówi „czeka", zamiast rzucać `ERR_INVALID_ARG_TYPE` |
| 5 | Scenariusz `panele-lokalne.txt` czyścił pole **jednym** Esc | scenariusz nieodtwarzalny | dwa Esc (tak mówi sam panel pomocy); bez tego komendy sklejały się w `/co/sum@/hooks` i szły do modelu jako zapytanie |
| 6 | Świeży worktree bez `.env` **po cichu pomija 37 testów bazy** i kończy się zielono | zielony przebieg, który niczego nie dowodzi (klasa z 0.24.0) | `.env` skopiowany lokalnie (jest w `.gitignore`); bez niego `npm test` daje 38/75 „pass" i kod 0 |

**Kontrola kolizji przed poprawkami:** gałąź czatu A poszła od mojej bazy
o 4 commity, ale **żaden nie dotyka moich 5 plików** (`git log --all 9b4abb2.. -- <plik>`
= 0 dla każdego). Czat A zmienił za to `manifest.mjs` (nowa reguła kubła
`github-logged`, funkcja `slug()`), więc poprawione podpisy sprawdziłem
**dwoma zestawami reguł** — moim i ich: w obu podział wychodzi identycznie
(36 teraz / 27 po zalogowaniu, `tui` 33). Zmiana podpisu **przed** zrobieniem
zrzutu jest przy tym właściwą kolejnością: `slug()` wyprowadza nazwę pliku
z podpisu, więc poprawka po zrzucie wymusiłaby przemianowanie.

**Walidacja po poprawkach:** strażnicy **25/25**, testy **75/75** (kod wyjścia 0,
bez potoku), `wepnij.mjs` sprawdzony testem negatywnym (wyjście manifestu —
nie pada, zgłasza 63 czekające) i pozytywnym (plan z `obraz_plan` + istniejący
plik — wpina i podmienia znacznik na `![…](…)`).

**Ponowny sweep:** `git status` czysty, licznik zrzutów bez zmian po poprawkach,
cudze worktree (`k2-A`, `k2-B`, główny) i klon strony głównej bez ani jednej
zmiany.

**Do scalenia — znane, nie defekt:** oba czaty dopisywały własne sekcje na
KOŃCU `PRZELOT-ZRZUTOW.md`, `ZNALEZISKA-PRZELOTU-ZRZUTOW.md` i tego pliku,
więc git pokaże konflikt tekstowy w ogonie. Treściowo to unia — rozwiązać
zostawiając obie sekcje.

## Przelot zrzutów — CZAT B, druga partia (2026-08-23)

**Stan: `manifest.mjs --kurs K1` daje 30 zrobionych i 16 do zrobienia teraz**
(tui 14, docs 1, arkusz 1) plus 27 po zalogowaniu. Wpiąłem **20 paneli
lokalnych** Claude Code 2.1.241, nagranych jedną sesją w projekcie
demonstracyjnym (`/tmp/oliwia/projekt-demo`), scenariusz
`tools/zrzuty/scenariusze/k1/panele-lokalne.txt`.

### Trzy defekty WSPÓLNEGO RIGU — naprawione, każdy z testem

Wszystkie trzy dawały wynik **zielony i nieprawdziwy**, więc trafiłyby też
czat A, gdyby sięgnął po te narzędzia.

1. **`sesja-tui.sh` przesuwał wszystkie znaczniki.** `script -q` **mimo `-q`
   pisze nagłówek** („Skrypt uruchomiony…", u nas 165 B), a sprzątający go
   `sed -i` na końcu **przesuwał cały strumień w lewo** — zapisane wcześniej
   przesunięcia wskazywały o tyle bajtów za daleko i **każdy ekran był o krok
   późniejszy** (kadr „pusta sesja" miał już wpisaną komendę, panele wychodziły
   rozdarte w połowie przerysowania). Teraz nagłówek jest mierzony przed
   usunięciem i odejmowany od znaczników. Test: prefiks znacznika „pole puste"
   ma 0 wystąpień komendy, znacznik „komenda wpisana" — 2.
2. **`tui.mjs` nie kadrował.** `przytnijOd/przytnijDo` chowały wiersze przez
   `display:none`, ale wysokość obrazu bierze się z elementu `.xterm`, który
   xterm.js wylicza z LICZBY WIERSZY — kadr znikał po cichu, a wszystkie zrzuty
   wychodziły pełnowymiarowe (1600×1420, co do piksela tyle samo — to był
   właśnie sygnał). Teraz kadrujemy przycięciem kontenera i przesunięciem taśmy
   wierszy, a kadr obejmujący zero wierszy **kończy się kodem 5**. Test
   pozytywny: 4 wiersze → 227 px wobec 1420 px pełnego ekranu; negatywny:
   `przytnijOd: 90` na 40-wierszowym ekranie wywala narzędzie.
3. **Czyszczenie pola wpisywania było nieodtwarzalne.** Poprzednia poprawka
   („dwa Esc, nie jeden") była niepełna: **liczy się double-TAP**, a dwa wiersze
   `KLAWISZ esc` dzieli 0,6 s i para się nie składa. Doszły dwa polecenia
   scenariusza: `WYCZYSC` (oba Esc jednym zapisem) i **`KASUJ <n>`** (n
   backspace'ów) — i to `KASUJ` jest domyślne, bo `WYCZYSC` zachowuje się
   różnie zależnie od tego, co wisi nad polem.

### Reguły obsługi TUI wyprowadzone pomiarem (nie zmieniać na oko)

- **Panel z polem wyszukiwania** (`/config`, `/status`, `/permissions`,
  `/plugin`) **nie zamyka się jednym Esc** — pierwszy czyści wyszukiwanie
  („Esc to clear" w stopce). Po panelach stoją **TRZY** `KLAWISZ esc`.
- **`WYCZYSC` na PUSTYM polu otwiera menu cofania** (Rewind) i połyka
  wszystko, co wpiszemy dalej. Wołamy je raz, świadomie — właśnie po ten ekran.
- **Menu podpowiedzi połyka pierwszy Esc**, więc po `/co`, `/sum`, `@`
  sprzątamy `KLAWISZ esc` + `KASUJ <n>`.

### INCYDENT: sesja nagraniowa zmieniła konfigurację właściciela

Scenariusz z jednym Esc po `/config` zostawił panel otwarty; kolejne `WPISZ`
poszło do **pola wyszukiwania panelu**, a `ENTER` **przełączył podświetlony
przełącznik** — w `~/.claude/settings.json` właściciela pojawiło się
`"autoCompactEnabled": false`. Wykryte przez porównanie dwóch zrzutów, które
wyszły identyczne (`z21` i `z22` pokazywały tę samą zakładkę Config), i
potwierdzone wpisem `⎿ Disabled auto-compact` w nagranym transkrypcie.
**Przywrócone na `true`** (wartość sprzed zmiany, widoczna na zrzucie `z21`,
i zarazem domyślna); `diff` potwierdza, że poza tym jednym kluczem plik jest
identyczny. Kopii zapasowej nie było — `~/.claude/settings.json` nie jest
w gicie i nie ma go w `~/.claude/backups/` (tam leżą tylko migawki
`.claude.json`).

**Zabezpieczenie:** `sesja-tui.sh` robi teraz **migawkę
`~/.claude/settings.json` przed nagraniem i przywraca ją po**, głośno pisząc,
że scenariusz nie domknął panelu. To rozszerzenie zasady 5 briefu („nic
w globalnej konfiguracji"), która dotąd pilnowała tylko `git config --global`.
Sprawdzone: suma kontrolna pliku przed i po kolejnym nagraniu jest ta sama.

### Następny krok

1. ~~Ekrany lokalne~~ **ZROBIONE — 32/73, zostaje 14 na teraz.** Doszły
   logowanie (K1 3.2) i sesja we własnym worktree (K1 4.7), scenariusze
   `logowanie.txt` i `sesja-w-worktree.txt`.
2. ~~Dwa spoza TUI~~ **ZAMKNIĘTE.** Strona „Prompting Claude Opus 5" (K1 2.3)
   wpięta. Arkusz porównania modeli (K1 1.3) **decyzją właściciela z 2026-08-23
   przestał być zrzutem** — w prozie stoi teraz prawdziwa tabela do wypełnienia
   własnymi pomiarami (znalezisko B8). Powód: nie ma lokalnie arkusza
   kalkulacyjnego, tabela w HTML udająca arkusz łamałaby zakaz rysowania
   interfejsów, a liczby byłyby zmyślone.
3. **Dwanaście wymagających odpowiedzi modelu — CAŁA POZOSTAŁA PRACA
   partii „teraz" (stan: 33 zrobione, 12 zostaje, 27 po zalogowaniu).
   Decyzja właściciela 2026-08-23: robić je w OSOBNEJ SESJI po odnowieniu
   limitu**, nie doklejać do sesji, która sama ten limit zjada. Nagranie musi
   pójść **za jednym razem**, bo jedna sesja daje kilkanaście ekranów —
   przerwanie w połowie oznacza powtórzenie całości. Lista: — sekwencja wywołań narzędzi,
   wynik testów jako dowód, podgląd zmiany ze zgodą, pytanie o zgodę na komendę
   powłoki z `Ctrl+E`, transkrypt `Ctrl+O`, panel subagentów, wiersz delegowania,
   `/summarize-changes`, `/rewind` z prawdziwymi promptami, ostrzeżenie
   o pominiętych plikach, lista czytanych plików oraz **pytanie o zgodę przy
   wejściu w worktree spoza `.claude/worktrees/`** (K1 4.7 — wymaga, żeby model
   sam wywołał `EnterWorktree`, więc nie jest ekranem lokalnym, jak zakładałem).
   Projekt demonstracyjny (`bash tools/zrzuty/buduj-projekt-demo.sh`) ma pod nie
   gotowe podkłady: dwa naprawdę padające testy, skill `/summarize-changes`,
   subagenta `code-improver`, 11 hooków i dwa serwery MCP.

### Dwa ustalenia z tej partii

- **Ekran logowania robimy na ŚWIEŻYM `HOME`** (`/tmp/oliwia-swieze`), nie
  komendą `/login` — ta wylogowałaby konto właściciela. Świeży `HOME` daje ten
  sam ekran onboardingu (motyw → sposób logowania → oczekiwanie na przeglądarkę),
  a przebieg zatrzymujemy przed wklejeniem kodu, więc żadne konto nie powstaje.
  Adres OAuth na zrzucie zostaje prawdziwy: nie ma w nim danych właściciela,
  a `code_challenge` i `state` to jednorazowe wartości porzuconego przebiegu.
- **Strażnik konfiguracji miał własną usterkę i sam ją pokazał.** `mktemp`
  tworzy plik ZAWSZE, więc gdy ustawień wcześniej nie było, „przywracanie"
  kopiowało PUSTĄ migawkę — czyli kasowało plik zamiast go chronić. Trafiło to
  na jednorazowy `HOME` (`settings.json` = 0 B), nie na konfigurację
  właściciela. Naprawione flagą `MIGAWKA_JEST`; sprawdzone ponownym przebiegiem:
  plik świeżego `HOME` ma po nim 22 B, nie zero.

## WERDYKT WŁAŚCICIELA o partii lokalnej czatu B (2026-08-23)

**Cztery ekrany są UNIEWAŻNIONE jako dowód i idą do ponownego wykonania.**
Powód nie jest taki, że obrazy są na pewno złe — powód jest taki, że **proces,
który je wyprodukował, dawał wyniki zielone i niewiarygodne**, a jedyną
weryfikacją było moje jednorazowe spojrzenie na stykówkę. Trzy usterki rigu
(przesunięte znaczniki, martwe kadrowanie, martwe `scrollDo`), zmiana globalnej
konfiguracji właściciela w trakcie nagrania i cztery podpisy wyprzedzające
ekran złożyły się na to, że **zieleń niczego nie dowodziła**. Konfigurację
przywrócono, obrazy przerenderowano z czystego nagrania — ale to nadal jest
„sprawdziłem wzrokiem", nie dowód.

Unieważnione są dokładnie te cztery, powiązane ze znaleziskami B4–B7:

| Ekran | Lekcja | Co podpis obiecuje — i co MUSI być na ekranie |
|---|---|---|
| `modul-3/zrzuty/z20-zakladka-allow-ekranie-permissions.webp` | K1 3.7 | pasek zakładek z podświetloną **Allow**, zdanie `Claude Code won't ask before using allowed tools.`, co najmniej jedna reguła `Bash(` |
| `modul-6/zrzuty/z07-zakladka-deny-ekranie-permissions.webp` | K1 6.6 | podświetlona **Deny**, zdanie `Claude Code will always reject requests to use denied tools.`, reguła `Bash(rm -rf:*)` |
| `modul-3/zrzuty/z12-ekran-cofania-wybraniu-wiadomosci.webp` | K1 3.4 | `Summarize from here` **i** `Summarize up to here` (dosłownie), obok `Restore conversation` |
| `modul-3/zrzuty/z13-wynik-komendy-context-all.webp` | K1 3.5 | `Memory files` **i** `CLAUDE.md` w tej samej sekcji |

Kolumna trzecia jest wyprowadzona **z podpisu, nie z obrazu** — właśnie po to,
żeby ponowne wykonanie sprawdzało obietnicę lekcji, a nie utrwalało to, co
akurat wyszło.

### Poprawka procesu — DO ZROBIENIA PRZED ponownym nagraniem

1. **`wymagaTekstu` w `tui.mjs` i `zrob-zrzut.mjs`.** Specyfikacja zrzutu
   dostaje listę fragmentów, które ekran musi zawierać; narzędzie sprawdza je
   na wyrenderowanym ekranie (w TUI — na buforze emulatora, w przeglądarce — na
   `innerText` kadrowanego obszaru) i przy braku **kończy się błędem zamiast
   zapisywać obraz**. Dzięki temu „zrzut powstał" znaczy „zrzut zawiera to, co
   obiecuje podpis". Każdą asercję sprawdzić testem negatywnym — celowo złym
   znacznikiem albo celowo złym fragmentem.
2. **Asercje wpisać do scenariuszy/specyfikacji w repo**, nie do sesyjnego
   scratchpada — inaczej po `/clear` znów nie ma czego powtórzyć.
3. **Ponownie nagrać i przerenderować cztery ekrany z tabeli wyżej**, już pod
   asercjami. Jeśli któryś nie przejdzie — poprawiamy **podpis i prozę**, nie
   asercję.
4. Dopiero potem wracać do 12 zrzutów wymagających odpowiedzi modelu.

**Reguła, która z tego zostaje na stałe** (weszła też do briefu, zasada 9):
zrzut bez maszynowej asercji treści **nie jest dowodem** i nie liczy się jako
zrobiony.

### Wykonanie poprawki procesu (2026-08-23, czat B)

Punkty 1–3 zrobione w tej kolejności, w jednej sesji.

**1. Bramka asercji.** `tools/zrzuty/asercje.mjs` (wspólny dla obu rigów) plus
wywołania w `tui.mjs` i `zrob-zrzut.mjs`. Specyfikacja bez `wymagaTekstu` kończy
się kodem **7** jeszcze przed uruchomieniem przeglądarki; ekran bez obiecanego
fragmentu — kodem **8** i **bez zapisu pliku**. Asercja liczona jest na tym, co
naprawdę weszło w kadr (w TUI: wiersze bufora z `przytnijOd/przytnijDo`,
w przeglądarce: węzły tekstowe przecinające `clip`/selektor) — inaczej
przechodziłaby dla napisów wyciętych z obrazu. Normalizacja skleja zdanie
pocięte ramką panelu i sprowadza typograficzne apostrofy do ASCII; fragment
`re:…` jest wzorcem (dla obietnic bez stałego brzmienia, np. znacznika czasu).

**Testy negatywne — 12 prób, `tools/zrzuty/test-asercji.mjs`** (pełna droga obu
narzędzi, nie sam moduł): fragment nieobecny, fragment **poza kadrem**, fragment
**z innej sekcji niż kadrowana**, fragment **poza `clip`**, wzorzec bez pokrycia,
brak `wymagaTekstu`, puste `wymagaTekstu` — każdy z parą pozytywną, żeby zieleń
nie znaczyła „narzędzie nie doszło do porównania". Do tego **test negatywny na
prawdziwym nagraniu**: ten sam strumień wyrenderowany do znacznika `cofanie`
zamiast `cofanie-opcje` **odmówił zapisu**, bo na tamtym ekranie nie ma jeszcze
opcji streszczania — dokładnie klasa „przesunięty znacznik" z werdyktu.

**2. Asercje w repo.** `tools/zrzuty/spec/k1/*.json` — podpis, scenariusz,
znacznik, kadr i lista asercji. `kolejka.mjs` renderuje cały katalog, `wepnij.mjs`
wpina po PODPISIE (nie po numerze wiersza — podpisy bywają poprawiane), a
`straznik-asercji` pilnuje, żeby żadna specyfikacja nie została bez asercji
(5 mutacji w audycie, wszystkie łapane; audyt: 84/84, 0 przeoczonych, 0 martwych).

**3. Cztery ekrany nagrane ponownie** scenariuszem
`tools/zrzuty/scenariusze/k1/cztery-pod-asercjami.txt` (sesja zaczyna się od
prawdziwego promptu, bo menu `/rewind` wymienia prompty sesji — bez żadnego nie
ma czego wybrać). Wszystkie cztery przeszły asercje wyprowadzone z podpisów.
Licznik: **33 zrobione, 12 do zrobienia teraz** (same ekrany wymagające
odpowiedzi modelu), 27 po zalogowaniu.

**Znalezisko przy okazji (B9):** `/permissions` **nie podświetla aktywnej
zakładki** — pasek „Permissions · Recently denied · Allow · Ask · Deny ·
Workspace" wygląda tak samo na każdej z nich (`/config` swoją aktywną zakładkę
podświetla, więc to nie artefakt rigu). Tym, co odróżnia zakładkę, jest zdanie
pod paskiem („Claude Code won't ask before using allowed tools." kontra
„…will always reject requests to use denied tools.") i lista reguł — i to one
są asercją. Podpisy w prozie niczego takiego nie obiecywały, więc proza została
bez zmian; zapis jest po to, żeby nikt nie dopisał „podświetlona" w przyszłości.

**Nazwa pliku ekranu K1 3.4** poszła za poprawionym podpisem:
`z12-ekran-rewind-wybraniu-wiadomosci.webp` (nie `…-cofania-…`, jak brzmiała
nazwa skasowanego pliku) — nazwa wywodzi się z podpisu, a podpis zmienił się
przy naprawie B6.

### Dwanaście ekranów wymagających modelu — ZROBIONE (2026-08-23, czat B)

Kurs 1 nie ma już ani jednego zrzutu do zrobienia bez logowania:
**45 zrobionych, 0 na teraz, 27 po zalogowaniu** (`manifest.mjs --kurs K1`).
Pięć sesji nagraniowych, wszystkie scenariusze w repo, wszystkie ekrany pod
asercjami z podpisów. Cały komplet odtwarza się jedną komendą
(`kolejka.mjs tools/zrzuty/spec/k1` — 16/16 OK przy kontrolnym przebiegu).

**Cztery rzeczy wyprowadzone POMIAREM, nie z dokumentacji** (każda kosztowała
nagranie, każda jest zapisana w nagłówku scenariusza, żeby nie kosztowała drugi
raz):

1. **Sesja startuje w trybie AUTO**, w którym pytania o zgodę nie powstają.
   Ekrany 3.2 i 3.7 wymagają zejścia `Shift+Tab` do trybu ręcznego.
2. **Reguła `ask` pyta w KAŻDYM trybie** — także w „accept edits". Dwie sesje
   poległy na tym, że scenariusz sprzątał pole podwójnym Esc, a ten ANULOWAŁ
   wiszące pytanie o zgodę; edycja nigdy nie powstawała, więc nie było czego
   przywracać. Scenariusz musi te pytania zatwierdzać Enterem.
3. **`ls -la` nie pyta o zgodę** (wbudowany zestaw odczytowy — mówi to sama
   proza 3.7), więc ekran „pytanie o komendę powłoki" wymusza dopiero komenda
   zapisująca. Przy okazji: wyjście `ls -la` wypisuje właściciela pliku, czyli
   NAZWĘ UŻYTKOWNIKA SYSTEMU — stąd bramka prywatności (niżej).
4. **Ostrzeżenie „Restored the code, but skipped N files" powstaje przy
   DOWIĄZANIU**, nie przy zmianie zrobionej komendą powłoki. Warunek wzięty
   z kodu Claude Code 2.1.241 (`skippedLinks`: „files NOT restored… because
   a symlink, hard link, or other non-regular file was detected at the tracked
   path"), a nie zgadnięty — dwie sesje na złej hipotezie skończyły się ekranem
   „The code will be unchanged" bez opcji przywrócenia kodu. Projekt
   demonstracyjny ma teraz plik wciągany dowiązaniem symbolicznym.

**Bramka prywatności (nowa).** Reguła 4 briefu mówi, że danych właściciela
w materiale nie ma i robi to rig automatycznie — a pilnowała tego wyłącznie
lista podmian, czyli to, co ktoś przewidział. Nagranie z `ls -la` pokazało
nazwę użytkownika w kolumnie właściciela pliku. Rig podmienia ją teraz
(z zachowaniem szerokości), a **kontrola patrzy na GOTOWY EKRAN** i odmawia
zapisu (kod 9), gdy niesie identyfikator właściciela; identyfikatory bierze
ze środowiska, więc działa na cudzej maszynie. Testy negatywne biorą przypadki,
których podmiana z definicji nie widzi: nazwę rozbitą sekwencją ustawiania
kursora i adres pocięty na dwa elementy DOM.

**Znaleziska:** B9 (`/permissions` nie podświetla aktywnej zakładki),
B10 (główny widok zwija wywołania narzędzi — sekwencja jest w transkrypcie
`Ctrl+O`), B11 (wiersz delegowania pokazuje opis ZADANIA, nie pole
`description` subagenta — przykład w prozie był spisany z dokumentacji zamiast
z ekranu). Proza 4.8 dostała przy okazji pełne brzmienie komunikatu: sam
ekran wymienia **trzy** powody pominięcia, nie jeden.

**Czego NIE ma w repo i dlaczego:** surowych nagrań sesji (~0,5 MB strumieni
ANSI). Niosą wyjście komend z nazwą użytkownika systemu — a raz wpuszczone do
gita zostają tam na zawsze. Odtworzenie idzie więc przez ponowne nagranie
scenariuszem wskazanym w polu `scenariusz` każdej specyfikacji; nazwy znaczników
są stabilne (definiuje je scenariusz), przesunąć mogą się tylko wiersze kadru —
a wtedy **asercja odmówi zapisu**, zamiast po cichu wypuścić zły obraz.

### Skutek werdyktu w liczniku

Cztery unieważnione ekrany są **wycofane z prozy do znaczników, a pliki obrazów
usunięte** — licznik nie może liczyć jako zrobione czegoś, co nie jest dowodem.
Stan po wycofaniu: **29 zrobionych, 16 do zrobienia teraz** (12 modelowych + 4
do ponownego wykonania pod asercjami), 27 po zalogowaniu.

Przy wycofywaniu wyszła **czwarta klasa usterki podpisu**: poprawka podpisu
potrafi **przełożyć miejsce do innego kubła**, bo kubeł (jak nazwa pliku)
wyprowadza się z podpisu. Podpis B6 stracił przy poprawce słowa „dwukrotnym
Esc", więc wypadł z reguły `tui` i wpadł w domyślny `claude-ai` — licznik
„po zalogowaniu" urósł z 27 na 28, choć ekran jest lokalny. Naprawione
nazwaniem komendy w podpisie („ekran /rewind…"). **Po każdej poprawce podpisu
sprawdzać manifestem, że kubeł się nie przesunął.**

### Sprostowanie liczby zrzutów zza logowania

W kolejce czatu A figuruje „49 zrzutów zza logowania". **Manifest podaje 68**
(`node tools/zrzuty/manifest.mjs` bez filtra): K1 — 27 (claude-ai 16, console 6,
api 5), K2 — 41 (github-logged). Liczbę trzeba uzgodnić **przed** wspólnym
posiedzeniem z właścicielem, bo 68 to zupełnie inny rozmiar spotkania niż 49.
Stan zawsze liczyć komendą, nigdy z notatki.
### PRZELOT ZRZUTÓW — STAN PO TURZE 2 CZATU A (2026-08-23)

Stan i przepisy: **[PRZELOT-ZRZUTOW.md](PRZELOT-ZRZUTOW.md)**, sekcja „Czat A,
tura 2" — tam są pułapki, przepis na zrzuty pulpitu i lista zmian w repozytorium
demonstracyjnym. Znaleziska tury: `tresc-kursow/ZNALEZISKA-PRZELOTU-ZRZUTOW.md`,
wiersze 11–14.

Skrót: **23 zrzuty Kursu 2 zrobione i zacommitowane, ale jeszcze NIE wpięte**
w prozę (znaczniki `<!-- ZRZUT: -->` czekają) — bo najpierw idą poprawki trzech
podpisów. **Osiem miejsc przeniesionych do partii „po zalogowaniu"**: anonimowa
przeglądarka nie widzi merge boxa, przycisków scalania ani logów Actions
(sprawdzone wykonaniem). Kolejność dalszej pracy zatwierdzona przez właściciela:
**poprawki podpisów → `wepnij.mjs` → GitHub Desktop (4) → edytor kodu (1) →
lokalny podgląd obu kursów w stylu strony.**

Stan **zawsze** liczyć komendą (`manifest.mjs`), nigdy z tego akapitu.


### Czat A — wspólne posiedzenie (2026-08-23): Kurs 2 DOMKNIĘTY

Manifest: **K2 88/88, zero miejsc otwartych**. Gałąź `feat/tresc-k2-modul-2-3`
wypchnięta (`14a9747`), strażnicy 25/25. Partia zalogowana przyniosła
znaleziska 16–28 (rejestr) — w tym dziesięć rozjazdów dokumentacja↔ekran
naprawionych w prozie i sześć miejsc usuniętych decyzją właściciela jako
niewykonalne (CAPTCHA rejestracji, okno GCM, trzy ekrany 2FA, alert
z komentarza issue). Przepis na zalogowany rig i pułapki: PRZELOT-ZRZUTOW.md,
sekcja „Wspólne posiedzenie". Zostało z całego przelotu: **K1 — 27 miejsc
zza logowania + 16 miejsc czatu B** (jego gałąź `feat/zrzuty-k1`).
