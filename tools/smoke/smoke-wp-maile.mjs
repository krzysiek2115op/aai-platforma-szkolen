/**
 * Smoke dostarczenia — bramka kroku P4.
 *
 * Mierzy to, czego nie widać w kodzie: czy klient NAPRAWDĘ dostaje dwie
 * wiadomości, czy link do hasła żyje i czy nikt nie dostaje maila drugi raz.
 * Wiadomości czytamy z ŁAPACZA POCZTY (Mailpit, `wordpress/srodowisko/`),
 * a nie z podstawionego `pre_wp_mail`: filtr mierzyłby własną atrapę zamiast
 * tego, co wyszło z WordPressa (nagłówki, typ treści, wersja tekstowa).
 *
 * CO SPRAWDZA:
 *  1. **Mail 1 przy powstaniu konta**: dokładnie jeden, adresatem konto
 *     (nie adres rozliczeniowy — B9), w treści ZERO hasła, link do hasła
 *     otwiera formularz na stronie WooCommerce (nasz wygląd), wersja
 *     tekstowa obok HTML-a.
 *  2. **Mail Woo „nowe konto” NIE wychodzi** — od P4 jego zadanie przejął
 *     nasz mail 1, a dwa klucze resetu unieważniają się nawzajem (B8).
 *  3. **Mail 2 dopiero po opłacie**: zamówienie `bacs` stojące na `on-hold`
 *     nie wysyła nic; po domknięciu wychodzi jeden mail z nazwą kursu
 *     z NASZEJ tabeli i przyciskiem do „Moich kursów”.
 *  4. **Jeden mail na ZAMÓWIENIE, nie na kurs**: zamówienie z dwoma kursami
 *     daje jedną wiadomość wymieniającą oba.
 *  5. **Powtórzony hak nie wysyła drugi raz** (znacznik UNIQUE — B6).
 *  6. **Awaria wysyłki jest głośna**: dziennik zapisuje błąd, kontrola
 *     oddaje kod 1, ponowienie z wiersza poleceń wysyła i gasi kontrolę.
 *
 * WYMAGA środowiska z łapaczem: `cd wordpress/srodowisko && ./postaw.sh`.
 * Poza CI (CI nie ma podmana).
 *
 * Użycie: node tools/smoke/smoke-wp-maile.mjs
 */
import { execFileSync } from "node:child_process";

const STACK = process.env.STACK_NAZWA ?? "aai_wp";
const KONTENER = `${STACK}_cli`;
const POCZTA = process.env.MAILPIT_ADRES ?? "http://127.0.0.1:8893";
const ADRES = process.env.WP_ADRES ?? "http://127.0.0.1:8892";
const KURS_A = "aaaa0000-0000-4000-8000-0000000p4m01";
const KURS_B = "aaaa0000-0000-4000-8000-0000000p4m02";

const bledy = [];
let sprawdzen = 0;
const sprawdz = (w, opis) => {
  sprawdzen += 1;
  if (!w) bledy.push(opis);
};

function wp(...argumenty) {
  try {
    return {
      kod: 0,
      out: execFileSync("podman", ["exec", KONTENER, "wp", "--path=/var/www/html", ...argumenty], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }).trim(),
    };
  } catch (e) {
    return { kod: e.status ?? 1, out: ((e.stdout ?? "") + (e.stderr ?? "")).toString().trim() };
  }
}
const php = (kod) => wp("eval", kod).out;

/** Skrzynka łapacza — pełne wiadomości, nie same nagłówki. */
async function skrzynka() {
  const lista = await (await fetch(`${POCZTA}/api/v1/messages?limit=50`)).json();
  const pelne = [];
  for (const m of lista.messages ?? []) {
    pelne.push(await (await fetch(`${POCZTA}/api/v1/message/${m.ID}`)).json());
  }
  return pelne;
}
const wyczysc = () => fetch(`${POCZTA}/api/v1/messages`, { method: "DELETE" });
const nasze = (lista, fragment) => lista.filter((m) => (m.Subject ?? "").includes(fragment));
const doKogo = (m) => (m.To ?? []).map((a) => a.Address).join(",");

/* ── stan wyjściowy ─────────────────────────────────────────────────── */

if (php("echo class_exists( 'Aai_Platnosci_Maile' ) ? 'jest' : 'brak';") !== "jest") {
  console.error("smoke-wp-maile: wtyczka aai-platnosci nie jest aktywna albo nie ma warstwy maili.");
  process.exit(1);
}
try {
  const info = await (await fetch(`${POCZTA}/api/v1/info`)).json();
  if (!info) throw new Error("brak");
} catch {
  console.error(
    `smoke-wp-maile: łapacz poczty nie odpowiada na ${POCZTA}. Postaw środowisko: cd wordpress/srodowisko && ./postaw.sh`
  );
  process.exit(1);
}

const liczba = (typ) =>
  Number(php(`global $wpdb; echo (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type='${typ}'" );`));
const dostaw = () =>
  Number(php(`global $wpdb; echo (int) $wpdb->get_var( "SELECT COUNT(*) FROM " . Aai_Platnosci_Tabele::tabela( 'dostawy' ) );`));

const produktowPrzed = liczba("product");
const zamowienPrzed = liczba("shop_order");
const dostawPrzed = dostaw();
const sprzedazPrzed = php("echo (string) get_option( 'aai_platnosci_sprzedaz_otwarta', '' );");

const uzytkownicy = [];
const zamowienia = [];
let produktA = 0;
let produktB = 0;

const kurs = (uuid, slug, tytul, cena) =>
  php(
    `$k = array( 'id' => '${uuid}', 'slug' => '${slug}', 'title' => '${tytul}', 'type' => 'kurs',` +
      ` 'short_desc' => 'smoke', 'price_grosze' => ${cena}, 'cover_url' => null, 'status' => 'published',` +
      ` 'badge' => null, 'level' => null, 'sekcje' => array(), 'moduly' => array() );` +
      ` Aai_Sklep_Zapis::zapisz_kurs( $k, 'smoke-p4', true );` +
      ` echo (int) Aai_Platnosci_Zapis::produkt_kursu( '${uuid}' );`
  );

const klient = (login, mail, imie) =>
  Number(
    php(
      `$id = wp_insert_user( array( 'user_login' => '${login}', 'user_email' => '${mail}',` +
        ` 'user_pass' => wp_generate_password(), 'first_name' => '${imie}', 'role' => 'customer' ) );` +
        ` echo (int) $id;`
    )
  );

/** Zamówienie `bacs` z pozycjami, zostawione na `on-hold`. */
const zamowienie = (uid, produkty) =>
  Number(
    php(
      `$o = wc_create_order( array( 'customer_id' => ${uid} ) );` +
        produkty.map((id) => ` $o->add_product( wc_get_product( ${id} ), 1 );`).join("") +
        ` $o->set_payment_method( 'bacs' ); $o->calculate_totals(); $o->set_status( 'on-hold' ); $o->save();` +
        ` echo (int) $o->get_id();`
    )
  );

const domknij = (id) => php(`wc_get_order( ${id} )->update_status( 'completed', 'smoke' ); echo 'ok';`);
const statusZamowienia = (id) => php(`echo (string) wc_get_order( ${id} )->get_status();`);
const wynikDostawy = (zdarzenie, id) =>
  php(
    `global $wpdb; echo (string) $wpdb->get_var( $wpdb->prepare( "SELECT wynik FROM " .` +
      ` Aai_Platnosci_Tabele::tabela( 'dostawy' ) . " WHERE zdarzenie = %s AND identyfikator = %d", '${zdarzenie}', ${id} ) );`
  );

try {
  produktA = Number(kurs(KURS_A, "smoke-p4-a", "Kurs smoke maile A", 12300));
  produktB = Number(kurs(KURS_B, "smoke-p4-b", "Kurs smoke maile B", 9900));
  sprawdz(produktA > 0 && produktB > 0, "scena nie powstała (produkty kursów) — dalsze pomiary byłyby ślepe");

  /* ── 1. mail 1: powstanie konta ─────────────────────────────────── */

  await wyczysc();
  const klientA = klient("smoke-p4-a", "smoke-p4-a@example.test", "Jan");
  uzytkownicy.push(klientA);
  php(`do_action( 'woocommerce_created_customer', ${klientA}, array(), true );`);

  let poczta = await skrzynka();
  const konto = nasze(poczta, "Ustaw hasło");
  sprawdz(konto.length === 1, `po powstaniu konta wyszło ${konto.length} maili „Ustaw hasło”, oczekiwano 1`);
  sprawdz(
    nasze(poczta, "account has been created").length === 0,
    "WooCommerce wysłał SWÓJ mail o nowym koncie — dwa klucze resetu unieważniają się nawzajem (B8)"
  );

  if (konto.length === 1) {
    const m = konto[0];
    sprawdz(
      doKogo(m) === "smoke-p4-a@example.test",
      `mail 1 poszedł do „${doKogo(m)}” zamiast na adres KONTA — adres rozliczeniowy bywa cudzy (B9)`
    );
    sprawdz((m.HTML ?? "").length > 0 && (m.Text ?? "").length > 0, "mail 1 nie ma obu wersji (HTML i tekstowej)");
    /*
     * „Hasło" wolno w mailu NAZWAĆ (przycisk „Ustaw hasło"), nie wolno go
     * PODAĆ. Pierwsza wersja pytała o samo słowo i zapalała się na własnym
     * napisie „Ustaw hasło: https://…" — sprawdzenie, które pada zawsze,
     * nie mierzy niczego. Pytamy więc o wartość PO dwukropku: jeśli to nie
     * adres, ktoś wkleił tam sekret.
     */
    const hasloWTresci = /has(ł|l)o:\s*(?!https?:)\S|password:\s*(?!https?:)\S/i.test(
      `${m.HTML ?? ""} ${m.Text ?? ""}`
    );
    sprawdz(!hasloWTresci, "mail 1 podaje hasło w treści — niezmiennik 8 mówi: NIGDY");
    sprawdz(/ważny przez \d+ h/.test(m.Text ?? ""), "mail 1 nie mówi, jak długo żyje link (B8)");

    const link = (m.Text ?? "").match(/https?:\S*action=newaccount\S*/);
    sprawdz(link !== null, "mail 1 nie niesie linku do ustawienia hasła");
    if (link) {
      /*
       * PRZEZ PRZEKIEROWANIE Z CIASTKIEM, nie zwykłym `fetch`. WooCommerce
       * sprawdza klucz, chowa go w ciastku i przekierowuje na czysty adres
       * `/my-account/lost-password/`; `fetch` podąża za przekierowaniem, ale
       * ciastek NIE przenosi, więc widzi formularz „zapomniałem hasła"
       * zamiast formularza ustawienia hasła. Tak padła pierwsza wersja tego
       * sprawdzenia — na własnym pomiarze, nie na kodzie.
       */
      const wstep = await fetch(link[0], { redirect: "manual" });
      const ciastka = (wstep.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
      const dalej = wstep.headers.get("location");
      const strona = await (
        await fetch(dalej ?? link[0], { headers: ciastka ? { cookie: ciastka } : {} })
      ).text();
      sprawdz(strona.includes('name="password_1"'), "link z maila 1 NIE otwiera formularza ustawienia hasła");
      sprawdz(
        strona.includes("woo-motyw") || strona.includes("aai-"),
        "strona ustawienia hasła idzie bez naszego arkusza — klient po premium mailu trafia na surowy ekran WordPressa"
      );
    }
  }

  /* ── 2. mail 2 dopiero po opłacie ───────────────────────────────── */

  await wyczysc();
  const zamA = zamowienie(klientA, [produktA]);
  zamowienia.push(zamA);
  poczta = await skrzynka();
  sprawdz(
    nasze(poczta, "kurs jest gotowy").length === 0,
    "mail „kurs gotowy” wyszedł przy zamówieniu czekającym na przelew — dostęp powstaje dopiero po wpłacie"
  );

  /*
   * BRAMKA STATUSU ZAPISU, sprawdzona WPROST. Samo zamówienie na `on-hold`
   * jej nie dotyka: Tutor przy nieukończonym zapisie w ogóle nie odpala
   * `tutor_after_enrolled`, więc wycięcie bramki nic by tu nie zmieniło —
   * sprawdzenie wyżej przechodziłoby także przy zepsutym kodzie (wykryte
   * własnym testem negatywnym). Odpalamy więc hak RĘCZNIE na zapisie, który
   * nie jest `completed`: mail nie ma prawa wyjść, bo dostępu nie ma.
   */
  const zapisWToku = Number(
    php(
      `global $wpdb; echo (int) $wpdb->get_var( $wpdb->prepare( "SELECT ID FROM {$wpdb->posts}` +
        ` WHERE post_type='tutor_enrolled' AND post_author = %d ORDER BY ID DESC LIMIT 1", ${klientA} ) );`
    )
  );
  sprawdz(zapisWToku > 0, "Tutor nie założył zapisu przy zamówieniu — dalszy pomiar bramki byłby ślepy");
  if (zapisWToku > 0) {
    sprawdz(
      php(`echo (string) Aai_Platnosci_Zapis::status_zapisu( ${zapisWToku} );`) !== "completed",
      "zapis przy zamówieniu czekającym na przelew jest już „completed” — scena nie mierzy tego, co miała"
    );
    php(
      `do_action( 'tutor_after_enrolled', (int) get_post_field( 'post_parent', ${zapisWToku} ), ${klientA}, ${zapisWToku} );`
    );
    poczta = await skrzynka();
    sprawdz(
      nasze(poczta, "gotow").length === 0,
      "mail 2 wyszedł przy zapisie, który NIE daje dostępu — bramka statusu nie działa (klient dostaje „kurs gotowy” przed wpłatą)"
    );
    sprawdz(
      wynikDostawy("mail_kursu", zamA) === "",
      "znacznik maila 2 powstał mimo braku dostępu — po wpłacie prawdziwy mail już by nie wyszedł"
    );
  }

  await wyczysc();
  domknij(zamA);
  sprawdz(statusZamowienia(zamA) === "completed", `zamówienie po domknięciu ma status „${statusZamowienia(zamA)}”`);
  poczta = await skrzynka();
  const gotowy = nasze(poczta, "kurs jest gotowy");
  sprawdz(gotowy.length === 1, `po opłacie wyszło ${gotowy.length} maili „kurs gotowy”, oczekiwano 1`);
  if (gotowy.length === 1) {
    sprawdz(
      (gotowy[0].HTML ?? "").includes("Kurs smoke maile A"),
      "mail 2 nie wymienia nazwy kursu z NASZEJ tabeli"
    );
    sprawdz(
      (gotowy[0].Text ?? "").includes("/szkolenia/moje/"),
      "mail 2 nie prowadzi do „Moich kursów” — klient nie wie, gdzie wejść"
    );
  }
  sprawdz(wynikDostawy("mail_kursu", zamA) === "wyslano", `dziennik nie potwierdza wysyłki maila 2 (${wynikDostawy("mail_kursu", zamA)})`);
  sprawdz(wynikDostawy("dostep", zamA) !== "", "dziennik nie odnotował przyznanego dostępu");

  /* ── 3. powtórzony hak nie wysyła drugi raz ─────────────────────── */

  await wyczysc();
  php(
    `global $wpdb; $z = (int) $wpdb->get_var( $wpdb->prepare( "SELECT ID FROM {$wpdb->posts} WHERE post_type='tutor_enrolled' AND post_author = %d ORDER BY ID DESC LIMIT 1", ${klientA} ) );` +
      ` do_action( 'tutor_after_enrolled', (int) get_post_field( 'post_parent', $z ), ${klientA}, $z );` +
      ` do_action( 'tutor_after_enrolled', (int) get_post_field( 'post_parent', $z ), ${klientA}, $z );`
  );
  poczta = await skrzynka();
  sprawdz(
    nasze(poczta, "gotow").length === 0,
    "powtórzony hak wysłał maila drugi raz — znacznik UNIQUE nie trzyma (B6)"
  );

  /* ── 3b. ścieżka „admin klika Processing” — mail 2 z ZAGNIEŻDŻONEGO shutdown ─ */

  /*
   * TA ŚCIEŻKA MA WŁASNY BLOK, bo tylko ona przechodzi przez odroczone
   * domknięcie z P3b: zamówienie wchodzące w `processing` domykamy na
   * `shutdown`, a to domknięcie odpala `tutor_after_enrolled` — czyli
   * zgłoszenie wysyłki trafia do akcji, KTÓRA WŁAŚNIE TRWA. WordPress nie
   * woła callbacków dopisanych do trwającej akcji: znacznik zostawał
   * z pustym wynikiem, a klient dostawał dostęp i ani jednej wiadomości.
   * Zmierzone przed naprawą; bez tego bloku smoke tego nie widzi (wykryte
   * własnym testem negatywnym — wycięcie `doing_action` nie zapalało nic).
   */
  await wyczysc();
  const klientD = klient("smoke-p4-d", "smoke-p4-d@example.test", "Nina");
  uzytkownicy.push(klientD);
  const zamD = zamowienie(klientD, [produktA]);
  zamowienia.push(zamD);
  php(`wc_get_order( ${zamD} )->update_status( 'processing', 'smoke: admin potwierdza wpłatę' ); echo 'ok';`);
  sprawdz(
    statusZamowienia(zamD) === "completed",
    `zamówienie po ręcznym „Processing” ma status „${statusZamowienia(zamD)}” — kurs nie ma czego realizować, więc ma być domknięte`
  );
  poczta = await skrzynka();
  sprawdz(
    nasze(poczta, "gotow").length === 1,
    `ścieżka „admin klika Processing” dała ${nasze(poczta, "gotow").length} maili „kurs gotowy”, oczekiwano 1 — wysyłka zlecona z wnętrza odroczonego domknięcia przepada bez śladu`
  );
  sprawdz(
    wynikDostawy("mail_kursu", zamD) === "wyslano",
    `dziennik po ścieżce „Processing” mówi „${wynikDostawy("mail_kursu", zamD)}” zamiast „wyslano” — pusty wynik znaczy, że żądanie padło między znacznikiem a wysyłką`
  );

  /* ── 4. jedno zamówienie, dwa kursy, jeden mail ─────────────────── */

  await wyczysc();
  const klientB = klient("smoke-p4-b", "smoke-p4-b@example.test", "Ewa");
  uzytkownicy.push(klientB);
  const zamB = zamowienie(klientB, [produktA, produktB]);
  zamowienia.push(zamB);
  domknij(zamB);
  poczta = await skrzynka();
  const oba = nasze(poczta, "gotow");
  sprawdz(oba.length === 1, `zamówienie na dwa kursy dało ${oba.length} maili, oczekiwano 1 (jeden mail na ZAMÓWIENIE)`);
  if (oba.length === 1) {
    sprawdz(
      (oba[0].HTML ?? "").includes("Kurs smoke maile A") && (oba[0].HTML ?? "").includes("Kurs smoke maile B"),
      "mail o dwóch kursach nie wymienia obu — drugi kurs zniknąłby po cichu"
    );
  }

  /* ── 5. awaria wysyłki jest głośna ──────────────────────────────── */

  await wyczysc();
  /*
   * AWARIĘ WYSYŁKI ROBIMY FILTREM, NIE PSUCIEM ŚRODOWISKA. Pierwsza wersja
   * podmieniała host SMTP w mu-pluginie warsztatu — a ten jest zamontowany
   * READ-ONLY (i słusznie: smoke nie ma prawa przestawiać cudzej poczty).
   * `pre_wp_mail => false` daje dokładnie to, co trzeba zmierzyć: wp_mail()
   * oddaje `false` PO CICHU, czyli stan z B8. Filtr żyje tylko w tym jednym
   * żądaniu, więc ponowienie (osobne wywołanie CLI) go już nie ma.
   */
  const klientC = klient("smoke-p4-c", "smoke-p4-c@example.test", "Olga");
  uzytkownicy.push(klientC);
  php(
    `add_filter( 'pre_wp_mail', '__return_false', 1 );` +
      ` do_action( 'woocommerce_created_customer', ${klientC}, array(), true );`
  );
  const wynik = wynikDostawy("mail_konta", klientC);
  sprawdz(wynik.startsWith("blad"), `awaria wysyłki nie została zapisana w dzienniku (wynik: „${wynik}”)`);
  sprawdz(
    wp("aai-platnosci", "sprawdz").kod === 1,
    "kontrola NIE świeci na czerwono przy niedoręczonym mailu — klient nie ma jak wejść na konto"
  );
  poczta = await skrzynka();
  sprawdz(nasze(poczta, "Ustaw hasło").length === 0, "mail rzekomo nieudany jednak doszedł — pomiar awarii jest ślepy");

  const ponow = wp("aai-platnosci", "dostawy", `--ponow=mail_konta/${klientC}`);
  sprawdz(ponow.kod === 0, `ponowna wysyłka nie powiodła się: ${ponow.out}`);
  sprawdz(wynikDostawy("mail_konta", klientC) === "wyslano", "dziennik po ponowieniu nadal nie potwierdza wysyłki");
  poczta = await skrzynka();
  sprawdz(nasze(poczta, "Ustaw hasło").length === 1, "ponowienie nie wysłało wiadomości");
  sprawdz(wp("aai-platnosci", "sprawdz").kod === 0, "kontrola została czerwona po udanym ponowieniu");

  /*
   * PONOWIENIE DOSTAWY, KTÓREJ NIE MA W DZIENNIKU, musi ODMÓWIĆ. Bez tego
   * literówka w id (`mail_konta/1` zamiast `mail_konta/41`) wysyłała świeży
   * klucz resetu administratorowi, nie zostawiała śladu i meldowała sukces —
   * a każdy nowy klucz unieważnia poprzedni, więc odbierała czekającemu
   * klientowi jego jedyny link (B8). Zmierzone przed naprawą.
   */
  await wyczysc();
  const obce = wp("aai-platnosci", "dostawy", "--ponow=mail_konta/1");
  sprawdz(obce.kod === 1, "ponowienie dostawy spoza dziennika NIE odmówiło — literówka w id wysyła klucz resetu obcej osobie");
  poczta = await skrzynka();
  sprawdz(
    poczta.length === 0,
    `ponowienie dostawy spoza dziennika wysłało ${poczta.length} wiadomości — nie wolno mu wysłać ani jednej`
  );
} finally {
  /* ── sprzątanie ─────────────────────────────────────────────────── */
  await wyczysc();
  php(`update_option( 'aai_platnosci_sprzedaz_otwarta', '${sprzedazPrzed}' ); echo 'ok';`);
  if (zamowienia.length > 0) {
    php(`foreach ( array( ${zamowienia.join(", ")} ) as $id ) { $o = wc_get_order( $id ); if ( $o ) { $o->delete( true ); } } echo 'ok';`);
  }
  if (uzytkownicy.length > 0) {
    php(
      `require_once ABSPATH . 'wp-admin/includes/user.php'; global $wpdb;` +
        ` foreach ( array( ${uzytkownicy.join(", ")} ) as $u ) {` +
        ` $wpdb->query( $wpdb->prepare( "DELETE FROM {$wpdb->posts} WHERE post_type='tutor_enrolled' AND post_author = %d", $u ) );` +
        ` if ( get_user_by( 'id', $u ) ) { wp_delete_user( $u ); } } echo 'ok';`
    );
  }
  php(
    `global $wpdb; $wpdb->query( "DELETE FROM " . Aai_Platnosci_Tabele::tabela( 'dostawy' ) .` +
      ` " WHERE identyfikator IN ( ${[...zamowienia, ...uzytkownicy].join(", ") || 0} )" );` +
      ` delete_option( 'aai_platnosci_blad' ); echo 'ok';`
  );
  for (const [uuid, produkt] of [
    [KURS_A, produktA],
    [KURS_B, produktB],
  ]) {
    php(
      `$t = Aai_Platnosci_Zapis::kurs_tutora( '${uuid}' );` +
        ` Aai_Sklep_Zapis::usun_kurs( '${uuid}', 'smoke-p4', true );` +
        ` Aai_Platnosci_Zapis::powiazanie_usun( '${uuid}' );` +
        ` foreach ( array( ${produkt}, is_int( $t ) ? $t : 0 ) as $id ) { if ( $id > 0 && get_post( $id ) ) { wp_delete_post( $id, true ); } } echo 'ok';`
    );
  }
}

/* ── rachunek sumienia: smoke nie zostawia śmieci ───────────────────── */

sprawdz(liczba("product") === produktowPrzed, `smoke zostawił produkt: przed ${produktowPrzed}, po ${liczba("product")}`);
sprawdz(liczba("shop_order") === zamowienPrzed, `smoke zostawił zamówienie: przed ${zamowienPrzed}, po ${liczba("shop_order")}`);
sprawdz(dostaw() === dostawPrzed, `smoke zostawił wiersze dziennika dostaw: przed ${dostawPrzed}, po ${dostaw()}`);
sprawdz(wp("aai-platnosci", "sprawdz").kod === 0, "po sprzątaniu kontrola czerwona — smoke zostawił rozjazd");

if (bledy.length > 0) {
  console.error(`smoke-wp-maile: ${bledy.length} z ${sprawdzen} sprawdzeń padło:`);
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}
console.log(`smoke-wp-maile: OK (${sprawdzen} sprawdzeń na żywej instalacji).`);
