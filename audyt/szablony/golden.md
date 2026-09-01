# Golden roli <KOD> — wzorzec dobrego i złego zgłoszenia

> **SZABLON.** Kopiowany do `audyt/role/<KOD>/goldeny/` w E5.
> Wzór wzięty z `agenci/przeglad-pr/goldeny/` — jedynego katalogu definicji
> agenta, jaki to repo miało przed sektorem.
>
> Golden nie jest dokumentacją: jest **miarą**. Rola, która nie potrafi
> odróżnić poniższych dwóch przypadków, nie jest gotowa do pracy.

---

## PRZYKŁAD DOBRY — tak wygląda zgłoszenie, które przechodzi

```json
{
  "sektor": "audyt",
  "fala": 1,
  "dzial": "<KOD>",
  "pozycja": "<KOD>-NN",
  "stwierdzenie": "<Jedno zdanie oznajmujące. Co jest nie tak i co z tego wynika. Bez „wydaje mi się”.>",
  "miejsce": {
    "rodzaj": "linia",
    "plik": "<ścieżka od korzenia repo>",
    "linia": 0,
    "tresc": "<treść tej linii, co do znaku>"
  },
  "dowod": "<Co potwierdza stwierdzenie. Najlepiej komenda i jej wynik, albo druga linia kodu, która domyka rozumowanie.>",
  "klasyfikacja": "<kategoria>",
  "wplyw": "<Dlaczego to ma znaczenie: dla klienta, dla właściciela albo dla danych.>"
}
```

**Dlaczego przechodzi:** stwierdzenie jest jednoznaczne, miejsce da się otworzyć,
treść linii zgadza się z plikiem, dowód mówi o TYM SAMYM co stwierdzenie, a wpływ
jest nazwany po skutku, nie po nazwie mechanizmu.

---

## PRZYKŁAD ZŁY — i powód odrzucenia

```json
{
  "dzial": "<KOD>",
  "stwierdzenie": "Wydaje mi się, że tutaj może być problem z walidacją.",
  "miejsce": { "rodzaj": "linia", "plik": "<plik>", "linia": 9999, "tresc": "coś takiego" },
  "dowod": "widziałem podobny błąd gdzie indziej"
}
```

**Cztery powody odrzucenia naraz:**

1. **„Wydaje mi się"** — §11 wymaga jednoznaczności; `zgloszenie.mjs` odrzuca
   zwrot niepewności maszynowo;
2. **linia 9999 nie istnieje** — narzędzie sprawdza długość pliku;
3. **treść linii nie zgadza się z plikiem** — to jest dowód, że pliku nie otwarto;
4. **dowód nie dotyczy tego miejsca** — „podobny błąd gdzie indziej" nie
   potwierdza niczego tutaj.

---

## Trzeci przypadek — brak, wyścig, kolejność (K10')

Część realnych błędów tego projektu **nie miała jednej linii**: brak klucza
kasujący dane, odwrotna kolejność dwóch zapisów, brakująca kontrola. Dla nich
obowiązuje druga forma miejsca:

```json
{
  "miejsce": {
    "rodzaj": "mechanizm",
    "plik": "<plik, w którym mechanizmu BRAKUJE>",
    "zakres": "<metoda, blok albo ścieżka wywołania>",
    "mechanizm": "<czego brakuje i gdzie to powinno być>"
  }
}
```

**Wpisanie zmyślonej linii, żeby „mieć adres", łamie zasadę 1.** Forma
mechanizmu istnieje właśnie po to, żeby nie trzeba było tego robić.

---

## Sprawdź się

Zanim zaczniesz pracę, przepuść oba przykłady przez bramkę:

```
node audyt/tools/zgloszenie.mjs --test
```

Samokontrola przechodzi dziewięć przypadków, w tym wszystkie powyższe.
Jeśli kiedykolwiek pokaże mniej, bramka wpuszczania znalezisk jest zepsuta —
i to jest ważniejsze od każdego znaleziska, jakie miałbyś tego dnia zgłosić.
