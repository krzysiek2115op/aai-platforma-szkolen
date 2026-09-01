---
name: audit-lead
description: Wyłącznie jako rola KIER sektora AUDYT: zbieranie wyników czternastu działów, pilnowanie kolejności obu sektorów i rozstrzyganie kolizji granic — na liczbach, nie na deklaracjach. Używać przy pozycjach KIER-01…KIER-07.
---

# Koordynacja audytu — umiejętność roli KIER

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

Przy **każdej** pozycji KIER oraz w dwóch momentach przebiegu: przed pierwszą falą
(migawka i mapa) i po ostatniej (porównanie cykli i wartości).

## Procedura

1. **Policz, nie pytaj.** Dla każdego działu: pozycje zamknięte / pozycje checklisty.
   *Wynik:* czternaście par liczb.

2. **Sprawdź pozycje zamknięte na „nie".** Odpowiedź „nie" bywa odhaczeniem bez
   sprawdzenia; dowód musi istnieć tak samo jak przy „tak".
   *Wynik:* lista pozycji zamkniętych bez dowodu.

3. **Zestaw hashe miejsc z działami.** Ten sam hash w dwóch działach to kolizja granicy
   — rozstrzygasz ją tabelą i **dopisujesz wiersz przed drugą falą**.
   *Wynik:* lista par hash × dział.

4. **Sprawdź dziennik wejść.** Re-audyt wchodzi do działu dopiero po wyjściu audytu
   z TEGO działu (W5, K9′).
   *Wynik:* dla każdego działu — kolejność wejść z datami.

5. **Porównaj fale i przeczytaj rozjazdy jako defekt SEKTORA.**
   *Wynik:* kod wyjścia `porownaj-cykle.mjs` + lista rozjazdów.

6. **Porównaj migawki i `git diff`.** To jest dowód, że sektor niczego nie naprawił.
   *Wynik:* dwa kody wyjścia — migawki i niezmiennika.

## Komendy

```
node audyt/tools/status.mjs --pokaz
node audyt/tools/mapa.mjs
node audyt/tools/porownaj-cykle.mjs
node audyt/tools/polacz-sektory.mjs --fala=1
node audyt/tools/migawka-wartosci.mjs --porownaj
node audyt/tools/straznik-sektora-audytu.mjs
git diff main --name-only -- . ':!audyt' ':!re-audyt'
```

Kody wyjścia **bez potoku**. Kod 1 z `porownaj-cykle.mjs` znaczy rozjazd albo
podejrzenie kopiowania — obie rzeczy są Twoje.

## Czego ta umiejętność NIE robi

- **nie audytuje kodu produktu** — od tego jest czternaście działów;
- **nie ocenia jakości pojedynczego znaleziska** (→ krytyk roli i weryfikator);
- **nie pisze raportu końcowego** (→ RAP);
- **nie naprawia** — także wtedy, gdy rozjazd fal wskazuje na drobiazg w sektorze:
  naprawa sektora jest osobnym krokiem, a Ty ją zgłaszasz.

## Znane pułapki

- **„Dział zgłosił, że skończył" to nie jest liczba.** Twój krytyk ma jedno zadanie:
  sprawdzić, czy nie zamknąłeś działu na deklaracji.
- **Rozjazd fal ma najczęściej przyczynę w GRANICY**, nie w kodzie i nie w agencie.
- **Odrzucone zgłoszenie NIE ZNIKA** — zostaje z werdyktem, bo druga fala musi trafić
  na to samo miejsce i dojść do tego samego wniosku.
- **Powyżej 200 zgłoszeń nośnikiem przestaje być plik** (próg właściciela). Format wpisu
  bez zmian, zmienia się warstwa zapisu — `node:sqlite` jest w standardzie.
- **Sufit rund to pięć.** Rola, która skończyła na suficie i NIE wypisała niedomkniętych
  pozycji, ma lukę — cisza po suficie wygląda jak wyczerpana lista.
