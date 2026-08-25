/**
 * Smoke widoku lekcji (krok W5) — na ŻYWEJ instalacji.
 *
 * PYTANIA, NA KTÓRE ODPOWIADA:
 *   1. czy klient bez dostępu NIE WIDZI ani zdania prozy (materiał jest
 *      towarem — to jest pytanie najważniejsze),
 *   2. czy zalogowany właściciel widzi CAŁĄ lekcję: pierwszy i ostatni
 *      akapit zgodne z bazą, komplet sekcji, obrazy, które naprawdę się
 *      wczytują,
 *   3. czy WSZYSTKIE 73 lekcje składają się bez zatrzymania renderera
 *      (asercja surowego Markdownu) — jedna nieznana konstrukcja psuje
 *      dokładnie jedną lekcję i nikt się o tym nie dowie,
 *   4. czy nawigacja i program prowadzą tam, gdzie mówią,
 *   5. czy strona nie ładuje CSS-u Tutora i ma `noindex`.
 *
 * TREŚĆ SPRAWDZAMY W HTML-u BEZ `<script>` — inaczej test przechodzi na
 * danych strukturalnych, których klient nie widzi (dziura złapana w W3).
 *
 * WYMAGA lokalnego środowiska: `cd wordpress/srodowisko && ./postaw.sh`.
 * Nie wchodzi do `npm run smoke` ani do CI — CI nie ma podmana.
 *
 * Użycie: node tools/smoke/smoke-wp-lekcja.mjs
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const ADRES = process.env.WP_ADRES ?? "http://127.0.0.1:8892";
const STACK = process.env.STACK_NAZWA ?? "aai_wp";
const KONTENER = `${STACK}_cli`;

const bledy = [];
let sprawdzen = 0;
const sprawdz = (warunek, opis) => {
  sprawdzen += 1;
  if (!warunek) bledy.push(opis);
};

function wp(...argumenty) {
  return execFileSync("podman", ["exec", KONTENER, "wp", "--path=/var/www/html", ...argumenty], {
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

const HASLO = Object.fromEntries(
  readFileSync("wordpress/srodowisko/.env", "utf8")
    .split("\n")
    .filter(Boolean)
    .map((linia) => linia.split("=").map((s) => s.trim()))
).WP_ADMIN_HASLO;

/** Osobna sesja = osobny słoik ciastek. Inaczej „gość" byłby administratorem. */
function sesja() {
  const ciastka = new Map();
  const zapamietaj = (odpowiedz) => {
    for (const [nazwa, wartosc] of odpowiedz.headers) {
      if (nazwa.toLowerCase() !== "set-cookie") continue;
      for (const kawalek of wartosc.split(/,(?=[^;]+?=)/)) {
        const [para] = kawalek.split(";");
        const rowna = para.indexOf("=");
        ciastka.set(para.slice(0, rowna).trim(), para.slice(rowna + 1).trim());
      }
    }
  };
  const pobierz = async (adres, opcje = {}) => {
    const odpowiedz = await fetch(adres.startsWith("http") ? adres : ADRES + adres, {
      ...opcje,
      redirect: "manual",
      headers: { ...(opcje.headers ?? {}), cookie: [...ciastka].map(([k, v]) => `${k}=${v}`).join("; ") },
    });
    zapamietaj(odpowiedz);
    return odpowiedz;
  };
  return {
    pobierz,
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
      return [...ciastka.keys()].some((k) => k.startsWith("wordpress_logged_in"));
    },
  };
}

/** HTML bez `<script>` — do pytań „czy klient to widzi". */
const widoczne = (html) => html.replace(/<script[\s\S]*?<\/script>/gi, "");

const odKodu = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ");

const tekst = (html) => odKodu(widoczne(html).replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

console.log("smoke-wp-lekcja: widok lekcji na żywej instalacji\n");

/* ————————————————— stan z bazy ————————————————— */

const lekcje = JSON.parse(
  wp(
    "eval",
    `
    $typy = Aai_Sklep_Tutor::typy();
    $wynik = array();
    foreach ( get_posts(["post_type"=>$typy["lekcja"],"post_status"=>"any","numberposts"=>-1]) as $p ) {
      $uuid = (string) get_post_meta($p->ID, "_aai_zrodlo_uuid", true);
      if ("" === $uuid) continue;
      $wynik[] = array("uuid"=>$uuid, "id"=>$p->ID, "adres"=>get_permalink($p), "tytul"=>$p->post_title);
    }
    echo json_encode($wynik);
  `
  )
    .trim()
    .split("\n")
    .pop()
);

sprawdz(lekcje.length === 73, `w Tutorze ma być 73 lekcje, jest ${lekcje.length}`);

/** Treść lekcji z NASZYCH tabel. */
function trescZBazy(uuid) {
  return JSON.parse(
    wp("eval", `global $wpdb; $t = $wpdb->prefix . "aai_sklep_lessons";
      $w = $wpdb->get_row($wpdb->prepare("SELECT title, content, duration_min FROM \`$t\` WHERE id = %s", "${uuid}"), ARRAY_A);
      echo json_encode($w);`)
      .trim()
      .split("\n")
      .pop()
  );
}

/* ————————————————— 1. gość nie widzi materiału ————————————————— */

const probka = lekcje.find((l) => l.tytul.includes("Instalacja")) ?? lekcje[0];
const zBazy = trescZBazy(probka.uuid);

const gosc = sesja();
const odpowiedzGoscia = await gosc.pobierz(probka.adres);
const htmlGoscia = await odpowiedzGoscia.text();

sprawdz(odpowiedzGoscia.status === 200, `gość dostał ${odpowiedzGoscia.status} zamiast 200`);
sprawdz(
  !tekst(htmlGoscia).includes("Czego się nauczysz"),
  "GOŚĆ WIDZI PROZĘ LEKCJI — materiał jest towarem, to jest wyciek"
);

// Zdanie wzięte z SAMEJ treści, nie z listy w teście: gdyby proza się zmieniła,
// test dalej pyta o to, co naprawdę jest w bazie.
const pierwszeZdanie = odKodu(zBazy.content.split("\n")[0]).replace(/[*`_]/g, "").slice(0, 60);
sprawdz(
  !tekst(htmlGoscia).includes(pierwszeZdanie.slice(0, 40)),
  "gość widzi pierwszy akapit lekcji — bramka przecieka"
);
sprawdz(tekst(htmlGoscia).includes("Ta lekcja jest częścią kursu"), "gość nie dostał zaproszenia zamiast materiału");
sprawdz(htmlGoscia.includes("wp-login.php"), "gość nie ma odsyłacza do logowania");
sprawdz(htmlGoscia.includes(probka.tytul), "gość nie widzi nawet tytułu lekcji (a ma widzieć, to nie jest sekret)");

/* ————————————————— 2. właściciel widzi całą lekcję ————————————————— */

const admin = sesja();
sprawdz(await admin.zaloguj("admin", HASLO), "nie udało się zalogować jako admin");

const start = Date.now();
const odpowiedz = await admin.pobierz(probka.adres);
const html = await odpowiedz.text();
const czas = Date.now() - start;
const tresc = tekst(html);

sprawdz(odpowiedz.status === 200, `zalogowany dostał ${odpowiedz.status} zamiast 200`);
sprawdz(tresc.includes(pierwszeZdanie.slice(0, 40)), "pierwszy akapit lekcji nie doszedł do strony");

// ostatni akapit prozy — bierzemy z bazy, nie z pamięci
const ostatniAkapit = odKodu(
  zBazy.content
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#") && !l.startsWith("|") && !l.startsWith("```"))
    .pop()
)
  .replace(/[*`_]/g, "")
  .slice(0, 45);
sprawdz(tresc.includes(ostatniAkapit.slice(0, 35)), `ostatni akapit lekcji nie doszedł do strony („${ostatniAkapit}”)`);

// komplet sekcji: tyle `<h2>`, ile nagłówków `##` w prozie (poza blokami kodu)
const bezKodu = zBazy.content.replace(/```[\s\S]*?```/g, "");
const naglowkowWProzie = (bezKodu.match(/^## /gm) ?? []).length;
const naglowkowNaStronie = (widoczne(html).match(/<h2[ >]/g) ?? []).length;
sprawdz(
  naglowkowNaStronie === naglowkowWProzie,
  `sekcji na stronie ${naglowkowNaStronie}, a w prozie ${naglowkowWProzie} — renderer gubi albo dokłada nagłówki`
);

sprawdz(/<div class="aai-kod"/.test(html), "bloki kodu nie mają oprawy (klasa aai-kod)");
sprawdz(/class="aai-blok-naglowek"><svg/.test(html), "nagłówki bloków są bez ikon — kses zjadł SVG albo ikony zniknęły");
sprawdz(/noindex/.test(html), "materiał zza logowania bez noindex");
/*
 * Pytamy o ZNACZNIKI, nie o napis „tutor" w treści strony. Sam wzorzec
 * `tutor-front` trafia w KLASĘ `body` (`tutor-frontend`), którą Tutor dokłada
 * na swoich adresach — a to nie jest arkusz. Ta sama pomyłka zdarzyła się
 * przy ręcznym sprawdzaniu tej strony godzinę wcześniej.
 */
const cudzeArkusze = [...html.matchAll(/<link[^>]+href="([^"]+)"/g)]
  .map(([, adres]) => adres)
  .filter((adres) => /\/plugins\/(tutor|woocommerce)\//.test(adres));
const cudzeSkrypty = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)]
  .map(([, adres]) => adres)
  .filter((adres) => /\/plugins\/(tutor|woocommerce)\//.test(adres));
sprawdz(cudzeArkusze.length === 0, `na stronie lekcji ładują się arkusze Tutora/Woo: ${cudzeArkusze.join(", ")}`);
sprawdz(cudzeSkrypty.length === 0, `na stronie lekcji ładują się skrypty Tutora/Woo: ${cudzeSkrypty.join(", ")}`);
sprawdz(czas < 2000, `strona lekcji składała się ${czas} ms — za wolno jak na tekst z bazy`);

/* ————————————————— 3. obrazy naprawdę się wczytują ————————————————— */

const obrazy = [...widoczne(html).matchAll(/<img[^>]+src="([^"]+)"[^>]*>/g)];
sprawdz(obrazy.length > 0, "lekcja ze zrzutami nie ma ani jednego obrazu");
let martwych = 0;
let bezWymiarow = 0;
for (const [znacznik, adres] of obrazy) {
  if (!/width="\d+"/.test(znacznik) || !/height="\d+"/.test(znacznik)) bezWymiarow += 1;
  const odp = await fetch(adres, { method: "HEAD" });
  if (!odp.ok) martwych += 1;
}
sprawdz(martwych === 0, `${martwych} z ${obrazy.length} zrzutów nie da się pobrać`);
sprawdz(bezWymiarow === 0, `${bezWymiarow} zrzutów bez width/height — przepchną tekst przy doładowaniu`);
sprawdz(
  !tekst(html).includes("brak pliku"),
  "na stronie jest widoczny znacznik „brak pliku” — zrzut nie trafił do biblioteki mediów"
);

/* ————————————————— 4. nawigacja i program ————————————————— */

sprawdz(/class="aai-pasek-pigulka"/.test(html), "nie ma pływającej pigułki nawigacji");
sprawdz(/aria-current="page"/.test(html), "program w pigułce nie zaznacza bieżącej lekcji");

const wProgramie = (widoczne(html).match(/class="aai-spis-nr"/g) ?? []).length;
const lekcjiWKursie = JSON.parse(
  wp("eval", `global $wpdb; $l = $wpdb->prefix . "aai_sklep_lessons"; $m = $wpdb->prefix . "aai_sklep_modules";
    $id = $wpdb->get_var($wpdb->prepare("SELECT m.course_id FROM \`$l\` l JOIN \`$m\` m ON m.id = l.module_id WHERE l.id = %s", "${probka.uuid}"));
    echo json_encode((int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM \`$l\` l JOIN \`$m\` m ON m.id = l.module_id WHERE m.course_id = %s", $id)));`)
    .trim()
    .split("\n")
    .pop()
);
sprawdz(
  wProgramie === lekcjiWKursie,
  `program w pigułce ma ${wProgramie} lekcji, a kurs ${lekcjiWKursie}`
);

const nastepna = html.match(/aai-nawigacja-karta-dalej[^>]*href="([^"]+)"/);
sprawdz(Boolean(nastepna), "brak karty „następna lekcja”");
if (nastepna) {
  const odp = await admin.pobierz(nastepna[1]);
  sprawdz(odp.status === 200, `następna lekcja oddała ${odp.status}`);
  const htmlNastepnej = await odp.text();
  const wroc = htmlNastepnej.match(/class="aai-nawigacja-karta aai-unos" href="([^"]+)"/);
  sprawdz(
    Boolean(wroc) && wroc[1].replace(/\/$/, "") === probka.adres.replace(/\/$/, ""),
    "z następnej lekcji nie da się wrócić do tej, z której się przyszło"
  );
}

/* ————————————————— 5. WSZYSTKIE lekcje się składają ————————————————— */

let zatrzymane = 0;
let pusteTresci = 0;
for (const lekcja of lekcje) {
  const odp = await admin.pobierz(lekcja.adres);
  const strona = await odp.text();
  if (odp.status !== 200 || strona.includes("Ta lekcja chwilowo się nie wyświetla")) {
    zatrzymane += 1;
    if (zatrzymane <= 3) bledy.push(`lekcja „${lekcja.tytul}” nie złożyła się (${odp.status})`);
  } else if (!/<div class="aai-tresc">/.test(strona) || tekst(strona).length < 2000) {
    pusteTresci += 1;
    if (pusteTresci <= 3) bledy.push(`lekcja „${lekcja.tytul}” wyszła podejrzanie pusta`);
  }
}
sprawdzen += 2;
sprawdz(zatrzymane === 0, `${zatrzymane} lekcji zatrzymało renderer`);
sprawdz(pusteTresci === 0, `${pusteTresci} lekcji wyszło pustych`);

console.log(`  lekcji sprawdzonych w całości: ${lekcje.length}, czas najdłuższej odsłony: ${czas} ms`);

if (bledy.length > 0) {
  console.error(`\nsmoke-wp-lekcja: ${bledy.length} z ${sprawdzen} sprawdzeń nie przeszło:`);
  for (const b of bledy) console.error(`  ✖ ${b}`);
  process.exit(1);
}

console.log(
  `smoke-wp-lekcja: ${sprawdzen} sprawdzeń zaliczonych — gość nie widzi materiału, właściciel widzi całą lekcję ze zrzutami, ` +
    `wszystkie ${lekcje.length} lekcji składa się bez zatrzymania, nawigacja i program prowadzą tam, gdzie mówią.`
);
