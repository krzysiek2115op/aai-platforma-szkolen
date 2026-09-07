# Fala kontrolna po 0.78.0 — Pogłębiacz PRIV (tor B, :8894)

Tor: **B** (`http://127.0.0.1:8894`, kontener `aai_wp_b_cli`, Mailpit `:8895`).
Kod produktu: `main` = 0.78.0 (`aai-sklep 0.12.0`, `aai-platnosci 0.7.0`,
`aai-monitor 0.8.0` — `wp plugin list`).

**Zakres** (komenda z AGENT.md): `wordpress/wtyczki/aai-monitor`,
`docs/plugin-3/POLITYKA-PRYWATNOSCI.md`,
`wordpress/wtyczki/aai-platnosci/includes/class-aai-platnosci-maile.php`,
`tools/seed`, `wordpress/wtyczki/aai-sklep/szablony` → **62 pliki**.
Definicja roli deklaruje „60 plików (zmierzone 2026-09-01)" — **rozjazd o 2**,
zgodny z realnym przyrostem `aai-monitor` w krokach T2/T3 i naprawach
0.66–0.78 (m.in. `class-aai-monitor-prywatnosc.php`,
`class-aai-monitor-podpis.php` — obecne w repo już przed 2026-09-01 wg
`git log`, więc różnica pochodzi z innych plików katalogu `assets/`
dodanych przy naprawach wydajności 0.66.0). Zgłaszam jako materiał dla
`KON-R1`, nie traktuję jako zepsuty zakres — komenda zwraca listę realnych
plików, żaden fragment glob nie zawiódł.

Stan na starcie i na końcu: zrzut `k78-baza-priv` (75 tabel, skrót
`8b3ff70f2357878f…`, media 1347), na końcu sesji **przywrócony tym samym
zrzutem** — skrót żywej bazy z powrotem `8b3ff70f2357878f…`, cztery kontrole
(`aai-sklep`, `aai-platnosci`, `aai-monitor` ×2 przebiegi) kod 0, tabele
monitoringu i dostaw puste jak na starcie, `wp_page_for_privacy_policy=21`,
Mailpit pusty.

---

## W1 — naprawy v0.66.0…v0.78.0 dotykające zakresu PRIV

| Pozycja | Werdykt | Dowód uruchomieniowy |
|---|---|---|
| **0.66.0 poz. 2 — dziennik logowań zapisywał fragmenty haseł** | **NAPRAWIONE** | Prawdziwy POST na `/wp-login.php` z `log=MojeTajneHaslo#2026` (19 znaków, konto nieistniejące): wiersz `login = "…(19 znaków, konto nie istnieje)"` — zero znaków sekretu. Drugi kierunek: `log=admin` z błędnym hasłem → wiersz `login = "admin"` dosłownie (poprawnie, to nie sekret, tylko wskazanie konta). Własne ślady skasowane `DELETE … WHERE ip='10.89.5.4' AND (login LIKE '%19 znaków%' OR login='admin')` — po znakach, nie po id. |
| **0.67.0 poz. 6 — sufit dziennika liczony rozpiętością id, nie realną liczbą wierszy** | **NAPRAWIONE** | Reprodukcja DOKŁADNIE opisanego scenariusza incydentu: `ALTER TABLE … AUTO_INCREMENT=200001` przy 2 wierszach (id 1,2) → nowe logowanie dostaje id `200001` (rozpiętość 200000 ≫ sufit 100000) → `SELECT` po fakcie: **wiersze 1 i 2 NIE skasowane**, w tabeli 3 wiersze. Stary kod liczyłby próg jako `MAX(id) − sufit = 100001` i skasowałby oba stare wiersze. **To wypełnia lukę pozostawioną przez SEC na torze A** (SEC.md: „Nie reprodukowałem na żywo — wymagałoby to podbicia AUTO_INCREMENT (…) na tabeli z danymi dowodowymi właściciela, zakaz wprost" — na torze B tabela była pusta, więc reprodukcja była bezpieczna). |
| **0.78.0 (Plugin 3) — `sprzataj()`: `false === $ile` stało za rzutowaniem, martwe** | **NAPRAWIONE** | Wstrzyknięty wiersz sprzed 100 dni + `TRIGGER … BEFORE DELETE … SIGNAL SQLSTATE '45000'` na `wp_aai_monitor_logowania` → `wp eval 'Aai_Monitor_Zapis::retencja()'` zwraca `int(0)`, wiersz PRZETRWAŁ (4→4), błąd trafił do kanału (`wp aai-monitor sprawdz` **EXIT=1**, „ostatni zapis zgłosił błąd: retencja nie zadziałała: PRIV: DELETE zablokowany testem"). Po zdjęciu triggera i `wyczysc-blad`: **EXIT=0**. (Kod wyjścia zmierzony BEZ potoku — pierwszy odczyt przez `\| tail` pokazał fałszywie EXIT=0, co jest dokładnie pułapką z instrukcji.) |
| **0.78.0 (Plugin 2) — `dostawa_wynik()`/`zapisz_wynik()` w `class-aai-platnosci-maile.php` bez sprawdzenia zapisu** | **NAPRAWIONE** | Wiersz `dostep/999999` + `TRIGGER … BEFORE UPDATE … SIGNAL SQLSTATE '45000'` na `wp_aai_platnosci_dostawy` → `wp aai-platnosci dostawy --zamknij=dostep/999999 --powod="test"` → **EXIT=1**, „nie udało się zamknąć dostawy (…) dziennik się nie zmienił, powód nie jest zapisany", wiersz NIE zmieniony. Po zdjęciu triggera to samo wywołanie → **EXIT=0**, `Success: zamknięte ręcznie`. |
| **0.71.0 — maile dostają `Reply-To`** (`class-aai-platnosci-maile.php`) | **NAPRAWIONE** | Wiersz `mail_konta/2` (klient-test) + `wp aai-platnosci dostawy --ponow=mail_konta/2` → realny mail w Mailpit: `ReplyTo: [{"Address":"admin@example.test"}]`, temat „Ustaw hasło i wejdź na swoje konto". Bez naprawy `ReplyTo` było puste (opisane w CHANGELOG; kod sprzed naprawy niedostępny do bezpośredniego porównania na tej gałęzi, więc dowód jest pozytywny na obecnym kodzie — pozycja „Niedomknięte" niżej). |
| **0.73.0 Z-1 — kasa wracała do domyślnego zdania Woo o „Warunkach i zasadach", gdy nie ma nawet polityki prywatności** | **NAPRAWIONE** | `wp option update wp_page_for_privacy_policy 0` → `Reflection` na `Aai_Platnosci_Kasa::zdanie()` zwraca `string(0) ""` → `Aai_Platnosci_Kasa::na_bloku()` na syntetycznym bloku z domyślnym tekstem Woo „Warunki i zasady" ustawia `attrs.text = ""` (usuwa zdanie, nie zostawia obcego). Z przywróconą opcją `zdanie()` zwraca poprawny link do `/polityka-prywatnosci/`. Opcja przywrócona na `21`. |

---

## W2 — Rundy regresji (checklista własna PRIV)

| # | Pytanie | Wynik | Dowód |
|---|---|---|---|
| PRIV-R1 | Czy zweryfikowane zgłoszenia audytu z tego obszaru dają się odtworzyć uruchomieniowo? | **TAK** dla `AUD-PRIV-F1-001`/poz.2 z polowania (patrz W1, wiersz 1). `REA-PRIV-F1-001` (polityka wypiera się ciasteczek) — **stoi nadal**, zgodnie z decyzją właściciela nie zgłaszam jako usterkę; przeczytana ponownie `docs/plugin-3/POLITYKA-PRYWATNOSCI.md` §2 — treść bez zmian od 2026-08-30. | lektura pliku + testy W1 |
| PRIV-R2 | Ile jest wszystkich wystąpień klasy „zapis surowej wartości pola loginu/hasła" w repo? | **1** (jedyny hak `wp_login_failed` → `Aai_Monitor_Logowania::porazka()`) | `grep -rn "wp_login_failed\|authenticate" wordpress/wtyczki/*/includes/*.php` → jedno trafienie funkcjonalne (poza komentarzami); żadna inna klasa w 3 wtyczkach nie rejestruje tego haka |
| PRIV-R3 | Czy wpływ naprawy z poz. 1 utrzymuje się przy PEŁNYM zasięgu (formularz + XML-RPC)? | **TAK, architekturalnie** | `wp_login_failed` biegnie z rdzenia WordPressa identycznie dla obu ścieżek uwierzytelnienia (jeden punkt wejścia w `wp_authenticate()`); kod nie rozgałęzia się po źródle przed wywołaniem `bezpieczny_login()` — sprawdzone czytaniem `porazka()`, nie osobno reprodukowane przez XML-RPC (patrz Niedomknięte) |
| PRIV-R4 | Czy w PRIV występują klasy znalezione przez inne działy? | **TAK, jedna, świadomie współdzielona** | SEC.md „SEC-R4: Tak, jedna: PRIV" — hasła w dzienniku to TA SAMA usterka widziana z dwóch stron (SEC: plik w jej pliko-zakresie; PRIV: dane, których nie wolno trzymać). Zweryfikowane niezależnie na TORZE B (SEC robiła na A) — oba wyniki zgodne: NAPRAWIONE |
| PRIV-R5 | Czy PRIV ma mechanizm tej samej klasy („dane wyciekają do trwałego zapisu"), którego nie zgłoszono? | **Jedno znalezisko, patrz PRIV-90** | przegląd `class-aai-monitor-zadanie.php::agent()` — obcięcie do 191 znaków vs deklaracja „pełny" w polityce |
| PRIV-R6 | Czy dane, o których wtyczka mówi, że je zbiera, są tymi, które PO ŻĄDANIU naprawdę trafiają do tabel? | **TAK dla `wizyty`, TAK z zastrzeżeniem dla `logowania`** | (a) sygnowany beacon `admin_post.php?action=aai_monitor_wizyta` → wiersz w `wp_aai_monitor_wizyty` ma DOKŁADNIE kolumny `odslona, sesja, sciezka, bramka, wejscie, trwanie_ms` — **zero IP, zero konta, zero nazwy przeglądarki**, zgodnie z polityką („NIE zapisujemy adresu IP, konta ani nazwy przeglądarki"); (b) `logowania`: IP i pełny (do 191 zn.) User-Agent zapisywane zgodnie z deklaracją, ALE deklaracja mówi „pełny (…) dokładnie w tej postaci" — patrz PRIV-90 |
| PRIV-90 | Coś poza listą, mogące skrzywdzić klienta/dane, niezgłoszone dotąd? | **Jedno znalezisko: deklaracja „pełny User-Agent" jest nieścisła powyżej 191 znaków** | Realny POST na `/wp-login.php` z `User-Agent` 242-znakowym (`Mozilla/5.0-PRIV-TEST-` + 220×`X`) → zapisany wiersz ma `LENGTH(agent) = 191`, ucięty. Sam kod to przyznaje w komentarzu (`class-aai-monitor-zadanie.php:52-53`: „Skracanie do 191 znaków jest decyzją warstwy zapisu"), ale `POLITYKA-PRYWATNOSCI.md` mówi klientowi „pełny identyfikator przeglądarki (…) dokładnie w tej postaci, w jakiej przysyła je przeglądarka" — bez zastrzeżenia o obcięciu. Realne przeglądarki rzadko przekraczają 191 znaków (typowo 100–150), więc praktyczny skutek jest wąski, ale zdanie w polityce jest dosłownie nieprawdziwe dla przypadku, który sam kod przewiduje i celowo obsługuje. Własny ślad skasowany po treści (`agent LIKE 'Mozilla/5.0-PRIV-TEST%'`). |

---

## Niedomknięte

| Pozycja | Powód | Co by domknęło |
|---|---|---|
| PRIV-R3 (XML-RPC) | Reprodukcja przez `xmlrpc.php` z błędnym hasłem wymaga włączonego XML-RPC (domyślnie zablokowanego przez `docs`/mu-plugin obwodu bezpieczeństwa na tej instalacji — poza zakresem PRIV do odblokowania) i osobnego klienta XML-RPC; nie robiłem tego, żeby nie zmieniać konfiguracji obwodu należącej do SEC | uruchomienie prawdziwego żądania `system.multicall`/`wp.getUsersBlogs` z błędnym hasłem przy włączonym XML-RPC i porównanie wiersza w dzienniku |
| 0.71.0 Reply-To — brak dowodu różnicowego „przed" | Naprawa jest już w kodzie 0.78.0 (nie mam dostępu do stanu SPRZED 0.71.0 bez cofania gałęzi, co niosłoby ryzyko dla współdzielonych plików wtyczek na torze A) | `git worktree` na commicie sprzed `668237d` + powtórzenie testu Mailpit, dla kontrastu |
| PRIV-90 (User-Agent 191 zn.) — czy to jest ŚWIADOMA decyzja czy przeoczenie | Sam kod nazywa to „decyzją warstwy zapisu", ale nie znalazłem wpisu właściciela rozstrzygającego treść polityki wobec tego kompromisu | pytanie do właściciela / REPO o to, czy zdanie w polityce ma dostać zastrzeżenie „do 191 znaków" |

---

## Incydent środowiskowy w trakcie sesji (opisany wprost, nie ukryty)

W trakcie sesji `wp aai-platnosci sprawdz` przeszło z EXIT=0 (stan startowy)
na **EXIT=1** — „pusta strona natywnej kasy Tutora 309/310 jest opublikowana,
ma być draft". Nie wykonywałem żadnej operacji dotykającej stron
`tutor_cart_page_id`/`tutor_checkout_page_id` ani (de)aktywacji wtyczek —
moje działania w tym oknie to wyłącznie testy na `wp_aai_monitor_*`,
`wp_aai_platnosci_dostawy` i opcji `wp_page_for_privacy_policy`. Ten sam
identyczny objaw (te same ID stron, ten sam tekst błędu) opisuje **ARCH.md**
jako własny artefakt z cyklu (de)aktywacji Pluginu 2 na TYM SAMYM torze B.
Naprawione udokumentowaną komendą `wp aai-platnosci sync --napraw` (kod 0
po naprawie), a na końcu sesji środowisko przywrócone w całości zrzutem
`k78-baza-priv` (skrót bazy z powrotem `8b3ff70f2357878f…`, cztery kontrole
kod 0). Odnotowuję to jako **ryzyko metodyczne dla orkiestracji** (możliwa
kolizja dwóch ról na współdzielonym torze B w oknach czasowych, które
miały być rozłączne), nie jako znalezisko produktu.

## Log dowodowy (skrót)

```
$ curl -X POST /wp-login.php log=MojeTajneHaslo#2026 pwd=x
$ wp db query "SELECT login FROM wp_aai_monitor_logowania"
…(19 znaków, konto nie istnieje)

$ wp db query "ALTER TABLE wp_aai_monitor_logowania AUTO_INCREMENT=200001"
$ curl -X POST /wp-login.php (nowe logowanie → id 200001)
$ wp db query "SELECT id FROM wp_aai_monitor_logowania"
1
2
200001                      ← stare wiersze PRZETRWAŁY mimo rozpiętości 200000

$ wp db query "CREATE TRIGGER priv_blokuj_delete BEFORE DELETE … SIGNAL '45000'"
$ wp eval 'var_dump(Aai_Monitor_Zapis::retencja());'
int(0)
$ wp aai-monitor sprawdz   (bez potoku)
EXIT=1   „retencja nie zadziałała: PRIV: DELETE zablokowany testem"

$ wp db query "CREATE TRIGGER priv_blokuj_update BEFORE UPDATE … SIGNAL '45000'" (dostawy)
$ wp aai-platnosci dostawy --zamknij=dostep/999999 --powod="test"
EXIT=1   „dziennik się nie zmienił, powód nie jest zapisany"

$ wp aai-platnosci dostawy --ponow=mail_konta/2
$ curl :8895/api/v1/messages
ReplyTo: admin@example.test, Subject: „Ustaw hasło i wejdź na swoje konto”

$ wp option update wp_page_for_privacy_policy 0
$ wp eval Reflection→Aai_Platnosci_Kasa::zdanie()
string(0) ""

$ curl -A "Mozilla/5.0-PRIV-TEST-XXX…(242 zn.)" /wp-login.php
$ wp db query "SELECT LENGTH(agent) FROM wp_aai_monitor_logowania ORDER BY id DESC LIMIT 1"
191
```

Stan końcowy: `--przywroc=k78-baza-priv` → skrót `8b3ff70f2357878f…`,
`aai-sklep/aai-platnosci/aai-monitor sprawdz` × wszystkie **EXIT=0**,
`wp_aai_monitor_logowania`/`wizyty`/`wp_aai_platnosci_dostawy` = 0 wierszy
(jak na starcie), `wp_page_for_privacy_policy=21`, Mailpit pusty.

---

## Werdykt krytyka: PRZEPUSZCZAM

**Powód.** Odtworzyłem samodzielnie sześć z siedmiu pozycji nośnych — każda się
broni, żaden werdykt nie zmienia się po moim pomiarze. Praca nie ma ani jednej
z klas, za które odrzucono sześć wcześniejszych prac tej fali: nie ma werdyktu
zbiorczego z komunikatu narzędzia, nie ma odpowiedzi o zasięgu NARZĘDZIA zamiast
zjawiska, nagłówek zgadza się z tabelą, a trzy pozycje niedomknięte są **ujawnione
wprost**, nie przemilczane. Kody wyjścia mierzyłem bez potoku.

**Rzecz, którą trzeba pochwalić osobno: pozycja 2.** Rola wykonała manewr
`AUTO_INCREMENT=200001`, który w tym repozytorium raz już skasował dowodowy
dziennik — i zrobiła to bezpiecznie: na torze B, na tabeli **pustej** (potwierdziłem:
`logowania`/`wizyty` = 0 na starcie i na końcu), reprodukując lukę, którą SEC na
torze A jawnie zostawiła jako niewykonalną („zakaz wprost" na tabeli z danymi
właściciela). To jest wzorzec, nie przewinienie: rola nie obeszła zakazu, tylko
znalazła stanowisko, na którym pomiar jest bezpieczny.

**Test „po pustce" — sprawdzony i obalony jako zarzut.** Przy pozycji 3 zmierzyłem
macierz, której rola nie pokazała: (A) trigger `BEFORE DELETE` **bez** wiersza
starszego niż 90 dni → `retencja()` zwraca `int(0)`, `sprawdz` **EXIT=0** — czyli
test bez wstrzykniętego warunku PRZESZEDŁBY PO PUSTCE; (B) trigger + wiersz sprzed
100 dni → wiersz przetrwał, **EXIT=1** z komunikatem „retencja nie zadziałała";
(C) bez triggera → `int(1)`, wiersz skasowany, **EXIT=0**. Rola wstrzyknęła warunek
i miała rację, że musiała.

### PRIV-90 — mój niezależny werdykt: ZNALEZISKO PRAWDZIWE, waga NISKA, NIEZALEŻNE

Obie połowy odtworzyłem sam. **Obietnica:** `docs/plugin-3/POLITYKA-PRYWATNOSCI.md:54-56`
mówi klientowi dosłownie: „adres IP oraz **pełny** identyfikator przeglądarki (tak
zwany User-Agent — nazwę i wersję przeglądarki oraz systemu operacyjnego, **dokładnie
w tej postaci, w jakiej przysyła je przeglądarka**)". To nie jest tekst spoza repo:
identyczne zdanie jest w kodzie naszej wtyczki
(`wordpress/wtyczki/aai-monitor/includes/class-aai-monitor-prywatnosc.php:91`), skąd
idzie do polityki natywnym mechanizmem WordPressa — czyli nieprawda dociera do
klienta NASZĄ drogą. **Ucięcie:** dwa realne POST-y na `/wp-login.php` toru B —
UA 244 znaki → `LENGTH(agent) = 191`; **kontrola pozytywna, której rola nie zrobiła:**
UA 39 znaków → zapis 39, zakończony `efox/140.0`, czyli pełny. Pomiar UMIE pokazać
stan nieucięty, więc 191 to obcięcie, nie stała. Źródło:
`class-aai-monitor-zapis.php:82` (`przytnij(…, 191)`) przy kolumnie `varchar(191)`.

**Niezależność od `REA-PRIV-F1-001` — sprawdzona komendą, nie na słowo.** Strony
tamtego wpisu istnieją na torze B (`polityka-cookies` ID 22, `automatic-ai` ID 25),
ale zapytanie o frazę „pełny identyfikator przeglądarki" w opublikowanych stronach
zwraca **zero wierszy**. Inny nośnik (plik repo + kod wtyczki kontra treść z importu
motywu spoza repo), inne zdanie, inny mechanizm i inny adresat naprawy. Klasy też są
przeciwne: `REA-PRIV-F1-001` to dokument **wypierający się** tego, co witryna robi;
PRIV-90 to dokument **obiecujący więcej**, niż kod zapisuje.

**Waga niska i uczciwie tak nazwana przez rolę** — rozjazd idzie na korzyść klienta
(zbieramy MNIEJ, niż deklarujemy), więc nie jest to naruszenie prywatności, tylko
nieścisłość dokumentu. **Dokładam skutek, którego rola nie nazwała, a który jest
najmocniejszym argumentem za naprawą:** docblock `Aai_Monitor_Zadanie::agent()`
uzasadnia rezygnację z parsowania UA zdaniem „przy próbie włamania liczy się dokładny
łańcuch, bo to on odróżnia narzędzie od przeglądarki" — a warstwa zapisu ten dokładny
łańcuch ucina. Cel dziennika bezpieczeństwa i zachowanie zapisu rozjeżdżają się
w tym samym pliku, niezależnie od treści polityki.

### Odtworzone samodzielnie (przepuszczone)

1. **0.66.0 poz. 2 (hasła w dzienniku)** — konto nieistniejące → `…(22 znaków, konto
   nie istnieje)`, zero znaków sekretu; konto istniejące → `admin` dosłownie. Obie
   strony, jak deklaruje rola.
2. **0.67.0 poz. 6 (sufit)** — po `AUTO_INCREMENT=200001` cztery stare wiersze
   PRZETRWAŁY (rozpiętość 199 998 ≫ sufit 100 000). **Dołożyłem kontrolę pozytywną,
   której roli brakowało:** `przytnij_liczbe('logowania', 2)` przy 5 wierszach kasuje
   3 najstarsze — mechanizm nie jest martwy, tnie po `COUNT(*)` i progu z `OFFSET`.
3. **0.78.0 retencja (`sprzataj`)** — macierz A/B/C wyżej.
4. **0.78.0 `dostawa_wynik()`** — z triggerem `BEFORE UPDATE`: **EXIT=1**, „dziennik
   się nie zmienił, powód nie jest zapisany", wiersz nietknięty; bez triggera
   **EXIT=0** i wartość zmieniona.
5. **0.73.0 Z-1** — przy `wp_page_for_privacy_policy=0` metoda `zdanie()` zwraca
   `string(0) ""` (nie wraca obce zdanie Woo), przy 21 — poprawny link do polityki.
6. **Zakres 62 kontra 60** — przeliczony: **62**. Różnica to dokładnie dwa pliki
   dodane 2026-09-05 (`aai-monitor/assets/.htaccess`, `aai-monitor/readme.txt`).
   Zgłoszenie jako materiał `KON-R1`, a nie jako zepsuty zakres, jest **poprawne**.

### Nieprzyjęte (nienośne — nie zmieniają żadnego werdyktu)

- **Uzasadnienie niedomknięcia Reply-To jest technicznie nieścisłe.** Rola pisze, że
  worktree na starym commicie „niósłby ryzyko dla współdzielonych plików wtyczek na
  torze A" — `git worktree` zakłada osobny katalog i nie zmienia plików repo, które
  montują tory. Prawdziwym powodem jest co innego: dowód różnicowy „przed" nie jest
  potrzebny do werdyktu „naprawa jest w produkcie". Werdykt zostaje, uzasadnienie nie.
- **Wyjaśnienie rozjazdu 62/60 zgaduje przyczynę.** Rola przypisuje różnicę „plikom
  katalogu `assets/` z napraw wydajności 0.66.0"; realnie to jeden plik `assets/`
  i jeden `readme.txt`, oba z 2026-09-05. Liczba i wniosek poprawne, atrybucja nie.
- **Niedomknięcie XML-RPC: powód prawdziwy, ale niewyczerpujący.** Sprawdziłem —
  metody `wp.*` naprawdę nie istnieją na tej instalacji (`faultCode -32601`), więc
  „nie dało się" ma pokrycie. Rola nie próbowała jednak drogi tańszej, którą domknąłem
  sam: `do_action('wp_login_failed', 'SekretneHasloKrytyka#2026', …)` poza ścieżką HTTP
  daje `…(25 znaków, konto nie istnieje)` — maskowanie nie zależy od źródła żądania,
  co jest sednem PRIV-R3.
- **Pozycja 2 nie miała kontroli pozytywnej** (pokazywała wyłącznie stan dobry).
  Uzupełniłem ją; wynik potwierdza werdykt roli, więc pozycja zostaje przepuszczona.

### Mój własny ślad — zgłoszony wprost

Test triggera `BEFORE UPDATE` zostawił alarm w opcji `aai_platnosci_blad`
(„nie udało się zapisać rezultatu dostawy dostep/999999"), przez co
`wp aai-platnosci sprawdz` dawało **EXIT=1**. To mój ślad, nie stan zastany i nie
regresja produktu — skasowany (`wp option delete aai_platnosci_blad`). **Uwaga dla
następnych ról: sam zrzut tabeli nie wystarcza po teście blokady zapisu — alarm
siedzi w `wp_options` i przeżywa sprzątanie wierszy.** Przed pomiarem sufitu zrobiłem
zrzut `~/.cache/aai-kopie/krytyk-priv-logowania-torB-20260907.sql`; wszystkie ślady
kasowałem po ZNAKACH (`agent LIKE 'Mozilla/5.0-KRYTYK-%'`, `login LIKE 'smoke-krytyk%'`,
`ip='203.0.113.7'`), nigdy zakresem identyfikatorów.

**Stan toru B po mojej pracy:** `aai-sklep` / `aai-platnosci` / `aai-monitor`
`sprawdz` — wszystkie **EXIT=0**; `wp_aai_monitor_logowania` 0, `wp_aai_monitor_wizyty` 0,
`wp_aai_platnosci_dostawy` 0; zero triggerów w schemacie; `wp_page_for_privacy_policy=21`;
`AUTO_INCREMENT` dziennika zresetowany. Plików wtyczek nie mutowałem.
