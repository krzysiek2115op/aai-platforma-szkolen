import { puppeteer, sharp } from './zaleznosci.mjs';
/**
 * Renderuje SUROWY strumień terminala (nagrany przez sesja-tui.sh) na obraz.
 *
 *   node tui.mjs <spec.json>
 *   spec: { raw, wyjscie, kolumny?, wiersze?, tytul?, przytnijOd?, przytnijDo?,
 *           patch?: [{z, na}], jakosc? }
 *
 * Dlaczego przez xterm.js, a nie przez własne parsowanie ANSI: TUI Claude Code
 * przerysowuje ekran w miejscu (kursor, czyszczenie linii, kolory 256), więc
 * jedynym wiernym „ekranem" jest stan PRAWDZIWEGO emulatora po odtworzeniu
 * całego strumienia. terminal.mjs renderuje pary komenda/wyjście i tu nie
 * wystarcza.
 *
 * przytnijOd/przytnijDo tną WIERSZE gotowego ekranu (1-indeksowane, włącznie) —
 * kadr robimy po treści, a nie pikselami na oko.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const spec = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const RIG = process.env.ZRZUTY_RIG;
const xtermJs = join(RIG, 'node_modules/@xterm/xterm/lib/xterm.js');
const xtermCss = join(RIG, 'node_modules/@xterm/xterm/css/xterm.css');
if (!existsSync(xtermJs)) { console.error('tui: brak @xterm/xterm w ZRZUTY_RIG (npm i @xterm/xterm)'); process.exit(2); }

let surowy = readFileSync(spec.raw);
// Prefiks strumienia = ekran w chwili ZNACZNIKA. Renderowanie prefiksu jest
// wierne, bo emulator dochodzi do dokładnie tego stanu, który wtedy widniał.
if (spec.doZnacznika) {
  const plik = `${spec.raw}.znaczniki`;
  if (!existsSync(plik)) { console.error(`tui: brak ${plik} — sesja nagrana bez ZNACZNIK-ów`); process.exit(4); }
  const wpis = readFileSync(plik, 'utf8').split('\n').map((l) => l.trim().split(/\s+/))
    .find(([n]) => n === spec.doZnacznika);
  if (!wpis) { console.error(`tui: nie ma znacznika "${spec.doZnacznika}" w ${plik}`); process.exit(4); }
  surowy = surowy.subarray(0, Number(wpis[1]));
}
// REGUŁA PRYWATNOŚCI. Podmiany MUSZĄ zachować długość — TUI rysuje ramki,
// więc krótszy tekst rozjeżdża prawą krawędź panelu.
const PODMIANY = [
  ['krzysztof2006oskar@wp.pl', 'oliwia.dev@przyklady.com'],
  ['krzysiek2115op', 'oliwia-dev'],
  ...(spec.patch ?? []).map((p) => [p.z, p.na]),
];
let tekst = surowy.toString('latin1');
for (const [z, na] of PODMIANY) {
  if (!tekst.includes(z)) continue;
  if (na.length > z.length) { console.error(`tui: podmiana "${z}"→"${na}" JEST DŁUŻSZA (${z.length}→${na.length}) i rozjedzie ramki`); process.exit(3); }
  tekst = tekst.split(z).join(na.padEnd(z.length));   // dopełnienie spacjami trzyma szerokość
}
surowy = Buffer.from(tekst, 'latin1');

const kolumny = spec.kolumny ?? 120, wiersze = spec.wiersze ?? 40;
const html = `<!doctype html><meta charset="utf-8">
<style>${readFileSync(xtermCss, 'utf8')}
 html,body{margin:0;background:#12151b}
 #obudowa{width:max-content;background:#12151b;border:1px solid #232833;border-radius:10px;overflow:hidden}
 #pasek{height:34px;background:#1b1f27;display:flex;align-items:center;padding:0 12px;gap:7px;border-bottom:1px solid #232833}
 .k{width:11px;height:11px;border-radius:50%}.k1{background:#ff5f57}.k2{background:#febc2e}.k3{background:#28c840}
 .t{color:#8b949e;font-size:12.5px;margin-left:10px;font-family:sans-serif}
 #ekran{padding:12px 14px}
 .xterm .xterm-viewport{overflow:hidden!important;background:transparent!important}
</style>
<div id="obudowa"><div id="pasek"><i class="k k1"></i><i class="k k2"></i><i class="k k3"></i>
<span class="t">${(spec.tytul ?? 'Claude Code').replace(/</g, '&lt;')}</span></div>
<div id="ekran"></div></div>
<script>${readFileSync(xtermJs, 'utf8')}</script>`;

const b = await puppeteer.launch({ browser: 'firefox', executablePath: '/usr/bin/firefox', headless: true,
  protocol: 'webDriverBiDi', args: ['-width', '2200', '-height', '1400'] });
try {
  const page = await b.newPage();
  await page.setViewport({ width: 2000, height: 1300, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(({ kolumny, wiersze }) => {
    window.__term = new window.Terminal({
      cols: kolumny, rows: wiersze, scrollback: 0, convertEol: false,
      fontFamily: '"JetBrainsMono Nerd Font","DejaVu Sans Mono",monospace',
      fontSize: 14, lineHeight: 1.22, letterSpacing: 0, cursorBlink: false, cursorStyle: 'block',
      theme: { background: '#12151b', foreground: '#c9d1d9', cursor: '#57c7ff', selectionBackground: '#264f78',
               black: '#12151b', red: '#ff6e67', green: '#5af78e', yellow: '#f4f99d', blue: '#57c7ff',
               magenta: '#ff6ac1', cyan: '#9aedfe', white: '#c9d1d9', brightBlack: '#6b7280',
               brightRed: '#ff6e67', brightGreen: '#5af78e', brightYellow: '#f4f99d', brightBlue: '#57c7ff',
               brightMagenta: '#ff6ac1', brightCyan: '#9aedfe', brightWhite: '#f1f1f0' },
    });
    window.__term.open(document.getElementById('ekran'));
  }, { kolumny, wiersze });
  // Strumień oddajemy bajtami — xterm sam składa UTF-8 i sekwencje sterujące.
  const bajty = [...surowy];
  for (let i = 0; i < bajty.length; i += 60000) {
    await page.evaluate((kawalek) => new Promise((r) => window.__term.write(new Uint8Array(kawalek), r)), bajty.slice(i, i + 60000));
  }
  await new Promise((r) => setTimeout(r, 900));
  // Kadrowanie PO TREŚCI: podajemy numery wierszy ekranu, nie piksele.
  if (spec.przytnijOd || spec.przytnijDo) {
    await page.evaluate(({ od, doW }) => {
      const wiersze = [...document.querySelectorAll('.xterm-rows > div')];
      wiersze.forEach((w, i) => { const n = i + 1; if ((od && n < od) || (doW && n > doW)) w.style.display = 'none'; });
    }, { od: spec.przytnijOd ?? 0, doW: spec.przytnijDo ?? 0 });
  }
  const el = await page.$('#obudowa');
  const png = await el.screenshot({ type: 'png' });
  await sharp(png).resize({ width: spec.szerokoscDocelowa ?? 1600, withoutEnlargement: true })
    .webp({ quality: spec.jakosc ?? 86 }).toFile(spec.wyjscie);
  const m = await sharp(spec.wyjscie).metadata();
  console.log(`OK ${spec.wyjscie} ${m.width}x${m.height}`);
} finally { await b.close(); }
