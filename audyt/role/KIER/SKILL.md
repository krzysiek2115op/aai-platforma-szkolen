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
   z TEGO działu (W5, K9′): `status.mjs --pokaz --historia` — dla każdego działu
   chwila `ZAKOŃCZONE` audytu musi być WCZEŚNIEJSZA niż wejście Pogłębiacza tej
   samej fali. Narzędzie samo odmawia wejścia przed czasem (pozycja 3 E7.7), więc
   sprawdzasz plik, nie pilnujesz ręcznie.
   *Wynik:* dla każdego działu — kolejność wejść z datami.

5. **Postaw worktree fali 2 — komendą, nie z pamięci.** Po zacommitowaniu stanu
   i wpisów fali 1: `fala.mjs --postaw=2`. Narzędzie samo weryfikuje, że na dysku
   worktree nie ma plików fali 1, i podaje, skąd uruchamiać role fali 2.
   *Wynik:* kod wyjścia 0 i ścieżka worktree z wyjścia narzędzia.

6. **Scal po fali 2** — z drzewa sektora, gdy worktree jest zacommitowany:
   `fala.mjs --scal=2`. Worktree znika, gałąź fali kasuje się dopiero po potwierdzeniu
   scalenia (`git branch -d`, nie `-D`).
   *Wynik:* liczba plików, które doszły, z podziałem na fale (fala 1 = 0).

7. **Porównaj fale i przekaż właścicielowi wynik NAZWANY** (zgodne / nadzbiór /
   sprzeczne, także per dział; PODEJRZENIE KOLEJNOŚCI, gdy padnie) — z obu stron,
   bez oceny (K4″), w PEŁNYM drzewie po scaleniu.
   *Wynik:* wyjście `porownaj-cykle.mjs` + `audyt/wyniki/porownanie-<sektor>.json`.

8. **Porównaj migawki i `git diff`.** To jest dowód, że sektor niczego nie naprawił.
   *Wynik:* dwa kody wyjścia — migawki i niezmiennika.

## Komendy

```
node audyt/tools/status.mjs --pokaz
node audyt/tools/status.mjs --pokaz --historia
node audyt/tools/mapa.mjs
node audyt/tools/fala.mjs --postaw=2
node audyt/tools/fala.mjs --scal=2
node audyt/tools/porownaj-cykle.mjs
node audyt/tools/porownaj-cykle.mjs --dzial=<KOD>
node audyt/tools/polacz-sektory.mjs --fala=1
node audyt/tools/migawka-wartosci.mjs --porownaj
node audyt/tools/straznik-sektora-audytu.mjs
git diff main --name-only -- . ':!audyt' ':!re-audyt'
```

Kody wyjścia **bez potoku**. Kod 1 z `porownaj-cykle.mjs` znaczy WYŁĄCZNIE brak fali
albo podejrzenie kopiowania — rozjazd fal daje kod 0 i jest wynikiem do lektury
właściciela (K4″), nie sygnałem do naprawy.

## Czego ta umiejętność NIE robi

- **nie audytuje kodu produktu** — od tego jest czternaście działów;
- **nie ocenia jakości pojedynczego znaleziska** (→ krytyk roli i weryfikator);
- **nie pisze raportu końcowego** (→ RAP);
- **nie naprawia** — także wtedy, gdy rozjazd fal wskazuje na drobiazg w sektorze:
  naprawa sektora jest osobnym krokiem, a Ty ją zgłaszasz.

## Znane pułapki

- **„Dział zgłosił, że skończył" to nie jest liczba.** Twój krytyk ma jedno zadanie:
  sprawdzić, czy nie zamknąłeś działu na deklaracji.
- **Rozjazd fal z powodu GRANICY jest szumem, nie wynikiem** — narzędzie wypisuje go
  osobno (GRANICA). Pozostały rozjazd to wynik dla właściciela, nie defekt do naprawy.
- **Odrzucone zgłoszenie NIE ZNIKA** — zostaje z werdyktem, bo druga fala musi trafić
  na to samo miejsce i dojść do tego samego wniosku.
- **Powyżej 200 zgłoszeń nośnikiem przestaje być plik** (próg właściciela). Format wpisu
  bez zmian, zmienia się warstwa zapisu — `node:sqlite` jest w standardzie. Licznik
  czytasz w `status.mjs --pokaz`; agent po zapisie widzi tylko ID i hash.
- **Fala 2 bez worktree to fala 2 z dostępem do fali 1.** `status.mjs` odmówi wejścia,
  gdy w drzewie widać wpis z polem `fala: 1` — to nie jest awaria, to komenda
  `fala.mjs --postaw=2`, której nie uruchomiono. Stan fali 1 musi być w commicie,
  inaczej worktree go nie dostanie.
- **Sufit rund to pięć.** Rola, która skończyła na suficie i NIE wypisała niedomkniętych
  pozycji, ma lukę — cisza po suficie wygląda jak wyczerpana lista.
