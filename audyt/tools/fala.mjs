/**
 * FALA 2 W OSOBNYM WORKTREE — trzecia warstwa ślepoty fali drugiej (dysk).
 *
 * Pakiet E7.7, pozycja 4 (rozstrzygnięcia właściciela 2026-09-02, pytania 4 i 7).
 * Fala 2 pracuje na TYM SAMYM commicie co fala 1 (inny dałby inne checklisty
 * i inny generat), ale w osobnym worktree na własnej gałęzi `<sektor>/fala-2`,
 * ze SPARSE CHECKOUTEM bez wpisów i stanów fali 1 oraz bez wyników. Agent
 * fali 2 z definicji nie może otworzyć `audyt/zgloszenia/AUD-SEC-F1-003.json`,
 * bo tego pliku NIE MA na jego dysku — a nie dlatego, że mu zakazano.
 *
 * KOMENDA, NIE PAMIĘĆ. Kolejność „worktree → sparse checkout → generat →
 * migawka" nie może zależeć od tego, czy kierownik ją pamięta — to ta sama
 * klasa, co manifest przelotu zrzutów liczony komendą. Stąd narzędzie zamiast
 * instrukcji w SKILL (rekomendacja przyjęta przez właściciela).
 *
 * ZAUFANIE DO GITA NIE JEST BRAMKĄ. Sparse checkout w trybie non-cone
 * z wykluczeniami ZMIERZONO na tym gicie (2.55: pliki znikają z dysku, `git
 * status` czysty), ale narzędzie i tak SPRAWDZA po postawieniu, że na dysku
 * worktree nie ma ani jednego pliku `-F1-`/`-f1-` i ani jednego wpisu z POLEM
 * `fala: 1`; a `status.mjs` (odmowa 5) odmawia wejścia fali 2 po POLU,
 * niezależnie od tego narzędzia.
 *
 * Użycie:
 *   node audyt/tools/fala.mjs --postaw=2 [--worktree=<katalog>]
 *   node audyt/tools/fala.mjs --scal=2   [--worktree=<katalog>]
 *   node audyt/tools/fala.mjs --test
 *
 * Domyślny katalog worktree: obok repozytorium, nazwa repo bez spacji +
 * `-fala-2` (`/home/krzysiek/Pod-strona-Szkolenia-fala-2`). Gałąź:
 * `<sektor>/fala-2`, gdzie `<sektor>` to człon przed `/sektor-…` bieżącej gałęzi.
 *
 * Kod wyjścia 0 = postawione / scalone i zweryfikowane, 1 = odmowa z powodem.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { KORZEN, czytajJSON } from "./wspolne.mjs";

/** Jedyna fala, która pracuje w worktree — fala 1 idzie w głównym drzewie. */
export const FALA_WORKTREE = 2;

/**
 * WZORCE SPARSE CHECKOUTU dla fali N: całe drzewo POZA wpisami i stanami
 * INNEJ fali oraz poza wynikami (porównania i połączenia sektorów są
 * z definicji o obu falach). Tryb non-cone, ścieżki od korzenia (`/`).
 */
export function wzorceSparse(fala) {
  const inna = fala === 1 ? 2 : 1;
  return ["/*", `!/audyt/zgloszenia/*-F${inna}-*`, `!/audyt/stan/*-f${inna}-*`, "!/audyt/wyniki/*"];
}

/** Nazwa gałęzi fali z nazwy gałęzi sektora: `re-audyt/sektor-re-audytu` → `re-audyt/fala-2`. */
export function galazFali(galazSektora, fala) {
  const sektor = String(galazSektora).match(/^([^/]+)\/sektor-/)?.[1];
  return sektor ? `${sektor}/fala-${fala}` : null;
}

/** Domyślna ścieżka worktree: obok repo, nazwa bez spacji. */
export function domyslnyWorktree(korzen, fala) {
  return join(dirname(korzen), `${basename(korzen).trim().replace(/\s+/g, "-")}-fala-${fala}`);
}

const git = (args, cwd = KORZEN) => execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: 1 << 26 }).trim();
const gitCicho = (args, cwd = KORZEN) => spawnSync("git", args, { cwd, encoding: "utf8" });

/** Niezacommitowane zmiany POZA generatem (`.claude/` jest wyjątkiem nazwanym, jak w regule 1 strażnika). */
const brudne = (cwd) => git(["status", "--porcelain", "--", ".", ":!.claude"], cwd).split("\n").filter(Boolean);

/* ── pomiary worktree ───────────────────────────────────────────────────── */

/** Pliki INNEJ fali obecne NA DYSKU worktree — po nazwie. Ma być pusto. */
export function plikiInnejFaliNaDysku(worktree, fala) {
  const inna = fala === 1 ? 2 : 1;
  const wynik = [];
  for (const [katalog, wzorzec] of [["zgloszenia", `-F${inna}-`], ["stan", `-f${inna}-`]]) {
    const sciezka = join(worktree, "audyt", katalog);
    if (!existsSync(sciezka)) continue;
    for (const f of readdirSync(sciezka)) if (f.includes(wzorzec)) wynik.push(`audyt/${katalog}/${f}`);
  }
  const wyniki = join(worktree, "audyt", "wyniki");
  if (existsSync(wyniki)) for (const f of readdirSync(wyniki)) wynik.push(`audyt/wyniki/${f}`);
  return wynik;
}

/** Wpisy INNEJ fali widoczne w worktree — po POLU `fala`, nie po nazwie. Ma być pusto. */
export function wpisyInnejFaliPoPolu(worktree, fala) {
  const sciezka = join(worktree, "audyt", "zgloszenia");
  if (!existsSync(sciezka)) return [];
  return readdirSync(sciezka)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({ f, w: czytajJSON(join(sciezka, f)) }))
    .filter(({ w }) => w && w.fala !== fala)
    .map(({ f }) => `audyt/zgloszenia/${f}`);
}

/* ── postaw ─────────────────────────────────────────────────────────────── */

function postaw(fala, worktree, korzen) {
  const pisz = (t) => process.stdout.write(t);
  if (fala !== FALA_WORKTREE) {
    pisz(`Worktree stawiamy wyłącznie dla fali ${FALA_WORKTREE} — fala 1 pracuje w głównym drzewie.\n`);
    return 1;
  }
  const galazSektora = git(["branch", "--show-current"], korzen);
  const galaz = galazFali(galazSektora, fala);
  if (!galaz) {
    pisz(`Bieżąca gałąź "${galazSektora}" nie jest gałęzią sektora (<sektor>/sektor-…) — nie wiem, jak nazwać gałąź fali.\n`);
    return 1;
  }
  const b = brudne(korzen);
  if (b.length) {
    pisz(
      `Drzewo sektora ma ${b.length} niezacommitowanych zmian — worktree dostałby stan fali 1 BEZ nich:\n` +
      b.slice(0, 8).map((l) => `  ${l}\n`).join("") +
      "Naprawa: zacommituj stan fali 1 (audyt/stan, audyt/zgloszenia), potem --postaw=2.\n"
    );
    return 1;
  }
  if (gitCicho(["rev-parse", "--verify", "--quiet", galaz], korzen).status === 0) {
    pisz(`Gałąź ${galaz} już istnieje — poprzednia fala 2 nie została scalona (--scal=2) albo trzeba ją usunąć ręcznie.\n`);
    return 1;
  }
  if (existsSync(worktree)) {
    pisz(`Katalog ${worktree} już istnieje — nie nadpisuję cudzego katalogu.\n`);
    return 1;
  }

  const glowa = git(["rev-parse", "HEAD"], korzen);
  git(["worktree", "add", "--quiet", "-b", galaz, worktree, "HEAD"], korzen);
  git(["sparse-checkout", "set", "--no-cone", ...wzorceSparse(fala)], worktree);

  /* WERYFIKACJA ARTEFAKTU, nie procesu: dysk worktree i pola wpisów. */
  const naDysku = plikiInnejFaliNaDysku(worktree, fala);
  const poPolu = wpisyInnejFaliPoPolu(worktree, fala);
  if (naDysku.length || poPolu.length) {
    pisz(
      `Sparse checkout NIE schował fali ${fala === 1 ? 2 : 1}: ${naDysku.length} plików po nazwie, ${poPolu.length} wpisów po polu fala:\n` +
      [...naDysku, ...poPolu].slice(0, 8).map((p) => `  ${p}\n`).join("") +
      "Worktree zostaje do obejrzenia; usuń go `git worktree remove --force` i `git branch -D`, zanim spróbujesz ponownie.\n"
    );
    return 1;
  }
  const ukryte = git(["ls-files", "-v", "--", "audyt/zgloszenia", "audyt/stan", "audyt/wyniki"], worktree)
    .split("\n").filter((l) => l.startsWith("S ")).length;

  /* GENERAT I MIGAWKA W WORKTREE — jego własnymi kopiami narzędzi (KORZEN
     narzędzia to katalog, w którym leży, więc uruchamiamy je Z worktree). */
  const generat = spawnSync("node", ["audyt/tools/generuj-agentow.mjs"], { cwd: worktree, encoding: "utf8" });
  if (generat.status !== 0) {
    pisz(`Generat w worktree NIE powstał (kod ${generat.status}):\n${generat.stdout}${generat.stderr}`);
    return 1;
  }
  const migawka = join(worktree, "audyt", "migawki", "przed.json");
  let zdanieOMigawce;
  if (existsSync(migawka)) {
    const m = czytajJSON(migawka);
    zdanieOMigawce = `migawka przed.json odziedziczona z gałęzi sektora (glowa_main ${String(m?.glowa_main ?? "").slice(0, 12)}) — ten sam commit, ta sama migawka`;
  } else {
    const r = spawnSync("node", ["audyt/tools/migawka-wartosci.mjs", "--zapisz=przed"], { cwd: worktree, encoding: "utf8" });
    if (r.status !== 0) {
      pisz(`Migawka w worktree NIE powstała (kod ${r.status}):\n${r.stdout}${r.stderr}`);
      return 1;
    }
    zdanieOMigawce = "migawka przed.json zapisana w worktree (gałąź sektora jej nie miała)";
  }

  pisz(
    `Worktree fali ${fala} POSTAWIONY i zweryfikowany.\n` +
    `  katalog:   ${worktree}\n` +
    `  gałąź:     ${galaz} (od ${glowa.slice(0, 12)}, ten sam commit co fala 1)\n` +
    `  ukryte:    ${ukryte} plików fali 1 i wyników (skip-worktree), na dysku 0, wpisów innej fali po polu 0\n` +
    `  generat:   ${generat.stdout.split("\n")[0]}\n` +
    `  ${zdanieOMigawce}\n\n` +
    "Role fali 2 uruchamiaj Z TEGO KATALOGU (harness czyta .claude/agents z katalogu sesji):\n" +
    `  cd ${JSON.stringify(worktree)}\n` +
    `  node audyt/tools/status.mjs --rola=<KOD> --fala=${fala} --status=\"W TRAKCIE\"\n` +
    "Po fali: zacommituj audyt/ w worktree, wróć do drzewa sektora i uruchom:\n" +
    `  node audyt/tools/fala.mjs --scal=${fala}\n`
  );
  return 0;
}

/* ── scal ───────────────────────────────────────────────────────────────── */

function scal(fala, worktree, korzen) {
  const pisz = (t) => process.stdout.write(t);
  const galazSektora = git(["branch", "--show-current"], korzen);
  const galaz = galazFali(galazSektora, fala);
  if (!galaz) {
    pisz(`Bieżąca gałąź "${galazSektora}" nie jest gałęzią sektora — scalanie idzie DO gałęzi sektora.\n`);
    return 1;
  }
  const zarejestrowane = git(["worktree", "list", "--porcelain"], korzen).split("\n")
    .filter((l) => l.startsWith("worktree ")).map((l) => resolve(l.slice("worktree ".length)));
  if (!existsSync(worktree) || !zarejestrowane.includes(resolve(worktree))) {
    pisz(`Worktree ${worktree} nie istnieje albo nie jest zarejestrowany w tym repozytorium — nie ma czego scalać.\n`);
    return 1;
  }
  const bW = brudne(worktree);
  if (bW.length) {
    pisz(
      `Worktree fali ${fala} ma ${bW.length} niezacommitowanych zmian — merge by ich NIE zabrał:\n` +
      bW.slice(0, 8).map((l) => `  ${l}\n`).join("") +
      `Naprawa: w ${worktree}: git add audyt && git commit, potem --scal=${fala}.\n`
    );
    return 1;
  }
  const bK = brudne(korzen);
  if (bK.length) {
    pisz(`Drzewo sektora ma ${bK.length} niezacommitowanych zmian — zacommituj je przed scaleniem:\n` + bK.slice(0, 8).map((l) => `  ${l}\n`).join(""));
    return 1;
  }

  const przed = git(["rev-parse", "HEAD"], korzen);
  const merge = gitCicho(["merge", "--no-edit", galaz], korzen);
  if (merge.status !== 0) {
    gitCicho(["merge", "--abort"], korzen);
    pisz(
      `Merge ${galaz} → ${galazSektora} NIE przeszedł (kod ${merge.status}) i został cofnięty:\n${merge.stdout}${merge.stderr}` +
      "Fala 2 miała dodawać wyłącznie NOWE pliki — konflikt znaczy, że ktoś zmienił ten sam plik po obu stronach. Rozstrzyga kierownik.\n"
    );
    return 1;
  }
  const po = git(["rev-parse", "HEAD"], korzen);
  const doszly = git(["diff", "--name-only", przed, po], korzen).split("\n").filter(Boolean);

  // `--force` WYŁĄCZNIE dlatego, że worktree niesie nieśledzony generat `.claude/agents/`
  // (git odmawia usunięcia katalogu z nieśledzonymi plikami). Czystość poza `.claude/`
  // została zmierzona wyżej — bez tego pomiaru `--force` skasowałby cudzą pracę.
  git(["worktree", "remove", "--force", worktree], korzen);
  // `-d`, nie `-D`: git sam odmówi, gdyby gałąź nie była w całości scalona — to jest dowód, nie sprzątanie.
  git(["branch", "-d", galaz], korzen);

  const f1 = doszly.filter((p) => /-F1-|-f1-/.test(p)).length;
  const f2 = doszly.filter((p) => /-F2-|-f2-/.test(p)).length;
  pisz(
    `Fala ${fala} SCALONA do ${galazSektora} (${przed.slice(0, 12)} → ${po.slice(0, 12)}): ${doszly.length} plików doszło ` +
    `(fala 2: ${f2}, fala 1: ${f1}${f1 ? " — UWAGA, fala 2 nie miała prawa dotknąć plików fali 1" : ""}).\n` +
    `Worktree ${worktree} usunięty, gałąź ${galaz} skasowana po potwierdzeniu scalenia.\n` +
    "Teraz, w PEŁNYM drzewie:\n  node audyt/tools/porownaj-cykle.mjs\n  node audyt/tools/straznik-sektora-audytu.mjs\n"
  );
  return f1 ? 1 : 0;
}

/* ── samokontrola: całe życie worktree na tymczasowym repozytorium ─────── */

function samokontrola() {
  let zle = 0;
  const sprawdz = (nazwa, ok, szczegol = "") => {
    if (!ok) zle++;
    process.stdout.write(`  ${ok ? "✓" : "✗"} ${nazwa}${!ok && szczegol ? `\n      ${String(szczegol).trim().slice(0, 300)}` : ""}\n`);
  };

  /* czyste funkcje */
  sprawdz("GAŁĄŹ     re-audyt/sektor-re-audytu → re-audyt/fala-2", galazFali("re-audyt/sektor-re-audytu", 2) === "re-audyt/fala-2");
  sprawdz("GAŁĄŹ     audyt/sektor-audytu → audyt/fala-2", galazFali("audyt/sektor-audytu", 2) === "audyt/fala-2");
  sprawdz("GAŁĄŹ     main → null (nie gałąź sektora)", galazFali("main", 2) === null);
  sprawdz("ŚCIEŻKA   nazwa ze spacją na końcu → bez spacji, z -fala-2", domyslnyWorktree("/x/Pod strona Szkolenia ", 2) === "/x/Pod-strona-Szkolenia-fala-2");
  const w = wzorceSparse(2);
  sprawdz("WZORCE    fala 2 chowa *-F1-*, *-f1-* i wyniki/, zostawia resztę", w[0] === "/*" && w.includes("!/audyt/zgloszenia/*-F1-*") && w.includes("!/audyt/stan/*-f1-*") && w.includes("!/audyt/wyniki/*") && !w.some((x) => x.includes("F2")));

  /* przebieg na tymczasowym repozytorium */
  const tmp = mkdtempSync(join(tmpdir(), "fala-"));
  const repo = join(tmp, "repo");
  const wt = join(tmp, "fala-2");
  const g = (args, cwd = repo) => execFileSync("git", ["-c", "user.email=fala@test", "-c", "user.name=fala", ...args], { cwd, encoding: "utf8" }).trim();
  const uruchom = (cwd, ...args) => {
    const r = spawnSync("node", ["audyt/tools/fala.mjs", ...args, `--worktree=${wt}`], { cwd, encoding: "utf8" });
    return { kod: r.status, wyjscie: (r.stdout ?? "") + (r.stderr ?? "") };
  };
  const node = (cwd, ...args) => {
    const r = spawnSync("node", args, { cwd, encoding: "utf8" });
    return { kod: r.status, wyjscie: (r.stdout ?? "") + (r.stderr ?? "") };
  };
  const zapisz = (sciezka, tresc) => { mkdirSync(dirname(sciezka), { recursive: true }); writeFileSync(sciezka, tresc, "utf8"); };
  try {
    /* main: produkt-atrapa (to, czego migawka potrzebuje do policzenia) */
    mkdirSync(repo, { recursive: true });
    g(["init", "-q", "-b", "main"]);
    zapisz(join(repo, "README.md"), "/**\nprodukt-atrapa\n");
    zapisz(join(repo, "package.json"), JSON.stringify({ name: "atrapa", scripts: {} }));
    zapisz(join(repo, "tools", "straznicy", "straznik-atrapa.mjs"), "// atrapa\n");
    zapisz(join(repo, "tools", "straznicy", "audyt-straznikow.mjs"), "// opis: atrapa\n");
    g(["add", "-A"]); g(["commit", "-qm", "produkt"]);
    const glowaMain = g(["rev-parse", "main"]);

    /* gałąź sektora: kopia PRAWDZIWYCH narzędzi + stan fali 1 + rola-atrapa */
    g(["checkout", "-qb", "audyt/sektor-audytu"]);
    cpSync(join(KORZEN, "audyt", "tools"), join(repo, "audyt", "tools"), { recursive: true });
    const wpisF1 = { id: "AUD-SEC-F1-001", sektor: "audyt", fala: 1, dzial: "SEC", pozycja: "SEC-01", stwierdzenie: "atrapa fali 1", miejsce: { rodzaj: "linia", plik: "README.md", linia: 1, tresc: "/**" }, dowod: "atrapa", klasyfikacja: "atrapa", wplyw: "brak", hash: "0".repeat(64), status: "DO WERYFIKACJI", werdykt: null };
    zapisz(join(repo, "audyt", "zgloszenia", "AUD-SEC-F1-001.json"), JSON.stringify(wpisF1, null, 2));
    zapisz(join(repo, "audyt", "stan", "audyt-f1-SEC.json"), JSON.stringify({ sektor: "audyt", fala: 1, rola: "SEC", status: "ZAKOŃCZONE", runda: 1, niedomkniete: [], kiedy: "2026-09-02T10:00:00.000Z", historia: [{ status: "ZAKOŃCZONE", runda: 1, kiedy: "2026-09-02T10:00:00.000Z" }] }, null, 2));
    zapisz(join(repo, "audyt", "migawki", "przed.json"), JSON.stringify({ glowa_main: glowaMain }, null, 2));
    zapisz(join(repo, "audyt", "wyniki", "polaczone-f1.json"), "{}\n");
    zapisz(join(repo, "audyt", "role", "SEC", "AGENT.md"), "# Rola SEC\n\n**Rola.** Atrapa roli do samokontroli fala.mjs.\n");
    zapisz(join(repo, "audyt", "role", "SEC", "KRYTYK.md"), "# Krytyk SEC\n\n**Rola.** Atrapa krytyka do samokontroli fala.mjs.\n");
    g(["add", "-A"]); g(["commit", "-qm", "sektor z falą 1"]);

    /* odmowy przed postawieniem */
    zapisz(join(repo, "audyt", "stan", "brudny.json"), "{}");
    const brudny = uruchom(repo, "--postaw=2");
    sprawdz("POSTAW    brudne drzewo sektora → kod 1, bez worktree", brudny.kod === 1 && !existsSync(wt), `kod ${brudny.kod}: ${brudny.wyjscie}`);
    rmSync(join(repo, "audyt", "stan", "brudny.json"));
    const naMain = (() => { g(["checkout", "-q", "main"]); const r = uruchom(repo, "--postaw=2"); g(["checkout", "-q", "audyt/sektor-audytu"]); return r; })();
    sprawdz("POSTAW    na gałęzi main (nie sektora) → kod 1", naMain.kod === 1 && !existsSync(wt), `kod ${naMain.kod}`);
    const scalBez = uruchom(repo, "--scal=2");
    sprawdz("SCAL      bez worktree → kod 1", scalBez.kod === 1, `kod ${scalBez.kod}`);

    /* postaw */
    const p = uruchom(repo, "--postaw=2");
    sprawdz("POSTAW    kod 0, worktree istnieje na gałęzi audyt/fala-2 od tego samego commita", p.kod === 0 && existsSync(wt) && g(["branch", "--show-current"], wt) === "audyt/fala-2" && g(["rev-parse", "HEAD"], wt) === g(["rev-parse", "audyt/sektor-audytu"]), `kod ${p.kod}: ${p.wyjscie}`);
    sprawdz("POSTAW    na dysku worktree NIE MA wpisu ani stanu fali 1 ani wyników", !existsSync(join(wt, "audyt", "zgloszenia", "AUD-SEC-F1-001.json")) && !existsSync(join(wt, "audyt", "stan", "audyt-f1-SEC.json")) && !existsSync(join(wt, "audyt", "wyniki", "polaczone-f1.json")));
    sprawdz("POSTAW    produkt i narzędzia SĄ w worktree (README, tools, migawka odziedziczona)", existsSync(join(wt, "README.md")) && existsSync(join(wt, "audyt", "tools", "status.mjs")) && existsSync(join(wt, "audyt", "migawki", "przed.json")) && /odziedziczona/.test(p.wyjscie));
    sprawdz("POSTAW    generat powstał W WORKTREE (aud-sec, aud-sec-krytyk)", existsSync(join(wt, ".claude", "agents", "aud-sec.md")) && existsSync(join(wt, ".claude", "agents", "aud-sec-krytyk.md")));
    sprawdz("POSTAW    wyjście podaje komendę scalenia", /fala\.mjs --scal=2/.test(p.wyjscie));

    /* IZOLACJA ZMIERZONA PARĄ: ta sama komenda, dwa drzewa, dwa kody */
    const wPelnym = node(repo, "audyt/tools/status.mjs", "--rola=SEC", "--fala=2", "--status=W TRAKCIE");
    sprawdz("IZOLACJA  status.mjs w PEŁNYM drzewie: SEC fali 2 → kod 1 (widać falę 1)", wPelnym.kod === 1 && /widać falę 1/.test(wPelnym.wyjscie), `kod ${wPelnym.kod}: ${wPelnym.wyjscie}`);
    const wWorktree = node(wt, "audyt/tools/status.mjs", "--rola=SEC", "--fala=2", "--status=W TRAKCIE");
    sprawdz("IZOLACJA  status.mjs W WORKTREE: SEC fali 2 → kod 0 (fala 1 schowana)", wWorktree.kod === 0 && existsSync(join(wt, "audyt", "stan", "audyt-f2-SEC.json")), `kod ${wWorktree.kod}: ${wWorktree.wyjscie}`);

    /* zgłoszenie fali 2 w worktree — narzędziem, nie ręcznie */
    const wejscie = join(tmp, "wejscie.json");
    writeFileSync(wejscie, JSON.stringify({ sektor: "audyt", fala: 2, dzial: "SEC", pozycja: "SEC-01", stwierdzenie: "Atrapa fali 2: to samo miejsce opisane własnymi słowami.", miejsce: { rodzaj: "linia", plik: "README.md", linia: 1, tresc: "/**" }, dowod: "Atrapa samokontroli fala.mjs — katalog tymczasowy.", klasyfikacja: "atrapa", wplyw: "brak" }));
    const z = node(wt, "audyt/tools/zgloszenie.mjs", `--plik=${wejscie}`);
    sprawdz("ZGŁOSZENIE w worktree dostaje AUD-SEC-F2-001 (pula fali 2 od 001)", z.kod === 0 && existsSync(join(wt, "audyt", "zgloszenia", "AUD-SEC-F2-001.json")), `kod ${z.kod}: ${z.wyjscie}`);

    /* scal: najpierw odmowa na brudnym worktree, potem po commicie */
    const scalBrudny = uruchom(repo, "--scal=2");
    sprawdz("SCAL      niezacommitowany worktree → kod 1, worktree zostaje", scalBrudny.kod === 1 && existsSync(wt) && /niezacommitowanych/.test(scalBrudny.wyjscie), `kod ${scalBrudny.kod}: ${scalBrudny.wyjscie}`);
    g(["add", "audyt"], wt); g(["commit", "-qm", "fala 2"], wt);
    const s = uruchom(repo, "--scal=2");
    sprawdz("SCAL      kod 0; worktree usunięty; gałąź fali skasowana po scaleniu", s.kod === 0 && !existsSync(wt) && spawnSync("git", ["rev-parse", "--verify", "--quiet", "audyt/fala-2"], { cwd: repo }).status !== 0, `kod ${s.kod}: ${s.wyjscie}`);
    sprawdz("SCAL      pełne drzewo ma OBIE fale: wpisy F1 i F2, stany f1 i f2", ["zgloszenia/AUD-SEC-F1-001.json", "zgloszenia/AUD-SEC-F2-001.json", "stan/audyt-f1-SEC.json", "stan/audyt-f2-SEC.json"].every((f) => existsSync(join(repo, "audyt", f))));
    sprawdz("SCAL      drzewo sektora czyste po scaleniu", brudne(repo).length === 0);

    /* druga runda: gałąź sektora BEZ migawki → worktree ją robi */
    g(["rm", "-q", "audyt/migawki/przed.json"]); g(["commit", "-qm", "bez migawki"]);
    const p2 = uruchom(repo, "--postaw=2");
    sprawdz("POSTAW    bez migawki na gałęzi → migawka ZAPISANA w worktree", p2.kod === 0 && existsSync(join(wt, "audyt", "migawki", "przed.json")) && /zapisana w worktree/.test(p2.wyjscie), `kod ${p2.kod}: ${p2.wyjscie}`);
    const p2Ponownie = uruchom(repo, "--postaw=2");
    sprawdz("POSTAW    drugi raz przy istniejącej gałęzi fali → kod 1", p2Ponownie.kod === 1, `kod ${p2Ponownie.kod}`);
  } finally {
    // Worktree tymczasowego repo trzeba wyrejestrować, zanim zniknie katalog.
    spawnSync("git", ["worktree", "remove", "--force", wt], { cwd: repo });
    rmSync(tmp, { recursive: true, force: true });
  }

  process.stdout.write(`\nSamokontrola worktree fali 2: ${zle === 0 ? "wszystkie przypadki zaliczone" : `${zle} NIE zaliczonych`}\n`);
  return zle === 0;
}

/* ── wejście ── */

/** Bramka głównego modułu odporna na spację w nazwie katalogu (BLAD-014). */
const GLOWNY_MODUL =
  Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (GLOWNY_MODUL) {
  const arg = process.argv.slice(2);
  if (arg.includes("--test")) process.exit(samokontrola() ? 0 : 1);
  const wartosc = (n) => arg.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
  const postawFala = wartosc("postaw");
  const scalFala = wartosc("scal");
  const fala = Number(postawFala ?? scalFala);
  const worktree = wartosc("worktree") ? resolve(wartosc("worktree")) : domyslnyWorktree(KORZEN, fala);
  if (postawFala) process.exit(postaw(fala, worktree, KORZEN));
  if (scalFala) process.exit(scal(fala, worktree, KORZEN));
  process.stdout.write("Użycie: node audyt/tools/fala.mjs --postaw=2 | --scal=2 [--worktree=<katalog>] | --test\n");
  process.exit(1);
}
