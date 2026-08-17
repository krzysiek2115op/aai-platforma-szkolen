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
- Repo `MatthewPlugins/matthewplugins.pl` **TYLKO do odczytu**
  (lokalny klon: `/home/krzysiek/Strona internetowa FIrma ` — ze spacją).
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
  strony głównej. Na podglądzie: **lokalna, NIEcommitowana** zmiana w klonie
  (`data/navigation.ts` — link `http://localhost:3001/szkolenia`; repo
  strony głównej pozostaje read-only, nic nie pushujemy). Przy finalnym
  merge do matthewplugins.pl dopisać `{ label: "Szkolenia", href: "/szkolenia" }`
  do `navLinks`.
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
  - Stan dowodów: strażnicy 11/11, testy 27/27, smoke D4/D5/D6 zielone.
- **NASTĘPNY KROK: Dział 7 — TREŚĆ docelowa obu kursów.** Kolejność:
  (1) domknąć D6 na GitHubie (PR/merge/tag — patrz „Stan repo"),
  (2) nowa gałąź `feat/d7-tresc` od `plugin-1-sklep-kursow`,
  (3) NAJPIERW pobrać oryginalną dokumentację do
  `docs/dokumentacja-techniczna/d7/` z `ZRODLA.md` (WYTYCZNE N2):
  dokumentacja Anthropic/Claude dla kursu 1, dokumentacja GitHuba dla
  kursu 2, (4) dopiero potem pisać treść — każda lekcja ma wskazane
  źródło, zero zmyślania. Wymóg właściciela: kursy **w 100% zgodne
  z programem** — moduły/lekcje to spis treści realnego materiału,
  strona nie obiecuje niczego spoza programu; do tego golden treści
  obu kursów (ochrona przed cichą utratą tekstu). Treść wprowadzamy
  **kreatorem** (to był sens D6), nie przez seed; obecna treść
  w `tools/seed/seed-przyklady.ts` jest ROBOCZA i do zastąpienia.
  Opinie w seedach to jawne placeholdery — prawdziwe dopiero po
  pierwszych sprzedażach, niczego nie zmyślamy.
- Stan repo: PR #12 zmergowany do `plugin-1-sklep-kursow`, tag
  `v0.12.1` + release. Gałąź `feat/d6-kreator` wypchnięta (kroki 1–3)
  — **PR/tag/release DO ZROBIENIA** (2026-08-17 GitHub miał awarię;
  gotowy opis: `docs/plugin-1/PR-D6.md`). `gh` jest zainstalowany
  (`~/.local/bin/gh`, 2.97.0), ale wymaga jednorazowego logowania:
  właściciel zapisuje token (zakresy `repo`, `workflow`, `read:org`)
  do `~/.gh-token`, agent robi `gh auth login --with-token` i kasuje
  plik. Czytanie `~/.git-credentials` jest zablokowane — nie próbować.
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
  `assets/fonts/LICENSE-Geist-OFL.txt` musi zostać przy plikach
  `.woff2`; pilnuje `straznik-licencji`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
