---
name: frontend-audit
description: Wyłącznie jako rola FE sektora AUDYT: sprawdzenie szablonów, arkuszy i kolektora pod kątem tego, co klient naprawdę widzi — z pomiarem w przeglądarce tam, gdzie sam odczyt kodu nie rozstrzyga. Używać przy pozycjach FE-01…FE-11.
---

# Audyt frontu — umiejętność roli FE

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

Przy pozycjach **FE-01, FE-02, FE-05, FE-06 i FE-11** — czyli tam, gdzie odpowiedź
zależy od **wyrenderowanej strony**, a nie od treści pliku.

Przy FE-04 i FE-08 wystarczy grep: obraz albo ma wymiary, albo ich nie ma.

## Procedura

1. **Wypisz trasy, które ta zmiana dotyka**, zanim cokolwiek zmierzysz. Katalog,
   strona kursu, lekcja, „Moje kursy", koszyk, kasa, konto, kokpit.
   *Wynik:* lista adresów — to Twój mianownik.

2. **Dla pytań o układ czytaj DWA źródła: nasz arkusz i wyrenderowaną stronę.**
   Reguła, której nie ma w żadnym z naszych plików, przychodzi z motywu albo z cudzej
   wtyczki — i wtedy to jest pytanie INT, nie Twoje.
   *Wynik:* selektor + plik, z którego pochodzi, albo zdanie „brak reguły w naszych
   arkuszach, źródło: …".

3. **Dla kolektora panelu porównaj DWIE listy:** granice zakresu zadeklarowane w kodzie
   i rekordy, które panel naprawdę rysuje.
   *Wynik:* dwie listy i ich różnica — nie zdanie „wygląda kompletnie".

4. **Dla podpisów przy liczbach porównaj podpis z ZAPYTANIEM**, które tę liczbę dało.
   *Wynik:* podpis `plik:linia` + zakres zapytania `plik:linia`.

5. **Pomiar w przeglądarce dopiero na końcu** i tylko wtedy, gdy odczyt nie rozstrzygnął.
   Rig stoi poza `package.json` projektu (`ZRZUTY_RIG`), Chrome w
   `~/.cache/aai-narzedzia/chrome-linux64/`.
   *Wynik:* zmierzona wartość + adres + warunki pomiaru.

6. **Zanim zgłosisz, sprawdź, czy to nie jest kolizja z cudzym arkuszem.** Jeśli reguła
   bijąca naszą jest poza warstwą kaskady — to INT.
   *Wynik:* nazwa warstwy obu reguł albo jej brak.

## Komendy

```
# elementy fixed i ich miejsce emisji
grep -rn "fixed" wordpress/wtyczki/aai-sklep/assets/*.css
grep -rn "aai-pigulka\|position: fixed" wordpress/wtyczki/aai-sklep/szablony

# kolektor panelu
grep -n "GRANICE_ZAKRESU" wordpress/wtyczki/aai-sklep/assets/panel.js

# obrazy, ucieczka znaków, odnośniki
grep -rn "<img" wordpress/wtyczki/aai-sklep/szablony
grep -rn "&amp;quot;\|&quot;" wordpress/wtyczki/aai-sklep
grep -n "PODSTRONY" wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-trasy.php
```

**Bramki, które już mierzą Twój obszar** (uruchamiasz je, bo tylko czytają):

```
npm run smoke:wp-motyw     # 9 stron: nachodzenie, kontrast, jasne plamy, stopka
npm run smoke:wp-panel     # kolektor w prawdziwej przeglądarce
npm run smoke:wp-jezyk     # polszczyzna ścieżki klienta
```

Wymagają `ZRZUTY_RIG`. **Bramka bez tej zmiennej pada PRZED pierwszą asercją**
i wygląda jak bramka, która nic nie znalazła — kody wyjścia mierz bez potoku.

## Czego ta umiejętność NIE robi

- **nie ocenia prototypu Next.js** (→ PROTO) — ten sam błąd po obu stronach to DWA
  zgłoszenia, w dwóch działach, a wynik PROTO idzie osobno (D5);
- **nie ocenia wagi stron ani liczby zapytań** (→ PERF): obraz bez `width`/`height`
  jest PERF-owy (CLS), chyba że w ogóle się nie wyświetla — wtedy Twój;
- **nie ocenia kolizji z arkuszami Tutora i Woo** (→ INT);
- **nie ocenia escapowania jako luki bezpieczeństwa** (→ SEC): `wp_kses_post` zjadające
  `<svg>` jest Twoje, bo ikony znikają — nic nie wycieka.

## Znane pułapki

- **Pomiar zaraz po `load` pokazuje pustą siatkę** — kafelki mają `.aai-reveal`
  i wchodzą przez IntersectionObserver. Czekaj ~1,5 s, inaczej zgłosisz błąd danych,
  którego nie ma.
- **Mierz po ustaniu ruchu, z filtrem na animacje nieskończone.** Samo
  `getAnimations()` nigdy się nie kończy przy dryfujących blobach tła i wiesza pomiar.
- **Zakres pomiaru musi trafić w ≥1 element.** Sprawdzenie strony rejestracji Tutora
  było ślepe od 0.41.0, bo pytało o `.tutor-wrap`, a strona rysuje się w
  `.tutor-disabled-wrapper` — cztery asercje przechodziły po pustce.
- **`color-mix()` wraca z przeglądarki jako `color(srgb …)`** — pomiar kontrastu, który
  tego nie rozbiera, raportował 15:1 jako 1,11:1. Zapisu, którego nie umiesz rozebrać,
  nie zgaduj.
- **Działający `npm run dev` pisze do tego samego `.next`, co produkcyjny build** —
  smoke'i padają wtedy na braku nagłówka i wygląda to jak regresja kodu.
- **Kolejność smoke'ów ma znaczenie:** `smoke-seo` i `smoke-podglad` przebudowują `.next`
  na eksport statyczny. Uruchamiaj `npm run smoke`, nie własną listę.
