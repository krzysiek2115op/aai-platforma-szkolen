/**
 * PORÓWNANIE FAL — test powtarzalności z §15 regulaminu.
 *
 * K4' (rozstrzygnięcie właściciela): **druga fala musi dać ten sam wynik.
 * Jeśli nie da — źle zrobiliśmy audyt.** Rozjazd NIE jest powodem do odrzucenia
 * znaleziska; jest sygnałem DEFEKTU SEKTORA. Wracamy naprawić audyt i powtarzamy.
 *
 * Porównanie idzie po HASHU MIEJSCA, nie po opisie — dwa opisy tego samego
 * miejsca brzmią inaczej za każdym razem, a hash jest ten sam.
 *
 * ŚLEPOTA FALI 2. Agenci drugiej fali nie mogą widzieć wyników pierwszej,
 * inaczej przepiszą cudzą listę i "ten sam wynik" wyjdzie ZAWSZE — także
 * gdyby audyt był zepsuty. To narzędzie jest trzecią warstwą tej ochrony
 * (obok zakazu w prompcie i czystego kontekstu subagenta): sprawdza, czy
 * zgłoszenia fali 2 nie są kopią fali 1 co do słowa.
 *
 * Użycie: node audyt/tools/porownaj-cykle.mjs [--sektor=audyt]
 * Kod 0 = fale zgodne, 1 = rozjazd (defekt audytu) albo podejrzenie kopiowania.
 */
import { bezProb, notaOProbach, wszystkieZgloszenia, znormalizuj } from "./wspolne.mjs";

const sektor = process.argv.find((a) => a.startsWith("--sektor="))?.split("=")[1] ?? "audyt";
// Wpisy PRÓBNE (etapy budowy) siedzą w prawdziwej fali, bo `fala` może być
// tylko 1 albo 2 — i porównywane z prawdziwym przebiegiem wyglądałyby jak
// rozjazd fal, czyli jak DEFEKT AUDYTU, którym nie są.
const { wpisy: wszystkie, proby } = bezProb(wszystkieZgloszenia().filter((z) => z.sektor === sektor));
const f1 = wszystkie.filter((z) => z.fala === 1);
const f2 = wszystkie.filter((z) => z.fala === 2);

if (!f1.length || !f2.length) {
  process.stdout.write(`Sektor "${sektor}": fala 1 = ${f1.length} zgłoszeń, fala 2 = ${f2.length}.\n` +
    notaOProbach(proby) +
    "Porównanie wymaga obu fal.\n");
  process.exit(1);
}

const h1 = new Map(f1.map((z) => [z.hash, z]));
const h2 = new Map(f2.map((z) => [z.hash, z]));

const tylkoW1 = [...h1.keys()].filter((h) => !h2.has(h));
const tylkoW2 = [...h2.keys()].filter((h) => !h1.has(h));
const wspolne = [...h1.keys()].filter((h) => h2.has(h));

/* ── ślepota fali 2: identyczne stwierdzenie CO DO SŁOWA jest podejrzane ── */
const podejrzane = wspolne.filter((h) => znormalizuj(h1.get(h).stwierdzenie) === znormalizuj(h2.get(h).stwierdzenie));

/* ── rozjazd przypisania działu przy tym samym miejscu = nieostra granica ── */
const innyDzial = wspolne
  .filter((h) => h1.get(h).dzial !== h2.get(h).dzial)
  .map((h) => ({ hash: h, f1: h1.get(h).dzial, f2: h2.get(h).dzial, gdzie: h1.get(h).miejsce.plik }));

process.stdout.write(
  `PORÓWNANIE FAL — sektor "${sektor}"\n\n` +
  `  fala 1:            ${f1.length} zgłoszeń\n` +
  `  fala 2:            ${f2.length} zgłoszeń\n` +
  `  wspólne miejsca:   ${wspolne.length}\n` +
  `  tylko w fali 1:    ${tylkoW1.length}\n` +
  `  tylko w fali 2:    ${tylkoW2.length}\n` +
  `  inny dział:        ${innyDzial.length}\n` +
  `  identyczny opis:   ${podejrzane.length}\n` +
  notaOProbach(proby) + "\n"
);

for (const h of tylkoW1) {
  const z = h1.get(h);
  process.stdout.write(`  TYLKO F1  ${z.id} ${z.dzial}/${z.pozycja}  ${z.miejsce.plik}\n`);
}
for (const h of tylkoW2) {
  const z = h2.get(h);
  process.stdout.write(`  TYLKO F2  ${z.id} ${z.dzial}/${z.pozycja}  ${z.miejsce.plik}\n`);
}
for (const r of innyDzial) {
  process.stdout.write(`  GRANICA   to samo miejsce trafiło do ${r.f1} i do ${r.f2} — ${r.gdzie}\n`);
}

const zgodne = !tylkoW1.length && !tylkoW2.length && !innyDzial.length;

if (podejrzane.length) {
  process.stdout.write(
    `\nPODEJRZENIE KOPIOWANIA: ${podejrzane.length} zgłoszeń ma stwierdzenie IDENTYCZNE co do słowa.\n` +
    "Dwie niezależne fale opisują to samo miejsce innymi słowami. Identyczność\n" +
    "znaczy, że fala 2 najprawdopodobniej widziała wyniki fali 1 — a wtedy\n" +
    "\"ten sam wynik\" nie dowodzi niczego.\n"
  );
  process.exit(1);
}

if (zgodne) {
  process.stdout.write("FALE ZGODNE — błędy potwierdzone, można przejść do naprawy (§19).\n");
  process.exit(0);
}

process.stdout.write(
  "\nROZJAZD FAL = DEFEKT AUDYTU (K4').\n" +
  "To NIE jest powód do odrzucenia znaleziska. Kod się nie zmienił, więc różnica\n" +
  "pochodzi z sektora: nieostra granica, checklista dopuszczająca uznaniowość albo\n" +
  "zakres, który w jednej fali objął co innego. Napraw sektor i powtórz obie fale.\n"
);
process.exit(1);
