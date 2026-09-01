---
name: sec-re-audit
description: Procedura roli Pogłębiacz: Security sektora RE-AUDYT — kiedy przestać czytać i zacząć mierzyć.
---

# Pogłębiacz: Security — umiejętność roli SEC (sektor RE-AUDYT)

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

Przy pozycjach `SEC-R1` (odtworzenie) i `SEC-R2` (zasięg) — czyli wtedy, gdy
przestajesz czytać i zaczynasz mierzyć. Skill wołany zawsze przestaje cokolwiek
znaczyć.

## Procedura

1. **Postaw scenę.** Sprawdź, że `:8892` odpowiada; jeśli nie — `wordpress/srodowisko/postaw.sh`.
   Pomiar z niepostawionego środowiska mierzy ciszę.
2. **Odtwórz** zjawisko ze zgłoszenia audytu WŁASNĄ komendą, nie cudzym opisem.
   Zanotuj komendę i wynik — to jest dowód.
3. **Policz zasięg**: znajdź wszystkie wystąpienia klasy w repozytorium, nie tylko
   wskazane. Wynik zapisz jako liczbę i listę miejsc.
4. **Sprawdź, czy wpływ się utrzymuje** przy pełnym zasięgu — bywa, że przy jednym
   miejscu jest inny niż przy siedmiu.
5. **Wykonaj pomiar własny obszaru** (`SEC-R6`): żądanie do `:8892` bez nonce'a i bez ciastka.
6. **Zgłoś** — z komendą, liczbą i miejscem. Kody wyjścia mierz BEZ POTOKU.

## Komendy

```
node audyt/tools/werdykt.mjs --pokaz          # zgłoszenia audytu z werdyktami
git ls-files -- ':(glob)wordpress/wtyczki/*/includes/*.php' \   # …zakres obszaru (pełna komenda w ROLE.md)
node audyt/tools/zgloszenie.mjs --plik=<wpis.json>
```

**Kod wyjścia mierzymy bez potoku** — `| tail` maskuje status i kosztowało to ten
projekt czas od czasów D5.

## Czego ta umiejętność NIE robi

Nie bierze: wydajności zapytań (→ Pogłębiacz PERF), retencji danych (→ Pogłębiacz PRIV). SEC pyta, czy dane wejściowe mogą skrzywdzić — i przy re-audycie odpowiada na to POMIAREM. Nie zastępuje `PSIARZ`, `SKUT`, `STRAZ` ani `WALID` — patrz `re-audyt/GRANICE.md`.

## Znane pułapki

- **Pomiar bez sprawdzenia kodu wyjścia mierzy ciszę, nie stan.** Bramka, która nie
  wystartowała, wygląda w liczniku identycznie jak bramka, która nic nie znalazła.
- **Sprawdzenie, które mówi „zero", bywa ślepe po OBU stronach.** Zanim uznasz zero
  za wynik, sprawdź, że komenda w ogóle trafia w swój przedmiot.
- **Przejście po pustce.** Zakres, który zwraca zero plików, przechodzi każdą pozycję
  checklisty i wygląda jak praca wykonana.
- **Bramka nie może sprzątać CUDZYCH danych.** Licz stan przed i po; usuwaj wyłącznie
  to, co sam założyłeś.
- **Wzorzec pytający o NAZWĘ zamiast o ROZSTRZYGNIĘCIE** zzieleniał strażnika przy
  zepsutym kodzie dziewięć razy w historii tego repozytorium.
