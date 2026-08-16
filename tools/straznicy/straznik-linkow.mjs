/**
 * Strażnik linków: względne linki w plikach Markdown muszą prowadzić
 * do istniejących plików.
 *
 * PO CO. README i dokumentacja mają być „zawsze zgodne z prawdą" — link
 * do pliku, którego nie ma (bo został przeniesiony albo jeszcze nie
 * powstał), to dokumentacja, która kłamie. Martwy link wygląda w podglądzie
 * identycznie jak żywy; wykrywa go dopiero kliknięcie albo ten strażnik.
 *
 * Sprawdza wyłącznie linki względne (`[x](docs/PLAN.md)`); adresów
 * http(s) i kotwic `#sekcja` nie dotyka — ich weryfikacja wymaga sieci
 * i nie jest zadaniem na pre-commit.
 *
 * Użycie: node tools/straznicy/straznik-linkow.mjs
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";

const POMIJANE = new Set(["node_modules", ".git", ".next", "out", "vendor"]);

function plikiMd(katalog) {
  const wynik = [];
  for (const nazwa of readdirSync(katalog)) {
    if (POMIJANE.has(nazwa)) continue;
    const sciezka = join(katalog, nazwa);
    const s = statSync(sciezka);
    if (s.isDirectory()) wynik.push(...plikiMd(sciezka));
    else if (nazwa.endsWith(".md")) wynik.push(sciezka);
  }
  return wynik;
}

const bledy = [];

for (const plik of plikiMd(".")) {
  const tresc = readFileSync(plik, "utf8");
  // [tekst](cel) — bez obrazków z adresami zewnętrznymi i bez mailto
  for (const m of tresc.matchAll(/\[[^\]]*\]\(([^)#\s]+)(#[^)\s]*)?\)/g)) {
    const cel = m[1];
    if (/^(https?:|mailto:|tel:)/.test(cel)) continue;
    const bezwzgledna = join(dirname(plik), cel);
    if (!existsSync(bezwzgledna)) {
      bledy.push(`${plik}: martwy link → ${cel}`);
    }
  }
}

if (bledy.length > 0) {
  console.error("straznik-linkow:");
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}
