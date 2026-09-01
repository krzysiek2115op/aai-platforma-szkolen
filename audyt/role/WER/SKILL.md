---
name: audit-validation
description: Wyłącznie jako rola WER sektora AUDYT: niezależne potwierdzenie albo odrzucenie zgłoszonego problemu — czy miejsce istnieje, czy dowód dotyczy tego samego i czy zjawisko jest czynne. Używać przy pozycjach WER-01…WER-05.
---

# Weryfikacja zgłoszeń — umiejętność roli WER

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

Przy **każdym** zgłoszeniu ze statusem `DO WERYFIKACJI`, po jednym przebiegu na
zgłoszenie. To jest jedyna rola, w której skill jest procedurą stosowaną seryjnie.

## Procedura

1. **Otwórz miejsce.** Plik, linia, treść — albo plik, zakres i nazwa mechanizmu.
   Jeśli miejsca nie ma, dalsze pytania nie mają sensu.
   *Wynik:* treść linii z pliku obok treści ze zgłoszenia.

2. **Przelicz hash miejsca.** Ma się zgadzać z zapisanym; rozjazd znaczy, że wpis
   powstał z pominięciem narzędzia albo że kod się zmienił.
   *Wynik:* dwa skróty.

3. **Zapytaj, czy dowód mówi o TYM SAMYM co stwierdzenie.** Dowód prawdziwy, ale
   o czym innym, jest najczęstszą usterką zgłoszeń w tym projekcie.
   *Wynik:* jedno zdanie: co dowodzi dowód, a co twierdzi stwierdzenie.

4. **Prześledź ścieżkę wywołania od wejścia do miejsca.** Szukasz czegoś, co zatrzymuje
   zjawisko wcześniej.
   *Wynik:* lista ogniw `plik:linia` + werdykt „czynne" albo „zablokowane w …".

5. **Sprawdź brzmienie.** „Wydaje mi się" to odrzucenie — bramka odrzuca to maszynowo,
   ale wpis mógł powstać z jej pominięciem.
   *Wynik:* cytat stwierdzenia.

6. **Wydaj werdykt z powodem.** Odrzucenie bez powodu jest bezużyteczne dla drugiej fali.
   *Wynik:* `ZWERYFIKOWANE (istnieje)` albo `ZWERYFIKOWANE (odrzucone)` + jedno zdanie.

## Komendy

```
# zgłoszenia oczekujące
node audyt/tools/status.mjs --pokaz
ls audyt/zgloszenia/

# miejsce ze zgłoszenia — otwarcie punktowe
sed -n '<linia>p' <plik>

# przeliczenie hasha
node -e 'import("./audyt/tools/wspolne.mjs").then(m=>console.log(m.hashMiejsca(JSON.parse(process.argv[1]))))' '<miejsce>'

# bramka wpuszczania — czy w ogóle działa
node audyt/tools/zgloszenie.mjs --test
```

Kody wyjścia **bez potoku**.

## Czego ta umiejętność NIE robi

- **nie prowadzi własnego audytu obszaru** — zjawisko, którego nikt nie zgłosił, nie
  jest Twoim przedmiotem;
- **nie ocenia pracy agenta** (→ krytyk roli): Ty oceniasz zjawisko, on — sposób pracy;
- **nie ocenia zgodności z zasadami** (→ GOLD);
- **nie kasuje zgłoszeń** — odrzucenie zostawia wpis z werdyktem.

## Znane pułapki

- **Dowód prawdziwy, ale o czym innym** — najczęstsza usterka. Sprawdzaj, czy dowód
  i stwierdzenie mówią o tym samym mechanizmie, nie tylko o tym samym pliku.
- **Zjawisko zablokowane gdzie indziej to INNE znalezisko.** Nie odrzucaj go milcząco —
  napisz, gdzie jest blokada.
- **Wynik prawdziwy w tym samym żądaniu bywa nieaktualny** (Tutor trzyma zapisy
  w pamięci żądania). Weryfikuj osobnym żądaniem.
- **Treść linii porównuj po normalizacji białych znaków**, tak jak robi to bramka —
  inaczej odrzucisz poprawne zgłoszenie z powodu wcięcia.
- **Miejsce w formie MECHANIZMU nie ma linii i to jest poprawne** (K10′). Wymaganie od
  niego numeru linii wymusiłoby zmyślenie adresu.
