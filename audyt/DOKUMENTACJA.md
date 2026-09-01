# Dokumentacja sektora AUDYT — siedem rodzajów

**Etap E3.** §10 regulaminu nazywa dokumentację **wejściem do audytu**: „najpierw
agent ma wiedzieć, co i w jakim kontekście audytuje". Ten plik mówi, **co mamy,
czego brakowało, co dociągnęliśmy i kto dostaje co**.

Źródła i cięcia: [`ZRODLA-DOKUMENTACJI.md`](ZRODLA-DOKUMENTACJI.md).
Role i checklisty: [`ROLE.md`](ROLE.md).

---

## Stan siedmiu rodzajów

| # | Rodzaj | Stan przy E1 | Stan po E3 | Gdzie leży |
|---|---|---|---|---|
| 1 | **Dziedzinowa** | ❌ brak | ✅ RODO (8 artykułów) + ustawa o prawach konsumenta | `~/.cache/aai-audyt-dokumentacja/prawo/` |
| 2 | **Techniczna** | ✅ 9,6 MB (WP, MySQL, Woo, Tutor) + 236 kB (Next.js) | ✅ + MDN (CSP, kaskada, cache, dostępność) | `docs/dokumentacja-techniczna/`, `~/.cache/aai-audyt-dokumentacja/mdn/` |
| 3 | **Projektu** | ✅ 118 dokumentów `.md`, `CLAUDE.md`, CHANGELOG, 7 schematów | ✅ + **BRIEF-PROJEKTU.md** | repo, [`BRIEF-PROJEKTU.md`](BRIEF-PROJEKTU.md) |
| 4 | **Funkcjonalna** | ✅ 3 × DIAGRAM.md, KREATOR.md, INSTRUKCJA-INSTALACJI.md | ✅ bez zmian | `docs/` |
| 5 | **Specjalistyczna** | ❌ brak | ✅ OWASP (22), **kod Tutora i Woo** (4888 plików PHP), CDP, Lighthouse | `~/.cache/aai-audyt-dokumentacja/{owasp,cudzy-kod,narzedzia}/` |
| 6 | **Systemowa** | ❌ brak | ✅ PHP 8.4, zachowanie przeglądarek (bfcache, sendBeacon, widoczność) | `~/.cache/aai-audyt-dokumentacja/{php,mdn}/` |
| 7 | **Agentowa** | ⚠️ częściowo | ✅ **trzej dostawcy** — Anthropic, OpenAI, Google (P4) | `~/.cache/aai-audyt-dokumentacja/agentowa/` |

Razem dociągnięte: **4944 pliki, 44 MB** — poza drzewem repo (`~/.cache/aai-audyt-dokumentacja/`).

---

## Zestaw STANDARDOWY — co dostaje KAŻDA rola

To jest miejsce, w którym rozstrzyga się wykonalność całości. `CLAUDE.md` waży
**237 476 B**; przy 38 agentach audytu i dwóch falach samo jego podanie to
dziesiątki megabajtów kontekstu, za każdym razem od nowa.

| Wejście | Waga | Dlaczego to, a nie źródło |
|---|---|---|
| [`BRIEF-PROJEKTU.md`](BRIEF-PROJEKTU.md) | **14 kB** | zamiast `CLAUDE.md` (**240 kB**) — 17× mniej — ta sama wiedza, **identyczna w obu falach** |
| własna sekcja z [`ROLE.md`](ROLE.md) | ~2 kB | zakres i checklista tej roli |
| [`GRANICE.md`](GRANICE.md) | ~9 kB | do kogo należy znalezisko |
| trzy zasady nadrzędne | ~1 kB | dosłownie, w każdej definicji (W9) |
| `agentowa/` | wg potrzeby | typ 7, P4 |

**Krytycy dostają wszystkie 7 rodzajów** (D3) — tak samo jak audytorzy.
Ale **czytają raport i dowody, nie obszar** (K1): krytyk otwierający cały obszar
podwaja koszt bez zysku, bo powtarza pracę, którą właśnie ocenia.

---

## Zestaw SPECJALISTYCZNY — per rola (P3)

> „Na pewno znajdzie się agent, który będzie potrzebował czegoś więcej."
> — właściciel, 2026-09-01

Poniższa tabela jest **wyprowadzona z checklist**, nie zgadnięta: każda pozycja
ma po prawej numer pytania, które bez tego materiału nie da się rzetelnie
odpowiedzieć.

| Rola | Materiał ponad standard | Które pytanie tego wymaga |
|---|---|---|
| **INT** | `cudzy-kod/tutor`, `cudzy-kod/woocommerce` (4888 plików PHP) | INT-01 — „dowód z **kodu na dysku**, nie z dokumentacji" |
| **SEC** | `owasp/` (22 arkusze), `mdn/csp.md`, `php/hash-equals.md` | SEC-01…SEC-12 |
| **PRIV** | `prawo/` (RODO + ustawa konsumencka), `owasp/{Logging,User_Privacy,Password_Storage}` | PRIV-01…PRIV-08 |
| **BD** | `docs/…/wordpress/mysql/` (50 plików, już były), `php/pdo.md` | BD-01, BD-04, BD-05, BD-08, BD-09 |
| **BE** | `php/{throwable,wyjatki,argumentcounterror,priorytety-operatorow,lancuchy}.md` | BE-05, BE-08, BE-10, SEC-12 |
| **FE** | `mdn/{css-kaskada,css-layer,css-revert-layer,aria,wcag}.md` | FE-01, FE-07, INT-05 |
| **PERF** | `narzedzia/lighthouse-punktacja.md`, `mdn/{cache-http,jak-dzialaja-przegladarki}.md` | PERF-02, PERF-04, PERF-08 |
| **USP** | `narzedzia/chrome-devtools-protocol.json` (1,4 MB), **Chrome 152** | USP-01, USP-03 |
| **QA** | `.github/workflows/ci.yml` + historia przebiegów `gh run list` | QA-05 |
| **PROTO** | `docs/dokumentacja-techniczna/d1–d6` (32 pliki, już były) | PROTO-07, PROTO-09, PROTO-11 |
| **KON** | `owasp/Abuse_Case_Cheat_Sheet.md` | KON faza A i B |
| **ARCH, REPO, WDR, PIK** | **nic ponad standard** — pracują na dokumentach projektu | — |

**Cztery role nie potrzebują niczego ponad standard i to jest wynik, nie
niedopatrzenie.** Ich pytania dotyczą tego, co repo już o sobie mówi; materiał
z zewnątrz nie pomógłby odpowiedzieć na żadne z nich.

**Furtka na E5:** gdy rola zadeklaruje w swoim `AGENT.md` potrzebę spoza tej
tabeli, źródło **dopisuje się do skryptu razem z kotwicą** — nigdy bez niej.

---

## Chrome (K11′)

**Google Chrome for Testing 152.0.7977.64**, `~/.cache/aai-narzedzia/chrome-linux64/`.

Pobrany jako archiwum, **bez `sudo`** — pakiet systemowy odpadł, bo `sudo` na tej
maszynie żąda hasła, a to byłby krok tylko dla człowieka. Wzorzec ten sam co
AppImage draw.io z wersji 0.64.0: narzędzie żyje w `~/.cache/aai-narzedzia`,
**nigdy w `package.json` projektu** (reguła riga z czasów D5).

Firefox (153.0.4, systemowy) **zostaje** — bramki `smoke-wp-*` stoją na nim
i sterują nim przez webDriverBiDi. Chrome jest **dołożeniem** dla działu
Usprawnień: daje Chrome DevTools Protocol, czyli pomiary, których rig Firefoksa
nie umie zrobić (USP-02, USP-03).

**Sterowanie sprawdzone POMIAREM, nie deklaracją** (E3): Chrome uruchomiony
headless wyrenderował żywy katalog `:8892/szkolenia/` — **59 129 B DOM**,
tytuł `Szkolenia z AI i automatyzacji procesów — Automatic AI`, **263** znaczniki
klas `aai-`, kod wyjścia 0. Komenda do powtórzenia:

```
~/.cache/aai-narzedzia/chrome-linux64/chrome --headless --disable-gpu \
  --no-sandbox --virtual-time-budget=5000 --dump-dom "http://127.0.0.1:8892/szkolenia/"
```

Sama wersja z `--version` niczego by nie dowiodła — „zainstalowany" i „używalny"
to w tym projekcie dwie różne rzeczy.

---

## Czego ten etap nie zrobił

- **nie pobrał niczego bez kotwicy** — zasada wyżej;
- **nie ruszył dokumentacji, którą już mieliśmy** — WP, MySQL, Woo, Tutor
  i Next.js zostają tam, gdzie były;
- **nie tknął kodu produktu** — `git diff main --name-only -- . ':!audyt'` → 0.
