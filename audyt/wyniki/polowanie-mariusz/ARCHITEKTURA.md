# Polowanie na nienazwane błędy architektoniczne — trzy wtyczki WordPressa

> **To NIE jest wynik sektora audytu ani re-audytu.** To materiał roboczy do napraw,
> zebrany poza numeracją fal, na zamówienie po ocenie zewnętrznego recenzenta
> (architektura 9/10). Nie ma statusów, werdyktów krytyka ani wpisów w
> `audyt/zgloszenia/`. Nie nadaje się do cytowania jako dowód sektora.

**Data:** 2026-09-05 · **Gałąź:** `re-audyt/sektor-re-audytu` · **Kod produktu:** `main` 0.65.0
**Metoda:** wyłącznie statyczna — `cat`, `sed`, `grep`, `find`, lektura całych plików.
Zero uruchomień, zero edycji, zero dotknięcia środowisk `:8892` / `:8894`
(na torze B pracował wtedy inny agent).
**Zakres:** `wordpress/wtyczki/**` — 108 plików PHP, 25 081 linii, 55 klas
(`aai-sklep` 72 pliki / 28 klas, `aai-platnosci` 18 / 14, `aai-monitor` 18 / 13),
plus `docs/*.drawio` (4 pliki, 7 stron, 192 węzły, 98 krawędzi), `docs/SCHEMATY.md`,
`docs/INSTRUKCJA-INSTALACJI.md`, `paczki/KOLEJNOSC-INSTALACJI.txt`, 40 strażników.

**Nie zgłaszam ponownie rzeczy znanych:** HTTP 500 z niesłonionego statycznego
wywołania w uszkodzonym pliku (3 pliki), zero cykli zależności (Tarjan, 55 klas),
oraz 33 wpisy z `audyt/zgloszenia/` — każdy kandydat został przez nie przepuszczony
grepem, żaden z poniższych tam nie występuje.

---

## Sedno w trzech zdaniach

1. **Izolacja trzech wtyczek jest luźna tylko na rysunku.** Plugin 2 woła statycznie
   klasy Pluginu 1 **16 razy w 6 plikach** i dopisuje dwie mety na wpisie Tutora,
   którego jedynym autorem miał być Plugin 1 — a **żadna z 98 krawędzi na siedmiu
   schematach** tych dwóch zależności nie rysuje.
2. **Bezpieczeństwo operacji stoi na wartościach domyślnych filtrów, a te nie
   odróżniają „zmierzyłem zero" od „nikt nie odpowiedział".** Pięć szwów degraduje
   się konserwatywnie, dwa permisywnie — i jeden z tych dwóch jest hamulcem
   chroniącym klienta, który właśnie płaci przelewem, przed skasowaniem kursu.
3. **Zdania „nie ruszaj", „przywróć", „zgłoś" są w kodzie napisane, ale nie mają
   nośnika:** instalator zmienia 13 cudzych ustawień i nie zapisuje ani jednej
   wartości zastanej, alarm kopii nie gaśnie drogą, którą sam zaleca, a jedyny
   strażnik pilnujący granicy warstw skanuje 0 ze 108 plików produktu.

---

# ZNALEZISKA DUŻE

## MAR-A-01 · „Ukryj kurs" zabiera kupującemu każdą drogę do produktu, który już ma

**Miejsce:** `wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-odczyt.php:64`
(`WHERE c.status = 'published'`) · `class-aai-sklep-moje.php:223` i `:258` ·
`class-aai-sklep-tutor.php:96-118` · `szablony/panel/lista.php:79-91`

**Mechanizm.** `Aai_Sklep_Tutor::STATUS_MATERIALU_NA_WP` (`tutor.php:114-118`)
celowo zostawia moduły i lekcje ukrytego kursu jako `publish`, z komentarzem
napisanym wprost: *„«Ukryj» ma zabierać kurs ze SKLEPU, a nie odbierać go ludziom,
którzy już zapłacili"* (decyzja właściciela C1, 2026-08-31). **Dostęp faktycznie
zostaje** — `Aai_Sklep_Lekcja::czy_wolno()` pyta o zapis w Tutorze, nie o nasz
status. **Znika za to każda DROGA do niego**, bo cztery różne miejsca pytają o kurs
przez `Aai_Sklep_Odczyt::lista_kursow()`, a ta ma w SQL-u `WHERE c.status = 'published'`:

| co znika | plik:linia |
|---|---|
| kafelek w „Moich kursach" | `class-aai-sklep-moje.php:258` (`if ( '' === $uuid \|\| ! isset( $nasze[$uuid] ) ) continue;`) |
| pozycja „Moje kursy" w obu nawigacjach motywu | `class-aai-sklep-moje.php:223` (`ma_kursy()`) → `class-aai-sklep-menu.php:131` |
| strzałka „Wróć do moich kursów" prowadzi do listy bez tego kursu | `class-aai-sklep-lekcja.php:604-621` |
| strona sprzedażowa | `class-aai-sklep-odczyt.php:102` — 404 |

**Sedno architektoniczne:** `lista_kursow()` odpowiada na **dwa różne pytania** —
„co pokazać klientowi w sklepie" i „jakie kursy w ogóle istnieją" — a ma tylko jedną
odpowiedź. Z 12 jej konsumentów pięciu potrzebuje semantyki „wszystkie"
(`moje.php:223`, `moje.php:258`, `platnosci-zapis.php:1193` = `synchronizuj_wszystkie()`,
`platnosci-cli.php:125/128`, `platnosci-cli.php:788`), a pięciu semantyki
„opublikowane" (katalog, SEO, sitemap-dostawca, strona kursu, karta).
Klasa jest niezaadresowana także po stronie płatności: **produkt ukrytego kursu
wypada z `wp aai-platnosci sync` i z kontroli rozjazdu**, bo obie chodzą po
`lista_kursow()`.

**Scenariusz.** Klient kupił kurs za 299 zł. Właściciel klika w kokpicie „Ukryj",
żeby zdjąć kurs ze sprzedaży na czas poprawek. Klient loguje się: **nie widzi
pozycji „Moje kursy" w menu, nie ma kafelka, strona kursu oddaje 404.** Materiał
żyje pod adresem Tutora, ale trafi tam wyłącznie z zakładki zapisanej wcześniej.
Przycisk „Ukryj" (`szablony/panel/lista.php:79-91`) to **goły `<form>` bez ani
jednego potwierdzenia** — obok „Usuń", które ma trzy osobne bramki (treść,
kupujący, zamówienia w drodze).

**Waga: DUŻY.** Niedotrzymana obietnica zapisana w kodzie jako decyzja właściciela;
nawrót klasy naprawianej w W6 („klient nie miał JAK trafić do kupionego kursu");
jeden klik bez ostrzeżenia odbiera drogę do opłaconego produktu.

**Zasięg (policzony):** 2 filtry `status = 'published'` w warstwie odczytu
(`odczyt.php:64`, `:102`) · 12 konsumentów `lista_kursow()`, z tego **5 o złej
semantyce** · 1 przycisk bez potwierdzenia wobec 3 bramek przy sąsiednim · 2 kursy
w bazie, 73 lekcje prozy.

---

## MAR-A-02 · Instalator Pluginu 2 przestawia 13 cudzych ustawień i nie ma punktu przywracania

**Miejsce:** `wordpress/wtyczki/aai-platnosci/includes/class-aai-platnosci-ustawienia.php:550-618`
(`napraw()`) wobec `aai-platnosci.php:118-143` (hak deaktywacji)

**Mechanizm.** `napraw()` — wołane przy **aktywacji** wtyczki — zmienia stan
WooCommerce, Tutora i treść dwóch stron WordPressa. Deaktywacja cofa **jedną**
z tych 13 pozycji:

| # | co zmienia aktywacja | linia | cofane? |
|---|---|---|---|
| 1 | `tutor_option['monetize_by']` → `wc` | `:73`, zapis `:565` | **nie** |
| 2 | `tutor_option['tutor_woocommerce_order_auto_complete']` → `on` | `:74` | **nie** |
| 3–4 | strony natywnej kasy Tutora (`tutor_cart_page_id`, `tutor_checkout_page_id`) → `draft` | `:568-573` | **nie** |
| 5 | `woocommerce_enable_guest_checkout` → `no` | `:91` | **nie** |
| 6 | `woocommerce_enable_signup_and_login_from_checkout` → `yes` | `:92` | **nie** |
| 7 | `woocommerce_registration_generate_password` → `yes` | `:93` | **nie** |
| 8 | `woocommerce_coming_soon` → `no` | `:104` | **nie** |
| 9 | mail Woo „nowe konto" → wyłączony | `:583` | **TAK** (`:824`) |
| 10–11 | treść stron koszyka i kasy: klasa `has-dark-controls` w bloku | `:587-592` | **nie** |
| 12 | treść obu stron: doklejony blok `wp:woocommerce/store-notices` | `:594-599` | **nie** |
| 13 | slugi stron Woo → `koszyk` / `kasa` | `:601-615` | **nie** |

**Przyczyna jest strukturalna, nie przeoczeniem:** `napraw()` zapamiętuje wartość
zastaną **wyłącznie w zwracanym łańcuchu `$zmiany[]`** (np. `:558`), który idzie na
wyjście CLI albo do notatki aktywacyjnej. **Nigdzie nie jest zapisywany**, więc nie
istnieje stan, z którego dałoby się przywrócić. Filtry obronne B17 (`:173-176`)
znikają razem z wtyczką, więc po deaktywacji obowiązuje wartość z bazy — czyli nasza.

**Scenariusz.** Właściciel (albo klient, któremu sprzedano komplet) wyłącza
płatności na stałe. Zostaje: Tutor w trybie `wc` **bez szwu**, kursy z
`_tutor_course_price_type = paid` i `_tutor_course_product_id` wskazującym produkt,
który deaktywacja przestawiła na `draft` — czyli Tutor rysuje ścieżkę zakupu do
nieistniejącego produktu; sklep bez zakupu gościa; wyłączona zasłona „Coming soon";
polskie slugi koszyka i kasy; dwie strony Woo z naszą treścią w blokach. **Na
zawsze.**

**Podwariant.** `przywroc_mail_woo()` (`:824`) wpisuje na sztywno `'yes'`, a nie
wartość sprzed instalacji. Sklep, który miał ten mail świadomie wyłączony przed
wgraniem naszej wtyczki, po jej deaktywacji zacznie go wysyłać.

**Waga: DUŻY.** Wtyczka jest sprzedawana obcemu klientowi (`docs/INSTRUKCJA-INSTALACJI.md`,
`npm run pakuj`), a jej odinstalowanie nie przywraca sklepu do stanu sprzed
instalacji. To jest jedyna z trzech wtyczek, która trwale przestawia konfigurację
dwóch cudzych, dużych wtyczek.

**Zasięg (policzony):** `napraw()` woła 6 miejsc zapisu (2 × `update_option` + 4
metody warstwy zapisu); deaktywacja woła 2 (`produkty_na_szkic` — własne produkty,
`przywroc_mail_woo`). **12 z 13 pozycji nieodwracalnych.**

---

## MAR-A-03 · Hamulce operacji niszczącej degradują się na „zezwól", gdy nie ma kto odpowiedzieć

**Miejsce:** `wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-zapis.php:173`
i `:264-285` · `class-aai-sklep-tutor.php:937-940` ·
`aai-platnosci/includes/class-aai-platnosci-szew.php:120-135`

**Mechanizm.** Usunięcie kursu ma trzy hamulce. Pierwszy (treść lekcji) pyta
**nasze tabele** i trzyma zawsze. Dwa pozostałe pytają na zewnątrz:

```php
$kupujacy = Aai_Sklep_Tutor::kupujacy( $id );                              // :159
$w_drodze = (int) apply_filters( 'aai_sklep_zamowienia_w_drodze', 0, $id ); // :173
```

Dostawca odpowiedzi jest starannie **fail-closed w środku**: `Szew::zamowienia_w_drodze()`
przy wyjątku oddaje `-1`, a `zapis.php:269` zatrzymuje usuwanie zarówno przy `-1`,
jak i przy liczbie dodatniej — z komentarzem *„przy nieznanym stanie odmawiamy, bo
cisza znaczyłaby zgodę na skasowanie cudzego, właśnie opłacanego zakupu"*.
**Ale protokół „-1 = nie wiem" jest nieosiągalny dokładnie wtedy, gdy naprawdę nie
wiadomo:** przy nieobecnym Pluginie 2 `apply_filters` oddaje wartość domyślną `0`,
a `0 !== $w_drodze` jest fałszem. Symetrycznie `Aai_Sklep_Tutor::kupujacy()`
(`:938-940`) zwraca `0`, gdy Tutora nie ma — nieodróżnialnie od „zmierzyłem zero
kupujących".

Komentarz w kodzie (`zapis.php:130-133`) broni tego zdaniem *„sklep bez płatności
nie ma zamówień, więc to zero jest PRAWDĄ, a nie ciszą"*. Zdanie jest prawdziwe dla
instalacji, na której Pluginu 2 **nigdy nie było**. Nie jest prawdziwe dla
instalacji, która sprzedawała i ma wtyczkę chwilowo wyłączoną.

**Scenariusz.** Właściciel wyłącza `aai-platnosci` na czas diagnozy konfliktu (albo
Tutora — to samo), wchodzi do kreatora i usuwa kurs. Panel pokazuje „0 kupujących",
„0 zamówień w drodze", nie zadaje ani jednego pytania. Kurs znika z jedynego źródła
prawdy o prozie. Klient, który dzień wcześniej złożył zamówienie z płatnością
przelewem, księguje wpłatę i **nie dostaje nic**. To jest dokładnie znalezisko, po
którym trzeci hamulec powstał.

**Uogólnienie — wartości domyślne wszystkich siedmiu szwów:**

| szew | domyślna | znaczenie przy braku dostawcy | ocena |
|---|---|---|---|
| `aai_sklep_cena_kursu` (`widok.php:168`) | cena katalogowa | pokazujemy własną cenę | konserwatywna |
| `aai_sklep_cta_kursu` (`widok.php:260`) | kontakt | nikt nie kupi przez pomyłkę | konserwatywna |
| `aai_sklep_dostepnosc_kursu` (`seo.php:292`) | `PreOrder` | oferta nie obiecuje zakupu | konserwatywna |
| `aai_sklep_kurs_zmieniony` / `_usuniety` | brak odbiorcy | kopia nie powstaje, komenda to wykryje | konserwatywna |
| **`aai_sklep_zamowienia_w_drodze`** (`zapis.php:173`, `odczyt-panelu.php:98`) | **`0`** | **„nie ma zamówień" = zgoda na usunięcie** | **permisywna** |
| **`aai_monitor_strona_za_bramka`** (`pomiar.php:130`) | **`false`** | **„to była przeczytana strona"** — odbicia gościa od bramki logowania wchodzą do „top 10 czytanych" | **permisywna** |

**Waga: DUŻY** dla `zamowienia_w_drodze` (bramkuje operację niszczącą, nieodwracalną,
dotykającą cudzych pieniędzy), **MAŁY** dla `strona_za_bramka` (fałszuje statystykę).

**Zasięg (policzony):** 7 szwów · 5 konserwatywnych, 2 permisywne · 4 filtry, które
zadaje Plugin 1 (`grep -c "apply_filters( 'aai_" aai-sklep/` = 4), 1 bramkuje
operację niszczącą · 2 z 3 hamulców usuwania kursu zależne od komponentu, który
może być wyłączony.

---

## MAR-A-04 · Schematy nie rysują twardego sprzęgnięcia Plugin 2 → Plugin 1 ani zapisu Pluginu 2 do wpisów Tutora

**Miejsce:** `docs/SYSTEM.drawio` (41 węzłów / 25 krawędzi) ·
`docs/plugin-2/schematy.drawio` s. 2 (26 / 17) · `docs/SCHEMATY.md`

**Mechanizm.** Na wszystkich siedmiu stronach relacja Plugin 1 ↔ Plugin 2 jest
narysowana **wyłącznie jako haki** („zdarzenia kursu ⟶ ⟵ cena, CTA, zamówienia").
W kodzie obok haków biegnie **twarde sprzęgnięcie klasowe: 16 statycznych wywołań
w 6 plikach** (policzone; 19 trafień minus 3 w komentarzach):

* `Aai_Sklep_Odczyt::` ×10 — `cli.php:109,125,128,788,1070`, `zapis.php:697,1193`, `kasa.php:96`, `maile.php:652`, `ustawienia.php:344`
* `Aai_Sklep_Widok::` ×3 — `kasa.php:98`, `zapis.php:976`, `ustawienia.php:349`
* `Aai_Sklep_Moje::` ×3 — `cta.php:222,227`, `maile.php:667`

Druga niewidoczna krawędź idzie w stronę Tutora: `Aai_Platnosci_Zapis` pisze
`_tutor_course_price_type` i `_tutor_course_product_id` na wpisie kursu
(`platnosci-zapis.php:913-914`, zdejmowanie `:1147-1149`) — czyli **na wpisie,
którego jedynym autorem miał być `Aai_Sklep_Tutor`**. Na `SYSTEM.drawio` jedyne
strzałki do Tutora wychodzą z Pluginu 1 („kopia kursu") i z Woo („opłacone → zapis").

**Dlaczego to nie jest kosmetyka.** Wtyczki są sprzedawane obcemu klientowi razem
ze schematami jako dokumentacją architektury, a `straznik-schematow` (39.) pilnuje
**słownika nazw klas, nie sensu strzałek** — sam mówi o tym wprost w `docs/SCHEMATY.md`.
Rysunek obiecuje trzy moduły spięte zdarzeniami; kod ma dwa moduły zrośnięte
wywołaniami i trzeci piszący do cudzego wpisu.

**Waga: DUŻY.** Jedyny dokument architektury, jaki dostaje kupujący, opisuje inną
architekturę niż ta, którą kupuje — a mechanizm, który miał tego pilnować, z
założenia tego nie widzi.

**Zasięg (policzony):** 98 krawędzi na 7 stronach, **0** pokazuje `aai-platnosci → aai-sklep`,
**0** pokazuje `aai-platnosci → Tutor` · 16 wywołań statycznych · 2 mety pisane na cudzym wpisie.

**Pomniejsze rozbieżności tej samej rodziny (wszystkie MAŁE, potwierdzone):**
* `plugin-1` s. 2: jedyna krawędź do węzła „→ Plugin 2" wychodzi z `Aai_Sklep_Widok`,
  a węzeł wymienia 4 filtry + 2 akcje. **Widok emituje 2 z 6** (`widok.php:168`, `:260`);
  pozostałe wychodzą z `seo.php:292`, `odczyt-panelu.php:98`, `zapis.php:173` i `zapis.php:930/187`.
* `plugin-2` s. 2 (`n36`): `aai_sklep_zamowienia_w_drodze` opisany jako pytanie
  „przed usunięciem kursu" — w kodzie ma **dwa wystrzały**, drugi rysuje liczbę na
  liście kursów w kokpicie (`odczyt-panelu.php:98`).
* Przekierowania `/product/<slug>/` → 301 (`ustawienia.php:336-352`) nie ma na żadnym schemacie.
* `SYSTEM.drawio` (`n9`) podaje `/moje-konto/`; Plugin 2 spolszcza tylko `koszyk` i `kasa`
  (`ustawienia.php:128-129`), konto zostaje `/my-account/`.
* Liczba haków Pluginu 2: dokumenty mówią 25, po 0.65.0 jest **27** (doszły
  `before_delete_post` i `woocommerce_before_delete_order`, commit `582d4b9`).
  Uwaga: `REA-USP-F1-002` już zgłosił, że metoda liczenia haków nie jest w repo zdefiniowana.
* `docs/INSTRUKCJA-INSTALACJI.md:93-94` — recepta na złą kolejność instalacji
  („włącz brakującą wtyczkę i zapisz dowolny kurs") naprawia **jeden** kurs;
  pełną naprawę robi hak aktywacji albo `wp aai-platnosci sync`, czego instrukcja nie podaje.
* **7 z 7 szwów jest narysowanych i wszystkie mają poprawny kierunek**, łącznie z
  odwróconym `aai_monitor_strona_za_bramka` — rozbieżności są z **niedomiaru**, nie z nadmiaru.

---

# ZNALEZISKA ŚREDNIE

## MAR-A-05 · Jedyny strażnik granicy warstw nie skanuje ani jednego pliku produktu

**Miejsce:** `tools/straznicy/straznik-granic.mjs:40` (`ROZSZERZENIA = /\.(ts|tsx|js|jsx|mjs|cjs)$/`)
i `:70` (`existsSync("app") || existsSync("modules")`)

Nagłówek tego strażnika deklaruje pilnowanie WYTYCZNE §8: *„dostęp do SQL ma
WYŁĄCZNIE dział… Strona nie ma prawa dotknąć bazy"*. Skanuje wyłącznie pliki
JS/TS prototypu Next.js. Nie zastąpił go nikt: `straznik-wtyczki-wp` reguła 8
zabrania tylko **zapisu** poza warstwą zapisu, a jedyna reguła o szablonach frontu
(`straznik-kreatora-wp:451-458`) zabrania jednej rzeczy — sięgania po `['content']`
lekcji.

**Skutek:** reguła „szablon dostaje gotowe dane" obowiązuje dziś wyłącznie w kodzie,
którego nikt nie wdraża. Szablon PHP może zrobić `$wpdb->get_results()` i przejdzie
`npm run check` bez śladu. MAR-A-06…A-08 istnieją, bo nic ich nie mierzy.

**Zasięg:** pliki w zasięgu strażnika: **240** (JS/TS) · pliki PHP produktu: **108** ·
z tego w zasięgu: **0** · strażników czytających `.php`: 11 z 40, żaden bez reguły
„szablon nie pobiera danych".

## MAR-A-06 · Jeden `try` wokół 13 niezależnych rejestracji: awaria daje działający PREFIKS systemu, a ochrona przed wyciekiem produktu jest OSTATNIA

**Miejsce:** `wordpress/wtyczki/aai-sklep/aai-sklep.php:151-172`
(analogicznie `aai-platnosci.php:167-206` — 10 pozycji, `aai-monitor.php:118-165` — 9)

Naprawa `AUD-BE-F1-001` (0.65.0) objęła cały start jednym `try/catch ( Throwable )`,
żeby brak jednego pliku klasy nie dawał HTTP 500. Cena tej naprawy nie została
nazwana: **uszkodzenie pliku nie wyłącza wtyczki — wyłącza wszystko od miejsca
awarii w dół**, a kolejność jest odwrotna do wagi:

| # | rejestracja | co podpina | rodzaj |
|---|---|---|---|
| 1 | `Tabele::dociagnij_schemat` | — | schemat |
| 2–4 | `Zasoby`, `Styl_Tutora`, `Styl_Woo` | `wp_enqueue_scripts`, `body_class`, `*_loader_src` | **kosmetyka** |
| 5 | `Trasy` | `init`, `query_vars`, `template_redirect`, `template_include` | ochrona tras |
| 6 | `Moje` | `template_redirect`, menu konta Woo | prywatna strona |
| 7 | `Menu` | `get_header`, `get_footer` | nawigacja |
| 8 | `Seo` | `pre_get_document_title`, `wp_head` | co widzi wyszukiwarka |
| 9 | `Sitemap` | `wp_sitemaps_post_types` | **mapa strony bez lekcji (0.60.0)** |
| 10–11 | `Panel`, `Panel_Akcje` | kokpit, `admin_post_*` | kreator |
| 12 | `Tutor` | `aai_sklep_kurs_zmieniony/_usuniety` | kopia dla LMS |
| **13** | **`Lekcja`** | **`register_post_type_args`, `pre_get_posts`** | **zamknięcie wycieku 73 lekcji (0.59.0)** |

`Aai_Sklep_Lekcja::zarejestruj()` to **jedyne miejsce w całym repo** rejestrujące
`register_post_type_args` i `pre_get_posts` (sprawdzone grepem). Awaria dowolnej
z **11 poprzedzających** rejestracji wyłącza je po cichu.

**Scenariusz.** Uszkodzony `class-aai-sklep-seo.php` (8. pozycja) — częściowe FTP,
`git clean`, martwy bind mount, czyli klasy awarii, które to repozytorium
przerabiało wielokrotnie. Witryna oddaje 200, katalog działa (`Trasy` = 5.),
administrator widzi notatkę w kokpicie — a `/?post_type=lesson` i kanał RSS znów
wydają gościowi **73 lekcje prozy**, i lekcje znów wchodzą do mapy strony.
Ta sama awaria wyłącza `Aai_Sklep_Tutor` (12.), więc każdy zapis kursu w kreatorze
przestaje aktualizować kopię dla klientów, **bez żadnego objawu** — kanał alarmowy
kopii (`Panel::stan_kopii`) czeka na wyjątek, którego nie ma, bo nie ma nawet komu
go rzucić.

W `aai-platnosci` ta sama konstrukcja daje asymetrię odwrotną do bezpiecznej:
**blokada sprzedaży rejestruje się POZA `try`** (`aai-platnosci.php:63` →
`Ustawienia::zarejestruj()` na poziomie pliku), a **dostarczanie i maile w środku**
(pozycje 4 i 5 z 10). Częściowa awaria zostawia sklep sprzedający i przestaje
dostarczać. Kanał błędów `Komunikaty::zarejestruj()` jest **9. z 10** — czyli
mechanizm, który ma zgłosić częściowy start, sam jest jego ofiarą.

**Zasięg:** 13 + 10 + 9 = **32 rejestracje w 3 blokach `try`** · 11 z 12 poprzedzających
bramkuje ochronę przed wyciekiem · 0 kontroli sprawdza, czy haki są podpięte
(**wyjątek:** `aai-monitor` pyta o swoje dwie akcje — `monitor-cli.php:173-174`).

## MAR-A-07 · Plugin 1 — jedyna wtyczka bez kontroli z kodem wyjścia i bez klasy zależności

**Miejsce:** `wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-cli.php:142`
(`sprawdz()`) · `wordpress/srodowisko/postaw.sh:400` i `:418`

`wp aai-sklep sprawdz` **nie umie zawieść** — wypisuje liczniki tabel i statystyki
kursów, nie ma ani jednego `WP_CLI::error`/`halt(1)`. Dwie siostry mają kontrole
kończące kodem 1 przy rozjeździe i **`postaw.sh` je uruchamia jako punkty kontrolne**
(`aai-platnosci sprawdz` `:400`, `aai-monitor sprawdz` `:418`) — Pluginu 1 nie
uruchamia w ogóle. `wp aai-sklep sprawdz-tutora` **umie** zwrócić 1, ale jest wpięte
wyłącznie w `package.json:30` (`npm run wp:tutor` — wymaga `podman exec` i nazwy
kontenera dewelopera) i w `smoke-wp-tutor.mjs`; na hostingu klienta nie woła go nic.

Symetrycznie: `aai-platnosci` i `aai-monitor` mają klasę `Zaleznosci` z komunikatem
w kokpicie o brakujących wtyczkach. **`aai-sklep` ma dokładnie jedno `admin_notices`
w całym kodzie** — to z `catch` w bootstrapie. Brak Tutora nie daje żadnego
komunikatu: `Aai_Sklep_Tutor::na_zmianie()` wychodzi cicho przez `! self::dostepny()`
(`tutor.php:200`), więc każdy zapis kursu przy wyłączonym Tutorze zostawia kopię
przestarzałą i nikt się o tym nie dowiaduje.

`docs/INSTRUKCJA-INSTALACJI.md` wymienia `wp aai-platnosci sprawdz` raz (przy
walucie) i nie wymienia żadnej kontroli Pluginu 1 ani 3 — weryfikacja po instalacji
jest w całości „na oko".

**Zasięg:** 3 wtyczki, **2** z kontrolą zwracającą kod 1 wpiętą w `postaw.sh` ·
1 `admin_notices` w 28 klasach Pluginu 1 wobec 2 klas `Zaleznosci` w siostrach ·
1 komenda Pluginu 1 z kodem wyjścia, 0 wywołań poza harnessem deweloperskim.

## MAR-A-08 · Alarm o rozjeździe kopii Tutora nie gaśnie drogą, którą sam zaleca — i jest jeden na wszystkie kursy

**Miejsce:** `class-aai-sklep-tutor.php:55` (`OPCJA_BLEDU`), `:1081-1090`
(`zapamietaj_blad`), `:415` (`zapomnij_blad`) · `class-aai-sklep-panel.php:571-591` ·
`class-aai-sklep-cli.php:339`, `:388`

`zapamietaj_blad()` robi `update_option()` na **jednym slocie**. `zapomnij_blad()`
jest w całym repo wołane **z jednego miejsca** — `cli.php:339`, czyli z
`wp aai-sklep sync`. Udana synchronizacja przez `na_zmianie()` (`:199`) flagi
**nie kasuje**. Skutki są trzy:

1. **Notatka w kokpicie kłamie w nieskończoność.** `Panel::stan_kopii()` drukuje:
   *„`wp aai-sklep sync` — ta komenda naprawia kopię; **zapisanie kursu jeszcze raz
   robi to samo**"*. Zapisanie kursu naprawia kopię, ale notatki **nie gasi** —
   docblock tej samej metody (`:568`) obiecuje wprost „pokazujemy go tutaj, dopóki
   nie uda się następna kopia". To jest nieprawda w dokumentacji o zachowaniu, czyli
   klasa BLAD-018.
2. **Kontrola świeci czerwono po naprawie.** `sprawdz_tutora()` (`cli.php:388`)
   ustawia zgodę jako `… && null === $wynik['blad']` i przy `false` robi `halt(1)`.
   Po dowolnej historycznej awarii komenda zwraca **1 na zawsze**, choć dane są
   zgodne co do znaku.
3. **Jeden slot gubi błędy** — awaria kursu B nadpisuje zapamiętaną awarię kursu A.

**Dlaczego to jest architektoniczne, a nie drobiazg:** Plugin 2 rozwiązał dokładnie
tę wadę u siebie i **opisał ją słowo w słowo** (`class-aai-platnosci-komunikaty.php:26-34`):
*„Jeden globalny slot był zatrzaskiem i kłamcą naraz: udany zapis kursu B kasował
błąd kursu A […], a `wp aai-platnosci sync` nie miał jak go zdjąć, więc kontrola
zostawała czerwona po naprawie i uczyła, żeby jej nie ufać."* Plugin 1 ma tę wadę
dalej — w mechanizmie, który jest jedynym alarmem o cichym rozjeździe kopii.

**Zasięg:** 1 slot · 1 miejsce gaszące · 2 konsumenty (`panel.php:575`, `cli.php:388`) ·
`straznik-tutora.mjs` ma 7 niezmienników, **żaden nie dotyczy cyklu życia tej flagi**.

## MAR-A-09 · Zależność niezbywalna Plugin 2 → Plugin 1 nie jest zadeklarowana platformie

**Miejsce:** nagłówki `wordpress/wtyczki/*/aai-*.php:7` · `paczki/KOLEJNOSC-INSTALACJI.txt`

`Aai_Platnosci_Zaleznosci::jest_sklep()` (`:62`) nazywa Plugin 1 zależnością
**niezbywalną**. Wszystkie trzy wtyczki deklarują `Requires at least: 6.5` — czyli
wersję, w której WordPress wprowadził nagłówek **`Requires Plugins:`**, blokujący
aktywację bez zależności. `grep -rn "Requires Plugins" wordpress/wtyczki/` = **0**.
Jedynym nośnikiem kolejności jest plik tekstowy w paczce ZIP i proza instrukcji,
czyli prośba do człowieka.

**Prześledzona ścieżka „klient aktywuje Płatności pierwsze":** `aai-platnosci.php:74`
tabele powstają → `:90` `Ustawienia::napraw()` **wykonuje się w całości** (13 zmian
w cudzych ustawieniach, w tym `monetize_by = wc`, mimo że nie ma sklepu, którego
szew miałby bronić) → `:97` `synchronizuj_wszystkie()` → `zapis.php:1187`
`class_exists('Aai_Sklep_Odczyt')` = false → cicha uwaga do `Komunikatów` pod
kluczem `_ogolny`. Skutek: **zero produktów, zero powiązań**, Tutor przestawiony na
`wc`, a `wp aai-platnosci sprawdz` kończy **kodem 0** (`cli.php:777-786` — świadome
„stan nazwany"), więc nawet operator z WP-CLI nie dostanie czerwieni.

**Zasięg:** 3 nagłówki wtyczek, 0 deklaracji zależności · 1 zależność niezbywalna
nazwana w kodzie · 1 plik tekstowy jako jedyny nośnik kolejności.

## MAR-A-10 · Powiązanie płatnego kursu ma dwa końce; samonaprawia się jeden — ten mniej groźny

**Miejsce:** `class-aai-platnosci-szew.php:35` (`save_post_product`, prio 20) →
`class-aai-platnosci-zapis.php:1291` (`przywroc_znaczniki`) wobec `:913-914`

B13 chroni **produkt** przed cudzymi zapisami: po każdym `save_post_product` wtyczka
odtwarza `_tutor_product`, `_virtual`, `_aai_platnosci_kurs_uuid`
(`ustaw_znaczniki_produktu`, `:1277-1281`). **Drugi koniec — para
`_tutor_course_price_type` / `_tutor_course_product_id` na wpisie Tutora — nie ma
żadnego haka naprawczego.** A to właśnie ten koniec rozdaje kurs za darmo:
`Aai_Sklep_Tutor` sam opisuje mechanizm (`tutor.php:79-85`) — `Course::enroll_now()`
Tutora to publiczny handler POST zapisujący na każdy kurs niebędący `purchasable`,
a `purchasable` przy silniku `wc` czyta wyłącznie te dwie mety.

**Droga do stanu, i to droga zalecana przez sam kokpit.** `Aai_Sklep_Tutor::synchronizuj_kurs()`
zapisuje wpisy przez `wp_insert_post` / `wp_update_post` (`:562`, `:565`) i **nie
dotyka** obu mety B2 (grep: brak w całym pliku poza komentarzem `:84`), więc
aktualizacja istniejącego wpisu jest bezpieczna. Ale jeśli wpisu kursu w Tutorze nie
ma (skasowany ręcznie, przeniesiony do kosza), sync **tworzy nowy** — bez obu met.
`wp aai-sklep sync` woła `Aai_Sklep_Tutor::synchronizuj_kurs()` **wprost**
(`sklep-cli.php:328`), z pominięciem akcji `aai_sklep_kurs_zmieniony`, więc
`Aai_Platnosci_Szew` (prio 20) **nigdy nie dostaje szansy na ponowne powiązanie**.
Kokpit tymczasem zaleca dokładnie tę komendę (MAR-A-08).

Stan jest wykrywany — `rozjazdy_kursu()` (`platnosci-cli.php:960-970`) pyta o obie
mety i daje kod 1 — ale wyłącznie przez komendę uruchomioną ręcznie (MAR-A-11).

**Zasięg:** 2 końce powiązania, 1 z hakiem naprawczym · 4 nośniki tożsamości
powiązania (tabela `powiazania`, `_aai_zrodlo_uuid`, `_aai_platnosci_kurs_uuid`,
`_tutor_course_product_id`) · 1 komenda naprawcza Pluginu 1 omijająca akcję szwu.

## MAR-A-11 · W całym systemie nie ma ani jednego automatycznego wykrywacza rozjazdu

**Miejsce:** brak — `grep -rn "wp_schedule\|wp_next_scheduled\|cron_schedules" wordpress/wtyczki/` = **0**

Wszystkie porównania kopii żyją w komendach WP-CLI. `Aai_Sklep_Tutor::porownaj()`
jest wołane z **jednego miejsca** w repo (`sklep-cli.php:387`). Alarmy pasywne
istnieją, ale są zawężone do ekranów, na które trzeba wejść: `Panel::stan_kopii()`
drukuje się z trzech szablonów kreatora (`panel/lista.php:24`, `panel/kurs.php:81`,
`panel/lekcja.php:55`), a `Aai_Platnosci_Komunikaty::komunikat()` wychodzi, gdy
`screen->id` nie zawiera `aai-sklep` (`komunikaty.php:113-118`) — czyli **kanał
błędów Pluginu 2 jest widoczny wyłącznie na ekranach Pluginu 1**.

**Klasa rozjazdu, której nie widzi nic:** ręczna edycja w Course Builderze Tutora,
ręczna zmiana ceny w Woo, skasowanie wpisu kursu, produkt przestawiony na `draft`
przez cudzą wtyczkę. Żadne z tych zdarzeń nie rzuca wyjątku, więc nie zostawia
nawet wpisu w opcji błędu. Na produkcji nikt nie uruchamia komend.

**Zasięg:** 0 cronów · 2 komendy kontrolne o wartości diagnostycznej · 1 wpięta
w `postaw.sh`, druga w nic poza `smoke-wp-tutor.mjs` · 3 `admin_notices` w całym
produkcie, wszystkie zawężone do konkretnych ekranów.

## MAR-A-12 · Kopia kursu do Tutora nie jest atomowa, a jej kontrola wywraca się na tym, co ma zgłaszać

**Miejsce:** `class-aai-sklep-tutor.php:235-276` (pętla bez transakcji), `:273`
(`usun_nadmiar()` za pętlą), `:255` i `:566` (dwa `throw` w środku) ·
`:342` i `:331` (`porownaj()` bez `try` w pętli po kursach) · `sklep-cli.php:387`

Zapis do **naszych** tabel jest w transakcji (`Aai_Sklep_Zapis::w_transakcji()`,
`zapis.php:940`). Kopia do Tutora — nie: wpis po wpisie, a `usun_nadmiar()` stoi za
pętlą, więc przy wyjątku nie sprząta. Awaria po 30 z 87 obiektów zostawia część
materiału w nowej wersji, część w starej; przy zmianie statusu kursu — część
`private`, część `publish`. Źródło prawdy jest nietknięte, więc `npm run wp:sprawdz`
(73/73 co do znaku) świeci **zielono**; rozjazd widzi tylko `sprawdz-tutora`.

Ta sama komenda ma drugą wadę: `linie_tutora()` (`:1035`) słusznie rzuca wyjątek
przy sekcji o nieznanym kształcie, ale wywołuje ją `plan_kursu()` (`:436`), a
`plan_kursu()` woła też `porownaj()` **w pętli po wszystkich kursach bez `try`**.
Jedna zła sekcja w jednym kursie kończy kontrolę **nieprzechwyconym wyjątkiem
(kod 255)** zamiast kodem 1 z opisem i **nie sprawdza pozostałych kursów**.
Kontrast: `Aai_Platnosci_Zapis::synchronizuj_wszystkie()` ma `try/catch` per kurs
(`:1207`).

**Zasięg:** 1 pętla bez transakcji, 87 obiektów na 2 kursy, 2 punkty rzucenia
wyjątku w środku · 4 z 12 rodzajów sekcji przechodzą przez spłaszczenie
(`SEKCJA_NA_TUTOR`, `tutor.php:69-74`) · 1 pętla kontrolna bez izolacji per kurs.

## MAR-A-13 · Pięć niezależnych wyprowadzeń „jak nazywa się typ wpisu kursu w Tutorze", w tym jedno z innym zachowaniem awaryjnym

**Miejsce:** `class-aai-sklep-tutor.php:171` (adapter `typy()`) ·
`class-aai-sklep-trasy.php:53,380-381` · `class-aai-sklep-zasoby.php:118-119` ·
`class-aai-platnosci-ustawienia.php:775` · `class-aai-platnosci-zapis.php:635`

Adapter `Aai_Sklep_Tutor::typy()` jest wołany przez 2 klasy w 5 miejscach. Ten sam
fakt jest wyprowadzany niezależnie w czterech dalszych. Cztery z pięciu mają
fallback `'courses'`; **`Aai_Sklep_Zasoby` ma `null`**, zjadany przez `array_filter`.

Najostrzejsze jest to, że **własny docblock tej funkcji formułuje regułę, którą ta
sama funkcja łamie osiem linii niżej** (`zasoby.php:92-97`): *„PUBLICZNA, bo pyta
o to także `Aai_Sklep_Styl_Tutora` — i ma pytać TĘ funkcję, a nie mieć własną kopię
warunku. Dwie kopie rozjechałyby się przy pierwszej zmianie w Tutorze, a objawem
byłaby strona bez stylów albo strona motywu z cudzym CSS-em."*

**Scenariusz.** Tutor przemianowuje właściwość `course_post_type`. Adapter, `Trasy`
i obie klasy Pluginu 2 spadają na `'courses'` i działają. `Aai_Sklep_Zasoby` dostaje
`null`, `strona_tutora()` przestaje rozpoznawać strony kursów — a jej konsumenci to
`Aai_Sklep_Styl_Tutora:62` (nie doda arkusza integracji) i `Aai_Sklep_Zasoby:225`
(zdejmie arkusz Tutora ze strony, która go potrzebuje). To dokładnie objaw
z 0.40.0: reguła Tutora poza warstwą kaskady bijąca motyw. Pokrewnie:
`tutor_dashboard_page_id` czytane niezależnie w `zasoby.php:159-167` i `moje.php:170`.

**Zasięg:** 5 wywołań adaptera z 2 klas · 5 niezależnych wyprowadzeń w 6 liniach,
w 2 wtyczkach · 1 z rozbieżnym fallbackiem · 2 niezależnych czytelników
`tutor_dashboard_page_id`.

## MAR-A-14 · Reaktywacja Pluginu 2 bez Pluginu 1 zostawia produkty w `draft` na zawsze

**Miejsce:** `aai-platnosci.php:96-106` · `class-aai-platnosci-zapis.php:1187-1190`

Deaktywacja przestawia produkty na `draft` (`produkty_na_szkic`). Aktywacja próbuje
to cofnąć przez `synchronizuj_wszystkie()`, ale ta wychodzi na
`class_exists('Aai_Sklep_Odczyt')` z samą uwagą. **Nie ma żadnej ścieżki
dogonienia:** hak aktywacji Pluginu 1 (`aai-sklep.php:100-110`) tworzy tabele
i płucze reguły, ale **nie emituje `aai_sklep_kurs_zmieniony`**, więc powrót
Pluginu 1 niczego nie synchronizuje. Produkty wracają do sprzedaży dopiero po
ręcznym `wp aai-platnosci sync` albo po zapisaniu kursu w kreatorze.

Pogorszenie: uwaga ląduje w `Komunikaty` pod `_ogolny`, a ten kanał drukuje się
**wyłącznie na ekranach `aai-sklep`** — których przy wyłączonym Pluginie 1 nie ma.
Gdy Plugin 1 wróci, stary wpis zacznie się drukować i **wisi, dopóki ktoś nie
uruchomi `wp aai-platnosci sync`** (jedyne miejsce czyszczące `_ogolny`:
`platnosci-cli.php:162-166`) — czyli ta sama klasa co MAR-A-08, druga wtyczka.

## MAR-A-15 · Wyłączenie Pluginu 1 odsłania drugą stronę sprzedażową w wyglądzie Woo

**Miejsce:** `class-aai-platnosci-ustawienia.php:335-343`

`przekieruj_ze_strony_produktu()` (301 z `/product/<slug>/` na naszą stronę) wychodzi
przez `return`, gdy `! class_exists('Aai_Sklep_Odczyt')`. Produkt zostaje `publish`
(Plugin 2 dalej aktywny), a `catalog_visibility = hidden` chowa go tylko z list, nie
zamyka własnego adresu. Blokada koszyka przy otwartej sprzedaży przepuszcza. Wraca
dokładnie stan zamknięty w 0.59.0: **klient kupuje kurs na stronie w cudzym
wyglądzie**, przy kursie, którego danych i strony sprzedażowej już nie ma.
Kontrola to nazywa (`platnosci-cli.php:694-703`, kod 1) — jeśli ktoś ją uruchomi.

## MAR-A-16 · Odinstalowanie: obietnica „do zera", trzy różne poziomy higieny, flaga sprzedaży przeżywająca wszystko

**Miejsce:** `aai-sklep/uninstall.php:14-15` · `aai-platnosci/uninstall.php:43-44` ·
`aai-monitor/uninstall.php:32-49`

`aai-sklep/uninstall.php` deklaruje: *„Wtedy i tylko wtedy ten plik **czyści po sobie
do zera**"*. Nie czyści — `grep -c "postmeta\|post_meta\|wp_delete_attachment\|wp_delete_post"`
w trzech plikach uninstall = **0, 0, 0**. Po odinstalowaniu WSZYSTKICH trzech,
z włączoną flagą kasowania, zostaje: **148 załączników zrzutów** z metami
`_aai_zrzut_*`, wpisy Tutora z **ośmioma** naszymi metami (`_aai_zrodlo_uuid`,
`_aai_cena_grosze`, `_aai_badge`, `_aai_typ`, `_aai_okladka_url`, `_aai_sekcje`,
`_aai_zapowiedz`, `_aai_materialy`), produkty Woo z trzema, załączniki okładek z dwiema.
`aai-sklep` jako jedyny **nie ma sekcji „CO TEN PLIK ZOSTAWIA ZAWSZE"**, którą mają
obie siostry — i jako jedyny zostawia najwięcej.

Opcje: `aai-monitor` kasuje swoją opcję błędu i sól nawet w gałęzi „nie kasuj danych".
`aai-sklep` i `aai-platnosci` nie kasują **żadnej** swojej opcji błędu, a
`aai_platnosci_sprzedaz_otwarta` przeżywa pełne odinstalowanie. To jest istotne, bo
`Ustawienia` deklaruje wprost (`:13-16`): *„SPRZEDAŻ OTWIERA CZŁOWIEK, NIE
AKTUALIZACJA"*. Po odinstalowaniu z kasowaniem danych i ponownej instalacji:
tabele powstają, `napraw()` ustawia silnik, `synchronizuj_wszystkie()` publikuje
produkty — i **sprzedaż jest otwarta od pierwszej sekundy**, przy pustym dzienniku
`dostawy`, czyli przy skasowanym nośniku idempotencji maili.

**Zasięg:** 15 kluczy meta `_aai_*` w kodzie, 19 wywołań zapisu meta, **0** sprzątanych ·
4 opcje niekasowane przez żaden uninstall (`aai_sklep_wersja_regul`,
`aai_sklep_tutor_blad`, `aai_platnosci_blad`, `aai_platnosci_sprzedaz_otwarta`) ·
148 plików w bibliotece mediów.

## MAR-A-17 · Pierwszy import zostawia produkty jako `draft` i nie mówi o tym ani słowa

**Miejsce:** `class-aai-sklep-import.php:119` / `:160` (wstrzymanie) ·
`class-aai-sklep-zapis.php:919-928` (`powiadom()` zawsze) ·
`class-aai-platnosci-szew.php:31` (prio 20, brak odpowiednika wstrzymania) ·
`class-aai-platnosci-zapis.php:934-943`

`Aai_Sklep_Tutor` ma pauzę na czas importu masowego (`$wstrzymana`), żeby kopia
poszła raz na kurs. `Aai_Platnosci_Szew` **odpowiednika nie ma** (grep:
`wstrzymaj|wznow|wstrzymana` występuje wyłącznie w `class-aai-sklep-tutor.php`
i `class-aai-sklep-import.php`). Biegnie więc w każdej iteracji importu, gdy kopii
kursu w Tutorze jeszcze nie ma → produkt dostaje `draft` z uwagą „dokończy sync".
Po pętli import synchronizuje Tutora **wprost** (`import.php:164-170`), z pominięciem
akcji — więc Plugin 2 nie dostaje drugiej szansy.

Po wdrożeniu na nowej instalacji katalog i strony sprzedażowe działają, a **żadnego
kursu nie da się kupić**. `Aai_Sklep_Cli::import()` drukuje liczniki naszych tabel
i kopii w Tutorze — o produktach ani słowa. Naprawa jest doklejona **tylko w npm**
(`package.json:25`: `… import … && npm run wp:sync-platnosci`); udokumentowany
przykład komendy (`sklep-cli.php:55`) jej nie ma, a `postaw.sh` nie importuje wcale.

## MAR-A-18 · Downgrade wtyczki nie ma żadnego zabezpieczenia

**Miejsce:** `aai-sklep/…-tabele.php:199-204` · `aai-platnosci/…-tabele.php:121-125` ·
`aai-monitor/…-tabele.php:219-223`

Wszystkie trzy porównują wersję **`!==`**, nie kolejnością. Wgranie starszej wtyczki
na nowszy schemat spełnia ten warunek, uruchamia `utworz()` **starej wersji**
i zapisuje starą wersję jako aktualną. Dziś nieszkodliwe: `dbDelta` nie usuwa kolumn
ani tabel, a historia schematu zna wyłącznie dodawanie. Ryzyko jest prospektywne
i konkretne — `dbDelta` wystawia `ALTER … CHANGE`, gdy typ kolumny się różni, a
instalacja stoi na nieścisłym `sql_mode` (udokumentowane w tym repo własnym
pomiarem, `platnosci-zapis.php:179-182`). Pierwsze zwężenie w historii (np.
`lessons.content mediumtext` → `text`, `sklep-tabele.php:147`) **utnie prozę lekcji
po cichu**.

**Zrobione wzorcowo mimo braku ochrony:** migracja soli podpisu opcja → tabela
(`monitor-podpis.php:212-246`) nie kasuje starej opcji, więc downgrade monitoringu
odzyskuje sól co do znaku, a `stan_soli()` (`:163-176`) nazywa trzy stany rozjazdu.

---

# ZNALEZISKA MAŁE

## MAR-A-19 · Kolejność ładowania wtyczek jest odwrotna do kolejności zależności

WordPress ładuje wtyczki alfabetycznie: `aai-monitor` → `aai-platnosci` → `aai-sklep`,
czyli **Plugin 3, potem 2, na końcu 1** — dokładnie odwrotnie niż zależności.
Projekt już raz to obszedł punktowo, bez nazwania jako właściwości:
`aai-monitor.php:130` rejestruje menu z priorytetem 20 *„bo wtyczki ładują się
alfabetycznie i `aai-monitor` biegnie PRZED `aai-sklep`"*.

Drugi objaw: **trzy handlery `template_redirect` na priorytecie 1, w dwóch
wtyczkach** — `Aai_Platnosci_Ustawienia::przekieruj_ze_strony_produktu`
(`ustawienia.php:186`, rejestrowany **przy include pliku**, więc zawsze pierwszy),
`Aai_Sklep_Lekcja::odpowiedz_zaslony` (`lekcja.php:65`),
`Aai_Sklep_Trasy::przekieruj_z_tutora` (`trasy.php:65`); dalej `ustal_odpowiedz`
(prio 2) i `Aai_Sklep_Moje::przekieruj_z_panelu` (prio 5). Każdy z tych trzech może
`wp_safe_redirect` + `exit`. Dziś ich zbiory żądań są rozłączne, więc nic się nie
psuje — ale rozstrzygnięcie ewentualnej kolizji zależałoby od **nazwy pliku wtyczki**,
nigdzie nie zapisanej jako założenie.

## MAR-A-20 · Odwrotny szew `aai_monitor_strona_za_bramka` — jedyny handler bez osłony

**Miejsce:** `class-aai-sklep-lekcja.php:202`

```php
public static function za_bramka( bool $za_bramka ): bool {
```

Sygnatura ma **twardy typ skalarny bez wartości domyślnej**, plik ma
`declare( strict_types = 1 )` (`:32`), a metoda **nie ma `try/catch`**. To jedyny
z siedmiu handlerów szwów tak zbudowany: wszystkie pięć handlerów Pluginu 2
(`z_woo`, `stan`, `dostepnosc`, `na_usunieciu`, `zamowienia_w_drodze`) przyjmuje
`mixed` z wartością domyślną i waliduje kształt (naprawa `REA-ARCH-F1-003`), a
każdy jest w `try/catch ( Throwable )` zgodnie z niezmiennikiem 17.

Dziś nic tego nie wyzwala — `Aai_Monitor_Pomiar::za_bramka()` (`pomiar.php:130`)
podaje literalne `false`. Ale to filtr publiczny: dowolny callback o niższym
priorytecie zwracający `1` albo `null` daje `TypeError` na stronie lekcji, czyli
**biały ekran na treści, za którą klient zapłacił**. Hartowanie zastosowane do trzech
filtrów idących w jedną stronę nie objęło jedynego idącego w drugą.

## MAR-A-21 · Deaktywacja `aai-sklep` prawdopodobnie utrwala własne reguły przepisywania zamiast je zdjąć

**Miejsce:** `aai-sklep.php:117-122` · `class-aai-sklep-trasy.php:58-60, 88-103, 133-146`

Fakty po naszej stronie potwierdzone co do linii: reguły dodaje `dodaj_reguly()` na
haku `init`; hak deaktywacji woła gołe `flush_rewrite_rules()`, które regeneruje
tablicę z `$wp_rewrite` i zapisuje ją do `wp_options`. Ponieważ WordPress uruchamia
hak deaktywacji w żądaniu, w którym wtyczka była aktywna na starcie (a więc po
`init`), regeneracja obejmuje **nasze trzy reguły** — deaktywacja utrwala to, co
miała usunąć. Dodatkowo `aai_sklep_wersja_regul` nie jest kasowane ani przy
deaktywacji, ani przez `uninstall.php`.

**Uczciwie:** kolejność haków rdzenia WordPressa to lektura, nie mój pomiar — tej
pozycji nie da się rozstrzygnąć statycznie do końca (patrz sekcja na końcu).

## MAR-A-22 · Katalog `/szkolenia` pobiera dane sam, z pominięciem własnego wzorca

**Miejsce:** `wordpress/wtyczki/aai-sklep/szablony/katalog.php:15` i `:18`

Wtyczka ma na to wzorzec: `Aai_Sklep_Trasy::kurs()` (`trasy.php:203-213`) to
zapamiętany akcesor, którego docblock mówi wprost *„Pyta o niego szablon, dane
strukturalne i tytuł dokumentu; bez pamięci podręcznej byłyby to trzy komplety
zapytań o ten sam kurs"*; `szablony/kurs.php:19` z niego korzysta. Katalog woła
`Aai_Sklep_Odczyt::lista_kursow()` wprost, a ta nie ma pamięci — więc każde wejście
na `/szkolenia` wykonuje ją **dwa razy**: raz z `Aai_Sklep_Seo::dane_strukturalne()`
(`seo.php:202`, na `wp_head`), raz z szablonu. Dziś obie odpowiedzi są identyczne;
klasa ryzyka jest ta sama, którą `Aai_Sklep_Widok::cena_grosze()` świadomie zamknęła
pamięcią (K2 z krytyki P0): dwa odczyty tej samej rzeczy w jednym żądaniu mogą się
rozjechać między wyszukiwarką a człowiekiem.

**Zasięg:** 37 szablonów, 7 pobiera dane albo wejście samodzielnie, 2 wywołania
warstwy odczytu z szablonu (oba w `katalog.php`), 4 zapytania SQL z tego pliku.

## MAR-A-23 · Pigułka lekcji odpytuje cudzą wtyczkę w podwójnej pętli, z warstwy widoku

**Miejsce:** `szablony/czesci/pasek-lekcji.php:19` i `:58`

Docblock tego pliku (`:11`) deklaruje *„Oczekuje `$dane` z `Aai_Sklep_Lekcja::dane()`"*,
a mimo to szablon dwa razy wychodzi po stan spoza `$dane` — raz zbiorczo
(`ile_ukonczonych`, pętla po programie), raz per wiersz w zagnieżdżonym `foreach`.
Obie kończą w `tutor_utils()->is_completed_lesson()`. Przy Kursie 1 (41 lekcji) to
**82 wywołania do cudzej wtyczki z warstwy widoku** na jedną odsłonę.

**To nie jest dziś znalezisko wydajnościowe** — `is_completed_lesson()` to
`get_user_meta()`, czyli jedno zapytanie na całą metę użytkownika. Jest
architektoniczne: cena tej pętli zależy w całości od implementacji cudzej metody.
Tutor już raz zamienił podobny odczyt na `$wpdb->get_row` (`is_completed_course()`),
i taka zmiana zrobiłaby z tego 82 zapytania na odsłonę — bez zmiany ani jednej linii
u nas i bez żadnego objawu poza wolniejszą stroną. `Aai_Sklep_Lekcja::policz()` już
liczy `'ukonczona'` dla bieżącej lekcji (`:396`) — mechanizm „policz raz, podaj
szablonowi" istnieje i po prostu nie objął pozostałych lekcji.

## MAR-A-24 · Jedyny szablon sięgający wprost do globalnego obiektu cudzej wtyczki

**Miejsce:** `szablony/czesci/lekcja-odhacz.php:33` — `wp_nonce_field( tutor()->nonce_action, tutor()->nonce, false )`

Jedyne w 37 szablonach odwołanie do `tutor()`; omija `Aai_Sklep_Tutor`, czyli klasę
deklarującą się jedynym mostem. Osłona przed brakiem Tutora jest (`function_exists`,
`:21`), więc to nie fatal. Ale `nonce_action` i `nonce` to zwykłe właściwości
obiektu, nie API: po ich przemianowaniu `wp_nonce_field(null, null)` wygeneruje pole
o domyślnej nazwie, formularz wyrenderuje się normalnie, a Tutor odrzuci żądanie.
**Klient klika „Oznacz jako przerobioną" i nic się nie dzieje**, pasek postępu stoi,
a żadna z 15 bramek WP tego nie zobaczy — bo HTML jest, przycisk jest.

## MAR-A-25 · Szablon 404 sam rozstrzyga trasę z `$_SERVER`

**Miejsce:** `szablony/nie-znaleziono.php:23-24`

Szablon czyta surowy `REQUEST_URI` i sam decyduje o dwóch wariantach treści, przy
czym prefiks `'szkolenia'` jest wpisany literałem — mimo że wtyczka trzyma ścieżki
w `Aai_Sklep_Moje::SCIEZKA` i `Aai_Sklep_Trasy::PODSTRONY`, a `Aai_Sklep_Trasy` jest
już na tej ścieżce i mogłaby podać gotową flagę. Jedyny szablon czytający `$_SERVER`
(1 z 37); jedyny literał trasy w szablonach frontu.

## MAR-A-26 · Dwa wejścia do „Moich kursów" z różnymi regułami widoczności

**Miejsce:** `class-aai-sklep-menu.php:131` wobec `class-aai-sklep-moje.php:129`

Menu motywu pokazuje pozycję warunkowo (`… && Aai_Sklep_Moje::ma_kursy()`); menu
konta WooCommerce dokłada ją **bezwarunkowo**. Warunek mieszka w klasie
`Aai_Sklep_Moje`, a klasa stosuje go w jednym ze swoich dwóch wejść. Skutek:
subskrybent bez kursu, administrator albo klient po anulowanym zamówieniu widzi na
`/my-account/` „Moje kursy" jako **pierwszą** pozycję i trafia na pustą listę.
Stan pusty jest obsłużony uczciwie (`szablony/moje.php:38-45`), więc szkody nie ma.

## MAR-A-27 · Produkt-sierota z `_aai_zrodlo_uuid` jest niewidzialny dla obu kontroli sierot

**Miejsce:** `class-aai-platnosci-zapis.php:571-597` i `:775-793` ·
`class-aai-platnosci-cli.php:1004-1013` i `osierocone()`

`produkt_po_znaczniku()` odmawia przy więcej niż jednym trafieniu i zwraca `null`,
więc `synchronizuj_kurs()` tworzy **kolejny** produkt. Nadmiarowy ma
`_aai_zrodlo_uuid`, ale nie ma ani wiersza w `powiazania`, ani
`_aai_platnosci_kurs_uuid` (ten stawia dopiero `ustaw_znaczniki_produktu()` po
udanym powiązaniu). Tymczasem `osierocone()` iteruje **wyłącznie po wierszach
`powiazania`**, a `duplikaty_uuid()` grupuje **wyłącznie po `_aai_platnosci_kurs_uuid`**.
Duplikat zostaje `draft` (niekupowalny), więc szkody sprzedażowej nie ma — ale przy
każdym przerwanym `sync` przybywa jeden i **żadna kontrola go nie policzy**, wbrew
komentarzowi `zapis.php:750`. 3 klucze tożsamości produktu, 2 kontrole sierot,
0 pytających o `_aai_zrodlo_uuid`.

## MAR-A-28 · Brakujący zrzut widzi płacący klient, a na instalacji nie wykrywa go nic

**Miejsce:** `class-aai-sklep-zrzuty.php` · `class-aai-sklep-proza.php:610-618` ·
`class-aai-sklep-cli.php:443`

Źródłem prawdy są pliki repo (**148 `.webp`**), kopią biblioteka mediów, a
przeniesienie jest ręczne (`wp aai-sklep zrzuty <manifest>`) i **nie jest wpięte
w `postaw.sh`**. Przy braku wpisu proza renderuje widoczny prostokąt „brak pliku” —
celowo, i to jest lepsze niż zepsuty obrazek. Ale na żywej instalacji nic nie
porównuje kompletu: `Zrzuty::ile()` zwraca samą liczbę, a `straznik-podgladu-kursow`
i `smoke-wp-lekcja` działają w repo, nie na produkcji. Odtworzenie środowiska
wymaga **trzech** komend (`wp:import` → `wp:sync` → `wp:zrzuty`); po pominięciu
trzeciej klient czyta lekcję z podpisanymi dziurami, a obie kontrole świecą kod 0.

## MAR-A-29 · Reguła strażnika „do naszych tabel pisze tylko warstwa zapisu" ma trzy obejścia

**Miejsce:** `tools/straznicy/straznik-wtyczki-wp.mjs:186-196`, `:159`, `:274`

1. Wzorzec `$wpdb->query(\s*["']?\s*(INSERT|UPDATE|…)` **nie widzi**
   `$wpdb->query( $wpdb->prepare( "INSERT …" ) )` — a to jest idiom używany w tym
   repo (`platnosci-zapis.php:113-131`, `:196-206`). Ten sam kod w dowolnym innym
   pliku przeszedłby na zielono.
2. Reguła 6 usuwa `$wpdb->\w+` z łańcucha przed sprawdzeniem (`:159`), więc
   `"UPDATE {$wpdb->prefix}aai_sklep_lessons SET content = %s"` przechodzi reguły
   **3, 6, 10 i 11 naraz**. Idiom `{$wpdb->prefix}wc_orders` w repo już jest
   (`platnosci-cli.php:478, 483`).
3. Reguła 11 pyta wyłącznie o `*_Tabele::`, więc granica „nie dotykamy cudzych
   tabel" nie obejmuje **żadnego** zapisu przez API WordPressa. Poza warstwami
   zapisu piszą do `wp_posts`/`wp_postmeta`/`wp_options`: `sklep-tutor.php` (11
   wywołań), `sklep-zrzuty.php` (8), `platnosci-ustawienia.php` (3, w tym
   `update_option( 'tutor_option' )` — nadpisanie konfiguracji cudzej wtyczki).

**Dziś naruszeń nie ma** (`$wpdb->query(` poza warstwami zapisu = trzy `DROP TABLE`
w `uninstall.php`), więc to luka w bramce, nie czynny błąd. Ale reguła istnieje po
to, żeby złapać zapis, który nie objawia się błędem.

---

# Macierz: co się dzieje, gdy komponentu X nie ma

Wyprowadzone statycznie z kodu; oznaczam, gdzie degradacja jest **cicha** (nikt
nie zostaje powiadomiony) i gdzie **permisywna** (brak odpowiedzi = zgoda).

| Nieobecny | Katalog / strona kursu | Dostęp kupującego | Sprzedaż | Co ostrzega | Co się psuje po cichu |
|---|---|---|---|---|---|
| **`aai-platnosci`** (wyłączona) | działa; CTA wraca na `/kontakt` — **także komuś, kto kurs ma** (`widok.php:245`) | **nietknięty** (4 drogi sprawdzone: lekcja, „Moje kursy", maile, dziennik dostaw — żadna nie pyta o produkt) | produkty → `draft`, koszyk martwy | `Zaleznosci::komunikat()` na każdym ekranie admina | **hamulec „zamówienia w drodze" znika (MAR-A-03)**; 12 z 13 ustawień Woo/Tutora zostaje przestawionych (MAR-A-02); kanał błędów niewidoczny (MAR-A-14) |
| **`aai-sklep`** (wyłączony) | `/szkolenia/` oddaje 200 ze stroną główną motywu (miękkie 404) | zapis w Tutorze zostaje, ale nasze „Moje kursy" i widok lekcji znikają | **produkty zostają `publish` i kupowalne** przez `?add-to-cart` i `/product/<slug>/` | `aai-platnosci sprawdz` → **kod 1** z komendą naprawy; `Zaleznosci` w kokpicie | **`/product/<slug>/` staje się drugą stroną sprzedażową w wyglądzie Woo (MAR-A-15)**; kanał błędów P2 milknie (widoczny tylko na ekranach P1) |
| **`aai-monitor`** | bez zmian | bez zmian | bez zmian | — | nic (najczystsza granica w projekcie) |
| **WooCommerce** | działa | nietknięty | brak | `Zaleznosci` P2; filtr B17 sam się rozbraja (`ustawienia.php:210-214`) | — |
| **Tutor LMS** | działa | **brak** (dostęp JEST Tutorem) | produkt kupowalny, dostawa niemożliwa | `Zaleznosci` P2 | **`kupujacy()` = 0 → hamulec usuwania kursu milknie (MAR-A-03)**; kopia kursu przestaje się aktualizować bez ani jednego komunikatu (MAR-A-07) |
| **Plugin 2 aktywowany PRZED Pluginem 1** | brak | brak | 0 produktów | `Zaleznosci`; `sprawdz` → **kod 0** | 13 cudzych ustawień już przestawionych; brak ścieżki dogonienia (MAR-A-09, MAR-A-14) |
| **jeden uszkodzony plik klasy w `aai-sklep`** | zależy od pozycji w łańcuchu | zależy | zależy | `admin_notices` z `catch` + `error_log` | **wyciek 73 lekcji przez `/?post_type=lesson` i mapę strony, jeśli awaria trafi w pozycje 1–11 z 13 (MAR-A-06)** |
| **kurs „Ukryty"** | strona 404, karta znika | **materiał żyje, ale klient nie ma do niego ŻADNEJ drogi (MAR-A-01)** | produkt → `draft` | nic | produkt wypada z `sync` i z kontroli rozjazdu (chodzą po `lista_kursow()`) |

---

# Co sprawdziłem i jest BEZ ZARZUTU

Nie szukać drugi raz.

**Granice, które trzymają**
* **Plugin 1 nie woła ANI JEDNEJ klasy Pluginu 2 ani 3**; Plugin 3 nie woła ani jednej
  klasy Pluginu 1 ani 2 (0 trafień w obie strony, poza komentarzami). Napis „DZIAŁA SAM"
  przy P1 i P3 na `SYSTEM.drawio` jest prawdziwy.
* **Zero cykli zależności** — 55 klas, potwierdzone niezależnie przez sektor
  (z kontrprzykładem: na drzewie sprzed napraw detektor wskazuje dokładnie 3 cykle).
* **Warstwy odczytu nigdy nie piszą** — `class-aai-sklep-odczyt.php`,
  `-odczyt-panelu.php`, `-monitor-odczyt.php`, `-sklep-raport.php`: wyłącznie
  `get_results`/`get_row`/`get_col`/`get_var`/`prepare`. Ani jednego `set_transient`.
* **Kontrole nigdy nie piszą** — `Aai_Platnosci_Cli::sprawdz()`, `Aai_Sklep_Cli::sprawdz()`,
  `sprawdz_tutora()`, `Aai_Monitor_Cli::sprawdz()`. Sprawdzone dwa mylące sąsiedztwa:
  `zapomnij_blad()` jest wołane wyłącznie z `sync`, a jedyne `update_option` w CLI
  płatności siedzi w komendzie `sprzedaz`.
* **Warstwy zapisu nie składają HTML, napisów widoku ani adresów.**
* **Kreator pisze wyłącznie przez warstwę zapisu** — `Panel_Akcje` ma 4 operacje
  zapisu, wszystkie przez `Aai_Sklep_Zapis::`.
* **`Aai_Sklep_Widok`** — 631 linii, zero `$wpdb`, zero `get_post_meta`, zero `wc_*`.
  Fasada prezentacji, nie ukryta warstwa dostępu.
* **Uprawnienia i trasy nie wyciekają** — `AAI_SKLEP_UPRAWNIENIE` i `Trasy::PODSTRONY`
  wyłącznie w `aai-sklep`; twardych literałów `/szkolenia/`, `/koszyk/`, `/kasa/`
  w Pluginach 2 i 3: **0**.
* **Podział sitemapy między wtyczkami jest wzorcowy**: `Aai_Sklep_Sitemap` i
  `Aai_Platnosci_Sitemap` wiszą na tym samym filtrze, obie **dokładają** do
  `post__not_in` zamiast nadpisywać, i każda w komentarzu nazywa drugą. Jedyne
  miejsce, gdzie dwie wtyczki dzielą punkt zaczepienia — i zrobione tak, że
  kolejność ładowania nie ma znaczenia.

**Cykl życia i dane**
* **Dostęp kupującego jest odporny na cały cykl życia Pluginu 2** — sprawdzone
  osobno na czterech drogach.
* **Domyślne niekasowanie danych** we wszystkich trzech `uninstall.php`, z flagą
  opt-in i strażnikiem `WP_UNINSTALL_PLUGIN`. Listy tabel kompletne wobec
  `Tabele::wszystkie()` (5, 2, 3).
* **`aai-monitor` jest jedyną wtyczką o w pełni symetrycznym cyklu życia** — nie
  zmienia ani jednego cudzego ustawienia, więc nie ma czego cofać.
* **`produkty_na_szkic()`** sprawdza `post_type`, sprawdza WYNIK `wp_update_post`,
  łapie `Throwable` per produkt i melduje listę nieudanych.
* **Pusty uuid nie dopasowuje niczego** po obu stronach (`tutor.php:885-903`,
  `platnosci-zapis.php:619-643`) — to była realna cicha utrata 18 lekcji przy P5.
* **`powiazanie_ustaw()` świadomie nie używa `ON DUPLICATE KEY UPDATE`** — konflikt
  UNIQUE to odmowa, nigdy cicha podmiana cudzego wiersza.
* **`dostawa_odnotuj()` jest atomowa przez UNIQUE**, z rozróżnieniem `false` vs `0`.
* **Kolejność B2** (`price_type` przed `product_id`, odwrotnie przy zdejmowaniu) jest
  zachowana i uzasadniona.
* **Dostęp i postęp nie mają drugiej kopii** — liczy je wyłącznie Tutor. Świadomy
  wybór, który oszczędził trzeci rozjazd.
* **Cena ma jedno wejście filtru** (`widok.php:168`), używane też przez JSON-LD
  (`seo.php:284`) — dane strukturalne nie mogą rozjechać się ze stroną.
* **„Brak klucza znaczy nie ruszaj"** jest konsekwentne w całej warstwie zapisu
  Pluginu 1: status, sekcje, program, treść i materiały lekcji.
* **Zapisów surowym SQL do cudzych tabel: 0** (8 miejsc, wszystkie SELECT).
* **Migracja soli podpisu** opcja → tabela: przejmuje wartość co do znaku, nie kasuje
  źródła, ma kontrolę rozjazdu z trzema nazwanymi stanami. Odporna na downgrade.

**Schematy**
* **7 z 7 szwów jest narysowanych i wszystkie mają poprawny kierunek**, łącznie
  z odwróconym `aai_monitor_strona_za_bramka` (P3 pyta, P1 odpowiada) — narysowanym
  poprawnie w trzech miejscach.
* **Nie ma na rysunkach niczego zmyślonego**: 0 tras REST i 0 `wp_ajax_*` w kodzie
  (rysunki deklarują zero — prawda), tabele 5/2/3 zgodne, wszystkie nazwy klas
  istnieją, priorytety i liczby argumentów zgodne z opisem.

---

# Czego NIE da się rozstrzygnąć statycznie

Wszystko poniżej wymaga uruchomienia — świadomie tego nie robiłem (tor B był zajęty
przez inną rolę, a mutacja pliku wtyczki jest widoczna na obu torach naraz).

1. **MAR-A-21** (deaktywacja utrwala reguły przepisywania) — kod po naszej stronie
   potwierdzony co do linii, ale wniosek opiera się na kolejności haków rdzenia
   WordPressa. Sprawdzić: `wp plugin deactivate aai-sklep`, potem
   `wp option get rewrite_rules --format=json | grep szkolenia`.
2. **MAR-A-06** — czy uszkodzenie pliku na pozycji ≤ 11 naprawdę odsłania
   `/?post_type=lesson`. Test: `chmod 000` na `class-aai-sklep-seo.php`,
   `curl '…/?post_type=lesson'`, potem przywrócić. **Wymaga wolnego toru.**
3. **MAR-A-10** — czy `wp aai-sklep sync` po skasowaniu wpisu kursu w Tutorze
   naprawdę zostawia kurs bez `_tutor_course_product_id` i czy `Course::enroll_now()`
   wpuszcza wtedy za darmo. Zmierzyć w kolejności: skasuj wpis → `sync` →
   `wp post meta list <nowy_id>` → próba zapisu obcym kontem.
4. **MAR-A-01** — czy „Ukryj" faktycznie zdejmuje pozycję menu i kafelek; wykonalne
   kontem `klient-test` (na `:8892` jest zapisane na oba kursy).
5. **MAR-A-23** — czy `is_completed_lesson()` w Tutorze **4.0.7** (instalacja) dalej
   stoi na `get_user_meta`; sondy czytały 4.0.6 z `~/mp-test-env`.
6. **MAR-A-18** — zachowanie `dbDelta` przy zwężeniu typu kolumny na tej instalacji
   (nieścisły `sql_mode`).
7. **Czy MAR-A-05 jest świadomą decyzją** — w kodzie `straznik-granic` ani
   w `docs/SCHEMATY.md` nie ma zdania rozstrzygającego, czy miał kiedykolwiek objąć
   PHP. To pytanie do właściciela, nie ustalenie audytu.
