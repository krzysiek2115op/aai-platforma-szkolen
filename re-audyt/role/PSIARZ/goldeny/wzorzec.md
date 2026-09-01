# Golden roli PSIARZ — miara, nie dokumentacja

> **Golden roli sektora RE-AUDYT.** Zbudowany w E7.4 z szablonu
> `audyt/szablony/golden.md`.
> Wzór wzięty z `agenci/przeglad-pr/goldeny/` — jedynego katalogu definicji
> agenta, jaki to repo miało przed sektorem.
>
> Golden nie jest dokumentacją: jest **miarą**. Rola, która nie potrafi
> odróżnić poniższych przypadków, nie jest gotowa do pracy.

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

## PRZYKŁAD DOBRY — forma liniowa

<!-- SPRAWDZANY: przechodzi -->
```json
{
  "sektor": "re-audyt",
  "fala": 1,
  "dzial": "PSIARZ",
  "pozycja": "PSIARZ-R1",
  "stwierdzenie": "Zdanie oznajmujące: co jest nie tak i co z tego wynika. Jedna myśl, bez zwrotów niepewności.",
  "miejsce": {
    "rodzaj": "linia",
    "plik": "audyt/tools/audyt-straznika-sektora.mjs",
    "linia": 10,
    "tresc": " * Milczenie przy zepsutym kodzie jest osobnym znaleziskiem. Wpisy"
  },
  "dowod": "Komenda i jej wynik albo druga linia kodu, która domyka rozumowanie — o TYM SAMYM, o czym mówi stwierdzenie.",
  "klasyfikacja": "przyklad-dydaktyczny",
  "wplyw": "Dlaczego to ma znaczenie: dla klienta, dla właściciela albo dla danych."
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
  "sektor": "re-audyt",
  "fala": 1,
  "dzial": "PSIARZ",
  "pozycja": "PSIARZ-R2",
  "stwierdzenie": "Brak sprawdzenia w opisanym zakresie sprawia, że kod nie dotrzymuje własnej obietnicy.",
  "miejsce": {
    "rodzaj": "mechanizm",
    "plik": "audyt/REGULAMIN.md",
    "zakres": "mechanizm w pliku audyt/tools/audyt-straznika-sektora.mjs",
    "mechanizm": "czego brakuje i gdzie dokładnie powinno być — nazwane wprost, bez zmyślonej linii"
  },
  "dowod": "Ścieżka wywołania albo komenda pokazująca, że mechanizmu nie ma tam, gdzie miał być.",
  "klasyfikacja": "przyklad-dydaktyczny",
  "wplyw": "Skutek braku: dla klienta, dla właściciela albo dla danych."
}
```

---

## PRZYKŁAD ZŁY — niepewność i linia poza plikiem

<!-- SPRAWDZANY: odrzucony -->
<!-- ODRZUCA: zwrot niepewności -->
<!-- ODRZUCA: wskazano -->
```json
{
  "sektor": "re-audyt",
  "fala": 1,
  "dzial": "PSIARZ",
  "pozycja": "PSIARZ-R1",
  "stwierdzenie": "Wydaje mi się, że tutaj może być problem z walidacją danych wejściowych.",
  "miejsce": {
    "rodzaj": "linia",
    "plik": "audyt/tools/audyt-straznika-sektora.mjs",
    "linia": 999999,
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
  "sektor": "re-audyt",
  "fala": 1,
  "dzial": "PSIARZ",
  "pozycja": "PSIARZ-R1",
  "stwierdzenie": "Wskazana linia deklaruje egzekwowanie maszynowe, którego w narzędziu nie ma.",
  "miejsce": {
    "rodzaj": "linia",
    "plik": "audyt/tools/audyt-straznika-sektora.mjs",
    "linia": 10,
    "tresc": " * ZASADA: psujemy kod w konkretnym miejscu i sprawdzamy, CZY COŚ SZCZEKA."
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

Samokontrola przechodzi osiemnaście przypadków. Jeśli kiedykolwiek pokaże mniej,
bramka wpuszczania znalezisk jest zepsuta — i to jest ważniejsze od każdego
znaleziska, jakie miałbyś tego dnia zgłosić.
