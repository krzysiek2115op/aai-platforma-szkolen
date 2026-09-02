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
 * POLE `wymaga` — mutacja, dla której na tej gałęzi NIE MA MATERIAŁU (np. reguła
 * dotycząca `re-audyt/ROLE.md`, gdy gałąź audytu tego pliku nie ma), jest
 * POMIJANA I POLICZONA, nigdy cicho zielona. Bez tego mutacja bez materiału
 * meldowałaby fałszywe „PRZEPUŚCIŁ" — czyli zaszumiałaby bramkę, zamiast
 * powiedzieć, że nie miała czego zmierzyć. Wzorzec z audytu projektu (0.35.0).
 *
 * KOPIA ZAPASOWA POWSTAJE RAZ, PRZED PIERWSZĄ MUTACJĄ. Kopia robiona w kolejnej
 * turze jest już kopią wersji ZMUTOWANEJ — ta pułapka zabrała czas dwa razy
 * w jednej sesji przeglądu T3. Przywracanie idzie przez `finally`.
 *
 * Użycie: node audyt/tools/audyt-straznika-sektora.mjs
 *         node audyt/tools/audyt-straznika-sektora.mjs --tylko=<regex>   # przebieg celowany, nie dowód
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { KOD_PROBNY, KORZEN, SEKTOR, ZGLOSZENIA, hashMiejsca } from "./wspolne.mjs";

/**
 * BRAMKA GŁÓWNEGO MODUŁU (dopisana 2026-09-02, pozycja 4a). Do tej pory SAM IMPORT
 * tego pliku uruchamiał cały audyt mutacyjny — `node -e "import('…')"` odpalony
 * na próbę mutował pliki sektora przez kilkanaście minut w tle, a strażnik
 * uruchamiany w tym czasie ręcznie „pokazywał" regresje, których nie było.
 * Wzorzec odporny na spację w nazwie katalogu (BLAD-014), jak w pozostałych
 * narzędziach sektora.
 */
const GLOWNY_MODUL =
  Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (!GLOWNY_MODUL) {
  process.stdout.write("audyt-straznika-sektora.mjs uruchamia się wyłącznie jako główny moduł: node audyt/tools/audyt-straznika-sektora.mjs\n");
  process.exit(1);
}

const P = (s) => join(KORZEN, s);
const ROLE_MD = "audyt/ROLE.md";
const WSPOLNE = "audyt/tools/wspolne.mjs";
const ZGLOSZENIE = "audyt/tools/zgloszenie.mjs";
const MAPA = "audyt/tools/mapa.mjs";
const WERDYKT = "audyt/tools/werdykt.mjs";
const STATUS = "audyt/tools/status.mjs";
const STRAZNIK = "audyt/tools/straznik-sektora-audytu.mjs";
/** Plik podkładany POZA `audyt/` na czas mutacji niezmiennika sektora. */
const SMIEC_RE = join(KORZEN, "re-audyt", "PROBA-NIEZMIENNIKA.md");
/** Czy katalog `re-audyt/` istniał PRZED mutacją — decyduje, czy wolno go usunąć. */
let katalogReByl = false;
const SMIEC_STAN = join(SEKTOR, "stan", "audyt-f2-PROBA.json");

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
/**
 * NUMER LINII DOBREGO BLOKU GOLDENA — czytany z treści, nie wpisany w mutację.
 * Zmierzone 2026-09-02: cztery mutacje goldenów miały literał `"linia": 471`
 * (ówczesny numer linii w REGULAMIN.md); po dopisaniu trzech wierszy do
 * regulaminu szablon goldena wskazywał 474, a mutacje trafiały w BLOK NEGATYWNY
 * o tym samym starym numerze — nic nie psuły i meldowały „PRZEPUŚCIŁ". Mutacja
 * przypięta do WARTOŚCI umiera po zmianie wartości (lekcja z 0.35.0).
 */
const liniaDobregoBloku = (golden) => Number(golden.match(/"linia":\s*(\d+),/)[1]);
const przesunLinie = (golden) => golden.replace(/"linia":\s*(\d+),/, (_, n) => `"linia": ${Number(n) + 1},`);

function rolaZSzablonu({ pomin = [], mutuj = {}, kod = KOD_PROBNY } = {}) {
  const SZABLONY = join(SEKTOR, "szablony");
  const PROBNA = join(SEKTOR, "role", kod);
  mkdirSync(join(PROBNA, "goldeny"), { recursive: true });
  try {
    for (const nazwa of ["AGENT.md", "KRYTYK.md", "SKILL.md"]) {
      if (pomin.includes(nazwa)) continue;
      let tresc = readFileSync(join(SZABLONY, nazwa), "utf8")
        .replaceAll("<KOD>", kod).replaceAll("<NAZWA ROLI>", "Próba").replaceAll("<PREFIKS>", "AUD");
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

/* ── mutacje rozszerzenia na RE-AUDYT (E7.1) ──────────────────────────────
   Trzy rzeczy, które przy wspólnym katalogu zgłoszeń i wspólnych kodach
   działów psują się CICHO, więc każda musi mieć własną mutację. */
MUTACJE.push(
  {
    opis: "re-audyt dostaje prefiks ID audytu — zgłoszenie NADPISUJE cudzy wpis",
    plik: WSPOLNE,
    slad: /zgloszenie\.mjs --test/,
    zmien: (s) => s.replace(
      'export const PREFIKS_ID = { audyt: "AUD", "re-audyt": "REA" };',
      'export const PREFIKS_ID = { audyt: "AUD", "re-audyt": "AUD" };'
    ),
  },
  {
    opis: "dział sprawdzany wobec SUMY obu sektorów — rola nieistniejąca w sektorze zgłasza",
    plik: WSPOLNE,
    slad: /zgloszenie\.mjs --test/,
    zmien: (s) => s.replace(
      `  return sektor === "re-audyt"
    ? [...DZIALY, ...PROCESOWE_WSPOLNE, ...PROCESOWE_RE]
    : [...DZIALY, ...PROCESOWE];`,
      "  return [...DZIALY, ...PROCESOWE, ...PROCESOWE_RE];"
    ),
  },
  {
    /* NIEZMIENNIK SEKTORA. Mutacja zdejmuje drugie wykluczenie i JEDNOCZEŚNIE
       podkłada plik w `re-audyt/` — bez tego pliku warunek w ogóle nie
       powstaje i mutacja byłaby MARTWA (ta sama pułapka co „pusty zakres"
       z E4: mutacja, która nie tworzy warunku, jaki deklaruje, daje fałszywą
       pewność). Plik jest NIEŚLEDZONY, więc łapie go gałąź `git status`. */
    opis: "niezmiennik przestaje wykluczać re-audyt/ — bramka świeci na własnej pracy",
    plik: STRAZNIK,
    slad: /niezacommitowane zmiany poza/,
    zmien: (s) => s.replace(
      `sh("git status --porcelain -- . ':!audyt' ':!re-audyt' ':!.claude'")`,
      `sh("git status --porcelain -- . ':!audyt' ':!.claude'")`
    ),
    przed: () => {
      // SPRZĄTAMY WYŁĄCZNIE TO, CO SAMI ZAŁOŻYLIŚMY. Pierwsza wersja kasowała
      // katalog `re-audyt/` rekurencyjnie „po sobie" i skasowała PRACĘ SEKTORA
      // RE-AUDYTU — dwa niezacommitowane dokumenty. To znana klasa z tego
      // repozytorium: bramka sprzątająca CUDZE dane. Zapamiętujemy, czy katalog
      // istniał PRZED nami, i usuwamy go tylko wtedy, gdy sami go zrobiliśmy.
      katalogReByl = existsSync(join(KORZEN, "re-audyt"));
      mkdirSync(join(KORZEN, "re-audyt"), { recursive: true });
      writeFileSync(SMIEC_RE, "plik podkładany na czas jednej mutacji\n", "utf8");
    },
    po: () => {
      rmSync(SMIEC_RE, { force: true });
      if (!katalogReByl) rmSync(join(KORZEN, "re-audyt"), { recursive: true, force: true });
    },
  },
);

/* ── MUTACJE PRZEZ ROLĘ PRÓBNĄ ─────────────────────────────────────────────
   Reguł 10, 11 i 12 nie da się sprawdzić mutacją pliku produkcyjnego: dotyczą
   katalogu `audyt/role/`, który w trakcie budowy bywa pusty, a po budowie
   zawiera pracę, której audyt nie ma prawa psuć. Mutujemy więc SZABLON albo
   sposób budowy roli próbnej i pytamy, czy strażnik to złapie.

   Każda mutacja ma `slad` — tak jak `oczekiwanySlad` w audycie projektu od
   0.47.0. Bez niego mutacja łamiąca dwie reguły naraz maskuje jedną z nich
   i wygląda to na sukces. */
/* ── mutacje nośnika werdyktów (reguły 15 i 16, dołożone przy E6) ────────── */
MUTACJE.push(
  {
    opis: "bramka werdyktów przestaje wymagać powodu przy odrzuceniu (odrzucenie staje się ciszą)",
    plik: WERDYKT,
    slad: /werdykt\.mjs --test/,
    zmien: (s) => s.replace(
      "if (ODMOWNE.includes(werdykt) && znormalizuj(powod ?? \"\").length < 20) {",
      "if (false) {"
    ),
  },
  {
    opis: "bramka werdyktów pozwala NADPISAĆ cudzy werdykt (fala 2 dostaje poprawiony wpis)",
    plik: WERDYKT,
    slad: /werdykt\.mjs --test/,
    zmien: (s) => s.replace("if (dotychczas[kto]) {", "if (false) {"),
  },
  {
    opis: "komplet werdyktów przestaje wymagać OBU ról (sam krytyk domyka wpis)",
    plik: WERDYKT,
    slad: /werdykt\.mjs --test/,
    zmien: (s) => s.replace("return Boolean(w.krytyk && w.weryfikator);", "return Boolean(w.krytyk || w.weryfikator);"),
  },
  {
    opis: "status.mjs przestaje sprawdzać, czy niedomknięta pozycja jest KODEM (komentarz staje się pozycją)",
    plik: STATUS,
    slad: /nie jest kodem pozycji/,
    zmien: (s) => s.replace("const zle = czesci.filter((c) => !KOD_POZYCJI.test(c));", "const zle = [];"),
    // Mutacja psuje NARZĘDZIE, więc regułę 17 zapala dopiero wpis, który
    // narzędzie teraz przepuści — stąd plik stanu podłożony na czas pomiaru.
    przed: () => {
      mkdirSync(join(SEKTOR, "stan"), { recursive: true });
      writeFileSync(SMIEC_STAN, JSON.stringify(atrapaStanu({ niedomkniete: ["PIK-01 (nie zdążyłem)"] }), null, 2));
    },
    po: () => rmSync(SMIEC_STAN, { force: true }),
  },
  {
    opis: "bramka zgłoszeń przestaje odrzucać ZNACZNIK PRÓBY dopisany do treści wpisu",
    plik: ZGLOSZENIE,
    slad: /zgloszenie\.mjs --test/,
    zmien: (s) => s.replace("if (z.proba !== undefined) {", "if (false) {"),
  },
);

/* ── mutacje porównania fal (K4″, pakiet E7.7 pozycja 2, 2026-09-02) ─────────
   Strażnik nie uruchamia `porownaj-cykle.mjs` na prawdziwych danych (wymaga
   dwóch fal), więc regresje tego narzędzia widać wyłącznie przez jego
   samokontrolę na ATRAPACH dwóch fal (reguła 25). Każda z tych mutacji psuje
   jedno rozstrzygnięcie właściciela i pyta, czy samokontrola to zauważy. */
const POROWNAJ = "audyt/tools/porownaj-cykle.mjs";
MUTACJE.push(
  {
    opis: "porównanie fal przestaje odróżniać NADZBIÓR od SPRZECZNE (każdy rozjazd = sprzeczność)",
    plik: POROWNAJ,
    slad: /porownaj-cykle\.mjs --test/,
    zmien: (s) => s.replace(
      'else if (innyStan.length || (tylkoW1.length && tylkoW2.length)) wynik = "SPRZECZNE";',
      'else if (true) wynik = "SPRZECZNE";'
    ),
  },
  {
    opis: "porównanie fal przestaje patrzeć na werdykty — POTWIERDZONE i ODRZUCONE wychodzą „zgodne\"",
    plik: POROWNAJ,
    slad: /porownaj-cykle\.mjs --test/,
    zmien: (s) => s.replace(
      'if (!krytyk || !weryfikator) return "BEZ WERDYKTU";',
      'return "BEZ WERDYKTU";'
    ),
  },
  {
    opis: "rozjazd fal wraca do kodu 1 (powrót K4′: SPRZECZNE = STOP zamiast lektury)",
    plik: POROWNAJ,
    slad: /porownaj-cykle\.mjs --test/,
    zmien: (s) => s.replace(
      "export function kodWyjscia({ podejrzane }, obieFale) {",
      'export function kodWyjscia({ podejrzane, wynik }, obieFale) {\n  if (wynik !== "ZGODNE") return 1;'
    ),
  },
  {
    opis: "podejrzenie kopiowania przestaje dawać kod 1 — ślepota fali 2 traci trzecią warstwę",
    plik: POROWNAJ,
    slad: /porownaj-cykle\.mjs --test/,
    zmien: (s) => s.replace("if (podejrzane > 0) return 1;", "if (false) return 1;"),
  },
  {
    opis: "NADZBIÓR przestaje mówić, KTÓRA fala jest większa (zawsze „fala 2\")",
    plik: POROWNAJ,
    slad: /porownaj-cykle\.mjs --test/,
    zmien: (s) => s.replace(
      'const wieksza = wynik === "NADZBIÓR" ? (tylkoW2.length ? 2 : 1) : null;',
      'const wieksza = wynik === "NADZBIÓR" ? 2 : null;'
    ),
  },
  {
    opis: "--dzial= przestaje filtrować — porównanie działu liczy cały sektor",
    plik: POROWNAJ,
    slad: /porownaj-cykle\.mjs --test/,
    zmien: (s) => s.replace(
      "const wDziale = dzial ? wszystkie.filter((z) => z.dzial === dzial) : wszystkie;",
      "const wDziale = wszystkie;"
    ),
  },
);

/* ── mutacje stanu ról (pakiet E7.7, pozycja 3, 2026-09-02) ──────────────────
   `status.mjs` dostał cztery odmowy i dziennik wejść. Strażnik nie ma na czym
   ich zmierzyć naprawdę (plik stanu powstaje dopiero w fali), więc regresje
   narzędzia widać wyłącznie przez jego samokontrolę na ATRAPACH (reguła 26).
   Każda z tych mutacji psuje jedno rozstrzygnięcie właściciela. */
MUTACJE.push(
  {
    opis: "status.mjs przyjmuje falę spoza {1,2} — --fala=3 tworzy audyt-f3-SEC.json po cichu",
    plik: STATUS,
    slad: /status\.mjs --test/,
    zmien: (s) => s.replace("  if (!FALE.includes(fala)) {", "  if (false) {"),
  },
  {
    opis: "status.mjs wpuszcza Pogłębiacza do działu, którego audyt nie jest ZAKOŃCZONE (W5)",
    plik: STATUS,
    slad: /status\.mjs --test/,
    zmien: (s) => s.replace("    if (!audyt || audyt.status !== ZAKONCZONE) {", "    if (false) {"),
  },
  {
    opis: "status.mjs pozwala cofnąć ZAKOŃCZONE działu, do którego Pogłębiacz już wszedł",
    plik: STATUS,
    slad: /status\.mjs --test/,
    zmien: (s) => s.replace("    if (wszedl(re)) {", "    if (false) {"),
  },
  {
    opis: "status.mjs pisze stan BEZ migawki przed.json (nie ma wobec czego mierzyć W2)",
    plik: STATUS,
    slad: /status\.mjs --test/,
    zmien: (s) => s.replace("  if (!migawka) {\n    return [", "  if (false) {\n    return ["),
  },
  {
    opis: "status.mjs nie odmawia przy różnicy drzewa produktu wobec glowa_main z migawki",
    plik: STATUS,
    slad: /status\.mjs --test/,
    zmien: (s) => s.replace("  if (zmienione.length || brudne.length) {", "  if (false) {"),
  },
  {
    opis: "status.mjs liczy .claude/ jako różnicę drzewa — fałszywa odmowa na własnym generacie",
    plik: STATUS,
    slad: /status\.mjs --test/,
    zmien: (s) => s.replace("const POZA_PRODUKTEM = /^(audyt|re-audyt|\\.claude)\\//;", "const POZA_PRODUKTEM = /^(audyt|re-audyt)\\//;"),
  },
  {
    opis: "status.mjs przestaje dopisywać historię przejść — KIER-05 traci dziennik wejść",
    plik: STATUS,
    slad: /status\.mjs --test/,
    zmien: (s) => s.replace(
      "  stan.historia = [...(stan.historia ?? []), { status: stan.status, runda: stan.runda, kiedy: teraz }];",
      "  stan.historia = stan.historia ?? [];"
    ),
  },
  {
    opis: "KONTRPRZYKŁAD: inne brzmienie komunikatu odmowy (ta sama komenda naprawy) NIE zapala samokontroli",
    plik: STATUS,
    oczekujCzerwonego: false,
    zmien: (s) => s.replace("Naprawa (kierownik, przed pierwszą falą):", "Naprawa (kierownik, zanim ruszy fala 1):"),
  },
);

/* ── mutacje pozycji 4a pakietu E7.7 (2026-09-02): ślepota fali 2 ────────────
   Cztery warstwy ślepoty (STRUKTURA.md, „Kolejność sektorów"); tu warstwy 2–4
   i nośnik w gicie. Każda mutacja psuje JEDNO rozstrzygnięcie właściciela
   i pyta, czy samokontrola narzędzia albo reguła strażnika to zauważy. */
const FALA = "audyt/tools/fala.mjs";
const GITIGNORE_SEKTORA = "audyt/.gitignore";
MUTACJE.push(
  {
    opis: "zgloszenie.mjs wraca do drukowania liczby wpisów po zapisie — licznik zdradza fali 2 wynik fali 1 (F3)",
    plik: ZGLOSZENIE,
    slad: /zgloszenie\.mjs --test/,
    zmien: (s) => s.replace(
      "process.stdout.write(`Przyjęte: ${id}\\n  hash miejsca: ${gotowe.hash.slice(0, 16)}…\\n`);",
      "process.stdout.write(`Przyjęte: ${id}\\n  hash miejsca: ${gotowe.hash.slice(0, 16)}…\\n  zgłoszeń w sektorze: ${readdirSync(KATALOG_ZGLOSZEN).length}\\n`);"
    ),
  },
  {
    opis: "identyfikator bez fali w nazwie (powrót do AUD-SEC-001) — numer ciągły w dziale zdradza liczbę wpisów fali 1",
    plik: ZGLOSZENIE,
    slad: /zgloszenie\.mjs --test/,
    zmien: (s) => s.replace("const poczatek = `${prefiks}-${dzial}-F${fala}-`;", "const poczatek = `${prefiks}-${dzial}-`;"),
  },
  {
    opis: "pula numerów WSPÓLNA dla obu fal — fala 2 zaczyna od numeru za ostatnim wpisem fali 1",
    plik: ZGLOSZENIE,
    slad: /zgloszenie\.mjs --test/,
    zmien: (s) => s.replace(
      "    .filter((f) => f.startsWith(poczatek))\n    .map((f) => Number(f.match(/-(\\d+)\\.json$/)?.[1] ?? 0));",
      "    .filter((f) => f.startsWith(`${prefiks}-${dzial}-`))\n    .map((f) => Number(f.match(/-(\\d+)\\.json$/)?.[1] ?? 0));"
    ),
  },
  {
    opis: "status.mjs wpuszcza falę 2 do działu przy wpisie z polem fala: 1 w drzewie (izolacja po POLU znika)",
    plik: STATUS,
    slad: /status\.mjs --test/,
    zmien: (s) => s.replace("    if (wpisowF1 || stanowF1) {", "    if (false) {"),
  },
  {
    opis: "status.mjs zwalnia z izolacji KAŻDĄ rolę procesową, nie tylko KIER i RAP (Konrad fali 2 czyta falę 1)",
    plik: STATUS,
    slad: /status\.mjs --test/,
    zmien: (s) => s.replace('export const WOLNE_OD_IZOLACJI = ["KIER", "RAP"];', 'export const WOLNE_OD_IZOLACJI = ["KIER", "RAP", "KON", "GOLD", "WER", "PSIARZ", "SKUT", "STRAZ", "WALID"];'),
  },
  {
    opis: "KONTRPRZYKŁAD: inne brzmienie komunikatu odmowy izolacji (ta sama komenda naprawy) NIE zapala samokontroli",
    plik: STATUS,
    oczekujCzerwonego: false,
    zmien: (s) => s.replace("Agent fali 2 ma NIE WIDZIEĆ wyników fali 1", "Agent fali 2 nie może widzieć wyników fali 1"),
  },
  {
    opis: "porownaj-cykle przestaje nazywać PODEJRZENIE KOLEJNOŚCI — czwarta warstwa ślepoty fali 2 znika",
    plik: POROWNAJ,
    slad: /porownaj-cykle\.mjs --test/,
    zmien: (s) => s.replace("    return k1.length >= 2 && k1.length === k2.length && k1.every((h, i) => h === k2[i]);", "    return false;"),
  },
  {
    opis: "podejrzenie kolejności zaczyna dawać kod 1 (wbrew rozstrzygnięciu 5: sygnał, nie STOP)",
    plik: POROWNAJ,
    slad: /porownaj-cykle\.mjs --test/,
    zmien: (s) => s.replace(
      "export function kodWyjscia({ podejrzane }, obieFale) {",
      "export function kodWyjscia({ podejrzane, podejrzenie_kolejnosci }, obieFale) {\n  if (podejrzenie_kolejnosci?.length) return 1;"
    ),
  },
  {
    opis: "KONTRPRZYKŁAD: inne brzmienie zdania po dwukropku w PODEJRZENIU KOLEJNOŚCI NIE zapala samokontroli",
    plik: POROWNAJ,
    oczekujCzerwonego: false,
    zmien: (s) => s.replace("identyczny zbiór miejsc zgłoszony w obu falach w TEJ SAMEJ kolejności.", "ten sam zbiór miejsc w tym samym porządku zgłaszania."),
  },
  {
    /* Worktree BEZ wykluczeń „działa" w lekturze dokumentacji: powstaje, ma
       gałąź, generat i migawkę — tylko wpisy fali 1 leżą na jego dysku. */
    opis: "fala.mjs stawia worktree bez wykluczeń — wpisy fali 1 leżą na dysku fali 2",
    plik: FALA,
    slad: /fala\.mjs --test/,
    zmien: (s) => s.replace(
      '  return ["/*", `!/audyt/zgloszenia/*-F${inna}-*`, `!/audyt/stan/*-f${inna}-*`, "!/audyt/wyniki/*"];',
      '  return ["/*"];'
    ),
  },
  {
    opis: "fala.mjs scala niezacommitowany worktree — stan fali 2 zostaje poza merge'em i znika z worktree",
    plik: FALA,
    slad: /fala\.mjs --test/,
    zmien: (s) => s.replace("  if (bW.length) {", "  if (false) {"),
  },
  {
    opis: "stan/ wraca do .gitignore sektora — stan fali 2 z worktree nie wróciłby do drzewa (rozstrzygnięcie 4)",
    plik: GITIGNORE_SEKTORA,
    slad: /IGNOROWANY przez gita/,
    zmien: (s) => s + "stan/\n",
  },
);

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
    wykonaj: () => rolaZSzablonu({ mutuj: { "golden.md": przesunLinie } }),
    slad: /miał przejść, a bramka odrzuca/,
  },
  {
    opis: "zły przykład goldena przestaje być zły (bramka go przyjmuje)",
    wykonaj: () => rolaZSzablonu({ mutuj: { "golden.md": (s) => s
      .replace('"stwierdzenie": "Wydaje mi się, że tutaj może być problem z walidacją danych wejściowych."',
               '"stwierdzenie": "Zapytanie skleja wartość z żądania bez prepare, więc wejście trafia do SQL."')
      .replace('"linia": 99999,\n    "tresc": "coś takiego tam było"',
               `"linia": ${liniaDobregoBloku(s)},\n    "tresc": "Egzekwowane maszynowo: narzędzie zgłoszeń **odmawia zapisu** wpisu bez dowodu."`) } }),
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
    slad: /nie odpowiada żadnej roli z \S*ROLE\.md/,
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
    slad: /brakuje 1 ról z ROLE\.md .* WER/,
  },
  {
    opis: "wpis ma status ZWERYFIKOWANE, a nie ma ani jednego werdyktu",
    wykonaj: () => mutacjaWpisu({ status: "ZWERYFIKOWANE" }),
    slad: /status ZWERYFIKOWANE bez kompletu werdyktów/,
  },
  {
    opis: "wpis ma OBA werdykty, a utknął na DO WERYFIKACJI (kierownik szuka werdyktu, który już jest)",
    wykonaj: () => mutacjaWpisu({ status: "DO WERYFIKACJI", werdykt: { krytyk: PRZEPUSZCZA, weryfikator: ISTNIEJE } }),
    slad: /utknął przed ZWERYFIKOWANE/,
  },
  {
    opis: "werdykt odmowny BEZ powodu — odrzucenie staje się ciszą",
    wykonaj: () => mutacjaWpisu({ werdykt: { krytyk: { werdykt: "ODRZUCAM", powod: "", kiedy: "2026-09-01T00:00:00.000Z" } } }),
    slad: /bez powodu/,
  },
  {
    opis: "werdykt wydany przez rolę spoza dwóch uprawnionych",
    wykonaj: () => mutacjaWpisu({ werdykt: { kierownik: PRZEPUSZCZA } }),
    slad: /nieznana rola/,
  },
  {
    opis: "ZNACZNIK PRÓBY bez nazwanego etapu — wpis wypada z porównania fal po cichu",
    wykonaj: () => mutacjaWpisu({ proba: "  " }),
    slad: /znacznik próby musi NAZWAĆ etap/,
  },
  {
    opis: "KONTRPRZYKŁAD: wpis próbny Z nazwanym etapem i kompletem werdyktów NIE może zapalać strażnika",
    wykonaj: () => mutacjaWpisu({ proba: "E6", status: "ZWERYFIKOWANE", werdykt: { krytyk: PRZEPUSZCZA, weryfikator: ISTNIEJE } }),
    oczekujCzerwonego: false,
  },
  {
    opis: "z KRYTYK.md znika droga zgłaszania, a nakaz zgłaszania zostaje (znalezisko krytyka ginie z sesją)",
    wykonaj: () => rolaZSzablonu({ mutuj: { "KRYTYK.md": (s) => s.replace(/node audyt\/tools\/zgloszenie\.mjs --plik=<wpis\.json>/, "opisz je w swojej odpowiedzi") } }),
    slad: /nie podaje drogi/,
  },
  {
    opis: "KONTRPRZYKŁAD: KRYTYK.md BEZ nakazu zgłaszania i BEZ drogi NIE może zapalać strażnika",
    wykonaj: () => rolaZSzablonu({ mutuj: { "KRYTYK.md": (s) => s
      .replace(/zgłoś ją jako swoje znalezisko/g, "odnotuj to w werdykcie")
      .replace(/node audyt\/tools\/zgloszenie\.mjs --plik=<wpis\.json>/, "opisz je w swojej odpowiedzi") } }),
    oczekujCzerwonego: false,
  },
  {
    opis: "w stanie roli niedomknięta pozycja jest PROZĄ, nie kodem — kierownik liczy złą liczbę otwartych",
    wykonaj: () => mutacjaStanu({ niedomkniete: ["PIK-02", "zgodnie z zakresem próby"] }),
    slad: /nie jest kodem pozycji/,
  },
  {
    opis: "rola ZAKOŃCZONE z licznikiem runda 0 — wygląda, jakby nie zrobiła nic",
    wykonaj: () => mutacjaStanu({ runda: 0 }),
    slad: /odbyła co najmniej jedną rundę/,
  },
  {
    opis: "KONTRPRZYKŁAD: stan z kodami pozycji i niezerową rundą NIE może zapalać strażnika",
    wykonaj: () => mutacjaStanu({}),
    oczekujCzerwonego: false,
  },
  {
    opis: "KONTRPRZYKŁAD: rola próbna z NIETKNIĘTYCH szablonów NIE może zapalać strażnika",
    wykonaj: () => rolaZSzablonu(),
    oczekujCzerwonego: false,
  },

  /* ── reguły 17 i 19 wobec DWÓCH SEKTORÓW (E7.1) ─────────────────────────
     Sektory dzielą katalog zgłoszeń i siedemnaście kodów działów, więc każdy
     z tych trzech stanów wygląda w dzienniku jak stan poprawny. */
  {
    opis: "wpis re-audytu z prefiksem AUDYTU — nazwa pliku zajęta przez cudzy sektor",
    wykonaj: () => mutacjaWpisu({ sektor: "re-audyt", dzial: "SEC", pozycja: "SEC-01" }),
    slad: /wymaga prefiksu "REA-"/,
  },
  {
    opis: "wpis audytu z działu, który istnieje wyłącznie w re-audycie",
    wykonaj: () => mutacjaWpisu({ id: "AUD-PSIARZ-F1-998", dzial: "PSIARZ", pozycja: "PSIARZ-02" }),
    slad: /dział "PSIARZ" nie istnieje w sektorze "audyt"/,
  },
  {
    opis: "KONTRPRZYKŁAD: poprawny wpis re-audytu (REA-, dział wspólny) NIE może zapalać strażnika",
    wykonaj: () => mutacjaWpisu({ id: "REA-SEC-F1-997", sektor: "re-audyt", dzial: "SEC", pozycja: "SEC-01" }),
    oczekujCzerwonego: false,
  },

  /* ── reguła 19′: fala w NAZWIE = POLE fala (pozycja 4a E7.7) ─────────────
     Sparse checkout worktree chowa wpisy po nazwie, `status.mjs` odmawia po
     polu — wpis, w którym nazwa i pole mówią co innego, oślepia jedną z warstw. */
  {
    opis: "wpis nazwany F1 z polem fala: 2 — nazwa i pole mówią co innego",
    wykonaj: () => mutacjaWpisu({ fala: 2 }),
    slad: /fala w nazwie \(F1\) ≠ pole fala \(2\)/,
  },
  {
    opis: "wpis w STARYM formacie bez fali w nazwie (AUD-WER-998) — sparse checkout by go nie schował",
    wykonaj: () => mutacjaWpisu({ id: "AUD-WER-998" }),
    slad: /bez fali w nazwie/,
  },
  {
    opis: "KONTRPRZYKŁAD: wpis fali 2 nazwany F2 NIE może zapalać strażnika",
    wykonaj: () => mutacjaWpisu({ id: "AUD-WER-F2-998", fala: 2 }),
    oczekujCzerwonego: false,
  },
  {
    opis: "stan roli, której w tym sektorze NIE MA — kierownik czeka na wynik roli-widma",
    wykonaj: () => mutacjaStanu({ sektor: "re-audyt", rola: "GOLD" }),
    slad: /nie istnieje w sektorze "re-audyt"/,
  },
  {
    /* REGRESJA ZNALEZIONA PRZEZ TĘ MUTACJĘ (E7.1): wzorzec kodu pozycji stał
       na `[A-Z]{2,5}` i odrzucał `PSIARZ-02` — sześć liter. Kontrprzykład
       zostaje, żeby sufit długości nie wrócił do liczby wpisanej ręcznie. */
    opis: "KONTRPRZYKŁAD: stan roli własnej re-audytu (PSIARZ) NIE może zapalać strażnika",
    wykonaj: () => mutacjaStanu({ sektor: "re-audyt", rola: "PSIARZ", niedomkniete: ["PSIARZ-02"] }),
    oczekujCzerwonego: false,
  },
  {
    /* DRUGA POŁOWA TEJ SAMEJ USTERKI, starsza: `KON-A5` to prawdziwa pozycja
       z `ROLE.md`, a Konrad jest rolą pętlową — czyli tą, która przy suficie
       rund MUSI wypisać niedomknięte. Stary wzorzec nie przyjmował ani jednej
       jego pozycji. */
    opis: "KONTRPRZYKŁAD: pozycja Konrada (KON-A5) jest kodem pozycji, nie prozą",
    wykonaj: () => mutacjaStanu({ rola: "KON", niedomkniete: ["KON-A5"] }),
    oczekujCzerwonego: false,
  },
  {
    /* REGUŁA 20. Zakres Pogłębiacza jest KOPIĄ zakresu jego działu w audycie,
       a kopia w tym repozytorium rozjeżdża się po cichu zawsze. Rozjazd znaczy,
       że re-audyt mierzy inny obszar, niż audyt zbadał — łączenie po haszu (W4)
       przestaje wtedy cokolwiek znaczyć, a nic tego nie widać. */
    opis: "zakres Pogłębiacza rozjeżdża się z zakresem jego działu w audycie",
    wymaga: "re-audyt/ROLE.md",
    slad: /zakres rozjechał się z działem/,
    wykonaj: () => zPodmienionymi({
      "re-audyt/ROLE.md": (s) => s.replace(
        "git ls-files -- 'docs/PLAN.md' 'docs/WYTYCZNE.md' 'CLAUDE.md' 'CHANGELOG.md'",
        "git ls-files -- 'docs/PLAN.md' 'docs/WYTYCZNE.md' 'CLAUDE.md'"
      ),
    }),
  },
  {
    /* KONTRPRZYKŁAD do reguły 20: porównanie ma pytać o KOMENDĘ, nie o jej
       łamanie w Markdownie. Bez tego reguła zapalałaby się na przeformatowaniu
       dokumentu — czyli byłaby nadwrażliwa i nikt by tego nie zauważył.

       ŁAMIEMY KONTYNUACJĄ POWŁOKI (`\` + nowa linia), nie surowym przełamem.
       Pierwsza wersja wstawiała gołą nową linię i rozbijała KOMENDĘ — zapalała
       więc mapę pokrycia, a nie regułę 20. Kontrprzykład, który psuje co
       innego, niż deklaruje, mierzy nie to co trzeba. */
    opis: "KONTRPRZYKŁAD: inne łamanie linii w zakresie Pogłębiacza NIE może zapalać reguły 20",
    wymaga: "re-audyt/ROLE.md",
    oczekujCzerwonego: false,
    wykonaj: () => zPodmienionymi({
      "re-audyt/ROLE.md": (s) => s.replace(
        "git ls-files -- 'docs/PLAN.md' 'docs/WYTYCZNE.md' 'CLAUDE.md' 'CHANGELOG.md'",
        "git ls-files -- 'docs/PLAN.md' 'docs/WYTYCZNE.md' \\\n  'CLAUDE.md' 'CHANGELOG.md'"
      ),
    }),
  },
  {
    /* Pozycje re-audytu noszą literę `R`. Gdyby wzorzec strażnika przyjmował
       wyłącznie `A` (forma Konrada), CAŁA checklista re-audytu byłaby dla
       reguły 7 niewidzialna — czyli 21 ról „bez pozycji" przy komplecie. */
    opis: "Pogłębiacz traci pozycje checklisty — nie ma czego wyczerpać",
    wymaga: "re-audyt/ROLE.md",
    slad: /pozycji checklisty — za ma[łl]o/,
    wykonaj: () => zPodmienionymi({
      "re-audyt/ROLE.md": (s) => s.replace(/^\| INT-R\d+ \|.*$/gm, ""),
    }),
  },

  {
    /* MAPA POKRYCIA MUSI WIDZIEĆ OBA SEKTORY. Dokumenty sektora RE-AUDYT bierze
       wyłącznie Konrad re-audytu — żaden zakres audytu ich nie obejmuje. Bez
       unii zakresów są SIEROTAMI: plikami, których nie czyta nikt. Zmierzone
       przy E7.4: mapa zgłosiła dokładnie dwa takie pliki. */
    opis: "mapa pokrycia przestaje czytać zakresy re-audytu — dokumenty sektora zostają sierotami",
    wymaga: "re-audyt/ROLE.md",
    slad: /mapa pokrycia zg[łl]asza sieroty/,
    wykonaj: () => zPodmienionymi({
      "audyt/tools/mapa.mjs": (s) => s.replace(
        "  for (const sektor of SEKTORY) {",
        '  for (const sektor of ["audyt"]) {'
      ),
    }),
  },
  {
    /* GENERAT-SIEROTA PO PRZEŁĄCZENIU GAŁĘZI. Zwykły przebieg generatora ma je
       USUWAĆ; gdyby przestał, na dysku zostawałby żywy agent bez definicji
       zakresu, a `--sprawdz` świeciłby na czerwono do ręcznego sprzątania. */
    opis: "generator przestaje usuwać generaty bez źródła (agent bez definicji zostaje w harnessie)",
    slad: /generat bez źródła/,
    wykonaj: () => {
      const sierota = join(KORZEN, ".claude", "agents", "rea-nieistniejaca.md");
      writeFileSync(sierota, "---\nname: rea-nieistniejaca\n---\n", "utf8");
      try {
        return straznikCzerwony();
      } finally {
        rmSync(sierota, { force: true });
        spawnSync("node", ["audyt/tools/generuj-agentow.mjs"], { cwd: KORZEN, stdio: "pipe" });
      }
    },
  },
  {
    /* Sam katalog `re-audyt/` z plikiem NIE jest naruszeniem niezmiennika —
       to jest praca sektora re-audytu. Bez tego kontrprzykładu reguła 1
       mogłaby być po prostu nadwrażliwa i nikt by tego nie zauważył. */
    opis: "KONTRPRZYKŁAD: plik w re-audyt/ NIE może zapalać niezmiennika sektora",
    oczekujCzerwonego: false,
    wykonaj: () => {
      const bylo = existsSync(join(KORZEN, "re-audyt"));
      mkdirSync(join(KORZEN, "re-audyt"), { recursive: true });
      writeFileSync(SMIEC_RE, "praca sektora re-audytu\n", "utf8");
      try {
        return straznikCzerwony();
      } finally {
        rmSync(SMIEC_RE, { force: true });
        if (!bylo) rmSync(join(KORZEN, "re-audyt"), { recursive: true, force: true });
      }
    },
  },
];

/* ── mutacje z przygotowania próby E7.6 (reguły 21 i 22) ───────────────────
   Obie usterki wyglądały na pracę wykonaną i żadna z 55 mutacji ich nie
   widziała: generat `rea-walid` na Sonnecie wbrew ROLE.md oraz 21 krytyków
   re-audytu wskazujących w module wpisy AUDYTU. */
MUTACJE_ROLI.push(
  {
    opis: "generator wraca do listy ról opusowych wpisanej ręcznie — WALID i kierownicy idą na Sonneta",
    slad: /przypisuje roli \w+ model/,
    wykonaj: () => zPodmienionymi({
      "audyt/tools/generuj-agentow.mjs": (s) => s.replace(
        "const model = modelRoli(sektor, kod, rodzaj);",
        'const model = rodzaj === "krytyk" ? "opus" : "sonnet";'
      ),
    }),
  },
  {
    /* ROLE.md zmienia model, a generatu NIKT NIE PRZEBUDOWAŁ. Reguła 4 tego
       nie widzi (sha256 źródła bez zmian) — dokładnie ta droga, którą WALID
       jechał na Sonnecie przez cały E7.5. Celowo BEZ regeneracji. */
    opis: "ROLE.md przestawia model roli, generat zostaje stary — sha256 źródła tego nie widzi",
    slad: /przypisuje roli WER model/,
    wykonaj: () => {
      const plik = P(ROLE_MD);
      const org = readFileSync(plik, "utf8");
      const nowa = org.replace("## WER — Audytor weryfikator  · **Opus**", "## WER — Audytor weryfikator  · **Sonnet**");
      if (nowa === org) return { czerwony: false, wyjscie: "MUTACJA NIC NIE ZMIENIŁA w audyt/ROLE.md" };
      writeFileSync(plik, nowa, "utf8");
      try { return straznikCzerwony(); } finally { writeFileSync(plik, org, "utf8"); }
    },
  },
  {
    opis: "KONTRPRZYKŁAD: inne odstępy w nagłówku roli NIE mogą zapalać reguły 21",
    oczekujCzerwonego: false,
    wykonaj: () => zPodmienionymi({
      [ROLE_MD]: (s) => s.replace("## RAP — Audytor raportu  · **Opus**", "## RAP — Audytor raportu · **Opus**"),
    }),
  },
  {
    opis: "szablon krytyka wskazuje zgłoszenia CUDZEGO sektora — prefiks wpisany na sztywno",
    slad: /krytyk oceniałby pracę cudzego sektora/,
    wykonaj: () => rolaZSzablonu({ mutuj: { "KRYTYK.md": (s) => s.replace("zgloszenia/AUD-PROBA-", "zgloszenia/REA-PROBA-") } }),
  },
  {
    opis: "KONTRPRZYKŁAD: wzmianka o wpisie drugiego sektora w KRYTYK.md NIE zapala reguły 22",
    oczekujCzerwonego: false,
    wykonaj: () => rolaZSzablonu({ mutuj: { "KRYTYK.md": (s) => s + "\nWpis `REA-PROBA-001` drugiego sektora łączy się z tym działem po haszu miejsca.\n" } }),
  },
);

/* ── mutacje trzeciego modelu (polecenie właściciela 2026-09-02) ──────────
   Kierownicy i Konradowie obu sektorów idą na Fable 5.1. Cztery drogi, którymi
   ta decyzja mogłaby PRZEPAŚĆ PO CICHU, plus jedna zmiana dozwolona. Pierwsza
   z nich (regresja tabeli w wspolne.mjs) była przed 2026-09-02 NIEWIDZIALNA:
   reguła 21 pytała tę samą funkcję, która produkuje generat. */
MUTACJE_ROLI.push(
  {
    /* Z REGENERACJĄ — bo tak wygląda prawdziwa droga: ktoś psuje tabelę,
       przebudowuje generat, generat zgadza się z zepsutą funkcją. */
    opis: "wspolne.mjs odwzorowuje Fable 5.1 na Sonneta, generat przebudowany — kierownik idzie na Sonneta z zieloną bramką",
    slad: /generat aud-kier\.md: model "sonnet", a audyt\/ROLE\.md przypisuje roli KIER model "fable"/,
    wykonaj: () => zPodmienionymi({
      [WSPOLNE]: (s) => s.replace('"Fable 5.1": "fable" }', '"Fable 5.1": "sonnet" }'),
    }),
  },
  {
    /* BEZ regeneracji — ta sama droga co WER wyżej, na trzecim modelu. */
    opis: "audyt/ROLE.md cofa KIER na Opusa, generat zostaje na Fable — sha256 źródła tego nie widzi",
    slad: /przypisuje roli KIER model "opus"/,
    wykonaj: () => {
      const plik = P(ROLE_MD);
      const org = readFileSync(plik, "utf8");
      const nowa = org.replace("## KIER — Audytor kierownik  · **Fable 5.1**", "## KIER — Audytor kierownik  · **Opus**");
      if (nowa === org) return { czerwony: false, wyjscie: "MUTACJA NIC NIE ZMIENIŁA w audyt/ROLE.md" };
      writeFileSync(plik, nowa, "utf8");
      try { return straznikCzerwony(); } finally { writeFileSync(plik, org, "utf8"); }
    },
  },
  {
    opis: "nagłówek roli z NIEZNANYM modelem (Fable 5.2) — dotąd spadłby po cichu na Sonneta",
    slad: /nieznany model "Fable 5\.2" w nagłówku roli KON/,
    wykonaj: () => zPodmienionymi({
      [ROLE_MD]: (s) => s.replace("## KON — Agent Konrad  · **Fable 5.1**", "## KON — Agent Konrad  · **Fable 5.2**"),
    }),
  },
  {
    opis: "generator pisze alias, którego harness nie zna (fable-5.1) — agent bez modelu albo na domyślnym",
    slad: /"model: fable-5\.1" jest nieznana harnessowi/,
    wykonaj: () => zPodmienionymi({
      "audyt/tools/generuj-agentow.mjs": (s) => s.replace(
        "`model: ${model}`,",
        "`model: ${model === \"fable\" ? \"fable-5.1\" : model}`,"
      ),
    }),
  },
  {
    opis: "re-audyt/ROLE.md cofa KON na Opusa, generat rea-kon zostaje na Fable",
    slad: /generat rea-kon\.md: model "fable", a re-audyt\/ROLE\.md przypisuje roli KON model "opus"/,
    wymaga: "re-audyt/ROLE.md",
    wykonaj: () => {
      const plik = P("re-audyt/ROLE.md");
      const org = readFileSync(plik, "utf8");
      const nowa = org.replace("## KON — Konrad re-audytu  · **Fable 5.1**", "## KON — Konrad re-audytu  · **Opus**");
      if (nowa === org) return { czerwony: false, wyjscie: "MUTACJA NIC NIE ZMIENIŁA w re-audyt/ROLE.md" };
      writeFileSync(plik, nowa, "utf8");
      try { return straznikCzerwony(); } finally { writeFileSync(plik, org, "utf8"); }
    },
  },
  {
    /* Przeoczenie wskazane przez sędziego (2026-09-02): nieznany model był
       zamknięty, BRAK znacznika nie — rola procesowa bez „· **Opus**" po
       regeneracji dawała generat i pomiar zgodne co do Sonneta. */
    opis: "rola procesowa GOLD traci znacznik modelu, generat przebudowany — dotąd cichy fallback na Sonneta z zieloną bramką",
    slad: /rola procesowa GOLD bez znacznika modelu/,
    wykonaj: () => zPodmienionymi({
      [ROLE_MD]: (s) => s.replace("## GOLD — Golden  · **Opus**", "## GOLD — Golden"),
    }),
  },
  {
    opis: "KONTRPRZYKŁAD: DZIAŁ bez znacznika modelu zostaje na Sonnecie (D8) i NIE zapala reguły 21",
    oczekujCzerwonego: false,
    wykonaj: () => zPodmienionymi({
      [ROLE_MD]: (s) => s.replace("## SEC — Security", "## SEC — Security  · **Sonnet**"),
    }),
  },
  {
    opis: "KONTRPRZYKŁAD: zmiana NAZWY roli w nagłówku (nie modelu) NIE zapala reguły 21",
    oczekujCzerwonego: false,
    wykonaj: () => zPodmienionymi({
      [ROLE_MD]: (s) => s.replace("## KIER — Audytor kierownik  · **Fable 5.1**", "## KIER — Kierownik audytu  · **Fable 5.1**"),
    }),
  },
);

/* ── mutacje klucza porównania (H1, rozstrzygnięcie właściciela 2026-09-02) ──
   Hash miejsca jest kluczem, po którym łączą się fale (K4') i sektory (W4).
   Regresja tej formuły nie ma ŻADNEGO objawu w miejscu, w którym powstaje —
   wychodzi dopiero jako "rozjazd fal" przy zgodnym wyniku audytu. */
MUTACJE_ROLI.push(
  {
    opis: "hash miejsca wraca do liczenia z NUMEREM LINII — przesunięty kod rozjeżdża fale przy identycznym znalezisku",
    slad: /nie zgadza się z przeliczonym z miejsca/,
    wykonaj: () => zPodmienionymi({
      [WSPOLNE]: (s) => s.replace(
        '? ["linia", m.plik, znormalizuj(m.tresc ?? "")]',
        '? ["linia", m.plik, String(m.linia), znormalizuj(m.tresc ?? "")]'
      ),
    }),
  },
  {
    opis: "hash miejsca przestaje brać TREŚĆ linii — dwa różne błędy w jednym pliku dostają ten sam klucz",
    slad: /nie zgadza się z przeliczonym z miejsca/,
    wykonaj: () => zPodmienionymi({
      [WSPOLNE]: (s) => s.replace(
        '? ["linia", m.plik, znormalizuj(m.tresc ?? "")]',
        '? ["linia", m.plik]'
      ),
    }),
  },
  {
    /* DOWÓD H1 OD DRUGIEJ STRONY: przesunięcie numeru linii w istniejącym wpisie
       nie może niczego zapalić, bo numer NIE jest już kluczem. Gdyby zapalało,
       znaczyłoby to, że numer wrócił do formuły tylnymi drzwiami. */
    opis: "KONTRPRZYKŁAD: przesunięty numer linii w zgłoszeniu NIE zmienia hasha (H1)",
    oczekujCzerwonego: false,
    wykonaj: () => {
      const plik = join(ZGLOSZENIA, "REA-SEC-001.json");
      if (!existsSync(plik)) return { czerwony: false, wyjscie: "brak wpisu próbnego — mutacja bez materiału" };
      const org = readFileSync(plik, "utf8");
      const wpis = JSON.parse(org);
      wpis.miejsce.linia = wpis.miejsce.linia + 1;
      writeFileSync(plik, JSON.stringify(wpis, null, 2) + "\n", "utf8");
      try { return straznikCzerwony(); } finally { writeFileSync(plik, org, "utf8"); }
    },
  },
);

MUTACJE_ROLI.push(
  {
    /* Ta sama droga, którą szablon zgnił naprawdę: ktoś przesuwa linię
       w REGULAMIN.md, przykład DOBRY przestaje wskazywać swoją treść. */
    opis: "szablon goldena wskazuje linię obok — dobry przykład przestaje przechodzić przez bramkę",
    slad: /szablony\/golden\.md blok \d+: miał przejść/,
    wykonaj: () => zPodmienionymi({
      "audyt/szablony/golden.md": przesunLinie,
    }),
  },
  {
    opis: "zły przykład w SZABLONIE goldena przestaje być zły (bramka go przyjmuje)",
    slad: /szablony\/golden\.md blok \d+: miał zostać odrzucony/,
    wykonaj: () => zPodmienionymi({
      "audyt/szablony/golden.md": (s) => s.replace(
        '"tresc": "Egzekwowane maszynowo: narzędzie zgłoszeń odmawia zapisu wpisu bez dowodu i bez miejsca."',
        '"tresc": "Egzekwowane maszynowo: narzędzie zgłoszeń **odmawia zapisu** wpisu bez dowodu."'
      ),
    }),
  },
);

/* ── stany PODŁOŻONE: reguła 17 pilnuje zawartości plików, nie narzędzia ───
   Plik dopisany ręcznie omija `status.mjs`; te mutacje sprawdzają, że strażnik
   widzi to samo, co narzędzie odmawia. Czasy T[0] < T[1] < … są atrapami. */
MUTACJE_ROLI.push(
  {
    opis: "Pogłębiacz PIK wszedł, a dział PIK audytu tej fali NIE MA pliku stanu (re-audyt przed wyjściem audytu)",
    wykonaj: () => mutacjaStanu({ sektor: "re-audyt", status: "W TRAKCIE" }),
    slad: /przed wyjściem audytu/,
  },
  {
    opis: "Pogłębiacz PIK wszedł, a dział PIK audytu jest dopiero W TRAKCIE",
    wykonaj: () => mutacjaStanu({ sektor: "re-audyt", status: "W TRAKCIE", kiedy: T[2] }, { status: "W TRAKCIE", kiedy: T[1] }),
    slad: /przed wyjściem audytu/,
  },
  {
    opis: "dział PIK audytu zakończył się PO wejściu Pogłębiacza — cofnięty po fakcie i domknięty ponownie",
    wykonaj: () => mutacjaStanu(
      { sektor: "re-audyt", status: "W TRAKCIE", kiedy: T[2] },
      { historia: [wpis("W TRAKCIE", 1, T[0]), wpis("ZAKOŃCZONE", 1, T[1]), wpis("W TRAKCIE", 1, T[3]), wpis("ZAKOŃCZONE", 1, T[4])], kiedy: T[4] }
    ),
    slad: /PO wejściu re-audytu/,
  },
  {
    opis: "historia przejść BEZ czasu — kolejności wejść nie da się porównać",
    wykonaj: () => mutacjaStanu({ historia: [{ status: "ZAKOŃCZONE", runda: 1 }] }),
    slad: /nie jest znacznikiem ISO/,
  },
  {
    opis: "czas w historii nie jest ISO (wczoraj zamiast znacznika)",
    wykonaj: () => mutacjaStanu({ historia: [wpis("ZAKOŃCZONE", 1, "wczoraj")], kiedy: "wczoraj" }),
    slad: /nie jest znacznikiem ISO/,
  },
  {
    opis: "historia cofa się w czasie — dziennik wejść przestaje być dziennikiem",
    wykonaj: () => mutacjaStanu({ historia: [wpis("W TRAKCIE", 0, T[1]), wpis("ZAKOŃCZONE", 1, T[0])], kiedy: T[0] }),
    slad: /cofa się w czasie/,
  },
  {
    opis: "stan roli BEZ historii przejść — KIER-05 nie ma dziennika wejść",
    wykonaj: () => mutacjaStanu({ historia: [] }),
    slad: /brak historii przejść/,
  },
  {
    opis: "ostatni wpis historii nie zgadza się ze stanem — zmiana ominęła dziennik",
    wykonaj: () => mutacjaStanu({ historia: [wpis("W TRAKCIE", 1, T[0])], kiedy: T[0] }),
    slad: /ominęła dziennik/,
  },
  {
    opis: "plik stanu z falą 3 — nie należy do żadnego przebiegu",
    wykonaj: () => mutacjaStanu({ fala: 3 }),
    slad: /poza \{1, 2\}/,
  },
  {
    opis: "znacznik próby w stanie roli bez nazwanego etapu — wypadałby z kolejności po cichu",
    wykonaj: () => mutacjaStanu({ proba: "" }),
    slad: /znacznik próby musi NAZWAĆ/,
  },
  {
    opis: "KONTRPRZYKŁAD: Pogłębiacz PIK po WCZEŚNIEJSZYM ZAKOŃCZONE działu PIK audytu NIE zapala strażnika",
    wykonaj: () => mutacjaStanu(
      { sektor: "re-audyt", status: "W TRAKCIE", kiedy: T[2] },
      { historia: [wpis("W TRAKCIE", 1, T[0]), wpis("ZAKOŃCZONE", 1, T[1])], kiedy: T[1] }
    ),
    oczekujCzerwonego: false,
  },
  {
    opis: "KONTRPRZYKŁAD: rola procesowa re-audytu (KIER) bez odpowiednika w audycie NIE jest blokowana",
    wykonaj: () => mutacjaStanu({ sektor: "re-audyt", rola: "KIER", status: "W TRAKCIE", niedomkniete: [] }),
    oczekujCzerwonego: false,
  },
  {
    opis: "KONTRPRZYKŁAD: dział audytu cofnięty ZAKOŃCZONE → W TRAKCIE BEZ Pogłębiacza przechodzi (zapisane w historii)",
    wykonaj: () => mutacjaStanu({ status: "W TRAKCIE", historia: [wpis("W TRAKCIE", 1, T[0]), wpis("ZAKOŃCZONE", 1, T[1]), wpis("W TRAKCIE", 1, T[2])], kiedy: T[2] }),
    oczekujCzerwonego: false,
  },
  {
    opis: "KONTRPRZYKŁAD: stan PRÓBNY Pogłębiacza bez działu audytu wypada spod kolejności jak wpis próbny — i jest wypisany",
    wykonaj: () => {
      const r = mutacjaStanu({ sektor: "re-audyt", status: "W TRAKCIE", proba: "E7.6" });
      return { czerwony: r.czerwony || !/stany PRÓBNE .*E7\.6/.test(r.wyjscie), wyjscie: r.wyjscie };
    },
    oczekujCzerwonego: false,
  },
);

/* ── zgłoszenie-śmieć: reguła 5 ma je złapać bez dotykania kodu ── */
const SMIEC = join(ZGLOSZENIA, "AUD-SEC-F1-999.json");
const SMIEC_WER = join(ZGLOSZENIA, "AUD-WER-F1-998.json");

/**
 * Wpis-atrapa o WŁAŚCIWEJ zawartości poza jednym psutym polem. Reszta pól
 * musi być poprawna, inaczej zapali się reguła 5 i mutacja zmierzy nie to,
 * co miała — ta sama pułapka co BLAD-022 ("wysyłka w teście złego wejścia
 * musi być POZA jednym błędem poprawna").
 */
const MIEJSCE_ATRAPY = { rodzaj: "linia", plik: "audyt/tools/werdykt.mjs", linia: 1, tresc: "/**" };
const WPIS_ATRAPA = {
  id: "AUD-WER-F1-998",
  sektor: "audyt", fala: 1, dzial: "WER", pozycja: "WER-01",
  stwierdzenie: "Wpis-atrapa audytu mutacyjnego — mierzy regułę statusu i werdyktów.",
  miejsce: MIEJSCE_ATRAPY,
  dowod: "Wpis powstaje wyłącznie na czas jednej mutacji i jest kasowany w finally.",
  klasyfikacja: "atrapa", wplyw: "Brak — wpis nie opuszcza przebiegu audytu mutacyjnego.",
  hash: hashMiejsca(MIEJSCE_ATRAPY),
  status: "DO WERYFIKACJI",
  werdykt: null,
};

/** Podkłada wpis-atrapę o zadanym kształcie i pyta strażnika. */
function mutacjaWpisu(zmiany) {
  mkdirSync(ZGLOSZENIA, { recursive: true });
  writeFileSync(SMIEC_WER, JSON.stringify({ ...WPIS_ATRAPA, ...zmiany }, null, 2));
  try {
    return straznikCzerwony();
  } finally {
    rmSync(SMIEC_WER, { force: true });
  }
}

/** Czasy-atrapy w porządku rosnącym: T[0] < T[1] < T[2] < T[3] < T[4]. */
const T = ["2026-09-02T10:00:00.000Z", "2026-09-02T10:10:00.000Z", "2026-09-02T10:20:00.000Z", "2026-09-02T10:30:00.000Z", "2026-09-02T10:40:00.000Z"];
const wpis = (status, runda, kiedy) => ({ status, runda, kiedy });

/**
 * Atrapa stanu roli o WŁAŚCIWEJ zawartości poza polami podmienionymi.
 * Historia jest wyprowadzana z końcowego statusu, gdy nie podano jej wprost —
 * bez tego każdy istniejący kontrprzykład zapalałby regułę 17 na braku
 * dziennika, a mierzyć miał co innego (pułapka BLAD-022).
 */
function atrapaStanu(zmiany) {
  const s = {
    sektor: "audyt", fala: 2, rola: "PIK",
    status: "ZAKOŃCZONE", runda: 1, niedomkniete: ["PIK-02"],
    ...zmiany,
  };
  if (!("historia" in zmiany)) s.historia = [wpis(s.status, s.runda, s.kiedy ?? T[1])];
  if (!("kiedy" in zmiany)) s.kiedy = s.historia.at(-1)?.kiedy ?? T[1];
  return s;
}

/** Drugi plik stanu — odpowiednik w DRUGIM sektorze (audyt ↔ re-audyt), gdy mutacja mierzy kolejność. */
const SMIEC_STAN_2 = join(SEKTOR, "stan", "audyt-f2-PROBA-2.json");

/**
 * Podkłada plik stanu roli o zadanym kształcie i pyta strażnika (reguła 17).
 * `drugi` — opcjonalny odpowiednik z drugiego sektora (domyślnie: audyt, ta sama fala i rola).
 */
function mutacjaStanu(zmiany, drugi = null) {
  mkdirSync(join(SEKTOR, "stan"), { recursive: true });
  const pierwszy = atrapaStanu(zmiany);
  writeFileSync(SMIEC_STAN, JSON.stringify(pierwszy, null, 2));
  if (drugi) {
    const sektorDrugiego = pierwszy.sektor === "re-audyt" ? "audyt" : "re-audyt";
    writeFileSync(SMIEC_STAN_2, JSON.stringify(atrapaStanu({ sektor: sektorDrugiego, fala: pierwszy.fala, rola: pierwszy.rola, ...drugi }), null, 2));
  }
  try {
    return straznikCzerwony();
  } finally {
    rmSync(SMIEC_STAN, { force: true });
    rmSync(SMIEC_STAN_2, { force: true });
  }
}

const PRZEPUSZCZA = { werdykt: "PRZEPUSZCZAM", powod: null, kiedy: "2026-09-01T00:00:00.000Z" };
const ISTNIEJE = { werdykt: "ISTNIEJE", powod: null, kiedy: "2026-09-01T00:00:00.000Z" };

function mutacjaZgloszenia() {
  mkdirSync(ZGLOSZENIA, { recursive: true });
  writeFileSync(SMIEC, JSON.stringify({ id: "AUD-SEC-F1-999", sektor: "audyt", fala: 1, dzial: "SEC", stwierdzenie: "cos" }, null, 2));
  try {
    const { czerwony, wyjscie } = straznikCzerwony();
    return { czerwony, trafiony: /brak dowod|brak miejsce|brak hash/.test(wyjscie) };
  } finally {
    rmSync(SMIEC, { force: true });
  }
}

/* ── przebieg ── */

/** Czy mutacja ma na tej gałęzi materiał do zmierzenia. */
const maMaterial = (m) => !m.wymaga || existsSync(P(m.wymaga));

/**
 * `--tylko=<regex>` — przebieg CELOWANY po opisie mutacji, do sprawdzenia
 * poprawki jednej rodziny bez piętnastu minut pełnego audytu. Wynik takiego
 * przebiegu NIE jest dowodem sektora (liczy tylko wybrane) i mówi to na
 * wyjściu; bramką jest wyłącznie przebieg bez filtra.
 */
const filtrTylko = process.argv.find((a) => a.startsWith("--tylko="))?.slice("--tylko=".length);
const TYLKO = filtrTylko ? new RegExp(filtrTylko, "iu") : null;
const wybrana = (m) => !TYLKO || TYLKO.test(m.opis);
if (TYLKO) {
  process.stdout.write(`PRZEBIEG CELOWANY (--tylko=${filtrTylko}) — nie jest dowodem sektora, liczy wyłącznie dopasowane mutacje.\n`);
}

const kopie = new Map();
for (const m of MUTACJE) {
  if (!maMaterial(m)) continue;
  if (!kopie.has(m.plik)) kopie.set(m.plik, readFileSync(P(m.plik), "utf8"));
}

let przeoczone = 0;
let martwe = 0;
let zle = 0;
let pominiete = 0;

try {
  // Stan wyjściowy MUSI być zielony, inaczej cały przebieg mierzy nie to.
  const start = straznikCzerwony();
  if (start.czerwony) {
    process.stdout.write("Strażnik jest CZERWONY przed mutacjami — napraw to najpierw.\n" + start.wyjscie);
    process.exit(1);
  }

  for (const m of MUTACJE) {
    if (!wybrana(m)) continue;
    if (!maMaterial(m)) {
      process.stdout.write(`  – pominięta (brak ${m.wymaga} na tej gałęzi): ${m.opis}\n`);
      pominiete++;
      continue;
    }
    const oryginal = kopie.get(m.plik);
    const zmutowany = m.zmien(oryginal);
    const oczekujCzerwonego = m.oczekujCzerwonego !== false;

    if (zmutowany === oryginal) {
      process.stdout.write(`  ✗ MUTACJA NIC NIE ZMIENIŁA: ${m.opis}\n`);
      zle++;
      continue;
    }

    // `przed`/`po` — dla mutacji, które psują NARZĘDZIE, a regułę zapala dopiero
    // dane, które to narzędzie teraz przepuści. Scena musi stanąć przed pomiarem
    // i zniknąć po nim, także gdy pomiar padnie.
    m.przed?.();
    writeFileSync(P(m.plik), zmutowany, "utf8");
    let czerwony, wyjscie;
    try {
      ({ czerwony, wyjscie } = straznikCzerwony());
    } finally {
      writeFileSync(P(m.plik), oryginal, "utf8");
      m.po?.();
    }

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
    if (!wybrana(m)) continue;
    if (!maMaterial(m)) {
      process.stdout.write(`  – pominięta (brak ${m.wymaga} na tej gałęzi): ${m.opis}\n`);
      pominiete++;
      continue;
    }
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

  if (!TYLKO) {
    const z = mutacjaZgloszenia();
    if (!z.czerwony) { process.stdout.write("  ✗ PRZEPUŚCIŁ: zgłoszenie bez dowodu, miejsca i hasha\n"); przeoczone++; }
    else if (!z.trafiony) { process.stdout.write("  ✗ ZŁY ŚLAD: zgłoszenie-śmieć zapaliło inną regułę\n"); zle++; }
    else process.stdout.write("  ✓ złapane: zgłoszenie bez dowodu, miejsca i hasha\n");
  }
} finally {
  for (const [plik, tresc] of kopie) writeFileSync(P(plik), tresc, "utf8");
  rmSync(SMIEC, { force: true });
  rmSync(SMIEC_WER, { force: true });
  rmSync(SMIEC_STAN, { force: true });
  rmSync(SMIEC_STAN_2, { force: true });
}

const razem = TYLKO
  ? MUTACJE.filter(wybrana).length + MUTACJE_ROLI.filter(wybrana).length
  : MUTACJE.length + MUTACJE_ROLI.length + 1;
process.stdout.write(
  `\n${TYLKO ? "Mutacje CELOWANE (nie dowód sektora)" : "Mutacje sektora"}: ${razem}, przeoczone: ${przeoczone}, martwe/złe: ${zle + martwe}` +
  (pominiete ? `, pominięte bez materiału: ${pominiete}` : "") + "\n"
);

// Po przywróceniu strażnik MUSI wrócić do zieleni — inaczej przebieg coś zostawił.
const koniec = straznikCzerwony();
if (koniec.czerwony) {
  process.stdout.write("\nPo przywróceniu strażnik jest CZERWONY — przebieg zostawił po sobie zmianę.\n" + koniec.wyjscie);
  process.exit(1);
}

process.exit(przeoczone + zle + martwe === 0 ? 0 : 1);
