# Tabela granic — 14 działów sektora AUDYT

**Etap E2.** Ten plik rozstrzyga, **do którego działu należy znalezisko**, gdy dotyka
obszaru więcej niż jednego. Role i checklisty: [`ROLE.md`](ROLE.md).

---

## Dlaczego to nie jest kosmetyka (K6)

Zakresy plików **nakładają się celowo** (rozstrzygnięcie „plik × pytanie", `ROLE.md`).
Wyłączna jest checklista. Dopóki granica jest ostra, znalezisko trafia w obu falach do tego
samego działu i porównanie cykli ma sens. Przy granicy nieostrej **druga fala przypisze je
gdzie indziej** — i wynik się rozjedzie **mimo że kod się nie zmienił**. `porownaj-cykle.mjs`
wypisze to osobno jako GRANICA (K4″: rozjazd jest wynikiem do lektury właściciela, nie
defektem z definicji) — ale rozjazd z powodu granicy jest szumem, który da się usunąć
PRZED drugą falą. Tabela granic jest więc **warunkiem czytelnego porównania**, nie
porządkiem na papierze.

---

## Reguła rozstrzygająca

> **Dział wyznacza PYTANIE, na które znalezisko odpowiada — nie plik, w którym leży,
> i nie skutek, jaki wywołuje.**

Trzy pytania pomocnicze, w tej kolejności:

1. **Czyja pozycja checklisty to wykryła?** Jeśli tylko jedna — koniec, to jej dział.
2. **Gdyby ten mechanizm działał poprawnie, czyja obietnica byłaby dotrzymana?**
3. Jeśli nadal remis — rozstrzyga **kierownik** wg tabeli poniżej.

**Gdy tabela milczy:** to jest znalezisko **Konrada, faza A, pozycja KON-A5** (granica
zostawia pytanie bez właściciela). Kierownik **dopisuje wiersz do tej tabeli przed drugą
falą** — inaczej druga fala rozstrzygnie inaczej i K4′ uzna audyt za zepsuty.

---

## Granice — pary stykowe

| Para | Należy do | Nie do | Przykład rozstrzygający (z historii tego repo) |
|---|---|---|---|
| **SEC ↔ BE** | SEC: czy dane wejściowe mogą **skrzywdzić**. BE: czy kod robi to, co **obiecuje** | — | Brak nonce w handlerze → SEC. `Brak klucza` kasujący sekcje mimo obietnicy „nie ruszaj" (W4) → BE, bo nikt nie atakuje — kod łamie własny kontrakt |
| **SEC ↔ BD** | SEC: SQL jako **powierzchnia ataku**. BD: SQL jako **poprawność danych** | — | Zmienna wklejona do zapytania → SEC. `ON DUPLICATE KEY UPDATE` nadpisujące cudzy wiersz przy drugim kluczu unikalnym (P1) → BD |
| **SEC ↔ FE** | SEC: brak escapowania jako **droga do XSS**. FE: wygląd i czytelność wyjścia | — | `wp_kses_post` zjadające `<svg>` (0.44.0) → FE (ikony znikają), a nie SEC (nic nie wycieka) |
| **SEC ↔ PRIV** | SEC: czy **obcy** dostanie dane. PRIV: czy **my** trzymamy dane, których nie wolno, i czy mówimy o tym prawdę | — | Wyciek 73 lekcji przez `?post_type=lesson` → SEC. Hasło zapisane jawnie w dzienniku logowań → **PRIV** (własny zapis, nie atak), choć skutek jest bezpieczeństwa |
| **SEC ↔ WDR** | SEC: czy obwód instalacji jest szczelny. WDR: czy klient **umie** ją postawić i utrzymać | — | `.env.example` z prawdziwym sekretem → SEC. `.env.example` bez zmiennej, której `postaw.sh` wymaga → WDR |
| **BE ↔ BD** | BE: **przepływ** — kolejność, haki, kontrakt, cykl żądania. BD: **stan** — schemat, transakcja, indeks, idempotencja | — | Zapis bez transakcji → BD. Callback dopięty do trwającego `shutdown`, który się nie wykona → BE |
| **BE ↔ ARCH** | BE: czy **ta** klasa działa poprawnie. ARCH: czy **granica między** klasami i wtyczkami jest we właściwym miejscu | — | Wczesny `return` zostawiający produkt kupowalnym (P2) → BE. Druga kopia tej samej prawdy o cenie w dwóch miejscach → ARCH |
| **BE ↔ INT** | BE: **nasz** kod. INT: zachowanie, którego **nie kontrolujemy** | — | Nasz priorytet haka → BE. To, że `tutor_after_enrolled` melduje nieaktualny status, bo Tutor pisze surowym `$wpdb` → INT |
| **BE ↔ PERF** | BE: czy wynik jest **poprawny**. PERF: ile **kosztuje** | — | Menu podświetlające dwie pozycje → BE. To samo menu kosztujące 90 zapytań na odsłonę → PERF |
| **FE ↔ PERF** | FE: czy klient **widzi** to, co ma. PERF: jak szybko i jak ciężko | — | Obraz bez `width`/`height` → **PERF** (CLS), chyba że w ogóle się nie wyświetla → wtedy FE |
| **FE ↔ INT** | FE: **nasz** arkusz i szablon. INT: kolizja z **cudzym** arkuszem | — | Nasza pigułka zasłaniająca hero → FE. Reguła Tutora poza warstwą kaskady bijąca klasę motywu (0.40.0) → INT |
| **FE ↔ PROTO** | FE: wtyczka WP. PROTO: Next.js | — | Ten sam błąd po obu stronach = **dwa** zgłoszenia, w dwóch działach. Zgłoszenie PROTO idzie osobno (D5) |
| **BD ↔ PRIV** | BD: czy retencja **działa**. PRIV: czy okres retencji jest **właściwy** i opisany | — | Retencja kasująca po `MIN(id)` całej tabeli → BD. 90 dni pełnego IP bez wzmianki w polityce → PRIV |
| **QA ↔ USP** | QA: czy **istniejąca** bramka mierzy to, co obiecuje. USP: czy **brakuje** narzędzia, którym dałoby się zmierzyć | — | Asercja za `process.exit` → QA. Brak sposobu na policzenie zapytań na odsłonę → USP |
| **QA ↔ każdy dział** | QA: **bramka**. Dział: **kod, który bramka miała pilnować** | — | Wzorzec strażnika celujący w nazwę stałej → QA. Sam brak sprawdzenia długości tokenu → SEC. **Jedna usterka, dwa zgłoszenia** — to nie jest duplikat |
| **ARCH ↔ REPO** | ARCH: czy **kod** ma właściwą strukturę. REPO: czy **dokument** mówi o kodzie prawdę | — | Klasa spoza schematu → ARCH (struktura) **i** REPO (schemat nieaktualny) tylko wtedy, gdy dokument twierdzi coś nieprawdziwego; sam brak klasy na rysunku → REPO |
| **ARCH ↔ PIK** | ARCH: czy struktura jest **spójna dziś**. PIK: czy jest **taka, jaką obiecano na starcie** | — | Cykl zależności → ARCH. Niezmiennik N14 z DIAGRAM-u bez odpowiednika w kodzie → PIK |
| **REPO ↔ PIK** | REPO: **opis wobec kodu**. PIK: **obietnica wobec produktu** | — | README z liczbą 62 testów przy 83 → REPO. Pozycja definicji ukończenia odhaczona, choć niezrobiona → PIK |
| **REPO ↔ WDR** | REPO: czy instrukcja **mówi prawdę**. WDR: czy da się ją **wykonać** | — | Martwa kotwica w instrukcji → REPO. Krok „wgraj plik ZIP", którego nic nie produkuje → WDR |
| **PRIV ↔ REPO** | PRIV: czy obietnica handlowa jest **do dotrzymania**. REPO: czy dokument jest **wewnętrznie prawdziwy** | — | „Gwarancja 30 dni" bez mechanizmu zwrotu → PRIV. FAQ podające złą liczbę lekcji → REPO |
| **PERF ↔ USP** | PERF: **wniosek** z liczby. USP: **skąd liczba pochodzi** | — | 251 ms TBT → PERF. Brak Chrome do zmierzenia tego → USP |
| **INT ↔ ARCH** | INT: czy dobrze **czytamy** cudze zachowanie. ARCH: czy **oparcie się** na nim było właściwe | — | Błędne założenie o `is_enrolled()` → INT. To, że źródłem prawdy o postępie jest Tutor, a nie nasza tabela → ARCH |
| **SEC ↔ PERF** | SEC: czy da się **zaszkodzić**. PERF: ile to **kosztuje** | — | Limiter, którym da się wyłączyć pomiar całej witrynie → SEC. Ten sam limiter dokładający niebuforowalny przebieg PHP do każdej odsłony → PERF |
| **SEC ↔ ARCH** | SEC: **konkretna** dziura. ARCH: czy granica dopuszcza **całą klasę** dziur | — | Brak nonce w handlerze → SEC. To, że wtyczka w ogóle sięga do cudzych tabel → ARCH, choć skutek jest bezpieczeństwa |
| **ARCH ↔ PERF** | ARCH: **gdzie** mieszka odpowiedzialność. PERF: ile kosztuje jej realizacja | — | Druga kopia prawdy o postępie kursu → ARCH. To samo menu kosztujące 90 zapytań na odsłonę → PERF |
| **PERF ↔ PRIV** | PERF: koszt. PRIV: **dopuszczalność** | — | Dziennik ruchu rosnący bez retencji → PRIV. Ten sam dziennik spowalniający ekran kokpitu → PERF |
| **FE ↔ PRIV** | FE: czy klient **widzi** to, co ma. PRIV: czy to, co widzi, jest **prawdą** i czy wolno to obiecywać | — | Sekcja gwarancji nieczytelna na wąskim ekranie → FE. Sekcja obiecująca zwrot 30 dni bez mechanizmu zwrotu → PRIV |
| **ARCH ↔ PRIV** | ARCH: **gdzie** dane mieszkają. PRIV: czy **wolno** je tam trzymać | — | Wizyty w naszej tabeli zamiast w cudzej → ARCH. Kolumna łącząca wizytę z kontem → PRIV |
| **BE ↔ PRIV** | BE: czy zapis **działa**. PRIV: czy zapisujemy to, **co wolno** | — | Zapis gubiący pole → BE. Zapis hasła z pola loginu → PRIV |
| **SEC ↔ INT** | SEC: **nasza** dziura. INT: **cudze** zachowanie, na którym stoi nasze zabezpieczenie | — | Blokada koszyka bez `try/catch` dająca HTTP 500 → SEC. To, że `is_course_purchasable` czyta tylko meta i nie pyta produktu → INT |
| **INT ↔ PERF** | INT: czy dobrze **czytamy** cudze. PERF: ile **kosztuje** cudze wywołanie | — | `is_enrolled()` oddające `false` w tym samym żądaniu → INT. Pytanie Tutora o postęp w pętli po kursach → PERF |
| **ARCH ↔ WDR** | ARCH: **zależność** między wtyczkami. WDR: czy klient poradzi sobie z jej **brakiem** | — | Plugin 2 zależny od Pluginu 1 → ARCH. Brak Pluginu 1 dający fatal zamiast komunikatu → WDR |
| **BE ↔ WDR** | BE: czy aktywacja **działa**. WDR: czy da się ją **wykonać i cofnąć** | — | `dbDelta` nietworzące kolumny → BE. `uninstall.php` kasujący dane klienta → WDR |
| **PROTO ↔ reszta** | PROTO: `app/`, `components/`, `lib/`, `modules/`. Reszta: `wordpress/` | — | Zgłoszenia PROTO trafiają do **osobnej sekcji raportu** (D5) i nie mieszają się z produktem |

---

## Trzy zasady wspólne dla wszystkich granic

**1. Ta sama usterka w dwóch działach to NIE duplikat, jeśli odpowiada na dwa różne
pytania.** Brak sprawdzenia długości tokenu jest znaleziskiem SEC (dziura) **i** QA
(strażnik jej nie łapał, bo wzorzec celował w nazwę stałej). Kierownik łączy je po hashu
miejsca w raporcie, ale **żadnego nie kasuje** — usunięcie jednego z nich zmieniłoby
liczbę zgłoszeń działu i rozjechało porównanie cykli.

**2. Znalezisko zostaje w dziale, który je wykrył (W10).** Dział, który trafił na coś
z cudzego obszaru, **drąży do miejsca sam** i zgłasza to u siebie z adnotacją, którego
obszaru dotyka. Nie przekazuje. Kierownik rozstrzyga przypisanie **po fakcie**, na podstawie
tej tabeli.

**3. Granica nie jest wymówką od patrzenia.** „To nie mój dział" nie zwalnia z otwarcia
pliku, jeśli pozycja checklisty każe go otworzyć. Zwalnia wyłącznie ze **zgłaszania**.

---

## Kontrola granic (do E4)

`straznik-sektora-audytu.mjs` sprawdza mechanicznie:

1. każda para działów, których zakresy dzielą **≥ 5 plików**, ma wiersz w tej tabeli
   (próg zmierzony: powyżej niego jest 24 pary i wszystkie mają wiersz; poniżej zostaje
   8 par o przecięciu 1–3 plików, rozstrzyganych regułą ogólną i pozycją KON-A5);
2. żadna pozycja checklisty nie występuje w dwóch działach **dosłownie** (to znaczyłoby, że
   pytanie nie ma właściciela);
3. każdy wiersz tabeli ma wypełnioną kolumnę przykładu — granica bez przykładu jest
   deklaracją, nie rozstrzygnięciem.

Pary o nakładających się zakresach liczymy komendą, nie z pamięci:

```
# przecięcie zakresów dwóch działów
comm -12 <(git ls-files -- <zakres A> | sort -u) <(git ls-files -- <zakres B> | sort -u) | wc -l
```

> **Ta kontrola obaliła pierwszą wersję tego pliku.** Tabela deklarowała, że pokrywa
> „każdą parę o nakładających się zakresach", a pomiar pokazał **19 par bez wiersza**,
> w tym `SEC ∩ PERF` = 94 pliki. Reguła i tabela są zgodne dopiero od drugiej wersji.
> **Deklaracja pokrycia bez policzenia przecięć jest nie do odróżnienia od pokrycia.**
