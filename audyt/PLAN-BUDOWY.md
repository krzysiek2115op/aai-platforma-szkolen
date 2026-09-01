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
3. `git diff main -- . ':!audyt' ':!re-audyt' ':!.claude'` → **puste**
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
| **E2** — szkic ról i tabela granic | ✅ **ZROBIONE, ZAAKCEPTOWANE** (właściciel, 2026-09-01) | [`ROLE.md`](ROLE.md) (707 linii): 19 ról, **522 pliki przypisane**, 183 pozycje checklist, odwzorowanie 30 klas `BLAD-*`; [`GRANICE.md`](GRANICE.md) (117 linii): 24 pary o przecięciu ≥5 plików |
| **E3** — dokumentacja (7 rodzajów) + Chrome | ✅ **ZROBIONE, ZAAKCEPTOWANE** (właściciel, 2026-09-01) | [`BRIEF-PROJEKTU.md`](BRIEF-PROJEKTU.md) (15 kB wobec 240 kB `CLAUDE.md`), [`DOKUMENTACJA.md`](DOKUMENTACJA.md), [`ZRODLA-DOKUMENTACJI.md`](ZRODLA-DOKUMENTACJI.md), skrypt z manifestem; **4944 pliki / 44 MB** poza drzewem repo; Chrome 152 sprawdzony pomiarem |
| **E4** — szkielet | ✅ **ZROBIONE, ZAAKCEPTOWANE** (właściciel, 2026-09-01: „E4 akceptuję teraz") | [`STRUKTURA.md`](STRUKTURA.md), 4 szablony, **10 narzędzi** w `audyt/tools/`, strażnik sektora (9 kontroli) + **11 mutacji** (0 przeoczonych, 0 martwych) |
| **E5** — 19 ról × 4 pliki | ✅ **ZROBIONE, PRZYJĘTE** (właściciel, 2026-09-01: „po clear przechodzimy do e6") | **76 plików źródłowych** w `audyt/role/<KOD>/` (AGENT + KRYTYK + SKILL + golden), **38 definicji** w generacie; strażnik **14 kontroli**, audyt mutacyjny **24 mutacje** (0 przeoczonych, 0 martwych) |
| **E6** — generat i próba na sucho | ✅ **ZROBIONE, PRZYJĘTE** (właściciel, 2026-09-01: „po clear e7") | Próba: `aud-pik` → `AUD-PIK-001` → `aud-pik-krytyk` (ODRZUCAM) → `aud-wer` (ODRZUCONE) → **ZWERYFIKOWANE**. Powstał `werdykt.mjs` (ścieżka nie miała czym dojechać do końca) i znacznik wpisu próbnego; próba wskazała **cztery dalsze usterki**. Strażnik **14 → 18 kontroli**, mutacje **24 → 40**. Blokada „harness nie widzi agentów" zniknęła po **restarcie sesji** |
| **E7** — sektor RE-AUDYT | 🚧 **W TOKU** (zielone światło właściciela 2026-09-01) — **E7.1 ZROBIONE** | gałąź `re-audyt/sektor-re-audytu` z gałęzi audytu, 21 ról + psy — patrz „Co dokładnie obejmuje E7" niżej: **narzędzia sektora NIE są dziś przygotowane na re-audyt** (pięć pozycji zmierzonych), rozstrzygnięcia właściciela z 2026-09-01 w sekcji „CZTERY ROZSTRZYGNIĘCIA" |
| **E8** — STOP | ⬜ | **zielone światło właściciela** przed uruchomieniem |

**Właściciel akceptuje KAŻDY etap osobno** przed startem następnego.

## Co dokładnie obejmuje E6 (nie wyprowadzać od nowa)

**Generatu NIE trzeba budować** — powstaje sam, bo wymusza go reguła 4 strażnika:
`generuj-agentow.mjs --sprawdz` musi zgadzać się ze źródłem po `sha256`. Stan na
koniec E5: **38 definicji** w `.claude/agents/`, kod 0.

Zostaje **PRÓBA NA SUCHO JEDNEJ ROLI przez pełną ścieżkę** — pozycja 7 definicji
ukończenia sektora. Ścieżka do przejścia:

```
NIE ROZPOCZĘTO → W TRAKCIE        status.mjs --rola=<KOD> --fala=1
rola przechodzi swoją checklistę  jedna rola, jedna fala
znalezisko → zgloszenie.mjs       bramka nadaje ID i hash miejsca
                DO WERYFIKACJI
krytyk roli   → PRZEPUSZCZAM / ODRZUCAM z powodem
weryfikator   → istnieje / odrzucone
                ZWERYFIKOWANE
```

**TRZY RZECZY ROZSTRZYGNIĘTE PRZEZ WŁAŚCICIELA (2026-09-01)** — nie pytać o nie
drugi raz:

1. **Rolą próbną jest PIK** (10 plików — najmniejszy zakres w sektorze, a jego
   checklista porównuje dokument z produktem, więc nie wymaga postawionego
   środowiska WordPressa; próba mierzy ŚCIEŻKĘ, nie środowisko).
2. **Wpis próbny ZOSTAJE w repozytorium, oznaczony polem `proba`.** Zrobione —
   `zgloszenie.mjs --oznacz-probe=<ID> --etap=E6`; wpis wypada z porównania fal
   i z połączenia sektorów, ale nigdy po cichu. Szczegóły i powód:
   `audyt/STRUKTURA.md`, sekcja „Wpis PRÓBNY".
3. **Próba NIE jest uruchomieniem sektora w rozumieniu D10** — właściciel:
   *„nie, nie jest to uruchomienie sektora, to budowa; możesz testować ścieżkę,
   ale nic więcej"*. STOP na zielone światło zostaje na **E8**. Zakres próby jest
   przez to węższy niż normalny przebieg roli: **jedno** znalezisko ma przejechać
   całą ścieżkę, a nie cały dział ma zostać wyczerpany.

**Czego E6 NIE robi:** nie uruchamia pozostałych 18 ról, nie buduje sektora
RE-AUDYT (to E7), nie wykonuje żadnej naprawy (W2).

---

## Co dokładnie obejmuje E7 (nie wyprowadzać od nowa)

Wzorzec pracy jest ten sam co przy E5: `ROLE.md` re-audytu o tej samej strukturze,
potem 21 katalogów × 4 pliki, generat, strażnik. **Metoda budowy ról jest opisana
w „Fakty zmierzone przy E5"** (części mechaniczne ze skryptu jednorazowego, części
własne pisane) — skrypt był rusztowaniem i celowo nie trafił do repozytorium.

**Role re-audytu (21, każda z krytykiem = 42 agentów):** kierownik re-audytu ·
**Pogłębiacz** ×14 obszarów · **Psiarz** · **Skutki uboczne** · **Strażnikowy** ·
**Walidacja szczegółowa** · **Raport re-audytu** · **Konrad re-audytu**.
Czym re-audyt różni się od audytu: tabela w sekcji „SEKTOR RE-AUDYT — inny, nie
lustrzany (P2)". Skrót: audyt czyta i ustala OBRAZ, re-audyt **uruchamia na
`:8892`**, mierzy ZASIĘG (wszystkie wystąpienia klasy) i projektuje strażnika.

### PIĘĆ RZECZY ZMIERZONYCH: narzędzia sektora NIE są przygotowane na re-audyt

Nie są to domysły — każda pozycja ma pomiar albo linię kodu.

1. **Bramka ODRZUCA każdą rolę re-audytu.** `DZIALY` i `PROCESOWE`
   (`audyt/tools/wspolne.mjs:32-36`) znają wyłącznie 19 kodów audytu. Zgłoszenie
   z `dzial: "PSIARZ"` zostało odrzucone uruchomieniowo: „nieznany dział
   »PSIARZ«", kod 1. **Bez rozszerzenia tych list re-audyt nie zgłosi ANI
   JEDNEGO znaleziska.**
2. **Zgłoszenia obu sektorów muszą leżeć w JEDNYM katalogu.**
   `ZGLOSZENIA = join(SEKTOR, "zgloszenia")`, a `SEKTOR` to `audyt/`
   (`wspolne.mjs:14-15`). `polacz-sektory.mjs` łączy sektory po hashu, czytając
   `wszystkieZgloszenia()` — czyli TYLKO ten katalog. Osobny katalog dla
   re-audytu zerwałby łączenie sektorów (W4), które jest sensem całego kroku.
3. **Prefiks identyfikatora jest zaszyty jako `AUD-`** (`zgloszenie.mjs:121,125`).
   Znalezisko re-audytu dostałoby dziś ID nieodróżnialne od audytowego, choć pole
   `sektor` je rozróżnia. Do rozstrzygnięcia: własny prefiks (`REA-`) czy zostaje
   wspólny.
4. **Niezmiennik sektora jest zapisany jako `':!audyt'`** (`STRUKTURA.md`,
   `ROLE.md` KIER-07, `DOKUMENTACJA.md`). Na gałęzi re-audytu z katalogiem
   `re-audyt/` ta komenda pokazałaby WŁASNĄ pracę jako naruszenie — czyli
   bramka, która świeci na czerwono zawsze, a więc nie znaczy nic.
   **Potwierdzone URUCHOMIENIOWO 2026-09-01**, nie z lektury pathspeca: przy
   podstawionym pliku `re-audyt/PROBA.md` stara komenda wypisuje go jako
   naruszenie, a kandydat z dwoma wykluczeniami daje **0**. Drzewo po próbie
   sprawdzone jako czyste.
5. **Wspólny prefiks `AUD-` przy wspólnych kodach działów NADPISAŁBY dane.**
   Tego w pierwszym pomiarze nie było, a jest twardsze od pozostałych czterech:
   `nastepneId()` (`zgloszenie.mjs:120-122`) liczy kolejny numer po plikach
   zaczynających się od `AUD-<DZIAŁ>-`, a oba sektory dzielą JEDEN katalog
   (pomiar 2). Zgłoszenie re-audytu w dziale SEC dostałoby więc nazwę pliku
   `AUD-SEC-001.json`, którą audyt już zajął. To nie jest kwestia nazewnictwa,
   tylko cichej utraty wpisu — stąd rozstrzygnięcie 4 niżej (`REA-`).

### CZTERY ROZSTRZYGNIĘCIA WŁAŚCICIELA PRZED E7 (2026-09-01)

Wszystkie cztery zapadły przed pierwszą linią kodu E7 i **nie wyprowadza się ich
od nowa**. Trzy pierwsze odpowiadają na pytania postawione wyżej; czwarte
zamyka pozycję „do rozstrzygnięcia" z pomiaru 3.

1. **Gałąź `re-audyt/sektor-re-audytu` wychodzi z `audyt/sektor-audytu`**, nie
   z `main`. Powód rozstrzygający: z `main` gałąź nie ma narzędzi sektora ani
   wspólnego katalogu zgłoszeń, więc **nie miałaby czym zgłosić znaleziska ani
   czym połączyć sektorów** (W4) — a połączenie jest sensem całego kroku.
2. **Narzędzia ROZSZERZAMY, ale zmiany wchodzą NA GAŁĘZI AUDYTU, przed
   odgałęzieniem.** Listy ról świadome sektora, prefiks identyfikatora i generat
   `rea-*` powstają w `audyt/tools/` jeszcze na `audyt/sektor-audytu`; gałąź
   re-audytu dodaje wtedy **wyłącznie katalog `re-audyt/`**. Kolizja z §17
   („sektory są osobne") znika, bo nie ma jej w commitach — nie dlatego, że ją
   przemilczeliśmy. Wariant „własne narzędzia w `re-audyt/tools/`" odrzucony:
   dwie kopie `hashMiejsca()` rozjechałyby się po cichu, a `polacz-sektory.mjs`
   przestałby widzieć re-audyt.
3. **Niezmiennik ma JEDNĄ postać dla OBU gałęzi:**
   ```
   git diff main --name-only -- . ':!audyt' ':!re-audyt'      →  musi dać 0
   ```
   Na gałęzi audytu daje ten sam wynik co dotąd (katalogu `re-audyt/` tam nie
   ma), więc zasada „jedna komenda, bez wyjątków" zostaje nietknięta. Poprawka
   wchodzi we wszystkie miejsca, w których stoi wersja z jednym wykluczeniem.
4. **Prefiks identyfikatora re-audytu to `REA-`, nazwy agentów `rea-*`**, a
   Pogłębiacze **biorą kody działów audytu** (`SEC`, `FE`, …) w sektorze
   `re-audyt`. Pogłębiacz obszaru SEC JEST re-audytem działu SEC, więc wspólny
   kod utrzymuje `GRANICE.md`, łączenie po hashu i tabelę P2 w jednej linii,
   a rozróżnia je pole `sektor` i prefiks. Nowe kody potrzebne tylko cztery:
   **`PSIARZ`**, **`SKUT`**, **`STRAZ`**, **`WALID`**; kierownik, raport
   i Konrad re-audytu to `KIER`/`RAP`/`KON` w sektorze `re-audyt`. Bez `GOLD`
   i bez `WER` — te zostają przy audycie (§16).

**Rachunek 21 ról:** KIER + 14 Pogłębiaczy + PSIARZ + SKUT + STRAZ + WALID
+ RAP + KON = 21, czyli 42 agentów z krytykami.

### PRZEBIEG E7 — sześć kroków

| # | Krok | Stan |
|---|---|---|
| **E7.1** | rozszerzenie narzędzi **na gałęzi audytu**, przed odgałęzieniem | ✅ **ZROBIONE** (trzy commity) |
| **E7.2** | gałąź `re-audyt/sektor-re-audytu` + `re-audyt/GRANICE.md` | ✅ **ZROBIONE** |
| **E7.3** | `re-audyt/ROLE.md` — 21 ról: zakres komendą, checklista, „nie bierze" | ✅ **ZROBIONE** |
| **E7.4** | 21 × 4 pliki metodą z E5 + utwardzenie kompletu ról | ✅ **ZROBIONE** — 84 pliki, komplet TWARDY |
| **E7.5** | generat → **restart sesji** → strażnik i mutacje | 🚧 **generat i bramki gotowe; CZEKA NA RESTART SESJI** |
| **E7.6** | **próba na sucho jednej roli re-audytu** (zgoda właściciela 2026-09-01) | ⬜ — wykonalna dopiero po restarcie |

**E7.6 wchodzi na życzenie właściciela** („robimy próbę na sucho tak jak
z audytem"). Powód nie jest symetrią: ścieżka re-audytu jest INNA — uruchamia
`:8892`, mierzy zasięg wszystkich wystąpień klasy i projektuje strażnika —
więc dowód z E6 jej nie obejmuje. E6 pokazał, ile znajduje próba, której nie
znajduje lektura: cztery usterki niewidzialne dla szesnastu kontroli.

---

### Co zrobił E7.1 (nie wyprowadzać od nowa)

**Narzędzia sektora znają oba sektory.** Zmiany weszły na gałęzi AUDYTU,
przed odgałęzieniem — dzięki temu gałąź re-audytu doda wyłącznie katalog
`re-audyt/` i nie zmieni cudzego katalogu (rozstrzygnięcie 2).

| Plik | Co się zmieniło |
|---|---|
| `wspolne.mjs` | `SEKTORY`, `SEKTOR_RE`, `roleSektora()`, `PROCESOWE_RE`, `PREFIKS_ID`, `PREFIKS_AGENTA`, `katalogSektora()`, `roleMdSektora()`, `zakresyZRoleMd(sektor)`, **`KOD_POZYCJI`** |
| `zgloszenie.mjs` | dział sprawdzany wobec SWOJEGO sektora; `idZgloszenia()` czysta i testowalna; samokontrola **13 → 18 przypadków** |
| `status.mjs` | walidacja sektora i roli w sektorze; wspólny `KOD_POZYCJI` |
| `generuj-agentow.mjs` | czyta oba katalogi ról, nazywa agentów `aud-*` / `rea-*`, sieroty liczy po obu przedrostkach |
| `straznik-sektora-audytu.mjs` | reguły ról chodzą po OBU sektorach, komunikaty niosą nazwę sektora; **reguła 19**; reguła 17 pyta o rolę w sektorze; niezmiennik z drugim wykluczeniem |
| `audyt-straznika-sektora.mjs` | **40 → 50 mutacji** |

**DWIE USTERKI ZNALEZIONE PRZY OKAZJI, OBIE PRZEZ AUDYT MUTACYJNY, obie
starsze od E7** — i obie w tym samym wzorcu `KOD_POZYCJI`:

- **`KON-A5` nie był kodem pozycji.** Wzorzec brzmiał `/^[A-Z]{2,5}-\d{2}$/`,
  a Konrad ma pozycje z literą (`KON-A1`…`KON-A6`) i **jest rolą pętlową** —
  czyli tą, która przy suficie rund MUSI wypisać niedomknięte pozycje.
  Nie zapisałby ani jednej: `status.mjs` odpowiadałby „to nie jest kod
  pozycji" na poprawny kod. Usterka jest z E4.
- **`PSIARZ-02` też nie.** Sześć liter przy sufcie pięciu — czyli pierwsza
  rola re-audytu wywróciłaby się na pierwszym zapisie stanu.

Wzorzec mieszka teraz w JEDNYM miejscu (`wspolne.mjs`), a sufit długości
**wyprowadza się z prawdziwych kodów ról**, nie z liczby wpisanej ręcznie —
nowa rola o dłuższym kodzie nie może po cichu wypaść spod wzorca. Dwa
kontrprzykłady w audycie mutacyjnym pilnują, żeby sufit nie wrócił.

**Trzecia rzecz, którą pokazał ten sam przebieg:** dwie mutacje z E5/E6 miały
`slad` przypięty do DOKŁADNEGO BRZMIENIA komunikatu, więc przestały trafiać,
gdy reguła 12 zaczęła nazywać sektor. Ślady celują teraz w rozstrzygnięcie
(`/brakuje 1 ról z ROLE\.md .* WER/`), nie w zdanie. To ta sama rodzina co
dziewięć nawrotów „wzorzec na napis" z `main`.

**KOMPLET RÓL RE-AUDYTU JEST MIĘKKI DO KOŃCA E7.4** i jest to nazwane
w kodzie (`KOMPLET_TWARDY`), nie przemilczane: czerwony strażnik w połowie
budowy niczego by nie pilnował, tylko zaszumiał bramkę — dokładnie ta sama
decyzja, którą podjął E5 dla audytu. Ciszy nie ma w żadnym stanie: liczba
zbudowanych ról i imienna lista brakujących jedzie na wyjściu zawsze.

**Niezmiennik zmieniony w dziewięciu miejscach**, nie w czterech (pomiar:
`STRUKTURA.md`, `DOKUMENTACJA.md`, `ROLE.md` KIER-07, `role/KIER/AGENT.md`,
`role/KIER/SKILL.md`, `role/GOLD/AGENT.md`, `role/GOLD/SKILL.md`,
`role/RAP/SKILL.md`, definicja ukończenia w tym pliku). Zapis w „Faktach
zmierzonych przy E1" został oznaczony jako historyczny, nie poprawiony.

**Dowody E7.1:** niezmiennik 0, strażnik **19 kontroli** kod 0, audyt
mutacyjny **50** (0 przeoczonych, 0 martwych), samokontrole `zgloszenie`
(18/18), `werdykt`, `mapa` i `generuj-agentow --sprawdz` — wszystkie kod 0.
Testy negatywne: wspólny prefiks ID zapala 3 z 5 przypadków identyfikatora,
suma list ról zapala 2 przypadki działów, stary `KOD_POZYCJI` zapala oba nowe
kontrprzykłady — i nic poza nimi.

---

### Co zrobiły E7.2–E7.5 (nie wyprowadzać od nowa)

**Gałąź `re-audyt/sektor-re-audytu` wyszła z gałęzi audytu**, niesie komplet
narzędzi i wspólny katalog zgłoszeń. Niezmiennik na obu gałęziach ma tę samą
postać i daje 0.

**`re-audyt/ROLE.md`: 21 ról, 121 pozycji checklist.** Cztery role są własne
i to one robią z re-audytu inny sektor: `PSIARZ` (psuje kod w miejscu
znaleziska i pyta, czy cokolwiek szczeka), `SKUT` (skutki uboczne),
`STRAZ` (projekt strażnika przeciw nawrotowi), `WALID` (weryfikator
re-audytu — §16). Siedemnaście ról ma kody wspólne z audytem.

**Pozycje noszą literę `R`** (`SEC-R1`) — bez niej byłyby w połączonym wyniku
nie do odróżnienia od pozycji audytu. Wzorzec strażnika przyjmuje odtąd
dowolną literę po myślniku, nie tylko `A` Konrada.

**Zakresy Pogłębiaczy POLICZONE, nie przepisane:** 113, 57, 66, 25, 80, 116,
79, 15, 60, 79, 33, 131, 10, 94 — żaden nie daje zera, wszystkie zgodne
z audytem co do znaku (reguła 20).

**84 pliki ról zbudowane metodą z E5.** Każda z 21 ról ma WŁASNĄ kotwicę
goldena — prawdziwą linię ze swojego zakresu, sprawdzaną przy każdym
przebiegu strażnika.

### CZTERY USTERKI ZŁAPANE PRZEZ WŁASNE BRAMKI PODCZAS E7.2–E7.5

Wszystkie są tej samej rodziny co usterki z E5 i E6: wyglądały na pracę
wykonaną.

1. **Zły przykład goldena PRZECHODZIŁ przez bramkę — na 21 rolach naraz.**
   Rusztowanie budowało przykład „treść nie zgadza się z plikiem", doklejając
   do prawdziwej treści spację, a `znormalizuj()` białe znaki zdejmuje. Golden
   przestawał być miarą, a wyglądał kompletnie. Zły przykład niesie teraz treść
   linii SĄSIEDNIEJ — najrealistyczniejszą pomyłkę tej klasy. Złapała
   **reguła 11**.
2. **Mapa pokrycia uznała dokumenty re-audytu za SIEROTY** — i miała rację:
   bierze je wyłącznie Konrad re-audytu, a mapa czytała zakresy samego audytu.
   Bez unii zakresów obu sektorów `re-audyt/ROLE.md` i `GRANICE.md` były
   plikami, których nie czyta nikt.
3. **Przełączenie gałęzi zostawiło 42 GENERATY-SIEROTY** — definicje `rea-*`
   bez źródła, które harness dalej widzi: żywi agenci bez zakresu. Generator
   je teraz usuwa (`--sprawdz` zgłasza), a reguła 4 PODAJE POWÓD zamiast mówić
   tylko „nieaktualny" — bo generat starszy od źródła i generat-sierota to dwie
   różne naprawy.
4. **MOJA WŁASNA MUTACJA SKASOWAŁA PRACĘ SEKTORA.** Mutacja niezmiennika
   zakłada plik w `re-audyt/`, a sprzątała, usuwając CAŁY katalog rekurencyjnie
   — i zabrała dwa niezacommitowane dokumenty. To znana klasa z tego
   repozytorium: **bramka sprzątająca CUDZE dane**. Sprząta teraz wyłącznie to,
   co sama założyła. Odtworzenie zajęło minutę, bo rusztowanie i dane leżały
   w scratchpadzie — ale gdyby pliki były pisane wprost, przepadłyby.

**Piąta rzecz, mniejsza:** kontrprzykład reguły 20 wstawiał SUROWY przełam
linii zamiast kontynuacji powłoki, więc rozbijał komendę i zapalał mapę zamiast
reguły 20. Kontrprzykład psujący co innego, niż deklaruje, mierzy nie to co
trzeba — rodzina „mutacji martwej" z E4.

### DWIE USTERKI STARSZE OD E7, obie w `KOD_POZYCJI`

Znalazł je audyt mutacyjny przy E7.1 i obie były ciche:

- **`KON-A5` nie był kodem pozycji.** Wzorzec `/^[A-Z]{2,5}-\d{2}$/` nie
  przyjmował litery, a Konrad ma pozycje `KON-A1`…`KON-A6` i **jest rolą
  pętlową** — czyli tą, która przy suficie rund MUSI wypisać niedomknięte.
  Nie zapisałby ani jednej. Usterka jest z E4.
- **`PSIARZ-02` też nie** — sześć liter przy sufcie pięciu.

Wzorzec jest teraz w jednym miejscu (`wspolne.mjs`), a sufit **wyprowadza się
z prawdziwych kodów ról**. Dwa kontrprzykłady pilnują, żeby nie wrócił.

### STAN NA KONIEC E7.5

| Bramka | Wynik |
|---|---|
| niezmiennik sektora (obie gałęzie) | **0** |
| `straznik-sektora-audytu.mjs` | **20 kontroli**, kod 0 |
| audyt mutacyjny | **55 mutacji**, 0 przeoczonych, 0 martwych |
| role audytu | **19/19** |
| role re-audytu | **21/21**, komplet TWARDY |
| generaty | **80** (`aud-*` 38, `rea-*` 42), bez martwych odsyłaczy |
| krytycy z drogą zgłaszania | **40** |
| zakresy Pogłębiaczy zgodne z audytem | **14/14** |
| mapa pokrycia | 628 + 399 = **1027**, 0 sierot |

### CO BLOKUJE E7.6 — RESTART SESJI

**Harness wczytuje rejestr agentów projektu przy starcie procesu**, więc
42 definicje `rea-*` powstałe w tej sesji są dla niej NIEWIDZIALNE. Sprawdzone:
lista dostępnych typów agentów niesie wyłącznie `aud-*`. To ta sama blokada,
która w E6 kosztowała pół sesji śledztwa, zanim restart okazał się całą
naprawą — i była zapisana w tym pliku jako lekcja DOTYCZĄCA E7 WPROST.

**Próby na sucho (E7.6) nie da się więc wykonać w tej sesji.** Po restarcie
`rea-*` będą widoczne i próba przejedzie tę samą ścieżkę co w E6, tylko
metodą re-audytu (uruchomienie, nie lektura).

---

### CZEGO E7 NIE ROBI

Nie uruchamia żadnego z sektorów (STOP zostaje na **E8**, D10), nie naprawia
niczego (W2), nie dotyka kodu produktu poza katalogami sektorów.

### LEKCJA Z E6, KTÓRA DOTYCZY E7 WPROST

**Po wygenerowaniu 21 nowych definicji ról trzeba ZRESTARTOWAĆ SESJĘ, zanim się
je wywoła** — harness wczytuje rejestr agentów projektu przy starcie procesu.
W E6 kosztowało to pół sesji śledztwa, zanim restart okazał się całą naprawą.

**Sekcję „Jak zgłaszasz" ma już `audyt/szablony/KRYTYK.md`**, więc krytycy
re-audytu odziedziczą ją automatycznie. Reguła 18 strażnika sprawdzi to sama.

**Zakres każdej roli liczymy KOMENDĄ i sprawdzamy, że nie daje zera** — usterka
PIK-08 z E6 (źródła z zerem trafień, pozycja do odhaczenia po pustce) jest tą
klasą, którą przy 21 nowych rolach najłatwiej powtórzyć 21 razy.

---

## Fakty zmierzone przy E6 (nie wyprowadzać od nowa)

### ŚCIEŻKA NIE MIAŁA CZYM DOJECHAĆ DO KOŃCA — nośnik werdyktu

Do E6 ostatnie dwa kroki ścieżki nie miały nośnika maszynowego: `zgloszenie.mjs`
zapisuje `status` i `werdykt` **raz, przy tworzeniu wpisu**, a `status.mjs`
prowadzi stan **roli**, nie stan zgłoszenia. Krytyk i weryfikator mogli wydać
werdykt wyłącznie w rozmowie — a przebieg sektora z założenia nie mieści się
w jednej sesji. **Pozycja 7 definicji ukończenia sektora była nieosiągalna.**

Nie widziała tego ani reguła 5 strażnika (pyta o `id`, `dowod`, `miejsce`,
`hash`), ani żadna z 24 mutacji, które wtedy istniały. Powstał
`audyt/tools/werdykt.mjs` + dwie kontrole strażnika (15, 16) + dziesięć mutacji.
Rozstrzygnięcia nośnika: `audyt/STRUKTURA.md`, sekcja „Nośnik werdyktu".

### PRÓBA PRZESZŁA — pozycja 7 definicji ukończenia spełniona

```
NIE ROZPOCZĘTO → W TRAKCIE      aud-pik, fala 1, zakres = 10 plików
PIK-08 → znalezisko             AUD-PIK-001, bramka przyjęła za pierwszym razem
                DO WERYFIKACJI
aud-pik-krytyk  → ODRZUCAM      z kontrdowodem
aud-wer         → ODRZUCONE     własnym, niezależnym pomiarem
                ZWERYFIKOWANE
```

**Sektor zadziałał tak, jak miał.** PIK zgłosił, że lista „przed pierwszym
klientem" w `CLAUDE.md` pomija dwie pozycje. Krytyk **obalił to pomiarem**:
dowód twierdził, że pewnych sformułowań nie ma w `CLAUDE.md` (`grep` daje pięć
trafień) i że blok jest jedynym miejscem zbierającym tę kategorię
(`docs/PLAN-SEO-HIGIENA-AUDYT.md` zbiera ją pełniej, a README wskazuje ten plik
wprost). Weryfikator doszedł do tego samego **niezależnie** i dołożył pomiar,
którego krytyk nie zrobił: pozostałość **„faktury, VAT" JEST czynna** — nie ma
jej ani w `CLAUDE.md`, ani w planie SEO, ani w README. To osobne, węższe
znalezisko dla prawdziwego przebiegu.

**Odrzucenie jest wynikiem, nie porażką.** Wpis został z obydwoma werdyktami,
oznaczony `proba: E6`, i strażnik wypisuje go po ID.

**Czego próba NIE sprawdziła:** ścieżki odrzuceń `zgloszenie.mjs` w żywym
przebiegu — PIK trafił za pierwszym razem, więc bramka ani razu nie odmówiła.
Znamy ją wyłącznie z dziesięciu samokontroli `--test`.

### CZTERY USTERKI, KTÓRE WYCIĄGNĘŁA PRÓBA

Wszystkie naprawione; żadnej nie widziała wcześniejsza kontrola, bo trzy
z czterech ujawniają się dopiero **w działaniu**.

1. **Ścieżka nie miała nośnika werdyktu** (znalezione przed próbą, przy jej
   przygotowaniu) — patrz sekcja niżej.
2. **`status.mjs` dzielił `--niedomkniete` przecinkiem**: siedem realnych
   pozycji zapisało się jako **dziewięć**, w tym „zgodnie z zakresem próby"
   jako samodzielna pozycja. Kierownik czyta stąd liczbę otwartych pozycji,
   a `porownaj-cykle.mjs` bierze ją do K4' — dziennik audytu podawał nieprawdę.
   Pole przyjmuje dziś wyłącznie kody.
3. **Rola kończąca w jednym przebiegu zapisywała `runda 0/5`** — w zestawieniu
   wygląda jak rola, która nie zrobiła nic. Zero rund przy zakończeniu jest
   sprzeczne samo w sobie.
4. **PIK-08 dało się odhaczyć po pustce.** Kolumna źródeł wskazywała
   `PLAN-BUDOWY.md` i `ETAP-WP.md`, w których fraza „przed pierwszym klientem"
   występuje **zero razy**. Audytor idący za checklistą dosłownie znajduje
   pustkę i może orzec „kompletna". Źródłem jest dziś komenda z `-i` —
   **bez `-i` plan SEO daje ZERO, bo pisze „Przed pierwszym klientem" wielką
   literą**, i przy poprawianiu tej usterki o mało nie powtórzyłem jej co do
   klasy.
5. **Krytycy mieli zgłaszać własne znaleziska, nie wiedząc czym.** 19 z 19
   `KRYTYK.md` nakazywało zgłoszenie usterki checklisty, **0 z 19** podawało
   drogę. Krytyk w próbie zgłosił dwie prawdziwe usterki PROZĄ i obie
   przepadłyby razem z sesją, gdyby nikt ich nie przepisał w tej samej
   rozmowie. Sekcja weszła do 19 ról **i do szablonu**, więc E7 ją dziedziczy.

Usterki 2–5 pilnują nowe reguły **17** i **18** strażnika, po mutacji
i kontrprzykładzie na każdą.

**Zgłoszenie krytyka idzie pod kodem JEGO roli, nie pod `KON`** — mimo że
`KON-A6` pyta o tę samą klasę. Zasada 3 zabrania przekazywania znaleziska,
a oba pomiary są różne: Konrad atakuje zakresy PRZED pracą działów, krytyk
widzi checklistę W DZIAŁANIU.

### BLOKADA, KTÓRĄ ZDJĄŁ RESTART SESJI (zapis historyczny)

**Rozwiązanie: restart sesji Claude Code.** Po nim harness widzi komplet
38 definicji i próba przeszła bez żadnej zmiany w plikach. Potwierdza to
hipotezę, której nie dało się sprawdzić z wnętrza sesji: **proces miał wczytany
rejestr agentów projektu sprzed E5**, czyli sprzed powstania tych plików.
**Wniosek na przyszłość: po wygenerowaniu nowych definicji ról (E7 doda 21)
trzeba zrestartować sesję, zanim się je wywoła.** Poniższe pomiary zostają,
bo opisują objaw, po którym rozpozna się to następnym razem.

Objaw brzmiał tak: wywołanie `aud-pik` zwracało **„Agent type 'aud-pik' not
found"**, choć
`.claude/agents/` ma komplet 38 definicji, a `generuj-agentow.mjs --sprawdz`
melduje zgodność ze źródłem. **Izolacja — ten sam plik definicji, trzy miejsca:**

| Definicja leży w… | Wynik wywołania |
|---|---|
| `~/.claude/agents/` | **znaleziona** (odmowa dotyczyła uprawnień, nie istnienia) |
| `<projekt>/.claude/agents/` | **nie znaleziona** |
| katalog bliźniaczy BEZ końcowej spacji w nazwie | **nie znaleziona** |

**Hipoteza spacji w nazwie katalogu jest OBALONA** trzecim wierszem tabeli —
harness nie szuka też w wariancie bez spacji (ten katalog został utworzony na
czas pomiaru i skasowany).

**Rejestr agentów jest ŻYWY, nie wczytywany raz:** plik utworzony w trakcie
sesji w `~/.claude/agents/` został od razu zobaczony. Asymetria dotyczy więc
wyłącznie katalogu projektowego.

**Dokumentacja Claude Code (potwierdzone przez `claude-code-guide`):**
`.claude/agents/` w projekcie jest udokumentowanym miejscem, z priorytetem
**wyższym** niż katalog użytkownika, i **nie istnieje ustawienie** wskazujące
dodatkowy katalog z definicjami (`agentDirectories` ani odpowiednik). Czyli
sektor jest zbudowany zgodnie z dokumentacją, a zawodzi środowisko.

**Kopiowania definicji do `~/.claude/agents/` NIE robimy** — zablokował je
klasyfikator uprawnień, a niezależnie od tego byłoby architektonicznie złe:
38 (docelowo ~80) definicji sektora widocznych w KAŻDYM projekcie użytkownika
to dokładnie ta wada, dla której w E5 odrzucono instalowanie skilli.

**Restart sesji zdjął blokadę** i to zamyka sprawę: przyczyną był rejestr
agentów wczytany przed powstaniem plików (katalog `.claude/` z 05:37, definicje
z 06:49). Gdyby objaw wrócił mimo restartu, następnym pomiarem jest terminal
(`claude` → `/agents`) — rozstrzyga, czy ograniczenie siedzi w rozszerzeniu
VSCode.

### KOSZT PRZEBIEGU — ZMIERZONY, nie oszacowany

Trzy uruchomienia próby na tym repozytorium:

| Agent | Tokeny | Wywołania narzędzi |
|---|---|---|
| `aud-pik` (Sonnet, 8 pozycji, zatrzymany po jednej) | **181 tys.** | 22 |
| `aud-pik-krytyk` (Opus, jedno zgłoszenie) | **173 tys.** | 25 |
| `aud-wer` (Sonnet, 5 pozycji na jednym wpisie) | **163 tys.** | 14 |

**Razem ~518 tys. tokenów za JEDNO znalezisko przeprowadzone przez ścieżkę** —
przy roli o NAJWĘŻSZYM zakresie w sektorze (10 plików) i przy zakresie zawężonym
rozkazem. Rola przechodząca całą checklistę na 116 albo 131 plikach (PERF, PROTO)
będzie wielokrotnie droższa.

Plan mówił „ponad 150 uruchomień, rząd wielu milionów tokenów". Ta liczba jest
teraz **oparta na pomiarze**: przy ~170 tys. na uruchomienie i 150 uruchomieniach
wychodzi **rząd 25 milionów tokenów** na komplet obu sektorów i obu fal — i to
przy założeniu, że przeciętna rola nie jest droższa od najwęższej, co jest
założeniem optymistycznym.

**Wniosek dla E8:** to nie zmieści się w jednej sesji ani w jednym dniu i wymaga
świadomej zgody właściciela na koszt, osobno od zgody na uruchomienie. Dlatego
wyniki lądują w pliku natychmiast, a nie w kontekście rozmowy.

### CZEGO PRÓBA NIE OBEJMOWAŁA — żeby nikt nie uznał działu za sprawdzony

**Próba przeszła ŚCIEŻKĘ, nie dział.** Zakres był zawężony rozkazem właściciela
(„możesz testować ścieżkę, ale nic więcej"), więc PIK zatrzymał się po pierwszym
udowodnionym znalezisku:

- **przejdzone: PIK-08** (plus komenda zakresu — daje 10 plików, zgodnie z `ROLE.md`);
- **niedomknięte: PIK-01 … PIK-07**, zapisane jawnie w `audyt/stan/`.

Dział PIK **nie jest zaudytowany** i nie wolno tego wpisu tak czytać. Pierwsza
prawdziwa fala zaczyna PIK od zera.

**Znaleziska nie wymyślamy, żeby ścieżka miała co przewieźć** (zasada 1). To,
że jedyne znalezisko próby zostało ODRZUCONE przez obie bramki, jest wynikiem
mocniejszym niż przyjęcie: dowód nie utrzymał się pod pomiarem i sektor to
wychwycił, dwukrotnie i niezależnie.

### REGUŁA 11 ZŁAPAŁA ZMIANĘ W TRAKCIE JEJ WPROWADZANIA

Dopisanie linii do `zgloszenie.mjs` przesunęło kotwicę goldena WER
(`audyt/tools/zgloszenie.mjs:209` → `:259`) i strażnik zapalił się przy pierwszym
przebiegu, zanim golden zdążył zgnić. Kotwica poprawiona w obu blokach.
**Wniosek na przyszłość: każda zmiana w pliku, który jest czyjąś kotwicą, wymaga
przebiegu strażnika PRZED commitem** — a nie po.

### PUŁAPKA POMIARU, KTÓRA WRÓCIŁA

Kod wyjścia `migawka-wartosci.mjs --porownaj` zmierzony **za potokiem** (`| tail`)
pokazał 0 przy komunikacie o braku migawek; bez potoku jest **1**, czyli narzędzie
jest zdrowe. To ta sama klasa, która w tym repozytorium kosztowała czas przy D5.
**Kody wyjścia mierzymy BEZ potoku, także we własnych sondach diagnostycznych.**

### MIGAWKA POTWIERDZIŁA NIEZMIENNIK

`migawka-wartosci.mjs` przed pracą i po niej: **identyczne** — „audyt niczego nie
zmienił w projekcie". Skrót drzewa produktu, 919 plików, 39 strażników,
340 mutacji projektu, 83 testy.

---

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

- **JAK POWSTAŁY ROLE — metoda, nie skrypt.** Części mechaniczne (zakres, liczba
  plików, tabela checklisty, wiersz „Nie bierze", wiersze `GRANICE.md` dotyczące
  roli) **wyciągnął z `ROLE.md` i `GRANICE.md` skrypt jednorazowy**, żeby nie
  przepisywać ich ręcznie i nie wprowadzić literówki. Części własne każdej roli
  (Context specjalistyczny z kotwicą, prompt, procedura skilla, kotwica goldena)
  są **pisane**, nie generowane.
  **Skrypt był rusztowaniem i celowo NIE trafił do repozytorium**: role są
  ŹRÓDŁEM, z którego generuje się `.claude/agents/`, a narzędzie nadpisujące
  źródło zapraszałoby do skasowania pisanej treści jednym przebiegiem.
  **Przy E7 (21 ról re-audytu) metodę odtwarza się od nowa** — opis powyżej jest
  jej pełną specyfikacją, a `ROLE.md` re-audytu będzie miał tę samą strukturę.
- **`git commit` w tym repo drukuje ~3 tys. tokenów wyjścia strażników** (hook
  `pre-commit` uruchamia wszystkich 39). Kierowanie tego do pliku i sprawdzanie
  **kodu wyjścia commita** daje ten sam dowód bez szumu:
  `git commit -q -F - > /tmp/commit.log 2>&1; echo $?`.

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
  *(Zapis historyczny — od E7.1 komenda ma DRUGIE wykluczenie, `':!re-audyt'`,
  i jest ta sama na obu gałęziach: `audyt/STRUKTURA.md`.)*
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
