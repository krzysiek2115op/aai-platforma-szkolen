/**
 * PRZEJŚCIE 4b + 6 PAKIETU E7.7 (2026-09-02) — jednorazowy skrypt, zostaje w repo
 * jako DOWÓD przejścia, nie jako narzędzie sektora. Nie ma go w `npm run`, nie
 * woła go strażnik; uruchomiony drugi raz nie zmienia nic (każda operacja
 * sprawdza, czy skutek już jest).
 *
 * Co robi, po DOSŁOWNYCH frazach (odstępy jako `\s+`, bo Markdown zawija):
 *   1. szablony AGENT.md i KRYTYK.md — sekcja „Fala, w której pracujesz",
 *      zdanie o MINIMUM (K4″) zamiast wycofanego K4′, pytanie 4 krytyka;
 *   2. 80 definicji (40 AGENT.md + 40 KRYTYK.md obu sektorów) — to samo;
 *      w KRYTYK.md ścieżka zgłoszeń `<PREFIKS>-<KOD>-F<N>-*.json`;
 *   3. pozycja otwarta `<KOD>-90` w ROLE.md obu sektorów i w AGENT.md
 *      14 działów audytu i 14 Pogłębiaczy (rozstrzygnięcie: pytanie 1 = (a));
 *   4. zdanie w `re-audyt/ROLE.md` o powtarzalności → K4″.
 *
 * FRAZA O INNYM BRZMIENIU NIE JEST ZGADYWANA: plik, w którym oczekiwany wzorzec
 * nie trafił, jest WYPISANY na końcu z kodem 1 — poprawia go człowiek.
 *
 * Użycie: node audyt/tools/przejscie-4b6.mjs
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { DZIALY, KORZEN, PREFIKS_ID, SEKTORY, katalogSektora, roleMdSektora, roleSektora } from "./wspolne.mjs";

const GLOWNY_MODUL = Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (!GLOWNY_MODUL) { process.stdout.write("przejscie-4b6.mjs uruchamia się wyłącznie jako główny moduł\n"); process.exit(1); }

/** Wzorzec z odstępami jako `\s+` — Markdown zawija wiersze (lekcja reguły 6). */
const luzno = (rdzen) => new RegExp(rdzen.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+"), "u");

/* ── STAŁE BRZMIENIA (reguła 27 pyta o zdanie zakazu, 27b o brak K4′) ───── */

const ZAKAZ = [
  "## Fala, w której pracujesz",
  "",
  "Pracujesz w fali N i **nie czytasz wpisów, stanu ani wyników innej fali**:",
  "`audyt/zgloszenia/*` z polem `fala` ≠ N, `audyt/stan/*-f<inna>-*`, `audyt/wyniki/`.",
  "Re-audyt fali N czyta audyt fali N — to jego sens. Powód: K4″ — zgodność fal ma",
  "być skutkiem znalezienia wszystkiego, nie odpisem cudzej listy.",
  "",
].join("\n");

/** Wariant KIER i RAP (obu sektorów): dopisek, nie zamiana — zdanie zakazu zostaje. */
const ZAKAZ_KIER_RAP = [
  "Wyjątek Twojej roli: **po obu falach pracujesz w pełnym drzewie** — porównanie",
  "i raport są o obu falach. W trakcie fali obowiązuje Cię zdanie wyżej.",
  "",
].join("\n");

const ZAKAZ_SZABLON_DOPISEK = [
  "<Tylko dla KIER i RAP dopisz: „Wyjątek Twojej roli: **po obu falach pracujesz",
  "w pełnym drzewie** — porównanie i raport są o obu falach. W trakcie fali",
  "obowiązuje Cię zdanie wyżej.”>",
  "",
].join("\n");

const MINIMUM_DZIAL = (kod) =>
  "Checklista jest MINIMUM (K4″):\n" +
  "przechodzisz całą, a potem szukasz dalej w swoim zakresie z tym samym rygorem\n" +
  `dowodu; znalezisko spoza listy zgłaszasz pod pozycją \`${kod}-90\`.`;

const MINIMUM_PROCESOWA =
  "Checklista jest MINIMUM (K4″):\n" +
  "przechodzisz całą, a potem szukasz dalej w swoim zakresie z tym samym rygorem\n" +
  "dowodu. Twoja rola nie ma pozycji otwartej `-90` — jej przedmiot jest zamknięty\n" +
  "(wyniki innych ról) — więc znalezisko spoza listy zgłaszasz pod pozycją, której\n" +
  "dotyczy.";

const WIERSZ_90 = (kod) =>
  `| ${kod}-90 | Co jeszcze w Twoim zakresie może skrzywdzić klienta, właściciela albo dane, ` +
  "a NIE stoi na tej liście? (K4″: lista = minimum) | zakres × własny pomiar | miejsce + dowód jak przy każdej pozycji |";

const PYTANIE_4_STARE = luzno("Znalezisko przypisane do złego działu rozjedzie drugą falę (K4').");
const PYTANIE_4_NOWE =
  "Znalezisko\n" +
  "   przypisane do złego działu **nie jest powodem odrzucenia** — to wiersz do\n" +
  "   tabeli granic (KIER-04); werdykt dotyczy dowodu, nie adresata.";

const GRANICA_STARA = luzno("inaczej druga fala rozstrzygnie inaczej i K4' uzna audyt za zepsuty.");
const GRANICA_NOWA =
  "inaczej druga fala rozstrzygnie inaczej, a rozjazd na granicy jest szumem, nie\n" +
  "wynikiem (K4″: narzędzie nazywa go osobno jako GRANICA).";

/* ── operacje ─────────────────────────────────────────────────────────────── */

const nietrafione = [];
const zrobione = new Map();
const policz = (op) => zrobione.set(op, (zrobione.get(op) ?? 0) + 1);

function przeksztalc(plik, operacje) {
  let t = readFileSync(plik, "utf8");
  const start = t;
  for (const [nazwa, fn] of operacje) {
    const { tresc, trafione, juz } = fn(t);
    if (juz) continue;
    if (!trafione) { nietrafione.push(`${plik}: ${nazwa}`); continue; }
    t = tresc;
    policz(nazwa);
  }
  if (t !== start) writeFileSync(plik, t, "utf8");
}

/** Zamiana po wzorcu; „już" = skutek jest, wzorca nie ma. */
const zamien = (wzorzec, nowe, slad) => (t) => {
  if (slad && slad.test(t)) return { tresc: t, trafione: true, juz: true };
  if (!wzorzec.test(t)) return { tresc: t, trafione: false };
  return { tresc: t.replace(wzorzec, nowe), trafione: true };
};

/** Sekcja zakazu PRZED `## Prompt` (po sekcji Moduł). */
const wstawZakaz = (dopisek = "") => (t) => {
  if (/^## Fala, w której pracujesz/m.test(t)) return { tresc: t, trafione: true, juz: true };
  if (!/\n## Prompt\n/.test(t)) return { tresc: t, trafione: false };
  const blok = ZAKAZ + "\n" + (dopisek ? dopisek + "\n" : "");
  return { tresc: t.replace(/\n## Prompt\n/, `\n${blok}## Prompt\n`), trafione: true };
};

/** Wiersz `<KOD>-90` po OSTATNIM wierszu checklisty roli. */
const dopiszWiersz90 = (kod) => (t) => {
  if (new RegExp(`^\\| ${kod}-90 \\|`, "m").test(t)) return { tresc: t, trafione: true, juz: true };
  const wiersze = [...t.matchAll(new RegExp(`^\\| ${kod}-[A-Z]?\\d+ \\|.*$`, "gm"))];
  if (!wiersze.length) return { tresc: t, trafione: false };
  const ostatni = wiersze[wiersze.length - 1];
  const koniec = ostatni.index + ostatni[0].length;
  return { tresc: t.slice(0, koniec) + "\n" + WIERSZ_90(kod) + t.slice(koniec), trafione: true };
};

/** W ROLE.md wiersz ląduje w SEKCJI roli — pozycje innych ról nie wchodzą w grę, bo mają inny kod. */
const dopiszWiersz90WRoleMd = dopiszWiersz90;

const KIER_RAP = new Set(["KIER", "RAP"]);

/* 1. szablony */
const SZABLONY = join(KORZEN, "audyt", "szablony");
przeksztalc(join(SZABLONY, "AGENT.md"), [
  ["zakaz (szablon)", wstawZakaz(ZAKAZ_SZABLON_DOPISEK)],
  ["minimum (szablon)", zamien(
    luzno("nie zachęcać do swobodnego przeglądu — swobodny przegląd nie da tego samego wyniku w drugiej fali (K4')."),
    "pamiętając, że checklista jest MINIMUM (K4″): agent przechodzi całą, a potem\n" +
    "szuka dalej w swoim zakresie z tym samym rygorem dowodu; znalezisko spoza listy\n" +
    "zgłasza pod pozycją `<KOD>-90` (działy i Pogłębiacze; role procesowe jej nie mają).",
    /Checklista jest MINIMUM|checklista jest MINIMUM/,
  )],
]);
przeksztalc(join(SZABLONY, "KRYTYK.md"), [
  ["zakaz (szablon)", wstawZakaz(ZAKAZ_SZABLON_DOPISEK)],
  ["pytanie 4 (szablon)", zamien(PYTANIE_4_STARE, PYTANIE_4_NOWE, /nie jest powodem odrzucenia/)],
]);

/* 2. 80 definicji + 3. pozycja otwarta */
for (const sektor of SEKTORY) {
  const katalog = join(katalogSektora(sektor), "role");
  if (!existsSync(katalog)) continue;
  const prefiks = PREFIKS_ID[sektor];
  for (const kod of roleSektora(sektor)) {
    const dzial = DZIALY.includes(kod);
    const agent = join(katalog, kod, "AGENT.md");
    const krytyk = join(katalog, kod, "KRYTYK.md");
    if (!existsSync(agent) || !existsSync(krytyk)) { nietrafione.push(`${sektor}/role/${kod}: brak AGENT.md albo KRYTYK.md`); continue; }
    const dopisek = KIER_RAP.has(kod) ? ZAKAZ_KIER_RAP : "";
    const minimum = dzial ? MINIMUM_DZIAL(kod) : MINIMUM_PROCESOWA;
    const opsAgent = [["zakaz", wstawZakaz(dopisek)]];
    const slad = /Checklista jest MINIMUM \(K4″\)/;
    if (sektor === "audyt") {
      opsAgent.push(["minimum (audyt)", zamien(
        luzno("Nie przeglądasz obszaru swobodnie — swobodny przegląd nie da tego samego wyniku w drugiej fali, a K4' każe wtedy uznać CAŁY audyt za zepsuty i powtórzyć go od nowa."),
        minimum, slad,
      )]);
      opsAgent.push(["granica (audyt)", zamien(GRANICA_STARA, GRANICA_NOWA, /rozjazd na granicy jest szumem/)]);
    } else if (dzial) {
      opsAgent.push(["minimum (Pogłębiacz)", zamien(
        luzno("Pozycje R1–R5 są takie same u wszystkich Pogłębiaczy i to jest zamierzone: powtarzalność (K4') stoi na tym, że druga fala zadaje te same pytania w tej samej kolejności. Pozycja R6 jest Twoja własna i nazywa pomiar, który w tym obszarze rozstrzyga."),
        "Pozycje R1–R5 są takie same\nu wszystkich Pogłębiaczy i to jest zamierzone: wspólne MINIMUM obszarów, dzięki\n" +
        "któremu da się zmierzyć, czy nic nie pominięto. Pozycja R6 jest Twoja własna\n" +
        "i nazywa pomiar, który w tym obszarze rozstrzyga.\n" + minimum,
        slad,
      )]);
    } else {
      opsAgent.push(["minimum (procesowa re-audytu)", zamien(
        luzno("Swobodny przegląd nie da tego samego wyniku w drugiej fali, a K4' każe wtedy uznać CAŁY audyt za zepsuty."),
        minimum, slad,
      )]);
    }
    if (dzial) opsAgent.push(["pozycja -90 (AGENT.md)", dopiszWiersz90(kod)]);
    przeksztalc(agent, opsAgent);

    const modulStary = new RegExp(
      "Wyjście roli `" + kod + "`( sektora RE-AUDYT)?: jej zgłoszenia \\(`audyt/zgloszenia/" + prefiks + "-" + kod + "-\\*\\.json`\\),\\s+stan \\(`audyt/stan/`\\) i raport działu\\.",
      "u",
    );
    const modulNowy =
      "Wyjście roli `" + kod + "`$1 **w Twojej fali N**: jej zgłoszenia\n" +
      "(`audyt/zgloszenia/" + prefiks + "-" + kod + "-F<N>-*.json`), stan (`audyt/stan/*-f<N>-" + kod + ".json`)\n" +
      "i raport działu. Fala siedzi w nazwie wpisu — krytyk fali 2 z definicji nie\n" +
      "otwiera wpisów `-F1-`, a w worktree fali 2 nie ma ich na dysku.";
    przeksztalc(krytyk, [
      ["zakaz", wstawZakaz(dopisek)],
      ["moduł F<N> (KRYTYK.md)", zamien(modulStary, modulNowy, new RegExp(prefiks + "-" + kod + "-F<N>-\\*\\.json"))],
      ["pytanie 4", zamien(PYTANIE_4_STARE, PYTANIE_4_NOWE, /nie jest powodem odrzucenia/)],
    ]);
  }

  /* 3. ROLE.md — pozycja otwarta dla każdego działu */
  const roleMd = roleMdSektora(sektor);
  if (existsSync(roleMd)) {
    przeksztalc(roleMd, DZIALY.map((kod) => [`pozycja -90 (${sektor}/ROLE.md)`, dopiszWiersz90WRoleMd(kod)]));
  }
}

/* 4. re-audyt/ROLE.md — zdanie o powtarzalności */
const roleRe = roleMdSektora("re-audyt");
if (existsSync(roleRe)) {
  przeksztalc(roleRe, [["powtarzalność → K4″ (re-audyt/ROLE.md)", zamien(
    luzno("**Sześć pozycji R1–R5 jest wspólnych dla wszystkich Pogłębiaczy** i to jest zamierzone: powtarzalność (K4') stoi na tym, że druga fala zadaje te same pytania w tej samej kolejności. Pozycja **R6 jest własna** — nazywa pomiar, który w tym obszarze rozstrzyga."),
    "**Pięć pozycji R1–R5 jest wspólnych dla wszystkich Pogłębiaczy** i to jest zamierzone:\n" +
    "wspólne MINIMUM obszarów, dzięki któremu da się zmierzyć, czy nic nie pominięto.\n" +
    "Pozycja **R6 jest własna** — nazywa pomiar, który w tym obszarze rozstrzyga. Pozycja\n" +
    "**`<KOD>-90` jest otwarta** (K4″: lista = minimum) — tam ląduje to, czego lista nie\n" +
    "przewidziała, z tym samym rygorem dowodu.",
    /wspólne MINIMUM obszarów/,
  )]]);
}

/* 5. audyt KIER — odsyłacz do „wchodzi z pozycją 4b/6" */
const kierAudyt = join(KORZEN, "audyt", "role", "KIER", "AGENT.md");
if (existsSync(kierAudyt)) {
  przeksztalc(kierAudyt, [["warstwa 1 → reguła 27 (KIER audytu)", zamien(
    luzno("definicji (wchodzi z pozycją 4b/6 pakietu E7.7);"),
    "definicji (reguła 27 strażnika — od 2026-09-02, pozycja 4b/6 pakietu E7.7);",
    /reguła 27 strażnika/,
  )]]);
}

/* ── wynik ─────────────────────────────────────────────────────────────────── */
for (const [op, n] of [...zrobione].sort()) process.stdout.write(`  ${String(n).padStart(3)}  ${op}\n`);

/* Resztki K4′ w definicjach i szablonach — wypisane, nie zgadywane. */
const resztki = [];
for (const sektor of SEKTORY) {
  const katalog = join(katalogSektora(sektor), "role");
  if (!existsSync(katalog)) continue;
  for (const kod of roleSektora(sektor)) {
    for (const plik of ["AGENT.md", "KRYTYK.md", "SKILL.md"]) {
      const p = join(katalog, kod, plik);
      if (!existsSync(p)) continue;
      readFileSync(p, "utf8").split("\n").forEach((l, i) => { if (l.includes("K4'")) resztki.push(`${sektor}/role/${kod}/${plik}:${i + 1}: ${l.trim()}`); });
    }
  }
}
for (const plik of ["AGENT.md", "KRYTYK.md", "SKILL.md"]) {
  readFileSync(join(SZABLONY, plik), "utf8").split("\n").forEach((l, i) => { if (l.includes("K4'")) resztki.push(`audyt/szablony/${plik}:${i + 1}: ${l.trim()}`); });
}

if (nietrafione.length) {
  process.stdout.write(`\nNIETRAFIONE (${nietrafione.length}) — poprawić ręcznie, nie zgadywać:\n`);
  for (const n of nietrafione) process.stdout.write(`  - ${n}\n`);
}
if (resztki.length) {
  process.stdout.write(`\nRESZTKI K4′ w definicjach (${resztki.length}):\n`);
  for (const r of resztki) process.stdout.write(`  - ${r}\n`);
}
process.exit(nietrafione.length || resztki.length ? 1 : 0);
