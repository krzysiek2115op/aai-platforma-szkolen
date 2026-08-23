// Wpina gotowe zrzuty w prozę: <!-- ZRZUT: podpis --> → ![podpis](sciezka)
// Znacznik ZOSTAJE tam, gdzie pliku obrazu jeszcze nie ma — licznik ZRZUT
// pokazuje wtedy dokładnie, ile miejsc czeka.
// node wepnij.mjs <manifest.json> [--sprawdz]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

const manifest = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const sprawdz = process.argv.includes('--sprawdz');
const KORZEN = process.env.ZRZUTY_KORZEN ?? process.cwd();
const wgPliku = new Map();
for (const it of manifest) {
  if (!wgPliku.has(it.plik)) wgPliku.set(it.plik, []);
  wgPliku.get(it.plik).push(it);
}
let wpiete = 0, czeka = 0, brakPodpisu = 0;
for (const [plik, pozycje] of wgPliku) {
  const pelna = join(KORZEN, plik);
  const linie = readFileSync(pelna, 'utf8').split('\n');
  // Ścieżkę obrazu rozwiązujemy OD KATALOGU PLIKU LEKCJI — dokładnie tak, jak
  // czyta ją straznik-linkow i jak zadziała odsyłacz w Markdownie.
  const katLekcji = dirname(pelna);
  let zmiana = false;
  for (const poz of pozycje) {
    const i = poz.linia - 1;
    const linia = linie[i];
    if (!linia?.includes('<!-- ZRZUT:')) continue;             // już wpięty albo przesunięty
    // Nazwa pliku bierze się z planu (`obraz_plan`). Wyjście `manifest.mjs --json`
    // planu NIE zawiera — ma `obraz` (null, póki zrzutu nie ma). Bez tego wiersza
    // wepnij PADAŁO na `join(kat, undefined)` zamiast powiedzieć, czego mu brak.
    const planowany = poz.obraz_plan ?? poz.obraz;
    if (!planowany) { czeka++; continue; }
    const obraz = join(katLekcji, planowany);
    if (!existsSync(obraz)) { czeka++; continue; }
    const podpis = linia.replace(/^.*<!-- ZRZUT:\s*/, '').replace(/\s*-->.*$/, '').trim();
    if (!podpis) { brakPodpisu++; continue; }
    const alt = podpis.replace(/\[/g, '(').replace(/\]/g, ')');
    linie[i] = `![${alt}](${planowany})`;
    zmiana = true; wpiete++;
  }
  if (zmiana && !sprawdz) writeFileSync(pelna, linie.join('\n'));
}
console.log(`${sprawdz ? '--sprawdz: ' : ''}wpięte: ${wpiete}, czekają na zrzut: ${czeka}${brakPodpisu ? `, BEZ PODPISU: ${brakPodpisu}` : ''}`);
