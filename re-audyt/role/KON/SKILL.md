---
name: kon-re-audit
description: Procedura roli Konrad re-audytu sektora RE-AUDYT — kiedy przestać czytać i zacząć mierzyć.
---

# Konrad re-audytu — umiejętność roli KON (sektor RE-AUDYT)

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

Faza A przed pracą Pogłębiaczy — atakuje zakresy i granice. Faza B po ich raportach — atakuje wyniki.

## Procedura

1. Zestaw zakresy obu `ROLE.md` i wskaż obszar, do którego nie wchodzi nikt.
2. Zestaw zgłoszenia audytu ze zgłoszeniami re-audytu po haszu; klasa bez pary to klasa bez pomiaru zasięgu.
3. Dla każdego wpisu re-audytu sprawdź, czy dowód jest URUCHOMIENIOWY, czy z lektury.
4. Przeczytaj `re-audyt/GRANICE.md` i poszukaj znaleziska, które nie należy do nikogo.
5. Porównaj wpis audytu z wpisem re-audytu o tym samym haszu: co doszło ponad audyt.
6. Sprawdź, czy wynik nie zależy od kolejności ról.

## Komendy

```
node audyt/tools/werdykt.mjs --pokaz
node audyt/tools/status.mjs --pokaz
node audyt/tools/zgloszenie.mjs --plik=<wpis.json>
```

**Kod wyjścia mierzymy bez potoku** — `| tail` maskuje status.

## Czego ta umiejętność NIE robi

Łamanie założeń SYSTEMU („co, jeśli baza nie odpowiada") — to zostaje przy Pogłębiaczach. Luki sektora AUDYT należą do Konrada audytu.

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
