---
name: promise-audit
description: Wyłącznie jako rola PIK sektora AUDYT: sprawdzanie, czy definicja ukończenia, niezmienniki diagramów, wytyczne i decyzje właściciela mają odpowiednik w gotowym produkcie. Używać przy pozycjach PIK-01…PIK-08.
---

# Audyt obietnic początku wobec końca — umiejętność roli PIK

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

Przy **każdej** pozycji PIK — bo każda z nich to porównanie DWÓCH rzeczy: obietnicy
i produktu. Odczyt jednego dokumentu nigdy nie wystarczy w tej roli.

## Procedura

1. **Wypisz obietnice, zanim spojrzysz na kod.** Definicja ukończenia, niezmienniki
   N1–N18, wytyczne §1–§8 i N1–N3, decyzje D/P/W/K oznaczone jako wykonane, bramki
   B1–B7, W1–W6, P0–P6, T0–T4.
   *Wynik:* lista obietnic z `plik:linia` — to Twój mianownik.

2. **Dla każdej obietnicy wskaż MIEJSCE SPEŁNIENIA w produkcie**, nie w innym dokumencie.
   Dokument potwierdzający dokument nie jest dowodem.
   *Wynik:* `plik:linia` w kodzie albo słowo BRAK.

3. **Sprawdź, czy zapis nie jest oznaczony jako historyczny.** `CLAUDE.md` jest
   dziennikiem; sprzeczność z późniejszym zapisem bywa zamierzona.
   *Wynik:* czy zdanie ma oznaczenie — tak albo nie.

4. **Dla decyzji szukaj ODWRÓCENIA, nie tylko spełnienia.** Decyzja wykonana i po cichu
   cofnięta przez późniejszy commit jest znaleziskiem, którego nie widać z żadnej strony
   osobno.
   *Wynik:* decyzja + commit, który ją odwrócił.

5. **Dla każdej bramki znajdź ZAPISANY wynik** — zaliczona, kiedy, przez kogo.
   *Wynik:* `plik:linia` zapisu albo BRAK.

6. **Potwierdzaj też obietnice DOTRZYMANE.** Twoim produktem jest bilans początku
   i końca, nie sama lista usterek — kierownik potrzebuje obu stron.
   *Wynik:* liczba obietnic spełnionych i niespełnionych.

## Komendy

```
# obietnice
sed -n '/2.4 Definicja ukończenia/,/^## /p' docs/PLAN.md
grep -n "^| N[0-9]" docs/plugin-*/DIAGRAM.md
grep -n "^## §\|^### N[0-9]" docs/WYTYCZNE.md

# decyzje i ich stan
grep -n "ZOSTAJE DO DECYZJI\|DECYZJA WŁAŚCICIELA\|ROZSTRZYGNIĘTE\|Zapis historyczny" CLAUDE.md docs/*.md

# bramki i ich wyniki
grep -rn "ZALICZON\|akceptuj\|B[1-7] \|W6\|P6\|T4" CHANGELOG.md docs/**/TEST-RECZNY*.md

# odwrócenia
git log --oneline --all | head -40
```

Kody wyjścia **bez potoku**.

## Czego ta umiejętność NIE robi

- **nie ocenia prawdziwości liczb w dokumentacji** (→ REPO): „README podaje 62 testy
  przy 83" jest ich, „pozycja definicji ukończenia odhaczona, choć niezrobiona" — Twoja;
- **nie ocenia zgodności schematów z kodem** (→ ARCH);
- **nie rozstrzyga pozycji zostawionych właścicielowi** — potwierdzasz, że są zapisane,
  i tyle. Rozstrzygnięcie należy do niego.

## Znane pułapki

- **`CLAUDE.md` jest dziennikiem, nie instrukcją.** Zapis nieaktualny bywa zostawiony
  celowo, z oznaczeniem. Brak oznaczenia jest znaleziskiem — sam zapis nie.
- **Jedna linia `CLAUDE.md` jest nieaktualna ŚWIADOMIE** (stan sektora audytu), bo
  niezmiennik zabrania zmian poza `audyt/`. Jest to opisane w `audyt/PLAN-BUDOWY.md`
  jako pozycja do decyzji właściciela — potwierdź, nie zgłaszaj jako nowe.
- **Decyzja może być spełniona w jednym module i odwrócona w drugim.** Sprawdzaj
  produkt, nie deklarację o produkcie.
- **Obietnica dotrzymana też jest wynikiem.** Bilans bez strony pozytywnej nie mówi
  kierownikowi, ile z planu faktycznie stoi.
