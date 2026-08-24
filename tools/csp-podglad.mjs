/**
 * CSP dla PODGLĄDU STATYCZNEGO — polityka wstrzykiwana do HTML-a
 * po buildzie, bo GitHub Pages nie wyśle żadnego nagłówka HTTP.
 *
 * Tryb serwerowy dostaje politykę z `proxy.serwer.ts` i nonce'ów
 * na żądanie. W eksporcie nie ma żądania, więc nie ma nonce'ów —
 * zostają HASHE treści skryptów wpisanych w stronę. Liczymy je
 * z GOTOWYCH PLIKÓW w `out/`, nie ze źródeł, i to jest sedno:
 * hash policzony ze źródła opisuje to, co zamierzaliśmy wygenerować,
 * a przeglądarka liczy hash tego, co naprawdę leży na serwerze.
 * Ta różnica kosztowała nas już raz cztery miniatury OG (0.24.0),
 * więc tym razem od początku sprawdzamy ARTEFAKT.
 *
 * KOLEJNOŚĆ JEST ISTOTNA: ten skrypt musi biec PO `og-rozszerzenie.mjs`.
 * Tamten przepisuje adresy miniatur w HTML-u — także wewnątrz danych
 * hydratacji wpisanych w stronę — więc uruchomiony po nas unieważniłby
 * policzone hashe i strona zostałaby bez skryptów. Oba kroki wiszą na
 * komendzie `npm run build:podglad`, którą woła też deploy.
 *
 * CZYM TA POLITYKA RÓŻNI SIĘ OD SERWEROWEJ (świadomie, nie z lenistwa):
 *  - bez `strict-dynamic` — w eksporcie znaczniki `<script src>` stoją
 *    wprost w HTML-u; `strict-dynamic` unieważnia `'self'`, więc
 *    zablokowałby własne chunki strony. Zostaje `'self'` + hashe;
 *  - bez `frame-ancestors` — ta dyrektywa jest w `<meta>` IGNOROWANA
 *    (przeglądarka zgłasza ostrzeżenie). Podgląd jest więc do
 *    osadzenia w ramce i to jest znany, zapisany koszt hostingu
 *    bez nagłówków — na serwerze pilnują tego `frame-ancestors`
 *    i `X-Frame-Options: DENY` naraz.
 *
 * Użycie: node tools/csp-podglad.mjs out
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { politykaCsp, ZRODLA_STYLOW } from "../lib/csp.ts";

const katalog = process.argv[2] ?? "out";

/** Wszystkie pliki .html w drzewie. */
function pliki(sciezka) {
  const wynik = [];
  for (const nazwa of readdirSync(sciezka)) {
    const pelna = join(sciezka, nazwa);
    if (statSync(pelna).isDirectory()) wynik.push(...pliki(pelna));
    else if (nazwa.endsWith(".html")) wynik.push(pelna);
  }
  return wynik;
}

/**
 * Skrypty wpisane w stronę (bez `src`) — każdy potrzebuje własnego
 * hasha. Łapiemy też `application/ld+json`: przeglądarka ich nie
 * wykonuje, ale polityka bez `unsafe-inline` blokuje KAŻDY znacznik
 * `<script>`, także niewykonywalny — i dane strukturalne zniknęłyby
 * ze strony bez jednego błędu w budowaniu.
 */
const SKRYPT_WPISANY = /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g;

/** `<meta http-equiv="Content-Security-Policy" …>` — do podmiany przy powtórce. */
const META_CSP =
  /\s*<meta http-equiv="Content-Security-Policy" content="[^"]*"\s*\/?>/g;

function hash(tresc) {
  return `'sha256-${createHash("sha256").update(tresc, "utf8").digest("base64")}'`;
}

let zmienione = 0;
let hasheRazem = 0;
const bledy = [];

for (const plik of pliki(katalog)) {
  const wejscie = readFileSync(plik, "utf8");
  // Powtórne uruchomienie ma dawać ten sam wynik, nie drugą politykę.
  const html = wejscie.replace(META_CSP, "");

  const hashe = new Set();
  for (const [, tresc] of html.matchAll(SKRYPT_WPISANY)) hashe.add(hash(tresc));

  const polityka = politykaCsp({
    skrypty: ["'self'", ...hashe].join(" "),
    style: ZRODLA_STYLOW,
    https: true, // podgląd żyje wyłącznie pod adresem https (GitHub Pages)
  })
    // W <meta> ta dyrektywa jest ignorowana — patrz nagłówek pliku.
    .replace(/;?\s*frame-ancestors 'none'/, "");

  // Polityka MUSI stanąć jako pierwszy element <head>: <meta> obowiązuje
  // dopiero to, co jest po nim w dokumencie. Wstawiona niżej przepuściłaby
  // wszystko, co Next zdążył wypisać wcześniej.
  const znacznik = `<meta http-equiv="Content-Security-Policy" content="${polityka}"/>`;
  if (!html.includes("<head>")) {
    bledy.push(`${plik}: brak <head> — nie mam gdzie wstawić polityki`);
    continue;
  }
  const wyjscie = html.replace("<head>", `<head>${znacznik}`);
  if (wyjscie !== wejscie) {
    writeFileSync(plik, wyjscie);
    zmienione += 1;
  }
  hasheRazem += hashe.size;
}

if (bledy.length > 0) {
  for (const b of bledy) console.error(`csp-podglad: ${b}`);
  process.exit(1);
}

console.log(
  `csp-podglad: polityka w ${zmienione} plikach HTML, ${hasheRazem} hashy skryptów.`
);
