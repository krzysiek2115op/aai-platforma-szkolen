---
name: integration-audit
description: Wyłącznie jako rola INT sektora AUDYT: weryfikacja każdego naszego założenia o Tutorze, WooCommerce i motywie przez odczyt ICH kodu na dysku, nigdy przez dokumentację. Używać przy pozycjach INT-01…INT-11.
---

# Audyt integracji z cudzym kodem — umiejętność roli INT

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

Przy **każdej** pozycji INT — to jest jedyna rola, w której skill jest procedurą
domyślną, a nie wyjątkiem. Powód: pozycja INT-01 wymaga dowodu z kodu na dysku,
a pozostałe pozycje stoją na założeniach, które ten dowód potwierdza albo obala.

## Procedura

1. **Wypisz ZAŁOŻENIA, zanim otworzysz cudzy kod.** Założenia stoją w
   `docs/ETAP-WP.md`, w sekcjach faktów `docs/plugin-*/DIAGRAM.md` i w komentarzach
   naszych klas.
   *Wynik:* lista zdań o cudzym zachowaniu, każde z `plik:linia` NASZEGO dokumentu.

2. **Dla każdego założenia znajdź miejsce w CUDZYM kodzie**, które je potwierdza albo
   obala. Dokumentacja cudzej wtyczki **nie jest dowodem** — bywa starsza od kodu.
   *Wynik:* `plik:linia` w `~/.cache/aai-audyt-dokumentacja/cudzy-kod/`.

3. **Gdy założenie dotyczy MOMENTU** (kiedy hak biegnie, co jest w pamięci żądania),
   dowodem jest kolejność wywołań, nie obecność funkcji.
   *Wynik:* ścieżka wywołania w cudzym kodzie, ogniwo po ogniwie.

4. **Gdy założenie dotyczy CSS**, sprawdź warstwę kaskady, nie specyficzność.
   *Wynik:* nazwa warstwy albo jej brak, dla obu kolidujących reguł.

5. **Sprawdź, czy funkcja, na której stoimy, w ogóle ISTNIEJE.** `tutor()->wc` nie
   istnieje; test negatywny na nieistniejącym wywołaniu przechodzi po pustce
   i wygląda jak dowód.
   *Wynik:* `plik:linia` definicji albo zdanie „nie istnieje, szukane w …".

6. **Miejsce zgłoszenia wskazujesz w NASZYM kodzie**, nie w cudzym — naprawiać będzie
   się nasze założenie. Cudzy `plik:linia` idzie do dowodu.
   *Wynik:* miejsce z naszego zakresu + dowód z cudzego.

## Komendy

```
# nasze założenia
grep -n "sprawdzone\|zmierzone\|F[0-9]\|fakt" docs/ETAP-WP.md docs/plugin-*/DIAGRAM.md

# cudzy kod na dysku — dowód, nie dokumentacja
ls ~/.cache/aai-audyt-dokumentacja/cudzy-kod/
grep -rn "function is_enrolled" ~/.cache/aai-audyt-dokumentacja/cudzy-kod/tutor
grep -rn "monetize_by" ~/.cache/aai-audyt-dokumentacja/cudzy-kod/tutor

# nasze punkty styku
grep -rn "is_enrolled\|has_enrolled_content_access" wordpress/wtyczki
grep -rn "revert-layer" wordpress/wtyczki/aai-sklep/assets
grep -rn "meta_value" wordpress/wtyczki
```

Kody wyjścia **bez potoku**.

## Czego ta umiejętność NIE robi

- **nie ocenia granic naszych wtyczek** (→ ARCH): „źle odczytaliśmy cudze zachowanie"
  jest Twoje, „nie powinniśmy się byli na nim opierać" jest ich;
- **nie ocenia wyglądu naszych stron** (→ FE) — kolizja z cudzym arkuszem jest Twoja,
  nasza pigułka zasłaniająca hero jest ich;
- **nie ocenia instalacji u klienta** (→ WDR);
- **nie ocenia kosztu cudzego wywołania** (→ PERF).

## Znane pułapki

- **Dokumentacja cudzej wtyczki bywa starsza od jej kodu.** W tym projekcie docs
  GitHuba podawały nieaktualne brzmienia komunikatów i weszły do lekcji jako cztery
  nieprawdy. **Komunikat cytujemy z WYKONANIA, nie z dokumentacji.**
- **Funkcja, której nie ma, nie zgłasza błędu w teście negatywnym** — po prostu nic nie
  wyłącza, a test przechodzi. Zdejmuj callbacki po nazwie klasy z `$wp_filter`.
- **Cudzy callback na niższym priorytecie zabiera zdarzenie.** Nasze haki idą
  z priorytetem 1 tam, gdzie kolejność ma znaczenie.
- **Nasz wyjątek wychodzi do kasy Woo** — każdy handler na cudzym haku w
  `catch ( Throwable )`, i to obejmującym WYWOŁANIE, nie tylko ciało.
- **`wp_kses_post` zjada `<svg>`** — ikony znikają po cichu.
- **Wersja cudzej wtyczki zmienia jej tokeny CSS**: Tutor 4.0.7 przyniósł drugą rodzinę
  305 zmiennych, przez co mapowanie z poprzedniej wersji przestało sięgać.
