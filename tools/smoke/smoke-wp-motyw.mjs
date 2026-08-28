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
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

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
/*
 * DLACZEGO NIE MA TU `/dashboard/`. Od W6 panel kursanta przekierowuje na
 * NASZE „Moje kursy" (decyzja właściciela: klient nie ogląda interfejsu
 * Tutora), więc pod tym adresem nie ma już czego mierzyć jako strony Tutora.
 * Samo przekierowanie pilnuje `smoke-wp-front`. Zostają dwie strony, które
 * naprawdę rysuje Tutor i które człowiek może zobaczyć: odzyskiwanie hasła
 * i rejestracja.
 */
const STRONY_TUTORA = ["/dashboard/retrieve-password/", "/student-registration/"];
const STRONA_MOTYWU = "/uslugi/";

/**
 * NASZE strony (W3) — mierzone tym samym silnikiem i z tego samego powodu.
 *
 * Pytanie jest identyczne jak przy Tutorze: czy strona spoza motywu nadal
 * wygląda jak motyw i czy nie chowa się pod nagłówkiem `fixed`. Różni się
 * tylko ZAKRES pomiaru — u Tutora `.tutor-wrap`, u nas nasz `<main>` i pigułka.
 */
const STRONY_NASZE = ["/szkolenia/", "/szkolenia/jak-korzystac-z-claude/"];

/**
 * Co mierzymy na której stronie.
 *
 * ZAKRES TUTORA celuje w JEGO MARKUP, a nie w jeden wybrany kontener.
 * Pierwotne `.tutor-wrap` było ślepe: panel kursanta ma ten kontener, ale
 * `/student-registration/` na tej instalacji renderuje ekran „Access Denied”
 * w `.tutor-disabled-wrapper` — więc pomiar tej strony przechodził po
 * PUSTCE i meldował zero usterek, bo nie oglądał ani jednego elementu.
 * Złapała to dopiero asercja `zmierzonych > 0` dołożona przy piątej stronie.
 *
 * `body` odpada świadomie: ma klasę `tutor-lms`, więc bez `:not(body)`
 * zakres połknąłby całą stronę razem z markupem motywu i pytanie
 * „czy CSS Tutora psuje motyw” zamieniłoby się w pytanie o motyw sam ze sobą.
 */
const ZAKRES_TUTORA = "[class*='tutor-']:not(body), [class*='tutor-']:not(body) *";
const ZAKRES_NASZ = "main.aai-strona, main.aai-strona *, .aai-pasek, .aai-pasek *";

/**
 * WIDOK LEKCJI (W5) — piąta strona i jedyna ZZA LOGOWANIA.
 *
 * Adresu nie wpisujemy na sztywno: pytamy instalację o lekcję z NAJWIĘKSZĄ
 * liczbą zrzutów (remis rozstrzyga długość prozy). To nie jest kaprys —
 * zrzuty interfejsów są jasne CELOWO (decyzja właściciela 2026-08-24: nie
 * przyciemniamy ich, bo klient zobaczy u siebie dokładnie takie), więc
 * lekcja z największą ich liczbą najmocniej obciąża akurat te pytania,
 * które ten smoke zadaje: o jasne powierzchnie i o kontrast napisów.
 */
const ZAKRES_LEKCJI = "main.aai-lekcja, main.aai-lekcja *, .aai-pasek, .aai-pasek *";

/**
 * STRONA KONTA WOOCOMMERCE — szósta strona, dołożona po zgłoszeniu
 * właściciela w teście ręcznym W6.
 *
 * Do 0.45.0 ten smoke mierzył pięć stron i ANI JEDNA nie była stroną Woo,
 * więc `/my-account/` renderowało się bez odstępu pod nagłówek i bez
 * kontenera — ciemny tekst na ciemnym tle, menu konta przyklejone do lewej
 * krawędzi okna, wszystko pod nagłówkiem. Dokładnie ta klasa błędu, którą
 * ten smoke miał pilnować od 0.40.0, tylko u innej cudzej wtyczki.
 */
const SCIEZKA_MOJE = "/szkolenia/moje/";
const SCIEZKA_KONTA = "/my-account/";
const ZAKRES_KONTA = ".woocommerce, .woocommerce *";

/**
 * KOSZYK I KASA (P3a) — strony blokowe WooCommerce pod polskimi slugami.
 * Zakres celuje w bloki, nie w slug: gdy blok się nie wyrenderuje, pomiar
 * ma paść na „zakres nie trafił", a nie mierzyć nagłówek i stopkę.
 */
const ZAKRES_KOSZYKA = ".wp-block-woocommerce-cart, .wp-block-woocommerce-cart *";
const ZAKRES_KASY = ".wp-block-woocommerce-checkout, .wp-block-woocommerce-checkout *";
/** Flaga otwarcia sprzedaży Pluginu 2 (P3a: domyślnie zamknięta do P4). */
const OPCJA_SPRZEDAZY = "aai_platnosci_sprzedaz_otwarta";

const STACK = process.env.STACK_NAZWA ?? "aai_wp";
const KONTENER = `${STACK}_cli`;
const LOGIN = "admin";

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

  const wZakresie = [...document.querySelectorAll(ZAKRES_JS)];
  for (const el of wZakresie) {
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
    /*
     * Ile elementów w ogóle wpadło w zakres. Bez tej liczby literówka
     * w selektorze daje smoke, który przechodzi po PUSTCE i melduje same
     * zera — dokładnie ta klasa ślepoty, która przy 0.24.0 przepuściła
     * cztery miniatury OG oddające 404.
     */
    zmierzonych: wZakresie.length,
    /*
     * Samokontrola pomiaru: czy pasek narzędzi WordPressa (i jego
     * `html { margin-top }`) na pewno NIE wpływa już na układ.
     */
    pasekAdmina:
      Boolean(
        document.getElementById("wpadminbar") &&
          getComputedStyle(document.getElementById("wpadminbar")).display !== "none"
      ) || getComputedStyle(document.documentElement).marginTop !== "0px",
    klasaBody: document.body.className.includes("aai-tutor-na-motywie"),
    naszArkusz: [...document.styleSheets].some((s) => (s.href ?? "").includes("tutor-motyw.css")),
    naszArkuszSklepu: [...document.styleSheets].some((s) => (s.href ?? "").includes("aai-sklep/assets/sklep.css")),
    naszArkuszWoo: [...document.styleSheets].some((s) => (s.href ?? "").includes("woo-motyw.css")),
    // Pierwsza pozycja menu konta — to nią klient wraca do kupionego kursu.
    pozycjeKonta: [...document.querySelectorAll(".woocommerce-MyAccount-navigation a")].map((a) =>
      a.getAttribute("href")
    ),
    klasaBodyWoo: document.body.className.includes("aai-woo-na-motywie"),
    cudzeArkusze: [...document.querySelectorAll("link[rel=stylesheet][id]")]
      .map((l) => l.id)
      .filter((id) => /^(tutor|wc-|woocommerce)/.test(id)),
    naglowekDol: Math.round(naglowekDol),
    /*
     * Adres PO wczytaniu — kasa z pustym koszykiem przekierowuje na
     * koszyk (zmierzone przy P3a), więc bez tej wartości pomiar kasy
     * opisywałby CUDZĄ stronę i przechodził. Klasa 5 z walidacji P2:
     * test przechodzący z cudzego powodu.
     */
    adres: location.pathname,
    // Czy koszyk ma WIERSZ POZYCJI — pusty stan też ma elementy w zakresie,
    // więc samo `zmierzonych > 0` nie odróżnia „zmierzyliśmy koszyk
    // z produktem" od „zmierzyliśmy pustą wydmuszkę".
    maPozycjeKoszyka: Boolean(document.querySelector(".wc-block-cart-items__row")),
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

/*
 * PASEK NARZĘDZI WORDPRESSA — dlaczego go zdejmujemy przy widoku lekcji.
 *
 * Lekcja jest za logowaniem, więc żeby ją zmierzyć, trzeba się zalogować.
 * Zalogowany administrator dostaje jednak pasek narzędzi (32 px,
 * `position: fixed`) i `html { margin-top: 32px }`, czego KLIENT po zakupie
 * nie widzi. Pomiar z paskiem opisywałby układ, którego nikt nigdy nie
 * ogląda: pigułka lekcji chowa się pod paskiem, a treść zjeżdża o 32 px.
 *
 * Zdejmujemy go tak, jak sam WordPress robi to użytkownikowi z odznaczonym
 * „Pokaż pasek narzędzi”. I to jest ZMIERZONE, nie założone: przy realnie
 * wyłączonym pasku w profilu (`show_admin_bar_front=false`) strona ma CO DO
 * PIKSELA ten sam układ, co przy tych dwóch regułach — pigułka 0–68 px,
 * `<main>` 0–6990, hero 144–539, dokument 7642 px. Regułę wybieramy zamiast
 * grzebania w profilu, bo smoke przerwany w połowie nie ma prawa zostawić
 * po sobie zmiany w instalacji.
 */
const BEZ_PASKA_ADMINA = () => {
  const styl = document.createElement("style");
  styl.textContent = "#wpadminbar{display:none!important}html{margin-top:0!important}";
  const dopisz = () => document.documentElement.appendChild(styl);
  if (document.documentElement) dopisz();
  else addEventListener("DOMContentLoaded", dopisz);
};

/**
 * Pomiar PO USTANIU RUCHU.
 *
 * Pigułka kursu i lekcji wjeżdża animacją (`aai-pasek-wjazd`, 0,5 s), więc
 * odczyt zaraz po `load` łapie ją w losowej klatce — dwa przebiegi tej samej
 * strony dały dolną krawędź 61 px i 59 px. Różnica mała, ale to właśnie ona
 * rozstrzyga pytanie „czy napis wjeżdża pod belkę”.
 *
 * Filtr jest KONIECZNY: samo `getAnimations()` nigdy się nie kończy — bloby
 * w tle dryfują w animacji nieskończonej i pomiar wisi do timeoutu protokołu
 * (sprawdzone: tak właśnie padł pierwszy podejście do tej poprawki).
 */
async function ustoj(karta) {
  await karta.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect && a.effect.getTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => {}))
    )
  );
}

async function zmierz(sciezka, zakres = ZAKRES_TUTORA, { bezPaskaAdmina = false, ciastka = [], czekajNa = null, kontekst = null } = {}) {
  const karta = await (kontekst ?? przegladarka).newPage();
  await karta.setViewport({ width: 1440, height: 1400 });
  if (bezPaskaAdmina) await karta.evaluateOnNewDocument(BEZ_PASKA_ADMINA);
  // Sesja z zewnątrz (koszyk Woo napełniony przez Store API w Node) —
  // przeglądarka ma zobaczyć TEN SAM koszyk, więc dostaje jego ciastka.
  if (ciastka.length > 0) await karta.setCookie(...ciastka);
  await karta.goto(ADRES + sciezka, { waitUntil: "load", timeout: 60000 });
  // Bloki koszyka i kasy to React montowany PO `load` — bez czekania na
  // selektor pomiar łapie pustą wydmuszkę bloku zamiast treści.
  if (czekajNa) await karta.waitForSelector(czekajNa, { timeout: 20000 });
  await ustoj(karta);
  const wynik = await karta.evaluate(
    `(() => { ${hexNaRgbZrodlo()} const MIN_POLE_JS=${MIN_POLE}, MIN_KONTRAST_JS=${MIN_KONTRAST},` +
      ` ZAKRES_JS=${JSON.stringify(zakres)}; return (${pomiar.toString()})(); })()`
  );
  await karta.close();
  return wynik;
}

/**
 * Adres lekcji do zmierzenia — PYTAMY INSTALACJĘ, nie wpisujemy sluga.
 *
 * Slug lekcji jest wynikiem treści, a treść bywa poprawiana; wpisany na
 * sztywno zamieniłby ten smoke w test adresu zamiast testu wyglądu, a po
 * pierwszej korekcie tytułu mierzyłby stronę 404 we własnym wyglądzie —
 * i przechodziłby, bo 404 też jest nasze i też jest ciemne.
 */
function wpEval(php) {
  return execFileSync("podman", ["exec", KONTENER, "wp", "--path=/var/www/html", "eval", php], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function adresLekcji() {
  const php = [
    '$p = get_posts(array("post_type"=>"lesson","numberposts"=>-1,"post_status"=>"any"));',
    "$w = array();",
    'foreach ($p as $x) { $w[] = array("i"=>substr_count($x->post_content,"!["),"d"=>strlen($x->post_content),"a"=>get_permalink($x)); }',
    'usort($w, fn($a,$b)=>($b["i"]<=>$a["i"]) ?: ($b["d"]<=>$a["d"]));',
    'echo $w ? $w[0]["a"] : "";',
  ].join("");
  const wyjscie = execFileSync("podman", ["exec", KONTENER, "wp", "--path=/var/www/html", "eval", php], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  if (!wyjscie.startsWith("http")) {
    console.error(
      `smoke-wp-motyw: instalacja nie oddała adresu lekcji („${wyjscie}") — czy dane są wgrane?\n` +
        "  npm run wp:import && npm run wp:sync && npm run wp:zrzuty"
    );
    process.exit(1);
  }
  return new URL(wyjscie).pathname;
}

/** Logowanie PRZEZ FORMULARZ — ciastko WordPressa jest podpisane, nie da się go złożyć z zewnątrz. */
async function zaloguj() {
  const haslo = Object.fromEntries(
    readFileSync("wordpress/srodowisko/.env", "utf8")
      .split("\n")
      .filter(Boolean)
      .map((linia) => linia.split("=").map((kawalek) => kawalek.trim()))
  ).WP_ADMIN_HASLO;

  const karta = await przegladarka.newPage();
  await karta.goto(`${ADRES}/wp-login.php`, { waitUntil: "load", timeout: 60000 });
  await karta.type("#user_login", LOGIN);
  await karta.type("#user_pass", haslo);
  await Promise.all([
    karta.waitForNavigation({ waitUntil: "load", timeout: 60000 }),
    karta.click("#wp-submit"),
  ]);
  const udane = karta.url().includes("/wp-admin");
  await karta.close();
  return udane;
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

  sprawdz(
    m.zmierzonych > 0,
    `${sciezka}: zakres pomiaru nie trafił w ANI JEDEN element — wynik „zero usterek" opisywałby pustkę, nie stronę`
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

  console.log(
    `  ${sciezka}: nagłówek do ${m.naglowekDol} px, ${m.zmierzonych} elementów, ` +
      `${m.nachodzace.length} nachodzeń, ${m.jasne.length} jasnych plam, ${m.nieczytelne.length} napisów < ${MIN_KONTRAST}:1`
  );
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

  sprawdz(
    m.zmierzonych > 0,
    `${sciezka}: zakres pomiaru nie trafił w ANI JEDEN element — wynik „zero usterek" opisywałby pustkę, nie stronę`
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

  console.log(
    `  ${sciezka}: belka do ${m.naglowekDol} px, ${m.zmierzonych} elementów, ` +
      `${m.nachodzace.length} nachodzeń, ${m.jasne.length} jasnych plam, ${m.nieczytelne.length} napisów < ${MIN_KONTRAST}:1`
  );
}

/*
 * PIĄTA STRONA: WIDOK LEKCJI (W5) — mierzony NA KOŃCU, i to jest część
 * pomiaru, a nie porządek alfabetyczny. Jako jedyny wymaga zalogowania,
 * a od chwili logowania każda kolejna odsłona w tej przeglądarce niosłaby
 * pasek narzędzi WordPressa — cztery wcześniejsze strony mierzymy więc
 * dokładnie tak, jak ogląda je gość.
 *
 * Pytania są te same co przy stronach z W3 (nasz arkusz wchodzi, cudze nie,
 * nic nie chowa się pod belką, zero jasnych plam, kontrast, stopka motywu
 * bez zmian) i to jest sedno: widok lekcji NIE JEST stroną Tutora tylko
 * dlatego, że mieszka pod jego adresem.
 */
const SCIEZKA_LEKCJI = adresLekcji();
sprawdz(await zaloguj(), "nie udało się zalogować — widoku lekcji nie da się zmierzyć bez dostępu");

{
  const m = await zmierz(SCIEZKA_LEKCJI, ZAKRES_LEKCJI, { bezPaskaAdmina: true });

  sprawdz(
    m.nieznane.length === 0,
    `${SCIEZKA_LEKCJI}: pomiar nie umie rozebrać zapisu koloru (${m.nieznane.join(", ")}) — wynik byłby zgadywaniem`
  );

  sprawdz(
    m.zmierzonych > 0,
    `${SCIEZKA_LEKCJI}: zakres pomiaru nie trafił w ANI JEDEN element — albo lekcja poszła w cudzym szablonie, albo dostęp nie przeszedł i mierzymy stronę odmowy`
  );

  sprawdz(
    !m.pasekAdmina,
    `${SCIEZKA_LEKCJI}: pasek narzędzi WordPressa dalej wpływa na układ — pomiar opisywałby stronę, której klient nigdy nie widzi`
  );

  sprawdz(m.naszArkuszSklepu, `${SCIEZKA_LEKCJI}: nasz arkusz sklepu nie wszedł na stronę lekcji`);
  sprawdz(
    m.cudzeArkusze.length === 0,
    `${SCIEZKA_LEKCJI}: na widoku lekcji ładują się cudze arkusze (${m.cudzeArkusze.join(", ")}) — wraca kolizja klas z 0.38.0, a lekcja siedzi pod adresem Tutora, więc jest na nią najbardziej narażona`
  );

  sprawdz(
    m.naglowekDol > 0,
    `${SCIEZKA_LEKCJI}: nie widać żadnej belki przypiętej do góry — pigułka lekcji nie weszła`
  );

  sprawdz(
    m.nachodzace.length === 0,
    `${SCIEZKA_LEKCJI}: ${m.nachodzace.length} elementów wjeżdża pod belkę u góry (dół belki ${m.naglowekDol} px): ` +
      m.nachodzace.map((x) => `${x.el} „${x.tekst}" @${x.gora}px`).join("; ")
  );

  sprawdz(
    m.jasne.length === 0,
    `${SCIEZKA_LEKCJI}: ${m.jasne.length} jasnych powierzchni poza akcentem marki: ` +
      m.jasne.map((x) => `${x.el} ${x.pole} px² ${x.tlo}`).join("; ")
  );

  sprawdz(
    m.nieczytelne.length === 0,
    `${SCIEZKA_LEKCJI}: ${m.nieczytelne.length} napisów o kontraście < ${MIN_KONTRAST}:1: ` +
      m.nieczytelne.map((x) => `„${x.tekst}" ${x.kontrast}:1`).join("; ")
  );

  const rozne = m.stopka
    .map((w, i) => ({ etykieta: w.etykieta, nasza: w.podpis, motyw: wzorzec.stopka[i]?.podpis }))
    .filter((x) => x.motyw !== undefined && x.motyw !== x.nasza);
  sprawdz(
    rozne.length === 0,
    `${SCIEZKA_LEKCJI}: stopka MOTYWU renderuje się inaczej niż na stronie motywu (${rozne.length} z ${m.stopka.length}) — nasz arkusz lekcji wycieka poza własny markup: ` +
      rozne.slice(0, 3).map((x) => `\n      ${x.etykieta}\n        nasza: ${x.nasza}\n        motyw: ${x.motyw}`).join("")
  );

  console.log(
    `  ${SCIEZKA_LEKCJI}: belka do ${m.naglowekDol} px, ${m.zmierzonych} elementów, ` +
      `${m.nachodzace.length} nachodzeń, ${m.jasne.length} jasnych plam, ${m.nieczytelne.length} napisów < ${MIN_KONTRAST}:1`
  );
}

/*
 * SZÓSTA STRONA: KONTO WOOCOMMERCE. Też zza logowania, więc stoi tu, a nie
 * wyżej. Pytania te same co przy Tutorze — bo problem jest ten sam: reguły
 * Woo stoją poza warstwami kaskady motywu i biją go niezależnie od
 * kolejności ładowania.
 */
{
  const m = await zmierz(SCIEZKA_KONTA, ZAKRES_KONTA, { bezPaskaAdmina: true });

  sprawdz(
    m.nieznane.length === 0,
    `${SCIEZKA_KONTA}: pomiar nie umie rozebrać zapisu koloru (${m.nieznane.join(", ")}) — wynik byłby zgadywaniem`
  );

  sprawdz(
    m.zmierzonych > 0,
    `${SCIEZKA_KONTA}: zakres pomiaru nie trafił w ANI JEDEN element — albo WooCommerce nie renderuje konta, albo zmienił markup`
  );

  sprawdz(m.klasaBodyWoo, `${SCIEZKA_KONTA}: brak klasy „aai-woo-na-motywie” na body — arkusz integracji nie ma się czego złapać`);
  sprawdz(m.naszArkuszWoo, `${SCIEZKA_KONTA}: nasz arkusz integracji Woo nie wszedł na stronę konta`);

  /*
   * „MOJE KURSY" PIERWSZĄ POZYCJĄ MENU KONTA. Właściciel szukał kursów
   * właśnie tutaj, klikając „Dashboard" — a menu mówiło o zamówieniach,
   * pobraniach i adresach, czyli o wszystkim poza rzeczą, po którą klient
   * przyszedł. Dla naszego produktu kurs jest ważniejszy niż faktura.
   */
  sprawdz(
    (m.pozycjeKonta[0] ?? "").includes("/szkolenia/moje"),
    `${SCIEZKA_KONTA}: pierwsza pozycja menu konta prowadzi do „${m.pozycjeKonta[0] ?? "(brak)"}”, a ma prowadzić do „Moich kursów"`
  );

  sprawdz(
    m.naglowekDol > 0,
    `${SCIEZKA_KONTA}: nie widać nagłówka motywu — strona konta wypadła z układu serwisu`
  );

  sprawdz(
    m.nachodzace.length === 0,
    `${SCIEZKA_KONTA}: ${m.nachodzace.length} elementów wjeżdża pod nagłówek motywu (dół nagłówka ${m.naglowekDol} px): ` +
      m.nachodzace.map((x) => `${x.el} „${x.tekst}" @${x.gora}px`).join("; ")
  );

  sprawdz(
    m.jasne.length === 0,
    `${SCIEZKA_KONTA}: ${m.jasne.length} jasnych powierzchni poza akcentem marki (białe pola formularza Woo): ` +
      m.jasne.map((x) => `${x.el} ${x.pole} px² ${x.tlo}`).join("; ")
  );

  sprawdz(
    m.nieczytelne.length === 0,
    `${SCIEZKA_KONTA}: ${m.nieczytelne.length} napisów o kontraście < ${MIN_KONTRAST}:1: ` +
      m.nieczytelne.map((x) => `„${x.tekst}" ${x.kontrast}:1`).join("; ")
  );

  const rozne = m.stopka
    .map((w, i) => ({ etykieta: w.etykieta, nasza: w.podpis, motyw: wzorzec.stopka[i]?.podpis }))
    .filter((x) => x.motyw !== undefined && x.motyw !== x.nasza);
  sprawdz(
    rozne.length === 0,
    `${SCIEZKA_KONTA}: stopka MOTYWU renderuje się inaczej niż na stronie motywu (${rozne.length} z ${m.stopka.length}) — nasz arkusz Woo wycieka poza własny markup: ` +
      rozne.slice(0, 3).map((x) => `\n      ${x.etykieta}\n        nasza: ${x.nasza}\n        motyw: ${x.motyw}`).join("")
  );

  console.log(
    `  ${SCIEZKA_KONTA}: nagłówek do ${m.naglowekDol} px, ${m.zmierzonych} elementów, ` +
      `${m.nachodzace.length} nachodzeń, ${m.jasne.length} jasnych plam, ${m.nieczytelne.length} napisów < ${MIN_KONTRAST}:1`
  );
}

/*
 * SIÓDMA STRONA: „MOJE KURSY" (W6) — nasza lista kupionych kursów, ta, na
 * którą trafia klient po zalogowaniu i z przekierowanego panelu Tutora.
 * Mierzymy ją zalogowanym administratorem, więc pokazuje stan „konto bez
 * zakupów"; dla tego pomiaru to bez różnicy — pytamy o wygląd i o to, czy
 * nic nie chowa się pod belką, a nie o zawartość listy.
 */
{
  const m = await zmierz(SCIEZKA_MOJE, ZAKRES_NASZ, { bezPaskaAdmina: true });

  sprawdz(
    m.nieznane.length === 0,
    `${SCIEZKA_MOJE}: pomiar nie umie rozebrać zapisu koloru (${m.nieznane.join(", ")}) — wynik byłby zgadywaniem`
  );
  sprawdz(m.zmierzonych > 0, `${SCIEZKA_MOJE}: zakres pomiaru nie trafił w ANI JEDEN element`);
  sprawdz(m.naszArkuszSklepu, `${SCIEZKA_MOJE}: nasz arkusz sklepu nie wszedł na stronę`);
  sprawdz(
    m.cudzeArkusze.length === 0,
    `${SCIEZKA_MOJE}: na naszej stronie ładują się cudze arkusze (${m.cudzeArkusze.join(", ")})`
  );
  sprawdz(m.naglowekDol > 0, `${SCIEZKA_MOJE}: nie widać belki przypiętej do góry`);
  sprawdz(
    m.nachodzace.length === 0,
    `${SCIEZKA_MOJE}: ${m.nachodzace.length} elementów wjeżdża pod belkę (dół belki ${m.naglowekDol} px): ` +
      m.nachodzace.map((x) => `${x.el} „${x.tekst}" @${x.gora}px`).join("; ")
  );
  sprawdz(
    m.jasne.length === 0,
    `${SCIEZKA_MOJE}: ${m.jasne.length} jasnych powierzchni poza akcentem marki: ` +
      m.jasne.map((x) => `${x.el} ${x.pole} px² ${x.tlo}`).join("; ")
  );
  sprawdz(
    m.nieczytelne.length === 0,
    `${SCIEZKA_MOJE}: ${m.nieczytelne.length} napisów o kontraście < ${MIN_KONTRAST}:1: ` +
      m.nieczytelne.map((x) => `„${x.tekst}" ${x.kontrast}:1`).join("; ")
  );

  console.log(
    `  ${SCIEZKA_MOJE}: belka do ${m.naglowekDol} px, ${m.zmierzonych} elementów, ` +
      `${m.nachodzace.length} nachodzeń, ${m.jasne.length} jasnych plam, ${m.nieczytelne.length} napisów < ${MIN_KONTRAST}:1`
  );
}

/*
 * ÓSMA I DZIEWIĄTA STRONA: KOSZYK I KASA WOOCOMMERCE (P3a).
 *
 * Mierzone Z PRODUKTEM KURSU W KOSZYKU: kasa z pustym koszykiem
 * przekierowuje na koszyk (zmierzone), a pusty koszyk to inna strona niż
 * ta, którą klient zobaczy przy zakupie. Koszyk napełnia Store API w Node
 * (sesja jedzie do przeglądarki ciastkami), a blokadę sprzedaży (P3a:
 * zamknięta do P4) smoke otwiera WYŁĄCZNIE na czas tego bloku i zamyka
 * w `finally` — razem ze sprzątnięciem koszyka.
 */
{
  const produktKursu = Number(
    wpEval(
      'echo (int) $GLOBALS["wpdb"]->get_var("SELECT product_id FROM " . Aai_Platnosci_Tabele::tabela("powiazania") . " ORDER BY product_id LIMIT 1");'
    )
  );
  sprawdz(
    produktKursu > 0,
    "koszyk/kasa: w tabeli powiazania nie ma ani jednego produktu kursu — środowisko niepełne (npm run wp:import)"
  );

  /*
   * Koszyk i kasę mierzymy JAKO GOŚĆ, w izolowanym kontekście przeglądarki:
   * wcześniejsze pomiary (lekcja, konto) zalogowały admina, a WooCommerce
   * dla ZALOGOWANEGO czyta sesję po jego identyfikatorze i ignoruje
   * ciastko sesji gościa. Produkt dodaje SAMA PRZEGLĄDARKA
   * (`?add-to-cart=`), więc ciastka sesji zakłada jej WooCommerce —
   * przenoszenie sesji ze skryptu Node wyglądało identycznie co do bajta,
   * a serwer i tak widział pusty koszyk (dwa zmierzone, padnięte
   * podejścia tego bloku).
   */
  const kontekstGoscia = await przegladarka.createBrowserContext();
  let koszyk = null;
  let kasa = null;
  let dodanie = null;
  wpEval(`update_option("${OPCJA_SPRZEDAZY}", "tak");`);
  try {
    const karta = await kontekstGoscia.newPage();
    await karta.goto(`${ADRES}/?add-to-cart=${produktKursu}`, { waitUntil: "load", timeout: 60000 });
    dodanie = await karta.evaluate(async () => {
      const odp = await fetch("/wp-json/wc/store/v1/cart", { credentials: "include" });
      return { items: (await odp.json()).items_count ?? 0 };
    });
    await karta.close();
    if (dodanie.items > 0) {
      // Timeout selektora (React bloku nie wstał / koszyk pusty) ma być
      // CZERWONĄ ASERCJĄ z opisem, nie nieobsłużonym wyjątkiem — smoke,
      // który pada crashem, nie sprząta i nie raportuje pozostałych stron.
      koszyk = await zmierz("/koszyk/", ZAKRES_KOSZYKA, { kontekst: kontekstGoscia, czekajNa: ".wc-block-cart-items__row" })
        .catch((b) => ({ blad: `czekanie na wiersz pozycji koszyka: ${b.message}` }));
      kasa = await zmierz("/kasa/", ZAKRES_KASY, { kontekst: kontekstGoscia, czekajNa: ".wc-block-checkout__form" })
        .catch((b) => ({ blad: `czekanie na formularz kasy: ${b.message}` }));
    }
    // Sprzątanie koszyka W TEJ SAMEJ sesji przeglądarki, zanim zamkniemy
    // kontekst — wpis sesji w bazie wygasłby sam po 48 h, ale test nie
    // zostawia po sobie nawet takich danych (klasa 6 z walidacji P2).
    const sprzatanie = await kontekstGoscia.newPage();
    await sprzatanie.goto(`${ADRES}/koszyk/`, { waitUntil: "load", timeout: 60000 });
    await sprzatanie.evaluate(async () => {
      const odp = await fetch("/wp-json/wc/store/v1/cart", { credentials: "include" });
      await fetch("/wp-json/wc/store/v1/cart/items", {
        method: "DELETE",
        credentials: "include",
        headers: { Nonce: odp.headers.get("Nonce") ?? "" },
      });
    });
    await sprzatanie.close();
  } finally {
    await kontekstGoscia.close().catch(() => {});
    wpEval(`delete_option("${OPCJA_SPRZEDAZY}");`);
  }
  // Test negatywny blokady — WŁASNĄ, świeżą sesją gościa przez Store API
  // (osobną od pomiarowej): po zamknięciu flagi produkt ma być ODRZUCONY.
  const zamkniete = await (async () => {
    const wstep = await fetch(`${ADRES}/wp-json/wc/store/v1/cart`);
    const o = await fetch(`${ADRES}/wp-json/wc/store/v1/cart/add-item`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Nonce: wstep.headers.get("Nonce") ?? "",
        cookie: (wstep.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; "),
      },
      body: JSON.stringify({ id: produktKursu, quantity: 1 }),
    });
    return { kod: o.status };
  })();

  sprawdz(
    null !== dodanie && dodanie.items > 0,
    `koszyk/kasa: przeglądarka-gość nie dostała produktu do koszyka przy OTWARTEJ fladze — pomiar stron nie mógł się odbyć`
  );
  // Test negatywny blokady w tym samym przebiegu: po zamknięciu flagi ten
  // sam produkt ma zostać ODRZUCONY — inaczej „sprzedaż zamknięta do P4"
  // jest zdaniem z dokumentacji, nie stanem instalacji.
  sprawdz(
    400 === zamkniete.kod,
    `koszyk/kasa: po zamknięciu flagi Store API przyjęło produkt kursu (kod ${zamkniete.kod}) — blokada sprzedaży NIE działa`
  );

  for (const [sciezka, m, oczekiwanyAdres] of [
    ["/koszyk/", koszyk, "/koszyk/"],
    ["/kasa/", kasa, "/kasa/"],
  ]) {
    if (null === m || m.blad) {
      sprawdz(false, `${sciezka}: pomiar nie doszedł do skutku — ${m?.blad ?? "produkt nie wszedł do koszyka"}`);
      continue;
    }
    sprawdz(
      m.adres === oczekiwanyAdres,
      `${sciezka}: przeglądarka wylądowała na „${m.adres}" — mierzylibyśmy CUDZĄ stronę (pusty koszyk przekierowuje kasę)`
    );
    sprawdz(
      m.nieznane.length === 0,
      `${sciezka}: pomiar nie umie rozebrać zapisu koloru (${m.nieznane.join(", ")}) — wynik byłby zgadywaniem`
    );
    sprawdz(m.zmierzonych > 0, `${sciezka}: zakres pomiaru nie trafił w ANI JEDEN element`);
    sprawdz(m.klasaBodyWoo, `${sciezka}: brak klasy „aai-woo-na-motywie” na body — arkusz integracji nie ma się czego złapać`);
    sprawdz(m.naszArkuszWoo, `${sciezka}: nasz arkusz integracji Woo nie wszedł na stronę`);
    sprawdz(m.naglowekDol > 0, `${sciezka}: nie widać nagłówka motywu — strona wypadła z układu serwisu`);
    sprawdz(
      m.nachodzace.length === 0,
      `${sciezka}: ${m.nachodzace.length} elementów wjeżdża pod nagłówek motywu (dół nagłówka ${m.naglowekDol} px): ` +
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
      `${sciezka}: stopka MOTYWU renderuje się inaczej niż na stronie motywu (${rozne.length} z ${m.stopka.length}): ` +
        rozne.slice(0, 3).map((x) => `\n      ${x.etykieta}\n        nasza: ${x.nasza}\n        motyw: ${x.motyw}`).join("")
    );
    console.log(
      `  ${sciezka}: nagłówek do ${m.naglowekDol} px, ${m.zmierzonych} elementów, ` +
        `${m.nachodzace.length} nachodzeń, ${m.jasne.length} jasnych plam, ${m.nieczytelne.length} napisów < ${MIN_KONTRAST}:1`
    );
  }
  sprawdz(
    null !== koszyk && koszyk.maPozycjeKoszyka,
    "/koszyk/: nie widać wiersza pozycji — zmierzyliśmy pusty koszyk zamiast koszyka z kursem"
  );
}

await przegladarka.close();

if (bledy.length > 0) {
  console.error(`\nsmoke-wp-motyw: ${bledy.length} z ${sprawdzen} sprawdzeń padło:`);
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}
console.log(`smoke-wp-motyw: ${sprawdzen} sprawdzeń zaliczonych.`);
