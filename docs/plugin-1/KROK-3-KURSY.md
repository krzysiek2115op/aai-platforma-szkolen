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

### Moduł 1 Kursu 1 — WYPRODUKOWANY (2026-08-20), czeka na domknięcie

Sześć lekcji, **81 935 znaków prozy dla klienta** (scenariusze tego
samego modułu to 38 kB razem ze scenami i tabelami):

| Lekcja | Znaków | Wierszy zgodności |
|---|---|---|
| 1.1 Czym jest Claude i co potrafi (WZORZEC) | 11 203 | 27 |
| 1.2 Rodzina modeli | 14 746 | 33 |
| 1.3 Jak dobrać model | 13 995 | 34 |
| 1.4 Cennik | 13 999 | 35 |
| 1.5 Okno kontekstu | 13 993 | 35 |
| 1.6 Słowniczek | 13 999 | 33 |

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

### CO ZOSTAŁO DO ZROBIENIA W MODULE 1 (następny krok po /clear)

1. **Sprawdzić wynik przebiegu cytatów** (druga bramka jakości) —
   uruchomiony 2026-08-20, edytował pliki prozy i katalog
   `docs/dokumentacja-techniczna/d7/cytowane/`. Jego raport przepadł
   z kontekstem sesji, więc weryfikacja idzie z repo: `git status`
   i `git diff` na `tresc-kursow/jak-korzystac-z-claude/modul-1/`
   (co poprawił) oraz `ls docs/dokumentacja-techniczna/d7/cytowane/`
   (miały dojść cztery pliki: models--overview, models--choosing-a-model,
   models--optimizing-for-cost-and-intelligence, pricing, context-windows;
   istniały tylko `claude-platform--intro.md` i `--glossary.md`).
2. `node tools/straznicy/straznik-prozy.mjs` → 0, potem `npm test`
   i `node tools/straznicy/uruchom-wszystkie.mjs`.
3. **Wgrać moduł:** `npm run db1:tresc` (wymaga `npm run dev` na :3001).
4. Jeden commit na moduł, temat = skutek.
5. Pokazać właścicielowi w kreatorze — taki jest ustalony rytm oceny.
6. Dopisać ocenę modułu do `tresc-kursow/POSTEP.md` (sekcja o produkcji prozy).

### Znaleziska z modułu 1 do decyzji przy publikacji kursu

| Znalezisko | Skąd | Co z tym |
|---|---|---|
| **Cena wprowadzająca Sonneta 5 wygasa 31 sierpnia 2026** — notatka mówi też o odwołanej podwyżce z 1 września | `pricing.md` | **Sprawdzić przed publikacją kursu**; lekcja 1.4 podaje ceny z migawki i mówi, gdzie sprawdzić aktualne |
| Dokumentacja opisuje **Sonneta 5 dwoma różnymi zdaniami** (`intro.md` vs `overview.md`); dla pozostałych modeli opisy są zgodne | oba pliki | Rozbrojone jawnie w lekcji 1.2 — kurs cytuje oba brzmienia i nazywa rozjazd (wzorem lekcji 5.7 Kursu 2 przy skrócie CD) |
| Kompakcja kontekstu jest w źródle „podstawową strategią" i **jednocześnie w becie**, tylko dla modeli 4.6+ | `context-windows.md` | Napisane wprost, z ostrzeżeniem przed opieraniem na tym firmowego procesu |
| **Najmocniejsze modele NIE mają świadomości kontekstu** (mają: Sonnet 5, Haiku 4.5; nie mają: Opus 4.7+, Fable 5, Mythos 5) | `context-windows.md` | Kontrintuicyjne wobec narracji „biorę najmocniejszy" — zostawione jako oznaczone zaskoczenie |
| **Przykład „10 000 zgłoszeń ≈ $37" w dokumentacji się nie domyka** (wychodzi tylko przy policzeniu całości po stawce wejścia, mimo podanej stawki wyjścia) | `pricing.md` | Liczba przepisana wiernie; usterka jest po stronie Anthropica |
| Modele legacy bywają **droższe** od aktualnych następców (Sonnet 4.6/4.5 $3/$15 wobec Sonnet 5 $2/$10) | `models/overview.md` | Użyte w 1.2 jako argument za migracją |
| Fable 5 używa tokenizera od Opus 4.7 — ten sam tekst to **~30% więcej tokenów** niż na starszych modelach | `models/overview.md` | Podkopuje naiwne porównywanie cen za MTok między pokoleniami |

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
