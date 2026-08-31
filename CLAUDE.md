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

## ═══ TRZY OSTATNIE KROKI: SEO → HIGIENA REPO → AUDYT KOŃCOWY ═══

**CZYTAĆ PRZED PRACĄ: [docs/PLAN-SEO-HIGIENA-AUDYT.md](docs/PLAN-SEO-HIGIENA-AUDYT.md)**
— stan zmierzony, zakres każdego kroku, różnica wobec wzoru `automatic-ai`,
pułapki poprzedniego przelotu SEO oraz **pomiary i pięć rozstrzygnięć
właściciela z 2026-08-31** (sekcja „KROK 1 — pomiary i rozstrzygnięcia").

**KROK 1 — SEO — ZROBIONY (wersja 0.60.0, gałąź `feat/seo-odswiezenie`).
PR NIEOTWARTY — czeka na zgodę właściciela.** Pełnia: CHANGELOG 0.60.0.
Skrót tego, czego nie wyprowadzać od nowa:
- **Reguła podziału (decyzja właściciela, wariant „b"):** wtyczka pilnuje
  TYLKO swoich tras; sprzątamy w mapie dokładnie te adresy, które istnieją
  Z NASZEGO POWODU (kopia w Tutorze, produkty Woo, strony transakcyjne).
  Blog, `/shop/`, `sample-page`, kategorie i tagi = lista wdrożeniowa.
- **Mapa strony nie zawierała ANI JEDNEJ naszej trasy** — `/szkolenia/`
  i strony sprzedażowe to reguły przepisywania, nie wpisy.
- **TRZECIA droga do loginu admina:** `wp-sitemap-users-1.xml` drukował
  `user_nicename` = login, mimo 404 na `/author/<login>/` od 0.59.0.
  Zamknięte w **mu-pluginie obwodu** (to enumeracja kont, nie SEO).
- **Rdzeń robi miękkie 404:** przy nieznanym dostawcy `render_sitemaps()`
  wykonuje gołe `return`, bez `status_header( 404 )` — zdjęta mapa oddawała
  stronę błędu ze statusem 200. Domknięte regułą celującą w SKUTEK.
- **`courses.updated_at` NIE znaczy „zmiana treści"** (trigger bez
  porównania wartości, tylko na `courses`; proza lekcji leży w `lessons`),
  więc mapa dalej **nie podaje `lastModified`** — decyzja właściciela.
- **`blog_public` bramkuje CAŁĄ sitemapę** — pomiar SEO przy wyłączonej
  widoczności odpowiada na inne pytanie. `smoke-wp-seo` sam stawia scenę
  i przywraca **wartość ZASTANĄ**, nie „domyślną".
- **Manifest:** Next aplikuje `basePath` do znacznika `<link rel=manifest>`,
  ale **NIE do treści manifestu** — ścieżki idą przez `zasob()`.
  Rastry ikon robi `npm run ikony` **przeglądarką z riga**, nie `sharp`.
- **Pomiar (PSI, protokół bez zmian):** desktop 100/100/100/100 na obu
  stronach; mobile katalog 97, **strona kursu 94 (było 96), TBT 251 ms
  (było 0)**. Przyczyna zmierzona: urosła TREŚĆ stron sprzedażowych
  (0.33.0), a Next serializuje ją drugi raz jako ładunek hydratacji.
  **Nie przenosi się na produkt**: ta sama strona to w prototypie 270 kB
  ze 112 kB ładunku w 65 `<script>`, a we wtyczce WP 125 kB przy ZERZE
  ładunku i 18 znacznikach. Tabela w README mówi to wprost.
- Dowody: strażnicy **38/38**, audyt mutacyjny **328**, testy **83/83**,
  `npm run check` kod 0, **15 bramek WP zielonych** (nowa `smoke:wp-seo`
  169). Dane monitoringu właściciela z T4 nietknięte.
- **ZOSTAJE DO DECYZJI WŁAŚCICIELA:** (a) opis „Kursy i **ebooki**
  Automatic AI" w `app/layout.tsx:12` i `app/szkolenia/widok.tsx:20` —
  ebooki zamknięte „na zawsze" 2026-08-25, a manifest ma już opis
  prawdziwy, więc w prototypie stoją DWIE wersje prawdy; (b) czy w ogóle
  optymalizować mobilne TBT prototypu (rekomendacja: nie — koszt nie
  dotyczy produktu).

**NASTĘPNY KROK: PR gałęzi `feat/seo-odswiezenie` → tag `v0.60.0` →
release, potem KROK 2 (higiena repo).** Obowiązuje reguła z 2026-08-28:
plan + pytania + zgoda przed pracą.
**Zaparkowane:** gałąź `feat/zamrozenie-ceny-w-zamowieniu` (worktree obok)
czeka na scalenie PO SEO — stoi na `09d6c79`, czyli przed 0.59.0, więc
przed jej PR-em wciągnąć `main` i zweryfikować ARTEFAKT.

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
  5. **W6 — TEST RĘCZNY WŁAŚCICIELA — ZALICZONY (2026-08-25/26, wersja
     0.45.0). WTYCZKA `aai-sklep` JEST SKOŃCZONA.** PR #75 zmergowany do
     `main`, tag `v0.45.0` + release; artefakt zweryfikowany (`git diff`
     między `main` a szczytem gałęzi PUSTY). CI potwierdzony jako
     niezwiązany z kodem: **2118 minut Actions w sierpniu przy limicie
     2000**, wszystkie zadania padają w 2 s z zerem kroków — merge decyzją
     właściciela na dowodach lokalnych; po powrocie CI (1 września)
     potwierdzić **gitleaks**.
     Wyniki, lekcje i przepis na test kolejnych wtyczek:
     [docs/ETAP-WP.md](docs/ETAP-WP.md), sekcja „Krok W6 ZALICZONY" oraz
     [docs/plugin-1/W6-TEST-RECZNY.md](docs/plugin-1/W6-TEST-RECZNY.md).
     **CZTERY BŁĘDY Z REJESTRU (BLAD-019…022) I ICH LEKCJE — nie powtarzać:**
     (1) **BLAD-019**: zwykły zapis w kreatorze nadawał każdemu modułowi
     tytuł jego OSTATNIEJ lekcji. Kontrolki panelu nie mają atrybutu `name`
     (`max_input_vars` ucina POST w milczeniu przy 41 lekcjach), więc
     wysyłkę składa `assets/panel.js`, a jego zakres zbierania pól nie
     uznawał wiersza lekcji za granicę. **CAŁA warstwa JS kreatora była do
     0.45.0 poza zasięgiem pomiaru** — `smoke-wp-kreator` wysyła gotowy JSON
     POST-em i nie uruchamia przeglądarki. Stąd **`npm run smoke:wp-panel`**
     (54 sprawdzenia, mierzy kolektor w prawdziwej przeglądarce; kluczowa
     asercja: **zapis, przy którym niczego nie dotknięto, odpowiada
     `bez_zmian`**). Granice zakresu są jedną listą `GRANICE_ZAKRESU`
     obejmującą KAŻDY rekord panelu; pilnuje `straznik-kreatora-wp` (10).
     (2) **BLAD-020**: zapis bez zmian meldował „Kurs zapisany" i puchł
     dziennik, bo `json()` obiecywał „stały kształt", a `wp_json_encode()`
     zachowuje kolejność kluczy — import układał je inaczej niż panel.
     **Gdy porównanie »czy się zmieniło« działa na łańcuchu, kolejność
     kluczy MUSI być kanoniczna** (`uporzadkuj()`, mapy sortowane, LISTY
     nietknięte — ich kolejność JEST treścią); pilnuje
     `straznik-wtyczki-wp` (9).
     (3) **BLAD-021**: kurs o slugu `moje` wchodził do katalogu z ceną, ale
     jego strona sprzedażowa nie istniała — reguła naszej podstrony jest
     sprawdzana przed regułą slugu. **KAŻDA nowa podstrona sklepu (koszyk,
     kasa, podziękowanie w Pluginie 2) MUSI wejść do
     `Aai_Sklep_Trasy::PODSTRONY`** — jedno źródło reguł, widoków i slugów
     zakazanych — a nie dostać własnego `add_rewrite_rule`; pilnuje
     `straznik-frontu-wp` (9).
     (4) **BLAD-022**: cały blok „złe wejście" w naszym smoke'u był ŚLEPY —
     sześć sprawdzeń przechodziło z jednego wspólnego powodu (żądanie nie
     niosło `sekcje`/`moduly`, a warstwa akcji zamieniała „nie przysłano" na
     `null`). **Wysyłka w teście złego wejścia musi być POZA jednym błędem
     poprawna**, a „nie przysłano" nie wolno tłumaczyć na `null` — to zrywa
     łańcuch „brak klucza znaczy nie ruszaj" (BLAD-018).
     **DWIE PUŁAPKI POMIARU:** test negatywny puszczać na ZDROWYCH danych
     (na zepsutych tytuł modułu równa się tytułowi ostatniej lekcji i pomiar
     przechodzi fałszywie); patrzeć nie tylko CZY coś padło, ale ILE i CO —
     „1 z 96" mówi, że sprawdzenie trafia w swój przypadek i tylko w niego.
     **Stan dowodów na koniec W6:** `npm run check` zielony (strażnicy
     **34/34**, testy **83/83**, lint, tsc, build, 7 smoke'ów prototypu),
     audyt mutacyjny **161**, smoke'i WP: dane 30 · front 84 · tutor 44 ·
     lekcja 35 · kreator 96 · panel 54 · motyw 65; dane 73/73 co do znaku,
     kopia w Tutorze 0 różnic.
     **ŚRODOWISKO ZOSTAJE POSTAWIONE**: `:8892`, konto `klient-test`
     (przyda się do testów zakupu w Pluginie 2 — NIE kasować), dane wgrane.
     **HISTORIA PRZEBIEGÓW (dla kontekstu, nie do działania):**
     **TRZY ZGŁOSZENIA WŁAŚCICIELA Z PIERWSZEGO PRZEBIEGU (2026-08-25) —
     dwa naprawione, jedno okazało się decyzją:**
     (a) **klient nie miał JAK trafić do kupionego kursu** — logowanie wyrzuca
     na `/my-account/`, a jedyną listą był panel Tutora w jego wyglądzie
     (własny pasek boczny, okno powitalne ze zrzutem cudzego kursu
     fotografii). Powstała **nasza `/szkolenia/moje/`** (`Aai_Sklep_Moje`
     + `szablony/moje.php`): kafelki z paskiem postępu i przyciskiem do
     pierwszej NIEODHACZONEJ lekcji; `/dashboard/` i `/dashboard/courses/`
     → **302** na nas; pozycja „Moje kursy" w obu nawigacjach motywu, ale
     **tylko dla zalogowanego z kursem**; strona ma `noindex`, bo jej treść
     zależy od konta. **Postępu NIE liczymy sami** — pyta o niego Tutor
     (`is_completed_lesson`), inaczej mielibyśmy drugą kopię tej samej prawdy;
     (b) **strony konta WooCommerce renderowały się bez stylów** — dostawały
     arkusze Woo, ale nie naszą warstwę integracji (obsługiwała tylko Tutora),
     więc menu konta lądowało w lewym górnym rogu pod nagłówkiem. Ta sama
     klasa co 0.38.0/0.40.0. Powstał `Aai_Sklep_Styl_Woo` + `woo-motyw.css`,
     pytający `Aai_Sklep_Zasoby::strona_woo()` — obejmie też koszyk i kasę
     z Pluginu 2;
     (c) **cztery lekcje otwierają się bez logowania** — NIE wyciek: mają
     `preview = 1` w naszych tabelach (pierwsza lekcja modułu 1 i jednego
     dalszego modułu w każdym kursie), bramka działa zgodnie z danymi.
     **DECYZJA WŁAŚCICIELA 2026-08-25: zostają wszystkie cztery.** Zapisane,
     żeby następne zgłoszenie nie ruszało śledztwa od nowa.
     **DRUGI PRZEBIEG (2026-08-25) — dwa dalsze zgłoszenia, oba naprawione:**
     (d) **strzałka „wróć" w lekcji odsyłała KUPUJĄCEGO na cennik** — teraz
     ma dwie postacie: zapisany na kurs wraca do „Moich kursów", niezapisany
     (gość na zapowiedzi, admin) na stronę sprzedażową. Pytamy Tutora o ZAPIS,
     nie o `dostep` — `dostep` jest prawdziwy także dla zapowiedzi i admina;
     (e) **menu konta WooCommerce nie prowadziło do kursów** — „Moje kursy"
     są tam PIERWSZĄ pozycją (filtr `woocommerce_get_endpoint_url` podmienia
     adres, bo nasza strona nie jest endpointem konta).
     **DOWODY PO NAPRAWACH:** strażnicy 34/34, `smoke-wp-motyw` **65**
     (SIEDEM stron — doszły `/my-account/` i `/szkolenia/moje/`, a
     `/dashboard/` ustąpił `/dashboard/retrieve-password/`),
     `smoke-wp-front` **83** (oba przekierowania panelu + brak wycieku listy
     kursów gościowi), `smoke-wp-lekcja` **34** (obie postacie strzałki
     „wróć"; stan kupującego robiony POMIAREM — zapis admina na kurs
     i cofnięcie go), `smoke-wp-kreator` 95,
     `smoke-wp-dane` 30. Każde nowe sprawdzenie ma test negatywny.
     **PRZEGLĄD KODU (2026-08-25) — cztery znaleziska, wszystkie naprawione:**
     menu podświetlało DWIE pozycje naraz (klon dziedziczył `aria-current`
     po pozycji wstawionej przed chwilą); menu kosztowało **90 zapytań na
     odsłonę** (`kursy()` = 45 zapytań x 2 kotwice, teraz `ma_kursy()`
     = 3 zapytania + pamięć na czas żądania); widok prywatny nie wołał
     `nocache_headers()`; `wp:klient` mógł zostawić konto z nieznanym hasłem.
     **NOWA KLASA ŚLEPOTY:** sprawdzenie nagłówków `Cache-Control` w smoke'u
     nie pilnuje NASZEJ linii — nagłówki dokłada też coś innego w stosie;
     naszej gwarancji pilnuje `straznik-frontu-wp`, a jego pierwszy wzorzec
     trafiał w DRUGIE `nocache_headers()` w tym samym pliku (gałąź 404).
     Audyt mutacyjny **156** (było 155).
     **PUŁAPKA POMIARU:** kafelki „Moich kursów" mają `.aai-reveal`
     (opacity 0 do czasu IntersectionObservera) — zrzut zrobiony zaraz po
     `load` pokazuje PUSTĄ siatkę i wygląda jak błąd danych. Czekać ~1,5 s.
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
     **PRZEBIEG TRZECI (2026-08-25/26): ścieżki C i D ZALICZONE** —
     właściciel: „jest wszystko okej… u mnie wygląda dobrze". Ścieżka C
     wyciągnęła BLAD-019 z jego pytania „czy zmiana w kreatorze idzie do
     bazy" (szła — cena `29999` groszy — ale ten sam zapis przemianował
     moduły). Po zaliczeniu, na jego prośbę, zrobiłem własny przegląd
     gałęzi: stąd BLAD-021 i BLAD-022.
     **SPRAWDZONE I BEZ ZARZUTU przy tym przeglądzie — nie szukać drugi
     raz:** warstwa Tutora nie potrzebuje porządkowania kluczy (pisze ją
     jeden autor), liczniki „Moich kursów" mają poprawną polszczyznę,
     wszystkie wpisy w Tutorze są `publish` (żadna lekcja-szkic nie wchodzi
     do postępu), widok prywatny ma `nocache_headers()`, szablony frontu
     konsekwentnie używają polskich napisów wprost (konwencja, nie
     niedopatrzenie).

  6. **NASTĘPNY KROK CAŁEGO PROJEKTU: PLUGIN 2 — PŁATNOŚCI.**
     **DECYZJA WŁAŚCICIELA (2026-08-26) — GDZIE MIESZKA CENA: nasza tabela
     `courses.price_grosze` jest ŹRÓDŁEM, do produktu WooCommerce jedzie
     CENA REGULARNA, jednokierunkowo, a pola ceny promocyjnej NIE DOTYKAMY
     NIGDY.** Promocje, kupony, podatki i waluta zostają po stronie Woo —
     tam mają swoje mechanizmy. Kreator zostaje jedynym miejscem, gdzie
     właściciel ustawia cenę katalogową. Konsekwencje wykonawcze: kopia
     ceny jedzie po KAŻDYM udanym zapisie (akcja `aai_sklep_kurs_zmieniony`,
     jak kopia do Tutora), rozjazd MUSI mieć własną kontrolę z kodem wyjścia
     1 (wzór: `wp aai-sklep sprawdz-tutora`), a **cena regularna zmieniona
     ręcznie w Woo wróci do naszej przy następnym zapisie kursu** — to
     świadomy koszt, do napisania wprost przy polu ceny w kreatorze.
     Pełnia: [docs/ETAP-WP.md](docs/ETAP-WP.md), sekcja „DECYZJA WŁAŚCICIELA
     (2026-08-26): gdzie mieszka CENA". Zakres Pluginu 2 doprecyzowujemy
     **pytaniami do właściciela przed startem** (decyzja 2026-08-21) —
     Plugin 2 jest SZWEM do WooCommerce (produkt Woo ↔ kurs, zapis do
     Tutora po opłacie, mail „Ustaw hasło", przełączenie CTA z `/kontakt`
     i `PreOrder` → `InStock`), a NIE własną kasą ani bramką płatności.
     **Nowa podstrona sklepu (koszyk, kasa, podziękowanie) wchodzi przez
     `Aai_Sklep_Trasy::PODSTRONY`** — patrz BLAD-021 wyżej.

  7. **PLUGIN 2 — STAN NA 2026-08-26: KROK P0 (SCHEMAT) W POŁOWIE.**
     Właściciel narzucił **ZASADĘ 0: najpierw diagram/schemat, potem jego
     krytyka, dopiero po akceptacji kod** — i **AGENTA KRYTYKA przy każdym
     istotnym etapie**, plus regułę „jeden AJAX = jedna operacja, żadnych
     kombajnów". Obowiązują te same rygory co w Pluginie 1.
     **Zakres doprecyzowany OŚMIOMA DECYZJAMI właściciela (2026-08-26)** —
     tabela w [docs/ETAP-WP.md](docs/ETAP-WP.md), sekcja „DECYZJE WŁAŚCICIELA
     (2026-08-26): zakres Pluginu 2 doprecyzowany". Skrót: szew + kasa na
     metodzie testowej (bramka i faktury osobno), przycisk prosto do kasy,
     konto powstaje przy zakupie, strona pokazuje cenę EFEKTYWNĄ z Woo, dostęp
     od razu po opłacie a zwrot go odbiera, adresy Woo na polskie, dwa maile
     (potwierdzenie Woo + nasz z linkiem do hasła), regulamin ODŁOŻONY do
     prawdziwej bramki (bramka: przed pierwszym klientem).
     **DECYZJA (2026-08-26): NIE robimy własnej bazy klientów/zamówień/płatności
     — WooCommerce już to ma.** Nasze tabele `wp_aai_platnosci_*` trzymają
     wyłącznie `powiazania` (kurs ↔ produkt) i `dostawy` (czy klient DOSTAŁ
     dostęp i mail — czego nie wie ani Woo, ani Tutor). Uzasadnienie zapisane
     dla czytających repo: [docs/PLAN.md](docs/PLAN.md) §3 blok
     „KOREKTA 2026-08-26" + ETAP-WP.md.
     **USTALENIE, KTÓRE ZMIENIŁO ZAKRES:** Tutor 4.0.7 w DARMOWYM rdzeniu ma
     pełną integrację z WooCommerce (`classes/WooCommerce.php`, 1222 linie) —
     zapis na kurs po opłacie i odebranie dostępu przy zwrocie **są gotowe**,
     my je WŁĄCZAMY ustawieniem i pilnujemy asercją, zamiast pisać.
     **Gałąź `docs/schemat-pluginu-2`, wypchnięta.**
     Schemat: [docs/plugin-2/DIAGRAM.md](docs/plugin-2/DIAGRAM.md) (4 diagramy
     mermaid, renderują się na GitHubie; sprawdzone RENDEREM w mermaid 11.17.2,
     z testem negatywnym — UWAGA: puppeteer-core nie odpala Firefoksa, gdy
     działa okno użytkownika; rig z tej sesji omija to własnym serwerem HTTP
     i surowym `firefox --headless --no-remote` na świeżym profilu, a stary
     profil z lockiem WIESZA przeglądarkę — kasować przed startem).
     **PRZEPISANIE SCHEMATU ZROBIONE (2026-08-28, commity `5ebb877` +
     przebudowa wizualna):** wszystkie 54 znaleziska wprowadzone, dwie sekcje
     językowe na miejscu (sekcja 1: język pluginów wg WYTYCZNE §8; sekcja 2:
     język WordPressa), baza/wystrzał/kanał JSON nazwane wprost w diagramach,
     BAZA P2 = `powiazania` + `dostawy` (UNIQUE w `dostawy` zastępuje
     `add_option` z B6 — ta sama atomowość, własny nośnik). Diagramy
     PRZEBUDOWANE wizualnie wg wzoru Pluginu 1 (polecenie właściciela
     2026-08-28: Plugin 2 = źródło prawdy merytorycznej, diagram Pluginu 1 =
     wzór stylu; krótkie etykiety 2–4 linie, walec na bazę, `==>` na wystrzał,
     zapis górą / odczyt dołem).
     **DECYZJA WŁAŚCICIELA (2026-08-28): AJAX W KOKPICIE ODPADA** — „Plugin 2
     nie wprowadza żadnego własnego AJAX-a"; wystrzałem jest `admin-post.php`
     Pluginu 1 (akcja „Zapisz kurs") + kanały zakupowe Woo; naprawa zbiorcza
     komendą `wp aai-platnosci sync` (DIAGRAM.md sekcja 11).
     **SCHEMAT ZAAKCEPTOWANY (właściciel, 2026-08-28) — P0 ZALICZONY**
     (po przebudowie wizualnej diagramów). **NASTĘPNY KROK: P1 — fundament
     wtyczki `aai-platnosci`** (DIAGRAM.md sekcja 16): katalog wtyczki wzorem
     W1, dwie tabele dbDelta, klasa zapisu, strażnik + mutacje, uninstall.php
     nie kasujący niczego, komunikat zamiast białego ekranu przy wyłączonym
     Woo/Tutorze.
     **P1 ZROBIONY (2026-08-28, wersja 0.46.0, gałąź
     `feat/p1-fundament-platnosci`): fundament wtyczki `aai-platnosci` stoi
     i jest AKTYWNY na `:8892`.** Trzy decyzje właściciela przed startem
     (wszystkie rekomendacje przyjęte): aktywacja na `:8892` od razu,
     `wp aai-platnosci sprawdz` w wersji minimalnej od P1 (tylko rośnie),
     katalog `agenci/przeglad-pr/` z WYTYCZNE §4 założony przy P1.
     Powstało: tabele `wp_aai_platnosci_powiazania` + `_dostawy` (dbDelta;
     UNIQUE w dostawy = atomowa idempotencja maili), `Aai_Platnosci_Zapis`
     (jedyny pisarz; deaktywacja → produkty draft, L4), `uninstall.php`
     nie kasujący niczego, komunikat zamiast białego ekranu bez Woo/Tutora,
     `straznik-platnosci-wp` (35., 8 mutacji), `npm run smoke:wp-platnosci`
     (23 sprawdzenia), montaż w compose + aktywacja w postaw.sh.
     **SMOKE ZŁAPAŁ BŁĄD KLASY B4 PRZED PR-em:** `INSERT … ON DUPLICATE KEY
     UPDATE` reaguje na konflikt KAŻDEGO klucza unikalnego — powiązanie
     zajętego produktu z drugim kursem po cichu nadpisywało cudzy wiersz
     i meldowało sukces. Naprawa: jawny UPDATE po własnym kluczu albo czysty
     INSERT, konflikt = odmowa. NIE używać ON DUPLICATE w tabelach z więcej
     niż jednym kluczem unikalnym.
     Dowody P1: strażnicy 35/35, audyt mutacyjny 169 (167 złapane,
     2 pominięte — strażnicy warunkowi bez materiału), `npm run check` kod 0,
     smoke:wp 30, smoke:wp-front 84, smoke:wp-platnosci 23, `wp:sprawdz`
     73/73, `wp:tutor` 0 różnic. **Nowy mount w compose wymaga
     `podman-compose down && ./postaw.sh`** (bind mount trzyma inode).
     **NASTĘPNY KROK: PR gałęzi `feat/p1-fundament-platnosci` (po merge'u
     `docs/schemat-pluginu-2` — stackowane PR-y już raz zamknęły się
     nawzajem, notatka przy 0.25.0), potem plan + pytania do P2 (produkt
     z ceny) wg reguły poniżej.**
     **P2 W TOKU — PRZERWA 2026-08-28 (gałąź `feat/p2-produkt-z-ceny`,
     NIEUKOŃCZONE, bez PR-a).** Stan: kod szwu NAPISANY i działa na
     żywej instalacji (2 prawdziwe kursy mają produkty: 675/676,
     `publish`, `hidden`, cena z naszej tabeli, powiązanie w Tutorze,
     `sync` idempotentny — druga próba „bez zmian 2"), ale **smoke P2
     ma 2 z 37 sprawdzeń czerwone** i to jest PRAWDZIWA usterka do
     dokończenia, nie usterka testu.
     **NASTĘPNY KROK PO PRZERWIE — dokończyć naprawę `_price`:**
     gdy ktoś zepsuje `_price` METĄ, cena regularna zostaje poprawna,
     więc `synchronizuj_kurs()` nie widzi zmiany propsu i **nie zapisuje
     — rozjazd „katalog nowa cena, kasa stara" żyje wiecznie**, choć
     kontrola każe „uruchomić sync". ZMIERZONE: `set_price()+save()`
     NIE zapisuje `_price` (data store liczy je tylko z propsu
     `regular_price`); podwójne `set_regular_price()` na JEDNYM obiekcie
     TEŻ nie; **działa dopiero DWA OSOBNE `save()` na DWÓCH obiektach
     `wc_get_product()`** (zapis 1: inna cena, zapis 2: powrót) —
     sprawdzone na produkcie 675. To ma wejść do `synchronizuj_kurs()`
     jako gałąź naprawcza (tylko gdy `get_price('edit')` != oczekiwana),
     razem z komentarzem, i wtedy smoke przechodzi 37/37.
     **CO JUŻ ZROBIONE W P2:** `Aai_Sklep_Odczyt::kurs_po_id()` (jedyna
     zgoda na zmianę w Pluginie 1), `Aai_Platnosci_Szew` (prio 20,
     `Throwable`, hak `save_post_product` B13), `Aai_Platnosci_Komunikaty`
     (L14), warstwa zapisu: produkt draft→powiązanie→publish z kolejnością
     B2, `zdejmij_kurs()` wg tabeli 9.3, `synchronizuj_wszystkie()`,
     `wp aai-platnosci sync [<slug>]` + aktywacja, kontrola rozjazdu
     (cena regularna I `_price`, widoczność, znaczniki, powiązanie,
     duplikaty uuid, sieroty), `tools/smoke/smoke-wp-produkty.mjs`
     (37 sprawdzeń, mierzy m.in. KOLEJNOŚĆ B2 hakiem na meta i bramkę
     „sha256 produktu niezmieniony między przebiegami").
     **DWIE RZECZY, KTÓRE SMOKE ZŁAPAŁ I JUŻ NAPRAWIONO:** (1) kontrola
     była ŚLEPA na każdy rozjazd przez 10 minut po synchronizacji —
     próg „w trakcie" (B15) degradował WSZYSTKO; teraz degraduje wyłącznie
     stany NIEKOMPLETNE (brak produktu/powiązania), a rozjazd WARTOŚCI
     to zawsze kod 1, okno skrócone do 60 s; (2) `INSERT … ON DUPLICATE
     KEY UPDATE` (P1) nadpisywał cudzy wiersz przy konflikcie drugiego
     klucza unikalnego.
     **ZOSTAJE DO ZROBIENIA W P2 (poza `_price`):** rozszerzenie
     `straznik-platnosci-wp` o kolejność B2 i mutacje w audycie,
     `npm run smoke:wp-produkty` w package.json, wiersze w README,
     wpis CHANGELOG, `sprawdz` w sekcji WERYFIKACJA `postaw.sh`
     (punkt kontrolny), przegląd agent+krytyk wg `agenci/przeglad-pr/`,
     dopiero potem PR.
     **ŚRODOWISKO ZOSTAWIONE CZYSTE:** `:8892` działa, kursy 2, produkty 2,
     powiazania 2, dostawy 0, `wp:sprawdz` 73/73, `wp aai-platnosci sprawdz`
     kod 0. Uwaga: przełączenie gałęzi ZABIJA bind mount wtyczki (inode) —
     po `git checkout` robić `podman-compose down && ./postaw.sh`.
     **P2 ZROBIONY (2026-08-28, wersja 0.47.0, gałąź `feat/p2-produkt-z-ceny`,
     commity 37d403b + d61fb81) — kurs staje się produktem WooCommerce.**
     Oba prawdziwe kursy mają produkty (publish, hidden, cena z naszej tabeli),
     powiązane z kopią w Tutorze w kolejności B2. Sprzedaży to NIE uruchamia:
     `monetize_by` zostaje `tutor` do P3a, CTA dalej na `/kontakt` — świadomy
     zakres kroku.
     **PRZEGLĄD agent+krytyk (pierwszy wg `agenci/przeglad-pr/`): 41 znalezisk
     trzech recenzentów, wszystkie naprawione.** Najważniejsze do zapamiętania:
     (a) **wczesny `return` w metodzie zmieniającej stan produktu zostawiał go
     KUPOWALNYM** — status nadaje teraz jedno miejsce na końcu metody;
     (b) **kontrola meldowała sukces przy ROZBROJONYM szwie** — cała integracja
     Tutor↔Woo siedzi za `if ( 'wc' !== $monetize_by ) return;`, a instalacja
     stoi na `tutor`; stan jest teraz NAZWANY, nie przemilczany;
     (c) **Plugin 1 nie był zależnością** — komendy kończyły się fatalem PHP,
     a kontrola mówiła „Success"; (d) **degradacja „w trakcie" szła po TREŚCI
     komunikatu** (trzeci nawrót pułapki wzorca na napis) i dwa z trzech
     śladów były martwe — rozjazdy mają dziś KODY STANU; (e) **mutacja audytu
     była maskowana** (łamała dwie reguły naraz) → nowe pole `oczekiwanySlad`
     sprawdza, czy zapalił się WŁAŚCIWY komunikat.
     **DWIE PUŁAPKI POMIARU Z TEGO KROKU:** `_price` w Woo przelicza się
     WYŁĄCZNIE przy realnej zmianie ceny w bazie (`set_price()` przez API nie
     zapisuje go wcale) — stąd jawne `sync --napraw-cene` z produktem zdjętym
     na czas naprawy na `draft`; oraz **konkatenacja wiąże w PHP mocniej niż
     `?:`**, więc `echo '{' . $x ? 'a' : 'b' . '}'` zawsze zwraca gałąź
     prawdziwą — funkcja pomiarowa smoke'a kłamała na każdym warunku.
     **ODTWORZENIE ŚRODOWISKA MA TERAZ CZTERY KOMENDY** — `wp:import` (wpięte
     w nie `wp:sync-platnosci`) → `wp:sync` → `wp:zrzuty`; import wystrzeliwuje
     zapis kursu ZANIM powstanie kopia w Tutorze, więc bez tego produkty
     zostają szkicami.
     Dowody P2: strażnicy 35/35, audyt mutacyjny **174** (0 przeoczonych,
     0 martwych), `npm run check` kod 0, `postaw.sh` kod 0 (ma teraz punkt
     kontrolny `aai-platnosci sprawdz`), smoke: wp-produkty **70**,
     wp-kreator 96, wp-front 84, wp-tutor 44, wp-lekcja 35, wp-dane 30,
     wp-platnosci 23; dane Pluginu 1 nietknięte (73/73 co do znaku,
     kopia w Tutorze 0 różnic).
     **SWEEP PRZED /CLEAR ZROBIONY (2026-08-28) — log:
     [docs/plugin-2/SWEEP-P2.md](docs/plugin-2/SWEEP-P2.md).** Wszystkie
     41 napraw zweryfikowanych URUCHOMIENIOWO (nie deklaratywnie), kolizje
     z resztą projektu sprawdzone. **Sweep znalazł rzecz, której nie widział
     żaden z trzech przeglądów: smoke'i Pluginu 1 zostawiały PRODUKTY-SIEROTY**
     — tworzą kursy testowe, więc nasz szew zakłada im produkty, a przy
     kasowaniu kursu produkt zostaje (niezmiennik 13). Po kilku przebiegach
     bramki mierzyłyby własne śmieci. Naprawione w trzech smoke'ach
     (`wp-dane`, `wp-tutor`, `wp-kreator`): test sprząta TAKŻE produkt po
     swoim kursie — kod wtyczki bez zmian. Dowód: trzy przebiegi z rzędu
     zostawiają produkty 2, powiazania 2.
     **PONOWNA WALIDACJA ZROBIONA (2026-08-29) — log: SWEEP-P2.md §6–§10.**
     Pełny zestaw kontrolerów zielony (regresji i kolizji zero), sześć klas
     błędów przeszukanych POMIAREM w całym projekcie. Klasy 1, 2, 5, 6 czyste;
     klasa 4 czysta DOWODOWO (instrumentowana kopia audytu porównała komunikat
     strażnika z opisem każdej ze 176 mutacji — wszystkie czerwone zapalają
     regułę, którą psuły). Klasa 3 dała JEDNO realne znalezisko, naprawione
     (commit c6c9c97): **straznik-limitera pilnował decyzji (B) z 0.36.0
     wzorcem na NAZWĘ stałej `MIN_DLUGOSC_TOKENU`** — usunięcie sprawdzenia
     długości z warunku przy zostawionej definicji przechodziło na zielono,
     choć brama przyjmowała token DOWOLNEJ długości (trzeci nawrót klasy:
     0.29.0 nazwa metody, 0.44.0 nazwa stałej). Wzorzec pyta teraz
     o porównanie długości (stała o dowolnej nazwie albo liczba ≥ 2 cyfr),
     komunikat podaje, który człon zawiódł; audyt 174 → **176** mutacji
     (2 nowe „przestaje MIERZYĆ długość" z `oczekiwanySlad` + kontrprzykład
     „przemianowanie stałej niczego nie osłabia"). Dotyczy TYLKO prototypu —
     wtyczki WP tokenu nie używają (`manage_options` + nonce). Zostawione
     świadomie (SWEEP §9): sprzątanie liniowe bez try/finally w dwóch
     smoke'ach (luka tylko przy awarii komendy `wp`; wzorzec naprawy =
     `smoke-wp-tutor`), ostrzeżenie ESLinta istniejące tak samo na main.
     **P2 ZAMKNIĘTY W REPO (2026-08-29): PR #80 zmergowany do `main` na
     dowodach lokalnych za zgodą właściciela, tag `v0.47.0` + release,
     gałąź skasowana, artefakt zweryfikowany (diff main↔szczyt gałęzi PUSTY).**
     CI potwierdzone `gh run view`: wszystkie zadania 0 kroków (2118/2000
     minut Actions); po 1 września potwierdzić gitleaks.
  8. **P3a W TOKU (gałąź `feat/p3a-ustawienia-kasa`) — plan ZATWIERDZONY
     przez właściciela 2026-08-29** („p3a jest okej", pytania doprecyzowujące
     zadawać w trakcie). **Dokument kroku z czterema rozstrzygnięciami,
     weryfikacją zerową w cudzym kodzie i sześcioma etapami:
     [docs/plugin-2/KROK-P3A.md](docs/plugin-2/KROK-P3A.md) — CZYTAĆ PRZED
     PRACĄ.** Skrót rozstrzygnięć: (1) `monetize_by` → `wc` + ustawienia kasy
     jako kod z filtrami B17, ale SPRZEDAŻ ZAMKNIĘTA do P4 blokadą na
     `woocommerce_add_to_cart_validation` (produkty zostają `publish` — draft
     łamałby niezmiennik 9; filtr pokrywa form handler, AJAX, Store API
     I sesję koszyka — zweryfikowane w kodzie Woo); (2) `/koszyk/` + `/kasa/`,
     `/my-account/` zostaje, bez 301 — ODSTĘPSTWO od decyzji 6 z 2026-08-26
     przyjęte z planem; (3) puste strony Tutora 151/152 → `draft`;
     (4) wygląd koszyka/kasy w Pluginie 1 (`woo-motyw.css`), za zgodą.
     Mail Woo `customer_new_account` zostaje WŁĄCZONY do P4 (wyłączenie
     wcześniej = konto bez linku do hasła, klasa K1). Kluczowy fakt
     z weryfikacji zerowej: `is_course_purchasable` przy silniku `wc` czyta
     TYLKO meta, nie pyta produktu Woo — blokada koszyka NIE otwiera okna B2.
     **P3a ZAMKNIĘTY W REPO (2026-08-29, wersja 0.48.0): PR #81 zmergowany
     do `main` na dowodach lokalnych za zgodą właściciela, tag `v0.48.0`
     + release, gałąź skasowana, artefakt zweryfikowany (`git diff main
     <szczyt>` PUSTY).** Sweep kroku:
     [docs/plugin-2/SWEEP-P3A.md](docs/plugin-2/SWEEP-P3A.md), szczegóły
     i przegląd: [docs/plugin-2/KROK-P3A.md](docs/plugin-2/KROK-P3A.md) §6–§8.
     Dowody: strażnicy 35/35, audyt mutacyjny **183** (0 przeoczonych,
     0 martwych), `npm run check` 0, smoke: motyw **89** (9 stron), produkty
     **71**, płatności 23, front 84, tutor 44, lekcja 35, kreator 96,
     panel 54, dane 30; `postaw.sh` 0; dane Pluginu 1 nietknięte (73/73,
     0 różnic). Środowisko `:8892`: produkty 2, powiazania 2, dostawy 0.
     **PIĘĆ FAKTÓW ZMIERZONYCH W CUDZYM KODZIE (nie z dokumentacji):**
     (1) **Tutor czyta `monetize_by` W KONSTRUKTORZE, przy include swojego
     pliku** — filtr B17 z `plugins_loaded` przychodzi PO odczycie i niczego
     nie broni; rejestracja MUSI być na poziomie pliku wtyczki (strażnik
     liczy głębokość klamer, bo wzorzec na pozycję w linii był ślepy na
     rejestrację warunkową); (2) **zasłona „Coming soon" Woo jest DZIURAWA
     jako blokada** — Store API przyjmuje produkt mimo niej (201), a jako
     strona podmienia koszyk i kasę na anglojęzyczną planszę w canvasie
     szablonów blokowych, z pominięciem `page.php` motywu; (3) **style
     komponentów bloków Woo drukują się W ŚRODKU `<body>`**, więc są zawsze
     po arkuszach z `<head>` — wyścigu specyficzności nie da się wygrać
     zależnością enqueue, trzeba włączyć ICH ciemny wariant
     (`has-dark-controls` na bloku); (4) **koszyk gościa jest NIEWIDZIALNY
     dla zalogowanego** (Woo czyta sesję po `user_id`), a sesja przeniesiona
     ze skryptu Node do przeglądarki wygląda identycznie co do bajta i też
     nie działa — w smoke'u produkt dodaje SAMA przeglądarka
     (`?add-to-cart=`) w izolowanym kontekście; (5) **`wp_old_slug_redirect`
     NIE obejmuje stron** — po zmianie sluga stary adres oddaje 404, nie 301
     (przyjęte decyzją właściciela).
     **BŁĄD, KTÓRY ZŁAPAŁ DOPIERO PRZEGLĄD — nowa klasa: CICHA UTRATA TREŚCI
     PRZEZ PODMIANĘ PREFIKSU.** `dopisz_klase_bloku()` robił `str_replace`
     na `class="<nazwa-bloku>`, więc trafiał w KAŻDY blok zagnieżdżony o tej
     samej nazwie początkowej i rozbijał jego klasę
     (`…-cart-items-block` → `…-cart has-dark-controls-items-block`).
     Zmierzone na żywych danych: **13 uszkodzeń w koszyku, 22 w kasie**, bez
     jednego objawu — blok Woo zwraca zapisaną treść bez regeneracji, więc
     ani zapis, ani render nic nie zgłaszały; idempotencja po obecności
     klasy zamroziłaby ten stan na zawsze. **Reguła: podmiana w cudzej
     treści MUSI kończyć się granicą atrybutu i dotyczyć jednego wystąpienia.**
     Pilnują: reguła 13b `straznik-platnosci-wp`, mutacja w audycie
     i KONTROLA DANYCH w `sprawdz` (rozbite nazwy klas = kod 1; `--napraw`
     tego NIE cofa, bo cudzej treści nie zgadujemy).
  9. **P3b ZROBIONY I ZAMKNIĘTY W REPO (2026-08-29, wersja 0.49.0):** PR #82
     zmergowany do `main` na dowodach lokalnych za zgodą właściciela, tag
     `v0.49.0` + release, gałąź skasowana, artefakt zweryfikowany (`git diff
     main <szczyt>` PUSTY). CI dalej stoi (zadania padają w 2 s z zerem
     kroków — wyczerpane minuty Actions); po 1 września potwierdzić
     **gitleaks**. **Dokument kroku z pomiarami i przeglądem:
     [docs/plugin-2/KROK-P3B.md](docs/plugin-2/KROK-P3B.md) — CZYTAĆ PRZED
     PRACĄ NAD P4.**
     **CZTERY ROZSTRZYGNIĘCIA WŁAŚCICIELA (2026-08-29):** (1) przy przelewie
     dostęp powstaje **dopiero po potwierdzeniu wpłaty** — z czego wynika
     WYMAGANIE DLA P4: **mail „Ustaw hasło" MUSI wyjść przy `on-hold`, a nie
     przy `completed`**, inaczej klient płacący przelewem ma przez dwa dni
     konto, do którego nie umie wejść (klasa K1); (2) bramka testowa =
     `bacs`; (3) cena efektywna z Woo pokazywana na stronie kursu **i**
     w katalogu; (4) w kreatorze zdanie przy polu ceny, że to cena
     katalogowa. Piąte rozstrzygnięcie, po pomiarze: **zamówienie kursu
     wchodzące w `processing` domykamy automatycznie** (produkt cyfrowy nie
     ma czego „realizować").
     **POMIAR, KTÓRY ZMIENIŁ ZAKRES KROKU — Tutor ma CZARNĄ LISTĘ metod
     płatności** (`bacs`, `cod`, `cheque`) i przy nich NIE domyka zamówienia
     stojącego w `processing` (`WooCommerce.php`, `should_order_auto_complete`).
     Zmierzone: przelew opłacony przez bramkę ORAZ wpłata potwierdzona
     w panelu przyciskiem „Processing" zostawiały klienta BEZ KURSU, bez
     jednego objawu — czyli ustawienie auto-complete z P3a było w tej
     konfiguracji MARTWE. Stąd `Aai_Platnosci_Dostarczanie`: filtr
     `needs_processing` (produkt kursu nigdy nie wymaga obsługi, więc
     `payment_complete()` idzie prosto do `completed`, przy okazji jeden mail
     zamiast dwóch) + hak na `processing` jako siatka na ręczną zmianę
     w panelu. **Zamówienia MIESZANE zostają w `processing`** — tam ten
     status jest prawdziwy, bo jest co wysłać.
     **CZTERY DALSZE FAKTY ZMIERZONE W CUDZYM KODZIE:** (a) `do_enroll()`
     nadaje zapisowi `pending`, gdy kurs jest `purchasable` — czyli szew z P2
     zamyka okno B2; (b) `WC_Order::needs_processing()` liczy
     `is_downloadable() && is_virtual()` i trzyma wynik w **cache obiektowym
     grupy `orders` na dobę**, kluczem per zamówienie (NIE transient);
     (c) `woocommerce_order_status_changed` odpala się TYLKO przy niepustym
     `from`, więc zamówienie utworzone od razu w `processing` przeszłoby mu
     pod nosem — stąd hak na `woocommerce_order_status_processing`;
     (d) **blok kasy nie renderuje pozycji w HTML** (dociąga je przez Store
     API), więc „prosto do kasy" mierzy się ciasteczkami
     `woocommerce_items_in_cart`, a nie treścią strony.
     **CO POWSTAŁO:** `Aai_Platnosci_Dostarczanie`, `Aai_Platnosci_Cena`
     (filtr `aai_sklep_cena_kursu` — cena EFEKTYWNA z Woo),
     `Aai_Platnosci_Cta` (filtry `aai_sklep_cta_kursu`
     i `aai_sklep_dostepnosc_kursu`), `Aai_Sklep_Widok::cena_grosze()`
     (JEDNO źródło ceny, pamięć na żądanie — strona pyta 4 razy, Woo
     odpowiada raz), `adres_kontaktu()` rozdzielony od zakupu,
     `Aai_Platnosci_Zapis::zamknij_zamowienie()`, **`npm run smoke:wp-zakup`**
     (32 sprawdzenia) oraz **pięć niezmienników strażnika** i **8 nowych
     mutacji** (audyt 183 → **191**).
     **PRZYCISK MA CZTERY STANY, nie trzy** (czwarty wyszedł z pomiaru):
     kontakt przy zamkniętej sprzedaży · kasa z produktem przy otwartej ·
     „Przejdź do kursu" dla kogoś, kto kurs ma · **„Zamówienie w toku"** dla
     kogoś, kto czeka na przelew. Pytamy Tutora o ZAPIS, nigdy o `dostep`
     (`dostep` jest prawdziwy także dla zapowiedzi i dla admina — pułapka
     z W6). `PreOrder → InStock` wynika z TEJ SAMEJ metody co przycisk.
     **PRZEGLĄD PRZED PR-em — cztery znaleziska, każde potwierdzone
     URUCHOMIENIOWO przed naprawą** (recenzent na zamkniętej liście 10 pytań,
     decyzja właściciela o koszcie tokenów; krytykiem agent główny):
     (1) **anulowane zamówienie blokowało zakup NA ZAWSZE** — Tutor zakłada
     zapis przy SKŁADANIU zamówienia i **nigdy go nie kasuje**, anulowanie
     i zwrot tylko przestawiają status; pytanie o samo istnienie zapisu
     odbierało takiemu klientowi przycisk zakupu bezpowrotnie (teraz liczy się
     STATUS: trwające to `pending`, `on-hold`, `processing`);
     (2) **produkt `publish` z pustą ceną obiecywał zakup**, którego kasa
     odmawia — `is_purchasable()` wymaga niepustej ceny, więc sam status to
     za mało; (3) **domknięcie odwracało kolejność maili** („zrealizowane"
     przed „w realizacji", zmierzone na notatkach zamówienia 298–301), bo hak
     biegnie W ŚRODKU cudzego przejścia statusu — domykamy teraz na
     `shutdown`; (4) **cena bez podatku nie była pilnowana** — `get_price()`
     nie dolicza VAT-u, więc kontrola oddaje **kod 1**, gdy ktoś włączy
     naliczanie podatku przed przeliczeniem ceny efektywnej.
     **DWIE PUŁAPKI WŁASNYCH DOWODÓW, warte zapamiętania:** (a)
     `includes("99,00 zł")` przechodzi dla „199,00 zł" — sprawdzenie karty
     katalogu było przez to ŚLEPE i wykrył to dopiero test negatywny (ta sama
     klasa co `endsWith("199.00")` przy P2); **porównuj CAŁĄ wartość**;
     (b) nowy blok sprawdzeń wstawiony w ŚRODEK smoke'a zaburzył stan
     następnym blokom i trzy padnięcia wyglądały jak błąd kodu, a były błędem
     KOLEJNOŚCI w teście.
     **Stan dowodów na koniec P3b:** strażnicy **35/35**, audyt mutacyjny
     **191** (189 złapanych, 0 przeoczonych, 0 martwych), testy **83/83**,
     `npm run check` 0, `postaw.sh` 0, smoke'i WP: zakup **32** · produkty 71
     · front 84 · kreator 96 · motyw 89 · panel 54 · tutor 44 · lekcja 35 ·
     dane 30 · płatności 23; `wp:sprawdz` 73/73 co do znaku, `wp:tutor`
     0 różnic. Środowisko `:8892`: produkty 2, powiazania 2, dostawy 0,
     zamówienia 0, **sprzedaż ZAMKNIĘTA**, VAT wyłączony.

  10. **P4 ZROBIONY I PRZEJRZANY (2026-08-29, wersja 0.50.0, gałąź
     `feat/p4-konto-i-maile`, 10 commitów) — PR NIEOTWARTY, czeka na zgodę
     właściciela.** Dokument kroku z rozstrzygnięciami, pomiarami i przeglądem:
     **[docs/plugin-2/KROK-P4.md](docs/plugin-2/KROK-P4.md) — CZYTAĆ PRZED PRACĄ.**
     Powstało: dwa maile dostarczenia (mail 1 „Ustaw hasło" na
     `woocommerce_created_customer`, mail 2 „Twój kurs jest gotowy" na
     `tutor_after_enrolled`, oba wysyłane na `shutdown`, znacznik w `dostawy`
     zapisywany synchronicznie), dziennik dostarczenia z komendą
     `wp aai-platnosci dostawy [--ponow=…]`, otwarcie sprzedaży komendą
     `wp aai-platnosci sprzedaz otworz|zamknij`, odmowa drugiego zakupu
     posiadanego kursu (B10) i **łapacz poczty Mailpit** w środowisku
     (`127.0.0.1:8893`, mu-plugin w `wordpress/srodowisko/mu-plugins/`).
     **SIEDEM ROZSTRZYGNIĘĆ WŁAŚCICIELA** (przyjęte razem z planem):
     Mailpit w środowisku, znacznik-najpierw z ręczną ponowką i kodem 1,
     mail 1 bez nazwy kursu, link na stronę Woo `/my-account/lost-password/`,
     sprzedaż otwierana komendą, B10 w P4, własny HTML maili.
     **SIEDEM RZECZY ZMIERZONYCH W CUDZYM KODZIE — nie wyprowadzać od nowa:**
     (1) `tutor_after_enrolled` melduje NIEAKTUALNY status zapisu (Tutor pisze
     surowym `$wpdb->update` bez czyszczenia cache'u, `Utils.php:2478`), więc
     bramka na `get_post_status()` nie wysłałaby maila 2 NIGDY;
     (2) callback dopisany do TRWAJĄCEJ akcji `shutdown` nie wykona się —
     mail 2 przepadał na ścieżce „admin klika Processing" (ratuje
     `doing_action('shutdown')`);
     (3) `WC()->cart->add_to_cart()` **nie woła** `woocommerce_add_to_cart_validation`
     (Woo 11) — blokadę koszyka mierzy się żądaniem HTTP, nie API koszyka;
     (4) strony koszyka i kasy **nie mają bloku `store-notices`**, a motyw jest
     klasyczny, więc odmowy koszyka były NIEME (`napraw()` dopisuje blok);
     (5) `wp_mail()` padał w obu kontenerach — kontener `wordpress` nie ma
     sendmaila w ogóle;
     (6) konto założone POZA kasą (`wp-admin`, `POST /wc/v3/customers`,
     `wp user create`) NIE przechodzi przez `wc_create_new_customer()`, więc
     mail 1 nie powstaje — dlatego mail 2 niesie odnośnik do odzyskiwania hasła;
     (7) szablon logowania Woo nie ma pola `redirect`, a jego formularz nie ma
     `action` — POST leci pod ten sam adres z parametrami, więc filtr
     `woocommerce_login_redirect` je zastaje.
     **PRZEGLĄD agent+krytyk na zamkniętej liście 10 pytań: cztery znaleziska,
     każde potwierdzone URUCHOMIENIOWO PRZED naprawą** — blokada koszyka bez
     `try/catch` dawała klientowi **HTTP 500** przy dodawaniu do koszyka; gość
     przy zdryfowanym `guest_checkout` **płacił i nie dostawał nic** (0 zapisów,
     0 dostaw, 0 maili); konto spoza kasy nie dostawało maila 1; kontrola była
     ślepa poza oknem 30 dni. Piąte znalezisko (ponowienie wysyłające klucz
     resetu komukolwiek) znalezione niezależnie. Jedno **odłożone świadomie do
     P5** (lista kursów w mailu 2 przy przerwanej pętli Tutora albo odpiętym
     kursie).
     **PIĄTY NAWRÓT WZORCA NA NAZWĘ/NAPIS** (0.29.0, 0.44.0, 0.47.0, c6c9c97,
     teraz DWA RAZY w P4: niezmiennik 20 przy refactorze i moja własna nowa
     reguła 29). Wzorzec pytający o OBECNOŚĆ napisu przechodzi, gdy napis
     występuje gdzie indziej w pliku. **Pytaj o rozstrzygnięcie (`return`, `if`,
     porównanie), nie o to, czy słowo się pojawia.**
     Stan dowodów: strażnicy **35/35**, audyt mutacyjny **201** (199 złapanych,
     0 przeoczonych, 0 martwych), `npm run check` 0, smoke'i WP: maile 40 ·
     zakup 32 · produkty 71 · front 84 · kreator 96 · panel 54 · motyw 89 ·
     tutor 44 · lekcja 36 · dane 30 · płatności 23; dane Pluginu 1 nietknięte
     (73/73, 0 różnic).
     **PRZY OKAZJI NAPRAWIONE W PLUGINIE 1 (zgłosił właściciel):** przycisk
     „Zaloguj się" na „Moich kursach" i na bramce lekcji prowadził przez
     `wp_login_url()` na **surowy ekran WordPressa**. Adres składa teraz
     `Aai_Sklep_Moje::adres_logowania()` (strona konta Woo w naszym wyglądzie),
     a filtr `woocommerce_login_redirect` odsyła klienta TAM, SKĄD przyszedł.
     Smoke lekcji asertował OBECNOŚĆ `wp-login.php`, czyli utrwalał ten błąd.

  11. ~~**NASTĘPNY KROK: NAPRAWA TRZECH BŁĘDÓW Z TESTU WŁAŚCICIELA I POLOWANIE
     NA CAŁE KLASY.**~~ **ZROBIONE (2026-08-29, wersja 0.51.0)** — sześć etapów
     N1–N6 na gałęzi `feat/p4-konto-i-maile`, każdy zamknięty osobnym commitem
     po weryfikacji uruchomieniowej, plus pełny sweep krzyżowy. Pełnia:
     CHANGELOG 0.51.0 i [BLEDY-Z-TESTU-P4.md](docs/plugin-2/BLEDY-Z-TESTU-P4.md)
     §5 (śledztwo) oraz §6 (naprawy). Skrót:
     **trop „cudza edycja 1787936224" to był `post_excerpt` produktu 675** —
     krótki opis produktu WooCommerce, który Woo drukuje klientowi w koszyku
     i w kasie, a Store API oddaje publicznie. Kopia tego pola NIE USTAWIAŁA,
     więc było niczyje (BLAD-027). Źródłem jest teraz `courses.short_desc`.
     **Prawdziwa przyczyna 146 zamówień-widm** (BLAD-026, druga połowa):
     sprzątanie wołało `wp_delete_post()`, które **pod HPOS nie kasuje niczego**.
     Do tego `wc_get_orders(status: 'any')` **pomija `checkout-draft`** —
     liczymy jawną listą `wc_get_order_statuses()`.
     **Sześć faktów zmierzonych w cudzym kodzie** (nie wyprowadzać od nowa):
     `set_short_description()`/`set_name()` **zjadają backslashe** (przez
     `wp_unslash()` w `wp_insert_post()`; rodzina pułapki z W2, tam ratował
     `$wpdb`); odmowę „You cannot add another" rzuca `WC_Cart::add_to_cart()`
     (`class-wc-cart.php:1307`), a nasza walidacja biegnie WCZEŚNIEJ;
     WordPress 6.9 czyta tłumaczenia z **`.l10n.php`**, nie z `.mo`;
     `wp_password_change_notification()` idzie **do administratora**, nie do
     klienta (`pluggable.php:2187`) — klient po ustawieniu hasła nie dostaje
     nic i od razu jest zalogowany.
     **SZÓSTY NAWRÓT PUŁAPKI „WZORZEC NA NAPIS" — spowodowany przez tę
     naprawę:** dopięcie drugiego filtru do `woocommerce_add_to_cart_validation`
     oślepiło regułę 11 strażnika, która pytała o samą nazwę haka; mutacja
     kasująca rejestrację BLOKADY SPRZEDAŻY zaczęła przechodzić. Złapał to
     audyt mutacyjny, nie przegląd.
     **BLAD-028 (nowa klasa): pomiar oparty na CUDZYM TEKŚCIE ma datę
     ważności** — sprawdzenie kolejności przejść statusu czytało notatki Woo
     i umarło po spolszczeniu instalacji, meldując odwróconą kolejność przy
     poprawnej. Mierzy teraz zdarzenia.
     **Sweep znalazł to, czego nie znalazły etapy:** `smoke-wp-motyw` otwierał
     sprzedaż na czas pomiaru i w `finally` robił `delete_option()`, czyli
     **zamykał sklep za sobą** — po bramkach wyglądu strona kursu przestawała
     pokazywać przycisk zakupu i wyglądało to jak awaria. „Przywróć stan" to co
     innego niż „skasuj ustawienie".
     **PUŁAPKA PRACY:** `git checkout -- <plik>` skasował niezacommitowaną
     pracę przy przywracaniu po teście negatywnym — do tego służy kopia
     zrobiona przed mutacją, nie git.
     Doszedł **`smoke-wp-jezyk`** (`npm run smoke:wp-jezyk`, 24 sprawdzenia)
     i trzy reguły strażnika (30–33). Środowisko `:8892`: **1 zamówienie**
     (prawdziwy zakup właściciela — materiał dowodowy), konto `klient-test`
     ma **0** (było 146), sprzedaż OTWARTA.
     **ZOSTAJE DO DECYZJI WŁAŚCICIELA:** regulamin (kasa obiecuje „Warunki
     i zasady", strony nie ma), gwarancja zwrotu 30 dni przy zwrotach
     zaplanowanych na P5, okładka produktu w kasie (szary zastępnik — SVG nie
     wchodzi do biblioteki mediów bez świadomej zgody na ten format).
     **P4 + NAPRAWY ZAMKNIĘTE W REPO (2026-08-29): PR #84 zmergowany do
     `main`, tag `v0.51.0` + release, gałąź skasowana, artefakt zweryfikowany
     (`git diff origin/main <szczyt>` PUSTY — lekcja z 0.37.0).** Merge decyzją
     właściciela na dowodach lokalnych: CI padło w 2–3 s z zerem kroków,
     a adnotacja GitHuba mówi wprost „The job was not started because recent
     account payments have failed or your spending limit needs to be
     increased" — **2118 minut Actions w sierpniu przy limicie 2000**, czyli
     rozliczenie, nie kod. Po powrocie CI (1 września) potwierdzić **gitleaks**,
     jako jedyny bez lokalnego odpowiednika.
     **CZTERY DECYZJE WŁAŚCICIELA PO MERGE'U (2026-08-29) — pełnia z zakresem
     wykonawczym w [BLEDY-Z-TESTU-P4.md](docs/plugin-2/BLEDY-Z-TESTU-P4.md)
     §6.4. ŻADNA NIE JEST JESZCZE W KODZIE:**
     (1) **regulamin — ZDEJMUJEMY ZDANIE** z kasy do czasu, aż powstanie
         (Woo drukuje „…wyrażasz zgodę na nasze Warunki i zasady oraz Politykę
         prywatności"; polityka ZOSTAJE, bo jest podpięta i klikalna od N6);
     (2) **gwarancja 30 dni ZOSTAJE i jest WYMAGANIEM DLA P5** — zwrot w 30 dni
         ma działać i odbierać dostęp do kursu; sprzedaż i tak nie ruszy przed
         P5, więc nikt się na nią nie zdąży powołać;
     (3) **okładka produktu: renderujemy PNG przy synchronizacji** i wgrywamy
         do mediów jako miniaturę — **SVG w bibliotece mediów ODRZUCONE**
         (może nieść skrypt); przy wykonaniu sprawdzić, co da się zrobić bez
         dokładania zależności;
     (4) **KOLEJNOŚĆ: najpierw TEST RĘCZNY WŁAŚCICIELA na 0.51.0, potem P5.**
         Trzy decyzje wyżej wchodzą RAZEM z poprawkami z tego testu — jedną
         gałęzią, żeby P5 zaczynało się na czystym stanie.
     **TEST RĘCZNY ZALICZONY (właściciel, 2026-08-29): „wszystko jest okej".**
     Ścieżka zakupu przejdzona do końca: zamówienie #2010 → konto klienta →
     potwierdzenie wpłaty → zapis na kurs w Tutorze #2011 → mail „Twój kurs
     jest gotowy"; kontrola kod 0. Jedyne zgłoszenie (Z1, „złożyłem zamówienie
     ale na mailu nic nie ma") okazało się **usterką ŚRODOWISKA**: kontener
     widział pusty katalog `mu-plugins`, bo `git switch` przy merge'u odtworzył
     katalog i zabił bind mount — PHPMailer wracał wtedy do sendmaila, którego
     w kontenerze nie ma. **Mechanizm z P4 zachował się wzorcowo** (konto
     powstało, dziennik zapisał błąd, kontrola świeciła kod 1 z komendą naprawy,
     ponowienie dowiozło mail — nic nie przepadło). Trzy poprawki, każda
     z testem negatywnym (PR #86): krok zerowy testu to ROZKAZ `./postaw.sh`;
     **`postaw.sh` CYTUJE wiersze `Error:` z kontroli** zamiast zgadywać powód
     po kodzie wyjścia (meldował „szew rozjechany", gdy przyczyną była poczta);
     `postaw.sh` pyta KONTENER, czy widzi mu-plugin poczty. PR #87 usunął zrzut
     ekranu wciągnięty do repo hurtowym `git add -A` — **przy `add -A` najpierw
     `git status`**.
  12. **P5 ZROBIONY (2026-08-29, wersja 0.52.0, gałąź `feat/p5-brzegi`) — PR
     NIEOTWARTY, czeka na zgodę właściciela.** Dokument kroku z pomiarami,
     pułapkami i listą rzeczy do jego decyzji:
     **[docs/plugin-2/KROK-P5.md](docs/plugin-2/KROK-P5.md) — CZYTAĆ PRZED PRACĄ.**
     **ZAKRES ZMIENIŁ WŁAŚCICIEL W TRAKCIE PLANOWANIA.** Krok wchodził
     z wymaganiem „gwarancja 30 dni MA DZIAŁAĆ", a rozstrzygnięcie brzmi:
     *„usuńmy sekcję ze strony sprzedażowej, klient kupuje i nie może zwrócić
     kursu"*. Przedstawiłem mu przedtem rozróżnienie trzech rzeczy i ono
     obowiązuje dalej: (1) **gwarancja 30 dni** to nasza dobrowolna obietnica —
     da się zdjąć; (2) **ustawowe 14 dni odstąpienia** NIE znika przez
     skasowanie sekcji — wyłącza je dopiero zgoda w kasie na natychmiastowe
     dostarczenie treści cyfrowej (pozycja „przed pierwszym klientem",
     DIAGRAM §15; nie jestem prawnikiem, do potwierdzenia z kimś, kto nim jest);
     (3) **techniczny zwrot** jest potrzebny niezależnie od 1 i 2 — obciążenie
     zwrotne, podwójna płatność, pomyłkowy zakup, reklamacja.
     **NAJWAŻNIEJSZY POMIAR KROKU: zwrot ODBIERA dostęp bez ani jednej linijki
     naszego kodu.** `enrolled_courses_status_change()` Tutora ustawia status
     zapisu równy statusowi zamówienia, a `get_enrolled_courses_ids_by_user()`
     filtruje po tym statusie. Zmierzone na czterech drogach, którymi klient
     widzi dostęp (zapis, `is_enrolled`, „Moje kursy", treść lekcji). Kodu więc
     NIE pisaliśmy — powstał `smoke-wp-zwroty` (35 sprawdzeń), który utrwala
     cudze zachowanie jako NASZE WYMAGANIE. **Zwrot CZĘŚCIOWY dostępu nie
     odbiera i to zostaje** (korekta ceny ≠ rezygnacja z kursu).
     **CO POWSTAŁO POZA TYM:** strona przestała obiecywać zwrot (obietnica
     siedziała w CZTERECH miejscach na kurs + pływak w hero katalogu, osobno
     w WP i w prototypie); kasa nie powołuje się już na nieistniejący regulamin
     (klient czyta „Kontynuując zamówienie, wyrażasz zgodę na naszą Politykę
     prywatności."); produkt w koszyku ma **okładkę kursu** zamiast szarego
     zastępnika; **`npm run db1:sekcje`** (bezpieczna droga dla poprawek treści
     sprzedażowej — `db1:seed` zaczyna od `akcja: "usun"`, czyli kasuje prozę
     73 lekcji); `node tools/okladki-png.mjs`.
     **DECYZJA O OKŁADCE ZMIENIONA POMIAREM:** „renderujemy PNG przy
     synchronizacji" jest NIEWYKONALNE — `Imagick::queryFormats("*SVG*")`
     w kontenerze zwraca PUSTĄ listę, GD SVG nie czyta, `rsvg-convert`/
     `inkscape`/`convert` nie istnieją. PNG jest artefaktem repozytorium
     (narzędzie + skrót źródła obok), wariant zatwierdzony przez właściciela.
     Render KWADRATOWY 1200×1200, bo Woo składa miniaturę przycięciem 300×300
     i z tytułu zostawało „poprawnie / zystać z Claude".
     **DWIE KOREKTY SCHEMATU** (DIAGRAM zaktualizowany): niezmiennik 14 opisywał
     objaw NA OPAK — `product_id` bez `price_type` daje zapis `completed`, czyli
     DOSTĘP BEZ ZAPŁATY, a nie `pending`; oraz **cztery pułapki z §13 miały puste
     dowody** mimo deklaracji (3 Tutor Pro, 8 wiszące zamówienia, 11 odnośnik
     pozycji koszyka, 14 `is_tutor_order()`) — wszystkie zamknięte, §13 nie ma
     już ani jednego wiersza „otwarte".
     **CZTERY RZECZY DO ZAPAMIĘTANIA:**
     (1) **`db1:sekcje` zmienia identyfikatory sekcji** (warstwa zapisu podmienia
     je parą DELETE + INSERT), więc **po każdym przebiegu trzeba `npm run
     wp:import`** — inaczej `wp:sprawdz` melduje „WordPress ma sekcję spoza
     prototypu" przy treści zgodnej co do znaku (zmierzone: 22 fałszywe rozjazdy);
     (2) **`tutor()->wc` NIE ISTNIEJE** — pierwszy test negatywny nic nie wyłączył
     i smoke przechodził, czyli ślepota testu wyglądająca jak dowód; callback
     zdejmować po nazwie klasy z `$wp_filter`;
     (3) **`waitForSelector(".wc-block-cart-items__row")` trafia w SZKIELET
     ładowania koszyka**, nie w treść — pomiar raportował brak okładki, choć
     Store API oddawało ją poprawnie;
     (4) **test negatywny wiszącego zamówienia nie zadziałał**, dopóki statusu
     nie ustawiono prosto w tabeli HPOS — bo mechanizm z P3b domknął zamówienie
     w tym samym żądaniu. Dobra wiadomość o kodzie, zła o naiwnym teście.
     **Stan dowodów:** `npm run check` kod 0 (strażnicy **35/35**, testy 83/83,
     lint, tsc, build, 7 smoke'ów prototypu), audyt mutacyjny **222** (220
     złapanych, 0 przeoczonych, 0 martwych), smoke'i WP: motyw 90 · kreator 96 ·
     produkty 84 · front 82 · panel 54 · maile 46 · tutor 44 · zakup 38 ·
     lekcja 36 · **zwroty 35** · dane 30 · język 24 · płatności 23; dane
     Pluginu 1 nietknięte (proza **73/73 co do znaku**, kopia w Tutorze
     **0 różnic**), `aai-platnosci sprawdz` kod 0.
     **ZOSTAJE DO DECYZJI WŁAŚCICIELA:** puste miejsce po dwóch pytaniach FAQ
     (usunięte, bo ich jedyną odpowiedzią była gwarancja — kursy mają cztery
     darmowe lekcje-zapowiedzi, więc jest czym odpowiedzieć, ale to obietnica
     handlowa); zgoda w kasie na natychmiastowe dostarczenie; kompozycja hero
     katalogu po usunięciu pływaka gwarancji (bramka wyglądu 90/90 nic nie
     zgłasza, ale to ocena estetyczna).
     **P5 ZAMKNIĘTY W REPO (2026-08-29): PR #89 zmergowany do `main`, tag
     `v0.52.0` + release, gałąź skasowana, artefakt zweryfikowany (`git diff
     origin/main <szczyt>` PUSTY).** Merge decyzją właściciela na dowodach
     lokalnych — CI stoi do 1 września (wyczerpane minuty Actions); po powrocie
     potwierdzić **gitleaks**.
     **TRZY DECYZJE WŁAŚCICIELA PO PRZEGLĄDZIE WYNIKÓW (2026-08-29), wszystkie
     WYKONANE:** (a) otwórz PR; (b) w miejsce usuniętych pytań FAQ **dopisz
     pytanie o darmowe lekcje** — weszło jako FAKT: każdy kurs ma **DWIE**
     lekcje otwarte bez logowania (liczba zmierzona, nie przepisana z notatki;
     dostęp sprawdzony: gość dostaje 200 i całą treść). Obietnica wymagała
     DROGI, której nie było — program oznaczał je etykietą „podgląd", a na
     całej stronie kursu nie było ANI JEDNEGO odnośnika do lekcji; etykieta
     jest teraz odnośnikiem „przeczytaj za darmo"
     (`Aai_Sklep_Tutor::adres_lekcji()`); (c) **sprzątnij widma** w dzienniku
     dostaw — zrobione (3 zamówienia z sesji P4 + 7 produktów-sierot po mojej
     diagnostyce; wtyczka nigdy nie kasuje produktu, niezmiennik 13, więc to
     sprzątanie należy do człowieka).
     **NAJPOWAŻNIEJSZE ZNALEZISKO KROKU — ZE SWEEPU, NIE Z ETAPÓW (cicha utrata
     treści).** Kopia Kursu 2 w Tutorze miała po smoke'ach **3 moduły i 14
     lekcji zamiast 6 i 32**, choć na starcie sesji `wp:tutor` mówił „87
     obiektów, 0 różnic". Nasze tabele były NIETKNIĘTE, więc bramki treści
     milczały. Przyczyna: zapytanie `meta_value => ''` dopasowuje PIERWSZY
     LEPSZY wpis danego typu, więc wiersz o **pustym identyfikatorze**
     „znajdował" cudzy moduł, przejmował go (tytuł, rodzic, uuid), a sprzątanie
     nadmiaru kasowało jego lekcje. **Ścieżka właściciela była bezpieczna** —
     kontrakt kreatora nadaje uuid od W4; dziura otwierała się przy wywołaniach
     warstwy zapisu z pominięciem kontraktu, czyli w naszych smoke'ach.
     Naprawione NA DWÓCH POZIOMACH: `Aai_Sklep_Tutor::znajdz_po_uuid()`
     odrzuca pusty uuid (obrona), a `Aai_Sklep_Zapis` nadaje uuid nowemu
     modułowi i lekcji (poprawność). Droga do przyczyny krok po kroku:
     [KROK-P5.md](docs/plugin-2/KROK-P5.md) §8b.
     **DWIE LEKCJE O BRAMKACH, WAŻNIEJSZE NIŻ SAM BŁĄD:**
     (1) **rachunek sumienia liczący wyłącznie WŁASNE ślady przepuszcza
     zniszczenie CUDZYCH danych** — `smoke-wp-zwroty` pyta teraz także o liczbę
     wpisów Tutora i o dziennik dostaw (37 sprawdzeń);
     (2) **`db1:sekcje` zmienia identyfikatory sekcji** (warstwa zapisu
     podmienia je parą DELETE + INSERT), więc **po każdym przebiegu trzeba
     `npm run wp:import`** — inaczej `wp:sprawdz` melduje „WordPress ma sekcję
     spoza prototypu" przy treści zgodnej co do znaku (zmierzone: 22 fałszywe
     rozjazdy).
     **Stan dowodów na koniec P5:** `npm run check` kod 0 (strażnicy **35/35**,
     testy 83/83, lint, tsc, build, 7 smoke'ów prototypu), audyt mutacyjny
     **223** (221 złapanych, 0 przeoczonych, 0 martwych), smoke'i WP: motyw 90 ·
     kreator 96 · produkty 84 · front 82 · panel 54 · maile 46 · tutor 44 ·
     zakup 38 · **zwroty 37** · lekcja 36 · dane 30 · język 24 · płatności 23;
     proza **73/73 co do znaku**, kopia w Tutorze **0 różnic**.
     **ŚRODOWISKO `:8892` ZOSTAJE POSTAWIONE I CZYSTE:** produkty 2, powiązania
     2, dostawy 6, zamówienia 2 (oba prawdziwe — zakupy właściciela), sprzedaż
     OTWARTA, konto `klient-test` (NIE kasować — potrzebne do P6), skrzynka
     `127.0.0.1:8893`.
     **ZOSTAJE DO DECYZJI WŁAŚCICIELA:** zgoda w kasie na natychmiastowe
     dostarczenie treści cyfrowej (wyłącza ustawowe 14 dni odstąpienia —
     pozycja „przed pierwszym klientem", wymaga regulaminu i najlepiej opinii
     prawnika); kompozycja hero katalogu po usunięciu pływaka gwarancji
     (bramka wyglądu 90/90 nic nie zgłasza, ale to ocena estetyczna).
     ~~**NASTĘPNY KROK CAŁEGO PROJEKTU: P6 — TEST RĘCZNY WŁAŚCICIELA.**~~
     **ZROBIONE I ZALICZONE — patrz punkt 13.**

  13. **P6 ZALICZONY (właściciel, 2026-08-30: „akceptuje wszystko") —
     PLUGIN 2 (`aai-platnosci`) JEST SKOŃCZONY.** Wersja **0.53.0**, PR #91
     zmergowany do `main`, tag `v0.53.0` + release, gałąź skasowana,
     artefakt zweryfikowany (`git diff origin/main <szczyt>` PUSTY). Merge
     na dowodach lokalnych za zgodą właściciela — CI padał w 2 s z zerem
     kroków i adnotacją o rozliczeniu (2118/2000 minut Actions; wraca
     1 września — potem potwierdzić **gitleaks**). Scenariusz, przebieg,
     zgłoszenia i naprawy: **[docs/plugin-2/TEST-RECZNY-P6.md](docs/plugin-2/TEST-RECZNY-P6.md)
     — wzorzec testu ręcznego dla Pluginu 3.**
     **Przebieg:** właściciel przeszedł ścieżki A–E (zakup #2590 kontem
     `robert.parowk`, przelew → moja symulacja bramki `payment_complete()`
     na jego polecenie → zwrot z panelu → przywrócenie). Przed oddaniem
     scenariusza: przelot kontrolny przeglądarką 23/23 (lekcja Z1 z 0.51.0
     — środowisko potrafi zmarnować rundę testu).
     **TRZY ZGŁOSZENIA → TRZY DECYZJE WŁAŚCICIELA (2026-08-30), wykonane
     w 0.53.0** (pełnia: CHANGELOG 0.53.0, TEST-RECZNY-P6.md):
     (1) **jeden mail przy płatności natychmiastowej** — mail 1 „Ustaw
     hasło" pomijany (wpis `pominięto:…` w dzienniku dostaw), WYŁĄCZNIE po
     potwierdzonym „wyslano" maila 2, który niesie odnośnik do hasła;
     przy leżącej poczcie mail 1 wychodzi jak zawsze (K1); przelew bez
     zmian (dwa żądania, dwa maile). Klucz sprawy: kasa loguje kupującego
     na 14 dni (`wc_set_customer_auth_cookie`, `class-wc-checkout.php:1262`)
     — „wejście do kursu bez hasła" to sesja z kasy + darmowa zapowiedź,
     nie wyciek;
     (2) **pozycja „Moje konto" w menu** (zmiana w Pluginie 1 za decyzją)
     — obok „Moich kursów", tylko dla zalogowanego, w obu nawigacjach,
     `aria-current` przez `is_account_page()`; zmierzone przed naprawą:
     drzwi z W6 były jednokierunkowe (zero odnośników do konta);
     (3) **cisza rdzenia o hasłach** — `wp_password_change_notification`
     mailuje ADMINA przy każdej zmianie hasła (klient nie dostaje nic);
     zdjęty callback w `zarejestruj()`, NIE podmieniona funkcja pluggable;
     mail do klienta z linkiem resetu nietknięty (zmierzone resetem).
     **Czwarte zgłoszenie wyjaśnione bez zmiany kodu:** „zniknął mail
     Ustaw hasło" — mail wyszedł (dziennik `wyslano`) i właściciel ustawił
     z niego hasło; zniknął PODGLĄD, bo `smoke-wp-maile` czyści CAŁĄ
     skrzynkę Mailpita (patrz „naprawy po P6" niżej).
     **Naprawione po drodze: `npm run wp:klient` zepsuty od P2** —
     `do_enroll()` na kursie płatnym nadaje `pending`, dostęp daje tylko
     `completed`; konto testowe udawało kogoś, kto zaczął zakup. Status
     podnoszony jawnie (jak w smoke-wp-lekcja), idempotentnie.
     **Dowody 0.53.0:** `npm run check` 0, strażnicy 35/35 (dwie nowe
     reguły `straznik-platnosci-wp`: 36 — pominięcie tylko po
     potwierdzonym mailu 2 i tylko dla maila 1, obie połowy: wysyłka
     i kontrola; 37 — powiadomienie admina zdjęte), audyt mutacyjny
     **227** (0 przeoczonych, 0 martwych), smoke'i WP: maile 46→**60** ·
     front 82→**84** · lekcja 36→**38** · motyw 90 · kreator 96 ·
     produkty 84 · zakup 38 · zwroty 37 · tutor 44 · panel 54 · dane 30 ·
     język 24 · płatności 23; proza 73/73, kopia w Tutorze 0 różnic.
     Testy negatywne każdej nowej asercji trafiają dokładnie w swoje.
     **ŚRODOWISKO `:8892` ZOSTAJE:** sprzedaż OTWARTA, kursy 2, produkty
     2, powiązania 2, dostawy 9, zamówienia dowodowe #1625/#2010/#2590
     (+ wiersz zwrotu #2675 — właściciel przetestował zwrot i przywrócił
     status; `robert.parowk` MA kurs), konto `klient-test` na obu kursach
     (hasło świeże w `.env`), kontrola kod 0. Sierota `tutor_enrolled`
     #2153 (`post_author=0`, ślad smoke'a zakupu) zostaje do napraw niżej.
     **NASTĘPNY KROK CAŁEGO PROJEKTU — dwie rzeczy, w tej kolejności:**
     1. ~~**NAPRAWY PO P6 — higiena smoke'ów wobec WSPÓLNYCH zasobów.**~~
        **ZROBIONE (2026-08-30, wersja 0.54.0, gałąź `fix/higiena-smokow`).**
        Zmierzone przelotem WSZYSTKICH 13 smoke'ów WP z licznikiem przed/po
        (nie przepisane z notatki): `smoke-wp-zakup` zostawiał **21**
        wiadomości na przebieg, `smoke-wp-zwroty` **15**, a `smoke-wp-maile`
        odwrotnie — kasował CAŁĄ skrzynkę (36 → 0), trzynaście razy w trakcie
        przebiegu. **SPROSTOWANIE: `smoke-wp-jezyk` poczty NIE zostawia**
        (zmierzone: 36 → 36) — wcześniejszy zapis wymieniał go niesłusznie.
        **Doszły dwie rzeczy, których notatka nie zawierała:** `postaw.sh`
        też kasował całą skrzynkę, DWA RAZY, a jest rozkazem kroku zerowego
        każdego testu ręcznego; oraz martwa stała `POCZTA` w `smoke-wp-zwroty`
        (od P5, nigdy nieużyta).
        Naprawa: wspólny moduł **`tools/smoke/poczta.mjs`** — migawka
        identyfikatorów ZASTANYCH na starcie, kasowanie wyłącznie tego, czego
        w niej nie ma. Izolacja pomiaru w `smoke-wp-maile` bez zmian (zawężamy
        pole widzenia zamiast czyścić cudze). Rachunek sumienia o dwie
        pozycje: skrzynka wróciła do stanu sprzed ORAZ liczba zapisów na kursy
        bez zmian — liczona GLOBALNIE, nie po własnym kursie.
        **Sierota #2153 skasowana**: `post_author=0`, `_tutor_enrolled_by_order_id
        = 2152` przy zamówieniu, którego nie ma. Tutor liczył **5 zapisanych
        na prawdziwy Kurs 1 zamiast 4**; po skasowaniu 4 (mierzone OSOBNYM
        żądaniem — w tym samym Tutor oddaje wartość sprzed kasowania, pułapka
        z W6). **Żaden dzisiejszy smoke takich sierot NIE produkuje** (przelot
        13 bramek: 6 → 6), więc nowa asercja jest profilaktyką, nie naprawą
        czynnego wycieku.
        Doszedł **36. strażnik `straznik-higieny-smokow`** (7 reguł, 8 mutacji;
        **trzy reguły sprawdzane URUCHOMIENIOWO** podstawionym `fetch`, bo
        różnica między „posprzątaj po sobie" a „wyczyść wszystko" to jedno pole
        w ładunku żądania). Bramkę „wysyła pocztę" rozpoznaje po wywołaniach
        cudzego interfejsu, nie po nazwie pliku — nowy smoke dostanie regułę
        sam. Reguła zapisana w CONTRIBUTING („Zasady twarde"), bo dotąd żyła
        tylko w opisach pojedynczych smoke'ów w README.
        **DWIE RZECZY DO ZAPAMIĘTANIA:** (a) `DELETE /api/v1/messages` bez
        listy `IDs` znaczy w Mailpicie „skasuj wszystko", więc sprzątanie bez
        własnych wiadomości NIE MOŻE wysłać tego żądania w ogóle; (b) migawka
        ucięta limitem stronicowania zamienia cudze wiadomości we własne —
        moduł czyta do skutku i ZATRZYMUJE przebieg przy rozbieżności z `total`.
        Pułapka pracy: hurtowa zamiana tekstu w pliku weszła przy okazji
        w istniejące sprawdzenie B16 (`smoke-wp-zakup`) — złapane czytaniem
        `git diff`, nie testem.
        **ZAMKNIĘTE W REPO (2026-08-30): PR #93 zmergowany do `main`, tag
        `v0.54.0` + release, gałąź skasowana, artefakt zweryfikowany
        (`git diff origin/main <szczyt>` PUSTY).** Merge decyzją właściciela
        na dowodach lokalnych — CI padło w 2 s z zerem kroków (minuty
        Actions wracają 1 września; potem potwierdzić gitleaks).
     2. **PLUGIN 3 — panel + monitoring — W TOKU: krok T0 (schemat)
        ZAAKCEPTOWANY przez właściciela 2026-08-30** („akceptuję diagram,
        lecz poprawmy — uwagi K1–K4 zrób bezpiecznie, bez regresji,
        sprawdź przed i po, czy naprawa nie koliduje"). **Domknięcie
        K1–K4 ZROBIONE** — patrz niżej. Wtyczka **`aai-monitor`** (NIE
        `aai-panel`: „panel" znaczy w tym repo KREATOR), ostatni moduł;
        potem test całości trzech wtyczek. Obowiązuje reguła z 2026-08-28
        (plan kroku + pytania + zgoda przed KAŻDYM krokiem) i ZASADA 0
        (schemat → krytyka → akceptacja → kod).
        **CZYTAĆ PRZED PRACĄ: [docs/plugin-3/DIAGRAM.md](docs/plugin-3/DIAGRAM.md)**
        (schemat PO krytyce i PO domknięciu K1–K4: 18 faktów zmierzonych
        w cudzym kodzie F1–F18, 18 niezmienników N1–N18, 15 pułapek
        P1–P15, kroki T1–T4)
        i `docs/plugin-3/KRYTYKA-T0.md`
        (werdykty 30 znalezisk trzech krytyków — każde potwierdzone
        niezależnie, 10 uruchomieniowo).
        **CZTERY DECYZJE WŁAŚCICIELA (2026-08-30), wiążące:** (D1) panel
        w KOKPICIE WP jak kreator z W4 — zero tras na froncie; (D2) pełne
        IP w dzienniku logowań + automatyczne kasowanie po 90 dniach;
        (D3) wizyty wszystkich OPRÓCZ zalogowanych adminów, sesja
        anonimowa bez IP i bez łączenia z kontem; (D4) ekran pokazuje
        TYLKO nasze dwie rzeczy (logowania + ruch) — sprzedaż ma raporty
        w Woo. **KOREKTA do PLAN.md §4** (w schemacie, tabela werdyktów
        dla każdej pozycji): własnego logowania i `admin_users` NIE
        piszemy — konta ma WordPress, panel stoi na `manage_options`.
        **POLECENIE WŁAŚCICIELA o diagramach (2026-08-30, powtórka klasy
        z P2):** wystrzał rysuje się Z BAZY do działu grubą linią
        (WYTYCZNE §8: `BAZA ==AJAX==> DZIAŁ --JSON--> strony`), wzorem
        stylu jest diagram Pluginu 1 (flowchart LR, baza-walec po lewej
        jako źródło, subgraf „dyspozytor — JEDEN AJAX", zdarzenia
        serwerowe w OSOBNYM subgrafie „NIE AJAX") — pierwsza wersja
        rysowała kierunek na opak i została przebudowana.
        **NAJGROŹNIEJSZE FAKTY Z KRYTYKI (pełnia w DIAGRAM.md, nie
        wyprowadzać od nowa):** `sendBeacon(url, string)` idzie jako
        `text/plain`, a REST WP wtedy NIE parsuje ciała (endpoint musi
        czytać `get_body()`, klient słać Blob `application/json`);
        wyjątek z handlera `set_logged_in_cookie` WYCHODZI z kasy Woo
        (HTTP 500 przy zakupie — każdy handler w try/catch); auto-login
        z kasy omija `wp_login` (łapie go `set_logged_in_cookie`);
        nadpisanie `navigator.webdriver` preloadem DZIAŁA w rigu, więc
        para bramek N9/N10 dowodzi pełnej ścieżki beaconu i wycięcia
        automatów naraz; kontrola `sprawdz` NIGDY po HTTP (kontener CLI
        nie dosięga :8892 — cURL error 7), tylko rejestr tras.
        **PRZEGLĄD CAŁOŚCIOWY (2026-08-30, polecenie właściciela: ocena
        znając CAŁY projekt) — cztery znaleziska, wszystkie wprowadzone:**
        (K1 KRYTYCZNE) wystrzał szedł **trasą REST**, co łamało konwencję
        obu poprzednich modułów — w repo jest **0** `register_rest_route`
        i **0** `wp_ajax_*`, a **6** akcji `admin_post_*` w Pluginie 1;
        wystrzałem jest teraz **akcja `admin-post.php` z `nopriv`**
        (`admin_post_nopriv_{action}` istnieje — sprawdzone w kodzie WP),
        **przez co pułapka F9 przestaje nas dotyczyć**, bo ciało czytamy
        z `php://input` sami; (K2) doszedł niezmiennik „kontrola NIGDY nie
        pisze" (L11 z P2); (K3) każdy niezmiennik N1–N17 jest przypisany
        do kroku, który go zamyka; (K4) **wtyczka nazywa się `aai-monitor`,
        nie `aai-panel`** — strażnik nazywany od wtyczki wyszedłby
        `straznik-panelu-wp`, a „panel" to w tym repo kreator.
        **NAZWY (zmierzone jako wolne):** wtyczka `aai-monitor`, tabele
        `wp_aai_monitor_*`, smoke `smoke-wp-monitor`, strażnik
        `straznik-monitora-wp`, prefiks assetów `aai-monitor-`.
        **DOMKNIĘCIE UWAG K1–K4 (2026-08-30) — dwie z czterech były
        wprowadzone NIEKOMPLETNIE, sprawdzenie „przed" to pokazało.**
        Pełnia z dowodami: DIAGRAM.md („Domknięcie uwag K1–K4") i
        KRYTYKA-T0.md (sekcja o tej samej nazwie). Skrót:
        **(K1) było niebezpieczne** — cały schemat mówił wyłącznie
        o `admin_post_nopriv_`, a `admin-post.php` rozgałęzia się po
        `is_user_logged_in()` (`:36`) na DWA rozłączne haki. Wizyty
        liczymy wszystkim oprócz adminów (D3), a **strony lekcji są za
        logowaniem**, więc kod pisany z tamtego schematu nie zapisałby
        ANI JEDNEJ odsłony lekcji — bez objawu, bo beacon nie ma
        czytelnika. Zmierzone na akcji Pluginu 1 `aai_sklep_zapisz_kurs`
        (zarejestrowanej tylko jako `admin_post_`): gość **400**, `admin`
        **403**, `klient-test` **403**. Druga połowa K1: **nazwa akcji
        MUSI jechać w query stringu** — `$action` bierze się z `$_REQUEST`
        (`:29`), a ciała `application/json` PHP nie wkłada do `$_POST`;
        akcja schowana w ciele daje **HTTP 200 i ciszę**. Doszły fakty
        F17/F18, pułapki P14/P15 i niezmiennik N18 z testem negatywnym.
        **(K3) N15 wisiał w T3**, choć jego dowód wymaga dziennika
        logowań — przeniesiony do T2. **(K4) mechaniczna zamiana nazwy
        zostawiła nieprawdę**: wiersz prefiksu twierdził, że „`aai-monitor`
        jest już zajęty w Pluginie 1", a dwa zdania dalej — że ma zero
        trafień; zajęty jest `aai-panel` (pomiar: `aai-panel` **49**,
        `aai-mono` **43**, `aai-monitor` **0**). **(K2) była kompletna.**
        **KOLIZJA SCALANIA, której nie widać w treści:** gałąź stała
        4 commity za `main` i jej `CLAUDE.md` nie znał sweepów #95/#96
        (74 wiersze) — merge PR-a cofnąłby cudzą pracę. `main` scalony
        do gałęzi PRZED poprawkami; po scaleniu gałąź różni się od `main`
        **wyłącznie** dwoma dokumentami Pluginu 3 (sprawdzone
        `git diff --stat`).
        **SCHEMAT ZAMKNIĘTY: PR #94 zmergowany do `main`** (artefakt
        zweryfikowany, `git diff origin/main <szczyt>` pusty).
        **DWIE DALSZE DECYZJE WŁAŚCICIELA (2026-08-30), po pytaniach
        doprecyzowujących — obie w schemacie jako D5 i D6:**
        **(D5) rola „redaktora kursów" ODPADA DEFINITYWNIE**, nie „na
        później" — kreator zostaje na `manage_options`; trzy obietnice
        o Pluginie 3 w repo sprostowane w T1 (kod Pluginu 1, KREATOR.md,
        DIAGRAM Pluginu 1). **(D6) brute force: REJESTRUJEMY, NIE
        BLOKUJEMY** — dziennik pokazuje serie porażek, decyzja
        o blokowaniu zapadnie, gdy dane pokażą, że problem istnieje;
        wiersz w KROK-2-ZABEZPIECZENIA.md rozbity na dwa, żeby pozycja
        nie zniknęła po cichu razem z ukończeniem modułu.
        **KROK T1 ZROBIONY (wersja 0.55.0, gałąź
        `feat/t1-fundament-monitora`): fundament wtyczki i EKRAN stoją.**
        Wtyczka `aai-monitor` jest AKTYWNA na `:8892`. Powstało: dwie
        tabele przez dbDelta (`logowania` 90 dni z pełnym IP,
        `wizyty` 400 dni BEZ ani jednej kolumny łączącej z kontem),
        `Aai_Monitor_Zapis` jako jedyny pisarz (sufity, retencja przy
        zapisie, `catch ( Throwable )` z meldunkiem), `Aai_Monitor_Odczyt`
        (kanał JSON, nigdy nie pisze), ekran w kokpicie z priorytetem 20,
        `Aai_Monitor_Zaleznosci`, kanał błędów, `uninstall.php` nie
        kasujący danych, `wp aai-monitor sprawdz|wyczysc-blad`,
        **37. strażnik `straznik-monitora-wp`** (8 reguł) i
        **`npm run smoke:wp-monitor` (57 sprawdzeń)**. Blok „KOREKTA
        2026-08-30" w PLAN.md §4 z werdyktem dla KAŻDEJ pozycji.
        **CZTERY RZECZY DO ZAPAMIĘTANIA Z T1:**
        (1) **`straznik-wtyczki-wp` był ŚLEPY na SQL sklejony
        konkatenacją** — obszedłem jego regułę 6 PRZYPADKIEM, pisząc
        retencję ze zmienną nazwą kolumny: na jednym miejscu się zapalił,
        drugie, identyczne, przemilczał. Doszła **reguła 10** (SQL
        literałem PRZY wywołaniu `$wpdb->`) + mutacja; zmierzone: zero
        istniejących naruszeń w trzech wtyczkach;
        (2) **WP-CLI NIE zamienia podkreślenia w nazwie metody na
        myślnik** — `wp aai-monitor wyczysc-blad`, czyli komenda, którą
        kontrola każe uruchomić, NIE ISTNIAŁA (nazywała się
        `wyczysc_blad`). Naprawia `@subcommand`. Złapał to smoke, nie
        recenzja;
        (3) **ekran mówi prawdę o tym, co zbiera** — producenci danych
        meldują się jako „czujki", a ekran o nie pyta; dziś mówi wprost
        „baza stoi, ale nic nie zbiera". Bez tego pusta lista nie
        odróżnia „nikt nie próbował" od „nic nie działa";
        (4) **kontrola NIGDY nie pyta o siebie żądaniem HTTP** —
        kontener WP-CLI nie dosięga `:8892` (cURL error 7), więc kontrola
        po sieci byłaby czerwona ZAWSZE i wywracała `postaw.sh`.
        Testy negatywne (CZTERY, każdy trafia DOKŁADNIE w swoje): kolumna
        `ip` dopisana do tabeli ruchu zapala **1 z 57**, kontrola zmuszona
        do zapisu zapala pomiar N16, formularz POST w ekranie zapala obie
        asercje czystego odczytu, arkusz wpuszczony na cudze ekrany zapala
        **1 z 57**.
        **T1 ZAMKNIĘTY W REPO (2026-08-30): PR #97 zmergowany do `main`,
        tag `v0.55.0` + release, gałąź skasowana, artefakt zweryfikowany
        (`git diff origin/main <szczyt>` PUSTY — lekcja z 0.37.0).** Merge
        decyzją właściciela na dowodach lokalnych: CI padło z **zerem
        kroków we wszystkich zadaniach** (wyczerpane minuty Actions,
        limit wraca 1 września), czyli rozliczenie, nie kod — sprawdzone
        `gh run view`. Po powrocie CI potwierdzić **gitleaks**.
        **JEDNA RZECZ ZGŁOSZONA BEZ DIAGNOZY — nie zaczynać śledztwa od
        nowa i nie brać jej za regresję:** przy przelocie WSZYSTKICH
        bramek WP pod rząd `smoke-wp-motyw` padł RAZ na dwóch
        sprawdzeniach (logowanie `klient-test` w prawdziwej przeglądarce
        i wynikające z niego menu konta). Puszczony osobno przechodzi
        **90/90** — trzy przebiegi, w tym dokładnie ta sama trójka
        `panel → jezyk → motyw`, która wcześniej padła. Nie reprodukuje
        się, przyczyny NIE ustaliłem; hasło konta zweryfikowane osobnym
        pomiarem HTTP zaraz po padnięciu (działa), a kod monitoringu nie
        dotyka ani frontu, ani logowania. Podejrzenie (niepotwierdzone):
        stan przeglądarki albo klucz resetu hasła zostawiony przez
        `smoke-wp-jezyk`, który woła `get_password_reset_key()` na
        pierwszym koncie roli `customer`.
        **PUŁAPKA, KTÓRA UGRYZŁA PRZY SAMYM MERGE'U (mimo że jest
        opisana wyżej): merge i przełączanie gałęzi ZABIJA bind mount
        wtyczki.** Git skasował katalog `wordpress/wtyczki/aai-monitor/`
        przy przejściu na `main` i odtworzył go po pull — nowy inode,
        więc kontener widział PUSTKĘ, a `wp aai-monitor sprawdz` mówiło
        „is not a registered wp command". Objaw jest mylący: strona
        oddaje 200, Pluginy 1 i 2 działają, tylko nowa wtyczka „znika".
        Napraw zawsze tak samo: **`podman-compose down && ./postaw.sh`**.
        **Asercja z T1 jest ZMIERZONA, nie zadeklarowana:** przy martwym
        mouncie `postaw.sh` kończy się **kodem 1** i podaje tę komendę
        (test negatywny przez podmianę inode katalogu — pliki po nim
        identyczne co do bajtu, drzewo git czyste). Kod wyjścia mierzony
        BEZ potoku, bo `| tail` maskuje go od czasów D5.
        **ŚRODOWISKO `:8892` ZOSTAJE POSTAWIONE I CZYSTE:** pięć wtyczek
        aktywnych (`aai-monitor aai-platnosci aai-sklep tutor
        woocommerce`), tabele monitoringu **puste** (smoke sprząta po
        sobie), Pluginy 1 i 2 nietknięte (powiązania 2), `wp aai-monitor
        sprawdz` kod 0, konto `klient-test` na obu kursach (NIE kasować —
        potrzebne do bramek), skrzynka `127.0.0.1:8893`.
        **KROK T2 ZROBIONY (wersja 0.56.0, gałąź `feat/t2-dziennik-logowan`):
        dziennik logowań DZIAŁA.** Kontrola melduje „Czujki: logowania",
        a ekran pokazuje, kto i skąd wchodził na konta. Powstało:
        `Aai_Monitor_Logowania` (trzy haki rdzenia, każdy w `try/catch
        ( Throwable )` — to wymaganie BEZPIECZEŃSTWA SKLEPU, nie higiena:
        wyjątek z `set_logged_in_cookie` wychodzi z kasy WooCommerce),
        `Aai_Monitor_Zadanie` (jedno miejsce, w którym powstaje IP — bez
        czytania `X-Forwarded-For`), `Aai_Monitor_Prywatnosc` (wpis do
        polityki przez natywne `wp_add_privacy_policy_content()`
        + fragment w [docs/plugin-3/POLITYKA-PRYWATNOSCI.md](docs/plugin-3/POLITYKA-PRYWATNOSCI.md)),
        wspólny moduł higieny `tools/smoke/dziennik.mjs`, cztery reguły
        `straznik-monitora-wp` (8→12) i dwie `straznik-higieny-smokow`
        (7→9). Dowody: strażnicy 37/37, audyt mutacyjny **255** (253
        złapane, 0 przeoczonych, 0 martwych), smoke monitoringu **76**.
        **TRZY RZECZY ZMIERZONE PRZED PISANIEM KODU** (od nich zależał
        projekt): (1) `set_logged_in_cookie` NIE odpala się przy każdym
        żądaniu zalogowanego — pięć odsłon `/wp-admin/` na gotowej sesji
        nie dołożyło ani jednej linii, więc dziennik rośnie w tempie
        LOGOWAŃ, nie odsłon; (2) `wc_set_customer_auth_cookie()` odpala
        WYŁĄCZNIE ten hak, bez `wp_login` (F3) — stąd dwa haki i dedup;
        (3) `wp_add_privacy_policy_content()` odmawia pracy poza
        `wp-admin` i przed `admin_init` (`plugin.php:2429`), więc
        wywołanie z `plugins_loaded` nie dodałoby NIC, bez objawu.
        **SMOKE MONITORINGU KASOWAŁ CUDZE WIERSZE** — test retencji
        cofał czas wierszowi z `MIN(id)` CAŁEJ tabeli i oddawał go
        retencji; do T2 bezpieczne, od T2 trafiało w cudzy wpis
        (zmierzone). Złapał to rachunek sumienia liczący CAŁĄ tabelę,
        nie własne ślady (lekcja z P5). Na instalacji właściciela
        zniknąłby jego najstarszy wpis logowania.
        **HIGIENA (N13) OKAZAŁA SIĘ WIĘKSZA, NIŻ ZAPOWIADAŁ SCHEMAT:**
        wpisy zostawiało SIEDEM bramek (pomiar przelotem z licznikiem
        przed/po), w tym `zakup` i `produkty`, których NIE WIDZI żaden
        wzorzec czytający nasz kod — sesję zakłada im WooCommerce
        w środku składania zamówienia. Stąd w strażniku, obok wzorca
        zachowania, JAWNA LISTA ZMIERZONYCH z komendą do powtórzenia
        pomiaru.
        **POMIAR OBALIŁ GREP W OBIE STRONY**, a pierwszy przelot kłamał
        ciszej: `jezyk`, `panel` i `motyw` pokazały „zostawia 0", bo
        w ogóle się nie uruchomiły (brak `ZRZUTY_RIG`) — kod wyjścia 1
        był jedynym śladem. **Pomiar bez sprawdzenia kodu wyjścia mierzy
        ciszę, nie stan.**
        **TRZY ŚLEPOTY ZŁAPANE WŁASNYMI TESTAMI NEGATYWNYMI** (wszystkie
        przechodziły na zielono, gdy powinny się zapalić): asercja
        „hasło nigdy w dzienniku" patrzyła tylko na wiersz PORAŻKI;
        reguła „bramka sprząta" nie widziała bramek logujących się przez
        cudzy kod; reguła „bramka się rozlicza" liczyła WYSTĄPIENIA
        wywołania i przechodziła po zamianie asercji na `true === true`,
        bo drugie wywołanie zostawało w komunikacie błędu.
        **TABELA KROKÓW W SCHEMACIE BYŁA NIEAKTUALNA** — obiecywała w T2
        retencję, jej drugi wyzwalacz i sekcję „Logowania" ekranu, a te
        trzy rzeczy zbudował już T1. Sprostowane.
        **ZOSTAJE DO DECYZJI WŁAŚCICIELA (poza zakresem T2, zgłoszone
        zamiast naprawiane):** cała polityka prywatności rozjechana ze
        stanem witryny — wypiera się cookies, `localStorage` i analityki,
        choć WooCommerce stawia ciastka koszyka, a WordPress ciastka
        logowania. Rozjazd jest STARSZY od Pluginu 3. Tabela cytat po
        cytacie: POLITYKA-PRYWATNOSCI.md §2; pozycja „przed pierwszym
        klientem", obok regulaminu i zgody w kasie.
        **PRZEGLĄD PRZED PR-em (para agent+krytyk, dwóch recenzentów na
        rozłącznych obszarach): DZIEWIĘĆ znalezisk, każde potwierdzone
        URUCHOMIENIOWO przed naprawą.** Pięć w kodzie: (1) **hasło wpisane
        w pole loginu szło do bazy jawnym tekstem** na 90 dni i na ekran
        admina — `sanitize_user()` w trybie nieścisłym NIE usuwa
        `@ ! # $ % & _ -` ani cyfr, więc `MojeTajneHaslo#2026` przechodziło
        bez zmiany, wbrew zdaniu z polityki prywatności; nieistniejące
        konta są teraz MASKOWANE (`Moj…(19 znaków)`), istniejące dosłownie;
        (2) **dedup gubił całe logowanie**, gdy w jednym procesie były dwa
        konta — trzymamy parę [wiersz, konto]; (3) `ArgumentCountError`
        omijał `try` (powstaje PRZY WYWOŁANIU) i leciał do kasy — parametry
        mają wartości domyślne; (4) `sanitize_text_field` **ucinał
        user-agenta na pierwszym `<`**, czyli kasował przypadek, dla
        którego ta kolumna istnieje; (5) cudzy callback padający na
        priorytecie 5 **zabierał nam zdarzenie** — haki idą z priorytetem 1.
        Cztery w bramkach, wszystkie o tym, że DOWÓD BYŁ POZORNY:
        (6) **rachunek sumienia MARTWY w sześciu z siedmiu bramek** —
        asercja stała ZA `process.exit(1)`, więc mutacja psująca ją
        przechodziła z kodem 0 (pilnuje reguła 10 strażnika higieny);
        (7) **reguła o `catch ( Throwable )` ślepa** — pytała o obecność
        słowa, więc instrukcja LINIĘ przed `try` przechodziła na zielono,
        a Error wychodził do kasy; (8) **nic nie pilnowało, że producent
        jest PODPIĘTY** — zdjęcie jednej linii dawało martwy dziennik przy
        obu strażnikach zielonych i kontroli kod 0 (doszła reguła 13,
        a kontrola świeci kod 1 przy zerze czujek); (9) komentarz
        o sprzątaniu opisywał mechanizm, którego w kodzie NIE MA (BLAD-018).
        **MÓJ POMIAR BRAMEK BYŁ ZANIECZYSZCZONY** — przypisałem wpisy
        bramkom `produkty` i `zakup`, bo w tle biegły MOJE WŁASNE żądania
        HTTP. Wpisy tworzy **PIĘĆ bramek plus smoke monitoringu**, nie
        siedem. **Dwie pułapki pomiaru do zapamiętania:** bramka bez
        `ZRZUTY_RIG` pada PRZED pierwszym logowaniem i pokazuje fałszywe
        „zostawia 0" (kod wyjścia jest jedynym śladem), a pomiar równoległy
        z własną pracą przypisuje jej skutki mierzonemu. Mierz
        `AUTO_INCREMENT`, nie liczbę wierszy — sprzątanie kasuje ślad, ale
        licznika nie cofa. Audyt 255 → **260**; jedna mutacja tego kroku
        UMARŁA po zmianie priorytetu haków i złapał to audyt.
        **NIESTABILNOŚĆ `smoke-wp-motyw` POWTÓRZYŁA SIĘ — nie zaczynać
        śledztwa od nowa.** Ta sama co przy T1: w PEŁNYM przelocie bramek
        pada 2 z 91, uruchomiony OSOBNO przechodzi 91/91. W tym kroku
        zdarzyło się dwa razy, a trzy próby reprodukcji (para
        `jezyk → motyw`, trójka `kreator → panel → jezyk → motyw`,
        przebieg osobny) dały zielone. Przyczyny dalej NIE ustaliłem;
        kod monitoringu nie dotyka ani frontu, ani logowania, a
        `npm run check` i pozostałych dwanaście bramek jest zielonych.
        **CZTERY DECYZJE WŁAŚCICIELA PRZY T2 (2026-08-30), wszystkie
        wykonane:** (1) wpis o dzienniku w polityce prywatności **dwiema
        drogami** — natywny mechanizm WP plus gotowy fragment w repo do
        wklejenia w źródle strony głównej (motyw jest tylko do odczytu);
        (2) rozjazd CAŁEJ polityki ze stanem witryny — **zgłosić jako
        pozycję „przed pierwszym klientem", nie ruszać**: treść prawna
        należy do właściciela i wymaga prawnika, a witryna nie jest
        jeszcze publiczna; (3) **test ręczny logowania z kasy ZASTĄPIONY
        POMIAREM** — ścieżkę dowodzi smoke (N3 z testem negatywnym),
        a czas właściciela idzie na jeden pełny test w T4; **to NIE jest
        zaległość T2**; (4) higiena bramek jednym PR-em z krokiem, osobnym
        commitem. Piąta decyzja, po oddaniu kodu: przegląd **recenzentami
        agentami z agentem głównym jako krytykiem** (wariant tańszy —
        przegląd własny — odrzucony).
        **T2 ZAMKNIĘTY W REPO (2026-08-30): PR #100 zmergowany do `main`,
        tag `v0.56.0` + release, gałąź skasowana, artefakt zweryfikowany
        (`git diff origin/main <szczyt>` PUSTY — lekcja z 0.37.0).** Merge
        decyzją właściciela na dowodach lokalnych: CI padło z **zerem
        kroków we wszystkich zadaniach** — **2118 minut Actions w sierpniu
        przy limicie 2000**, czyli rozliczenie, nie kod (sprawdzone
        `gh api …/billing/usage`). Po powrocie CI (1 września) potwierdzić
        **gitleaks**, jako jedyny bez lokalnego odpowiednika.
        **KROK T3 — TIMER WIZYT — ZROBIONY (2026-08-30, wersja 0.57.0,
        gałąź `feat/t3-timer-wizyt`, 7 commitów). PR NIEOTWARTY —
        czeka na naprawy z przeglądu.** Monitoring mierzy ruch: kontrola
        melduje „Czujki: logowania, ruch", ekran pokazuje okna dziś / 7 /
        30 dni i dziesięć najczęściej czytanych stron.
        **CZYTAĆ PRZED PRACĄ: [docs/plugin-3/KROK-T3.md](docs/plugin-3/KROK-T3.md)**
        — audyt planu, pomiary, znaleziska, testy i pułapki.
        **KROK POPRZEDZIŁ AUDYT PLANU** (polecenie właściciela: „wykonaj
        dokładny audyt planu T3… zależy nam, żeby jak najmniej poprawek
        było później"). Audyt znalazł **sześć błędów krytycznych w planie,
        który agent sam napisał** — każdy dawałby awarię BEZOBJAWOWĄ, bo
        beacon odpowiada 204 i na przyjęcie, i na odrzut:
        (1) **sito ze schematu odrzuciłoby cały interesujący ruch** —
        `url_to_postid()` zwraca **0** dla `/szkolenia/`, obu stron
        sprzedażowych, wszystkich 73 lekcji i strony głównej;
        (2) **formuła `wejscie = now() − trwanie_ms` przestała działać**
        po wyborze czasu AKTYWNEGO (karta czytana 2 minuty i zamknięta po
        ośmiu godzinach zapisałaby wejście sprzed chwili);
        (3) **brak wymogu `Content-Type` czynił sito na `Origin`
        dekoracją** — zmierzone: cross-origin beacon `text/plain`
        DOCHODZI, ten sam ładunek jako `application/json` NIE (preflight,
        na który WordPress odpowiada 403 i `exit`);
        (4) **`pagehide` i `visibilitychange` odpalają w TEJ SAMEJ
        milisekundzie** → bez flagi każda odsłona zapisałaby się dwa razy;
        (5) **powrót z bfcache przywraca stronę z zachowanym stanem JS**
        → bez resetu flagi nawigacja „wstecz" nie liczyłaby się wcale;
        (6) **`Origin` JEST wysyłany przy żądaniu same-origin** — wbrew
        MDN, zmierzone rigiem.
        **CZTERY ROZSTRZYGNIĘCIA WŁAŚCICIELA (2026-08-30):** podpis strony
        zamiast `url_to_postid()`; czas AKTYWNY (zegar stoi przy ukrytej
        karcie); sama ścieżka bez query; przegląd recenzentami-agentami.
        **SIEDEM AKCEPTACJI** (A1–A7 w KROK-T3.md), w tym: **odsłony będą
        ZANIŻONE** o wyjścia bez beaconu (wariant „dwa beacony" odrzucony),
        sól podpisu WŁASNA w opcji (odporna na rotację kluczy WP), skrypt
        zostaje też na koszyku i kasie.
        **LICZBY Z POMIARU, NIE Z ZAŁOŻENIA:** sufit ciała **1024 B**
        (realny beacon 168 B, maksimum kontraktu 270 B); sufit **300
        beaconów/min** (sterowana przeglądarka wyciska 294 odsłony/min
        z jednego adresu); **indeksy BEZ ZMIAN** — pokrywające dają 34 ms
        na ekranie admina, a kosztują zapis **2,9× droższy** i **+33 MB**
        (pomiar na 200 000 wierszy); sufit czasu 4 h **z przycinaniem**.
        **SZEŚĆ RZECZY WYSZŁO DOPIERO PRZY PISANIU KODU** (KROK-T3.md §9):
        podawanie skryptu bez `Throwable` na ścieżce kasy (złapał strażnik
        z T2), reguła N1 zakazująca akcji w CAŁEJ wtyczce, **strona 404
        rozdająca podpisy na zmyślone ścieżki** (renderuje się dla
        DOWOLNEGO adresu — wystarczyłoby wziąć podpis ze źródła i zatruć
        „top 10 stron"), własne reguły strażnika pytające o NAPIS zamiast
        o rozstrzygnięcie (szósty nawrót), dosłowne `&quot;` na ekranie,
        reguła zapalająca się fałszywie na cytacie blokowym.
        **SZEŚĆ PUŁAPEK POMIARU (wrócą, KROK-T3.md §10):** zła nazwa
        zmiennej w teście mierzy co innego (`WP_HASLO` zamiast
        `WP_ADMIN_HASLO` → mierzyłem gościa zamiast admina); surowy Firefox
        nie nawiguje w tej samej karcie z drugiej instancji, a `SIGKILL`
        nie daje szansy na `pagehide`; **Node trzyma keep-alive, a Apache
        zrywa bezczynne** — zerwane połączenie wygląda jak awaria naszego
        endpointu; **`goBack()` i `history.back()` przez BiDi NIE DZIAŁAJĄ**
        (timeout 30 s, adres bez zmian, zepsuta sesja); strona z bfcache
        **nie emituje `load`**, tylko `pageshow`; po zmianie pliku PHP
        trzeba odczekać ~4 s na `opcache`.
        **STAN DOWODÓW:** `npm run check` kod 0, strażnicy **37/37**
        (`straznik-monitora-wp` 13 → **18 reguł**), audyt mutacyjny
        **273 mutacje** (271 złapanych, 0 przeoczonych, 0 martwych,
        2 pominięte bez materiału), **`smoke-wp-monitor` 76 → 129
        sprawdzeń** i od teraz **WYMAGA `ZRZUTY_RIG`** (endpoint
        sprawdzony `fetch`em nie dowodzi niczego). Czternaście bramek WP
        zielonych: dane 30 · front 84 · tutor 44 · lekcja 39 · kreator 97 ·
        panel 55 · płatności 23 · produkty 85 · zakup 41 · zwroty 39 ·
        maile 62 · język 25 · motyw 91 · monitoring 129. Proza **73/73 co
        do znaku**, kopia w Tutorze **0 różnic**.
        **KLUCZOWA ASERCJA BRAMKI to JEDNA LICZBA:** przelot prawdziwą
        przeglądarką ma dać **dokładnie trzy** wiersze — dwa znaczą, że
        powrót z bfcache nie jest liczony, sześć, że każda odsłona
        zapisuje się dwa razy, zero, że cała ścieżka jest martwa.
        **ŚRODOWISKO `:8892` ZOSTAJE CZYSTE:** tabele monitoringu puste,
        kontrola kod 0, konto `klient-test` (NIE kasować — potrzebne
        bramkom).
        **PRZEGLĄD ZROBIONY, NAPRAWY WYKONANE (2026-08-31) — 21 znalezisk,
        20 potwierdzonych uruchomieniowo, JEDNO OBALONE (B3: asercja na
        `wejscie` istniała od T3). Cztery tury, cztery commity, każdy
        z testami negatywnymi. Werdykt KAŻDEGO znaleziska i podsumowanie:
        [docs/plugin-3/PRZEGLAD-T3.md](docs/plugin-3/PRZEGLAD-T3.md)**;
        pełnia zmian: CHANGELOG 0.57.0, sekcja „Naprawy z przeglądu T3".
        **NAJWAŻNIEJSZE, CZEGO NIE WYPROWADZAĆ OD NOWA:**
        (a) **czas aktywny** — skrypt wysyła beacon przy KAŻDYM zniknięciu
        karty, a jeden wiersz na odsłonę robi kolumna `odslona` (32 hex)
        z UNIQUE; wartości rosną monotonicznie w SQL-u (`GREATEST`/`LEAST`),
        bo `sendBeacon` nie obiecuje kolejności dostarczenia;
        (b) **limiter** ma okno KOTWICZONE do pełnej minuty zegara
        (`set_transient` odnawia TTL, więc okno liczone od pierwszego
        żądania nie kończy się nigdy) i liczy WYŁĄCZNIE beacony przyjęte;
        (c) **dwa sufity, różne zachowanie**: czas czytania przycinamy
        (4 h), wiek odsłony ponad 30 dni ODRZUCAMY — przycięty wiek to
        zmyślona godzina wejścia;
        (d) **kolumna `bramka`** i filtr `aai_monitor_strona_za_bramka`:
        monitoring nie wie, co jest bramką logowania — odpowiada widok
        lekcji Pluginu 1, a flaga jedzie w PODPISYWANYM materiale, więc
        jest niepodrabialna;
        (e) **sól podpisu** powstaje zapisem pustym przy konflikcie, NIE
        przez `add_option()` (ten pisze `INSERT … ON DUPLICATE KEY UPDATE`
        i kasuje sól zwycięzcy, unieważniając podpisy stron już wysłanych
        do przeglądarek);
        (f) **kontrola świeci kod 1**, gdy `admin_url()` i `home_url()`
        mają różne pochodzenie (beacon jedzie wtedy cross-origin i nie
        zapisuje się ANI RAZU, bez innego objawu).
        **SZEŚĆ BŁĘDÓW POWSTAŁO W SAMYCH NAPRAWACH**, wszystkie złapane
        testami negatywnymi: dwie ślepe reguły strażnika, blok pomiaru
        kasujący CUDZE wiersze (przez co rachunek sumienia przestawał
        cokolwiek znaczyć), poprawka zabierająca istniejącym asercjom ich
        zmienną, martwa asercja przez `ob_start()` (bo `WP_CLI::error()`
        KOŃCZY PROCES — ta sama pułapka zafałszowała wcześniej moją sondę)
        i **dziewiąty nawrót pułapki „wzorzec na napis"**, tym razem
        w regule napisanej PO opisaniu jej w tym samym przeglądzie.
        **PUŁAPKA PRACY, DWA RAZY W JEDNEJ SESJI:** kopia zapasowa pliku
        zrobiona w KOLEJNEJ turze testów negatywnych jest już kopią wersji
        ZMUTOWANEJ, a `git checkout --` użyty do przywracania kasuje
        niezacommitowaną pracę. Przywracaj z kopii zrobionej PRZED pierwszą
        mutacją i sprawdzaj stan `git diff`, nie pamięcią.
        Stan dowodów: `npm run check` kod 0, strażnicy **37/37**, audyt
        mutacyjny **288**, `smoke-wp-monitor` **170**, czternaście bramek WP
        zielonych, proza 73/73, kopia w Tutorze 0 różnic.
        **ZOSTAJE OTWARTE ŚWIADOMIE:** A11 — na hostingu z cache'em stron
        każda odsłona to dodatkowy, niebuforowalny przebieg PHP (~45–50 ms);
        decyzja właściciela: pozycja wdrożeniowa, kodu nie ruszamy.
        **T3 ZAMKNIĘTY W REPO (2026-08-31): PR #102 zmergowany do `main`,
        tag `v0.57.0` + release, gałąź skasowana, artefakt zweryfikowany
        (`git diff origin/main <szczyt>` PUSTY — lekcja z 0.37.0).** Merge
        decyzją właściciela na dowodach lokalnych: CI padło w 2 s z **zerem
        kroków we wszystkich zadaniach** (sprawdzone przez API: `steps: 0`,
        logów brak) — wyczerpane minuty Actions, nie kod. Po powrocie CI
        (1 września) potwierdzić **gitleaks**, jako jedyny bez lokalnego
        odpowiednika.
        **KROK T4 — TEST RĘCZNY WŁAŚCICIELA — ZALICZONY (2026-08-31, wersja
        0.58.0). WTYCZKA `aai-monitor` JEST SKOŃCZONA, a razem z nią WSZYSTKIE
        TRZY WTYCZKI ETAPU WORDPRESS.** PR #104 zmergowany do `main`, tag
        `v0.58.0` + release; artefakt zweryfikowany (`git diff origin/main
        <szczyt>` PUSTY — lekcja z 0.37.0). Merge decyzją właściciela na
        dowodach lokalnych: CI padło z **zerem kroków we wszystkich
        zadaniach** (wyczerpane minuty Actions), czyli rozliczenie, nie kod.
        **Limit wraca 1 WRZEŚNIA — wtedy potwierdzić `gitleaks`**, jako jedyny
        bez lokalnego odpowiednika (czeka od trzynastu wersji).
        Przebieg, liczby i decyzje:
        [docs/plugin-3/TEST-RECZNY-T4.md](docs/plugin-3/TEST-RECZNY-T4.md).
        **TEST ZADZIAŁAŁ W TRZECH KIERUNKACH NARAZ** i to jest jego lekcja
        na przyszłe testy ręczne:
        (1) **wyciągnął rzecz niewidzialną dla czternastu bramek** — pod
        kafelkami stało „Kafelki liczą wszystko od początku pomiaru", a drugi
        kafelek nazywał się „Nieudane próby (7 dni)"; jedno zdanie opisywało
        cztery liczby, z których jedna liczy się inaczej. Napisów przy
        liczbach nie pilnowało NIC;
        (2) **przy dwóch zgłoszeniach kod miał rację i zamknęliśmy je
        POMIAREM, nie naprawą** — „naprawa" zepsułaby działający kod;
        (3) **wymusił znalezienie luki w dowodach**, bo musiałem ręcznie
        zmierzyć coś, czego nie umiała zmierzyć żadna bramka.
        **CO WESZŁO DO 0.58.0:** każdy kafelek niesie własny okres (T4-D1;
        **NIE zdejmować go w imię zwięzłości — cofnęłoby to naprawę A3
        z przeglądu T3**), asercja ciągłości sesji i asercje o podpisach
        kafelków w `smoke-wp-monitor` (170 → **174**), sprostowana
        sprzeczność w README o krokach T1–T3.
        **DWA ZGŁOSZENIA ZAMKNIĘTE POMIAREM — NIE OTWIERAĆ ICH OD NOWA:**
        (a) **„czas niższy niż na zegarku"** (18 s przy ~30 s czytania,
        37 s przy ~60 s). Zmierzone rigiem: 30 s bez przerwy → **30 130 ms**
        w bazie; 15 s + 10 s ukryte + 15 s → **30 016 ms**. Zegar jest
        dokładny co do dziesiątych sekundy, naprawa B1 z T3 trzyma,
        a **zmiana pulpitu chowa okno tak samo jak przełączenie karty** —
        liczby pokazywały prawdziwy czas WIDOCZNOŚCI;
        (b) **„cztery sesje przy jednym oknie prywatnym"**. Zmierzone: cztery
        strony przeklikane w JEDNEJ karcie (katalog → kurs → lekcja płatna →
        lekcja darmowa, więc także trasy lekcji) trzymają jeden identyfikator.
        Część adresów otwarto z linków, czyli w nowych kartach — a to
        z definicji nowe sesje („drzewo kart", nie „osoba").
        **LUKA W DOWODACH, KTÓRĄ TO ODSŁONIŁO:** bramka pytała o DŁUGOŚĆ
        identyfikatora sesji (32 znaki), nie o to, czy dwie strony z jednej
        karty mają TEN SAM. Gdyby `idSesji()` przestało czytać
        `sessionStorage`, „Sesje" zrównałyby się z „Odsłonami", właściciel
        czytałby liczbę stron jako liczbę odwiedzających, a **wszystkie
        pozostałe sprawdzenia świeciłyby na zielono**.
        **SIÓDMY NAWRÓT PUŁAPKI „WZORZEC NA OBECNOŚĆ, NIE NA
        ROZSTRZYGNIĘCIE"** (0.29.0 nazwa metody, 0.44.0 nazwa stałej, 0.47.0
        napis, c6c9c97, dwa razy w P4) — tym razem w regule pisanej PRZEZ ten
        sam przegląd, który tę pułapkę opisuje: liczyła znaczniki
        `class="aai-monitor-okres"`, więc mutacja ustawiająca okres na PUSTY
        łańcuch przeszła na zielono. Złapał to **test negatywny, nie lektura**.
        **UWAGA EKSPLOATACYJNA — NIE BRAĆ ZA WYCIEK:** bramka **UBITA**
        (limit czasu, `KILL`) zostawia swoje wiersze, a kolejny przebieg ich
        NIE usuwa — sprzątanie idzie wyłącznie od WŁASNEJ migawki `MAX(id)`,
        żeby nigdy nie skasować cudzych danych. Ślady testowe rozpoznaje się
        po loginie `smoke-`, adresie z `203.0.113.0/24` i ścieżce
        `/smoke-monitor/` — kasować po tych znakach, NIGDY po zakresie
        identyfikatorów. Rosnące `AUTO_INCREMENT` przy zgadzającej się liczbie
        wierszy to norma, nie regresja.
        **OBSERWACJA, NIE ZGŁOSZENIE:** zalogowany `klient-test` na adresie
        `wp-admin/admin.php?page=aai-monitor` dostaje goły ekran „Brak
        uprawnień" bez drogi powrotnej do sklepu (ta sama klasa co zgłoszenie
        z P6). Odmowa jest POPRAWNA (`manage_options`), a wchodzi się tam
        wyłącznie wpisując adres panelu ręcznie — żaden nasz odnośnik tam nie
        prowadzi.
        **STAN DOWODÓW NA KONIEC T4:** `npm run check` kod 0, strażnicy
        **37/37**, audyt mutacyjny **288** (286 złapanych, 0 przeoczonych,
        0 martwych), czternaście bramek WP zielonych: monitoring **174** ·
        kreator 97 · motyw 91 · produkty 85 · front 84 · maile 62 · panel 55 ·
        tutor 44 · zakup 41 · lekcja 39 · zwroty 39 · dane 30 · język 25 ·
        płatności 23; proza **73/73 co do znaku**, kopia w Tutorze
        **0 różnic**.
        **ŚRODOWISKO `:8892` ZOSTAJE POSTAWIONE:** pięć wtyczek aktywnych,
        sprzedaż otwarta, kursy 2, konto `klient-test` (NIE kasować — hasło
        w `wordpress/srodowisko/.env`), skrzynka `127.0.0.1:8893`, kontrola
        kod 0. **W tabelach monitoringu zostają dane z testu właściciela:
        12 logowań, 16 odsłon, 6 sesji** — materiał dowodowy, nie śmieci.

        **═══ NASTĘPNY KROK CAŁEGO PROJEKTU: TEST CAŁOŚCI TRZECH WTYCZEK ═══**
        **DECYZJA WŁAŚCICIELA (2026-08-31): ROZBUDOWY EKRANU NIE ROBIMY.**
        Panel monitoringu zostaje taki, jaki jest — „nie trzeba go poprawiać,
        najważniejsze informacje są". To **ODWOŁUJE krok T5** zapowiedziany
        decyzją T4-D4 z tego samego dnia: siedem pozycji zakresu (punkt
        odniesienia do poprzedniego okresu, lejek katalog → kurs → bramka,
        strony wejściowe, sesje jednostronicowe, kafelek „ostatnia
        aktywność", serie nieudanych logowań z jednego adresu, eksport CSV)
        **NIE wchodzi do projektu**. Decyzje T4-D2 i T4-D3 zostają
        w [TEST-RECZNY-T4.md](docs/plugin-3/TEST-RECZNY-T4.md) jako **zapis
        historyczny** — gdyby ekran kiedyś rozbudowywać, gotowy zakres jest
        tam wyprowadzony z danych, które już zbieramy. **Nie proponować tego
        z własnej inicjatywy.**
        Ekran w wersji przyjętej (0.58.0) pokazuje: cztery kafelki, każdy
        z własnym okresem; dziennik logowań z filtrem „tylko nieudane";
        ruch w oknach dziś / 7 / 30 dni z odsłonami, sesjami, czasem łącznym
        i średnim; najczęściej czytane strony; osobno odsłony zatrzymane na
        bramce logowania. To jest komplet — właściciel ocenił go jako
        wystarczający w teście ręcznym T4.
        **TEST CAŁOŚCI TRZECH WTYCZEK — W TOKU (2026-08-31), gałąź
        `docs/panel-zostaje-jaki-jest`. DOKUMENT KROKU:
        [docs/TEST-CALOSCI-WP.md](docs/TEST-CALOSCI-WP.md) — CZYTAĆ PRZED
        PRACĄ** (zakres, werdykty wszystkich znalezisk, pułapki, stan
        środowiska, lista roboty do dokończenia).
        Zakres zatwierdzony przez właściciela: **przegląd architektury I test
        ręczny**, środowisko **odtworzone OD ZERA** ze zrzutem i przywróceniem
        danych dowodowych, warsztat motywu `:8890` **pominięty**, przegląd
        **recenzentami-agentami z agentem głównym jako krytykiem**.
        **DZIEWIĘĆ ZNALEZISK POTWIERDZONYCH URUCHOMIENIOWO, OSIEM JUŻ
        NAPRAWIONYCH** (dwa commity na gałęzi):
        (1) **wyciek CAŁEGO produktu** — `/?post_type=lesson` oddawało
        gościowi 73 lekcje prozy (8 stron × 10) i to samo kanałem RSS, przy
        zielonych wszystkich 14 bramkach i 37 strażnikach; zamknięte trzema
        zamkami (`register_post_type_args`, `pre_get_posts` z PUSTYM wynikiem,
        404 w odpowiedzi) — **samo `set_404()` nie wystarcza, bo motyw bez
        `404.php` i tak drukuje znalezione wpisy**;
        (3) **brak JEDNEGO pliku wtyczki = HTTP 500 na całej witrynie**
        (monitoring i szew płatności) — cały start jest teraz w `try/catch`;
        (6) **każde 404 poza `/szkolenia/` było pustym ekranem** (motyw nie ma
        `404.php`) — nasz szablon obsługuje teraz całą witrynę;
        (5) **`/product/<slug>/` był drugą stroną sprzedażową** w wyglądzie
        Woo → **301** na naszą;
        (7) **strażnicy NIE pilnowali zakazu pisania do cudzych tabel**, choć
        kod to obiecywał (mutacja przechodziła 37/37) — reguła 11
        `straznik-wtyczki-wp`;
        (8) **dwie bramki przechodziły tylko dzięki śmieciom po ręcznych
        testach** (`wp-zwroty` wymagał otwartej sprzedaży, `wp-jezyk` konta
        roli `customer`) — obie tworzą teraz własną scenę i przywracają stan;
        (9) **`postaw.sh` nie wstawał OD ZERA** (kolejność tłumaczeń);
        (10) `/kontakt` bez ukośnika → 301.
        **CZTERY DECYZJE WŁAŚCICIELA Z 2026-08-31 — WSZYSTKIE WYKONANE**
        (5 commitów na gałęzi, każdy z testami negatywnymi):
        **C1** — ukrycie kursu przestaje odbierać dostęp kupującym: status kopii
        w Tutorze to dziś DWIE mapy — kurs ukryty zostaje `private`, materiał
        (moduły i lekcje) zostaje `publish`. **Kursu NIE WOLNO zostawić
        `publish`**: `Course::enroll_now()` to publiczny handler POST, który
        zapisuje na każdy kurs niebędący `purchasable`, a ukryty ma
        `price_type = free` — zatrzymuje go WYŁĄCZNIE `private` (`draft` też by
        przepuścił). Zmierzone testem negatywnym: przy `publish` obcy zapisał
        się na ukryty kurs i dostał cały materiał. Dostępu i tak nie pilnuje
        status wpisu, tylko ZAPIS (`has_enrolled_content_access()` =
        `is_enrolled()`, a `get_enrolled_courses_ids_by_user()` o status nie
        pyta). **Darmowe zapowiedzi gasną razem z kursem** (decyzja właściciela).
        **C3** — strona mówi „Dostęp zaraz po zaksięgowaniu wpłaty"; FAQ
        tłumaczy to zdaniem. Zmienione w obu bazach (`db1:sekcje` → `wp:import`),
        w szablonie WP i w prototypie. Pilnuje `smoke-wp-front`, który pyta
        INSTALACJĘ o włączone metody płatności — po podpięciu prawdziwej bramki
        reguła sama przestanie się tego czepiać.
        **C2** — panel pyta „ten kurs ma N kupujących — stracą dostęp" i wymaga
        drugiego, osobnego kliknięcia; pytanie pojawia się TYLKO przy kursie,
        który ktoś ma. Bramka siedzi w warstwie zapisu, więc chroni też komendę
        (`--pozwol-stracic-dostep`). Liczbę daje Tutor
        (`count_enrolled_users_by_course`, zapisy `completed`).
        **C2b (rozstrzygnięte)**: po wymuszonym usunięciu na produkcie-sierocie
        zostaje znacznik z liczbą, a kontrola `wp aai-platnosci sprawdz` kończy
        **kodem 1 tylko wtedy, gdy kurs miał kupujących**.
        **Pozycja 4** — kontrola przestała meldować zerem sklep, który sprzedaje
        bez danych: przy braku zależności liczy kupowalne produkty i przy
        niezerowym wyniku kończy kodem 1. Zachowania sprzedaży NIE zmieniamy —
        od zamykania sklepu jest komenda (zmierzone: `sprzedaz zamknij` blokuje
        koszyk także przy wyłączonym Pluginie 1).
        **Przy okazji naprawione:** `Aai_Sklep_Panel_Akcje::usun_kurs()` niosła
        od W4 wklejony blok z trzema zmiennymi, których w tej metodzie nie ma
        (kurs o pustym slugu wywróciłby usuwanie fatalem); `smoke-wp-jezyk`
        wywracał się na `wp option get` przy nieistniejącej opcji sprzedaży
        (13. reguła `straznik-higieny-smokow`); `Aai_Platnosci_Zapis::kurs_tutora('')`
        dostał obronę przed pustym uuid, którą Plugin 1 ma od sweepu P5.
        **Stan dowodów:** `npm run check` kod 0 (strażnicy 37/37, testy 83/83),
        audyt mutacyjny **305** (0 przeoczonych, 0 martwych), czternaście bramek
        WP zielonych (kreator 96→**102**, lekcja 47→**57**, front 84→**86**),
        proza 73/73 co do znaku, kopia w Tutorze 0 różnic.
        Sześć pozycji „plauzybilnych" **poza pustym uuid zostaje otwartych
        świadomie** — żadna nie jest dziś czynna.
        **STAN DOWODÓW:** `npm run check` kod 0 (strażnicy 37/37, testy 83/83),
        audyt mutacyjny **293** (0 przeoczonych, 0 martwych), czternaście
        bramek WP zielonych (lekcja 47, zakup 41, zwroty 39, maile 46,
        monitor 174, front 84, kreator 96, panel 54, motyw 89, produkty 84,
        tutor 44, dane 30, język 25, płatności 23), proza 73/73 co do znaku,
        kopia w Tutorze 0 różnic.
        **ŚRODOWISKO `:8892` POSTAWIONE OD ZERA:** pięć wtyczek, kursy 2,
        lekcje z treścią 73, zrzuty 148, produkty 2, powiązania 2,
        **zamówienia 0**, konta `admin` i `klient-test`, **sprzedaż
        ZAMKNIĘTA** (stan domyślny — otworzyć przed testem ręcznym).
        Dane monitoringu właściciela z T4 **przywrócone co do wiersza**
        (12 logowań, 16 odsłon, 6 sesji). Zamówienia i konta z jego
        wcześniejszych testów NIE wróciły — pełny zrzut bazy sprzed
        odtworzenia leży w `~/.cache/aai-kopie/pelny-zrzut-przed-testem-calosci.sql`.
        **SCENARIUSZ TESTU RĘCZNEGO NAPISANY I ODDANY:
        [docs/TEST-RECZNY-CALOSC.md](docs/TEST-RECZNY-CALOSC.md)** — jedna
        ścieżka w dziesięciu krokach przez wszystkie trzy wtyczki (gość →
        zakup nowym kontem → poczta → klient czyta → kreator → „Ukryj" →
        „Usuń" → monitoring → strona motywu), z zaznaczonymi SZWAMI i tabelą
        „czego nie zgłaszać". **Przelot kontrolny przed oddaniem: 37/37**
        (`tools/smoke/przelot-calosc.mjs` — SONDA, nie bramka, poza
        `npm run check`; sprząta po sobie stan kursu i dziennik logowań).
        **NASTĘPNY KROK CAŁEGO PROJEKTU: TEST WŁAŚCICIELA** → poprawki
        → **CHANGELOG + README** (jeszcze NIE zrobione — dziewięć commitów na
        gałęzi nie ma wpisu w CHANGELOG, tak zaplanowano: wpis powstaje razem
        z poprawkami z testu) → **PR jedną gałęzią** (razem z zapisem
        o odwołanej rozbudowie ekranu) → tag → release. Obowiązuje reguła
        z 2026-08-28: plan + pytania + zgoda przed pracą.
        **PRZYCISK „USUŃ KURS" NIE JEST NOWY** — jest w kokpicie od W4
        (`f31b69f`); C2 dołożyło do niego hamulec. Właściciel wybrał wariant
        „dołóż hamulec" z trzech; „zablokuj na głucho" i „wyjmij przycisk
        z kokpitu" są ODRZUCONE, nie odłożone.
        **Brzmienie zdania o dostępie (C3) jest propozycją agenta** —
        właściciel może je zmienić; bramka pilnuje PRAWDZIWOŚCI zdania wobec
        włączonych metod płatności, nie jego dokładnych słów.
        **Sprzedaż jest już OTWARTA** (otwarta pod test ręczny), zamówień 0,
        kont dwa (`admin`, `klient-test`). Kopia bazy sprzed testu:
        `~/.cache/aai-kopie/przed-testem-calosci-recznym.sql` — jest, bo krok 8
        scenariusza dotyka przycisku „Usuń".
        **W dzienniku monitoringu leży 12 logowań i 16 odsłon właściciela z T4 —
        nie kasować.** Ubita bramka zostawia swoje wiersze i kolejny przebieg
        ich NIE usuwa (sprzątanie idzie od własnej migawki); takie ślady kasować
        jawną listą identyfikatorów, nigdy zakresem.

        Zapis historyczny (scenariusz T4, przed jego zaliczeniem):
        SCENARIUSZ WIĄŻĄCY:
        [docs/plugin-3/TEST-RECZNY-T4.md](docs/plugin-3/TEST-RECZNY-T4.md)
        — CZYTAĆ PRZED PRACĄ** (wzorzec: [TEST-RECZNY-P6.md](docs/plugin-2/TEST-RECZNY-P6.md)).
        **Ten test jest inną klasą pracy niż W6 i P6:** klient nie widzi
        z monitoringu NICZEGO — nie ma ekranu do kliknięcia ani maila do
        odebrania. Jedynym odbiorcą jest właściciel, a produktem są LICZBY,
        więc test odpowiada na pytanie, którego bramka zadać nie umie: czy
        liczby mówią prawdę o tym, co właściciel naprawdę zrobił, i czy
        napisy nad nimi znaczą to, co on przez nie rozumie. Cztery ścieżki:
        dziennik logowań → pomiar ruchu (**wymaga okna prywatnego — admin
        z definicji nie jest mierzony, D3**) → czy liczby dają się
        zrozumieć → czy nie zepsuliśmy Pluginów 1 i 2. Dokument ma też
        tabelę rzeczy POZA zakresem, żeby właściciel nie zgłaszał jako błąd
        tego, co sam rozstrzygnął (D3, D4, D6) albo co jest świadomą
        granicą.
        **ŚRODOWISKO `:8892` ZOSTAJE POSTAWIONE I CZYSTE:** pięć wtyczek
        aktywnych, **obie tabele monitoringu PUSTE** (celowo — po teście
        każda liczba ma znanego autora), sprzedaż otwarta, kursy 2, konto
        `klient-test` (NIE kasować), skrzynka `127.0.0.1:8893`,
        `wp aai-monitor sprawdz` kod 0.
        (Zapis historyczny: „PO T4 zostaje TEST CAŁOŚCI" — dalej aktualne
        i od decyzji z 2026-08-31 jest to następny krok WPROST: rozbudowa
        ekranu została odwołana, patrz wyżej.)
        Zapis historyczny (stan przed naprawami):
        (raporty obu recenzentów, dowody uruchomieniowe, plan napraw
        w czterech turach, cztery pytania do właściciela).
        **DECYZJA WŁAŚCICIELA (2026-08-30): kolejność to `/clear` →
        NAPRAWY → PR + tag + release → T4** (test ręczny właściciela).
        **DWA NAJCIĘŻSZE ZNALEZISKA, oba potwierdzone pomiarem:**
        (1) **czas aktywny URYWA SIĘ przy pierwszym przełączeniu karty** —
        1500 ms + przerwa + 4000 ms dało w bazie `trwanie_ms = 1531`
        zamiast 5531; po `hidden` flaga wysyłki zostaje, a powrót do karty
        (`visible` bez `pageshow`, bo to nie bfcache) nie wznawia pomiaru.
        Ekran i schemat obiecują „ile realnie czytali" — obietnica
        niedotrzymana;
        (2) **limiter jest KUMULACYJNY, nie „na minutę"** — `set_transient`
        odnawia TTL przy każdym przyjętym beaconie, więc licznik nie wraca
        do zera, dopóki przerwy są krótsze niż 60 s; do tego odrzucone
        beacony też zżerają limit. Za proxy (jeden `REMOTE_ADDR` dla
        wszystkich) ktoś śledzący ~6 żądań/s po cichu wyłącza pomiar dla
        CAŁEJ witryny, przy `sprawdz` kod 0.
        **CZTERY REGUŁY STRAŻNIKA, KTÓRE SAM NAPISAŁEM, PYTAJĄ O OBECNOŚĆ
        NAZWY zamiast o rozstrzygnięcie** (siódmy nawrót pułapki — tym
        razem w kodzie napisanym PO tym, jak opisałem ją w audycie);
        jedno wymaganie (`try/catch` przy `sessionStorage`) nie jest łapane
        przez NIC, a mechanizm z najcięższego znaleziska audytu
        (`wejscie = now() − wiek_ms`) nie ma ANI JEDNEJ asercji.
        **CO RECENZENCI SPRAWDZILI I UZNALI ZA BEZ ZARZUTU** (nie szukać
        drugi raz): wstrzyknięć nie ma; podpisu nie da się wyprosić na
        zmyśloną ścieżkę (11 wariantów → 404/301, zero znaczników); sito
        odrzuca komplet złych beaconów, w tym ciało 5 MB bez
        `Content-Length` w 49 ms bez wciągania do pamięci; strefy czasowe
        policzone poprawnie; beacon zalogowanego klienta dojeżdża;
        `hash_equals` nie daje sondy; znacznik w HTML poprawny i nieobecny
        na 404; blok sita i asercja „trzy wiersze" w bramce są nieślepe.
        **Żadna inna bramka NIE produkuje wizyt** (zmierzone przelotem
        z licznikiem `AUTO_INCREMENT`: 150 → 150) — skrypt wyłącza się
        przy `navigator.webdriver`, a tylko `smoke-wp-monitor` tę flagę
        nadpisuje.
     **POZA MODUŁAMI, przed pierwszym klientem** (spinane na bieżąco,
     decyzja 4b): prawdziwa bramka płatności (Tpay/PayU/P24 — wtyczka do
     Woo), regulamin (właściciel), zgoda w kasie na natychmiastowe
     dostarczenie (wyłącza ustawowe 14 dni), domena + HTTPS, poczta
     produkcyjna.

     Zapis historyczny (zapowiedź przed wykonaniem): **NASTĘPNY KROK: P5**
     (zwroty i przypadki brzegowe) — wg reguły z 2026-08-28 najpierw PLAN kroku
     + pytania doprecyzowujące i CZEKAĆ NA ZGODĘ. P5 dziedziczy wymaganie:
     gwarancja 30 dni ma działać i odbierać dostęp do kursu. Razem z P5 wchodzą
     dwie niezrobione decyzje: zdjęcie z kasy zdania o „Warunkach i zasadach"
     i okładka produktu jako PNG renderowane przy synchronizacji.

     Zapis historyczny — scenariusz testu: **TEST RĘCZNY WŁAŚCICIELA NA `:8892`** (środowisko stoi,
     sprzedaż OTWARTA, skrzynka `127.0.0.1:8893`, konto `klient-test` przez
     `npm run wp:klient`, 1 zamówienie — jego własny zakup #1625). Wzorzec
     scenariusza: [W6-TEST-RECZNY.md](docs/plugin-1/W6-TEST-RECZNY.md).
     **SCENARIUSZ TEGO TESTU GOTOWY:
     [docs/plugin-2/TEST-RECZNY-0.51.0.md](docs/plugin-2/TEST-RECZNY-0.51.0.md)**
     — cztery obszary do sprawdzenia i tabela rzeczy POZA zakresem, żeby
     właściciel nie zgłaszał jako błąd tego, co sam rozstrzygnął albo co
     należy do P5.
     Potem: poprawki z testu + trzy decyzje jedną gałęzią → **P5** (zwroty
     i przypadki brzegowe) → **P6**.

     Zapis historyczny zgłoszenia: Właściciel przetestował P4 sam (2026-08-29) i zgłosił:
     **BLAD-023** koszyk kumuluje kursy, choć przycisk obiecuje jeden (klik
     „Dołączam za 299 zł" → kasa na 648 zł); **BLAD-024** kasa, koszyk i konto
     po angielsku; **BLAD-025** gołe powiadomienie WordPressa „Password Changed"
     od `wordpress@127.0.0.1` po ustawieniu hasła. Polecenie właściciela:
     **przeszukać PODOBNE KLASY bardzo szczegółowo — „dużo ich jest"**.
     Cztery klasy, trop o „cudzej edycji" widocznej klientowi w kasie i stan
     środowiska: **[docs/plugin-2/BLEDY-Z-TESTU-P4.md](docs/plugin-2/BLEDY-Z-TESTU-P4.md)
     — CZYTAĆ PRZED PRACĄ.** Środowisko `:8892` zostało **ze sprzedażą OTWARTĄ
     i NIEPOSPRZĄTANE** (zamówienia i konta z testu to materiał dowodowy).
     Dopiero po tym: PR gałęzi P4, potem **P5** (zwroty i przypadki brzegowe)
     i **P6** (test ręczny właściciela).

     ~~**NASTĘPNY KROK CAŁEGO PROJEKTU: P4 — konto przy zakupie, dwa maile,
     tabela `dostawy`, zdjęcie blokady sprzedaży.**~~ ZROBIONE — patrz wyżej. Wg reguły właściciela
     (2026-08-28) **najpierw plan przebiegu kroku + pytania doprecyzowujące
     i CZEKAĆ NA ZGODĘ, dopiero potem kod.** Wymagania, które P4 dziedziczy
     z P3b: mail „Ustaw hasło" przy `on-hold` (nie `completed`); flaga
     `aai_platnosci_sprzedaz_otwarta` na `tak` dopiero, gdy dostarczanie
     działa; `smoke-wp-zakup` otwiera sprzedaż WYŁĄCZNIE na czas pomiaru
     i przywraca stan.
     **REGUŁA WŁAŚCICIELA (2026-08-28), obowiązuje dla CAŁYCH Pluginów 2 i 3:
     przed KAŻDYM krokiem agent najpierw przedstawia plan przebiegu kroku
     (z tym, czego krok NIE dotyka) i pytania doprecyzowujące, i czeka na
     zgodę — dopiero potem kod.** Powód: najmniejszy błąd w tych modułach
     może być destrukcyjny dla całego projektu.
     Krytyka, którą schemat wprowadził, wg
     [docs/plugin-2/KRYTYKA-P0.md](docs/plugin-2/KRYTYKA-P0.md) — **54 znaleziska
     trzech krytyków** (A: architektura, B: cudzy kod i bezpieczeństwo,
     C: prostota i sprawdzalność), w tym **DZIEWIĘĆ krytycznych**.
     **Do przepisania dochodzą DWA POLECENIA WŁAŚCICIELA:** (a) schemat ma mieć
     **DWIE SEKCJE — jedną w języku pluginów tego projektu** (`BAZA → DZIAŁ →
     wystrzał AJAX → strony`, kanał JSON obok, WYTYCZNE §8) **i jedną w języku
     WordPressa** (haki, tabele, `admin-post.php`, meta); (b) baza, wystrzał
     i kanał JSON mają być w diagramach nazwane wprost.
     **ODPOWIEDŹ NA „AJAX Z BAZY DANYCH", którą trzeba mu przedstawić:**
     w WordPressie wystrzałem JEST `admin-post.php` — jeden kanał platformy
     z nazwanymi akcjami. Plugin 1 tak działa i **nie ma ani jednego
     `wp_ajax_*`**; obaj krytycy niezależnie wykreślili proponowany AJAX jako
     dublujący przycisk „Zapisz kurs". Szkielet z §8 zostaje, zmienia się nazwa
     kanału. ~~To wymaga potwierdzenia właściciela~~ **POTWIERDZONE 2026-08-28 (AJAX odpada — patrz wyżej).**
     **CZTERY ZNALEZISKA KRYTYCZNE (pełnia w KRYTYKA-P0.md):** (K1) klient
     dostaje konto, do którego nie ma jak wejść — mail z linkiem wisiał na
     `completed`, a przy przelewie zamówienie stoi na `on-hold`; (K2) cena na
     stronie rozjechałaby się z ceną w danych strukturalnych; (K3) filtry ceny
     nie mają JAK poznać kursu (`adres_zakupu()` bez argumentów, katalog
     renderuje w pętli) — „trzy minimalne zmiany w Pluginie 1" to nieprawda,
     jest ich ≥5; (K4) cztery niezmienniki nie dają się sprawdzić skryptem,
     a jeden celuje w NAZWĘ metody (nawrót lekcji z 0.29.0 i 0.44.0).
     **PIĘĆ KRYTYCZNYCH OD KRYTYKA B — każde potwierdzone w żywym kodzie:**
     (B1) wyłączenie zakupu gościa BEZ włączenia rejestracji w kasie daje
     **403 każdemu niezalogowanemu — nikt nie kupi niczego**; (B2) zła
     kolejność zapisu `_tutor_course_product_id` i `_tutor_course_price_type`
     **ROZDAJE KURS ZA DARMO** (`do_enroll()` tworzy zapis od razu
     `completed`, gdy kurs nie jest jeszcze „purchasable") — kolejność:
     `price_type` NAJPIERW, `product_id` NA KOŃCU; (B3) udokumentowana
     procedura `import` → `sync` zostawia **opublikowany, kupowalny produkt
     bez powiązania** = klient płaci i nie dostaje nic (produkt ma powstawać
     jako `draft`); (B4) `_aai_zrodlo_uuid` **nie jest wolny — siedzi już na
     90 wpisach Tutora z tymi samymi wartościami** (pomiar), więc wyszukanie
     bez `post_type` rozstrzyga losowo; (B5) zapis `_regular_price` metą
     zostawia `_price` po staremu (**katalog nowa cena, kasa stara**), a nasza
     kontrola jest na to ŚLEPA, bo porównuje właśnie zaktualizowane pole.
     **NAJLEPSZE UPROSZCZENIE Z KRYTYKI:** dostęp klienta nie musi wisieć na
     cudzej opcji Tutora — WooCommerce ma filtr
     **`woocommerce_order_item_needs_processing`** (B18), który rozwiązuje to
     u źródła; wariant `_downloadable = yes` od krytyka C jest słabszy.
     **Porównać obie drogi przy przepisywaniu i UDOWODNIĆ pomiarem w P3**,
     nie przyjmować na słowo.
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
