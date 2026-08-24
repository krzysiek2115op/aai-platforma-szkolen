import { wymagajDeklaracji, sprawdzAsercje, sprawdzPrywatnosc } from './asercje.mjs';
// Strzelba do zrzutów: node zrob-zrzut.mjs <spec.json>
// Spec: { wyjscie, url, wymagaTekstu: [...], viewport?, czekajMs?,
//         selektor? | clip? | kadrOdSelektora?, pelnaStrona?,
//         patch?: [{z, na}], ukryj?: [selektory], akcje?: [{typ, selektor?, x?, y?}],
//         zoom?, jakosc? }
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';

const spec = JSON.parse(readFileSync(process.argv[2], 'utf8'));
// Bramka PRZED odpaleniem przeglądarki (brief, zasada 9): zrzut bez maszynowej
// asercji treści nie jest dowodem, więc specyfikacja bez niej nie rusza z miejsca.
const WYMAGANE = wymagajDeklaracji(spec, 'zrzut');
// Rig PO bramce — patrz komentarz bliźniaczy w tui.mjs.
const { puppeteer, sharp } = await import('./zaleznosci.mjs');
// `wyjscie` liczone od korzenia worktree — specyfikacja w repo nie może nieść
// ścieżki z czyjegoś katalogu domowego.
if (!isAbsolute(spec.wyjscie)) spec.wyjscie = join(process.env.ZRZUTY_KORZEN ?? process.cwd(), spec.wyjscie);
mkdirSync(dirname(spec.wyjscie), { recursive: true });
// ZRZUTY_PROFIL = trwały profil przeglądarki (scratchpad sesji): sesja właściciela
// przeżywa między zrzutami, więc partia „po zalogowaniu" idzie bez okna.
// ZRZUTY_WIDOCZNY=1 pokazuje okno, gdy trzeba coś kliknąć ręcznie.
const b = await puppeteer.launch({
  browser: 'firefox', executablePath: '/usr/bin/firefox',
  headless: !process.env.ZRZUTY_WIDOCZNY,
  ...(process.env.ZRZUTY_PROFIL ? { userDataDir: process.env.ZRZUTY_PROFIL } : {}),
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
    // GitHub liczy scalalność pull requesta LENIWIE: pierwsze wejście pokazuje
    // „Checking for the ability to merge automatically…", a stan konfliktu
    // widać dopiero po przeładowaniu. Bez tego kadr kłamie o stanie gałęzi.
    if (a.typ === 'przeladuj') await page.reload({ waitUntil: 'networkidle2', timeout: 90000 });
    if (a.typ === 'eval') await page.evaluate(a.kod);
    // `wpisz` wypełnia pole tak, jak zrobiłby to uczeń — z ogniskiem na polu.
    // Podstawienie `value` z JS daje ten sam tekst, ale bez obwódki ogniska,
    // a część podpisów obiecuje pole „z wpisanym…", czyli pole aktywne.
    if (a.typ === 'wpisz') { await page.click(a.selektor); await page.type(a.selektor, a.tekst, { delay: 25 }); }
    // `wpiszWiersze` — prompt wielowierszowy w polu czatu. ENTER W CZACIE WYSYŁA
    // WIADOMOŚĆ, więc zwykłe `page.type` z '\n' wystrzeliłoby prompt w połowie
    // (a przy prompcie z tagami XML — po pierwszej linijce). Nowy wiersz robi
    // Shift+Enter, dokładnie jak u ucznia.
    if (a.typ === 'wpiszWiersze') {
      await page.click(a.selektor);
      const wiersze = a.tekst.split('\n');
      for (let i = 0; i < wiersze.length; i++) {
        if (i) { await page.keyboard.down('Shift'); await page.keyboard.press('Enter'); await page.keyboard.up('Shift'); }
        if (wiersze[i]) await page.keyboard.type(wiersze[i], { delay: 6 });
      }
    }
    // `czekajNaTekst` — odpowiedź modelu przychodzi w nieznanym czasie. Sztywne
    // `czekaj` albo marnuje minutę, albo kadruje odpowiedź w połowie zdania.
    if (a.typ === 'czekajNaTekst') {
      const koniec = Date.now() + (a.limitMs ?? 180000);
      let jest = false;
      while (!jest && Date.now() < koniec) {
        jest = await page.evaluate((f) => (document.body.innerText || '').includes(f), a.tekst);
        if (!jest) await new Promise(r => setTimeout(r, 1500));
      }
      if (!jest) { console.error(`zrzut: w limicie ${a.limitMs ?? 180000} ms nie pojawiło się ${JSON.stringify(a.tekst)}`); process.exit(10); }
    }
    // `czekajNaKoniec` — model skończył pisać. Pierwsza wersja pytała tylko
    // o zniknięcie przycisku zatrzymania i dawała FAŁSZYWE „gotowe": zaraz po
    // kliknięciu wysyłki przycisku jeszcze NIE MA, więc druga wymiana w rozmowie
    // szła na obraz po 201 znakach odpowiedzi (złapała to bramka `wymagaOdpowiedzi`).
    // Dlatego mierzymy STABILNOŚĆ TEKSTU ostatniej odpowiedzi — sygnał niezależny
    // od tego, jak interfejs nazywa swoje przyciski.
    if (a.typ === 'czekajNaKoniec') {
      const sel = a.selektorOdpowiedzi ?? '.font-claude-response';
      const koniec = Date.now() + (a.limitMs ?? 300000);
      const dlugosc = () => page.evaluate((s) => {
        const el = [...document.querySelectorAll(s)];
        return el.length ? (el[el.length - 1].innerText || '').trim().length : 0;
      }, sel);
      // Sam tekst nie wystarcza przy ARTEFAKTACH: odpowiedź w transkrypcie ma
      // wtedy dwa zdania i stoi w miejscu, podczas gdy artefakt dopiero się pisze.
      // Dlatego drugi sygnał — „interfejs wciąż generuje".
      const generuje = () => page.evaluate(() =>
        !!document.querySelector('[data-is-streaming="true"]') ||
        !!document.querySelector('[data-testid="stop-button"]') ||
        [...document.querySelectorAll('button')].some((b) => /stop/i.test(b.getAttribute('aria-label') || '')));
      let poprzednia = -1, stabilnych = 0, ile = 0, wTrakcie = true;
      while (Date.now() < koniec) {
        await new Promise(r => setTimeout(r, 1500));
        ile = await dlugosc();
        wTrakcie = await generuje();
        if (ile > 0 && ile === poprzednia && !wTrakcie) stabilnych++; else stabilnych = 0;
        poprzednia = ile;
        if (stabilnych >= (a.stabilnych ?? 3) && ile >= (a.minZnakow ?? 120)) break;
      }
      if (!(stabilnych >= (a.stabilnych ?? 3) && ile >= (a.minZnakow ?? 120))) {
        console.error(`zrzut: odpowiedź nie ustabilizowała się w limicie czasu (${ile} zn.)`);
        process.exit(10);
      }
      await new Promise(r => setTimeout(r, a.poMs ?? 1200));
    }
    // `wgrajPlik` — obraz wchodzi do rozmowy przez ukryte `input[type=file]`,
    // bo okna wyboru pliku systemu nie da się obsłużyć z automatu.
    if (a.typ === 'wgrajPlik') {
      const wejscie = await page.waitForSelector(a.selektor ?? 'input[type=file]', { timeout: 15000 });
      const sciezka = a.plik.startsWith('/') ? a.plik : join(process.env.ZRZUTY_KORZEN ?? process.cwd(), a.plik);
      await wejscie.uploadFile(sciezka);
    }
    await new Promise(r => setTimeout(r, a.poMs ?? 350));
  }

  // REGUŁA PRYWATNOŚCI: podmiana danych właściciela na przykładowe W DOM
  const patche = [
    { z: 'krzysiek2115op', na: 'oliwia-dev' },
    { z: 'Krzysztof Leszczyński', na: 'oliwia-dev' },
    { z: 'krzysztof leszczyński', na: 'oliwia-dev' },
    { z: 'krzysztof2006oskar@wp.pl', na: 'oliwia-dev@users.noreply.github.com' },
    // Samo IMIĘ — claude.ai wita nim wprost („Evening, krzysztof"), a Konsola
    // stawia je w nagłówku konta. Bramka `sprawdzPrywatnosc` zna login, e-mail,
    // $USER i $HOME; imienia nie zna, więc bez tej podmiany wychodzi na zrzucie.
    { z: 'Krzysztof', na: 'Oliwia' },
    { z: 'krzysztof', na: 'oliwia' },
    ...(process.env.USER && process.env.USER.length > 2 ? [{ z: process.env.USER, na: 'oliwia' }] : []),
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
    // Pola formularzy wypełnione JAVASCRIPTEM (np. „Generate release notes")
    // NIE mają węzła tekstowego ani atrybutu `value` — treść siedzi we
    // WŁAŚCIWOŚCI `.value`. Bez tej pętli login właściciela wychodzi na zrzucie
    // mimo poprawnej podmiany w DOM (złapane stykówką przy module 3).
    for (const el of document.querySelectorAll('input,textarea'))
      for (const p of patche)
        if (typeof el.value === 'string' && el.value.includes(p.z)) el.value = el.value.split(p.z).join(p.na);
    // awatary właściciela -> neutralny identikon (szare kółko z inicjałem)
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="32" fill="%23d0d7de"/><text x="32" y="42" font-family="sans-serif" font-size="30" fill="%2357606a" text-anchor="middle">o</text></svg>`;
    for (const img of document.querySelectorAll('img[src*="avatars.githubusercontent.com"]'))
      img.src = `data:image/svg+xml;utf8,${svg}`;
    // claude.ai: pasek boczny wypisuje TYTUŁY PRYWATNYCH ROZMÓW właściciela —
    // i robi to DWA RAZY: w tekście odnośnika oraz w `aria-label` przycisku
    // („More options for <tytuł>"). Podmieniamy jedno i drugie na przykładowe
    // tematy firmowe; chrom interfejsu zostaje prawdziwy (brief, zasada 4).
    if (location.hostname.endsWith('claude.ai')) {
      const przykladowe = ['Oferta dla klienta — skrót', 'Analiza umowy najmu', 'Plan newslettera na wrzesień',
        'Podsumowanie spotkania zespołu', 'Opis produktu do sklepu', 'Odpowiedź na reklamację',
        'Checklista wdrożenia nowego pracownika', 'Notatka z rozmowy z dostawcą', 'Harmonogram szkoleń',
        'Porównanie ofert hostingu', 'Regulamin sklepu — uwagi', 'Skrót raportu sprzedaży'];
      const tytul = (i) => przykladowe[i % przykladowe.length];
      [...document.querySelectorAll('a[href^="/chat/"], a[href^="/project/"]')].forEach((a, i) => {
        const wezly = [];
        const ch = document.createTreeWalker(a, NodeFilter.SHOW_TEXT);
        let n; while ((n = ch.nextNode())) if (n.nodeValue.trim()) wezly.push(n);
        if (wezly.length) wezly[0].nodeValue = tytul(i);
        for (let k = 1; k < wezly.length; k++) if (wezly[k].nodeValue.length > 12) wezly[k].nodeValue = tytul(i);
      });
      [...document.querySelectorAll('[aria-label^="More options for"], [aria-label^="Więcej opcji"]')]
        .forEach((b, i) => b.setAttribute('aria-label', `More options for ${tytul(i)}`));
      // Awatar konta to INICJAŁ IMIENIA właściciela (kółko z „K" nad nazwą planu).
      // Podmiana tekstowa go nie rusza, bo to pojedyncza litera — bierzemy go
      // punktowo, po elemencie menu konta, żeby nie tknąć liter w treści strony.
      const menuKonta = document.querySelector('[data-testid="user-menu-button"]');
      if (menuKonta) {
        const ch = document.createTreeWalker(menuKonta, NodeFilter.SHOW_TEXT);
        let n; while ((n = ch.nextNode())) if (/^\s*[A-ZĄĆĘŁŃÓŚŹŻ]\s*$/.test(n.nodeValue)) n.nodeValue = 'O';
      }
    }
  }, patche);
  // KONTROLA po podmianie — tytuły rozmów są danymi, których bramka
  // `sprawdzPrywatnosc` nie ma jak znać (nie ma ich w środowisku). Sprawdzamy
  // więc STRUKTURALNIE: każdy odnośnik do rozmowy musi nieść tytuł z listy
  // przykładowych. Komunikat CELOWO nie wypisuje tytułu — to dana prywatna.
  const nieprzykladowe = await page.evaluate(() => {
    if (!location.hostname.endsWith('claude.ai')) return 0;
    const przykladowe = ['Oferta dla klienta — skrót', 'Analiza umowy najmu', 'Plan newslettera na wrzesień',
      'Podsumowanie spotkania zespołu', 'Opis produktu do sklepu', 'Odpowiedź na reklamację',
      'Checklista wdrożenia nowego pracownika', 'Notatka z rozmowy z dostawcą', 'Harmonogram szkoleń',
      'Porównanie ofert hostingu', 'Regulamin sklepu — uwagi', 'Skrót raportu sprzedaży'];
    return [...document.querySelectorAll('a[href^="/chat/"]')]
      .filter(a => (a.innerText || '').trim() && !przykladowe.some(t => (a.innerText || '').includes(t))).length;
  });
  if (nieprzykladowe > 0) {
    console.error(`zrzut: ${nieprzykladowe} odnośników do rozmów NIE MA przykładowego tytułu — obrazu NIE ZAPISANO.`);
    console.error('  Pasek boczny claude.ai niesie tytuły prywatnych rozmów właściciela (brief, zasada 4).');
    process.exit(9);
  }

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
    const zawiera = () => [...document.querySelectorAll('div,section,aside')].filter(e => {
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
  if (spec.kadrOd) {
    // Kadr „od elementu do elementu": część podpisów obiecuje wycinek, którego nie
    // obejmuje żaden pojedynczy selektor (trzy osobne nagłówki, pasek zakładek).
    // Elementy oznaczamy wcześniej akcją `eval` (samo `id` niczego nie przesuwa).
    const kadr = await page.evaluate((od, doo, m) => {
      const a = document.querySelector(od), b = document.querySelector(doo) || a;
      if (!a) throw new Error('kadrOd nie trafia w żaden element: ' + od);
      a.scrollIntoView({ block: 'center' });
      const z = typeof m === 'number' ? { gora: m, dol: m, lewo: m, prawo: m } : m;
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      return {
        x: Math.max(0, Math.min(ra.left, rb.left) - z.lewo + scrollX),
        y: Math.max(0, Math.min(ra.top, rb.top) - z.gora + scrollY),
        width: Math.max(ra.right, rb.right) - Math.min(ra.left, rb.left) + z.lewo + z.prawo,
        height: Math.max(ra.bottom, rb.bottom) - Math.min(ra.top, rb.top) + z.gora + z.dol,
      };
    }, spec.kadrOd, spec.kadrDo ?? spec.kadrOd, spec.margines ?? 14);
    await new Promise(r => setTimeout(r, 400));
    png = await page.screenshot({ type: 'png', captureBeyondViewport: true, clip: kadr });
    // Asercja MUSI liczyć tekst z tego samego prostokąta, który poszedł na obraz.
    // Bez tej linijki `kadrOd` kadruje wycinek dokumentu, a asercja sprawdza
    // OKNO — czyli dowodzi napisów, których na zrzucie może nie być (dokładnie
    // ta klasa, dla której bramka powstała). Żadna wcześniejsza specyfikacja
    // `kadrOd` nie używała, więc dziura nie zdążyła ugryźć.
    spec.clip = kadr;
  } else if (spec.selektor) {
    const el = await page.waitForSelector(spec.selektor, { timeout: 15000 });
    png = await el.screenshot({ type: 'png' });
  } else {
    png = await page.screenshot({ type: 'png', fullPage: !!spec.pelnaStrona, ...(spec.clip ? { clip: spec.clip } : {}) });
  }
  // ASERCJA TREŚCI — na tekście DOKŁADNIE TEGO obszaru, który poszedł na obraz.
  // Gdyby liczyć `document.body.innerText`, asercja przechodziłaby dla napisów
  // leżących poza kadrem — czyli dowodziłaby czegoś, czego na zrzucie nie ma.
  const tekstEkranu = await page.evaluate(({ selektor, clip, pelna }) => {
    if (selektor) return document.querySelector(selektor)?.innerText ?? '';
    if (pelna && !clip) return document.body.innerText;
    const r = clip ?? { x: window.scrollX, y: window.scrollY, width: window.innerWidth, height: window.innerHeight };
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const kawalki = []; let n;
    while ((n = w.nextNode())) {
      if (!n.nodeValue.trim()) continue;
      const zakres = document.createRange();
      zakres.selectNodeContents(n);
      const p = zakres.getBoundingClientRect();
      if (!p.width || !p.height) continue;                       // ukryte elementy
      const gora = p.top + window.scrollY, dol = p.bottom + window.scrollY;
      const lewo = p.left + window.scrollX, prawo = p.right + window.scrollX;
      if (dol <= r.y || gora >= r.y + r.height) continue;
      if (prawo <= r.x || lewo >= r.x + r.width) continue;
      kawalki.push(n.nodeValue);
    }
    return kawalki.join('\n');
  }, { selektor: spec.selektor ?? null, clip: spec.clip ?? null, pelna: !!spec.pelnaStrona });
  sprawdzPrywatnosc(tekstEkranu, 'zrzut', patche.map((p) => p.na));
  sprawdzAsercje(tekstEkranu, WYMAGANE, 'zrzut');
  // BRAMKA STRUKTURALNA — „na zrzucie JEST odpowiedź modelu".
  // Treści odpowiedzi nie da się zadeklarować z góry (model nie powtarza się
  // słowo w słowo), a `wymagaTekstu` sprawdza tylko napisy. Podpisy w rodzaju
  // „odpowiedź Claude na drugi prompt" obiecują jednak SAM FAKT odpowiedzi —
  // i to jest sprawdzalne: element odpowiedzi musi leżeć w kadrze i nieść
  // co najmniej tyle znaków, ile podano.
  if (spec.wymagaOdpowiedzi) {
    const minZnakow = typeof spec.wymagaOdpowiedzi === 'number' ? spec.wymagaOdpowiedzi : 200;
    const dlugosc = await page.evaluate(({ sel, clip }) => {
      const el = [...document.querySelectorAll(sel)].filter((e) => {
        if (!clip) return true;
        const r = e.getBoundingClientRect();
        const gora = r.top + scrollY, dol = r.bottom + scrollY;
        return dol > clip.y && gora < clip.y + clip.height;
      });
      return Math.max(0, ...el.map((e) => (e.innerText || '').trim().length), 0);
    }, { sel: spec.selektorOdpowiedzi ?? '.font-claude-response', clip: spec.clip ?? null });
    if (dlugosc < minZnakow) {
      console.error(`zrzut: w kadrze NIE MA odpowiedzi modelu (${dlugosc} zn., wymagane ${minZnakow}) — obrazu NIE ZAPISANO.`);
      process.exit(11);
    }
    console.log(`odpowiedź modelu w kadrze: ${dlugosc} zn. (wymagane ${minZnakow})`);
  }

  // Normalizacja: 1600 px szerokości wystarcza do czytania na ekranie i nie
  // wpuszcza do repo dziesiątek megabajtów (zrzut 2x ma ~2880 px).
  await sharp(png).resize({ width: spec.szerokoscDocelowa ?? 1600, withoutEnlargement: true })
    .webp({ quality: spec.jakosc ?? 82 }).toFile(spec.wyjscie);
  const m = await sharp(spec.wyjscie).metadata();
  console.log(`OK ${spec.wyjscie} ${m.width}x${m.height}`);
} finally { await b.close(); }
