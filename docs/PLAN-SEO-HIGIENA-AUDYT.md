# Plan domknięcia projektu: SEO → higiena repo → audyt końcowy

**CZYTAĆ PRZED PRACĄ.** Dokument powstał 2026-08-31, po wydaniu **v0.59.0**
(zabezpieczenia, PR #107) i po zaliczeniu testów ręcznych. Ustala trzy ostatnie
kroki projektu i ich kolejność — narzuconą przez właściciela:

> **1. SEO → 2. higiena repo → 3. audyt końcowy projektu.**

Obowiązuje reguła właściciela z 2026-08-28: **przed KAŻDYM krokiem agent
przedstawia plan przebiegu i pytania doprecyzowujące, i czeka na zgodę** —
dopiero potem kod.

---

## Stan wyjściowy (zmierzony 2026-08-31, nie przepisany z notatek)

| Co | Stan |
|---|---|
| `main` | (stan z chwili pisania: `c2198dc`, tag **v0.59.0**) — **dziś `v0.63.0`**, drzewo czyste |
| Wtyczki | trzy SKOŃCZONE: `aai-sklep` (W1–W6), `aai-platnosci` (P1–P6), `aai-monitor` (T1–T4) |
| Test całości | zrobiony, PR #107 zmergowany |
| Testy ręczne | **zaliczone** (właściciel, 2026-08-31) |
| Bramki | strażnicy **38/38**, testy **83/83**, audyt mutacyjny **319** |
| Środowisko `:8892` | stoi, z aktywnym obwodem i egzekwującym CSP |
| CI | stoi od 2026-08-18 (**2121 minut Actions przy limicie 2000**); wraca **1 września** — wtedy potwierdzić **gitleaks** |

### Praca zaparkowana — SCALONA 2026-08-31 (zapis historyczny)

> [!NOTE]
> **Gałąź `feat/zamrozenie-ceny-w-zamowieniu` jest zmergowana** (PR #111,
> tag `v0.61.0` + release), a **worktree usunięty**. Przed PR-em wciągnięto
> `main` i zweryfikowano artefakt. Konflikt był jeden i pouczający: obie
> strony dopisały nową regułę `straznik-platnosci-wp` w tym samym miejscu
> (38 z `main`, 42 z gałęzi) — **obie zostały**, a plik złożono z dwóch
> wersji zamiast sklejać zagnieżdżone klamry w konflikcie.

Worktree **`/home/krzysiek/Pod-strona-Szkolenia-zamrozenie`**, gałąź
**`feat/zamrozenie-ceny-w-zamowieniu`**, 14 plików. Powstała 2026-08-31
z pytania właściciela o bezpieczeństwo płatności. Zawiera:

- **regułę 42 `straznik-platnosci-wp`** — żadna z trzech wtyczek nie przelicza
  ZŁOŻONEGO zamówienia (kwotę zamraża WooCommerce przy składaniu:
  `WC_Checkout::set_data_from_cart()` kopiuje `subtotal`/`total` do POZYCJI
  zamówienia, a `payment_complete()` już niczego nie liczy);
- **asercję zamrożenia ceny NA DANYCH** w `smoke-wp-zakup` (41 → 51 sprawdzeń):
  zamówienie złożone przy 199 zł nie drga po zmianie ceny kursu na 249 zł —
  ani kwotą, ani pozycją, ani przy domknięciu;
- **lukę B**: trzecie, osobne pytanie przy „Usuń kurs" o ZŁOŻONE, jeszcze
  nieopłacone zamówienia. `Aai_Sklep_Tutor::kupujacy()` liczy wyłącznie zapisy
  `completed`, więc klient czekający na przelew był dla tamtego pytania
  NIEWIDZIALNY — usunięcie kursu w tym oknie znaczyło „zapłacił i nie dostał
  nic". Odpowiada filtr `aai_sklep_zamowienia_w_drodze` (Plugin 2), Plugin 1
  dalej nie wie nic o WooCommerce.

Dowody na chwilę parkowania: strażnicy 37/37, audyt 309 (0 przeoczonych,
0 martwych), `npm run check` kod 0, 12 bramek WP zielonych.

**Gałąź stoi na `09d6c79`, czyli PRZED v0.59.0.** Przed jej PR-em trzeba
wciągnąć `main` i zweryfikować ARTEFAKT (`git diff` puste), a nie sam fakt
udanego merge'a (lekcja z 0.37.0). Liczby do uzgodnienia po scaleniu:
**mutacje** (moje 309 vs 319 na `main`) i **liczba w README**, której pilnuje
`straznik-readme`.

**PUŁAPKA:** `wordpress/srodowisko/compose.yml` montuje wtyczki ścieżką
WZGLĘDNĄ (`../wtyczki/aai-*`), więc `:8892` serwuje kod z tego drzewa,
w którym wstało compose. Instalacji nie da się dzielić między worktree.
Przestawienie: `cd <worktree>/wordpress/srodowisko && podman-compose down && ./postaw.sh`.

---

## KROK 1 — SEO od nowa

**Powód (właściciel):** SEO robiliśmy przy **0.24.0**, gdy nie było nawet
połowy projektu. Od tamtej pory doszły: wtyczka WP z własnym `Aai_Sklep_Seo`,
73 lekcje prozy, widok kupionego kursu, „Moje kursy", koszyk i kasa. Trzeba je
**odświeżyć w całości**, a nie łatać.

**Wzór:** repo strony głównej **`MatthewPlugins/automatic-ai`** — nasze SEO ma
być tak samo pełne. Repo jest **TYLKO DO ODCZYTU** (WYTYCZNE; BLAD-007), a
lokalny klon `/home/krzysiek/Strona internetowa FIrma ` jest z **2026-08-18**,
czyli nieaktualny. **Do porównania robić płytki klon do scratchpada**
(`git clone --depth 1`), NIE odświeżać tamtego klonu.

### Co już zmierzone — różnica wobec wzoru

Porównanie konwencji plikowych Next.js w `app/` (stan `6a88f67`, PR #131):

| Plik | oni | my |
|---|---|---|
| `robots.ts` | ✅ | ✅ |
| `sitemap.ts` | ✅ | ✅ |
| `opengraph-image.tsx` | ✅ | ✅ (3 sztuki: korzeń, `/szkolenia`, `[slug]`) |
| `icon.svg` | ✅ | ✅ |
| **`manifest.ts`** | ✅ | ❌ **BRAK — to jest ta jedna rzecz** |
| **`apple-icon.png`** | ✅ | ❌ brak |
| rastry `icon-192/512/maskable.png` | ✅ | ❌ brak |

**`manifest.ts` = web app manifest.** Ich wersja (do przeczytania w klonie)
niesie `name`, `short_name`, `description`, `start_url`, `display`,
`background_color`, `theme_color` i **cztery ikony**. Ich komentarz zawiera dwa
fakty, których nie wyprowadzać od nowa: (1) **Next NIE aplikuje `basePath` do
TREŚCI manifestu** — tylko do `<link rel=manifest>`, więc przy serwowaniu spod
podścieżki ścieżki trzeba prefiksować ręcznie (u nas dotyczy to podglądu na
GitHub Pages); (2) **samo SVG nie wystarczy** — Android przy instalacji skrótu
sięga po PNG, a bez wariantu `maskable` dokłada własne tło i przycina znak
własną maską. Rastry generuje ich `scripts/generuj-ikony-marki.mjs`.

### Zakres kroku (do zatwierdzenia przed pracą)

1. **Inwentaryzacja obu stron** — nasze SEO żyje w DWÓCH miejscach i to jest
   najważniejsze ustalenie tego kroku:
   - **prototyp Next.js**: `lib/seo.ts`, `app/robots.ts`, `app/sitemap.ts`,
     3 × `opengraph-image.tsx`, JSON-LD (Organization, ItemList, Course+Offer,
     BreadcrumbList, FAQPage), strażnik `straznik-seo` + 6 mutacji,
     `smoke-seo` (porównuje dane strukturalne Z BAZĄ);
   - **wtyczka WP `Aai_Sklep_Seo`** (421 linii) — to jest kod, który REALNIE
     pojedzie na produkcję. Ma: `pre_get_document_title`, canonical, OG
     (7 pól), Twitter Card (4 pola), `description`, `robots`, JSON-LD.
     **NIE ma sitemapy ani manifestu.** WordPress ma własne `wp-sitemap.xml`
     — sprawdzić POMIAREM, czy trafiają do niego nasze trasy `/szkolenia`
     i `/szkolenia/<slug>`, bo to nie są typy wpisów, tylko reguły
     przepisywania.
2. **Domknięcie braków** — `manifest.ts` + rastry ikon po stronie prototypu
   i odpowiednik po stronie WP; reszta wg wyniku inwentaryzacji.
3. **`lastModified` w sitemapie — DO ROZSTRZYGNIĘCIA POMIAREM.** Przy 0.24.0
   świadomie go pominęliśmy („nie mamy prawdziwej daty zmiany treści").
   Dziś kursy mają w bazie `updated_at` (`modules/m1-sklep/odczyt.ts:51`),
   a wzór pokazuje, że oni podają `lastModified` tam, gdzie data jest
   PRAWDZIWA (z frontmattera), a pomijają tam, gdzie nie jest. Sprawdzić, czy
   nasze `updated_at` znaczy „zmiana treści", czy „dotknięcie wiersza" —
   i dopiero wtedy decydować.
4. **Pomiar tym samym narzędziem co poprzednio** (polecenie właściciela):
   **PageSpeed Insights**, `PAGESPEED_KLUCZ` w `.env`,
   `node tools/pomiar-psi.mjs`, mediana z 5 przebiegów, golden
   `goldeny/pomiary-lighthouse.json`. **Nie mierzyć lokalnym Lighthouse'em** —
   ten mierzy też obciążenie laptopa (pamięć projektu).
5. **Aktualizacja tabeli pomiarów w README** — polecenie właściciela wprost.

### Pułapki z poprzedniego przelotu SEO (0.23.0–0.25.0) — nie powtarzać

- `opengraph-image.tsx` w eksporcie statycznym daje plik **BEZ rozszerzenia** →
  Pages podaje `octet-stream` → scrapery odrzucają miniaturę. Naprawia
  `tools/og-rozszerzenie.mjs` **po buildzie**, a wisi on na komendzie
  `build:podglad` — **deploy musi wołać TĘ SAMĄ komendę co człowiek**
  (BLAD-012 to nawrót tej klasy).
- **Konwencja plikowa Next nie dziedziczy się w dół** — `/szkolenia` nie
  dostało obrazka z `app/opengraph-image.tsx`, trzeba było osobnej trasy.
- `app/robots.ts` i `app/sitemap.ts` **MUSZĄ mieć `dynamic = "force-static"`**,
  inaczej `output: export` pada. To samo będzie dotyczyć `manifest.ts`.
- **`SEO_INDEKSOWANIE=1` wyłącznie do pomiaru** kolumny SEO — domyślnie NIE
  indeksujemy (`lib/seo.ts`), a `noindex` punktowo zaniża wynik.
- **`Offer.availability` = `PreOrder`** dopóki zakup nie jest prawdziwy;
  pilnuje tego smoke.
- **Po deployu odczekać ≥10 minut przed pomiarem** — edge cache Pages ma
  `max-age=600`, a nazwy chunków Next NIE pochodzą z treści, więc weryfikacja
  po jednym pliku przechodzi przeciw STAREMU deploymentowi.
- **Każdy nowy test sprawdzić testem negatywnym.** Przy 0.24.0 test miniatur
  był ślepy (wzorzec `[^"?]*`, a Next dokleja sygnaturę `?455fcc13`).

---

## KROK 2 — higiena repo — ZROBIONY (0.62.0 + 0.63.0)

> [!NOTE]
> **Krok zamknięty 2026-08-31, w dwóch turach** (PR #112 i #113, tagi
> `v0.62.0` i `v0.63.0`). Poniższy zakres jest zapisem tego, od czego
> ruszył — wynik i lekcje są w CHANGELOG 0.62.0 / 0.63.0 oraz w `CLAUDE.md`.
>
> **Dwie rzeczy warte zapamiętania:** (1) `straznik-readme` był ZIELONY przez
> cały czas i miał rację — wszystkie nieprawdy siedziały w jego martwym polu
> (proza o stanie, składnia tabel, narzędzia bez wejścia); (2) pierwsza tura
> naprawiła sekcję „Stan projektu" w README i **zatrzymała się nad nią**,
> a ta sama nieprawda żyła sto linii niżej — zgłosił ją właściciel zrzutem.
> **Przelot musi objąć CAŁY plik, nie sekcję, od której zaczęło się szukanie.**
>
> **Rozstrzygnięte przy okazji:** układ wtyczek zostaje bez zmian
> (`wordpress/wtyczki/` + trzy podfoldery istnieje od W1; README go teraz
> POKAZUJE), a **przed audytem końcowym wchodzą schematy draw.io wszystkich
> trzech wtyczek** — dla klientów technicznych i nietechnicznych.


**Powód (właściciel):** „repo jest bardzo za nami z tym, co już mamy i co
robimy". README i cała dokumentacja mają mówić **prawdę o tym, w którym
miejscu jesteśmy i co jest gotowe**.

### Znane rozjazdy na dzień 2026-08-31

- **`CLAUDE.md` mówi, że test całości jest „w toku"**, a CHANGELOG i README
  „jeszcze nienapisane" — to nieprawda od v0.59.0 (zgłosił drugi czat,
  aktualizacja czekała na zgodę właściciela).
- **Liczby**: strażnicy 38, mutacje 319, testy 83 — sprawdzić każdą liczbę
  w README POMIAREM. Pilnuje ich `straznik-readme` (kotwice w prozie, liczba
  testów ze zliczenia `test()`/`it()`, liczba mutacji z wpisów w audycie).
- **Prototyp w dwóch miejscach obiecuje EBOOKI**, choć właściciel zamknął ten
  temat „na zawsze" 2026-08-25: `app/layout.tsx:12`,
  `app/szkolenia/widok.tsx:20` („Kursy i ebooki Automatic AI…") oraz typ
  `ebook` w `components/kreator/FormularzKursu.tsx`. We wtyczce WP opis jest
  już poprawny. **`straznik-obietnic` tego NIE łapie** — czyta widoki kursów,
  nie metadane katalogu. Do rozstrzygnięcia: prostować prototyp (jest
  specyfikacją wykonawczą) czy pilnować tylko wtyczki.
- **Gałęzie**: po v0.59.0 sprawdzić, co zostało zdalnie i lokalnie; reguła od
  2026-08-19: każdy nowy merge z `--delete-branch`, gałęzie `bak/*` zostają.
- **Worktree**: `git worktree list` jest jedynym źródłem prawdy; istnienie
  worktree NIE znaczy, że trwa w nim praca.

### Co doszło z kroku 1 (zmierzone 2026-08-31)

- **Gałęzi zdalnych jest PIĘĆ, nie trzydzieści**: `main`,
  `plugin-1-sklep-kursow`, `bak/2026-08-17-hydratacja-fontow`,
  `bak/2026-08-17-pasek-fixed-transform` i jedna dependabota. Większa lista
  widziana wcześniej była **przeterminowanym stanem lokalnym** — liczyć
  `git fetch --prune`, nigdy z pamięci ani ze starego `git branch -r`.
- Lokalnie zostaje `docs/plan-seo-higiena-audyt` (scalona przez #108)
  oraz `feat/zamrozenie-ceny-w-zamowieniu` (do scalenia, patrz wyżej).
- **`tools/okladki-png.mjs` jest nie do znalezienia**: nie ma go w
  `package.json`, w README ani w żadnym strażniku — wspominają go tylko
  CHANGELOG, CLAUDE.md i KROK-P5.md. Dla kontrastu `tools/ikony-marki.mjs`
  z kroku 1 dostał `npm run ikony` i wiersz w README. Do wyrównania.
- **Liczby po kroku 1**: strażnicy 38, mutacje **328**, testy 83.

### Wzór — co można zaczerpnąć z `automatic-ai`

Ich `scripts/` (nazwy zmierzone, nie zgadnięte) niosą pomysły, których u nas
nie ma: `pilnuj-sitemap.mjs`, `pilnuj-meta.mjs`, `napraw-404-meta.mjs`,
`dopisz-lastmod.mjs`, `sprawdz-swiezosc.mjs`, `sprawdz-daty.mjs`,
`sprawdz-changelog.mjs`, `pilnuj-dlug.mjs`, `pilnuj-dokumenty.mjs`,
`sprawdz-redos.mjs`, `sprawdz-bez-js.mjs`, `sprawdz-klawiature.mjs`,
`pilnuj-a11y.mjs`, `pilnuj-kontrast.mjs`, `generuj-ikony-marki.mjs`.
**Zaczerpnąć POMYSŁ, nie skopiować plik** — tamto repo ma inną strukturę
(Tailwind, blog, brak wtyczek WP), a WYTYCZNE zabraniają go modyfikować.
Do naśladowania też ich konwencja commitów: temat opisuje **SKUTEK**, nie
czynność.

---

## PRZED KROKIEM 3 — schematy draw.io trzech wtyczek — **ZROBIONE (0.64.0)**

**Wynik:** siedem diagramów w czterech plikach `.drawio`, indeks
[SCHEMATY.md](SCHEMATY.md), instrukcja dla klienta nietechnicznego
[INSTRUKCJA-INSTALACJI.md](INSTRUKCJA-INSTALACJI.md), skrypt pakujący
`npm run pakuj` i 39. strażnik pilnujący zgodności rysunku z kodem.
Kodu wtyczek nie tknięto. Pełnia: CHANGELOG 0.64.0 i CLAUDE.md.

Zapis historyczny — tak ten krok wyglądał przed wykonaniem:

### 

**Decyzja właściciela 2026-08-31:** przed audytem końcowym powstają schematy
w **draw.io** dla WSZYSTKICH TRZECH wtyczek, w dwóch wariantach — dla klienta
**nietechnicznego** i **technicznego**. Właściciel poda własny prompt
z wymaganiami; **nie zakładać zakresu przed nim**.

**Fakt zmierzony, od którego ta praca się zacznie: nie istnieje żaden
dokument opisujący trzy wtyczki RAZEM.** Są trzy osobne `DIAGRAM.md`
w mermaidzie ([P1](plugin-1/DIAGRAM.md), [P2](plugin-2/DIAGRAM.md),
[P3](plugin-3/DIAGRAM.md)), każdy pisany w innym momencie i dla technika,
i żaden nie pokazuje szwów MIĘDZY wtyczkami ani granicy wobec WooCommerce
i Tutora. Złożenie materiału będzie główną pracą, nie samo rysowanie.

## KROK 3 — audyt końcowy projektu

**Wytyczne do niego poda właściciel przy jego tworzeniu.** Nie planować go
teraz i nie zakładać zakresu.

Wiadomo tylko tyle: ma być ostatni, po SEO i po higienie. Wzorce z historii
projektu, gdyby się przydały: przegląd pary **agent + krytyk** na rozłącznych
obszarach, **żadne znalezisko bez potwierdzenia URUCHOMIENIOWEGO**, a na końcu
**sweep krzyżowy** — bo to on znajduje rzeczy, których nie znajdują etapy
(tak wyszedł BLAD-026 i cicha utrata 18 lekcji Kursu 2 w sweepie P5).

---

## LISTA WDROŻENIOWA SEO — co zostaje POZA naszymi wtyczkami

Powstała z reguły podziału przyjętej w kroku 1 (wariant „b"): wtyczka pilnuje
tylko swoich tras. Poniższe adresy **nie istnieją z naszego powodu**, więc ich
nie ruszaliśmy — należą do właściciela witryny i do motywu. Wszystkie
zmierzone 2026-08-31 przy `blog_public = 1`.

| Co | Stan | Czyje |
|---|---|---|
| `/shop/` (archiwum produktów Woo) | w mapie, **200**, ale pusta lista — produkty kursów są w Woo `hidden` (P2) | decyzja właściciela: czy strona ma w ogóle istnieć |
| `/sample-page/`, `/hello-world/` | w mapie — domyślne śmieci instalacji WordPressa | do skasowania przy wdrożeniu |
| blog (`/wp-sitemap-posts-post-1.xml`), kategorie, tagi | w mapie — treść strony głównej Automatic AI | motyw / właściciel treści |
| **`<link rel="manifest">` dla całej witryny** | **BRAK** — motyw daje `icon.svg` i `apple-icon.png`, manifestu nie ma wcale | motyw (jest tylko do odczytu; nasz `app/manifest.ts` może posłużyć za wzór) |
| `blog_public` | na środowisku roboczym **0** — i to jest poprawne | **przy wdrożeniu MUSI wejść na 1**, inaczej nie ma ani mapy, ani indeksu |

**Ostatnia pozycja jest najważniejsza i najłatwiejsza do przeoczenia:** cała
praca kroku 1 jest w produkcji niewidoczna, dopóki `blog_public` = 0. Rdzeń
bramkuje tą jedną opcją CAŁĄ sitemapę (zmierzone: `/wp-sitemap.xml` → 404).

---

## Rzeczy otwarte, o których audyt musi wiedzieć

- **1 września wraca CI** — potwierdzić **gitleaks**, jako jedyny bez lokalnego
  odpowiednika (czeka od czternastu wersji).
- **Przed pierwszym klientem** (poza modułami): prawdziwa bramka płatności
  (Tpay/PayU/P24 jako wtyczka do Woo), **regulamin**, **zgoda w kasie na
  natychmiastowe dostarczenie treści cyfrowej** (wyłącza ustawowe 14 dni
  odstąpienia — wymaga prawnika), domena `automaticai.pl` + HTTPS, poczta
  produkcyjna, oraz **polityka prywatności rozjechana ze stanem witryny**
  (wypiera się ciastek, choć Woo i WP je stawiają — rozjazd STARSZY od naszych
  wtyczek, świadomie nietknięty).
- **Zobowiązania handlowe** na stronach sprzedażowych („dostęp bez limitu",
  „aktualizacje bez dopłat", „odpowiadam osobiście") — nigdy nie
  rozstrzygnięte.
- Sześć pozycji „plauzybilnych" z przeglądu architektury testu całości zostaje
  otwartych świadomie (m.in. brak memoizacji `cta_kursu()` i `ma_kursy()`).

---

## KROK 1 — pomiary i rozstrzygnięcia (2026-08-31)

### Co zmierzono PRZED pisaniem kodu

| # | Pomiar | Wynik |
|---|---|---|
| 1 | `/wp-sitemap.xml` | **404** — rdzeń WP bramkuje sitemapę opcją `blog_public`, a środowisko ma `0`. Ustawienie środowiska, nie nasz kod |
| 2 | Zawartość sitemapy przy `blog_public=1` | **ANI JEDNEJ naszej trasy** — brak `/szkolenia/` i obu stron sprzedażowych. Potwierdzone: to reguły przepisywania, nie typy wpisów |
| 3 | Co sitemapa za to zawiera | `/courses/<slug>/` i `/product/<slug>/` (sami je **301-ujemy**), **73 adresy lekcji**, `/koszyk/`, `/kasa/`, `/my-account/`, `/dashboard/`, obie rejestracje Tutora, `/shop/`, `/sample-page/`, `/hello-world/`, `/author/admin/` |
| 4 | `/author/admin/`, `?author=1` | **404** — obwód z 0.59.0 trzyma. Ale sitemapa **drukuje sam login**: `user_nicename` = `user_login` = `admin` (zmierzone `wp user list`) |
| 5 | Lekcja płatna (`preview=0`) dla gościa | Bramka trzyma: 0 prozy, `noindex, nofollow`, i to **NASZ** znacznik — utrzymuje się przy `blog_public=1` |
| 6 | `/koszyk/`, `/my-account/` przy `blog_public=1` | **ŻADNEGO `robots`** → w produkcji indeksowalne. Woo wskazuje na NASZE strony poprawnie (id 6/7/8), więc to nie konfiguracja |
| 7 | Semantyka `courses.updated_at` | Trigger `m1_updated_at` ustawia `now()` przy KAŻDYM `UPDATE`, bez porównania wartości, i siedzi **tylko na `courses`** — poprawka prozy lekcji (tabela `lessons`) go **nie rusza** |

Po każdym pomiarze `blog_public` wrócił do `0` (sprawdzone odczytem).

### Rozstrzygnięcia właściciela (2026-08-31)

1. **Zakres SEO naszych wtyczek — wariant (b):** wtyczka pilnuje **tylko swoich
   tras**; reszta witryny idzie na listę wdrożeniową dla właściciela motywu.
2. **Login `admin` w sitemapie użytkowników — ZAMYKAMY.**
3. **Manifest — rekomendacja:** żyje w prototypie (`app/manifest.ts`); dla
   witryny WP zostaje wskazaniem dla motywu (motyw jest tylko do odczytu
   i to on trzyma `<head>`, `icon.svg` oraz `apple-icon.png`).
4. **`lastModified` — rekomendacja:** NIE publikujemy. Pomiar 7 dowodzi, że
   `updated_at` nie znaczy „zmiana treści".
5. **PSI — wariant (a):** odświeżyć podgląd statyczny, zmierzyć aktualny kod
   i **wprost napisać w README**, że tabela dotyczy prototypu.

### Reguła podziału, która z tego wynika (zapisana też w kodzie)

> Nasze wtyczki sprzątają w sitemapie i oznaczają `noindex` **dokładnie te
> adresy, które istnieją Z NASZEGO POWODU** — kopia kursów w Tutorze, produkty
> Woo naszych kursów, strony transakcyjne powołane przez naszą ścieżkę zakupu.
> Wszystko inne (blog, `/shop/`, `sample-page`, kategorie, tagi) należy do
> właściciela witryny i idzie na listę wdrożeniową.

Wyjątek świadomy: **sitemapa użytkowników** — to nie SEO, tylko enumeracja
kont, więc zamyka ją **mu-plugin obwodu** (`aai-obwod.php`), gdzie od 0.59.0
mieszkają dwie pozostałe drogi tego samego wycieku.
