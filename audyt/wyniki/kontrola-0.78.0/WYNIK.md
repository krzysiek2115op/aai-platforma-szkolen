# Fala kontrolna po 0.78.0 — WYNIK

**Pytanie właściciela:** *„czy na pewno nie ma tam już błędów"*.
**Odpowiedź: NIE — są cztery znaleziska o produkcie i cztery defekty
oprzyrządowania. Żadne nie dotyka danych klienta ani sprzedaży; wszystkie
dotyczą odtwarzalności, granic między wtyczkami i prawdziwości dokumentów.**

Kod produktu: `main` na **v0.78.0**. Forma: 14 Pogłębiaczy + 14 krytyków,
nośnik B, dwa tory (`:8892`, `:8894`). Dziennik przebiegu: `PRZEBIEG.md`.

## 1. Bilans werdyktów

| | Liczba |
|---|---|
| Ról wykonanych | **14 / 14** |
| Krytyków | **14 / 14** |
| **PRZEPUSZCZAM** | **1** (PRIV) |
| **ODRZUCAM** | **13** |

**Żaden krytyk nie obalił werdyktu o produkcie.** Odrzucenia dotyczyły
DOWODU: werdyktów z lektury, kwantyfikatorów bez policzenia, testów, które
nie mogły zawieść, i wymówek „nie dało się". W pięciu wypadkach krytyk
**wzmocnił** tezę roli zamiast ją osłabić — to zmierzony argument za parą
agent+krytyk (WYTYCZNE N1).

## 2. Znaleziska o produkcie — cztery

| # | Rzecz | Dowód | Waga |
|---|---|---|---|
| **Z1** | **Pętla odtworzenia danych jest ZAMKNIĘTA.** `postaw.sh` (rozkaz kroku zerowego) kończy na świeżej instalacji EXIT=1 i jako lekarstwo drukuje `npm run wp:zrzuty` — **jedyną komendę, która crashuje**. Łańcuch z README:616 nie może się powieść od `v0.76.0`. Przyczyna: `sprawdz` zwraca kod 1 przy braku zrzutów, a konsumenci wołają go bez `try/catch` | zmierzone przez FE, WDR i krytyka WDR; potwierdzone strukturalnie przez orkiestrację | **WYSOKA** |
| **Z2** | **Odinstalowanie Pluginu 1 kasuje produkty Pluginu 2.** `uninstall.php` wybiera po `_aai_zrodlo_uuid` **bez filtra `post_type`**; Plugin 2 broni się filtrem, Plugin 1 nie. Stopka Pluginu 1 obiecuje przy tym „ZOSTAWIA ZAWSZE… produkty WooCommerce" | WDR uruchomieniowo (2→0), krytyk inną drogą; zasięg policzony: klucz na 89 wpisach 4 typów | **ŚREDNIA** — opcji włączającej **nie ustawia ani jeden ekran** (zweryfikowane), więc klient nie ma tam drogi |
| **Z3** | **Katalog jest N+1 w liczbie kursów.** 2 kursy → 71 zapytań, 22 kursy → 90; w dzienniku `20× SELECT product_id … WHERE course_uuid` | krytyk PERF, z kontrolą pozytywną i powrotem do 71 | **NISKA dziś** (2 kursy), rośnie z katalogiem |
| **Z4** | **Cicha utrata treści w prototypie.** `lessons: …default([])` (`typy.ts:430`) + `DELETE … NOT (id = ANY($2))` (`dyspozytor.ts:252`): zapis modułu **bez klucza `lessons`** kasuje wszystkie jego lekcje i zwraca `ok:true`. Ta sama klasa, którą `v0.71.0` naprawiła dla `materialy`, a wtyczka WP zamknęła w `v0.65.0` | krytyk PROTO sondą (PRZED=2, PO=0); potwierdzone strukturalnie przez orkiestrację | **ŚREDNIA** — panel zawsze wysyła klucz, więc ścieżka właściciela jest bezpieczna; dziura otwiera się przy wywołaniach z pominięciem panelu |

**Trzy drobne, w tej samej rodzinie „dokument kłamie o kodzie":**
- **trzy nieprawdziwe liczniki** w README („Gdzie co leży"): `wordpress/` 136 wobec **137**, `aai-sklep/` 88 wobec **89**, `aai-platnosci/` 18 wobec **19** — przy `straznik-readme` kod 0, choć blok zapowiada się jako „Drzewo zmierzone, nie przepisane". **Luka reguły, nie świadome wyłączenie** (docblock wymienia dwa wyłączenia i liczników wśród nich nie ma);
- **polityka prywatności obiecuje „pełny" User-Agent**, a kod ucina go do 191 znaków (244 → 191); komentarz w kodzie uzasadnia brak parsowania potrzebą „dokładnego łańcucha", który warstwa zapisu przycina. **Niezależne** od pozycji `REA-PRIV-F1-001` (klasy przeciwne);
- **`smoke-wp-monitor.mjs:838`** ma deterministyczny generator identyfikatora odsłony, który koliduje (UNIQUE) z resztkami przerwanego przebiegu i daje mylący komunikat; komentarz nad nim twierdzi „Domyślnie LOSOWY" — nieprawda o własnym kodzie.

## 3. Defekty oprzyrządowania — cztery

| # | Defekt | Skutek |
|---|---|---|
| **N1** | `git ls-files ':(glob)…{a,b}.php'` **nie rozwija klamr** — a **bazowe liczby „ma zwrócić N" w definicjach ról same nim policzono** | udowodnione na commicie z 2026-09-01: komenda oddawała wtedy **dokładnie deklarowane liczby** (BD 25, INT 15, FE 57), a poprawne były 35 / 21 / 66. **Samokontrola nie mogła zadziałać, bo obie strony porównania pochodzą z tego samego defektu.** Zasięg: 6 z 80 definicji |
| **N2** | `grep --include` w kontenerach WP kończy **kodem 2** (BusyBox, `unrecognized option`) | jako „0 trafień" widać to tylko przy stłumionym `stderr`. W `tools/` **zero** wywołań do kontenera — defekt dotyka komend doraźnych |
| **N3** | niepełna komenda niezmiennika sektora (bez `':!re-audyt'`) daje **86** zamiast 0 | trzy miejsca, z czego **jedno bez oznaczenia historycznego**: `docs/PLAN-NAPRAW-PO-POLOWANIU.md:13`. Czwartego nie ma (uniwersum policzone) |
| **N4** | `tools/pakuj-wtyczki.mjs:297` **po cichu ignoruje** formę `--wyjscie=<ścieżka>` | kończy kodem 0 i pisze do repozytoryjnego `paczki/`; przez to kontrola pozytywna roli USP „na kopii" nie mogła dać kodu 1 |

## 4. Ograniczenia metody — nazwane, nie przemilczane

1. **Audyt mutacyjny na współdzielonym bind mouncie FAŁSZUJE równoległy
   pomiar.** Zmierzone: **10 z 40 równoległych żądań w 106 ms oknie mutacji
   zobaczyło zmutowany kod**; krytyk QA sprostował **na niekorzyść** — przy
   `opcache.revalidate_freq = 2` zmutowany opcode może być serwowany **do 2 s
   PO przywróceniu pliku**. Dotyczy prac BD i INT (okno 22:33–00:15), obu
   i tak ODRZUCONYCH z innych powodów. Zakaz wprowadzony po pierwszym
   odrzuceniu okazał się konieczny, nie ostrożnościowy.
2. **Rola WDR złamała ten zakaz** (mutowała plik wtyczki); jej krytyk
   **odmówił certyfikacji** dwóch testów negatywnych zamiast łamać zakaz sam.
3. **Tor B nie był dziewiczą instalacją** — `postaw.sh` reużył wolumenu
   z 2026-09-05, a **nie wykrywa tego stanu** (identyczny output). To
   zafałszowało pomiar roli ARCH (wzięła artefakt reużycia za usterkę).
4. **PROTO-R6 niedomknięte** — porównania prototyp↔wtyczka nie da się zrobić
   bez instalacji WP; jedyne narzędzie różnicowe wymaga `podman exec`.
5. **Defekt planu fali:** protokół zalicza PIK do ról „bez toru", a jej rundy
   R1 i R6 wymagają żywej instalacji. Stąd trzy luki, domknięte dopiero przez
   jej krytyka.
6. **Protokół podaje „testy 83/83"** — stan faktyczny to **84/84**.

## 5. Co potwierdzono jako DZIAŁAJĄCE (wybór)

- **zamek wycieku 73 lekcji** — z kontrolą pozytywną: po wyłączeniu wtyczki
  kanał RSS oddaje **200 / 135 kB / 10 pozycji z tytułami lekcji**, po
  włączeniu 404 / 0. Dziewięć dróg alternatywnych czystych;
- **fragmenty haseł nie trafiają do dziennika** — konto nieistniejące
  maskowane, istniejące dosłownie, ekran admina bez trafień na sekrety,
  CSRF bez nonce'a → 403;
- **sufit dziennika** — nowa arytmetyka nie rusza 68 wierszy właściciela,
  stara skasowałaby wszystkie; zmierzone z dwóch stron, na dwóch torach;
- **hamulec przy usuwaniu kursu z kupującymi** — odmowa z liczbą, także gdy
  kopia kursu jest w koszu; kontrola negatywna dowodzi, że test umiał zawieść;
- **zdanie o dostępie po wpłacie** — bramka zapala się na wstrzykniętej
  nieprawdzie (kod 1, 2 sprawdzenia z 90) i **sama się rozluźnia** po
  dorejestrowaniu bramki natychmiastowej (88/88, kod 0);
- **klik „Oznacz jako przerobioną"** — dowód w bazie; przy złym nonce odmowa
  i BRAK wiersza;
- **`v0.78.0` — klasa „zapis melduje sukces"** — wyzwalacze SQL blokujące
  pojedyncze zapytanie potwierdzają, że kontrole naprawdę zgłaszają awarię;
- **paczki dla klienta** bit-identyczne w dwóch przebiegach, z odmową przy
  podmienionej treści;
- **treść kursów**: `wp:sprawdz` **73/73 co do znaku**, `wp:tutor` **0 różnic**,
  import idempotentny (3 × `0/0/109`).

## 6. Stan dowodów na koniec fali

Strażnicy **39/39** · audyt mutacyjny **452** (450 złapanych, 0 martwych,
0 przeoczonych) · `npm test` **84/84** · `npm run check` kod 0 ·
**15/15 bramek WP** (dane 30 · front 89 · tutor 49 · lekcja 64 · kreator 102 ·
panel 55 · płatności 27 · produkty 101 · zakup 60 · zwroty 39 · maile 62 ·
język 25 · motyw 93 · monitor 184 · seo 172) · niezmiennik sektora **0** ·
strażnik sektora kod 0.

**Regresji wobec `v0.78.0` NIE ZNALEZIONO.** Wszystkie liczby stanu
wyjściowego odtworzone co do sztuki.

## 7. Co dalej — decyzja właściciela

Cztery znaleziska o produkcie i cztery defekty oprzyrządowania **nie zostały
naprawione** — sektory nie naprawiają (zasada 2). Naprawy idą zwykłą drogą:
gałąź od `main`, PR, zielone CI.
