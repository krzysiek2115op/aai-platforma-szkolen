/**
 * MIGAWKA WARTOŚCI — stan mierzalny przed audytem i po nim (W6).
 *
 * §18 regulaminu: "mapę projektu robimy przed audytem i po audycie, żeby
 * sprawdzić, czy audyt niczego nie zmienił w kodzie". Rozjazd migawek
 * **zatrzymuje proces**, nie jest notatką — bo znaczy, że sektor, który miał
 * tylko patrzeć, coś ruszył (złamanie W2).
 *
 * Migawka bierze WARTOŚCI, nie opisy: liczby bramek, sumę kontrolną drzewa
 * produktu i stan gita. Deklaracja "nic nie zmieniłem" nie jest dowodem.
 *
 * Użycie:
 *   node audyt/tools/migawka-wartosci.mjs --zapisz=przed
 *   node audyt/tools/migawka-wartosci.mjs --zapisz=po
 *   node audyt/tools/migawka-wartosci.mjs --porownaj   # kod 1 przy rozjeździe
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { KORZEN, SEKTOR, czytajJSON, zapiszJSON } from "./wspolne.mjs";

const KATALOG = join(SEKTOR, "migawki");

const sh = (k) => execFileSync("bash", ["-c", k], { cwd: KORZEN, encoding: "utf8", maxBuffer: 1 << 26 }).trim();
const licz = (k) => Number(sh(k)) || 0;

/**
 * Suma kontrolna DRZEWA PRODUKTU — jeden skrót z posortowanej listy
 * "ścieżka:sha256". Zmiana JEDNEGO bajtu w JEDNYM pliku zmienia go w całości.
 * Liczymy tylko to, czego audyt nie ma prawa dotknąć: wszystko poza `audyt/`.
 */
function skrotProduktu() {
  // DWA WYKLUCZENIA — jedna postać niezmiennika dla obu gałęzi (rozstrzygnięcie
  // właściciela 2026-09-01). Zmierzone przy przygotowaniu próby E7.6: z jednym
  // wykluczeniem migawka wliczała 86 plików `re-audyt/` do skrótu PRODUKTU
  // i meldowała je jako „diff wobec main poza audytem" — czyli na gałęzi
  // re-audytu liczyła własną pracę sektora jako zmianę w projekcie. Wpis
  // z E7.1 o „dziewięciu miejscach" tego pliku nie obejmował.
  const pliki = sh("git ls-files -- . ':!audyt' ':!re-audyt'").split("\n").filter(Boolean).sort();
  const h = createHash("sha256");
  for (const p of pliki) {
    h.update(p).update(":");
    h.update(createHash("sha256").update(readFileSync(join(KORZEN, p))).digest("hex"));
    h.update("\n");
  }
  return { plikow: pliki.length, skrot: h.digest("hex") };
}

export function zrobMigawke() {
  const produkt = skrotProduktu();
  return {
    // git — czy sektor w ogóle ruszył cokolwiek poza sobą
    galaz: sh("git branch --show-current"),
    glowa_main: sh("git rev-parse main"),
    diff_wobec_main_poza_sektorami: licz("git diff main --name-only -- . ':!audyt' ':!re-audyt' | wc -l"),
    // `.claude/` to generat definicji agentów — wyjątek NAZWANY, ten sam co
    // w regule 1 strażnika sektora; bez niego pole nigdy nie schodzi do zera.
    niezacommitowane_poza_sektorami: licz("git status --porcelain -- . ':!audyt' ':!re-audyt' ':!.claude' | wc -l"),

    // warstwa dowodowa projektu
    straznikow: licz("ls tools/straznicy/straznik-*.mjs | wc -l"),
    mutacji: licz("grep -c 'opis:' tools/straznicy/audyt-straznikow.mjs"),
    // Liczymy DOKŁADNIE tak, jak `straznik-readme`: wywołania `test(`/`it(`
    // na POCZĄTKU linii, w plikach `*.test.ts` ZE ŚLEDZONYCH przez gita.
    // Pierwsza wersja pytała `grep -r ... .` bez kotwicy i bez ograniczenia do
    // repo — dała **2106** zamiast 83, bo zbierała z całego drzewa na dysku.
    // Dwa pomiary tej samej rzeczy muszą dawać tę samą liczbę, inaczej migawka
    // podnosi fałszywy alarm przy każdym porównaniu.
    testow: licz("git ls-files -- '*.test.ts' | xargs -r grep -hcE '^[[:space:]]*(test|it)\\(' | awk '{s+=$1} END {print s+0}'"),
    bramek_smoke: licz("node -e \"const s=require('./package.json').scripts;console.log(Object.keys(s).filter(k=>k.startsWith('smoke')).length)\""),
    goldenow: licz("ls goldeny | wc -l"),

    // drzewo produktu
    plikow_produktu: produkt.plikow,
    skrot_produktu: produkt.skrot,
  };
}

/* ── wejście ── */

const arg = process.argv.slice(2);
const zapisz = arg.find((a) => a.startsWith("--zapisz="))?.split("=")[1];

if (zapisz) {
  const m = zrobMigawke();
  zapiszJSON(join(KATALOG, `${zapisz}.json`), m);
  process.stdout.write(`Migawka "${zapisz}" zapisana.\n`);
  for (const [k, v] of Object.entries(m)) {
    process.stdout.write(`  ${k.padEnd(34)} ${String(v).slice(0, 64)}\n`);
  }
  process.exit(0);
}

if (arg.includes("--porownaj")) {
  const przed = czytajJSON(join(KATALOG, "przed.json"));
  const po = czytajJSON(join(KATALOG, "po.json"));
  if (!przed || !po) {
    process.stdout.write("Brak obu migawek — najpierw --zapisz=przed i --zapisz=po.\n");
    process.exit(1);
  }
  const rozjazdy = Object.keys(przed).filter((k) => String(przed[k]) !== String(po[k]));
  if (!rozjazdy.length) {
    process.stdout.write("Migawki identyczne — audyt niczego nie zmienił w projekcie.\n");
    process.exit(0);
  }
  process.stdout.write("ROZJAZD MIGAWEK — to zatrzymuje proces (W2, W6).\n\n");
  for (const k of rozjazdy) {
    process.stdout.write(`  ${k}\n    przed: ${String(przed[k]).slice(0, 70)}\n    po:    ${String(po[k]).slice(0, 70)}\n`);
  }
  process.stdout.write("\nSektor miał tylko patrzeć. Zmiana wartości znaczy, że coś ruszył.\n");
  process.exit(1);
}

process.stdout.write("Użycie: --zapisz=przed | --zapisz=po | --porownaj\n");
process.exit(1);
