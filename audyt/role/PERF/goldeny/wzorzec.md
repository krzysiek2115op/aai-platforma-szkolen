# Golden roli PERF — miara, nie dokumentacja

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
istnieją w `wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-moje.php` i są tam ZDROWE — golden nie zgłasza
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
  "dzial": "PERF",
  "pozycja": "PERF-01",
  "stwierdzenie": "Metoda odpowiadająca na pytanie tak albo nie pobiera pełną listę kursów użytkownika, więc menu kosztuje 45 zapytań na każdą kotwicę nawigacji.",
  "miejsce": {
    "rodzaj": "linia",
    "plik": "wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-moje.php",
    "linia": 207,
    "tresc": "public static function ma_kursy(): bool {"
  },
  "dowod": "Pomiar SAVEQUERIES na trasie katalogu daje 90 zapytań przy dwóch kotwicach menu, a po pamięci na czas żądania 3 — dwie liczby z tej samej trasy.",
  "klasyfikacja": "przyklad-dydaktyczny",
  "wplyw": "Każda odsłona dowolnej strony witryny płaci za odpowiedź, która mieści się w jednym bicie."
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
  "dzial": "PERF",
  "pozycja": "PERF-02",
  "stwierdzenie": "Metoda nie pamięta wyniku na czas żądania, więc dwie kotwice menu liczą tę samą odpowiedź dwa razy.",
  "miejsce": {
    "rodzaj": "mechanizm",
    "plik": "wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-moje.php",
    "zakres": "Aai_Sklep_Moje::ma_kursy()",
    "mechanizm": "brak pamięci na czas żądania — powinna stać przy pierwszym odczycie, tak jak w metodzie kursy(), bo menu pyta dwa razy w jednej odsłonie"
  },
  "dowod": "W klasie nie ma pola pamięci dla tej ścieżki, a menu woła ją w obu nawigacjach w jednej odsłonie.",
  "klasyfikacja": "przyklad-dydaktyczny",
  "wplyw": "Koszt menu podwaja się bez żadnej zmiany w wyniku, który klient widzi."
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
  "dzial": "PERF",
  "pozycja": "PERF-01",
  "stwierdzenie": "Wydaje mi się, że tutaj może być problem z walidacją danych wejściowych.",
  "miejsce": {
    "rodzaj": "linia",
    "plik": "wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-moje.php",
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
  "dzial": "PERF",
  "pozycja": "PERF-01",
  "stwierdzenie": "Metoda ma_kursy deklaruje typ zwracany ze spacją przed dwukropkiem, czego parser PHP w tej wersji nie przyjmuje.",
  "miejsce": {
    "rodzaj": "linia",
    "plik": "wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-moje.php",
    "linia": 207,
    "tresc": "public static function ma_kursy() : bool {"
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
