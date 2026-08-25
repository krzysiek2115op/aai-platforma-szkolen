/**
 * Strażnik polityki bezpieczeństwa treści (CSP).
 *
 * PO CO. Wzorzec przeniesiony ze strony głównej, gdzie audyt mutacyjny
 * znalazł kontrolę sprawdzającą HASHE w polityce, ale nie samą politykę —
 * czyli strażnika, który przepuściłby `unsafe-inline`. CSP ma tę
 * nieprzyjemną własność, że osłabiona nie objawia się błędem: strona
 * działa tak samo, tylko przestaje chronić. Dlatego pilnujemy nie
 * „czy jest polityka", ale „czy nadal mówi to, co miała mówić".
 *
 * Dziewięć niezmienników, każdy z własną mutacją w audyt-straznikow:
 *  1. plik proxy nazywa się `proxy.serwer.ts` (nie `proxy.ts`),
 *  2. eksport jest DOMYŚLNY (Next 16.3.1 nie widzi nazwanego `proxy`
 *     w pliku o niestandardowym rozszerzeniu),
 *  3. `script-src` stoi na nonce + `strict-dynamic`,
 *  4. `script-src` NIE MA słów unieważniających ochronę (`unsafe-eval`
 *     wolno wyłącznie w gałęzi deweloperskiej),
 *  5. wspólna polityka ma komplet dyrektyw zamykających,
 *  6. `lib/csp.ts` nie importuje niczego z `next/*` (czyta go też
 *     zwykły skrypt Node'a po buildzie podglądu),
 *  7. `build:podglad` wstrzykuje politykę PO nadaniu rozszerzeń OG,
 *  8. każdy nasz znacznik `<script>` w kodzie ma `nonce`,
 *  9. `next.config.ts` nie hoduje drugiej, konkurencyjnej polityki,
 * 10. matcher nie wyłącza polityki dla żądań z samym nagłówkiem
 *     `purpose: prefetch` — te dostają pełny DOKUMENT, a nie ładunek
 *     RSC, i szły bez CSP prosto przed oczy użytkownika.
 *
 * Użycie: node tools/straznicy/straznik-csp.mjs
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const bledy = [];
const czytaj = (p) => (existsSync(p) ? readFileSync(p, "utf8") : null);

/* 1–4, 9–10: proxy i konfiguracja nagłówków */
const PROXY = "proxy.serwer.ts";
const proxy = czytaj(PROXY);

/* 10: wyjątek prefetchu tylko dla prefetchu ROUTERA */
if (proxy && /purpose[^\n]*prefetch/.test(proxy.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, ""))) {
  bledy.push(
    `${PROXY}: matcher pomija politykę dla żądań z nagłówkiem ` +
      "`purpose: prefetch`. Ten nagłówek wysyła PRZEGLĄDARKA przy " +
      "`<link rel=\"prefetch\">` i reguł spekulacyjnych — odpowiedzią jest " +
      "pełny dokument HTML, który potem ląduje przed oczami użytkownika, " +
      "i szedłby bez CSP. Prefetch `next/link` wyłącza się nagłówkiem " +
      "`next-router-prefetch`, który wysyła RAZEM z tamtym."
  );
}

if (existsSync("proxy.ts")) {
  bledy.push(
    "istnieje proxy.ts — ta nazwa jest widoczna także w trybie podglądu, " +
      "a `output: export` nie wspiera Proxy: build podglądu padnie. " +
      "Plik ma się nazywać proxy.serwer.ts."
  );
}

if (!proxy) {
  bledy.push(`brak ${PROXY} — tryb serwerowy zostałby bez polityki CSP`);
} else {
  if (!/export\s+default\s+function\s+proxy/.test(proxy)) {
    bledy.push(
      `${PROXY}: eksport musi być DOMYŚLNY. Next 16.3.1 nie rozpoznaje ` +
        "nazwanego eksportu `proxy` w pliku o niestandardowym rozszerzeniu " +
        "— build pada na „Middleware is missing expected function export name”."
    );
  }

  // Wyrażenie budujące script-src — bierzemy je w całości, razem
  // z gałęzią deweloperską, i oceniamy jako jedno.
  const skrypty = proxy.match(/skrypty:\s*(`[^`]*`|"[^"]*")/)?.[1] ?? "";
  if (!skrypty) {
    bledy.push(`${PROXY}: nie znalazłem wyrażenia \`skrypty:\` — polityka skryptów`);
  } else {
    if (!skrypty.includes("'nonce-")) {
      bledy.push(`${PROXY}: script-src bez nonce'a — polityka nie chroni przed wstrzyknięciem skryptu`);
    }
    if (!skrypty.includes("'strict-dynamic'")) {
      bledy.push(`${PROXY}: script-src bez 'strict-dynamic' — samo 'self' przepuszcza każdy skrypt z naszej domeny`);
    }
    if (skrypty.includes("unsafe-inline")) {
      bledy.push(`${PROXY}: 'unsafe-inline' w script-src unieważnia całą ochronę (i kasuje działanie nonce'a)`);
    }
    // `unsafe-eval` wolno TYLKO deweloperowi: React odbudowuje nim ślady stosu.
    const evalPozaDev = /unsafe-eval/.test(skrypty) && !/dev\s*\?/.test(skrypty);
    if (evalPozaDev) {
      bledy.push(`${PROXY}: 'unsafe-eval' w script-src poza gałęzią deweloperską`);
    }
  }
}

/* 5–6: wspólna polityka */
const CSP = "lib/csp.ts";
const csp = czytaj(CSP);
if (!csp) {
  bledy.push(`brak ${CSP} — polityka musi mieć jedno źródło dla obu trybów`);
} else {
  const WYMAGANE = [
    "default-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "font-src 'self'",
    "connect-src 'self'",
  ];
  for (const dyrektywa of WYMAGANE) {
    if (!csp.includes(dyrektywa)) {
      bledy.push(`${CSP}: brak dyrektywy \`${dyrektywa}\``);
    }
  }
  if (/from\s+["']next\//.test(csp)) {
    bledy.push(
      `${CSP}: import z next/* — ten plik czyta też zwykły skrypt Node'a ` +
        "(tools/csp-podglad.mjs) i taki import wywróciłby build podglądu"
    );
  }
}

/* 7: kolejność kroków po buildzie podglądu */
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const budujPodglad = pkg.scripts?.["build:podglad"] ?? "";
if (!budujPodglad.includes("csp-podglad.mjs")) {
  bledy.push(
    "package.json: `build:podglad` nie wstrzykuje polityki (csp-podglad.mjs) " +
      "— podgląd pojechałby na Pages bez CSP, a build byłby zielony"
  );
} else if (
  budujPodglad.indexOf("csp-podglad.mjs") <
  budujPodglad.indexOf("og-rozszerzenie.mjs")
) {
  bledy.push(
    "package.json: csp-podglad.mjs biegnie PRZED og-rozszerzenie.mjs — " +
      "tamten przepisuje HTML po nas i unieważnia policzone hashe skryptów"
  );
}

/* 8: nasze znaczniki <script> w kodzie muszą mieć nonce */
function plikiTsx(katalog) {
  const wynik = [];
  if (!existsSync(katalog)) return wynik;
  for (const nazwa of readdirSync(katalog)) {
    const pelna = join(katalog, nazwa);
    if (statSync(pelna).isDirectory()) wynik.push(...plikiTsx(pelna));
    else if (nazwa.endsWith(".tsx")) wynik.push(pelna);
  }
  return wynik;
}

// Komentarze wycinamy, bo opisy w tym repo cytują znaczniki (np. JsonLd
// tłumaczy, dlaczego ucieka `<` w treści `<script>`), a strażnik
// oskarżający komentarz byłby strażnikiem, którego się wyłącza.
const bezKomentarzy = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

for (const plik of [...plikiTsx("app"), ...plikiTsx("components")]) {
  const tresc = bezKomentarzy(readFileSync(plik, "utf8"));
  for (const [znacznik] of tresc.matchAll(/<script[\s\S]*?>/g)) {
    if (!/\bnonce=/.test(znacznik)) {
      bledy.push(
        `${plik}: znacznik <script> bez \`nonce\` — polityka bez ` +
          "`unsafe-inline` wycięłaby go ze strony bez śladu w budowaniu"
      );
    }
  }
}

/* 9: next.config.ts nie może hodować drugiej polityki */
const konfig = czytaj("next.config.ts") ?? "";
const cspWKonfigu = konfig.match(
  /"Content-Security-Policy",\s*value:\s*"([^"]*)"/
)?.[1];
if (cspWKonfigu && cspWKonfigu.replace(/frame-ancestors 'none'/, "").trim()) {
  bledy.push(
    "next.config.ts: polityka w nagłówkach statycznych urosła poza " +
      "`frame-ancestors 'none'`. Pełną politykę wysyła proxy (z nonce'em) " +
      "i to ona ma być jedyną prawdą — dwie polityki obowiązują naraz " +
      "i potrafią zablokować stronę bez czytelnego powodu."
  );
}

if (bledy.length > 0) {
  for (const b of bledy) console.error(`straznik-csp: ${b}`);
  process.exit(1);
}

console.log(
  "straznik-csp: script-src z nonce'em i strict-dynamic, bez słów " +
    "unieważniających ochronę; polityka w jednym miejscu, podgląd ją dostaje."
);
