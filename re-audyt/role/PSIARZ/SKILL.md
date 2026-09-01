---
name: psiarz-re-audit
description: Procedura roli Psy sektora RE-AUDYT — kiedy przestać czytać i zacząć mierzyć.
---

# Psy — umiejętność roli PSIARZ (sektor RE-AUDYT)

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

Po tym, jak zgłoszenie audytu dostało komplet werdyktów — nie wcześniej. Mutowanie miejsca, które nie jest potwierdzone, mierzy hipotezę, nie usterkę.

## Procedura

1. Zrób kopię pliku RAZ, przed pierwszą mutacją — kopia z drugiej tury jest już kopią wersji zmutowanej.
2. Zepsuj miejsce ze zgłoszenia tak, żeby usterka STAŁA SIĘ CZYNNA.
3. Sprawdź, że mutacja naprawdę zmieniła treść — mutacja, która nie tworzy deklarowanego warunku, jest martwa.
4. Uruchom bramki i zanotuj kod wyjścia BEZ POTOKU.
5. Sprawdź ŚLAD: czy zapaliła się reguła o tym, co psułeś, czy zapaliło się co innego.
6. Przywróć plik z kopii i sprawdź `git status --porcelain`.
7. Cisza przy zepsutym kodzie → zgłoszenie pod `PSIARZ-R1`.

## Komendy

```
node audyt/tools/werdykt.mjs --pokaz
node audyt/tools/status.mjs --pokaz
node audyt/tools/zgloszenie.mjs --plik=<wpis.json>
```

**Kod wyjścia mierzymy bez potoku** — `| tail` maskuje status.

## Czego ta umiejętność NIE robi

Ocena bramek jako przedmiotu badania należy do Pogłębiacza QA. PSIARZ używa mutacji jako narzędzia do znaleziska.

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
