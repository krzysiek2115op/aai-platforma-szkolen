# Golden roli INT — miara, nie dokumentacja

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
istnieją w `wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-tutor.php` i są tam ZDROWE — golden nie zgłasza
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
  "dzial": "INT",
  "pozycja": "INT-01",
  "stwierdzenie": "Kurs ukryty dostaje w kopii Tutora status publish, więc publiczny handler Course::enroll_now zapisuje na niego dowolnego zalogowanego i wydaje cały materiał za darmo.",
  "miejsce": {
    "rodzaj": "linia",
    "plik": "wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-tutor.php",
    "linia": 90,
    "tresc": "'archived'  => 'private',"
  },
  "dowod": "Mapa statusów w linii 90 przypisuje archived do private, a enroll_now w kodzie Tutora odmawia zapisu wyłącznie przy kursie purchasable albo niepublicznym.",
  "klasyfikacja": "przyklad-dydaktyczny",
  "wplyw": "Obcy zapisuje się na ukryty kurs i czyta 41 lekcji, za które inni zapłacili."
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
  "dzial": "INT",
  "pozycja": "INT-02",
  "stwierdzenie": "Kopia w Tutorze przepisuje jednym statusem kurs i cały materiał, więc ukrycie kursu w sklepie odbiera dostęp ludziom, którzy już zapłacili.",
  "miejsce": {
    "rodzaj": "mechanizm",
    "plik": "wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-tutor.php",
    "zakres": "Aai_Sklep_Tutor::STATUS_MATERIALU_NA_WP",
    "mechanizm": "brak osobnej mapy statusów dla modułów i lekcji — powinna stać obok mapy statusu kursu, bo ukrycie kursu nie może odbierać dostępu kupującym"
  },
  "dowod": "W klasie jest jedna mapa statusów dla wszystkich trzech rodzajów wpisów, a private odcina każdego bez read_private_posts.",
  "klasyfikacja": "przyklad-dydaktyczny",
  "wplyw": "Kupujący traci dostęp do 73 lekcji w chwili, gdy właściciel zdejmuje kurs ze sprzedaży."
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
  "dzial": "INT",
  "pozycja": "INT-01",
  "stwierdzenie": "Wydaje mi się, że tutaj może być problem z walidacją danych wejściowych.",
  "miejsce": {
    "rodzaj": "linia",
    "plik": "wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-tutor.php",
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
  "dzial": "INT",
  "pozycja": "INT-01",
  "stwierdzenie": "Kurs ukryty dostaje w kopii Tutora status draft, który nie zatrzymuje publicznego handlera zapisu.",
  "miejsce": {
    "rodzaj": "linia",
    "plik": "wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-tutor.php",
    "linia": 90,
    "tresc": "'archived' => 'draft',"
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
