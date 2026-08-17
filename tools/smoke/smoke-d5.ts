import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";

/**
 * Smoke test Działu 5 (dowód bramki B5): produkcyjny `next start`
 * renderuje PEŁNĄ stronę sprzedażową /szkolenia/[slug] z bazy —
 * hero z obietnicą, program (moduły+lekcje), cena, FAQ — a markup
 * sekcji programu zgadza się z goldenem (WYTYCZNE §5).
 *
 * Wymaga: `npm run build` + skonfigurowanej bazy (jak testy modułów).
 * Golden: goldeny/d5-program.html; odtworzenie po świadomej zmianie:
 * GOLDEN_ZAPISZ=1 node tools/smoke/smoke-d5.ts
 */

process.env.KREATOR_TOKEN ??= "smoke-d5";
const TOKEN = process.env.KREATOR_TOKEN;
const PORT = 3003;
const GOLDEN = "goldeny/d5-program.html";

const { obsluzAkcje, zamknijDb1 } = await import(
  "../../modules/m1-sklep/index.ts"
);

const KURS_SMOKE = {
  slug: "smoke-d5-kurs",
  title: "Kurs smoke D5",
  type: "kurs" as const,
  short_desc: "Kurs seedowany przez smoke test D5.",
  price_grosze: 29900,
  sections: [
    {
      kind: "hero" as const,
      position: 0,
      content: { obietnica: "Obietnica smoke D5", rozwiniecie: "Rozwinięcie smoke D5." },
    },
    {
      kind: "benefits" as const,
      position: 0,
      content: { punkty: [{ tytul: "Korzyść smoke", opis: "Opis korzyści." }] },
    },
    {
      kind: "faq" as const,
      position: 0,
      content: { pytania: [{ pytanie: "Pytanie smoke?", odpowiedz: "Odpowiedź smoke." }] },
    },
  ],
  modules: [
    {
      position: 0,
      title: "Moduł smoke",
      summary: "Opis modułu",
      lessons: [
        { position: 0, title: "Lekcja pierwsza", duration_min: 10, preview: true },
        { position: 1, title: "Lekcja druga", duration_min: 20, preview: false },
      ],
    },
  ],
};

let serwer: ReturnType<typeof spawn> | undefined;
let idKursu: string | undefined;
let kodWyjscia = 0;

try {
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
  for (let proba = 0; proba < 60; proba++) {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      const odp = await fetch(`http://localhost:${PORT}/szkolenia/smoke-d5-kurs`);
      if (odp.ok) {
        html = await odp.text();
        break;
      }
    } catch {
      /* serwer jeszcze wstaje */
    }
  }
  assert.ok(html, "serwer nie wstał w 60 s");

  // pełna strona sprzedażowa z bazy
  assert.ok(html.includes("Obietnica smoke D5"), "brak hero z obietnicą");
  assert.ok(html.includes("Korzyść smoke"), "brak sekcji korzyści");
  assert.ok(html.includes("Moduł smoke"), "brak programu");
  assert.ok(html.includes("Lekcja pierwsza"), "brak lekcji w programie");
  assert.ok(html.includes("299,00"), "brak ceny");
  assert.ok(html.includes("Pytanie smoke?"), "brak FAQ");

  // 404 dla nieistniejącego sluga
  const brak = await fetch(`http://localhost:${PORT}/szkolenia/nie-istnieje`);
  assert.equal(brak.status, 404, "nieistniejący kurs nie zwraca 404");

  // golden sekcji programu (deterministyczna przy seedzie smoke)
  const program = html.match(/<section id="program"[\s\S]*?<\/section>/)?.[0];
  assert.ok(program, "brak sekcji #program w HTML");

  if (process.env.GOLDEN_ZAPISZ) {
    writeFileSync(GOLDEN, program + "\n");
    console.log(`smoke-d5: zapisano golden ${GOLDEN}`);
  } else {
    let golden = "";
    try {
      golden = readFileSync(GOLDEN, "utf8").trim();
    } catch {
      assert.fail(`brak goldenu ${GOLDEN} — wygeneruj: GOLDEN_ZAPISZ=1 node tools/smoke/smoke-d5.ts`);
    }
    assert.equal(program, golden, "markup programu różni się od goldenu");
  }

  console.log("smoke-d5: OK — strona sprzedażowa renderuje pełny kurs z bazy.");
} catch (blad) {
  console.error("smoke-d5: PORAŻKA —", blad instanceof Error ? blad.message : blad);
  kodWyjscia = 1;
} finally {
  if (idKursu) {
    await obsluzAkcje({ akcja: "usun", token: TOKEN, id: idKursu }).catch(() => {});
  }
  await zamknijDb1().catch(() => {});
  serwer?.kill("SIGTERM");
}
process.exit(kodWyjscia);
