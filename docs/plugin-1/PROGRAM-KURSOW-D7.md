# Program obu kursów — Dział 7 (PROPOZYCJA do akceptacji właściciela)

Status: **CZEKA NA AKCEPTACJĘ**. Dopóki właściciel nie zatwierdzi tego
programu, żadna treść lekcji nie powstaje (wymóg właściciela przy B4:
strona nie obiecuje niczego spoza programu, więc program jest pierwszy).

Zasady, według których powstał (ZRODLA.md, pkt „Zasady użycia"):

- każda lekcja wskazuje plik(i) źródłowe z
  `docs/dokumentacja-techniczna/d7/` — ścieżki poniżej są względem tego
  katalogu i **wszystkie istnieją** (sprawdzone skryptem przy pisaniu);
- program = spis treści realnego materiału; nic, czego nie ma w źródłach;
- czasy trwania to szacunki z objętości źródła (właściciel może skorygować);
- `podgląd` = lekcja z flagą `preview` (widoczna jako zajawka na stronie
  kursu — po 1–2 na kurs);
- treść wejdzie do bazy **kreatorem** (D6), zakładka „Program".

---

## Kurs 1 — „Jak poprawnie korzystać z Claude"

Źródła: `claude-platform/` (platforma, API, prompt engineering, agenty)
i `claude-code/` (systemy pracy). 6 modułów, 41 lekcji, ~12 h.

### Moduł 1. Fundamenty: poznaj Claude (~1 h 40 min)

Czym jest Claude, jakie są modele i ile to kosztuje — zanim wydasz
pierwszą złotówkę.

| # | Lekcja | Czas | Źródło |
|---|---|---|---|
| 1 | Czym jest Claude i co potrafi *(podgląd)* | 15 min | `claude-platform/intro.md` |
| 2 | Rodzina modeli: Opus, Sonnet, Haiku | 20 min | `claude-platform/about-claude/models/overview.md` |
| 3 | Jak dobrać model do zadania (i nie przepłacać) | 20 min | `claude-platform/about-claude/models/choosing-a-model.md`, `claude-platform/about-claude/models/optimizing-for-cost-and-intelligence.md` |
| 4 | Cennik: za co naprawdę płacisz | 15 min | `claude-platform/about-claude/pricing.md` |
| 5 | Okno kontekstu w praktyce | 20 min | `claude-platform/build-with-claude/context-windows.md` |
| 6 | Słowniczek pojęć — mów językiem AI | 10 min | `claude-platform/about-claude/glossary.md` |

### Moduł 2. Prompt engineering: mów tak, żeby Claude robił to, co chcesz (~1 h 40 min)

| # | Lekcja | Czas | Źródło |
|---|---|---|---|
| 1 | Zasady dobrego promptu | 15 min | `claude-platform/build-with-claude/prompt-engineering/overview.md` |
| 2 | Najlepsze praktyki promptowania Claude | 25 min | `claude-platform/build-with-claude/prompt-engineering/claude-prompting-best-practices.md` |
| 3 | Promptowanie najnowszych modeli (Opus 5, Sonnet 5) | 20 min | `claude-platform/build-with-claude/prompt-engineering/prompting-claude-opus-5.md`, `claude-platform/build-with-claude/prompt-engineering/prompting-claude-sonnet-5.md` |
| 4 | Rozszerzone myślenie: kiedy dać modelowi czas | 20 min | `claude-platform/build-with-claude/extended-thinking.md` |
| 5 | Mniej halucynacji, więcej spójności | 20 min | `claude-platform/test-and-evaluate/strengthen-guardrails/reduce-hallucinations.md`, `claude-platform/test-and-evaluate/strengthen-guardrails/increase-consistency.md` |

### Moduł 3. Claude Code: start i codzienna praca (~2 h 25 min)

| # | Lekcja | Czas | Źródło |
|---|---|---|---|
| 1 | Jak działa Claude Code *(podgląd)* | 15 min | `claude-code/how-claude-code-works.md` |
| 2 | Instalacja i pierwsza sesja | 20 min | `claude-code/quickstart.md`, `claude-code/setup.md` |
| 3 | Codzienne przepływy pracy | 25 min | `claude-code/common-workflows.md` |
| 4 | Najlepsze praktyki pracy z agentem | 25 min | `claude-code/best-practices.md` |
| 5 | Pamięć projektu: CLAUDE.md | 15 min | `claude-code/memory.md` |
| 6 | Tryb interaktywny i komendy | 15 min | `claude-code/interactive-mode.md`, `claude-code/commands.md` |
| 7 | Uprawnienia: co Claude może, a czego nie | 15 min | `claude-code/permissions.md`, `claude-code/permission-modes.md` |
| 8 | Konfiguracja pod siebie: settings.json | 15 min | `claude-code/settings.md` |

### Moduł 4. Claude Code: systemy pracy, które skalują (~2 h 20 min)

| # | Lekcja | Czas | Źródło |
|---|---|---|---|
| 1 | Subagenci: deleguj pracę | 20 min | `claude-code/sub-agents.md` |
| 2 | Skille: wiedza wielokrotnego użytku | 20 min | `claude-code/skills.md` |
| 3 | Hooki: automatyzacja wokół agenta | 20 min | `claude-code/hooks-guide.md` |
| 4 | MCP: podłącz narzędzia zewnętrzne | 20 min | `claude-code/mcp.md` |
| 5 | Pluginy: gotowe zestawy możliwości | 15 min | `claude-code/plugins.md` |
| 6 | Claude Code w CI: GitHub Actions | 20 min | `claude-code/github-actions.md` |
| 7 | Praca równoległa: worktrees i sesje | 15 min | `claude-code/worktrees.md`, `claude-code/sessions.md` |
| 8 | Punkty kontrolne: cofanie zmian bez stresu | 10 min | `claude-code/checkpointing.md` |

### Moduł 5. Claude przez API: pierwsze integracje (~2 h 20 min)

Dla firm, które chcą zbudować własne rozwiązanie na Claude.

| # | Lekcja | Czas | Źródło |
|---|---|---|---|
| 1 | Pierwsze wywołanie API | 20 min | `claude-platform/get-started.md` |
| 2 | Klucz API i praca z Messages | 20 min | `claude-platform/get-api-key.md`, `claude-platform/build-with-claude/working-with-messages.md` |
| 3 | Tool use: Claude używa Twoich narzędzi | 25 min | `claude-platform/agents-and-tools/tool-use/overview.md` |
| 4 | Ustrukturyzowane odpowiedzi (JSON) | 15 min | `claude-platform/build-with-claude/structured-outputs.md` |
| 5 | Streaming: odpowiedź na żywo | 15 min | `claude-platform/build-with-claude/streaming.md` |
| 6 | Agent Skills na platformie | 15 min | `claude-platform/agents-and-tools/agent-skills/overview.md` |
| 7 | Praca z plikami i PDF-ami | 15 min | `claude-platform/build-with-claude/files.md`, `claude-platform/build-with-claude/pdf-support.md` |
| 8 | Vision: Claude patrzy na obrazy | 15 min | `claude-platform/build-with-claude/vision.md` |

### Moduł 6. Koszty, jakość i bezpieczeństwo w produkcji (~1 h 35 min)

| # | Lekcja | Czas | Źródło |
|---|---|---|---|
| 1 | Prompt caching: płać mniej za powtarzany kontekst | 20 min | `claude-platform/build-with-claude/prompt-caching.md` |
| 2 | Batch API: połowa ceny, gdy nie ma pośpiechu | 15 min | `claude-platform/build-with-claude/batch-processing.md` |
| 3 | Liczenie tokenów przed wysyłką | 10 min | `claude-platform/build-with-claude/token-counting.md` |
| 4 | Testy i ewaluacje jakości odpowiedzi | 20 min | `claude-platform/test-and-evaluate/develop-tests.md` |
| 5 | Ochrona przed jailbreakami i wyciekiem promptu | 15 min | `claude-platform/test-and-evaluate/strengthen-guardrails/mitigate-jailbreaks.md`, `claude-platform/test-and-evaluate/strengthen-guardrails/reduce-prompt-leak.md` |
| 6 | Bezpieczeństwo Claude Code w firmie | 15 min | `claude-code/security.md`, `claude-code/sandboxing.md` |

---

## Kurs 2 — „Jak poprawnie używać GitHuba"

Źródła: `github/`. 7 modułów, 50 lekcji, ~12,5 h.

### Moduł 1. Start: Git, GitHub i pierwsze repozytorium (~1 h 35 min)

| # | Lekcja | Czas | Źródło |
|---|---|---|---|
| 1 | Czym jest GitHub (i czym jest Git) *(podgląd)* | 15 min | `github/get-started/start-your-journey/what-is-github.md` |
| 2 | Hello World: pierwszy projekt w przeglądarce | 20 min | `github/get-started/using-github/hello-world.md` |
| 3 | Konfiguracja Gita na Twoim komputerze | 15 min | `github/get-started/git-basics/set-up-git.md` |
| 4 | Repozytorium dla Twojego projektu | 15 min | `github/get-started/start-your-journey/creating-a-repository-for-your-project-on-github.md` |
| 5 | Połącz lokalny kod z GitHubem | 15 min | `github/get-started/start-your-journey/connecting-to-your-code-locally.md` |
| 6 | Git od środka: jak to działa | 15 min | `github/get-started/using-git/about-git.md` |

### Moduł 2. Codzienna praca z Gitem (~1 h 30 min)

| # | Lekcja | Czas | Źródło |
|---|---|---|---|
| 1 | Przepływy pracy Git | 15 min | `github/get-started/git-basics/git-workflows.md` |
| 2 | Wypychanie commitów | 10 min | `github/get-started/using-git/pushing-commits-to-a-remote-repository.md` |
| 3 | Pobieranie zmian ze zdalnego repozytorium | 10 min | `github/get-started/using-git/getting-changes-from-a-remote-repository.md` |
| 4 | .gitignore: czego nie commitować | 10 min | `github/get-started/git-basics/ignoring-files.md` |
| 5 | Zdalne repozytoria pod kontrolą | 15 min | `github/get-started/git-basics/managing-remote-repositories.md` |
| 6 | Rebase bez strachu | 20 min | `github/get-started/using-git/about-git-rebase.md`, `github/get-started/using-git/using-git-rebase-on-the-command-line.md` |
| 7 | Ściąga komend Gita | 10 min | `github/get-started/git-basics/git-cheatsheet.md` |

### Moduł 3. Repozytorium jak u profesjonalisty (~1 h 55 min)

| # | Lekcja | Czas | Źródło |
|---|---|---|---|
| 1 | Dobre praktyki repozytoriów | 15 min | `github/repositories/creating-and-managing-repositories/best-practices-for-repositories.md` |
| 2 | README, które sprzedaje projekt | 15 min | `github/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes.md` |
| 3 | Markdown: formatowanie na GitHubie | 20 min | `github/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax.md` |
| 4 | Licencja repozytorium | 10 min | `github/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository.md` |
| 5 | Gałęzie chronione | 15 min | `github/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches.md` |
| 6 | Releasy i tagi: wersjonuj jak dorośli | 20 min | `github/repositories/releasing-projects-on-github/about-releases.md`, `github/repositories/releasing-projects-on-github/managing-releases-in-a-repository.md` |
| 7 | Duże pliki: limity i Git LFS | 10 min | `github/repositories/working-with-files/managing-large-files/about-large-files-on-github.md` |
| 8 | Szablony repozytoriów | 10 min | `github/repositories/creating-and-managing-repositories/creating-a-repository-from-a-template.md` |

### Moduł 4. Współpraca: issues i pull requesty (~2 h 45 min)

Serce kursu — tak pracują zespoły na GitHubie.

| # | Lekcja | Czas | Źródło |
|---|---|---|---|
| 1 | GitHub Flow: jak pracują zespoły *(podgląd)* | 15 min | `github/get-started/using-github/github-flow.md` |
| 2 | Issues: planowanie pracy | 15 min | `github/issues/tracking-your-work-with-issues/learning-about-issues/about-issues.md` |
| 3 | Tworzenie i prowadzenie issue | 10 min | `github/issues/tracking-your-work-with-issues/using-issues/creating-an-issue.md` |
| 4 | Czym jest pull request | 15 min | `github/pull-requests/get-started/about-pull-requests.md` |
| 5 | Tworzenie pull requesta | 15 min | `github/pull-requests/how-tos/create-pull-requests/creating-a-pull-request.md` |
| 6 | Prośba o review i praca z uwagami | 15 min | `github/pull-requests/how-tos/create-pull-requests/requesting-a-pull-request-review.md`, `github/pull-requests/how-tos/review-pull-requests/incorporating-feedback-in-your-pull-request.md` |
| 7 | Jak robić dobre code review | 20 min | `github/pull-requests/how-tos/review-pull-requests/reviewing-proposed-changes-in-a-pull-request.md` |
| 8 | Konflikty scalania: bez paniki | 20 min | `github/pull-requests/reference/merge-conflicts.md`, `github/pull-requests/how-tos/merge-and-close-pull-requests/resolving-a-merge-conflict-on-github.md` |
| 9 | Merge, squash czy rebase? | 15 min | `github/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/about-merge-methods-on-github.md` |
| 10 | Forki: wkład w cudze projekty | 15 min | `github/pull-requests/get-started/about-forks.md`, `github/pull-requests/how-tos/create-pull-requests/creating-a-pull-request-from-a-fork.md` |
| 11 | Łączenie PR z issue | 10 min | `github/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue.md` |

### Moduł 5. Automatyzacja: GitHub Actions (~2 h)

| # | Lekcja | Czas | Źródło |
|---|---|---|---|
| 1 | Zrozum GitHub Actions | 20 min | `github/actions/get-started/understand-github-actions.md` |
| 2 | Pierwszy workflow w 10 minut | 20 min | `github/actions/get-started/quickstart.md` |
| 3 | Continuous Integration | 15 min | `github/actions/get-started/continuous-integration.md` |
| 4 | Anatomia workflow | 20 min | `github/actions/concepts/workflows-and-actions/workflows.md` |
| 5 | Zmienne i konteksty | 15 min | `github/actions/concepts/workflows-and-actions/variables.md`, `github/actions/concepts/workflows-and-actions/contexts.md` |
| 6 | Sekrety w workflow | 15 min | `github/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets.md` |
| 7 | Continuous Deployment | 15 min | `github/actions/get-started/continuous-deployment.md` |

### Moduł 6. Bezpieczeństwo konta i kodu (~1 h 35 min)

| # | Lekcja | Czas | Źródło |
|---|---|---|---|
| 1 | Dwuskładnikowe uwierzytelnianie (2FA) | 15 min | `github/authentication/securing-your-account-with-two-factor-authentication-2fa/about-two-factor-authentication.md`, `github/authentication/securing-your-account-with-two-factor-authentication-2fa/configuring-two-factor-authentication.md` |
| 2 | Klucze SSH: logowanie bez haseł | 20 min | `github/authentication/connecting-to-github-with-ssh/about-ssh.md`, `github/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent.md` |
| 3 | Funkcje bezpieczeństwa GitHuba | 15 min | `github/code-security/getting-started/github-security-features.md` |
| 4 | Zabezpiecz swoje repozytorium | 20 min | `github/code-security/getting-started/quickstart-for-securing-your-repository.md` |
| 5 | Dependabot: łatanie zależności | 15 min | `github/code-security/concepts/supply-chain-security/dependabot-alerts.md` |
| 6 | Secret scanning: sekrety poza repo | 10 min | `github/code-security/concepts/secret-security/secret-scanning.md` |

### Moduł 7. Ponad podstawy: narzędzia, które przyspieszają (~1 h 5 min)

| # | Lekcja | Czas | Źródło |
|---|---|---|---|
| 1 | GitHub CLI: GitHub z terminala | 15 min | `github/github-cli/github-cli/about-github-cli.md`, `github/github-cli/github-cli/quickstart.md` |
| 2 | GitHub Pages: strona prosto z repozytorium | 15 min | `github/pages/quickstart.md`, `github/pages/getting-started-with-github-pages.md` |
| 3 | Codespaces: środowisko w chmurze | 15 min | `github/codespaces/about-codespaces.md` |
| 4 | Wyszukiwanie na GitHubie | 10 min | `github/search-github/getting-started-with-searching-on-github.md` |
| 5 | Discussions: rozmowy wokół projektu | 10 min | `github/discussions/quickstart.md` |

---

## Decyzje właściciela przy D7

- **2026-08-18, styl:** kurs ma być w stylu graficznym naszej strony —
  wszystko ma wyglądać na **produkt premium**. Dotyczy to każdego punktu
  styku klienta: strony sprzedażowej, maili, platformy szkoleniowej
  i materiałów dodatkowych.
- **2026-08-18, model dostarczania — pełnoprawny kurs, NIE e-book:**
  1. materiał kursu **NIE wyświetla się publicznie na stronie** — na
     `/szkolenia` zostają katalog i strony sprzedażowe (tam klient kupuje);
  2. po zakupie klient dostaje **maila**: potwierdzenie zakupu + link do
     logowania;
  3. kurs żyje na **platformie szkoleniowej za logowaniem**: uporządkowane
     **lekcje wideo** (pokaz ekranu z obsługi narzędzi), instrukcje krok
     po kroku, gotowe prompty;
  4. **PDF-y tylko jako dodatki** (ściągawki, listy narzędzi, workbooki)
     — uzupełnienie, nie rdzeń kursu; sam plik PDF to byłby „tani e-book",
     a tego nie robimy;
  5. materiały mają być **aktualizowane** (kolejny argument za platformą,
     nie plikiem).
  Realizacja platformy: etap WP (Plugin 2 — zakup/płatności, Plugin 3 —
  konta klientów), zgodnie z decyzją zespołu o WordPressie.
- **Podział pracy nad lekcją wideo:** agent pisze ze źródeł kompletny
  SCENARIUSZ nagrania (kroki na ekranie + narracja + prompty do pokazania)
  oraz materiały dodatkowe; **nagrywa właściciel**. Scenariusze żyją
  w repo (nośnik trwały do czasu platformy).

## Po akceptacji (kolejność prac D7)

1. Właściciel zatwierdza / koryguje program (ten plik = źródło prawdy).
2. Program wchodzi do bazy **kreatorem** (zakładka „Program") — zastępuje
   roboczy program z seedów.
3. Treść lekcji = **scenariusz lekcji wideo** (kroki na ekranie +
   narracja + gotowe prompty) + materiały dodatkowe — lekcja po lekcji,
   wyłącznie ze wskazanych źródeł; cytowane fragmenty do
   `docs/dokumentacja-techniczna/d7/cytowane/`. Scenariusze w repo.
4. Golden treści obu kursów (ochrona przed cichą utratą tekstu).
5. Platforma szkoleniowa (logowanie, wideo, aktualizacje) — etap WP
   (Plugin 2/3); NIE wchodzi w zakres D7.
