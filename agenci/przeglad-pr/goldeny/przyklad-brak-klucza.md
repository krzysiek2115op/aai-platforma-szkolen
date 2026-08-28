# Golden: znalezisko wzorcowe (prawdziwy przypadek z przeglądu W4)

## WEJŚCIE (fragment przeglądanej warstwy zapisu)

Warstwa zapisu kursu czyta sekcje i program tak:

```php
$sekcje = $dane['sekcje'] ?? array();
$moduly = $dane['moduly'] ?? array();
// … dalej: kasowanie wierszy spoza wejścia (upsert od dołu)
```

a dokument warstwy obiecuje: „brak klucza znaczy: nie ruszaj".

## OCZEKIWANE WYJŚCIE (znalezisko wzorcowe)

**[KRYTYCZNE] Brak klucza `sekcje`/`moduly` KASUJE sekcje i program,
choć kontrakt obiecuje „nie ruszaj".**

- *Mechanizm:* `?? array()` zamienia „nie przysłano" na „przysłano pustą
  listę", a dalej zapis kasuje wiersze spoza wejścia — więc żądanie bez
  klucza kasuje wszystko. Z panelu tego nie widać (panel zawsze wysyła oba
  klucze); usterka czeka na pierwszego NOWEGO klienta warstwy.
- *Dowód:* `class-…-zapis.php:<linie>` (odczyt `?? array()`),
  `class-…-zapis.php:<linie>` (kasowanie spoza wejścia); **potwierdzone
  uruchomieniowo:** wywołanie zapisu bez klucza `sekcje` na kursie testowym
  → 0 sekcji w bazie, odpowiedź `ok: true`.
- *Rozwiązanie pilnowalne skryptem:* brak klucza ⇒ `null` ⇒ gałąź „nie
  ruszaj" (nie pusta lista); strażnik z mutacją na KAŻDY klucz warstwy
  (`sekcje`, `moduly`, `content`, `materialy`, `stan`) + sprawdzenie
  w smoke'u, że zapis bez klucza zostawia liczniki bez zmian.

## DLACZEGO TO JEST WZORZEC

Ma wszystkie cztery cechy dobrego znaleziska: mechanizm (nie objaw), dowód
plik:linia + potwierdzenie uruchomieniowe, wyjaśnienie czemu nikt tego nie
widział, rozwiązanie z tanią kontrolą na przyszłość. Znalezisko bez
którejkolwiek z tych cech wraca do recenzenta.
