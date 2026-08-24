/**
 * Otwiera WIDOCZNĄ przeglądarkę na TRWAŁYM profilu rigu i czeka, aż właściciel
 * się zaloguje. Sesja zostaje w profilu (`ZRZUTY_PROFIL`), więc kolejne zrzuty
 * idą już bez okna — `zrob-zrzut.mjs` bierze ten sam profil.
 *
 *   export ZRZUTY_PROFIL="$ZRZUTY_RIG/profil"
 *   node tools/zrzuty/zaloguj.mjs github     # albo: claude
 *   node tools/zrzuty/zaloguj.mjs github --zostaw   # nie zamykaj po zalogowaniu
 *
 * Profil siedzi w scratchpadzie sesji, NIGDY w repo: to sesja właściciela,
 * a nie materiał kursu.
 */
import { puppeteer } from './zaleznosci.mjs';
import { spawn } from 'node:child_process';

const CELE = {
  github: {
    url: 'https://github.com/login',
    sprawdz: () => document.querySelector('meta[name="user-login"]')?.content || '',
  },
  claude: {
    url: 'https://claude.ai/login',
    sprawdz: () => (location.pathname.startsWith('/login') || /sign in|zaloguj/i.test(document.body.innerText.slice(0, 400)) ? '' : 'zalogowany'),
  },
};

const cel = CELE[process.argv[2] ?? 'github'];
if (!cel) { console.error('Cel: github | claude'); process.exit(2); }
const profil = process.env.ZRZUTY_PROFIL;
if (!profil) { console.error('Ustaw ZRZUTY_PROFIL na trwały katalog profilu w scratchpadzie.'); process.exit(2); }

// TRYB RĘCZNY. Google odmawia logowania w przeglądarce sterowanej automatem
// („Ta przeglądarka lub aplikacja może nie być bezpieczna" — wykrywa WebDrivera),
// a właściciel loguje się na GitHuba/claude.ai kontem Google. Dlatego samo
// logowanie robimy w ZWYKŁYM Firefoksie uruchomionym na TYM SAMYM katalogu
// profilu: bez flag automatyzacji Google przepuszcza, a sesja zostaje w profilu,
// z którego potem korzysta rig. Puppeteer dokłada do profilu własne prefy —
// ciasteczek nie rusza (sprawdzone).
if (process.argv.includes('--recznie')) {
  console.log('Otwieram ZWYKŁY Firefox na profilu rigu. Zaloguj się i ZAMKNIJ okno.');
  const ff = spawn('/usr/bin/firefox', ['-profile', profil, '-no-remote', '-new-instance', cel.url],
    { stdio: 'ignore', detached: false });
  await new Promise(r => ff.on('exit', r));
  console.log('Okno zamknięte — sprawdzam sesję w profilu…');
  const kontrola = await puppeteer.launch({
    browser: 'firefox', executablePath: '/usr/bin/firefox', headless: true,
    userDataDir: profil, protocol: 'webDriverBiDi', args: ['-width', '1280', '-height', '800'],
  });
  try {
    const p = (await kontrola.pages())[0] ?? await kontrola.newPage();
    await p.goto(cel.url.replace(/\/login$/, ''), { waitUntil: 'domcontentloaded', timeout: 90000 });
    const kto = await p.evaluate(cel.sprawdz);
    console.log(kto ? `ZALOGOWANY: ${kto}` : 'BRAK SESJI w profilu.');
    process.exitCode = kto ? 0 : 1;
  } finally { await kontrola.close(); }
  process.exit();
}

const b = await puppeteer.launch({
  browser: 'firefox', executablePath: '/usr/bin/firefox', headless: false,
  userDataDir: profil, protocol: 'webDriverBiDi', args: ['-width', '1680', '-height', '1050'],
});
try {
  const page = (await b.pages())[0] ?? await b.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(cel.url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  console.log('Okno otwarte — zaloguj się. Sprawdzam co 3 s (limit 15 min).');
  const koniec = Date.now() + 15 * 60 * 1000;
  let kto = '';
  while (!kto && Date.now() < koniec) {
    await new Promise(r => setTimeout(r, 3000));
    try { kto = await page.evaluate(cel.sprawdz); } catch { /* nawigacja w toku */ }
  }
  if (!kto) { console.log('BRAK LOGOWANIA w limicie czasu.'); process.exit(1); }
  console.log(`ZALOGOWANY: ${kto}`);
  if (process.argv.includes('--zostaw')) {
    console.log('Okno zostaje otwarte (--zostaw). Zamknij je, gdy skończysz.');
    await new Promise(r => b.on('disconnected', r));
  }
} finally {
  // Zamknięcie MUSI być czyste — inaczej Firefox nie zrzuci cookies.sqlite na dysk.
  if (!process.argv.includes('--zostaw')) await b.close();
}
