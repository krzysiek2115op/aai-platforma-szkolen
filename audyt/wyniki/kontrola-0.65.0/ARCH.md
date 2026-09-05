# Fala kontrolna 0.65.0 — dział ARCH

**Data:** 2026-09-05 · **Tor:** B (`STACK_NAZWA=aai_wp_b`, `http://127.0.0.1:8894`)
**HEAD gałęzi:** `2f1aeb66f3a87c2a25c3e2a994580fdc678652f9` (`re-audyt/sektor-re-audytu`)
**Kod produktu odtwarzany na torze B:** stan po naprawach 0.65.0 (bind mount `wordpress/wtyczki/*` z tej gałęzi).

## Wpisy wejściowe — werdykt i dowód

| Wpis | Stwierdzenie (skrót) | Werdykt | Dowód (komenda + wynik) |
|---|---|---|---|
| `AUD-ARCH-F1-001` | `Aai_Monitor_Podpis::sol()` pisała surowym INSERT-em do `$wpdb->options` (cudza tabela rdzenia) | **NAPRAWIONE** | `grep -n "wpdb->query\|wpdb->options" class-aai-monitor-podpis.php` → zero trafień na `options`; jedyne zapytanie do bazy to `SELECT ... FROM {$t}` na `wp_aai_monitor_ustawienia` (własna tabela wtyczki, linia 186). `wp eval` na torze B: `SELECT wartosc FROM wp_aai_monitor_ustawienia WHERE klucz='sol_podpisu'` → wartość obecna (64 znaki), `get_option('aai_monitor_sol_podpisu')` → `false` (fresh install bez migracji — spójne z opisem fallbacku). |
| `AUD-ARCH-F1-003` | Cykl `Aai_Platnosci_Ustawienia ↔ Aai_Platnosci_Cta` | **NAPRAWIONE** | `grep -rn "Aai_Platnosci_Cta::" wordpress/wtyczki/aai-platnosci/includes/*.php` → zero trafień poza samą klasą; `Aai_Platnosci_Ustawienia::stan_dostepnosci()` (linia 393) woła teraz `Aai_Platnosci_Posiadanie::stan_posiadania()`, nowa klasa-liść bez zależności od reszty wtyczki. Cta (linia 106) dalej woła `Ustawienia::sprzedaz_otwarta()` — jedna strzałka, nie dwie. Niezależny graf zależności (własny skrypt, 55 klas, krawędzie = `Klasa::` w kodzie bez komentarzy) → **0 cykli w całym repo**. |
| `AUD-ARCH-F1-004` | Cykle `Trasy↔Panel` i `Trasy→Panel→Kontrakt→Trasy` w aai-sklep | **NAPRAWIONE** | `Aai_Sklep_Trasy::widzi_szkice()` (linia 191) woła teraz stałą globalną `AAI_SKLEP_UPRAWNIENIE` (zdefiniowaną w `aai-sklep.php:60`), nie `Aai_Sklep_Panel::UPRAWNIENIE` — Trasy nie ma już ŻADNEJ wychodzącej krawędzi do Panel/Kontrakt. Ten sam niezależny graf (55 klas) → 0 cykli. |
| `REA-ARCH-F1-002` | `AUD-ARCH-F1-002` ma status `ZWERYFIKOWANE` mimo sprzecznych werdyktów (krytyk ODRZUCAM / weryfikator ISTNIEJE) — usterka narzędzia `werdykt.mjs`, nie kodu produktu | **NIE DOTYCZY PRODUKTU** (potwierdzone niezależnie) | Przedmiotem stwierdzenia jest zachowanie `audyt/tools/werdykt.mjs`, nie plik `wordpress/wtyczki/...` wskazany w polu „miejsce" (to pole jest ponownym użyciem lokalizacji z `AUD-ARCH-F1-002`, nie miejscem samej usterki). `sed -n '205,210p' audyt/tools/werdykt.mjs` → `if (komplet(wpis)) wpis.status = "ZWERYFIKOWANE";` — status zależy wyłącznie od KOMPLETU werdyktów, nie od ich treści, dokładnie jak twierdzi wpis. Klasyfikacja wpisu to `checklista` (aparat audytu), nie `granica` (produkt). ARCH nie ma mandatu do orzekania o kodzie sektora audytu (poza zakresem `wordpress/wtyczki/*` + `docs/schematy`). |
| `REA-ARCH-F1-003` | `Aai_Platnosci_Cta::stan()` nie waliduje klucza `napis` w `$domyslne` — PHP Warning przy niepełnym wejściu z publicznego filtra | **NAPRAWIONE** | `sed -n '150,155p' class-aai-platnosci-cta.php` → `$domyslne = array_merge( array( 'adres' => '', 'napis' => '' ), $domyslne );` przed użyciem. Odtworzone TYM SAMYM wywołaniem co w dowodzie oryginalnym: `wp eval` z `set_error_handler` + `apply_filters('aai_sklep_cta_kursu', array('domyslne'=>true), array())` → **zero ostrzeżeń**, wynik `array('adres'=>'','napis'=>'','domyslne'=>true)`. |

## Regresje w zakresie (checklista ARCH-R1…R6, ARCH-90)

**Brak regresji — 7 pozycji sprawdzonych, wszystkie z dowodem:**

1. **ARCH-R1** (odtworzenie ZWERYFIKOWANYCH wpisów uruchomieniowo) — wszystkie 5 wpisów odtworzone na torze B identyczną albo równoważną komendą co oryginalny dowód (tabela wyżej), nie przeczytane z pliku.
2. **ARCH-R2 / ARCH-R5** (pełny zasięg klasy „cykl zależności statycznych") — własny detektor (nie kopia audytowego) przebiegł WSZYSTKIE 55 klas trzech wtyczek: **0 cykli**, w tym zero NOWYCH cykli wprowadzonych naprawami (naprawa AUD-ARCH-F1-003 sama w sobie utworzyła nową klasę `Aai_Platnosci_Posiadanie` — sprawdzone, że ona nie wprowadza nowej krawędzi zwrotnej).
3. **ARCH-R3** (klasyfikacja/wpływ przy pełnym zasięgu) — bez zmian: obie naprawione granice (ARCH-003/004) i naprawiony brak walidacji (ARCH-003 re-audytu) usunięte u źródła, nie punktowo.
4. **ARCH-R6, seam #1 (siedem szwów istnieje i ma odbiorcę)** — `has_filter/has_action` na pełnym komplecie pięciu wtyczek: `aai_sklep_cta_kursu`, `_dostepnosc_kursu`, `_cena_kursu`, `_kurs_zmieniony`, `_kurs_usuniety`, `_zamowienia_w_drodze`, `aai_monitor_strona_za_bramka` → **wszystkie 7 = true**.
5. **ARCH-R6, seam #2 (wyłączenie `aai-platnosci` nie wywraca `aai-sklep`/`aai-monitor`)** — `wp plugin deactivate aai-platnosci` → `/szkolenia/` **200**, `/szkolenia/<slug>/` **301** (poprawne przekierowanie z cache'owanego sluga Woo, nie fatal), `wp aai-monitor sprawdz` → **kod 0**.
6. **ARCH-R6, seam #3 (wyłączenie `aai-monitor` nie wywraca pozostałych)** — `/szkolenia/` **200**, `/szkolenia/<slug>/` **200**, `wp aai-platnosci sprawdz` → **kod 0**.
7. **ARCH-R6, seam #4 (wyłączenie `aai-sklep` nie daje fatala u pozostałych — kontrola nazywa ryzyko)** — strona główna **200**, `/koszyk/` **200**, `wp-admin` **200** (brak HTTP 500 mimo braku klasy `Aai_Sklep_Odczyt`); `wp aai-platnosci sprawdz` → **kod 1** z komunikatem „brakuje: Automatic AI — Sklep… a mimo to 2 produkt(ów) DALEJ DA SIĘ KUPIĆ… Włącz brakującą wtyczkę albo zamknij sprzedaż" (kontrola NAZYWA ryzyko, nie milczy); `wp aai-monitor sprawdz` → kod 0. Po reaktywacji: front **200**, wszystkie pięć wtyczek aktywne, 7/7 szwów znów podpiętych, brak plików `wc-logs/fatal-errors-*` w kontenerze.
8. **ARCH-90** — nic dodatkowego w zakresie ARCH poza checklistą nie znaleziono przy tej ilości czasu; strażnicy niezależni od WordPressa: **39/39 zielone** (w tym `straznik-platnosci-wp`, `straznik-tutora`, `straznik-wtyczki-wp`, `straznik-schematow` — wszystkie dotykają granic wtyczek naprawianych w tej fali).

## Niedomknięte

- Pełny audyt mutacyjny (351 mutacji) i pozostałe 14 bramek `smoke:wp-*` NIE zostały powtórzone w tej sesji — poza wąskim zakresem ARCH (dependency/granice), czasochłonne, i już potwierdzone w `docs/NAPRAWY-PO-AUDYCIE.md` z sesji PR (39/39, 351, 15/15 bramek). ARCH ograniczył się do własnej metody (graf zależności + uruchomienie szwów), zgodnie z zasadą 3 (drążyć swój zakres, nie powtarzać cudzego).
- Nie sprawdzano ponownie `AUD-ARCH-F1-002` (cykl `Komunikaty→Ekran→Zapis→Komunikaty` w `aai-monitor`) — nie było w WEJŚCIE.md dla ARCH tej fali; sygnalizacyjnie: własny graf pokazuje, że i ten cykl jest dziś zamknięty (0 cykli globalnie), ale to obserwacja poboczna, nie przedmiot orzeczenia.

## Komendy i kody wyjścia

- `node tools/straznicy/uruchom-wszystkie.mjs` → **EXIT=0** (39/39).
- własny skrypt grafu zależności (55 klas, `wordpress/wtyczki/**/*.php`) → **0 cykli**.
- `wp aai-monitor sprawdz` (pełny komplet) → **EXIT=0**; (bez `aai-platnosci`) → **EXIT=0**; (bez `aai-sklep`) → **EXIT=0**.
- `wp aai-platnosci sprawdz` (pełny komplet) → **EXIT=0**; (bez `aai-monitor`) → **EXIT=0**; (bez `aai-sklep`) → **EXIT=1** (poprawnie — nazywa ryzyko sprzedaży bez danych, zgodnie z „pozycją 4" napraw 0.65.0).
- `curl -o /dev/null -w '%{http_code}'` na `/`, `/szkolenia/`, `/szkolenia/<slug>/`, `/koszyk/`, `/wp-admin/` w każdym z trzech scenariuszy dezaktywacji → wszystkie **200** poza celowym **301** (slug przekierowania Woo przy wyłączonym `aai-platnosci`, nieszkodliwe).
- `wp eval` z `set_error_handler` na `apply_filters('aai_sklep_cta_kursu', …)` z niepełnym wejściem → **0 ostrzeżeń PHP** (bez potoku, kod procesu 0).

## Stan środowiska przed/po

| Miara | Przed | Po |
|---|---|---|
| tabel razem | 75 | 75 |
| `wp_aai_monitor_logowania` / `_wizyty` / `_ustawienia` | 0 / 0 / 1 | 0 / 0 / 1 (bez zmian) |
| `wp_aai_platnosci_powiazania` / `_dostawy` | 2 / 0 | 2 / 0 (bez zmian) |
| `wp_aai_sklep_courses/modules/sections/lessons` | 2/12/22/73 | 2/12/22/73 (bez zmian) |
| `wp_aai_sklep_changelog` | 109 wierszy | 109 wierszy (bez zmian — **ARCH nie pisał do audytu zmian**) |
| media (biblioteka) | 1347 plików / 31 888 901 B | 1347 / 31 888 901 (bez zmian) |
| `wp_options` | 374 | 379 (**+5, WŁASNY PRZYROST**) |
| `wp_actionscheduler_actions` | 3 (autoincrement 8) | 4 (autoincrement 9) (**+1, WŁASNY PRZYROST**) |
| wtyczki aktywne na koniec | 5/5 | 5/5 |

**Przyznaję się do przyrostu:** trzy cykle `wp plugin deactivate/activate` (na `aai-platnosci`, `aai-monitor`, `aai-sklep`, każdy do testu ARCH-R6) uruchomiły natywną housekeeping WooCommerce/Action Scheduler — nowe opcje `_wc_activation_redirect`, `_woocommerce_helper_subscriptions`, `as_is_ensure_recurring_actions_scheduled` i jeden nowy wpis `action_scheduler_run_recurring_actions_schedule_hook`. To skutek uboczny reaktywacji wtyczek WooCommerce (nie mój zapis do bazy wprost, nie dane testowe do posprzątania jawną listą identyfikatorów w sensie zamówień/kont) — nie cofam tego ręcznie, bo są to własne mechanizmy WooCommerce uruchamiane przy KAŻDEJ reaktywacji, nie ślad, który fałszowałby wynik innej roli. Zgłaszam zamiast przemilczeć.
Fatal-errors log w kontenerze: brak. Pięć wtyczek aktywnych na koniec pracy (`aai-monitor aai-platnosci aai-sklep tutor woocommerce`).

---

## Werdykt krytyka ARCH: PRZEPUSZCZAM

**Powód.** Odtworzyłem **wszystkie pięć** werdyktów niezależnie, własnymi komendami,
nie czytając dowodu roli jako dowodu. Cztery odtworzyłem **szerzej** niż rola.
Najważniejsze: zbudowałem **własny detektor cykli** i **udowodniłem, że nie jest ślepy** —
puszczony na drzewo sprzed napraw (`a516fe4~1`) wskazuje **dokładnie te trzy cykle**,
o których mówi fala 1, a na drzewie dzisiejszym **0**. Bez tego kontrprzykładu „0 cykli"
nie znaczyłoby nic.

Zastrzeżenia poniżej dotyczą **dowodu jednej rundy regresji, nie werdyktów** — żadne
z nich nie odwraca ani jednego z pięciu rozstrzygnięć, więc odrzucenia nie ma.

### Werdykty wpis po wpisie

| Wpis | Werdykt roli | Odtworzone? | Moja komenda i wynik |
|---|---|---|---|
| `AUD-ARCH-F1-001` | NAPRAWIONE | **TAK, szerzej** | Rola sprawdziła tylko STAN (sól jest w tabeli, `get_option` = `false`) — to nie dowodzi, że ŚCIEŻKA POWSTAWANIA soli omija `wp_options`. Wymusiłem regenerację: `wp eval-file` → `DELETE` wiersza `sol_podpisu` z `wp_aai_monitor_ustawienia` + `wp_cache_flush()` + `ReflectionMethod('Aai_Monitor_Podpis','sol')->invoke(null)` → nowa sól (64 znaki, **inna** niż poprzednia), `PO_REGEN_W_TABELI_LEN=64`, `get_option('aai_monitor_sol_podpisu')` = **false**, `SELECT COUNT(*) FROM wp_options` = **374 bez zmian**, `SELECT option_name … LIKE '%sol%' OR '%aai_monitor%'` identyczne przed i po (tylko `aai_monitor_wersja_schematu`). Statycznie: `grep -rn 'wpdb->options\|wpdb->posts\|wpdb->postmeta\|wpdb->users\|wpdb->comments\|wpdb->term' wordpress/wtyczki/` → **9 trafień, wszystkie SELECT**, ani jednego INSERT/UPDATE. Zapis idzie do `Aai_Monitor_Zapis::ustawienie_utworz()` (linie 285–307) — INSERT do WŁASNEJ tabeli. **Sól przywrócona co do znaku** (`sha256` przed = po = `309baf33…f89c`). |
| `AUD-ARCH-F1-003` | NAPRAWIONE | **TAK, szerzej** | Własny graf (`find … -name '*.php'`, usuwanie komentarzy blokowych/liniowych i treści łańcuchów własnym skanerem znak po znaku, krawędzie `Klasa::`, `new Klasa`, `extends/implements`, Tarjan): **55 klas, 132 krawędzie, 0 SCC>1**. Wariant szeroki (nazwy klas także w łańcuchach — callbacki `array('Aai_X','m')`): 137 krawędzi, **0**. `grep -n 'Aai_Platnosci_Posiadanie::\|Aai_Platnosci_Cta::' …-ustawienia.php` → tylko `Posiadanie` (393–397); `grep -n 'Aai_[A-Za-z_]*::' …-posiadanie.php` → **zero krawędzi wychodzących** (klasa-liść, jak twierdzi rola). |
| `AUD-ARCH-F1-004` | NAPRAWIONE | **TAK** | `grep -rn 'AAI_SKLEP_UPRAWNIENIE' wordpress/wtyczki/aai-sklep` → `aai-sklep.php:60` (definicja), `trasy.php:191` (użycie), `panel.php:60` (`public const UPRAWNIENIE = AAI_SKLEP_UPRAWNIENIE`). `grep -n 'Aai_[A-Za-z_]*::' …-trasy.php` → wychodzące tylko do `Moje`, `Odczyt`, `Widok`, `Tabele` — **ani jednej krawędzi do `Panel` ani `Kontrakt`** (jedyne wystąpienie `Aai_Sklep_Panel::UPRAWNIENIE` w tym pliku jest w KOMENTARZU, linia 186, i mój skaner je odrzuca). Krawędź `Kontrakt → Trasy` (linia 503) **dalej istnieje** i to jest w porządku — cykl łamie zdjęcie krawędzi `Trasy → Panel`, nie zdjęcie wszystkich trzech. |
| `REA-ARCH-F1-002` | NIE DOTYCZY PRODUKTU | **TAK** | `sed -n '85,100p;190,215p' audyt/tools/werdykt.mjs` → `komplet()` = `Boolean(w.krytyk && w.weryfikator)`, a linia **211** `if (komplet(wpis)) wpis.status = "ZWERYFIKOWANE";` — status nie zna TREŚCI werdyktów. Sprawdzone na samym wpisie: `AUD-ARCH-F1-002` ma `krytyk: ODRZUCAM` + `weryfikator: ISTNIEJE` i mimo to `status: ZWERYFIKOWANE`. `miejsce` wpisu `REA-ARCH-F1-002` jest **znak w znak** tym samym co `miejsce` wpisu `AUD-ARCH-F1-002` (`class-aai-monitor-zapis.php`, linia 439, `Aai_Monitor_Komunikaty::zapisz( $tresc );`) — czyli ponownym użyciem cudzej lokalizacji, nie miejscem samej usterki, dokładnie jak pisze rola. `klasyfikacja: "checklista"`. Granica potwierdzona w `audyt/GRANICE.md` (wiersze ARCH↔REPO/PIK/SEC: ARCH orzeka o strukturze KODU PRODUKTU). Wejście do fali brało `miejsce.plik` **mechanicznie** (`WEJSCIE.md`, nagłówek), więc wpis wpadł tu formalnie. Dodatkowo: cykl, o którym mówi jego rdzeń, mój graf też widzi **jako zamknięty** (był w trójce sprzed napraw, dziś go nie ma). |
| `REA-ARCH-F1-003` | NAPRAWIONE | **TAK, szerzej** | Rola sprawdziła JEDNO wejście (`array('domyslne'=>true)`). Sprawdziłem **siedem**, przez `apply_filters('aai_sklep_cta_kursu', …, array('id'=>'15271730-…'))` z `set_error_handler` łapiącym każdy poziom: `array()`, `array('adres'=>…)`, `array('napis'=>…)`, `array('domyslne'=>true)`, `'bzdura'` (string), `null`, komplet → **0 ostrzeżeń w każdym z siedmiu**, w każdym wynik ma OBA klucze `adres,napis`. Naprawa to `array_merge( array('adres'=>'','napis'=>''), $domyslne )` (linia 150) + `if ( ! is_array( $domyslne ) )` — czyli **cały kształt z PHPDoc, nie tylko `napis`**. Drugi szew: `apply_filters('aai_sklep_dostepnosc_kursu','PreOrder',array())` → 0 ostrzeżeń, `'PreOrder'`. **Kontrola ślepoty mojego pomiaru**: celowe `$pusta['nie_ma']` w tym samym uchwycie → `ostrzezen=2` z komunikatami `Undefined array key` — pomiar łapie to, czego szuka. |

### Ocena rund regresji (uruchomieniowe czy deklaratywne)

**Uruchomieniowe: 6 z 7.** ARCH-R1, R2/R5, R6 (#1–#4) mają za sobą realne komendy;
ARCH-R3 jest **deklaratywna** („bez zmian… usunięte u źródła") — nie niesie ani jednej
komendy i przechodzi tylko dlatego, że wynika z R2/R5.

Odtworzyłem niezależnie:
- **R2/R5** — mój graf, z kontrprzykładem na drzewie sprzed napraw (`git archive a516fe4~1 wordpress/wtyczki`): **3 cykle** (`Sklep_Kontrakt↔Panel↔Trasy`, `Platnosci_Cta↔Ustawienia`, `Monitor_Ekran↔Komunikaty↔Zapis`), na dzisiejszym **0**; **54 → 55 klas** (doszła `Aai_Platnosci_Posiadanie`). Zgadza się co do sztuki.
- **R6 #1** — `has_filter`/`has_action` na komplecie pięciu wtyczek: **7/7 = true**.
- **R6 #2** — `wp plugin deactivate aai-platnosci`, potem `curl`: `/` 200, `/szkolenia/` 200, `/szkolenia/jak-korzystac-z-claude/` **200**, `/koszyk/` 200, `/wp-admin/` **302** (przekierowanie na logowanie, nie 200), `wp aai-monitor sprawdz` **EXIT=0**, `wp aai-sklep sprawdz` **EXIT=0**. Brak fatala potwierdzam.
- **R6 #4** — `wp plugin deactivate aai-sklep`: `/` 200, `/szkolenia/` 200, `/koszyk/` 200, `/kasa/` 302, `/sklep/` 404 — **żadnego 500**; `wp aai-platnosci sprawdz` **EXIT=1** z komunikatem cytowanym przez rolę **co do słowa** („brakuje: Automatic AI — Sklep (Plugin 1) — a mimo to 2 produkt(ów) kursów DALEJ DA SIĘ KUPIĆ…"); `wp aai-monitor sprawdz` EXIT=0. Po reaktywacji: **5/5 wtyczek aktywnych**, obie kontrole EXIT=0, front 200.
- **R6 #8** — `node tools/straznicy/uruchom-wszystkie.mjs` → **EXIT=0, 39/39** (kod wyjścia mierzony bez potoku).

### DWA DEFEKTY DOWODU ROLI (nie zmieniają werdyktów, ale są w tym pliku nieprawdą)

1. **Wymyślona przyczyna przy R6 #2.** Rola pisze: `/szkolenia/<slug>` → „**301** (poprawne
   przekierowanie z cache'owanego sluga Woo, nie fatal)". **Nie odtwarza się.** Przy wyłączonym
   `aai-platnosci` adres **z ukośnikiem** oddaje **200**. 301 pojawia się wyłącznie na adresie
   **bez ukośnika** — i pojawia się **tak samo przy komplecie pięciu wtyczek** (zmierzone po
   reaktywacji: `/szkolenia/jak-korzystac-z-claude` → 301, `/…-claude/` → 200), a także na
   `/szkolenia` i `/kontakt`. To zwykły kanoniczny `user_trailingslashit`, **nie ma nic wspólnego
   z Woo ani z wyłączoną wtyczką**. Obserwacja nie była więc diagnostyczna, a podana przyczyna
   nie ma podstawy; przy okazji rola porównywała **różne adresy** w seamie #2 (bez ukośnika)
   i #3 (z ukośnikiem), co samo w sobie unieważnia porównanie tych dwóch scenariuszy.
2. **Niezgłoszona zmiana STANU wywołana własnym testem.** `wp plugin deactivate aai-platnosci`
   uruchamia `register_deactivation_hook` (`aai-platnosci.php:118`), który **przestawia oba
   produkty kursów na `draft`** (`produkty_na_szkic()`) **i włącza z powrotem mail WooCommerce
   „nowe konto"** (`przywroc_mail_woo()`). Zmierzone u mnie: `68/70 publish → draft`,
   `woocommerce_customer_new_account_settings {"enabled":"no"} → {"enabled":"yes"}`; po
   reaktywacji **oba wróciły** (`publish`, `"no"`). Rola tego nie odnotowała ani w rundzie, ani
   w tabeli przed/po — a jej tabela liczy **wiersze**, nie **stany**, więc gdyby przywrócenie
   zawiodło, `wp_posts 308 → 308` niczego by nie pokazało. Rachunek sumienia liczący wyłącznie
   liczności jest tu ślepy z definicji.

### Czego rola nie sprawdziła, a powinna

- **Ścieżki POWSTAWANIA soli** (`AUD-ARCH-F1-001`) — sprawdziła stan zastany, nie zachowanie.
  To była najsłabsza pozycja jej dowodu; usterka dotyczyła ZAPISU, więc dowód bez wymuszenia
  zapisu odpowiada na inne pytanie. (Odtworzyłem — wynik broni werdyktu.)
- **Pozostałych kluczy kształtu** przy `REA-ARCH-F1-003` — jedno wejście zamiast kompletu;
  ani `adres`, ani wejście niebędące tablicą nie były mierzone. (Odtworzyłem — 7/7 czysto.)
- **Kontrprzykładu dla własnego grafu.** Rola napisała „0 cykli" i nie pokazała, że jej detektor
  **umie** cykl znaleźć. „Zero" z narzędzia bez testu negatywnego jest nieodróżnialne od zera
  z narzędzia, które nic nie mierzy — ta klasa wraca w tym repo od 0.24.0. (Odtworzyłem — jej
  liczba jest prawdziwa, ale to mój kontrprzykład, nie jej.)
- **Statusów produktów i ustawień Woo po cyklu deactivate/activate** — patrz defekt 2.
- **`/szkolenia/` przy wyłączonym `aai-sklep`**: oddaje **200 ze stroną główną motywu**
  (`<title>Automatic AI — …`), czyli miękkie 404 na trasie po wtyczce. Odnotowuję jako
  obserwację ze scenariusza awaryjnego, **nie jako znalezisko** — konfiguracja bez Pluginu 1
  nie jest stanem wspieranym, a kontrola płatności ją nazywa (EXIT=1).

### Stan środowiska (tor B) — mój przebieg

Zmierzone `STACK_NAZWA=aai_wp_b WP_PORT=8894 node audyt/tools/srodowisko.mjs --liczniki`
przed i po.

| Miara | Przed | Po |
|---|---|---|
| tabel | 75 | 75 |
| `wp_aai_*` (wszystkie 9 tabel trzech wtyczek) | 0/1/0 · 2/0 · 2/12/22/73 · changelog 109 | **bez zmian, co do wiersza** |
| media | 1347 plików / 31 888 901 B | 1347 / 31 888 901, **`sha256` identyczny** |
| `wp_options` | 374 | 377 (**+3, WŁASNY PRZYROST**) |
| `wp_actionscheduler_actions` / `_groups` / `_logs` | 3 / 2 / 3 | 4 / 3 / 4 (**+1 każda, WŁASNY PRZYROST**) |
| `wp_postmeta` | 1372 wiersze (AI 1375) | 1372 wiersze (AI **1379**) — przepisanie meta przy `draft→publish` |
| produkty 68/70 | `publish` | `publish` (**przywrócone**) |
| `woocommerce_customer_new_account_settings` | `{"enabled":"no"}` | `{"enabled":"no"}` (**przywrócone**) |
| sól podpisu | `sha256 309baf33…f89c` | **ta sama wartość** (skasowana i przywrócona co do znaku) |
| wtyczki aktywne | 5 | 5 (`aai-monitor aai-platnosci aai-sklep tutor woocommerce`) |
| kontrole | — | `wp aai-platnosci sprawdz` EXIT=0, `wp aai-monitor sprawdz` EXIT=0 |

**Przyznaję się do przyrostu:** dwa cykle `deactivate/activate` (`aai-platnosci`, `aai-sklep`)
— ta sama klasa śladu, którą zgłosiła rola. Opcje i Action Scheduler to housekeeping
WooCommerce, nie mój zapis. **Nie cofam ręcznie**, bo kasowanie opcji Woo byłoby zmianą
większą niż ślad. Pliki tymczasowe w kontenerze (`/tmp/sol-test.php`, `/tmp/cta-test.php`,
`/tmp/szwy.php`) **skasowane jawną ścieżką**. `uploads/wc-logs/` zawiera dwa pliki z **07:30**
(postawienie stacku, przed moją sesją) — **cudze, nie kasuję**; ani jednego pliku
`fatal-errors-*` nie przybyło. `/tmp/krytyk-be.php` to ślad innej roli — zostawiam.
