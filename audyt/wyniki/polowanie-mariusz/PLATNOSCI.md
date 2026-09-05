# Polowanie na nienazwane błędy — warstwa płatności

> **To NIE jest wynik sektora AUDYT ani RE-AUDYT.** To materiał roboczy do
> napraw, powstały z polowania na 7 nienazwanych błędów recenzenta (Mariusz),
> z których arytmetyka ubytków wskazuje 2 średnie albo duży + mały w module
> „płatności". Dokument nie przechodził przez krytyka ani przez `GOLD`.
> Faza była **wyłącznie statyczna**: lektura całych plików, `grep`, `git`.
> Ani jeden plik produktu nie został zmieniony, środowiska `:8892`/`:8894`
> nie dotykano.
>
> Teren: cała wtyczka `aai-platnosci` (18 plików, 6202 linie) + szew po
> stronie sklepu (`class-aai-sklep-zapis.php`, `-tutor.php`, `-widok.php`,
> `-moje.php`). Kod produktu = `main` 0.65.0.
> Data: 2026-09-05.

---

## Sedno w trzech zdaniach

**Sama wtyczka `aai-platnosci` jest napisana bardzo starannie i jej
krytyczne ścieżki są zamknięte poprawnie — jej usterki siedzą w GAŁĘZIACH
BŁĘDU zapisów pomocniczych (z 57 miejsc trwałego zapisu 37 nie sprawdza
wyniku, a 9 mimo to melduje wołającemu „stan się zmienił"), czyli dokładnie
w schemacie, który narysował recenzent.** **Najcięższe znalezisko leży
jednak nie w niej, tylko w SZWIE po stronie sklepu: kupujący, któremu
właściciel ukryje kurs, zachowuje dostęp — i traci każdą drogę do niego,
bo `/szkolenia/moje/` i pozycja „Moje kursy" w menu odsiewają kursy przez
`lista_kursow()`, które ma `WHERE status = 'published'`; klient czyta wtedy
„Na tym koncie nie ma jeszcze żadnego kursu", a obie bramki dowodzące
decyzji C1 sprawdzają wyłącznie bezpośredni adres lekcji, którego klient
nie zna.** Poza tym: kasa wraca do powoływania się na nieistniejący
regulamin, gdy zniknie strona polityki prywatności (a docblock twierdzi coś
przeciwnego), dziennik `dostawy` nie ma ANI JEDNEJ drogi zamknięcia wpisu —
więc jeden nieusuwalny błąd wysyłki zostawia `wp aai-platnosci sprawdz` na
kodzie 1 na zawsze i blokuje `postaw.sh` — a `post_status => 'any'`
w `znajdz_po_uuid()` **nie obejmuje kosza**, choć komentarz obok obiecuje,
że właśnie to chroni przed duplikatem kursu.

**Rozkład wag: 14 znalezisk — 1 duży (Z-0), 5 średnich (Z-1, Z-2, Z-3,
Z-9, Z-10), 8 małych (Z-4…Z-8, Z-11…Z-13).** Arytmetyka recenzenta
(„2 średnie albo duży + mały" w płatnościach) mieści się w tym zbiorze
z zapasem — a to znaczy, że część tej listy to najpewniej NIE są jego
błędy, tylko dokładka. Rozstrzygnięcia, które z nich miał na myśli, ten
dokument nie próbuje udawać.

---

## Tabela miejsc zapisu

Pomiar (kod wyjścia bez potoku):

```
grep -rnE '\$wpdb->(insert|update|delete|query)\(|wp_insert_post|wp_update_post|
  wp_delete_post|update_post_meta|delete_post_meta|update_option|delete_option|
  ->save\(\)|wp_insert_attachment|wp_delete_attachment|wp_upload_bits|
  wp_update_attachment_metadata|course_enrol_status_change|delete_earning_by_order|
  wc_delete_order_note|remove_cart_item|wp_mail\(' wordpress/wtyczki/aai-platnosci
```

**57 miejsc trwałego zapisu** w `aai-platnosci` + **10** w
`class-aai-sklep-tutor.php` = **67 w całym terenie** (tabela klas sklepu
w osobnej sekcji niżej). `class-aai-sklep-widok.php`
i `class-aai-sklep-moje.php` mają **0** — obie są warstwami czysto
odczytowymi i to jest w porządku (`moje.php` nie liczy postępu sam, pyta
o niego Tutora).
Settery na obiekcie `WC_Product` (`set_*`, `update_meta_data`) liczę razem
z `save()`, który je utrwala.

Legenda kolumny „sprawdza": **TAK** = wynik rozstrzyga o dalszym biegu;
**pośrednio** = metoda weryfikuje SKUTEK innym odczytem; **NIE** = wynik
odrzucony.

### `includes/class-aai-platnosci-zapis.php` (36)

| # | linia | co pisze | porażka zwraca | sprawdza | co po przerwaniu TU |
|---|---|---|---|---|---|
| 1 | 112 | `UPDATE powiazania` | `false` | **TAK** (`false !== $wynik`) | jedno zapytanie, brak stanu pośredniego |
| 2 | 122 | `INSERT powiazania` | `false` | **TAK** | jw.; konflikt UNIQUE = jawna odmowa (B4) |
| 3 | 147 | `DELETE powiazania` | `false` | NIE | **metoda martwa w produkcji** — jedyni wołający to smoke'i |
| 4 | 198 | `INSERT IGNORE dostawy` | `false` | **TAK** (`RuntimeException`) | wzorcowe: awaria ≠ duplikat |
| 5 | 293 | `UPDATE dostawy SET wynik` | `false`/`0` | **NIE** | Z1 — wiersz zostaje z pustym `wynik`; kontrola to widzi, ale każe `--ponow` (nowy klucz resetu) |
| 6 | 324 | `wp_update_post` strona→draft | `0`/`WP_Error` | **NIE**, metoda zwraca `true` | Z2 |
| 7 | 344 | `wp_update_post` slug strony | jw. | **NIE**, zwraca `true` | Z2 |
| 8 | 397 | `wp_update_post` klasa bloku | jw. | **NIE**, zwraca `true` | Z2 |
| 9 | 472 | `wp_update_post` blok komunikatów | jw. | **TAK** (`is_wp_error` + `>0`) | wzorzec — jedyna z czwórki |
| 10 | 490+494 | `set_status('completed')` + `save()` | `0` / wyjątek | **NIE**, zwraca `true` | zamówienie stoi w `processing`; siatka: `zamowienia_wiszace()` po 1 h |
| 11 | 789 | `save()` nowego produktu | `0` | **TAK** (`<= 0` → uwaga) | znane okno bez znacznika (nie zgłaszam ponownie) |
| 12 | 866 | `save()` aktualizacji produktu | `0`/wyjątek | **NIE**, `zaktualizowany=1` | Z3 — kontrola łapie rozjazd nazwy/opisu/ceny |
| 13 | 913 | `update_post_meta` `_tutor_course_price_type=paid` | `false` | **NIE** | Z4 |
| 14 | 914 | `update_post_meta` `_tutor_course_product_id` | `false` | **NIE**, a mimo to `$komplet = true` | **Z4 — produkt idzie na `publish` bez potwierdzonego powiązania** |
| 15 | 936+937 | `set_status($cel)` + `save()` | `0` | NIE; brak też sprawdzenia `wc_get_product()` na `false` | Z3 |
| 16 | 1013 | `wp_delete_attachment` | `false` | NIE | stara okładka zostaje, nowa dostaje przyrostek `-1` — czyli dokładnie to, czemu ta kolejność miała zapobiec |
| 17 | 1029 | `update_post_meta` `_wp_attachment_image_alt` | `false` | NIE | kosmetyka |
| 18 | 1040+1041 | `set_image_id()` + `save()` | `0` | NIE, zwraca `true` | produkt bez miniatury; **kontrola o okładkę nie pyta wcale** |
| 19 | 1087 | `wp_upload_bits` | `['error']` | **TAK** | — |
| 20 | 1092 | `wp_insert_attachment(…, true)` | `WP_Error` | **TAK** | — |
| 21 | 1106 | `wp_update_attachment_metadata` | `false` | NIE | miniatur brak, `_thumbnail_id` już wskazuje załącznik |
| 22 | 1107 | `update_post_meta` `META_OKLADKA_KURS` | `false` | **NIE** | **Z5 — to jest ZNACZNIK TOŻSAMOŚCI załącznika** (rodzina znanego wzorca) |
| 23 | 1108 | `update_post_meta` `META_OKLADKA_SHA` | `false` | **NIE** | Z5 — bez sha `$aktualny` zawsze `false` → przewgranie przy każdym sync |
| 24 | 1117 | `update_post_meta` alt | `false` | NIE | kosmetyka |
| 25 | 1147 | `delete_post_meta` `_tutor_course_product_id` | `false` | **NIE** | **Z6** — krok B2 zdejmowania ze sprzedaży |
| 26 | 1149 | `update_post_meta` `_tutor_course_price_type=free` | `false` | **NIE** | Z6 |
| 27 | 1155 | `wp_update_post` produkt→draft | `0`/`WP_Error` | **NIE**, `zdjety=1` | Z6 (sam produkt łapie `osierocone()`) |
| 28 | 1244 | `update_post_meta` `META_UTRACONY_DOSTEP` | `false` | NIE | sierota po kursie z kupującymi wygląda jak śmieć po kursie testowym |
| 29–31 | 1278–1280 | 3× `update_post_meta` znaczniki produktu | `false` | NIE | `_tutor_product` łapie kontrola; `_aai_platnosci_kurs_uuid` — nie |
| 32 | 1332 | `save()` produktu na `draft` przed naprawą ceny | `0` | **NIE** | klient może kupić po cenie tymczasowej (+0,01 zł) |
| 33–36 | 1348, 1352, 1358, 1363 | 4× `save()` w naprawie ceny | `0` | **pośrednio** (`get_price('edit') === oczekiwana` na końcu) | `finally` przywraca cenę i status |
| — | 1415 | `wp_update_post` produkty→szkic (deaktywacja) | `0` | **TAK** (`$nieudane[]` + komunikat) | wzorcowe |

### `includes/class-aai-platnosci-ustawienia.php` (4)

| # | linia | co pisze | porażka | sprawdza | skutek |
|---|---|---|---|---|---|
| 37 | 515 | `WC()->cart->remove_cart_item()` | `false` | **NIE** | Z7 — komunikat „w koszyku został X" mimo nieusunięcia; BLAD-023 wraca w ciszy |
| 38 | 565 | `update_option('tutor_option')` | `false` | NIE, `$zmiany[]` dopisane wcześniej | `napraw()` melduje zmianę, której nie było; łapie `rozjazdy()` |
| 39 | 579 | `update_option($klucz Woo)` | `false` | NIE, `$zmiany[]` dopisane **przed** zapisem | jw. |
| 40 | 815 | `update_option` mail Woo | `false` | NIE, `return true` | jw. |

### `includes/class-aai-platnosci-cli.php` (3)

| # | linia | co pisze | porażka | sprawdza | skutek |
|---|---|---|---|---|---|
| 41 | 217 | `update_option(OPCJA_SPRZEDAZ)` | `false` | **pośrednio** (`stan_sprzedazy()` czyta po zapisie) | — |
| 42 | 566 | `delete_earning_by_order()` | **void** | NIE (nie da się) | licznik `$skasowane_e` rośnie bez pokrycia |
| 43 | 573 | `wc_delete_order_note()` | `false` | **TAK** | — |

### `includes/class-aai-platnosci-dostarczanie.php` (3)

| # | linia | co pisze | porażka | sprawdza | skutek |
|---|---|---|---|---|---|
| 44 | 304 | `tutor_utils()->course_enrol_status_change($id,'cancelled')` | **void** — cudze API odrzuca wynik `$wpdb->update` (`Utils.php:2479`) | **NIE** i nie weryfikuje po fakcie | **Z8 — dostęp nieodebrany po skasowaniu zamówienia, w całkowitej ciszy** |
| 45 | 359 | `delete_earning_by_order()` | void | NIE | księgowość zostaje |
| 46 | 382 | `wc_delete_order_note()` | `false` | NIE | notatki zostają |

### `includes/class-aai-platnosci-tabele.php` (3) · `-komunikaty.php` (3) · `-maile.php` (1) · `uninstall.php` (4)

| # | linia | co pisze | porażka | sprawdza | skutek |
|---|---|---|---|---|---|
| 47–48 | tabele 92, 102 | `dbDelta` ×2 | nie zgłasza | NIE | `istnieja()` sprawdza osobno w kontroli |
| 49 | tabele 114 | `update_option(OPCJA_WERSJI)` | `false` | NIE | wersja zapisana mimo nieudanego `dbDelta` → `dociagnij_schemat()` już nie spróbuje; **ratuje ponowna aktywacja**, którą kontrola podpowiada |
| 50–52 | komunikaty 72, 88, 91 | `update_option`/`delete_option` kanału błędów | `false` | NIE | **kanał ostatniej szansy może po cichu zgubić błąd** |
| 53 | maile 716 | `wp_mail()` | `false` | **TAK** + hak `wp_mail_failed` z powodem | wzorcowe |
| 54–57 | uninstall 33, 40, 43, 44 | `DROP TABLE`, 3× `delete_option` | `false` | NIE | bez znaczenia |

---

## Znaleziska

### Z-0 (DUŻY) — kupujący traci DROGĘ do kursu, gdy właściciel go ukryje; strona mówi mu, że nic nie kupił

**Pliki:** `wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-moje.php:222-225`
(`ma_kursy()`) i `:256-259` (`kursy()`), przez
`class-aai-sklep-odczyt.php:64` (`WHERE c.status = 'published'`);
napis: `wordpress/wtyczki/aai-sklep/szablony/moje.php:53`;
menu: `class-aai-sklep-menu.php:131`.

**Mechanizm.** Decyzja właściciela **C1** (2026-08-31) rozdzieliła statusy
kopii w Tutorze dokładnie po to, żeby „Ukryj" zabierało kurs ze SKLEPU, a nie
ludziom, którzy zapłacili — `STATUS_KURSU_NA_WP['archived'] = 'private'`, ale
`STATUS_MATERIALU_NA_WP['archived'] = 'publish'`
(`class-aai-sklep-tutor.php:87-118`). Dostęp faktycznie zostaje.
**Znika sposób, żeby z niego skorzystać.** Obie metody `Aai_Sklep_Moje`
przecinają zapisy Tutora z `Aai_Sklep_Odczyt::lista_kursow()`, a to zapytanie
ma na sztywno `WHERE c.status = 'published'` — kurs `archived` z listy
wypada, więc:

```php
if ( '' === $uuid || ! isset( $nasze[ $uuid ] ) ) {
    continue;                       // moje.php:269 — kafelek znika
}
```

**Scenariusz.** Właściciel klika w kokpicie „**Ukryty**"
(`class-aai-sklep-kontrakt.php:87` — to jest nazwa tego stanu dla człowieka),
na przykład na czas poprawiania treści. Klient, który zapłacił 299 zł,
loguje się:

1. pozycja **„Moje kursy" znika z obu nawigacji motywu** — `menu.php:131`
   pyta `ma_kursy()`, a ta zwraca teraz `false`;
2. klient wchodzi z odnośnika w naszym mailu powitalnym
   (`class-aai-platnosci-maile.php:667` → `Aai_Sklep_Moje::adres()`)
   i czyta: **„Na tym koncie nie ma jeszcze żadnego kursu. Gdy kupisz
   szkolenie, pojawi się tutaj…"**;
3. gdyby miał zakładkę wprost do lekcji, treść by się otworzyła — ale
   strzałka „Wróć do moich kursów" (`class-aai-sklep-lekcja.php:610`)
   odsyła go na tę samą pustą stronę.

**Dlaczego to jest duży.**
- Uderza w tę samą klasę, dla której ta strona w ogóle powstała
  (zgłoszenie z W6: klient nie miał JAK trafić do kupionego kursu);
- komunikat nie jest neutralny — **mówi płacącemu klientowi, że niczego nie
  kupił**;
- wyzwalaczem jest jedno kliknięcie w kokpicie, nie awaria;
- podważa wprost decyzję właściciela C1, której zdanie brzmi „ukrycie
  przestaje odbierać dostęp kupującym";
- komentarz w kodzie (`moje.php:266-268`) przewiduje tylko kurs „cofnięty do
  szkicu" — czyli stan **sprzed** C1; `archived` przeszło pod nim bez
  rozpatrzenia.

**Dlaczego żadna bramka tego nie łapie — i to jest osobna lekcja.**
Obietnicy C1 pilnują dwa pomiary i **oba mierzą tę samą połowę**:
`smoke-wp-lekcja.mjs:516-528` i `przelot-calosc.mjs:200-206` ustawiają
`archived`, po czym sprawdzają, że kupujący **z bezpośrednim adresem lekcji**
dostaje 200 z treścią. `przelot-calosc.mjs:198` pobiera nawet
`/szkolenia/moje/` — ale **przed** ukryciem i asertuje wyłącznie HTTP 200.
Pomiar po ukryciu nie istnieje (grep: zero sprawdzeń łączących `archived`
z `/szkolenia/moje/` albo z `ma_kursy()`). **Zmierzono drogę, której klient
nie zna, i nie zmierzono jedynej, którą ma.**

---

### Z-1 (średni) — kasa wraca do powoływania się na nieistniejący regulamin, gdy zniknie strona polityki prywatności; dokumentacja twierdzi coś przeciwnego

**Plik:** `wordpress/wtyczki/aai-platnosci/includes/class-aai-platnosci-kasa.php:117-120`
kontra własny docblock `:159-164`.

**Mechanizm.** `zdanie()` zwraca `''`, gdy `get_privacy_policy_url()` jest
puste. Docblock mówi wprost: *„Pusty tekst usuwa zdanie z bloku zgód, bo
`przejdz()` ustawia atrybut bezwarunkowo"*. **`przejdz()` nigdy nie dostaje
tego pustego tekstu** — `na_bloku()` wychodzi wcześniej:

```php
$tekst = self::zdanie();
if ( '' === $tekst ) {
    return $blok;          // ← blok zgód zostaje NIETKNIĘTY
}
```

Blok nietknięty znaczy: WooCommerce drukuje swoje domyślne zdanie
*„Kontynuując zamówienie wyrażasz zgodę na nasze **Warunki i zasady** oraz
Politykę prywatności"* — a przy braku `woocommerce_terms_page_id` drukuje je
**bez odnośnika**, nie usuwa (to sama wtyczka zmierzyła w
`checkout-frontend.js` i opisała w nagłówku pliku). Czyli stan, który
właściciel kazał zdjąć 2026-08-29, wraca dokładnie wtedy, gdy ma wrócić
najmniej.

**Scenariusz.** Klient obcy kupuje paczkę i wgrywa ją u siebie (to jest
persona z `docs/INSTRUKCJA-INSTALACJI.md`). Jego instalacja nie ma strony
polityki prywatności albo ma ją w koszu — `get_privacy_policy_url()` puste.
Kasa mówi kupującemu, że wyraża zgodę na dwa dokumenty, z których jednego
nie ma, a drugiego nie da się kliknąć. Ta sama ścieżka odpala się na naszej
instalacji, gdy ktoś wyrzuci stronę polityki do kosza.

**Dlaczego nikt tego nie widzi.**
- `straznik-platnosci-wp` (linie 895–905) pyta o KOD: czy istnieje klasa
  `Aai_Platnosci_Kasa`, czy jest filtr `render_block_data`, czy nie piszemy
  do treści strony. Nie pyta o SKUTEK — to siódmy nawrót „wzorca na
  obecność, nie na rozstrzygnięcie";
- `wp aai-platnosci sprawdz` nie sprawdza polityki prywatności ani razu
  (grep: 0 trafień);
- `postaw.sh:373-375` **sprawdza to poprawnie** — ale to bramka NASZEGO
  warsztatu, która nie jedzie z paczką ZIP do klienta;
- żadna bramka (`smoke-wp-*`) nie dotyka `Aai_Platnosci_Kasa` (grep: 0).

**Waga: średni.** To obietnica prawna składana klientowi w momencie
płatności, gałąź błędu jest nieobsłużona, dokumentacja mówi nieprawdę
o zachowaniu (klasa BLAD-018), a osłoną jest jedyna kontrola, która nie
trafia do klienta. Nie jest duży, bo nie traci pieniędzy ani danych.

---

### Z-2 (średni) — dziennik `dostawy` nie ma drogi zamknięcia wpisu: jeden nieusuwalny błąd wysyłki zostawia kontrolę na kodzie 1 na zawsze i blokuje `postaw.sh`

**Pliki:** `class-aai-platnosci-cli.php:349-371` (`bledy_dostaw()`),
`:322-337` (`czy_dostawa_w_porzadku()`), `class-aai-platnosci-maile.php:295-321`
(`ponow()`), `class-aai-platnosci-dostarczanie.php:254-400`
(`zamowienie_znika()`), `wordpress/srodowisko/postaw.sh:400-404`.

**Mechanizm.** `bledy_dostaw()` czyta **wszystkie** wiersze tabeli `dostawy`
bez ograniczenia i zgłasza jako błąd każdy, którego `wynik` nie jest
`wyslano` (dla maila 1 także `pominięto:…`). Jedyną podpowiadaną naprawą
jest `wp aai-platnosci dostawy --ponow=<zdarzenie>/<id>`. Nie ma **żadnej**
drogi skasowania ani zamknięcia wiersza:

- `sieroty [--usun]` sprząta CUDZE tabele (`wp_tutor_earnings`,
  `wp_comments`) i **nie dotyka naszej `dostawy`** — asymetria warta uwagi:
  wtyczka poluje na sieroty w cudzych tabelach, a nie w swojej własnej,
  jedynej, którą czyta kontrola;
- `zamowienie_znika()` odbiera dostęp, kasuje księgowość i notatki, a
  wierszy `dostawy` po skasowanym zamówieniu **nie rusza**;
- `uninstall.php` kasuje tabele tylko przy jawnej fladze;
- pomiar: `grep -rn "aai_platnosci_dostawy"` po całym repo → jedyne
  kasowanie to surowy SQL **wewnątrz smoke'ów** (`smoke-wp-zakup.mjs:765`,
  `smoke-wp-maile.mjs:187,629`, `smoke-wp-zwroty.mjs:502`,
  `smoke-wp-platnosci.mjs:186`). Właściciel takiej drogi nie ma.

**Scenariusz A (najbardziej prawdopodobny).** Poczta leży przez godzinę —
`mail_konta/57` dostaje `wynik = 'blad: …'`. Właściciel kasuje konto
testowe klienta (albo klient sam prosi o usunięcie konta — RODO).
Od tej chwili `ponow` woła `wyslij_konto()`, które oddaje
`'blad: konto 57 już nie istnieje'` (`maile.php:483-485`), **zapisuje ten
nowy błąd do tego samego wiersza** (`ponow()` → `zapisz_wynik()`) i kończy
`WP_CLI::error` → kod 1. Wiersz jest nie do naprawienia i nie do usunięcia.

**Scenariusz B.** To samo dla `mail_kursu/2590` po skasowaniu zamówienia
2590 — `wyslij_kurs()` oddaje `'blad: zamówienie 2590 nie istnieje'`
(`maile.php:560-562`).

**Skutek.** `wp aai-platnosci sprawdz` ma **kod 1 na zawsze**. A ponieważ
`postaw.sh:400` traktuje to jako `blad` i przerywa, **krok zerowy każdego
testu ręcznego („ROZKAZ `./postaw.sh`", lekcja Z1 z 0.51.0) przestaje się
dawać wykonać** — z komunikatem o niedoręczonej wiadomości sprzed miesiąca.
To jest dokładnie ta klasa, którą wtyczka nazwała po imieniu przy
`Komunikaty`: *„kontrola zostawała czerwona po naprawie i uczyła, żeby jej
nie ufać"* (`class-aai-platnosci-komunikaty.php:26-32`) — ta sama choroba,
naprawiona w kanale komunikatów i nienaprawiona w dzienniku dostaw.

**Waga: średni.** Nie traci pieniędzy ani dostępu, ale wyłącza narzędzie,
na którym stoi cała procedura odbioru — i robi to trwale, bez drogi
powrotnej dostępnej właścicielowi.

---

### Z-3 (średni) — zdjęcie kursu ze sprzedaży melduje sukces bez ani jednej weryfikacji, a kontrola nie sprawdza kursów zdjętych po stronie Tutora

**Plik:** `class-aai-platnosci-zapis.php:1135-1167` (`zdejmij_kurs()`),
kontrola: `class-aai-platnosci-cli.php:787-793` i `:1051-1103`.

**Mechanizm.** `zdejmij_kurs()` wykonuje trzy zapisy i **nie sprawdza
żadnego**:

```php
delete_post_meta( $tutor_id, '_tutor_course_product_id' );      // :1147  false?
update_post_meta( $tutor_id, '_tutor_course_price_type', 'free' ); // :1149  false?
wp_update_post( array( 'ID' => $product_id, 'post_status' => 'draft' ) ); // :1155  0/WP_Error?
$w['zdjety'] = 1;                                                // :1162  melduje sukces
```

Kontrola nie domyka tej dziury. `rozjazdy_kursu()` — jedyne miejsce, które
sprawdza parę `_tutor_course_price_type` / `_tutor_course_product_id` —
iteruje wyłącznie `Aai_Sklep_Odczyt::lista_kursow()`, a to zapytanie ma
`WHERE c.status = 'published'` (`class-aai-sklep-odczyt.php`), i dodatkowo
pomija kursy z `price_grosze <= 0` (`cli.php:789`). **Kurs zdjęty ze
sprzedaży z definicji nie jest już `published`, więc jego meta po stronie
Tutora nie jest sprawdzana przez nic.** `osierocone()` pyta wyłącznie
o status PRODUKTU, nie o meta Tutora.

**Scenariusz.** Właściciel ukrywa albo archiwizuje kurs w kreatorze.
`delete_post_meta` nie wykonuje się (deadlock, cudzy filtr `delete_post_metadata`
zwracający `false`, awaria zapisu). Wpis kursu w Tutorze zostaje z
`_tutor_course_product_id` wskazującym produkt **i** świeżo nadanym
`_tutor_course_price_type = free`. To jest para, którą schemat Pluginu 2
nazywa najgroźniejszą: niezmiennik 14 mówi, że `product_id` bez
`price_type = paid` daje `do_enroll()` status `completed`, czyli **dostęp
bez zapłaty** (potwierdzone w cudzym kodzie: `EnrollmentModel::do_enroll()`
nadaje `STATUS_PENDING` tylko gdy `is_course_purchasable()`, a
`Utils::is_course_purchasable()` przy `price_type = free` zwraca `false`).
Kreator melduje „kurs zdjęty", kontrola świeci zielono.

**Uwaga o zasięgu.** Dziś tę parę blokuje jeszcze DRUGI zamek, po stronie
Pluginu 1: decyzja C1 stawia kopię ukrytego kursu w Tutorze na `private`,
a `Course::enroll_now()` przy `private` odmawia (zmierzone przez zespół
przy teście całości). Czyli **żeby błąd wyszedł, muszą zawieść dwa zamki
naraz** — nasz `delete_post_meta` i kopia statusu z Pluginu 1 (osobna
wtyczka, osobny hak, priorytet 10 wobec naszego 20). Dlatego **średni**,
nie duży. Ale kontrola nie pyta ani o jeden z tych dwóch zamków dla kursu
niepublikowanego, więc stan podwójnej awarii byłby niewidzialny.

---

### Z-4 (mały) — `$komplet = true` bez potwierdzenia obu zapisów w Tutorze; produkt idzie na `publish` na słowo honoru

**Plik:** `class-aai-platnosci-zapis.php:911-916`, skutek `:932-942`.

```php
update_post_meta( $tutor_id, '_tutor_course_price_type', 'paid' );
update_post_meta( $tutor_id, '_tutor_course_product_id', (int) $product_id );
$komplet = true;                       // ← bez sprawdzenia obu wyników
…
$cel = $komplet ? 'publish' : 'draft'; // ← produkt staje się kupowalny
```

Cała metoda została przepisana przy przeglądzie P2 właśnie po to, żeby
status nadawało **jedno** miejsce z **kompletem** warunków (komentarz
`:871-885`) — a ostatnie ogniwo tego kompletu jest przyjęte na wiarę.
`update_post_meta` zwraca `false` przy porażce i **także wtedy, gdy wartość
już była taka sama** — więc naiwne `if (!update_post_meta(...))` byłoby
złe; poprawnym pomiarem jest odczyt po zapisie, dokładnie tak, jak robi to
kontrola w `rozjazdy_kursu():968-973`.

**Scenariusz.** Cudza wtyczka rejestruje filtr `update_post_metadata` na
`_tutor_course_product_id` (robi tak niejedna wtyczka LMS/membership) i
zwraca `false`, blokując zapis. Nasz szew publikuje produkt, strona
sprzedażowa pokazuje `InStock` i przycisk do kasy, klient płaci, a
`do_enroll()` nie ma czego zapisać. Okno trwa do najbliższego
`wp aai-platnosci sprawdz` — ta kontrola rozjazd łapie (kod 1,
„wpis Tutora wskazuje inny produkt niż powiazania"), ale uruchamia ją
człowiek albo `postaw.sh`, nie zegar.

**Waga: mały** — wymaga cudzego filtra albo awarii bazy, a kontrola to
łapie. Wchodzi na listę, bo poprawka to trzy linijki i domyka metodę, którą
świadomie przepisano pod hasłem „komplet warunków".

---

### Z-5 (mały) — znacznik tożsamości okładki zapisywany bez sprawdzenia; kontrola o okładkę nie pyta wcale

**Plik:** `class-aai-platnosci-zapis.php:1107-1108` (`META_OKLADKA_KURS`,
`META_OKLADKA_SHA`), czytane w `zalacznik_okladki():1055-1073` i
`ustaw_okladke():985-987`.

**Mechanizm.** To jest rodzina znanego wzorca (obiekt powstaje, znacznik
tożsamości zapisuje się później i bez sprawdzenia), tylko na załączniku
zamiast na produkcie. `wgraj_okladke()` sprawdza `wp_upload_bits` i
`wp_insert_attachment` wzorcowo, po czym stawia dwie mety **bez ani jednego
sprawdzenia**. Przerwanie procesu (albo cicha porażka) między `:1092`
a `:1107` zostawia załącznik-sierotę: plik jest w bibliotece mediów, ale
`zalacznik_okladki()` go nie znajdzie, więc **każda kolejna synchronizacja
kursu wgrywa NOWĄ kopię tego samego pliku**. Bez `META_OKLADKA_SHA` warunek
`$aktualny` jest zawsze `false` — ten sam skutek.

**Scenariusz.** Właściciel poprawia zdanie w kursie raz dziennie. Każdy
zapis to jedna nowa kopia okładki (~200 kB) w `wp-content/uploads`, plus
`wp_delete_attachment` na poprzedniej — którego wynik też nikt nie sprawdza
(`:1013`). Po miesiącu biblioteka mediów ma 30 kopii i pliki z
przyrostkami `-1`…`-30`, czyli dokładnie nazwy „które kłamią o historii
pliku" — czego ta metoda miała uniknąć (komentarz `:990-1009`).

**Dlaczego nikt tego nie widzi.** `wp aai-platnosci sprawdz` nie pyta
o okładkę, `_thumbnail_id` ani o liczbę załączników z naszym meta ani razu
(pomiar: 0 trafień `okladk` w `class-aai-platnosci-cli.php`). Bramka P2
(„sha produktu niezmieniony między przebiegami") mierzy PRODUKT, nie
bibliotekę mediów.

**Waga: mały** — puchnie dysk i biblioteka, nikt nie traci dostępu ani
pieniędzy.

---

### Z-6 (mały) — trzy z czterech sióstr piszących do stron WP meldują „stan się zmienił" bez sprawdzenia zapisu

**Plik:** `class-aai-platnosci-zapis.php:320-331`, `:340-351`, `:364-404`
kontra `:464-480`.

Cztery metody o identycznym kontrakcie (`@return bool Czy stan się ZMIENIŁ`)
w jednej klasie. `dopisz_blok_komunikatow()` sprawdza wynik wzorcowo
(`$w = wp_update_post( …, true ); return ! is_wp_error( $w ) && $w > 0;`).
Pozostałe trzy robią `wp_update_post( … ); return true;`.

**Scenariusz.** `wp aai-platnosci sync --napraw` drukuje
„slug strony 8: „checkout" → „/kasa/"", a zapis nie doszedł (cudzy filtr
`wp_insert_post_data`, blokada bazy). Operator czyta „naprawione", po czym
`sprawdz` mówi „strona 8 ma slug „checkout" zamiast „kasa"". Sprzeczność
dwóch komend tej samej wtyczki w odstępie sekundy — a instrukcja naprawy
wskazuje tę komendę, która właśnie skłamała.

**Waga: mały** — stan sam się nie pogarsza, kontrola rozjazd łapie, a
naprawa to przepisanie wzorca z metody obok. Zgłaszam jako **klasę**, bo
proporcja 3:1 w jednym pliku znaczy, że nikt tego nie pilnuje: strażnik
`straznik-platnosci-wp` (101 reguł) nie ma reguły o zwracanych wartościach
warstwy zapisu.

---

### Z-7 (mały) — `remove_cart_item()` bez sprawdzenia, a komunikat obiecuje klientowi skutek

**Plik:** `class-aai-platnosci-ustawienia.php:514-527`.

```php
foreach ( $do_zdjecia as $klucz ) {
    $koszyk->remove_cart_item( $klucz );   // zwraca bool — odrzucone
}
…
wc_add_notice( sprintf( 'Kursy kupuje się pojedynczo — w koszyku został „%s".', … ) );
```

Komunikat idzie **bezwarunkowo**, także gdy nic nie zdjęto.

**Scenariusz.** Klient dodaje kurs Claude (299 zł), potem GitHub (349 zł).
`remove_cart_item()` nie usuwa pierwszego (cudzy filtr
`woocommerce_cart_item_removed`, uszkodzona sesja). Klient czyta „w koszyku
został GitHub", klika do kasy i widzi **648 zł** — czyli BLAD-023 wraca,
tylko tym razem z naszym zdaniem obok, które twierdzi coś przeciwnego.

**Waga: mały** (wymaga cudzego filtra albo awarii sesji), ale wprost na
ścieżce pieniędzy i przy naprawionym już raz błędzie, więc wart trzech
linijek: policzyć udane usunięcia i drukować komunikat tylko wtedy, gdy
jakieś było.

---

### Z-8 (mały, ale bez żadnej osłony) — odebranie dostępu po skasowaniu zamówienia nie jest weryfikowane niczym, a cudze API nie oddaje wyniku

**Plik:** `class-aai-platnosci-dostarczanie.php:304`, cudzy kod:
`tutor/classes/Utils.php:2470-2481`.

```php
public function course_enrol_status_change( $enrol_id = false, $new_status = '' ) {
    …
    $wpdb->update( $wpdb->posts, array( 'post_status' => $new_status ), array( 'ID' => $enrol_id ) );
    // ← brak return, brak clean_post_cache()
}
```

Tutor **odrzuca** wynik `$wpdb->update`, więc nasza jedyna droga
sprawdzenia to odczyt po fakcie — a mamy do tego gotowe narzędzie w tej
samej wtyczce: `Aai_Platnosci_Zapis::status_zapisu()` (`zapis.php:436-444`),
napisane dokładnie dlatego, że tego zapisu Tutora nie można ufać. Nie jest
tu użyte.

**Scenariusz.** Administrator kasuje zamówienie po obciążeniu zwrotnym albo
po zakupie z kradzionej karty. Hak biegnie, `course_enrol_status_change`
nie zapisuje (deadlock, `wp_posts` zablokowane długą transakcją importu),
po czym kod **spokojnie leci dalej** i kasuje księgowość Tutora oraz
wszystkie notatki zamówienia. Efekt: dowody zniknęły, dostęp został,
zewnętrzny `catch ( Throwable )` niczego nie widział (bo `$wpdb->update`
zwraca `false`, nie rzuca), a `wp aai-platnosci sprawdz` **nie porównuje
zapisów Tutora z istniejącymi zamówieniami ani razu**.

**Waga: mały** ze względu na prawdopodobieństwo wyzwalacza, ale jest to
**jedyne znalezisko na tej liście bez ŻADNEJ warstwy zapasowej** — nic
inaczej tego stanu nie zauważy.

**Skutek uboczny tego samego faktu (osobna, mniejsza sprawa).** Tutor nie
czyści cache'u wpisu, a `Aai_Platnosci_Posiadanie::stan_posiadania()`
(`posiadanie.php:96`) czyta status zapisu przez `get_post_status()` —
czyli tą samą drogą, którą `zapis.php:424-435` opisuje jako kłamiącą
w obrębie żądania. Dziś nie gryzie (wszyscy wołający są w innym żądaniu
niż zmiana statusu), ale to jedna decyzja czytana na dwa różne sposoby
w jednej wtyczce.

---

### Z-9 (średni) — `post_status => 'any'` NIE obejmuje kosza: duplikat kopii kursu niewidzialny dla kontroli, a hamulec C2 przestaje pytać

**Plik:** `class-aai-sklep-tutor.php:885-914` (`znajdz_po_uuid()`),
`:980-989` (`wpisy_tutora()`), skutek: `:938-946` (`kupujacy()`) →
`class-aai-sklep-zapis.php:160` → hamulec `:248-262`.

**Mechanizm — zweryfikowany w rdzeniu WordPressa, nie z dokumentacji.**
Komentarz nad metodą obiecuje: *„`post_status => any` obejmuje szkice —
inaczej powtórna synchronizacja **zduplikowałaby kurs**"* (`:878-881`).
Autor rozpoznał klasę, ale `'any'` jej nie domyka:

- `wp-includes/post.php:732-745` — `trash` rejestruje się z `'internal' => true`
  i bez własnego `exclude_from_search`;
- `wp-includes/post.php:1473` — `if ( null === $args->exclude_from_search ) {
  $args->exclude_from_search = $args->internal; }` → dla kosza wychodzi `true`;
- `wp-includes/class-wp-query.php:2651-2656` — dla `'any'` każdy status
  z `exclude_from_search => true` dostaje `post_status <> '<status>'`.

**⇒ `'any'` to „wszystko oprócz kosza i `auto-draft`".** Do tego
`znajdz_po_uuid()` bierze `numberposts => 1` i **nie ma bramki na
niejednoznaczność** — w przeciwieństwie do bliźniaczej metody Pluginu 2
(`Aai_Platnosci_Zapis::kurs_tutora()`, `posts_per_page => 2`, `-1` przy
dwóch trafieniach). Ta sama decyzja B4 („weź pierwszy nie istnieje") jest
wykonana w jednej wtyczce i niewykonana w drugiej.

**Łańcuch skutków, każdy cichy.**
1. Wpis kursu Tutora trafia do kosza → `znajdz_po_uuid()` go nie widzi →
   `zapisz_post()` idzie gałęzią `wp_insert_post` i **tworzy DRUGI komplet**
   (kurs + moduły + lekcje z pełną prozą);
2. `wpisy_tutora()` (też `'any'`) nie widzi wpisu w koszu, więc `porownaj()`
   nie zgłosi go ani jako „obcy", ani jako „sierota" —
   `wp aai-sklep sprawdz-tutora` **kod 0**;
3. po przywróceniu wpisu z kosza są dwa wpisy `publish` z tym samym uuid,
   a `porownaj()` **nadal milczy**, bo pyta tylko, czy uuid należy do
   zbioru znanych — duplikatów nie liczy;
4. `kupujacy()` idzie przez `znajdz_po_uuid()`, `get_posts` sortuje
   domyślnie `date DESC`, więc trafia w **nowy** wpis, na który nikt nie
   jest zapisany, i zwraca **0**;
5. `Aai_Sklep_Zapis::usun_kurs()` bierze tę liczbę (`:160`) i hamulec C2
   `if ( $kupujacy > 0 && ! $pozwol_dostep )` (`:248`) **nie zadaje pytania**
   „ten kurs ma N kupujących — stracą dostęp".

**Scenariusz.** Ktokolwiek z `edit_posts` wchodzi w Tutor → Courses, widzi
kurs w cudzym wyglądzie (`/courses/<slug>/` oddaje 301, więc wygląda na
zbędny) i przenosi go do kosza — zwykła operacja WordPressa, bez
ostrzeżenia. Kolejny zapis w kreatorze zakłada drugi komplet. Później
właściciel kasuje kurs jednym kliknięciem: pytania o kupujących nie ma,
a `usun_kopie()` znajduje po uuid tylko jeden z dwóch wpisów, więc kasuje
połowę.

**Dlaczego średni, a nie duży.** Wyłącza jedyny hamulec chroniący przed
odebraniem dostępu ludziom, którzy zapłacili, i robi to przy zielonej
kontroli — to argument za dużym. Przeciw: łańcuch ma trzy kroki
(kosz → zapis w kreatorze → usunięcie kursu), a decyzje projektu
konsekwentnie odsyłają właściciela od panelu Tutora. **Do promocji na duży
wystarczy jeden pomiar** — patrz punkt 9 listy pomiarów.

---

### Z-10 (średni) — `usun_nadmiar()` kasuje CUDZE wpisy na twardo, a bramka, która ma tego dowodzić, przechodzi po pustce

**Plik:** `class-aai-sklep-tutor.php:690-717`; bramka:
`tools/smoke/smoke-wp-tutor.mjs:316-330`.

**Mechanizm.** Pętla bierze **każdy** moduł o `post_parent = <kurs>` i
**każdą** lekcję pod nim, po czym kasuje ten, którego uuid nie ma
w `$zostaja`. Wpis dodany ręcznie w Course Builderze Tutora ma uuid `''`,
a `in_array( '', $zostaja, true )` jest zawsze `false` — więc leci
`wp_delete_post( $id, true )`: **force, z pominięciem kosza, bez cofnięcia.**

To zaprzecza obietnicy zapisanej w dwóch miejscach repozytorium:
`CLAUDE.md` („synchronizacja nie kasuje wpisów spoza kreatora — kasowanie
cudzej pracy to nie jest jej rola") i `README.md` („dowód, że synchronizacja
NIE kasuje cudzych wpisów").

**Bramka przechodzi po pustce.** `smoke-wp-tutor.mjs:317-320` tworzy obcy
wpis typu **kurs**, bez `post_parent`:

```js
$id = wp_insert_post(["post_type"=>Aai_Sklep_Tutor::typy()["kurs"], … ]);
```

`usun_nadmiar()` przeszukuje **wyłącznie potomków kursu**, więc obiekt bez
`post_parent` jest strukturalnie poza jej zasięgiem. Asercja
„synchronizacja skasowała CUDZY wpis — nie wolno jej tego robić"
(`:325-330`) **nie może się nie udać**. Przypadek, który realnie zachodzi —
obcy moduł albo lekcja **pod** naszym kursem — nie jest sprawdzany w ogóle.

**Scenariusz.** Właściciel dodaje w Course Builderze bonusową lekcję albo
erratę do modułu 3 (Tutor jest jego naturalnym edytorem po zakupie
wtyczki). Wraca do kreatora, poprawia jedno zdanie w opisie kursu, klika
„Zapisz". `aai_sklep_kurs_zmieniony` → `synchronizuj_kurs()` →
`usun_nadmiar()` **kasuje tę lekcję bezpowrotnie**, razem z postępem
klientów, którzy ją odhaczyli. Panel melduje „Kurs zapisany", kontrola
kod 0.

**Dlaczego średni.** Jednokierunkowość kopii jest świadomą decyzją
architektoniczną i taka lekcja nie ma odpowiednika w naszych tabelach —
więc samo kasowanie da się obronić. Ciężar leży gdzie indziej:
**repozytorium obiecuje ochronę, której nie ma, a bramka tę nieprawdę
potwierdza.** To dziewiąty w tym projekcie test przechodzący po pustce.

---

### Z-11 (mały) — 87 wpisów kopii bez transakcji, a przerwanie niewyjątkowe nie zostawia śladu

**Plik:** `class-aai-sklep-tutor.php:250-273`, `:199-208`.

`Aai_Sklep_Zapis` ma prawdziwą transakcję z `ROLLBACK` i ogłasza zdarzenie
PO commicie — ale `synchronizuj_kurs()` zapisuje **87 wpisów Tutora
całkowicie poza nią** (Posts API i tak nie da się w niej trzymać), bez
rollbacku, a `usun_nadmiar()` biegnie dopiero po całej pętli.
`na_zmianie()` łapie wyłącznie `Throwable`, a `max_execution_time`,
wyczerpanie pamięci i `kill` to w PHP fatal error, **nie wyjątek** — więc
`zapamietaj_blad()` się nie wykona, opcja zostanie pusta i kokpit nic nie
pokaże.

**Scenariusz.** Zapis Kursu 2 (6 modułów, 32 lekcje, ~1,1 MB prozy) na
hostingu z `max_execution_time = 30`. Nasze tabele zapisane (commit), kopia
urywa się na 40. wpisie. Klienci czytają materiał sprzed poprawki, nadmiar
nie został sprzątnięty, a właściciel nie ma powodu uruchamiać
`sprawdz-tutora`, bo panel nie zgłosił błędu.

**Waga: mały** — rozjazd jest w pełni wykrywalny (`porownaj()` porównuje
pole po polu) i naprawialny ponownym zapisem. Zgłaszam, bo to znów klasa
„bramka, której nie widać": wykrycie wymaga, żeby ktoś sam zadał pytanie.

---

### Z-12 (mały) — `ma_kursy()` w menu bez `try/catch`: awaria Tutora daje 500 na całej witrynie, łącznie z kasą

**Plik:** `class-aai-sklep-moje.php:207-234` i `:250`, wołane
z `class-aai-sklep-menu.php:131`.

`ma_kursy()` woła `tutor_utils()->get_enrolled_courses_ids_by_user()` bez
żadnej osłony, **na każdej odsłonie każdej strony** dla zalogowanego. Dla
porównania: `Aai_Sklep_Tutor::na_zmianie()` ma `catch ( Throwable )`
(`:205`), a w `Aai_Monitor_Logowania` ten sam `catch` jest zapisany jako
**wymaganie bezpieczeństwa sklepu**, bo wyjątek z handlera wychodzi z kasy
WooCommerce.

**Scenariusz.** Aktualizacja Tutora zmienia sygnaturę albo tabela
`wp_tutor_*` jest w naprawie po restarcie MySQL. `Error` z cudzej metody
leci przez `wp_nav_menu` w nagłówku motywu → **HTTP 500 na każdej stronie
dla każdego zalogowanego, łącznie z `/kasa/`**. Klient w trakcie płatności
dostaje białą stronę, a katalog i strony sprzedażowe — których Plugin 1
z definicji nie uzależnia od LMS-a (komentarz `:146-149`: „brak Tutora nie
jest błędem") — padają razem z Tutorem.

**Waga: mały** ze względu na wyzwalacz (awaria cudzej wtyczki), ale trafia
w najdroższy moment i przeczy deklarowanej niezależności. Ta klasa raz już
w tym projekcie kosztowała HTTP 500 przy dodawaniu do koszyka (przegląd P4).

---

## Druga oś — wskazówka M2: „maile do klienta: z jakiej do jakiej poczty, kto go wysyła"

Cały plik `class-aai-platnosci-maile.php` (774 linie) przeczytany.
Odpowiedzi z kodu; pomiaru uruchomieniowego świadomie nie robiłem.

### (a) Odbiorca

| mail | adresat | linia |
|---|---|---|
| 1 „Ustaw hasło i wejdź" | `$user->user_email` z `get_userdata( $user_id )` | `:482`, `:540` |
| 2 „Twój kurs jest gotowy" | `$user->user_email`, gdzie `$user = get_userdata( $order->get_customer_id() )` | `:563`, `:625` |

**Ani jeden mail nie idzie na `billing_email`.** Dla maila 1 to jest
świadoma i słuszna decyzja, udokumentowana (B9, `:472-476`): niesie ważny
klucz resetu, więc adres rozliczeniowy z cudzego zamówienia oddałby konto.

**Dla maila 2 ta sama decyzja ma nieopisany koszt.** Mail 2 nie niesie
klucza resetu (tylko zwykły odnośnik do `/my-account/lost-password/`,
`:609`), więc argument B9 go nie dotyczy — a różnica adresów jest realna.

**Co się dzieje, gdy klient kupuje na inny adres niż ma konto.** Konto
powstaje w kasie z adresu rozliczeniowego, więc przy PIERWSZYM zakupie oba
adresy są tożsame. Rozjeżdżają się przy: drugim zakupie z innym adresem
rozliczeniowym (kasa Woo pozwala zalogowanemu zmienić to pole), zmianie
adresu konta w `/my-account/edit-account/`, zamówieniu założonym w kokpicie
na istniejącego klienta. Wtedy klient dostaje potwierdzenie zamówienia od
WooCommerce na adres **A** (Woo zawsze używa `billing_email`) i naszą
wiadomość „Twój kurs jest gotowy" na adres **B**. Z jego strony wygląda to
tak, że kurs się nie dostarczył. Nasz dziennik zapisuje `wyslano`,
`wp aai-platnosci sprawdz` kończy kodem 0.

Doprecyzowanie do dokumentacji: docblock `na_dostepie()` mówi
*„adresata bierzemy z zamówienia"* (`:239`) — z zamówienia bierzemy
`customer_id`, ale ADRES bierzemy z konta. Zdanie jest dwuznaczne akurat
w miejscu, w którym różnica ma znaczenie.

### (b) Nadawca — czy dwa mechanizmy się kłócą

**Nie kłócą się, i to nie przez przypadek — ale ich złożenie ma martwe
miejsce.**

Kolejność w `wp_mail()` (rdzeń WP): nagłówki są parsowane **najpierw**, więc
nasz jawny `From:` (`maile.php:720`) ustawia `$from_email`; **dopiero
potem** rdzeń robi `apply_filters( 'wp_mail_from', $from_email )`. Nasz
filtr `nadawca_adres()` (prio 1) porównuje wartość z domyślnym
`'wordpress@' . host` i przy różnicy oddaje ją **bez zmian** (`:149-151`).
Więc: **wygrywa nagłówek `From:`**, a filtr jest wyłącznie naprawą wartości
domyślnej dla poczty, która nagłówka nie ustawia (rdzeń WP, cudze wtyczki).
Dokładnie tak, jak deklaruje komentarz `:126-139`.

**Martwe miejsce.** `nadawca()` (`:678-688`) buduje nagłówek z
`woocommerce_email_from_address`, a przy pustym/niepoprawnym — z
`admin_email`. Jeśli `admin_email` sam jest `wordpress@<host>`, to:
nagłówek = `wordpress@<host>` → filtr rozpoznaje go jako domyślny → pętla
kandydatów sprawdza `woocommerce_email_from_address` (puste) i `admin_email`
(czyli `wordpress@<host>`, `is_email()` = prawda) → **zwraca dokładnie tę
samą wartość**. Naprawa nie naprawia niczego, a nic tego nie zgłasza.
Bramka `smoke-wp-maile.mjs:444-462` mierzy to poprawnie — ale **tylko dla
poczty rdzenia**, wołając `wp_mail()` **bez** nagłówka `From:`. Nasze dwa
maile idą inną ścieżką (z nagłówkiem) i pod tę asercję nie wpadają.

### (c) `Reply-To`

**Brak.** Nagłówki to dokładnie dwa: `Content-Type` i `From` (`:720`).
WooCommerce w swoich mailach `Reply-To` ustawia; my nie. Praktycznie
odpowiedź klienta trafi na adres z `From`, więc szkoda jest mała — chyba że
zajdzie martwe miejsce z punktu (b), i wtedy odpowiedź klienta na maila
„Ustaw hasło" idzie w próżnię.

### (d) `admin_email` = `wordpress@127.0.0.1` — kto to wykryje

**Nikt na instalacji klienta.** `wp aai-platnosci sprawdz` sprawdza ~20
rzeczy o produktach, ustawieniach, walucie, bramkach i dziennikach —
i **ani jednej o poczcie przed wysyłką** (pomiar: 0 trafień
`email_from|admin_email|nadawc` w `class-aai-platnosci-cli.php`). Wykrywa to
wyłącznie `smoke-wp-maile` na naszym warsztacie (`!adres.startsWith("wordpress@")`),
czyli bramka, która nie jedzie z paczką ZIP.

**Skutek na produkcji.** `wp_mail()` oddaje `true` (PHPMailer przyjął),
`dostawy` zapisuje `wyslano`, kontrola kod 0 — a wiadomość odpada na SPF po
stronie odbiorcy albo wraca odbiciem, którego nikt nie czyta. To jest
jedyne pęknięcie w łańcuchu, dla którego cała tabela `dostawy` istnieje:
**`wyslano` znaczy „PHPMailer przyjął", nie „klient dostał", i nigdzie nie
jest to napisane.** Sugestia (nie naprawiam): dwa wiersze w `rozjazdy()` —
adres nadawcy naszych maili nie może zaczynać się od `wordpress@`, a jego
domena powinna zgadzać się z domeną `home_url()`.

### (e) `shutdown` — czy odpali przy WP-CLI i przy webhooku bramki

**Tak, w obu.** `shutdown` odpala `shutdown_action_hook()` zarejestrowany
w `wp-settings.php` przez `register_shutdown_function()`, więc wykonuje się
przy każdym zakończeniu procesu PHP, także po `exit`/`die`/`WP_CLI::halt()`.
Webhook bramki płatniczej to zwykłe żądanie HTTP do WordPressa
(`/?wc-api=…`), więc też. Ścieżka „admin klika Processing" jest osobno
zabezpieczona: domknięcie odkłada się na `shutdown`, a domknięcie odpala
`tutor_after_enrolled` **wewnątrz trwającej akcji `shutdown`** — WordPress
nie wykonuje callbacku dopisanego do trwającej akcji, więc
`na_koniec_zadania()` wykrywa to przez `doing_action( 'shutdown' )`
(`:383-390`) i wysyła od razu. To jest zamknięte poprawnie i opisane.

**Co zostaje otwarte.** Jeśli żądanie umrze przed `shutdown` (fatal
w cudzym callbacku zarejestrowanym wcześniej, `max_execution_time`, twardy
kill), znacznik już jest, a wysyłki nie ma → wiersz z pustym `wynik`. To
jest stan **projektowany** i kontrola go łapie (`cli.php:310-337`) — dopóki
`--ponow` ma do czego wrócić (patrz Z-2).

### (f) Co, gdy `wp_mail()` zwróci `false`; znacznik przed czy po wysyłce

**Znacznik powstaje PRZED wysyłką i to jest poprawne**: `dostawa_odnotuj()`
to atomowy `INSERT IGNORE` na `UNIQUE (zdarzenie, identyfikator)` —
jedyna konstrukcja odporna na rekurencję haków Tutora (B6), której
`wp_wc_orders_meta` nie daje. Kolejność: `dostawa_odnotuj()` →
(shutdown) → `wp_mail()` → `dostawa_wynik()`.

`false` z `wp_mail()` jest obsłużone **wzorcowo**: powód łapie hak
`wp_mail_failed` (`:706-713`), wynik idzie do kolumny `wynik` jako
`'blad: …'`, a porażka dodatkowo ląduje na ekranie właściciela pod własnym
kluczem `mail:<zdarzenie>/<id>` (`:344-354`), bo — jak mówi komentarz —
niedoręczony link do hasła nie ma drugiego kanału.

**Jedna szczelina.** Dopisanie wyniku (`dostawa_wynik()`,
`zapis.php:291-303`) nie sprawdza `$wpdb->update` (pozycja 5 tabeli). Gdy
wysyłka SIĘ UDAŁA, a zapis wyniku nie — wiersz zostaje z pustym `wynik`,
kontrola zgłasza „brak potwierdzenia wysyłki" i każe `--ponow`, co dla
maila 1 **wygeneruje NOWY klucz resetu i unieważni ten, który klient już
dostał** (B8). Kierunek odwrotny (wysyłka padła, zapis wyniku padł) jest
bezpieczny, bo komunikat w kokpicie i tak powstaje.

---

## Sprawdzone i BEZ ZARZUTU — nie szukać drugi raz

1. **Atomowość znacznika dostawy** — `INSERT IGNORE` + `UNIQUE (zdarzenie,
   identyfikator)`; `false` z zapytania rzuca `RuntimeException`, a nie
   udaje duplikatu (`zapis.php:209-224`). Wzorcowe.
2. **`powiazanie_ustaw()`** — świadomie bez `ON DUPLICATE KEY UPDATE`,
   jawny SELECT → UPDATE/INSERT, konflikt UNIQUE = odmowa z rozróżnieniem
   powodu (`Duplicate entry` vs awaria). Wynik sprawdzany. Bez zarzutu.
3. **Kolejność B2** przy wiązaniu (`price_type` → `product_id`) i odwrotna
   przy zdejmowaniu — zgodne ze schematem; potwierdzone w cudzym kodzie
   (`EnrollmentModel::do_enroll()` nadaje `pending` tylko przy
   `is_course_purchasable()`).
4. **Transakcje Pluginu 1** — `Aai_Sklep_Zapis::w_transakcji()` ma
   `ROLLBACK` w `catch` i ponowne rzucenie (`:940-951`); `wstaw/zmien/skasuj`
   sprawdzają `false` i rzucają. Cudzy kod nie jest wołany wewnątrz
   transakcji, a `do_action` idzie PO `COMMIT`.
5. **Kolizja identyfikatorów post ↔ zamówienie pod HPOS** — sprawdzałem,
   czy `before_delete_post` na zwykłym wpisie może trafić w cudze
   zamówienie o tym samym id. **Nie może**: HPOS rezerwuje id przez
   `maybe_create_backup_post()` → `wp_insert_post()` placeholder
   (`OrdersTableDataStore.php:2344-2363`), więc sekwencje są wspólne.
6. **Refund → ponowny zakup** — `do_enroll()` bada `is_enrolled()` z
   domyślnym `$is_complete = true`, więc zapis `refunded`/`cancelled` go nie
   zatrzymuje i powstaje nowy zapis z metą nowego zamówienia. Klient kupuje
   drugi raz poprawnie; `stan_posiadania()` nie blokuje.
7. **Zalogowanie się dopiero w kasie** — koszyk z sesji jest ponownie
   walidowany: `WC_Cart_Session::get_cart_from_session()` woła
   `woocommerce_add_to_cart_validation` (`class-wc-cart-session.php:615`),
   więc kurs, który klient już ma, wypada z koszyka po zalogowaniu.
8. **`zamowienie_znika()` przy zamówieniu spoza kasy** — zamek
   `is_tutor_order() || same_kursy()` wygląda na furtkę do odbierania
   dostępu, którego zamówienie nie nadało; sprawdziłem: `is_tutor_order()`
   i `get_course_enrolled_ids_by_order_id()` czytają **tę samą rodzinę
   met**, więc gdy jedno milczy, drugie oddaje pustą listę. Cudzych zapisów
   nie ruszamy. Bez zarzutu.
9. **Priorytet 1 na `woocommerce_before_delete_order`** — konieczny,
   bo `WC_Post_Data::before_delete_order()` na 10 kasuje pozycje zamówienia.
   Zgodne z lekcją 4 z 0.65.0.
10. **`wp_mail()` — obsługa `false`, wersja tekstowa i typ treści** —
    `phpmailer_init` zdejmowany w `finally`, `wp_mail_content_type` świadomie
    nieużywany (byłby globalny). Bez zarzutu.
11. **`Aai_Sklep_Widok::cta_kursu()` i `cena_grosze()`** — pilnują kształtu
    odpowiedzi filtra (uzupełniają brakujące klucze, odrzucają pusty adres,
    odrzucają cenę ujemną), więc cudza wtyczka podpięta pod szew nie
    zrobi z przycisku martwego odnośnika.
12. **`Aai_Sklep_Moje` i `Aai_Sklep_Widok`: 0 miejsc zapisu.** Warstwy
    czysto odczytowe — postępu nie liczą same, pytają Tutora.
13. **`napraw_cene_efektywna()`** — `finally` przywraca cenę i status,
    a metoda kończy WERYFIKACJĄ (`get_price('edit') === oczekiwana`), więc
    cztery nieprawdzone `save()` w środku są domknięte skutkiem.
14. **`produkty_na_szkic()` przy deaktywacji** — jedyne miejsce w całej
    wtyczce, które sprawdza `wp_update_post` i raportuje listę nieudanych.
    To jest wzorzec do przepisania w Z-6.

Po stronie sklepu (`class-aai-sklep-tutor.php`, `-moje.php`):

15. **`znajdz_po_uuid()` odrzuca pusty uuid** (`:901-903`) — obrona po
    sweepie P5 działa; `kupujacy()` (`:938`) i `adres_lekcji()` (`:964`)
    mają własne bramki na `''`. (Osobną sprawą jest kosz — Z-9.)
16. **`rozjazdy_postu()` jest JEDNYM źródłem** i dla decyzji „czy pisać"
    (`:558`), i dla „czy się rozjechało" (`:364`) — nie ma stanu, który
    zapis uznaje za zgodny, a kontrola za rozjazd.
17. **`wp_slash` przy każdym `update_post_meta` i przy `wp_insert/update_post`**
    (`:562`, `:565`, `:587`, `:589`) — zgodne z pułapką z W2; komentarz
    `:575-586` poprawnie rozdziela Posts API od `$wpdb`.
18. **Wzorzec „wpis bez znacznika tożsamości" NIE powtarza tu przypadku
    produktu WooCommerce.** `wp_insert_post` jest w `:565`, a
    `_aai_zrodlo_uuid` 22 linie dalej (`:587`) — ale kontrola ma dla tego
    stanu regułę: `porownaj()` (`:377-385`) zgłasza wpis bez uuid jako
    „obcy" z kodem 1. Ryzyko jest **wykrywalne**, nie ciche.
19. **Kolejność „najpierw dzieci, potem rodzic"** przy kasowaniu
    (`:302-306`, `:692-717`) oraz **stanięcie zamiast utworzenia sieroty**
    przy braku rodzica (`:252-258`) — drzewo jest w każdej chwili poprawne.
20. **`wp_insert_post`/`wp_update_post` z `$wp_error = true` i sprawdzeniem**
    (`:562-573`) — dwa jedyne miejsca, w których porażka mogłaby przejść
    cicho, są zamknięte i rzucają `Aai_Sklep_Blad_Zapisu`.
21. **`linie_tutora()`** (`:1047-1055`) — asercja zatrzymuje spłaszczenie
    o nieznanym kształcie, zamiast wydrukować klientowi JSON (naprawa
    0.39.1 trzyma).
22. **`Aai_Sklep_Moje` nie liczy postępu sam** — pyta o niego
    `is_completed_lesson()` Tutora. Brak drugiej kopii tej samej prawdy,
    brak klasy BLAD-015.
23. **`powrot_po_logowaniu()`** (`:99-106`) przepuszcza cel przez
    `wp_validate_redirect` — otwartego przekierowania nie ma;
    `adres_logowania()` ma poprawny wariant awaryjny bez WooCommerce.
24. **`Aai_Sklep_Import`** wstrzymuje synchronizację i wznawia ją
    w `finally` (`:119`, `:158-160`) — wyjątek nie zostawia jej wstrzymanej.
25. **Kolizja id post ↔ zamówienie pod HPOS** (punkt 5 wyżej) zamyka też
    obawę o `before_delete_post` w `Aai_Sklep_Tutor`.

---

## Czego nie da się rozstrzygnąć statycznie — do pomiaru na żywej instalacji

1. **Z-1**: skasować/przenieść do kosza stronę polityki prywatności na
   `:8892` i obejrzeć zdanie pod formularzem kasy. Oczekiwanie: wraca
   angielskie/polskie zdanie WooCommerce z „Warunki i zasady" bez odnośnika.
2. **Z-2**: wstawić do `dostawy` wiersz `mail_konta/<nieistniejący user>`
   z `wynik = 'blad: …'`, uruchomić `wp aai-platnosci sprawdz` (kod bez
   potoku) i `./postaw.sh`. Oczekiwanie: oba kod 1, `--ponow` nie pomaga.
3. **Z-3**: zablokować `delete_post_meta` filtrem `delete_post_metadata` na
   `_tutor_course_product_id`, ukryć kurs w kreatorze, sprawdzić meta wpisu
   Tutora i `wp aai-platnosci sprawdz`. Oczekiwanie: para
   `product_id` + `price_type=free`, kontrola zielona.
4. **Z-8**: podstawić filtr blokujący zapis statusu zapisu, skasować
   zamówienie i sprawdzić `is_enrolled()` po fakcie. Oczekiwanie: dostęp
   zostaje, kontrola zielona.
5. **M2(b) i M2(d)**: ustawić `admin_email` na `wordpress@127.0.0.1` przy
   pustym `woocommerce_email_from_address`, kupić kurs, obejrzeć nagłówek
   `From` **naszych** maili w Mailpicie (bramka mierzy dziś tylko pocztę
   rdzenia).
6. **M2(a)**: zalogowany klient kupuje drugi kurs, zmieniając w kasie adres
   rozliczeniowy. Sprawdzić, na który adres poszło potwierdzenie Woo, a na
   który mail 2.
7. **Z-0**: ukryć kurs („Ukryty" w kokpicie) i wejść na `/szkolenia/moje/`
   kontem, które ten kurs kupiło. Oczekiwanie: pusta strona z napisem
   „nie ma jeszcze żadnego kursu" i brak pozycji „Moje kursy" w menu, przy
   dostępie do lekcji dalej działającym. **To jest jedyny pomiar z tej
   listy, który da się zrobić w minutę i który rozstrzyga o wadze duży.**
8. **Z-9 — czy kosz w ogóle występuje na tej instalacji.** Pokazałem, że
   `'any'` go pomija i że wtedy powstaje duplikat; nie wiem, czy dziś
   w `wp_posts` leży wpis Tutora w koszu. Rozstrzyga:
   `SELECT post_type, COUNT(*) FROM wp_posts WHERE post_status='trash'
   AND post_type IN ('courses','topics','lesson') GROUP BY 1`
   oraz zliczenie uuid-ów występujących więcej niż raz. **Trafienie
   promuje Z-9 na duży.**
9. **Z-9 — który wpis wygrywa przy dwóch z identycznym `post_date`.**
   `get_posts` sortuje `date DESC`, ale przy równej sekundzie tiebreaker
   zależy od planu MySQL. Skutek zachodzi tak czy inaczej; niepewne jest
   tylko, po której stronie wypadnie.
10. **Z-10**: dodać lekcję w Course Builderze Tutora pod istniejącym
    modułem, zapisać kurs w kreatorze, sprawdzić, czy wpis istnieje.
    Statycznie widzę tylko, że `in_array( '', $zostaja, true )` jest zawsze
    `false`.
11. **Z-11**: realny czas `synchronizuj_kurs()` na 87 wpisach i czy mieści
    się w limitach hostingu docelowego.
12. **Czy Tutor pilnuje dostępu własnym szablonem**, gdy kurs zniknie
    z naszych tabel przy zostawionej kopii (`Aai_Sklep_Lekcja::policz()`
    zwraca wtedy `null`, a proza siedzi w `post_content` wpisów `publish`).
    Rozstrzyga żądanie na adres lekcji jako gość po takim usunięciu.
13. **`wstrzymaj()`/`wznow()` to `bool`, nie licznik**
    (`class-aai-sklep-tutor.php:134`, `:178-185`) — zagnieżdżone użycie
    wznowiłoby przedwcześnie. Dziś woła je tylko `Aai_Sklep_Import`, więc
    scenariusza nie ma; przy drugim kliencie tej pary sprawdzić ponownie.
14. **Koszt `sprawdz` przy dużym sklepie**: `bledy_dostaw()` czyta CAŁĄ
   tabelę `dostawy` bez limitu i robi jedno zapytanie **na każde**
   zamówienie `completed` (`cli.php:390-430`) — świadomy wybór (komentarz
   `:376-388`), ale koszt rośnie liniowo bez sufitu. Zmierzyć na 1000+
   zamówień; dziś na `:8892` jest ich 0, więc statycznie nie da się nic
   powiedzieć.
8. **Pamięć `Aai_Sklep_Widok::cena_grosze()`** to `static $pamiec` wewnątrz
   metody, bez drogi unieważnienia — w przeciwieństwie do
   `Aai_Platnosci_Zapis::$pamiec_produktow`, którą świadomie wyniesiono do
   właściwości klasy właśnie po to, żeby dało się ją wyczyścić
   (`zapis.php:64-70`). Nie znalazłem dziś ścieżki, w której jedno żądanie
   zmienia cenę i potem ją czyta — ale asymetria jest realna i tania do
   zamknięcia.

---

## Miejsca zapisu po stronie sklepu (uzupełnienie tabeli)

`class-aai-sklep-moje.php` — **0 miejsc zapisu**, plik czysto odczytowy
(jedyna zmiana stanu to `wp_safe_redirect` + `exit`, `:182`).
`class-aai-sklep-widok.php` — **0**.
`class-aai-sklep-tutor.php` — **10**:

| # | linia | co pisze | porażka | sprawdza | co po przerwaniu TU |
|---|---|---|---|---|---|
| 58 | 305 | `wp_delete_post( $id_kursu, true )` — kopia kursu, **force, bez kosza** | `false`/`null` | NIE | kurs zostaje w Tutorze, u nas go nie ma → `porownaj()` zgłosi „sierota". **Wykrywalne** |
| 59 | 416 | `delete_option('aai_sklep_tutor_blad')` | `false` | NIE | ostrzeżenie zostaje mimo udanej naprawy — nadmiarowo, nieszkodliwie |
| 60 | 562 | `wp_update_post( wp_slash($dane), true )` | `WP_Error` | **TAK** (`:569`) | wpis stary → `rozjazdy_postu()` wykryje |
| 61 | 565 | `wp_insert_post( wp_slash($dane), true )` | `WP_Error` | **TAK** (`:569`) | wpis bez `_aai_zrodlo_uuid` (nadawany 22 linie dalej) → kontrola nazywa go „obcy", kod 1. **Wykrywalne** |
| 62 | 587 | `update_post_meta( '_aai_zrodlo_uuid' )` | `false` (także przy identycznej wartości) | NIE | jw. |
| 63 | 589 | `update_post_meta( $klucz )` — 5 meta kursu + 4 sekcje Tutora + 3 meta lekcji | `false` | NIE | meta niekompletne → `rozjazdy_postu()` porównuje pole po polu, następny zapis dociągnie. **Samoleczące** |
| 64 | 707 | `wp_delete_post( $id_lekcji, true )` — nadmiar, force | `false`/`null` | NIE | **Z-10** — kasuje też cudze wpisy |
| 65 | 715 | `wp_delete_post( $id_modulu, true )` — nadmiar, force | `false`/`null` | NIE | lekcje z ważnym uuid zostają z martwym `post_parent`; następna synchronizacja je przepnie |
| 66 | 744 | `set_post_thumbnail()` | `false` | NIE | **NIEWYKRYWALNE** — `_thumbnail_id` nie należy do żadnej mapy w `rozjazdy_postu()`; miniatura nigdy też nie jest ZDEJMOWANA (wczesne `return` na `:739` i `:743`). Skutek dotyczy wyłącznie widoku właściciela w panelu Tutora, więc **mały** |
| 67 | 1082 | `update_option('aai_sklep_tutor_blad', …, false)` | `false` | NIE | nieudana kopia bez śladu w kokpicie; rozjazd i tak wykryje `porownaj()` |

Do tego **Z-13 (mały)**: `zapomnij_blad()` (`class-aai-sklep-cli.php:339`)
wykonuje się **bezwarunkowo i poza pętlą**, także przy
`wp aai-sklep sync <slug>` dotyczącym JEDNEGO kursu — a opcja
`aai_sklep_tutor_blad` ma jedną komórkę. Udana synchronizacja kursu 1 gasi
więc ostrzeżenie o kursie 2. Ginie sygnał, nie dowód (`porownaj()`
w pełnym przebiegu i tak rozjazd wykryje) — stąd mały. To ta sama choroba,
którą Plugin 2 wyleczył u siebie, przechodząc z jednego slotu na mapę
`uuid → komunikat` (`class-aai-platnosci-komunikaty.php:26-32`).

**Razem: 67 miejsc trwałego zapisu w całym terenie.**

**Transakcji po stronie kopii do Tutora NIE MA żadnej** — patrz Z-11.

---

## Czego ten dokument NIE obejmuje

- Znaleziska już potwierdzone gdzie indziej: okno bez znacznika przy
  tworzeniu produktu, zamówienie mieszane zostawiające `wp_tutor_earnings`
  i notatki, kolektor CSP, dziennik logowań bez sufitu, maska loginu.
- Ani jednego pomiaru uruchomieniowego — patrz lista wyżej.

---

## Weryfikacja Z-0 przez agenta głównego (krytyka) — 2026-09-05 16:29

**POTWIERDZONE URUCHOMIENIOWO, w całości.** Tor A (`:8892`), konto `klient-test` (id 2),
oba kursy, `wp eval` z `wp_set_current_user()`.

| Stan kursów | zapisy w Tutorze | `ma_kursy()` | `kursy()` | co widzi klient |
|---|---|---|---|---|
| oba `published` (wyjściowy) | 2 | TAK | **2** | obie pozycje |
| jeden `archived` | 2 | TAK | **1** | ukryty kurs **znika z listy** |
| oba `archived` | **2** | **NIE** | **0** | pozycja „Moje kursy" **znika z menu**, strona mówi, że nie ma żadnego kursu |
| przywrócone `published` | 2 | TAK | 2 | stan wyjściowy |

**Mechanizm potwierdzony statycznie:** `Aai_Sklep_Moje::ma_kursy()` (`:223`) i `::kursy()`
(`:258`) iterują `Aai_Sklep_Odczyt::lista_kursow()`, a ta ma `WHERE c.status = 'published'`
(`class-aai-sklep-odczyt.php:64`). `archived` = „Ukryty" (`class-aai-sklep-kontrakt.php:87`).

**To NIE jest przeoczenie — to decyzja unieważniona przez późniejszą decyzję właściciela.**
Docblock nad `ma_kursy()` rozumuje wprost: *„sprawdzamy, czy choć jeden zapis wskazuje kurs,
który u NAS istnieje i jest opublikowany — bo tylko taki ma co pokazać. Bez tego drugiego
warunku pozycja »Moje kursy« prowadziłaby czasem do pustej listy."* Rozumowanie było poprawne
w chwili pisania. **Decyzja C1 z 2026-08-31** („ukrycie kursu przestaje odbierać dostęp
kupującym") zmieniła wymaganie i nikt do tego kodu nie wrócił.

**Dostęp formalnie zostaje, praktycznie znika.** Zapisy w Tutorze są nienaruszone (2), więc
bezpośredni adres lekcji działa — i to jest jedyne, co sprawdzają obie bramki dowodzące C1
(`smoke-wp-lekcja:516`, `przelot-calosc:200`). **Sprawdzają drogę, której klient nie zna.
Jedynej, którą ma — „Moje kursy" — nie sprawdza nic.** Dziesiąta w tym projekcie bramka
mierząca nie to, co obiecuje.

**Higiena pomiaru:** status zmieniany bezpośrednim `UPDATE` na naszej tabeli (to jest dokładnie
to, co utrwala przycisk „Ukryj"), z pominięciem warstwy zapisu — więc **nie powstały wpisy
audytu ani kopia w Tutorze nie została ruszona**. Po przywróceniu: nasze tabele i media
**identyczne co do skrótu** ze zrzutem `k-PROTO-po`; jedyne różnice to `wp_options`
(+2 transienty WP-CLI) i `wp_woocommerce_sessions` (+4, spoza tego pomiaru).
Zastrzeżenie uczciwe: `courses.updated_at` zmieniło się przy `UPDATE` i narzędzie liczników
tego nie widzi (liczy wiersze i `auto_increment`); funkcjonalnie bez znaczenia — w tym
projekcie `updated_at` i tak nie znaczy „zmiana treści".
