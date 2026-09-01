---
name: performance-audit
description: Wyłącznie jako rola PERF sektora AUDYT: liczenie kosztu odsłony w zapytaniach, przebiegach i kilobajtach, z sondą kontrolną przed każdym wnioskiem. Używać przy pozycjach PERF-01…PERF-08.
---

# Audyt wydajności — umiejętność roli PERF

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

Przy pozycjach **PERF-01, PERF-02, PERF-03 i PERF-07** — czyli tam, gdzie odpowiedź
jest LICZBĄ, a nie obecnością linii.

Przy PERF-04, PERF-05, PERF-06 i PERF-08 wystarczy odczyt kodu i porównanie
z zapisanym pomiarem.

## Procedura

1. **Ustal, co mierzysz i na czym**, zanim uruchomisz cokolwiek. Trasa, stan konta
   (gość, klient, admin), stan cache'u.
   *Wynik:* jedno zdanie warunków pomiaru — bez nich liczba nic nie znaczy.

2. **Weź sondę kontrolną PRZED wnioskiem.** Dwa pomiary tej samej rzeczy w odstępie.
   Rozjazd rzędu wielkości znaczy, że mierzysz infrastrukturę, nie kod.
   *Wynik:* dwie liczby, nie jedna.

3. **Dla zapytań licz per TRASA, nie per metoda.** N+1 widać dopiero w sumie odsłony.
   *Wynik:* liczba zapytań dla każdej z czterech tras (katalog, kurs, lekcja, „Moje kursy").

4. **Dla każdej pętli sprawdź, czy zapytanie jest w środku.** `foreach` z `$wpdb`
   w ciele to N+1 niezależnie od tego, jak małe jest N dzisiaj.
   *Wynik:* `plik:linia` pętli i `plik:linia` zapytania.

5. **Sprawdź, czy powtarzalny wynik jest pamiętany na czas żądania.** Ta sama metoda
   wołana dwa razy w jednej odsłonie to podwojony koszt.
   *Wynik:* nazwa metody + liczba wywołań na odsłonę.

6. **Wniosek podpisz liczbą i warunkami.** „Wolne" nie jest wnioskiem; „317 zapytań na
   odsłonę katalogu przy 2 kursach" jest.
   *Wynik:* liczba, trasa, warunki.

## Komendy

```
# N+1 i pamięć na żądanie
grep -rn -B5 "foreach" wordpress/wtyczki | grep '\$wpdb'
grep -rn "static \$" wordpress/wtyczki

# nagłówki widoku prywatnego i zasoby
grep -rn "nocache_headers" wordpress/wtyczki
grep -n "wp_enqueue" wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-zasoby.php

# źródło liczb w README
cat goldeny/pomiary-lighthouse.json
```

**Pomiar wagi i czasu:** `node tools/pomiar-psi.mjs` (wymaga `PAGESPEED_KLUCZ` w `.env`,
mediana z 5 — protokół zapisany w README). **Nie mierz lokalnym Lighthouse'em**: mierzy
też obciążenie tej maszyny, a liczby w README pochodzą z PSI.

Kody wyjścia **bez potoku**.

## Czego ta umiejętność NIE robi

- **nie ocenia poprawności zapytań** (→ BD) — „zapytanie zwraca zły wynik" jest ich,
  „to samo zapytanie biegnie 45 razy" jest Twoje;
- **nie ocenia poprawności bramek pomiarowych** (→ QA): bramka mierząca nie to, co
  obiecuje, jest ich znaleziskiem;
- **nie dostarcza narzędzi** (→ USP): brak sposobu na policzenie zapytań to ICH pozycja,
  Twoją jest dopiero liczba, która z niego wyjdzie;
- **nie ocenia, czy klient coś widzi** (→ FE).

## Znane pułapki

- **Wynik identyczny co do milisekundy w kilku buildach to sygnał, że mierzysz nie to.**
  Po deployu przed pomiarem odczekaj ≥10 minut (edge cache `max-age=600`).
- **PSI miewa czkawkę infrastruktury** — jedna seria potrafi dać TBT 1263 ms przy realnym
  ~100 ms. Sonda kontrolna, zawsze.
- **`opcache.revalidate_freq = 2`**: po zmianie pliku PHP odczekaj ≥3 s, inaczej mierzysz
  poprzedni stan kodu.
- **Porty 3005–3007 bywają zajęte** przez serwery pomiarowe — ubijaj `fuser -k <port>/tcp`,
  nigdy `pkill -f "next start"` (trafia własną powłokę).
- **Dwa pomiary tej samej rzeczy muszą dawać tę samą liczbę.** Migawka wartości sektora
  liczyła kiedyś 2106 testów zamiast 83, bo mierzyła innym wzorcem niż bramka.
