/**
 * Ile zapytań SQL kosztuje JEDNA odsłona — pomiar, nie szacunek.
 *
 * PO CO OSOBNE NARZĘDZIE. Do 2026-09-04 w tym repozytorium nie było ANI
 * JEDNEGO sposobu, żeby policzyć zapytania na odsłonę: `SAVEQUERIES` nie
 * padało nigdzie, a `get_num_queries()` nie było wołane w żadnym pliku.
 * Jedyna liczba tej klasy, jaką projekt zna — „menu kosztowało 90 zapytań
 * na odsłonę" (naprawione 2026-08-25) — powstała z pomiaru jednorazowego,
 * którego nikt nie zapisał, więc nie da się go ani powtórzyć, ani przenieść
 * na inną trasę. Liczba bez narzędzia starzeje się po cichu, a wyprowadzanie
 * jej z lektury kodu myliło się tu już o rząd wielkości.
 *
 * JAK MIERZY. Stawia w kontenerze WordPressa TYMCZASOWĄ wtyczkę pomiarową
 * (poza repozytorium — w wolumenie `wp_core`), odpytuje wskazane trasy
 * prawdziwym żądaniem HTTP i czyta z niej `get_num_queries()` po
 * `shutdown`. Na koniec wtyczkę kasuje i PRZYWRACA zastaną listę wtyczek
 * aktywnych, porównując ją co do znaku — „przywróć stan zastany" to co
 * innego niż „skasuj ustawienie" (lekcja z 0.54.0).
 *
 * DWIE RÓŻNE LICZBY, KTÓRYCH NIE WOLNO MYLIĆ. `$wpdb->num_queries` rośnie od
 * PIERWSZEGO zapytania żądania, niezależnie od jakichkolwiek stałych — dlatego
 * LICZNIK w tabeli jest pełny i dokładny. `SAVEQUERIES` daje dodatkowo TREŚĆ
 * zapytań (`--sql`) i wtyczka pomiarowa definiuje tę stałą sama: `wpdb` pyta
 * o nią przy KAŻDYM zapytaniu (WP 6.9, `class-wpdb.php:2352`), a nie raz przy
 * starcie, więc definicja z poziomu wtyczki działa — ale dopiero od momentu
 * jej załadowania. LISTA zapytań jest więc NIEPEŁNA (bez zapytań startu
 * rdzenia), a licznik pełny; pisze o tym również sam wydruk.
 *
 * CZEGO NIE ROBI. Niczego nie naprawia i nie ocenia — oddaje liczby.
 * Kod wyjścia 1 znaczy: nie udało się zmierzyć (środowisko nie stoi,
 * trasa nie odpowiada, pomiar nie zebrał ani jednego wiersza) albo
 * przekroczony `--sufit`.
 *
 * WYMAGA stojącego środowiska: `cd wordpress/srodowisko && ./postaw.sh`.
 *
 * Użycie:
 *   node tools/zapytania-wp.mjs                       # trasy domyślne, 3 przebiegi
 *   node tools/zapytania-wp.mjs --trasa=/szkolenia/   # tylko wskazane trasy
 *   node tools/zapytania-wp.mjs --powtorzenia=5 --json
 *   node tools/zapytania-wp.mjs --sql                 # + najczęściej powtarzane zapytania
 *   node tools/zapytania-wp.mjs --sufit=120           # kod 1, gdy któraś trasa przekracza
 */
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";

const STACK = process.env.STACK_NAZWA ?? "aai_wp";
const KONTENER_WP = `${STACK}_wordpress`;
const KONTENER_CLI = `${STACK}_cli`;
const PORT = process.env.WP_PORT ?? "8892";
const ADRES = `http://127.0.0.1:${PORT}`;

const KATALOG_WTYCZKI = "/var/www/html/wp-content/plugins/aai-pomiar-zapytan";
const PLIK_WTYCZKI = `${KATALOG_WTYCZKI}/aai-pomiar-zapytan.php`;
const DZIENNIK = "/tmp/aai-zapytania.jsonl";
const NAGLOWEK = "X-Aai-Pomiar-Zapytan";

/* ---------- argumenty ---------- */

const argv = process.argv.slice(2);
const flaga = (nazwa) => argv.includes(`--${nazwa}`);
const wartosc = (nazwa, domyslna) => {
  const a = argv.find((x) => x.startsWith(`--${nazwa}=`));
  return a === undefined ? domyslna : a.slice(nazwa.length + 3);
};
const trasyZArgumentow = argv.filter((a) => a.startsWith("--trasa=")).map((a) => a.slice(8));
const POWTORZENIA = Number.parseInt(wartosc("powtorzenia", "3"), 10);
const SUFIT = wartosc("sufit", null) === null ? null : Number.parseInt(wartosc("sufit", "0"), 10);
const JAKO_JSON = flaga("json");
const ZE_SQL = flaga("sql");

if (!Number.isInteger(POWTORZENIA) || POWTORZENIA < 1) {
  console.error("zapytania-wp: --powtorzenia musi być liczbą ≥ 1.");
  process.exit(1);
}

/* ---------- kontener ---------- */

function podman(argumenty, wejscie) {
  return execFileSync("podman", argumenty, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    input: wejscie,
    // STDERR podmana niesie na tej maszynie stały komunikat o sterowniku
    // grafu („overlay overwritten by btrfs"), który nie jest błędem —
    // przepuszczamy go dalej zamiast mieszać z wynikiem pomiaru.
    stdio: [wejscie === undefined ? "ignore" : "pipe", "pipe", "inherit"],
  });
}

const wp = (...a) => podman(["exec", KONTENER_CLI, "wp", "--path=/var/www/html", ...a]).trim();
const wWordpressie = (...a) => podman(["exec", KONTENER_WP, ...a]);

function srodowiskoStoi() {
  try {
    wp("core", "version");
    return true;
  } catch {
    return false;
  }
}

/* ---------- tymczasowa wtyczka pomiarowa ---------- */

const zrodloWtyczki = (znacznik) => `<?php
/**
 * Plugin Name: Automatic AI — pomiar zapytań (TYMCZASOWA)
 * Description: Stawia ją i kasuje tools/zapytania-wp.mjs. Jeśli widzisz ją na liście, pomiar został przerwany — można ją bezpiecznie wyłączyć i skasować.
 * Version: 1.0.0
 */
defined( 'ABSPATH' ) || exit;

/* Mierzymy WYŁĄCZNIE żądania oznaczone naszym nagłówkiem z jednorazowym
   znacznikiem przebiegu. Bez tego pomiar dopisywałby wiersze do cudzych
   żądań (w tym do bramek innych sesji) i mieszał je z własnymi. */
if ( ( $_SERVER['HTTP_X_AAI_POMIAR_ZAPYTAN'] ?? '' ) !== '${znacznik}' ) {
	return;
}

${ZE_SQL ? `/* Nagrywanie TRESCI zapytan. wpdb (WP 6.9, class-wpdb.php:2352 i :2362)
   pyta o stałą SAVEQUERIES przy KAŻDYM zapytaniu, a nie raz w konstruktorze —
   dlatego wolno ją zdefiniować tutaj i dlatego działa to tylko na żądaniach
   oznaczonych naszym nagłówkiem. Zapytania sprzed załadowania wtyczek nie
   wejdą na tę listę; LICZNIK niżej jest mimo to pełny. */
if ( ! defined( 'SAVEQUERIES' ) ) {
	define( 'SAVEQUERIES', true );
}` : ""}

add_action(
	'shutdown',
	static function () {
		$wiersz = array(
			'znacznik' => '${znacznik}',
			'trasa'    => (string) ( $_SERVER['REQUEST_URI'] ?? '' ),
			'zapytan'  => get_num_queries(),
		);
${ZE_SQL ? `		$sql = array();
		foreach ( (array) ( $GLOBALS['wpdb']->queries ?? array() ) as $q ) {
			$sql[] = preg_replace( '/\\s+/', ' ', trim( (string) $q[0] ) );
		}
		$wiersz['sql'] = $sql;` : ""}
		@file_put_contents( '${DZIENNIK}', wp_json_encode( $wiersz ) . "\\n", FILE_APPEND );
	},
	PHP_INT_MAX
);
`;

function postawWtyczke(znacznik) {
  wWordpressie("mkdir", "-p", KATALOG_WTYCZKI);
  podman(["exec", "-i", KONTENER_WP, "sh", "-c", `cat > ${PLIK_WTYCZKI}`], zrodloWtyczki(znacznik));
  wWordpressie("sh", "-c", `: > ${DZIENNIK}; chmod 666 ${DZIENNIK}`);
  wp("plugin", "activate", "aai-pomiar-zapytan");
}

function sprzatnij(zastaneWtyczki) {
  try {
    wp("plugin", "deactivate", "aai-pomiar-zapytan");
  } catch { /* mogła się nie zdążyć włączyć */ }
  try {
    wWordpressie("rm", "-rf", KATALOG_WTYCZKI);
    wWordpressie("rm", "-f", DZIENNIK);
  } catch { /* kontener mógł zniknąć w trakcie */ }

  /* RACHUNEK SUMIENIA — ale bez kasowania cudzej pracy. Środowisko `:8892`
     jest WSPÓLNE: między migawką a sprzątaniem ktoś inny może włączyć albo
     wyłączyć swoją wtyczkę, więc przywracanie CAŁEJ listy zastanej zdeptałoby
     jego zmianę (klasa „bramka sprzątająca CUDZE dane"). Kasujemy więc
     wyłącznie WŁASNY wpis, a różnicę na pozostałych tylko MELDUJEMY. */
  try {
    const teraz = wp("option", "get", "active_plugins", "--format=json");
    const surowe = JSON.parse(teraz);
    /* `deactivate_plugins()` w WordPressie robi `array_diff` ZACHOWUJĄC klucze,
       a `activate_plugin()` przedtem SORTUJE listę — więc po naszej wtyczce
       zostaje DZIURA w indeksach i opcja przestaje być tablicą (json_encode
       oddaje wtedy obiekt `{"0":…,"1":…,"3":…}`). To nie jest ten sam stan,
       który zastaliśmy, choć na liście wtyczek wygląda identycznie. */
    const cudze = Object.values(surowe).filter((w) => !String(w).includes("aai-pomiar-zapytan"));
    const zostalNasz = Object.values(surowe).length !== cudze.length;

    if (zostalNasz || !Array.isArray(surowe)) {
      podman(
        ["exec", "-i", KONTENER_CLI, "wp", "--path=/var/www/html", "option", "update", "active_plugins", "--format=json"],
        JSON.stringify(cudze),
      );
    }

    const przed = Object.values(JSON.parse(zastaneWtyczki)).sort().join(",");
    const po = [...cudze].sort().join(",");
    if (przed !== po) {
      console.error(
        `zapytania-wp: lista wtyczek aktywnych zmieniła się w trakcie pomiaru (przed: ${przed || "—"}; po: ${po || "—"}). ` +
          "NIE przywracam jej — to nie jest moja zmiana. Sprawdź, czy pomiar mierzył to, co miał mierzyć.",
      );
    }
  } catch { /* nie mamy jak sprawdzić — komunikat niżej i tak to powie */ }
}

/* ---------- trasy ---------- */

function trasyDomyslne() {
  const slug = wp(
    "eval",
    `global $wpdb; $t = $wpdb->prefix . 'aai_sklep_courses';
     $s = $wpdb->get_var( "SELECT slug FROM {$t} WHERE status = 'published' ORDER BY id ASC LIMIT 1" );
     echo (string) $s;`,
  ).trim();
  const trasy = ["/", "/szkolenia/"];
  if (slug !== "") trasy.push(`/szkolenia/${slug}/`);
  trasy.push("/koszyk/", "/kasa/");
  return trasy;
}

/* ---------- pomiar ---------- */

async function odpytaj(trasa, znacznik) {
  const odp = await fetch(`${ADRES}${trasa}`, {
    headers: { [NAGLOWEK]: znacznik, "Cache-Control": "no-cache" },
    redirect: "manual",
  });
  const cialo = await odp.arrayBuffer();
  return { status: odp.status, bajtow: cialo.byteLength };
}

function odczytajDziennik(znacznik) {
  const tekst = wWordpressie("sh", "-c", `cat ${DZIENNIK} 2>/dev/null || true`);
  return tekst
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => JSON.parse(l))
    .filter((w) => w.znacznik === znacznik);
}

const mediana = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

async function main() {
  if (!srodowiskoStoi()) {
    console.error(
      `zapytania-wp: nie widzę środowiska (${KONTENER_CLI}). Postaw je: cd wordpress/srodowisko && ./postaw.sh`,
    );
    process.exit(1);
  }

  const znacznik = randomBytes(8).toString("hex");
  const zastaneWtyczki = wp("option", "get", "active_plugins", "--format=json");
  const trasy = trasyZArgumentow.length > 0 ? trasyZArgumentow : trasyDomyslne();

  const wyniki = [];
  try {
    postawWtyczke(znacznik);

    for (const trasa of trasy) {
      const pomiary = [];
      let status = 0;
      let bajtow = 0;
      for (let i = 0; i < POWTORZENIA; i += 1) {
        const przed = odczytajDziennik(znacznik).length;
        const odp = await odpytaj(trasa, znacznik);
        status = odp.status;
        bajtow = odp.bajtow;
        const wiersze = odczytajDziennik(znacznik);
        /* Bierzemy wyłącznie wiersz TEGO żądania — pozycja w dzienniku,
           nie dopasowanie po trasie: przekierowanie zmienia REQUEST_URI. */
        const nowe = wiersze.slice(przed);
        if (nowe.length > 0) pomiary.push(nowe[nowe.length - 1]);
      }
      wyniki.push({ trasa, status, bajtow, pomiary });
    }
  } finally {
    sprzatnij(zastaneWtyczki);
  }

  /* SAMOKONTROLA ZAKRESU. Pomiar, który nie zebrał ani jednego wiersza,
     wypisałby same kreski i wyglądał na udany — ta klasa ślepoty kosztowała
     ten projekt kilka bramek. Milczenie jest tu błędem, nie wynikiem. */
  const zebrane = wyniki.reduce((n, w) => n + w.pomiary.length, 0);
  if (zebrane === 0) {
    console.error(
      "zapytania-wp: pomiar nie zebrał ANI JEDNEGO wiersza — wtyczka pomiarowa nie doszła do skutku " +
        "(sprawdź, czy trasy odpowiadają i czy kontener widzi katalog wtyczek). Wynik byłby przejściem po pustce.",
    );
    process.exit(1);
  }

  const tabela = wyniki.map((w) => {
    const liczby = w.pomiary.map((p) => p.zapytan);
    return {
      trasa: w.trasa,
      status: w.status,
      kB: Math.round(w.bajtow / 102.4) / 10,
      przebiegi: liczby,
      zapytan: liczby.length > 0 ? mediana(liczby) : null,
    };
  });

  if (JAKO_JSON) {
    console.log(JSON.stringify({ adres: ADRES, powtorzenia: POWTORZENIA, trasy: tabela }, null, 2));
  } else {
    console.log(`zapytania-wp: ${ADRES}, ${POWTORZENIA} przebieg(i) na trasę, wartość = mediana\n`);
    const szer = Math.max(...tabela.map((w) => w.trasa.length), 6);
    console.log(`${"trasa".padEnd(szer)}  HTTP  zapytań  kB     przebiegi`);
    for (const w of tabela) {
      console.log(
        `${w.trasa.padEnd(szer)}  ${String(w.status).padStart(4)}  ` +
          `${String(w.zapytan ?? "—").padStart(7)}  ${String(w.kB).padStart(5)}  ${w.przebiegi.join(" ")}`,
      );
    }
    if (ZE_SQL) {
      console.log("\nNajczęściej powtarzane zapytania (lista NIEPEŁNA — patrz nagłówek pliku):");
      let cokolwiek = false;
      for (const w of wyniki) {
        const ostatni = w.pomiary[w.pomiary.length - 1];
        if (!ostatni?.sql) continue;
        const licznik = new Map();
        for (const q of ostatni.sql) {
          const klucz = q.slice(0, 90);
          licznik.set(klucz, (licznik.get(klucz) ?? 0) + 1);
        }
        const top = [...licznik.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).filter(([, n]) => n > 1);
        if (top.length === 0) continue;
        cokolwiek = true;
        console.log(`\n  ${w.trasa}`);
        for (const [q, n] of top) console.log(`    ${String(n).padStart(3)}×  ${q}`);
      }
      /* Pusta sekcja wyglądałaby jak „nic się nie powtarza", a znaczy też
         „nic nie nagrano" — dwie różne rzeczy, więc mówimy to wprost. */
      if (!cokolwiek) {
        console.log("  (nic — żadne zapytanie nie powtórzyło się albo nic nie zostało nagrane)");
      }
    }
  }

  if (SUFIT !== null) {
    const ponad = tabela.filter((w) => (w.zapytan ?? 0) > SUFIT);
    if (ponad.length > 0) {
      console.error(
        `\nzapytania-wp: sufit ${SUFIT} przekroczony na ${ponad.length} trasach: ` +
          ponad.map((w) => `${w.trasa} (${w.zapytan})`).join(", "),
      );
      process.exit(1);
    }
  }
}

await main();
