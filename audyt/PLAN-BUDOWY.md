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
| **E8** — STOP | ⬜ | **zielone światło właściciela** przed uruchomieniem. Trzy polecenia z 2026-09-02 WYKONANE; po krytyce **sześć rozstrzygnięć właściciela** i **pakiet roboczy E7.7 (8 pozycji; zrobione 8, 1, 2, 3, 4a)** — sekcja „SZEŚĆ ROZSTRZYGNIĘĆ WŁAŚCICIELA PO KRYTYCE" niżej. **NAJWAŻNIEJSZE: K4″ zmienia sens powtarzalności** (agenci mają znaleźć wszystko; zgodność fal = skutek, nie ograniczenie) |

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
| 4 | zakaz czytania wyników fali 1 w szablonach + reguła + mutacja; numeracja zgłoszeń per fala | **4a ✅ 2026-09-02** — ID `AUD-SEC-F2-001` (pula per fala), `zgloszenie.mjs` bez licznika, `status.mjs` odmowa 5 (izolacja fali 2 po POLU), `porownaj-cykle` PODEJRZENIE KOLEJNOŚCI (kod 0), **`fala.mjs --postaw=2 \| --scal=2`** (worktree + sparse checkout), `stan/` i `migawki/` w gicie, reguły 19′/28/29 (**27 zarezerwowana**), R5 „z audytu tej fali", STRUKTURA i KIER obu sektorów; mutacje 101 → **116**; szczegóły w sekcji „POZYCJA 4a — ZROBIONA" niżej. **4b** (zdanie zakazu w 80 definicjach + reguła 27) ⬜ razem z pozycją 6 |
| 5 | macierz reguła → mutacja w audycie mutacyjnym (`wymaga` dla reguł warunkowych) | ⬜ |
| 6 | K4″ w szablonach i 40 definicjach ról: lista = minimum, pozycja otwarta `<KOD>-90`, regeneracja generatu | ⬜ |
| 7 | re-audyt sekwencyjnie: zapis w `STRUKTURA.md`/KIER, `KIER-00` „co musi stać", migawka z licznikami tabel WP, przywracanie ze zrzutu | ⬜ |
| 8 | test aliasu `fable` po restarcie sesji (`aud-kier`: nazwa modelu) | ✅ **2026-09-02, po restarcie:** `aud-kier` zameldował dosłownie „You are powered by the model named Fable 5.1. The exact model ID is claude-fable-5-1". **Koszt faktu:** wywołanie bez ani jednego narzędzia = **142 tys. tokenów** — tyle waży samo wejście roli (definicja + kontekst); przy 80 agentach × 2 fale to ~23 mln tokenów SAMYCH wejść, zanim ktokolwiek otworzy plik |

Poza pakietem, do osobnej zgody na koszt: próba sucha kierownika (F17, ~1 mln
tokenów). Pozostałe propozycje tabeli F (A2–A5, C1, C5, F9, F19, F20) — po pakiecie,
wg uznania właściciela.

**NASTĘPNY KROK: pozycja 4b RAZEM z pozycją 6** (zdanie zakazu czytania innej fali w 80 definicjach + reguła 27 + K4″: lista = minimum, pozycja otwarta `<KOD>-90`, regeneracja generatu) — wg reguły właściciela z 2026-08-28 najpierw plan przebiegu + pytania doprecyzowujące, potem kod; potem pozycje 5 i 7. Zapis historyczny: „KOD pozycji 4a — od pierwszej komendy nowej sesji, bez pytania o zgodę" — WYKONANE 2026-09-02 (sekcja „POZYCJA 4a — ZROBIONA" niżej). Lekcja z pozycji 3 obowiązuje dalej: **nie edytować `audyt/` w trakcie audytu mutacyjnego** — i sprawdzać `pgrep -f audyt-straznika`, zanim uruchomi się cokolwiek w `audyt/tools/`.
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

**Dowody:** `git diff main --name-only -- . ':!audyt' ':!re-audyt'` → 0; strażnik
sektora kod 0 (29 numerów, 28 czynnych); audyt mutacyjny 116 / 0 / 0; samokontrole:
zgłoszenia 27/27, stan 51, porównanie fal, fala.mjs 21.

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
