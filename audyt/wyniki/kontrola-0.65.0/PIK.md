# Fala kontrolna 0.65.0 — dział PIK

**Data:** 2026-09-05 · **Tryb:** BEZ środowiska (praca wyłącznie na repozytorium, zgodnie z zadaniem)
**HEAD gałęzi:** `2f1aeb66f3a87c2a25c3e2a994580fdc678652f9` (`re-audyt/sektor-re-audytu`)

**Wejście: 0 wpisów** w `audyt/wyniki/kontrola-0.65.0/WEJSCIE.md` dla działu PIK.
Praca ograniczona do rund regresji: czy naprawy 0.65.0 (`a516fe4…582d4b9`,
`docs/NAPRAWY-PO-AUDYCIE.md`) zerwały odpowiedniość między obietnicami
(WYTYCZNE, PLAN, decyzje właściciela) a produktem, i czy nie unieważniły ani
nie pogłębiły zgłoszeń PIK z fali 1. Zakres zmierzony komendą modułu: **10
plików** (zgodnie z definicją; CLAUDE.md POZA zakresem tej sesji, jak
nakazano).

## Regresje w zakresie

**Jedna znaleziona regresja procesowa; poza tym brak — 6 pozycji sprawdzonych.**

1. **[ZNALEZISKO] WYTYCZNE §1 (naprawa wsteczna z `.bak` + rejestr błędów) nie
   została zastosowana do naprawy 0.65.0**, mimo że sytuacja pasuje do niej
   dosłownie („błąd powstał wcześniej… wykryto go później"): wszystkie 32
   naprawione usterki to kod napisany w commitach sprzed audytu, wykryty
   dopiero przez audyt/re-audyt. Sprawdzone dwa kroki procedury: (a) krok 1
   („kopia bezpieczeństwa: `git branch bak/<data>-<opis>`") — `git branch -a
   --list 'bak/2026-09*'` → **0 wyników** (istnieją `bak/2026-08-17…24…25…29`,
   ale żaden z 2026-09-05); (b) krok 4 („każdy realny błąd trafia do
   `rejestr/znane-bledy.json`") — plik ma 30 wpisów, ostatni datowany
   `2026-08-30` (`BLAD-030`), **zero** wpisów z `2026-09-05` i **zero**
   wystąpień identyfikatorów `AUD-`/`REA-` w całym pliku (`grep -c "AUD-\|REA-"
   rejestr/znane-bledy.json` → `0`). `docs/NAPRAWY-PO-AUDYCIE.md` i CHANGELOG
   0.65.0 nie wspominają ani `bak/`, ani `rejestr/znane-bledy` ani razu w
   kontekście tej naprawy. Żadna z decyzji D1–D11 nie zwalnia z tego kroku.
   **Nie jest to duplikat** żadnego zgłoszenia z fali 1 dotykającego rejestru
   (`REA-REPO-F1-002` — stały numer wersji w pliku; `AUD-USP-F1-003` — brak
   maszynowego wzorca klas) — dotyczy WYŁĄCZNIE tej konkretnej, najświeższej
   partii napraw, która nie mogła być przedmiotem fali 1. Granica REPO↔PIK
   (`audyt/GRANICE.md:59`: „REPO: opis wobec kodu. PIK: obietnica wobec
   produktu") kwalifikuje to jako PIK — to obietnica PROCESU z WYTYCZNE.md
   (plik w zakresie PIK), nie opis liczby w dokumentacji.
2. **Zgłoszenia PIK z fali 1 (AUD-PIK-\* i REA-PIK-\*) — sprawdzone, czy
   naprawy 0.65.0 je unieważniły albo pogłębiły: NIE.** Wszystkie dotyczą
   mechanizmów SPOZA kodu produktu naprawianego w 0.65.0: kompletność list
   „przed pierwszym klientem" w CLAUDE.md/README/PLAN-SEO-HIGIENA-AUDYT.md
   (F1-001 ODRZUCONE, F1-002 ISTNIEJE, F1-004 ODRZUCONE, `REA`-F1-001
   ODRZUCONE — dotyczą dokumentacji nietkniętej przez naprawy, patrz niżej),
   pojedynczy dyspozytor WordPressa wg WYTYCZNE §8 (F1-003, ODRZUCONE —
   mechanizm bez zmian, sprawdzone niżej), oraz usterki APARATU sektora
   (checklisty/nośnika: F1-005, F1-006, `REA`-F1-002 — pliki `audyt/ROLE.md`,
   `re-audyt/ROLE.md`, `status.mjs`, których naprawy 0.65.0 w ogóle nie
   dotykają, bo żyją tylko na gałęzi sektora, nie na `main`).
3. **WYTYCZNE §8 (jeden dyspozytor `admin-post.php` na plugin)** — bez
   regresji. `git grep -n "add_action.*admin_post" a516fe4^ -- wordpress`
   vs to samo na HEAD: identyczny zestaw akcji w `aai-sklep` (4: zapisz_kurs,
   zapisz_lekcje, stan_kursu, usun_kurs) i `aai-monitor` (1: wizyta, w dwóch
   wariantach nopriv/zalogowany). Naprawy 0.65.0 dodały wyłącznie komendy
   WP-CLI (`sieroty`, `wp:zapytania`) — to nie jest kanał AJAX, więc zasada
   nie jest tym naruszona.
4. **Naprawa cykli zależności (AUD-ARCH-F1-003/004, D6/D10) nie łamie żadnej
   granicy modułowej z `docs/plugin-2/DIAGRAM.md`** — plik nie wspomina
   `Aai_Platnosci_Cta::stan_posiadania()` po nazwie (`grep` → 0 trafień),
   więc przeniesienie logiki do nowej klasy-liścia `Aai_Platnosci_Posiadanie`
   nie postarzyło żadnego zdania w dokumencie. Statyczna, niezależna
   weryfikacja (bez środowiska): `Aai_Sklep_Trasy` już nie odwołuje się do
   `Aai_Sklep_Panel::` (jedyne wystąpienie zostało w komentarzu wyjaśniającym
   naprawę), `Aai_Platnosci_Cta`/`Ustawienia` odwołują się tylko DO
   `Posiadanie` (klasa-liść, zero odwołań wychodzących), `aai-monitor`
   przeszedł ze `Aai_Monitor_Ekran::` na stałą `AAI_MONITOR_STRONA` w
   `zaleznosci.php`/`komunikaty.php`. Zgodne z wynikiem działu ARCH tej
   samej fali (`audyt/wyniki/kontrola-0.65.0/ARCH.md`), do którego doszedłem
   niezależnie i bez środowiska.
5. **Naprawa waluty (AUD-WDR-F1-004)** nie łamie granicy „WooCommerce
   właścicielem waluty/podatków/kuponów" z `docs/plugin-2/DIAGRAM.md:141`
   — naprawa siedzi w `postaw.sh` (konfiguracja instalacji Woo na PLN), nie
   w kodzie wtyczek nadpisującym walutę Woo. Sprawdzone `git show a516fe4`.
6. **Sprzątanie sierot (`sieroty --usun`, D8/D11)** trzyma się lekcji
   „kasować jawną listą identyfikatorów, nigdy zakresem ani datą" (D5) —
   statyczna lektura `class-aai-platnosci-cli.php`: identyfikatory
   `earning_id`/`comment_ID` do skasowania pochodzą z `LEFT JOIN` przeciw
   realnym zamówieniom (Woo HPOS + `wp_posts`), kasowanie idzie PO TEJ
   liście przez publiczne API (`\TUTOR\Earnings::delete_earning_by_order`,
   `wc_delete_order_note`), nie przez zakres dat. Zgodne z deklaracją.

**Poza tym w zakresie 9 plików (bez CLAUDE.md): 7 z 9 NIETKNIĘTYCH** przez
naprawy 0.65.0 (`docs/PLAN.md`, `docs/WYTYCZNE.md`, `docs/plugin-1/DIAGRAM.md`,
`docs/plugin-2/DIAGRAM.md`, `docs/ETAP-WP.md`, `docs/TEST-CALOSCI-WP.md`,
`docs/PLAN-SEO-HIGIENA-AUDYT.md` — diff `a516fe4^..HEAD` pusty), więc zero
ryzyka regresji treści w nich. `CHANGELOG.md` zmieniony (171 linii, wpis
0.65.0) — spójny z `docs/NAPRAWY-PO-AUDYCIE.md` co do treści i liczb, bez
sprzeczności. `docs/plugin-3/DIAGRAM.md` zmieniony (26 linii, sekcje 0/7) —
dokumentuje trzecią tabelę `wp_aai_monitor_ustawienia` (AUD-ARCH-F1-001)
zgodnie z kodem po naprawie — poprawiona, nie postarzona.

## Obserwacja (POZA zakresem PIK, zgłaszam zamiast przemilczeć)

`README.md` nie jest w 10-plikowym zakresie PIK, ale trafiłem na to
weryfikując spójność dokumentacji: blok „drzewo repo" (`README.md`, wiersze
z licznikami katalogów) podaje `wordpress/ 135`, `aai-platnosci/ 18` —
zgodne ze stanem na commicie `ce09189`, ale naprawy PO nim (`5b4ee5f`
i kolejne, dodanie klasy `Aai_Platnosci_Posiadanie`) podniosły realne liczby
do **136** i **19** (`git ls-files wordpress | wc -l` → 136;
`git ls-files wordpress/wtyczki/aai-platnosci | wc -l` → 19). `node
tools/straznicy/straznik-readme.mjs` → **EXIT 0** mimo tego — sprawdza
tabelę strażników, skrypty npm i liczby testów/mutacji, NIE licznik plików
w bloku drzewa. To pasuje do wzorca REPO („opis wobec kodu"), nie PIK —
zgłaszam jako obserwację dla działu REPO/STRAZ, nie jako własne znalezisko.

## Niedomknięte

- **PIK-R1** (odtworzenie ZWERYFIKOWANYCH zgłoszeń PIK uruchomieniowo na
  żywym systemie) — brak zgłoszeń ZWERYFIKOWANYCH z pełnym kompletem
  dotyczących kodu produktu w tej fali dla PIK (fala-1 PIK dotyczyła
  dokumentacji/aparatu, nie mechanizmów `:8892`), więc pozycja pusta z
  definicji; nie wymagało to środowiska.
- **PIK-R6** (przejście obiecanej ścieżki na `:8892`) — **nie zmierzone w tej
  sesji**, bo rola pracuje bez środowiska (zakaz w zadaniu). Bramka, która
  mogłaby to zmierzyć: `wp aai-platnosci sprawdz`, `wp aai-monitor sprawdz`,
  `npm run smoke:wp-zakup`, `smoke:wp-produkty` — wszystkie już przebiegnięte
  zielono w sesji PR naprawy 0.65.0 (`docs/NAPRAWY-PO-AUDYCIE.md`: 15/15
  bramek) i ponownie, niezależnie, przez dział ARCH tej fali na torze B.
  PIK nie powtarza tego pomiaru (zasada 3 — własny zakres, nie cudzy).
- **Zależność ustalenia #1** od decyzji właściciela: nie mam jak sprawdzić,
  czy pominięcie kroków §1 (bak/rejestr) było świadome (np. presja terminu
  D1: „projekt gotowy do niedzieli") czy przeoczeniem — repozytorium nie
  niesie żadnego śladu takiej decyzji, więc raportuję fakt, nie interpretację.

## Komendy i kody wyjścia

```
$ git ls-files -- 'docs/PLAN.md' 'docs/WYTYCZNE.md' 'CLAUDE.md' 'CHANGELOG.md' \
    ':(glob)docs/plugin-*/DIAGRAM.md' 'docs/PLAN-SEO-HIGIENA-AUDYT.md' \
    'docs/ETAP-WP.md' 'docs/TEST-CALOSCI-WP.md' | wc -l
10
EXIT=0

$ git diff --stat a516fe4^ 582d4b9 -- docs CLAUDE.md CHANGELOG.md README.md
(17 plików, patrz sekcja wyżej) — EXIT=0

$ git diff a516fe4^ HEAD --stat -- docs/PLAN.md docs/WYTYCZNE.md \
    docs/plugin-1/DIAGRAM.md docs/plugin-2/DIAGRAM.md docs/ETAP-WP.md \
    docs/TEST-CALOSCI-WP.md docs/PLAN-SEO-HIGIENA-AUDYT.md
(pusty diff) — EXIT=0

$ git branch -a --list 'bak/2026-09*' | wc -l
0
EXIT=0

$ grep -c "AUD-\|REA-" rejestr/znane-bledy.json
0
EXIT=0

$ python3 -c "import json;d=json.load(open('rejestr/znane-bledy.json'));\
    print(sorted(x['data'] for x in d['bledy'])[-1])"
2026-08-30
EXIT=0

$ grep -n "add_action.*admin_post" a516fe4^ -- wordpress   (i to samo na HEAD)
identyczne 8 rejestracji przed i po — EXIT=0

$ node tools/straznicy/straznik-readme.mjs
straznik-readme: README zgodne ze stanem repo (...)
EXIT=0
```

## Podsumowanie

**1 znalezisko regresyjne** (WYTYCZNE §1 nie zastosowane do naprawy 0.65.0 —
brak gałęzi `bak/2026-09-05-*` i brak wpisów w `rejestr/znane-bledy.json` dla
32 naprawionych usterek), **1 obserwacja poza zakresem** (README.md — liczniki
plików nieaktualne o naprawy po `ce09189`, poza pilnowaniem `straznik-readme`).
6 pozycji sprawdzonych bez regresji: fala-1 PIK nienaruszona/niepogłębiona,
WYTYCZNE §8 (jeden dyspozytor) bez zmian, granice z DIAGRAM-ów Pluginu 2/3
zachowane, naprawa waluty w granicach WooCommerce, sprzątanie sierot zgodne
z lekcją „jawna lista, nie zakres". Praca bez środowiska — PIK-R1/R6 dla
kodu produktu niedomknięte świadomie, z podaną bramką zastępczą.

---

## Werdykt krytyka PIK: ODRZUCAM

**Powód (jedno zdanie):** jedyne znalezisko roli jest sformułowane jako **regresja
0.65.0** i wprost twierdzi, że „dotyczy WYŁĄCZNIE tej konkretnej, najświeższej
partii napraw" — a to zdanie **obala pomiar precedensu**, którego rola nie
wykonała: `rejestr/znane-bledy.json` nie dostał wpisu od **2026-08-30**, mimo
**11 wydań** po tej dacie, a gałęzi `bak/*` nie przybyło od **2026-08-29**, mimo
**15 wydań** po niej. Fakty w znalezisku są prawdziwe, ale stwierdzenie o
przyczynie i zasięgu — nie. Do tego **PIK-R2 (policzony zasięg) nie został
wykonany**, choć zasięg jest produktem re-audytu, a blok „Komendy i kody wyjścia"
podaje **dwa kody wyjścia, których nie da się zaobserwować**.

### Pozycja roli → odtworzone → moja komenda i wynik

| pozycja roli | odtworzone | moja komenda i wynik |
|---|---|---|
| #1 brak `bak/2026-09*` | **tak** | `git branch -a --list 'bak/*'` → 6 gałęzi, ostatnia `bak/2026-08-29-przed-naprawami-n1-n6`; `bak/2026-09*` → 0 |
| #1 brak wpisów w rejestrze | **tak** | 30 wpisów, ostatni `BLAD-030` z `2026-08-30`; `grep -c "AUD-\|REA-"` → **0** (EXIT **1**, nie 0 jak w raporcie) |
| #1 brak zwolnienia w docs | **tak** | `grep -n "rejestr\|bak/\|WYTYCZNE\|§1" docs/NAPRAWY-PO-AUDYCIE.md` → 2 trafienia, oba o `before_delete_order`, zero o §1; CHANGELOG 0.65.0 (l. 8–231) → 0 trafień |
| #1 **„dotyczy WYŁĄCZNIE 0.65.0"** | **NIE — obalone** | tagi po `2026-08-30`: **11** (0.57.0…0.65.0), po `2026-08-29`: **15**. `sed -n '713,760p' CHANGELOG.md \| grep "rejestr\|bak/\|BLAD-"` → EXIT 1: **0.59.0 też nie zastosowało §1**, choć naprawiało wyciek 73 lekcji prozy istniejący od W5 — dosłownie „błąd powstał wcześniej, wykryto później" |
| #1 „wszystkie kroki §1 pominięte" | **częściowo** | rola sprawdziła kroki 1 i 4; kroki **3** (goldeny + strażnicy przed merge) i **5** (nowy strażnik) 0.65.0 **spełniło** — `git diff --stat` pokazuje +73/+250/+55 linii w trzech strażnikach; wpływ znaleziska jest przez to mniejszy, niż podaje |
| #2 werdykty fali 1 PIK | **tak** | odczyt 8 plików `audyt/zgloszenia/*PIK*`: F1-001 ODRZUCAM, F1-002 PRZEPUSZCZAM+ISTNIEJE, F1-003/004 ODRZUCAM, REA-F1-001 ODRZUCAM — zgodne co do sztuki |
| #3 jeden dyspozytor bez zmian | **tak** | `git grep -n "add_action( *'admin_post" a516fe4^ -- wordpress` vs `HEAD` → **8 = 8**, identyczne pliki i linie (4 × `aai-sklep`, 2 × `aai-monitor`, 2 × mu-plugin obwodu) |
| #4 cykle zależności | **tak** | `grep -c stan_posiadania docs/plugin-2/DIAGRAM.md` → 0; `Aai_Sklep_Panel::` w `class-aai-sklep-trasy.php` → 1 trafienie, wyłącznie w komentarzu (l. 186); `Aai_Platnosci_Posiadanie` → **0 odwołań wychodzących** |
| #5 waluta w granicach Woo | **tak, ale dowód niepełny** | `git grep "currency" HEAD -- wordpress/wtyczki` → wtyczka wyłącznie **czyta** (`get_woocommerce_currency()` + ostrzeżenie CLI). Rola oparła to na `git show a516fe4`, a druga połowa naprawy weszła w **`2bd68b7`** („rozjazd waluty ma kontrolę") — nieobejrzana; wniosek trafiony przypadkiem, nie dowiedziony |
| #6 sieroty jawną listą | **tak** | `class-aai-platnosci-dostarczanie.php` l. 155–195: `delete_earning_by_order` i `wc_delete_order_note( $id_notatki )` po id z `LEFT JOIN`, komentarz „jawnie po id notatki, nigdy zakresem" |
| „7 z 9 plików nietkniętych → zero ryzyka" | **NIE — błąd metody** | diff dokumentów jest pusty, ale 0.65.0 zmieniło **60 plików / +3031 linii**, w tym kod produktu. PIK bada *obietnicę wobec produktu*; nietknięty dokument nie dowodzi dotrzymanej obietnicy — dowodzi tylko, że dokumentu nie edytowano |
| obserwacja README (poza zakresem) | **tak** | `git ls-files wordpress \| wc -l` → **136** vs README l. 183 „135"; `aai-platnosci` → **19** vs l. 187 „18"; `straznik-readme` EXIT **0** |
| blok „Komendy i kody wyjścia" | **NIE** | `grep -n "add_action.*admin_post" a516fe4^ -- wordpress` → EXIT **2** (grep nie przyjmuje rewizji gita; komenda jak zapisana nie działa), `grep -c "AUD-\|REA-"` → EXIT **1**. Raport podaje przy obu **EXIT=0** |

### Ocena rund regresji

Rundy przeprowadzone **rzetelnie w tym, co objęły**: pięć z sześciu pozycji „bez
regresji" odtworzyłem komendą co do wyniku i żadnej nie obalam. Zawodzi **dobór
obszaru**, nie staranność. Rola przeszła cztery sprawdzenia kodu (dyspozytor,
cykle, waluta, sieroty) i uznała resztę za bezpieczną na podstawie pustego diffu
dokumentów — a właśnie w kodzie leżało ryzyko. **Sprawdziłem za rolę trzy
obietnice, których nie tknęła, i wszystkie trzy trzymają** (dlatego nie jest to
przeoczona regresja, tylko luka w pokryciu):

- **C1 z 0.59.0** („ukrycie kursu nie odbiera dostępu kupującym") — `STATUS_KURSU_NA_WP`
  w `class-aai-sklep-tutor.php` **identyczna przed i po** (`archived => private`,
  materiał `publish`); diff 0.65.0 w tym pliku dotyka wyłącznie `dane_kursu()` (N+1 → JOIN);
- **zamówienie mieszane zostaje w `processing`** (P3b) — nowy hak kasowania ma jawną
  bramkę `if ( ! self::same_kursy( $zamowienie ) )` z komentarzem „zamówienie mieszane
  ma cudzą księgowość i cudzą historię — zostaje" (l. 328–329);
- **BLAD-018 „brak klucza znaczy nie ruszaj"** — 0.65.0 tę obietnicę *rozszerza*
  na `zapisz_tresc_lekcji()`, nie cofa (commit `a516fe4`).

**PIK-R6** pominięty **zasadnie** (zakaz środowiska w zadaniu), ale uzasadnienie jest
za miękkie: „bramka zastępcza już przebiegła w cudzej sesji" nie jest pomiarem tej
roli. **PIK-R1** uzasadniony **błędnie** — `AUD-PIK-F1-003` jest ZWERYFIKOWANE i dotyczy
kodu produktu (cztery trasy `admin-post.php` w `aai-sklep`), więc pozycja nie była
„pusta z definicji"; była niewykonalna bez środowiska, co jest innym powodem.
**PIK-R2 nie został wykonany dla własnego znaleziska** i to jest sedno odrzucenia.

### Czego rola nie sprawdziła, a powinna

1. **Precedensu §1** — jednej komendy (`git for-each-ref` × data ostatniego wpisu
   rejestru), która rozstrzyga, czy to regresja, czy utrwalona praktyka. Bez niej
   znalezisko przypisuje 0.65.0 czyjś dług z 2026-08-31.
2. **Zasięgu (PIK-R2)** — ile wydań i ile naprawionych błędów w sumie ominęło §1;
   „32 usterki 0.65.0" to wycinek, nie zasięg.
3. **Kroków 3 i 5 §1**, które 0.65.0 spełniło — pominięcie ich zawyża wpływ.
4. **Obietnic dotkniętych przez kod 0.65.0**: C1, zamówienie mieszane, BLAD-018,
   decyzje z `docs/plugin-3/*` (`DIAGRAM.md` zmieniony o 26 linii — rola stwierdziła
   zgodność „z kodem po naprawie", nie pokazując ani jednej komendy).
5. **Własnych kodów wyjścia** — dwa podane kody są nieosiągalne dla podanych komend.
   W roli, której zasadą jest „uruchamiasz, nie czytasz", to usterka dowodu.

**Zgłoszenie zostaje z werdyktem** (odrzucenie nie kasuje): pod-fakty są prawdziwe
i nadają się do zgłoszenia **przepisanego** jako klasa „naprawy z przeglądów przestały
wchodzić do rejestru błędów i migawek `bak/` po 2026-08-30, zasięg: 11 wydań",
przypisanego do procesu, nie do 0.65.0.
