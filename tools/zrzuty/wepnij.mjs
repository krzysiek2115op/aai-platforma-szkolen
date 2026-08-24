// Wpina gotowe zrzuty w prozę: <!-- ZRZUT: podpis --> → ![podpis](sciezka)
// Znacznik ZOSTAJE tam, gdzie pliku obrazu jeszcze nie ma — licznik ZRZUT
// pokazuje wtedy dokładnie, ile miejsc czeka.
//
//   node wepnij.mjs tools/zrzuty/spec/k1 [--sprawdz]   ← specyfikacje z repo
//   node wepnij.mjs plan.json            [--sprawdz]   ← stary tryb (tablica pozycji)
//
// TRYB ZE SPECYFIKACJI. Skoro specyfikacja niesie i podpis (`_podpis`), i plik
// wyjściowy, to ona jest jedynym źródłem prawdy o tym, co gdzie wpiąć — plan
// w scratchpadzie mógł się z nią rozjechać. Pozycję w prozie znajdujemy PO
// PODPISIE, nie po numerze wiersza: podpisy bywają poprawiane (klasa usterki
// z 2026-08-23), a wtedy numer wiersza wskazuje cudze miejsce. Podpis, którego
// w prozie nie ma, jest BŁĘDEM — to znaczy, że specyfikacja opisuje nieistniejące
// już miejsce.
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execSync } from 'node:child_process';

const zrodlo = process.argv[2];
const manifest = statSync(zrodlo).isDirectory() ? zeSpecyfikacji(zrodlo) : JSON.parse(readFileSync(zrodlo, 'utf8'));

function zeSpecyfikacji(katalog) {
  const KORZEN = process.env.ZRZUTY_KORZEN ?? process.cwd();
  const miejsca = JSON.parse(execSync(`node ${join(KORZEN, 'tools/zrzuty/manifest.mjs')} --json`, {
    encoding: 'utf8', env: { ...process.env, ZRZUTY_KORZEN: KORZEN }, maxBuffer: 40 * 1024 * 1024 }));
  const poz = [];
  for (const plik of readdirSync(katalog).filter((f) => f.endsWith('.json')).sort()) {
    const spec = JSON.parse(readFileSync(join(katalog, plik), 'utf8'));
    const podpis = (spec._podpis ?? '').trim();
    const trafienia = miejsca.filter((m) => m.podpis.trim() === podpis);
    if (trafienia.length !== 1) {
      console.error(`wepnij: ${plik} — podpis ${JSON.stringify(podpis)} pasuje do ${trafienia.length} miejsc w prozie (oczekiwano 1)`);
      process.exit(3);
    }
    // Ścieżka w prozie jest WZGLĘDNA OD PLIKU LEKCJI (tak czyta ją straznik-linkow),
    // czyli `zrzuty/<plik>` — nie sama nazwa pliku.
    poz.push({ ...trafienia[0], obraz_plan: spec.wyjscie.split('/').slice(-2).join('/') });
  }
  return poz;
}
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
