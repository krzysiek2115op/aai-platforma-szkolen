/**
 * Strażnik higieny bramek: **smoke kasuje wyłącznie to, co sam wysłał.**
 *
 * PO CO. Łapacz poczty (Mailpit) jest zasobem WSPÓLNYM — piszą do niego nasze
 * bramki, a zagląda tam właściciel, kiedy testuje sklep ręcznie. Do 0.53.0
 * obie strony robiły z nim rzecz niebezpieczną, w przeciwnych kierunkach,
 * i żadna kontrola tego nie widziała:
 *
 *   - `smoke-wp-zakup` i `smoke-wp-zwroty` NIE SPRZĄTAŁY po sobie (zmierzone
 *     na czystej skrzynce: 21 i 15 wiadomości na przebieg), więc właściciel
 *     szukał swojego maila wśród kilkudziesięciu cudzych;
 *   - `smoke-wp-maile` i `postaw.sh` sprzątały ODWROTNIE — kasowały CAŁĄ
 *     skrzynkę (zmierzone: 36 → 0). To jest czwarte zgłoszenie z testu
 *     ręcznego P6: właścicielowi zniknął z podglądu mail, który przed chwilą
 *     dostał, i wyglądało to jak usterka dostarczania.
 *
 * Ta sama klasa co `smoke-wp-motyw` z 0.51.0, który zamykał sklep za sobą
 * zamiast przywrócić stan zastany: **„przywróć stan” to co innego niż
 * „wyczyść wszystko”.**
 *
 * CO SPRAWDZA — i dlaczego akurat to:
 *   1. ŻADEN plik bramki nie kasuje skrzynki hurtowo. Pytamy o ZACHOWANIE
 *      wynikające z cudzego API: `DELETE /api/v1/messages` bez listy `IDs`
 *      znaczy u Mailpita „skasuj wszystko”. Reguła nie pyta o nazwę funkcji
 *      ani o obecność słowa — ta pułapka wracała w tym repo sześć razy
 *      (0.29.0 nazwa metody, 0.44.0 nazwa stałej, 0.47.0, c6c9c97, dwa razy
 *      w P4);
 *   2. bramka, która SKŁADA ZAMÓWIENIA albo ZAKŁADA KONTA, wysyła pocztę —
 *      więc musi wziąć migawkę i po sobie posprzątać. Rozpoznajemy ją po
 *      wywołaniach cudzego interfejsu (`wc_create_order`, `payment_complete`,
 *      `woocommerce_created_customer`), a nie po nazwie pliku: nowy smoke
 *      dostanie regułę automatycznie;
 *   3. taka bramka ma rachunek sumienia poczty — porównanie stanu po
 *      przebiegu ze stanem sprzed. Bez niego sprzątanie jest deklaracją;
 *   4. i rachunek sumienia zapisów na kursy, liczonych GLOBALNIE. Kasowanie
 *      zamówienia NIE kasuje zapisu w Tutorze: tak powstał wpis #2153, który
 *      zawyżał licznik zapisanych na prawdziwy Kurs 1 przy zamówieniu #2152,
 *      dawno nieistniejącym. Sprzątanie po WŁASNYM kursie takiego zapisu nie
 *      widzi, bo on siedzi na cudzym;
 *   5-7. moduł `tools/smoke/poczta.mjs` sprawdzany URUCHOMIENIOWO, przez
 *      podstawiony `fetch` — bo to jego ZACHOWANIE chroni cudzą pocztę,
 *      a nie kształt jego kodu. Trzy niezmienniki: brak własnych wiadomości
 *      nie wysyła żądania kasującego (inaczej wyczyściłby skrzynkę), kasowane
 *      są wyłącznie identyfikatory spoza migawki, a niepełna migawka
 *      ZATRZYMUJE przebieg zamiast uznać cudze wiadomości za własne.
 *
 * Użycie: node tools/straznicy/straznik-higieny-smokow.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const KORZEN = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const KATALOG_SMOKE = join(KORZEN, "tools", "smoke");
const POSTAW = join(KORZEN, "wordpress", "srodowisko", "postaw.sh");

const bledy = [];

/** Treść pliku bez komentarzy — żeby opis pułapki nie udawał jej popełnienia. */
function kod(sciezka) {
  return readFileSync(sciezka, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*(\/\/|#).*$/gm, " ");
}

/* ── 1. nikt nie kasuje skrzynki hurtowo ─────────────────────────────── */

/*
 * Kasowanie hurtowe rozpoznajemy po SKUTKU w cudzym API: żądanie DELETE na
 * `/api/v1/messages`, któremu nie towarzyszy lista `IDs`. Sprawdzamy okno
 * wokół wywołania, bo ładunek bywa w następnej linii — i tak samo wygląda to
 * w JavaScripcie (`method: "DELETE"`) jak w powłoce (`curl -X DELETE`).
 */
const pliki = [
  ...readdirSync(KATALOG_SMOKE)
    .filter((f) => f.endsWith(".mjs") || f.endsWith(".ts"))
    .map((f) => join(KATALOG_SMOKE, f)),
  POSTAW,
];

for (const plik of pliki) {
  const tresc = kod(plik);
  for (const trafienie of tresc.matchAll(/api\/v1\/messages/g)) {
    const okno = tresc.slice(Math.max(0, trafienie.index - 260), trafienie.index + 260);
    if (!/DELETE/.test(okno)) continue;
    if (/\bIDs\b/.test(okno)) continue;
    bledy.push(
      `${plik.replace(KORZEN + "/", "")}: kasuje skrzynkę HURTOWO (DELETE /api/v1/messages bez listy IDs). ` +
        "W API Mailpita brak listy znaczy „skasuj wszystko”, więc bramka zabiera pocztę właścicielowi " +
        "(czwarte zgłoszenie z testu P6). Kasuj wyłącznie własne wiadomości — patrz tools/smoke/poczta.mjs."
    );
  }
}

/* ── 2-4. bramka wysyłająca pocztę sprząta i rozlicza się z tego ──────── */

/*
 * „Wysyła pocztę” poznajemy po tym, co bramka ROBI z cudzym kodem: składa
 * zamówienie, domyka płatność albo zakłada konto klienta. Każda z tych
 * czynności uruchamia maile WooCommerce lub naszą warstwę dostarczania.
 * Rozpoznanie po nazwie pliku byłoby ślepe na nowy smoke — a to jego właśnie
 * chcemy złapać, zanim dołoży kolejne 20 wiadomości do wspólnej skrzynki.
 */
const WYSYLA_POCZTE = /wc_create_order|payment_complete|woocommerce_created_customer|tutor_after_enrolled/;

for (const plik of pliki.filter((p) => p.endsWith(".mjs"))) {
  const tresc = kod(plik);
  const nazwa = plik.replace(KORZEN + "/", "");
  if (!WYSYLA_POCZTE.test(tresc)) continue;

  if (!/migawkaPoczty\s*\(/.test(tresc) || !/sprzatnijPoczte\s*\(/.test(tresc)) {
    bledy.push(
      `${nazwa}: składa zamówienia albo zakłada konta, czyli WYSYŁA pocztę, ale nie bierze migawki ` +
        "i nie sprząta po sobie. Zmierzone przed 0.54.0: takie bramki zostawiały 21 i 15 wiadomości na przebieg. " +
        "Użyj migawkaPoczty() na starcie i sprzatnijPoczte() w finally."
    );
  }

  /*
   * Rachunek sumienia poczty: pytamy o ZACHOWANIE, nie o nazwę zmiennej.
   * Pierwsza wersja tej reguły szukała napisu „poczty” w wywołaniu `sprawdz(`
   * — czyli wisiała na nazwie `pocztyPo` i przepuściłaby jej przemianowanie.
   * To siódmy nawrót tej samej pułapki w tym repo (0.29.0, 0.44.0, 0.47.0,
   * c6c9c97, dwa razy w P4), tym razem złapany we własnym kodzie.
   *
   * Zamiast tego: stan skrzynki musi być odczytany DWA RAZY (przed i po),
   * a drugi odczyt musi trafić do asercji — czyli w jego pobliżu stoi
   * wywołanie `sprawdz(`. Nazwa zmiennej jest wtedy bez znaczenia.
   */
  const odczyty = [...tresc.matchAll(/ilePoczty\s*\(/g)];
  const drugiWAsercji =
    odczyty.length >= 2 &&
    /sprawdz\s*\(/.test(tresc.slice(Math.max(0, odczyty[1].index - 400), odczyty[1].index + 400));
  if (!drugiWAsercji) {
    bledy.push(
      `${nazwa}: sprząta pocztę, ale nie ROZLICZA się z tego — stan skrzynki musi być odczytany przed ` +
        "przebiegiem i po nim, a druga wartość trafić do asercji. Bez porównania sprzątanie jest deklaracją: " +
        "tak samo wyglądałby smoke, który kasuje wszystko, i taki, który nie kasuje nic."
    );
  }

  // Zapisy na kursy liczone GLOBALNIE — sierota siedzi na CUDZYM kursie.
  const globalnieLiczoneZapisy = /post_type='tutor_enrolled'"\s*\)/.test(tresc.replace(/\s+/g, " "));
  if (!globalnieLiczoneZapisy) {
    bledy.push(
      `${nazwa}: nie liczy zapisów na kursy GLOBALNIE. Kasowanie zamówienia nie kasuje zapisu w Tutorze, ` +
        "a sprzątanie po własnym kursie nie widzi zapisu, który powstał na cudzym — tak przeżył wpis #2153, " +
        "zawyżając licznik zapisanych na prawdziwy Kurs 1."
    );
  }
}

/* ── 5-7. moduł poczty sprawdzony URUCHOMIENIOWO ──────────────────────── */

/*
 * Podstawiamy `fetch` i patrzymy, CO moduł robi — nie jak wygląda. Wzorzec na
 * kod tej klasy niezmiennika nie utrzyma: kasowanie skrzynki różni się od
 * kasowania własnych wiadomości JEDNYM polem w ładunku.
 */
{
  const oryginalny = globalThis.fetch;
  const zadania = [];
  /** Atrapa łapacza: `wiadomosci` to lista {ID}, `total` można zafałszować. */
  const atrapa = (wiadomosci, totalNaSile = null) => (adres, opcje = {}) => {
    zadania.push({ adres: String(adres), metoda: opcje.method ?? "GET", cialo: opcje.body ?? null });
    const url = String(adres);
    if (url.includes("/api/v1/messages") && (opcje.method ?? "GET") === "GET") {
      const start = Number(new URL(url).searchParams.get("start") ?? 0);
      return Promise.resolve({
        json: () =>
          Promise.resolve({
            total: totalNaSile ?? wiadomosci.length,
            messages: wiadomosci.slice(start, start + 200),
          }),
      });
    }
    return Promise.resolve({ json: () => Promise.resolve({}) });
  };

  // Import WZGLĘDNY, jak u pozostałych strażników: katalog projektu ma
  // w nazwie spację, a mieszanie ścieżki z adresem URL to klasa BLAD-014.
  const { migawkaPoczty, sprzatnijPoczte } = await import("../smoke/poczta.mjs");
  const kasujace = () => zadania.filter((z) => z.metoda === "DELETE");

  try {
    // 5. Brak własnych wiadomości → ŻADNEGO żądania kasującego.
    globalThis.fetch = atrapa([{ ID: "obca-1" }, { ID: "obca-2" }]);
    zadania.length = 0;
    const migawkaA = await migawkaPoczty();
    const skasowanoA = await sprzatnijPoczte(migawkaA);
    if (skasowanoA !== 0 || kasujace().length > 0) {
      bledy.push(
        "tools/smoke/poczta.mjs: sprzątanie przy BRAKU własnych wiadomości wysyła żądanie kasujące " +
          `(skasowano ${skasowanoA}, żądań DELETE: ${kasujace().length}). Pusta lista IDs znaczy u Mailpita ` +
          "„skasuj wszystko” — czyli bramka, która niczego nie wysłała, wyczyściłaby skrzynkę właściciela."
      );
    }

    // 6. Kasowane są WYŁĄCZNIE identyfikatory spoza migawki.
    globalThis.fetch = atrapa([{ ID: "obca-1" }, { ID: "obca-2" }]);
    const migawkaB = await migawkaPoczty();
    globalThis.fetch = atrapa([{ ID: "nasza-1" }, { ID: "obca-1" }, { ID: "obca-2" }, { ID: "nasza-2" }]);
    zadania.length = 0;
    const skasowanoB = await sprzatnijPoczte(migawkaB);
    const ladunek = kasujace().map((z) => z.cialo).join("");
    if (skasowanoB !== 2 || !ladunek.includes("nasza-1") || !ladunek.includes("nasza-2") || ladunek.includes("obca-")) {
      bledy.push(
        `tools/smoke/poczta.mjs: sprzątanie nie trzyma się migawki (skasowano ${skasowanoB}, ładunek: ${ladunek}). ` +
          "Ma kasować dokładnie wiadomości spoza migawki i nie dotykać ani jednej zastanej."
      );
    }

    // 7. Niepełna migawka ZATRZYMUJE przebieg — cudze wiadomości nie mogą
    //    zostać uznane za własne tylko dlatego, że lista się nie doczytała.
    globalThis.fetch = atrapa([{ ID: "obca-1" }], 99);
    let zatrzymalo = false;
    try {
      await migawkaPoczty();
    } catch {
      zatrzymalo = true;
    }
    if (!zatrzymalo) {
      bledy.push(
        "tools/smoke/poczta.mjs: NIEPEŁNA migawka przechodzi bez zatrzymania. Łapacz zadeklarował więcej " +
          "wiadomości, niż oddał — a każda niedoczytana staje się wtedy „naszą” i zostanie skasowana."
      );
    }
  } finally {
    globalThis.fetch = oryginalny;
  }
}

if (bledy.length > 0) {
  console.error("straznik-higieny-smokow:");
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}

console.log(
  "straznik-higieny-smokow: żadna bramka nie kasuje skrzynki hurtowo, bramki wysyłające pocztę biorą migawkę, " +
    "sprzątają i rozliczają się ze skrzynki oraz z zapisów na kursy, a moduł poczty (sprawdzony uruchomieniowo) " +
    "nie kasuje przy pustej liście, trzyma się migawki i zatrzymuje przebieg przy niepełnym odczycie."
);
