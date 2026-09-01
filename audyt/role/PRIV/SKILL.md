---
name: privacy-audit
description: Wyłącznie jako rola PRIV sektora AUDYT: porównanie tego, co system naprawdę zbiera i obiecuje, z tym, co deklaruje polityka i strona sprzedażowa. Używać przy pozycjach PRIV-01…PRIV-10.
---

# Audyt prywatności i zgodności — umiejętność roli PRIV

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

Przy pozycjach **PRIV-01, PRIV-04, PRIV-05 i PRIV-06** — czyli tam, gdzie trzeba
porównać DWA źródła: stan systemu i deklarację o nim.

Przy PRIV-02, PRIV-08 i PRIV-09 wystarczy odczyt jednej linii kodu.

## Procedura

1. **Wypisz, co system NAPRAWDĘ zbiera** — kolumna po kolumnie, z definicji tabel,
   nie z dokumentacji.
   *Wynik:* lista kolumn obu tabel monitoringu + okres retencji każdej.

2. **Wypisz, co DEKLARUJE polityka** — zdanie po zdaniu.
   *Wynik:* cytaty z `plik:linia`.

3. **Zestaw obie listy i wskaż różnice w OBIE strony.** Kolumna bez pokrycia w polityce
   jest znaleziskiem; deklaracja bez odpowiednika w systemie też.
   *Wynik:* tabela kolumna × zdanie polityki × werdykt.

4. **Retencję sprawdź POMIAREM, nie odczytem.** Wyzwalacz, który nigdy nie biegnie,
   wygląda w kodzie identycznie jak działający.
   *Wynik:* dowód usunięcia — liczba wierszy przed i po.

5. **Dla obietnic handlowych szukaj MECHANIZMU, nie zdania.** „Gwarancja 30 dni" jest
   prawdziwa wtedy, gdy istnieje droga zwrotu odbierająca dostęp.
   *Wynik:* obietnica `plik:linia` + `plik:linia` mechanizmu albo słowo BRAK.

6. **Maile sprawdzaj w skrzynce, nie w szablonie.** Nadawca, treść i to, czy klucz
   resetu nie leci w treści.
   *Wynik:* nagłówki wiadomości ze skrzynki `127.0.0.1:8893`.

## Komendy

```
# co system zbiera
grep -n "CREATE TABLE\|varchar\|bigint\|DNI\|retencj" wordpress/wtyczki/aai-monitor/includes/class-aai-monitor-tabele.php
grep -n "maskuj\|sanitize_user\|znaków" wordpress/wtyczki/aai-monitor/includes/class-aai-monitor-logowania.php

# co deklarujemy
cat docs/plugin-3/POLITYKA-PRYWATNOSCI.md

# obietnice handlowe na stronie
grep -rni "gwarancj\|zwrot\|bez limitu\|aktualizacj\|odpowiadam osobiście" tools/seed wordpress/wtyczki/aai-sklep/szablony

# maile i powiadomienia rdzenia
grep -rn "password_change_notification" wordpress
grep -n "from\|nadawca\|reset" wordpress/wtyczki/aai-platnosci/includes/class-aai-platnosci-maile.php
```

Skrzynka Mailpit: `http://127.0.0.1:8893`. **Nie kasuj z niej niczego** — bramki biorą
migawkę własnych wiadomości, a Ty jesteś tylko czytelnikiem.

## Czego ta umiejętność NIE robi

- **nie ocenia obrony przed atakiem** (→ SEC): wyciek 73 lekcji przez cudzą trasę jest
  ich, hasło zapisane przez NAS w dzienniku jest Twoje;
- **nie ocenia poprawności zapisu danych** (→ BD): „retencja kasuje po `MIN(id)` całej
  tabeli" jest ich, „90 dni pełnego IP bez wzmianki w polityce" — Twoje;
- **nie ocenia prawdziwości liczb w dokumentacji** (→ REPO);
- **nie wydaje opinii prawnych** — wskazujesz rozjazd faktu z deklaracją, ocenę zgodności
  z przepisem zostawiasz człowiekowi z uprawnieniami.

## Znane pułapki

- **Asercja „hasło nigdy w dzienniku" bywa ślepa na połowę przypadków** — sprawdzaj
  wiersz sukcesu I porażki.
- **`sanitize_*` o ogólnej nazwie ma szczegółowe skutki.** `sanitize_user()` w trybie
  nieścisłym przepuszcza `@ ! # $ % & _ -` i cyfry.
- **Wyzwalacz retencji, który nigdy nie biegnie, wygląda w kodzie jak działający.**
  Dowodem jest liczba wierszy przed i po, nie obecność metody.
- **Powiadomienia rdzenia WordPressa idą do administratora**, nie do klienta —
  `pluggable.php`. Zdejmuje się callback, nie podmienia funkcję.
- **Dane monitoringu na `:8892` to MATERIAŁ DOWODOWY z testu właściciela** (12 logowań,
  16 odsłon, 6 sesji). Nie kasuj ich.
