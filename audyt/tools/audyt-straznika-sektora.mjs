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
 * POLE `regula` (pozycja 5 pakietu E7.7, 2026-09-03) — każda mutacja deklaruje,
 * KTÓRĄ regułę psuje; strażnik drukuje `R<nr>:` w każdym komunikacie, audyt
 * parsuje zapalone prefiksy i wymaga zgodności ŚCISŁEJ („ZŁA REGUŁA” liczy się jak
 * „ZŁY ŚLAD”). Na końcu pełnego przebiegu drukuje MACIERZ reguła → mutacja
 * i kończy kodem 1, gdy reguła z materiałem nie ma ani jednej mutacji.
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
const SRODOWISKO = "audyt/tools/srodowisko.mjs";
const MIGAWKA_PRZED = "audyt/migawki/przed.json";
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
    // ZMIERZONE NA OBU GAŁĘZIACH: przy re-audyt/ROLE.md zapala się R20 (Pogłębiacz ARCH traci odpowiednik
    // zakresu), a BEZ niego R8 — zakres Pogłębiacza ARCH pokrywa te same 113 plików, więc na gałęzi
    // re-audytu maskuje sieroty mapy. Deklaracja mówi to wprost, zamiast udawać, że R8 nie istnieje.
    regula: [7, { nr: 20, wymaga: "re-audyt/ROLE.md" }, { nr: 8, gdyBrak: "re-audyt/ROLE.md" }],
    plik: ROLE_MD,
    slad: /nie ma mechanicznego zakresu/,
    zmien: (s) => s.replace(
      /(\*\*Zakres — 113 plików\*\*\n)```\n[\s\S]*?\n```/,
      "$1(opis słowny zamiast komendy)"
    ),
  },
  {
    opis: "rola traci pozycje checklisty — nie ma czego wyczerpać (W3, K4')",
    regula: [7, 13],
    plik: ROLE_MD,
    slad: /pozycji checklisty — za ma[łl]o/,
    zmien: (s) => s.replace(/^\| INT-\d+ \|.*$/gm, ""),
  },
  {
    opis: "z ROLE.md znika cała rola",
    regula: [7, 13, { nr: 20, wymaga: "re-audyt/ROLE.md" }],
    plik: ROLE_MD,
    slad: /nie opisuje roli/,
    zmien: (s) => s.replace(/\n## PIK — Początek i koniec[\s\S]*?(?=\n## USP —)/, "\n"),
  },
  {
    opis: "bramka zgłoszeń przestaje odrzucać stwierdzenia niepewne (§11)",
    // R11, nie R24: zły przykład SZABLONU goldena jest odrzucany także z innego powodu, goldeny ról — nie.
    regula: [9, 11],
    plik: WSPOLNE,
    slad: /samokontrola|zgloszenie\.mjs --test/i,
    zmien: (s) => s.replace(/export const NIEPEWNOSC = \[[\s\S]*?\];/, "export const NIEPEWNOSC = [];"),
  },
  {
    opis: "bramka zgłoszeń przestaje sprawdzać, czy treść linii zgadza się z plikiem",
    regula: [9, 11, 24],
    plik: ZGLOSZENIE,
    slad: /samokontrola|zgloszenie\.mjs --test/i,
    zmien: (s) => s.replace(
      "} else if (znormalizuj(linie[m.linia - 1]) !== znormalizuj(m.tresc)) {",
      "} else if (false) {"
    ),
  },
  {
    opis: "bramka zgłoszeń przestaje wymagać istnienia pliku (miejsce nie do wskazania)",
    regula: 9,
    plik: ZGLOSZENIE,
    slad: /samokontrola|zgloszenie\.mjs --test/i,
    zmien: (s) => s.replace("if (!existsSync(sciezka)) {", "if (false) {"),
  },
  {
    opis: "mapa traci wykluczenie D4 — 331 plików kursów staje się sierotami",
    regula: 8,
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
    regula: [8, { nr: 20, wymaga: "re-audyt/ROLE.md" }], // R20: Pogłębiacz PIK traci zgodność z zepsutym zakresem działu
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
      if (mutuj[nazwa]) {
        const nowa = mutuj[nazwa](tresc);
        // Mutacja szablonu, która niczego nie zmieniła, mierzy szablon zdrowy —
        // dla kontrprzykładu wyglądałoby to na zaliczenie (test po pustce).
        if (nowa === tresc) return { czerwony: false, wyjscie: `w szablonie ${nazwa}`, nicNieZmienila: true };
        tresc = nowa;
      }
      writeFileSync(join(PROBNA, nazwa), tresc, "utf8");
    }
    if (!pomin.includes("golden.md")) {
      let g = readFileSync(join(SZABLONY, "golden.md"), "utf8").replaceAll("<KOD>", kod);
      if (mutuj["golden.md"]) {
        const nowa = mutuj["golden.md"](g);
        if (nowa === g) return { czerwony: false, wyjscie: "w szablonie golden.md", nicNieZmienila: true };
        g = nowa;
      }
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
      if (nowa === tresc) return { czerwony: false, wyjscie: `w ${plik}`, nicNieZmienila: true };
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
    regula: [9, 19, { nr: 22, wymaga: "re-audyt/role" }], // R22: moduły krytyków re-audytu wskazują wtedy „cudzy” prefiks REA
    plik: WSPOLNE,
    slad: /zgloszenie\.mjs --test/,
    zmien: (s) => s.replace(
      'export const PREFIKS_ID = { audyt: "AUD", "re-audyt": "REA" };',
      'export const PREFIKS_ID = { audyt: "AUD", "re-audyt": "AUD" };'
    ),
  },
  {
    opis: "dział sprawdzany wobec SUMY obu sektorów — rola nieistniejąca w sektorze zgłasza",
    regula: [7, 9, 12],
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
    regula: 1,
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
    regula: 15,
    plik: WERDYKT,
    slad: /werdykt\.mjs --test/,
    zmien: (s) => s.replace(
      "if (ODMOWNE.includes(werdykt) && znormalizuj(powod ?? \"\").length < 20) {",
      "if (false) {"
    ),
  },
  {
    opis: "bramka werdyktów pozwala NADPISAĆ cudzy werdykt (fala 2 dostaje poprawiony wpis)",
    regula: 15,
    plik: WERDYKT,
    slad: /werdykt\.mjs --test/,
    zmien: (s) => s.replace("if (dotychczas[kto]) {", "if (false) {"),
  },
  {
    opis: "komplet werdyktów przestaje wymagać OBU ról (sam krytyk domyka wpis)",
    // DWIE reguły, nie jedna — i to jest poprawne, nie niedokładność. Zamiana AND
    // na OR w `komplet()` psuje naraz samokontrolę bramki werdyktów (R15) i sam
    // niezmiennik „ZWERYFIKOWANE tylko z kompletem werdyktów" (R16), bo R16 liczy
    // komplet TĄ funkcją. Zawężanie mutacji do jednej reguły byłoby udawaniem, że
    // te gwarancje są niezależne. Wykryte przez pełny przebieg audytu 2026-09-05
    // (148 mutacji, 0 przeoczonych, ta jedna liczona jako „zła").
    regula: [15, 16],
    plik: WERDYKT,
    slad: /werdykt\.mjs --test/,
    zmien: (s) => s.replace("return Boolean(w.krytyk && w.weryfikator);", "return Boolean(w.krytyk || w.weryfikator);"),
  },
  {
    opis: "status.mjs przestaje sprawdzać, czy niedomknięta pozycja jest KODEM (komentarz staje się pozycją)",
    // ZMIERZONE przy pozycji 5: `status.mjs --test` (R26) tej regresji NIE widzi — łapie ją
    // wyłącznie reguła 17 na podłożonym pliku stanu. Zapisane, nie naprawiane (sektory nie naprawiają).
    regula: 17,
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
    regula: 9,
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
    regula: 25,
    plik: POROWNAJ,
    slad: /porownaj-cykle\.mjs --test/,
    zmien: (s) => s.replace(
      'else if (innyStan.length || (tylkoW1.length && tylkoW2.length)) wynik = "SPRZECZNE";',
      'else if (true) wynik = "SPRZECZNE";'
    ),
  },
  {
    opis: "porównanie fal przestaje patrzeć na werdykty — POTWIERDZONE i ODRZUCONE wychodzą „zgodne\"",
    regula: 25,
    plik: POROWNAJ,
    slad: /porownaj-cykle\.mjs --test/,
    zmien: (s) => s.replace(
      'if (!krytyk || !weryfikator) return "BEZ WERDYKTU";',
      'return "BEZ WERDYKTU";'
    ),
  },
  {
    opis: "rozjazd fal wraca do kodu 1 (powrót K4′: SPRZECZNE = STOP zamiast lektury)",
    regula: 25,
    plik: POROWNAJ,
    slad: /porownaj-cykle\.mjs --test/,
    zmien: (s) => s.replace(
      "export function kodWyjscia({ podejrzane }, obieFale) {",
      'export function kodWyjscia({ podejrzane, wynik }, obieFale) {\n  if (wynik !== "ZGODNE") return 1;'
    ),
  },
  {
    opis: "podejrzenie kopiowania przestaje dawać kod 1 — ślepota fali 2 traci trzecią warstwę",
    regula: 25,
    plik: POROWNAJ,
    slad: /porownaj-cykle\.mjs --test/,
    zmien: (s) => s.replace("if (podejrzane > 0) return 1;", "if (false) return 1;"),
  },
  {
    opis: "NADZBIÓR przestaje mówić, KTÓRA fala jest większa (zawsze „fala 2\")",
    regula: 25,
    plik: POROWNAJ,
    slad: /porownaj-cykle\.mjs --test/,
    zmien: (s) => s.replace(
      'const wieksza = wynik === "NADZBIÓR" ? (tylkoW2.length ? 2 : 1) : null;',
      'const wieksza = wynik === "NADZBIÓR" ? 2 : null;'
    ),
  },
  {
    opis: "--dzial= przestaje filtrować — porównanie działu liczy cały sektor",
    regula: 25,
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
    regula: 26,
    plik: STATUS,
    slad: /status\.mjs --test/,
    zmien: (s) => s.replace("  if (!FALE.includes(fala)) {", "  if (false) {"),
  },
  {
    opis: "status.mjs wpuszcza Pogłębiacza do działu, którego audyt nie jest ZAKOŃCZONE (W5)",
    regula: 26,
    plik: STATUS,
    slad: /status\.mjs --test/,
    zmien: (s) => s.replace("    if (!audyt || audyt.status !== ZAKONCZONE) {", "    if (false) {"),
  },
  {
    opis: "status.mjs pozwala cofnąć ZAKOŃCZONE działu, do którego Pogłębiacz już wszedł",
    regula: 26,
    plik: STATUS,
    slad: /status\.mjs --test/,
    zmien: (s) => s.replace("    if (wszedl(re)) {", "    if (false) {"),
  },
  {
    opis: "status.mjs pisze stan BEZ migawki przed.json (nie ma wobec czego mierzyć W2)",
    regula: 26,
    plik: STATUS,
    slad: /status\.mjs --test/,
    zmien: (s) => s.replace("  if (!migawka) {\n    return [", "  if (false) {\n    return ["),
  },
  {
    opis: "status.mjs nie odmawia przy różnicy drzewa produktu wobec glowa_main z migawki",
    regula: 26,
    plik: STATUS,
    slad: /status\.mjs --test/,
    zmien: (s) => s.replace("  if (zmienione.length || brudne.length) {", "  if (false) {"),
  },
  {
    opis: "status.mjs liczy .claude/ jako różnicę drzewa — fałszywa odmowa na własnym generacie",
    regula: 26,
    plik: STATUS,
    slad: /status\.mjs --test/,
    zmien: (s) => s.replace("const POZA_PRODUKTEM = /^(audyt|re-audyt|\\.claude)\\//;", "const POZA_PRODUKTEM = /^(audyt|re-audyt)\\//;"),
  },
  {
    opis: "status.mjs przestaje dopisywać historię przejść — KIER-05 traci dziennik wejść",
    regula: 26,
    plik: STATUS,
    slad: /status\.mjs --test/,
    zmien: (s) => s.replace(
      "  stan.historia = [...(stan.historia ?? []), { status: stan.status, runda: stan.runda, kiedy: teraz }];",
      "  stan.historia = stan.historia ?? [];"
    ),
  },
  {
    opis: "KONTRPRZYKŁAD: inne brzmienie komunikatu odmowy (ta sama komenda naprawy) NIE zapala samokontroli",
    regula: 26,
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
    regula: 9,
    plik: ZGLOSZENIE,
    slad: /zgloszenie\.mjs --test/,
    zmien: (s) => s.replace(
      "process.stdout.write(`Przyjęte: ${id}\\n  hash miejsca: ${gotowe.hash.slice(0, 16)}…\\n`);",
      "process.stdout.write(`Przyjęte: ${id}\\n  hash miejsca: ${gotowe.hash.slice(0, 16)}…\\n  zgłoszeń w sektorze: ${readdirSync(KATALOG_ZGLOSZEN).length}\\n`);"
    ),
  },
  {
    opis: "identyfikator bez fali w nazwie (powrót do AUD-SEC-001) — numer ciągły w dziale zdradza liczbę wpisów fali 1",
    regula: [9, 29], // R29: fala.mjs --test pracuje na KOPII prawdziwych narzędzi, więc widzi tę samą regresję
    plik: ZGLOSZENIE,
    slad: /zgloszenie\.mjs --test/,
    zmien: (s) => s.replace("const poczatek = `${prefiks}-${dzial}-F${fala}-`;", "const poczatek = `${prefiks}-${dzial}-`;"),
  },
  {
    opis: "pula numerów WSPÓLNA dla obu fal — fala 2 zaczyna od numeru za ostatnim wpisem fali 1",
    regula: 9,
    plik: ZGLOSZENIE,
    slad: /zgloszenie\.mjs --test/,
    zmien: (s) => s.replace(
      "    .filter((f) => f.startsWith(poczatek))\n    .map((f) => Number(f.match(/-(\\d+)\\.json$/)?.[1] ?? 0));",
      "    .filter((f) => f.startsWith(`${prefiks}-${dzial}-`))\n    .map((f) => Number(f.match(/-(\\d+)\\.json$/)?.[1] ?? 0));"
    ),
  },
  {
    opis: "status.mjs wpuszcza falę 2 do działu przy wpisie z polem fala: 1 w drzewie (izolacja po POLU znika)",
    regula: [26, 29], // R29: izolację mierzy też fala.mjs --test parą „pełne drzewo odmawia / worktree wpuszcza”
    plik: STATUS,
    slad: /status\.mjs --test/,
    zmien: (s) => s.replace("    if (wpisowF1 || stanowF1) {", "    if (false) {"),
  },
  {
    opis: "status.mjs zwalnia z izolacji KAŻDĄ rolę procesową, nie tylko KIER i RAP (Konrad fali 2 czyta falę 1)",
    regula: 26,
    plik: STATUS,
    slad: /status\.mjs --test/,
    zmien: (s) => s.replace('export const WOLNE_OD_IZOLACJI = ["KIER", "RAP"];', 'export const WOLNE_OD_IZOLACJI = ["KIER", "RAP", "KON", "GOLD", "WER", "PSIARZ", "SKUT", "STRAZ", "WALID"];'),
  },
  {
    opis: "KONTRPRZYKŁAD: inne brzmienie komunikatu odmowy izolacji (ta sama komenda naprawy) NIE zapala samokontroli",
    regula: 26,
    plik: STATUS,
    oczekujCzerwonego: false,
    zmien: (s) => s.replace("Agent fali 2 ma NIE WIDZIEĆ wyników fali 1", "Agent fali 2 nie może widzieć wyników fali 1"),
  },
  {
    opis: "porownaj-cykle przestaje nazywać PODEJRZENIE KOLEJNOŚCI — czwarta warstwa ślepoty fali 2 znika",
    regula: 25,
    plik: POROWNAJ,
    slad: /porownaj-cykle\.mjs --test/,
    zmien: (s) => s.replace("    return k1.length >= 2 && k1.length === k2.length && k1.every((h, i) => h === k2[i]);", "    return false;"),
  },
  {
    opis: "podejrzenie kolejności zaczyna dawać kod 1 (wbrew rozstrzygnięciu 5: sygnał, nie STOP)",
    regula: 25,
    plik: POROWNAJ,
    slad: /porownaj-cykle\.mjs --test/,
    zmien: (s) => s.replace(
      "export function kodWyjscia({ podejrzane }, obieFale) {",
      "export function kodWyjscia({ podejrzane, podejrzenie_kolejnosci }, obieFale) {\n  if (podejrzenie_kolejnosci?.length) return 1;"
    ),
  },
  {
    opis: "KONTRPRZYKŁAD: inne brzmienie zdania po dwukropku w PODEJRZENIU KOLEJNOŚCI NIE zapala samokontroli",
    regula: 25,
    plik: POROWNAJ,
    oczekujCzerwonego: false,
    zmien: (s) => s.replace("identyczny zbiór miejsc zgłoszony w obu falach w TEJ SAMEJ kolejności.", "ten sam zbiór miejsc w tym samym porządku zgłaszania."),
  },
  {
    /* Worktree BEZ wykluczeń „działa" w lekturze dokumentacji: powstaje, ma
       gałąź, generat i migawkę — tylko wpisy fali 1 leżą na jego dysku. */
    opis: "fala.mjs stawia worktree bez wykluczeń — wpisy fali 1 leżą na dysku fali 2",
    regula: 29,
    plik: FALA,
    slad: /fala\.mjs --test/,
    zmien: (s) => s.replace(
      '  return ["/*", `!/audyt/zgloszenia/*-F${inna}-*`, `!/audyt/stan/*-f${inna}-*`, "!/audyt/wyniki/*"];',
      '  return ["/*"];'
    ),
  },
  {
    opis: "fala.mjs scala niezacommitowany worktree — stan fali 2 zostaje poza merge'em i znika z worktree",
    regula: 29,
    plik: FALA,
    slad: /fala\.mjs --test/,
    zmien: (s) => s.replace("  if (bW.length) {", "  if (false) {"),
  },
  {
    opis: "stan/ wraca do .gitignore sektora — stan fali 2 z worktree nie wróciłby do drzewa (rozstrzygnięcie 4)",
    regula: 28,
    plik: GITIGNORE_SEKTORA,
    slad: /IGNOROWANY przez gita/,
    zmien: (s) => s + "stan/\n",
  },
);

const MUTACJE_ROLI = [
  {
    opis: "z szablonu AGENT.md znika jedna z 13 zasad Goldena",
    regula: 10,
    wykonaj: () => rolaZSzablonu({ mutuj: { "AGENT.md": (s) => s.replace("7. Wspieraj strażników tam, gdzie znany problem może wrócić.\n", "") } }),
    slad: /brak zasad Goldena/,
  },
  {
    opis: "z szablonu KRYTYK.md znika zasada kolejności cyklu",
    regula: 10,
    wykonaj: () => rolaZSzablonu({ mutuj: { "KRYTYK.md": (s) => s.replace(/^12\. Pilnuj kolejno.*$/m, "12. Pilnuj czegoś tam.") } }),
    slad: /KRYTYK\.md: brak zasad Goldena/,
  },
  {
    opis: "GOLDEN ZGNIŁ: dobry przykład wskazuje linię obok",
    regula: 11,
    wykonaj: () => rolaZSzablonu({ mutuj: { "golden.md": przesunLinie } }),
    slad: /miał przejść, a bramka odrzuca/,
  },
  {
    opis: "zły przykład goldena przestaje być zły (bramka go przyjmuje)",
    regula: 11,
    wykonaj: () => rolaZSzablonu({ mutuj: { "golden.md": (s) => s
      .replace('"stwierdzenie": "Wydaje mi się, że tutaj może być problem z walidacją danych wejściowych."',
               '"stwierdzenie": "Zapytanie skleja wartość z żądania bez prepare, więc wejście trafia do SQL."')
      .replace('"linia": 99999,\n    "tresc": "coś takiego tam było"',
               `"linia": ${liniaDobregoBloku(s)},\n    "tresc": "Egzekwowane maszynowo: narzędzie zgłoszeń **odmawia zapisu** wpisu bez dowodu."`) } }),
    slad: /bramka go PRZYJMUJE/,
  },
  {
    opis: "zły przykład odrzucany, ale NIE z deklarowanego powodu",
    regula: 11,
    wykonaj: () => rolaZSzablonu({ mutuj: { "golden.md": (s) => s.replace("<!-- ODRZUCA: NIE ZGADZA -->", "<!-- ODRZUCA: brak pola \"dowod\" -->") } }),
    slad: /NIE z powodu/,
  },
  {
    opis: "blok goldena traci znacznik SPRAWDZANY (wypada spod miary)",
    regula: 11,
    wykonaj: () => rolaZSzablonu({ mutuj: { "golden.md": (s) => s.replace("<!-- SPRAWDZANY: przechodzi -->", "") } }),
    slad: /brak znacznika SPRAWDZANY/,
  },
  {
    opis: "rola bez SKILL.md — GOLD-06 nie ma czego sprawdzać",
    regula: 12,
    wykonaj: () => rolaZSzablonu({ pomin: ["SKILL.md"] }),
    slad: /nie ma SKILL\.md/,
  },
  {
    opis: "rola bez goldenów — nie ma miary",
    regula: 11,
    wykonaj: () => rolaZSzablonu({ pomin: ["golden.md"] }),
    slad: /katalog goldeny\/ jest pusty/,
  },
  {
    opis: "katalog roli, której ROLE.md nie zna (agent bez zakresu)",
    regula: 12,
    wykonaj: () => rolaZSzablonu({ kod: "NIEZNANA" }),
    slad: /nie odpowiada żadnej roli z \S*ROLE\.md/,
  },
  {
    opis: "pozycja dopisana TYLKO do ROLE.md — agent nigdy jej nie zada",
    regula: 13,
    wykonaj: () => zPodmienionymi({
      "audyt/ROLE.md": (s) => s.replace("| SEC-12 |", "| SEC-13 | Czy pozycja dojechała do agenta? | grep | plik:linia |\n| SEC-12 |"),
    }),
    slad: /AGENT\.md NIE MA pozycji SEC-13/,
  },
  {
    opis: "pozycja dopisana TYLKO do AGENT.md — agent pyta o coś spoza zakresu",
    regula: 13,
    wykonaj: () => zPodmienionymi({
      "audyt/role/SEC/AGENT.md": (s) => s.replace("| SEC-12 |", "| SEC-14 | Pytanie spoza ROLE.md | grep | plik:linia |\n| SEC-12 |"),
    }),
    slad: /ma pozycje spoza ROLE\.md — SEC-14/,
  },
  {
    opis: "KONTRPRZYKŁAD: pozycja dopisana do OBU plików NIE może zapalać strażnika",
    regula: 13,
    oczekujCzerwonego: false,
    wykonaj: () => zPodmienionymi({
      "audyt/ROLE.md": (s) => s.replace("| SEC-12 |", "| SEC-13 | Czy pozycja dojechała do agenta? | grep | plik:linia |\n| SEC-12 |"),
      "audyt/role/SEC/AGENT.md": (s) => s.replace("| SEC-12 |", "| SEC-13 | Czy pozycja dojechała do agenta? | grep | plik:linia |\n| SEC-12 |"),
    }),
  },
  {
    opis: "odsyłacz względny w definicji roli — martwy po skopiowaniu do .claude/agents",
    regula: 14,
    wykonaj: () => zPodmienionymi({
      "audyt/role/SEC/AGENT.md": (s) => s.replace("## Checklista", "Patrz [tabela granic](../../GRANICE.md).\n\n## Checklista"),
    }),
    slad: /nie wskazuje niczego z \.claude\/agents/,
  },
  {
    opis: "rola opisana w ROLE.md bez katalogu w audyt/role — agent bez definicji",
    regula: 12,
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
    regula: 16,
    wykonaj: () => mutacjaWpisu({ status: "ZWERYFIKOWANE" }),
    slad: /status ZWERYFIKOWANE bez kompletu werdyktów/,
  },
  {
    opis: "wpis ma OBA werdykty, a utknął na DO WERYFIKACJI (kierownik szuka werdyktu, który już jest)",
    regula: 16,
    wykonaj: () => mutacjaWpisu({ status: "DO WERYFIKACJI", werdykt: { krytyk: PRZEPUSZCZA, weryfikator: ISTNIEJE } }),
    slad: /utknął przed ZWERYFIKOWANE/,
  },
  {
    opis: "werdykt odmowny BEZ powodu — odrzucenie staje się ciszą",
    regula: 16,
    wykonaj: () => mutacjaWpisu({ werdykt: { krytyk: { werdykt: "ODRZUCAM", powod: "", kiedy: "2026-09-01T00:00:00.000Z" } } }),
    slad: /bez powodu/,
  },
  {
    opis: "werdykt wydany przez rolę spoza dwóch uprawnionych",
    regula: 16,
    wykonaj: () => mutacjaWpisu({ werdykt: { kierownik: PRZEPUSZCZA } }),
    slad: /nieznana rola/,
  },
  {
    opis: "ZNACZNIK PRÓBY bez nazwanego etapu — wpis wypada z porównania fal po cichu",
    regula: 16,
    wykonaj: () => mutacjaWpisu({ proba: "  " }),
    slad: /znacznik próby musi NAZWAĆ etap/,
  },
  {
    opis: "KONTRPRZYKŁAD: wpis próbny Z nazwanym etapem i kompletem werdyktów NIE może zapalać strażnika",
    regula: 16,
    wykonaj: () => mutacjaWpisu({ proba: "E6", status: "ZWERYFIKOWANE", werdykt: { krytyk: PRZEPUSZCZA, weryfikator: ISTNIEJE } }),
    oczekujCzerwonego: false,
  },
  {
    opis: "z KRYTYK.md znika droga zgłaszania, a nakaz zgłaszania zostaje (znalezisko krytyka ginie z sesją)",
    regula: 18,
    wykonaj: () => rolaZSzablonu({ mutuj: { "KRYTYK.md": (s) => s.replace(/node audyt\/tools\/zgloszenie\.mjs --plik=<wpis\.json>/, "opisz je w swojej odpowiedzi") } }),
    slad: /nie podaje drogi/,
  },
  {
    opis: "KONTRPRZYKŁAD: KRYTYK.md BEZ nakazu zgłaszania i BEZ drogi NIE może zapalać strażnika",
    regula: 18,
    wykonaj: () => rolaZSzablonu({ mutuj: { "KRYTYK.md": (s) => s
      .replace(/zgłoś ją jako swoje znalezisko/g, "odnotuj to w werdykcie")
      .replace(/node audyt\/tools\/zgloszenie\.mjs --plik=<wpis\.json>/, "opisz je w swojej odpowiedzi") } }),
    oczekujCzerwonego: false,
  },
  {
    opis: "w stanie roli niedomknięta pozycja jest PROZĄ, nie kodem — kierownik liczy złą liczbę otwartych",
    regula: 17,
    wykonaj: () => mutacjaStanu({ niedomkniete: ["PIK-02", "zgodnie z zakresem próby"] }),
    slad: /nie jest kodem pozycji/,
  },
  {
    opis: "rola ZAKOŃCZONE z licznikiem runda 0 — wygląda, jakby nie zrobiła nic",
    regula: 17,
    wykonaj: () => mutacjaStanu({ runda: 0 }),
    slad: /odbyła co najmniej jedną rundę/,
  },
  {
    opis: "KONTRPRZYKŁAD: stan z kodami pozycji i niezerową rundą NIE może zapalać strażnika",
    regula: 17,
    wykonaj: () => mutacjaStanu({}),
    oczekujCzerwonego: false,
  },
  {
    opis: "KONTRPRZYKŁAD: rola próbna z NIETKNIĘTYCH szablonów NIE może zapalać strażnika",
    regula: [],
    wykonaj: () => rolaZSzablonu(),
    oczekujCzerwonego: false,
  },

  /* ── reguły 17 i 19 wobec DWÓCH SEKTORÓW (E7.1) ─────────────────────────
     Sektory dzielą katalog zgłoszeń i siedemnaście kodów działów, więc każdy
     z tych trzech stanów wygląda w dzienniku jak stan poprawny. */
  {
    opis: "wpis re-audytu z prefiksem AUDYTU — nazwa pliku zajęta przez cudzy sektor",
    regula: 19,
    wykonaj: () => mutacjaWpisu({ sektor: "re-audyt", dzial: "SEC", pozycja: "SEC-01" }),
    slad: /wymaga prefiksu "REA-"/,
  },
  {
    opis: "wpis audytu z działu, który istnieje wyłącznie w re-audycie",
    regula: 19,
    wykonaj: () => mutacjaWpisu({ id: "AUD-PSIARZ-F1-998", dzial: "PSIARZ", pozycja: "PSIARZ-02" }),
    slad: /dział "PSIARZ" nie istnieje w sektorze "audyt"/,
  },
  {
    opis: "KONTRPRZYKŁAD: poprawny wpis re-audytu (REA-, dział wspólny) NIE może zapalać strażnika",
    regula: 19,
    wykonaj: () => mutacjaWpisu({ id: "REA-SEC-F1-997", sektor: "re-audyt", dzial: "SEC", pozycja: "SEC-01" }),
    oczekujCzerwonego: false,
  },

  /* ── reguła 19′: fala w NAZWIE = POLE fala (pozycja 4a E7.7) ─────────────
     Sparse checkout worktree chowa wpisy po nazwie, `status.mjs` odmawia po
     polu — wpis, w którym nazwa i pole mówią co innego, oślepia jedną z warstw. */
  {
    opis: "wpis nazwany F1 z polem fala: 2 — nazwa i pole mówią co innego",
    regula: 19,
    wykonaj: () => mutacjaWpisu({ fala: 2 }),
    slad: /fala w nazwie \(F1\) ≠ pole fala \(2\)/,
  },
  {
    opis: "wpis w STARYM formacie bez fali w nazwie (AUD-WER-998) — sparse checkout by go nie schował",
    regula: 19,
    wykonaj: () => mutacjaWpisu({ id: "AUD-WER-998" }),
    slad: /bez fali w nazwie/,
  },
  {
    opis: "KONTRPRZYKŁAD: wpis fali 2 nazwany F2 NIE może zapalać strażnika",
    regula: 19,
    wykonaj: () => mutacjaWpisu({ id: "AUD-WER-F2-998", fala: 2 }),
    oczekujCzerwonego: false,
  },
  {
    opis: "stan roli, której w tym sektorze NIE MA — kierownik czeka na wynik roli-widma",
    regula: 17,
    wykonaj: () => mutacjaStanu({ sektor: "re-audyt", rola: "GOLD" }),
    slad: /nie istnieje w sektorze "re-audyt"/,
  },
  {
    /* REGRESJA ZNALEZIONA PRZEZ TĘ MUTACJĘ (E7.1): wzorzec kodu pozycji stał
       na `[A-Z]{2,5}` i odrzucał `PSIARZ-02` — sześć liter. Kontrprzykład
       zostaje, żeby sufit długości nie wrócił do liczby wpisanej ręcznie. */
    opis: "KONTRPRZYKŁAD: stan roli własnej re-audytu (PSIARZ) NIE może zapalać strażnika",
    regula: 17,
    wykonaj: () => mutacjaStanu({ sektor: "re-audyt", rola: "PSIARZ", niedomkniete: ["PSIARZ-02"] }),
    oczekujCzerwonego: false,
  },
  {
    /* DRUGA POŁOWA TEJ SAMEJ USTERKI, starsza: `KON-A5` to prawdziwa pozycja
       z `ROLE.md`, a Konrad jest rolą pętlową — czyli tą, która przy suficie
       rund MUSI wypisać niedomknięte. Stary wzorzec nie przyjmował ani jednej
       jego pozycji. */
    opis: "KONTRPRZYKŁAD: pozycja Konrada (KON-A5) jest kodem pozycji, nie prozą",
    regula: 17,
    wykonaj: () => mutacjaStanu({ rola: "KON", niedomkniete: ["KON-A5"] }),
    oczekujCzerwonego: false,
  },
  {
    /* REGUŁA 20. Zakres Pogłębiacza jest KOPIĄ zakresu jego działu w audycie,
       a kopia w tym repozytorium rozjeżdża się po cichu zawsze. Rozjazd znaczy,
       że re-audyt mierzy inny obszar, niż audyt zbadał — łączenie po haszu (W4)
       przestaje wtedy cokolwiek znaczyć, a nic tego nie widać. */
    opis: "zakres Pogłębiacza rozjeżdża się z zakresem jego działu w audycie",
    regula: 20,
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
    regula: 20,
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
    regula: [7, 13],
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
    regula: 8,
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
    regula: 4,
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
    regula: 1,
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
    regula: 21,
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
    regula: 21,
    slad: /przypisuje roli WER model/,
    wykonaj: () => {
      const plik = P(ROLE_MD);
      const org = readFileSync(plik, "utf8");
      const nowa = org.replace("## WER — Audytor weryfikator  · **Opus**", "## WER — Audytor weryfikator  · **Sonnet**");
      if (nowa === org) return { czerwony: false, wyjscie: "w audyt/ROLE.md", nicNieZmienila: true };
      writeFileSync(plik, nowa, "utf8");
      try { return straznikCzerwony(); } finally { writeFileSync(plik, org, "utf8"); }
    },
  },
  {
    opis: "KONTRPRZYKŁAD: inne odstępy w nagłówku roli NIE mogą zapalać reguły 21",
    regula: 21,
    oczekujCzerwonego: false,
    wykonaj: () => zPodmienionymi({
      [ROLE_MD]: (s) => s.replace("## RAP — Audytor raportu  · **Opus**", "## RAP — Audytor raportu · **Opus**"),
    }),
  },
  {
    opis: "szablon krytyka wskazuje zgłoszenia CUDZEGO sektora — prefiks wpisany na sztywno",
    regula: 22,
    slad: /krytyk oceniałby pracę cudzego sektora/,
    wykonaj: () => rolaZSzablonu({ mutuj: { "KRYTYK.md": (s) => s.replace("zgloszenia/AUD-PROBA-", "zgloszenia/REA-PROBA-") } }),
  },
  {
    opis: "KONTRPRZYKŁAD: wzmianka o wpisie drugiego sektora w KRYTYK.md NIE zapala reguły 22",
    regula: 22,
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
    regula: 21,
    slad: /generat aud-kier\.md: model "sonnet", a audyt\/ROLE\.md przypisuje roli KIER model "fable"/,
    wykonaj: () => zPodmienionymi({
      [WSPOLNE]: (s) => s.replace('"Fable 5.1": "fable" }', '"Fable 5.1": "sonnet" }'),
    }),
  },
  {
    /* BEZ regeneracji — ta sama droga co WER wyżej, na trzecim modelu. */
    opis: "audyt/ROLE.md cofa KIER na Opusa, generat zostaje na Fable — sha256 źródła tego nie widzi",
    regula: 21,
    slad: /przypisuje roli KIER model "opus"/,
    wykonaj: () => {
      const plik = P(ROLE_MD);
      const org = readFileSync(plik, "utf8");
      const nowa = org.replace("## KIER — Audytor kierownik  · **Fable 5.1**", "## KIER — Audytor kierownik  · **Opus**");
      if (nowa === org) return { czerwony: false, wyjscie: "w audyt/ROLE.md", nicNieZmienila: true };
      writeFileSync(plik, nowa, "utf8");
      try { return straznikCzerwony(); } finally { writeFileSync(plik, org, "utf8"); }
    },
  },
  {
    opis: "nagłówek roli z NIEZNANYM modelem (Fable 5.2) — dotąd spadłby po cichu na Sonneta",
    // R4 „przy okazji”: generator nie umie zbudować generatu z nieznanym modelem, więc generat zostaje
    // nieaktualny. Macierz ścisła to POKAZUJE zamiast maskować (drugie ryzyko z projektu pozycji 5).
    regula: [4, 21],
    slad: /nieznany model "Fable 5\.2" w nagłówku roli KON/,
    wykonaj: () => zPodmienionymi({
      [ROLE_MD]: (s) => s.replace("## KON — Agent Konrad  · **Fable 5.1**", "## KON — Agent Konrad  · **Fable 5.2**"),
    }),
  },
  {
    opis: "generator pisze alias, którego harness nie zna (fable-5.1) — agent bez modelu albo na domyślnym",
    regula: 21,
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
    regula: 21,
    slad: /generat rea-kon\.md: model "fable", a re-audyt\/ROLE\.md przypisuje roli KON model "opus"/,
    wymaga: "re-audyt/ROLE.md",
    wykonaj: () => {
      const plik = P("re-audyt/ROLE.md");
      const org = readFileSync(plik, "utf8");
      const nowa = org.replace("## KON — Konrad re-audytu  · **Fable 5.1**", "## KON — Konrad re-audytu  · **Opus**");
      if (nowa === org) return { czerwony: false, wyjscie: "w re-audyt/ROLE.md", nicNieZmienila: true };
      writeFileSync(plik, nowa, "utf8");
      try { return straznikCzerwony(); } finally { writeFileSync(plik, org, "utf8"); }
    },
  },
  {
    /* Przeoczenie wskazane przez sędziego (2026-09-02): nieznany model był
       zamknięty, BRAK znacznika nie — rola procesowa bez „· **Opus**" po
       regeneracji dawała generat i pomiar zgodne co do Sonneta. */
    opis: "rola procesowa GOLD traci znacznik modelu, generat przebudowany — dotąd cichy fallback na Sonneta z zieloną bramką",
    regula: [4, 21], // R4 jak wyżej: generator odmawia roli procesowej bez znacznika, generat zostaje stary
    slad: /rola procesowa GOLD bez znacznika modelu/,
    wykonaj: () => zPodmienionymi({
      [ROLE_MD]: (s) => s.replace("## GOLD — Golden  · **Opus**", "## GOLD — Golden"),
    }),
  },
  {
    opis: "KONTRPRZYKŁAD: DZIAŁ bez znacznika modelu zostaje na Sonnecie (D8) i NIE zapala reguły 21",
    regula: 21,
    oczekujCzerwonego: false,
    wykonaj: () => zPodmienionymi({
      [ROLE_MD]: (s) => s.replace("## SEC — Security", "## SEC — Security  · **Sonnet**"),
    }),
  },
  {
    opis: "KONTRPRZYKŁAD: zmiana NAZWY roli w nagłówku (nie modelu) NIE zapala reguły 21",
    regula: 21,
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
    regula: 23,
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
    regula: 23,
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
    regula: 23,
    oczekujCzerwonego: false,
    // OD 4a WPIS NAZYWA SIĘ `REA-SEC-F1-001` — ten kontrprzykład wskazywał starą
    // nazwę i wracał „bez materiału” z zielonym wynikiem, czyli przechodził po
    // pustce od 2026-09-02. Zmierzone przy pozycji 5. Brak materiału jest odtąd
    // `wymaga` (pominięte i policzone), nie cichą zielenią.
    wymaga: "audyt/zgloszenia/REA-SEC-F1-001.json",
    wykonaj: () => {
      const plik = join(ZGLOSZENIA, "REA-SEC-F1-001.json");
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
    regula: 24,
    slad: /szablony\/golden\.md blok \d+: miał przejść/,
    wykonaj: () => zPodmienionymi({
      "audyt/szablony/golden.md": przesunLinie,
    }),
  },
  {
    opis: "zły przykład w SZABLONIE goldena przestaje być zły (bramka go przyjmuje)",
    regula: 24,
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
    regula: 17,
    wykonaj: () => mutacjaStanu({ sektor: "re-audyt", status: "W TRAKCIE" }),
    slad: /przed wyjściem audytu/,
  },
  {
    opis: "Pogłębiacz PIK wszedł, a dział PIK audytu jest dopiero W TRAKCIE",
    regula: 17,
    wykonaj: () => mutacjaStanu({ sektor: "re-audyt", status: "W TRAKCIE", kiedy: T[2] }, { status: "W TRAKCIE", kiedy: T[1] }),
    slad: /przed wyjściem audytu/,
  },
  {
    opis: "dział PIK audytu zakończył się PO wejściu Pogłębiacza — cofnięty po fakcie i domknięty ponownie",
    regula: 17,
    wykonaj: () => mutacjaStanu(
      { sektor: "re-audyt", status: "W TRAKCIE", kiedy: T[2] },
      { historia: [wpis("W TRAKCIE", 1, T[0]), wpis("ZAKOŃCZONE", 1, T[1]), wpis("W TRAKCIE", 1, T[3]), wpis("ZAKOŃCZONE", 1, T[4])], kiedy: T[4] }
    ),
    slad: /PO wejściu re-audytu/,
  },
  {
    /* D15 (2026-09-05): wpis historii z próby na sucho NIE jest wejściem fali.
       Zmierzone na SEC: próba E7.6 zostawiła w historii wpis z 2026-09-01,
       dział SEC audytu zakończył się 2026-09-03, prawdziwe wejście 2026-09-04 —
       reguła brała wpis próbny za wejście i zatrzymywała falę kontrolną. */
    opis: "wpis próbny w historii Pogłębiacza (BEZ pola `proba`) sprzed zakończenia działu audytu MUSI zapalać regułę",
    regula: 17,
    wykonaj: () => mutacjaStanu(
      { sektor: "re-audyt", status: "W TRAKCIE", kiedy: T[3], historia: [wpis("ZAKOŃCZONE", 1, T[0]), wpis("W TRAKCIE", 0, T[3])], runda: 0 },
      { historia: [wpis("W TRAKCIE", 1, T[1]), wpis("ZAKOŃCZONE", 1, T[2])], kiedy: T[2] }
    ),
    slad: /PO wejściu re-audytu/,
  },
  {
    opis: "KONTRPRZYKŁAD: ten sam wpis OZNACZONY `proba` nie jest wejściem — chwilą wejścia jest pierwszy wpis prawdziwej fali",
    regula: 17,
    wykonaj: () => mutacjaStanu(
      { sektor: "re-audyt", status: "W TRAKCIE", kiedy: T[3], historia: [{ ...wpis("ZAKOŃCZONE", 1, T[0]), proba: "E7.6" }, wpis("W TRAKCIE", 0, T[3])], runda: 0 },
      { historia: [wpis("W TRAKCIE", 1, T[1]), wpis("ZAKOŃCZONE", 1, T[2])], kiedy: T[2] }
    ),
    oczekujCzerwonego: false,
  },
  {
    opis: "historia przejść BEZ czasu — kolejności wejść nie da się porównać",
    regula: 17,
    wykonaj: () => mutacjaStanu({ historia: [{ status: "ZAKOŃCZONE", runda: 1 }] }),
    slad: /nie jest znacznikiem ISO/,
  },
  {
    opis: "czas w historii nie jest ISO (wczoraj zamiast znacznika)",
    regula: 17,
    wykonaj: () => mutacjaStanu({ historia: [wpis("ZAKOŃCZONE", 1, "wczoraj")], kiedy: "wczoraj" }),
    slad: /nie jest znacznikiem ISO/,
  },
  {
    opis: "historia cofa się w czasie — dziennik wejść przestaje być dziennikiem",
    regula: 17,
    wykonaj: () => mutacjaStanu({ historia: [wpis("W TRAKCIE", 0, T[1]), wpis("ZAKOŃCZONE", 1, T[0])], kiedy: T[0] }),
    slad: /cofa się w czasie/,
  },
  {
    opis: "stan roli BEZ historii przejść — KIER-05 nie ma dziennika wejść",
    regula: 17,
    wykonaj: () => mutacjaStanu({ historia: [] }),
    slad: /brak historii przejść/,
  },
  {
    opis: "ostatni wpis historii nie zgadza się ze stanem — zmiana ominęła dziennik",
    regula: 17,
    wykonaj: () => mutacjaStanu({ historia: [wpis("W TRAKCIE", 1, T[0])], kiedy: T[0] }),
    slad: /ominęła dziennik/,
  },
  {
    opis: "plik stanu z falą 3 — nie należy do żadnego przebiegu",
    regula: 17,
    wykonaj: () => mutacjaStanu({ fala: 3 }),
    slad: /poza \{1, 2\}/,
  },
  {
    opis: "znacznik próby w stanie roli bez nazwanego etapu — wypadałby z kolejności po cichu",
    regula: 17,
    wykonaj: () => mutacjaStanu({ proba: "" }),
    slad: /znacznik próby musi NAZWAĆ/,
  },
  {
    opis: "KONTRPRZYKŁAD: Pogłębiacz PIK po WCZEŚNIEJSZYM ZAKOŃCZONE działu PIK audytu NIE zapala strażnika",
    regula: 17,
    wykonaj: () => mutacjaStanu(
      { sektor: "re-audyt", status: "W TRAKCIE", kiedy: T[2] },
      { historia: [wpis("W TRAKCIE", 1, T[0]), wpis("ZAKOŃCZONE", 1, T[1])], kiedy: T[1] }
    ),
    oczekujCzerwonego: false,
  },
  {
    opis: "KONTRPRZYKŁAD: rola procesowa re-audytu (KIER) bez odpowiednika w audycie NIE jest blokowana",
    regula: 17,
    wykonaj: () => mutacjaStanu({ sektor: "re-audyt", rola: "KIER", status: "W TRAKCIE", niedomkniete: [] }),
    oczekujCzerwonego: false,
  },
  {
    opis: "KONTRPRZYKŁAD: dział audytu cofnięty ZAKOŃCZONE → W TRAKCIE BEZ Pogłębiacza przechodzi (zapisane w historii)",
    regula: 17,
    wykonaj: () => mutacjaStanu({ status: "W TRAKCIE", historia: [wpis("W TRAKCIE", 1, T[0]), wpis("ZAKOŃCZONE", 1, T[1]), wpis("W TRAKCIE", 1, T[2])], kiedy: T[2] }),
    oczekujCzerwonego: false,
  },
  {
    opis: "KONTRPRZYKŁAD: stan PRÓBNY Pogłębiacza bez działu audytu wypada spod kolejności jak wpis próbny — i jest wypisany",
    regula: 17,
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
    return straznikCzerwony();
  } finally {
    rmSync(SMIEC, { force: true });
  }
}

/* ── przebieg ── */

/** Czy mutacja ma na tej gałęzi materiał do zmierzenia. */
/* ── mutacje reguł 27 / 27b i pozycji otwartej `-90` (pakiet E7.7, 4b + 6) ─
   Zdanie zakazu jest jedyną warstwą ślepoty fali 2, którą agent NAPRAWDĘ czyta;
   pozycja `-90` jest jedynym miejscem, gdzie K4″ („szukaj dalej") ma gdzie
   wylądować. Każda z tych rzeczy ginie z jednego pliku bez objawu, więc każda
   ma mutację i kontrprzykład. */
const ZDANIE_ZAKAZU = "nie czytasz wpisów, stanu ani wyników innej fali";
const BEZ_ZAKAZU = (s) => s.replace(`**${ZDANIE_ZAKAZU}**`, "**pracujesz w swojej fali**");
const BEZ_WIERSZA_90 = (s) => s.replace(/^\| SEC-90 \|.*\n/m, "");
MUTACJE_ROLI.push(
  {
    opis: "zdanie zakazu czytania innej fali znika z SZABLONU AGENT.md (szablon sprawdzany wprost)",
    regula: 27,
    wykonaj: () => zPodmienionymi({ "audyt/szablony/AGENT.md": BEZ_ZAKAZU }),
    slad: /audyt\/szablony\/AGENT\.md: brak zdania zakazu czytania innej fali/,
  },
  {
    opis: "zdanie zakazu znika z SZABLONU KRYTYK.md — rola próbna z szablonu dziedziczy dziurę",
    regula: 27,
    wykonaj: () => rolaZSzablonu({ mutuj: { "KRYTYK.md": BEZ_ZAKAZU } }),
    slad: /PROBA\/KRYTYK\.md: brak zdania zakazu czytania innej fali/,
  },
  {
    opis: "zdanie zakazu znika z realnej definicji (SEC/AGENT.md) — agent fali 2 ma Read i nie wie, że nie czyta fali 1",
    regula: 27,
    wykonaj: () => zPodmienionymi({ "audyt/role/SEC/AGENT.md": BEZ_ZAKAZU }),
    slad: /audyt\/role\/SEC\/AGENT\.md: brak zdania zakazu czytania innej fali/,
  },
  {
    opis: "KONTRPRZYKŁAD: inne łamanie wiersza zdania zakazu NIE może zapalać reguły 27",
    regula: 27,
    oczekujCzerwonego: false,
    wykonaj: () => zPodmienionymi({
      "audyt/role/SEC/AGENT.md": (s) => s.replace(ZDANIE_ZAKAZU, "nie czytasz wpisów,\nstanu ani wyników\ninnej fali"),
    }),
  },
  {
    opis: "pozycja otwarta SEC-90 znika z ROLE.md i AGENT.md naraz — „szukaj dalej” nie ma gdzie wylądować (reguła 7)",
    regula: 7,
    wykonaj: () => zPodmienionymi({ "audyt/ROLE.md": BEZ_WIERSZA_90, "audyt/role/SEC/AGENT.md": BEZ_WIERSZA_90 }),
    slad: /rola SEC \(audyt\) nie ma pozycji otwartej SEC-90/,
  },
  {
    opis: "pozycja otwarta SEC-90 znika TYLKO z AGENT.md — 90 liczy się jak każda pozycja (reguła 13)",
    regula: 13,
    wykonaj: () => zPodmienionymi({ "audyt/role/SEC/AGENT.md": BEZ_WIERSZA_90 }),
    slad: /AGENT\.md NIE MA pozycji SEC-90/,
  },
  {
    opis: "wycofane zdanie K4′ wraca do SZABLONU AGENT.md — rola próbna niesie „swobodny przegląd nie da tego samego wyniku\" (27b)",
    regula: "27b",
    wykonaj: () => rolaZSzablonu({ mutuj: { "AGENT.md": (s) => s.replace(
      "## Prompt\n",
      "## Prompt\n\nNie zachęcać do swobodnego przeglądu — swobodny przegląd nie da tego samego\nwyniku w drugiej fali (K4').\n",
    ) } }),
    slad: /PROBA\/AGENT\.md: niesie wycofane zdanie K4′/,
  },
  {
    opis: "KONTRPRZYKŁAD: słowo „swobodny\" w innym zdaniu NIE może zapalać 27b",
    regula: "27b",
    oczekujCzerwonego: false,
    wykonaj: () => zPodmienionymi({
      "audyt/role/SEC/AGENT.md": (s) => s.replace("## Prompt\n", "## Prompt\n\nSwobodny dobór kolejności narzędzi w obrębie jednej pozycji jest dozwolony.\n"),
    }),
  },
  {
    opis: "wycofane zdanie K4′ wraca do realnej definicji Pogłębiacza (re-audyt/SEC/AGENT.md)",
    regula: "27b",
    wymaga: "re-audyt/role/SEC/AGENT.md",
    wykonaj: () => zPodmienionymi({
      "re-audyt/role/SEC/AGENT.md": (s) => s.replace("## Prompt\n", "## Prompt\n\nSwobodny przegląd nie da tego samego wyniku w drugiej fali.\n"),
    }),
    slad: /re-audyt\/role\/SEC\/AGENT\.md: niesie wycofane zdanie K4′/,
  },
  {
    opis: "Pogłębiacz SEC traci pozycję otwartą SEC-90 w obu plikach (re-audyt, reguła 7)",
    regula: 7,
    wymaga: "re-audyt/ROLE.md",
    wykonaj: () => zPodmienionymi({ "re-audyt/ROLE.md": BEZ_WIERSZA_90, "re-audyt/role/SEC/AGENT.md": BEZ_WIERSZA_90 }),
    slad: /rola SEC \(re-audyt\) nie ma pozycji otwartej SEC-90/,
  },
);

/* ── mutacje reguł 2, 3 i 6 (pakiet E7.7, pozycja 5, 2026-09-03) ────────────
   Trzy kontrole z E4, których do tej pozycji NIE sprawdziła żadna mutacja —
   wyszło to z pierwszej macierzy reguła → mutacja (lektura wzorców wobec
   komunikatów, potwierdzona pomiarem). Reguła 6 pyta o ZDANIE, więc dostaje
   kontrprzykład; reguła 10 pyta o zdanie od E5 i kontrprzykładu nie miała. */
MUTACJE_ROLI.push(
  {
    opis: "rola próbna BEZ KRYTYK.md — rola bez krytyka (D3, reguła 2)",
    regula: 2,
    wykonaj: () => rolaZSzablonu({ pomin: ["KRYTYK.md"] }),
    slad: /audyt\/role\/PROBA nie ma KRYTYK\.md/,
  },
  {
    opis: "AGENT.md roli próbnej traci nagłówek sekcji „Moduł” — pięć elementów §5 niekompletne (reguła 3)",
    regula: 3,
    wykonaj: () => rolaZSzablonu({ mutuj: { "AGENT.md": (s) => s.replace("## Moduł\n", "Moduł (treść bez nagłówka sekcji)\n") } }),
    slad: /audyt\/role\/PROBA: brak elementów §5 — Moduł/,
  },
  {
    opis: "z szablonu AGENT.md znika zdanie „Brak dowodu = brak zgłoszenia” (zasada nadrzędna 1, reguła 6)",
    regula: 6,
    wykonaj: () => rolaZSzablonu({ mutuj: { "AGENT.md": (s) => s.replace("**Brak dowodu = brak\nzgłoszenia.**", "**Zgłaszaj to, co widzisz.**") } }),
    slad: /audyt\/role\/PROBA\/AGENT\.md: brak zasady nadrzędnej — nie ma wymyślania błędów/,
  },
  {
    opis: "KONTRPRZYKŁAD: zdanie „Brak dowodu = brak zgłoszenia” złamane w innym miejscu wiersza NIE zapala reguły 6",
    regula: 6,
    oczekujCzerwonego: false,
    wykonaj: () => rolaZSzablonu({ mutuj: { "AGENT.md": (s) => s.replace("**Brak dowodu = brak\nzgłoszenia.**", "**Brak\ndowodu = brak zgłoszenia.**") } }),
  },
  {
    opis: "KONTRPRZYKŁAD: zasada Goldena złamana w innym miejscu wiersza NIE zapala reguły 10",
    regula: 10,
    oczekujCzerwonego: false,
    wykonaj: () => rolaZSzablonu({ mutuj: { "AGENT.md": (s) => s.replace("7. Wspieraj strażników tam, gdzie", "7. Wspieraj\n   strażników tam, gdzie") } }),
  },
);

/**
 * ŚRODOWISKO `:8892` JAKO MATERIAŁ (pozycja 7 E7.7). Mutacje `srodowisko.mjs`
 * zapalają regułę 31 przez `--test`, który bez kontenera bazy mówi „pominięte"
 * — więc bez kontenera mutacja NIE ma materiału i jest pomijana I POLICZONA,
 * jak `wymaga` dla pliku. Pytamy raz na przebieg, narzędzie samo (`--stoi`).
 */
const SRODOWISKO_STOI = spawnSync("node", [SRODOWISKO, "--stoi"], { cwd: KORZEN, encoding: "utf8" }).status === 0;
const maMaterial = (m) => (!m.wymaga || existsSync(P(m.wymaga))) && (!m.wymagaSrodowiska || SRODOWISKO_STOI);
const czegoBrak = (m) => m.wymaga && !existsSync(P(m.wymaga)) ? m.wymaga : "środowiska :8892 (kontener bazy nie stoi)";

/* ── mutacje pozycji 7 pakietu E7.7 (2026-09-03): jedna rola na środowisku naraz,
   środowisko mierzone ─────────────────────────────────────────────────────── */

/** Wiele plików stanu naraz (reguła 30 porównuje PARY stanów tego samego sektora). */
const SMIECI_STANOW = [0, 1, 2].map((i) => join(SEKTOR, "stan", `audyt-f2-PROBA-${i}.json`));
function mutacjaStanow(lista) {
  mkdirSync(join(SEKTOR, "stan"), { recursive: true });
  lista.forEach((z, i) => writeFileSync(SMIECI_STANOW[i], JSON.stringify(atrapaStanu(z), null, 2)));
  try {
    return straznikCzerwony();
  } finally {
    for (const p of SMIECI_STANOW) rmSync(p, { force: true });
  }
}
const naSrodowisku = (rola, od, do_ = null, reszta = {}) => ({
  sektor: "re-audyt", rola, status: do_ ? "ZAKOŃCZONE" : "W TRAKCIE", runda: 1, niedomkniete: [],
  historia: do_ ? [wpis("W TRAKCIE", 1, od), wpis("ZAKOŃCZONE", 1, do_)] : [wpis("W TRAKCIE", 1, od)],
  kiedy: do_ ?? od, ...reszta,
});
const jsonPrzez = (fn) => (s) => { const m = JSON.parse(s); fn(m); return JSON.stringify(m, null, 2) + "\n"; };

MUTACJE.push(
  {
    opis: "status.mjs wpuszcza drugą rolę NA_SRODOWISKU na :8892, gdy pierwsza jest W TRAKCIE (odmowa 6, C3)",
    regula: 26,
    plik: STATUS,
    slad: /status\.mjs --test/,
    zmien: (s) => s.replace("    if (blokuje) {\n      powody.push(", "    if (false) {\n      powody.push("),
  },
  {
    opis: "status.mjs wpuszcza rolę NA_SRODOWISKU przy migawce „niedostępne” (rozstrzygnięcie 6)",
    regula: 26,
    plik: STATUS,
    slad: /status\.mjs --test/,
    zmien: (s) => s.replace('  if (s !== undefined && s !== "niedostępne") return [];', "  return [];"),
  },
  {
    opis: "lista NA_SRODOWISKU traci WALID — odmowa 6 i reguła 30 pilnowałyby różnych zbiorów ról",
    regula: [26, 30],
    plik: WSPOLNE,
    slad: /lista NA_SRODOWISKU w wspolne\.mjs .* różni się od kopii strażnika/,
    zmien: (s) => s.replace('export const NA_SRODOWISKU = [...DZIALY, "PSIARZ", "WALID"];', 'export const NA_SRODOWISKU = [...DZIALY, "PSIARZ"];'),
  },
  {
    opis: "migawka przed.json BEZ pola srodowisko — migawka sprzed pozycji 7 nie mierzy W6 na :8892 (reguła 31)",
    regula: 31,
    plik: MIGAWKA_PRZED,
    slad: /przed\.json NIE MA pola srodowisko/,
    zmien: jsonPrzez((m) => { delete m.srodowisko; }),
  },
  {
    opis: "pole srodowisko w przed.json jest liczbą — ani liczniki, ani „niedostępne” (reguła 31)",
    regula: 31,
    plik: MIGAWKA_PRZED,
    slad: /nie jest ani licznikami .* ani dosłownym „niedostępne"/,
    zmien: jsonPrzez((m) => { m.srodowisko = 5; }),
  },
  {
    opis: "KONTRPRZYKŁAD: dosłowne „niedostępne” w polu srodowisko NIE zapala reguły 31 (jawny stan, nie pominięcie)",
    regula: 31,
    oczekujCzerwonego: false,
    plik: MIGAWKA_PRZED,
    zmien: jsonPrzez((m) => { m.srodowisko = "niedostępne"; }),
  },
  {
    opis: "srodowisko.mjs przywraca zrzut BEZ asercji liczników w schemacie tymczasowym — podrobiony zrzut wjeżdża do bazy",
    regula: 31,
    wymagaSrodowiska: true,
    plik: SRODOWISKO,
    slad: /srodowisko\.mjs --test NIE przechodzi/,
    zmien: (s) => s.replace("    const roznice = porownajTabele(zapisane.tabele, wTmp);\n    if (roznice.length) {", "    const roznice = porownajTabele(zapisane.tabele, wTmp);\n    if (false) {"),
  },
  {
    opis: "srodowisko.mjs liczy wiersze z information_schema.table_rows zamiast COUNT(*) — szacunek InnoDB kłamie (wp_postmeta 1866 wobec 1786)",
    regula: 31,
    wymagaSrodowiska: true,
    plik: SRODOWISKO,
    slad: /srodowisko\.mjs --test NIE przechodzi/,
    zmien: (s) => s.replace(
      "  const wiersze = sql(union);",
      "  const wiersze = sql(`SELECT table_name, IFNULL(table_rows, 0) FROM information_schema.tables WHERE table_schema='${schemat}' AND table_type='BASE TABLE'`);",
    ),
  },
  {
    opis: "srodowisko.mjs --sprawdz nie pyta o zrzut bazowy fali — KIER-00 zielone bez stanu, do którego można wrócić",
    regula: 31,
    wymagaSrodowiska: true,
    plik: SRODOWISKO,
    slad: /srodowisko\.mjs --test NIE przechodzi/,
    zmien: (s) => s.replace("  const zrzutJest = existsSync(pliki.sql) && existsSync(pliki.json);", "  const zrzutJest = true;"),
  },
);

MUTACJE_ROLI.push(
  {
    opis: "dwa stany ról NA_SRODOWISKU re-audytu tej samej fali z NAKŁADAJĄCYMI SIĘ oknami W TRAKCIE (PSIARZ i WALID, oba otwarte) — reguła 30",
    regula: 30,
    wykonaj: () => mutacjaStanow([naSrodowisku("PSIARZ", T[0]), naSrodowisku("WALID", T[1])]),
    slad: /PSIARZ W TRAKCIE .* i WALID W TRAKCIE .* NAKŁADAJĄ SIĘ/,
  },
  {
    opis: "Pogłębiacz SEC wchodzi, gdy PSIARZ jest W TRAKCIE (okna nakładają się; dział SEC audytu zakończony wcześniej) — reguła 30, nie 17",
    regula: 30,
    wykonaj: () => mutacjaStanow([
      { sektor: "audyt", rola: "SEC", status: "ZAKOŃCZONE", runda: 1, niedomkniete: [], historia: [wpis("W TRAKCIE", 1, T[0]), wpis("ZAKOŃCZONE", 1, T[1])], kiedy: T[1] },
      naSrodowisku("PSIARZ", T[2]),
      naSrodowisku("SEC", T[3]),
    ]),
    slad: /PSIARZ W TRAKCIE .* i SEC W TRAKCIE .* NAKŁADAJĄ SIĘ/,
  },
  {
    opis: "KONTRPRZYKŁAD: okna ROZŁĄCZNE (SEC zakończył, potem wszedł PSIARZ — kolejność KIER-R1) NIE zapalają reguły 30",
    regula: 30,
    oczekujCzerwonego: false,
    wykonaj: () => mutacjaStanow([
      { sektor: "audyt", rola: "SEC", status: "ZAKOŃCZONE", runda: 1, niedomkniete: [], historia: [wpis("ZAKOŃCZONE", 1, T[0])], kiedy: T[0] },
      naSrodowisku("SEC", T[1], T[2]),
      naSrodowisku("PSIARZ", T[3]),
    ]),
  },
  {
    opis: "KONTRPRZYKŁAD: rola procesowa na plikach (KON) równolegle z PSIARZEM NIE zapala reguły 30",
    regula: 30,
    oczekujCzerwonego: false,
    wykonaj: () => mutacjaStanow([naSrodowisku("KON", T[0]), naSrodowisku("PSIARZ", T[1])]),
  },
  {
    opis: "KONTRPRZYKŁAD: stan PRÓBNY nakładający się na PSIARZA NIE zapala reguły 30 (wypada spod reguły, wypisany)",
    regula: 30,
    oczekujCzerwonego: false,
    wykonaj: () => mutacjaStanow([naSrodowisku("PSIARZ", T[0]), naSrodowisku("WALID", T[1], null, { proba: "E7.7" })]),
  },
  {
    opis: "KONTRPRZYKŁAD: dwa działy AUDYTU (lektura, nie środowisko) W TRAKCIE naraz NIE zapalają reguły 30",
    regula: 30,
    oczekujCzerwonego: false,
    wykonaj: () => mutacjaStanow([
      { sektor: "audyt", rola: "SEC", status: "W TRAKCIE", runda: 1, niedomkniete: [], historia: [wpis("W TRAKCIE", 1, T[0])], kiedy: T[0] },
      { sektor: "audyt", rola: "BE", status: "W TRAKCIE", runda: 1, niedomkniete: [], historia: [wpis("W TRAKCIE", 1, T[1])], kiedy: T[1] },
    ]),
  },
);

/* ── REGUŁA ZADEKLAROWANA = REGUŁA ZAPALONA (pakiet E7.7, pozycja 5, 2026-09-03) ─
   Do tej pozycji audyt wiedział tylko, ŻE strażnik się zapalił (kod ≠ 0) i czy
   wyjście pasuje do `slad` — wzorca na TEKST komunikatu, czyli tej samej klasy,
   przed którą strażnik broni kodu. Odtąd każdy komunikat strażnika niesie prefiks
   `R<nr>:`, a każda mutacja deklaruje `regula:` (liczba, napis „27b", lista albo
   `{ nr, wymaga }` — reguła, która zapala się tylko przy materiale na tej gałęzi).

   ZGODNOŚĆ JEST ŚCISŁA (rozstrzygnięcie właściciela 1): zbiór zapalonych reguł
   musi być RÓWNY zadeklarowanemu. Mutacja, która zapala więcej, niż deklaruje,
   maskuje (lekcja z P2: „mutacja łamała dwie reguły naraz"); mutacja, która zapala
   mniej, nie psuje tego, co twierdzi. `slad` ZOSTAJE — pyta o konkretny komunikat
   w obrębie reguły (np. „SEC-90", nie „SEC-13").

   Lista reguł pochodzi z TABLICY `REGULY` strażnika (`--reguly`, rozstrzygnięcie 4),
   z samokontrolą wobec nagłówków sekcji po jego stronie — nie z parsowania
   źródła, które byłoby wzorcem na napis w nowym przebraniu.

   Kontrprzykłady deklarują `regula:` jako DOKUMENTACJĘ: strażnik ma być zielony,
   więc zbiór zapalonych jest pusty i tak; deklaracja liczy się w macierzy jako
   kontrprzykład tej reguły (rozstrzygnięcie 3: raportowany, WYMAGANY tylko dla
   reguł pytających o zdanie — 6, 10, 27, 27b). */
const REGULY = (() => {
  const r = spawnSync("node", [STRAZNIK, "--reguly"], { cwd: KORZEN, encoding: "utf8" });
  if (r.status !== 0) {
    process.stdout.write("straznik --reguly nie odpowiada — bez listy reguł nie ma czego mierzyć:\n" + (r.stdout ?? "") + (r.stderr ?? ""));
    process.exit(1);
  }
  return JSON.parse(r.stdout);
})();
const NUMERY_REGUL = new Set(REGULY.map((r) => r.nr));
/** Reguły pytające o ZDANIE — bez kontrprzykładu nie wiadomo, czy nie są nadwrażliwe. */
const WYMAGA_KONTRPRZYKLADU = new Set(["6", "10", "27", "27b"]);

/**
 * Deklaracja mutacji → `{ wszystkie, oczekiwane }`. `wszystkie` idą do macierzy,
 * `oczekiwane` do porównania ze zbiorem zapalonych — bez reguł, których `wymaga`
 * nie istnieje na tej gałęzi (np. reguła 20 zapala się tylko przy `re-audyt/ROLE.md`)
 * i bez reguł, których `gdyBrak` ISTNIEJE (np. reguła 8 zapala się tylko BEZ niego —
 * zakres Pogłębiacza maskuje sieroty mapy). Oba pola mierzą dysk, nie zgadują gałęzi.
 */
function deklaracja(m) {
  if (m.regula === undefined) return null;
  const lista = Array.isArray(m.regula) ? m.regula : [m.regula];
  const wszystkie = new Set();
  const oczekiwane = new Set();
  for (const el of lista) {
    const nr = String(typeof el === "object" ? el.nr : el);
    if (!NUMERY_REGUL.has(nr)) throw new Error(`mutacja „${m.opis}” deklaruje regułę ${nr}, której strażnik nie zna (--reguly)`);
    wszystkie.add(nr);
    const warunek = typeof el !== "object"
      || ((!el.wymaga || existsSync(P(el.wymaga))) && (!el.gdyBrak || !existsSync(P(el.gdyBrak))));
    if (warunek) oczekiwane.add(nr);
  }
  return { wszystkie, oczekiwane };
}
/** Zbiór reguł zapalonych = prefiksy `R<nr>:` z wyjścia strażnika (jedna linia błędu = jeden prefiks). */
const zapaloneReguly = (wyjscie) => new Set([...wyjscie.matchAll(/^\s*- R(\d+[a-z]?):/gm)].map((x) => x[1]));
const nazwij = (zbior) =>
  [...zbior].sort((a, b) => parseInt(a, 10) - parseInt(b, 10) || a.localeCompare(b)).map((n) => `R${n}`).join(", ") || "∅";
const rowne = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));

/**
 * `--tylko=<regex>` — przebieg CELOWANY po opisie mutacji, do sprawdzenia
 * poprawki jednej rodziny bez piętnastu minut pełnego audytu. Wynik takiego
 * przebiegu NIE jest dowodem sektora (liczy tylko wybrane, nie drukuje macierzy)
 * i mówi to na wyjściu; bramką jest wyłącznie przebieg bez filtra.
 */
const filtrTylko = process.argv.find((a) => a.startsWith("--tylko="))?.slice("--tylko=".length);
const TYLKO = filtrTylko ? new RegExp(filtrTylko, "iu") : null;
const wybrana = (m) => !TYLKO || TYLKO.test(m.opis);
if (TYLKO) {
  process.stdout.write(`PRZEBIEG CELOWANY (--tylko=${filtrTylko}) — nie jest dowodem sektora, liczy wyłącznie dopasowane mutacje, bez macierzy.\n`);
}

/** Pseudo-mutacja zgłoszenia-śmiecia (reguła 5) — przechodzi przez ten sam werdykt, co reszta. */
const MUTACJA_SMIECIA = { opis: "zgłoszenie bez dowodu, miejsca i hasha", regula: 5, slad: /brak dowod|brak miejsce|brak hash/ };

// DEKLARACJE SPRAWDZANE PRZED PIERWSZĄ MUTACJĄ: literówka w numerze reguły ma
// zatrzymać przebieg od razu, nie po kwadransie.
for (const m of [...MUTACJE, ...MUTACJE_ROLI, MUTACJA_SMIECIA]) deklaracja(m);

const kopie = new Map();
for (const m of MUTACJE) {
  if (!maMaterial(m)) continue;
  if (!kopie.has(m.plik)) kopie.set(m.plik, readFileSync(P(m.plik), "utf8"));
}

let przeoczone = 0;
let martwe = 0;
let zle = 0;
let pominiete = 0;

/* Liczniki macierzy — POMIAR tego przebiegu, nie deklaracje. */
const zapalajace = new Map(REGULY.map((r) => [r.nr, 0]));
const kontrprzyklady = new Map(REGULY.map((r) => [r.nr, 0]));
const pominieteWymaga = new Map(REGULY.map((r) => [r.nr, 0]));

/** Jeden werdykt dla każdej mutacji — mutacja pliku, roli próbnej i zgłoszenia-śmiecia idą tą samą drogą. */
function ocen(m, { czerwony, wyjscie, nicNieZmienila }) {
  const oczekujCzerwonego = m.oczekujCzerwonego !== false;
  const d = deklaracja(m);
  if (nicNieZmienila) {
    // Dotyczy TAKŻE kontrprzykładów: kontrprzykład, który niczego nie zmienił,
    // „przechodzi” po pustce — dokładnie tak, jak martwy test negatywny.
    process.stdout.write(`  ✗ MUTACJA NIC NIE ZMIENIŁA: ${m.opis}\n      ${wyjscie}\n`);
    zle++;
    return;
  }
  if (!d) {
    process.stdout.write(`  ✗ ZŁA REGUŁA: ${m.opis}\n      brak deklaracji regula: — macierz nie wie, do której reguły należy ta mutacja\n`);
    zle++;
    return;
  }
  if (oczekujCzerwonego) {
    if (!czerwony) {
      process.stdout.write(`  ✗ PRZEPUŚCIŁ: ${m.opis}\n`);
      przeoczone++;
      return;
    }
    if (m.slad && !m.slad.test(wyjscie)) {
      // Mutacja zapaliła strażnika, ale NIE TEN komunikat, który psuła — czyli
      // maskuje ją inna. To groźniejsze niż przeoczenie, bo wygląda na sukces.
      process.stdout.write(`  ✗ ZŁY ŚLAD: ${m.opis}\n      zapaliło się coś innego niż ${m.slad}\n`);
      zle++;
      return;
    }
    const zapalone = zapaloneReguly(wyjscie);
    for (const nr of zapalone) zapalajace.set(nr, (zapalajace.get(nr) ?? 0) + 1);
    if (!rowne(zapalone, d.oczekiwane)) {
      process.stdout.write(
        `  ✗ ZŁA REGUŁA: ${m.opis}\n      zadeklarowano ${nazwij(d.oczekiwane)}, zapaliły się ${nazwij(zapalone)}\n`
      );
      zle++;
      return;
    }
    process.stdout.write(`  ✓ złapane (${nazwij(zapalone)}): ${m.opis}\n`);
  } else {
    if (czerwony) {
      process.stdout.write(`  ✗ FAŁSZYWY ALARM: ${m.opis}\n      ${wyjscie.split("\n").filter(Boolean).slice(1, 4).join("\n      ")}\n`);
      zle++;
      return;
    }
    for (const nr of d.oczekiwane) kontrprzyklady.set(nr, kontrprzyklady.get(nr) + 1);
    process.stdout.write(`  ✓ przepuszczone słusznie (kontrprzykład ${nazwij(d.oczekiwane)}): ${m.opis}\n`);
  }
}

function pomin(m) {
  process.stdout.write(`  – pominięta (brak ${czegoBrak(m)} na tej gałęzi): ${m.opis}\n`);
  pominiete++;
  for (const nr of deklaracja(m)?.wszystkie ?? []) pominieteWymaga.set(nr, pominieteWymaga.get(nr) + 1);
}

let start;
try {
  // Stan wyjściowy MUSI być zielony, inaczej cały przebieg mierzy nie to.
  start = straznikCzerwony();
  if (start.czerwony) {
    process.stdout.write("Strażnik jest CZERWONY przed mutacjami — napraw to najpierw.\n" + start.wyjscie);
    process.exit(1);
  }

  for (const m of MUTACJE) {
    if (!wybrana(m)) continue;
    if (!maMaterial(m)) { pomin(m); continue; }
    const oryginal = kopie.get(m.plik);
    const zmutowany = m.zmien(oryginal);

    if (zmutowany === oryginal) {
      ocen(m, { czerwony: false, wyjscie: `w ${m.plik}`, nicNieZmienila: true });
      continue;
    }

    // `przed`/`po` — dla mutacji, które psują NARZĘDZIE, a regułę zapala dopiero
    // dane, które to narzędzie teraz przepuści. Scena musi stanąć przed pomiarem
    // i zniknąć po nim, także gdy pomiar padnie.
    m.przed?.();
    writeFileSync(P(m.plik), zmutowany, "utf8");
    let wynik;
    try {
      wynik = straznikCzerwony();
    } finally {
      writeFileSync(P(m.plik), oryginal, "utf8");
      m.po?.();
    }
    ocen(m, wynik);
  }

  for (const m of MUTACJE_ROLI) {
    if (!wybrana(m)) continue;
    if (!maMaterial(m)) { pomin(m); continue; }
    ocen(m, m.wykonaj());
  }

  if (!TYLKO) ocen(MUTACJA_SMIECIA, mutacjaZgloszenia());
} finally {
  for (const [plik, tresc] of kopie) writeFileSync(P(plik), tresc, "utf8");
  rmSync(SMIEC, { force: true });
  rmSync(SMIEC_WER, { force: true });
  rmSync(SMIEC_STAN, { force: true });
  rmSync(SMIEC_STAN_2, { force: true });
  for (const p of SMIECI_STANOW) rmSync(p, { force: true });
}

const razem = TYLKO
  ? MUTACJE.filter(wybrana).length + MUTACJE_ROLI.filter(wybrana).length
  : MUTACJE.length + MUTACJE_ROLI.length + 1;
process.stdout.write(
  `\n${TYLKO ? "Mutacje CELOWANE (nie dowód sektora)" : "Mutacje sektora"}: ${razem}, przeoczone: ${przeoczone}, martwe/złe: ${zle + martwe}` +
  (pominiete ? `, pominięte bez materiału: ${pominiete}` : "") + "\n"
);

/* ── MACIERZ REGUŁA → MUTACJA (tylko pełny przebieg; rozstrzygnięcie 5: na
   wyjściu, nie w pliku — liczby wpisane do dokumentu starzeją się cicho) ─────
   Wiersz na regułę: ile mutacji ją zapaliło, ile kontrprzykładów ją deklaruje,
   ile mutacji pominięto z braku materiału (`wymaga`) i czy reguła MA materiał na
   tej gałęzi — POMIAR z linii „pominięte — N.” w wyjściu strażnika PRZED
   mutacjami, nie deklaracja w audycie.

   KOD 1, gdy reguła z materiałem nie ma ani jednej mutacji (rozstrzygnięcie 2):
   inaczej macierz byłaby raportem, którego nikt nie czyta, a B7 pytał o BRAMKĘ.
   Reguła bez materiału = „bez materiału”, policzona, nigdy cicho zielona — ten
   sam wzorzec, co `wymaga` per mutacja. Reguła pominięta dla CZĘŚCI materiału
   (np. 7 i 12 na gałęzi audytu, gdzie `re-audyt/` nie istnieje), ale zapalona
   przez mutacje, jest „częściowo” — ma dowód na tej części, którą strażnik widzi. */
let bezMutacji = 0;
let bezKontrprzykladu = 0;
if (!TYLKO) {
  const pominieteNaStarcie = new Map();
  for (const m of start.wyjscie.matchAll(/^\s*pominięte — (\d+)\.\s*(.*)$/gm)) {
    pominieteNaStarcie.set(m[1], [...(pominieteNaStarcie.get(m[1]) ?? []), m[2].trim()]);
  }
  let bezMaterialu = 0;
  process.stdout.write("\nMACIERZ reguła → mutacja (pomiar tego przebiegu; „pominięte” czytane z wyjścia strażnika przed mutacjami):\n");
  for (const r of REGULY) {
    const z = zapalajace.get(r.nr);
    const k = kontrprzyklady.get(r.nr);
    const p = pominieteWymaga.get(r.nr);
    const pom = pominieteNaStarcie.get(r.nr.replace(/[a-z]$/, ""));
    let material;
    let werdykt = "";
    if (z > 0) {
      material = pom ? `częściowo (strażnik pomija: ${pom.join("; ")})` : "tak";
    } else if (pom) {
      material = `BEZ MATERIAŁU na tej gałęzi (${pom.join("; ")})`;
      bezMaterialu++;
    } else {
      material = "tak";
      werdykt = "\n      ✗ REGUŁA Z MATERIAŁEM BEZ ANI JEDNEJ MUTACJI — nikt nigdy nie sprawdził, czy ta kontrola cokolwiek łapie";
      bezMutacji++;
    }
    if (!werdykt && z > 0 && WYMAGA_KONTRPRZYKLADU.has(r.nr) && k === 0) {
      werdykt = "\n      ✗ reguła pyta o ZDANIE, a nie ma kontrprzykładu — nie wiadomo, czy nie jest nadwrażliwa";
      bezKontrprzykladu++;
    }
    process.stdout.write(
      `  R${r.nr.padEnd(3)} mutacji: ${String(z).padStart(2)}  kontrprzykładów: ${String(k).padStart(2)}` +
      `${p ? `  pominiętych (wymaga): ${p}` : ""}  materiał: ${material}  — ${r.tytul}${werdykt}\n`
    );
  }
  process.stdout.write(
    `Macierz: reguł ${REGULY.length}, z mutacją ${REGULY.length - bezMaterialu - bezMutacji}, bez materiału ${bezMaterialu}, ` +
    `BEZ MUTACJI przy materiale ${bezMutacji}, bez wymaganego kontrprzykładu ${bezKontrprzykladu}.\n`
  );
}

// Po przywróceniu strażnik MUSI wrócić do zieleni — inaczej przebieg coś zostawił.
const koniec = straznikCzerwony();
if (koniec.czerwony) {
  process.stdout.write("\nPo przywróceniu strażnik jest CZERWONY — przebieg zostawił po sobie zmianę.\n" + koniec.wyjscie);
  process.exit(1);
}

process.exit(przeoczone + zle + martwe + bezMutacji + bezKontrprzykladu === 0 ? 0 : 1);
