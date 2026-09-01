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
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { KOD_PROBNY, KORZEN, SEKTOR, ZGLOSZENIA, hashMiejsca } from "./wspolne.mjs";

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
      writeFileSync(SMIEC_STAN, JSON.stringify({
        sektor: "audyt", fala: 2, rola: "PIK", status: "ZAKOŃCZONE", runda: 1,
        niedomkniete: ["PIK-01 (nie zdążyłem)"],
      }, null, 2));
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
    wykonaj: () => mutacjaWpisu({ id: "AUD-PSIARZ-998", dzial: "PSIARZ", pozycja: "PSIARZ-02" }),
    slad: /dział "PSIARZ" nie istnieje w sektorze "audyt"/,
  },
  {
    opis: "KONTRPRZYKŁAD: poprawny wpis re-audytu (REA-, dział wspólny) NIE może zapalać strażnika",
    wykonaj: () => mutacjaWpisu({ id: "REA-SEC-997", sektor: "re-audyt", dzial: "SEC", pozycja: "SEC-01" }),
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

/* ── zgłoszenie-śmieć: reguła 5 ma je złapać bez dotykania kodu ── */
const SMIEC = join(ZGLOSZENIA, "AUD-SEC-999.json");
const SMIEC_WER = join(ZGLOSZENIA, "AUD-WER-998.json");

/**
 * Wpis-atrapa o WŁAŚCIWEJ zawartości poza jednym psutym polem. Reszta pól
 * musi być poprawna, inaczej zapali się reguła 5 i mutacja zmierzy nie to,
 * co miała — ta sama pułapka co BLAD-022 ("wysyłka w teście złego wejścia
 * musi być POZA jednym błędem poprawna").
 */
const MIEJSCE_ATRAPY = { rodzaj: "linia", plik: "audyt/tools/werdykt.mjs", linia: 1, tresc: "/**" };
const WPIS_ATRAPA = {
  id: "AUD-WER-998",
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

/** Podkłada plik stanu roli o zadanym kształcie i pyta strażnika (reguła 17). */
function mutacjaStanu(zmiany) {
  mkdirSync(join(SEKTOR, "stan"), { recursive: true });
  writeFileSync(SMIEC_STAN, JSON.stringify({
    sektor: "audyt", fala: 2, rola: "PIK",
    status: "ZAKOŃCZONE", runda: 1, niedomkniete: ["PIK-02"],
    ...zmiany,
  }, null, 2));
  try {
    return straznikCzerwony();
  } finally {
    rmSync(SMIEC_STAN, { force: true });
  }
}

const PRZEPUSZCZA = { werdykt: "PRZEPUSZCZAM", powod: null, kiedy: "2026-09-01T00:00:00.000Z" };
const ISTNIEJE = { werdykt: "ISTNIEJE", powod: null, kiedy: "2026-09-01T00:00:00.000Z" };

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

/** Czy mutacja ma na tej gałęzi materiał do zmierzenia. */
const maMaterial = (m) => !m.wymaga || existsSync(P(m.wymaga));

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

  const z = mutacjaZgloszenia();
  if (!z.czerwony) { process.stdout.write("  ✗ PRZEPUŚCIŁ: zgłoszenie bez dowodu, miejsca i hasha\n"); przeoczone++; }
  else if (!z.trafiony) { process.stdout.write("  ✗ ZŁY ŚLAD: zgłoszenie-śmieć zapaliło inną regułę\n"); zle++; }
  else process.stdout.write("  ✓ złapane: zgłoszenie bez dowodu, miejsca i hasha\n");
} finally {
  for (const [plik, tresc] of kopie) writeFileSync(P(plik), tresc, "utf8");
  rmSync(SMIEC, { force: true });
  rmSync(SMIEC_WER, { force: true });
}

const razem = MUTACJE.length + MUTACJE_ROLI.length + 1;
process.stdout.write(
  `\nMutacje sektora: ${razem}, przeoczone: ${przeoczone}, martwe/złe: ${zle + martwe}` +
  (pominiete ? `, pominięte bez materiału: ${pominiete}` : "") + "\n"
);

// Po przywróceniu strażnik MUSI wrócić do zieleni — inaczej przebieg coś zostawił.
const koniec = straznikCzerwony();
if (koniec.czerwony) {
  process.stdout.write("\nPo przywróceniu strażnik jest CZERWONY — przebieg zostawił po sobie zmianę.\n" + koniec.wyjscie);
  process.exit(1);
}

process.exit(przeoczone + zle + martwe === 0 ? 0 : 1);
