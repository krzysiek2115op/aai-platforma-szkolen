# Golden roli KON — miara, nie dokumentacja

---

## Ten plik jest SPRAWDZANY MASZYNOWO

Reguła 11 `straznik-sektora-audytu.mjs` przepuszcza każdy blok niżej przez
`powodyOdmowy()` — **tę samą funkcję**, którą bramka ocenia prawdziwe
zgłoszenia. Bloki oznaczone `SPRAWDZANY: przechodzi` muszą przejść, oznaczone
`SPRAWDZANY: odrzucony` muszą zostać odrzucone, i to **z powodu, który
deklarują** w znaczniku `ODRZUCA`.

Powód takiej konstrukcji jest z historii tego repo: „zapaliło się" nie znaczy
„zapaliło się z właściwej przyczyny" — mutacja łamiąca dwie reguły naraz
maskowała jedną z nich, dopóki w 0.47.0 nie doszło pole `oczekiwanySlad`.
Tu obowiązuje ta sama dyscyplina.

Skutek uboczny jest zamierzony: **golden nie zgnije po cichu**. Gdy wskazane
miejsce zniknie z kodu albo zmieni treść, strażnik zapali się na goldenie,
a nie dowie się o tym dopiero agent w trakcie pracy.

---

## Uwaga o przykładach niżej

**Miejsca są PRAWDZIWE, stwierdzenia są ĆWICZENIEM FORMY.** Wskazane linie
istnieją w `audyt/GRANICE.md` i są tam ZDROWE — golden nie zgłasza
błędu o produkcie i nie jest wejściem do audytu. Miejsce jest prawdziwe z dwóch
powodów: żebyś mógł je otworzyć i porównać, oraz żeby strażnik zapalił się, gdy
kod się zmieni, a golden zostanie w tyle.

Każdy blok niesie `"klasyfikacja": "przyklad-dydaktyczny"` — po tym polu
poznasz, że masz przed sobą wzorzec, a nie znalezisko.

---

## PRZYKŁAD DOBRY — forma liniowa

<!-- SPRAWDZANY: przechodzi -->
```json
{
  "sektor": "audyt",
  "fala": 1,
  "dzial": "KON",
  "pozycja": "KON-01",
  "stwierdzenie": "Para działów o nakładających się zakresach nie ma wiersza w tabeli granic, więc znalezisko z tego przecięcia trafi w drugiej fali do innego działu niż w pierwszej.",
  "miejsce": {
    "rodzaj": "linia",
    "plik": "audyt/GRANICE.md",
    "linia": 32,
    "tresc": "**Gdy tabela milczy:** to jest znalezisko **Konrada, faza A, pozycja KON-A5** (granica"
  },
  "dowod": "Przecięcie zakresów tych dwóch działów liczy powyżej progu pięciu plików, a przegląd tabeli granic nie zwraca dla nich wiersza.",
  "klasyfikacja": "przyklad-dydaktyczny",
  "wplyw": "Porównanie fal pokaże rozjazd bez żadnej zmiany w kodzie, a K4 każe uznać cały audyt za zepsuty i powtórzyć go."
}
```

**Dlaczego przechodzi:** stwierdzenie jest jednoznaczne, miejsce da się otworzyć,
treść linii zgadza się z plikiem co do znaku po normalizacji białych znaków,
dowód mówi o TYM SAMYM co stwierdzenie, a wpływ jest nazwany po skutku, nie po
nazwie mechanizmu.

---

## PRZYKŁAD DOBRY — forma mechanizmu (K10')

Część realnych błędów tego projektu **nie miała jednej linii**: brak klucza
kasujący dane, odwrotna kolejność dwóch zapisów, brakująca kontrola. Dla nich
jest druga forma miejsca — i istnieje właśnie po to, żeby nie trzeba było
zmyślać adresu.

<!-- SPRAWDZANY: przechodzi -->
```json
{
  "sektor": "audyt",
  "fala": 1,
  "dzial": "KON",
  "pozycja": "KON-02",
  "stwierdzenie": "Klasa błędu udokumentowana w rejestrze nie ma odpowiadającej jej pozycji w żadnej z czternastu checklist, więc audyt nie zada o nią pytania.",
  "miejsce": {
    "rodzaj": "mechanizm",
    "plik": "audyt/GRANICE.md",
    "zakres": "audyt/ROLE.md, rachunek pokrycia",
    "mechanizm": "brak pozycji checklisty dla klasy błędu z rejestru — powinna być w checkliście działu właściwego dla tej klasy, bo klasa, która wróciła raz, wraca znowu"
  },
  "dowod": "Zestawienie kodów z rejestru z odwzorowaniem w ROLE.md zwraca kod bez przypisanej pozycji i bez jawnego wykluczenia.",
  "klasyfikacja": "przyklad-dydaktyczny",
  "wplyw": "Klasa, która w tym repozytorium już raz zawiodła, przechodzi przez oba cykle niezauważona."
}
```

---

## PRZYKŁAD ZŁY — niepewność i linia poza plikiem

<!-- SPRAWDZANY: odrzucony -->
<!-- ODRZUCA: zwrot niepewności -->
<!-- ODRZUCA: wskazano -->
```json
{
  "sektor": "audyt",
  "fala": 1,
  "dzial": "KON",
  "pozycja": "KON-01",
  "stwierdzenie": "Wydaje mi się, że tutaj może być problem z walidacją danych wejściowych.",
  "miejsce": {
    "rodzaj": "linia",
    "plik": "audyt/GRANICE.md",
    "linia": 99999,
    "tresc": "coś takiego tam było"
  },
  "dowod": "widziałem podobny błąd gdzie indziej w tym projekcie, więc pewnie jest i tutaj",
  "klasyfikacja": "przyklad-dydaktyczny",
  "wplyw": "nie wiadomo, coś się pewnie zepsuje"
}
```

**Dwa powody odrzucenia naraz:** „wydaje mi się" łamie §11, który wymaga
jednoznaczności; linia 99999 nie istnieje, bo narzędzie sprawdza długość pliku.
Dowód „podobny błąd gdzie indziej" nie potwierdza niczego **tutaj** — bramka
tego nie zmierzy, ale krytyk i weryfikator zmierzą.

---

## PRZYKŁAD ZŁY — treść linii nie zgadza się z plikiem

To jest najważniejszy z czterech przypadków, bo wygląda porządnie: numer linii
istnieje, pola są wypełnione, stwierdzenie jest jednoznaczne. **Nie zgadza się
treść** — czyli plik nie został otwarty, a adres wzięto z pamięci albo z cudzego
opisu.

<!-- SPRAWDZANY: odrzucony -->
<!-- ODRZUCA: NIE ZGADZA -->
```json
{
  "sektor": "audyt",
  "fala": 1,
  "dzial": "KON",
  "pozycja": "KON-01",
  "stwierdzenie": "Zdanie o milczeniu tabeli granic nie wyróżnia pozycji KON-A5, więc odsyłacz do niej jest w tekście niewidoczny.",
  "miejsce": {
    "rodzaj": "linia",
    "plik": "audyt/GRANICE.md",
    "linia": 32,
    "tresc": "**Gdy tabela milczy:** to jest znalezisko Konrada, faza A, pozycja KON-A5 (granica"
  },
  "dowod": "Komenda i jej wynik, które miałyby domykać rozumowanie o tej właśnie linii.",
  "klasyfikacja": "przyklad-dydaktyczny",
  "wplyw": "Skutek dla klienta, właściciela albo danych."
}
```

---

## Sprawdź się

Zanim zaczniesz pracę, przepuść bramkę przez jej własną samokontrolę:

```
node audyt/tools/zgloszenie.mjs --test
```

Samokontrola przechodzi dziewięć przypadków. Jeśli kiedykolwiek pokaże mniej,
bramka wpuszczania znalezisk jest zepsuta — i to jest ważniejsze od każdego
znaleziska, jakie miałbyś tego dnia zgłosić.
