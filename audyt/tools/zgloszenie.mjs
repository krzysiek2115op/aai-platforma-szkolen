/**
 * ZGŁOSZENIE — jedyna droga, którą znalezisko wchodzi do sektora.
 *
 * To narzędzie egzekwuje maszynowo ZASADĘ 1 ("nie ma wymyślania błędów").
 * Nie jest formularzem: **odmawia zapisu** wpisu bez dowodu, bez miejsca albo
 * z miejscem, którego w kodzie nie ma.
 *
 * NAJWAŻNIEJSZA KONTROLA: miejsce musi ISTNIEĆ, a przy formie liniowej treść
 * podana przez agenta musi zgadzać się z treścią w pliku. Agent nie może więc
 * "wskazać" linii, której nie otworzył — a to jest dokładnie ta klasa, której
 * §11 regulaminu zabrania ("NIE: wydaje mi się, że jest błąd").
 *
 * ID NADAJE TO NARZĘDZIE, nie agent (§11) — numer jest kolejny w obrębie
 * SEKTORA, DZIAŁU i FALI: `AUD-SEC-F2-001` (pakiet E7.7, pozycja 4, rozstrzygnięcie
 * właściciela 2026-09-02). Fala siedzi W NAZWIE, a pula numerów jest osobna dla
 * każdej fali — bo numer ciągły w obrębie działu ZDRADZAŁ fali 2, ile znalazła
 * fala 1: agent po pierwszym zapisie widział `AUD-SEC-013` i wiedział, że przed
 * nim było dwanaście wpisów, mimo każdego zakazu czytania (F3 z krytyki budowy).
 *
 * PO ZAPISIE NARZĘDZIE DRUKUJE WYŁĄCZNIE ID I HASH. Do 2026-09-02 drukowało
 * „zgłoszeń w sektorze: N" i ostrzeżenie o progu 200 — to był ten sam przeciek
 * drugą drogą. Liczba wpisów i próg SQLite żyją teraz w `status.mjs --pokaz`
 * kierownika i w uwagach strażnika sektora (reguła 5), gdzie czyta je człowiek
 * prowadzący przebieg, a nie agent fali.
 *
 * Użycie:
 *   node audyt/tools/zgloszenie.mjs --plik=<wejscie.json>
 *   node audyt/tools/zgloszenie.mjs --test        # samokontrola, patrz niżej
 *
 * `--katalog=<dir>` przestawia katalog zgłoszeń na `<dir>/zgloszenia` — używa go
 * WYŁĄCZNIE samokontrola (przebieg CLI na katalogu tymczasowym, jak w
 * `status.mjs` i `porownaj-cykle.mjs`).
 *
 * Kod wyjścia 0 = przyjęte, 1 = odrzucone (z powodem na wyjściu).
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  KORZEN, NIEPEWNOSC, PREFIKS_ID, SEKTORY, STATUSY, SUFIT_RUND,
  ZGLOSZENIA, czytajJSON, hashMiejsca, roleSektora, zapiszJSON, znormalizuj,
} from "./wspolne.mjs";

const WYMAGANE = ["sektor", "fala", "dzial", "pozycja", "stwierdzenie", "miejsce", "dowod", "klasyfikacja", "wplyw"];

/**
 * Sprawdza JEDNO zgłoszenie. Zwraca listę powodów odmowy — pusta znaczy
 * "przyjęte". Funkcja jest CZYSTA (nie pisze, nie kończy procesu), żeby dało
 * się ją wywołać z samokontroli `--test` bez dotykania dysku.
 */
export function powodyOdmowy(z, { korzen = KORZEN } = {}) {
  const bledy = [];

  for (const pole of WYMAGANE) {
    const v = z?.[pole];
    if (v === undefined || v === null || (typeof v === "string" && !v.trim())) {
      bledy.push(`brak pola "${pole}" — zgłoszenie bez niego nie ma podstawy`);
    }
  }
  if (bledy.length) return bledy;

  if (!SEKTORY.includes(z.sektor)) bledy.push(`nieznany sektor "${z.sektor}"`);
  if (![1, 2].includes(z.fala)) bledy.push(`fala musi być 1 albo 2, jest "${z.fala}"`);

  /* DZIAŁ JEST SPRAWDZANY WOBEC SWOJEGO SEKTORA, nie wobec sumy obu list.
     Sektory mają siedemnaście kodów wspólnych i po kilka własnych: `GOLD`
     i `WER` istnieją wyłącznie w audycie, `PSIARZ`, `SKUT`, `STRAZ` i `WALID`
     wyłącznie w re-audycie. Suma list przyjmowałaby zgłoszenie od roli, której
     w danym sektorze NIE MA — a wtedy kierownik szukałby wyników działu, który
     w tym przebiegu nie pracował. */
  if (SEKTORY.includes(z.sektor)) {
    const znane = roleSektora(z.sektor);
    if (!znane.includes(z.dzial)) {
      bledy.push(`dział "${z.dzial}" nie istnieje w sektorze "${z.sektor}" — znane: ${znane.join(", ")}`);
    }
  }
  if (z.status && !STATUSY.includes(z.status)) bledy.push(`nieznany status "${z.status}"`);
  if (z.runda !== undefined && (!Number.isInteger(z.runda) || z.runda < 1 || z.runda > SUFIT_RUND)) {
    bledy.push(`runda poza zakresem 1..${SUFIT_RUND} (sufit W3)`);
  }

  // Stwierdzenie musi być JEDNOZNACZNE — §11 regulaminu.
  for (const wzorzec of NIEPEWNOSC) {
    if (wzorzec.test(z.stwierdzenie)) {
      bledy.push(`stwierdzenie zawiera zwrot niepewności (${wzorzec.source}) — §11 wymaga jednoznaczności`);
    }
  }
  if (znormalizuj(z.stwierdzenie).length < 20) bledy.push("stwierdzenie jest za krótkie, by cokolwiek znaczyło");
  if (znormalizuj(z.dowod).length < 20) bledy.push("dowód jest za krótki, by cokolwiek potwierdzał");

  // ZNACZNIK PRÓBY NIE JEDZIE W CIELE WPISU. Wpis oznaczony jako próbny
  // wypada z porównania fal i z połączenia sektorów, więc gdyby agent mógł go
  // sobie dopisać, miałby drogę na wyciszenie własnego prawdziwego znaleziska.
  // Znacznik nadaje osobna komenda `--oznacz-probe`, uruchamiana przez tego,
  // kto prowadzi BUDOWĘ sektora — to jest decyzja o etapie budowy, nie
  // o znalezisku.
  if (z.proba !== undefined) {
    bledy.push('pole "proba" nie może przyjść w treści zgłoszenia — znacznik nadaje `--oznacz-probe=<ID> --etap=<etap>`');
  }

  // ── MIEJSCE: dwie dopuszczalne formy (K10') ──
  const m = z.miejsce;
  if (!m || typeof m !== "object") return [...bledy, "miejsce musi być obiektem"];
  if (!["linia", "mechanizm"].includes(m.rodzaj)) {
    return [...bledy, `miejsce.rodzaj musi być "linia" albo "mechanizm" (K10'), jest "${m.rodzaj}"`];
  }
  if (!m.plik) return [...bledy, "miejsce.plik jest wymagany w obu formach"];

  const sciezka = join(korzen, m.plik);
  if (!existsSync(sciezka)) {
    bledy.push(`miejsce.plik "${m.plik}" NIE ISTNIEJE — miejsca nie da się wskazać`);
    return bledy;
  }

  if (m.rodzaj === "linia") {
    if (!Number.isInteger(m.linia) || m.linia < 1) {
      bledy.push("miejsce.linia musi być dodatnią liczbą całkowitą");
    } else {
      const linie = readFileSync(sciezka, "utf8").split("\n");
      if (m.linia > linie.length) {
        bledy.push(`plik "${m.plik}" ma ${linie.length} linii, wskazano ${m.linia}`);
      } else if (!m.tresc || !znormalizuj(m.tresc)) {
        bledy.push("miejsce.tresc jest wymagana przy formie liniowej — to ona dowodzi, że plik otwarto");
      } else if (znormalizuj(linie[m.linia - 1]) !== znormalizuj(m.tresc)) {
        bledy.push(
          `treść linii ${m.linia} NIE ZGADZA SIĘ z podaną.\n` +
          `      w pliku: ${znormalizuj(linie[m.linia - 1]).slice(0, 90)}\n` +
          `      podano:  ${znormalizuj(m.tresc).slice(0, 90)}`
        );
      }
    }
  } else {
    // Forma dla braków, wyścigów i kolejności — musi NAZWAĆ, czego brakuje
    // i gdzie to powinno być. Wpisanie zmyślonej linii łamałoby zasadę 1.
    if (!m.zakres || znormalizuj(m.zakres).length < 3) {
      bledy.push("miejsce.zakres jest wymagany przy formie mechanizmu (np. nazwa metody albo bloku)");
    }
    if (!m.mechanizm || znormalizuj(m.mechanizm).length < 10) {
      bledy.push("miejsce.mechanizm musi NAZWAĆ, czego brakuje i gdzie to powinno być (K10')");
    }
  }
  return bledy;
}

/**
 * ID NADAJE NARZĘDZIE, NIE AGENT (§11) — numer jest kolejny w obrębie
 * trójki SEKTOR + DZIAŁ + FALA: `<PREFIKS>-<DZIAŁ>-F<N>-<numer>`.
 *
 * Funkcja jest CZYSTA (dostaje listę istniejących nazw, nie czyta dysku),
 * żeby samokontrola mogła sprawdzić dokładnie to, co najgroźniejsze: że
 * zgłoszenie re-audytu NIE dostaje nazwy zajętej przez audyt (oba sektory
 * dzielą jeden katalog i siedemnaście kodów działów) ORAZ że fala 2 zaczyna
 * od `001` niezależnie od tego, ile wpisów ma fala 1 — wspólna pula numerów
 * zdradzałaby liczbę cudzych znalezisk samym identyfikatorem.
 *
 * Wzorzec nazwy jest jeden dla wszystkich wpisów, także próbnych z E6/E7
 * (przemianowane na `-F1-` 2026-09-02) — zero wyjątków w regułach.
 */
export const WZORZEC_ID = /^(AUD|REA)-([A-Z]+)-F([12])-(\d{3,})$/;

export function idZgloszenia(dzial, sektor, fala, istniejace) {
  const prefiks = PREFIKS_ID[sektor];
  const poczatek = `${prefiks}-${dzial}-F${fala}-`;
  const numery = istniejace
    .filter((f) => f.startsWith(poczatek))
    .map((f) => Number(f.match(/-(\d+)\.json$/)?.[1] ?? 0));
  const kolejny = (numery.length ? Math.max(...numery) : 0) + 1;
  return `${poczatek}${String(kolejny).padStart(3, "0")}`;
}

function nastepneId(dzial, sektor, fala, katalog) {
  const istniejace = existsSync(katalog) ? readdirSync(katalog) : [];
  return idZgloszenia(dzial, sektor, fala, istniejace);
}

/* ── samokontrola: `--test` z definicji ukończenia sektora (pozycja 5) ── */

function samokontrola() {
  const przypadki = [
    ["komplet z formą liniową", {
      sektor: "audyt", fala: 1, dzial: "SEC", pozycja: "SEC-03",
      stwierdzenie: "Zapytanie skleja wartość bez prepare, więc wejście trafia do SQL.",
      miejsce: { rodzaj: "linia", plik: "audyt/tools/zgloszenie.mjs", linia: 1, tresc: "/**" },
      dowod: "Linia widoczna w pliku; wartość pochodzi z żądania.",
      klasyfikacja: "wstrzyknięcie", wplyw: "Obcy może odczytać cudze dane.",
    }, true],
    ["komplet z formą mechanizmu (K10')", {
      sektor: "audyt", fala: 1, dzial: "BE", pozycja: "BE-01",
      stwierdzenie: "Brak sprawdzenia klucza przed zapisem kasuje gałąź kursu.",
      miejsce: { rodzaj: "mechanizm", plik: "audyt/tools/wspolne.mjs", zakres: "funkcja zapiszJSON", mechanizm: "brak sprawdzenia, czy klucz w ogóle przyszedł" },
      dowod: "Ścieżka zapisu nie ma gałęzi dla braku klucza.",
      klasyfikacja: "utrata danych", wplyw: "Treść znika bez śladu.",
    }, true],
    ["BEZ dowodu", { sektor: "audyt", fala: 1, dzial: "SEC", pozycja: "SEC-01", stwierdzenie: "Handler nie sprawdza nonce przed użyciem danych.", miejsce: { rodzaj: "linia", plik: "audyt/tools/zgloszenie.mjs", linia: 1, tresc: "/**" }, klasyfikacja: "CSRF", wplyw: "Obcy wykona akcję." }, false],
    ["BEZ miejsca", { sektor: "audyt", fala: 1, dzial: "SEC", pozycja: "SEC-01", stwierdzenie: "Handler nie sprawdza nonce przed użyciem danych.", dowod: "Brak wywołania check_admin_referer w całym pliku.", klasyfikacja: "CSRF", wplyw: "Obcy wykona akcję." }, false],
    ["miejsce w NIEISTNIEJĄCYM pliku", { sektor: "audyt", fala: 1, dzial: "SEC", pozycja: "SEC-01", stwierdzenie: "Handler nie sprawdza nonce przed użyciem danych.", miejsce: { rodzaj: "linia", plik: "audyt/nie-ma-mnie.php", linia: 5, tresc: "cokolwiek" }, dowod: "Brak wywołania check_admin_referer.", klasyfikacja: "CSRF", wplyw: "Obcy wykona akcję." }, false],
    ["treść linii NIE ZGADZA SIĘ z plikiem", { sektor: "audyt", fala: 1, dzial: "SEC", pozycja: "SEC-01", stwierdzenie: "Handler nie sprawdza nonce przed użyciem danych.", miejsce: { rodzaj: "linia", plik: "audyt/tools/zgloszenie.mjs", linia: 1, tresc: "tego tam nie ma" }, dowod: "Brak wywołania check_admin_referer.", klasyfikacja: "CSRF", wplyw: "Obcy wykona akcję." }, false],
    ["stwierdzenie niepewne", { sektor: "audyt", fala: 1, dzial: "SEC", pozycja: "SEC-01", stwierdzenie: "Wydaje mi się, że handler nie sprawdza nonce.", miejsce: { rodzaj: "linia", plik: "audyt/tools/zgloszenie.mjs", linia: 1, tresc: "/**" }, dowod: "Brak wywołania check_admin_referer w pliku.", klasyfikacja: "CSRF", wplyw: "Obcy wykona akcję." }, false],
    ["mechanizm bez nazwania, czego brakuje", { sektor: "audyt", fala: 1, dzial: "BE", pozycja: "BE-01", stwierdzenie: "Coś jest nie tak z zapisem w tej metodzie.", miejsce: { rodzaj: "mechanizm", plik: "audyt/tools/wspolne.mjs", zakres: "zapiszJSON", mechanizm: "brak" }, dowod: "Ścieżka zapisu nie ma gałęzi dla braku klucza.", klasyfikacja: "utrata danych", wplyw: "Treść znika." }, false],
    ["ZNACZNIK PRÓBY dopisany do treści wpisu", {
      sektor: "audyt", fala: 1, dzial: "SEC", pozycja: "SEC-03", proba: "E6",
      stwierdzenie: "Zapytanie skleja wartość bez prepare, więc wejście trafia do SQL.",
      miejsce: { rodzaj: "linia", plik: "audyt/tools/zgloszenie.mjs", linia: 1, tresc: "/**" },
      dowod: "Linia widoczna w pliku; wartość pochodzi z żądania.",
      klasyfikacja: "wstrzyknięcie", wplyw: "Obcy może odczytać cudze dane.",
    }, false],
    ["RE-AUDYT: rola własna sektora (PSIARZ)", {
      sektor: "re-audyt", fala: 1, dzial: "PSIARZ", pozycja: "PSIARZ-02",
      stwierdzenie: "Zepsucie tej linii nie zapala żadnego strażnika ani testu.",
      miejsce: { rodzaj: "linia", plik: "audyt/tools/zgloszenie.mjs", linia: 1, tresc: "/**" },
      dowod: "Mutacja przeszła wszystkie bramki na zielono.",
      klasyfikacja: "brak bramki", wplyw: "Nawrót klasy przejdzie niezauważony.",
    }, true],
    ["rola RE-AUDYTU w sektorze AUDYT", {
      sektor: "audyt", fala: 1, dzial: "PSIARZ", pozycja: "PSIARZ-02",
      stwierdzenie: "Zepsucie tej linii nie zapala żadnego strażnika ani testu.",
      miejsce: { rodzaj: "linia", plik: "audyt/tools/zgloszenie.mjs", linia: 1, tresc: "/**" },
      dowod: "Mutacja przeszła wszystkie bramki na zielono.",
      klasyfikacja: "brak bramki", wplyw: "Nawrót klasy przejdzie niezauważony.",
    }, false],
    ["rola AUDYTU (GOLD) w sektorze RE-AUDYT", {
      sektor: "re-audyt", fala: 1, dzial: "GOLD", pozycja: "GOLD-02",
      stwierdzenie: "Wyjście działu nie niesie ani jednego artefaktu z procedury skilla.",
      miejsce: { rodzaj: "linia", plik: "audyt/tools/zgloszenie.mjs", linia: 1, tresc: "/**" },
      dowod: "Raport działu nie zawiera żadnej komendy ani miejsca w kodzie.",
      klasyfikacja: "proces", wplyw: "GOLD-06 nie ma czego sprawdzić.",
    }, false],
    ["runda ponad sufitem W3", { sektor: "audyt", fala: 1, dzial: "SEC", pozycja: "SEC-03", runda: SUFIT_RUND + 1, stwierdzenie: "Zapytanie skleja wartość bez prepare, więc wejście trafia do SQL.", miejsce: { rodzaj: "linia", plik: "audyt/tools/zgloszenie.mjs", linia: 1, tresc: "/**" }, dowod: "Linia widoczna w pliku; wartość pochodzi z żądania.", klasyfikacja: "wstrzyknięcie", wplyw: "Obcy odczyta cudze dane." }, false],
  ];

  let zle = 0;
  for (const [nazwa, wpis, maPrzejsc] of przypadki) {
    const powody = powodyOdmowy(wpis);
    const przeszlo = powody.length === 0;
    const ok = przeszlo === maPrzejsc;
    if (!ok) zle++;
    process.stdout.write(`  ${ok ? "✓" : "✗"} ${maPrzejsc ? "PRZYJĄĆ " : "ODRZUCIĆ"}  ${nazwa}\n`);
    if (!ok && powody.length) process.stdout.write(`      ${powody[0]}\n`);
    if (!ok && !powody.length) process.stdout.write("      (przyjęte, choć miało zostać odrzucone)\n");
  }
  /* ── IDENTYFIKATORY: sektory dzielą katalog, więc nazwa pliku MUSI je
     rozróżniać. Najgroźniejszy przypadek jest ostatni: audyt ma już
     `AUD-SEC-001`, a re-audyt zgłasza w TYM SAMYM dziale — bez własnego
     prefiksu dostałby tę samą nazwę i nadpisałby cudzy wpis. */
  const przypadkiId = [
    ["audyt fali 1 zaczyna od AUD-SEC-F1-001", ["SEC", "audyt", 1, []], "AUD-SEC-F1-001"],
    ["re-audyt zaczyna od REA-SEC-F1-001", ["SEC", "re-audyt", 1, []], "REA-SEC-F1-001"],
    ["numer rośnie w obrębie sektora, działu i fali", ["SEC", "audyt", 1, ["AUD-SEC-F1-001.json", "AUD-SEC-F1-002.json"]], "AUD-SEC-F1-003"],
    ["cudzy sektor NIE podbija numeru", ["SEC", "re-audyt", 1, ["REA-SEC-F1-001.json", "AUD-SEC-F1-009.json"]], "REA-SEC-F1-002"],
    ["re-audyt NIE nadpisuje wpisu audytu", ["SEC", "re-audyt", 1, ["AUD-SEC-F1-001.json"]], "REA-SEC-F1-001"],
    ["FALA 2 zaczyna od 001 — liczba wpisów fali 1 NIE wchodzi do identyfikatora (F3)", ["SEC", "audyt", 2, ["AUD-SEC-F1-001.json", "AUD-SEC-F1-012.json"]], "AUD-SEC-F2-001"],
    ["fala 1 NIE podbija się od wpisów fali 2", ["SEC", "audyt", 1, ["AUD-SEC-F2-004.json", "AUD-SEC-F1-001.json"]], "AUD-SEC-F1-002"],
    ["stary format bez fali NIE wchodzi do puli (jeden format, zero wyjątków)", ["SEC", "audyt", 1, ["AUD-SEC-007.json"]], "AUD-SEC-F1-001"],
  ];
  let zleId = 0;
  for (const [nazwa, [dzial, sektor, fala, istniejace], oczekiwane] of przypadkiId) {
    const dostal = idZgloszenia(dzial, sektor, fala, istniejace);
    const ok = dostal === oczekiwane;
    if (!ok) zleId++;
    process.stdout.write(`  ${ok ? "✓" : "✗"} ID        ${nazwa}\n`);
    if (!ok) process.stdout.write(`      oczekiwano ${oczekiwane}, jest ${dostal}\n`);
  }

  /* ── PRZEBIEG CLI na katalogu tymczasowym — dowód, że narzędzie jest
     PODPIĘTE do tych funkcji i że jego WYJŚCIE nie zdradza fali 1.
     Sprawdzamy KSZTAŁT wyjścia co do linii, nie „brak słowa licznik": agent
     fali 2 ma zobaczyć dokładnie dwie linie — ID i hash — i nic, z czego dałoby
     się odczytać, ile wpisów leży obok. */
  let zleCli = 0;
  const cli = (nazwa, ok, szczegol = "") => {
    if (!ok) zleCli++;
    process.stdout.write(`  ${ok ? "✓" : "✗"} CLI       ${nazwa}${!ok && szczegol ? `\n      ${szczegol}` : ""}\n`);
  };
  const tmp = mkdtempSync(join(tmpdir(), "zgloszenie-"));
  try {
    const wejscie = (fala, nr) => ({
      sektor: "audyt", fala, dzial: "SEC", pozycja: "SEC-03",
      stwierdzenie: `Atrapa samokontroli numer ${nr}: zapytanie skleja wartość bez prepare.`,
      miejsce: { rodzaj: "linia", plik: "audyt/tools/zgloszenie.mjs", linia: 1, tresc: "/**" },
      dowod: "Atrapa samokontroli — nie opuszcza katalogu tymczasowego.",
      klasyfikacja: "atrapa", wplyw: "brak",
    });
    const uruchom = (wpis) => {
      const plik = join(tmp, "wejscie.json");
      writeFileSync(plik, JSON.stringify(wpis), "utf8");
      const r = spawnSync("node", ["audyt/tools/zgloszenie.mjs", `--katalog=${tmp}`, `--plik=${plik}`], { cwd: KORZEN, encoding: "utf8" });
      return { kod: r.status, wyjscie: (r.stdout ?? "") + (r.stderr ?? "") };
    };
    const KSZTALT = /^Przyjęte: (AUD-SEC-F[12]-\d{3})\n  hash miejsca: [0-9a-f]{16}…\n$/;

    const p1 = uruchom(wejscie(1, 1));
    cli("pierwszy wpis fali 1 → kod 0, plik AUD-SEC-F1-001.json", p1.kod === 0 && existsSync(join(tmp, "zgloszenia", "AUD-SEC-F1-001.json")), `kod ${p1.kod}: ${p1.wyjscie.trim()}`);
    cli("wyjście to DOKŁADNIE dwie linie: ID i hash (bez licznika, bez progu)", KSZTALT.test(p1.wyjscie), JSON.stringify(p1.wyjscie));
    const p2 = uruchom(wejscie(1, 2));
    cli("drugi wpis fali 1 → AUD-SEC-F1-002, wyjście dalej bez liczby wpisów", p2.kod === 0 && p2.wyjscie.match(KSZTALT)?.[1] === "AUD-SEC-F1-002", JSON.stringify(p2.wyjscie));
    const p3 = uruchom(wejscie(2, 3));
    cli("pierwszy wpis fali 2 przy dwóch wpisach fali 1 → AUD-SEC-F2-001", p3.kod === 0 && p3.wyjscie.match(KSZTALT)?.[1] === "AUD-SEC-F2-001", JSON.stringify(p3.wyjscie));
    const zapisany = czytajJSON(join(tmp, "zgloszenia", "AUD-SEC-F2-001.json"));
    cli("zapisany wpis niesie id = nazwa pliku, pole fala = 2, hash i status", zapisany?.id === "AUD-SEC-F2-001" && zapisany?.fala === 2 && /^[0-9a-f]{64}$/.test(zapisany?.hash ?? "") && zapisany?.status === "DO WERYFIKACJI");
    const odrzut = uruchom({ ...wejscie(1, 4), stwierdzenie: "Chyba coś tu skleja wartość bez prepare, ale nie wiem." });
    cli("wpis niepewny → kod 1 i ODRZUCONE na wyjściu, bez pliku", odrzut.kod === 1 && /ZGŁOSZENIE ODRZUCONE/.test(odrzut.wyjscie) && !existsSync(join(tmp, "zgloszenia", "AUD-SEC-F1-003.json")), `kod ${odrzut.kod}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }

  const razem = przypadki.length + przypadkiId.length + 6;
  const zleRazem = zle + zleId + zleCli;
  process.stdout.write(`\nSamokontrola zgłoszeń: ${razem - zleRazem}/${razem}\n`);
  return zleRazem === 0;
}

/* ── wejście ── */

/**
 * BRAMKA GŁÓWNEGO MODUŁU. Bez niej samo `import` tego pliku wykonywało CLI:
 * przy braku `--plik=` proces kończył się kodem 1, więc strażnik sektora nie
 * mógł ponownie użyć `powodyOdmowy()` — import zabijałby strażnika. To ta sama
 * klasa co seed wykonujący się przy imporcie (0.33.0), tylko łagodniejsza
 * w skutkach.
 *
 * WZORZEC ODPORNY NA SPACJĘ W NAZWIE KATALOGU. Popularny skrót
 * `import.meta.url === \`file://${process.argv[1]}\`` w katalogu
 * "Pod strona Szkolenia " NIGDY nie jest prawdziwy, bo URL koduje spację jako
 * %20 — narzędzie milczy z kodem 0 i wygląda na sprawne. To jest BLAD-014
 * i pilnuje go `straznik-sciezek` na `main`.
 */
const GLOWNY_MODUL =
  Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (GLOWNY_MODUL) {
const argumenty = process.argv.slice(2);

if (argumenty.includes("--test")) {
  process.exit(samokontrola() ? 0 : 1);
}

const wartoscKatalogu = argumenty.find((a) => a.startsWith("--katalog="))?.slice("--katalog=".length);
const KATALOG_ZGLOSZEN = wartoscKatalogu ? join(resolve(wartoscKatalogu), "zgloszenia") : ZGLOSZENIA;

/* ── znacznik próby budowy (E6) ──────────────────────────────────────────────
   Wpis próbny ZOSTAJE w repozytorium jako materiał dowodowy etapu, ale nie
   może liczyć się jak znalezisko prawdziwej fali: `zgloszenie.mjs` wymusza
   `fala` ∈ {1,2}, więc bez znacznika próba pisałaby wprost do fali 1
   i `porownaj-cykle.mjs` porównywałby ją z prawdziwym przebiegiem.

   Osobna komenda, a nie pole we wpisie: oznaczenie jest decyzją tego, kto
   prowadzi budowę sektora, a nie agenta, który coś znalazł. Znacznik NIGDY
   nie jest cichy — strażnik wypisuje wpisy próbne po ID. */
const oznacz = argumenty.find((a) => a.startsWith("--oznacz-probe="))?.slice("--oznacz-probe=".length);
if (oznacz) {
  const etap = argumenty.find((a) => a.startsWith("--etap="))?.slice("--etap=".length);
  if (!etap || !etap.trim()) {
    process.stdout.write("Znacznik próby musi NAZWAĆ etap budowy: --oznacz-probe=<ID> --etap=E6\n");
    process.exit(1);
  }
  const sciezkaWpisu = join(KATALOG_ZGLOSZEN, `${oznacz}.json`);
  const doOznaczenia = existsSync(sciezkaWpisu) ? czytajJSON(sciezkaWpisu) : null;
  if (!doOznaczenia) {
    process.stdout.write(`Zgłoszenia ${oznacz} nie ma — nie ma czego oznaczyć.\n`);
    process.exit(1);
  }
  if (doOznaczenia.proba) {
    process.stdout.write(`${oznacz} jest już oznaczone jako próba etapu ${doOznaczenia.proba}.\n`);
    process.exit(1);
  }
  doOznaczenia.proba = etap.trim();
  zapiszJSON(sciezkaWpisu, doOznaczenia);
  process.stdout.write(`${oznacz}: oznaczone jako PRÓBA etapu ${doOznaczenia.proba}.\n` +
    "  Wypada z porównania fal i z połączenia sektorów, ale zostaje w repozytorium.\n");
  process.exit(0);
}

const plik = argumenty.find((a) => a.startsWith("--plik="))?.slice("--plik=".length);
if (!plik) {
  process.stdout.write("Użycie: node audyt/tools/zgloszenie.mjs --plik=<wejscie.json> | --oznacz-probe=<ID> --etap=<etap> | --test\n");
  process.exit(1);
}

const wpis = czytajJSON(plik);
if (!wpis) {
  process.stdout.write(`Nie umiem odczytać ${plik}\n`);
  process.exit(1);
}

const powody = powodyOdmowy(wpis);
if (powody.length) {
  process.stdout.write("ZGŁOSZENIE ODRZUCONE — zasada 1: nie ma wymyślania błędów.\n\n");
  for (const p of powody) process.stdout.write(`  - ${p}\n`);
  process.exit(1);
}

const id = nastepneId(wpis.dzial, wpis.sektor, wpis.fala, KATALOG_ZGLOSZEN);
const gotowe = {
  id,
  ...wpis,
  status: wpis.status ?? "DO WERYFIKACJI",
  runda: wpis.runda ?? 1,
  hash: hashMiejsca(wpis.miejsce),
  werdykt: wpis.werdykt ?? null,
};
zapiszJSON(join(KATALOG_ZGLOSZEN, `${id}.json`), gotowe);

/* TYLKO ID I HASH. Liczba wpisów w sektorze i próg 200 (SQLite, W4) NIE są
   drukowane agentowi — czyta je kierownik w `status.mjs --pokaz` i strażnik
   sektora (reguła 5). Samokontrola sprawdza KSZTAŁT tego wyjścia co do linii. */
process.stdout.write(`Przyjęte: ${id}\n  hash miejsca: ${gotowe.hash.slice(0, 16)}…\n`);
}
