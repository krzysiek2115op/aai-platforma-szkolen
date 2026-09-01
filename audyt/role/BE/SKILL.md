---
name: backend-audit
description: Wyłącznie jako rola BE sektora AUDYT: sprawdzenie, czy warstwa zapisu, haki i kontrakty dotrzymują własnych obietnic — brak klucza, wczesny return, priorytet haka, cykl żądania. Używać przy pozycjach BE-01…BE-13.
---

# Audyt backendu — umiejętność roli BE

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

Przy pozycjach **BE-01, BE-03, BE-05, BE-06 i BE-12** — czyli wtedy, gdy pytasz
o **zachowanie na ścieżce**, a nie o obecność linii.

Przy BE-02, BE-04, BE-09 wystarczy grep i odczyt: tam skill nic nie dokłada.

## Procedura

1. **Znajdź OBIETNICĘ, zanim ocenisz kod.** Obietnicą jest komentarz nad metodą,
   nazwa metody, wpis w kontrakcie albo zdanie w `docs/`. Bez zapisanej obietnicy nie
   ma czego łamać — masz wtedy co najwyżej pytanie do ARCH.
   *Wynik:* cytat obietnicy z `plik:linia`.

2. **Przejdź ścieżkę wywołania od wejścia do zapisu**, wypisując każde ogniwo.
   *Wynik:* lista `plik:linia`, od handlera do `$wpdb`.

3. **Dla każdego klucza wejścia zapytaj o TRZY stany, nie o dwa:** klucz z wartością,
   klucz z `null`, **brak klucza**. Trzeci jest tym, który kasuje dane.
   *Wynik:* dla każdego z pięciu kluczy — linia odczytu i zachowanie w trzecim stanie.

4. **Dla każdego wczesnego `return` zapytaj, co zostało niedokończone.** Status nadany
   w połowie metody zostaje nadany.
   *Wynik:* `plik:linia` returnu + nazwa pola, które zostało w stanie pośrednim.

5. **Dla haków sprawdź priorytet i moment.** Czy cudzy callback może zabrać zdarzenie;
   czy akcja, do której się dopinasz, właśnie trwa.
   *Wynik:* hak, nasz priorytet, priorytet cudzy — trzy liczby.

6. **Potwierdź URUCHOMIENIOWO, zanim zgłosisz.** W tym repo cztery znaleziska
   przeglądu P4 i cztery przeglądu P3b były potwierdzane uruchomieniem PRZED naprawą.
   Jeśli nie da się uruchomić — powiedz to wprost w dowodzie.
   *Wynik:* komenda i jej wyjście albo zdanie „nie do uruchomienia, powód: …".

## Komendy

```
# warstwa zapisu i kontrakt
grep -n "array_key_exists" wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-zapis.php
grep -rn '\$wpdb->\(insert\|update\|delete\)' wordpress/wtyczki

# haki i ich priorytety
grep -rn "add_action\|add_filter" wordpress/wtyczki | grep -v "^.*://"
grep -rn "shutdown\|doing_action" wordpress/wtyczki

# komendy WP-CLI wobec tego, co podaje kontrola
grep -rn "@subcommand\|WP_CLI::add_command" wordpress/wtyczki

# start wtyczek
head -60 wordpress/wtyczki/*/aai-*.php
```

Kody wyjścia **bez potoku**.

## Czego ta umiejętność NIE robi

- **nie ocenia SQL jako powierzchni ataku** (→ SEC) ani schematu i transakcji (→ BD);
- **nie ocenia granic między klasami i wtyczkami** (→ ARCH): „ta klasa działa źle" jest
  Twoje, „granica jest w złym miejscu" jest ich;
- **nie ocenia zachowania cudzego kodu** (→ INT) — nasz priorytet haka jest Twój, to że
  Tutor melduje nieaktualny status, jest ich;
- **nie mierzy kosztu** (→ PERF).

## Znane pułapki

- **Brak klucza to trzeci stan**, nie wariant `null`. `?? ''` zamienia „nie przysłano"
  na „wyczyść" (BLAD-018), a `null` w miejscu „nie przysłano" zrywa cały łańcuch
  (BLAD-022).
- **`wp_slash` NIE dotyczy `$wpdb`** — backslashe zjada `update_post_meta()`, bo puszcza
  wartość przez `wp_unslash()`. `$wpdb->insert/update` nie. Odwrotne założenie kosztuje
  dwa przebiegi.
- **`sanitize_text_field` ucina user-agenta na pierwszym `<`** i sklei Markdown w jedną
  linię. Funkcja czyszcząca ma nazwę ogólną i skutki szczegółowe.
- **Konkatenacja wiąże mocniej niż `?:`** — `echo '{' . $x ? 'a' : 'b' . '}'` zawsze
  zwraca gałąź prawdziwą.
- **Wynik prawdziwy w tym samym żądaniu bywa nieaktualny.** Tutor trzyma zapisy
  w pamięci żądania; pytaj osobnym żądaniem.
