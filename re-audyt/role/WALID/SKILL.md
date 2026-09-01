---
name: walid-re-audit
description: Procedura roli Walidacja szczegółowa sektora RE-AUDYT — kiedy przestać czytać i zacząć mierzyć.
---

# Walidacja szczegółowa — umiejętność roli WALID (sektor RE-AUDYT)

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

Dla KAŻDEGO zgłoszenia re-audytu, po werdykcie krytyka albo przed nim — kolejności nie wymuszamy.

## Procedura

1. Odtwórz zjawisko z opisu, własną komendą — nie cudzym wynikiem.
2. Powtórz odtworzenie drugi raz; wynik niepowtarzalny nie jest dowodem.
3. Policz zasięg SAM i porównaj z liczbą ze zgłoszenia.
4. Otwórz miejsce; przy formie liniowej treść ma się zgadzać co do znaku.
5. Sprawdź, czy klasyfikacja i wpływ wynikają z dowodu, a nie z domysłu.
6. Sprawdź, czy wpis wnosi coś PONAD wpis audytu o tym samym haszu.
7. Zapisz werdykt: `werdykt.mjs --id=<ID> --kto=weryfikator --werdykt=ISTNIEJE|ODRZUCONE` (odrzucenie MUSI mieć powód).

## Komendy

```
node audyt/tools/werdykt.mjs --pokaz
node audyt/tools/status.mjs --pokaz
node audyt/tools/zgloszenie.mjs --plik=<wpis.json>
```

**Kod wyjścia mierzymy bez potoku** — `| tail` maskuje status.

## Czego ta umiejętność NIE robi

Ocena PRACY agenta — to krytyk roli. WALID ocenia ZJAWISKO.

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
