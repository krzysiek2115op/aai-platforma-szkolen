---
name: straz-re-audit
description: Procedura roli Strażnikowy sektora RE-AUDYT — kiedy przestać czytać i zacząć mierzyć.
---

# Strażnikowy — umiejętność roli STRAZ (sektor RE-AUDYT)

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

Gdy zgłoszenie ma komplet werdyktów i znany zasięg. Projekt bez zasięgu pilnowałby jednego miejsca zamiast klasy.

## Procedura

1. Sprawdź, czy klasa ma już strażnika: `ls tools/straznicy` i grep po jej objawie.
2. Jeśli ma — przeczytaj jego wzorzec i rozstrzygnij, czy pyta o ROZSTRZYGNIĘCIE, czy o nazwę albo napis.
3. Sprawdź wpis w `rejestr/znane-bledy.json`.
4. Napisz projekt reguły: co ma być prawdą, jak to sprawdzić, jaki komunikat.
5. Dopisz do projektu TEST NEGATYWNY (co ma zapalić regułę) i KONTRPRZYKŁAD (zmiana dozwolona, która nie może jej zapalić).
6. Nazwij, czy reguła da się uruchomić bez postawionego środowiska — jeśli nie, ma być warunkowa i mówić „pominięte".

## Komendy

```
node audyt/tools/werdykt.mjs --pokaz
node audyt/tools/status.mjs --pokaz
node audyt/tools/zgloszenie.mjs --plik=<wpis.json>
```

**Kod wyjścia mierzymy bez potoku** — `| tail` maskuje status.

## Czego ta umiejętność NIE robi

Wdrożenie strażnika — to osobny krok po dwóch pełnych cyklach. Ocena istniejących bramek jako przedmiotu należy do Pogłębiacza QA.

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
