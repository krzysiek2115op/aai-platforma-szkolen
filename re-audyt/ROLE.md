# Sektor RE-AUDYT — 21 ról (etap E7)

**Etap E7 planu budowy.** Ten plik ustala, **kto istnieje w re-audycie, po co, jaki ma
mechaniczny zakres i jaką checklistę**. Rozwinięcie każdej roli w komplet `AGENT.md` /
`KRYTYK.md` / `SKILL.md` / golden należy do E7.4.

Zasady, granice i plan są **wspólne dla obu sektorów**: [`../audyt/REGULAMIN.md`](../audyt/REGULAMIN.md),
[`GRANICE.md`](GRANICE.md), [`../audyt/PLAN-BUDOWY.md`](../audyt/PLAN-BUDOWY.md).

---

## Czym re-audyt różni się od audytu (P2)

**Te same obszary, INNA PRACA.** Audyt ustala OBRAZ, re-audyt mierzy ZASIĘG, potwierdza
uruchomieniowo i zabezpiecza przed nawrotem. **Też nie naprawia** (W2).

| | AUDYT | RE-AUDYT |
|---|---|---|
| Pytanie | „czy tu jest problem?" | „ile go dokładnie jest i czy cokolwiek to łapie?" |
| Metoda | lektura kodu i dokumentacji | **uruchomienie** na `:8892`, pomiar, mutacja |
| Dowód | miejsce w kodzie | odtworzenie + liczba wystąpień w całym repo |
| Zasięg | jedno wystąpienie wystarczy | **wszystkie** wystąpienia klasy |
| Skutki uboczne | poza zakresem | sprawdza regresję (goldeny, §5) |
| Produkt | lista zgłoszeń | zgłoszenia pogłębione + **projekt strażnika** |

> **RE-AUDYT JEST KROKIEM DO TYŁU** (§17). Wchodzi do działu dopiero po tym, jak audyt
> z tego działu wyszedł — nigdy równolegle.

---

## Co jest wspólne z audytem, a co rozłączne

**Sektory są osobne w PRACY, nie w toolchainie.** Pełna tabela: [`../audyt/STRUKTURA.md`](../audyt/STRUKTURA.md),
sekcja „Dwa sektory, jeden nośnik". Skrót, bo od tego zależy czytanie tego pliku:

- **wspólne:** katalog zgłoszeń `audyt/zgloszenia/` (warunek łączenia po haszu, W4),
  narzędzia `audyt/tools/`, katalog definicji `.claude/agents/`;
- **rozłączne:** prefiks identyfikatora (**`REA-`**), przedrostek agenta (**`rea-`**),
  pliki stanu, ten dokument i [`GRANICE.md`](GRANICE.md).

**Siedemnaście z 21 ról ma kody wspólne z audytem**, bo Pogłębiacz obszaru SEC **jest**
re-audytem działu SEC — wspólny kod trzyma granice i łączenie po haszu w jednej linii.
Własne kody mają cztery role, których audyt nie ma: `PSIARZ`, `SKUT`, `STRAZ`, `WALID`.

**Nie ma `GOLD` ani `WER`.** Golden pilnuje CAŁEGO procesu z sektora audytu, a rolę
weryfikatora pełni w re-audycie **`WALID`** — §16 mówi wprost: „w re-audycie działa także
osobny proces walidacji". `werdykt.mjs` nazywa strony ścieżki (`krytyk`, `weryfikator`),
nie konkretne role, więc nośnik werdyktu obsługuje oba sektory bez zmiany.

---

## Pozycje checklist mają literę `R`

`SEC-R1` czyta się inaczej niż `SEC-01` i o to chodzi: oba sektory dzielą kody działów
i katalog zgłoszeń, więc pozycja bez litery byłaby w połączonym wyniku nie do odróżnienia
od pozycji audytu. Wzorzec kodu pozycji (`audyt/tools/wspolne.mjs`) dopuszcza literę po
myślniku — tę samą, którą od E2 nosi Konrad (`KON-A1`).

---

## Jak czytać zakres

**Zakres Pogłębiacza jest IDENTYCZNY z zakresem jego działu w audycie** — co do znaku.
Nie jest to oszczędność: Pogłębiacz pogłębia TEN SAM obszar, więc inny zakres znaczyłby,
że re-audyt mierzy co innego niż audyt zbadał, a łączenie sektorów po haszu (W4) przestaje
cokolwiek znaczyć. Kopia jest bezpieczna, bo pilnuje jej **reguła 20 strażnika**: zakres
Pogłębiacza porównany ze `audyt/ROLE.md` po normalizacji białych znaków.

Obie pułapki `git ls-files` z `audyt/ROLE.md` obowiązują tu tak samo. **Każdy zakres
liczymy komendą i sprawdzamy, że nie daje zera** — usterka PIK-08 z E6 (pozycja odhaczona
po pustce) jest tą klasą, którą przy 21 nowych rolach najłatwiej powtórzyć 21 razy.

---

# CZĘŚĆ I — 14 POGŁĘBIACZY

Wszyscy: **model Sonnet** (D8), **krytyk na Opusie** (D3), narzędzia
**Read · Grep · Glob · Bash (tylko odczyt i pomiar)**, **bez `Write` i bez `Edit`**.
Każdy jest **agentem pętlowym** (W3), sufit **pięć rund**.

**Pięć pozycji R1–R5 jest wspólnych dla wszystkich Pogłębiaczy** i to jest zamierzone:
wspólne MINIMUM obszarów, dzięki któremu da się zmierzyć, czy nic nie pominięto.
Pozycja **R6 jest własna** — nazywa pomiar, który w tym obszarze rozstrzyga. Pozycja
**`<KOD>-90` jest otwarta** (K4″: lista = minimum) — tam ląduje to, czego lista nie
przewidziała, z tym samym rygorem dowodu.

---

## SEC — Pogłębiacz: Security

**Po co.** Audyt ustalił, GDZIE wejście może skrzywdzić. Ten dział mierzy, ILE takich wejść jest i czy odmowa naprawdę następuje na żywym serwerze, a nie tylko w lekturze warunku.

**Zakres — 113 plików**
```
git ls-files -- ':(glob)wordpress/wtyczki/*/includes/*.php' \
  ':(glob)wordpress/wtyczki/*/*.php' 'wordpress/wtyczki/aai-sklep/szablony' \
  'wordpress/srodowisko/mu-plugins' '.env.example' 'proxy.serwer.ts' \
  'lib/limiter.ts' 'lib/kreator-dostep.ts' 'app/api' '.githooks' '.gitleaksignore'
```
Identyczny z zakresem działu `SEC` audytu, co do znaku — pilnuje reguła 20 strażnika.

| # | Pytanie (tak/nie) | Komenda / miejsce | Dowód |
|---|---|---|---|
| SEC-R1 | Czy każde ZWERYFIKOWANE zgłoszenie audytu z tego obszaru daje się **odtworzyć uruchomieniowo**? | `werdykt.mjs --pokaz` × `:8892` | komenda + obserwowany skutek |
| SEC-R2 | Ile jest **wszystkich** wystąpień tej klasy w repozytorium — nie tylko wskazane jedno? | komenda zliczająca po całym repo | liczba + lista miejsc |
| SEC-R3 | Czy klasyfikacja i wpływ z audytu utrzymują się przy **pełnym zasięgu**? | zgłoszenie audytu × pomiar | miejsce, w którym wpływ jest inny |
| SEC-R4 | Czy w tym obszarze występują klasy znalezione przez **inne** działy audytu? | wszystkie zgłoszenia × zakres tego obszaru | miejsce + klasa |
| SEC-R5 | Czy obszar ma mechanizm tej samej klasy, którego audyt **nie zgłosił**? | zakres × lista klas z audytu TEJ fali | miejsce |
| SEC-R6 | Czy dla KAŻDEGO wejścia z obszaru odmowa przy braku nonce'a albo uprawnienia jest zmierzona ŻĄDANIEM, nie odczytana z kodu? | żądanie do `:8892` bez nonce'a i bez ciastka | adres + kod odpowiedzi + stan danych PRZED i PO żądaniu (sam kod nie rozstrzyga: kolektor CSP i beacon odpowiadają 204 zarówno na przyjęcie, jak i na odrzut) |
| SEC-90 | Co jeszcze w Twoim zakresie może skrzywdzić klienta, właściciela albo dane, a NIE stoi na tej liście? (K4″: lista = minimum) | zakres × własny pomiar | miejsce + dowód jak przy każdej pozycji |

**Nie bierze:** wydajności zapytań (→ Pogłębiacz PERF), retencji danych (→ Pogłębiacz PRIV). SEC pyta, czy dane wejściowe mogą skrzywdzić — i przy re-audycie odpowiada na to POMIAREM.

---

## FE — Pogłębiacz: Frontend

**Po co.** Audyt czytał szablony i arkusze. Ten dział ogląda ich SKUTEK w przeglądarce: co klient naprawdę widzi na wyrenderowanej stronie.

**Zakres — 57 plików**
```
git ls-files -- 'wordpress/wtyczki/aai-sklep/szablony' \
  'wordpress/wtyczki/aai-sklep/assets' 'wordpress/wtyczki/aai-monitor/assets' \
  ':(glob)wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-{widok,lekcja,moje,proza,zasoby,menu,trasy,styl-tutora,styl-woo}.php' \
  'wordpress/wtyczki/aai-monitor/includes/class-aai-monitor-ekran.php'
```
Identyczny z zakresem działu `FE` audytu, co do znaku — pilnuje reguła 20 strażnika.

| # | Pytanie (tak/nie) | Komenda / miejsce | Dowód |
|---|---|---|---|
| FE-R1 | Czy każde ZWERYFIKOWANE zgłoszenie audytu z tego obszaru daje się **odtworzyć uruchomieniowo**? | `werdykt.mjs --pokaz` × `:8892` | komenda + obserwowany skutek |
| FE-R2 | Ile jest **wszystkich** wystąpień tej klasy w repozytorium — nie tylko wskazane jedno? | komenda zliczająca po całym repo | liczba + lista miejsc |
| FE-R3 | Czy klasyfikacja i wpływ z audytu utrzymują się przy **pełnym zasięgu**? | zgłoszenie audytu × pomiar | miejsce, w którym wpływ jest inny |
| FE-R4 | Czy w tym obszarze występują klasy znalezione przez **inne** działy audytu? | wszystkie zgłoszenia × zakres tego obszaru | miejsce + klasa |
| FE-R5 | Czy obszar ma mechanizm tej samej klasy, którego audyt **nie zgłosił**? | zakres × lista klas z audytu TEJ fali | miejsce |
| FE-R6 | Czy wygląd zmierzony NA ŻYWO zgadza się z tym, co obiecuje szablon — kontrast, nachodzenie, brak przewijania w poziomie? | rig przeglądarkowy na `:8892` (wzorzec: `smoke-wp-motyw`) | strona + zmierzona wartość |
| FE-90 | Co jeszcze w Twoim zakresie może skrzywdzić klienta, właściciela albo dane, a NIE stoi na tej liście? (K4″: lista = minimum) | zakres × własny pomiar | miejsce + dowód jak przy każdej pozycji |

**Nie bierze:** prototypu Next.js (→ Pogłębiacz PROTO), wagi stron (→ Pogłębiacz PERF). Kolizja z cudzym arkuszem należy do Pogłębiacza INT.

---

## BE — Pogłębiacz: Backend

**Po co.** Audyt pytał, czy kod robi to, co obiecuje jego kontrakt. Ten dział sprawdza to WYWOŁANIEM — bo najdroższe usterki tego repozytorium (cicha utrata treści) wychodziły dopiero w działaniu.

**Zakres — 66 plików**
```
git ls-files -- ':(glob)wordpress/wtyczki/*/includes/*.php' ':(glob)wordpress/wtyczki/*/*.php'
```
Identyczny z zakresem działu `BE` audytu, co do znaku — pilnuje reguła 20 strażnika.

| # | Pytanie (tak/nie) | Komenda / miejsce | Dowód |
|---|---|---|---|
| BE-R1 | Czy każde ZWERYFIKOWANE zgłoszenie audytu z tego obszaru daje się **odtworzyć uruchomieniowo**? | `werdykt.mjs --pokaz` × `:8892` | komenda + obserwowany skutek |
| BE-R2 | Ile jest **wszystkich** wystąpień tej klasy w repozytorium — nie tylko wskazane jedno? | komenda zliczająca po całym repo | liczba + lista miejsc |
| BE-R3 | Czy klasyfikacja i wpływ z audytu utrzymują się przy **pełnym zasięgu**? | zgłoszenie audytu × pomiar | miejsce, w którym wpływ jest inny |
| BE-R4 | Czy w tym obszarze występują klasy znalezione przez **inne** działy audytu? | wszystkie zgłoszenia × zakres tego obszaru | miejsce + klasa |
| BE-R5 | Czy obszar ma mechanizm tej samej klasy, którego audyt **nie zgłosił**? | zakres × lista klas z audytu TEJ fali | miejsce |
| BE-R6 | Czy reguła „brak klucza znaczy nie ruszaj" (BLAD-018) trzyma się uruchomieniowo dla KAŻDEGO z pięciu kluczy, nie tylko w komentarzu? | zapis przez warstwę zapisu bez danego klucza, potem odczyt | klucz + stan przed i po |
| BE-90 | Co jeszcze w Twoim zakresie może skrzywdzić klienta, właściciela albo dane, a NIE stoi na tej liście? (K4″: lista = minimum) | zakres × własny pomiar | miejsce + dowód jak przy każdej pozycji |

**Nie bierze:** SQL jako powierzchni ataku (→ Pogłębiacz SEC), schematu tabel (→ Pogłębiacz BD).

---

## BD — Pogłębiacz: Baza danych i migracja

**Po co.** Tu mieszka klasa cichej utraty treści. Audyt wskazuje miejsce; ten dział przelicza CAŁĄ drogę danych i porównuje treść znak w znak, bo suma bajtów potrafi zgadzać się przy utracie.

**Zakres — 25 plików**
```
git ls-files -- ':(glob)wordpress/wtyczki/*/includes/class-*-{tabele,zapis,import,odczyt,odczyt-panelu}.php' \
  'modules' 'tools/eksport-wp.mjs' 'tools/sprawdz-import-wp.mjs' 'tools/db1-gotowa.mjs' 'tools/seed'
```
Identyczny z zakresem działu `BD` audytu, co do znaku — pilnuje reguła 20 strażnika.

| # | Pytanie (tak/nie) | Komenda / miejsce | Dowód |
|---|---|---|---|
| BD-R1 | Czy każde ZWERYFIKOWANE zgłoszenie audytu z tego obszaru daje się **odtworzyć uruchomieniowo**? | `werdykt.mjs --pokaz` × `:8892` | komenda + obserwowany skutek |
| BD-R2 | Ile jest **wszystkich** wystąpień tej klasy w repozytorium — nie tylko wskazane jedno? | komenda zliczająca po całym repo | liczba + lista miejsc |
| BD-R3 | Czy klasyfikacja i wpływ z audytu utrzymują się przy **pełnym zasięgu**? | zgłoszenie audytu × pomiar | miejsce, w którym wpływ jest inny |
| BD-R4 | Czy w tym obszarze występują klasy znalezione przez **inne** działy audytu? | wszystkie zgłoszenia × zakres tego obszaru | miejsce + klasa |
| BD-R5 | Czy obszar ma mechanizm tej samej klasy, którego audyt **nie zgłosił**? | zakres × lista klas z audytu TEJ fali | miejsce |
| BD-R6 | Czy idempotencja jest zmierzona TRZEMA przebiegami, a treść porównana znak w znak (nie sumą — `LENGTH()` liczy bajty, `.length` jednostki UTF-16)? | `npm run wp:import` ×3, potem `npm run wp:sprawdz` | trzy liczby utworzonych + wynik porównania |
| BD-90 | Co jeszcze w Twoim zakresie może skrzywdzić klienta, właściciela albo dane, a NIE stoi na tej liście? (K4″: lista = minimum) | zakres × własny pomiar | miejsce + dowód jak przy każdej pozycji |

**Nie bierze:** wstrzyknięć SQL (→ Pogłębiacz SEC), czasu zapytań (→ Pogłębiacz PERF).

---

## QA — Pogłębiacz: QA i testy

**Po co.** Audyt pytał, czy bramki mierzą to, co obiecują. Ten dział to SPRAWDZA: psuje przedmiot bramki i patrzy, czy bramka się zapala — i czy zapala się z właściwego powodu.

**Zakres — 80 plików**
```
git ls-files -- 'tools/straznicy' 'tools/smoke' 'goldeny' '.github/workflows' \
  'package.json' 'package-lock.json' 'tools/cytaty-zgodne.mjs' 'tools/sprawdz-proze-php.mjs'
```
Identyczny z zakresem działu `QA` audytu, co do znaku — pilnuje reguła 20 strażnika.

| # | Pytanie (tak/nie) | Komenda / miejsce | Dowód |
|---|---|---|---|
| QA-R1 | Czy każde ZWERYFIKOWANE zgłoszenie audytu z tego obszaru daje się **odtworzyć uruchomieniowo**? | `werdykt.mjs --pokaz` × `:8892` | komenda + obserwowany skutek |
| QA-R2 | Ile jest **wszystkich** wystąpień tej klasy w repozytorium — nie tylko wskazane jedno? | komenda zliczająca po całym repo | liczba + lista miejsc |
| QA-R3 | Czy klasyfikacja i wpływ z audytu utrzymują się przy **pełnym zasięgu**? | zgłoszenie audytu × pomiar | miejsce, w którym wpływ jest inny |
| QA-R4 | Czy w tym obszarze występują klasy znalezione przez **inne** działy audytu? | wszystkie zgłoszenia × zakres tego obszaru | miejsce + klasa |
| QA-R5 | Czy obszar ma mechanizm tej samej klasy, którego audyt **nie zgłosił**? | zakres × lista klas z audytu TEJ fali | miejsce |
| QA-R6 | Czy każda bramka uznana przez audyt za działającą zapala się po mutacji swojego przedmiotu, i czy zapala WŁAŚCIWĄ regułę? | mutacja przedmiotu bramki + jej kod wyjścia BEZ potoku | bramka + mutacja + ślad w komunikacie |
| QA-90 | Co jeszcze w Twoim zakresie może skrzywdzić klienta, właściciela albo dane, a NIE stoi na tej liście? (K4″: lista = minimum) | zakres × własny pomiar | miejsce + dowód jak przy każdej pozycji |

**Nie bierze:** psucia kodu w miejscu ZNALEZISKA (→ PSIARZ). QA pyta o bramki jako o przedmiot, PSIARZ używa mutacji jako narzędzia do znaleziska.

---

## PERF — Pogłębiacz: Wydajność

**Po co.** Audyt czytał kod i liczył zapytania z lektury. Ten dział je MIERZY — bo liczba zapytań na odsłonę wyprowadzona z kodu w tym repozytorium myliła się już o rząd wielkości (menu: 90 zapytań na odsłonę).

**Zakres — 116 plików**
```
git ls-files -- ':(glob)wordpress/wtyczki/*/includes/*.php' \
  'wordpress/wtyczki/aai-sklep/assets' 'wordpress/wtyczki/aai-monitor/assets' \
  'wordpress/wtyczki/aai-sklep/szablony' 'tools/pomiar-psi.mjs' \
  'tools/pomiar-lighthouse.mjs' 'tools/sprawdz-zywy.mjs'
```
Identyczny z zakresem działu `PERF` audytu, co do znaku — pilnuje reguła 20 strażnika.

| # | Pytanie (tak/nie) | Komenda / miejsce | Dowód |
|---|---|---|---|
| PERF-R1 | Czy każde ZWERYFIKOWANE zgłoszenie audytu z tego obszaru daje się **odtworzyć uruchomieniowo**? | `werdykt.mjs --pokaz` × `:8892` | komenda + obserwowany skutek |
| PERF-R2 | Ile jest **wszystkich** wystąpień tej klasy w repozytorium — nie tylko wskazane jedno? | komenda zliczająca po całym repo | liczba + lista miejsc |
| PERF-R3 | Czy klasyfikacja i wpływ z audytu utrzymują się przy **pełnym zasięgu**? | zgłoszenie audytu × pomiar | miejsce, w którym wpływ jest inny |
| PERF-R4 | Czy w tym obszarze występują klasy znalezione przez **inne** działy audytu? | wszystkie zgłoszenia × zakres tego obszaru | miejsce + klasa |
| PERF-R5 | Czy obszar ma mechanizm tej samej klasy, którego audyt **nie zgłosił**? | zakres × lista klas z audytu TEJ fali | miejsce |
| PERF-R6 | Czy liczba zapytań na odsłonę jest ZMIERZONA na żywej stronie, a nie wyprowadzona z lektury? | pomiar zapytań na `:8892` dla wskazanej trasy | trasa + liczba zapytań |
| PERF-90 | Co jeszcze w Twoim zakresie może skrzywdzić klienta, właściciela albo dane, a NIE stoi na tej liście? (K4″: lista = minimum) | zakres × własny pomiar | miejsce + dowód jak przy każdej pozycji |

**Nie bierze:** poprawności zapytań (→ Pogłębiacz BD), poprawności bramek pomiarowych (→ Pogłębiacz QA).

---

## ARCH — Pogłębiacz: Architekt

**Po co.** Audyt sprawdzał granice i szwy na papierze. Ten dział je URUCHAMIA: czy szew naprawdę odpala, czy wyłączenie jednej wtyczki nie wywraca pozostałych.

**Zakres — 79 plików**
```
git ls-files -- ':(glob)wordpress/wtyczki/*/includes/*.php' ':(glob)wordpress/wtyczki/*/*.php' \
  'docs/schematy' 'docs/SYSTEM.drawio' 'docs/SCHEMATY.md' ':(glob)docs/plugin-*/DIAGRAM.md'
```
Identyczny z zakresem działu `ARCH` audytu, co do znaku — pilnuje reguła 20 strażnika.

| # | Pytanie (tak/nie) | Komenda / miejsce | Dowód |
|---|---|---|---|
| ARCH-R1 | Czy każde ZWERYFIKOWANE zgłoszenie audytu z tego obszaru daje się **odtworzyć uruchomieniowo**? | `werdykt.mjs --pokaz` × `:8892` | komenda + obserwowany skutek |
| ARCH-R2 | Ile jest **wszystkich** wystąpień tej klasy w repozytorium — nie tylko wskazane jedno? | komenda zliczająca po całym repo | liczba + lista miejsc |
| ARCH-R3 | Czy klasyfikacja i wpływ z audytu utrzymują się przy **pełnym zasięgu**? | zgłoszenie audytu × pomiar | miejsce, w którym wpływ jest inny |
| ARCH-R4 | Czy w tym obszarze występują klasy znalezione przez **inne** działy audytu? | wszystkie zgłoszenia × zakres tego obszaru | miejsce + klasa |
| ARCH-R5 | Czy obszar ma mechanizm tej samej klasy, którego audyt **nie zgłosił**? | zakres × lista klas z audytu TEJ fali | miejsce |
| ARCH-R6 | Czy każdy z siedmiu szwów daje się WYWOŁAĆ, a wyłączenie jednej wtyczki nie wywraca pozostałych? | wyzwolenie akcji na `:8892` + `wp plugin deactivate` po kolei | szew + obserwowany skutek |
| ARCH-90 | Co jeszcze w Twoim zakresie może skrzywdzić klienta, właściciela albo dane, a NIE stoi na tej liście? (K4″: lista = minimum) | zakres × własny pomiar | miejsce + dowód jak przy każdej pozycji |

**Nie bierze:** treści dokumentacji poza schematami (→ Pogłębiacz REPO), zgodności z pierwotnym planem (→ Pogłębiacz PIK).

---

## INT — Pogłębiacz: Integracje z cudzym kodem

**Po co.** Cudzy kod jest jedynym miejscem, w którym dokumentacja i zachowanie rozjeżdżają się regularnie. Audyt czytał; ten dział sprawdza zachowanie w ŻYWEJ instalacji tej wersji.

**Zakres — 15 plików**
```
git ls-files -- ':(glob)wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-{tutor,styl-tutora,styl-woo,zasoby}.php' \
  ':(glob)wordpress/wtyczki/aai-platnosci/includes/*.php' \
  ':(glob)wordpress/wtyczki/aai-sklep/assets/{tutor,woo}-motyw.css' 'docs/ETAP-WP.md'
```
Identyczny z zakresem działu `INT` audytu, co do znaku — pilnuje reguła 20 strażnika.

| # | Pytanie (tak/nie) | Komenda / miejsce | Dowód |
|---|---|---|---|
| INT-R1 | Czy każde ZWERYFIKOWANE zgłoszenie audytu z tego obszaru daje się **odtworzyć uruchomieniowo**? | `werdykt.mjs --pokaz` × `:8892` | komenda + obserwowany skutek |
| INT-R2 | Ile jest **wszystkich** wystąpień tej klasy w repozytorium — nie tylko wskazane jedno? | komenda zliczająca po całym repo | liczba + lista miejsc |
| INT-R3 | Czy klasyfikacja i wpływ z audytu utrzymują się przy **pełnym zasięgu**? | zgłoszenie audytu × pomiar | miejsce, w którym wpływ jest inny |
| INT-R4 | Czy w tym obszarze występują klasy znalezione przez **inne** działy audytu? | wszystkie zgłoszenia × zakres tego obszaru | miejsce + klasa |
| INT-R5 | Czy obszar ma mechanizm tej samej klasy, którego audyt **nie zgłosił**? | zakres × lista klas z audytu TEJ fali | miejsce |
| INT-R6 | Czy zachowanie cudzego kodu, na którym stoi znalezisko, jest sprawdzone w ŻYWEJ instalacji tej wersji, a nie w dokumentacji? | wywołanie na `:8892` + `wp plugin list --format=json` | wersja + obserwowane zachowanie |
| INT-90 | Co jeszcze w Twoim zakresie może skrzywdzić klienta, właściciela albo dane, a NIE stoi na tej liście? (K4″: lista = minimum) | zakres × własny pomiar | miejsce + dowód jak przy każdej pozycji |

**Nie bierze:** granic naszych wtyczek (→ Pogłębiacz ARCH), wyglądu naszych stron (→ Pogłębiacz FE).

---

## PRIV — Pogłębiacz: Prywatność i zgodność

**Po co.** Audyt czytał deklaracje o zbieranych danych. Ten dział porównuje je z tym, co NAPRAWDĘ ląduje w tabelach po żądaniu — bo deklaracja i zapis to dwie różne rzeczy.

**Zakres — 60 plików**
```
git ls-files -- 'wordpress/wtyczki/aai-monitor' 'docs/plugin-3/POLITYKA-PRYWATNOSCI.md' \
  'wordpress/wtyczki/aai-platnosci/includes/class-aai-platnosci-maile.php' \
  'tools/seed' 'wordpress/wtyczki/aai-sklep/szablony'
```
Identyczny z zakresem działu `PRIV` audytu, co do znaku — pilnuje reguła 20 strażnika.

| # | Pytanie (tak/nie) | Komenda / miejsce | Dowód |
|---|---|---|---|
| PRIV-R1 | Czy każde ZWERYFIKOWANE zgłoszenie audytu z tego obszaru daje się **odtworzyć uruchomieniowo**? | `werdykt.mjs --pokaz` × `:8892` | komenda + obserwowany skutek |
| PRIV-R2 | Ile jest **wszystkich** wystąpień tej klasy w repozytorium — nie tylko wskazane jedno? | komenda zliczająca po całym repo | liczba + lista miejsc |
| PRIV-R3 | Czy klasyfikacja i wpływ z audytu utrzymują się przy **pełnym zasięgu**? | zgłoszenie audytu × pomiar | miejsce, w którym wpływ jest inny |
| PRIV-R4 | Czy w tym obszarze występują klasy znalezione przez **inne** działy audytu? | wszystkie zgłoszenia × zakres tego obszaru | miejsce + klasa |
| PRIV-R5 | Czy obszar ma mechanizm tej samej klasy, którego audyt **nie zgłosił**? | zakres × lista klas z audytu TEJ fali | miejsce |
| PRIV-R6 | Czy dane, o których wtyczka mówi, że je zbiera, są tymi, które po żądaniu naprawdę trafiają do tabel? | żądanie na `:8892`, potem odczyt wiersza z tabeli | kolumna + wartość zapisana |
| PRIV-90 | Co jeszcze w Twoim zakresie może skrzywdzić klienta, właściciela albo dane, a NIE stoi na tej liście? (K4″: lista = minimum) | zakres × własny pomiar | miejsce + dowód jak przy każdej pozycji |

**Nie bierze:** obrony przed atakiem (→ Pogłębiacz SEC), poprawności zapisu (→ Pogłębiacz BD).

---

## REPO — Pogłębiacz: Prawda repo

**Po co.** Nieprawdy tego repozytorium siedzą w prozie, której nie czyta żaden strażnik. Audyt je wskazał; ten dział sprawdza KOMENDĄ każdą liczbę i każdy stan, które dokument deklaruje.

**Zakres — 79 plików**
```
git ls-files -- 'README.md' 'CLAUDE.md' 'CHANGELOG.md' 'CONTRIBUTING.md' 'LICENSE' \
  ':(glob)docs/*.md' 'docs/plugin-1' 'docs/plugin-2' 'docs/plugin-3' 'docs/schematy' \
  ':(glob)docs/dokumentacja-techniczna/*/ZRODLA.md' 'rejestr' '.github' 'agenci' \
  'wordpress/README.md' 'wordpress/srodowisko/README.md' \
  'docs/zrzuty/podglad-szkolenia.png' 'docs/zrzuty/tutor-na-motywie-kurs.png' \
  'docs/zrzuty/tutor-na-motywie-lekcja.png'
```
Identyczny z zakresem działu `REPO` audytu, co do znaku — pilnuje reguła 20 strażnika.

| # | Pytanie (tak/nie) | Komenda / miejsce | Dowód |
|---|---|---|---|
| REPO-R1 | Czy każde ZWERYFIKOWANE zgłoszenie audytu z tego obszaru daje się **odtworzyć uruchomieniowo**? | `werdykt.mjs --pokaz` × `:8892` | komenda + obserwowany skutek |
| REPO-R2 | Ile jest **wszystkich** wystąpień tej klasy w repozytorium — nie tylko wskazane jedno? | komenda zliczająca po całym repo | liczba + lista miejsc |
| REPO-R3 | Czy klasyfikacja i wpływ z audytu utrzymują się przy **pełnym zasięgu**? | zgłoszenie audytu × pomiar | miejsce, w którym wpływ jest inny |
| REPO-R4 | Czy w tym obszarze występują klasy znalezione przez **inne** działy audytu? | wszystkie zgłoszenia × zakres tego obszaru | miejsce + klasa |
| REPO-R5 | Czy obszar ma mechanizm tej samej klasy, którego audyt **nie zgłosił**? | zakres × lista klas z audytu TEJ fali | miejsce |
| REPO-R6 | Czy liczba podana w dokumencie zgadza się z wynikiem KOMENDY, którą ten sam dokument podaje? | uruchomienie komendy cytowanej w dokumencie | dokument:linia + liczba podana + liczba zmierzona |
| REPO-90 | Co jeszcze w Twoim zakresie może skrzywdzić klienta, właściciela albo dane, a NIE stoi na tej liście? (K4″: lista = minimum) | zakres × własny pomiar | miejsce + dowód jak przy każdej pozycji |

**Nie bierze:** zgodności schematów z kodem (→ Pogłębiacz ARCH), obietnic wobec produktu (→ Pogłębiacz PIK).

---

## WDR — Pogłębiacz: Wdrożenie i eksploatacja

**Po co.** Audyt czytał procedurę instalacji. Ten dział ją WYKONUJE — bo procedura opisana i procedura wykonalna to nie to samo, a klientem jest ktoś obcy.

**Zakres — 33 pliki**
```
git ls-files -- '.editorconfig' '.gitattributes' '.gitignore' '.nvmrc' '.env.example' \
  'docs/zrzuty/instalacja' 'wordpress/srodowisko' ':(glob)wordpress/wtyczki/*/*.php' \
  ':(glob)wordpress/wtyczki/*/readme.txt' 'tools/pakuj-wtyczki.mjs' \
  'docs/INSTRUKCJA-INSTALACJI.md' 'docker-compose.yml' 'wordpress/README.md' \
  'wordpress/wtyczki/aai-sklep/languages'
```
Identyczny z zakresem działu `WDR` audytu, co do znaku — pilnuje reguła 20 strażnika.

| # | Pytanie (tak/nie) | Komenda / miejsce | Dowód |
|---|---|---|---|
| WDR-R1 | Czy każde ZWERYFIKOWANE zgłoszenie audytu z tego obszaru daje się **odtworzyć uruchomieniowo**? | `werdykt.mjs --pokaz` × `:8892` | komenda + obserwowany skutek |
| WDR-R2 | Ile jest **wszystkich** wystąpień tej klasy w repozytorium — nie tylko wskazane jedno? | komenda zliczająca po całym repo | liczba + lista miejsc |
| WDR-R3 | Czy klasyfikacja i wpływ z audytu utrzymują się przy **pełnym zasięgu**? | zgłoszenie audytu × pomiar | miejsce, w którym wpływ jest inny |
| WDR-R4 | Czy w tym obszarze występują klasy znalezione przez **inne** działy audytu? | wszystkie zgłoszenia × zakres tego obszaru | miejsce + klasa |
| WDR-R5 | Czy obszar ma mechanizm tej samej klasy, którego audyt **nie zgłosił**? | zakres × lista klas z audytu TEJ fali | miejsce |
| WDR-R6 | Czy paczka ZIP instaluje się w CZYSTEJ instalacji, a `uninstall.php` zostawia dane tak, jak obiecuje? | `npm run pakuj` + instalacja w kontenerze + `wp plugin uninstall` | kod wyjścia + stan tabel po odinstalowaniu |
| WDR-90 | Co jeszcze w Twoim zakresie może skrzywdzić klienta, właściciela albo dane, a NIE stoi na tej liście? (K4″: lista = minimum) | zakres × własny pomiar | miejsce + dowód jak przy każdej pozycji |

**Nie bierze:** treści instrukcji jako dokumentu (→ Pogłębiacz REPO), obwodu instalacji (→ Pogłębiacz SEC).

---

## PROTO — Pogłębiacz: Prototyp Next.js

**Po co.** Prototyp jest specyfikacją wykonawczą, więc jego nieprawdy rozchodzą się dalej. Audyt je wskazał; ten dział pokazuje rozjazd URUCHOMIENIOWO — na obu stronach naraz.

**Zakres — 131 plików**
```
git ls-files -- 'app' 'components' 'lib' 'modules' 'public' 'tools/seed' \
  'next.config.ts' 'proxy.serwer.ts' 'tsconfig.json' 'eslint.config.mjs' \
  'postcss.config.mjs' 'package.json' 'tools/csp-podglad.mjs' 'tools/og-rozszerzenie.mjs'
```
Identyczny z zakresem działu `PROTO` audytu, co do znaku — pilnuje reguła 20 strażnika.

| # | Pytanie (tak/nie) | Komenda / miejsce | Dowód |
|---|---|---|---|
| PROTO-R1 | Czy każde ZWERYFIKOWANE zgłoszenie audytu z tego obszaru daje się **odtworzyć uruchomieniowo**? | `werdykt.mjs --pokaz` × `:8892` | komenda + obserwowany skutek |
| PROTO-R2 | Ile jest **wszystkich** wystąpień tej klasy w repozytorium — nie tylko wskazane jedno? | komenda zliczająca po całym repo | liczba + lista miejsc |
| PROTO-R3 | Czy klasyfikacja i wpływ z audytu utrzymują się przy **pełnym zasięgu**? | zgłoszenie audytu × pomiar | miejsce, w którym wpływ jest inny |
| PROTO-R4 | Czy w tym obszarze występują klasy znalezione przez **inne** działy audytu? | wszystkie zgłoszenia × zakres tego obszaru | miejsce + klasa |
| PROTO-R5 | Czy obszar ma mechanizm tej samej klasy, którego audyt **nie zgłosił**? | zakres × lista klas z audytu TEJ fali | miejsce |
| PROTO-R6 | Czy rozjazd prototyp ↔ wtyczka daje się pokazać uruchomieniowo po OBU stronach, a nie tylko wyczytać z kodu? | `npm run dev` (`:3001`) obok `:8892`, ta sama trasa | trasa + różnica obserwowana po obu stronach |
| PROTO-90 | Co jeszcze w Twoim zakresie może skrzywdzić klienta, właściciela albo dane, a NIE stoi na tej liście? (K4″: lista = minimum) | zakres × własny pomiar | miejsce + dowód jak przy każdej pozycji |

**Nie bierze:** kodu wtyczek WP (→ pozostali Pogłębiacze). Znalezisko dotyczące OBU stron zostaje tutaj wraz z pomiarem po stronie wtyczki.

---

## PIK — Pogłębiacz: Początek i koniec

**Po co.** Audyt sprawdzał, czy obietnica ma odpowiednik w kodzie. Ten dział sprawdza, czy da się ją WYKONAĆ — bo obietnica spełniona w kodzie i spełniona dla klienta to dwie różne rzeczy.

**Zakres — 10 plików**
```
git ls-files -- 'docs/PLAN.md' 'docs/WYTYCZNE.md' 'CLAUDE.md' 'CHANGELOG.md' \
  ':(glob)docs/plugin-*/DIAGRAM.md' 'docs/PLAN-SEO-HIGIENA-AUDYT.md' \
  'docs/ETAP-WP.md' 'docs/TEST-CALOSCI-WP.md'
```
Identyczny z zakresem działu `PIK` audytu, co do znaku — pilnuje reguła 20 strażnika.

| # | Pytanie (tak/nie) | Komenda / miejsce | Dowód |
|---|---|---|---|
| PIK-R1 | Czy każde ZWERYFIKOWANE zgłoszenie audytu z tego obszaru daje się **odtworzyć uruchomieniowo**? | `werdykt.mjs --pokaz` × `:8892` | komenda + obserwowany skutek |
| PIK-R2 | Ile jest **wszystkich** wystąpień tej klasy w repozytorium — nie tylko wskazane jedno? | komenda zliczająca po całym repo | liczba + lista miejsc |
| PIK-R3 | Czy klasyfikacja i wpływ z audytu utrzymują się przy **pełnym zasięgu**? | zgłoszenie audytu × pomiar | miejsce, w którym wpływ jest inny |
| PIK-R4 | Czy w tym obszarze występują klasy znalezione przez **inne** działy audytu? | wszystkie zgłoszenia × zakres tego obszaru | miejsce + klasa |
| PIK-R5 | Czy obszar ma mechanizm tej samej klasy, którego audyt **nie zgłosił**? | zakres × lista klas z audytu TEJ fali | miejsce |
| PIK-R6 | Czy obietnica uznana za spełnioną daje się WYKONAĆ na żywym systemie, a nie tylko znaleźć w kodzie? | przejście obiecanej ścieżki na `:8892` | obietnica + kroki + wynik |
| PIK-90 | Co jeszcze w Twoim zakresie może skrzywdzić klienta, właściciela albo dane, a NIE stoi na tej liście? (K4″: lista = minimum) | zakres × własny pomiar | miejsce + dowód jak przy każdej pozycji |

**Nie bierze:** prawdziwości liczb w dokumentacji (→ Pogłębiacz REPO), zgodności schematów (→ Pogłębiacz ARCH).

---

## USP — Pogłębiacz: Usprawnienia audytowe

**Po co.** Ten dział dostarcza pozostałym twarde liczby. W re-audycie pyta o rzecz, której audyt nie mógł sprawdzić: czy narzędzie pomiarowe daje TEN SAM wynik dwa razy.

**Zakres — 94 pliki**
```
git ls-files -- ':(glob)tools/*.mjs' ':(glob)tools/*.sh' ':(glob)tools/*.ts' \
  'tools/zrzuty' 'tools/podglad-kursow' 'tools/straznicy/uruchom-wszystkie.mjs' \
  'tools/straznicy/audyt-straznikow.mjs' 'package.json' 'package-lock.json'
```
Identyczny z zakresem działu `USP` audytu, co do znaku — pilnuje reguła 20 strażnika.

| # | Pytanie (tak/nie) | Komenda / miejsce | Dowód |
|---|---|---|---|
| USP-R1 | Czy każde ZWERYFIKOWANE zgłoszenie audytu z tego obszaru daje się **odtworzyć uruchomieniowo**? | `werdykt.mjs --pokaz` × `:8892` | komenda + obserwowany skutek |
| USP-R2 | Ile jest **wszystkich** wystąpień tej klasy w repozytorium — nie tylko wskazane jedno? | komenda zliczająca po całym repo | liczba + lista miejsc |
| USP-R3 | Czy klasyfikacja i wpływ z audytu utrzymują się przy **pełnym zasięgu**? | zgłoszenie audytu × pomiar | miejsce, w którym wpływ jest inny |
| USP-R4 | Czy w tym obszarze występują klasy znalezione przez **inne** działy audytu? | wszystkie zgłoszenia × zakres tego obszaru | miejsce + klasa |
| USP-R5 | Czy obszar ma mechanizm tej samej klasy, którego audyt **nie zgłosił**? | zakres × lista klas z audytu TEJ fali | miejsce |
| USP-R6 | Czy narzędzie pomiarowe daje ten sam wynik w dwóch przebiegach i czy jego kod wyjścia jest sprawdzany BEZ potoku? | dwa przebiegi narzędzia, kod wyjścia mierzony osobno | narzędzie + dwa wyniki + kod wyjścia |
| USP-90 | Co jeszcze w Twoim zakresie może skrzywdzić klienta, właściciela albo dane, a NIE stoi na tej liście? (K4″: lista = minimum) | zakres × własny pomiar | miejsce + dowód jak przy każdej pozycji |

**Nie bierze:** oceny bramek projektu (→ Pogłębiacz QA), własnych zgłoszeń o produkcie. USP zgłasza usterki NARZĘDZI, którymi mierzą inni.

---

# CZĘŚĆ II — 7 RÓL PROCESOWYCH

Cztery z nich (`PSIARZ`, `SKUT`, `STRAZ`, `WALID`) nie istnieją w audycie i to one robią
z re-audytu **inny sektor, a nie drugi przebieg tego samego**. Trzy pozostałe
(`KIER`, `RAP`, `KON`) mają kody wspólne z audytem, ale pytają o re-audyt.

**Role procesowe nie mają mechanicznego zakresu plików** — pracują na WYNIKACH działów,
nie na liście plików, więc komenda zakresu nie miałaby czego liczyć. Wyjątkiem jest
`KON`, który audytuje same sektory i dlatego zakres ma.

---

## KIER — Kierownik re-audytu  · **Fable 5.1**

**Po co.** Koordynuje 14 Pogłębiaczy i cztery role własne, zbiera wyniki i **pilnuje
kolejności §17**: re-audyt wchodzi do działu dopiero po tym, jak audyt z niego wyszedł.
Reguła nakładania (K9') jest jego, nie Goldena — Golden pilnuje procesu jako całości,
kierownik pilnuje TEGO sektora.

| # | Pytanie (tak/nie) | Komenda / miejsce | Dowód |
|---|---|---|---|
| KIER-R1 | Czy audyt **wyszedł** z działu, do którego wchodzi Pogłębiacz? | `status.mjs --pokaz` | dział + status roli audytu |
| KIER-R2 | Czy każdy Pogłębiacz ma plik stanu i **niezerową rundę**? | `status.mjs --pokaz` | rola bez stanu albo z rundą 0 |
| KIER-R3 | Czy każde zgłoszenie re-audytu ma **komplet werdyktów** (krytyk + WALID)? | `werdykt.mjs --pokaz` | ID bez kompletu |
| KIER-R4 | Czy `polacz-sektory.mjs --fala=N` domyka się i ile jest miejsc **tylko re-audytu**? | `node audyt/tools/polacz-sektory.mjs --fala=N` | trzy liczby z wyjścia |
| KIER-R5 | Czy niezmiennik sektora jest pusty? | `git diff main --name-only -- . ':!audyt' ':!re-audyt'` | kod wyjścia |
| KIER-R6 | Czy któraś rola wyczerpała sufit rund **bez** listy niedomkniętych? | `status.mjs --pokaz` (kod 1 przy wiszących) | rola + runda |
| KIER-R7 | Czy dział, który re-audyt zamknął, został zamknięty na **liczbie**, a nie na deklaracji? | wyjście roli × `zgloszenie.mjs` | dział + brakująca liczba |

**Nie bierze:** oceny pojedynczego znaleziska (→ krytycy ról i `WALID`), pracy w cudzym
obszarze (zasada 3).

---

## PSIARZ — Psy  · **Sonnet**

**Po co.** §17: **„re-audyt wypuszcza przysłowiowe psy".** Psiarz psuje kod **dokładnie
w miejscu potwierdzonego znaleziska** i patrzy, **czy cokolwiek szczeka** — strażnik,
test, bramka. **Milczenie przy zepsutym kodzie jest osobnym znaleziskiem**, nie brakiem
wyniku. Narzędzie jest gotowe: `tools/straznicy/audyt-straznikow.mjs` robi dokładnie to
na 340 mutacjach, tylko dla strażników.

| # | Pytanie (tak/nie) | Komenda / miejsce | Dowód |
|---|---|---|---|
| PSIARZ-R1 | Czy zepsucie kodu w miejscu znaleziska zapala **jakąkolwiek** bramkę? | mutacja + `npm run check` (kod BEZ potoku) | mutacja + kod wyjścia |
| PSIARZ-R2 | Czy zapala **właściwą** regułę, czy zapaliło się coś innego? | komunikat bramki × przedmiot mutacji | ślad w komunikacie |
| PSIARZ-R3 | Czy mutacja w ogóle **stworzyła warunek**, który deklaruje? | porównanie treści przed i po | różnica albo jej brak |
| PSIARZ-R4 | Czy istnieje **kontrprzykład** — zmiana dozwolona, która NIE zapala? | mutacja odwrotna | zmiana + kod 0 |
| PSIARZ-R5 | Czy po przebiegu drzewo robocze jest **czyste**? | `git status --porcelain` | wyjście komendy |
| PSIARZ-R6 | Czy milczenie przy zepsutym kodzie zostało zgłoszone **jako osobne znalezisko**? | `zgloszenie.mjs` | ID zgłoszenia |

**Nie bierze:** oceny bramek jako przedmiotu (→ Pogłębiacz QA). PSIARZ używa mutacji jako
NARZĘDZIA do znaleziska; QA pyta o bramki jako o PRZEDMIOT.

**Uwaga na dwie pułapki własnej pracy, obie kosztowały czas w tym repozytorium:** mutacja,
która nie tworzy deklarowanego warunku, jest **martwa** i daje fałszywą pewność; a kopia
zapasowa zrobiona w kolejnej turze jest już kopią wersji **zmutowanej** — kopia powstaje
RAZ, przed pierwszą mutacją, a przywracanie idzie przez `finally`.

---

## SKUT — Skutki uboczne  · **Sonnet**

**Po co.** Audyt ma skutki uboczne poza zakresem; re-audyt ich **nie ma prawa pominąć**
(§5, P2). Rola pyta, czy praca sektorów niczego nie zepsuła i czy wynik bramki nie wziął
się z cudzych śmieci.

| # | Pytanie (tak/nie) | Komenda / miejsce | Dowód |
|---|---|---|---|
| SKUT-R1 | Czy goldeny przechodzą **przed** przebiegiem i **po** nim? | `npm run check` ×2 | dwa kody wyjścia |
| SKUT-R2 | Czy obszar znaleziska dotyka rzeczy oznaczonych „sprawdzone i bez zarzutu"? | `grep` po dokumentach × miejsce | zdanie + miejsce |
| SKUT-R3 | Czy bramka, która przeszła, nie przeszła **po pustce** (zakres trafił w ≥1 element)? | asercja zakresu w bramce | bramka + liczba trafień |
| SKUT-R4 | Czy przebieg nie zostawił śmieci we **wspólnych** zasobach (poczta, zapisy, produkty)? | licznik przed/po na `:8892` | zasób + różnica |
| SKUT-R5 | Czy dane dowodowe właściciela są **nietknięte**? | odczyt tabel monitoringu i zamówień | liczby przed i po |
| SKUT-R6 | Czy **kolejność** bramek nie zmienia wyniku? | dwa przeloty w różnej kolejności | dwie listy wyników |

**Nie bierze:** naprawiania czegokolwiek (W2). Skutek uboczny jest **znaleziskiem**, nie
zadaniem do wykonania.

**Skąd te pozycje.** Każda ma w tym repozytorium swój przypadek: bramka przechodząca po
pustce (`/student-registration/` ślepe od 0.41.0), śmieci we wspólnych zasobach (smoke
kasujący CAŁĄ skrzynkę Mailpita), kolejność bramek zmieniająca wynik (`smoke-seo`
przebudowujący `.next` na eksport statyczny).

---

## STRAZ — Strażnikowy  · **Sonnet**

**Po co.** §17: **„strażnik może być warstwą ochronną przed powtórzeniem znanego
problemu".** Rola **projektuje** strażnika dla potwierdzonej klasy — projekt, nie
wdrożenie: sektory nie naprawiają (W2), a wdrożenie należy do osobnego kroku po dwóch
pełnych cyklach.

| # | Pytanie (tak/nie) | Komenda / miejsce | Dowód |
|---|---|---|---|
| STRAZ-R1 | Czy dla potwierdzonej klasy **istnieje już** strażnik? | `tools/straznicy` × klasa | strażnik + reguła |
| STRAZ-R2 | Czy ten strażnik pyta o **rozstrzygnięcie**, czy o nazwę albo napis? | wzorzec reguły | wzorzec + co przepuszcza |
| STRAZ-R3 | Czy klasa ma wpis w `rejestr/znane-bledy.json`? | odczyt rejestru | klasa bez wpisu |
| STRAZ-R4 | Czy projekt nowej reguły ma **test negatywny i kontrprzykład**? | opis projektu | oba przypadki wypisane |
| STRAZ-R5 | Czy projekt **nie wymaga** zmiany kodu produktu? | opis projektu | miejsce zmiany |
| STRAZ-R6 | Czy strażnik dałby się uruchomić **bez postawionego środowiska**, czy musi być warunkowy? | zależności projektu | wymagany zasób |

**Nie bierze:** wdrożenia strażnika (osobny krok po obu cyklach), oceny istniejących
bramek jako przedmiotu (→ Pogłębiacz QA).

**Dlaczego R2 jest osobną pozycją.** Wzorzec celujący w NAZWĘ zamiast w ROZSTRZYGNIĘCIE
zzieleniał strażnika przy zepsutym kodzie **dziewięć razy** w historii tego repozytorium.
Istniejący strażnik nie jest więc odpowiedzią na pytanie „czy klasa jest pilnowana".

---

## WALID — Walidacja szczegółowa  · **Opus**

**Po co.** §16: **„w re-audycie działa także osobny proces walidacji".** Rola sprawdza,
czy zgłoszone zjawisko **istnieje** — dzięki temu Pogłębiacz nie jest jedynym, kto uznaje
je za prawdziwe. To jest weryfikator re-audytu: wydaje werdykt `--kto=weryfikator`.

Różnica wobec weryfikatora audytu jest w §16 nazwana wprost: audyt robi **weryfikację
ogólną**, re-audyt **szczegółową** — sprawdza nie tylko, czy problem jest, ale czy podany
**zasięg** się zgadza.

| # | Pytanie (tak/nie) | Komenda / miejsce | Dowód |
|---|---|---|---|
| WALID-R1 | Czy zjawisko istnieje **w zgłaszanej postaci**? | odtworzenie z opisu | komenda + wynik |
| WALID-R2 | Czy dowód uruchomieniowy daje się **powtórzyć**? | drugi przebieg | dwa wyniki |
| WALID-R3 | Czy podany **zasięg** zgadza się z policzonym? | komenda zliczająca | liczba podana × zmierzona |
| WALID-R4 | Czy miejsce zgadza się z plikiem **co do znaku**? | `zgloszenie.mjs` (hash miejsca) | wynik bramki |
| WALID-R5 | Czy klasyfikacja i wpływ **wynikają z dowodu**, a nie z domysłu? | treść zgłoszenia × dowód | zdanie bez pokrycia |
| WALID-R6 | Czy zgłoszenie **pogłębia** wpis audytu, czy go powtarza? | wpis audytu × wpis re-audytu | co doszło ponad audyt |

**Nie bierze:** oceny PRACY agenta (→ krytyk roli). WALID ocenia ZJAWISKO — ten podział
jest ten sam, dla którego status `ZWERYFIKOWANE` wymaga **obu** werdyktów.

---

## RAP — Raport re-audytu  · **Opus**

**Po co.** Raport powstaje **na sam koniec**, gdy wszystkie role skończą. Podaje liczby,
nazywa, **czego re-audyt nie sprawdził**, i **nie proponuje napraw**.

| # | Pytanie (tak/nie) | Komenda / miejsce | Dowód |
|---|---|---|---|
| RAP-R1 | Czy każda liczba w raporcie pochodzi z **narzędzia**, nie z pamięci? | komendy cytowane w raporcie | liczba + komenda |
| RAP-R2 | Czy raport nazywa, **czego re-audyt nie sprawdził**? | sekcja raportu | lista pominięć |
| RAP-R3 | Czy raport **nie proponuje napraw** (W2)? | treść raportu | zdanie proponujące |
| RAP-R4 | Czy rozjazd fal jest **NAZWANY** (zgodne / nadzbiór / sprzeczne) i przedstawiony właścicielowi **z obu stron**, a nie ogłoszony defektem audytu (K4″)? | `porownaj-cykle.mjs` × raport | zdanie + wynik komendy |
| RAP-R5 | Czy wpisy **próbne** są wyłączone z liczb i policzone osobno? | nota z `polacz-sektory.mjs` | liczba pominiętych |
| RAP-R6 | Czy raport powstał **po** zakończeniu wszystkich ról? | `status.mjs --pokaz` | rola bez statusu ZAKOŃCZONE |

**Nie bierze:** oceny znalezisk (→ `WALID` i krytycy ról), koordynacji (→ `KIER`).

---

## KON — Konrad re-audytu  · **Fable 5.1**

**Po co.** Konrad audytuje **RE-AUDYT, nie projekt** (P1). Produktem są **luki
w re-audycie**: obszar, do którego nie wchodzi nikt, klasa potwierdzona przez audyt,
której nikt nie zmierzył, deklaracja bez kontrprzykładu.

**Zakres — oba sektory**
```
git ls-files -- 'audyt' 're-audyt'
```

| # | Pytanie (tak/nie) | Komenda / miejsce | Dowód |
|---|---|---|---|
| KON-R1 | Czy istnieje obszar audytu, do którego **nie wchodzi** żaden Pogłębiacz? | zakresy obu `ROLE.md` | obszar |
| KON-R2 | Czy istnieje klasa potwierdzona przez audyt, której **nikt nie zmierzył** co do zasięgu? | zgłoszenia audytu × zgłoszenia re-audytu | klasa + brak wpisu |
| KON-R3 | Czy „re-audyt uruchomił to na `:8892`" jest **prawdą** dla każdego takiego zgłoszenia? | treść dowodów | zgłoszenie bez uruchomienia |
| KON-R4 | Czy granice między `PSIARZ`, `SKUT`, `STRAZ` i `WALID` zostawiają **szczelinę**? | `re-audyt/GRANICE.md` | znalezisko bez właściciela |
| KON-R5 | Czy Pogłębiacz **przepisał** wpis audytu zamiast go pogłębić? | wpis audytu × wpis re-audytu | ID + brak przyrostu |
| KON-R6 | Czy wynik re-audytu zależy od **kolejności** ról? | dwa przeloty × `porownaj-cykle.mjs` | różnica między przelotami |

**Nie bierze:** łamania założeń SYSTEMU („co, jeśli baza nie odpowiada") — to zostaje przy
Pogłębiaczach, w ich obszarach. Konrad łamie założenia **re-audytu**.

---

# Podsumowanie

| | Ile |
|---|---|
| Pogłębiaczy (kody wspólne z działami audytu) | **14** |
| Ról procesowych własnych (`PSIARZ`, `SKUT`, `STRAZ`, `WALID`) | **4** |
| Ról procesowych o kodach wspólnych (`KIER`, `RAP`, `KON`) | **3** |
| **Razem ról** | **21** |
| **Razem agentów** (każda rola z krytykiem, WYTYCZNE N1) | **42** |
| Pozycji checklist | **6 × 14 + 7 + 6 × 5 = 121** |

Modele wg D8 (zmiana właściciela 2026-09-02): `KIER`, `KON` — **Fable 5.1**; `RAP`, `WALID` — **Opus**;
pozostałe — **Sonnet**; **wszyscy krytycy — Opus**.
