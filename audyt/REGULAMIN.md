# Regulamin sektora AUDYT i sektora RE-AUDYT

**Źródło: opis właściciela z 2026-09-01** (16 punktów + schemat struktury), uzupełniony
o rozstrzygnięcia z tej samej rozmowy. Ten plik jest **utrwaleniem** — powstał na wprost
wyrażone polecenie:

> „CHCĘ ABYŚ WSZYSTKIE TE INFORMACJE TRWALE ZAPISAŁ (…) CAŁY TEN PLAN DOBRZE ZAPISZ,
> UTRWAL GO"

Zapisy właściciela są tu oddane **wiernie**. Miejsca, w których agent coś doprecyzował,
są oznaczone jako *doprecyzowanie*. Nic tutaj nie jest zgadywaniem.

---

## 1. Cel

Stworzyć **audyt jako osobny sektor całego projektu**, podzielony na wyspecjalizowane
działy/agentów, z własną walidacją — oraz **osobny sektor RE-AUDYT**, który wchodzi po
audycie.

## 2. Główna idea

> **AUDYTOR WYKRYWA → WERYFIKATOR POTWIERDZA → KIEROWNIK ZBIERA → GOLDEN PILNUJE PROCESU
> → RE-AUDYT (OSOBNY SEKTOR) SPRAWDZA SZCZEGÓŁOWO**

## 3. Idea nadrzędna

Audyt jest jednym z sektorów całej układanki projektu. Wewnątrz sektora powstaje
mini-automatyzacja audytowa złożona z wyspecjalizowanych agentów. Każdy agent ma własny
zakres odpowiedzialności, a komunikacja odbywa się zgodnie z ustalonym schematem.

- Wszyscy uczestnicy procesu są audytorami, ale każdy audytor ma **inny zakres**.
- **Kierownik jest najważniejszą rolą audytu** i koordynuje całość.
- Audyt ma rozumieć **projekt jako całość**, a nie tylko pojedyncze pliki.
- Audytorzy pracują konkretnie: wykazują problem, jego miejsce, dowód i znaczenie —
  nie zostawiają użytkownikowi zadania w stylu „sprawdź sobie sam".
- Ważne decyzje i wyniki kończą się **raportem**.

### ZASADA GOLDEN
> **Audyt nie ma wymyślać błędów. Każdy zgłoszony problem musi mieć podstawę
> i możliwość potwierdzenia.**

### ZASADA PARY (WYTYCZNE N1)
> **Każdy agent ma krytyka i każdy audytor ma krytyka.** Bez wyjątków — dotyczy też
> Konrada, weryfikatora, raportu, kierowników i Goldena.

---

## 4. Struktura audytu

Struktura odwzorowuje schemat przysłany przez właściciela, **doprecyzowany pod ten
projekt**: siedem działów ze schematu i siedem działów naszych.

```
                        ┌──────────────────────────────┐
                        │      AUDYTOR KIEROWNIK       │
                        │  koordynuje, zbiera wyniki   │
                        └───────────────┬──────────────┘
     ┌────────────────┬─────────────────┼─────────────────┬────────────────┐
┌────┴─────┐    ┌─────┴─────┐    ┌──────┴─────┐    ┌──────┴──────┐  ┌──────┴──────┐
│ SECURITY │    │ FRONTEND  │    │  BACKEND   │────│ BAZA DANYCH │  │  ARCHITEKT  │
└────┬─────┘    └─────┬─────┘    └──────┬─────┘    │ + migracja  │  └──────┬──────┘
     │                │                 │          └─────────────┘         │
┌────┴───────┐  ┌─────┴──────┐   ┌──────┴──────────┐              ┌────────┴───────┐
│ PRYWATNOŚĆ │  │  PROTOTYP  │   │   INTEGRACJE    │              │  PRAWDA REPO   │
│ i zgodność │  │  Next.js   │   │ z cudzym kodem  │              └────────────────┘
└────────────┘  └────────────┘   └─────────────────┘
                                                                  ┌────────────────┐
┌──────────────┐   ┌──────────────┐   ┌──────────────┐            │    POCZĄTEK    │
│ QA / TESTING │───│ USPRAWNIENIA │   │ PERFORMANCE  │            │   I KONIEC     │
└──────────────┘   │  AUDYTOWE    │   └──────┬───────┘            └────────────────┘
                   └──────────────┘          │
                                   ┌─────────┴──────────┐
                                   │ WDROŻENIE          │
                                   │ i eksploatacja     │
                                   └────────────────────┘

  ╔═══════════════════════════╗          ╔══════════════════════════╗
  ║ AGENT KONRAD              ║          ║ GOLDEN                   ║
  ║ łamie założenia DZIAŁÓW   ║          ║ pilnuje zasad i skilli   ║
  ║ AUDYTU (nie projektu)     ║          ╚══════════════════════════╝
  ╚═══════════════════════════╝

- - - - - - - - - - - - -  POZA AUDYTEM  - - - - - - - - - - - - - - - - - - - -
                 ┌──────────────────────────────┐
                 │     AUDYTOR WERYFIKATOR      │  sprawdza, czy problem istnieje
                 └───────────────┬──────────────┘
                 ┌───────────────┴──────────────┐
                 │       AUDYTOR RAPORTU        │  raport na sam koniec, gdy
                 └──────────────────────────────┘  wszystkie działy skończą pracę
```

**Siedem ze schematu:** Security · Frontend · Backend · Baza danych · QA/Testing ·
Performance · Architekt.

**Siedem naszych (spersonalizowanych pod ten projekt):** Integracje z cudzym kodem ·
Prywatność i zgodność · Prawda repo · Wdrożenie i eksploatacja · Prototyp Next.js ·
Początek i koniec · Usprawnienia audytowe.

---

## 5. Pięć obowiązkowych elementów każdego audytora

Każdy agent audytowy jest osobną jednostką z jasno określonym zakresem. Dla każdego
ustawiamy pięć rzeczy:

| # | Element | Znaczenie |
|---|---|---|
| 1 | **Własny context** | informacje potrzebne do swojego zakresu |
| 2 | **Własne ograniczenia** | jasno określone granice odpowiedzialności |
| 3 | **Własny moduł** | obszar audytu, w którym działa |
| 4 | **Własny prompt / promotor** | instrukcja prowadząca jego pracę |
| 5 | **Własne narzędzia** | dobrane do jego zadania |

> **ZASADA:** agent ma rozumieć projekt, ale jednocześnie **nie może tracić swojej
> granicy odpowiedzialności**.

## 6. Statusy pracy agenta

| Status | Znaczenie |
|---|---|
| NIE ROZPOCZĘTO | agent nie rozpoczął jeszcze audytu |
| W TRAKCIE | agent analizuje swój zakres |
| DO WERYFIKACJI | agent wykazał problem wymagający potwierdzenia |
| ZWERYFIKOWANE | problem został potwierdzony lub odrzucony |
| ZAKOŃCZONE | agent zakończył swój zakres |

---

## 7. Zasada zakresu odpowiedzialności

Każdy audytor odpowiada za swój dział. Jeżeli np. Security znajdzie błąd, **pracuje nad
nim w swoim zakresie** i nie przekazuje go innemu audytorowi tylko dlatego, że problem
dotyka innego obszaru. Komunikacja między działami służy **zrozumieniu zależności**,
a nie przerzucaniu odpowiedzialności.

> **AUDYTOR MA ŁAMAĆ ZAŁOŻENIA, NIE WYMYŚLAĆ BŁĘDÓW.**

Przykład właściciela: audytor bezpieczeństwa może sprawdzać scenariusz „co, jeśli baza
danych nie odpowiada" — czyli łamać założenia systemu z perspektywy bezpieczeństwa
i odporności. **To robią działy w swoich zakresach**, nie Konrad.

### Doprecyzowanie właściciela (2026-09-01)
> „JAK SECURITY ZNAJDZIE BŁĄD, TO ON MA NAD NIM PRACOWAĆ, NIE PRZESYŁA TEGO DALEJ,
> ALE NIE NAPRAWIA GO — TYLKO SZUKA GŁĘBIEJ I POKAZUJE ODIZOLOWANĄ LINIJKĘ KODU,
> GDZIE TEN BŁĄD SIĘ ZNAJDUJE. CZYLI BADA GŁĘBIEJ."

## 8. Agent Konrad

Wyspecjalizowany agent, który próbuje **podważyć założenia działów** i sprawdza, czy
system zachowuje się poprawnie także w sytuacjach, których nie zakłada podstawowy
scenariusz. Nazwa „Konrad" została nadana po to, żeby nie mylił się z pozostałymi
audytorami. Działa **niezależnie od audytorów działowych**.

### Rozstrzygnięcie właściciela (2026-09-01) — P1
> „Agent Konrad ma łamać założenia **w audycie, nie w projekcie**. On jest od sprawdzania
> projektu audyt — czyli np. ma próbować złamać założenia działu Security **w audycie**."

**Konrad audytuje AUDYT.** Jego produktem są **luki w audycie**, nie błędy w produkcie.

---

## 9. Audytorzy od środka — zakresy

| Obszar | Zakres |
|---|---|
| Architektura | struktura systemów, granice, odpowiedzialności, błędy wzorców, niewłaściwe zależności, przepływ danych |
| Security | założenia bezpieczeństwa i próby obejścia zabezpieczeń |
| Backend | backend oraz połączenie z bazą danych |
| Baza danych | obszar bazy danych powiązany z backendem |
| Frontend | warstwa frontendowa |
| QA / testing | zachowanie i poprawność działania |
| Performance | obszar wydajności |
| Architekt | konstrukcja systemu, granice i zależności |
| Weryfikacja | czy zgłoszony problem rzeczywiście istnieje |
| Agent Konrad | podważanie założeń i sytuacje graniczne, niezależnie od audytorów działowych |

> **ZASADA NADRZĘDNA:** audytorzy muszą **rozumieć projekt**. Nie wystarczy znajomość
> pojedynczego fragmentu kodu.

---

## 10. KROK 1 — NAJWAŻNIEJSZY: komplet dokumentacji przed audytem

Audyt ma dostęp do całego projektu oraz do dokumentacji dobranej do rodzaju agenta.

| # | Rodzaj | Rola w audycie |
|---|---|---|
| 1 | Dziedzinowa | wiedza domenowa potrzebna do zrozumienia obszaru |
| 2 | Techniczna | dokumentacja technologii/platformy, dobierana zależnie od miejsca audytu |
| 3 | Projektu | cały projekt, który jest audytowany |
| 4 | Funkcjonalna | opis funkcji i zachowania systemu |
| 5 | Specjalistyczna | dla agenta, który robi więcej lub działa inaczej niż inni w dziale |
| 6 | Systemowa | desktop, mobile i inne środowiska w zakresie |
| 7 | Agentowa | materiały o AI/agentach, żeby agenci lepiej wykonywali zadania |

> **DOKUMENTACJA JEST WEJŚCIEM DO AUDYTU.** Najpierw agent ma wiedzieć, co i w jakim
> kontekście audytuje.

**Rozstrzygnięcia właściciela (2026-09-01):**
- **P3** — dokumentacja specjalistyczna **nie tylko dla Konrada**: „na pewno znajdzie się
  agent, który będzie potrzebował czegoś więcej".
- **P4** — dokumentacja agentowa **z wielu AI**, nie tylko Anthropic: także ChatGPT,
  Gemini i inne.
- **D3** — **krytycy dostają wszystkie 7 rodzajów dokumentacji**, tak samo jak agenci
  i audytorzy, i mają wiedzieć wszystko o projekcie.

---

## 11. Błędy, dowody, statusy i raportowanie

Każdy wykazany i przesłany do weryfikacji błąd ma **kod potwierdzenia** — najlepiej
realizowany **funkcją kodu**. Kod nie jest ozdobnikiem: ma jednoznacznie wiązać zgłoszenie
z tym, co agent faktycznie wykrył. Format: `AUD-SEC-F1-001` (AUD = audyt, SEC = dział,
F1 = fala, 001 = numer zgłoszenia w obrębie działu i fali). *Człon fali doszedł
2026-09-02 (pakiet E7.7, pozycja 4, rozstrzygnięcie 2 właściciela): numer ciągły
w dziale zdradzał fali 2 liczbę znalezisk fali 1; pierwotny zapis brzmiał
`AUD-SEC-001`.*

### Minimalny standard raportu audytora

| Pole | Zawartość |
|---|---|
| AUDYT | wersja kodu / zakres audytu |
| DZIAŁ | np. Security, Backend, Frontend |
| AGENT | konkretna rola agenta |
| STATUS | aktualny status pracy |
| PROBLEM ID | kod potwierdzenia problemu |
| STWIERDZENIE | jednoznaczny opis tego, co wykryto |
| DOWÓD | co potwierdza wykrycie |
| KLASYFIKACJA | kategoria problemu |
| WERYFIKACJA | wynik niezależnego sprawdzenia |
| RAPORT KOŃCOWY | podsumowanie działu przekazane kierownikowi |

> **STANDARD:** NIE: „wydaje mi się, że jest błąd". TAK: konkretne stwierdzenie + dowód
> + kod + status.

> **RAPORT KOŃCOWY POWSTAJE, GDY AUDYTORZY ZAKOŃCZĄ SWOJE ZAKRESY I WYNIKI ZOSTANĄ
> ZEBRANE.**

---

## 12. Golden — kontrola jakości pracy agentów

Golden jest warstwą kontrolną pilnującą jakości pracy agentów. Jest obecny podczas audytu
i reaguje, gdy agent powinien skorzystać z odpowiedniego skilla.

- Golden pilnuje, aby agent użył **właściwego skilla**.
- Jeżeli w dziale istnieje ważna umiejętność, powinna mieć przypisany skill.
- Golden przypomina agentowi o właściwym skillu w odpowiednim momencie.
- Golden pilnuje, aby przy naprawianiu błędu **nie zostało zepsute coś innego**.
- Golden może być dodatkową warstwą kontroli przed uznaniem zadania za zakończone.

> **GOLDEN NIE ZASTĘPUJE AUDYTORA. PILNUJE PROCESU, ZASAD I UŻYCIA WŁAŚCIWYCH
> UMIEJĘTNOŚCI.**

### Zasady Golden — wersja skrócona

1. Nie dopuszczaj do wymyślania błędów.
2. Pilnuj, aby agent działał w swoim zakresie.
3. Przypominaj o właściwym skillu, gdy jest potrzebny.
4. Pilnuj, aby znaleziony problem miał podstawę i kod potwierdzenia.
5. Kontroluj status audytora i przejście do weryfikacji.
6. Przy naprawie pilnuj, aby nie uszkodzić innych obszarów.
7. Wspieraj strażników tam, gdzie znany problem może wrócić.
8. Pilnuj rozdzielenia audytu i re-audytu (osobne sektory).
9. Pilnuj porównania wartości początku i końca.
10. Nie uznawaj procesu za zakończony bez raportu i weryfikacji.
11. Pilnuj, aby Agent Konrad działał niezależnie od audytorów działowych.
12. Pilnuj kolejności: AUDYT #1 → RE-AUDYT #1 → AUDYT #2 → RE-AUDYT #2 → porównanie →
    naprawa → KONIEC.
13. Po naprawie nie dopuszczaj do uruchamiania kolejnych audytów ani re-audytów w tym cyklu.

---

## 13. Przykładowe skille agentów

| Dział / rola | Skill | Cel |
|---|---|---|
| Security | `security-audit` | audyt bezpieczeństwa w zakresie agenta Security |
| Backend | `backend-audit` | audyt backendu |
| Frontend | `frontend-audit` | audyt frontendu |
| QA / testing | `qa-testing-audit` | zadania QA/testing |
| Performance | `performance-audit` | obszar wydajności |
| Architekt | `architecture-audit` | struktura, granice i zależności |
| Weryfikator | `audit-validation` | potwierdzanie lub odrzucanie zgłoszonych problemów |
| Agent Konrad | `assumption-breaker` | podważanie założeń i sytuacje graniczne |
| Golden | `golden-guard` | kontrola zasad i użycia właściwego skilla |
| Re-audyt | `re-audit` | szczegółowa ponowna weryfikacja po audycie |

---

## 14. Przebieg audytu i re-audytu

```
1. NAJNOWSZY KOD W REPOZYTORIUM   — punkt wyjścia całego procesu
2. AUDYT #1                        — pełny audyt sektora i działów
3. RE-AUDYT #1                     — szczegółowa weryfikacja, OSOBNY SEKTOR
4. AUDYT #2                        — ponowny pełny audyt na TYM SAMYM kodzie
5. RE-AUDYT #2                     — ponowna szczegółowa weryfikacja, OSOBNY SEKTOR
6. PORÓWNANIE WYNIKÓW              — Audyt #1 + Re-audyt #1  vs  Audyt #2 + Re-audyt #2
7. TE SAME BŁĘDY?                  — TAK → przejdź do naprawy
8. NAPRAWA                         — potwierdzone błędy zostają naprawione
9. KONIEC                          — po naprawie NIE wykonujemy kolejnych audytów
                                     ani re-audytów w tym cyklu
```

### Zasada wersji kodu
- Audyt wykonuje się na **najnowszej wersji kodu w repozytorium**.
- Przykład: jeżeli repozytorium ma wersję 5.0, audyt wykonuje się na aktualnym kodzie
  tej wersji.
- Naprawa kończy cykl.

### Kolejność wejścia do działów (rozstrzygnięcie właściciela, 2026-09-01)
> „Idzie audyt do projektu i audyt jest w pierwszym dziale, i jak audyt wyjdzie
> z pierwszego działu — re-audyt wchodzi do 1. działu. **Nigdy nie mogą iść razem.**
> Re-audyt jest krokiem do tyłu."

**K9′:** działy **mogą pracować równolegle między sobą**, byle audyt i re-audyt **nie
nakładały się na tym samym dziale**.

---

## 15. Test powtarzalności

Uruchomienie pełnego cyklu (audyt + re-audyt) **dwa razy**, żeby sprawdzić, czy pokazują
się te same błędy.

- AUDYT #1 + RE-AUDYT #1 na tej samej wersji kodu.
- AUDYT #2 + RE-AUDYT #2 **bez wprowadzania zmian do kodu**.
- Porównanie list wykrytych problemów z obu cykli.
- Sprawdzenie, czy drugi cykl nie dodaje nowych problemów bez podstawy.
- Jeżeli wyniki są zgodne — błędy uznajemy za potwierdzone i przechodzimy do naprawy.

> **CEL CYKLU:** sprawdzić, czy audyt jest **stabilny i powtarzalny**.

### Rozstrzygnięcie właściciela (2026-09-01) — K4′
> „Druga fala **musi** dać ten sam wynik. Jeśli nie da, to znaczy, że **źle zrobiliśmy
> audyt**."

Rozbieżność między falami **nie jest powodem do odrzucenia znaleziska** — jest sygnałem
**defektu sektora audytu**. Wracamy naprawić audyt i powtarzamy.

### Konsekwencja dla budowy wszystkich ról (*doprecyzowanie agenta, zatwierdzone*)
> **Audyt nie może być swobodnym przeglądem — musi być listą sprawdzeń.**

- zakres definiowany **mechanicznie** (lista plików/wzorców, nie „przejrzyj obszar");
- kryteria znaleziska **twarde** (checklista pytań tak/nie, nie intuicja);
- agent pętlowy kończy, gdy **przeszedł całą listę**, nie gdy „nic mu już nie przychodzi
  do głowy";
- dowód = **hash miejsca**, więc porównanie fal jest maszynowe, nie uznaniowe.

Wyniki obu przebiegów przechowujemy, żeby dało się wykazać powtarzalność.

### Rozstrzygnięcie właściciela (2026-09-02) — K4″, zastępuje odczyt K4′ z 2026-09-01

Dosłownie:
> „Nie chodzi nam o to, żeby audyt i re-audyt był zrobiony tak, aby znalazł te same
> błędy co druga fala. To ma się stać samo: po prostu wykryją wszystkie, jakie są
> w projekcie, i więcej błędów nie będzie, więc 2. fala da ten sam wynik, bo też
> wykryje błędy. Nie chcemy zrobić tak specjalnie, aby 2 fale dały ten sam wynik
> dzięki temu, że zmieniamy pracę agentów. **Agenci mają znaleźć wszystko** i dlatego
> 2. fala ma mieć te same błędy w raporcie, bo też znajduje wszystko. Nie chodzi nam
> o to, aby audyt i re-audyt był tak zrobiony, aby dawał te same odpowiedzi zawsze."
>
> „Raporty z dwóch fal mają być dla nas na zapoznanie się. Nieważne, czy to będą
> zgodne wyniki, czy nie — to my dalej nad nimi pracujemy, a narzędzie tak może to
> nazywać: nadzbiorem czy sprzecznością."

Co z tego wynika dla budowy (wiążące):

- **Powtarzalność NIE jest celem budowy ani ograniczeniem pracy agenta.** Zgodność fal
  ma być SKUTKIEM tego, że obie znalazły wszystko — nie skutkiem tego, że obie
  dostały tę samą listę i nic poza nią.
- **Checklista jest MINIMUM, nie sufitem.** Agent przechodzi całą listę (to zostaje —
  bez tego nie da się zmierzyć, czy nic nie pominął), a potem **szuka dalej w swoim
  zakresie** wszystkiego, co mogłoby skrzywdzić, z tym samym rygorem dowodu.
  Zdanie „audyt nie może być swobodnym przeglądem — musi być listą sprawdzeń"
  z doprecyzowania poniżej traci moc jako OGRANICZENIE; zostaje jako opis minimum.
- **Rozjazd fal nie zatrzymuje procesu i nie jest z definicji defektem audytu.**
  Narzędzie porównania NAZYWA wynik (zgodne / nadzbiór / sprzeczne), raporty obu
  fal idą do właściciela do lektury, a decyzja, co z rozjazdem, należy do niego.
- Mechaniczny zakres, twarde kryteria dowodu i hash miejsca ZOSTAJĄ — służą
  sprawdzalności każdego zgłoszenia, nie wymuszaniu zgodności.

---

## 16. Walidacja — osobny dział sektora audytu

Walidacja jest osobnym działem. Jej zadaniem jest sprawdzenie tego, co wykryli inni
audytorzy. Weryfikator (audytor **poza audytem**) sprawdza, czy problem istnieje — dzięki
temu agent wykrywający problem nie jest jedyną osobą, która uznaje go za prawdziwy.
**Walidacja występuje zarówno w audycie, jak i w re-audycie.**

| Audyt | Re-audyt (osobny sektor) |
|---|---|
| weryfikacja ogólna | weryfikacja szczegółowa |
| wyciąga ogólne wartości krytyczne | sprawdza je maksymalnie szczegółowo |
| ustala obraz problemów | sprawdza, czy nadal istnieją i czy nie pojawiły się skutki uboczne |

> **RE-AUDYT JEST BARDZIEJ SZCZEGÓŁOWY NIŻ AUDYT I JEST OSOBNYM SEKTOREM.**

## 17. Re-audyt — osobny sektor, nigdy równolegle

> **RE-AUDYT JEST CAŁKOWICIE OSOBNYM SEKTOREM — NIE JEST CZĘŚCIĄ SEKTORA AUDYT.**

- Audyt idzie do projektu i przechodzi przez pierwszy dział.
- Po zakończeniu audytu re-audyt wraca do pierwszego działu jako osobny krok w osobnym
  sektorze.
- Audyt i re-audyt **nigdy nie idą razem**.
- Re-audyt jest **krokiem do tyłu** — wraca do wcześniejszego punktu i sprawdza go dokładniej.
- W re-audycie działa także **osobny proces walidacji**.
- **Re-audyt wypuszcza przysłowiowe psy.**

> **STRAŻNIK MOŻE BYĆ WARSTWĄ OCHRONNĄ PRZED POWTÓRZENIEM ZNANEGO PROBLEMU.**
> Przykład właściciela: jeżeli baza została zabezpieczona, warto nałożyć strażnika, żeby
> przy następnej weryfikacji znany błąd nie wywalał procesu ponownie.

**P2 (2026-09-01):** re-audyt **nie jest lustrzaną kopią** audytu — jest bardziej
szczegółowy i ma własne role.

---

## 18. Wartości, mapa i baza danych

Audyt wyciąga wartości z **początku i końca** procesu — dzięki raportowi i weryfikacji.

- Na początku mamy wartości/stan odniesienia.
- Po przejściu procesu mamy wartości/stan końcowy.
- Porównujemy te wartości oraz **przeglądamy mapę**, żeby sprawdzić, czy nie ma w niej
  błędów.
- Jeżeli wartości są takie same — początek i koniec są zgodne w mierzonym zakresie.
- Jeżeli audyt gubi wartości — sprawdzamy zabezpieczenia bazy danych.

Baza danych jest podłączona zarówno do audytu, jak i do re-audytu. Wartości z obu sektorów
trafiają do **pliku lub bazy danych**.

> **ŚCIEŻKA DANYCH:** AUDYT + RE-AUDYT → WARTOŚCI → RAPORT / DB → PORÓWNANIE → MAPA →
> WERYFIKACJA.

**W4 (2026-09-01):** łączenie audytu z re-audytem — **jak mało, to plik; jak dużo, to
baza danych** — „aby nic nie pogubili, nic nie zapomnieli".

**W6 (2026-09-01):** **mapę projektu robimy przed audytem i po audycie**, żeby sprawdzić,
czy audyt niczego nie zmienił w kodzie.

---

## 19. Naprawa błędów i ochrona przed skutkami ubocznymi

Naprawa następuje **TYLKO po dwóch pełnych cyklach** (audyt + re-audyt), które potwierdzą
te same błędy.

1. AUDYT #1 na najnowszej wersji kodu.
2. RE-AUDYT #1 (osobny sektor) — szczegółowa weryfikacja.
3. AUDYT #2 na tym samym, niezmienionym kodzie.
4. RE-AUDYT #2 (osobny sektor) — ponowna szczegółowa weryfikacja.
5. Porównanie wyników obu cykli.
6. Te same błędy w obu cyklach → **NAPRAWA**.
7. NAPRAWA — naprawiamy potwierdzone błędy.
8. **KONIEC** — po naprawie nie wykonujemy kolejnych audytów ani re-audytów w tym cyklu.

Przy naprawie używamy Golden/strażników do kontroli skutków ubocznych. Po naprawie
powstaje nowa wersja kodu.

---

## 20. TRZY ZASADY NADRZĘDNE — do każdej definicji agenta

Wchodzą **dosłownie** do każdego `AGENT.md`, `KRYTYK.md` i `SKILL.md` w obu sektorach.

### 1. NIE MA WYMYŚLANIA BŁĘDÓW
Każde zgłoszenie ma podstawę i możliwość potwierdzenia. Brak dowodu = brak zgłoszenia.
Egzekwowane maszynowo: narzędzie zgłoszeń **odmawia zapisu** wpisu bez dowodu.

### 2. AUDYT I RE-AUDYT NIE NAPRAWIAJĄ
Sektory **znajdują i wskazują**, nigdy nie poprawiają. Produktem jest **odizolowane
miejsce** błędu. Naprawa to osobny krok, po dwóch pełnych cyklach.

### 3. SWÓJ ZAKRES — DRĄŻYĆ, NIE PRZEKAZYWAĆ
Audytor pracuje nad własnym znaleziskiem sam, schodzi głębiej aż do wskazania miejsca,
nie przekazuje go innemu działowi i **nie naprawia**.

---

## 21. Rozstrzygnięcia właściciela z 2026-09-01 (wiążące)

| # | Rozstrzygnięcie |
|---|---|
| D1 | Agenci **wykonywalni ORAZ udokumentowani** — definicje w repo, generat dla harnessu |
| D2 | **Dwóch kierowników — po jednym na sektor**, obaj z krytykami |
| D3 | **Krytyk przy KAŻDEJ roli**; krytycy dostają wszystkie 7 rodzajów dokumentacji |
| D4 | Zakres: wtyczki + prototyp + bramki + repo. **KURSY POZA ZAKRESEM** |
| D5 | Błędy prototypu **zapisujemy i przekazujemy osobie sprawdzającej projekt** |
| D6 | Działy: **7 ze schematu + 7 naszych** |
| D7 | Sektory **żyją tylko na swoich branchach**, nigdy na `main`, zostają na zawsze |
| D8 | Model: **kierownicy i krytycy — Opus; reszta — Sonnet**. **Zmiana właściciela 2026-09-02:** kierownicy (`KIER`) i Konradowie (`KON`) obu sektorów — **Fable 5.1** (`claude-fable-5-1`); pozostałe role procesowe i **wszyscy krytycy zostają na Opusie**, działy na Sonnecie |
| D9 | **Komplet AUDYTU, potem komplet RE-AUDYTU** — nie częściami |
| D10 | Uruchomienie dopiero na **zielone światło właściciela** |
| P1 | **Konrad łamie założenia W AUDYCIE**, nie w projekcie |
| P2 | **RE-AUDYT nie jest lustrzany — jest bardziej szczegółowy** |
| P3 | **Dokumentacja specjalistyczna dla każdej roli**, która potrzebuje więcej |
| P4 | **Dokumentacja agentowa z wielu AI** |
| W1 | Wartości obu sektorów trafiają do **raportu** |
| W2 | **Sektory NIE naprawiają** |
| W3 | **Agenci pętlowi** — drążą, dopóki nie wyczerpią listy |
| W4 | Wyniki: **mało → plik, dużo → baza danych** |
| W5 | **Audyt wychodzi z działu → dopiero wtedy re-audyt do niego wchodzi** |
| W6 | **Mapa projektu przed i po** |
| W7 | Dział: **co było na początku, ma być na końcu** |
| W8 | Dział **„Usprawnienia audytowe"** — narzędzia do testów automatycznych |
| W9 | **„NIE MA WYMYŚLANIA BŁĘDÓW" w wiadomości do każdego agenta** |
| W10 | Audytor **drąży do miejsca**, nie przekazuje i nie naprawia |
| K4′ | **Druga fala musi dać ten sam wynik**; rozbieżność = defekt audytu. **K4″ (2026-09-02):** agenci mają znaleźć WSZYSTKO, zgodność fal jest skutkiem, nie ograniczeniem; rozjazd = informacja do lektury właściciela, narzędzie nazywa go (zgodne / nadzbiór / sprzeczne), nie zatrzymuje — §15 |
| K9′ | Działy mogą pracować **równolegle**, byle sektory się **nie nakładały**. **Doprecyzowanie (2026-09-02):** działy RE-AUDYTU pracujące na środowisku `:8892` — **sekwencyjnie**, ze stanem przywracanym ze zrzutu między działami |
| H1 | **(2026-09-02)** hash miejsca liczony BEZ numeru linii (plik + znormalizowana treść linii, albo plik + zakres) — numer linii zostaje w dowodzie |
| E7 | **(2026-09-02)** sektor RE-AUDYT ZAAKCEPTOWANY („akceptuję E7") |
| K10′ | Miejsce błędu: linia kodu **albo** plik + zakres + nazwa mechanizmu |
| K11′ | **Dokładamy Chrome** do narzędzi automatycznych |
| K12′ | **Komunikacja wg schematu właściciela**, z naszymi działami w odpowiednich miejscach |

**Właściciel akceptuje każdy etap osobno** — „wszystko chcę akceptować ja".

---

## 22. Ściąga — kolejność wykonania

1. Ustal najnowszą wersję kodu w repozytorium.
2. Zbierz całą dokumentację: dziedzinową, techniczną, projektową, funkcjonalną,
   specjalistyczną, systemową i agentową.
3. Zbuduj sektor AUDYT jako osobną część projektu.
4. Zbuduj sektor RE-AUDYT jako OSOBNĄ część projektu.
5. Utwórz kierownika audytu.
6. Utwórz wyspecjalizowanych audytorów zgodnie ze schematem (łącznie z Agentem Konradem).
7. Dla każdego agenta skonfiguruj: własny context, ograniczenia, moduł, prompt/promotor
   i narzędzia.
8. Ustal zakres odpowiedzialności każdego audytora.
9. Dodaj zasadę: nie ma wymyślania błędów.
10. Ustal statusy pracy każdego audytora.
11. Ustal kod potwierdzenia dla każdego zgłoszonego problemu.
12. Ustal format raportu audytora i klasyfikację problemów.
13. Dodaj weryfikatora jako osobny dział / rolę.
14. Dodaj Golden i pilnuj użycia właściwych skilli.
15. Przeprowadź AUDYT #1.
16. Przeprowadź RE-AUDYT #1 (osobny sektor) — szczegółowa weryfikacja.
17. Przeprowadź AUDYT #2 na niezmienionej wersji kodu.
18. Przeprowadź RE-AUDYT #2 (osobny sektor) — ponowna szczegółowa weryfikacja.
19. Porównaj wyniki obu cykli.
20. Jeżeli wyniki są zgodne (te same błędy) → przejdź do naprawy.
21. Przy naprawie użyj Golden/strażników do kontroli skutków ubocznych.
22. Utwórz nową wersję kodu po naprawie.
23. KONIEC CYKLU — po naprawie nie wykonujemy kolejnych audytów ani re-audytów.
24. Porównaj wartości początku i końca, raporty oraz dane zapisane w pliku/DB.
25. Przejrzyj mapę i sprawdź, czy nie zgubiła ani nie dodała wartości.
26. Jeżeli wartości są zgodne, uznaj ten fragment procesu za spójny; jeżeli są różne,
    sprawdź źródło różnicy, w tym zabezpieczenia BD.
