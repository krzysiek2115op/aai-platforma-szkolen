/**
 * Smoke zwrotów — bramka kroku P5.
 *
 * PO CO TO ISTNIEJE. Gwarancji 30 dni nie obiecujemy (decyzja właściciela
 * 2026-08-29, obietnica zdjęta ze stron), ale zwroty i tak się zdarzają:
 * obciążenie zwrotne z banku, podwójna płatność, pomyłkowy zakup,
 * reklamacja. Pytanie brzmi więc nie „czy dawać zwroty", tylko: **czy klik
 * „Refund" w panelu WooCommerce ODBIERA dostęp do kursu**.
 *
 * ODPOWIEDŹ ZMIERZONA (P5, etap E1): TAK, i to bez ani jednej linijki
 * naszego kodu. `WooCommerce::enrolled_courses_status_change()` Tutora
 * ustawia status zapisu równy statusowi zamówienia, a
 * `get_enrolled_courses_ids_by_user()` filtruje po tym statusie. Ten smoke
 * NIE dokłada mechanizmu — **utrwala cudze zachowanie jako nasze
 * wymaganie**, żeby aktualizacja Tutora albo WooCommerce nie zabrała go po
 * cichu. Wtedy sklep oddawałby pieniądze, a kurs zostawałby u klienta,
 * i nic by tego nie zgłosiło.
 *
 * CO SPRAWDZA:
 *  1. **zwrot pełny odbiera dostęp** — na WSZYSTKICH czterech drogach,
 *     którymi klient go widzi: zapis w Tutorze, `is_enrolled`, lista
 *     „Moich kursów", treść lekcji;
 *  2. **przycisk wraca do sprzedaży** po zwrocie, a klient może kupić
 *     ponownie (blokada drugiego zakupu B10 nie może zamknąć drogi
 *     komuś, kto już nie ma kursu);
 *  3. **ponowny zakup przywraca dostęp**;
 *  4. **anulowanie** zamówienia działa jak zwrot;
 *  5. **zwrot CZĘŚCIOWY dostępu NIE odbiera** — to zachowanie
 *     udokumentowane (pułapka 7 schematu), nie usterka: zwrot 50 zł ze
 *     199 zł jest korektą ceny, nie rezygnacją z kursu. Sprawdzamy je,
 *     żeby zmiana po stronie Tutora nie odebrała dostępu komuś, kto
 *     zapłacił niemal całość;
 *  6. **klient dowiaduje się o zwrocie** — mail Woo `customer_refunded_order`
 *     jest włączony i adresowany do klienta, nie do sklepu;
 *  7. **zwrot cudzego produktu nie rusza kursów**;
 *  8. **niezmiennik 14 (kolejność B2)** — dwie sceny: ZŁA kolejność
 *     (`product_id` przed `price_type`) rozdaje kurs za darmo, NASZA nie
 *     tworzy zapisu wcale. Uwaga: schemat zapowiadał tu inny objaw
 *     („zapis ma `pending`"), pomiar pokazał `completed` — szczegóły
 *     w komentarzu przy tym bloku.
 *
 * KAŻDY odczyt dostępu idzie OSOBNYM żądaniem: `is_enrolled()` w tym
 * samym żądaniu, w którym powstał zapis, oddaje `false` (pułapka z W6).
 *
 * WYMAGA środowiska: `cd wordpress/srodowisko && ./postaw.sh`.
 * Poza CI (CI nie ma podmana).
 *
 * Użycie: node tools/smoke/smoke-wp-zwroty.mjs
 */
import { execFileSync } from "node:child_process";
import { ilePoczty, migawkaPoczty, pocztaOdpowiada, sprzatnijPoczte } from "./poczta.mjs";

const STACK = process.env.STACK_NAZWA ?? "aai_wp";
const KONTENER = `${STACK}_cli`;
const KURS = "aaaa0000-0000-4000-8000-00000000p502";
const SLUG = "smoke-wp-zwroty";

const bledy = [];
let sprawdzen = 0;
const sprawdz = (w, opis) => {
  sprawdzen += 1;
  if (!w) bledy.push(opis);
};

function wp(...argumenty) {
  try {
    return { kod: 0, out: execFileSync("podman", ["exec", KONTENER, "wp", "--path=/var/www/html", ...argumenty], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim() };
  } catch (e) {
    return { kod: e.status ?? 1, out: (e.stdout ?? "").toString().trim() };
  }
}
const php = (kod) => wp("eval", kod).out;

/**
 * Wartość z PHP w nawiasach klamrowych — porównywana RÓWNOŚCIĄ.
 * Nawiasy wokół wyrażenia są konieczne: konkatenacja `.` wiąże w PHP
 * mocniej niż `?:`, więc bez nich każdy warunek oddawałby gałąź prawdziwą
 * (złapane własnym testem przy P2).
 */
const wartosc = (wyrazenie) => {
  const out = php(`echo '{' . ( ${wyrazenie} ) . '}';`);
  const m = out.match(/\{([^}]*)\}\s*$/);
  return m ? m[1] : out;
};

const KLIENT = Number(php(`$u = get_user_by( 'login', 'klient-test' ); echo $u ? (int) $u->ID : 0;`));
if (KLIENT <= 0) {
  console.error(
    "smoke-wp-zwroty: brak konta `klient-test` — uruchom `npm run wp:klient`. Bez niego mierzyłbym stan administratora, który ma dostęp do wszystkiego z definicji."
  );
  process.exit(1);
}

const liczbaProduktow = () =>
  Number(php(`global $wpdb; echo (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type='product'" );`));
/** Jawna lista statusów, bo `status => 'any'` pomija `checkout-draft` (BLAD-026). */
const liczbaZamowien = () =>
  Number(
    php(
      "echo (int) count( wc_get_orders( array( 'limit' => -1, 'return' => 'ids'," +
        " 'status' => array_keys( wc_get_order_statuses() ) ) ) );"
    )
  );
const powiazan = () =>
  Number(php(`global $wpdb; echo (int) $wpdb->get_var( "SELECT COUNT(*) FROM " . Aai_Platnosci_Tabele::tabela( 'powiazania' ) );`));
/**
 * Wierszy w dzienniku dostarczenia.
 *
 * Liczony w rachunku sumienia, bo produktów i zamówień NIE WYSTARCZY:
 * zamówienia smoke'a przechodzą przez `completed`, więc warstwa maili
 * odnotowuje im `dostep` i `mail_kursu`. Skasowanie samego zamówienia
 * zostawia wtedy wiersz wskazujący nieistniejący identyfikator — widmo,
 * którego nikt nie policzy. Znalezione sweepem P5 na własnym skrypcie
 * pomiarowym: raportował „środowisko wróciło do stanu wyjściowego", bo
 * porównywał wyłącznie produkty i zamówienia.
 */
const dostaw = () =>
  Number(php(`global $wpdb; echo (int) $wpdb->get_var( "SELECT COUNT(*) FROM " . Aai_Platnosci_Tabele::tabela( 'dostawy' ) );`));

/**
 * Ile wpisów ma kopia PRAWDZIWYCH kursów w Tutorze.
 *
 * PO CO (sweep P5). Kurs testowy przechodzi przez tę samą warstwę zapisu,
 * co kursy właściciela, a kopia do Tutora dopasowuje wpisy po uuid.
 * Zmierzone: wiersz o PUSTYM identyfikatorze „znajdował" cudzy moduł,
 * przejmował go i kasował jego lekcje jako nadmiar — tak zniknęło
 * 18 lekcji Kursu 2, a smoke meldował sukces, bo liczył wyłącznie własne
 * ślady. Rachunek sumienia pyta więc także o CUDZE dane.
 */
const wpisowTutora = () =>
  Number(
    php(
      `global $wpdb; echo (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$wpdb->posts}` +
        ` WHERE post_type IN ('courses','topics','lesson') AND post_status <> 'trash'" );`
    )
  );

/*
 * ZAPISY NA KURSY GLOBALNIE — z tego samego powodu, co wpisy Tutora wyżej:
 * własne ślady nie mówią nic o cudzych danych. Kasowanie zamówienia nie
 * kasuje zapisu w Tutorze, a zapis-sierota liczy się do „zapisanych na kurs”
 * (wpis #2153 zawyżał licznik prawdziwego Kursu 1 przy zamówieniu, którego
 * dawno nie ma).
 */
const zapisow = () =>
  Number(php(`global $wpdb; echo (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type='tutor_enrolled'" );`));

const produktowPrzed = liczbaProduktow();
const zamowienPrzed = liczbaZamowien();
const powiazanPrzed = powiazan();
const dostawPrzed = dostaw();
const wpisowPrzed = wpisowTutora();
const zapisowPrzed = zapisow();

/*
 * MIGAWKA POCZTY. Zwroty i zakupy tego smoke'a wysyłają wiadomości Woo
 * (zmierzone: 15 na przebieg), a skrzynka jest wspólna z właścicielem —
 * sprzątamy WYŁĄCZNIE to, co przyszło po migawce.
 */
if (!(await pocztaOdpowiada())) {
  console.error(
    "smoke-wp-zwroty: łapacz poczty nie odpowiada. Postaw środowisko: cd wordpress/srodowisko && ./postaw.sh"
  );
  process.exit(1);
}
const migawka = await migawkaPoczty();
const pocztyPrzed = await ilePoczty();

let produkt = 0;
let tutor = 0;
let obcy = 0;
const zamowienia = [];

/*
 * SPRZEDAŻ OTWIERAMY SAMI, NA CZAS POMIARU — i to jest naprawa z testu
 * całości (2026-08-31). Ta bramka mierzy m.in. „po zwrocie klient może
 * kupić kurs ponownie", czyli przejście przez blokadę koszyka. Blokada
 * odmawia też przy ZAMKNIĘTEJ sprzedaży, więc na czystej instalacji
 * (gdzie sprzedaż jest domyślnie zamknięta) dwa sprawdzenia padały
 * z powodu STANU ŚRODOWISKA, a nie kodu — a na instalacji po ręcznym
 * teście właściciela przechodziły, bo zostawił sprzedaż otwartą. Bramka
 * musi mierzyć to samo niezależnie od tego, co ktoś zostawił.
 *
 * Stan przywracamy DOKŁADNIE taki, jaki zastaliśmy: przy braku opcji
 * kasujemy ją, a nie zapisujemy pustą wartość (lekcja z 0.51.0 —
 * „przywróć stan" to co innego niż „skasuj ustawienie").
 */
const OPCJA_SPRZEDAZ = "aai_platnosci_sprzedaz_otwarta";
const sprzedazIstniala = php(`echo get_option( '${OPCJA_SPRZEDAZ}', null ) === null ? 'nie' : 'tak';`) === "tak";
const sprzedazPrzed = php(`echo (string) get_option( '${OPCJA_SPRZEDAZ}', '' );`);
php(`update_option( '${OPCJA_SPRZEDAZ}', 'tak' ); echo 'ok';`);

try {
  /* ── scena ────────────────────────────────────────────────────────── */

  php(
    `$k = array( 'id' => '${KURS}', 'slug' => '${SLUG}', 'title' => 'Smoke zwroty', 'type' => 'kurs',` +
      ` 'short_desc' => 'smoke', 'price_grosze' => 19900, 'cover_url' => null, 'status' => 'published',` +
      ` 'badge' => null, 'level' => null, 'sekcje' => array(), 'moduly' => array(` +
      `   array( 'id' => null, 'title' => 'Moduł', 'position' => 1, 'lekcje' => array(` +
      `     array( 'id' => null, 'title' => 'Lekcja', 'position' => 1, 'duration_min' => 10, 'preview' => 0 ) ) ) ) );` +
      ` Aai_Sklep_Zapis::zapisz_kurs( $k, 'smoke-p5', true ); echo 'ok';`
  );
  produkt = Number(php(`echo (int) Aai_Platnosci_Zapis::produkt_kursu( '${KURS}' );`));
  tutor = Number(php(`echo (int) Aai_Platnosci_Zapis::kurs_tutora( '${KURS}' );`));
  obcy = Number(
    php(
      `$p = new WC_Product_Simple(); $p->set_name( 'Smoke zwroty obcy' ); $p->set_regular_price( '50' ); $p->set_status( 'publish' ); $p->save(); echo (int) $p->get_id();`
    )
  );
  sprawdz(produkt > 0 && tutor > 0, "scena nie powstała (produkt albo kopia w Tutorze) — dalsze pomiary byłyby ślepe");
  if (produkt <= 0 || tutor <= 0) throw new Error("scena nieudana");

  const lekcja = Number(
    php(
      `$m = get_posts( array( 'post_type' => 'topics', 'post_parent' => ${tutor}, 'numberposts' => 1, 'fields' => 'ids' ) );` +
        ` if ( ! $m ) { echo 0; return; }` +
        ` $l = get_posts( array( 'post_type' => 'lesson', 'post_parent' => $m[0], 'numberposts' => 1, 'fields' => 'ids' ) );` +
        ` echo $l ? (int) $l[0] : 0;`
    )
  );
  sprawdz(lekcja > 0, "kopia kursu w Tutorze nie ma lekcji — nie da się sprawdzić dostępu do treści");

  const statusZam = (id) => wartosc(`wc_get_order( ${id} )->get_status()`);
  const maDostep = () => wartosc(`tutor_utils()->is_enrolled( ${tutor}, ${KLIENT} ) ? 'tak' : 'nie'`) === "tak";
  const statusyZapisow = () =>
    wartosc(
      `implode( ',', array_map( 'get_post_status', get_posts( array( 'post_type' => 'tutor_enrolled',` +
        ` 'post_parent' => ${tutor}, 'author' => ${KLIENT}, 'post_status' => 'any', 'numberposts' => -1, 'fields' => 'ids' ) ) ) )`
    );
  const naLiscieMoich = () =>
    wartosc(
      `in_array( ${tutor}, array_map( 'intval', (array) tutor_utils()->get_enrolled_courses_ids_by_user( ${KLIENT} ) ), true ) ? 'tak' : 'nie'`
    ) === "tak";
  const dostepDoLekcji = () =>
    wartosc(
      `( function() { wp_set_current_user( ${KLIENT} );` +
        ` return tutor_utils()->has_enrolled_content_access( 'lesson', ${lekcja} ) ? 'tak' : 'nie'; } )()`
    ) === "tak";
  const napisCta = () =>
    php(
      `wp_set_current_user( ${KLIENT} ); $k = Aai_Sklep_Odczyt::szczegoly_kursu( '${SLUG}' );` +
        ` $c = Aai_Sklep_Widok::cta_kursu( $k ); echo $c['napis'];`
    );
  const wolnoDoKoszyka = () =>
    wartosc(
      `( function() { wp_set_current_user( ${KLIENT} );` +
        ` return apply_filters( 'woocommerce_add_to_cart_validation', true, ${produkt}, 1 ) ? 'tak' : 'nie'; } )()`
    ) === "tak";
  const kasujZapisy = () =>
    php(
      `global $wpdb; $wpdb->query( $wpdb->prepare( "DELETE FROM {$wpdb->posts} WHERE post_type='tutor_enrolled' AND post_parent = %d", ${tutor} ) ); echo 'ok';`
    );

  /** Zamówienie opłacone drogą bramki (`payment_complete`). */
  function zamowienie(produkty = [produkt]) {
    const dodaj = produkty.map((id) => `$o->add_product( wc_get_product( ${id} ), 1 );`).join(" ");
    const id = Number(
      php(
        `$o = wc_create_order( array( 'customer_id' => ${KLIENT} ) ); ${dodaj}` +
          ` $o->set_payment_method( 'bacs' ); $o->calculate_totals(); $o->save(); $o->payment_complete(); echo (int) $o->get_id();`
      )
    );
    zamowienia.push(id);
    return id;
  }

  /** Zwrot przez `wc_create_refund` — tą samą drogą, którą idzie panel. */
  const zwrot = (id, kwota = null) =>
    php(
      `$o = wc_get_order( ${id} ); $poz = array();` +
        ( null === kwota
          ? ` foreach ( $o->get_items() as $iid => $item ) { $poz[ $iid ] = array( 'qty' => $item->get_quantity(),` +
            `   'refund_total' => $item->get_total(), 'refund_tax' => array() ); }`
          : "" ) +
        ` $r = wc_create_refund( array( 'order_id' => ${id}, 'amount' => ${null === kwota ? "$o->get_total()" : kwota},` +
        `   'line_items' => $poz, 'reason' => 'smoke P5', 'refund_payment' => false, 'restock_items' => false ) );` +
        ` echo is_wp_error( $r ) ? 'BLAD: ' . $r->get_error_message() : 'ok';`
    );

  /* ── 1. ZWROT PEŁNY ODBIERA DOSTĘP ────────────────────────────────── */

  const zam = zamowienie();
  sprawdz(statusZam(zam) === "completed", `zakup nie doszedł do completed (${statusZam(zam)}) — reszta pomiaru byłaby o niczym`);
  sprawdz(maDostep(), "po zakupie klient NIE ma dostępu — scena nieudana");
  sprawdz(napisCta() === "Przejdź do kursu", `po zakupie przycisk mówi „${napisCta()}” zamiast „Przejdź do kursu”`);
  sprawdz(!wolnoDoKoszyka(), "po zakupie kurs daje się dodać do koszyka drugi raz (B10)");

  const wynikZwrotu = zwrot(zam);
  sprawdz(wynikZwrotu === "ok", `zwrot się nie udał: ${wynikZwrotu}`);
  sprawdz(statusZam(zam) === "refunded", `po pełnym zwrocie zamówienie ma status „${statusZam(zam)}”, oczekiwano „refunded”`);
  sprawdz(
    statusyZapisow() === "refunded",
    `po zwrocie zapis w Tutorze ma status „${statusyZapisow()}” zamiast „refunded” — dostęp nie został odebrany`
  );
  sprawdz(!maDostep(), "PO ZWROCIE KLIENT DALEJ MA DOSTĘP DO KURSU — sklep oddał pieniądze i zostawił materiał");
  sprawdz(!naLiscieMoich(), "po zwrocie kurs został na liście „Moje kursy”");
  sprawdz(!dostepDoLekcji(), "PO ZWROCIE KLIENT DALEJ CZYTA TREŚĆ LEKCJI");

  /* ── 2. POWRÓT DO SPRZEDAŻY ───────────────────────────────────────── */

  sprawdz(
    napisCta() !== "Przejdź do kursu",
    "po zwrocie przycisk dalej mówi „Przejdź do kursu” — klient bez dostępu jest odsyłany do kursu, którego nie ma"
  );
  sprawdz(
    wolnoDoKoszyka(),
    "po zwrocie klient NIE MOŻE kupić kursu ponownie — blokada drugiego zakupu (B10) zamknęła drogę komuś, kto już nie ma kursu"
  );

  /* ── 3. PONOWNY ZAKUP PRZYWRACA DOSTĘP ────────────────────────────── */

  const zamPonowny = zamowienie();
  sprawdz(maDostep(), "ponowny zakup po zwrocie NIE przywrócił dostępu");
  sprawdz(
    statusyZapisow().split(",").filter((s) => s === "completed").length === 1,
    `po ponownym zakupie statusy zapisów to „${statusyZapisow()}” — miał dojść dokładnie jeden ukończony`
  );

  /* ── 4. ANULOWANIE DZIAŁA JAK ZWROT ───────────────────────────────── */

  php(`$o = wc_get_order( ${zamPonowny} ); $o->set_status( 'cancelled' ); $o->save(); echo 'ok';`);
  sprawdz(!maDostep(), "po anulowaniu zamówienia klient dalej ma dostęp do kursu");
  sprawdz(wolnoDoKoszyka(), "po anulowaniu klient nie może kupić kursu ponownie");

  /* ── 5. ZWROT CZĘŚCIOWY DOSTĘPU NIE ODBIERA ───────────────────────── */

  kasujZapisy();
  const zamCzesc = zamowienie();
  sprawdz(maDostep(), "scena zwrotu częściowego: klient nie dostał dostępu po zakupie");
  const wynikCzesci = zwrot(zamCzesc, 50);
  sprawdz(wynikCzesci === "ok", `zwrot częściowy się nie udał: ${wynikCzesci}`);
  sprawdz(
    statusZam(zamCzesc) === "completed",
    `zwrot częściowy zmienił status zamówienia na „${statusZam(zamCzesc)}” — WooCommerce zostawiał „completed”`
  );
  sprawdz(
    maDostep(),
    "zwrot CZĘŚCIOWY odebrał dostęp — klient zapłacił 199 zł, dostał 50 zł korekty i stracił kurs (zachowanie zmienione po stronie Tutora/Woo, decyzja właściciela była inna)"
  );

  /* ── 6. KLIENT DOWIADUJE SIĘ O ZWROCIE ────────────────────────────── */

  const mailZwrotu = php(
    `$m = WC()->mailer()->get_emails();` +
      ` $e = $m['WC_Email_Customer_Refunded_Order'] ?? null;` +
      ` echo $e ? ( ( $e->is_enabled() ? 'wl' : 'wyl' ) . '|' . ( $e->get_recipient() ?: 'klient' ) ) : 'brak';`
  );
  sprawdz(
    mailZwrotu.startsWith("wl|"),
    `mail WooCommerce o zwrocie jest wyłączony (${mailZwrotu}) — klient traci dostęp do kursu i nie dostaje o tym żadnej wiadomości`
  );
  sprawdz(
    mailZwrotu.endsWith("|klient"),
    `mail o zwrocie ma odbiorcę „${mailZwrotu.split("|")[1]}” zamiast klienta — wiadomość o utracie dostępu idzie nie do tego, kogo dotyczy`
  );

  /* ── 7. CUDZY PRODUKT NIE RUSZA KURSÓW ────────────────────────────── */

  const zapisyPrzedObcym = statusyZapisow();
  const zamObcy = zamowienie([obcy]);
  zwrot(zamObcy);
  sprawdz(
    statusyZapisow() === zapisyPrzedObcym,
    `zwrot zamówienia z CUDZYM produktem zmienił zapisy kursu (${zapisyPrzedObcym} → ${statusyZapisow()})`
  );

  /* ── 8. NIEZMIENNIK 14: KOLEJNOŚĆ POWIĄZANIA (B2) ─────────────────── */

  /*
   * Ten blok mierzy DWIE rzeczy naraz: że zagrożenie B2 jest prawdziwe
   * i że nasza kolejność przed nim broni.
   *
   * KOREKTA SCHEMATU (P5). DIAGRAM §10 zapowiadał dla niezmiennika 14
   * test: „ręcznie `product_id` bez `price_type` → zakup → zapis ma
   * `pending`, nie `completed`". Zmierzone: taki stan daje `completed`,
   * czyli PEŁNY DOSTĘP BEZ ZAPŁATY — dokładnie to, przed czym B2 broni,
   * tylko objaw opisany na opak. Mechanika (`EnrollmentModel::do_enroll()`)
   * jest odwrotna, niż zakładał zapis: zapis dostaje `pending`, gdy kurs
   * JEST sprzedawalny, a `completed`, gdy NIE JEST — bo kurs niesprzedawalny
   * uchodzi za darmowy.
   *
   * Stąd dwie sceny:
   *  A. ZŁA kolejność (`product_id` jest, `price_type` jeszcze nie) —
   *     Tutor znajduje kurs po produkcie, uznaje go za darmowy i rozdaje
   *     dostęp. Asercja pilnuje, że to zagrożenie DALEJ ISTNIEJE: gdyby
   *     Tutor je usunął, nasza reguła kolejności straciłaby powód i
   *     należałoby ją przemyśleć, a nie wozić w nieskończoność.
   *  B. NASZA kolejność (`price_type = paid`, `product_id` jeszcze nie) —
   *     Tutor nie ma jak powiązać produktu z kursem, więc nie tworzy
   *     zapisu wcale. Stan pośredni znaczy „jeszcze niesprzedawalny",
   *     nigdy „darmowy".
   */

  // ── scena A: zła kolejność rozdaje kurs za darmo ──
  kasujZapisy();
  php(`update_post_meta( ${tutor}, '_tutor_course_price_type', 'free' ); echo 'ok';`);
  sprawdz(
    wartosc(`tutor_utils()->is_course_purchasable( ${tutor} ) ? 'tak' : 'nie'`) === "nie",
    "scena A niezmiennika 14: kurs bez `price_type = paid` dalej uchodzi za sprzedawalny — pomiar byłby ślepy"
  );
  const zamZlaKolejnosc = Number(
    php(
      `$o = wc_create_order( array( 'customer_id' => ${KLIENT} ) ); $o->add_product( wc_get_product( ${produkt} ), 1 );` +
        ` $o->set_payment_method( 'bacs' ); $o->calculate_totals(); $o->set_status( 'pending' ); $o->save(); echo (int) $o->get_id();`
    )
  );
  zamowienia.push(zamZlaKolejnosc);
  sprawdz(
    maDostep(),
    "ZAGROŻENIE B2 ZNIKŁO: przy `product_id` bez `price_type = paid` Tutor NIE rozdaje już dostępu na nieopłaconym zamówieniu. " +
      "To dobra wiadomość, ale unieważnia powód reguły kolejności — sprawdź `EnrollmentModel::do_enroll()` i zdecyduj, czy reguła ma dalej sens"
  );

  // ── scena B: nasza kolejność nie rozdaje niczego ──
  kasujZapisy();
  php(
    `update_post_meta( ${tutor}, '_tutor_course_price_type', 'paid' );` +
      ` delete_post_meta( ${tutor}, '_tutor_course_product_id' ); echo 'ok';`
  );
  const zamNaszaKolejnosc = Number(
    php(
      `$o = wc_create_order( array( 'customer_id' => ${KLIENT} ) ); $o->add_product( wc_get_product( ${produkt} ), 1 );` +
        ` $o->set_payment_method( 'bacs' ); $o->calculate_totals(); $o->set_status( 'pending' ); $o->save(); echo (int) $o->get_id();`
    )
  );
  zamowienia.push(zamNaszaKolejnosc);
  sprawdz(
    !maDostep(),
    "NIEZMIENNIK 14 ZŁAMANY: przy NASZEJ kolejności (`price_type = paid` przed `product_id`) klient dostał dostęp na NIEOPŁACONYM zamówieniu"
  );
  sprawdz(
    statusyZapisow() === "",
    `NIEZMIENNIK 14: przy naszej kolejności powstał zapis o statusie „${statusyZapisow()}” — stan pośredni miał nie tworzyć żadnego`
  );
  php(`update_post_meta( ${tutor}, '_tutor_course_product_id', ${produkt} ); echo 'ok';`);

  /* ── 9. ODNOŚNIK POZYCJI W KOSZYKU (pułapka 11 schematu) ──────────── */

  /*
   * `tutor_update_product_url()` (`WooCommerce.php:941`) kończy się BEZ
   * `return` dla produktu, który nie jest kursem — czyli filtr
   * `woocommerce_cart_item_permalink` dostaje `null` i cudzy produkt traci
   * w koszyku odnośnik. Zmierzone przed naprawą: `NULL`. Objaw jest cichy
   * (nazwa pozycji przestaje być klikalna), a dziś sklep sprzedaje same
   * kursy — więc bez tego sprawdzenia usterka wróciłaby niezauważona przy
   * pierwszym produkcie spoza kursów.
   *
   * Drugie sprawdzenie pilnuje adresu kanonicznego: odnośnik kursu ma
   * prowadzić PROSTO na naszą stronę, a nie na `/courses/<slug>/`, które
   * dopiero przekierowujemy (decyzja właściciela 2026-08-25).
   */
  const link = (pid) =>
    php(
      `echo (string) apply_filters( 'woocommerce_cart_item_permalink',` +
        ` get_permalink( ${pid} ), array( 'product_id' => ${pid} ), 'klucz' );`
    );
  const linkObcego = link(obcy);
  sprawdz(
    linkObcego.includes("/product/"),
    `odnośnik CUDZEGO produktu w koszyku to „${linkObcego || "(pusty)"}” — filtr Tutora oddaje null dla produktu spoza kursów i zabiera pozycji klikalność`
  );
  const linkKursu = link(produkt);
  sprawdz(
    linkKursu.includes("/szkolenia/"),
    `odnośnik kursu w koszyku prowadzi na „${linkKursu}” zamiast na naszą stronę — klient dojeżdża do sklepu przekierowaniem z adresu Tutora`
  );

} finally {
  /* ── sprzątanie + rachunek sumienia ───────────────────────────────── */

  if (sprzedazIstniala) {
    php(`update_option( '${OPCJA_SPRZEDAZ}', '${sprzedazPrzed}' ); echo 'ok';`);
  } else {
    php(`delete_option( '${OPCJA_SPRZEDAZ}' ); echo 'ok';`);
  }

  if (zamowienia.length > 0) {
    // Przez API zamówienia, nie `wp_delete_post()`: pod HPOS ta druga
    // droga nie kasuje NICZEGO i wychodzi cicho (BLAD-026).
    php(`foreach ( array( ${zamowienia.join(", ")} ) as $id ) { $o = wc_get_order( $id ); if ( $o ) { $o->delete( true ); } } echo 'ok';`);
    php(
      `global $wpdb; $wpdb->query( "DELETE FROM " . Aai_Platnosci_Tabele::tabela( 'dostawy' ) .` +
        ` " WHERE identyfikator IN ( ${zamowienia.join(", ")} )" ); echo 'ok';`
    );
  }
  if (tutor > 0) {
    php(
      `global $wpdb; $wpdb->query( $wpdb->prepare( "DELETE FROM {$wpdb->posts} WHERE post_type='tutor_enrolled' AND post_parent = %d", ${tutor} ) ); echo 'ok';`
    );
  }
  // Produkt kasujemy SAMI: szew zakłada go każdemu kursowi, a smoke, który
  // go zostawia, każe następnym przebiegom mierzyć własne śmieci (sweep P2).
  php(
    `Aai_Sklep_Zapis::usun_kurs( '${KURS}', 'smoke-p5', true, true );` +
      ` Aai_Platnosci_Zapis::powiazanie_usun( '${KURS}' );` +
      ` foreach ( array( ${produkt}, ${tutor}, ${obcy} ) as $id ) { if ( $id > 0 && get_post( $id ) ) { wp_delete_post( $id, true ); } } echo 'ok';`
  );
  // Wyłącznie wiadomości spoza migawki — patrz `tools/smoke/poczta.mjs`.
  // Wyjątek stąd nie może przesłonić prawdziwego błędu z bloku `try`;
  // rachunek sumienia poniżej i tak zapali się na niewróconej skrzynce.
  await sprzatnijPoczte(migawka).catch((e) =>
    console.error(`  (sprzątanie poczty nie doszło do skutku: ${e.message})`)
  );
}

sprawdz(liczbaProduktow() === produktowPrzed, `smoke zostawił produkt: przed ${produktowPrzed}, po ${liczbaProduktow()}`);
sprawdz(powiazan() === powiazanPrzed, `smoke zostawił ślad w powiazania: przed ${powiazanPrzed}, po ${powiazan()}`);
sprawdz(liczbaZamowien() === zamowienPrzed, `smoke zostawił zamówienie: przed ${zamowienPrzed}, po ${liczbaZamowien()}`);
sprawdz(
  wpisowTutora() === wpisowPrzed,
  `smoke ZMIENIŁ liczbę wpisów Tutora: przed ${wpisowPrzed}, po ${wpisowTutora()} — kurs testowy ruszył kopię CUDZEGO kursu (sweep P5: pusty uuid dopasowywał pierwszy lepszy wpis i kasował jego lekcje)`
);
sprawdz(
  dostaw() === dostawPrzed,
  `smoke zostawił wiersz w dzienniku dostaw: przed ${dostawPrzed}, po ${dostaw()} — wiersz po skasowanym zamówieniu to widmo, które przeżyje każdy następny przebieg`
);
sprawdz(
  zapisow() === zapisowPrzed,
  `smoke zostawił zapis na kurs: przed ${zapisowPrzed}, po ${zapisow()} — sierota po skasowanym zamówieniu zawyża licznik zapisanych`
);
const pocztyPo = await ilePoczty();
sprawdz(
  pocztyPo === pocztyPrzed,
  `skrzynka nie wróciła do stanu sprzed przebiegu: przed ${pocztyPrzed}, po ${pocztyPo} — ` +
    "bramka albo zostawia własne wiadomości (zmierzone 15 na przebieg), albo kasuje CUDZE"
);
sprawdz(wp("aai-platnosci", "sprawdz").kod === 0, "po sprzątaniu kontrola czerwona — smoke zostawił rozjazd");

if (bledy.length > 0) {
  console.error(`smoke-wp-zwroty: ${bledy.length} z ${sprawdzen} sprawdzeń padło:`);
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}
console.log(`smoke-wp-zwroty: OK (${sprawdzen} sprawdzeń na żywej instalacji).`);
