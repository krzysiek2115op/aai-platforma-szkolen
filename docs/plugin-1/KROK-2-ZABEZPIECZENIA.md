# Krok 2 planu domknięcia — pełne zabezpieczenia

Dokument roboczy kroku. Powstał, bo zatwierdzony podział pozycji
i wyniki spike'u żyły wyłącznie w rozmowie — a rozmowa nie jest
nośnikiem trwałym. Podstawa: [PLAN-FINAL-PLUGINU-1.md](PLAN-FINAL-PLUGINU-1.md)
(sekcja „Krok 2") i [docs/security-checklist.md](../security-checklist.md).

Stan: **w toku od 2026-08-19**. Aktualizować przy każdym domkniętym PR.
Zrobione: **PR 1 (CSP) — 0.26.0**, **PR 2 (brama AJAX) — 0.27.0**,
**PR 3 (limity wejścia) — 0.28.0**. Następny: PR 4 — domknięcie kroku.

## Korekta stanu wejściowego

Plan mówił o „18 otwartych pozycjach ⏳/🔧". To liczba **linii** z tymi
znakami w całym pliku — łapie też legendę i zdania z prozy. W tabelach
stoi **9 ⏳ + 5 🔧 = 14 pozycji**, a z nich **dwie były już zrobione**,
tylko checklista tego nie odnotowała (jej nagłówek mówił „stan na
v0.22.0", a repo stało na 0.25.0):

| Pozycja | Realny stan | Dowód |
|---|---|---|
| §6 robots.txt, sitemapa, kanoniki, JSON-LD, OpenGraph | ✅ od 0.24.0 | `straznik-seo` (6 niezmienników + 6 mutacji), `smoke-seo` porównuje dane strukturalne z bazą |
| §6 Pomiar Lighthouse z progami | ✅ od 0.25.0 | PSI, golden `goldeny/pomiary-lighthouse.json`, tabela w README |

Do rozdzielenia zostało **12 pozycji**.

## Podział zatwierdzony przez właściciela (2026-08-19)

### A. Do zrobienia w prototypie Next — 4 pozycje z listy + 1 spoza

| # | Pozycja | Dlaczego wykonalna tutaj |
|---|---|---|
| A1 | **Pełne CSP** (§2) | Wszystkie trasy serwerowe są już `force-dynamic`, więc nonce nie kosztuje wydajności — a to jedyny realny koszt nonce'ów wg dokumentacji Next. Podgląd statyczny dostaje politykę osobną drogą (niżej) |
| A2 | **Rate limiting na akcjach zapisu** (§1) | Argument mocniejszy niż w checkliście: kara czasowa 700 ms siedzi **tylko w formularzu logowania** (`app/szkolenia/kreator/akcje.ts`). Jedyny AJAX `/api/szkolenia` nie ma ani kary, ani limitu — zgadywanie tokenu tą drogą jest dziś darmowe i nieograniczone |
| A3 | **Komunikaty błędów** (§1) | Mapa pól dla właściciela zostaje (to feature panelu), ale `dyspozytor.ts` przy konflikcie unikalności oddaje **surowy komunikat Postgresa** (`szczegoly: String(blad.message)`) — nazwy ograniczeń i kolumn na zewnątrz |
| A4 | **Twarde limity wejścia** — pozycji NIE BYŁO w checkliście, jest w planie kroku | `KursWejscie` ogranicza pola kursu (slug 120, title 200, short_desc 500…), ale tablice `sections`/`modules`/`lessons` nie mają górnej granicy, treść sekcji to gołe `z.string()` bez `max`, `price_grosze` jest bez sufitu, a trasa parsuje **całe ciało żądania przed sprawdzeniem tokenu** |
| A5 | **Porównanie tokenu w stałym czasie w dyspozytorze** — znalezione przy audycie | `lib/kreator-dostep.ts` używa `timingSafeEqual`, ale `dyspozytor.ts` porównuje `===`. Checklista miała to jako ✅ i była to prawda **o formularzu**, nie o kanale sieciowym, który jako jedyny jest wystawiony na świat |

### B. Do specyfikacji wtyczki WP — nie do kodu (5 pozycji)

| Pozycja | Powód |
|---|---|
| Honeypot + pomiar czasu wypełnienia (§1) | Nie ma do czego przypiąć — formularze klienta powstają w Pluginie 2 |
| Polityka prywatności + RODO (§3) | Dane osobowe pojawiają się z płatnościami i kontami (Plugin 2/3) |
| Konta klientów, sesje, reset hasła, brute force (§5) | Plugin 3 + LMS za logowaniem |
| SPF / DKIM / DMARC / DNSSEC (§7) | Wymaga domeny i wybranego dostawcy poczty |
| 🔧 HTTPS + HSTS (§2) | Decyduje hosting; HSTS dopiero po potwierdzeniu certyfikatów na subdomenach |

### C. Poza repo — decyzje i czynności właściciela (3 pozycje)

| Pozycja | Stan |
|---|---|
| 2FA wymuszone w organizacji + na kontach zespołu (§4, §5) | Do zrobienia, gdy właściciel zdecyduje. **Uwaga: włączenie wymogu automatycznie usuwa z organizacji członków bez 2FA.** Procedura krok po kroku jest w naszym własnym kursie 2, moduł 6 |
| Branch protection (§4) | Zablokowane planem Free dla repo prywatnych (sprawdzone 2026-08-18, HTTP 403). Zostaje dyscyplina Weryfikacji-PR |
| Domena `automaticai.pl` (§7) | Decyzja zakupowa |

### Decyzja o zakresie

Właściciel zatwierdził **pełne A (A1–A5)** oraz **objęcie polityką CSP
także publicznego podglądu statycznego** — meta `http-equiv` z hashami
wstrzykiwane po buildzie (wzorzec strony głównej, bo GitHub Pages nie
wyśle żadnego nagłówka HTTP).

## Co zweryfikowano pomiarem przed pisaniem kodu

Spike z 2026-08-19 (plik spike'u skasowany, oba buildy z kodem wyjścia 0):

1. **`proxy.serwer.ts` działa jak reszta architektury dwóch trybów.**
   Plik proxy honoruje `pageExtensions`, więc w trybie serwerowym Next
   go widzi (`ƒ Proxy (Middleware)` w tabeli tras), a w trybie podglądu
   NIE — i `output: export` przechodzi. To istotne, bo Proxy jest na
   liście „Unsupported Features" eksportu statycznego: gdyby nazywał się
   `proxy.ts`, wywracałby `build:podglad`.
2. **Next 16.3.1 nie przyjmuje nazwanego eksportu `proxy`** w pliku
   o niestandardowym rozszerzeniu, choć dokumentacja tak każe. Build pada
   na „Middleware is missing expected function export name". Działa
   **eksport domyślny** (`export default function proxy(...)`).
3. **Jedyną prerenderowaną statycznie stroną ze skryptami jest
   `/_not-found`.** Wszystkie trasy HTML z treścią (`/szkolenia`,
   `/szkolenia/[slug]`, obie trasy kreatora) są `force-dynamic`, więc
   dostaną nonce normalną drogą. Strona 404 nonce'a dostać nie może —
   to jedyne miejsce wymagające decyzji przy pisaniu polityki.

## Pytania techniczne — jak się rozstrzygnęły (PR 1, pomiarem)

- **404 pod `strict-dynamic`** — pomiar potwierdził najgorszy wariant:
  24 skrypty, **zero nonce'ów**, bo strona szła z prerenderu. Rozwiązane
  BEZ rozdzielania `not-found` na łuski: odczyt nagłówków w układzie
  korzenia (`lib/csp-nonce.ts`, bramka podglądu jak w `kreator-dostep`)
  przestawił `/_not-found` i `/` na renderowanie na żądanie. W tabeli
  tras `○` zmieniło się na `ƒ`; statyczne zostały tylko trasy bez HTML-a.
- **Nonce na hoistowanym `<style>`** — React go ZDEJMUJE przy hoistowaniu
  (w HTML-u zostaje sam `data-precedence`). Razem z 19 atrybutami
  `style="…"`, których nonce nie obejmuje z definicji, przesądziło to
  o `style-src 'self' 'unsafe-inline'`. Wariant „ostry" zmierzony:
  **21 naruszeń** i zgaszone kroje pisma. `@font-face` NIE przeniesiony
  do `globals.css` — układ z 0.25.0 nietknięty.
- **`img-src`** — `'self' data: blob: https:`, zgodnie z propozycją;
  `http:` zablokowany. Uzasadnienie w `lib/csp.ts`.
- **`upgrade-insecure-requests`** — wystawiane wyłącznie dla żądań po
  https, dokładnie jak flaga `secure` ciastka kreatora.
- **Adres IP za proxy** — zostaje do PR 2 (limiter); założenie
  „`x-forwarded-for` jest do podrobienia" ma trafić do kodu i do
  specyfikacji WP, nie tylko do rozmowy.

## Kolejność PR-ów

| PR | Gałąź | Zawartość |
|---|---|---|
| 1 ✅ | `feat/csp-pelne` | **ZROBIONE, wersja 0.26.0.** `proxy.serwer.ts` z nonce, `lib/csp.ts` (jedno źródło polityki), `lib/csp-nonce.ts`, `tools/csp-podglad.mjs` (meta+hashe dla podglądu), `straznik-csp` (9 niezmienników, 10 mutacji), `smoke-csp` (nagłówek + hashe w plikach). Po drodze: **BLAD-012** — `smoke-podglad` wołał `npx next build` zamiast komendy, więc oglądał artefakt, którego nikt nie wydaje; `straznik-seo` przestał oskarżać komentarze |
| 2 ✅ | `feat/brama-ajax` | **ZROBIONE, wersja 0.27.0.** `lib/limiter.ts` (moduł czysty + 8 testów jednostkowych), limit wystrzału i OSOBNY licznik chybionych uwierzytelnień w `route.serwer.ts` (429 z `Retry-After`), limit prób logowania w `akcje.ts`, `timingSafeEqual` jako helper lokalny dyspozytora, kara czasowa w obu kanałach, `straznik-limitera` (11 niezmienników, 14 mutacji), smoke D6 wywołuje limit po HTTP |
| 3 ✅ | `feat/limity-wejscia` | **ZROBIONE, wersja 0.28.0.** Sufity długości i liczności we wszystkich polach wejścia (liczby z pomiaru bazy), sufit `price_grosze`, 2 MB na ciało żądania mierzone STRUMIENIEM przed parsowaniem (413), oczyszczanie treści sekcji schematem przed zapisem, generyczny komunikat zamiast błędu Postgresa, `straznik-limitow` (10 niezmienników, 12 mutacji), 5 testów limitów, 2 dowody 413 w smoke D6. Po drodze audyt złapał REGRESJĘ kontroli z PR 2 (`straznik-limitera` wiązał sprawdzenie z nazwą `request.json()`, której trasa już nie używa) |
| 4 | `docs/krok-2-domkniecie` | Checklista bez pozycji 🚧, CHANGELOG, README, `rejestr/znane-bledy.json`, wersja + tag |

## PR 2 (`feat/brama-ajax`) — decyzje podjęte przed pisaniem

Zapisane, żeby nowa sesja nie wyprowadzała ich od nowa:

- **Limiter mieszka w `lib/limiter.ts` i jest CZYSTY** — bez importów
  z `next/*`. Powód praktyczny: `npm test` obejmuje `lib/**/*.test.ts`,
  więc okno przesuwne da się przetestować jednostkowo (granice okna,
  zwolnienie po czasie, rozdział kluczy), zamiast zgadywać z żywego
  serwera. To ten sam układ, co `lib/csp.ts`.
- **Wpięcie w DWÓCH miejscach warstwy HTTP, nie w module.** Adres IP
  jest pojęciem transportu; dyspozytor ma zostać niezależny od tego,
  kto go woła (dziś HTTP, w WP — PHP):
  1. `app/api/szkolenia/route.serwer.ts` — limit wszystkich POST-ów po
     IP oraz OSOBNY, ostrzejszy licznik nieudanych uwierzytelnień
     (odpowiedź 429 z `Retry-After`, treść generyczna);
  2. `app/szkolenia/kreator/akcje.ts` — próby logowania po IP.
- **`timingSafeEqual` w dyspozytorze jako HELPER LOKALNY**, a nie import
  z `lib/`. Moduł ma być samowystarczalny jak wtyczka (WYTYCZNE §8),
  a `lib/kreator-dostep.ts` ciągnie `next/headers`, więc i tak nie da
  się go stamtąd wziąć. Sześć linii duplikatu z komentarzem, dlaczego.
- **Kara czasowa także poza formularzem** — dziś 700 ms ma tylko
  logowanie, a jedyny kanał wystawiony na świat (AJAX) nie ma nic.
- **`x-forwarded-for` jest do podrobienia**, dopóki nie stoi przed nami
  zaufany proxy. Ma to być napisane W KODZIE i w specyfikacji WP —
  limiter po IP jest podniesieniem kosztu ataku, nie granicą
  bezpieczeństwa. Bez tego zdania WP odziedziczy fałszywe poczucie
  ochrony.
- **Stan limitera jest w pamięci procesu.** Dla prototypu z jednym
  właścicielem to wystarcza; do specyfikacji WP idzie REGUŁA (okno
  przesuwne po IP+akcja), nie implementacja — tam nośnikiem będzie
  baza albo obiekt cache WordPressa.
- Dowody jak w PR 1: `straznik-limitera` + mutacje w `audyt-straznikow`,
  rozszerzenie smoke'a o wywołanie limitu (seria złych tokenów → 429,
  normalne użycie nietknięte) i **test negatywny każdego nowego testu**.

## PR 2 — co dopisało samo pisanie kodu

Żadna z zatwierdzonych decyzji nie okazała się zła (nie było więc
o czym meldować w trakcie). Doszło pięć rozstrzygnięć, których tamta
lista nie obejmowała — zapisane, bo każde zmienia zachowanie:

- **429 z licznika chybionych prób dotyczy WYŁĄCZNIE prób chybionych.**
  Trasa pyta o wynik dyspozytora i dopiero wtedy odnotowuje porażkę,
  więc poprawny token przechodzi nawet przy wyczerpanym liczniku.
  Wymóg „normalne użycie nietknięte" inaczej nie dałby się spełnić przy
  jednym adresie (localhost, jeden właściciel za jednym łączem).
- **Odrzucone próby nie wchodzą do okna** — inaczej dobijanie się
  przesuwa termin w nieskończoność i `Retry-After` kłamie. Limiter
  ogranicza tempo, nie karze.
- **Po przekroczeniu limitu odpowiadamy natychmiast, bez kary 700 ms** —
  trzymanie połączenia przy zalewie jest kosztem naszym, nie atakującego.
- **Sufit pamięci limitera** (10 000 kluczy + przycięcie adresu do
  45 znaków): mapa rosnąca po nagłówku sterowanym przez klienta byłaby
  sama w sobie wektorem wyczerpania pamięci.
- **Audyt strażników dostał mutację „skasuj plik"** (`usunPlik`) —
  bez niej niezmiennik „test limitera musi istnieć" byłby deklaracją.

## Bramka kroku

Checklista bez ani jednej pozycji możliwej do zrobienia w prototypie
i pozostawionej otwartej + akceptacja właściciela. Dowody odtwarzane
lokalnie, bo CI stoi do 1 września (limit minut organizacji) — komplet
dowodów wkleić do opisu PR-a, tak jak przy 0.21.0.

## Praca równoległa — terytoria

Krok 3 (kursy w narzędziu) idzie **równolegle, w osobnym czacie**
(decyzja właściciela 2026-08-19). Żeby dwa czaty nie deptały sobie
po plikach:

| Obszar | Czyje |
|---|---|
| `proxy.serwer.ts`, `next.config.ts`, `tools/csp-podglad.mjs`, `tools/straznicy/straznik-csp.mjs`, `straznik-limitow.mjs`, `tools/smoke/*` | krok 2 |
| `app/api/szkolenia/route.serwer.ts`, `modules/m1-sklep/dyspozytor.ts`, `app/szkolenia/kreator/akcje.ts` | krok 2 |
| `components/kreator/*`, `app/szkolenia/kreator/page.serwer.tsx` i `[id]`, migracje SQL, `tools/seed/*`, `tresc-kursow/` | krok 3 |
| **`modules/m1-sklep/typy.ts`** | **OBA** — konflikt pewny, protokół niżej |

### Jeden katalog roboczy to za mało — każdy czat ma swój worktree

Zapisane po incydencie z 2026-08-19: obie sesje pracowały początkowo
w TYM SAMYM checkoucie. Druga przełączyła w nim gałąź, więc commit
pierwszej wylądował na `plugin-1-sklep-kursow` zamiast na gałęzi funkcji,
a `git push` wypchnął gałąź bez zmian. Objaw był mylący — `gh pr create`
odpowiedział „No commits between", co brzmi jak problem z PR-em, a nie
z tym, że ktoś przestawił HEAD pod spodem. Nic nie zginęło (naprawa:
`git branch -f` na właściwy commit), ale to jest dokładnie ta klasa
błędu, która przy mniej uważnym sprawdzeniu kończy się utratą pracy.

REGUŁA: **każda równoległa sesja pracuje we WŁASNYM worktree i nigdy
nie przełącza gałęzi w cudzym.** Krok 3 ma swój:
`/home/krzysiek/Pod-strona-Szkolenia-krok3`. Zakładanie:
`git worktree add ../Pod-strona-Szkolenia-<nazwa> -b <gałąź>`.
Uwaga praktyczna: worktree dzielą jedno repo, więc gałąź wypożyczoną
przez inny worktree widać w `git branch -v` ze znakiem `+` i nie da się
jej tam wyewidencjonować drugi raz. Baza `db1_kursy` i port 3001
zostają wspólne dla obu — to się nie klonuje.

`typy.ts`: krok 2 dopisuje `.max()` i limity liczności do
ISTNIEJĄCYCH schematów, krok 3 dodaje NOWE kontrakty (lekcje, nagrania).
Konflikty będą tekstowe, nie logiczne — przy scalaniu zachować obie
zmiany. **Nowe pola z kroku 3 też muszą dostać limity**, bo `straznik-limitow`
z PR-a 3 zapali się na polu tekstowym bez `max`. Kto merguje pierwszy,
ten wygrywa; drugi robi `git merge plugin-1-sklep-kursow` u siebie
i rozwiązuje konflikt przed swoim PR-em.
