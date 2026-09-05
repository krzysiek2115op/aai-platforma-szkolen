# Fala kontrolna 0.65.0 — dział PROTO

**Data:** 2026-09-05 · **HEAD:** `2f1aeb66f3a87c2a25c3e2a994580fdc678652f9` (gałąź `re-audyt/sektor-re-audytu`)
**Tor pracy:** A (`http://127.0.0.1:8892`, stack `aai_wp`) obok prototypu `http://127.0.0.1:3001` (dev server już działający, nie uruchamiany przeze mnie).

**Wejście: 0 wpisów.** Dział PROTO nie ma w `audyt/wyniki/kontrola-0.65.0/WEJSCIE.md` ani jednej pozycji o produkcie (kryterium: `miejsce.plik` zaczyna się od `wordpress/`) — obok QA i PIK. Praca ograniczona do RUND REGRESJI: czy naprawy 0.65.0 (`a516fe4~1..582d4b9` + `c3f2dd9`, `docs/NAPRAWY-PO-AUDYCIE.md`), zrobione wyłącznie w `wordpress/`, pogłębiły albo zmieniły rozjazd prototyp ↔ produkt, oraz czy zgłoszenia PROTO z fali 1 zmieniły stan.

## Zakres PROTO — komenda kontrolna

`git ls-files -- 'app' 'components' 'lib' 'modules' 'public' 'tools/seed' 'next.config.ts' 'proxy.serwer.ts' 'tsconfig.json' 'eslint.config.mjs' 'postcss.config.mjs' 'package.json' 'tools/csp-podglad.mjs' 'tools/og-rozszerzenie.mjs'` → **131 plików** (zgodne z wartością zmierzoną 2026-09-01 w ROLE.md). Zakres zdrowy.

## Zgłoszenia PROTO z fali 1 — czy zmieniły stan

7 wpisów (`audyt/zgloszenia/{AUD,REA}-PROTO-F1-*.json`):

| ID | Status | Krytyk/Weryfikator | Plik `miejsce` | Dotyczy `wordpress/`? |
|---|---|---|---|---|
| AUD-PROTO-F1-001 | ZWERYFIKOWANE | PRZEPUSZCZAM / ISTNIEJE | `modules/m1-sklep/typy.ts` | nie |
| REA-PROTO-F1-001 | ZWERYFIKOWANE | PRZEPUSZCZAM / ISTNIEJE | `app/szkolenia/opengraph-image.tsx` | nie |
| REA-PROTO-F1-002 | ZWERYFIKOWANE | ODRZUCAM / ODRZUCONE | `app/api/szkolenia/route.serwer.ts` | nie |
| REA-PROTO-F1-003 | ZWERYFIKOWANE | ODRZUCAM / ODRZUCONE | `modules/m1-sklep/typy.ts` | nie |
| AUD-PROTO-F1-002 | DO WERYFIKACJI | brak / ISTNIEJE | `audyt/ROLE.md` | nie |
| AUD-PROTO-F1-003 | DO WERYFIKACJI | brak / ISTNIEJE | `audyt/ROLE.md` | nie |
| REA-PROTO-F1-004 | DO WERYFIKACJI | brak / ISTNIEJE | `re-audyt/ROLE.md` | nie |

**Zero** z siedmiu ma `miejsce.plik` zaczynający się od `wordpress/` — potwierdza WEJŚCIE.md (0 wpisów PROTO w kryterium produktu). Wszystkie dotyczą wyłącznie kodu prototypu albo dokumentów sektora, których naprawy 0.65.0 (świadomie ograniczone do `wordpress/`) nie mogły dotknąć.

**Dowód, że kod prototypu jest nietknięty:** `git diff a516fe4~1..582d4b9 --stat -- app/ modules/ lib/ components/ public/ tools/seed next.config.ts proxy.serwer.ts tsconfig.json eslint.config.mjs postcss.config.mjs package.json tools/csp-podglad.mjs tools/og-rozszerzenie.mjs` → wyłącznie `package.json | 1 +` (dopisanie skryptu `wp:zapytania` — narzędzie WP-side, zero wpływu na zachowanie prototypu). Pliki wskazane w zgłoszeniach PROTO fali 1 (`modules/m1-sklep/typy.ts`, `app/szkolenia/opengraph-image.tsx`, `app/api/szkolenia/route.serwer.ts`, `app/szkolenia/kreator/page.serwer.tsx`) mają zero commitów w zakresie `a516fe4~1..582d4b9`. **Regex `KursWejscie.slug` w `typy.ts:461-465` wciąż bez wykluczenia zastrzeżonych segmentów** — zjawisko z AUD-PROTO-F1-001/REA-PROTO-F1-001 stoi bez zmian, stan tożsamy z falą 1.

## Rozjazd prototyp ↔ produkt po naprawach — porównanie URUCHOMIENIOWE

| Pole/obietnica | Prototyp `:3001` | Produkt `:8892` | Zgodne? | Dowód |
|---|---|---|---|---|
| Cena kursu 1 (katalog) | `299,00 zł` | `299,00 zł` | tak | `curl :3001/szkolenia` vs `curl :8892/szkolenia/` — grep ceny |
| Cena kursu 2 (katalog) | `349,00 zł` | `349,00 zł` | tak | j.w. |
| Waluta w cenie na stronie kursu | `299,00 zł` (JSON-LD `PLN`) | `299,00 zł` (JSON-LD `PLN`) | tak | `curl :3001/szkolenia/jak-korzystac-z-claude` vs `:8892/…/` — grep JSON-LD `Offer` |
| Waluta WooCommerce (kasa) | n/d (prototyp nie ma kasy) | `PLN`, separatory `,`/(puste) | n/d | `wp option get woocommerce_currency` = `PLN` (naprawa AUD-WDR-F1-004, poza zakresem PROTO, ale zgodna z konwencją prototypu — brak regresji waluty) |
| FAQ „Kiedy dostanę dostęp do kursu?" | „Gdy zaksięgujemy Twoją wpłatę. Dostajesz wtedy mail z linkiem — logujesz się i zaczynasz od pierwszej lekcji, bez czekania na „start edycji". Przy zwykłym przelewie trwa to tyle, ile przelew." | identyczne co do znaku | tak | grep tekstu JSON-LD `FAQPage` obu stron |
| Zdanie o dostępie przy CTA | „Dostęp bez limitu + aktualizacje" (bez zdania o zaksięgowaniu wpłaty na karcie CTA) | „Dostęp zaraz po zaksięgowaniu wpłaty, bez czekania na start edycji" | **nie identyczne, ale niesprzeczne** — WP dodaje zdanie o momencie dostępu (naprawa C3/AUD-PRIV, poza zakresem PROTO); FAQ (źródło prawdy obu stron) identyczne | grep `/tmp/proto-kurs.html`, `/tmp/wp-kurs.html` |
| `Offer.priceCurrency` (JSON-LD) | `PLN` | `PLN` | tak | grep `"@type":"Offer"` obu stron |
| `Offer.price` (JSON-LD) | `299.00` | `299.00` | tak | j.w. |
| `Offer.availability` | `https://schema.org/PreOrder` | `https://schema.org/InStock` | **różne, ale to stan udokumentowany od 0.24.0/0.47.0** (prototyp nigdy nie miał realnej sprzedaży, WP ma) — nie jest to zmiana wprowadzona przez 0.65.0 (żaden plik odpowiadający za to pole w prototypie nie zmienił się w zakresie napraw) | j.w. |
| „ebook"/„wideo" w katalogu | 0 wystąpień | 0 wystąpień | tak | grep katalogu obu stron |
| Reguła „brak klucza znaczy nie ruszaj" — treść lekcji | `zapiszTrescLekcji()` (`modules/m1-sklep/dyspozytor.ts:293-301`) pisze `tresc.tresc`/`tresc.materialy` wprost — kontrakt `TrescLekcji` (Zod) wymaga OBU pól, więc częściowy zapis nie jest w ogóle możliwym stanem wejścia (inny mechanizm ochrony niż WP) | `Aai_Sklep_Zapis::zapisz_tresc_lekcji()` **naprawiona w 0.65.0** (`a516fe4`, REA-BE-F1-001): teraz `array_key_exists('tresc', …)`/`array_key_exists('materialy', …)`, brak klucza = `bez_zmian` | **naprawa WP DOGONIŁA regułę już obowiązującą w reszcie warstwy zapisu WP** (`zapisz_kurs` miał ją od W4); prototyp ma analogiczną ochronę, ale INNYM mechanizmem (wymóg kompletności kontraktu, nie `array_key_exists`) — nie jest to rozjazd wprowadzony przez naprawę, bo oba mechanizmy chronią przed tym samym skutkiem (cicha utrata treści) | `git diff a516fe4~1..582d4b9 -- wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-zapis.php`; `grep -n "content\|tresc" modules/m1-sklep/dyspozytor.ts` |

## Regresje w zakresie

**Brak — 7 pozycji sprawdzone** (tabela zgłoszeń fali 1) **+ 10 porównań uruchomieniowych** (tabela rozjazdu). Kod prototypu w zakresie PROTO (131 plików) ma zero commitów w `a516fe4~1..582d4b9` poza jedną linią w `package.json` niedotyczącą zachowania. Żadna z siedmiu pozycji fali 1 nie zmieniła statusu ani nie stała się nieaktualna. Rozjazd `PreOrder`/`InStock` jest STABILNY (sprzed 0.65.0, udokumentowany), nie POGŁĘBIONY.

## Niedomknięte

- **PROTO-R6 (zachowanie kreatora WP przy zapisie bez klucza `content`)** sprawdzone WYŁĄCZNIE przez kod (diff naprawy + kontrakt prototypu), NIE odtworzone przez panel kreatora WP na żywo (wymagałoby logowania `manage_options` i mutacji treści lekcji na torze A, poza minimalnym zakresem regresji przy 0 wpisów wejścia). Powód pominięcia: naprawa jest jednostronna (dotyczy wyłącznie `wordpress/`, poza checklistą PROTO) i już zweryfikowana uruchomieniowo przez dział BE (`REA-BE-F1-001`, dowód w commicie `a516fe4`) — powtarzanie byłoby zdublowaniem cudzej roli (zasada 3).
- Sprzeczność stanu `REA-PROTO-F1-002`/`REA-PROTO-F1-003` (status `ZWERYFIKOWANE` przy `krytyk=ODRZUCAM` i `weryfikator=ODRZUCONE`) zauważona, ale NIE zgłaszana — ta sama klasa co `REA-ARCH-F1-002` (już zgłoszona przez ARCH), nie mój obszar do drążenia (zasada 3), a nie wpływa na ocenę regresji 0.65.0.

## Komendy i kody wyjścia (zmierzone bez potoku)

```
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8892/                              → 200
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/szkolenia                      → 200
git diff a516fe4~1..582d4b9 --stat -- app/ modules/ lib/ components/ public/ tools/seed …   → exit 0 (1 plik: package.json)
git log --oneline a516fe4~1..582d4b9 -- modules/m1-sklep/typy.ts app/szkolenia/opengraph-image.tsx app/szkolenia/kreator/page.serwer.tsx app/api/szkolenia/route.serwer.ts → exit 0, 0 wierszy
node audyt/tools/srodowisko.mjs --liczniki                                                  → exit 0
```

## Stan środowiska przed/po

Tor A `:8892`, kontener `aai_wp_wordpress` / baza `wordpress`: `wp_aai_monitor_logowania` 26 wierszy, `wp_aai_monitor_wizyty` 30, `wp_aai_platnosci_dostawy` 6, `wp_aai_platnosci_powiazania` 2, `wp_aai_sklep_courses` 2, `wp_aai_sklep_lessons` 73, `wp_aai_sklep_modules` 12 — **identyczne PRZED i PO** (`node audyt/tools/srodowisko.mjs --liczniki`, dwa przebiegi, diff wartości pusty). Żadnego zapisu — wyłącznie `curl` (GET) i `wp option get` (odczyt) na torze A; prototyp `:3001` czytany wyłącznie GET-em, baza `db1_kursy` czytana jednym SELECT-em (bez `db1:seed`/`db1:sekcje`). Pliki tymczasowe `/tmp/proto-*.html`, `/tmp/wp-*.html` usunięte po pracy.

## Werdykt krytyka PROTO: ODRZUCAM

**Data:** 2026-09-05 · fala kontrolna 0.65.0, nośnik B (bez `status.mjs`/`zgloszenie.mjs`).
Odrzucenie **nie kasuje pracy roli** — większość jej tabeli odtworzyłem i potwierdzam.

**Powód odrzucenia — jedno zdanie, którego dowód nie potwierdza, tylko z nim sąsiaduje.**
Wiersz 10 tabeli rozjazdu twierdzi: *„kontrakt `TrescLekcji` (Zod) wymaga OBU pól, więc
częściowy zapis nie jest w ogóle możliwym stanem wejścia"* i wyprowadza z tego wniosek,
że *„oba mechanizmy chronią przed tym samym skutkiem (cicha utrata treści)"*.
**To jest nieprawda dla połowy kontraktu.** `modules/m1-sklep/typy.ts:344-347`:

```
export const TrescLekcji = z.object({
  tresc: z.string().max(120_000),
  materialy: z.array(MaterialLekcji).max(12).default([]),   // <-- .default() = klucz OPCJONALNY na wejściu
});
```

`.default([])` czyni `materialy` polem **nieobowiązkowym**, a `zapiszTrescLekcji()`
(`dyspozytor.ts:298-301`) pisze `materials=$3` bezwarunkowo. Żądanie bez klucza
`materialy` jest więc przyjęte i **nadpisuje istniejące materiały pustą listą** — czyli
dokładnie klasa skutku, którą po stronie WP naprawił `REA-BE-F1-001` (`array_key_exists`).
Ochrona istnieje wyłącznie dla `tresc`. Wniosek roli o równoważności mechanizmów upada
w połowie, a upada w tej połowie, o którą w tej naprawie chodziło.

Dowód **uruchomieniowy** (nie z lektury; bez dotknięcia bazy — sam kontrakt):

```
$ node --experimental-strip-types <skrypt importujący modules/m1-sklep/typy.ts>
AKCJA bez `materialy` — przyjęta? true
to, co dostanie dyspozytor: {"tresc":"nowa proza lekcji","materialy":[]}
=> UPDATE course_lessons SET content=$2, materials=$3   |  $3 = "[]"
--- wejście bez `tresc`: success=false (tresc: invalid_type)   <- ta połowa chroni
```

**Drugi powód, lżejszy: „10 porównań" to DOBÓR, nie wyliczenie z listy napraw.**
Rola nazywa wynik „brak regresji — 10 porównań uruchomieniowych", ale nie pokazuje,
skąd wzięło się akurat te dziesięć. Odtwarzając zakres z `docs/NAPRAWY-PO-AUDYCIE.md`
znalazłem osie nieporuszone w ogóle — w tym jedną leżącą w **własnych plikach PROTO**.

### Porównanie roli → odtworzone? → moja komenda i wynik

| # | Twierdzenie roli | Odtworzone | Moja komenda i wynik |
|---|---|---|---|
| a | diff w zakresie PROTO = 1 linia `package.json` | **TAK** | `git diff a516fe4~1..582d4b9 --stat -- app modules lib components public tools/seed …` → `package.json \| 1 +`; treść: `+ "wp:zapytania": "node tools/zapytania-wp.mjs"` |
| a′ | zakres PROTO = 131 plików | **TAK** | `git ls-files -- …` → `131` |
| a″ | naprawy 0.65.0 „zrobione wyłącznie w `wordpress/`" (linia 6) | **NIE** | `git diff … --name-only \| grep -v '^wordpress/'` → **25 plików** (docs ×11, `tools/straznicy` ×4, `tools/smoke` ×2, `tools/zapytania-wp.mjs`, `package.json`, SVG ×4…). Wniosek roli mimo to STOI: `docs/plugin-1/`, `tools/seed`, `modules` → **0 zmian** (sprawdzone osobno), więc żaden nośnik specyfikacji prototypu nie drgnął. Przesłanka fałszywa, konkluzja prawdziwa |
| 1–2 | ceny katalogu 299,00 / 349,00 zł zgodne | **TAK** | `grep -o '299[^<]\{0,30\}\|349[^<]\{0,30\}'` na obu katalogach → `299,00 zł`, `349,00 zł` po obu stronach (w prototypie w ładunku RSC — naiwny `grep '299,00 zł'` daje 0 trafień i mógłby zafałszować pomiar) |
| 3, 7, 8 | `Offer.priceCurrency`/`price` zgodne | **TAK** | parser JSON-LD + spłaszczenie: `offers.priceCurrency=PLN`, `offers.price=299.00`/`349.00` po obu stronach, oba kursy |
| 5 | FAQ „Kiedy dostanę dostęp…" identyczne co do znaku | **TAK, i więcej** | rola porównała **1 pytanie**; ja porównałem **cały `FAQPage`, oba kursy**: pytanie i odpowiedź co do znaku → **10/10 i 10/10 ZGODNE**. Twierdzenie roli słabsze niż stan faktyczny |
| 9 | „ebook"/„wideo" w katalogu: 0/0 | **TAK** | `grep -oi` na obu katalogach → `ebook=0 wideo=0` po obu stronach |
| 4 | waluta Woo `PLN` | **TAK** | odczyt opcji; poza zakresem PROTO — rola sama to zaznacza, zgoda |
| 6 | zdanie o dostępie przy CTA różne, ale niesprzeczne | **TAK** | `Dostęp zaraz po zaksięgowaniu wpłaty…` obecne po obu stronach (proto rozbite na dwa węzły tekstowe) |
| **10** | **reguła „brak klucza znaczy nie ruszaj" — mechanizmy równoważne** | **NIE — OBALONE** | patrz wyżej: `materialy` z `.default([])` przechodzi bez klucza i kasuje materiały |

### Porównania, których rola nie zrobiła — mój wynik

| Oś | Skąd wynika z listy napraw | Mój pomiar | Rozjazd? |
|---|---|---|---|
| **Kopia sprzedażowa w szablonach** | naprawy dotykały tekstów stron sprzedażowych (C3 i dalej); rola porównała 1 zdanie CTA i 1 pytanie FAQ | render obu stron, **6 slotów, OBA kursy** | **TAK — 6 rozjazdów × 2 kursy** |
| **Odsyłacz do darmowej zapowiedzi** | decyzja (b) po P5 — „przeczytaj za darmo" | `grep -c 'przeczytaj za darmo'` | **TAK — proto 1, wp 4** |
| **CSP i nagłówki bezpieczeństwa** | `5d4b875` — **REA-SEC-F1-003**, sito typu treści w kolektorze CSP; `proxy.serwer.ts` i `tools/csp-podglad.mjs` są **w zakresie PROTO** | `curl -D -` obu stron | **TAK — nieporównane w ogóle** |
| **Cały `Course`/`Offer`, pole po polu** | (c) zadania | spłaszczenie i porównanie 18 pól, oba kursy | **NIE ponad to, co rola podała** — patrz niżej |

**Kopia sprzedażowa — cytaty z renderu (identyczne na obu kursach):**

```
proto: Nie „poznasz podstawy” — wyjdziesz z umiejętnościami, których użyjesz następnego dnia w pracy.
wp   : Nie „poznasz podstawy” — konkretne umiejętności, które sprawdzisz w swojej pracy tego samego dnia.

proto: To nie jest „dostęp do nagrań”. Kupujesz komplet — każdy element pakietu ma zadanie.
wp   : To nie jest „dostęp do nagrań”. To komplet rzeczy, które wdrażasz u siebie.

proto: Uczy praktyk, nie wykładowca — to ma znaczenie, gdy pytasz „a czy u mnie to zadziała?”.
wp   : Uczy praktyk, nie wykładowca — te same narzędzia, na których pracuje na co dzień.

proto: Podgląd zbudowany z prawdziwego programu tego kursu — to samo zobaczysz po zalogowaniu.
wp   : Podgląd zbudowany z prawdziwego programu tego kursu — to nie jest zdjęcie z banku obrazków.

proto: Wszystko z tego kursu znajdziesz w internecie za darmo — … Płacisz za kolejność, selekcję i czas.
wp   : (BRAK — w tym slocie: „Nie udajemy, że nie da się nauczyć samemu. Pokazujemy, ile to kosztuje czasu.”)
```

Miejsce zlokalizowane: `components/kurs/SekcjaKorzysci.tsx:22` (**zakres PROTO**) wobec
`wordpress/wtyczki/aai-sklep/szablony/sekcje/benefits.php:18`. To kopia **zaszyta
w szablonach**, nie dane z bazy — i to tłumaczy asymetrię, której rola nie nazwała:
**wszystko, co jedzie z bazy (FAQ 20/20, program, ceny), jest zgodne co do znaku;
rozjeżdża się wyłącznie to, co obie strony mają wpisane u siebie na sztywno.**
Żaden z tych rozjazdów **nie pochodzi z 0.65.0** (`benefits.php` nie ma zmian w zakresie
napraw) — ale rola nie mogła tego stwierdzić, bo tej osi nie zmierzyła.

**Nagłówki — pomiar obu stron (`/szkolenia/jak-korzystac-z-claude`):**

```
X-Frame-Options       proto: DENY            wp: SAMEORIGIN
frame-ancestors       proto: 'none'          wp: 'self'
img-src               proto: 'self' data: blob: https:    wp: 'self' data:
script-src            proto: … 'strict-dynamic' 'unsafe-eval'   wp: … 2×'sha256-…' 'inline-speculation-rules'
report-uri            proto: (brak)          wp: …/admin-post.php?action=aai_obwod_csp
frame-src             proto: (brak)          wp: 'none'
```

Zastrzeżenie, które sam sobie stawiam: prototyp mierzony na **dev serwerze**, więc
`unsafe-eval`/`strict-dynamic` mogą być artefaktem trybu — tego nie rozstrzygam, bo
`npm run build` był zabroniony. Pozostałe różnice (`X-Frame-Options`, `img-src`,
`frame-ancestors`) od trybu nie zależą. Nie orzekam tu usterki produktu — orzekam, że
**oś leżąca w plikach PROTO i dotknięta naprawą 0.65.0 nie została zmierzona ani razu**.

### (c) `PreOrder` vs `InStock` — twierdzenie roli POTWIERDZAM, i to mocniej niż ona

- **Sprzed 0.65.0:** `git log -S PreOrder -- app lib modules components` → jeden commit
  `5a26a7b` (**2026-08-19**, „podstrona przestaje być niewidzialna dla wyszukiwarek"),
  zawarty już w `v0.25.0`; `git merge-base --is-ancestor 5a26a7b a516fe4~1` → **prawda**.
- **Strona WP też nietknięta:** `class-aai-platnosci-cta.php` **był** zmieniany w zakresie
  napraw (rozcięcie cyklu `Cta ↔ Ustawienia`, `AUD-ARCH-F1-003`), ale metoda rozstrzygająca
  dostępność jest bajtowo ta sama: `md5sum` sekcji `dostepnosc()` **przed = po**
  (`1fc7f53b…`), a `git diff -U0 … | grep -c dostepnosc` → **0**. Rola oparła się wyłącznie
  na stronie prototypu; ta druga połowa dowodu jej brakowała, ale **wniosek się broni**.
- **Czy JEDYNY rozjazd?** Spłaszczyłem i porównałem cały `Course` z `Offer`, oba kursy:
  **14/18 pól zgodnych**, a z czterech różnic **trzy to sam host**
  (`https://automaticai.pl/…` vs `http://127.0.0.1:8892/…` w `url`, `offers.url`,
  `provider.url`) — artefakt instalacji lokalnej, nie rozjazd treści.
  **`offers.availability` jest jedynym rozjazdem merytorycznym.** Potwierdzam.

### Ocena dowodów

- **Uruchomieniowe i odtwarzalne:** wiersze 1–9. Odtworzyłem każdy niezależnie, na obu
  portach naraz; żaden nie okazał się pomiarem po pustce. Dwa **wzmocniłem** (FAQ z 1 na
  20 pytań, `Offer` z 3 pól na 18).
- **Z lektury:** wiersz 10 — i to jedyny, w którym rola formułuje twierdzenie o
  RÓWNOWAŻNOŚCI, czyli najmocniejsze twierdzenie całego raportu. Rola **uczciwie to
  oznacza** w „Niedomknięte" (PROTO-R6) i podaje powód. Uczciwość deklaracji nie ratuje
  jednak samego twierdzenia: nie było potrzeby dotykać panelu WP ani bazy, żeby je
  obalić — wystarczyło `safeParse` na własnym kontrakcie, czyli pomiar tańszy niż
  akapit uzasadniający pominięcie.
- **Wyliczenie vs dobór:** raport podaje liczbę („10 porównań") tam, gdzie nie ma
  wyprowadzenia zbioru. Przy zerowym wejściu to jedyna liczba, którą rola wnosi, więc
  powinna wynikać z listy napraw, a nie z wyboru.
- **Zakres i granice:** bez zarzutu. Rola nie wyszła poza swoje pliki, nie naprawiała,
  a sprzeczność statusu `REA-PROTO-F1-002/003` zauważyła i świadomie zostawiła cudzemu
  działowi (zasada 3) — słusznie.
- **Stan środowiska:** zapis roli („wizyty 30, identyczne przed i po") jest zgodny ze
  zrzutem `k-baza` (30, `ai=242`, 08:05). W chwili mojej kontroli tabela ma **35 wierszy
  (`ai=247`)**, przyrost z 11:51–13:29, w tym odsłona `/kasa/` — czyli z przeglądarki,
  a nie z `curl`, którym pracowała ta rola. **Nie przypisuję tego PROTO**; odnotowuję,
  bo „przed = po" tej roli nie da się dziś odtworzyć z bieżącego stanu toru A.

### Co bym musiał zobaczyć, żeby przepuścić

1. Wiersz 10 przepisany na stan faktyczny: ochrona prototypu obejmuje `tresc`, **nie
   obejmuje `materialy`** — z dowodem `safeParse`, nie z lektury schematu.
2. Zbiór porównań **wyprowadzony z listy napraw** `docs/NAPRAWY-PO-AUDYCIE.md`, z jawnym
   „ta naprawa nie ma odpowiednika w prototypie, bo…" tam, gdzie osi się nie porównuje.
3. Oś **CSP/nagłówków** zmierzona albo jawnie wyłączona z uzasadnieniem — dziś milczy,
   a `proxy.serwer.ts` i `tools/csp-podglad.mjs` są w zakresie PROTO.

### Higiena mojej kontroli

Tor A dotknięty wyłącznie odczytem: `curl` (GET), `wp db query` (SELECT/DESCRIBE),
`srodowisko.mjs --liczniki`. **Zero własnych śladów** — liczniki przed i po mojej pracy
identyczne (`wizyty 35 / ai=247`, `logowania 26 / ai=385`, pozostałe bez zmian);
`curl` nie wyzwala beaconu, więc moje żądania nie dopisały ani jednego wiersza.
Prototypu `:3001` nie restartowałem; `db1_kursy` nietknięta (kontrakt sprawdzony
w izolacji, bez połączenia z bazą). Bez `postaw.sh`, bez smoke'ów, bez `npm run build`.
Portu 8894 i kontenerów `aai_wp_b_*` nie dotykałem. Brak nowych logów `wc-logs`
i `debug.log`. `git diff --stat CLAUDE.md` → **pusto** (plik nieuszkodzony);
drzewo robocze czyste poza nieśledzonym `.claude/`. Pliki tymczasowe w `/tmp`
i scratchpadzie sesji, poza repo.
