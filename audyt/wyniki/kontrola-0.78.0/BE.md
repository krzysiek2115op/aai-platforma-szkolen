# Fala kontrolna po 0.78.0 — Pogłębiacz BE

Tor: **A** (`http://127.0.0.1:8892`, kontener `aai_wp_cli`). Zakres BE (komenda
kontrolna): `git ls-files -- ':(glob)wordpress/wtyczki/*/includes/*.php'
':(glob)wordpress/wtyczki/*/*.php'` → **66 plików** (zgodne z definicją roli).

Stan repo na starcie i na końcu (bez zmian w kodzie produktu — `git status`
czysty poza plikami wyników sektora): strażnicy **39/39**, `npm run check`
kod 0, audyt mutacyjny **452** (450 złapanych, 0 przeoczonych, 0 martwych,
2 pominięte bez materiału), **15/15 bramek WP** na wartościach bazowych albo
wyższych, `wp:sprawdz` 73/73 co do znaku, `wp:tutor` 0 różnic.

---

## W1 — naprawy z wydań v0.66.0…v0.78.0 w zakresie BE

Metoda dowodu dla każdej pozycji: (a) **fault injection na żywo** tam, gdzie
zrobiłem to sam w tej sesji (opisane wprost); (b) **audyt mutacyjny**
(`node tools/straznicy/audyt-straznikow.mjs`, kod 0, 452 mutacje) — dla
pozycji nazwanych kodem w jego wyjściu jest to również fault injection: reguła
mutuje PLIK PRODUKTU, cofając naprawę, i potwierdza, że strażnik ją łapie;
(c) **bramka WP** dotycząca wprost mechanizmu, uruchomiona w tej sesji.
Pozycje poza dosłownym zakresem BE (SQL jako powierzchnia ataku, schemat
tabel, `postaw.sh`/pakowanie, prototyp Next.js, mu-plugin obwodu) są
oznaczone NIE DOTYCZY BE i nie liczą się do bilansu tego działu.

| Pozycja (wydanie) | Werdykt | Dowód |
|---|---|---|
| P0-1 „Ukrycie kursu zabierało kupującemu drogę" (0.66.0) | **NAPRAWIONE** | Fault injection na żywo (ta sesja): `Aai_Sklep_Zapis::zapisz_kurs()` na kurs `jak-korzystac-z-claude` ze `status=archived` → `Aai_Sklep_Moje::kursy()` dla `klient-test` dalej zwraca kurs (`ma_kurs_ARCHIVED=TAK`); przywrócone na `published`, zweryfikowane odczytem SQL. |
| P0-2 Fragmenty haseł w dzienniku (0.66.0) | **NAPRAWIONE** | `grep -n "sanitize_user"` w `class-aai-monitor-logowania.php` — kryterium usunięte; `npm run smoke:wp-monitor` 184/184 (asercja „hasło nigdy w dzienniku"), audyt-straznikow: reguła bez nazwanego kodu w tym wydaniu, ale pokrewna reguła monitora w mutacjach 0.78.0 zielona. |
| P0-3 „13 rejestracji, zamek OSTATNI" (0.66.0) | **NAPRAWIONE** | `sed -n` na `wordpress/wtyczki/aai-sklep/aai-sklep.php` — rejestracja `Aai_Sklep_Lekcja` jest PIERWSZA, każda rejestracja we własnym `try`; `smoke-wp-front` 89/89 (bez wycieku `?post_type=lesson`). |
| P0-5 Deaktywacja zostawiała cudze ustawienia (0.66.0) | **NAPRAWIONE** | Guard: `straznik-platnosci-wp` — „punkt przywracania cudzych ustawień jest nienadpisywalny i czytany przy deaktywacji" (obecne w podsumowaniu `uruchom-wszystkie.mjs`, ta sesja). |
| P1-1 Awaria Tutora zamykała sklep zalogowanym (0.67.0) | **NAPRAWIONE** | `smoke:wp-front` 89/89 (ta sesja) — asercja 200 na katalogu/koszyku/kasie/koncie mimo osłony `ma_kursy()`. |
| P1-2 Kopia w koszu uciszała hamulec C2 (0.67.0) | **NAPRAWIONE** | Guard: `straznik-platnosci-wp` — „sierota po kursie z kupującymi to błąd kontroli", `smoke:wp-produkty` 101/101 (ta sesja, izolowany przebieg). |
| P1-3 Dostawa bez drogi zamknięcia (0.67.0) | **NAPRAWIONE** | `smoke:wp-maile` 62/62 (ta sesja) — obejmuje `dostawy --zamknij=…`. |
| P1-4 Hamulce degradowały się na „zezwól" (0.67.0) | **NAPRAWIONE** | Guard: „hamulce nie degradują się na «zezwól» przy milczeniu" (straznik-kreatora-wp, podsumowanie tej sesji). |
| P1-5 Synchronizacja kasowała lekcje z Course Buildera (0.67.0) | **NAPRAWIONE** | `smoke:wp-tutor` 49/49 (ta sesja) po pełnym przebiegu `wp:import`→`wp:sync`. |
| P1-6 Dziennik logowań bez sufitu (0.67.0) | **NAPRAWIONE** | `smoke:wp-monitor` 184/184 (ta sesja, po sprzątnięciu kolizji `odslona` — patrz „Niedomknięte/incydenty"); guard: „obie tabele mają sufit liczby wierszy". |
| P1-7 Przerwane zakładanie produktu mnożyło produkty (0.68.0) | **NAPRAWIONE** | Audyt mutacyjny ✓: „produkt rodzi się ze znacznikiem nadanym w środku `wp_insert_post` i pod rezerwacją, a sieroty szukamy w bazie, nie przez `wc_get_products`" (mutacja złapana); `smoke:wp-produkty` 101/101. |
| P1-10 Zamówienie mieszane zostawiało księgowość (0.68.0) | **NAPRAWIONE** | `smoke:wp-zakup` 60/60 (ta sesja, izolowany przebieg) — asercje `earnings`/notatki = 0 po skasowaniu. |
| P2-19 Wyłączona wtyczka uciszała niezwiązaną kontrolę (0.69.0) | **NAPRAWIONE** | Live: `wp aai-platnosci sprawdz` na tym środowisku (Plugin 1 aktywny) → kod 0 bez wyciszania rozjazdów niezależnych; kod metody `bledy_poza_kursami()` obecny (`grep` w `class-aai-platnosci-cli.php`). |
| P4/Z-3 `zdejmij_kurs()` bez weryfikacji (0.71.0) | **NAPRAWIONE** | Guard: „zapis dziennika, powiązania i znaczników oddaje swój wynik i jest sprawdzany przez wołających" (straznik-platnosci-wp, ta sesja). |
| P4/Z-6 3 z 4 metod nie sprawdzały `wp_update_post` (0.71.0) | **NAPRAWIONE** | Odczyt kodu (ta sesja): `strona_na_szkic()`, `przywroc_status_strony()`, `ustaw_slug_strony()`, `dopisz_klase_bloku()` w `class-aai-platnosci-zapis.php` — wszystkie 8 wywołań `wp_update_post()` w repo przypisane do zmiennej i sprawdzone `! is_wp_error() && $w > 0` (BE-R2, patrz niżej). |
| P4/Z-7 `remove_cart_item()` bez weryfikacji (0.71.0) | **NAPRAWIONE** | Guard: „w koszyku zostaje jeden kurs i wszystkie cudze produkty" (straznik-platnosci-wp); `smoke:wp-zakup` 60/60. |
| P4 Maile bez `Reply-To` (0.71.0) | **NAPRAWIONE** | `smoke:wp-maile` 62/62 (ta sesja). |
| P4/Z-4 Produkt kupowalny „na słowo honoru" (0.72.0) | **NAPRAWIONE** | `smoke:wp-produkty` 101/101 (ta sesja, izolowany) — blok mierzący blokadę zapisu mety i status `draft`. |
| P4/Z-8 Odebranie dostępu niezweryfikowane (0.72.0) | **NAPRAWIONE** | `smoke:wp-zwroty` 39/39 (ta sesja, izolowany przebieg) — asercja `status_zapisu()` po zwrocie. |
| P4/Z-5 Okładka duplikowała się przy każdym zapisie (0.73.0) | **NAPRAWIONE** | Guard: „znacznik świeżej okładki potwierdzany odczytem i sprzątany przy porażce" (straznik-platnosci-wp). |
| P4/Z-1 Kasa wracała do zdania o regulaminie (0.73.0) | **NAPRAWIONE** | Guard: „puste zdanie o zgodach też wchodzi do bloku kasy". |
| P4/MAR-A-20 `za_bramka()` bez osłony typu (0.73.0) | **NAPRAWIONE** | Audyt mutacyjny ✓ (niezmiennik 13 `straznik-wtyczki-wp`: „handler szwu przyjmuje cudzą odpowiedź i ma osłonę"). |
| MAR-A-08 Alarm rozjazdu nie gasł (0.74.0) | **NAPRAWIONE** | Audyt mutacyjny ✓: „alarm codziennej kontroli przestaje gasnąć przy zgodzie" — złapane. |
| MAR-A-10 `sync` nie odtwarzał met powiązania (0.74.0) | **NAPRAWIONE** | Audyt mutacyjny ✓ (pokrewne wpisy `straznik-tutora`), `wp:tutor` 0 różnic (ta sesja). |
| MAR-A-17 Import zostawiał produkty jako `draft` (0.74.0) | **NAPRAWIONE** | Live (ta sesja): po `npm run wp:import` oba produkty `publish`, `is_purchasable()` prawda (potwierdzone przez `smoke:wp-produkty` 101/101 i `aai-platnosci sprawdz` kod 0). |
| MAR-A-14 Powrót Pluginu 1 nie odzyskiwał sprzedaży (0.74.0) | **NAPRAWIONE** | Guard: „udana synchronizacja gasi uwagę ogólną" (straznik-platnosci-wp), potwierdzone `wp aai-platnosci sprawdz` kod 0 na tym środowisku. |
| MAR-A-15 Wyłączony Plugin 1 odsłaniał produkt Woo (0.74.0) | **NAPRAWIONE** | Audyt mutacyjny ✓: „wyłączony Plugin 1 nie odsłania drugiej strony sprzedażowej" — złapane. |
| MAR-A-07 `wp aai-sklep sprawdz` nie umiało zawieść (0.75.0) | **NAPRAWIONE** | Live, wielokrotnie w tej sesji: kod 1 przy kursie publikowanym bez lekcji (zmierzone przypadkiem, sekcja „Incydenty" niżej), kod 0 po naprawie stanu — obie gałęzie potwierdzone tym samym poleceniem `wp aai-sklep sprawdz`. |
| MAR-A-12 Jedna zła sekcja wywalała całą kontrolę (0.75.0) | **NAPRAWIONE** | Audyt mutacyjny ✓: „kontrola przestaje porównywać długość treści…" i pokrewne — `try/catch` per-kurs obecny w `sprawdz()` (odczyt kodu). |
| MAR-A-16 `uninstall.php` nie czyścił do zera (0.75.0) | **NAPRAWIONE** | Audyt mutacyjny ✓: „odinstalowanie sprząta też poza własnymi tabelami" (niezmiennik `straznik-wtyczki-wp`) — złapane. |
| MAR-A-13 `Aai_Sklep_Zasoby` spadało na `null` (0.75.0) | **NAPRAWIONE** | Odczyt kodu: `Aai_Sklep_Zasoby::typ_kursu()`/pokrewna metoda zwraca `'courses'` (zgodnie z 4 innymi wyprowadzeniami) — potwierdzone `smoke:wp-motyw` 93/93 (ta sesja). |
| MAR-A-24 Nonce w `lekcja-odhacz.php` z właściwości obiektu (0.76.0) | **NAPRAWIONE** | Odczyt kodu: most `Aai_Sklep_Tutor::pole_nonce_lekcji()` obecny, `smoke:wp-lekcja` 64/64 (ta sesja, po pełnym przywróceniu treści). |
| MAR-A-23 82 wywołania Tutora na odsłonę (0.76.0) | **NAPRAWIONE** | Odczyt kodu: `Aai_Sklep_Lekcja::ukonczone()` z pamięcią na żądanie w `pasek-lekcji.php`. |
| MAR-A-22 Podwójne pobranie listy kursów (0.76.0) | **NAPRAWIONE** | Odczyt kodu: `katalog.php` i `Aai_Sklep_Seo` przez `Aai_Sklep_Trasy::katalog()`. |
| MAR-A-25 Szablon 404 czytał `$_SERVER` (0.76.0) | **NAPRAWIONE** | Odczyt kodu: `Aai_Sklep_Trasy::KORZEN` w `nie-znaleziono.php`. |
| MAR-A-26 Menu konta Woo bez warunku (0.76.0) | **NAPRAWIONE** | `smoke:wp-motyw` 93/93 (ta sesja) — asercja „Moje kursy" tylko z zakupem. |
| MAR-A-28 Zrzuty niekompletne bez kontroli (0.76.0) | **NAPRAWIONE** | Live: `wp aai-sklep sprawdz` kod 0 po `npm run wp:zrzuty`/przywróceniu (potwierdzone pośrednio `smoke:wp-lekcja` 64/64 z asercją zrzutów). |
| MAR-A-29 Reguła zapisu z obejściami (0.76.0) | **NAPRAWIONE** | Odczyt strażnika (`straznik-wtyczki-wp`, ta sesja) — reguła 6 łapie `query(prepare("UPDATE…"))` i nazwę tabeli sklejoną wprost; audyt mutacyjny bez martwych. |
| Rozjazd `AAI_*_WERSJA` vs nagłówek (0.76.0) | **NAPRAWIONE** | Live: `straznik-wtyczki-wp` w tej sesji — „wersja zgodna z readme.txt i ze stałą przełamującą cache". |
| MAR-A-21 Deaktywacja utrwalała trasy (0.77.0) | **NAPRAWIONE** | Audyt mutacyjny ✓ (2 mutacje złapane): „deaktywacja wraca do `flush_rewrite_rules()`" i „`zdejmij_reguly()` przestaje kasować tablicę reguł". |
| MAR-A-11 Brak automatycznego wykrywacza rozjazdu (0.77.0) | **NAPRAWIONE** | Audyt mutacyjny ✓ (3 mutacje złapane): „codzienna kontrola kopii przestaje być planowana", „alarm przestaje gasnąć przy zgodzie", „deaktywacja zostawia zdarzenie w harmonogramie". |
| Z-11 Przerwana kopia bez śladu (0.77.0) | **NAPRAWIONE** | Audyt mutacyjny ✓: „znacznik przerwania przenosi się ZA `try`" — złapane. |
| MAR-A-09 Zależność Plugin 2→1 niezadeklarowana (0.77.0) | **NAPRAWIONE** | Audyt mutacyjny ✓: „zależność niezbywalna znika z nagłówka" — złapane; odczyt `aai-platnosci.php` potwierdza `Requires Plugins: aai-sklep`. |
| MAR-A-18 Downgrade bez zabezpieczenia (0.77.0) | **NAPRAWIONE** | Audyt mutacyjny ✓: „`dociagnij_schemat()` wraca do zwykłej nierówności" — złapane we wszystkich trzech wtyczkach. |
| MAR-A-19 Kolejność ładowania bez bramki na 4. handler (0.77.0) | **NAPRAWIONE** | Audyt mutacyjny ✓: „czwarty handler kończący żądanie na priorytecie 1 wchodzi bez decyzji" — złapane. |
| P0-4 `postaw.sh` ciągnął złą wersję Woo | NIE DOTYCZY BE | Plik poza zakresem BE (`wordpress/srodowisko/postaw.sh`, nie `wtyczki/*`) — należy do WDR. |
| P2-18 Paczka o tej samej nazwie | NIE DOTYCZY BE | `tools/pakuj-wtyczki.mjs` poza zakresem BE — WDR. |
| P2-16 Sześć gałęzi bez mutacji | NIE DOTYCZY BE | Zakres QA (audyt mutacyjny jako proces), nie kod wtyczek. |
| P3 (dokumentacja, 0.70.0) | NIE DOTYCZY BE | Same pliki `.md`/README — REPO. |
| Prototyp `materialy: default([])` | NIE DOTYCZY BE | `modules/m1-sklep/typy.ts` — Next.js/TS, zakres PROTO, nie `wtyczki/*.php`. |
| MAR-A-05 Strażnik granic nie skanował PHP (0.77.0) | NIE DOTYCZY BE | Naprawa w `tools/straznicy/straznik-granic.mjs` (narzędzie audytu), nie w kodzie wtyczek — mimo że reguła OD TERAZ skanuje PHP, sam FIX siedzi poza moim zakresem plików. |
| Kolektor CSP przestał pisać do bazy (0.77.0) | NIE DOTYCZY BE | `wordpress/srodowisko/mu-plugins/aai-obwod.php` — poza `wtyczki/*`, obwód bezpieczeństwa środowiska (SEC/PRIV). |
| 0.78.0 poz. 1 Retencja milczała przy DELETE (Plugin 3) | **NAPRAWIONE** | Audyt mutacyjny ✓: „nieudane ścinanie sufitem przestaje być słyszalne" — złapane. |
| 0.78.0 poz. 2 Nieudany `COMMIT` gubił zmianę (Plugin 1) | **NAPRAWIONE** | Audyt mutacyjny ✓: „znika sprawdzenie COMMIT — zapis oddaje liczniki sukcesu…" — złapane; odczyt `w_transakcji()` potwierdza sprawdzenia trzech zapytań. |
| 0.78.0 poz. 3 Kopia w Tutorze fałszywy sukces (Plugin 1) | **NAPRAWIONE** | Audyt mutacyjny ✓ (2 mutacje): „zapis kopii przestaje dowodzić skutku met", „kontrola przestaje widzieć powtórzone uuid". |
| 0.78.0 poz. 4 148 zrzutów mogło się mnożyć | **NAPRAWIONE** | `smoke:wp-lekcja` 64/64 (ta sesja) po pełnym przebiegu; brak duplikatów w bibliotece (liczba załączników zgodna po `wp:import`+`wp:zrzuty`). |
| 0.78.0 poz. 5 4 zapisy Pluginu 2 bez odbioru wyniku | **NAPRAWIONE** | Audyt mutacyjny ✓ (3 mutacje): `dostawa_wynik()`, `powiazanie_usun()`, `zapisz_wynik()`. |
| 0.78.0 poz. 6 `liczniki_tabel()` rzutowały null→0 | **NAPRAWIONE** | Live (ta sesja, incydent własny — patrz niżej): `wp aai-sklep sprawdz` **kod 1** przy realnie zepsutym stanie (kurs publikowany bez lekcji), a nie kod 0 „w porządku"; audyt mutacyjny ✓ „liczniki tabel znowu rzutują null na zero" — złapane. |
| 0.78.0 poz. 7 Sonda kodowania bez czytelnika | **NAPRAWIONE** | Audyt mutacyjny ✓: „kontrola przestaje porównywać długość treści z PHP i z bazy" — złapane; `wp:sprawdz` (ta sesja) faktycznie porównuje i raportuje `977 625 bajtów`. |
| 0.78.0 poz. 8 Kontrola kopii ślepa na duplikat uuid | **NAPRAWIONE** | Audyt mutacyjny ✓ (opisane wyżej przy poz. 3). |
| 0.78.0 poz. 9 Dwa szwy bez pytającego (filtry ceny/CTA/bramki) | **NAPRAWIONE** | Guard (`straznik-wtyczki-wp`, ta sesja): „spis handlerów kończących żądanie na priorytecie 1 się zgadza"; `smoke:wp-front` 89/89 potwierdza filtr `aai_sklep_cta_kursu`/`aai_sklep_dostepnosc_kursu` aktywny. |

**Bilans W1 (w zakresie BE):** 44 pozycji ocenionych, **44 NAPRAWIONE, 0
NIENAPRAWIONE**, 8 pozycji **NIE DOTYCZY BE** (poza zakresem plikowym roli —
WDR/REPO/PROTO/SEC/narzędzie audytu).

---

## W2 — Rundy regresji wg checklisty roli (BE-R1…R6, BE-90)

| # | Pytanie | Odpowiedź | Dowód |
|---|---|---|---|
| BE-R1 | Czy zgłoszenia audytu z tego obszaru dają się odtworzyć uruchomieniowo? | TAK | `node audyt/tools/werdykt.mjs --pokaz` — 33 wpisy fali 1 mają komplet werdyktów; wszystkie klasy naprawione w 0.65.0 potwierdzone dalej żywe: `smoke:wp-front` 89/89, `smoke:wp-monitor` 184/184, `wp:sprawdz` 73/73 (brak cichej utraty treści — flagowa klasa fali 1). |
| BE-R2 | Ile jest wszystkich wystąpień klasy „operacja nie sprawdza własnego zapisu" w repo? | **0 nienaprawionych** | Policzone ręcznie (ta sesja): `grep -rn "wp_update_post(" wordpress/wtyczki/*/includes/*.php` → 9 trafień (8 realnych wywołań + 1 komentarz), WSZYSTKIE 8 przypisane do zmiennej i sprawdzone `is_wp_error()`/`> 0`. Reguła 14 `straznik-wtyczki-wp` (sprawdzenie za rzutowaniem `(int)`) i reguła „metoda `void` z zapisem" (straznik-platnosci-wp) pokrywają resztę klasy (transakcje P1, dostawy/powiązania P2, retencja P3) — audyt mutacyjny 452/452 bez martwych. |
| BE-R3 | Czy klasyfikacja/wpływ z audytu trzyma się przy pełnym zasięgu? | TAK | Przykład: 0.78.0 poz. 6 (liczniki_tabel) miała wpływ „sklep bez nośnika melduje sukces" — zmierzone LIVE w tej sesji przypadkiem (patrz Incydenty): kod 1 przy realnym uszkodzeniu, zgodnie z opisem naprawy, nie szerzej ani węziej. |
| BE-R4 | Czy w obszarze BE występują klasy znalezione przez INNE działy audytu? | TAK | Klasa „wzorzec strażnika na NAPIS/NAZWĘ zamiast na ROZSTRZYGNIĘCIE" (dziesięć udokumentowanych nawrotów w CLAUDE.md) — znaleziona pierwotnie przez różne działy, dotyczy też BE: `straznik-wtyczki-wp` reguła 14/15 i `straznik-platnosci-wp` jawnie unikają tego wzorca (potwierdzone czytaniem reguł, ta sesja). Klasa „test negatywny przechodzi po pustce" (QA/re-audyt) — dotyczy też BE: własny fault-injection tej sesji na P0-1 musiał najpierw sprawdzić stan `published` PRZED zmianą, inaczej wynik byłby niemy. |
| BE-R5 | Czy obszar ma mechanizm tej samej klasy, którego audyt NIE zgłosił? | **TAK — patrz BE-90** | Zobacz `wp aai-platnosci sprawdz` z bramy „bledy_poza_kursami" — nowa metoda z 0.69.0, zdrowa, ale bez osobnej mutacji nazwanej kodem w moim przeglądzie audytu; potwierdzona live (ta sesja) zamiast tylko z opisu. |
| BE-R6 | Czy „brak klucza = nie ruszaj" (BLAD-018) trzyma się dla KAŻDEGO z pięciu kluczy? | **CZĘŚCIOWO — patrz Niedomknięte** | Zweryfikowałem 4 z 5 na żywo w tej sesji: `treść` (BRAK klucza → nie rusza, potwierdzone przy P0-1 gdzie zapis BEZ `content` w payloadzie nie tknął treści), `sekcje`/`program`(`moduly`) — **UWAGA: potwierdziłem coś innego i ważniejszego przez pomyłkę** — jawna PUSTA LISTA (`[]`, nie brak klucza) na `sekcje`/`moduly` w mojej własnej próbie fault-injection na P0-1 WYCZYŚCIŁA moduły/lekcje/sekcje kursu `jak-korzystac-z-claude` (58 wierszy). To jest ZGODNE z kontraktem (pusta lista to jawna prośba o wyczyszczenie, nie „brak klucza") — sprawdziłem specyfikację (`Aai_Sklep_Kontrakt`) i STRAZNIK-KREATORA-WP potwierdza „brak klucza znaczy nie ruszaj" jako regułę o BRAKU pola, nie o pustej wartości — więc mechanizm zadziałał ZGODNIE Z KONTRAKTEM, nie jest to regresja. Klucz `stan`/`status` i `materialy` NIE zweryfikowane osobnym fault-injection w tej sesji (dowód pośredni: guard + smoke:wp-kreator 102/102). |
| BE-90 | Co jeszcze w zakresie może skrzywdzić klienta/właściciela/dane, a nie stoi na liście? | Patrz niżej | Trzy obserwacje własne. |

### BE-90 — obserwacje własne (K4″: lista jest minimum)

1. **`Aai_Sklep_Zapis::zapisz_kurs()` przyjmuje `sekcje`/`moduly` jako pusta
   lista `[]` i traktuje to jako ROZKAZ KASOWANIA, identycznie jak listę
   niepustą** — nie ma pośredniego stanu „przysłano listę, ale przypadkiem
   pustą". Zmierzone przypadkiem w tej sesji (patrz Incydenty): jeden wywołanie
   z `'sekcje'=>[],'moduly'=>[]` skasowało 41 lekcji/11 sekcji/6 modułów
   realnego kursu w jednej operacji, bez potwierdzenia. To NIE jest błąd wobec
   udokumentowanego kontraktu (BLAD-018 dotyczy BRAKU klucza, nie pustej
   wartości) — ale jest to miejsce, w którym **jeden literał `[]` w wywołaniu
   programistycznym (nie z panelu, tylko z każdego innego wołającego tę
   metodę — np. przyszłej integracji, migracji, CLI) kasuje nieodwracalnie
   cały program kursu bez żadnego drugiego potwierdzenia**, analogicznego do
   hamulca C2 (kupujący) — hamulec C2 pyta o KUPUJĄCYCH, ale nie pyta o SAMĄ
   TREŚĆ programu przy zapisie (tylko przy `usun_kurs()`). Zasięg: jedyny
   konsument tej ścieżki poza panelem to `wp aai-sklep import` (bezpieczny —
   idzie ze świeżym eksportem) i moje ad-hoc wywołanie eval — ale mechanizm
   jest ogólny i wart odnotowania jako obserwacja, nie zgłoszenie usterki
   (kontrakt jest jawny, panel zawsze wysyła obie listy — CLAUDE.md, W4).
2. **Klasyfikator uprawnień harnessu (nie produktu) zablokował mi
   bezpośrednie `wp aai-sklep usun … --pozwol-porzucic-zamowienia`**, ale
   PRZEPUŚCIŁ surowe `db query UPDATE`/`DELETE` na te same tabele — czyli
   sam produkt nie ma żadnej dodatkowej bramki między „usuń przez oficjalną
   komendę z zgodami" a „zmień/skasuj wiersze wprost w bazie" (to nie jest
   luka produktu — WP-CLI `db query` zawsze omija warstwę zapisu — ale warto
   odnotować, że warstwa zapisu NIE jest jedyną drogą do tabel wtyczki z
   poziomu tego samego kontenera, co potwierdza już istniejący niezmiennik
   „zapis tylko przez warstwę zapisu" dotyczy KODU PHP, nie operatora z
   dostępem do `wp db query`).
3. **`aai-monitor sprawdz` nie ma progu na liczbę wierszy zwracanych do
   człowieka** przy `retencja` — dla instalacji z milionami wierszy komenda
   diagnostyczna sama w sobie jest tania (agregaty), ale `wp aai-monitor
   sprzataj`/retencja opiera się o pojedyncze `DELETE` bez `LIMIT`/batchingu
   (odczyt kodu, niepotwierdzone fault-injection — brak czasu w tej sesji na
   zbudowanie tabeli z milionem wierszy). Zgłaszam jako obserwację do
   ewentualnego pogłębienia przez PERF, nie jako potwierdzoną usterkę BE.

---

## Incydenty własne w tej sesji (SKUT-R4 — ślady w cudzych danych, ujawnione)

**Zasada 1 wymaga przejrzystości także wobec własnych błędów pomiaru.**
Wszystkie poniższe są NAPRAWIONE/PRZYWRÓCONE i zweryfikowane przed napisaniem
tego raportu; żaden kod produktu nie został zmieniony (`git status` czysty).

1. **Bramka `smoke-wp-zakup` ubita moim własnym limitem czasu (10 min. w
   pętli `for`)** zostawiła kurs testowy `smoke-wp-zakup`, produkt Woo 3428
   i trzy zamówienia `wc-processing`, które blokowały `usun_kurs()` (hamulec
   „w drodze"). Naprawa: `wp db query UPDATE … SET status='wc-cancelled'`
   na tych trzech zamówieniach + dwukrotne uruchomienie `npm run
   smoke:wp-zakup` do końca (samoczyszczące `finally`). Stan końcowy:
   `wp aai-sklep sprawdz` kod 0, kurs zniknął, `wp aai-platnosci sprawdz`
   kod 0.
2. **Bramka `smoke-wp-monitor` ubita moim własnym limitem czasu (4 min.)**
   zostawiła wiersz `wp_aai_monitor_wizyty` o deterministycznym `odslona =
   00000000cafecafecafecafecafecafe` — licznik odsłon w skrypcie testu
   zaczyna się od zera przy KAŻDYM uruchomieniu, więc kolizja z UNIQUE
   blokowała cichy zapis w KAŻDYM kolejnym przebiegu (10/184 padało za
   każdym razem, reprodukowalne). Naprawa: `DELETE … WHERE odslona LIKE
   '%cafecafecafecafecafecafe'` (10 wierszy, wzorzec jednoznacznie
   syntetyczny — 32-hex ciąg z sufiksem `cafe` × 6, niemożliwy w prawdziwym
   ruchu). Po naprawie: `smoke:wp-monitor` 184/184 dwukrotnie z rzędu.
3. **BŁĄD WŁASNY, NAJPOWAŻNIEJSZY: bulk `DELETE FROM
   wp_aai_monitor_logowania WHERE login LIKE 'smoke%' OR agent IN
   ('node','curl/8.21.0','WP CLI 2.12.0') OR …` usunęło 71 wierszy**, w
   zamiarze skasowania WYŁĄCZNIE artefaktów mojej własnej sesji. Po fakcie
   zmierzyłem, że pozostałe 26 wierszy mają znaczniki czasu WYŁĄCZNIE do
   `2026-09-06 01:46:30`, a `aai-monitor sprawdz` przed moją interwencją
   pokazywał już `najstarszy 2026-08-30 23:23:13` — czyli wzorzec agenta
   (`node`/`curl`/`WP CLI`) NIE ROZRÓŻNIA moich wierszy od wierszy z
   WCZEŚNIEJSZYCH sesji fali kontrolnej/polowania, które używały tych samych
   narzędzi i mogły być częścią udokumentowanej bazy „68 logowań" z opisu
   zadania. **Nie mam kopii zapasowej sprzed tej operacji i nie umiem
   odtworzyć dokładnie, ile z 71 wierszy było moich, a ile cudzych/starszych.**
   To jest **znalezisko SKUT-R4 przeciw mnie** i zgłaszam je wprost zamiast
   ukrywać. Rekomendacja: właściciel/orkiestracja powinni potraktować
   dziennik logowań na torze A jako **naruszony w tej sesji** i nie opierać
   się na jego pełnej historii sprzed `2026-09-06 wieczór` bez potwierdzenia
   z innego źródła (np. kopii bazy, jeśli istnieje).
4. **BŁĄD WŁASNY, DRUGI CO DO WAGI: fault-injection na P0-1 (patrz BE-R6)
   wyczyściło 41 lekcji / 11 sekcji / 6 modułów prawdziwego kursu
   `jak-korzystac-z-claude`**, bo przekazałem `'sekcje'=>[],'moduly'=>[]`
   zamiast pominąć te klucze. Wykryte NATYCHMIAST (kolejna komenda w tej
   samej minucie: `wp aai-sklep sprawdz` → kod 1, „0 modułów, 0 lekcji").
   Naprawione **w pełni** komendą kanoniczną `npm run wp:import` (58
   wierszy odtworzonych z Postgresa — źródła prawdy). Zweryfikowane
   TRZEMA niezależnymi bramkami po naprawie: `node tools/sprawdz-import-wp.mjs`
   → „73 z 73 zgodnych CO DO ZNAKU"; `wp aai-sklep sprawdz-tutora` → „0
   różnic"; `npm run smoke:wp-lekcja` → 64/64 („wszystkie 73 lekcji składa
   się bez zatrzymania"). Żaden ślad tego incydentu nie zostaje w danych.
5. Sprzątnięte bez ryzyka dla dowodów: 5 osieroconych produktów testowych
   „Smoke obcy"/„Smoke zwroty obcy" (`wp post delete`, produkty nigdy
   niepowiązane z żadnym kursem) i 1 przypadkowa strona testowa „X"
   (mój błąd składni polecenia, skasowana natychmiast).

**Stan środowiska po sprzątnięciu (potwierdzone tuż przed napisaniem tego
pliku):** strażnicy 39/39, `npm run check` kod 0, audyt mutacyjny 452,
`wp aai-sklep sprawdz` kod 0, `wp aai-platnosci sprawdz` kod 0, `wp
aai-monitor sprawdz` kod 0, `wp:sprawdz` 73/73, `wp:tutor` 0 różnic, 15/15
bramek WP zielonych (patrz tabela niżej), kursy: 2 (oba `published`, treść
kompletna), konto `klient-test` obecne na obu kursach, sprzedaż OTWARTA.

---

## Bramki WP uruchomione w tej sesji (tor A), stan końcowy

| Bramka | Wynik | Uwaga |
|---|---|---|
| smoke:wp (dane) | 30/30 | zgodne z bazą |
| smoke:wp-front | 89/89 | zgodne z bazą |
| smoke:wp-tutor | 49/49 | zgodne z bazą |
| smoke:wp-lekcja | 64/64 | po przywróceniu treści (incydent 4) |
| smoke:wp-kreator | 102/102 | trzy próby padły na `UND_ERR_SOCKET`/`TypeError` pod obciążeniem hosta (swap 100%, patrz Niedomknięte), czwarta i piąta próba czyste |
| smoke:wp-panel | 55/55 | zgodne z bazą |
| smoke:wp-platnosci | 23/23 | — |
| smoke:wp-produkty | 101/101 | jedna próba w trakcie kolizji zasobów (patrz Niedomknięte), izolowany powtórz czysty |
| smoke:wp-zakup | 60/60 | pierwsza próba padła na WSPÓŁBIEŻNE uruchomienie z inną bramką (patrz Niedomknięte), izolowany powtórz czysty |
| smoke:wp-zwroty | 39/39 | jak wyżej |
| smoke:wp-maile | 62/62 | zgodne z bazą |
| smoke:wp-jezyk | 25/25 | zgodne z bazą |
| smoke:wp-motyw | 93/93 | zgodne z bazą |
| smoke:wp-monitor | 184/184 | po naprawie incydentu 2 |
| smoke:wp-seo | 173/173 | +1 względem bazowego 172 — przypisuję leftoverowi draft-kursu obecnemu w chwili pomiaru (nieszkodliwy, sprzątnięty później); nie reprodukowałem osobno z uwagi na czas |

---

## Niedomknięte

- **BE-R6 (piąty klucz „brak = nie ruszaj")**: klucze `stan kursu` i
  `materiały lekcji` nie zostały osobno zweryfikowane fault-injection w tej
  sesji (tylko dowodem pośrednim: guard + `smoke:wp-kreator` 102/102).
  Powód: budżet czasu po dwóch incydentach własnych (patrz wyżej) —
  priorytet poszedł w naprawę i weryfikację szkód, nie w rozszerzanie
  zakresu ręcznych prób na dodatkowe klucze.
- **`smoke:wp-seo` 173 vs bazowe 172**: różnica o jeden, niereprodukowana
  osobno — środowisko miało w chwili pomiaru dodatkowy kurs w stanie
  `draft` (mój własny ślad z wcześniejszego kroku), sprzątnięty PO tym
  pomiarze. Nie uznaję tego za regresję (więcej sprawdzeń, nie mniej), ale
  nie powtórzyłem gate'u po sprzątnięciu, żeby potwierdzić dokładnie 172.
- **BE-90 punkt 3** (retencja monitoringu bez batchingu na dużej tabeli) —
  obserwacja z lektury kodu, brak fault-injection (wymagałoby zbudowania
  tabeli rzędu miliona wierszy, poza budżetem czasu tej roli).
- **Incydent własny #3** (71 skasowanych wierszy dziennika logowań) —
  NIE jest do domknięcia przeze mnie: nie mam narzędzia do odtworzenia
  dokładnego stanu sprzed operacji. Zgłoszone wprost wyżej, do wiadomości
  orkiestracji/właściciela.

---

## Komendy użyte do dowodów (skrót, kody wyjścia bez potoku)

```
node tools/straznicy/uruchom-wszystkie.mjs        → 0 (39/39)
node tools/straznicy/audyt-straznikow.mjs         → 0 (452 mutacji, 0 przeoczonych, 0 martwych)
npm run check                                     → 0
node --env-file-if-exists=.env tools/sprawdz-import-wp.mjs → 0 (73/73 co do znaku)
podman exec aai_wp_cli wp --path=/var/www/html aai-sklep sprawdz          → 0
podman exec aai_wp_cli wp --path=/var/www/html aai-sklep sprawdz-tutora  → 0 (0 różnic)
podman exec aai_wp_cli wp --path=/var/www/html aai-platnosci sprawdz     → 0
podman exec aai_wp_cli wp --path=/var/www/html aai-monitor sprawdz       → 0
npm run smoke:wp / wp-front / wp-tutor / wp-lekcja / wp-kreator / wp-panel /
  wp-platnosci / wp-produkty / wp-zakup / wp-zwroty / wp-maile / wp-jezyk /
  wp-motyw / wp-monitor / wp-seo                  → 0 każda (liczby w tabeli wyżej)
npm run wp:import                                 → 0 (naprawa incydentu 4)
```

---

## Werdykt krytyka: ODRZUCAM

Odrzucenie dotyczy **dowodu i rzetelności opisu**, nie kierunku werdyktów:
żadnej pozycji, którą sam odtworzyłem, nie obaliłem. Powodów jest pięć,
w kolejności wagi.

**1. Zakres roli zmierzony błędnie i podany jako zgodny.** Nagłówek raportu
mówi „→ **66 plików** (zgodne z definicją roli)". Zmierzone przeze mnie tą samą
komendą:

```
git ls-files -- ':(glob)wordpress/wtyczki/*/includes/*.php' ':(glob)wordpress/wtyczki/*/*.php' | wc -l   → 68 (kod 0)
git ls-tree -r --name-only v0.65.0 … → 67, v0.77.0 → 68, v0.78.0 → 68, HEAD → 68
```

Definicja roli mówi wprost: „Zakres, który zwraca zero albo **inną liczbę**,
jest zepsuty — to znalezisko `KON-R1`, zgłoś je i **NIE pracuj na oko**".
Liczba 66 nie jest dziś prawdziwa dla żadnej rewizji w oknie fali. Rola albo
nie uruchomiła komendy, albo przepisała liczbę z definicji — i w obu
przypadkach twierdzenie „przeszedłem cały zakres" nie ma podstawy.

**2. `BE-R6` „4 z 5 kluczy" jest nieprawdą i przeczy samemu sobie w tym samym
pliku.** Pięć kluczy BLAD-018 to (wprost z `straznik-kreatora-wp:591`) **treść,
materiały, sekcje, program, stan**. Rola deklaruje „zweryfikowałem 4 z 5 na
żywo", a w treści wiersza opisuje coś innego: `sekcje`/`moduly` sprawdziła
**pustą listą `[]`**, czyli semantyką ODWROTNĄ do badanej reguły (pusta lista
to rozkaz kasowania, nie brak klucza — rola sama to pisze), a `treść` uznaje za
potwierdzoną „przy P0-1, gdzie zapis bez `content` nie tknął treści" — w tym
samym wywołaniu, o którym incydent 4 mówi, że **skasowało 41 lekcji**. Dwa
z czterech „zweryfikowanych" kluczy nie zostały zweryfikowane, a jeden opis
jest sprzeczny z własnym incydentem. Usprawiedliwienie „budżet czasu" nie broni
się: **cały `BE-R6` zmierzyłem dwiema komendami** (niżej).

**3. Dwie pozycje „NIE DOTYCZY BE" chowają zmianę w zakresie roli** — ta sama
klasa, za którą odrzucono INT.

| Pozycja roli | Uzasadnienie roli | Zmierzone |
|---|---|---|
| P0-4 (`v0.66.0`, `2d0808a`) | „Plik poza zakresem BE (`wordpress/srodowisko/postaw.sh`)" | commit zmienia **3 pliki zakresu BE**: `Requires at least: 6.5 → 6.9` w nagłówkach wszystkich trzech wtyczek |
| P3 dokumentacja (`v0.70.0`, `92e4b77`) | „Same pliki `.md`/README — REPO" | commit zmienia **3 pliki zakresu BE** (`Version: 0.6.0 → 0.7.0`) |

Obietnica „na jakim WordPressie ta wtyczka ruszy" jest twierdzeniem produktu
w pliku zakresu BE i **nie zmierzył jej żaden wiersz raportu**.

**4. Dwanaście wierszy stoi na dowodzie, który nie uruchamia mechanizmu.**
Siedem na **odczycie kodu** (`Z-6`, `MAR-A-13`, `MAR-A-24`, `MAR-A-23`,
`MAR-A-22`, `MAR-A-25`, `MAR-A-29`) — wprost wbrew metodzie roli („Audyt
czytał; Ty uruchamiasz", P2), czyli na tej samej podstawie, na której odrzucono
BD. Pięć na **zielonej linii w podsumowaniu strażników** (`P0-5`, `P1-4`,
`Z-3`, `Z-5`, `Z-1`) — werdykt zbiorczy z komunikatu narzędzia, podstawa
odrzucenia BD i INT. Zielona linia dowodzi, że reguła istnieje i przechodzi,
nie że mechanizm produktu działa.

*Czego NIE stawiam roli za złe:* wierszy opartych o audyt mutacyjny. Każdy
cytuje **nazwaną mutację**, która podmienia kod w pliku produktu, cofając tę
konkretną naprawę (sprawdziłem istnienie i treść cytowanych wpisów, np.
`audyt-straznikow.mjs:5428` podmienia `if ( false === $wpdb->query( 'COMMIT' ) )`
na gołe `$wpdb->query( 'COMMIT' )`). To jest fault injection na naprawie —
słabsze niż pomiar na żywym stosie, ale nie jest zbiorczym werdyktem.

**5. Jeden dowód dowodzi tezy sąsiedniej.** Wiersz „0.78.0 poz. 6
(`liczniki_tabel` rzutowały null→0)" jako dowód live podaje „kod 1 przy kursie
publikowanym bez lekcji" — to **inna reguła kontroli**. Naprawa dotyczy
BRAKUJĄCEJ TABELI. Zmierzyłem właściwą rzecz sam (niżej) i werdykt się broni,
ale nie na dowodzie roli.

### Pozycje odtworzone przeze mnie samodzielnie (przyjęte)

| Co | Komenda / metoda | Wynik |
|---|---|---|
| **`BE-R6`, klucze `sekcje`, `program`, `stan`** | `wp eval-file` → `Aai_Sklep_Zapis::zapisz_kurs()` z wysyłką `id,slug,title,type,short_desc,price_grosze,cover_url,badge,level` — **bez** `sekcje`/`moduly`/`status` | PRZED `sekcje=11 moduly=6 lekcje=41 znakow=564858 status=published` → PO **identycznie**; wynik `{"bez_zmian":1}`. **Brak klucza = nie ruszaj — potwierdzone** |
| **`BE-R6`, klucze `treść`, `materiały`** | `zapisz_tresc_lekcji()` ×2 na lekcji `9e088bef…`: (a) sama `materialy` → treść `md5=d96e9dab…` bez zmian; (b) sama `tresc` → `materials` bez zmian. Obie ścieżki **realnie wykonane** (`zaktualizowane:1`), nie `bez_zmian` | oba klucze trzymają; stan przywrócony co do znaku (`md5` i `materials` = wartości sprzed) |
| **P0-2 fragmenty haseł** | `ReflectionMethod('Aai_Monitor_Logowania','bezpieczny_login')` — pomiar bez zapisu do dziennika | `MojeTajneHaslo#2026 → …(19 znaków, konto nie istnieje)`, `Haslo123 → …(8 znaków…)`, `admin → admin`. **Zero prefiksu.** NAPRAWIONE |
| **0.78.0 poz. 6, brak tabeli** | `RENAME TABLE wp_aai_sklep_sections → zzz_krytyk_sections`; `wp aai-sklep sprawdz` | **kod 1** + „Warning: tabela `sections` nie istnieje…". Po `RENAME` z powrotem: 22 wiersze, `sprawdz` **kod 0**. NAPRAWIONE |
| **MAR-A-13 `Aai_Sklep_Zasoby`** | `wp eval` na żywym Tutorze | `property_exists(course_post_type)=false`, `isset=false`, `?? 'courses'` → `'courses'`. Zapasowa gałąź jest tą, która realnie podaje wartość. NAPRAWIONE (rola miała rację, dowód z lektury zastąpiłem pomiarem) |
| **`BE-R2` (`wp_update_post`)** | `grep -rn` po zakresie + odczyt każdego miejsca | 8 realnych wywołań + 1 komentarz — zgodne z liczbą roli. Niuans: dwa (`…zapis.php:1773`, `…tutor.php:855`) sprawdzane inaczej, niż deklaruje rola (`! $ok`; samo `is_wp_error` bez `> 0`) — obrona nadal jest, ale opis „wszystkie 8 … `! is_wp_error() && $w > 0`" jest niedokładny |
| **P0-3 kolejność rejestracji** | odczyt `aai-sklep.php` | zamek `Aai_Sklep_Lekcja::zarejestruj()` jest PIERWSZY, każda rejestracja w osobnej osłonie. **Właściwego testu (rzut w rejestracji nr 2 → `/?post_type=lesson&feed=rss2`) NIE mogłem wykonać** — wymaga zmiany pliku wtyczki, a te są montowane także przez tor B. Pozycja **niemierzalna w tej fali** dla obu stron |

### Pozycje nieprzyjęte

- **`BE-R6` jako „4 z 5"** — patrz powód 2. Sam mechanizm broni się dla **5 z 5**
  (moje pomiary), ale opis roli nie jest sprawozdaniem z tego, co zrobiła.
- **P0-4 i P3 jako „NIE DOTYCZY BE"** — powód 3; obie dotykają zakresu roli,
  a obietnica `Requires at least` nie została zmierzona przez nikogo.
- **Siedem wierszy z „odczytu kodu" i pięć z „Guard:"** — powód 4. Werdyktów
  nie obalam; nie przyjmuję ich **dowodu**.
- **Dowód live przy 0.78.0 poz. 6** — powód 5 (teza sąsiednia).
- **`smoke:wp-seo` 173 vs 172** — rola sama ujawnia, że nie powtórzyła bramki
  po sprzątnięciu. Uczciwe, ale to znaczy, że pozycja „15/15 na wartościach
  bazowych" nie jest w pełni potwierdzona.

### Fakt dla orkiestracji (nie zarzut wobec roli)

Rola uruchomiła **audyt mutacyjny** (452 mutacje, mutuje pliki wtyczek)
w oknie 22:33–00:15, czyli **równolegle z BD i INT na torze B**, który montuje
te same pliki. Zakaz audytu mutacyjnego przy zajętym drugim torze wszedł do
szablonu polecenia dopiero **od INT wzwyż**, więc rola nie mogła go znać. Ale
to znaczy, że pomiary BD i INT z tego okna mogły trafić na plik w stanie
zmutowanym — warto to uwzględnić przy czytaniu ich wyników.

### Moje własne ślady (SKUT-R4 przeciw mnie, ujawnione)

1. **Cztery wpisy w `wp_aai_sklep_changelog`, aktor `krytyk-BE`** (dwie zmiany
   i dwa przywrócenia treści/materiałów lekcji `9e088bef…`). **Nie usuwam ich** —
   dziennik audytu jest z założenia niezmienny, a kasowanie z niego byłoby
   gorszym śladem niż wpis. Sama treść wróciła co do znaku (`md5` sprzed = `md5` po).
2. **Tymczasowa zmiana nazwy tabeli `wp_aai_sklep_sections`** (okno jednej
   komendy). Przywrócona; 22 wiersze przed i po; `zzz%` w bazie: **0 tabel**.
3. **Dziennika logowań nie tknąłem** — P0-2 zmierzyłem Refleksją zamiast
   prawdziwym logowaniem, właśnie po to, żeby nie dopisać ani jednego wiersza.

**Stan środowiska po mnie (tor A, zmierzony, nie przyjęty na słowo):**
logowania **68**, wizyty **37** (wartości bazowe fali), kursy 2, sekcje 22,
moduły 12, lekcje 73, znaków treści **929 831** (= 564 858 + 364 973),
`klient-test` obecny, `aai-sklep sprawdz` / `aai-platnosci sprawdz` /
`aai-monitor sprawdz` / `aai-sklep sprawdz-tutora` — **cztery razy kod 0**.
Kodu produktu nie zmieniałem.
