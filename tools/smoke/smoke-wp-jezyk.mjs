/**
 * Smoke języka na ścieżce klienta — czy klient płaci po polsku.
 *
 * PO CO ISTNIEJE.
 *
 * BLAD-024 ze zgłoszenia właściciela: „sekcja po polsku powinna być".
 * Sklep mówił do klienta w DWÓCH JĘZYKACH naraz — nasze szablony po
 * polsku, wszystko cudze po angielsku: „Order summary", „Billing
 * address", „Place Order", „Proceed to Checkout", a po naszym polskim
 * mailu „Ustaw hasło" klient trafiał na ekran „Enter a new password
 * below. … Save". To był PIERWSZY krok po zakupie.
 *
 * Żadna bramka tego nie widziała, bo wszystkie mierzyły mechanizmy —
 * statusy, ceny, powiązania, nagłówki. Ten smoke mierzy to, co klient
 * CZYTA, i tylko to.
 *
 * DLACZEGO PO NASZEJ STRONIE, SKORO JĘZYK USTAWIA INSTALACJA.
 *
 * Locale to sprawa instalacji, nie wtyczki (decyzja właściciela
 * 2026-08-29) — `postaw.sh` robi dokładnie to, co zrobi wdrożenie.
 * Ale skutek dotyka NASZEGO klienta, a rozjazd jest cichy: wystarczy
 * aktualizacja Woo z nowym napisem bez tłumaczenia albo instalacja
 * postawiona bez pliku `.mo` i strona wraca do angielskiego, nic się
 * przy tym nie zapala. Dlatego gwarancją nie jest ustawienie, tylko
 * ten pomiar.
 *
 * CZEGO NIE SPRAWDZA.
 *
 * Nie tłumaczy niczego sam i nie ocenia jakości tłumaczeń — pyta tylko,
 * czy na ścieżce klienta został angielski napis Z LISTY zmierzonej
 * przed naprawą (BLEDY-Z-TESTU-P4.md §5.5). Lista jest zamknięta
 * świadomie: wzorzec „cokolwiek angielskiego" dawałby fałszywe alarmy
 * na markach („Automatic AI", „STATUS · ONLINE" ze stopki motywu)
 * i na słowach identycznych w obu językach.
 *
 * WYMAGA lokalnego środowiska (`wordpress/srodowisko/postaw.sh`), konta
 * `klient-test` (`npm run wp:klient`) i riga z puppeteer-core — poza CI,
 * tam nie ma ani podmana, ani przeglądarki.
 *
 *   mkdir -p /tmp/rig && cd /tmp/rig && npm init -y && npm i puppeteer-core
 *   export ZRZUTY_RIG=/tmp/rig
 *   node tools/smoke/smoke-wp-jezyk.mjs
 */
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { migawkaDziennika, sprzatnijDziennik, ileWpisow } from "./dziennik.mjs";

const RIG = process.env.ZRZUTY_RIG;
if (!RIG) {
  console.error(
    "smoke-wp-jezyk: ustaw ZRZUTY_RIG na katalog z zainstalowanym `puppeteer-core`.\n" +
      "  mkdir -p /tmp/rig && cd /tmp/rig && npm init -y && npm i puppeteer-core"
  );
  process.exit(1);
}
const puppeteer = createRequire(`${RIG}/`)("puppeteer-core");

const ADRES = process.env.WP_ADRES ?? "http://127.0.0.1:8892";
const PRZEGLADARKA = process.env.FIREFOX ?? "/usr/bin/firefox";
const KONTENER = `${process.env.STACK_NAZWA ?? "aai_wp"}_cli`;

const bledy = [];
let sprawdzen = 0;
function sprawdz(warunek, opis) {
  sprawdzen += 1;
  if (!warunek) bledy.push(opis);
}

function wp(...argumenty) {
  return execFileSync("podman", ["exec", KONTENER, "wp", "--path=/var/www/html", ...argumenty], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

/*
 * HIGIENA DZIENNIKA LOGOWAŃ (N13). Ta bramka loguje się do instalacji,
 * więc od kroku T2 KAŻDY jej przebieg zostawia wpisy w dzienniku
 * Pluginu 3 — zmierzone. Bez sprzątania licznik nieudanych prób
 * z 7 dni, czyli jedyna funkcja alarmowa ekranu monitoringu, pokazywałby
 * serie wyprodukowane przez nasze własne testy.
 */
const _dziennikPrzed = ileWpisow((k) => wp("eval", k));
const _dziennikMigawka = migawkaDziennika((k) => wp("eval", k));

/** Hasło konta testowego — z pliku środowiska, nigdy z kodu. */
function hasloKlienta() {
  const env = readFileSync(new URL("../../wordpress/srodowisko/.env", import.meta.url), "utf8");
  const m = env.match(/^WP_KLIENT_HASLO=(.*)$/m);
  return m ? m[1].trim() : "";
}

/*
 * FRAZY ZMIERZONE PRZED NAPRAWĄ (BLEDY-Z-TESTU-P4.md §5.5).
 *
 * Każda z nich stała na ścieżce klienta 2026-08-29. Lista rośnie tylko
 * o rzeczy REALNIE zobaczone — nie o wymyślone, bo wtedy nikt nie wie,
 * czy wpis jest martwy.
 *
 * Świadomie NIE ma tu słowa „Status": po polsku brzmi tak samo, więc
 * pytanie o nie mierzyłoby szum. Tak samo „Automatic AI" i „STATUS ·
 * ONLINE" ze stopki motywu — to marka, nie angielszczyzna.
 */
const FRAZY = [
  "Order summary", "Contact information", "Billing address", "Payment options", "Add coupons",
  "Place Order", "Add a note to your order", "has been added to your cart", "View cart",
  "Total price for", "Products in cart", "CART TOTALS", "Estimated total", "Proceed to Checkout",
  "Username or email", "Remember me", "Lost your password", "Log in",
  "From your account dashboard", "Account details", "Log out", "Confirm email address",
  "Enter a new password", "New password", "Re-enter new password",
  "Country/Region", "Postal code", "Email address", "First name", "Last name", "Display name",
  "Password change", "Save changes", "You cannot add another", "no payment methods available",
];

const przegladarka = await puppeteer.launch({
  browser: "firefox",
  executablePath: PRZEGLADARKA,
  protocol: "webDriverBiDi",
  headless: true,
});
const karta = await przegladarka.newPage();
await karta.setViewport({ width: 1280, height: 1000 });

/** Widoczny tekst strony po ustaniu doładowań bloków Woo. */
async function tekst(sciezka) {
  await karta.goto(`${ADRES}${sciezka}`, { waitUntil: "networkidle0", timeout: 45000 });
  await new Promise((r) => setTimeout(r, 2500));
  return karta.evaluate(() => document.body.innerText.replace(/\s+/g, " "));
}

/**
 * Jedna strona ścieżki klienta.
 *
 * ASERCJA ZAKRESU (lekcja z `smoke-wp-motyw`, 0.45.0): najpierw pytamy,
 * czy w ogóle mierzymy TĘ stronę. Bez tego pomiar strony, która oddała
 * odmowę albo pustkę, przechodziłby PO PUSTCE — i cztery sprawdzenia
 * meldowałyby porządek, nie dotknąwszy niczego.
 */
async function zmierz(sciezka, opis, kotwica) {
  const t = await tekst(sciezka);
  sprawdz(
    t.includes(kotwica),
    `${opis} (${sciezka}): nie widzę na niej „${kotwica}" — pomiar leciałby po pustce albo po stronie odmowy, a nie po tym, co czyta klient`
  );
  const znalezione = FRAZY.filter((f) =>
    new RegExp(`(^|[^\\p{L}])${f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\p{L}]|$)`, "u").test(t)
  );
  sprawdz(
    znalezione.length === 0,
    `${opis} (${sciezka}): klient czyta po angielsku — ${znalezione.join(" · ")} (BLAD-024)`
  );
}

let sprzedazPrzed = "";
try {
  /* Sprzedaż musi być otwarta, inaczej kasa nie ma czego pokazać. */
  sprzedazPrzed = wp("option", "get", "aai_platnosci_sprzedaz_otwarta").trim();
  if ("tak" !== sprzedazPrzed) wp("aai-platnosci", "sprzedaz", "otworz");

  const kurs = wp(
    "eval",
    "$k = Aai_Sklep_Odczyt::lista_kursow(); foreach ( $k as $x ) { if ( (int) $x['price_grosze'] > 0 ) { echo $x['slug']; break; } }"
  ).trim();
  sprawdz(kurs !== "", "brak płatnego kursu — nie ma czego włożyć do koszyka, cały pomiar byłby ślepy");

  const produkt = wp("eval", `echo (int) Aai_Platnosci_Zapis::produkt_kursu( Aai_Sklep_Odczyt::szczegoly_kursu( '${kurs}' )['id'] );`).trim();

  /* ── 1. ścieżka zakupu (gość) ─────────────────────────────────────── */
  await zmierz(`/kasa/?add-to-cart=${produkt}`, "KASA", "Automatic AI");
  await zmierz("/koszyk/", "KOSZYK", "Automatic AI");
  await zmierz("/my-account/", "LOGOWANIE", "Automatic AI");
  await zmierz("/my-account/lost-password/", "ODZYSKIWANIE HASŁA", "Automatic AI");

  /* ── 2. ekran z NASZEGO maila „Ustaw hasło" ───────────────────────── */

  /*
   * NAJWAŻNIEJSZY POMIAR TEGO SMOKE'A. Nasz mail 1 jest polski i premium,
   * a prowadził na angielski ekran WordPressa — pierwszy krok klienta po
   * zakupie. Klucz generujemy tak samo, jak robi to warstwa maili.
   */
  const login = wp("eval", "$u = get_users( array( 'role' => 'customer', 'number' => 1 ) ); echo $u ? $u[0]->user_login : '';").trim();
  if (login !== "") {
    const klucz = wp("eval", `$u = get_user_by( 'login', '${login}' ); echo get_password_reset_key( $u );`).trim();
    await zmierz(
      `/my-account/lost-password/?action=newaccount&key=${klucz}&login=${encodeURIComponent(login)}`,
      "USTAWIANIE HASŁA Z MAILA",
      "Automatic AI"
    );
  } else {
    sprawdz(false, "brak konta klienta — nie da się zmierzyć ekranu z maila o ustawianiu hasła, czyli pierwszego kroku po zakupie");
  }

  /* ── 3. konto po zalogowaniu ──────────────────────────────────────── */
  const haslo = hasloKlienta();
  const maKonto = wp("eval", "echo get_user_by( 'login', 'klient-test' ) ? '1' : '';").trim() === "1";
  sprawdz(
    maKonto && haslo !== "",
    "brak konta `klient-test` albo hasła w środowisku — połowa ścieżki (konto, zamówienia, edycja danych) zostałaby niezmierzona; uruchom `npm run wp:klient`"
  );
  if (maKonto && haslo !== "") {
    await karta.goto(`${ADRES}/my-account/`, { waitUntil: "networkidle0", timeout: 45000 });
    await karta.type("#username", "klient-test");
    await karta.type("#password", haslo);
    await Promise.all([
      karta.waitForNavigation({ waitUntil: "networkidle0", timeout: 45000 }),
      karta.click("button[name=login]"),
    ]);
    await zmierz("/my-account/", "KONTO", "Automatic AI");
    await zmierz("/my-account/orders/", "ZAMÓWIENIA", "Automatic AI");
    await zmierz("/my-account/edit-account/", "EDYCJA KONTA", "Automatic AI");
    await zmierz("/szkolenia/moje/", "MOJE KURSY", "Automatic AI");
  }

  /* ── 4. maile, które dostaje klient ───────────────────────────────── */

  /*
   * Tematy maili Woo czytamy z SAMEGO Woo, nie ze skrzynki: skrzynka
   * niesie tylko to, co ktoś wcześniej wysłał, więc pomiar po niej
   * przechodziłby po pustce na świeżej instalacji.
   */
  for (const [id, angielski] of [
    ["customer_on_hold_order", "order has been received"],
    ["customer_completed_order", "is on its way"],
  ]) {
    const temat = wp(
      "eval",
      `$m = WC()->mailer(); foreach ( $m->emails as $e ) { if ( $e->id === '${id}' ) { echo $e->get_subject(); break; } }`
    ).trim();
    sprawdz(temat !== "", `mail Woo „${id}" nie istnieje — pomiar tematu byłby ślepy`);
    sprawdz(
      temat === "" || !temat.toLowerCase().includes(angielski),
      `mail Woo „${id}" idzie do klienta po angielsku: „${temat}" (BLAD-024)`
    );
  }
} finally {
  await przegladarka.close();
  if ("tak" !== sprzedazPrzed) {
    try {
      wp("aai-platnosci", "sprzedaz", "zamknij");
    } catch {
      /* stan i tak sprawdza kontrola */
    }
  }
}

if (bledy.length > 0) {
  console.error(`smoke-wp-jezyk: ${bledy.length} z ${sprawdzen} sprawdzeń padło:`);
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}
/* Sprzątanie po sobie: wyłącznie wiersze powstałe PO starcie tej bramki. */
sprzatnijDziennik((k) => wp("eval", k), _dziennikMigawka);
sprawdz(
  ileWpisow((k) => wp("eval", k)) === _dziennikPrzed,
  `bramka zostawiła ślad w dzienniku logowań: przed ${_dziennikPrzed}, po ${ileWpisow((k) => wp("eval", k))} wpisów (N13)`
);

console.log(`smoke-wp-jezyk: OK (${sprawdzen} sprawdzeń — ścieżka klienta w całości po polsku).`);
