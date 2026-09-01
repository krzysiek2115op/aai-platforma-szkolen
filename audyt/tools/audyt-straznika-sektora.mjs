/**
 * AUDYT MUTACYJNY STRAŻNIKA SEKTORA — czy on w ogóle cokolwiek łapie.
 *
 * DLACZEGO OSOBNY. Audyt mutacyjny projektu (`tools/straznicy/audyt-straznikow.mjs`)
 * leży POZA `audyt/`, więc dopisanie do niego mutacji złamałoby niezmiennik
 * sektora. Sektor ma więc własny — kontrakt wpisu jest ten sam, żeby dało się
 * je kiedyś połączyć bez przepisywania.
 *
 * ZASADA: psujemy kod w konkretnym miejscu i sprawdzamy, CZY COŚ SZCZEKA.
 * Milczenie przy zepsutym kodzie jest osobnym znaleziskiem. Wpisy
 * `oczekujCzerwonego: false` to KONTRPRZYKŁADY — zmiany dozwolone, które
 * NIE mogą zapalać strażnika; bez nich reguła mogłaby być po prostu
 * nadwrażliwa i nikt by tego nie zauważył.
 *
 * KOPIA ZAPASOWA POWSTAJE RAZ, PRZED PIERWSZĄ MUTACJĄ. Kopia robiona w kolejnej
 * turze jest już kopią wersji ZMUTOWANEJ — ta pułapka zabrała czas dwa razy
 * w jednej sesji przeglądu T3. Przywracanie idzie przez `finally`.
 *
 * Użycie: node audyt/tools/audyt-straznika-sektora.mjs
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { KORZEN, SEKTOR, ZGLOSZENIA } from "./wspolne.mjs";

const P = (s) => join(KORZEN, s);
const ROLE_MD = "audyt/ROLE.md";
const WSPOLNE = "audyt/tools/wspolne.mjs";
const ZGLOSZENIE = "audyt/tools/zgloszenie.mjs";
const MAPA = "audyt/tools/mapa.mjs";

/** Uruchamia strażnika sektora. Zwraca true, gdy ZAPALIŁ SIĘ (kod != 0). */
function straznikCzerwony() {
  const r = spawnSync("node", ["audyt/tools/straznik-sektora-audytu.mjs"], {
    cwd: KORZEN, encoding: "utf8",
  });
  return { czerwony: r.status !== 0, wyjscie: (r.stdout ?? "") + (r.stderr ?? "") };
}

const MUTACJE = [
  {
    opis: "rola traci mechaniczny zakres (K4' — zostaje swobodny przegląd)",
    plik: ROLE_MD,
    slad: /nie ma mechanicznego zakresu/,
    zmien: (s) => s.replace(
      /(\*\*Zakres — 113 plików\*\*\n)```\n[\s\S]*?\n```/,
      "$1(opis słowny zamiast komendy)"
    ),
  },
  {
    opis: "rola traci pozycje checklisty — nie ma czego wyczerpać (W3, K4')",
    plik: ROLE_MD,
    slad: /pozycji checklisty — za ma[łl]o/,
    zmien: (s) => s.replace(/^\| INT-\d+ \|.*$/gm, ""),
  },
  {
    opis: "z ROLE.md znika cała rola",
    plik: ROLE_MD,
    slad: /nie opisuje roli/,
    zmien: (s) => s.replace(/\n## PIK — Początek i koniec[\s\S]*?(?=\n## USP —)/, "\n"),
  },
  {
    opis: "bramka zgłoszeń przestaje odrzucać stwierdzenia niepewne (§11)",
    plik: WSPOLNE,
    slad: /samokontrola|zgloszenie\.mjs --test/i,
    zmien: (s) => s.replace(/export const NIEPEWNOSC = \[[\s\S]*?\];/, "export const NIEPEWNOSC = [];"),
  },
  {
    opis: "bramka zgłoszeń przestaje sprawdzać, czy treść linii zgadza się z plikiem",
    plik: ZGLOSZENIE,
    slad: /samokontrola|zgloszenie\.mjs --test/i,
    zmien: (s) => s.replace(
      "} else if (znormalizuj(linie[m.linia - 1]) !== znormalizuj(m.tresc)) {",
      "} else if (false) {"
    ),
  },
  {
    opis: "bramka zgłoszeń przestaje wymagać istnienia pliku (miejsce nie do wskazania)",
    plik: ZGLOSZENIE,
    slad: /samokontrola|zgloszenie\.mjs --test/i,
    zmien: (s) => s.replace("if (!existsSync(sciezka)) {", "if (false) {"),
  },
  {
    opis: "mapa traci wykluczenie D4 — 331 plików kursów staje się sierotami",
    plik: MAPA,
    slad: /mapa pokrycia zg[łl]asza sieroty/,
    zmien: (s) => s.replace(/\{\s*komenda: "git ls-files -- 'tresc-kursow'",[\s\S]*?\},/, ""),
  },
  {
    // UWAGA na kształt tej mutacji. Pierwsza wersja podmieniała tylko PIERWSZY
    // pathspec w zakresie PIK, a reszta linii zostawała — zakres dalej zwracał
    // pliki, więc warunek "pusty zakres" NIE POWSTAWAŁ i mutacja przechodziła.
    // Wyglądało to jak dziura w strażniku, a było dziurą w mutacji.
    // Mutacja, która nie tworzy warunku, jaki deklaruje, jest MARTWA i daje
    // fałszywą pewność. Dlatego podmieniamy CAŁY blok komendy.
    opis: "zakres działu przestaje obejmować cokolwiek (przechodziłby po pustce)",
    plik: ROLE_MD,
    slad: /ZAKRES PUSTY|mapa pokrycia zg[łl]asza sieroty/,
    zmien: (s) => s.replace(
      /(\*\*Zakres — 10 plików\*\*\n```\n)[\s\S]*?(\n```)/,
      "$1git ls-files -- 'audyt/nie-ma-takiego-pliku'$2"
    ),
  },
  {
    opis: "KONTRPRZYKŁAD: dopisanie pozycji do checklisty NIE może zapalać strażnika",
    plik: ROLE_MD,
    oczekujCzerwonego: false,
    zmien: (s) => s.replace(
      "| SEC-12 |",
      "| SEC-13 | Czy nowa pozycja da się dopisać bez alarmu? | grep | plik:linia |\n| SEC-12 |"
    ),
  },
];

/* ── ROLA Z SZABLONU: strażnik NIE MOŻE się na niej zapalić ──────────────────
   To jest kontrola zgodności szablonów ze strażnikiem, robiona za każdym
   przebiegiem, a nie raz przy pisaniu. Przelot próbny przy E4 zapalił trzy
   fałszywe alarmy, bo wzorce reguły 6 zakładały, że zdanie mieści się w jednej
   linii, a Markdown je zawija. Gdyby ta kontrola nie została na stałe, E5
   wywróciłoby się na pierwszej roli — a wyglądałoby to na błąd roli. */
function rolaZSzablonu() {
  const SZABLONY = join(SEKTOR, "szablony");
  const PROBNA = join(SEKTOR, "role", "PROBA");
  mkdirSync(join(PROBNA, "goldeny"), { recursive: true });
  try {
    for (const [z, d] of [["AGENT.md", "AGENT.md"], ["KRYTYK.md", "KRYTYK.md"], ["SKILL.md", "SKILL.md"]]) {
      const t = readFileSync(join(SZABLONY, z), "utf8").replaceAll("<KOD>", "PROBA").replaceAll("<NAZWA ROLI>", "Próba");
      writeFileSync(join(PROBNA, d), t, "utf8");
    }
    writeFileSync(join(PROBNA, "goldeny", "wzorzec.md"),
      readFileSync(join(SZABLONY, "golden.md"), "utf8").replaceAll("<KOD>", "PROBA"), "utf8");
    spawnSync("node", ["audyt/tools/generuj-agentow.mjs"], { cwd: KORZEN, stdio: "pipe" });
    const { czerwony, wyjscie } = straznikCzerwony();
    return { czerwony, wyjscie };
  } finally {
    rmSync(PROBNA, { recursive: true, force: true });
    rmSync(join(KORZEN, ".claude", "agents", "aud-proba.md"), { force: true });
    rmSync(join(KORZEN, ".claude", "agents", "aud-proba-krytyk.md"), { force: true });
  }
}

/* ── zgłoszenie-śmieć: reguła 5 ma je złapać bez dotykania kodu ── */
const SMIEC = join(ZGLOSZENIA, "AUD-SEC-999.json");

function mutacjaZgloszenia() {
  mkdirSync(ZGLOSZENIA, { recursive: true });
  writeFileSync(SMIEC, JSON.stringify({ id: "AUD-SEC-999", sektor: "audyt", fala: 1, dzial: "SEC", stwierdzenie: "cos" }, null, 2));
  try {
    const { czerwony, wyjscie } = straznikCzerwony();
    return { czerwony, trafiony: /brak dowod|brak miejsce|brak hash/.test(wyjscie) };
  } finally {
    rmSync(SMIEC, { force: true });
  }
}

/* ── przebieg ── */

const kopie = new Map();
for (const m of MUTACJE) {
  if (!kopie.has(m.plik)) kopie.set(m.plik, readFileSync(P(m.plik), "utf8"));
}

let przeoczone = 0;
let martwe = 0;
let zle = 0;

try {
  // Stan wyjściowy MUSI być zielony, inaczej cały przebieg mierzy nie to.
  const start = straznikCzerwony();
  if (start.czerwony) {
    process.stdout.write("Strażnik jest CZERWONY przed mutacjami — napraw to najpierw.\n" + start.wyjscie);
    process.exit(1);
  }

  for (const m of MUTACJE) {
    const oryginal = kopie.get(m.plik);
    const zmutowany = m.zmien(oryginal);
    const oczekujCzerwonego = m.oczekujCzerwonego !== false;

    if (zmutowany === oryginal) {
      process.stdout.write(`  ✗ MUTACJA NIC NIE ZMIENIŁA: ${m.opis}\n`);
      zle++;
      continue;
    }

    writeFileSync(P(m.plik), zmutowany, "utf8");
    const { czerwony, wyjscie } = straznikCzerwony();
    writeFileSync(P(m.plik), oryginal, "utf8");

    if (oczekujCzerwonego && !czerwony) {
      process.stdout.write(`  ✗ PRZEPUŚCIŁ: ${m.opis}\n`);
      przeoczone++;
    } else if (!oczekujCzerwonego && czerwony) {
      process.stdout.write(`  ✗ FAŁSZYWY ALARM: ${m.opis}\n`);
      zle++;
    } else if (oczekujCzerwonego && m.slad && !m.slad.test(wyjscie)) {
      // Mutacja zapaliła strażnika, ale NIE TĘ regułę, którą psuła — czyli
      // maskuje ją inna. To groźniejsze niż przeoczenie, bo wygląda na sukces.
      process.stdout.write(`  ✗ ZŁY ŚLAD: ${m.opis}\n      zapaliło się coś innego niż ${m.slad}\n`);
      zle++;
    } else {
      process.stdout.write(`  ✓ ${oczekujCzerwonego ? "złapane" : "przepuszczone słusznie"}: ${m.opis}\n`);
    }
  }

  const r = rolaZSzablonu();
  if (r.czerwony) {
    process.stdout.write(`  ✗ FAŁSZYWY ALARM: rola zbudowana z SZABLONÓW zapala strażnika\n      ${r.wyjscie.split("\n").filter(Boolean).slice(1, 4).join("\n      ")}\n`);
    zle++;
  } else {
    process.stdout.write("  ✓ przepuszczone słusznie: rola zbudowana z szablonów przechodzi przez strażnika\n");
  }

  const z = mutacjaZgloszenia();
  if (!z.czerwony) { process.stdout.write("  ✗ PRZEPUŚCIŁ: zgłoszenie bez dowodu, miejsca i hasha\n"); przeoczone++; }
  else if (!z.trafiony) { process.stdout.write("  ✗ ZŁY ŚLAD: zgłoszenie-śmieć zapaliło inną regułę\n"); zle++; }
  else process.stdout.write("  ✓ złapane: zgłoszenie bez dowodu, miejsca i hasha\n");
} finally {
  for (const [plik, tresc] of kopie) writeFileSync(P(plik), tresc, "utf8");
  rmSync(SMIEC, { force: true });
}

const razem = MUTACJE.length + 2;
process.stdout.write(`\nMutacje sektora: ${razem}, przeoczone: ${przeoczone}, martwe/złe: ${zle + martwe}\n`);

// Po przywróceniu strażnik MUSI wrócić do zieleni — inaczej przebieg coś zostawił.
const koniec = straznikCzerwony();
if (koniec.czerwony) {
  process.stdout.write("\nPo przywróceniu strażnik jest CZERWONY — przebieg zostawił po sobie zmianę.\n" + koniec.wyjscie);
  process.exit(1);
}

process.exit(przeoczone + zle + martwe === 0 ? 0 : 1);
