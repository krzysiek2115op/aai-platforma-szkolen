/**
 * Przelot kontrolny przed testem ręcznym CAŁOŚCI.
 *
 * NIE jest bramką CI ani częścią `npm run check` — to sonda, którą
 * przechodzę ścieżkę z `docs/TEST-RECZNY-CALOSC.md`, zanim oddam ją
 * właścicielowi. Lekcja Z1 z 0.51.0: usterka ŚRODOWISKA potrafi zmarnować
 * całą jego rundę i wyglądać przy tym jak błąd kodu.
 *
 * Sprząta po sobie: przywraca cenę, stan kursu i dziennik logowań.
 *
 * Użycie: node --env-file=.env tools/smoke/przelot-calosc.mjs
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { migawkaDziennika, sprzatnijDziennik, ileWpisow } from "./dziennik.mjs";

const ADRES = process.env.WP_ADRES ?? "http://127.0.0.1:8892";
const POCZTA = "http://127.0.0.1:8893";
const KONTENER = `${process.env.STACK_NAZWA ?? "aai_wp"}_cli`;

const bledy = [];
let n = 0;
const sprawdz = (warunek, opis) => {
  n += 1;
  if (!warunek) bledy.push(opis);
};

const wp = (...a) =>
  execFileSync("podman", ["exec", KONTENER, "wp", "--path=/var/www/html", ...a], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  })
    .split("\n")
    .filter((l) => !l.includes("level=error"))
    .join("\n")
    .trim();
const php = (kod) => wp("eval", kod);
const wartosc = (kod) => php(kod).split("\n").pop();

const HASLA = Object.fromEntries(
  readFileSync("wordpress/srodowisko/.env", "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => l.split("=").map((s) => s.trim()))
);

const dziennikPrzed = ileWpisow(php);
const migawka = migawkaDziennika(php);

function sesja() {
  const c = new Map();
  const zap = (o) => {
    for (const [nazwa, w] of o.headers) {
      if (nazwa.toLowerCase() !== "set-cookie") continue;
      for (const k of w.split(/,(?=[^;]+?=)/)) {
        const [p] = k.split(";");
        const r = p.indexOf("=");
        c.set(p.slice(0, r).trim(), p.slice(r + 1).trim());
      }
    }
  };
  const pobierz = async (adres, opcje = {}) => {
    const o = await fetch(adres.startsWith("http") ? adres : ADRES + adres, {
      ...opcje,
      redirect: "manual",
      headers: { ...(opcje.headers ?? {}), cookie: [...c].map(([k, v]) => `${k}=${v}`).join("; ") },
    });
    zap(o);
    return o;
  };
  return {
    pobierz,
    ciastka: c,
    async zaloguj(login, haslo) {
      await pobierz("/wp-login.php");
      await pobierz("/wp-login.php", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          log: login,
          pwd: haslo,
          "wp-submit": "Zaloguj",
          redirect_to: `${ADRES}/wp-admin/`,
          testcookie: "1",
        }).toString(),
      });
      return [...c.keys()].some((k) => k.startsWith("wordpress_logged_in"));
    },
  };
}
const tekst = (h) =>
  h
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

console.log("przelot kontrolny przed testem ręcznym CAŁOŚCI\n");

/* ── stan wyjściowy, którego wymaga scenariusz ─────────────────────── */

sprawdz(wartosc('echo get_option("aai_platnosci_sprzedaz_otwarta","BRAK");') === "tak", "sprzedaż nie jest otwarta — krok 6 scenariusza nie przejdzie");
sprawdz(wartosc('echo (int) count(get_users());') === "2", "kont jest inaczej niż dwa — scenariusz opisuje inny stan");
sprawdz(
  wartosc('global $wpdb; echo (int) $wpdb->get_var("SELECT COUNT(*) FROM wp_aai_sklep_lessons WHERE preview=1");') === "4",
  "zapowiedzi jest inaczej niż cztery — krok 4 opisuje inny stan"
);
sprawdz((await fetch(POCZTA)).status === 200, "łapacz poczty nie odpowiada — maile z kroków 9 i 11 nigdy nie dojdą");

const kursy = JSON.parse(
  wartosc(
    'global $wpdb; echo json_encode($wpdb->get_results("SELECT id,slug,title,price_grosze,status FROM wp_aai_sklep_courses ORDER BY slug", ARRAY_A));'
  )
);
sprawdz(kursy.length === 2 && kursy.every((k) => k.status === "published"), "kursy nie są dwa i opublikowane");

/* ── kroki 1–2: gość ───────────────────────────────────────────────── */

const gosc = sesja();
const katalog = await (await gosc.pobierz("/szkolenia/")).text();
for (const k of kursy) {
  sprawdz(katalog.includes(k.title), `krok 1: katalog nie pokazuje kursu „${k.title}”`);
}

for (const k of kursy) {
  const o = await gosc.pobierz(`/szkolenia/${k.slug}/`);
  const html = o.status === 200 ? await o.text() : "";
  sprawdz(o.status === 200, `krok 1: strona kursu ${k.slug} oddaje ${o.status}`);
  sprawdz(
    tekst(html).includes("zaksięgowaniu wpłaty"),
    `krok 3: strona ${k.slug} nie niesie nowego zdania o dostępie (C3)`
  );
  sprawdz(
    !/od razu po zakupie/i.test(tekst(html)),
    `krok 3: na stronie ${k.slug} została stara obietnica „od razu po zakupie”`
  );
  sprawdz(html.includes("/kasa/") || html.includes("add-to-cart"), `krok 6: strona ${k.slug} nie ma drogi do kasy`);
}

const lekcje = JSON.parse(
  wartosc(`global $wpdb;
    $r = $wpdb->get_results("SELECT l.id, l.preview, c.slug AS kurs FROM wp_aai_sklep_lessons l
      JOIN wp_aai_sklep_modules m ON m.id=l.module_id JOIN wp_aai_sklep_courses c ON c.id=m.course_id
      ORDER BY c.slug, m.position, l.position", ARRAY_A);
    $out = array();
    foreach ($r as $x) {
      $p = get_posts(["post_type"=>"lesson","post_status"=>"any","numberposts"=>1,"meta_key"=>"_aai_zrodlo_uuid","meta_value"=>$x["id"]]);
      if (!$p) continue;
      $out[] = array("kurs"=>$x["kurs"], "preview"=>(int)$x["preview"], "adres"=>get_permalink($p[0]->ID));
    }
    echo json_encode($out);`)
);
const zapowiedz = lekcje.find((l) => l.preview === 1);
const platna = lekcje.find((l) => l.preview === 0);

const trescZapowiedzi = tekst(await (await gosc.pobierz(zapowiedz.adres)).text());
sprawdz(trescZapowiedzi.includes("Czego się nauczysz"), "krok 4: gość NIE czyta darmowej zapowiedzi");
const trescPlatnej = await gosc.pobierz(platna.adres);
const htmlPlatnej = trescPlatnej.status === 200 ? await trescPlatnej.text() : "";
sprawdz(trescPlatnej.status === 200, `krok 5: płatna lekcja oddaje gościowi ${trescPlatnej.status} zamiast bramki`);
sprawdz(!tekst(htmlPlatnej).includes("Czego się nauczysz"), "krok 5: WYCIEK — gość widzi treść płatnej lekcji");

/* ── krok 6: przycisk prowadzi do kasy z produktem ─────────────────── */

const produkt = Number(
  wartosc(`global $wpdb; echo (int) $wpdb->get_var("SELECT product_id FROM " . Aai_Platnosci_Tabele::tabela("powiazania") . " LIMIT 1");`)
);
const koszyk = sesja();
await koszyk.pobierz(`/?add-to-cart=${produkt}`);
sprawdz(
  [...koszyk.ciastka.keys()].some((k) => k.startsWith("woocommerce_items_in_cart")),
  "krok 6: produkt kursu nie wchodzi do koszyka — ścieżka zakupu jest zamknięta"
);
/*
 * Kasę pytamy sesją, KTÓRA MA KOSZYK. Pusty koszyk daje 302 na sklep —
 * pierwsza wersja pytała nową sesją i raportowała awarię kasy, która
 * działa. Pomiar odpowiadał na inne pytanie, niż deklarował.
 */
sprawdz((await koszyk.pobierz("/kasa/")).status === 200, "krok 7: kasa z kursem w koszyku nie odpowiada 200");

/* ── kroki 7–8: ukrycie i usuwanie, na kursie klienta ──────────────── */

const klient = sesja();
sprawdz(await klient.zaloguj("klient-test", HASLA.WP_KLIENT_HASLO), "nie umiem zalogować się jako klient — reszta przelotu pytałaby gościa");

const kursKlienta = kursy.find((k) => k.slug === platna.kurs);
sprawdz(
  wartosc(`echo (int) tutor_utils()->is_enrolled( (int) Aai_Platnosci_Zapis::kurs_tutora('${kursKlienta.id}'), (int) get_user_by('login','klient-test')->ID ) ? 1 : 0;`) === "1",
  "klient-test nie jest zapisany na kurs próbki — kroki 7 i 8 mierzyłyby nie to"
);
sprawdz(
  tekst(await (await klient.pobierz(platna.adres)).text()).includes("Czego się nauczysz"),
  "krok 14: kupujący nie czyta płatnej lekcji"
);
const moje = await klient.pobierz("/szkolenia/moje/");
sprawdz(moje.status === 200, `krok 13: „Moje kursy” oddaje ${moje.status}`);

php(`Aai_Sklep_Zapis::ustaw_status('${kursKlienta.id}','archived','przelot-calosc');`);
try {
  sprawdz((await sesja().pobierz(`/szkolenia/${kursKlienta.slug}/`)).status === 404, "krok 20: ukryty kurs NIE znika ze sklepu");
  const poUkryciu = await klient.pobierz(platna.adres);
  sprawdz(
    poUkryciu.status === 200 && tekst(await poUkryciu.text()).includes("Czego się nauczysz"),
    `krok 22: KUPUJĄCY TRACI DOSTĘP po ukryciu (HTTP ${poUkryciu.status}) — to jest naprawa C1`
  );
  const zapowiedzKursu = lekcje.find((l) => l.preview === 1 && l.kurs === kursKlienta.slug);
  if (zapowiedzKursu) {
    sprawdz(
      !tekst(await (await sesja().pobierz(zapowiedzKursu.adres)).text()).includes("Czego się nauczysz"),
      "krok 21: zapowiedź ukrytego kursu została otwarta dla gościa"
    );
  }
} finally {
  php(`Aai_Sklep_Zapis::ustaw_status('${kursKlienta.id}','${kursKlienta.status}','przelot-calosc');`);
}
sprawdz(
  (await sesja().pobierz(`/szkolenia/${kursKlienta.slug}/`)).status === 200,
  "po przywróceniu kurs nie wrócił do sklepu — zostawiłbym środowisko w innym stanie, niż opisuje scenariusz"
);

const kupujacych = Number(wartosc(`echo (int) Aai_Sklep_Tutor::kupujacy('${kursKlienta.id}');`));
sprawdz(kupujacych > 0, "krok 26: kurs próbki nie ma kupujących — drugie pytanie w ogóle by nie padło");
const odmowa = php(
  `try { Aai_Sklep_Zapis::usun_kurs('${kursKlienta.id}', 'przelot-calosc', true, false); echo 'USUNIETO'; }
   catch ( Aai_Sklep_Blad_Zapisu $b ) { echo $b->getMessage(); }`
).split("\n").pop();
sprawdz(
  odmowa.includes(String(kupujacych)) && !odmowa.includes("USUNIETO"),
  `krok 26: usunięcie kursu z kupującymi nie odmawia liczbą — dostałem „${odmowa.slice(0, 80)}”`
);

/* ── kroki 9–10: monitoring, strona główna, 404 ────────────────────── */

const admin = sesja();
sprawdz(await admin.zaloguj("admin", HASLA.WP_ADMIN_HASLO), "nie umiem zalogować się jako admin");
const ekran = await admin.pobierz("/wp-admin/admin.php?page=aai-monitor");
const htmlEkranu = ekran.status === 200 ? await ekran.text() : "";
sprawdz(ekran.status === 200, `krok 28: ekran monitoringu oddaje ${ekran.status}`);
sprawdz(tekst(htmlEkranu).includes("Zbieramy:"), "krok 28: ekran monitoringu nie mówi, co zbiera");

sprawdz((await sesja().pobierz("/")).status === 200, "krok 31: strona główna nie odpowiada 200");
const brak = await sesja().pobierz("/nie-istnieje-na-pewno/");
const htmlBraku = await brak.text();
sprawdz(brak.status === 404, `krok 32: nieistniejący adres oddaje ${brak.status} zamiast 404`);
sprawdz(tekst(htmlBraku).length > 200, "krok 32: strona „nie znaleziono” jest pusta");

/* ── sprzątanie po sobie ───────────────────────────────────────────── */

sprzatnijDziennik(php, migawka);
sprawdz(
  ileWpisow(php) === dziennikPrzed,
  `przelot zostawił ślad w dzienniku logowań: przed ${dziennikPrzed}, po ${ileWpisow(php)}`
);

if (bledy.length > 0) {
  console.error(`\nprzelot: ${bledy.length} z ${n} sprawdzeń NIE przeszło:`);
  for (const b of bledy) console.error(`  ✖ ${b}`);
  process.exit(1);
}
console.log(`przelot: ${n} sprawdzeń zaliczonych — ścieżka ze scenariusza jest przechodnia.`);
