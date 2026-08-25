/**
 * Dowód różnicowy renderera prozy: PHP wtyczki kontra `marked` z podglądu.
 *
 * PO CO. Widok lekcji ma DWIE implementacje tego samego składu: renderer PHP
 * we wtyczce (bo hosting nie ma Node'a, a wtyczka nie ma zależności) i
 * `tools/podglad-kursow/tresc.mjs` na `marked`, którym powstał podgląd kursów
 * przyjęty przez właściciela w 0.34.0. Dwie implementacje bez porównania to
 * dwie okazje do rozjazdu — a rozjazd w treści kursu jest niewidoczny, dopóki
 * ktoś nie przeczyta akurat tej lekcji.
 *
 * CO PORÓWNUJEMY.
 *   1. TEKST — co do słowa. Renderer nie ma prawa zgubić ani dopisać ani
 *      jednego wyrazu prozy. To jest właściwe pytanie, bo cała reszta jest
 *      oprawą, a treść jest towarem.
 *   2. STRUKTURĘ — co do liczby znaczników blokowych (akapity, pozycje list,
 *      komórki tabel, bloki kodu, cytaty, obrazy, nagłówki niższego rzędu).
 *      Sam tekst zgodziłby się także wtedy, gdyby tabela zamieniła się
 *      w akapit.
 *
 * CZEGO NIE PORÓWNUJEMY: adresów obrazów (w podglądzie są plikami obok, we
 * wtyczce załącznikami biblioteki mediów) ani klas CSS.
 *
 * WYMAGA: riga z `marked` (jak podgląd kursów) i środowiska WP.
 *   mkdir -p /tmp/rig && cd /tmp/rig && npm init -y && npm i marked
 *   ZRZUTY_RIG=/tmp/rig node tools/sprawdz-proze-php.mjs
 */
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { czytajProze, WZORZEC_PROZY } from "../lib/proza-lekcji.ts";
import { zlozLekcje } from "./podglad-kursow/tresc.mjs";

const RIG = process.env.ZRZUTY_RIG;
if (!RIG) {
  console.error(
    "sprawdz-proze-php: ustaw ZRZUTY_RIG na katalog z zainstalowanym `marked`.\n" +
      "  mkdir -p /tmp/rig && cd /tmp/rig && npm init -y && npm i marked"
  );
  process.exit(1);
}
const { marked } = createRequire(join(RIG, "package.json"))("marked");

const STACK = process.env.STACK_NAZWA ?? "aai_wp";
const KONTENER = `${STACK}_cli`;
const TRESC = "tresc-kursow";

/* ---------- proza z repo ---------- */

const lekcje = [];
for (const kurs of readdirSync(TRESC, { withFileTypes: true }).filter((w) => w.isDirectory())) {
  const katKursu = join(TRESC, kurs.name);
  for (const modul of readdirSync(katKursu, { withFileTypes: true }).filter(
    (w) => w.isDirectory() && /^modul-\d+$/.test(w.name)
  )) {
    const katModulu = join(katKursu, modul.name);
    for (const plik of readdirSync(katModulu).filter((n) => WZORZEC_PROZY.test(n))) {
      const sciezka = join(katModulu, plik);
      const proza = czytajProze(readFileSync(sciezka, "utf8"), sciezka);
      lekcje.push({
        klucz: `${kurs.name}/${modul.name}/${plik}`,
        md: proza.tresc,
        katModulu,
        kurs: kurs.name,
        modul: proza.modul,
      });
    }
  }
}

if (lekcje.length === 0) {
  console.error("sprawdz-proze-php: nie znalazłem ani jednego pliku prozy.");
  process.exit(1);
}

/* ---------- strona PHP ---------- */

const wejscie = {
  lekcje: lekcje.map((l) => ({
    klucz: l.klucz,
    md: l.md,
    // Obrazy podajemy jako mapę „ścieżka z prozy → adres", żeby PHP zrobił
    // figury tak samo jak podgląd. Adresy i tak normalizujemy przed
    // porównaniem — chodzi o STRUKTURĘ figury, nie o to, gdzie leży plik.
    obrazy: Object.fromEntries(
      [...l.md.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map((m) => [
        m[1],
        { url: `https://przyklad/${m[1]}`, szerokosc: 1000, wysokosc: 700 },
      ])
    ),
  })),
};

const plik = join(tmpdir(), "sprawdz-proze-php.json");
writeFileSync(plik, JSON.stringify(wejscie));
execFileSync("podman", ["cp", plik, `${KONTENER}:/tmp/proza.json`], { stdio: "ignore" });
const surowe = execFileSync(
  "podman",
  ["exec", KONTENER, "wp", "--path=/var/www/html", "aai-sklep", "proza", "/tmp/proza.json"],
  { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }
);
const zPhp = JSON.parse(surowe.trim().split("\n").pop());

/* ---------- porównanie ---------- */

/*
 * DWIE ZNANE RÓŻNICE — obie są usterkami WZORCA, nie renderera PHP, i obie
 * biorą się z tego samego: `marked` próbuje emfazy PRZED kodem w linii,
 * a CommonMark (i my) najpierw wyjmuje kod.
 *
 *   1. `**\`Ctrl+J\`**` — pogrubienie zaczynające się kodem. `marked`
 *      zostawia dosłowne gwiazdki, my składamy pogrubienie. W podglądzie
 *      widać dziś `** \ + Enter**` z gwiazdkami.
 *   2. kod w linii, którego treść ZACZYNA SIĘ gwiazdkami (w kursie:
 *      wzorzec pliku ustawień lokalnych Claude Code). `marked` paruje je
 *      z gwiazdkami stojącymi dalej w akapicie: gubi
 *      kod i robi pogrubienie przez pół zdania. My trzymamy kod w całości.
 *
 * Zamiast osłabiać porównanie tolerancją, NAPRAWIAMY wzorzec w obu
 * miejscach: (1) składamy pogrubienie z gwiazdek, które `marked` zostawił
 * POZA kodem, (2) przed złożeniem chowamy gwiazdki i podkreślenia
 * wewnątrz kodu w linii, a po złożeniu przywracamy je co do znaku.
 * Wszystko poza tymi dwiema nazwanymi różnicami musi zgadzać się co do
 * słowa i co do znacznika.
 */
const SCHOWANE = { "*": "\u0001", _: "\u0002" };

/** Markdown dla wzorca: gwiazdki i podkreślenia w kodzie w linii chowamy. */
function dlaWzorca(md) {
  return md.replace(/(`+)([^`\n]*?)\1(?!`)/g, (calosc, plot, srodek) =>
    plot + srodek.replace(/[*_]/g, (z) => SCHOWANE[z]) + plot
  );
}

/** Wynik wzorca: przywracamy schowane znaki i składamy pominięte pogrubienia. */
function naprawWzor(html) {
  const kody = [];
  // Kod w linii wyjmujemy, żeby naprawa pogrubień go nie dotknęła — w lekcji
  // o Markdownie w kodzie stoją PRZYKŁADY `**tekst**`, które mają zostać tekstem.
  const bezKodu = html.replace(/<code>[\s\S]*?<\/code>/g, (m) => {
    kody.push(m);
    return `\u0003${kody.length - 1}\u0003`;
  });
  const zPogrubieniem = bezKodu.replace(
    /\*\*(?=[^\s*])((?:(?!\*\*)[\s\S])+?)(?<=[^\s*])\*\*/g,
    "<strong>$1</strong>"
  );
  return zPogrubieniem
    .replace(/\u0003(\d+)\u0003/g, (_, nr) => kody[Number(nr)])
    .replaceAll(SCHOWANE["*"], "*")
    .replaceAll(SCHOWANE._, "_");
}

/** Tekst widoczny dla człowieka: bez znaczników, bez podwójnych spacji. */
function tekst(html) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Liczba znaczników każdego rodzaju — struktura bez klas i adresów. */
function struktura(html) {
  const wynik = {};
  for (const znacznik of ["p", "li", "ul", "ol", "table", "tr", "th", "td", "pre", "code", "blockquote", "h3", "h4", "h5", "h6", "hr", "img", "figure", "strong", "em", "del", "a"]) {
    wynik[znacznik] = (html.match(new RegExp(`<${znacznik}[ >]`, "g")) ?? []).length;
  }
  return wynik;
}

const bledy = [];
let porownanych = 0;

for (const lekcja of lekcje) {
  const php = zPhp[lekcja.klucz];
  if (!php || php.blad) {
    bledy.push(`${lekcja.klucz}: PHP nie złożył lekcji — ${php?.blad ?? "brak wyniku"}`);
    continue;
  }

  // Strona referencyjna: to samo narzędzie, którym powstał przyjęty podgląd.
  const zasoby = new Map();
  const wzorzec = zlozLekcje({
    lekcja: { tresc: dlaWzorca(lekcja.md), katModulu: lekcja.katModulu, kurs: lekcja.kurs, modul: lekcja.modul },
    marked,
    zasoby,
  });

  porownanych += 1;

  const tekstPhp = tekst(php.lead + " " + php.html);
  const tekstJs = tekst(naprawWzor(wzorzec.lead + " " + wzorzec.html));
  if (tekstPhp !== tekstJs) {
    // Pokazujemy PIERWSZE rozejście się, nie całe teksty — inaczej raport
    // z 20 tys. znaków niczego nie tłumaczy.
    let i = 0;
    while (i < tekstPhp.length && i < tekstJs.length && tekstPhp[i] === tekstJs[i]) i += 1;
    bledy.push(
      `${lekcja.klucz}: TEKST się różni od znaku ${i}\n` +
        `      PHP:  …${tekstPhp.slice(Math.max(0, i - 40), i + 60)}…\n` +
        `      wzór: …${tekstJs.slice(Math.max(0, i - 40), i + 60)}…`
    );
  }

  const sPhp = struktura(php.lead + php.html);
  const sJs = struktura(naprawWzor(wzorzec.lead + wzorzec.html));
  const roznice = Object.keys(sPhp).filter((z) => sPhp[z] !== sJs[z]);
  if (roznice.length > 0) {
    bledy.push(
      `${lekcja.klucz}: STRUKTURA się różni — ` +
        roznice.map((z) => `<${z}>: PHP ${sPhp[z]}, wzór ${sJs[z]}`).join("; ")
    );
  }
}

if (bledy.length > 0) {
  console.error(`\nsprawdz-proze-php: ${bledy.length} lekcji rozjechanych na ${porownanych}:`);
  for (const b of bledy.slice(0, 12)) console.error(`  ✖ ${b}`);
  if (bledy.length > 12) console.error(`  … i ${bledy.length - 12} dalszych`);
  process.exit(1);
}

console.log(
  `sprawdz-proze-php: ${porownanych} lekcji — renderer PHP składa je co do SŁOWA i co do znacznika tak samo, jak narzędzie, którym powstał przyjęty podgląd.`
);
