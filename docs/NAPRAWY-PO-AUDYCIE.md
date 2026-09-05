# Naprawy po audycie fali 1 — stan, decyzje, co zostało

**Gałąź:** `fix/naprawy-audytu-f1` (od `main`, commity `a516fe4` … `ea51d98` + commit sierot).
**Kontekst:** audyt i re-audyt fali 1 znalazły **33 potwierdzone dwustronnie
usterki w kodzie produktu** (krytyk PRZEPUSZCZAM + weryfikator ISTNIEJE).
Katalog zgłoszeń żyje na gałęzi `re-audyt/sektor-re-audytu`, w
`audyt/zgloszenia/`; kopia tych 33 wpisów była wyeksportowana do scratchpada
sesji, bo gałąź napraw ich nie widzi.

---

## Decyzje właściciela (2026-09-05)

| # | Decyzja | Powód |
|---|---|---|
| **D1** | **Naprawy ZAMIAST fali 2** | Fala 2 z definicji bada POWTARZALNOŚĆ audytu, czyli sam audyt. Właściciel: *„zależy nam bardziej, aby projekt nie był wadliwy"*. Termin: projekt gotowy **do niedzieli**. |
| **D2** | **Wszystkie 33, według wagi** | Kolejność: czerwone (sprzedaż, dane, dostęp) → pomarańczowe → wydajność → instalacja. Przerwanie na granicy koloru, gdyby zabrakło czasu. |
| **D3** | **Po naprawach — fala kontrolna** | Właściciel pyta wprost, czy zdążymy „jeszcze na jedną falę, aby się upewnić". Zakres: **tylko 14 Pogłębiaczy**, BEZ dziewięciu ról procesowych. |
| **D4** | **Przyspieszenie fali: równoległość + POTOK** | Właściciel: *„z działu wychodzi audyt, wchodzi re-audyt, audyt jest w następnym"*. **Sprawdzone: to jest dozwolone** — `KIER-R1` pilnuje wyłącznie tego, żeby re-audyt wszedł do działu PO audycie TEGO SAMEGO działu. Sekwencyjność całych sektorów w fali 1 była nadmiarowa. |
| **D5** | **Skasować ślady testowe z monitoringu** | Tabele urosły z 26/30 (dane właściciela z testu T4) do 46/45 przez ślady bramek. Kasować **jawną listą identyfikatorów**, nigdy zakresem ani po dacie. |
| **D6** | **Rozciąć cykl zależności w `aai-platnosci`** | Właściciel wybrał pełną naprawę mimo policzonej ceny (patrz „Co zostało"). |
| **D7** | **Zwracać się „Krzysiek", na Ty** | Wytyczna wprost. |
| **D8** | **REA-INT-F1-003: naprawa najgłębsza z ryzykiem sprowadzonym do zera** | Hak sprząta księgowość Tutora i notatki Woo po skasowanym zamówieniu — pod PIĘCIOMA zamkami (tylko zamówienie w 100 % z kursów, tylko API właścicieli tabel, tylko przy zerze wypłat instruktora, osobne `try`, kontrola liczy i NIE kasuje). Kasowanie historycznych sierot osobną komendą `sieroty --usun`. |
| **D9** | **AUD-ARCH-F1-001: sól podpisu do WŁASNEJ tabeli z migracją-fallbackiem** | Wariant „zostaje + strażnik" odrzucony. Wartość soli nie zmienia się ani na chwilę (tabela → stara opcja przejęta co do znaku → nowa); kontrola świeci kodem 1 przy rozjeździe dwóch miejsc. |
| **D10** | **Cykl w `aai-monitor` (spoza listy 33): napraw teraz** | Ta sama klasa co AUD-ARCH-F1-004 w `aai-sklep`, ~20 min, moduł bez sprzedaży i treści. Po naprawie wszystkie trzy wtyczki mają 0 cykli. |
| **D11** | **Skasować historyczne sieroty na `:8892` komendą `sieroty --usun`** | 12 wierszy księgowych + 1345 notatek przy zerze zamówień — pozostałości smoke'ów i testu całości, nie dane właściciela. Zrzut tabel przed kasowaniem: `~/.cache/aai-kopie/sieroty-przed-kasowaniem-20260905.sql`. |

---

## Zrobione: 32 z 33 (jedna zostaje świadomie)

| Commit | Zakres |
|---|---|
| `a516fe4` | **Trzy czerwone**: cicha utrata treści lekcji, waluta USD w kasie, dostęp po skasowanym zamówieniu |
| `188cf2b` | **Wydajność**: 3× N+1, pamięć żądania, nagłówki cache lekcji i zasobów statycznych |
| `c174d66` | **Prywatność** (3), start wtyczki bez `try/catch`, **cykle w `aai-sklep`** (2 → 0) |
| `ce09189` | **Dokumentacja i wdrożenie**: README wtyczek, kolejność w `postaw.sh`, `readme.txt` ×3, narzędzie `wp:zapytania` |
| `5d4b875` | **Idempotencja produktu** (koniec duplikatów), **sito typu treści w kolektorze CSP** |
| `2bd68b7` | **Kontrola rozjazdu waluty**, podpisy kafelków zgodne z retencją, walidacja wejścia filtra CTA |
| `5b4ee5f` | **AUD-ARCH-F1-003**: cykl `Cta ↔ Ustawienia` rozcięty klasą-liściem `Aai_Platnosci_Posiadanie`; reguły 16 i 20 strażnika przepisane z „pliku" na „decyzję" (reguła 20 UMILKŁA po refactorze — pilnowana pustka) |
| `de8d1ee` | **REA-BD-F1-001**: idempotencja kopii w Tutorze zmierzona (przerwanie → `sync` → 0 duplikatów) i objęta regułą `straznik-tutora` |
| `ea51d98` | **AUD-ARCH-F1-001**: sól podpisu w `wp_aai_monitor_ustawienia` z migracją-fallbackiem (wartość co do znaku), reguły 15b/15c; **cykl w `aai-monitor`** (D10) rozcięty stałą `AAI_MONITOR_STRONA`; `aai-monitor` 0.5.0 |
| *(sieroty)* | **REA-INT-F1-003**: hak kasowania zamówienia sprząta księgowość Tutora i notatki Woo pod pięcioma zamkami; kontrola liczy sieroty (kod 1); komenda `wp aai-platnosci sieroty [--usun]`; `aai-platnosci` 0.2.0; ślady testowe monitoringu skasowane (26/30, D5) |

**Standard każdej naprawy** (bez wyjątku): pomiar PRZED → naprawa → pomiar PO →
**test negatywny** (cofnięcie naprawy musi zapalić pomiar) → bramki.
Dowody uruchomieniowe, nie z lektury.

**Stan bramek na koniec:** strażnicy **39/39**, audyt mutacyjny **351**
(0 przeoczonych, 0 martwych), `smoke:wp-zakup` **58**, `smoke:wp-monitor`
**181**, `smoke:wp-zwroty` 39, `smoke:wp-front` 86, `smoke:wp-produkty` 85,
`smoke:wp-platnosci` 23, `wp:sprawdz` **73/73 co do znaku**, `aai-platnosci
sprawdz` i `aai-monitor sprawdz` kod 0, **cykle zależności 0/0/0**.

---

## Trzy rzeczy, które wyszły po drodze i są ważniejsze niż same naprawy

**1. BRAMKA BRONIŁA USTERKI.** `smoke-wp-monitor` wpisywał w pole loginu
`MojeTajneHaslo#2026` i **asertował, że początek `Moj` MA zostać w bazie** —
czyli dowód utrwalał wyciek fragmentu hasła jako WYMAGANIE, wbrew zdaniu
polityki prywatności. Naprawa musiała objąć kod **i** bramkę; wzorzec ataku
dostał osobną asercję na wartości, która loginem być może.

**2. Strażnik zablokował commit i miał rację.** Hak na kasowanie zamówienia
wołał `is_tutor_order()` bez wcześniejszego `wc_get_order()`, a
`before_delete_post` dostaje KAŻDY kasowany wpis — na stronie czy załączniku
dałoby to biały ekran. Reguła istniała, bo ta klasa już raz wystąpiła.

**3. Pierwszy dowód wyszedł FAŁSZYWIE NEGATYWNY.** Tutor zmienia status zapisu
surowym `$wpdb->update` bez czyszczenia cache (`Utils.php:2478`), więc
`get_post_status()` w tym samym żądaniu oddaje starą wartość. **Zła była
metoda pomiaru, nie kod.** Status czytać wprost z bazy.

---

**4. HAK NA PRIORYTECIE 10 NIE DZIAŁAŁ NIGDY — a wywołany wprost działał.**
Na `woocommerce_before_delete_order` Woo rejestruje na 10
`WC_Post_Data::before_delete_order()`, które KASUJE POZYCJE zamówienia; nasz
callback (też 10, zarejestrowany później) pytał `same_kursy()` zamówienie bez
pozycji i wychodził. Bez objawu — hak nie ma czytelnika. Złapał to dowód
uruchomieniowy (`1:3` zamiast `0:0`), nie lektura. Hak biegnie na priorytecie 1,
pilnuje reguła 43 (priorytet < 10) i mutacja.

**5. `is_tutor_order()` to nie jest „czy to zamówienie kursu".** Czyta metę,
którą Tutor zakłada tylko w KASIE — zamówienie z `wc_create_order()` +
`add_product()` (WP-CLI, import, cudza wtyczka) jej nie ma, choć Tutor
dolicza mu przychód. „Nasze" rozstrzygamy też po własnej tabeli powiązań.

**6. Dwa API notatek, oba kłamią po swojemu.** `wc_get_order_notes()` z
`limit => -1` oddaje JEDNĄ notatkę (Woo mapuje `limit` → `number`, `-1` → `1`);
`get_comments()` wprost oddaje ZERO (filtr `comments_clauses` Woo wycina
notatki zamówień z każdego zapytania). Poprawnie: `wc_get_order_notes()` bez
limitu.

**7. Reguła strażnika przypięta do PLIKU milknie po refactorze.** Reguła 20
(`straznik-platnosci-wp`) po wyprowadzeniu decyzji z `cta.php` przeszła na
zielono, bo jej pętla nie miała po czym iterować — gwarancja zachowana, pilnowanie
zniknęło. Reguły mają iść za DECYZJĄ po całym katalogu klas i mieć
samokontrolę zakresu.

## Co zostało: 1 pozycja świadomie otwarta + 1 poza produktem

| ID | Rzecz | Stan |
|---|---|---|
| **REA-PRIV-F1-001** | Polityka prywatności na czterech publicznych stronach wypiera się ciasteczek, choć witryna je stawia | **NIE RUSZAMY (decyzja)** — treść prawna właściciela, wymaga prawnika. Pozycja „przed pierwszym klientem". To jedyna z 33 usterek bez naprawy w kodzie. |
| **REA-ARCH-F1-002** | Wpis `AUD-ARCH-F1-002` ma status `ZWERYFIKOWANE` mimo sprzecznych werdyktów | **nie dotyczy produktu** — to usterka aparatu audytu, opisana w raporcie re-audytu |

---

## Ustalenia techniczne o przyspieszeniu fali (D3 + D4)

- **Potok per dział jest dozwolony** — patrz D4. Sekwencyjność całych sektorów
  nie wynikała z regulaminu.
- **`postaw.sh` UMIE stawiać osobne instancje**: `WP_PORT`, `MAILPIT_PORT`,
  `STACK_NAZWA` są sparametryzowane. Drugie środowisko = drugi tor pomiarowy.
- **Ograniczenie: PAMIĘĆ.** 15 GB razem, ~3 GB wolne. **Drugie środowisko się
  zmieści, trzecie jest ryzykowne.**
- **`NA_SRODOWISKU` w `audyt/tools/wspolne.mjs` obejmuje WSZYSTKIE 14 działów**,
  więc równoległość na jednym `:8892` wymaga albo drugiej instancji, albo
  rozdzielenia ról czytających kod od mierzących na żywo.
- Role czytające wyłącznie kod (grep, lektura) mogą chodzić równolegle bez
  ograniczeń — nie potrzebują WordPressa wcale.

---

## Pułapki tej sesji (nie odkrywać od nowa)

- **`| tail` maskuje kod wyjścia.** Złapało mnie DWA RAZY w jednej sesji, w tym
  na strażniku sektora, który przez potok pokazał 0, a bez potoku daje 1.
  **Kody wyjścia mierzyć bez potoku, zawsze.**
- **Strażnicy leżą w `tools/straznicy/`**, nie w `straznicy/`.
- **`opcache.revalidate_freq = 2`** — po zmianie pliku PHP odczekać ≥ 3 s,
  inaczej mierzy się POPRZEDNI stan kodu.
- **Kontener nie ma sieci** (`curl` → 000), więc `wp language install` pada
  i katalog `wp-content/languages` nie powstaje. To źródło 10 z 25 czerwonych
  w `smoke-wp-jezyk` i **usterka procedury, nie kodu**.
- **Kasowanie z bazy jest blokowane przez zabezpieczenie sesji** — wymaga
  wyraźnej zgody właściciela. Zakazu nie obchodzić.
- **Bramki zmieniają środowisko między pomiarami.** `smoke-wp-zakup` po
  naprawie zostawiał 3 notatki po zamówieniu z samym CUDZYM produktem (hak
  słusznie ich nie rusza — zamek 1) i kontrola świeciła kodem 1 „po
  sprzątaniu". Bramka sprząta teraz własne ślady w cudzych tabelach przez API,
  po jawnej liście własnych zamówień.
- **Edytuj PHP wtyczek tylko, gdy żaden smoke nie biegnie na `:8892`** — każdy
  `wp eval` bramki ładuje wszystkie wtyczki; częściowy zapis to fałszywy błąd.
- **`git stash push -- <plik>`** ratuje commit, gdy strażnik pilnuje kodu,
  którego jeszcze nie ma (reguły 43–45 czekały w stashu na PHP sierot).
- **Przerwane bramki kumulują ślady**: sprzątają wyłącznie od WŁASNEJ migawki,
  więc przebieg ubity w połowie zostawia wiersze, których następny nie usunie.

---

## NASTĘPNY KROK

1. **PR gałęzi `fix/naprawy-audytu-f1` → `main`, tag `v0.65.0`, release.**
   Przed PR: `npm run check` (pełny, kod 0) i przelot bramek WP; CHANGELOG
   0.65.0 i README już gotowe. Szacunek: **~1 h** (check + smoke'i ~30 min,
   PR/merge/tag/weryfikacja artefaktu `git diff origin/main <szczyt>` PUSTY).
2. **Fala kontrolna** (D3 + D4): 14 Pogłębiaczy, potokiem (dział kończy audyt
   → wchodzi re-audyt tego działu), dwa tory środowiskowe (`postaw.sh` z
   `WP_PORT`/`MAILPIT_PORT`/`STACK_NAZWA`; pamięci starcza na DWA). Praca na
   gałęzi `re-audyt/sektor-re-audytu` (tam żyją sektory), po scaleniu `main`.
   Szacunek: **pół dnia do dnia** czasu zegarowego (fala 1 miała 72 h
   rozpiętości przez sekwencyjność całych sektorów; potok tnie to o połowę
   lub więcej). Zakres: WYŁĄCZNIE potwierdzenie, że 32 naprawy trzymają i nie
   przyniosły regresji — bez ról procesowych, bez raportu o aparacie.
3. Po fali: aktualizacja CLAUDE.md/README o wyniku, ewentualne poprawki,
   koniec projektu wg planu.

**Napraw kodu NIE ZOSTAŁO** — 32 z 33 wykonane, jedna (REA-PRIV-F1-001)
świadomie u właściciela/prawnika.
