# Naprawy po audycie fali 1 — stan, decyzje, co zostało

**Gałąź:** `fix/naprawy-audytu-f1` (od `main`, commity `a516fe4` … `2bd68b7`).
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

---

## Zrobione: 27 z 33

| Commit | Zakres |
|---|---|
| `a516fe4` | **Trzy czerwone**: cicha utrata treści lekcji, waluta USD w kasie, dostęp po skasowanym zamówieniu |
| `188cf2b` | **Wydajność**: 3× N+1, pamięć żądania, nagłówki cache lekcji i zasobów statycznych |
| `c174d66` | **Prywatność** (3), start wtyczki bez `try/catch`, **cykle w `aai-sklep`** (2 → 0) |
| `ce09189` | **Dokumentacja i wdrożenie**: README wtyczek, kolejność w `postaw.sh`, `readme.txt` ×3, narzędzie `wp:zapytania` |
| `5d4b875` | **Idempotencja produktu** (koniec duplikatów), **sito typu treści w kolektorze CSP** |
| `2bd68b7` | **Kontrola rozjazdu waluty**, podpisy kafelków zgodne z retencją, walidacja wejścia filtra CTA |

**Standard każdej naprawy** (bez wyjątku): pomiar PRZED → naprawa → pomiar PO →
**test negatywny** (cofnięcie naprawy musi zapalić pomiar) → bramki.
Dowody uruchomieniowe, nie z lektury.

**Stan bramek na koniec:** strażnicy **39/39**, `smoke:wp-front` 86,
`smoke:wp-produkty` 85, `smoke:wp-platnosci` 23, `wp:sprawdz` **73/73 co do
znaku**, `aai-platnosci sprawdz` kod 0.

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

## Co zostało: 6 pozycji

| ID | Rzecz | Stan |
|---|---|---|
| **AUD-ARCH-F1-003** | Cykl zależności w `aai-platnosci` | **DO ZROBIENIA — decyzja D6.** Cena policzona: nowa klasa-liść + zmiany w `cta.php`, `ustawienia.php`, `szew.php` + **przepisanie reguły 20 `straznik-platnosci-wp`** (powstała z powodu zmierzonej usterki produkcyjnej; po przeniesieniu metody przestałaby czegokolwiek pilnować) + jej mutacji w audycie. Weryfikacja: `smoke:wp-zakup`, `smoke:wp-zwroty`. Szacunek 1,5–2 h. **Dotyka ścieżki płatności.** |
| **REA-INT-F1-003** | Skasowanie zamówienia zostawia osierocone wpisy księgowe Tutora (`wp_tutor_earnings`) i notatki Woo (`wp_comments`) | otwarte |
| **AUD-ARCH-F1-001** | `Aai_Monitor_Podpis::sol()` pisze surowym SQL do `wp_options` (cudza tabela rdzenia) | otwarte; **obejście jest świadome** — `add_option()` ma udowodniony wyścig kasujący sól |
| **REA-BD-F1-001** | `Aai_Sklep_Tutor::synchronizuj_kurs()` — brak atomowości przy kopii do Tutora | otwarte; wzorzec naprawy jak przy `AUD-BD-F1-001`: **idempotencja, nie transakcja** |
| **REA-PRIV-F1-001** | Polityka prywatności na czterech publicznych stronach wypiera się ciasteczek, choć witryna je stawia | **NIE RUSZAMY** — treść prawna właściciela, wymaga prawnika. Pozycja „przed pierwszym klientem". |
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
- **Przerwane bramki kumulują ślady**: sprzątają wyłącznie od WŁASNEJ migawki,
  więc przebieg ubity w połowie zostawia wiersze, których następny nie usunie.

---

## NASTĘPNY KROK

1. **Skasować ślady testowe z monitoringu** (D5) — jawna lista identyfikatorów,
   powrót do 26 logowań i 30 wizyt.
2. **Rozciąć cykl w `aai-platnosci`** (D6).
3. Dokończyć trzy otwarte usterki (`REA-INT-F1-003`, `AUD-ARCH-F1-001`,
   `REA-BD-F1-001`) albo świadomie je odłożyć z zapisem.
4. **PR gałęzi `fix/naprawy-audytu-f1` → `main`**, tag, release.
5. **Fala kontrolna** (D3): 14 Pogłębiaczy, potokiem, dwa tory środowiskowe.
