# Przegląd agent + krytyk przed bramką B7

Wymóg z [DIAGRAM.md](DIAGRAM.md): *„B7 KOŃCOWA: wszystkie strażnicy + goldeny +
testy zielone, **przegląd pary agent+krytyk**, akceptacja właściciela"* — jedyna
bramka w całym Pluginie 1, która tego wymaga (WYTYCZNE N1: „każdy agent ma
krytyka, nigdy agent sam").

**Decyzja właściciela (2026-08-25): B7 zaliczona, ale przegląd i tak zrobić.**
Ten dokument jest jego wynikiem.

## Jak był prowadzony

Trzech recenzentów na **rozłącznych** obszarach (żeby nie powielali tez), każdy
czytał pliki w całości i miał zakaz zgłaszania stylu, braku komentarzy oraz
rzeczy udokumentowanych w kodzie jako świadoma decyzja:

| Recenzent | Obszar |
|---|---|
| 1 | `modules/m1-sklep/**` — kontrakty, dyspozytor, odczyt, klient bazy, migracje |
| 2 | `app/**`, `components/kreator/**` — trasy, panel właściciela |
| 3 | `lib/**`, `proxy.serwer.ts`, `next.config.ts`, `.githooks/**` — limiter, brama, CSP |

**Rolę krytyka pełnił agent główny**: żadne znalezisko nie weszło do naprawy bez
niezależnego potwierdzenia — uruchomieniem, odczytem bazy albo testem
negatywnym. To nie jest formalność: pierwszy przebieg mojego własnego strażnika
z tej samej tury oskarżył 33 poprawne miejsca, więc weryfikacja tez agentów jest
regułą, nie uprzejmością.

---

## Znaleziska POTWIERDZONE i NAPRAWIONE (wersja 0.36.0)

### 1. Cicha utrata treści: ten sam `id` modułu dwa razy w jednym zapisie

**Najpoważniejsze znalezisko przeglądu.** Dyspozytor przechodzi moduły pętlą
i po każdym kasuje lekcje spoza wejścia — to celowa mechanika pełnej podmiany
programu. Ale przy powtórzonym `id` drugi przebieg kasował lekcje zachowane
przez pierwszy, transakcja się commitowała, a odpowiedź brzmiała **`ok: true`**.

Potwierdzone uruchomieniowo na bazie testowej: lekcja z treścią zniknęła bez
śladu w odpowiedzi. Jedyny ślad zostawał w `course_changelog`.

**Naprawa:** `superRefine` na `KursWejscie` (`modules/m1-sklep/typy.ts`)
odrzucający powtórzone `id` modułów i lekcji, z komunikatem wskazującym pole.
Kontrakt jest jedyną drogą do bazy (`straznik-granic`), więc to właściwe
miejsce — i **przenosi się na wtyczkę WP**, gdzie builder Tutora wysyła całą
strukturę kursu przy każdym zapisie. Dwa testy regresji w
`modules/m1-sklep/tresc-lekcji.test.ts` (77 testów łącznie).

### 2. Katalog obiecywał produkt, którego nie ma

`app/szkolenia/widok.tsx` zapewniał „**Lekcje wideo** krok po kroku" oraz
„Checklisty, szablony i **pliki źródłowe — do pobrania**". Kurs jest TEKSTOWY
(decyzja właściciela 2026-08-19), a materiałów jest **0 na 73 lekcje**
(sprawdzone zapytaniem do bazy).

To ta sama klasa co BLAD-015 z audytu 0.33.0 — ale `straznik-obietnic` skanował
wyłącznie `tools/seed/seed-przyklady.ts`, więc tekst zaszyty w kodzie widoku był
poza jego zasięgiem. Seed wyczyszczono przy audycie, katalogu nie.

**Naprawa:** oba zdania przepisane na stan faktyczny + `straznik-obietnic`
czyta teraz także `app/**` i `components/**` (56 widoków), z dwiema mutacjami
w audycie. Testy negatywne w obie strony przed commitem.

### 3. Miniatura OpenGraph pokazywała „41 41 lekcji"

`lekcje()` z `lib/odmiana.ts` zwraca liczbę RAZEM ze słowem, a szablon dokładał
liczbę jeszcze raz. Potwierdzone wykonaniem funkcji. Ten obrazek idzie w świat
przy każdym udostępnieniu linku na Slacku czy LinkedInie; katalog używa tej
samej funkcji poprawnie. Żaden test tego nie łapał — `smoke-seo` czyta JSON-LD,
nie treść PNG.

### 4. Pula połączeń bez nasłuchiwacza `error` — restart bazy ubijał proces

`pg-pool` robi `emit("error")` na bezczynnym kliencie (zerwane połączenie,
`podman restart db1`, reaper połączeń u hostingu), a `EventEmitter` bez słuchacza
`error` rzuca wyjątek globalny — czyli **pada cała podstrona, nie jedno
żądanie**. Naprawa: jedna linia `pool.on("error", …)` z uzasadnieniem w kodzie.

### 5. Hak `pre-push` chronił `main`, a praca idzie na gałąź domyślną

Od 0.18.0 gałęzią domyślną jest `plugin-1-sklep-kursow` i to na nią idą wszystkie
merge'e; hak pilnował wyłącznie `main`, więc bezpośredni push na gałąź, na której
stoi cały projekt, przechodził bez słowa. Ochrony po stronie GitHuba nie ma
(plan Free), CI stoi — czyli workflow Weryfikacja-PR dawał się ominąć bez śladu.
Naprawa: hak czyta gałąź domyślną z `refs/remotes/origin/HEAD` i chroni obie.

---

## Znaleziska POTWIERDZONE, ZOSTAWIONE DO DECYZJI WŁAŚCICIELA

Nie naprawiam ich z własnej inicjatywy: każde wymaga rozstrzygnięcia, które
zmienia zachowanie produktu albo kształt tabel przy porcie na WP.

### A. Limiter: sprzątanie zdejmuje aktywną blokadę uwierzytelnień

`lib/limiter.ts` — funkcja sprzątająca dostaje okno BIEŻĄCEGO żądania (60 s)
zamiast najdłuższego znanego (10 min), a eksmisja przy przepełnieniu mapy idzie
po kolejności **wstawienia**, nie ostatniej aktywności. Recenzent pokazał
uruchomieniem, że po zalewie kluczy blokada „5 prób / 10 minut" znika przed
terminem, który sam podał w `Retry-After`.

Wagę łagodzi to, że `x-forwarded-for` jest podrabialny (udokumentowane), więc to
podniesienie kosztu ataku, nie granica bezpieczeństwa. **Ale ta sama reguła idzie
do wtyczki WP**, gdzie ma znaczyć to, co mówi. Do decyzji: naprawiamy w prototypie
czy zapisujemy jako wymaganie do implementacji PHP (licznik chybionych prób
w tabeli, nie w cache'u — cache eksmituje tak samo).

### B. Nic nie sprawdza, czy `KREATOR_TOKEN` przestał być wartością z przykładu

`KREATOR_TOKEN=ustaw-wlasny-token` — dosłowna wartość z `.env.example` — przejdzie
bramę. Scenariusz: `cp .env.example .env`, uzupełnienie `DB1_URL`, zapomniany
token; hasłem do panelu (zapis, publikacja, **usuwanie** kursów) zostaje łańcuch
z repozytorium. Do decyzji: odrzucać w kodzie wzorzec krótszy niż ~24 znaki
i równy przykładowemu, czy zostawić jako pozycję specyfikacji WP (tam
uwierzytelnia WordPress i problem znika).

### C. `UNIQUE (course_id, kind, position)` nie pasuje do sposobu czytania sekcji

Klucz dopuszcza dwie sekcje tego samego rodzaju na różnych pozycjach, a strona
bierze pierwszą (`sections.find(s => s.kind === kind)`). W bazie wszystkie sekcje
mają `position = 0` — kolumna jest dziś martwa. Kreator przy następnym zapisie
skasowałby drugą sekcję bez słowa.

**To trzeba rozstrzygnąć PRZED pisaniem schematu MySQL**: albo `UNIQUE
(course_id, kind)` i `position` wypada, albo strona zaczyna respektować kolejność.

### D. Pełna podmiana programu nie ma drugiej warstwy obrony

Udokumentowana cecha (zapis bez `id` kasuje lekcje), ale jedynym zabezpieczeniem
908 kB prozy jest to, że panel pamięta o odsyłaniu `id`. Jedno żądanie
`{"akcja":"zapisz","kurs":{"id":…,"modules":[]}}` czyści program razem z treścią
i odpowiada `ok: true`. Do decyzji: dyspozytor odmawia skasowania lekcji
z niepustą treścią bez jawnej zgody (`pozwol_skasowac_tresc: true`), czy zostaje
jak jest. Naprawa #1 zamyka wariant przypadkowy (duplikat), nie zamierzony.

### E. Retencja dziennika audytu

`course_changelog` = 3068 wierszy / 4152 kB przy 908 kB rzeczywistej treści.
Zapis programu robi `UPDATE` na KAŻDEJ lekcji z `id`, także niezmienionej,
a trigger zapisuje pełne `to_jsonb(OLD)` i `to_jsonb(NEW)` — dwie kopie treści
lekcji przy każdym zapisie spisu treści. Dziennika nie da się przyciąć (triggery
odrzucają `UPDATE`/`DELETE`/`TRUNCATE` — to celowa gwarancja z Działu 2).
Do decyzji **przed wejściem na współdzielony hosting**: audyt lekcji przestaje
kopiować `content`, czy powstaje jawna droga archiwizacji.

### F. Drobne, potwierdzone, nienaprawione

- Błędy pól nie są widoczne w edytorze programu ani w listach sekcji; po
  nieudanym zapisie panel skacze na zakładkę, na której nic nie jest zaznaczone
  (`EdytorProgramu`, `PolaOpisane`, `EdytorSekcji`).
- `FormularzKursu` nie ostrzega przed utratą niezapisanej pracy, w odróżnieniu
  od `EdytorLekcji`, który ma `beforeunload`.
- Każdy konflikt unikalności raportowany jest jako konflikt sluga.
- Lekcji nie da się przenieść między modułami (`WHERE module_id=` nigdy nie
  zmienia rodzica) — builder Tutora na to pozwala, więc port musi to obsłużyć.
- `proxy.serwer.ts` nie uruchamia się dla żądań z nagłówkiem `Purpose: prefetch`
  (matcher przepisany 1:1 z przewodnika Next), więc taki dokument idzie bez CSP.
- `pre-commit`: obecność `.env.example` w tym samym commicie wyłącza blokadę
  `.env`; wzorce sekretów nie znają `KREATOR_TOKEN=` ani hasła w `postgres://`.
- Ciastko kreatora niesie surowy token bezterminowo — „ważność 8 h" egzekwuje
  wyłącznie przeglądarka.

---

## Co przegląd potwierdził jako ZDROWE

Warto zapisać, bo to oszczędza powtórnego szukania:

- **Parametryzacja SQL pełna** — ani jednego sklejania danych z zapytaniem
  w całym module; granica `straznik-granic` trzyma (zero zapisów SQL poza
  `modules/`).
- **Kolejność „dostęp przed kształtem"** działa: zły token dostaje
  `brak-dostepu` bez mapy pól kontraktu, `timingSafeEqual`, brak tokenu = odmowa.
- **Treść lekcji nie ma jak wyciec**: wspólny odczyt oddaje wyłącznie flagę
  `ma_tresc` liczoną w SQL, a jedyne wywołanie `trescLekcji()` w `app/` stoi za
  bramą. Szkice nie wyciekają ani na stronę, ani do eksportu statycznego.
- **Nonce CSP jest naprawdę jednorazowy**, nie da się go podstawić nagłówkiem,
  a dwie polityki (proxy + `next.config`) nie kolidują.
- **Nie da się wyzerować licznika chybionych prób** śmieciowym żądaniem —
  recenzent sprawdzał to celowo jako pierwszy typ na obejście.
- **Kontrakty Zod zgadzają się ze schematem SQL** co do `CHECK`-ów, sufitów
  i 12 rodzajów sekcji; nieznane klucze są zdejmowane, `__proto__` nie przechodzi.
- **Migracje**: sha256 wszystkich plików zgodne z manifestem, runner odmawia
  pracy po zmianie pliku, każda migracja w osobnej transakcji.
- **Panel pokrywa kontrakt w 100%** — `straznik-kreatora` egzekwuje to poprawnie,
  łącznie z polami zagnieżdżonymi.

---

## Materiał, który przechodzi do etapu WP

Oba raporty techniczne wyprodukowały listy konstrukcji wymagających decyzji przy
przepisywaniu — **20 pozycji dla MySQL** (brak odraczania ograniczeń, brak
`RETURNING`, tablice jako parametr, `jsonb` → `JSON`, `JSON_ARRAYAGG` bez
`ORDER BY`, triggery audytu bez `to_jsonb`, `TEXT` 65 kB vs kontrakt 120 tys.
znaków → `MEDIUMTEXT`, aktor audytu jako zmienna sesyjna, brak triggerów na
`TRUNCATE`) i **13 dla PHP/WordPressa** (nośnik limitera, `hash_equals`,
`wp_create_nonce` to NIE jest nonce CSP, cache stron kontra nonce, `is_ssl()`
nie czyta `X-Forwarded-Proto`, `post_max_size` zamiast sufitu strumienia).

Szczegóły w [MIGRACJA-DO-WP.md](MIGRACJA-DO-WP.md) i w specyfikacji
bezpieczeństwa wtyczki ([security-checklist.md](../security-checklist.md), §8).
