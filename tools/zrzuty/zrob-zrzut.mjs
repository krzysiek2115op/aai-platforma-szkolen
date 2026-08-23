import { puppeteer, sharp } from './zaleznosci.mjs';
// Strzelba do zrzutów: node zrob-zrzut.mjs <spec.json>
// Spec: { wyjscie, url, viewport?, czekajMs?, selektor? | clip? | kadrOdSelektora?,
//         pelnaStrona?,
//         patch?: [{z, na}], ukryj?: [selektory], akcje?: [{typ, selektor?, x?, y?}],
//         zoom?, jakosc? }
import { readFileSync } from 'node:fs';

const spec = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const b = await puppeteer.launch({
  browser: 'firefox', executablePath: '/usr/bin/firefox', headless: true,
  protocol: 'webDriverBiDi', args: ['-width', '1680', '-height', '1050'],
});
try {
  const page = await b.newPage();
  const vp = spec.viewport ?? { width: 1440, height: 900 };
  await page.setViewport({ ...vp, deviceScaleFactor: 2 });
  await page.goto(spec.url, { waitUntil: 'networkidle2', timeout: 90000 });
  await new Promise(r => setTimeout(r, spec.czekajMs ?? 1200));

  // Zgody na ciasteczka zasłaniają treść — odrzucamy je przed czymkolwiek innym.
  await page.evaluate(() => {
    const tekst = e => (e.textContent || '').trim().toLowerCase();
    // Uwaga: etykiety bywają ZDUBLOWANE ("RejectReject All Cookies" — wariant
    // krótki + długi w jednym przycisku), więc dopasowujemy fragmentem, nie prefiksem.
    const guzik = [...document.querySelectorAll('button,a[role="button"]')]
      .find(b => /reject|decline|odrzuć|only necessary|niezb/i.test(tekst(b)) && /cookie|ciastecz|necessary|niezb/i.test(tekst(b)));
    if (guzik) guzik.click();
  });
  await new Promise(r => setTimeout(r, 600));
  await page.evaluate(() => {
    for (const sel of ['#onetrust-consent-sdk', '.onetrust-pc-dark-filter', '[id*="cookie" i][class*="banner" i]',
                       '[class*="cookie-consent" i]', '[id*="CybotCookiebot"]', '[aria-label*="cookie" i]']) {
      document.querySelectorAll(sel).forEach(e => e.remove());
    }
    document.body.style.overflow = '';
  });

  for (const a of spec.akcje ?? []) {
    if (a.typ === 'klik') await page.click(a.selektor);
    if (a.typ === 'hover') await page.hover(a.selektor);
    // UWAGA: ciało `evaluate` biegnie W PRZEGLĄDARCE, gdzie `a` nie istnieje —
    // wcześniejsza wersja sięgała po `a.blok` w tym ciele i akcja `scrollDo`
    // wywalała się z ReferenceError przy KAŻDYM użyciu. Wszystko, czego
    // potrzebuje strona, przekazujemy argumentem.
    if (a.typ === 'scrollDo') await page.evaluate(
      ({ selektor, blok }) => document.querySelector(selektor)?.scrollIntoView({ block: blok }),
      { selektor: a.selektor, blok: a.blok ?? 'center' });
    if (a.typ === 'scrollY') await page.evaluate(y => window.scrollTo(0, y), a.y);
    if (a.typ === 'czekaj') await new Promise(r => setTimeout(r, a.ms));
    if (a.typ === 'eval') await page.evaluate(a.kod);
    await new Promise(r => setTimeout(r, a.poMs ?? 350));
  }

  // REGUŁA PRYWATNOŚCI: podmiana danych właściciela na przykładowe W DOM
  const patche = [
    { z: 'krzysiek2115op', na: 'oliwia-dev' },
    { z: 'Krzysztof Leszczyński', na: 'oliwia-dev' },
    { z: 'krzysztof leszczyński', na: 'oliwia-dev' },
    { z: 'krzysztof2006oskar@wp.pl', na: 'oliwia-dev@users.noreply.github.com' },
    ...(spec.patch ?? [])];
  await page.evaluate((patche) => {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const wezly = []; let n;
    while ((n = w.nextNode())) wezly.push(n);
    for (const wezel of wezly) for (const p of patche)
      if (wezel.nodeValue.includes(p.z)) wezel.nodeValue = wezel.nodeValue.split(p.z).join(p.na);
    // atrybuty title/aria-label/alt/value też bywają widoczne
    for (const el of document.querySelectorAll('[title],[aria-label],[alt],[value]'))
      for (const p of patche) for (const at of ['title','aria-label','alt','value'])
        if (el.getAttribute(at)?.includes(p.z)) el.setAttribute(at, el.getAttribute(at).split(p.z).join(p.na));
    // awatary właściciela -> neutralny identikon (szare kółko z inicjałem)
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="32" fill="%23d0d7de"/><text x="32" y="42" font-family="sans-serif" font-size="30" fill="%2357606a" text-anchor="middle">o</text></svg>`;
    for (const img of document.querySelectorAll('img[src*="avatars.githubusercontent.com"]'))
      img.src = `data:image/svg+xml;utf8,${svg}`;
  }, patche);
  const ukryj = [...(spec.bezChromu === false ? [] : ['header[role="banner"]', '.AppHeader', 'footer', '[data-testid="footer"]']), ...(spec.ukryj ?? [])];
  for (const s of ukryj) await page.evaluate(sel => { document.querySelectorAll(sel).forEach(e => e.style.display = 'none'); }, s);
  // Banner zgód bywa doklejany z opóźnieniem, PO naszym odrzuceniu — drugi przelot tuż przed zrzutem.
  await page.evaluate(() => {
    const tekst = e => (e.textContent || '').trim().toLowerCase();
    const g = [...document.querySelectorAll('button,a[role="button"]')]
      .find(b => /reject|decline|odrzuć|only necessary|niezb/i.test(tekst(b)) && /cookie|ciastecz|necessary|niezb/i.test(tekst(b)));
    if (g) g.click();
    setTimeout(() => {}, 0);
  });
  await new Promise(r => setTimeout(r, 500));
  await page.evaluate(() => {
    const zawiera = t => [...document.querySelectorAll('div,section,aside')].filter(e => {
      const s = getComputedStyle(e);
      return (s.position === 'fixed' || s.position === 'sticky') && /cookie/i.test(e.textContent || '') && (e.textContent || '').length < 900;
    });
    zawiera().forEach(e => e.remove());
  });
  await new Promise(r => setTimeout(r, 300));

  // `clip` Puppeteera liczy się od początku DOKUMENTU, nie od okna — samo
  // przewinięcie do sekcji niczego nie kadruje (pierwsza próba oddała górę
  // strony). Dlatego kadr od sekcji wyliczamy z jej pozycji w dokumencie.
  if (spec.kadrOdSelektora) {
    const k = spec.kadrOdSelektora;
    const prostokat = await page.evaluate(({ selektor, margines }) => {
      const el = document.querySelector(selektor);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: 0, y: Math.max(0, r.top + window.scrollY - (margines ?? 24)),
               szerokoscStrony: document.documentElement.scrollWidth };
    }, { selektor: k.selektor, margines: k.marginesGora });
    if (!prostokat) { console.error(`zrzut: nie ma elementu "${k.selektor}" — nie ma czego kadrować`); process.exit(6); }
    spec.clip = { x: prostokat.x, y: prostokat.y,
                  width: k.szerokosc ?? prostokat.szerokoscStrony, height: k.wysokosc ?? 700 };
  }

  let png;
  if (spec.selektor) {
    const el = await page.waitForSelector(spec.selektor, { timeout: 15000 });
    png = await el.screenshot({ type: 'png' });
  } else {
    png = await page.screenshot({ type: 'png', fullPage: !!spec.pelnaStrona, ...(spec.clip ? { clip: spec.clip } : {}) });
  }
  // Normalizacja: 1600 px szerokości wystarcza do czytania na ekranie i nie
  // wpuszcza do repo dziesiątek megabajtów (zrzut 2x ma ~2880 px).
  await sharp(png).resize({ width: spec.szerokoscDocelowa ?? 1600, withoutEnlargement: true })
    .webp({ quality: spec.jakosc ?? 82 }).toFile(spec.wyjscie);
  const m = await sharp(spec.wyjscie).metadata();
  console.log(`OK ${spec.wyjscie} ${m.width}x${m.height}`);
} finally { await b.close(); }
