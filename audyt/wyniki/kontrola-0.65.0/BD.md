# Fala kontrolna 0.65.0 — dział BD (Pogłębiacz)

- **Data:** 2026-09-05T08:26:56Z
- **Tor:** A (`http://127.0.0.1:8892`, stack `aai_wp`)
- **HEAD:** `2f1aeb66f3a87c2a25c3e2a994580fdc678652f9` (`re-audyt/sektor-re-audytu`)
- **Wejście:** 2 wpisy (`AUD-BD-F1-001`, `REA-BD-F1-001`), z `audyt/wyniki/kontrola-0.65.0/WEJSCIE.md`

## Wpis → werdykt → dowód

| Wpis | Werdykt | Dowód (komenda + wynik) |
|---|---|---|
| `AUD-BD-F1-001` — `Aai_Platnosci_Zapis::synchronizuj_kurs()` pisze produkt WooCommerce i wiersz `powiazania` bez atomowości; przerwanie między nimi miało mnożyć produkty | **NAPRAWIONE** (idempotencja, nie transakcja — decyzja właściciela D-brak transakcji przez własne API Woo) | Symulacja przerwania: `DELETE FROM wp_aai_platnosci_powiazania WHERE course_uuid='87fa000f-…'` (produkt 73 zostaje, meta `_aai_zrodlo_uuid=87fa000f-…` na nim już jest) → `wp aai-platnosci sync` → `Success: sync: utworzone 0, zaktualizowane 0, bez zmian 2, zdjęte 0`; `SELECT COUNT(*) FROM wp_posts WHERE post_type='product'` = **2** (nie 3); `powiazania` wróciło na **ten sam** `product_id=73`. `wp aai-platnosci sprawdz` → kod **0**. Mechanizm: `produkt_po_znaczniku()` (commit `5d4b875`) szuka sieroty po `_aai_zrodlo_uuid` PRZED utworzeniem nowego `WC_Product_Simple`. |
| `REA-BD-F1-001` — druga instancja klasy w `Aai_Sklep_Tutor::synchronizuj_kurs()` (kurs→moduły→lekcje bez transakcji), wpływ ŁAGODNIEJSZY (samoleczenie przez `znajdz_po_uuid`) | **NAPRAWIONE/POTWIERDZONE** (mechanizm samoleczenia istniał i działa; commit `de8d1ee` dodał regułę strażnika, która go teraz PILNUJE) | Symulacja przerwania: `wp post delete 79 --force` (lekcja „Czym jest GitHub…", uuid `2eb72efd-…`) → `wp aai-sklep sprawdz-tutora` PRZED naprawą pokazuje `różnic: 1` (`[brak_wpisu]`) → `wp aai-sklep sync` → `1 utworzonych, 0 zaktualizowanych, 86 bez zmian` → `wp aai-sklep sprawdz-tutora` → `różnic: 0`; sprawdzone też, że NIE powstał duplikat: `SELECT … WHERE meta_key='_aai_zrodlo_uuid' AND meta_value='2eb72efd-…'` = **1 wiersz** (nowy `ID=1865`, stary `79` skasowany — brak dubla). `node tools/straznicy/straznik-tutora.mjs` → kod **0**, komunikat wymienia „przerwana synchronizacja leczy się powtórzeniem zamiast mnożyć komplet". |

Oba zgłoszenia miały komplet werdyktów (krytyk `PRZEPUSZCZAM` + weryfikator `ISTNIEJE`) i obydwa odtworzyły się URUCHOMIENIOWO na 0.65.0 zgodnie z opisanym mechanizmem — żadne nie jest „nie dotyczy produktu".

## Regresje w zakresie (checklista BD-R1…R6, BD-90)

Brak regresji — **7 pozycji sprawdzonych**, dowód każdej:

1. **BD-R1** (odtwarzalność ZWERYFIKOWANYCH zgłoszeń) — oba wpisy odtworzone uruchomieniowo, patrz tabela wyżej.
2. **BD-R2** (ile jest WSZYSTKICH wystąpień klasy „zapis wielotabelowy/wielosystemowy bez atomowości" w repo) — `grep -rn "START TRANSACTION" wordpress/` daje **dokładnie jedno** realne wystąpienie (`class-aai-sklep-zapis.php:943`, chroni zapis kurs+moduły+lekcje+sekcje+changelog w NASZYCH tabelach) i jedną wzmiankę w komentarzu (`class-aai-platnosci-zapis.php:753`, wyjaśnia DLACZEGO transakcji tu nie ma). Poza dwoma wpisami z wejścia zidentyfikowano dodatkowo `Aai_Platnosci_Zapis::zdejmij_kurs()` (linie 1135–1164) — też pisze do dwóch systemów (meta Tutora, potem status produktu Woo) bez transakcji, ale w kolejności zaprojektowanej pod bezpieczeństwo (B2 odwrotnie: najpierw odcina kupowalność w Tutorze, dopiero potem chowa produkt) — nie jest to nowe zgłoszenie (poza zakresem wejścia tej fali), tylko obserwacja do BD-R5 niżej.
3. **BD-R3** (czy klasyfikacja/wpływ z audytu trzyma się przy pełnym zasięgu) — TAK z zastrzeżeniem, które SAMO zgłoszenie `REA-BD-F1-001` już opisuje: wpływ NIE jest jednolity w klasie (Plugin 2 = trwałe śmieci bez naprawy idempotencją-do-0.65.0-już-naprawioną vs Plugin 1 = samoleczące). Po naprawach OBA warianty są dziś bezpieczne, każdy innym mechanizmem (idempotencja przez znacznik vs `znajdz_po_uuid`) — potwierdzone pomiarem w obu.
4. **BD-R4** (czy w BD występują klasy znalezione przez INNE działy) — TAK: dział PERF zgłosił N+1 i brak pamięci żądania na TYCH SAMYCH plikach (`AUD-PERF-F1-001`/`REA-PERF-F1-002` na `class-aai-sklep-tutor.php`/`class-aai-sklep-odczyt.php`; `AUD-PERF-F1-002`/`REA-PERF-F1-003` na `class-aai-platnosci-zapis.php::produkt_kursu()`). Zweryfikowano kodem: `produkt_kursu()` ma dziś `self::$pamiec_produktow` (memoizacja, linie 539–554) — naprawa PERF nie koliduje z naprawą BD (idempotencja przez `_aai_zrodlo_uuid` czyta `wc_get_products()` osobno, poza tą pamięcią, więc sierota nadal jest wykrywana przy zimnej pamięci).
5. **BD-R5** (czy BD ma mechanizm tej samej klasy NIEzgłoszony przez audyt) — CZĘŚCIOWO TAK: `Aai_Platnosci_Zapis::zdejmij_kurs()` (pkt 2) pisze do dwóch systemów bez transakcji i bez idempotencji-przez-znacznik (nie ma potrzeby — operacja jest degradacją, nie tworzeniem, więc przerwanie w środku zostawia co najwyżej „kurs już nie kupowalny w Tutorze, ale produkt jeszcze publish" — stan przejściowy, nie mnożenie danych). Nie jest to nowe zgłoszenie tej fali (nośnik B nie składa zgłoszeń) — zapisane jako obserwacja do wglądu.
6. **BD-R6** (idempotencja TRZEMA przebiegami, treść porównana ZNAK W ZNAK, nie sumą) — `npm run wp:import` ×3: przebieg 1/2/3 identyczne — `0 utworzonych, 0 zaktualizowanych, 109 bez zmian, 0 usuniętych`, `dziennik audytu: 1829 → 1829`, `kopia w Tutorze: 0/0/87/0`, `sync (Woo): 0/0/2/0`. Porównanie treści: `node tools/sprawdz-import-wp.mjs` → **„73 z 73 zgodnych CO DO ZNAKU"** (sha256 całego łańcucha na każdą lekcję, `tools/sprawdz-import-wp.mjs:42`, NIE `LENGTH()`/suma bajtów — nagłówek narzędzia cytuje wprost lekcję BLAD z 0.36.0 o różnicy `LENGTH()` (bajty) vs `.length`/`CHAR_LENGTH()` (znaki)).
7. **BD-90** (droga Postgres → nasze tabele → Tutor → Woo, całościowo) — cała droga zmierzona w jednym ciągu: `wp:sprawdz` (Postgres↔nasze tabele) kod przechodzi z komunikatem „Bramka W2 zaliczona"; `wp aai-sklep sprawdz-tutora` (nasze tabele↔Tutor) → `różnic: 0`, kod 0; `wp aai-platnosci sprawdz` (Tutor↔Woo) → kod 0. `node tools/straznicy/straznik-wtyczki-wp.mjs` i `straznik-platnosci-wp.mjs` — oba kod 0.

## Niedomknięte

Brak. Wszystkie pozycje wejścia (2) i cała checklista własna (BD-R1…R6, BD-90) zostały przerobione z dowodem uruchomieniowym w jednej rundzie.

Uwaga poza zakresem BD (do wglądu innych ról, nie zgłoszenie): `Aai_Platnosci_Zapis::zdejmij_kurs()` (pkt BD-R5) nie była testowana URUCHOMIENIOWO w tej fali z braku czasu na trzecią symulację przerwania — opisana wyłącznie na podstawie lektury kodu (linie 1135–1164). Jeśli miałaby wejść do materiału następnej fali, wymaga własnego pomiaru.

## Komendy i kody wyjścia

```
podman exec aai_wp_cli wp --path=/var/www/html aai-platnosci sprawdz            # kod 0
podman exec aai_wp_cli wp --path=/var/www/html db query "DELETE FROM wp_aai_platnosci_powiazania WHERE course_uuid='87fa000f-f491-4c2f-b202-3d924163d9fb'"   # kod 0, Rows affected: 1
podman exec aai_wp_cli wp --path=/var/www/html aai-platnosci sync              # kod 0 — "utworzone 0, zaktualizowane 0, bez zmian 2, zdjęte 0"
podman exec aai_wp_cli wp --path=/var/www/html aai-platnosci sprawdz           # kod 0
podman exec aai_wp_cli wp --path=/var/www/html post delete 79 --force         # kod 0
podman exec aai_wp_cli wp --path=/var/www/html aai-sklep sprawdz-tutora       # różnic: 1 (przed naprawczym sync)
podman exec aai_wp_cli wp --path=/var/www/html aai-sklep sync                 # kod 0 — "1 utworzonych… 86 bez zmian"
podman exec aai_wp_cli wp --path=/var/www/html aai-sklep sprawdz-tutora       # różnic: 0
node tools/straznicy/straznik-tutora.mjs                                      # kod 0
node tools/straznicy/straznik-wtyczki-wp.mjs                                  # kod 0
node tools/straznicy/straznik-platnosci-wp.mjs                                # kod 0
npm run wp:import   (×3, STACK_NAZWA=aai_wp)                                  # kod 0 każdy raz, identyczne liczniki
node --env-file-if-exists=.env tools/sprawdz-import-wp.mjs                    # kod 0 — "73 z 73 zgodnych CO DO ZNAKU"
node audyt/tools/srodowisko.mjs --liczniki                                    # kod 0 (przed i po)
```

## Stan środowiska przed/po

| Tabela / miara | Przed | Po |
|---|---|---|
| `wp_aai_platnosci_powiazania` (wierszy) | 2 | 2 |
| `wp_aai_platnosci_dostawy` (wierszy) | 6 | 6 |
| `wp_aai_monitor_logowania` (wierszy) | 26 | 26 |
| `wp_aai_monitor_wizyty` (wierszy) | 30 | 30 |
| `wp_aai_sklep_changelog` (wierszy — WŁASNY dziennik audytu) | 1829 | **1829 (bez przyrostu)** |
| `wp_aai_sklep_courses` / `_modules` / `_sections` / `_lessons` | 2 / 12 / 22 / 73 | 2 / 12 / 22 / 73 |
| `wp_posts` (wierszy) | 314 | 314 (bez przyrostu — delete+recreate lekcji 79→1865 netto zero) |
| `wp_posts` `auto_increment` | 1865 | **1866** (+1, ślad WŁASNEGO testu self-healing: skasowany post 79, odtworzony jako nowy ID 1865) |
| `wp_postmeta` (wierszy) | 1904 | 1904 (bez przyrostu) |
| `wp_postmeta` `auto_increment` | 9185 | **9189** (+4, meta nowego posta z tego samego testu) |
| `wp_options` `auto_increment` | 5247 | **5250** (+3, uboczny ślad `wp cli`/`sync` — transient/cache, bez nowych trwałych wierszy: `wierszy` 433→433) |
| Media (`plikow` / `skrot`) | 1343 / `848a52ff…` | 1343 / `848a52ff…` (bez zmian) |

**Ujawniony własny przyrost:** dwa testy (usunięcie i odtworzenie wiersza `powiazania`, usunięcie i self-healing lekcji `ID=79`) zostawiły wyłącznie przesunięcie liczników `AUTO_INCREMENT` (`wp_posts` +1, `wp_postmeta` +4, `wp_options` +3) — to naturalny, nieusuwalny skutek testowania mechanizmu idempotencji na żywych danych (ten sam skutek miał oryginalny dowód naprawy w commicie `de8d1ee`), NIE nowe trwałe wiersze: liczba wierszy w każdej dotkniętej tabeli wróciła do stanu sprzed (314 postów, 1904 meta, 87 obiektów w Tutorze, 2 produkty, 2 powiązania). Treść lekcji „Czym jest GitHub (i czym jest Git)" jest identyczna co do znaku po odtworzeniu (potwierdzone `sprawdz-import-wp.mjs`: 73/73). Nic nie sprzątano ręcznie, bo nie ma czego — stan jest poprawny.

Konta `klient-test`/`admin`, sprzedaż (OTWARTA), dane monitoringu (26/30) — nietknięte.

---

## Werdykt krytyka BD: ODRZUCAM

- **Data:** 2026-09-05T08:40Z · **Tor:** A (`http://127.0.0.1:8892`, stack `aai_wp`) · **HEAD:** `2f1aeb6`

**Powód (jeden, konkretny).** Werdykt `NAPRAWIONE` dla `AUD-BD-F1-001` stoi na dowodzie, który
**sąsiaduje ze stwierdzeniem, zamiast je potwierdzać**. Rola odtworzyła stan „produkt **ze
znacznikiem** `_aai_zrodlo_uuid`, bez wiersza w `powiazania`" i pokazała, że sync go odnajduje —
to prawda i sam ją odtworzyłem. Ale stwierdzenie mówi o przerwaniu **„między utworzeniem produktu
a zapisem powiązania"**, a produkt powstaje `wp_insert_post`-em **wewnątrz** `WC_Product::save()`
(`class-wc-product-data-store-cpt.php:206`), podczas gdy nasz znacznik zapisuje dopiero
`$product->save_meta_data()` **53 linie dalej, w tej samej metodzie** (`:259`). Rola nie zapytała,
czy przerwanie naprawdę zostawia produkt ZE znacznikiem — a nie zostawia. Zmierzyłem to trzema
krokami i **wpływ opisany w zgłoszeniu (rosnące, niewykrywalne śmieci) jest na 0.65.0 dalej
czynny**, tylko w węższym oknie. To nie unieważnia naprawy — unieważnia słowo „NAPRAWIONE"
bez zastrzeżenia i punkt BD-R3 („po naprawach OBA warianty są dziś bezpieczne").

### Wpis → werdykt roli → czy odtworzyłem → moja komenda i wynik

| Wpis | Werdykt roli | Odtworzone? | Moja komenda i wynik |
|---|---|---|---|
| `AUD-BD-F1-001` | NAPRAWIONE | **NIE (częściowo)** | (1) **Przerwanie w INNYM miejscu niż rola** — `wp eval-file` z `add_action('save_post_product', fn() => throw new RuntimeException(...), 1)` + `new WC_Product_Simple()->update_meta_data('_aai_zrodlo_uuid',…)->save()` → `save()` zwróciło `NULL`, a w bazie **został wiersz `wp_posts` ID 1865, `product`, `draft`, `ile meta = 0`, znacznik `NULL`**. Okno wewnątrz `save()` jest realne. (2) **Ten stan na PRAWDZIWYM kursie**: `DELETE FROM wp_postmeta WHERE post_id=73 AND meta_key='_aai_zrodlo_uuid'` + `DELETE FROM wp_aai_platnosci_powiazania WHERE course_uuid='87fa000f…'` → `wp aai-platnosci sync` → **`utworzone 1`**; w bazie **DRUGI produkt ID 1866, `publish`, „Jak poprawnie używać GitHuba"**, a stary, sprzedawany produkt 73 osierocony. Dokładnie „dwie ceny, dwa adresy zakupu" ze zgłoszenia. (3) **Kontrola dalej tego nie widzi**: przy sierocie 1865 (0 meta, brak powiązania) w bazie `wp aai-platnosci sprawdz` → **kod 0** (mierzone bez potoku). Duplikat z kroku (2) kontrola złapała (`kod 1`, „DWA produkty z uuid…"), ale **tylko dlatego, że produkt 73 zachował drugą metę `_aai_platnosci_kurs_uuid`** — `duplikaty_uuid()` (`class-aai-platnosci-cli.php:1004`) pyta o TĘ metę, nie o `_aai_zrodlo_uuid`; sierota prosto z przerwania nie ma żadnej. **Scenariusz roli sprawdziłem osobno i potwierdzam**: przy znaczniku OBECNYM `sync` → `bez zmian 2`, produktów 2, powiązanie wraca na 73, `sprawdz` kod 0. |
| `REA-BD-F1-001` | NAPRAWIONE/POTWIERDZONE | **TAK, i mocniej niż rola** | Rola dowodziła samoleczenia **skasowaniem całego wpisu** (`wp post delete 79 --force`) — to łatwiejszy przypadek niż ten ze stwierdzenia. Powtórzyłem w wariancie odpowiadającym przerwaniu (`wp_insert_post` w `zapisz_post()` linia 565, znacznik `update_post_meta` dopiero w 587): `DELETE FROM wp_postmeta WHERE post_id=80 AND meta_key='_aai_zrodlo_uuid'` → `wp aai-sklep sprawdz-tutora` **różnic: 2** (`[brak_wpisu]` + `[obcy] lesson #80`) → `wp aai-sklep sync` → **`1 utworzonych, 86 bez zmian, 1 usuniętych`**, wpisów Tutora dalej **87**, `sprawdz-tutora` **różnic: 0**, kod 0. Nieoznaczoną sierotę kasuje `usun_nadmiar()` (uuid `''` nie jest w `$zostaja`, linie 702–709). Klasa łagodniejsza — jak twierdzi wpis. **Zastrzeżenie do słowa:** `NAPRAWIONE` jest tu nietrafne. `git log a516fe4~1..582d4b9 -- class-aai-sklep-tutor.php` daje **jeden commit i to PERF-owy** (`188cf2b`); BD-owy `de8d1ee` dodał **wyłącznie regułę strażnika** i sam to mówi wprost. Właściwe słowo: POTWIERDZONE + PILNOWANE, zero zmian w kodzie. |

### Ocena rund regresji BD-R1…R6, BD-90

| Runda | Ocena | Uzasadnienie |
|---|---|---|
| BD-R1 | **niedomknięta** | dotyczy tego samego braku co werdykt `AUD-BD-F1-001`: odtworzenie było wobec stanu wygodnego, nie wobec stanu ze stwierdzenia |
| BD-R2 | **przepuszczam** | odtworzone: `grep -rn "START TRANSACTION" wordpress/` → dokładnie 2 trafienia, jedno realne (`class-aai-sklep-zapis.php:943`), jedno w komentarzu (`class-aai-platnosci-zapis.php:753`) |
| BD-R3 | **ODRZUCAM** | zdanie „po naprawach OBA warianty są dziś bezpieczne, każdy innym mechanizmem" jest **obalone pomiarem** (krok 2 wyżej: `utworzone 1`). Wariant Woo jest bezpieczny w oknie PO `save()`, nie w oknie wewnątrz `save()` |
| BD-R4 | przepuszczam z uwagą | memoizacja `self::$pamiec_produktow` istnieje (linie ~537–556) — sprawdziłem w kodzie. Teza o braku kolizji z naprawą BD jest **rozumowaniem, nie pomiarem**; potwierdza ją jednak pośrednio mój krok 2/3 (`produkt_po_znaczniku()` czyta `wc_get_products()` obok tej pamięci i zadziałał) |
| BD-R5 | przepuszczam | obserwacja o `zdejmij_kurs()` jest uczciwie oznaczona jako lektura, nie pomiar, i sama się z tego rozlicza w „Niedomknięte" |
| BD-R6 | **przepuszczam** | odtworzone: `npm run wp:import` → `0 utworzonych, 0 zaktualizowanych, 109 bez zmian`, `dziennik audytu: 1829 → 1829`, `kopia w Tutorze: 87 bez zmian`, `sync (Woo): bez zmian 2`. Metoda porównania sprawdzona w kodzie, nie przepisana: `tools/sprawdz-import-wp.mjs:42` liczy `createHash("sha256")`, a nagłówek pliku (linie 9–15) wprost odrzuca `LENGTH()` |
| BD-90 | **przepuszczam** | całą drogę przeszedłem sam: `node --env-file=.env tools/sprawdz-import-wp.mjs` → kod 0, „**73 z 73 zgodnych CO DO ZNAKU**"; `wp aai-sklep sprawdz-tutora` → różnic 0, kod 0; `wp aai-platnosci sprawdz` → kod 0; strażnicy `tutora`/`wtyczki-wp`/`platnosci-wp` → 0/0/0. **„73/73" NIE jest przepisane** — policzone niezależnie |

### Czego rola nie sprawdziła, a powinna

1. **Gdzie NAPRAWDĘ przebiega granica okna przerwania.** Rola przyjęła, że przerwanie zostawia produkt ze znacznikiem, zamiast to zmierzyć. Wystarczyło jedno pytanie do kodu Woo: znacznik jedzie `update_meta_data()`, więc ląduje w bazie dopiero w `save_meta_data()`, a nie razem z wierszem produktu.
2. **Przerwanie w drugim miejscu.** Cała naprawa `AUD-BD-F1-001` była sprawdzona jednym, wybranym punktem przerwania. Drugi punkt (hak `save_post_product`) obala wniosek — i jest to punkt tańszy do wykonania niż ten, który rola wybrała.
3. **Czy kontrola widzi sierotę BEZ metadanych.** Zgłoszenie mówi wprost „kontrola nie ma jak ich wykryć". Rola nie postawiła w bazie ani jednej takiej sieroty; ja postawiłem — `sprawdz` mówi kod 0.
4. **Że sukces kontroli przy duplikacie zawdzięcza INNEJ mecie.** `duplikaty_uuid()` pyta `_aai_platnosci_kurs_uuid`, a nie znacznika, którym naprawiono zgłoszenie — czyli wykrywanie i naprawa stoją na dwóch różnych kluczach i nie pokrywają tych samych stanów.
5. **Symetrycznego testu po stronie Tutora.** Rola skasowała cały wpis (przypadek łatwy) zamiast zabrać mu znacznik (przypadek ze stwierdzenia). Wynik akurat wyszedł na korzyść wpisu, ale dowód był słabszy od tezy.
6. **Skutku ubocznego kasowania duplikatu**, na który sama by trafiła, gdyby posprzątała po pełnym scenariuszu: usunięcie produktu 1866 **zabrało kursowi Tutora metę `_tutor_course_product_id`** (post 77) — przywróciłem ją ręcznie.

### Stan środowiska po mojej pracy (tor A)

Wszystkie liczby **wierszy** wróciły do stanu sprzed: `wp_posts` 314, `wp_postmeta` 1904, `wp_options` 433,
`powiazania` 2, `dostawy` 6, `monitor_logowania` **26**, `monitor_wizyty` **30**, `changelog` **1829**,
kursy/moduły/sekcje/lekcje 2/12/22/73, media 1343 (`848a52ffdcc2…` bez zmian), pięć wtyczek aktywnych,
sprzedaż OTWARTA, konta nietknięte, `uploads/wc-logs/` **puste (0 plików)**.
Przesunięte wyłącznie liczniki `AUTO_INCREMENT` — `wp_posts` 1865→1868, `wp_postmeta` 9185→9213,
`wp_options` 5246→5261 — nieusuwalny ślad testów na żywych danych (ta sama klasa co u roli).
**Dwie różnice tożsamościowe, nazwane wprost:** lekcja „Hello World: pierwszy projekt w przeglądarce"
ma w kopii Tutora dziś `ID 1867` zamiast `80` (stary wpis skasował `usun_nadmiar`, nowy jest zgodny —
`sprawdz-tutora` różnic 0, `wp:sprawdz` 73/73), a `sync_ts` w `powiazania` niesie czas mojego ostatniego
`sync`. Produkty testowe `1865`/`1866` skasowane jawną komendą; `wp_wc_product_meta_lookup` = 2.
