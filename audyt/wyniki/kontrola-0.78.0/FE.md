# Fala kontrolna po 0.78.0 — FE (Pogłębiacz Frontend, sektor RE-AUDYT)

Tor: **B** (`http://127.0.0.1:8894`, kontener `aai_wp_b_cli`). Kod produktu 0.78.0.
Rig: puppeteer-core + `/usr/bin/firefox` (webDriverBiDi) w `/tmp/rig`.

Defekty oprzyrządowania przekazane przez orkiestrację, nie duplikuję: `git ls-files`
nie rozwija klamr (zakres złożony ręcznie — patrz niżej), `grep --include` w
kontenerach WP daje 0, komenda niezmiennika sektora wymaga `':!re-audyt'`.

## Zakres — KON-R1

Komenda z prompta (`git ls-files … {a,b}.php`) nie rozwija klamr. Zakres złożony
ręcznie z 10 plików `includes/*` + `szablony/` + oba `assets/`:
`git ls-files -- szablony(37) assets/aai-sklep(17) assets/aai-monitor(4)
9×class-aai-sklep-{widok,lekcja,moje,proza,zasoby,menu,trasy,styl-tutora,styl-woo}.php(9)
class-aai-monitor-ekran.php(1)` → **68 plików**, nie 57 (zmierzone 2026-09-01).
Rozbieżność zgłaszam jako `KON-R1` — wzrost jest realny (W3/W5/MAR-A dodały
`nie-znaleziono.php`, `moje.php`, `lekcja-odhacz.php` i inne), nie błąd pomiaru.

## W1 — naprawy 0.66.0…0.78.0 w zakresie FE

| Pozycja | Werdykt | Dowód uruchomieniowy (komenda + kod wyjścia) |
|---|---|---|
| **P0-1** ukrycie kursu zabierało kupującemu drogę do materiału | **NAPRAWIONE** | Ustawiłem `wp db query "UPDATE wp_aai_sklep_courses SET status='archived' WHERE slug='jak-uzywac-githuba'"` + `wp aai-sklep sync jak-uzywac-githuba` (kod Tutora → `private`, potwierdzone `wp post get 72 --field=post_status` = `private`). Rig: zalogowany `klient-test` na `/szkolenia/moje/` widzi **2 kafelki** (`["Jak poprawnie używać GitHuba","Jak poprawnie korzystać z Claude"]`), menu konta i nagłówek pokazują „Moje kursy". **Kontrola pozytywna**: `wp eval` porównanie `Aai_Sklep_Odczyt::lista_kursow()` (sprzedaż, stara droga sprzed naprawy) = `["jak-korzystac-z-claude"]` (BEZ archiwalnego) vs `lista_kursow_posiadane()` (naprawiona droga) = oba dwa — dowodzi, że stara ścieżka faktycznie by zawiodła. Katalog `/szkolenia/` **nie** pokazuje archiwalnego kursu (`includes("Jak poprawnie używać GitHuba")` = false) — sprzedaż poprawnie ukryta, dostęp zachowany. Przywrócone: `status='published'` + `sync`, `wp post get 72` = `publish`. Kontrole po przywróceniu: 3×kod 0. |
| **MAR-A-24** „Oznacz jako przerobioną" nic nie robiło (zły nonce z właściwości obiektu) | **NAPRAWIONE** | Rig na koncie `klient-test`, lekcja 97 (nieukończona — dziennik ukończeń na torze B był pusty): PRZED — pole `_tutor_nonce` z realną wartością (`bca9852f97`), formularz obecny. Kliknięcie `submit` → PO: przycisk `disabled` z tekstem „Lekcja przerobiona" (rzeczywiste działanie, nie tylko HTML). **Kontrola pozytywna**: podmieniony w DOM nonce na wartość niepoprawną → Tutor odpowiada `{"success":false,"data":{"message":"Nonce nie zostało dopasowane…"}}` zamiast strony z ukończeniem — metoda pomiaru rozróżnia sukces od odrzucenia. Sprzątnięte: `wp user meta delete 2 _tutor_completed_lesson_id_97` (mój własny ślad, po kluczu). |
| **MAR-A-25** jedyny szablon czytający `$_SERVER` | **NAPRAWIONE** | `grep -rn '\$_SERVER' szablony/` → **1 trafienie, w komentarzu** (dokumentuje historię), zero w kodzie. Rig: `GET /szkolenia/kurs-ktorego-nie-ma/` → 404, treść „Tego szkolenia tu nie ma"; `GET /strona-ktorej-nie-ma/` → 404, treść „Tej strony tu nie ma" — obie gałęzie `Aai_Sklep_Trasy::zadanie_w_sklepie()` (klasa tras, nie szablon) działają poprawnie. |
| **MAR-A-26** dwa wejścia „Moje kursy" z różnymi regułami | **NAPRAWIONE** | Konto BEZ kursu (`smoke-fe-brak-kursu`, utworzone i skasowane w tej sesji): menu konta WooCommerce → `["Kokpit","Zamówienia","Pobrania","Adresy","Szczegóły konta","Wyloguj się"]` (BRAK „Moje kursy"), nagłówek → `[]`. Konto Z kursem (`klient-test`) w tej samej sesji: OBA miejsca pokazują „Moje kursy". `grep -n "ma_kursy()"` → dokładnie 2 miejsca wywołania (menu.php:150, moje.php:151), oba przez ten sam predykat. |
| **MAR-A-28** komplet zrzutów wobec żądań prozy | **NAPRAWIONE, ZE ZNALEZISKIEM PRZY WERYFIKACJI (patrz niżej)** | Baseline `wp aai-sklep sprawdz` → kod 0. `wp post delete 159 --force` (skasowanie zrzutu `zrzuty/z01-pusta-rozmowa-na-claude.webp` lekcji „Czym jest Claude i co potrafi") → `wp aai-sklep sprawdz` **kod 1** (mierzone BEZ potoku, `>plik 2>&1; echo $?`), `Warning: … żąda 1 zrzutu/ów, których nie ma …zrzuty/z01-pusta-rozmowa-na-claude.webp… Uruchom npm run wp:zrzuty.` Przywrócone ręcznie przez `wp aai-sklep zrzuty <manifest>` (patrz znalezisko), `sprawdz` → kod 0. |
| Cache-buster (`AAI_*_WERSJA`, 0.76.0/0.77.0) — stary arkusz po aktualizacji | **NAPRAWIONE** | Rig, `/szkolenia/`: `sklep.css/js` → `?ver=1788…` (droga `filemtime()`, `class-aai-sklep-trasy.php`); rig na lekcji zalogowanego: `sklep.css/js` i `lekcja.css/js` → **`?ver=0.12.0`**, zgodne z `AAI_SKLEP_WERSJA` i nagłówkiem `Version:` (sprawdzone `grep`). `aai-monitor/assets/pomiar.js` na stronie głównej → **`?ver=0.8.0`**, zgodne z `AAI_MONITOR_WERSJA`. Trzy niezależne odczyty (przeglądarka × plik PHP), zero rozjazdu. |

### Nowe znalezisko przy weryfikacji MAR-A-28 (do rozstrzygnięcia — nie naprawiam, zgłaszam)

**`npm run wp:zrzuty` (dokumentowany w OSTRZEŻENIU remedium) rzuca nieobsłużony
wyjątek i NIE URUCHAMIA SIĘ, gdy jest choćby jeden brakujący zrzut** —
dokładnie w sytuacji, do której ma służyć. `tools/wgraj-zrzuty-wp.mjs:44` woła
`wp("aai-sklep","sprawdz","--format=json")` przez `execFileSync` bez `try/catch`;
`sprawdz --format=json` **celowo** kończy kodem 1, gdy `bledy_stanu()` niepuste
(0.75.0: „kod wyjścia taki sam w obu formatach"). `execFileSync` przy niezerowym
kodzie RZUCA, więc `JSON.parse(...)` nigdy się nie wykonuje — narzędzie pada,
zanim zdąży cokolwiek wgrać.

Dowód uruchomieniowy: `STACK_NAZWA=aai_wp_b node tools/wgraj-zrzuty-wp.mjs`
z jednym brakującym zrzutem (mój wstrzyk z testu MAR-A-28) → `Error … status: 1`
z `execFileSync`, proces kończy się przed jakąkolwiek próbą uploadu. Nie jest
to artefakt mojego środowiska — sam mechanizm (`execFileSync` bez obsługi
niezerowego kodu) jest w kodzie repozytorium.

Odtworzyłem stan ręcznie: `wp aai-sklep zrzuty /tmp/aai-zrzuty/manifest.json`
(bezpośrednie wywołanie podkomendy WP-CLI, z pominięciem zepsutego wrappera
Node) → `Success: Zrzuty: 1 utworzonych… (w bibliotece: 148)`, `sprawdz` → kod 0.

Klasyfikacja: średnia — nie dotyka danych klienta i nie psuje strony (MAR-A-28
sam w sobie działa poprawnie), ale **jedyna udokumentowana droga naprawy
własnej usterki jest zablokowana dokładnie wtedy, gdy jest potrzebna**, a to
bezpośrednio dotyczy tego, co widzi klient na lekcji (podpisane dziury zamiast
obrazów) — miejsce jest w moim zakresie FE. Miejsce:
`tools/wgraj-zrzuty-wp.mjs:44` (poza katalogiem wtyczek — plik NIE jest
montowany do obu torów, mogłem go tylko odczytać i zweryfikować, nie mutowałem).

## W2 — Rundy regresji (checklista FE)

| Pozycja | Tak/nie | Dowód |
|---|---|---|
| **FE-R1** odtworzenie naprawy uruchomieniowo | TAK (wszystkie 6 pozycji W1 wyżej) | patrz tabela W1 |
| **FE-R2** zasięg klasy w całym repo | TAK | `$_SERVER` w `szablony/`: 1 trafienie (komentarz). `tutor()->` bezpośrednio w plikach mojego zakresu (szablony + widok/lekcja/moje/menu): **0** trafień — ryzykowny wzorzec MAR-A-24 przeniesiony do `class-aai-sklep-tutor.php` (bridge, poza moim zakresem plikowym, ale sprawdziłem że tam jest odosobniony). `ma_kursy()`: dokładnie 2 wywołania, oba spójne. |
| **FE-R3** klasyfikacja/wpływ przy pełnym zasięgu | TAK, bez zmian | Zero dodatkowych miejsc → wpływ z W1 się nie zmienia. |
| **FE-R4** krzyżowanie z innymi działami tej fali | TAK | `grep -l "szablony/\|assets" audyt/wyniki/kontrola-0.78.0/*.md` → `PERF.md` (MAR-A-22, katalog×2 na odsłonę — **NAPRAWIONE** wg PERF, memoizacja `class-aai-sklep-trasy.php`, poza moim wąskim zestawem W1, ale zweryfikowałem że nie koliduje z MAR-A-25 dotykającą tego samego pliku — obie naprawy współistnieją, `zadanie_w_sklepie()` i `katalog()` to odrębne metody) i `PRIV.md` (assets `.htaccess`/`readme.txt` — poza zakresem wizualnym). Brak sprzeczności. |
| **FE-R5** mechanizm tej samej klasy bez zgłoszenia | TAK sprawdzone, NIE znaleziono | Poza `wp:zrzuty` (zgłoszone wyżej), nie znalazłem innych szablonów z literałem trasy, innym `$_SERVER`, ani innych `tutor()->WŁAŚCIWOŚĆ` w zakresie plikowym. |
| **FE-R6** wygląd na żywo — kontrast/nachodzenie/scroll poziomy | TAK | `ZRZUTY_RIG=/tmp/rig WP_ADRES=http://127.0.0.1:8894 STACK_NAZWA=aai_wp_b node tools/smoke/smoke-wp-motyw.mjs` → **kod 0, 93/93** (9 stron: katalog, kurs, lekcja, `/my-account/`, `/szkolenia/moje/`, koszyk, kasa, 2×Tutor) — 0 nachodzeń, 0 jasnych plam, 0 napisów <4.5:1 na wszystkich. Regresja `smoke-wp-lekcja` → **kod 0, 64/64** (73 lekcje bez zatrzymania). `smoke-wp-front` → **kod 0, 89/89**. Mobilny scroll poziomy (375×812) na `/szkolenia/`, `/szkolenia/moje/`, stronie lekcji: `scrollWidth===clientWidth` na wszystkich trzech — **kontrola pozytywna**: wstrzyknięty element 900px → metoda wykrywa (`scrollW=900 > clientW=363`), więc „ok" na realnych stronach nie jest ślepotą pomiaru. |
| **FE-90** inne ryzyko w zakresie | TAK, zgłoszone | Znalezisko `npm run wp:zrzuty` wyżej — jedyna pozycja poza literalną listą W1. |

## Niedomknięte

Brak. Wszystkie pozycje W1 i W2 zamknięte dowodem uruchomieniowym w czasie
przydzielonym na rundę.

## Sprzątanie i stan toru B po pracy

Własne ślady usunięte PO KLUCZU (nie zakresem/filtrem): `wp user meta delete 2
_tutor_completed_lesson_id_97`; `wp user delete 3` (`smoke-fe-brak-kursu`);
13 wierszy `wp_aai_monitor_logowania` (ID 1,2,3,4,5,6,7,8,9,10,11,12,16 —
wszystkie ze zdarzeniami `klient-test`/`smoke-fe-brak-kursu` w oknie mojej
pracy, potwierdzone `ip=10.89.5.4` + `agent=…Firefox/153.0`, tor B nie miał
żadnych wierszy monitoringu przed startem mojej rundy).

**Własny ślad zgłoszony wprost**: hasło `klient-test` na torze B było
NIEZGODNE z `.env` (logowanie failowało trzykrotnie, zanim to ustaliłem) —
zresetowałem je komendą `wp user update klient-test --user_pass=…` na wartość
z `wordpress/srodowisko/.env` (WP_KLIENT_HASLO). To NIE jest naprawa produktu,
to przywrócenie zgodności konta testowego ze stanem udokumentowanym w repo.

**Znalezisko poboczne, naprawione jako sprzątanie stanu bazy (nie kodu)**:
`wp aai-platnosci sprawdz` dało kod 1 (`strony natywnej kasy Tutora 310/311
opublikowane zamiast draft`) — artefakt najprawdopodobniej powstały przy moim
przełączaniu statusu kursu / testach logowania w oknie 23:44 (ta sama klasa,
którą wcześniej w tej fali zgłosiła i wyjaśniła rola PRIV dla wpisów 309/310
stworzonych przez ARCH). Naprawione WYŁĄCZNIE przez oficjalną komendę bazy
`wp aai-platnosci sync --napraw` (nie edycja plików) → kod 0.

**Stan końcowy toru B**: `wp aai-sklep sprawdz` kod 0, `wp aai-platnosci
sprawdz` kod 0, `wp aai-monitor sprawdz` kod 0; kursy 2× `published`; użytkownicy
`admin`, `klient-test`; `wp_aai_monitor_logowania` = 0 wierszy;
`_tutor_completed_lesson_id_*` dla usera 2 = 0 wierszy; biblioteka mediów
148 zrzutów.

## Werdykt krytyka: ODRZUCAM

Odtworzyłem pracę samodzielnie na torze B. **Sześć werdyktów W1 broni się** — i to
mocniej, niż pokazuje raport. Odrzucam za **trzy stwierdzenia, które okazały się
nieprawdziwe po pomiarze**, wszystkie z klas, za które odrzucono jedenaście prac tej fali.

**1. `KON-R1` — werdykt o PRZYCZYNIE jest fałszywy (zmierzone).** Liczba 68 jest
poprawna (37+17+4+9+1 — przeliczyłem). Ale wyjaśnienie „wzrost jest realny …
nie błąd pomiaru" jest nieprawdą: na commicie z 2026-09-01 (`e92df57`) ten sam
zakres dawał **66**, a **bez dziewięciu plików `includes/` — dokładnie 57**. Czyli
„57" to artefakt DOKŁADNIE TEGO defektu oprzyrządowania, który rola sama wymienia
cztery linie wyżej (`{a,b}` się nie rozwija), a nie wzrost drzewa. Realny przyrost
od 2026-09-01 to **+2 pliki: `aai-sklep/assets/.htaccess` i `aai-monitor/assets/.htaccess`**.
Trzy pliki wskazane jako przyczyna (`nie-znaleziono.php`, `moje.php`,
`lekcja-odhacz.php`) **istniały już 2026-09-01** — sprawdzone `git ls-tree`.
Werdykt o przyczynie postawiony bez policzenia stanu historycznego.

**2. `FE-R2`/`FE-R5` — „`tutor()->` … **0** trafień" jest fałszywe dla WŁASNEGO
zakresu.** Rola zawęziła zakres do „szablony + widok/lekcja/moje/menu", choć jej
zakres obejmuje też `trasy`, `zasoby`, `proza`, `styl-*`. W tych plikach jest
**4 bezpośrednich odwołań do właściwości obiektu Tutora** — tej samej klasy co
MAR-A-24: `class-aai-sklep-trasy.php:456-457` (`tutor()->course_post_type`)
i `class-aai-sklep-zasoby.php:130-131` (`course_post_type`, `lesson_post_type`).
Są osłonięte (`! empty()`, `?? 'courses'`), więc **nie są czynną usterką** — ale
zdanie „0 trafień, wzorzec przeniesiony do klasy-mostu" jest nieprawdziwe, a nie
ostrożne. Kwantyfikator bez policzenia wszystkich pozycji.

**3. `FE-R6` — odpowiedź o METRYCE zamiast o ZJAWISKU, przy niepełnym pokryciu.**
`html` ma `overflow-x: clip`, więc `scrollWidth > clientWidth` **nie znaczy tu
przewijania w bok**: po wstrzyknięciu elementu 900 px `scrollWidth` = 900,
a `window.scrollX` po `scrollTo(600,0)` = **0** — czyli kontrola pozytywna roli
dowodzi reakcji miernika, nie istnienia zjawiska. Do tego **nie zmierzono strony
sprzedażowej** `/szkolenia/<slug>/`, najważniejszej handlowo strony zakresu:
przy 375×812 ma ona `scrollWidth 509` przy `clientWidth 363` (Claude) i `479/363`
(GitHub) — metryka roli zapaliłaby tam alarm, który zjawiskiem nie jest.
Wniosek „ok" jest przypadkiem prawdziwy, drogą, która nie mierzy tego, co deklaruje.
Dlatego **„Niedomknięte: brak" nie jest uczciwe** dla `FE-R6`.

### FE-90 — werdykt niezależny: PRAWDZIWE, waga WYŻSZA niż zgłoszona, obejścia BRAK

Potwierdzam **uruchomieniowo, nie z lektury**, z kontrolą pozytywną w obie strony:
przy komplecie 148 zrzutów `STACK_NAZWA=aai_wp_b node tools/wgraj-zrzuty-wp.mjs`
kończy **kodem 0** („148 bez zmian"); po skasowaniu jednego załącznika
(`wp post delete 160 --force`) `wp aai-sklep sprawdz` daje **kod 1**, a to samo
narzędzie **kod 1 z nieobsłużonym `Error: Command failed … execFileSync`
w `wgraj-zrzuty-wp.mjs:44`**, przed jakąkolwiek próbą wgrania.

**Rola zaniżyła zakres do „remedium na własną usterkę". Zmierzyłem szerzej:**
przy **zerze** zrzutów w bibliotece (stan świeżej instalacji) `sprawdz` daje kod 1
z **64 ostrzeżeniami**, a `wp:zrzuty` pada tak samo i **nie wgrywa ani jednego
pliku**. Czyli **udokumentowany łańcuch stawiania środowiska z README:616
(`wp:import && wp:sync && wp:zrzuty`) nie może się powieść od `v0.76.0`** —
nie tylko naprawa po awarii. Zmierzone przez wyzerowanie i pełne przywrócenie
biblioteki (148 → 0 → 148).

**Obejścia w praktyce nie ma.** Narzędzie pada **przed** utworzeniem manifestu
(sprawdzone: po `rm -rf /tmp/aai-zrzuty` w kontenerze plik nie powstaje), więc
podkomenda `wp aai-sklep zrzuty <manifest>`, którą rola się ratowała, działa
**wyłącznie dzięki manifestowi zostawionemu przez WCZEŚNIEJSZY udany przebieg** —
czego świeża instalacja z definicji nie ma. Sam musiałem złożyć manifest ręcznie,
żeby przywrócić jeden zrzut. `wp:zrzuty` jest jedyną drogą udokumentowaną
(README:322 i 616, `W6-TEST-RECZNY.md`, no i sam komunikat kontroli); podkomenda
WP-CLI nie jest opisana nigdzie dla człowieka. **Waga: nie „średnia", tylko
blokująca odtworzenie środowiska.** Naprawa jest jednoliniowa (`try/catch` wokół
wywołania — JSON jest w `stdout` mimo kodu 1), ale to rozstrzygnięcie właściciela.

### Pozycje odtworzone przeze mnie samodzielnie (werdykty roli utrzymane)

- **P0-1** — `status='archived'` + `sync`: `Aai_Sklep_Moje::kursy()` dla `klient-test`
  dalej oddaje **oba kursy**, `ma_kursy()` = TAK, a `Aai_Sklep_Odczyt::lista_kursow()`
  **tylko opublikowany** (kontrola różnicująca działa). Kopia w Tutorze: kurs
  `private`, lekcja `publish`. Przywrócone, katalog znów z dwoma kursami.
- **MAR-A-24** — rig, `klient-test`, lekcja 76: klik → przycisk `disabled`
  „Lekcja przerobiona" **i wiersz w bazie** `_tutor_completed_lesson_id_76`
  (dowód danych, nie HTML — tego raport nie pokazywał). Podmieniony nonce na
  lekcji 77 → `{"success":false,… "Nonce nie zostało dopasowane…"}` **i brak
  wiersza**. Oba kierunki potwierdzone; ślad skasowany po kluczu.
- **MAR-A-25** — `$_SERVER` w `szablony/`: 1 trafienie, w komentarzu.
- **MAR-A-26** — `ma_kursy()`: dokładnie 2 wywołania (`menu.php:150`, `moje.php:151`).
- **Cache-buster** — `pomiar.js?ver=0.8.0` = `AAI_MONITOR_WERSJA`; `sklep.css/js`
  po `filemtime()`, zgodnie z opisem.
- **`smoke-wp-front` 89/89, kod 0** — liczba z raportu jest prawdziwa.

### Nieprzyjęte

`KON-R1` (wyjaśnienie przyczyny), `FE-R2`/`FE-R5` (zasięg `tutor()->`),
`FE-R6` (scroll poziomy — metryka i pokrycie), klasyfikacja `FE-90` jako
„średnia", oraz „Niedomknięte: brak".

### Stan toru B po mojej weryfikacji

Przywrócony do zastanego: biblioteka **148 zrzutów**, oba kursy `published`,
ukończeń lekcji **0**, użytkownicy `admin` + `klient-test`, dziennik logowań
**0 wierszy** (skasowałem wyłącznie własny wiersz `id=17`, jawnie po identyfikatorze),
wizyty 0, `wp_options` bez alarmów wtyczek. Cztery kontrole (`aai-sklep sprawdz`,
`aai-platnosci sprawdz`, `aai-monitor sprawdz`, `aai-sklep sprawdz-tutora`) —
**kod 0**, mierzone bez potoku. Plików wtyczek nie mutowałem; toru A nie dotykałem.
