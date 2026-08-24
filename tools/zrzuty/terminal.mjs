import { puppeteer, sharp } from './zaleznosci.mjs';
// Renderuje PRAWDZIWE wyjście terminala (z ANSI) na obraz.
// node terminal.mjs <sesja.json> — sesja: {wyjscie, tytul?, wiersze:[{cmd, out}]}
// Zasada: `out` MUSI pochodzić z realnego wykonania komendy (patrz nagraj.sh).
import { readFileSync } from 'node:fs';

const s = JSON.parse(readFileSync(process.argv[2], 'utf8'));
// REGUŁA PRYWATNOŚCI: dane właściciela nie wchodzą do materiału kursu.
const PODMIANY = [[/krzysiek2115op/g, 'oliwia-dev'],
                  [/krzysztof2006oskar@wp\.pl/g, 'oliwia-dev@users.noreply.github.com'],
                  [/\/home\/krzysiek/g, '/home/oliwia']];
for (const w of s.wiersze) for (const [re, na] of PODMIANY) {
  w.cmd = w.cmd.replace(re, na);
  if (w.out) w.out = w.out.replace(re, na);
}
const BARWY = { 30:'#586e75',31:'#dc322f',32:'#859900',33:'#b58900',34:'#268bd2',35:'#d33682',36:'#2aa198',37:'#eee8d5',
                90:'#93a1a1',91:'#ff6e67',92:'#5af78e',93:'#f4f99d',94:'#57c7ff',95:'#ff6ac1',96:'#9aedfe',97:'#f1f1f0' };
const esc = t => t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function ansiNaHtml(txt) {
  let out = '', otwarte = 0;
  const czesci = txt.split(/\x1b\[([0-9;]*)m/);
  for (let i = 0; i < czesci.length; i++) {
    if (i % 2 === 0) { out += esc(czesci[i]); continue; }
    const kody = czesci[i].split(';').filter(Boolean).map(Number);
    if (!kody.length || kody.includes(0)) { out += '</span>'.repeat(otwarte); otwarte = 0; continue; }
    const style = [];
    for (const k of kody) {
      if (BARWY[k]) style.push(`color:${BARWY[k]}`);
      if (k === 1) style.push('font-weight:600');
    }
    if (style.length) { out += `<span style="${style.join(';')}">`; otwarte++; }
  }
  return out + '</span>'.repeat(otwarte);
}
const linie = s.wiersze.map(w =>
  `<div class="l"><span class="p">${esc(s.znak ?? '~/stargazers-log')}</span><span class="d">$</span> <span class="c">${esc(w.cmd)}</span></div>` +
  (w.out ? `<div class="o">${ansiNaHtml(w.out)}</div>` : '')).join('');
const html = `<!doctype html><meta charset="utf-8"><style>
 *{box-sizing:border-box} body{margin:0;background:#12151b;font-family:"JetBrains Mono","DejaVu Sans Mono",monospace}
 .okno{width:${s.szerokosc ?? 980}px;margin:0;background:#12151b;border-radius:10px;overflow:hidden;border:1px solid #232833}
 .pasek{height:34px;background:#1b1f27;display:flex;align-items:center;padding:0 12px;gap:7px;border-bottom:1px solid #232833}
 .k{width:11px;height:11px;border-radius:50%} .k1{background:#ff5f57}.k2{background:#febc2e}.k3{background:#28c840}
 .t{color:#8b949e;font-size:12.5px;margin-left:10px}
 .b{padding:14px 16px 18px;font-size:13.5px;line-height:1.55;color:#c9d1d9;white-space:pre-wrap;word-break:break-word}
 .l{margin-top:9px} .l:first-child{margin-top:0}
 .p{color:#57c7ff}.d{color:#5af78e;margin:0 5px}.c{color:#f1f1f0;font-weight:600}
 .o{color:#c9d1d9}
</style><div class="okno"><div class="pasek"><i class="k k1"></i><i class="k k2"></i><i class="k k3"></i>
<span class="t">${esc(s.tytul ?? 'Terminal — stargazers-log')}</span></div><div class="b">${linie}</div></div>`;

const b = await puppeteer.launch({ browser:'firefox', executablePath:'/usr/bin/firefox', headless:true,
  protocol:'webDriverBiDi', args:['-width','1200','-height','1000'] });
try {
  const page = await b.newPage();
  await page.setViewport({ width: (s.szerokosc ?? 980) + 20, height: 900, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 400));
  const el = await page.$('.okno');
  const png = await el.screenshot({ type: 'png' });
  await sharp(png).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 88 }).toFile(s.wyjscie);
  console.log('OK', s.wyjscie);
} finally { await b.close(); }
