/**
 * STRAŻNIK SEKTORA AUDYT — siedem kontroli z planu budowy.
 *
 * DLACZEGO TUTAJ, A NIE W `tools/straznicy/`. Sektor żyje wyłącznie na swojej
 * gałęzi (D7) i nie wolno mu dotknąć niczego poza `audyt/`. Strażnik z `main`
 * nas nie pilnuje i to jest świadomy koszt nazwany w planie jako K8 — więc
 * sektor pilnuje się sam, na swojej gałęzi.
 *
 * WZORCE CELUJĄ W ROZSTRZYGNIĘCIE, NIE W NAZWĘ. W tym repo pułapka "wzorzec
 * pyta o obecność napisu" zzieleniła strażnika przy zepsutym kodzie DZIEWIĘĆ
 * razy (0.29.0 nazwa metody, 0.44.0 nazwa stałej, 0.47.0 napis, dwa razy w P4,
 * raz w przeglądzie T3). Każda reguła niżej pyta o skutek, który da się złamać.
 *
 * KONTROLE WARUNKOWE. Reguły 2, 3, 4 i 6 dotyczą katalogu `audyt/role/`, który
 * powstaje dopiero w E5. Dopóki go nie ma, mówią wprost "pominięte" — cisza
 * byłaby nie do odróżnienia od zaliczenia.
 *
 * Użycie: node audyt/tools/straznik-sektora-audytu.mjs
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { DZIALY, KORZEN, PROCESOWE, ROLE_MD, SEKTOR, wszystkieZgloszenia } from "./wspolne.mjs";

const ROLE = join(SEKTOR, "role");
const bledy = [];
const pominiete = [];
const uwagi = [];

const sh = (k) => execFileSync("bash", ["-c", k], { cwd: KORZEN, encoding: "utf8", maxBuffer: 1 << 26 }).trim();

/* ── 1. gałąź sektora nie zmienia kodu produktu (D7, W2) ───────────────────
   Pytamy o SKUTEK — listę zmienionych plików poza `audyt/` — a nie o to, czy
   ktoś zadeklarował, że nic nie ruszał. */
{
  const zmienione = sh("git diff main --name-only -- . ':!audyt'").split("\n").filter(Boolean);
  // `.claude/` jest WYJĄTKIEM NAZWANYM, nie przeoczonym: to generat definicji
  // agentów (D1), z założenia nieśledzony i odtwarzalny jedną komendą ze źródła
  // w `audyt/role/`. Wyjątek jest wąski — pilnuje go reguła 4, która sprawdza
  // zgodność generatu ze źródłem po sha256 ORAZ brak generatów-sierot.
  // Bez tego wyjątku strażnik zapalałby się na własnym, zamierzonym artefakcie.
  const brudne = sh("git status --porcelain -- . ':!audyt' ':!.claude'").split("\n").filter(Boolean);
  if (zmienione.length) {
    bledy.push(`sektor zmienił ${zmienione.length} plików poza audyt/: ${zmienione.slice(0, 5).join(", ")}`);
  }
  if (brudne.length) {
    bledy.push(`niezacommitowane zmiany poza audyt/: ${brudne.slice(0, 5).join(", ")}`);
  }
}

/* ── 2. każda rola ma krytyka (D3, WYTYCZNE N1) ── */
if (!existsSync(ROLE)) {
  pominiete.push("2. para agent+krytyk — katalog audyt/role/ powstaje w E5");
} else {
  for (const kod of readdirSync(ROLE)) {
    if (!existsSync(join(ROLE, kod, "KRYTYK.md"))) bledy.push(`rola ${kod} nie ma KRYTYK.md (D3: krytyk przy KAŻDEJ roli)`);
  }
}

/* ── 3. komplet pięciu elementów (§5 regulaminu) ── */
const PIEC = ["Context", "Ograniczenia", "Moduł", "Prompt", "Narzędzia"];
if (!existsSync(ROLE)) {
  pominiete.push("3. pięć elementów każdej roli — katalog audyt/role/ powstaje w E5");
} else {
  for (const kod of readdirSync(ROLE)) {
    const plik = join(ROLE, kod, "AGENT.md");
    if (!existsSync(plik)) { bledy.push(`rola ${kod} nie ma AGENT.md`); continue; }
    const t = readFileSync(plik, "utf8");
    const brak = PIEC.filter((e) => !new RegExp(`^##+\\s*${e}`, "im").test(t));
    if (brak.length) bledy.push(`rola ${kod}: brak elementów §5 — ${brak.join(", ")}`);
  }
}

/* ── 4. generat aktualny wobec źródła (D1) ── */
if (!existsSync(ROLE)) {
  pominiete.push("4. generat .claude/agents — brak źródeł, powstają w E5");
} else {
  try {
    execFileSync("node", ["audyt/tools/generuj-agentow.mjs", "--sprawdz"], { cwd: KORZEN, stdio: "pipe" });
  } catch {
    bledy.push("generat .claude/agents/ jest nieaktualny wobec źródła (uruchom generuj-agentow.mjs)");
  }
}

/* ── 5. każde zgłoszenie ma dowód, kod i miejsce (zasada 1) ────────────────
   Pytamy o ZAWARTOŚĆ wpisu, nie o to, czy przeszedł przez narzędzie: wpis
   dopisany ręcznie do katalogu ominąłby `zgloszenie.mjs`, a ta reguła nie. */
{
  const z = wszystkieZgloszenia();
  for (const w of z) {
    const braki = [];
    if (!w?.id) braki.push("id");
    if (!w?.dowod) braki.push("dowod");
    if (!w?.miejsce) braki.push("miejsce");
    if (!w?.hash) braki.push("hash");
    if (braki.length) bledy.push(`zgłoszenie ${w?.id ?? "(bez id)"}: brak ${braki.join(", ")}`);
  }
  uwagi.push(`zgłoszeń w sektorze: ${z.length}`);
}

/* ── 6. trzy zasady nadrzędne DOSŁOWNIE w każdej definicji (W9) ────────────
   Reguła pyta o ZDANIE niosące zakaz, nie o sam nagłówek — definicja
   z tytułem "NIE MA WYMYŚLANIA BŁĘDÓW" i pustą treścią niczego nie zabrania. */
/**
 * ODSTĘPY JAKO `\s+`, NIE SPACJA — Markdown ZAWIJA wiersze.
 *
 * Pierwsza wersja miała w tych wzorcach zwykłe spacje i przelot próbny
 * z szablonów zapalił trzy fałszywe alarmy: zdanie "Brak dowodu = brak
 * zgłoszenia." było w pliku przełamane między "brak" a "zgłoszenia", więc
 * wzorzec go nie widział. Reguła pilnująca obecności zdania **musi** być
 * odporna na zawijanie, inaczej pilnuje formatowania zamiast treści.
 */
const odstepy = (rdzen) => new RegExp(rdzen.replace(/ /g, "\\s+"), "i");

const ZASADY = [
  { nazwa: "nie ma wymyślania błędów", wzorzec: odstepy("brak dowodu\\s*=\\s*brak zg[łl]oszenia") },
  { nazwa: "sektory nie naprawiają", wzorzec: odstepy("znajduj[ąa] i wskazuj[ąa],? nigdy nie poprawiaj[ąa]") },
  { nazwa: "drążyć, nie przekazywać", wzorzec: odstepy("nie przekazuje go innemu dzia[łl]owi") },
];
if (!existsSync(ROLE)) {
  pominiete.push("6. trzy zasady nadrzędne w definicjach — audyt/role/ powstaje w E5");
} else {
  for (const kod of readdirSync(ROLE)) {
    for (const plik of ["AGENT.md", "KRYTYK.md", "SKILL.md"]) {
      const sciezka = join(ROLE, kod, plik);
      if (!existsSync(sciezka)) continue;
      const t = readFileSync(sciezka, "utf8");
      const brak = ZASADY.filter((z) => !z.wzorzec.test(t)).map((z) => z.nazwa);
      if (brak.length) bledy.push(`${kod}/${plik}: brak zasady nadrzędnej — ${brak.join("; ")}`);
    }
  }
}

/* ── 7. każda rola ma MECHANICZNY zakres i checklistę (K4') ────────────────
   To jest warunek powtarzalności, nie kosmetyka: rola bez listy sprawdzeń
   robi swobodny przegląd, a swobodny przegląd nie da tego samego wyniku
   w drugiej fali. */
{
  const t = readFileSync(ROLE_MD, "utf8");
  const sekcje = t.split("\n## ").filter((s) => /^[A-Z]+ —/.test(s));
  const znalezione = new Set();
  for (const s of sekcje) {
    const kod = s.match(/^([A-Z]+) —/)[1];
    znalezione.add(kod);
    const maZakres = /\*\*Zakres[^*]*\*\*\n```\n[\s\S]*?\n```/.test(s) || PROCESOWE.includes(kod);
    // Checklista = tabela z pozycjami postaci KOD-01 / KON-A1.
    const pozycje = (s.match(new RegExp(`^\\| ${kod}-(?:A)?\\d+ \\|`, "gm")) ?? []).length;
    if (!maZakres) bledy.push(`rola ${kod} w ROLE.md nie ma mechanicznego zakresu (K4')`);
    if (pozycje < 5) bledy.push(`rola ${kod} ma ${pozycje} pozycji checklisty — za mało, by wyczerpać listę (K4')`);
  }
  for (const kod of [...DZIALY, ...PROCESOWE]) {
    if (!znalezione.has(kod)) bledy.push(`ROLE.md nie opisuje roli ${kod}`);
  }
  uwagi.push(`ról w ROLE.md: ${znalezione.size}`);
}

/* ── 8. mapa pokrycia bez sierot (W6, K2) ── */
try {
  execFileSync("node", ["audyt/tools/mapa.mjs"], { cwd: KORZEN, stdio: "pipe" });
  uwagi.push("mapa pokrycia: bez sierot");
} catch {
  bledy.push("mapa pokrycia zgłasza sieroty, sprzeczności albo pusty zakres — uruchom audyt/tools/mapa.mjs");
}

/* ── 9. narzędzie zgłoszeń przechodzi własną samokontrolę ── */
try {
  execFileSync("node", ["audyt/tools/zgloszenie.mjs", "--test"], { cwd: KORZEN, stdio: "pipe" });
  uwagi.push("zgloszenie.mjs: samokontrola zaliczona");
} catch {
  bledy.push("zgloszenie.mjs --test NIE przechodzi — bramka wpuszczania znalezisk jest zepsuta");
}

/* ── wynik ── */

if (bledy.length) {
  process.stdout.write("straznik-sektora-audytu:\n");
  for (const b of bledy) process.stdout.write(`  - ${b}\n`);
  process.exit(1);
}

process.stdout.write(`straznik-sektora-audytu: ${uwagi.join(", ")}.\n`);
for (const p of pominiete) process.stdout.write(`  pominięte — ${p}\n`);
process.exit(0);
