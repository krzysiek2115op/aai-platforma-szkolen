/**
 * Proza lekcji → HTML z nadaną strukturą.
 *
 * DLACZEGO TO NIE JEST SAMO `marked.parse`. Proza obu kursów ma powtarzalny
 * szkielet — policzone na 73 plikach: „Czego się nauczysz” 73/73,
 * „Zrób to teraz (X minut)” 73/73, „Zapamiętaj” 73/73, „Co dalej” 73/73,
 * „Prompty z tej lekcji” 67, „Gdy coś nie działa” 46. Do wersji 0.33.0
 * wszystkie te sekcje renderowały się jako identyczny `<h2>`, więc lekcja
 * czytała się jak jeden ciągły dokument: cel nauki wyglądał tak samo jak
 * ćwiczenie do zrobienia i tak samo jak podsumowanie. Ten moduł rozpoznaje
 * typ sekcji po nagłówku i pakuje ją we własne pudełko.
 *
 * ZASADA: TREŚĆ ZOSTAJE NIETKNIĘTA. Redesign nie ma prawa zmienić ani słowa
 * prozy (polecenie właściciela 2026-08-24: „to jest redesign UI/UX, nie
 * przebudowa treści”). Rozpoznanie działa więc wyłącznie po nagłówkach,
 * które w prozie JUŻ SĄ, a sekcja nierozpoznana renderuje się dokładnie jak
 * dotąd. Żaden tekst nie jest tu dopisywany ani wycinany — nagłówek zostaje
 * nagłówkiem, zmienia się tylko jego oprawa.
 */
import { existsSync } from "node:fs";
import { basename, join } from "node:path";

import { ikona } from "./ikony.mjs";
import { wymiaryWebp } from "./wymiary.mjs";

export const ZNACZNIK_ZRZUTU = /<!--\s*ZRZUT:\s*([\s\S]*?)-->/g;

export function uciekaj(t) {
  return String(t)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ————————————————— rozpoznawanie typu sekcji ————————————————— */

/**
 * Wzorce celowo zaczepione na POCZĄTKU nagłówka, a nie na całości: w prozie
 * trafiają się warianty w rodzaju „Prompty z tej lekcji (do biblioteki
 * promptów)” czy „Materiały dodatkowe (PDF-dodatek, nie rdzeń)”. Dopasowanie
 * do pełnego napisu wypadałoby z rozpoznania przy każdym takim doprecyzowaniu
 * i sekcja po cichu traciłaby oprawę.
 */
const RODZAJE = [
  { wzorzec: /^Czego się nauczysz/i, typ: "cele", ikona: "cel" },
  { wzorzec: /^Zrób to teraz/i, typ: "cwiczenie", ikona: "terminal" },
  { wzorzec: /^Prompty z tej lekcji/i, typ: "prompty", ikona: "iskra" },
  { wzorzec: /^Gdy coś nie działa/i, typ: "diagnostyka", ikona: "klucz" },
  { wzorzec: /^Zapamiętaj/i, typ: "zapamietaj", ikona: "ksiazka" },
  { wzorzec: /^Co dalej/i, typ: "co-dalej", ikona: "most" },
  { wzorzec: /^Pytania do wykonawcy/i, typ: "pytania", ikona: "pytanie" },
  { wzorzec: /^Materiały dodatkowe/i, typ: "materialy", ikona: "ksiazka" },
  { wzorzec: /^Powiązane/i, typ: "materialy", ikona: "kompas" },
];

/** Odznaka czasu z nagłówka „Zrób to teraz (10 minut)”. */
function odznakaZNaglowka(naglowek) {
  const nawias = naglowek.match(/\(([^)]+)\)\s*$/);
  return nawias ? nawias[1] : null;
}

function rozpoznaj(naglowek) {
  for (const rodzaj of RODZAJE) {
    if (rodzaj.wzorzec.test(naglowek)) return rodzaj;
  }
  return null;
}

/** „3. Trzy drzwi do Claude” → { numer: "03", tytul: "Trzy drzwi do Claude" } */
function rozbijNumerowany(naglowek) {
  const m = naglowek.match(/^(\d+)\.\s+(.*)$/);
  if (!m) return null;
  return { numer: String(m[1]).padStart(2, "0"), tytul: m[2] };
}

/** Kotwica sekcji — z tytułu, bo numer sam w sobie nie jest stabilny. */
export function kotwica(tekst) {
  return (
    "s-" +
    tekst
      .toLowerCase()
      .replace(/[ąàáâã]/g, "a")
      .replace(/ć/g, "c")
      .replace(/ę/g, "e")
      .replace(/ł/g, "l")
      .replace(/ń/g, "n")
      .replace(/[óòô]/g, "o")
      .replace(/ś/g, "s")
      .replace(/[żź]/g, "z")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48)
  );
}

/* ————————————————— cięcie prozy na sekcje ————————————————— */

/**
 * Dzieli markdown na sekcje po nagłówkach `## `.
 *
 * Ogrodzenia kodu są śledzone, bo lekcje o Markdownie i o Claude Code
 * pokazują w blokach kodu tekst zaczynający się od `## ` — bez tego licznika
 * przykład w bloku kodu rozcinałby lekcję w połowie. Ta sama klasa pułapki co
 * w `straznik-linkow` (pomija bloki kodu, bo scenariusze uczą składni linków).
 */
export function naSekcje(md) {
  const linie = md.split("\n");
  const sekcje = [];
  let biezaca = { naglowek: null, linie: [] };
  let wOgrodzeniu = false;
  let ogrodzenie = "";

  for (const linia of linie) {
    const otwarcie = linia.match(/^\s*(`{3,}|~{3,})/);
    if (otwarcie) {
      if (!wOgrodzeniu) {
        wOgrodzeniu = true;
        ogrodzenie = otwarcie[1][0].repeat(3);
      } else if (linia.trimStart().startsWith(ogrodzenie)) {
        wOgrodzeniu = false;
      }
    }

    const naglowek = !wOgrodzeniu && linia.match(/^##\s+(.+?)\s*$/);
    if (naglowek) {
      sekcje.push(biezaca);
      biezaca = { naglowek: naglowek[1], linie: [] };
      continue;
    }
    biezaca.linie.push(linia);
  }
  sekcje.push(biezaca);

  return sekcje
    .map((s) => ({ naglowek: s.naglowek, md: s.linie.join("\n").trim() }))
    .filter((s) => s.naglowek !== null || s.md !== "");
}

/* ————————————————— markdown → HTML (po sekcji) ————————————————— */

/** Znacznik braku zrzutu wchodzi PRZED markdownem — marked zjadłby komentarz. */
function zamienZnaczniki(md) {
  return md.replace(ZNACZNIK_ZRZUTU, (_, podpis) => {
    const czysty = podpis.trim().replace(/\s+/g, " ");
    return `\n<div class="brak-zrzutu"><span class="brak-etykieta">zrzut do zrobienia</span><span class="brak-podpis">${uciekaj(czysty)}</span></div>\n`;
  });
}

/**
 * `<pre><code class="language-bash">` → panel z etykietą języka i miejscem na
 * przycisk kopiowania. Przycisk dokłada skrypt, więc bez JavaScriptu zostaje
 * sam blok kodu — czytelny jak dotąd.
 */
function kodWPanele(html) {
  return html.replace(
    /<pre><code(?:\s+class="language-([^"]*)")?>([\s\S]*?)<\/code><\/pre>/g,
    (_, jezyk, kod) => {
      const etykieta = (jezyk || "tekst").replace(/[^a-z0-9+#-]/gi, "");
      return (
        `<div class="kod" data-jezyk="${uciekaj(etykieta)}">` +
        `<div class="kod-pasek"><span class="kod-jezyk">${uciekaj(etykieta)}</span></div>` +
        `<pre><code>${kod}</code></pre>` +
        `</div>`
      );
    }
  );
}

/** Tabela dostaje własny kontener — to on przewija się w poziomie, nie strona. */
function tabeleWPanele(html) {
  return html.replace(
    /<table>([\s\S]*?)<\/table>/g,
    (_, srodek) => `<div class="tabela"><table>${srodek}</table></div>`
  );
}

/**
 * Obrazy → `<figure>` z podpisem i ZAREZERWOWANYM miejscem.
 *
 * `width`/`height` czytamy z nagłówka pliku (`wymiary.mjs`), żeby przeglądarka
 * znała proporcje przed pobraniem obrazu — inaczej 148 zrzutów przepychałoby
 * tekst przy każdym doładowaniu (CLS, metryka trzymana w projekcie na zerze).
 *
 * BŁĄD, KTÓRY TU MIESZKAŁ (znaleziony 2026-08-24, istniał od powstania
 * narzędzia). Poprzednia wersja dopasowywała wyłącznie `<p><img …></p>`, czyli
 * obraz SAM w akapicie. Tymczasem dwa zrzuty zapisane w markdownie w sąsiednich
 * wierszach, bez pustej linii między nimi, marked skleja w JEDEN akapit —
 * i takie pary wypadały z dopasowania. Zostawały wtedy surowym `<img
 * src="zrzuty/…">`, wskazującym ścieżkę ze ŹRÓDŁA, której w katalogu wyjściowym
 * nie ma. W podglądzie robiło się z tego siedem zepsutych obrazów (moduł 4
 * Kursu 2), a ponieważ plik istniał w repo, nie zapalał się nawet znacznik
 * „brak pliku". Teraz przerabiamy KAŻDY obraz, a akapit złożony z samych
 * obrazów rozbijamy na osobne figury — `<figure>` w środku `<p>` jest
 * niepoprawne i przeglądarka i tak zamknęłaby akapit w innym miejscu.
 */
function obrazyWFigury(html, lekcja, zasoby) {
  /** Jeden `<img>` ze źródła → figura albo widoczny brak. */
  const figura = (znacznik) => {
    const src = znacznik.match(/src="([^"]+)"/)?.[1] ?? "";
    const alt = znacznik.match(/alt="([^"]*)"/)?.[1] ?? "";
    if (/^https?:/.test(src)) return znacznik;

    const zrodlo = join(lekcja.katModulu, src);
    if (!existsSync(zrodlo)) {
      return `<div class="brak-zrzutu"><span class="brak-etykieta">brak pliku</span><span class="brak-podpis">${uciekaj(src)}</span></div>`;
    }

    const nazwa = `${lekcja.kurs}-m${lekcja.modul}-${basename(src)}`;
    zasoby.set(nazwa, zrodlo);
    const wym = wymiaryWebp(zrodlo);
    const rozmiar = wym
      ? ` width="${wym.szerokosc}" height="${wym.wysokosc}"`
      : "";
    return (
      `<figure class="zrzut">` +
      `<img src="../zasoby/${nazwa}" alt="${alt}"${rozmiar} loading="lazy" decoding="async">` +
      (alt ? `<figcaption>${alt}</figcaption>` : "") +
      `</figure>`
    );
  };

  // akapit złożony wyłącznie z obrazów (jednego albo kilku) → same figury
  return html.replace(/<p>((?:\s*<img [^>]*>|\s*<br\s*\/?>)+)\s*<\/p>/g, (_, srodek) =>
    [...srodek.matchAll(/<img [^>]*>/g)].map((m) => figura(m[0])).join("")
  );
}

/* ————————————————— złożenie lekcji ————————————————— */

/**
 * Buduje HTML treści lekcji i przy okazji oddaje spis sekcji do menu
 * „W tej lekcji”. Spis powstaje z TYCH SAMYCH nagłówków, które renderujemy —
 * nie z osobnej listy, którą trzeba by pamiętać o aktualizowaniu.
 *
 * @returns {{html: string, spis: {id: string, tekst: string}[], lead: string}}
 */
export function zlozLekcje({ lekcja, marked, zasoby }) {
  const sekcje = naSekcje(lekcja.tresc);
  const spis = [];
  const czesci = [];
  let lead = "";

  const naHtml = (md) =>
    obrazyWFigury(
      tabeleWPanele(kodWPanele(marked.parse(zamienZnaczniki(md), { async: false }))),
      lekcja,
      zasoby
    );

  /*
   * Tytuł nagłówka przechodzi przez markdown W TRYBIE LINIOWYM, a nie przez
   * samo ucieczkowanie znaków. W prozie jest 21 nagłówków z kodem w
   * odwróconych apostrofach („## 2. Plik `SKILL.md` — dwie części”), a
   * ucieczka zostawiała w widoku surowe apostrofy zamiast złożyć nazwę pliku
   * czcionką o stałej szerokości. `parseInline` składa kod, pogrubienie
   * i kursywę, ale nie robi z tekstu akapitu — czyli dokładnie tyle, ile
   * potrzeba w <h2>.
   */
  const wLinii = (tekst) => marked.parseInline(tekst, { async: false });

  /*
   * Między numerem sekcji a tytułem stoi PRAWDZIWA spacja, a między
   * nagłówkiem a treścią przełamanie wiersza. Wizualnie nie zmienia to nic
   * (numer jest osobnym pudełkiem, akapit osobnym blokiem), ale narzędzia
   * czytające `textContent` — czytniki ekranu, wyszukiwarki w przeglądarce,
   * skrypty porównujące treść ze źródłem — dostawały wcześniej sklejone
   * „01Czym właściwie jest ClaudeClaude to platforma…”.
   */

  for (const sekcja of sekcje) {
    // wstęp przed pierwszym `##` — akapit prowadzący, wyróżniony w hero
    if (sekcja.naglowek === null) {
      lead = naHtml(sekcja.md);
      continue;
    }

    const id = kotwica(sekcja.naglowek);
    const rodzaj = rozpoznaj(sekcja.naglowek);
    const html = naHtml(sekcja.md);

    if (rodzaj) {
      spis.push({ id, tekst: wLinii(sekcja.naglowek) });
      const odznaka = odznakaZNaglowka(sekcja.naglowek);
      // z podpisu bloku zdejmujemy sam nawias z czasem — wraca jako odznaka
      const podpis = odznaka
        ? sekcja.naglowek.replace(/\s*\([^)]+\)\s*$/, "")
        : sekcja.naglowek;
      // „Co dalej” to most do następnej lekcji — własne pudełko, nie blok
      const klasa = rodzaj.typ === "co-dalej" ? "most" : `blok blok-${rodzaj.typ}`;
      czesci.push(
        `<section id="${id}" class="${klasa}">` +
          `<h2 class="blok-naglowek">${ikona(rodzaj.ikona)}<span>${uciekaj(podpis)}</span>` +
          // spacja przed odznaką z tego samego powodu co przy numerze sekcji:
          // bez niej `textContent` sklejał „Zrób to teraz10 minut”
          (odznaka ? ` <span class="blok-odznaka">${uciekaj(odznaka)}</span>` : "") +
          `</h2>\n` +
          html +
          `</section>`
      );
      continue;
    }

    const numerowany = rozbijNumerowany(sekcja.naglowek);
    if (numerowany) {
      spis.push({ id, tekst: wLinii(numerowany.tytul) });
      czesci.push(
        `<h2 id="${id}"><span class="h2-nr">${numerowany.numer}</span> ${wLinii(numerowany.tytul)}</h2>\n` +
          html
      );
      continue;
    }

    spis.push({ id, tekst: wLinii(sekcja.naglowek) });
    czesci.push(`<h2 id="${id}">${wLinii(sekcja.naglowek)}</h2>\n${html}`);
  }

  return { html: czesci.join("\n"), spis, lead };
}

/** Liczba zrzutów gotowych i brakujących — do bilansu na stronie kursu. */
export function policzZrzuty(md) {
  return {
    brakuje: [...md.matchAll(ZNACZNIK_ZRZUTU)].length,
    jest: [...md.matchAll(/!\[[^\]]*\]\(zrzuty\/[^)]+\)/g)].length,
  };
}
