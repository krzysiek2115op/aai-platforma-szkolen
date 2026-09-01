---
name: golden-guard
description: Wyłącznie jako rola GOLD sektora AUDYT: czytanie wyjścia działu wobec trzynastu zasad Goldena przed zebraniem go przez kierownika, z blokadą wskazującą numer zasady i cytat. Używać przy pozycjach GOLD-01…GOLD-08.
---

# Bramka zasad — umiejętność roli GOLD

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

**Na WYJŚCIU każdego działu**, dokładnie raz — po tym, jak dział ogłosił zakończenie,
a przed tym, jak kierownik zbierze jego wynik.

Nie wołasz jej w trakcie pracy działu: harness na to nie pozwala, a udawanie, że
pozwala, byłoby nieprawdą wpisaną w procedurę.

## Procedura

1. **Przejdź trzynaście zasad po kolei, nie wybiórczo.** Zasada pominięta dlatego,
   że „raczej w porządku", przestaje być bramką.
   *Wynik:* trzynaście werdyktów.

2. **Dla zasady 1 sprawdź KAŻDE zgłoszenie działu pod kątem podstawy.** Bramka
   `zgloszenie.mjs` odrzuca wpis bez dowodu, więc wpis bez podstawy mógł powstać tylko
   z pominięciem narzędzia.
   *Wynik:* liczba zgłoszeń × liczba z dowodem — dwie liczby, które muszą być równe.

3. **Dla zasady 2 zestaw zgłoszenia z tabelą granic.** Znalezisko przypisane do złego
   działu rozjedzie drugą falę (K4′).
   *Wynik:* lista zgłoszeń poza zakresem, z numerem wiersza tabeli granic.

4. **Dla zasady 3 szukaj artefaktów procedury**, nie deklaracji użycia skilla.
   *Wynik:* kroki procedury × obecność ich artefaktu w wyjściu.

5. **Dla zasady 6 uruchom `git diff`.** To jest jedyny wiarygodny dowód, że nikt
   niczego nie naprawił — obietnica „agent nie może pisać" byłaby nieprawdą (K3).
   *Wynik:* kod wyjścia i liczba zmienionych plików.

6. **Blokując, podaj NUMER ZASADY i CYTAT.** Blokada bez tego jest znaleziskiem
   Twojego krytyka.
   *Wynik:* numer + cytat + jedno zdanie, co ma się zmienić, żeby przeszło.

## Komendy

```
# wyjście działu
node audyt/tools/status.mjs --pokaz
ls audyt/zgloszenia/AUD-<DZIAŁ>-*.json

# zasada 6 — czy ktokolwiek cokolwiek naprawił
git diff main --name-only -- . ':!audyt' ':!re-audyt'
git status --porcelain -- . ':!audyt' ':!re-audyt' ':!.claude'

# zasada 1 — czy bramka wpuszczania działa
node audyt/tools/zgloszenie.mjs --test

# zasady 8, 9, 12 — kolejność i wartości
node audyt/tools/porownaj-cykle.mjs
node audyt/tools/migawka-wartosci.mjs --porownaj
```

Kody wyjścia **bez potoku**.

## Czego ta umiejętność NIE robi

- **nie ocenia, czy znalezisko jest prawdziwe** (→ WER i krytyk roli): Ty pytasz, czy
  powstało zgodnie z zasadami;
- **nie audytuje kodu produktu** — znalezisko, którego dział nie zgłosił, nie jest
  Twoim przedmiotem;
- **nie zamyka działu** (→ KIER);
- **nie blokuje bez wskazania zasady** — to jest znalezisko Twojego krytyka.

## Znane pułapki

- **Nadzór na żywo nie istnieje w tym harnessie.** Nie obiecuj go w raporcie i nie
  planuj pracy tak, jakby był.
- **Ślad użycia skilla jest w TREŚCI, nie w liście wywołań** — skille ról nie są
  instalowane w harnessie (rozstrzygnięcie właściciela).
- **`git diff` nie widzi `.claude/`** — to wyjątek nazwany, generat definicji agentów.
  Do sprawdzenia stanu roboczego służy `git status --porcelain` z tym samym wyłączeniem.
- **Odrzucone zgłoszenie zostaje** z werdyktem. Blokada nie kasuje.
- **Blokada bez podstawy kosztuje tyle samo co przeoczenie** — zatrzymuje pracę i psuje
  porównanie fal, bo dział wraca do tych samych pytań w innym stanie.
