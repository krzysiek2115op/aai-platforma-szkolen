# Fala kontrolna 0.65.0 — dział QA

**Data:** 2026-09-05 · **HEAD:** `2f1aeb66f3a87c2a25c3e2a994580fdc678652f9` (gałąź `re-audyt/sektor-re-audytu`)
**Tor pracy:** A (`http://127.0.0.1:8892`, stack `aai_wp`), sam na obu torach zgodnie z decyzją orkiestracji z `PRZEBIEG.md` (11:30) — role mutujące pliki na dysku nie dzielą czasu z rolami mierzącymi na żywo.

**Wejście: 0 wpisów** w `audyt/wyniki/kontrola-0.65.0/WEJSCIE.md` dla działu QA (dział bez ani jednego wpisu o produkcie — obok PROTO i PIK). Praca ograniczona do RUND REGRESJI w zakresie QA: czy bramki (reguły strażników i asercje smoke'ów) DOŁOŻONE albo ZMIENIONE naprawami 0.65.0 (`a516fe4…582d4b9` + `c3f2dd9`, `docs/NAPRAWY-PO-AUDYCIE.md`) mierzą to, co obiecują — psuję przedmiot bramki i patrzę, czy zapala się, i czy z WŁAŚCIWEGO powodu.

**Zgłoszenia QA z fali 1** (`audyt/zgloszenia/AUD-QA-F1-*`, `REA-QA-F1-*`, 13 wpisów): sprawdzone — wszystkie dotyczą prototypu Next.js/tooling (`tools/smoke/smoke-d4.ts` itd., `audyt-straznikow.mjs` jako narzędzie, `audyt/role/QA/AGENT.md`, `re-audyt/ROLE.md`), zero wpisów z `miejsce.plik` zaczynającym się od `wordpress/`. Naprawy 0.65.0 dotyczą wyłącznie `wordpress/`, więc **żadne zgłoszenie QA z fali 1 nie mogło zostać pogłębione ani unieważnione** przez tę partię napraw — potwierdzone `grep` po polu `miejsce.plik` we wszystkich 13 plikach.

## Zakres zmierzony (diff a516fe4~1..582d4b9 + c3f2dd9, ścieżki tools/straznicy, tools/smoke)

```
tools/smoke/smoke-wp-monitor.mjs          | 130 ++++++++++++----
tools/smoke/smoke-wp-zakup.mjs            |  63 ++++++++
tools/smoke/smoke-wp-zwroty.mjs           |  16 ++  (commit c3f2dd9, higiena)
tools/straznicy/audyt-straznikow.mjs      | 167 ++++++++++++++++++--
tools/straznicy/straznik-monitora-wp.mjs  |  73 +++++++--
tools/straznicy/straznik-platnosci-wp.mjs | 250 +++++++++++++++++++++++++-----
tools/straznicy/straznik-tutora.mjs       |  55 ++++++-
```
`straznik-obietnic.mjs`, `straznik-goldenu-tresci.mjs` i inne pliki z zgłoszeń QA-F1 — diff pusty w tym zakresie commitów (poza mojego przedmiotu, bez regresji do zgłoszenia).

## Tabela: reguła/asercja z 0.65.0 → mutacja → zapaliła się? → z właściwego powodu? → kod wyjścia → przywrócone?

Wszystkie mutacje niżej wykonane RĘCZNIE (bez korzystania z `audyt-straznikow.mjs`, żeby dowód był niezależny od narzędzia, które sam testuję), na kopii zrobionej PRZED pierwszą mutacją, z przywróceniem `cp` (nigdy `git checkout --`, bo plik miał ślad w `git status` dopiero PO mojej mutacji). Kody wyjścia mierzone bez potoku (`echo "kod=$?"` bezpośrednio po komendzie).

| # | Reguła/asercja (plik) | Mutacja | Zapaliła się? | Z właściwego powodu? | Kod | Przywrócone (diff puste)? |
|---|---|---|---|---|---|---|
| 1 | `straznik-monitora-wp` reguła 15c (AUD-ARCH-F1-001: żaden plik wtyczki nie pisze surowym SQL do tabeli rdzenia) | wstrzyknięcie `$wpdb->query("DELETE FROM {$wpdb->posts}...")` do `class-aai-monitor-logowania.php` — plik i tabela INNE niż w mutacji wbudowanej w `audyt-straznikow.mjs` (tamta testuje tylko `podpis.php`+`options`) | TAK | TAK — komunikat nazwał dokładnie plik, `DELETE FROM $wpdb->posts` i `AUD-ARCH-F1-001` | 1 | TAK |
| 2 | `straznik-platnosci-wp` reguła 43, zamek 0 (priorytet haka `zamowienie_znika` musi być < 10) | zmiana `1, 2` → `15, 2` w `add_action('woocommerce_before_delete_order', …)` | TAK | TAK — komunikat cytuje „priorytecie 15" i wyjaśnia kolizję z `WC_Post_Data::before_delete_order` na 10 | 1 | TAK |
| 3 | `straznik-platnosci-wp` reguła 16 (decyzja „mam kurs" musi pytać `is_enrolled(...,true)`, zapis UKOŃCZONY) | `class-aai-platnosci-posiadanie.php`: `true` → `false` w wywołaniu `is_enrolled` | TAK | TAK — komunikat: „zapada bez pytania Tutora o ZAPIS (is_enrolled)" | 1 | TAK |
| 4 | `straznik-tutora` (REA-BD-F1-001: idempotencja kopii — wstawienie MUSI być w gałęzi „nie znaleziono po uuid") | `class-aai-sklep-tutor.php`: `$istniejacy = self::znajdz_po_uuid(...)` → `$istniejacy = 0` | TAK | TAK — komunikat: „wpis Tutora powstaje BEZ WARUNKU… REA-BD-F1-001" | 1 | TAK |
| 5 | `straznik-platnosci-wp` reguła 44 (do cudzej księgowości tylko przez API, gałąź regexu na SUROWY SQL string, nie `$wpdb->delete()`) | `dostarczanie.php`: `$ksiegowosc->delete_earning_by_order(...)` → `$wpdb->query("DELETE FROM {$wpdb->prefix}tutor_earnings WHERE order_id={$id_zamowienia}")` | TAK | TAK — DWIE reguły trafnie: 43 (brak wywołania `delete_earning_by_order`) i 44 („pisze surowo do cudzej tabeli (tutor_earnings)") | 1 | TAK |
| 6 | `straznik-platnosci-wp` reguła 45 (kontrola liczy sieroty, NIE kasuje) | wstrzyknięcie `$wpdb->query("DELETE FROM test_tabela")` do wnętrza `sieroty_po_zamowieniach()` w `class-aai-platnosci-cli.php` | TAK | TAK — komunikat: „metoda licząca sieroty… TAKŻE KASUJE. Kontrola nie pisze (L11)" | 1 | TAK |
| 7 | `straznik-monitora-wp` (A7, warstwa zapisu `ustawienie_utworz` musi być pusta przy konflikcie) | `class-aai-monitor-zapis.php`: `ON DUPLICATE KEY UPDATE `klucz`=`klucz`` → `` `wartosc` = VALUES(`wartosc`) `` | TAK | TAK — komunikat cytuje dokładnie oczekiwaną i otrzymaną formę SQL, powołuje się na A7 | 1 | TAK |
| 8 | `smoke-wp-zwroty` higiena (c3f2dd9: bramka sprząta WŁASNE ślady w cudzych tabelach po zamówieniu mieszanym) | funkcjonalna: **dwa przebiegi z rzędu na żywej instalacji** (nie mutacja kodu — weryfikacja, że fix trzyma się w praktyce, tak jak jego własny opis w commicie) | n/d (test regresji, nie mutacja) | TAK — oba przebiegi 39/39, kontrola `aai-platnosci sprawdz` kod 0 PO KAŻDYM z nich (przed naprawą doc. 1/39 czerwone i 5 sierot na drugim przebiegu) | 0/0 | n/d (bramka sama sprząta) |
| 9 | `smoke-wp-monitor` sekcje A1 (druga połowa: wzorzec ataku ma przetrwać maskowanie) i A7 (10c9/10c9b/10c9c: sól w NASZEJ tabeli, migracja-fallback, rozjazd = kod 1) | funkcjonalne: pełny przebieg na żywej instalacji (181 asercji, w tym cała nowa sekcja z diffu) | n/d (asercje wbudowane w bramkę) | TAK — 181/181 po naprawieniu niezwiązanego z kodem rozjazdu hasła `klient-test` (patrz „Niedomknięte/uwaga środowiskowa" niżej); PRZED naprawą hasła 6/180 czerwonych, ale WSZYSTKIE nowe asercje 0.65.0 (A1/A7/migracja/rozjazd) były w tej szóstce NIEOBECNE — czyli już wtedy zielone | 0 (po synchronizacji hasła) | n/d |
| 10 | `smoke-wp-zakup` sekcja REA-INT-F1-003 (skasowane zamówienie sprząta WŁASNĄ księgowość, cudza nietknięta) | funkcjonalne: pełny przebieg na żywej instalacji | n/d | TAK — 58/58, w tym anty-ślepota „przed kasowaniem oba muszą MIEĆ ślady" | 0 | n/d |

**Uwaga o mutacji nr 5 i nr 6 (rzetelność dowodu):** mutacja nr 5 zapaliła DWIE reguły naraz (43 i 44), bo usunięcie wywołania `delete_earning_by_order(` jest jednocześnie „brakiem sprzątania" (43) i „obejściem przez surowy SQL" (44) — to nie osłabia dowodu: obie reguły podały PRAWDZIWY i SPECYFICZNY dla siebie komunikat, nie ten sam tekst kopiowany.

## Regresje w zakresie

**Brak — 10 pozycji sprawdzonych** (tabela wyżej) **+ dodatkowa kontrola pokrycia mutacyjnego całego zakresu**:

- **QA-R1** (czy ZWERYFIKOWANE zgłoszenia audytu tego obszaru dają się odtworzyć uruchomieniowo) — nie dotyczy: dział QA ma 0 wpisów produktowych w tej fali (WEJŚCIE.md), więc nie ma czego odtwarzać w tej pozycji; zamiast tego wykonałem QA-90 (patrz niżej) na naprawach.
- **QA-R2** (ile jest wszystkich wystąpień klasy w repo) — sprawdzone dla reguły 15c/44 (pisanie surowym SQL do cudzych tabel): `grep -rlnE "(INSERT INTO|UPDATE|DELETE FROM|REPLACE INTO)\s*.?\{?\\\$wpdb->(options|posts|postmeta|users|usermeta|comments|commentmeta|terms|termmeta|term_taxonomy|term_relationships|prefix\s*\.\s*['\"]tutor_)" wordpress/wtyczki --include="*.php"` na **czystym** drzewie (po przywróceniu moich mutacji) → **0 trafień w całym repo** — obie reguły dziś nie łapią żadnego prawdziwego naruszenia, bo go nie ma; potwierdza to, że mutacje wyżej testowały regułę na SZTUCZNIE wstrzykniętym materiale, nie na przypadkowo znalezionym prawdziwym.
- **QA-R3** (czy klasyfikacja/wpływ utrzymują się przy pełnym zasięgu) — reguła 15c przeszukuje `kodWtyczki` (CAŁA wtyczka `aai-monitor`, nie tylko `podpis.php`) — potwierdzone mutacją nr 1 na INNYM pliku niż ten, który reguła miała na myśli pierwotnie (AUD-ARCH-F1-001 dotyczył `podpis.php`) — zasięg jest **szerszy niż samo zgłoszenie**, zgodnie z deklaracją w komentarzu kodu.
- **QA-R4/R5** (klasy innych działów w tym obszarze / mechanizm bez zgłoszenia) — sprawdziłem pokrycie mutacyjne CAŁEGO zakresu commitów 0.65.0 w `audyt-straznikow.mjs`: `git diff a516fe4~1..582d4b9 -- tools/straznicy/straznik-{monitora-wp,platnosci-wp,tutora}.mjs` wprowadził **10 nowych/zmienionych wymagań reguł** (15b×3, 15c, 16-nowa-gałąź, 20-przeniesiona, 43, 44, 45, REA-BD-F1-001); w `audyt-straznikow.mjs` dla tego samego zakresu jest **12 wpisów mutacji** (policzone `grep -c` po unikalnych `opis:` dodanych w diffie) — więcej mutacji niż reguł, bo część reguł ma osobne mutacje na obie swoje połówki (np. 15b ma trzy: nadpisanie, zapis do core, brak odczytu z bazy). **Nie znalazłem reguły 0.65.0 bez ŻADNEJ mutacji** (w przeciwieństwie do klasy AUD-QA-F1-008 z fali 1, która dotyczyła SIEDMIU strażników prototypu bez mutacji) — to JEST regresja tamtej klasy w innym miejscu, więc sprawdziłem ją celowo i **nie odtworzyła się w zakresie napraw 0.65.0**.
- **QA-90** (co jeszcze w zakresie może skrzywdzić klienta/właściciela/dane, a nie stoi na liście) — patrz `Niedomknięte` niżej: znalazłem i naprawiłem DWIE usterki ŚRODOWISKA DOWODOWEGO (nie kodu produktu) powstałe z orkiestracji fali, obie już znanej klasy udokumentowanej przez inne role tej samej fali (FE, INT, BE w `PRZEBIEG.md`) — rozjazd hasła `klient-test` między torami przez wspólny `.env`, i plik `uploads/wc-logs/*.log` psujący porównanie migawek. Obie skorygowane, obie NIE są usterkami kodu 0.65.0.

## Audyt mutacyjny (pełny, `node tools/straznicy/audyt-straznikow.mjs`)

```
audyt-straznikow: 349 złapanych, 0 przeoczonych, 0 martwych, 2 pominiętych (brak materiału) (mutacji: 351)
```
Zgodne z deklaracją `docs/NAPRAWY-PO-AUDYCIE.md` („audyt mutacyjny 351, 0 przeoczonych, 0 martwych”). Kod wyjścia: **0**.

## `npm run check` (pełny)

Kod wyjścia: **0**. Szczegóły z logu: strażnicy **39/39** (`✔ straznik-*.mjs` policzone: 39), lint bez błędu, `tsc --noEmit` bez błędu, testy `pass 83 / fail 0`, build `✓ Compiled successfully`, 7 smoke'ów prototypu zielonych (D4/D5/D6/lekcje/CSP/podgląd/SEO). Zero regresji wobec deklarowanego stanu w `docs/NAPRAWY-PO-AUDYCIE.md`.

## Bramki WP live (tor A) — przebiegi pełne

| Bramka | Wynik | Zgodne z deklaracją 0.65.0? |
|---|---|---|
| `smoke:wp-platnosci` | 23/23 | tak |
| `smoke:wp-zakup` | 58/58 | tak |
| `smoke:wp-zwroty` (×2 z rzędu) | 39/39, 39/39 | tak — potwierdza higienę z c3f2dd9 |
| `smoke:wp-monitor` | 181/181 (po naprawie hasła `klient-test`, patrz niżej) | tak |
| `wp aai-platnosci sprawdz` (×3, po zakupie/zwrotach) | kod 0 za każdym razem | tak |

## Niedomknięte

1. **Rozjazd hasła `klient-test` między torami A/B — usterka ŚRODOWISKA orkiestracji, NIE kodu 0.65.0.** Zastałem `WP_KLIENT_HASLO` we wspólnym `wordpress/srodowisko/.env` NIEZGODNE z hashem konta na torze A (potwierdzone `wp_check_password()` → `NIEZGODNE`; zjawisko już nazwane przez FE w `PRZEBIEG.md`, 11:50: „`npm run wp:klient` na torze B ZAPISAŁ nowe hasło… krytyk FE musiał podmienić hash i przywrócić"). Skutek dla mojej pracy: pierwszy przebieg `smoke-wp-monitor` dał 6/180 czerwonych, WSZYSTKIE z powodu nieudanego logowania `klient-test` — żadna z sześciu nie dotyczyła nowych asercji 0.65.0 (A1/A7), które w tym przebiegu były już zielone (nieobecne na liście czerwonych). Naprawiłem PRECONDITION mojego testu (nie kod produktu): `wp user update klient-test --user_pass=<wartość z .env>` na torze A, zweryfikowałem zgodność, powtórzyłem przebieg → 181/181. Nie zmieniałem `.env` ani hasła na wartość inną niż ta już tam zapisana — wyrównałem TYLKO stronę bazy do tego, co `.env` już mówił. Powód niedomknięcia jako „regresja": to nie jest regresja kodu — zostawiam to jako obserwację dla orkiestracji, bo rozjazd może wrócić, gdy kolejna rola uruchomi `wp:klient` na którymkolwiek torze.
2. **Rozjazd mediów przy `--przywroc=k-baza`** — pierwsze wywołanie zatrzymało się na `media: plików 1343 → 1344` / nowym pliku `uploads/wc-logs/transactional-emails-2026-09-05-*.log` (log Woo z maili wysłanych przez moje przebiegi `smoke-wp-zakup`/`smoke-wp-zwroty`/`smoke-wp-monitor`). Ta sama klasa co u INT i BE tego dnia (`PRZEBIEG.md`: „każda rola, która wywołuje fatal/wysyła pocztę, zostawia ten ślad poza bazą"). Skasowałem plik jawną ścieżką (nie zakresem), `--przywroc=k-baza` dał kod 0 przy drugiej próbie. Nie jest to zgłoszenie do sektora — powielałoby zjawisko już zgłoszone przez INT/BE tej samej fali; zapisuję dla przejrzystości rachunku sumienia.
3. **Nie testowałem mutacyjnie `smoke-wp-monitor.mjs` sekcji 10c9b/10c9c (migracja soli) przez PSUCIE KODU PRODUKTU** — zweryfikowałem je wyłącznie przez pełny przebieg zielony (funkcja `Aai_Monitor_Podpis::stan_soli()` i migracja są WEWNĄTRZ smoke'a jako gotowy scenariusz z własnym przywracaniem, nie osobna reguła strażnika do zmutowania z zewnątrz) — uznałem to za wystarczające, bo bramka sama zawiera pełny cykl „zepsuj stan → zmierz → przywróć" i dowodzi swojej własnej tezy przy każdym uruchomieniu; nie mutowałem KODU `class-aai-monitor-podpis.php`, żeby nie ryzykować kolejnego rozjazdu soli między torami przy współdzielonym mouncie.

## Komendy i kody wyjścia (mierzone bez potoku)

| Komenda | Kod |
|---|---|
| `git branch --show-current` / `git rev-parse HEAD` | — (ustalenie gałęzi/HEAD) |
| `git merge-base --is-ancestor a516fe4 HEAD` / `582d4b9 HEAD` | 0 / 0 |
| baseline `node tools/straznicy/straznik-monitora-wp.mjs` / `-platnosci-wp.mjs` / `-tutora.mjs` | 0 / 0 / 0 |
| mutacja 1 (`straznik-monitora-wp`, plik logowania.php) | 1 → po przywróceniu 0 |
| mutacja 2 (`straznik-platnosci-wp`, priorytet 15) | 1 → po przywróceniu 0 |
| mutacja 3 (`straznik-platnosci-wp`, `is_enrolled(...,false)`) | 1 → po przywróceniu 0 |
| mutacja 4 (`straznik-tutora`, `$istniejacy = 0`) | 1 → po przywróceniu 0 |
| mutacja 5 (`straznik-platnosci-wp`, surowy DELETE tutor_earnings) | 1 (2 reguły) → po przywróceniu 0 |
| mutacja 6 (`straznik-platnosci-wp`, kontrola kasuje) | 1 → po przywróceniu 0 |
| mutacja 7 (`straznik-monitora-wp`, VALUES(wartosc)) | 1 → po przywróceniu 0 |
| każde `diff <backup> <plik>` po przywróceniu (7×) | brak wyjścia (IDENTICAL) |
| `node tools/straznicy/audyt-straznikow.mjs` | 0 (349 złapanych/351 mutacji, 0/0) |
| `rm -rf .next && npm run check` | 0 |
| `node --env-file=wordpress/srodowisko/.env tools/smoke/smoke-wp-platnosci.mjs` | 0 (23/23) |
| `node --env-file=wordpress/srodowisko/.env tools/smoke/smoke-wp-zakup.mjs` | 0 (58/58) |
| `node --env-file=wordpress/srodowisko/.env tools/smoke/smoke-wp-zwroty.mjs` (×2) | 0 (39/39), 0 (39/39) |
| `wp aai-platnosci sprawdz` (×3) | 0, 0, 0 |
| `ZRZUTY_RIG=/tmp/rig-fe node --env-file=… tools/smoke/smoke-wp-monitor.mjs` (1. przebieg, hasło niezgodne) | 1 (174/180 zielonych) |
| `wp user update klient-test --user_pass=…` (wyrównanie do `.env`) | 0 |
| `wp eval` (`wp_check_password`) przed/po | `NIEZGODNE` → `ZGODNE` |
| `ZRZUTY_RIG=/tmp/rig-fe node --env-file=… tools/smoke/smoke-wp-monitor.mjs` (2. przebieg) | 0 (181/181) |
| `node audyt/tools/srodowisko.mjs --przywroc=k-baza` (1. próba) | 0, ale z ostrzeżeniem o rozjeździe mediów (log wc-logs) |
| `podman exec aai_wp_wordpress rm -f …/wc-logs/transactional-emails-…` | 0 |
| `node audyt/tools/srodowisko.mjs --przywroc=k-baza` (2. próba) | 0, „liczniki żywej bazy = liczniki zapisane przy zrzucie” |
| `STACK_NAZWA=aai_wp_b … --przywroc=k-baza-b` | 0, bez rozjazdu (tor B nietknięty) |
| `git status --short -- wordpress tools package.json` | 0 wierszy |

## Stan środowiska i repo po

- **Repo:** `git status --short -- wordpress tools package.json` → **puste** (0 wierszy). Poza zakresem tej roli: `audyt/stan/re-audyt-f1-{SEC,WALID}.json`, `audyt/tools/{audyt-straznika-sektora,status,straznik-sektora-audytu}.mjs` — niezacommitowane zmiany orkiestracji sprzed mojej pracy, nietknięte (instrukcja zabraniała ich dotykać).
- **Tor A (`:8892`):** `wp_aai_monitor_logowania` 26 wierszy, `wp_aai_monitor_wizyty` 30, `wp_aai_platnosci_powiazania` 2, `wp_aai_platnosci_dostawy` 6, `wp_wc_orders` 0 — identyczne z liczeniem PRZED moją pracą i z migawką `k-baza` (skrót bazy `f8fd841d01534c5a…` bez zmian, media 1343 plików / 31 888 625 B, skrót zgodny). Konto `klient-test` NIE skasowane (hasło wyrównane do wartości już zapisanej w `.env` — sama wartość `.env` niezmieniona). Konto `admin` nietknięte. Wtyczki aktywne: `aai-monitor`, `aai-platnosci`, `aai-sklep`, `tutor`, `woocommerce`.
- **Tor B (`:8894`):** `--przywroc=k-baza-b` → kod 0 bez ŻADNEGO rozjazdu — tor B nie był przeze mnie dotykany na poziomie żywej instalacji (wszystkie mutacje kodu PHP robiłem i przywracałem statycznie na dysku, testując wyłącznie przez `node tools/straznicy/*.mjs`, bez odpytywania żadnego z dwóch kontenerów WP w oknie mutacji).
- `.next` odbudowane przez `npm run check` — zgodnie z wymogiem czystego builda przed pomiarem.

## Wniosek

**Wszystkie sprawdzone reguły i asercje 0.65.0 zapalają się i to z właściwego powodu; brak regresji w zakresie QA.** Jedyne dwie usterki znalezione w tej rundzie dotyczą ŚRODOWISKA DOWODOWEGO fali kontrolnej (rozjazd hasła `klient-test` między torami, log Woo psujący porównanie migawek) — obie tej samej klasy, co już zgłoszone przez FE/INT/BE w `PRZEBIEG.md`, obie skorygowane bez dotykania kodu produktu.

---

## Werdykt krytyka QA: ODRZUCAM

**Data:** 2026-09-05 · **HEAD:** `2f1aeb66f3a87c2a25c3e2a994580fdc678652f9` · tor A (`:8892`) + tor B (`:8894`)

**Powód (dwa, oba zmierzone, żaden nie dotyczy liczb roli — te się bronią):**

1. **Deklarowana metoda roli nie została zastosowana do ANI JEDNEJ asercji smoke'a — a gdy ją zastosowałem, jedna z nowych asercji 0.65.0 okazała się ŚLEPA.** Rola pisze we wstępie: „psuję przedmiot bramki i patrzę, czy zapala się, i czy z WŁAŚCIWEGO powodu", ale w pozycjach 8–10 tabeli zastąpiła to zielonym przebiegiem („funkcjonalne", „n/d"). Zielony przebieg bramki nie odróżnia asercji żywej od ozdobnej. Zmierzone przeze mnie na żywej instalacji, dwustronnie:
   - **zdjąłem zamek 1** (`if ( ! self::same_kursy( $zamowienie ) ) { return; }` w `zamowienie_znika()`, kotwica potwierdzona w kontenerze przez `ReflectionMethod` — kod ZAŁADOWANY był zmutowany) → `smoke-wp-zakup` **58/58, kod 0**, czyli bramka niczego nie zauważyła;
   - w tym samym stanie zamówienie MIESZANE (kurs + cudzy produkt, `#1901`) po skasowaniu straciło **earnings 1 → 0 i notatki 3 → 0**;
   - po przywróceniu zamka to samo zamówienie (`#1904`) zachowało **1:3 → 1:3**.
   Czyli: usunięcie zamka 1 realnie kasuje CUDZĄ księgowość i CUDZĄ historię, a dwie asercje `smoke-wp-zakup` nazwane wprost „zamek 1 nie trzyma" tego nie widzą (dla zamówienia mieszanego bramki hak wychodzi wcześniej, więc porównanie `${eM}:${nM}` jest spełnione niezależnie od istnienia zamka). Gwarancja nie jest bezbronna — pilnuje jej statycznie reguła 43 (mutacja „zamówieniu MIESZANYM" w audycie) — ale **asercja uruchomieniowa, na którą rola się powołała, nie mierzy tego, co obiecuje**, i to jest dokładnie klasa, po którą ten dział istnieje.

2. **Kluczowe zdanie roli o pokryciu jest nieprawdziwe i wyprowadzone z niedoliczenia.** QA-R4/R5 mówi: „10 nowych/zmienionych wymagań reguł", „12 wpisów mutacji", „**Nie znalazłem reguły 0.65.0 bez ŻADNEJ mutacji**". Zmierzone: diff dołożył **13** wpisów `opis:` i usunął **2** (`340 → 351`), a nowych/zmienionych GAŁĘZI decyzyjnych w trzech strażnikach jest **17** (nie 10). **Sześć** z nich nie ma w `audyt-straznikow.mjs` ani jednej dedykowanej mutacji (sprawdzone `grep` po `oczekiwanySlad`/tekstach komunikatów: „OSOBNYCH", „jawnym priorytetem", „żadna metoda kontroli", „starą opcję", „nigdzie nie zapada", „nie idzie przez warstwę zapisu" — **0 trafień każde**). Wszystkie sześć **żyją** (udowodniłem mutacjami niżej), więc nie jest to klasa AUD-QA-F1-008 — ale rola ogłosiła pokrycie, którego nie policzyła, a to jest zdanie, na którym stoi cały jej wniosek.

**Czego NIE zarzucam:** wszystkie LICZBY roli odtworzyłem co do sztuki (patrz tabela) — nie trzeba ich mierzyć drugi raz. Wybór 7 mutacji jest **doborem, nie wyliczeniem** (17 gałęzi w diffie), i sam w sobie nie byłby powodem odrzucenia; powodem jest ogłoszenie go jako pokrycia pełnego.

### Pozycje roli → odtworzone → moja komenda i wynik

| # | Pozycja roli | Odtworzone | Moja komenda / mutacja i wynik |
|---|---|---|---|
| 1 | zakres diffu (7 plików, statystyki) | **tak** | `git diff a516fe4~1..582d4b9 --stat -- tools/straznicy tools/smoke 'tools/audyt*'` → 6 plików + `c3f2dd9` osobno = dokładnie tabela roli (uwaga: `tools/audyt*` bez cudzysłowu pada w zsh, kod 1) |
| 2 | mutacje 1–7 na strażnikach (kod 1, właściwy komunikat) | **tak, pośrednio** | baseline `straznik-{platnosci-wp,monitora-wp,tutora}` = 0/0/0; własne mutacje na INNYCH gałęziach tych samych reguł dają kod 1 i komunikat nazywający regułę → mechanika strażników zgodna z opisem roli |
| 3 | audyt mutacyjny 349/351, 0 przeoczonych, 0 martwych | **tak** | `node tools/straznicy/audyt-straznikow.mjs` → kod **0**, `349 złapanych, 0 przeoczonych, 0 martwych, 2 pominiętych (mutacji: 351)`. **Rola nie nazwała dwóch pominiętych — nazywam: obie z `straznik-podgladu-kursow`** („lekcja prozy bez strony w podglądzie", „zrzut w źródle, którego nie ma w zasobach podglądu"), pominięte, bo to strażnik warunkowy, a w tym drzewie nie ma wygenerowanego podglądu kursów (`pole wymaga`, mechanizm z 0.35.0) |
| 4 | `npm run check` kod 0, 39 strażników, 83 testy | **tak, bez potoku** | `npm run check > log 2>&1; echo "KOD=$?"` → **KOD=0**, `✔ straznik` ×**39**, `pass 83 / fail 0`. Rola podała kod bez potoku i podała prawdę |
| 5 | `smoke:wp-zakup` 58/58 | **tak** | `node --env-file=… tools/smoke/smoke-wp-zakup.mjs` → kod 0, „58 sprawdzeń" |
| 6 | `smoke:wp-zwroty` 39/39 + kontrola kod 0 (higiena `c3f2dd9`) | **tak** | przebieg → kod 0, „39 sprawdzeń"; `wp aai-platnosci sprawdz` → **kod 0**, zero notatek-sierot |
| 7 | `smoke:wp-monitor` 181, `smoke:wp-platnosci` 23 | **nie sprawdzałem** | poza moim budżetem; nie kwestionuję — pozostałe cztery liczby roli okazały się prawdziwe co do sztuki |
| 8 | poz. 8–10 tabeli: „nowe asercje smoke'ów zweryfikowane" | **NIE** | zielony przebieg ≠ dowód; mutacja przedmiotu (zamek 1) → smoke **dalej 58/58** przy realnej stracie cudzych danych (patrz powód 1) |
| 9 | QA-R2: 0 naruszeń klasy „surowy SQL do cudzych tabel" w repo | **tak** | wynika z zieleni reguł 15c i 44 na czystym drzewie (obie przeszukują wszystkie pliki wtyczek) |
| 10 | QA-R4/R5: „żadna reguła 0.65.0 bez mutacji" | **NIE — obalone** | 6 gałęzi bez dedykowanej mutacji (patrz niżej) |

### Reguły z diffu 0.65.0, których rola NIE zmutowała — moje mutacje

Każda: kopia PRZED → mutacja → `node tools/straznicy/<strażnik>.mjs` bez potoku → przywrócenie z kopii → `diff` pusty → ponowny przebieg kod 0.

| Reguła (gałąź) | Mutacja | Kod | Komunikat nazwał właściwą regułę? | Mutacja w `audyt-straznikow.mjs`? |
|---|---|---|---|---|
| 43, **zamek 4** (osobne `try/catch` wokół księgowości i notatek) | zdjęcie `try/catch` wokół sprzątania notatek (`try {` → `if ( true ) {`, catch usunięty) | **1** | tak — „nie ma OSOBNYCH try/catch… nasz błąd nie ma prawa przerwać" | **NIE MA** |
| 43, **zamek 0b** (rejestracja z jawnym priorytetem) | `array( …'zamowienie_znika' ), 1, 2 );` → `) );` | **1** | tak — „nie widzę rejestracji… z jawnym priorytetem — domyślne 10 biegnie PO" | **NIE MA** (audyt ma tylko wariant „priorytet 10") |
| 45a (kontrola MA metodę pytającą o sieroty) | `LEFT JOIN` → `INNER JOIN` w 4 zapytaniach `cli.php` (kontrola meldowałaby zero sierot zawsze) | **1** | tak — „żadna metoda kontroli nie pyta o osierocone wiersze… (REA-INT-F1-003)" | **NIE MA** (audyt ma tylko „sprawdz() jej nie woła") |
| 16, gałąź „stan istnieje" (`decyzjeMaKurs === 0`) | `return self::MA_KURS;` → `return 'ma';` | **1** | tak — „nigdzie nie zapada rozstrzygnięcie »klient ma ten kurs«" | **NIE MA** |
| 15b, kolejność źródeł soli (tabela PRZED starą opcją) | odwrócenie `sol()`: `sol_z_opcji()` pytana pierwsza | **1** | tak — „sol() pyta starą opcję PRZED własną tabelą — tabela jest ozdobą" | **NIE MA** |
| 15b, „sól idzie przez warstwę zapisu" | `Aai_Monitor_Zapis::ustawienie_utworz(…)` → surowy `INSERT` do **naszej** tabeli `ustawienia` | **1** | tak — „tworzenie soli nie idzie przez warstwę zapisu… (A7)"; **gałąź `wp_options` się NIE zapaliła**, czyli mutacja jest niemaskująca | **NIE MA** dedykowanej — mutacja 0.65.0 (`add_option`) zapala najpierw gałąź `wp_options` i **maskuje** tę |

Gałęzie z diffu, których nie mutowałem ręcznie, bo **pokrywa je mój własny pełny przebieg audytu** (349 złapanych): 16 (`is_enrolled …, true`), 20 (`get_post_status` + `ZAMOWIENIE_TRWA`), 20 („W_TOKU znika"), 43 zamek 1, 43 zamek 3, 43 zamek 0 (priorytet 10), 44, 45b, 15b `VALUES(wartosc)`, 15b brak `get_var`, 15c, `straznik-tutora` idempotencja. Czysto obronne gałęzie („nie znalazłem metody", „zero plików klas", „zero `wp_insert_post`") pomijam świadomie — to samokontrole zakresu, nie gwarancje produktu.

**Uwaga o zasięgu reguły 16**, zgłaszam jako obserwację, nie usterkę: mutacja `return self::MA_KURS;` → `return 'ma';` zachowuje zachowanie co do znaku, a regułę zapala. Reguła celuje w NAZWĘ stałej — to znana w tym repo rodzina, tyle że tutaj wybrana świadomie (komentarz w kodzie mówi o „rozstrzygnięciu"). Ryzyko jest jednostronne (fałszywy alarm, nie milczenie), więc nie jest to znalezisko.

### Ocena rund regresji roli

- **QA-R1** — słusznie „nie dotyczy": WEJŚCIE.md daje działowi **0 wpisów**; potwierdziłem, że 13 zgłoszeń QA z fali 1 nie ma ani jednego `miejsce.plik` z `wordpress/`, a naprawy 0.65.0 są wyłącznie w `wordpress/`.
- **QA-R2, QA-R3** — odtwarzalne i uczciwe; R3 jest mocna, bo mutacja na innym pliku niż źródłowe zgłoszenie dowodzi zasięgu szerszego niż zgłoszenie.
- **QA-R4/R5** — **wadliwa**: wniosek prawdziwy (żadna reguła nie jest martwa — sprawdziłem), ale wyprowadzony z liczb, które nie zgadzają się z diffem (10/12 zamiast 17/13+2). Prawdziwy wniosek z fałszywego rachunku nie jest dowodem.
- **QA-90** — obie znalezione usterki (hasło `klient-test`, log `wc-logs`) potwierdzam jako realne i jako klasę środowiska, nie produktu; ta sama para dotknęła i mnie (dwa logi `wc-logs`, w tym `fatal-errors-*` po moich sondach PHP).

### Stan repo i środowiska po mojej pracy

- `git status --short -- wordpress tools package.json` → **puste**. Wszystkie 6 mutacji PHP przywrócone z kopii (`diff` pusty po każdej), po przywróceniu strażnicy 0/0/0.
- Niezacommitowane `audyt/stan/re-audyt-f1-{SEC,WALID}.json` i `audyt/tools/{status,audyt-straznika-sektora,straznik-sektora-audytu}.mjs` — praca orkiestracji, **nietknięta**.
- **Tor A** (`:8892`): `--przywroc=k-baza` **kod 0**, „liczniki żywej bazy = liczniki zapisane przy zrzucie" (81 tabel, skrót `f8fd841d01534c5a…`). Dane właściciela z T4 nienaruszone: **logowania 26, wizyty 30**; powiązania 2, dostawy 6, zamówienia 0. `wp aai-platnosci sprawdz` **kod 0**, `wp aai-monitor sprawdz` **kod 0**.
- **Tor B** (`:8894`): `--przywroc=k-baza-b` **kod 0** (75 tabel, skrót `8601172d7b54521a…`).
- Rozjazd mediów wystąpił **dwukrotnie** i za każdym razem był mój (`uploads/wc-logs/fatal-errors-*.log`, `transactional-emails-*.log` — sondy PHP i maile z bramek); skasowane **jawną ścieżką** w kontenerze, dopiero potem przywracanie kończyło się kodem 0. Konta `admin` i `klient-test` nietknięte; hasła nie ruszałem.
- Zamówienia i produkty mojego pomiaru (`#1898`, `#1901`, `#1904`, produkty `KRYTYK-QA-*`) skasowane po jawnej liście id, a ich ślady w cudzych tabelach — przez API właścicieli (`\TUTOR\Earnings`, `wc_delete_order_note`), nigdy zakresem; resztę zdjęło przywrócenie bazy.

### Co ma się zdarzyć, żeby to przeszło

Nie żądam powtórzenia pomiarów — one się bronią. Wystarczy, żeby rola: (1) **przemierzyła smoke'i swoją własną metodą** (mutacja przedmiotu asercji) albo nazwała wprost, że tego nie zrobiła i dlaczego; (2) **zastąpiła zdanie o pokryciu policzonym rachunkiem** (17 gałęzi w diffie, 13 nowych mutacji, 6 gałęzi bez dedykowanej mutacji — wszystkie żywe, dowody wyżej). Ślepa asercja „zamek 1" w `smoke-wp-zakup` jest usterką DOWODU po stronie napraw 0.65.0, nie usterką tej roli — ale to rola miała ją znaleźć.
