/**
 * TESTY NEGATYWNE asercji treści — dowód, że bramka z zasady 9 briefu UMIE
 * odmówić zapisu obrazu.
 *
 * PO CO OSOBNY PLIK, A NIE SAM STRAŻNIK. Strażnik (`straznik-asercji`) biegnie
 * przy każdym commicie i sprawdza logikę porównania bez przeglądarki — tanio.
 * Tu sprawdzamy CAŁĄ DROGĘ obu narzędzi (Firefox, xterm.js, sharp): że przy
 * niespełnionej asercji proces kończy się błędem i PLIK NIE POWSTAJE. Bez tego
 * mielibyśmy dowód na moduł, a nie na narzędzie — czyli dokładnie tę klasę
 * pomyłki, którą właściciel unieważnił 2026-08-23.
 *
 * Każda próba ma parę: wariant, który MUSI przejść, i wariant, który MUSI
 * upaść — inaczej „zielono" znaczyłoby tylko tyle, że narzędzie w ogóle nie
 * doszło do porównania.
 *
 * Użycie:  ZRZUTY_RIG=<rig> node tools/zrzuty/test-asercji.mjs
 */
import { writeFileSync, existsSync, rmSync, mkdtempSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";

const KAT = mkdtempSync(join(tmpdir(), "test-asercji-"));
const NARZ = (n) => new URL(n, import.meta.url).pathname;
let porazki = 0;

function proba(nazwa, narzedzie, spec, { kodWyjscia, plikMaByc }) {
  const specPlik = join(KAT, `spec-${Math.abs(hash(nazwa))}.json`);
  const wyjscie = spec.wyjscie;
  if (existsSync(wyjscie)) rmSync(wyjscie);
  writeFileSync(specPlik, JSON.stringify(spec));
  const r = spawnSync(process.execPath, [NARZ(narzedzie), specPlik], { encoding: "utf8", timeout: 180000 });
  const plikJest = existsSync(wyjscie);
  const okKod = r.status === kodWyjscia;
  const okPlik = plikJest === plikMaByc;
  if (okKod && okPlik) { console.log(`  ✔ ${nazwa}`); return; }
  porazki++;
  console.error(`  ✖ ${nazwa}`);
  console.error(`      kod wyjścia: ${r.status} (oczekiwano ${kodWyjscia}), plik ${plikJest ? "JEST" : "brak"} (oczekiwano ${plikMaByc ? "JEST" : "brak"})`);
  console.error(`      stderr: ${(r.stderr || "").trim().split("\n").slice(0, 3).join(" | ")}`);
}
const hash = (s) => [...s].reduce((a, z) => (a * 31 + z.charCodeAt(0)) | 0, 7);

// ── TUI ────────────────────────────────────────────────────────────────────
// Strumień udaje ekran terminala: dwa wiersze, każdy z innym napisem.
const raw = join(KAT, "sesja.raw");
writeFileSync(raw, "Claude Code won't ask before using allowed tools.\r\nBash(npm test)\r\n");
const tui = (dod) => ({ raw, wyjscie: join(KAT, "tui.webp"), kolumny: 80, wiersze: 6, ...dod });

console.log("tui.mjs:");
proba("asercja spełniona → obraz powstaje", "tui.mjs",
  tui({ wymagaTekstu: ["Claude Code won't ask before using allowed tools.", "Bash("] }),
  { kodWyjscia: 0, plikMaByc: true });
proba("NEGATYWNY: fragment, którego na ekranie nie ma → brak obrazu", "tui.mjs",
  tui({ wymagaTekstu: ["Claude Code will always reject requests to use denied tools."] }),
  { kodWyjscia: 8, plikMaByc: false });
proba("NEGATYWNY: fragment poza KADREM → brak obrazu", "tui.mjs",
  tui({ przytnijOd: 1, przytnijDo: 1, wymagaTekstu: ["Bash(npm test)"] }),
  { kodWyjscia: 8, plikMaByc: false });
proba("wzorzec re: spełniony → obraz powstaje", "tui.mjs",
  tui({ wymagaTekstu: ["re:Bash\\(npm test\\)"] }), { kodWyjscia: 0, plikMaByc: true });
proba("NEGATYWNY: wzorzec re: bez pokrycia na ekranie → brak obrazu", "tui.mjs",
  tui({ wymagaTekstu: ["re:\\d{1,2}:\\d{2}"] }), { kodWyjscia: 8, plikMaByc: false });
proba("NEGATYWNY: specyfikacja bez wymagaTekstu → brak obrazu", "tui.mjs",
  tui({}), { kodWyjscia: 7, plikMaByc: false });
proba("NEGATYWNY: wymagaTekstu puste → brak obrazu", "tui.mjs",
  tui({ wymagaTekstu: [] }), { kodWyjscia: 7, plikMaByc: false });

// ── przeglądarka ───────────────────────────────────────────────────────────
const strona = join(KAT, "strona.html");
writeFileSync(strona, `<!doctype html><meta charset="utf-8"><style>body{margin:0;font:16px sans-serif}
 #gora{height:400px;background:#eee}#dol{height:400px;background:#ddd}</style>
 <div id="gora"><h1>Memory files</h1><p>CLAUDE.md</p></div>
 <div id="dol"><h2>Summarize from here</h2></div>`);
const www = (dod) => ({ url: `file://${strona}`, wyjscie: join(KAT, "www.webp"), czekajMs: 300, viewport: { width: 800, height: 400 }, ...dod });

console.log("zrob-zrzut.mjs:");
proba("asercja spełniona → obraz powstaje", "zrob-zrzut.mjs",
  www({ selektor: "#gora", wymagaTekstu: ["Memory files", "CLAUDE.md"] }),
  { kodWyjscia: 0, plikMaByc: true });
proba("NEGATYWNY: fragment, którego na stronie nie ma → brak obrazu", "zrob-zrzut.mjs",
  www({ selektor: "#gora", wymagaTekstu: ["Restored the code, but skipped"] }),
  { kodWyjscia: 8, plikMaByc: false });
proba("NEGATYWNY: fragment z INNEJ sekcji niż kadrowana → brak obrazu", "zrob-zrzut.mjs",
  www({ selektor: "#gora", wymagaTekstu: ["Summarize from here"] }),
  { kodWyjscia: 8, plikMaByc: false });
proba("NEGATYWNY: fragment poza CLIP-em → brak obrazu", "zrob-zrzut.mjs",
  www({ clip: { x: 0, y: 0, width: 800, height: 200 }, wymagaTekstu: ["Summarize from here"] }),
  { kodWyjscia: 8, plikMaByc: false });
proba("NEGATYWNY: specyfikacja bez wymagaTekstu → brak obrazu", "zrob-zrzut.mjs",
  www({ selektor: "#gora" }), { kodWyjscia: 7, plikMaByc: false });

rmSync(KAT, { recursive: true, force: true });
if (porazki) { console.error(`\nTesty asercji: ${porazki} NIEZALICZONYCH.`); process.exit(1); }
console.log("\nTesty asercji: wszystkie zaliczone.");
