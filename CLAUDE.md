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
- **Redesign premium (0.9.0)** wg briefu właściciela: katalog =
  digital product experience (hero z mockupem OknoKursu z realnych
  danych + floating cards + spotlight/parallax w HeroMotion, marquee,
  sekcja „system pracy" sticky+kaskada, katalog z kartą wyróżnioną
  i badge/poziomem/statystykami z bazy — migracja 004); strona kursu
  + sekcje Pakiet (kotwica cenowa) i Prowadzący + „nie dla" (migracja
  003). Motion: rAF+transform-only, prefers-reduced-motion respektowane.
  UWAGA-LEKCJA: `node skrypt | tail` maskuje kod wyjścia — smoke'i
  weryfikować po exit code, nie po obecności napisu.
- **NASTĘPNY KROK: Course Detail System wg briefu właściciela** —
  PEŁNY brief: [docs/plugin-1/BRIEF-STRONA-KURSU.md](docs/plugin-1/BRIEF-STRONA-KURSU.md)
  (WIĄŻĄCY; przeczytać PRZED pracą). W skrócie: (1) katalog — karty
  RÓWNE (bez wyróżnionej) + dłuższe opisy „dlaczego my"; (2) strona
  kursu = premium sales page / mini sklep: sticky nav, sekcje problem/
  pozycjonowanie/transformacja/porównanie + istniejące, reusable
  komponenty `components/kurs/*`, psychologia scrolla, mobile, SEO,
  a11y, zero zmyślonych danych. GRUNT JUŻ POŁOŻONY na branchu
  `feat/d5-strona-sprzedazowa` (niecommitowane w chwili zapisu →
  commit „grunt CDS"): migracja 005 (kinds problem/positioning/
  transformation/comparison) + schematy Zod TrescProblem/
  TrescPozycjonowanie/TrescTransformacja/TrescPorownanie w typy.ts
  + eksporty w index.ts. DO ZROBIENIA: manifest migracji (--zapisz),
  db1:migruj, komponenty kurs/*, przebudowa [slug]/page.tsx, wyrównanie
  kart katalogu, dłuższe opisy w seedach + treść nowych sekcji,
  goldeny d4/d5 (regen po zmianach), testy/smoke/CI, wersja 0.10.0,
  push do PR #12. Bramka B5 = ocena właściciela. Po B5: release,
  potem Dział 6 (kreator, z polami badge/level i WSZYSTKIMI rodzajami
  sekcji).
- Stan PR: #12 (feat/d5-strona-sprzedazowa → plugin-1-sklep-kursow)
  otwarty, CI zielone dla 0.9.0; #13 zmergowany do feat/d5. Dev :3001
  działa; baza dev zmigrowna do 004, testy na db1_kursy_test.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
