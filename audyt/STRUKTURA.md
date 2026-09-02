# Struktura sektora AUDYT

**Etap E4 — szkielet.** Ten plik mówi, **jak sektor jest ułożony, co czym rusza
i kto co uruchamia**. Role i checklisty: [`ROLE.md`](ROLE.md). Granice:
[`GRANICE.md`](GRANICE.md). Zasady: [`REGULAMIN.md`](REGULAMIN.md).

---

## Układ katalogu

```
audyt/
  REGULAMIN.md          zasady i rozstrzygnięcia właściciela (E1)
  PLAN-BUDOWY.md        etapy, stan budowy, fakty zmierzone (E1)
  ROLE.md               19 ról: zakres + checklista (E2)
  GRANICE.md            do kogo należy znalezisko (E2)
  BRIEF-PROJEKTU.md     jedyne wejście wiedzy dla agentów (E3)
  DOKUMENTACJA.md       7 rodzajów, kto dostaje co (E3)
  ZRODLA-DOKUMENTACJI.md  źródła i cięcia (E3)
  STRUKTURA.md          ten plik (E4)

  szablony/             wzorce ról — kopiowane w E5
    AGENT.md  KRYTYK.md  SKILL.md  golden.md

  tools/                narzędzia sektora (E4)
    wspolne.mjs                  ścieżki, progi, HASH MIEJSCA
    zgloszenie.mjs               jedyna droga wejścia znaleziska
    werdykt.mjs                  jedyna droga do statusu ZWERYFIKOWANE
    status.mjs                   pięć statusów, rundy pętli, HISTORIA przejść (KIER-05), kolejność sektorów
    mapa.mjs                     pokrycie w trzech stanach
    migawka-wartosci.mjs         wartości przed i po (W6)
    porownaj-cykle.mjs           porównanie fal (K4″): zgodne / nadzbiór / sprzeczne, per dział; PODEJRZENIE KOLEJNOŚCI
    polacz-sektory.mjs           audyt + re-audyt (W4)
    fala.mjs                     worktree fali 2 ze sparse checkoutem bez fali 1 (--postaw=2 | --scal=2)
    generuj-agentow.mjs          źródło → .claude/agents (D1)
    straznik-sektora-audytu.mjs  dwadzieścia dziewięć kontroli (1–29; 27 = zakaz innej fali, 27b = brak K4′), OBA sektory
    audyt-straznika-sektora.mjs  mutacje strażnika
    przejscie-4b6.mjs            jednorazowy skrypt przejścia 4b + 6 (2026-09-02) — dowód, nie narzędzie sektora
    pobierz-dokumentacje-audyt.mjs

  role/                 19 ról, po katalogu na rolę (E5)
    <KOD>/AGENT.md  KRYTYK.md  SKILL.md  goldeny/wzorzec.md

    SKILL.md NIE jest instalowany do `.claude/skills/` (rozstrzygnięcie
    właściciela 2026-09-01). Skill jedzie RAZEM ZE SWOJĄ ROLĄ: agent czyta go
    ze ścieżki własnym `Read`, więc nie widzi go żadna inna sesja ani żaden
    inny agent. Powód jest zmierzony, nie estetyczny — patrz niżej.

  zgloszenia/           wpisy JSON, ID nadaje narzędzie: <PREFIKS>-<DZIAŁ>-F<N>-<numer>
  stan/                 status, rundy i HISTORIA każdej roli — W GICIE (od 2026-09-02)
  migawki/              przed.json, po.json — W GICIE (od 2026-09-02)
  wyniki/               połączone fale i sektory
```

Sektor RE-AUDYT ma własny katalog `re-audyt/` o tym samym kształcie
(`ROLE.md`, `GRANICE.md`, `role/`) na gałęzi `re-audyt/sektor-re-audytu`,
ale **narzędzia i katalog zgłoszeń są WSPÓLNE** — patrz „Dwa sektory, jeden
nośnik" niżej.

**Poza repozytorium:**
`~/.cache/aai-audyt-dokumentacja/` (44 MB) — dokumentacja masowa.
Nie leży w drzewie, bo **strażnicy skanują dysk, nie git**; powód i dowód
w [`ZRODLA-DOKUMENTACJI.md`](ZRODLA-DOKUMENTACJI.md).

`.claude/agents/aud-*.md` — generat, **nieśledzony przez gita**. Powstaje
komendą ze źródła w `audyt/role/`, więc nie ma czego commitować i niezmiennik
zostaje nietknięty.

---

## Skille należą do ról, nie do repozytorium

**Rozstrzygnięcie właściciela (2026-09-01): skill ma być na tym agencie, który
go potrzebuje — nie na całym repo.** Zmierzone w harnessie, nie założone:

1. **Nie istnieje pole `skills:` w definicji agenta.** Frontmatter ma cztery
   pola — `name`, `description`, `tools`, `model`. Przypisania „ten skill do
   tego agenta" nie ma czym zapisać.
2. **`Skill` to jedna pozycja w `tools:` — wszystko albo nic.** Przyznanie jej
   otwiera CAŁĄ listę skilli, nie wybrany podzbiór.
3. **Audytorzy nie mają `Skill` w narzędziach** (`Read, Grep, Glob, Bash`), więc
   skille zainstalowane do `.claude/skills/` byłyby widoczne w każdej sesji tego
   repo i **nieużywalne przez sektor**. Najgorsze z obu stron.

Dlatego `SKILL.md` zostaje plikiem roli, a `AGENT.md` wskazuje go ścieżką.
**Ślad dla GOLD-06** („czy dział użył swojego skilla") bierze się z treści:
każdy krok procedury kończy się czymś sprawdzalnym — komendą, liczbą albo
`plik:linia` — więc wyjście działu albo te artefakty niesie, albo skill nie
został użyty.

Frontmatter `name:`/`description:` w `SKILL.md` **zostaje mimo to**: nic nie
kosztuje, a gdyby kiedyś zapadła decyzja o instalacji, jest to jedna zmiana
w generatorze, nie przepisywanie 19 plików.

---

## Dwa sektory, jeden nośnik

**Sektory są osobne w PRACY, nie w toolchainie** (rozstrzygnięcia właściciela
2026-09-01). Osobne jest to, co §17 nazywa osobnym: re-audyt nigdy nie
pracuje na tym samym dziale co audyt i jest krokiem do tyłu. Wspólne zostaje
to, bez czego łączenie sektorów (W4) nie miałoby jak działać:

| Wspólne | Dlaczego |
|---|---|
| `audyt/zgloszenia/` | `polacz-sektory.mjs` łączy oba sektory po HASZU MIEJSCA, czytając jeden katalog. Osobny katalog zerwałby łączenie — a ono jest sensem kroku |
| `audyt/tools/` | druga kopia `hashMiejsca()` rozjechałaby się po cichu; zmiany narzędzi weszły **na gałęzi audytu, przed odgałęzieniem**, więc gałąź re-audytu nie zmienia cudzego katalogu |
| `.claude/agents/` | harness widzi jeden katalog; sektory rozróżnia PRZEDROSTEK nazwy (`aud-`, `rea-`) |

| Rozłączne | Jak |
|---|---|
| identyfikatory zgłoszeń | `AUD-<DZIAŁ>-NNN` i `REA-<DZIAŁ>-NNN` (reguła 19) |
| pliki stanu ról | `<sektor>-f<fala>-<ROLA>.json` |
| `ROLE.md`, `GRANICE.md`, `role/` | osobne katalogi sektorów |

**Siedemnaście z 21 ról re-audytu ma kody wspólne z audytem.** Pogłębiacz
obszaru SEC JEST re-audytem działu SEC, więc wspólny kod trzyma `GRANICE.md`
i łączenie po haszu w jednej linii. Własne kody ma cztery role, których audyt
nie ma: `PSIARZ`, `SKUT`, `STRAZ`, `WALID`. Nie ma `GOLD` ani `WER` —
**rolę weryfikatora pełni w re-audycie `WALID`** (§16: „w re-audycie działa
także osobny proces walidacji"), a `werdykt.mjs` nazywa strony ścieżki
(`krytyk`, `weryfikator`), nie konkretne role, więc nośnik werdyktu obsługuje
oba sektory bez zmiany.

**Prefiks identyfikatora nie jest nazewnictwem.** `nastepneId()` liczy kolejny
numer po plikach zaczynających się od `<PREFIKS>-<DZIAŁ>-F<N>-`, a katalog jest
jeden — przy wspólnym prefiksie zgłoszenie re-audytu w dziale SEC dostałoby
nazwę `AUD-SEC-F1-001.json`, którą audyt już zajął. Ciche nadpisanie cudzego
wpisu, bez jednego objawu. **Fala w nazwie też nie jest nazewnictwem** (pozycja 4
E7.7): pula numerów jest osobna dla każdej fali, bo numer ciągły w dziale
zdradzał fali 2 liczbę znalezisk fali 1. Pilnują tego: samokontrola
`zgloszenie.mjs --test` (osiem przypadków identyfikatora i przebieg CLI) oraz
reguła 19 strażnika (prefiks sektora i fala w nazwie = pole `fala`).

---

## Niezmiennik sektora

```
git diff main --name-only -- . ':!audyt' ':!re-audyt'      →  musi dać 0
```

**Jedna komenda, bez wyjątków, TA SAMA NA OBU GAŁĘZIACH** (rozstrzygnięcie
właściciela; drugie wykluczenie doszło przy E7.1). Dlatego kod sektora mieszka
w `audyt/tools/`, a nie w `tools/audyt/`, a generat i dokumentacja masowa nie
wchodzą do gita.

Drugie wykluczenie NIE jest kosmetyką i nie zostało dopisane „na wszelki
wypadek": zmierzone przed zmianą — na gałęzi re-audytu z katalogiem
`re-audyt/` komenda z jednym wykluczeniem pokazuje WŁASNĄ pracę sektora jako
naruszenie, czyli bramka świeciłaby na czerwono zawsze, a więc nie znaczyłaby
nic. Na gałęzi audytu wynik jest identyczny jak dotąd, bo katalogu `re-audyt/`
tam nie ma.

**Druga twarz tej ceny, zmierzona przy E5:** niezmiennik `git diff` nie widzi
`.claude/`, ale **strażnicy z `main` skanują DYSK**. Generat z odsyłaczami
względnymi wywrócił `straznik-linkow` przy commicie — 28 martwych odsyłaczy
w czterech definicjach naraz. Dlatego w plikach ról ścieżki podajemy **od
korzenia repo, w kodzie inline** (to zarazem forma, której agent potrzebuje do
`Read`), a pilnuje tego reguła 14 strażnika sektora.

**Cena jest nazwana (K8):** bramki z `main` nas nie pilnują.
`straznik-wagi-dokumentacji` skanuje wyłącznie `tools/`, a audyt mutacyjny
projektu leży poza `audyt/` — dlatego sektor ma **własnego strażnika i własne
mutacje**, uruchamiane na gałęzi sektora.

---

## Co pilnuje strażnik sektorów — dwadzieścia osiem kontroli

| # | Kontrola | Co się psuje bez niej |
|---|---|---|
| 1 | gałąź nie zmienia kodu produktu | sektor naprawia zamiast wskazywać (W2, D7) |
| 2 | każda rola ma krytyka | rola bez drugiej pary oczu (D3, WYTYCZNE N1) |
| 3 | pięć elementów §5 w `AGENT.md` | agent bez zakresu albo bez ograniczeń |
| 4 | generat zgodny ze źródłem, bez sierot | agent istnieje, choć nikt go już nie definiuje |
| 5 | każde zgłoszenie ma dowód, miejsce i hash | wpis dopisany ręcznie omija bramkę |
| 6 | trzy zasady nadrzędne dosłownie | definicja z pustym nagłówkiem niczego nie zabrania (W9) |
| 7 | mechaniczny zakres i checklista w `ROLE.md`; każdy DZIAŁ (14 + 14 Pogłębiaczy) ma pozycję otwartą `<KOD>-90` | rola bez listy nie da się zmierzyć, czy niczego nie pominęła (K4″: lista = minimum); bez `-90` „szukaj dalej w zakresie" nie ma gdzie wylądować |
| 8 | mapa pokrycia bez sierot | plik, którego nie czyta nikt |
| 9 | `zgloszenie.mjs --test` przechodzi | bramka wpuszczania znalezisk jest zepsuta |
| 10 | trzynaście zasad Goldena w `AGENT.md` i `KRYTYK.md` | agent nie wie, wobec czego będzie oceniany |
| 11 | golden przechodzi przez `powodyOdmowy()` | golden przestaje być miarą i gnije razem z kodem |
| 12 | komplet 19 ról i czterech plików każdej | `ROLE.md` opisuje rolę bez definicji |
| 13 | checklista `AGENT.md` zgodna z `ROLE.md` w obie strony | agent nie zada pytania, które właściciel zatwierdził |
| 14 | generat bez martwych odsyłaczy | sektor wywraca `straznik-linkow` z `main` |
| 15 | `werdykt.mjs --test` przechodzi | krytyk i weryfikator mogą zapisać cokolwiek |
| 16 | ZWERYFIKOWANE tylko z kompletem werdyktów; próba nigdy cicha | wpis domknięty jednym głosem (§16) albo wyciszony znacznikiem |
| 17 | stan roli: kody pozycji, niezerowa runda, fala ∈ {1,2}, HISTORIA przejść (czasy ISO, niemalejące, ostatni wpis = stan), KOLEJNOŚĆ sektorów dla 14 działów | kierownik liczy złą liczbę otwartych pozycji (KIER-01); plik podłożony ręcznie wpuszcza re-audyt przed wyjściem audytu (W5) bez objawu |
| 18 | krytyk, który MA zgłaszać, wie CZYM | znalezisko krytyka opisane prozą znika razem z sesją |
| 19 | identyfikator zgłoszenia zgodny ze swoim SEKTOREM **i swoją FALĄ** (`F<N>` w nazwie = pole `fala`) | wpis re-audytu nadpisuje wpis audytu — oba dzielą katalog i kody działów; rozjazd nazwy z polem oślepia jedną z dwóch warstw ślepoty fali 2 (sparse checkout chowa po nazwie, `status.mjs` odmawia po polu) |
| 20 | zakres Pogłębiacza identyczny z zakresem jego działu w audycie | re-audyt mierzy inny obszar, niż audyt zbadał — łączenie po haszu przestaje znaczyć |
| 21 | model generatu zgodny z `ROLE.md` (D8) | rola pracuje na innym modelu, niż rozstrzygnął właściciel — sha256 źródła tego nie widzi |
| 22 | moduł krytyka wskazuje zgłoszenia SWOJEGO sektora | krytyk re-audytu ocenia wpisy audytu, a wpisy `REA-*` nie mają krytyka |
| 23 | hash wpisu zgodny z PRZELICZONYM z miejsca (H1) | wpis z hashem policzonym inną formułą nie połączy się z odpowiednikiem — rozjazd fal przy zgodnym wyniku |
| 24 | szablon goldena też jest miarą | golden każdej nowej roli powstaje z szablonu, który wskazuje linię obok |
| 25 | `porownaj-cykle.mjs --test` przechodzi | regresja do K4′ (rozjazd = STOP) albo ślepota na werdykty bez objawu do końca dwóch fal |
| 26 | `status.mjs --test` przechodzi | pięć odmów narzędzia stanu (fala, kolejność sektorów, cofanie przy Pogłębiaczu, drzewo produktu wobec migawki, **izolacja fali 2**) bez bramki do pierwszej fali |
| 27 | zdanie zakazu czytania innej fali („nie czytasz wpisów, stanu ani wyników innej fali") w każdym `AGENT.md` i `KRYTYK.md` oraz w obu szablonach (sprawdzanych wprost) | agent fali 2 nie ma w definicji zakazu, a ma `Read`/`Grep`/`Bash` — do 2026-09-02 zdanie stało w 3 z 80 definicji |
| 27b | żadna definicja (`AGENT.md`, `KRYTYK.md`, `SKILL.md`) ani szablon nie niesie wycofanego zdania K4′ „swobodny przegląd nie da tego samego wyniku" | zdanie znaczy odwrotność K4″ (lista = sufit); rola pisana z pamięci E5 wniosłaby je z powrotem bez objawu |
| 28 | `stan/` i `migawki/` NIE są ignorowane przez gita | stan fali 2 z worktree nie wraca do drzewa sektora; dziennik wejść przestaje być dowodem |
| 29 | `fala.mjs --test` przechodzi | worktree fali 2 bez wykluczeń „działa" w lekturze dokumentacji, a agent fali 2 otwiera wpisy fali 1 |

Reguły 2, 3, 4, 6, 10, 11 i 12 są **warunkowe**: dopóki `audyt/role/` jest pusty,
mówią wprost „pominięte". Cisza byłaby nie do odróżnienia od zaliczenia — a katalog
istniał jako pusty od E4, więc sześć kontroli przechodziło po pustce, dopóki nie
zaczęły o tym mówić.

Reguły 28–29 (i rozszerzenie 19 o falę) **dołożyła pozycja 4a pakietu E7.7**
(2026-09-02). Reguły 15–18 **dołożył etap E6**: 15 i 16 przy budowie nośnika werdyktu,
17 i 18 po tym, jak **próba na sucho** wskazała dwie usterki, których żadna
wcześniejsza kontrola nie widziała. Patrz „Nośnik werdyktu" niżej.

**Regułę 19 dołożył etap E7.1**, razem z rozszerzeniem sektorowym: reguły
dotyczące ról chodzą od tej pory po OBU katalogach (`audyt/role/`
i `re-audyt/role/`), a komunikaty niosą nazwę sektora, bo „rola SEC nie ma
KRYTYK.md" przy dwóch sektorach o wspólnych kodach działów nie mówi, którą
rolę naprawić. Reguła 17 pyta przy okazji, czy rola z pliku stanu **istnieje
w swoim sektorze** — stan `GOLD` w re-audycie wyglądałby w zestawieniu
kierownika jak rola, która jeszcze nie zaczęła.

**Komplet ról jest twardy dla sektora zbudowanego do końca.** Audyt ma dziś
19 z 19 i brak którejkolwiek jest błędem; re-audyt jest w tym samym miejscu,
w którym audyt był w środku E5, więc jego komplet zostaje MIĘKKI do końca
E7.4. Ciszy nie ma w żadnym stanie: liczba zbudowanych ról i imienna lista
brakujących jedzie na wyjściu zawsze — miękki komplet mówi to samo, tylko
kodem 0.

**Reguła 20 doszła przy E7.3.** Zakres Pogłębiacza jest KOPIĄ zakresu jego działu
w audycie — inaczej łączenie sektorów po haszu (W4) porównywałoby wyniki z dwóch
różnych obszarów. Kopia jest w dokumencie WPISANA, bo `ROLE.md` czyta człowiek
i agent, a nie tylko parser; kopia w tym repozytorium rozjeżdża się po cichu
zawsze, więc musi mieć bramkę.

**Reguły 21 i 22 dołożyło przygotowanie próby na sucho E7.6** — obie usterki
wyglądały na pracę wykonaną i żadna z 55 mutacji ich nie widziała. Generator
trzymał WŁASNĄ listę ról opusowych wpisaną przy E4 i `rea-walid` (weryfikator
re-audytu, w `ROLE.md` **Opus**) szedł na Sonneta przez cały E7.5; reguła 4
tego nie widziała, bo porównuje sha256 źródła, a model w źródle nie stoi. Model
czyta się odtąd z nagłówka roli w `ROLE.md`. **Od 2026-09-02 modele są trzy** (Fable 5.1
dla `KIER` i `KON` obu sektorów, polecenie właściciela) i reguła 21 czyta nagłówki
**własnym odczytem**, nie funkcją generatora — bo pomiar tą samą funkcją, która produkuje
generat, przepuszczał regresję tabeli modeli po regeneracji; nieznany model w nagłówku
zapala regułę zamiast spadać na Sonneta; to samo robi BRAK znacznika przy roli
procesowej (przeoczenie wskazane przez sędziego przy krytyce budowy). Druga: 21 z 21 `KRYTYK.md`
re-audytu wskazywało w module wpisy `AUD-<KOD>-*` — krytyk Pogłębiacza SEC
oceniałby pracę działu SEC AUDYTU, a wpisy `REA-SEC-*` nie miałyby krytyka.
Usterka przyszła z szablonu, w którym prefiks stał na sztywno; szablon ma
odtąd `<PREFIKS>`.

Audyt mutacyjny: **73 mutacje**, 0 przeoczonych, 0 martwych
(`audyt/tools/audyt-straznika-sektora.mjs`). Pięć z nich ma pole **`wymaga`**:
gdy na danej gałęzi nie ma materiału (`re-audyt/ROLE.md` na gałęzi audytu), są
**pomijane i policzone**, nigdy cicho zielone.

**Mapa pokrycia czyta zakresy OBU sektorów** (od E7.4). Dokumenty sektora
RE-AUDYT bierze wyłącznie Konrad re-audytu — żaden zakres audytu ich nie
obejmuje, więc bez unii byłyby sierotami. Zmierzone: mapa zgłosiła dokładnie
dwa takie pliki, zanim unia weszła.

**Generator USUWA generaty bez źródła** (od E7.4), a `--sprawdz` je zgłasza.
Powód jest eksploatacyjny: przełączenie gałęzi sektora zostawia na dysku
42 definicje re-audytu bez źródła — żywych agentów bez zakresu. Generat jest
wyprowadzony ze źródła, nigdy odwrotnie, więc kasowanie niczego nie traci.

---

## Nośnik werdyktu — czego szkielet E4 nie miał

**Znalazła to dopiero próba na sucho (E6), czyli dokładnie to, po co się ją robi.**

Do E6 ostatnie dwa kroki cyklu życia nie miały nośnika maszynowego:
`zgloszenie.mjs` zapisuje `status` i `werdykt` **raz, przy tworzeniu wpisu**,
a `status.mjs` prowadzi stan **roli**, nie stan zgłoszenia. Krytyk i weryfikator
mogli więc wydać werdykt wyłącznie w rozmowie — a rozmowa nie przeżywa `/clear`,
podczas gdy przebieg sektora z założenia nie mieści się w jednej sesji. Pozycja 7
definicji ukończenia sektora („próba na sucho jednej roli → status
ZWERYFIKOWANE") była przez to **nieosiągalna**.

Nie widziała tego ani reguła 5 strażnika (pyta o `id`, `dowod`, `miejsce`,
`hash`), ani żadna z 24 mutacji, które wtedy istniały. **Bramka, której nie
widać, jest nie do odróżnienia od bramki, której nie ma** — ta sama lekcja co
`smoke-csp` milczący przez piętnaście dni.

Cztery rozstrzygnięcia tego nośnika:

1. **Dwa werdykty, nie jeden.** Krytyk roli ocenia PRACĘ AGENTA, weryfikator
   ocenia ZJAWISKO. §16 stawia weryfikatora poza audytem właśnie po to, żeby
   agent wykrywający nie był jedynym, kto uznaje problem za prawdziwy — więc
   status `ZWERYFIKOWANE` wymaga OBU. Zbiory werdyktów są rozłączne
   (`PRZEPUSZCZAM`/`ODRZUCAM` kontra `ISTNIEJE`/`ODRZUCONE`), bo jedno słowo
   o dwóch znaczeniach w dzienniku audytu jest gorsze od dwóch słów.
2. **Kolejności NIE wymuszamy.** Schemat cyklu życia rysuje krytyka, Goldena
   i weryfikatora jako trzy gałęzie z jednego węzła, nie jako łańcuch.
   Wymuszenie kolejności byłoby regułą, której nie ma w niczym, co właściciel
   zaakceptował.
3. **Werdyktu nie da się nadpisać, a odrzucenie musi mieć powód.** Odrzucone
   zgłoszenie zostaje z werdyktem — druga fala musi dojść do tego samego
   wniosku (K4'), a wpis poprawiony po fakcie zafałszowałby porównanie.
   Odrzucenie bez powodu jest ciszą, nie wynikiem.
4. **Reguła 16 sprawdza W OBIE STRONY.** Sam warunek „ZWERYFIKOWANE wymaga obu
   werdyktów" przepuściłby wpis z kompletem werdyktów, który utknął na
   `DO WERYFIKACJI` — a wtedy kierownik szukałby werdyktu, który już jest.

### Wpis PRÓBNY — znacznik etapu budowy

`zgloszenie.mjs` wymusza `fala` ∈ {1, 2}, więc wpis powstały przy budowie
sektora siedzi w **prawdziwej fali 1** i jest od niej nie do odróżnienia.
`porownaj-cykle.mjs` zobaczyłby go jako miejsce znane fali 1 i nieznane fali 2,
czyli jako **rozjazd fal** (NADZBIÓR fali 1), którym nie jest.

Dlatego wpis próbny nosi znacznik: `zgloszenie.mjs --oznacz-probe=<ID>
--etap=E6`. Trzy rzeczy o nim, każda z powodem:

- **znacznik NIE jedzie w treści zgłoszenia** — `powodyOdmowy()` odrzuca pole
  `proba` przysłane przez agenta. Oznaczenie jest decyzją tego, kto prowadzi
  budowę sektora; gdyby agent mógł je sobie dopisać, miałby drogę na wyciszenie
  własnego prawdziwego znaleziska;
- **znacznik MUSI nazwać etap** — pusty łańcuch zapala regułę 16;
- **znacznik NIGDY nie jest cichy** — strażnik wypisuje wpisy próbne po ID,
  a `porownaj-cykle.mjs` i `polacz-sektory.mjs` mówią, ile pominęły. Ciche
  odsianie byłoby nie do odróżnienia od kompletu.

**Wpis próbny ZOSTAJE w repozytorium** (rozstrzygnięcie właściciela
2026-09-01) — jest materiałem dowodowym etapu, a nie śmieciem.

**Do gita wchodzą `zgloszenia/`, `stan/` I `migawki/`** (zmiana decyzji
2026-09-02, pakiet E7.7 pozycja 4, pytanie 4 — rozstrzygnięcie właściciela).
Zapis historyczny brzmiał: „do gita wchodzą wyłącznie `zgloszenia/`, bo `stan/`
i `migawki/` są stanem bieżącym, nie dowodem". Przestał być prawdziwy z dwóch
powodów: (1) od pozycji 3 plik stanu niesie HISTORIĘ przejść, czyli dziennik
wejść KIER-05 — a dziennik poza gitem nie jest dowodem; (2) fala 2 pracuje
w osobnym worktree (`fala.mjs`), a worktree oddaje do drzewa sektora wyłącznie
COMMITY — stan fali 2 poza gitem nigdy by nie wrócił i `porownaj-cykle
--dzial=` nie widziałby jej `ZAKOŃCZONE`. Cztery lokalne pliki stanu z prób
E6/E7.6 i obie migawki weszły jako materiał dowodowy. Pilnuje reguła 28.
Zgłoszenia jak dotąd **przyrastają i nigdy nie znikają**, także odrzucone (K4').

### Plik stanu roli — dziennik wejść (pozycja 3 pakietu E7.7, 2026-09-02)

```json
{ "sektor": "audyt", "fala": 1, "rola": "SEC", "status": "ZAKOŃCZONE", "runda": 2,
  "niedomkniete": ["SEC-07"], "kiedy": "2026-09-10T12:30:00.000Z",
  "historia": [ { "status": "W TRAKCIE", "runda": 0, "kiedy": "2026-09-10T09:00:00.000Z" },
                { "status": "ZAKOŃCZONE", "runda": 2, "kiedy": "2026-09-10T12:30:00.000Z" } ] }
```

`historia` dopisuje się przy KAŻDYM zapisie, `kiedy` to ostatnia zmiana. To jest
nośnik KIER-05 („dziennik wejść") — jeden plik, nie druga kopia prawdy; czyta go
`status.mjs --pokaz --historia`. Pięć odmów narzędzia, każda z komendą naprawy
w komunikacie (cztery z sześciu rozstrzygnięć właściciela 2026-09-02, piąta
z pozycji 4 pakietu):

1. **fala ∈ {1, 2}** — ten sam rygor, co w `zgloszenie.mjs`; dotąd `--fala=3`
   tworzyło `audyt-f3-SEC.json` po cichu;
2. **kolejność sektorów (W5, K9′)** — Pogłębiacz działu X fali N nie wchodzi
   (`W TRAKCIE` albo pierwsza runda), dopóki dział X audytu TEJ SAMEJ fali nie
   jest `ZAKOŃCZONE`. Wyłącznie 14 działów; role procesowe re-audytu (KIER, KON,
   RAP, PSIARZ, SKUT, STRAZ, WALID) są wolne — audytowy KIER kończy dopiero po
   całym audycie, więc blokada na nim zamroziłaby sektor;
3. **cofanie** jest dozwolone i zapisane w historii — ODMOWA tylko dla działu
   audytu schodzącego z `ZAKOŃCZONE`, do którego Pogłębiacz tej fali już wszedł;
4. **drzewo produktu** — bez `migawki/przed.json` żadna zmiana stanu nie
   przechodzi; różnica drzewa produktu wobec `glowa_main` PRZYPIĘTEGO w migawce
   (commity ORAZ niezacommitowane, poza sektorami i `.claude/`) odmawia zapisu
   i wypisuje pliki. Wobec przypiętego commita, nie ruchomego `main` — cudzy
   commit dependabota nie zatrzyma sektora;
5. **izolacja fali 2** — rola fali 2 nie WCHODZI do działu (`W TRAKCIE` albo
   pierwsza runda), dopóki w drzewie widać jakikolwiek wpis zgłoszenia albo
   plik stanu z POLEM `fala: 1` (pole, nie nazwa — sparse checkout może
   „działać" tylko w lekturze dokumentacji). Wpis PRÓBNY fali 1 blokuje tak
   samo (jeden format, zero wyjątków). Wyjątek: `KIER` i `RAP` fali 2 wchodzą
   także w pełnym drzewie — porównanie fal i raport są PO obu falach
   (rozstrzygnięcie 1). Komunikat podaje `fala.mjs --postaw=2`.

Reguła 17 strażnika pilnuje tego samego na ZAWARTOŚCI plików (własnym kodem,
nie importem z narzędzia): plik podłożony ręcznie ominąłby `status.mjs`, a reguły
nie. Stan **próbny** (`proba: "E7.6"`) wypada wyłącznie spod kolejności sektorów
— jak wpis próbny z porównania fal — i jest wypisywany po nazwie; cztery lokalne
pliki z prób E6/E7.6 dostały historię ręcznie (jeden wpis, czas = mtime), bo próba
E7.6 przejechała Pogłębiacza SEC bez działu SEC audytu — dokładnie to, czego
narzędzie odtąd odmawia.

### Co jeszcze wskazała próba na sucho

Dwie rzeczy, których nie widziała żadna z szesnastu wcześniejszych kontroli,
bo obie ujawniają się dopiero **w działaniu**:

- **`status.mjs` dzielił `--niedomkniete` przecinkiem**, więc komentarz
  w nawiasie zapisywał się jako osobne „pozycje" — siedem realnych dało
  dziewięć wpisów. Kierownik czyta stąd LICZBĘ otwartych pozycji (KIER-01);
  `porownaj-cykle.mjs` czyta z pliku stanu WYŁĄCZNIE `status` działu — wcześniejszy
  zapis, że „bierze tę liczbę do K4'", był nieprawdą (sprostowane 2026-09-02
  w trzech miejscach: tu, `status.mjs`, reguła 17). Pole przyjmuje dziś wyłącznie kody
  (`PIK-02`), a powód niedomknięcia należy do raportu działu. Rola kończąca
  w jednym przebiegu zapisywała też `runda 0/5`, czyli wyglądała jak rola,
  która nie zrobiła nic. Pilnuje reguła 17.
- **Krytycy mieli zgłaszać własne znaleziska, nie wiedząc czym.** 19 z 19
  `KRYTYK.md` nakazywało zgłoszenie usterki checklisty, 0 z 19 podawało drogę —
  sekcję „Jak zgłaszasz" miał wyłącznie `AGENT.md`. Krytyk w próbie zgłosił
  dwie prawdziwe usterki PROZĄ i obie przepadłyby razem z sesją. Pilnuje
  reguła 18; sekcja weszła też do `audyt/szablony/KRYTYK.md`, więc E7 ją
  dziedziczy.

**Zgłoszenie krytyka idzie pod kodem JEGO roli, nie pod `KON`** — mimo że
`KON-A6` pyta o tę samą klasę. Zasada 3 zabrania przekazywania znaleziska
komukolwiek, a oba pomiary są różne: Konrad atakuje zakresy **przed** pracą
działów, krytyk widzi checklistę **w działaniu**.

---

## Cykl życia zgłoszenia

```
  agent znajduje                         checklista, pozycja <KOD>-NN
        │
        ▼
  zgloszenie.mjs --plik=…                ODMAWIA bez dowodu, bez miejsca
        │                                albo gdy miejsca NIE MA w kodzie
        ▼
  AUD-<DZIAŁ>-NNN + hash miejsca         ID nadaje NARZĘDZIE, nie agent (§11)
        │
        ▼
  status: DO WERYFIKACJI
        │
        ├─▶ krytyk roli          PRZEPUSZCZAM / ODRZUCAM z powodem
        ├─▶ Golden (bramka)      13 zasad — na WYJŚCIU działu, nie w trakcie
        └─▶ weryfikator (WER)    czy problem istnieje — poza audytem (§16)
        │
        │   werdykt.mjs --id=… --kto=krytyk|weryfikator --werdykt=…
        │   odrzucenie MUSI mieć powód; werdyktu nie da się nadpisać
        ▼
  status: ZWERYFIKOWANE          dopiero po OBU werdyktach
                                 (istnieje albo odrzucone — wpis ZOSTAJE)
        │
        ▼
  kierownik zbiera → RAP → raport końcowy
```

**Odrzucone zgłoszenie nie znika.** Druga fala musi trafić na to samo miejsce
i dojść do tego samego wniosku; skasowany wpis zafałszowałby porównanie.

---

## Kto co uruchamia

| Komenda | Kto | Kiedy |
|---|---|---|
| `node audyt/tools/migawka-wartosci.mjs --zapisz=przed` | kierownik | przed pierwszą falą — **bez niej `status.mjs` odmawia każdej zmiany stanu** |
| `node audyt/tools/mapa.mjs` | kierownik | przed falą i po niej |
| `node audyt/tools/status.mjs --rola=X --fala=N --status=…` | każda rola | na starcie i na końcu |
| `node audyt/tools/status.mjs --rola=X --fala=N --runda` | rola pętlowa | co rundę |
| `node audyt/tools/status.mjs --pokaz --historia` | kierownik | KIER-05: kolejność wejść z datami, per dział |
| `node audyt/tools/zgloszenie.mjs --plik=…` | każda rola | przy znalezisku |
| `node audyt/tools/werdykt.mjs --id=… --kto=krytyk --werdykt=…` | krytyk roli | po ocenie zgłoszenia |
| `node audyt/tools/werdykt.mjs --id=… --kto=weryfikator --werdykt=…` | weryfikator (WER) | po sprawdzeniu zjawiska |
| `node audyt/tools/werdykt.mjs --pokaz` | kierownik | gdy zbiera wyniki działu |
| `node audyt/tools/porownaj-cykle.mjs` | kierownik | po obu falach |
| `node audyt/tools/polacz-sektory.mjs --fala=N` | kierownik | po re-audycie |
| `node audyt/tools/migawka-wartosci.mjs --porownaj` | kierownik | na koniec |
| `node audyt/tools/straznik-sektora-audytu.mjs` | każdy | przed commitem |
| `node audyt/tools/audyt-straznika-sektora.mjs` | przy zmianie strażnika | zawsze |

---

## Progi i sufity — rozstrzygnięcia właściciela (2026-09-01)

| Co | Wartość | Skutek przekroczenia |
|---|---|---|
| Nośnik wyników | **200 zgłoszeń** | powyżej — SQLite; format wpisu bez zmian, zmienia się warstwa zapisu |
| Rundy agenta pętlowego (W3) | **5** | rola kończy i **musi wypisać niedomknięte pozycje**; cisza po suficie jest luką |

`node:sqlite` jest w standardzie node 26, więc przejście na bazę nie dokłada
zależności.

---

## Kolejność sektorów (§17, W5, K9')

```
MAPA PRZED                                    (drzewo sektora, gałąź <sektor>/sektor-…)
  │
  ├─ AUDYT fala 1        działy równolegle MIĘDZY SOBĄ
  │     └─ dział kończy → re-audyt może wejść WŁAŚNIE DO NIEGO
  ├─ RE-AUDYT fala 1     nigdy na tym samym dziale co audyt
  │     └─ commit: audyt/zgloszenia/*-F1-*, audyt/stan/*-f1-*
  │
  ├─ fala.mjs --postaw=2   worktree obok repo, gałąź <sektor>/fala-2 od TEGO SAMEGO commita,
  │     │                  sparse checkout BEZ *-F1-*, *-f1-* i wyniki/; generat i migawka w worktree
  │     ├─ AUDYT fala 2        na NIEZMIENIONYM kodzie; wpisów fali 1 NIE MA na dysku
  │     ├─ RE-AUDYT fala 2     status.mjs odmawia wejścia, gdy w drzewie widać POLE fala: 1
  │     └─ commit w worktree: *-F2-*, *-f2-*
  ├─ fala.mjs --scal=2     merge <sektor>/fala-2 → gałąź sektora (same nowe pliki), worktree usunięty
  │
  ├─ porownaj-cykle.mjs        NAZYWA wynik, nie ocenia (K4″); także --dzial=<KOD>   (PEŁNE drzewo)
  │     ├─ ZGODNE    → błędy potwierdzone → NAPRAWA (osobny krok)
  │     ├─ NADZBIÓR  → która fala i o ile → raport do lektury właściciela
  │     ├─ SPRZECZNE → raport do lektury właściciela; decyzja jego, nie narzędzia
  │     └─ PODEJRZENIE KOLEJNOŚCI → nazwane, kod 0 (sygnał, nie dowód)
  │        kod 1 WYŁĄCZNIE przy podejrzeniu kopiowania (ślepota fali 2) albo braku fali
  │
  └─ MAPA PO → migawka-wartosci.mjs --porownaj
```

**Ślepota fali 2 ma CZTERY warstwy** (pakiet E7.7, pozycja 4; do 2026-09-02 były
trzy: zakaz w prompcie, czysty kontekst subagenta, kontrola kopii — a z nich
naprawdę działała jedna, czysty kontekst, bo zakaz stał wyłącznie w definicji
kierownika, a wpisy fali 1 leżały w tym samym katalogu):

1. **definicje** — zdanie zakazu czytania wpisów, stanu i wyników innej fali
   w każdej z 80 definicji i w obu szablonach (zrobione 2026-09-02, pozycje 4b + 6;
   reguła 27, wycofane K4′ pilnuje 27b);
2. **narzędzie** — identyfikator niesie falę (`AUD-SEC-F2-001`, pula numerów
   per fala), a `zgloszenie.mjs` po zapisie drukuje TYLKO ID i hash; liczba
   wpisów i próg 200 żyją w `status.mjs --pokaz` kierownika. Reguła 19′;
3. **dysk** — fala 2 pracuje w worktree ze sparse checkoutem bez `*-F1-*`,
   `*-f1-*` i `wyniki/` (`fala.mjs`), a `status.mjs` odmawia wejścia fali 2
   po POLU `fala`, niezależnie od gita. Reguły 26, 28, 29;
4. **porównanie** — `porownaj-cykle.mjs` nazywa **podejrzenie kopiowania**
   (stwierdzenie identyczne co do słowa → kod 1) i **podejrzenie kolejności**
   (identyczny zbiór miejsc działu w tej samej kolejności zgłaszania → kod 0,
   nazwane). Bez tego „ten sam wynik" wychodziłby zawsze, także gdyby audyt był
   zepsuty.

Re-audyt fali N czyta audyt fali N — to jego sens (W4, łączenie po haszu);
zakaz dotyczy INNEJ fali. `KIER` i `RAP` po obu falach pracują w pełnym
drzewie (porównanie i raport). Wpisy próbne z E6/E7 noszą `-F1-` jak wszystkie
inne — jeden format, zero wyjątków w regułach.

---

## Czego szkielet nie rozstrzyga

- ~~treści ról~~ **powstały w E5** — 19 katalogów w `audyt/role/`, 76 plików;
- **przebiegu** — sektor nie rusza bez zielonego światła właściciela (D10);
- **napraw** — sektory nie naprawiają, nigdy (W2).
