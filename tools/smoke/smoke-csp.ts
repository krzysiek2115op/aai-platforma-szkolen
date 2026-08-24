import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";

/**
 * Smoke polityki CSP — sprawdza ARTEFAKT, nie deklarację.
 *
 * Strażnik czyta kod i mówi, co polityka MIAŁA robić. Ten smoke pyta
 * serwer i pliki, co naprawdę wychodzi do przeglądarki. Różnica bywa
 * kosztowna: w 0.24.0 build był zielony, weryfikacja adresu zielona,
 * a opublikowany podgląd oddawał 404 na wszystkich miniaturach OG,
 * bo krok po buildzie nie zaszedł. CSP jest gorsza od miniatur —
 * zepsuta nie objawia się niczym, po prostu przestaje chronić.
 *
 * Część 1 (tryb serwerowy, wymaga wcześniejszego `npm run build`):
 *   - nagłówek stoi na każdej trasie oddającej HTML, także na 404,
 *   - `script-src` ma nonce i `strict-dynamic`, nie ma słów
 *     unieważniających ochronę,
 *   - KAŻDY znacznik `<script>` w wysłanym HTML-u nosi nonce z nagłówka
 *     (to jest test na prerender: strona serwowana z builda dostałaby
 *      nagłówek z nonce'em, którego nie ma w jej skryptach),
 *   - nonce jest inny w każdym żądaniu,
 *   - ścieżki poza zasięgiem proxy nadal mają nagłówki z next.config.
 *
 * Część 2 (podgląd statyczny): buduje podgląd TĄ SAMĄ komendą, co
 * człowiek i deploy, po czym dla każdego pliku HTML przelicza hashe
 * wszystkich skryptów wpisanych w stronę i sprawdza, że polityka je
 * wymienia. Hash policzony z artefaktu to jedyny sposób, żeby złapać
 * krok wykonany w złej kolejności.
 *
 * UWAGA NA STAN PO SOBIE: część 2 zostawia w `.next` build PODGLĄDU
 * (tak samo robi smoke-seo). Smoke sam to wykrywa i odbudowuje wariant
 * serwerowy, ale kolejne smoke'i serwerowe wymagają `npm run build`.
 * W CI ten smoke stoi po d4/d5/d6, a przed smoke'iem podglądu.
 *
 * Użycie: node tools/smoke/smoke-csp.ts   (kod wyjścia BEZ potoku!)
 */

const PORT = 3008;
const ADRES = `http://localhost:${PORT}`;
const TRASY_HTML = ["/szkolenia", "/nie-ma-takiej-strony", "/szkolenia/kreator"];

let serwer: ReturnType<typeof spawn> | undefined;
let kodWyjscia = 0;

/** Dyrektywy polityki jako mapa: nazwa → lista źródeł. */
function dyrektywy(polityka: string): Map<string, string[]> {
  const mapa = new Map<string, string[]>();
  for (const czesc of polityka.split(";")) {
    const [nazwa, ...zrodla] = czesc.trim().split(/\s+/);
    if (nazwa) mapa.set(nazwa, zrodla);
  }
  return mapa;
}

/** Wszystkie pliki .html w drzewie. */
function plikiHtml(sciezka: string): string[] {
  const wynik: string[] = [];
  for (const nazwa of readdirSync(sciezka)) {
    const pelna = join(sciezka, nazwa);
    if (statSync(pelna).isDirectory()) wynik.push(...plikiHtml(pelna));
    else if (nazwa.endsWith(".html")) wynik.push(pelna);
  }
  return wynik;
}

const SKRYPT_WPISANY = /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g;
const ZNACZNIK_SKRYPTU = /<script[^>]*>/g;

try {
  /* ————————————— część 1: tryb serwerowy ————————————— */
  // Ten smoke sam sobie psuje warunki startowe: część 2 buduje podgląd,
  // a build eksportowy nadpisuje `.next`. Drugi przebieg wystartowałby
  // więc serwer bez proxy i padł na „brak nagłówka" — komunikat, który
  // wskazuje na politykę, a nie na prawdziwą przyczynę. Dlatego smoke
  // rozpoznaje, jaki build leży na dysku (`export-detail.json` powstaje
  // WYŁĄCZNIE przy eksporcie), i w razie czego odbudowuje wariant
  // serwerowy tą samą komendą, co człowiek.
  if (existsSync(".next/export-detail.json")) {
    console.log("smoke-csp: na dysku leży build podglądu — odbudowuję serwerowy…");
    const odbudowa = spawnSync("npm", ["run", "build"], { encoding: "utf8", env: process.env });
    if (odbudowa.status !== 0) {
      process.stderr.write(odbudowa.stdout ?? "");
      process.stderr.write(odbudowa.stderr ?? "");
      assert.fail(`build serwerowy padł (kod ${odbudowa.status})`);
    }
  }

  serwer = spawn("npx", ["next", "start", "-p", String(PORT)], {
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });
  serwer.stderr?.on("data", (d) => process.stderr.write(d));

  let gotowy = false;
  for (let i = 0; i < 60 && !gotowy; i += 1) {
    try {
      await fetch(`${ADRES}/szkolenia`);
      gotowy = true;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  assert.ok(gotowy, `serwer nie wstał na porcie ${PORT} (czy był 'npm run build'?)`);

  let adresZasobu: string | undefined;

  for (const trasa of TRASY_HTML) {
    const odp = await fetch(`${ADRES}${trasa}`);
    const html = await odp.text();
    const polityka = odp.headers.get("content-security-policy");
    assert.ok(polityka, `${trasa}: brak nagłówka Content-Security-Policy`);

    const d = dyrektywy(polityka);
    const skrypty = d.get("script-src") ?? [];
    const style = d.get("style-src") ?? [];

    const nonce = skrypty.find((z) => z.startsWith("'nonce-"))?.slice(7, -1);
    assert.ok(nonce, `${trasa}: script-src bez nonce'a — ${polityka}`);
    assert.ok(
      skrypty.includes("'strict-dynamic'"),
      `${trasa}: script-src bez 'strict-dynamic'`
    );
    assert.ok(
      !skrypty.includes("'unsafe-inline'") && !skrypty.includes("'unsafe-eval'"),
      `${trasa}: script-src ze słowem unieważniającym ochronę: ${skrypty.join(" ")}`
    );
    // `unsafe-inline` w stylach jest DECYZJĄ (lib/csp.ts) — pilnujemy,
    // żeby została tam, gdzie ją postawiono, i nie rozlała się dalej.
    assert.ok(
      style.includes("'unsafe-inline'"),
      `${trasa}: style-src bez 'unsafe-inline' — arkusz @font-face i atrybuty style zostałyby zablokowane`
    );
    for (const [dyrektywa, oczekiwane] of [
      ["default-src", "'self'"],
      ["object-src", "'none'"],
      ["base-uri", "'self'"],
      ["form-action", "'self'"],
      ["frame-ancestors", "'none'"],
    ] as const) {
      assert.deepEqual(
        d.get(dyrektywa),
        [oczekiwane],
        `${trasa}: ${dyrektywa} ≠ ${oczekiwane}`
      );
    }

    // Sedno: każdy skrypt na stronie musi nosić TEN nonce.
    const znaczniki = html.match(ZNACZNIK_SKRYPTU) ?? [];
    assert.ok(znaczniki.length > 0, `${trasa}: strona bez skryptów — czy to na pewno HTML?`);
    const bezNonce = znaczniki.filter((z) => !z.includes(`nonce="${nonce}"`));
    assert.equal(
      bezNonce.length,
      0,
      `${trasa}: ${bezNonce.length} z ${znaczniki.length} skryptów bez nonce'a z nagłówka ` +
        `(pierwszy: ${bezNonce[0]?.slice(0, 120)}). Strona z prerenderu albo znacznik dopisany bez nonce'a.`
    );

    adresZasobu ??= html.match(/\/_next\/static\/[^"']+\.css/)?.[0];
  }

  // Nonce ma być jednorazowy — dwa żądania, dwie wartości.
  const [a, b] = await Promise.all([
    fetch(`${ADRES}/szkolenia`).then((r) => r.headers.get("content-security-policy")),
    fetch(`${ADRES}/szkolenia`).then((r) => r.headers.get("content-security-policy")),
  ]);
  assert.notEqual(a, b, "polityka identyczna w dwóch żądaniach — nonce się nie odnawia");

  // Ścieżki poza zasięgiem proxy: bez pełnej polityki, ale z nagłówkami
  // z next.config.ts. Gdyby ktoś usunął tamte, ta asercja to złapie.
  assert.ok(adresZasobu, "nie znalazłem adresu arkusza w HTML-u — nie mam czego sprawdzić poza proxy");
  const zasob = await fetch(`${ADRES}${adresZasobu}`);
  assert.equal(zasob.headers.get("x-frame-options"), "DENY", "zasób statyczny bez X-Frame-Options");
  assert.equal(
    zasob.headers.get("content-security-policy"),
    "frame-ancestors 'none'",
    "zasób statyczny bez polityki z next.config.ts"
  );

  serwer.kill("SIGTERM");
  serwer = undefined;

  /* ————————————— część 2: podgląd statyczny ————————————— */
  // TĄ SAMĄ komendą, którą woła człowiek i deploy — wołanie `next build`
  // wprost pominęłoby kroki po buildzie (lekcja z 0.24.0).
  const build = spawnSync("npm", ["run", "build:podglad"], {
    encoding: "utf8",
    env: process.env,
  });
  if (build.status !== 0) {
    process.stderr.write(build.stdout ?? "");
    process.stderr.write(build.stderr ?? "");
    assert.fail(`build podglądu padł (kod ${build.status})`);
  }

  const pliki = plikiHtml("out");
  assert.ok(pliki.length > 0, "podgląd nie wyprodukował żadnego HTML-a");
  for (const plik of pliki) {
    const html = readFileSync(plik, "utf8");
    const polityka = html.match(
      /<meta http-equiv="Content-Security-Policy" content="([^"]*)"/
    )?.[1];
    assert.ok(polityka, `${plik}: brak polityki w <meta> — krok csp-podglad nie zaszedł`);

    // Polityka musi stać PRZED czymkolwiek, co mogłaby objąć.
    assert.ok(
      html.indexOf("<head>") + "<head>".length === html.indexOf("<meta http-equiv=\"Content-Security-Policy\""),
      `${plik}: polityka nie jest pierwszym elementem <head> — nie obejmie tego, co wypisano wyżej`
    );
    assert.ok(
      !polityka.includes("frame-ancestors"),
      `${plik}: frame-ancestors w <meta> jest ignorowane przez przeglądarkę — zostawia tylko ostrzeżenie w konsoli`
    );

    const d = dyrektywy(polityka);
    const skrypty = d.get("script-src") ?? [];
    assert.ok(
      !skrypty.includes("'unsafe-inline'"),
      `${plik}: 'unsafe-inline' w script-src podglądu`
    );

    // Hash każdego skryptu wpisanego w stronę MUSI być w polityce.
    let policzone = 0;
    for (const [, tresc] of html.matchAll(SKRYPT_WPISANY)) {
      const hash = `'sha256-${createHash("sha256").update(tresc, "utf8").digest("base64")}'`;
      assert.ok(
        skrypty.includes(hash),
        `${plik}: skrypt bez swojego hasha w polityce (${tresc.slice(0, 60).replace(/\s+/g, " ")}…). ` +
          "Tak wygląda krok wykonany w złej kolejności — hashe policzone przed ostatnią zmianą HTML-a."
      );
      policzone += 1;
    }
    assert.ok(policzone > 0, `${plik}: nie znalazłem skryptów do policzenia — wzorzec przestał pasować?`);
  }

  console.log(
    `smoke-csp: ${TRASY_HTML.length} tras z polityką i nonce'em w każdym skrypcie, ` +
      `${pliki.length} plików podglądu z polityką i kompletem hashy.`
  );
} catch (blad) {
  console.error("smoke-csp:", blad instanceof Error ? blad.message : blad);
  kodWyjscia = 1;
} finally {
  serwer?.kill("SIGTERM");
}

process.exit(kodWyjscia);
