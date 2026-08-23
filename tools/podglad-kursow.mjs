/**
 * Lokalny podgląd obu kursów W STYLU STRONY — do oceny wzrokowej właściciela.
 *
 * DLACZEGO ISTNIEJE. Materiał kursu nie jest publiczny na stronie (decyzja
 * właściciela 2026-08-18: kurs za logowaniem, etap WP), więc proza z
 * `tresc-kursow/` nie ma dziś ŻADNEGO widoku — ani w katalogu, ani na stronie
 * sprzedażowej. Ocenić 91 lekcji w edytorze się nie da: nie widać typografii,
 * nie widać, jak siadają zrzuty, nie widać długości lekcji okiem czytelnika.
 * To narzędzie składa z tych samych plików statyczny podgląd w design systemie
 * „Volt", żeby właściciel oglądał to, co zobaczy uczeń.
 *
 * CO POKAZUJE, A CZEGO NIE. Treść bierze `czytajProze` z `lib/proza-lekcji.ts`
 * — TA SAMA funkcja, którą wgrywarka wysyła treść do bazy. Podgląd pokazuje
 * więc dokładnie to, co dostaje klient: bez frontmatteru i BEZ tabeli
 * „Zgodność ze źródłem" (ucinanej przed wysyłką). Gdyby podgląd czytał pliki
 * po swojemu, oceniałoby się coś innego niż produkt.
 *
 * ZRZUTY. Miejsce z gotowym obrazem wchodzi jako obraz; miejsce ze znacznikiem
 * `<!-- ZRZUT: … -->` zostaje WIDOCZNĄ, opisaną dziurą. Ocena wzrokowa ma
 * pokazywać także to, czego jeszcze nie ma — ukryty brak wróciłby jako
 * niespodzianka przy publikacji.
 *
 * WYJŚCIE POZA REPO. Katalog docelowy podaje się jawnie (`--wyjscie`), bez
 * wartości domyślnej w drzewie projektu. Powód jest ten sam co przy zrzutach:
 * `public/` wchodzi w całości do eksportu statycznego (klasa BLAD-007), a
 * treść kursu jest towarem, nie zasobem strony.
 *
 * ZALEŻNOŚĆ. `marked` mieszka w rigu (ZRZUTY_RIG), nie w package.json —
 * lekcja z D5: narzędzia autorskie nie wchodzą do zależności produktu.
 *
 * Użycie:
 *   export ZRZUTY_RIG=<scratchpad>/rig     # tam: npm i marked
 *   node tools/podglad-kursow.mjs --wyjscie /tmp/podglad [--kurs <slug>]
 */
import { createRequire } from "node:module";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { WZORZEC_PROZY, czytajProze } from "../lib/proza-lekcji.ts";

const KORZEN = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TRESC = join(KORZEN, "tresc-kursow");

/* ---------- zależności rigu ---------- */

const RIG = process.env.ZRZUTY_RIG;
if (!RIG || !existsSync(join(RIG, "node_modules"))) {
  console.error(
    "podgląd kursów: ustaw ZRZUTY_RIG na katalog z zainstalowanym `marked`.\n" +
      '  mkdir -p "$ZRZUTY_RIG" && cd "$ZRZUTY_RIG" && npm init -y && npm i marked'
  );
  process.exit(2);
}
const wymagaj = createRequire(join(RIG, "node_modules", "index.js"));
const { marked } = wymagaj("marked");

/* ---------- argumenty ---------- */

const args = process.argv.slice(2);
const wartosc = (nazwa) => {
  const i = args.indexOf(nazwa);
  return i === -1 ? null : args[i + 1];
};
const WYJSCIE = wartosc("--wyjscie");
if (!WYJSCIE) {
  console.error(
    "podgląd kursów: podaj --wyjscie <katalog>. Świadomie bez wartości domyślnej —\n" +
      "treść kursu nie ma prawa wylądować w drzewie projektu przez pomyłkę."
  );
  process.exit(2);
}
const TYLKO_KURS = wartosc("--kurs");
const KAT = resolve(WYJSCIE);
if (KAT.startsWith(KORZEN)) {
  console.error(`podgląd kursów: --wyjscie wskazuje do środka repo (${KAT}). Odmawiam.`);
  process.exit(2);
}

/* ---------- zbieranie prozy ---------- */

const ZNACZNIK_ZRZUTU = /<!--\s*ZRZUT:\s*([\s\S]*?)-->/g;

/** Jeden kurs: moduły → lekcje, każda z prozą gotową dla klienta. */
function zbierzKurs(slug) {
  const kat = join(TRESC, slug);
  const moduly = readdirSync(kat, { withFileTypes: true })
    .filter((w) => w.isDirectory() && /^modul-\d+$/.test(w.name))
    .map((w) => w.name)
    .sort((a, b) => Number(a.slice(6)) - Number(b.slice(6)));

  const lekcje = [];
  for (const modul of moduly) {
    const katModulu = join(kat, modul);
    const pliki = readdirSync(katModulu)
      .filter((n) => WZORZEC_PROZY.test(n))
      .sort((a, b) => Number(a.match(WZORZEC_PROZY)[1]) - Number(b.match(WZORZEC_PROZY)[1]));
    for (const plik of pliki) {
      const sciezka = join(katModulu, plik);
      const proza = czytajProze(readFileSync(sciezka, "utf8"), sciezka);
      lekcje.push({ ...proza, sciezka, katModulu, plik });
    }
  }
  return { slug, lekcje };
}

/* ---------- markdown → HTML ---------- */

/**
 * Znacznik `<!-- ZRZUT: podpis -->` zamieniamy PRZED markdownem na własny
 * blok — marked wyrzuciłby komentarz i brak zniknąłby z podglądu.
 */
function zamienZnaczniki(md) {
  return md.replace(ZNACZNIK_ZRZUTU, (_, podpis) => {
    const czysty = podpis.trim().replace(/\s+/g, " ");
    return `\n<div class="brak-zrzutu"><span class="brak-etykieta">zrzut do zrobienia</span><span class="brak-podpis">${uciekaj(czysty)}</span></div>\n`;
  });
}

function uciekaj(t) {
  return t
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** `![podpis](zrzuty/plik.webp)` → figure z podpisem; plik kopiujemy do wyjścia. */
function obrazyDoFigur(html, lekcja, zasoby) {
  return html.replace(
    /<p><img src="([^"]+)" alt="([^"]*)"[^>]*><\/p>/g,
    (calosc, src, alt) => {
      if (/^https?:/.test(src)) return calosc;
      const zrodlo = join(lekcja.katModulu, src);
      if (!existsSync(zrodlo)) {
        return `<div class="brak-zrzutu"><span class="brak-etykieta">brak pliku</span><span class="brak-podpis">${uciekaj(src)}</span></div>`;
      }
      const nazwa = `${lekcja.kurs}-m${lekcja.modul}-${basename(src)}`;
      zasoby.set(nazwa, zrodlo);
      return `<figure class="zrzut"><img src="../zasoby/${nazwa}" alt="${uciekaj(alt)}" loading="lazy"><figcaption>${uciekaj(alt)}</figcaption></figure>`;
    }
  );
}

/* ---------- szablony ---------- */

const STYL = `
@font-face {
  font-family: "Geist";
  src: url(../zasoby/Geist-subset.woff2) format("woff2");
  font-display: swap;
  font-weight: 400 700;
}
@font-face {
  font-family: "Geist Mono";
  src: url(../zasoby/GeistMono-subset.woff2) format("woff2");
  font-display: swap;
  font-weight: 400 600;
}
:root {
  --void: #08090b;
  --panel: #101116;
  --fg: #f5f5f5;
  --steel: #8f929c;
  --volt: #bfff38;
  --line: rgba(245, 245, 245, 0.08);
  --sans: "Geist", ui-sans-serif, system-ui, "Segoe UI", Roboto, Arial, sans-serif;
  --mono: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
  color-scheme: dark;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--void);
  color: var(--fg);
  font-family: var(--sans);
  font-size: 17px;
  line-height: 1.75;
  -webkit-font-smoothing: antialiased;
}
::selection { background: var(--volt); color: var(--void); }
a { color: var(--volt); text-underline-offset: 3px; }
.pasek {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem clamp(1rem, 4vw, 3rem);
  background: rgba(8, 9, 11, 0.86);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--line);
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--steel);
}
.pasek a { text-decoration: none; }
.pasek strong { color: var(--fg); font-weight: 600; letter-spacing: 0.08em; }
main { max-width: 74ch; margin: 0 auto; padding: clamp(2rem, 6vw, 4.5rem) clamp(1rem, 4vw, 2rem) 6rem; }
main.szeroki { max-width: 96ch; }
.nadtytul {
  font-size: 0.65rem;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--volt);
  margin: 0 0 0.9rem;
}
h1 { font-size: clamp(2rem, 4.5vw, 3.1rem); line-height: 1.06; letter-spacing: -0.03em; margin: 0 0 1.5rem; }
h2 { font-size: 1.55rem; line-height: 1.2; letter-spacing: -0.02em; margin: 3.2rem 0 1rem; }
h3 { font-size: 1.15rem; margin: 2.2rem 0 0.7rem; }
p { margin: 0 0 1.15rem; }
ul, ol { margin: 0 0 1.3rem; padding-left: 1.3rem; }
li { margin-bottom: 0.45rem; }
strong { color: #fff; }
blockquote {
  margin: 1.6rem 0;
  padding: 0.2rem 0 0.2rem 1.2rem;
  border-left: 2px solid var(--volt);
  color: var(--steel);
}
blockquote p:last-child { margin-bottom: 0; }
code {
  font-family: var(--mono);
  font-size: 0.87em;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 0.1em 0.36em;
}
pre {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 1rem 1.1rem;
  overflow-x: auto;
  margin: 0 0 1.4rem;
}
pre code { background: none; border: 0; padding: 0; font-size: 0.84rem; line-height: 1.6; }
table { width: 100%; border-collapse: collapse; margin: 0 0 1.5rem; font-size: 0.92rem; display: block; overflow-x: auto; }
th, td { text-align: left; padding: 0.55rem 0.7rem; border-bottom: 1px solid var(--line); vertical-align: top; }
th { color: var(--steel); font-size: 0.68rem; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 600; }
hr { border: 0; border-top: 1px solid var(--line); margin: 2.5rem 0; }
figure.zrzut { margin: 2rem 0; }
figure.zrzut img {
  display: block;
  width: 100%;
  height: auto;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--panel);
}
figcaption { margin-top: 0.6rem; font-size: 0.8rem; color: var(--steel); }
.brak-zrzutu {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 2rem 0;
  padding: 1.6rem;
  border: 1px dashed rgba(191, 255, 56, 0.42);
  border-radius: 10px;
  background: rgba(191, 255, 56, 0.04);
}
.brak-etykieta {
  font-size: 0.6rem;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--volt);
}
.brak-podpis { font-size: 0.86rem; color: var(--steel); }
.karty { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); margin: 2rem 0 3rem; }
.karta {
  display: block;
  padding: 1.4rem;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--panel);
  text-decoration: none;
  color: inherit;
}
.karta:hover { border-color: rgba(191, 255, 56, 0.4); }
.karta h2 { margin: 0 0 0.6rem; font-size: 1.25rem; }
.karta p { color: var(--steel); font-size: 0.9rem; margin: 0; }
.liczby { display: flex; flex-wrap: wrap; gap: 1.6rem; margin: 1.2rem 0 0; padding: 0; list-style: none; }
.liczby div { display: flex; flex-direction: column; }
.liczby .wartosc { font-family: var(--mono); font-size: 1.35rem; color: var(--fg); }
.liczby .opis { font-size: 0.6rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--steel); }
.modul { margin: 2.6rem 0; }
.modul h2 { margin-bottom: 0.8rem; }
.lista-lekcji { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--line); }
.lista-lekcji li { margin: 0; border-bottom: 1px solid var(--line); }
.lista-lekcji a {
  display: flex;
  gap: 1rem;
  align-items: baseline;
  justify-content: space-between;
  padding: 0.75rem 0.2rem;
  text-decoration: none;
  color: var(--fg);
}
.lista-lekcji a:hover { color: var(--volt); }
.lista-lekcji .nr { font-family: var(--mono); font-size: 0.8rem; color: var(--steel); min-width: 3.2rem; }
.lista-lekcji .meta { font-family: var(--mono); font-size: 0.72rem; color: var(--steel); white-space: nowrap; }
.dol { display: flex; justify-content: space-between; gap: 1rem; margin-top: 4rem; padding-top: 1.5rem; border-top: 1px solid var(--line); font-size: 0.85rem; }
.dol a { text-decoration: none; }
.uwaga { margin: 2rem 0 0; padding: 1rem 1.2rem; border: 1px solid var(--line); border-radius: 10px; background: var(--panel); color: var(--steel); font-size: 0.85rem; }
`;

function strona({ tytul, pasek, tresc, szeroki = false }) {
  return `<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${uciekaj(tytul)}</title>
<style>${STYL}</style>
</head>
<body>
<div class="pasek">${pasek}</div>
<main${szeroki ? ' class="szeroki"' : ""}>
${tresc}
</main>
</body>
</html>
`;
}

/* ---------- generowanie ---------- */

const NAZWY_KURSOW = {
  "jak-korzystac-z-claude": "Jak poprawnie korzystać z Claude",
  "jak-uzywac-githuba": "Jak poprawnie używać GitHuba",
};

const slugLekcji = (l) => `m${l.modul}-l${l.lekcja}`;

function policzZrzuty(md) {
  const znaczniki = [...md.matchAll(ZNACZNIK_ZRZUTU)].length;
  const obrazy = [...md.matchAll(/!\[[^\]]*\]\(zrzuty\/[^)]+\)/g)].length;
  return { brakuje: znaczniki, jest: obrazy };
}

function generujKurs(kurs, zasoby) {
  const katKursu = join(KAT, kurs.slug);
  mkdirSync(katKursu, { recursive: true });

  const nazwa = NAZWY_KURSOW[kurs.slug] ?? kurs.slug;
  let znakow = 0;
  let zrzutyJest = 0;
  let zrzutyBrak = 0;

  kurs.lekcje.forEach((lekcja, i) => {
    znakow += lekcja.tresc.length;
    const licz = policzZrzuty(lekcja.tresc);
    zrzutyJest += licz.jest;
    zrzutyBrak += licz.brakuje;

    const poprzednia = kurs.lekcje[i - 1];
    const nastepna = kurs.lekcje[i + 1];
    const html = obrazyDoFigur(
      marked.parse(zamienZnaczniki(lekcja.tresc), { async: false }),
      lekcja,
      zasoby
    );

    writeFileSync(
      join(katKursu, `${slugLekcji(lekcja)}.html`),
      strona({
        tytul: `${lekcja.modul}.${lekcja.lekcja} ${lekcja.tytulLekcji} — ${nazwa}`,
        pasek: `<a href="index.html">← ${uciekaj(nazwa)}</a><span>moduł ${lekcja.modul} · lekcja ${lekcja.lekcja}</span>`,
        tresc: `
<p class="nadtytul">Moduł ${lekcja.modul} — ${uciekaj(lekcja.tytulModulu)}</p>
<h1>${uciekaj(lekcja.tytulLekcji)}</h1>
${html}
<div class="dol">
  <span>${poprzednia ? `<a href="${slugLekcji(poprzednia)}.html">← ${uciekaj(poprzednia.tytulLekcji)}</a>` : ""}</span>
  <span>${nastepna ? `<a href="${slugLekcji(nastepna)}.html">${uciekaj(nastepna.tytulLekcji)} →</a>` : ""}</span>
</div>`,
      })
    );
  });

  /* strona kursu: moduły i lekcje */
  const moduly = [...new Set(kurs.lekcje.map((l) => l.modul))];
  const sekcje = moduly
    .map((nr) => {
      const wModule = kurs.lekcje.filter((l) => l.modul === nr);
      const pozycje = wModule
        .map((l) => {
          const licz = policzZrzuty(l.tresc);
          const meta = [
            `${Math.round(l.tresc.length / 1000)} tys. znaków`,
            licz.brakuje ? `${licz.jest}/${licz.jest + licz.brakuje} zrzutów` : null,
          ]
            .filter(Boolean)
            .join(" · ");
          return `<li><a href="${slugLekcji(l)}.html"><span class="nr">${l.modul}.${l.lekcja}</span><span>${uciekaj(l.tytulLekcji)}</span><span class="meta">${meta}</span></a></li>`;
        })
        .join("\n");
      return `<section class="modul">
<h2>Moduł ${nr} — ${uciekaj(wModule[0].tytulModulu)}</h2>
<ul class="lista-lekcji">
${pozycje}
</ul>
</section>`;
    })
    .join("\n");

  writeFileSync(
    join(katKursu, "index.html"),
    strona({
      szeroki: true,
      tytul: `${nazwa} — podgląd treści`,
      pasek: `<a href="../index.html">← oba kursy</a><strong>${uciekaj(nazwa)}</strong>`,
      tresc: `
<p class="nadtytul">Podgląd treści kursu</p>
<h1>${uciekaj(nazwa)}</h1>
<div class="liczby">
  <div><span class="wartosc">${moduly.length}</span><span class="opis">modułów</span></div>
  <div><span class="wartosc">${kurs.lekcje.length}</span><span class="opis">lekcji</span></div>
  <div><span class="wartosc">${Math.round(znakow / 1000)} tys.</span><span class="opis">znaków prozy</span></div>
  <div><span class="wartosc">${zrzutyJest}</span><span class="opis">zrzutów w treści</span></div>
  <div><span class="wartosc">${zrzutyBrak}</span><span class="opis">miejsc bez zrzutu</span></div>
</div>
${sekcje}`,
    })
  );

  return { nazwa, moduly: moduly.length, lekcje: kurs.lekcje.length, znakow, zrzutyJest, zrzutyBrak };
}

/* ---------- przebieg ---------- */

const slugi = readdirSync(TRESC, { withFileTypes: true })
  .filter((w) => w.isDirectory() && existsSync(join(TRESC, w.name, "modul-1")))
  .map((w) => w.name)
  .filter((s) => !TYLKO_KURS || s === TYLKO_KURS)
  .sort();

if (!slugi.length) {
  console.error("podgląd kursów: nie znalazłem żadnego kursu w tresc-kursow/");
  process.exit(1);
}

rmSync(KAT, { recursive: true, force: true });
mkdirSync(join(KAT, "zasoby"), { recursive: true });

const zasoby = new Map();
const bilanse = slugi.map((slug) => generujKurs(zbierzKurs(slug), zasoby));

for (const [nazwa, zrodlo] of zasoby) copyFileSync(zrodlo, join(KAT, "zasoby", nazwa));
for (const font of ["Geist-subset.woff2", "GeistMono-subset.woff2"]) {
  copyFileSync(join(KORZEN, "public", "fonts", font), join(KAT, "zasoby", font));
}
copyFileSync(
  join(KORZEN, "public", "fonts", "LICENSE-Geist-OFL.txt"),
  join(KAT, "zasoby", "LICENSE-Geist-OFL.txt")
);

const karty = slugi
  .map((slug, i) => {
    const b = bilanse[i];
    return `<a class="karta" href="${slug}/index.html">
<h2>${uciekaj(b.nazwa)}</h2>
<p>${b.moduly} modułów · ${b.lekcje} lekcji · ${Math.round(b.znakow / 1000)} tys. znaków<br>${b.zrzutyJest} zrzutów w treści, ${b.zrzutyBrak} miejsc jeszcze bez obrazu</p>
</a>`;
  })
  .join("\n");

writeFileSync(
  join(KAT, "index.html"),
  strona({
    szeroki: true,
    tytul: "Podgląd kursów — Automatic AI",
    pasek: `<strong>Automatic AI — podgląd treści kursów</strong><span>lokalnie, do oceny</span>`,
    tresc: `
<p class="nadtytul">Do oceny wzrokowej</p>
<h1>Oba kursy w stylu strony</h1>
<p>Treść pochodzi z plików <code>tresc-kursow/</code> przez tę samą funkcję, którą wgrywarka wysyła lekcje do bazy — widzisz więc dokładnie to, co dostanie uczeń: bez frontmatteru i bez tabeli „Zgodność ze źródłem".</p>
<div class="karty">
${karty}
</div>
<p class="uwaga">Miejsca bez zrzutu są celowo widoczne — przerywana ramka z podpisem pokazuje, co ma się tam znaleźć. Zrzuty wymagające zalogowania czekają na wspólne posiedzenie i też są tu widoczne jako dziury.</p>`,
  })
);

console.log(`podgląd kursów → ${KAT}`);
for (const b of bilanse) {
  console.log(
    `  ${b.nazwa}: ${b.moduly} modułów, ${b.lekcje} lekcji, ${Math.round(b.znakow / 1000)} tys. znaków, zrzuty ${b.zrzutyJest} jest / ${b.zrzutyBrak} brak`
  );
}
console.log(`  zasobów skopiowanych: ${zasoby.size} zrzutów + 2 fonty`);
