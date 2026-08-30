# Krok T3 — timer wizyt: audyt planu, pomiary i przepis wykonania

**CZYTAĆ PRZED PRACĄ NAD T3.** Ten dokument powstał **przed pierwszą linią
kodu**, na polecenie właściciela („wykonaj dokładny audyt planu T3… zależy
nam, żeby jak najmniej poprawek było później”, 2026-08-30). Zapisuje to,
czego nie wolno wyprowadzać od nowa: **pomiary w cudzym kodzie i w żywej
przeglądarce**, znaleziska audytu wraz z tym, co by się stało bez nich,
oraz poprawki, które z nich weszły do planu.

Zasada, na której stoi cały ten krok: **beacon nie ma czytelnika.**
Odpowiadamy `204` i na przyjęcie, i na odrzut, więc każda pomyłka w tym
module jest z definicji **bezobjawowa** — nie zapala się nigdzie, tylko
cicho zmienia liczby na ekranie. Dlatego mierzymy, zamiast zakładać.

---

## 1. Decyzje właściciela

### 1.1 Rozstrzygnięcia przed planem (2026-08-30)

| # | Pytanie | Decyzja |
|---|---|---|
| R1 | Sito ścieżki — czym zastąpić `url_to_postid()` | **Podpis strony**: serwer przy renderze podpisuje własną ścieżkę, beacon odsyła podpis, endpoint weryfikuje |
| R2 | Co znaczy „czas na stronie” | **Czas aktywny** — liczy się tylko wtedy, gdy karta jest widoczna |
| R3 | Adresy z parametrami | **Sama ścieżka**; query i fragment obcinamy |
| R4 | Przegląd przed PR-em | **Recenzenci-agenci** jak w T2, agent główny jako krytyk |

### 1.2 Akceptacje po audycie (2026-08-30)

| # | Co zaakceptowane |
|---|---|
| A1 | Poprawka zaakceptowanego schematu: podpis zamiast `url_to_postid()`, `wiek_ms` w kontrakcie wystrzału, obowiązkowy `Content-Type`, okna od północy czasu witryny |
| A2 | **Odsłony będą zaniżone** o wyjścia bez beaconu (crash, ubita przeglądarka, wyłączony JS). Wariant „dwa beacony na odsłonę” odrzucony |
| A3 | Sufit ciała **1024 B**; sufit beaconów na minutę — liczba po pomiarze w etapie 2 |
| A4 | Sól podpisu **własna, w opcji** — odporna na rotację kluczy w `wp-config.php` |
| A5 | Skrypt zostaje także na koszyku i kasie (mierzy porzucenia, niczego nie blokuje) |
| A6 | Ryzyko `/wp-admin/` na produkcji przyjęte, z pozycją wdrożeniową |
| A7 | Ekran mówi wprost, że sesja to karta-drzewo, a odsłony są zaniżone |

---

## 2. Pomiary zrobione PRZED kodem

Każdy da się powtórzyć. Rig przeglądarkowy żył w scratchpadzie sesji
(`rig-beacon.mjs`, `rig-wyjscie.mjs`, `rig-cookie.mjs`) — **nigdy w repo
i nigdy w `package.json`**, tak jak każdy rig w tym projekcie.

### 2.1 Rozmiar beaconu (pod sufit ciała)

Realne ścieżki instalacji: **152 sztuki, mediana 49 B, najdłuższa 89 B**
(`/courses/jak-korzystac-z-claude/lessons/prompt-caching…/`), ani jedna
ponad 191 B.

| ładunek JSON | bajty |
|---|---|
| realny najdłuższy | **168 B** |
| mediana | 125 B |
| maksimum kontraktu (ścieżka 191 znaków) | **270 B** |

Schemat zakładał „≈ 300 B, sufit 4× realny beacon”. Pomiar mówi, że
sufit musi pomieścić **maksimum kontraktu**, nie średnią →
**1024 B** (3,8× maksimum, 6× realny). Smoke wysyła 1025 B.

### 2.2 `EXPLAIN` i indeksy (tabela pomiarowa 200 000 wierszy)

Rozkład realistyczny: 155 ścieżek, 40 000 sesji, skos jak w prawdziwym
ruchu, 400 dni. Tabela pomiarowa stała **poza prefiksem wtyczki**
(`wp_pomiar_t3_wizyty`) i została skasowana.

| zapytanie | dziś: `KEY wejscie` | + indeks pokrywający |
|---|---|---|
| okno 30 dni (odsłony, sesje, czas) | 55 ms | 43 ms |
| top 10 ścieżek, 30 dni | 50 ms | 28 ms |
| okno „dziś” | 1,7 ms | — |
| retencja (`wejscie <`) | 0,09 ms | — |
| **wstawienie 20 000 wierszy** | **57 ms** | **167 ms** |
| indeksy na dysku | 5,5 MB | 38,7 MB |

**Wniosek: indeksów NIE dokładamy.** Zysk to 34 ms na ekranie otwieranym
przez jedną osobę; cena to zapis **2,9× droższy** i **+33 MB** — a beacon
jest najczęstszym zapisem tego modułu. To zamyka wymóg schematu
„indeksy ustala `EXPLAIN` przy T3, nie deklaracja”.

### 2.3 Sito ścieżki — dlaczego mechanizm ze schematu nie działa

`url_to_postid()` na żywej instalacji:

| ścieżka | wynik |
|---|---|
| `/szkolenia/` | **0** |
| `/szkolenia/jak-korzystac-z-claude/` | **0** |
| `/courses/…/lessons/czym-jest-claude…/` | **0** |
| `/` (strona główna) | **0** |
| `/koszyk/`, `/kasa/`, `/my-account/`, `/polityka-prywatnosci/` | 6, 7, 8, 21 |

Nasze trasy to reguły przepisywania, nie wpisy; lekcje to CPT Tutora
z własną strukturą adresów. `get_page_by_path()` po ostatnim segmencie
**nie znajduje lekcji w ogóle**, a dla kursu trafia PRZYPADKIEM (ten sam
slug co wpis Tutora). Sito napisane wprost ze schematu przepuściłoby
koszyk i politykę prywatności, a wyrzuciło **katalog, obie strony
sprzedażowe i wszystkie 73 lekcje** — przy odpowiedzi 204 i zerowym
objawie.

Koszt alternatywy: `hash_hmac` **1,7 µs** na wywołanie, `AUTH_SALT` jest.

### 2.4 Koszt kanału (obawa obalona)

| kanał | czas odpowiedzi |
|---|---|
| `admin-post.php` (400) | **45–58 ms** |
| zwykła odsłona `/szkolenia/` | 55–64 ms |
| `admin-ajax.php` | 43–54 ms |

Beacon nie jest droższy od strony, **mimo** że `admin-post.php` odpala
pełny bootstrap, `wp-admin/includes/admin.php` i `do_action( 'admin_init' )`.

### 2.5 Zachowanie prawdziwej przeglądarki (Firefox, rig)

**Nagłówki i typy**

| co zmierzone | wynik |
|---|---|
| `Origin` przy beaconie **same-origin** | **JEST** (`http://127.0.0.1:8971`) — **wbrew MDN**, które twierdzi, że Origin idzie tylko cross-origin |
| `Referer` | jest |
| `Content-Type` z Bloba | dociera jako `application/json` (potwierdza F10) |
| **cross-origin, `application/json`** | **POST NIE DOCHODZI** — leci sam `OPTIONS`; WordPress w `send_origin_headers()` odpowiada **403 i `exit`** |
| **cross-origin, `text/plain`** | **POST DOCHODZI** |
| `Cookie` | **jest w każdym beaconie** — więc zalogowany trafia w `admin_post_` (potwierdza F17) |
| beacon 60 kB / 70 kB | oba `true`, **oba doszły w całości** — limit 64 KiB z MDN nie zadziałał |
| tempo z jednej strony | **26 363 beacony/s, wszystkie doszły** |
| `isSecureContext` na `http://127.0.0.1` | `true` (localhost jest „potentially trustworthy”) |
| `crypto.getRandomValues` | działa; MDN: „jedyny człon `Crypto` dostępny z kontekstu niebezpiecznego” — czyli zadziała też na produkcji przed HTTPS |
| `crypto.randomUUID` | wymaga bezpiecznego kontekstu; i tak nieużywane (36 znaków z myślnikami) |

**Kolejność zdarzeń przy wyjściu ze strony** (nawigacja, potem `history.back()`):

```
+    0 ms  start
+    2 ms  pageshow persisted=false
+ 1448 ms  pagehide persisted=true      ← NAJPIERW pagehide
+ 1448 ms  visibilitychange hidden      ← w tej samej milisekundzie
+ 1456 ms  druga strona załadowana
+ 2956 ms  visibilitychange visible     ← powrót z bfcache
+ 2957 ms  pageshow persisted=true      ← stan JS ZACHOWANY
```

**Z dokumentacji (cytaty):** `visibilitychange` → `hidden` to „ostatnie
zdarzenie wiarygodnie obserwowalne przez stronę”; `pagehide` „nie jest
niezawodnie wywoływane, zwłaszcza na urządzeniach mobilnych”; `unload`
i `beforeunload` są „skrajnie niepewne” i niezgodne z bfcache.
`sessionStorage` jest **kopiowany** do karty otwartej z linku (`opener`)
i potrafi rzucić `SecurityError`, gdy odwiedzający blokuje ciasteczka.
`visibilityState` ma tylko `visible` i `hidden` — **strona w tle jest
`hidden`**, co obsługuje przy okazji prerender.

### 2.6 Rdzeń WordPressa (czytane w kodzie, nie w dokumentacji)

- `admin-post.php`: `send_origin_headers()` → `require wp-admin/includes/admin.php`
  → `nocache_headers()` → `do_action( 'admin_init' )` → `$action` z **`$_REQUEST`**
  → rozgałęzienie po `is_user_logged_in()` na dwa rozłączne haki (F17, F18).
- `send_origin_headers()`: przy niedozwolonym `Origin` i metodzie `OPTIONS`
  → **`status_header( 403 ); exit;`** — to jest maszyneria, która zatrzymuje
  cudzy beacon `application/json`.
- `set_transient()` z terminem ustawia **`autoload = false`** — limiter nie
  obciąża każdego żądania witryny.
- `robots.txt` instalacji: `Disallow: /wp-admin/` z jawnym `Allow` **tylko**
  dla `admin-ajax.php`.
- Strefa warsztatu: `timezone_string` pusty, `gmt_offset = 0` — **błąd stref
  jest tu z definicji niewidoczny**.

---

## 3. Znaleziska audytu

Numeracja `Z`. Przy każdym: co by się stało, gdyby audytu nie było.

### 3.1 Krytyczne — dane kłamałyby po cichu

| # | Znalezisko | Skutek bez poprawki |
|---|---|---|
| **Z1** | **`wejscie = now() − trwanie_ms` przestaje działać przy czasie aktywnym** (R2). Karta otwarta o 9:00, czytana 2 minuty, zamknięta o 17:00 zapisze `wejscie = 16:58` | Wizyty w złej godzinie i złej dobie — dokładnie ta wada, przed którą schemat się bronił, wpuszczona tylnymi drzwiami przez rozstrzygnięcie o pomiarze czasu |
| **Z2** | **Endpoint musi odrzucać ciała inne niż `application/json`** | Cross-origin `text/plain` **dochodzi** (zmierzone), więc obca witryna zawyżałaby nasz ruch z przeglądarki dowolnego odwiedzającego. Cała ochrona wynika z wymogu typu, nie z sita na `Origin` |
| **Z3** | **`Origin` jest wysyłany same-origin, wbrew MDN** | Sito oparte na dokumentacji stałoby na słabszym nagłówku (`Referer`), który znika przy `Referrer-Policy: no-referrer` |
| **Z4** | **`pagehide` i `visibilitychange` odpalają w tej samej milisekundzie** | Bez flagi idempotencji **każda odsłona to dwa wiersze**: odsłony zawyżone dwukrotnie, średni czas zaniżony o połowę |
| **Z5** | **Powrót z bfcache zachowuje stan JS** | Flaga „już wysłałem” zostaje ustawiona → **powrót „wstecz” nie jest liczony wcale**. Na kursie, gdzie czytelnik skacze między lekcjami, znika istotna część ruchu |
| **Z6** | **Sito ze schematu (`url_to_postid`)** — patrz §2.3 | Cały interesujący ruch odrzucony, bez objawu |

### 3.2 Poważne

| # | Znalezisko | Skutek |
|---|---|---|
| **Z7** | `robots.txt`: `Disallow: /wp-admin/`, `Allow` tylko dla `admin-ajax.php` | Beaconu nie blokuje, ale pokazuje, jak ekosystem traktuje te adresy. Na produkcji wtyczki bezpieczeństwa i reguły hostingu zamykają `/wp-admin/*` gościom, zwykle robiąc wyjątek dla `admin-ajax.php` — **nie** dla `admin-post.php` |
| **Z8** | `admin_init` odpala się przy KAŻDYM beaconie | Dziś czysto. Ale aktualizacja Woo albo Tutora może wprowadzić na tym haku przekierowanie, które zabije beacon bez objawu → **bramka asertuje WIERSZ, nigdy kodu odpowiedzi** |
| **Z9** | Ciało trzeba czytać **strumieniem** z sufitem | `post_max_size = 8M`: bez tego jedno żądanie wciąga 8 MB do pamięci PHP, zanim cokolwiek sprawdzimy |
| **Z10** | 26 363 beacony/s, wszystkie doszły | Miękki limiter to tama na przypadek, nie na napastnika — nazwane liczbą, nie przymiotnikiem |
| **Z11** | W warsztacie wszystkie żądania mają **jedno IP** (brama kontenera, F14) | Limiter zetnie własne bramki w trakcie przebiegu — smoke musi być tego świadomy, inaczej zacznie migotać |
| **Z12** | `sessionStorage` kopiowany do karty z linku | „Sesje” znaczą **drzewa kart**, nie ludzi |
| **Z13** | `sessionStorage` rzuca `SecurityError` przy blokadzie ciasteczek | Bez `try/catch` pomiar milknie u części odwiedzających, bez objawu |
| **Z14** | Okna „dziś / 7 / 30” w UTC ≠ doba lokalna | W warsztacie `gmt_offset = 0`, więc **błąd wyszedłby dopiero na produkcji** — a okna wprowadza właśnie ten krok |
| **Z15** | Podpis oparty na `wp_salt()` umiera przy rotacji kluczy | Cały pomiar milknie, bo wydane podpisy przestają pasować |
| **Z16** | Odsłony bez beaconu | Licznik **systematycznie zaniża** — wbudowana właściwość „jednego beaconu przy wyjściu”, przyjęta świadomie (A2) |
| **Z17** | Ścieżka trafia na ekran z ciała żądania | Musi iść przez `esc_html`. Podpis dowodzi pochodzenia, **nie czyni treści bezpieczną** |
| **Z18** | `is_admin()` jest **prawdziwe** w kontekście beaconu (`admin-post.php` definiuje `WP_ADMIN`) | Każdy warunek na `is_admin()` w tej ścieżce znaczy co innego, niż się wydaje |

### 3.3 Sprawdzone i BEZ ZARZUTU — nie szukać drugi raz

- **`Aai_Sklep_Zasoby` nie zdejmie naszego skryptu**: filtruje uchwyty
  o prefiksach `tutor`, `wc-`, `woocommerce`, `sourcebuster`. `aai-monitor-*`
  jest poza nimi — ale to znaczy, że uchwytu **nie wolno** nazwać inaczej.
- **`wp_footer()` działa na naszych szablonach**: `sklep.js` jest w HTML
  katalogu, wszystkie pięć szablonów woła `get_header()`/`get_footer()`.
- **Nazwy wolne w repo**: `aai-monitor-pomiar`, `wiek_ms` — zero trafień.
- Drobiazg do naprawienia przy okazji: komentarz `straznik-monitora-wp`
  zapowiada „CZTERNAŚCIE NIEZMIENNIKÓW”, a wylicza 13 (ta sama klasa,
  której `straznik-readme` pilnuje w README).

---

## 4. Poprawki wprowadzone do planu

| # | Poprawka | Z czego wynika |
|---|---|---|
| **P1** | Beacon niesie **dwie liczby**: `trwanie_ms` (aktywny) i `wiek_ms` (od wejścia do wysyłki). Serwer liczy `wejscie = now() − wiek_ms`; obie przycinane sufitem | Z1 |
| **P2** | Endpoint **wymaga `Content-Type: application/json`** | Z2 |
| **P3** | Pochodzenie: `Origin` obowiązkowy, `Referer` jako zapas, brak obu = odrzut | Z3 |
| **P4** | Skrypt: jedna wysyłka na odsłonę, flaga zdejmowana **na `pageshow.persisted`**; zegar startuje dopiero przy `visibilityState === "visible"` | Z4, Z5, karta w tle, prerender |
| **P5** | Podpis solą **własną, w opcji**, nie `wp_salt()` | Z15 |
| **P6** | Ciało czytane **strumieniem** z sufitem 1024 B, przed parsowaniem | Z9 |
| **P7** | Okna ekranu od **północy czasu witryny**, przeliczone na UTC; wyświetlanie przez `wp_date()` | Z14 |
| **P8** | Ekran mówi wprost: sesja = karta-drzewo, odsłony zaniżone | Z12, Z16, A7 |
| **P9** | Bramka asertuje **wiersz**, nigdy kodu odpowiedzi; osobny przypadek „akcja tylko w ciele” (F18) → 200 **i zero wierszy** | Z8, P15 schematu |
| **P10** | Smoke świadomy jednego IP warsztatu: limiter w osobnym oknie, stan przywracany | Z11 |
| **P11** | Uchwyt skryptu **musi** brzmieć `aai-monitor-*` — reguła strażnika, nie zwyczaj | §3.3 |
| **P12** | Sufit beaconów na minutę dopiero **po pomiarze rigiem**; bez rozstrzygnięcia — wartość z jawną etykietą „kalibracja po pierwszym tygodniu” | Z10 |

---

## 5. Plan wykonania

**Gałąź** `feat/t3-timer-wizyt` od `main` (0.56.0) → wersja **0.57.0**.

| Etap | Zakres |
|---|---|
| **E0 — schemat** | Poprawka `DIAGRAM.md` §5 i §7: podpis zamiast `url_to_postid()`, `wiek_ms`, obowiązkowy `Content-Type`, `trwanie_ms` = czas aktywny, okna od północy lokalnej. Nowe fakty i pułapki z §2 tego dokumentu |
| **E1 — wystrzał** | `Aai_Monitor_Wizyty`: obie nazwy akcji, nazwa w query stringu, ciało strumieniem z sufitem, sito (typ → pochodzenie → podpis → sesja → liczby), miękki limiter po skrócie IP, zawsze `204`, `try/catch ( Throwable )`, zapis wyłącznie przez `Aai_Monitor_Zapis::dodaj_wizyte()`, meldunek czujki „ruch” |
| **E2 — skrypt** | `assets/pomiar.js`: `navigator.webdriver` → koniec pracy; sesja z `sessionStorage` w `try/catch` z zapasem w pamięci; zegar aktywny; jedna wysyłka; reset na `pageshow.persisted`; Blob `application/json`; **ścieżka i podpis z serwera**, nie z `location`. Wpięcie `wp_enqueue_scripts` ze `strategy: defer`, pominięte dla `manage_options`. **Tu pomiar tempa** pod sufit limitera |
| **E3 — ekran** | `Aai_Monitor_Odczyt::ruch()`: odsłony, sesje, czas łączny i średni, top 10 ścieżek; okna dziś / 7 / 30 GET-em; bez nowych indeksów; ścieżki przez `esc_html` |
| **E4 — kontrola i prywatność** | `sprawdz` pyta o **obie** nazwy akcji przez `has_action` (nigdy po HTTP) i melduje drugą czujkę. Wpis o pomiarze ruchu i o `sessionStorage` do `Aai_Monitor_Prywatnosc` i `POLITYKA-PRYWATNOSCI.md` |
| **E5 — bramki** | Nowe reguły strażnika + mutacja na każdą; rozbudowa `smoke-wp-monitor` wg §6; higiena wizyt wzorem `dziennik.mjs` |
| **E6 — domknięcie** | CHANGELOG, README, `DIAGRAM.md`, `CLAUDE.md`, przegląd recenzentami-agentami, PR |

**Czego krok NIE dotyka:** Pluginów 1 i 2, dziennika logowań z T2,
blokowania botów i brute force (D6), referrera i kampanii (D4), testu
ręcznego (T4), `Aai_Sklep_Trasy::PODSTRONY` (D1).

---

## 6. Testy i przypadki brzegowe

Każde nowe sprawdzenie ma **test negatywny**, który trafia dokładnie
w swoje (reguła projektu — liczba padnięć musi się zgadzać z oczekiwaną).

| Co | Jak |
|---|---|
| N7 anonimowość | `DESCRIBE` wizyt: brak `ip`, `login`, `agent`, `user_id` |
| N8 admin nie liczony | HTML gościa ma `<script src=…pomiar.js>`, HTML admina nie |
| N9 + N10 (para) | rig z nadpisanym `webdriver` → wiersz **jest**; bez nadpisania → wiersza **nie ma** |
| N11 sito, siedem odrzutów | zła sesja · zły podpis · podmieniona ścieżka · obce `Origin` · `text/plain` · ciało 1025 B · **czas ponad sufit → wiersz ISTNIEJE z sufitem**. Każdy zły beacon poprawny **poza jednym polem**; blok otwiera i zamyka beacon kontrolny (BLAD-022) |
| N12 limiter | nadmiar odrzucony; skan `wp_options` **wzorcem IP**, nie adresem |
| N18 zalogowany | beacon z sesją `klient-test` → wiersz jest; zdjęcie samego `admin_post_` gasi go, a wariant gościa dalej działa |
| F18 | akcja tylko w ciele JSON → **200 i zero wierszy** |
| jedna odsłona = jeden wiersz | rig: nawigacja ze strony → dokładnie **1** wiersz, nie 2 |
| bfcache | rig: `history.back()` → **drugi** wiersz |
| moment wejścia | strona żyje X s przy aktywnym Y s → `wejscie ≈ teraz − X`, nie `teraz − Y` |
| strefa | `gmt_offset` przestawiony na czas testu i przywrócony: „dziś” liczy od północy lokalnej |
| bez `sessionStorage` | zablokowany magazyn → beacon dalej wychodzi |
| ucieczka | ścieżka ze znacznikiem `<script>` → na ekranie tekst, nie wykonanie |

**Przypadki brzegowe do obsłużenia w kodzie:** karta otwarta w tle (zegar
nie startuje) · prerender · odświeżenie strony (nowa odsłona, ta sama
sesja) · link w nowej karcie (sesja skopiowana — świadome) · wyłączony JS
(brak odsłony) · ścieżka dłuższa niż 191 znaków (przycięcie **przed**
podpisem) · polskie znaki w ścieżce (procent-kodowanie) · czas 0 ms ·
powtórzony beacon (replay) · przestawiony zegar klienta (nie ufamy —
liczy serwer) · awaria bazy (kanał błędów, `sprawdz` kod 1).

---

## 7. Ryzyka, które zostają otwarte

| Ryzyko | Dlaczego zostaje |
|---|---|
| **Odsłony zaniżone** o wyjścia bez beaconu | Wbudowane w „jeden beacon przy wyjściu” (A2) |
| **Zawyżenie realnych ścieżek przez replay** | Podpis dowodzi, że strona istnieje, nie że wizyta była; tłumi to wyłącznie miękki limiter |
| **`/wp-admin/` na produkcji** | Wtyczka bezpieczeństwa albo reguła hostingu może zamknąć katalog gościom; objawem będzie cisza, nie błąd (A6) |
| **Cudzy kod na `admin_init`** | Aktualizacja Woo albo Tutora może wprowadzić przekierowanie zabijające beacon |
| **`REMOTE_ADDR` za proxy** | Limiter kluczuje po adresie, którego na hostingu jeszcze nie znamy (P6 schematu) |
| **`sessionStorage` a ePrivacy** | Pozycja „przed pierwszym klientem”, wymaga prawnika — jak cała polityka prywatności (znalezisko T2) |
| **Miękki limiter** | Bez zewnętrznego cache’u transient nie ma atomowego przyrostu (F13); droga wyjścia przez tabelę opisana, niebudowana |

---

## 8. Definition of Done

1. `npm run check` kod 0; strażnicy **37/37**; audyt mutacyjny bez
   przeoczonych i bez martwych.
2. `smoke-wp-monitor` zielony z pełną listą z §6; **każde nowe sprawdzenie
   ma test negatywny trafiający dokładnie w swoje**.
3. Para N9 + N10 udowodniona na prawdziwej przeglądarce; N18 z testem
   negatywnym zdejmującym sam `admin_post_`.
4. `wp aai-monitor sprawdz` kod 0 i melduje **dwie** czujki;
   `postaw.sh` kod 0.
5. Pozostałe bramki WP bez regresji; `wp:sprawdz` 73/73 co do znaku,
   `wp:tutor` 0 różnic.
6. Środowisko po przebiegu bramek wraca do stanu sprzed — wizyty
   i dziennik rozliczone co do wiersza (N13).
7. Każda liczba w kodzie ma pomiar albo jawną etykietę kalibracji.
8. Przegląd recenzentami-agentami wykonany, każde znalezisko potwierdzone
   **uruchomieniowo przed** naprawą.
9. `DIAGRAM.md`, `CHANGELOG`, `README`, `CLAUDE.md` zgodne ze stanem.

---

## 9. Co wyszło DOPIERO przy wykonaniu

Audyt planu wyłapał sześć rzeczy przed kodem. Pisanie kodu wyłapało
kolejne — i to jest normalne: audyt czyta zamiar, kod zderza się
z rzeczywistością.

| # | Znalezisko | Kto je złapał |
|---|---|---|
| W1 | **Podawanie skryptu nie łapało `Throwable`**, choć biegnie przy renderze KAŻDEJ strony frontu, także kasy WooCommerce. Wyjątek stamtąd wywróciłby stronę, której monitoring się tylko przygląda | `straznik-monitora-wp` (reguła z T2) — nie recenzja i nie ja |
| W2 | **Reguła N1 zakazywała akcji `admin_post_` w CAŁEJ wtyczce**, bo powstała, gdy wtyczka nie miała żadnej. Wystrzał T3 z definicji taką wprowadza | strażnik przy pierwszym commicie kodu |
| W3 | **Strona 404 rozdawałaby podpisy na zmyślone ścieżki** — renderuje się dla dowolnego adresu, więc wystarczyłoby wejść na `/cokolwiek`, wziąć podpis ze źródła i zatruć nim „top 10 stron". Nie było tego w planie | ja, przy pisaniu `Aai_Monitor_Pomiar` |
| W4 | **Moje własne reguły strażnika pytały o OBECNOŚĆ NAPISU** (`application/json`, `admin-post.php?action=`), a nie o rozstrzygnięcie — szósty nawrót tej pułapki w projekcie | test negatywny z kontrprzykładem („napis zostaje, wymóg znika") |
| W5 | **Ekran drukował dosłowne `&quot;`** w dwóch miejscach, w tym w komunikacie z T1 — ta sama klasa co 29 podpisów w podglądzie kursów (0.34.0) | oględziny HTML-a po pierwszym renderze sekcji |
| W6 | **Reguła porównująca politykę zapalała się fałszywie**: porównywała tekst z cytatem blokowym, nie zdejmując `>` z początku linii | pierwszy przebieg tej reguły |

## 10. Pułapki POMIARU z tego kroku (wrócą)

1. **Pomiar oparty na złej nazwie zmiennej mierzy co innego, niż myślisz.**
   Sprawdzenie N8 użyło `WP_HASLO` zamiast `WP_ADMIN_HASLO`, więc
   logowanie się nie udało i mierzyłem gościa zamiast administratora —
   wynik wyglądał jak awaria kodu (4 trafienia zamiast 0).
2. **Surowy Firefox nie nawiguje w tej samej karcie z drugiej instancji**,
   a `SIGKILL` nie daje szansy na `pagehide`. Pierwszy przelot dał zero
   wierszy i wyglądał na martwy pomiar — kod był w porządku.
3. **Node trzyma połączenia keep-alive, Apache zrywa bezczynne.** Podczas
   kilkusekundowego przelotu przeglądarką zerwane połączenie wypływa jako
   nieobsłużony `SocketError: other side closed` i wygląda na awarię
   naszego endpointu. Pojedyncze i seryjne żądania przechodzą bez zarzutu.
4. **`goBack()` i `history.back()` w Firefoksie przez BiDi nie działają**:
   timeout 30 s, adres BEZ ZMIANY, a sesja zepsuta na tyle, że kolejna
   nawigacja też pada. Powrót z bfcache mierzymy podstawieniem stronie
   tego samego zdarzenia, które wysyła jej przeglądarka.
5. **Strona przywrócona z bfcache nie emituje `load`**, tylko `pageshow` —
   czekanie na `load` to czekanie na coś, co nigdy nie nadejdzie.
6. **Zmiana pliku PHP wymaga odczekania na `opcache`** (`revalidate_freq
   = 2`): pomiar zaraz po edycji mierzy POPRZEDNI stan kodu i wygląda jak
   „strażnik przepuścił mutację".

## 11. Stan po wykonaniu

| Bramka | Wynik |
|---|---|
| `straznik-monitora-wp` | **18 reguł** (było 13) |
| audyt mutacyjny | **273 mutacje** (było 265), wszystkie łapane |
| `smoke-wp-monitor` | **129 sprawdzeń** (było 76), wymaga `ZRZUTY_RIG` |
| testy negatywne bramki | 4, każdy trafia dokładnie w swoje |
| testy negatywne strażnika | 13, w tym 2 kontrprzykłady na wzorzec po napisie |

**Liczby wpisane do kodu, każda z pomiaru:** sufit ciała **1024 B**
(realny beacon 168 B, maksimum kontraktu 270 B), sufit beaconów **300/min**
(sterowana przeglądarka wyciska 294), indeksy **bez zmian** (pokrywające
dają 34 ms na ekranie, a kosztują zapis 2,9× droższy i 33 MB), sufit czasu
**4 h z przycinaniem**.
