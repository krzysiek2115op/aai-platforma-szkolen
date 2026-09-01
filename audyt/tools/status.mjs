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

/**
 * NIEDOMKNIĘTE POZYCJE to KODY, nie proza — i narzędzie tego pilnuje.
 *
 * Zmierzone przy próbie E6: rola podała siedem pozycji z komentarzami
 * w nawiasach, a `split(",")` pociął komentarze na osobne wpisy i zapisał
 * DZIEWIĘĆ — w tym dwa, które pozycjami nie są („zgodnie z zakresem próby").
 * Kierownik czyta stąd LICZBĘ niedomkniętych, a `porownaj-cykle.mjs` bierze ją
 * jako daną wejściową do K4', więc dziennik audytu podawał nieprawdę.
 *
 * Wzorzec pyta o KSZTAŁT KODU, nie o obecność myślnika: „PIK-01" przechodzi,
 * „PIK-01 (bo nie zdążyłem)" nie. Powód, dlaczego pozycja została niedomknięta,
 * należy do raportu działu — nie do pola, które się liczy.
 */
const KOD_POZYCJI = /^[A-Z]{2,5}-\d{2}$/;

const niedomkniete = wartosc("niedomkniete");
if (niedomkniete !== undefined) {
  const czesci = niedomkniete.split(",").map((s) => s.trim()).filter(Boolean);
  const zle = czesci.filter((c) => !KOD_POZYCJI.test(c));
  if (zle.length) {
    process.stdout.write(
      "Lista niedomkniętych przyjmuje WYŁĄCZNIE kody pozycji (np. PIK-02,PIK-07).\n" +
      "Kierownik liczy stąd, ile pozycji zostało otwartych, a porownaj-cykle.mjs\n" +
      "bierze tę liczbę do porównania fal — komentarz rozbity przecinkiem zapisałby\n" +
      "się jako osobna „pozycja\" i zafałszował dziennik.\n\n" +
      "Nie są kodami pozycji:\n" +
      zle.map((z) => `  - ${z}\n`).join("") +
      "\nPowód, dlaczego pozycja została niedomknięta, opisz w raporcie działu.\n"
    );
    process.exit(1);
  }
  stan.niedomkniete = czesci;
}

/**
 * ZAKOŃCZENIE ZNACZY, ŻE ODBYŁA SIĘ CO NAJMNIEJ JEDNA RUNDA.
 *
 * Zmierzone przy próbie E6: rola przeszła całą swoją checklistę w jednym
 * przebiegu, nie wywołała `--runda` ani razu i zamknęła się z licznikiem
 * `0/5`. Kierownik czyta liczbę rund jako miarę pracy, więc „ZAKOŃCZONE,
 * runda 0" znaczy dla niego „nie zrobiła nic" — przy roli, która zrobiła
 * wszystko. Zero rund przy zakończeniu jest sprzeczne samo w sobie.
 */
if (stan.status === "ZAKOŃCZONE" && stan.runda === 0) stan.runda = 1;

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
