---
name: skut-re-audit
description: Procedura roli Skutki uboczne sektora RE-AUDYT — kiedy przestać czytać i zacząć mierzyć.
---

# Skutki uboczne — umiejętność roli SKUT (sektor RE-AUDYT)

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

Po każdym przelocie bramek i po każdej mutacji Psiarza — oraz zawsze, gdy znalezisko dotyka wspólnego zasobu (poczta, zapisy na kursy, produkty, dziennik).

## Procedura

1. Policz stan wspólnych zasobów PRZED (skrzynka, zapisy, produkty, wiersze dziennika).
2. Uruchom to, co masz ocenić.
3. Policz stan PO i porównaj — różnica jest znaleziskiem, nie szumem.
4. Sprawdź, czy bramka, która przeszła, trafiła w ≥1 element — przejście po pustce wygląda identycznie jak zaliczenie.
5. Powtórz przelot w INNEJ kolejności; różnica wyniku jest znaleziskiem.
6. Na koniec `npm run check` — kod wyjścia bez potoku.

## Komendy

```
node audyt/tools/werdykt.mjs --pokaz
node audyt/tools/status.mjs --pokaz
node audyt/tools/zgloszenie.mjs --plik=<wpis.json>
```

**Kod wyjścia mierzymy bez potoku** — `| tail` maskuje status.

## Czego ta umiejętność NIE robi

Naprawianie czegokolwiek (W2). Skutek uboczny jest znaleziskiem, nie zadaniem.

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
