# Plan do niedzieli (2026-09-06) — wskazówki Mariusza + znaleziska fali kontrolnej

Zapisane 2026-09-05 ~15:50 (sweep przed `/clear`). Właściciel: Krzysiek. Cel: **oddać projekt
bez błędów do niedzieli**. Ten plik jest NOŚNIKIEM TRWAŁYM tego, co Krzysiek przekazał ustnie
z przeglądu Mariusza — nic z tego nie jest jeszcze w kodzie ani w CLAUDE.md (gałąź sektora
nie może dotykać plików poza `audyt/`; do CLAUDE.md idzie docs-PR na końcu fali).

## 1. Przegląd Mariusza (zewnętrzny, 2026-09-05) — dosłownie, co przekazał Krzysiek

**Oceny:** security 10/10 · SEO 10/10 · DB 10/10 · architektura 9/10 · płatności i warstwa
z nimi związana 8/10 · QA/testy 9/10 · dokumentacja 8.5/10 · audyt 9.5/10.
**Błędy:** **1 DUŻY, 3 ŚREDNIE, 3 MAŁE** — jeden z małych to instrukcja. Krzysiek podał
DWIE wskazówki konkretne; pozostałych **pięć pozycji z listy Mariusza nie jest jeszcze
nazwanych** (pytanie do Krzyśka niżej). Zrzut ekranu od Mariusza: schemat „moduł → baza d →
[błąd | ok]” — „tak plus minus wygląda każdy błąd średni”, czyli błędy średnie siedzą na
drodze **moduł → baza danych**, tam gdzie gałąź błędu nie jest obsłużona jak gałąź „ok”.

| # | Wskazówka | Waga (wg Mariusza) | Stan sprawdzony 2026-09-05 15:42 |
|---|---|---|---|
| M1 | **Zgodność wersji „tu i tu”**: `wordpress/srodowisko/compose.yml` = `wordpress:6.9.4-php8.4-apache`, a `docs/INSTRUKCJA-INSTALACJI.md:54` obiecuje „WordPress 6.5+, PHP 8.1+”; nagłówki i `readme.txt` trzech wtyczek: `Requires at least: 6.5`, `Tested up to: 6.9`, `Requires PHP: 8.1`. Wersja MUSI być zgodna w instrukcji, compose, nagłówkach wtyczek i README. | mały (instrukcja) | POTWIERDZONE grepem. Do tego fala kontrolna zmierzyła (WDR/orkiestracja): **`postaw.sh` na świeżej instancji PADA**, bo `wp plugin install woocommerce` bierze najnowsze Woo wymagające WP ≥ 7.0 przy obrazie 6.9.4 — czyli obietnica „6.5+” jest dziś nieprawdziwa w drugą stronę (najnowszy Woo nie działa z niczym < 7.0). Naprawa = JEDNA decyzja o wersji bazowej (np. przypiąć Woo 11.0.1 + Tutor 4.0.7 w `postaw.sh` i zapisać te same liczby w instrukcji, README i nagłówkach), plus strażnik zgodności wersji między czterema miejscami. |
| M2 | **Maile do klienta**: „sprawdź z jakiej do jakiej poczty są wysyłane maile, kto go wysyła” — wskazany `class-aai-platnosci-maile.php:363-419`. | średni (prawdopodobnie) | Linie 363–419 to kolejka wysyłki na `shutdown` (`na_koniec_zadania`/`wykonaj`). Nadawcę ustawia `nadawca_adres()` (filtr `wp_mail_from`, prio 1): podmienia TYLKO domyślne `wordpress@<host>` na `woocommerce_email_from_address` → `admin_email`; wysyłka nasza dodaje `From: nadawca()` w nagłówku (linia 720). W warsztacie poczta idzie przez mu-plugin do Mailpita (SMTP `mailpit:1025`), więc **na produkcji nikt jeszcze nie zmierzył, z jakiego adresu i przez co wychodzi mail** (sendmail kontenera nie istnieje — lekcja P4). Do sprawdzenia po clear: (a) odbiorca = `billing_email` zamówienia czy `user_email` konta (rozjazd przy zakupie na inny mail niż konto), (b) czy `From:` w nagłówku nie kłóci się z filtrem, (c) `Reply-To`, (d) co się dzieje, gdy `admin_email` = `wordpress@127.0.0.1` (świeża instalacja) — mail wychodzi z adresu, którego nie ma; (e) czy kolejka `shutdown` odpala przy WP-CLI/cron (płatność potwierdzona z panelu → `shutdown` admina — TAK; z webhooka bramki — do zmierzenia). |

## 2. Co fala kontrolna 0.65.0 ZNALAZŁA (stan 12/14 działów po krytyku) — kandydaci na „1 duży + 3 średnie”

Werdykty po krytyku (pełnia w `WYNIK.md` i `<KOD>.md`):

| Waga | Znalezisko | Dowód | Gdzie naprawiać |
|---|---|---|---|
| **DUŻE** | **Fragmenty haseł w dzienniku logowań** — AUD-PRIV-F1-001 NIENAPRAWIONE: `PRIVAUDYT_TajneHaslo123` → kolumna `login` = `PRI…(23 znaków)`; KAŻDE hasło bez znaku specjalnego przechodzi `sanitize_user($x,true)===$x` jako „kształt loginu”; także przez formularz konta Woo `/my-account/`; polityka prywatności twierdzi „nie zapisujemy haseł ani ich fragmentów”. | PRIV.md, krytyk | `aai-monitor` `Aai_Monitor_Logowania::bezpieczny_login()` — maskować WSZYSTKO, co nie jest istniejącym loginem (zostawiać tylko długość), albo w ogóle nie zapisywać nieistniejących loginów |
| średnie | **Jeden uszkodzony plik klasy = HTTP 500 na całej witrynie** (try/catch z 0.65.0 nie obejmuje statycznych wywołań klas bez `class_exists()` z zarejestrowanych haków i z poziomu pliku): 3 pliki/42 — `class-aai-sklep-tutor.php`, `class-aai-sklep-moje.php`, `class-aai-platnosci-ustawienia.php`. | BE.md, krytyk | autoloader/bootstrap: przy braku klasy nie rejestrować haków (albo `class_exists` w punktach wejścia) |
| średnie | **Okno bez znacznika przy tworzeniu produktu Woo** (AUD-BD-F1-001 CZĘŚCIOWO): przerwanie między `wp_insert_post` a `save_meta_data()` zostawia produkt-szkic bez met; `sync` tworzy DRUGI produkt (stary sprzedawany osierocony); `sprawdz` kod 0. **To jest dosłownie zrzut Mariusza: moduł → baza → gałąź błędu nieobsłużona.** | BD.md, krytyk | `Aai_Platnosci_Zapis::synchronizuj_kurs()` — znacznik przed `save()` (meta na `pre_post_update`/`wp_insert_post_data`) albo kontrola po sierotach `product`+`draft` bez met |
| średnie | **Zamówienie MIESZANE po skasowaniu zostawia earnings + notatki** (REA-INT-F1-003 CZĘŚCIOWO) — zamek 1 `same_kursy()` wychodzi przed sprzątaniem; klasa tylko wykrywana (`sprawdz` kod 1). | INT.md, krytyk | `Aai_Platnosci_Dostarczanie::zamowienie_znika()` — sprzątać pozycje kursowe także w mieszanych |
| średnie | **Kolektor CSP przyjmuje `application/json` bez integralności** (REA-SEC-F1-003 NIENAPRAWIONE; naprawa świadomie węższa, w repo nienazwana); po 200 rodzajach prawdziwe naruszenia giną po cichu; **dziennik logowań bez sufitu na anonimowe POST** (28 wierszy/1,4 s). | SEC.md, krytyk | mu-plugin obwodu (sufit + przycinanie + nazwanie pozostałości w NAPRAWY) i `Aai_Monitor_Logowania` (limiter jak w beaconie) |
| małe | **README nieprawdy**: `README.md:52` „33 potwierdzone usterki NAPRAWIONE” (jest 32 z 33); liczniki „Gdzie co leży” 135/18/140 vs 136/19/141; `aai-sklep` zmieniony w 9 plikach bez podbicia `0.6.0`; nagłówek `straznik-readme` opisuje 6 reguł przy 8; komenda `sieroty` bez wiersza w `wordpress/README.md`. | REPO.md, krytyk | README, CHANGELOG, nagłówek wtyczki, strażnik readme |
| małe | Dwie asercje `smoke-wp-zakup` „zamek 1 nie trzyma” ŚLEPE; 6 z 17 nowych gałęzi strażników bez mutacji w audycie; 148 zrzutów z `uploads/` bez `Cache-Control`; `zapytania-wp.mjs` zostawia `recently_activated`. | QA.md, PERF.md, USP.md | smoke, audyt-straznikow, `.htaccess` |
| małe | Procedura WYTYCZNE §1 (`.bak` + rejestr) nieużywana od 0.59.0 (11 wydań) — utrwalona praktyka; do decyzji Krzyśka: uchylić w WYTYCZNE albo nadrobić wpisy. | PIK.md, krytyk | WYTYCZNE / rejestr |

Nie naprawiamy w sektorze (zasada 2). Naprawy = **gałąź `fix/…` od `main`**, PR, CI.

## 3. Plan na sobotę wieczór / niedzielę (kolejność, nie do zmiany bez powodu)

0. **Po `/clear`, w tej samej sesji, dokończyć falę** (patrz PRZEBIEG.md, sekcja „Przerwanie”):
   WDR od nowa na torze B (postaw od zera + chain danych — tor B ma już import; bezpieczniej
   powtórzyć cały krok), krytyk PROTO (wymaga `npm run dev` `:3001` — **UWAGA: `next dev`
   przy starcie UCIĄŁ `CLAUDE.md` o 2355 linii; po zatrzymaniu deva: `git diff --stat
   CLAUDE.md` i `git checkout -- CLAUDE.md`**), krytyk WDR, `WYNIK.md` bilans, pełny audyt
   mutacyjny strażnika sektora W TLE (limit 60 min, nic równolegle), commit sektora.
   Fala w tle = zajmuje tory; naprawy robić na gałęzi od `main` w **osobnym worktree**
   (`git worktree add ../Pod-strona-Szkolenia-fix fix/po-mariuszu main`) — ale **`:8892`
   i `:8894` są zajęte przez falę**; naprawy weryfikować bramkami dopiero po zamknięciu fali
   albo na TRZECIM stacku (`STACK_NAZWA=aai_wp_c WP_PORT=8896 MAILPIT_PORT=8897`, pamięć: 2 GB
   dostępne przy dwóch — trzeci może się nie zmieścić; zmierzyć `free -g`).
1. **Pytanie do Krzyśka (blokujące dla kompletu):** pełna lista 7 pozycji Mariusza
   (1 duży, 3 średnie, 3 małe) — które to? Bez niej „bez błędów do niedzieli” = nasze 8
   znalezisk + M1 + M2, a nie lista Mariusza.
2. **Naprawy P0 (duże):** PRIV maska loginu. **P1:** M1 zgodność wersji (decyzja o wersji
   bazowej + przypięcie Woo/Tutor w `postaw.sh` + strażnik czterech miejsc), M2 maile
   (pomiar od/do/kto na `:8892` przez Mailpit + kod). **P2 (średnie):** BD okno znacznika,
   INT mieszane, BE `class_exists`, SEC sufity. **P3 (małe):** README/CHANGELOG/wersja
   `aai-sklep`, ślepe asercje, 6 mutacji, `.htaccess` dla `uploads/`.
3. Każda naprawa: gałąź od `main`, test negatywny, bramki, `npm run check`, PR z zielonym CI
   (CI działa od 1 września), tag. Po naprawach — **druga fala kontrolna tylko dla
   naprawionych wpisów** (ten sam nośnik B, kolejny katalog `kontrola-0.66.0/`).
4. Docs-PR do `main`: zdanie w CLAUDE.md/README o fali kontrolnej + wskaźnik na ten plik.
