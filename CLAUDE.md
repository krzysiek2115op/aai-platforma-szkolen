# Kontekst projektu dla Claude (ładowany automatycznie w każdej sesji)

Ten plik to strażnik ciągłości: po /clear lub w nowej sesji NAJPIERW
przeczytaj wskazane tu dokumenty, potem pracuj. Aktualizuj ten plik
przy każdym kroku zmieniającym stan projektu (jak README).

## Dokumenty źródłowe (czytaj przed pracą)

1. [docs/WYTYCZNE.md](docs/WYTYCZNE.md) — WIĄŻĄCE wytyczne właściciela (§1–§8 + N1–N3)
2. [docs/plugin-1/DIAGRAM.md](docs/plugin-1/DIAGRAM.md) — działy D1–D7, bramki B1–B7, przepływ danych, ERD
3. [docs/PLAN.md](docs/PLAN.md) — całość: 3 moduły, 3 bazy
4. [CONTRIBUTING.md](CONTRIBUTING.md) — workflow Weryfikacja-PR, konwencje
5. [CHANGELOG.md](CHANGELOG.md) — źródło prawdy o wersji

## Twarde zasady (skrót — pełnia w WYTYCZNE.md)

- Każdy krok: **Weryfikacja-PR** (branch → commit → PR → CI zielone → merge);
  większe kroki: tag `vX.Y.Z` + release. Czerwony check = STOP.
- Przepływ danych: **BAZA → DZIAŁ → STRONA**; jedna baza = **JEDEN AJAX**
  (wystrzał, akcje kreatora) + kanał JSON (odczyt serwerowy) obok.
  Strona nigdy nie dotyka bazy.
- README i ten plik zawsze aktualne; wersja = top CHANGELOG (strażnik pilnuje).
- Repo strony głównej `MatthewPlugins/automatic-ai` (dawniej
  `matthewplugins.pl`; rebranding marki → **Automatic AI**) **TYLKO do
  odczytu** (lokalny klon: `/home/krzysiek/Strona internetowa FIrma `
  — ze spacją).
- Naprawy błędów: procedura `.bak` (WYTYCZNE §1) + wpis do
  [rejestr/znane-bledy.json](rejestr/znane-bledy.json) + strażnik przeciw nawrotom.
- Agenci AI tylko jako bramki jakości (z KRYTYKIEM — nigdy sami); codzienna
  kontrola = skrypty (strażnicy/testy/goldeny).
- Przed każdym /clear: sweep rozmowy wg goldena przed-clear (pamięć projektu)
  — decyzje → nośnik trwały, braki dopisać, następny krok zapisany.

## Stan i następny krok (aktualizować!)

- Wersja: patrz CHANGELOG. Diagram Pluginu 1 zatwierdzony po 3 poprawkach
  właściciela (tory → wystrzał → +kanał JSON).
- Localhost: strona główna `:3000` (klon, podgląd wyglądu); Plugin 1 → `:3001`
  (`npm run dev`, strona `/szkolenia`).
- **B1 zaliczona** (właściciel, 2026-08-17) po poprawkach: stopka 1:1
  (FooterScene/Reveal/wordmark), horyzont kratki hero. **Dział 2 ZBUDOWANY,
  B2 zaliczona testami**: baza `db1_kursy` w kontenerze (podman compose,
  postgres:17-alpine), migracje SQL + triggery audytu (`m1_audyt` na 4
  tabelach, changelog niezmienny), runner migruj.ts (sha256 w `_migracje`),
  testy `npm test` (7/7) + golden `goldeny/d2-schemat.json`,
  `straznik-migracji`, job CI „baza" z usługą postgres. Docker NIE jest
  zainstalowany — używamy **podmana** (`npm run db1:up`).
- Decyzja właściciela (2026-08-17): wejście do `/szkolenia` z paska menu
  strony głównej — dopiero przy **finalnym wdrożeniu**.
  **ZAKAZ (właściciel, 2026-08-18, po BLAD-007): w klonie strony głównej
  NIE ZOSTAWIAMY ŻADNYCH zmian — także niecommitowanych.** Poprzedni
  sposób podglądu (dopisany link `http://localhost:3001/szkolenia`
  w `data/navigation.ts`) wyciekł na publiczny podgląd GitHub Pages, bo
  `npm run deploy` buduje z KATALOGU ROBOCZEGO, nie z commitów — czysty
  `git status` w repo źródłowym niczego nie gwarantuje. Podgląd podstrony
  żyje wyłącznie tutaj: `:3001` i zrzut w naszym README. Zmiana schowana
  w klonie do `stash@{0}` (nie skasowana). Kontekst: repo strony głównej
  NIE MA sekretu `PAGES_DEPLOY_TOKEN`, więc workflow `deploy.yml` pomija
  publikację (przebiegi 7 s) i podgląd wgrywa się WYŁĄCZNIE ręcznym
  `npm run deploy` z czyjegoś katalogu roboczego — stąd cała klasa błędu.
- Pustka na `/szkolenia` jest zaplanowana: treść wejdzie z bazy w D4–D5,
  kursy właściciela w D7 — placeholderów nie dopracowujemy ręcznie.
- **Dział 3 ZBUDOWANY, B3 zaliczona testami** (15/15 + goldeny):
  kanał JSON (`odczyt.ts`: lista/szczegóły/kreator, wyjście przez Zod),
  dyspozytor (`dyspozytor.ts`: zapisz/usun/publikuj w transakcjach
  z aktorem, usuwanie jawnie od dołu — audyt zna kurs), jedyny AJAX
  `app/api/szkolenia/route.ts`, kontrakty Zod 4 (`typy.ts`,
  discriminatedUnion), `straznik-ajax`, golden `goldeny/d3-odczyt.json`,
  dostęp tokenem KREATOR_TOKEN (w .env). Testy sekwencyjnie
  (`--test-concurrency=1` — wspólna baza).
- **Dział 4 ZBUDOWANY** (PR feat/d4-katalog): `/szkolenia` renderuje
  kursy z bazy (`listaKursow()`, force-dynamic), pusty stan, 404 Volt,
  smoke test na produkcyjnym `next start` + golden
  `goldeny/d4-katalog.html` (CI: build+smoke w jobie baza).
  W lokalnej bazie 2 przykładowe kursy do oceny (seed dyspozytorem).
- **B4 zaliczona** (właściciel, 2026-08-17). Decyzja właściciela o TREŚCI
  (D7): dwa kursy = (1) „Jak poprawnie korzystać z Claude" — do treści
  potrzebna CAŁA dokumentacja Claude/Anthropic; (2) „Jak poprawnie
  używać GitHuba" — potrzebna CAŁA dokumentacja GitHuba. Strony
  sprzedażowe mają maksymalnie zachęcać do zakupu; WZÓR (inspiracja,
  nie kopia): https://claudedlafirm.pl — analiza wzoru w
  `docs/plugin-1/WZOR-STRONA-SPRZEDAZOWA.md`.
- **Dział 5 ZBUDOWANY** (PR feat/d5-strona-sprzedazowa): strona
  sprzedażowa `/szkolenia/[slug]` w pełni z bazy (hero+cena+CTA →
  korzyści → program-akordeon `<details>` → dla kogo → opinie →
  cena+CTA → gwarancja → FAQ → CTA; safeParse sekcji, 404 dla śmieci;
  CTA 1. osoby, zakup = placeholder→kontakt do Pluginu 2). Kontrakty
  treści sekcji w typy.ts (dla kreatora D6). Smoke D5 + golden
  programu w CI. Seed `npm run db1:seed`: 2 docelowe kursy (Claude,
  GitHub) z treścią ROBOCZĄ. Analiza wzoru:
  docs/plugin-1/WZOR-STRONA-SPRZEDAZOWA.md.
- **B5 ZALICZONA (właściciel, 2026-08-17)** — Dział 5 zamknięty na
  wersji **0.12.1** (redesign premium 0.9.0 → Course Detail System
  0.10.0 → 3 tury poprawek właściciela). Szczegóły każdej tury:
  CHANGELOG 0.9.0–0.12.1; brief wiążący:
  [docs/plugin-1/BRIEF-STRONA-KURSU.md](docs/plugin-1/BRIEF-STRONA-KURSU.md).
  Co jest na stronie: katalog = digital product experience (hero
  z mockupem OknoKursu z realnych danych, marquee, sekcja „system
  pracy", karty RÓWNE z badge/poziomem/statystykami z bazy); strona
  kursu = cienka kompozycja ~18 reusable komponentów
  `components/kurs/*` + własny pływający pasek menu kursu
  (NavbarPrzelacznik chowa globalny navbar na `/szkolenia/[slug]`)
  + TloKursu (poświata za kursorem, dryf blobów) + Reveal/Cascade,
  hover-lift `.unos`, płynne akordeony; wszystko pod
  prefers-reduced-motion. Sekcje bez treści w bazie znikają.
- **LEKCJE z D5 (nie powtarzać)**: (1) `node skrypt | tail` maskuje kod
  wyjścia — smoke'i weryfikować po exit code; (2) `transform` na
  przodku łamie `position: fixed` potomków (BLAD-003, `.page-enter`
  z template.tsx) — pilnuje `straznik-fixed`; (3) layout weryfikować
  POMIAREM, nie na oko: playwright-core + firefox instalowane
  w scratchpadzie sesji, NIGDY w package.json projektu; (4) polskie
  liczebniki przez `lib/odmiana.ts`, nie ręcznie.
- **Kontrakty gotowe pod kreator (D6)** — kreator MUSI umieć ustawić
  wszystko, co strona już renderuje: kolumny `badge`, `level`
  (migracje 004) oraz WSZYSTKIE rodzaje sekcji z migracji 003/005
  (hero, benefits, for_whom, faq, guarantee, opinions, package,
  author, problem, positioning, transformation, comparison) wraz
  z polami dodanymi przy B5: `TrescHero.dla_kogo`, `TrescAutor`
  (+cytat, czym_sie_zajmuje, link), `TrescPakiet` (+w_cenie,
  domkniecie), `TrescDlaKogo.nie_dla`. Kształty w
  `modules/m1-sklep/typy.ts`.
- **B6 ZALICZONA (właściciel, 2026-08-17)** — Dział 6 zamknięty na
  wersji **0.16.2** (kroki 1–3 + naprawy z przeglądu kodu + poprawka
  komunikacji zakładki sekcji). Gałąź `feat/d6-kreator` wypchnięta,
  **PR/tag/release CZEKAJĄ na powrót GitHuba** (awaria 2026-08-17);
  gotowy opis PR: `docs/plugin-1/PR-D6.md`.
- **Dział 6 (wersja 0.16.2, gałąź `feat/d6-kreator`)**. Decyzje
  właściciela: wygląd **premium, jak reszta `/szkolenia`**; okładka =
  **pole URL/ścieżka, bez uploadu**; wejście do kreatora **z podstrony
  `/szkolenia`** (pigułka widoczna tylko dla zalogowanego).
  Instrukcja obsługi: [docs/plugin-1/KREATOR.md](docs/plugin-1/KREATOR.md).
  - **Krok 1 (0.14.0)**: brama na token (ciastko HttpOnly,
    `lib/kreator-dostep.ts` + akcje serwerowe
    `app/szkolenia/kreator/akcje.ts` — BEZ dostępu do bazy, więc
    „jeden AJAX" zostaje), lista `/szkolenia/kreator` z licznikami
    z bazy, edytor `/szkolenia/kreator/[id]`, `szczegolyKursuPoId`,
    `KartaKreatora`. Dyspozytor sprawdza token PRZED walidacją (403,
    nie 400 z mapą pól); jedyny AJAX bierze token z ciastka.
  - **Krok 2 (0.15.0)**: edytor WSZYSTKICH 12 rodzajów sekcji
    + program (moduły/lekcje), sterowany opisem pól
    (`components/kreator/opis-sekcji.ts` + `tresc-sekcji.ts`), mapa
    `SCHEMATY_SEKCJI` w `typy.ts`, **`straznik-kreatora`** (pole
    w kontrakcie bez pola w panelu = czerwone CI; sprawdzony testami
    negatywnymi), goldeny `d6-kreator.json` i `d6-runda.json`.
    KLUCZOWE: przykładowa treść w testach jest GENEROWANA Z OPISU PÓL,
    więc nowe pole samo wchodzi do rundy zapis → odczyt.
  - **Krok 3 (0.16.0)**: podgląd szkicu (`/szkolenia/[slug]`
    przepuszcza szkice właścicielowi, gościowi dalej 404 — smoke
    pilnuje obu stron), przyciski podglądu w kreatorze, KREATOR.md.
  - **BLAD-004** naprawiony po drodze (zgłosił właściciel): wypełniana
    animacja `.page-enter` (`both`) zostawiała trwały kontekst
    układania i chowała elementy `fixed` pod stopką → `backwards`
    + rozszerzony `straznik-fixed`.
  - Stan dowodów: strażnicy 14/14 (doszły straznik-wagi-dokumentacji
    i straznik-scenariuszy), testy 27/27, smoke D4/D5/D6 zielone.
- **REBRANDING (2026-08-18, PR #20, tag v0.17.0)**: strona główna
  przemianowana **MatthewPlugins.pl → Automatic AI** (repo
  `MatthewPlugins/automatic-ai`; org GitHuba bez zmian). W podstronie:
  sygnet `components/brand/AutomaticMark.tsx` + napis w navbarze,
  wordmark stopki, metadane, adresy `automaticai.pl` (domena docelowa,
  jeszcze niekupiona — jak `data/site.ts` strony głównej), seedy,
  placeholdery kreatora, dokumentacja. README ma podgląd katalogu
  (`docs/zrzuty/podglad-szkolenia.png`, robiony na produkcyjnym
  `next start` — bez dev-indicatora).
- **DECYZJA ZESPOŁU (2026-08-18): produkcja na WordPressie** (hosting
  + domena, NIE VPS/Node) — szczegóły i konsekwencje w
  [docs/PLAN.md](docs/PLAN.md) (sekcja „DECYZJA ZESPOŁU 2026-08-18").
  Skrót: kod Next.js D1–D6 = prototyp-specyfikacja; po D7 sklep
  zostanie przepisany na wtyczkę WP (PHP + MySQL) z migracją danych
  z Postgresa skryptem; kolejność zatwierdzona przez właściciela:
  **najpierw D7 w prototypie, potem etap WP**. Dokumentacja etapu WP:
  do repo celowany komplet (Plugin Handbook, $wpdb/dbDelta, REST,
  bezpieczeństwo, MySQL: typy/indeksy/transakcje/triggery) —
  NIE zrzucamy całych manuali; agent czyta szeroko w sieci.
- **Dział 7 — TREŚĆ docelowa obu kursów (ZROBIONE).** Kolejność prac była:
  (1) ~~domknąć D6 na GitHubie~~ ZROBIONE (PR #18, v0.16.2),
  (2) nowa gałąź `feat/d7-tresc` od `plugin-1-sklep-kursow`,
  (3) ~~pobrać oryginalną dokumentację~~ **ZROBIONE**: 2219 plików
  (claude-platform 566, claude-code 187, github 1466 z 3192 — zakres
  cięty pod kurs). Pliki leżą LOKALNIE w
  `docs/dokumentacja-techniczna/d7/` i są **poza gitem** (55 MB;
  decyzja właściciela 2026-08-18, doprecyzowanie WYTYCZNE N2). W repo:
  `ZRODLA.md` + `tools/pobierz-dokumentacje-d7.mjs` (odtwarza komplet
  jedną komendą, idempotentnie) + `straznik-wagi-dokumentacji`.
  **Po `git clean` albo na nowej maszynie: najpierw uruchom skrypt,
  potem pisz treść.**
  (4) **NAJPIERW PROGRAM obu kursów do zatwierdzenia przez właściciela**
  (moduły + lekcje, każda ze wskazanym plikiem źródłowym) — dopiero po
  jego akceptacji piszemy treść. Kolejność jest wymuszona wymogiem
  właściciela: strona nie może obiecywać niczego spoza programu, więc
  program musi być ustalony pierwszy.
  (5) treść lekcji — każda ze wskazanym
  źródłem, zero zmyślania; cytowane fragmenty kopiować do
  `docs/dokumentacja-techniczna/d7/cytowane/` (ten katalog wchodzi
  do repo, żeby dało się sprawdzić lekcję bez pobierania 55 MB).
  Wymóg właściciela: kursy **w 100% zgodne
  z programem** — moduły/lekcje to spis treści realnego materiału,
  strona nie obiecuje niczego spoza programu; do tego golden treści
  obu kursów (ochrona przed cichą utratą tekstu). Treść wprowadzamy
  **kreatorem** (to był sens D6), nie przez seed; obecna treść
  w `tools/seed/seed-przyklady.ts` jest ROBOCZA i do zastąpienia.
  Opinie w seedach to jawne placeholdery — prawdziwe dopiero po
  pierwszych sprzedażach, niczego nie zmyślamy.
- **DECYZJE WŁAŚCICIELA przy D7 (2026-08-18)** — pełnia w
  [docs/plugin-1/PROGRAM-KURSOW-D7.md](docs/plugin-1/PROGRAM-KURSOW-D7.md)
  (sekcja „Decyzje właściciela"): (a) propozycja programu obu kursów
  (Kurs 1: 6 modułów/41 lekcji, Kurs 2: 7 modułów/50 lekcji, każda
  lekcja ze zweryfikowanym źródłem) — **ZAAKCEPTOWANA 2026-08-18**;
  (b) styl premium jak strona — każdy punkt styku klienta;
  (c) **pełnoprawny kurs, NIE e-book**: materiał kursu NIE jest publiczny
  na stronie (katalog + strony sprzedażowe zostają), po zakupie mail
  z linkiem do logowania, kurs = LEKCJE WIDEO + instrukcje + prompty na
  platformie szkoleniowej za logowaniem (etap WP, Plugin 2/3), PDF-y
  tylko jako dodatki; (d) podział pracy: agent pisze ze źródeł
  scenariusze nagrań (kroki na ekranie + narracja + prompty),
  właściciel nagrywa wideo. Scenariusze żyją w repo.
- **D7 KOMPLETNY — 91 z 91 scenariuszy (2026-08-18).** Program
  ZATWIERDZONY i wprowadzony do bazy dyspozytorem (Kurs 1: 6 modułów/41
  lekcji/720 min; Kurs 2: 7/50/745 — widać na `/szkolenia`). Scenariusze
  nagrań leżą w `tresc-kursow/<slug>/modul-N/lekcja-M-<temat>.md`, cytaty
  źródłowe w `docs/dokumentacja-techniczna/d7/cytowane/`.
  **Licznik i historia produkcji: [tresc-kursow/POSTEP.md](tresc-kursow/POSTEP.md)**
  — Kurs 1 gotowy (41/41), Kurs 2 gotowy (50/50, moduł 7 „Ponad podstawy"
  zamknięty 2026-08-18). Strażnicy 14/14, `straznik-scenariuszy`
  potwierdza 91 scenariuszy.
  **NASTĘPNY KROK: domknięcie działu** — wpis do CHANGELOG, **PR gałęzi
  `feat/d7-tresc`** do `plugin-1-sklep-kursow` wg CONTRIBUTING (moduły
  lądowały bezpośrednio na gałęzi, jeden commit na moduł — PR zamyka
  cały dział), potem **etap WordPressa** z [docs/PLAN.md](docs/PLAN.md).
  Do rozważenia przy domknięciu: golden treści obu kursów (ochrona przed
  cichą utratą tekstu) — zapowiedziany w PROGRAM-KURSOW-D7.md, jeszcze
  nie zrobiony.
  Zasady, które obowiązywały i mają obowiązywać przy każdej korekcie
  treści: commit po KAŻDYM module, każda teza z tabelą „Zgodność ze
  źródłem", zero zmyślania.
  Korekta źródła przy L2.4 Kursu 1: `extended-thinking.md` jest
  w dokumentacji DEPRECATED (4.7+ zwraca 400), więc rdzeń to
  `thinking.md`.
  Podział materiału w Kursie 2: lekcja 2.1 bierze z GitHub flow tylko
  **rytm pracy własnej**, strona **zespołowa** (przeglądy, scalanie,
  gałęzie chronione) należy do lekcji **4.1** — nie powtarzać.
  **TRYB RÓWNOLEGŁY (decyzja właściciela 2026-08-18) — cztery moduły
  Kursu 2 (4, 5, 6, 7) powstały tym trybem i ANI RAZU nie zaszedł
  warunek powrotu do trybu ręcznego.** Przepis, narzędzia
  (`tools/wyciag-zrodla.mjs`, `straznik-scenariuszy`), oceny wszystkich
  czterech modułów wg czterech sygnałów jakości i koszty — sekcja „Tryb
  produkcji" w POSTEP.md. Co się sprawdziło i ma zostać, gdyby doszła
  nowa treść: brief PRZED falami (zostaje w repo, np.
  `tresc-kursow/jak-uzywac-githuba/modul-7/BRIEF-modulu.md`), wzorzec
  formatu jako FRAGMENT gotowej lekcji, tylko własna sekcja briefu przy
  PEŁNEJ tabeli granic, przegląd pierwszej fali przed puszczeniem
  drugiej, **dosłowne zdanie zamykające poprzedniej lekcji w prompcie**
  (poprawka z modułu 6 — w module 7 zadziałała: wszystkie cztery
  przejścia trzymają się co do zdania) oraz **plik cytatów osobnym
  przebiegiem subagenta PO całym module, traktowany jako DRUGA BRAMKA
  JAKOŚCI, nie porządki** (moduł 6: 4 usterki, moduł 7: 10 usterek — w
  tym błędne przypisanie trzech tematów do modułów w podsumowaniu
  CAŁEGO kursu; wszystkie naprawione przed commitem).
  **LEKCJA z modułu 7 (nowa klasa usterki):** podsumowania odwołujące
  się do wcześniejszych modułów trzeba weryfikować przeciw REALNYM
  tytułom lekcji (`grep -h "^lekcja:" modul-*/*.md`), a nie pisać
  z pamięci — autor finału kursu przypisał `.gitignore` modułowi 3
  (jest w 2), gałęzie chronione modułowi 4 (są w 3) i konflikty
  scalania modułowi 2 (są w 4).
  **DECYZJA WŁAŚCICIELA (2026-08-18): subagenci treści zostają na
  OPUSIE.** Propozycja agenta, żeby przy tanim materiale modułu 7 zejść
  na Sonneta, została odrzucona — jakość trybu równoległego stoi na tym,
  że subagent sam pilnuje granic, odmawia tez bez pokrycia i sięga do
  oryginału. Nie zmieniać modelu bez nowej decyzji właściciela.
  Cienkie źródła z programu (poniżej ~4 kB) uzupełniamy plikami
  wskazanymi w nich jako dalsza lektura — w module 5 dotyczyło to lekcji
  5.3–5.7, w module 6 lekcji 6.2, a w module 7 **czterech lekcji z pięciu**
  (7.1, 7.2, 7.3, 7.4 — `about-codespaces.md` ma 785 B i jest samym
  spisem odsyłaczy); dopisane ścieżki lądują we frontmatterze `zrodla:`
  i w tabeli zgodności.
  **BLAD-008 (2026-08-18):** 31 plików treści kończyło się śmieciem po
  narzędziu zapisu (`</content>`, `</invoke>`); wyczyszczone, strażnik
  przeciw nawrotom w `straznik-scenariuszy` (pomija bloki kodu, bo tam
  te znaczniki bywają treścią promptu).
  **LEKCJA (2026-08-18):** `straznik-linkow` pomija teraz bloki kodu
  i kod inline — scenariusze uczące składni Markdowna zawierają
  przykłady `[tekst](sciezka)`, które nie są klikalnymi linkami.
  Zmiana sprawdzona testem negatywnym: prawdziwy martwy link w prozie
  nadal wywala strażnika.
- **DZIAŁ 7 ZAMKNIĘTY W REPO (2026-08-18, wersja 0.21.0).** PR #22
  zmergowany do `plugin-1-sklep-kursow`, tag `v0.21.0` + release.
  Treść: 91 scenariuszy, golden treści, strażnicy 16/16.
  **B7 jeszcze NIE zaliczona** — właściciel ocenia dopiero GOTOWE KURSY
  (patrz decyzja niżej), nie same scenariusze.
- **ZMIANA DECYZJI WŁAŚCICIELA (2026-08-18, wieczór) — WŁAŚCICIEL NIE
  NAGRYWA WIDEO.** To unieważnia wcześniejszy podział pracy z D7
  („agent pisze scenariusze, nagrywa właściciel", PROGRAM-KURSOW-D7.md,
  decyzja (d) z 2026-08-18). Kurs ma powstać **bez nagrań właściciela**:
  materiał trzeba **wygenerować albo znaleźć inne rozwiązanie** —
  sposób NIE jest jeszcze wybrany i wymaga osobnej propozycji z opcjami
  (koszt, jakość, prawa, aktualizowalność). Scenariusze z D7 zostają
  podstawą materiału niezależnie od wybranej drogi.
  **Kreator (D6) ma przejąć także LEKCJE i NAGRANIA** — dziś obsługuje
  kurs, program i sekcje sprzedażowe; dojdzie treść lekcji i materiał
  wideo. To rozszerzenie kontraktów w `modules/m1-sklep/typy.ts`,
  migracje i panel — czyli **ciąg dalszy Działu 6**, nie nowy moduł.
  Cel: **dwa kompletne kursy gotowe do sprzedaży**, złożone w narzędziu.
- **PLAN DOMKNIĘCIA PLUGINU 1 — CZTERY KROKI (właściciel, 2026-08-19).**
  Pełna treść z decyzjami do podjęcia, przeszkodami technicznymi
  i bramkami: **[docs/plugin-1/PLAN-FINAL-PLUGINU-1.md](docs/plugin-1/PLAN-FINAL-PLUGINU-1.md)**
  — CZYTAĆ PRZED PRACĄ. Skrót:
  1. ~~merge D7 + dopracowanie repo (tura 1)~~ **ZROBIONE** (0.21.0,
     0.22.0). Właściciel może dosłać kolejne wskazówki do repo.
  2. ~~SEO i wydajność na żywym adresie~~ **ZROBIONE** (0.23.0–0.25.0,
     stack PR #26/#27/#28 zmergowany, tag `v0.25.0`; szczegóły w częściach
     1–3 niżej — CZĘŚĆ 3/3 niesie lekcje warte przeczytania przed pomiarami).
     **Część 1/3 ZROBIONA (0.23.0, gałąź `feat/podglad-statyczny`): tryb
     podglądu statycznego.** `npm run build:podglad` → `out/` (katalog
     i strony kursów z bazy w czasie builda), `npm run deploy:podglad`
     → publiczne repo `MatthewPlugins/szkolenia-podglad`. Kluczowe do
     zapamiętania: oba tryby rozdziela **`pageExtensions`** —
     `*.serwer.*` widzi tylko tryb serwerowy, `*.statyczny.*` tylko
     podgląd, wspólna treść siedzi w `widok.tsx`. Tak, a nie `if`-em
     w jednym pliku, bo **kompilator Next parsuje `dynamic`,
     `dynamicParams` i `generateStaticParams` STATYCZNIE i odrzuca
     wyrażenia** (sprawdzone dwukrotnie: wariant z warunkiem się nie
     kompiluje, wariant z `connection()` kompiluje się, ale
     `generateStaticParams` przestawia trasę na SSG i `cookies()`
     wywala `DYNAMIC_SERVER_USAGE`). Tryb ma JEDNO źródło prawdy
     (`lib/podglad.ts`), pilnuje tego `straznik-podgladu` + 4 mutacje
     + `smoke-podglad` (buduje CELOWO z tokenem w środowisku, żeby
     udowodnić, że szkice nie wchodzą do publicznych plików).
     **Część 2/3 ZROBIONA (0.24.0, gałąź `feat/seo-podstrony`): SEO na
     stronie.** `lib/seo.ts` = jedno źródło prawdy o adresie i o tym, czy
     wolno indeksować (`INDEKSOWANIE`, domyślnie NIE; `SEO_INDEKSOWANIE=1`
     wyłącznie do pomiaru kolumny SEO, którą `noindex` punktowo zaniża).
     Doszły: kanoniki + OpenGraph, `app/robots.ts`, `app/sitemap.ts`
     (bez `lastModified` — nie mamy prawdziwej daty zmiany treści),
     miniatury OG przez `next/og` (własna per kurs), JSON-LD
     (Organization, ItemList, Course+Offer, BreadcrumbList, FAQPage),
     `straznik-seo` + 6 mutacji, `smoke-seo` (porównuje dane
     strukturalne Z BAZĄ). **Trzy pułapki, które kosztowały czas i mogą
     wrócić:** (1) `opengraph-image.tsx` w eksporcie daje plik BEZ
     rozszerzenia → Pages podaje `octet-stream` → scrapery odrzucają
     miniaturę; naprawia `tools/og-rozszerzenie.mjs` po buildzie;
     (2) konwencja plikowa Next **nie dziedziczy się w dół** — `/szkolenia`
     nie dostało obrazka z `app/opengraph-image.tsx`, trzeba było osobnej
     trasy; (3) `app/robots.ts` i `app/sitemap.ts` MUSZĄ mieć
     `dynamic = "force-static"`, inaczej `output: export` pada.
     **DECYZJA: `Offer.availability` = `PreOrder`**, bo zakup to dziś
     placeholder — na `InStock` zmieniamy dopiero z płatnościami
     (Plugin 2); pilnuje tego smoke.
     **BŁĄD ZŁAPANY DOPIERO NA ŻYWYM ADRESIE (0.24.0) — klasa do
     zapamiętania:** opublikowany podgląd oddawał **404 na wszystkich
     czterech miniaturach OG**, bo skrypt deploya wołał `npx next build`
     wprost, a krok nadający rozszerzenie `.png` wisi na komendzie
     `build:podglad`. Build zielony, weryfikacja żywego adresu zielona
     — obie sprawdzały PROCES, nie ARTEFAKT. Gorzej: dopisany test
     miniatur sam był ślepy (wzorzec `[^"?]*`, a Next dokleja do adresu
     sygnaturę `?455fcc13` — grep nie łapał niczego i pętla przebiegała
     po pustce). Wykryte testem negatywnym. **REGUŁA: każdy nowy test
     sprawdzić testem negatywnym; deploy woła tę samą komendę co
     człowiek.**

     ### CZĘŚĆ 3/3 — WYDAJNOŚĆ I POMIARY (ZROBIONA I ZMERGOWANA, 0.25.0, tag `v0.25.0`)

     **Stan końcowy (PSI, mediana z 5, golden `goldeny/pomiary-lighthouse.json`,
     tabela w README + przepisany protokół):** desktop **100/100/100/100 na
     obu stronach** (po 5 przebiegów z rzędu), mobile **96–97 wydajności**
     przy 100 w dostępności/praktykach/SEO wszędzie, CLS = 0 na czterech
     pomiarach, TBT ≤ 27 ms. **Mobilne 96–97 = artefakt symulacji Lantern**
     (dolicza łańcuch webfontu do tekstowego LCP; obserwowane LCP na
     serwerach Google ~450 ms; wartość symulowana identyczna co do
     milisekundy w 4 różnych buildach) — **DECYZJA WŁAŚCICIELA 2026-08-19:
     przyjęte, warunek „100 w każdej kolumnie" złagodzony**; opcja
     `font-display: optional` na mobile odrzucona (część pierwszych wizyt
     bez Geista), fonty inline w HTML odrzucone (klasa inlineCss).
     Decyzje po drodze: fade pierwszego wejścia usunięty świadomie;
     fonty self-host + preload.

     **Historia napraw (wszystkie potwierdzone pomiarem; szczegóły
     w CHANGELOG 0.25.0):** (1) NO_FCP strony kursu — `.page-enter` tylko
     przy nawigacji (8986ec8); (2) prewarm stopki za bramką widoku
     (1d6ca0b); (3) icon.svg → praktyki 96→100; (4) alt okładek + tytuł
     katalogu (adc6dd5); (5) fonty: next/font NIE emituje preloadu →
     własny @font-face z `public/fonts` + jawny preload w layoucie,
     CLS 0,14–0,17→0 (e97b269); (6) korekta metryk zastępnika była MARTWA
     na Linuksie (`local(Arial)` bez Ariala) → dopisany Liberation Sans,
     metryczny bliźniak (bb09551); (7) impuls wordmarku malował
     niewidzialnego kandydata LCP 183 600 px² → `animation-play-state:
     paused` + `visibility: hidden` grupy maskowanej do wejścia stopki
     w widok, bramka `data-na-ekranie` z IO FooterScene (25df69f,
     bb09551); (8) weryfikacja deploya ślepa na chunki → `sprawdz-zywy`
     porównuje KAŻDY chunk (614996d).

     **LEKCJE tej części (nie powtarzać):**
     - **Nazwy chunków Next NIE pochodzą z treści** — zmiana samego CSS
       zostawia identyczny HTML i identyczne nazwy plików. Weryfikacja
       po jednym pliku przechodzi przeciw STAREMU deploymentowi, a edge
       cache Pages (`max-age=600`) oddaje starą treść ≤10 min. Po
       deployu przed pomiarem odczekać ≥10 minut; podejrzanie stabilny
       wynik (co do milisekundy) to sygnał, że mierzysz nie to.
     - **Fallback `local()` musi istnieć na maszynie pomiarowej**:
       next/font wiąże korekty metryk tylko z Arialem, na Linuksie
       twarz przepada w całości. Liberation Sans = metryczny bliźniak.
     - **Chrome rejestruje tekst maski SVG jako kandydata LCP** nawet
       przy wstrzymanej animacji konsumenta maski; zdejmuje go dopiero
       `visibility: hidden` na grupie maskowanej.
     - **PSI miewa czkawkę infrastruktury** (seria 72/97 z TBT 1263 ms
       przy realnym ~100 ms skryptu na stronie) — sondy kontrolne przed
       wnioskami.
     - Porty 3005–3007 zajmowane przez moje serwery pomiarowe ubijać
       PRZED smoke'ami (`fuser -k`); padnięty smoke zostawia kursy
       `smoke-podglad-*` w bazie — sprzątnąć przed powtórką.
     - `pkill -f "next start"` trafia własną powłokę (wzorzec w linii
       komendy) — używać `fuser -k <port>/tcp`.

     **KROK 1 DOMKNIĘTY (2026-08-19):** stack #26 → #27 → #28 zmergowany
     do `plugin-1-sklep-kursow` od najstarszego z `--delete-branch`
     (decyzja właściciela: na dowodach lokalnych, CI stoi do 1 września
     jak przy 0.21.0 — po powrocie CI potwierdzić gitleaks). Tag
     `v0.25.0` + release. PUŁAPKA GITHUBA zanotowana: merge przez API
     z `--delete-branch` ZAMYKA stackowanego PR-a zamiast przepiąć mu
     bazę (web robi to sam) — #27 trzeba było przywrócić (push gałęzi
     bazowej ze stale trackingu → reopen → edit base → merge), a #28
     przepiąłem na `plugin-1-sklep-kursow` PRZED merge'em #27.
     Pomiary powtórzyć po złożeniu kursów w kreatorze (krok 4).

     **Żywy podgląd:** `https://matthewplugins.github.io/szkolenia-podglad/szkolenia`
     — **od 2026-08-24 serwuje build 0.33.0** (publikacja za zgodą właściciela
     po naprawach audytu; skrypt sam zweryfikował zgodność co do chunka,
     a kontrola na żywym adresie dała 0 trafień na wzorce nieprawd).
     Wcześniej stał na 0.25.0. Preloady
     fontów w HTML, cztery miniatury OG `image/png` 200.

     **Komendy:** `npm run db1:up`, `npm run dev` → `:3001`,
     `npm run build:podglad`, `npm run deploy:podglad` (wymaga czystego
     drzewa i bazy; sam weryfikuje chunki), smoke'i `d4/d5/d6/podglad/seo`
     (kody wyjścia BEZ potoku), pomiar:
     `PAGESPEED_KLUCZ` w `.env` → `node tools/pomiar-psi.mjs`.

  3. **PEŁNE ZABEZPIECZENIA — ZAMKNIĘTE 2026-08-19** (0.26.0 → 0.29.0:
     CSP → brama AJAX → limity wejścia → domknięcie). Podział pozycji
     ⏳/🔧 zrobiony i ZATWIERDZONY przez właściciela, razem z wynikami
     spike'u i kolejnością PR-ów:
     **[docs/plugin-1/KROK-2-ZABEZPIECZENIA.md](docs/plugin-1/KROK-2-ZABEZPIECZENIA.md)**
     — czytać zamiast wyprowadzania podziału od nowa. Skrót: otwartych
     pozycji było 14 (nie 18 — tamta liczba liczyła linie, nie wiersze
     tabel), dwie okazały się zrobione w 0.24.0/0.25.0, do prototypu
     idzie pięć (CSP + rate limiting + limity wejścia + komunikaty
     błędów + `timingSafeEqual` w dyspozytorze), pięć do specyfikacji WP,
     trzy poza repo. Checklista ma teraz szósty stan **🚧 = w robocie
     w kroku 2**.
     **PR 1 z 4 ZROBIONY — wersja 0.26.0** (PR #33, tag `v0.26.0`):
     pełne CSP z jednorazowym nonce'em w trybie serwerowym
     (`proxy.serwer.ts`) i `<meta>` z hashami w podglądzie
     (`tools/csp-podglad.mjs`), `straznik-csp` + `smoke-csp`.
     Zapamiętać: `/_not-found` szło z prerenderu (24 skrypty, zero
     nonce'ów) — naprawił to odczyt nagłówków w układzie korzenia;
     `style-src` MUSI mieć `unsafe-inline` (React zdejmuje nonce
     z hoistowanego `@font-face`, a strona ma 19 atrybutów `style`);
     Next 16.3.1 wymaga w pliku proxy eksportu DOMYŚLNEGO.
     **BLAD-012**: smoke podglądu wołał `npx next build` zamiast komendy
     — nawrót klasy błędu z 0.24.0.
     **PR 2 z 4 ZROBIONY — wersja 0.27.0** (PR #35, tag `v0.27.0`):
     brama jedynego AJAX-a. `lib/limiter.ts` (okno przesuwne po
     IP+akcja, moduł CZYSTY — bez `next/*`, więc testowalny z
     wstrzykniętym czasem), limit 60 POST-ów/min + OSOBNY licznik
     5 chybionych uwierzytelnień/10 min, 429 z `Retry-After`, kara
     700 ms także poza formularzem, `timingSafeEqual` w dyspozytorze
     (helper LOKALNY — moduł zostaje samowystarczalny),
     `straznik-limitera`. Zapamiętać: **licznik chybionych prób pyta
     o WYNIK dyspozytora**, więc poprawny token nigdy nie wpada w 429;
     **odrzucone próby nie wchodzą do okna** (inaczej `Retry-After`
     kłamie); po przekroczeniu limitu odpowiadamy BEZ kary czasowej.
     `x-forwarded-for` jest do podrobienia — zapisane w kodzie i w
     specyfikacji WP.
     **PR 3 z 4 ZROBIONY — wersja 0.28.0** (PR #37, tag `v0.28.0`):
     twarde limity wejścia. Sufity długości i liczności w każdym polu
     kontraktu (liczby z POMIARU bazy: najdłuższy tekst 191 znaków,
     lista 10 pozycji, pełny zapis kursu 17 kB), sufit `price_grosze`,
     **2 MB na ciało żądania mierzone STRUMIENIEM przed parsowaniem**
     (413; `content-length` sprawdzany, ale nieufnie), oczyszczanie
     treści sekcji schematem przed zapisem (bez tego jeden nieznany
     klucz omijał wszystkie limity), generyczny komunikat zamiast
     surowego błędu Postgresa, `straznik-limitow`.
     **LEKCJA (2026-08-19):** audyt mutacyjny złapał REGRESJĘ kontroli
     — `straznik-limitera` wiązał sprawdzenie „limit przed czytaniem
     ciała" z nazwą `request.json()`, której trasa po PR 3 już nie
     używa; strażnik zzieleniał na mutacji, którą wcześniej łapał.
     Wzorce w strażnikach mają celować w ZACHOWANIE (pierwsze
     dotknięcie ciała), nie w nazwę metody. Drugi taki przypadek w tym
     samym przebiegu: porównanie pozycji `cialoZSufitem` trafiało
     w definicję funkcji zamiast w wywołanie.
     **PR 4 z 4 ZROBIONY — wersja 0.29.0**: checklista bez ani jednej
     pozycji 🚧, **BLAD-013** w rejestrze, bilans kroku w CHANGELOG.
     Stan dowodów na koniec kroku: strażnicy 23/23, audyt mutacyjny
     64/64 (0 przeoczonych, 0 martwych), testy 49/49, smoke
     D4/D5/D6/CSP/SEO/podgląd zielone.
     **CO ZOSTAJE OTWARTE ŚWIADOMIE** (tabela w KROK-2-ZABEZPIECZENIA.md):
     RODO i konta klientów (Plugin 2/3), HTTPS/HSTS i poczta (hosting
     + domena), 2FA i branch protection (decyzje właściciela), stan
     limitera poza pamięcią procesu (nośnik WP) oraz **sufit ciała
     2 MB — przeliczyć POMIAREM, gdy kreator dostanie treść lekcji
     (krok 3): proza obu kursów waży dziś 1307 kB**.
  4. **Kursy zrobione do końca, w narzędziu — RÓWNOLEGLE, w osobnym
     czacie** (decyzja właściciela 2026-08-19) → **B7 = ocena GOTOWYCH
     kursów przez właściciela**. Podział terytoriów między oba czaty
     (i protokół dla wspólnego `modules/m1-sklep/typy.ts`) — sekcja
     „Praca równoległa" w KROK-2-ZABEZPIECZENIA.md.
     **Dokument roboczy kroku (stan, etapy, pułapki):
     [docs/plugin-1/KROK-3-KURSY.md](docs/plugin-1/KROK-3-KURSY.md)
     — CZYTAĆ PRZED PRACĄ.**
     **Etapy 1 i 2 ZROBIONE**: PR #32 (decyzje o produkcji materiału)
     i **PR #36, wersja 0.30.0** — kreator przejmuje treść lekcji
     (warstwa danych + panel `/szkolenia/kreator/lekcja/[id]`, licznik
     postępu, `straznik-tresci-lekcji`, `smoke-lekcje`); zmergowany
     2026-08-19 na dowodach lokalnych, decyzją właściciela, bo CI stoi
     do 1 września. **Etap 3 (proza obu kursów) ZROBIONY — patrz niżej.**
     **NASTĘPNY KROK: PRZELOT ZRZUTÓW EKRANU — brief wiążący
     [docs/plugin-1/PRZELOT-ZRZUTOW.md](docs/plugin-1/PRZELOT-ZRZUTOW.md),
     CZYTAĆ PRZED PRACĄ** (są tam też gotowe prompty startowe obu czatów).
     Stan przelotu **liczy się komendą, nigdy z pamięci**:
     `export ZRZUTY_KORZEN=$PWD && node tools/zrzuty/manifest.mjs` —
     manifest wyprowadza się z prozy (znacznik `<!-- ZRZUT: … -->` = do
     zrobienia, `![…](zrzuty/…)` z istniejącym plikiem = zrobione), więc
     nie ma osobnego pliku stanu, który mógłby skłamać.
     **STAN NA 2026-08-23, wieczór: 160 miejsc, 137 zrobionych, 23 otwarte —
     wszystkie w Kursie 1** (claude.ai 16, API 5, Console 2). **Kurs 2
     ZAMKNIĘTY: 88/88.** Wcześniejsze liczby („173/33/72/68", „170", „96/44")
     są nieaktualne — przelot usunął po drodze miejsca niewykonalne, więc
     spadła też suma.
     **GAŁĘZIE SCALONE W JEDNĄ:** dorobek czatu B (`feat/zrzuty-k1`) wszedł
     do `feat/tresc-k2-modul-2-3`, żeby poszedł JEDEN PR zamiast stosu dwóch
     (stackowane PR-y już raz zamknęły się nawzajem — notatka przy 0.25.0).
     **NASTĘPNY KROK: OSTATNIA FAZA PRZELOTU — 23 miejsca Kursu 1.** To inna
     klasa pracy niż reszta: prowadzenie prawdziwych rozmów na koncie
     właściciela i PŁATNE wywołania API, więc wymaga osobnej zgody na koszty.
     Prompt startowy tej sesji leży w
     [docs/plugin-1/PRZELOT-ZRZUTOW.md](docs/plugin-1/PRZELOT-ZRZUTOW.md),
     sekcja „Co zostało z całego przelotu".
     Kolejność dalszych prac (decyzja właściciela 2026-08-23): ostatnia faza
     zrzutów → **PR → merge → tag → release** → **audyt kursów i higiena repo
     — OMÓWIMY OSOBNO, nie planować tego teraz** → etap WordPressa.
     ~~Nierozstrzygnięte: lokalny podgląd obu kursów w stylu strony~~
     **ROZSTRZYGNIĘTE 2026-08-24: podgląd przebudowany (0.34.0) i ZAAKCEPTOWANY
     przez właściciela** („redesign jest dobry"). Zapamiętać z etapu 2: panel MUSI odsyłać
     `id` modułów i lekcji (dyspozytor kasuje wiersze spoza wejścia —
     bez tego zapis kursu kasuje materiał), a w worktree kroku 3
     `node_modules` musi być KOPIĄ (`cp -al`), bo Turbopack odrzuca
     dowiązanie wychodzące poza projekt i `npm run build` pada.
     **DECYZJE WŁAŚCICIELA 2026-08-19 o produkcji materiału (punkt 1
     kroku odhaczony) — pełnia z liczbami i odrzuconymi opcjami:
     [docs/plugin-1/PRODUKCJA-MATERIALU-KROK-3.md](docs/plugin-1/PRODUKCJA-MATERIALU-KROK-3.md):**
     - **NIE ROBIMY WIDEO. Produkt = kurs tekstowy na platformie za
       logowaniem + PDF jako DODATEK** (nie rdzeń). Sam PDF do pobrania
       rozważony i ODRZUCONY (cena nie do obrony, wyciek pliku kończy
       sprzedaż, aktualizacje trzeba dostarczać ręcznie). To nie jest
       odwrót od decyzji „NIE e-book" z 2026-08-18 — tamta stała na
       założeniu, że właściciel nagrywa; założenie upadło tego samego
       wieczoru. Scenariusze zostają ważne co do zdania: wideo da się
       dorobić później z tych samych plików, odwrotnie nie działa.
     - **Kreator dostaje TREŚĆ LEKCJI i MATERIAŁY DODATKOWE, a NIE
       kontrakt nagrania wideo** (żadnego hostingu, czasu trwania filmu
       ani napisów — to unieważnia wcześniejszy zapis „kreator przejmuje
       lekcje i nagrania").
     - **Kurs 1 zostaje DOGĘSZCZONY** trybem równoległym z briefami:
       ma 91 stron prozy przy 292 stronach Kursu 2 (pomiar 2026-08-19),
       a kosztuje więcej. Odrzucone: obniżenie obietnicy i obniżenie ceny.
     - **`duration_min` zostaje i znaczy „czas przerobienia lekcji"**,
       nie długość filmu. Program z 2026-08-18 NIE wymaga ponownej
       akceptacji, statystyki katalogu i goldeny bez zmian — zmienia się
       podpis na stronie.
     - Otwarte świadomie: **517 miejsc `[EKRAN]`** → bloki terminala
       tekstem, zrzuty interfejsu osobnym przelotem NA KOŃCU (najszybciej
       się starzeją).
     **PROZA OBU KURSÓW KOMPLETNA I NA JEDNEJ GAŁĘZI (2026-08-23):**
     73 z 73 lekcji, wszystko w bazie. Gałąź czatu B
     (`feat/tresc-k2-modul-4-6`) **zmergowana** do
     `feat/tresc-k2-modul-2-3` w worktree
     `/home/krzysiek/Pod-strona-Szkolenia-k2-A` — tam jest dziś praca;
     worktree `…-k2-B` niesie gałąź JUŻ ZMERGOWANĄ. Kurs 2 ma **32/32**
     lekcje: ostatnią, **4.1 „GitHub Flow: jak pracują zespoły"**,
     napisał czat A po scaleniu, bo dopiero wtedy istniał drugi koniec
     mostu z modułu 3. Rozjazd numeracji ROZSTRZYGNIĘTY przez
     właściciela: **dziury w `position` zostają**, osiem plików czatu B
     przemianowano na numery z programu (wraz z frontmatterem),
     a poprawka czatu B w `straznik-prozy` (dopasowanie po TYTULE)
     obowiązuje. Moduły 4–6 **wgrane do bazy**.
     **REGUŁA Z PRZELOTU (dotyczy każdej przyszłej treści): komunikat
     narzędzia cytujemy z WYKONANIA komendy, nie z dokumentacji** —
     docs GitHuba podają starsze brzmienia i w lekcji 2.5 Kursu 2 były
     przez to CZTERY nieprawdziwe komunikaty (`fatal:` zamiast
     `error:`). Rejestr rozjazdów:
     [tresc-kursow/ZNALEZISKA-PRZELOTU-ZRZUTOW.md](tresc-kursow/ZNALEZISKA-PRZELOTU-ZRZUTOW.md).
     **DECYZJA WŁAŚCICIELA (2026-08-23): na koniec projektu oba kursy
     lądują jako HTML na GitHub Pages, z linkami-podglądami w README** —
     jak dzisiejszy podgląd `/szkolenia`.

     **KURS 1 KOMPLETNY I SCALONY (2026-08-22, wersja 0.31.0):** 41/41
     lekcji prozy (565 394 znaki) na `plugin-1-sklep-kursow` i w bazie
     (weryfikacja dwustronna: pliki + SQL). PR #51 (moduł 3) i #52
     (moduł 5) zmergowane do trunku treści `feat/tresc-lekcji-kursow`,
     a trunk do gałęzi głównej modułu; zdalne gałęzie modułowe skasowane.
     **17 lekcji bez bramki cytatów (3.1–3.6, 5.1–5.3, 5.5–5.7,
     6.1–6.5) zostaje — decyzja właściciela 2026-08-22**: usterki tej
     klasy dotykają wyłącznie treści lekcji, nie systemu ani strony
     sprzedażowej. **KURS 2 PO KALIBRACJI (2026-08-22): program ucięty do
     32 lekcji, autorzy na Sonnecie 5 pod warunkiem komendy mierzącej
     objętość w prompcie, jeden autor = jedna lekcja, bramka cytatów
     wyrywkowa (2 najgęstsze lekcje na moduł), dwa czaty równoległe —
     A: moduły 2–3 (`feat/tresc-k2-modul-2-3`, port 3012), B: moduły 4–6
     (`feat/tresc-k2-modul-4-6`).** Proza Kursu 2: **12 z 32 lekcji**
     (moduły 1 i 2 zamknięte i w bazie, 127 555 znaków). **REGUŁA
     WŁAŚCICIELA 2026-08-22: gdy dokumentacja GitHuba rozjeżdża się
     z podręcznikiem samego narzędzia, dokładamy podręcznik jako drugie
     źródło i odnotowujemy to w tabeli zgodności** — kurs nie powtarza
     nieprawdy, ale korekta musi mieć własne, wskazane źródło. Kolejność
     robót K2, trzy klasy usterek niewidzialnych dla strażników i pełnia
     decyzji: KROK-3-KURSY.md, sekcje „KONSOLIDACJA" i „MODUŁ 2 KURSU 2
     — ZAMKNIĘTY I WGRANY".
     Worktree'y `krok3`/`modul3`/`modul5`/`modul6` zostają lokalnie
     (gałęzie w nich są już zmergowane); **istnienie worktree nie
     znaczy, że trwa w nim praca** — stan czytaj z `git log`.
     Konwencja gałęzi Kursu 2: `feat/tresc-k2-modul-N`.
     **PRZELOT ZRZUTÓW — FAZA OSTATNIA ZAMKNIĘTA (2026-08-23).** Stan liczy
     komenda `node tools/zrzuty/manifest.mjs`, nigdy pamięć: **148 z 160 miejsc
     zrobionych** (Kurs 2 komplet 88/88, Kurs 1 60/72). Brief z przepisem,
     pułapkami i prompem startowym: [docs/plugin-1/PRZELOT-ZRZUTOW.md](docs/plugin-1/PRZELOT-ZRZUTOW.md),
     znaleziska: [tresc-kursow/ZNALEZISKA-PRZELOTU-ZRZUTOW.md](tresc-kursow/ZNALEZISKA-PRZELOTU-ZRZUTOW.md).
     **Dwanaście miejsc zostaje otwartych** i to jest stan docelowy, nie dług:
     dziewięć z DECYZJI właściciela (2026-08-23 — płatne wywołania API i klucz
     w Konsoli: 5 × `api`, 2 × Konsola, strumieniowanie 5.5; oraz aplikacja
     Claude na repozytorium demonstracyjnym dla `@claude` w lekcji 4.6), trzy
     dlatego, że **Cloudflare zablokował sterowaną przeglądarkę** na claude.ai
     (podgląd myślenia 2.4, ustawienia 5.6, wgrany obraz 5.8) — ręczne okno na
     tym samym profilu przechodzi. **DECYZJA WŁAŚCICIELA (2026-08-23): przelot
     ZAMKNIĘTY na 148/160 — do robienia zrzutów NIE WRACAMY.** Te dwanaście
     miejsc rozstrzygamy przy domykaniu kursu: poprawką podpisu i prozy albo
     usunięciem znacznika (jak przy czterech ekranach GitHub Desktopu).
     Rozmowy demonstracyjne z konta claude.ai **skasowane 2026-08-23**
     (23 sztuki, kontrola po kasowaniu: zero rozmów z okna partii).
     **PR #55 ZMERGOWANY (2026-08-23), tag `v0.32.0` + release** — na
     dowodach lokalnych (strażnicy 26/26, audyt mutacyjny 85/85, testy
     75/75; CI stoi do 1 września — po powrocie potwierdzić gitleaks).
     Zdalna gałąź PR-a skasowana; `feat/tresc-k2-modul-4-6` (czatu B,
     w pełni scalona) czeka na zaplanowane sprzątanie po Pluginie 1.
     Przy PR wgrane też 64 lekcje wgrywarką (w tym proza 4.1 K2, która
     leżała TYLKO w plikach) — baza i pliki zgodne co do znaku.
     **AUDYT KURSÓW ZROBIONY I ZNALEZISKA NAPRAWIONE (2026-08-24, wersja
     0.33.0, gałąź `fix/naprawy-audytu-kursow`).** Zakres audytu ustalił
     właściciel: tropy z [tresc-kursow/AUDYT-KONCOWY.md](tresc-kursow/AUDYT-KONCOWY.md)
     + prawda o produkcie + domknięcie miejsc na zrzuty; bramki cytatów
     audyt NIE cofa. **Proza okazała się zdrowa** (73 mosty trzymają się co
     do zdania, zero powtórzeń, spójny stan repozytorium czytelnika,
     poprawne podsumowania kursów), a rozjazd siedział POZA nią:
     - **strony sprzedażowe obu kursów obiecywały inny produkt** (wideo,
       złe liczby lekcji, nieistniejący „moduł ratunkowy”, „Projekty
       i artefakty”, pliki do pobrania, odwrotna kolejność nauki w FAQ K2)
       — przepisane na stan faktyczny w seedzie i wgrane do bazy
       **bez klucza `modules`**, więc program i treść lekcji nietknięte;
     - **program Kursu 1 w seedzie był sprzed D7** — odtworzony z bazy;
     - **seed wykonywał się przy imporcie** (a zaczyna od kasowania kursów)
       — dołożona bramka main-module i eksport `KURSY_SEED`;
     - **BLAD-014**: `manifest.mjs`, `test-asercji.mjs` i `kolejka.mjs`
       brały adres URL za ścieżkę — w katalogu ze spacją manifest MILCZAŁ
       z kodem 0. Naprawione, pilnuje `straznik-sciezek`;
     - **BLAD-016**: bramka prywatności zrzutów przepuszczała dane
       właściciela rozbite na dwa elementy; test negatywny istniał, ale był
       martwy przez BLAD-014. Naprawione, testy asercji 15/15;
     - **dwanaście otwartych znaczników zrzutów usuniętych** — manifest
       liczy teraz **148 miejsc, 148 zrobionych, 0 otwartych**.
     Stan dowodów: strażnicy **28/28**, audyt mutacyjny **90/90**, testy
     **75/75**, smoke'i **6/6**, pliki prozy zgodne z bazą **73/73**.
     **ZOSTAJE DO DECYZJI WŁAŚCICIELA:** zobowiązania handlowe na stronach
     sprzedażowych (gwarancja 30 dni, dostęp bez limitu, aktualizacje bez
     dopłat, „odpowiadam osobiście”) — wymagają Pluginu 2/3, więc audyt ich
     nie ruszał.
     **WIDOK TREŚCI KURSU PRZEBUDOWANY (2026-08-24, wersja 0.34.0, gałąź
     `feat/widok-kursu-premium`)** — pozycja 3 z „Kolejności domykania kroku 3".
     Właściciel: *widok kursu ma dorównywać stronie sprzedażowej*. Trzy decyzje
     podjęte na starcie (pytania z planu, NIE założenia agenta):
     (a) wygląd żyje w **generatorze HTML** `tools/podglad-kursow*`, nie
     w trasie Nexta — produkt idzie na Tutor LMS, gdzie portuje się CSS
     i szablony, a komponenty Reacta i tak trzeba by przepisać na PHP;
     (b) nawigacja to **pływająca pigułka jak na stronie sprzedażowej**
     (rozwijany program + spis sekcji lekcji), BEZ stałego panelu bocznego;
     (c) postęp = **pozycja w kursie z programu + pamięć tej przeglądarki**
     (`localStorage`), podpisana wprost, że to nie konto.
     **Sedno nie było estetyczne:** strona sprzedażowa (`SekcjaPlatforma` +
     mockup `OknoKursu`) obiecuje „zawsze wiesz, gdzie jesteś" i „widzisz swój
     postęp lekcja po lekcji", a widok kursu nie miał żadnej z tych rzeczy —
     czyli obietnica była niedotrzymana, klasa BLAD-015.
     Wygląd wyjęty do `tools/podglad-kursow/` (`style.mjs` z tokenami 1:1
     z `app/globals.css`, `szablony.mjs`, `tresc.mjs`, `skrypt.mjs`,
     `ikony.mjs`, `wymiary.mjs`) — **tak, żeby dało się to przenieść do
     szablonów Tutora**. Sekcje prozy rozpoznawane po nagłówkach, które
     w treści JUŻ SĄ (73/73 „Czego się nauczysz", „Zrób to teraz",
     „Zapamiętaj", „Co dalej"; 67 „Prompty", 46 „Gdy coś nie działa") —
     **ani jedno słowo prozy nie zmienione**.
     **Trzy błędy sprzed redesignu naprawione przy okazji:** strona wejściowa
     podglądu nigdy nie ładowała Geista (`../zasoby/` z korzenia celowało poza
     katalog wyjściowy), 7 zrzutów nie wyświetlało się wcale (dwa obrazy
     w sąsiednich wierszach markdown = jeden akapit, a dopasowanie brało tylko
     obraz sam w akapicie), 29 podpisów pokazywało dosłowne `&quot;`
     (podwójna ucieczka znaków).
     **PUŁAPKA JUŻ NIEAKTUALNA (zapis historyczny):** arkusz był jednym
     literałem szablonowym w `style.mjs` i pojedynczy odwrócony apostrof
     w komentarzu CSS wywalał node w losowym miejscu pliku (trzy przebiegi).
     Od 0.34.0 arkusz jest prawdziwym plikiem `tools/podglad-kursow/styl.css`,
     a `style.mjs` (23 linie) tylko go wczytuje — przyczyna zniknęła.
     Wydajność: arkusz i skrypt wyciągnięte do `zasoby/` (wspólne dla 76
     stron, strona lekcji 77 kB → 30 kB), wymiary 148 zrzutów czytane
     z nagłówka WebP (`wymiary.mjs`) → CLS bez ruchu, zero nowych zależności.
     Dowody: strażnicy 28/28, testy 75/75, audyt mutacyjny 90/90, kontrola
     całego wyjścia (76 stron) bez martwych odsyłaczy i przepełnień, widok
     sprawdzony też BEZ `widok.js` i przez `file://`.
     **WYGLĄD OCENIONY I PRZYJĘTY (właściciel, 2026-08-24): „redesign jest
     dobry".** Pozycja 3 z „Kolejności domykania kroku 3" jest tym samym
     ZAMKNIĘTA. B7 zostaje otwarta osobno — dotyczy oceny GOTOWYCH KURSÓW,
     nie wyglądu narzędzia.
     **TRZY RZECZY ODDANE DO OCENY I PRZYJĘTE JAK SĄ — nie otwierać ich
     z własnej inicjatywy:** siła akcentu volt na sekcji „Zrób to teraz",
     jasne zrzuty interfejsów na ciemnym tle (celowo nieprzyciemniane —
     przyciemnienie zafałszowałoby to, co klient zobaczy u siebie) oraz
     poświata za kursorem na stronie lekcji.
     **PUŁAPKA ŚRODOWISKA (kosztowała pół godziny 2026-08-24, wróci):**
     działający `npm run dev` pisze do tego samego `.next`, co produkcyjny
     `npm run build` — smoke'i padają wtedy na braku nagłówka
     `x-content-type-options` i wygląda to jak regresja kodu, którego się nie
     tknęło. Przed smoke'ami: `fuser -k 3001/tcp`, `rm -rf .next`,
     `npm run build`. Smoke'i uruchamiać z `node --env-file=.env` — bez tego
     padają na braku `DB1_URL` (w CI zmienne daje workflow).
     **Odtworzenie podglądu kursów po `/clear` albo na nowej maszynie:**
     `mkdir -p /tmp/rig && cd /tmp/rig && npm init -y && npm i marked`, potem
     z repo `ZRZUTY_RIG=/tmp/rig node tools/podglad-kursow.mjs --wyjscie
     /tmp/podglad-kursow` i `cd /tmp/podglad-kursow && python3 -m http.server 3011`.
     Katalog wyjściowy MUSI być poza repo — narzędzie odmawia zapisu do środka.
     **═══ STAN NA 2026-08-25 (wieczór): PLUGIN 1 DOMKNIĘTY MERYTORYCZNIE ═══**
     Wszystkie 6 pozycji definicji ukończenia (PLAN.md §2.4) **zrobionych
     i ODHACZONYCH**, **B1–B7 zaliczone** (B7: właściciel, 2026-08-25),
     przegląd agent+krytyk wykonany (0.36.0), a **sześć decyzji po nim —
     wykonanych (0.37.0)**. Etapy 3 i 4 w KROK-3-KURSY.md domknięte.
     **SZEŚĆ DECYZJI WŁAŚCICIELA (2026-08-25) i co z nich powstało** — pełnia
     w [docs/plugin-1/PRZEGLAD-B7.md](docs/plugin-1/PRZEGLAD-B7.md) (tabela
     na początku sekcji znalezisk):
       (A) limiter naprawiony w prototypie **i** zapisany jako wymaganie do PHP
           — klucz pamięta SWOJE okno, eksmisja po ostatniej aktywności, klucz
           z czynną blokadą wypada ostatni; do WP: licznik w TABELI, nie cache'u;
       (B) brama odrzuca `KREATOR_TOKEN` przykładowy albo krótszy niż 24 znaki
           — odmowa dotyczy KONFIGURACJI, więc słaby token nie wpuszcza nikogo
           (tokeny w smoke'ach i CI wydłużone);
       (C) **`UNIQUE (course_id, kind)`, kolumna `position` sekcji ZNIKA**
           (migracja 008) — rozstrzygnięte przed schematem MySQL, jak wymagał
           przegląd; powtórzony rodzaj odrzuca kontrakt, nie baza;
       (D) zapis kursu **odmawia skasowania lekcji z treścią** bez
           `pozwol_skasowac_tresc` — panel pyta raz i wprost, z liczbą lekcji;
       (E) audyt zapisuje **tylko realne zmiany** (migracja 007) — `UPDATE`
           niezmieniający wiersza nie tworzy wpisu; niezmienność dziennika
           i pełny stan przed/po BEZ ZMIAN;
       (F) naprawione dwie pozycje bezpieczeństwa (prefetch przeglądarki
           dostaje CSP — udowodnione na żywym serwerze; `pre-commit` liczy
           `.env` plik po pliku i zna nasze sekrety), pięć pozostałych
           przeniesione do MIGRACJA-DO-WP.md (m.in. **przenoszenie lekcji
           między modułami**, którego builder Tutora wymaga).
     Przy okazji zamknięta POMIAREM otwarta pozycja z kroku 2: sufit 2 MB na
     ciało żądania (najdłuższa lekcja 21 790 znaków, treść jedzie osobną akcją).
     **ZOSTAJE JUŻ TYLKO:** merge `plugin-1-sklep-kursow` → `main`, przywrócenie
     gałęzi domyślnej na `main`, tag + release. (`main` stoi 320+ commitów
     w tyle, na 0.3.4 — celowo, wg PLAN.md §5.)
     **Potem: etap WordPressa** (decyzja właściciela 2026-08-25: po Pluginie 1
     idzie etap WP, NIE Plugin 2; zakres Pluginów 2/3 doprecyzowujemy pytaniami
     przed startem każdego z nich — decyzja 2026-08-21).
     **PUŁAPKA ŚRODOWISKA (kosztowała czas 2026-08-25):** kolejność smoke'ów MA
     ZNACZENIE — `smoke-seo` i `smoke-podglad` przebudowują `.next` na eksport
     statyczny (`build:podglad`), więc smoke uruchomiony PO nich zastaje build
     bez tras `*.serwer.*` i dostaje 404 z `NoFallbackError` na `/szkolenia/kreator`.
     Wygląda to jak regresja kodu, którego się nie tknęło. Właściwa kolejność
     stoi w `npm run smoke` — uruchamiać ją, nie własną listę.

     **PRZEGLĄD B7 + MIGRACJA DO WP ZROBIONE (2026-08-25, wersja 0.36.0).**
     Przegląd pary agent+krytyk (trzech recenzentów na rozłącznych obszarach,
     krytykiem agent główny — żadne znalezisko bez niezależnego potwierdzenia).
     **Naprawione pięć**: (1) CICHA UTRATA TREŚCI — ten sam `id` modułu dwa razy
     w zapisie kasował lekcje i zwracał `ok: true` (kontrakt odrzuca teraz
     duplikaty, 2 testy regresji); (2) katalog obiecywał „lekcje wideo" i „pliki
     do pobrania" przy kursie tekstowym z 0 materiałami na 73 lekcje —
     `straznik-obietnic` czytał tylko seed, teraz czyta 56 widoków; (3) miniatura
     OG pokazywała „41 41 lekcji"; (4) pula bazy bez `on("error")` ubijała CAŁY
     proces przy restarcie bazy; (5) `pre-push` chronił `main` zamiast gałęzi
     domyślnej. **Sześć zostawionych do decyzji** — PRZEGLAD-B7.md.
     **Migracja danych (krok 4.2) ZROBIONA I UDOWODNIONA**:
     `tools/eksport-wp.mjs` (czyta przez publiczne API modułu) +
     `wordpress/import-kursy.php` (idempotentny, klucz `_aai_zrodlo_uuid`, NIE
     slug) + [docs/plugin-1/MIGRACJA-DO-WP.md](docs/plugin-1/MIGRACJA-DO-WP.md)
     z mapowaniem pole po polu z ŻYWEJ instalacji. Dowód: import 1 → 87
     utworzonych, importy 2 i 3 → **0/0/87 bez zmian**, treść **73/73 zgodne co
     do znaku**. Struktura kurs→moduł→lekcja mapuje się 1:1 na
     `courses`→`topics`→`lesson`; **Tutor pokrywa 4 z naszych 12 sekcji, osiem
     zostaje w naszej wtyczce** — to mierzalne uzasadnienie podziału z ETAP-WP.
     Środowisko dowodowe: `podman start tutor-db tutor-wp`, `:8091`
     (WP 7.0.1 + Tutor 4.0.6 + Woo 11.0.1); WP-CLI doinstalowany do kontenera.
     **DWIE PUŁAPKI DO ZAPAMIĘTANIA:** (a) **WordPress zjada backslashe w meta**
     — `update_post_meta` puszcza wartość przez `wp_unslash`, więc bez
     `wp_slash` ginie każdy `\` (ścieżki `C:\Users`, sekwencje `\n` w kursie
     o Gicie); wykryte WYŁĄCZNIE testem idempotencji, bo pierwszy import
     wyglądał na udany; (b) **`LENGTH()` w MySQL liczy BAJTY, a `.length` w JS
     jednostki UTF-16** — porównanie sum pokazało „utratę" 47 tys. znaków,
     a po `CHAR_LENGTH()` została różnica 7 = siedem emoji spoza BMP.
     **Sumy porównuj ostrożnie, treść porównuj znak w znak.**

     **HIGIENA REPO ZROBIONA (2026-08-24, wersja 0.35.0, gałąź
     `chore/higiena-repo`)** — pełny audyt od A do Z na polecenie właściciela,
     z repo `automatic-ai` jako wzorcem praktyk (bez kopiowania).
     Zero pozycji CRITICAL: martwego kodu nie ma (6 podejrzanych plików
     używają testy i narzędzia), sekretów nie ma, `npm audit` 0, żadnych
     plików-śmieci ani duplikatów. Rozjazd siedział w LICZBACH: README
     mówiło „62 testy" (75) i audyt „na 71 sposobów" (90), miało martwą
     kotwicę `#szybki-start-po-sklonowaniu`, POSTEP.md wskazywał jako
     „następny krok" domknięcie D7 zrobione w v0.21.0, PR-D6/D7 kazały
     otwierać dawno zmergowane PR-y, a opis repo na GitHubie był sprzed
     rebrandingu. Wszystko naprawione; liczb pilnuje teraz rozszerzony
     `straznik-readme` (każda kotwica w prozie, nie tylko w spisie treści;
     liczba testów ze zliczenia `test()`/`it()`; liczba mutacji z wpisów
     w audycie).
     **DOSZŁO:** 29. strażnik **`straznik-podgladu-kursow`** (widok kupionego
     kursu: martwe odsyłacze, `width`/`height` na 148 obrazach, podwójna
     ucieczka w podpisach, klikalność spis↔lekcja, komplet wobec źródła;
     warunkowy — bez wygenerowanego podglądu mówi, że pominął),
     **`npm run check`** (jedna bramka = to, co przechodzi CI) i `npm run
     smoke`, `.gitattributes` / `.editorconfig` / `.nvmrc` / `engines`,
     szablon PR i `dependabot.yml` (sufity PR-ów, bo ich PR-y palą minuty
     CI — włączy się realnie po 1 września), pole **`wymaga`** w audycie
     mutacyjnym (mutacja strażnika warunkowego pomijana zamiast fałszywego
     „PRZEPUŚCIŁ"). CONTRIBUTING opisuje wreszcie PRAWDZIWĄ konwencję
     commitów (temat = SKUTEK; prefiksy dozwolone dla drobnicy).
     **LEKCJA Z DRUGIEGO PRZEBIEGU AUDYTU (nowa klasa):** mutacja przypięta
     do WARTOŚCI („93 sposoby") umiera po zmianie liczby, a groźniejsze —
     wzorzec `test\w*` w strażniku NIGDY nie pasował do formy „testów",
     bo `\w` w JS nie obejmuje polskich znaków; maskowała to mutacja
     używająca formy „testy" bez ogonka. **Mutacja, która maskuje ślepotę
     strażnika, jest groźniejsza niż jej brak.** W polskich wzorcach
     używać `\p{L}` z flagą `u`.
     **GAŁĘZIE POSPRZĄTANE (decyzja właściciela 2026-08-24, wcześniej niż
     krok 4 planu):** zdalnie zostały **4** (`plugin-1-sklep-kursow`, `main`,
     2 × `bak/*`) zamiast 33; lokalnie 7; **wszystkie 8 worktree usunięte**
     (`/home/krzysiek/Pod-strona-Szkolenia-*` już nie istnieją). Każda
     skasowana gałąź miała MERGED PR — sprawdzone `gh pr list` co do sztuki;
     dwie squash-merged (#12, #13) odtwarzalne z `refs/pull/N/head`, które
     GitHub trzyma po kasowaniu. Gałęzie `bak/*` zostają (WYTYCZNE §1).
     Rozmowy demonstracyjne z konta claude.ai **skasowane**
     (23 sztuki, 2026-08-23 — zgoda właściciela na „wszystkie pozostałości";
     wykaz brany z API po `created_at`, nie zgadywany z tytułów, bo lista
     w DOM-ie jest wirtualizowana i daty nie oddaje).
    **KALIBRACJA K2 ZROBIONA (2026-08-22): moduł 1 Kursu 2 gotowy** — 6 lekcji,
    64 418 znaków, w repo (gałąź `feat/tresc-k2-modul-1`) i w bazie, po pełnej
    bramce cytatów. **Cztery decyzje właściciela po kalibracji, WIĄŻĄCE dla
    modułów 2–6** (pełnia w KROK-3-KURSY.md, sekcja „DECYZJE WŁAŚCICIELA PO
    KALIBRACJI"): (1) **cięcie mocne zatwierdzone, program 32 lekcje**, 26 do
    napisania, moduł 7 znika, lekcja 1.6 zostaje; (2) **autorzy na SONNECIE 5**
    — zmiana decyzji z 2026-08-18 na dowodach (bramka nie odróżniła ramion:
    20 usterek na 89 wierszy u Opusa, 20 na 90 u Sonneta), pod warunkiem
    komendy mierzącej kontraktem w promptcie autora; weryfikatory bramki
    zostają na Opusie; (3) **dwa czaty równoległe**: A = moduły 2–3,
    B = moduły 4–6; (4) **koniec grupowania lekcji** — 1 autor = 1 lekcja
    (druga lekcja w sesji kosztowała +45–63%). **NASTĘPNY KROK: czat A wprowadza
    cięty program do bazy — operacja niebezpieczna, dyspozytor kasuje wiersze
    spoza wejścia, więc zapis bez `id` skasuje prozę modułu 1.**
     Aktualną listę daje `git worktree list`, nie ten plik. Reguła po incydencie
     z 2026-08-19: żaden czat nie przełącza gałęzi w cudzym katalogu —
     inaczej commit ląduje na obcej gałęzi, a `gh pr create` mówi
     mylące „No commits between". Baza i port 3001 zostają wspólne.
  4b. **DECYZJE WŁAŚCICIELA (2026-08-21) o tym, czego NIE planujemy teraz.**
     (a) Rzeczy spoza modułów — domena `automaticai.pl`, hosting, HTTPS/HSTS,
     poczta, RODO, 2FA, branch protection — **spinamy na bieżąco po
     modułach**, bez osobnego etapu w planie. (b) **Zakres Pluginów 2 i 3
     jest ZMIENNY**: opisy w PLAN.md §3–§4 powstały przed decyzją o Tutor
     LMS + WooCommerce, więc część zaplanowanego kodu (klienci, zamówienia,
     webhooki, tokeny pobrań, checkout, faktury, logowanie admina)
     prawdopodobnie przejmują gotowe wtyczki; naprawdę nasze zostaje
     `page_visits`. **Niczego z tych sekcji NIE KASUJEMY** — służą jako
     lista kontrolna „czego Woo/Tutor NIE robi". Zakres doprecyzujemy
     **pytaniami do właściciela przed startem każdego z tych modułów**,
     nie wcześniej.
  5. **Rozmowa o WordPressie — ODBYTA 2026-08-19.** Ustalenia,
     ceny LMS-ów i pytania otwarte:
     **[docs/ETAP-WP.md](docs/ETAP-WP.md)** — CZYTAĆ PRZED ETAPEM WP.
     Skrót: wszystko na WP (strona główna Automatic AI **jest już
     przekonwertowana — ale konwersję ma KOLEGA Z ZESPOŁU u siebie,
     my jej nie mamy**; do pracy wystarczyłby sam katalog motywu),
     `/szkolenia` wchodzi jako **WTYCZKA** dodająca
     pozycję w menu i dopasowująca się do strony; tą samą drogą później
     Pluginy 2 i 3. **Podział odpowiedzialności zamiast przepisywania
     wszystkiego**: nasza wtyczka = katalog, strony sprzedażowe, kreator,
     audyt; **Tutor LMS (darmowy core) + WooCommerce** = konta, koszyk,
     płatności, faktury, dostęp do materiału za logowaniem. Plan B:
     Publigo BOX 1797 zł netto (Publigo GO odpada — nie wpuszcza własnych
     wtyczek). Kolejność: **dokumentacja i research teraz, kod wtyczki
     dopiero po ocenie kursów (B7)**.
     **KATALOG `wordpress/` JEST W REPO STRONY GŁÓWNEJ (od 2026-08-20)** —
     kolega z zespołu wypchnął całą konwersję: `MatthewPlugins/automatic-ai`,
     gałąź `main`, katalog `wordpress/` (motyw + treść + skrypty, 6,1 MB).
     Zapis z 2026-08-19, że „tam go nie ma", był prawdziwy w chwili
     sprawdzania i jest już nieaktualny. **Motyw jest KLASYCZNY** (`header.php`
     /`footer.php`/`page.php`, zero `theme.json`), **generowany**
     (`skrypty/generuj-motyw.mjs` — „nie edytować ręcznie"), jego CSS to
     skompilowany **Tailwind** (same zmienne `--tw-*`, nie tokeny), a
     **nawigacja jest wpisana na sztywno, bez `wp_nav_menu()`** — pozycja
     „Szkolenia" wymaga zmiany w źródle Next.js i regeneracji motywu, nie
     kodu wtyczki. Motyw przejmuje też `<head>` (usuwa `rel_canonical`,
     własny tytuł i OG z post meta `_aai_*`) i kasuje `wpautop` — treść
     lekcji musi wchodzić jako gotowy HTML. Siedem faktów z konsekwencjami
     i zrzuty Tutora na TYM motywie: [docs/ETAP-WP.md](docs/ETAP-WP.md),
     sekcja „Motyw Automatic AI". **DECYZJA WŁAŚCICIELA (2026-08-21): po
     ukończeniu WSZYSTKICH wtyczek testujemy komplet także na lokalnym WP
     z warsztatu `wordpress/`** (`bash skrypty/start.sh` → `:8890`, motyw
     + treść 1:1; warsztat zakłada Dockera — u nas podman, sprawdzić
     `podman-compose` przed testem). Menu „Szkolenia": pięć dróg spisanych
     w ETAP-WP.md (rekomendacja: jednorazowy hak `do_action` w generatorze
     motywu), wybór drogi NIE zapadł — wejście do menu i tak dopiero przy
     finalnym wdrożeniu (decyzja 2026-08-17). **Repo strony głównej dalej
     TYLKO DO ODCZYTU** — motyw bierzemy sparse checkoutem, klonu nie
     dotykamy.
     Inne realne wzorce leżą w:
     `/home/krzysiek/mp-test-env` (nasze własne środowisko WP: wtyczki
     `mp-*` z pełną strukturą, WooCommerce, worktree, narzędzia i testy),
     `/home/krzysiek/zlecenia stron internetowych/czarodziejski-dworek/wordpress`
     (motyw + PACZKA-DLA-KLIENTA + blueprint) oraz
     `/home/krzysiek/kredyt-kompas-wp`.
     **DOKUMENTACJA WP POBRANA (2026-08-19):** 947 plików, 9,6 MB
     w `docs/dokumentacja-techniczna/wordpress/` — **poza gitem**, tak jak
     przy D7. W repo są `ZRODLA.md` (zakres + uzasadnienie cięć) i
     `tools/pobierz-dokumentacje-wp.mjs`. **Po `git clean` albo na nowej
     maszynie: najpierw uruchom skrypt, potem pisz kod wtyczki.** Kanały:
     REST API WordPressa (developer.wordpress.org i docs.themeum.com same
     stoją na WP), markdown wprost z monorepo WooCommerce, HTML dla manuala
     MySQL i Code Reference. **Zapamiętać dwie pułapki konwersji:** typy
     `wp-parser-*` w REST NIE mają pola `content` (Code Reference trzeba
     brać z HTML), a WordPress generuje spisy treści z NIEDOMKNIĘTYMI
     `<li>` — dopasowanie pary „otwarcie–zamknięcie" połyka wtedy resztę
     dokumentu i spłaszcza ją do jednej linii.
     `straznik-wagi-dokumentacji` czyta teraz MANIFEST ze skryptów
     pobierających (`KATALOG_DZIALU` + `KATALOGI_MASOWE`) zamiast trzymać
     własną listę nazw — nowy skrypt pobierający MUSI eksportować manifest,
     inaczej strażnik czerwieni się celowo.
     **TUTOR LMS SPRAWDZONY NA DOWODACH (2026-08-19)** — środowisko
     `/home/krzysiek/mp-test-env/wp-tutor/` (podman: `tutor-db` + `tutor-wp`,
     `http://localhost:8091`, admin/admin123), WP 7.0.1 + Tutor LMS 4.0.6
     + WooCommerce 11.0.1, cały Kurs 2 (50 lekcji, 1143 kB) w środku.
     Wyniki i czego NIE sprawdzono: sekcja „Tutor LMS na realnej treści"
     w [docs/ETAP-WP.md](docs/ETAP-WP.md). Skrót: długie lekcje unosi
     (59 kB → 6,6 ms renderu), struktura kurs→moduł→lekcja mapuje się 1:1
     na `courses`→`topics`→`lesson`, dostęp za logowaniem działa z pudełka,
     ale **Tutor NIE czyta `theme.json`** — ma własne 21 zmiennych
     `--tutor-*` i szablony do nadpisania w `tutor/templates/`.
     Potem: sprzątanie gałęzi, merge na `main`, koniec Pluginu 1.
- **DECYZJA WŁAŚCICIELA (2026-08-19): porządek gałęzi PO Pluginie 1.**
  Po ukończeniu CAŁEGO Pluginu 1 i rozmowie o przeniesieniu strony
  głównej na WP scalamy/sprzątamy gałęzie robocze, żeby repo nie było
  zaśmiecone. NIE robić tego wcześniej ani kawałkami. Gałęzie `bak/*`
  to migawki procedury napraw (WYTYCZNE §1) — o ich losie też decyduje
  właściciel przy tym sprzątaniu, domyślnie zostają.
  **OD TERAZ (higiena wzorem strony głównej, gdzie na zdalnym repo żyje
  wyłącznie `main` + tagi): każdy NOWY merge PR-a robimy z kasowaniem
  gałęzi (`gh pr merge --delete-branch`)** — stare gałęzie czekają na
  zaplanowane sprzątanie, ale nowych śmieci nie przybywa. Z przeglądu
  historii commitów strony głównej do naśladowania też: temat commita
  opisuje SKUTEK, nie czynność („prefetch przestaje wracać z 404"),
  a ciało commita naprawy dokumentacji ma sekcje „co było nieprawdą /
  czego nie zmieniłem, bo było prawdą" z pomiarami.
- **CI STOI OD 2026-08-18 — wyczerpany limit minut Actions.** Organizacja
  `MatthewPlugins` jest na planie **Free = 2000 minut/miesiąc** na
  repozytoria prywatne (wszystkie cztery są prywatne), a w sierpniu
  zużyła **2072 minuty**: `automatic-ai` 1753, `Pod-strona-Szkolenia`
  253, `matthewplugins.github.io` 63, `czarodziejski-dworek` 3. Objaw:
  każde zadanie pada **2 sekundy po starcie, z zerem kroków i bez
  logów** — łatwo pomylić z awarią kodu, więc sprawdzaj to NAJPIERW:
  `gh api "/organizations/MatthewPlugins/settings/billing/usage?year=RRRR&month=M"`
  (wystarczy zakres `admin:org`, który token już ma; stary endpoint
  `/settings/billing/actions` zwraca 410 — został przeniesiony).
  **Limit odnawia się 1 września 2026.** Decyzja właściciela: wersja
  0.21.0 (Dział 7) zmergowana i otagowana przy czerwonym CI, na dowodzie
  odtworzonym lokalnie — uzasadnienie w CHANGELOG przy 0.21.0. Po
  powrocie CI: potwierdzić **skan sekretów (gitleaks)**, bo jako jedyny
  nie ma lokalnego odpowiednika.
- **Platforma kursu — kierunek (2026-08-18):** materiał NIE będzie
  hostowany własnym kodem; do rozważenia gotowy LMS na WordPressie
  (Publigo — polskie płatności/faktury, albo Tutor LMS), ostyłowany
  naszym design systemem. Wybór konkretnego LMS-a: przy etapie WP,
  po D7. Scenariusze i materiały są przenośne — nie blokują decyzji.
- **GAŁĄŹ DOMYŚLNA repo to znowu `main`** (2026-08-25) — wróciła razem ze
  scaleniem ukończonego Pluginu 1 (PR #62, tag `v0.37.0` + release).
  **`main` jest od tej chwili źródłem prawdy o stanie projektu**; jego drzewo
  jest identyczne z `plugin-1-sklep-kursow` (sprawdzone `git diff`, nie
  założone). Gałąź modułu zostaje jako historia — o jej losie i o pozostałych
  gałęziach decyduje właściciel przy sprzątaniu.
  Zapis historyczny: od 2026-08-18 do 2026-08-25 domyślną była
  `plugin-1-sklep-kursow`, bo GitHub pokazuje README z gałęzi domyślnej,
  a `main` stał celowo na 0.3.4 (PLAN.md §5: nic nie wchodzi na `main` przed
  ukończeniem modułu).
  **PRZY MERGE'U DO `main` BYŁY TRZY KONFLIKTY** (README, WYTYCZNE,
  straznik-licencji) — wszystkie z commita zmiany licencji, który poszedł na
  `main` osobno (#16). Rozwiązane wersją gałęzi modułu, bo `main` nie niósł
  niczego, czego moduł by nie miał. Gdyby taka operacja się powtórzyła:
  weryfikować ARTEFAKT — `git diff --cached <gałąź>` musi być puste — a nie
  sam fakt, że merge się udał.
- Stan repo: PR #12 zmergowany do `plugin-1-sklep-kursow`, tag
  `v0.12.1` + release. Gałąź `feat/d6-kreator` wypchnięta (kroki 1–3)
  — zmergowana (PR #18), tag `v0.16.2` + release.
  `gh` zainstalowany (`~/.local/bin/gh`, 2.97.0) i ZALOGOWANY —
  agent otwiera PR-y sam. Gdy token wygaśnie: właściciel zapisuje nowy
  (zakresy `repo`, `workflow`, `read:org`) do `~/.gh-token`, agent robi
  `gh auth login --with-token` i kasuje plik. Czytanie
  `~/.git-credentials` jest zablokowane — nie próbować.
  LEKCJA z CI: strażnik czytający kontrakty z `modules/` wymaga
  `npm ci` w jobie strażników (lokalnie zielony, w CI czerwony) —
  pilnuje tego teraz `straznik-ci`.
  Migawki `.bak`: gałęzie `bak/*` (nie kasować). Testy chodzą na
  osobnej bazie `db1_kursy_test`.
- Pomiar layoutu w tej sesji: **puppeteer-core + SYSTEMOWY Firefox**
  (`/usr/bin/firefox`, protokół webDriverBiDi) w scratchpadzie —
  nie trzeba pobierać przeglądarki jak przy playwright. Ciastko
  ustawiać PO pierwszym `goto` na domenę.
- **Licencja: MIT** (decyzja właściciela 2026-08-17, wersja 0.13.0,
  PR #14/#15/#16) — zmiana z GPL-2.0 dla zgodności z repo strony
  głównej, do którego kod docelowo trafia. Zmienione na `main`
  I na gałęzi modułu (GitHub czyta licencję z gałęzi domyślnej).
  Fonty Geist mają WŁASNĄ licencję SIL OFL 1.1 —
  `public/fonts/LICENSE-Geist-OFL.txt` musi zostać przy plikach
  `.woff2`; pilnuje `straznik-licencji`.

<!-- BEGIN:nextjs-agent-rules -->

## ═══ ETAP WORDPRESS — START (decyzje właściciela 2026-08-25) ═══

**CZYTAĆ PRZED PRACĄ: [docs/ETAP-WP.md](docs/ETAP-WP.md), sekcja „Decyzje
właściciela (2026-08-25) — START etapu WP".** Skrót, żeby nowa sesja nie
wyprowadzała tego od nowa:

- **Strona Automatic AI = MOTYW. My robimy TRZY WTYCZKI**: Plugin 1 (sklep:
  katalog, strony sprzedażowe, kreator, audyt), Plugin 2 (płatności), Plugin 3
  (panel + monitoring). Wszystkie do jednej instalacji WP.
- **Hybryda ZOSTAJE**: Tutor LMS bierze konta i dostęp do materiału,
  WooCommerce koszyk, płatności i faktury. Nie przepisujemy tego sami.
- **„Własna BD" znaczy WŁASNE TABELE Z WŁASNYM PREFIKSEM w bazie WP**, nie
  osobne bazy MySQL. Jedna wtyczka nie dotyka cudzych tabel, ale transakcje,
  `JOIN` z `wp_users`/`wp_posts`, `dbDelta` i jeden backup działają.
- **Kod wtyczek w TYM repo, katalog `wordpress/`.** Prototyp Next.js zostaje
  jako specyfikacja wykonawcza i źródło treści.
- **Kolejność 1 → 2 → 3.** Po KAŻDEJ wtyczce test ręczny na lokalnym WP
  z motywem — wtyczka nie jest skończona, dopóki go nie przejdzie. Na końcu
  test całości (czy trzy wtyczki współpracują i czy projekt ma sens
  architektoniczny).
- **ŹRÓDŁO PRAWDY o kursie: NASZE TABELE**; do Tutora idzie KOPIA przy
  publikacji (jednokierunkowo, jak `wordpress/import-kursy.php`). Rozjazd tych
  dwóch kopii to główne ryzyko tej architektury — ma go pilnować strażnik.
- **Widok lekcji: NASZE szablony w miejsce Tutorowych** (wygląd z 0.34.0,
  wyjęty do `tools/podglad-kursow/` właśnie po to).
- **Menu**: na razie **podmiana HTML nagłówka w locie** (`ob_start`), bo motyw
  ma nawigację na sztywno, bez `wp_nav_menu()`. Droga krucha — regeneracja
  motywu może ją uciszyć — więc wchodzi RAZEM ZE STRAŻNIKIEM sprawdzającym,
  że pozycja naprawdę jest w wyjściowym HTML.
- **Adresy jak w prototypie**: `/szkolenia` → `/szkolenia/<slug>`.
- **E-BOOKI: NIGDY** (decyzja „na zawsze"). Produktem jest wyłącznie kurs
  tekstowy za logowaniem. To unieważnia zapis „PDF jako dodatek" z
  PRODUKCJA-MATERIALU-KROK-3.md.
- **Mail po zakupie: link „Ustaw hasło i wejdź", NIE hasło w treści.** Jedna
  wiadomość premium: powitanie, co kupił, mini instrukcja, jeden przycisk.
- **Środowisko POSTAWIONE (0.38.0): `wordpress/srodowisko/postaw.sh`** —
  jedna komenda stawia WP + MariaDB + motyw Automatic AI + treść strony 1:1
  + WooCommerce + Tutor LMS + nasze wtyczki (mount wprost z repo) na
  **`127.0.0.1:8892`** (admin / hasło w `wordpress/srodowisko/.env`).
  Idempotentny, kończy WERYFIKACJĄ ARTEFAKTU. Motyw mieszka POZA repo
  (`~/.cache/automatic-ai-warsztat`, sparse checkout) — bo strażnicy
  skanują DYSK, nie git, i cudze pliki w drzewie repo wywołały fałszywy
  alarm straznik-seo. Stare środowisko `tutor-wp` (`:8091`) zostaje jako
  nieodtwarzalny zabytek — nie budować na nim niczego nowego.

  **PLAN WTYCZKI `aai-sklep` (Plugin 1 WP), kroki W1–W6:**
  W1 fundament → W2 dane (import kursów z Postgresa) → W3 front
  (`/szkolenia` przez `template_include` + menu + strażnik) → W4 kreator
  w kokpicie → W5 synchronizacja do Tutora + nasze szablony lekcji →
  W6 test ręczny właściciela. **W1 ZROBIONY (0.38.0, PR #65):** szkielet
  wtyczki (autoloader bez Composera — wtyczka ma się wgrywać jako katalog
  plików), 5 tabel `wp_aai_sklep_*` przez dbDelta (treść lekcji
  `mediumtext`, sekcje `UNIQUE (course_id, kind)` bez `position`),
  `uninstall.php` domyślnie NIE kasuje danych, `straznik-wtyczki-wp`
  (30. strażnik, 4 mutacje). Audyt zmian pisze PHP, nie triggery —
  świadome odstępstwo od D2 (uprawnienie TRIGGER bywa na hostingu
  odebrane), nazwane wprost.
  **W2 ZROBIONY (0.39.0): oba kursy są w tabelach wtyczki.** Bramka
  zaliczona: import 1 → **111 utworzonych** (2 kursy + 24 sekcje +
  12 modułów + 73 lekcje), importy 2 i 3 → **0/0/111**, dziennik audytu
  **111 → 111**, treść **73/73 zgodne CO DO ZNAKU** (`npm run wp:sprawdz`
  porównuje OBIE bazy przez `sha256`). Ścieżka pełna Postgres → nasze
  tabele → Tutor: 73/73 na obu przeskokach.
  Powstało: **warstwa zapisu** `class-aai-sklep-zapis.php` (jedyne miejsce
  piszące do naszych tabel — port dyspozytora: transakcja na kurs, upsert
  po uuid, kasowanie od dołu, odmowa skasowania napisanej treści, dziennik
  tylko przy realnej zmianie), komendy `wp aai-sklep import|sprawdz|usun`,
  `npm run wp:eksport|wp:import|wp:sprawdz|smoke:wp`,
  `tools/sprawdz-import-wp.mjs`, `tools/smoke/smoke-wp-dane.mjs`
  (30 sprawdzeń trudnych ścieżek zapisu) i **ósmy niezmiennik
  `straznik-wtyczki-wp`** (zapis tylko przez warstwę zapisu). Audyt
  mutacyjny 107 → **109**.
  **`tools/eksport-wp.mjs` oddaje teraz WIERNY ZRZUT naszych tabel
  (format 2)** — nazwa pola = nazwa kolumny, zero wiedzy o Tutorze;
  słowniki Tutora przeniosły się do `wordpress/import-kursy.php` (przy W5
  pójdą do klasy wtyczki). Ścieżka do Tutora re-dowiedziona na `:8892`.
  **CZTERY RZECZY DO ZAPAMIĘTANIA Z W2:**
  (1) **pułapka `wp_slash` NIE dotyczy `$wpdb`** — zjada backslashe
  `update_post_meta()`, bo puszcza wartość przez `wp_unslash()`;
  `$wpdb->insert/update` nie, więc warstwa zapisu przeszła idempotencję
  bez poprawek (38 backslashy w 9 lekcjach dojechało co do znaku);
  (2) **`MySQL nie umie odroczyć UNIQUE`** (Postgres miał `DEFERRABLE`) —
  zamiana kolejności dwóch modułów łamie ograniczenie w stanie pośrednim,
  więc warstwa zapisu przestawia pozycje DWUFAZOWO (najpierw poniżej zera);
  (3) **sprawdzenie, które mówi „zero", bywa ślepe po OBU stronach** —
  pierwsze liczenie backslashy dało „0 i 0, zgodne", bo oba wyrażenia
  szukały DWÓCH backslashy zamiast jednego;
  (4) **martwy bind mount**: kontener trzyma INODE katalogu, więc po
  odtworzeniu katalogu na dysku (checkout, `git clean`) widzi pustkę,
  a WordPress przestaje znać wtyczkę — `postaw.sh` pyta o to KONTENER
  i podaje naprawę (`podman-compose down && ./postaw.sh`).
  **POPRAWKA 0.39.1 (zgłosił właściciel zrzutem):** strona kursu w Tutorze
  wyświetlała człowiekowi surowy JSON w „What Will You Learn?" i „Material
  Includes" — Tutor drukuje swoje cztery pola WPROST, dzieląc wartość po
  znakach nowej linii, a import wkładał tam nasze struktury zakodowane
  JSON-em (nic się przy tym nie zapalało). Teraz idą tam LINIE
  (`Tytuł — opis`), a WSZYSTKIE dwanaście sekcji jedzie obok do
  `_aai_sekcje` ze strukturą; spłaszczenie ma ASERCJĘ — sekcja o nieznanym
  kształcie zatrzymuje import zamiast drukować JSON na stronie.
  **POTWIERDZENIE WŁAŚCICIELA (2026-08-25, po obejrzeniu tamtej strony):
  klient NIE ma widzieć wyglądu Tutora — ma być ten, który ustaliliśmy.**
  To nie jest nowa decyzja, tylko potwierdzenie zapisu z ETAP-WP.md:
  katalog i strony sprzedażowe = NASZE szablony (W3), widok lekcji =
  NASZE szablony w miejsce Tutorowych, wygląd z 0.34.0 (W5). Tutorowa
  strona `/courses/<slug>/` **nie jest produktem** — to techniczna kopia
  dla LMS-a, który daje konta i dostęp za logowaniem.
  Zapis historyczny (przed 0.41.0): `/szkolenia` oddawało **404**, a
  `/szkolenia/<slug>` **301** na `/courses/<slug>/`, bo WordPress sam
  zgadywał slug. Od W3 obie trasy są nasze — patrz niżej.
  **RENDER STRON TUTORA NAPRAWIONY (0.40.0) — i przyczyna była głębsza,
  niż wyglądała.** Właściciel zgłosił zrzutem, że po 0.39.1 wygląd dalej
  jest zepsuty. **Motyw to Tailwind 4 i trzyma CAŁY swój CSS w WARSTWACH
  KASKADY** (`@layer theme, base, components, utilities`); arkusze Tutora
  i Woo są POZA warstwami, a **reguła bez warstwy bije każdą regułę
  w warstwie — niezależnie od specyficzności I od kolejności ładowania**.
  Na stronie z CSS-em Tutora każda jego reguła wygrywa z każdą klasą
  motywu, choć motyw ładuje się ostatni. To prawdziwy powód kolizji
  `.text-label` z 0.38.0; tamta naprawa (dequeue) działa tylko tam, gdzie
  wolno zdjąć cudzy arkusz, więc **na własnych stronach Tutora kolizja
  żyła dalej**. Do tego motyw ma nagłówek `fixed` (72 px) i **nie
  rezerwuje pod niego miejsca** — jego strony robią to same (`pt-28`,
  `md:pt-36`), a Tutor dawał `tutor-mt-16` = 16 px.
  Powstało: `assets/tutor-motyw.css` + `Aai_Sklep_Styl_Tutora` (arkusz
  wchodzi TYLKO na strony Tutora, klasa `body` `aai-tutor-na-motywie`),
  kolizję klas naprawia **`revert-layer`** (oddaje głos motywowi zamiast
  zgadywać jego wartości), a pilnuje **`smoke-wp-motyw`**
  (`npm run smoke:wp-motyw`) — mierzy ŻYWĄ stronę w przeglądarce:
  nachodzenie, kontrast każdego napisu, jasne plamy i stopkę motywu
  porównaną 1:1 ze stroną motywu. Od 0.41.0 mierzy CZTERY strony
  (nasze dwie + panel i rejestracja Tutora), 32 sprawdzenia. Rig (puppeteer-core
  + systemowy Firefox) w scratchpadzie przez `ZRZUTY_RIG` — **nigdy
  w package.json**.
  **DWIE RZECZY DLA W3, WPROST Z TEGO ZNALEZISKA:**
  (a) **nasz szablon MUSI sam dodać odstęp pod nagłówek** — motyw nie da
  go nikomu; (b) nasze strony są bezpieczne od kolizji **dopóki nie
  ładują CSS-u Tutora** (pilnuje `Aai_Sklep_Zasoby`) — gdyby kiedyś
  musiały, obowiązuje `revert-layer`.
  **DECYZJA WŁAŚCICIELA (2026-08-25): w W3 `/courses/<slug>/` → 301 na
  naszą `/szkolenia/<slug>`, a `/courses/` → `/szkolenia`.** Jeden adres
  kanoniczny, zero duplikatu w wyszukiwarce, klient nigdy nie trafia na
  stronę w cudzym wyglądzie. Adresy lekcji za logowaniem zostają Tutora
  (nasze szablony wchodzą tam w W5).
  **W3 ZROBIONY (0.41.0): front stoi.** `/szkolenia` i `/szkolenia/<slug>`
  renderuje wtyczka Z NASZYCH TABEL (reguły przepisywania `top` +
  `template_include`), pozycja „Szkolenia" jest w pasku I w menu mobilnym
  motywu, a `/courses/<slug>/` → **301** na `/szkolenia/<slug>/`
  i `/courses/` → `/szkolenia/` (decyzja właściciela 2026-08-25: jeden
  adres kanoniczny). Wygląd przepisany z rzeczy zaakceptowanych przy B5
  (`components/kurs/*`, katalog `/szkolenia`) — 12 rodzajów sekcji + hero,
  program, platforma, oferta, domknięcie. Nowe klasy:
  `Aai_Sklep_Odczyt` (port kanału JSON), `Aai_Sklep_Sekcje` (port
  `SCHEMATY_SEKCJI` + **jedno źródło kolejności sekcji**),
  `Aai_Sklep_Trasy`, `Aai_Sklep_Menu`, `Aai_Sklep_Seo`, `Aai_Sklep_Widok`;
  szablony w `wordpress/wtyczki/aai-sklep/szablony/`, wygląd
  w `assets/sklep.css` + `assets/sklep.js` (zero zależności).
  Dowody: strażnicy **31/31** (doszedł `straznik-frontu-wp`), audyt
  mutacyjny **118**, `smoke-wp-front` **78**, `smoke-wp-motyw` **32**,
  `smoke-wp-dane` **30**, `wp:sprawdz` 73/73, prototyp bez regresji.
  **SIEDEM RZECZY DO ZAPAMIĘTANIA Z W3** (pełnia: CHANGELOG 0.41.0
  i [ETAP-WP.md](docs/ETAP-WP.md), sekcja „Krok W3 zrobiony"):
  (1) motyw wpisuje `.page-enter` z `transform` i wypełnieniem `both`
  w HTML swoich stron — **każdy element `position: fixed` emitujemy POZA
  `<main>`** (BLAD-003/004 przyniesione przez cudzy arkusz), a jego
  `z-index` musi być niższy niż `z-40`, bo `volt.js` usypia `inert`-em
  tylko `body > main` i `body > footer`;
  (2) **strona kursu chowa nawigację motywu** i stawia własną pigułkę —
  obie belki są `fixed` u góry; tak samo działa prototyp
  (`NavbarPrzelacznik`) i taki wygląd właściciel przyjął przy B5;
  (3) **Tutor 4.0.7 przyniósł DRUGĄ rodzinę tokenów** (`--tutor-surface-*`,
  `--tutor-text-*`, `--tutor-button-*` i dalsze, 305 zmiennych), która
  steruje logowaniem i panelem; mapowanie z 0.40.0 tam nie sięgało —
  **wersję Tutora trzeba przypiąć albo świadomie pilnować**;
  (4) `cover_url` z prototypu wskazuje `/okladki/*.svg` z `public/`, czego
  na WP nie ma — okładki jadą teraz z wtyczką, a `Aai_Sklep_Widok::okladka()`
  woli **zaprojektowany zastępnik od zepsutego obrazka**;
  (5) adresy składamy `user_trailingslashit()`, bo instalacja ma
  `/%postname%/` i bez tego każdy nasz odnośnik był przekierowaniem;
  (6) **`opcache.revalidate_freq = 2`** w kontenerze: między zmianą pliku
  PHP a pomiarem trzeba odczekać ≥ 3 s, inaczej mierzysz POPRZEDNI stan
  kodu i wygląda to jak „strażnik przepuścił mutację";
  (7) pomiar kontrastu w `smoke-wp-motyw` czytał `color(srgb …)` — zapis,
  którym przeglądarka oddaje `color-mix()` — jak `rgb()`, więc raportował
  15:1 jako 1,11:1; **zapisu, którego pomiar nie umie rozebrać, nie
  zgadujemy**, tylko wywalamy smoke.
  **W3 ZAMKNIĘTY W REPO: PR #70 zmergowany do `main`, tag `v0.41.0`
  + release** (2026-08-25, gałąź `feat/w3-front-wtyczki` skasowana).
  Merge **decyzją właściciela na dowodach lokalnych** — CI padał 2 sekundy
  po starcie, z zerem kroków, czyli z wyczerpanych minut Actions (limit
  odnawia się 1 września), a nie z powodu kodu; sprawdzone `gh run view`.
  Po powrocie CI potwierdzić **skan sekretów (gitleaks)** — jako jedyny nie
  ma lokalnego odpowiednika. Artefakt zweryfikowany: `git diff` między
  `main` a szczytem gałęzi PUSTY (lekcja z 0.37.0 — sprawdzamy drzewo,
  nie sam fakt, że merge się udał).
  **ODPOWIEDŹ NA PYTANIE WŁAŚCICIELA O ZAKUP (2026-08-25):** `/kontakt`
  jest chwilowe, ale **własnej bramki płatności ani własnej kasy NIE
  PISZEMY** — koszyk, kasę, płatności i faktury bierze WooCommerce, a sama
  bramka (Tpay/PayU/P24/BLIK) to wtyczka do Woo. Plugin 2 jest SZWEM
  (produkt Woo ↔ kurs, zapis do Tutora po opłacie, mail „Ustaw hasło",
  przełączenie CTA i `PreOrder` → `InStock`). Pełnia razem z pytaniem
  otwartym o to, GDZIE MIESZKA CENA (nasza tabela czy produkt Woo — dwie
  kopie tej samej liczby): [docs/ETAP-WP.md](docs/ETAP-WP.md), sekcja
  „Plugin 2 — co to znaczy »płatności«". **Decyzja o cenie ma zapaść PRZED
  pisaniem Pluginu 2.**
  **ZNALEZIONE PRZY W3, NIENAPRAWIONE ŚWIADOMIE (poza zakresem kroku):**
  prototyp Next.js w dwóch miejscach obiecuje EBOOKI, choć właściciel
  zamknął ten temat „na zawsze" 2026-08-25 — `app/layout.tsx:12`
  i `app/szkolenia/widok.tsx:20` („Kursy i ebooki Automatic AI…"),
  a kreator ma do wyboru typ `ebook`
  (`components/kreator/FormularzKursu.tsx`). We wtyczce WP opis jest już
  poprawny. Do rozstrzygnięcia: czy prostować prototyp (jest
  specyfikacją wykonawczą, więc jego opisy trafią do kolejnych kroków),
  czy zostawić i pilnować tylko wtyczki. `straznik-obietnic` tego NIE
  łapie — czyta widoki kursów, nie metadane katalogu.
  **W4 ZROBIONY (0.42.0): właściciel może zmieniać treść w WordPressie.**
  Kreator z D6 mieszka w kokpicie (menu **Automatic AI**): lista kursów
  z licznikami (sekcje, program, **treść lekcji N/M**), edytor kursu
  z zakładkami Kurs / Sekcje / Program i JEDNYM zapisem, osobny edytor
  treści lekcji. Uprawnienie `manage_options`, każda wysyłka przez
  `admin-post.php` z nonce'em; do bazy pisze wyłącznie `Aai_Sklep_Zapis`.
  Instrukcja obsługi (oba kreatory — prototypu i WP):
  [KREATOR.md](docs/plugin-1/KREATOR.md).
  **DECYZJE WŁAŚCICIELA (2026-08-25):** wygląd **natywnego kokpitu
  z akcentem volt** (wariant „premium jak /szkolenia" odrzucony — reguły
  wp-admin są poza warstwami kaskady, a tego ekranu klient nie widzi);
  okładka **z biblioteki mediów** (prototyp odrzucił wgrywanie tylko
  dlatego, że nie miał gdzie trzymać plików).
  Powstało: `Aai_Sklep_Kontrakt` (port `KursWejscie`/`TrescLekcji`
  z prototypu co do liczby, błąd ze ŚCIEŻKĄ do pola), `Aai_Sklep_Pola`
  (jeden silnik opisu pól: odczyt pobłażliwy, zapis ścisły, render
  kontrolki, „czego brakuje"), `Aai_Sklep_Odczyt_Panelu` (wszystkie stany,
  sekcje SUROWE, **jedyne miejsce czytające `lessons.content`**),
  `Aai_Sklep_Panel` + `Panel_Akcje` + `Panel_Pola`, `assets/panel.*`,
  `wp aai-sklep opis --format=json`.
  **ETYKIETY PÓL WESZŁY DO KONTRAKTU** (`Aai_Sklep_Sekcje::SCHEMATY`) —
  panel rysuje się z tej samej tablicy, którą sprawdzana jest treść, więc
  rozjazd kontrakt↔panel jest NIEMOŻLIWY, a nie pilnowany (jak `KOLEJNOSC`).
  Dowody: strażnicy **32/32** (doszedł `straznik-kreatora-wp`), audyt
  mutacyjny **133**, `smoke-wp-kreator` **95**, `smoke-wp-front` 78,
  `smoke-wp-motyw` 32, `smoke-wp-dane` 30, `wp:sprawdz` 73/73,
  `npm run check` zielone.
  **PRZEGLĄD KROKU ZROBIONY (2026-08-25), dwa znaleziska naprawione —
  OBA POTWIERDZONE URUCHOMIENIOWO PRZED NAPRAWĄ:**
  (a) **brak klucza `sekcje`/`moduly` KASOWAŁ sekcje i program**, choć
  kontrakt i sam plik warstwy zapisu obiecywały „nie ruszaj" — czyli
  nieprawda w dokumentacji o zachowaniu kasującym dane. Panel zawsze
  wysyła oba klucze, więc z zewnątrz nie było tego widać; usterka czekała
  na pierwszego nowego klienta tej warstwy, czyli na **synchronizację do
  Tutora w W5**;
  (b) **zapis kursu ze starszej karty CICHO cofał publikację** — formularz
  niósł stan w polu ukrytym, a publikuje się z LISTY, więc poprawka jednego
  zdania wyrzucała kurs z katalogu z komunikatem „zapisano".
  **REGUŁA, KTÓRA Z TEGO WYSZŁA i obowiązuje w całej warstwie zapisu: BRAK
  KLUCZA ZNACZY „NIE RUSZAJ"** — dla treści lekcji, materiałów, sekcji,
  programu i stanu kursu. Pilnuje tego `straznik-kreatora-wp` (5 kluczy,
  po mutacji na każdy) i `smoke-wp-kreator`.
  Trzy rzeczy sprawdzone i BEZ ZARZUTU (nie szukać ich drugi raz): zamiana
  pozycji modułów przechodzi przez dwufazowe przestawianie MySQL-a, treść
  z `<script>`/`onerror` jest uciekana w panelu I na stronie sprzedażowej,
  odmowa skasowania treści liczy też lekcje z usuwanych modułów.
  **PIĘĆ RZECZY DO ZAPAMIĘTANIA Z W4** (pełnia: CHANGELOG 0.42.0
  i [ETAP-WP.md](docs/ETAP-WP.md), sekcja „Krok W4 zrobiony"):
  (1) **`add_submenu_page()` + `remove_submenu_page()` NIE robi ukrytej
  strony** — `get_admin_page_parent()` szuka rodzica w `$submenu`, więc po
  wycięciu wpisu `admin.php` oddaje **403 „Sorry, you are not allowed…"**;
  wygląda to jak błąd uprawnień, a jest błędem rejestracji. Ukrytą stronę
  robi `null` jako rodzic;
  (2) **`max_input_vars` (1000) ucina POST W MILCZENIU** — kurs z 41
  lekcjami wystawiłby setki pól, więc sekcje i program jadą jako JEDEN
  JSON (cała wysyłka: 17 pól), a pola ukryte startują wypełnione stanem
  z bazy, żeby zapis bez działającego skryptu był pusty w skutkach;
  (3) **treść lekcji NIE przez `sanitize_text_field`** (sklei Markdown
  w jedną linię), ale **MUSI przez `wp_unslash`** — inaczej `C:\Users`
  z kursu o Gicie zapisze się jako `C:\\Users`;
  (4) **brak klucza `content` musi znaczyć „nie ruszaj"** — do 0.41.0
  warstwa zapisu czytała `?? ''`, więc pierwszy zapis z panelu wyczyściłby
  prozę 73 lekcji i zameldował sukces;
  (5) **BLAD-017: `wp_http_validate_url()` to funkcja od SSRF**, nie od
  odnośników — rozwiązuje DNS, więc link do NIEKUPIONEJ jeszcze domeny
  `automaticai.pl` po cichu znikał ze strony sprzedażowej (treść w bazie,
  klient jej nie widzi, nic się nie zapala).
  **PUŁAPKA PRZY TESTACH NEGATYWNYCH:** `smoke-wp-kreator` zapisuje też
  PRAWDZIWE kursy (dowód, że panel ich nie rusza), więc test negatywny na
  warstwie zapisu **kasuje prozę wszystkich 73 lekcji**. Droga powrotna:
  `npm run wp:import` → `npm run wp:sprawdz`. Przed takim testem robić
  zrzut tabel.
  **W4 ZAMKNIĘTY W REPO (2026-08-25): PR #72 zmergowany do `main`, tag
  `v0.42.0` + release**, gałąź skasowana. Merge decyzją właściciela na
  dowodach lokalnych — CI padło 2 s po starcie z zerem kroków we WSZYSTKICH
  zadaniach, co potwierdza rozliczenie: **2118 minut Actions w sierpniu przy
  limicie 2000** (limit wraca 1 września), więc czerwony check NIE był o
  kodzie. Artefakt zweryfikowany: `git diff` między `main` a szczytem gałęzi
  PUSTY. Przegląd kroku został komentarzem pod PR-em #72. Po powrocie CI
  potwierdzić **skan sekretów (gitleaks)** — jako jedyny nie ma lokalnego
  odpowiednika.
  **W5, CZĘŚĆ 1 ZROBIONA (0.43.0): kopia kursu w Tutorze nadąża za kreatorem.**
  `Aai_Sklep_Tutor` kopiuje kurs → moduły → lekcje do wpisów Tutora **po
  KAŻDYM udanym zapisie** (nie tylko przy publikacji — inaczej poprawka
  w opublikowanym kursie zostawiałaby okno rozjazdu), jednokierunkowo,
  z dopasowaniem po `_aai_zrodlo_uuid`. Warstwa zapisu ogłasza zmianę akcją
  `aai_sklep_kurs_zmieniony` / `aai_sklep_kurs_usuniety`, więc nie wie nic
  o cudzej wtyczce. Doszły: `wp aai-sklep sync` (`npm run wp:sync`) i
  `wp aai-sklep sprawdz-tutora` (`npm run wp:tutor`, **kod wyjścia 1 przy
  rozjeździe**), **`straznik-tutora`** (33. strażnik, 12 mutacji) na KOD
  i **`smoke-wp-tutor`** (44 sprawdzenia) na DANE, plus ostrzeżenie
  w kokpicie, gdy kopia nie nadążyła. `wordpress/import-kursy.php`
  **wycofany** — jego mapy są w klasie wtyczki.
  **CZTERY RZECZY DO ZAPAMIĘTANIA:**
  (1) **kontrola od razu znalazła rozjazd na prawdziwych danych** —
  `_aai_sekcje` miało tę samą DŁUGOŚĆ i inny skrót (stary skrypt zapisywał
  sekcje w kolejności eksportu, my w kolejności `kind`); porównanie sum
  by tego nie pokazało;
  (2) **awaria kopii NIE cofa zapisu** (wyłączony Tutor nie może blokować
  edycji własnej treści) — ceną jest niewidzialność błędu, więc błąd jedzie
  do opcji i na ekran kreatora;
  (3) **synchronizacja nie kasuje wpisów spoza kreatora** — kontrola je
  pokazuje jako „obcy", ale kasowanie cudzej pracy to nie jest jej rola;
  (4) **sprzątanie testowych wpisów po PRZEDROSTKU uuid to pułapka** —
  uuid kursu miał inny układ zer niż moduły, więc został sierotą, a przebieg
  zameldował porządek; lista wypisana wprost nie kłamie.
  **W5, CZĘŚĆ 2 ZROBIONA (0.44.0): klient czyta lekcję w NASZYM wyglądzie.**
  `Aai_Sklep_Lekcja` przejmuje trasę lekcji (`template_include`), `Aai_Sklep_Proza`
  składa Markdown w PHP **bez ani jednej zależności** (zakres zmierzony na 73
  plikach prozy), a `Aai_Sklep_Zrzuty` trzyma 148 zrzutów w **bibliotece
  mediów** (klucz: lekcja + nazwa, bo nazwy się powtarzają). Wygląd przeniesiony
  z `tools/podglad-kursow/` — ten sam, który właściciel przyjął przy 0.34.0.
  Doszły: `straznik-lekcji-wp` (34. strażnik, 10 mutacji), `smoke-wp-lekcja`
  (32 sprawdzenia, przelot przez wszystkie 73 lekcje, najdłuższa odsłona
  194 ms), `npm run wp:zrzuty`, `npm run wp:proza`, `npm run smoke:wp-lekcja`.
  **DOWÓD RÓŻNICOWY zamiast deklaracji** (`tools/sprawdz-proze-php.mjs`): te
  same 73 lekcje przez PHP i przez `marked` z podglądu, tekst CO DO SŁOWA
  i struktura co do znacznika. Złapał 5 prawdziwych różnic w rendererze
  (reguła ograniczników GFM, kursywa zagnieżdżona, kursywa przez koniec
  wiersza, ogrodzenie kodu „na trzy" mimo czterech apostrofów, akapity
  w listach zwartych). **Dwie różnice zostają świadomie** — to usterki
  `marked` (próbuje emfazy PRZED kodem w linii), nazwane w kodzie dowodu.
  **PIĘĆ RZECZY DO ZAPAMIĘTANIA Z CZĘŚCI 2:**
  (1) **`<main>` dostaje skądś `display: flex`** — reguły nie ma ani u nas,
  ani w motywie (przeglądarka: ZERO reguł pasujących do `main.aai-lekcja`),
  a hero, treść i nawigacja ustawiały się OBOK SIEBIE w wąskich kolumnach;
  układ deklarujemy wprost;
  (2) **`wp_kses_post` zjada `<svg>`** — ikony bloków prozy znikały po cichu;
  stąd `Aai_Sklep_Widok::dozwolone_znaczniki()`;
  (3) **nagłówek motywu i nasza pigułka są oba `fixed`** — nagłówek ustępuje,
  tak samo jak na stronie kursu (W3);
  (4) **audyt mutacyjny złapał dziurę w MOIM strażniku**: wzorzec pytał o NAZWĘ
  stałej (`SLADY_SUROWEGO`), a mutacja skasowała jej definicję zostawiając
  wywołanie — wzorce mają celować w ZACHOWANIE (nawrót lekcji z 0.29.0);
  (5) **smoke fałszywie alarmował o CSS-ie Tutora**, bo wzorzec `tutor-front`
  trafiał w KLASĘ `body` (`tutor-frontend`) — pytaj o ZNACZNIKI, nie o napis.
  **KROK W5 ZAMKNIĘTY W REPO (2026-08-25).** PR #73 (część 1) i PR #74
  (część 2) zmergowane do `main`, gałęzie skasowane, **tagi `v0.43.0`
  i `v0.44.0` + release'y** zrobione. Merge decyzją właściciela na dowodach
  lokalnych — CI padał po 5 s z wyczerpanych minut Actions (sprawdzone
  `gh run list`), nie z powodu kodu; po powrocie CI (1 września) potwierdzić
  **gitleaks**. Artefakt weryfikowany po OBU merge'ach: `git diff` między
  `main` a szczytem gałęzi PUSTY (lekcja z 0.37.0).
  **Zapamiętać:** `gh pr merge --delete-branch` kasuje gałąź także LOKALNIE;
  PR części 2 otwarto DOPIERO po merge'u #73, bo stackowane PR-y już raz
  zamknęły się w tym repo nawzajem (0.25.0).
  **DOMKNIĘCIE W5 — ZROBIONE 2026-08-25 (poza merge'em):**
  1. ~~`npm run check` + trzy smoke'i WP~~ **ZROBIONE, z jednego przebiegu**:
     strażnicy **34/34**, testy **83/83**, lint + tsc + build, 7 smoke'ów
     prototypu, `smoke:wp` **30**, `smoke:wp-front` **78**, `smoke:wp-kreator`
     **95**;
  2. ~~piąta strona w `smoke-wp-motyw`~~ **ZROBIONE: 47 sprawdzeń, 5 stron**
     (`smoke-wp-motyw`). Widok lekcji jest jedyną stroną **zza logowania**,
     więc mierzymy go **NA KOŃCU** — po zalogowaniu każda kolejna odsłona
     niosłaby pasek narzędzi WP. **Pasek zdejmujemy dwiema regułami CSS
     i to jest DOWIEDZIONE różnicowo**: przy realnie wyłączonym pasku
     w profilu (`show_admin_bar_front=false`) układ jest identyczny CO DO
     PIKSELA. Adres lekcji bierzemy z instalacji (ta z największą liczbą
     zrzutów), nie z wpisanego sluga.
     **DWA ZNALEZISKA PRZY OKAZJI — obie usterki dowodów, nie kodu:**
     (a) **pomiar `/student-registration/` był ŚLEPY od 0.41.0** — zakres pytał
     o `.tutor-wrap`, a ta strona rysuje „Access Denied" w
     `.tutor-disabled-wrapper`, więc cztery jej sprawdzenia przechodziły PO
     PUSTCE; wykryła to dołożona asercja **„zakres trafił w ≥1 element"**,
     która stoi teraz na każdej stronie; (b) pomiar łapał pigułkę w losowej
     klatce animacji wjazdu (61 px kontra 59 px) — mierzymy po ustaniu ruchu,
     **z filtrem na animacje nieskończone**, bo samo `getAnimations()` nigdy
     się nie kończy przy dryfujących blobach tła i wiesza pomiar do timeoutu.
     Testy negatywne: jasne tło treści zapala plamy i kontrast TYLKO na lekcji,
     pomiar bez zdjęcia paska zapala samokontrolę, wyższa pigułka chowa cztery
     napisy hero.
  3. ~~`docs/plugin-1/KREATOR.md` o dojeżdżaniu zapisu do Tutora~~ **ZROBIONE**
     (sekcja „Co się dzieje po zapisie — kopia w Tutorze"; przy okazji
     sprostowana liczba sprawdzeń smoke'a kreatora: 92 → 95).
  4. ~~merge #73 i #74 → tagi → release'y~~ **ZROBIONE** (2026-08-25).
  5. **W6 — TEST RĘCZNY WŁAŚCICIELA — W TOKU** (ostatni krok `aai-sklep`).
     **SCENARIUSZ WIĄŻĄCY:
     [docs/plugin-1/W6-TEST-RECZNY.md](docs/plugin-1/W6-TEST-RECZNY.md)
     — CZYTAĆ PRZED PRACĄ.** Gałąź `feat/w6-test-reczny`, wersja 0.45.0,
     wypchnięta, **BEZ PR-a** — PR otwieramy DOPIERO po zaliczeniu W6, razem
     z poprawkami z testu; poprawki wchodzą na TĘ gałąź.
     Cztery ścieżki: gość → klient po zakupie → właściciel w kreatorze →
     czy nie zepsuliśmy motywu. Dokument ma też **tabelę rzeczy POZA
     zakresem** (zakup → `/kontakt`, cena `Free` w Tutorze, `PreOrder`,
     wyłączona rejestracja, maile, HTTPS/domena, zobowiązania handlowe),
     żeby nie zgłaszać jako błąd tego, co należy do Pluginu 2/3.
     **KONTO KLIENTA: `npm run wp:klient`** (`klient-test`, `subscriber`,
     zapisany na oba kursy, **pasek narzędzi zgaszony**; hasło w
     `wordpress/srodowisko/.env`, klucz `WP_KLIENT_HASLO`; `--usun` kasuje).
     Bez tego konta test odpowiada na złe pytanie — administrator widzi
     materiał z definicji, a pasek narzędzi przesuwa stronę o 32 px
     i zasłania pigułkę lekcji.
     **PUŁAPKA TUTORA:** `is_enrolled()` w TYM SAMYM żądaniu, w którym
     powstał zapis, oddaje `false` (zapisy siedzą w pamięci żądania) —
     dostęp weryfikować osobnym żądaniem.
  6. **Po zaliczeniu W6: Plugin 2 — płatności.** Przed startem rozstrzygnąć,
     **GDZIE MIESZKA CENA** (nasza tabela czy produkt WooCommerce) —
     [docs/ETAP-WP.md](docs/ETAP-WP.md), sekcja „Plugin 2".
  **ODTWORZENIE ŚRODOWISKA OD ZERA WYMAGA TRZECH KOMEND, NIE JEDNEJ:**
  `npm run wp:import` (kursy do naszych tabel) → `npm run wp:sync` (kopia
  w Tutorze) → `npm run wp:zrzuty` (148 obrazów do biblioteki mediów).
  Bez trzeciej lekcje pokazują znacznik „brak pliku" zamiast zrzutów.
  UWAGA: `straznik-kreatora-wp` zabrania szablonom frontu sięgać po treść
  lekcji — szablon lekcji NIE łamie tej reguły, bo dostaje z klasy GOTOWY
  HTML (`tresc_html`), a nie kolumnę `content`.

  **NAPRAWA RENDERU (0.38.0, zgłosił właściciel zrzutami):** strona główna
  była łamana przez `tutor-front.min.css` — globalna klasa `.text-label`
  (jasne tło, padding, inline-block) koliduje z klasą motywu o tej samej
  nazwie (rozmiar pisma; plakietki + marquee stopki). Skan 249 klas motywu
  przeciw arkuszom wtyczek: 1 kolizja groźna, 4 nieszkodliwe; konwersja
  kolegi ZDROWA. Naprawa: `Aai_Sklep_Zasoby` — zasoby Tutora/Woo nie
  wchodzą na strony, które ich nie używają. **Gwarancją są filtry
  `style_loader_src`/`script_loader_src`** (biegną przy DRUKOWANIU
  znacznika) — samo `wp_dequeue_*` w `wp_enqueue_scripts` 999 przepuszczało
  `wc-blocks-style` (dokładany później) i `sourcebuster-js` (własny uchwyt,
  drukowany w stopce). Zasada ostrożności: zdejmujemy tylko, gdy strona NA
  PEWNO nie należy do Tutora/Woo. `postaw.sh` weryfikuje OBIE strony
  medalu (strona motywu czysta ORAZ koszyk z arkuszami Woo).
  **Rig do zrzutów:** puppeteer-core + `/usr/bin/firefox` (webDriverBiDi)
  w scratchpadzie — wzorzec z D5, nigdy w package.json.

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
