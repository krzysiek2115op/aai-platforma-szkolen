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
 *  7. **Sam po sobie nie zostawia śladu i nie kasuje CUDZEGO**: skrzynka
 *     wraca do stanu sprzed przebiegu, a liczba zapisów na kursy (globalnie),
 *     produktów, zamówień i wierszy dziennika dostaw nie drgnie.
 *
 * WYMAGA środowiska z łapaczem: `cd wordpress/srodowisko && ./postaw.sh`.
 * Poza CI (CI nie ma podmana).
 *
 * Użycie: node tools/smoke/smoke-wp-maile.mjs
 */
import { execFileSync } from "node:child_process";
import { adresPoczty, ilePoczty, migawkaPoczty, pocztaOdpowiada, sprzatnijPoczte, wlasneWiadomosci } from "./poczta.mjs";

const STACK = process.env.STACK_NAZWA ?? "aai_wp";
const KONTENER = `${STACK}_cli`;
const POCZTA = adresPoczty;
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

/*
 * SKRZYNKA JEST WSPÓLNA — patrz `poczta.mjs`. Ten smoke potrzebuje pustego
 * pola widzenia, żeby móc powiedzieć „wyszedł DOKŁADNIE jeden mail”, i do
 * 0.53.0 robił to najprostszą drogą: kasował całą skrzynkę, trzynaście razy
 * na przebieg. Zmierzone: 36 wiadomości → 0, w tym poczta, którą właściciel
 * oglądał w trakcie testu ręcznego P6.
 *
 * Teraz pole widzenia zawężamy zamiast czyścić cudze: `skrzynka()` pokazuje
 * wyłącznie wiadomości wysłane PO migawce, a `wyczysc()` kasuje wyłącznie je.
 * Asercje „dokładnie jeden” liczą to samo co wcześniej, bo pytają o nasze;
 * cudze wiadomości są dla tego smoke'a niewidzialne i nietykalne.
 */
let migawka;
const skrzynka = () => wlasneWiadomosci(migawka);
const wyczysc = () => sprzatnijPoczte(migawka);
const nasze = (lista, fragment) => lista.filter((m) => (m.Subject ?? "").includes(fragment));
const doKogo = (m) => (m.To ?? []).map((a) => a.Address).join(",");

/* ── stan wyjściowy ─────────────────────────────────────────────────── */

if (php("echo class_exists( 'Aai_Platnosci_Maile' ) ? 'jest' : 'brak';") !== "jest") {
  console.error("smoke-wp-maile: wtyczka aai-platnosci nie jest aktywna albo nie ma warstwy maili.");
  process.exit(1);
}
if (!(await pocztaOdpowiada())) {
  console.error(
    `smoke-wp-maile: łapacz poczty nie odpowiada na ${POCZTA}. Postaw środowisko: cd wordpress/srodowisko && ./postaw.sh`
  );
  process.exit(1);
}
// Migawka MUSI powstać przed pierwszą naszą wysyłką — wszystko, czego w niej
// nie ma, uznamy dalej za własne i skasujemy.
migawka = await migawkaPoczty();
const pocztyPrzed = await ilePoczty();

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

const dostaw = () =>
  Number(php(`global $wpdb; echo (int) $wpdb->get_var( "SELECT COUNT(*) FROM " . Aai_Platnosci_Tabele::tabela( 'dostawy' ) );`));

/*
 * ZAPISY NA KURSY LICZYMY GLOBALNIE, nie po swoim kursie.
 *
 * Kasowanie zamówienia NIE kasuje zapisu w Tutorze — zapis zostaje jako
 * sierota i dalej liczy się do „zapisanych na kurs”. Tak powstał wpis #2153:
 * miał `_tutor_enrolled_by_order_id = 2152` przy zamówieniu, którego już nie
 * ma, i zawyżał licznik PRAWDZIWEGO Kursu 1 o jeden. Sprzątanie po własnym
 * kursie by go nie złapało — bo siedział na cudzym.
 */
const zapisow = () =>
  Number(php(`global $wpdb; echo (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type='tutor_enrolled'" );`));

const produktowPrzed = liczba("product");
const zamowienPrzed = liczbaZamowien();
const dostawPrzed = dostaw();
const zapisowPrzed = zapisow();
const sprzedazPrzed = php("echo (string) get_option( 'aai_platnosci_sprzedaz_otwarta', '' );");
const sprzedazIstniala = php("echo get_option( 'aai_platnosci_sprzedaz_otwarta', null ) === null ? 'nie' : 'tak';") === 'tak';

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
  /* ── 6. JEDEN NADAWCA (BLAD-025) ────────────────────────────────── */

  /*
   * Zgłoszenie właściciela: po ustawieniu hasła przychodziło gołe
   * powiadomienie od `WordPress <wordpress@127.0.0.1>` — obcy nadawca
   * w tej samej ścieżce, w której nasze maile i WooCommerce mówią
   * z adresu sklepu. Na produkcji taki adres nie przechodzi SPF-u.
   *
   * MIERZYMY WYSŁANĄ WIADOMOŚĆ, nie filtr. Sprawdzenie „czy filtr jest
   * zarejestrowany" przechodziłoby także wtedy, gdyby filtr zwracał
   * niewłaściwą wartość — a klient i tak dostaje to, co wyszło.
   */
  await wyczysc();
  const temat = `aai-nadawca-${Date.now()}`;
  php(`wp_mail( get_option( 'admin_email' ), '${temat}', 'proba nadawcy' ); echo 'ok';`);
  const poNadawcy = await skrzynka();
  const proba = poNadawcy.find((m) => (m.Subject ?? "").includes(temat));
  sprawdz(undefined !== proba, "próbna wiadomość nie doszła — pomiar nadawcy byłby ślepy");
  if (proba) {
    const adres = proba.From?.Address ?? "";
    const nazwa = proba.From?.Name ?? "";
    sprawdz(
      !adres.startsWith("wordpress@"),
      `poczta rdzenia WordPressa idzie z domyślnego adresu „${adres}" — na produkcji odpadnie na SPF (BLAD-025)`
    );
    sprawdz(nazwa !== "WordPress", `nadawcą jest „WordPress", a nie sklep — klient dostaje wiadomości z dwóch światów (BLAD-025)`);
    const sklep = php("echo (string) get_option( 'woocommerce_email_from_address', '' );").trim();
    sprawdz(
      sklep === "" || adres === sklep,
      `adres nadawcy „${adres}" nie jest adresem sklepu „${sklep}" — miał być JEDEN nadawca dla wszystkiego`
    );
  }

  /*
   * DRUGA STRONA TEJ SAMEJ REGUŁY: nadawcy ustawionego ŚWIADOMIE nie
   * ruszamy. Naprawiamy wartość domyślną WordPressa, a nie przejmujemy
   * cudzą pocztę — bez tego sprawdzenia „jeden nadawca" znaczyłoby
   * „nasz nadawca zawsze wygrywa", także z wtyczką SMTP właściciela.
   */
  await wyczysc();
  const temat2 = `aai-nadawca-cudzy-${Date.now()}`;
  php(
    `add_filter( 'wp_mail_from', function () { return 'ktos@example.test'; }, 20 );` +
      ` add_filter( 'wp_mail_from_name', function () { return 'Ktos Inny'; }, 20 );` +
      ` wp_mail( get_option( 'admin_email' ), '${temat2}', 'proba cudzego nadawcy' ); echo 'ok';`
  );
  const poCudzym = await skrzynka();
  const proba2 = poCudzym.find((m) => (m.Subject ?? "").includes(temat2));
  sprawdz(undefined !== proba2, "próbna wiadomość z cudzym nadawcą nie doszła — pomiar byłby ślepy");
  if (proba2) {
    sprawdz(
      (proba2.From?.Address ?? "") === "ktos@example.test",
      `nadpisaliśmy nadawcę ustawionego świadomie („${proba2.From?.Address}") — wtyczka SMTP właściciela przestałaby działać`
    );
  }

  /* ── 6. płatność natychmiastowa: JEDEN mail zamiast dwóch ─────────
   *
   * Decyzja właściciela 2026-08-30 (zgłoszenie z testu P6): gdy bramka
   * domyka zamówienie w TYM SAMYM żądaniu, w którym kasa założyła konto,
   * klient dostawał dwie wiadomości w tej samej sekundzie — a pierwsza
   * kazała mu „wejść na konto", na którym właśnie siedział (kasa loguje
   * po zakupie). Teraz idzie sam mail o kursie; pominięcie maila 1 jest
   * zapisane w dzienniku i kontrola ma je za stan poprawny.
   */
  await wyczysc();
  const klientSkip = Number(
    php(
      `$uid = wc_create_new_customer( 'smoke-p6-skip@example.test', 'smoke-p6-skip', wp_generate_password() );` +
        ` $o = wc_create_order( array( 'customer_id' => (int) $uid ) );` +
        ` $o->add_product( wc_get_product( ${produktA} ), 1 );` +
        ` $o->set_payment_method( 'bacs' ); $o->calculate_totals();` +
        ` $o->payment_complete( 'SMOKE-P6-SKIP' );` +
        ` update_option( 'smoke_p6_zamowienie', (int) $o->get_id() );` +
        ` echo (int) $uid;`
    )
  );
  const zamSkip = Number(php(`echo (int) get_option( 'smoke_p6_zamowienie', 0 ); delete_option( 'smoke_p6_zamowienie' );`));
  uzytkownicy.push(klientSkip);
  zamowienia.push(zamSkip);
  sprawdz(klientSkip > 0 && zamSkip > 0, "scena płatności natychmiastowej nie powstała — pomiar byłby ślepy");
  sprawdz(
    wynikDostawy("mail_konta", klientSkip).startsWith("pominięto"),
    `przy płatności natychmiastowej mail 1 ma wynik „${wynikDostawy("mail_konta", klientSkip)}” — a miał być świadomie pominięty z zapisem w dzienniku`
  );
  sprawdz(
    wynikDostawy("mail_kursu", zamSkip) === "wyslano",
    "przy płatności natychmiastowej mail o kursie nie wyszedł — a to on niesie teraz link do hasła"
  );
  const skrzynkaSkip = (await skrzynka()).filter((m) => doKogo(m).includes("smoke-p6-skip@example.test"));
  sprawdz(
    skrzynkaSkip.filter((m) => (m.Subject ?? "").includes("Ustaw hasło")).length === 0,
    "klient płacący natychmiastowo dostał także mail „Ustaw hasło” — miał dostać jedną wiadomość, nie dwie w tej samej sekundzie"
  );
  sprawdz(
    skrzynkaSkip.filter((m) => (m.Subject ?? "").includes("gotow")).length === 1,
    `klient płacący natychmiastowo ma w skrzynce ${skrzynkaSkip.filter((m) => (m.Subject ?? "").includes("gotow")).length} maili o kursie — miał dokładnie jeden`
  );
  sprawdz(wp("aai-platnosci", "sprawdz").kod === 0, "kontrola ma pominięty mail 1 za błąd — pominięcie po potwierdzonym mailu 2 jest stanem poprawnym");

  /* ── 7. awaria maila 2 przy płatności natychmiastowej: mail 1 MUSI wyjść (K1) ──
   *
   * Pominięcie maila 1 wolno zapisać dopiero po potwierdzonym „wyslano”
   * maila 2. Gdy poczta pada, klient musi dostać mail 1 — bez niego nie
   * miałby ANI JEDNEJ wiadomości z linkiem do hasła. Awarię maila 2 ma
   * pokazać kontrola (kod 1), z komendą ponowienia.
   */
  await wyczysc();
  const klientFall = Number(
    php(
      `add_filter( 'pre_wp_mail', function ( $krotkie, $atts ) {` +
        ` return ( is_array( $atts ) && str_contains( (string) ( $atts['subject'] ?? '' ), 'gotow' ) ) ? false : $krotkie; }, 10, 2 );` +
        ` $uid = wc_create_new_customer( 'smoke-p6-fall@example.test', 'smoke-p6-fall', wp_generate_password() );` +
        ` $o = wc_create_order( array( 'customer_id' => (int) $uid ) );` +
        ` $o->add_product( wc_get_product( ${produktA} ), 1 );` +
        ` $o->set_payment_method( 'bacs' ); $o->calculate_totals();` +
        ` $o->payment_complete( 'SMOKE-P6-FALL' );` +
        ` update_option( 'smoke_p6_zamowienie', (int) $o->get_id() );` +
        ` echo (int) $uid;`
    )
  );
  const zamFall = Number(php(`echo (int) get_option( 'smoke_p6_zamowienie', 0 ); delete_option( 'smoke_p6_zamowienie' );`));
  uzytkownicy.push(klientFall);
  zamowienia.push(zamFall);
  sprawdz(klientFall > 0 && zamFall > 0, "scena awarii maila 2 nie powstała — pomiar byłby ślepy");
  sprawdz(
    wynikDostawy("mail_konta", klientFall) === "wyslano",
    `mail 2 padł, a mail 1 ma wynik „${wynikDostawy("mail_konta", klientFall)}” — bez drogi zapasowej klient nie ma ANI JEDNEJ wiadomości z linkiem do hasła (K1)`
  );
  sprawdz(
    wynikDostawy("mail_kursu", zamFall).startsWith("blad"),
    "awaria maila 2 nie została zapisana w dzienniku — kontrola nie ma czego pokazać do ponowienia"
  );
  const skrzynkaFall = (await skrzynka()).filter((m) => doKogo(m).includes("smoke-p6-fall@example.test"));
  sprawdz(
    skrzynkaFall.filter((m) => (m.Subject ?? "").includes("Ustaw hasło")).length === 1,
    "przy padniętym mailu 2 klient nie dostał maila „Ustaw hasło” — gwarancja K1 złamana"
  );
  sprawdz(wp("aai-platnosci", "sprawdz").kod === 1, "kontrola nie widzi niewysłanego maila 2 — awaria poczty przy zakupie zniknęła z radaru");
  php(`delete_option( 'aai_platnosci_blad' ); echo 'ok';`);

  /* ── 8. cisza o cudzych hasłach: rdzeń nie mailuje admina ─────────
   *
   * Decyzja właściciela 2026-08-30: wp_password_change_notification()
   * zawiadamia ADMINISTRATORA o każdej zmianie hasła (klient z tej
   * funkcji nie dostaje nic — zmierzone przy P4). Przy sprzedaży to
   * jeden mail na każdego klienta; callback ma być zdjęty, a reset ma
   * dalej działać.
   */
  await wyczysc();
  sprawdz(
    php(`echo has_action( 'after_password_reset', 'wp_password_change_notification' ) ? 'WISI' : 'zdjety';`) === "zdjety",
    "powiadomienie admina o zmianie hasła dalej wisi na after_password_reset — każdy klient ustawiający hasło będzie mailował właściciela"
  );
  const resetOk = php(
    `$u = get_user_by( 'id', ${klientFall} );` +
      ` $k = get_password_reset_key( $u );` +
      ` $s = check_password_reset_key( $k, $u->user_login );` +
      ` if ( is_wp_error( $s ) ) { echo 'blad klucza'; return; }` +
      ` reset_password( $u, wp_generate_password( 24 ) ); echo 'ok';`
  );
  sprawdz(resetOk === "ok", `reset hasła nie przeszedł (${resetOk}) — pomiar ciszy byłby ślepy`);
  const poResecie = await skrzynka();
  sprawdz(
    poResecie.filter((m) => (m.Subject ?? "").includes("Hasło zostało zmienione")).length === 0,
    "po resecie hasła admin dostał mail „Hasło zostało zmienione” — wyciszenie nie działa"
  );

} finally {
  /* ── sprzątanie ─────────────────────────────────────────────────── */
  // Wyjątek ze sprzątania NIE MOŻE przesłonić prawdziwego błędu z bloku
  // `try` — notujemy go zamiast rzucać. Rachunek sumienia i tak zapali się
  // poniżej, bo skrzynka nie wróci wtedy do stanu sprzed przebiegu.
  await wyczysc().catch((e) => console.error(`  (sprzątanie poczty nie doszło do skutku: ${e.message})`));
  /*
   * PRZYWRACAMY STAN, NIE „ZAPISUJEMY PUSTĄ WARTOŚĆ". Zmierzone przy teście
   * całości (2026-08-31): na czystej instalacji opcji NIE MA, a `update_option`
   * z pustym łańcuchem zostawiał ją istniejącą — semantycznie to dalej
   * zamknięta sprzedaż, ale stan nie jest ten sam, który zastaliśmy.
   * Ta sama lekcja co w 0.51.0, tylko w drugą stronę.
   */
  if (sprzedazIstniala) {
    php(`update_option( 'aai_platnosci_sprzedaz_otwarta', '${sprzedazPrzed}' ); echo 'ok';`);
  } else {
    php("delete_option( 'aai_platnosci_sprzedaz_otwarta' ); echo 'ok';");
  }
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
        ` Aai_Sklep_Zapis::usun_kurs( '${uuid}', 'smoke-p4', true, true );` +
        ` Aai_Platnosci_Zapis::powiazanie_usun( '${uuid}' );` +
        ` foreach ( array( ${produkt}, is_int( $t ) ? $t : 0 ) as $id ) { if ( $id > 0 && get_post( $id ) ) { wp_delete_post( $id, true ); } } echo 'ok';`
    );
  }
}

/* ── rachunek sumienia: smoke nie zostawia śmieci ───────────────────── */

sprawdz(liczba("product") === produktowPrzed, `smoke zostawił produkt: przed ${produktowPrzed}, po ${liczba("product")}`);
sprawdz(liczbaZamowien() === zamowienPrzed, `smoke zostawił zamówienie: przed ${zamowienPrzed}, po ${liczbaZamowien()}`);
sprawdz(dostaw() === dostawPrzed, `smoke zostawił wiersze dziennika dostaw: przed ${dostawPrzed}, po ${dostaw()}`);
sprawdz(
  zapisow() === zapisowPrzed,
  `smoke zostawił zapis na kurs: przed ${zapisowPrzed}, po ${zapisow()} — sierota po skasowanym zamówieniu zawyża licznik zapisanych`
);
const pocztyPo = await ilePoczty();
sprawdz(
  pocztyPo === pocztyPrzed,
  `skrzynka nie wróciła do stanu sprzed przebiegu: przed ${pocztyPrzed}, po ${pocztyPo} — ` +
    "bramka albo zostawia własne wiadomości, albo kasuje CUDZE (czwarte zgłoszenie z testu P6)"
);
sprawdz(wp("aai-platnosci", "sprawdz").kod === 0, "po sprzątaniu kontrola czerwona — smoke zostawił rozjazd");

if (bledy.length > 0) {
  console.error(`smoke-wp-maile: ${bledy.length} z ${sprawdzen} sprawdzeń padło:`);
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}
console.log(`smoke-wp-maile: OK (${sprawdzen} sprawdzeń na żywej instalacji).`);
