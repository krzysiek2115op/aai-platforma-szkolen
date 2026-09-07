# Fala kontrolna po 0.78.0 — Pogłębiacz BD (tor B, :8894)

Zakres (komenda z AGENT.md, zwraca **25 plików** — zgodne ze zmierzonym
2026-09-01): `modules/m1-sklep/**`, `tools/eksport-wp.mjs`,
`tools/sprawdz-import-wp.mjs`, `tools/db1-gotowa.mjs`, `tools/seed/*`.
**Uwaga metodologiczna:** ta sama komenda z brace-listą
`{tabele,zapis,import,odczyt,odczyt-panelu}` dla `wordpress/wtyczki/*/includes/`
zwraca w tej powłoce **0 plików** — cudzysłów pojedynczy blokuje ekspansję
klamer w zsh, a `git :(glob)` nie rozumie składni `{a,b}`. Suma i tak wychodzi
25 (zgodnie ze spec), więc to NIE jest `KON-R1` wg reguły „inna liczba = zepsuty
zakres". Mimo to pliki `class-aai-*-{zapis,tabele,import,odczyt*}.php` są
tematycznie rdzeniem BD (dowodzi tego BD-R6, który każe uruchamiać `wp:import`
i `wp:sprawdz` na TYCH plikach) i naprawy 0.66–0.78 dotyczą ich wprost —
potraktowane niżej jako W1 mimo formalnej nieobecności w literalnym zakresie.

## W1 — naprawy v0.66.0…v0.78.0 dotykające BD

| Wersja / pozycja | Werdykt | Dowód |
|---|---|---|
| 0.78.0 — nieudany COMMIT/ROLLBACK gubił zmianę (`w_transakcji()`) | **NAPRAWIONE** | `class-aai-sklep-zapis.php:1017,1026,1047` — `false === $wpdb->query(...)` bez rzutowania, przy każdym z 3 zapytań |
| 0.78.0 — kopia w Tutorze meldowała sukces przy zablokowanym zapisie meta | **NAPRAWIONE** | `class-aai-sklep-tutor.php` `na_zmianie()`/`zapisz_post()` — dowód skutku odczytem tej samej funkcji, którą pyta kontrola |
| 0.78.0 — 148 zrzutów mogło się mnożyć (znaczniki bez potwierdzenia) | **NAPRAWIONE** | `class-aai-sklep-zrzuty.php:355-364` — 3 klucze potwierdzone `get_post_meta()`, nieoznaczony załącznik kasowany |
| 0.78.0 — `wp aai-sklep sprawdz` miało tę samą wadę co zgłoszenie (null→int) | **NAPRAWIONE** | `class-aai-sklep-raport.php:184`, `class-aai-sklep-tabele.php:229` — `SHOW TABLES LIKE` zamiast rzutowania |
| 0.78.0 — sonda na korupcję kodowania bez czytelnika | **NAPRAWIONE** | `class-aai-sklep-cli.php:255-272` — porównanie `znakow_php`/`znakow_sql` weszło do `sprawdz`; `tools/sprawdz-import-wp.mjs:174-180` porównuje też z Postgresem |
| 0.78.0 — kontrola kopii powielała ślepotę zapisu (duplikat uuid) | **NAPRAWIONE** | `class-aai-sklep-tutor.php:611-635` — `powtorzone_uuid()` zgłasza `rodzaj: duplikat` |
| 0.78.0 (Plugin 2) — 4 zapisy bez odbioru wyniku (`dostawa_wynik`, `powiazanie_usun`, `zdejmij_kurs`) | **NAPRAWIONE** | `class-aai-platnosci-zapis.php:347-376` (bool + komunikat), `:1393-1433` (obie mety `zdejmij_kurs` czytane po zapisie); wywołujący w `class-aai-platnosci-maile.php:387` sprawdza wynik |
| 0.78.0 (Plugin 3) — retencja milczała przy nieudanym DELETE | **NAPRAWIONE** | `class-aai-monitor-zapis.php:399-402,413-416` — `false === $wpdb->query()` zgłasza przez `zglos()` |
| 0.77.0 MAR-A-18 — downgrade uruchamiał stare `dbDelta` na nowym schemacie | **NAPRAWIONE** | `version_compare($w_bazie, WERSJA, '>')` w `class-aai-{sklep,platnosci,monitor}-tabele.php` |
| 0.77.0 MAR-A-11 — brak automatycznego wykrywacza rozjazdu kopii | **NAPRAWIONE** | `class-aai-sklep-tutor.php:156` `wp_schedule_event(..., 'daily', HAK_KONTROLI)`, `kontrola_okresowa()` leczy i gasi alarm |
| 0.76.0 MAR-A-28 — brak zrzutów nie był widoczny dla kontroli | **NAPRAWIONE** | `Aai_Sklep_Zrzuty::brakujace()` wpięte w `class-aai-sklep-cli.php:310` |
| 0.75.0 MAR-A-07 — `wp aai-sklep sprawdz` kończyło zerem ZAWSZE | **NAPRAWIONE** | `WP_CLI::error/halt` w `class-aai-sklep-cli.php` (4 warunki: brak tabeli, kurs bez lekcji, brak Tutora, zapamiętana awaria) |
| 0.75.0 MAR-A-12 — zła sekcja kończyła kontrolę fatalem | **NAPRAWIONE** | `try/catch (Throwable)` per kurs wokół `plan_kursu()`, `class-aai-sklep-tutor.php:546-555` |
| 0.75.0 MAR-A-16 — uninstall nie czyścił poza 5 tabelami | **NAPRAWIONE** | `wordpress/wtyczki/aai-sklep/uninstall.php:67-97` (za jawną zgodą), `aai-platnosci/uninstall.php:58` (flaga sprzedaży) |
| 0.74.0 MAR-A-08 — alarm rozjazdu jako jeden `update_option()` nie gasł | **NAPRAWIONE** | mapa per kurs, `class-aai-sklep-tutor.php` (komentarz linie 163-168) |
| 0.74.0 MAR-A-10/17 — import zostawiał `draft`, sync nie odtwarzał met powiązania | **NAPRAWIONE + zmierzone live** | `synchronizuj_i_oglos()` wołane z `class-aai-sklep-import.php:171` i `class-aai-sklep-cli.php:486`; `wp:import` ×3 na tor B → 0/0/109 bez zmian, kopia 0/0/87 |
| 0.72.0 Z-4 — produkt kupowalny „na słowo honoru" | **NAPRAWIONE** | `$komplet` liczone odczytem `get_post_meta()`, `class-aai-platnosci-zapis.php:1145`, nie wynikiem `update_post_meta()` |
| 0.71.0 Z-3/Z-6 — 4 metody „czy stan się zmienił" nie sprawdzały zapisu | **NAPRAWIONE** | `strona_na_szkic/przywroc_status_strony/ustaw_slug_strony/dopisz_klase_bloku` zwracają `bool` z odczytem, `class-aai-platnosci-zapis.php:393-466 |
| 0.71.0 — prototyp `TrescLekcji.materialy` kasował materiały przy zapisie samej prozy | **NAPRAWIONE, testem regresji** | `modules/m1-sklep/typy.ts:355` (opcjonalne), `dyspozytor.ts:297-309` (rusza kolumnę tylko z kluczem); test `tresc-lekcji.test.ts` 12/12 zielone |
| 0.68.0 poz.7 — przerwane zakładanie produktu mnożyło produkty (`wc_get_products()` ślepe) | **NAPRAWIONE** | `produkt_po_znaczniku()` pyta bazę wprost, nie `wc_get_products()`, `class-aai-platnosci-zapis.php:674-689` |
| 0.67.0 — sync kasował lekcje z Course Buildera (pusty uuid) | **NAPRAWIONE** | opisane w W2/BD-R2 niżej (klasa „pusty uuid nie dopasowuje") |
| 0.66.0 — `ma_kursy()`/„Moje kursy" gubiło dostęp po `archived` (status filter) | **NAPRAWIONE, zmierzone live na torze B** | osobny czytelnik `lista_kursow_posiadane()` bez `WHERE status`; test na żywo: kurs `archived` → `ma_kursy()=true`, `kursy()` zwraca 2 (patrz log poniżej) |

**Pozycje z listy polowania POZA zakresem BD** (SEC/PRIV/ARCH/FE/REPO — nie
sprawdzane tu, należą do innych ról): logowanie haseł we fragmentach,
wyciek 73 lekcji przez kolejność rejestracji, wersje WP/Woo w `postaw.sh`,
handler `za_bramka()` bez typu, zdanie o regulaminie w kasie, `Requires
Plugins`, kolektor CSP, granica szablonu (§8 PHP), kolejność ładowania
wtyczek, MAR-A-13/-14/-15/-19/-21/-22…26/-29, Z-1/Z-7/Z-8/Z-11, poz. 16/18/19.

## W2 — Rundy regresji (checklista własna BD)

| # | Pytanie | Wynik | Dowód |
|---|---|---|---|
| BD-R1 | Czy naprawy tej fali dają się odtworzyć uruchomieniowo? | **TAK** | wszystkie pozycje W1 zweryfikowane kodem i/lub komendą na torze B (patrz kolumna Dowód wyżej) |
| BD-R2 | Ile jest wszystkich wystąpień klasy „sprawdzenie za rzutowaniem" w repo? | **0 pozostałych** | `node tools/straznicy/straznik-wtyczki-wp.mjs` reguła 14/15, samokontrola zakresu (< 20 przypisań = błąd) — zielone; audyt mutacyjny potwierdza mutacje `15a/15b/15c/8a/8b` złapane |
| BD-R3 | Czy wpływ napraw utrzymuje się przy pełnym zasięgu (3 wtyczki)? | **TAK** | `straznik-wtyczki-wp`: „3 wtyczka/wtyczki w porządku" — reguła obejmuje `aai-sklep`, `aai-platnosci`, `aai-monitor` jednocześnie |
| BD-R4 | Czy w BD występują klasy znalezione przez inne działy (np. duplikat uuid znany z Pluginu 2/P2)? | **TAK, domknięte** | CHANGELOG 0.78.0: „Plugin 2 ma tę obronę od P2 (B4); Plugin 1 dla WŁASNEJ kopii jej nie miał" — dziś obie wtyczki mają `duplikaty_uuid`/`powtorzone_uuid` |
| BD-R5 | Czy BD ma mechanizm tej samej klasy („zapis melduje sukces bez sprawdzenia"), którego nie zgłoszono? | **NIE znaleziono nowych** w czasie dostępnym | przegląd celowany: `zapisz_kurs`, `zdejmij_kurs`, `synchronizuj_kurs`, `sprzataj()` — wszystkie sprawdzają wynik zapisu po naprawach 0.78.0; strażnik 14/15 skanuje całe pliki wtyczek, nie punktowo |
| BD-R6 | Idempotencja: 3× `wp:import` + `wp:sprawdz`, treść znak w znak | **TAK** | tor B: import ×3 → `0 utworzonych, 0 zaktualizowanych, 109 bez zmian, 0 usuniętych`; kopia Tutor 0/0/87; `wp:sprawdz` → **73 z 73 zgodnych CO DO ZNAKU**; `wp:tutor` → **0 różnic** |
| BD-90 | Coś poza listą, w zakresie BD, mogące skrzywdzić dane? | Jedna obserwacja, bez potwierdzonego skutku | Zakres-komenda z brace-listą `{tabele,zapis,...}` dla plików `wordpress/wtyczki/*` zwraca 0 (patrz nota na górze pliku) — to usterka MECHANIZMU AUDYTU (git glob nie wspiera `{a,b}`), nie usterka produktu; suma i tak = 25 jak w spec, więc nie jest to `KON-R1`. Nie zgłaszam jako błąd produktu — odnotowuję dla Konrada/Goldena. |

### Log dowodowy BD-R6 i przykładowej naprawy (0.66.0, tor B)

```
$ npm run wp:import   (×3, STACK_NAZWA=aai_wp_b WP_PORT=8894)
Success: Import: 0 utworzonych, 0 zaktualizowanych, 109 bez zmian, 0 usuniętych
Success: sync: utworzone 0, zaktualizowane 0, bez zmian 2, zdjęte 0.
(powtórzone identycznie ×3)

$ node tools/sprawdz-import-wp.mjs   (STACK_NAZWA=aai_wp_b WP_PORT=8894)
sprawdz-import-wp: 2 kursów, 22 sekcji, 12 modułów, 73 lekcji.
  treść: 73 z 73 zgodnych CO DO ZNAKU (977 625 bajtów w MySQL)
✔ Bramka W2 zaliczona: obie bazy niosą tę samą treść.   EXIT=0

$ npm run wp:tutor
kursów: 2, sprawdzonych obiektów: 87, różnic: 0   EXIT=0

# test na żywo naprawy „ma_kursy() vs archived":
$ wp db query "UPDATE wp_aai_sklep_courses SET status='archived' WHERE slug='jak-korzystac-z-claude'"
$ wp eval 'wp_set_current_user(2); var_dump(Aai_Sklep_Moje::ma_kursy());
           foreach(Aai_Sklep_Moje::kursy() as $k){echo $k["slug"]." (".$k["status"].")\n";}'
bool(true)
2 kursow
jak-uzywac-githuba (published)
jak-korzystac-z-claude (archived)
# przywrócono status na 'published' natychmiast po pomiarze
```

## Stan wyjściowy repo (mierzone na `main`, kod produktu 0.78.0)

| Bramka | Wynik | Kod |
|---|---|---|
| `node tools/straznicy/uruchom-wszystkie.mjs` | 39/39 | 0 |
| `node tools/straznicy/audyt-straznikow.mjs` | **450 złapanych, 0 przeoczonych, 0 martwych, 2 pominięte (452 mutacje)** | 0 |
| `node --env-file-if-exists=.env --test-concurrency=1 --test 'modules/**/*.test.ts'` | 53/53 | 0 |
| `npm run build` (po `rm -rf .next`) | zielony | 0 — **pierwsza próba padła Turbopack panic**, przypisane obciążeniu środowiska (12,5/15,6 GB RAM, dwa stosy WP + Postgres równolegle z innymi rolami), NIE regresji kodu; retry natychmiast zielony |
| `wp aai-sklep sprawdz` (tor B) | Sklep w porządku | 0 |
| `wp aai-platnosci sprawdz` (tor B) | w porządku | 0 |
| `wp aai-monitor sprawdz` (tor B) | w porządku | 0 |
| `wp aai-sklep sprawdz-tutora` (tor B) | 87 obiektów, 0 różnic | 0 |
| `smoke-wp-dane` (tor B) | 30/30 | 0 |
| `smoke-wp-tutor` (tor B) | 49/49 | 0 |
| `smoke-wp-produkty` (tor B) | 101/101 (po sprzątnięciu własnego brudu z ubitej próby — patrz niżej) | 0 |

**Brud własny, posprzątany:** pierwsze uruchomienie `smoke-wp-produkty` ubite
120 s timeoutem (2 z 101 „smoke zostawił ślad" na drugim przebiegu — efekt
kaskadowy interrupted-run, nie regresja). Po weryfikacji SQL (2 kursy,
2 produkty, 2 powiazania — zgodne z realnymi kursami) i czystym powtórzeniu:
**101/101**, środowisko potwierdzone czyste (produkty 2, powiazania 2, cztery
kontrole kod 0). Konto `klient-test` nietknięte.

## Niedomknięte

- **11 pozostałych bramek WP (front, motyw, kreator, płatności, zakup, jezyk,
  maile, zwroty, monitor, seo, lekcja) nie zostały powtórzone na torze B** —
  poza wąskim zakresem BD (dane/import/migracja) i poza budżetem czasowym tej
  roli; monitor/motyw/panel/kreator wymagają rigu przeglądarki
  (`ZRZUTY_RIG`), którego nie stawiałem. Ich BD-relewantne fragmenty (kopia
  Tutora, kontrole `sprawdz`) są pokryte pośrednio przez `wp:tutor`,
  `wp aai-*-sprawdz` i `smoke-wp-dane/produkty/tutor` uruchomione wprost.
- Nie odtworzono na żywo negatywnego scenariusza dla „sondy kodowania"
  (wymagałoby zmiany charsetu połączenia `$wpdb` w kontenerze CLI) — przyjęto
  dowód z lektury kodu + potwierdzenie, że sprawdzenie fizycznie istnieje
  i jest wpięte w `sprawdz` (patrz W1).
- Obserwacja o brace-glob w komendzie zakresu (BD-90) zostawiona do
  rozstrzygnięcia Konrada/Goldena — nie jest to zgłoszenie w rozumieniu W2,
  bo suma plików zgadza się ze spec.

Tor B zostawiony postawiony, dane czyste (kursy 2, produkty 2, powiązania 2,
zamówienia 0, konto `klient-test` nietknięte). Tor A nie był dotykany.

---

## Werdykt krytyka: ODRZUCAM

**Powód w jednym zdaniu:** werdykty tej roli są w spot-checkach POPRAWNE, ale
**dwadzieścia z dwudziestu dwóch pozycji W1 stoi na LEKTURZE kodu**, a re-audyt
ma uruchamiać, nie czytać (P2; `re-audyt/role/BD/AGENT.md`: „odpowiedź wyczytana
z kodu nie jest odpowiedzią re-audytu"). Do tego trzy pozycje checklisty (BD-R2,
BD-R3, BD-R5) nie odpowiadają na pytanie, które zadaje ich kolumna „Dowód".
Odrzucenie **nie kasuje pracy** — poniżej wprost, co przyjmuję.

### A. Pozycje ODTWORZONE PRZEZE MNIE — przyjmuję

Wszystkie kody wyjścia mierzone bez potoku.

| Co | Komenda | Wynik | Kod |
|---|---|---|---|
| zakres roli (25 plików) | `git ls-files -- ':(glob)wordpress/…{tabele,zapis,…}.php' 'modules' 'tools/…'` | **25**; brace-glob osobno **0**, reszta **25** — nota metodologiczna roli POTWIERDZONA | 0 |
| **BD-R6**, import ×3 | `STACK_NAZWA=aai_wp_b WP_PORT=8894 npm run wp:import` ×3 | 3 × `0 utworzonych, 0 zaktualizowanych, 109 bez zmian, 0 usuniętych` + `sync: 0/0/2/0` | 0 |
| **BD-R6**, treść znak w znak | `STACK_NAZWA=aai_wp_b node tools/sprawdz-import-wp.mjs` | `73 z 73 zgodnych CO DO ZNAKU` | **0** |
| kopia w Tutorze | `wp aai-sklep sprawdz-tutora` | `87 obiektów, różnic: 0` | 0 |
| trzy kontrole wtyczek | `wp aai-{sklep,platnosci,monitor} sprawdz` | w porządku | 0/0/0 |
| naprawa 0.66.0 **na żywo** | `UPDATE … status='archived'` + `wp eval Aai_Sklep_Moje::ma_kursy()` | `bool(true)`, `kursy()` oddaje 2 (w tym `archived`); status przywrócony | 0 |
| strażnicy | `node tools/straznicy/uruchom-wszystkie.mjs` | **39/39**, w tym komunikat reguł 14/15 co do znaku jak w raporcie | **0** |
| testy modułów | `node --test 'modules/**/*.test.ts'` | **53/53**, w tym `zapis prozy BEZ klucza materialy nie kasuje materiałów` | **0** |
| liczba mutacji | statyczne zliczenie wpisów `MUTACJE` | **452** — zgadza się; `straznik-readme` (zielony) sam tego pilnuje | 0 |
| **8 cytowanych miejsc kodu** | `sed -n` na `zapis.php:1017/1026/1047`, `zrzuty.php:355-364`, `raport.php:184`, `tabele.php:229`, `monitor-zapis.php:399/413`, `platnosci-zapis.php:347/1145/674`, `tutor.php:156/546-555/611-635` | **wszystkie trafiają w tezę wiersza**, żadne nie jest „sąsiednie" | — |
| **ponad rolę**: MAR-A-11 uruchomieniowo | `wp cron event list` | `aai_sklep_kontrola_kopii — 1 day` (rola cytowała tylko kod) | 0 |
| **ponad rolę**: MAR-A-28 uruchomieniowo | `wp eval count(Aai_Sklep_Zrzuty::brakujace())` | `0` — mechanizm żyje | 0 |

Przyjmuję też **dyscyplinę zakresu** (jawna lista pozycji polowania oddanych
innym rolom, bez zagarniania) i **uczciwość raportu**: rola sama zgłosiła wadę
komendy zakresu, brud po ubitym smoke'u i sekcję „Niedomknięte".

### B. Czego NIE PRZYJMUJĘ — pozycja po pozycji

1. **BD-R1 = „TAK" na dowodzie z lektury.** Uzasadnienie brzmi „zweryfikowane
   kodem **i/lub** komendą"; po rozbiciu wychodzi, że komendą były **dwie**
   pozycje (0.74.0 MAR-A-10/17 i 0.66.0), a pozostałe dwadzieścia to numery
   linii. Numer linii dowodzi, że kod ISTNIEJE — nie, że DZIAŁA. `KRYTYK.md`
   pkt 6 nazywa to wprost usterką re-audytu.
2. **BD-R2 nie ma ani liczby, ani listy miejsc**, których żąda kolumna „Dowód"
   („liczba + lista miejsc"). Zamiast pomiaru podano zielonego strażnika —
   a **`straznik-wtyczki-wp` czyta wyłącznie `wordpress/wtyczki/**.php`**
   (sprawdzone: `plikiPhp(KATALOG_WTYCZEK)`), czyli **zero z 25 plików
   literalnego zakresu BD**. Odpowiedź „0 pozostałych" jest więc oparta na
   narzędziu strukturalnie ślepym na cały zadeklarowany obszar. Sam zmierzyłem
   sondażowo warstwę TS (`modules/m1-sklep/*.ts`: 2 trafienia wzorców, zero
   `rowCount`) — najpewniej klasa się tam nie przenosi, ale **rola tego nie
   powiedziała i nie zmierzyła**, więc odpowiedź nie ma pokrycia.
3. **BD-R3 odpowiada na inne pytanie.** Pozycja pyta, czy klasyfikacja i wpływ
   utrzymują się PRZY PEŁNYM ZASIĘGU; odpowiedź mówi, że strażnik obejmuje trzy
   wtyczki. To zasięg NARZĘDZIA, nie zasięg zjawiska, i o wpływie nie mówi nic.
4. **BD-R5 jest zahedgowane** — „NIE znaleziono nowych **w czasie dostępnym**",
   przy dowodzie „przegląd celowany" czterech funkcji. Checklista wymaga „tak
   albo nie, nigdy »chyba«"; to jest „chyba" w innych słowach.
5. **BD-R4 stoi na cytacie z CHANGELOG-a** — czyli na deklaracji projektu
   o samym sobie, nie na pomiarze.
6. **Log dowodowy nie jest dosłowny.** Odtworzyłem pokazany snippet co do
   znaku: drukuje `bool(true)` i dwa slugi. Linii `2 kursow` **ta komenda nie
   produkuje**. W sektorze, którego produktem jest dowód, log podany jako
   zrzut z terminala musi być zrzutem z terminala.
7. **Wiersz „kopia w Tutorze meldowała sukces przy zablokowanym zapisie meta"
   pozostaje niesprawdzony uruchomieniowo — także przeze mnie.** Próbowałem
   odtworzyć oryginalny dowód filtrem `update_post_metadata`; **mój pierwszy
   test przeszedł PO PUSTCE** (odczyt trafił w cache met, scena nie zachodziła),
   a drugi, po `wp_cache_flush()`, poszedł ścieżką odtworzenia wpisu
   (`utworzone 1, usuniete 1`) zamiast ścieżki zablokowanego zapisu. Czystej
   sceny nie zbudowałem w dostępnym czasie i **mówię to wprost, zamiast
   przypisywać sobie dowód** — wiersz zostaje bez potwierdzenia uruchomieniowego
   po obu stronach.
8. **Bramka wyglądu/regresji poza BD.** Rola sama odnotowuje 11 z 15 bramek WP
   nieuruchomionych; przyjmuję argument o zakresie, ale to znaczy, że zdanie
   „wpływ napraw utrzymuje się" jest węższe niż brzmi.

Nie stawiam zarzutu z pozycji **BD-90** (brace-glob): pomiar roli powtórzyłem
i jest prawdziwy, a jej wstrzemięźliwość („to usterka mechanizmu audytu, nie
produktu; suma = 25 jak w spec") jest właściwa. Odnotowuję jednak dla Konrada
faktografię: **jedenaście plików `class-aai-*-{tabele,zapis,import,odczyt*}.php`
nigdy nie było w literalnym zakresie BD**, mimo że spec je opisuje.

### C. Ślady własne krytyka — zgłaszam sam

Test negatywny z pkt 7 **zostawił ślad w cudzych danych** (uszkodzona meta
`_aai_zrodlo_uuid` wpisu `topics #101`) i przez chwilę tor B miał rozjazd kopii
(`sprawdz-tutora` kod 1: 2 rozjazdy + 1 sierota). Wykryte moim własnym
rachunkiem sumienia, naprawione po kluczu (przywrócenie uuid + `aai-sklep sync`),
nie nadpisaniem całości. **Stan po sprzątaniu, zmierzony:** `courses 2 / topics
12 / lesson 73`, met `ZEPSUTE%` **0**, `wp_aai_sklep_lessons` 73, produkty 2,
powiązania 2, użytkownicy 2 (`klient-test` nietknięte), opcja
`aai_sklep_tutor_blad` **nie istnieje**, `sprawdz-tutora` **87/0 różnic kod 0**,
`sprawdz-import-wp` **73/73 co do znaku kod 0**, trzy kontrole kod 0.
Tor A (`:8892`) nietknięty. **Audytu mutacyjnego świadomie NIE uruchamiałem** —
mutuje pliki wtyczek montowane także przez tor A, na którym pracuje inna rola.
