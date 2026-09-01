# Plan budowy sektorów AUDYT i RE-AUDYT

## Context

Projekt `Pod strona Szkolenia` (Automatic AI) jest domknięty merytorycznie: trzy wtyczki
WordPressa skończone i przetestowane ręcznie, etap WP zamknięty, a z trzech ostatnich
kroków wykonane są SEO (0.60.x), higiena repo (0.62.0/0.63.0) i schematy draw.io (0.64.0).
Zostaje **audyt końcowy** — ostatni krok projektu.

Audyt ma być **osobnym sektorem projektu**: zestawem wyspecjalizowanych agentów z własnymi
zakresami, dokumentacją, statusami, kodami zgłoszeń i warstwą kontrolną. Po nim wchodzi
**drugi, osobny sektor — RE-AUDYT**, który sprawdza to samo **szczegółowiej**.

**Cel tego kroku: ZBUDOWAĆ oba sektory. Nie uruchamiać ich.**

> „dobry audyt i dobry re-audyt = dobrze wykonany projekt, więc dopracujemy go jak tylko
> się da" — właściciel, 2026-09-01

---

## TRZY ZASADY NADRZĘDNE OBU SEKTORÓW

Wchodzą **dosłownie** do każdej z ~80 definicji (`AGENT.md`, `KRYTYK.md`, `SKILL.md`).

### 1. NIE MA WYMYŚLANIA BŁĘDÓW
Każde zgłoszenie ma podstawę i możliwość potwierdzenia. Brak dowodu = brak zgłoszenia.
Egzekwowane maszynowo: `zgloszenie.mjs` **odmawia zapisu** wpisu bez dowodu.

### 2. AUDYT I RE-AUDYT NIE NAPRAWIAJĄ (W2)
Sektory **znajdują i wskazują**, nigdy nie poprawiają. Produktem jest **odizolowane
miejsce** błędu. Naprawa jest osobnym krokiem, po dwóch pełnych cyklach.

### 3. SWÓJ ZAKRES — DRĄŻYĆ, NIE PRZEKAZYWAĆ (W10)
Gdy Security znajdzie błąd, **pracuje nad nim sam**: schodzi głębiej, aż wskaże miejsce.
Nie przekazuje go innemu działowi dlatego, że dotyka cudzego obszaru, i **nie naprawia**.

---

## POWTARZALNOŚĆ JAKO ZASADA BUDOWY (rozstrzygnięcie K4)

Stanowisko właściciela: **druga fala MUSI dać ten sam wynik. Jeśli nie da — źle zrobiliśmy
audyt.** Rozbieżność między cyklami nie jest powodem do odrzucania znalezisk, tylko
**sygnałem defektu sektora**: wracamy naprawić audyt i powtarzamy, a nie idziemy naprawiać
projekt.

To rozstrzygnięcie ma konsekwencję, która zmienia sposób budowy wszystkich ról:

> **Audyt nie może być swobodnym przeglądem — musi być listą sprawdzeń.**
> Tylko taki daje ten sam wynik przy drugim przebiegu, mimo że model nie jest
> deterministyczny.

W praktyce, dla każdej roli:

- **zakres definiowany mechanicznie** — lista plików/wzorców, nie „przejrzyj obszar";
- **kryteria znaleziska twarde** — checklista pytań z odpowiedzią tak/nie, nie intuicja;
- **wyczerpanie zamiast pomysłowości** — agent pętlowy (W3) kończy, gdy **przeszedł całą
  listę**, a nie gdy „nic już nie przychodzi mu do głowy";
- **dowód = hash miejsca**, więc porównanie cykli jest maszynowe, nie uznaniowe.

Sektor zbudowany inaczej **nie przejdzie własnego testu powtarzalności** — i o to chodzi.

---

## Fakty — zmierzone 2026-09-01

Trzy liczby z pierwszej wersji były błędne i są sprostowane; dwie wyszły z pomiaru, który
mierzył nie to, co trzeba.

| Co | Wartość | Uwaga |
|---|---|---|
| Kod wtyczek WP | **24 144 linie**, 107 plików PHP, **54 klasy** (28/13/13) | |
| Szablony PHP | **37** | |
| Prototyp Next.js | **15 371 linii**, 106 plików TS/TSX | |
| Strażnicy | **39** ~~40~~ | `uruchom-wszystkie.mjs` nie jest strażnikiem |
| Mutacje | **340** | |
| Testy jednostkowe | **83** ~~89~~ | mój pomiar łapał `.test(` z RegExp |
| Bramki smoke | **25** (7 w `npm run check`, 15 WP, 3 pomocnicze) | |
| Szwy między wtyczkami | **7** ~~6~~ | `aai_sklep_dostepnosc_kursu` ma wystrzał wieloliniowy (`class-aai-sklep-seo.php:293`) |
| `.claude/` w repo | **nie istnieje** | budujemy od zera |
| `CLAUDE.md` | **237 476 B**, 3384 linie | |
| Dokumentacja techniczna | **65 MB**, 3244 pliki (w gicie 75) | |
| Przeglądarki | tylko Firefox; **Chrome dokładamy** (decyzja właściciela) | Lighthouse mamy dziś przez PSI (API v5 Google) |

---

## Decyzje właściciela (wiążące)

| # | Rozstrzygnięcie |
|---|---|
| D1 | Agenci **wykonywalni ORAZ udokumentowani**: `.claude/agents/*.md` generowane ze źródła wg §4 |
| D2 | **Dwóch kierowników — po jednym na sektor**, obaj z krytykami |
| D3 | **Krytyk przy KAŻDEJ roli.** Krytycy dostają **te same 7 rodzajów dokumentacji** |
| D4 | Zakres: wtyczki + prototyp + bramki + repo. **KURSY POZA ZAKRESEM** |
| D5 | Błędy prototypu **zapisujemy i przekazujemy osobie sprawdzającej projekt** |
| D6 | Działy: **7 ze schematu + 7 naszych** |
| D7 | Sektory **żyją tylko na branchach**, nigdy na `main`, zostają na zawsze |
| D8 | Model: **kierownicy i krytycy — Opus; reszta — Sonnet** |
| D9 | **Komplet AUDYTU, potem komplet RE-AUDYTU** — nie częściami |
| D10 | Uruchomienie na **zielone światło właściciela** |
| P1 | **Konrad łamie założenia W AUDYCIE**, nie w projekcie |
| P2 | **RE-AUDYT nie jest lustrzany — jest bardziej szczegółowy** |
| P3 | **Dokumentacja specjalistyczna dla każdej roli**, która potrzebuje więcej |
| P4 | **Dokumentacja agentowa z wielu AI** — Anthropic, OpenAI, Google i inni |
| W1 | Wartości obu sektorów trafiają do **raportu** |
| W2 | **Sektory NIE naprawiają** |
| W3 | **Agenci pętlowi** — drążą, dopóki nie wyczerpią listy |
| W4 | Wyniki: **mało → plik, dużo → baza danych** |
| W5 | **Audyt wychodzi z działu → dopiero wtedy re-audyt do niego wchodzi** |
| W6 | **Mapa projektu przed i po** |
| W7 | Dział: **co było na początku, ma być na końcu** |
| W8 | Dział **„Usprawnienia audytowe"** — narzędzia do testów automatycznych |
| W9 | **„NIE MA WYMYŚLANIA BŁĘDÓW" do każdego agenta** |
| W10 | Audytor **drąży do miejsca**, nie przekazuje i nie naprawia |
| **K4′** | **Druga fala musi dać ten sam wynik**; rozbieżność = defekt audytu, nie powód do odrzucenia znaleziska |
| **K9′** | Działy **mogą pracować równolegle**, byle audyt i re-audyt **nie nakładały się na tym samym dziale** |
| **K10′** | Miejsce błędu: linia kodu **albo** plik + zakres + nazwa mechanizmu (dla braków i wyścigów) |
| **K11′** | **Dokładamy Chrome** do narzędzi automatycznych |
| **K12′** | **Komunikacja między działami wg schematu właściciela**, z naszymi działami wstawionymi w odpowiednie miejsca |

---

## Struktura i komunikacja (K12′) — schemat właściciela z naszymi działami

```
                        ┌──────────────────────────────┐
                        │      AUDYTOR KIEROWNIK       │   Opus + krytyk
                        │  koordynuje, zbiera wyniki   │
                        └───────────────┬──────────────┘
     ┌────────────────┬─────────────────┼─────────────────┬────────────────┐
     │                │                 │                 │                │
┌────┴─────┐    ┌─────┴─────┐    ┌──────┴─────┐    ┌──────┴──────┐  ┌──────┴──────┐
│ SECURITY │    │ FRONTEND  │    │  BACKEND   │────│ BAZA DANYCH │  │  ARCHITEKT  │
└────┬─────┘    └─────┬─────┘    └──────┬─────┘    │ + migracja  │  └──────┬──────┘
     │                │                 │          └─────────────┘         │
┌────┴───────┐  ┌─────┴──────┐   ┌──────┴──────────┐              ┌────────┴───────┐
│ PRYWATNOŚĆ │  │  PROTOTYP  │   │   INTEGRACJE    │              │  PRAWDA REPO   │
│ i zgodność │  │  Next.js   │   │ z cudzym kodem  │              │                │
└────────────┘  └────────────┘   └─────────────────┘              └────────────────┘

┌──────────────┐   ┌──────────────┐   ┌──────────────────┐   ┌──────────────────┐
│ QA / TESTING │───│ USPRAWNIENIA │   │  PERFORMANCE     │   │ POCZĄTEK I KONIEC│
│              │   │  AUDYTOWE    │   │                  │   │                  │
└──────────────┘   └──────────────┘   └────────┬─────────┘   └──────────────────┘
                                               │
                                     ┌─────────┴──────────┐
                                     │ WDROŻENIE          │
                                     │ i eksploatacja     │
                                     └────────────────────┘

  ╔═══════════════╗                              ╔══════════════════════════╗
  ║ AGENT KONRAD  ║  celuje W AUDYT (P1)         ║ GOLDEN                   ║
  ║ łamie założenia działów audytu               ║ pilnuje zasad i skilli   ║
  ╚═══════════════╝                              ╚══════════════════════════╝

- - - - - - - - - - - - - - -  POZA AUDYTEM  - - - - - - - - - - - - - - - - - -
                        ┌──────────────────────────────┐
                        │     AUDYTOR WERYFIKATOR      │  czy problem istnieje
                        └───────────────┬──────────────┘
                        ┌───────────────┴──────────────┐
                        │       AUDYTOR RAPORTU        │  raport na sam koniec,
                        └──────────────────────────────┘  gdy wszyscy skończą
```

**Siedem ze schematu:** Security · Frontend · Backend · Baza danych · QA/Testing ·
Performance · Architekt.
**Siedem naszych:** Integracje z cudzym kodem · Prywatność i zgodność · Prawda repo ·
Wdrożenie i eksploatacja · Prototyp Next.js · Początek i koniec · Usprawnienia audytowe.

Każdy nasz dział jest podwieszony pod najbliższym pokrewnym ze schematu — komunikacja
biegnie tak, jak na Twoim rysunku, a Kierownik zbiera wszystko. **Migracja danych weszła
do działu „Baza danych"** (na schemacie BD jest połączona z Backendem, a migracja
Postgres → nasze tabele → Tutor/Woo to obszar danych); jeśli wolisz ją jako osobny,
piętnasty dział — powiedz.

### Zakresy działów
| Dział | Co bierze |
|---|---|
| Security | nonce, capability, escaping, SQL, XSS, obwód, CSP, limiter, brama kreatora |
| Frontend | 37 szablonów, `assets/*`, kolektor panelu, kaskada i warstwy, dostępność |
| Backend | trzy warstwy zapisu, haki, kontrakty, cykl żądania |
| Baza danych + migracja | `$wpdb`, dbDelta, transakcje, indeksy; Postgres ↔ nasze tabele ↔ Tutor ↔ Woo; idempotencja; cicha utrata treści |
| QA / Testing | 39 strażników, 340 mutacji, 25 bramek, 83 testy — **czy mierzą to, co obiecują** |
| Performance | zapytania na odsłonę, N+1, cache, waga stron |
| Architekt | granice wtyczek, **7 szwów**, cykle, źródło prawdy, zgodność ze schematami |
| Integracje z cudzym kodem | Tutor LMS 4.0.7, WooCommerce 11, motyw; wersje |
| Prywatność i zgodność | IP, retencja 90 dni, polityka prywatności, zobowiązania handlowe |
| Prawda repo | README, CLAUDE.md, CHANGELOG, schematy vs kod, instrukcja i paczki ZIP |
| Wdrożenie i eksploatacja | instalacja u klienta, aktywacja/`uninstall.php`, zależności, `postaw.sh` |
| Prototyp Next.js | 15 371 linii TS/TSX; wynik dla osoby sprawdzającej projekt (D5) |
| Początek i koniec | czy **zamierzone na starcie jest na końcu**: PLAN.md §2.4, WYTYCZNE, decyzje właściciela, obietnice D1–D7 / W1–W6 / P0–P6 / T0–T4 |
| Usprawnienia audytowe | **narzędzia do testów automatycznych**: `npm run check`, 15 bramek WP, Lighthouse przez PSI, **Chrome DevTools** (K11′), rig Firefox/BiDi, audyt mutacyjny — dostarcza pozostałym twarde liczby zamiast opinii |

**Tabela granic obowiązkowa** — dla każdej pary sąsiadów (Security↔Prywatność,
Backend↔BD, QA↔Usprawnienia, Architekt↔Prawda repo, Architekt↔Początek i koniec,
Frontend↔Prototyp) zdanie „to należy do X, nie do Y". Przy 14 działach jest to warunek
powtarzalności, nie kosmetyka: nieostra granica znaczy, że w drugiej fali znalezisko
trafi do innego działu i wynik się rozjedzie.

### Agent Konrad (P1)
**Konrad audytuje AUDYT, nie projekt.** Produktem są **luki w audycie**. Faza A (przed
pracą działów) atakuje **zakresy** — czy podział zostawia szczeliny, co nie należy do
nikogo. Faza B (po raportach) atakuje **wyniki** — „Security sprawdził wszystkie ścieżki
wejścia" jest dla niego hipotezą do obalenia. Łamanie założeń **systemu** („co, jeśli baza
nie odpowiada") zostaje przy działach, w ich zakresach.

---

## Przebieg (W5 + K9′)

```
MAPA PRZED
  │
  ├─ AUDYT: działy pracują RÓWNOLEGLE między sobą
  │     └─ dział kończy → re-audyt może wejść WŁAŚNIE DO NIEGO
  ├─ RE-AUDYT: wchodzi do działu dopiero po wyjściu audytu z tego działu
  │
  ├─ WYNIK CYKLU 1  →  łączenie audyt + re-audyt (plik/baza)
  │
  ├─ CYKL 2 na NIEZMIENIONYM kodzie, ślepy na wyniki cyklu 1
  │
  ├─ PORÓWNANIE: ten sam wynik?
  │     ├─ TAK  → błędy potwierdzone → NAPRAWA → KONIEC
  │     └─ NIE  → DEFEKT AUDYTU → naprawiamy sektor i powtarzamy (K4′)
  │
  └─ MAPA PO  →  porównanie wartości początku i końca  →  przegląd mapy
```

**Reguła nakładania (K9′):** równoległość **wewnątrz** sektora jest dozwolona; audyt
i re-audyt **nigdy nie pracują na tym samym dziale jednocześnie**. Re-audyt jest krokiem
do tyłu.

---

## SEKTOR RE-AUDYT — inny, nie lustrzany (P2)

Te same obszary, **inna praca**. Audyt ustala **obraz**; re-audyt mierzy **zasięg**,
potwierdza uruchomieniowo i zabezpiecza przed nawrotem. **Też nie naprawia.**

| | AUDYT | RE-AUDYT |
|---|---|---|
| Pytanie | „czy tu jest problem?" | „ile go dokładnie jest i czy cokolwiek to łapie?" |
| Metoda | lektura kodu i dokumentacji | **uruchomienie** na `:8892`, pomiar, mutacja |
| Dowód | miejsce w kodzie | odtworzenie + liczba wystąpień w całym repo |
| Zasięg | jedno wystąpienie wystarczy | **wszystkie** wystąpienia klasy |
| Skutki uboczne | poza zakresem | sprawdza regresję (goldeny, §5) |
| Produkt | lista zgłoszeń | zgłoszenia pogłębione + **projekt strażnika** |

**„Psy" mają gotowe narzędzie: audyt mutacyjny.** Psiarz psuje kod dokładnie w miejscu
znaleziska i patrzy, **czy cokolwiek szczeka** — strażnik, test, bramka. Milczenie przy
zepsutym kodzie jest osobnym znaleziskiem. `audyt-straznikow.mjs` robi dokładnie to na 340
mutacjach, tylko dla strażników.

**Role (każda z krytykiem):** kierownik re-audytu · **Pogłębiacz** ×14 obszarów · **Psiarz**
· **Skutki uboczne** · **Strażnikowy** · **Walidacja szczegółowa** · **Raport re-audytu** ·
**Konrad re-audytu**. Razem 21 ról, 42 agentów.

**Sektor AUDYT:** kierownik + Golden + 14 działów + Konrad + weryfikator + raport = **19 ról,
38 agentów**. Oba sektory: **40 ról, 80 agentów.**

---

## Zgłoszenie — co musi zawierać

| Pole | Wymóg |
|---|---|
| ID | `AUD-SEC-001` — nadaje `zgloszenie.mjs`, nie agent |
| Status | NIE ROZPOCZĘTO / W TRAKCIE / DO WERYFIKACJI / ZWERYFIKOWANE / ZAKOŃCZONE |
| Agent / dział | kto wykrył |
| Stwierdzenie | jednoznaczne, nie „wydaje mi się" |
| **Miejsce** | linia kodu **albo** plik + zakres + nazwa mechanizmu (K10′) |
| Dowód | co potwierdza; **hash miejsca** liczony maszynowo |
| Klasyfikacja | kategoria |
| Wpływ | dlaczego to ma znaczenie dla projektu |

**K10′ w praktyce:** część realnych błędów tego projektu nie miała jednej linii — brak
klucza kasujący dane, kolejność dwóch zapisów, wyścig, **brakująca** kontrola. Dla nich
forma bez pojedynczej linii **musi nazwać, czego brakuje i gdzie to powinno być**. Wpisanie
zmyślonej linii łamałoby zasadę 1.

---

## Nośnik wyników (W1, W4)

| Skala | Nośnik | Dlaczego |
|---|---|---|
| do ~200 zgłoszeń | **pliki JSON w repo sektora** | wersjonowalne, diffowalne, przeżywają `/clear` |
| powyżej | **baza SQLite w katalogu sektora** | zapytania, łączenie cykli, brak puchnięcia repo |

Format zgłoszenia **ten sam w obu nośnikach** — zmienia się warstwa zapisu, nie dane.
Łączenie audytu z re-audytem po **hashu miejsca**, nie po opisie. Próg 200 do Twojej
akceptacji.

---

## Mapa i wartości (W6)

`migawka-wartosci.mjs` zapisuje wartości **początku i końca**: liczby bramek (39/340/83/25),
sumy kontrolne plików produktu, stan tabel, `wp:sprawdz`, `wp:tutor`, `git diff` wobec
`main`. Rozjazd = **zatrzymanie procesu**, nie notatka. `mapa.mjs` pokazuje, czy każdy plik
ma przypisany dział; **sierota = plik, którego nie bierze nikt**.

---

## Siedem rodzajów dokumentacji — krok najważniejszy

| Rodzaj | Stan | Do zrobienia |
|---|---|---|
| 1. Dziedzinowa | **BRAK** | e-commerce, LMS, prawo konsumenckie, RODO |
| 2. Techniczna | **JEST 9,6 MB** + `d1–d6` | dociągnąć: bezpieczeństwo wtyczek, wydajność, dostępność |
| 3. Projektu | **JEST** — 118 `.md`, CLAUDE.md, CHANGELOG, 7 schematów | **BRIEF-PROJEKTU.md** |
| 4. Funkcjonalna | **JEST** — DIAGRAM.md ×3, KREATOR.md, INSTRUKCJA-INSTALACJI.md | spis funkcji z granicami |
| 5. Specjalistyczna | **BRAK** | **per rola** (P3) |
| 6. Systemowa | **BRAK** | przeglądarki, hosting, PHP/MySQL, mobile |
| 7. Agentowa | częściowo | **wielu dostawców** (P4) |

**Specjalistyczna — mechanizm zamiast zgadywania (P3):** każda rola **deklaruje w swoim
`AGENT.md`, czego potrzebuje ponad standard**; `DOKUMENTACJA.md` zbiera to w tabelę.
Kandydaci: Konrad — metody podważania założeń; Security — OWASP i hardening wtyczek;
Performance — profilowanie i `EXPLAIN`; Prywatność — RODO/UODO; QA — testowanie mutacyjne;
Usprawnienia — Lighthouse i **Chrome DevTools Protocol**; Integracje — **kod źródłowy Tutora
i Woo z dysku** (dokumentacja Tutora rozjeżdża się z jego kodem).

Braki dociąga `tools/pobierz-dokumentacje-audyt.mjs` — idempotentny, **eksportujący
manifest** `KATALOG_DZIALU` / `KATALOGI_MASOWE`, bo `straznik-wagi-dokumentacji` bez tego
zapala się celowo. Powyżej 8 MB obowiązuje N2.

**BRIEF-PROJEKTU.md decyduje o wykonalności.** Wszyscy mają wiedzieć wszystko o projekcie,
ale samo `CLAUDE.md` to 237 476 B; przy 80 agentach i dwóch cyklach to dziesiątki megabajtów.
Brief (~400 linii: architektura, 7 szwów, decyzje wiążące, klasy błędów, mapa obszarów) daje
tę samą wiedzę za ułamek kosztu — i, co ważniejsze dla K4′, **jest identyczny w obu falach**,
więc nie wprowadza rozjazdu.

---

## Funkcje kodu — `tools/audyt/`

| Skrypt | Co robi |
|---|---|
| `zgloszenie.mjs` | nadaje ID, waliduje pola, liczy **hash miejsca**, **odmawia** przyjęcia bez dowodu i bez miejsca |
| `status.mjs` | pięć statusów + licznik rund pętli |
| `migawka-wartosci.mjs` | wartości początku i końca (W6) |
| `mapa.mjs` | pokrycie: każdy plik przypisany do działu; sieroty |
| `porownaj-cykle.mjs` | porównanie fal po hashach; **rozjazd = defekt audytu** (K4′) |
| `polacz-sektory.mjs` | łączy audyt i re-audyt (W4), plik albo baza |
| `generuj-agentow.mjs` | `audyt/**/AGENT.md` → `.claude/agents/aud-*.md` |

**`straznik-sektora-audytu.mjs`** pilnuje: (1) branch nie zmienia kodu produktu, (2) każda
rola ma krytyka, (3) komplet pięciu elementów, (4) generat aktualny wobec źródła (sha256,
wzór ze `straznik-schematow`), (5) każde zgłoszenie ma dowód, kod i miejsce, (6) **każda
definicja zawiera trzy zasady nadrzędne** (W9), (7) **każda rola ma mechanicznie zdefiniowany
zakres i checklistę** — warunek powtarzalności z K4′. Plus mutacje w audycie mutacyjnym.

**Ślepota cyklu 2:** agenci fali 2 nie mogą widzieć wyników fali 1 — inaczej przepiszą cudzą
listę i „ten sam wynik" wyjdzie zawsze, także gdyby audyt był zepsuty. Trzy warstwy: zakaz
w prompcie, czysty kontekst subagenta, kontrola w `porownaj-cykle.mjs`.

---

## Etapy budowy

| # | Etap | Wynik |
|---|---|---|
| **E0** | Zaległość CI (poza sektorem) | dependabot PR #106 zielony, **gitleaks potwierdzony** |
| **E1** | Utrwalenie | branch `audyt/sektor-audytu`, `audyt/REGULAMIN.md` z Twoim opisem co do punktu, wpis do pamięci projektu |
| **E2** | Szkic ról i **tabela granic** | kto istnieje, po co, gdzie granice |
| **E3** | Dokumentacja (7 rodzajów) + Chrome | inwentarz, skrypt pobierający, `ZRODLA.md`, **BRIEF-PROJEKTU.md**, instalacja Chrome'a |
| **E4** | Szkielet | `STRUKTURA.md`, `DOKUMENTACJA.md`, szablony, `tools/audyt/*`, strażnik + mutacje |
| **E5** | 19 ról × (AGENT + KRYTYK + SKILL + golden) | ~76 plików sektora AUDYT, każdy z checklistą |
| **E6** | Generat i próba na sucho | `.claude/agents/aud-*.md`; jedna rola przez pełną ścieżkę |
| **E7** | Sektor RE-AUDYT | branch `re-audyt/sektor-re-audytu`, 21 ról + psy |
| **E8** | **STOP — zielone światło** | dopiero potem MAPA PRZED → cykl 1 → cykl 2 → porównanie → naprawa → MAPA PO |

Commity na branch w trakcie pracy, **żadnego PR-a ani merge'a** (D7, D9).

**Co akceptujesz po drodze:** wynik każdego z E1–E7 przed startem następnego; osobno próg
plik→baza, limit rund pętli, tabelę granic, treść `BRIEF-PROJEKTU.md` i szkic każdej roli.

---

## Definicja ukończenia sektora

Kody wyjścia **bez potoku**.

1. `straznik-sektora-audytu.mjs` → kod 0
2. `audyt-straznikow.mjs straznik-sektora-audytu` → 0 przeoczonych, 0 martwych
3. `git diff main -- . ':!audyt' ':!tools/audyt' ':!.claude'` → **puste**
4. `mapa.mjs` → zero plików bez działu
5. `zgloszenie.mjs --test` → bez dowodu i bez miejsca **odrzucone**, komplet przyjęty
6. `generuj-agentow.mjs --sprawdz` → generat zgodny ze źródłem
7. próba na sucho jednej roli → status ZWERYFIKOWANE
8. **test negatywny każdej nowej kontroli** — reguła celuje w rozstrzygnięcie, nie w nazwę
9. `migawka-wartosci.mjs` przed i po → identyczne
10. każda rola ma **mechaniczny zakres i checklistę** (warunek K4′)
11. na `main` bez zmian: `npm run check` kod 0, strażnicy 39/39, mutacje 340, testy 83/83

---

## Krytyka planu — co zostało po Twoich rozstrzygnięciach

Rozstrzygnięte przez Ciebie: **K4** (druga fala musi się zgadzać; rozjazd = defekt audytu),
**K9** (równoległość tak, nakładanie nie), **K10** (dwie formy miejsca), **Chrome** (dokładamy).

Zostają uwagi, które wprowadziłem sam i o których warto wiedzieć:

**K1.** Krytyk dostaje **raport i dowody do punktowego otwarcia**, nie cały obszar — inaczej
koszt podwaja się bez zysku.
**K2.** `mapa.mjs` ma definicję obszaru: plik z `git ls-files`; sierota = plik niczyj.
**K3.** **Nie da się technicznie zabronić agentowi pisania po kodzie** — frontmatter
ogranicza narzędzia, nie ścieżki, a `Bash` umie pisać. Audytorzy nie dostają `Write`, ale
prawdziwą gwarancją jest kontrola po fakcie (`git diff` + migawka). Piszę wprost, bo
obietnica „agent nie może" byłaby nieprawdą.
**K6.** Tabela granic jest teraz **warunkiem powtarzalności**, nie kosmetyką — przy nieostrej
granicy druga fala przypisze znalezisko innemu działowi i wynik się rozjedzie.
**K7.** Krytyk Goldena ma wąskie zadanie: czy Golden nie **blokuje pracy bez podstawy**.
**K8.** Sektor nie jest pilnowany bramkami z `main` (D7) — strażnik sektora żyje na branchu
sektora i tam jest uruchamiany. Świadomy koszt.

---

## Koszt

Budowa (E1–E7) jest **tania** — to pisanie plików. Drogie jest uruchomienie: 80 agentów,
dwie fale, agenci pętlowi dokładają rundy — **ponad 150 uruchomień**, rząd wielu milionów
tokenów, **nie zmieści się w jednej sesji**. Dlatego wyniki lądują w pliku/bazie natychmiast,
a nie w kontekście rozmowy.

Koszt obniżają bez straty na jakości: BRIEF zamiast 237 KB `CLAUDE.md`, rozłączne zakresy,
podział modeli (D8), krytyk czytający raport zamiast obszaru (K1).

---

## Czego ten krok NIE robi

- **nie uruchamia audytu** — dopiero po zielonym świetle (D10);
- **nie naprawia niczego** — ani teraz, ani podczas obu cykli (W2);
- **nie dotyka kodu wtyczek, prototypu ani `main`** — pilnuje niezmiennik, strażnik i migawka;
- **nie audytuje kursów** — 73 lekcje prozy poza zakresem (D4);
- nie kasuje branchy sektorów — zostają na zawsze (D7).

---

## STAN BUDOWY (aktualizować po każdym etapie)

| Etap | Stan | Wynik |
|---|---|---|
| **E0** — zaległość CI | ✅ **ZROBIONE 2026-09-01** | CI zielone w całości pierwszy raz od 17 sierpnia; gitleaks potwierdzony; PR #117 (naprawa) i #118 (dependabot) zmergowane. Szczegóły: CHANGELOG, sekcja „Nieopublikowane" |
| **E1** — utrwalenie | ✅ **ZROBIONE, zaakceptowane przez właściciela** | gałąź `audyt/sektor-audytu`, [`audyt/REGULAMIN.md`](REGULAMIN.md) (520 linii), wpis w pamięci projektu, ten plik |
| **E2** — szkic ról i tabela granic | ✅ **ZROBIONE — czeka na akceptację** | [`ROLE.md`](ROLE.md) (707 linii): 19 ról, **522 pliki przypisane**, 183 pozycje checklist, odwzorowanie 30 klas `BLAD-*`; [`GRANICE.md`](GRANICE.md) (117 linii): 24 pary o przecięciu ≥5 plików |
| **E3** — dokumentacja (7 rodzajów) + Chrome | ✅ **ZROBIONE — czeka na akceptację** | [`BRIEF-PROJEKTU.md`](BRIEF-PROJEKTU.md) (15 kB wobec 240 kB `CLAUDE.md`), [`DOKUMENTACJA.md`](DOKUMENTACJA.md), [`ZRODLA-DOKUMENTACJI.md`](ZRODLA-DOKUMENTACJI.md), skrypt z manifestem; **4944 pliki / 44 MB** poza drzewem repo; Chrome 152 sprawdzony pomiarem |
| **E4** — szkielet | ✅ **ZROBIONE — czeka na akceptację** | [`STRUKTURA.md`](STRUKTURA.md), 4 szablony, **10 narzędzi** w `audyt/tools/`, strażnik sektora (9 kontroli) + **11 mutacji** (0 przeoczonych, 0 martwych) |
| **E5** — 19 ról × 4 pliki | ✅ **ZROBIONE — czeka na akceptację** | **76 plików źródłowych** w `audyt/role/<KOD>/` (AGENT + KRYTYK + SKILL + golden), **38 definicji** w generacie; strażnik **14 kontroli**, audyt mutacyjny **24 mutacje** (0 przeoczonych, 0 martwych) |
| **E6** — generat i próba na sucho | ⬜ **NASTĘPNY** (po akceptacji E5) | generat już powstaje (wymusza go reguła 4); zostaje **próba na sucho jednej roli przez pełną ścieżkę** |
| **E7** — sektor RE-AUDYT | ⬜ | gałąź `re-audyt/sektor-re-audytu`, 21 ról + psy |
| **E8** — STOP | ⬜ | **zielone światło właściciela** przed uruchomieniem |

**Właściciel akceptuje KAŻDY etap osobno** przed startem następnego.

## Fakty zmierzone przy E5 (nie wyprowadzać od nowa)

- **SKILLE NIE SĄ INSTALOWANE W HARNESSIE** — rozstrzygnięcie właściciela
  („czy nie da się zrobić tak, że skill będzie tylko na tym agencie, który go
  potrzebuje, tak samo jak Golden do agenta, a nie na całe repo od razu"),
  poparte trzema pomiarami: **nie istnieje pole `skills:`** w definicji agenta
  (frontmatter ma `name`, `description`, `tools`, `model`); **`Skill` to jedna
  pozycja w `tools:` — wszystko albo nic**, nie da się przydzielić podzbioru;
  a audytorzy **nie mają `Skill` w narzędziach**, więc skille w `.claude/skills/`
  byłyby widoczne w każdej sesji tego repo i **nieużywalne przez sektor**.
  `SKILL.md` jest plikiem roli, wskazywanym ścieżką; ślad dla GOLD-06 bierze się
  z artefaktów kroków procedury w wyjściu działu.
- **W PLIKACH RÓL ŚCIEŻKI PODAJEMY OD KORZENIA REPO, W KODZIE INLINE.** Treść
  `AGENT.md` jest KOPIOWANA do `.claude/agents/`, więc odsyłacz `../../GRANICE.md`
  przestaje tam wskazywać cokolwiek. Wykrył to **`straznik-linkow` z `main`,
  przy commicie, 28 martwymi odsyłaczami w czterech generatach naraz** — czyli
  sektor wywrócił bramkę wspólną dla całego repozytorium. **To jest druga twarz
  kosztu K8:** niezmiennik `git diff` nie widzi `.claude/`, ale strażnicy
  **skanują dysk**. Pilnuje tego reguła 14.
- **PUSTY KATALOG `audyt/role/` DAWAŁ PRZEJŚCIE PO PUSTCE.** Reguły 2, 3, 4 i 6
  pytały `existsSync`, a katalog istniał od E4 jako pusty — sześć kontroli
  iterowało po zerze i **milczało**, a wyjście wyglądało identycznie jak przy
  komplecie ról. Pusty katalog znaczy dziś to samo co brak katalogu: „pominięte"
  na ekranie. Bez tej poprawki cały E5 mógłby przejść na zielono przy zerze
  zbudowanych ról.
- **`zgloszenie.mjs` WYKONYWAŁ SIĘ PRZY IMPORCIE** i kończył proces kodem 1, więc
  strażnik nie mógł ponownie użyć `powodyOdmowy()`. Ta sama klasa co seed
  wykonujący się przy imporcie (0.33.0). Bramka głównego modułu użyta we wzorcu
  odpornym na spację w nazwie katalogu — `resolve(process.argv[1])` wobec
  `fileURLToPath`, nigdy sklejanie `file://` (BLAD-014).
- **REGUŁA 11 ZŁAPAŁA BŁĄD W MOICH WŁASNYCH GOLDENACH, zanim ktokolwiek zobaczył
  pliki.** Kotwice PROTO i USP to prawdziwe linie kodu, a w kodzie są cudzysłowy
  (`export const dynamic = "force-dynamic";`) — cztery bloki JSON w dwóch rolach
  naraz były niepoprawne. Bez tej reguły goldeny wyglądałyby dobrze i przestałyby
  cokolwiek mierzyć.
- **KONTRPRZYKŁAD Z E4 PRZESTAŁ BYĆ PRAWDZIWY.** Mutacja „dopisanie pozycji do
  checklisty NIE może zapalać strażnika" opisywała stan, w którym role nie
  istniały. Od E5 pozycja dopisana WYŁĄCZNIE do `ROLE.md` nigdy nie zostanie
  zadana, więc strażnik ma się zapalić (reguła 13). Kontrprzykładem jest teraz
  operacja kompletna: pozycja w obu plikach **plus regeneracja definicji**.
- **MUTACJA WIELU PLIKÓW MUSI REGENEROWAĆ GENERAT**, inaczej zapala regułę 4
  zamiast swojej i maskuje to, co miała sprawdzić. Regeneracja jest częścią
  operacji, którą mutacja udaje.
- **REGUŁA 12 ZOSTAŁA UTWARDZONA DOPIERO NA KOŃCU E5 i jest to nazwane wprost.**
  W trakcie budowy komplet ról był tylko **liczony i wypisywany** jako
  „pominięte" — czerwony strażnik w połowie partii nie pilnowałby niczego, tylko
  zaszumiał bramkę. Od chwili, w której wszystkie 19 ról istnieje, brak
  którejkolwiek jest błędem, bo `ROLE.md` opisywałby wtedy rolę bez definicji.
- **Kotwice goldenów — prawdziwe miejsca, po jednym na rolę.** Każda wskazuje
  linię z zakresu swojej roli, zweryfikowaną co do znaku; stwierdzenia są
  ćwiczeniem formy, oznaczonym banerem i polem
  `"klasyfikacja": "przyklad-dydaktyczny"`. Miejsce jest prawdziwe po to, żeby
  dało się je otworzyć **i** żeby strażnik zapalił się, gdy kod się zmieni,
  a golden zostanie w tyle.

| Rola | Kotwica | Rola | Kotwica |
|---|---|---|---|
| SEC | `class-aai-sklep-panel-akcje.php:68` | REPO | `README.md:63` |
| BE | `class-aai-sklep-zapis.php:559` | WDR | `uninstall.php:22` |
| BD | `class-aai-sklep-zapis.php:934` | PIK | `docs/PLAN.md:114` |
| INT | `class-aai-sklep-tutor.php:90` | KIER | `audyt/tools/status.mjs:38` |
| FE | `assets/panel.js:58` | GOLD | `audyt/REGULAMIN.md:256` |
| PERF | `class-aai-sklep-moje.php:207` | KON | `audyt/GRANICE.md:30` |
| PROTO | `app/szkolenia/page.serwer.tsx:20` | WER | `audyt/tools/zgloszenie.mjs:209` |
| USP | `tools/zrzuty/manifest.mjs:97` | RAP | `audyt/PLAN-BUDOWY.md:104` |
| QA | `audyt-straznikow.mjs:163` | ARCH | `class-aai-sklep-trasy.php:81` |
| PRIV | `class-aai-monitor-logowania.php:275` | | |

- **Trzy role dostały jawną listę rzeczy, których NIE zgłaszają jako nowe:**
  rozjazd całej polityki prywatności ze stanem witryny (znany, starszy od
  Pluginu 3, czeka na prawnika), przełącznik sprzedaży niedostępny klientowi
  i wersje wtyczek bez związku z wersją repo (oba zgłoszone właścicielowi
  2026-08-31) oraz świadomie nieaktualna linia `CLAUDE.md` o stanie sektora.
  Rola ma **potwierdzić, że pozycja nadal jest zapisana**, i tyle. To jest ochrona
  przed hałasem, nie przed prawdą.
- **Krytycy KIER i GOLD mają zakres WĘŻSZY niż pozostali** i tak stoi w `ROLE.md`:
  krytyk kierownika pyta wyłącznie, czy dział nie został zamknięty na deklaracji
  zamiast na liczbie; krytyk Goldena (K7) — czy Golden nie zablokował pracy bez
  wskazania złamanej zasady. Krytyk Goldena **nie ocenia przepuszczeń** — od tego
  są weryfikator i krytycy ról.

## Fakty zmierzone przy E4 (nie wyprowadzać od nowa)

- **Progi rozstrzygnięte przez właściciela:** nośnik plik → SQLite przy
  **200 zgłoszeniach**, sufit rund agenta pętlowego **5** (przy suficie rola
  MUSI wypisać niedomknięte pozycje — cisza po suficie jest luką).
  `node:sqlite` jest w standardzie node 26, więc przejście na bazę nie dokłada
  zależności.
- **Sektor ma WŁASNY audyt mutacyjny.** `tools/straznicy/audyt-straznikow.mjs`
  leży poza `audyt/`, więc dopisanie do niego mutacji złamałoby niezmiennik.
  Kontrakt wpisu jest ten sam, żeby dało się je kiedyś połączyć.
- **`.claude/` jest WYJĄTKIEM NAZWANYM w strażniku, nie przeoczonym.** Generat
  definicji agentów jest z założenia nieśledzony i odtwarzalny jedną komendą,
  więc `git diff main` go nie widzi — ale `git status` widzi. Wyjątek jest wąski
  i pilnuje go reguła 4 (zgodność ze źródłem po sha256 **oraz brak
  generatów-sierot**, czyli plików `aud-*.md` bez roli w `audyt/role/`).
- **HASH MIEJSCA bierze TREŚĆ, nie sam adres** — `sha256(rodzaj|plik|linia|
  treść znormalizowana)` albo `sha256(mechanizm|plik|zakres|nazwa)` dla braków
  (K10'). Dzięki temu da się go odtworzyć z kodu i nie da się podać „na oko".
- **`zgloszenie.mjs` SPRAWDZA, CZY MIEJSCE ISTNIEJE**: plik musi być na dysku,
  a przy formie liniowej treść podana przez agenta musi zgadzać się z treścią
  w pliku. To jest maszynowa egzekucja zasady 1 — agent nie może wskazać linii,
  której nie otworzył. Samokontrola `--test` ma **9 przypadków**.
- **DZIESIĄTY NAWRÓT PUŁAPKI POLSKICH ZNAKÓW, tym razem w kodzie pisanym po to,
  żeby pilnować dyscypliny.** Wzorzec `/\bwydaje mi si[ęe]\b/i` NIE łapał zdania
  „Wydaje mi się, że…", bo `\b` wymaga granicy między `\w` a nie-`\w`, a `ę`
  w JS **nie jest** `\w`. Bramka przepuszczała dokładnie to, czego miała
  zabraniać. Złapała to samokontrola, nie lektura. **W polskich wzorcach:
  `\p{L}` z flagą `u`**, nigdy `\b`.
- **Wzorce szukające ZDANIA muszą być odporne na ZAWIJANIE.** Reguła 6 pytała
  o „Brak dowodu = brak zgłoszenia" ze zwykłą spacją, a Markdown przełamał to
  zdanie między słowami — przelot próbny z szablonów dał **trzy fałszywe
  alarmy**. Odstępy idą teraz jako `\s+`.
- **Mutacja, która nie tworzy warunku, jaki deklaruje, jest MARTWA i daje
  fałszywą pewność.** Mutacja „pusty zakres" podmieniała tylko pierwszy
  pathspec, reszta linii zostawała, zakres dalej zwracał pliki — wyglądało to
  na dziurę w strażniku, a było dziurą w mutacji.
- **Zgodność szablonów ze strażnikiem jest STAŁĄ kontrolą**, nie jednorazowym
  sprawdzeniem: audyt mutacyjny buduje rolę z szablonów przy każdym przebiegu
  i wymaga, żeby strażnik jej NIE zapalił. Bez tego E5 wywróciłoby się na
  pierwszej roli, a wyglądałoby to na błąd roli.
- **Migawka musi mierzyć TAK SAMO jak istniejące bramki.** Pierwsza wersja
  liczyła testy wzorcem bez kotwicy i bez ograniczenia do repo — dała **2106**
  zamiast 83. Dwa pomiary tej samej rzeczy muszą dawać tę samą liczbę, inaczej
  porównanie migawek podnosi fałszywy alarm.

### Sweep przed /clear (2026-09-01) — co wyszło poza etapami

**CZTERY NARZĘDZIA NIE MIAŁY ŻADNEGO TESTU.** Strażnik sektora uruchamia
`mapa.mjs`, `zgloszenie.mjs --test` i `generuj-agentow.mjs`, ale
`porownaj-cykle.mjs`, `polacz-sektory.mjs`, `status.mjs` i
`migawka-wartosci.mjs --porownaj` nie były wołane przez nic — nikt by nie
zauważył, gdyby były zepsute. Przećwiczone na danych syntetycznych, **kody
wyjścia mierzone bez potoku**:

| Narzędzie | Scenariusz | Kod |
|---|---|---|
| `porownaj-cykle` | znalezisko tylko w fali 1 → rozjazd | **1** |
| `porownaj-cykle` | obie fale zgodne | **0** |
| `porownaj-cykle` | identyczny opis co do słowa → podejrzenie kopiowania | **1** |
| `polacz-sektory` | audyt + re-audyt na tym samym hashu | **0**, „potwierdzone przez oba: 1" |
| `status` | szósta runda ponad sufitem | **1** |
| `status` | zakończenie po suficie BEZ listy niedomkniętych | **1** |
| `status` | zakończenie z listą | **0** |
| `migawka --porownaj` | bez zmian | **0** |
| `migawka --porownaj` | zmieniony skrót drzewa produktu | **1** |

**PUŁAPKA PRZY SAMYM POMIARZE:** pierwsze sprawdzenie `porownaj-cykle` dało
„kod: 0" przy poprawnie wykrytym rozjeździe — bo `$?` po `| tail` pokazuje kod
**potoku**, nie skryptu. Ta sama klasa, którą repo zna od D5. Kody wyjścia
mierzymy bez potoku, także wtedy, gdy sprawdzamy własne narzędzia.

**Do rozstrzygnięcia przez właściciela:** `CLAUDE.md` w linii ~1285 mówi
„STAN: E0 i E1 ZROBIONE, NASTĘPNY KROK TO E2" i **będzie się starzeć dalej**,
bo niezmiennik sektora zabrania go dotknąć. Linia ~1270 na szczęście deleguje
stan do tego pliku („tabela STANU BUDOWY mówi, na którym etapie jesteśmy"),
a pamięć projektu niesie stan aktualny — więc nowa sesja trafi we właściwe
miejsce. Dwie drogi: (a) zostawić i polegać na delegacji + pamięci,
(b) jednorazowo poprawić `CLAUDE.md` po zamknięciu sektorów, jako świadomy
wyjątek od niezmiennika. **Nie robimy tego bez decyzji.**

## Fakty zmierzone przy E3 (nie wyprowadzać od nowa)

- **Kod i dokumentacja sektora żyją w `audyt/`** (rozstrzygnięcie właściciela).
  Niezmiennik zostaje JEDNĄ komendą, bez wyjątków. Cena jest z K8:
  `straznik-wagi-dokumentacji` z `main` skanuje wyłącznie `tools/`, więc naszego
  skryptu **nie widzi** — przejmie to strażnik sektora w E4.
- **DOKUMENTACJA MASOWA MUSI LEŻEĆ POZA DRZEWEM REPO, nie tylko poza gitem.**
  `~/.cache/aai-audyt-dokumentacja/` (44 MB, 4944 pliki). Pierwsza wersja
  kładła ją w `audyt/dokumentacja/` z zagnieżdżonym `.gitignore`; git był
  zadowolony, a `straznik-linkow` dał **66 fałszywych alarmów** na bezwzględnych
  odsyłaczach MDN — **strażnicy skanują DYSK, nie git**. Wykluczenie w strażniku
  jest wpisane na sztywno na `docs/dokumentacja-techniczna` i sektor nie może go
  rozszerzyć bez złamania niezmiennika. Ta sama klasa, przez którą motyw mieszka
  w `~/.cache/automatic-ai-warsztat`. Skrypt **odmawia pracy przy celu w drzewie
  repo** — test negatywny zrobiony.
- **Zasada kotwicy** (rozstrzygnięcie właściciela): pobieramy wyłącznie to, na co
  wskazuje ≥1 pozycja checklisty. Każde źródło ma kotwicę w kodzie i w
  `ZRODLA-DOKUMENTACJI.md`. Powód liczbowy: materiał czyta ~80 agentów w dwóch
  falach, więc niepotrzebny dokument to podatek płacony 160 razy.
- **BRIEF NIE PRZEKAZUJE naszych ocen** (rozstrzygnięcie właściciela): notatki
  „sprawdzone i bez zarzutu — nie szukać drugi raz" **nie wchodzą**, bo audyt
  odziedziczyłby nasze martwe pola i dwie fale potwierdziłyby naszą własną
  ślepotę. Świadoma cena: część pracy zostanie powtórzona.
- **EUR-Lex i Cellar są niedostępne dla automatu** — `eur-lex.europa.eu` oddaje
  **HTTP 202 z pustym ciałem** na każdą próbę, `publications.europa.eu` **400**.
  Teksty prawne bierzemy z `gdpr-info.eu` i `arslege.pl`, z **nazwaną rangą**
  (wierne przedruki, nie Dziennik Urzędowy).
- **PRÓG POBRANIA MUSI MIERZYĆ TREŚĆ, NIE PLIK.** Pierwsza wersja liczyła
  długość razem z nagłówkiem: trzy dokumenty prawne przyszły **puste**, a sam
  nagłówek waży ~200 B, więc przeszły bramkę i **zameldowały sukces**. Dziś próg
  to 1500 B samej treści, sprawdzony dwoma testami negatywnymi — źródłem
  oddającym 202 oraz stubem 175 B z **kodem 200** (`Access_Control_Cheat_Sheet`
  jest wycofany i odsyła do `Authorization`).
- **MDN przebudowało drzewo** — treść jest w `reference/` i `guides/`,
  a małpa w `@layer` **musi** być zakodowana jako `%40`.
- **Chrome for Testing 152.0.7977.64** w `~/.cache/aai-narzedzia/chrome-linux64/`,
  bez `sudo` (systemowe `sudo` żąda hasła). **Sterowanie sprawdzone pomiarem**:
  headless wyrenderował `:8892/szkolenia/` — 59 129 B DOM, poprawny tytuł,
  263 znaczniki `aai-`, kod 0.
- **Trzy pułapki grepowania tego repo** (wszystkie wpadły przy pisaniu briefu):
  `wp_ajax_` trafia w **komentarze**, nazwy akcji są **składane**
  (`'admin_post_' . self::STALA` — wzorzec literalny znajduje 1 z 6),
  a wystrzał `aai_sklep_dostepnosc_kursu` jest **wieloliniowy**, więc grep
  jednoliniowy pokazuje sześć szwów zamiast siedmiu.

## Fakty zmierzone przy E2 (nie wyprowadzać od nowa)

- **Model zakresu: „plik × pytanie"** (rozstrzygnięcie właściciela). Listy plików działów
  nakładają się, wyłączna jest checklista; tabela granic przypisuje **znaleziska**, nie
  pliki. Uzasadnienie liczbowe w `ROLE.md`.
- **Golden jest BRAMKĄ WYJŚCIA, nie nadzorcą czasu rzeczywistego** (rozstrzygnięcie
  właściciela). Harness nie pozwala jednemu agentowi obserwować drugiego w trakcie pracy —
  13 zasad wchodzi maszynowo do definicji, a Golden czyta **wyjście** działu przed
  kierownikiem.
- **Rachunek pokrycia zamyka się co do pliku: 522 przypisane + 399 wykluczone = 921**,
  zero sierot, zero plików o dwóch stanach. Liczony **z komend zapisanych w `ROLE.md`**,
  nie z brudnopisu.
- **Wykluczone (D4) to 399 plików**, nie 373 — poza `tresc-kursow` (331) wypada też
  pobrana dokumentacja techniczna (68), ale **`ZRODLA.md` zostają** w dziale REPO.
- **DWIE PUŁAPKI `git ls-files`, obie kosztowały przebieg pomiaru:**
  (1) **bez `:(glob)` gwiazdka przechodzi przez `/`** — `'wordpress/wtyczki/*/*.php'` daje
  **107** plików zamiast 9, więc zakres wygląda na precyzyjny i nie ogranicza niczego;
  (2) **z `:(glob)` pojedyncza gwiazdka zatrzymuje się na `/`** i gubi zagnieżdżone pliki —
  `'…/szablony/*.php'` widzi **0 z 37** szablonów. Do rekursji: ścieżka katalogu.
  **Każdy zakres liczymy komendą.**
- **Przelot Konrada faza A na samych zakresach dał wynik przed powstaniem agentów:**
  pierwsza wersja zostawiła **45 plików bez właściciela** (w tym oba dokumenty sektora),
  druga **6 plików jednocześnie przypisanych i wykluczonych**, a odwzorowanie rejestru
  pokazało **15 klas błędów bez pozycji w żadnej checkliście**. Wszystko domknięte.
- **Kontrola wpisana do `GRANICE.md` obaliła pierwszą wersję `GRANICE.md`:** plik
  deklarował pokrycie „każdej pary o nakładających się zakresach", a pomiar pokazał
  **19 par bez wiersza**, w tym `SEC ∩ PERF` = 94 pliki. Reguła ma dziś **próg ≥5 plików**
  i jest zgodna z tabelą (24 pary z wierszem, 8 poniżej progu na regule ogólnej).
- **QA-05 to pozycja z tego tygodnia:** „czy każda bramka z `ci.yml` przeszła kiedykolwiek
  przez CI na zielono". Regresja jobu „Baza" przeleżała piętnaście dni, bo `smoke-csp`
  wszedł do CI **po** ostatnim zielonym przebiegu i nigdy przez CI nie przeszedł.

## Fakty zmierzone przy E1 (nie wyprowadzać od nowa)

- **Niezmiennik sektora działa i jest sprawdzalny jedną komendą:**
  `git diff main --name-only -- . ':!audyt'` → musi dać **0** linii.
- **Rozkład 918 plików repo** (podstawa `mapa.mjs`, `git ls-files`):
  `tresc-kursow` 331 · `docs` 140 · `aai-sklep` 87 · `tools/zrzuty` 59 ·
  `components` 47 · `tools/straznicy` 41 · `tools` 31 · `app` 26 ·
  `tools/smoke` 25 · `modules` 21 · `aai-monitor` 20 · korzeń 19 ·
  `aai-platnosci` 17 · `public` 15 · `lib` 13 · `goldeny` 9 ·
  `wordpress` 7 · `agenci` 4 · `.github` 3 · `.githooks` 2 ·
  `tools/seed` 1 · `rejestr` 1.
- **`mapa.mjs` musi mieć TRZY stany, nie dwa:** przypisany do działu /
  **świadomie wykluczony** / sierota. `tresc-kursow` to 331 plików
  wykluczonych decyzją D4 — bez trzeciego stanu wykluczenie i przeoczenie
  wyglądałyby identycznie.
- **Środowiska stoją:** `db1_kursy` (Postgres prototypu), `aai_wp_*`
  (WordPress `:8892` → HTTP 200, Mailpit `:8893` → 200). Weryfikator
  re-audytu ma gdzie pracować uruchomieniowo.
- **W repo NIE MA `.claude/`** — definicje wykonywalne budujemy od zera (E6).
