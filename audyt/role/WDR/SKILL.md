---
name: deployment-audit
description: Wyłącznie jako rola WDR sektora AUDYT: sprawdzanie, czy obcy człowiek wykona instrukcję instalacji i utrzyma instalację — z dowodem artefaktowym, nie procesowym. Używać przy pozycjach WDR-01…WDR-10.
---

# Audyt wdrożenia i eksploatacji — umiejętność roli WDR

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

Przy pozycjach **WDR-01, WDR-02, WDR-06 i WDR-08** — czyli tam, gdzie odpowiedź
zależy od WYKONANIA, a nie od treści dokumentu.

Przy WDR-03, WDR-04, WDR-05, WDR-09 i WDR-10 wystarczy odczyt pliku.

## Procedura

1. **Przejdź instrukcję krok po kroku, notując KAŻDE założenie.** „Otwórz kokpit",
   „wgraj paczkę", „włącz wtyczkę" — przy każdym pytaj, skąd klient ma wiedzieć jak.
   *Wynik:* lista kroków × założenie, którego instrukcja nie tłumaczy.

2. **Dowodź ARTEFAKTEM, nie procesem.** Skrypt zakończony zerem nie dowodzi, że plik
   powstał i że da się go użyć.
   *Wynik:* nazwa pliku + jego właściwość zmierzona narzędziem (`unzip -t`,
   `get_plugin_data`), nie kod wyjścia budowania.

3. **Dla każdej czynności zapytaj, czy klient ma do niej EKRAN.** Czynność wykonalna
   wyłącznie przez WP-CLI jest znaleziskiem, gdy instrukcja przypisuje ją klientowi.
   *Wynik:* czynność + ekran albo słowo „tylko WP-CLI".

4. **Sprawdź drogę POWROTNĄ.** Deaktywacja, odinstalowanie, brak zależności. Instalacja,
   której nie da się bezpiecznie cofnąć, jest niekompletna.
   *Wynik:* zachowanie przy deaktywacji i przy `uninstall.php`, z `plik:linia`.

5. **`postaw.sh` uruchamiaj OD ZERA**, nie na stojącym środowisku — inaczej mierzysz
   stan zastany, nie procedurę.
   *Wynik:* kod wyjścia + treść sekcji weryfikacji.

6. **Przejrzyj listę wdrożeniową pod kątem pozycji BEZ ZAPISU.** Pozycja, która żyje
   tylko w czyjejś głowie, jest znaleziskiem — także wtedy, gdy dziś wszyscy o niej wiedzą.
   *Wynik:* pozycja + skutek pominięcia.

## Komendy

```
# instrukcja i paczki
cat docs/INSTRUKCJA-INSTALACJI.md
npm run pakuj && ls -la paczki/ && unzip -t paczki/*.zip

# droga powrotna
cat wordpress/wtyczki/*/uninstall.php
grep -n "deactivat\|deaktyw" wordpress/wtyczki/*/includes/*.php

# środowisko od zera (ZMIENIA STAN — patrz niżej)
cat wordpress/srodowisko/postaw.sh

# co wypuszczamy i co chowamy
cat .gitignore && git status --ignored --short | head -20
```

**UWAGA — granica Twojej roli.** `postaw.sh` i `npm run pakuj` **zmieniają stan**.
Sektor nie naprawia i nie przestawia świata: jeśli pytanie wymaga postawienia
środowiska od zera, **zgłoś to jako potrzebę pomiaru** i uzgodnij z kierownikiem,
zamiast uruchamiać to z własnej inicjatywy. Odczyt plików i `unzip -t` na gotowej
paczce są bezpieczne.

Kody wyjścia **bez potoku**.

## Czego ta umiejętność NIE robi

- **nie ocenia treści instrukcji jako dokumentu** (→ REPO): martwa kotwica jest ich,
  krok niewykonalny — Twój;
- **nie ocenia obwodu bezpieczeństwa** (→ SEC): `.env.example` z prawdziwym sekretem
  jest ich, `.env.example` bez zmiennej, której `postaw.sh` wymaga — Twój;
- **nie ocenia zależności od Tutora i Woo jako integracji** (→ INT);
- **nie stawia środowiska z własnej inicjatywy** — patrz uwaga przy komendach.

## Znane pułapki

- **Martwy bind mount po `git checkout`** — kontener trzyma inode katalogu, więc widzi
  pustkę. Objaw: strona 200, pozostałe wtyczki działają, jedna „znika".
  Naprawa: `podman-compose down && ./postaw.sh`.
- **Dowód procesowy nie dowodzi artefaktu.** Build zielony i weryfikacja zielona nie
  znaczą, że plik, który trafia do klienta, jest poprawny — w tym repo cztery miniatury
  OG oddawały 404 przy obu bramkach zielonych.
- **Kod wyjścia po potoku to kod potoku.**
- **`postaw.sh` na stojącym środowisku mierzy stan zastany, nie procedurę.**
- **Katalog `paczki/` jest poza gitem** — jego brak nie jest usterką.
