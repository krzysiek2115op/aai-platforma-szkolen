/**
 * POŁĄCZENIE AUDYTU Z RE-AUDYTEM (W4) — "aby nic nie pogubili, nic nie zapomnieli".
 *
 * Łączymy po HASHU MIEJSCA, nie po opisie: audyt ustala OBRAZ ("czy tu jest
 * problem?"), re-audyt mierzy ZASIĘG ("ile go dokładnie jest i czy cokolwiek
 * to łapie?") — te same miejsca opisują innymi słowami.
 *
 * NOŚNIK: plik do 200 zgłoszeń, powyżej SQLite (rozstrzygnięcie właściciela
 * 2026-09-01). Format wpisu jest TEN SAM w obu nośnikach — zmienia się warstwa
 * zapisu, nie dane. `node:sqlite` jest w standardzie node 26, więc przejście
 * nie dokłada zależności.
 *
 * Użycie: node audyt/tools/polacz-sektory.mjs [--fala=1]
 */
import { join } from "node:path";
import { PROG_BAZY, SEKTOR, bezProb, notaOProbach, wszystkieZgloszenia, zapiszJSON } from "./wspolne.mjs";

const fala = Number(process.argv.find((a) => a.startsWith("--fala="))?.split("=")[1] ?? 1);
// Wpisy PRÓBNE nie są znaleziskiem przebiegu — patrz `bezProb()`.
const { wpisy: wszystkie, proby } = bezProb(wszystkieZgloszenia().filter((z) => z.fala === fala));
const audyt = wszystkie.filter((z) => z.sektor === "audyt");
const reAudyt = wszystkie.filter((z) => z.sektor === "re-audyt");

const poHashu = new Map();
for (const z of audyt) {
  poHashu.set(z.hash, { hash: z.hash, miejsce: z.miejsce, audyt: z, reAudyt: null });
}
for (const z of reAudyt) {
  const wpis = poHashu.get(z.hash);
  if (wpis) wpis.reAudyt = z;
  else poHashu.set(z.hash, { hash: z.hash, miejsce: z.miejsce, audyt: null, reAudyt: z });
}

const polaczone = [...poHashu.values()];
const obustronne = polaczone.filter((w) => w.audyt && w.reAudyt);
const samAudyt = polaczone.filter((w) => w.audyt && !w.reAudyt);
const samReAudyt = polaczone.filter((w) => !w.audyt && w.reAudyt);

zapiszJSON(join(SEKTOR, "wyniki", `polaczone-f${fala}.json`), {
  fala,
  razem: polaczone.length,
  obustronne: obustronne.length,
  tylko_audyt: samAudyt.length,
  tylko_re_audyt: samReAudyt.length,
  wpisy: polaczone,
});

process.stdout.write(
  `POŁĄCZENIE SEKTORÓW — fala ${fala}\n\n` +
  `  miejsc razem:        ${polaczone.length}\n` +
  `  potwierdzone przez oba: ${obustronne.length}\n` +
  `  tylko audyt:         ${samAudyt.length}\n` +
  `  tylko re-audyt:      ${samReAudyt.length}\n` +
  notaOProbach(proby) + "\n"
);

for (const w of samAudyt) {
  process.stdout.write(`  TYLKO AUDYT     ${w.audyt.id}  ${w.miejsce.plik}\n`);
}
for (const w of samReAudyt) {
  process.stdout.write(`  TYLKO RE-AUDYT  ${w.reAudyt.id}  ${w.miejsce.plik}\n`);
}

if (samAudyt.length) {
  process.stdout.write(
    "\nMiejsce, które zna audyt, a nie zna re-audyt, jest pytaniem do re-audytu:\n" +
    "albo go nie sprawdził, albo sprawdził i nie potwierdził — a wtedy powinien\n" +
    "mieć własny wpis z werdyktem, nie milczeć.\n"
  );
}

if (polaczone.length > PROG_BAZY) {
  process.stdout.write(
    `\nPRÓG NOŚNIKA: ${polaczone.length} > ${PROG_BAZY}. Czas przełączyć zapis na SQLite (W4).\n` +
    "Format wpisu zostaje ten sam — zmienia się wyłącznie warstwa zapisu.\n"
  );
}

process.exit(0);
