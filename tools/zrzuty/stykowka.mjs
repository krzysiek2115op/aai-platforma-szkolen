import { sharp } from './zaleznosci.mjs';
// node stykowka.mjs <wyjscie.png> <plik1.webp> ... — siatka miniatur z podpisami
const [wyjscie, ...pliki] = process.argv.slice(2);
const KOL = 3, SZER = 620, WYS = 420;
const kafle = await Promise.all(pliki.map(async (p, i) => {
  const buf = await sharp(p).resize(SZER - 8, WYS - 30, { fit: 'contain', background: '#ffffff' }).toBuffer();
  return { buf, nazwa: p.split('/').slice(-1)[0].slice(0, 62), i };
}));
const wiersze = Math.ceil(kafle.length / KOL);
const podklad = sharp({ create: { width: KOL * SZER, height: wiersze * WYS, channels: 3, background: '#eef1f4' } });
const skladniki = [];
for (const k of kafle) {
  const x = (k.i % KOL) * SZER, y = Math.floor(k.i / KOL) * WYS;
  skladniki.push({ input: k.buf, left: x + 4, top: y + 26 });
  const svg = `<svg width="${SZER}" height="24"><text x="6" y="17" font-family="monospace" font-size="15" fill="#111">${k.i + 1}. ${k.nazwa}</text></svg>`;
  skladniki.push({ input: Buffer.from(svg), left: x, top: y + 2 });
}
await podklad.composite(skladniki).png().toFile(wyjscie);
console.log('stykówka:', wyjscie, kafle.length, 'kafli');
