# Weryfikacja planu sprzed budowy — pozycja po pozycji (2026-09-02)

Polecenie właściciela nr 2 po E7.6: sprawdzić **cały plan** zatwierdzony
2026-09-01 (`~/.claude/plans/projekt-pod-strona-szkolenia-stateless-wilkinson.md`,
wersja 4, 438 linii) wobec stanu repo — punkt po punkcie, wynik tabelą
„pozycja → zrobione / brak → dowód komendą". Sprawdzone także: definicja
ukończenia z `PLAN-BUDOWY.md` (11 pozycji), `REGULAMIN.md` (16 punktów
+ rozstrzygnięcia D/P/W/K) i pomiary E1–E7.

Komendy uruchamiane na gałęzi `re-audyt/sektor-re-audytu` (commit po poleceniu 1),
kody wyjścia **bez potoku**. Legenda: ✅ zrobione · ⚠️ częściowo albo inaczej
niż w planie (z uzasadnieniem) · ❌ brak.

## Bilans

| | Liczba |
|---|---|
| Pozycji sprawdzonych | **123** |
| ✅ zrobione zgodnie z planem | **106** |
| ⚠️ częściowo / inaczej niż w planie | **15** |
| ❌ brak | **2** w tabelach (trzeci brak — dziennik wejść — liczy się jako ⚠️ przy D9, W5 i K9′, bo zapis istnieje, egzekucji nie ma) |

**Trzy braki (nie do odhaczenia bez pracy):**

1. **Ślepota fali 2, warstwa 1 („zakaz w prompcie")** stoi WYŁĄCZNIE
   w `AGENT.md` kierownika — żaden z 14 działów ani żaden Pogłębiacz nie ma
   w definicji zdania zakazującego czytania `audyt/zgloszenia/` fali 1, a każdy
   ma `Read`, `Grep` i `Bash`. Warstwa 2 (czysty kontekst) jest własnością
   harnessu, warstwa 3 (`porownaj-cykle.mjs`) łapie tylko kopię co do słowa.
2. **„Dziennik wejść"**, na który powołuje się pozycja KIER-05 (W5, K9′: re-audyt
   wchodzi dopiero po wyjściu audytu), **nie istnieje**: pliki `audyt/stan/*.json`
   nie mają ani jednego znacznika czasu, żadne narzędzie nie rejestruje kolejności
   wejść. Reguła nakładania żyje tylko w prompcie kierownika.
3. **Mapa reguła → mutacja nie istnieje**, więc pozycji 8 definicji ukończenia
   („test negatywny KAŻDEJ nowej kontroli") nie da się udowodnić komendą: strażnik
   ma 22 kontrole, audyt mutacyjny 66 mutacji, ale komentarze mutacji wymieniają
   wprost tylko 11 numerów reguł. Reszta pokrycia jest wiedzą z sesji, nie
   artefaktem.

Pełne tabele niżej. Odstępstwa ⚠️ są w większości udokumentowane w repo w chwili
ich powstania (skąd wzięła się różnica, jest napisane przy pozycji).

---

## A. „Fakty — zmierzone 2026-09-01" (tabela planu)

| Pozycja planu | Stan | Dowód komendą |
|---|---|---|
| Kod wtyczek: 24 144 linie, 107 plików PHP, 54 klasy (28/13/13) | ✅ | `find wordpress/wtyczki -name '*.php' \| wc -l` → **107**; `… -print0 \| xargs -0 cat \| wc -l` → **24144**; klasy grepem `^\s*(final \|abstract )?class\s+\w+` → **54** (sklep 28, płatności 13, monitor 13) |
| Szablony PHP: 37 | ✅ | `find wordpress/wtyczki -path '*/szablony/*' -name '*.php' \| wc -l` → **37** |
| Prototyp Next.js: 15 371 linii, 106 plików TS/TSX | ✅ | `git ls-files '*.ts' '*.tsx' \| wc -l` → **106**; `… \| xargs cat \| wc -l` → **15371** (liczba obejmuje `tools/` i testy; sam `app/components/lib/modules` to 88 plików / 10 505 linii — plan liczył wszystko i tak zostało) |
| Strażnicy: 39 (nie 40) | ✅ | `ls tools/straznicy/straznik-*.mjs \| wc -l` → **39**; pre-commit tej sesji: „Strażnicy: wszyscy zaliczeni (39)" |
| Mutacje: 340 | ✅ | `grep -c "^\s*opis:" tools/straznicy/audyt-straznikow.mjs` → **340** |
| Testy jednostkowe: 83 (nie 89) | ✅ | `grep -rhoE "^\s*(test\|it)\(" --include='*.test.*' --exclude-dir=node_modules . \| wc -l` → **83** |
| Bramki smoke: 25 (7 w check, 15 WP, 3 pomocnicze) | ✅ | `ls tools/smoke/smoke-*.mjs \| wc -l` → **15** (WP); `grep -o '"smoke[^"]*"' package.json` → 16 skryptów (`smoke` + 15 `smoke:wp-*`); 7 smoke'ów prototypu w `npm run check` — wynik `npm run check` w sekcji F |
| Szwy: 7 (`aai_sklep_dostepnosc_kursu` wieloliniowy) | ✅ | grep jednoliniowy `(do_action\|apply_filters)\(\s*'aai_…'` → **6** nazw; siódma potwierdzona: `grep -n aai_sklep_dostepnosc_kursu …/class-aai-sklep-seo.php` → linia **293** (wywołanie rozbite na linie, jak mówi plan) |
| `.claude/` w repo nie istnieje — budujemy od zera | ✅ | `git ls-files .claude \| wc -l` → **0** (generat poza gitem, `git check-ignore` potwierdza); na dysku `ls .claude/agents \| wc -l` → **80** |
| `CLAUDE.md`: 237 476 B, 3384 linie | ⚠️ | `git show main:CLAUDE.md \| wc -c` → **239 569 B**, **3415 linii** — urósł po planie (PR #119 `docs/stan-audytu`, 2026-09-01). Liczba w planie była prawdziwa w chwili pomiaru; wniosek planu (brief zamiast `CLAUDE.md`) się nie zmienia |
| Dokumentacja techniczna: 65 MB, 3244 pliki (w gicie 75) | ✅ | `du -sh docs/dokumentacja-techniczna` → **65M**; `find … -type f \| wc -l` → **3244**; `git ls-files … \| wc -l` → **75** |
| Przeglądarki: tylko Firefox; Chrome dokładamy | ✅ | `ls ~/.cache/aai-narzedzia` → `chrome-linux64/`; `DOKUMENTACJA.md:83` „Google Chrome for Testing 152.0.7977.64", `:95` „Sterowanie sprawdzone POMIAREM" |

## B. Decyzje właściciela (D, P, W, K′)

| Decyzja | Stan | Dowód komendą |
|---|---|---|
| D1 agenci wykonywalni ORAZ udokumentowani (generat ze źródła) | ✅ | `node audyt/tools/generuj-agentow.mjs --sprawdz` → „Generat zgodny ze źródłem: 80 definicji", kod 0; źródła: `ls audyt/role/*/AGENT.md \| wc -l` → 19, `re-audyt/…` → 21 |
| D2 dwóch kierowników, po jednym na sektor, obaj z krytykami | ✅ | `grep -n "^## KIER" audyt/ROLE.md re-audyt/ROLE.md` → dwa nagłówki; `ls .claude/agents/*kier*` → `aud-kier`, `aud-kier-krytyk`, `rea-kier`, `rea-kier-krytyk` |
| D3 krytyk przy KAŻDEJ roli; krytycy z 7 rodzajami dokumentacji | ✅ | `ls .claude/agents/*-krytyk.md \| wc -l` → **40** = 19 + 21; `audyt/szablony/KRYTYK.md:61` „Krytyk dostaje wszystkie siedem rodzajów dokumentacji (D3)"; strażnik: „krytyków z drogą zgłaszania: 40" |
| D4 zakres: wtyczki + prototyp + bramki + repo; KURSY POZA | ✅ | `audyt/tools/mapa.mjs:38-39` wyklucza `tresc-kursow` z powodem „D4"; `node audyt/tools/mapa.mjs` → „wykluczone 399 (D4…)", SIEROTY 0; `BRIEF-PROJEKTU.md:188` |
| D5 błędy prototypu → osoba sprawdzająca projekt | ✅ | `audyt/role/PROTO/AGENT.md:77` „TWÓJ WYNIK IDZIE OSOBNO (D5)"; `audyt/role/RAP/AGENT.md:231` pozycja RAP-05 |
| D6 działy: 7 ze schematu + 7 naszych | ✅ | `grep -n "^## [A-Z]* — " audyt/ROLE.md` → 19 nagłówków, z czego 14 działów (SEC FE BE BD QA PERF ARCH · INT PRIV REPO WDR PROTO PIK USP) + 5 ról procesowych |
| D7 sektory tylko na branchach, nigdy na `main`, zostają | ✅ | `git merge-base --is-ancestor audyt/sektor-audytu main` → **1** (nie jest przodkiem), to samo dla re-audytu; `git branch -r` → obie gałęzie na zdalnym; merge'ów sektorów do `main`: **0** |
| D8 model: kierownicy i krytycy Opus, reszta Sonnet — **zmienione 2026-09-02** (KIER i KON obu sektorów → Fable 5.1) | ✅ | `grep -l "^model: fable" .claude/agents/*.md \| wc -l` → **4**; `opus` → **45**; `sonnet` → **31**; strażnik: „modeli generatów zgodnych z ROLE.md: 80" (patrz `PLAN-BUDOWY.md`, „Polecenie 1 — wykonane") |
| D9 komplet AUDYTU, potem komplet RE-AUDYTU | ⚠️ | Zapisane w REGULAMIN §17 i u obu kierowników (`audyt/role/KIER/AGENT.md:83-85`, `re-audyt/role/KIER/AGENT.md:3`). **Nie egzekwuje tego żadne narzędzie** — patrz brak nr 2 (dziennik wejść) |
| D10 uruchomienie na zielone światło | ✅ | `PLAN-BUDOWY.md:454` wiersz E8 = STOP ⬜; żaden sektor nie uruchomiony (`audyt/zgloszenia/` = 3 wpisy PRÓBNE z E6/E7.6, oznaczone) |
| P1 Konrad łamie założenia W AUDYCIE | ✅ | `audyt/role/KON/AGENT.md:139` „Audytujesz AUDYT, nie projekt (P1)"; fazy A/B `:202`, `:205`; faza A wykonana na zakresach `:211` |
| P2 re-audyt bardziej szczegółowy, nie lustrzany | ✅ | `re-audyt/ROLE.md:19-22` tabela Pytanie/Metoda/Dowód/Zasięg; role bez odpowiednika w audycie: PSIARZ, SKUT, STRAZ, WALID (`grep "^## " re-audyt/ROLE.md`) |
| P3 dokumentacja specjalistyczna per rola | ✅ | `grep -l "Zestaw specjalistyczny" audyt/role/*/AGENT.md \| wc -l` → **19/19**; `DOKUMENTACJA.md:48` sekcja „Zestaw SPECJALISTYCZNY — per rola (P3)" |
| P4 dokumentacja agentowa z wielu AI („Anthropic, OpenAI, Google i inni") | ⚠️ | `ls ~/.cache/aai-audyt-dokumentacja/agentowa` → `anthropic-llms.txt`, `openai-agents.md`, `google-gemini-narzedzia.md` — **trzej** dostawcy, „i inni" nie; `DOKUMENTACJA.md:22` mówi to wprost |
| W1 wartości obu sektorów → raport | ✅ | `ls audyt/role/RAP re-audyt/role/RAP` → komplet 4 plików w obu; `audyt/migawki/{przed,po}.json` |
| W2 sektory NIE naprawiają | ✅ | `grep -h "^tools:" .claude/agents/*.md \| sort \| uniq -c` → **80 × `Read, Grep, Glob, Bash`** (bez Write/Edit); zasada 2 dosłownie w 80/80 generatach (sekcja B, W9); K3 zapisany w `generuj-agentow.mjs:15-19` |
| W3 agenci pętlowi | ✅ | `audyt/tools/wspolne.mjs:39` `SUFIT_RUND = 5`; `status.mjs --runda`; `status.mjs --pokaz` → „runda 1/5" + lista NIEDOMKNIĘTYCH |
| W4 wyniki: mało → plik, dużo → baza | ⚠️ | Plik: `audyt/zgloszenia/*.json`, `audyt/wyniki/polaczone-f1.json`. Próg **200** w `wspolne.mjs:36` (rozstrzygnięty przez właściciela), `polacz-sektory.mjs:74` i `zgloszenie.mjs:337` **ostrzegają** po przekroczeniu — **warstwa zapisu SQLite nie istnieje** (świadomie: `node:sqlite` jest w node 26, przejście „nie dokłada zależności", `PLAN-BUDOWY.md:1313-1316`) |
| W5 audyt wychodzi z działu → re-audyt wchodzi | ⚠️ | Zapis: REGULAMIN §17, `audyt/role/KIER/AGENT.md:254` KIER-05 „dziennik wejść". **Dziennika nie ma** — `grep -rn "dziennik wej" audyt/tools/` → 0; `cat audyt/stan/re-audyt-f1-SEC.json` → pola `sektor, fala, rola, status, runda, niedomkniete`, zero znaczników czasu (brak nr 2) |
| W6 mapa przed i po | ✅ | `ls audyt/migawki` → `przed.json`, `po.json`; `node audyt/tools/migawka-wartosci.mjs --porownaj` → „Migawki identyczne", kod 0; `mapa.mjs` → SIEROTY 0 |
| W7 dział „co było na początku, ma być na końcu" | ✅ | `ls audyt/role/PIK re-audyt/role/PIK` → komplet; `ROLE.md:466` sekcja PIK z odwołaniami do WYTYCZNE, W1–W6, P0–P6, T0–T4, §2.4 |
| W8 dział „Usprawnienia audytowe" — narzędzia | ✅ | `ls audyt/role/USP re-audyt/role/USP` → komplet; USP-01…USP-08 (`ROLE.md:508-515`) |
| W9 „NIE MA WYMYŚLANIA BŁĘDÓW" w każdym agencie | ✅ | pętla `grep -q` po trzech zasadach w 80 generatach → **0 braków**; strażnik reguła 6 (`straznik-sektora-audytu.mjs:151`) pyta o ZDANIE z zakazem, nie o nagłówek |
| W10 drążyć do miejsca, nie przekazywać, nie naprawiać | ✅ | zasada 3 dosłownie w 80/80 generatach (ten sam pomiar co W9); REGULAMIN §7 + doprecyzowanie `:143` |
| K4′ druga fala musi dać ten sam wynik; rozjazd = defekt audytu | ✅ | `audyt/tools/porownaj-cykle.mjs:4-6, 18` (kod 1 = rozjazd = DEFEKT); `node …/porownaj-cykle.mjs` → „Porównanie wymaga obu fal" (zachowanie poprawne przed E8) |
| K9′ równoległość wewnątrz sektora, nigdy na tym samym dziale | ⚠️ | `audyt/role/KIER/AGENT.md:85` — w prompcie. `grep -n "tym samym dziale" audyt/tools/status.mjs` → 0: **żadne narzędzie nie odmówi** wejścia re-audytu do działu, w którym audyt jest `W TRAKCIE` (brak nr 2) |
| K10′ miejsce: linia ALBO plik + zakres + mechanizm | ✅ | `audyt/tools/zgloszenie.mjs:89-124` (`rodzaj` ∈ {linia, mechanizm}; mechanizm MUSI nazwać, czego brakuje); `zgloszenie.mjs --test` → 18/18, w tym obie formy |
| K11′ Chrome | ✅ | jak w sekcji A; USP-01 i USP-03 w checkliście |
| K12′ komunikacja wg schematu właściciela z naszymi działami | ✅ | schemat ASCII w `audyt/REGULAMIN.md:49-101` (§4, wiersze z SECURITY/FRONTEND/KONRAD/GOLDEN); kolejność zbierania `STRUKTURA.md:369` „kierownik zbiera → RAP" |

## C. Struktura (schemat, zakresy, granice, Konrad)

| Pozycja planu | Stan | Dowód komendą |
|---|---|---|
| 7 ze schematu + 7 naszych = 14 działów | ✅ | sekcja B, D6 |
| migracja danych w dziale „Baza danych" (nie 15. dział) | ✅ | `ROLE.md:179` „## BD — Baza danych i migracja"; 14 działów, nie 15 |
| zakres Security (nonce, capability, escaping, SQL, XSS, obwód, CSP, limiter, brama) | ✅ | grep słów kluczowych w `ROLE.md:83-116` → nonce 3, uprawnien 3, SQL 2, obwód 4, CSP 1, limiter 3, brama 2, uciek 1 |
| zakres Frontend (37 szablonów, assets, kolektor, kaskada, dostępność) | ✅ | `ROLE.md:116-148` → 37, kolektor 2, kaskada 2, warstw 1, dostępność 1 |
| zakres Backend (3 warstwy zapisu, haki, kontrakty, cykl żądania) | ✅ | `ROLE.md:148-179` → warstwy zapisu, hak 4, kontrakt 4, cykl 1 |
| zakres BD (dbDelta, transakcje, indeksy, Postgres↔tabele↔Tutor↔Woo, idempotencja, cicha utrata) | ✅ | `ROLE.md:179-211` → dbDelta, transakc 3, indeks 2, idempot 2, Postgres, Tutor 2, Woo, „cich" 1 |
| zakres QA (39/340/25/83 — czy mierzą, co obiecują) | ✅ | `ROLE.md:211-251` → wszystkie cztery liczby obecne |
| zakres Performance (zapytania na odsłonę, N+1, cache, waga) | ✅ | `ROLE.md:251-279` → zapyta 4, N+1 2, cache 2, wag 1 |
| zakres Architekt (granice, 7 szwów, cykle, źródło prawdy, schematy) | ✅ | `ROLE.md:279-307` → „7 szw" 2, cykl 3, źródło prawdy 2, schemat 6 |
| zakres Integracje (Tutor 4.0.7, Woo 11, motyw; wersje) | ✅ | `ROLE.md:307-338` → 4.0.7, motyw 5, wersj 2 |
| zakres Prywatność (IP, retencja 90 dni, polityka, zobowiązania handlowe) | ✅ | `ROLE.md:338-368` → retencj 2, polityk 6, zobowiązan/handlow |
| zakres Prawda repo (README, CLAUDE.md, CHANGELOG, schematy vs kod, **instrukcja i paczki ZIP**) | ⚠️ | `ROLE.md:368-402` → README 8, CLAUDE.md 2, CHANGELOG 3, schemat 4; **instrukcja i paczki ZIP poszły do WDR** (`ROLE.md:410` `tools/pakuj-wtyczki.mjs`, WDR-02 `npm run pakuj + unzip -t`). Przesunięcie między działami, nie luka — `mapa.mjs` → SIEROTY 0 |
| zakres Wdrożenie (instalacja, aktywacja/uninstall, zależności, postaw.sh) | ✅ | `ROLE.md:402-433` → instalac 3, aktywac 1, uninstall 2, zależno 3, postaw.sh 2 |
| zakres Prototyp (15 371 linii; wynik D5) | ✅ | `ROLE.md:433-466` → „15 371", D5 |
| zakres Początek i koniec (PLAN.md §2.4, WYTYCZNE, decyzje, D1–D7/W1–W6/P0–P6/T0–T4) | ✅ | `ROLE.md:466-494` → §2.4, WYTYCZNE, W1–W6, P0–P6, T0–T4, bramki B1–B7 (obietnice D1–D7 opisane przez bramki) |
| zakres Usprawnienia (npm run check, 15 bramek WP, Lighthouse przez PSI, Chrome DevTools, rig, audyt mutacyjny) | ⚠️ | USP-01…08 (`ROLE.md:508-515`): Chrome, zapytania na odsłonę, CDP, audyt mutacyjny na wskazanym strażniku, CI, zliczanie klasy, rig poza package.json, kody wyjścia. **Lighthouse/PSI nie ma w USP — jest w PERF-08** (`ROLE.md:272`). Przesunięcie, nie luka |
| tabela granic obowiązkowa: 6 par (SEC↔PRIV, BE↔BD, QA↔USP, ARCH↔REPO, ARCH↔PIK, FE↔PROTO) | ✅ | `grep -n "SEC ↔ PRIV\|BE ↔ BD\|QA ↔ USP\|ARCH ↔ REPO\|ARCH ↔ PIK\|FE ↔ PROTO" audyt/GRANICE.md` → **6/6** (linie 43, 45, 51, 53, 55, 56); par razem **34** (próg ≥5 wspólnych plików, `PLAN-BUDOWY.md:1462`); `re-audyt/GRANICE.md` → 8 par |
| Konrad: faza A (zakresy) przed pracą działów, faza B (wyniki) po raportach | ✅ | `audyt/role/KON/AGENT.md:202, 205`; faza A wykonana przed pierwszym agentem (`:211`) |

## D. Przebieg, re-audyt, zgłoszenie, nośnik, mapa, dokumentacja, kod

| Pozycja planu | Stan | Dowód komendą |
|---|---|---|
| przebieg MAPA PRZED → cykl 1 → cykl 2 → porównanie → naprawa → MAPA PO | ✅ (zapis) | `STRUKTURA.md:369-382` tabela komend per etap; `REGULAMIN.md:290-320` §14; narzędzia: `migawka-wartosci`, `mapa`, `polacz-sektory`, `porownaj-cykle` — `ls audyt/tools` → 12 plików |
| reguła nakładania (K9′) | ⚠️ | jak w B (tylko w prompcie) |
| RE-AUDYT: 21 ról, 42 agentów; Pogłębiacz ×14, Psiarz, Skutki, Strażnikowy, Walidacja, Raport, Konrad, kierownik | ✅ | `grep -c "^## [A-Z]* — " re-audyt/ROLE.md` → **21**; `ls re-audyt/role/*/{AGENT,KRYTYK,SKILL}.md \| wc -l` → 63 + 21 goldenów; generatów `rea-*` → 42 |
| AUDYT: 19 ról, 38 agentów; oba sektory 40/80 | ✅ | 19 + 21 = 40 ról; `ls .claude/agents/*.md \| wc -l` → **80** |
| „Psy" używają audytu mutacyjnego | ✅ | `re-audyt/role/PSIARZ/AGENT.md` (grep „mutac" w `re-audyt/ROLE.md` → 50 trafień) |
| zgłoszenie: ID nadaje `zgloszenie.mjs` | ✅ | `zgloszenie.mjs --test` → „ID cudzy sektor NIE podbija numeru", „re-audyt NIE nadpisuje wpisu audytu"; 18/18 |
| zgłoszenie: 5 statusów | ✅ | `audyt/tools/wspolne.mjs:41-47` `STATUSY` = NIE ROZPOCZĘTO / W TRAKCIE / DO WERYFIKACJI / ZWERYFIKOWANE / ZAKOŃCZONE |
| zgłoszenie: agent/dział, stwierdzenie jednoznaczne, miejsce, dowód + hash, klasyfikacja, wpływ | ✅ | `zgloszenie.mjs:29` `WYMAGANE = [sektor, fala, dzial, pozycja, stwierdzenie, miejsce, dowod, klasyfikacja, wplyw]`; `:70` odrzuca zwroty niepewności; `wspolne.mjs:178` `hashMiejsca()` sha256 |
| nośnik: do ~200 JSON w repo, powyżej SQLite; próg do akceptacji | ⚠️ | próg 200 zaakceptowany (`PLAN-BUDOWY.md:1313`); SQLite — patrz W4 |
| łączenie audyt+re-audyt po hashu miejsca | ✅ | `audyt/tools/polacz-sektory.mjs`; `audyt/wyniki/polaczone-f1.json` istnieje po próbach |
| `migawka-wartosci.mjs`: liczby bramek, sumy kontrolne, stan tabel, wp:sprawdz, wp:tutor, git diff; rozjazd = zatrzymanie | ✅ | `--porownaj` → „Migawki identyczne — audyt niczego nie zmienił w projekcie", kod 0 |
| `mapa.mjs`: każdy plik z działem, sierota = niczyj | ✅ | `node audyt/tools/mapa.mjs` → „711 + 399 = 1110 / 1110, SIEROTY 0, sprzeczne 0", kod 0; definicja obszaru = `git ls-files` (`mapa.mjs:38, 42`) — K2 |
| 7 rodzajów dokumentacji — wszystkie dociągnięte | ✅ | `DOKUMENTACJA.md:14-24` tabela: 7/7 ✅ po E3; `ls ~/.cache/aai-audyt-dokumentacja` → `agentowa cudzy-kod mdn narzedzia owasp php prawo`; 4944 pliki / 44 MB poza drzewem |
| specjalistyczna przez deklarację w `AGENT.md` | ✅ | 19/19 „Zestaw specjalistyczny" (sekcja B, P3) |
| skrypt pobierający idempotentny, z manifestem `KATALOG_DZIALU`/`KATALOGI_MASOWE` | ✅ | `grep -n "export const KATALOG_DZIALU\|export const KATALOGI_MASOWE" audyt/tools/pobierz-dokumentacje-audyt.mjs` → linie 63, 64; `straznik-wagi-dokumentacji` zielony (pre-commit) |
| BRIEF-PROJEKTU.md ~400 linii | ✅ | `wc -l audyt/BRIEF-PROJEKTU.md` → **299** linii, **15 685 B** (wobec 239 569 B `CLAUDE.md`) |
| skrypty: zgloszenie, status, migawka-wartosci, mapa, porownaj-cykle, polacz-sektory, generuj-agentow (7) | ✅ | `ls audyt/tools` → wszystkie 7 + `werdykt.mjs`, `wspolne.mjs`, `pobierz-dokumentacje-audyt.mjs`, strażnik, audyt mutacyjny = **12** |
| katalog `tools/audyt/` | ⚠️ | jest `audyt/tools/` — `ls tools/audyt` → nie istnieje. Powód zapisany w `STRUKTURA.md:140` (wszystko, co należy do sektora, w jednym katalogu, żeby niezmiennik był jedną komendą) |
| strażnik sektora: 7 kontroli (branch, krytyk, 5 elementów, generat sha256, dowód+kod+miejsce, 3 zasady, mechaniczny zakres) | ✅ | `grep -c "^/\* ── [0-9]" audyt/tools/straznik-sektora-audytu.mjs` → **22** kontrole (7 z planu + 15 dołożonych po drodze); reguła 7 = `:195` |
| „plus mutacje w audycie mutacyjnym" | ✅ | `node audyt/tools/audyt-straznika-sektora.mjs` → „Mutacje sektora: 66, przeoczone: 0, martwe/złe: 0", kod 0 |
| ślepota cyklu 2 — trzy warstwy: zakaz w prompcie, czysty kontekst, kontrola w `porownaj-cykle.mjs` | ❌ warstwa 1 | warstwa 3: `porownaj-cykle.mjs:11-15` (kopia co do słowa = podejrzenie); warstwa 2: własność harnessu; **warstwa 1**: `grep -n -i "fal" .claude/agents/aud-sec.md` → 9 trafień, **żadne nie jest zakazem czytania wyników fali 1**; zakaz stoi tylko w `audyt/role/KIER/AGENT.md:225` (brak nr 1) |

## E. Etapy budowy

| Etap | Stan | Dowód komendą |
|---|---|---|
| E0 zaległość CI: „dependabot PR #106 zielony, gitleaks potwierdzony" | ⚠️ | `gh pr view 106 --json state` → **CLOSED, niezmergowany** (zastąpiony przez #118); E0 wykonane przez #117 (naprawa) + #118 — `PLAN-BUDOWY.md:446`; `gh run list --branch main -L 3` → 3 × `success` (2026-09-01); gitleaks w tych przebiegach |
| E1 utrwalenie: branch, REGULAMIN.md, pamięć | ✅ | `git branch -r \| grep audyt` → `origin/audyt/sektor-audytu`; `grep -c "^## " audyt/REGULAMIN.md` → 22 sekcje (16 punktów + rozstrzygnięcia); `ls ~/.claude/…/memory \| grep audyt` → `audyt-koncowy-nastepny-krok.md` |
| E2 szkic ról + tabela granic | ✅ | `ROLE.md` 19 ról; `GRANICE.md` 34 pary; wiersz STANU BUDOWY: zaakceptowane 2026-09-01 |
| E3 dokumentacja 7 rodzajów + Chrome | ✅ | sekcje A i D |
| E4 szkielet: STRUKTURA, DOKUMENTACJA, szablony, tools, strażnik + mutacje | ✅ | `ls audyt/szablony` → `AGENT.md golden.md KRYTYK.md SKILL.md` (4); `ls audyt/tools` → 12; strażnik + audyt mutacyjny kod 0 |
| E5 19 ról × 4 pliki (76) | ✅ | `ls audyt/role/*/AGENT.md \| wc -l` → 19; KRYTYK 19; SKILL 19; `ls audyt/role/*/goldeny/* \| wc -l` → 19 |
| E6 generat + próba na sucho jednej roli | ✅ | `grep '"status"' audyt/zgloszenia/AUD-PIK-001.json` → **ZWERYFIKOWANE**; `status.mjs --pokaz` → PIK i WER `ZAKOŃCZONE` |
| E7 sektor RE-AUDYT: branch, 21 ról + psy | ⚠️ | zrobione (sekcja D), `git branch -r` → `origin/re-audyt/sektor-re-audytu`; próba E7.6 `REA-SEC-001` → ZWERYFIKOWANE. **Akceptacja właściciela nie padła wprost** (`PLAN-BUDOWY.md:453` „CZEKA NA AKCEPTACJĘ") |
| E8 STOP | ✅ (czeka) | wiersz ⬜; nic nie uruchomione |
| „Commity na branch, żadnego PR-a ani merge'a (D7, D9)" | ⚠️ | PR-ów: 0; merge'ów do `main`: 0. **Merge'ów MIĘDZY gałęziami sektorów: 6** (`git log --merges main..HEAD \| wc -l`) — polecenie właściciela: cherry-pick zmian `audyt/` na gałąź audytu i merge z powrotem; litera planu tego nie przewidywała, cel (nic na `main`) zachowany |
| akceptacje po drodze: każdy etap E1–E7, próg plik→baza, limit rund, tabela granic, BRIEF, szkic każdej roli | ⚠️ | E1–E6 ✅ (wiersze STANU BUDOWY z datą i cytatem); próg 200 i sufit rund 5 ✅ (`PLAN-BUDOWY.md:1313`); tabela granic i BRIEF ✅ (E2/E3); **E7 bez akceptacji wprost** |

## F. Definicja ukończenia sektora (11 pozycji)

| # | Pozycja | Stan | Dowód komendą |
|---|---|---|---|
| 1 | strażnik → kod 0 | ✅ | `node audyt/tools/straznik-sektora-audytu.mjs; echo $?` → **0** (22 kontrole) |
| 2 | audyt mutacyjny → 0 przeoczonych, 0 martwych | ✅ | `node audyt/tools/audyt-straznika-sektora.mjs` → „66, przeoczone: 0, martwe/złe: 0", kod 0. ⚠️ nazwa: plan mówił `audyt-straznikow.mjs straznik-sektora-audytu`, sektor ma własny plik — powód w jego nagłówku (mutacje projektu leżą poza `audyt/`) |
| 3 | `git diff main -- . ':!audyt' ':!re-audyt' ':!.claude'` → puste | ✅ | → **0** plików; wariant z planu (`':!tools/audyt' ':!.claude'`, bez `re-audyt`) → 0 poza `re-audyt/` |
| 4 | `mapa.mjs` → zero sierot | ✅ | SIEROTY **0** (1110/1110) |
| 5 | `zgloszenie.mjs --test` → bez dowodu/miejsca odrzucone, komplet przyjęty | ✅ | 18/18, w tym „BEZ dowodu", „BEZ miejsca", „plik nieistniejący", „treść linii się nie zgadza" → odrzucone |
| 6 | `generuj-agentow.mjs --sprawdz` → zgodny | ✅ | „Generat zgodny ze źródłem: 80 definicji", kod 0 |
| 7 | próba na sucho → ZWERYFIKOWANE | ✅ | `AUD-PIK-001` i `REA-SEC-001` → ZWERYFIKOWANE; `REA-SEC-002` → DO WERYFIKACJI (świadomie nieprzewieziony, `PLAN-BUDOWY.md:905`) |
| 8 | test negatywny KAŻDEJ nowej kontroli | ❌ dowód | 66 mutacji na 22 kontrole, ale `grep -oE "regu[łl][aęy]? [0-9]+"` po mutacjach → wprost tylko reguły **1, 4, 5, 6, 7, 13, 15, 17, 20, 21, 22** (11 z 22). Pokrycie pozostałych 11 nie jest artefaktem (brak nr 3) |
| 9 | migawka przed i po identyczne | ✅ | `--porownaj` → identyczne, kod 0 |
| 10 | każda rola ma mechaniczny zakres i checklistę | ✅ | strażnik reguła 7: „ról zbudowanych (audyt): 19/19, (re-audyt): 21/21, zakresów Pogłębiaczy zgodnych z audytem: 14/14" |
| 11 | na `main` bez zmian: `npm run check` 0, strażnicy 39/39, mutacje 340, testy 83/83 | ✅ | CI na `main` (HEAD `c645895`): `gh run list --branch main -L 3` → `success` 2026-09-01; lokalnie na tej gałęzi (poza sektorami identycznej z `main`): pre-commit „Strażnicy: wszyscy zaliczeni (39)", mutacje 340 (grep), testy 83 (grep); `npm run check` lokalnie → kod **0** (sekcja H) |

## G. „Krytyka planu" — uwagi wprowadzone przez agenta (K1, K2, K3, K6, K7, K8)

| Uwaga | Stan | Dowód komendą |
|---|---|---|
| K1 krytyk czyta raport i dowody, otwiera obszar punktowo | ✅ | `audyt/szablony/KRYTYK.md:62, 65` |
| K2 obszar = `git ls-files`; sierota = niczyj | ✅ | `audyt/tools/mapa.mjs:38, 42, 81` |
| K3 „nie da się zabronić pisania" — napisane wprost, kontrola po fakcie | ✅ | `audyt/tools/generuj-agentow.mjs:15-19`; migawka + `git diff` (F9, F3) |
| K6 tabela granic jako warunek powtarzalności | ✅ | `GRANICE.md` 34 pary; `audyt/role/KIER/AGENT.md:222` |
| K7 krytyk Goldena: czy Golden nie blokuje bez podstawy | ✅ | `audyt/role/GOLD/KRYTYK.md:132` |
| K8 strażnik sektora żyje tylko na gałęzi, nie w CI | ✅ (świadomie) | `grep -n straznik-sektora package.json tools/straznicy/uruchom-wszystkie.mjs .github/workflows/*.yml` → **0** trafień |

## H. Koszt i „czego krok nie robi"

| Pozycja | Stan | Dowód komendą |
|---|---|---|
| uruchomienie = ponad 150 uruchomień, wiele milionów tokenów, nie w jednej sesji | ✅ (zmierzone) | `PLAN-BUDOWY.md:891-897`: E7.6 = **633 tys.** tokenów na jedno znalezisko (E6: 518 tys.); szacunek E8 „rząd 25 mln na komplet" |
| wyniki lądują w pliku natychmiast, nie w kontekście | ✅ | `audyt/zgloszenia/*.json`, `audyt/stan/*.json` pisane przez `zgloszenie.mjs`/`status.mjs` w trakcie prób |
| nie uruchamia audytu | ✅ | 3 wpisy PRÓBNE, oznaczone; `porownaj-cykle` → „fala 1 = 0 zgłoszeń" (próbne pominięte) |
| nie naprawia niczego | ✅ | `git diff main --name-only -- . ':!audyt' ':!re-audyt'` → 0 |
| nie dotyka kodu wtyczek, prototypu ani `main` | ✅ | j.w. + migawki identyczne |
| nie audytuje kursów | ✅ | `mapa.mjs` wyklucza 399 plików z powodem D4 |
| nie kasuje branchy sektorów | ✅ | obie gałęzie na `origin` |
| `npm run check` na tej gałęzi (pozycja F11, lokalnie) | ✅ | `npm run check; echo $?` → **0**: „Strażnicy: wszyscy zaliczeni (39)", `tests 83 / pass 83 / fail 0`, smoke D4/D5/D6/CSP/SEO/podgląd/lekcje OK (2026-09-02; gałąź poza `audyt/` i `re-audyt/` identyczna z `main`) |

## I. Pomiary z E1–E7 — czy są w repo

| Etap | Sekcja w `PLAN-BUDOWY.md` | Stan |
|---|---|---|
| E1 | „Fakty zmierzone przy E1" (`:1468`) | ✅ |
| E2 | `:1436` (m.in. 19 par bez wiersza, próg ≥5 plików) | ✅ |
| E3 | `:1391` (próg pobrania mierzy treść, nie plik) | ✅ |
| E4 | `:1311` + sweep przed clear `:1356` | ✅ |
| E5 | `:1214` | ✅ |
| E6 | `:1024` (nośnik werdyktu, 4 usterki, koszt zmierzony, czego próba nie objęła) | ✅ |
| E7 | `:498-1022` (pięć pozycji narzędzi, cztery rozstrzygnięcia, E7.1–E7.6, koszt) | ✅ |
