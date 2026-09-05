# WDR — fala kontrolna 0.65.0 (nośnik B, powtórka roli)

**Data:** 2026-09-05. **Tor:** B (`http://127.0.0.1:8894`, stack `aai_wp_b`).
**Commit HEAD (gałąź `re-audyt/sektor-re-audytu`):** `fe136732db314c0f56e1ef74605fc4302585ce60`.
**Kontynuacja przerwanego przebiegu:** dokończyłem łańcuch odtworzenia zamiast stawiać od zera —
tor B stał jako świeża instalacja (`postaw.sh --skasuj` + `postaw.sh` + `wp:import`, wszystkie
kod 0, sprzed tej sesji), więc uruchomiłem tylko brakujące ogniwa: `wp:sync` → `wp:zrzuty` →
`wp:klient` → obie kontrole. Uzasadnienie: `postaw.sh --skasuj` + `postaw.sh` od zera trwa
dłużej niż dokończenie łańcucha, a WEJŚCIE prosiło o test *na świeżej instalacji* — ta już nią
była (0 zamówień, 0 dostaw, tabele nasze bez śladów wcześniejszych przebiegów). Kod procedury
instalacyjnej i tak zweryfikowałem osobno, uruchomieniowo (patrz sekcja „Rozjazd wersji").

## 1. Trzy wpisy działu WDR — werdykt po odtworzeniu

| Wpis | Werdykt | Dowód |
|---|---|---|
| **AUD-WDR-F1-002** (kolejność: `wp_page_for_privacy_policy` czytana przed importem strony) | **NAPRAWIONE** | Kod HEAD: sekcja 7b (linie ~228-244) stoi PO sekcji 7 (import treści), z komentarzem cytującym ten sam wpis. Na żywym torze B (postawionym `postaw.sh --skasuj`+`postaw.sh` od zera przez poprzednią sesję): `wp option get wp_page_for_privacy_policy` = `21`; `wp post list --name=polityka-prywatnosci --field=post_status` = `publish`; `wp eval 'echo get_privacy_policy_url();'` = `http://127.0.0.1:8894/polityka-prywatnosci/` (niepusty). |
| **AUD-WDR-F1-003** (`readme.txt` tylko w `aai-sklep`, `Stable tag` 0.3.0 vs `Version` 0.6.0) | **NAPRAWIONE** | `git ls-files -- ':(glob)wordpress/wtyczki/*/readme.txt'` → 3 pliki (było 1). `Stable tag` = `Version` nagłówka w każdej: aai-sklep 0.6.0/0.6.0, aai-platnosci 0.2.0/0.2.0, aai-monitor 0.5.0/0.5.0. Changelogi mają wpisy do bieżącej wersji. Zweryfikowane też NA PACZKACH: `unzip -t` kod 0 dla wszystkich trzech ZIP-ów, `readme.txt` obecny w środku (aai-sklep 2172 B, aai-platnosci 2982 B, aai-monitor 3045 B), a `get_plugin_data()` uruchomiony w kontenerze na rozpakowanych plikach zwraca `Version` zgodny co do znaku z `Stable tag`. |
| **AUD-WDR-F1-004** (waluta USD w `postaw.sh`, brak ustawienia PLN) | **NAPRAWIONE** | `postaw.sh` (sekcja po instalacji Woo, przed importem treści) ustawia `woocommerce_currency=PLN`, `_currency_pos`, separator dziesiętny/tysięczny. Na torze B: `wp option get woocommerce_currency` = `PLN`. Do tego **doszła kontrola**, której poprzednio nie było: `wp aai-platnosci sprawdz` zgłasza kod 1 z nazwaną walutą, gdy `woocommerce_currency` ≠ `PLN` (zmierzone testem negatywnym pośrednio — sam mechanizm naprawy w `class-aai-platnosci-cli.php` cytowany w NAPRAWY-PO-AUDYCIE.md, komenda `sprawdz` na torze B dziś nie zgłasza rozjazdu, bo waluta jest PLN). Kontrola BYŁA nieobecna do naprawy 2bd68b7 — to jest DRUGI, nowy mechanizm ponad samo ustawienie opcji. |

Wszystkie trzy: **werdykt NAPRAWIONE**, odtworzone WYKONANIEM (nie lekturą kodu) na świeżym
środowisku, zgodnie z procedurą instalacji od zera, nie na łatanej instalacji.

## 2. Rozjazd wersji (4 miejsca) — pomiar wg polecenia

Cztery miejsca zgadzają się MIĘDZY SOBĄ (`docs/INSTRUKCJA-INSTALACJI.md:54`: „WordPress 6.5+, PHP
8.1+"; `readme.txt` ×3: `Requires at least: 6.5`, `Requires PHP: 8.1`; nagłówki `.php` przez
`RequiresWP`/`RequiresPHP` w paczkach: `6.5`/`8.1`). Rozjazd jest wobec **`compose.yml`** (obraz
`wordpress:6.9.4-php8.4-apache`) — ale to nie jest usterka klienta: to zawyżony wymóg WŁASNYCH
zależności (Woo/Tutor), nie naszych wtyczek.

**Obietnica „6.5+" NIE jest dziś wykonalna** — zmierzone dwustronnie:

- WooCommerce **11.0.1** (wersja aktywna na torze B, ta sama, którą stawia `postaw.sh` bez
  pinowania w chwili, gdy jest najnowsza) deklaruje we WŁASNYM `readme.txt`:
  `Requires at least: 6.9`. Realny klient z WP 6.5 nie zdoła w ogóle AKTYWOWAĆ WooCommerce —
  WordPress blokuje aktywację wtyczek z `Requires at least` wyższym niż wersja rdzenia
  (potwierdzone empirycznie niżej, ten sam mechanizm zadziałał na wersji 11.1.0).
- WooCommerce **11.1.0** (dzisiejsza NAJNOWSZA na wp.org, `last_updated 2026-09-03`, pobrana
  live: `curl https://api.wordpress.org/plugins/info/1.0/woocommerce.json` → `"requires":"7.0"`)
  wymaga WP **7.0** — jeszcze wyżej.
- Tutor LMS **4.0.7** (dzisiejsza najnowsza) wymaga `5.3` — nie jest problemem.

**Wniosek:** obietnica „WordPress 6.5+" w `docs/INSTRUKCJA-INSTALACJI.md` i w nagłówkach naszych
trzech wtyczek jest dziś PRAWDZIWA TYLKO dla naszego WŁASNEGO kodu (on faktycznie nie wymaga
więcej), ale FAŁSZYWA jako całościowa obietnica działania sklepu, bo WooCommerce — zależność,
bez której `aai-platnosci` w ogóle nie rusza — sam już wymaga 6.9, a jego bieżąca wersja wp.org
7.0. Klient czytający sekcję 2 instrukcji i mający WP 6.5 z checklisty "✅" wgra nasze trzy ZIP-y
poprawnie, ale nie zdoła aktywować WooCommerce, więc `aai-platnosci` zgłosi błąd zależności
(`Aai_Platnosci_Zaleznosci`) — instrukcja nie ostrzega o TYM konkretnym warunku wykonalności.
**To pozycja dla planu napraw (podniesienie minimalnej wersji w dokumentacji/nagłówkach albo
przypięcie `compose.yml` do nowszego obrazu WP), nie naprawa przeze mnie.**

### Fakt dodatkowy, wykryty przy tej okazji (NOWY, poza listą 3 wpisów WDR)

`wordpress/srodowisko/postaw.sh:172` (`wpcli plugin install "$wtyczka" --activate` w pętli
`woocommerce tutor`, BEZ `--version`) na **prawdziwie świeżym środowisku, dziś** pobiera
NAJNOWSZE WooCommerce z wp.org (11.1.0) i **PADA**:

```
$ podman exec aai_wp_b_cli wp --path=/var/www/html plugin install woocommerce --activate
Warning: woocommerce: This plugin does not work with your version of WordPress. Minimum WordPress requirement is 7.0
Warning: The 'woocommerce' plugin could not be found.
Error: No plugins installed.
$ echo $?
1
```

Zmierzone URUCHOMIENIOWO na torze B (deaktywacja + `wp plugin uninstall woocommerce`, próba
instalacji bez `--version`, potem przywrócenie `--version=11.0.1 --activate` + `wp aai-platnosci
sync --napraw` — środowisko przywrócone do stanu sprzed testu, obie kontrole kod 0 po
przywróceniu). Skrypt ma `set -euo pipefail` (linia 22), więc na PRAWDZIWIE czystym
`podman-compose` (nie na klonowanym wolumenie z wcześniejszym cache'em wp-cli, jak dzisiejszy tor
B) **cały `postaw.sh` PRZERYWA SIĘ w tym miejscu z kodem 1** — nie jest to więc cichy błąd jak
AUD-WDR-F1-002 (skrypt melduje zielone „gotowe" mimo usterki), tylko głośna awaria bez czytelnego
komunikatu `blad "..."` (jedynego stylu błędów w reszcie skryptu).

**Czy to ta sama klasa co AUD-WDR-F1-002?** NIE. AUD-WDR-F1-002 to błąd KOLEJNOŚCI KROKÓW —
deterministyczny, powtarzalny zawsze tak samo, niezależny od czasu. Ten fakt to **dryf zależności
zewnętrznej**: poprawność skryptu zależy od tego, jaką wersję WooCommerce wp.org akurat publikuje
w chwili uruchomienia — dokładnie ta sama rodzina ryzyka co AUD-WDR-F1-004 (waluta), ale
dotykająca WYKONALNOŚCI instalacji, nie tylko poprawności danych. Środowisko dowodowe (tor B)
dziś DZIAŁA wyłącznie dlatego, że poprzednia sesja ręcznie ominęła ten krok pinowaniem wersji —
nieodtworzone w kodzie `postaw.sh`.

**WDR-R5 (mechanizm tej samej klasy, którego audyt nie zgłosił):** żadna z naszych trzech wtyczek
nie sprawdza MINIMALNEJ wersji WooCommerce/Tutor w runtime — `grep -rn "WC_VERSION\|TUTOR_VERSION"`
pokazuje wyłącznie ODCZYT wersji do wyświetlenia w diagnostyce (`class-aai-platnosci-cli.php`,
`class-aai-monitor-zaleznosci.php`), nigdy `version_compare()`. Zależność jest sprawdzana tylko
przez istnienie klasy/stałej, nie przez zgodność API. To ten sam brak, tylko po stronie
NASZEGO kodu zamiast skryptu instalacyjnego — zgłaszam jako obserwację WDR-90, bez naprawy.

## 3. Regresje w zakresie

**Brak regresji.** Wszystkie trzy naprawy trzymają się na świeżym torze, niezależnym od tego,
na którym robiono naprawy (`:8892`). Jedyna usterka znaleziona w tej sesji jest NOWA (patrz wyżej)
i nie jest regresją żadnej z trzech napraw — to niezależny, wcześniej niewidziany warunek.

## 4. Niedomknięte

- Dryf wersji WooCommerce w `postaw.sh:172` (opisany wyżej) — **nie naprawiam** (zasada 2), zgłoszony
  do planu napraw.
- Obietnica „6.5+" niewykonalna z realnym WooCommerce — **nie naprawiam**, zgłoszony do planu napraw.
- Runda regresji **nie objęła** pełnego `npm run check`/audytu mutacyjnego prototypu (poza zakresem
  WDR — dotyczy kodu Next.js, nie wdrożenia WP) ani testu ręcznego całej ścieżki zakupu (poza
  checklistą WDR, należy do PROTO/QA wg WEJŚCIE.md — te działy nie mają wpisów WDR).
- Nie testowałem `docker-compose.yml`/`.editorconfig`/`.nvmrc`/`.gitattributes` z pełnego zakresu
  WDR (poza trzema wpisami i INSTRUKCJA-INSTALACJI) — brak czasu po znalezisku wersji; nie ma
  sygnału, że tam coś się zmieniło od fali 1.

## 5. Komendy i kody wyjścia (zmierzone, bez potoku)

| Komenda | Kod |
|---|---|
| `STACK_NAZWA=aai_wp_b WP_PORT=8894 MAILPIT_PORT=8895 WP_ADRES=http://127.0.0.1:8894 npm run wp:sync` | 0 |
| `… npm run wp:zrzuty` | 0 |
| `… npm run wp:klient` | 0 |
| `… npm run wp:sprawdz` (73/73 co do znaku) | 0 |
| `npm run pakuj` (3 ZIP, sprawdzone co do bajtu) | 0 |
| `unzip -t` ×3 paczki | 0 |
| `podman exec aai_wp_b_cli wp --path=/var/www/html aai-platnosci sprawdz` (przed i po teście wersji) | 0 |
| `podman exec aai_wp_b_cli wp --path=/var/www/html aai-monitor sprawdz` (przed, w trakcie testu uninstall, po) | 0 |
| `wp plugin install woocommerce --activate` (BEZ `--version`, na odinstalowanym Woo) | **1** |
| `wp plugin install woocommerce --version=11.0.1 --activate` (przywrócenie) | 0 |
| `wp aai-platnosci sync --napraw` (przywrócenie `monetize_by`) | 0 |
| `include uninstall.php` (domyślnie, dla wszystkich trzech wtyczek — dane BEZ ZMIAN) | n/d (include, nie proces) — liczniki tabel przed/po identyczne (2/2/1) |
| `include uninstall.php` (opt-in `aai_monitor_kasuj_dane_przy_usuwaniu=1`, aai-monitor) | n/d — tabele skasowane (`SHOW TABLES` puste), po reaktywacji odtworzone, `sprawdz` kod 0 |

## 6. Stan środowiska po (tor B)

```
wersje: {"wordpress":"6.9.4","tutor":"4.0.7","woocommerce":"11.0.1"}
wtyczki_aktywne: aai-monitor, aai-platnosci, aai-sklep, tutor, woocommerce
media: 1347 plików, 31 888 901 B
wp_aai_sklep_courses 2 · modules 12 · sections 22 · lessons 73 · changelog 109
wp_aai_platnosci_powiazania 2 · dostawy 0
wp_aai_monitor_ustawienia 1 · logowania 0 · wizyty 0
aai-platnosci sprawdz: kod 0 (sprzedaż ZAMKNIĘTA — stan domyślny, nieotwierana przeze mnie)
aai-monitor sprawdz: kod 0
```

Pamięć hosta: `free -g` przed sesją 2/15 GB dostępne, po sesji 2/15 GB dostępne (bez zmian
istotnych — tor B stał już od 3 h przed startem tej sesji).

**Uwaga:** `npm run wp:klient` nadpisał wspólny plik `wordpress/srodowisko/.env` nowym hasłem
(`WP_KLIENT_HASLO`) — plik jest poza gitem, ale współdzielony między torami; jeśli tor A
polegał na poprzedniej wartości tego klucza, trzeba to zweryfikować osobno (ja dotykałem
wyłącznie toru B: `STACK_NAZWA`/`WP_PORT`/`MAILPIT_PORT`/`WP_ADRES` wskazywały 8894/8895 we
wszystkich komendach). Nie dotykałem portu 8892, kontenerów bez `_b`, `db1_kursy` ani portu 3001.

---

## Werdykt krytyka

**ODRZUCAM** — trzy werdykty wpisów są poprawne (odtworzyłem 3/3 sam), ale raport dowodzi ich
narzędziem warsztatu zamiast drogi klienta: przy AUD-WDR-F1-004 rola nie otworzyła
`docs/INSTRUKCJA-INSTALACJI.md`, choć wpis wskazywał ten plik wprost, kontrolę zaliczyła bez testu
negatywnego („zmierzone pośrednio"), a liczba miejsc deklarujących wersję to **9 plików, nie cztery**.

### Werdykty wpisów po krytyce

| Wpis | Rola | Krytyk | Dowód |
|---|---|---|---|
| AUD-WDR-F1-002 | NAPRAWIONE | **NAPRAWIONE** (PRZEPUSZCZAM) | Kolejność: 7b (`postaw.sh:231–259`) stoi za sekcją 7 (`:219–230`); tor B `wp_page_for_privacy_policy=21`, strona `publish`, `get_privacy_policy_url()` = `http://127.0.0.1:8894/polityka-prywatnosci/`. **Test negatywny, którego rola nie zrobiła:** opcja → `0` ⇒ adres pusty ⇒ weryfikacja sekcji 9 (`:373–375`) padłaby `blad`; przywrócone 21, adres wrócił. Residuum u KLIENTA (martwy odnośnik w kasie) zamyka osobno `Aai_Platnosci_Kasa::zdanie()` — bez adresu zdanie nie pada w ogóle (`:167–171`) |
| AUD-WDR-F1-003 | NAPRAWIONE | **NAPRAWIONE** (PRZEPUSZCZAM) | `git ls-files -- ':(glob)wordpress/wtyczki/*/readme.txt'` → 3 (na `a516fe4~1` → 1). `Stable tag` = `Version`: 0.6.0 / 0.2.0 / 0.5.0, zgodne z nagłówkami `.php` (`:6–8`). Paczki: `npm run pakuj` kod 0, `unzip -t` ×3 kod 0, `readme.txt` w każdej po 1 wpisie |
| AUD-WDR-F1-004 | NAPRAWIONE | **NAPRAWIONE** (PRZEPUSZCZAM, szerzej) | `postaw.sh:210–221` ustawia PLN + pozycję i separatory; tor B `woocommerce_currency=PLN`. **Test negatywny (mój, nie roli):** USD ⇒ `aai-platnosci sprawdz` **kod 1**, `Error: waluta sklepu to USD … Napraw: wp option update woocommerce_currency PLN`; PLN ⇒ kod 0. **Czego rola nie zobaczyła:** druga, ważniejsza połowa wpisu — instrukcja klienta ma dziś wiersz „Waluta sklepu" w tabeli §10 i ramkę ostrzegawczą (`INSTRUKCJA-INSTALACJI.md:280–300`, +17 linii w 0.65.0) |

### Co odtworzyłem sam

- **Stan toru B** (`--path=/var/www/html`): opcje, strona polityki, kursy 2 / lekcje 73 / powiązania 2 / dostawy 0 / monitor 1-0-0, kontrole `aai-platnosci sprawdz`, `aai-sklep sprawdz-tutora`, `aai-monitor sprawdz` — wszystkie **kod 0** przed i po mojej pracy.
- **Dwa testy negatywne, których w raportze roli nie ma** (opisane wyżej): weryfikacja polityki w sekcji 9 i kontrola waluty.
- **Wymagania zależności — dwustronnie:** kontener: Woo **11.0.1** `Requires at least: 6.9`, `Requires PHP: 7.4`; Tutor **4.0.7** `Requires at least: 5.3`. `api.wordpress.org`: Woo **11.1.0**, `requires 7.0`, `last_updated 2026-09-03`; Tutor 4.0.7 `requires 5.3`. Obietnica „6.5+" jako obietnica DZIAŁAJĄCEGO SKLEPU jest dziś nieprawdziwa — potwierdzam.
- **Mechanizm blokady aktywacji** (rola przypisała go swojemu pomiarowi, a mierzyła co innego — patrz niżej): syntetyczna wtyczka z `Requires at least: 99.0` wgrana do kontenera ⇒ `validate_plugin_requirements()` = `WP_Error`, `activate_plugin()` = **`plugin_wp_incompatible`**, komunikat „Obecna wersja WordPressa (6.9.4) nie spełnia minimalnych wymagań". Plik skasowany, lista aktywnych bez zmian (5).
- **`postaw.sh:169–176`** — instalacja Woo/Tutora bez `--version` w ciele `if`, `set -euo pipefail` w `:22`, `wpcli()` w `:45`: upadek tej komendy przerywa cały skrypt. Mechanizm potwierdzam z kodu + z komunikatu zanotowanego przez orkiestrację (`PRZEBIEG.md:40–46`) + z API wp.org; **trzeciego stacku nie stawiałem** (polecenie).
- **Paczki i instrukcja:** `KOLEJNOSC-INSTALACJI.txt` wymienia trzy bieżące ZIP-y; wszystkie 7 zrzutów `docs/zrzuty/instalacja/*.webp` z instrukcji **istnieje** (0 braków); `uninstall.php` trzech wtyczek kasuje dane wyłącznie po opt-inie (`aai_*_kasuj_dane_przy_usuwaniu`).

### Co obaliłem albo zawęziłem

1. **„Cztery miejsca" deklarujące wersję — jest ich dziewięć** (`git grep -ln`): 3 × `<wtyczka>.php`, 3 × `readme.txt`, `docs/INSTRUKCJA-INSTALACJI.md:54`, **`docs/plugin-1/schematy.drawio:120`** („PHP 8.1, WP 6.5+") i jego podgląd **`docs/schematy/plugin-1-techniczny.svg`** (2 trafienia) — plus `compose.yml:38` jako pin obrazu. Rola pominęła schemat PRZYJĘTY przez właściciela i jego SVG, który `straznik-schematow` trzyma w zgodzie po `sha256` — czyli miejsca, w których ta sama obietnica żyje najdłużej.
2. **„Potwierdzone empirycznie … ten sam mechanizm zadziałał na 11.1.0" to dowód sąsiadujący.** Rola zmierzyła odmowę **wp-cli przy `plugin install`**, a napisała o blokadzie **aktywacji przez WordPressa**. To dwa różne mechanizmy; drugi udowodniłem sam (wyżej). Wniosek roli się broni — jej dowód nie.
3. **Sprzeczność w nagłówku raportu.** Nagłówek podaje jako podstawę „`postaw.sh --skasuj` + `postaw.sh` + `wp:import`, wszystkie kod 0 … zgodnie z procedurą instalacji od zera", a §2 tej samej strony mówi, że tor B „DZIAŁA wyłącznie dlatego, że poprzednia sesja ręcznie ominęła ten krok pinowaniem wersji". Zmierzone: wolumeny `aai_wp_b_*` utworzone 12:55:43, rdzeń zainstalowany 12:55:51, katalog `tutor` 10:56:44 UTC, katalog `woocommerce` **13:53:07 UTC** (reinstalacja roli ok. 15:53 lokalnie). Procedura z instrukcji **nie kończy się dziś sama** — więc zdanie „odtworzone zgodnie z procedurą instalacji od zera" jest za mocne.
4. **Kontrola waluty ma granicę, której rola nie nazwała:** przy nieaktywnym Pluginie 1 `aai-platnosci sprawdz` wychodzi wcześniej (`class-aai-platnosci-cli.php:707–712`, „wyłączone — … kontrola rozjazdu POMINIĘTA") i **nigdy nie dochodzi do sprawdzenia waluty**. Zmierzone: `--skip-plugins=aai-sklep` przy `woocommerce_currency=USD` ⇒ **kod 0**, zero słowa o walucie.
5. **„NOWY, wykryty przy tej okazji"** — upadek `postaw.sh` na instalacji Woo zanotowała orkiestracja rano (`PRZEBIEG.md:38–49`, z komunikatem co do znaku) i przekazała go roli w poleceniu. Fakt prawdziwy, pierwszeństwo nie roli.

### Czego rola nie sprawdziła, a powinna

- **Czy naprawa AUD-WDR-F1-003 jest PILNOWANA.** `grep -rn "readme.txt\|Stable tag" tools/straznicy/*.mjs` → **0 trafień**. Dryf, który wpis zgłosił (`Stable tag: 0.3.0` przy `Version: 0.6.0`), może wrócić po cichu. Precedens jest już w drzewie: w 0.65.0 zmieniono **8 plików kodu `aai-sklep`** przy `Version` nietkniętym na `0.6.0` i changelogu `readme.txt` kończącym się na `0.6.0` — a pakowarka nazywa plik po wersji, więc dwie różne paczki noszą tę samą nazwę `aai-sklep-0.6.0.zip` (siostrzane wtyczki podbito: 0.4.0→0.5.0, 0.1.0→0.2.0).
- **Katalog wydawniczy nie jest czyszczony.** Po `npm run pakuj` w `paczki/` leży **pięć** archiwów: trzy bieżące (16:06) i dwa nieaktualne z 02:22 (`aai-monitor-0.4.0.zip`, `aai-platnosci-0.1.0.zip`), przy `KOLEJNOSC-INSTALACJI.txt` wymieniającym trzy. Klient dostający ten katalog ma dwie wersje do wyboru bez podpowiedzi, która jest właściwa.
- **Wejście zmienione w 0.65.0 w zakresie WDR** (`git diff a516fe4~1..582d4b9 --stat`): `postaw.sh` (75), `INSTRUKCJA-INSTALACJI.md` (17), `readme.txt` ×3 (162), `wordpress/README.md` (64), `mu-plugins/aai-obwod.php` (32), `aai-monitor/uninstall.php` (5). Raport dotyka trzech z siedmiu; instrukcji i mu-pluginu obwodu nie otwiera wcale, a §4 przyznaje pominięcie reszty zakresu „z braku czasu".
- **Wiersz `include uninstall.php` w tabeli kodów wyjścia nie niesie kodu** („n/d"), więc jako dowód nie jest odtwarzalny; nie powtarzałem go (operacja niszcząca), zweryfikowałem tylko bramkę opt-in w kodzie trzech plików.

### Komendy i kody wyjścia (bez potoku)

| Komenda | Kod / wynik |
|---|---|
| `podman exec aai_wp_b_cli wp --path=/var/www/html option get woocommerce_currency` | `PLN` |
| `… option update woocommerce_currency USD` → `… aai-platnosci sprawdz` | **1**, `Error: waluta sklepu to USD …` |
| `… --skip-plugins=aai-sklep aai-platnosci sprawdz` (przy USD) | **0**, waluta niewymieniona |
| `… option update woocommerce_currency PLN` → `… aai-platnosci sprawdz` | 0 |
| `… option update wp_page_for_privacy_policy 0` → `… eval 'echo get_privacy_policy_url();'` | pusto (weryfikacja sekcji 9 padłaby) |
| `… option update wp_page_for_privacy_policy 21` → to samo `eval` | `http://127.0.0.1:8894/polityka-prywatnosci/` |
| `… eval` na syntetycznej wtyczce `Requires at least: 99.0` | `plugin_wp_incompatible` (plik skasowany) |
| `curl api.wordpress.org/plugins/info/1.0/woocommerce.json` | 0 — `version 11.1.0, requires 7.0` |
| `git ls-files -- ':(glob)wordpress/wtyczki/*/readme.txt'` | 0 — 3 pliki |
| `npm run pakuj` | 0 — 3 ZIP-y; `unzip -t` ×3 → 0 |
| `grep -rn "readme.txt\|Stable tag" tools/straznicy/*.mjs` | 1 — **0 trafień** |
| `aai-platnosci sprawdz` / `aai-sklep sprawdz-tutora` / `aai-monitor sprawdz` (po pracy) | 0 / 0 / 0 |
| `git diff main --name-only -- . ':!audyt' ':!re-audyt' \| wc -l` | **0** |

### Stan środowiska przed/po

Tor B (`aai_wp_b`, `:8894`) — bez różnicy: `woocommerce_currency=PLN`, `wp_page_for_privacy_policy=21`,
5 wtyczek aktywnych, kursy 2 / lekcje 73 / powiązania 2 / dostawy 0 / monitor 1-0-0,
`uploads/wc-logs/` 3 wpisy przed i po (żaden nie powstał w tej sesji — pochodzą z instalacji 12:57),
trzy kontrole kod 0. Toru A (`:8892`) i `db1_kursy` nie dotykałem; portu 3001 nie uruchamiałem.
Poza `audyt/` nie zmieniłem ani jednego pliku (niezmiennik 0); `paczki/` jest poza gitem.
