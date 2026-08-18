import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";

/**
 * Smoke test Działu 4 (część dowodu bramki B4): PRAWDZIWY serwer Next
 * (produkcyjny `next start`) renderuje katalog /szkolenia z kursami
 * Z BAZY, a markup siatki zgadza się z goldenem (WYTYCZNE §5).
 *
 * Przebieg: seed kursu przez dyspozytor (w procesie, nie HTTP) →
 * `next start -p 3002` → GET /szkolenia → asercje + golden →
 * sprzątanie (usunięcie kursu, ubicie serwera).
 *
 * Wymaga: wcześniejszego `npm run build` oraz skonfigurowanej bazy
 * w środowisku (jak przy testach modułów).
 * Golden: goldeny/d4-katalog.html; odtworzenie po świadomej zmianie
 * wyglądu karty: GOLDEN_ZAPISZ=1 node tools/smoke/smoke-d4.ts
 */

process.env.KREATOR_TOKEN ??= "smoke-d4";
const TOKEN = process.env.KREATOR_TOKEN;
const PORT = 3002;
const GOLDEN = "goldeny/d4-katalog.html";

// Konfigurację bazy sprawdza sam moduł (klient.ts) — przy braku
// środowiska pierwszy seed padnie z czytelnym komunikatem.
const { obsluzAkcje, zamknijDb1 } = await import(
  "../../modules/m1-sklep/index.ts"
);

const KURS_SMOKE = {
  slug: "smoke-d4-kurs",
  title: "Kurs smoke D4",
  type: "kurs" as const,
  short_desc: "Kurs seedowany przez smoke test — nie powinien zostać w bazie.",
  price_grosze: 19900,
};

let serwer: ReturnType<typeof spawn> | undefined;
let idKursu: string | undefined;
let kodWyjscia = 0;

try {
  // seed: zapis + publikacja (katalog pokazuje tylko opublikowane)
  const zapis = await obsluzAkcje({ akcja: "zapisz", token: TOKEN, kurs: KURS_SMOKE });
  assert.equal(zapis.ok, true, `seed nie przeszedł: ${JSON.stringify(zapis)}`);
  idKursu = (zapis as { id: string }).id;
  const pub = await obsluzAkcje({ akcja: "publikuj", token: TOKEN, id: idKursu });
  assert.equal(pub.ok, true, `publikacja nie przeszła: ${JSON.stringify(pub)}`);

  serwer = spawn("npx", ["next", "start", "-p", String(PORT)], {
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });
  serwer.stderr?.on("data", (d) => process.stderr.write(d));

  let html = "";
  let naglowki: Headers | null = null;
  for (let proba = 0; proba < 60; proba++) {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      const odp = await fetch(`http://localhost:${PORT}/szkolenia`);
      if (odp.ok) {
        html = await odp.text();
        naglowki = odp.headers;
        break;
      }
    } catch {
      /* serwer jeszcze wstaje */
    }
  }
  assert.ok(html, "serwer nie wstał w 60 s");

  // Nagłówki bezpieczeństwa z next.config.ts — dowód, że produkcyjny
  // serwer je NAPRAWDĘ wysyła (konfiguracja bez smoke'a to deklaracja).
  // Komplet i uzasadnienia: docs/security-checklist.md.
  for (const [naglowek, wartosc] of [
    ["x-content-type-options", "nosniff"],
    ["x-frame-options", "DENY"],
    ["referrer-policy", "strict-origin-when-cross-origin"],
  ] as const) {
    assert.equal(
      naglowki?.get(naglowek),
      wartosc,
      `serwer nie wysyła nagłówka ${naglowek}: ${wartosc}`,
    );
  }

  // strona renderuje kurs Z BAZY
  assert.ok(html.includes("Kurs smoke D4"), "brak tytułu kursu w HTML");
  assert.ok(html.includes("199,00"), "brak sformatowanej ceny w HTML");
  assert.ok(html.includes("/szkolenia/smoke-d4-kurs"), "brak linku do strony kursu");

  // golden PIERWSZEJ karty siatki (kurs smoke jest najnowszy → pierwszy);
  // cała siatka nie nadaje się na golden, bo lokalna baza może mieć
  // dodatkowe opublikowane kursy (seed przykładów do oceny)
  const siatka = html.match(
    /<ul[^>]*data-katalog[^>]*>\s*<li>[\s\S]*?<\/li>/
  )?.[0];
  assert.ok(siatka, "brak siatki [data-katalog] z kartą w HTML");
  assert.ok(siatka.includes("smoke-d4-kurs"), "pierwsza karta to nie kurs smoke");

  if (process.env.GOLDEN_ZAPISZ) {
    writeFileSync(GOLDEN, siatka + "\n");
    console.log(`smoke-d4: zapisano golden ${GOLDEN}`);
  } else {
    let golden = "";
    try {
      golden = readFileSync(GOLDEN, "utf8").trim();
    } catch {
      assert.fail(`brak goldenu ${GOLDEN} — wygeneruj: GOLDEN_ZAPISZ=1 node tools/smoke/smoke-d4.ts`);
    }
    assert.equal(siatka, golden, "markup siatki różni się od goldenu");
  }

  console.log("smoke-d4: OK — katalog renderuje kursy z bazy, golden zgodny.");
} catch (blad) {
  console.error("smoke-d4: PORAŻKA —", blad instanceof Error ? blad.message : blad);
  kodWyjscia = 1;
} finally {
  if (idKursu) {
    await obsluzAkcje({ akcja: "usun", token: TOKEN, id: idKursu }).catch(() => {});
  }
  await zamknijDb1().catch(() => {});
  serwer?.kill("SIGTERM");
}
process.exit(kodWyjscia);
