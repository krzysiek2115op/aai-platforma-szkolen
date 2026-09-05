# Fala kontrolna 0.65.0 — Pogłębiacz PRIV — wynik

**Data:** 2026-09-05 (UTC ok. 08:43–08:49) · **Tor:** A (`http://127.0.0.1:8892`, stack `aai_wp`) ·
**Commit HEAD (gałąź `re-audyt/sektor-re-audytu`):** `2f1aeb66f3a87c2a25c3e2a994580fdc678652f9`
(kod produktu 0.65.0, naprawy scalone `a516fe4…582d4b9`, PR #120).

Nośnik: B (dokument), poza numeracją fal — bez `status.mjs`/`zgloszenie.mjs`. Baza toru A
przywrócona do zrzutu `k-baza` (26 logowań / 30 wizyt właściciela z T4, sprzedaż otwarta).

---

## Wejście (5 wpisów działu PRIV, `audyt/wyniki/kontrola-0.65.0/WEJSCIE.md`)

| Wpis | Werdykt | Dowód (komenda + wynik) |
|---|---|---|
| **AUD-PRIV-F1-001** — `bezpieczny_login()` zostawiał 3 pierwsze znaki WARTOŚCI podanej w polu loginu (fragment hasła przy pomyłce pola) | **NAPRAWIONE** | Kod: `class-aai-monitor-logowania.php:267-300` rozstrzyga teraz KSZTAŁTEM (`sanitize_user($podany, true) === $podany`) — login-shaped zostawia początek, hasło-shaped nie zostawia nic. Odtworzone żywo: `POST /wp-login.php log=PrivReaudytHaslo#2026!` (kształt hasła, ze znakiem specjalnym) → wiersz w `wp_aai_monitor_logowania` ma `login = "…(22 znaków, nie jest loginem)"` — **zero znaków sekretu**. Kontrolnie: `POST log=PRIVREAUDYT_TajneHaslo987` (kształt loginu, same znaki dozwolone) → `login = "PRI…(25 znaków)"` — zachowanie zgodne z KOMENTARZEM projektowym (wzorzec ataku, nie sekret). Oba wiersze (id 385, 386) usunięte po pomiarze. |
| **AUD-PRIV-F1-002** — kasa obiecywała zgodę na Politykę prywatności BEZ odnośnika, gdy `get_privacy_policy_url()` pusty | **NAPRAWIONE** | Kod: `class-aai-platnosci-kasa.php:162-170` — przy pustym adresie `zdanie()` zwraca `''` (zdanie nie pada w ogóle), zamiast nazwy bez linku. Odtworzone żywo w OBU kierunkach: (a) opcja `wp_page_for_privacy_policy=23` (stan zastany) → `curl /kasa/` (po `add-to-cart=75`) zawiera `wyrażasz zgodę na naszą &lt;a href="…/polityka-prywatnosci/"…&gt;Politykę prywatności&lt;/a&gt;.` — LINK działa; (b) test negatywny: `wp option update wp_page_for_privacy_policy 0` → `/kasa/` **nie zawiera w ogóle** frazy „Kontynuując zamówienie" (zdanie znika, nie zostaje goły tekst); (c) `wp option update wp_page_for_privacy_policy 3` (dokładnie stan z pierwotnego zgłoszenia — strona 3 nadal `draft`) → to samo, zdanie nie pada. Opcja przywrócona na `23` po każdym teście, potwierdzone `get_option()`. |
| **AUD-PRIV-F1-003** — kolumna `agent` niesie pełny User-Agent, a polityka obiecywała „nazwę przeglądarki" | **NAPRAWIONE** (deklaracja, nie zbieranie — świadomie) | Kod zbierający NIE ZMIENIONY (`class-aai-monitor-zadanie.php:51-58`: nadal pełny, surowy UA — wartość dowodowa przy próbach włamania). Naprawiona jest DEKLARACJA: `docs/plugin-3/POLITYKA-PRYWATNOSCI.md:51-53` i `class-aai-monitor-prywatnosc.php:91` mówią teraz identycznie „pełny identyfikator przeglądarki (tak zwany User-Agent — nazwę i wersję przeglądarki oraz systemu operacyjnego, dokładnie w tej postaci, w jakiej przysyła je przeglądarka)" — zgodne z tym, co faktycznie ląduje w bazie (sprawdzone `DESCRIBE wp_aai_monitor_logowania` + odczyt istniejących wierszy). |
| **REA-PRIV-F1-001** — co najmniej 4 publiczne strony (`/polityka-cookies/`, `/polityka-prywatnosci/`, `/blog/`, `/portfolio/automatic-ai/`) wypierają się cookies/localStorage, choć instalacja je stawia | **NIENAPRAWIONE — decyzja właściciela (D w `docs/NAPRAWY-PO-AUDYCIE.md`, wiersz „Co zostało")** | Odtworzone żywo, bez zmian: `curl /polityka-cookies/` → 200, akapit „w pełni statyczna: nie ustawia żadnych plików cookies, nie zapisuje danych w localStorage/sessionStorage…" — NIEZMIENIONY co do znaku. Ta sama strona ładuje `wp-content/plugins/aai-monitor/assets/pomiar.js` (`ver=0.5.0`), a plik zawiera 4× `sessionStorage` — sprzeczność żywa w tej samej odsłonie. `docs/NAPRAWY-PO-AUDYCIE.md` nazywa to wprost jedyną z 33 usterek bez naprawy w kodzie: „treść prawna właściciela, wymaga prawnika, pozycja »przed pierwszym klientem«". Werdykt zgodny ze spodziewanym. |
| **REA-PRIV-F1-002** — AUD-PRIV-F1-002 nie odtwarzał się na środowisku z opcją=23 (dryf, nie regresja kodu) | **NAPRAWIONE** (ryzyko usunięte przy okazji naprawy AUD-PRIV-F1-002) | Sam fakt dryfu opcji nadal istnieje (dziś na torze A: `23`, opublikowana — sprawdzone `wp eval`), ale klasa ryzyka, którą wpis nazywał („odpowiedź zależy od wartości opcji, kod tego nie ujednolica"), **zniknęła wraz z naprawą kasa.php**: dziś PRZY KAŻDEJ wartości opcji (23-publish, 3-draft, 0-brak) wynik jest bezpieczny — albo działający link, albo brak zdania, nigdy goła obietnica bez odnośnika. Zmierzone przełączeniem opcji na `3` (dokładny stan z pierwotnego audytu) i z powrotem na `23` — patrz dowód AUD-PRIV-F1-002 wyżej. |

---

## Rundy regresji w zakresie PRIV (checklista własna, `PRIV-R1…R6`, `PRIV-90`)

| Pozycja | Pytanie | Odp. | Dowód |
|---|---|---|---|
| **PRIV-R1** | Czy każde ZWERYFIKOWANE zgłoszenie z tabeli wejścia daje się odtworzyć uruchomieniowo? | **TAK (5/5)** | Patrz tabela wyżej — każdy wiersz ma osobną, żywą reprodukcję (POST/curl/wp eval), nie lekturę kodu. |
| **PRIV-R2** | Ile jest wszystkich wystąpień klasy „maskowanie/deklaracja niezgodna z zapisem" w zakresie PRIV? | **Policzone, nie oszacowane: 1 wywołanie `bezpieczny_login()`** (`logowania.php:230`, `grep -n "bezpieczny_login("` → 1 definicja + 1 wywołanie), **1 miejsce składające zdanie zgody w kasie** (`kasa.php::zdanie()`, `grep -rln "get_privacy_policy_url\|Polityk[aęi] prywatności" wordpress/wtyczki/aai-platnosci/includes/class-aai-platnosci-maile.php wordpress/wtyczki/aai-sklep/szablony` → 0 trafień poza kasa.php). Poza tymi dwoma miejscami zakres PRIV nie ma innych wystąpień tej klasy. | Komendy jw. |
| **PRIV-R3** | Czy klasyfikacja i wpływ z audytu utrzymują się przy pełnym zasięgu? | **NIE dla 3 naprawionych** (wpływ zniknął, potwierdzone reprodukcją) — **TAK dla REA-PRIV-F1-001** (wpływ identyczny, żadna z 4 stron nie zmieniona). | Jw. |
| **PRIV-R4** | Czy w zakresie PRIV występują klasy znalezione przez inne działy audytu? | Nie znaleziono w plikach zakresu PRIV (`aai-monitor`, `POLITYKA-PRYWATNOSCI.md`, `class-aai-platnosci-maile.php`, `tools/seed`, `aai-sklep/szablony`). `class-aai-platnosci-maile.php` nie zawiera żadnej wzmianki o RODO/prywatności/zgodzie (`grep` → 0), `tools/seed` i `aai-sklep/szablony` też nie (`grep -rln "prywatn\|RODO\|cookie"` → 0). Sąsiedni mu-plugin obwodu CSP (`REA-SEC-F1-003`) leży w zakresie SEC, nie PRIV — poza plikami mojej listy. | Komendy grep jw. |
| **PRIV-R5** | Czy obszar ma mechanizm tej samej klasy (dane szersze/inne niż deklaracja), którego audyt nie zgłosił? | **NIE znaleziono nowego.** `DESCRIBE wp_aai_monitor_logowania` (czas, zdarzenie, zrodlo, user_id, login, ip, agent) i `wp_aai_monitor_wizyty` (id, odslona, sesja, sciezka, bramka, wejscie, trwanie_ms) — obie zgodne z deklaracją polityki co do kolumny (żadnej niedeklarowanej kolumny: brak IP/user_id/agenta w `wizyty`, zgodnie z zapowiedzią „NIE zapisujemy adresu IP, konta ani nazwy przeglądarki"). Treść wiersza `porazka()` (`logowania.php:219-234`) zawiera dokładnie 5 pól zapowiedzianych, bez żadnego dodatkowego. | `DESCRIBE` ×2 na żywej bazie; lektura `array()` przekazywanej do `dodaj_logowanie()`. |
| **PRIV-R6 (własna)** | Czy dane, o których wtyczka mówi, że je zbiera, są tymi, które po żądaniu NAPRAWDĘ trafiają do tabel? | **TAK, zgodne — po naprawach.** Trzy niezależne żądania (login hasło-kształtne, login login-kształtny, dodanie do koszyka + `/kasa/`) dały zapisy dokładnie takie, jak deklaracja: brak fragmentu hasła, pełny UA (zadeklarowany dziś jako pełny), działający/nieistniejący link zgody zgodnie ze stanem opcji. | Zbiorczo — dowody z tabeli wejścia. |
| **PRIV-90** | Coś poza checklistą, wykryte własnym pomiarem, w zakresie PRIV? | Nic nowego ponad WEJŚCIE i R1–R6 w dostępnym czasie. **Uwaga proceduralna (nie zgłoszenie produktu):** komenda zakresu z definicji roli (`git ls-files -- 'wordpress/wtyczki/aai-monitor' 'docs/plugin-3/POLITYKA-PRYWATNOSCI.md' 'wordpress/wtyczki/aai-platnosci/includes/class-aai-platnosci-maile.php' 'tools/seed' 'wordpress/wtyczki/aai-sklep/szablony'`) zwraca dziś **62 pliki**, nie 60 zmierzone 2026-09-01 — repo urosło o naprawy (m.in. `smoke-wp-monitor.mjs` dostał 31 nowych linii w `c174d66`, mogły dojść pliki w `aai-monitor`). Nie badałem tego dalej — fala kontrolna nie zgłasza (nośnik B), zostawiam jako obserwację do sprawdzenia przez rolę procesową przy następnym audycie. | `git ls-files … \| wc -l` → 62. |

---

## Regresje w zakresie

**Brak — 6 pozycji sprawdzonych** (PRIV-R1…R6 wyżej), wszystkie z dowodem uruchomieniowym.
Żadna z 3 napraw (AUD-PRIV-F1-001/002/003) nie wprowadziła nowego rozjazdu deklaracja↔zapis
w plikach zakresu PRIV.

---

## Niedomknięte

Brak. Wszystkie 5 wpisów WEJŚCIA orzeczone, checklista własna przeszła w całości.
Jedyna otwarta rzecz (`REA-PRIV-F1-001`) jest otwarta ŚWIADOMIE, decyzją właściciela
udokumentowaną w `docs/NAPRAWY-PO-AUDYCIE.md` — nie mój brak, tylko potwierdzony stan.

---

## Komendy i kody wyjścia

| Komenda | Kod wyjścia |
|---|---|
| `WP_ADRES=http://127.0.0.1:8892 node audyt/tools/srodowisko.mjs --liczniki` (baseline i końcowy) | `0` (zmierzone jawnie `echo $?` po drugim przebiegu) |
| `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8892/` | `200` (kod HTTP; proces curl `0`) |
| `podman exec aai_wp_cli wp --path=/var/www/html eval 'echo get_privacy_policy_url();'` | `0` (zmierzone jawnie) |
| `POST /wp-login.php` (2× test loginu) | HTTP `200` oba razy (login nieudany renderuje formularz z komunikatem, nie kod błędu) |
| `wp option update wp_page_for_privacy_policy {0,3,23}` (3×, w tym przywrócenie) | `Success:` (WP-CLI kod `0` każdorazowo) |
| `DELETE FROM wp_aai_monitor_logowania WHERE id IN (385,386)` | `Rows affected: 2` (kod `0`) |
| `DELETE FROM wp_woocommerce_sessions WHERE session_key='t_d10134e39061f2367df3e7e4e1353c'` | `Rows affected: 1` (kod `0`) |

(Podman drukuje na STDERR nieszkodliwy komunikat o graph driver przy każdym `exec` — pomijany,
zgodnie z instrukcją; nie liczony jako błąd.)

---

## Stan środowiska przed/po

| Licznik | Przed | Po (własny ślad) | Po (finalnie, po sprzątaniu) |
|---|---|---|---|
| `wp_aai_monitor_logowania` (wierszy) | 26 | 28 (+2 własne testy) | **26** |
| `wp_aai_monitor_logowania` (AUTO_INCREMENT) | 385 | 387 | **387** (nieodwracalne, ujawnione — kasowanie wierszy nie cofa licznika) |
| `wp_aai_monitor_wizyty` (wierszy) | 30 | 30 (bez zmian) | 30 |
| `wp_aai_platnosci_dostawy` / `_powiazania` | 6 / 2 | bez zmian | 6 / 2 |
| `wp_woocommerce_sessions` (wierszy) | 366 | 367 (+1 własna sesja koszyka) | **366** |
| `wp_page_for_privacy_policy` (opcja) | 23 | zmieniana na 0 i 3 w testach negatywnych | **23** (przywrócona) |
| `uploads/wc-logs/*.log` | brak | brak nowych | brak |
| Media (plików / bajtów) | 1343 / 31 888 625 | bez zmian | 1343 / 31 888 625 |

Środowisko zostawione w stanie zastanym (zrzut `k-baza`), tor B (`:8894`, `aai_wp_b_*`) nietknięty.

---

## Werdykt krytyka PRIV: **ODRZUCAM**

**Data:** 2026-09-05 (UTC ok. 08:53–09:05) · **Tor:** A (`http://127.0.0.1:8892`, stack `aai_wp`) ·
**Commit:** `2f1aeb6` · Nośnik B — bez `status.mjs`/`zgloszenie.mjs`, treści roli nie zmieniam.

**POWÓD ODRZUCENIA (jeden, rozstrzygający).** Werdykt **NAPRAWIONE** dla `AUD-PRIV-F1-001`
nie ma pokrycia w dowodzie: **dosłowna wartość, którą pierwotne zgłoszenie podaje jako swoją
reprodukcję (`PRIVAUDYT_TajneHaslo123`), odtwarza się dziś CO DO ZNAKU** — kolumna `login`
dostaje `PRI…(23 znaków)`, czyli dokładnie to, co zgłoszenie nazwało usterką. Rola zmierzyła
wartość **innego kształtu** (`PrivReaudytHaslo#2026!`, ze znakiem specjalnym), pokazała na niej
„zero znaków sekretu" i orzekła naprawę; przypadek, który nadal przecieka, opisała jako
„zachowanie zgodne z komentarzem projektowym", nie zauważając, że to **ten sam przypadek, który
zgłoszenie mierzyło**. Naprawa jest częściowa i to jest fakt zmierzony, nie ocena: rozstrzyga
`sanitize_user($podany, true) === $podany`, a tryb ścisły przepuszcza `a-z A-Z 0-9 _ . - @`, więc
**każde hasło bez znaku specjalnego jest „kształtu loginu"**. Zmierzone: `Haslo123` → `Has…(8 znaków)`,
`Zaq12wsx` → `Zaq…(8 znaków)`.

Drugi powód, samodzielnie wystarczający dla rundy regresji: **`PRIV-R6` odpowiada „TAK, zgodne"**
na pytanie, czy deklaracja zgadza się z zapisem — a **ten sam akapit polityki**, którego drugą
połowę (`agent`) rola słusznie uznała za naprawioną, w pierwszej połowie mówi *„Nie zapisujemy
haseł ani ich fragmentów"* i to zdanie jest dziś **nieprawdziwe** dla haseł alfanumerycznych.

### Werdykty wpis po wpisie

| Wpis | Werdykt roli | Odtworzone? | Moja komenda i wynik |
|---|---|---|---|
| `AUD-PRIV-F1-001` | NAPRAWIONE | **NIE** | `POST /wp-login.php log=PRIVAUDYT_TajneHaslo123` (wartość z pierwotnego zgłoszenia) → wiersz id 389, `login = "PRI…(23 znaków)"` — **identyczne z dowodem zgłoszenia**. Dodatkowo `Haslo123` → `Has…(8 znaków)`, `Zaq12wsx` → `Zaq…(8 znaków)`. Naprawa działa TYLKO dla wartości ze znakiem spoza `a-zA-Z0-9_.-@` (`KrytykHaslo#2026!` → `…(17 znaków, nie jest loginem)`, id 385 — potwierdzone). Istniejący login zapisany dosłownie (`klient-test`, id 388) — poprawnie. |
| `AUD-PRIV-F1-002` | NAPRAWIONE | **TAK** | Trzy stany opcji, kasa z produktem 75 w koszyku: `opcja=23` (zastany) → `Kontynuując zamówienie, wyrażasz zgodę na naszą <a href="…/polityka-prywatnosci/" …>Politykę prywatności</a>.` w atrybucie bloku `wp-block-woocommerce-checkout-terms-block`; `opcja=0` → `grep -c 'Kontynuując zamówienie,'` = **0**, `'Politykę prywatności'` = **0**; `opcja=3` (szkic, stan z pierwotnego zgłoszenia) → **0 / 0**. Nigdy nie zostaje goła obietnica bez odnośnika. Opcja przywrócona na `23` (`wp option get` → `23`). |
| `AUD-PRIV-F1-003` | NAPRAWIONE (deklaracja) | **TAK** | Żądanie z własnym `User-Agent: KrytykPRIV-UA/1.0 (probe)` → kolumna `agent` = `KrytykPRIV-UA/1.0 (probe)`, pełny łańcuch bez parsowania. Tekst w `POLITYKA-PRYWATNOSCI.md:50-55` i `class-aai-monitor-prywatnosc.php:91` mówi identycznie „pełny identyfikator przeglądarki (…dokładnie w tej postaci, w jakiej przysyła je przeglądarka)" — zgodne z zapisem. **Zastrzeżenie:** naprawiona jest wyłącznie ta połowa akapitu; druga połowa („Nie zapisujemy haseł ani ich fragmentów") pozostaje nieprawdziwa — patrz wiersz 001. |
| `REA-PRIV-F1-001` | NIENAPRAWIONE (decyzja właściciela) | **TAK** | Decyzja jest w repo **wprost**: `docs/NAPRAWY-PO-AUDYCIE.md:114` — „**NIE RUSZAMY (decyzja)** — treść prawna właściciela, wymaga prawnika. Pozycja »przed pierwszym klientem«. To jedyna z 33 usterek bez naprawy w kodzie" (potwierdza to linia 190). Zasięg dziś **ten sam**: `/polityka-prywatnosci/` 3 frazy wypierające się cookies, `/polityka-cookies/` 5 (w tym „w pełni statyczna", „nie zapisuje"), `/portfolio/automatic-ai/` 2 („pełna statyka", „zero backendu"), `/blog/` 1 („bez zewnętrznych usług i cookies"); **wszystkie cztery ładują `assets/pomiar.js`** (po 3 trafienia w HTML). Sprzeczność żywa. |
| `REA-PRIV-F1-002` | NAPRAWIONE (ryzyko usunięte) | **TAK** | To samo przełączanie opcji co przy 002. Klasa ryzyka („odpowiedź zależy od wartości opcji") faktycznie zniknęła: przy `0`, `3` i `23` wynik jest bezpieczny. Sam dryf opcji istnieje dalej (dziś `23`) — rola nazywa to poprawnie. |

### Ocena rund regresji `PRIV-R1…R6`, `PRIV-90`

- **`PRIV-R1` — ZAWYŻONA.** „TAK (5/5)" nie utrzymuje się: dla `AUD-PRIV-F1-001` odtworzenie
  daje wynik **przeciwny** do werdyktu roli. Prawidłowa odpowiedź to 4/5.
- **`PRIV-R2` — POTWIERDZAM.** `grep -rn "bezpieczny_login(" wordpress/` → 1 definicja
  + 1 wywołanie (`logowania.php:230`) + 1 wzmianka w komentarzu. Liczba policzona, nie oszacowana.
- **`PRIV-R3` — CZĘŚCIOWO BŁĘDNA.** „wpływ zniknął" jest nieprawdą dla 001: wpływ z pola `wplyw`
  zgłoszenia („trzy pierwsze znaki hasła zapisane jawnym tekstem na 90 dni") realizuje się dziś
  dla każdego hasła alfanumerycznego.
- **`PRIV-R4` — bez zastrzeżeń** (granica wobec SEC postawiona poprawnie).
- **`PRIV-R5` — POTWIERDZAM.** `DESCRIBE wp_aai_monitor_wizyty` → `id odslona sesja sciezka
  bramka wejscie trwanie_ms` — ani jednej kolumny łączącej z kontem, zgodnie z deklaracją.
- **`PRIV-R6` — ODRZUCAM.** Odpowiedź „TAK, zgodne — po naprawach" jest sprzeczna z pomiarem
  (patrz powód odrzucenia). To pozycja, która miała złapać dokładnie tę klasę.
- **`PRIV-90` — obserwacja o 62 plikach zamiast 60 jest uczciwa i słusznie niezgłoszona.**

Dowody rund są **zapisem**, nie deklaracją — to rola zrobiła dobrze (POST/curl/`wp eval`/`DESCRIBE`).
Wada nie leży w metodzie, tylko w **doborze wartości testowej**: pomiar był żywy, ale ominął
przypadek, o którym zgłoszenie mówiło wprost.

### Czego rola nie sprawdziła, a powinna

1. **Dosłownej wartości z pierwotnego zgłoszenia** (`PRIVAUDYT_TajneHaslo123`). Zgłoszenie podaje
   ją jako swój dowód; naprawa musi być mierzona na niej, zanim wolno sięgnąć po własny wariant.
   Wybór wartości ze znakiem `#` pokazał gałąź, która działa, i przemilczał tę, która nie.
2. **Drugiego punktu wejścia — formularza konta WooCommerce.** `/moje-konto/` nie istnieje (404),
   ale `/my-account/` **owszem**: `POST` z `username=WooKrytyk_TajneHaslo456` i poprawnym
   `woocommerce-login-nonce` zapisał wiersz id 392, `login = "Woo…(23 znaków)"`. To druga, realna
   powierzchnia tej samej usterki — i to ta, którą widzi **klient**, nie administrator.
3. **Drugiej połowy tego samego akapitu polityki.** Rola sprawdziła zgodność deklaracji o `agent`,
   ale nie skonfrontowała sąsiedniego zdania „Nie zapisujemy haseł ani ich fragmentów" z własnym
   pomiarem z wiersza 001 — mimo że oba zdania stoją w jednym `__()` w `prywatnosc.php:91`.
4. **Zasięgu `REA-PRIV-F1-001` na wszystkich czterech stronach.** Dowód roli cytuje wyłącznie
   `/polityka-cookies/`, a wniosek („żadna z 4 stron nie zmieniona") obejmuje cztery. Pozostałe
   trzy sprawdziłem — wniosek się broni, ale nie na dowodzie roli.

### Stan środowiska (mój ślad)

| Licznik | Przed | Po sprzątaniu |
|---|---|---|
| `wp_aai_monitor_logowania` (wierszy / AI) | 26 / 385 | **26** / 393 |
| `wp_aai_monitor_wizyty` | 30 / 242 | 30 / 242 |
| `wp_woocommerce_sessions` | 366 / 576 | **366** / 582 |
| `wp_aai_platnosci_dostawy` / `_powiazania` | 6 / 2 | 6 / 2 |
| `wp_page_for_privacy_policy` | 23 | **23** (przywrócona po testach `0` i `3`) |
| Media (plików / bajtów) | 1343 / 31 888 625 | 1343 / 31 888 625 |
| `uploads/wc-logs/*` | 0 plików | **0 plików** |

Skasowane jawną listą ID: logowania `385,386,387,388,389,390,391,392` (`Rows affected: 8`),
sesje Woo `576,578,580` (`Rows affected: 3`). Dane właściciela z T4 (26 logowań / 30 wizyt)
**nietknięte** — `MAX(id)` wrócił do `277`, jak przed moją pracą. `AUTO_INCREMENT` obu tabel
urósł nieodwracalnie (kasowanie wierszy go nie cofa) i przez to `skrot_tabel` migawki różni się
od bazowego (`f8fd841d…` → `c66a3d87…`) — ujawniam, bo licznik jest częścią skrótu.
Tor B (`:8894`, `aai_wp_b_*`) nietknięty, `postaw.sh` nieuruchamiany. Kody wyjścia mierzone
bez potoku: `srodowisko.mjs --liczniki` → `0` (dwa razy), `wp db query` → `0` (każdorazowo).
