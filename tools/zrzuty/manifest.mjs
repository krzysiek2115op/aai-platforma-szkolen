/**
 * Manifest przelotu zrzutów — JEDNO źródło prawdy o tym, co jest zrobione.
 * Wyprowadzany z prozy, więc nie da się rozjechać z rzeczywistością:
 *   - miejsce ze znacznikiem `<!-- ZRZUT: … -->`  → do zrobienia,
 *   - miejsce z `![…](zrzuty/…)` i istniejącym plikiem → zrobione.
 *
 * node tools/zrzuty/manifest.mjs            — podsumowanie
 * node tools/zrzuty/manifest.mjs --kurs K1  — tylko jeden kurs
 * node tools/zrzuty/manifest.mjs --json     — pełna lista na stdout
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const KORZEN = process.env.ZRZUTY_KORZEN ?? process.cwd();
export const KURSY = { K1: "jak-korzystac-z-claude", K2: "jak-uzywac-githuba" };

/** Kubeł mówi, CZEGO zrzut wymaga — a więc kto i kiedy może go zrobić. */
const REGULY = [
  // Sprawdzone WYKONANIEM 2026-08-23 (czat A): anonimowa przeglądarka NIE WIDZI merge boxa
  // ani przycisków scalania — GitHub pokazuje je dopiero komuś z prawem zapisu. Tak samo
  // logi przebiegu Actions („Sign in to view logs") i żółty baner o świeżo wypchniętej
  // gałęzi. W GitHub Desktop za logowaniem stoi ekran „Let's get started!" z listą repozytoriów.
  // Reguła jest PIERWSZA, bo inaczej kubły „desktop"/„github-public" obiecują niemożliwe.
  ["github-logged", /merge box|merge boxa|merge boxem|restore branch|compare & pull request|w logu|nieaktywnym przyciskiem|listą sprawdzeń|opcji scalania|let.s get started|your repositories/i],
  ["arkusz", /arkusz/i],
  ["tui", /claude code|sesj[ai] claude|\/config|\/status|\/context|\/memory|\/permissions|\/mcp|\/hooks|\/rewind|\/sandbox|\/plugin|\/summarize|shift\+tab|ctrl\+[eo]|dwukrotnym esc|znak zachęty|menu komend|panel pomocy|panel subagent|transkryp|podgląd proponowanej zmiany|pytanie o zgodę|worktree|restored the code|menu podpowiedzi ścieżek|uruchomionym `claude`|plan mode|menu `\/`|tryb(ów)? uprawnie|pasek stanu/i],
  ["api", /\busage\b|tool_use|input_tokens|cache_(read|creation)|błędu 400|output_config/i],
  ["console", /console|konsol|workbench|klucz api|tworzenia klucza|api keys|rate limits|lista wsadów/i],
  ["claude-ai", /claude\.ai|dwa okna czatu|okna obok siebie|odpowiedź claude|ten sam prompt dwa razy|ta sama prośba|dwie odpowiedzi|rozmowa|podglądem myślenia|obraz wgrany|@claude/i],
  ["desktop", /github desktop|ekran powitalny|let.s get started|menu repository/i],
  ["terminal", /terminal|ssh-keygen/i],
  ["docs", /w dokumentacji|strona „|sekcja „|tabela „|glossary|pricing|git-scm|training\.github|github skills|blok ostrzeżenia/i],
  ["github-logged", /settings|ustawie|danger zone|branch protection|branch name pattern|require a pull request|do not allow bypassing|secret|sekret|dependabot|codeql|advanced security|security polic|two-factor|dwuskładnik|2fa|qr|recovery code|setup key|text code|ssh and gpg|new ssh key|formularz|create new file|okno dialogowe commit|commit changes|propose changes|push protection|reviewers|commit suggestion|add suggestion|new issue|zak(ł|l)adania konta|rozwijane menu main|delete branch|edytor konfliktów|opcji nad plikiem|describe this release|przełączniki|pre-release|generate release notes|alert o wykrytym|zakładka security and quality|prośbą o zalogowanie|edytor pliku .* na githubie/i],
];
/** Kubły, których nie da się obsłużyć bez ZALOGOWANEJ przeglądarki właściciela. */
export const WYMAGA_LOGOWANIA = new Set(["github-logged", "claude-ai", "console", "api"]);

function kubel(podpis, kurs) {
  for (const [nazwa, wzorzec] of REGULY) if (wzorzec.test(podpis)) return nazwa;
  return kurs === "K2" ? "github-public" : "claude-ai";
}

/** Nazwa pliku obrazu: `zNN-cztery-pierwsze-slowa-podpisu`. Polskie „ł" nie rozkłada się
 *  w NFD, więc idzie osobno — bez tego w nazwach zostawały dziury („nag-owek"). */
export function slug(podpis) {
  return podpis.replace(/ł/g, "l").replace(/Ł/g, "L")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).slice(0, 4).join("-");
}

export function zbierz() {
  const poz = [];
  for (const [kurs, slug] of Object.entries(KURSY)) {
    const katKursu = join(KORZEN, "tresc-kursow", slug);
    if (!existsSync(katKursu)) continue;
    for (const modul of readdirSync(katKursu).filter((d) => /^modul-\d+$/.test(d)).sort()) {
      const katModulu = join(katKursu, modul);
      for (const plik of readdirSync(katModulu).filter((f) => /^proza-.*\.md$/.test(f)).sort()) {
        const sciezka = join(katModulu, plik);
        readFileSync(sciezka, "utf8").split("\n").forEach((linia, idx) => {
          const znacznik = linia.match(/<!-- ZRZUT:\s*(.*?)\s*-->/);
          const obraz = linia.match(/^!\[(.*?)\]\((zrzuty\/[^)]+)\)\s*$/);
          if (!znacznik && !obraz) return;
          const podpis = (znacznik?.[1] ?? obraz?.[1]) || "";
          poz.push({
            kurs, modul: Number(modul.split("-")[1]),
            plik: sciezka.slice(KORZEN.length + 1), linia: idx + 1, podpis,
            kubel: kubel(podpis, kurs),
            status: obraz && existsSync(join(katModulu, obraz[2])) ? "zrobiony" : "todo",
            obraz: obraz?.[2] ?? null,
          });
        });
      }
    }
  }
  // Numer w nazwie liczy się w OBRĘBIE PLIKU lekcji, po kolei od góry; zrobiony zrzut
  // zachowuje swoją nazwę, a `obraz_plan` mówi wepnij.mjs, pod jaką nazwą szukać nowego.
  const licznik = new Map();
  for (const p of poz) {
    const n = (licznik.get(p.plik) ?? 0) + 1;
    licznik.set(p.plik, n);
    const nr = String(n).padStart(2, "0");
    p.id = `${p.kurs.toLowerCase()}-m${p.modul}-z${nr}`;
    p.obraz_plan = p.obraz ?? `zrzuty/z${nr}-${slug(p.podpis)}.webp`;
  }
  return poz;
}

// Porównujemy ŚCIEŻKI, nie łańcuchy URL: `import.meta.url` koduje spacje jako %20,
// więc sklejka `file://${argv[1]}` nie zgadza się w katalogu ze spacją w nazwie
// i blok CLI milczał, kończąc się kodem 0 (BLAD-014).
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let poz = zbierz();
  const filtr = process.argv.indexOf("--kurs");
  if (filtr > -1) poz = poz.filter((p) => p.kurs === process.argv[filtr + 1]);
  if (process.argv.includes("--json")) { console.log(JSON.stringify(poz, null, 1)); process.exit(0); }
  const licz = (f) => poz.filter(f).length;
  console.log(`Miejsc na zrzuty: ${poz.length}`);
  console.log(`  zrobione:          ${licz((p) => p.status === "zrobiony")}`);
  console.log(`  do zrobienia TERAZ:${String(licz((p) => p.status === "todo" && !WYMAGA_LOGOWANIA.has(p.kubel))).padStart(4)}`);
  console.log(`  po zalogowaniu:    ${licz((p) => p.status === "todo" && WYMAGA_LOGOWANIA.has(p.kubel))}`);
  for (const kurs of Object.keys(KURSY)) {
    const swoje = poz.filter((p) => p.kurs === kurs && p.status === "todo");
    const wg = {};
    for (const p of swoje) wg[p.kubel] = (wg[p.kubel] ?? 0) + 1;
    console.log(`  ${kurs}: ${JSON.stringify(wg)}`);
  }
}
