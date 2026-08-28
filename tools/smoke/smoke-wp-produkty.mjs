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
sprawdz(php(`echo get_post_meta(${tutor}, '_tutor_course_price_type', true);`).endsWith("paid"), "wpis Tutora nie ma price_type=paid");
sprawdz(
  Number(php(`echo (int) get_post_meta(${tutor}, '_tutor_course_product_id', true);`)) === produkt,
  "wpis Tutora nie wskazuje naszego produktu"
);
sprawdz(php(`$p = wc_get_product(${produkt}); echo $p->get_regular_price('edit');`).endsWith("199.00"), "cena regularna != 199.00 (grosze / 100)");
sprawdz(php(`$p = wc_get_product(${produkt}); echo $p->get_price('edit');`).endsWith("199.00"), "cena liczona w kasie (_price) != 199.00 — zapis metą zamiast save()? (B5)");
sprawdz(php(`$p = wc_get_product(${produkt}); echo $p->get_catalog_visibility();`).endsWith("hidden"), "produkt widoczny w katalogu Woo (decyzja właściciela: hidden)");
sprawdz(php(`$p = wc_get_product(${produkt}); echo $p->get_sold_individually('edit') ? 'tak' : 'nie';`).endsWith("tak"), "produkt bez _sold_individually (B14)");
sprawdz(php(`echo get_post_meta(${produkt}, '_tutor_product', true);`).endsWith("yes"), "produkt bez _tutor_product");

/* ── 2. BRAMKA P2: trzy przebiegi, odcisk niezmieniony ──────────────── */

wp("aai-platnosci", "sync");
const poDrugim = { produktow: liczbaProduktow(), odcisk: odciskProduktu(produkt) };
wp("aai-platnosci", "sync");
const poTrzecim = { produktow: liczbaProduktow(), odcisk: odciskProduktu(produkt) };
sprawdz(poDrugim.produktow === poTrzecim.produktow, `liczba produktów rośnie między przebiegami (${poDrugim.produktow} → ${poTrzecim.produktow})`);
sprawdz(
  poDrugim.odcisk === poTrzecim.odcisk,
  "sha256 wiersza produktu z meta ZMIENIŁ SIĘ między 2. a 3. przebiegiem — synchronizacja zapisuje mimo braku zmian"
);
const trzeci = wp("aai-platnosci", "sync");
sprawdz(/bez zmian [1-9]/.test(trzeci.out), `czwarty przebieg nie melduje „bez zmian": ${trzeci.out}`);

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

php(`delete_post_meta(${produkt}, '_tutor_product');`);
wp("post", "update", String(produkt), "--post_excerpt=smoke-cudzy-zapis");
sprawdz(
  php(`echo get_post_meta(${produkt}, '_tutor_product', true);`).endsWith("yes"),
  "po CUDZYM zapisie produktu znacznik _tutor_product nie wrócił — hak B13 nie działa"
);

/* ── 5. kontrola: kod 1 na każdym rodzaju rozjazdu ──────────────────── */

function probaCzerwona(psuj, przywroc, opis) {
  php(psuj);
  const wynik = wp("aai-platnosci", "sprawdz");
  php(przywroc);
  sprawdz(wynik.kod === 1, `${opis} — kontrola oddała kod ${wynik.kod}, oczekiwano 1`);
}
probaCzerwona(
  `$p = wc_get_product(${produkt}); $p->set_regular_price('1.00'); $p->save();`,
  `$p = wc_get_product(${produkt}); $p->set_regular_price('199.00'); $p->save();`,
  "zepsuta cena regularna"
);
// Przywrócenie idzie przez SYNC — dowód, że naprawa działa tą samą drogą,
// którą kontrola zaleca („uruchom sync"). Pierwsza wersja synchronizacji
// tego nie umiała (regularna bez zmian = brak zapisu) i smoke to złapał.
probaCzerwona(
  `update_post_meta(${produkt}, '_price', '1.00'); wc_delete_product_transients(${produkt});`,
  `Aai_Platnosci_Zapis::synchronizuj_kurs('${KURS}');`,
  "cena liczona w kasie rozjechana z regularną (B5 — zapis metą)"
);
sprawdz(
  php(`$p = wc_get_product(${produkt}); echo $p->get_price('edit');`).endsWith("199.00"),
  "sync NIE naprawił ceny liczonej w kasie — kontrola każe uruchomić sync, więc sync musi to umieć"
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
const zdrowa = wp("aai-platnosci", "sprawdz");
sprawdz(zdrowa.kod === 0, `po przywróceniu wszystkiego kontrola dalej czerwona (kod ${zdrowa.kod}): ${zdrowa.err}`);

/* ── 6. B4: dwa produkty z tym samym uuid; zajęty produkt ───────────── */

const drugi = Number(wp("post", "create", "--post_type=product", "--post_status=draft", "--post_title=Smoke P2 sobowtór", "--porcelain").out);
php(`update_post_meta(${drugi}, '_aai_platnosci_kurs_uuid', '${KURS}');`);
const duplikat = wp("aai-platnosci", "sprawdz");
sprawdz(duplikat.kod === 1, `DWA produkty z tym samym uuid — kontrola oddała kod ${duplikat.kod}, oczekiwano 1 (B4)`);
sprawdz(
  php(`echo Aai_Platnosci_Zapis::powiazanie_ustaw('aaaa0000-0000-4000-8000-0000000pr999', ${produkt}) ? 'true' : 'false';`).endsWith("false"),
  "produkt zajęty przez inny kurs dał się powiązać po raz drugi (B4)"
);
wp("post", "delete", String(drugi), "--force");

/* ── 7. pięć stanów z tabeli 9.3 ────────────────────────────────────── */

zapiszKurs("published", 0);
wp("aai-platnosci", "sync", SLUG);
sprawdz(wp("post", "get", String(produkt), "--field=post_status").out === "draft", "kurs z ceną 0: produkt nie zszedł na draft");
sprawdz(php(`echo get_post_meta(${tutor}, '_tutor_course_price_type', true);`).endsWith("free"), "kurs z ceną 0: price_type nie jest free");

zapiszKurs("published", 19900);
wp("aai-platnosci", "sync", SLUG);
sprawdz(wp("post", "get", String(produkt), "--field=post_status").out === "publish", "powrót do ceny > 0 nie przywrócił publikacji produktu");

php(`update_post_meta(${tutor}, '_tutor_course_price_type', 'paid');`);
zapiszKurs("draft", 19900);
wp("aai-platnosci", "sync", SLUG);
sprawdz(wp("post", "get", String(produkt), "--field=post_status").out === "draft", "szkic kursu: produkt nie zszedł na draft");
sprawdz(
  php(`echo get_post_meta(${tutor}, '_tutor_course_price_type', true);`).endsWith("paid"),
  "szkic kursu ZMIENIŁ price_type — tabela 9.3 mówi: bez zmian (szkicu nie ogłaszamy darmowym)"
);

zapiszKurs("archived", 19900);
wp("aai-platnosci", "sync", SLUG);
sprawdz(wp("post", "get", String(produkt), "--field=post_status").out === "draft", "kurs archived: produkt nie jest draft");
sprawdz(php(`echo get_post_meta(${tutor}, '_tutor_course_price_type', true);`).endsWith("free"), "kurs archived: price_type nie jest free");

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
