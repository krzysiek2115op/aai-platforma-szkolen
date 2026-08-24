/**
 * Szablony stron podglądu: powłoka dokumentu, pływająca pigułka menu,
 * hero, karty i listy modułów.
 *
 * KIERUNEK ARTYSTYCZNY. Wszystko tu jest przeniesione ze strony sprzedażowej
 * `/szkolenia/[slug]` — nie skopiowane mechanicznie, ale zbudowane z tych
 * samych elementów: pływająca pigułka zamiast paska (`components/kurs/
 * PasekKursu.tsx`), editorialne etykiety `[ … ]` (`Wspolne.tsx`), panele
 * i akordeony `<details>` (`SekcjaProgram.tsx`), znaczniki postępu przy
 * lekcjach (`components/szkolenia/OknoKursu.tsx`).
 *
 * DLACZEGO AKURAT OknoKursu JEST WZORCEM. Strona sprzedażowa pokazuje w
 * sekcji „Tak wygląda kurs od środka" mockup z listą modułów, statusami
 * lekcji i paskami postępu, a pod nim obiecuje: „zawsze wiesz, gdzie
 * jesteś", „widzisz swój postęp lekcja po lekcji", „to samo zobaczysz po
 * zalogowaniu". Do 0.33.0 widok kursu nie miał ŻADNEJ z tych trzech rzeczy —
 * czyli obietnica ze strony sprzedażowej była niedotrzymana. Ten redesign
 * jest przede wszystkim jej dotrzymaniem; ładniejsze tło to skutek uboczny.
 */
import { lekcje as odmienLekcje } from "../../lib/odmiana.ts";

import { ikona } from "./ikony.mjs";
import { SKRYPT_WCZESNY } from "./skrypt.mjs";
import { uciekaj } from "./tresc.mjs";

/* ————————————————— powłoka dokumentu ————————————————— */

/**
 * @param {object} p
 * @param {string} p.tytul       tytuł karty przeglądarki
 * @param {string} p.prefiks     droga do katalogu `zasoby/` z TEJ strony
 *                               („" w korzeniu, „../" na podstronie)
 * @param {string} p.pigulka     gotowy HTML pływającego menu
 * @param {string} p.tresc       gotowy HTML treści
 */
export function strona({ tytul, prefiks, pigulka, tresc }) {
  return `<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#08090b">
<title>${uciekaj(tytul)}</title>
<link rel="preload" href="${prefiks}zasoby/Geist-subset.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${prefiks}zasoby/styl.css">
<script>${SKRYPT_WCZESNY}</script>
</head>
<body>
<div class="tlo" aria-hidden="true">
  <div class="tlo-siatka"></div>
  <div class="tlo-blob tlo-blob-a"></div>
  <div class="tlo-blob tlo-blob-b"></div>
  <div class="tlo-glow"></div>
  <div class="tlo-ziarno"></div>
</div>
${pigulka}
<div class="strona">
${tresc}
</div>
<script src="${prefiks}zasoby/widok.js" defer></script>
</body>
</html>
`;
}

/* ————————————————— pływająca pigułka menu ————————————————— */

/**
 * @param {object} p
 * @param {string} p.dom         adres pod sygnetem marki
 * @param {string} p.domOpis     etykieta dostępności sygnetu
 * @param {string} p.tytul       gotowy HTML środkowej etykiety
 * @param {string[]} p.menu      gotowe HTML-e rozwijanych menu
 * @param {string} [p.akcja]     gotowy HTML prawego przycisku
 * @param {boolean} [p.postep]   czy dokładać nitkę postępu czytania
 */
export function pigulka({ dom, domOpis, tytul, menu = [], akcja = "", postep = false }) {
  return `<header class="pigulka-kotwica">
  <nav class="pigulka" aria-label="Nawigacja kursu">
    <a class="pigulka-znak" href="${dom}" aria-label="${uciekaj(domOpis)}">${ikona("znak")}</a>
    <p class="pigulka-tytul">${tytul}</p>
    ${menu.join("\n    ")}
    ${akcja}
    ${postep ? '<span class="pigulka-postep" aria-hidden="true"></span>' : ""}
  </nav>
</header>`;
}

/** Rozwijane menu w pigułce — na `<details>`, więc działa i bez skryptu. */
export function rozwijane({ etykieta, ikona: nazwaIkony, tresc }) {
  return `<details class="rozwijane">
      <summary class="pigulka-akcja">${ikona(nazwaIkony)}<span>${uciekaj(etykieta)}</span>${ikona("szewron")}</summary>
      <div class="rozwijane-tresc">${tresc}</div>
    </details>`;
}

/** Prawy przycisk pigułki — „Następna lekcja”. */
export function akcjaDalej(href, etykieta) {
  return `<a class="pigulka-akcja pigulka-akcja-mocna" href="${href}"><span>${uciekaj(etykieta)}</span>${ikona("strzalkaPrawo")}</a>`;
}

/* ————————————————— spis lekcji do menu „Program” ————————————————— */

/**
 * Pełny program kursu jako spis w rozwijanym menu.
 *
 * `data-lekcja` na każdym odsyłaczu to klucz pamięci przeczytanych lekcji —
 * ten sam, którego używa przycisk „Oznacz jako przeczytaną”. Dzięki temu
 * ptaszek pojawia się w spisie na KAŻDEJ stronie, nie tylko tam, gdzie
 * kliknięto.
 */
export function spisProgramu({ kurs, moduly, biezaca = null }) {
  const sekcje = moduly.map((modul) => {
    const pozycje = modul.lekcje
      .map((l) => {
        const aktywna = biezaca === l.plik;
        return (
          `<li><a href="${l.plik}" data-lekcja="${uciekaj(l.klucz)}"` +
          (aktywna ? ' aria-current="page"' : "") +
          `><span class="spis-nr">${l.modul}.${l.lekcja}</span>` +
          `<span>${uciekaj(l.tytulLekcji)}</span></a></li>`
        );
      })
      .join("");
    return (
      `<div class="spis-modul">` +
      `<p class="rozwijane-naglowek">Moduł ${modul.nr} — ${uciekaj(modul.tytul)}</p>` +
      `<ul class="spis-lista">${pozycje}</ul>` +
      `</div>`
    );
  });
  return (
    `<p class="rozwijane-naglowek">${uciekaj(kurs)}</p>` + sekcje.join("")
  );
}

/**
 * Spis sekcji bieżącej lekcji — kotwice w obrębie strony.
 *
 * `tekst` przychodzi już jako HTML (tytuły przeszły przez markdown liniowy
 * w `zlozLekcje`, żeby nazwy plików w odwróconych apostrofach składały się
 * czcionką o stałej szerokości), więc TU go nie uciekamy — druga ucieczka
 * pokazałaby w menu znaczniki HTML.
 */
export function spisSekcji(spis) {
  const pozycje = spis
    .map((s) => `<li><a href="#${s.id}"><span>${s.tekst}</span></a></li>`)
    .join("");
  return (
    `<p class="rozwijane-naglowek">W tej lekcji</p>` +
    `<ul class="spis-lista">${pozycje}</ul>`
  );
}

/* ————————————————— części stron ————————————————— */

/** Editorialna etykieta `[ … ]` — dokładnie jak `Etykieta` ze strony. */
export function etykieta(tekst) {
  return `<p class="etykieta">[ ${uciekaj(tekst)} ]</p>`;
}

/**
 * Listwa metadanych pod nagłówkiem lekcji: pozycja w kursie i objętość.
 *
 * „Lekcja 7 z 41" jest liczona z programu, więc jest prawdziwa niezależnie od
 * tego, czy ktokolwiek cokolwiek odhaczył — to odpowiedź na obietnicę
 * „zawsze wiesz, gdzie jesteś". Postęp z pamięci przeglądarki dokłada się
 * osobno i osobno jest podpisany, żeby nikt nie wziął go za konto.
 */
export function metaListwa(pozycje) {
  return `<div class="meta-listwa">${pozycje
    .filter(Boolean)
    .map((p) => `<span>${p}</span>`)
    .join("")}</div>`;
}

/** Karta „poprzednia / następna lekcja” pod treścią. */
export function kartaNawigacji({ href, kierunek, tytul, dalej = false }) {
  if (!href) {
    return `<div class="nawigacja-karta nawigacja-pusto${dalej ? " nawigacja-karta-dalej" : ""}">
      <span class="nawigacja-kierunek">${dalej ? "koniec kursu" : "początek kursu"}</span>
      <span class="nawigacja-tytul">—</span>
    </div>`;
  }
  const strzalka = dalej ? ikona("strzalkaPrawo") : ikona("strzalkaLewo");
  return `<a class="nawigacja-karta${dalej ? " nawigacja-karta-dalej" : ""}" href="${href}">
      <span class="nawigacja-kierunek">${dalej ? `<span>${uciekaj(kierunek)}</span>${strzalka}` : `${strzalka}<span>${uciekaj(kierunek)}</span>`}</span>
      <span class="nawigacja-tytul">${uciekaj(tytul)}</span>
    </a>`;
}

/** Przycisk odhaczenia lekcji + uczciwy podpis, skąd bierze się ten stan. */
export function pasOdhaczenia(klucz) {
  return `<div class="odhacz-pas">
  <button type="button" class="odhacz" data-lekcja="${uciekaj(klucz)}" aria-pressed="false">
    ${ikona("ptaszek")}<span>Oznacz jako przeczytaną</span>
  </button>
  <p class="odhacz-nota">Postęp zapisuje się w pamięci tej przeglądarki — nie na koncie.</p>
</div>`;
}

/** Kafelek liczbowy bilansu (moduły / lekcje / znaki / zrzuty). */
export function liczby(pary) {
  return `<div class="liczby">${pary
    .map(
      ([wartosc, opis]) =>
        `<div><span class="wartosc">${uciekaj(wartosc)}</span><span class="opis">${uciekaj(opis)}</span></div>`
    )
    .join("")}</div>`;
}

/**
 * Pasek ukończenia kursu. Startuje ukryty (`hidden`) i odsłania go skrypt po
 * przeliczeniu — inaczej bez JavaScriptu wisiałby na stronie pusty pasek
 * obiecujący postęp, którego nikt nie policzy.
 */
export function postepKursu(kluczeLekcji) {
  return `<div class="postep-kursu" data-postep-kursu="${uciekaj(kluczeLekcji.join(","))}" hidden>
  <span>Przeczytane w tej przeglądarce</span>
  <span class="postep-tor"><span class="postep-wypelnienie"></span></span>
  <span class="postep-etykieta">0 / ${kluczeLekcji.length}</span>
</div>`;
}

/** Moduł jako akordeon z listą lekcji — wzór: SekcjaProgram + OknoKursu. */
export function modulAkordeon({ modul, otwarty }) {
  const pozycje = modul.lekcje
    .map((l) => {
      const meta = [
        `${Math.round(l.znakow / 1000)} tys. znaków`,
        l.zrzutyBrak ? `${l.zrzutyJest}/${l.zrzutyJest + l.zrzutyBrak} zrzutów` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      return `<li><a class="lekcja-poz" href="${l.plik}" data-lekcja="${uciekaj(l.klucz)}">
        <span class="lekcja-znacznik" aria-hidden="true"><span class="znak-play">${ikona("play")}</span><span class="znak-ptaszek">${ikona("ptaszek")}</span></span>
        <span class="lekcja-nr">${l.modul}.${l.lekcja}</span>
        <span class="lekcja-tytul">${uciekaj(l.tytulLekcji)}</span>
        <span class="lekcja-meta">${uciekaj(meta)}</span>
      </a></li>`;
    })
    .join("\n");

  const znakow = modul.lekcje.reduce((s, l) => s + l.znakow, 0);
  const meta = `${odmienLekcje(modul.lekcje.length)} · ${Math.round(znakow / 1000)} tys. znaków`;

  return `<details class="modul"${otwarty ? " open" : ""}>
  <summary>
    <span class="modul-nr">${String(modul.nr).padStart(2, "0")}</span>
    <span class="modul-tytul">${uciekaj(modul.tytul)}</span>
    <span class="modul-meta">${uciekaj(meta)}</span>
    <span class="modul-strzalka" aria-hidden="true">${ikona("szewron")}</span>
  </summary>
  <ul class="modul-lekcje">
${pozycje}
  </ul>
</details>`;
}

