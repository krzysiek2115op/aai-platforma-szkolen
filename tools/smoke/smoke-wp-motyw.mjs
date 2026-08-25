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

/** Strona Tutora do zmierzenia i strona motywu jako WZORZEC. */
const STRONY_TUTORA = ["/courses/jak-uzywac-githuba/", "/courses/"];
const STRONA_MOTYWU = "/uslugi/";

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
  const lum = (t) => {
    const s = (t.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
    if (s.length < 3) return 0;
    const [r, g, b] = s.map((v) => {
      const x = v / 255;
      return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const kontrast = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return +((x + 0.05) / (y + 0.05)).toFixed(2);
  };
  const przezroczyste = (t) => !t || /rgba?\(0, 0, 0, 0\)|transparent/.test(t);
  /**
   * Kolor złożony z tłem pod spodem. Bez tego półprzezroczysty akcent
   * (`rgba(191,255,56,.1)` na ciemnym panelu) liczy się jako jasna plama,
   * choć na ekranie jest ciemny — czyli smoke krzyczałby na coś, co jest
   * w porządku, a to najszybszy sposób, żeby przestać go czytać.
   */
  const zloz = (kolor, tlo) => {
    const c = (kolor.match(/[\d.]+/g) ?? []).map(Number);
    if (c.length < 4 || c[3] >= 0.999) return kolor;
    const t = (tlo.match(/[\d.]+/g) ?? [0, 0, 0]).map(Number);
    const a = c[3];
    return `rgb(${[0, 1, 2].map((i) => Math.round(c[i] * a + (t[i] ?? 0) * (1 - a))).join(", ")})`;
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
  const naglowek = document.querySelector("header.fixed");
  const naglowekDol = naglowek ? naglowek.getBoundingClientRect().bottom : 0;

  const jasne = [];
  const nieczytelne = [];
  const nachodzace = [];

  for (const el of document.querySelectorAll(".tutor-wrap, .tutor-wrap *")) {
    const st = getComputedStyle(el);
    const pr = el.getBoundingClientRect();
    if (pr.width * pr.height < MIN_POLE_JS) continue;

    const tlo = st.backgroundColor;
    if (!przezroczyste(tlo)) {
      // Liczymy to, co WIDAĆ: kolor złożony z tłem pod spodem.
      const widoczne = zloz(tlo, tloZa(el.parentElement));
      // Akcent motywu jest jasny CELOWO — to on, a nie usterka.
      const akcentowy = akcent && widoczne.replace(/\s/g, "") === hexNaRgb(akcent);
      if (lum(widoczne) > 0.5 && !akcentowy) {
        jasne.push({ el: opis(el), pole: Math.round(pr.width * pr.height), tlo: widoczne });
      }
    }

    if (el.children.length === 0 && el.textContent.trim()) {
      const k = kontrast(st.color, tloZa(el));
      if (k < MIN_KONTRAST_JS) {
        nieczytelne.push({ el: opis(el), tekst: el.textContent.trim().slice(0, 40), kontrast: k });
      }
    }

    // Nachodzenie: element z tekstem, który zaczyna się NAD dolną
    // krawędzią nagłówka, jest pod nim schowany.
    if (el.textContent.trim() && pr.height > 0 && pr.top < naglowekDol && pr.bottom > 0) {
      if (el.children.length === 0) {
        nachodzace.push({ el: opis(el), tekst: el.textContent.trim().slice(0, 40), gora: Math.round(pr.top) });
      }
    }
  }

  // Podpis stopki MOTYWU — do porównania ze stroną motywu (kolizje klas).
  const stopka = [...document.querySelectorAll("footer *")]
    .filter((e) => e.textContent.trim() && !e.closest(".tutor-wrap"))
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
      return {
        podpis: [e.tagName.toLowerCase(), Math.round(pr.height), st.backgroundColor, st.display, st.padding].join("|"),
        etykieta: `${e.tagName.toLowerCase()}.${String(e.className || "").split(" ")[0]}`,
      };
    });

  return {
    klasaBody: document.body.className.includes("aai-tutor-na-motywie"),
    naszArkusz: [...document.styleSheets].some((s) => (s.href ?? "").includes("tutor-motyw.css")),
    naglowekDol: Math.round(naglowekDol),
    jasne: jasne.sort((a, b) => b.pole - a.pole).slice(0, 6),
    nieczytelne: nieczytelne.slice(0, 6),
    nachodzace: nachodzace.slice(0, 6),
    stopka,
  };
}

/** `#bfff38` → `rgb(191,255,56)` — porównujemy zapisy komputerowe. */
function hexNaRgbZrodlo() {
  return `function hexNaRgb(h){h=h.replace('#','');const n=parseInt(h.length===3?h.split('').map(c=>c+c).join(''):h,16);return 'rgb('+[(n>>16)&255,(n>>8)&255,n&255].join(',')+')';}`;
}

const przegladarka = await puppeteer.launch({
  browser: "firefox",
  executablePath: PRZEGLADARKA,
  protocol: "webDriverBiDi",
  headless: true,
});

async function zmierz(sciezka) {
  const karta = await przegladarka.newPage();
  await karta.setViewport({ width: 1440, height: 1400 });
  await karta.goto(ADRES + sciezka, { waitUntil: "load", timeout: 60000 });
  const wynik = await karta.evaluate(
    `(() => { ${hexNaRgbZrodlo()} const MIN_POLE_JS=${MIN_POLE}, MIN_KONTRAST_JS=${MIN_KONTRAST}; return (${pomiar.toString()})(); })()`
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

await przegladarka.close();

if (bledy.length > 0) {
  console.error(`\nsmoke-wp-motyw: ${bledy.length} z ${sprawdzen} sprawdzeń padło:`);
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}
console.log(`smoke-wp-motyw: ${sprawdzen} sprawdzeń zaliczonych.`);
