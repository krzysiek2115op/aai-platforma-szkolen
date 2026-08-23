/**
 * Strażnik asercji zrzutów: „zrzut powstał" ma znaczyć „zrzut zawiera to, co
 * obiecuje podpis".
 *
 * PO CO. Werdykt właściciela z 2026-08-23 unieważnił cztery ekrany nie dlatego,
 * że były złe, tylko dlatego, że PROCES dawał zieleń bez dowodu: narzędzie
 * zapisywało obraz zawsze, a jedyną kontrolą treści było jednorazowe spojrzenie
 * człowieka na stykówkę. Brief (zasada 9) mówi odtąd: zrzut bez maszynowej
 * asercji treści nie jest dowodem. Ten strażnik pilnuje, żeby ta zasada nie
 * została deklaracją.
 *
 * CO SPRAWDZA — i dlaczego akurat to:
 *   1. KAŻDA specyfikacja w `tools/zrzuty/spec/` ma niepuste `wymagaTekstu`
 *      i celuje plikiem w `tresc-kursow/**\/zrzuty/*.webp`. Specyfikacje leżą
 *      w REPO, a nie w scratchpadzie sesji (punkt 2 werdykta) — inaczej po
 *      /clear nie ma czego powtórzyć;
 *   2. porównanie z `asercje.mjs` DZIAŁA: brakujący fragment jest zgłaszany,
 *      a fragment pocięty ramką panelu i zapisany typograficznym apostrofem
 *      jest uznawany. Sprawdzamy ZACHOWANIE modułu, nie jego treść — lekcja
 *      z 2026-08-19: strażnik wiążący się z nazwą metody zzieleniał na
 *      mutacji, którą wcześniej łapał;
 *   3. oba narzędzia ODMAWIAJĄ startu przy specyfikacji bez asercji (kod 7).
 *      To pełny przebieg procesu, nie dopasowanie wzorca — i dlatego rig
 *      wczytuje się w nich dopiero PO bramce: żeby ta próba nie wymagała
 *      Firefoksa i chodziła przy każdym commicie;
 *   4. asercja stoi PRZED zapisem obrazu. Bramka wywołana po `toFile`
 *      zostawiałaby na dysku plik, który licznik policzy jako zrobiony —
 *      a właśnie licznik ma mówić prawdę.
 *
 * Pełną drogę obu narzędzi (Firefox + xterm.js + sharp) sprawdzają testy
 * negatywne `tools/zrzuty/test-asercji.mjs` — tam, bo wymagają riga.
 *
 * Użycie: node tools/straznicy/straznik-asercji.mjs
 */
import { readdirSync, readFileSync, existsSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { brakujace } from "../zrzuty/asercje.mjs";

const KAT_SPEC = "tools/zrzuty/spec";
const NARZEDZIA = ["tools/zrzuty/tui.mjs", "tools/zrzuty/zrob-zrzut.mjs"];
const bledy = [];

// ── 1. specyfikacje w repo ────────────────────────────────────────────────
function pliki(katalog) {
  if (!existsSync(katalog)) return [];
  return readdirSync(katalog, { withFileTypes: true }).flatMap((w) =>
    w.isDirectory() ? pliki(join(katalog, w.name)) : w.name.endsWith(".json") ? [join(katalog, w.name)] : []
  );
}
const specyfikacje = pliki(KAT_SPEC);
if (specyfikacje.length === 0) {
  bledy.push(`${KAT_SPEC}: ani jednej specyfikacji — asercje mają żyć w repo, nie w scratchpadzie sesji (werdykt 2026-08-23, punkt 2)`);
}
for (const plik of specyfikacje) {
  let spec;
  try { spec = JSON.parse(readFileSync(plik, "utf8")); } catch (e) { bledy.push(`${plik}: nie jest poprawnym JSON-em (${e.message})`); continue; }
  const w = spec.wymagaTekstu;
  if (!Array.isArray(w) || w.length === 0) bledy.push(`${plik}: brak niepustego "wymagaTekstu" — zrzut bez asercji nie jest dowodem`);
  else if (w.some((f) => typeof f !== "string" || !f.trim())) bledy.push(`${plik}: "wymagaTekstu" zawiera pusty albo nietekstowy fragment`);
  if (typeof spec.wyjscie !== "string" || !/^tresc-kursow\/.+\/zrzuty\/.+\.webp$/.test(spec.wyjscie))
    bledy.push(`${plik}: "wyjscie" musi celować w tresc-kursow/<kurs>/modul-N/zrzuty/*.webp (jest: ${JSON.stringify(spec.wyjscie)})`);
}

// ── 2. porównanie działa (zachowanie, nie treść pliku) ────────────────────
const EKRAN = "╭────────────────────────────╮\n│ Claude Code won’t ask before  │\n│ using allowed tools.       │\n│ Bash(npm test)             │\n╰────────────────────────────╯";
if (brakujace(EKRAN, ["Claude Code won't ask before using allowed tools."]).length !== 0)
  bledy.push("asercje.mjs: zdanie pocięte ramką panelu NIE jest rozpoznawane — asercja odrzucałaby prawdziwe ekrany");
if (brakujace(EKRAN, ["Claude Code will always reject requests to use denied tools."]).length !== 1)
  bledy.push("asercje.mjs: fragment, którego na ekranie NIE MA, przechodzi jako obecny — bramka nie chroni przed niczym");
if (brakujace(EKRAN, ["Bash(", "Memory files"]).length !== 1)
  bledy.push("asercje.mjs: przy liście fragmentów brakujący nie jest wskazywany pojedynczo");
if (brakujace(EKRAN, ["re:Bash\\(npm test\\)"]).length !== 0)
  bledy.push("asercje.mjs: wzorzec re: NIE dopasowuje tego, co na ekranie jest");
if (brakujace(EKRAN, ["re:\\d{1,2}:\\d{2}"]).length !== 1)
  bledy.push("asercje.mjs: wzorzec re: przechodzi mimo braku pokrycia na ekranie");

// ── 3. narzędzia odmawiają startu bez asercji ─────────────────────────────
const KAT = mkdtempSync(join(tmpdir(), "straznik-asercji-"));
try {
  const specBez = join(KAT, "bez-asercji.json");
  writeFileSync(specBez, JSON.stringify({ raw: "/dev/null", url: "about:blank", wyjscie: join(KAT, "nie-powinno-powstac.webp") }));
  for (const narzedzie of NARZEDZIA) {
    const r = spawnSync(process.execPath, [narzedzie, specBez], { encoding: "utf8", timeout: 60000, env: { ...process.env, ZRZUTY_RIG: "" } });
    if (r.status !== 7)
      bledy.push(`${narzedzie}: specyfikacja bez "wymagaTekstu" nie kończy się kodem 7 (było: ${r.status}) — bramka deklaracji nie działa`);
  }
  if (existsSync(join(KAT, "nie-powinno-powstac.webp")))
    bledy.push("narzędzie zapisało obraz mimo braku asercji");
} finally { rmSync(KAT, { recursive: true, force: true }); }

// ── 4. asercja PRZED zapisem ──────────────────────────────────────────────
for (const narzedzie of NARZEDZIA) {
  const zrodlo = readFileSync(narzedzie, "utf8");
  const asercja = zrodlo.indexOf("sprawdzAsercje(");
  const zapis = zrodlo.indexOf(".toFile(");
  if (asercja === -1) bledy.push(`${narzedzie}: nie woła sprawdzAsercje — obraz powstawałby bez kontroli treści`);
  else if (zapis === -1) bledy.push(`${narzedzie}: nie znaleziono zapisu obrazu (.toFile) — sprawdź, czy strażnik nadal celuje w to, co trzeba`);
  else if (asercja > zapis) bledy.push(`${narzedzie}: asercja stoi PO zapisie obrazu — plik zostawałby na dysku mimo niezgodności`);
}

if (bledy.length) {
  console.error("straznik-asercji: NIEZALICZONY");
  for (const b of bledy) console.error(`  ✖ ${b}`);
  process.exit(1);
}
console.log(`straznik-asercji: OK (specyfikacji: ${specyfikacje.length}, narzędzi z bramką: ${NARZEDZIA.length})`);
