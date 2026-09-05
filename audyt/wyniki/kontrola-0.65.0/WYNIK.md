# Fala kontrolna 0.65.0 — WYNIK (nośnik B, 14 Pogłębiaczy + 14 krytyków)

Data: 2026-09-05. Gałąź sektora `re-audyt/sektor-re-audytu` (HEAD `2f1aeb6` + zmiany R17),
kod produktu = `main` 0.65.0 (`381bc3b`). Wejście: **33 wpisy** w 11 działach
(`WEJSCIE.md`, policzone komendą). Przebieg krok po kroku: `PRZEBIEG.md`.
Werdykty poniżej są werdyktami PO KRYTYKU — tam, gdzie krytyk odrzucił werdykt roli,
liczy się ustalenie krytyka (dowód uruchomieniowy w pliku `<KOD>.md`).

## Tabela zbiorcza wpisów (33)

| Dział | Wpis | Werdykt roli | Werdykt po krytyku | Sedno |
|---|---|---|---|---|
| INT | AUD-INT-F1-001 | NAPRAWIONE | **NAPRAWIONE** | skasowane zamówienie cofa zapis Tutora, sprząta earnings i notatki |
| INT | REA-INT-F1-001 | NAPRAWIONE | **NAPRAWIONE** | także ścieżką Kosz → Usuń trwale |
| INT | REA-INT-F1-003 | NAPRAWIONE | **CZĘŚCIOWO** | zamówienie MIESZANE zostawia 1 earnings + 3 notatki; klasa tylko WYKRYWANA (`sprawdz` kod 1) |
| BE | AUD-BE-F1-001 | NIENAPRAWIONE | **NAPRAWIONE** (mechanizm) + regresja | try/catch jest; residuum = osobna klasa: statyczne wywołanie klasy bez `class_exists` (3 pliki/42, także `aai-platnosci`) → 500 na całej witrynie |
| BE | REA-BE-F1-001 | NAPRAWIONE | **NAPRAWIONE** | oba pola i pusta tablica → `bez_zmian` |
| BD | AUD-BD-F1-001 | NAPRAWIONE | **CZĘŚCIOWO** | okno między `wp_insert_post` a zapisem znacznika zostawia produkt-szkic bez met; `sync` tworzy drugi produkt; `sprawdz` kod 0 (niewykrywalne) |
| BD | REA-BD-F1-001 | NAPRAWIONE | **POTWIERDZONE + PILNOWANE** | commit BD dodał regułę strażnika, nie zmianę kodu |
| ARCH | AUD-ARCH-F1-001 | NAPRAWIONE | **NAPRAWIONE** | sól poza `wp_options`, także przy regeneracji |
| ARCH | AUD-ARCH-F1-003 | NAPRAWIONE | **NAPRAWIONE** | 0 cykli (Tarjan, kontrprzykład na `a516fe4~1`: 3 cykle) |
| ARCH | AUD-ARCH-F1-004 | NAPRAWIONE | **NAPRAWIONE** | jw. |
| ARCH | REA-ARCH-F1-002 | NIE DOTYCZY | **NIE DOTYCZY PRODUKTU** | wpis o aparacie audytu (`werdykt.mjs`) |
| ARCH | REA-ARCH-F1-003 | NAPRAWIONE | **NAPRAWIONE** | `array_merge` z całym kształtem |
| PERF | AUD-PERF-F1-001 | NAPRAWIONE | **NAPRAWIONE** | dowód roli mierzył pustkę; krytyk: 2 zapytania o lekcje na 12 modułów |
| PERF | AUD-PERF-F1-002 | NAPRAWIONE | **NAPRAWIONE** | `produkt_kursu()` 5 → 1 |
| PERF | AUD-PERF-F1-003 | NAPRAWIONE | **NAPRAWIONE** | mapa przed pętlą |
| PERF | AUD-PERF-F1-005 | NAPRAWIONE | **NAPRAWIONE** | no-store na lekcji płatnej, gość i klient |
| PERF | REA-PERF-F1-002 | NAPRAWIONE | **NAPRAWIONE** | jw. N+1 |
| PERF | REA-PERF-F1-003 | NAPRAWIONE | **NAPRAWIONE** | jw. pamięć żądania |
| PERF | REA-PERF-F1-004 | NAPRAWIONE | **NAPRAWIONE** | `mod_expires` działa na żywo (poza wpisem: 148 zrzutów bez `Cache-Control`) |
| PRIV | AUD-PRIV-F1-001 | NAPRAWIONE | **NIENAPRAWIONE** | `PRIVAUDYT_TajneHaslo123` → `PRI…(23 znaków)`; każde hasło bez znaku specjalnego = „kształt loginu”; także `/my-account/`; polityka twierdzi „nie zapisujemy haseł ani fragmentów” |
| PRIV | AUD-PRIV-F1-002 | NAPRAWIONE | **NAPRAWIONE** | trzy stany opcji polityki |
| PRIV | AUD-PRIV-F1-003 | NAPRAWIONE | **NAPRAWIONE** | deklaracja = zapis (pełny UA) |
| PRIV | REA-PRIV-F1-001 | NIENAPRAWIONE | **NIENAPRAWIONE — decyzja właściciela** | treść prawna, „przed pierwszym klientem” |
| PRIV | REA-PRIV-F1-002 | NAPRAWIONE | **NAPRAWIONE** | |
| FE | AUD-FE-F1-001 | NAPRAWIONE | **NAPRAWIONE** | podpisy kafelków zgodne z danymi |
| FE | AUD-FE-F1-002 | NAPRAWIONE | **NAPRAWIONE** | PLN na całej ścieżce, JSON-LD, Store API |
| FE | REA-FE-F1-002 | NAPRAWIONE | **NAPRAWIONE** | zasięg kompletny (2 twarde „zł”) |
| REPO | AUD-REPO-F1-009 | NAPRAWIONE | **NAPRAWIONE** | |
| SEC | REA-SEC-F1-003 | NIENAPRAWIONE | **NIENAPRAWIONE (naprawa częściowa, świadomie węższa, w repo nienazwana)** | `application/json` bez integralności → 204 + zapis; sufity: 60/min/IP, po 200 rodzajach prawdziwe naruszenia CSP giną |
| USP | AUD-USP-F1-001 | NAPRAWIONE | **NAPRAWIONE** | `zapytania-wp.mjs` powtarzalne (0 odchylenia mediany) |
| WDR | AUD-WDR-F1-002 | _(w toku)_ | | |
| WDR | AUD-WDR-F1-003 | _(w toku)_ | | |
| WDR | AUD-WDR-F1-004 | _(w toku)_ | | |

## Bilans (30 wpisów zamkniętych, 3 WDR w toku)

Stan po 12 działach (30 wpisów; WDR 3 wpisy w toku — rola przerwana limitem API):
- **NAPRAWIONE: 22** (INT 2, BE 1, BD 1 potwierdzone+pilnowane, ARCH 4, PERF 7, PRIV 3, FE 3, REPO 1, USP 1 — bez PRIV-001 i BD/INT częściowych)
- **CZĘŚCIOWO (klasa żyje w węższym oknie, tylko wykrywana): 3** — REA-INT-F1-003 (mieszane), AUD-BD-F1-001 (okno znacznika), REA-SEC-F1-003 (kolektor CSP; naprawa świadomie węższa, nienazwana w repo)
- **NIENAPRAWIONE: 2** — AUD-PRIV-F1-001 (fragmenty haseł w dzienniku — czynny wyciek), REA-PRIV-F1-001 (decyzja właściciela, treść prawna)
- **NIE DOTYCZY PRODUKTU: 1** — REA-ARCH-F1-002
- **Regresje/nowe klasy z rund: 11** (lista niżej), w tym jedna średnia (500 z jednego pliku) i jedna z dowodów (ślepe asercje).
- Werdykty krytyków: PRZEPUSZCZAM 4 (ARCH, FE, USP, SEC-wpis), ODRZUCAM 8 (BE, INT, BD, REPO, PIK, PERF, PRIV, QA) — w SIEDMIU z ośmiu odrzuceń werdykt wpisu został potwierdzony, a odrzucenie dotyczy dowodu/zasięgu roli; w JEDNYM (PRIV) krytyk odwrócił werdykt NAPRAWIONE → NIENAPRAWIONE.
**M > 0 → naprawy zwykłą drogą od `main`** — plan: `PLAN-DO-NIEDZIELI.md`.

## Regresje i nowe klasy znalezione przez rundy (wszystkie POZA wejściem, nie naprawiane)

1. **BE / krytyk BE** — statyczne wywołanie klasy wtyczki bez `class_exists()` z zarejestrowanego haka albo z poziomu pliku: uszkodzenie JEDNEGO pliku klasy = HTTP 500 na całej witrynie. Zmierzone 3 pliki na 42 (`class-aai-sklep-tutor.php`, `class-aai-sklep-moje.php`, `class-aai-platnosci-ustawienia.php`). Try/catch z 0.65.0 tego nie obejmuje.
2. **krytyk BD** — okno bez znacznika przy tworzeniu produktu Woo: `sync` po przerwaniu tworzy drugi produkt, kontrola tego nie widzi (pyta o inną metę).
3. **krytyk INT** — sprzątanie po skasowanym zamówieniu pomija zamówienia mieszane (zamek 1 `same_kursy()`); klasa wykrywana, nie usunięta. Rundę R2 roli oślepiał wzorzec: `class-aai-sklep-tutor.php:305` też robi `wp_delete_post(…, true)`.
4. **krytyk PRIV** — maska loginu przepuszcza każde hasło bez znaku specjalnego (prefiks 3 znaki + długość) — czynny wyciek fragmentów haseł do dziennika 90-dniowego, przez `wp-login.php` i formularz Woo; zdanie polityki nieprawdziwe.
5. **krytyk SEC** — dziennik logowań przyjmuje anonimowe `POST /wp-login.php` bez limitera i sufitu (28 wierszy w 1,4 s) — zapis to decyzja D6, brak sufitu nieodkryty; kolektor CSP: po 200 rodzajach prawdziwe naruszenia giną po cichu.
6. **REPO / krytyk REPO** — README: liczniki „Gdzie co leży” 135/18/140 vs 136/19/141; `README.md:52` „33 potwierdzone usterki NAPRAWIONE” wobec „32 z 33”; `aai-sklep` zmieniony w 0.65.0 (9 plików) bez podbicia wersji `0.6.0`; nagłówek `straznik-readme` opisuje 6 reguł przy 8; komenda `sieroty` bez wiersza w `wordpress/README.md`.
7. **krytyk QA** — dwie asercje `smoke-wp-zakup` „zamek 1 nie trzyma” są ŚLEPE (zdjęcie zamka → 58/58); 6 z 17 nowych gałęzi strażników bez dedykowanej mutacji w audycie (wszystkie żyją).
8. **krytyk PERF** — 148 zrzutów z `uploads/` oddaje 200 bez `Cache-Control` (poza miejscem wpisu).
9. **krytyk PIK** — procedura WYTYCZNE §1 (`.bak` + rejestr błędów) nieużywana od 0.59.0: 11 wydań bez wpisu do rejestru, 15 bez `bak/*` — utrwalona praktyka, nie regresja 0.65.0.
10. **krytyk USP** — `zapytania-wp.mjs` zostawia ślad `recently_activated` w `wp_options`; przerwanie sygnałem zostawia `active_plugins` z dziurą; narzędzie nie mierzy sesji zalogowanej.
11. **orkiestracja (WDR)** — `postaw.sh` na świeżej instancji pada: najnowsze Woo z wp.org wymaga WP 7.0 przy obrazie 6.9.4 (patrz WDR.md).

## Czego fala NIE zrobiła (nazwane, nie przemilczane)

- Nie mierzy powtarzalności (D1), nie uruchamia ról procesowych, nie składa zgłoszeń, nie naprawia.
- Pełny audyt mutacyjny strażnika sektora (R17) — NIEZROBIONY (nie mieści się w 10 min, przerwany; celowany przebieg 13 mutacji kod 0); do zrobienia w tle po fali.
- Ślady poza bazą: dzienniki `uploads/wc-logs/` rosną przy każdej roli z pocztą/fatalem; przywracanie z `srodowisko.mjs` tego nie obejmuje — kasowane ręcznie jawną ścieżką (PRZEBIEG.md).

## Usterki narzędzi sektora ujawnione przez dwa tory (nie produktu)

- `srodowisko.mjs --test` (R31) ślepy na tory: każdy `podman exec` = „ktoś pracuje”.
- `srodowisko.mjs` bierze kontener ze `STACK_NAZWA`, nie z `WP_PORT`.
- Samokontrole narzędzi (`status.mjs --test`, `porownaj-cykle --test`, `werdykt --test`) używają plików tymczasowych o stałych nazwach — kolidują przy pracy równoległej; audyt mutacyjny sektora ubity limitem zostawia mutację (SIGTERM omija `finally`).
- Oba tory dzielą bind mount `wordpress/wtyczki/` i jeden `.env` — mutacje plików i `wp:klient` są widoczne/skuteczne na obu torach naraz.
