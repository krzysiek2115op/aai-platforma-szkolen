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
     — serwuje build 0.25.0 (zweryfikowany co do chunka), preloady
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
     **Krok 3 ma WŁASNY worktree**: `/home/krzysiek/Pod-strona-Szkolenia-krok3`
     (gałąź `docs/krok-3-produkcja-materialu`). Reguła po incydencie
     z 2026-08-19: żaden czat nie przełącza gałęzi w cudzym katalogu —
     inaczej commit ląduje na obcej gałęzi, a `gh pr create` mówi
     mylące „No commits between". Baza i port 3001 zostają wspólne.
  5. **Rozmowa o WordPressie — ODBYTA 2026-08-19.** Ustalenia,
     ceny LMS-ów i pytania otwarte:
     **[docs/ETAP-WP.md](docs/ETAP-WP.md)** — CZYTAĆ PRZED ETAPEM WP.
     Skrót: wszystko na WP (strona główna Automatic AI **jest już
     przekonwertowana**), `/szkolenia` wchodzi jako **WTYCZKA** dodająca
     pozycję w menu i dopasowująca się do strony; tą samą drogą później
     Pluginy 2 i 3. **Podział odpowiedzialności zamiast przepisywania
     wszystkiego**: nasza wtyczka = katalog, strony sprzedażowe, kreator,
     audyt; **Tutor LMS (darmowy core) + WooCommerce** = konta, koszyk,
     płatności, faktury, dostęp do materiału za logowaniem. Plan B:
     Publigo BOX 1797 zł netto (Publigo GO odpada — nie wpuszcza własnych
     wtyczek). Kolejność: **dokumentacja i research teraz, kod wtyczki
     dopiero po ocenie kursów (B7)**.
     **KOREKTA ŚCIĄGI:** wcześniejszy zapis mówił o katalogu `wordpress/`
     „w repo strony głównej" — TAM GO NIE MA. Realne wzorce leżą w:
     `/home/krzysiek/mp-test-env` (nasze własne środowisko WP: wtyczki
     `mp-*` z pełną strukturą, WooCommerce, worktree, narzędzia i testy),
     `/home/krzysiek/zlecenia stron internetowych/czarodziejski-dworek/wordpress`
     (motyw + PACZKA-DLA-KLIENTA + blueprint) oraz
     `/home/krzysiek/kredyt-kompas-wp`.
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
- **GAŁĄŹ DOMYŚLNA repo to `plugin-1-sklep-kursow`** (zmiana 2026-08-18,
  decyzja właściciela). Powód: GitHub pokazuje na stronie repozytorium
  README z gałęzi domyślnej, a `main` stoi na wersji 0.3.4 — 34 commity
  w tyle, bez rebrandingu i bez podglądu. Reguła PLAN.md §5 zostaje
  nienaruszona (nic nie mergujemy na `main` przed ukończeniem Pluginu 1);
  po domknięciu modułu: merge na `main` i powrót gałęzi domyślnej.
  **`main` jest więc CELOWO nieaktualny — nie traktować go jako źródła
  prawdy o stanie projektu.**
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

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
