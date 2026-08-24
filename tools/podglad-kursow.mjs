/**
 * Lokalny podgląd obu kursów W STYLU STRONY — to, co klient dostaje PO zakupie.
 *
 * DLACZEGO ISTNIEJE. Materiał kursu nie jest publiczny na stronie (decyzja
 * właściciela 2026-08-18: kurs za logowaniem, etap WP), więc proza z
 * `tresc-kursow/` nie ma dziś ŻADNEGO widoku — ani w katalogu, ani na stronie
 * sprzedażowej. Ocenić 73 lekcje w edytorze się nie da: nie widać typografii,
 * nie widać, jak siadają zrzuty, nie widać długości lekcji okiem czytelnika.
 * To narzędzie składa z tych samych plików statyczny podgląd w design systemie
 * „Volt", żeby właściciel oglądał to, co zobaczy uczeń.
 *
 * REDESIGN 2026-08-24 (polecenie właściciela). Do 0.33.0 podgląd był czystym
 * dokumentem: jedna kolumna, pasek z nazwą kursu, „poprzednia / następna" na
 * dole. Właściciel ocenił to jednym zdaniem — „wygląda tanio i słabo wypada
 * przy stronie sprzedażowej". Ocena była trafna nie tylko estetycznie:
 * strona sprzedażowa POKAZUJE w sekcji „Tak wygląda kurs od środka" mockup
 * z modułami, statusami lekcji i postępem, i obiecuje pod nim „zawsze wiesz,
 * gdzie jesteś" oraz „widzisz swój postęp lekcja po lekcji". Widok kursu nie
 * miał ani jednej z tych rzeczy, czyli obietnica ze strony sprzedażowej była
 * niedotrzymana — ta sama klasa usterki co BLAD-015 z audytu kursów.
 *
 * Wygląd, szablony i skrypt mieszkają od tej wersji w `tools/podglad-kursow/`.
 * Ten plik odpowiada już tylko za PRZEBIEG: argumenty, zebranie prozy,
 * złożenie stron i skopiowanie zasobów. Powód rozdziału jest przyszły: produkt
 * idzie na WordPressa z Tutor LMS, a Tutor nadpisuje się szablonami i CSS-em —
 * arkusz w osobnym pliku przenosi się tam wprost.
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
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { WZORZEC_PROZY, czytajProze } from "../lib/proza-lekcji.ts";
import { lekcje as odmienLekcje, moduly as odmienModuly } from "../lib/odmiana.ts";

import { policzZrzuty, uciekaj, zlozLekcje } from "./podglad-kursow/tresc.mjs";
import { ikona } from "./podglad-kursow/ikony.mjs";
import { styl } from "./podglad-kursow/style.mjs";
import { skrypt } from "./podglad-kursow/skrypt.mjs";
import {
  akcjaDalej,
  etykieta,
  kartaNawigacji,
  liczby,
  metaListwa,
  modulAkordeon,
  pasOdhaczenia,
  pigulka,
  postepKursu,
  rozwijane,
  spisProgramu,
  spisSekcji,
  strona,
} from "./podglad-kursow/szablony.mjs";

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

/* ---------- opisy kursów ---------- */

const NAZWY_KURSOW = {
  "jak-korzystac-z-claude": "Jak poprawnie korzystać z Claude",
  "jak-uzywac-githuba": "Jak poprawnie używać GitHuba",
};

/**
 * Jednozdaniowe wprowadzenia na kartach i w hero strony kursu.
 *
 * Zdania są przepisane z pól `short_desc` obu kursów w seedzie
 * (`tools/seed/seed-przyklady.ts`) — czyli z tego samego tekstu, który stoi
 * na stronie sprzedażowej. Wymyślenie tu własnych zachęt byłoby dokładnie tym
 * rozjazdem obietnicy, który naprawiał audyt kursów (BLAD-015).
 */
const OPISY_KURSOW = {
  "jak-korzystac-z-claude":
    "Od pierwszej rozmowy w przeglądarce, przez Claude Code na Twoim komputerze, po API i koszty w produkcji.",
  "jak-uzywac-githuba":
    "Od pierwszego repozytorium i commita, przez pracę zespołową i przeglądy kodu, po automatyzację i bezpieczeństwo.",
};

const plikLekcji = (l) => `m${l.modul}-l${l.lekcja}.html`;
/** Klucz pamięci przeczytanych lekcji — stabilny i niezależny od nazw plików. */
const kluczLekcji = (l) => `${l.kurs}/${l.modul}.${l.lekcja}`;

/* ---------- zbieranie prozy ---------- */

/** Jeden kurs: moduły → lekcje, każda z prozą gotową dla klienta. */
function zbierzKurs(slug) {
  const kat = join(TRESC, slug);
  const nazwyModulow = readdirSync(kat, { withFileTypes: true })
    .filter((w) => w.isDirectory() && /^modul-\d+$/.test(w.name))
    .map((w) => w.name)
    .sort((a, b) => Number(a.slice(6)) - Number(b.slice(6)));

  const lekcje = [];
  for (const nazwaModulu of nazwyModulow) {
    const katModulu = join(kat, nazwaModulu);
    const pliki = readdirSync(katModulu)
      .filter((n) => WZORZEC_PROZY.test(n))
      .sort((a, b) => Number(a.match(WZORZEC_PROZY)[1]) - Number(b.match(WZORZEC_PROZY)[1]));
    for (const plik of pliki) {
      const sciezka = join(katModulu, plik);
      const proza = czytajProze(readFileSync(sciezka, "utf8"), sciezka);
      const zrzuty = policzZrzuty(proza.tresc);
      lekcje.push({
        ...proza,
        sciezka,
        katModulu,
        plik: plikLekcji(proza),
        klucz: kluczLekcji(proza),
        znakow: proza.tresc.length,
        zrzutyJest: zrzuty.jest,
        zrzutyBrak: zrzuty.brakuje,
      });
    }
  }

  // moduły jako struktura — potrzebne i spisowi w menu, i akordeonom
  const moduly = [];
  for (const lekcja of lekcje) {
    let modul = moduly.find((m) => m.nr === lekcja.modul);
    if (!modul) {
      modul = { nr: lekcja.modul, tytul: lekcja.tytulModulu, lekcje: [] };
      moduly.push(modul);
    }
    modul.lekcje.push(lekcja);
  }

  return { slug, nazwa: NAZWY_KURSOW[slug] ?? slug, lekcje, moduly };
}

/* ---------- strona lekcji ---------- */

function stronaLekcji({ kurs, lekcja, indeks, zasoby }) {
  const { html, spis, lead } = zlozLekcje({ lekcja, marked, zasoby });

  const poprzednia = kurs.lekcje[indeks - 1];
  const nastepna = kurs.lekcje[indeks + 1];

  const menu = [
    rozwijane({
      etykieta: "Program",
      ikona: "lista",
      tresc: spisProgramu({
        kurs: kurs.nazwa,
        moduly: kurs.moduly,
        biezaca: lekcja.plik,
      }),
    }),
  ];
  if (spis.length > 0) {
    menu.push(
      rozwijane({ etykieta: "W lekcji", ikona: "kompas", tresc: spisSekcji(spis) })
    );
  }

  const belka = pigulka({
    dom: "index.html",
    domOpis: `Wróć do spisu kursu ${kurs.nazwa}`,
    tytul: `<b>${uciekaj(kurs.nazwa)}</b> · moduł ${lekcja.modul}`,
    menu,
    akcja: nastepna ? akcjaDalej(nastepna.plik, "Następna") : "",
    postep: true,
  });

  const zrzutow = lekcja.zrzutyJest + lekcja.zrzutyBrak;
  const meta = metaListwa([
    `lekcja <b>${indeks + 1}</b> z ${kurs.lekcje.length}`,
    `<b>${Math.round(lekcja.znakow / 1000)}</b> tys. znaków`,
    zrzutow > 0 ? `<b>${lekcja.zrzutyJest}</b> z ${zrzutow} zrzutów` : null,
  ]);

  const tresc = `<header class="hero">
  <div class="kolumna">
    ${etykieta(`moduł ${lekcja.modul} · lekcja ${lekcja.lekcja} · ${lekcja.tytulModulu}`)}
    <h1>${uciekaj(lekcja.tytulLekcji)}</h1>
    ${lead ? `<div class="lead">${lead}</div>` : ""}
    ${meta}
  </div>
</header>
<main id="tresc" class="kolumna tresc">
${html}
${pasOdhaczenia(lekcja.klucz)}
<nav class="nawigacja" aria-label="Sąsiednie lekcje">
${kartaNawigacji({
  href: poprzednia ? poprzednia.plik : null,
  kierunek: "poprzednia lekcja",
  tytul: poprzednia ? poprzednia.tytulLekcji : "",
})}
${kartaNawigacji({
  href: nastepna ? nastepna.plik : null,
  kierunek: "następna lekcja",
  tytul: nastepna ? nastepna.tytulLekcji : "",
  dalej: true,
})}
</nav>
</main>`;

  return strona({
    tytul: `${lekcja.modul}.${lekcja.lekcja} ${lekcja.tytulLekcji} — ${kurs.nazwa}`,
    prefiks: "../",
    pigulka: belka,
    tresc,
  });
}

/* ---------- strona kursu ---------- */

function stronaKursu({ kurs, bilans }) {
  const belka = pigulka({
    dom: "../index.html",
    domOpis: "Wróć do obu kursów",
    tytul: `<b>${uciekaj(kurs.nazwa)}</b>`,
    menu: [
      rozwijane({
        etykieta: "Program",
        ikona: "lista",
        tresc: spisProgramu({ kurs: kurs.nazwa, moduly: kurs.moduly }),
      }),
    ],
    akcja: kurs.lekcje.length ? akcjaDalej(kurs.lekcje[0].plik, "Zacznij") : "",
  });

  const klucze = kurs.lekcje.map((l) => l.klucz);
  const akordeony = kurs.moduly
    .map((modul, i) => modulAkordeon({ modul, otwarty: i === 0 }))
    .join("\n");

  const opis = OPISY_KURSOW[kurs.slug];

  const tresc = `<header class="hero">
  <div class="kolumna kolumna-szeroka">
    ${etykieta(`kurs · ${odmienModuly(kurs.moduly.length)} · ${odmienLekcje(kurs.lekcje.length)}`)}
    <h1>${uciekaj(kurs.nazwa)}</h1>
    ${opis ? `<p class="lead">${uciekaj(opis)}</p>` : ""}
    ${/*
      Kafelki mówią wyłącznie o OBJĘTOŚCI materiału (moduły, lekcje, znaki,
      zrzuty) i nic o czasie. Szacunek „~7 h czytania" byłby tu drugą liczbą
      o czasie obok `duration_min` z programu, na którym stoi strona
      sprzedażowa (12 h materiału) — dwie różne liczby o tym samym produkcie
      to dokładnie ten rozjazd obietnicy, który naprawiał audyt (BLAD-015).
    */ ""}${liczby([
      [String(kurs.moduly.length), "modułów"],
      [String(kurs.lekcje.length), "lekcji"],
      [`${Math.round(bilans.znakow / 1000)} tys.`, "znaków prozy"],
      [String(bilans.zrzutyJest), "zrzutów w treści"],
    ])}
    ${postepKursu(klucze)}
  </div>
</header>
<main id="tresc" class="kolumna kolumna-szeroka">
  <div class="moduly">
${akordeony}
  </div>
</main>
<footer class="stopka kolumna kolumna-szeroka">Automatic AI · podgląd lokalny · noindex</footer>`;

  return strona({
    tytul: `${kurs.nazwa} — podgląd treści`,
    prefiks: "../",
    pigulka: belka,
    tresc,
  });
}

/* ---------- strona wejściowa ---------- */

function stronaWejsciowa(bilanse) {
  const belka = pigulka({
    dom: "index.html",
    domOpis: "Automatic AI — podgląd treści kursów",
    tytul: "<b>Automatic AI</b> · podgląd treści kursów",
  });

  const karty = bilanse
    .map((b) => {
      const opis = OPISY_KURSOW[b.slug];
      return `<a class="karta wejscie" href="${b.slug}/index.html">
  <span class="karta-etykieta">kurs</span>
  <h2>${uciekaj(b.nazwa)}</h2>
  ${opis ? `<p class="karta-opis">${uciekaj(opis)}</p>` : ""}
  <ul class="karta-liczby">
    <li>${uciekaj(odmienModuly(b.moduly))}</li>
    <li>${uciekaj(odmienLekcje(b.lekcje))}</li>
    <li>${Math.round(b.znakow / 1000)} tys. znaków</li>
    <li>${b.zrzutyJest} zrzutów</li>
    ${b.zrzutyBrak ? `<li>${b.zrzutyBrak} miejsc bez zrzutu</li>` : ""}
  </ul>
  <span class="karta-wejscie">Otwórz kurs ${ikona("strzalkaPrawo")}</span>
</a>`;
    })
    .join("\n");

  const tresc = `<header class="hero">
  <div class="kolumna kolumna-szeroka">
    ${etykieta("do oceny wzrokowej")}
    <h1>Oba kursy w stylu strony</h1>
    <p class="lead">Treść pochodzi z plików <code>tresc-kursow/</code> przez tę samą funkcję, którą wgrywarka wysyła lekcje do bazy — widzisz więc dokładnie to, co dostanie uczeń: bez frontmatteru i bez tabeli „Zgodność ze źródłem".</p>
  </div>
</header>
<main id="tresc" class="kolumna kolumna-szeroka">
  <div class="karty">
${karty}
  </div>
  <p class="uwaga">${ikona("info")}<span>Miejsca bez zrzutu są celowo widoczne — przerywana ramka z podpisem pokazuje, co ma się tam znaleźć. Postęp czytania zapisuje się w pamięci tej przeglądarki, nie na koncie: to podgląd do oceny, nie platforma z logowaniem.</span></p>
</main>
<footer class="stopka kolumna kolumna-szeroka">Automatic AI · podgląd lokalny · noindex</footer>`;

  return strona({
    tytul: "Podgląd kursów — Automatic AI",
    prefiks: "",
    pigulka: belka,
    tresc,
  });
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
const bilanse = [];

for (const slug of slugi) {
  const kurs = zbierzKurs(slug);
  const katKursu = join(KAT, slug);
  mkdirSync(katKursu, { recursive: true });

  kurs.lekcje.forEach((lekcja, indeks) => {
    writeFileSync(
      join(katKursu, lekcja.plik),
      stronaLekcji({ kurs, lekcja, indeks, zasoby })
    );
  });

  const bilans = {
    slug,
    nazwa: kurs.nazwa,
    moduly: kurs.moduly.length,
    lekcje: kurs.lekcje.length,
    znakow: kurs.lekcje.reduce((s, l) => s + l.znakow, 0),
    zrzutyJest: kurs.lekcje.reduce((s, l) => s + l.zrzutyJest, 0),
    zrzutyBrak: kurs.lekcje.reduce((s, l) => s + l.zrzutyBrak, 0),
  };

  writeFileSync(join(katKursu, "index.html"), stronaKursu({ kurs, bilans }));
  bilanse.push(bilans);
}

/*
 * Arkusz i skrypt lądują RAZ w `zasoby/`, a strony je linkują. Wklejanie ich
 * do każdego z 76 dokumentów kosztowało 4 MB powtórzonego tekstu i nie dawało
 * się buforować — a podgląd kursu to serwis, po którym się chodzi.
 */
writeFileSync(join(KAT, "zasoby", "styl.css"), styl());
writeFileSync(join(KAT, "zasoby", "widok.js"), skrypt());

for (const [nazwa, zrodlo] of zasoby) copyFileSync(zrodlo, join(KAT, "zasoby", nazwa));
for (const font of ["Geist-subset.woff2", "GeistMono-subset.woff2"]) {
  copyFileSync(join(KORZEN, "public", "fonts", font), join(KAT, "zasoby", font));
}
copyFileSync(
  join(KORZEN, "public", "fonts", "LICENSE-Geist-OFL.txt"),
  join(KAT, "zasoby", "LICENSE-Geist-OFL.txt")
);

writeFileSync(join(KAT, "index.html"), stronaWejsciowa(bilanse));

console.log(`podgląd kursów → ${KAT}`);
for (const b of bilanse) {
  console.log(
    `  ${b.nazwa}: ${b.moduly} modułów, ${b.lekcje} lekcji, ${Math.round(b.znakow / 1000)} tys. znaków, zrzuty ${b.zrzutyJest} jest / ${b.zrzutyBrak} brak`
  );
}
console.log(
  `  zasobów: ${zasoby.size} zrzutów + 2 fonty + arkusz i skrypt (wspólne dla ${bilanse.reduce((n, b) => n + b.lekcje, 0) + bilanse.length + 1} stron)`
);
