# Polowanie na nienazwane błędy dokumentacji — wynik

> **To NIE jest wynik sektora audytu ani re-audytu.** To materiał do napraw,
> zebrany poza numeracją fal, na gałęzi `re-audyt/sektor-re-audytu`,
> przy kodzie produktu z `main` = **0.65.0**. Niczego nie naprawiono —
> zero edycji plików poza tym raportem.
>
> Data: 2026-09-05. Wszystkie liczby zmierzone komendą, kody wyjścia bez potoku.

---

## Sedno w trzech zdaniach

**Higiena repo z 0.62.0/0.63.0 wyciągnęła właściwą lekcję („przelot musi objąć
CAŁY plik"), ale zatrzymała się na granicy PLIKU: przelot objął `README.md`
i `CLAUDE.md`, a te same nieprawdy żyją dalej w dokumentach, które README sam
nazywa aktualnymi.** Trzy z nich to `CONTRIBUTING.md` (nietknięty od
2026-08-30, czyli sprzed higieny), `docs/security-checklist.md` (zamrożony na
`v0.29.0` z 2026-08-19, o produkcie nie wie NIC) i
`docs/PLAN-SEO-HIGIENA-AUDYT.md` (dalej każe czekać na wytyczne do audytu,
który się odbył i został naprawiony). **Do tego wróciła — w innym pliku —
dokładnie ta klasa, na którą 0.63.0 dołożyła regułę 8 strażnika: wiersz tabeli
z treścią poza tabelą; reguła czyta wyłącznie `README.md`, więc 2677 znaków
zapisu „STAN PO WYKONANIU" kroków T1–T3 Pluginu 3 jest na GitHubie
niewidzialne.**

---

## Znaleziska

### D1 (DUŻY) — `CONTRIBUTING.md` nigdy nie przeszedł higieny repo i niesie trzy nieprawdy usunięte wtedy z README

`CONTRIBUTING.md` jest dokumentem źródłowym nr 4 w `CLAUDE.md` („czytaj przed
pracą") i jest linkowany z nagłówka README jako „Współpraca i workflow".
Ostatnia zmiana: **2026-08-30**, czyli PRZED oboma turami higieny (0.62.0
i 0.63.0 weszły 2026-08-31).

```
$ git log --format='%h %ad %s' --date=short -- CONTRIBUTING.md | head -1
bd714aa 2026-08-30 Bramki przestają kasować pocztę właściciela
$ git log --oneline --format='%h %s' v0.61.0..v0.63.1 -- . | tail -3
18bb88e Dokumentacja przestaje wskazywać kroki, które dawno się skończyły
f3d7f61 README mówi, gdzie jesteśmy, zamiast streszczać sześćdziesiąt wersji
c5042c2 Repo przestaje twierdzić, że skończone kroki trwają
```

**Trzy deklaracje, każda obalona pomiarem:**

| Miejsce | Deklaracja | Zmierzone |
|---|---|---|
| `CONTRIBUTING.md:45` | „`1.0.0` — komplet: **3 moduły + 3 bazy**, zaakceptowane przez właściciela" | Powstała **jedna** baza. `git ls-files modules` → tylko `m1-sklep`; jedyne wystąpienia `db2_klienci`/`db3_monitoring` poza PLAN.md to zapisy, że **nigdy nie powstały** (`CHANGELOG.md:390`, `CLAUDE.md:1132`). To jest DOKŁADNIE nieprawda, którą 0.63.0 wycięła z README (tabela „Moduły"). Kryterium wydania 1.0.0 jest dziś niewykonalne jak napisane. |
| `CONTRIBUTING.md:31–32` | „Branch od gałęzi, na której toczy się praca (moduły: od swojego brancha **`plugin-X-…`**)" | `git ls-remote --heads origin` → 10 gałęzi, z modułowych **tylko `plugin-1-sklep-kursow`**. `git log --all` nie zna ani jednego `plugin-2-*`/`plugin-3-*` — nigdy nie istniały. Druga z nieprawd wyciętych z README w 0.63.0. |
| `CONTRIBUTING.md:39` | „**Deploy** — gdy będzie co i gdzie wdrażać (docelowy **hosting Node.js**)" | `docs/PLAN.md:15` ma datowany nagłówek: „DECYZJA ZESPOŁU 2026-08-18 — produkcja na WordPressie (**zastępuje plan »hosting Node.js / VPS«**)". README:241: „wykupiony hosting z WordPressem + domena". Korekta ma 18 dni i nie doszła do dokumentu workflow. |

Dodatkowo `CONTRIBUTING.md:34` („CI musi być zielone przed merge") nie zna
wyjątku, który 0.63.0 **świadomie NAZWAŁA w README** (ramka „Od 2026-08-18 CI
nie działa…"). Lekcja z higieny brzmiała: „sprzeczność reguły z praktyką jest
gorsza od nieaktualności". Reguła stoi tu bez wyjątku, a szesnaście wersji
weszło wbrew niej.

**Waga: DUŻY.** Nie jedna liczba, tylko **trzy** rozstrzygnięcia projektowe
(definicja ukończenia 1.0.0, gdzie odgałęziać, cel wdrożenia) w dokumencie,
który CLAUDE.md każe przeczytać przed pracą — i wszystkie trzy zostały
poprawione gdzie indziej, więc czytelnik dostaje dwie sprzeczne prawdy.

---

### D2 (ŚREDNI/DUŻY) — README nazywa `docs/security-checklist.md` dokumentem „utrzymywanym"; ten nie wie, że produkt istnieje

`README.md:451`:

> „Stan utrzymywany w `[docs/security-checklist.md](docs/security-checklist.md)`
> (legenda pięciostanowa …). **Skrót:**"

Pomiar tego pliku:

```
$ git log --format='%h %ad %s' --date=short -- docs/security-checklist.md | head -1
598b28c 2026-08-19 docs: krok 2 planu domknięcia zamknięty — checklista bez otwartych pozycji

$ grep -c "aai-sklep\|aai-platnosci\|aai-monitor\|WooCommerce\|Tutor" docs/security-checklist.md
0
$ echo "kod grepa: $?"   # 1 = zero trafień
```

- Ostatnia zmiana **2026-08-19**; od tego czasu wyszło **36 wersji**
  (`git tag | wc -l` w zakresie 0.29.0 → 0.65.0), w tym cały etap WordPressa
  i **release zabezpieczeniowy 0.59.0**.
- Nagłówek pliku deklaruje wprost: „Stan na **v0.29.0**" i „Przy każdym
  przeglądzie **aktualizować datę w tym nagłówku**" — własna reguła złamana.
- **Zero** wzmianek o trzech wtyczkach, WooCommerce i Tutorze. Tytuł: „Lista
  kontrolna bezpieczeństwa — **Plugin 1 (podstrona `/szkolenia`)**", czyli
  prototyp Next.js.
- Jego wiersze ⏳ obiecują przyszłość, która dawno nastąpiła:
  `:54` „formularze klienta (zakup, kontakt) powstają **dopiero w Pluginie 2**",
  `:77` „Plugin 2/3 — tam pojawiają się dane osobowe; **wybór LMS (Publigo)**"
  (Publigo zostało ODRZUCONE, stoi Tutor LMS — `docs/ETAP-WP.md`),
  `:99` „Konta klientów, sesje, reset hasła, brute force | **Plugin 3 + LMS** —
  cała kategoria wchodzi ze specyfikacją WP" (zrobione w P4/P6, 0.51.0–0.53.0).
- Zakończenie pliku (`:158–161`): „Pozycje 3, 6, 7 i 8 zostają czystymi
  wymaganiami: **nie ma ich do czego przypiąć przed płatnościami i kontami
  klientów**" — płatności i konta klientów istnieją od 0.53.0.
- Legenda: nagłówek „**Legenda (pięć stanów, nie dwa)**", a tabela ma **sześć**
  wierszy (✅ 🟡 🔧 ⛔ ⏳ 🚧). README:452 powtarza „legenda pięciostanowa".

**Sprawdzone i BEZ ZARZUTU w tym pliku** (żeby nie zgłaszać nieprawdy):
`grep -oE "^\| 🚧" | wc -l` → **1**, i to jest wiersz LEGENDY, nie pozycja —
deklaracja „po zamknięciu kroku 🚧 nie opisuje żadnej pozycji" jest prawdziwa.

**Waga: ŚREDNI/DUŻY.** To dokument, po który sięga audytor i kupujący; README
przedstawia go jako bieżący stan bezpieczeństwa CAŁEGO projektu, a on opisuje
architekturę, która przestała być produktem 18 dni temu. Osobny
`docs/AUDYT-BEZPIECZENSTWA-WP.md` istnieje, ale checklista nie jest ani
zaktualizowana, ani oznaczona jako zapis historyczny.

---

### D3 (ŚREDNI) — nawrót klasy „treść poza tabelą": 2677 znaków niewidocznych na GitHubie, w pliku, którego strażnik nie czyta

0.63.0 dołożyła regułę 8 do `straznik-readme` po tym, jak dwa wiersze tabeli
miały treść po zamykającym `|`. Reguła czyta **wyłącznie README**:

```
$ sed -n '45,46p' tools/straznicy/straznik-readme.mjs
if (!existsSync("README.md")) process.exit(0);
const readme = readFileSync("README.md", "utf8");
```

Przelot po **508** śledzonych plikach `.md` (bez `audyt/`) regułą „wiersz tabeli
ma treść po zamykającym `|`" oraz regułą „wiersz ma więcej komórek niż nagłówek"
(GFM nadmiar **ignoruje**):

```
docs/plugin-3/DIAGRAM.md:631  komórek 4 > nagłówek 3
docs/plugin-3/DIAGRAM.md:632  komórek 4 > nagłówek 3
docs/plugin-3/DIAGRAM.md:633  komórek 5 > nagłówek 3
RAZEM: 3 (README.md — 0, czyli reguła 8 w swoim zakresie działa)
```

Nagłówek tabeli (`docs/plugin-3/DIAGRAM.md:629`) ma **trzy** kolumny
(`Krok | Zakres | Bramka dowodowa`). Wiersze T1, T2, T3 niosą **czwartą**
komórkę „**STAN PO WYKONANIU:**". Zmierzona objętość znikającej treści:

| Linia | Komórek | Znaków ucinanych |
|---|---:|---:|
| 631 (T1, 0.55.0) | 4 | 740 |
| 632 (T2, 0.56.0) | 4 | 1207 |
| 633 (T3, 0.57.0) | 5 | 730 |
| **razem** | | **2677** |

Ginie m.in. jedyny zapis, że `straznik-monitora-wp` ma 8 → 12 → 18 reguł,
że `smoke-wp-monitor` urósł 57 → 76 → 129 sprawdzeń, oraz lekcja „WP-CLI nie
zamienia podkreślenia na myślnik". `docs/plugin-3/DIAGRAM.md` jest w CLAUDE.md
oznaczony „**CZYTAĆ PRZED PRACĄ**".

**Waga: ŚREDNI.** Treść jest w pliku, więc nie zginęła — ale na GitHubie,
czyli tam, gdzie się ją czyta, jej nie ma. Klasa udokumentowana i już raz
naprawiona; wróciła, bo naprawę zamknięto w jednym pliku.

---

### D4 (ŚREDNI) — dwa strażniki liczą w swoim nagłówku inaczej, niż wypisują; błąd propaguje się do trzech dokumentów

Nagłówki strażników deklarują liczbę niezmienników **słownie** i zaraz pod
spodem je numerują:

| Plik | Deklaracja słowna | Wypisanych | Mutacji w audycie |
|---|---|---:|---:|
| `tools/straznicy/straznik-csp.mjs:11` | „**Dziewięć** niezmienników, każdy z własną mutacją" | **10** (punkty 1–10; nr 10 = prefetch, z decyzji F w 0.37.0) | **11** |
| `tools/straznicy/straznik-limitera.mjs:11` | „**Jedenaście** niezmienników, każdy z własną mutacją" | **13** (punkty 1–13; nr 12 i 13 = decyzje A i B z 0.36.0) | **17** + 2 kontrprzykłady |
| `tools/straznicy/straznik-limitow.mjs:17` | „Dziesięć" | 10 ✅ | 11 + 1 kontrprzykład |
| `tools/straznicy/straznik-seo.mjs:12` | „sześć" | 6 ✅ | 6 + 1 kontrprzykład |

Komenda pomiarowa mutacji (rozbicie na mutacje i kontrprzykłady po polu
`oczekujCzerwonego: false`):

```
straznik-csp:      mutacje 11, kontrprzykłady 0, razem 11
straznik-limitera: mutacje 17, kontrprzykłady 2, razem 19
straznik-limitow:  mutacje 11, kontrprzykłady 1, razem 12
straznik-seo:      mutacje  6, kontrprzykłady 1, razem  7
RAZEM: 332 mutacje + 19 kontrprzykładów = 351 wpisów
```

Nieprawda propaguje się do **trzech** dokumentów, wszędzie tym samym zdaniem:

- `README.md:463` i `:464` — „`straznik-csp` (9 niezmienników, **10 mutacji**)",
  „`straznik-limitera` (11 niezmienników, **14 mutacji**)";
- `docs/security-checklist.md:66` i `:50` — te same liczby;
- `docs/plugin-1/KROK-2-ZABEZPIECZENIA.md:113` i `:114` — te same liczby.

Dlaczego strażnik tego nie łapie: reguła 6 `straznik-readme` sprawdza wyłącznie
sumę („na N sposobów”, wzorzec `/na[\s>]+(\d+) sposob/`) i ta suma **jest
prawdziwa** — 351 zgadza się co do wpisu. Liczby PER STRAŻNIK są w jego martwym
polu.

Poza tabelą bezpieczeństwa te same rozjazdy w innych dokumentach:
`docs/plugin-1/KREATOR.md:258` — „`straznik-kreatora-wp` (32. strażnik,
**11 mutacji**)" wobec zmierzonych **22 + 1**; `docs/ETAP-WP.md:702` —
„`straznik-tutora` (33., **12 mutacji**)" wobec **15 + 1**;
`docs/plugin-1/PRZELOT-ZRZUTOW.md:143` — „`straznik-asercji` (**5 mutacji**)"
wobec **6 + 1**. Te trzy stoją w akapitach opisujących zamknięte kroki, więc
dają się czytać jako zapis historyczny — README i checklista **nie**.

**Waga: ŚREDNI.** Dwa strażniki ochrony (CSP i limiter bramy AJAX) mówią
o sobie nieprawdę we własnym nagłówku, a repozytorium powtarza ją w trzech
miejscach. To dokładnie ta klasa, na której stoi cała umowa „✅ tylko z dowodem".

---

### D5 (ŚREDNI) — trzy żywe dokumenty dalej ogłaszają jako „następny krok" rzeczy wydane w 0.65.0

To ta sama klasa, którą 0.62.0 naprawiła siedem razy — i wróciła w mniej niż
tydzień, w plikach spoza tamtego przelotu.

| Miejsce | Deklaracja | Rzeczywistość |
|---|---|---|
| `README.md:54` | „**Trzy ostatnie kroki** \| 1. SEO — ZROBIONY · 2. higiena repo — **TRWA** · 3. audyt końcowy — **wytyczne poda właściciel**" | Wiersz **linia wyżej** (`:53`) mówi w tym samym pliku: „higiena repo (0.62.0/0.63.0)" zrobiona i „**Audyt końcowy (fala 1) ODBYTY, a jego 33 potwierdzone usterki NAPRAWIONE** (0.65.0)". `git tag` → `v0.62.0`, `v0.63.0`, `v0.63.1`, `v0.65.0`. Dwa sąsiednie wiersze jednej tabeli mówią co innego. |
| `docs/PLAN-SEO-HIGIENA-AUDYT.md:263–272` | „## KROK 3 — audyt końcowy projektu — **NASTĘPNY KROK** (2026-08-31) … Zakresu **NIE wyprowadzać** … **czekać na jego wytyczne**" | Właściciel podał zakres **2026-09-01** (CLAUDE.md notuje wprost: „wcześniejszy zapis »czekać na jego wytyczne« jest już nieaktualny"), fala 1 się odbyła, 32 z 33 usterek naprawione i wydane jako 0.65.0. Dokument jest linkowany z README:53 jako „[plan]" i z CLAUDE.md jako „CZYTAĆ PRZED PRACĄ". |
| `docs/NAPRAWY-PO-AUDYCIE.md:174–178` | „## NASTĘPNY KROK — 1. **PR gałęzi `fix/naprawy-audytu-f1` → `main`, tag `v0.65.0`, release.** … Szacunek: ~1 h" | Zrobione: `git tag` zawiera `v0.65.0`, CHANGELOG ma nagłówek `## [0.65.0] — 2026-09-05`, a gałęzi `fix/naprawy-audytu-f1` nie ma ani zdalnie, ani lokalnie (`git ls-remote --heads origin` — 10 gałęzi, żadnej takiej). |

**Waga: ŚREDNI.** README:54 jest w tabeli „Stan projektu" — pierwszej rzeczy,
którą czyta ktoś obcy — i sam sobie przeczy o wiersz. Pozostałe dwa to
dokumenty z etykietą „czytać przed pracą", więc kosztują czas każdej nowej
sesji.

---

### D6 (MAŁY) — README zaniża liczbę tabel Pluginu 3

`README.md:159`:

> `| 3 | Monitoring | aai-monitor | `wp_aai_monitor_*` (**2**) | …`

Kod (`wordpress/wtyczki/aai-monitor/includes/class-aai-monitor-tabele.php:87`):

```php
public static function wszystkie(): array {
    return array_map( array( self::class, 'tabela' ),
        array( 'logowania', 'wizyty', 'ustawienia' ) );   // TRZY
}
```

`grep -c "CREATE TABLE" …/class-aai-monitor-tabele.php` → **3**;
`uninstall.php:38` kasuje `array( 'logowania', 'wizyty', 'ustawienia' )`.
Trzecia tabela (`ustawienia`, sól podpisu) doszła w wersji wtyczki 0.5.0.

`docs/SCHEMATY.md:60` mówi poprawnie „13 klas · **3 tabele** · 10 haków",
`docs/plugin-3/DIAGRAM.md:213` — „**trzy tabele**". Rozjazd jest więc
wewnątrzprojektowy. Dodatkowo `docs/plugin-3/DIAGRAM.md:264` w jednej komórce
pisze „**dwie tabele** przez `dbDelta`" i zaraz **wylicza trzy**.

Znaczenie praktyczne: tabela „Moduły" w README jest inwentarzem tego, co
produkt zakłada w cudzej bazie. Kto zrobi z niej listę do kopii zapasowej albo
do migracji, pominie `wp_aai_monitor_ustawienia` — a to tam mieszka sól
podpisu ścieżek, więc jej utrata unieważnia wszystkie beacony wysłane już do
przeglądarek.

**Waga: MAŁY** (jedna cyfra), ale z realnym skutkiem eksploatacyjnym.

---

### D7 (MAŁY) — README: „CI: cztery joby", jobów jest pięć

`README.md:434`. Pomiar:

```
$ awk '/^jobs:/{f=1;next} f && /^  [a-z_-]+:/{print}' .github/workflows/ci.yml
    zakres:  straznicy:  aplikacja:  baza:  security:      → 5
```

Zdanie wymienia cztery i dopiero w następnym zdaniu nazywa piąty („Rozstrzyga
job »Zakres zmian«"), więc czytelnik nie zostaje wprowadzony w błąd co do
zawartości — tylko co do liczby.

---

### D8 (MAŁY) — `wordpress/README.md` opisuje 3 z 8 komend WP-CLI `aai-sklep`

Zmierzone komendy (`WP_CLI::add_command` + metody publiczne klas `*-cli.php`,
z uwzględnieniem `@subcommand`):

| Wtyczka | Komendy w kodzie | Opisanych w `wordpress/README.md` |
|---|---|---|
| `aai-sklep` | `import`, `sprawdz`, `opis`, `usun`, `sync`, `sprawdz-tutora`, `zrzuty`, `proza` (**8**) | `import`, `sprawdz`, `usun` (**3**) |
| `aai-platnosci` | `sync`, `sprzedaz`, `dostawy`, `sieroty`, `sprawdz` (**5**) | 4 (bez `sieroty` — **pozycja znana**) |
| `aai-monitor` | `sprawdz`, `wyczysc-blad` (**2**) | 2 ✅ |

`sync` i `sprawdz-tutora` mają odpowiedniki npm w głównym README
(`wp:sync`, `wp:tutor`), więc realnie nie do znalezienia są **`opis`,
`zrzuty`, `proza`** oraz — już zgłoszone — `sieroty`.

---

## Tabela: deklaracja / zmierzone (wszystko, co policzyłem)

| Deklaracja | Gdzie | Zmierzone | Komenda | Werdykt |
|---|---|---|---|---|
| wersja `0.65.0` | README:51 / CHANGELOG:8 | `0.65.0` | `head -8 CHANGELOG.md`, `git tag` | ✅ |
| strażników 39 | README (tabela) | 39 plików, 39 wierszy, runner **kod 0** | `ls tools/straznicy/straznik-*.mjs \| wc -l`; `node tools/straznicy/uruchom-wszystkie.mjs` | ✅ |
| „psuje repo na 351 sposobów" | README:383 | 351 wpisów (332 mutacje + 19 kontrprzykładów) | `grep -c '^\s*straznik:' tools/straznicy/audyt-straznikow.mjs` | ✅ |
| 83 testy (×2 miejsca) | README:435, :580 | 83 | `grep -cE '^\s*(test\|it)\(' $(find … -name '*.test.ts')` | ✅ |
| 73 lekcje prozy | README, wiele | 73 | `git ls-files 'tresc-kursow/**/proza-*.md' \| wc -l` | ✅ |
| 91 scenariuszy | README | 91 | `git ls-files 'tresc-kursow/**/lekcja-*.md' \| wc -l` | ✅ |
| 148 zrzutów | README:599 | 148 | `git ls-files 'tresc-kursow/**/zrzuty/*.webp' \| wc -l` | ✅ |
| `tools/` 158 | README:199 | 158 | `git ls-files tools \| wc -l` | ✅ |
| `goldeny/` 9, `public/` 15, `tresc-kursow/` 331 | README:200, 197, 196 | 9 / 15 / 331 | `git ls-files <kat> \| wc -l` | ✅ |
| narzędzia (22) | README:199 | 22 | `ls tools/*.mjs \| wc -l` | ✅ |
| `wordpress/` 135, `aai-platnosci/` 18, `docs/` 140 | README:190–199 | 136 / 19 / 141 | `git ls-files … \| wc -l` | ❌ **znane** |
| 28 / 14 / 13 klas | SCHEMATY:28,44,60 | 28 / 14 / 13 | `grep -rhoE '^(final )?class …' \| wc -l` | ✅ |
| Plugin 1 — 5 tabel | README:157, SCHEMATY:28 | 5 | `grep -c 'CREATE TABLE'` + `uninstall.php:38` | ✅ |
| Plugin 2 — 2 tabele | README:158, SCHEMATY:44 | 2 | j.w. | ✅ |
| **Plugin 3 — 2 tabele** | **README:159** | **3** | `grep -c 'CREATE TABLE' …monitor-tabele.php`; `wszystkie()`; `uninstall.php:38` | ❌ **D6** |
| Plugin 3 — 3 tabele | SCHEMATY:60, DIAGRAM:213 | 3 | j.w. | ✅ |
| „dwie tabele przez dbDelta" + lista trzech | DIAGRAM P3:264 | 3 | j.w. | ❌ **D6** |
| `straznik-csp` 9 niezmienników | README:463, sc:66, K2Z:113, nagłówek strażnika | **10** wypisanych | `sed -n '11,27p' straznik-csp.mjs` | ❌ **D4** |
| `straznik-csp` 10 mutacji | j.w. | **11** | rozbicie audytu po `straznik:` | ❌ **D4** |
| `straznik-limitera` 11 niezmienników | README:464, sc:50, K2Z:114, nagłówek | **13** wypisanych | `sed -n '11,30p' straznik-limitera.mjs` | ❌ **D4** |
| `straznik-limitera` 14 mutacji | j.w. | **17** (+2 kontrpr.) | rozbicie audytu | ❌ **D4** |
| `straznik-limitow` 10 / 12 | README:465 | 10 wypisanych / 11+1 = 12 wpisów | j.w. | ✅ |
| `straznik-seo` 6 / 6 | README:469 | 6 wypisanych / 6 mutacji | j.w. | ✅ |
| `straznik-kreatora-wp` 11 mutacji | KREATOR:258 | 22 (+1) | rozbicie audytu | ❌ (kontekst historyczny) |
| `straznik-tutora` 12 mutacji | ETAP-WP:702 | 15 (+1) | j.w. | ❌ (kontekst historyczny) |
| `straznik-asercji` 5 mutacji | PRZELOT-ZRZUTOW:143 | 6 (+1) | j.w. | ❌ (kontekst historyczny) |
| „CI: cztery joby" | README:434 | 5 | `awk` po `ci.yml` | ❌ **D7** |
| legenda „pięciostanowa" | README:452, sc:19 | 6 wierszy | `sed -n '19,29p' docs/security-checklist.md` | ❌ **D2** |
| 🚧 „nie opisuje żadnej pozycji" | sc:28 | 0 pozycji (1 trafienie = legenda) | `grep -n '🚧'` | ✅ |
| komendy WP-CLI `aai-sklep` | wordpress/README:73–77 | 8 w kodzie, 3 opisane | `grep public function …-cli.php` | ❌ **D8** |
| `KOLEJNOSC-INSTALACJI.txt` w paczce | INSTRUKCJA:39 | powstaje | `tools/pakuj-wtyczki.mjs:284` | ✅ |
| menu „Automatic AI": Kursy / Nowy kurs / Monitoring | INSTRUKCJA:138–142 | dokładnie te trzy | `add_menu_page`/`add_submenu_page` w panelu i ekranie | ✅ |
| 7 zrzutów instrukcji istnieje | INSTRUKCJA | 7/7 | `ls docs/zrzuty/instalacja/` | ✅ |
| „`sprawdz` powie o rozjeździe waluty" | INSTRUKCJA:300 | jest | `…platnosci-cli.php:764–770` (`'PLN' !== $waluta`) | ✅ |
| „wtyczki nigdy nie kasują danych przy wyłączeniu" | INSTRUKCJA:121, :204 | prawda | `uninstall.php` ×3 (bramka opcji), `register_deactivation_hook` ×2 | ✅ |
| wersje wtyczek 0.6.0 / 0.2.0 / 0.5.0 | nagłówki ↔ `readme.txt` | zgodne, każda ma wpis changeloga | `grep 'Version:'`, `grep 'Stable tag:'`, `grep '^= '` | ✅ |
| `Requires at least: 6.5` / `Requires PHP: 8.1` | 3× nagłówek + 3× readme.txt + INSTRUKCJA:54 + schemat P1 | **8 miejsc** deklaruje wersję, wszystkie spójne; środowisko stoi na `wordpress:6.9.4-php8.4` | `grep -rn 'Requires at least\|Requires PHP'`; `compose.yml:38` | ✅ / rozjazd 6.9.4 vs „6.5+" **znany** |
| odsyłacze i kotwice w dokumentacji | wszystkie `.md` poza `dokumentacja-techniczna/` i `audyt/` | **572 sprawdzone, 0 martwych** | własny skrypt (reguła kotwic GitHuba, bez zwijania spacji) | ✅ |
| wiersze tabel z treścią po `\|` | wszystkie `.md` poza `audyt/` | README **0**; `docs/plugin-3/DIAGRAM.md` **3** (2677 znaków) | własny przelot po 508 plikach | ❌ **D3** |
| skrypty npm opisane w README | `package.json` | wszystkie poza `pretest` (świadomie pomijany) i `test` (opisany jako `npm test`) | porównanie `package.json` ↔ README | ✅ |
| gałęzie modułowe `plugin-X-…` | CONTRIBUTING:31 | tylko `plugin-1-sklep-kursow`; `plugin-2/3` nigdy nie istniały | `git ls-remote --heads origin`, `git log --all` | ❌ **D1** |
| „3 moduły + 3 bazy" jako 1.0.0 | CONTRIBUTING:45 | jedna baza (`db1_kursy`) | `ls modules/`, `CHANGELOG:390` | ❌ **D1** |
| „docelowy hosting Node.js" | CONTRIBUTING:39 | WordPress (PLAN:15 „zastępuje…") | `grep -n 'hosting' docs/PLAN.md` | ❌ **D1** |
| security-checklist „utrzymywany" | README:451 | ostatnia zmiana 2026-08-19, 0 wzmianek o wtyczkach | `git log -- docs/security-checklist.md`; `grep -c` | ❌ **D2** |

---

## Co było BEZ ZARZUTU (nie szukać drugi raz)

1. **Wszystkie odsyłacze i kotwice** — 572 sprawdzone, **zero** martwych,
   łącznie z kotwicami spisu treści w `INSTRUKCJA-INSTALACJI.md`
   (`#4-instalacja--trzy-wtyczki-po-kolei` jest **poprawna** — GitHub nie zwija
   podwójnej spacji po usuniętym półpauzie; pierwszy przelot dał tu fałszywy
   alarm mojego własnego skryptu).
2. **Suma mutacji 351** i **83 testy** — obie liczby prawdziwe co do wpisu;
   `straznik-readme` w swoim zakresie miał rację, tak jak przy 0.63.0.
3. **Strażnicy 39/39, kod wyjścia 0** (mierzone bez potoku).
4. **Liczby treści**: 73 lekcje, 91 scenariuszy, 148 zrzutów, 37 szablonów
   wtyczek, `tools/` 158, `goldeny/` 9, `public/` 15, `tresc-kursow/` 331.
5. **Wersje wtyczek**: `Version:` w nagłówku = `Stable tag:` w `readme.txt`
   w każdej z trzech, a każda bieżąca wersja ma swój wpis `= X.Y.Z =`.
   `wordpress/README.md:26–28` wprost tłumaczy dwie numeracje (wersja projektu
   vs wersja wtyczki) — pytanie zgłoszone właścicielowi 2026-08-31 jako
   „mylące" **jest w repo rozstrzygnięte**.
6. **`docs/INSTRUKCJA-INSTALACJI.md` merytorycznie**: menu, kolejność
   instalacji, zachowanie przy wyłączeniu i odinstalowaniu, ostrzeżenie
   o walucie (kontrola waluty naprawdę istnieje w `cli.php`), siedem zrzutów
   ekranu na miejscu, `KOLEJNOSC-INSTALACJI.txt` naprawdę powstaje w `npm run
   pakuj`. Poza znaną pozycją (brak kanału kontaktu przy 9 odesłaniach
   „napisz do nas" i otwieranie sprzedaży wyłącznie przez WP-CLI) nie
   znalazłem w niej nieprawdy.
7. **`docs/PLAN.md`** — ma datowane bloki `KOREKTA` przy §3 i §4 oraz
   nagłówek „zastępuje plan »hosting Node.js/VPS«"; to wzorzec, którego
   brakuje w `CONTRIBUTING.md`.
8. **`docs/SCHEMATY.md`** — liczby klas i tabel zgodne z kodem (to jedyny
   dokument, który zna trzy tabele Pluginu 3); opis „czego strażnik NIE umie"
   uczciwy.
9. **`straznik-readme` reguła 8** działa w swoim zakresie: 0 naruszeń
   w README.

---

## Czego NIE sprawdziłem i dlaczego

- **Liczby sprawdzeń w bramkach WP** (`smoke:wp-* = 30/86/44/57/102/…`)
  i `npm run check` w całości — wymagają żywego `:8892`, a na tych portach
  pracuje inny agent (zakaz z polecenia). Deklaracje przepisane z CHANGELOG-a
  zostają niezweryfikowane.
- **`node tools/straznicy/audyt-straznikow.mjs`** — psuje pliki w trakcie;
  policzyłem wpisy statycznie zamiast go uruchamiać. Ryzyko: gdyby któraś
  mutacja była martwa, mój licznik i tak liczyłby ją jako istniejącą.
- **Liczby haków w `docs/SCHEMATY.md`** (26 / 25 / 10) — „hak" nie ma tu
  definicji maszynowej (`add_action`+`add_filter`+`register_*_hook`+ dorejestrowania
  warunkowe dają różne wyniki zależnie od przyjętej reguły), więc każdy mój
  wynik byłby spekulacją, a nie pomiarem.
- **Tabela pomiarów PSI** (README:521–526) — pilnuje jej `straznik-progow`
  wobec `goldeny/pomiary-lighthouse.json`, a powtórzenie pomiaru wymaga
  deployu i klucza PSI.
- **`CHANGELOG.md` (5670 linii) i `CLAUDE.md` (3522 linie)** przejrzałem
  wzorcami, nie linia po linii — oba są z definicji dziennikami z zapisami
  historycznymi, więc „nieaktualne" nie znaczy tam „nieprawdziwe".
  Sprawdziłem w nich wyłącznie deklaracje o stanie bieżącym.
- **`docs/dokumentacja-techniczna/**`** — 113 martwych odsyłaczy w plikach
  `cytowane/` pochodzi z ORYGINAŁÓW (docs Anthropic i GitHuba), nie z naszej
  pracy; wyłączyłem ten katalog świadomie.
- **`audyt/`** — poza zakresem (aparat audytu, nie dokumentacja produktu).
