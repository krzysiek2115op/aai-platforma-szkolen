# Golden roli GOLD — miara, nie dokumentacja

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
istnieją w `audyt/REGULAMIN.md` i są tam ZDROWE — golden nie zgłasza
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
  "dzial": "GOLD",
  "pozycja": "GOLD-01",
  "stwierdzenie": "Wyjście działu zawiera zgłoszenie bez dowodu, więc powstało z pominięciem bramki wpuszczania, która takiego wpisu nie przyjmuje.",
  "miejsce": {
    "rodzaj": "linia",
    "plik": "audyt/REGULAMIN.md",
    "linia": 259,
    "tresc": "1. Nie dopuszczaj do wymyślania błędów."
  },
  "dowod": "Pierwsza z trzynastu zasad zabrania wymyślania błędów, a samokontrola bramki zgłoszeń odrzuca wpis bez dowodu — wpis istnieje mimo obu.",
  "klasyfikacja": "przyklad-dydaktyczny",
  "wplyw": "Do raportu wchodzi znalezisko, którego nikt nie potrafi potwierdzić, i psuje porównanie fal."
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
  "dzial": "GOLD",
  "pozycja": "GOLD-02",
  "stwierdzenie": "Dział zgłosił znalezisko spoza swojego zakresu bez powołania się na wiersz tabeli granic, więc przypisanie nie jest odtwarzalne.",
  "miejsce": {
    "rodzaj": "mechanizm",
    "plik": "audyt/REGULAMIN.md",
    "zakres": "wyjście działu wobec zasady 2",
    "mechanizm": "brak przypisania znaleziska do działu zgodnie z tabelą granic — rozstrzygnięcie powinno być w wyjściu działu, przy zgłoszeniu, bo bez niego druga fala przypisze je gdzie indziej"
  },
  "dowod": "Tabela granic ma wiersz dla tej pary działów, a zgłoszenie się na niego nie powołuje.",
  "klasyfikacja": "przyklad-dydaktyczny",
  "wplyw": "Druga fala przypisze to samo znalezisko innemu działowi i wynik rozjedzie się bez zmiany w kodzie."
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
  "dzial": "GOLD",
  "pozycja": "GOLD-01",
  "stwierdzenie": "Wydaje mi się, że tutaj może być problem z walidacją danych wejściowych.",
  "miejsce": {
    "rodzaj": "linia",
    "plik": "audyt/REGULAMIN.md",
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
  "dzial": "GOLD",
  "pozycja": "GOLD-01",
  "stwierdzenie": "Pierwsza z trzynastu zasad jest w regulaminie zapisana bez polskich znaków, więc reguła strażnika jej nie dopasowuje.",
  "miejsce": {
    "rodzaj": "linia",
    "plik": "audyt/REGULAMIN.md",
    "linia": 256,
    "tresc": "1. Nie dopuszczaj do wymyslania bledow."
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
