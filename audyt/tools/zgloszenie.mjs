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
 * ID NADAJE TO NARZĘDZIE, nie agent (§11) — numer jest kolejny w obrębie działu.
 *
 * Użycie:
 *   node audyt/tools/zgloszenie.mjs --plik=<wejscie.json>
 *   node audyt/tools/zgloszenie.mjs --test        # samokontrola, patrz niżej
 *
 * Kod wyjścia 0 = przyjęte, 1 = odrzucone (z powodem na wyjściu).
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DZIALY, KORZEN, NIEPEWNOSC, PROCESOWE, PROG_BAZY, STATUSY, SUFIT_RUND,
  ZGLOSZENIA, czytajJSON, hashMiejsca, wszystkieZgloszenia, zapiszJSON, znormalizuj,
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

  if (!["audyt", "re-audyt"].includes(z.sektor)) bledy.push(`nieznany sektor "${z.sektor}"`);
  if (![1, 2].includes(z.fala)) bledy.push(`fala musi być 1 albo 2, jest "${z.fala}"`);
  if (![...DZIALY, ...PROCESOWE].includes(z.dzial)) bledy.push(`nieznany dział "${z.dzial}"`);
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

/** Kolejny numer w dziale — ID nadaje narzędzie, nie agent (§11). */
function nastepneId(dzial) {
  const istniejace = existsSync(ZGLOSZENIA)
    ? readdirSync(ZGLOSZENIA).filter((f) => f.startsWith(`AUD-${dzial}-`))
    : [];
  const numery = istniejace.map((f) => Number(f.match(/-(\d+)\.json$/)?.[1] ?? 0));
  const kolejny = (numery.length ? Math.max(...numery) : 0) + 1;
  return `AUD-${dzial}-${String(kolejny).padStart(3, "0")}`;
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
  process.stdout.write(`\nSamokontrola zgłoszeń: ${przypadki.length - zle}/${przypadki.length}\n`);
  return zle === 0;
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
  const sciezkaWpisu = join(ZGLOSZENIA, `${oznacz}.json`);
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

const id = nastepneId(wpis.dzial);
const gotowe = {
  id,
  ...wpis,
  status: wpis.status ?? "DO WERYFIKACJI",
  runda: wpis.runda ?? 1,
  hash: hashMiejsca(wpis.miejsce),
  werdykt: wpis.werdykt ?? null,
};
zapiszJSON(join(ZGLOSZENIA, `${id}.json`), gotowe);

const ile = wszystkieZgloszenia().length;
process.stdout.write(`Przyjęte: ${id}\n  hash miejsca: ${gotowe.hash.slice(0, 16)}…\n  zgłoszeń w sektorze: ${ile}\n`);
if (ile > PROG_BAZY) {
  process.stdout.write(`\nUWAGA: przekroczony próg ${PROG_BAZY} zgłoszeń — czas przełączyć nośnik na SQLite (W4).\n`);
}
}
