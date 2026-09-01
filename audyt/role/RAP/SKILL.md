---
name: audit-report
description: Wyłącznie jako rola RAP sektora AUDYT: złożenie raportu z liczb, werdyktów i obu migawek wartości, z jawną sekcją granic i bez ani jednej propozycji naprawy. Używać przy pozycjach RAP-01…RAP-06.
---

# Raport końcowy audytu — umiejętność roli RAP

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

**Raz, na samym końcu fali** — gdy czternaście działów ma status `ZAKOŃCZONE`,
weryfikator wydał werdykty, a kierownik zamknął zbieranie.

Raport pisany wcześniej opisuje stan, który się jeszcze zmieni.

## Procedura

1. **Policz wszystko, zanim napiszesz pierwsze zdanie.** Zgłoszenia przyjęte,
   odrzucone, pozycje zamknięte, pozycje niedomknięte, działy zakończone.
   *Wynik:* tabela liczb — to jest szkielet raportu.

2. **Dla każdego zgłoszenia sprawdź, czy ma WERDYKT weryfikatora.** Wpis bez werdyktu
   nie jest gotowy do raportu.
   *Wynik:* liczba zgłoszeń × liczba z werdyktem — muszą być równe.

3. **Zestaw obie migawki wartości.** Rozjazd znaczy, że sektor coś zmienił — a to jest
   znalezisko ważniejsze od wszystkich pozostałych razem.
   *Wynik:* kod wyjścia `migawka-wartosci.mjs --porownaj`.

4. **Napisz sekcję granic: czego audyt nie sprawdził.** Kursy (D4), pozycje niedomknięte
   po suficie, granice, które milczały, obszary bez narzędzia pomiarowego.
   *Wynik:* lista wykluczeń, każde z powodem.

5. **Oddziel znaleziska prototypu** (D5) do własnej sekcji.
   *Wynik:* dwie listy zamiast jednej.

6. **Przeczytaj raport szukając zdań PROPONUJĄCYCH ZMIANĘ.** „Należy", „warto",
   „wystarczy dodać", „proponuję" — każde z nich łamie W2.
   *Wynik:* liczba takich zdań; ma być zero.

## Komendy

```
# liczby
node audyt/tools/status.mjs --pokaz
ls audyt/zgloszenia/*.json | wc -l
node audyt/tools/polacz-sektory.mjs --fala=<N>

# wartości początku i końca
node audyt/tools/migawka-wartosci.mjs --porownaj

# powtarzalność
node audyt/tools/porownaj-cykle.mjs

# dowód, że sektor niczego nie naprawił
git diff main --name-only -- . ':!audyt' ':!re-audyt'
```

Kody wyjścia **bez potoku**.

## Czego ta umiejętność NIE robi

- **nie proponuje napraw** (W2) — ani jednej, także oczywistej;
- **nie ocenia znalezisk** (→ WER i krytycy ról) — przenosi ich werdykty;
- **nie zbiera wyników** (→ KIER) — dostaje je zebrane;
- **nie ocenia produktu na własną rękę**: zdanie, które nie ma pokrycia w żadnym
  zgłoszeniu z werdyktem, do raportu nie wchodzi.

## Znane pułapki

- **Zdanie proponujące naprawę wchodzi do raportu samo.** „Wystarczy dodać sprawdzenie"
  brzmi jak opis usterki, a jest propozycją zmiany. Czytaj raport osobno pod tym kątem.
- **Raport bez sekcji granic czyta się jak pokrycie pełne.** Brak sekcji jest usterką
  raportu, nie skromnością.
- **Odrzucone zgłoszenie też jest wynikiem** — jego brak w raporcie zamienia „sprawdzone
  i odrzucone" w „nie sprawdzone".
- **Liczba bez mianownika nic nie znaczy.** „Dwanaście znalezisk" wobec ilu pozycji,
  w ilu działach, w której fali.
- **Migawki porównuj narzędziem, nie wzrokiem** — dwa pomiary tej samej rzeczy muszą
  używać tego samego wzorca, inaczej podnoszą fałszywy alarm.
