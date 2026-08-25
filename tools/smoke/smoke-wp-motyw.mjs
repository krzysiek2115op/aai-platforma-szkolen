/**
 * Smoke integracji Tutor ↔ motyw Automatic AI — POMIAREM, nie na oko.
 *
 * CZEGO PILNUJE I DLACZEGO AKURAT TEGO.
 *
 * Motyw to Tailwind 4: cały jego CSS siedzi w WARSTWACH kaskady
 * (`@layer theme, base, components, utilities`). Arkusze Tutora są POZA
 * warstwami, a reguła bez warstwy bije każdą regułę w warstwie —
 * niezależnie od specyficzności i od kolejności ładowania. Na stronach
 * Tutora każda jego reguła wygrywa więc z każdą klasą motywu. Skutek jest
 * cichy: strona działa, tylko wygląda jak z innego serwisu, a nagłówek
 * motywu (`position: fixed`, 72 px, bez rezerwacji miejsca) nachodzi na
 * treść, bo szablon Tutora daje 16 px odstępu.
 *
 * Arkusz `assets/tutor-motyw.css` nadpisuje to listą reguł, a lista
 * z natury się starzeje — aktualizacja Tutora może dołożyć nową jasną
 * powierzchnię albo nową kolizję klas. GWARANCJĄ nie jest więc arkusz,
 * tylko ten smoke: mierzy ŻYWĄ stronę i czerwieni się na każdej jasnej
 * plamie, każdym nieczytelnym napisie i każdym nachodzeniu — także takim,
 * o którym dziś nie wiemy.
 *
 * WYMAGA lokalnego środowiska (`wordpress/srodowisko/postaw.sh`) i riga
 * z puppeteer-core — poza CI, tam nie ma ani podmana, ani przeglądarki.
 *
 * Rig (jak przy podglądzie kursów: zależność NIE wchodzi do package.json):
 *   mkdir -p /tmp/rig && cd /tmp/rig && npm init -y && npm i puppeteer-core
 *   export ZRZUTY_RIG=/tmp/rig
 *   node tools/smoke/smoke-wp-motyw.mjs
 */
import { createRequire } from "node:module";

const RIG = process.env.ZRZUTY_RIG;
if (!RIG) {
  console.error(
    "smoke-wp-motyw: ustaw ZRZUTY_RIG na katalog z zainstalowanym `puppeteer-core`.\n" +
      "  mkdir -p /tmp/rig && cd /tmp/rig && npm init -y && npm i puppeteer-core"
  );
  process.exit(1);
}
const wymagaj = createRequire(`${RIG}/`);
const puppeteer = wymagaj("puppeteer-core");

const ADRES = process.env.WP_ADRES ?? "http://127.0.0.1:8892";
const PRZEGLADARKA = process.env.FIREFOX ?? "/usr/bin/firefox";

/**
 * Strony Tutora do zmierzenia i strona motywu jako WZORZEC.
 *
 * DLACZEGO NIE `/courses/*`. Od W3 te adresy oddają 301 na nasze
 * `/szkolenia/*` (decyzja właściciela 2026-08-25: jeden adres kanoniczny,
 * klient nigdy nie ogląda wyglądu Tutora). Mierzymy więc te strony Tutora,
 * które NAPRAWDĘ zobaczy człowiek: panel kursanta i rejestrację. To zresztą
 * dokładnie ten podział, który opisuje ETAP-WP.md — konta i dostęp należą do
 * Tutora, katalog i sprzedaż do nas.
 */
const STRONY_TUTORA = ["/dashboard/", "/student-registration/"];
const STRONA_MOTYWU = "/uslugi/";

/**
 * NASZE strony (W3) — mierzone tym samym silnikiem i z tego samego powodu.
 *
 * Pytanie jest identyczne jak przy Tutorze: czy strona spoza motywu nadal
 * wygląda jak motyw i czy nie chowa się pod nagłówkiem `fixed`. Różni się
 * tylko ZAKRES pomiaru — u Tutora `.tutor-wrap`, u nas nasz `<main>` i pigułka.
 */
const STRONY_NASZE = ["/szkolenia/", "/szkolenia/jak-korzystac-z-claude/"];

/** Co mierzymy na której stronie. */
const ZAKRES_TUTORA = ".tutor-wrap, .tutor-wrap *";
const ZAKRES_NASZ = "main.aai-strona, main.aai-strona *, .aai-pasek, .aai-pasek *";

/** Minimalny kontrast tekstu. Próg WCAG AA dla zwykłego pisma. */
const MIN_KONTRAST = 4.5;
/** Poniżej tego pola nie oceniamy powierzchni — ikonki i kreski. */
const MIN_POLE = 400;

const bledy = [];
let sprawdzen = 0;
const sprawdz = (warunek, opis) => {
  sprawdzen += 1;
  if (!warunek) bledy.push(opis);
};

/**
 * Kod wykonywany w przeglądarce. Zwraca surowe pomiary — ocenia Node,
 * żeby komunikat o błędzie powstawał tam, gdzie widać kontekst.
 */
function pomiar() {
  const przezroczysteZapis = (t) =>
    !t || /rgba?\(0, 0, 0, 0\)|transparent/.test(t) || /\/\s*0\s*\)/.test(t);
  /*
   * ROZBIÓR KOLORU NA SKŁADOWE 0–255 + kanał alfa.
   *
   * Przeglądarka oddaje `color-mix()` jako `color(srgb 0.749 1 0.219 / 0.1)`,
   * czyli SKŁADOWE W ZAKRESIE 0–1. Poprzednia wersja tego pomiaru czytała
   * z każdego zapisu pierwsze trzy liczby i traktowała je jak 0–255 — więc
   * jasny akcent wychodził prawie czarny, a kontrast 15:1 raportowała jako
   * 1,11:1. Objaw: smoke krzyczy na kolor, który na ekranie jest w porządku.
   * A ponieważ i motyw (Tailwind 4), i nasz arkusz stoją na `color-mix`,
   * dotyczyło to niemal każdego półprzezroczystego tła.
   *
   * Zapisu, którego NIE UMIEMY rozebrać (np. `oklch()`), nie zgadujemy —
   * ląduje na liście `nieznane` i wywala smoke. Cicho przepuszczony kolor
   * to pomiar, który nic nie mierzy.
   */
  const nieznane = [];
  const rozbierz = (t) => {
    if (!t || przezroczysteZapis(t)) return null;
    const liczby = (t.match(/[\d.]+/g) ?? []).map(Number);
    if (t.startsWith("color(")) {
      if (!/^color\(\s*srgb\b/.test(t) || liczby.length < 3) return "nieznany";
      return [liczby[0] * 255, liczby[1] * 255, liczby[2] * 255, liczby[3] ?? 1];
    }
    if (/^rgba?\(/.test(t)) {
      if (liczby.length < 3) return "nieznany";
      return [liczby[0], liczby[1], liczby[2], liczby[3] ?? 1];
    }
    return "nieznany";
  };
  const skladowe = (t) => {
    const w = rozbierz(t);
    if ("nieznany" === w) {
      nieznane.push(t);
      return null;
    }
    return w;
  };
  const lum = (t) => {
    const s = skladowe(t);
    if (!s) return 0;
    const [r, g, b] = s.slice(0, 3).map((v) => {
      const x = v / 255;
      return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const kontrast = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return +((x + 0.05) / (y + 0.05)).toFixed(2);
  };
  const przezroczyste = (t) => przezroczysteZapis(t);
  /**
   * Kolor złożony z tłem pod spodem. Bez tego półprzezroczysty akcent
   * (`rgba(191,255,56,.1)` na ciemnym panelu) liczy się jako jasna plama,
   * choć na ekranie jest ciemny — czyli smoke krzyczałby na coś, co jest
   * w porządku, a to najszybszy sposób, żeby przestać go czytać.
   */
  const zloz = (kolor, tlo) => {
    const c = skladowe(kolor);
    if (!c || c[3] >= 0.999) return kolor;
    const t = skladowe(tlo) ?? [0, 0, 0, 1];
    const a = c[3];
    return `rgb(${[0, 1, 2].map((i) => Math.round(c[i] * a + t[i] * (1 - a))).join(", ")})`;
  };
  /**
   * Kolor, który widać POD danym elementem (element włącznie).
   * Do kontrastu tekstu pytamy o `tloZa(el)` — tekst leży na własnym tle
   * elementu; do oceny powierzchni o `tloZa(el.parentElement)`, bo tam
   * interesuje nas, na czym leży ONA sama.
   */
  const tloZa = (el) => {
    for (let e = el; e; e = e.parentElement) {
      const t = getComputedStyle(e).backgroundColor;
      if (!przezroczyste(t)) return zloz(t, tloZa(e.parentElement));
    }
    return getComputedStyle(document.body).backgroundColor;
  };
  const opis = (el) =>
    `${el.tagName.toLowerCase()}.${String(el.className || "").split(" ").filter(Boolean).slice(0, 2).join(".")}`;

  const akcent = getComputedStyle(document.documentElement).getPropertyValue("--color-volt").trim();

  /*
   * Dolna krawędź WSZYSTKIEGO, co wisi u góry na stałe: nagłówka motywu
   * i naszej pigułki kursu. Strona kursu chowa nagłówek motywu i stawia
   * w jego miejsce pigułkę, więc pytanie „czy treść wjeżdża pod belkę"
   * ma tam inną belkę — a pomiar musi zadawać to samo pytanie na obu.
   */
  const belki = [...document.querySelectorAll("header.fixed, .aai-pasek")].filter(
    (e) => getComputedStyle(e).display !== "none"
  );
  const naglowekDol = belki.reduce((n, e) => Math.max(n, e.getBoundingClientRect().bottom), 0);
  /* Zawartość samej belki jest nad treścią Z DEFINICJI — nie jest schowana. */
  const wBelce = (el) => belki.some((b) => b.contains(el));

  const jasne = [];
  const nieczytelne = [];
  const nachodzace = [];

  for (const el of document.querySelectorAll(ZAKRES_JS)) {
    const st = getComputedStyle(el);
    const pr = el.getBoundingClientRect();
    if (pr.width * pr.height < MIN_POLE_JS) continue;

    const tlo = st.backgroundColor;
    if (!przezroczyste(tlo)) {
      // Liczymy to, co WIDAĆ: kolor złożony z tłem pod spodem.
      const widoczne = zloz(tlo, tloZa(el.parentElement));
      // Akcent motywu jest jasny CELOWO — to on, a nie usterka.
      // Oba zapisy bez spacji: `hexNaRgb` oddaje „rgb(191, 255, 56)",
      // a przeglądarka bywa, że „rgb(191,255,56)".
      const bezSpacji = (t) => t.replace(/\s/g, "");
      const akcentowy = akcent && bezSpacji(widoczne) === bezSpacji(hexNaRgb(akcent));
      if (lum(widoczne) > 0.5 && !akcentowy) {
        jasne.push({ el: opis(el), pole: Math.round(pr.width * pr.height), tlo: widoczne });
      }
    }

    if (el.children.length === 0 && el.textContent.trim()) {
      /*
       * TEKST MALOWANY GRADIENTEM (`background-clip: text` + przezroczysty
       * kolor) — nasz nagłówek hero i nagłówki motywu. Jego `color` to
       * `transparent`, więc wzór na kontrast dwóch płaskich kolorów dałby
       * 1:1 i smoke oskarżałby o nieczytelność napis, który Lighthouse
       * ocenia na 100. Nie pomijamy go jednak w milczeniu: bierzemy
       * NAJSŁABSZY przystanek gradientu i to jego mierzymy — czyli
       * najgorszy przypadek, jaki ten napis może pokazać.
       */
      const przycina = /text/.test(st.webkitBackgroundClip || st.backgroundClip || "");
      const kolory = przycina && przezroczyste(st.color)
        ? (st.backgroundImage.match(/#[0-9a-f]{3,8}|rgba?\([^)]*\)|color\([^)]*\)/gi) ?? []).map(
            (c) => (c.startsWith("#") ? hexNaRgb(c) : c)
          )
        : [st.color];

      if (kolory.length > 0) {
        const tlo = tloZa(el);
        const k = Math.min(...kolory.map((c) => kontrast(c, tlo)));
        if (k < MIN_KONTRAST_JS) {
          nieczytelne.push({ el: opis(el), tekst: el.textContent.trim().slice(0, 40), kontrast: k });
        }
      }
    }

    // Nachodzenie: element z tekstem, który zaczyna się NAD dolną
    // krawędzią nagłówka, jest pod nim schowany.
    if (el.textContent.trim() && pr.height > 0 && pr.top < naglowekDol && pr.bottom > 0) {
      if (el.children.length === 0 && !wBelce(el)) {
        nachodzace.push({ el: opis(el), tekst: el.textContent.trim().slice(0, 40), gora: Math.round(pr.top) });
      }
    }
  }

  // Podpis stopki MOTYWU — do porównania ze stroną motywu (kolizje klas).
  const stopka = [...document.querySelectorAll("footer *")]
    .filter((e) => e.textContent.trim() && !e.closest(".tutor-wrap") && !e.closest(".aai-strona"))
    .slice(0, 40)
    .map((e) => {
      const st = getComputedStyle(e);
      const pr = e.getBoundingClientRect();
      /*
       * Podpis CELOWO bez szerokości i bez nazw klas:
       *  * szerokość zależy od paska przewijania (1440 kontra 1428 na
       *    stronie o innej wysokości) — to nie jest różnica renderu,
       *  * klasy stanu dokłada JavaScript motywu w chwili wejścia
       *    elementu na ekran (`reveal` → `reveal-in`), więc zależą od
       *    tego, kiedy zrobiono pomiar.
       * Kolizja klas objawia się tłem, wysokością i sposobem układania —
       * i to porównujemy. Nazwa klasy jedzie osobno, do komunikatu.
       */
      /*
       * Wysokość zaokrąglona do 4 px. Ta sama stopka na stronie o innej
       * długości bywa wyższa o piksel–dwa (zaokrąglenia układu, moment
       * wczytania fontu) i to NIE jest kolizja klas. Kolizja objawia się
       * tłem, sposobem układania i marginesem wewnętrznym — a te
       * porównujemy co do znaku.
       */
      return {
        podpis: [e.tagName.toLowerCase(), Math.round(pr.height / 4), st.backgroundColor, st.display, st.padding].join("|"),
        etykieta: `${e.tagName.toLowerCase()}.${String(e.className || "").split(" ")[0]}`,
      };
    });

  return {
    nieznane: [...new Set(nieznane)].slice(0, 6),
    klasaBody: document.body.className.includes("aai-tutor-na-motywie"),
    naszArkusz: [...document.styleSheets].some((s) => (s.href ?? "").includes("tutor-motyw.css")),
    naszArkuszSklepu: [...document.styleSheets].some((s) => (s.href ?? "").includes("aai-sklep/assets/sklep.css")),
    cudzeArkusze: [...document.querySelectorAll("link[rel=stylesheet][id]")]
      .map((l) => l.id)
      .filter((id) => /^(tutor|wc-|woocommerce)/.test(id)),
    naglowekDol: Math.round(naglowekDol),
    jasne: jasne.sort((a, b) => b.pole - a.pole).slice(0, 6),
    nieczytelne: nieczytelne.slice(0, 6),
    nachodzace: nachodzace.slice(0, 6),
    stopka,
  };
}

/** `#bfff38` → `rgb(191,255,56)` — porównujemy zapisy komputerowe. */
function hexNaRgbZrodlo() {
  // `#abc`, `#aabbcc` i `#aabbccdd` — ósemkę ucinamy do sześciu, bo kanał
  // alfa w tekście gradientu i tak składamy osobno.
  return `function hexNaRgb(h){h=h.replace('#','');if(h.length===3||h.length===4)h=h.slice(0,3).split('').map(c=>c+c).join('');h=h.slice(0,6);const n=parseInt(h,16);return 'rgb('+[(n>>16)&255,(n>>8)&255,n&255].join(', ')+')';}`;
}

const przegladarka = await puppeteer.launch({
  browser: "firefox",
  executablePath: PRZEGLADARKA,
  protocol: "webDriverBiDi",
  headless: true,
});

async function zmierz(sciezka, zakres = ZAKRES_TUTORA) {
  const karta = await przegladarka.newPage();
  await karta.setViewport({ width: 1440, height: 1400 });
  await karta.goto(ADRES + sciezka, { waitUntil: "load", timeout: 60000 });
  const wynik = await karta.evaluate(
    `(() => { ${hexNaRgbZrodlo()} const MIN_POLE_JS=${MIN_POLE}, MIN_KONTRAST_JS=${MIN_KONTRAST},` +
      ` ZAKRES_JS=${JSON.stringify(zakres)}; return (${pomiar.toString()})(); })()`
  );
  await karta.close();
  return wynik;
}

console.log(`smoke-wp-motyw: ${ADRES}`);

const wzorzec = await zmierz(STRONA_MOTYWU);
sprawdz(!wzorzec.klasaBody, `${STRONA_MOTYWU}: strona MOTYWU dostała klasę Tutora — arkusz wycieka poza swoje strony`);
sprawdz(!wzorzec.naszArkusz, `${STRONA_MOTYWU}: strona MOTYWU ładuje nasz arkusz Tutora — niepotrzebny bajt na każdej odsłonie`);

for (const sciezka of STRONY_TUTORA) {
  const m = await zmierz(sciezka);

  sprawdz(
    m.nieznane.length === 0,
    `${sciezka}: pomiar nie umie rozebrać zapisu koloru (${m.nieznane.join(", ")}) — wynik byłby zgadywaniem`
  );

  sprawdz(m.klasaBody, `${sciezka}: brak klasy „aai-tutor-na-motywie” na body — arkusz nie ma się czego złapać`);
  sprawdz(m.naszArkusz, `${sciezka}: nasz arkusz integracji nie wszedł na stronę Tutora`);

  sprawdz(
    m.nachodzace.length === 0,
    `${sciezka}: ${m.nachodzace.length} elementów wjeżdża pod nagłówek motywu (dół nagłówka ${m.naglowekDol} px): ` +
      m.nachodzace.map((x) => `${x.el} „${x.tekst}" @${x.gora}px`).join("; ")
  );

  sprawdz(
    m.jasne.length === 0,
    `${sciezka}: ${m.jasne.length} jasnych powierzchni w markupie Tutora (akcent motywu nie liczy się): ` +
      m.jasne.map((x) => `${x.el} ${x.pole} px² ${x.tlo}`).join("; ")
  );

  sprawdz(
    m.nieczytelne.length === 0,
    `${sciezka}: ${m.nieczytelne.length} napisów o kontraście < ${MIN_KONTRAST}:1: ` +
      m.nieczytelne.map((x) => `„${x.tekst}" ${x.kontrast}:1`).join("; ")
  );

  // KOLIZJE KLAS: stopka motywu na stronie Tutora musi wyglądać
  // DOKŁADNIE tak samo jak na stronie motywu. To ten pomiar łapie
  // rzeczy pokroju `.text-label`, gdzie reguła Tutora bez warstwy bije
  // klasę motywu w warstwie — i nikt tego nie zauważa, bo nic nie pada.
  const rozne = m.stopka
    .map((w, i) => ({ etykieta: w.etykieta, tutor: w.podpis, motyw: wzorzec.stopka[i]?.podpis }))
    .filter((x) => x.motyw !== undefined && x.motyw !== x.tutor);
  sprawdz(
    rozne.length === 0,
    `${sciezka}: stopka MOTYWU renderuje się inaczej niż na stronie motywu (${rozne.length} z ${m.stopka.length} elementów) — kolizja klas z CSS-em Tutora: ` +
      rozne.slice(0, 3).map((x) => `\n      ${x.etykieta}\n        tutor: ${x.tutor}\n        motyw: ${x.motyw}`).join("")
  );

  console.log(`  ${sciezka}: nagłówek do ${m.naglowekDol} px, 0 nachodzeń, 0 jasnych plam, 0 napisów < ${MIN_KONTRAST}:1`);
}

/*
 * NASZE STRONY (W3). Ten sam silnik, ten sam próg, inne pytania dodatkowe:
 * nasz arkusz ma wejść, cudze (Tutora, Woo) mają NIE wejść, a stopka motywu
 * ma renderować się identycznie jak na jego własnej stronie — to ostatnie
 * łapie sytuację odwrotną do kolizji Tutora: gdyby NASZ arkusz, który stoi
 * poza warstwami kaskady, przemalował coś w cudzym markupie.
 */
for (const sciezka of STRONY_NASZE) {
  const m = await zmierz(sciezka, ZAKRES_NASZ);

  sprawdz(
    m.nieznane.length === 0,
    `${sciezka}: pomiar nie umie rozebrać zapisu koloru (${m.nieznane.join(", ")}) — wynik byłby zgadywaniem`
  );

  sprawdz(m.naszArkuszSklepu, `${sciezka}: nasz arkusz sklepu nie wszedł na stronę`);
  sprawdz(
    m.cudzeArkusze.length === 0,
    `${sciezka}: na naszej stronie ładują się cudze arkusze (${m.cudzeArkusze.join(", ")}) — wraca kolizja klas z 0.38.0`
  );

  sprawdz(
    m.naglowekDol > 0,
    `${sciezka}: nie widać żadnej belki przypiętej do góry — albo nagłówek motywu zniknął, albo pigułka kursu nie weszła`
  );

  sprawdz(
    m.nachodzace.length === 0,
    `${sciezka}: ${m.nachodzace.length} elementów wjeżdża pod belkę u góry (dół belki ${m.naglowekDol} px): ` +
      m.nachodzace.map((x) => `${x.el} „${x.tekst}" @${x.gora}px`).join("; ")
  );

  sprawdz(
    m.jasne.length === 0,
    `${sciezka}: ${m.jasne.length} jasnych powierzchni poza akcentem marki: ` +
      m.jasne.map((x) => `${x.el} ${x.pole} px² ${x.tlo}`).join("; ")
  );

  sprawdz(
    m.nieczytelne.length === 0,
    `${sciezka}: ${m.nieczytelne.length} napisów o kontraście < ${MIN_KONTRAST}:1: ` +
      m.nieczytelne.map((x) => `„${x.tekst}" ${x.kontrast}:1`).join("; ")
  );

  const rozne = m.stopka
    .map((w, i) => ({ etykieta: w.etykieta, nasza: w.podpis, motyw: wzorzec.stopka[i]?.podpis }))
    .filter((x) => x.motyw !== undefined && x.motyw !== x.nasza);
  sprawdz(
    rozne.length === 0,
    `${sciezka}: stopka MOTYWU renderuje się inaczej niż na stronie motywu (${rozne.length} z ${m.stopka.length}) — nasz arkusz wycieka poza własny markup: ` +
      rozne.slice(0, 3).map((x) => `\n      ${x.etykieta}\n        nasza: ${x.nasza}\n        motyw: ${x.motyw}`).join("")
  );

  console.log(`  ${sciezka}: belka do ${m.naglowekDol} px, 0 nachodzeń, 0 jasnych plam, 0 napisów < ${MIN_KONTRAST}:1`);
}

await przegladarka.close();

if (bledy.length > 0) {
  console.error(`\nsmoke-wp-motyw: ${bledy.length} z ${sprawdzen} sprawdzeń padło:`);
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}
console.log(`smoke-wp-motyw: ${sprawdzen} sprawdzeń zaliczonych.`);
