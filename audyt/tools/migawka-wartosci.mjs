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
 * POLE `srodowisko` (pakiet E7.7, pozycja 7, 2026-09-03): liczniki środowiska
 * `:8892` z `srodowisko.mjs` — skrót `COUNT(*)`+`AUTO_INCREMENT` 80 tabel, osobno
 * nasze 9 tabel `wp_aai_*` i media, żeby rozjazd był CZYTELNY, nie tylko wykryty.
 * Gdy `:8892` nie stoi, pole niesie DOSŁOWNIE „niedostępne" — jawnie, nigdy
 * pominięte — a `--porownaj` traktuje „niedostępne" po którejkolwiek stronie jako
 * ROZJAZD (kod 1): W6 nierozstrzygnięte to nie jest W6 zaliczone (rozstrzygnięcie
 * 6 właściciela). Migawka bez tego pola jest sprzed pozycji 7 — pilnuje reguła 31.
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
import { migawkaSrodowiska } from "./srodowisko.mjs";

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

/** Powód, dla którego środowisko okazało się niedostępne — do wydruku, nie do migawki. */
let powodNiedostepnosci = null;

/** Liczniki albo dosłowne „niedostępne" — trzeci stan (pominięcie) nie istnieje. */
export function polSrodowiska() {
  try {
    return migawkaSrodowiska();
  } catch (e) {
    powodNiedostepnosci = e.message;
    return "niedostępne";
  }
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

    // środowisko :8892 — liczniki albo „niedostępne" (pozycja 7 E7.7)
    srodowisko: polSrodowiska(),
  };
}

/** Wartość do porównania i wydruku: obiekty przez JSON, reszta przez String. */
const napis = (v) => (v !== null && typeof v === "object" ? JSON.stringify(v) : String(v));

/**
 * Rozjazd pola `srodowisko` opisany PO LUDZKU: która z naszych tabel, o ile, media,
 * wtyczki — a nie dwa skróty sha256 obok siebie.
 */
export function opiszRozjazdSrodowiska(a, b) {
  const linie = [];
  for (const t of new Set([...Object.keys(a?.nasze ?? {}), ...Object.keys(b?.nasze ?? {})])) {
    const x = a?.nasze?.[t];
    const y = b?.nasze?.[t];
    if (!x || !y) { linie.push(`${t}: tabela ${x ? "zniknęła" : "doszła"}`); continue; }
    if (x.wierszy !== y.wierszy) linie.push(`${t}: wierszy ${x.wierszy} → ${y.wierszy}`);
    if ((x.auto_increment ?? null) !== (y.auto_increment ?? null)) linie.push(`${t}: AUTO_INCREMENT ${x.auto_increment ?? "—"} → ${y.auto_increment ?? "—"}`);
  }
  if (a?.media && b?.media && napis(a.media) !== napis(b.media)) linie.push(`media: ${a.media.plikow} plików / ${a.media.bajtow} B → ${b.media.plikow} plików / ${b.media.bajtow} B`);
  if (a?.tabel !== b?.tabel) linie.push(`tabel: ${a?.tabel} → ${b?.tabel}`);
  if (napis(a?.wtyczki_aktywne) !== napis(b?.wtyczki_aktywne)) linie.push(`wtyczki aktywne: ${napis(a?.wtyczki_aktywne)} → ${napis(b?.wtyczki_aktywne)}`);
  if (napis(a?.wersje) !== napis(b?.wersje)) linie.push(`wersje: ${napis(a?.wersje)} → ${napis(b?.wersje)}`);
  if (!linie.length && a?.skrot_tabel !== b?.skrot_tabel) linie.push("skrót 80 tabel inny, a nasze tabele i media równe — zmiana w CUDZEJ tabeli (pełne liczniki: srodowisko.mjs --liczniki)");
  return linie;
}

/* ── wejście ── */

const arg = process.argv.slice(2);
const zapisz = arg.find((a) => a.startsWith("--zapisz="))?.split("=")[1];

if (zapisz) {
  const m = zrobMigawke();
  zapiszJSON(join(KATALOG, `${zapisz}.json`), m);
  process.stdout.write(`Migawka "${zapisz}" zapisana.\n`);
  for (const [k, v] of Object.entries(m)) {
    process.stdout.write(`  ${k.padEnd(34)} ${napis(v).slice(0, 64)}\n`);
  }
  if (powodNiedostepnosci) process.stdout.write(`  środowisko :8892 NIEDOSTĘPNE — powód: ${powodNiedostepnosci.slice(0, 200)}\n`);
  process.exit(0);
}

if (arg.includes("--porownaj")) {
  const przed = czytajJSON(join(KATALOG, "przed.json"));
  const po = czytajJSON(join(KATALOG, "po.json"));
  if (!przed || !po) {
    process.stdout.write("Brak obu migawek — najpierw --zapisz=przed i --zapisz=po.\n");
    process.exit(1);
  }
  const rozjazdy = Object.keys({ ...przed, ...po }).filter((k) => napis(przed[k]) !== napis(po[k]));
  // „niedostępne" (albo brak pola) po KTÓREJKOLWIEK stronie = rozjazd — W6 nierozstrzygnięte.
  const niedostepne = [["przed", przed], ["po", po]].filter(([, m]) => m.srodowisko === undefined || m.srodowisko === "niedostępne").map(([n]) => n);
  if (!rozjazdy.length && !niedostepne.length) {
    process.stdout.write("Migawki identyczne — audyt niczego nie zmienił w projekcie ani w środowisku :8892.\n");
    process.exit(0);
  }
  process.stdout.write("ROZJAZD MIGAWEK — to zatrzymuje proces (W2, W6).\n\n");
  for (const n of niedostepne) {
    process.stdout.write(`  srodowisko: „niedostępne" (albo brak pola) po stronie „${n}" — W6 na środowisku :8892 nie da się rozstrzygnąć\n`);
  }
  for (const k of rozjazdy) {
    if (k === "srodowisko" && typeof przed[k] === "object" && typeof po[k] === "object") {
      process.stdout.write("  srodowisko (liczniki :8892)\n" + opiszRozjazdSrodowiska(przed[k], po[k]).map((l) => `    ${l}\n`).join(""));
      continue;
    }
    process.stdout.write(`  ${k}\n    przed: ${napis(przed[k]).slice(0, 70)}\n    po:    ${napis(po[k]).slice(0, 70)}\n`);
  }
  process.stdout.write("\nSektor miał tylko patrzeć. Zmiana wartości znaczy, że coś ruszył.\n");
  process.exit(1);
}

process.stdout.write("Użycie: --zapisz=przed | --zapisz=po | --porownaj\n");
process.exit(1);
