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
import { migawkaDziennika, sprzatnijDziennik, ileWpisow } from "./dziennik.mjs";

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

/*
 * HIGIENA DZIENNIKA LOGOWAŃ (N13). Ta bramka loguje się do instalacji,
 * więc od kroku T2 KAŻDY jej przebieg zostawia wpisy w dzienniku
 * Pluginu 3 — zmierzone. Bez sprzątania licznik nieudanych prób
 * z 7 dni, czyli jedyna funkcja alarmowa ekranu monitoringu, pokazywałby
 * serie wyprodukowane przez nasze własne testy.
 */
const _dziennikPrzed = ileWpisow((k) => wp("eval", k));
const _dziennikMigawka = migawkaDziennika((k) => wp("eval", k));

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
/*
 * Gość MA dokąd kliknąć — ale nie na surowy ekran WordPressa. Ta asercja
 * pytała wcześniej wprost o `wp-login.php`, czyli utrwalała zachowanie,
 * które właściciel zgłosił jako błąd (2026-08-29): klient po mailu trafiał
 * na ekran logowania WP zamiast na stronę konta w naszym wyglądzie.
 */
sprawdz(
  /href="[^"]*my-account[^"]*"/.test(htmlGoscia) || /aai_po_logowaniu/.test(htmlGoscia),
  "gość nie ma odsyłacza do logowania na stronie konta"
);
sprawdz(!htmlGoscia.includes("wp-login.php"), "gość dostaje odsyłacz na surowy ekran logowania WordPressa");
sprawdz(htmlGoscia.includes(probka.tytul), "gość nie widzi nawet tytułu lekcji (a ma widzieć, to nie jest sekret)");

/* ——————— 1b. publiczne LISTY lekcji nie istnieją (wyciek z 2026-08-31) ——————— */
/*
 * ZNALEZIONE TESTEM CAŁOŚCI, nie tą bramką — i to jest powód, dla którego
 * ten blok tu stoi. Bramka pytała wyłącznie o POJEDYNCZĄ lekcję, a wyciekała
 * LISTA: `/?post_type=lesson` oddawało gościowi 73 lekcje prozy (osiem stron
 * po dziesięć), te same teksty szły kanałem RSS i przez wyszukiwarkę witryny.
 * Pojedyncza lekcja była przy tym poprawnie za bramką, więc wszystkie
 * dotychczasowe asercje świeciły na zielono.
 *
 * Pytamy o TREŚĆ, nie o kod odpowiedzi — kod 404 przy wyciekającej prozie
 * niczego by nie uratował, a 200 na pustej stronie nie jest wyciekiem.
 */
const fragmentProzy = pierwszeZdanie.slice(0, 40);
for (const adres of [
  "/?post_type=lesson",
  "/?post_type=lesson&paged=2",
  "/lesson/",
  "/?post_type=lesson&feed=rss2",
  "/?post_type=topics",
]) {
  const odp = await gosc.pobierz(adres);
  /*
   * Pytamy o TREŚĆ BEZ SKRYPTÓW, a nie o wynik `tekst()`. Ta asercja była
   * ŚLEPA na kanał RSS: `tekst()` zdejmuje znaczniki wyrażeniem `<[^>]+>`,
   * a proza w kanale siedzi w `<![CDATA[ … ]]>`, gdzie pierwszy `>` bywa
   * w środku treści (Markdown ma cytaty blokowe) — kawałek prozy znikał
   * razem z rzekomym znacznikiem. Zmierzone: bez osłony kanał oddawał
   * 11 lekcji, a asercja przechodziła na zielono.
   */
  const surowy = widoczne(await odp.text());
  sprawdz(
    !surowy.includes("Czego się nauczysz") && !surowy.includes(fragmentProzy),
    `PUBLICZNA LISTA ODDAJE PROZĘ LEKCJI (${adres}) — materiał jest towarem, to jest wyciek`
  );
}
/*
 * WYSZUKIWARKA — osobno, bo pytanie jest inne. Strona wyników POWTARZA
 * wpisaną frazę w tytule i w odnośniku do kanału, więc „czy fraza jest na
 * stronie" dawało fałszywy alarm (zmierzone: dwa trafienia, oba w `<head>`,
 * zero wyników). Pytamy więc o WYNIK: czy wśród nich jest lekcja.
 */
const wyniki = await (await gosc.pobierz(`/?s=${encodeURIComponent(fragmentProzy)}`)).text();
sprawdz(
  !/href="[^"]*\/lessons\/[^"]*"/.test(wyniki) && !tekst(wyniki).includes("Czego się nauczysz"),
  "wyszukiwarka witryny wypisuje lekcje płatnego kursu — materiał jest towarem, to jest wyciek"
);

// Kontrola pozytywna: zamykamy listy, a nie stronę. Bez niej „bez prozy"
// przechodziłoby także na zepsutym sklepie.
sprawdz((await gosc.pobierz("/szkolenia/")).status === 200, "katalog przestał odpowiadać po zasłonięciu list lekcji");
sprawdz(
  (await gosc.pobierz("/?post_type=lesson")).status === 404,
  "zasłonięta lista lekcji oddaje inny kod niż 404 — adres bez treści ma mówić \u201enie ma\u201d"
);

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

/* ————— strzałka „wróć" zależy od tego, KTO patrzy (W6) ————————————— */

/*
 * Właściciel złapał to w teście ręcznym: cofnął się z lekcji i wylądował na
 * stronie sprzedażowej — czyli kupujący dostał ofertę na coś, co już ma,
 * a jedynym wyjściem z tamtej strony jest przycisk „Dołącz”. Odnośnik ma
 * więc dwie postacie i obie sprawdzamy na ŻYWEJ stronie, bo to jedyne
 * miejsce, gdzie widać, którą wybrał szablon.
 */
const wroc = (html) => {
  const m = html.replace(/\s+/g, " ").match(/<a href="([^"]+)"[^>]*aria-label="([^"]*)"[^>]*class="aai-pasek-wroc"/);
  return m ? { adres: m[1].replace(ADRES, ""), etykieta: m[2] } : null;
};

const wrocGoscia = wroc(htmlGoscia);
sprawdz(
  wrocGoscia !== null && wrocGoscia.adres.startsWith("/szkolenia/") && !wrocGoscia.adres.includes("/moje"),
  `gość dostaje w pigułce odnośnik „${wrocGoscia?.adres ?? "(brak)"}” — a ma trafiać na stronę sprzedażową, bo dla niego to jest następny krok`
);

/*
 * Drugi stan robimy POMIAREM, nie deklaracją: zapisujemy administratora na
 * kurs, pytamy stronę i zapis cofamy. Bez zapisu nie da się odpowiedzieć na
 * pytanie „co widzi kupujący”, a to ono jest tu ważne.
 *
 * ZAPIS MUSI BYĆ `completed`, i to nie jest kosmetyka. Odkąd Plugin 2 czyni
 * kursy PŁATNYMI (`_tutor_course_price_type = paid` + `product_id`),
 * `do_enroll()` tworzy zapis w stanie `pending` — czeka na opłatę — a dostęp
 * do materiału daje wyłącznie `completed`. Samo `do_enroll()` symulowało
 * więc nie kupującego, tylko kogoś, kto zaczął zakup: pomiar pytał o cudzy
 * stan i odpowiadał na inne pytanie, niż deklarował. Ustawiamy status na
 * `completed` — czyli to, co na produkcji robi opłacone zamówienie.
 * (Że przy kursie płatnym `do_enroll()` NIE daje dostępu bez zapłaty,
 * pilnuje osobno smoke Pluginu 2 — to jest sedno pułapki B2.)
 */
const idKursu = Number(
  wp("eval", `echo (int) tutor_utils()->get_course_id_by_content( ${probka.id} );`).trim().split("\n").pop()
);
const idAdmina = Number(wp("eval", "echo (int) get_user_by('login','admin')->ID;").trim().split("\n").pop());
let zapisano = false;
if (idKursu > 0 && idAdmina > 0) {
  wp(
    "eval",
    `$z = tutor_utils()->do_enroll( ${idKursu}, 0, ${idAdmina} );` +
      ` if ( $z ) { wp_update_post( array( 'ID' => (int) $z, 'post_status' => 'completed' ) ); }`
  );
  zapisano = true;
}
try {
  /*
   * MENU: DOKŁADNIE JEDNA POZYCJA BIEŻĄCA. Pozycja „Moje kursy" powstaje
   * przez sklonowanie ostatniego `<li>` — czyli wstawionej przed chwilą
   * pozycji „Szkolenia", która na naszych stronach nosi już `aria-current`.
   * Pierwsza wersja klonu dziedziczyła ten atrybut i na `/szkolenia/`
   * bieżące były OBIE pozycje naraz. Sprawdzamy to tutaj, bo tylko tutaj
   * mamy konto zapisane na kurs — a bez zapisu pozycja się nie pojawia.
   */
  const katalog = await (await admin.pobierz("/szkolenia/")).text();
  const nawigacja = katalog.slice(katalog.indexOf("Nawigacja główna"), katalog.indexOf("Nawigacja główna") + 4000);
  const biezace = [...nawigacja.matchAll(/<a[^>]*aria-current="page"[^>]*>([\s\S]{0,60}?)<\/a>/g)].map((m) =>
    m[1].replace(/<[^>]*>/g, "").trim()
  );
  sprawdz(
    biezace.length === 1,
    `menu na /szkolenia/ podświetla ${biezace.length} pozycji (${biezace.join(", ")}) — bieżąca ma być dokładnie jedna`
  );

  /*
   * ZALOGOWANY Z KURSEM MA W MENU OBIE POZYCJE: „Moje kursy" (W6)
   * i „Moje konto" (P6 — droga powrotna do zamówień i ustawień;
   * do tej zmiany drzwi były jednokierunkowe i klient wracał na konto
   * wpisując adres z palca). Nieobecność u gościa mierzy smoke-wp-front.
   */
  for (const pozycja of ["Moje kursy", "Moje konto"]) {
    sprawdz(
      nawigacja.includes(pozycja),
      `menu zalogowanego z kursem nie ma pozycji „${pozycja}" — klient nie ma jak trafić tam, gdzie ona prowadzi`
    );
  }

  const poZapisie = wroc(await (await admin.pobierz(probka.adres)).text());
  sprawdz(
    zapisano && poZapisie !== null && poZapisie.adres === "/szkolenia/moje/",
    `kupujący dostaje w pigułce odnośnik „${poZapisie?.adres ?? "(brak)"}” — a ma wracać do „Moich kursów", nie na cennik`
  );
} finally {
  if (zapisano) {
    // Sprzątamy WYPISUJĄC zapisy tego konta na ten kurs — po id, nie po
    // przedrostku (lekcja z 0.43.0: sprzątanie po wzorcu zostawia sieroty).
    wp(
      "eval",
      `foreach ( get_posts( array( 'post_type' => 'tutor_enrolled', 'post_status' => 'any', 'author' => ${idAdmina}, 'post_parent' => ${idKursu}, 'numberposts' => -1, 'fields' => 'ids' ) ) as $z ) { wp_delete_post( (int) $z, true ); }`
    );
  }
}

/* ————————— UKRYCIE KURSU (C1, decyzja właściciela 2026-08-31) —————————
 *
 * „Ukryj" zabiera kurs ze SKLEPU, ale kto go kupił — czyta dalej. Do
 * 0.58.0 było odwrotnie i NIKT tego nie widział: cała kopia szła jednym
 * statusem, ukrycie przepisywało lekcje na `private`, a kupujący dostawał
 * 404 — przy `wp:sprawdz` 73/73 i `wp:tutor` bez różnic, bo nasze tabele
 * i kopia były zgodne co do znaku. Zgodne i niedostępne.
 *
 * Mierzymy PRAWDZIWYM kupującym, nie administratorem: administrator ma
 * `manage_options`, więc bramka wpuszcza go zawsze i odpowiadałby na inne
 * pytanie niż zadane. Konto zakładamy i kasujemy sami — bramka ma tworzyć
 * własną scenę (lekcja z testu całości).
 */
{
  const kursProbki = JSON.parse(
    wp("eval", `global $wpdb; $l = $wpdb->prefix . "aai_sklep_lessons"; $m = $wpdb->prefix . "aai_sklep_modules"; $c = $wpdb->prefix . "aai_sklep_courses";
      $id = $wpdb->get_var($wpdb->prepare("SELECT m.course_id FROM \`$l\` l JOIN \`$m\` m ON m.id = l.module_id WHERE l.id = %s", "${probka.uuid}"));
      $k = $wpdb->get_row($wpdb->prepare("SELECT id, slug, status, title FROM \`$c\` WHERE id = %s", $id), ARRAY_A);
      $z = $wpdb->get_row($wpdb->prepare("SELECT l.id FROM \`$l\` l JOIN \`$m\` m ON m.id = l.module_id WHERE m.course_id = %s AND l.preview = 1 ORDER BY m.position, l.position LIMIT 1", $id), ARRAY_A);
      $zp = $z ? get_posts(["post_type"=>"lesson","post_status"=>"any","numberposts"=>1,"meta_key"=>"_aai_zrodlo_uuid","meta_value"=>$z["id"]]) : array();
      echo json_encode(array("kurs"=>$k, "zapowiedz"=>$zp ? get_permalink($zp[0]->ID) : null));`)
      .trim().split("\n").pop()
  );

  sprawdz(
    kursProbki.kurs !== null && "published" === kursProbki.kurs.status,
    "kurs próbki nie jest opublikowany — pomiar ukrycia pytałby o nieznany stan wyjściowy"
  );
  sprawdz(kursProbki.zapowiedz !== null, "kurs próbki nie ma ani jednej lekcji-zapowiedzi — nie ma czym zmierzyć, że zapowiedź gaśnie");

  // KONTRPRZYKŁAD: zanim ukryjemy, zapowiedź MUSI być czytelna dla gościa.
  // Bez tego asercja „po ukryciu nie widać" przechodziłaby także wtedy, gdyby
  // zapowiedzi nie działały w ogóle.
  if (kursProbki.zapowiedz) {
    const przed = tekst(await (await sesja().pobierz(kursProbki.zapowiedz)).text());
    sprawdz(przed.includes("Czego się nauczysz"), "gość NIE czyta darmowej zapowiedzi opublikowanego kursu — sprzedaż straciła próbkę towaru");
  }

  const kupujacy = sesja();
  const HASLO_C1 = "Smoke!C1-2026-ukrycie";
  wp("user", "create", "smoke-c1", "smoke-c1@example.test", "--role=subscriber", `--user_pass=${HASLO_C1}`, "--porcelain");
  let idKupujacego = 0;
  try {
    idKupujacego = Number(wp("eval", "echo (int) get_user_by('login','smoke-c1')->ID;").trim().split("\n").pop());
    wp("eval", `$z = tutor_utils()->do_enroll( ${idKursu}, 0, ${idKupujacego} );` +
      ` if ( $z ) { wp_update_post( array( 'ID' => (int) $z, 'post_status' => 'completed' ) ); }`);
    sprawdz(await kupujacy.zaloguj("smoke-c1", HASLO_C1), "nie udało się zalogować kontem kupującego — reszta pomiaru ukrycia pytałaby gościa");

    // Kontrprzykład drugi: przed ukryciem kupujący czyta materiał.
    sprawdz(
      tekst(await (await kupujacy.pobierz(probka.adres)).text()).includes("Czego się nauczysz"),
      "kupujący nie czyta materiału opublikowanego kursu — pomiar ukrycia nie miałby punktu odniesienia"
    );

    /*
     * DROGA KLIENTA, NIE ADRES LEKCJI.
     *
     * Wszystko powyżej pyta o BEZPOŚREDNI adres lekcji — drogę, której klient
     * nie zna i której nigdzie nie dostaje. Jedyna, którą ma, to „Moje kursy":
     * pozycja w menu (`ma_kursy()`) i kafelek na `/szkolenia/moje/` (`kursy()`).
     * Do 2026-09-05 obie szły przez `lista_kursow()`, czyli przez filtr
     * `status = 'published'`, więc ukrycie kursu zabierało kupującemu menu
     * i kafelek naraz — przy dwóch żywych zapisach w Tutorze i przy adresie
     * lekcji, który działał. Ten pomiar był ślepy na całe zdarzenie.
     *
     * Kontrprzykład stoi tu, PRZED ukryciem: bez niego asercje „po ukryciu
     * kafelek jest" przechodziłyby także wtedy, gdyby „Moje kursy" nie
     * działały w ogóle.
     */
    const mojePrzedHtml = await (await kupujacy.pobierz("/szkolenia/moje/")).text();
    const mojePrzed = tekst(mojePrzedHtml);
    sprawdz(
      mojePrzed.includes(kursProbki.kurs.title),
      `kupujący nie widzi swojego kursu na „Moich kursach" PRZED ukryciem — pomiar drogi klienta nie miałby punktu odniesienia`
    );
    sprawdz(
      !mojePrzed.includes("Kurs wycofany ze sprzedaży"),
      `opublikowany kurs jest opisany jako wycofany ze sprzedaży — adnotacja pojawia się niezależnie od stanu, czyli nic nie znaczy`
    );

    /*
     * Wzorzec odsyłacza bierzemy Z ŻYWEJ STRONY, nie z wyobrażenia o niej.
     * Pierwsza wersja tego pomiaru składała adres WZGLĘDNY (`/szkolenia/…`),
     * a szablon drukuje BEZWZGLĘDNY (`http://…/szkolenia/…`) — więc wzorzec
     * nie pasował do niczego i asercja „kafelek nie prowadzi na 404"
     * przechodziła PO PUSTCE. Złapał to dopiero test negatywny: mutacja
     * przywracająca martwy odsyłacz przeszła na zielono. Stąd kontrprzykład
     * poniżej — on pilnuje samego wzorca.
     */
    const hrefSprzedazowej = `href="${ADRES}/szkolenia/${kursProbki.kurs.slug}/"`;
    sprawdz(
      mojePrzedHtml.includes(hrefSprzedazowej),
      `kafelek opublikowanego kursu NIE prowadzi na jego stronę sprzedażową — wzorzec odsyłacza nie pasuje do żywej strony, więc pomiar „po ukryciu nie ma odsyłacza" przechodziłby po pustce`
    );

    wp("eval", `Aai_Sklep_Zapis::ustaw_status('${kursProbki.kurs.id}','archived','smoke-wp-lekcja');`);

    const poUkryciu = await kupujacy.pobierz(probka.adres);
    const trescKupujacego = poUkryciu.status === 200 ? tekst(await poUkryciu.text()) : "";
    sprawdz(
      poUkryciu.status === 200 && trescKupujacego.includes("Czego się nauczysz"),
      `KUPUJĄCY STRACIŁ DOSTĘP PO UKRYCIU KURSU (HTTP ${poUkryciu.status}) — „Ukryj" ma zabierać kurs ze sklepu, a nie ludziom, którzy zapłacili`
    );

    const sprzedazowa = await sesja().pobierz(`/szkolenia/${kursProbki.kurs.slug}/`);
    sprawdz(sprzedazowa.status === 404, `strona sprzedażowa ukrytego kursu oddała ${sprzedazowa.status} zamiast 404 — kurs nie zniknął ze sklepu`);

    // Droga klienta PO ukryciu: kafelek zostaje, mówi dlaczego, i nie prowadzi
    // na stronę sprzedażową, która przed chwilą oddała 404.
    const odpMoje = await kupujacy.pobierz("/szkolenia/moje/");
    const mojePo = odpMoje.status === 200 ? await odpMoje.text() : "";
    sprawdz(
      tekst(mojePo).includes(kursProbki.kurs.title),
      `KUPUJĄCY STRACIŁ DROGĘ DO KURSU PO UKRYCIU (HTTP ${odpMoje.status}) — „Moje kursy" nie wymieniają kursu, za który zapłacił, choć zapis w Tutorze żyje`
    );
    sprawdz(
      tekst(mojePo).includes("Kurs wycofany ze sprzedaży"),
      `kafelek ukrytego kursu nie mówi, że kurs wycofano ze sprzedaży — zniknięcie z katalogu wygląda dla klienta jak awaria`
    );
    sprawdz(
      !mojePo.includes(hrefSprzedazowej),
      `kafelek ukrytego kursu prowadzi na jego stronę sprzedażową, która oddaje 404 — klient dostaje martwy odsyłacz zamiast kursu`
    );
    sprawdz(
      JSON.parse(wp("eval", `wp_set_current_user(${idKupujacego}); echo json_encode(Aai_Sklep_Moje::ma_kursy());`).trim().split("\n").pop()) === true,
      `menu nie pokazuje kupującemu pozycji „Moje kursy" po ukryciu kursu — droga do materiału znika z każdej strony witryny`
    );

    if (kursProbki.zapowiedz) {
      const zapowiedzPoUkryciu = tekst(await (await sesja().pobierz(kursProbki.zapowiedz)).text());
      sprawdz(
        !zapowiedzPoUkryciu.includes("Czego się nauczysz"),
        "darmowa zapowiedź ukrytego kursu jest dalej otwarta dla każdego — została po nim jedyna żywa strona, choć oferty już nie ma"
      );
    }

    const statusy = JSON.parse(
      wp("eval", `global $wpdb;
        $kurs = get_posts(["post_type"=>"courses","post_status"=>"any","numberposts"=>1,"meta_key"=>"_aai_zrodlo_uuid","meta_value"=>"${kursProbki.kurs.id}"]);
        echo json_encode(array("kurs"=>$kurs ? get_post_status($kurs[0]->ID) : null, "lekcja"=>get_post_status(${probka.id})));`)
        .trim().split("\n").pop()
    );
    sprawdz(
      statusy.kurs === "private",
      `wpis ukrytego kursu w Tutorze ma status „${statusy.kurs}" zamiast „private" — przy każdym innym dowolny zalogowany bierze go za darmo (Course::enroll_now)`
    );
    sprawdz(statusy.lekcja === "publish", `lekcja ukrytego kursu ma status „${statusy.lekcja}" zamiast „publish" — kupujący dostanie 404`);
  } finally {
    wp("eval", `Aai_Sklep_Zapis::ustaw_status('${kursProbki.kurs.id}','${kursProbki.kurs.status}','smoke-wp-lekcja');`);
    if (idKupujacego > 0) {
      wp("eval", `foreach ( get_posts( array( 'post_type' => 'tutor_enrolled', 'post_status' => 'any', 'author' => ${idKupujacego}, 'numberposts' => -1, 'fields' => 'ids' ) ) as $z ) { wp_delete_post( (int) $z, true ); }`);
      wp("user", "delete", "smoke-c1", "--yes");
    }
  }
}

console.log(`  lekcji sprawdzonych w całości: ${lekcje.length}, czas najdłuższej odsłony: ${czas} ms`);

/* Sprzątanie po sobie: wyłącznie wiersze powstałe PO starcie tej bramki. */
sprzatnijDziennik((k) => wp("eval", k), _dziennikMigawka);
sprawdz(
  ileWpisow((k) => wp("eval", k)) === _dziennikPrzed,
  `bramka zostawiła ślad w dzienniku logowań: przed ${_dziennikPrzed}, po ${ileWpisow((k) => wp("eval", k))} wpisów (N13)`
);

if (bledy.length > 0) {
  console.error(`\nsmoke-wp-lekcja: ${bledy.length} z ${sprawdzen} sprawdzeń nie przeszło:`);
  for (const b of bledy) console.error(`  ✖ ${b}`);
  process.exit(1);
}

console.log(
  `smoke-wp-lekcja: ${sprawdzen} sprawdzeń zaliczonych — gość nie widzi materiału, właściciel widzi całą lekcję ze zrzutami, ` +
    `wszystkie ${lekcje.length} lekcji składa się bez zatrzymania, nawigacja i program prowadzą tam, gdzie mówią.`
);
