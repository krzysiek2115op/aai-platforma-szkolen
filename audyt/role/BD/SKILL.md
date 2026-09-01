---
name: database-audit
description: Wyłącznie jako rola BD sektora AUDYT: sprawdzenie schematu, transakcji, idempotencji i drogi danych między trzema nośnikami, z porównaniem treści znak w znak zamiast sum. Używać przy pozycjach BD-01…BD-12.
---

# Audyt bazy i migracji — umiejętność roli BD

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

Przy pozycjach **BD-01, BD-04, BD-05, BD-06 i BD-12** — gdy pytasz o **stan po
operacji**, a nie o obecność linii w kodzie.

Przy BD-08 i BD-09 wystarczy odczyt zapytania i definicji tabeli.

## Procedura

1. **Wypisz WSZYSTKIE tabele i ich klucze unikalne, zanim ocenisz jakikolwiek zapis.**
   Bez listy kluczy nie da się odpowiedzieć na BD-05.
   *Wynik:* tabela × lista kluczy unikalnych, z `class-*-tabele.php`.

2. **Dla każdej operacji wielotabelowej wskaż granice transakcji.**
   *Wynik:* `plik:linia` `START TRANSACTION` i `plik:linia` `COMMIT`, oraz lista tabel
   dotkniętych pomiędzy.

3. **Dla każdego kasowania sprawdź KIERUNEK** — lekcje, moduły, kurs. Kasowanie od góry
   zabiera audytowi wiedzę o tym, co skasował.
   *Wynik:* kolejność `DELETE` jako lista `plik:linia`.

4. **Idempotencja: dwa przebiegi, dwie liczby.** Drugi przebieg ma dać zero zmian.
   *Wynik:* liczby obu przebiegów — nie zdanie „jest idempotentny".

5. **Porównuj TREŚĆ, nie sumy.** Suma długości zgadza się także wtedy, gdy treść jest
   inna. Skrót `sha256` na każdym rekordzie rozstrzyga, suma nie.
   *Wynik:* liczba rekordów zgodnych i lista niezgodnych.

6. **Sprawdź drugi przeskok, nie tylko pierwszy.** Nasze tabele mogą być nietknięte,
   a kopia w Tutorze rozjechana — bramki treści patrzą tylko na pierwszy.
   *Wynik:* liczba obiektów po obu stronach i lista różnic.

## Komendy

```
# schemat i klucze
grep -n "UNIQUE\|PRIMARY KEY\|KEY " wordpress/wtyczki/*/includes/class-*-tabele.php

# transakcje i kolejność kasowania
grep -n "START TRANSACTION\|COMMIT\|ROLLBACK\|DELETE FROM" wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-zapis.php

# pułapki jednostek i tabel
grep -rn "LENGTH(" tools wordpress
grep -rn "ON DUPLICATE" wordpress/wtyczki
grep -rn "wc_get_orders\|wp_delete_post" wordpress tools
grep -rn "meta_value" wordpress/wtyczki
```

**Kontrole gotowe w projekcie — czytają, nie piszą:**

```
npm run wp:sprawdz     # proza 73/73 znak w znak, obie bazy
npm run wp:tutor       # kopia w Tutorze, kod 1 przy rozjeździe
```

Kody wyjścia **bez potoku**. Komend zmieniających stan (`wp:import`, `wp:sync`,
`db1:seed`) **nie uruchamiasz** — `db1:seed` zaczyna od kasowania kursów.

## Czego ta umiejętność NIE robi

- **nie ocenia wstrzyknięć SQL** (→ SEC) — Twoje pytanie o SQL brzmi „czy dane wyjdą
  poprawne", nie „czy da się tędy wejść";
- **nie ocenia planów zapytań ani czasu** (→ PERF);
- **nie ocenia zgodności zrzutu z Tutorem jako SZWU architektonicznego** (→ ARCH):
  „kopia się rozjechała" jest Twoje, „źródłem prawdy nie powinien być Tutor" jest ich;
- **nie ocenia okresu retencji jako wymogu prawnego** (→ PRIV): „retencja nie działa"
  jest Twoje, „90 dni to za długo i nie ma tego w polityce" jest ich.

## Znane pułapki

- **`LENGTH()` liczy bajty, `CHAR_LENGTH()` znaki.** Różnica wygląda jak utrata danych.
- **`wp_slash` NIE dotyczy `$wpdb`** — dotyczy `update_post_meta()`. Idempotencja jest
  jedynym testem, który to wykrywa: pierwszy import wygląda na udany.
- **MySQL nie odracza `UNIQUE`** — stan pośredni przy zamianie pozycji łamie ograniczenie.
- **`meta_value => ''` dopasowuje pierwszy lepszy wpis** danego typu.
- **`wp_delete_post()` pod HPOS nie kasuje zamówień**, a `wc_get_orders(status:'any')`
  pomija `checkout-draft` (BLAD-026).
- **Test negatywny na zepsutych danych przechodzi fałszywie** — puszczaj go na zdrowych.
- **`db1:sekcje` zmienia identyfikatory sekcji** (DELETE + INSERT), więc po nim
  `wp:sprawdz` melduje 22 fałszywe rozjazdy, dopóki nie przejdzie `wp:import`.
