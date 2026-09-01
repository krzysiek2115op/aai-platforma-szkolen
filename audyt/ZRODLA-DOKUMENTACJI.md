# Źródła dokumentacji sektora AUDYT

**Etap E3.** Pliki opisane niżej leżą **poza drzewem repozytorium**, w
`~/.cache/aai-audyt-dokumentacja/` (44 MB, 4944 pliki). W repo zostaje wyłącznie
ten dokument.

**DLACZEGO POZA DRZEWEM, A NIE TYLKO POZA GITEM.** Pierwsza wersja kładła je
w `audyt/dokumentacja/` z zagnieżdżonym `.gitignore`. Git był zadowolony,
`straznik-linkow` **nie**: strażnicy skanują **dysk, nie git**, a pliki MDN mają
odsyłacze bezwzględne (`/en-US/docs/…`), które lokalnie nie prowadzą donikąd —
**66 fałszywych alarmów** w jednym przebiegu. Wykluczenie cudzej dokumentacji
jest w strażniku wpisane na sztywno na jedną ścieżkę
(`docs/dokumentacja-techniczna`), a sektor nie może go rozszerzyć, bo to plik
poza `audyt/`.

To ta sama klasa, przez którą motyw Automatic AI mieszka w
`~/.cache/automatic-ai-warsztat`. Skrypt **odmawia pracy** (kod 1), gdy katalog
docelowy wskazuje w drzewo repo — sprawdzone testem negatywnym.

Ścieżkę można zmienić zmienną `AAI_AUDYT_DOKUMENTACJA`.

**Odtworzenie kompletu — jedna komenda, idempotentna:**
```
node audyt/tools/pobierz-dokumentacje-audyt.mjs
```
Drugi przebieg pobiera **zero** plików i kończy się kodem 0. `--odswiez` wymusza
pobranie od nowa, `--tylko=<grupa>` ogranicza do jednej grupy.

---

## ZASADA KOTWICY (rozstrzygnięcie właściciela, 2026-09-01)

> Pobieramy **wyłącznie** to, na co wskazuje co najmniej jedna pozycja checklisty
> z [`ROLE.md`](ROLE.md) albo jawna potrzeba roli.

Każde źródło ma niżej kolumnę **kotwica** i tę samą kotwicę ma w kodzie skryptu.
Powód jest liczbowy: dokumentacja czytana przez **~80 agentów w dwóch falach**
kosztuje przy każdym z nich. Materiał, którego nikt nie ma powodu otworzyć, nie
jest zapasem — jest podatkiem płaconym 160 razy.

---

## Co pobraliśmy

| Grupa | Plików | Waga | Typ (§10 regulaminu) | Kotwica |
|---|---|---|---|---|
| `cudzy-kod/` | 4888 | 42 MB | 5 — specjalistyczna | INT-01…INT-11 |
| `owasp/` | 22 | 556 kB | 5 — specjalistyczna | SEC-01…SEC-12, PRIV-01, PRIV-02, BE-12, KON |
| `narzedzia/` | 2 | 1,4 MB | 5 — specjalistyczna | USP-01, USP-03, PERF-08 |
| `mdn/` | 12 | 148 kB | 2 + 6 | SEC-07, FE-*, INT-05, PERF-02, PERF-04 |
| `agentowa/` | 3 | 168 kB | 7 — agentowa (P4) | wszystkie role |
| `php/` | 8 | 120 kB | 6 — systemowa | SEC-12, BE-08, BE-10, INT-04 |
| `prawo/` | 9 | 100 kB | 1 — dziedzinowa | PRIV-01…PRIV-07 |

### `cudzy-kod/` — to jest KOD, nie dokumentacja

Tutor LMS **861 plików PHP**, WooCommerce **4025 plików PHP**, skopiowane
z kontenera `aai_wp_wordpress` (środowisko `:8892`), bez `node_modules` i bez
zasobów. **INT-01 żąda dowodu z kodu, nie z manuala** — i ma po temu powód
zapisany w tym repo: dokumentacja Tutora rozjeżdża się z jego zachowaniem, a
komunikaty GitHuba w kursie 2 były przez to nieprawdziwe w czterech miejscach.
Kopia jest weryfikowana **liczbą plików po obu stronach** — różnica zatrzymuje
przebieg.

### `prawo/` — cięcie, które trzeba znać

**EUR-Lex i Cellar są niedostępne dla automatu.** Zmierzone: `eur-lex.europa.eu`
oddaje **HTTP 202 z pustym ciałem** na każdą próbę (także po odczekaniu),
a `publications.europa.eu/resource/celex/…` oddaje **400**. Nie da się więc
pobrać polskich tekstów z Dziennika Urzędowego tym kanałem.

Bierzemy to, co odpowiada, i **nazywamy rangę źródła wprost**:

| Plik | Źródło | Ranga |
|---|---|---|
| `rodo-art-*.md` (8 artykułów) | `gdpr-info.eu` | **wierny przedruk, nie Dziennik Urzędowy**; wersja angielska |
| `ustawa-o-prawach-konsumenta.md` | `arslege.pl` | **portal komercyjny, nie ISAP**; wersja polska |

**Czego NIE mamy i dlaczego:** dyrektywy 2011/83/UE i 2019/770 w polskiej wersji
urzędowej — kanał zablokowany (wyżej). Ustawa o prawach konsumenta pokrywa
polskie wdrożenie obu, więc luka dotyczy brzmienia unijnego, nie zasady.

**To wystarcza do zadania, jakie ma PRIV, i nie wystarcza do żadnego innego.**
Dział ma **wiedzieć, o co pytać** — nie wydawać opinii prawnych. Rozstrzygnięcia
prawne w tym projekcie i tak czekają na prawnika (pozycja „przed pierwszym
klientem": regulamin, zgoda w kasie na natychmiastowe dostarczenie).

### `owasp/` — 22 arkusze, jeden odrzucony z powodu

`Access_Control_Cheat_Sheet.md` **jest wycofany** — pod adresem stoi stub 175 B
z odesłaniem do `Authorization_Cheat_Sheet.md`, który już pobieramy. Wykryła to
bramka długości treści, nie lektura.

### `mdn/` — ślad po przebudowie drzewa

MDN przeniosło treść do `reference/` i `guides/`; trzy pierwotne ścieżki dawały
**404**. Poprawne dziś: `web/css/guides/cascade/`,
`web/css/reference/at-rules/%40layer/` (małpa **musi** być zakodowana jako `%40`),
`web/css/reference/values/revert-layer/`.

---

## Czego świadomie NIE pobieraliśmy

| Materiał | Powód |
|---|---|
| Dokumentacja WordPressa, MySQL, WooCommerce, Tutora | **już mamy** — `docs/dokumentacja-techniczna/wordpress/`, 948 plików, 9,6 MB |
| Dokumentacja Next.js (d1–d6) | **już mamy** — 32 pliki, 236 kB |
| Cytaty do lekcji (d7) | kursy poza zakresem audytu (**D4**) |
| Pełne manuale dziedzin (całe OWASP, cały WCAG, cały manual MySQL) | zasada kotwicy — bez pozycji checklisty wskazującej dokument nie pobieramy |
| `node_modules` i zasoby Tutora/Woo | audyt grepuje logikę; 96 MB → 42 MB po zawężeniu do PHP |

---

## Bramka jakości pobrania

Skrypt **kończy kodem 1**, gdy którekolwiek źródło zawiedzie, i wypisuje je
z nazwy. Katalog wyglądający na kompletny przy cichym pominięciu źródła byłby tą
samą klasą co „test przechodzi po pustce".

**Próg mierzy TREŚĆ, nie plik.** Pierwsza wersja liczyła długość razem
z nagłówkiem: trzy dokumenty prawne przyszły puste, sam nagłówek waży ~200 B,
więc przeszły bramkę i **zameldowały sukces**. Dziś próg wynosi **1500 B samej
treści** i jest sprawdzony testem negatywnym na dwa sposoby — źródłem
oddającym `HTTP 202` z pustką oraz stubem 175 B, który wraca z **kodem 200**.
Oba dają kod wyjścia 1 i nazwę pliku.
