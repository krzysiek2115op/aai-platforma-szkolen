---
name: qa-testing-audit
description: Wyłącznie jako rola QA sektora AUDYT: sprawdzanie, czy strażnik, mutacja i bramka mierzą to, co obiecują — przez mutację, test negatywny i pytanie o rozstrzygnięcie zamiast o nazwę. Używać przy pozycjach QA-01…QA-15.
---

# Audyt bramek i testów — umiejętność roli QA

---

## TRZY ZASADY NADRZĘDNE

### 1. NIE MA WYMYŚLANIA BŁĘDÓW
Każde zgłoszenie ma podstawę i możliwość potwierdzenia. **Brak dowodu = brak
zgłoszenia.**

### 2. AUDYT I RE-AUDYT NIE NAPRAWIAJĄ
Sektory **znajdują i wskazują, nigdy nie poprawiają**.

### 3. SWÓJ ZAKRES — DRĄŻYĆ, NIE PRZEKAZYWAĆ
Audytor pracuje nad własnym znaleziskiem sam, **nie przekazuje go innemu
działowi** i nie naprawia.

---

## Kiedy używać

Przy **każdej** pozycji QA poza QA-05 (historia CI) i QA-09 (odczyt komendy).
To jest dział, w którym samo czytanie kodu prawie nigdy nie wystarcza: bramka
wygląda poprawnie dokładnie do chwili, w której ją zmutujesz.

## Procedura

1. **Przeczytaj, co bramka OBIECUJE**, zanim spojrzysz, co robi. Obietnica siedzi
   w komunikacie sukcesu, w nazwie reguły i w komentarzu.
   *Wynik:* cytat obietnicy z `plik:linia`.

2. **Zapytaj: co musiałoby się zepsuć w kodzie, żeby ta bramka się zapaliła?**
   Jeśli odpowiedź brzmi „przemianowanie", a nie „zmiana zachowania" — masz
   znalezisko QA-01.
   *Wynik:* jedno zdanie opisujące zmianę, która ją zapala.

3. **ZMUTUJ i zmierz.** Zepsuj rozstrzygnięcie, nie nazwę. Uruchom bramkę.
   **Przywróć plik z kopii zrobionej PRZED mutacją, nigdy przez `git checkout --`** —
   to kasuje niezacommitowaną pracę i zdarzyło się w tym repo dwa razy w jednej sesji.
   *Wynik:* kod wyjścia przed mutacją i po niej — dwie liczby.

4. **Sprawdź, czy zapaliła się WŁAŚCIWA reguła.** Mutacja łamiąca dwie reguły naraz
   maskuje jedną z nich i wygląda to na sukces (`oczekiwanySlad`).
   *Wynik:* treść komunikatu + nazwa reguły, która go wydała.

5. **Policz, ILE sprawdzeń padło.** „1 z 96" mówi, że asercja trafia w swój przypadek
   i tylko w niego; „6 z 96" znaczy, że sprawdzenia mają wspólny powód.
   *Wynik:* dwie liczby — padłych i wszystkich.

6. **Test negatywny puszczaj na ZDROWYCH danych.** Na zepsutych przechodzi fałszywie:
   tytuł modułu równa się wtedy tytułowi ostatniej lekcji i pomiar potwierdza sam siebie.
   *Wynik:* stan danych przed testem, opisany jednym zdaniem.

## Komendy

```
# wzorce celujące w nazwę zamiast w rozstrzygnięcie
grep -rn "\\w" tools/straznicy | grep -v "p{L}"
grep -rn "includes(\|endsWith(" tools/smoke

# martwe asercje i sprzątanie
grep -rn -A5 "process.exit" tools/smoke
grep -rn "delete_option\|update_option" tools/smoke

# audyt mutacyjny — na wszystkich albo na wskazanym
node tools/straznicy/audyt-straznikow.mjs
node tools/straznicy/audyt-straznikow.mjs <nazwa-straznika>

# historia przebiegów (QA-05 — jedyna pozycja spoza kodu)
gh run list --limit 50 --json name,conclusion,createdAt,headBranch
```

Kody wyjścia **bez potoku**. `npm run check` to jedna bramka złożona z wielu — gdy
pada, pytaj KTÓRA jej część, a nie tylko czy padła.

## Czego ta umiejętność NIE robi

- **nie dostarcza narzędzi pomiarowych** (→ USP): „nie da się tego zmierzyć" jest ich
  zgłoszeniem, „to, czym mierzymy, mierzy nie to" — Twoim;
- **nie ocenia wydajności bramek** (→ PERF);
- **nie ocenia liczb w README** (→ REPO): rozjazd „62 testy" wobec 83 jest ich;
- **nie ocenia kodu, który bramka pilnuje** — to dział właściwy dla tego kodu.

## Znane pułapki

- **Kopię do przywracania rób PRZED PIERWSZĄ mutacją.** Kopia zrobiona w kolejnej turze
  jest już kopią wersji zmutowanej — zdarzyło się dwa razy w jednej sesji.
- **`git checkout -- <plik>` kasuje niezacommitowaną pracę.** Do przywracania służy kopia.
- **Bramka bez `ZRZUTY_RIG` pada przed pierwszą asercją** i wygląda jak bramka, która nic
  nie znalazła. Kod wyjścia jest jedynym śladem.
- **Nowy blok sprawdzeń wstawiony w ŚRODEK bramki zaburza stan następnym blokom** —
  trzy padnięcia wyglądają wtedy jak błąd kodu, a są błędem kolejności w teście.
- **`smoke-wp-motyw` bywa niestabilny w PEŁNYM przelocie** (2 z 91), a osobno przechodzi.
  Przyczyny nie ustalono w T1 ani w T2 — **nie zaczynaj tego śledztwa od nowa**, odnotuj.
- **Bramka UBITA zostawia swoje wiersze**, a kolejny przebieg ich nie usuwa (sprzątanie
  idzie od własnej migawki). Ślady kasuje się po znaku (`smoke-`, `203.0.113.0/24`),
  nigdy po zakresie identyfikatorów.
