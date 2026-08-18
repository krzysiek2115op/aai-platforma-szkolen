# Lista kontrolna bezpieczeństwa — Plugin 1 (podstrona `/szkolenia`)

Stan na v0.22.0 (2026-08-19). Wzorzec: `docs/security-checklist.md`
strony głównej — przeniesiony jako STRUKTURA, nie wypełnienie, bo
architektury są przeciwne: strona główna nie ma backendu, więc całe
klasy ataków tam „fizycznie nie istnieją" — u nas ISTNIEJĄ (serwer,
baza Postgres, ciastko sesyjne kreatora, formularze) i wymagają
pokrycia. Przy każdym przeglądzie aktualizować datę w tym nagłówku.

Kontekst architektury: prototyp-specyfikacja (decyzja zespołu
2026-08-18 — produkcja będzie na WordPressie). Dlatego część pozycji
ma stan ⏳ „przy etapie WP": dopracowywanie ich w kodzie, który
zostanie przepisany na PHP, byłoby udawaniem, ale muszą być na liście,
żeby przy przepisywaniu nikt ich nie zgubił.

## Legenda (pięć stanów, nie dwa)

| Znak | Znaczenie |
|---|---|
| ✅ | zrobione w kodzie tego repo — z dowodem (strażnik/test/smoke) |
| 🟡 | częściowo — reszta wymaga pracy poza kodem |
| 🔧 | MANUAL — wymaga konfiguracji poza repo (hosting, DNS, konto) |
| ⛔ | nie dotyczy TEJ architektury — z powodem, nie ciszą |
| ⏳ | świadomie odłożone do etapu WP — wchodzi do specyfikacji wtyczki |

„Niezaznaczone" nie istnieje: każda pozycja ma stan i powód.

## 1. Aplikacja (serwer + formularze)

| Stan | Pozycja | Dowód / powód |
|---|---|---|
| ✅ | Walidacja WEJŚCIA po stronie serwera schematami Zod — każda akcja dyspozytora przechodzi przez kontrakty z `modules/m1-sklep/typy.ts` (discriminatedUnion), złe dane = 400 z mapą pól | testy dyspozytora (36/36), `straznik-kreatora` pilnuje, że panel pokrywa kontrakty |
| ✅ | Walidacja WYJŚCIA — kanał JSON (`odczyt.ts`) przepuszcza dane z bazy przez Zod przed oddaniem stronie; zepsuty rekord nie renderuje się „jakoś", tylko pada głośno | golden `goldeny/d3-odczyt.json` + testy |
| ✅ | SQL wyłącznie przez zapytania parametryzowane w `modules/` — poza działem nie ma ani klienta SQL, ani connection stringa | `straznik-granic` (łapie nawet nazwę zmiennej środowiskowej poza `modules/` — zatrzymał pretest w tym samym tygodniu, w którym powstał) |
| ✅ | Mutacje bazy w transakcjach z aktorem; usuwanie jawnie od dołu, żeby audyt znał kurs | `dyspozytor.ts`, testy „każda akcja zostawia ślad w changelogu" |
| ✅ | Niezmienny dziennik zmian w bazie (trigger `m1_audyt` na 4 tabelach) — próba edycji/kasowania wpisu audytu pada na poziomie Postgresa | testy migracji, golden `goldeny/d2-schemat.json` |
| ✅ | Brama kreatora: porównanie tokenu w stałym czasie + kara czasowa za zły token (spowalnia zgadywanie) | `lib/kreator-dostep.ts`, smoke D6 sprawdza 403 |
| ✅ | Dyspozytor sprawdza token PRZED walidacją — nieuwierzytelniony nie dostaje nawet mapy błędnych pól (nie zwiedza kontraktu) | zmiana z D6 (403 zamiast 400), smoke D6 |
| ⏳ | Rate limiting na akcjach zapisu (okno przesuwne po IP+akcja) — kara czasowa bramy to namiastka dla JEDNEGO użytkownika-właściciela; sklep z klientami musi mieć pełny limiter | wymóg wpisany do specyfikacji WP (sekcja 8) |
| ⏳ | Honeypot + pomiar czasu wypełnienia w formularzach klienta | formularze klienta (zakup, kontakt) powstają dopiero w Pluginie 2 |
| ⏳ | Generyczne komunikaty błędów NA ZEWNĄTRZ (klient), szczegóły tylko w logu | dziś jedynym użytkownikiem panelu jest właściciel — mapa pól to feature; przy klientach zewnętrznych to wyciek |
| ⛔ | Upload plików — kreator przyjmuje okładkę wyłącznie jako URL/ścieżkę (decyzja właściciela przy D6), więc walidacji uploadu nie ma czego dotyczyć | wraca przy WP, jeśli wtyczka dostanie media |

## 2. Nagłówki / transport

| Stan | Pozycja | Dowód / powód |
|---|---|---|
| ✅ | `X-Content-Type-Options: nosniff` | `next.config.ts`; smoke D4 sprawdza na produkcyjnym `next start` |
| ✅ | `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'` — kreator chodzi na ciastku, clickjacking to atak dokładnie na taki panel | jw. |
| ✅ | `Referrer-Policy: strict-origin-when-cross-origin` | jw. |
| ✅ | `Permissions-Policy` odcina kamerę/mikrofon/geolokalizację | `next.config.ts` |
| ⏳ | Pełne CSP (`script-src` z nonce, bez `unsafe-inline`) — w prototypie byłoby teatrem: WordPress dostanie WŁASNĄ politykę pisaną pod realny zestaw skryptów wtyczek | specyfikacja WP; idea ze strony głównej: strażnik ma pilnować, że polityka nie zawiera słów unieważniających ochronę |
| 🔧 | HTTPS + HSTS — decyduje hosting (domena `automaticai.pl` jeszcze niekupiona) | etap WP: hosting z wymuszonym HTTPS, HSTS dopiero po potwierdzeniu certyfikatów na subdomenach |
| ✅ | Ciastko kreatora: HttpOnly (niewidoczne dla JS strony), `Secure` zależnie od protokołu żądania | `lib/kreator-dostep.ts` z D6 |

## 3. Cookies / prywatność

| Stan | Pozycja | Dowód / powód |
|---|---|---|
| ✅ | Jedyne ciastko = sesja kreatora (HttpOnly); zero analytics, zero śledzenia, zero localStorage z danymi osobowymi | przegląd kodu; strona kursanta nie ustawia niczego |
| ⛔ | Baner cookies — ciastko czysto techniczne (sesja panelu) nie wymaga zgody wg ePrivacy | wróci do oceny, gdy WP/LMS dołoży własne ciastka |
| ⏳ | Polityka prywatności + RODO (dane klientów: e-mail, faktury) | Plugin 2/3 — tam pojawiają się dane osobowe klientów; wybór LMS (Publigo) ma to częściowo w pudełku |

## 4. Sekrety / repo / CI

| Stan | Pozycja | Dowód / powód |
|---|---|---|
| ✅ | Sekrety poza repo: `.env` w `.gitignore`, w repo tylko `.env.example` z wartościami dev | gitleaks w CI na PEŁNEJ historii (`fetch-depth: 0`) |
| ✅ | Skan sekretów: binarka gitleaks z przypiętą wersją i SHA-256, `--redact` (znalezisko nie trafia jawnie do logów CI) | `.github/workflows/ci.yml`, job „Skan sekretów" |
| ✅ | `permissions: contents: read` — żaden job CI nie umie pisać do repo | `ci.yml` |
| ✅ | Akcje GitHuba przypięte pełnym SHA, nie tagiem | `ci.yml` (checkout, setup-node) |
| ✅ | Token kreatora: procedura wymiany opisana, plik przejściowy kasowany po `gh auth login` | CLAUDE.md („Gdy token wygaśnie") |
| 🔧 | Branch protection na `plugin-1-sklep-kursow` — plan Free organizacji nie pozwala na ochronę gałęzi w repo prywatnym; namiastką jest dyscyplina Weryfikacji-PR | sprawdzone 2026-08-18 (HTTP 403 przy próbie odczytu ochrony) |
| 🔧 | 2FA wymuszone na poziomie organizacji — decyzja właściciela (uwaga: włączenie wymogu automatycznie usuwa z organizacji członków bez 2FA) | ustawienia organizacji MatthewPlugins |

## 5. Konta i dostęp

Aplikacja ma jedno konto (właściciel-kreator, token). Realną
powierzchnią ataku są konta GitHub zespołu i przyszłe konta klientów.

| Stan | Pozycja | Dowód / powód |
|---|---|---|
| 🔧 | 2FA na kontach GitHub zespołu (TOTP albo klucz; SMS jako ostatnia opcja) + kody odzyskiwania poza tym samym urządzeniem | poza repo; materiał kursu 2 moduł 6 opisuje procedurę krok po kroku — zjadamy własne lekcje |
| ⏳ | Konta klientów, sesje, reset hasła, brute force | Plugin 3 + LMS za logowaniem — cała kategoria wchodzi ze specyfikacją WP |

## 6. SEO / crawling

Podstrona jest prototypem BEZ publicznej domeny — SEO produkcyjne
powstanie na WordPressie. W prototypie pilnujemy tego, co przenosi
się jako specyfikacja treści:

| Stan | Pozycja | Dowód / powód |
|---|---|---|
| ✅ | Metadane per strona: tytuł i opis katalogu, stron kursów (z bazy), kreatora | `export const metadata` / `generateMetadata` w `app/szkolenia/**` |
| ✅ | Jeden `<h1>` na stronę, semantyczne nagłówki sekcji sprzedażowych | struktura komponentów `components/kurs/*` z D5/B5 |
| ✅ | 404 dla śmieciowych slugów i szkiców (gość nie widzi draftu — też SEO: brak indeksowania wersji roboczych) | smoke D5 pilnuje obu stron bramki |
| ⏳ | robots.txt, sitemapa, canonicale, dane strukturalne (JSON-LD Course/Product), OpenGraph obrazki | domena + WP; wzorzec ze strony głównej: sitemap bez fałszywego `lastModified`, RSS jako druga sitemapa — do przeniesienia jako wymagania |
| ⏳ | Pomiar Lighthouse z progami (wydajność ≥90, dostępność ≥95, SEO ≥90, CLS ≤0,1, LCP ≤2,5 s) — jak na stronie głównej | wymaga Chrome i publicznego adresu; progi zapisane już dziś, żeby weszły do definicji „gotowe" etapu WP |

## 7. Domena / e-mail

| Stan | Pozycja | Dowód / powód |
|---|---|---|
| 🔧 | Domena `automaticai.pl` — jeszcze niekupiona (adresy w kodzie to placeholdery docelowe) | decyzja zakupowa właściciela |
| ⏳ | SPF `-all`, DKIM, DMARC (`none → quarantine → reject`), DNSSEC — maile transakcyjne (potwierdzenie zakupu, link do logowania) BEZ tego lądują w spamie, co przy kursie online jest awarią sprzedaży | etap WP, razem z wyborem dostawcy poczty; checklist strony głównej ma gotową kolejność |

## 8. Specyfikacja bezpieczeństwa wtyczki WP (zbiera wszystkie ⏳)

Przy przepisywaniu na WordPressa ta sekcja staje się listą wymagań
wejściowych — nie „dobrymi praktykami do rozważenia":

1. walidacja server-side każdego pola (odpowiednik kontraktów Zod
   po stronie PHP), nonce WP na każdą akcję zapisu;
2. rate limiting okno-przesuwne po IP+akcja na endpointach zapisu;
3. honeypot + pomiar czasu wypełnienia w formularzach klienta;
4. generyczne błędy na zewnątrz, szczegóły w logu bez PII;
5. pełne CSP nagłówkiem + strażnik „polityka nie zawiera słów
   unieważniających ochronę";
6. HTTPS + HSTS po weryfikacji subdomen; SPF/DKIM/DMARC przed
   pierwszym mailem transakcyjnym;
7. konta klientów: hashowanie haseł w standardzie WP/LMS, limity
   prób, sesje z rotacją, reset przez e-mail z wygasającym tokenem;
8. RODO: polityka prywatności, rejestr zgód, eksport/usunięcie danych
   klienta (LMS z polskimi płatnościami ma to w pudełku — sprawdzić
   przy wyborze).

Prototyp już dziś DOWODZI pozycji 1 (Zod), transakcyjności i audytu —
to jest część „specyfikacji przez działający kod", o którą chodziło
w decyzji zespołu.
