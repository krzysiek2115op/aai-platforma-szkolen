# Golden roli WER — miara, nie dokumentacja

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
istnieją w `audyt/tools/zgloszenie.mjs` i są tam ZDROWE — golden nie zgłasza
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
  "dzial": "WER",
  "pozycja": "WER-01",
  "stwierdzenie": "Hash zapisany w zgłoszeniu nie zgadza się z hashem przeliczonym z miejsca, więc wpis powstał z pominięciem bramki albo kod pod tym adresem zmienił się po zgłoszeniu.",
  "miejsce": {
    "rodzaj": "linia",
    "plik": "audyt/tools/zgloszenie.mjs",
    "linia": 400,
    "tresc": "hash: hashMiejsca(wpis.miejsce),"
  },
  "dowod": "Linia 259 liczy skrót z samego miejsca, więc ponowne przeliczenie z tego samego miejsca musi dać tę samą wartość — dwa skróty obok siebie rozstrzygają.",
  "klasyfikacja": "przyklad-dydaktyczny",
  "wplyw": "Porównanie fal i połączenie sektorów stoją na tym skrócie, więc wpis z niezgodnym hashem nie połączy się ze swoim odpowiednikiem z drugiej fali."
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
  "dzial": "WER",
  "pozycja": "WER-02",
  "stwierdzenie": "Zgłoszenie nie podaje ścieżki wywołania, więc nie da się rozstrzygnąć, czy opisane zjawisko jest czynne, czy zatrzymane wcześniej.",
  "miejsce": {
    "rodzaj": "mechanizm",
    "plik": "audyt/tools/zgloszenie.mjs",
    "zakres": "Aai audyt, ścieżka wywołania zgłoszonego zjawiska",
    "mechanizm": "brak sprawdzenia, czy zjawisko jest czynne — powinno być w dowodzie zgłoszenia, bo bez niego nie da się odróżnić usterki od kodu zablokowanego wcześniej na ścieżce"
  },
  "dowod": "Dowód wskazuje pojedynczą linię, a przed nią na ścieżce stoi warunek, którego zgłoszenie nie wymienia.",
  "klasyfikacja": "przyklad-dydaktyczny",
  "wplyw": "Do raportu wchodzi usterka, która w praktyce nie zachodzi, i zabiera uwagę tym, które zachodzą."
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
  "dzial": "WER",
  "pozycja": "WER-01",
  "stwierdzenie": "Wydaje mi się, że tutaj może być problem z walidacją danych wejściowych.",
  "miejsce": {
    "rodzaj": "linia",
    "plik": "audyt/tools/zgloszenie.mjs",
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
  "dzial": "WER",
  "pozycja": "WER-01",
  "stwierdzenie": "Bramka liczy skrót miejsca z całego wpisu zamiast z samego miejsca, więc dwa zgłoszenia o tym samym miejscu dostają różne hashe.",
  "miejsce": {
    "rodzaj": "linia",
    "plik": "audyt/tools/zgloszenie.mjs",
    "linia": 400,
    "tresc": "hash: hashMiejsca(wpis),"
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
