/**
 * GENERAT AGENTÓW (D1) — "wykonywalni ORAZ udokumentowani".
 *
 * ŹRÓDŁEM jest `audyt/role/<KOD>/AGENT.md` i `KRYTYK.md`; generatem są pliki
 * `.claude/agents/aud-*.md`, które widzi harness. Generat jest JEDNORAZOWY
 * i **nie wchodzi do gita**: powstaje komendą ze źródła, więc nie ma czego
 * commitować, a niezmiennik sektora zostaje nietknięty (`git diff` nie widzi
 * plików nieśledzonych).
 *
 * `--sprawdz` porównuje generat ze źródłem po **sha256**, nie po dacie — git
 * dat nie przechowuje, więc data zmiany nie dowodzi niczego. Wzorzec wzięty ze
 * `straznik-schematow`, gdzie ta sama reguła pilnuje podglądów SVG.
 *
 * NARZĘDZIA AGENTA. Audytorzy NIE dostają `Write` ani `Edit` (W2). Piszę wprost,
 * że to ograniczenie, a NIE gwarancja (K3): frontmatter ogranicza narzędzia,
 * nie ścieżki, a `Bash` umie pisać. Prawdziwą gwarancją jest kontrola po
 * fakcie — `migawka-wartosci.mjs --porownaj` i `git diff`.
 *
 * Użycie:
 *   node audyt/tools/generuj-agentow.mjs            # generuje
 *   node audyt/tools/generuj-agentow.mjs --sprawdz  # kod 1, gdy generat nieaktualny
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { KORZEN, SEKTOR } from "./wspolne.mjs";

const ROLE = join(SEKTOR, "role");
const CEL = join(KORZEN, ".claude", "agents");

/** Model wg D8: kierownicy i krytycy — Opus, reszta — Sonnet. */
const OPUS = new Set(["KIER", "GOLD", "KON", "WER", "RAP"]);

const skrot = (s) => createHash("sha256").update(s).digest("hex");

function zrodla() {
  if (!existsSync(ROLE)) return [];
  const wynik = [];
  for (const kod of readdirSync(ROLE).sort()) {
    for (const [plik, rodzaj] of [["AGENT.md", "agent"], ["KRYTYK.md", "krytyk"]]) {
      const sciezka = join(ROLE, kod, plik);
      if (existsSync(sciezka)) {
        wynik.push({ kod, rodzaj, sciezka, tresc: readFileSync(sciezka, "utf8") });
      }
    }
  }
  return wynik;
}

function zbuduj({ kod, rodzaj, tresc }) {
  const nazwa = `aud-${kod.toLowerCase()}${rodzaj === "krytyk" ? "-krytyk" : ""}`;
  const model = rodzaj === "krytyk" || OPUS.has(kod) ? "opus" : "sonnet";
  const opis = tresc.match(/^\*\*Rola\.\*\*\s*(.+)$/m)?.[1]
    ?? tresc.split("\n").find((l) => l.trim() && !l.startsWith("#"))
    ?? `Rola ${kod} sektora AUDYT`;
  const naglowek = [
    "---",
    `name: ${nazwa}`,
    `description: ${opis.replace(/\s+/g, " ").trim().slice(0, 300)}`,
    "tools: Read, Grep, Glob, Bash",
    `model: ${model}`,
    "---",
    "",
    `<!-- GENERAT. Źródło: audyt/role/${kod}/${rodzaj === "krytyk" ? "KRYTYK.md" : "AGENT.md"} -->`,
    `<!-- ZRODLO-SHA256: ${skrot(tresc)} -->`,
    "<!-- Nie edytuj tego pliku — zmiany rób w źródle i uruchom generuj-agentow.mjs -->",
    "",
  ].join("\n");
  return { nazwa, plik: join(CEL, `${nazwa}.md`), tresc: naglowek + tresc, zrodloSkrot: skrot(tresc) };
}

const lista = zrodla();

if (!lista.length) {
  process.stdout.write(
    "Brak źródeł w audyt/role/ — role powstają w E5.\n" +
    "To NIE jest błąd na tym etapie; generat będzie pusty, dopóki nie ma czego generować.\n"
  );
  process.exit(0);
}

const sprawdz = process.argv.includes("--sprawdz");
const bledy = [];
let zrobione = 0;

for (const z of lista) {
  const g = zbuduj(z);
  if (sprawdz) {
    if (!existsSync(g.plik)) {
      bledy.push(`${g.nazwa}: generatu NIE MA — uruchom generuj-agentow.mjs`);
      continue;
    }
    const jest = readFileSync(g.plik, "utf8");
    const wpisany = jest.match(/ZRODLO-SHA256: ([0-9a-f]{64})/)?.[1];
    if (wpisany !== g.zrodloSkrot) {
      bledy.push(`${g.nazwa}: generat NIEAKTUALNY wobec źródła (sha256 się nie zgadza)`);
    }
  } else {
    mkdirSync(CEL, { recursive: true });
    writeFileSync(g.plik, g.tresc, "utf8");
    zrobione++;
  }
}

/* Generat-SIEROTA: plik `aud-*.md` bez źródła w `audyt/role/`. Powstaje po
   skasowaniu albo przemianowaniu roli i jest groźny, bo harness dalej go widzi
   — agent istnieje, choć nikt go już nie definiuje. */
if (sprawdz && existsSync(CEL)) {
  const nasze = new Set(lista.map((z) => zbuduj(z).nazwa + ".md"));
  for (const f of readdirSync(CEL).filter((f) => f.startsWith("aud-") && f.endsWith(".md"))) {
    if (!nasze.has(f)) bledy.push(`${f}: generat bez źródła w audyt/role/ — rola została skasowana albo przemianowana`);
  }
}

if (sprawdz) {
  if (bledy.length) {
    process.stdout.write("GENERAT NIEZGODNY ZE ŹRÓDŁEM:\n");
    for (const b of bledy) process.stdout.write(`  - ${b}\n`);
    process.exit(1);
  }
  process.stdout.write(`Generat zgodny ze źródłem: ${lista.length} definicji.\n`);
  process.exit(0);
}

process.stdout.write(
  `Wygenerowano ${zrobione} definicji do .claude/agents/.\n` +
  "Generat NIE wchodzi do gita — powstaje ze źródła jedną komendą.\n"
);
