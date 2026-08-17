# Dziennik zmian

Format wg [Keep a Changelog](https://keepachangelog.com/pl/1.1.0/),
wersjonowanie [SemVer](https://semver.org/lang/pl/). Najnowszy wpis na górze.
Pierwszy nagłówek wersji w tym pliku jest **źródłem prawdy o wersji projektu**
— pilnuje tego `tools/straznicy/straznik-wersji.mjs`.

## [0.14.0] — 2026-08-17

Dział 6 (kreator kursów), krok 1 z 3: brama dostępu, lista kursów
i dane podstawowe. Treść sekcji sprzedażowych i program (moduły +
lekcje) dochodzą w kroku 2.

### Dodane
- **Kreator `/szkolenia/kreator`** — panel treści właściciela w języku
  wizualnym strony (własny pływający pasek `PasekKreatora`, Reveal/
  Cascade, `unos` na kartach): lista WSZYSTKICH kursów z licznikami
  treści liczonymi w bazie (sekcje / moduły / lekcje — zero na
  pomarańczowo, więc od razu widać, czego brakuje), publikacja,
  ukrycie, usuwanie z potwierdzeniem i podgląd strony kursu.
- **Edytor danych podstawowych `/szkolenia/kreator/[id]`** — slug
  (podpowiadany z tytułu, ale tylko dla NOWEGO kursu, żeby edycja nie
  zmieniła adresu opublikowanej strony), tytuł, typ, opis na kartę,
  cena wpisywana w złotówkach (baza trzyma grosze), okładka,
  **badge** i **poziom**. Błędy walidacji z dyspozytora wracają
  przypięte do konkretnych pól.
- **Brama na token** (`lib/kreator-dostep.ts` + akcje serwerowe
  `app/szkolenia/kreator/akcje.ts`): token trafia do ciastka
  **HttpOnly**, więc nie istnieje w JavaScripcie strony; porównanie
  w stałym czasie (`timingSafeEqual`) + kara czasowa za zły token.
  Flaga `Secure` zależy od protokołu żądania, nie od `NODE_ENV` —
  produkcyjny build oglądany na localhoście po http też się loguje.
- **Wejście do kreatora ze stron sklepu** (decyzja właściciela):
  dyskretna pigułka w rogu `/szkolenia` i strony kursu, renderowana
  WYŁĄCZNIE przy ważnym ciastku bramy — gość nie ma jej nawet
  w źródle strony. Na stronie kursu prowadzi wprost do edycji tego
  kursu. To wygoda, nie zabezpieczenie: dostępu pilnuje token.
- **Kanał JSON kreatora**: `szczegolyKursuPoId()` (edycja po id — slug
  bywa właśnie zmieniany) i `listaKursowKreatora()` rozszerzona
  o badge, poziom, datę zmiany i liczniki treści (kontrakt
  `KartaKreatora`).
- **Smoke `tools/smoke/smoke-d6.ts`** (CI, job „baza"): na produkcyjnym
  `next start` dowodzi, że bez ciastka kreator NIE pokazuje szkiców
  i AJAX odpowiada 403, a z ciastkiem przechodzi pełny cykl
  szkic → publikacja → katalog → usunięcie.
- **Testy `modules/m1-sklep/kreator.test.ts`** (6): szkic widoczny dla
  kreatora, liczniki z bazy, edycja po id, zmiana sluga bez gubienia
  kursu, ślad każdej operacji w `course_changelog`.
- Dokumentacja techniczna działu:
  [docs/dokumentacja-techniczna/d6](docs/dokumentacja-techniczna/d6/ZRODLA.md)
  — Server Actions, formularze i `cookies()` skopiowane z pakietu
  `next@16.3.1` (dokładnie ta wersja, na której chodzi aplikacja).

### Naprawione
- **BLAD-004 — pigułka kreatora chowała się pod stopką** (zgłosił
  właściciel). Klasa `.page-enter` opakowująca całą treść strony miała
  animację `opacity` z wypełnieniem `both`; wypełniana animacja stosuje
  swoją wartość także PO zakończeniu, więc kontekst układania zostawał
  na stałe i zamykał w sobie każdy element `position: fixed` z treści —
  stopka (późniejsze rodzeństwo) malowała się na wierzchu, a `z-index`
  nie miał jak pomóc. Wypełnienie zmienione na `backwards`: ten sam
  fade 0,3 s, kontekst znika po animacji. `straznik-fixed` rozszerzony
  o wypełnienia `forwards`/`both` (zweryfikowany testem negatywnym),
  wpis w [rejestrze błędów](rejestr/znane-bledy.json), migawka:
  gałąź `bak/2026-08-17-pigulka-admina-pod-stopka`. Dowód: pomiar
  w przeglądarce (`elementFromPoint` w środku pigułki po zescrollowaniu
  na dół oddaje link kreatora; przed naprawą oddawał DIV stopki).

### Zmienione
- **Dyspozytor sprawdza token PRZED walidacją kształtu** — żądanie bez
  tokenu dostaje `brak-dostepu` (403) zamiast mapy pól kontraktu
  w odpowiedzi `walidacja` (400). Obcy nie dostaje podpowiedzi, jak
  zbudować poprawne żądanie.
- **Jedyny AJAX bierze token z ciastka**, gdy nie ma go w treści
  żądania — endpoint pozostaje jeden (WYTYCZNE §8), a autoryzacja dalej
  należy wyłącznie do dyspozytora.
- `NavbarPrzelacznik` wyłącza globalny navbar na CAŁYM poddrzewie
  kreatora — inaczej lista kursów (pasuje do wzorca `[slug]`) byłaby
  bez navbara, a edycja kursu miałaby dwa paski naraz.

## [0.13.0] — 2026-08-17

### Zmienione
- **Licencja projektu: GPL-2.0 → MIT** (decyzja właściciela). Powód:
  zgodność z repozytorium strony głównej `matthewplugins.pl`, które jest
  na MIT — kod tej podstrony docelowo tam trafia, a przy copyleftcie
  wymagałoby to relicencjonowania. Nic nie wymuszało GPL: projekt nie
  jest pluginem WordPressa (czysty Next.js), a wszystkie zależności
  produkcyjne są permisywne (next/react/pg/zod — MIT, lucide-react —
  ISC). Zmiana objęła `LICENSE`, `package.json`, `package-lock.json`,
  README i wytyczną [WYTYCZNE §3](docs/WYTYCZNE.md) (z zapisanym
  uzasadnieniem decyzji).

### Dodane
- **Licencja fontów obok plików fontów**:
  [assets/fonts/LICENSE-Geist-OFL.txt](assets/fonts/LICENSE-Geist-OFL.txt)
  — Geist jest na SIL OFL 1.1 i licencja projektu (wcześniej GPL, teraz
  MIT) NIGDY go nie obejmowała; przy redystrybucji plików `.woff2` tekst
  OFL musi jechać razem z nimi. Tekst pobrany z oficjalnego repozytorium
  `vercel/geist-font`.
- `straznik-licencji` przepisany: pilnuje MIT w LICENSE, README
  i `package.json` (metadane pakietu potrafiły zostać po staremu),
  wyłapuje pozostałości „GPL-2.0" w README oraz brak tekstu OFL przy
  plikach fontów. Zweryfikowany testami negatywnymi.

## [0.12.1] — 2026-08-17

**Bramka B5 zaliczona przez właściciela (2026-08-17)** — Dział 5
(katalog + strona sprzedażowa kursu) domknięty; następny krok:
Dział 6 (kreator kursów).

### Naprawione
- **Pasek menu kursu znikał po zescrollowaniu w dół** (zgłosił właściciel
  przy B5; rejestr: **BLAD-003**). Przyczyna nie była w samym pasku:
  `@keyframes page-enter` animowały `transform`, a klasa `.page-enter`
  z [app/template.tsx](app/template.tsx) opakowuje CAŁĄ treść podstrony —
  element z animowanym transformem staje się układem odniesienia dla
  `position: fixed` potomków, więc pasek i tło strony kursu były
  przypięte do treści zamiast do okna. Navbar z layoutu działał
  poprawnie (stoi poza `template`), co maskowało źródło.
  Naprawa: przejście między podstronami animuje wyłącznie `opacity`.
  Pomiar w headless Firefoxie: przed naprawą pasek po scrollu miał
  `top: -9353px`, po naprawie `top: 0` przy `scrollY: 9353`.
- Przy okazji wraca do poprawnej pracy poświata tła strony kursu
  (`TloKursu`) — również `position: fixed`.

### Dodane
- `tools/straznicy/straznik-fixed.mjs` — blokuje powrót
  `transform`/`filter`/`perspective` do klatek i reguł klasy
  opakowującej treść (strażników jest teraz 10); zweryfikowany testem
  negatywnym (po przywróceniu starego CSS zgłasza błąd i zwraca 1).
- Wpis **BLAD-003** w [rejestr/znane-bledy.json](rejestr/znane-bledy.json);
  migawka sprzed naprawy: gałąź `bak/2026-08-17-pasek-fixed-transform`
  (procedura WYTYCZNE §1).

## [0.12.0] — 2026-08-17

Trzy poprawki wg feedbacku właściciela do B5 (nagłówek pozycjonowania,
sekcja Prowadzący, sekcja Dołącz).

### Zmienione
- **Nagłówek sekcji „Pozycjonowanie" bez wyszarzenia**: pierwsza linia
  szła w `text-steel` i czytała się jak przezroczysty efekt — teraz obie
  linie pełnym kolorem (druga akcentem volt).
- **Sekcja „Prowadzący" rozbudowana** ([SekcjaAutor](components/kurs/SekcjaAutor.tsx)):
  dwukolumnowy układ — wizytówka z bio i **cytatem „dlaczego zrobiłem
  ten kurs"**, obok **czym zajmuje się na co dzień** (chipy) i atuty
  jako osobne karty z kaskadą; link do portfolio. Kontrakt `TrescAutor`
  + opcjonalne `cytat`, `czym_sie_zajmuje`, `link {url, etykieta}`.
- **Sekcja „Dołącz" mocno wyeksponowana** ([SekcjaCena](components/kurs/SekcjaCena.tsx)):
  wychodzi z rytmu strony — własne tło (grid + dwa dryfujące gradienty),
  ramka volt, nagłówek „Co dokładnie dostajesz za X zł?" z realnymi
  liczbami z bazy; lewa kolumna to **pełne punkty pakietu z opisami**,
  prawa to sticky karta oferty: badge „Pełny dostęp", cena 5–6xl, lista
  **„w cenie"**, zdanie domykające, CTA pełnej szerokości i link
  powrotny do programu; pod spodem kotwica cenowa i gwarancja obok
  siebie. Kontrakt `TrescPakiet` + opcjonalne `w_cenie`, `domkniecie`.
- **Treść obu kursów rozbudowana** (robocza, bez zmyślonych warunków):
  pakiety z konkretnymi opisami (6 pozycji na kurs), mocniejsze kotwice
  cenowe, po 6 punktów „w cenie" (dostęp od razu, materiały od
  pierwszego dnia, aktualizacje bez dopłat, dostęp bez limitu, kontakt,
  gwarancja) oraz rozbudowane wizytówki prowadzącego.

## [0.11.0] — 2026-08-17

Poprawki Course Detail System wg feedbacku właściciela do B5
(5 punktów: czcionka/typografia, FAQ, pasek menu kursu, dłuższy
program, animacje premium).

### Dodane
- **Pasek menu KURSU** ([PasekKursu](components/kurs/PasekKursu.tsx)
  przeprojektowany): na stronie kursu globalny navbar ZNIKA
  ([NavbarPrzelacznik](components/NavbarPrzelacznik.tsx)), zamiast
  niego pływająca pigułka widoczna OD WEJŚCIA — znacznik „MP"
  (powrót do katalogu), zakładki sekcji z podświetleniem aktywnej
  (IntersectionObserver) i CTA „Dołącz"; bez JS pasek stoi (to jedyna
  nawigacja strony kursu), animowany wjazd.
- **Żywe tło strony kursu** ([TloKursu](components/kurs/TloKursu.tsx)):
  poświata podążająca za kursorem (jedna pętla rAF, transform-only)
  + dwa dryfujące bloby (keyframes CSS) pod całą treścią.
- **Animacje premium** (globals.css): hover-lift kart `.unos`
  (uniesienie + glow), płynne otwieranie akordeonów
  (`interpolate-size` — progressive enhancement), micro-interaction
  CTA (uniesienie przy hover, dociśnięcie przy kliknięciu), dryf
  gradientów `.dryf-a/.dryf-b`, wjazd paska `.pasek-wjazd`; wejścia
  Reveal/Cascade (fade + slide-up ze staggerem) we WSZYSTKICH
  sekcjach strony kursu; całość wyłączana przez
  `prefers-reduced-motion`.
- **Polska odmiana liczebników** ([lib/odmiana.ts](lib/odmiana.ts)):
  „2 moduły · 4 lekcje · 48 min materiału" zamiast „2 modułów ·
  4 lekcji · 0.8 h materiału" — katalog (karty + HUD), hero kursu
  i sekcja programu.

### Zmienione
- **FAQ rozbudowane do 10 pytań-obiekcji na kurs** (wzorzec stron
  kursowych: dostęp od kiedy/na jak długo, ile czasu zajmie, „czy
  dam radę", różnica vs darmowe materiały, bezpieczeństwo danych,
  aktualizacje, gwarancja) — treść ROBOCZA, spójna z resztą oferty.
- **Program znacznie dłuższy** (treść ROBOCZA pod szczegółowe
  omówienie tematów): kurs Claude 7 modułów / 31 lekcji (~6,5 h),
  kurs GitHub 6 modułów / 26 lekcji (~5 h); pakiety i korzyści
  zaktualizowane do nowych liczb.
- Golden `d5-program.html` odtworzony (Cascade + odmiana w programie);
  `d4-katalog.html` bez zmian.

## [0.10.0] — 2026-08-17

Course Detail System wg wiążącego briefu właściciela
([docs/plugin-1/BRIEF-STRONA-KURSU.md](docs/plugin-1/BRIEF-STRONA-KURSU.md),
B5 iteracja 3): strona kursu = premium product page + sales page + mini
sklep, złożona z reusable komponentów.

### Dodane
- **Reusable Course Detail System — [components/kurs/*](components/kurs/)**
  (16 komponentów): `Wspolne` (Etykieta, CtaZakupu, szkielet sekcji),
  `HeroKursu` (badge z realnymi liczbami z bazy, obietnica, „dla kogo",
  cena, 2 CTA, OknoKursu), `PasekKursu` (sticky nawigacja po scrollu:
  kotwice + aktywna sekcja z IntersectionObservera + CTA; progressive
  enhancement — bez JS strona kompletna), `SekcjaProblem` (wstęp-empatia
  + PROBLEM → ROZWIĄZANIE → REZULTAT), `SekcjaKorzysci`, `SekcjaPakiet`
  (+ kotwica cenowa), `SekcjaProgram` (akordeon z czasem modułów),
  `SekcjaPlatforma` („tak wygląda produkt po zakupie" — OknoKursu
  z prawdziwych danych), `SekcjaPozycjonowanie` (to NIE jest / to JEST),
  `SekcjaDlaKogo`, `SekcjaTransformacja` (przed / po), `SekcjaOpinie`,
  `SekcjaAutor`, `SekcjaCena` („ZA X ZŁ OTRZYMUJESZ ✓…" + gwarancja
  przy cenie + link powrotny do programu), `SekcjaPorownanie`
  (samodzielna nauka vs kurs, nieagresywnie), `SekcjaFaq` (+ kontakt
  pod FAQ), `FinalCta`. Kolejność sekcji = psychologia scrolla briefu;
  sekcje bez treści w bazie znikają, numeracja liczy się dynamicznie.
- Kontrakty: `SzczegolyKursu` + `badge`/`level` (hero pokazuje poziom),
  `TrescHero` + opcjonalne `dla_kogo`.
- Utility `scrollbar-none` (pas kotwic sticky nav na mobile).
- Smoke D5 sprawdza dodatkowo: sekcję `problem` (kind z migracji 005
  przechodzi całą drogę baza → strona), sticky nawigację i sekcję #cena.

### Zmienione
- **[app/szkolenia/[slug]/page.tsx](app/szkolenia/[slug]/page.tsx)** —
  przebudowana na CIENKĄ kompozycję komponentów `components/kurs/*`
  (cały markup sekcji wyniesiony do komponentów).
- **Katalog: karty RÓWNE** (decyzja właściciela — bez karty wyróżnionej):
  jedna `Karta` w siatce `md:grid-cols-2`, pełny opis bez ucinania,
  CTA „Sprawdź ofertę" na każdej karcie.
- Seedy: dłuższe opisy kart „dlaczego my, a nie inni"; oba kursy mają
  komplet sekcji CDS (problem/positioning/transformation/comparison,
  kurs GitHub dodatkowo for_whom/package/author/opinions/guarantee/faq)
  — treść ROBOCZA, bez zmyślonych danych (opinie = jawny placeholder).
- Goldeny odtworzone po zmianie markupu: `d3-odczyt.json` (badge/level
  w szczegółach), `d4-katalog.html` (karta równa), `d5-program.html`
  (program w szkielecie sekcji CDS).

## [0.9.0] — 2026-08-17

Redesign premium podstrony szkoleń wg briefu właściciela (B5, iteracja 2):
„digital product experience", nie podstrona informacyjna.

### Zmienione
- **Katalog [/szkolenia](app/szkolenia/page.tsx) przeprojektowany od zera**:
  - hero z dwukolumnowym układem: mocny headline („Szkolenia, które
    zamieniają AI w przewagę."), dwa CTA (Poznaj szkolenia / Zobacz,
    co dostajesz) i HUD z PRAWDZIWYMI liczbami z bazy (produkty,
    moduły, lekcje, godziny);
  - **wizual produktu zamiast pustki**: mockup okna kursu zbudowany
    z realnych danych ([OknoKursu](components/szkolenia/OknoKursu.tsx)
    — sidebar modułów, lekcje, paski postępu) + floating cards
    (prompt z biblioteki, gwarancja 30 dni);
  - **interaktywność** ([HeroMotion](components/szkolenia/HeroMotion.tsx)):
    światło spotlight za kursorem, parallax 3 warstw, floaty — jedna
    pętla rAF, transform-only, `prefers-reduced-motion` wyłącza całość,
    bez JS treść kompletna;
  - pas tematów marquee (wzorzec strony głównej);
  - sekcja **„Nie kupujesz kolejnego kursu. Dostajesz gotowy system
    pracy."** — sticky statement + mockup i 6 warstw systemu
    (01 Wiedza → 06 Materiały) wjeżdżających kaskadą;
  - **katalog premium**: karta wyróżniona (najnowszy produkt na całą
    szerokość) + siatka; karty z okładką (hover-zoom), numerem /01,
    badge z bazy, typem, metadanymi z bazy (moduły · lekcje · godziny ·
    poziom), ceną i CTA.
- **Strona kursu**: nowe sekcje **„Pakiet"** (co dokładnie dostajesz +
  kotwica cenowa) i **„Prowadzący"**; „Dla kogo" dostała uczciwą kolumnę
  „a NIE jest, jeśli…"; numeracja sekcji liczona dynamicznie.

### Dodane
- Migracje: `003-rodzaje-sekcji` (kinds `package`, `author`),
  `004-karta-katalogu` (kolumny `badge`, `level`); dyspozytor i kreator
  zapisują nowe pola; kanał JSON `listaKursow` zwraca statystyki liczone
  w bazie (moduły/lekcje/czas).
- Okładki SVG w języku Volt ([public/okladki/](public/okladki/)) —
  robocze, do podmiany kreatorem w D6.
- Kontrakty Zod: `KartaKatalogu`, `TrescPakiet`, `TrescAutor`,
  `nie_dla` w `TrescDlaKogo`.
- Goldeny odtworzone świadomie: schemat d2 (nowe kolumny), karta
  katalogu d4 (nowa karta), program d5 (dynamiczna numeracja).

## [0.8.1] — 2026-08-17

Naprawy z pierwszej oceny B5 (procedura WYTYCZNE §1: migawka
`bak/2026-08-17-hydratacja-fontow` → branch fix → rejestr → strażnik).

### Naprawione
- **BLAD-001 — błąd hydratacji na każdej stronie**: pakiet `geist`
  generował różne klasy CSS fontów na serwerze i kliencie. Fonty idą
  teraz z lokalnych subsetów woff2 przez `next/font/local`
  ([lib/fonts.ts](lib/fonts.ts) + [assets/fonts/](assets/fonts/)) —
  wzorzec 1:1 ze strony głównej; pakiet `geist` usunięty. Nawrotów
  pilnuje nowy **straznik-fontow** (zakaz importu `geist` i zależności
  w package.json).
- **BLAD-002 — testy kasowały dane dev**: `npm test` robił
  `DROP SCHEMA` na wspólnej bazie `db1_kursy` — po testach katalog
  świecił pustką, a strony kursów dawały 404. Testy przełączają się
  teraz na osobną bazę `db1_kursy_test`
  ([modules/m1-sklep/db/testowa-baza.ts](modules/m1-sklep/db/testowa-baza.ts))
  z bezpiecznikiem: operacje niszczące wyłącznie na bazie `*_test`.
- Oba błędy w [rejestr/znane-bledy.json](rejestr/znane-bledy.json)
  (klasa/dowód/skutek/naprawa/strażnik).

## [0.8.0] — 2026-08-17

Dział 5 Pluginu 1 — strona sprzedażowa `/szkolenia/[slug]`
(bramka B5: golden HTML + smoke; czeka na ocenę właściciela; po
akceptacji 🏷 release).

### Dodane
- **Strona sprzedażowa** ([app/szkolenia/[slug]/page.tsx](app/szkolenia/[slug]/page.tsx))
  w pełni z bazy (kanał JSON `szczegolyKursu`): hero z obietnicą
  (sekcja `hero`) + cena i CTA od pierwszego ekranu → korzyści →
  **program z akordeonem modułów i lekcji** (czas trwania, badge
  „podgląd"; `<details>` — zero JS) → dla kogo → opinie → cena+CTA →
  gwarancja → FAQ → domykające CTA. Sekcje o złym/nieobecnym `content`
  są pomijane (safeParse), nie wysadzają strony; nieistniejący slug → 404.
  CTA zakupu = placeholder do Pluginu 2 (prowadzi do kontaktu);
  napis w 1. osobie („Dołączam…") wg analizy wzoru.
- **Kontrakty treści sekcji** (Zod, [modules/m1-sklep/typy.ts](modules/m1-sklep/typy.ts)):
  TrescHero/Korzysci/DlaKogo/Opinie/Gwarancja/Faq — kreator (D6)
  dostanie gotowe schematy.
- **Analiza wzoru sprzedażowego**
  [docs/plugin-1/WZOR-STRONA-SPRZEDAZOWA.md](docs/plugin-1/WZOR-STRONA-SPRZEDAZOWA.md)
  (claudedlafirm.pl — inspiracja, nie kopia): checklista wzorców
  perswazji dla treści kursów w D7.
- **Smoke test D5** ([tools/smoke/smoke-d5.ts](tools/smoke/smoke-d5.ts)):
  pełny kurs seedem → produkcyjny serwer → hero/korzyści/program/cena/
  FAQ obecne, 404 dla śmieci, **golden sekcji programu**
  [goldeny/d5-program.html](goldeny/d5-program.html); podpięty w CI.
- **Seed przykładów** ([tools/seed/seed-przyklady.ts](tools/seed/seed-przyklady.ts),
  `npm run db1:seed`): dwa docelowe kursy właściciela (decyzja
  2026-08-17) z treścią ROBOCZĄ do oceny wyglądu — „Jak poprawnie
  korzystać z Claude" (pełne sekcje) i „Jak poprawnie używać GitHuba";
  opinie to jawne placeholdery (bez zmyślonych recenzji). Finalna
  treść powstanie kreatorem w D7 (+ dokumentacja Claude i GitHuba).

### Zmienione
- `zamknijDb1` w publicznym API modułu (skrypty smoke/seed nie sięgają
  już do wnętrza modułu — wymusił straznik-granic).
- Golden katalogu (smoke D4) zawężony do karty kursu smoke — cała
  siatka pękała, gdy lokalna baza miała seedy przykładów.

## [0.7.0] — 2026-08-17

Dział 4 Pluginu 1 — katalog `/szkolenia` renderowany Z BAZY
(bramka B4: golden HTML + smoke test na produkcyjnym serwerze;
czeka na ocenę właściciela na localhost:3001).

### Zmienione
- [/szkolenia](app/szkolenia/page.tsx): siatka kart czyta kursy z bazy
  kanałem JSON działu (`listaKursow()`, tylko opublikowane) — koniec
  placeholderów; karta: okładka (lub siatka „blueprint"), badge typu,
  cena z `Intl` (PLN), opis, CTA „Sprawdź ofertę" → `/szkolenia/[slug]`;
  pusty stan „Katalog w przygotowaniu"; strona dynamiczna
  (`force-dynamic` — bez zapiekania listy w buildzie).

### Dodane
- [app/not-found.tsx](app/not-found.tsx) — 404 w języku Volt
  (nieistniejące kursy wracają do katalogu).
- **Smoke test D4** ([tools/smoke/smoke-d4.ts](tools/smoke/smoke-d4.ts)):
  seed przez dyspozytor → produkcyjny `next start` → katalog zawiera
  kurs, cenę i link → **golden markupu siatki**
  [goldeny/d4-katalog.html](goldeny/d4-katalog.html) → sprzątanie.
  Podpięty w CI (job „baza": build + smoke).
- Dokumentacja techniczna D4 (WYTYCZNE N2) w
  [docs/dokumentacja-techniczna/d4/](docs/dokumentacja-techniczna/d4/):
  pobieranie danych, cache/rewalidacja, tryby renderowania, not-found,
  next/image + ZRODLA.md.

## [0.6.0] — 2026-08-17

Dział 3 Pluginu 1 — dyspozytor (bramka B3: testy zielone, goldeny JSON,
straznik-ajax potwierdza jeden kanał, audyt CRUD w changelogu).

### Dodane
- **Kanał JSON** (odczyt serwerowy — [modules/m1-sklep/odczyt.ts](modules/m1-sklep/odczyt.ts)):
  `listaKursow` (katalog, tylko opublikowane), `szczegolyKursu`
  (pełny kurs z sekcjami/modułami/lekcjami), `listaKursowKreatora`;
  wyjście walidowane Zod-em.
- **Dyspozytor — JEDEN AJAX** ([modules/m1-sklep/dyspozytor.ts](modules/m1-sklep/dyspozytor.ts)):
  akcje `zapisz` (insert/edycja + pełna podmiana sekcji i modułów),
  `usun`, `publikuj` — każda w osobnej transakcji z aktorem audytu
  (`app.actor`); usuwanie jawnie od dołu, żeby każdy wpis changelogu
  znał kurs; walidacja Zod na wejściu (czytelne błędy: `walidacja`,
  `brak-dostepu`, `nie-znaleziono`, `duplikat`); dostęp tymczasowo
  tokenem `KREATOR_TOKEN` (pełny auth da Plugin 3).
- **Endpoint HTTP** [app/api/szkolenia/route.ts](app/api/szkolenia/route.ts) —
  jedyny AJAX pluginu (POST), cienka warstwa nad dyspozytorem, bez SQL.
- **Kontrakty Zod** ([modules/m1-sklep/typy.ts](modules/m1-sklep/typy.ts)):
  karty/szczegóły kursu, akcje jako `discriminatedUnion`, typy TS
  wyprowadzane ze schematów.
- **straznik-ajax** — w app/api może istnieć tylko jeden endpoint na
  moduł i żaden endpoint-sierota (WYTYCZNE §8).
- **Testy B3** ([modules/m1-sklep/dyspozytor.test.ts](modules/m1-sklep/dyspozytor.test.ts),
  razem 15/15): walidacja, token, zapis z audytem wszystkich tabel,
  duplikat sluga, publikacja, edycja z podmianą modułów, usuwanie +
  **golden odpowiedzi JSON** [goldeny/d3-odczyt.json](goldeny/d3-odczyt.json);
  testy biegną sekwencyjnie (`--test-concurrency=1`, wspólna baza).
- Dokumentacja techniczna D3 (WYTYCZNE N2) w
  [docs/dokumentacja-techniczna/d3/](docs/dokumentacja-techniczna/d3/):
  Next.js Route Handlers (reference + guide), Zod 4 (podstawy, API,
  błędy) + ZRODLA.md.
- `.env.example`: `KREATOR_TOKEN` (sekret lokalnie w `.env`).

## [0.5.0] — 2026-08-17

Dział 2 Pluginu 1 — baza `db1_kursy` (bramka B2: testy dowodzą, że
migracje wstają od zera i triggery logują każdą operację; golden schematu).

### Dodane
- **Baza db1_kursy w kontenerze** ([docker-compose.yml](docker-compose.yml),
  postgres:17-alpine; lokalnym silnikiem jest podman — `npm run db1:up`);
  [.env.example](.env.example) z `DB1_URL` (sekrety tylko w ignorowanym `.env`).
- **Migracje czystym SQL** ([modules/m1-sklep/db/migrations/](modules/m1-sklep/db/migrations/)):
  `001-tabele.sql` — courses, course_sections, course_modules,
  course_lessons, course_changelog (wg ERD z DIAGRAMU) + indeksy;
  `002-triggery-audytu.sql` — wspólna funkcja `m1_audyt()` na WSZYSTKICH
  czterech tabelach treści (create/update/delete → stan przed/po w JSONB,
  aktor z `app.actor`), auto-`updated_at`, changelog niezmienny
  (UPDATE/DELETE/TRUNCATE odrzucane triggerem).
- **Runner migracji** ([modules/m1-sklep/db/migruj.ts](modules/m1-sklep/db/migruj.ts)):
  transakcje per migracja, sha256 w tabeli `_migracje` — zmieniona po
  fakcie migracja zatrzymuje przebieg. Klient puli pg tylko w module
  ([modules/m1-sklep/db/klient.ts](modules/m1-sklep/db/klient.ts)).
- **Testy B2** ([modules/m1-sklep/db/migracje.test.ts](modules/m1-sklep/db/migracje.test.ts),
  `npm test`, node --test): od zera, idempotencja, audyt wszystkich tabel
  (lekcje dostają course_id z lookupu), niezmienność changelogu oraz
  **golden schematu** [goldeny/d2-schemat.json](goldeny/d2-schemat.json)
  (odtworzenie po świadomej zmianie: `GOLDEN_ZAPISZ=1 npm test`).
- **straznik-migracji** — numeracja NNN bez dziur, MANIFEST.json z sha256:
  migracja zmieniona po fakcie nie przejdzie pre-commita ani CI.
- CI: job „Baza db1_kursy" z usługą postgres — `npm test` na każdym PR.
- Dokumentacja techniczna D2 (WYTYCZNE N2) w
  [docs/dokumentacja-techniczna/d2/](docs/dokumentacja-techniczna/d2/):
  CREATE TRIGGER, plpgsql (NEW/OLD/TG_OP), JSONB, CREATE FUNCTION,
  node-postgres (Pool, zapytania parametryzowane), obraz Dockera postgres
  + ZRODLA.md (PostgreSQL 18, pg 8.23).

## [0.4.0] — 2026-08-17

Dział 1 Pluginu 1 — fundament aplikacji (do bramki B1: ocena właściciela
na localhost:3001).

### Dodane
- Szkielet aplikacji **Next.js 16.3.1 + React 19 + TypeScript (strict) +
  Tailwind 4** z serwerem, dev/start na porcie **3001**; wersje i konfiguracja
  zgodne ze stroną główną (tsconfig, ESLint flat config, postcss).
- Design system „Volt" przejęty ze strony głównej ([app/globals.css](app/globals.css)):
  tokeny `@theme` (void/panel/fg/steel/volt/line, fonty Geist, skala typo),
  utilities `container-site`/`bg-grid`/`panel`/maski, efekty CTA.
- Strona [/szkolenia](app/szkolenia/page.tsx): hero wg wzorca PageHero,
  siatka kart-placeholderów (prawdziwe kursy z bazy od Działu 4), pasek CTA;
  korzeń `/` przekierowuje na `/szkolenia`. Nagłówek wg strony głównej;
  **stopka przejęta 1:1** (uwaga właściciela przy B1): HUD statusu,
  statement, SVG wordmark na szynie zasilającej z impulsem, scena canvas
  „pył danych" (FooterScene), animacje wejść Reveal z wyłącznikiem
  bezpieczeństwa `html.js` i przejścia stron (template.tsx).
- Stub publicznego API modułu ([modules/m1-sklep/index.ts](modules/m1-sklep/index.ts))
  — jedyna przyszła warstwa z dostępem do bazy.
- **straznik-granic** — klient SQL i connection stringi tylko w `modules/`,
  zakaz importów między modułami i importów z bebechów modułu spoza niego
  (BAZA → DZIAŁ → STRONA, WYTYCZNE §8).
- **straznik-ci** — gdy istnieje package.json, CI musi uruchamiać
  npm ci → lint → tsc → build (test dojdzie od Działu 2).
- CI: job „Kod aplikacji" (lint → tsc → build) w [ci.yml](.github/workflows/ci.yml).
- Dokumentacja techniczna D1 (WYTYCZNE N2) pobrana z sieci do
  [docs/dokumentacja-techniczna/d1/](docs/dokumentacja-techniczna/d1/):
  Next.js 16.3.1 (instalacja, layouty, struktura, CSS, fonty) + Tailwind 4.3
  (instalacja w Next.js, `@theme`) + ZRODLA.md (URL, data, wersja).

## [0.3.4] — 2026-08-17

### Dodane
- [CLAUDE.md](CLAUDE.md) — strażnik ciągłości kontekstu: auto-ładowany
  w każdej sesji, wskazuje dokumenty źródłowe, twarde zasady i NASTĘPNY
  KROK; aktualizowany przy każdym kroku zmieniającym stan projektu.
  Uzupełnia goldena przed-clear (pamięć Claude): przed każdym /clear
  sweep rozmowy — decyzje na nośnik trwały, zero strat.

## [0.3.3] — 2026-08-16

### Zmienione
- WYTYCZNE §8 doprecyzowane przez właściciela: AJAX nie musi być jedynym
  kanałem do bazy — obok idzie **kanał JSON** (odczyt serwerowy przy
  renderowaniu: szybciej + SEO). AJAX zostaje JEDEN i obsługuje akcje
  po załadowaniu strony (kreator). Diagram przepływu zaktualizowany.

## [0.3.2] — 2026-08-16

### Dodane
- **WYTYCZNE §8 „Wystrzał"** (nowa wytyczna właściciela): z jednej bazy
  danych idzie tylko JEDEN kanał AJAX — jeden plugin = jeden AJAX;
  dział-dyspozytor jako jedyny rozmawia z bazą i rozdziela JSON stronom.
  Pilnować będzie `straznik-ajax`.

### Zmienione
- Diagram przepływu Pluginu 1: trzy tory zastąpione JEDNYM wystrzałem
  BAZA —AJAX→ DZIAŁ-DYSPOZYTOR —JSON→ 3 strony; Dział 3 to teraz
  dyspozytor (akcje: lista/szczegoly/zapisz/usun/publikuj).

## [0.3.1] — 2026-08-16

### Zmienione
- Diagram przepływu danych Pluginu 1 przerysowany po uwadze właściciela:
  **każdy dział ma własny tor** BAZA —AJAX→ DZIAŁ —JSON→ STRONA i nie
  dotyka torów innych działów; nie istnieje wspólny kanał z bazy do
  wszystkich działów.

## [0.3.0] — 2026-08-16

Diagram Pluginu 1 do oceny właściciela.

### Dodane
- [docs/plugin-1/DIAGRAM.md](docs/plugin-1/DIAGRAM.md) — podział Pluginu 1
  na 7 działów z bramkami jakości B1–B7 po każdym dziale, diagram przepływu
  danych wg zasady **BAZA → DZIAŁ → STRONA** (konwencja
  z mp-offer-automation-suite), schemat ERD bazy `db1_kursy` z changelogiem
  pisanym triggerami, plan dokumentacji technicznej per dział (WYTYCZNE N2)
  i plan nowych strażników (granic, migracji, CI).
- Ustalenie: agenci AI tylko jako bramki jakości (przegląd agent+krytyk
  w B7), codzienna kontrola należy do skryptów — strażników, testów, goldenów.
- Localhost do oceny wyglądu: strona główna z klonu na porcie 3000,
  Plugin 1 będzie na 3001.

## [0.2.0] — 2026-08-16

Wytyczne właściciela + licencja. Nadal bez kodu aplikacji.

### Dodane
- [docs/WYTYCZNE.md](docs/WYTYCZNE.md) — wiążące wytyczne projektu:
  procedura naprawy wstecznej `.bak`, pilnowanie statusów GitHuba,
  goldeny (dla agentów i regresji napraw), weryfikacja co krok,
  pobierana dokumentacja techniczna; zasady nadrzędne: każdy agent
  ma krytyka, każdy dział dostaje oryginalną dokumentację z sieci.
- Licencja **GPL-2.0** ([LICENSE](LICENSE)) + deklaracja w README.
- [rejestr/znane-bledy.json](rejestr/znane-bledy.json) — rejestr realnych
  błędów projektu (schemat klasa/dowód/skutek/test z projektu egzaminacyjnego).
- `straznik-licencji` — LICENSE = GPL v2 i deklaracja w README, na stałe.
- `.gitignore`: pliki `*.bak` nie wchodzą do repo (migawką jest gałąź `bak/…`).

## [0.1.0] — 2026-08-16

Fundament repozytorium — jeszcze bez kodu aplikacji.

### Dodane
- Plan całego projektu ([docs/PLAN.md](docs/PLAN.md)): 3 moduły („pluginy"),
  3 bazy PostgreSQL, decyzje architektoniczne, workflow branchy.
- Workflow Weryfikacja-PR: branch → commit → CI → merge → release
  ([CONTRIBUTING.md](CONTRIBUTING.md)).
- CI (GitHub Actions): strażnicy + skan sekretów gitleaks (binarka przypięta
  po SHA-256).
- Strażnicy (`tools/straznicy/`) z automatycznym podpięciem — runner sam
  znajduje pliki `straznik-*.mjs`:
  - `straznik-wersji` — README deklaruje wersję zgodną z CHANGELOG,
  - `straznik-linkow` — względne linki w Markdown prowadzą do istniejących plików.
- Haki gita (`.githooks/`): pre-commit (blokada sekretów i `.env` + strażnicy),
  pre-push (blokada bezpośredniego pusha na `main`).
- Branch `plugin-1-sklep-kursow` pod przyszłe prace nad modułem 1.
