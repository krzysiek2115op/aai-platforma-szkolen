/**
 * Smoke ścieżki zakupu — bramka kroku P3b.
 *
 * Mierzy ZACHOWANIE na żywej instalacji, na WŁASNYM kursie testowym
 * (prawdziwe kursy tylko czyta) i sprząta po sobie do zera — razem
 * z produktem, bo szew zakłada go każdemu kursowi, a smoke, który go
 * zostawia, każe następnym przebiegom mierzyć własne śmieci (sweep P2).
 *
 * CO SPRAWDZA:
 *  1. **Cena z jednego źródła (K2)**: bez promocji strona i JSON-LD pokazują
 *     cenę katalogową; po ustawieniu promocji w WooCommerce OBA pokazują
 *     cenę promocyjną. Cena w naszej tabeli nie drgnie — kreator zostaje
 *     przy katalogowej (rozstrzygnięcie 4 właściciela).
 *  2. **Cztery stany przycisku**: sprzedaż zamknięta → kontakt; otwarta
 *     → kasa z produktem; zapis w toku → „Zamówienie w toku”; zapis
 *     ukończony → „Przejdź do kursu”.
 *  3. **Spójność przycisku z ofertą**: `InStock` dokładnie wtedy, gdy
 *     przycisk prowadzi do kasy, `PreOrder` gdy do kontaktu.
 *  4. **Domykanie zamówienia (E5)**: `bacs` + `payment_complete()` oraz
 *     ręczne `on-hold → processing` kończą jako `completed` Z DOSTĘPEM;
 *     zamówienie MIESZANE i zamówienie z samym cudzym produktem zostają
 *     w `processing`.
 *  5. **B16 — powtórny zakup**: drugie zamówienie tego samego kursu nie
 *     tworzy drugiego zapisu ani nie odbiera dostępu.
 *
 * KAŻDY odczyt dostępu idzie OSOBNYM żądaniem: `is_enrolled()` w tym samym
 * żądaniu, w którym powstał zapis, oddaje `false` (pułapka z W6).
 *
 * WYMAGA środowiska: `cd wordpress/srodowisko && ./postaw.sh`.
 * Poza CI (CI nie ma podmana).
 *
 * Użycie: node tools/smoke/smoke-wp-zakup.mjs
 */
import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ilePoczty, migawkaPoczty, pocztaOdpowiada, sprzatnijPoczte } from "./poczta.mjs";
import { migawkaDziennika, sprzatnijDziennik, ileWpisow } from "./dziennik.mjs";

const STACK = process.env.STACK_NAZWA ?? "aai_wp";
const KONTENER = `${STACK}_cli`;
const BAZOWY = process.env.WP_ADRES ?? "http://127.0.0.1:8892";
const KURS = "aaaa0000-0000-4000-8000-0000000p3b09";
const KURS_DRUGI = "aaaa0000-0000-4000-8000-0000000p3b10";
const SLUG = "smoke-wp-zakup";
const OPCJA_SPRZEDAZ = "aai_platnosci_sprzedaz_otwarta";

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

/*
 * HIGIENA DZIENNIKA LOGOWAŃ (N13). Ta bramka loguje się do instalacji,
 * więc od kroku T2 KAŻDY jej przebieg zostawia wpisy w dzienniku
 * Pluginu 3 — zmierzone. Bez sprzątania licznik nieudanych prób
 * z 7 dni, czyli jedyna funkcja alarmowa ekranu monitoringu, pokazywałby
 * serie wyprodukowane przez nasze własne testy.
 */
const _dziennikPrzed = ileWpisow(php);
const _dziennikMigawka = migawkaDziennika(php);

/**
 * Wartość z PHP w nawiasach klamrowych — porównywana RÓWNOŚCIĄ.
 * Nawiasy wokół wyrażenia są konieczne: konkatenacja `.` wiąże w PHP mocniej
 * niż `?:`, więc bez nich każdy warunek oddawałby gałąź prawdziwą (złapane
 * przy P2 własnym testem).
 */
const wartosc = (wyrazenie) => {
  const out = wp("eval", `echo '{' . ( ${wyrazenie} ) . '}';`).out;
  const m = out.match(/\{([^}]*)\}\s*$/);
  return m ? m[1] : out;
};

/** Strona pobrana `curl`-em, sklejona w jedną linię — atrybuty bywają łamane na wiersze. */
function strona(sciezka) {
  try {
    return execFileSync("curl", ["-s", "-L", `${BAZOWY}${sciezka}`], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 })
      .split("\n")
      .join(" ");
  } catch {
    return "";
  }
}

/**
 * Ceny WYCIĄGANE Z KLAS i porównywane wzorcem CAŁEJ wartości.
 *
 * Pierwsza wersja pytała `html.includes("99,00 zł")` i była ŚLEPA: napis
 * „199,00 zł” ZAWIERA „99,00 zł”, więc sprawdzenie przechodziło także wtedy,
 * gdy strona pokazywała cenę katalogową. Złapane własnym testem negatywnym —
 * ta sama klasa co `endsWith("199.00")` przy P2.
 */
const wartosciKlasy = (html, klasa) => [
  ...new Set(
    (html.match(new RegExp(`${klasa}">[^<]*`, "g")) ?? []).map((c) => c.replace(`${klasa}">`, "").trim())
  ),
];
const jestCena = (lista, zlote) => lista.some((c) => new RegExp(`^${zlote},00\\s*zł$`, "u").test(c));

const dostepnoscZeStrony = (html) => [...new Set(html.match(/"availability":"[^"]*"/g) ?? [])].join(",");
const adresyCta = (html) =>
  [...new Set((html.match(/aai-btn-glowny[^>]{0,240}?href="[^"]*"/g) ?? []).map((a) => a.match(/href="([^"]*)"/)[1]))];

const sprzedaz = (otwarta) => php(`update_option( '${OPCJA_SPRZEDAZ}', '${otwarta ? "tak" : ""}' ); echo 'ok';`);

/* ── stan wyjściowy ─────────────────────────────────────────────────── */

const KLIENT = Number(php(`$u = get_user_by( 'login', 'klient-test' ); echo $u ? (int) $u->ID : 0;`));
if (KLIENT <= 0) {
  console.error(
    "smoke-wp-zakup: brak konta `klient-test` — uruchom `npm run wp:klient`. Bez niego mierzyłbym stan administratora, który ma dostęp do wszystkiego z definicji."
  );
  process.exit(1);
}
const liczba = (typ) =>
  Number(php(`global $wpdb; echo (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type='${typ}'" );`));
/**
 * Ile zamówień jest w instalacji — pytane tak, żeby odpowiedź nie kłamała.
 *
 * BLAD-026. Poprzednia wersja liczyła `SELECT COUNT(*) FROM wp_posts WHERE
 * post_type='shop_order'` i oddawała ZERO, bo instalacja stoi na HPOS:
 * zamówienia mieszkają w `wp_wc_orders`, a tamta tabela jest pusta
 * z definicji. Rachunek sumienia porównywał więc 0 z 0 i przechodził
 * niezależnie od tego, ile śmieci smoke zostawił — narosło ich w ten
 * sposób 146, wszystkie na koncie `klient-test`, czyli tym, na którym
 * właściciel ogląda sklep oczami klienta.
 *
 * `status => 'any'` TEŻ NIE WYSTARCZY: zmierzone na żywej instalacji —
 * oddaje 194 przy 195 wierszach w tabeli, bo pomija `checkout-draft`
 * (porzuconą kasę), choć Woo zna ten status. Pytamy więc o JAWNĄ listę
 * `wc_get_order_statuses()`, która daje dokładnie tyle, ile jest.
 */
const liczbaZamowien = () =>
  Number(
    php(
      "echo (int) count( wc_get_orders( array( 'limit' => -1, 'return' => 'ids'," +
        " 'status' => array_keys( wc_get_order_statuses() ) ) ) );"
    )
  );

const powiazan = () =>
  Number(php(`global $wpdb; echo (int) $wpdb->get_var( "SELECT COUNT(*) FROM " . Aai_Platnosci_Tabele::tabela( 'powiazania' ) );`));

/*
 * ZAPISY NA KURSY LICZONE GLOBALNIE. Sprzątanie po WŁASNYM kursie
 * (`post_parent = tutor`) nie widzi zapisu, który powstał na cudzym — a taki
 * właśnie został po zamówieniu #2152 (wpis #2153 zawyżał licznik zapisanych
 * na prawdziwy Kurs 1). Kasowanie zamówienia zapisu NIE kasuje.
 */
const zapisowWszystkich = () =>
  Number(php(`global $wpdb; echo (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type='tutor_enrolled'" );`));

const produktowPrzed = liczba("product");
const powiazanPrzed = powiazan();
const zamowienPrzed = liczbaZamowien();
const zapisowWszystkichPrzed = zapisowWszystkich();
const sprzedazPrzed = php(`echo (string) get_option( '${OPCJA_SPRZEDAZ}', '' );`);
const sprzedazIstniala = php(`echo get_option( '${OPCJA_SPRZEDAZ}', null ) === null ? 'nie' : 'tak';`) === "tak";

/*
 * MIGAWKA POCZTY. Ten smoke składa i domyka zamówienia, więc WooCommerce
 * i nasza warstwa dostarczania wysyłają wiadomości — zmierzone: 21 na
 * przebieg. Do 0.53.0 zostawały w skrzynce na zawsze i po kilku bramkach
 * właściciel szukał swojego maila wśród cudzych. Sprzątamy je na końcu,
 * kasując WYŁĄCZNIE to, co przyszło po migawce (`tools/smoke/poczta.mjs`).
 */
if (!(await pocztaOdpowiada())) {
  console.error(
    "smoke-wp-zakup: łapacz poczty nie odpowiada. Postaw środowisko: cd wordpress/srodowisko && ./postaw.sh"
  );
  process.exit(1);
}
const migawka = await migawkaPoczty();
const pocztyPrzed = await ilePoczty();

/* ── scena: kurs testowy + cudzy produkt ────────────────────────────── */

php(
  `$k = array( 'id' => '${KURS}', 'slug' => '${SLUG}', 'title' => 'Smoke zakup', 'type' => 'kurs',` +
    ` 'short_desc' => 'smoke', 'price_grosze' => 19900, 'cover_url' => null, 'status' => 'published',` +
    ` 'badge' => null, 'level' => null, 'sekcje' => array(), 'moduly' => array() );` +
    ` Aai_Sklep_Zapis::zapisz_kurs( $k, 'smoke-p3b', true ); echo 'ok';`
);
const produkt = Number(php(`echo (int) Aai_Platnosci_Zapis::produkt_kursu( '${KURS}' );`));
const tutor = Number(php(`echo (int) Aai_Platnosci_Zapis::kurs_tutora( '${KURS}' );`));
const obcy = Number(
  php(
    `$p = new WC_Product_Simple(); $p->set_name( 'Smoke obcy' ); $p->set_regular_price( '50' ); $p->set_status( 'publish' ); $p->save(); echo (int) $p->get_id();`
  )
);
sprawdz(produkt > 0 && tutor > 0, "scena nie powstała (produkt albo kopia w Tutorze) — dalsze pomiary byłyby ślepe");

const kasujZapisy = () =>
  php(
    `global $wpdb; $wpdb->query( $wpdb->prepare( "DELETE FROM {$wpdb->posts} WHERE post_type='tutor_enrolled' AND post_parent = %d", ${tutor} ) ); echo 'ok';`
  );
const zapisow = () =>
  Number(
    php(
      `global $wpdb; echo (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type='tutor_enrolled' AND post_parent = %d", ${tutor} ) );`
    )
  );
const maDostep = () => wartosc(`tutor_utils()->is_enrolled( ${tutor}, ${KLIENT} ) ? 'tak' : 'nie'`) === "tak";
const statusZamowienia = (id) => wartosc(`wc_get_order( ${id} )->get_status()`);

/** Zamówienie z pozycjami. `domknij` = ścieżka bramki (`payment_complete`). */
function zamowienie(produkty, status, domknij = false) {
  const dodaj = produkty.map((id) => `$o->add_product( wc_get_product( ${id} ), 1 );`).join(" ");
  const kroki = domknij ? `$o->save(); $o->payment_complete();` : `$o->set_status( '${status}' ); $o->save();`;
  return Number(
    php(
      `$o = wc_create_order( array( 'customer_id' => ${KLIENT} ) ); ${dodaj}` +
        ` $o->set_payment_method( 'bacs' ); $o->calculate_totals(); ${kroki} echo (int) $o->get_id();`
    )
  );
}
/** Przycisk widziany przez KONKRETNEGO oglądającego (strona z curl-a jest zawsze gościem). */
const cta = (uid) =>
  php(
    `wp_set_current_user( ${uid} ); $k = Aai_Sklep_Odczyt::szczegoly_kursu( '${SLUG}' );` +
      ` $c = Aai_Sklep_Widok::cta_kursu( $k ); echo $c['napis'] . '|' . $c['adres'];`
  );

const zamowienia = [];
try {
  /* ── 1. cena z jednego źródła (K2) ───────────────────────────────── */

  sprzedaz(false);
  let html = strona(`/szkolenia/${SLUG}/`);
  let naStronie = wartosciKlasy(html, "aai-oferta-cena");
  sprawdz(jestCena(naStronie, "199"), `bez promocji strona nie pokazuje ceny katalogowej; widziane: ${naStronie.join(" | ")}`);
  sprawdz(html.includes('"price":"199.00"'), "bez promocji JSON-LD nie podaje ceny katalogowej");

  php(`$p = wc_get_product( ${produkt} ); $p->set_sale_price( '99.00' ); $p->save(); echo 'ok';`);
  html = strona(`/szkolenia/${SLUG}/`);
  naStronie = wartosciKlasy(html, "aai-oferta-cena");
  sprawdz(
    jestCena(naStronie, "99"),
    `po promocji strona pokazuje ${naStronie.join(" | ")}, a nie cenę promocyjną — klient zobaczyłby w kasie inną liczbę`
  );
  sprawdz(html.includes('"price":"99.00"'), "po promocji JSON-LD dalej podaje cenę katalogową — rozjazd oferty z treścią strony (K2)");
  sprawdz(
    wartosc(`(int) Aai_Sklep_Odczyt::szczegoly_kursu( '${SLUG}' )['price_grosze']`) === "19900",
    "promocja w WooCommerce zmieniła cenę w NASZEJ tabeli — kreator ma zostać przy cenie katalogowej"
  );
  const cenyKart = wartosciKlasy(strona("/szkolenia/"), "aai-karta-cena");
  sprawdz(
    jestCena(cenyKart, "99"),
    `karta w katalogu nie pokazuje ceny promocyjnej (widziane: ${cenyKart.join(" | ")}) — klient widziałby dwie różne ceny tego samego kursu`
  );
  php(`$p = wc_get_product( ${produkt} ); $p->set_sale_price( '' ); $p->save(); echo 'ok';`);

  /* ── 2. cztery stany przycisku + 3. spójność z ofertą ────────────── */

  html = strona(`/szkolenia/${SLUG}/`);
  sprawdz(
    // Ukośnik na końcu jest OPCJONALNY w tej asercji, ale nie w kodzie:
    // instalacja ma `/%postname%/`, więc adres bez ukośnika jest
    // przekierowaniem 301 (naprawione przy teście całości 2026-08-31).
    // Bramka ma pytać „czy prowadzi do kontaktu", a nie utrwalać jeden
    // zapis adresu — inaczej poprawka higieniczna wywraca pomiar.
    adresyCta(html).length > 0 && adresyCta(html).every((a) => /\/kontakt\/?$/.test(a)),
    `przy ZAMKNIĘTEJ sprzedaży przycisk nie prowadzi do kontaktu: ${adresyCta(html).join(" | ")}`
  );
  sprawdz(
    dostepnoscZeStrony(html) === '"availability":"https://schema.org/PreOrder"',
    `przy zamkniętej sprzedaży oferta nie jest PreOrder: ${dostepnoscZeStrony(html)}`
  );

  sprzedaz(true);
  html = strona(`/szkolenia/${SLUG}/`);
  sprawdz(
    adresyCta(html).length > 0 && adresyCta(html).every((a) => a.includes(`add-to-cart=${produkt}`)),
    `przy OTWARTEJ sprzedaży przycisk nie prowadzi do kasy z produktem: ${adresyCta(html).join(" | ")}`
  );
  sprawdz(
    dostepnoscZeStrony(html) === '"availability":"https://schema.org/InStock"',
    `przy otwartej sprzedaży oferta nie jest InStock: ${dostepnoscZeStrony(html)} — strona mówi „kup teraz” przy ofercie niedostępnej (K2)`
  );
  sprawdz(cta(0).includes(`add-to-cart=${produkt}`), `gość przy otwartej sprzedaży nie dostaje kasy: ${cta(0)}`);

  /* ── 2b. stany po ANULOWANIU i przy produkcie niekupowalnym ──────── */

  /*
   * Zamówienie anulowane NIE MOŻE zostawić klienta z „Zamówieniem w toku”
   * na zawsze: Tutor tworzy zapis przy składaniu zamówienia i nigdy go nie
   * kasuje — anulowanie tylko przestawia mu status. Wersja pytająca o samo
   * ISTNIENIE zapisu odbierała takiemu klientowi przycisk zakupu bezpowrotnie
   * (znalezisko przeglądu P3b, potwierdzone uruchomieniowo).
   */
  kasujZapisy();
  const zamAnulowane = zamowienie([produkt], "on-hold");
  zamowienia.push(zamAnulowane);
  php(`$o = wc_get_order( ${zamAnulowane} ); $o->set_status( 'cancelled' ); $o->save(); echo 'ok';`);
  sprawdz(
    cta(KLIENT).includes(`add-to-cart=${produkt}`),
    `po ANULOWANIU zamówienia klient widzi „${cta(KLIENT)}” zamiast możliwości ponownego zakupu — zapis Tutora zostaje na zawsze, więc pytanie o samo jego istnienie blokuje sprzedaż`
  );
  kasujZapisy();

  /*
   * Produkt `publish` z PUSTĄ ceną jest dla WooCommerce niekupowalny
   * (`is_purchasable()` wymaga niepustej ceny), a koszyk odmawia dodania.
   * Sam status `publish` to za mało, żeby obiecywać zakup — przycisk
   * prowadziłby do kasy, która odmówi, a oferta deklarowałaby `InStock`.
   */
  php(`$p = wc_get_product( ${produkt} ); $p->set_regular_price( '' ); $p->set_price( '' ); $p->save(); echo 'ok';`);
  sprawdz(
    /\/kontakt\/?$/.test(cta(0)),
    `produkt z pustą ceną (niekupowalny w WooCommerce) dalej wysyła klienta do kasy: ${cta(0)}`
  );
  sprawdz(
    wartosc(`apply_filters( 'aai_sklep_dostepnosc_kursu', 'https://schema.org/PreOrder', Aai_Sklep_Odczyt::szczegoly_kursu( '${SLUG}' ) )`) ===
      "https://schema.org/PreOrder",
    "produkt niekupowalny dalej ma w danych strukturalnych InStock — oferta obiecuje zakup, którego WooCommerce odmówi"
  );
  php(`$p = wc_get_product( ${produkt} ); $p->set_regular_price( '199.00' ); $p->save(); echo 'ok';`);
  sprawdz(wartosc(`wc_get_product( ${produkt} )->is_purchasable() ? 'tak' : 'nie'`) === "tak", "przywrócenie ceny nie uczyniło produktu kupowalnym — dalsze pomiary byłyby ślepe");

  const zamOnHold = zamowienie([produkt], "on-hold");
  zamowienia.push(zamOnHold);
  sprawdz(
    cta(KLIENT).startsWith("Zamówienie w toku|"),
    `klient z zamówieniem czekającym na wpłatę widzi „${cta(KLIENT)}” zamiast informacji o zamówieniu — mógłby kupić drugi raz`
  );

  php(`$o = wc_get_order( ${zamOnHold} ); $o->set_status( 'completed' ); $o->save(); echo 'ok';`);
  sprawdz(cta(KLIENT).startsWith("Przejdź do kursu|"), `klient, który MA kurs, widzi „${cta(KLIENT)}” zamiast przejścia do materiału`);
  sprawdz(maDostep(), "ręczne domknięcie zamówienia nie dało dostępu");

  /* ── 5. B16: powtórny zakup nie psuje dostępu ────────────────────── */

  const zapisowPrzed = zapisow();
  const zamPowtorne = zamowienie([produkt], "", true);
  zamowienia.push(zamPowtorne);
  sprawdz(zapisow() === zapisowPrzed, `powtórny zakup tego samego kursu utworzył drugi zapis (${zapisowPrzed} → ${zapisow()}) — B16`);
  sprawdz(maDostep(), "po powtórnym zakupie klient STRACIŁ dostęp (B16)");

  /* ── 4. domykanie zamówienia (E5) ────────────────────────────────── */

  kasujZapisy();
  const zamAuto = zamowienie([produkt], "", true);
  zamowienia.push(zamAuto);
  sprawdz(
    statusZamowienia(zamAuto) === "completed",
    `zamówienie kursu opłacone metodą z czarnej listy Tutora zostało w „${statusZamowienia(zamAuto)}” — klient zapłacił i nie ma kursu (E5)`
  );
  sprawdz(maDostep(), "po opłaceniu zamówienia klient nie ma dostępu do kursu");

  kasujZapisy();
  const zamRecznie = zamowienie([produkt], "on-hold");
  zamowienia.push(zamRecznie);
  /*
   * KOLEJNOŚĆ PRZEJŚĆ STATUSU, mierzona ZDARZENIAMI. Domknięcie wykonane
   * od razu w haku biegło W ŚRODKU cudzego przejścia, więc reszta TAMTEGO
   * przejścia dojeżdżała już po nadaniu `completed` i klient dostawał mail
   * „zrealizowane” przed „w realizacji” (znalezisko przeglądu P3b).
   *
   * PIERWSZA WERSJA CZYTAŁA NOTATKI ZAMÓWIENIA I SZUKAŁA W NICH „On hold
   * to Processing”. Padła w chwili, w której instalacja dostała polski
   * język (N3/0.51.0): notatki Woo są tłumaczone, więc wzorzec przestał
   * cokolwiek znajdować i smoke meldował odwróconą kolejność przy
   * kolejności poprawnej. To ta sama rodzina co „wzorzec na napis”,
   * tylko w wymiarze lokalizacji — pomiar oparty na CUDZYM TEKŚCIE ma
   * datę ważności. Pytamy więc o zdarzenia: hak notuje każdą parę
   * `z → na`, a my sprawdzamy ich kolejność.
   */
  php(
    `delete_option( 'aai_smoke_przejscia' );` +
      ` add_action( 'woocommerce_order_status_changed', function ( $id, $z, $na ) {` +
      ` $l = (array) get_option( 'aai_smoke_przejscia', array() ); $l[] = $z . '>' . $na;` +
      ` update_option( 'aai_smoke_przejscia', $l ); }, 1, 3 );` +
      ` $o = wc_get_order( ${zamRecznie} ); $o->set_status( 'processing' ); $o->save(); echo 'ok';`
  );
  const przejscia = php(`echo implode( ' ~~ ', (array) get_option( 'aai_smoke_przejscia', array() ) ); delete_option( 'aai_smoke_przejscia' );`);
  const poz = (igla) => przejscia.indexOf(igla);
  sprawdz(
    poz("on-hold>processing") >= 0,
    `nie widzę przejścia on-hold → processing, więc pomiar kolejności leciałby po pustce: ${przejscia}`
  );
  sprawdz(
    poz("processing>completed") > poz("on-hold>processing"),
    `przejścia statusu są w odwróconej kolejności — nasze domknięcie dojechało PRZED cudzym przejściem, więc klient dostaje „zrealizowane” przed „w realizacji”: ${przejscia}`
  );
  sprawdz(
    statusZamowienia(zamRecznie) === "completed",
    `ręczne przestawienie zamówienia kursu na „w realizacji” zostawiło je w „${statusZamowienia(zamRecznie)}” — właściciel potwierdził wpłatę, a klient nie dostał kursu (E5)`
  );

  const zamMieszane = zamowienie([produkt, obcy], "", true);
  zamowienia.push(zamMieszane);
  sprawdz(
    statusZamowienia(zamMieszane) === "processing",
    `zamówienie MIESZANE ma status „${statusZamowienia(zamMieszane)}” — cudzy towar czeka na wysyłkę, a zamówienie wygląda na zrealizowane`
  );

  /* ── 6. KOSZYK TRZYMA JEDEN KURS (BLAD-023) ──────────────────────── */

  /*
   * Zgłoszenie właściciela z testu ręcznego: „nie da się kupić jednego
   * kursu, zawsze w koszyku są 2". Klik „Dołączam za 299,00 zł" na jednym
   * kursie i „za 349,00 zł" na drugim dawał w kasie **648,00 zł** —
   * przycisk obiecywał jedną kwotę, kasa pokazywała inną.
   *
   * MIERZYMY SESJĄ, NIE API KOSZYKA. `WC()->cart->add_to_cart()` nie woła
   * `woocommerce_add_to_cart_validation` (zmierzone przy P4), a koszyk
   * gościa jest niewidzialny dla zalogowanego (P3a) — więc jedyny uczciwy
   * pomiar to prawdziwe żądania HTTP w jednej sesji ciasteczkowej,
   * odczytane tym samym Store API, którym karmi się blok kasy.
   */
  {
    const jar = join(tmpdir(), `aai-koszyk-${process.pid}.txt`);
    const zada = (sciezka) =>
      execFileSync("curl", ["-s", "-L", "-o", "/dev/null", "-c", jar, "-b", jar, `${BAZOWY}${sciezka}`], {
        encoding: "utf8",
        maxBuffer: 8 * 1024 * 1024,
      });
    const koszyk = () =>
      JSON.parse(
        execFileSync("curl", ["-s", "-b", jar, `${BAZOWY}/wp-json/wc/store/v1/cart`], {
          encoding: "utf8",
          maxBuffer: 8 * 1024 * 1024,
        })
      );
    try {
      rmSync(jar, { force: true });
      sprzedaz(true);
      // Cudzy towar wchodzi PIERWSZY — to on jest dowodem, że reguła
      // dotyczy wyłącznie naszych kursów.
      zada(`/?add-to-cart=${obcy}`);
      zada(`/?add-to-cart=${produkt}`);
      const poJednym = koszyk();
      sprawdz(
        poJednym.items.filter((i) => i.id === produkt).length === 1,
        `po dodaniu kursu nie ma go w koszyku — dalszy pomiar byłby ślepy (pozycje: ${poJednym.items.map((i) => i.id).join(", ")})`
      );

      // Drugi NASZ kurs: pierwszy ma ustąpić, cudzy towar ma zostać.
      /*
       * UUID drugiego kursu ma DOKŁADNIE 36 znaków. Pierwsza wersja
       * doklejała `-2` do uuid pierwszego i dostawała 38 — a kolumna to
       * `char(36)`, więc powiązanie zapisywało się obcięte i
       * `czy_produkt_kursu()` nie poznawało własnego produktu. Smoke
       * padał wtedy komunikatem „wraca BLAD-023", choć reguła działała
       * poprawnie (sprawdzone równolegle w przeglądarce). Test, który
       * kłamie o kodzie, jest gorszy niż brak testu.
       */
      const drugi = Number(
        php(
          `$p = new WC_Product_Simple(); $p->set_name( 'Smoke drugi kurs' ); $p->set_regular_price( '77' );` +
            ` $p->set_status( 'publish' ); $p->set_sold_individually( true ); $id = $p->save();` +
            ` Aai_Platnosci_Zapis::powiazanie_ustaw( '${KURS_DRUGI}', (int) $id ); echo (int) $id;`
        )
      );
      try {
        zada(`/?add-to-cart=${drugi}`);
        const po = koszyk();
        const nasze = po.items.filter((i) => i.id === produkt || i.id === drugi).map((i) => i.id);
        sprawdz(
          nasze.length === 1 && nasze[0] === drugi,
          `w koszyku zostało ${nasze.length} naszych kursów (${nasze.join(", ")}) zamiast jednego — wraca BLAD-023: kasa pokaże sumę wszystkich klikniętych`
        );
        sprawdz(
          po.items.some((i) => i.id === obcy),
          "reguła jednego kursu WYRZUCIŁA cudzy produkt z koszyka — nie mamy prawa opróżniać klientowi koszyka z rzeczy, o których nic nie wiemy"
        );
        // Ten sam kurs drugi raz: koszyk bez zmian, zero odmowy Woo.
        zada(`/?add-to-cart=${drugi}`);
        const poPowtorce = koszyk();
        sprawdz(
          poPowtorce.items.filter((i) => i.id === drugi).length === 1 &&
            poPowtorce.items.find((i) => i.id === drugi).quantity === 1,
          "powtórne dodanie tego samego kursu zmieniło koszyk — miało być bez zmian i bez błędu"
        );
        sprawdz(
          poPowtorce.items.length === po.items.length,
          `powtórne kliknięcie zmieniło liczbę pozycji koszyka (${po.items.length} → ${poPowtorce.items.length})`
        );
      } finally {
        php(`Aai_Platnosci_Zapis::powiazanie_usun( '${KURS_DRUGI}' ); $p = wc_get_product( ${drugi} ); if ( $p ) { $p->delete( true ); } echo 'ok';`);
      }
    } finally {
      rmSync(jar, { force: true });
      sprzedaz(false);
    }
  }

  const zamObcy = zamowienie([obcy], "", true);
  zamowienia.push(zamObcy);
  sprawdz(
    statusZamowienia(zamObcy) === "processing",
    `zamówienie z samym CUDZYM produktem ma status „${statusZamowienia(zamObcy)}” — ta wtyczka nie ma prawa dotykać zamówień bez kursów`
  );
} finally {
  /* ── sprzątanie + rachunek sumienia ──────────────────────────────── */

  /*
   * PRZYWRACAMY STAN, NIE „ZAPISUJEMY PUSTĄ WARTOŚĆ". Zmierzone przy teście
   * całości (2026-08-31): na czystej instalacji opcji NIE MA, a `update_option`
   * z pustym łańcuchem zostawiał ją istniejącą — semantycznie to dalej
   * zamknięta sprzedaż, ale stan nie jest ten sam, który zastaliśmy.
   * Ta sama lekcja co w 0.51.0, tylko w drugą stronę.
   */
  if (sprzedazIstniala) {
    php(`update_option( '${OPCJA_SPRZEDAZ}', '${sprzedazPrzed}' ); echo 'ok';`);
  } else {
    php(`delete_option( '${OPCJA_SPRZEDAZ}' ); echo 'ok';`);
  }
  if (zamowienia.length > 0) {
    /*
     * KASUJEMY PRZEZ API ZAMÓWIENIA, nie przez wp_delete_post(). ZMIERZONE
     * na żywej instalacji (BLAD-026): pod HPOS `wp_delete_post()` na
     * identyfikatorze zamówienia NIE KASUJE NICZEGO — nie ma takiego wpisu
     * w `wp_posts`, więc funkcja wychodzi cicho, a zamówienie żyje dalej
     * (`wc_get_order()` oddaje je ze statusem sprzed próby). To była
     * PRAWDZIWA przyczyna 146 zamówień-widm; ślepy licznik tylko ją ukrył.
     */
    php(`foreach ( array( ${zamowienia.join(", ")} ) as $id ) { $o = wc_get_order( $id ); if ( $o ) { $o->delete( true ); } } echo 'ok';`);
    /*
     * DZIENNIK DOSTAW TEŻ JEST NASZYM ŚLADEM (P4). Zamówienia smoke'a
     * przechodzą przez completed, więc warstwa maili odnotowuje im
     * `dostep` i `mail_kursu`. Wiersz po skasowanym zamówieniu to śmieć,
     * a wiersz z pustym wynikiem zapala kontrolę — czyli smoke zostawiał
     * czerwoną instalację (ta sama klasa co produkty-sieroty ze sweepu
     * P2: bramki mierzyłyby własne śmieci).
     */
    php(
      `global $wpdb; $wpdb->query( "DELETE FROM " . Aai_Platnosci_Tabele::tabela( 'dostawy' ) .` +
        ` " WHERE identyfikator IN ( ${zamowienia.join(", ")} )" ); echo 'ok';`
    );
  }
  kasujZapisy();
  php(
    `Aai_Sklep_Zapis::usun_kurs( '${KURS}', 'smoke-p3b', true, true );` +
      ` Aai_Platnosci_Zapis::powiazanie_usun( '${KURS}' );` +
      ` foreach ( array( ${produkt}, ${tutor}, ${obcy} ) as $id ) { if ( $id > 0 && get_post( $id ) ) { wp_delete_post( $id, true ); } } echo 'ok';`
  );
  // Poczta na końcu: kasujemy wyłącznie wiadomości spoza migawki, czyli te,
  // które wysłał ten przebieg. Skrzynka jest wspólna z właścicielem.
  // Wyjątek stąd NIE MOŻE przesłonić prawdziwego błędu z bloku `try`, więc
  // go notujemy zamiast rzucać — rachunek sumienia i tak zapali się poniżej,
  // bo skrzynka nie wróci wtedy do stanu sprzed przebiegu.
  await sprzatnijPoczte(migawka).catch((e) =>
    console.error(`  (sprzątanie poczty nie doszło do skutku: ${e.message})`)
  );
}

sprawdz(liczba("product") === produktowPrzed, `smoke zostawił produkt: przed ${produktowPrzed}, po ${liczba("product")}`);
sprawdz(powiazan() === powiazanPrzed, `smoke zostawił ślad w powiazania: przed ${powiazanPrzed}, po ${powiazan()}`);
sprawdz(liczbaZamowien() === zamowienPrzed, `smoke zostawił zamówienie: przed ${zamowienPrzed}, po ${liczbaZamowien()}`);
sprawdz(
  php(`echo (string) get_option( '${OPCJA_SPRZEDAZ}', '' );`) === sprzedazPrzed,
  "smoke zostawił zmieniony stan sprzedaży — następny przebieg mierzyłby inną instalację niż zastał"
);
sprawdz(
  zapisowWszystkich() === zapisowWszystkichPrzed,
  `smoke zostawił zapis na kurs: przed ${zapisowWszystkichPrzed}, po ${zapisowWszystkich()} — sierota po skasowanym zamówieniu zawyża licznik zapisanych`
);
const pocztyPo = await ilePoczty();
sprawdz(
  pocztyPo === pocztyPrzed,
  `skrzynka nie wróciła do stanu sprzed przebiegu: przed ${pocztyPrzed}, po ${pocztyPo} — ` +
    "bramka albo zostawia własne wiadomości (zmierzone 21 na przebieg), albo kasuje CUDZE"
);
sprawdz(wp("aai-platnosci", "sprawdz").kod === 0, "po sprzątaniu kontrola czerwona — smoke zostawił rozjazd");

/* Sprzątanie po sobie: wyłącznie wiersze powstałe PO starcie tej bramki. */
sprzatnijDziennik(php, _dziennikMigawka);
sprawdz(
  ileWpisow(php) === _dziennikPrzed,
  `bramka zostawiła ślad w dzienniku logowań: przed ${_dziennikPrzed}, po ${ileWpisow(php)} wpisów (N13)`
);

if (bledy.length > 0) {
  console.error(`smoke-wp-zakup: ${bledy.length} z ${sprawdzen} sprawdzeń padło:`);
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}
console.log(`smoke-wp-zakup: OK (${sprawdzen} sprawdzeń na żywej instalacji).`);
