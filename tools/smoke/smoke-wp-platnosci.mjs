/**
 * Smoke fundamentu Pluginu 2 (`aai-platnosci`) — bramka kroku P1.
 *
 * Mierzy ZACHOWANIE na żywej instalacji, nie deklaracje kodu:
 *  - aktywacja jest idempotentna (druga aktywacja niczego nie psuje),
 *  - obie tabele istnieją i mają UNIQUE, na którym stoi idempotencja,
 *  - `dostawa_odnotuj` jest ATOMOWA: pierwszy przebieg true, drugi false
 *    (to jest jednocześnie test negatywny znacznika — duplikat NIE
 *    przechodzi),
 *  - `powiazanie_ustaw` jest idempotentne, a produkt powiązany z INNYM
 *    kursem zostaje odrzucony (UNIQUE na product_id — B4: „weź pierwszy"
 *    nie istnieje),
 *  - deaktywacja przestawia produkt z `powiazania` na `draft` i NIE
 *    kasuje go (L4 + niezmiennik 13); ponowna aktywacja przywraca szew,
 *  - `wp aai-platnosci sprawdz` kończy się kodem 0 na zdrowym środowisku
 *    i kodem 1 przy braku tabel (test negatywny na tabeli TESTOWEJ kopii
 *    nie robimy — zamiast tego mierzymy stan „Woo wyłączone" = kod 0
 *    z komunikatem, z migawką `monetize_by` przed i po),
 *  - front `/szkolenia/` i kokpit oddają 200 z aktywną wtyczką (nie ma
 *    białego ekranu).
 *
 * Smoke sprząta po sobie WSZYSTKO (produkt testowy, wiersze tabel)
 * i na końcu porównuje liczniki obu tabel ze stanem sprzed przebiegu —
 * ta sama zasada co w smoke-wp-dane: test ma prawo psuć swoje dane,
 * nie ma prawa zostawić śladu w cudzych.
 *
 * WYMAGA środowiska: `cd wordpress/srodowisko && ./postaw.sh`.
 * Nie wchodzi do `npm run smoke` ani CI — CI nie ma podmana.
 *
 * Użycie: node tools/smoke/smoke-wp-platnosci.mjs
 */
import { execFileSync } from "node:child_process";

const STACK = process.env.STACK_NAZWA ?? "aai_wp";
const KONTENER = `${STACK}_cli`;
const ADRES = process.env.WP_ADRES ?? "http://127.0.0.1:8892";
const UUID_A = "aaaa0000-0000-4000-8000-00000000p001";
const UUID_B = "aaaa0000-0000-4000-8000-00000000p002";

const bledy = [];
let sprawdzen = 0;

function sprawdz(warunek, opis) {
  sprawdzen += 1;
  if (!warunek) bledy.push(opis);
}

/** wp-cli w kontenerze: {kod, stdout, stderr}. */
function wp(...argumenty) {
  const wynik = spawn(["exec", KONTENER, "wp", ...argumenty]);
  return wynik;
}
function spawn(argumenty) {
  try {
    const stdout = execFileSync("podman", argumenty, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { kod: 0, stdout: stdout.trim(), stderr: "" };
  } catch (e) {
    return { kod: e.status ?? 1, stdout: (e.stdout ?? "").toString().trim(), stderr: (e.stderr ?? "").toString().trim() };
  }
}
/** `wp eval` z kodem PHP; zwraca stdout. */
function phpEval(kod) {
  return wp("eval", kod);
}
async function http(sciezka) {
  const odp = await fetch(`${ADRES}${sciezka}`, { redirect: "follow" });
  return odp.status;
}

/* ── stan wyjściowy ─────────────────────────────────────────────────── */

const aktywna = wp("plugin", "get", "aai-platnosci", "--field=status");
sprawdz(aktywna.stdout === "active", `wtyczka aai-platnosci nie jest aktywna (status: ${aktywna.stdout})`);

const licznikiPrzed = phpEval(
  'global $wpdb; echo (int) $wpdb->get_var("SELECT COUNT(*) FROM " . Aai_Platnosci_Tabele::tabela("powiazania")), ":", (int) $wpdb->get_var("SELECT COUNT(*) FROM " . Aai_Platnosci_Tabele::tabela("dostawy"));'
).stdout;

/* ── 1. aktywacja idempotentna ──────────────────────────────────────── */

wp("plugin", "deactivate", "aai-platnosci");
const aktywacja1 = wp("plugin", "activate", "aai-platnosci");
const aktywacja2 = phpEval("Aai_Platnosci_Tabele::utworz(); echo 'ok';");
sprawdz(aktywacja1.kod === 0, `ponowna aktywacja padła: ${aktywacja1.stderr}`);
sprawdz(aktywacja2.stdout.endsWith("ok"), `drugie utworzenie schematu padło: ${aktywacja2.stderr}`);
sprawdz(
  phpEval("echo Aai_Platnosci_Tabele::istnieja() ? 'sa' : 'brak';").stdout.endsWith("sa"),
  "po podwójnym utworzeniu schematu tabele nie istnieją"
);

/* ── 2. atomowość dostaw (test negatywny duplikatu) ─────────────────── */

const d1 = phpEval("echo Aai_Platnosci_Zapis::dostawa_odnotuj('smoke_mail', 999999001, 'proba') ? 'true' : 'false';").stdout;
const d2 = phpEval("echo Aai_Platnosci_Zapis::dostawa_odnotuj('smoke_mail', 999999001, 'proba') ? 'true' : 'false';").stdout;
sprawdz(d1.endsWith("true"), `pierwsze odnotowanie dostawy oddało ${d1}, oczekiwano true`);
sprawdz(d2.endsWith("false"), `DUPLIKAT dostawy oddał ${d2}, oczekiwano false — znacznik idempotencji nie jest atomowy`);

phpEval("Aai_Platnosci_Zapis::dostawa_wynik('smoke_mail', 999999001, 'wyslano');");
const wynikDostawy = phpEval(
  'global $wpdb; echo $wpdb->get_var($wpdb->prepare("SELECT wynik FROM " . Aai_Platnosci_Tabele::tabela("dostawy") . " WHERE zdarzenie = %s AND identyfikator = %d", "smoke_mail", 999999001));'
).stdout;
sprawdz(wynikDostawy.endsWith("wyslano"), `dopisanie wyniku dostawy nie zadziałało (jest: ${wynikDostawy})`);

/* ── 3. powiązania: idempotencja + odmowa drugiego kursu ────────────── */

const produkt = wp("post", "create", "--post_type=product", "--post_status=publish", "--post_title=Smoke P1 produkt", "--porcelain");
const produktId = Number(produkt.stdout);
sprawdz(Number.isInteger(produktId) && produktId > 0, `nie powstał produkt testowy: ${produkt.stderr}`);

const p1 = phpEval(`echo Aai_Platnosci_Zapis::powiazanie_ustaw('${UUID_A}', ${produktId}) ? 'true' : 'false';`).stdout;
const p2 = phpEval(`echo Aai_Platnosci_Zapis::powiazanie_ustaw('${UUID_A}', ${produktId}) ? 'true' : 'false';`).stdout;
const p3 = phpEval(`echo Aai_Platnosci_Zapis::powiazanie_ustaw('${UUID_B}', ${produktId}) ? 'true' : 'false';`).stdout;
sprawdz(p1.endsWith("true"), `powiązanie nie weszło: ${p1}`);
sprawdz(p2.endsWith("true"), `powtórka tego samego powiązania padła: ${p2}`);
sprawdz(
  p3.endsWith("false"),
  `ten sam produkt powiązał się z DRUGIM kursem (${p3}) — UNIQUE na product_id nie działa, „weź pierwszy" wróciło (B4)`
);
const liczbaPowiazan = phpEval(
  'global $wpdb; echo (int) $wpdb->get_var("SELECT COUNT(*) FROM " . Aai_Platnosci_Tabele::tabela("powiazania"));'
).stdout;
sprawdz(
  Number(liczbaPowiazan) === Number(licznikiPrzed.split(":")[0]) + 1,
  `po trzech próbach powiązania liczba wierszy to ${liczbaPowiazan}, oczekiwano +1 wobec ${licznikiPrzed.split(":")[0]}`
);

/* ── 4. deaktywacja → produkt draft, bez kasowania ──────────────────── */

wp("plugin", "deactivate", "aai-platnosci");
const statusPo = wp("post", "get", String(produktId), "--field=post_status");
sprawdz(statusPo.stdout === "draft", `po deaktywacji produkt ma status „${statusPo.stdout}", oczekiwano draft (L4 — zostaje kupowalny)`);
const istniejePo = wp("post", "get", String(produktId), "--field=ID");
sprawdz(istniejePo.stdout === String(produktId), "po deaktywacji produkt ZNIKNĄŁ — kasowanie jest zakazane (niezmiennik 13)");
wp("plugin", "activate", "aai-platnosci");

/* ── 5. kontrola: kod 0 na zdrowym, kod 1 bez tabel, kod 0 bez Woo ──── */

const zdrowa = wp("aai-platnosci", "sprawdz");
sprawdz(zdrowa.kod === 0, `sprawdz na zdrowym środowisku oddało kod ${zdrowa.kod}: ${zdrowa.stderr}`);
sprawdz(/wersje dowiedzione|INNE niż dowiedzione/.test(zdrowa.stdout + zdrowa.stderr), "sprawdz nie mówi nic o wersjach Tutora/Woo (L17)");

// Test negatywny kontroli: chowamy tabelę powiazań pod tymczasową nazwą.
phpEval('global $wpdb; $t = Aai_Platnosci_Tabele::tabela("powiazania"); $wpdb->query("RENAME TABLE `{$t}` TO `{$t}_smoke_schowek`");');
const bezTabel = wp("aai-platnosci", "sprawdz");
phpEval('global $wpdb; $t = Aai_Platnosci_Tabele::tabela("powiazania"); $wpdb->query("RENAME TABLE `{$t}_smoke_schowek` TO `{$t}`");');
sprawdz(bezTabel.kod === 1, `sprawdz BEZ tabeli powiazań oddało kod ${bezTabel.kod}, oczekiwano 1 — kontrola jest ślepa na własny rozjazd`);

// Stan „Woo wyłączone" = kod 0 z komunikatem (bramka P1). Migawka
// monetize_by przed i po — deaktywacja Woo nie może zostawić śladu (B17).
const monetizePrzed = phpEval('echo tutor_utils()->get_option("monetize_by");').stdout;
wp("plugin", "deactivate", "woocommerce");
const bezWoo = wp("aai-platnosci", "sprawdz");
wp("plugin", "activate", "woocommerce");
const monetizePo = phpEval('echo tutor_utils()->get_option("monetize_by");').stdout;
sprawdz(bezWoo.kod === 0, `sprawdz bez Woo oddało kod ${bezWoo.kod}, oczekiwano 0 (stan nazwany, nie rozjazd — L11)`);
sprawdz(/wyłączone/.test(bezWoo.stdout + bezWoo.stderr), "sprawdz bez Woo nie mówi, że otoczenie jest wyłączone");
sprawdz(
  monetizePrzed === monetizePo,
  `deaktywacja Woo w smoke'u ZMIENIŁA monetize_by (${monetizePrzed} → ${monetizePo}) — przywróć ręcznie i zbadaj B17`
);

/* ── 6. żaden ekran nie jest biały ──────────────────────────────────── */

sprawdz((await http("/szkolenia/")) === 200, "front /szkolenia/ nie oddaje 200 przy aktywnym aai-platnosci");
sprawdz((await http("/wp-login.php")) === 200, "ekran logowania nie oddaje 200 przy aktywnym aai-platnosci");

/* ── sprzątanie + rachunek sumienia ─────────────────────────────────── */

phpEval(`Aai_Platnosci_Zapis::powiazanie_usun('${UUID_A}');`);
phpEval(
  'global $wpdb; $wpdb->delete(Aai_Platnosci_Tabele::tabela("dostawy"), array("zdarzenie" => "smoke_mail", "identyfikator" => 999999001), array("%s", "%d"));'
);
wp("post", "delete", String(produktId), "--force");

const licznikiPo = phpEval(
  'global $wpdb; echo (int) $wpdb->get_var("SELECT COUNT(*) FROM " . Aai_Platnosci_Tabele::tabela("powiazania")), ":", (int) $wpdb->get_var("SELECT COUNT(*) FROM " . Aai_Platnosci_Tabele::tabela("dostawy"));'
).stdout;
sprawdz(
  licznikiPo === licznikiPrzed,
  `smoke zostawił ślad w tabelach: przed ${licznikiPrzed}, po ${licznikiPo}`
);

/* ── wynik ──────────────────────────────────────────────────────────── */

if (bledy.length > 0) {
  console.error(`smoke-wp-platnosci: ${bledy.length} z ${sprawdzen} sprawdzeń padło:`);
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}
console.log(`smoke-wp-platnosci: OK (${sprawdzen} sprawdzeń na żywej instalacji).`);
