/**
 * Smoke szwu kurs → produkt WooCommerce — bramka kroku P2.
 *
 * Mierzy ZACHOWANIE na żywej instalacji, na WŁASNYM kursie testowym
 * (prawdziwe kursy tylko czyta), i sprząta po sobie do zera.
 *
 * CO SPRAWDZA:
 *  1. **Bramka P2 wg krytyki (P2)**: trzy przebiegi synchronizacji →
 *     liczba produktów identyczna, ZERO nowych wpisów typu `product`
 *     w 2. i 3. przebiegu, a `sha256` wiersza produktu RAZEM z meta
 *     niezmieniony między 2. a 3. (liczniki Pluginu 1 by nie wystarczyły
 *     — przeszłyby także przy produktach tworzonych od nowa).
 *  2. **Kolejność B2 mierzona, nie deklarowana**: hak na `added_post_meta`
 *     i `updated_post_meta` zapisuje KOLEJNOŚĆ kluczy — `_tutor_course_price_type`
 *     MUSI paść przed `_tutor_course_product_id` (odwrotna rozdaje kurs
 *     za darmo). Przy zdejmowaniu — odwrotnie.
 *  3. **Pięć stanów z tabeli 9.3**: published+cena>0 → publish; cena 0 →
 *     draft + `price_type=free`; szkic → draft, `price_type` NIETKNIĘTY;
 *     archived → draft; usunięcie kursu → draft, produkt ISTNIEJE.
 *  4. **B13**: cudzy zapis produktu kasuje `_tutor_product` → nasz hak
 *     przywraca (test wykonuje prawdziwy `wp post update`).
 *  5. **Kontrola** kończy się kodem 1 na: zepsutej cenie regularnej,
 *     zepsutej cenie liczonej w kasie (`_price` — B5), produkcie
 *     widocznym w katalogu, zerwanym powiązaniu w Tutorze, osieroconym
 *     produkcie w `publish`. Każdy przypadek przywracany po próbie.
 *  6. **B4**: drugi produkt z tym samym `_aai_platnosci_kurs_uuid` →
 *     kod 1; powiązanie zajętego produktu z drugim kursem → odmowa.
 *
 * WYMAGA środowiska: `cd wordpress/srodowisko && ./postaw.sh`.
 * Poza CI (CI nie ma podmana).
 *
 * Użycie: node tools/smoke/smoke-wp-produkty.mjs
 */
import { execFileSync } from "node:child_process";

const STACK = process.env.STACK_NAZWA ?? "aai_wp";
const KONTENER = `${STACK}_cli`;
const KURS = "aaaa0000-0000-4000-8000-0000000pr002";
const SLUG = "smoke-wp-produkty";

const bledy = [];
let sprawdzen = 0;
const sprawdz = (w, opis) => {
  sprawdzen += 1;
  if (!w) bledy.push(opis);
};

function wp(...argumenty) {
  try {
    const stdout = execFileSync("podman", ["exec", KONTENER, "wp", ...argumenty], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { kod: 0, out: stdout.trim(), err: "" };
  } catch (e) {
    return { kod: e.status ?? 1, out: (e.stdout ?? "").toString().trim(), err: (e.stderr ?? "").toString().trim() };
  }
}
const php = (kod) => wp("eval", kod).out;
/**
 * Wartość z PHP porównywana RÓWNOŚCIĄ, nie końcówką.
 *
 * `.endsWith("199.00")` przechodzi także dla „1199.00", a `.endsWith("paid")`
 * dla „unpaid" — wzorzec z końcówką wybrano tylko po to, żeby tolerować
 * ostrzeżenia PHP drukowane przed wynikiem. Opakowanie w nawiasy klamrowe
 * rozwiązuje jedno i drugie.
 */
const wartosc = (wyrazenie) => {
  // Wyrażenie W NAWIASACH: konkatenacja `.` wiąże w PHP mocniej niż `?:`,
  // więc `'{' . $x ? 'a' : 'b' . '}'` liczy się jako `('{' . $x) ? …` —
  // czyli ZAWSZE gałąź prawdziwa. Bez nawiasów ta funkcja pomiarowa
  // kłamała na każdym warunku (złapane własnym testem przy P2).
  const out = wp("eval", `echo '{' . ( ${wyrazenie} ) . '}';`).out;
  const m = out.match(/\{([^}]*)\}\s*$/);
  return m ? m[1] : out;
};

/** Kurs testowy w Pluginie 1 — smoke ma prawo psuć SWOJE dane. */
function zapiszKurs(status, cenaGrosze) {
  return php(
    `$k = array('id' => '${KURS}', 'slug' => '${SLUG}', 'title' => 'Smoke P2', 'type' => 'kurs',` +
      ` 'short_desc' => 'smoke', 'price_grosze' => ${cenaGrosze}, 'cover_url' => null, 'status' => '${status}',` +
      ` 'badge' => null, 'level' => null, 'sekcje' => array(), 'moduly' => array());` +
      ` $w = Aai_Sklep_Zapis::zapisz_kurs($k, 'smoke-p2', true); echo 'ok';`
  );
}
const produktKursu = () => Number(php(`echo (int) Aai_Platnosci_Zapis::produkt_kursu('${KURS}');`));
const tutorKursu = () => Number(php(`echo (int) Aai_Platnosci_Zapis::kurs_tutora('${KURS}');`));
const liczbaProduktow = () =>
  Number(php(`global $wpdb; echo (int) $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type='product'");`));
/** sha256 wiersza produktu RAZEM z jego meta — dowód „nic nie ruszone". */
const odciskProduktu = (id) =>
  php(
    `global $wpdb; $p = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$wpdb->posts} WHERE ID = %d", ${id}), ARRAY_A);` +
      ` $m = $wpdb->get_results($wpdb->prepare("SELECT meta_key, meta_value FROM {$wpdb->postmeta} WHERE post_id = %d ORDER BY meta_key, meta_value", ${id}), ARRAY_A);` +
      ` foreach ($m as $i => $w) { if ($w['meta_key'] === '_aai_platnosci_sync_ts') unset($m[$i]); }` +
      ` echo hash('sha256', wp_json_encode(array($p, array_values($m))));`
  );

/* ── stan wyjściowy ─────────────────────────────────────────────────── */

const powiazaniaPrzed = Number(
  php('global $wpdb; echo (int) $wpdb->get_var("SELECT COUNT(*) FROM " . Aai_Platnosci_Tabele::tabela("powiazania"));')
);
const produktowPrzed = liczbaProduktow();

/* ── 1. kurs powstaje → produkt publish + powiązanie ────────────────── */

zapiszKurs("published", 19900);
wp("aai-platnosci", "sync", SLUG);
const produkt = produktKursu();
sprawdz(produkt > 0, "po zapisie kursu nie powstał produkt");
const tutor = tutorKursu();
sprawdz(tutor > 0, "kopia kursu w Tutorze nie powstała — dalsze pomiary powiązania byłyby ślepe");
sprawdz(wp("post", "get", String(produkt), "--field=post_status").out === "publish", "produkt opublikowanego, płatnego kursu nie jest publish");
sprawdz(wartosc(`get_post_meta(${tutor}, '_tutor_course_price_type', true)`) === "paid", "wpis Tutora nie ma price_type=paid");
sprawdz(
  Number(php(`echo (int) get_post_meta(${tutor}, '_tutor_course_product_id', true);`)) === produkt,
  "wpis Tutora nie wskazuje naszego produktu"
);
sprawdz(wartosc(`wc_get_product(${produkt})->get_regular_price('edit')`) === "199.00", "cena regularna != 199.00 (grosze / 100)");
sprawdz(wartosc(`wc_get_product(${produkt})->get_price('edit')`) === "199.00", "cena liczona w kasie (_price) != 199.00 — zapis metą zamiast save()? (B5)");
sprawdz(wartosc(`wc_get_product(${produkt})->get_catalog_visibility('edit')`) === "hidden", "produkt widoczny w katalogu Woo (decyzja właściciela: hidden)");
sprawdz(wartosc(`wc_get_product(${produkt})->get_sold_individually('edit') ? 'tak' : 'nie'`) === "tak", "produkt bez _sold_individually (B14)");
sprawdz(wartosc(`get_post_meta(${produkt}, '_tutor_product', true)`) === "yes", "produkt bez _tutor_product");

/*
 * TEKST, KTÓRY KLIENT CZYTA W KASIE (0.51.0). Woo drukuje krótki opis pod
 * nazwą pozycji w koszyku i w podsumowaniu zamówienia, a Store API oddaje
 * go publicznie. Do 0.50.0 kopia go nie ustawiała i pole było niczyje —
 * na produkcie 675 wylądowała przez to „cudza edycja 1787936224". Żadna
 * bramka tego nie widziała, bo wszystkie mierzyły mechanizmy.
 */
sprawdz(wartosc(`wc_get_product(${produkt})->get_short_description('edit')`) === "smoke", "krótki opis produktu nie pochodzi z short_desc kursu — klient przeczyta w kasie cudzy tekst");
sprawdz(wartosc(`wc_get_product(${produkt})->get_name('edit')`) === "Smoke P2", "nazwa produktu nie pochodzi z tytułu kursu");

/* ── 1b. opis z BACKSLASHEM przeżywa zapis co do znaku ──────────────── */

/*
 * ZMIERZONE na Woo 11.0.1: `set_short_description()` i `set_name()` kończą
 * w `wp_insert_post()`, które puszcza wartość przez `wp_unslash()` — bez
 * `wp_slash()` z opisu ginie KAŻDY backslash. To nie jest teoria: kurs
 * „Jak poprawnie używać GitHuba" ma w treści `C:\Users` i sekwencje `\n`,
 * a opis sprzedażowy pisze właściciel w kreatorze. Rodzina pułapki
 * `update_post_meta` z kroku W2 — tam ratował nas `$wpdb`, tu nie ma kto.
 */
{
  const wzor = "C:" + String.fromCharCode(92) + "Users i " + String.fromCharCode(92) + "n";
  php(
    `$k = array('id' => '${KURS}', 'slug' => '${SLUG}', 'title' => 'Smoke P2', 'type' => 'kurs',` +
      ` 'short_desc' => 'C:' . chr(92) . 'Users i ' . chr(92) . 'n', 'price_grosze' => 19900, 'cover_url' => null,` +
      ` 'status' => 'published', 'badge' => null, 'level' => null, 'sekcje' => array(), 'moduly' => array());` +
      ` Aai_Sklep_Zapis::zapisz_kurs($k, 'smoke-p2', true); echo 'ok';`
  );
  wp("aai-platnosci", "sync", SLUG);
  const poZapisie = wartosc(`wc_get_product(${produkt})->get_short_description('edit')`);
  sprawdz(poZapisie === wzor, `opis z backslashem NIE przeżył zapisu: oczekiwano „${wzor}", jest „${poZapisie}" — brak wp_slash() w warstwie zapisu`);
  // Drugi przebieg: slashe NIE mają prawa się kumulować, bo wtedy każdy
  // kolejny zapis kursu zmieniałby opis i idempotencja padłaby cicho.
  wp("aai-platnosci", "sync", SLUG);
  sprawdz(
    wartosc(`wc_get_product(${produkt})->get_short_description('edit')`) === wzor,
    "po DRUGIM zapisie opis się zmienił — slashe się kumulują"
  );
  zapiszKurs("published", 19900);
  wp("aai-platnosci", "sync", SLUG);
  sprawdz(wartosc(`wc_get_product(${produkt})->get_short_description('edit')`) === "smoke", "powrót do zwykłego opisu nie doszedł do produktu");
}

/* ── 2. BRAMKA P2: trzy przebiegi, odcisk niezmieniony ──────────────── */

// ZAWSZE ze slugiem kursu testowego: `sync` bez sluga przepuszcza także
// PRAWDZIWE kursy właściciela, a smoke obiecuje w nagłówku, że ich tylko
// czyta. Przy `--napraw-cene` to nie jest teoria — tamta operacja prowadzi
// produkt przez `draft`, więc padnięcie w tym miejscu zostawiłoby realny
// kurs poza sprzedażą.
wp("aai-platnosci", "sync", SLUG);
const poDrugim = { produktow: liczbaProduktow(), odcisk: odciskProduktu(produkt) };
wp("aai-platnosci", "sync", SLUG);
const poTrzecim = { produktow: liczbaProduktow(), odcisk: odciskProduktu(produkt) };
sprawdz(poDrugim.produktow === poTrzecim.produktow, `liczba produktów rośnie między przebiegami (${poDrugim.produktow} → ${poTrzecim.produktow})`);
sprawdz(
  poDrugim.odcisk === poTrzecim.odcisk,
  "sha256 wiersza produktu z meta ZMIENIŁ SIĘ między 2. a 3. przebiegiem — synchronizacja zapisuje mimo braku zmian"
);
const trzeci = wp("aai-platnosci", "sync", SLUG);
sprawdz(
  /bez zmian 1\b/.test(trzeci.out),
  `czwarty przebieg na kursie testowym nie melduje dokładnie „bez zmian 1": ${trzeci.out}`
);

/* ── 3. KOLEJNOŚĆ B2 mierzona hakiem ────────────────────────────────── */

// Zrywamy powiązanie i odtwarzamy je, notując kolejność zapisów meta.
php(`delete_post_meta(${tutor}, '_tutor_course_product_id'); delete_post_meta(${tutor}, '_tutor_course_price_type');`);
const kolejnosc = php(
  `$GLOBALS['aai_kolejnosc'] = array();` +
    ` $zbierz = function($mid, $oid, $klucz) { if (in_array($klucz, array('_tutor_course_price_type', '_tutor_course_product_id'), true)) { $GLOBALS['aai_kolejnosc'][] = $klucz; } };` +
    ` add_action('added_post_meta', $zbierz, 10, 3); add_action('updated_post_meta', $zbierz, 10, 3);` +
    ` Aai_Platnosci_Zapis::synchronizuj_kurs('${KURS}');` +
    ` echo implode(',', $GLOBALS['aai_kolejnosc']);`
);
sprawdz(
  kolejnosc.includes("_tutor_course_price_type,_tutor_course_product_id"),
  `KOLEJNOŚĆ B2 ZŁAMANA: zapisano „${kolejnosc}" — product_id przed price_type ROZDAJE kurs za darmo`
);
sprawdz(
  !kolejnosc.includes("_tutor_course_product_id,_tutor_course_price_type"),
  `w zapisie wystąpiła zła kolejność (product_id przed price_type): ${kolejnosc}`
);

/* ── 4. B13: cudzy zapis produktu kasuje znacznik, hak go przywraca ── */

/*
 * ASERCJA WSTĘPNA (zapowiedziana w SWEEP-P2.md §4): od P3a silnik stoi na
 * `wc`, więc handler Tutora na `save_post_product` JEST zarejestrowany
 * i ten test mierzy przywracanie znacznika po CUDZYM, realnym kasowaniu.
 * Przy innym silniku handler nie istnieje i test mierzyłby wyłącznie nasz
 * własny kod — przechodziłby, nie dowodząc pułapki, której dotyczy.
 */
sprawdz(
  wartosc(`function_exists('tutor_utils') ? tutor_utils()->get_option('monetize_by') : ''`) === "wc",
  "monetize_by nie jest `wc` — test B13 mierzyłby własny kod zamiast cudzego handlera (uruchom: wp aai-platnosci sync --napraw)"
);

php(`delete_post_meta(${produkt}, '_tutor_product');`);
wp("post", "update", String(produkt), "--post_excerpt=smoke-cudzy-zapis");
sprawdz(
  wartosc(`get_post_meta(${produkt}, '_tutor_product', true)`) === "yes",
  "po CUDZYM zapisie produktu znacznik _tutor_product nie wrócił — hak B13 nie działa"
);

/*
 * Ta próba pisze w KRÓTKI OPIS, czyli w pole, które od 0.51.0 należy do
 * naszej kopii i które klient czyta w kasie. Zostawienie jej tak, jak
 * była, robiłoby z tego smoke'a źródło dokładnie tego śmiecia, który
 * właściciel znalazł na produkcie 675 („cudza edycja 1787936224").
 * Zamiast tylko sprzątać, mierzymy przy okazji rzecz wartą pomiaru:
 * czy `sync` UMIE cofnąć cudzą edycję opisu — bo to jedyna droga
 * naprawy, którą podaje komunikat kontroli.
 */
sprawdz(
  wartosc(`wc_get_product(${produkt})->get_short_description('edit')`) === "smoke-cudzy-zapis",
  "cudza edycja opisu nie doszła do produktu — dalszy pomiar naprawy byłby ślepy"
);
wp("aai-platnosci", "sync", SLUG);
sprawdz(
  wartosc(`wc_get_product(${produkt})->get_short_description('edit')`) === "smoke",
  "sync NIE cofnął cudzej edycji krótkiego opisu — komunikat kontroli, który każe uruchomić sync, obiecywałby wtedy nieprawdę"
);

/* ── 5. kontrola: kod 1 na każdym rodzaju rozjazdu ──────────────────── */

/**
 * Test negatywny kontroli. Zieleń PRZED psuciem jest częścią próby:
 * bez niej wszystkie wywołania przechodziłyby z CUDZEGO powodu, gdyby
 * instalacja miała wcześniejszy rozjazd (klasa BLAD-022 — cały blok
 * przechodził z jednego wspólnego powodu).
 */
function probaCzerwona(psuj, przywroc, opis) {
  const przed = wp("aai-platnosci", "sprawdz");
  sprawdz(przed.kod === 0, `${opis} — kontrola BYŁA czerwona jeszcze przed próbą, pomiar mierzyłby cudzy rozjazd: ${przed.err}`);
  php(psuj);
  const wynik = wp("aai-platnosci", "sprawdz");
  php(przywroc);
  sprawdz(wynik.kod === 1, `${opis} — kontrola oddała kod ${wynik.kod}, oczekiwano 1`);
  const po = wp("aai-platnosci", "sprawdz");
  sprawdz(po.kod === 0, `${opis} — po przywróceniu kontrola nadal czerwona, próba zostawiła ślad: ${po.err}`);
}
probaCzerwona(
  `$p = wc_get_product(${produkt}); $p->set_short_description('cudza edycja 123'); $p->save();`,
  `$p = wc_get_product(${produkt}); $p->set_short_description('smoke'); $p->save();`,
  "cudzy krótki opis w kasie"
);
probaCzerwona(
  `$p = wc_get_product(${produkt}); $p->set_name('Cudza nazwa'); $p->save();`,
  `$p = wc_get_product(${produkt}); $p->set_name('Smoke P2'); $p->save();`,
  "cudza nazwa produktu"
);
probaCzerwona(
  `$p = wc_get_product(${produkt}); $p->set_regular_price('1.00'); $p->save();`,
  `$p = wc_get_product(${produkt}); $p->set_regular_price('199.00'); $p->save();`,
  "zepsuta cena regularna"
);
// `_price` zepsute METĄ: kontrola ma to wykryć, a naprawić ma JAWNA komenda
// `sync --napraw-cene` (zwykły `sync` tego nie robi — zmierzone w kodzie Woo:
// pole przelicza się tylko przy realnej zmianie ceny regularnej, więc naprawa
// wymaga ceny tymczasowej i nie ma prawa dziać się po cichu).
php(`update_post_meta(${produkt}, '_price', '1.00'); wc_delete_product_transients(${produkt});`);
const zepsutaKasa = wp("aai-platnosci", "sprawdz");
sprawdz(zepsutaKasa.kod === 1, `cena liczona w kasie rozjechana z regularną (B5) — kontrola oddała kod ${zepsutaKasa.kod}, oczekiwano 1`);
sprawdz(
  /napraw-cene/.test(zepsutaKasa.out + zepsutaKasa.err),
  "kontrola nie mówi, CZYM naprawić rozjazd _price (ma wskazywać sync --napraw-cene)"
);
const zwyklySync = wp("aai-platnosci", "sync", SLUG);
sprawdz(
  wartosc(`wc_get_product(${produkt})->get_price('edit')`) === "1.00",
  `zwykły sync ruszył cenę efektywną — miał tego NIE robić po cichu (${zwyklySync.out})`
);
wp("aai-platnosci", "sync", SLUG, "--napraw-cene");
sprawdz(
  wartosc(`wc_get_product(${produkt})->get_price('edit')`) === "199.00",
  "sync --napraw-cene NIE naprawił ceny liczonej w kasie"
);
sprawdz(
  wartosc(`wc_get_product(${produkt})->get_regular_price('edit')`) === "199.00",
  "naprawa zostawiła cenę regularną z ceną tymczasową (+0,01) zamiast docelowej"
);
sprawdz(
  wp("post", "get", String(produkt), "--field=post_status").out === "publish",
  "naprawa nie przywróciła statusu produktu (został draft — kurs zniknął ze sprzedaży)"
);
sprawdz(
  wartosc(`wc_get_product(${produkt})->get_sale_price('edit')`) === "",
  "naprawa dotknęła ceny promocyjnej — niezmiennik 3 zabrania"
);
probaCzerwona(
  `$p = wc_get_product(${produkt}); $p->set_catalog_visibility('visible'); $p->save();`,
  `$p = wc_get_product(${produkt}); $p->set_catalog_visibility('hidden'); $p->save();`,
  "produkt widoczny w katalogu Woo"
);
probaCzerwona(
  `delete_post_meta(${tutor}, '_tutor_course_product_id');`,
  `update_post_meta(${tutor}, '_tutor_course_product_id', ${produkt});`,
  "zerwane powiązanie na wpisie Tutora"
);
probaCzerwona(
  `$p = wc_get_product(${produkt}); $p->set_status('draft'); $p->save();`,
  `$p = wc_get_product(${produkt}); $p->set_status('publish'); $p->save();`,
  "produkt zdjęty ze sprzedaży przy opublikowanym, płatnym kursie"
);
probaCzerwona(
  `$p = wc_get_product(${produkt}); $p->set_virtual(false); $p->save();`,
  `$p = wc_get_product(${produkt}); $p->set_virtual(true); $p->save();`,
  "produkt przestał być wirtualny"
);
probaCzerwona(
  `$p = wc_get_product(${produkt}); $p->set_sold_individually(false); $p->save();`,
  `$p = wc_get_product(${produkt}); $p->set_sold_individually(true); $p->save();`,
  "produkt bez _sold_individually (quantity=3 wzięłoby trzy sztuki — B14)"
);
probaCzerwona(
  `delete_post_meta(${produkt}, '_tutor_product');`,
  `update_post_meta(${produkt}, '_tutor_product', 'yes');`,
  "produkt bez znacznika _tutor_product"
);
probaCzerwona(
  `update_post_meta(${tutor}, '_tutor_course_price_type', 'free');`,
  `update_post_meta(${tutor}, '_tutor_course_price_type', 'paid');`,
  "wpis Tutora przestał być płatny"
);
probaCzerwona(
  `delete_post_meta(${tutor}, '_aai_zrodlo_uuid');`,
  `update_post_meta(${tutor}, '_aai_zrodlo_uuid', '${KURS}');`,
  "brak kopii kursu w Tutorze przy OPUBLIKOWANYM produkcie (klient płaci i nie dostaje nic — B3)"
);
probaCzerwona(
  `Aai_Platnosci_Zapis::powiazanie_usun('${KURS}'); update_post_meta(${produkt}, '_aai_platnosci_kurs_uuid', '${KURS}');`,
  `Aai_Platnosci_Zapis::powiazanie_ustaw('${KURS}', ${produkt});`,
  "kurs płatny bez wiersza w powiazania, gdy synchronizacja NIE jest świeża"
);

// Stan przejściowy: świeża synchronizacja + brak powiązania = kod 0.
// To JEDYNY stan, który dokańcza się sam (B15/B3) — i jedyny, który wolno
// zdegradować do komunikatu.
php(`Aai_Platnosci_Zapis::powiazanie_ustaw('${KURS}', ${produkt});`);
const swiezy = wp("aai-platnosci", "sprawdz");
sprawdz(swiezy.kod === 0, `po odtworzeniu powiązania kontrola czerwona: ${swiezy.err}`);

const zdrowa = wp("aai-platnosci", "sprawdz");
sprawdz(zdrowa.kod === 0, `po przywróceniu wszystkiego kontrola dalej czerwona (kod ${zdrowa.kod}): ${zdrowa.err}`);

/* ── 6. B4: dwa produkty z tym samym uuid; zajęty produkt ───────────── */

const drugi = Number(wp("post", "create", "--post_type=product", "--post_status=draft", "--post_title=Smoke P2 sobowtór", "--porcelain").out);
php(`update_post_meta(${drugi}, '_aai_platnosci_kurs_uuid', '${KURS}');`);
const duplikat = wp("aai-platnosci", "sprawdz");
sprawdz(duplikat.kod === 1, `DWA produkty z tym samym uuid — kontrola oddała kod ${duplikat.kod}, oczekiwano 1 (B4)`);
sprawdz(
  wartosc(`Aai_Platnosci_Zapis::powiazanie_ustaw('aaaa0000-0000-4000-8000-0000000pr999', ${produkt}) ? 'true' : 'false'`) === "false",
  "produkt zajęty przez inny kurs dał się powiązać po raz drugi (B4)"
);
wp("post", "delete", String(drugi), "--force");

/* ── 7. pięć stanów z tabeli 9.3 ────────────────────────────────────── */

zapiszKurs("published", 0);
wp("aai-platnosci", "sync", SLUG);
sprawdz(wp("post", "get", String(produkt), "--field=post_status").out === "draft", "kurs z ceną 0: produkt nie zszedł na draft");
sprawdz(wartosc(`get_post_meta(${tutor}, '_tutor_course_price_type', true)`) === "free", "kurs z ceną 0: price_type nie jest free");

zapiszKurs("published", 19900);
wp("aai-platnosci", "sync", SLUG);
sprawdz(wp("post", "get", String(produkt), "--field=post_status").out === "publish", "powrót do ceny > 0 nie przywrócił publikacji produktu");

php(`update_post_meta(${tutor}, '_tutor_course_price_type', 'paid');`);
zapiszKurs("draft", 19900);
wp("aai-platnosci", "sync", SLUG);
sprawdz(wp("post", "get", String(produkt), "--field=post_status").out === "draft", "szkic kursu: produkt nie zszedł na draft");
sprawdz(
  wartosc(`get_post_meta(${tutor}, '_tutor_course_price_type', true)`) === "paid",
  "szkic kursu ZMIENIŁ price_type — tabela 9.3 mówi: bez zmian (szkicu nie ogłaszamy darmowym)"
);

zapiszKurs("archived", 19900);
wp("aai-platnosci", "sync", SLUG);
sprawdz(wp("post", "get", String(produkt), "--field=post_status").out === "draft", "kurs archived: produkt nie jest draft");
sprawdz(wartosc(`get_post_meta(${tutor}, '_tutor_course_price_type', true)`) === "free", "kurs archived: price_type nie jest free");

/* ── 8. osierocony produkt w publish = BŁĄD kontroli ────────────────── */

php(`$p = wc_get_product(${produkt}); $p->set_status('publish'); $p->save();`);
const sierota = wp("aai-platnosci", "sprawdz");
sprawdz(sierota.kod === 1, `osierocony produkt w publish (kupowalny!) — kontrola oddała kod ${sierota.kod}, oczekiwano 1`);

/* ── 9. usunięcie kursu: produkt draft, ale ISTNIEJE ────────────────── */

php(`Aai_Sklep_Zapis::usun_kurs('${KURS}', 'smoke-p2', true);`);
sprawdz(wp("post", "get", String(produkt), "--field=post_status").out === "draft", "po usunięciu kursu produkt nie jest draft");
sprawdz(wp("post", "get", String(produkt), "--field=ID").out === String(produkt), "po usunięciu kursu produkt ZNIKNĄŁ — kasowanie jest zakazane (niezmiennik 13)");

/* ── sprzątanie + rachunek sumienia ─────────────────────────────────── */

php(`Aai_Platnosci_Zapis::powiazanie_usun('${KURS}');`);
wp("post", "delete", String(produkt), "--force");
if (tutor > 0) wp("post", "delete", String(tutor), "--force");

const powiazaniaPo = Number(
  php('global $wpdb; echo (int) $wpdb->get_var("SELECT COUNT(*) FROM " . Aai_Platnosci_Tabele::tabela("powiazania"));')
);
sprawdz(powiazaniaPo === powiazaniaPrzed, `smoke zostawił ślad w powiazania: przed ${powiazaniaPrzed}, po ${powiazaniaPo}`);
sprawdz(liczbaProduktow() === produktowPrzed, `smoke zostawił produkt: przed ${produktowPrzed}, po ${liczbaProduktow()}`);
const finalna = wp("aai-platnosci", "sprawdz");
sprawdz(finalna.kod === 0, `po sprzątaniu kontrola czerwona (kod ${finalna.kod}) — smoke zostawił rozjazd: ${finalna.err}`);

if (bledy.length > 0) {
  console.error(`smoke-wp-produkty: ${bledy.length} z ${sprawdzen} sprawdzeń padło:`);
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}
console.log(`smoke-wp-produkty: OK (${sprawdzen} sprawdzeń na żywej instalacji).`);
