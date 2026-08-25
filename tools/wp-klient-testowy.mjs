/**
 * Konto KLIENTA do testu ręcznego (krok W6).
 *
 * PO CO. Materiał kursu jest towarem: klient czyta go dopiero po zakupie,
 * a właściciel ogląda WordPressa jako administrator. Administrator widzi
 * wszystko z definicji, więc testowanie widoku lekcji na własnym koncie
 * odpowiada na inne pytanie niż zadane — nie „czy klient to zobaczy",
 * tylko „czy admin to zobaczy". Do W6 potrzebne jest osobne konto bez
 * uprawnień, zapisane na kursy tak, jak zapisze je zakup (Plugin 2).
 *
 * CO ROBI, IDEMPOTENTNIE:
 *   1. zakłada (albo odświeża) konto `klient-test` w roli `subscriber`,
 *   2. gasi mu pasek narzędzi WordPressa — klient go nie ma, a pasek
 *      przesuwa całą stronę o 32 px i zasłania pigułkę lekcji,
 *   3. zapisuje je na WSZYSTKIE opublikowane kursy,
 *   4. zapisuje hasło do `wordpress/srodowisko/.env` (plik jest poza
 *      gitem) — hasła nie wpisujemy do dokumentacji ani do repozytorium,
 *   5. WERYFIKUJE dostęp w OSOBNYM żądaniu.
 *
 * Punkt 5 nie jest ceremonią. `tutor_utils()->is_enrolled()` w tym samym
 * żądaniu, w którym powstał zapis, oddaje `false` — Tutor trzyma zapisy
 * w pamięci żądania. Sprawdzenie zaraz po zapisie meldowałoby więc
 * porażkę przy udanym zapisie (albo, przy odwrotnej pomyłce, sukces bez
 * pokrycia).
 *
 * WYMAGA lokalnego środowiska: `cd wordpress/srodowisko && ./postaw.sh`.
 *
 * Użycie:
 *   node tools/wp-klient-testowy.mjs          # załóż / odśwież i zapisz na kursy
 *   node tools/wp-klient-testowy.mjs --usun   # skasuj konto po teście
 */
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const STACK = process.env.STACK_NAZWA ?? "aai_wp";
const KONTENER = `${STACK}_cli`;
const PLIK_ENV = "wordpress/srodowisko/.env";
const LOGIN = "klient-test";
const KLUCZ_HASLA = "WP_KLIENT_HASLO";

function wp(...argumenty) {
  return execFileSync("podman", ["exec", KONTENER, "wp", "--path=/var/www/html", ...argumenty], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "inherit"],
  }).trim();
}

/** Hasło bez cudzysłowów i odwrotnych ukośników — wchodzi do literału PHP i do `.env`. */
const noweHaslo = () => randomBytes(18).toString("base64url");

function zapiszDoEnv(klucz, wartosc) {
  let tekst;
  try {
    tekst = readFileSync(PLIK_ENV, "utf8");
  } catch {
    console.error(`Nie widzę ${PLIK_ENV} — czy środowisko jest postawione? (wordpress/srodowisko/postaw.sh)`);
    process.exit(1);
  }
  const linie = tekst.split("\n");
  const i = linie.findIndex((l) => l.startsWith(`${klucz}=`));
  if (i >= 0) linie[i] = `${klucz}=${wartosc}`;
  else {
    // Bez pustej linii na końcu plik rósłby o jedną z każdym przebiegiem.
    while (linie.length > 0 && linie[linie.length - 1] === "") linie.pop();
    linie.push(`${klucz}=${wartosc}`);
  }
  writeFileSync(PLIK_ENV, `${linie.join("\n")}\n`);
}

/* ---------- kasowanie ---------- */

if (process.argv.includes("--usun")) {
  const wynik = wp(
    "eval",
    `$u = get_user_by('login', '${LOGIN}');
     if (!$u) { echo 'NIE BYLO'; return; }
     $zapisy = get_posts(array('post_type' => 'tutor_enrolled', 'post_status' => 'any', 'author' => $u->ID, 'numberposts' => -1, 'fields' => 'ids'));
     foreach ($zapisy as $z) { wp_delete_post((int) $z, true); }
     require_once ABSPATH . 'wp-admin/includes/user.php';
     wp_delete_user($u->ID);
     echo 'SKASOWANE ' . count($zapisy);`
  );
  console.log(`wp-klient-testowy: ${wynik === "NIE BYLO" ? "konta nie było — nie ma czego kasować" : `konto skasowane (zapisów: ${wynik.split(" ")[1]})`}`);
  process.exit(0);
}

/* ---------- założenie / odświeżenie ---------- */

const haslo = noweHaslo();
const surowy = wp(
  "eval",
  `$haslo = '${haslo}';
   $u = get_user_by('login', '${LOGIN}');
   if ($u) {
     wp_set_password($haslo, $u->ID);
     $id = $u->ID;
     $stan = 'odswiezone';
   } else {
     $id = wp_insert_user(array(
       'user_login'   => '${LOGIN}',
       'user_pass'    => $haslo,
       'user_email'   => '${LOGIN}@example.invalid',
       'display_name' => 'Klient Testowy',
       'role'         => 'subscriber',
     ));
     if (is_wp_error($id)) { echo json_encode(array('blad' => $id->get_error_message())); return; }
     $stan = 'zalozone';
   }
   // Pasek narzędzi gasimy tak, jak robi to sam WordPress przy odznaczonym
   // „Pokaż pasek narzędzi" — inaczej właściciel testowałby układ, którego
   // klient nigdy nie zobaczy.
   update_user_meta($id, 'show_admin_bar_front', 'false');

   $typy  = Aai_Sklep_Tutor::typy();
   $kursy = get_posts(array('post_type' => $typy['kurs'], 'post_status' => 'publish', 'numberposts' => -1));
   $zapisane = array();
   foreach ($kursy as $k) {
     if (!tutor_utils()->is_enrolled($k->ID, $id)) { tutor_utils()->do_enroll($k->ID, 0, $id); }
     $zapisane[] = array('id' => $k->ID, 'tytul' => $k->post_title);
   }
   echo json_encode(array('id' => $id, 'stan' => $stan, 'kursy' => $zapisane));`
);

const wynik = JSON.parse(surowy.split("\n").pop());
if (wynik.blad) {
  console.error(`wp-klient-testowy: WordPress odmówił założenia konta — ${wynik.blad}`);
  process.exit(1);
}
if (wynik.kursy.length === 0) {
  console.error(
    "wp-klient-testowy: nie ma ANI JEDNEGO opublikowanego kursu, więc nie ma na co zapisać konta.\n" +
      "  Wgraj dane: npm run wp:import && npm run wp:sync && npm run wp:zrzuty"
  );
  process.exit(1);
}

/* ---------- weryfikacja W OSOBNYM ŻĄDANIU ---------- */

const sprawdzenie = JSON.parse(
  wp(
    "eval",
    `$id = get_user_by('login', '${LOGIN}')->ID;
     $typy = Aai_Sklep_Tutor::typy();
     $kursy = get_posts(array('post_type' => $typy['kurs'], 'post_status' => 'publish', 'numberposts' => -1, 'fields' => 'ids'));
     $bez = array();
     foreach ($kursy as $k) { if (!tutor_utils()->is_enrolled((int) $k, $id)) { $bez[] = (int) $k; } }
     $pasek = get_user_meta($id, 'show_admin_bar_front', true);
     echo json_encode(array('bez_dostepu' => $bez, 'pasek' => $pasek, 'role' => implode(',', get_userdata($id)->roles)));`
  ).split("\n").pop()
);

const usterki = [];
if (sprawdzenie.bez_dostepu.length > 0) usterki.push(`brak dostępu do kursów: ${sprawdzenie.bez_dostepu.join(", ")}`);
if (sprawdzenie.pasek !== "false") usterki.push(`pasek narzędzi nie zgaszony (meta: „${sprawdzenie.pasek}")`);
if (sprawdzenie.role !== "subscriber") usterki.push(`rola to „${sprawdzenie.role}", a miała być „subscriber"`);

if (usterki.length > 0) {
  console.error(`wp-klient-testowy: konto ${wynik.stan}, ale weryfikacja padła:`);
  for (const u of usterki) console.error(`  - ${u}`);
  process.exit(1);
}

zapiszDoEnv(KLUCZ_HASLA, haslo);

console.log(`wp-klient-testowy: konto ${wynik.stan} i sprawdzone w osobnym żądaniu.`);
console.log(`  login:  ${LOGIN}`);
console.log(`  hasło:  w ${PLIK_ENV}, klucz ${KLUCZ_HASLA} (poza gitem — do repozytorium nie wchodzi)`);
console.log(`  rola:   subscriber, pasek narzędzi zgaszony`);
for (const k of wynik.kursy) console.log(`  dostęp: ${k.tytul}`);
console.log(`  po teście: node tools/wp-klient-testowy.mjs --usun`);
