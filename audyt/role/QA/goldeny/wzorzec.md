# Golden roli QA — miara, nie dokumentacja

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
istnieją w `tools/straznicy/audyt-straznikow.mjs` i są tam ZDROWE — golden nie zgłasza
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
  "dzial": "QA",
  "pozycja": "QA-01",
  "stwierdzenie": "Mutacja nie deklaruje oczekiwanego śladu, więc przechodzi także wtedy, gdy zapali inną regułę niż ta, którą psuje, i maskuje jej ślepotę.",
  "miejsce": {
    "rodzaj": "linia",
    "plik": "tools/straznicy/audyt-straznikow.mjs",
    "linia": 163,
    "tresc": "oczekiwanySlad: \"nie da się znaleźć\","
  },
  "dowod": "Wpis w linii 163 podaje oczekiwanySlad, a sąsiednie wpisy w tej samej tablicy go nie mają — porównanie obu pokazuje różnicę w sile dowodu.",
  "klasyfikacja": "przyklad-dydaktyczny",
  "wplyw": "Audyt mutacyjny melduje pełne pokrycie, choć reguła, której dotyczy mutacja, jest martwa."
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
  "dzial": "QA",
  "pozycja": "QA-02",
  "stwierdzenie": "Reguła strażnika nie ma odpowiadającej jej mutacji, więc nikt nigdy nie sprawdził, czy w ogóle się zapala.",
  "miejsce": {
    "rodzaj": "mechanizm",
    "plik": "tools/straznicy/audyt-straznikow.mjs",
    "zakres": "tablica MUTACJE w audyt-straznikow.mjs",
    "mechanizm": "brak mutacji dla reguły pilnującej sprzątania po bramce — powinna stać obok pozostałych wpisów tego strażnika, bo reguła bez testu negatywnego nie jest sprawdzona"
  },
  "dowod": "Przegląd tablicy mutacji nie zwraca wpisu dla tej reguły, a strażnik deklaruje ją w komunikacie sukcesu.",
  "klasyfikacja": "przyklad-dydaktyczny",
  "wplyw": "Reguła może być ślepa od dnia napisania, a wynik audytu mutacyjnego tego nie pokaże."
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
  "dzial": "QA",
  "pozycja": "QA-01",
  "stwierdzenie": "Wydaje mi się, że tutaj może być problem z walidacją danych wejściowych.",
  "miejsce": {
    "rodzaj": "linia",
    "plik": "tools/straznicy/audyt-straznikow.mjs",
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
  "dzial": "QA",
  "pozycja": "QA-01",
  "stwierdzenie": "Wpis mutacji podaje oczekiwany ślad bez polskich znaków, więc nigdy nie dopasuje komunikatu strażnika.",
  "miejsce": {
    "rodzaj": "linia",
    "plik": "tools/straznicy/audyt-straznikow.mjs",
    "linia": 163,
    "tresc": "oczekiwanySlad: \"nie da sie znalezc\","
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
