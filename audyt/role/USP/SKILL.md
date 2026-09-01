---
name: audit-tooling
description: Wyłącznie jako rola USP sektora AUDYT: dostarczanie pozostałym działom pomiarów i narzędzi (Chrome DevTools Protocol, SAVEQUERIES, audyt mutacyjny na wskazanym strażniku) zamiast opinii. Używać przy pozycjach USP-01…USP-09.
---

# Narzędzia audytowe — umiejętność roli USP

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

Przy **każdej** pozycji USP, bo każda kończy się PRODUKTEM — narzędziem albo tabelą
liczb — a nie odpowiedzią tak/nie o kodzie.

Wołasz ją także wtedy, gdy inny dział zgłosi, że czegoś nie da się zmierzyć: to jest
Twoje wejście, nie ich.

## Procedura

1. **Nazwij ODBIORCĘ pomiaru, zanim go zrobisz.** Każda pozycja USP ma dział, do
   którego liczba idzie (PERF, QA, re-audyt). Pomiar bez odbiorcy jest kosztem.
   *Wynik:* nazwa działu i pozycja jego checklisty, którą ta liczba domyka.

2. **Sprawdź, czy narzędzie DZIAŁA, nie czy jest zainstalowane.** To dwie różne rzeczy
   i w tym projekcie różnica kosztowała czas.
   *Wynik:* wykonana nawigacja/pomiar + kod wyjścia, nie numer wersji.

3. **Kod wyjścia mierz BEZ POTOKU.** Jeśli musisz obejrzeć wyjście, zapisz je do pliku
   i sprawdź status osobno.
   *Wynik:* liczba — status procesu, nie ostatnia linia wydruku.

4. **Sprawdź, czy pomiar nie przechodzi po pustce.** Zero dopasowań przy działającym
   narzędziu jest wynikiem podejrzanym.
   *Wynik:* liczba przejrzanych elementów obok liczby znalezionych.

5. **Rig i przeglądarki trzymaj poza projektem.** `ZRZUTY_RIG`, `~/.cache/aai-narzedzia`.
   *Wynik:* ścieżka riga — i `git status` bez zmian po pomiarze.

6. **Oddaj produkt w formie, którą odbiorca może wkleić do dowodu:** tabela, liczba,
   `plik:linia`. Nie opis, jak to zmierzyć.
   *Wynik:* gotowa tabela albo komenda z jej wyjściem.

## Komendy

```
# Chrome — sprawdzenie, że DZIAŁA, nie że jest
~/.cache/aai-narzedzia/chrome-linux64/chrome --headless --disable-gpu \
  --no-sandbox --virtual-time-budget=5000 --dump-dom "http://127.0.0.1:8892/szkolenia/"

# audyt mutacyjny na WSKAZANYM strażniku
node tools/straznicy/audyt-straznikow.mjs <nazwa-straznika>

# ścieżki i adresy URL w narzędziach
node tools/straznicy/straznik-sciezek.mjs

# narzędzia sektora i ich kody wyjścia
node audyt/tools/mapa.mjs
node audyt/tools/zgloszenie.mjs --test
node audyt/tools/status.mjs --pokaz
```

**Historia przebiegów CI** (USP-05) przez `gh run list --json`. CI wróciło 1 września
i jest zielone w całości pierwszy raz od 17 sierpnia — wcześniejsze czerwone przebiegi
to wyczerpane minuty Actions, nie kod.

## Czego ta umiejętność NIE robi

- **nie ocenia bramek projektu** (→ QA): „czy strażnik mierzy to, co obiecuje" jest ich
  pytaniem, „czy w ogóle da się to zmierzyć" — Twoim;
- **nie zgłasza usterek produktu** — liczba idzie do działu, który postawił pytanie;
- **nie zmienia niczego w repo**: narzędzie, które trzeba dopisać, jest ZGŁOSZENIEM
  braku, a nie zadaniem do wykonania. Sektory nie naprawiają, także wtedy, gdy naprawą
  byłby skrypt.

## Znane pułapki

- **Kod wyjścia po `| tail` to kod potoku.** Ta klasa wróciła w E4 przy sprawdzaniu
  narzędzi samego sektora — „kod: 0" przy poprawnie wykrytym rozjeździe.
- **Narzędzie w katalogu ze spacją**: `file://` koduje spację jako `%20`, więc
  porównanie `import.meta.url === \`file://${process.argv[1]}\`` NIGDY nie jest
  prawdziwe i blok CLI się nie uruchamia — program kończy się kodem 0, nie wypisawszy
  nic (BLAD-014). Poprawnie: `resolve(process.argv[1]) === fileURLToPath(import.meta.url)`.
- **`puppeteer-core` nie odpala Firefoksa, gdy działa okno użytkownika**, a stary profil
  z lockiem WIESZA przeglądarkę — kasuj profil przed startem.
- **Chrome „zainstalowany" ≠ „używalny".** Dowodem jest wyrenderowany DOM, nie `--version`.
- **Mierz `AUTO_INCREMENT`, nie liczbę wierszy** — sprzątanie kasuje ślad, ale licznika
  nie cofa.
- **Pomiar równoległy z własną pracą przypisuje jej skutki mierzonemu.** Przy E2 pomiar
  bramek policzył moje własne żądania HTTP jako ich ślad.
