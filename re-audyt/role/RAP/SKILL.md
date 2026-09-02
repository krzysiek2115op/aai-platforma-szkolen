---
name: rap-re-audit
description: Procedura roli Raport re-audytu sektora RE-AUDYT — kiedy przestać czytać i zacząć mierzyć.
---

# Raport re-audytu — umiejętność roli RAP (sektor RE-AUDYT)

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

Na sam koniec, gdy WSZYSTKIE role mają status ZAKOŃCZONE. Raport pisany wcześniej opisuje stan, który jeszcze się zmieni.

## Procedura

1. `status.mjs --pokaz` — sprawdź, że nie ma roli bez `ZAKOŃCZONE`.
2. `werdykt.mjs --pokaz` — policz zgłoszenia i ich werdykty.
3. `polacz-sektory.mjs --fala=<N>` — trzy liczby plus nota o wpisach próbnych.
4. `porownaj-cykle.mjs --sektor=re-audyt` po obu falach — do raportu idzie wynik
   NAZWANY (zgodne / nadzbiór / sprzeczne) **z obu stron**, także per dział
   (`--dzial=<KOD>`); kod 1 znaczy wyłącznie kopiowanie albo brak fali, nie
   defekt audytu (K4″).
5. Wypisz, CZEGO re-audyt nie sprawdził — pominięcia są wynikiem, nie porażką.
6. Przeczytaj własny tekst pod kątem zdań proponujących naprawę i usuń je.

## Komendy

```
node audyt/tools/werdykt.mjs --pokaz
node audyt/tools/status.mjs --pokaz
node audyt/tools/zgloszenie.mjs --plik=<wpis.json>
```

**Kod wyjścia mierzymy bez potoku** — `| tail` maskuje status.

## Czego ta umiejętność NIE robi

Ocena znalezisk (`WALID`, krytycy ról) i prowadzenie przebiegu (`KIER`).

## Znane pułapki

- **Pomiar bez sprawdzenia kodu wyjścia mierzy ciszę, nie stan.** Bramka, która nie
  wystartowała, wygląda w liczniku identycznie jak bramka, która nic nie znalazła.
- **Sprawdzenie, które mówi „zero", bywa ślepe po OBU stronach.** Zanim uznasz zero
  za wynik, sprawdź, że komenda w ogóle trafia w swój przedmiot.
- **Przejście po pustce.** Zakres, który zwraca zero plików, przechodzi każdą pozycję
  checklisty i wygląda jak praca wykonana.
- **Bramka nie może sprzątać CUDZYCH danych.** Licz stan przed i po; usuwaj wyłącznie
  to, co sam założyłeś.
- **Wzorzec pytający o NAZWĘ zamiast o ROZSTRZYGNIĘCIE** zzieleniał strażnika przy
  zepsutym kodzie dziewięć razy w historii tego repozytorium.
