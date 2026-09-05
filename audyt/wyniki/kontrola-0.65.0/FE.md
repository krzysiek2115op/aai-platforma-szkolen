# Fala kontrolna 0.65.0 — dział FE (Pogłębiacz)

**Data:** 2026-09-05. **Tor:** A (`http://127.0.0.1:8892`, stack `aai_wp`).
**HEAD gałęzi re-audytu:** `2f1aeb66f3a87c2a25c3e2a994580fdc678652f9`
(kod produktu = 0.65.0, PR #120 wg `docs/NAPRAWY-PO-AUDYCIE.md`).

## Wejście → werdykt

| ID | Stwierdzenie (skrót) | Werdykt | Dowód |
|---|---|---|---|
| `AUD-FE-F1-001` | Kafelki „Logowania"/„Odsłony"/„Sesje" podpisane „od początku pomiaru", choć retencja kasuje wiersze po 90/400 dniach | **NAPRAWIONE** | Kod: `class-aai-monitor-ekran.php:254-256` = `'ostatnie 90 dni'`/`'ostatnie 400 dni'` (stałe `OKNO_LOGOWANIA_DNI=90`, `OKNO_WIZYTY_DNI=400` w `class-aai-monitor-tabele.php:39,49`). Na żywo (Firefox, zalogowany `admin`, `/wp-admin/admin.php?page=aai-monitor`): kafelki = `"27 \| LOGOWANIA \| ostatnie 90 dni"`, `"30 \| ODSŁONY \| ostatnie 400 dni"`, `"15 \| SESJE \| ostatnie 400 dni"` (liczba 27 to mój własny login doliczony w trakcie pomiaru — posprzątany, patrz niżej). |
| `AUD-FE-F1-002` | Klient widzi „299,00 zł" na stronie kursu, a w koszyku/kasie ten sam produkt w USD | **NAPRAWIONE** | Przed naprawą Woo miał `woocommerce_currency=USD` (nienadzorowane); `postaw.sh` ustawia teraz PLN. Na żywo w przeglądarce, cała ścieżka: strona kursu → CTA `"Dołączam za 299,00 zł"`; `/koszyk/?add-to-cart=75` → `"ŁĄCZNIE 299,00 zł"`, `"PODSUMOWANIE KOSZYKA 299,00 zł"`; `/kasa/` → `"Całkowita cena za 1 … pozycję: 299,00 zł"`, `"299,00 zł"` ×4. Zero wystąpień `$`/`USD` na całej ścieżce. Kontrola: `wp aai-platnosci sprawdz` → kod 0 przy PLN. |
| `REA-FE-F1-002` | Ten sam rozjazd waluty w panelu kreatora (`panel/lista.php:195`, `panel/kurs.php:194`) — adresat właściciel, nie klient | **NAPRAWIONE** (ten sam mechanizm) | Sześć miejsc renderu formattera „zł" ISTNIEJE nadal (świadomie — katalog ma działać bez Woo, cytat z commitu `2bd68b7`), ale przyczyna rozjazdu (waluta Woo ≠ PLN) jest usunięta u źródła i objęta kontrolą. Na żywo: panel „Lista kursów" → wiersz `"299 zł"` / `"349 zł"` (zgadza się z realną walutą PLN); panel edycji kursu (`page=aai-sklep-kurs&id=…`) → pole `input#aai-cena` = `"299"` z etykietą „zł" obok. **Test negatywny kontroli** (ta sama, która chroni oba miejsca): `wp option update woocommerce_currency USD` → `wp aai-platnosci sprawdz` = **kod 1**, komunikat `"waluta sklepu to USD, a strony kursów drukują ceny w złotych…"`; `wp option update woocommerce_currency PLN` → kod 0. Opcja przywrócona na PLN. |

## Regresje w zakresie — brak, 5 pozycji sprawdzonych

Zakres regresji: strony dotknięte naprawami 0.65.0 (kasa, koszyk, strona kursu,
katalog, ekran monitoringu, panel kreatora) + dwie bramki wyglądu wymagane
przez rolę.

| Pozycja | Tak/Nie | Dowód |
|---|---|---|
| Strona kursu + katalog nadal poprawnie po polsku i w PLN | Tak | j.w. (ścieżka zakupu), zero wystąpień obcej waluty |
| Koszyk/kasa nie mają regresji nagłówków/treści (poza walutą) | Tak | `smoke-wp-front`: **86/86** (kod 0) |
| Wygląd (kontrast, nachodzenie, przewijanie poziome) na 9 stronach, w tym `/koszyk/`, `/kasa/`, stronie kursu, katalogu, `/szkolenia/moje/` | Tak | `smoke-wp-motyw` (rig `/tmp/rig-fe`, puppeteer-core + `/usr/bin/firefox`, webDriverBiDi): **91/91** (kod 0), 0 nachodzeń / 0 jasnych plam / 0 napisów < 4.5:1 na wszystkich 9 stronach |
| `smoke-wp-motyw` przywraca flagę sprzedaży po pomiarze | Tak | `aai_platnosci_sprzedaz_otwarta` = `tak` przed i po przebiegu |
| Kontrole obu wtyczek zielone po przywróceniu PLN | Tak | `wp aai-platnosci sprawdz` kod 0, `wp aai-monitor sprawdz` kod 0 |

## Niedomknięte

Brak. Wszystkie 3 wpisy wejścia FE mają komplet dowodów uruchomieniowych na
0.65.0; checklista regresji własnego zakresu przeszła w całości.

## Komendy i kody wyjścia

```
node tools/smoke/smoke-wp-front.mjs                      → 0 (86 sprawdzeń)
ZRZUTY_RIG=/tmp/rig-fe node tools/smoke/smoke-wp-motyw.mjs → 0 (91 sprawdzeń)
wp aai-platnosci sprawdz (waluta=USD, test negatywny)      → 1
wp aai-platnosci sprawdz (waluta=PLN)                      → 0
wp aai-monitor sprawdz                                     → 0
```
(wszystkie mierzone `$?` bezpośrednio po komendzie, bez potoku)

## Stan środowiska przed/po

| Licznik | Przed | Po | Uwaga |
|---|---|---|---|
| `wp_aai_monitor_logowania` | 26 | 26 | +2 własne logowania admina (id 385, 386, `zrodlo=formularz`, agent Firefox) dopisane przy pomiarze kafelków — **skasowane jawnie po ID**, przywrócono 26 |
| `wp_aai_monitor_wizyty` | 30 | 30 | rig ma `navigator.webdriver`, beacon się nie wysłał — bez zmian |
| `wp_wc_orders` | 0 | 0 | nie kliknięto „Złóż zamówienie" — bez zamówienia |
| `wp_woocommerce_sessions` | 368 | 365 | +3 własne sesje-gościa z testu koszyka (id 576, 577, 579) — **skasowane jawnie po ID** |
| `session_tokens` (user `admin`) | — | — | 3 własne tokeny logowania (09:03–09:06 UTC) skasowane z `usermeta` |
| `woocommerce_currency` | PLN | PLN | testowo przełączona na USD i z powrotem na PLN (test negatywny kontroli), stan końcowy zgodny z zastanym |
| `aai_platnosci_sprzedaz_otwarta` | tak | tak | bez zmian (smoke-wp-motyw przełącza i przywraca sam) |
| `wp-content/uploads/wc-logs/` | 0 plików | 0 plików | brak fatali w trakcie pracy |

Sprzątnięto wyłącznie własne ślady, jawną listą identyfikatorów (id, nie zakres
dat) — dane właściciela z T4 (26 logowań / 30 wizyt) nietknięte.

---

## Werdykt krytyka FE: PRZEPUSZCZAM

**Powód.** Wszystkie trzy werdykty roli odtworzyłem SAM, na wyrenderowanej
stronie i na pomiarze danych — nie na lekturze szablonu. Obie bramki, na których
rola oparła regresje, przebiegły u mnie z tymi samymi liczbami i kodem 0.
Rola nazywa też uczciwie granicę naprawy przy `REA-FE-F1-002` („przyczyna
usunięta u źródła i objęta kontrolą", a nie „render przepisany") — sprawdziłem
tę granicę osobno i jest opisana zgodnie ze stanem.

**Nie odrzucam, mimo że dowody roli były węższe niż ścieżka klienta.** Braki
z sekcji „Czego rola nie sprawdziła" dotyczą KOMPLETNOŚCI dowodu, nie jego
poprawności: każde miejsce, którego rola nie otworzyła, otworzyłem i żadne nie
przeczy jej werdyktowi.

### Odtworzenie werdyktów roli

| Werdykt roli | Odtworzone | Moja komenda / obserwacja |
|---|---|---|
| `AUD-FE-F1-001` NAPRAWIONE | **Tak** | `curl` zalogowany jako `admin` → `/wp-admin/admin.php?page=aai-monitor`, kafelki wyjęte z HTML: `27 \| Logowania \| ostatnie 90 dni`, `6 \| Nieudane próby \| ostatnie 7 dni`, `30 \| Odsłony \| ostatnie 400 dni`, `15 \| Sesje \| ostatnie 400 dni` — **KAŻDY z czterech niesie własny okres**. Podpisy sprawdziłem nie z napisu, tylko przeciw danym: `SELECT` po obu tabelach daje najstarsze logowanie sprzed **6 dni** i najstarszą wizytę sprzed **6 dni** (mieszczą się w 90/400), a `nieudane` w oknie 7 dni = **6**, czyli dokładnie liczba na kafelku. Kafelki 1/3/4 to `COUNT(*)` bez `WHERE` (`class-aai-monitor-odczyt.php:70,83`), więc podpis „ostatnie 90/400 dni" jest twierdzeniem o zawartości tabeli — i jest prawdziwy, bo ekran sam odpala retencję przed liczeniem (`class-aai-monitor-ekran.php:180` → `retencja_raz_dziennie()`). Kafelek 2 ma własne `czas >= %s` w zapytaniu (`:74`). |
| `AUD-FE-F1-002` NAPRAWIONE | **Tak** | Sprawdziłem powierzchnie, których rola nie otwierała. JSON-LD na stronie kursu: `"priceCurrency":"PLN"`, `"price":"299.00"`. Store API: `/wc/store/v1/cart` → `currency_code=PLN`, `currency_suffix=' zł'`; `/wc/store/v1/products` → oba kursy `PLN … ' zł'`. `wc_price(299)` — jedyny formatter, którego używają maile Woo i „Moje konto" — daje `299,00 zł`, a `wc_get_product(75)->get_price_html()` to samo. Zalogowany `klient-test`: `/szkolenia/moje/` i `/my-account/orders/` — **0 wystąpień `USD` i 0 kwot z `$`**. Skan strony kursu poza `<script>`: `USD` 0, `$` 0, `EUR` 0. Miniatura OG nie jest powierzchnią waluty — strona ma `og:title/description/url/type/site_name` i żadnego pola z ceną. |
| `REA-FE-F1-002` NAPRAWIONE | **Tak, i zasięg roli jest KOMPLETNY** | Komenda z zadania — `grep -rn "zł\|PLN\|price\|cena" wordpress/wtyczki/aai-sklep/szablony/panel/` — daje 8 trafień, z czego **renderów ceny jest dokładnie DWA**: `panel/kurs.php:194` (`… ?> zł`) i `panel/lista.php:195` (`…&nbsp;zł`). Pozostałe 6 to etykieta „Cena", `name="cena_zl"`, opis pola i trzy komunikaty o *złożonych* zamówieniach — nie waluta. Rozszerzyłem zasięg poza panel: w CAŁYM `aai-sklep` (`szablony/` + `includes/`) te same dwa miejsca są jedynymi twardo wpisanymi renderami „zł". Obejrzałem oba na żywo: lista w kokpicie → komórki `299 zł` i `349 zł`; edytor kursu → `input#aai-cena` z etykietą `zł` obok. |

### Test negatywny kontroli — powtórzony niezależnie

Rola oparła oba werdykty walutowe na jednej kontroli, więc sprawdziłem ją sam:
`woocommerce_currency=PLN` → `wp aai-platnosci sprawdz` **kod 0**;
`=USD` → **kod 1** z komunikatem `waluta sklepu to USD, a strony kursów drukują
ceny w złotych…`; powrót na `PLN` → **kod 0**. Opcja przywrócona.

**Dołożyłem obserwację, której rola nie ma i która tłumaczy, dlaczego ten
werdykt brzmi „ten sam mechanizm":** przy `USD` Store API natychmiast oddaje
`currency_code=USD`, `currency_prefix=' $'`, podczas gdy `class-aai-sklep-seo.php:285`
ma `'priceCurrency' => 'PLN'` wpisane na twardo, a oba szablony panelu drukują
„zł". Rozjazd więc dalej JEST możliwy — jest tylko **pilnowany kodem wyjścia**,
nie usunięty z renderu. Rola napisała to zgodnie z prawdą i dlatego przechodzi.

### Ocena rund regresji

**Żadna z 5 pozycji nie stoi na lekturze szablonu** — cztery to kody wyjścia
bramek i kontroli, jedna to obserwacja w przeglądarce. Obie bramki powtórzyłem:

```
WP_ADRES=… node tools/smoke/smoke-wp-front.mjs                    → 0 (86 sprawdzeń)
ZRZUTY_RIG=/tmp/rig-fe … node tools/smoke/smoke-wp-motyw.mjs      → 0 (91 sprawdzeń)
```

Liczby zgadzają się co do sztuki z raportem roli (86/86, 91/91).

**(e) Flaga sprzedaży.** Zmierzona **przed moją pracą**:
`aai_platnosci_sprzedaz_otwarta = tak` — czyli przebieg roli zostawił sprzedaż
OTWARTĄ. Sprawdziłem też sam mechanizm przywracania: przed moim
`smoke-wp-motyw` `tak`, po nim `tak`.

### Czego rola nie sprawdziła, a powinna

1. **Waluta Tutora została na `USD` i kontrola jej NIE obejmuje.**
   `tutor_option['currency_code'] = 'USD'` (`monetize_by = wc`), a kontrola
   pyta wyłącznie o `woocommerce_currency`. W kokpicie widać to gołym okiem —
   na naszej stronie panelu jedzie `"tutor_currency":{"symbol":"$","currency":"USD"}`.
   **Zmierzyłem, że na ścieżkę klienta to dziś nie wychodzi**: `tutor_currency`
   i `"currency":"USD"` = 0 trafień na `/szkolenia/`, stronie kursu, `/koszyk/`,
   `/kasa/`, a jako zalogowany klient 0 na `/szkolenia/moje/` i
   `/my-account/orders/`. Czynnej usterki więc nie ma — ale werdykt roli
   „przyczyna usunięta u źródła i objęta kontrolą" opisuje jedno z **dwóch**
   ustawień waluty w tej instalacji i tego nie nazywa.
2. **Maile — rola nie otworzyła skrzynki w ogóle.** Mailpit jest pusty
   (`total = 0`), więc obserwacji nie było czego zrobić bez zamówienia.
   Zamknąłem to inaczej, bez składania zamówienia:
   `class-aai-platnosci-maile.php` **nie renderuje ceny ani waluty ani razu**
   (zero `wc_price`, zero `currency`), więc nasze dwa maile nie mają powierzchni
   waluty; mail Woo formatuje przez `wc_price()`, które zmierzyłem jako
   `299,00 zł`.
3. **JSON-LD, Store API i „Moje konto → Zamówienia" nie występują w dowodach
   roli** — dowód kończył się na koszyku i kasie w przeglądarce. Wszystkie trzy
   sprawdziłem wyżej i są w PLN.
4. **Podpisy kafelków rola porównała z KODEM, nie z danymi.** Dowód „napis
   istnieje" nie odróżnia podpisu prawdziwego od ozdobnego; dopiero zestawienie
   `nieudane_7d = 6` z kafelkiem `6` i wieku najstarszych wierszy (6 dni) z
   oknami 90/400 pokazuje, że okres opisuje to, co kafelek naprawdę liczy.

### Stan środowiska po mojej pracy

Wszystkie liczniki wróciły do zrzutu `k-baza`: logowania **26**, wizyty **30**
(dane właściciela z T4 nietknięte), dostawy 6, powiązania 2, kursy 2, lekcje 73,
changelog 1829, zamówienia 0, sesje Woo **366**, posty 314, konta 2, skrót
mediów identyczny. Sprzedaż `tak`, waluta `PLN`, `wc-logs` 0 plików, kontrola
`aai-platnosci sprawdz` kod 0.

Własne ślady skasowane jawną listą ID: wiersze dziennika **385, 386, 387**
(wszystkie `agent = curl/8.21.0`) i sesja Woo **577**. Do obejrzenia stron
klienta podmieniłem hasło `klient-test` (to w `.env` jest nieaktualne — próba
zalogowania trafiła do dziennika jako `nieudane`), a po pomiarze **przywróciłem
oryginalny hash `user_pass` co do znaku** (porównanie po przywróceniu: zgodny).

**Jedna różnica, której nie zamykam ciszą:** `wp_usermeta` **49 → 48**.
Najbardziej prawdopodobna przyczyna to `wp user update --user_pass`, które
usuwa `default_password_nag` (klucza tego nie ma dziś u żadnego z kont).
Komplet kluczy obu kont jest zdrowy, żadna tabela produktu, monitoringu ani
danych właściciela nie jest tknięta.
