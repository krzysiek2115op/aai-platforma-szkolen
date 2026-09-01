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
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { KOD_PROBNY, KORZEN, SEKTOR, ZGLOSZENIA } from "./wspolne.mjs";

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
];

/* ── ROLA Z SZABLONU: strażnik NIE MOŻE się na niej zapalić ──────────────────
   To jest kontrola zgodności szablonów ze strażnikiem, robiona za każdym
   przebiegiem, a nie raz przy pisaniu. Przelot próbny przy E4 zapalił trzy
   fałszywe alarmy, bo wzorce reguły 6 zakładały, że zdanie mieści się w jednej
   linii, a Markdown je zawija. Gdyby ta kontrola nie została na stałe, E5
   wywróciłoby się na pierwszej roli — a wyglądałoby to na błąd roli. */
function rolaZSzablonu({ pomin = [], mutuj = {}, kod = KOD_PROBNY } = {}) {
  const SZABLONY = join(SEKTOR, "szablony");
  const PROBNA = join(SEKTOR, "role", kod);
  mkdirSync(join(PROBNA, "goldeny"), { recursive: true });
  try {
    for (const nazwa of ["AGENT.md", "KRYTYK.md", "SKILL.md"]) {
      if (pomin.includes(nazwa)) continue;
      let tresc = readFileSync(join(SZABLONY, nazwa), "utf8").replaceAll("<KOD>", kod).replaceAll("<NAZWA ROLI>", "Próba");
      if (mutuj[nazwa]) tresc = mutuj[nazwa](tresc);
      writeFileSync(join(PROBNA, nazwa), tresc, "utf8");
    }
    if (!pomin.includes("golden.md")) {
      let g = readFileSync(join(SZABLONY, "golden.md"), "utf8").replaceAll("<KOD>", kod);
      if (mutuj["golden.md"]) g = mutuj["golden.md"](g);
      writeFileSync(join(PROBNA, "goldeny", "wzorzec.md"), g, "utf8");
    }
    spawnSync("node", ["audyt/tools/generuj-agentow.mjs"], { cwd: KORZEN, stdio: "pipe" });
    const { czerwony, wyjscie } = straznikCzerwony();
    return { czerwony, wyjscie };
  } finally {
    rmSync(PROBNA, { recursive: true, force: true });
    const nazwaGeneratu = `aud-${kod.toLowerCase()}`;
    rmSync(join(KORZEN, ".claude", "agents", `${nazwaGeneratu}.md`), { force: true });
    rmSync(join(KORZEN, ".claude", "agents", `${nazwaGeneratu}-krytyk.md`), { force: true });
    // Generat mógł zostać przebudowany bez roli próbnej — przywracamy zgodność,
    // żeby kolejna mutacja nie mierzyła skutku poprzedniej (reguła 4).
    spawnSync("node", ["audyt/tools/generuj-agentow.mjs"], { cwd: KORZEN, stdio: "pipe" });
  }
}

/**
 * Mutacja obejmująca KILKA plików naraz. Potrzebna od reguły 13: „dopisanie
 * pozycji do checklisty" jest operacją na DWÓCH plikach (ROLE.md i AGENT.md
 * roli) i dopiero obie strony razem mówią, czy strażnik reaguje właściwie.
 */
function zPodmienionymi(mapa) {
  const oryginaly = new Map();
  try {
    for (const [plik, przeksztalc] of Object.entries(mapa)) {
      const tresc = readFileSync(P(plik), "utf8");
      oryginaly.set(plik, tresc);
      const nowa = przeksztalc(tresc);
      if (nowa === tresc) return { czerwony: false, wyjscie: `MUTACJA NIC NIE ZMIENIŁA w ${plik}` };
      writeFileSync(P(plik), nowa, "utf8");
    }
    // Regeneracja jest CZĘŚCIĄ operacji, którą mutacja udaje. Bez niej zapala
    // się reguła 4 (generat nieaktualny) i każda mutacja tej rodziny mierzyłaby
    // regułę 4 zamiast swojej — czyli maskowałaby to, co miała sprawdzić.
    spawnSync("node", ["audyt/tools/generuj-agentow.mjs"], { cwd: KORZEN, stdio: "pipe" });
    return straznikCzerwony();
  } finally {
    for (const [plik, tresc] of oryginaly) writeFileSync(P(plik), tresc, "utf8");
    spawnSync("node", ["audyt/tools/generuj-agentow.mjs"], { cwd: KORZEN, stdio: "pipe" });
  }
}

/* ── MUTACJE PRZEZ ROLĘ PRÓBNĄ ─────────────────────────────────────────────
   Reguł 10, 11 i 12 nie da się sprawdzić mutacją pliku produkcyjnego: dotyczą
   katalogu `audyt/role/`, który w trakcie budowy bywa pusty, a po budowie
   zawiera pracę, której audyt nie ma prawa psuć. Mutujemy więc SZABLON albo
   sposób budowy roli próbnej i pytamy, czy strażnik to złapie.

   Każda mutacja ma `slad` — tak jak `oczekiwanySlad` w audycie projektu od
   0.47.0. Bez niego mutacja łamiąca dwie reguły naraz maskuje jedną z nich
   i wygląda to na sukces. */
const MUTACJE_ROLI = [
  {
    opis: "z szablonu AGENT.md znika jedna z 13 zasad Goldena",
    wykonaj: () => rolaZSzablonu({ mutuj: { "AGENT.md": (s) => s.replace("7. Wspieraj strażników tam, gdzie znany problem może wrócić.\n", "") } }),
    slad: /brak zasad Goldena/,
  },
  {
    opis: "z szablonu KRYTYK.md znika zasada kolejności cyklu",
    wykonaj: () => rolaZSzablonu({ mutuj: { "KRYTYK.md": (s) => s.replace(/^12\. Pilnuj kolejno.*$/m, "12. Pilnuj czegoś tam.") } }),
    slad: /KRYTYK\.md: brak zasad Goldena/,
  },
  {
    opis: "GOLDEN ZGNIŁ: dobry przykład wskazuje linię obok",
    wykonaj: () => rolaZSzablonu({ mutuj: { "golden.md": (s) => s.replace('"linia": 440', '"linia": 441') } }),
    slad: /miał przejść, a bramka odrzuca/,
  },
  {
    opis: "zły przykład goldena przestaje być zły (bramka go przyjmuje)",
    wykonaj: () => rolaZSzablonu({ mutuj: { "golden.md": (s) => s
      .replace('"stwierdzenie": "Wydaje mi się, że tutaj może być problem z walidacją danych wejściowych."',
               '"stwierdzenie": "Zapytanie skleja wartość z żądania bez prepare, więc wejście trafia do SQL."')
      .replace('"linia": 99999,\n    "tresc": "coś takiego tam było"',
               '"linia": 440,\n    "tresc": "Egzekwowane maszynowo: narzędzie zgłoszeń **odmawia zapisu** wpisu bez dowodu."') } }),
    slad: /bramka go PRZYJMUJE/,
  },
  {
    opis: "zły przykład odrzucany, ale NIE z deklarowanego powodu",
    wykonaj: () => rolaZSzablonu({ mutuj: { "golden.md": (s) => s.replace("<!-- ODRZUCA: NIE ZGADZA -->", "<!-- ODRZUCA: brak pola \"dowod\" -->") } }),
    slad: /NIE z powodu/,
  },
  {
    opis: "blok goldena traci znacznik SPRAWDZANY (wypada spod miary)",
    wykonaj: () => rolaZSzablonu({ mutuj: { "golden.md": (s) => s.replace("<!-- SPRAWDZANY: przechodzi -->", "") } }),
    slad: /brak znacznika SPRAWDZANY/,
  },
  {
    opis: "rola bez SKILL.md — GOLD-06 nie ma czego sprawdzać",
    wykonaj: () => rolaZSzablonu({ pomin: ["SKILL.md"] }),
    slad: /nie ma SKILL\.md/,
  },
  {
    opis: "rola bez goldenów — nie ma miary",
    wykonaj: () => rolaZSzablonu({ pomin: ["golden.md"] }),
    slad: /katalog goldeny\/ jest pusty/,
  },
  {
    opis: "katalog roli, której ROLE.md nie zna (agent bez zakresu)",
    wykonaj: () => rolaZSzablonu({ kod: "NIEZNANA" }),
    slad: /nie odpowiada żadnej roli z ROLE\.md/,
  },
  {
    opis: "pozycja dopisana TYLKO do ROLE.md — agent nigdy jej nie zada",
    wykonaj: () => zPodmienionymi({
      "audyt/ROLE.md": (s) => s.replace("| SEC-12 |", "| SEC-13 | Czy pozycja dojechała do agenta? | grep | plik:linia |\n| SEC-12 |"),
    }),
    slad: /AGENT\.md NIE MA pozycji SEC-13/,
  },
  {
    opis: "pozycja dopisana TYLKO do AGENT.md — agent pyta o coś spoza zakresu",
    wykonaj: () => zPodmienionymi({
      "audyt/role/SEC/AGENT.md": (s) => s.replace("| SEC-12 |", "| SEC-14 | Pytanie spoza ROLE.md | grep | plik:linia |\n| SEC-12 |"),
    }),
    slad: /ma pozycje spoza ROLE\.md — SEC-14/,
  },
  {
    opis: "KONTRPRZYKŁAD: pozycja dopisana do OBU plików NIE może zapalać strażnika",
    oczekujCzerwonego: false,
    wykonaj: () => zPodmienionymi({
      "audyt/ROLE.md": (s) => s.replace("| SEC-12 |", "| SEC-13 | Czy pozycja dojechała do agenta? | grep | plik:linia |\n| SEC-12 |"),
      "audyt/role/SEC/AGENT.md": (s) => s.replace("| SEC-12 |", "| SEC-13 | Czy pozycja dojechała do agenta? | grep | plik:linia |\n| SEC-12 |"),
    }),
  },
  {
    opis: "odsyłacz względny w definicji roli — martwy po skopiowaniu do .claude/agents",
    wykonaj: () => zPodmienionymi({
      "audyt/role/SEC/AGENT.md": (s) => s.replace("## Checklista", "Patrz [tabela granic](../../GRANICE.md).\n\n## Checklista"),
    }),
    slad: /nie wskazuje niczego z \.claude\/agents/,
  },
  {
    opis: "rola opisana w ROLE.md bez katalogu w audyt/role — agent bez definicji",
    wykonaj: () => {
      const kat = join(SEKTOR, "role", "WER");
      const kopia = join(SEKTOR, "_rola-odlozona-na-czas-mutacji");
      renameSync(kat, kopia);
      try {
        spawnSync("node", ["audyt/tools/generuj-agentow.mjs"], { cwd: KORZEN, stdio: "pipe" });
        return straznikCzerwony();
      } finally {
        renameSync(kopia, kat);
        spawnSync("node", ["audyt/tools/generuj-agentow.mjs"], { cwd: KORZEN, stdio: "pipe" });
      }
    },
    slad: /brakuje 1 ról z ROLE\.md: WER/,
  },
  {
    opis: "KONTRPRZYKŁAD: rola próbna z NIETKNIĘTYCH szablonów NIE może zapalać strażnika",
    wykonaj: () => rolaZSzablonu(),
    oczekujCzerwonego: false,
  },
];

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

  for (const m of MUTACJE_ROLI) {
    const oczekujCzerwonego = m.oczekujCzerwonego !== false;
    const { czerwony, wyjscie } = m.wykonaj();
    if (oczekujCzerwonego && !czerwony) {
      process.stdout.write(`  ✗ PRZEPUŚCIŁ: ${m.opis}\n`);
      przeoczone++;
    } else if (!oczekujCzerwonego && czerwony) {
      process.stdout.write(`  ✗ FAŁSZYWY ALARM: ${m.opis}\n      ${wyjscie.split("\n").filter(Boolean).slice(1, 4).join("\n      ")}\n`);
      zle++;
    } else if (oczekujCzerwonego && m.slad && !m.slad.test(wyjscie)) {
      process.stdout.write(`  ✗ ZŁY ŚLAD: ${m.opis}\n      zapaliło się coś innego niż ${m.slad}\n`);
      zle++;
    } else {
      process.stdout.write(`  ✓ ${oczekujCzerwonego ? "złapane" : "przepuszczone słusznie"}: ${m.opis}\n`);
    }
  }

  const z = mutacjaZgloszenia();
  if (!z.czerwony) { process.stdout.write("  ✗ PRZEPUŚCIŁ: zgłoszenie bez dowodu, miejsca i hasha\n"); przeoczone++; }
  else if (!z.trafiony) { process.stdout.write("  ✗ ZŁY ŚLAD: zgłoszenie-śmieć zapaliło inną regułę\n"); zle++; }
  else process.stdout.write("  ✓ złapane: zgłoszenie bez dowodu, miejsca i hasha\n");
} finally {
  for (const [plik, tresc] of kopie) writeFileSync(P(plik), tresc, "utf8");
  rmSync(SMIEC, { force: true });
}

const razem = MUTACJE.length + MUTACJE_ROLI.length + 1;
process.stdout.write(`\nMutacje sektora: ${razem}, przeoczone: ${przeoczone}, martwe/złe: ${zle + martwe}\n`);

// Po przywróceniu strażnik MUSI wrócić do zieleni — inaczej przebieg coś zostawił.
const koniec = straznikCzerwony();
if (koniec.czerwony) {
  process.stdout.write("\nPo przywróceniu strażnik jest CZERWONY — przebieg zostawił po sobie zmianę.\n" + koniec.wyjscie);
  process.exit(1);
}

process.exit(przeoczone + zle + martwe === 0 ? 0 : 1);
