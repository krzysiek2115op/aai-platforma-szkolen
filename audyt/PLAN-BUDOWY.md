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
| D8 | Model: **kierownicy i krytycy — Opus; reszta — Sonnet**. **Zmiana właściciela 2026-09-02:** kierownicy (`KIER`) i Konradowie (`KON`) obu sektorów — **Fable 5.1** (`claude-fable-5-1`); pozostałe role procesowe i **wszyscy krytycy zostają na Opusie**, działy na Sonnecie |
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
                        │      AUDYTOR KIEROWNIK       │   Fable 5.1 (od 2026-09-02) + krytyk na Opusie
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
| **E7** — sektor RE-AUDYT | ✅ **ZROBIONE I ZAAKCEPTOWANE** (właściciel, 2026-09-02: „akceptuję E7") | gałąź `re-audyt/sektor-re-audytu` z gałęzi audytu, 21 ról + psy — patrz „Co dokładnie obejmuje E7" niżej: **narzędzia sektora NIE są dziś przygotowane na re-audyt** (pięć pozycji zmierzonych), rozstrzygnięcia właściciela z 2026-09-01 w sekcji „CZTERY ROZSTRZYGNIĘCIA" |
| **E8** — STOP | 🟢 **ZIELONE ŚWIATŁO 2026-09-03** — właściciel: „zielone swiatło puszczamy 1 fale audytu i re audytu"; przebieg fali 1 W TOKU (sekcja „E8 — PRZEBIEG FALI 1" niżej). **AUDYT FALI 1 ZAMKNIĘTY I ZACOMMITOWANY 2026-09-04** (`6d4a51d`; 19 ról, 127 wpisów, raport `audyt/wyniki/RAPORT-F1-AUDYT.md`). **RE-AUDYT fali 1: WSZYSTKIE 14 POGŁĘBIACZY ZAMKNIĘTYCH 2026-09-04** (SEC FE BE BD QA PERF ARCH INT PRIV REPO PIK USP PROTO WDR, każdy z krytykiem), **walidator zamknął falę** (53 wpisy: 43 ISTNIEJE, 10 ODRZUCONE, 0 bez werdyktu), **PSIARZ, STRAZ i SKUT zamknięte z krytykami** (krytyk SKUT jeszcze nie wchodził), **77 wpisów `REA-*`, 202 w sektorze**. Przerwany na polecenie właściciela — stan, kolejność dokończenia i dwie role pracujące w chwili przerwania w podsekcji **„PRZERWANIE CZWARTE"**. Zapis historyczny: przerwanie trzecie zastało 7 z 14 Pogłębiaczy (podsekcja „PRZERWANIE TRZECIE"). Zapis historyczny: **AUDYT FALI 1 ZAMKNIĘTY 2026-09-04**: wszystkie **19 ról ZAKOŃCZONE**, **127 wpisów**, raport w `audyt/wyniki/RAPORT-F1-AUDYT.md`, strażnik kod 0, niezmiennik 0. Fala przeszła przez TRZY wejścia, których plan uruchomień nie przewidywał (trzecie WER, drugie KIER, krytyk WER na żądanie KIER) — ostatnie z nich obaliło trzy zarzuty, które bez niego poszłyby do raportu jako fakty. Re-audyt fali 1 jeszcze NIE ruszył (punkty 8–12 planu uruchomień) | **zielone światło właściciela** przed uruchomieniem. Trzy polecenia z 2026-09-02 WYKONANE; po krytyce **sześć rozstrzygnięć właściciela** i **pakiet roboczy E7.7 (8 pozycji; **WSZYSTKIE ZROBIONE** — ostatnia, 7, 2026-09-03; założenia 4b + 6 potwierdzone tego dnia)** — sekcja „SZEŚĆ ROZSTRZYGNIĘĆ WŁAŚCICIELA PO KRYTYCE" niżej. **NAJWAŻNIEJSZE: K4″ zmienia sens powtarzalności** (agenci mają znaleźć wszystko; zgodność fal = skutek, nie ograniczenie) |

**Właściciel akceptuje KAŻDY etap osobno** przed startem następnego.

**GDZIE JESTEŚMY (2026-09-03) — dla nowej sesji i dla właściciela, który
„trochę się pogubił":** OBA sektory są ZBUDOWANE (E1–E7 zaakceptowane) i żaden nie
został URUCHOMIONY. Trwa pakiet E7.7 — poprawki wiarygodności przed E8 (STOP
i zielone światło na przebieg). Zrobione: 8, 1, 2, 3, 4a, **4b + 6** (2026-09-02, noc — jedno
przejście po 80 definicjach; odpowiedzi właściciela na pięć pytań NIE były zapisane,
kod poszedł po rekomendacjach — **do potwierdzenia**, sekcja „POZYCJE 4b + 6"),
**5** (2026-09-03 — macierz reguła → mutacja; sekcja „POZYCJA 5 — ZROBIONA"),
**7** (2026-09-03 — re-audyt sekwencyjnie na środowisku: `srodowisko.mjs`, odmowa 6,
reguły 30/31, `KIER-00`; sekcja „POZYCJA 7 — ZROBIONA"). **Pakiet E7.7 jest KOMPLETNY,
założenia pozycji 4b + 6 POTWIERDZONE (2026-09-03). NASTĘPNY KROK: E8 = STOP — zielone
światło właściciela na przebieg; nic nie czeka na jego odpowiedź.** Przed przebiegiem
kierownik re-audytu robi `srodowisko.mjs --sprawdz --fala=1` i `--zrzut=f1-baza`, a kierownik
audytu zapisuje migawkę `przed` od nowa (obecna jest z próby E7.6 z dopisanym polem). Katalog `re-audyt/` jest MAŁY z decyzji,
nie z braku: ma tylko to, co jest RÓŻNE od audytu (`ROLE.md` 21 ról, `GRANICE.md`,
`role/` 84 pliki); narzędzia, zgłoszenia, stan, migawki, szablony i dokumenty są
WSPÓLNE i mieszkają w `audyt/` (rozstrzygnięcie 2026-09-01: jeden nośnik, W4 — inaczej
`polacz-sektory` nie połączyłoby fal po haszu). Pomiar `git ls-files`: `re-audyt/` 86
plików, `audyt/` 116 (w tym `role/` 76, `tools/` 15, dokumenty 25; pomiar po pozycji 7).

## E8 — PRZEBIEG FALI 1 (start 2026-09-03)

**Zielone światło właściciela (2026-09-03, dosłownie): „zielone swiatło puszczamy 1 fale
audytu i re audytu".** Zakres zgody: **FALA 1 obu sektorów** (audyt fala 1 → re-audyt
fala 1). Fala 2 (worktree `fala.mjs --postaw=2`) wymaga osobnego zielonego światła —
nie ruszać jej z własnej inicjatywy.

**Kto co uruchamia w przebiegu:** agenci ról nie mają narzędzia `Agent`, więc
KOLEJNOŚĆ URUCHOMIEŃ prowadzi sesja główna (orkiestrator); kierownicy robią swoje
komendy (migawka, mapa, KIER-00, zrzuty) i swoje checklisty. Plan uruchomień
(zapisany PRZED startem, żeby po `/clear` dało się wznowić od właściwego miejsca):

1. `aud-kier` (start fali): `migawka-wartosci.mjs --zapisz=przed` OD NOWA, `mapa.mjs`,
   status `W TRAKCIE`.
2. `aud-kon` faza A (atakuje ZAKRESY przed pracą działów) → `aud-kon-krytyk`.
3. 13 działów audytu RÓWNOLEGLE (K9′): SEC FE BE BD QA PERF ARCH INT PRIV REPO PROTO PIK USP;
   **WDR OSOBNO, PO NICH** — pozycja WDR-06 każe `podman-compose down && ./postaw.sh`,
   co w trakcie cudzych pomiarów na `:8892` (PERF-02, INT-10/11, PRIV-04, BD-06)
   zanieczyściłoby liczby. To decyzja orkiestracji, nie zmiana checklisty.
4. krytyk każdego działu (`aud-<kod>-krytyk`) po zakończeniu działu.
5. `aud-wer` (werdykty weryfikatora dla wpisów `AUD-*-F1-*`) → `aud-wer-krytyk`.
6. `aud-gold` (bramka wyjścia, 14 działów) → `aud-gold-krytyk`.
7. `aud-kon` faza B → krytyk; `aud-kier` (KIER-01…07) → `aud-kier-krytyk`;
   `aud-rap` → `aud-rap-krytyk`.
8. RE-AUDYT: `rea-kier` KIER-00 (`srodowisko.mjs --sprawdz --fala=1`) + `--zrzut=f1-baza`
   DOPIERO TERAZ (po tym, jak audyt skończył dotykać `:8892`).
9. 14 Pogłębiaczy SEKWENCYJNIE (odmowa 6, reguła 30): rola → `--zrzut=f1-<KOD>-po` →
   `--przywroc=f1-baza` → krytyk roli → następna.
10. `rea-walid` (na środowisku, po Pogłębiaczach) → krytyk; `rea-psiarz` → krytyk
    (każdy z zrzutem „po" i przywróceniem); `rea-skut`, `rea-straz` (na plikach) → krytycy.
11. `rea-kon` → krytyk; `rea-kier` (R1…R7, `polacz-sektory --fala=1`) → krytyk;
    `rea-rap` → krytyk.
12. `migawka-wartosci.mjs --zapisz=po` + `--porownaj`; commit `audyt/zgloszenia/*-F1-*`,
    `audyt/stan/*-f1-*`, `audyt/migawki/`.

**Ryzyko nazwane przed startem (nie naprawiać w trakcie — zmierzy je KIER-06 i SKUT):**
działy AUDYTU wykonują na `:8892` pomiary, które PISZĄ (logowanie w smoke'ach, import
BD-06, `postaw.sh` w WDR-06), a audyt nie ma mechanizmu przywracania ze zrzutu —
ma go dopiero re-audyt. Pole `srodowisko` migawki `po` może się przez to różnić od
`przed` bez winy re-audytu; wynik idzie do właściciela jako wynik, nie jest tuszowany.

**Pliki stanu i wpisy z PRÓB (E6/E7.6) leżą w fali 1** (`audyt-f1-PIK`, `audyt-f1-WER`,
`re-audyt-f1-SEC`, `re-audyt-f1-WALID`, `AUD-PIK-F1-001`, `REA-SEC-F1-001/002`) —
prawdziwa fala 1 nadpisze pliki stanu tych czterech ról (historia rośnie), a numeracja
wpisów idzie dalej (`-002`, `-003`). Wpisy próbne zostają ze znacznikiem.

Dziennik przebiegu (co zrobione, co następne) — poniżej, dopisywany w trakcie:

- 2026-09-03: start. Przed startem: strażnik sektora kod 0, generat 80/80, niezmiennik 0,
  `:8892` stoi (5 kontenerów, `/szkolenia/` 200), mapa bez sierot (722 + 399 = 1121).
- 2026-09-03 16:02Z: `aud-kier` START zaliczony (drugie podejście — pierwsze przerwał błąd
  serwera 529 przed jakimkolwiek zapisem): migawka `przed` od nowa (`glowa_main c645895…`,
  919 plików produktu, `srodowisko.tabel` 80, nasze tabele: logowania 21 · wizyty 17 ·
  dostawy 0 · powiązania 2 · changelog 1447 · courses 2 · lessons 73 · modules 12 ·
  sections 22), mapa 722 + 399 = 1121, KIER W TRAKCIE, niezmiennik 0. Koszt ~152 tys. tokenów.
- SZABLON POLECENIA DLA DZIAŁU AUDYTU (identyczny w fali 2 — zmienia się tylko `<KOD>`
  i numer fali; parametr poza definicją roli musi być ten sam w obu falach):
  „Repozytorium: /home/krzysiek/Pod strona Szkolenia  (katalog kończy się SPACJĄ — cytuj
  ścieżkę). Gałąź sektora. SEKTOR: audyt. FALA: 1. Jesteś rolą <KOD>. Pracuj dokładnie wg
  swojej definicji: status W TRAKCIE na starcie, CAŁA checklista pozycja po pozycji
  (każda: komenda, otwarty plik, tak/nie, dowód), potem <KOD>-90, `--runda` po każdej
  rundzie, każde znalezisko przez `zgloszenie.mjs --plik=…` (plik wpisu zapisz w katalogu
  tymczasowym, nie w repo), na końcu ZAKOŃCZONE (z `--niedomkniete=` gdy trzeba). Kody
  wyjścia bez potoku. Nie czytasz CLAUDE.md ani wpisów/stanu innej fali. Nie zmieniasz
  niczego w drzewie poza tym, co zapisują narzędzia sektora. Pomiar na :8892 (jeśli
  pozycja go wymaga): licz stan przed i po, sprzątaj wyłącznie własne ślady. Meldunek
  końcowy do 30 linii: tabela pozycja → tak/nie → dowód w jednej linii, lista ID zgłoszeń,
  liczba rund, niedomknięte, kody wyjścia."
- Partia 1 uruchomiona: `aud-kon` (faza A) + SEC FE BE BD QA PERF (równolegle).
- 2026-09-03 16:2xZ: **SEC ZAKOŃCZONE, zero zgłoszeń, 1 runda** (~361 tys. tokenów, 76 wywołań
  narzędzi, 13 min). Wszystkie 12 pozycji + SEC-90 na „tak/brak luki"; SEC-05 na „nie"
  (brak wycieku). Uruchomiony `aud-sec-krytyk` — dział z zerem znalezisk jest tym
  przypadkiem, w którym krytyk waży najwięcej.
- 2026-09-03 16:1xZ: **BE ZAKOŃCZONE, 1 zgłoszenie** (`AUD-BE-F1-001`, BE-10: start
  `aai-sklep.php` bez `try/catch ( Throwable )`, choć obie siostrzane wtyczki mają go od
  2026-08-31), 2 rundy. Krytyk BE uruchomiony.
- **KONRAD (faza A) ZGŁOSIŁ DWANAŚCIE LUK W AUDYCIE, jeszcze przed końcem działów** —
  m.in. CZTERY zakresy przechodzące po pustce (`KON-A4`: podwzorce z nawiasami klamrowymi
  w zakresach FE, BD i INT dają ZERO plików; miejsce pozycji `USP-08` wskazuje katalog
  `tools/audyt/*`, którego nie ma), trzy granice bez właściciela albo sprzeczne
  z checklistami (`KON-A5`), pozycje odhaczalne wynikiem cudzego strażnika (`KON-A6`),
  klasa `BLAD-016` wykluczona pod błędnym uzasadnieniem (`KON-A3`) i nieaktualny rachunek
  pokrycia w `ROLE.md` (`KON-A1`).
  **DECYZJA ORKIESTRACJI: zakresów NIE ruszamy w trakcie fali 1.** Powód: zmiana zakresu
  w trakcie przebiegu zafałszowałaby porównanie fal (K4″ — rozjazd ma być wynikiem pracy
  agentów, nie skutkiem zmiany reguł w połowie), a sektory nie naprawiają (W2). Skutek
  jest nazwany, nie tuszowany: **działy FE, BD i INT fali 1 pracują na zakresie węższym
  niż deklarowany w `ROLE.md`**, więc ich „brak znalezisk" w tych podwzorcach nie znaczy
  „sprawdzone". To jest materiał do decyzji właściciela przed falą 2.
- 2026-09-03 16:2xZ: **KRYTYK SEC PODWAŻYŁ ZERO ZNALEZISK — trzy własne zgłoszenia**
  (`AUD-SEC-F1-001…003`): komenda pozycji SEC-01/02 przeszukuje tylko `wordpress/wtyczki`,
  a w zakresie roli stoją jeszcze DWIE rejestracje `admin_post_nopriv_`
  w `wordpress/srodowisko/mu-plugins/aai-obwod.php:169-170`, których żadna pozycja nie każe
  otworzyć (dział odpowiedział „każdy handler ma nonce" na podstawie 4 z 6); brzmienie
  „czy KAŻDY" nie zostawia miejsca na wejście, które nonce'a nieść NIE MOŻE (kolektor CSP);
  SEC-11 jest odhaczalna listą NAZW metod — metoda z pustym ciałem przeszłaby tak samo.
  **To jest dowód, że para agent + krytyk działa** (WYTYCZNE N1): dział z zerem znalezisk
  jest właśnie tym, w którym krytyk waży najwięcej.
- 2026-09-03 16:3xZ: **BD ZAKOŃCZONE, 2 zgłoszenia** — `AUD-BD-F1-001` (BD-01:
  `Aai_Platnosci_Zapis::synchronizuj_kurs()` pisze produkt Woo + `powiazania` + meta Tutora
  BEZ transakcji) i `AUD-BD-F1-002` (BD-90: własna komenda zakresu daje 0 plików wtyczek,
  licząc przypadkiem 25 — niezależne potwierdzenie `KON-A4`).

### INCYDENT ŚRODOWISKA :8892 — nasz własny przebieg uszkodził narzędzie pomiarowe

**Zgłosił dział BD w trakcie pracy** (nie naprawiał — słusznie, nie jego ślad).
Zmierzone przez orkiestratora: w `wp-config.php` kontenera stała JEDNA obca linia
`time="…" level=error msg="User-selected graph driver…"` PRZED `<?php` — czyli **stderr
podmana z HOSTA wpisany do pliku w kontenerze** (znaczniki czasu 18:07 i 18:21, a więc
w trakcie pracy działów). Prawdopodobna przyczyna: rola przekierowała wyjście `podman`
do pliku bez odseparowania strumieni, a potem wgrała go z powrotem.

**Skutek był GROŹNY i niewidoczny w kodzie odpowiedzi HTTP** — strona dalej oddawała 200,
ale WordPress wysyłał treść przed nagłówkami, więc zmierzone: **brak
`Content-Security-Policy` i `X-Content-Type-Options`** na `/` i `/szkolenia/`, a
**`/courses/` oddawało 200 zamiast 301**. Każdy pomiar nagłówków, przekierowań
i bezpieczeństwa na tym środowisku dawał w tym czasie wynik FAŁSZYWY.

**Naprawa za zgodą właściciela** (decyzja 2026-09-03, wariant „wgraj poprawiony plik"):
plik skopiowany na hosta, usunięta JEDNA linia, reszta porównana `diff` — identyczna co do
znaku, kopia oryginału zachowana, wgrany z powrotem. Weryfikacja ARTEFAKTU, nie procesu:
strona zaczyna się od `<!doctype html>`, oba nagłówki wróciły, `/courses/` → **301**
na `/szkolenia/`, `wp aai-sklep|aai-platnosci|aai-monitor sprawdz` → kod **0**, dane
nietknięte (changelog 1447, 2 kursy, 73 lekcje).

**LEKCJA DLA RÓL NA ŚRODOWISKU (materiał do decyzji przed falą 2, definicji w trakcie fali
NIE zmieniamy):** `podman` pisze na STDERR hałas o sterowniku pamięci przy KAŻDYM
wywołaniu. Przekierowanie wyjścia `podman` do pliku bez rozdzielenia strumieni wkłada ten
hałas do treści pliku. Gdy plikiem jest `wp-config.php`, skutkiem jest cicha utrata
WSZYSTKICH nagłówków i przekierowań — objawem NIE jest błąd, tylko zdrowo wyglądające 200.

- 2026-09-03 16:4xZ: **KRYTYK BE: PRZEPUSZCZAM `AUD-BE-F1-001`** (miejsce co do linii,
  zjawisko czynne — nic nie łapie wyjątku wcześniej: brak `set_exception_handler`
  w mu-pluginie obwodu), trzy najgroźniejsze pozycje „tak" wytrzymały niezależny pomiar
  (BE-01 pięć kluczy z jawną gałęzią „nie ruszaj", BE-07 `uporzadkuj()` nie rusza LIST,
  BE-11 cztery ciała `sprawdz` bez ani jednego zapisu). **Własne zgłoszenie
  `AUD-BE-F1-002`**: komenda pozycji BE-02 pyta tylko o `insert|update|delete`, więc jest
  ŚLEPA na `$wpdb->query('DROP…')` — a trzy pliki `uninstall.php` kasują nasze tabele POZA
  warstwą zapisu; strażnik projektu (`straznik-wtyczki-wp` reguła 10) pyta o obie formy,
  checklista audytu o jedną.
- 2026-09-03 17:0xZ: **QA ZAKOŃCZONE, DZIEWIĘĆ zgłoszeń** (`AUD-QA-F1-001…009`), 2 rundy.
  Cztery o słabej asercji podciągiem (smoke D4/D5/D6), jedno o `\w` ślepym na polskie formy,
  jedno o weryfikacji jednej strony zamiast całego artefaktu wydania, jedno o cichym
  `process.exit(0)` w trzech strażnikach treści, jedno o **7 z 39 strażników bez ani jednej
  mutacji** i jedno o tym, że **audyt mutacyjny nie jest wołany ani w CI, ani w
  `npm run check`**. Cztery pozycje QA zamknięte na „nie". Krytyk QA uruchomiony.
- 2026-09-03 17:1xZ: **KONRAD ZAMKNĄŁ FAZĘ A — 13 zgłoszeń, status zostaje W TRAKCIE**
  (faza B po raportach działów). Wszystkie sześć pozycji `KON-A1…A6` z policzenia, cztery
  na „tak". Najcięższe, bo dotyczy MATERIAŁU tej fali: cztery podwzorce `:(glob)…{a,b}`
  dają **zero** plików (git 2.55 nie zna nawiasów klamrowych), więc **dział BD stracił ze
  swojego zakresu WSZYSTKIE 10 plików PHP wtyczek**, FE dziewięć klas, INT sześć —
  a deklarowane liczby (25 / 57 / 15) zgadzają się, bo policzono je TĄ SAMĄ zepsutą
  komendą. Zakres QA nie zawiera ani jednego z ośmiu plików `*.test.ts` przy deklaracji
  „83 testy". Konrad potwierdził też niezależnie incydent `wp-config.php` i nazwał
  mechanizm: **migawka wartości nie liczy plików instalacji WordPressa, więc W6 tej klasy
  nie wykryje** (`AUD-KON-F1-013`). Krytyk Konrada uruchomiony na wszystkie trzynaście.
  **Aktora zapisu do `wp-config.php` NIE USTALONO** — żaden skrypt repo ani sektora tego
  pliku nie pisze; oba zapisy (16:07 i 16:21 UTC) padły w oknie pracy działów.
- 2026-09-03 17:2xZ: **KRYTYK BD: PRZEPUSZCZAM oba** (`001` sierota produktu jest trwała
  i NIEWIDZIALNA dla kontroli — sprawdził dwiema drogami, `sync` jej nie naprawia, tylko
  tworzy kolejny produkt; `002` odtworzył u siebie: 25 plików z zera z `wordpress/wtyczki`,
  a ta sama lista bez klamry daje 35, w tym wszystkie 10 klas). **Własne zgłoszenie
  `AUD-BD-F1-003` — luka w NOŚNIKU sektora:** nie ma gdzie zapisać odpowiedzi „tak", więc
  **plik stanu działu, który przeszedł całą checklistę, jest bajt w bajt identyczny z plikiem
  działu odhaczonego**; `porownaj-cykle.mjs` porównuje fale WYŁĄCZNIE po katalogu zgłoszeń.
- 2026-09-03 17:2xZ: **KRYTYK QA: osiem PRZEPUSZCZAM, jedno ODRZUCAM** — `AUD-QA-F1-001`
  odrzucone z dowodem: `smoke-d4.ts:126` porównuje CAŁĄ kartę z goldenem niosącym
  `199,00 zł`, więc regresja ceny i tak wywala bramkę; zjawisko zablokowane niżej na tej
  samej ścieżce. **To jest mechanizm pary działający tak, jak miał**: dział zgłosił słabą
  asercję, nie sprawdziwszy, czy golden w TYM SAMYM pliku jej nie łapie. Krytyk zgłosił też
  `AUD-QA-F1-010` (QA-11 odhaczalna licznikiem, który z definicji nie widzi strażnika bez
  ani jednej mutacji — pokazuje `0/0` przy siedmiu bramkach bez pokrycia).
- 2026-09-03 17:3xZ: **FE ZAKOŃCZONE, 3 zgłoszenia, FE-11 NIEDOMKNIĘTE** przez awarię
  środowiska (koszyk w dolarach `$299.00` mimo `zł` na stronie kursu, angielski napis
  pustego koszyka, mylący okres kafelków monitoringu). FE **wznowiony** po naprawie, żeby
  domknąć FE-11 i sprawdzić własne dwa zgłoszenia na ZDROWYM środowisku — wpisów nie
  kasuje, od oceny jest krytyk.
- 2026-09-03 17:4xZ: **KRYTYK KONRADA: 13 × PRZEPUSZCZAM, każde odtworzone WŁASNYM
  pomiarem.** Kluczowe liczby, już podwójnie potwierdzone: zakres FE traci 9 klas (brace
  → 0, te same nazwy bez klamr → 9), **zakres BD nie zawiera ANI JEDNEGO z 10 plików PHP
  wtyczek**, INT traci oba podwzorce, zakres QA nie ma ani jednego z 8 plików `*.test.ts`
  przy deklaracji „83 testy", `git ls-files` daje **1121** wobec deklarowanych 921,
  komenda `QA-12` daje 2 trafienia wobec 55, katalog `tools/audyt/*` z pozycji `USP-08`
  nie istnieje. Rozstrzygnął też, że 001-003 to NIE jedno znalezisko trzy razy: wspólna
  przyczyna, ale trzy linie, trzy zbiory traconych plików i trzy skutki — naprawa jest
  per linia. **Własne `AUD-KON-F1-014`**: `mapa.mjs` mierzy pustkę CAŁEJ komendy działu,
  nie podwzorców, więc po naprawie `ROLE.md` ślepota zostaje, a `KON-A4` domyka się na
  „nie" bez otwarcia pliku — powtarzalność wisi wtedy na czujności agenta, nie na
  mechanizmie.
- Partia 2 uruchomiona: ARCH INT PRIV REPO PROTO PIK USP (WDR na końcu, osobno).
- 2026-09-03 18:0xZ: **FE DOMKNĄŁ FE-11 na naprawionym środowisku** (`smoke:wp-jezyk`
  **25/25**, ręcznie sprawdzone `/my-account/`, `/orders/`, `/edit-account/`,
  `/szkolenia/moje/` — polszczyzna bez wyjątku, zero nowych zgłoszeń), 4 rundy,
  **ZAKOŃCZONE bez niedomkniętych**. **Oba zgłoszenia o koszyku POTWIERDZONE na ZDROWYM
  środowisku — to nie był artefakt awarii:** produkt 75 w koszyku pokazuje `$299.00`
  trzy razy, choć strona kursu obiecuje `299,00 zł`; pusty koszyk w świeżym profilu dalej
  mówi „Your cart is currently empty! New in store". Higiena wzorcowa: dziennik logowań
  25 przed, 26 po jego logowaniu, własny wiersz `id=272` usunięty, stan wrócił do 25.
  Krytyk FE uruchomiony — ma sprawdzić OBA pomiary samodzielnie i rozstrzygnąć, czy
  przyczyną waluty jest ustawienie Woo, czy nasza wtyczka (to wiersz do tabeli granic,
  nie powód odrzucenia).
- **WERYFIKATOR (WER) WSZEDŁ** na 25 zgłoszeń z werdyktem krytyka. To jego pierwsze
  z dwóch wejść — resztę dostanie po zamknięciu partii 2.
- 2026-09-03 18:1xZ: **ARCH ZAKOŃCZONE, 4 zgłoszenia**, 2 rundy: `AUD-ARCH-F1-001`
  (ARCH-02: surowy `INSERT INTO {$wpdb->options}` w `class-aai-monitor-podpis.php:190`
  z pominięciem `add_option()`) i trzy cykle zależności klas (`002` monitoring,
  `003` płatności, `004` sklep). Siedem szwów żywych, jedno źródło prawdy o kursie,
  zależności jednokierunkowe — potwierdzone. Krytyk ARCH dostał dwa twarde pytania:
  czy `straznik-wtyczki-wp` tego miejsca NIE WIDZI, czy widzi i świadomie przepuszcza
  (strażnik jest zielony), oraz czy „cykl statycznych wywołań `Klasa::`" ma w PHP
  jakikolwiek SKUTEK wykonawczy przy leniwym autoloaderze, czy jest samym kształtem grafu.
- 2026-09-03 18:1xZ: **PROTO ZAKOŃCZONE, 1 zgłoszenie, JEDNA runda.** Dwanaście pozycji bez
  usterki (jeden AJAX pozostał jeden, kontrakt Zod z sufitami, podgląd statyczny z jednym
  źródłem prawdy, trasa prywatna poza eksportem, publikacja z commita, font z preloadem).
  `AUD-PROTO-F1-001`: `KursWejscie.slug` nie wyklucza segmentu `kreator`, więc kurs o takim
  slugu zapisze się, a jego strona sprzedażowa zostanie trwale przesłonięta trasą kreatora
  — **ta sama klasa co `BLAD-021`, którą wtyczka WP już naprawiła** (`Trasy::PODSTRONY`),
  a prototyp odpowiednika nie ma. Krytyk PROTO dostał zadanie wprost: jedna runda przy
  dwunastu pozycjach to albo zdrowy prototyp, albo odhaczenie — ma sprawdzić samodzielnie
  cztery pozycje, w tym `PROTO-06` (rozjazd z wtyczką), gdzie „nie znalazłem" wygląda
  identycznie jak „nie szukałem".

### PRZERWANIE FALI 1 PRZEZ LIMIT SESJI (2026-09-03, ~19:00 czasu lokalnego)

**Limit pięciogodzinny ubił DZIEWIĘCIU agentów naraz**, każdego w połowie pracy
(HTTP 429, „session limit · resets 9:40pm"). Padli: działy **INT, PERF, PRIV, REPO, PIK,
USP**, krytycy **FE, ARCH, PROTO** i **weryfikator (WER)**. Żaden nie zdążył zapisać
statusu końcowego — wszyscy zostali z `W TRAKCIE`, część z rundą 0.

**To NIE jest awaria sektora ani utrata pracy:** narzędzia zapisują po każdym kroku, więc
w repozytorium został pełny dorobek do chwili przerwania — **53 zgłoszenia** (50 fali 1
plus 3 próbne z budowy). Wznowienie nie wymaga powtarzania niczego, co już zostało zapisane.

**STAN ZMIERZONY PO PRZERWANIU (komendą, nie z pamięci):**

| Rola | Stan | Uwaga |
|---|---|---|
| SEC · BE · BD · QA · FE · ARCH · PROTO | **ZAKOŃCZONE** | siedem działów domkniętych |
| INT · PERF · PRIV · REPO · PIK · USP | **W TRAKCIE** | przerwane w połowie, do wznowienia |
| KON | **W TRAKCIE**, runda 2 | faza A zamknięta (13 zgłoszeń), faza B przed nim |
| WER | **W TRAKCIE**, runda 3 | zdążył wydać część werdyktów weryfikatora |
| KIER | **W TRAKCIE**, runda 0 | drugie wejście (KIER-01…07) dopiero po działach |
| WDR | nieuruchomiony | świadomie ostatni — jego pozycja restartuje środowisko |

Zgłoszenia wg działu: KON 14 · QA 10 · REPO 5 · ARCH 4 · SEC 3 · FE 3 · BD 3 · PIK 2 ·
PERF 2 · BE 2 · PROTO 1 · PRIV 1 (+3 próbne z E6/E7).
**REPO, PIK, PERF i PRIV zdążyły zgłosić, mimo że nie skończyły** — ich wpisy są ważne.

**SPRZĄTANIE PO PRZERWANYCH AGENTACH (zrobione w sweepie):** przerwany dział INT zostawił
konto **`audyt-int-tmp2`** (ID 111, założone 16:49) **z zapisem na kurs**
(`tutor_enrolled` 1369, status `completed`). To ta sama klasa co sierota #2153 z wersji
0.54.0: Tutor liczyłby fałszywego kursanta bez żadnego objawu. Skasowane jawną listą
identyfikatorów (najpierw zapis, potem konto), zweryfikowane OSOBNYM żądaniem — zapisy
`tutor_enrolled` **3 → 2**, konta z powrotem `admin` + `klient-test`.
**Reguła na przyszłość: agent ubity w trakcie pisania do środowiska nie sprząta po sobie
— sprzątanie należy do orkiestratora i musi iść po jawnej liście, nigdy po zakresie.**

**ROZJAZD DANYCH ŚRODOWISKA — ZMIERZONY, NIE UKRYTY.** Wobec migawki `przed` (16:02Z):

| Tabela | Migawka `przed` | Po przerwaniu | Różnica |
|---|---|---|---|
| `wp_aai_monitor_logowania` | 21 | 26 | **+5** |
| `wp_aai_monitor_wizyty` | 17 | 18 | **+1** |
| pozostałe (kursy, lekcje, moduły, sekcje, changelog, powiązania, dostawy) | — | — | **bez zmian** |

Przyrost to ślad pracy działów, które logowały się i otwierały strony na `:8892`
(dział FE swój jeden wiersz usunął sam i to udokumentował). **KIER-06 i migawka `po`
pokażą tę różnicę** — i tak ma być: to jest wynik, nie usterka do zatarcia. Dane dowodowe
właściciela z testu T4 zostały nietknięte co do treści; przyrost dotyczy wyłącznie nowych
wierszy z dzisiejszego dnia.

**JAK WZNOWIĆ PO `/clear` (kolejność wiążąca):**

1. **Sześć przerwanych działów od nowa, równolegle** — INT, PERF, PRIV, REPO, PIK, USP.
   Szablon polecenia stoi wyżej w tym dzienniku; użyć go co do znaku, bo fala 2 dostanie
   ten sam. Każdy zacznie od `--status="W TRAKCIE"`, co jest dozwolone (rola już jest
   w tym stanie) i dopisze wpis do historii.
2. **Krytycy trzech działów, których krytyk nie zdążył**: FE, ARCH, PROTO — plus krytycy
   sześciu wznowionych, gdy skończą.
3. **WER** — drugie wejście, na wszystkie wpisy z werdyktem krytyka bez werdyktu
   weryfikatora (`werdykt.mjs --pokaz`).
4. **WDR jako OSTATNI dział** (jego `WDR-06` woła `podman-compose down && ./postaw.sh`).
5. **KON faza B** → **GOLD** (bramka wyjścia) → **KIER** drugie wejście (KIER-01…07) →
   **RAP**, każdy z krytykiem.
6. **Migawka `po` + `--porownaj`**, potem dopiero re-audyt fali 1.

**PRZED KAŻDYM WZNOWIENIEM SPRAWDZIĆ ŚRODOWISKO** — `curl -s -o /dev/null -w '%{http_code}'
http://127.0.0.1:8892/szkolenia/` oraz `wp aai-sklep sprawdz`; przerwany agent mógł
zostawić stan pośredni.

**DWA ŚLADY W SEKTORZE, oba usunięte w sweepie:**

1. **`audyt/stan/audyt-f2-PROBA.json`** — plik stanu z atrapy samokontroli (`rola: PIK`,
   `fala: 2`, czasy `2026-09-02T10:00…10:20Z` z tablicy testowej), nieśledzony przez gita,
   powstały w trakcie dzisiejszej pracy. **Plik fali 2 leżący w drzewie fali 1** —
   dokładnie to, czego `status.mjs` broni odmową 5. Usunięty; sprawdzone, że dzisiejszy
   `status.mjs --test` **nie odtwarza go** (kod 0, zero plików `PROBA` po przebiegu), więc
   albo zostawiła go wcześniejsza wersja samokontroli, albo agent uruchomił narzędzie
   ręcznie na fali 2. Przyczyny nie ustalono.
2. **Strażnik sektora odmówił RAZ, kodem 1, BEZ ANI JEDNEGO SŁOWA POWODU** — wypisał pełne
   podsumowanie wszystkich reguł i wyszedł jedynką. **Hipotezę „to przez plik atrapy"
   obaliłem testem w obie strony**: bez pliku kod 0, z przywróconym plikiem też kod 0.
   Trzy kolejne przebiegi: **0, 0, 0**. Odmowa nie powtórzyła się i **przyczyny NIE
   USTALIŁEM**; padła w oknie, w którym kasowałem konto-sierotę przez WP-CLI, więc
   podejrzenie pada na warunkowe reguły 30/31 (pytają o środowisko), ale to jest
   podejrzenie, nie pomiar. **Nie brać tego za regresję kodu i nie zaczynać śledztwa od
   nowa bez powtórzenia objawu.** Sama klasa jest znana i zgłoszona w tej fali przez
   dział QA (`AUD-QA-F1-007`, cichy `process.exit` bez komunikatu) — tyle że tam chodzi
   o strażników projektu, a tu o strażnika sektora.

### WZNOWIENIE FALI 1 PO `/clear` (2026-09-03, wieczór)

**Kontrola środowiska przed wznowieniem wykryła DRUGI ślad po przerwanym dziale INT** —
poza kontem `audyt-int-tmp2` i zapisem na kurs, sprzątniętymi w poprzednim sweepie,
w tabeli `wp_aai_platnosci_dostawy` stały **dwa wiersze (`id` 465 i 466, oba 16:49:52)**
po zamówieniu **1368, którego już nie ma** (`wp_wc_orders` puste, zero zamówień w całej
instalacji). Przez to `wp aai-platnosci sprawdz` kończyło **kodem 1** — a nie kod
płatności był tego przyczyną, tylko cudzy niedokończony przebieg.

Sprzątnięte **jawną listą identyfikatorów** (`DELETE … WHERE id IN (465,466)`), razem
z opcją `aai_platnosci_blad`, w której wtyczka trzymała komunikat o niewysłanej
wiadomości. Weryfikacja ARTEFAKTU: `dostawy` **0** (zgodnie z migawką `przed`),
`powiazania` **2**, zamówienia **0**, konta `admin` + `klient-test`, zapisy
`tutor_enrolled` **2**, `wp aai-sklep|aai-platnosci|aai-monitor sprawdz` → kod **0**,
`/szkolenia/` → **200**.

**Rozjazd monitoringu bez zmian od pomiaru po przerwaniu:** `logowania` **26**
(migawka `przed`: 21), `wizyty` **18** (`przed`: 17) — to ślad pracy działów na `:8892`,
pokaże go KIER-06 i migawka `po`. Pozostałe tabele bez zmian.

**Wzmocnienie reguły o sprzątaniu:** ślad ubitego agenta potrafi być rozłożony na kilka
NOŚNIKÓW — konto, zapis na kurs, wiersz dziennika dostaw i opcja z komunikatem błędu.
Sprzątanie jednego z nich zostawia kontrolę czerwoną, a czerwona kontrola przed startem
działów wygląda jak regresja produktu. **Sprzątając po agencie, przejdź WSZYSTKIE nośniki,
które jego ścieżka dotyka**, i domykaj to kodem wyjścia kontroli, nie samą liczbą wierszy.

Wznowione tym samym szablonem polecenia co partie 1 i 2: **INT, PERF, PRIV, REPO, PIK,
USP** równolegle; potem krytycy **FE, ARCH, PROTO**, potem krytycy sześciu wznowionych,
**WER**, **WDR** jako ostatni dział, dalej **KON faza B → GOLD → KIER → RAP**.

**SZABLON POLECENIA MA WADĘ, KTÓRA POWTÓRZY SIĘ W FALI 2 — nazwana, nie naprawiana
w trakcie (K4″: parametr poza definicją roli musi być w obu falach ten sam).** Zdanie
„Nie czytasz CLAUDE.md ani wpisów/stanu innej fali" jest sprzeczne z definicją roli
**PIK**: `ROLE.md` (PIK-03, PIK-06, PIK-07, PIK-08) wprost każe jej ten plik czytać,
a `BRIEF-PROJEKTU.md` §11 nazywa PIK **jedynym wyjątkiem** od tego zakazu. Dział fali 1
zachował się poprawnie — czytał wg definicji roli i zgłosił sprzeczność w meldunku, tak
jak wcześniejsze wpisy `AUD-PIK-F1-001…003` tej samej fali, które CLAUDE.md cytują.
**Do decyzji właściciela przed falą 2:** albo szablon dostaje wyjątek dla PIK, albo zakaz
przenosi się do definicji ról (gdzie ma wyjątek), a z szablonu znika. Zmiana szablonu
w trakcie fali 1 zafałszowałaby porównanie fal, więc jej nie robimy.

- 2026-09-03, wieczór: **PIK ZAKOŃCZONE** (wznowienie), 1 runda w tej sesji, zero
  niedomkniętych. Cztery pozycje na „nie": PIK-05 (`AUD-PIK-F1-003`, cztery niezależne
  trasy `admin-post.php` w `aai-sklep` zamiast jednego dyspozytora — WYTYCZNE §8),
  PIK-07 (**nowe `AUD-PIK-F1-004`**: pozycja „kompozycja hero katalogu po usunięciu
  pływaka gwarancji", zgłoszona właścicielowi dwukrotnie przy P5, znika bez śladu
  z 900+ dalszych linii dziennika, z CHANGELOG i z planu trzech ostatnich kroków),
  PIK-08 (`AUD-PIK-F1-002`, brak faktur i VAT na listach „przed pierwszym klientem").
  Krytyk PIK uruchomiony z zadaniem sprawdzenia trzech pozycji zamkniętych na „tak"
  — jedna runda na całej checkliście to albo zdrowy obszar, albo odhaczenie.
- 2026-09-03, wieczór: **USP ZAKOŃCZONE**, 3 zgłoszenia (`AUD-USP-F1-001…003`), 1 runda,
  zero niedomkniętych. Wszystkie trzy mówią o BRAKU NARZĘDZIA, nie o produkcie: nie ma
  czym policzyć zapytań na odsłonę (`SAVEQUERIES` — zero trafień w repo), narzędzie wagi
  strony domyślnie mierzy prototyp zamiast wtyczki, a rejestr 30 błędów nie ma wzorca
  maszynowego, więc zasięgu klasy nie da się policzyć skryptem.
  **Dział zgłosił WŁASNY INCYDENT na środowisku i naprawił go:** przypadkowe wywołanie
  `tools/wgraj-sekcje.ts --help` rozjechało identyfikatory sekcji między Postgresem
  a `:8892` (ta sama klasa co pułapka `db1:sekcje` z P5 — warstwa zapisu podmienia sekcje
  parą DELETE + INSERT), naprawione `npm run wp:import`. Krytyk USP dostał zadanie
  sprawdzenia stanu własnym pomiarem ORAZ rozstrzygnięcia, czy pomiary działu wykonane
  PO incydencie nie są nim zanieczyszczone.
  **Krytyk USP dostał też rozbieżność zakresu do rozstrzygnięcia:** Konrad zgłosił, że
  pozycja `USP-08` wskazuje katalog `tools/audyt/*`, którego nie ma; dział odpowiedział
  „tak", mierząc `audyt/tools/*.mjs` — katalog o ODWRÓCONEJ kolejności segmentów.
- 2026-09-03, wieczór: **INT ZAKOŃCZONE**, 1 zgłoszenie, 2 rundy, zero niedomkniętych.
  `AUD-INT-F1-001` (INT-11) zmierzone na `:8892`: **skasowanie zamówienia
  (`wp wc shop_order delete --force`) NIE cofa wpisu `tutor_enrolled`** — `is_enrolled()`
  dalej oddaje `true`, czyli dostęp zostaje po zniknięciu podstawy zakupu. Osiem pozycji
  na „tak", INT-03 i INT-04 na „nie znaleziono ryzyka".
  Krytyk INT dostał cztery zadania, w tym **pomiar własnego zakresu obiema formami
  komendy** (`AUD-KON-F1-004`: podwzorce z klamrą dają zero plików, a deklarowana liczba
  zgadza się, bo policzono ją tą samą zepsutą komendą) i sprawdzenie INT-04 pod kątem
  instrukcji rzucającej PRZED `try` — klasa, która w tym projekcie raz już przeszła obok
  reguły pytającej o samą obecność słowa.
  **Ślad pomiaru INT zostaje w `wp_aai_platnosci_dostawy`** (wiersze `id` 467 i 468 po
  zamówieniu 1370, oba `21:07:30`, wynik `wyslano`). **Nie kasuję ich**: w odróżnieniu od
  wierszy 465/466 nie psują kontroli (`aai-platnosci sprawdz` kod **0**), a migawka `po`
  ma ten przyrost pokazać jako wynik pracy fali, nie zatrzeć. Reguła, która z tego wychodzi:
  **sprzątamy ślad, który UNIERUCHAMIA narzędzie pomiarowe; ślad, który tylko przesuwa
  liczbę, idzie do migawki.**
- 2026-09-03, wieczór: **PRIV ZAKOŃCZONE**, 3 zgłoszenia, 2 rundy, zero niedomkniętych.
  Najcięższe jest `AUD-PRIV-F1-002` (PRIV-07): `get_privacy_policy_url()` na `:8892`
  zwraca **pusty łańcuch**, bo opcja wskazuje SZKIC (ID 3) zamiast opublikowanej strony
  (ID 23) — czyli zdanie w kasie powołuje się na politykę prywatności **bez działającego
  odnośnika**, wprost przeciwnie do rozstrzygnięcia C3 z 2026-08-31 („polityka ZOSTAJE,
  bo jest podpięta i klikalna"). Do tego `AUD-PRIV-F1-003` (PRIV-01): kolumna `agent`
  w `wp_aai_monitor_logowania` trzyma **surowy User-Agent**, choć polityka i kod obiecują
  „nazwę przeglądarki" — zmierzone żywym zapisem, wiersz skasowany przez dział.
  `AUD-PRIV-F1-001` (PRIV-02, trzy pierwsze znaki wpisanej wartości jawnym tekstem przy
  nieistniejącym koncie) pochodzi z poprzedniej sesji tej fali.
  Krytyk PRIV dostał do rozstrzygnięcia rzecz decydującą o wadze `002`: czy pusty odnośnik
  bierze się z KONFIGURACJI tego środowiska, czy z NASZEGO kodu, który powołuje się na
  politykę, nie sprawdziwszy, że istnieje — od tego zależy, czy zjawisko przeżyje wdrożenie
  u klienta. Do tego pomiar ZASIĘGU surowego User-Agenta i pytanie, czy „tak" na PRIV-05
  (sprzeczność polityki ze stanem witryny) odpowiada na brzmienie pozycji, czy na inne
  pytanie.
- 2026-09-03, wieczór: **PERF ZAKOŃCZONE**, 6 zgłoszeń, 2 rundy, zero niedomkniętych.
  Trzy N+1 (`tutor.php` per moduł, `cli.php` per powiazanie, `moje.php` dwupoziomowy),
  `produkt_kursu()` bez pamięci na żądanie (7 razy to samo zapytanie na odsłonę), brak
  `nocache_headers()` na trasie pojedynczej lekcji mimo treści zależnej od konta, oraz
  beacon monitoringu jako dodatkowy niebuforowalny przebieg PHP. Zmierzone zapytania na
  trasę: katalog 77–81, kurs 83, moje 111, lekcja 88.
  Krytyk PERF dostał pięć zadań, w tym **własny pomiar tych liczb** (w tym repozytorium
  liczba zapytań wyprowadzona z lektury myliła się już o rząd wielkości) i rozstrzygnięcie,
  czy zgłoszenie o beaconie wnosi cokolwiek ponad **pozycję A11, którą właściciel
  ŚWIADOMIE ZOSTAWIŁ OTWARTĄ** przy przeglądzie T3 („pozycja wdrożeniowa, kodu nie
  ruszamy") — i czy 65–84 ms zgadza się z tamtym pomiarem 45–50 ms.
  Dział mierzył tymczasowym mu-pluginem `zzz-aai-audyt-perf-tmp.php`, który usunął;
  `git status` to potwierdza.
- 2026-09-03, wieczór: **REPO ZAKOŃCZONE**, **13 zgłoszeń** (5 odziedziczonych z przerwanej
  sesji + 8 nowych), 3 rundy, zero niedomkniętych — najwięcej w tej fali. Cztery pozycje na
  „nie": nieprawdy w prozie ośmiu dokumentów, wiersze tabeli z treścią po zamykającym `|`
  w `docs/plugin-3/DIAGRAM.md`, `straznik-linkow` nie sprawdzający kotwic `#…` poza README,
  oraz CONTRIBUTING mówiący „prefiksy do wersji 0.21.0" przy 65+ commitach z prefiksem PO
  tym tagu. Krytyk REPO dostał jako zadanie główne rozstrzygnięcie, **ile z trzynastu to
  osobne zjawiska**, kryterium przyjętym już przy `AUD-KON-F1-004` (różne miejsce, różny
  zbiór skutków, osobna naprawa = osobne zgłoszenie).

### USZKODZENIE `audyt/ROLE.md` W TRAKCIE FALI — źródło prawdy sektora straciło całą rolę

**Zgłosiły to niezależnie DWA działy** (PERF i REPO), obserwując w drzewie zmianę
w `audyt/ROLE.md`, której same nie zrobiły. Zmierzone przez orkiestratora: `git diff`
pokazał **28 usunięć i zero wstawek** — z pliku zniknęła **CAŁA definicja roli PIK**:
nagłówek „PIK — Początek i koniec", komenda zakresu (10 plików) i wszystkie pozycje
`PIK-01…PIK-90` wraz z sekcją „Nie bierze".

**Przywrócone** z HEAD (`git checkout -- audyt/ROLE.md`, kopia uszkodzonej wersji odłożona
poza repo). Weryfikacja ARTEFAKTU, nie procesu: `git diff` pusty, **osiem pozycji `PIK-0*`
z powrotem**, `generuj-agentow.mjs --sprawdz` kod **0**. Definicje w `.claude/agents/`
nie ucierpiały — generat zgadza się ze źródłem po `sha256`.

**AKTORA NIE USTALONO.** Uszkodzenie padło w oknie pracy sześciu równoległych działów;
żadne narzędzie sektora tego pliku nie zapisuje. Klasa jest ta sama co incydent
`wp-config.php` z wcześniejszej partii: **cudzy przebieg nadpisuje plik, którego nie miał
dotykać, a objawem nie jest błąd — tylko cisza.**

**DLACZEGO TO JEST GROŹNE, a nie tylko brzydkie:** krytyk PIK pracował w tym oknie i mógł
zastać `ROLE.md` BEZ checklisty roli, którą ocenia — czyli sprawdzać dział bez jego
pytań. Dostał o tym wiadomość z poleceniem przeczytania sekcji PIK od nowa i wskazania
w meldunku, czy któryś werdykt wydał na niepełnym pliku.

**Do decyzji właściciela przed falą 2:** sektor nie ma dziś ŻADNEJ bramki na własne pliki
źródłowe. `generuj-agentow.mjs --sprawdz` porównuje generat ze źródłem, więc złapałby
rozjazd definicji **dopiero po regeneracji** — samo uszkodzenie `ROLE.md` przechodzi
u niego bez słowa, bo generat i tak jest starszy. Migawka wartości też tego nie liczy
(ta sama luka, którą Konrad nazwał w `AUD-KON-F1-013` dla plików instalacji WordPressa).

- 2026-09-03, wieczór: **KRYTYK PIK — jedno PRZEPUSZCZAM, DWA ODRZUCAM, dwa własne
  zgłoszenia.** Odrzucenia mają dowód i **obalają meldunek działu**: (1) `AUD-PIK-F1-003`
  (rzekome cztery niezależne trasy `admin-post.php`) upada w pliku, który samo zgłoszenie
  wskazuje — cztery formularze POST-ują na JEDEN adres, a akcja jedzie jako DANE
  w `name="action"`, czyli dokładnie wg WYTYCZNE §8, a decyzja właściciela „POTWIERDZONE
  2026-08-28" mówi to wprost; (2) `AUD-PIK-F1-004` (rzekomo zapomniana „kompozycja hero
  katalogu") upada, bo pozycja ma OBA ślady: jawne odłożenie w `KROK-P5.md:319,325`
  i rozstrzygnięcie w `TEST-RECZNY-P6.md` („akceptuje wszystko").
  **`AUD-PIK-F1-005` jest ważniejszy niż każde z odrzuconych zgłoszeń działu, bo wyjaśnia
  ICH PRZYCZYNĘ:** komenda pozycji `PIK-07` w `ROLE.md:498` brzmi
  `grep -n 'ZOSTAJE DO DECYZJI' CLAUDE.md docs` i **NIE CZYTA katalogu `docs`** — bez `-r`
  GNU grep kończy kodem 2 („docs: Jest katalogiem"), a `ugrep` z powłoki sesji pomija
  katalog **w ciszy z kodem 0**; do tego wzorzec wielkimi literami nie trafia w nagłówek
  „Zostaje do decyzji właściciela". Czyli pozycja o rzeczach nierozstrzygniętych czyta
  jeden plik zamiast całej dokumentacji — **i pójdzie w tej samej postaci do fali 2**.
  `AUD-PIK-F1-006`: sektor nie ma nośnika na WYNIK pojedynczej pozycji — dla sześciu
  pozycji tej roli nie istnieje żaden artefakt mówiący, czy je przejrzano (drugie,
  niezależne trafienie w tę samą lukę co `AUD-BD-F1-003`).
  Krytyk zweryfikował własnym pomiarem trzy pozycje na „tak" (PIK-02, PIK-03, PIK-06 —
  przeliczył 26 bramek B/W/P/T, każda ma zapisany wynik) i potwierdził, że czytał pełną
  checklistę z `audyt/role/PIK/AGENT.md`, więc **uszkodzenie `ROLE.md` nie zafałszowało
  ani jednego jego werdyktu**. Rozstrzygnął też sprzeczność szablonu: CLAUDE.md jako
  WEJŚCIE WIEDZY jest zakazane, jako PRZEDMIOT audytu wymagane — dział czytał go jako
  przedmiot, więc wartość wyniku stoi.
- 2026-09-03, wieczór: **KRYTYK INT — PRZEPUSZCZAM `AUD-INT-F1-001` i poszedł DALEJ niż
  dział.** Odtworzył u siebie (zamówienie 1373 → zapis 1374 → `delete --force`): wiersz
  zamówienia znika, zapis zostaje `completed`, `is_enrolled` = TAK. **Zmierzył też ścieżkę
  KOSZA**, której dział nie sprawdził: `delete` BEZ `--force` (status `trash`) też
  zostawia dostęp — czyli obie połowy „Kosz → Usuń trwale" są dziurawe, nie tylko druga.
  Granica nazwana: brak reakcji na usunięcie zamówienia jest zachowaniem **Tutora** (zero
  haków `woocommerce_*delete_order` w jego kodzie), ale P5 przyjął odbieranie dostępu jako
  NASZE wymaganie (`smoke-wp-zwroty`), a milcząca kontrola `aai-platnosci sprawdz` to nasz
  kod — więc pozycja zostaje przy INT.
  **Pomiar zakresu INT (punkt, o który był proszony):** komenda z `ROLE.md:321-323` daje
  **15** plików, te same ścieżki bez klamry — **21**; stracone sześć:
  `assets/tutor-motyw.css`, `assets/woo-motyw.css`, `class-aai-sklep-styl-tutora.php`,
  `class-aai-sklep-styl-woo.php`, `class-aai-sklep-tutor.php`, `class-aai-sklep-zasoby.php`.
  Skutek policzony co do pozycji: **INT-07 miało 1 z 1 pliku dowodowego poza zakresem,
  INT-05 — 2 z 2**. Krytyk NIE zdublował tego zgłoszeniem (`AUD-KON-F1-003` już
  ZWERYFIKOWANE), tylko potwierdził niezależnym pomiarem — tak ma działać para.
  **INT-04 sprawdzone samodzielnie i obalone: dwa handlery Pluginu 2 na cudzych hakach NIE
  MAJĄ ŻADNEGO `try`** — `Aai_Platnosci_Kasa::link_pozycji` (hak
  `woocommerce_cart_item_permalink`, woła naszą tabelę i dwie klasy Pluginu 1) oraz
  `::na_bloku` (hak `render_block_data`, sygnatura z typem zwrotnym przy
  `strict_types = 1`). Strażnik pokrywa tylko haki `aai_sklep_*` i blokadę koszyka — tych
  dwóch linii nie pilnuje NIC. Druga połowa pytania wyszła czysto: w żadnym osłoniętym
  handlerze instrukcja zdolna rzucić nie stoi PRZED `try`.
  Własne `AUD-INT-F1-002`: pozycja INT-04 nie ma mechanicznego kryterium domknięcia —
  pytanie jest sądem o możliwości, dowód faktem, więc **fala 2 może odpowiedzieć odwrotnie
  bez żadnej zmiany w kodzie i wyprodukować fałszywy sygnał rozjazdu fal**.
  Środowisko przywrócone do stanu zastanego, sprzątnięte jawną listą; zmierzone po:
  zamówienia 0, zapisy 2, konta 2, kursy 2, lekcje 73, trzy kontrole kod 0.
- 2026-09-03, wieczór: **KRYTYK USP — trzy razy PRZEPUSZCZAM, jedno własne zgłoszenie
  i DWA ustalenia ważniejsze od werdyktów.**
  Rozbieżność zakresu rozstrzygnięta na korzyść działu: pozycja `USP-08` w `ROLE.md:500`
  każe otworzyć `tools/audyt/*`, **katalog nieistniejący**, a narzędzia E4 leżą
  w `audyt/tools/` — dział zmierzył realny dorobek, więc jego „tak" NIE powstało po
  pustce; wadliwy jest zapis pozycji (odwrócone segmenty ścieżki **plus** to, że
  `audyt/tools/` nie mieści się w żadnym globie 94-plikowego zakresu USP, czyli pozycji
  nie da się domknąć bez wyjścia poza własny zakres). Nie zdublował tego zgłoszeniem,
  bo ma je Konrad (`AUD-KON-F1-011`).
  **Incydent `wgraj-sekcje` miał DWA zapisy, nie jeden** (`course_changelog`, actor
  `wgraj-sekcje`: 21:07:56 i 21:08:48, po 22 delete + 22 create). Naprawa mimo to pełna,
  sprawdzona niezależnie: `wp:sprawdz` kod 0 (73/73 co do znaku), `wp:tutor` kod 0
  (87 obiektów, 0 różnic). Zmieniły się identyfikatory, nie tekst.
  **`AUD-USP-F1-004` trafia w lukę orkiestracji, nie w produkt:** zamek „jedna rola na
  środowisku `:8892` naraz" istnieje WYŁĄCZNIE dla sektora re-audyt (`status.mjs:182`
  warunek `sektor === "re-audyt"`, reguła 30 strażnika), a checklisty AUDYTU każą mierzyć
  na tym samym stanowisku (PERF-02, INT-10, PRIV-04, USP-01/03). W fali 1 **sześć działów
  miało nakładające się okna `W TRAKCIE`** (zmierzone z pól `historia`) i nie padła ani
  jedna odmowa.

### DRUGIE SKAŻENIE `wp-config.php` — tym razem CZYNNE, i domyka śledztwo o aktora

**Znalazł krytyk USP, potwierdzone pomiarem orkiestratora.** W `wp-config.php` kontenera
stoi **wstrzyknięta sonda pomiarowa spoza repozytorium**, linie 139–150:
`define('SAVEQUERIES', true)` + `register_shutdown_function` dopisujący liczbę zapytań do
`/tmp/aai_perf.log` i pełne zrzuty do `/tmp/aai_perf_dump.log`. Plik ma mtime
**16:38:32 UTC**, a log **rośnie do teraz** (21:25 UTC) — czyli sonda była czynna przez
całą pracę wszystkich późniejszych ról.

**Zostawił ją dział PERF**, który w meldunku napisał wyłącznie o tymczasowym mu-pluginie
`zzz-aai-audyt-perf-tmp.php` i o zapisie do `wp-config.php` nie wspomniał ani słowem.

**To domyka pytanie o aktora wcześniejszego uszkodzenia.** Trzy zapisy do tego samego
pliku w jednym oknie: **16:07** i **16:21 UTC** (obca linia stderr podmana przed `<?php`,
przez którą zniknęły `Content-Security-Policy` i `X-Content-Type-Options`, a `/courses/`
oddawało 200 zamiast 301) oraz **16:38 UTC** (ta sonda). Wcześniejszy zapis dziennika
mówił „aktora NIE USTALONO" i był prawdziwy w chwili pisania — teraz trop jest jeden
i wskazuje na instrumentację PERF, wykonywaną przekierowaniem wyjścia `podman` bez
rozdzielenia strumieni.

**Co to unieważnia:** `SAVEQUERIES` każe WordPressowi trzymać w pamięci każde zapytanie
z backtrace, więc **każdy pomiar CZASU i PAMIĘCI wykonany po 16:38 UTC jest zawyżony** —
w tym pomiar beaconu 65–84 ms z `AUD-PERF-F1-004` (zderzany z decyzją właściciela A11,
gdzie stoi 45–50 ms) i pomiar Lighthouse'a cytowany w dowodzie `AUD-USP-F1-002`.

**Sondy nie zdejmuję, dopóki nie skończy krytyk PERF** — bez niej nie odtworzy pomiarów
działu. Dostał o niej wiadomość z poleceniem powiedzenia wprost, czy jego liczby powstały
z cudzej sondy, czy z własnego mechanizmu. Zdjęcie i weryfikacja artefaktu (nagłówki,
`/courses/` → 301, kontrole trzech wtyczek) idzie zaraz po jego meldunku.

**LEKCJA, KTÓREJ NIE MIAŁ ŻADEN WCZEŚNIEJSZY ZAPIS:** rachunek sumienia agenta obejmuje
to, co agent PAMIĘTA, że zmienił. Dział PERF sprzątnął mu-plugin, o którym pamiętał,
i zostawił czynną modyfikację pliku konfiguracyjnego, o której nie napisał. **Bramka musi
liczyć PLIKI INSTALACJI, nie deklaracje agenta** — dokładnie ta luka, którą Konrad nazwał
w `AUD-KON-F1-013` (migawka wartości sektora nie liczy plików WordPressa).

### AKTOR USZKODZENIA `ROLE.md` USTALONY — to WŁASNE narzędzie sektora

**Znalazł krytyk REPO** (`AUD-REPO-F1-015`), pomiarem, nie domysłem.
`audyt/tools/audyt-straznika-sektora.mjs:105` ma mutację o opisie **„z ROLE.md znika cała
rola"**, która wycina z pliku wszystko od `## PIK — Początek i koniec` do `## USP —`.
Zmierzone na dzisiejszym pliku: **2157 znaków, 29 linii, zakres 477–506** — zgadza się co
do znaku z zaobserwowanym uszkodzeniem.

**Dlaczego to wyszło poza narzędzie:** plik przywraca wyłącznie blok `finally`, kopia
oryginału żyje **tylko w pamięci procesu**, nie ma obsługi sygnałów ani znacznika „trwa
mutacja". Proces ubity — a ta fala była już raz ubita limitem sesji — zostawia
`audyt/ROLE.md` **trwale bez jednej roli**, i nic tego nie zgłasza.

To jest **ta sama klasa co sonda w `wp-config.php`**, tylko wewnątrz sektora: narzędzie
psuje przedmiot pomiaru celowo i liczy na to, że zdąży posprzątać.

**Do decyzji właściciela przed falą 2** (sektory nie naprawiają — W2): mutacja pliku
źródłowego sektora potrzebuje kopii NA DYSKU i znacznika, żeby następny przebieg umiał
powiedzieć „poprzedni nie dokończył", zamiast pracować na okaleczonym `ROLE.md`.

- 2026-09-03, wieczór: **KRYTYK REPO — dwanaście PRZEPUSZCZAM, jedno ODRZUCAM, dwa własne
  zgłoszenia.** Rozstrzygnął pytanie główne: **13 z 13 to osobne zjawiska, zero
  duplikatów** — trzynaście różnych linii w dwunastu plikach; dziesięć dzieli jedną
  PRZYCZYNĘ („proza o stanie starzeje się cicho"), ale każde ma inne miejsce, inny zbiór
  faktów i osobną naprawę.
  **`AUD-REPO-F1-008` ODRZUCONE z dowodem odwrotnym niż zgłoszenie:** wpis twierdził, że
  „limitowanie logowań DZIAŁA", a pomiar mówi przeciwnie (decyzja D6 „rejestrujemy, nie
  blokujemy", zero ograniczników w kodzie) — czyli naprawa wg tego wpisu **zamknęłaby po
  cichu pozycję słusznie otwartą**.
  Zasięg `AUD-REPO-F1-004` przeliczony własnym parserem GFM na 413 plikach: naiwny grep
  daje 95 fałszywych trafień, parser — **dokładnie te trzy wiersze**, wszystkie
  w `docs/plugin-3/DIAGRAM.md`. Zjawisko żyje przy ZIELONYM strażniku, stąd własne
  `AUD-REPO-F1-014`: pozycja `REPO-04` pyta o KAŻDY wiersz tabeli w repo, a przypisana
  jej komenda (`straznik-readme` reguła 8) czyta **1 plik z 413**.
  Sprawdził też liczby, których strażnik NIE pilnuje (drzewo README, 21 narzędzi,
  39 strażników, 148 zrzutów, 73 lekcje) — zgadzają się; oraz `BLAD-001…030` bez dziury
  i 55 tagów, każdy z wpisem w CHANGELOG.
- 2026-09-03, wieczór: **KRYTYK PRIV — trzy razy PRZEPUSZCZAM, trzy własne zgłoszenia,
  i jedno ustalenie, które zmienia wagę zgłoszenia `002` z „usterka środowiska" na
  „usterka, którą klient dostanie z pudełka".**
  `wp-admin/includes/upgrade.php:418` ustawia `wp_page_for_privacy_policy` na stronę
  **w stanie szkicu przy KAŻDEJ instalacji WordPressa**, a `get_privacy_policy_url()`
  oddaje adres tylko dla `publish` — czyli pusty odnośnik jest stanem **DOMYŚLNYM**, nie
  cechą `:8892`. Nasz kod dokłada dwie rzeczy: zdanie o zgodzie drukuje się mimo tego, że
  dokumentu nie da się otworzyć, a **remedium w `postaw.sh:168-171` stoi PRZED importem
  treści (:219-231), który tę stronę dopiero tworzy** — przy stawianiu od zera nie ma
  czego znaleźć. Nic tego nie pyta: ani strażnik, ani smoke, ani `aai-platnosci sprawdz`.
  **Zdanie z rozstrzygnięcia C3 („polityka zostaje, bo jest podpięta i klikalna") jest
  nieprawdziwe domyślnie, nie wyjątkowo.**
  Zasięg surowego User-Agenta policzony: **jedna kolumna, jedna tabela** — dział nie
  zawyżył ani nie zaniżył. Trzy pozycje „tak" potwierdzone własnym pomiarem (w tym
  retencja: wstawiony wiersz sprzed dat granicznych znika, żaden inny nie ubywa).
  **PRIV-05 obalone: dział odpowiedział na inne pytanie** — pozycja brzmi „czy polityka
  zgadza się ze stanem witryny", a odpowiedź „tak (znany, nie pogorszył się)" odpowiada
  na pytanie o NOWOŚĆ zjawiska; pomiar daje przeciwnie (strona trzy razy wypiera się
  ciastek, `/wp-login.php` oddaje `Set-Cookie`).
  Trzy własne zgłoszenia trafiają w NOŚNIK sektora, nie w produkt: brak miejsca na wynik
  pozycji (`porownaj-cykle.mjs` czyta ze stanu wyłącznie `status`, więc **ta sama błędna
  odpowiedź w obu falach da „ZGODNE"**), odwrócona polaryzacja „tak/nie" w dwóch
  pozycjach z dziesięciu bez reguły rozstrzygającej, oraz odpowiedź wisząca na wartości
  opcji, której migawka nie widzi (porównuje **liczbę wierszy** `wp_options`, nie wartości)
  — jedno uruchomienie `postaw.sh` odwróci odpowiedź w fali 2 przy migawce „przed == po".
- 2026-09-03, wieczór: **KRYTYK ARCH — trzy PRZEPUSZCZAM, jedno ODRZUCAM, jedno własne
  zgłoszenie; wszystkie trzy twarde pytania zamknięte POMIAREM.**
  **(a) Strażnik tego miejsca NIE WIDZI i nie ma czym widzieć:** żadna z 11 reguł
  `straznik-wtyczki-wp` nie mówi o tabelach RDZENIA (3 = prefiks, 8 = nasze tabele,
  11 = tabele siostry). Udowodnione mutacją na KOPII drzewa:
  `$wpdb->query( $wpdb->prepare( "INSERT INTO {$tabela}…" ) )` poza warstwą zapisu daje
  **kod 0**, a ten sam zapis literałem — **kod 1**. Czyli niezmiennik 8 jest ślepy na formę
  z `prepare()`; to **dziesiąty nawrót klasy „wzorzec pyta o kształt zapisu, nie
  o rozstrzygnięcie"**.
  **(b) Pominięcie `add_option()` to INTENCJA udokumentowana W KODZIE**, nie w dzienniku —
  nad zapisem stoi 20-linijkowy komentarz z powodem, a powód krytyk sprawdził w cudzym
  kodzie: `wp-includes/option.php:1143` faktycznie pisze `INSERT … ON DUPLICATE KEY UPDATE`
  i wkłada wartość do `alloptions`, więc nadpisałby sól zwycięzcy wyścigu. Zgłoszenie
  celuje w samą granicę (wtyczka pisze do tabeli rdzenia), nie w brak uzasadnienia — stąd
  PRZEPUSZCZAM mimo świadomej intencji.
  **(c) Cykl wywołań statycznych NIE MA przy leniwym autoloaderze żadnego skutku
  wykonawczego** — zmierzone dwukrotnie (model w PHP i żywy WordPress: `Aai_Sklep_Kontrakt`
  wczytana sama, delta = tylko ona). Waga trzech zgłoszeń o cyklach spada więc do
  czytelności i utrzymania. Krytyk rozstrzygnął przy tym, że **to trzy zjawiska, nie jedno
  policzone trzykrotnie** (trzy wtyczki, rozłączne zbiory klas, trzy niezależne naprawy).
  **`AUD-ARCH-F1-002` ODRZUCONE** nie za sam cykl (ten potwierdzony co do linii), tylko za
  drugą połowę stwierdzenia: w żywym żądaniu WP-CLI dwie z trzech klas pracują **bez
  trzeciej**, która nie jest wczytana wcale.
  **(d)** Siedem szwów sprawdzone własnym pomiarem, BEZ opierania się na
  `straznik-schematow`: każdy ma nadawcę i odbiorcę w kodzie, odbiorcy rejestrowani przy
  starcie wtyczek, wszystkie nazwy są na schematach `.drawio` i **kierunki się zgadzają**.
  Przy okazji potwierdzone dwa dalsze „tak": wszystkie `add_rewrite_rule` wyłącznie
  w `Aai_Sklep_Trasy`, a zależność jest jednokierunkowa (`aai-sklep` → **zero** odwołań do
  klas sióstr, w drugą stronę **16**).
  Własne `AUD-ARCH-F1-005`: komenda pozycji `ARCH-02` w `ROLE.md:299` pyta o
  `$wpdb->prefix` w katalogu wtyczek, więc **nie umie znaleźć klasy, o którą pozycja pyta**
  — daje 8 wierszy o własnym prefiksie, zero o tabelach rdzenia; pozycję da się zamknąć na
  „nie" bez otwarcia pliku, przy zerowej bramce maszynowej dla tej klasy.
- 2026-09-03, wieczór: **KRYTYK PERF — cztery PRZEPUSZCZAM, DWA ODRZUCAM, jedno własne
  zgłoszenie; liczby policzone WŁASNYM mechanizmem** (bootstrap podawany ze stdin, zero
  plików tworzonych w kontenerze), skrzyżowanym z pomiarem po HTTP.
  Jego liczby wobec liczb działu: katalog **74** (dział 77–81) · strona kursu **80**
  (83) · „moje" **108–113** (111) · lekcja **85**, lekcja gościa na bramce **64** (88).
  Rząd i porządek się zgadzają, więc **metody nie zgłasza**.
  **`AUD-PERF-F1-004` ODRZUCONE — to jest A11**, pozycja otwarta decyzją właściciela
  i zacytowana dosłownie w definicji roli; zgłoszenie jej nie nazywa, a przyrost 65–84 ms
  **nie odtwarza się**: przy 11 próbach strona ma 69 ms mediany, a beacon **50 ms**, czyli
  jest TAŃSZY od strony i mieści się w paśmie A11 (45–50 ms). Przy okazji podał liczbę,
  której dział nie podał: sam beacon kosztuje **88 zapytań** na odsłonę.
  **`AUD-PERF-F1-006` ODRZUCONE, bo wskazuje NIE TO MIEJSCE:** linia 277
  (`is_completed_lesson`) daje **0 zapytań** przy 40 wywołaniach; realny N+1 siedzi
  w `lekcje_kursu()` 333–334.
  `AUD-PERF-F1-002` przepuszczone, ale z korektą liczby: identycznych zapytań o
  `powiazania` jest **5**, nie 7 — siódemka nie odtwarza się w żadnym stanie.
  `AUD-PERF-F1-005` potwierdzone ŻYWYMI nagłówkami (gość na płatnej lekcji = 200 **bez**
  `Cache-Control`), z kontrolą różnicową na `/szkolenia/`, żeby odróżnić naszą linię od
  cudzych nagłówków w stosie.
  Własne `AUD-PERF-F1-007`: checklista PERF-02 **żąda pomiaru `SAVEQUERIES`, którego w repo
  nie ma**, nie podaje metody nietrwałej i **nie wymaga zdjęcia oprzyrządowania** —
  a `migawka-wartosci.mjs` i git widzą wyłącznie drzewo repo, więc zmiana instalacji nie
  zapala niczego. To jest przyczyna systemowa incydentu z sondą, nie jego opis.

### SONDA `wp-config.php` ZDJĘTA — i pułapka, którą po drodze złapał artefakt

Zdjęta po meldunku krytyka PERF (wcześniej nie, żeby mógł odtworzyć pomiary działu;
sam jej nie ruszał — jego próbę podmiany zablokował klasyfikator uprawnień, więc jego
pomiary CZASU powstały na tym samym oprzyrządowaniu; liczby zapytań są na to odporne).

**PUŁAPKA, KTÓREJ NIE WOLNO POWTÓRZYĆ:** pierwsza wersja poprawki powstała w Pythonie
(`open().read()` → `split` → `join`) i **po cichu przekonwertowała końce linii w CAŁYM
pliku**. `wp-config.php` kontenera ma **CRLF** (139 znaków `CR`), a sonda była wstrzyknięta
liniami z samym `LF` — czyli wersja pythonowa miała **zero CR** i zmieniłaby każdą linię
pliku konfiguracyjnego, nie piętnaście. Złapało to **porównanie bajtowe** (`cmp` → „różnią
się: bajt 6, linia 1"), a nie lektura diffa, który przez heurystykę wyrównania wyglądał
na przepisanie całego pliku. Poprawka poszła `sed '139,153d'`, bo `sed` pracuje na
bajtach: wynik ma **139 linii i te same 139 CR**, zero trafień `SAVEQUERIES`/`aai_perf`.

**Weryfikacja ARTEFAKTU, nie procesu:** strona zaczyna się od `<!doctype html>`, wracają
`X-Content-Type-Options: nosniff` i `Content-Security-Policy`, `/courses/` → **301** na
`/szkolenia/`, `wp aai-sklep|aai-platnosci|aai-monitor sprawdz` → kod **0**.
Sprzątnięte jawną listą także cztery ślady w `/tmp` kontenera (`aai_perf.log`,
`aai_perf_dump.log` 5,7 MB, `perf-snippet.php`, `aai_dbg_before.php`) i katalog
`/tmp/cykl_krytyk` po krytyku ARCH. Kopia pliku SPRZED zdjęcia sondy leży poza repo.

**SPROSTOWANIE do wcześniejszego zapisu tego dziennika:** teza, że sonda domyka śledztwo
o aktora uszkodzenia `wp-config.php`, **NIE UTRZYMAŁA SIĘ**. Krytyk PERF zmierzył metodę:
sonda weszła osobnym plikiem dopisywanym wewnątrz kontenera, co **nie przechodzi przez
przekierowanie wyjścia `podman`**, a plik zaczyna się czystym `<?php`. Aktora zapisów
z 16:07 i 16:21 UTC **dalej nie ustalono** — zbieżność czasu nie jest dowodem metody.
- 2026-09-03, wieczór: **KRYTYK PROTO — PRZEPUSZCZAM, pięć pozycji sprawdzonych
  samodzielnie (nie cztery), i rozstrzygnięcie pytania głównego: obszar ZDROWY, zamknięcie
  CZĘŚCIOWO deklaratywne.**
  `AUD-PROTO-F1-001` odtworzone uruchomieniowo w trzech krokach: kontrakt naprawdę
  przepuszcza slug `kreator` (a także `moje` i `api`), własny sorter tras Nexta z tego repo
  stawia statyczny kreator PRZED `[slug]`, i nic nie blokuje wcześniej (baza ma na slugu
  tylko `UNIQUE`, bez `CHECK`). **Wagę obniżył pomiarem, nie opinią:** kreator istnieje
  wyłącznie jako `page.serwer.tsx`, więc w publikowanym podglądzie kolizji NIE MA — to dług
  zamknięty w trybie, którego produkt nie używa.
  **PROTO-06 potwierdzone POMIAREM, nie lekturą** — maszynowe porównanie prototypu z żywą
  wtyczką (`SCHEMATY_SEKCJI` × `wp aai-sklep opis --format=json`): 12/12 rodzajów sekcji,
  **wszystkie nazwy pól identyczne, 0 różnic**, zgodne limity, `KursTyp` po obu stronach,
  opis katalogu **co do znaku**, zdanie C3 na obu stronach. Klasy „ebookowej" nie ma nigdzie.
  **PROTO-08 NIE potwierdzone: artefaktu, którego pozycja żąda, po prostu nie ma**
  (`ls -ld out` → kod 2; `.next` jest buildem SERWEROWYM, nie eksportem). Obszar jest
  pilnowany przez `smoke-podglad`, ale **dowodu działu nie ma** — ta jedna pozycja została
  odhaczona, nie sprawdzona.
  **Zakres PROTO jako jedyny NIE jest dotknięty defektem klamrowym** — zero `:(glob)`,
  przeliczony wprost daje **131 plików**, dokładnie tyle, ile deklaruje `ROLE.md`.
  Dwa własne zgłoszenia trafiają w checklistę: komenda PROTO-02 celuje w KATALOG
  (`app/api/**`), więc nie zobaczy endpointu poza nim — a `straznik-ajax.mjs` ma **ten sam
  ślepy punkt i przyznaje się do niego we własnym komentarzu**; oraz PROTO-08 żąda dowodu
  z nieistniejącego artefaktu, nie wskazując tańszej drogi, która w repo jest.
- 2026-09-03, wieczór: **KRYTYK FE — trzy razy PRZEPUSZCZAM, dwa własne zgłoszenia, i to
  on domyka sprawę waluty.**
  Waluta zmierzona TRZECI raz, inną drogą niż dział: strona kursu obiecuje
  `Dołączam za 299,00 zł`, a Store API koszyka oddaje `currency_code=USD` — przeglądarka
  liczy **pięć** `$299.00` w KASIE i trzy w koszyku, `299,00 zł` **zero razy**.
  **Przyczyna: `woocommerce_currency = USD`, czyli ustawienie WooCommerce, nie nasz kod**
  (w naszym kodzie zero miejsc stawiających albo sprawdzających walutę). Ale zasięg jest
  większy, niż zgłosił dział: `wc_price()` obsługuje też kasę, mail zamówienia i konto,
  a **nasz JSON-LD deklaruje `priceCurrency: PLN`, gdy sklep rozlicza w USD**
  (`class-aai-sklep-seo.php:285`). To wiersz na listę wdrożeniową, nie wina wtyczki.
  **Mechanizm angielskiego koszyka opisany przez dział był NIETRAFNY** przy prawdziwym
  objawie: to nie paczka tłumaczeń JS — napisy są **dosłowną treścią wpisu strony**
  (`wp post get 6`), a tytuł strony to `Cart`. Krytyk przepuścił zgłoszenie (miejsce
  trzyma), ale prawdziwy mechanizm zapisał we własnym wpisie, **żeby w rekordzie nie
  został fałsz** — to jest wzorcowe użycie pary.
  **`AUD-FE-F1-004` jest cięższe od wszystkich trzech zgłoszeń działu razem:** bramka
  `smoke:wp-jezyk`, którą checklista podaje jako komendę pozycji FE-11, **NIE MOŻE
  zobaczyć tej usterki** — mierzy `/koszyk/` dopiero po tym, jak sama włożyła produkt
  (nic go nie opróżnia), a lista fraz jest zamknięta i nie zna napisów pustego koszyka
  ani waluty. Bramka świeci **kod 0 i „25 sprawdzeń — ścieżka klienta w całości po
  polsku"**, gdy ten sam adres pusty mówi „Your cart is currently empty!". **Druga fala
  dostanie tą komendą ten sam zielony wynik.**
  Zakres FE zmierzony obiema formami: klamra → **0 plików**, te same nazwy bez klamr →
  **9**; reszta zakresu daje 57, czyli **deklarowane „57" zgadza się BEZ dziewiątki
  i samokontrola nie ma jak się zapalić**. Wypadły m.in. `widok`, `lekcja`, `moje`,
  `zasoby`, `menu`, `trasy` — a pozycje **FE-05, FE-07, FE-09 i FE-10 wskazują właśnie te
  pliki**, więc ich zamknięcie na „tak" nie znaczy „sprawdzone".
  Drugie własne zgłoszenie: `audyt/GRANICE.md` **nie ma wiersza FE ↔ WDR** — cztery działy
  mają swój wiersz z WDR, FE nie ma żadnego o usterce widocznej u nas, a mającej przyczynę
  w konfiguracji cudzej wtyczki. Dwa zgłoszenia tej fali wpadły dokładnie w tę lukę.

**WSZYSTKIE CZTERNAŚCIE DZIAŁÓW MA KRYTYKA. Zgłoszeń w katalogu: 87.**
Weryfikator (WER) wszedł drugi raz — na każdy wpis fali 1 bez werdyktu weryfikatora,
z trzema rzeczami do sprawdzenia wyprowadzonymi z tej fali: **miejsce co do linii**
(dwa wpisy wskazywały złą linię albo zły mechanizm przy prawdziwym zjawisku),
**zasięg** (jeden podał 7 przy zmierzonych 5) i **wpływ** (jeden upadł, bo zjawisko
było zablokowane niżej na tej samej ścieżce).

- 2026-09-03/04, noc: **WERYFIKATOR ZAKOŃCZYŁ — komplet fali 1: 85 wpisów, KAŻDY
  z werdyktem weryfikatora. 78 ISTNIEJE, 7 ODRZUCONE**, 4 rundy, zero niedomkniętych
  (67 werdyktów z tego wejścia, 18 z pierwszego, przerwanego). Wpisy `[PRÓBA E7]`
  i sektora `re-audyt` nietknięte.
  **Pięć odrzuceń tego wejścia** — każde z własnym pomiarem, nie z powtórzenia cudzego:
  `AUD-FE-F1-003` (objaw prawdziwy, mechanizm nazwany błędnie — napisy są treścią wpisu
  strony id 6, nie paczką tłumaczeń; ten sam objaw poprawnie lokalizuje `AUD-FE-F1-004`),
  `AUD-PERF-F1-004` (to pozycja **A11**, przyjęta decyzją właściciela i zacytowana wprost
  w definicji roli PERF; nadwyżka nie odtwarza się — na oczyszczonej instalacji strona
  54–97 ms, endpoint **47–62 ms**), `AUD-PERF-F1-006` (40 wywołań `is_completed_lesson`
  = **0 zapytań**, Tutor czyta `get_user_meta`), oraz `AUD-PIK-F1-003` i `-004`
  (te same, które odrzucił krytyk PIK).
  **Trzynaście wpisów dostało poprawiony zasięg albo wpływ przy werdykcie ISTNIEJE** —
  to jest właściwa reakcja na „zjawisko prawdziwe, liczba nieprawdziwa". Najważniejsze:
  `AUD-ARCH-F1-002` (wpływ zawyżony — dwie z trzech klas pracują bez trzeciej),
  `AUD-BE-F1-002` (**11**, nie 10 zapisów formy `query()`), `AUD-PERF-F1-002` (**5**, nie 7),
  `AUD-USP-F1-001` (**21**, nie 19 narzędzi), `AUD-REPO-F1-007` („8 miesięcy" to w istocie
  **dwa tygodnie**), `AUD-PIK-F1-006` (pięć, nie sześć pozycji bez śladu),
  `AUD-KON-F1-009` (rozjazd **większy** niż zgłoszono: 1186/787 wobec 1121/722).
  **`AUD-REPO-F1-008` — weryfikator potwierdził ODRZUCENIE krytyka i dołożył wskazówkę
  wykonawczą:** wiersz o brute force wymaga **ROZBICIA** (konta/sesje/reset zrobione,
  brute force otwarty jawnie decyzją **D6**), a nie odhaczenia — bo naprawa wg wpisu
  zamknęłaby po cichu pozycję zostawioną otwarcie.
  **Trzy pomiary wykonał ODCZYTEM zamiast zapisu**, bo dotykały danych dowodowych
  właściciela (`AUD-PRIV-F1-001`, `-003`, `AUD-INT-F1-001`) — w każdym znalazł dowód
  rozstrzygający bez pisania do bazy (m.in. `EnrollmentModel::is_enrolled()` pyta wyłącznie
  `wp_posts`). Krytyk WER ma ocenić, czy to jest ostrożność, czy obniżenie poprzeczki —
  krytyk INT ten sam wpis odtworzył ZAPISEM i poszedł dalej (ścieżka kosza).
  Niezmiennik po jego pracy: `git diff main --name-only -- . ':!audyt' ':!re-audyt'` = **0**.
- 2026-09-03/04, noc: **KRYTYK WERYFIKATORA — odpowiedź na pytanie główne brzmi
  „zmierzyłem", nie „nie znalazłem powodu, żeby odrzucić".** Odtworzył samodzielnie
  **dziesięć** wpisów z werdyktem ISTNIEJE (w tym cztery wybrane celowo jako
  „wyglądające na przepisane" — najkrótsze uzasadnienia i najwyższe pokrycie słownikowe
  z dowodem autora) i **wszystkie dziesięć zgodziło się co do liczby i co do znaku**,
  łącznie z poprawką numeru linii, którą weryfikator wniósł PONAD autora.
  **Wszystkie SIEDEM odrzuceń uznane za SŁUSZNE**, każde na własnym pomiarze.
  Dwie rzeczy, które przy tym wyszły i są warte więcej niż same werdykty:
  (1) **podpora czasowa odrzucenia `AUD-PERF-F1-004` jest wadliwa, choć werdykt trafny** —
  `koniec()` oddaje **204 na KAŻDEJ ścieżce**, a po 21:19 nie przybył ani jeden wiersz
  `wizyty`, więc pięć POST-ów weryfikatora **odpadło przed zapisem**: mierzył ścieżkę
  TAŃSZĄ niż ta, o której mówi wpis. Werdykt stoi na czym innym (wpis nie nazywa A11),
  ale liczba pod nim nie mierzy tego, co obiecuje;
  (2) **`AUD-PERF-F1-002` to jedyne miejsce, gdzie niezależność weryfikatora się osunęła** —
  statyczne policzenie miejsc wywołania nie obala pomiaru runtime, a on podparł je liczbą
  krytyka zamiast własnym przebiegiem.
  **Trzy pomiary „odczytem zamiast zapisu" ocenione jako OSTROŻNOŚĆ, nie obniżenie
  poprzeczki** — a w dwóch wypadkach odczyt okazał się MOCNIEJSZY od zapisu: w kolumnie
  `agent` leży realne `Mozilla/5.0 (X11; Linux x86_64; rv:153.0) … Firefox/153.0` (system,
  architektura, silnik i wersja wobec obiecanej „nazwy przeglądarki"), a dowód dla
  `AUD-INT-F1-001` jest SZERSZY niż zapis krytyka: `EnrollmentModel::is_enrolled()` nigdy
  nie pyta o zamówienie i w naszych trzech wtyczkach jest **0** haków na kasowanie i kosz,
  co zamyka WSZYSTKIE drogi usunięcia, gdy test krytyka zamykał dwie.
  **Stan mechaniczny policzony samodzielnie: 85 z 85 wpisów ma werdykt weryfikatora, ale
  22 z nich NIE MA werdyktu krytyka w ogóle** — tam weryfikator jest jedynym drugim
  czytelnikiem. To są w większości własne znaleziska krytyków, których nikt nie krytykuje;
  materiał do decyzji przed falą 2. Krytyk WER stemplował z tych 22 tylko **dwa**, i tylko
  dlatego, że odtworzył oba dowody własnym pomiarem — reszty świadomie nie tknął,
  bo stempel bez pomiaru byłby dokładnie tym, czego ta rola ma nie robić.
  Dwa własne zgłoszenia trafiają w NOŚNIK: `hashMiejsca()` **nie czyta dysku** (przeliczył
  **87/87** hashy z samych JSON-ów, nie otwierając ani jednego pliku produktu — w tym
  **28 miejsc typu „mechanizm", których nic w sektorze nigdy nie porównuje z plikiem**),
  a kolumna dowodu żąda ścieżki wywołania, gdy **13 z 42** wpisów o miejscu w kodzie
  zamknięto samym słowem „CZYNNE", bo `werdykt.mjs` żąda powodu wyłącznie od werdyktów
  odmownych.
- 2026-09-03/04, noc: **WDR URUCHOMIONY JAKO OSTATNI DZIAŁ.** Stan zmierzony bezpośrednio
  przed jego startem (do porównania po restarcie środowiska, którego wymaga WDR-06):
  logowania **26** · wizyty **30** · kursy 2 · lekcje 73 · sekcje 22 · moduły 12 ·
  changelog **1491** · powiązania 2 · dostawy **6** · zamówienia 0; trzy kontrole kod 0,
  `/szkolenia/` 200, `/courses/` → 301, oba nagłówki bezpieczeństwa obecne.
  Dostał trzy fakty tej fali jako materiał wprost do swojej roli: dwukrotną modyfikację
  `wp-config.php` spoza repozytorium (**`postaw.sh` nie ma niczego, co wykryłoby rozjazd
  pliku konfiguracyjnego instalacji z tym, co stawia skrypt**), remedium polityki
  prywatności stojące PRZED importem treści, który tę stronę dopiero tworzy, oraz walutę
  USD w sklepie obiecującym złotówki.
- 2026-09-04, noc: **WDR ZAKOŃCZONE — WSZYSTKIE CZTERNAŚCIE DZIAŁÓW FALI 1 DOMKNIĘTE.**
  Cztery zgłoszenia, 1 runda, zero niedomkniętych; zakres 33 pliki, zgodny z definicją.
  Trzy pozycje na „nie": **WDR-01** (instrukcja ośmiokrotnie mówi „napisz do nas"
  i **nie podaje ani jednego adresu kontaktowego**), **WDR-06** (przy pełnym resecie
  sekcja polityki prywatności biegnie PRZED importem treści, więc na czystej instalacji
  `get_privacy_policy_url()` jest puste — **a weryfikacja artefaktu w skrypcie tego nie
  łapie**; to samo zjawisko, które dział PRIV zgłosił od strony klienta) i **WDR-90**
  (`readme.txt` niespójny wewnętrznie i nieobecny w dwóch wtyczkach z trzech; waluta USD).
  Siedem pozycji na „tak" ma dowody URUCHOMIENIOWE, nie z lektury: deaktywacja
  `aai-platnosci` przestawia produkty na `draft`, a reaktywacja z powrotem na `publish`;
  wyłączenie Woo i Tutora zostawia `/szkolenia` na 200 i daje czytelny komunikat zamiast
  fatala; `npm run pakuj` przechodzi, a WordPress odczytuje nagłówki wszystkich trzech
  paczek.
  **Środowisko przywrócone CO DO WIERSZA** po jego pełnym teście `--skasuj` + `postaw.sh`
  — zmierzone przeze mnie niezależnie: logowania 26 · wizyty 30 · kursy 2 · lekcje 73 ·
  changelog 1491 · dostawy 6, trzy kontrole kod 0, `/szkolenia/` **200**, `/courses/`
  **301**. Kopia bazy sprzed tamtego testu leży poza repo
  (`~/.cache/aai-kopie/wdr-przed-testem-od-zera.sql`).
  Ograniczenie nazwane przez dział, nie ukryte: DNS w kontenerach był w tej sesji
  niedostępny, więc paczki Woo i Tutora kopiował z hosta — krytyk WDR ma rozstrzygnąć,
  czy mogło to zmienić wynik którejkolwiek pozycji, zwłaszcza WDR-06.
  **Uruchomieni równolegle: krytyk WDR i KONRAD, FAZA B** (Konrad na gotowych wynikach
  całej fali, z ośmioma tropami do sprawdzenia własnym pomiarem — w tym pytaniem, czy
  samokontrola zakresu ma jak się zapalić w pozostałych dotkniętych działach, ile pomiarów
  fali powstało na oprzyrządowanej instalacji i czy `porownaj-cykle.mjs` odróżni błędną
  odpowiedź powtórzoną w obu falach od zgodności).
- 2026-09-04, noc: **KRYTYK WDR — cztery razy PRZEPUSZCZAM, dwa własne zgłoszenia, i to
  on znajduje najgroźniejszą usterkę CHECKLISTY w całej fali.**
  **`AUD-WDR-F1-005`: komenda pozycji WDR-06 (`podman-compose down && ./postaw.sh`) NIE
  ODTWARZA stanu, o który pozycja pyta.** Baza żyje w nazwanym wolumenie `db_data`,
  a `down` **bez `-v`** go nie kasuje; reset robi wyłącznie `--skasuj`, co sam `postaw.sh`
  rozdziela jawnie. Skutek zmierzony: po komendzie z checklisty strona polityki przeżywa,
  sekcja 4c się udaje i pozycja odpowiada **„tak"** — czyli **audytor idący checklistą
  dosłownie NIE MA JAK zobaczyć `AUD-WDR-F1-002`**. Dział zobaczył je tylko dlatego, że
  zrobił WIĘCEJ, niż checklista każe.
  **Dowód historyczny, którego nikt nie inscenizował:** środowisko wstało od zera
  2026-08-31 (wpis polityki ma `post_date 2026-08-31 01:20:46`), a opcja
  `wp_page_for_privacy_policy` trzymała wartość **3** aż do 2026-09-03 — czyli tamten
  przebieg od zera kroku 4c **faktycznie go nie wykonał**. Krytyk odtworzył całe zjawisko
  **bez kasowania środowiska**, pięcioma pomiarami, bo na żywej instalacji objawu już nie
  widać (opcja = 23).
  **Waluta rozstrzygnięta jako NIE-duplikat**, mimo trzeciego zgłoszenia w tej fali: FE
  pyta „co widzi klient" i stoi na `widok.php`, WDR stoi na `postaw.sh` i odpowiada na
  pytanie, którego FE zadać nie mógł — **czy ktokolwiek tę opcję ustawia**. Zmierzone:
  `grep` waluty na 452 liniach `postaw.sh` → **kod 1, zero trafień**, choć skrypt instaluje
  Woo i konfiguruje bramkę; ta sama komenda na `INSTRUKCJA-INSTALACJI.md` → **kod 1**,
  czyli tabela „Rzeczy do ustawienia poza wtyczkami", istniejąca dokładnie po to, waluty
  **nie wymienia**. **Uwaga dla kierownika:** wpis nosi `WDR-90`, a trafia wprost
  w **WDR-07** — pozycję zamkniętą na „tak" przy zjawisku będącym jej własną odpowiedzią
  „nie".
  **Cztery pozycje „tak" sprawdzone własnym pomiarem, wszystkie potwierdzone** — w tym
  najdroższa do przeoczenia **WDR-03**: wszystkie trzy `uninstall.php` mają bramkę, a opcji
  zezwalającej na kasowanie **nikt nigdzie nie ustawia** (na żywo wszystkie trzy `false`).
  Przy WDR-08 dołożył obserwację, która wiąże dwie pozycje: „tak" jest prawdziwe, ale
  **wyłącznie dzięki odesłaniu, które nie ma adresu** (`AUD-WDR-F1-001`).
  **„Już zgłoszone właścicielowi" ODRZUCONE jako podstawa niezgłoszenia** — audyt zbiera
  STAN, nie historię korespondencji; gorzej, ta wiedza **nie miała skąd przyjść w tej
  fali** (jedyne dopuszczone wejście, `BRIEF-PROJEKTU.md`, nie zawiera ani jednej z trzech
  wersji wtyczek). Zamknięcie pozycji trzecią wartością „tak (znane)" — ani „tak", ani
  „nie" — łamie wymóg definicji roli. Stąd drugie własne zgłoszenie: **`WDR-09` nie ma
  rozstrzygalnego kryterium**, więc fala 2 może odpowiedzieć odwrotnie przy identycznym
  kodzie.
  **Brak DNS w kontenerach oceniony jako ograniczenie środowiska, nie zmiana wyniku** —
  sekcje 4, 4c i 7 są w całości lokalne, a instalacja postawiona Z SIECIĄ 2026-08-31
  pokazuje tę samą walutę USD. Odnotowana nieścisłość METODY działu: przy braku DNS
  `postaw.sh` przerywa na instalacji tłumaczeń, więc opis „`--skasuj` + `postaw.sh`,
  zweryfikowane uruchomieniowo" nie jest precyzyjny — wniosku to nie rusza, bo krytyk
  odtworzył go niezależnie.
  Krytyk nie uruchomił **ani jednego zapisu** (same odczyty i `GET`); migawka zgadza się
  co do wiersza.
- 2026-09-04, noc: **KONRAD ZAMKNĄŁ FAZĘ B — dziesięć nowych zgłoszeń
  (`AUD-KON-F1-015…024`), razem 24 w tej fali.** Wszystkie sześć pozycji z policzenia,
  trzy na „tak".
  **Najcięższe ustalenie dotyczy POWTARZALNOŚCI, czyli sensu całej budowy:**
  `AUD-KON-F1-015` — **test zakresu jest CYRKULARNY**. Deklarowana liczba plików zgadza się
  z policzoną, bo obie policzono TĄ SAMĄ zepsutą komendą: FE **57 = 57 przy realnych 66**,
  BD **25 = 25 przy 35**, INT **15 = 15 przy 21**. Samokontrola nie ma jak się zapalić —
  to luka w SAMOKONTROLI, nie w zakresie.
  `AUD-KON-F1-017`: **hash miejsca dla „mechanizmu" to hash PROZY** — trzy wpisy o tym
  samym `status.mjs` mają trzy różne hashe, a takich wpisów jest **30 z 95**. Porównanie
  fal jest dla nich z konstrukcji albo rozjazdem, albo kopiowaniem — nigdy pomiarem.
  `AUD-KON-F1-023`: **~83 mutacje sektora wiszą na jednym `finally`**, w trzech miejscach,
  **zero `process.on`** — czyli uszkodzenie `ROLE.md` nie było wypadkiem jednej mutacji,
  tylko klasą.
  `AUD-KON-F1-024`: **wpis nie ma czasu utworzenia**, więc nie da się rozliczyć, które
  pomiary powstały pod sondą `SAVEQUERIES` — Konrad policzył **13 pomiarów pod sondą**,
  a okna uszkodzenia `wp-config.php` (16:07–16:23) **nie da się przypisać do żadnego
  wpisu**. Jego `AUD-KON-F1-013` przewidziało mechanizm, ale nie skutek.
  `AUD-KON-F1-018/019/020`: **12 z 49 komend checklisty nie wykonuje się dosłownie albo
  patrzy obok klasy, o którą pozycja pyta** — to nie są trzy przykłady, to zmierzona klasa.
  Konrad **nie zdublował** czterech rzeczy zgłoszonych już przez innych (nośnik bez wyniku
  pozycji, zamek środowiska tylko dla re-audytu) — sprawdził je i wskazał cudze wpisy.
  **Jego odpowiedź na pytanie „czy wynikowi tej fali można ufać":** ufać można wpisom
  z kompletem werdyktów, czytanym jako obraz **KODU**; **nie** można ufać pomiarom
  na `:8892` z partii 2 (sonda), ani zgodności fal dla 30 „mechanizmów", ani pozycjom
  zamkniętym na „tak" — bo nie zostawiają śladu.

### TEST WDR SKASOWAŁ BIBLIOTEKĘ MEDIÓW — naprawione, i to jest lekcja o przywracaniu

**Zgłosił Konrad w fazie B; potwierdzone i naprawione przez orkiestratora.** Po teście
`--skasuj` + `postaw.sh` środowisko wyglądało na przywrócone **co do wiersza** (dwa
niezależne pomiary tabel to potwierdzały), ale na dysku zostało **7 plików z 1348**:
`--skasuj` kasuje wolumen `wp_uploads`, a przywrócenie poszło **wyłącznie ze zrzutu bazy**.
Baza mówiła „151 załączników", dysk mówił „siedem" — i **żadna z trzech kontroli wtyczek
tego nie widzi**, bo pytają o dane, nie o pliki.

**Naprawa i weryfikacja artefaktem:** `npm run wp:zrzuty` → `148 zaktualizowanych`,
7 → **1329 plików**. Zostały jednak DWA braki — okładki obu kursów — i tu wyszła druga
warstwa tej samej pułapki: **`wp aai-platnosci sync` meldował „bez zmian 2"**, bo
idempotencja pyta o ISTNIENIE WIERSZA załącznika, nie o istnienie PLIKU. Dopiero
skasowanie dwóch osieroconych wierszy jawną listą (`74`, `76`) i powtórzenie sync
(`zaktualizowane 2`) odtworzyło okładki i miniatury obu produktów.
Stan końcowy zmierzony: **151 załączników, 1343 pliki, ZERO plików brakujących**
(pętla `file_exists` po wszystkich załącznikach), miniatury obu produktów ustawione,
`wp:sprawdz` **73/73 co do znaku**, `sprawdz-tutora` **0 różnic**, trzy kontrole kod **0**.

**LEKCJA (nowa klasa, do decyzji przed falą 2):** „przywrócenie ze zrzutu bazy" nie jest
przywróceniem środowiska, a **kontrola, która pyta tylko o dane, nie odróżni instalacji
kompletnej od instalacji bez plików**. Ta sama ślepota siedzi w idempotencji: mechanizm
pytający „czy wiersz istnieje" zamiast „czy artefakt istnieje" **utrwala brak zamiast go
naprawić**.

- 2026-09-04, noc: **KRYTYK KONRADA — dziesięć razy PRZEPUSZCZAM, dwa własne zgłoszenia,
  i w trzech miejscach POSZEDŁ DALEJ niż Konrad.**
  **(1) Test zakresu nie może się zapalić NIGDZIE**, nie tylko w trzech działach:
  deklaracja równa się wynikowi komendy dla **14 z 14** działów. Utracone 25 plików
  (FE 57→66, BD 25→35, INT 15→21) **nie są sierotami** — biorą je inne działy, więc szkodą
  jest **utrata PYTAŃ** FE/BD/INT, nie brak pokrycia. To zawęża wagę i jest ważniejsze niż
  sama liczba.
  **(2) Klasa wadliwych komend jest DWA RAZY większa, niż zgłosił Konrad:** pozycji
  z komendą wykonywalną jest **65, nie 49**, a wadliwych **30 z 65 (46%)**, nie 12.
  Konrad pominął jedną padającą (`REPO-06`), ale sedno leży gdzie indziej: **23 pozycje
  ślepną przy odczycie komendy z WYRENDEROWANEJ tabeli** (BE-02 14→0, QA-14 238→0,
  SEC-04 275→0), bo `\|` jest naraz ucieczką potoku w Markdownie i alternatywą w BRE.
  **Tego kierunku nie zgłosił nikt** — stąd jego własne `AUD-KON-F1-025`.
  **(3) Sprzeczność WDR-06 ROZSTRZYGNIĘTA pomiarem topologii wolumenów: oba wpisy są
  prawdziwe, bo dotyczą INNYCH komend, a granicą jest flaga `-v`.** `compose.yml` ma dwa
  wolumeny nazwane (`db_data` i `wp_core` na `/var/www/html`), a **uploads nie ma własnego
  montowania — media leżą w `wp_core`**. Czyli: `down` bez `-v` (komenda z checklisty)
  zostawia oba i **nie odpowiada na pytanie pozycji**, a `--skasuj` (`down -v`) kasuje oba
  **razem z mediami**. To są dwie połowy jednej wady: **komenda z checklisty jest ślepa,
  a jedyna, która umie odpowiedzieć, niszczy jedyne stanowisko pomiarowe.** Oba wpisy mają
  ten sam hash miejsca.
  **(4) „13 pomiarów pod sondą" odtworzone** — Konrad nie wziął tej liczby z powietrza mimo
  braku pola czasu we wpisach: zrekonstruował ją z plików STANU ról, które znaczniki czasu
  mają. Krytyk dostał 14; różnicę wyjaśnił na korzyść Konrada (jeden wpis wspomina sondę
  tylko po to, by stwierdzić jej BRAK).
  Sprawdził też wszystkie dziesięć odesłań Konrada do cudzych wpisów — **żadne nie idzie
  w próżnię**.
  Drugie własne zgłoszenie (`AUD-KON-F1-026`): **checklista Konrada nie ma pozycji
  pytającej, czy komenda pozycji ZMIENIA PRZEDMIOT POMIARU** — przez co trzy jego
  najcięższe znaleziska tej fali trafiły do pozycji o zakresie, a **fala 2 nie ma czym ich
  szukać**.
  **Zgłosił własną usterkę pracy, nieproszony:** w jednym werdykcie odwrócone apostrofy
  weszły w podstawienie powłoki i wycięły dwa słowa (sens ocalał, `werdykt.mjs` nie
  pozwala nadpisać). Pozostałe dziewięć składał z pliku — **to jest ta sama pułapka
  cudzysłowów, przed którą ostrzega instrukcja przebiegu**.

### PRZERWANIE DRUGIE — limit sesji na roli GOLD (2026-09-04, ~02:00)

**GOLD padł na HTTP 429 („session limit · resets 2:40am") PRZED jakimkolwiek zapisem** —
zdążył wypisać tylko zdanie o tym, że zaczyna czytać swoją rolę. **Nic nie zginęło i nic
nie trzeba powtarzać:** jego plik stanu nie powstał, żaden wpis nie ma jego śladu.
To NIE jest awaria sektora.

**STAN ZMIERZONY KOMENDĄ PRZED `/clear` (nie z pamięci):**

| Rzecz | Wartość |
|---|---|
| Role ZAKOŃCZONE | **16 z 17**: ARCH BD BE FE INT KON PERF PIK PRIV PROTO QA REPO SEC USP WDR WER |
| Rola `W TRAKCIE` | **KIER**, runda 0 — jego drugie wejście (KIER-01…07) jeszcze przed nim |
| Nieuruchomione | **GOLD** (padł na limicie) i **RAP** |
| Wpisów w katalogu | **107** |
| Bez werdyktu weryfikatora | **21** — z tego 20 fali 1: **KON 12 · WDR 6 · WER 2** (+1 wpis próbny `REA-SEC`) |
| Strażnik sektora | kod **0** |
| Niezmiennik `git diff main -- . ':!audyt' ':!re-audyt'` | **0** |
| Środowisko `:8892` | `/szkolenia/` **200**, `/courses/` **301**, trzy kontrole kod **0**, 151 załączników i 1343 pliki bez brakującego, treść 73/73 co do znaku, kopia w Tutorze 0 różnic |

**RZECZ, KTÓREJ PLAN URUCHOMIEŃ NIE PRZEWIDZIAŁ, a którą trzeba zrobić przed raportem:
weryfikator musi wejść TRZECI raz.** Jego status to ZAKOŃCZONE, ale po jego wyjściu
powstało **20 nowych wpisów** — wszystkie własne znaleziska WDR, Konrada z fazy B i krytyka
weryfikatora. Bez tego wejścia raport policzy je jako wpisy bez drugiego czytelnika,
a `AUD-KON-F1-016` mówi wprost, że sektor nie ma dla takich wpisów żadnej bramki.

**KOLEJNOŚĆ WZNOWIENIA PO `/clear` (wiążąca, zastępuje punkty 5–6 poprzedniej listy):**

1. **GOLD** — bramka wyjścia czternastu działów (uruchomienie od nowa, nic nie zostało po
   przerwanym) → `aud-gold-krytyk`.
2. **WER, trzecie wejście** — werdykty dla 20 wpisów bez weryfikatora (`werdykt.mjs
   --pokaz`, lista liczona komendą, nie z tej tabeli) → jego krytyk już był, więc krytyka
   powtarzać nie trzeba, chyba że GOLD każe.
3. **KIER**, drugie wejście: KIER-01…07, `migawka-wartosci.mjs --zapisz=po` i `--porownaj`
   → `aud-kier-krytyk`. **KIER-06 ZOBACZY rozjazd środowiska i tak ma być** — przyrost
   `logowania` 21→26 i `wizyty` 17→30 to ślad pracy działów, wynik, nie usterka do zatarcia.
4. **RAP** → `aud-rap-krytyk`.
5. Commit wpisów i stanu; dopiero **potem** re-audyt fali 1 (punkty 8–12 planu uruchomień).

**PRZED KAŻDYM WZNOWIENIEM SPRAWDZIĆ ŚRODOWISKO** — `curl` na `/szkolenia/` oraz trzy
`sprawdz`; przerwany agent mógł zostawić stan pośredni. **Sprzątanie po agentach zawsze
jawną listą identyfikatorów, nigdy zakresem** — w tej fali ślad ubitego agenta okazał się
rozłożony na CZTERY nośniki (konto, zapis na kurs, wiersz dziennika dostaw, opcja
z komunikatem błędu), a osobno test WDR skasował wolumen mediów, czego żadna kontroła
wtyczek nie widzi, bo pytają o dane, nie o pliki.

**CZTERY PUŁAPKI TEJ SESJI, które wrócą** (dopisane do tych z pierwszego przerwania):
1. **`podman` sypie na STDERR przy KAŻDYM wywołaniu** — przekierowanie wyjścia do pliku
   bez rozdzielenia strumieni wkłada ten hałas do treści pliku; gdy plikiem jest
   `wp-config.php`, skutkiem jest cicha utrata WSZYSTKICH nagłówków i przekierowań.
2. **Edycja cudzego pliku w Pythonie konwertuje końce linii** — `wp-config.php` kontenera
   ma **CRLF**, a `open().read()` + `join` daje plik bez ani jednego `CR`. Diff wygląda
   wtedy na przepisanie całości; złapało to dopiero **porównanie bajtowe** (`cmp`).
   Do usunięcia linii z cudzego pliku używać `sed`, który pracuje na bajtach.
3. **Idempotencja pytająca o WIERSZ zamiast o PLIK utrwala brak** — `aai-platnosci sync`
   meldował „bez zmian 2" przy dwóch okładkach, których na dysku nie było.
4. **Odwrócone apostrofy w łańcuchu przekazywanym do powłoki** wchodzą w podstawienie
   i wycinają słowa z zapisanego werdyktu (zgłosił to sam krytyk Konrada). W treściach dla
   narzędzi sektora używać plików, nie argumentów wiersza poleceń.


### WZNOWIENIE TRZECIE — GOLD zaliczony (2026-09-04)

**Kontrola środowiska przed wznowieniem: czysto.** `:8892` pięć kontenerów,
`/szkolenia/` **200**, `/courses/` **301**, trzy `sprawdz` kod **0**, strażnik sektora
kod **0**, niezmiennik `git diff main -- . ':!audyt' ':!re-audyt'` **0**, wpisów **107**,
role 16 ZAKOŃCZONE + KIER `W TRAKCIE` runda 0.

**Lista wpisów bez werdyktu weryfikatora policzona komendą przed startem, nie z tabeli:**
`node -e` po `audyt/zgloszenia/*.json` z pytaniem o `werdykt.weryfikator` daje **21** —
`AUD-KON-F1-015…026` (12), `AUD-WDR-F1-001…006` (6), `AUD-WER-F1-001/002` (2) oraz
`REA-SEC-F1-002` (wpis próbny E7, sektor re-audyt, poza falą 1 audytu). Zgodne
z tabelą przerwania co do sztuki. **UWAGA NA POMIAR:** status wpisu `DO WERYFIKACJI`
NIE znaczy „bez weryfikatora" — wpis z werdyktem `ISTNIEJE` i bez krytyka nosi ten sam
status; liczenie po statusie daje fałszywe 54 zamiast 21. Pytać o pole, nie o status.

**GOLD ZAKOŃCZONE, 3 rundy, 0 niedomkniętych, 5 zgłoszeń** (`AUD-GOLD-F1-001…005`),
**bez blokad wyjścia** — każde znalezisko wskazuje numer zasady i cytat. Osiem pozycji:
GOLD-01 wymyślone zgłoszenia **nie** (re-walidacja 105 wpisów funkcją `powodyOdmowy`:
0 odmów, 0 rozjazdów hasza; `zgloszenie.mjs --test` 27/27) · GOLD-02 wyjście poza zakres
**nie** (0 rozjazdów dział↔prefiks pozycji na 107) · GOLD-03 **tak, ktoś zmienił** —
poza sektorem `git diff main` 0 plików, ale środowisko `:8892` zmienione w trakcie fali:
changelog 1447→1491, **44 wpisy `sections` aktora `import-postgres` o 21:09**, media
1348→1343 plików (`AUD-GOLD-F1-005`) · GOLD-04 przekazanie zamiast drążenia **nie**
(4 trafienia wzorców, wszystkie pozorne) · GOLD-05 **stan roli kłamie**: `audyt-f1-WER.json`
ma ZAKOŃCZONE z `niedomkniete: []` przy 20 wpisach bez werdyktu weryfikatora, wszystkie
powstałe po 22:14:57 (`AUD-GOLD-F1-001`) · GOLD-06 **cztery wpisy QA bez artefaktu skilla**
(`AUD-QA-F1-001…004` bez kroków 3 i 5 `QA/SKILL.md`, choć QA-005 i QA-008 go mają —
rozjazd wewnątrz jednego działu, `AUD-GOLD-F1-002`) · GOLD-07 kolejność sektorów
**zachowana, ale dziennik jej nie pokazuje** (`--pokaz` drukuje próbę E7.6 obok pracy fali,
znacznik `proba` jest w plikach, a `status.mjs` go nie drukuje — `AUD-GOLD-F1-003`) ·
GOLD-08 **porównanie wartości niewykonane**: `migawka-wartosci.mjs --porownaj` kod **1**
przy zerowej różnicy wartości (rozjazd tylko w polu `adnotacja`), a `po.json` z 03:48 jest
STARSZY od `przed.json` z 19:11 i sam `przed.json` powstał po zakończeniu siedmiu ról
(`AUD-GOLD-F1-004`).

**GOLD rozliczył własne ślady pomiarem, nie deklaracją:** trzy odczyty
`migawkaSrodowiska()` w odstępach dały wartości identyczne co do bajta (media 1343 /
31 888 625 B, logowania 26, wizyty 30, dostawy 6, changelog 1491, skrót `3b3e6436f192`).

**DWIE RZECZY, KTÓRE GOLD ODDAJE KIEROWNIKOWI WPROST:** fala 1 nie ma migawki końca,
a KIER stoi `W TRAKCIE` od 16:02 — zasada 10 nie jest naruszona, bo proces nie jest
zamknięty, ale zamknięcie go bez rozstrzygnięcia `AUD-GOLD-F1-001` i `-005` znaczyłoby
przyjęcie wyniku z 20 niezweryfikowanymi wpisami i ze środowiskiem innym niż zastane.

**SZABLON POLECENIA DLA KRYTYKA — dziennik go NIE MIAŁ** (miał tylko szablon działu),
więc powstał tutaj i fala 2 dostanie ten sam; zmienia się wyłącznie `<KOD>`, numer fali
i wyliczenie ocenianych wpisów:
„Repozytorium: /home/krzysiek/Pod strona Szkolenia  (katalog kończy się SPACJĄ — cytuj
ścieżkę). Gałąź sektora. SEKTOR: audyt. FALA: 1. Jesteś KRYTYKIEM roli <KOD>. Pracuj
dokładnie wg swojej definicji: oceniasz pracę agenta <KOD> tej fali — pięć pytań do
KAŻDEGO z jego zgłoszeń (<lista ID>) oraz jego pracę jako całość (czy przeszedł CAŁĄ
checklistę, czy pozycje zamknięte na „nie" naprawdę sprawdzono, czy któraś pozycja da się
odhaczyć bez otwarcia pliku). Domyślnie ODRZUCASZ — przepuszczasz to, co sam potrafisz
odtworzyć. Werdykt zapisujesz narzędziem sektora dla każdego wpisu; własne znalezisko
zgłaszasz przez `zgloszenie.mjs --plik=…` (plik wpisu zapisz w katalogu tymczasowym, nie
w repo — treści do narzędzi przekazuj plikiem, nigdy argumentem powłoki, bo odwrócone
apostrofy wchodzą w podstawienie). Kody wyjścia bez potoku. Nie czytasz CLAUDE.md ani
wpisów/stanu innej fali. Nie zmieniasz niczego w drzewie poza tym, co zapisują narzędzia
sektora. Pomiar na :8892 (jeśli go potrzebujesz): licz stan przed i po, sprzątaj wyłącznie
własne ślady, jawną listą identyfikatorów, nigdy zakresem. Meldunek końcowy do 30 linii:
tabela wpis → werdykt → dowód w jednej linii, lista własnych ID zgłoszeń, kody wyjścia."

**KRYTYK GOLD: 5 z 5 PRZEPUSZCZAM, każde odtworzone samodzielnie** — nie przepisane.
`AUD-GOLD-F1-005` odtworzył na `:8892` samymi SELECT-ami i doprecyzował liczby: dziennik
daje **dokładnie** `sections create import-postgres 22` + `sections delete import-postgres 22`
o 2026-09-03 21:09 (poprzedni wpis 2026-08-31), skrót tabel `3b3e6436…` wobec `258d9b45…`
w migawce, media 1343/31 888 625 B wobec 1348/32 040 025 B. Trzy pozycje zamknięte przez
GOLD na „nie" krytyk sprawdził sam i wszystkie obronił (GOLD-02: 112/112 bez pozycji spoza
działu; GOLD-04: jedyne trafienie „należy do FE" to własny zakres Konrada; GOLD-01:
7 odrzuceń weryfikatora dotyczy zjawisk obalonych, nie wpisów bez dowodu).

**WŁASNE ZNALEZISKO KRYTYKA — `AUD-GOLD-F1-006`: pozycja GOLD-05 jest MARTWA.**
`zgloszenie.mjs:394-402` nadaje `id` i `status` **bezwarunkowo**, innej sankcjonowanej
drogi do rejestru nie ma, a strażnik wpisów nie sprawdza — więc odpowiedź „każdy wpis ma
kod i status" wynika z kodu jednego narzędzia i daje się odhaczyć bez otwarcia ani jednego
wpisu. Dowód z zachowania, nie z lektury: agent GOLD złożył pod tą pozycją wpis o statusie
roli WER, czyli po cichu podmienił jej przedmiot. **W fali 2 ten slot może dostać jeszcze
inny temat albo zostać odczytany dosłownie — i oba przebiegi będą zgodne z checklistą.**

**TRZECIE WEJŚCIE WER MA ZAKRES 26 WPISÓW, nie 20** — lista przeliczona komendą po
zakończeniu krytyka GOLD: do dwudziestu z tabeli przerwania (KON 12 · WDR 6 · WER 2)
doszło **sześć wpisów GOLD-owych** (`AUD-GOLD-F1-001…006`), które też nie mają drugiego
czytelnika. `REA-SEC-F1-002` zostaje poza zakresem — to próba E7 sektora re-audyt.
**Dwa wpisy zakresu są własnymi wpisami weryfikatora** (`AUD-WER-F1-001/002`), a jego
definicja tego przypadku nie rozstrzyga; polecenie każe mu postąpić wg definicji i nazwać
rozstrzygnięcie wprost, zamiast je przemilczeć.

**WER, TRZECIE WEJŚCIE — ZAMKNIĘTE: 24 werdykty `ISTNIEJE`, dwa wstrzymane, trzy nowe
wpisy.** Lista zakresu przeliczona przez niego samego zgodziła się z podaną co do sztuki
(26 wpisów). Wszystkie 24 werdykty odtworzone własnym pomiarem, nie przepisane.

**TRZY DOWODY, KTÓRE SIĘ NIE ODTWORZYŁY — i to jest wynik tego wejścia**, bo zjawisko
w każdym z nich istnieje, ale dowód wskazuje na coś innego niż stwierdzenie (klasa
„dowód nieodtwarzalny", wszystkie trzy zgłoszone pod WER-02):
- `AUD-WER-F1-003` — dowód `AUD-WDR-F1-005` cytuje ścieżkę `docker-compose.yml`, której
  w repozytorium NIE MA (plik nazywa się `compose.yml`); sam wolumen `db_data` istnieje
  i zjawisko stoi.
- `AUD-WER-F1-004` — w dowodzie `AUD-KON-F1-018` pozycja PIK-07 miała paść, a pada kod 0
  z pięcioma trafieniami; trzy pozostałe człony (PERF-01, REPO-11, SEC-02) odtwarzają się.
- `AUD-WER-F1-005` — liczby 191 i 29 z dowodu `AUD-KON-F1-019` dają dziś 175 oraz
  59/97/39, a jednostka pomiaru nie jest w dowodzie nazwana.

**ROZSTRZYGNIĘCIE WERYFIKATORA O WŁASNYCH WPISACH, NAZWANE WPROST (nie przemilczane):
wstrzymał się od werdyktu na `AUD-WER-F1-001…005`.** Powód wprost z §16: sensem tej roli
jest to, żeby wykrywający nie był jedynym, kto uznaje problem za prawdziwy — własny
werdykt sfabrykowałby drugiego czytelnika, którego nie ma. Merytorycznie sprawdził oba
starsze wpisy i oba się potwierdzają, ale potwierdzenie musi wydać ktoś inny. Status
zamknął ZAKOŃCZONE z **niedomkniętymi WER-01…05** — nie dlatego, że pytań nie zadał
(zadał wszystkie do 26 wpisów), tylko dlatego, że dla pięciu wpisów produkt roli nie
istnieje. **To jest dokładnie przypadek, który nazywa `AUD-KON-F1-016`** (zbiór werdyktów
zna dwie strony i żąda obu, a pola autora wpisu w ogóle nie ma).

**STAN PO WEJŚCIU, policzony komendą:** 116 wpisów · bez werdyktu weryfikatora **6**
(`AUD-WER-F1-001…005` + `REA-SEC-F1-002`) · bez werdyktu krytyka **31** · strażnik kod 0 ·
niezmiennik 0. **Rozróżnienia, które z tych 31 są wpisami krytyków (a więc z definicji
nie mają własnego krytyka), NIE DA SIĘ zrobić maszynowo** — sprawdzone: pole pozycji
wygląda tak samo dla wpisu działu i wpisu jego krytyka, a pola autora nie ma. To ten sam
brak, który opisuje `AUD-KON-F1-016`, i on właśnie kosztuje: raport nie umie policzyć,
ile wpisów naprawdę czekało na drugiego czytelnika.

**DECYZJA ORKIESTRACJI: nie dokładam wejścia krytyka WER z własnej inicjatywy.** Wiążąca
kolejność wznowienia mówi „krytyka powtarzać nie trzeba, chyba że GOLD każe", a GOLD nie
wystawił blokad — choć pracował PRZED powstaniem tych trzech wpisów. Rozstrzygnięcie
oddane KIER wprost w poleceniu, bo to on jest w sektorze rozstrzygającym o zamknięciu
fali; ma powiedzieć, czy fala może się zamknąć z pięcioma wpisami bez drugiego czytelnika.

**KIER, DRUGIE (ZAMYKAJĄCE) WEJŚCIE — ZROBIONE, 5 zgłoszeń, 2 rundy, zero niedomkniętych.
ROZSTRZYGNIĘCIE KIEROWNIKA: FALA 1 NIE ZAMYKA SIĘ NA OBECNYM STANIE.** Powód podany
przez niego wprost: `AUD-WER-F1-001…005` są **jedynymi wpisami fali bez ANI JEDNEGO
niezależnego czytelnika** (każdy inny ma krytyka albo weryfikatora), a trzy z nich
(`-003/-004/-005`) **obalają dowody cudzych wpisów już zweryfikowanych** (WDR-005,
KON-018, KON-019) — przyjęcie ich bez czytelnika znaczyłoby, że raport niesie zarzut
niesprawdzony przez nikogo. **Żąda jednego dodatkowego wejścia KRYTYKA roli WER**
(rola przewidziana N1, dotąd nieuruchomiona wobec tych wpisów: 0 z 5 werdyktów), mówiąc
wprost, że wiążąca kolejność wznowienia tego nie przewiduje, ale to jedyna bramka, jaką
regulamin dla tych wpisów daje — i tańsza niż otwarcie fali 2 z pięcioma niesprawdzonymi
zarzutami. Drugiego weryfikatora NIE żąda, bo taki w sektorze nie istnieje (KON-016).

**Pozycje na „nie" — dwie:** KIER-01 (WER zamknięte z 5/5 pozycji niedomkniętych na
suficie rund; „całą checklistę" da się dla 16 ról policzyć wyłącznie jako różnicę
„wszystkie − niedomknięte", bo licznika z kolumny Dowód nie produkuje żadne narzędzie —
`AUD-KIER-F1-001`) i KIER-06 (`--porownaj` kod **1**: produkt identyczny co do skrótu,
rozjazd wyłącznie na `:8892`).

**SPRAWCA 44 WPISÓW `sections` USTALONY — i to nie był dział, który je zgłosił:**
`npm run wp:import` uruchomiony przez dział **USP** o 21:09:01Z (KIER dotarł do tego
własnym SELECT-em, nie z cudzej relacji). Rozjazd środowiska wobec migawki `przed`:
logowania 21→26, wizyty 17→30, **dostawy 0→6**, changelog 1447→1491, media 1348→1343
(`AUD-KIER-F1-005`).

**DWIE KOLIZJE GRANIC (KIER-04), obie rozstrzygnięte, żadna nie jest duplikatem:**
`wizyty.php:111` PERF-004 × SEC-002 (ta sama linia, dwa różne pytania — rozstrzyga wiersz
SEC↔PERF tabeli granic) oraz `ROLE.md:432` KON-021 × WDR-005 (dwa różne zjawiska w jednej
linii; KON jest rolą procesową, nie działem). **Trzy wiersze granic do DOPISANIA PRZED
FALĄ 2** (z fazy A Konrada): `AUD-KON-F1-005` (FE↔BE), `-006` (checklista PERF),
`-012` (BD↔PROTO) — kierownik nie ma `Write`, więc to zadanie kroku budowy, nie przebiegu.

**TRZY DALSZE ZNALEZISKA KIEROWNIKA:** `AUD-KIER-F1-002` — `status.mjs:409` przyjmuje
`--runda` PO zamknięciu roli (FE ma trzy wpisy `ZAKOŃCZONE(4)` po `ZAKOŃCZONE(3)`, bez
`W TRAKCIE` między nimi); `AUD-KIER-F1-003` — miejsce wskazane przez `AUD-GOLD-F1-001`
(`audyt/stan/audyt-f1-WER.json:7`) **przestało zgadzać się po trzecim wejściu WER**, czyli
hash miejsca starzeje się razem z plikiem, który opisuje; `AUD-KIER-F1-004` — **strażnik
sektora padł kodem 1 (reguła R31) bez treści za pierwszym przebiegiem i przeszedł sześć
razy z rzędu potem**.

**SONDA ORKIESTRATORA DO R31 (nie duplikuje badania krytyka):** cztery kolejne przebiegi
strażnika dały kod **0**, ale **każdy trwa ~30 sekund** — piąty przebiegł się w limit
dwóch minut i sondę ubiło (kod 143). Podejrzenie do sprawdzenia przez krytyka, nie wniosek:
niestabilność może być skutkiem OBCIĄŻENIA maszyny pracą równoległych agentów, a nie
treści reguły. **Bramka niestabilna to inny problem niż bramka błędna.**

**MIGAWKA KOŃCA FALI ZAPISANA — i nadpisała cudzy plik:** `audyt/migawki/po.json` sprzed
zapisu był migawką **próby E7.6** (mtime 2026-09-03 03:48, `sha256 c75e293c…`) i to on był
przedmiotem `AUD-GOLD-F1-004`; teraz stoi tam migawka końca fali 1 (`sha256 ea3a5057…`).
Zapis nazwany przez kierownika wprost, nie po cichu.

**Stan po jego wejściu:** **121 wpisów**, wszystkie 17 ról ZAKOŃCZONE, strażnik kod 0,
`status.mjs --pokaz` kod 0, `git diff main --name-only -- . ':!audyt' ':!re-audyt'`
**0 plików**.

**DECYZJA ORKIESTRACJI: żądania krytyka WER NIE wykonuję od razu.** Najpierw wchodzi
**krytyk KIER** — wiążąca kolejność stawia go tu, a on jest jedynym, kto może to żądanie
podważyć; uruchomienie dodatkowego wejścia na podstawie rozstrzygnięcia, którego jeszcze
nikt nie sprawdził, byłoby dokładnie tym, przed czym broni para agent + krytyk.

**KRYTYK KIER: 5 z 5 PRZEPUSZCZAM, każdy odtworzony u siebie.** Potwierdził sprawcę
44 wpisów własnym SELECT-em (22 × create + 22 × delete `sections`, wszystkie
2026-09-03 21:09:01 UTC, okno działu USP 20:57:37Z–21:12:14Z je obejmuje) i niezależnie
policzył kolizje granic z KIER-04 — wyszły dokładnie te dwie, które podał kierownik.

**ŻĄDANIE WEJŚCIA KRYTYKA WER: ZASADNE, wejście ma się odbyć.** Krytyk nie przyjął tego
na słowo — **sprawdził najostrzejszy z zarzutów wprost**: komenda pozycji PIK-07
uruchomiona u niego co do znaku kończy **kodem 0, 5 trafień, pusty stderr**, czyli
`AUD-WER-F1-004` ma rację, a `AUD-KON-F1-018` (wpis **ZWERYFIKOWANY** — z krytykiem
I weryfikatorem) przypisuje jej kod 2. **Zarzut obalający wpis zweryfikowany, którego nikt
poza autorem nie czytał, poszedłby do raportu jako fakt.**

**NIESTABILNOŚĆ STRAŻNIKA: NIE ODTWORZONA, ale mechanizm WSKAZANY — i to jest ważniejsze
niż sam kod wyjścia.** Dwanaście przebiegów bez potoku (6 × `srodowisko.mjs --test`,
6 × strażnik) dało kod 0 za każdym razem; sonda orkiestratora dała cztery kolejne zera
przy ~30 s na przebieg. Krytyk wskazał natomiast przyczynę możliwego wyścigu:
`srodowisko.mjs:500-502` robi **zrzut ŻYWEJ bazy i zaraz potem porównuje z nią liczniki**,
a liczba WIERSZY `wp_options` jest porównywana (wyłączony jest tylko jej `AUTO_INCREMENT`);
w bazie leżą **3 przeterminowane transienty**, kasowane przy pierwszym sięgnięciu.
**Werdykt: bramka NIESTABILNA, nie błędna, a usterką jest NIEME padnięcie** — komunikat
R31 nie niesie ani jednego przypadku samokontroli, więc wyścigu nie da się odróżnić od
prawdziwego rozjazdu.

**WŁASNE ZNALEZISKO KRYTYKA — `AUD-KIER-F1-006`, udowodnione URUCHOMIENIOWO i groźne:**
kolumna Dowód pozycji KIER-03 każe pokazać „wynik `zgloszenie.mjs`", a narzędzie **nie ma
trybu sprawdzania wpisu już przyjętego** — zna wyłącznie `--plik=` (który TWORZY wpis),
`--oznacz-probe=` i `--test`. Podanie istniejącego `AUD-KIER-F1-002.json` do `--plik=`
dało **kod 0 i NOWY plik pod cudzym numerem** `AUD-KIER-F1-001.json` z tą samą treścią.
Pozycja domyka się dziś wyłącznie importem `powodyOdmowy()` — drogą, której checklista
nie nazywa — albo deklaracją.

**Stan po jego wejściu: 122 wpisy**, strażnik kod 0, niezmiennik **0 plików**. Ślad na
środowisku rozliczony: po dwunastu przebiegach liczniki różnią się **wyłącznie**
`AUTO_INCREMENT` `wp_options` (4329 → 4360, z definicji wyłączony z porównania), media
1343 → 1343, `skrot_tabel` bez zmian.

**KRYTYK WER URUCHOMIONY — poza planem uruchomień, na żądanie KIER potwierdzone przez
jego krytyka.** Zakres: pięć wpisów `AUD-WER-F1-001…005`, z poleceniem sprawdzenia OBU
STRON przy trzech obalających cudze dowody (czy komenda z obalanego dowodu naprawdę daje
inny wynik ORAZ czy zjawisko obalanego wpisu przez to upada, czy stoi dalej — **dowód
nieodtwarzalny to co innego niż zjawisko nieistniejące**) oraz oceny, czy wstrzymanie się
weryfikatora od werdyktu na własnych wpisach było poprawne, czy było ucieczką.


### NAJWAŻNIEJSZE ZNALEZISKO CAŁEJ FALI — audyt nie znał własnego stanowiska pomiarowego

**Wyszło z wejścia, którego plan uruchomień NIE PRZEWIDYWAŁ, i tylko dlatego wyszło.**
Krytyk WER **ODRZUCIŁ trzy z pięciu** wpisów weryfikatora i podał przyczynę:
**`grep` w powłoce agenta to funkcja opakowująca `ugrep 7.8.4`, a `/usr/bin/grep` to
`GNU grep 3.12`.** Orkiestrator potwierdził to niezależnie u siebie (`type grep` wskazuje
funkcję z `shell-snapshots/…`, obie wersje zmierzone osobno). **Sektor nigdzie nie nazywa
implementacji narzędzia komend checklisty** — `grep -rn` po pięciu dokumentach ustrojowych
za nazwą narzędzia kończy kodem 1, zero trafień — a dotyczy to **48 wierszy pozycji
z komendą `grep`** (`AUD-WER-F1-006`).

**Trzy zmierzone rozjazdy tej samej komendy:** PIK-07 kod **2** (GNU, `docs: Jest
katalogiem`) wobec kodu **0** (ugrep); SEC-12 **191 linii** (GNU) wobec **175** (ugrep);
`-B1 'try {'` 176/58/59 wobec 156/38/59.

**SKUTEK JUŻ SIĘ ZMATERIALIZOWAŁ I BYŁ GROŹNY:** `AUD-WER-F1-004` i `-005` zamieniły
artefakt własnego stanowiska w **zarzut wobec cudzej, POPRAWNEJ pracy** — obalały dowody
wpisów `AUD-KON-F1-018` i `-019`, które mają komplet werdyktów (krytyk + weryfikator).
Gorzka ironia: ta sama rola **zweryfikowała poprawny pomiar dzień wcześniej**
(`AUD-PIK-F1-005`: „GNU kod 2, ugrep cisza kod 0") i nie przeniosła własnej wiedzy o jeden
dzień do przodu. Trzeci odrzucony (`AUD-WER-F1-002`) padł inaczej: filtr autora uciął
cytowany fragment na kropce w „ROLE.md" i jeden z 13 wpisów miał jednak pełne uzasadnienie
— zjawisko stoi na dwunastu.

**PRZY TRZECH WPISACH OBALAJĄCYCH KRYTYK SPRAWDZIŁ OBIE STRONY i to jest wzorzec do
powtórzenia: ŻADNE z trzech obalanych zjawisk nie upada.** Dowód nieodtwarzalny to co
innego niż zjawisko nieistniejące — wolumen `db_data` istnieje mimo złej ścieżki w dowodzie
(`AUD-WER-F1-003` PRZEPUSZCZONY), cztery komendy KON-018 faktycznie padają, 11 wystąpień
`try` w KON-019 potwierdzone co do sztuki. Werdykty `ISTNIEJE` na obalanych wpisach zostają
słuszne.

**OCENA WSTRZYMANIA SIĘ WERYFIKATORA OD WERDYKTU NA WŁASNYCH WPISACH: POPRAWNE, nie
ucieczka.** Rola nie zamilkła — złożyła wpisy, zadeklarowała wszystkie pięć pozycji jako
`niedomkniete` na suficie rund i zgłosiła zastrzeżenie wprost w uzasadnieniu. **Zastrzeżenie
krytyka warte zapamiętania:** pole `niedomkniete` NIE ODRÓŻNIA „zamknięte dla 110 wpisów,
niezamknięte dla 5 własnych" od „nie zamknąłem nic" — czytelnik stanu widzi rolę kończącą
z pustą checklistą.

**LEKCJA O SAMYM PROCESIE, ważniejsza od pojedynczych wpisów:** wejście krytyka WER
zażądał KIER, żeby raport nie poniósł niesprawdzonego zarzutu — i **potwierdziło swoją
potrzebę w ODWROTNYM kierunku, niż zakładano**: nie potwierdziło trzech zarzutów, tylko je
obaliło. Gdyby fala zamknęła się na wiążącej kolejności wznowienia, raport niósłby jako
fakt trzy zarzuty wobec poprawnej pracy. **Bramka dostawiona dlatego, że ktoś policzył,
kto czego jeszcze nie przeczytał — nie dlatego, że plan ją przewidział.**

**Stan przed RAP:** **123 wpisy** (85 ZWERYFIKOWANE, 38 DO WERYFIKACJI), bez ŻADNEGO
werdyktu zostają **3**: `AUD-KIER-F1-006` i `AUD-WER-F1-006` (oba wpisy krytyków, którzy
z definicji własnego krytyka nie mają — `AUD-KON-F1-016`) oraz `REA-SEC-F1-002` (próba E7,
sektor re-audyt). Wszystkie 19 ról ZAKOŃCZONE, strażnik kod 0, niezmiennik **0 plików**.

### RAP — RAPORT FALI 1 ZŁOŻONY (2026-09-04), i sam nie miał gdzie się zapisać

**PIERWSZE, CO RAPORT ZGŁOSIŁ, TO BRAK WŁASNEGO NOŚNIKA** (`AUD-RAP-F1-001`, pozycja
RAP-02): **żadne z 15 narzędzi `audyt/tools/` raportu nie zapisuje, a rola nie ma `Write`**
— czyli produkt końcowy całego sektora istniał wyłącznie jako meldunek agenta i zginąłby
razem z sesją. Treść przeniósł do repo **orkiestrator**, co do zdania, z nagłówkiem
nazywającym autorstwo wprost: **[audyt/wyniki/RAPORT-F1-AUDYT.md](wyniki/RAPORT-F1-AUDYT.md)**.
Krytyk RAP dostał polecenie SPRAWDZENIA tej deklaracji o wiernym przeniesieniu — bo
„przepisałem wiernie" to deklaracja, a nie dowód.

**LICZBY RAPORTU (własne przeliczenie roli, nie przepisane z dziennika):** 126 wpisów
(audyt 124, re-audyt 2), z tego **3 próbne** → **123 prawdziwe wpisy fali 1**. Statusy:
**85 ZWERYFIKOWANE, 41 DO WERYFIKACJI**. Weryfikator: **ISTNIEJE 103 · ODRZUCONE 7 ·
brak 16**. Krytyk: **PRZEPUSZCZAM 84 · ODRZUCAM 11 · brak 31**. Miejsca: 81 liniowych,
45 mechanizmów. **19 ról ZAKOŃCZONE.** Pozycje: 197 w `ROLE.md`, **65 z co najmniej jednym
wpisem**. Mapa pokrycia **1241/1241** (842 przypisane, 399 wykluczone, 0 sierot,
0 sprzecznych). Złączenie sektorów: **121 miejsc, 0 potwierdzonych przez oba** — re-audyt
fali 1 nie ruszył.

**ODRZUCONE TEŻ SĄ WYNIKIEM — i raport je policzył:** 7 wpisów obalił weryfikator
(m.in. „ZJAWISKO NIE ISTNIEJE", „miejsce wskazane co do linii jest złe", rzecz już
rozstrzygnięta decyzją właściciela), 11 odrzucił krytyk, a **dwa z odrzuconych przez
krytyka mają mimo to weryfikatora `ISTNIEJE`** (`AUD-ARCH-F1-002`, `AUD-REPO-F1-008`).

**TRZECIE ZNALEZISKO RAPORTU JEST O SAMYM NOŚNIKU WYNIKÓW** (`AUD-RAP-F1-003`):
**9 wpisów nosi status `ZWERYFIKOWANE` mimo werdyktu ODRZUCAJĄCEGO**, bo `komplet()`
w `werdykt.mjs:94` pyta o OBECNOŚĆ obu werdyktów, nie o ich wartość — a `polacz-sektory.mjs`
nie czyta pola `werdykt` ANI RAZU. Czyli złączenie sektorów, na którym stanie porównanie
fal, nie odróżnia wpisu potwierdzonego od obalonego.

**DRUGIE ZNALEZISKO — 24 WIERSZE ŚRODOWISKA BEZ AUTORA** (`AUD-RAP-F1-002`): rozjazd
`:8892` ma nazwanego sprawcę tylko dla dwóch z pięciu pozycji (changelog +44 = `wp:import`
działu USP; media −5 = skasowany wolumen z pozycji WDR-06). Dla **logowania +5, wizyty +13,
dostawy +6** żadne zgłoszenie sektora nie wskazuje autora, a w dzienniku logowań stoi konto
**`audyt-int-tmp` (16:48:23Z), którego nazwa nie pada w ANI JEDNYM zgłoszeniu**.

**STRONA REPOZYTORIUM ZGODNA CO DO ZNAKU** — z 38 pól migawki 26 zgodnych, a wszystkie 12
rozjechanych leży w środowisku: gałąź, głowa `main`, `diff` 0, **strażników 39, mutacji 340,
testów 83, bramek smoke 16, goldenów 9, plików produktu 919**, skrót produktu identyczny.
**Sektor produktu nie tknął.**

**SEKCJA „CZEGO AUDYT NIE SPRAWDZIŁ" MA SIEDEM POZYCJI** i jest częścią raportu, nie
przypisem — m.in. kursy poza zakresem (399 z 1241 plików), **trzy działy na zakresie
węższym niż deklarowany** (FE traci 9 klas, BD wszystkie 10 plików PHP wtyczek, INT 6),
**132 pozycje checklist bez ani jednego wpisu przy braku nośnika odpowiedzi „tak"**, WER
zamknięty na suficie rund z pięcioma niedomkniętymi pozycjami z pięciu i brak porównania
fal (`porownaj-cykle.mjs` kod 1 — fali 2 nie ma).

**PODZIAŁ ZNALEZISK PO MIEJSCU, dla czytelnika spoza sektora:** **produkt WP 27** ·
dokumenty sektora audyt **69** · dokumentacja i repo 17 · bramki i narzędzia repo 11 ·
**prototyp D5 — JEDEN wpis** (`AUD-PROTO-F1-001`, `modules/m1-sklep/typy.ts`).

**RÓŻNICE, KTÓRE RAP ZGŁOSIŁ WOBEC STANU PODANEGO MU NA STARCIE** (przelicza sam, tak ma
w poleceniu): wpisów było 123, jest 126 — trzy jego własne; `DO WERYFIKACJI` 38 → 41;
oraz **korekta identyfikatorów w moim poleceniu**: pozycja o pustych zakresach to
`AUD-KON-F1-001/-002/-003`, nie `-004` (tamten dotyczy testów QA). **`RAP-90` NIE ISTNIEJE**
w `ROLE.md` — RAP ma sześć pozycji, więc znaleziska spoza listy złożył pod pozycjami,
których dotyczą.


**ZJAWISKO Z `AUD-KIER-F1-004` ZAOBSERWOWANE PO RAZ DRUGI — przez orkiestratora, w tej
samej sesji.** Strażnik sektora dał **kod 1**, a trzy kolejne przebiegi bezpośrednio po nim
**kod 0** (wcześniej w tej sesji: cztery kolejne zera, potem znów zera). Krytyk KIER go
NIE odtworzył w dwunastu przebiegach — czyli dwa niezależne padnięcia w jednej sesji przy
kilkunastu przejściach są dziś jedynym materiałem o tym zjawisku. **Komunikat przepadł
przez MOJĄ pułapkę pomiaru: uruchomiłem strażnika z `>/dev/null 2>&1`, więc kod wyjścia
znam, a powodu nie.** Kolejne przebiegi robione już z rozdzielonymi strumieniami do plików
— i wszystkie miały PUSTY stderr przy kodzie 0. To wzmacnia wniosek krytyka KIER:
**usterką jest nieme padnięcie**, bo bez treści komunikatu nie da się odróżnić wyścigu na
`wp_options` (mechanizm wskazany: `srodowisko.mjs:500-502` zrzuca ŻYWĄ bazę i zaraz
porównuje z nią liczniki, a trzy przeterminowane transienty kasują się przy pierwszym
sięgnięciu) od prawdziwego rozjazdu wartości.

**LEKCJA DLA KAŻDEGO POMIARU W TYM SEKTORZE:** `>/dev/null 2>&1` przy sprawdzaniu kodu
wyjścia zabija dowód dokładnie wtedy, gdy jest potrzebny — bo interesujący jest przebieg,
który padł, a nie te, które przeszły. Przekierowywać STDOUT i STDERR do OSOBNYCH plików,
nawet przy „rutynowej" kontroli.

### FALA 1 SEKTORA AUDYT — ZAMKNIĘTA (2026-09-04, ~06:30)

**Krytyk RAP był ostatnim wejściem: 3 z 3 PRZEPUSZCZAM, każde odtworzone samodzielnie.**
Odtworzył WSZYSTKIE liczby raportu i zgodziły się co do sztuki — **poza jedną**:
„65 pozycji z co najmniej jednym wpisem" (i wyprowadzone z niej „132 pozycje bez wpisu")
daje w pomiarze **67 i 130**, przy tym samym, poprawnym mianowniku 197. Zgłoszone jako
`AUD-RAP-F1-004`, wskazane co do linii. **Liczby w raporcie zostawiono NIEPOPRAWIONE**,
bo są przedmiotem tego wpisu, a sektory nie naprawiają tego, co zgłaszają — zamiast tego
raport ma na końcu sekcję **„SPROSTOWANIE PO KRYTYCE"** z prawidłowymi wartościami.

**MOJA DEKLARACJA O WIERNYM PRZENIESIENIU RAPORTU ZOSTAŁA SPRAWDZONA, nie przyjęta na
słowo** — i to jest wzorzec, bo orkiestrator jest w tym sektorze jedynym uczestnikiem bez
własnego krytyka. Krytyk sprawdził ją w OBIE strony: żadnego twierdzenia dodanego, żadnego
pominiętego; wszystkie cytowane ID istnieją i mają opisane werdykty. Nie rozstrzygnął
(i nie musiał), czy błędna liczba powstała w meldunku roli, czy przy przenoszeniu.

**DZIEWIĘĆ WPISÓW `ZWERYFIKOWANE` MIMO WERDYKTU ODRZUCAJĄCEGO — potwierdzone imiennie:**
`AUD-FE-F1-003`, `AUD-PERF-F1-004`, `-006`, `AUD-PIK-F1-001`, `-003`, `-004`,
`AUD-QA-F1-001` (weryfikator ODRZUCONE) oraz `AUD-ARCH-F1-002` i `AUD-REPO-F1-008`
(weryfikator ISTNIEJE, krytyk ODRZUCAM). **Pięć z obalonych stoi w wyjściu
`polacz-sektory.mjs` jako „TYLKO AUDYT"** — czyli narzędzie, na którym stanie porównanie
fal, poda obalone znalezisko jako wynik sektora.

**KRYTYK NIE ZNALAZŁ ÓSMEJ POZYCJI GRANIC i powiedział, dlaczego jej nie zgłasza:**
jedyny kandydat — że fala mierzyła środowisko, które sama zmieniła w trakcie (siedem ról
zamknęło się PRZED zmianami z 21:07–21:19Z) — **jest w raporcie**, tylko w sekcji
„Wartości początku i końca", nie na liście granic. **Zarzut z samego umiejscowienia byłby
wymyślaniem błędu.** Sprawdził też, że działów z klamrą w zakresie jest DOKŁADNIE trzy
(pomiar na wszystkich 15 zakresach), więc czwartego przeoczonego nie ma.

**RAP-06 (zakaz proponowania napraw) TRZYMA SIĘ** — dziewięć wzorców języka doradczego po
całym pliku daje 5 trafień, wszystkie w zdaniach o samym zakazie albo opisowych; form
ukrytych („brakuje X, powinno być Y") w prozie nie ma.

**PUŁAPKA POMIARU ORKIESTRATORA, którą krytyk RAP obszedł świadomie i której warto się
trzymać:** wszystkie jego pomiary tekstowe biegły pod `/usr/bin/grep` (GNU grep 3.12),
nie pod funkcją powłoki opakowującą `ugrep 7.8.4` — i napisał to w meldunku. Po
`AUD-WER-F1-006` to jest w tym sektorze wymóg, nie uprzejmość.

**STAN KOŃCOWY FALI 1 AUDYTU (policzony komendą):** wpisów **127** · wszystkie **19 ról
ZAKOŃCZONE** · niedomknięte tylko WER-01…05 · strażnik sektora kod **0** · niezmiennik
`git diff main -- . ':!audyt' ':!re-audyt'` **0 plików** · raport w
[audyt/wyniki/RAPORT-F1-AUDYT.md](wyniki/RAPORT-F1-AUDYT.md).

**NASTĘPNY KROK: commit wpisów i stanu fali 1, potem RE-AUDYT FALI 1** (punkty 8–12 planu
uruchomień: `rea-kier` KIER-00 z `--zrzut=f1-baza`, 14 Pogłębiaczy SEKWENCYJNIE z zrzutem
i przywróceniem po każdym, `rea-walid`, `rea-psiarz`, `rea-skut`, `rea-straz`, `rea-kon`,
`rea-kier`, `rea-rap` — każdy z krytykiem). **Fala 2 wymaga OSOBNEGO zielonego światła
właściciela** i wg KIER nie ruszy przed dopisaniem trzech wierszy granic
(`AUD-KON-F1-005`, `-006`, `-012`) — to zadanie kroku budowy, bo role nie mają `Write`.

### DWIE DECYZJE WŁAŚCICIELA PRZED RE-AUDYTEM FALI 1 (2026-09-04)

**(1) ZAKRESY ZOSTAJĄ TAKIE, JAKIE SĄ — re-audyt wchodzi na dokładnie te podwzorce,
na których pracował audyt.** Pytanie było wymuszone przez **regułę 20 strażnika**, która
żąda, żeby zakres każdego Pogłębiacza był IDENTYCZNY co do znaku z zakresem
odpowiadającego mu działu audytu („re-audyt mierzyłby inny obszar, niż audyt zbadał,
a łączenie po haszu (W4) przestaje znaczyć") — więc naprawa po jednej stronie jest
technicznie niemożliwa. **Cena decyzji, nazwana wprost: BD po raz drugi nie zobaczy ANI
JEDNEGO pliku PHP wtyczek, FE straci 9 klas, INT 6.** Zysk: porównanie audyt↔re-audyt
fali 1 zostaje czyste, a K4″ (reguły niezmienne w trakcie) nie zostaje złamane. Naprawa
podwzorców idzie do kroku budowy PRZED falą 2, razem z trzema wierszami granic
(`AUD-KON-F1-005`, `-006`, `-012`).

**(2) RE-AUDYT PROWADZONY JEDNYM CIĄGIEM**, bez pytania o zgodę na każdą kolejną rolę —
meldunek po każdej. Uzasadnienie właściciela przyjęte wprost: wznowienie po przerwaniu
limitem jest w tym sektorze przećwiczone dwa razy, a stan siedzi w plikach sektora, nie
w pamięci sesji.

**Stan wejściowy re-audytu (zmierzony, nie z pamięci):** audyt fali 1 ZACOMMITOWANY
(`6d4a51d`), 127 wpisów, 19 ról ZAKOŃCZONE, strażnik sektora kod 0, niezmiennik 0 plików,
`:8892` `/szkolenia/` 200 i trzy kontrole wtyczek kod 0, drzewo czyste poza nieśledzonym
`.claude/` (wyjątek sprzed sesji).

### RE-AUDYT FALI 1 — START (2026-09-04): KIER-00 ZALICZONY, ZRZUT BAZOWY STOI

**`rea-kier` zaliczył KIER-00 i osiem pozycji, 3 zgłoszenia, status celowo `W TRAKCIE`**
(kierownik re-audytu wraca po każdym Pogłębiaczu; nie jest na liście `NA_SRODOWISKU`,
więc nikogo nie blokuje).

**ZRZUT `f1-baza` UTRWALA STAN PO AUDYCIE, NIE STAN SPRZED FALI — i kierownik napisał to
wprost, żeby nikt go potem nie wziął za stan pierwotny.** `~/.cache/aai-kopie/audyt/f1-baza.sql`
(7 825 850 B), 80 tabel, skrót `3b3e6436…`, media 1343 pliki / 31 888 625 B, logowania 26,
wizyty 30, dostawy 6, changelog 1491 — identyczny z `po.json` audytu, a nie z `przed.json`
(21 / 17 / 0 / 1447, media 1348).

**OCALIŁ DOWÓD, KTÓRY NADPISYWAŁ:** stary `f1-baza` z otwarcia AUDYTU (2026-09-03T16:39:30Z,
commit `ec00a0f`) skopiowany PRZED nadpisaniem do
`~/.cache/aai-kopie/audyt/f1-baza-z-otwarcia-audytu-2026-09-03T1839.{sql,json}`, sha256
zgodne z oryginałem. Poza repo. To była jego jedyna czynność spoza narzędzi sektora.

**TRZY ZGŁOSZENIA — wszystkie o NARZĘDZIACH SEKTORA, nie o produkcie:**
`REA-KIER-F1-001` — `srodowisko.mjs:253-270,375`: **`--zrzut` nadpisuje istniejący zrzut
bez odmowy**, a `--sprawdz` przy rozjeździe nie podaje komendy naprawczej;
`REA-KIER-F1-002` — KIER-R2 **przechodzi na stanie PRÓBNYM**: `--pokaz` drukuje re-audyt
SEC i WALID jako „ZAKOŃCZONE runda 1/5" z 2026-09-01, bo `zdejmijProbe()` zeruje pliki
próby dopiero przy wejściu roli (hash tego wpisu jest RÓWNY `AUD-GOLD-F1-003`, więc
złączenie sektorów pokaże to jako „potwierdzone przez oba");
`REA-KIER-F1-003` — `polacz-sektory.mjs:46` **PISZE do śledzonego
`audyt/wyniki/polaczone-f1.json` bez trybu samego odczytu** (121 → 122 przy zwykłym
sprawdzeniu pozycji).

**DWA ZASTRZEŻENIA DO PROTOKOŁU, przekazane orkiestratorowi jako wiążące:**
(1) każdy `--zrzut=f1-<KOD>-po` uruchamiać **RAZ** — powtórka nadpisze dowód bez ostrzeżenia;
(2) **`:3001` nie stoi** — dotyczy wyłącznie pozycji PROTO-R6, postawić przed wejściem PROTO.

**OBSERWACJA ODDANA WPROST JAKO CUDZY ZAKRES (granica: Konrad audytu), nie zgłoszona pod
re-audytem:** między 18:39:30 a 19:11:26 dnia 2026-09-03 `AUTO_INCREMENT`
`wp_aai_monitor_logowania` **SPADŁ** 273 → 267 (25 → 21 wierszy). Obie liczby są pomiarami
(`migawka-wartosci.mjs --zapisz=przed` mierzy na nowo), więc baza była podmieniona po
zrzucie otwarcia audytu, a dziennik tego nie nazywa. Materiał do `AUD-RAP-F1-002`.

**ŚRODOWISKO GOTOWE NA CZTERNASTU POGŁĘBIACZY: TAK** — `--sprawdz --fala=1` kod 0
(„Środowisko gotowe"), żywa baza równa `f1-baza` co do wiersza i pliku.

**PROTOKÓŁ PRZEBIEGU (punkt 9 planu uruchomień):** rola → `--zrzut=f1-<KOD>-po` →
`--przywroc=f1-baza` → krytyk roli → następna. **Zrzut i przywracanie robi ORKIESTRATOR,
nie rola** — rola nie wie, kiedy skończyła w sensie protokołu, a narzędzie nadpisuje bez
ostrzeżenia. Kolejność działów jak w audycie, z **WDR na końcu** (jego pozycja każe
`podman-compose down && ./postaw.sh`) i **PROTO po postawieniu `:3001`**.

**KOMUNIKAT R31 ZŁAPANY — trzecie padnięcie strażnika, tym razem Z TREŚCIĄ, i diagnoza
się zmienia.** Brzmi: *„R31: srodowisko.mjs --test NIE przechodzi — zrzut, przywrócenie
i liczniki środowiska :8892 są bez bramki"*. Padnięcie nastąpiło **w chwili, gdy na `:8892`
pracował Pogłębiacz SEC** — czyli nie w próżni, jak przy dwóch poprzednich obserwacjach.

**To przesuwa podejrzenie z „wyścigu na przeterminowanych transientach" (hipoteza krytyka
KIER) na coś prostszego i groźniejszego: `straznik-sektora-audytu.mjs` woła
`srodowisko.mjs --test`, a ten stawia i kasuje SCHEMAT TYMCZASOWY** (`SCHEMAT_PROBNY`,
`proba_przywroc_<pid>`) w tej samej instancji MariaDB, na której właśnie mierzy rola.
Sprawdzone w kodzie: `--test` NIE dotyka żywej bazy WordPressa, więc **danych roli nie
niszczy** — ale jego wynik zależy od tego, co w tej instancji dzieje się równolegle.

**REGUŁA ORKIESTRACJI, KTÓRA Z TEGO WYNIKA i obowiązuje do końca przebiegu:
NIE uruchamiać strażnika sektora ani `srodowisko.mjs --test`, dopóki na `:8892` pracuje
rola.** Kontrole robić w oknie między rolami — tam, gdzie i tak stoją zrzut i przywrócenie.
Uzasadnienie jest to samo, co w regule 30 (jedna rola na środowisku naraz), tylko dotąd
nikt nie zauważył, że **orkiestrator też jest uczestnikiem tego wyścigu** — a jego kontrola
wygląda niewinnie, bo „tylko sprawdza".

**Wpis, którego przy tym nie było widać:** dopisek do dziennika przeszedł normalnie —
kod 1 dotyczył wyłącznie R31, żadna reguła o treści dokumentów się nie zapaliła.

### POGŁĘBIACZ SEC (1 z 14) ZROBIONY — i wyciągnął dwie rzeczy poza swoim zgłoszeniem

**SEC: ZAKOŃCZONE, 1 runda, JEDNO zgłoszenie `REA-SEC-F1-003`.** Zakres zmierzony na
113 plików (zgodny z `ROLE.md`). Kluczowa różnica wobec działu audytu: **odmowy mierzone
ŻĄDANIEM na żywym serwerze, nie lekturą warunku** — gość bez ciastka na czterech akcjach
panelu dostaje **400** (rdzeń WP, `wp_die('',400)`, PRZED nonce'em), zalogowany bez nonce'a
**403**, a dane (courses 2, changelog 1491) są niezmienione przed i po w obu przypadkach.

**ZNALEZISKO: kolektor CSP w `aai-obwod.php:169` przyjmuje publiczny zapis BEZ ŻADNEJ
warstwy integralności** — i pokazuje to ASYMETRIA, nie sama lektura: beacon monitoringu
z fałszywym podpisem dostaje 204 i **nie zapisuje nic** (wizyty 30 → 30), a kolektor CSP
bez nonce'a i bez podpisu dostaje 204 i **ZAKŁADA NOWY KLUCZ w opcji** (potwierdzone
i posprzątane). Wpływ sam wpis ogranicza: sufit 200 rodzajów i 8192 B, limiter, opcja bez
czytelnika.

**SEC-R1 ZAMKNIĘTA NA „BRAK MATERIAŁU" — i to jest fakt o sektorze, nie o dziale:** żaden
z trzech wpisów `AUD-SEC-F1-001…003` nie ma statusu ZWERYFIKOWANE (mają weryfikatora, nie
mają krytyka), więc **dział re-audytu przyszedł pogłębiać znaleziska, których własna bramka
audytu nie domknęła**.

**PUŁAPKA ŚRODOWISKA ZŁAPANA I COFNIĘTA PRZEZ SAMĄ ROLĘ: `npm run dev` NADPISAŁ
`CLAUDE.md`** własnym blokiem agenta Next — 2355 linii. Rola zauważyła to `git diff --stat`,
cofnęła `git checkout -- CLAUDE.md` i potwierdziła pustym diffem. **Do zapamiętania przez
każdą kolejną rolę: `next dev` mutuje `CLAUDE.md` przy starcie.**

**Rozliczenie śladów SEC — wzorcowe, kluczem po kluczu, nigdy zakresem:** sesja admina,
1 wiersz `logowania` (id 286), 1 wiersz `usermeta` (2388), 1 klucz opcji raportu CSP,
2 wiersze transientu limitera. Po sprzątaniu został wyłącznie dryf `AUTO_INCREMENT` —
i to jest właśnie to, czego rola cofnąć nie może, a protokół cofa.

**PROTOKÓŁ ŚRODOWISKA WYKONANY:** `--zrzut=f1-SEC-po` (kod 0, skrót `62b5f115…`) →
`--przywroc=f1-baza` (kod 0, skrót wraca do `3b3e6436…`, „liczniki żywej bazy = liczniki
zapisane przy zrzucie") → `--sprawdz --fala=1` **kod 0, „Środowisko gotowe"**.

### DWA POMIARY ORKIESTRATORA W OKNIE MIĘDZY ROLAMI

**(1) HIPOTEZA O R31 POTWIERDZONA: `srodowisko.mjs --test` przechodzi KODEM 0, gdy nikt
nie pracuje na `:8892`** — a padał w chwili, gdy mierzył Pogłębiacz SEC. Czyli niestabilność
strażnika sektora (`AUD-KIER-F1-004`) to **wyścig o wspólne środowisko, w którym
uczestnikiem jest sam orkiestrator**: strażnik woła `--test`, a ten stawia i kasuje schemat
tymczasowy w tej samej instancji MariaDB. Reguła 30 chroni role przed sobą nawzajem, ale
nikt nie chronił środowiska przed KONTROLĄ, bo kontrola „tylko sprawdza".

**(2) NOWA KONSEKWENCJA WPISU `REA-KIER-F1-002`, groźniejsza od zgłoszonej: po prawdziwym
wejściu Pogłębiacza SEC strażnik sektora ZAPALIŁ R17 i jest CZERWONY.** Komunikat:
„Pogłębiacz SEC wszedł 2026-09-01T22:36:49Z, a dział SEC audytu zakończył
2026-09-03T16:16:46Z — audyt zakończył się PO wejściu re-audytu (W5)". Zmierzone: plik
stanu niesie w historii wpis z **próby E7.6** jako pierwszy, a `zdejmijProbe()` zdjęło pole
`proba`, ZOSTAWIAJĄC ten wpis; prawdziwe wejście SEC to 2026-09-04T08:26:37Z. **Alarm jest
fałszywy co do treści, ale zieloność strażnika stoi w definicji ukończenia sektora**, więc
konsekwencja jest realna. **To samo czeka rolę WALID** (jej plik ma `proba: E7.6` i pierwsze
wejście 2026-09-01T22:47:35Z). Stanu NIE naprawiam ręcznie — to byłoby zatarcie dowodu;
rozstrzygnięcie, czy to ten sam mechanizm w nowej konsekwencji, czy osobne znalezisko,
oddane krytykowi SEC.

**KRYTYK SEC: PRZEPUSZCZAM na `REA-SEC-F1-003`, odtworzył OBIE strony asymetrii sam** —
POST bez ciastka i bez nonce'a na `admin-post.php?action=aai_obwod_csp` dał **204 i opcję
4 → 5 kluczy**, a beacon monitoringu z poprawnym `Content-Type`/`Origin` i podpisem
z samych zer dał **204 przy 30 wierszach i MAX(id) 161 przed i po**. Uznał wpływ za
**ZANIŻONY, nie zawyżony** (człon `violated-directive` nie ma sufitu długości).

**JEGO ZASTRZEŻENIE, KTÓRE NIE ZMIENIA WERDYKTU, a jest ostrzeżeniem dla fali 2:** hasz
miejsca `REA-SEC-F1-003` jest **IDENTYCZNY z próbnym `REA-SEC-F1-001`** z E7.6 — czyli rola
widziała ten wpis w wyjściu własnej komendy checklisty (oznaczony `[PRÓBA E7]`). Ponowne
zgłoszenie jest poprawne (wpisy próbne są wyłączone z łączenia sektorów, więc bez `-003`
fala 1 nie miałaby tego znaleziska), ale relacja do wpisu o tym samym haszu należała do
pola wpływu.

**R17 ROZSTRZYGNIĘTE PRZEZ KRYTYKA — to OSOBNE znalezisko, nie `REA-KIER-F1-002`, i moja
teza o WALID była BŁĘDNA.** Tamten wpis mówi, że `status.mjs --pokaz` NIE DRUKUJE pola
`proba`; tutaj pole `proba` **już nie istnieje** — szkodzi to, co po nim **zostało
w historii**. Krytyk przeliczył funkcje reguły 17 na treści plików stanu: `chwilaWejscia`
= `historia[0]` = 2026-09-01T22:36:49Z (wpis z próby), a po odjęciu samego tego wpisu ta
sama funkcja daje 2026-09-04T08:26:37Z i warunek przechodzi. **Sprostowanie mojej tezy:
WALID tego alarmu NIE wywoła** — nie należy do `DZIALY` (`wspolne.mjs:50-53`), więc reguła
kolejności sektorów go nie obejmuje. Zgłoszone jako `REA-SEC-F1-004`: **granicę próby
`zdejmijProbe()` zapisuje wyłącznie PROZĄ w polu `adnotacja`, a strażnik ma własny kod
i nie ma jej skąd odczytać.**

**DWA DALSZE ZGŁOSZENIA KRYTYKA:** `REA-SEC-F1-005` — pozycja SEC-R1 jest **domykalna bez
otwarcia pliku**, gdy zbiór zweryfikowanych jest pusty (brak gałęzi „zero materiału");
`REA-SEC-F1-006` — bramka `--sprawdz` liczy jako rozjazd `AUTO_INCREMENT`, którego
poprawnie sprzątająca rola nie umie cofnąć zwykłymi środkami.

**SPROSTOWANIE KRYTYKA DO WŁASNEGO WPISU `REA-SEC-F1-006`, zapisane TUTAJ, bo narzędzie
sektora NIE MA TRYBU POPRAWKI** (to samo, co `AUD-KIER-F1-006`): napisał w nim „różnica
nieusuwalna bez pełnego `--przywroc`" i sam uznał to za **za mocne** — usunął ją potem
ręcznym `ALTER TABLE … AUTO_INCREMENT`. **Prawda brzmi: usuwalna wyłącznie ręcznym
ALTER-em, którego sektor nigdzie nie dokumentuje ani nie podpowiada** (gałąź rozjazdu nie
podaje żadnej komendy — `REA-KIER-F1-001`). Wpisu NIE edytuję ręcznie: obejście narzędzia
sektora zatarłoby ślad, a brak trybu poprawki jest osobnym, zgłoszonym znaleziskiem.

**KRYTYK POPEŁNIŁ I NAPRAWIŁ BŁĄD WARTY ZAPISANIA — klasa `SKUT-R4` przeciw niemu samemu:**
`wp user session destroy admin --all` skasowało **CUDZY, ZASTANY wiersz `wp_usermeta`
(`umeta_id=31`)** — sesję z wcześniejszego logowania `curl/8.21.0`. Odtworzył go co do
znaku ze zrzutu `f1-baza.sql`, skasował własny wiersz 2388 i cofnął oba `AUTO_INCREMENT`.
**LEKCJA DLA KAŻDEJ KOLEJNEJ ROLI: `session destroy --all` to nie jest sprzątanie po sobie,
tylko po wszystkich.**

**Potwierdzenie pracy SEC drugą drogą:** krytyk porównał migawkę `srodowisko-f1-SEC-po.json`
z bazową i różni się ona **dokładnie jedną wartością** — `AUTO_INCREMENT` logowań 286 → 287
przy 26 wierszach. To podpis wiersza wstawionego i skasowanego, czyli **dowód z artefaktu,
że rola weszła na serwer i posprzątała** — nie z jej deklaracji.

**SEC jest JEDYNYM z czternastu działów bez ani jednego wpisu `ZWERYFIKOWANE`** (policzone
przez krytyka; 13 pozostałych ma materiał). Krytyk nie obciążył za to roli: narzędzie wiąże
listę `niedomkniete` wyłącznie z sufitem rund, więc sankcjonowanej drogi nie było.

### POGŁĘBIACZ FE (2 z 14) — ZNALAZŁ USTERKĘ, KTÓREJ BRAMKA WYGLĄDU NIE MOGŁA ZŁAPAĆ

**FE: ZAKOŃCZONE, 1 runda, dwa zgłoszenia.** Zakres zmierzony: **57 plików** (realny, nie
zero — zawężenie klamrowe dotyka innych podwzorców tego działu).

**`REA-FE-F1-001` — OBIE STRONY KURSU PRZEWIJAJĄ SIĘ W POZIOMIE NA 375 px.** Zmierzone
rigiem (puppeteer-core + systemowy Firefox): `scrollWidth` **509 i 479** przy `clientWidth`
**363**. Przyczyna wskazana co do reguły: flex-item `.aai-pasek-lista` bez `min-width: 0`.
**Druga połowa tezy jest cięższa od samej usterki: `smoke-wp-motyw` mierzy WYŁĄCZNIE
1440 px**, więc bramka wyglądu — 91 sprawdzeń, zielona — z definicji nie mogła tego
zobaczyć. To jest dokładnie ten rodzaj znaleziska, po który powołano re-audyt: audyt czytał
szablony, Pogłębiacz obejrzał SKUTEK w przeglądarce.

**`REA-FE-F1-002` — zasięg niespójnej waluty jest SZERSZY, niż podał audyt: sześć miejsc
renderu, nie jedno**, i FE rozdziela je po ADRESACIE: cztery widzi klient (`cena.php`,
`karta.php`, `hero.php`, `widok.php:246`), dwa właściciel w panelu (`panel/kurs.php:194`,
`panel/lista.php:195`). Stan faktyczny potwierdzony jego pomiarem: `woocommerce_currency`
= **USD**, `wc_price(299)` = `$299.00`, Store API `currency_code: USD`, a nasza strona kursu
drukuje **pięć razy „299,00 zł"**.

**FE POTWIERDZIŁ CUDZE ODRZUCENIE WŁASNYM POMIAREM, nie przepisaniem werdyktu:**
`AUD-FE-F1-003` (obalone przez weryfikatora audytu) — sprawdził `wp post get 6
--field=post_content` i angielski tekst okazał się TREŚCIĄ wpisu WooCommerce, a nie
mechanizmem i18n.

**Rozliczenie śladów:** dwa wiersze `wp_woocommerce_sessions` zidentyfikowane po
`session_key` i skasowane **jawną listą** (liczba wierszy wróciła do 294); własny wiersz
dziennika logowań sprzątnięty **przez tę samą regułę retencji, którą testował**. Reszta
rozjazdu to `AUTO_INCREMENT` i osiem wierszy `wp_options` z transientów — częściowo
z bramki `smoke-wp-motyw`, którą sam uruchomił (loguje się jako `klient-test`).

**PROTOKÓŁ ŚRODOWISKA WYKONANY:** `--zrzut=f1-FE-po` kod 0 → `--przywroc=f1-baza` kod 0 →
`--sprawdz --fala=1` **kod 0, „Środowisko gotowe"**.

**KRYTYK FE: `REA-FE-F1-002` PRZEPUSZCZAM, `REA-FE-F1-001` ODRZUCAM — ale NIE dlatego, że
usterki nie ma.** To rozróżnienie jest wynikiem samym w sobie: **objaw odtworzył CO DO
PIKSELA** (509/363 i 479/363 przy 375 px; 363/363 na czterech innych trasach; 1428/1428
przy 1440 px), a obalił **MECHANIZM wskazany we wpisie** — trzema pomiarami: lista renderuje
się na 178 px przy `scrollWidth` 574 (czyli kurczy się i przewija WEWNĘTRZNIE), pigułka
kończy się na `right=351 < 363`, wstrzyknięcie `min-width: 0` **nie zmienia nic**
(509 → 509), a ukrycie CAŁEGO paska też nie. Nadmiar siedzi w `<main>`: zdjęcie klasy `js`
(gasi `translateX(36px)`, `sklep.css:410`) daje 473/443, reszta w `.aai-okno`,
`.aai-lista-ptaszki`, `.aai-kolumna`. **Miejsce było formy „mechanizm", więc upadło
dokładnie to, co wpis wskazuje (K10′)** — ta sama klasa, za którą audyt odrzucił
`AUD-FE-F1-003`.

**DRUGĄ POŁOWĘ TEZY POTWIERDZIŁ NIEZALEŻNIE i ona jest ważniejsza od samej usterki:**
w całym `tools/` są **trzy** `setViewport` na stronach witryny (1440×1400, 1280×1000,
1440×900) — **ANI JEDEN poniżej 1280 px** — a `scrollWidth` nie jest porównywany
z `clientWidth` w ŻADNEJ bramce. **Bramka wyglądu tej klasy złapać nie mogła**, więc
przewijanie w poziomie na telefonie zostaje w produkcie jako zjawisko realne, tylko z inną
przyczyną niż zgłoszona.

**`REA-FE-F1-002` PRZEPUSZCZONE, a połowę panelową krytyk URUCHOMIŁ, gdy FE ją wyczytał:**
`wp eval-file` z `ob_start` + `Aai_Sklep_Panel::ekran_listy()` pod `--user=1` drukuje
`<td>299&nbsp;zł</td>` i `<td>349&nbsp;zł</td>`. Rozdzielenie adresatów uznał za
**uzasadnione**: panel nie woła `formatuj_cene`, więc naprawa widoku go nie dotyka.
Zastrzeżenie bez zmiany werdyktu: poza zasięgiem została **TRZECIA kopia** —
`priceCurrency: PLN` w `class-aai-sklep-seo.php`.

**NAJWAŻNIEJSZE ZNALEZISKO KRYTYKA — `REA-FE-F1-003`: ZEPSUTY ZAKRES ŻYJE TEŻ
W DEFINICJACH RE-AUDYTU i WYPRODUKOWAŁ FAŁSZYWĄ ODPOWIEDŹ.** Pozycja FE-R4 zamknięta na
„nie" jest NIEPRAWDZIWA: pod zakresem ZAMIERZONYM (66 plików zamiast 57) w obszarze FE leżą
`AUD-PERF-F1-005` i `AUD-PERF-F1-006`. **A samokontrola tego nie łapie, bo liczbę 57
policzono TĄ SAMĄ zepsutą komendą** (37+16+3+1 = 57, wszystko się zgadza). Klasa jest znana
audytowi (`AUD-KON-F1-001`), **nowe jest to, że mieszka w definicji re-audytu i zamieniła
się w złą odpowiedź na pozycję checklisty**. Skutek uboczny, który krytyk nazwał sam:
`REA-FE-F1-002` opiera się na pliku formalnie spoza zmierzonego zakresu.

**LEKCJA DLA KAŻDEJ KOLEJNEJ ROLI TEJ FALI, przekazywana im odtąd w poleceniu: policz swój
zakres OBIEMA drogami (z klamrami i bez) i powiedz, ile plików tracisz.** Samokontrola
„zakres ma zwrócić N" jest ślepa, bo N wzięło się z tej samej komendy.

**Rozliczenie krytyka: ślad ZEROWY** — `liczniki żywej bazy = zrzut f1-baza` po jego pracy
(kontrola obejmuje `COUNT(*)` i `AUTO_INCREMENT` każdej tabeli); skasował też własne pliki
robocze z `/tmp` kontenera. Rozliczenie śladów FE sprawdził niezależnie z jego migawki:
sesje 294→294, logowania 26→26, `wp_options` 423→431 = **osiem wierszy, dokładnie tak, jak
FE zadeklarował**.

### POGŁĘBIACZ BE (3 z 14) — ZNALAZŁ CICHĄ UTRATĘ TREŚCI W SIOSTRZANEJ METODZIE

**BE: ZAKOŃCZONE, 2 rundy, jedno zgłoszenie `REA-BE-F1-001` — i jest to najdroższa klasa
błędu tego repozytorium.** `Aai_Sklep_Zapis::zapisz_tresc_lekcji()` (linie 333–392)
**ZERUJE `content` i `materials` przy braku klucza**, podczas gdy siostrzana `zapisz_kurs()`
(linie 83–145) trzyma regułę **„brak klucza znaczy NIE RUSZAJ"** dla wszystkich pięciu
kluczy. Ta reguła ma w projekcie własny numer błędu (BLAD-018) i własnego strażnika.
Potwierdzone **dwustronnie, uruchomieniowo**: pięć kluczy mutowanych po kolei na
syntetycznym kursie przez `wp eval-file`.

**BE-R1: teza audytu ODTWORZONA URUCHOMIENIOWO, nie z lektury** — usunięcie
`class-aai-sklep-menu.php` z bind mountu dało `/szkolenia/` **PRZED 200 → PO 500 →
po przywróceniu 200**, przy pustym `git diff`. Siostrzane wtyczki porównał **parą nawiasów,
nie wcięciem**: `aai-platnosci.php` i `aai-monitor.php` mają `catch` obejmujący dosłownie
całe ciało `plugins_loaded`, a `aai-sklep.php` nie ma słowa „try" w całym pliku.

**SPROSTOWANIE MOJEGO OSTRZEŻENIA: zakres BE NIE MA KLAMER.** Zmierzył obiema drogami —
`:(glob)` daje **66 plików** zgodnie z deklaracją, a bez `:(glob)` **107**, czyli NADmiar,
nie niedomiar (domyślny fnmatch jest szerszy). **0 plików utraconych, zakres kompletny.**
Klasa `AUD-KON-F1-002` dotyczy innych działów niż BE — moje ostrzeżenie było za szerokie.

**ŚLAD, KTÓREGO ROZLICZENIE ROLI NIE OBEJMOWAŁO — i wyłapało go dopiero NARZĘDZIE, nie
człowiek.** `--przywroc=f1-baza` **PADŁO KODEM 1** z komunikatem: „Baza wróciła do zrzutu,
ale środowisko NIE jest stanem ze zrzutu (media leżą poza bazą, W2)". Media **1343 → 1346**.
Trzy pliki: `wc-logs/fatal-errors-2026-09-04-*.log` + `.htaccess` + `index.html` —
**WooCommerce zapisał do nich fatal error z testu BE-R1** („Class Aai_Sklep_Menu not found",
`aai-sklep.php:118`). Czyli **test uszkadzający kod zostawia trwały ślad POZA bazą, a
przywrócenie bazy go nie cofa**. Rozliczenie BE („liczniki 2/22/12/73 przed i po") było
prawdziwe co do bazy i NIEPEŁNE co do środowiska.

**Sprzątnięte przez orkiestratora JAWNĄ LISTĄ trzech plików** (nie zakresem, nie `rm -rf`
katalogu z wieloznacznikiem), potem `rmdir` pustego katalogu; `--sprawdz --fala=1` wrócił
do **kodu 0, „Środowisko gotowe"**. Ocena, czy to materiał na osobne znalezisko o protokole
re-audytu, oddana krytykowi BE.

**LEKCJA DLA PROTOKOŁU, warta zapamiętania ponad ten jeden przypadek: bramka `--przywroc`
sprawdza ARTEFAKT, nie proces** — melduje sukces przywrócenia bazy i **w tym samym
przebiegu zatrzymuje się na tym, czego przywrócić nie umiała**. Gdyby pytała tylko o bazę,
ślad po teście jechałby dalej przez wszystkie jedenaście pozostałych działów.

**KRYTYK BE: PRZEPUSZCZAM `REA-BE-F1-001`, i ROZSZERZYŁ dowód** — nie tylko odtworzył brak
klucza, ale zmierzył, że **pusta tablica kasuje OBA pola naraz i też melduje sukces**.
**Potwierdził też, że strażnik tej metody NIE OBEJMUJE:** reguła 6 `straznik-kreatora-wp`
pyta o `array_key_exists('content', $l)`, czyli o zmienną z `zapisz_kurs` — o
`zapisz_tresc_lekcji` nie pyta nic.

**DWIE KOREKTY KRYTYKA, obie zapisane w werdykcie, żeby nie poszły dalej:**
(1) **nieprawda w dowodzie i we wpływie** — `wp aai-sklep proza <plik>` **NIE woła** tej
metody i w ogóle nie pisze do bazy (czyta plik, składa Markdown, drukuje JSON); to był
JEDYNY dowód roli na czynnego drugiego klienta, więc **usterka zostaje realna, ale
wyłącznie LATENTNA** (dziś jedyny klient to panel, który zawsze wysyła oba klucze);
(2) **zła pozycja** — wpis stanął pod `BE-90` („czego NIE ma na liście"), a pytanie JEST na
liście (`BE-R6`: „uruchomieniowo dla KAŻDEGO z pięciu kluczy"). Porównania fal to nie psuje
(hasz liczy się z miejsca), ale **`porownaj-cykle.mjs` znakuje `-90` jako pozycję otwartą
i zapisuje, że checklista tego nie złapała — choć złapała.**

**NAJOSTRZEJSZA UWAGA KRYTYKA DO PRACY ROLI: teza potwierdzona, IZOLACJA PRZYCZYNY nie.**
Test BE (usuń plik → 500 → przywróć → 200) pokazuje, że **tryb awarii istnieje**, a nie że
**brak `try/catch` jest jego przyczyną** — brakuje KONTRPRZYKŁADU, czyli usunięcia tego
samego pliku w siostrzanej wtyczce, która `try/catch` ma. „I kosztował trwały ślad poza
bazą". Spór „para nawiasów czy wcięcie" krytyk uznał za **bezprzedmiotowy**: przy ZERZE
bloków `try` w pliku obie metody dają tę samą odpowiedź.

**SPROSTOWANIE MOJEGO OSTRZEŻENIA — BŁĄD KATEGORII po mojej stronie:** `AUD-KON-F1-002`
dotyczy zakresu **BD**, nie BE. Krytyk policzył zakres BE **dopełnieniem, nie sprawdzeniem
„czy wychodzi 66"** (świadomie omijając pułapkę `REA-FE-F1-003`): wszystkich `.php`
w `wordpress/wtyczki` jest 107, poza zakresem zostaje 41 i **wszystkie** to `szablony/`,
`assets/`, `languages/` — czyli teren FE wg `GRANICE.md`. **Zero plików utraconych.**

**`REA-BE-F1-002` — WŁASNE ZNALEZISKO KRYTYKA O PROTOKOLE SEKTORA, i to ono ma najszerszy
zasięg:** akapit „Pomiar nie zostawia śladu" jest **identyczny w CZTERNASTU plikach ról**
i wylicza „tabela, opcja, skrzynka", a `grep` po tych liniach daje **ZERO trafień** na
`AUTO_INCREMENT|media|plik|srodowisko.mjs`. **Protokół rozliczania śladu jest słabszy niż
własna bramka sektora** — dlatego rozliczenie BE („2/22/12/73 przed i po") było uczciwe
wobec protokołu i niepełne wobec rzeczywistości w DWÓCH wymiarach naraz: pliki `wc-logs/*`
oraz `changelog` 1491 → 1501 i trzy liczniki `AUTO_INCREMENT`.

### POGŁĘBIACZ BD (4 z 14) — ZMIERZYŁ SWÓJ ZEPSUTY ZAKRES I ŚWIADOMIE POSZEDŁ SZERZEJ

**BD: ZAKOŃCZONE, 1 runda, jedno zgłoszenie `REA-BD-F1-001`.**

**ZAKRES POLICZONY OBIEMA DROGAMI — liczby, nie hipoteza:** dosłowna komenda z `ROLE.md`
daje **25 plików i ZERO z `wordpress/wtyczki`**; ta sama komenda z klamrą rozbitą na pięć
osobnych `:(glob)` daje **35 plików** — dochodzi **10 klas PHP** (`tabele`/`zapis`/`import`/
`odczyt`/`odczyt-panelu` w trzech wtyczkach). To niezależne potwierdzenie `AUD-KON-F1-002`
i `AUD-BD-F1-002` własnym pomiarem.

**DECYZJA ROLI: pracował na PEŁNYM, 35-plikowym zakresie**, nie zmieniając definicji
(decyzja właściciela obowiązuje). Cenę dla porównywalności fal — fala 2 dostanie tę samą
zepsutą komendę i może pracować na 25 plikach, przez co rozjazd wyników nie znaczyłby tego,
co ma znaczyć (K4″) — oddano do rozstrzygnięcia krytykowi BD.

**ZNALEZISKO `REA-BD-F1-001`: druga instancja klasy „zapis wielotabelowy bez transakcji" —
`Aai_Sklep_Tutor::synchronizuj_kurs()` (235–272), zero `START TRANSACTION` w pliku.
Wartościowe jest jednak ROZRÓŻNIENIE wpływu, nie samo podobieństwo:** w
`Aai_Platnosci_Zapis` przerwanie zostawia **trwałego sierotę** (ponowienie duplikuje),
a w `Aai_Sklep_Tutor` ponowienie **samo się leczy** (szukanie po uuid) i rozjazd jest
wykrywalny przez `porownaj()`. Rola odpowiedziała więc na BD-R3 „**nie**, wpływ NIE przenosi
się 1:1" — zamiast wygodnego „ta sama klasa, ten sam skutek".

**BD-R6 — DROGA DANYCH SPRAWDZONA URUCHOMIENIOWO, to pozycja, na której stoi cały dział:**
trzy przebiegi `npm run wp:import` dały **0/0/109 bez zmian** za każdym razem, `changelog`
**1491 → 1491 → 1491 → 1491**, a `npm run wp:sprawdz` kod 0 z „**73 z 73 zgodnych CO DO
ZNAKU**" — przez `sha256`, nie przez sumę bajtów (sekcje porównywane strukturalnie przez
`isDeepStrictEqual`).

**Rozliczenie śladów — czyste i sprawdzone w OBU wymiarach:** w bazie jedyna zmiana to
`AUTO_INCREMENT` `wp_options` 4439 → 4440 (transient WP-CLI, liczby wierszy bez zmian);
poza bazą rola **sprawdziła `uploads/wc-logs/`** — katalog nie istnieje, bo żadnej awarii
nie wywołała. To pierwsza rola, która rozliczyła się z plików z własnej inicjatywy, po
lekcji z działu BE.

**PROTOKÓŁ ŚRODOWISKA WYKONANY:** `--zrzut=f1-BD-po` kod 0 → `--przywroc=f1-baza` kod 0 →
`--sprawdz --fala=1` **kod 0, „Środowisko gotowe"**.

**KRYTYK BD: PRZEPUSZCZAM, ZERO własnych zgłoszeń — i to jest wynik, nie brak pracy.**
Postawił hipotezę, że praca BD na pełnym zakresie zatruwa porównanie fal, **i sam ją
OBALIŁ zamiast zgłosić**: `porownaj-cykle.mjs` mówi wprost „rozjazd fal NIE jest z definicji
defektem audytu… kod wyjścia 0 zawsze, gdy obie fale istnieją", a `kodWyjscia()` daje 1
wyłącznie przy braku fali i przy podejrzeniu kopiowania. **Narzędzie NAZYWA rozjazd
(NADZBIÓR/SPRZECZNE), nie ocenia go.** Cena jest więc taka: fala 2 na 25 plikach da NADZBIÓR
na korzyść fali 1, a przyczyna jest już potrójnie udokumentowana — czwarty wpis o tym samym
korzeniu byłby powtórzeniem bez pogłębienia (KON-R5). **Hipotezy, która się nie broni, nie
zgłasza się w ogóle.**

**ROZSTRZYGNIĘCIE O PEŁNYM ZAKRESIE: BD MIAŁ RACJĘ, a cena jest mniejsza, niż zakładało
moje polecenie.** Kluczowy argument krytyka: **na 25 plikach dział o cichej utracie treści
nie widziałby ANI JEDNEGO pliku warstwy zapisu WP — w tym `class-aai-platnosci-zapis.php`,
czyli pliku WŁASNEGO zgłoszenia audytu.** Definicji BD nie ruszył, więc decyzji właściciela
nie złamał.

**TEZA O RÓŻNICY WPŁYWU BRONI SIĘ I JEST MOCNIEJSZA, NIŻ WPIS ARGUMENTUJE.** Krytyk
odtworzył obie strony: `znajdz_po_uuid()` pyta `post_status => 'any'`, a `wp aai-sklep
sprawdz-tutora` daje **87 obiektów, 0 różnic, kod 0** — lookup po uuid działa na prawdziwych
danych. Wąskie okno, którego wpis NIE nazywa (wpis wstawiony, meta uuid jeszcze niezapisana),
domykają dwie rzeczy: `usun_nadmiar()` dla modułów i lekcji oraz `porownaj()` dla kursu.
Po stronie płatności odwrotnie — `produkt_kursu()` to gołe `SELECT … WHERE course_uuid`,
**żadnego szukania sieroty**.

**SPRAWDZIŁ TEŻ, CZY „CO NAJMNIEJ DWA" NIE UKRYWA NIEDOLICZONEGO ZASIĘGU — nie ukrywa,
liczba to DOKŁADNIE dwa:** bez transakcji są tylko `class-aai-platnosci-zapis.php` (20
zapisów) i `class-aai-sklep-tutor.php` (3); monitor pisze jeden wiersz do jednej tabeli,
a prototyp (`dyspozytor.ts`, `migruj.ts`) transakcje ma. **Zjawisko jest CZYNNE**, bo
`powiadom()` wystrzeliwuje `aai_sklep_kurs_zmieniony` PO `COMMIT` — cała kopia do Tutora
biegnie poza transakcją.

**BD-R4 POLICZYŁ DOPEŁNIENIEM, świadomie omijając pułapkę, która przewróciła FE:** ze 140
wpisów fali **5 trafia w zakres 35** (w tym własny wpis audytu), **135 poza**, **0 bez
pliku**, suma kontrolna 140 = 140.

**DWIE SŁABOŚCI ZOSTAWIONE W WERDYKCIE ZAMIAST ZAMIENIONE W ZGŁOSZENIA** (bo zarzut byłby
wymyślony): dowód BD jest w całości statyczny, choć rola ma uruchamiać — ale pozycja BD-R2
z natury pyta o LICZBĘ MIEJSC w kodzie, a jej własna kolumna Dowód żąda „liczba + lista
miejsc"; oraz `class-aai-sklep-tutor.php` leży poza OBOMA wariantami zakresu BD (należy do
INT, którego zakres jest zepsuty tak samo), ale BD-R2 pyta wprost „w repozytorium".

### POGŁĘBIACZ QA (5 z 14) — UDOWODNIŁ URUCHOMIENIOWO, ŻE STRAŻNIK PRZEPUSZCZA TO, CZEGO PILNUJE

**QA: ZAKOŃCZONE, 1 runda, jedno zgłoszenie `REA-QA-F1-001`.** Zakres **80 plików obiema
drogami**, przy czym drugą metodą było **niezależne przeliczenie `awk` po pełnej liście
`git ls-files`**, a nie powtórzenie tej samej komendy — czyli QA sam ominął pułapkę, która
przewróciła dział FE. Zero strat.

**DOWÓD NAJMOCNIEJSZY, BO URUCHOMIENIOWY (QA-R6):** mutacja wstawiająca do seeda
„lekcj**ę** wideo" → `straznik-obietnic` **kod 0, NIE ŁAPIE**; mutacja „lekcj**e** wideo"
→ **kod 1, łapie**. Strażnik broniący obietnic produktu **przepuszcza formę z ogonkiem**.
Plik przywrócony bit w bit. To ta sama klasa co `AUD-QA-F1-005` (`\w` w JS nie obejmuje
polskich znaków), ale żyje w **dwóch plikach, których audyt NIE zgłosił**:
`straznik-obietnic.mjs:50-51` i `straznik-licencji.mjs:44`.

**KONTROLA POZYTYWNA, nie tylko negatywna:** `_price` produktu podmienione na 999.00 →
`wp aai-platnosci sprawdz` **kod 1 z WŁAŚCIWYM komunikatem** („cena liczona w kasie … nie
zgadza się z oczekiwaną 299.00 … Napraw: sync --napraw-cene"); po naprawie **kod 0**,
`_price` = 299.00. Bramka zapala się z właściwego powodu, nie tylko zapala.

**DECYZJA O NIEZGŁASZANIU, warta odnotowania osobno:** klasa „cichy `exit(0)` przy braku
katalogu" ma **5 miejsc, nie 3** — ale dwa nowe (`package.json`, `README.md`) to
**udokumentowana, zamierzona zgoda na bootstrap projektu** (komentarz w kodzie wprost),
a ich zniknięcie wywróciłoby toolchain wcześniej. QA **nie zgłosił ich**, nazywając powód.
Ocena, czy to uzasadnienie się broni, czy jest wygodne, oddana krytykowi.

**Klasa „substring ceny" policzona w pełnym zasięgu repo: DOKŁADNIE 4 miejsca — tyle, ile
znalazł audyt, zero dodatkowych.** Potwierdzenie cudzej pracy liczbą, nie deklaracją.

**Rozliczenie śladów w trzech wymiarach** (plik, baza, pliki poza bazą): mutacje seeda
przywrócone bit w bit, `_price` przywrócone komendą produktu, `uploads/wc-logs/` i
`debug.log` sprawdzone — bez nowych wpisów. Jedna różnica zgłoszona SAMODZIELNIE jako
nierozliczona: `wp_postmeta AUTO_INCREMENT` +2 z podwójnego `save()` WooCommerce.

**PROTOKÓŁ:** `--zrzut=f1-QA-po` kod 0 → `--przywroc=f1-baza` kod 0 → `--sprawdz` **kod 0**.

**KRYTYK QA: PRZEPUSZCZAM, ale ZNALAZŁ WIĘCEJ NIŻ ROLA — w tym samym pliku, który rola
mutowała.** Dwa własne zgłoszenia, oba z dowodem uruchomieniowym:
- **`REA-QA-F1-003` — zasięg klasy policzony NIEPEŁNIE: 7 czynnych wystąpień, nie 3.**
  Pominięte m.in. `straznik-obietnic.mjs:138` — **88 linii niżej w pliku, który re-audyt
  właśnie mutował**; dowód: „zestaw **plików** do pobrania" → kod 0, „zestaw **pliki** do
  pobrania" → kod 1. Do tego dwie linie obok tej, którą zgłosił audyt. Sprawdził też trzy
  inne linie i orzekł, że **NIE są ślepe** — czyli policzył w obie strony.
- **`REA-QA-F1-002` — „ZWERYFIKOWANE" to status PROCESU, nie oceny:** `werdykt.mjs:211`
  nadaje go KAŻDEMU wpisowi z kompletem werdyktów, także ODRZUCONEMU. Takich wpisów jest
  **dziewięć w sześciu działach fali 1**, w tym jeden ze SPRZECZNYMI werdyktami. Konsekwencja
  dla powtarzalności: wiersz R1 jest wspólny dla wszystkich Pogłębiaczy, więc **dwie fale
  mogą policzyć tę samą pozycję na dwóch RÓŻNYCH zbiorach bez żadnej zmiany w kodzie.**

**DECYZJĘ QA O NIEZGŁOSZENIU DWÓCH MIEJSC POTWIERDZIŁ POMIAREM, NIE ROZUMOWANIEM:** uruchomił
strażników w izolowanym katalogu — bez `README.md` `straznik-licencji` **kod 1** (ENOENT),
bez `package.json` `straznik-csp` **kod 1**. Czyli zniknięcie tych plików JEST głośne w tym
samym przebiegu, w przeciwieństwie do zniknięcia katalogu treści. **Jedna korekta:** „komentarz
w kodzie wprost" jest prawdą tylko dla jednego z dwóch miejsc — `straznik-readme.mjs:45` nie
ma ŻADNEGO komentarza. Uzasadnienie trafne, choć jedna jego noga przeszacowana.

**Zakres potwierdzony TRZECIĄ i CZWARTĄ drogą** (`git ls-tree` po obiekcie commita + `find`
po katalogach): 80 = 80 = 80. **„Reprodukcję CZĘŚCIOWĄ" uznał za opis UCZCIWY** — nazywa
brakujący element zamiast go przemilczeć — z zastrzeżeniem, że droga pośrednia była otwarta,
więc jest szczera, ale nie maksymalna.

**Jego ślad: ZEROWY w bazie** (tylko odczyt), dwa pliki zmutowane i przywrócone z kopii
sprzed pierwszej mutacji, `sha256` identyczne przed i po.

### POGŁĘBIACZ PERF (6 z 14) — NIE POWTÓRZYŁ INCYDENTU POPRZEDNIKA I POLICZYŁ DZIESIĘCIOKROTNOŚĆ

**PERF: ZAKOŃCZONE, 1 runda, CZTERY zgłoszenia.** Zakres **116 = 116** obiema drogami
(brak klamer w globie).

**NAJWAŻNIEJSZE JEST TO, CZEGO NIE ZROBIŁ: nie tknął `wp-config.php`.** Dział PERF audytu
wpisywał tam ręcznie `SAVEQUERIES` i przy tej czynności stderr `podman` trafił do pliku
przed `<?php`, co unieważniło WSZYSTKIE pomiary nagłówków na tym środowisku. Ten PERF
mierzył `$wpdb->num_queries` + filtr `query` zakładany **programowo w obrębie pojedynczego
`wp eval-file`** — sonda ginie razem z procesem, więc nie ma czego zdejmować. Stan pliku
na wyjściu udowodniony ARTEFAKTEM: `<?php\r\n` na początku, `grep SAVEQUERIES` kod 1,
strona od `<!doctype html>`, oba nagłówki obecne, `/courses/` → **301**.

**LICZBY, nie oceny:**
- **`REA-PERF-F1-001`: klasa „zapytanie w pętli" ma 30 ODRĘBNYCH MIEJSC, a audyt zgłosił 3**
  — policzone własnym skanerem tokenowym PHP (`token_get_all`) po 97 plikach zakresu.
- **`REA-PERF-F1-002`: nowy N+1 na trasie KAŻDEGO gościa** — `Aai_Sklep_Odczyt::moduly()`
  (`odczyt.php:199`), **6 trafień na render**, i na katalogu, i na stronie kursu. Audyt tego
  nie zgłosił.
- **`REA-PERF-F1-003`**: domknięcie luki dowodowej cudzego wpisu — **5 identycznych zapytań**
  `product_id … course_uuid` na jeden render strony kursu.
- **`REA-PERF-F1-004`**: brak `Cache-Control`/`Expires` na `assets/*.css|js` (tylko ETag
  i Last-Modified), z jawnym zastrzeżeniem, że rozstrzygnięcie „kod czy wdrożenie" zostawia
  WALID/KIER.

**ZAPYTANIA NA ODSŁONĘ, ZMIERZONE (po trzy stabilne przebiegi):** `/szkolenia/` **35** ·
strona kursu **41** · `/szkolenia/moje/` dla `klient-test` **59–64**. Kumulacja jest sednem
PERF-R3: 6 z 41 zapytań strony kursu pochodzi z NOWEGO miejsca i **nakłada się** na inne N+1.

**PERF-R4 zamknięty na „nie" z uzasadnieniem, nie deklaracją:** z 14 zgłoszeń innych działów
w plikach jego zakresu żadne nie ma klasyfikacji wydajnościowej (granica, integralność,
prywatność, waluta — nie N+1 ani cache).

**Rozliczenie w trzech wymiarach:** baza bez zmian (liczniki identyczne z `f1-baza`), brak
`debug.log` i `wc-logs`, własne pliki z `/tmp` kontenera usunięte — **a cudze ślady innych
ról w `/tmp` zostawione nietknięte**, zgodnie z regułą „sprzątaj po sobie, nie po wszystkich".

**PROTOKÓŁ:** `--zrzut=f1-PERF-po` kod 0 → `--przywroc=f1-baza` kod 0 → `--sprawdz` kod 0.

**KRYTYK PERF: ODRZUCIŁ główne zgłoszenie i ZMIERZYŁ, że metoda roli zaniża o połowę.**
- **`REA-PERF-F1-001` ODRZUCONE**: własny lekser w Node (nie `token_get_all`) na tych samych
  97 plikach daje **13 miejsc, nie 30**. Ręcznie potwierdził: w **9** z 30 ciało pętli nie
  robi ŻADNEGO zapytania, w **5** zapytanie stoi w NAGŁÓWKU `foreach` (wykonuje się raz),
  a jedno to ten sam mechanizm policzony dwa razy. **Wpis, który niesie liczbę, jej nie unosi.**
- Pozostałe trzy PRZEPUSZCZONE, każde odtworzone **przyrządem, którego rola nie użyła**
  (dziennik ogólny MariaDB wokół prawdziwego żądania HTTP): 6 zapytań lekcji na render, 5
  zapytań produktu, brak `Cache-Control` (rozszerzone też na assety monitoringu, z kontrolą
  negatywną — 404 te nagłówki MA).

**METODA POMIARU NIE MIERZY TEGO, CO `SAVEQUERIES` — zaniżenie o ~50%.** `num_queries`
w `wp eval-file` startuje **PO bootstrapie** WP/Woo/Tutora, więc gubi wszystko, co dzieje
się przed symulowanym renderem. Zmierzone na ŻYWYM żądaniu przez Apache (licznik
`Com_select`, szum na pliku statycznym = 0, po dwa zgodne przebiegi): `/szkolenia/` = **77**
i strona kursu = **83**, wobec **35** i **41** roli. **Różnica MIĘDZY trasami (6) zgadza się
w obu metodach — błędna jest wartość bezwzględna, nie kierunek.** Metoda roli jest bezpieczna
(sonda ginie z procesem), ale zaniżona.

**Dwa własne zgłoszenia krytyka, oba o CHECKLIŚCIE, nie o produkcie:** `REA-PERF-F1-005` —
pozycja PERF-R6 przyjmuje pomiar spoza kanału klienta jako „na żywej stronie", więc liczba
wchodzi do wyników zaniżona o połowę; `REA-PERF-F1-006` — pozycja PERF-R2 jest domykalna
**bez otwarcia pliku**, bo liczba z narzędzia jest dowodem sama dla siebie (ofiarą jest
30 wobec 13). **W jednym z nich POPRAWIŁ własne zdanie**, którego nie miał czym poprzeć.

**Uwaga o rozliczeniu, warta zapamiętania:** zdanie roli „liczniki identyczne z `f1-baza`"
**mierzy przywrócenie zrzutu, nie jej dyscyplinę** — migawka `f1-PERF-po`, zdjęta PRZED
przywróceniem, pokazuje +3 wiersze sesji i +9 na liczniku opcji. Krytyk nie zgłosił tego
osobno, bo protokół stoi obok: zdanie jest prawdziwe, tylko słabsze, niż brzmi.

### POGŁĘBIACZ ARCH (7 z 14) — ROZSTRZYGNĄŁ SPÓR I ZDEAKTYWOWAŁ WSZYSTKIE TRZY WTYCZKI

**ARCH: ZAKOŃCZONE, 1 runda, trzy zgłoszenia.** Zakres **79 plików**, potwierdzony `find`-em
o tej samej wąskiej semantyce — **zero strat**, `:(glob)` w tym zakresie działa poprawnie.

**ARCH-R6 — DOWÓD, KTÓREGO AUDYT ZROBIĆ NIE MÓGŁ: deaktywacja po kolei wszystkich trzech
wtyczek na żywej instalacji → ZERO razy HTTP 500**, wszystkie strony 200/302, degradacja
łagodna (CTA spada na `/kontakt`). Jedyne ryzyko (sklep wyłączony, produkty dalej kupowalne)
**już łapie `wp aai-platnosci sprawdz` kodem 1** — potwierdzone. Przy okazji: **szwów jest
SIEDEM, nie sześć** — dograł `aai_sklep_zamowienia_w_drodze`; checklista mówiła poprawnie,
to moje polecenie wymieniało sześć.

**ROZSTRZYGNIĘCIE SPORU `AUD-ARCH-F1-002` — wpis ze SPRZECZNYMI werdyktami (weryfikator
ISTNIEJE, krytyk ODRZUCAM) i mimo to statusem `ZWERYFIKOWANE`:** ARCH orzekł, że **cykl jest
faktem** (potwierdzony niezależnie jego grafem), ale **wpływ przesadzony** — `class_exists`
na żywej instalacji dał `true, true, false`, czyli dwie z trzech klas działają bez trzeciej.
**Trafny jest werdykt weryfikatora: ISTNIEJE z obniżonym wpływem; krytyk odrzucił za
szeroko.** To jest dokładnie przypadek, dla którego istnieje re-audyt.

**TA SAMA LUKA W `AUD-ARCH-F1-004`, KTÓREJ NIKT NIE ZŁAPAŁ** (`REA-ARCH-F1-001`): Trasy
i Panel ładują się bezwarunkowo w bootstrapie, ale Kontrakt **leniwie** (`class_exists`
= false), więc teza „nie da się rozdzielić trójki" jest fałszywa dla trzeciego ogniwa.

**Graf zależności zbudowany własnym skryptem: 54 klasy, 126 krawędzi, DOKŁADNIE 4 cykle** —
zgodne z audytem co do sztuki, zero pominiętych i zero dodatkowych. Trzecie zgłoszenie
(`REA-ARCH-F1-003`, ARCH-90): `Aai_Platnosci_Cta::stan()` nie waliduje klucza publicznego
filtra-szwu — PHP Warning przy złym kształcie wejścia, dziś nieaktywne.

**Ślady:** sól podpisu usunięta testem i **przywrócona do bajtu identycznego** (zweryfikowane
diffem), changelog 1491 przed i po, brak wpisów w `wc-logs`/`debug.log`, wszystkie pięć
wtyczek aktywnych na końcu jak na starcie. **PROTOKÓŁ:** zrzut → przywrócenie → `--sprawdz`,
wszystko kod 0.

### PRZERWANIE TRZECIE — `/clear` w połowie re-audytu fali 1 (2026-09-04, wieczór)

**Zatrzymanie na WŁASNE polecenie właściciela, nie na limicie.** Sektor zatrzymany
w bezpiecznym miejscu: po zamknięciu siódmego z czternastu Pogłębiaczy.

**STAN ZMIERZONY KOMENDĄ PRZED `/clear` (nie z pamięci):**

| Rzecz | Wartość |
|---|---|
| Wpisów w katalogu | **152** (audyt 125 + re-audyt 27) |
| AUDYT fali 1 | **ZAMKNIĘTY I ZACOMMITOWANY** (`6d4a51d`), 19 ról, raport w `audyt/wyniki/RAPORT-F1-AUDYT.md` |
| RE-AUDYT: Pogłębiacze ZAKOŃCZONE | **7 z 14**: SEC · FE · BE · BD · QA · PERF · ARCH — każdy z krytykiem |
| RE-AUDYT: zostało | **INT · PRIV · REPO · PIK · USP · PROTO · WDR**, potem role końcowe |
| `re-audyt-f1-KIER` | **W TRAKCIE, runda 1** — celowo; kierownik wraca po każdym Pogłębiaczu |
| Wpisy `REA-*` bez werdyktu krytyka | **16** |
| Wpisy `REA-*` bez werdyktu walidatora | **26** — walidator wchodzi PO Pogłębiaczach (punkt 10 planu) |
| Środowisko `:8892` | `/szkolenia/` **200**, `/courses/` **301**, `--sprawdz --fala=1` **kod 0** |
| Niezmiennik `git diff main -- . ':!audyt' ':!re-audyt'` | **0** |
| Strażnik sektora | **kod 1 na R17** — ZNANY fałszywy alarm (`REA-SEC-F1-004`), nie regresja |

**W CHWILI PRZERWANIA PRACOWAŁ `rea-arch-krytyk`.** Jego werdykty i ewentualne własne
zgłoszenia zapisują się **do plików sektora, nie do pamięci sesji** — więc nic nie ginie,
ale **jego meldunek przepadnie**. Nowa sesja ma sprawdzić KOMENDĄ, czy wpisy
`REA-ARCH-F1-001…003` mają już werdykt krytyka; jeśli tak — dział 7 jest domknięty i idzie
INT. **Nie uruchamiać krytyka ARCH drugi raz bez sprawdzenia.**

**WIĄŻĄCA KOLEJNOŚĆ WZNOWIENIA:**
1. Sprawdzić środowisko: `srodowisko.mjs --sprawdz --fala=1` (kod 0) oraz czy `rea-arch-krytyk`
   zdążył zapisać werdykty.
2. **INT** → protokół środowiska → jego krytyk. Potem tak samo: **PRIV, REPO, PIK, USP**.
3. **PROTO** — przed nim postawić prototyp na `:3001` (potrzebny wyłącznie dla PROTO-R6).
4. **WDR OSTATNI** — jego pozycja każe `podman-compose down && ./postaw.sh`, co przestawia
   całe środowisko.
5. Role końcowe, każda z krytykiem: `rea-walid` (na środowisku) → `rea-psiarz` (z zrzutem
   „po" i przywróceniem) → `rea-skut`, `rea-straz` (na plikach) → `rea-kon` → `rea-kier`
   (R1…R7, `polacz-sektory --fala=1`) → `rea-rap`.
6. `migawka-wartosci.mjs --zapisz=po` + `--porownaj`, commit.
7. **Fala 2 wymaga OSOBNEGO zielonego światła właściciela** — nie ruszać.

**PROTOKÓŁ PO KAŻDEJ ROLI (robi ORKIESTRATOR, nie rola):** `--zrzut=f1-<KOD>-po` →
`--przywroc=f1-baza` → `--sprawdz --fala=1`. **Zrzut uruchamiać RAZ** — nadpisuje bez
ostrzeżenia (`REA-KIER-F1-001`).

**SIEDEM RZECZY ZMIERZONYCH W TEJ SESJI, które wrócą — wkładać je do polecenia KAŻDEJ roli:**
1. **`grep` w powłoce agenta to funkcja opakowująca `ugrep 7.8.4`, a `/usr/bin/grep` to
   `GNU grep 3.12`** — różnią się kodami wyjścia i liczbą trafień (`AUD-WER-F1-006`).
   Każdy dowód ma mówić, którą implementacją mierzono. W kontenerach `grep` bywa nieobecny.
2. **`next dev` NADPISUJE `CLAUDE.md`** własnym blokiem (2355 linii) — nie uruchamiać
   `npm run dev`.
3. **`wp user session destroy --all` kasuje CUDZE sesje** — sprzątać jawną listą
   identyfikatorów, nigdy zakresem ani flagą „wszystko".
4. **Test uszkadzający kod zostawia ślad POZA bazą** (`uploads/wc-logs/`), którego
   przywrócenie bazy NIE cofa — po każdej wywołanej awarii sprawdzać pliki, nie tylko tabele.
5. **NIE uruchamiać strażnika sektora ani `srodowisko.mjs --test`, gdy rola pracuje na
   `:8892`** — strażnik woła `--test`, ten stawia schemat tymczasowy w tej samej instancji
   i przegrywa wyścig. Potwierdzone: między rolami przechodzi kodem 0.
6. **Samokontrola „zakres ma zwrócić N plików" jest ŚLEPA**, bo N policzono tą samą
   komendą (`REA-FE-F1-003`) — każda rola ma liczyć zakres DWIEMA drogami i mówić, ile traci.
7. **Liczba z własnego narzędzia nie jest dowodem sama dla siebie** (krytyk PERF przeliczył
   30 miejsc na 13), a **pomiar spoza kanału klienta to nie pomiar „na żywej stronie"**
   (`wp eval-file` zaniżył zapytania o połowę wobec żądania przez Apache).

### WZNOWIENIE PO PRZERWANIU TRZECIM — dziennik przebiegu (2026-09-04)

Prowadzi ORKIESTRATOR na bieżąco, żeby obserwacje spoza wpisów nie żyły wyłącznie
w rozmowie. **Meldunku roli nie czyta ani raport, ani fala 2** — co ma przetrwać,
musi leżeć tutaj albo we wpisie.

**Domknięte w tej sesji (każdy dział: Pogłębiacz → protokół → krytyk):**

| Dział | Wpisy Pogłębiacza | Werdykty krytyka | Własne wpisy krytyka |
|---|---|---|---|
| ARCH (7) | `REA-ARCH-F1-001…003` | 002, 003 PRZEPUSZCZAM · **001 ODRZUCAM** | `REA-ARCH-F1-004` |
| INT (8) | `REA-INT-F1-001…003` | 001, 003 PRZEPUSZCZAM · **002 ODRZUCAM** | `REA-INT-F1-004` |
| PRIV (9) | `REA-PRIV-F1-001…002` | oba PRZEPUSZCZAM | `REA-PRIV-F1-003…005` |
| REPO (10) | `REA-REPO-F1-001…002` | 001 PRZEPUSZCZAM · **002 ODRZUCAM** (za dowód, nie za zjawisko) | `REA-REPO-F1-003` |

**PROTOKÓŁ ŚRODOWISKA ROBI ORKIESTRATOR, NIE ROLA** — i to się w tej sesji
opłaciło dwa razy. Kolejność: `--zrzut=f1-<KOD>-po` (RAZ, nadpisuje bez ostrzeżenia)
→ `--przywroc=f1-baza` → `--sprawdz --fala=1`. Zrzuty zdjęte: `f1-INT-po`,
`f1-PRIV-po`, `f1-REPO-po`.

**PIĘĆ RZECZY ZMIERZONYCH PRZY WZNOWIENIU, których nie ma w żadnym wpisie:**

1. **Pułapka 4 wróciła w nowej odsłonie i ZATRZYMAŁA sektor.** Po INT
   `--przywroc=f1-baza` wrócił **kodem 1**: `uploads/` 1343 → 1345 plików, +13 bajtów.
   Winowajcy: `wc-logs/index.html` (0 B) i `wc-logs/.htaccess` (13 B) — WooCommerce
   zakłada je **razem z katalogiem** logów, a rola sprzątała wzorcem `*.log`.
   Narzędzie **celowo** nie ma opcji sprzątania mediów (W2: nikt nie ma prawa ich
   pisać, więc rozjazd = STOP dla człowieka). Ślad zdjęty jawną listą dwóch ścieżek,
   **za zgodą właściciela**; kontrola po tym kod 0. **Pusty katalog `wc-logs/`
   zostaje** — porównanie liczy pliki, nie katalogi.
2. **KLASA, nie trzy przypadki — osad plikowy poza bazą.** Pomiar klucza `media`
   we WSZYSTKICH dwunastu migawkach fali (krytyk PIK, potwierdzone przeze mnie):
   baza **1343 / 31 888 625 B**, a odstępstwa mają **trzy** role — `f1-BE-po`
   **+979 B**, `f1-INT-po` **+13 B**, `f1-PIK-po` **+60 253 B** (trzy
   `place-order-debug-*.log` po 19 212 B i `transactional-emails-*.log`).
   Pozostałe dziewięć migawek bit w bit. **Klasa jest już zgłoszona dwa razy**
   (`REA-BE-F1-002` celuje w akapit „Pomiar nie zostawia śladu" w 14 plikach ról,
   `REA-PRIV-F1-005` dokłada Mailpita) — **trzeci wpis byłby `KON-R5`**, więc role
   końcowe mają to traktować jako materiał potwierdzający, nie nowe znalezisko.
   **KOREKTA mojego wcześniejszego rachunku:** trzecim członem jest **BE**, nie
   PRIV — `f1-PRIV-po` ma `uploads` czyste.
3. **Rola przypisała własny ślad komuś innemu (inna podklasa).** PRIV zameldował, że kontrola daje
   kod 1 „WYŁĄCZNIE z powodu AUTO_INCREMENT, nie liczby wierszy" i że dryf
   `wp_woocommerce_sessions` jest „sprzed mojej pracy". Oba zdania fałszywe:
   kontrola wypisała też `wierszy 294 → 295`, a mój `--sprawdz` **bezpośrednio przed
   jego wejściem** dał kod 0. Krytyk potwierdził niezależnie migawkami sektora
   (`f1-INT-po` 13:03 → 294; rola weszła 13:29; `f1-PRIV-po` 13:53 → 295) i
   porównaniem bloków `INSERT`: dokładnie jeden klucz obecny tylko w drugim zrzucie.
   **Werdyktów to nie obaliło** — fałszywa klauzula higieniczna nie podpierała
   żadnego stwierdzenia, a odrzucenie prawdziwego znaleziska za nią zafałszowałoby
   porównanie fal.
4. **Zakres ról jest zepsuty w trzech działach z czterech, a plama nie jest pusta.**
   `REA-ARCH-F1-004` (41 utraconych szablonów, dwa ukryte cykle klas, w tym
   dwuwęzłowy `Panel ↔ Panel_Akcje` nieobecny w pliku klasy `Panel`),
   `REA-INT-F1-004` (6 z 21 plików — **git NIE rozwija `{a,b}` w pathspecu**, a w
   plamie leżały trzy dalsze wystąpienia klasy, którą sektor już przyjął).
   Zakresy PRIV (60), REPO (79) i PIK sprawdzone dwiema drogami — czyste.
5. **Audyt ogłoszony jako ZAMKNIĘTY ma komplet werdyktów na 84 ze 125 wpisów**
   (25 bez krytyka, 13 bez weryfikatora — w tym wszystkie `AUD-KIER-*` i `AUD-RAP-*`
   — 3 bez żadnego). Raport audytu **te liczby podaje sam** („85 ZWERYFIKOWANE,
   41 DO WERYFIKACJI"), więc nie jest to nieprawda dokumentu; rozstrzygnięcie, czy
   to wystarcza do zamknięcia, należy do `rea-kier` i `rea-kon`.

**WEJŚCIA DLA RÓL KOŃCOWYCH — zebrane w przebiegu, bez właściciela we wpisach:**

- **dla `rea-kon`:** README mówi, że repozytorium psuje się „na **340** sposobów",
  a `node tools/straznicy/audyt-straznikow.mjs` melduje **338 złapanych z 340
  wpisów** (2 pominięte bez materiału). `straznik-readme:167` liczy **wpisy**, nie
  sposoby, więc pętla jest zamknięta: przy 300 pominiętych dalej byłby zielony.
  Znalezisko **produktowe**, więc krytyk REPO go nie zgłosił (granica) — **i nie ma
  go ani audyt, ani re-audyt**;
- **dla `rea-kier` / `rea-rap`:** liczby wpisów rozjeżdżają się między nośnikami —
  `PLAN-BUDOWY.md` mówi 127, raport 126 (124+2), a dziś w katalogu leży 125 `AUD-*`
  i rosnąca liczba `REA-*`;
- **dla `rea-straz`:** `rejestr/znane-bledy.json` ma pole `wersja` ustawione raz
  (2026-08-19) i nigdy niepodniesione mimo 19 późniejszych wpisów, a **nic tego pola
  nie czyta** (sprawdzone: 21 trafień na `znane-bledy` w repo to sama proza i
  komentarze „PO CO" trzech strażników). Zjawisko stoi, choć wpis `REA-REPO-F1-002`
  został odrzucony za błąd w dowodzie — fala 2 ma podać **19 wpisów, BLAD-011,
  2026-08-19**;
- **dla `rea-skut`:** krytyk REPO uruchomił audyt mutacyjny PRODUKTU, który mutuje
  pliki wtyczek **bind-mountowane do żywej instancji**; przywrócenie sprawdził
  artefaktem (`git status` przed = po, `git diff --stat` puste), nie deklaracją.

**TRZY RZECZY, KTÓRE ZOSTAŁY POZA WPISAMI I DLATEGO SĄ TUTAJ:**

- **Werdykt bez `--powod` jest nieodwracalny.** Krytyk USP zapisał `PRZEPUSZCZAM`
  na `REA-USP-F1-001` **bez** `--powod`, a werdyktu nie da się nadpisać
  (`werdykt.mjs:209`) — jego zastrzeżenie o granicy przepadłoby, gdyby nie ten
  dziennik. Zastrzeżenie brzmi: **adresatem tego wpisu jest QA, nie USP**
  (`audyt/GRANICE.md:55`: QA = „czy ISTNIEJĄCA bramka mierzy to, co obiecuje",
  USP = „czy BRAKUJE narzędzia"; sekcja „Moduł" USP wyklucza pozostałych
  39 strażników wprost). **Wiersz do `KIER-04`.** Druga połowa zjawiska leży
  jednak u USP i nie została postawiona w polu `miejsce`:
  `tools/straznicy/audyt-straznikow.mjs:4234` liczy kod wyjścia jako
  `przeoczone.length || martwe.length ? 1 : 0` — **`pominiete` nie wpływa na kod
  wyjścia**, więc własne narzędzie pomiarowe działu nie odróżnia „nie zmierzono"
  od „zmierzono i przeszło".
- **`REA-USP-F1-003` jest DRUGIM wystąpieniem klasy z `REA-PIK-F1-002`** — wiersz
  `R6` nie nazywa swojego zbioru wejściowego ani jego liczności. Dwa wystąpienia
  znaczą, że przedmiotem jest **sposób pisania wierszy R6**, nie jeden wiersz.
  Kontrprzykłady w tej samej tabeli: `SEC-R6` „dla KAŻDEGO wejścia", `BE-R6`
  „KAŻDEGO z pięciu kluczy", `BD-R6` „TRZEMA przebiegami", `QA-R6` „każda bramka".
- **Obserwacja produktowa bez właściciela (druga taka w tej fali):**
  `tools/zrzuty/test-asercji.mjs` melduje „12 NIEZALICZONYCH" tam, gdzie
  `audyt-straznikow.mjs` powiedziałby „pominięte (brak materiału)" — nie odróżnia
  braku warunku wstępnego (`ZRZUTY_RIG`) od pękniętej asercji. Stan jest
  **udokumentowany** (`README.md:348`) i **nie jest usterką**, ale to ta sama
  rodzina co `REA-USP-F1-001`, tylko odwrócona.

**WALIDATOR ZAMKNĄŁ FALĘ 1 RE-AUDYTU: 53 wpisy, 43 ISTNIEJE, 10 ODRZUCONE, 0 bez
werdyktu** (zmierzone przelotem po plikach, nie z meldunku). Próg, który trzymał
i zapisał w KAŻDYM `--powod`, żeby fala 2 mogła go powtórzyć: **odrzucam, gdy
produktem wpisu jest liczba albo mechanizm i to one padają; przyjmuję z zapisaną
korektą, gdy pada zdanie poboczne.**

**PIĘĆ RZECZY OD WALIDATORA, KTÓRYCH NIE MA W ŻADNYM WPISIE:**

1. **Hasz miejsca potwierdza spójność WPISU, nie zgodność z repozytorium.**
   `hashMiejsca` liczy się z treści zapisanej we wpisie, a nie odczytanej z pliku:
   `REA-SEC-F1-002` ma hasz **zgodny**, choć wiersz `SEC-R6`, o którym mówi, został
   w międzyczasie **naprawiony**. Zestarzałe miejsce przy zgodnym haszu nie zapala
   niczego. To **drugi kierunek** tej samej usterki co `REA-WDR-F1-004` (hasz jest
   kluczem łączenia sektorów W4, ale nigdy z niczym nieporównywany: 178 wpisów,
   171 unikalnych haszy, **7 par**).
2. **`porownaj-cykle.mjs` liczy powtórzenia w obrębie jednej fali** (linia 109,
   druk 225), ale `porownajFale` wymaga OBU fal — więc licznik zapala się dopiero
   PO fali 2. Zawęża to tezę `REA-WDR-F1-004`, nie obala jej.
3. **Para `AUD-GOLD-F1-003` ↔ `REA-KIER-F1-002` ma pola `miejsce` bajt w bajt
   identyczne**, a dowód audytu jest **szerszy**; re-audyt wnosi wyłącznie własne
   odtworzenie. **Do decyzji kierownika**, czy to idzie do raportu.
4. **Walidator uszkodził cudzy dowód swoim wejściem** i sam to zgłosił: zdjęcie
   znacznika `proba` z `audyt/stan/re-audyt-f1-WALID.json` (17:26:47Z) uczyniło
   ekran z dowodu `REA-KIER-F1-002` **nieodtwarzalnym**. Usterka narzędzia zostaje:
   `status.mjs --pokaz` nie drukuje ani `proba`, ani `adnotacja`.
5. **OSIEM reprodukcji niszczących NIE zostało powtórzonych** — świadomie, każda
   z drogą zastępczą zapisaną w `--powod`: `REA-INT-F1-001`/`-003` (zakładanie
   i kasowanie zamówień), `REA-BE-F1-001` (zapis kursu podbija niezmienny dziennik
   audytu), `REA-KIER-F1-001` (nadpisanie zrzutu), `REA-KIER-F1-003`
   (`polacz-sektory.mjs` nadpisuje śledzony plik), `REA-QA-F1-001`/`-003` (mutacje
   plików śledzonych), `REA-WDR-F1-001` (przestawienie permalinków),
   `REA-SEC-F1-006` (logowanie podbija nieodwracalny `AUTO_INCREMENT`).

**ZASIĘG PODANY × POLICZONY — to jest główny produkt fali.** Największe rozjazdy:
`REA-PERF-F1-001` 30 → **13** (plus 7 pętli z zapytaniem w NAGŁÓWKU, czyli
wykonywanym raz), `REA-PIK-F1-001` „wszystkie cztery" → **co najmniej osiem**,
`REA-ARCH-F1-001` „jeden ekran" → **21 odwołań w 8 plikach**, `REA-USP-F1-002`
26/25/10 → **27/27/11** przy uczciwie nazwanej metodzie. Zgodziły się co do sztuki:
`REA-ARCH-F1-004`, `REA-FE-F1-003`, `REA-INT-F1-004`, `REA-QA-F1-003`,
`REA-USP-F1-001`.

**Rozjazd, który NIE zdyskwalifikował wpisu, ale dotyczy tego dokumentu:**
`REA-PERF-F1-002` podaje mianownik **35/41**, walidator zmierzył **77/83**
(`Com_select`, dwa przebiegi, szum 0) — a te same 35/41 stoją w
`audyt/PLAN-BUDOWY.md:2473` jako „ZMIERZONE".

**KRYTYK WALIDATORA: 30 z 53 werdyktów przeczytanych, próbka dobrana CZTEREMA
regułami z góry (wszystkie odrzucenia + przyjęte z rozjazdem + reprodukcje
niszczące + pary haszy + ślepa co czwarta z reszty), 8 werdyktów przeliczonych
własnym torem. Wynik: PIĘĆ NA PIĘĆ przeliczeń zasięgu zgodnych co do liczby —
ani jednej fałszywej liczby u walidatora.** Przeliczał **piątą** implementacją
(`token_get_all` w kontenerze), nie cudzym narzędziem.

**KWESTIONUJE DWA WERDYKTY — oba za PRÓG, żaden za fakty:** `REA-USP-F1-002`
i `REA-WDR-F1-002`. Przy `WDR-002` pokazał, że wpis wnosi **obie** rzeczy wymagane
przez jedyną PISANĄ regułę (`re-audyt/GRANICE.md:62` — „zasięg **albo**
odtworzenie"), a rozdzieliło je kryterium **wymyślone w locie** („pozycja `-90`
jest twierdzeniem o nowości"), którego **nie ma w żadnym dokumencie sektora**
i które jest **sprzeczne z komentarzem narzędzia**: `porownaj-cykle.mjs:31-33`
mówi, że wpisy `-90` porównuje się **TAK SAMO**, tylko oznacza.

**KOREKTA MECHANIZMU HASZA — ważniejsza, niż wygląda:** numer linii **NIE wchodzi**
do skrótu. `hashMiejsca` składa `["linia", plik, znormalizuj(tresc)]`, gdzie
`"linia"` to dosłowny napis rodzaju. Wniosek jest przez to MOCNIEJSZY: samo
przesunięcie wiersza nigdy nie zmieni hasza, a hasz nie wykryje **zestarzenia
miejsca**. Dowód konstruktywny: własna implementacja krytyka **nie otwiera żadnego
pliku** i zgadza się w **178 na 178** przypadków.

**DZIEWIĘĆ (nie osiem) reprodukcji niszczących — wszystkie drogi zastępcze
DOMYKAJĄ pytanie, zero zamkniętych po pustce.** Wzorzec poprawny i wart
naśladowania: zamiast jednej próby zamyka się pytanie **od strony konieczności**
(np. przy `INT-001`/`-003`: przelot po całych wtyczkach po rodzinie haków
kasowania zamówienia → zero trafień, więc NIE ISTNIEJE słuchacz, który mógłby
cofnąć skutek — to mocniejsze niż jedna próba).

**CZTERY ZGŁOSZENIA KRYTYKA — żadne nie dotyczy pracy walidatora, wszystkie
definicji, w ramach których ją wykonał:** `REA-WALID-F1-001` (sześć pytań tak/nie,
jeden werdykt, zero przełożenia — **żadne z czterech słów werdyktu nie pada
w `ROLE.md` ani w `AGENT.md` roli**, więc próg musiał powstać w locie);
`-002` (pozycja `WALID-R4` wskazuje narzędzie, którego **nie da się uruchomić** —
`zgloszenie.mjs` nie ma trybu samego sprawdzenia, każde wejście tworzy NOWY wpis);
`-003` (dwa dokumenty sektora odpowiadają przeciwnie w sprawie pozycji `-90`);
**`-004` — najgroźniejsze dla fali 2: moduł krytyka WALID nie obejmuje produktu
roli, którą krytyk ocenia.** `KRYTYK.md:72-77` wskazuje pliki `REA-WALID-F<N>-*`,
których jest **zero**; produktem roli są **werdykty w polu `werdykt.weryfikator`
CUDZYCH wpisów**, a słowo „weryfikator" nie pada w definicji krytyka ani razu.
**Krytyk trzymający się swojego modułu co do znaku otworzy zbiór PUSTY i zamelduje
brak materiału, nie łamiąc niczego.** W tej fali uratowało to polecenie z zewnątrz;
fala 2 nie ma go z czego odtworzyć.

**KRYTYK WALID NIE ZAPISAŁ ANI JEDNEGO WERDYKTU NARZĘDZIEM — i to jest decyzja,
nie przeoczenie:** `werdykt.mjs:49-52` zna dwie role, a slot `krytyk` na cudzych
wpisach należy do krytyków ICH działów (przy `REA-PERF-F1-001` wypełnił go krytyk
PERF). Ocena werdyktów walidatora **nie ma dziś nośnika** — to jest część
znaleziska `REA-WALID-F1-004`. Jego ocena zbiorcza: **PRZEPUSZCZAM 28, kwestionuję 2.**

**PSIARZ: 10 mutacji, 10 razy cisza — ale krytyk rozstrzygnął, że to w OŚMIU
przypadkach TAUTOLOGIA. Werdykt: 1 × PRZEPUSZCZAM, 9 × ODRZUCAM.** Sedno:
**ani jeden z ośmiu „milczących" wpisów nie zmierzył ciszy bramki, która MIAŁA
zareagować.** Pięć zmutowało miejsca, gdzie kandydata na bramkę **nie ma
w repozytorium wcale** (mutacja pod wpis, który sam mówi „bramki nie ma", niczego
nie dowodzi); **trzy** zmutowały miejsca, gdzie kandydat **ISTNIEJE i nie został
uruchomiony** (`smoke-wp-tutor.mjs:212`, `smoke-wp-zakup.mjs:390-403`,
`smoke-wp-kreator.mjs:437`). **Bramka nieuruchomiona to nie jest bramka milcząca** —
cisza w tych trzech miejscach jest NIEZMIERZONA, nie zmierzona. Dwa wpisy
„pozytywne" mają **hasz identyczny z cudzymi** (`REA-PSIARZ-F1-008` = `REA-QA-F1-001`,
`-009` = `REA-USP-F1-001`).

**JEDYNE PRAWDZIWE ZNALEZISKO PSIARZA — i jest ciężkie, bo dotyczy klasy cichej
utraty treści (`REA-PSIARZ-F1-002`, PRZEPUSZCZONE):** przy **bezwarunkowym
czyszczeniu `content`/`materials`** w `class-aai-sklep-zapis.php:375-376` trzy
strażniki dały **kod 0**, a komunikat `straznik-kreatora-wp` niesie w tym stanie
zdanie **nieprawdziwe**: „brak klucza znaczy «nie ruszaj» (treść, materiały,
sekcje, program, stan)". Mechanizm: `straznik-kreatora-wp.mjs:287` testuje wzorzec
`array_key_exists( 'content', $l )` na **CAŁYM źródle pliku**, a literał żyje
w innej metodzie (`zapisz_kurs`, linie 627/633). **To DZIESIĄTY nawrót klasy
„wzorzec na obecność zamiast na rozstrzygnięcie".**

**PRÓBKA PSIARZA DOBRANA POD ŁATWOŚĆ** (ocena krytyka, potwierdzona liczbami):
10 z **43** potwierdzonych znalezisk; bez ani jednej mutacji zostało **14 znalezisk
w pięciu działach**, w tym **PRIV z pięcioma — największy klaster fali pominięty
w całości**. Dwa z dziesięciu celów to nie kod produktu, tylko **WEJŚCIE
strażnika** (`seed-przyklady.ts`, `README.md`) — najtańsza możliwa mutacja, i oba
dały duplikaty hasza.

**TRZY ZGŁOSZENIA KRYTYKA PSIARZA, wszystkie o narzędziach roli:**
`REA-PSIARZ-F1-011` — komenda pozycji `PSIARZ-R1` to `npm run check`, który
**nie uruchamia ANI JEDNEJ z szesnastu bramek WP** (`npm run smoke` =
siedem smoke'ów prototypu; `smoke:wp-*` stoi osobno) — rola mutująca wyłącznie kod
WordPressa ma wskazany runner **strukturalnie niezdolny zaszczekać**;
`-012` — checklista **nie ma pozycji pytającej, czy kandydat na bramkę w ogóle
istniał**, ani rozstrzygającej „bramka ślepa" kontra „bramki nie ma" (różny adresat
naprawy), choć repozytorium ma do tego własny instrument (`audyt-straznikow.mjs`
z polem `oczekiwanySlad`), o którym **nie wspomina ani checklista, ani SKILL.md,
ani żaden z dziesięciu wpisów**;
`-013` — `audyt/stan/re-audyt-f1-PSIARZ.json` deklaruje **19 niedomkniętych
pozycji, z których ŻADNA nie należy do tej roli** (PRIV-R1, WDR-R5, KIER-90…),
bo `status.mjs:450-465` sprawdza wyłącznie KSZTAŁT kodu pozycji, nigdy związku
z rolą — **a kierownik liczy stąd otwarte pozycje (KIER-01)**.

**PUŁAPKA PRACY (nowa, kosztowała plik w korzeniu repo):** `node <skrypt> -- <ścieżka>`
— node **nie połyka** `--`, więc `writeFileSync(process.argv[2])` tworzy plik o nazwie
`./--` w katalogu roboczym, czyli w repozytorium. Złapane przez `git status`.

### PRZERWANIE CZWARTE — `/clear` po zamknięciu wszystkich Pogłębiaczy (2026-09-04, noc)

**Zatrzymanie na polecenie właściciela, nie na limicie.** Sektor zatrzymany
w miejscu bezpiecznym: **wszystkie 14 Pogłębiaczy fali 1 domknięte, każdy
z krytykiem**, walidator zamknął całą falę, PSIARZ i STRAZ zamknięte z krytykami.

**STAN ZMIERZONY KOMENDĄ PRZED `/clear`:**

| Rzecz | Wartość |
|---|---|
| Wpisów w sektorze | **199** (audyt 125 + re-audyt **74**) |
| Wpisy `REA-*` bez werdyktu krytyka | 35 (w większości **własne zgłoszenia krytyków** — krytyk nie ocenia siebie) |
| Wpisy `REA-*` bez werdyktu walidatora | 21 (wszystkie powstały **po** przebiegu walidatora) |
| Rozkład działów `REA-*` | ARCH 4 · BD 1 · BE 2 · FE 3 · INT 4 · KIER 3 · PERF 6 · PIK 2 · PRIV 5 · PROTO 4 · **PSIARZ 13** · QA 3 · REPO 3 · SEC 6 · SKUT 1 · STRAZ 3 · USP 3 · WALID 4 · WDR 4 |
| Werdykty walidatora (jego przebieg) | **53 wpisy: 43 ISTNIEJE, 10 ODRZUCONE, 0 bez werdyktu** |
| Środowisko `:8892` | `--sprawdz --fala=1` **kod 0**, stan bazowy |
| Prototyp `:3001` | **UBITY** po roli PROTO |
| Niezmiennik sektora | `git diff main --name-only -- . ':!audyt' ':!re-audyt'` → **0** |
| Drzewo poza `audyt/` i `.claude/` | **0 zmian** — mimo że PSIARZ mutował 10 śledzonych plików produktu |

**W CHWILI PRZERWANIA PRACOWAŁY DWA AGENTY** — ich meldunki przepadną, ale
**wyniki zapisują się do plików sektora, nie do pamięci sesji**:
**OBIE ROLE ZDĄŻYŁY SKOŃCZYĆ PRZED `/clear`** — ich wyniki są opisane niżej,
nie trzeba ich odtwarzać: `rea-skut` zamknął `SKUT-R6` (trzy wpisy
`REA-SKUT-F1-001…003`), `rea-straz-krytyk` wydał trzy werdykty i zgłosił
`REA-STRAZ-F1-004`. **Zostaje jedno: `rea-skut-krytyk` nie wchodził** — trzy
wpisy SKUT nie mają werdyktu krytyka.

**KOLEJNOŚĆ DOKOŃCZENIA FALI 1:**
1. **`rea-skut-krytyk`** — ocenia `REA-SKUT-F1-001…003` (jedyny brakujący krytyk);
2. **`rea-kon`** + krytyk (Konrad audytuje RE-AUDYT, nie projekt);
3. **`rea-kier`** + krytyk — pozycje R1…R7 i `polacz-sektory.mjs --fala=1`;
4. **`rea-rap`** + krytyk — raport końcowy;
5. `migawka-wartosci.mjs --zapisz=po` + `--porownaj`, **commit**;
6. **FALA 2 WYMAGA OSOBNEGO ZIELONEGO ŚWIATŁA WŁAŚCICIELA.**

**PROTOKÓŁ PO KAŻDEJ ROLI ROBI ORKIESTRATOR** (nie rola): `--zrzut=f1-<KOD>-po`
→ `--przywroc=f1-baza` → `--sprawdz --fala=1`. **Zrzut RAZ — nadpisuje bez
ostrzeżenia.** Zdjęte w tej sesji: `f1-INT-po`, `f1-PRIV-po`, `f1-REPO-po`,
`f1-PIK-po`, `f1-USP-po`, `f1-PROTO-po`, `f1-WDR-po`, `f1-WALID-po`,
`f1-PSIARZ-po`.

**DWA ODSTĘPSTWA OD REGUŁY „PROTOKÓŁ ROBI ORKIESTRATOR", oba świadome:**
zakaz miał chronić zrzuty przed nadpisaniem, a **zablokował pozycję checklisty** —
`SKUT-R6` (czy kolejność bramek zmienia wynik) jest niewykonalne bez przywracania
stanu między przelotami. Rozwiązanie: **orkiestrator przywraca na żądanie roli**,
rola mierzy. Drugie: **decyzja właściciela z tej sesji** — ślad poza bazą
zostawiony przez rolę kasuje **orkiestrator, jawną listą ścieżek**, i jest to
przywrócenie stanu, nie naprawa produktu.

**CZEGO NIE ROBIĆ PO WZNOWIENIU:**
- **NIE uruchamiać `npm run dev`** — nadpisuje śledzony `CLAUDE.md` blokiem
  2355 linii. Prototyp stawia się `rm -rf .next && npm run build`, potem
  `node --env-file=.env node_modules/.bin/next start -p 3001`; ubija
  `fuser -k 3001/tcp` (**nie** `pkill -f "next start"` — trafia własną powłokę).
  Prototyp jest potrzebny **wyłącznie** dla `PROTO-R6`, czyli już nie jest;
- **NIE uruchamiać strażnika sektora ani `srodowisko.mjs --test`**, gdy rola
  pracuje na `:8892` — strażnik woła `--test`, ten stawia schemat tymczasowy
  w tej samej instancji i przegrywa wyścig;
- **NIE robić `git checkout --` na plikach `audyt/` i `re-audyt/`** — leży tam
  dorobek osiemnastu ról. Dla plików **produktu** jest bezpieczne, bo ich drzewo
  jest czyste;
- **NIE kasować danych właściciela** w tabelach monitoringu: **26 logowań,
  30 wizyt** (materiał dowodowy z testu T4).

**KRYTYK STRAZ — JEDENASTY NAWRÓT KLASY, OBALONY W PAMIĘCI.** Werdykty:
`REA-STRAZ-F1-001` PRZEPUSZCZAM, `-002` PRZEPUSZCZAM, `-003` **ODRZUCAM**.

**Projekt strażnika przeciw klasie „wzorzec na obecność" SAM jest tą klasą** —
krytyk zbudował prototyp reguły i puścił go na **sześciu wariantach źródła
trzymanych w PAMIĘCI** (zero zmian na dysku, `git status -- wordpress/` = 0).
Trzy obejścia przechodzą na zielono: przemianowany klucz wejścia
(`$tresc['tresc_html']`), podstawienie innego pola przez `?? array()`, oraz
`isset(…) ? '' : ''`. **Pierwsze jest realistyczne** — panel nie wysyła
przemianowanego klucza, więc każdy zapis treści lekcji kasuje prozę i melduje
sukces (kształt BLAD-019). Gorzej: **projekt oblewa własny deklarowany
kontrprzykład** (`$tresc → $dane`), bo dalej wiąże się z NAZWĄ, tylko zmiennej
zamiast metody.

**Licznik klamr działa PRZYPADKIEM.** W pliku zapisu po `kod()` nie ma ani
jednej klamry w literale, heredocu czy interpolacji — ale **w 14 ze 107 plików
PHP trzech wtyczek są** (`class-aai-sklep-proza.php` 9 literałów,
`class-aai-platnosci-zapis.php` 13, `class-aai-monitor-wizyty.php`
`'/^[0-9a-f]{32}$/'`). Jedno `preg_match` z licznością w klamrach dołożone do
pliku zapisu rozjeżdża licznik **po cichu**.

**UZUPEŁNIENIE DO `REA-STRAZ-F1-002`, którego wpis nie ma — wykonawca komend
zakresu ISTNIEJE i nie łapie tej klasy.** `audyt/tools/mapa.mjs:63` puszcza je
przez `execFileSync`, a reguła 8 strażnika sektora uruchamia `mapa.mjs`.
Uruchomiona wypisuje **FE 57, INT 15, ARCH 79** — dokładnie zaniżone liczby ze
wszystkich trzech wpisów — **i mimo to melduje SIEROTY 0**, bo pokrycie jest
SUMĄ zakresów: plik wypadnięty z jednego zakresu bierze inny. Jedyny wykonawca
w sektorze **nie jest w stanie** tej klasy złapać.

**KOREKTA FAKTU (dotyczy też wcześniejszych zapisów tego dziennika):**
`REA-ARCH-F1-004`, `REA-INT-F1-004` i `REA-FE-F1-003` mają status
**DO WERYFIKACJI**, nie ZWERYFIKOWANE — każde z werdyktem weryfikatora
ISTNIEJE, żadne z werdyktem krytyka. Substancja („policzone niezależnie,
zgodne co do sztuki") się broni; fałszywa była etykieta stanu.

**DUPLIKAT HASZA POTRÓJNY:** `2c4e967b8260…` mają **trzy** wpisy —
`REA-USP-F1-001` (ZWERYFIKOWANE), `REA-PSIARZ-F1-009` (odrzucony za ten hasz
o 19:28:53Z) i `REA-STRAZ-F1-003`, złożony **siedem minut po tym**, jak
precedens był już w katalogu i widoczny `werdykt.mjs --pokaz`, czyli własną
komendą modułu tej roli.

**`REA-STRAZ-F1-004` — STRAZ NIE MA GDZIE ZŁOŻYĆ SWOJEGO PRODUKTU.** Trzy
z sześciu pozycji roli mają w kolumnie „Komenda / miejsce" wpisane **„opis
projektu"** — własną prozę agenta, nie plik ani komendę. `zgloszenie.mjs`
przyjmuje wyłącznie usterkę, `status.mjs` zapisuje status i rundy, rola nie ma
`Write` ani `Edit`. **STRAZ jest jedyną z 21 ról obu sektorów, której produktem
jest PROJEKT, nie usterka — i jako jedyna nie ma dokąd go złożyć.** Cena
widoczna od razu: wada projektu 001 **nie jest przedmiotem niczyjego werdyktu,
bo formalnie nie istnieje**. Zmierzone: w żadnym z trzech wpisów tej roli nie
pada ani raz słowo „kontrprzykład" ani fraza „test negatywny" — czyli dokładnie
to, czego `STRAZ-R4` żąda jako dowodu.

**BRAK `--niedomkniete` PRZY ZAMKNIĘCIU W RUNDZIE 1 NIE ŁAMIE DEFINICJI** —
`AGENT.md` wiąże ten obowiązek wyłącznie z **sufitem** rund, więc rola
zamykająca się wcześniej nie ma czego deklarować. **To jest dziura w procesie,
nie w postępowaniu roli** (klasa opisana już w `AUD-PIK-F1-006`
i `REA-PSIARZ-F1-013`).

**SKUT ZAMKNIĘTY — `SKUT-R6` ma odpowiedź: KOLEJNOŚĆ NIE ZMIENIA WYNIKU.**
Dwa przeloty trzech bramek w przeciwnych porządkach, każdy od stanu
potwierdzonego kodem 0 wobec `f1-baza` (przywracał orkiestrator na żądanie roli):
`jezyk` **10/25 czerwonych w obu**, i to **identycznie co do znaku** (`diff` = 0
po usunięciu losowego tokenu resetu hasła); `zwroty` **39/39** dwa razy; `motyw`
**91/91** na pierwszej i na trzeciej pozycji. **Historyczna niestabilność
`smoke-wp-motyw` z T1/T4 NIE wystąpiła.**

**Odpowiedź jest WĘŻSZA NIŻ PYTANIE i to jest zapisane we wpisie, nie tylko
w meldunku** (`REA-SKUT-F1-003`): trzy bramki z piętnastu, **bez `panel`** — a
tamta niestabilność padała właśnie w trójce `panel → jezyk → motyw`. Rola
sprostowała przy tym własną nieścisłość: **dwie wcześniejsze próby projektu
(T1 i T2) też jej nie odtworzyły** i też wróciły zielone, więc wynik jest spójny
z historią, ale **przyczyna zjawiska pozostaje nieustalona** — nie wiadomo nawet,
czy to w ogóle efekt kolejności.

**`REA-SKUT-F1-002` — BRAMKA WEJŚCIA SEKTORA NIE WIDZI BRAKU ARTEFAKTU.**
Katalog `wp-content/languages` jest na `:8892` **realnie nieobecny**, przez co
`smoke-wp-jezyk` daje 10 z 25 sprawdzeń czerwonych — a `srodowisko.mjs --sprawdz`
melduje „środowisko gotowe", bo porównuje **wyłącznie tabele i `uploads/`**.
Gorzka pointa: **produkt ma na to własny test artefaktowy** (`postaw.sh:326-332`),
**sektor nie ma żadnego**. Rola uczciwie nie twierdzi, kto i kiedy te pliki
usunął — tego nie zmierzyła.

**RODZINA „BRAMKA MÓWI «GOTOWE», BO NIE PYTA" — trzy niezależne manifestacje
w tej fali, z trzech różnych ról:** `REA-SKUT-F1-001` (migawka **liczy**
`wtyczki_aktywne` i `wersje`, `porownajLiczniki()` **nigdy ich nie czyta**),
`REA-SKUT-F1-002` (artefakt niesprawdzany przez sektor), oraz znalezisko krytyka
STRAZ o `mapa.mjs` liczącym pokrycie **sumą zakresów** (SIEROTY 0 nawet przy
zaniżonych zakresach). Wszystkie trzy: **bramka odpowiada na pytanie węższe niż
to, które deklaruje.**

**FAKT O ŚLADZIE PLIKOWYM, KTÓRY UNIEWAŻNIA NAIWNE PORÓWNANIA PRZEBIEGÓW:**
WooCommerce nadpisuje log dzienny **tą samą nazwą**
(`wc-logs/transactional-emails-<data>-<hash>.log`), więc **dwa przeloty
zostawiły JEDEN plik** i licznik `media` urósł o **+1, nie ×2**. Kto porównuje
przebiegi po tym liczniku, dostanie fałszywe „bez zmian". Oba ślady sprzątnął
orkiestrator jawną ścieżką.

**ODSTĘPSTWO OD PROTOKOŁU, ŚWIADOME:** po SKUT **nie zdjęto zrzutu
`f1-SKUT-po`** — środowisko było już dwukrotnie przywrócone na żądanie roli
w trakcie jej pracy, więc zrzut „po dziale" uchwyciłby stan bazowy, nie stan po
pracy, czyli **udawałby dowód, którym nie jest**. Stan zamknięcia potwierdzony
kontrolą: `--sprawdz --fala=1` **kod 0**.

**Kopia bezpieczeństwa zrzutu bazowego, zrobiona przed rolą WDR:**
`~/.cache/aai-kopie/f1-baza-KOPIA-PRZED-WDR.sql` (+ `.json`). WDR jej nie
potrzebował — **nie wykonał `podman-compose down && ./postaw.sh`**, tylko
zbudował izolowany stos (`wdr-scratch-*`, port 8899) i skasował go do zera
(zweryfikowane: zero kontenerów, wolumenów i sieci, port głuchy).

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
| **E7.5** | generat → **restart sesji** → strażnik i mutacje | ✅ **ZROBIONE** — restart sesji 2026-09-02 zdjął blokadę, harness widzi 42 definicje `rea-*` |
| **E7.6** | **próba na sucho jednej roli re-audytu** (zgoda właściciela 2026-09-01) | ✅ **ZROBIONE 2026-09-02**: `rea-sec` → `REA-SEC-001` → krytyk PRZEPUSZCZAM → WALID ISTNIEJE → **ZWERYFIKOWANE**; patrz „Próba E7.6" niżej |

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

### CO BLOKOWAŁO E7.6 — RESTART SESJI (zapis historyczny, blokada zdjęta 2026-09-02)

**Harness wczytuje rejestr agentów projektu przy starcie procesu**, więc
42 definicje `rea-*` powstałe w tej sesji są dla niej NIEWIDZIALNE. Sprawdzone:
lista dostępnych typów agentów niesie wyłącznie `aud-*`. To ta sama blokada,
która w E6 kosztowała pół sesji śledztwa, zanim restart okazał się całą
naprawą — i była zapisana w tym pliku jako lekcja DOTYCZĄCA E7 WPROST.

**Próby na sucho (E7.6) nie da się więc wykonać w tej sesji.** Po restarcie
`rea-*` będą widoczne i próba przejedzie tę samą ścieżkę co w E6, tylko
metodą re-audytu (uruchomienie, nie lektura).

---

### PRZYGOTOWANIE PRÓBY E7.6 — CZTERY USTERKI PRZED PIERWSZYM AGENTEM (2026-09-02)

Po restarcie sesji harness widział komplet 42 definicji `rea-*` — blokada z E7.5
zniknęła bez zmiany w plikach, tak jak w E6. Zanim wystartował pierwszy agent,
samo przygotowanie próby wskazało cztery usterki, **wszystkie tej samej rodziny
co w E6: wyglądały na pracę wykonaną, a żadna z 55 mutacji ich nie widziała.**

1. **Generat `rea-walid` szedł na SONNECIE**, choć `re-audyt/ROLE.md` przypisuje
   WALID Opusa (D8) — dwa razy: w nagłówku roli i w podsumowaniu. Generator
   trzymał WŁASNĄ listę ról opusowych wpisaną ręcznie przy E4 (`KIER`, `GOLD`,
   `KON`, `WER`, `RAP`) i nikt jej nie rozszerzył o czwartą rolę procesową
   re-audytu. Reguła 4 tego nie widziała: porównuje sha256 ŹRÓDŁA (`AGENT.md`),
   a model w źródle nie stoi. Weryfikator re-audytu — rola, która rozstrzyga,
   czy zjawisko istnieje — pracowałby na innym modelu, niż rozstrzygnął
   właściciel, bez jednego objawu. Zmierzone: 42 generaty, jeden niezgodny.
   **Model czyta się odtąd z nagłówka roli w `ROLE.md`** (`modelRoli()` we
   `wspolne.mjs`); pilnuje **reguła 21** strażnika — pyta o wiersz `model:`
   w pliku, który czyta harness, nie o listę w generatorze.
2. **21 z 21 `KRYTYK.md` re-audytu wskazywało w module wpisy AUDYTU**
   (`audyt/zgloszenia/AUD-<KOD>-*.json`). Krytyk Pogłębiacza SEC otworzyłby
   wpisy działu SEC audytu, a wpisy `REA-SEC-*` nie miałyby krytyka — oba
   sektory dzielą katalog i kody działów, więc nic by się nie zapaliło.
   Usterka przyszła z szablonu `audyt/szablony/KRYTYK.md`, w którym prefiks
   stał na sztywno; szablon ma odtąd `<PREFIKS>`, a pilnuje **reguła 22** —
   pyta o ścieżkę `zgloszenia/<cudzy prefiks>-<własny kod>-`, nie o obecność
   napisu `AUD-` (wzmianka o wpisie drugiego sektora jest dozwolona: łączenie
   po haszu; kontrprzykład w audycie mutacyjnym).
3. **`STRUKTURA.md` mówi, że do gita wchodzą WYŁĄCZNIE `zgloszenia/`**, a cztery
   pliki `audyt/stan/` i `audyt/migawki/` były śledzone od E6. Doszedł
   `audyt/.gitignore`, pliki zdjęte z indeksu.
4. **`migawka-wartosci.mjs` miał niezmiennik w STAREJ postaci** (jedno
   wykluczenie) w trzech miejscach: skrót drzewa produktu wliczał 86 plików
   `re-audyt/` (1005 zamiast 919), pole „diff wobec main poza audytem"
   pokazywało **86**, a pole niezacommitowanych liczyło generat `.claude/`.
   Wpis z E7.1 o „dziewięciu miejscach" tego pliku nie obejmował — wyszło przy
   pierwszym `--zapisz=przed` na gałęzi re-audytu. Po poprawce: 919, 0, 0 —
   te same liczby co przy E6.

**Dowody po naprawach:** strażnik **20 → 22 kontrole**, kod 0; audyt mutacyjny
**55 → 60** (0 przeoczonych, 0 martwych) — pięć nowych mutacji: lista opusowa
w generatorze, `ROLE.md` zmieniony BEZ regeneracji (sha256 tego nie widzi),
kontrprzykład odstępów w nagłówku roli, prefiks cudzego sektora w szablonie,
kontrprzykład wzmianki o wpisie drugiego sektora; niezmiennik 0; migawka
„przed" 919 plików / 0 / 0.

---

### PRÓBA E7.6 — ŚCIEŻKA RE-AUDYTU PRZEJECHANA DO KOŃCA (2026-09-02)

```
rea-sec (Sonnet)         NIE ROZPOCZĘTO → W TRAKCIE, zakres = 113 plików (policzone)
  SEC-R1…R4              BEZ MATERIAŁU — w obszarze SEC nie ma ani jednego wpisu
                         audytu; zapisane jako niedomknięte, NIE odhaczone po pustce
  SEC-R6                 6 wejść zmierzonych ŻĄDANIEM na :8892 → REA-SEC-001
                         (kolektor raportów CSP zapisuje treść gościa do opcji WP)
                         DO WERYFIKACJI
rea-sec-krytyk (Opus)    → PRZEPUSZCZAM (zjawisko odtworzone własnym żądaniem)
                         + WŁASNE zgłoszenie REA-SEC-002 (usterka checklisty SEC-R6)
rea-walid (Opus)         → ISTNIEJE: R1–R6 tak, zasięg podany 2 × zmierzony 2,
                         hash przeliczony z pliku, dowód powtórzony trzykrotnie
                         ZWERYFIKOWANE
```

**Sektor zadziałał metodą RE-AUDYTU, nie audytu** — i to jest dowód, którego E6
nie dawało: dowód był URUCHOMIENIOWY (żądanie + stan danych przed i po), zasięg
POLICZONY (dwa publiczne wejścia `nopriv` w całym zakresie SEC, drugie odmawia
zapisu podpisem), a weryfikator sprawdził nie tylko, czy zjawisko jest, ale czy
liczby się zgadzają. Wpis przeszedł za pierwszym razem przez bramkę
i przez OBA werdykty; oba wpisy noszą znacznik `proba: E7` i zostają
w repozytorium (rozstrzygnięcie właściciela z E6). **Pozycja 7 definicji
ukończenia jest spełniona także dla re-audytu.**

**Co znalazła próba O PRODUKCIE (jedno znalezisko, do decyzji przy naprawie po
dwóch cyklach — sektory nie naprawiają, a to była próba):** publiczny kolektor
raportów CSP w mu-pluginie obwodu (`aai-obwod.php:169`) przyjmuje POST od
gościa bez nonce'a i bez podpisu i dopisuje klucz do opcji
`aai_obwod_csp_raport`; barierami są limit 60/min na adres, sufit 8 KB ciała
i 200 rodzajów w agregacie, a opcja nie ma dziś czytelnika. WALID dołożył
pomiar, którego autor nie zrobił: **wpływ jest ZANIŻONY** — sufit 200 znaków
dotyczy tylko `blocked-uri`, a `violated-directive` sufitu nie ma (klucz 318
znaków zapisał się bez przeszkód). Uczciwie o drugiej stronie: `report-uri`
z definicji przyjmuje raporty od przeglądarki bez uwierzytelnienia, więc
podpis jak w beaconie nie jest tu możliwy — pytanie do naprawy brzmi
o sufit na dyrektywę i o to, czy agregat bez czytelnika w ogóle ma istnieć.

**Co próba znalazła O SEKTORZE — pięć rzeczy, dwie naprawione od razu:**

1. **REA-SEC-002 (krytyk): kolumna „Dowód" pozycji SEC-R6 żądała „adres + kod
   odpowiedzi", a kod nie rozstrzyga** — kolektor CSP i beacon odpowiadają
   `204` zarówno na przyjęcie, jak i na odrzut (`status_header( 204 ); exit;`
   POZA gałęziami). Pogłębiacz trzymający się przepisanego dowodu zamknąłby
   R6 na „204 = odmowa", czyli ODWROTNIE do prawdy; REA-SEC-001 powstało
   wyłącznie dlatego, że agent wyszedł poza kolumnę i zmierzył opcję przed
   i po. Ta sama klasa co PIK-08 z E6, groźniejsza, bo wartość nie jest pusta.
   **NAPRAWIONE** w `re-audyt/ROLE.md` i `role/SEC/AGENT.md` (kolumna wymaga
   stanu danych przed i po). Wpis zostaje jako dowód, bez werdyktów — to
   usterka budowy, rozstrzygnięta budową.
2. **Pogłębiacz zostawił własny ślad w cudzych danych i zameldował „nic nie
   zmieniłem w bazie".** Klucz `przyklad-atakujacy.test` został w opcji
   właściciela; krytyk dołożył swój, WALID po sobie posprzątał kluczem po
   kluczu. Krytyk słusznie NIE zgłosił tego pod SEC — `GRANICE.md` przypisuje
   to `SKUT-R4`. **NAPRAWIONE w definicjach 14 Pogłębiaczy** („Pomiar nie
   zostawia śladu": stan przed i po, sprzątanie własnych śladów, liczenie
   WŁASNYCH śladów, nie sumy). Dwa ślady sektora usunięte ręcznie jawną
   listą kluczy (`wp option patch delete`), nigdy nadpisaniem opcji; cztery
   klucze zastane nietknięte co do wartości.
3. **Raport agenta przypisał cudzą zmianę narzędziu** („`PLAN-BUDOWY.md`
   zaktualizowane przez `status.mjs`") — żadne narzędzie sektora tego pliku
   nie pisze, zmiana była ręczna i wcześniejsza. Złapał to krytyk grepem.
   Klasa: twierdzenie o pochodzeniu bez pomiaru. Bez naprawy w regułach —
   od tego jest krytyk i zadziałał.
4. **Pomiar równoległy zanieczyszcza licznik.** WALID zmierzył przyrost +2
   przy własnym jednym żądaniu, bo w tej samej minucie pisał krytyk. Liczył
   własne ślady, więc nie przypisał sobie cudzego zapisu — ale to ta sama
   pułapka co przy T2 (pomiar równoległy z własną pracą przypisuje jej skutki
   mierzonemu). W prawdziwym przebiegu krytyk i weryfikator na jednym zasobie
   idą RÓWNOLEGLE z założenia (kolejności nie wymuszamy), więc zasada „licz
   własne ślady" weszła do definicji Pogłębiaczy razem z punktem 2.
5. **Próba weszła do działu, z którego audyt nie wyszedł** — celowo, jako
   próba ścieżki, i jest to złamanie §17 nazwane, nie przemilczane. WALID
   odnotował fakt bez werdyktu: `status.mjs --pokaz` nie ma wpisu
   `audyt f1 SEC`. W prawdziwym przebiegu zatrzymuje to `KIER-R1`; w próbie
   kierownik nie pracował.

**Migawka i środowisko:** `migawka-wartosci.mjs` przed i po **identyczne**
(919 plików produktu, 0 / 0); liczniki `:8892` przed i po co do wiersza
(wizyty 17 / max id 145, logowania 21 / 266, posty 314, konta 2, dostawy 0,
kursy 2, lekcje 73); dane właściciela z T4 nietknięte; opcja CSP wróciła do
czterech zastanych kluczy. Żaden agent nie logował się ani nie dotykał kasy.

**Koszt — zmierzony:**

| Agent | Tokeny | Wywołania narzędzi | Czas |
|---|---|---|---|
| `rea-sec` (Sonnet, 6 pozycji, zatrzymany po pierwszym zgłoszeniu) | **232 tys.** | 50 | 6,8 min |
| `rea-sec-krytyk` (Opus, jedno zgłoszenie + własne) | **198 tys.** | 36 | 7,9 min |
| `rea-walid` (Opus, 6 pozycji na jednym wpisie) | **203 tys.** | 44 | 9,7 min |

**Razem ~633 tys. tokenów za jedno znalezisko przeprowadzone przez ścieżkę**
— o ~22% więcej niż w E6 (518 tys.), bo metoda re-audytu uruchamia i liczy,
a nie czyta. Szacunek dla E8 z E6 (rząd 25 mln na komplet) rośnie
proporcjonalnie dla połowy uruchomień.

**Czego próba NIE obejmowała — żeby nikt nie uznał re-audytu SEC za wykonany:**
dział SEC **nie jest zre-audytowany** (R1–R5 bez materiału, bo audyt nie
pracował; R6 bez prototypu, `:3001` nie stał); ról `KIER`, `PSIARZ`, `SKUT`,
`STRAZ`, `RAP`, `KON` nie uruchomiono — próba przejechała ścieżkę
Pogłębiacz → krytyk → WALID, tę samą co w E6, tylko metodą re-audytu;
`REA-SEC-002` nie przeszło ścieżki (usterka sektora rozstrzygnięta budową).
`polacz-sektory.mjs --fala=1` i `porownaj-cykle.mjs` mówią wprost, ile wpisów
próbnych pominęły.

**Dowody na koniec E7.6:** strażnik **22 kontrole**, kod 0; audyt mutacyjny
**60** (0 przeoczonych, 0 martwych); niezmiennik 0; generat 80/80 zgodny
z modelami z `ROLE.md`; `status.mjs --pokaz` kod 0 (SEC i WALID
`ZAKOŃCZONE`, runda 1, SEC z sześcioma niedomkniętymi jawnie).

**NASTĘPNY KROK: akceptacja E7 przez właściciela**, potem **E8 = STOP** —
uruchomienie audytu wymaga jego osobnego zielonego światła (D10) i osobnej
zgody na koszt (rząd dwudziestu kilku milionów tokenów, nie mieści się
w jednej sesji ani w jednym dniu).

---

### POLECENIA WŁAŚCICIELA PO E7.6 (2026-09-02) — DO WYKONANIA PRZED E8

Zapisane w sweepie przed `/clear`, dosłownie wg właściciela, **jeszcze
niewykonane**. Kolejność jest jego: najpierw 1, potem 2, potem 3, dopiero
potem rozmowa o E8. **E7 nie został przy tym zaakceptowany wprost** —
właściciel przeszedł do przygotowań przed uruchomieniem; akceptację E7
potwierdzić przy okazji, nie zakładać.

1. ✅ **WYKONANE** (patrz „Polecenie 1 — wykonane" niżej). **Zmiana modeli na czterech agentach, „przed puszczeniem obu sektorów":**
   kierownik audytu (`aud-kier`), kierownik re-audytu (`rea-kier`) oraz
   **Konrad w obu sektorach** (`aud-kon`, `rea-kon`) — na **Fable 5.1**
   (`claude-fable-5-1`). Właściciel doprecyzował, że **Konradów ma być
   dwóch: jeden w audycie i jeden w re-audycie** — tak już jest (rola `KON`
   w obu `ROLE.md`), więc to potwierdzenie stanu, nie zmiana. Krytycy tych
   ról zostają na Opusie (D3 nie zmienione). Wykonanie: to zmiana D8
   w obu `ROLE.md` (nagłówki `· **Fable 5.1**` i podsumowania modeli),
   generator czyta model z nagłówka roli (`modeleZRoleMd`), więc trzeba
   rozszerzyć wzorzec o `Fable` i odwzorować na wartość frontmatteru
   (`model: fable` — sprawdzić przy wykonaniu, że harness ją przyjmuje;
   `Agent` zna `fable` w wyborze modelu), reguła 21 pilnuje zgodności
   generatu; kontrprzykład i mutacja na trzeci model do audytu mutacyjnego;
   `audyt/ROLE.md` „Model Opus | 5 ról procesowych" i `re-audyt/ROLE.md`
   „Modele wg D8" poprawić. **Po regeneracji definicji zrestartować sesję**,
   zanim któregoś z tych czterech się wywoła (lekcja E6/E7.5).
2. ✅ **WYKONANE** (patrz niżej). **Weryfikacja CAŁEGO planu sprzed budowy** — czy wszystko jest zrobione:
   `~/.claude/plans/projekt-pod-strona-szkolenia-stateless-wilkinson.md`
   (438 linii, wersja 4 zatwierdzona 2026-09-01) punkt po punkcie wobec stanu
   repo, plus ten plik (definicja ukończenia, 11 pozycji), `REGULAMIN.md`
   (16 punktów właściciela + rozstrzygnięcia D/P/W/K) i pomiary z E1–E7.
   Wynik ma być tabelą „pozycja → zrobione / brak → dowód komendą", nie
   deklaracją.
3. ✅ **WYKONANE, po własnej bramce** (patrz niżej). **Krytyka planu i realizacji okiem krytyka** — właściciel: „chcemy
   doprowadzić ten projekt audytowy do perfekcji, żeby znalazł KAŻDY możliwy
   błąd w projekcie". Ma powstać ocena: co zrobić lepiej, jakie braki widać,
   jakie ulepszenia sektorów; podzielić się wiedzą zdobytą przy budowie
   i propozycją rozwiązań. Materiał do tej krytyki, zebrany po drodze
   (nie wyprowadzać od nowa): koszt ~633 tys. tokenów na jedno znalezisko
   i rząd 25+ mln na komplet; Pogłębiacze bez materiału, dopóki audyt nie
   dostarczy zgłoszeń (R1–R5 zależą od cudzego wyniku); ról `KIER`, `PSIARZ`,
   `SKUT`, `STRAZ`, `RAP`, `KON` nie uruchomiono w żadnej próbie; ścieżka
   odrzuceń `zgloszenie.mjs` nigdy nie przeszła w żywym przebiegu;
   `porownaj-cykle.mjs` nie ma jeszcze dwóch fal do porównania; brief
   zamiast `CLAUDE.md` jako jedyne wejście wiedzy; agent bez `Write` może
   pisać przez `Bash` (K3); pomiar równoległy zanieczyszcza liczniki;
   prototyp `:3001` nie stoi w czasie re-audytu; `polacz-sektory.mjs` łączy
   wyłącznie po haszu miejsca (to samo miejsce opisane inną linią się nie
   połączy); dwie próby dały dwa znaleziska o SEKTORZE na jedno o produkcie.

#### POLECENIE 1 — WYKONANE 2026-09-02

Cztery generaty mają `model: fable` (`aud-kier`, `rea-kier`, `aud-kon`, `rea-kon`);
**45** na Opusie (40 krytyków + GOLD, WER, RAP, RAP re-audytu, WALID), **31** na
Sonnecie — razem 80, policzone `grep -l "^model:" .claude/agents/*.md`. Zmieniło się
więcej niż nagłówki, bo wykonanie odsłoniło ślepotę bramki:

- `wspolne.mjs`: tabela `MODELE_ROL` (Opus / Sonnet / Fable 5.1 → alias harnessu);
  nagłówek z NIEZNANYM modelem **rzuca błąd** zamiast spadać po cichu na Sonneta;
- **reguła 21 czyta nagłówki `ROLE.md` WŁASNYM odczytem, nie `modelRoli()`** —
  zmierzone przy wykonaniu: regresja tabeli w `wspolne.mjs` (Fable → sonnet) po
  regeneracji dawała generat ZGODNY z pomiarem i zieloną bramkę, bo pomiar pytał
  tę samą funkcję, która produkuje generat. Reguła odrzuca też alias nieznany
  harnessowi (`opus`/`sonnet`/`haiku`/`fable`);
- audyt mutacyjny **60 → 66**, potem **68** po przeoczeniu sędziego z krytyki (rola
  procesowa BEZ znacznika też spadała po cichu na Sonneta — zamknięte tak samo)
  (0 przeoczonych, 0 martwych): regresja tabeli
  z regeneracją, `ROLE.md` cofa KIER na Opusa bez regeneracji, nieznany model
  „Fable 5.2", alias-literówka `fable-5.1` w generatorze, to samo dla `rea-kon`
  (`wymaga`), kontrprzykład „zmiana nazwy roli nie zapala reguły";
- `ROLE.md` obu sektorów (nagłówki + podsumowania), `REGULAMIN.md` D8, diagram
  w tym pliku, `AGENT.md` KIER i KON audytu („Pracujesz na Fable 5.1").

**Alias `fable` we frontmatterze:** binarka harnessu 2.1.257 zna go
(`e==="fable"||e==="fable[1m]"`, grep po pliku wykonywalnym), to samo, co lista
modeli narzędzia `Agent`; dokumentacja harnessu (code.claude.com/docs/en/sub-agents
i model-config) wymienia `fable` jako alias pola `model:` subagenta (sprawdzone
agentem `claude-code-guide`). Czego dokumentacja NIE mówi: co harness robi
z wartością nieznaną — dlatego reguła 21 odrzuca alias spoza listy.
**Potwierdzenie uruchomieniowe wymaga RESTARTU SESJI** (rejestr agentów czytany
przy starcie procesu — lekcja E6/E7.5): po restarcie wywołać `aud-kier` z prompem
„podaj nazwę modelu z własnego promptu systemowego, nic więcej" — oczekiwane
„Fable 5.1". **Do tego czasu czterech agentów NIE wywoływać.** Krytycy tych ról
zostają na Opusie (D3 bez zmian).

#### POLECENIE 2 — WYKONANE 2026-09-02

Wynik: **[`WERYFIKACJA-PLANU.md`](WERYFIKACJA-PLANU.md)** — 123 pozycje planu
(fakty, decyzje D/P/W/K′, struktura i zakresy 14 działów, przebieg, zgłoszenie,
nośnik, dokumentacja, kod, etapy, definicja ukończenia, krytyka planu, koszt),
każda z komendą i wynikiem: **106 ✅, 15 ⚠️ (inaczej niż w planie, z powodem
zapisanym przy pozycji), 2 ❌** plus trzeci brak liczony jako częściowy:
(1) ślepota fali 2 tylko w prompcie kierownika; (2) „dziennik wejść" z KIER-05
nie istnieje; (3) pozycja 8 definicji ukończenia (test negatywny każdej
kontroli) nie jest artefaktem — mutacje nazywają wprost 11 z 22 reguł.
Pozycja 11 potwierdzona lokalnie: `npm run check` kod 0 (39 strażników,
83/83 testów), CI na `main` success 2026-09-01.

#### POLECENIE 3 — WYKONANE 2026-09-02, PO WŁASNEJ BRAMCE

Wynik: **[`KRYTYKA-BUDOWY.md`](KRYTYKA-BUDOWY.md)** — 21 znalezisk w trzech
klasach (A: audyt nie znajdzie każdego błędu; B: wynik niewiarygodny wobec K4′;
C: przebieg nie dojedzie), 20 propozycji z kosztem i oznaczeniem, które ruszają
rozstrzygnięcia właściciela (7, 10, 18), sekcja wiedzy z budowy.
**Pierwszą wersję ocenił niezależny krytyk** (agent `sedzia`, domyślnie
odrzucający, 56 pomiarów): 9 potwierdzonych, 7 osłabionych, 1 obalone, sześć
kolizji propozycji, pięć przeoczeń — BLOKUJĘ. Wszystko naniesione; obalone
(B6) wycofane; przeoczenia weszły jako B8–B12. **Najważniejsze znalezisko całej
krytyki pochodzi od sędziego (B8):** `hashMiejsca()` liczy NUMER LINII, więc
dwie fale opisujące ten sam błąd pod przesuniętą linią dostaną różne hashe,
a `porownaj-cykle.mjs` ogłosi defekt audytu przy identycznym znalezisku — to
uderza w K4′ i W4 naraz i jest pozycją nr 1 listy propozycji.
**B12 zamknięte od razu kodem** (mieści się w poleceniu 1): rola procesowa bez
znacznika modelu spadała po cichu na Sonneta; `wspolne.mjs` i reguła 21 rzucają
błąd, mutacja + kontrprzykład (dział bez znacznika zostaje na Sonnecie, D8);
audyt mutacyjny **66 → 68**.

**Lekcja tej sesji (E10 krytyki):** krytyka bez własnego krytyka miała
1 znalezisko obalone i 7 osłabionych na 17 — zasada pary (WYTYCZNE N1) dotyczy
także krytyki sektora.

**STAN PO TRZECH POLECENIACH — co dalej:** (a) **restart sesji** i test
uruchomieniowy aliasu `fable` na `aud-kier` (polecenie 1); (b) decyzje
właściciela nad tabelą F krytyki — w szczególności pozycje 1–4, 6, 8
(wiarygodność wyniku) i 7, 10, 18 (ruszają K4′/K9′); (c) akceptacja E7 wprost;
(d) dopiero potem E8 = STOP i zielone światło na uruchomienie.

### SZEŚĆ ROZSTRZYGNIĘĆ WŁAŚCICIELA PO KRYTYCE (2026-09-02) — PAKIET PRZED E8

Odpowiedź właściciela na sześć spraw z `KRYTYKA-BUDOWY.md` (tabela F):

1. **K4″ — powtarzalność nie jest celem budowy** (pełny cytat: `REGULAMIN.md` §15).
   Agenci mają znaleźć WSZYSTKO; zgodność fal ma być skutkiem, nie ograniczeniem.
   Checklista = minimum, po niej agent szuka dalej w zakresie (pozycja otwarta
   `<KOD>-90` w każdym dziale). Zdania „swobodny przegląd nie da tego samego wyniku
   (K4′)" w szablonach i definicjach ról (82 pliki wspominają K4′, 20 — „swobodny
   przegląd") są do przepisania.
2. **Raporty obu fal — do lektury właściciela.** `porownaj-cykle.mjs` NAZYWA wynik
   (zgodne / nadzbiór / sprzeczne), nie zatrzymuje, nie ogłasza „defektu audytu".
3. **Re-audyt na środowisku sekwencyjnie** (zawężenie K9′ — właściciel: „tak"),
   przywracanie stanu ze zrzutu między działami, nie `postaw.sh`.
4. **Hash miejsca bez numeru linii** — zgoda (F1).
5. **Pakiet wiarygodności F2, F3, F4, F6, F8** — zgoda.
6. **E7 ZAAKCEPTOWANY** („akceptuję E7"); restart sesji robi właściciel.

**PAKIET ROBOCZY „E7.7" — do wykonania przed E8, w tej kolejności** (każda pozycja
osobnym commitem, z mutacją/testem negatywnym, po niej trzy kontrole sektora):

| # | Pozycja | Stan |
|---|---|---|
| 1 | hash miejsca bez numeru linii | ✅ **2026-09-02** — reguła 23 (hash zgodny z miejscem), pary kandydatów w `polacz-sektory`, przy okazji **reguła 24** (szablon goldena też jest miarą); mutacje 68 → 73 |
| 2 | `porownaj-cykle.mjs`: zgodne / nadzbiór / sprzeczne, stan pochodny werdyktów, `--dzial=`, bez STOP-u | ✅ **2026-09-02** — po dyskusji i trzech odpowiedziach właściciela (kod 0 przy SPRZECZNE; NADZBIÓR nazywa falę i liczbę; wpisy `-90` porównywane tak samo); **reguła 25** strażnika (samokontrola narzędzia na atrapach dwóch fal), mutacje 73 → 79; szczegóły w sekcji „POZYCJA 2 — ZROBIONA" niżej |
| 3 | `status.mjs`: znaczniki czasu, fala ∈ {1,2}, odmowa re-audytu przed `ZAKOŃCZONE` audytu (poza rolami procesowymi re-audytu), drzewo wobec `glowa_main`; reguła 17 | ✅ **2026-09-02** — po zielonym świetle właściciela („Tak, jedź"): historia przejść w pliku stanu, cztery odmowy z komendą naprawy, `status.mjs --test` (36 przypadków), **reguła 26**, reguła 17 na zawartości; mutacje 79 → **101**; szczegóły w sekcji „POZYCJA 3 — ZROBIONA" niżej |
| 4 | zakaz czytania wyników fali 1 w szablonach + reguła + mutacja; numeracja zgłoszeń per fala | **4a ✅ 2026-09-02** — ID `AUD-SEC-F2-001` (pula per fala), `zgloszenie.mjs` bez licznika, `status.mjs` odmowa 5 (izolacja fali 2 po POLU), `porownaj-cykle` PODEJRZENIE KOLEJNOŚCI (kod 0), **`fala.mjs --postaw=2 \| --scal=2`** (worktree + sparse checkout), `stan/` i `migawki/` w gicie, reguły 19′/28/29 (**27 zarezerwowana**), R5 „z audytu tej fali", STRUKTURA i KIER obu sektorów; mutacje 101 → **116**; szczegóły w sekcji „POZYCJA 4a — ZROBIONA" niżej. **4b ✅ 2026-09-02 (noc)** razem z pozycją 6 — zdanie zakazu w 80 definicjach + 2 szablonach, reguły 27/27b, mutacje 116 → 126 (sekcja „POZYCJE 4b + 6 — ZROBIONE" niżej) |
| 5 | macierz reguła → mutacja w audycie mutacyjnym (`wymaga` dla reguł warunkowych) | ✅ **2026-09-03** — `R<nr>:` w każdym komunikacie strażnika, tablica `REGULY` + samokontrola + `--reguly`, `regula:` w 131 mutacjach, werdykt „ZŁA REGUŁA" (zgodność ŚCISŁA), macierz na wyjściu audytu z kodem 1; mutacje 126 → **131**; dwa pełne audyty (pomiar → dowód); sekcja „POZYCJA 5 — ZROBIONA" niżej |
| 6 | K4″ w szablonach i 40 definicjach ról: lista = minimum, pozycja otwarta `<KOD>-90`, regeneracja generatu | ✅ **2026-09-02 (noc)** razem z 4b, po rekomendacjach (odpowiedzi właściciela nie były zapisane — założenia do potwierdzenia w sekcji „POZYCJE 4b + 6 — ZROBIONE"); zdanie MINIMUM 40/40, `<KOD>-90` w 28 rolach działowych, rozszerzenie reguły 7 |
| 7 | re-audyt sekwencyjnie: zapis w `STRUKTURA.md`/KIER, `KIER-00` „co musi stać", migawka z licznikami tabel WP, przywracanie ze zrzutu | 🚧 **projekt ZAAKCEPTOWANY 2026-09-03** („potwierdzam rekomendacje" — sześć rozstrzygnięć w sekcji „POZYCJA 7 — PROJEKT ZAAKCEPTOWANY" niżej), **kod po `/clear`** |
| 8 | test aliasu `fable` po restarcie sesji (`aud-kier`: nazwa modelu) | ✅ **2026-09-02, po restarcie:** `aud-kier` zameldował dosłownie „You are powered by the model named Fable 5.1. The exact model ID is claude-fable-5-1". **Koszt faktu:** wywołanie bez ani jednego narzędzia = **142 tys. tokenów** — tyle waży samo wejście roli (definicja + kontekst); przy 80 agentach × 2 fale to ~23 mln tokenów SAMYCH wejść, zanim ktokolwiek otworzy plik |

Poza pakietem, do osobnej zgody na koszt: próba sucha kierownika (F17, ~1 mln
tokenów). Pozostałe propozycje tabeli F (A2–A5, C1, C5, F9, F19, F20) — po pakiecie,
wg uznania właściciela.

**NASTĘPNY KROK: po `/clear` od razu KOD pozycji 7** wg sekcji „POZYCJA 7 — PROJEKT ZAAKCEPTOWANY" (sześć rozstrzygnięć = rekomendacje, bez ponownego pytania o zgodę), sześć kroków tej sekcji (narzędzie `srodowisko.mjs`, migawka z licznikami, `KIER-00`, odmowa 6 w `status.mjs`, reguły 30/31 + mutacje, STRUKTURA/KIER). Dopiero potem E8 (STOP, zielone światło właściciela na przebieg). Zapis historyczny: pozycja 5 WYKONANA 2026-09-03 (sekcja „POZYCJA 5 — ZROBIONA"; cztery kroki projektu co do punktu, dwa pełne audyty: pierwszy = pomiar deklaracji z ośmioma rozjazdami, drugi = dowód 131/0/0, macierz 30/30). **Założenia 4b + 6** (pięć rekomendacji) nie dostały osobnego potwierdzenia, ale właściciel przy akceptacji pozycji 5 nie zgłosił do nich sprzeciwu — zostają, dopóki nie powie inaczej. Przy okazji właściciel potwierdza (albo zmienia) pięć założeń z sekcji „POZYCJE 4b + 6 — ZROBIONE" — kod 4b + 6 poszedł po rekomendacjach, bo jego odpowiedzi nie były zapisane. Zapis historyczny: 4b + 6 WYKONANE 2026-09-02 w nocy jednym przejściem (szablony → skrypt po 80 definicjach → `ROLE.md` obu sektorów → reguły 27/27b i rozszerzenie 7 → mutacje → generat → trzy kontrole → przeniesienie `audyt/` na gałąź audytu). Zapis historyczny: 4a WYKONANA 2026-09-02 (sekcja „POZYCJA 4a — ZROBIONA"). Lekcja z pozycji 3 obowiązuje dalej: **nie edytować `audyt/` w trakcie audytu mutacyjnego** i sprawdzać `pgrep -f audyt-straznika`, zanim uruchomi się cokolwiek w `audyt/tools/`.
### WYKONALNOŚĆ DWÓCH FAL NA PLANIE MAX (2026-09-02) — pytanie właściciela

Sprawdzone przez subagenta Marka na dokumentacji Anthropic (support.claude.com,
platform.claude.com), 25 wywołań narzędzi; każda liczba ma w jego raporcie
źródło. Skrót tego, co jest **udokumentowane**, i tego, czego dokumentacja
**nie podaje**:

| Fakt | Status |
|---|---|
| Okno 5 h liczone od pierwszego promptu; limit tygodniowy „across all models" | udokumentowane |
| Zużycie liczone w TOKENACH ważonych modelem — Opus „several times more per turn than Sonnet" | udokumentowane |
| Subagenci (`Agent`) wliczają się do tego samego limitu; `/usage` flaguje „subagent-heavy sessions" | udokumentowane |
| **Fable 5.1 na Max: wliczony do puli tygodniowej z sufitem 50%**, po nim usage credits | udokumentowane |
| Flagi `fableConsent`/`fableCreditsRequired` w binarce = znany, potwierdzony BUG harnessu (Max błędnie żądał kredytów) | udokumentowane (zgłoszenia #79337, #79341, #79412) |
| Po wyczerpaniu limitu: **usage credits** po stawkach API, sufit 2000 USD/dzień | udokumentowane |
| Ceny API: Sonnet 2/10, Opus 5/25, Fable 10/50 USD za mln (in/out); cache read 0,1× (Fable 0,025×) | udokumentowane |
| Konkretne godziny (Max 5x: 140–280 h Sonnet, 15–35 h Opus / tydzień; 20x: 240–480 / 24–40) | **NIEZWERYFIKOWANE** — z ogłoszenia 08/2025, przez rok limity zmieniały się kilkakrotnie |
| Współczynnik token ↔ „godzina modelu"; mnożnik cache w limicie Max; interakcja sufitu Fable z pułapem Opusa | **dokumentacja nie podaje** |

**Rachunek (założenia jawne):** przy 25–50 mln tokenów na dwie fale i podziale
45 Opus / 31 Sonnet / 4 Fable, 90% wejścia, bez cache — **~143–286 USD po
cenach API**. Sam Opus: 45 ról × 2 fale × ~200 tys. ≈ **18–36 mln tokenów**
Opusa — i to jest wąskie gardło, bo Opus ma w Max osobny, ciaśniejszy pułap.

**Odpowiedź na pytanie właściciela („czy 2 fale wejdą, czy 5 h nas zatrzyma,
czy wracać na Opusa"):**
1. **Okno 5 h NIE zatrzyma dwóch fal — tylko je potnie.** Przebieg i tak nie
   mieści się w jednej sesji; wyniki lądują w plikach po każdym kroku, więc
   przerwa na reset okna jest przerwą, nie stratą. Limit TYGODNIOWY jest
   realnym ograniczeniem.
2. **Powrót KIER/KON z Fable na Opusa POGORSZYŁBY sprawę**, nie poprawił: Fable
   ma na Max osobny sufit (50% puli) i nie konkuruje z pułapem Opusa; te cztery
   role są dziś „poza wąskim gardłem". Na Opusie byłoby 49/80 zamiast 45/80.
3. **Prawdziwa dźwignia to krytycy (40 ról na Opusie).** Zejście krytyków na
   Sonneta spuszcza udział Opusa z 56% do 6% — ale to decyzja MERYTORYCZNA
   (D3, WYTYCZNE N1: krytyk ma być mocniejszy od ocenianego), nie tokenowa.
   **Nie proponuję jej z własnej inicjatywy.**
4. **Awaryjnie: usage credits** — nawet gdyby CAŁE dwie fale trzeba było
   dokupić po API, to rząd 150–300 USD, poniżej dziennego sufitu.
5. **Jedyny wiarygodny pomiar to `/usage` przed i po jednej pełnej ścieżce na
   docelowym koncie** (rola + krytyk + weryfikator; mamy dwie takie próby, ale
   bez odczytu `/usage`). Dokumentacja nie daje współczynnika token↔godzina,
   więc każdy rachunek „ile okien / ile dni" byłby zmyślony.

**Propozycja do decyzji właściciela (nie wykonana):** (a) Fable na KIER/KON
zostaje; (b) przed E8 jeden odczyt `/usage` przed i po próbie suchej kierownika
(F17, i tak potrzebnej) — da realną wagę jednej ścieżki wobec paska Opusa;
(c) E8 planowany jako przebieg **dzielony na tygodnie per dział** (porównanie
per dział — pozycja 2 pakietu), z włączonymi usage credits jako siatką;
(d) decyzja o krytykach na Sonnecie — tylko jeśli pomiar z (b) pokaże, że
Opus nie mieści się nawet w podziale tygodniowym.

**DECYZJA WŁAŚCICIELA (2026-09-02), trzy odpowiedzi:**
- **(a) Fable 5.1 na KIER/KON ZOSTAJE.**
- **(b) Odczyt `/usage` przed i po PRÓBIE SUCHEJ KIEROWNIKA (F17) — TAK.** Właściciel
  odczytuje pasek, agent notuje obie wartości w tym pliku; to jedyny wiarygodny
  pomiar wagi jednej pełnej ścieżki wobec pułapu Opusa. Próba sucha kierownika
  (~1 mln tokenów) wymaga OSOBNEJ zgody na koszt w chwili uruchomienia.
- **(c) Podział E8: wstępnie „jeden ciąg z przerwami"** (przerwy tylko na reset
  okna 5 h), ale **ostateczna decyzja dopiero po pomiarze (b)** — dosłownie:
  „założyłbym jeden ciąg z przerwami, ale 100% odpowiem, gdy zrobimy pomiar 1b".
  `--dzial=` w `porownaj-cykle.mjs` (pozycja 2) zostaje niezależnie od podziału:
  urwany przebieg i tak ma rozliczać działy domknięte (C1).
- (d) bez zmian — nie proponować krytyków na Sonnecie, dopóki pomiar tego nie wymusi.

#### PAKIET E7.7, POZYCJA 2 — ZROBIONA 2026-09-02 (projekt niżej zaakceptowany po dyskusji; wynik na końcu sekcji)

Polecenie właściciela: **„przed zmianami w kodzie zweryfikujmy wszystko
i przedyskutujmy"** — obowiązuje dla każdej pozycji pakietu, która dotyka
rozstrzygnięć (tu: K4″ wchodzi wprost do `porownaj-cykle.mjs`).

**Stan dzisiejszy narzędzia (zmierzony lekturą, nie z pamięci):**
- porównuje zbiory hashy fali 1 i 2; jakakolwiek różnica → komunikat
  „ROZJAZD FAL = DEFEKT AUDYTU (K4′)", kod wyjścia 1;
- nie patrzy na werdykty: wpis POTWIERDZONY w fali 1 i ODRZUCONY w fali 2
  wyjdą „zgodne" (ten sam hash);
- nie ma `--dzial=`; porównuje cały sektor naraz;
- „identyczny opis co do słowa" → podejrzenie kopiowania, kod 1 (to zostaje —
  to jest ślepota fali 2, nie K4′);
- **trzy inne miejsca powtarzają stare brzmienie:** `RAP-R4` w `re-audyt/role/RAP/AGENT.md:151`
  („czy rozjazd fal jest opisany jako DEFEKT audytu"), `KIER` (`audyt/role/KIER/AGENT.md:124, 211`)
  i `STRUKTURA.md:32` („test powtarzalności (K4′)"); `REGULAMIN.md:330` i `:546`
  („jeżeli wyniki są zgodne → naprawa") to oryginalny tekst właściciela — zostaje,
  K4″ go nie unieważnia, tylko dopowiada, co przy NIEzgodności.

**Proponowany kształt (do akceptacji przed kodem):**

1. **Trzy wyniki zamiast dwóch:** ZGODNE (te same hashe, te same stany
   pochodne), NADZBIÓR (różnica jednostronna — jedna fala ma wszystko, co druga,
   plus więcej), SPRZECZNE (obie fale mają wpisy, których druga nie ma, ALBO ten
   sam hash z innym stanem pochodnym). Narzędzie **nazywa**, nie ocenia.
2. **Stan pochodny werdyktów** liczony w locie, nieprzechowywany (nie rusza §6
   ani `STATUSY`): POTWIERDZONE = krytyk PRZEPUSZCZAM + weryfikator ISTNIEJE;
   ODRZUCONE = oba odmowne; SPORNE = jeden tak, drugi nie; BEZ WERDYKTU = brak
   kompletu. Porównanie idzie po parze (hash, stan pochodny).
3. **Kod wyjścia:** 0 zawsze, gdy obie fale istnieją i nie ma podejrzenia
   kopiowania; **1 tylko przy podejrzeniu kopiowania** (ślepota fali 2) albo
   braku którejś fali. Rozjazd = wynik do lektury, nie STOP. **Pytanie do
   właściciela:** czy tak — czy jednak kod 1 przy SPRZECZNE, żeby kierownik nie
   przeszedł dalej bez spojrzenia?
4. **`--dzial=<KOD>`:** porównanie per dział, żeby urwany przebieg rozliczał
   działy domknięte (C1 z krytyki). Bez argumentu — cały sektor, z tabelą per
   dział.
5. **Raport dla właściciela:** narzędzie zapisuje `audyt/wyniki/porownanie-<sektor>.json`
   i drukuje listę: każdy wpis z obu fal, stan pochodny, gdzie się różnią —
   „raporty z dwóch fal mają być dla nas na zapoznanie się".
6. **Zmiany towarzyszące:** `RAP-R4` przepisać („czy rozjazd fal jest NAZWANY
   i przedstawiony właścicielowi z obu stron"), komendy KIER bez zmian (tylko
   opis wyniku), `STRUKTURA.md:32` → „porównanie fal (K4″)", sekcja goldena RAP,
   mutacje: (a) narzędzie przestaje odróżniać nadzbiór od sprzeczności,
   (b) przestaje patrzeć na werdykty, (c) kontrprzykład: rozjazd nie daje kodu 1.
   **Uwaga:** strażnik nie uruchamia `porownaj-cykle.mjs` (wymaga dwóch fal),
   więc mutacje muszą wołać narzędzie na WPISACH-ATRAPACH dwóch fal — to nowy
   wzorzec w audycie mutacyjnym (dziś atrapy są jednofalowe).

**Czego pozycja 2 NIE robi:** nie zmienia `werdykt.mjs`, statusów, ani
`zgloszenie.mjs`; nie dotyka ról poza RAP-R4; nie rusza prób E6/E7.6.

**Pytania otwarte do dyskusji — ROZSTRZYGNIĘTE PRZEZ WŁAŚCICIELA (2026-09-02):**
(a) kod wyjścia przy SPRZECZNE = **0, do lektury** (kod 1 wyłącznie przy podejrzeniu
kopiowania albo braku fali); (b) NADZBIÓR **nazywa falę i liczbę** („fala 2 ma
wszystko, co fala 1, i 3 miejsca ponadto"); (c) wpisy z pozycji otwartej `<KOD>-90`
**porównywane tak samo**, w raporcie tylko oznaczone „(otwarta)". Całość projektu:
„Akceptuję, pisz kod".

**CO POWSTAŁO (wynik pozycji 2):**
- `porownaj-cykle.mjs` przepisany: czyste `porownajFale()`, `stanPochodny()`,
  `kodWyjscia()` + przebieg CLI; trzy wyniki, stan pochodny liczony w locie (nie
  zapisywany — §6 i `STATUSY` nietknięte), porównanie po parze (hash, stan),
  `--dzial=<KOD>`, tabela per dział bez argumentu, raport
  `audyt/wyniki/porownanie-<sektor>[-<DZIAL>].json` + lista każdego wpisu z obu
  stron z nazwaną różnicą; „inny dział" wypisywany osobno jako GRANICA (KIER-04);
  ślepota fali 2 (identyczny opis → kod 1) zostaje.
- **Samokontrola `--test` — 31 przypadków**: czyste funkcje ORAZ przebieg CLI na
  katalogu tymczasowym z atrapami dwóch fal (`--katalog=<dir>`, używany wyłącznie
  przez samokontrolę). To jest nowy wzorzec z projektu („mutacje muszą wołać
  narzędzie na wpisach-atrapach dwóch fal") — atrapy nie dotykają
  `audyt/zgloszenia/`.
- **Reguła 25 strażnika**: `porownaj-cykle.mjs --test` musi przechodzić (bliźniak
  reguł 9 i 15). Strażnik: 24 → **25 kontroli**.
- **Sześć mutacji** (audyt 73 → **79**): nadzbiór nieodróżniany od sprzeczności;
  werdykty ignorowane; powrót kodu 1 przy rozjeździe (K4′); kopiowanie bez kodu 1;
  NADZBIÓR bez nazwania fali; `--dzial=` bez filtra. 0 przeoczonych, 0 martwych.
- Zmiany towarzyszące: RAP-R4 (`re-audyt/ROLE.md` + `RAP/AGENT.md`) → „czy rozjazd
  jest NAZWANY i przedstawiony właścicielowi z obu stron, a nie ogłoszony
  defektem"; `RAP/SKILL.md` krok 4; sekcja KIER „Rozjazd między falami" przepisana
  na K4″ + `--dzial=` w komendach KIER (AGENT i SKILL); `STRUKTURA.md` (drzewo
  narzędzi, schemat kolejności, akapit o wpisie próbnym); `audyt/GRANICE.md`
  i `re-audyt/GRANICE.md` (granica = szum w porównaniu, nie „defekt audytu").
  **Golden RAP nie niósł starego brzmienia** (sprawdzone grepem) — bez zmian.

**DWA ODSTĘPSTWA OD PROJEKTU, oba nazwane:**
1. **Obecność fali NIE wynika z liczby wpisów.** Pierwsza wersja `kodWyjscia()`
   liczyła „brak fali" po zerze wpisów i własna samokontrola to złapała (1 z 30
   padło): dział, który ZAKOŃCZYŁ falę bez znalezisk, ma zero wpisów tak samo jak
   fala, której nie było. Różnicę zna wyłącznie `stan/` — więc `--dzial=` i cały
   sektor pytają o status ZAKOŃCZONE roli, a `kodWyjscia()` dostaje obecność fal
   z zewnątrz. To jest hak pod pozycję 3 (porządek w `status.mjs`).
2. Raport per dział zapisuje się pod `porownanie-<sektor>-<DZIAL>.json`, żeby nie
   nadpisywał raportu całego sektora.

**GOLDENY KONRADÓW ZAPALIŁY SIĘ NATYCHMIAST** — edycja `audyt/GRANICE.md` dodała
dwie linie i zdanie wskazywane przez oba goldeny KON przesunęło się z linii 30 na 32.
Reguła 11 zadziałała tak, jak ma (golden nie gnije po cichu); numer poprawiony,
treść zweryfikowana wobec pliku. Zapamiętać: **każda edycja `GRANICE.md` albo
`REGULAMIN.md` może przesunąć linię goldena** — strażnik to powie, ale dopiero po
edycji.

**ZNALEZISKO PRZY OKAZJI, ŚWIADOMIE NIENAPRAWIONE (dotyczy pozycji 3):** trzy
miejsca twierdzą, że `porownaj-cykle.mjs` „bierze liczbę niedomkniętych pozycji do
porównania fal" — `status.mjs` (komentarz i komunikat), reguła 17 strażnika
(komentarz i komunikat) oraz `STRUKTURA.md` (akapit o `--niedomkniete`). Narzędzie
NIGDY nie czytało `stan/` pod tym kątem, ani przed tą zmianą, ani po niej; od dziś
czyta `stan/` wyłącznie po status ZAKOŃCZONE. Komunikat reguły 17 jest śladem
mutacji, więc zdanie prostujemy razem z pozycją 3, która porządkuje `status.mjs`
i regułę 17 — nie mimochodem.

Dowody pozycji 2: strażnik **25 kontroli**, kod 0; mutacje **79** (0 przeoczonych,
0 martwych); `porownaj-cykle.mjs --test` 31/31; niezmiennik 0; generat 80 definicji
przebudowany.

#### PAKIET E7.7, POZYCJA 4 — PROJEKT DO DYSKUSJI (2026-09-02); 4a WYKONANA (sekcja niżej), 4b czeka na pozycję 6

Pozycja łączy F2 (B1: ślepota fali 2 nie jest zapewniona) i F3 (B9: samo
narzędzie przecieka wynik fali 1) z `KRYTYKA-BUDOWY.md` — oba potwierdzone
przez sędziego, oba w pakiecie wiarygodności, na który właściciel się zgodził.
Stan „dziś" zmierzony (lektura szablonów, 40 definicji, `zgloszenie.mjs`,
`porownaj-cykle.mjs`, `status.mjs`):

| Co | Stan dziś (zmierzony) | Skutek |
|---|---|---|
| zakaz czytania fali 1 | stoi WYŁĄCZNIE w `role/KIER/AGENT.md` (sekcja „Ślepota fali drugiej ma trzy warstwy"); w `szablony/AGENT.md`, `szablony/KRYTYK.md` i w 40 definicjach działów — **0 wystąpień**; każdy agent ma `Read`/`Grep`/`Bash`, a wpisy fali 1 leżą w tym samym drzewie | agent fali 2 otwiera `audyt/zgloszenia/`, przepisuje listę własnymi słowami, sektor ogłasza ZGODNE — także przy zepsutym audycie |
| numeracja zgłoszeń | ciągła w obrębie sektora i działu (`AUD-SEC-001`, `-002`, …), bez fali w nazwie | agent fali 2 po pierwszym zapisie widzi `AUD-SEC-013` i wie, ile fala 1 znalazła w jego dziale — mimo każdego zakazu |
| licznik po zapisie | `zgloszenie.mjs` drukuje „zgłoszeń w sektorze: N" i ostrzeżenie o progu 200 | ten sam przeciek drugą drogą |
| kontrola w `porownaj-cykle.mjs` | tylko stwierdzenie IDENTYCZNE co do słowa przy tym samym miejscu → kod 1 | parafraza przechodzi jako zgodność |
| izolacja fali 2 | brak — fala 2 pracowałaby w tym samym katalogu, z wpisami i stanem fali 1 na dysku | trzy warstwy „ślepoty" z STRUKTURA.md to dziś jedna (czysty kontekst subagenta) |
| R5 Pogłębiaczy | 14 definicji + `re-audyt/ROLE.md` mówią „lista klas **z fali 1**" | w fali 2 Pogłębiacz czytałby dosłownie falę 1 zamiast audytu SWOJEJ fali |

**CO MA POWSTAĆ — cztery warstwy, każda z bramką:**

1. **Zakaz DOSŁOWNIE w definicjach** (szablony `AGENT.md` i `KRYTYK.md` + 40 ról
   + generat): jedno zdanie o stałym brzmieniu, np. „Pracujesz w fali N i **nie
   czytasz wpisów, stanu ani wyników innej fali**: `audyt/zgloszenia/*` z polem
   `fala` ≠ N, `audyt/stan/*-f<inna>-*`, `audyt/wyniki/`", plus powód (K4″: zgodność
   fal ma być skutkiem, nie odpisem). **Reguła 27** strażnika pyta o ZDANIE niosące
   zakaz (konstrukcja reguł 6 i 10: `\s+` zamiast spacji, granice przez `\p{L}`),
   mutacja: zdanie znika z szablonu → rola próbna zapala regułę; kontrprzykład:
   inne łamanie wiersza nie zapala.
2. **Narzędzie nie zdradza fali 1** (F3): identyfikator niesie falę —
   `AUD-SEC-F2-001` (prefiks i dział zostają kluczem `nastepneId()`; fala między
   działem a numerem; pula numerów per fala) — a `zgloszenie.mjs` po zapisie
   drukuje TYLKO ID i hash. Liczba zgłoszeń i próg SQLite (200) przenoszą się do
   `--pokaz` kierownika i do uwag strażnika (tam już są). Trzy istniejące wpisy
   próbne (`AUD-PIK-001`, `REA-SEC-001/002`, wszystkie `fala: 1`) przemianowane
   `git mv` na `-F1-` — jeden format, zero wyjątków w regułach. **Reguła 19
   rozszerzona**: `F<N>` w nazwie musi równać się polu `fala`; mutacja: nazwa F1
   przy `fala: 2`; kontrprzykład: zgodne. `szablony/KRYTYK.md` wskazuje
   `zgloszenia/<PREFIKS>-<KOD>-F<N>-*.json` — krytyk fali 2 z definicji nie widzi
   fali 1. `zgloszenie.mjs --test` dostaje przebieg CLI na katalogu tymczasowym
   (`--katalog=`, jak `status.mjs`/`porownaj-cykle.mjs`): wyjście po zapisie nie
   zawiera liczby wpisów; mutacja: licznik wraca → `--test` czerwony.
3. **Izolacja fali 2 na dysku** (F2, punkty 2–3): fala 2 pracuje na TYM SAMYM
   commicie (inny dałby inne checklisty i generat), ale w **worktree na własnej
   gałęzi** (np. `audyt/fala-2` od szczytu gałęzi sektora) ze **sparse checkoutem
   bez wzorców** `audyt/zgloszenia/*-F1-*` i `audyt/stan/*-f1-*`
   (`git sparse-checkout set --no-cone '/*' '!audyt/zgloszenia/*-F1-*' …`);
   generat i migawka powstają w worktree komendą. Po fali 2 gałąź wraca merge'em
   (same nowe pliki — bez konfliktów), a `porownaj-cykle.mjs` biegnie w PEŁNYM
   drzewie. **`status.mjs` egzekwuje izolację**: `--fala=2` z wejściem do działu
   (W TRAKCIE albo pierwsza runda) ODMAWIA, gdy w `audyt/zgloszenia/` jest
   jakikolwiek wpis z **polem** `fala: 1` (pole, nie nazwa) — komunikat podaje
   komendy worktree i sparse checkoutu; mutacja + przypadek `--test`. **Warunek
   konieczny**: `audyt/stan/` (i `audyt/migawki/`) MUSZĄ wejść do gita — inaczej
   stan fali 2 nie wraca do głównego drzewa, `porownaj-cykle --dzial=` nie widzi
   `ZAKOŃCZONE` fali 2, a dziennik wejść (pozycja 3) nie jest dowodem. To ZMIANA
   decyzji ze STRUKTURA.md („do gita wchodzą wyłącznie zgłoszenia") — pytanie 4.
4. **Nadmierna zgodność nazwana** (F2, punkt 4): `porownaj-cykle.mjs` obok
   „PODEJRZENIE KOPIOWANIA" (stwierdzenie co do słowa → kod 1, bez zmian) dostaje
   „PODEJRZENIE KOLEJNOŚCI": identyczny zbiór hashy działu w TEJ SAMEJ kolejności
   zgłaszania (po numerach ID) w obu falach — agent przepisujący listę odtwarza jej
   kolejność, agent mierzący od nowa raczej nie. Nazwane w wyniku i w JSON,
   przypadek `--test` + mutacja. Kod wyjścia — pytanie 5.

**Poza tym w pozycji 4:** R5 czternastu Pogłębiaczy i `re-audyt/ROLE.md` —
„lista klas z fali 1" → „lista klas z audytu TEJ fali" (re-audyt fali N czyta
audyt fali N — to jego sens i łączenie po haszu W4; zakaz dotyczy INNEJ fali);
`STRUKTURA.md`: schemat „Kolejność sektorów" z worktree fali 2, sekcja o trzech
warstwach ślepoty przepisana na cztery (definicje, narzędzie, dysk, porównanie),
procedura KIER (obu sektorów): krok „postaw worktree fali 2" i „scal po fali".

**SIEDEM ROZSTRZYGNIĘĆ WŁAŚCICIELA (2026-09-02) — wszystkie rekomendacje PRZYJĘTE** (pytania zostają niżej w brzmieniu, w jakim padły; odpowiedź przy każdym):

1. **Zakres zakazu.** Rola fali N czyta WYŁĄCZNIE wpisy, stan i wyniki fali N;
   re-audyt fali N czyta audyt fali N (musi); wyjątek: KIER i RAP PO obu falach
   (porównanie i raport w pełnym drzewie). **→ ZGODA.**
2. **Format ID** `AUD-SEC-F2-001` i przemianowanie trzech wpisów próbnych na
   `-F1-` (jeden format). **→ ZGODA.**
3. **Licznik** — po zapisie agent widzi tylko ID i hash; liczba wpisów i próg 200
   wyłącznie w `--pokaz` i u strażnika. **→ ZGODA.**
4. **`audyt/stan/` i `audyt/migawki/` wchodzą do gita** (zmiana decyzji ze
   STRUKTURA.md), bo bez tego izolacja fali 2 worktree'em nie ma jak oddać stanu,
   a dziennik wejść z pozycji 3 nie jest dowodem. Alternatywa: ręczne kopiowanie
   `stan/*-f2-*` po fali (krucha, bez bramki). Rekomendacja: do gita.
   **→ DO GITA** (zmiana decyzji ze STRUKTURA.md; `.gitignore` sektora traci
   `stan/` i `migawki/`, cztery lokalne pliki stanu z prób wchodzą jako dowód).
5. **Kod wyjścia przy PODEJRZENIU KOLEJNOŚCI**: 0 (nazwane do lektury, jak
   NADZBIÓR/SPRZECZNE po K4″) czy 1 (jak kopia co do słowa)? Rekomendacja: **0** —
   kolejność bywa taka sama, gdy obie fale idą checklistą w tej samej kolejności
   pozycji; to sygnał, nie dowód. **→ KOD 0, NAZWANE.**
6. **Podział na 4a/4b.** Zdanie zakazu wchodzi do 80 plików definicji (40 AGENT
   + 40 KRYTYK) — tych samych, które pozycja 6 (K4″, „swobodny przegląd", `<KOD>-90`)
   i tak przepisuje skryptem. Propozycja: **4a teraz** = narzędzia (ID, licznik,
   `status.mjs`, `porownaj-cykle`), reguła 19′, szablony, STRUKTURA, R5; **4b razem
   z pozycją 6** = jedno przejście skryptu po 80 definicjach + reguła 27 + generat.
   Reguła 27 nie może wejść przed 4b (byłaby czerwona na 80 plikach).
   **→ ZGODA: 4a teraz, 4b z pozycją 6.**
7. **Gdzie żyje worktree fali 2** — propozycja: `/home/krzysiek/Pod-strona-Szkolenia-fala-2`
   na gałęzi `<sektor>/fala-2`, stawiany i scalany komendą kierownika (osobne
   narzędzie `fala.mjs --postaw=2 | --scal=2`, z `--test`), żeby kolejność
   sparse-checkoutu nie zależała od pamięci. Alternatywa: instrukcja w SKILL
   kierownika bez narzędzia. Rekomendacja: narzędzie (to ta sama klasa, co
   „komenda, nie pamięć" z przelotu zrzutów). **→ NARZĘDZIE `fala.mjs`; R5 → „z audytu
   tej fali".**

**Mutacje (plan):** zdanie zakazu znika z szablonu AGENT / z KRYTYK (2);
nazwa `F1` przy `fala: 2` (1) + kontrprzykład (1); licznik wraca do wyjścia
`zgloszenie.mjs` (1); `status.mjs` wpuszcza falę 2 przy wpisie `fala: 1`
w drzewie (1) + kontrprzykład: wpis `fala: 1` z `proba` NIE blokuje? (do
rozstrzygnięcia przy kodzie — wpis próbny E6 jest fala 1) ; `porownaj-cykle`
przestaje nazywać kolejność (1) + kontrprzykład: ten sam zbiór w INNEJ
kolejności nie jest podejrzany (1); `fala.mjs` stawia worktree bez wykluczeń
(1). Razem ~10, audyt 101 → ~111.

**Kolizje:** pozycja 3 (zrobiona) — `status.mjs` dostaje piątą odmowę w tej
samej czystej funkcji, `--test` rośnie; pozycja 6 — te same 80 plików (stąd
pytanie 6); pozycja 7 (re-audyt sekwencyjnie, „KIER-00 co musi stać") — worktree
fali 2 to kolejna rzecz, która „musi stać", więc 7 dziedziczy z 4 gotową
komendę; pozycja 5 (macierz reguła → mutacja) liczy także nowe reguły.
Środowisko `:8892` serwuje wtyczki z GŁÓWNEGO checkoutu (bind mount) — worktree
fali 2 ma identyczny kod produktu (ten sam commit), więc bramki WP mierzą to
samo; sektory produktu nie zmieniają, więc rozjazd niemożliwy.

**Czego pozycja 4 NIE robi:** nie zmienia hasha miejsca ani `werdykt.mjs`; nie
robi kanonicznego promptu roli (F5, poza pakietem); nie usuwa wpisów fali 1 —
tylko chowa je przed falą 2; nie zmienia semantyki K4″ (narzędzie nazywa, nie
ocenia).

**Koszt i ryzyko:** S (narzędzia, reguły) + M (worktree i sparse checkout —
`git sparse-checkout` w trybie non-cone z wykluczeniami wymaga pomiaru na tym
gicie, zanim wejdzie do procedury). Największe ryzyko: sparse checkout, który
„działa" w lekturze dokumentacji, a nie chowa plików — dlatego egzekwuje go
`status.mjs` po POLU `fala`, nie zaufanie do gita.

#### PAKIET E7.7, POZYCJA 7 — ZROBIONA 2026-09-03 (projekt zaakceptowany tego dnia: „potwierdzam rekomendacje"; projekt niżej, WYNIK na końcu sekcji)

**ROZSTRZYGNIĘCIA WŁAŚCICIELA (2026-09-03) = sześć rekomendacji niżej, co do słowa:**
(1) sekwencja egzekwowana **narzędziem** (`status.mjs` odmowa 6 + reguła 30); (2) „jedna
rola na środowisku naraz" obejmuje **14 Pogłębiaczy + PSIARZ + WALID** (`NA_SRODOWISKU`
w `wspolne.mjs`); (3) **zrzut bazowy na falę + zrzut „po dziale" zachowany**; (4) zrzuty
`.sql` **poza repo** (`~/.cache/aai-kopie/audyt/`), w repo liczniki; (5) media **liczone,
nie kopiowane**, rozjazd = STOP; (6) „niedostępne" = odmowa **tylko rolom `NA_SRODOWISKU`**,
a `--porownaj` z „niedostępne" po jednej stronie = kod 1. Kod idzie po `/clear` bez
ponownego pytania o zgodę, wg sześciu kroków niżej. Zapis historyczny: projekt spisany
2026-09-03 jako „do dyskusji"; odpowiedź właściciela tego samego dnia.

Źródło: krytyka budowy **C3** („środowisko jest wspólne, a działy uruchomieniowe mogą
pracować równolegle — POTWIERDZONE"), tabela F wiersz 18, rozstrzygnięcie właściciela 3
z 2026-09-02 (*„re-audyt na środowisku sekwencyjnie — tak; przywracanie stanu ze zrzutu
między działami, nie `postaw.sh`"*), zapisane już w REGULAMIN.md jako doprecyzowanie K9′.
Sedno C3: Pogłębiacz mierzy LICZBY na `:8892` (zapytania na odsłonę, wiersze w tabelach,
liczniki przed/po), a drugi Pogłębiacz pracujący równolegle te liczby zanieczyszcza — bez
jednego objawu. Stan „dziś" zmierzony lekturą i komendami, nie z pamięci:

| Co | Pomiar (2026-09-03) | Skutek |
|---|---|---|
| sekwencyjność w dokumentach sektora | REGULAMIN.md (K9′, doprecyzowanie): **jest**; `STRUKTURA.md` „Kolejność sektorów": **0** wzmianek (schemat mówi „działy równolegle MIĘDZY SOBĄ" bez wyjątku); `re-audyt/role/KIER/{AGENT,SKILL}.md`: **0** | kierownik re-audytu ma w definicji procedurę bez słowa o sekwencji i o zrzucie — rozstrzygnięcie właściciela żyje w jednym wierszu regulaminu |
| egzekwowanie narzędziem | `status.mjs`: pięć odmów, **żadna** nie pyta „czy inny Pogłębiacz jest W TRAKCIE"; reguła 17 strażnika pilnuje kolejności audyt→re-audyt, **nie** dwóch Pogłębiaczy naraz | dwa działy re-audytu wchodzą równolegle bez objawu — dokładnie C3 |
| `KIER-00` „co musi stać" | **0** w `re-audyt/ROLE.md` i `audyt/ROLE.md`; checklista KIER re-audytu zaczyna się od R1 „czy audyt wyszedł" | nikt nie pyta, czy `:8892` stoi, zanim postawi Pogłębiacza; kontrola „stoi" to dziś `postaw.sh` (452 linie, przebudowuje) |
| migawka wartości | `migawka-wartosci.mjs`: 11 pól — git, bramki, drzewo produktu; **0** liczników tabel WP, **0** o `:8892` | rozjazd w danych środowiska (wiersz dopisany, zamówienie-widmo, sierota w Tutorze) jest dla W6 niewidzialny |
| role re-audytu na środowisku | **21 z 21** definicji wspomina `:8892`; 14 Pogłębiaczy ma R1 „odtworzyć uruchomieniowo na `:8892`", **9** ma R6 uruchomieniowe (SEC, FE, PERF, ARCH, INT, PRIV, PROTO, PIK + PERF-R6); SKUT-R4/R5 liczą przed/po na `:8892`; PSIARZ **psuje kod na bind mouncie** — `:8892` serwuje wtyczki z checkoutu, więc mutacja Psiarza jest widoczna każdemu, kto w tej chwili mierzy | „sekwencja Pogłębiaczy" nie wystarczy — Psiarz i role liczące też są stroną |
| Pogłębiacze PISZĄ do środowiska | PRIV-R6 („żądanie, potem odczyt wiersza z tabeli"), SEC-R6 (żądania bez nonce'a — monitoring zapisuje logowanie), PIK-R6 (przejście obiecanej ścieżki — zakup) | migawka „przed == po" na licznikach byłaby czerwona po każdym dziale, jeśli nic nie przywraca stanu MIĘDZY działami |
| środowisko `:8892` | 5 kontenerów Up (db, wordpress, mailpit, cli + `db1_kursy`), baza `wordpress` **80 tabel**, `mariadb-dump` w kontenerze `aai_wp_db`; **zrzut 8,2 MB w 197 ms; przywrócenie do świeżego schematu 1,8 s z zachowanym `AUTO_INCREMENT`** (267 na `wp_aai_monitor_logowania`, zmierzone); `wp-content/uploads` **1348 plików, 34 MB** (zrzuty lekcji w mediach — POZA bazą) | przywracanie ze zrzutu kosztuje 2 s, `postaw.sh` — minuty i kasuje dane dowodowe; media trzeba liczyć osobno |
| dane dowodowe właściciela | `wp_aai_monitor_logowania` **21** (`AUTO_INCREMENT` 267), `wizyty` **17** (146), `wc_orders` **0**, `dostawy` 0 (AI 465), `changelog` 1447 | 12 logowań / 16 odsłon z T4 ciągle tam są, obudowane późniejszymi; zamówienia właściciela NIE wróciły po odtworzeniu od zera (TEST-CALOSCI-WP) |
| istniejące zrzuty | `~/.cache/aai-kopie/`: dwa `.sql` z 2026-08-31 (14 MB i 7 MB) + dwa `.tsv` liczników — ręczne; `mysqldump`/`mariadb-dump` w `package.json` i `tools/`: **0** | nie ma narzędzia w repo; każdy zrzut to komenda z pamięci |
| **`information_schema.table_rows` KŁAMIE** (InnoDB szacuje) | `wp_postmeta` 1866 vs `COUNT(*)` **1786**; `wp_options` 447 vs **453**; `changelog` 1420 vs **1447** | liczniki tabel MUSZĄ iść przez `COUNT(*)` na każdej z 80 tabel (milisekundy), inaczej migawka podnosi fałszywe alarmy i przepuszcza prawdziwe |

**CO MA POWSTAĆ — sześć kroków, jeden commit (+ przeniesienie na gałąź audytu):**

1. **Narzędzie `audyt/tools/srodowisko.mjs`** (czyste funkcje + CLI, jak `status.mjs`):
   `--liczniki` (JSON: dla KAŻDEJ tabeli bazy `wordpress` `COUNT(*)` + `AUTO_INCREMENT`,
   liczba i suma bajtów plików `uploads/`, lista aktywnych wtyczek, wersje WP/Tutor/Woo
   z `wp plugin list --format=json`); `--zrzut=<nazwa>` (`mariadb-dump
   --single-transaction --routines --triggers` z kontenera do `~/.cache/aai-kopie/audyt/<nazwa>.sql`
   + liczniki obok jako `<nazwa>.json`); `--przywroc=<nazwa>` (DROP + CREATE + import,
   potem **asercja: liczniki żywej bazy == liczniki zapisane przy zrzucie**, rozjazd = kod 1;
   odmowa, gdy zrzutu nie ma); `--sprawdz` (to jest komenda KIER-00: 5 kontenerów Up,
   `:8892` odpowiada, 5 wtyczek aktywnych, zrzut bazowy fali istnieje i liczniki żywej bazy
   MU ODPOWIADAJĄ, w fali 2 — worktree stoi; `:3001` tylko gdy pyta PROTO); `--test`
   (samokontrola na TYMCZASOWYM schemacie `proba_srodowisko_<pid>` w tym samym kontenerze:
   zrzut → zmiana → przywrócenie → liczniki równe; **warunkowa** — bez kontenera mówi
   „pominięte", jak reguły 2–4). Nazwy kontenerów z `STACK_NAZWA` jak w `package.json`.
2. **Migawka wartości rozszerzona** o pole `srodowisko` = wynik `--liczniki` (skrót sha256
   z posortowanej listy `tabela:count:auto_increment` + osobno liczniki naszych 9 tabel
   `wp_aai_*` i mediów, żeby rozjazd był CZYTELNY, nie tylko wykryty). Gdy `:8892` nie
   stoi: pole `srodowisko: "niedostępne"` — jawnie, nigdy pominięte; `--porownaj` traktuje
   „niedostępne" po jednej stronie jako ROZJAZD (kod 1), bo W6 nie da się wtedy rozstrzygnąć.
3. **`KIER-00` w `re-audyt/ROLE.md` + `re-audyt/role/KIER/AGENT.md`** (reguła 13 wymaga
   obu stron): *„Czy stoi wszystko, co musi stać, ZANIM wejdzie pierwsza rola na
   środowisku?"* | `srodowisko.mjs --sprawdz` | kod wyjścia + lista. Procedura KIER (AGENT
   + SKILL) dostaje kroki: zrzut bazowy `--zrzut=f<N>-baza` PRZED pierwszym Pogłębiaczem;
   po KAŻDYM dziale: `--zrzut=f<N>-<KOD>-po` (dowód SKUT-R4/R5) → `--przywroc=f<N>-baza`;
   dopiero potem następny dział. Kierownik audytu (lekturowego) tego NIE dostaje — audyt
   nie używa `:8892` (ROLE.md: „Metoda: lektura kodu").
4. **`status.mjs` odmowa 6 — jedna rola na środowisku naraz:** wejście roli z listy
   `NA_SRODOWISKU` (pytanie 2) w sektorze re-audyt, gdy inna rola z tej listy TEJ SAMEJ
   fali ma status `W TRAKCIE` → odmowa z nazwą roli, która blokuje, i komendą (jak odmowy
   1–5; `--test` rośnie). Plik stanu dopisany ręcznie ominąłby narzędzie, więc **reguła 30
   strażnika**: dwa stany ról `NA_SRODOWISKU` re-audytu tej samej fali z NAKŁADAJĄCYMI SIĘ
   oknami `W TRAKCIE` w historii = błąd (własny kod, nie import z narzędzia — jak reguły
   17 i 21). Konstrukcja 17: stan próbny wypada spod reguły i jest wypisany.
5. **Reguła 31 strażnika**: migawka `przed.json`, jeśli istnieje, niesie pole `srodowisko`
   (liczniki albo dosłowne „niedostępne") — migawka bez tego pola to migawka sprzed
   pozycji 7, która nie mierzy W6 na środowisku. Obie istniejące migawki w repo
   (`audyt/migawki/`) zostają jako historia z polem dopisanym przy pozycji 7 albo
   przemianowane — do rozstrzygnięcia w kodzie, nie tu.
6. **Mutacje** (audyt 131 → ~141, każda z `regula:`): odmowa 6 zdjęta z `status.mjs`
   (→ R26), dwa stany Pogłębiaczy z nakładającymi się oknami (→ R30) + kontrprzykład:
   okna rozłączne (KIER-R1-kolejność) NIE zapalają, kontrprzykład: rola procesowa (KON)
   równolegle z Pogłębiaczem NIE zapala; migawka bez pola `srodowisko` (→ R31)
   + kontrprzykład: „niedostępne" NIE zapala; `srodowisko.mjs --test` psute w trzech
   miejscach: przywracanie bez asercji liczników, liczniki z `table_rows` zamiast
   `COUNT(*)` (→ samokontrola widzi rozjazd na `wp_postmeta`), `--sprawdz` bez pytania
   o zrzut bazowy. Do tego `STRUKTURA.md` (schemat „Kolejność sektorów" z sekwencją
   i przywracaniem, tabela kontroli 30/31, „Kto co uruchamia") i `re-audyt/ROLE.md`
   (sekcja przebiegu).

**SZEŚĆ PYTAŃ DO WŁAŚCICIELA** (rekomendacja przy każdym; kod po odpowiedziach i po `/clear`):

1. **Sekwencja egzekwowana NARZĘDZIEM (`status.mjs` odmowa 6 + reguła 30) czy tylko
   zapisem w procedurze KIER?** Rekomendacja: **narzędziem**. C3 zmierzył dokładnie to,
   że zapis „w regulaminie" istniał i nic z niego nie wynikało; procedura w prozie to ta
   sama klasa.
2. **Kogo obejmuje „jedna rola na środowisku naraz"?** (a) 14 Pogłębiaczy; (b) 14 + PSIARZ
   (psuje kod na bind mouncie — jego mutacja jest widoczna na `:8892` w trakcie cudzego
   pomiaru) + WALID (odtwarza zjawiska żądaniami, które piszą do monitoringu);
   (c) wszystkie 21. Rekomendacja: **(b)** — lista `NA_SRODOWISKU = [...DZIALY, "PSIARZ",
   "WALID"]` w `wspolne.mjs`; KIER, RAP, KON, SKUT, STRAZ pracują na plikach sektora
   (SKUT liczy przed/po, ale nie pisze — jego pomiar i tak idzie po przywróceniu).
3. **Zrzut: jeden bazowy na falę przywracany po każdym dziale, czy dodatkowo zrzut „po
   dziale" zachowany?** Rekomendacja: **bazowy + „po dziale" zachowany** (8 MB × 14
   działów × 2 fale ≈ 230 MB, poza repo) — to materiał dowodowy dla SKUT-R4/R5 i jedyna
   droga, żeby wrócić do stanu, w którym Pogłębiacz coś zobaczył. W repo tylko liczniki
   (`audyt/migawki/srodowisko-f<N>-<KOD>-po.json`, kilka kB każdy).
4. **Gdzie żyją zrzuty `.sql`?** Rekomendacja: **poza repo**, `~/.cache/aai-kopie/audyt/`
   (jak dokumentacja audytu, 44 MB w `~/.cache/`); po `git clean` albo na nowej maszynie
   zrzut bazowy robi się od nowa z żywego środowiska — jest odtwarzalny, liczniki w repo
   mówią, czy to ten sam stan.
5. **Media (`uploads/`, 1348 plików, 34 MB): kopiować przy zrzucie czy tylko liczyć?**
   Rekomendacja: **liczyć** (liczba, bajty, sha256 posortowanej listy `ścieżka:rozmiar`) —
   żadna rola nie ma prawa pisać mediów (W2), więc rozjazd licznika = STOP, a kopia 34 MB
   × 28 razy nie kupuje niczego, czego nie da `wp:zrzuty` w minutę.
6. **Migawka „niedostępne" (kontenery nie stoją): odmowa wejścia TYLKO rolom
   `NA_SRODOWISKU` czy całemu re-audytowi?** Rekomendacja: **tylko `NA_SRODOWISKU`** —
   KON, KIER, RAP czytają pliki sektora i nie potrzebują `:8892`; audyt (lekturowy) w ogóle
   go nie używa i wchodzi jak dotąd. Ale `--porownaj` z „niedostępne" po jednej stronie =
   kod 1 zawsze (W6 nierozstrzygnięte to nie jest W6 zaliczone).

**Czego pozycja 7 NIE robi:** nie zmienia checklist Pogłębiaczy (ich R1/R6 zostają — to
one są POWODEM sekwencji); nie rusza `postaw.sh` ani `compose.yml`; nie stawia prototypu
`:3001` (PROTO-R6 pyta o niego — `--sprawdz` tylko MELDUJE, czy stoi); nie kopiuje mediów;
nie uruchamia sektora; nie kasuje danych dowodowych właściciela (zrzut bazowy je ZAWIERA
i każde przywrócenie je oddaje).

**Koszt:** S (`srodowisko.mjs` + `--test`) + S (migawka, `status.mjs`, dwie reguły, ~10
mutacji) + S (dokumenty: STRUKTURA.md, `re-audyt/ROLE.md`, KIER re-audytu AGENT + SKILL)
+ 1 pełny audyt mutacyjny ×2 (obie gałęzie, lekcja z pozycji 5). **Ryzyko:** (1) `--test`
na żywym kontenerze — schemat tymczasowy MUSI mieć nazwę z PID-em i być kasowany w `finally`,
a test negatywny ma dowieść, że po padnięciu nie zostaje (klasa „bramka sprzątająca cudze
dane"); (2) `DROP DATABASE wordpress` przy `--przywroc` to najgroźniejsza komenda w całym
sektorze — przywracanie idzie do schematu TYMCZASOWEGO, asercja liczników, dopiero potem
`RENAME`/podmiana, nigdy „drop, potem import"; (3) kolizja z `smoke-wp-*` z `main`
(bramki projektu też piszą na `:8892`) — nie ruszamy, ale `--sprawdz` melduje żywy proces
`smoke-wp` jako „ktoś inny pracuje na środowisku".

**WYNIK — ZROBIONE 2026-09-03 (kod po `/clear`, sześć kroków projektu co do punktu, jeden commit + przeniesienie na gałąź audytu):**

| Krok | Skutek zmierzony |
|---|---|
| 1. `audyt/tools/srodowisko.mjs` | `--liczniki` (JEDNO zapytanie `UNION ALL` z `COUNT(*)` na każdej z 80 tabel + `AUTO_INCREMENT`, media liczone: 1348 plików / bajty / sha256 listy `ścieżka:rozmiar`, wtyczki i wersje z `wp plugin list --format=json`); `--zrzut=<nazwa>` (`mariadb-dump --single-transaction --routines --triggers` z kontenera do `~/.cache/aai-kopie/audyt/<nazwa>.sql`, liczniki PRZED i PO zrzucie muszą być równe, `<nazwa>.json` obok i kopia w `audyt/migawki/srodowisko-<nazwa>.json`); `--przywroc=<nazwa>` (odmowa bez zrzutu → import do `proba_przywroc_<pid>` → asercja liczników tabel wobec zapisanych → podmiana JEDNYM `RENAME TABLE` → schematy pomocnicze kasowane w `finally`; media rozjechane po podmianie = kod 1); `--sprawdz --fala=N` = KIER-00 (5 kontenerów przez `podman inspect`, `:8892` 200, 5 wtyczek, zrzut bazowy `fN-baza` istnieje I liczniki żywej bazy mu odpowiadają, w fali 2 worktree, cudzy proces `smoke-wp`/`przelot-calosc`/`postaw.sh` = „ktoś inny pracuje", `:3001` tylko meldowany); `--stoi` (dla bramek warunkowych); `--test` warunkowy (bez kontenera „pominięte", kod 0) na schemacie `proba_srodowisko_<pid>` z tabelami z KLUCZEM OBCYM: zrzut → zmiana (3 wiersze + `DROP TABLE`) → przywrócenie → liczniki równe, `AUTO_INCREMENT` wrócił, klucz obcy dalej odrzuca sierotę; podrobiony `.json` → odmowa i cel nietknięty; `--sprawdz` bez zrzutu → kod 1 z ✗ przy zrzucie bazowym; **`--test --padnij` w podprocesie dowodzi, że po padnięciu schemat próbny ZNIKA** (`finally`); `COUNT(*)` liczników porównany z NIEZALEŻNYM `COUNT(*)` na 13 tabelach |
| 2. migawka | pole `srodowisko` = `{ skrot_tabel, tabel, nasze (9 tabel wp_aai_*), media, wtyczki_aktywne, wersje }` albo DOSŁOWNE `"niedostępne"` (powód drukowany przy `--zapisz`); `--porownaj` porównuje obiekty przez JSON, opisuje rozjazd środowiska PO LUDZKU (która z naszych tabel, o ile; media; wtyczki), a „niedostępne"/brak pola po którejkolwiek stronie = kod 1. Obie migawki z próby E7.6 dostały pole z pomiaru żywego środowiska 2026-09-03 i adnotację (zostają historią; przed pierwszą falą kierownik zapisuje `przed` od nowa) |
| 3. `KIER-00` | wiersz w `re-audyt/ROLE.md` i `re-audyt/role/KIER/AGENT.md` (reguła 13 obie strony); bez litery `R` celowo — bramka wejścia, nie pozycja audytu (nazwane w ROLE.md); nowa sekcja „Przebieg na środowisku `:8892`" w `re-audyt/ROLE.md` (tabela kiedy → komenda → po co); procedura KIER (AGENT „Sekwencja na środowisku", SKILL kroki 1 i 4, komendy, dwie pułapki). Kierownik AUDYTU nietknięty. Podsumowanie ról: 121 → **122** pozycje |
| 4. `status.mjs` odmowa 6 | w czystej `powodyOdmowyStanu()`: rola `NA_SRODOWISKU` re-audytu nie wchodzi w W TRAKCIE, gdy inna z listy TEJ SAMEJ fali jest W TRAKCIE (stan próbny nie blokuje) — odmowa nazywa rolę i podaje trzy komendy (jej ZAKOŃCZONE, `--zrzut=fN-<KOD>-po`, `--przywroc=fN-baza`); druga połowa (rozstrzygnięcie 6) w czystej `powodyOdmowySrodowiska()`: migawka „niedostępne" albo bez pola → odmowa TYLKO rolom `NA_SRODOWISKU`, z komendą `--sprawdz --fala=N` i ponownym `--zapisz=przed`. `--test`: +18 przypadków czystych, +4 CLI (PSIARZ blokowany przez SEC → kod 1, po ZAKOŃCZONE SEC kod 0; WALID przy „niedostępne" kod 1, KON kod 0). **Reguła 30** strażnika: własna kopia listy porównana z `wspolne.mjs`, okna W TRAKCIE z HISTORII plików stanu (otwarte = do teraz), pary tej samej fali, stan próbny wypisany poza regułą; warunkowa |
| 5. **Reguła 31** | `przed.json`/`po.json`, jeśli istnieją, niosą `srodowisko` = liczniki (skrót 64 hex + `nasze` + `media`) albo dosłowne „niedostępne" — cokolwiek innego i brak pola = błąd; druga połowa: `srodowisko.mjs --test` (szósty bliźniak 9/15/25/26/29), „pominięte" bez kontenera |
| 6. mutacje | audyt **131 → 146** (15 nowych, każda z `regula:`): odmowa 6 zdjęta (→ R26), „niedostępne" zdjęte (→ R26), lista `NA_SRODOWISKU` bez WALID (→ R26 + R30 — rozjazd kopii), dwa nakładające się okna (PSIARZ+WALID; PSIARZ+Pogłębiacz SEC z działem audytu zakończonym wcześniej → R30, nie 17) + **cztery kontrprzykłady R30** (okna rozłączne KIER-R1, KON obok PSIARZA, stan próbny, dwa działy AUDYTU naraz), migawka bez pola i pole = 5 (→ R31) + kontrprzykład „niedostępne", **trzy mutacje `srodowisko.mjs`** (przywracanie bez asercji, `table_rows` zamiast `COUNT(*)`, `--sprawdz` bez pytania o zrzut → R31) z NOWYM polem `wymagaSrodowiska` (bez kontenera bazy pomijane I policzone, jak `wymaga`). Mutacji `finally` NIE ma celowo: zostawiałaby na żywej bazie schemat próbny rodzica — klasa „bramka sprzątająca cudze dane"; `finally` dowodzi każdy `--test` przez `--padnij` |

**Sześć rzeczy ZMIERZONYCH przy kodzie (poza projektem), nie wyprowadzać od nowa:**
- **`AUTO_INCREMENT` `wp_options` rośnie od SAMYCH ODCZYTÓW** — transienty przy każdym żądaniu HTTP i przy każdym `wp plugin list` (`_site_transient_update_plugins`); pięć odczytów → `2720 → 2722`, liczba wierszy bez zmian, sześć sekund ciszy → nic. Pierwsza samokontrola padła na własnym pomiarze („ktoś pisze do środowiska"). Ten JEDEN licznik (`ULOTNE_AUTO_INCREMENT`) jest poza porównaniami i skrótem, zapisywany i widoczny; wiersze `wp_options` porównywane jak każde inne;
- **`RENAME TABLE a.t TO b.t, …` przenosi klucze obce razem z tabelą** (eksperyment: FK wskazuje potem schemat `b`, wstawienie sieroty pada), zachowuje `AUTO_INCREMENT` i jest jednym zdaniem atomowym — 9 kluczy obcych w bazie należy do Tutora (`wp_tutor_*`), triggerów 0, widoków 0, procedur 0; grant `wordpress@%` jest na `wordpress.*`, więc podmiana tabel nie rusza uprawnień;
- zrzut `mariadb-dump wordpress` (bez `--databases`) **nie niesie `USE` ani `CREATE DATABASE`** — narzędzie asertuje to przy każdym zrzucie;
- `wp plugin list --skip-plugins --skip-themes` daje TEN SAM wynik (porównany co do bajtu) w ~0,7 s zamiast ~1,5 s — strażnik uruchamia `--test` przy każdej mutacji;
- **samokontrola zostawiła artefakt w repo**: `--zrzut` z CLI szedł z `--katalog-zrzutow=<tmp>`, ale liczniki pisał do `audyt/migawki/` (`srodowisko-f1-baza.json`); złapane `git status`, nie testem — od teraz `--katalog-zrzutow` przekierowuje TAKŻE liczniki, a dodatnia strona KIER-00 idzie w procesie samokontroli;
- goldeny KIER obu sektorów wskazywały `status.mjs:270` — po dopisaniu odmowy 6 linia przesunęła się na 325 i reguła 11 zapaliła się na obu; numer linii jest dowodem, nie kluczem (H1), więc poprawka to nowy numer, nie nowy hash;
- **NAWRÓT pułapki cudzysłowu ASCII** (opisanej przy 4b + 6): skrypt Pythona z `„…"` w łańcuchu padł z `SyntaxError`, a `git commit --amend` w tym samym łańcuchu komend i tak poszedł — z wolnym miejscem `{WYNIK_AUDYT}` w tym pliku. Złapane `grep -c '{'` PRZED pushem. Reguła: zamiennik tekstu z polskimi cudzysłowami czytać z PLIKU (heredoc), nie z literału, a `commit` nigdy w jednym `&&`-łańcuchu ze skryptem, którego wyjścia nie sprawdzono.

**Koszt czasu, zmierzony:** `srodowisko.mjs --test` ~9 s, strażnik sektora ~13 s (był ~4 s), pełny audyt mutacyjny ~~38 min na gałęzi.

**Dowody na gałęzi re-audytu:** `git diff main --name-only -- . ':!audyt' ':!re-audyt'` → 0; strażnik kod 0 (32 numery w `--reguly`; R30 „par sprawdzonych: 0" + stany próbne wypisane; R31 „migawek: 2, samokontrola zaliczona"); `status.mjs --test`, `srodowisko.mjs --test` kod 0; audyt celowany 16/0/0; audyt mutacyjny ****146 mutacji, 0 przeoczonych, 0 martwych, macierz 32/32 reguł z mutacją (R30: 3 mutacje + 4 kontrprzykłady, R31: 5 + 1), bez materiału 0, kod 0****. **Na gałęzi audytu** (worktree, `git checkout <commit> -- audyt`, generat od nowa): strażnik kod 0 (pominięte 7, 12, 20 — sektor re-audyt; R30 i R31 z materiałem), audyt mutacyjny **146 / 0 / 0**, 7 mutacji pominiętych (`wymaga`), macierz 31 z 32 reguł z mutacją, R20 „bez materiału", R7 i R12 „częściowo", **R30 3 + 4 i R31 5 + 1 na obu gałęziach**, kod 0, 34 min (04:33–05:07).

**Czego pozycja 7 NIE zrobiła (zgodnie z projektem):** nie zmieniła checklist Pogłębiaczy; nie ruszyła `postaw.sh` ani `compose.yml`; nie stawia `:3001`; nie kopiuje mediów; nie uruchomiła sektora; nie skasowała danych dowodowych (zrzut bazowy je zawiera). **Zrzutu `f1-baza` jeszcze NIE MA** — powstaje na starcie fali, komendą kierownika, po zielonym świetle.

#### PAKIET E7.7, POZYCJA 5 — ZROBIONA 2026-09-03 (projekt zaakceptowany tego dnia: „akceptuję wszystkie 5 rekomendacji"; projekt niżej, WYNIK na końcu sekcji)

**ROZSTRZYGNIĘCIA WŁAŚCICIELA (2026-09-03) = pięć rekomendacji niżej, co do słowa:**
(1) zgodność deklaracji `regula:` z zapaloną regułą **ŚCISŁA** (zbiory równe; pierwszy
przebieg wypisuje rozjazdy, deklaracje poprawiam do stanu zmierzonego); (2) reguła
z materiałem bez ani jednej mutacji = **kod 1** audytu, reguła bez materiału =
„bez materiału", policzona; (3) kontrprzykład **raportowany** w macierzy, WYMAGANY
tylko dla reguł pytających o zdanie (6, 10, 27, 27b); (4) lista reguł z **tablicy
`REGULY`** w strażniku + samokontrola wobec nagłówków sekcji + `--reguly`;
(5) macierz **tylko na wyjściu audytu** + jedno zdanie w STRUKTURA.md. Kod idzie po
`/clear` bez ponownego pytania o zgodę, wg czterech kroków niżej.

Źródło: krytyka budowy **B7** („pokrycie kontroli testem negatywnym nie jest
artefaktem — POTWIERDZONE"), tabela F wiersz 8: *reguły drukują `R<numer>:`, mutacje
deklarują `regula:`, audyt drukuje macierz i czerwieni się przy regule bez mutacji —
z polem `wymaga` dla reguł warunkowych*. Stan „dziś" zmierzony lekturą obu narzędzi
(nie z pamięci):

| Co | Pomiar (2026-09-03) | Skutek |
|---|---|---|
| numer reguły w komunikacie strażnika | **0** z ~60 `bledy.push` niesie `R<nr>:`; numery mają tylko `pominiete.push` (17 miejsc) | audyt nie wie, KTÓRA reguła się zapaliła — wie tylko, że jakaś |
| przypisanie mutacji do reguły | `regula:` **0**; **100** mutacji ma `slad` = wzorzec na TEKST komunikatu, **25** kontrprzykładów (bez śladu) | pokrycie reguł liczy się z regexów na napisy — ta sama klasa, przed którą strażnik broni kodu (dziewięć nawrotów) |
| ślady zbiorcze | `/status\.mjs --test/` ×9, `/porownaj-cykle\.mjs --test/` ×8, `/zgloszenie\.mjs --test/` ×6+3, `/werdykt\.mjs --test/` ×3, `/fala\.mjs --test/` ×2 | 31 mutacji psuje NARZĘDZIE, a regułę zapala samokontrola — poprawne, ale macierz musi to policzyć jako pokrycie reguł 9/15/25/26/29 |
| reguły bez ANI JEDNEJ mutacji (lektura wzorców wobec komunikatów) | **2** (każda rola ma krytyka), **3** (pięć elementów §5), **6** (trzy zasady nadrzędne dosłownie) | trzy kontrole z E4, które nigdy nie były sprawdzone testem negatywnym — reguła 6 pyta o ZDANIE, więc jest najbardziej narażona na ślepotę „wzorca na napis" |
| reguły warunkowe (`pominiete` przy braku materiału) | 17 miejsc, m.in. 2, 3, 4, 6, 7, 10–14, 17–21, 23 | na gałęzi audytu 7 mutacji jest pomijanych (`wymaga`), ale nic nie mówi, KTÓRE REGUŁY zostają przez to bez dowodu |
| macierz na wyjściu audytu | **nie istnieje** — wyjście to lista ✓/✗ i cztery liczby | „126 / 0 / 0" nie odpowiada na pytanie B7: czy każda reguła ma choć jedną mutację, która ją zapala |

**CO MA POWSTAĆ — cztery kroki, jeden commit:**

1. **Strażnik: numer reguły w KAŻDYM komunikacie.** Pomocnik `blad(nr, tekst)`
   zamiast gołego `bledy.push` (~60 miejsc, zamiana mechaniczna) drukuje
   `R13: rola audyt/role/SEC: AGENT.md NIE MA pozycji SEC-90`. Reguła 27 ma dwie
   etykiety: `R27` i `R27b`. Tablica **`REGULY`** na górze pliku (numer, tytuł,
   `warunkowa: true/false`) z SAMOKONTROLĄ przy starcie: każdy numer z tablicy ma
   nagłówek sekcji `/* ── N.` i odwrotnie — lista nie może się rozjechać z kodem.
   `--reguly` drukuje tablicę jako JSON (dla audytu).
2. **Audyt: `regula:` w każdej mutacji** (liczba albo lista — mutacja psująca dwa
   pliki może słusznie zapalić dwie reguły). Po każdej mutacji audyt PARSUJE `R<nr>:`
   z wyjścia strażnika → zbiór zapalonych. Werdykt „ZŁA REGUŁA" (liczy się jak
   „ZŁY ŚLAD"), gdy zbiór zapalonych ≠ zadeklarowany. `slad` ZOSTAJE — pyta
   o konkretny komunikat w obrębie reguły (np. „SEC-90", nie „SEC-13").
   Kontrprzykłady deklarują `regula:` jako dokumentację (strażnik ma być zielony,
   więc zbiór zapalonych = ∅ i tak).
3. **Macierz na wyjściu audytu** (pełny przebieg, nie `--tylko`): wiersz na
   regułę — numer, tytuł, mutacji zapalających, kontrprzykładów, materiał na tej
   gałęzi (z „pominięte — N." w wyjściu strażnika PRZED mutacjami — POMIAR, nie
   deklaracja). **Kod 1, gdy reguła z materiałem ma 0 mutacji**; reguła bez
   materiału = „bez materiału", policzona, nigdy cicho zielona (ten sam wzorzec, co
   `wymaga` per mutacja).
4. **Trzy mutacje dla reguł 2, 3, 6** (+ kontrprzykłady tam, gdzie reguła pyta
   o zdanie): rola próbna bez `KRYTYK.md` (→ R2); `AGENT.md` bez sekcji „Moduł"
   (→ R3); z szablonu AGENT znika „Brak dowodu = brak zgłoszenia" (→ R6),
   kontrprzykład: to samo zdanie złamane w innym miejscu wiersza (→ nie zapala).

**PIĘĆ PYTAŃ DO WŁAŚCICIELA** (rekomendacja przy każdym; kod po odpowiedziach i po
`/clear`):

1. **Zgodność zadeklarowanej reguły z zapaloną — ŚCISŁA (zbiory równe) czy
   wystarczy, że zadeklarowana jest WŚRÓD zapalonych?** Rekomendacja: **ścisła**.
   Mutacja, która zapala więcej, niż deklaruje, maskuje (lekcja z P2: „mutacja
   łamała dwie reguły naraz"); przy pierwszym przebiegu audyt WYPISZE rozjazdy,
   a deklaracje poprawiam do stanu zmierzonego, nie odwrotnie.
2. **Reguła bez mutacji = kod 1 audytu (bramka) czy tylko wiersz w macierzy?**
   Rekomendacja: **kod 1** — inaczej macierz jest raportem, który nikt nie czyta,
   a B7 pytał właśnie o bramkę. Wyjątek: reguła BEZ MATERIAŁU na gałęzi (mierzony
   z „pominięte" strażnika, nie deklarowany w audycie).
3. **Kontrprzykład per reguła — wymagany (kod 1) czy raportowany (kolumna)?**
   Rekomendacja: **raportowany**; wymagany tylko dla reguł pytających o ZDANIE
   (6, 10, 27, 27b) — tam „nadwrażliwość" jest realnym ryzykiem, a dziś 27/27b
   już je mają, 6 i 10 dostają w kroku 4.
4. **Skąd audyt bierze listę reguł: z tablicy `REGULY` + `--reguly` (z samokontrolą
   nagłówków) czy parsując źródło strażnika?** Rekomendacja: **tablica** —
   parsowanie źródła to wzorzec na napis w nowym przebraniu.
5. **Czy macierz ląduje w repo (plik w `audyt/wyniki/`) czy tylko na wyjściu
   audytu?** Rekomendacja: **tylko wyjście** + jedno zdanie w STRUKTURA.md, że
   audyt ją drukuje. Liczby wpisane do dokumentu starzeją się cicho (lekcja 0.35.0:
   `straznik-readme` pilnuje README, a `audyt/` strażnika readme nie ma).

**Czego pozycja 5 NIE robi:** nie zmienia żadnej reguły merytorycznie (numeracja
i komunikaty zostają, dochodzi prefiks); nie rusza definicji ról ani ROLE.md; nie
zmienia `wymaga` per mutacja (zostaje obok macierzy); nie uruchamia sektora.

**Koszt:** S (prefiksy + pomocnik + parser) + S (deklaracje w 125 mutacjach —
mechanicznie z dzisiejszych `slad`, potem KOREKTA po pierwszym przebiegu, który
wypisze rozjazdy) + 1 pełny audyt (~15 min) ×2. **Ryzyko:** deklaracja `regula:`
przepisana ze śladu, a nie zmierzona — dlatego pierwszy przebieg jest POMIAREM
deklaracji, nie dowodem; dowodem jest drugi, po korekcie. Drugie ryzyko: mutacja
zapalająca regułę 4 (generat nieaktualny) „przy okazji" — dziś maskowana przez
regenerację w `zPodmienionymi`; macierz ścisła to pokaże, jeśli gdzieś regeneracji
brakuje.

**WYNIK — ZROBIONE 2026-09-03 (kod po `/clear`, cztery kroki projektu co do punktu, jeden commit):**

| Krok | Skutek zmierzony |
|---|---|
| 1. strażnik | pomocnik `blad(nr, tekst)` zamiast `bledy.push` — **77 miejsc** (było „~60": licznik był z pamięci, `grep -c` dał 77); tablica **`REGULY`** (30 wpisów: 1–29 + 27b, z polem `warunkowa`) i **samokontrola przy starcie**: każdy numer ma nagłówek `/* ── N.` i odwrotnie, a `warunkowa` zgadza się z obecnością `pominiete.push` w sekcji (trzy testy negatywne: wpis bez sekcji, sekcja bez wpisu, `warunkowa` rozjechana — każdy kod 1); `--reguly` = JSON; `blad()` odrzuca numer spoza tablicy |
| 2. audyt | `regula:` w **131** mutacjach (liczba, `"27b"`, lista albo `{ nr, wymaga }` — reguła zapalająca się tylko przy materiale na gałęzi, np. 20 przy `re-audyt/ROLE.md`); parser `R<nr>:` z wyjścia; werdykt **„ZŁA REGUŁA"** przy zbiorze zapalonych ≠ zadeklarowanym (ŚCISŁA, rozstrzygnięcie 1), liczony jak „ZŁY ŚLAD"; deklaracje sprawdzane wobec `--reguly` PRZED pierwszą mutacją (literówka zatrzymuje od razu, nie po kwadransie); `slad` zostaje; jeden werdykt `ocen()` dla mutacji pliku, roli próbnej i zgłoszenia-śmiecia |
| 3. macierz | tylko pełny przebieg (rozstrzygnięcie 5): wiersz na regułę — mutacji zapalających, kontrprzykładów, pominiętych (`wymaga`), materiał z „pominięte — N." strażnika PRZED mutacjami (POMIAR); **kod 1** przy regule z materiałem bez mutacji (rozstrzygnięcie 2) i przy regule pytającej o zdanie (6, 10, 27, 27b) bez kontrprzykładu (rozstrzygnięcie 3); reguła pominięta dla części materiału, ale zapalona = „częściowo" |
| 4. mutacje | audyt **126 → 131**: rola próbna bez `KRYTYK.md` (→ R2), `AGENT.md` bez nagłówka „Moduł" (→ R3), z szablonu AGENT znika „Brak dowodu = brak zgłoszenia" (→ R6), kontrprzykład: to samo zdanie złamane w innym miejscu wiersza (R6), kontrprzykład: zasada Goldena złamana w innym miejscu wiersza (R10) |

**Dwa pełne audyty, jak zapowiadał projekt.** Pierwszy = POMIAR deklaracji: **8 rozjazdów
na 131**, wszystkie poprawione do stanu zmierzonego, nie odwrotnie:
- R20 zapala się „przy okazji" przy zepsutym zakresie działu w `audyt/ROLE.md` (Pogłębiacz
  traci odpowiednik) — dwie mutacje, deklaracja `{ nr: 20, wymaga: "re-audyt/ROLE.md" }`;
- R22 przy prefiksie `AUD` dla re-audytu (moduły 21 krytyków wskazują wtedy „cudzy" `REA`);
- R29 przy dwóch regresjach `zgloszenie.mjs`/`status.mjs` — `fala.mjs --test` pracuje na
  KOPII prawdziwych narzędzi, więc widzi to samo;
- **R4 przy nieznanym modelu i przy roli procesowej bez znacznika** — generator odmawia,
  generat zostaje stary. To dokładnie „drugie ryzyko" z projektu: macierz ścisła to
  POKAZUJE zamiast maskować; R21 zapala się obok z właściwym śladem, więc dowód stoi;
- **`status.mjs --test` NIE widzi zdjęcia sprawdzenia kodu pozycji** (`KOD_POZYCJI`) —
  zapala się wyłącznie R17 na podłożonym pliku stanu. Deklaracja zmniejszona do R17,
  luka samokontroli `status.mjs` ZAPISANA w komentarzu mutacji, nie naprawiona
  (pozycja 5 nie zmienia reguł ani narzędzi poza strażnikiem i audytem);
- R8 NIE zapala się przy zakresie ARCH zamienionym na prozę (mapa liczy resztę zakresów),
  R24 NIE zapala się przy bramce przepuszczającej niepewność (zły przykład SZABLONU
  goldena jest odrzucany także z innego powodu);
- ósmy rozjazd był mój: pseudo-mutacja zgłoszenia-śmiecia oddawała `trafiony` zamiast
  wyjścia strażnika, więc R5 stała w macierzy jako „BEZ MUTACJI" z kodem 1 — czyli
  bramka macierzy **zapaliła się na prawdziwym braku, zanim ktokolwiek napisał jej test
  negatywny**.
Drugi audyt = DOWÓD: **131 mutacji, 0 przeoczonych, 0 martwych, macierz 30/30 reguł
z mutacją, bez materiału 0, kod 0.** Reguły 2, 3 i 6 mają pierwszy w historii sektora
dowód testem negatywnym; 6 i 10 — pierwszy kontrprzykład.

**Znalezisko poza zakresem projektu, naprawione przy okazji (dotyczy audytu, nie reguł):**
kontrprzykład H1 „przesunięty numer linii w zgłoszeniu NIE zmienia hasha" wskazywał plik
`REA-SEC-001.json`, który od 4a nazywa się `REA-SEC-F1-001.json` — wracał „bez
materiału" z zielonym wynikiem, czyli **przechodził po pustce od 2026-09-02**. Ta sama
klasa w obu pomocnikach: `rolaZSzablonu` i `zPodmienionymi` oddawały przy mutacji, która
niczego nie zmieniła, `czerwony: false` — dla kontrprzykładu to zaliczenie po pustce.
Odtąd oba oddają `nicNieZmienila`, a werdykt liczy to jako „MUTACJA NIC NIE ZMIENIŁA"
dla OBU rodzajów; H1 ma `wymaga` (pominięty i policzony, nigdy cicho zielony).

**Dwie korekty liczb z projektu (pomiar, nie pamięć):** `bledy.push` było 77, nie „~60";
mutacji 125 + zgłoszenie-śmieć = 126 przed, 131 po (pięć nowych).

**Pułapki tej pozycji:** `${PIPESTATUS[0]}` w zsh jest puste (tu `pipestatus`) — kody
wyjścia mierzyć BEZ potoku, jak każe lekcja z D5; w mutacji roli próbnej `s.replace()`
bez trafienia nie ma objawu — stąd `nicNieZmienila` w pomocnikach.

**Trzeci pełny audyt — na GAŁĘZI AUDYTU (worktree, `git checkout <commit> -- audyt`)
— dołożył dwa rozjazdy, których gałąź re-audytu nie mogła pokazać:** R8 zapala się przy
zakresie ARCH zamienionym na prozę TYLKO bez `re-audyt/ROLE.md` (zakres Pogłębiacza ARCH
pokrywa te same 113 plików, więc na gałęzi re-audytu maskuje sieroty mapy), a R22 przy
prefiksie `AUD` dla re-audytu TYLKO z katalogiem `re-audyt/role`. Deklaracja dostała
symetryczne pole **`gdyBrak`** (reguła oczekiwana, gdy plik NIE istnieje) obok `wymaga`
— oba mierzą dysk, nie zgadują gałęzi. **Lekcja:** deklaracja zmierzona na jednej gałęzi
nie jest dowodem na drugiej; pozycja 5 wymaga pełnego przebiegu na OBU.

**Dowody na gałęzi re-audytu:** `git diff main --name-only -- . ':!audyt' ':!re-audyt'`
→ 0; strażnik sektora kod 0 (30 numerów w `--reguly`); audyt mutacyjny 131 / 0 / 0,
macierz 30/30, kod 0. **Na gałęzi audytu:** strażnik kod 0 (pominięte 7, 12, 20 —
sektor re-audyt), audyt mutacyjny 131 / 0 / 0, 7 mutacji pominiętych (`wymaga`),
macierz: 29 reguł z mutacją, R20 „bez materiału", R7 i R12 „częściowo" (strażnik
pomija sektor re-audyt, a mutacje zapalają je na audycie), kod 0 — patrz commit
przeniesienia na tej gałęzi.

**Czego pozycja 5 NIE zrobiła (zgodnie z projektem):** nie zmieniła żadnej reguły
merytorycznie (numeracja i komunikaty zostają, doszedł prefiks); nie ruszyła definicji
ról ani `ROLE.md`; nie zmieniła `wymaga` per mutacja; nie uruchomiła sektora; nie
naprawiła luki `status.mjs --test` (zapisana).

#### PAKIET E7.7, POZYCJE 4b + 6 — ZROBIONE 2026-09-02 w nocy, ZAŁOŻENIA POTWIERDZONE PRZEZ WŁAŚCICIELA 2026-09-03 („potwierdzam"; projekt niżej, wynik na końcu sekcji)

Obie pozycje dotykają TYCH SAMYCH 80 plików definicji (40 `AGENT.md` + 40 `KRYTYK.md`
obu sektorów) i obu szablonów, więc idą jednym przejściem skryptu (rozstrzygnięcie 6
właściciela przy pozycji 4). Stan „dziś" zmierzony:

| Co | Pomiar (2026-09-02) | Skutek |
|---|---|---|
| zdanie zakazu czytania innej fali | w **3 z 80** definicji (KIER, WER, SEC audytu — wzmianki, nie stałe brzmienie); w szablonach **0** | warstwa 1 ślepoty fali 2 nie istnieje; warstwy 2–4 (4a) działają bez niej, ale agent z `Read`/`Bash` nie ma w definicji ani słowa, że wpisów innej fali nie czyta |
| „K4′" w definicjach | **80 z 80** (m.in. pytanie 4 krytyka: „rozjedzie drugą falę (K4')") | definicje powołują się na rozstrzygnięcie, które właściciel ZASTĄPIŁ (K4″, REGULAMIN §15) |
| „swobodny przegląd nie da tego samego wyniku" | **27 plików** (26 AGENT.md + szablon AGENT.md) | zdanie znaczy dziś odwrotność K4″: lista jest sufitem, nie minimum |
| pozycja otwarta `<KOD>-90` | **0** w obu `ROLE.md` (audyt 183 pozycje, re-audyt 127) | „szukaj dalej w zakresie" nie ma gdzie wylądować; `KOD_POZYCJI` i `porownaj-cykle` (pozycja otwarta oznaczana) są już gotowe |
| ścieżka zgłoszeń w `KRYTYK.md` | **40 z 40** bez `F<N>` (szablon ma od 4a) | krytyk nie wie, że ocenia wpisy SWOJEJ fali; w worktree fali 2 i tak nie ma plików `-F1-`, więc to porządek, nie dziura |
| reguła 27 | zarezerwowana, nie istnieje | — |

**CO MA POWSTAĆ — pięć kroków, jedno przejście:**

1. **Szablony** (`szablony/AGENT.md`, `szablony/KRYTYK.md`): (a) nowa sekcja o stałym
   brzmieniu **„Fala, w której pracujesz"** — jedno zdanie zakazu:
   > Pracujesz w fali N i **nie czytasz wpisów, stanu ani wyników innej fali**:
   > `audyt/zgloszenia/*` z polem `fala` ≠ N, `audyt/stan/*-f<inna>-*`, `audyt/wyniki/`.
   > Re-audyt fali N czyta audyt fali N — to jego sens. Powód: K4″ — zgodność fal ma
   > być skutkiem znalezienia wszystkiego, nie odpisem cudzej listy.
   plus wariant dla KIER i RAP (obu sektorów): „po obu falach pracujesz w pełnym
   drzewie — porównanie i raport są o obu falach"; (b) zdanie w sekcji „Prompt" —
   „nie zachęcać do swobodnego przeglądu — swobodny przegląd nie da tego samego wyniku
   w drugiej fali (K4')" → **„Checklista jest MINIMUM (K4″): przechodzisz całą, a potem
   szukasz dalej w swoim zakresie z tym samym rygorem dowodu; znalezisko spoza listy
   zgłaszasz pod pozycją `<KOD>-90`"**; (c) w KRYTYK.md pytanie 4: „rozjedzie drugą
   falę (K4')" → „to wiersz do tabeli granic (KIER-04), nie powód odrzucenia";
   (d) ścieżka `F<N>` już jest (4a).
2. **80 definicji skryptem** (jednorazowy skrypt w `tools/` sektora, zostaje w repo
   jako dowód przejścia): to samo, co w szablonach, po DOSŁOWNYCH frazach; każdą frazę
   o innym brzmieniu skrypt WYPISUJE zamiast zgadywać — te poprawiam ręcznie. Do tego
   40 `KRYTYK.md`: ścieżka `<PREFIKS>-<KOD>-*.json` → `<PREFIKS>-<KOD>-F<N>-*.json`.
3. **Pozycja otwarta w `ROLE.md` obu sektorów + `AGENT.md`** (reguła 13 wymaga obu
   stron): wiersz `| <KOD>-90 | Co jeszcze w Twoim zakresie może skrzywdzić klienta,
   właściciela albo dane, a NIE stoi na tej liście? (K4″: lista = minimum) | zakres ×
   własny pomiar | miejsce + dowód jak przy każdej pozycji |` — dla **14 działów audytu
   i 14 Pogłębiaczy** (pytanie 1). `KOD_POZYCJI` (`\d{1,2}`) przyjmuje `90`,
   `porownaj-cykle` oznacza `-90` jako otwarte i porównuje tak samo (pozycja 2),
   `status.mjs --niedomkniete=SEC-90` przechodzi. Zdanie w `re-audyt/ROLE.md:81`
   („powtarzalność (K4') stoi na tym, że druga fala zadaje te same pytania") → K4″.
4. **Reguła 27** strażnika: każdy `AGENT.md`/`KRYTYK.md` (i oba szablony) niesie ZDANIE
   zakazu — konstrukcja reguł 6 i 10 (`\s+` zamiast spacji, granice `\p{L}`), pyta
   o rozstrzygnięcie („nie czytasz … innej fali"), nie o nagłówek sekcji.
   **Rozszerzenie reguły 7**: rola z listy z pytania 1 bez pozycji `<KOD>-90` = błąd.
   **Reguła 27b** (albo część 27): definicja nie niesie wycofanego zdania K4′
   „swobodny przegląd nie da tego samego wyniku" — to pytanie o obecność napisu, ale
   napis JEST rozstrzygnięciem, które właściciel zastąpił; kontrprzykład: słowo
   „swobodny" w innym zdaniu nie zapala.
5. **Mutacje** (audyt 116 → ~124): zdanie zakazu znika z szablonu AGENT (rola próbna),
   z szablonu KRYTYK, z jednej realnej definicji (`zPodmienionymi` na `SEC/AGENT.md`);
   kontrprzykład: inne łamanie wiersza zdania nie zapala; `SEC-90` znika z `ROLE.md`
   i `AGENT.md` naraz → reguła 7; `SEC-90` znika TYLKO z `AGENT.md` → reguła 13
   (istnieje — kontrprzykład na to, że 90 liczy się jak każda pozycja); K4′ wraca do
   szablonu AGENT → 27b; kontrprzykład: „swobodny" w innym zdaniu. Potem generat,
   trzy kontrole, przeniesienie na gałąź audytu (commit dotknie `re-audyt/`, więc znów
   `git checkout <commit> -- audyt`, nie cherry-pick — lekcja z 4a).

**PIĘĆ PYTAŃ DO WŁAŚCICIELA** (rekomendacja przy każdym; kod rusza po odpowiedziach
i po `/clear`):

1. **Kto dostaje pozycję otwartą `-90`?** (a) 14 działów audytu + 14 Pogłębiaczy
   re-audytu = 28 ról; (b) także role procesowe (KIER, GOLD, KON, WER, RAP, PSIARZ,
   SKUT, STRAZ, WALID). Rekomendacja: **(a)** — role procesowe mają przedmiot zamknięty
   (wyniki innych ról), a Konrad ma już własną pozycję o lukach (KON-A6).
2. **Brzmienie zakazu** — jedno zdanie jak w kroku 1(a), stałe co do słowa w 80
   plikach, z wyjątkiem dla KIER i RAP. Rekomendacja: przyjąć; reguła 27 pyta o to
   zdanie, więc każda odmiana brzmienia w jednej roli = czerwony strażnik (celowo).
3. **Czy zakaz wchodzi też do 40 `SKILL.md`?** Rekomendacja: **nie** — SKILL to
   procedura umiejętności, harness czyta AGENT/KRYTYK (generat); zakaz w dwóch plikach
   na rolę, nie w trzech.
4. **Czy 27b (zakaz wycofanego zdania K4′ w definicjach) ma być osobną regułą, czy
   wystarczy jednorazowe przejście skryptu bez strażnika?** Rekomendacja: **reguła** —
   szablony żyją dalej, a nowa rola pisana z pamięci E5 wniosłaby K4′ z powrotem bez
   objawu.
5. **Dokumenty historyczne** (`KRYTYKA-BUDOWY.md`, `WERYFIKACJA-PLANU.md`, sekcje
   E1–E7 tego pliku) wspominają K4′ jako fakt z tamtego dnia — zostają nietknięte
   (zapis historyczny) czy dostają dopisek? Rekomendacja: **zostają**; REGULAMIN §15
   już mówi, że K4″ zastępuje K4′.

**Czego 4b + 6 NIE robi:** nie zmienia narzędzi (poza strażnikiem i audytem); nie
rusza checklist poza dopisaniem `-90`; nie zmienia modeli ani zakresów; nie uruchamia
sektora.

**Koszt:** S–M (skrypt + ręczne poprawki odmiennych brzmień + regeneracja + jeden
pełny audyt mutacyjny ~15 min). Ryzyko: fraza o innym brzmieniu w którejś z 80
definicji przechodzi niezmieniona — stąd skrypt WYPISUJE nietrafione pliki, a reguła
27 i 27b mierzą skutek na każdym pliku, nie na szablonie.

**WYNIK — ZROBIONE (kod po `/clear`, wg sekcji projektu wyżej, jednym przejściem):**

**ZAŁOŻENIA POTWIERDZONE PRZEZ WŁAŚCICIELA 2026-09-03** („potwierdzam" po przedstawieniu
pięciu pytań z tabelą przyjętych odpowiedzi) — od tej chwili to ROZSTRZYGNIĘCIA, nie
założenia. Zapis historyczny: odpowiedzi na pięć pytań NIE były zapisane w repo ani
w checkpoincie sesji (ten kończył się na „Teraz odpowiedzi"), więc kod z 2026-09-02
poszedł po REKOMENDACJACH: (1) `-90` dla **28 ról działowych** (14 działów + 14
Pogłębiaczy), role procesowe bez; (2) **jedno stałe zdanie** zakazu, wyjątek KIER
i RAP obu sektorów jako DOPISEK (zdanie zostaje); (3) **bez `SKILL.md`**; (4) 27b jako
**reguła**; (5) dokumenty historyczne **nietknięte**. Każda inna odpowiedź jest małą
zmianą — skrypt przejścia jest idempotentny i wypisuje, czego nie trafił.

**Co powstało (pięć kroków projektu, jeden skrypt `audyt/tools/przejscie-4b6.mjs` —
zostaje w repo jako dowód; drugi przebieg nie zmienia nic, kod 0):**

| Krok | Skutek zmierzony (licznik skryptu) |
|---|---|
| 1. szablony | `AGENT.md`, `KRYTYK.md`: sekcja **„Fala, w której pracujesz"** (2), zdanie o MINIMUM w „Prompt" (1), pytanie 4 krytyka (1) |
| 2. 80 definicji | zakaz **80/80**; zdanie MINIMUM: audyt 19, Pogłębiacze 14, procesowe re-audytu 7 = **40/40**; „granica" (KON-A5) 19; pytanie 4 **40/40**; ścieżka `F<N>` + `stan/*-f<N>-<KOD>.json` **40/40** KRYTYK.md; KIER audytu: warstwa 1 → „reguła 27" |
| 3. pozycja otwarta | `<KOD>-90` w `audyt/ROLE.md` 14, `re-audyt/ROLE.md` 14, `AGENT.md` 28; zdanie `re-audyt/ROLE.md:81` → K4″ |
| 4. strażnik | **reguła 27** (zdanie zakazu w każdym AGENT/KRYTYK + oba szablony sprawdzane WPROST; pyta o zdanie „nie czytasz … innej fali", `\s+`), **27b** (żadna definicja — także SKILL.md — ani szablon nie niesie „swobodny przegląd nie da tego samego wyniku"), **rozszerzenie 7** (dział bez wiersza `-90` = błąd; pyta o WIERSZ TABELI, nie o wzmiankę) |
| 5. mutacje | audyt **116 → 126**: zakaz znika z szablonu AGENT (wprost) / z szablonu KRYTYK (rola próbna) / z `SEC/AGENT.md`; kontrprzykład: inne łamanie wiersza; `SEC-90` znika z obu plików → reguła 7; tylko z `AGENT.md` → reguła 13; K4′ wraca do szablonu AGENT → 27b; kontrprzykład: „swobodny" w innym zdaniu; K4′ wraca do `re-audyt/SEC/AGENT.md` (`wymaga`); `SEC-90` znika z obu plików re-audytu (`wymaga`) |

**Brzmienie zdania zakazu (stałe co do słowa w 82 plikach; reguła 27 pyta o nie):**
> Pracujesz w fali N i **nie czytasz wpisów, stanu ani wyników innej fali**:
> `audyt/zgloszenia/*` z polem `fala` ≠ N, `audyt/stan/*-f<inna>-*`, `audyt/wyniki/`.
> Re-audyt fali N czyta audyt fali N — to jego sens. Powód: K4″ — zgodność fal ma
> być skutkiem znalezienia wszystkiego, nie odpisem cudzej listy.

Dopisek KIER/RAP: „po obu falach pracujesz w pełnym drzewie — porównanie i raport są
o obu falach. W trakcie fali obowiązuje Cię zdanie wyżej." Zdanie MINIMUM dla działów
kończy się „znalezisko spoza listy zgłaszasz pod pozycją `<KOD>-90`"; dla ról
procesowych mówi wprost, że pozycji `-90` nie mają (przedmiot zamknięty).

**Pomiar po przejściu:** `K4'` w definicjach i szablonach: **0** (było 80 plików);
„swobodny przegląd nie da tego samego wyniku": **0** (było 27); zdanie zakazu: **82**
(80 + 2 szablony; było 3). Reszta wzmianek o K4′ żyje wyłącznie w dokumentach
historycznych (KRYTYKA-BUDOWY, WERYFIKACJA-PLANU, sekcje E1–E7 tego pliku, trzy
zapisy w STRUKTURA.md o niekasowaniu wpisów) — rozstrzygnięcie 5.

**Dwie pułapki pracy (kosztowały po minucie, trzy razy):** cudzysłów ASCII `"`
zamykający polski cytat „…" wewnątrz łańcucha JS albo Pythona w cudzysłowach to
`SyntaxError` — w łańcuchach używać `”` albo backticków; oraz `pgrep -f audyt-straznika`
trafia we WŁASNĄ powłokę (wzorzec stoi w linii komendy) — czytać wynik z `-a`
i odfiltrować `pgrep`/`zsh -c`, inaczej „audyt biegnie w tle" jest fałszywe.

**Dowody:** `git diff main --name-only -- . ':!audyt' ':!re-audyt'` → 0; strażnik
sektora kod 0 (29 numerów, 27 w dwóch częściach; „definicji ze zdaniem zakazu innej
fali: 82"); audyt mutacyjny **126 / 0 przeoczonych / 0 martwych** (pełny przebieg);
generat 80 definicji zgodny ze źródłem.

**Czego 4b + 6 NIE zrobiło (zgodnie z projektem):** nie zmieniło narzędzi poza
strażnikiem i audytem; nie ruszyło checklist poza dopisaniem `-90`; nie zmieniło modeli
ani zakresów; nie uruchomiło sektora.

#### PAKIET E7.7, POZYCJA 4a — ZROBIONA 2026-09-02 (kod po zielonym świetle „po clear kod")

Zakres wykonany co do punktu z sekcji projektu (warstwy 2–4 + „Poza tym" + `.gitignore`
+ mutacje); warstwa 1 (zdanie zakazu w 80 definicjach, reguła 27) czeka na 4b razem
z pozycją 6 — **numer 27 jest ZAREZERWOWANY** w strażniku i w STRUKTURA.md, żeby
słownictwo z rozstrzygnięć właściciela nie rozjechało się z kodem.

**Co powstało (warstwa po warstwie):**

- **Narzędzie (warstwa 2).** `zgloszenie.mjs`: identyfikator `<PREFIKS>-<DZIAŁ>-F<N>-<numer>`
  (`idZgloszenia(dzial, sektor, fala, istniejace)`, pula numerów PER FALA — fala 2 zaczyna
  od `001` niezależnie od liczby wpisów fali 1; stary format bez `F<N>` nie wchodzi do
  puli); po zapisie wyjście to DOKŁADNIE dwie linie (ID i hash) — samokontrola sprawdza
  KSZTAŁT wyjścia wzorcem, nie brak słowa; `--katalog=` i przebieg CLI w `--test` na
  katalogu tymczasowym (27 przypadków, było 18). Licznik i próg 200 przeniosły się do
  `status.mjs --pokaz` („ZGŁOSZEŃ W SEKTORZE: N (fala 1: a, fala 2: b)"). Trzy wpisy
  próbne przemianowane `git mv` na `-F1-` (pole `id` też; hash bez zmian; wzmianki
  o starych ID w prozie dowodów zostają jako historia). **Reguła 19′:** `F<N>` w nazwie
  = pole `fala`, wpis bez fali w nazwie = błąd.
- **Dysk (warstwa 3).** Nowe narzędzie **`fala.mjs --postaw=2 | --scal=2 | --test`**:
  worktree obok repo (`/home/krzysiek/Pod-strona-Szkolenia-fala-2`) na gałęzi
  `<sektor>/fala-2` od TEGO SAMEGO commita, sparse checkout non-cone
  `/*  !/audyt/zgloszenia/*-F1-*  !/audyt/stan/*-f1-*  !/audyt/wyniki/*`, generat
  i migawka w worktree (migawka ODZIEDZICZONA, gdy gałąź sektora ją ma — bo `galaz`
  w migawce zrobionej w worktree brzmiałaby inaczej i `--porownaj` meldowałby rozjazd);
  `--scal` wymaga czystego worktree i drzewa, merge, `git worktree remove --force`
  (wyłącznie z powodu nieśledzonego generatu `.claude/agents/`, po zmierzeniu czystości
  poza nim) i `git branch -d` (nie `-D` — git sam odmawia, gdy gałąź nie jest scalona; to
  dowód, nie sprzątanie). `--test` buduje TYMCZASOWE repo z kopią prawdziwych narzędzi
  i mierzy izolację PARĄ: `status.mjs --rola=SEC --fala=2` w pełnym drzewie → kod 1
  („widać falę 1"), w worktree → kod 0 (21 przypadków). **`status.mjs` odmowa 5**:
  wejście fali 2 (W TRAKCIE albo pierwsza runda) przy JAKIMKOLWIEK wpisie albo pliku
  stanu z POLEM `fala: 1` → odmowa z komendą `fala.mjs --postaw=2`; wyjątek KIER i RAP
  (rozstrzygnięcie 1); **wpis PRÓBNY fali 1 blokuje TAK SAMO** (rozstrzygnięte przy
  kodzie: jeden format, zero wyjątków — w worktree i tak go nie ma); KON fali 2 NIE jest
  wolny (kontrprzykład). `--test` 36 → 51 przypadków. **Reguła 28** (`git check-ignore
  --no-index` na ścieżkach-atrapach — tracked plik nie jest raportowany jako ignorowany,
  więc pomiar na prawdziwym pliku przechodziłby po pustce) i **reguła 29** (`fala.mjs
  --test`). `audyt/.gitignore` bez `stan/` i `migawki/`; cztery pliki stanu z prób
  i obie migawki weszły do gita.
- **Porównanie (warstwa 4).** `porownaj-cykle.mjs`: **PODEJRZENIE KOLEJNOŚCI** —
  identyczny zbiór hashy działu w tej samej kolejności zgłaszania (po numerach ID,
  ≥ 2 miejsca) w obu falach → nazwane na wyjściu i w JSON (`podejrzenie_kolejnosci:
  [działy]`), **kod 0** (rozstrzygnięcie 5); kontrprzykłady: ten sam zbiór w innej
  kolejności, jedno wspólne miejsce, NADZBIÓR — bez podejrzenia. Atrapy samokontroli
  przeszły na ID z falą.
- **Poza tym.** R5 czternastu Pogłębiaczy i `re-audyt/ROLE.md`: „lista klas z fali 1"
  → „lista klas z audytu TEJ fali" (15 plików). `szablony/KRYTYK.md`: moduł wskazuje
  `zgloszenia/<PREFIKS>-<KOD>-F<N>-*.json` i `stan/*-f<N>-<KOD>.json` (40 istniejących
  KRYTYK.md dostanie to w 4b jednym przejściem skryptu — dziś w worktree fali 2 i tak
  nie ma plików `-F1-`). `STRUKTURA.md`: układ (fala.mjs, stan/ i migawki/ w gicie),
  tabela kontroli (19′, 26, 27 zarezerwowana, 28, 29), decyzja o gicie przepisana
  z zapisem historycznym, odmowa 5, schemat „Kolejność sektorów" z worktree, „Ślepota
  fali 2 ma CZTERY warstwy" (z uczciwym zdaniem, że z trzech dawnych działała jedna).
  Procedura KIER obu sektorów (AGENT + SKILL): kroki „postaw worktree fali 2" i „scal
  po fali", licznik w `--pokaz`, pułapka „fala 2 bez worktree to fala 2 z dostępem do
  fali 1". Trzy goldeny (KIER ×2, WER) przesunięte na nowe numery tych samych linii
  (`status.mjs:270`, `zgloszenie.mjs:400`) — reguła 11 złapała przesunięcie od razu.

**Audyt mutacyjny 101 → 116** (0 przeoczonych, 0 martwych): licznik wraca do wyjścia;
ID bez fali; wspólna pula numerów; `status.mjs` wpuszcza falę 2 przy polu `fala: 1`;
`status.mjs` zwalnia z izolacji każdą rolę procesową; kontrprzykład brzmienia
komunikatu; `porownaj-cykle` przestaje nazywać kolejność; kolejność daje kod 1;
kontrprzykład brzmienia; `fala.mjs` bez wykluczeń; `fala.mjs` scala brudny worktree;
`stan/` wraca do `.gitignore`; wpis nazwany F1 z polem 2; wpis w starym formacie;
kontrprzykład F2/2. Atrapy audytu przeszły na ID z falą (reguła 19′ zapalałaby się na
`AUD-WER-998`).

**Trzy rzeczy zmierzone przy kodzie, nie wyprowadzone:**
1. **sparse checkout non-cone z wykluczeniami działa na tym gicie (2.55)** — pliki znikają
   z dysku, `git status` czysty, `git ls-files -v` pokazuje je jako `S` (skip-worktree);
   commit w worktree niesie je nietknięte, więc merge dodaje same nowe pliki;
2. **`git worktree remove` odmawia przy nieśledzonym generacie** `.claude/agents/`
   (pierwszy przebieg `--test` padł właśnie tu) — stąd `--force` po zmierzeniu czystości
   poza `.claude/`;
3. **`git check-ignore` bez `--no-index` NIE raportuje plików śledzonych** — reguła 28
   mierzona na prawdziwym `stan/*.json` byłaby ślepa, dopóki ktoś nie dodałby nowego.

**Pułapka pracy (kosztowała kilka minut):** `node -e "import('./audyt/tools/audyt-straznika-sektora.mjs')"`
URUCHAMIA cały audyt mutacyjny — moduł nie ma bramki głównego modułu, a `kill %1`
w zsh ubił tylko `head`, nie proces node; przez kilka minut audyt mutował pliki w tle,
a strażnik uruchamiany ręcznie „pokazywał" regresje, których nie było. Lekcja z pozycji 3
w ostrzejszej postaci: **zanim uruchomisz cokolwiek w `audyt/tools/`, sprawdź `pgrep
-f audyt-straznika`**. Moduł dostał bramkę `GLOWNY_MODUL` jak pozostałe narzędzia.

**Druga pułapka, którą złapał DRUGI pełny przebieg audytu (pierwszy był zielony):**
cztery mutacje goldenów miały wpisany literał `"linia": 471` — ówczesny numer linii
w `REGULAMIN.md`. Dopisanie trzech wierszy do §11 (format ID z falą) przesunęło szablon
goldena na 474, a mutacje trafiały odtąd w BLOK NEGATYWNY o starym numerze: niczego nie
psuły i meldowały „PRZEPUŚCIŁ" (3) i „ZŁY ŚLAD" (1). **Mutacja przypięta do WARTOŚCI
umiera po zmianie wartości** — nawrót lekcji z 0.35.0. Numer linii dobrego bloku jest
teraz czytany z treści goldena (`liniaDobregoBloku`, `przesunLinie`), bloki negatywne
„NIE ZGADZA" wskazują tę samą linię co blok dobry, a audyt dostał `--tylko=<regex>`
(przebieg celowany, wprost oznaczony jako NIE-dowód) — sprawdzenie poprawki jednej
rodziny trwa pół minuty zamiast piętnastu.

**Dowody:** `git diff main --name-only -- . ':!audyt' ':!re-audyt'` → 0; strażnik
sektora kod 0 (29 numerów, 28 czynnych); audyt mutacyjny 116 / 0 / 0 (pełny przebieg
po obu poprawkach); samokontrole: zgłoszenia 27/27, stan 51, porównanie fal,
fala.mjs 21.

**CO ZOSTAJE DO 4b (z pozycją 6):** zdanie zakazu w 80 definicjach (+ ścieżka
`F<N>` w 40 KRYTYK.md, którą szablon już ma), reguła 27 z mutacją „zdanie znika
z szablonu AGENT / KRYTYK" i kontrprzykładem innego łamania wiersza, regeneracja generatu.

#### PAKIET E7.7, POZYCJA 3 — ZROBIONA 2026-09-02 (projekt niżej zaakceptowany: „Tak, jedź"; wynik na końcu sekcji)

Cztery rzeczy zszyte w jedną, bo dotykają tego samego pliku. Każda ma źródło
w krytyce budowy potwierdzone przez sędziego; stan „dziś" zmierzony lekturą
`status.mjs` (cały plik) i `audyt/stan/*.json`:

| Co | Źródło | Stan dziś (zmierzony) |
|---|---|---|
| znaczniki czasu + odmowa re-audytu przed `ZAKOŃCZONE` audytu | B2 (W5, K9′) | KIER-05 wskazuje „dziennik wejść", którego NIE MA: pliki stanu bez pola czasu, `status.mjs` bez gałęzi egzekwującej kolejność |
| fala ∈ {1,2} | B11 | `Number(--fala ?? 1)` bez sprawdzenia — `--fala=3` tworzy `audyt-f3-SEC.json`, `--fala=abc` → `audyt-fNaN-SEC.json`, po cichu; `zgloszenie.mjs` falę waliduje, więc dwa narzędzia mają dwa rygory |
| drzewo wobec `glowa_main` | C4 | zakaz pisania po produkcie sprawdzany DOPIERO na końcu fali (reguła 1, migawka `--porownaj`); rola, która nadpisała plik w pierwszej godzinie, pracuje dalej cały dział |
| reguła 17 | B11 | sprawdza sektor, rolę, kody pozycji i rundę — falę pomija; kolejności i czasu nie zna |

**SZEŚĆ ROZSTRZYGNIĘĆ WŁAŚCICIELA (2026-09-02, pytania doprecyzowujące):**

1. **Blokada kolejności obejmuje WYŁĄCZNIE 14 działów, w tej samej fali.**
   Pogłębiacz `SEC` fali N nie wejdzie w `W TRAKCIE`, dopóki `audyt-fN-SEC`
   nie jest `ZAKOŃCZONE`. Role procesowe re-audytu (`KIER`, `KON`, `RAP`,
   `PSIARZ`, `SKUT`, `STRAZ`, `WALID`) są wolne — audytowy `KIER` kończy
   dopiero po całym audycie, więc blokada na nim zamroziłaby sektor. To
   ROZSZERZA wyjątek z B2 (tam tylko cztery role własne) — powód nazwany.
2. **Pełna historia przejść w pliku stanu:** `historia: [{status, runda, kiedy}]`
   dopisywana przy każdej zmianie + `kiedy` ostatniej zmiany. To jest nośnik
   KIER-05 („dziennik wejść") — jeden plik, nie druga kopia prawdy.
3. **Brak migawki `audyt/migawki/przed.json` = twarda odmowa** każdej zmiany
   statusu, z komendą `migawka-wartosci.mjs --zapisz=przed` w komunikacie.
   Zgodne ze STRUKTURA.md (migawka przed pierwszą falą); próby na sucho też
   zaczynają od migawki.
4. **Różnica drzewa produktu wobec `glowa_main` z migawki = odmowa zapisu
   statusu + lista zmienionych plików.** Sprawdzane: `git diff <glowa_main>
   --name-only -- . ':!audyt' ':!re-audyt'` ORAZ niezacommitowane poza
   sektorami i `.claude/`. Wobec commita PRZYPIĘTEGO w migawce, nie wobec
   ruchomego `main` — cudzy commit dependabota nie zatrzyma sektora.
5. **Reguła 17 pilnuje ZAWARTOŚCI plików stanu, nie narzędzia** (ta sama
   konstrukcja co reguły 5, 16, 17 dziś): fala ∈ {1,2}; `historia` niepusta,
   czasy ISO w porządku niemalejącym, ostatni wpis zgodny ze `status`/`runda`;
   dla 14 działów — `re-audyt-fN-<DZIAŁ>` ze statusem innym niż
   `NIE ROZPOCZĘTO` wymaga `audyt-fN-<DZIAŁ>` `ZAKOŃCZONE` z czasem
   WCZEŚNIEJSZYM niż wejście re-audytu.
6. **Cofnięcie statusu (np. `ZAKOŃCZONE` → `W TRAKCIE`) dozwolone i zapisane
   w historii — ODMOWA tylko dla działu audytu, do którego Pogłębiacz tej fali
   już wszedł** (jego plik ma status inny niż `NIE ROZPOCZĘTO`). Inaczej
   re-audyt pracowałby na dziale, który „jeszcze nie wyszedł", a W5 byłoby
   złamane po fakcie.

**Proponowany kształt (do akceptacji przed kodem):**

- `status.mjs`: czyste funkcje `powodyOdmowyStanu(stany, zmiana)` (kolejność,
  cofanie, fala) i `powodyOdmowyDrzewa(migawka, pomiar)` + samokontrola
  `--test` na atrapach (jak `zgloszenie.mjs`/`werdykt.mjs`); `--pokaz` drukuje
  `kiedy` i kod 1 przy wiszących bez zmian; każda odmowa podaje komendę naprawy.
- reguła 17 rozszerzona wg pkt 5 + **reguła 26**: `status.mjs --test` przechodzi
  (bliźniak reguł 9, 15, 25).
- mutacje: fala poza {1,2} przyjęta; historia bez czasu / czas nie-ISO / czasy
  malejące przyjęte; re-audyt wchodzi przed ZAKOŃCZONE audytu (plik podłożony);
  cofnięcie działu z Pogłębiaczem w środku przyjęte; brak migawki nie odmawia;
  różnica drzewa nie odmawia; **kontrprzykłady**: rola procesowa re-audytu bez
  odpowiednika NIE jest blokowana; cofnięcie działu BEZ Pogłębiacza przechodzi;
  plik `.claude/` nie liczy się jako różnica drzewa.
- **prostowanie trzech zdań** „`porownaj-cykle.mjs` bierze liczbę niedomkniętych
  do porównania fal" (`status.mjs` komentarz i komunikat, reguła 17 komentarz
  i komunikat, `STRUKTURA.md` akapit o `--niedomkniete`) — komunikat reguły 17
  jest śladem mutacji, więc ślad idzie razem ze zdaniem.
- KIER-05 w `audyt/ROLE.md` i `role/KIER/AGENT.md`: kolumna „dziennik wejść" →
  `status.mjs --pokaz` (historia); `STRUKTURA.md`: format pliku stanu
  z `historia`; `.claude/agents` regeneracja.
- **cztery lokalne pliki stanu z prób E6/E7.6** (poza gitem) dostają `historia`
  dopisaną ręcznie z adnotacją; atrapy `mutacjaStanu()` w audycie mutacyjnym
  dostają `historia`, inaczej istniejące kontrprzykłady zapaliłyby regułę 17.

**Kolizje sprawdzone (nic nie koliduje):** pozycja 2 czyta `stan/` po nazwie
pliku i polu `status` — oba bez zmian, nowe pola tylko dochodzą; pozycja 7
(re-audyt sekwencyjnie, „KIER-00 co musi stać") dostaje z pozycji 3 gotowy nośnik
kolejności; pozycja 6 nie dotyka `status.mjs`; `glowa_main` przypięty w migawce
chroni przed ruchem `main` (gałąź sektora nie niesie nowych commitów `main`, więc
diff wobec przypiętego commita zostaje 0).

**Czego pozycja 3 NIE robi:** nie zmienia `STATUSY` ani nazwy pliku stanu; nie
rusza `werdykt.mjs`, `zgloszenie.mjs`, `porownaj-cykle.mjs`; nie dotyka
definicji ról poza KIER-05 i szablonów (to pozycja 6); nie zmienia migawki.

**Koszt i ryzyko:** `status.mjs` dostaje cztery nowe powody odmowy, więc źle
zaprojektowana odmowa blokuje rolę i pali tokeny — dlatego każda odmowa drukuje
komendę naprawy, a samokontrola ma kontrprzykłady na role wolne od blokady.

**WYNIK POZYCJI 3 (2026-09-02) — wykonane co do punktu projektu wyżej:**

- `status.mjs` (155 → 514 linii): czyste `powodyOdmowyStanu()` (fala, kolejność
  sektorów, cofanie) i `powodyOdmowyDrzewa()` (migawka, przypięty commit, lista
  plików), `dopiszHistorie()`, `--pokaz --historia`, `--test` = **36 przypadków**
  (27 na czystych funkcjach + 9 przebiegów CLI na katalogu tymczasowym z migawką
  przypinającą bieżący `HEAD`). Wejście do działu = status inny niż
  `NIE ROZPOCZĘTO` **albo** pierwsza runda — `--runda` przed `--status` nie jest
  furtką obok blokady. Bramka głównego modułu (BLAD-014), pomiar drzewa `git`
  z listą argumentów, bez powłoki.
- **reguła 17** na zawartości plików stanu, własnym kodem (jak reguła 21):
  fala ∈ {1,2}, historia niepusta, czasy ISO niemalejące, ostatni wpis = stan
  (status, runda, kiedy), a dla 14 działów — Pogłębiacz, który wszedł, wymaga
  działu audytu tej fali `ZAKOŃCZONE` **z chwilą zakończenia wcześniejszą** niż
  jego wejście (początek ostatniej serii `ZAKOŃCZONE` w historii — łapie dział
  cofnięty po fakcie i domknięty ponownie, czego narzędzie odmawia, a plik
  podłożony ręcznie nie). **Reguła 26**: `status.mjs --test` (czwarty bliźniak
  9/15/25).
- **mutacje 79 → 101**: 7 na narzędziu (fala, kolejność, cofanie, brak migawki,
  różnica drzewa, `.claude/` liczone jako różnica, historia niedopisywana)
  + 1 kontrprzykład (inne brzmienie komunikatu), 10 na podłożonych plikach
  (w tym „audyt zakończył się PO wejściu re-audytu" na DWÓCH plikach naraz)
  + 4 kontrprzykłady (Pogłębiacz po wcześniejszym `ZAKOŃCZONE`; KIER re-audytu
  bez odpowiednika; cofnięcie bez Pogłębiacza; stan próbny wypisany po nazwie).
  Atrapa stanu wyprowadza historię z końcowego statusu, więc istniejące
  kontrprzykłady nie zapaliły reguły 17 na braku dziennika. Wynik: **101,
  0 przeoczonych, 0 martwych**; strażnik kod 0, diff wobec `main` poza
  sektorami 0.
- prostowanie trzech zdań o `porownaj-cykle` — `status.mjs` (komentarz
  i komunikat), reguła 17 (komentarz i komunikat), `STRUKTURA.md` — na
  „`porownaj-cykle.mjs` czyta z pliku stanu WYŁĄCZNIE `status`"; ślad mutacji
  `/nie jest kodem pozycji/` zachowany.
- KIER-05 w `audyt/ROLE.md` i `role/KIER/AGENT.md` wskazuje
  `status.mjs --pokaz --historia`; krok 4 `role/KIER/SKILL.md` i krok 1
  `re-audyt/role/KIER/SKILL.md` mówią, że narzędzie odmawia samo; generat
  80 definicji odświeżony i zgodny. `STRUKTURA.md`: format pliku stanu
  z historią i czterema odmowami, wiersz 26 w tabeli reguł, komenda
  `--pokaz --historia` w „Kto co uruchamia", migawka nazwana warunkiem zapisu.
- cztery lokalne pliki stanu z prób E6/E7.6 dostały `historia` (jeden wpis,
  czas = mtime), `kiedy`, `adnotacja` i **`proba: "E6"|"E7.6"`**.

**DWIE RZECZY ROZSTRZYGNIĘTE PRZY WYKONANIU (drobne, odwracalne):**
1. **Stan PRÓBNY.** Próba E7.6 przejechała Pogłębiacza SEC BEZ działu SEC
   audytu — dokładnie to, czego reguła 17 odtąd zabrania — więc plik
   `re-audyt-f1-SEC.json` zapalałby strażnika na zawsze. Zamiast kasować dowód
   próby, plik stanu dostał znacznik `proba` **o tej samej semantyce, co wpis
   próbny zgłoszeń**: wypada WYŁĄCZNIE spod kolejności sektorów, wszystkie
   pozostałe kontrole obowiązują, a strażnik wypisuje stany próbne po nazwie
   (nigdy cicho). `status.mjs` znacznika nie nadaje — to decyzja prowadzącego
   budowę, nie roli.
2. **Golden KIER** (audyt i re-audyt) wskazywał linię 39 `status.mjs`
   (`ostrzezenie` w `--pokaz`); po przepisaniu pliku linia jest 226 — numer
   przepięty, treść linii przywrócona co do znaku, hash bez zmian (H1).

**DWIE USTERKI STARSZE, znalezione przy okazji i naprawione:** tabela reguł
w `STRUKTURA.md` kończyła się na 22 przy nagłówku „dwadzieścia cztery" —
wiersze 23, 24, 25 z pozycji 1 i 2 nigdy do niej nie weszły (dopisane razem
z 26); wiersz 17 tej tabeli powtarzał nieprawdę o `porownaj-cykle`.

**LEKCJA TEJ POZYCJI (kosztowała jeden przebieg audytu, ~4 min):** audyt
mutacyjny robi na starcie KOPIĘ mutowanych plików (m.in. `audyt/ROLE.md`)
i przywraca ją w `finally` — edycja tych plików W TRAKCIE jego biegu zostaje
nadpisana bez objawu, a regeneracja generatu w trakcie zaburza pomiar reguły 21
(pierwszy przebieg: 1 „PRZEPUŚCIŁ" nie z winy strażnika). **Podczas audytu
mutacyjnego nie dotykać niczego w `audyt/`** — drugi przebieg, bez równoległych
edycji: 101/0/0.

#### PAKIET E7.7, POZYCJA 1 — ZROBIONA 2026-09-02 (hash miejsca, H1)

`hashMiejsca()` nie bierze już **numeru linii**: klucz to `plik + znormalizowana
treść linii` (forma liniowa) albo `plik + zakres + mechanizm` (forma mechanizmu).
Numer został w polu `miejsce.linia` i dalej jest weryfikowany wobec pliku przez
`zgloszenie.mjs` — jest **dowodem, nie kluczem**. Pomiar po zmianie: ta sama treść
pod linią 169 i 170 → **ten sam hash**; inna treść, inny plik i inna forma →
różne. Hashe trzech wpisów próbnych przeliczone (`REA-SEC-001`, `REA-SEC-002`
zmieniły się, `AUD-PIK-001` nie — to forma mechanizmu).

**Doszła reguła 23 strażnika:** hash wpisu musi zgadzać się z przeliczonym
z miejsca. Reguła 5 pytała tylko, czy hash JEST. To jest zarazem bramka na
regresję H1: powrót numeru linii do formuły zapala strażnika od razu, zamiast
czekać, aż porównanie fal ogłosi defekt audytu przy zgodnym wyniku.

**`polacz-sektory.mjs` wypisuje PARY KANDYDATÓW** — wpisy z tego samego pliku,
których hashe się różnią. Powód jest strukturalny: audyt opisuje miejsce formą
liniową (lektura), re-audyt często formą mechanizmu (pomiar), więc ich hashe
NIE MOGĄ być równe. Narzędzie ich nie scala (zgadywanie byłoby gorsze od
milczenia), tylko pokazuje człowiekowi, gdzie patrzeć.

**ZNALEZISKO PRZY OKAZJI — szablon goldena zgnił po cichu i nikt tego nie
pilnował.** Reguła 11 sprawdza goldeny RÓL; `szablony/golden.md`, z którego
powstaje golden każdej nowej roli, **nie był sprawdzany przez żadną regułę**.
Dopisanie sekcji K4″ do §15 regulaminu przesunęło wskazywaną w nim linię o 31
pozycji — strażnik był przy tym ZIELONY, a rozjazd wyszedł dopiero z audytu
mutacyjnego, gdy mutacja zbudowała rolę próbną z tego szablonu. Czyli przez
przypadek, nie przez bramkę. **Doszła reguła 24**: szablon goldena przechodzi
przez tę samą funkcję `powodyOdmowy()`, co goldeny ról.

Audyt mutacyjny **68 → 73**: powrót numeru linii do klucza, klucz bez treści
linii, kontrprzykład „przesunięty numer linii w zgłoszeniu NIE zmienia hasha"
(dowód H1 od drugiej strony) oraz dwie mutacje szablonu goldena.
Dowody: strażnik **24 kontrole**, kod 0; mutacje **73** (0 przeoczonych,
0 martwych); `zgloszenie.mjs --test` 18/18; `werdykt.mjs --test` 13/13;
mapa bez sierot; niezmiennik 0.


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
