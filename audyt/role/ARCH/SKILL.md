---
name: architecture-audit
description: Wyłącznie jako rola ARCH sektora AUDYT: sprawdzanie granic między wtyczkami, szwów, źródeł prawdy i cykli zależności — czy struktura jest tam, gdzie deklaruje. Używać przy pozycjach ARCH-01…ARCH-09.
---

# Audyt architektury — umiejętność roli ARCH

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

Przy pozycjach **ARCH-01, ARCH-03, ARCH-07 i ARCH-09** — czyli tam, gdzie odpowiedź
wymaga prześledzenia POWIĄZAŃ, a nie odczytu jednego pliku.

Przy ARCH-02, ARCH-04, ARCH-05 i ARCH-06 wystarczy grep i porównanie list.

## Procedura

1. **Narysuj graf, zanim ocenisz granicę.** Kto woła kogo, kto pisze do czego, kto
   nasłuchuje czyjego zdarzenia.
   *Wynik:* lista krawędzi `plik:linia → plik:linia`.

2. **Dla każdego szwu sprawdź OBIE strony.** Szew z wystrzałem bez nasłuchu jest martwy;
   nasłuch bez wystrzału jest kodem, który nigdy nie biegnie.
   *Wynik:* dla każdego z siedmiu szwów — `plik:linia` wystrzału i `plik:linia` nasłuchu.

3. **Grepuj wielolinijkowo tam, gdzie wywołanie może być łamane.** Jednoliniowy wzorzec
   naliczył w tym repo sześć szwów zamiast siedmiu.
   *Wynik:* liczba trafień z obu wariantów greperia — jeśli się różnią, ufaj większej.

4. **Dla każdej „prawdy" wskaż jej JEDNO miejsce i wszystkie kopie.** Kopia jest
   dopuszczalna, gdy jedzie jednokierunkowo i ma kontrolę rozjazdu.
   *Wynik:* źródło + lista kopii + nazwa kontroli albo słowo BRAK.

5. **Cykl zależności szukaj po wywołaniach statycznych i `require`**, nie po nazwach
   katalogów.
   *Wynik:* ścieżka cyklu jako lista klas.

6. **Rozstrzygnij, czy to ARCH, czy REPO.** „Klasa nie ma odpowiednika na schemacie" to
   REPO; „schemat opisuje mechanizm, którego w kodzie nie ma" to ARCH-08.
   *Wynik:* jedno słowo i uzasadnienie w jednym zdaniu.

## Komendy

```
# siedem szwów — grep wielolinijkowy, bo jeden wystrzał jest łamany
grep -rn "aai_sklep_kurs_zmieniony\|_usuniety\|aai_sklep_cena_kursu" wordpress
grep -rn "_cta_kursu\|_dostepnosc_kursu\|_zamowienia_w_drodze" wordpress
grep -rn "aai_monitor_strona_za_bramka" wordpress
grep -rnz "do_action(\s*$" wordpress/wtyczki | head

# cudze tabele, reguły przepisywania, kolejność sekcji
grep -rn '\$wpdb->prefix' wordpress/wtyczki
grep -rn "add_rewrite_rule" wordpress/wtyczki
grep -n "KOLEJNOSC" wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-sekcje.php

# schematy wobec kodu
node tools/straznicy/straznik-schematow.mjs
```

Kody wyjścia **bez potoku**.

## Czego ta umiejętność NIE robi

- **nie ocenia treści dokumentacji poza schematami** (→ REPO);
- **nie ocenia zgodności z pierwotnym planem** (→ PIK): „struktura jest niespójna dziś"
  jest Twoje, „miała być inna niż jest" jest ich;
- **nie ocenia zachowania cudzego kodu** (→ INT): „źle odczytaliśmy Tutora" jest ich,
  „nie powinniśmy byli opierać na nim źródła prawdy" jest Twoje;
- **nie ocenia pojedynczej dziury** (→ SEC) — Twoje pytanie brzmi, czy granica dopuszcza
  całą KLASĘ dziur.

## Znane pułapki

- **Grep jednoliniowy gubi wystrzały łamane na kilka linii.** Siedem szwów wyglądało
  na sześć.
- **Strażnik schematów pilnuje słownika, nie sensu.** Nie mów „schemat zgodny z kodem",
  bo on tego nie sprawdza — sprawdza obecność nazw.
- **Nazwa katalogu nie jest granicą.** `class-aai-sklep-zapis.php` ma 1099 linii
  i mieszczą się w nim rozłączne odpowiedzialności trzech działów.
- **Kopia jest dopuszczalna, brak kontroli rozjazdu nie jest.** Pytaj o kontrolę
  z kodem wyjścia 1, nie o samą jednokierunkowość.
