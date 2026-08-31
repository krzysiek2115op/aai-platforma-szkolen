# Audyt bezpieczeństwa etapu WordPress — stan i release

**CZYTAĆ PRZED DALSZĄ PRACĄ NAD BEZPIECZEŃSTWEM.** Praca prowadzona
równolegle z czatem „test całości / zamrożenie ceny" (worktree
`feat/zamrozenie-ceny-w-zamowieniu`). Ten czat siedzi na gałęzi
**`docs/panel-zostaje-jaki-jest`** (główne drzewo, `:8892` na wyłączność).

## Zakres i decyzje właściciela
- Pełny audyt bezpieczeństwa 3 wtyczek (`aai-sklep`, `aai-platnosci`,
  `aai-monitor`) + WordPress + WooCommerce + Tutor. **Najpierw audyt →
  raport → krytyka → dopiero kod.** Nie commitować/mergować bez „ok".
- **Podział warstw (decyzja 2026-08-31):** nasze 3 wtyczki = bezpieczeństwo
  własnej logiki; **osobny mu-plugin obwodowy** = globalne guardy WP;
  **hosting** = HSTS, blokada `readme.html`, XML-RPC na serwerze.
- **CSP:** Report-Only → obserwacja → egzekwowanie. **Skrypt motywu
  (read-only) → hash + strażnik.** XML-RPC → wyłączyć w całości.
  3 nagłówki od razu globalnie na froncie (bez wp-admin).
- **Wszystko z tej dziedziny ma wejść JEDNYM releasem zabezpieczeniowym**
  przed tagiem/merge (decyzja 2026-08-31).

## Wynik audytu (raport ETAP 5)
Warstwa aplikacyjna 3 wtyczek okazała się **bardzo dobrze zabezpieczona**:
zero SQLi, XSS, braków nonce/capability, brak obejścia dostępu ani
manipulacji ceny (cena liczona serwerowo z `_price`; `sold_individually`
blokuje ilość; próba zakupu posiadanego kursu → odmowa obiema drogami).
Integralność checkout→order→payment: **golden/snapshot NIE potrzebny** (Woo
trzyma cenę na `order_item` w chwili zakupu; kopia jest jednokierunkowa).

Realne ryzyko było na OBWODZIE:
- **W-1 (WYSOKIE):** XML-RPC + `system.multicall` — 20 prób logowania w 1
  żądaniu → 1 wiersz w dzienniku Pluginu 3 (łamało kontrakt D6). + pingback SSRF.
- **S-2 (ŚREDNIE):** enumeracja userów — `/wp-json/wp/v2/users` oddawało login
  `admin`; druga droga `?author=1` → 301 na `/author/admin/`.
- **S-1 (ŚREDNIE):** brak nagłówków bezpieczeństwa (w tym CSP) na froncie.
- **N-1 (NISKIE):** wersja WP w `generator`/`readme.html`.
- **A-1 (DOSTĘPNOŚĆ):** komunikaty odmowy koszyka — do sprawdzenia aria-live;
  **poza zakresem releasu zabezpieczeń**, odłożone.

## ZROBIONE I ZWERYFIKOWANE (ten czat) — Warstwa B, mu-plugin obwodowy
Plik: **`wordpress/srodowisko/mu-plugins/aai-obwod.php`** (mount → kontener
na `:8892`, ładuje się bez restartu). Klasa `Aai_Obwod`.

1. **XML-RPC wyłączony w całości** — `xmlrpc_enabled __return_false` +
   `xmlrpc_methods __return_empty_array` + zdjęty `X-Pingback`/pingback.
   Zweryfikowane: `wp.getUsersBlogs` → „does not exist", POST → 405.
2. **`<head>` odchudzony** — `wp_generator`, `rsd_link`, `wlwmanifest_link`,
   `wp_shortlink_wp_head`, `?ver=` wersji rdzenia zdjęte.
3. **4 nagłówki na froncie (poza wp-admin, bramka `is_admin()`):**
   `X-Content-Type-Options: nosniff`, `Referrer-Policy:
   strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN`,
   `Permissions-Policy` (kamera/mikrofon/geo/płatności… wyłączone).
4. **S-2 domknięte dwoma drogami:** REST `/wp/v2/users` zdjęte gościowi
   (trasa, nie pola → 404 nierozróżnialne), oraz `?author=N`/`author_name`
   → 404 na `parse_request` dla niezalogowanych. Zweryfikowane: gość 404,
   admin z nonce REST 200.
5. **Hasła aplikacji wyłączone** (`wp_is_application_passwords_available
   __return_false`) — kanał REST omijający dziennik logowań (F12).
6. **CSP EGZEKWUJĄCE** (`Content-Security-Policy`, nie Report-Only) — front,
   poza wp-admin. Polityka: `script-src 'self' 'nonce-<per-request>'
   '<hash-guardu-motywu>' '<hash-wc_no_js>' 'inline-speculation-rules'`;
   `style-src 'self' 'unsafe-inline'` (KONIECZNE — 15–23 atrybuty `style=`);
   `img-src 'self' data:`; `connect-src 'self'`; `frame-src 'none'`;
   `frame-ancestors 'self'`; `object-src 'none'`; `base-uri 'self'`;
   `form-action 'self'`; `report-uri` → kolektor.
   - **Nonce** dokładany do inline i src skryptów przez
     `wp_inline_script_attributes` + `wp_script_attributes` (ta sama wartość
     w nagłówku i na tagach — zweryfikowane ZGODNE).
   - **Kolektor** (`admin-post.php?action=aai_obwod_csp`, obie gałęzie) —
     agreguje naruszenia (limit ciała 8 kB strumieniem, rate-limit 60/min,
     sufit 200 rodzajów, bez PII). Działa też pod egzekwowaniem — siatka na
     zmiany w cudzych statycznych skryptach.

### DOWÓD EGZEKWOWANIA (rig: puppeteer-core + systemowy Firefox, BiDi)
Metoda: ręczny start `firefox --headless --no-remote --profile <świeży>
--remote-debugging-port 9223` (okno użytkownika blokuje launcher puppeteera),
`puppeteer.connect(ws://127.0.0.1:9223/session)`, nasłuch
`securitypolicyviolation`. Skrypty w scratchpadzie sesji.
- Report-Only bez nonce: 2 naruszenia/front, 20/kasa (same inline skrypty).
- Po nonce: **1/stronę** — jedyny to statyczny `wc_no_js` WooCommerce
  (surowy `<script>`, omija interfejs). Zhashowany.
- **Po hashu wc_no_js: ZERO naruszeń** na katalogu, kursie, lekcji (gość
  i zalogowany klient), koszyku, kasie ze Store API w pełni, „Moich kursach",
  stronie konta. Zakup pod egzekwowaniem: `add-item` → **201**.
- JSON-LD (`Aai_Sklep_Seo` + motyw) i speculationrules **nie łamią** —
  ld+json niewykonywalny, speculationrules objęty keywordem.

### Hashe (kruche — pilnowane)
- guard hydracji motywu (`header.php`, read-only, generowany):
  `sha256-wWMpFPmbife9zJIGhhzVCMWkvaZZCMbyNw/QOf4tNWs=`
- `wc_no_js` WooCommerce (statyczny, zależny od wersji Woo):
  `sha256-eHL/Izx7K/qWL0kdBXXnHwsLSHvGOJn/THLHydUZdog=`
- Regeneracja motywu / aktualizacja Woo zmieni skrypt → hash przestanie
  pasować → hydracja/wc_no_js padną **po cichu** pod egzekwowaniem. Łapie to
  `straznik-obwodu` (motyw, gdy na dysku) + kolektor (żywy ruch).

## Kontrola jakości (rygor repo)
- **`tools/straznicy/straznik-obwodu.mjs`** (nowy, 39. strażnik) — reguły
  pytają o ZACHOWANIE, nie o obecność napisu (siódmy nawrót pułapki).
  Warunkowy hash motywu (pomija, gdy motyw poza dyskiem).
- **Audyt mutacyjny 305 → 319** (14 wpisów obwodu, wszystkie ZŁAPANE,
  0 przeoczonych/martwych). README „na 319 sposobów".
- **Strażnicy 38/38 zielonych**, `straznik-readme` zgodny (wiersz tabeli
  + liczniki), `straznik-linkow` zielony.

## Warstwa A — ODPUSZCZONA
Rejestracja multicall w monitoringu **bezprzedmiotowa**: XML-RPC martwy
w obwodzie, więc nie ma czego logować. Druga warstwa = blok serwera.

## Warstwa C — HOSTING (poza kodem, „przed pierwszym klientem")
HSTS, blokada `readme.html`, XML-RPC na serwerze (druga warstwa),
oraz **UWAGA WDROŻENIOWA:** nonce CSP jest losowy na żądanie — pełny cache
HTML strony podałby stary nonce do nowego nagłówka i wywalił skrypty;
na produkcji cache HTML musi omijać strony z CSP albo liczyć nonce
cache-aware (klasa A11 wydajności).

## STAN DRZEWA — 4 pliki, zero cudzych
```
 M README.md                              (licznik 319 + wiersz tabeli obwodu)
 M tools/straznicy/audyt-straznikow.mjs   (MU_OBWOD + 14 mutacji obwodu)
?? tools/straznicy/straznik-obwodu.mjs    (nowy)
?? wordpress/srodowisko/mu-plugins/aai-obwod.php (nowy)
```
Drugi czat jest w osobnym worktree; `git add -A` nie zgarnie nic jego.

## NASTĘPNY KROK (po /clear) — RELEASE ZABEZPIECZENIOWY
Bezpieczeństwo (część w naszym kodzie) jest **MERYTORYCZNIE KOMPLETNE**.
Zostaje domknięcie releasu — **wymaga „ok" właściciela**:
1. `npm run check` w całości (lint, tsc, test, build, smoke) — dotąd
   uruchomiono tylko strażników 38/38; moje zmiany to PHP + JS strażnik +
   README + audyt, nie ruszają TS/build, ale pełny przebieg potwierdzić.
2. **CHANGELUG + wpis wersji** (nowa wersja projektu — release zabezpieczeń).
3. **Commit** na `docs/panel-zostaje-jaki-jest` → PR → (CI stoi do 1 września,
   merge na dowodach lokalnych za zgodą właściciela) → **tag + release**.
4. Po powrocie CI (1 września) potwierdzić **gitleaks**.
5. Kolejność ustalona przez właściciela: **zabezpieczenia (my) → commit →
   merge → release → testy ręczne → SEO → audyt końcowy.** Drugi czat
   wciągnie naszą pracę do siebie PO naszym merge'u.

**Środowisko `:8892`:** mu-plugin AKTYWNY, CSP egzekwujące, agregat CSP
pusty, dane T4 (logowania id≤12) nietknięte, `wp aai-platnosci sprawdz`
i `wp aai-monitor sprawdz` kod 0, sprzedaż otwarta, kursy 2/produkty 2.
