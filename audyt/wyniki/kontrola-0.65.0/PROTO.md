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
