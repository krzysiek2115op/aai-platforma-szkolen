# Plan domknięcia Pluginu 1 — cztery kroki

Ustalony z właścicielem 2026-08-19 (przed `/clear`). Kolejność jest
wiążąca: krok N+1 zaczynamy po odhaczeniu kroku N przez właściciela.
Po kroku 4 Plugin 1 jest zamknięty.

Stan wyjściowy: wersja **0.22.0**, działy D1–D7 gotowe (B1–B6 zaliczone),
treść obu kursów kompletna (91 scenariuszy), strażnicy 17/17, audyt
mutacyjny 17/17. Otwarte: B7 (właściciel ocenia GOTOWE KURSY, nie same
scenariusze).

---

## Krok 1 — SEO i wydajność mierzone na żywym adresie

> **STAN 2026-08-19: krok w toku, podzielony na trzy części.**
> Podział wyszedł z pracy, nie z planowania: każda część ma własny
> dowód, który da się ocenić osobno.
>
> | Część | Stan | Wersja / gałąź | PR |
> |---|---|---|---|
> | 1/3 — tryb podglądu statycznego | **zrobiona** | 0.23.0 · `feat/podglad-statyczny` | [#26](https://github.com/MatthewPlugins/Pod-strona-Szkolenia/pull/26) |
> | 2/3 — SEO na stronie | **zrobiona** | 0.24.0 · `feat/seo-podstrony` | [#27](https://github.com/MatthewPlugins/Pod-strona-Szkolenia/pull/27) |
> | 3/3 — wydajność i pomiary | **← następna** | — | — |
>
> **Decyzja właściciela (2026-08-19): wszystkie trzy PR-y mergujemy
> dopiero, gdy pomiary pokażą 100 w każdej kolumnie** — nie po kolei.
> PR-y są stackowane (#27 stoi na gałęzi #26), więc merge idzie
> od najstarszego, z `--delete-branch`.
>
> **Żywy podgląd:**
> <https://matthewplugins.github.io/szkolenia-podglad/szkolenia>
>
> Decyzje właściciela podjęte na starcie kroku: publikujemy do nowego
> **publicznego** repo `MatthewPlugins/szkolenia-podglad`; `noindex`
> **TAK** na czas prac (z zastrzeżeniem, że tabela pomiarów ma to
> odnotować — `noindex` jest punktowanym audytem Lighthouse'a); treść
> **robocza**, pomiary powtarzamy po złożeniu kursów w kreatorze.
>
> Szczegóły techniczne obu gotowych części, wraz z pułapkami, które
> mogą wrócić — w [CLAUDE.md](../../CLAUDE.md) (sekcja „Stan i następny
> krok") oraz w CHANGELOG 0.23.0 i 0.24.0. Protokół pomiaru i pusta
> tabela wyników: [README](../../README.md#seo-i-bezpieczeństwo).

**Cel właściciela (2026-08-19):** wrzucić podstronę na GitHub Pages,
zrobić „całe SEO", przetestować **narzędziami Google**, dojść do
**100 w każdej kolumnie** i dopiero wtedy odhaczyć SEO tabelą w repo —
wzorem tabeli Lighthouse ze strony głównej.

### Przeszkoda techniczna, którą trzeba rozwiązać NAJPIERW — ✅ ROZWIĄZANA w części 1/3

`/szkolenia` **nie jest stroną statyczną**:

| Element | Stan dziś | Co to znaczy dla Pages |
|---|---|---|
| `app/szkolenia/page.tsx` (katalog) | `force-dynamic`, czyta bazę przy żądaniu | wymaga zamiany na render z bazy **w czasie builda** |
| `app/szkolenia/[slug]/page.tsx` | `force-dynamic` + `generateMetadata` z bazy | jw. + `generateStaticParams` po slugach z bazy |
| `app/szkolenia/kreator/**` | ciastko HttpOnly, akcje serwerowe | **wykluczyć z eksportu** — panel nie ma prawa być publiczny |
| `app/api/szkolenia` (jedyny AJAX) | mutacje bazy | nie istnieje w eksporcie statycznym |
| Repozytorium | **prywatne** | Pages z prywatnego repo = plan płatny → publikujemy do **osobnego, publicznego** repo (tak robi strona główna: `matthewplugins.github.io`) |

**Wniosek:** krok 1 zaczyna się od zbudowania **trybu podglądu
statycznego** (roboczo `PODGLAD_STATYCZNY=1`): eksport katalogu i stron
kursów z danymi zaciągniętymi z bazy w czasie builda, bez kreatora
i bez AJAX-a. Prototyp z serwerem zostaje bez zmian — tryb podglądu
jest dodatkiem do pomiarów i prezentacji, nie zamianą architektury.

### Decyzje do podjęcia przez właściciela (na starcie kroku 1) — ✅ PODJĘTE 2026-08-19

1. **Gdzie publikujemy?** Propozycja: nowe **publiczne** repo
   `MatthewPlugins/szkolenia-podglad` (albo gałąź `gh-pages` w takim
   repo), publikacja ręcznym skryptem z katalogu roboczego — nie zjada
   minut Actions (limit organizacji wyczerpany do 1 września).
2. **`noindex` na czas prac — rekomendacja: TAK.** Treść stron
   sprzedażowych jest ROBOCZA, opinie to jawne placeholdery. Wpuszczenie
   tego do indeksu Google zaszkodziłoby marce i późniejszemu SEO
   domeny docelowej. Wzorzec ze strony głównej: `PAGES_PREVIEW=1` →
   `robots: noindex`, pusta sitemapa, brak `Sitemap:` w robots.txt.
   `noindex` zdejmujemy dopiero przy publikacji produkcyjnej na WP.
3. **Czy podgląd ma zawierać finalną treść kursów?** Jeśli tak, krok 1
   przesuwa się za krok 3 (treść wchodzi kreatorem). Jeśli nie —
   mierzymy wydajność na treści roboczej, co dla Lighthouse'a jest
   wystarczające (liczą się obrazy, JS, fonty i układ, nie słowa).

### Co robimy w kroku 1

1. Tryb eksportu statycznego + skrypt publikacji (wzór:
   `scripts/deploy.sh` strony głównej — z lekcją BLAD-007: **deploy
   buduje z KATALOGU ROBOCZEGO, nie z commitów**, więc przed publikacją
   drzewo musi być czyste).
2. **SEO na stronie**, dziś nieobecne albo szczątkowe:
   - `app/robots.ts` i `app/sitemap.ts` (sitemapa bez fałszywego
     `lastModified`; w trybie podglądu pusta),
   - kanoniczne adresy, OpenGraph + Twitter na katalogu i stronach
     kursów (dziś metadane są, ale bez OG-obrazów),
   - **JSON-LD**: `Course` (nazwa, opis, dostawca, język, program),
     `Product`+`Offer` (cena, waluta, dostępność), `BreadcrumbList`,
     `FAQPage` na sekcji FAQ, `Organization` — to jest największy
     nieodrobiony zysk SEO dla sklepu z kursami,
   - `lang`, jeden `<h1>` na stronę, hierarchia nagłówków, `alt`-y.
3. **Wydajność do 100**: audyt obrazów (okładki kursów — format, rozmiar,
   `priority` dla LCP), fonty (już lokalne), podział JS, `prefers-reduced-motion`
   (jest), eliminacja CLS na hero i marquee.
4. **Pomiary narzędziami Google**: Lighthouse (lokalnie na
   produkcyjnym `next start` **i** na żywym adresie), PageSpeed Insights,
   Rich Results Test (JSON-LD), Search Console (po publikacji), test
   mobilny. **Chrome instalujemy w scratchpadzie sesji, NIGDY do
   `package.json`** (lekcja z D5 o playwrighcie).
5. **Tabela w README** — wypełniana WYŁĄCZNIE zmierzonymi liczbami
   (zero zmyślania obowiązuje też README), plus strażnik/CI pilnujący
   progów, żeby tabela nie zdezaktualizowała się po cichu.

### Cel liczbowy (wpisujemy zmierzone, nie życzenia)

| Podstrona | Wydajność | Dostępność | Dobre praktyki | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| `/szkolenia` | 100 | 100 | 100 | 100 | ≤ 2,5 s | 0 | ≤ 200 ms |
| `/szkolenia/[slug]` | 100 | 100 | 100 | 100 | ≤ 2,5 s | 0 | ≤ 200 ms |

Uczciwa uwaga: strona główna przy tym samym reżimie ma 92–99 na
wydajności (najniżej szablony z okładkami — obraz jest elementem LCP).
100/100/100/100 jest osiągalne, ale wymaga twardych decyzji o obrazach
hero i mockupie `OknoKursu`. Nie wpisujemy „100", dopóki narzędzie tego
nie pokaże **trzy razy z rzędu**.

**Bramka kroku 1:** komplet pomiarów w tabeli + akceptacja właściciela.

---

## Krok 2 — pełne zabezpieczenia strony

Podstawa: [`docs/security-checklist.md`](../security-checklist.md)
(legenda pięciostanowa; sekcja 8 zbiera wymagania dla wtyczki WP).

Do zrobienia w tym kroku — pozycje dziś oznaczone ⏳/🔧, które da się
domknąć jeszcze w prototypie:

1. **Pełne CSP** nagłówkiem (dziś tylko `frame-ancestors 'none'`):
   polityka bez `unsafe-inline` dla skryptów + strażnik sprawdzający,
   że polityka nie zawiera słów unieważniających ochronę (lekcja ze
   strony głównej: ich audyt mutacyjny znalazł dokładnie taką dziurę).
2. **Rate limiting** na akcjach zapisu (okno przesuwne po IP+akcja) —
   dziś jest tylko kara czasowa bramy kreatora.
3. **Twarde limity wejścia** (długości pól, rozmiar ładunku) i przegląd
   komunikatów błędów pod kątem wycieku informacji.
4. **Nagłówki transportu** dla wersji publicznej podglądu (Pages ich nie
   ustawi — decyzja: co przenosimy do konfiguracji hostingu WP).
5. **Weryfikacja mutacyjna każdego nowego zabezpieczenia** — reguła
   z 0.22.0: nowy strażnik = nowa mutacja w `audyt-straznikow`.
6. Przegląd 🔧: 2FA w organizacji, przegląd ról i kluczy (materiał
   naszego własnego kursu 2 / moduł 6 opisuje procedurę).

**Bramka kroku 2:** checklista bez pozycji ⏳ możliwych do zrobienia
w prototypie + akceptacja właściciela.

---

## Krok 3 — kursy zrobione do końca, w narzędziu

**Decyzja właściciela (2026-08-18, wieczór): właściciel NIE nagrywa
wideo.** To unieważnia podział pracy z D7. Materiał ma powstać inaczej.

Do zrobienia:

1. **Propozycja produkcji materiału — z opcjami i kosztami** (agent
   przygotowuje, właściciel wybiera). Do rozważenia: synteza mowy
   z narracji scenariuszy + automatyczne nagrania ekranu, awatar/lektor
   AI, wersja tekstowo-obrazkowa z krokami zamiast wideo. Każda opcja
   musi odpowiedzieć na: jakość, prawa do głosu i materiału, koszt
   jednostkowy i utrzymanie (co przy zmianie w GitHubie/Claude).
2. **Rozszerzenie kreatora o lekcje i nagrania** — dziś obsługuje kurs,
   program i sekcje sprzedażowe; dojdą treść lekcji i materiał wideo.
   To ciąg dalszy Działu 6: kontrakty w `modules/m1-sklep/typy.ts`,
   migracje, panel, `straznik-kreatora` pilnujący pokrycia pól.
3. **Finalna treść stron sprzedażowych** wprowadzona kreatorem —
   zgodna 1:1 z zatwierdzonym programem (strona nie obiecuje niczego
   spoza programu). Zastępuje treść ROBOCZĄ z `tools/seed/seed-przyklady.ts`.
4. **Dwa kompletne kursy gotowe do sprzedaży** + akcept właściciela = **B7**.

Opinie klientów zostają jawnymi placeholderami do pierwszych sprzedaży —
niczego nie zmyślamy.

**Bramka kroku 3:** B7 — właściciel ocenia gotowe kursy.

---

## Krok 4 — rozmowa o WordPressie i domknięcie Pluginu 1

1. Przegadanie z właścicielem przejścia na WP (hosting, domena
   `automaticai.pl` — jeszcze niekupiona, wybór LMS: Publigo albo
   Tutor LMS, zakres wtyczek: Plugin 2 płatności, Plugin 3 konta).
2. Wykonanie tego, co z rozmowy wyjdzie jako należące jeszcze do
   Pluginu 1 (najpewniej: specyfikacja przeniesienia + skrypt migracji
   danych Postgres → MySQL).
3. **Sprzątanie gałęzi** (decyzja właściciela: dopiero teraz) — dziś
   26 gałęzi zdalnych, 13 zmergowanych. Od 0.22.0 nowe PR-y mergujemy
   z `--delete-branch`, więc lista już nie rośnie.
4. Merge modułu na `main`, przywrócenie gałęzi domyślnej, tag + release.

**ZŁOTO NA TEN KROK:** repo strony głównej ma katalog `wordpress/` —
kompletny motyw WP wygenerowany ze statycznego builda Next, docker-compose
(WP 6.9 + MariaDB + wp-cli), **idempotentne** importy treści, eksport
statyczny z WP, `verify-wordpress.mjs` pilnujący zgodności obu
implementacji oraz wzorce ODDANIA projektu klientowi
(MANIFEST-ODDANIA „co idzie / co nie idzie", instrukcja w 3 krokach,
podwójna licencja GPL/MIT, workflow celowo wyłączony do decyzji
odbiorcy). To gotowa ściąga — czytać przed pisaniem czegokolwiek.

**Bramka kroku 4:** koniec Pluginu 1.

---

## Zasady obowiązujące przez cały plan

- Weryfikacja-PR na każdym kroku; **czerwony check = STOP** (wyjątek
  udokumentowany przy 0.21.0: CI stoi do 1 września — limit minut
  organizacji; dowody odtwarzamy lokalnie i zapisujemy w PR).
- Kody wyjścia sprawdzać **bez potoku** (`node skrypt | tail` maskuje
  kod wyjścia).
- Nowy strażnik = nowa mutacja w `tools/straznicy/audyt-straznikow.mjs`.
- Zero zmyślania — dotyczy treści kursów, README i tabel pomiarowych.
- Merge z `--delete-branch`.
