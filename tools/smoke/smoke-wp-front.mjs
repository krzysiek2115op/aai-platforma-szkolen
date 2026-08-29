/**
 * Smoke frontu wtyczki (krok W3) — trasy, treść, menu, przekierowania, SEO.
 *
 * PO CO OSOBNO OD `smoke-wp-motyw`. Bo to dwa różne pytania i dwa różne koszty.
 * Tamten mierzy WYGLĄD w prawdziwej przeglądarce i wymaga riga z puppeteerem;
 * ten pyta o FAKTY, które widać w odpowiedzi HTTP — i chodzi na samym `fetch`.
 * Dzięki temu można go puścić po każdej zmianie w PHP, bez stawiania
 * przeglądarki.
 *
 * ZASADA: porównujemy Z BAZĄ, nie ze stałą wpisaną w test. Test, który
 * sprawdza „czy na stronie jest napis »Jak poprawnie korzystać z Claude«",
 * przestaje cokolwiek znaczyć w dniu, w którym ktoś zmieni tytuł kursu
 * kreatorem — a właśnie po to jest kreator. Stan bazy bierzemy z komendy
 * `wp aai-sklep sprawdz --json`, czyli z tego samego źródła, co dowody W2.
 *
 * WYMAGA lokalnego środowiska: `cd wordpress/srodowisko && ./postaw.sh`.
 * Nie wchodzi do CI — tam nie ma podmana.
 *
 * Użycie: node tools/smoke/smoke-wp-front.mjs
 */
import { execFileSync } from "node:child_process";

const ADRES = process.env.WP_ADRES ?? "http://127.0.0.1:8892";
const STACK = process.env.STACK_NAZWA ?? "aai_wp";
const KONTENER = `${STACK}_cli`;

const bledy = [];
let sprawdzen = 0;
const sprawdz = (warunek, opis) => {
  sprawdzen += 1;
  if (!warunek) bledy.push(opis);
};

/** Komenda wtyczki w kontenerze. */
function wp(...argumenty) {
  return execFileSync(
    "podman",
    ["exec", KONTENER, "wp", "--path=/var/www/html", ...argumenty],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
  );
}

/*
 * Stan sprzedaży czytamy Z INSTALACJI, nie zakładamy. Dwa sprawdzenia
 * niżej (przycisk oferty i `availability` w danych strukturalnych) mają
 * inne oczekiwanie przy sprzedaży otwartej niż zamkniętej, a smoke ma
 * przechodzić w OBU stanach — inaczej byłby testem jednego etapu planu,
 * nie testem frontu.
 */
const SPRZEDAZ_OTWARTA =
  wp("eval", "echo class_exists( 'Aai_Platnosci_Ustawienia' ) && Aai_Platnosci_Ustawienia::sprzedaz_otwarta() ? 'tak' : 'nie';").trim() === "tak";

/** Pobranie strony BEZ podążania za przekierowaniem. */
async function pobierz(sciezka) {
  const odpowiedz = await fetch(ADRES + sciezka, { redirect: "manual" });
  const html = odpowiedz.status === 200 ? await odpowiedz.text() : "";
  return {
    kod: odpowiedz.status,
    dokad: odpowiedz.headers.get("location"),
    html,
    /*
     * HTML BEZ `<script>` — do pytań „czy klient to widzi".
     *
     * Bez tego smoke miał dziurę, którą złapał dopiero test negatywny:
     * po usunięciu sekcji FAQ ze strony jej pytania nadal były w odpowiedzi,
     * bo siedzą w danych strukturalnych `FAQPage`. Sprawdzenie przechodziło,
     * a klient widział stronę bez FAQ, wyszukiwarka zaś obietnicę, której na
     * stronie nie ma. Dokładnie ta klasa rozjazdu, której zakazują wytyczne.
     */
    widoczne: html.replace(/<script[\s\S]*?<\/script>/gi, ""),
  };
}

/** Wszystkie węzły JSON-LD ze strony. */
function jsonld(html) {
  const wezly = [];
  for (const [, tresc] of html.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g
  )) {
    try {
      wezly.push(JSON.parse(tresc));
    } catch {
      wezly.push({ "@type": "NIEPOPRAWNY_JSON", surowe: tresc.slice(0, 120) });
    }
  }
  return wezly.flatMap((w) => (Array.isArray(w["@graph"]) ? w["@graph"] : [w]));
}

/** Zawartość listy `<ul>` należącej do nawigacji o podanej etykiecie. */
function nawigacja(html, etykieta) {
  const poz = html.indexOf(`aria-label="${etykieta}"`);
  if (poz < 0) return null;
  const start = html.indexOf("<ul", poz);
  if (start < 0) return null;
  let glebokosc = 0;
  const wzorzec = /<ul\b|<\/ul\s*>/g;
  wzorzec.lastIndex = start;
  let trafienie;
  while ((trafienie = wzorzec.exec(html)) !== null) {
    if (trafienie[0].startsWith("</")) {
      if (--glebokosc === 0) return html.slice(start, wzorzec.lastIndex);
    } else {
      glebokosc += 1;
    }
  }
  return null;
}

const ucieczka = (s) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

console.log(`smoke-wp-front: ${ADRES}`);

/* ————————————————— stan bazy: źródło prawdy dla całego smoke'u ————————————————— */

const stan = JSON.parse(wp("aai-sklep", "sprawdz", "--json").trim());
const opublikowane = stan.kursy.filter((k) => k.status === "published");
sprawdz(
  opublikowane.length > 0,
  "w tabelach nie ma ANI JEDNEGO opublikowanego kursu — smoke nie miałby czego sprawdzać (uruchom `npm run wp:import`)"
);

/* ————————————————— 1. katalog ————————————————— */

const katalog = await pobierz("/szkolenia/");
sprawdz(katalog.kod === 200, `/szkolenia/ oddaje ${katalog.kod}, oczekiwano 200`);

for (const kurs of opublikowane) {
  sprawdz(
    katalog.widoczne.includes(ucieczka(kurs.title)),
    `/szkolenia/: brak tytułu kursu „${kurs.title}" — katalog nie pokazuje kursu, który jest w bazie`
  );
  sprawdz(
    katalog.html.includes(`/szkolenia/${kurs.slug}/`),
    `/szkolenia/: brak odnośnika do /szkolenia/${kurs.slug}/`
  );
}

const szkice = stan.kursy.filter((k) => k.status !== "published");
for (const kurs of szkice) {
  sprawdz(
    !katalog.widoczne.includes(ucieczka(kurs.title)),
    `/szkolenia/: WYCIEK SZKICU — w katalogu widać „${kurs.title}" (status ${kurs.status})`
  );
}

/* ————————————————— 2. strony kursów ————————————————— */

for (const kurs of opublikowane) {
  const strona = await pobierz(`/szkolenia/${kurs.slug}/`);
  sprawdz(strona.kod === 200, `/szkolenia/${kurs.slug}/ oddaje ${strona.kod}, oczekiwano 200`);
  if (strona.kod !== 200) continue;

  // Program: każdy moduł i każda lekcja z bazy musi być na stronie.
  // Wymóg właściciela z D7: strona nie obiecuje niczego spoza programu,
  // ale też nie ukrywa niczego, co w programie jest.
  const brakModulow = kurs.moduly.filter((m) => !strona.widoczne.includes(ucieczka(m.title)));
  sprawdz(
    brakModulow.length === 0,
    `/szkolenia/${kurs.slug}/: ${brakModulow.length} modułów z bazy nie ma na stronie: ` +
      brakModulow.slice(0, 3).map((m) => `„${m.title}"`).join(", ")
  );

  const lekcje = kurs.moduly.flatMap((m) => m.lekcje);
  const brakLekcji = lekcje.filter((l) => !strona.widoczne.includes(ucieczka(l.title)));
  sprawdz(
    brakLekcji.length === 0,
    `/szkolenia/${kurs.slug}/: ${brakLekcji.length} z ${lekcje.length} tytułów lekcji nie ma na stronie: ` +
      brakLekcji.slice(0, 3).map((l) => `„${l.title}"`).join(", ")
  );

  // Sekcje sprzedażowe: każdy rodzaj z bazy ma zostawić ślad na stronie.
  // Sprawdzamy pierwszy tekst z treści sekcji — jeśli go nie ma, sekcja
  // albo nie ma szablonu, albo wypadła na kontrakcie. Jedno i drugie
  // znaczy treść wpisaną kreatorem, której klient nie zobaczy.
  for (const sekcja of kurs.sekcje) {
    const tekst = pierwszyTekst(sekcja.content);
    if (tekst === null) continue;
    sprawdz(
      strona.widoczne.includes(ucieczka(tekst)),
      `/szkolenia/${kurs.slug}/: sekcja „${sekcja.kind}" jest w bazie, ale jej treść nie weszła na stronę (szukano: „${tekst.slice(0, 60)}")`
    );
  }

  // Cena: format z prototypu, z twardymi spacjami — i sprawdzana W SEKCJI
  // OFERTY, nie gdziekolwiek na stronie. Cena pada też w hero i w przycisku,
  // więc szukanie jej w całym HTML-u przepuszczało mutację, która wycinała
  // ją z karty oferty — złapane testem negatywnym.
  const cena =
    new Intl.NumberFormat("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      .format(kurs.price_grosze / 100)
      .replace(/\u202f|\u00a0| /g, "\u00a0") + "\u00a0zł";
  const oferta = wycinek(strona.widoczne, 'id="cena"', "</section>");
  sprawdz(
    oferta !== null && oferta.includes(cena),
    `/szkolenia/${kurs.slug}/: w sekcji oferty (#cena) nie ma ceny „${cena}" — strona sprzedażowa bez ceny w ofercie nie jest stroną sprzedażową`
  );
  /*
   * PRZYCISK ZAKUPU ZALEŻY OD STANU SPRZEDAŻY, więc sprawdzenie też musi.
   * Do kroku P4 zakup był placeholderem i prowadził na `/kontakt`; od P4
   * przy otwartej sprzedaży prowadzi do kasy z produktem. Wpisany na
   * sztywno `/kontakt` czynił z tego smoke'a test, który pada dokładnie
   * wtedy, gdy sklep zaczyna działać.
   */
  sprawdz(
    oferta !== null && oferta.includes(SPRZEDAZ_OTWARTA ? "add-to-cart=" : ADRES.replace(/\/$/, "") + "/kontakt"),
    SPRZEDAZ_OTWARTA
      ? `/szkolenia/${kurs.slug}/: sprzedaż jest otwarta, a w sekcji oferty nie ma przycisku prowadzącego do kasy z produktem`
      : `/szkolenia/${kurs.slug}/: w sekcji oferty nie ma przycisku zakupu prowadzącego do kontaktu (przy zamkniętej sprzedaży zakup jest placeholderem)`
  );
  // Kanonik i dane strukturalne — porównane Z BAZĄ, nie ze stałą.
  sprawdz(
    strona.html.includes(`<link rel="canonical" href="${ADRES}/szkolenia/${kurs.slug}/"/>`),
    `/szkolenia/${kurs.slug}/: brak albo zły kanonik (motyw zdejmuje rel_canonical, więc daje go wtyczka)`
  );

  const wezly = jsonld(strona.html);
  const kursLd = wezly.find((w) => w["@type"] === "Course");
  sprawdz(kursLd !== undefined, `/szkolenia/${kurs.slug}/: brak węzła Course w danych strukturalnych`);
  if (kursLd) {
    sprawdz(kursLd.name === kurs.title, `/szkolenia/${kurs.slug}/: Course.name „${kursLd.name}" ≠ tytuł z bazy „${kurs.title}"`);
    sprawdz(
      kursLd.offers?.price === (kurs.price_grosze / 100).toFixed(2),
      `/szkolenia/${kurs.slug}/: Offer.price ${kursLd.offers?.price} ≠ cena z bazy ${(kurs.price_grosze / 100).toFixed(2)}`
    );
    const dostepnosc = SPRZEDAZ_OTWARTA ? "https://schema.org/InStock" : "https://schema.org/PreOrder";
    sprawdz(
      kursLd.offers?.availability === dostepnosc,
      `/szkolenia/${kurs.slug}/: Offer.availability = ${kursLd.offers?.availability}, a przy sprzedaży ${SPRZEDAZ_OTWARTA ? "otwartej" : "zamkniętej"} ma być ${dostepnosc}`
    );
    sprawdz(
      (kursLd.syllabusSections?.length ?? 0) === kurs.moduly.length,
      `/szkolenia/${kurs.slug}/: dane strukturalne mówią o ${kursLd.syllabusSections?.length ?? 0} modułach, baza o ${kurs.moduly.length}`
    );
  }

  const faqBaza = kurs.sekcje.find((s) => s.kind === "faq");
  const faqLd = wezly.find((w) => w["@type"] === "FAQPage");
  sprawdz(
    (faqBaza === undefined) === (faqLd === undefined),
    `/szkolenia/${kurs.slug}/: FAQPage w danych strukturalnych ${faqLd ? "JEST" : "NIE MA"}, a sekcja FAQ w bazie ${faqBaza ? "JEST" : "NIE MA"} — dane strukturalne mają mówić o tym, co widać`
  );

  // Cudze zasoby: strona sklepu nie ładuje CSS-u Tutora ani Woo.
  const cudze = [...strona.html.matchAll(/id=['"]([a-z0-9-]+)-css['"]/g)]
    .map((t) => t[1])
    .filter((id) => /^(tutor|wc-|woocommerce)/.test(id));
  sprawdz(
    cudze.length === 0,
    `/szkolenia/${kurs.slug}/: cudze arkusze na naszej stronie (${cudze.join(", ")}) — wraca kolizja klas z 0.38.0`
  );

  // Elementy `position: fixed` MUSZĄ stać poza <main> (BLAD-003/004).
  const main = strona.html.indexOf("<main");
  for (const klasa of ["aai-tlo", "aai-pasek"]) {
    const poz = strona.html.indexOf(`class="${klasa}"`);
    sprawdz(
      poz >= 0 && poz < main,
      `/szkolenia/${kurs.slug}/: element .${klasa} (position: fixed) ${poz < 0 ? "nie istnieje" : "siedzi wewnątrz <main>"} — przodek z transformacją odbiera mu ekran jako układ odniesienia (BLAD-003)`
    );
  }
}

/** Kawałek HTML od znacznika zawierającego `od` do najbliższego `do`. */
function wycinek(html, od, doZnacznika) {
  const start = html.indexOf(od);
  if (start < 0) return null;
  const koniec = html.indexOf(doZnacznika, start);
  return koniec < 0 ? null : html.slice(start, koniec);
}

/** Pierwszy tekst z treści sekcji — do sprawdzenia, czy sekcja weszła na stronę. */
function pierwszyTekst(wartosc) {
  if (typeof wartosc === "string") return wartosc.trim().length > 12 ? wartosc.trim() : null;
  if (Array.isArray(wartosc)) {
    for (const el of wartosc) {
      const t = pierwszyTekst(el);
      if (t !== null) return t;
    }
    return null;
  }
  if (wartosc && typeof wartosc === "object") {
    for (const el of Object.values(wartosc)) {
      const t = pierwszyTekst(el);
      if (t !== null) return t;
    }
  }
  return null;
}

/* ————————————————— 3. adres, którego nie ma ————————————————— */

const nieistniejacy = await pobierz("/szkolenia/nie-ma-takiego-kursu-2026/");
sprawdz(
  nieistniejacy.kod === 404,
  `/szkolenia/nie-ma-takiego-kursu-2026/ oddaje ${nieistniejacy.kod}, oczekiwano 404 — strona „nie ma", która oddaje 200, zostaje w indeksie na zawsze`
);

/* ————————————————— 4. przekierowania z Tutora ————————————————— */

/*
 * PANEL KURSANTA → NASZE „MOJE KURSY" (W6).
 *
 * Do tej zmiany klient po zalogowaniu trafiał na pełnoekranowy panel Tutora:
 * własny pasek boczny, własny nagłówek, okno powitalne ze zrzutem cudzego
 * kursu. Właściciel zgłosił to w teście ręcznym i zdecydował, że panel
 * przekierowujemy do nas — klient nigdy nie ogląda cudzego wyglądu.
 *
 * Sprawdzamy jako GOŚĆ, bo przekierowanie nie zależy od zalogowania:
 * „Moje kursy" mają własny stan dla niezalogowanego (zaproszenie do
 * logowania), więc gość nie ląduje w ślepym zaułku.
 */
const panel = await pobierz("/dashboard/");
sprawdz(
  panel.kod === 302 && panel.dokad === `${ADRES}/szkolenia/moje/`,
  `/dashboard/ oddaje ${panel.kod} → ${panel.dokad}, oczekiwano 302 → ${ADRES}/szkolenia/moje/`
);

const panelKursy = await pobierz("/dashboard/courses/");
sprawdz(
  panelKursy.kod === 302 && panelKursy.dokad === `${ADRES}/szkolenia/moje/`,
  `/dashboard/courses/ oddaje ${panelKursy.kod} → ${panelKursy.dokad}, oczekiwano 302 → ${ADRES}/szkolenia/moje/`
);

/*
 * „Moje kursy" GOŚCIOWI nie może pokazać ani jednego kursu — to strona
 * prywatna, a jej treść zależy od konta. Ma też mieć `noindex`: robot jest
 * gościem, więc zaindeksowałby pustą zachętę do logowania pod adresem marki.
 */
const moje = await pobierz("/szkolenia/moje/");
sprawdz( moje.kod === 200, `/szkolenia/moje/ oddaje ${moje.kod}, oczekiwano 200` );
sprawdz(
  /<meta name="robots" content="noindex/.test(moje.html),
  "/szkolenia/moje/ nie ma `noindex` — strona prywatna trafiłaby do wyszukiwarki"
);
sprawdz(
  !moje.widoczne.includes("aai-moje-karta"),
  "/szkolenia/moje/ pokazuje GOŚCIOWI kafelek kursu — lista kupionych kursów wyciekła"
);

/*
 * MENU GOŚCIA BEZ DRZWI, ZA KTÓRYMI NIC NIE MA. „Moje kursy" i „Moje
 * konto" (druga pozycja doszła w P6: droga POWROTNA do zamówień
 * i ustawień — zgłoszenie właściciela) wchodzą do nawigacji wyłącznie
 * zalogowanemu. Obecność u zalogowanego mierzy smoke-wp-lekcja, bo tam
 * jest konto zapisane na kurs; tu pilnujemy drugiej strony medalu.
 */
{
  const glownaGoscia = nawigacja(moje.html, "Nawigacja główna") ?? "";
  for (const pozycja of ["Moje kursy", "Moje konto"]) {
    sprawdz(
      !glownaGoscia.includes(pozycja),
      `menu pokazuje GOŚCIOWI pozycję „${pozycja}" — drzwi, za którymi nie ma dla niego niczego`
    );
  }
}

/*
 * Odpowiedzi zależnej od konta nie wolno odłożyć na półkę: cache strony albo
 * CDN bez reguły na ciasteczko logowania wydałby listę kursów jednego klienta
 * drugiemu.
 *
 * UWAGA, CZEGO TO SPRAWDZENIE NIE ROBI: nie pilnuje NASZEGO wywołania
 * `nocache_headers()`. Test negatywny pokazał, że po jego usunięciu nagłówki
 * i tak przychodzą — dokłada je coś innego w stosie. Tu pilnujemy WŁASNOŚCI
 * odpowiedzi (ma być niecache'owalna, niezależnie od tego, kto to zapewnia),
 * a naszej gwarancji pilnuje `straznik-frontu-wp`.
 */
const mojeNaglowki = await fetch(`${ADRES}/szkolenia/moje/`, { redirect: "manual" });
const cache = (mojeNaglowki.headers.get("cache-control") ?? "").toLowerCase();
sprawdz(
  cache.includes("no-store") || cache.includes("no-cache"),
  `/szkolenia/moje/ oddaje Cache-Control „${cache || "(brak)"}” — strona prywatna nie ma prawa być cache'owana`
);


const archiwum = await pobierz("/courses/");
sprawdz(
  archiwum.kod === 301 && archiwum.dokad === `${ADRES}/szkolenia/`,
  `/courses/ oddaje ${archiwum.kod} → ${archiwum.dokad}, oczekiwano 301 → ${ADRES}/szkolenia/`
);

for (const kurs of opublikowane) {
  const stronaTutora = await pobierz(`/courses/${kurs.slug}/`);
  sprawdz(
    stronaTutora.kod === 301 && stronaTutora.dokad === `${ADRES}/szkolenia/${kurs.slug}/`,
    `/courses/${kurs.slug}/ oddaje ${stronaTutora.kod} → ${stronaTutora.dokad}, oczekiwano 301 → ${ADRES}/szkolenia/${kurs.slug}/`
  );
}

/* ————————————————— 5. pozycja „Szkolenia" w menu motywu ————————————————— */

const stronaMotywu = await pobierz("/uslugi/");
sprawdz(stronaMotywu.kod === 200, `/uslugi/ oddaje ${stronaMotywu.kod} — nie ma na czym sprawdzić menu`);

for (const [strona, html] of [
  ["/uslugi/", stronaMotywu.html],
  ["/szkolenia/", katalog.html],
]) {
  for (const etykieta of ["Nawigacja główna", "Nawigacja mobilna"]) {
    const lista = nawigacja(html, etykieta);
    sprawdz(
      lista !== null,
      `${strona}: nie znaleziono listy w nawigacji „${etykieta}" — kotwica wstrzyknięcia przestała pasować do motywu`
    );
    if (lista === null) continue;
    sprawdz(
      lista.includes("/szkolenia/") && lista.includes("Szkolenia"),
      `${strona}: w nawigacji „${etykieta}" NIE MA pozycji Szkolenia — motyw jest generowany, więc taka strata jest cicha`
    );
  }
}

// Na naszych stronach pozycja ma być oznaczona jako bieżąca — tego atrybutu
// szuka skrypt motywu, podświetlając aktywną pozycję menu.
const glowna = nawigacja(katalog.html, "Nawigacja główna") ?? "";
sprawdz(
  /href="[^"]*\/szkolenia\/"\s+aria-current="page"/.test(glowna),
  `/szkolenia/: pozycja Szkolenia bez aria-current="page" — menu nie pokaże, że jesteśmy w tej sekcji`
);

// A na stronie motywu — NIE ma być oznaczona.
const glownaMotywu = nawigacja(stronaMotywu.html, "Nawigacja główna") ?? "";
sprawdz(
  !/href="[^"]*\/szkolenia\/"\s+aria-current="page"/.test(glownaMotywu),
  `/uslugi/: pozycja Szkolenia oznaczona jako bieżąca na CUDZEJ stronie`
);

/* ————————————————— 6. tytuł i kanonik katalogu ————————————————— */

sprawdz(
  katalog.html.includes(`<link rel="canonical" href="${ADRES}/szkolenia/"/>`),
  "/szkolenia/: brak albo zły kanonik katalogu"
);
sprawdz(
  /<title>[^<]*Automatic AI<\/title>/.test(katalog.html) &&
    !/<title>\s*<\/title>/.test(katalog.html),
  "/szkolenia/: pusty albo obcy tytuł dokumentu (motyw ustawia własny tylko dla wpisów, więc daje go wtyczka)"
);

const lista = jsonld(katalog.html).find((w) => w["@type"] === "ItemList");
sprawdz(
  lista?.numberOfItems === opublikowane.length,
  `/szkolenia/: ItemList mówi o ${lista?.numberOfItems} kursach, baza o ${opublikowane.length}`
);

/* ————————————————— wynik ————————————————— */

if (bledy.length > 0) {
  console.error(`\nsmoke-wp-front: ${bledy.length} z ${sprawdzen} sprawdzeń padło:`);
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}
console.log(`smoke-wp-front: ${sprawdzen} sprawdzeń zaliczonych.`);
