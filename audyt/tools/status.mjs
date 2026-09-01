/**
 * STATUS pracy roli — pięć stanów z §6 regulaminu i licznik rund pętli (W3).
 *
 * Stan roli jest PLIKIEM, nie pamięcią rozmowy: przebieg sektora nie zmieści
 * się w jednej sesji (ponad 150 uruchomień), więc po `/clear` musi dać się
 * odtworzyć, na czym stanęliśmy.
 *
 * SUFIT RUND = 5 (rozstrzygnięcie właściciela 2026-09-01). Agent pętlowy kończy,
 * gdy przeszedł CAŁĄ checklistę **albo** wyczerpał sufit — a przy suficie
 * **musi zapisać, których pozycji nie domknął**. Ciche urwanie po piątej rundzie
 * byłoby luką nie do odróżnienia od kompletnej pracy.
 *
 * Użycie:
 *   node audyt/tools/status.mjs --pokaz
 *   node audyt/tools/status.mjs --rola=SEC --fala=1 --status="W TRAKCIE"
 *   node audyt/tools/status.mjs --rola=SEC --fala=1 --runda
 *   node audyt/tools/status.mjs --rola=SEC --fala=1 --status=ZAKOŃCZONE --niedomkniete=SEC-07,SEC-11
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { DZIALY, PROCESOWE, SEKTOR, STATUSY, SUFIT_RUND, czytajJSON, zapiszJSON } from "./wspolne.mjs";

const KATALOG = join(SEKTOR, "stan");
const plikRoli = (sektor, fala, rola) => join(KATALOG, `${sektor}-f${fala}-${rola}.json`);

const arg = process.argv.slice(2);
const wartosc = (n) => arg.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);

if (arg.includes("--pokaz")) {
  if (!existsSync(KATALOG)) {
    process.stdout.write("Żadna rola nie zaczęła pracy.\n");
    process.exit(0);
  }
  const wpisy = readdirSync(KATALOG).filter((f) => f.endsWith(".json")).sort()
    .map((f) => czytajJSON(join(KATALOG, f)));
  process.stdout.write("STAN RÓL\n\n");
  for (const w of wpisy) {
    const ostrzezenie = w.runda >= SUFIT_RUND && w.status !== "ZAKOŃCZONE" ? "  ← SUFIT RUND" : "";
    process.stdout.write(
      `  ${w.sektor.padEnd(9)} f${w.fala}  ${w.rola.padEnd(6)} ${w.status.padEnd(15)} runda ${w.runda}/${SUFIT_RUND}${ostrzezenie}\n`
    );
    if (w.niedomkniete?.length) {
      process.stdout.write(`      NIEDOMKNIĘTE: ${w.niedomkniete.join(", ")}\n`);
    }
  }
  const wiszace = wpisy.filter((w) => w.runda >= SUFIT_RUND && w.status !== "ZAKOŃCZONE");
  process.exit(wiszace.length ? 1 : 0);
}

const rola = wartosc("rola");
const fala = Number(wartosc("fala") ?? 1);
const sektor = wartosc("sektor") ?? "audyt";
if (!rola || ![...DZIALY, ...PROCESOWE].includes(rola)) {
  process.stdout.write(`Nieznana rola "${rola}". Znane: ${[...DZIALY, ...PROCESOWE].join(", ")}\n`);
  process.exit(1);
}

const sciezka = plikRoli(sektor, fala, rola);
const stan = czytajJSON(sciezka, { sektor, fala, rola, status: "NIE ROZPOCZĘTO", runda: 0, niedomkniete: [] });

if (arg.includes("--runda")) {
  stan.runda += 1;
  if (stan.runda > SUFIT_RUND) {
    process.stdout.write(
      `SUFIT RUND przekroczony (${SUFIT_RUND}). Rola ${rola} ma teraz ZAKOŃCZYĆ pracę\n` +
      "i zapisać, których pozycji checklisty nie domknęła:\n" +
      `  node audyt/tools/status.mjs --rola=${rola} --fala=${fala} --status=ZAKOŃCZONE --niedomkniete=<lista>\n`
    );
    process.exit(1);
  }
}

const nowy = wartosc("status");
if (nowy) {
  if (!STATUSY.includes(nowy)) {
    process.stdout.write(`Nieznany status "${nowy}". Znane: ${STATUSY.join(" | ")}\n`);
    process.exit(1);
  }
  stan.status = nowy;
}

const niedomkniete = wartosc("niedomkniete");
if (niedomkniete !== undefined) stan.niedomkniete = niedomkniete.split(",").map((s) => s.trim()).filter(Boolean);

// Zakończenie z niedomkniętymi pozycjami jest DOZWOLONE, ale musi być JAWNE.
if (stan.status === "ZAKOŃCZONE" && stan.runda >= SUFIT_RUND && !stan.niedomkniete.length) {
  process.stdout.write(
    `Rola ${rola} wyczerpała sufit rund, a lista niedomkniętych pozycji jest pusta.\n` +
    "Albo checklista naprawdę została przejdzona do końca — wtedy zejdź z rundami,\n" +
    "albo podaj --niedomkniete=<lista>. Cisza po sufitcie jest luką.\n"
  );
  process.exit(1);
}

zapiszJSON(sciezka, stan);
process.stdout.write(`${sektor} f${fala} ${rola}: ${stan.status}, runda ${stan.runda}/${SUFIT_RUND}\n`);
if (stan.niedomkniete.length) process.stdout.write(`  niedomknięte: ${stan.niedomkniete.join(", ")}\n`);
