# Sektor AUDYT — 19 ról (szkic E2)

**Etap E2 planu budowy.** Ten plik ustala, **kto istnieje, po co, jaki ma mechaniczny
zakres i jaką checklistę**. Rozwinięcie każdej roli w komplet `AGENT.md` / `KRYTYK.md` /
`SKILL.md` / golden należy do E5 — tu jest szkic, nie definicja wykonawcza.

Granice między działami: [`GRANICE.md`](GRANICE.md). Zasady i rozstrzygnięcia:
[`REGULAMIN.md`](REGULAMIN.md). Plan całości: [`PLAN-BUDOWY.md`](PLAN-BUDOWY.md).

---

## Model zakresu — rozstrzygnięcie właściciela (2026-09-01)

**Wariant „plik × pytanie".** Listy plików działów **nakładają się**; wyłączna jest
**checklista pytań**. Tabela granic przypisuje **znaleziska**, nie pliki.

Powód jest mierzalny, nie estetyczny: `class-aai-sklep-zapis.php` ma 1099 linii i mieszczą
się w nim trzy rozłączne pytania — „czy zapis idzie przez warstwę zapisu" (Backend), „czy
`$wpdb` dostaje literał z `prepare`" (Baza danych) i „czy handler sprawdza nonce
i uprawnienie" (Security). Przy rozłącznym podziale plików ten plik należałby do jednego
działu, a pozostałe dwa pytania nie zostałyby zadane nigdy. Wyciek 73 lekcji przez
`?post_type=lesson` (test całości, 0.59.0) siedział dokładnie w takim miejscu: znalezisko
Security w pliku, który po nazwie należy do integracji z Tutorem.

**Konsekwencja dla `mapa.mjs` (E4):** plik jest pokryty, gdy bierze go **co najmniej
jeden** dział. Sierota = plik, którego nie bierze **nikt**.

---

## Jak czytać zakres

Zakres każdego działu jest **komendą**, nie opisem. Komenda ma dawać podaną liczbę plików —
to jest jej test. Zakres, który daje zero, jest zepsuty i przechodzi po pustce.

**Dwie pułapki `git ls-files`, obie złapane przy pisaniu tego pliku — nie powtarzać:**

1. **Bez `:(glob)` gwiazdka przechodzi przez `/`.** `'wordpress/wtyczki/*/*.php'` daje
   **107** plików (całe drzewo), a nie 9 plików głównych wtyczek. Zakres wygląda wtedy na
   precyzyjny, a nie ogranicza niczego.
2. **Z `:(glob)` pojedyncza gwiazdka zatrzymuje się na `/`** i gubi zagnieżdżone pliki —
   `':(glob)…/szablony/*.php'` widzi 0 z 37 szablonów, bo leżą w `szablony/czesci/`.
   Do rekursji używamy **ścieżki katalogu**, nie globu.

Wniosek dla E4 i E5: **każdy nowy zakres liczymy komendą**, nigdy nie ufamy wzorcowi.

---

## Rachunek pokrycia — zmierzony 2026-09-01

| | Plików |
|---|---|
| W repo (`git ls-files`) | **921** |
| Przypisane do ≥1 działu (unia zakresów) | **522** |
| Świadomie wykluczone (D4) | **399** |
| **Sieroty** | **0** |
| Pliki jednocześnie przypisane i wykluczone | **0** |

522 + 399 = 921. Suma zamyka się co do pliku.

**Wykluczone (D4 — kursy poza zakresem):** `tresc-kursow` (331) oraz
`docs/dokumentacja-techniczna` bez plików `ZRODLA.md` (68) — pobrana cudza dokumentacja
i cytaty źródłowe do lekcji. **`ZRODLA.md` NIE są wykluczone** — deklarują, co i dlaczego
pobrano, więc są dokumentem prawdy repo i bierze je dział REPO.

> **Znalezisko z samego rachunku (E2).** Pierwszy przelot zostawił **45 plików bez
> właściciela** — w tym oba dokumenty samego sektora, siedem zrzutów instrukcji instalacji
> i sześć plików konfiguracyjnych z korzenia. Drugi przelot pokazał **6 plików
> jednocześnie przypisanych i wykluczonych**. Obie rzeczy są niewidoczne bez policzenia
> sumy i obie rozjeżdżałyby drugą falę: plik niczyj nie zostaje przeczytany, a plik
> o dwóch stanach bywa przeczytany raz i pominięty raz.

---

# CZĘŚĆ I — 14 DZIAŁÓW

Wszystkie działy: **model Sonnet** (D8), **krytyk na Opusie** (D3), narzędzia
**Read · Grep · Glob · Bash (tylko odczyt)**, **bez `Write` i bez `Edit`** (K3: to
ograniczenie, nie gwarancja — gwarancją jest `git diff` i migawka po fakcie).
Każdy dział jest **agentem pętlowym** (W3): kończy, gdy przeszedł **całą** checklistę.

---

## SEC — Security

**Po co.** Wejścia do systemu i to, co się za nimi dzieje: uwierzytelnienie, uprawnienie,
uciekanie danych, SQL, obwód instalacji.

**Zakres — 113 plików**
```
git ls-files -- ':(glob)wordpress/wtyczki/*/includes/*.php' \
  ':(glob)wordpress/wtyczki/*/*.php' 'wordpress/wtyczki/aai-sklep/szablony' \
  'wordpress/srodowisko/mu-plugins' '.env.example' 'proxy.serwer.ts' \
  'lib/limiter.ts' 'lib/kreator-dostep.ts' 'app/api' '.githooks' '.gitleaksignore'
```

| # | Pytanie (tak/nie) | Komenda / miejsce | Dowód |
|---|---|---|---|
| SEC-01 | Czy każdy handler `admin_post_*` sprawdza nonce **przed** użyciem danych? | `grep -rn "add_action( 'admin_post" wordpress/wtyczki` → dla każdej akcji odczytać ciało | plik:linia akcji + linia `check_admin_referer`/`wp_verify_nonce` albo jej brak |
| SEC-02 | Czy każdy handler sprawdza `current_user_can` właściwym uprawnieniem? | jak wyżej + `grep -n current_user_can` | plik:linia + nazwa uprawnienia |
| SEC-03 | Czy każde `$wpdb->` dostaje **literał** SQL, a zmienne przez `prepare()`? | `grep -rn '\$wpdb->' wordpress/wtyczki` | plik:linia zapytania |
| SEC-04 | Czy każde wyjście do HTML przechodzi przez `esc_*` / `wp_kses`? | `grep -rn 'echo \|<?= ' wordpress/wtyczki/*/szablony` | plik:linia niezabezpieczonego wyjścia |
| SEC-05 | Czy jakakolwiek trasa oddaje treść zza bramki bez sprawdzenia **zapisu** na kurs? | `grep -rn 'register_post_type\|pre_get_posts\|template_include' wordpress/wtyczki` | trasa + brakujące sprawdzenie |
| SEC-06 | Czy każdy typ wpisu ma `public` / `publicly_queryable` / `has_archive` zgodne z zamiarem, bez listy i bez RSS? | `grep -rn "register_post_type_args\|'public'" wordpress/wtyczki` | nazwa typu + wartość flagi |
| SEC-07 | Czy CSP ma jednorazowy nonce i `script-src` bez `unsafe-inline`? | `grep -rn 'Content-Security-Policy' wordpress proxy.serwer.ts tools` | linia nagłówka + treść dyrektywy |
| SEC-08 | Czy limiter ma okno kotwiczone i osobny licznik chybionych uwierzytelnień? | `lib/limiter.ts`, `class-aai-monitor-wizyty.php` | mechanizm + linia |
| SEC-09 | Czy brama kreatora używa porównania stałoczasowego i odrzuca token krótszy niż 24 znaki? | `lib/kreator-dostep.ts`, `modules/m1-sklep/dyspozytor.ts` | linia porównania |
| SEC-10 | Czy `.env.example` nie zawiera prawdziwego sekretu, a `.gitleaksignore` nie wycisza całego pliku? | `cat .env.example .gitleaksignore` | linia wpisu |
| SEC-11 | Czy obwód (`aai-obwod.php`) zamyka XML-RPC, enumerację kont i mapę użytkowników? | `wordpress/srodowisko/mu-plugins/aai-obwod.php` | linia reguły albo nazwa brakującej |
| SEC-12 | Czy `try` obejmuje **wywołanie**, a nie tylko ciało funkcji? (`ArgumentCountError` powstaje przy wywołaniu) | `grep -rn -B2 'catch ( Throwable' wordpress/wtyczki` | plik:linia instrukcji poza `try` |

**Nie bierze:** wydajności zapytań (→ PERF), zgodności z RODO i retencji (→ PRIV), treści
polityki prywatności (→ PRIV), poprawności kontraktu danych (→ BE).

---

## FE — Frontend

**Po co.** To, co widzi klient: 37 szablonów, arkusze i skrypty wtyczek, kolektor panelu,
kaskada i warstwy, dostępność.

**Zakres — 57 plików**
```
git ls-files -- 'wordpress/wtyczki/aai-sklep/szablony' \
  'wordpress/wtyczki/aai-sklep/assets' 'wordpress/wtyczki/aai-monitor/assets' \
  ':(glob)wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-{widok,lekcja,moje,proza,zasoby,menu,trasy,styl-tutora,styl-woo}.php' \
  'wordpress/wtyczki/aai-monitor/includes/class-aai-monitor-ekran.php'
```

| # | Pytanie (tak/nie) | Komenda / miejsce | Dowód |
|---|---|---|---|
| FE-01 | Czy każdy element `position: fixed` jest emitowany **poza** `<main>` motywu? | `grep -rn 'fixed' wordpress/wtyczki/aai-sklep/assets/*.css` + szablony | selektor + miejsce emisji |
| FE-02 | Czy kolektor `panel.js` uznaje **każdy** rekord panelu za granicę zakresu? | `wordpress/wtyczki/aai-sklep/assets/panel.js`, stała `GRANICE_ZAKRESU` | lista granic vs lista rekordów |
| FE-03 | Czy napis przy liczbie mówi, **jakiego okresu** dotyczy? | `class-aai-monitor-ekran.php` | podpis + zakres zapytania |
| FE-04 | Czy każdy obraz ma `width`/`height` (CLS)? | `grep -rn '<img' wordpress/wtyczki/aai-sklep/szablony` | plik:linia obrazu bez wymiarów |
| FE-05 | Czy nasze strony **nie ładują** arkuszy Tutora i Woo? | `class-aai-sklep-zasoby.php` + pomiar odsłony | uchwyt arkusza + trasa |
| FE-06 | Czy nasz szablon sam rezerwuje odstęp pod nagłówek motywu (72 px)? | szablony + `sklep.css` | reguła odstępu albo jej brak |
| FE-07 | Czy jest dokładnie jedna pozycja z `aria-current` w każdej nawigacji? | `class-aai-sklep-menu.php` | linia nadania atrybutu |
| FE-08 | Czy podpisy nie mają podwójnej ucieczki znaków (`&quot;` dosłownie)? | `grep -rn '&amp;quot;\|&quot;' wordpress/wtyczki/aai-sklep` | plik:linia |
| FE-09 | Czy każdy odnośnik w szablonie prowadzi do istniejącej trasy? | szablony × `Aai_Sklep_Trasy::PODSTRONY` | odnośnik + brakująca trasa |
| FE-10 | Czy strona 404 istnieje dla całej witryny, nie tylko dla `/szkolenia/`? | `class-aai-sklep-trasy.php` | reguła + zakres |
| FE-11 | Czy cała ścieżka klienta jest po polsku (koszyk, kasa, konto, komunikaty)? | `npm run smoke:wp-jezyk` + przelot tras | fraza angielska + trasa |

**Nie bierze:** prototypu Next.js (→ PROTO), wagi stron i liczby zapytań (→ PERF), kolizji
kaskady z arkuszami Tutora/Woo (→ INT), escapowania jako luki bezpieczeństwa (→ SEC).

---

## BE — Backend

**Po co.** Trzy warstwy zapisu, haki, kontrakty, cykl żądania — czy kod robi to, co
obiecuje jego własna dokumentacja.

**Zakres — 66 plików**
```
git ls-files -- ':(glob)wordpress/wtyczki/*/includes/*.php' ':(glob)wordpress/wtyczki/*/*.php'
```

| # | Pytanie (tak/nie) | Komenda / miejsce | Dowód |
|---|---|---|---|
| BE-01 | Czy **brak klucza** znaczy „nie ruszaj" dla wszystkich pięciu kluczy (treść, materiały, sekcje, program, stan)? | `class-aai-sklep-zapis.php` | linia odczytu klucza + zachowanie |
| BE-02 | Czy każdy zapis do naszych tabel idzie przez warstwę zapisu? | `grep -rn '\$wpdb->\(insert\|update\|delete\)' wordpress/wtyczki` | plik:linia poza warstwą |
| BE-03 | Czy wczesny `return` nie zostawia obiektu w stanie pośrednim? | metody zmieniające status produktu i kursu | linia `return` + niezakończony stan |
| BE-04 | Czy priorytety haków są jawne tam, gdzie kolejność ma znaczenie? | `grep -rn 'add_action\|add_filter' wordpress/wtyczki` | hak + priorytet |
| BE-05 | Czy callback dopięty do trwającej akcji `shutdown` wykona się? | `grep -rn 'shutdown' wordpress/wtyczki` | linia + sprawdzenie `doing_action` |
| BE-06 | Czy kontrakt odrzuca duplikaty identyfikatorów w jednym zapisie? | `class-aai-sklep-kontrakt.php` | linia sprawdzenia |
| BE-07 | Czy porównanie „czy się zmieniło" ma kanoniczną kolejność kluczy? | `grep -rn 'wp_json_encode\|uporzadkuj' wordpress/wtyczki` | funkcja porządkująca |
| BE-08 | Czy `wp_unslash` jest zastosowane tam, gdzie trzeba, i nie tam, gdzie szkodzi? | `grep -rn 'wp_unslash\|wp_slash' wordpress/wtyczki` | plik:linia |
| BE-09 | Czy każda komenda WP-CLI ma nazwę zgodną z tym, co podaje kontrola? | `grep -rn '@subcommand\|WP_CLI::add_command' wordpress/wtyczki` | nazwa w kodzie vs w komunikacie |
| BE-10 | Czy start wtyczki jest w `try/catch`, tak że brak jednego pliku nie wywala witryny? | pliki główne wtyczek | linia startu |
| BE-11 | Czy funkcja kontroli **nigdy nie pisze**? | `class-*-cli.php`, metoda `sprawdz` | linia zapisu w ścieżce kontroli |
| BE-12 | Czy walidacja stoi po stronie **zapisu**, a nie tylko odczytu? | `class-aai-sklep-kontrakt.php`, `modules/m1-sklep/typy.ts` | pole sprawdzane wyłącznie przy odczycie |
| BE-13 | Czy użyta funkcja rdzenia robi to, co sugeruje jej nazwa? (`wp_http_validate_url` jest od SSRF, nie od odnośników) | `grep -rn 'validate_url\|sanitize_\|wp_kses' wordpress/wtyczki` | wywołanie + skutek uboczny |

**Nie bierze:** SQL jako powierzchni ataku (→ SEC), schematu tabel i migracji (→ BD),
granic między wtyczkami (→ ARCH), zachowania cudzych haków (→ INT).

---

## BD — Baza danych i migracja

**Po co.** Schemat, transakcje, indeksy, idempotencja oraz cała droga danych
Postgres → nasze tabele → Tutor/Woo. Tu mieszka klasa „cicha utrata treści".

**Zakres — 25 plików**
```
git ls-files -- ':(glob)wordpress/wtyczki/*/includes/class-*-{tabele,zapis,import,odczyt,odczyt-panelu}.php' \
  'modules' 'tools/eksport-wp.mjs' 'tools/sprawdz-import-wp.mjs' 'tools/db1-gotowa.mjs' 'tools/seed'
```

| # | Pytanie (tak/nie) | Komenda / miejsce | Dowód |
|---|---|---|---|
| BD-01 | Czy każda operacja wielotabelowa jest w transakcji? | `grep -rn 'START TRANSACTION\|COMMIT\|ROLLBACK' wordpress/wtyczki` | zakres transakcji |
| BD-02 | Czy usuwanie idzie **od dołu** (lekcje → moduły → kurs)? | `class-aai-sklep-zapis.php` | kolejność `DELETE` |
| BD-03 | Czy dopasowanie po `uuid` odrzuca **pusty** uuid? | `grep -rn 'zrodlo_uuid' wordpress/wtyczki` | linia obrony |
| BD-04 | Czy przestawienie pozycji jest dwufazowe (MySQL nie odracza `UNIQUE`)? | `class-aai-sklep-zapis.php` | linie obu faz |
| BD-05 | Czy `ON DUPLICATE KEY UPDATE` nie stoi w tabeli z **więcej niż jednym** kluczem unikalnym? | `grep -rn 'ON DUPLICATE' wordpress/wtyczki` + `class-*-tabele.php` | zapytanie + lista kluczy |
| BD-06 | Czy import jest idempotentny (drugi przebieg 0 zmian)? | `wp aai-sklep import` ×2 | liczby obu przebiegów |
| BD-07 | Czy dziennik audytu zapisuje **tylko realne** zmiany? | `class-*-zapis.php` | linia porównania przed/po |
| BD-08 | Czy porównanie długości używa `CHAR_LENGTH`, nie `LENGTH` (bajty)? | `grep -rn 'LENGTH(' tools wordpress` | zapytanie |
| BD-09 | Czy `dbDelta` dostaje składnię, którą rozumie (spacje, `KEY`)? | `class-*-tabele.php` | definicja tabeli |
| BD-10 | Czy retencja kasuje po **własnym** kluczu, nie po `MIN(id)` całej tabeli? | `class-aai-monitor-zapis.php` | zapytanie kasujące |
| BD-11 | Czy każde pole kontraktu ma sufit długości i liczności? | `modules/m1-sklep/typy.ts`, `class-aai-sklep-kontrakt.php` | pole bez sufitu |
| BD-12 | Czy sprawdzenie liczy z tabeli, w której dane **naprawdę leżą** (HPOS ≠ `wp_posts`)? | `grep -rn 'wc_get_orders\|wp_delete_post' wordpress tools` | zapytanie + tabela |

**Nie bierze:** wstrzyknięć SQL (→ SEC), planów zapytań i indeksów pod kątem czasu
(→ PERF), zgodności zrzutu z Tutorem jako szwu (→ ARCH), retencji jako wymogu prawnego
(→ PRIV).

---

## QA — QA i testy

**Po co.** 39 strażników, 340 mutacji, 25 bramek, 83 testy. Pytanie działu brzmi
**„czy one mierzą to, co obiecują"** — nie „czy są zielone".

**Zakres — 80 plików**
```
git ls-files -- 'tools/straznicy' 'tools/smoke' 'goldeny' '.github/workflows' \
  'package.json' 'package-lock.json' 'tools/cytaty-zgodne.mjs' 'tools/sprawdz-proze-php.mjs'
```

| # | Pytanie (tak/nie) | Komenda / miejsce | Dowód |
|---|---|---|---|
| QA-01 | Czy wzorzec strażnika celuje w **rozstrzygnięcie**, a nie w nazwę metody, stałej lub napis? | `tools/straznicy/*.mjs` — każdy wzorzec | reguła + wzorzec, który przeżyje przemianowanie |
| QA-02 | Czy asercja stoi **przed** `process.exit`, a nie za nim? | `grep -rn -A5 'process.exit' tools/smoke` | plik:linia martwej asercji |
| QA-03 | Czy sprawdzenie ma **test negatywny**, który je zapala? | `tools/straznicy/audyt-straznikow.mjs` — wpisy mutacji | reguła bez mutacji |
| QA-04 | Czy zakres pomiaru trafia w **≥1 element** (nie przechodzi po pustce)? | bramki z selektorami CSS | selektor + liczba trafień |
| QA-05 | **Czy każda bramka z `ci.yml` przeszła kiedykolwiek przez CI na zielono?** | kroki `ci.yml` × `gh run list --json` | nazwa kroku + data zielonego przebiegu albo jej brak |
| QA-06 | Czy porównanie sprawdza **całą** wartość, nie podciąg (`includes("99,00")` łapie „199,00")? | `grep -rn 'includes(\|endsWith(' tools/smoke` | plik:linia |
| QA-07 | Czy bramka **sprząta po sobie** i tylko po sobie (migawka własnych śladów)? | `tools/smoke/poczta.mjs`, `dziennik.mjs` + każda bramka | linia sprzątania + zakres |
| QA-08 | Czy bramka przywraca stan **zastany**, a nie „domyślny"? | `grep -rn 'delete_option\|update_option' tools/smoke` | plik:linia |
| QA-09 | Czy kod wyjścia jest mierzony **bez potoku** (`\| tail` maskuje)? | `package.json`, `ci.yml` | linia komendy |
| QA-10 | Czy mutacja w audycie zapala **właściwą** regułę (`oczekiwanySlad`)? | `audyt-straznikow.mjs` | wpis bez `oczekiwanySlad` |
| QA-11 | Czy istnieje mutacja **martwa** (nie psuje już niczego) albo **przeoczona**? | `node tools/straznicy/audyt-straznikow.mjs` | licznik |
| QA-12 | Czy wzorzec z polskimi znakami używa `\p{L}` z flagą `u` (`\w` nie czyta ogonków)? | `grep -rn '\\\\w' tools/straznicy` | plik:linia wzorca |
| QA-13 | Czy bramka woła **tę samą komendę co człowiek**, a nie narzędzie pod spodem? | `grep -rn 'npx \|node ' tools/smoke` × `package.json` | komenda w bramce vs w `scripts` |
| QA-14 | Czy pomiar opiera się na **zdarzeniu**, a nie na cudzym tekście (ginie po zmianie języka)? | `grep -rn 'includes(\|match(' tools/smoke` | asercja na cudzym napisie |
| QA-15 | Czy weryfikacja artefaktu porównuje **każdy** plik wydania, nie jeden? | `tools/sprawdz-zywy.mjs`, `tools/deploy-podglad.sh` | zakres porównania |

> **QA-05 jest tu z konkretnego powodu.** Regresja jobu „Baza" przeleżała piętnaście dni
> i dwadzieścia wersji, bo `smoke-csp` wszedł do CI **po** ostatnim zielonym przebiegu
> i nigdy przez CI nie przeszedł — był zielony lokalnie, gdzie baza ma kursy. Żaden
> strażnik tego nie widział, bo wszystkie pytają o kod, nie o historię przebiegów.
> **Bramka, której nie widać, jest nie do odróżnienia od bramki, której nie ma.**

**Nie bierze:** dostarczania narzędzi pomiarowych (→ USP), wydajności samych bramek
(→ PERF), zgodności liczb w README z pomiarem (→ REPO).

---

## PERF — Wydajność

**Po co.** Zapytania na odsłonę, N+1, cache, waga stron.

**Zakres — 116 plików**
```
git ls-files -- ':(glob)wordpress/wtyczki/*/includes/*.php' \
  'wordpress/wtyczki/aai-sklep/assets' 'wordpress/wtyczki/aai-monitor/assets' \
  'wordpress/wtyczki/aai-sklep/szablony' 'tools/pomiar-psi.mjs' \
  'tools/pomiar-lighthouse.mjs' 'tools/sprawdz-zywy.mjs'
```

| # | Pytanie (tak/nie) | Komenda / miejsce | Dowód |
|---|---|---|---|
| PERF-01 | Czy któraś ścieżka robi zapytanie **w pętli** (N+1)? | `grep -rn -B5 'foreach' wordpress/wtyczki \| grep '\$wpdb'` | plik:linia pętli |
| PERF-02 | Ile zapytań kosztuje odsłona katalogu, strony kursu, lekcji i „Moich kursów"? | pomiar `SAVEQUERIES` na `:8892` | liczba na trasę |
| PERF-03 | Czy wynik powtarzalny w jednym żądaniu jest pamiętany? | `grep -rn 'static \$' wordpress/wtyczki` | metoda liczona wielokrotnie |
| PERF-04 | Czy widok prywatny woła `nocache_headers()`? | `class-aai-sklep-moje.php`, `class-aai-sklep-lekcja.php` | linia |
| PERF-05 | Czy arkusz i skrypt są wspólne dla wielu stron, nie wklejone w każdą? | `class-aai-sklep-zasoby.php` | uchwyt + zasięg |
| PERF-06 | Czy obrazy mają wymiary z pliku, a nie zgadywane? | `class-aai-sklep-zrzuty.php` | źródło wymiaru |
| PERF-07 | Czy odsłona dokłada niebuforowalny przebieg PHP tam, gdzie nie musi? | `class-aai-monitor-wizyty.php` | ścieżka |
| PERF-08 | Czy pomiar zapisany w README pochodzi z PSI, nie z lokalnego Lighthouse'a? | `goldeny/pomiary-lighthouse.json`, README | źródło liczby |

**Nie bierze:** poprawności zapytań (→ BD), poprawności bramek pomiarowych (→ QA),
dostarczania Chrome i riga (→ USP).

---

## ARCH — Architekt

**Po co.** Granice trzech wtyczek, **7 szwów**, cykle zależności, źródło prawdy, zgodność
kodu ze schematami draw.io.

**Zakres — 79 plików**
```
git ls-files -- ':(glob)wordpress/wtyczki/*/includes/*.php' ':(glob)wordpress/wtyczki/*/*.php' \
  'docs/schematy' 'docs/SYSTEM.drawio' 'docs/SCHEMATY.md' ':(glob)docs/plugin-*/DIAGRAM.md'
```

| # | Pytanie (tak/nie) | Komenda / miejsce | Dowód |
|---|---|---|---|
| ARCH-01 | Czy każdy z **7 szwów** ma nadawcę i odbiorcę i czy żaden nie jest martwy? | `grep -rn 'aai_sklep_kurs_zmieniony\|_usuniety\|aai_sklep_cena_kursu\|_cta_kursu\|_dostepnosc_kursu\|_zamowienia_w_drodze\|aai_monitor_strona_za_bramka' wordpress` | wystrzał + nasłuch |
| ARCH-02 | Czy któraś wtyczka pisze do **cudzych** tabel? | `grep -rn '\$wpdb->prefix' wordpress/wtyczki` | plik:linia + nazwa tabeli |
| ARCH-03 | Czy jest jedno źródło prawdy o kursie i czy kopia jedzie **jednokierunkowo**? | `class-aai-sklep-tutor.php` | kierunek zapisu |
| ARCH-04 | Czy każda nowa podstrona sklepu wchodzi przez `Aai_Sklep_Trasy::PODSTRONY`? | `grep -rn 'add_rewrite_rule' wordpress/wtyczki` | reguła poza jednym źródłem |
| ARCH-05 | Czy nazwa klasy z kodu jest na którymś schemacie i odwrotnie? | `node tools/straznicy/straznik-schematow.mjs` | klasa + schemat |
| ARCH-06 | Czy kolejność sekcji ma **jedno** źródło? | `class-aai-sklep-sekcje.php` | stała `KOLEJNOSC` + użycia |
| ARCH-07 | Czy wtyczka niższa w kolejności działa bez wyższej (zależności jednokierunkowe)? | `class-*-zaleznosci.php` | kierunek zależności |
| ARCH-08 | Czy diagram opisuje mechanizm, który w kodzie **istnieje**? | `docs/plugin-*/DIAGRAM.md` × kod | element diagramu bez odpowiednika |
| ARCH-09 | Czy istnieje cykl zależności między klasami? | mapa `require`/wywołań statycznych | ścieżka cyklu |

**Nie bierze:** treści dokumentacji poza schematami (→ REPO), zgodności z pierwotnym planem
projektu (→ PIK), zachowania cudzego kodu (→ INT).

---

## INT — Integracje z cudzym kodem

**Po co.** Tutor LMS 4.0.7, WooCommerce 11, motyw Automatic AI. Wszystko, co zależy od
zachowania, którego nie kontrolujemy.

**Zakres — 15 plików**
```
git ls-files -- ':(glob)wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-{tutor,styl-tutora,styl-woo,zasoby}.php' \
  ':(glob)wordpress/wtyczki/aai-platnosci/includes/*.php' \
  ':(glob)wordpress/wtyczki/aai-sklep/assets/{tutor,woo}-motyw.css' 'docs/ETAP-WP.md'
```

| # | Pytanie (tak/nie) | Komenda / miejsce | Dowód |
|---|---|---|---|
| INT-01 | Czy każde założenie o cudzym kodzie ma **dowód z kodu na dysku**, nie z dokumentacji? | `docs/ETAP-WP.md`, `docs/plugin-*/DIAGRAM.md` sekcje faktów | fakt + plik cudzej wtyczki:linia |
| INT-02 | Czy wersja Tutora i Woo jest przypięta albo świadomie pilnowana? | `class-*-zaleznosci.php`, `postaw.sh` | wersja + sprawdzenie |
| INT-03 | Czy cudzy callback może nam zabrać zdarzenie (priorytet)? | `grep -rn "add_action.*, *[0-9]" wordpress/wtyczki` | hak + priorytet nasz vs cudzy |
| INT-04 | Czy nasz wyjątek może wyjść do kasy Woo? | handlery na hakach Woo/Tutora | linia bez `catch ( Throwable )` |
| INT-05 | Czy kolizja kaskady jest rozwiązana przez `revert-layer`, a nie zgadywanie wartości motywu? | `tutor-motyw.css`, `woo-motyw.css` | reguła |
| INT-06 | Czy pytamy Tutora o **zapis**, a nie o `dostep` (prawdziwy też dla zapowiedzi i admina)? | `grep -rn 'is_enrolled\|has_enrolled_content_access\|dostep' wordpress/wtyczki` | plik:linia |
| INT-07 | Czy status kopii w Tutorze zamyka publiczny handler zapisu (`private`, nie `publish`)? | `class-aai-sklep-tutor.php` | mapa statusów |
| INT-08 | Czy pole cudzej wtyczki, które drukujemy klientowi, ma **naszego** właściciela? | `class-aai-platnosci-zapis.php` (`post_excerpt`, `_price`) | pole + miejsce ustawienia |
| INT-09 | Czy zapytanie po meta o **pustej** wartości nie dopasuje pierwszego lepszego wpisu? | `grep -rn "meta_value" wordpress/wtyczki` | zapytanie |
| INT-10 | Czy koszyk zachowuje się tak, jak obiecuje przycisk (jeden kurs = jedna pozycja)? | `class-aai-platnosci-kasa.php` + pomiar na `:8892` | obietnica + zachowanie |
| INT-11 | Czy skasowanie zamówienia w Woo sprząta zapis po stronie Tutora? | `wp aai-platnosci sprawdz` + pomiar | zamówienie usunięte + zapis pozostały |

**Nie bierze:** granic naszych wtyczek (→ ARCH), wyglądu naszych stron (→ FE), instalacji
u klienta (→ WDR).

---

## PRIV — Prywatność i zgodność

**Po co.** Dane osobowe, retencja, polityka prywatności, zobowiązania handlowe składane
klientowi na stronie.

**Zakres — 60 plików**
```
git ls-files -- 'wordpress/wtyczki/aai-monitor' 'docs/plugin-3/POLITYKA-PRYWATNOSCI.md' \
  'wordpress/wtyczki/aai-platnosci/includes/class-aai-platnosci-maile.php' \
  'tools/seed' 'wordpress/wtyczki/aai-sklep/szablony'
```

| # | Pytanie (tak/nie) | Komenda / miejsce | Dowód |
|---|---|---|---|
| PRIV-01 | Czy dziennik logowań przechowuje **tylko** to, co deklaruje polityka? | `class-aai-monitor-tabele.php` × `POLITYKA-PRYWATNOSCI.md` | kolumna bez pokrycia w polityce |
| PRIV-02 | Czy hasło może trafić do bazy przez pole loginu? | `class-aai-monitor-logowania.php` | linia maskowania |
| PRIV-03 | Czy dziennik ruchu nie ma **żadnej** kolumny łączącej z kontem? | `class-aai-monitor-tabele.php` | lista kolumn |
| PRIV-04 | Czy retencja (90 / 400 dni) naprawdę się wykonuje? | `class-aai-monitor-zapis.php` + pomiar na `:8892` | wyzwalacz + dowód usunięcia |
| PRIV-05 | Czy polityka prywatności zgadza się ze **stanem witryny** (ciastka Woo i WP)? | `POLITYKA-PRYWATNOSCI.md` × lista ciastek instalacji | cytat vs stan |
| PRIV-06 | Czy strona sprzedażowa obiecuje coś, czego produkt nie robi? | `tools/seed`, szablony sekcji | obietnica + brak mechanizmu |
| PRIV-07 | Czy kasa powołuje się na dokument, który **istnieje**? | `class-aai-platnosci-kasa.php` | zdanie + adres dokumentu |
| PRIV-08 | Czy mail do klienta nie niesie hasła ani klucza w treści? | `class-aai-platnosci-maile.php` | linia treści |
| PRIV-09 | Czy powiadomienia rdzenia nie wysyłają danych konta pod niewłaściwy adres? | `grep -rn 'password_change_notification' wordpress` | linia zdjęcia callbacku |
| PRIV-10 | Czy każdy mail wychodzący do klienta idzie z **naszego** adresu i w naszym wyglądzie? | `class-aai-platnosci-maile.php` + skrzynka `:8893` | mail + nadawca |

**Nie bierze:** bezpieczeństwa jako obrony przed atakiem (→ SEC), poprawności zapisu danych
(→ BD), prawdziwości liczb w dokumentacji (→ REPO).

---

## REPO — Prawda repo

**Po co.** Czy dokumentacja mówi prawdę o kodzie. Dział powstał, bo dwie tury higieny repo
(0.62.0, 0.63.0) pokazały, że nieprawdy siedzą **w prozie**, której strażnik nie czyta.

**Zakres — 79 plików**
```
git ls-files -- 'README.md' 'CLAUDE.md' 'CHANGELOG.md' 'CONTRIBUTING.md' 'LICENSE' \
  ':(glob)docs/*.md' 'docs/plugin-1' 'docs/plugin-2' 'docs/plugin-3' 'docs/schematy' \
  ':(glob)docs/dokumentacja-techniczna/*/ZRODLA.md' 'rejestr' '.github' 'agenci' \
  'wordpress/README.md' 'wordpress/srodowisko/README.md' \
  'docs/zrzuty/podglad-szkolenia.png' 'docs/zrzuty/tutor-na-motywie-kurs.png' \
  'docs/zrzuty/tutor-na-motywie-lekcja.png'
```

| # | Pytanie (tak/nie) | Komenda / miejsce | Dowód |
|---|---|---|---|
| REPO-01 | Czy każda liczba w README zgadza się z pomiarem? | `node tools/straznicy/straznik-readme.mjs` + pomiar ręczny | liczba w prozie vs zmierzona |
| REPO-02 | Czy któraś deklaracja stanu mówi „w toku" o rzeczy **wydanej**? | `grep -n 'W TOKU\|NIEOTWARTY\|NASTĘPNY KROK' CLAUDE.md docs/*.md` | zdanie + wersja, w której to zrobiono |
| REPO-03 | Czy każde `tools/*.mjs` da się znaleźć z dokumentacji? | `straznik-readme` reguła 7 | plik bez wzmianki |
| REPO-04 | Czy żaden wiersz tabeli nie ma treści po zamykającym `\|`? | `straznik-readme` reguła 8 | plik:linia |
| REPO-05 | Czy każda kotwica w prozie prowadzi do istniejącego nagłówka? | `straznik-linkow` | kotwica + brak celu |
| REPO-06 | Czy CHANGELOG opisuje to, co naprawdę weszło w danej wersji? | `git log <tag1>..<tag2>` × wpis | commit bez wpisu / wpis bez commita |
| REPO-07 | Czy **wynik każdej bramki ręcznej** jest zapisany w repo? | `docs/**/TEST-RECZNY*.md`, CHANGELOG | bramka bez zapisanego wyniku |
| REPO-08 | Czy reguła zapisana w repo nie jest łamana w praktyce bez nazwanego wyjątku? | README „Zasady twarde" × historia merge'ów | reguła + liczba złamań |
| REPO-09 | Czy `ZRODLA.md` opisuje to, co skrypt pobierający naprawdę pobiera? | `tools/pobierz-dokumentacje-*.mjs` × `ZRODLA.md` | zakres w skrypcie vs w dokumencie |
| REPO-10 | Czy schemat draw.io ma aktualny podgląd SVG (sha256)? | `node tools/straznicy/straznik-schematow.mjs` | plik + skrót |
| REPO-11 | Czy `rejestr/znane-bledy.json` zawiera każdy błąd, który dostał kod `BLAD-*`? | `grep -o 'BLAD-[0-9]*' -r . \| sort -u` × rejestr | kod bez wpisu |

**Nie bierze:** zgodności schematów z kodem jako architektury (→ ARCH), obietnic
z pierwotnego planu (→ PIK), instrukcji instalacji jako procedury (→ WDR).

---

## WDR — Wdrożenie i eksploatacja

**Po co.** Czy obcy człowiek zainstaluje to u siebie i czy da się to utrzymać.

**Zakres — 33 pliki**
```
git ls-files -- '.editorconfig' '.gitattributes' '.gitignore' '.nvmrc' '.env.example' \
  'docs/zrzuty/instalacja' 'wordpress/srodowisko' ':(glob)wordpress/wtyczki/*/*.php' \
  ':(glob)wordpress/wtyczki/*/readme.txt' 'tools/pakuj-wtyczki.mjs' \
  'docs/INSTRUKCJA-INSTALACJI.md' 'docker-compose.yml' 'wordpress/README.md' \
  'wordpress/wtyczki/aai-sklep/languages'
```

| # | Pytanie (tak/nie) | Komenda / miejsce | Dowód |
|---|---|---|---|
| WDR-01 | Czy instrukcja da się wykonać **bez wiedzy o repo**? | `docs/INSTRUKCJA-INSTALACJI.md` krok po kroku | krok wymagający wiedzy spoza instrukcji |
| WDR-02 | Czy paczka ZIP zawiera wszystko, czego wtyczka potrzebuje? | `npm run pakuj` + `unzip -t` + `get_plugin_data` | plik brakujący w paczce |
| WDR-03 | Czy `uninstall.php` nie kasuje danych klienta bez jego zgody? | `wordpress/wtyczki/*/uninstall.php` | linia |
| WDR-04 | Czy deaktywacja wtyczki zostawia sklep w bezpiecznym stanie? | `class-aai-platnosci-zapis.php` | zachowanie produktów |
| WDR-05 | Czy brak zależności daje **komunikat**, a nie biały ekran? | `class-*-zaleznosci.php` | ścieżka bez zależności |
| WDR-06 | Czy `postaw.sh` wstaje **od zera** i kończy weryfikacją artefaktu? | `podman-compose down && ./postaw.sh` | kod wyjścia + treść weryfikacji |
| WDR-07 | Czy istnieje pozycja wdrożeniowa, której nikt nie zapisał (np. `blog_public`)? | `docs/PLAN-SEO-HIGIENA-AUDYT.md` lista wdrożeniowa | pozycja + skutek pominięcia |
| WDR-08 | Czy klient nietechniczny może wykonać każdą czynność, którą instrukcja mu przypisuje? | instrukcja × dostępne ekrany | czynność wymagająca WP-CLI |
| WDR-09 | Czy wersja wtyczki w nagłówku ma sens wobec wersji repo? | nagłówki wtyczek × CHANGELOG | wersja |
| WDR-10 | Czy `.gitignore` nie wypuszcza sekretu i nie chowa artefaktu, który powinien być w repo? | `.gitignore`, `git status --ignored` | wpis |

**Nie bierze:** treści instrukcji jako dokumentu (→ REPO), bezpieczeństwa obwodu (→ SEC),
zależności od Tutora/Woo jako integracji (→ INT).

---

## PROTO — Prototyp Next.js

**Po co.** 15 371 linii TS/TSX. Prototyp jest **specyfikacją wykonawczą**, nie produktem —
ale jego opisy trafiają do kolejnych kroków, więc jego nieprawdy się rozchodzą.
**Wynik idzie osobno, do osoby sprawdzającej projekt (D5).**

**Zakres — 131 plików**
```
git ls-files -- 'app' 'components' 'lib' 'modules' 'public' 'tools/seed' \
  'next.config.ts' 'proxy.serwer.ts' 'tsconfig.json' 'eslint.config.mjs' \
  'postcss.config.mjs' 'package.json' 'tools/csp-podglad.mjs' 'tools/og-rozszerzenie.mjs'
```

| # | Pytanie (tak/nie) | Komenda / miejsce | Dowód |
|---|---|---|---|
| PROTO-01 | Czy prototyp obiecuje produkt, którego nie ma (ebooki, wideo, pliki do pobrania)? | `grep -rni 'ebook\|wideo\|pobier' app components lib tools/seed` | plik:linia |
| PROTO-02 | Czy jeden AJAX pozostał jeden (WYTYCZNE §8)? | `git ls-files 'app/api/**'` | liczba tras |
| PROTO-03 | Czy strona dotyka bazy z pominięciem działu? | `grep -rn 'pg\|Pool' app components` | plik:linia |
| PROTO-04 | Czy kontrakt Zod ma sufit dla każdego pola? | `modules/m1-sklep/typy.ts` | pole bez sufitu |
| PROTO-05 | Czy tryb podglądu statycznego ma jedno źródło prawdy? | `lib/podglad.ts` + `pageExtensions` | rozgałęzienie poza jednym miejscem |
| PROTO-06 | Czy prototyp rozjechał się z wtyczką WP tam, gdzie jest jej specyfikacją? | prototyp × `wordpress/wtyczki` | zachowanie różne po obu stronach |
| PROTO-07 | Czy `dynamic`/`generateStaticParams` są literałami (kompilator parsuje statycznie)? | `grep -rn 'export const dynamic' app` | plik:linia |
| PROTO-08 | Czy trasa prywatna nie wchodzi do eksportu statycznego? | `npm run build:podglad` + zawartość `out/` | plik w `out/` |
| PROTO-09 | Czy coś zmienia HTML **przed hydratacją** bez tłumika ostrzeżenia? | `grep -rn 'suppressHydrationWarning\|document\.' app components` | plik:linia |
| PROTO-10 | Czy pole sterowane liczbą nie kasuje wpisu w trakcie pisania? | `grep -rn 'type="number"\|valueAsNumber' components` | pole + zachowanie |
| PROTO-11 | Czy publikacja bierze artefakt z **commita**, a nie z katalogu roboczego? | `tools/deploy-podglad.sh` | linia budowania |
| PROTO-12 | Czy font ma preload, a niewidzialny element nie jest kandydatem na LCP? | `app/layout.tsx`, `app/globals.css` | linia + wynik pomiaru |

**Nie bierze:** kodu wtyczek WP (→ pozostałe działy). Znalezisko dotyczące **obu** stron
naraz należy do PROTO tylko w części prototypowej — resztę bierze dział właściwy dla WP.

---

## PIK — Początek i koniec

**Po co.** W7: **co było zamierzone na starcie, ma być na końcu.** Dział czyta obietnice
z planu, wytycznych i decyzji właściciela i sprawdza, czy produkt je spełnia.

**Zakres — 10 plików**
```
git ls-files -- 'docs/PLAN.md' 'docs/WYTYCZNE.md' 'CLAUDE.md' 'CHANGELOG.md' \
  ':(glob)docs/plugin-*/DIAGRAM.md' 'docs/PLAN-SEO-HIGIENA-AUDYT.md' \
  'docs/ETAP-WP.md' 'docs/TEST-CALOSCI-WP.md'
```

| # | Pytanie (tak/nie) | Komenda / miejsce | Dowód |
|---|---|---|---|
| PIK-01 | Czy każda pozycja definicji ukończenia (`PLAN.md` §2.4) jest spełniona **w kodzie**? | `PLAN.md` × produkt | pozycja + miejsce spełnienia |
| PIK-02 | Czy każdy niezmiennik z DIAGRAM-ów (N1–N18 P3 i odpowiedniki) ma odpowiednik w kodzie? | `docs/plugin-*/DIAGRAM.md` | niezmiennik bez kodu |
| PIK-03 | Czy każda decyzja właściciela oznaczona jako wykonana **jest** wykonana? | tabele D/P/W/K w CLAUDE.md i DIAGRAM-ach | decyzja + miejsce |
| PIK-04 | Czy któraś decyzja została po cichu odwrócona przez późniejszą pracę? | CHANGELOG × decyzje | decyzja + commit odwracający |
| PIK-05 | Czy WYTYCZNE §1–§8 i N1–N3 są przestrzegane w kodzie, który powstał po nich? | `docs/WYTYCZNE.md` × produkt | paragraf + naruszenie |
| PIK-06 | Czy bramki B1–B7, W1–W6, P0–P6, T0–T4 mają zapisany **wynik**? | CHANGELOG, dokumenty testów | bramka bez wyniku |
| PIK-07 | Czy rzecz zapowiedziana jako „zostaje do decyzji właściciela" została rozstrzygnięta albo jawnie odłożona? | `grep -n 'ZOSTAJE DO DECYZJI' CLAUDE.md docs` | pozycja bez rozstrzygnięcia |
| PIK-08 | Czy pozycja „przed pierwszym klientem" jest kompletna? | `grep -in 'przed pierwszym klientem' CLAUDE.md docs/PLAN-SEO-HIGIENA-AUDYT.md` (bez `-i` plan SEO daje ZERO — wielka litera) | pozycja brakująca na liście |

**Nie bierze:** prawdziwości liczb w dokumentacji (→ REPO), zgodności schematów z kodem
(→ ARCH). PIK pyta o **obietnicę wobec produktu**, REPO o **opis wobec kodu**.

---

## USP — Usprawnienia audytowe

**Po co.** W8: dział **dostarcza pozostałym twarde liczby zamiast opinii**. Jego produktem
są narzędzia i pomiary, nie zgłoszenia o produkcie.

**Zakres — 94 pliki**
```
git ls-files -- ':(glob)tools/*.mjs' ':(glob)tools/*.sh' ':(glob)tools/*.ts' \
  'tools/zrzuty' 'tools/podglad-kursow' 'tools/straznicy/uruchom-wszystkie.mjs' \
  'tools/straznicy/audyt-straznikow.mjs' 'package.json' 'package-lock.json'
```

| # | Pytanie / zadanie | Komenda / miejsce | Produkt |
|---|---|---|---|
| USP-01 | Czy Chrome jest zainstalowany i sterowalny (K11′)? | instalacja + próba nawigacji | wersja + działający rig |
| USP-02 | Czy istnieje pomiar liczby zapytań na odsłonę? | `SAVEQUERIES` + skrypt | liczby dla 4 tras → PERF |
| USP-03 | Czy istnieje pomiar wagi i czasu odsłony przez Chrome DevTools Protocol? | CDP | tabela → PERF |
| USP-04 | Czy audyt mutacyjny da się uruchomić na **wskazanym** strażniku? | `audyt-straznikow.mjs <nazwa>` | kod wyjścia → QA |
| USP-05 | Czy istnieje pomiar „czy bramka przeszła przez CI"? | `gh run list --json` | tabela krok × ostatni zielony → QA |
| USP-06 | Czy istnieje sposób na policzenie wystąpień klasy błędu w całym repo? | grep/skrypt | narzędzie → re-audyt |
| USP-07 | Czy rig przeglądarkowy stoi **poza** `package.json` projektu? | `ZRZUTY_RIG`, scratchpad | ścieżka riga |
| USP-08 | Czy każde narzędzie audytu zwraca kod wyjścia **bez potoku**? | `tools/audyt/*` (E4) | kod wyjścia |
| USP-09 | Czy narzędzie nie bierze adresu `file://` za ścieżkę systemową (katalog ze spacją)? | `node tools/straznicy/straznik-sciezek.mjs` | plik:linia |

**Nie bierze:** oceny bramek projektu (→ QA), własnych zgłoszeń o produkcie. USP zgłasza
**brak narzędzia**, nie błąd w kodzie.

---

# CZĘŚĆ II — 5 RÓL PROCESOWYCH

---

## KIER — Audytor kierownik  · **Fable 5.1**

**Po co.** Najważniejsza rola audytu (§3 regulaminu). Koordynuje 14 działów, zbiera
wyniki, pilnuje kolejności wejścia audytu i re-audytu do działów (W5, K9′).

**Zakres:** nie pliki produktu, lecz **wyjścia działów** — `audyt/zgloszenia/*`,
statusy, mapa pokrycia.

| # | Pytanie (tak/nie) | Dowód |
|---|---|---|
| KIER-01 | Czy każdy dział ma status `ZAKOŃCZONE` i przeszedł **całą** checklistę? | licznik pozycji zamkniętych / wszystkich |
| KIER-02 | Czy któryś dział zamknął się, nie zadając pozycji ze swojej listy? | pozycja bez odpowiedzi |
| KIER-03 | Czy każde zgłoszenie ma dowód, miejsce i kod? | wynik `zgloszenie.mjs` |
| KIER-04 | Czy dwa działy zgłosiły to samo miejsce (kolizja granicy)? | hash miejsca × dział |
| KIER-05 | Czy re-audyt wszedł do działu dopiero po wyjściu audytu? | dziennik wejść |
| KIER-06 | Czy migawka wartości przed i po jest identyczna (W6)? | `migawka-wartosci.mjs` |
| KIER-07 | Czy `git diff main -- . ':!audyt' ':!re-audyt'` jest puste? | kod wyjścia |

**Krytyk:** pyta, czy kierownik nie zamknął działu na podstawie deklaracji zamiast liczby.

---

## GOLD — Golden  · **Opus**

**Po co.** Warstwa kontrolna procesu (§12 regulaminu). **Rozstrzygnięcie właściciela
(2026-09-01): Golden jest BRAMKĄ, nie nadzorcą czasu rzeczywistego.**

Powód jest techniczny i nazywam go wprost, bo obietnica nadzoru na żywo byłaby nieprawdą:
**harness nie pozwala jednemu agentowi obserwować drugiego w trakcie pracy.** Golden działa
więc dwoma sposobami naraz:

1. **Maszynowo, z góry** — 13 zasad Goldena wchodzi **dosłownie** do każdego `AGENT.md`
   i `KRYTYK.md`, a `straznik-sektora-audytu.mjs` sprawdza, że tam są (E4).
2. **Jako bramka wyjścia** — dział kończy → **Golden czyta jego wyjście** wobec 13 zasad →
   dopiero potem kierownik je zbiera. Blokuje **wyjście**, nie pracę w toku.

| # | Pytanie (tak/nie) | Dowód |
|---|---|---|
| GOLD-01 | Czy któreś zgłoszenie jest wymyślone (bez podstawy)? | zgłoszenie + brak dowodu |
| GOLD-02 | Czy agent wyszedł poza swój zakres? | zgłoszenie × tabela granic |
| GOLD-03 | Czy agent **naprawił** cokolwiek (W2)? | `git diff` |
| GOLD-04 | Czy agent przekazał znalezisko zamiast drążyć (W10)? | zgłoszenie ze wskazaniem cudzego działu |
| GOLD-05 | Czy każde zgłoszenie ma kod i status? | rejestr zgłoszeń |
| GOLD-06 | Czy dział użył skilla, który miał użyć? | ślad w wyjściu |
| GOLD-07 | Czy zachowana jest kolejność sektorów (audyt przed re-audytem na tym samym dziale)? | dziennik |
| GOLD-08 | Czy porównanie wartości początku i końca zostało wykonane? | migawka |

**Krytyk Goldena (K7):** ma jedno wąskie zadanie — sprawdzić, czy **Golden nie zablokował
pracy bez podstawy**. Blokada bez wskazania złamanej zasady jest jego znaleziskiem.

---

## KON — Agent Konrad  · **Fable 5.1**

**Po co.** **Konrad audytuje AUDYT, nie projekt (P1).** Produktem są **luki w audycie**.

**Zakres — cały katalog sektora**
```
git ls-files -- 'audyt'
```
Zakres rośnie z każdym etapem budowy — dlatego jest ścieżką katalogu, nie liczbą.

**Faza A — przed pracą działów, atakuje ZAKRESY:**

| # | Pytanie | Dowód |
|---|---|---|
| KON-A1 | Czy istnieje plik, którego nie bierze nikt? | ścieżka |
| KON-A2 | Czy istnieje plik jednocześnie przypisany i wykluczony? | ścieżka + dwa stany |
| KON-A3 | Czy istnieje klasa błędu z historii repo, której **nie łapie żadna** pozycja checklisty? | `rejestr/znane-bledy.json` × 14 checklist |
| KON-A4 | Czy któryś zakres daje **zero** plików (przechodzi po pustce)? | komenda + wynik |
| KON-A5 | Czy granica między dwoma działami zostawia pytanie bez właściciela? | para działów + pytanie |
| KON-A6 | Czy checklista pozwala odpowiedzieć „tak" bez otwarcia pliku? | pozycja |

**Faza B — po raportach, atakuje WYNIKI.** Dla Konrada „Security sprawdził wszystkie
ścieżki wejścia" jest **hipotezą do obalenia**: bierze deklarację działu i szuka
kontrprzykładu.

**Nie bierze:** łamania założeń **systemu** („co, jeśli baza nie odpowiada") — to robią
działy w swoich zakresach (§7 regulaminu).

---

## WER — Audytor weryfikator  · **Opus**

**Po co.** §16 regulaminu: **poza audytem**. Sprawdza, czy zgłoszony problem istnieje —
żeby agent wykrywający nie był jedynym, kto uznaje go za prawdziwy.

**Zakres:** zgłoszenia ze statusem `DO WERYFIKACJI`. **Nie czyta obszaru — czyta
zgłoszenie i jego dowód** (K1: koszt).

| # | Pytanie (tak/nie) | Dowód |
|---|---|---|
| WER-01 | Czy miejsce wskazane w zgłoszeniu **istnieje** (plik, linia, mechanizm)? | otwarcie miejsca |
| WER-02 | Czy dowód potwierdza stwierdzenie, czy tylko z nim sąsiaduje? | cytat |
| WER-03 | Czy zjawisko jest **czynne**, czy zablokowane gdzie indziej? | ścieżka wywołania |
| WER-04 | Czy hash miejsca zgadza się z treścią? | ponowne policzenie |
| WER-05 | Czy stwierdzenie jest jednoznaczne („wydaje mi się" = odrzucenie)? | brzmienie |

**Werdykt:** `ZWERYFIKOWANE (istnieje)` albo `ZWERYFIKOWANE (odrzucone)` z powodem.
**Odrzucenie nie kasuje zgłoszenia** — zostaje z werdyktem, bo druga fala musi trafić na
to samo.

---

## RAP — Audytor raportu  · **Opus**

**Po co.** §11 regulaminu: raport powstaje **na sam koniec, gdy wszystkie działy skończą**.

**Zakres:** komplet zweryfikowanych zgłoszeń + obie migawki wartości.

| # | Pytanie (tak/nie) | Dowód |
|---|---|---|
| RAP-01 | Czy każde zgłoszenie w raporcie ma werdykt weryfikatora? | zgłoszenie bez werdyktu |
| RAP-02 | Czy raport podaje **liczby**, nie wrażenia? | zdanie bez liczby |
| RAP-03 | Czy raport nazywa, czego audyt **nie sprawdził**? | sekcja granic |
| RAP-04 | Czy wartości początku i końca są w raporcie i czy są zgodne (W1, W6)? | tabela |
| RAP-05 | Czy raport rozdziela znaleziska prototypu (D5) od produktu? | sekcja |
| RAP-06 | Czy raport nie proponuje napraw (W2)? | zdanie proponujące zmianę |

---

---

# Pokrycie znanych klas błędów (KON-A3)

Trzydzieści wpisów `rejestr/znane-bledy.json` to **udokumentowana historia tego, jak ten
projekt się psuł**. Checklisty powstały tak, żeby każda z tych klas miała swoją pozycję —
bo klasa, która wróciła raz, wraca znowu (wzorzec celujący w nazwę zamiast w rozstrzygnięcie
wracał **dziewięć razy**).

To odwzorowanie jest **mechaniczne i sprawdzalne**: pozycja po prawej musi istnieć
w checkliście swojego działu, a każdy `BLAD-*` musi mieć wiersz. Kontrola w E4.

| Klasa | Pozycja | Klasa | Pozycja |
|---|---|---|---|
| BLAD-001 hydratacja | PROTO-09 | BLAD-016 podmiana per węzeł | *wykluczone D4* |
| BLAD-002 testy niszczą bazę | QA-07 | BLAD-017 funkcja od SSRF | BE-13 |
| BLAD-003 `transform` łamie `fixed` | FE-01 | BLAD-018 brak klucza = pustka | BE-01 |
| BLAD-004 animacja i kontekst układania | FE-01 | BLAD-019 kolektor miesza pola | FE-02 |
| BLAD-005 pole sterowane liczbą | PROTO-10 | BLAD-020 kolejność kluczy | BE-07 |
| BLAD-006 walidacja tylko przy odczycie | BE-12 | BLAD-021 slug zajmuje adres | ARCH-04 |
| BLAD-007 build z katalogu roboczego | PROTO-11 | BLAD-022 blok z jednego powodu | QA-04 |
| BLAD-008 artefakt narzędzia w treści | *wykluczone D4* | BLAD-023 koszyk kumuluje | INT-10 |
| BLAD-009 font bez preloadu | PROTO-12 | BLAD-024 ścieżka po angielsku | FE-11 |
| BLAD-010 ślepota na chunki | QA-15 | BLAD-025 cudze maile | PRIV-10 |
| BLAD-011 niewidzialny kandydat LCP | PROTO-12 | BLAD-026 liczenie ze złej tabeli | BD-12 |
| BLAD-012 test omija komendę | QA-13 | BLAD-027 pole niczyje | INT-08 |
| BLAD-013 strażnik na nazwie metody | QA-01 | BLAD-028 pomiar na cudzym tekście | QA-14 |
| BLAD-014 URL jako ścieżka | USP-09 | BLAD-029 bramka sprząta cudze | QA-07 |
| BLAD-015 strona obiecuje stary produkt | PRIV-06 | BLAD-030 zamówienie a zapis w Tutorze | INT-11 |

**Dwie klasy są poza zakresem decyzją D4** (kursy): BLAD-008 dotyczy artefaktów narzędzia
w plikach lekcji, BLAD-016 — bramki prywatności zrzutów do kursów. Obie żyją w
`tresc-kursow`, którego audyt nie rusza. **Wykluczenie jest zapisane, nie przemilczane** —
inaczej nie dałoby się odróżnić od przeoczenia.

**Piętnaście pozycji checklist powstało właśnie z tego przelotu** — pierwsza wersja
checklist nie łapała: hydratacji, pola sterowanego liczbą, buildu z katalogu roboczego,
fontu i LCP, walidacji tylko przy odczycie, złej funkcji rdzenia, liczenia ze złej tabeli,
bramki omijającej komendę, pomiaru na cudzym tekście, weryfikacji jednego pliku, języka
ścieżki klienta, koszyka, zapisu po skasowanym zamówieniu, cudzych maili i adresu URL
użytego jako ścieżka. **To jest dokładnie ta praca, do której Konrad istnieje**, wykonana
na zakresach, zanim powstał choćby jeden agent.

# Podsumowanie

| | Liczba |
|---|---|
| Działy | **14** |
| Role procesowe | **5** |
| **Role razem** | **19** |
| Agentów (rola + krytyk, D3) | **38** |
| Pozycji checklist w działach | **151** |
| Pozycji checklist w rolach procesowych | **32** |
| Model Fable 5.1 | **2 role**: `KIER`, `KON` (polecenie właściciela 2026-09-02) |
| Model Opus | 3 role procesowe (`GOLD`, `WER`, `RAP`) + **19 krytyków** |
| Model Sonnet | 14 działów |

**Rozwinięte w E5 (zapis historyczny — było „do rozwinięcia"):** każda z 19 ról ma
`AGENT.md` (pięć elementów z §5 regulaminu, plus trzynaście zasad Goldena), `KRYTYK.md`,
`SKILL.md` i golden — **76 plików** w `audyt/role/<KOD>/`. **Zrobione w E4:**
`zgloszenie.mjs` (kod, walidacja, hash miejsca), `mapa.mjs` (trzy stany),
`migawka-wartosci.mjs`, `straznik-sektora-audytu.mjs` z mutacjami.

**Ta tabela checklist jest ŹRÓDŁEM dla `AGENT.md` każdej roli** i pilnuje tego reguła 13
strażnika, w obie strony: pozycja dopisana tylko tutaj nigdy nie zostanie zadana, pozycja
dopisana tylko w `AGENT.md` jest pytaniem spoza zakresu zatwierdzonego przez właściciela.
