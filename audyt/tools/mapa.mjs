/**
 * MAPA POKRYCIA — czy każdy plik repozytorium ma swój dział (W6).
 *
 * TRZY STANY, NIE DWA. Bez trzeciego "świadomie wykluczony" wykluczenie
 * decyzją właściciela (D4: 399 plików kursów) i zwykłe przeoczenie wyglądałyby
 * IDENTYCZNIE — mapa milczałaby o jednym i o drugim tak samo.
 *
 *   przypisany           bierze go co najmniej jeden dział
 *   świadomie wykluczony jest na liście wykluczeń, z powodem
 *   SIEROTA              nie bierze go NIKT — to jest znalezisko
 *
 * ZAKRESY CZYTAMY Z `ROLE.md`, nie z własnej listy. Kopia rozjechałaby się po
 * cichu z dokumentem, który właściciel zaakceptował — ta sama zasada, dla
 * której `straznik-wagi-dokumentacji` importuje manifest zamiast trzymać nazwy.
 *
 * Użycie:
 *   node audyt/tools/mapa.mjs            # tabela + kod 1, gdy są sieroty
 *   node audyt/tools/mapa.mjs --json     # do porównania migawek
 */
import { execFileSync } from "node:child_process";
import { KORZEN, zakresyZRoleMd } from "./wspolne.mjs";

/**
 * Wykluczenia z POWODEM. Każdy wiersz musi wskazywać decyzję — wykluczenie
 * bez powodu jest nie do odróżnienia od przeoczenia.
 */
export const WYKLUCZENIA = [
  {
    komenda: "git ls-files -- 'tresc-kursow'",
    powod: "D4 — kursy poza zakresem audytu (decyzja właściciela 2026-09-01)",
  },
  {
    komenda: "git ls-files -- 'docs/dokumentacja-techniczna' ':(exclude,glob)docs/dokumentacja-techniczna/*/ZRODLA.md'",
    powod: "cudza dokumentacja i cytaty do lekcji; ZRODLA.md zostają w dziale REPO",
  },
];

const gitPliki = (komenda) =>
  execFileSync("bash", ["-c", komenda], { cwd: KORZEN, encoding: "utf8", maxBuffer: 1 << 26 })
    .split("\n")
    .filter(Boolean);

export function policzMape() {
  const wszystkie = new Set(gitPliki("git ls-files"));

  const dzialy = [];
  const przypisane = new Set();
  for (const { kod, komenda } of zakresyZRoleMd()) {
    const pliki = gitPliki(komenda);
    dzialy.push({ kod, ile: new Set(pliki).size, pusty: pliki.length === 0 });
    for (const p of pliki) przypisane.add(p);
  }

  const wykluczone = new Set();
  for (const w of WYKLUCZENIA) for (const p of gitPliki(w.komenda)) wykluczone.add(p);

  const sprzeczne = [...przypisane].filter((p) => wykluczone.has(p)).sort();
  const sieroty = [...wszystkie].filter((p) => !przypisane.has(p) && !wykluczone.has(p)).sort();

  return {
    wszystkie: wszystkie.size,
    przypisane: przypisane.size,
    wykluczone: wykluczone.size,
    sieroty,
    sprzeczne,
    dzialy,
    zamyka: przypisane.size + wykluczone.size === wszystkie.size && sprzeczne.length === 0,
  };
}

const m = policzMape();

if (process.argv.includes("--json")) {
  process.stdout.write(JSON.stringify({ ...m, sieroty: m.sieroty.length, sprzeczne: m.sprzeczne.length }, null, 2) + "\n");
} else {
  process.stdout.write("MAPA POKRYCIA — trzy stany\n\n");
  for (const d of m.dzialy) {
    process.stdout.write(`  ${d.kod.padEnd(6)} ${String(d.ile).padStart(4)} plików${d.pusty ? "   ← ZAKRES PUSTY" : ""}\n`);
  }
  process.stdout.write(
    `\n  przypisane   ${String(m.przypisane).padStart(4)}\n` +
    `  wykluczone   ${String(m.wykluczone).padStart(4)}   (${WYKLUCZENIA.map((w) => w.powod.split(" —")[0]).join(", ")})\n` +
    `  SIEROTY      ${String(m.sieroty.length).padStart(4)}\n` +
    `  sprzeczne    ${String(m.sprzeczne.length).padStart(4)}   (i przypisany, i wykluczony)\n` +
    `  suma         ${m.przypisane} + ${m.wykluczone} = ${m.przypisane + m.wykluczone} / ${m.wszystkie}\n`
  );
  for (const s of m.sieroty) process.stdout.write(`    SIEROTA:   ${s}\n`);
  for (const s of m.sprzeczne) process.stdout.write(`    SPRZECZNY: ${s}\n`);
}

// Zakres, który daje ZERO plików, jest zepsuty i przechodziłby po pustce.
const puste = m.dzialy.filter((d) => d.pusty);
if (puste.length) {
  process.stdout.write(`\nZAKRES PUSTY w działach: ${puste.map((d) => d.kod).join(", ")} — komenda nie obejmuje niczego.\n`);
}

process.exit(m.zamyka && !puste.length ? 0 : 1);
