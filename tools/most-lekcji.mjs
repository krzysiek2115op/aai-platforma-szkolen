// Sprawdza, czy MOST między lekcjami jest PODJĘTY, a nie PRZEPISANY.
//
// Usterka, której pilnuje: autor następnej lekcji przepisuje domknięcie
// poprzedniej co do znaku, więc czytelnik dostaje ten sam akapit dwa razy
// pod rząd. W module 4 Kursu 2 popełniło ją TRZECH autorów na sześciu
// (121, 100 i 88 znaków wspólnego ciągu).
//
// Próg z briefów: żaden wspólny ciąg dłuższy niż 40 znaków między
// sekcją `## Co dalej` poprzedniej lekcji a pierwszym akapitem następnej.
//
// Użycie:
//   node tools/most-lekcji.mjs <proza-poprzednia.md> <proza-nastepna.md>
// Kod wyjścia: 0 = most podjęty, 1 = przepisany, 2 = błąd użycia.
//
// UWAGA przy rozbudowie: ostatnią lekcję poprzedniego modułu bierz
// z ODCZYTU KATALOGU, nie z ręcznie podanej ścieżki. Przy pierwszym
// pomiarze modułu 5 porównano 5.1 z `proza-6` modułu 4, podczas gdy
// ostatnią lekcją tego modułu jest `proza-7` — wynik i tak wyszedł
// zielony, więc pomyłka była niewidoczna.
import { readFileSync } from "node:fs";

const PROG = 40;

function normalizuj(s) {
  return s.replace(/\s+/g, " ").trim();
}

function domkniecie(plik) {
  const t = readFileSync(plik, "utf8");
  const m = t.match(/^## Co dalej\s*\n+([\s\S]*?)(?=\n## )/m);
  if (!m) throw new Error(`brak sekcji "## Co dalej" w ${plik}`);
  return normalizuj(m[1]);
}

function pierwszyAkapit(plik) {
  const t = readFileSync(plik, "utf8");
  const bezFrontmatteru = t.replace(/^---\n[\s\S]*?\n---\n/, "");
  const akapit = bezFrontmatteru.split(/\n\s*\n/).find((a) => a.trim() && !a.startsWith("#"));
  if (!akapit) throw new Error(`nie znalazłem pierwszego akapitu w ${plik}`);
  return normalizuj(akapit);
}

// najdłuższy wspólny podciąg ciągły, po znakach
function najdluzszyWspolny(a, b) {
  let best = "";
  const prev = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    let diagPrev = 0;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      if (a[i - 1] === b[j - 1]) {
        prev[j] = diagPrev + 1;
        if (prev[j] > best.length) best = a.slice(i - prev[j], i);
      } else {
        prev[j] = 0;
      }
      diagPrev = tmp;
    }
  }
  return best;
}

const [poprzednia, nastepna] = process.argv.slice(2);
if (!poprzednia || !nastepna) {
  console.error("użycie: node most.mjs <proza-poprzednia.md> <proza-nastepna.md>");
  process.exit(2);
}

const dom = domkniecie(poprzednia);
const otw = pierwszyAkapit(nastepna);
const wspolny = najdluzszyWspolny(dom, otw);

console.log(`domknięcie  : ${dom.length} zn.`);
console.log(`otwarcie    : ${otw.length} zn.`);
console.log(`wspólny ciąg: ${wspolny.length} zn. (próg ${PROG})`);
if (wspolny.length) console.log(`  → "${wspolny}"`);

if (wspolny.length > PROG) {
  console.log("\n❌ MOST PRZEPISANY, nie podjęty — do poprawy.");
  process.exit(1);
}
console.log("\n✅ most podjęty.");
