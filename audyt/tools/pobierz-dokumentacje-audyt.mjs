/**
 * Pobiera dokumentację potrzebną sektorowi AUDYT (etap E3).
 *
 * ZASADA KOTWICY (rozstrzygnięcie właściciela, 2026-09-01): pobieramy WYŁĄCZNIE
 * to, na co wskazuje co najmniej jedna pozycja checklisty z `audyt/ROLE.md`
 * albo jawna potrzeba roli. Każde źródło ma tu pole `kotwica` i to samo pole
 * trafia do `ZRODLA.md`. Źródło bez kotwicy jest błędem, nie zapasem —
 * dokumentacja, której nikt nie ma powodu otworzyć, kosztuje tokeny przy
 * KAŻDYM z ~80 agentów i w OBU falach.
 *
 * DLACZEGO TUTAJ, A NIE W `tools/`. Sektor żyje wyłącznie na swojej gałęzi
 * (D7), a niezmiennik brzmi `git diff main --name-only -- . ':!audyt' ':!re-audyt'` → 0.
 * Skrypt w `tools/` łamałby go przy pierwszym commicie. Cena jest nazwana
 * wprost i jest to świadomy koszt z K8: `straznik-wagi-dokumentacji` z `main`
 * skanuje TYLKO katalog `tools/`, więc tego skryptu NIE WIDZI. Manifest
 * (`KATALOG_DZIALU` + `KATALOGI_MASOWE`) eksportujemy mimo to — przejmie go
 * `straznik-sektora-audytu` w E4, a kontrakt zostaje ten sam, żeby przeniesienie
 * skryptu nie wymagało przepisywania niczego.
 *
 * IDEMPOTENCJA. Plik, który już jest i nie jest pusty, nie jest pobierany
 * ponownie. `--odswiez` wymusza pobranie od nowa.
 *
 * GŁOŚNA AWARIA. Każde nieudane źródło kończy przebieg kodem 1 i jest wypisane
 * z nazwy. Skrypt, który po cichu pomija źródło, daje katalog wyglądający na
 * kompletny — to ta sama klasa co „test przechodzi po pustce".
 *
 * Użycie:
 *   node audyt/tools/pobierz-dokumentacje-audyt.mjs [--odswiez] [--tylko=<grupa>]
 */
import { mkdir, writeFile, access, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { execFile } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const wykonaj = promisify(execFile);
const KORZEN = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * GDZIE LĄDUJE DOKUMENTACJA — POZA DRZEWEM REPO.
 *
 * Pierwsza wersja pobierała do `audyt/dokumentacja/` z zagnieżdżonym
 * `.gitignore`. Git był zadowolony, `straznik-linkow` NIE: **strażnicy skanują
 * DYSK, nie git**, a pliki MDN mają odsyłacze bezwzględne (`/en-US/docs/…`),
 * które lokalnie nie prowadzą donikąd — 66 fałszywych alarmów w jednym
 * przebiegu. Wykluczenie w strażniku jest wpisane na sztywno na JEDNĄ ścieżkę
 * (`docs/dokumentacja-techniczna`), a sektor nie może go rozszerzyć, bo to
 * plik poza `audyt/` i złamałoby to niezmiennik.
 *
 * To ta sama klasa, przez którą motyw Automatic AI mieszka w
 * `~/.cache/automatic-ai-warsztat`, a nie w drzewie repo — tam zapalił
 * `straznik-seo`. Idziemy tą samą drogą.
 */
const DOMYSLNY_CEL = join(homedir(), ".cache", "aai-audyt-dokumentacja");
const CEL = process.env.AAI_AUDYT_DOKUMENTACJA ?? DOMYSLNY_CEL;

/**
 * MANIFEST dla strażnika sektora (E4). Kontrakt zostaje ten sam co w
 * `tools/pobierz-dokumentacje-*.mjs`, żeby przeniesienie skryptu nie wymagało
 * przepisywania niczego — zmienia się tylko to, że katalog leży poza repo.
 */
export const KATALOG_DZIALU = CEL;
export const KATALOGI_MASOWE = [
  "cudzy-kod", "owasp", "mdn", "php", "prawo", "agentowa", "narzedzia",
].map((k) => join(CEL, k));
const AGENT = "pobierz-dokumentacje-audyt (Pod-strona-Szkolenia, sektor AUDYT)";

/* ══════════════════════════════════════════════════════════════════════════
   ŹRÓDŁA — każde z kotwicą w checkliście
   ══════════════════════════════════════════════════════════════════════════ */

const OWASP = "https://raw.githubusercontent.com/OWASP/CheatSheetSeries/master/cheatsheets/";

/** Typ 5 — specjalistyczna dla Security (i punktowo dla PRIV, BE, KON). */
const ZRODLA_OWASP = [
  ["SQL_Injection_Prevention_Cheat_Sheet.md", "SEC-03, BD-05"],
  ["Injection_Prevention_Cheat_Sheet.md", "SEC-03"],
  ["Cross_Site_Scripting_Prevention_Cheat_Sheet.md", "SEC-04, FE-*"],
  ["Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.md", "SEC-01"],
  ["Authentication_Cheat_Sheet.md", "SEC-09"],
  ["Authorization_Cheat_Sheet.md", "SEC-02, SEC-05"], // Access_Control jest WYCOFANY i odsyła tutaj
  ["Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.md", "SEC-05, SEC-06"],
  ["Session_Management_Cheat_Sheet.md", "SEC-08"],
  ["Content_Security_Policy_Cheat_Sheet.md", "SEC-07"],
  ["Denial_of_Service_Cheat_Sheet.md", "SEC-08"],
  ["Secrets_Management_Cheat_Sheet.md", "SEC-10"],
  ["PHP_Configuration_Cheat_Sheet.md", "SEC-11, WDR-06"],
  ["Error_Handling_Cheat_Sheet.md", "SEC-12, BE-10"],
  ["Mass_Assignment_Cheat_Sheet.md", "BE-12, BD-11"],
  ["Input_Validation_Cheat_Sheet.md", "BE-12, BD-11"],
  ["Database_Security_Cheat_Sheet.md", "BD-01, BD-09"],
  ["File_Upload_Cheat_Sheet.md", "SEC-04, WDR-02"],
  ["Logging_Cheat_Sheet.md", "PRIV-01, PRIV-02"],
  ["User_Privacy_Protection_Cheat_Sheet.md", "PRIV-03, PRIV-05"],
  ["Password_Storage_Cheat_Sheet.md", "PRIV-02"],
  ["Abuse_Case_Cheat_Sheet.md", "KON-A3, KON faza B"],
  ["Web_Service_Security_Cheat_Sheet.md", "SEC-05, INT-*"],
];

const MDN = "https://raw.githubusercontent.com/mdn/content/main/files/en-us/";

/** Typ 2 uzupełniony + typ 6 (systemowa: zachowanie przeglądarek). */
const ZRODLA_MDN = [
  ["web/http/reference/headers/content-security-policy/index.md", "csp.md", "SEC-07"],
  ["web/css/reference/at-rules/%40layer/index.md", "css-layer.md", "FE-*, INT-05"],
  ["web/css/reference/values/revert-layer/index.md", "css-revert-layer.md", "INT-05"],
  ["web/css/guides/cascade/index.md", "css-kaskada.md", "FE-*, INT-05"],
  ["web/api/navigator/sendbeacon/index.md", "sendbeacon.md", "typ 6 — przeglądarki"],
  ["web/api/document/visibilitychange_event/index.md", "visibilitychange.md", "typ 6 — przeglądarki"],
  ["web/api/window/pageshow_event/index.md", "pageshow.md", "typ 6 — bfcache"],
  ["web/performance/guides/how_browsers_work/index.md", "jak-dzialaja-przegladarki.md", "PERF-02"],
  ["web/accessibility/aria/index.md", "aria.md", "FE-07"],
  ["web/accessibility/guides/understanding_wcag/index.md", "wcag.md", "FE — dostępność"],
  ["web/http/guides/caching/index.md", "cache-http.md", "PERF-04, PERF-07"],
  ["web/api/web_storage_api/index.md", "web-storage.md", "PROTO-*"],
];

/** Typ 6 — systemowa: język i środowisko, w którym stoi produkt. */
const ZRODLA_PHP = [
  ["class.throwable.php", "throwable.md", "SEC-12, BE-10, INT-04"],
  ["class.argumentcounterror.php", "argumentcounterror.md", "SEC-12"],
  ["language.exceptions.php", "wyjatki.md", "BE-10"],
  ["migration84.incompatible.php", "php84-niezgodnosci.md", "typ 6 — wersja PHP"],
  ["language.operators.precedence.php", "priorytety-operatorow.md", "BE-* (konkatenacja przed ?:)"],
  ["language.types.string.php", "lancuchy.md", "BE-08 (backslashe)"],
  ["function.hash-equals.php", "hash-equals.md", "SEC-09"],
  ["book.pdo.php", "pdo.md", "BD-01"],
];

/**
 * Typ 1 — dziedzinowa: prawo, którego produkt dotyka.
 *
 * EUR-LEX I CELLAR SĄ NIEDOSTĘPNE DLA AUTOMATU — zmierzone: `eur-lex.europa.eu`
 * oddaje **HTTP 202 z pustym ciałem** przy każdej próbie (także po odczekaniu),
 * a `publications.europa.eu/resource/celex/...` oddaje 400. Bierzemy więc
 * kanały, które odpowiadają, i **nazywamy ich rangę w ZRODLA.md**: to nie są
 * teksty z Dziennika Urzędowego, tylko wierne przedruki. Do rozstrzygnięć
 * prawnych i tak potrzebny jest prawnik — audyt ma tu WIEDZIEĆ, o co pytać,
 * a nie wydawać opinii.
 */
const ZRODLA_PRAWO = [
  ["https://gdpr-info.eu/art-5-gdpr/", "rodo-art-05-zasady.md", "PRIV-01, PRIV-04"],
  ["https://gdpr-info.eu/art-6-gdpr/", "rodo-art-06-podstawa.md", "PRIV-01, PRIV-03"],
  ["https://gdpr-info.eu/art-13-gdpr/", "rodo-art-13-obowiazek-informacyjny.md", "PRIV-05"],
  ["https://gdpr-info.eu/art-15-gdpr/", "rodo-art-15-dostep.md", "PRIV-01"],
  ["https://gdpr-info.eu/art-17-gdpr/", "rodo-art-17-usuniecie.md", "PRIV-04"],
  ["https://gdpr-info.eu/art-25-gdpr/", "rodo-art-25-privacy-by-design.md", "PRIV-03"],
  ["https://gdpr-info.eu/art-30-gdpr/", "rodo-art-30-rejestr-czynnosci.md", "PRIV-01"],
  ["https://gdpr-info.eu/art-32-gdpr/", "rodo-art-32-bezpieczenstwo.md", "PRIV-02, SEC-*"],
  ["https://www.arslege.pl/ustawa-o-prawach-konsumenta/k55/", "ustawa-o-prawach-konsumenta.md", "PRIV-06, PRIV-07"],
];

/** Typ 7 — agentowa, WIELU dostawców (P4). */
const ZRODLA_AGENTOWA = [
  ["https://docs.claude.com/llms.txt", "anthropic-llms.txt", "P4 — Anthropic"],
  ["https://platform.openai.com/docs/guides/agents", "openai-agents.md", "P4 — OpenAI"],
  ["https://ai.google.dev/gemini-api/docs/function-calling", "google-gemini-narzedzia.md", "P4 — Google"],
];

/** Typ 5 — specjalistyczna dla Usprawnień audytowych (K11′). */
const ZRODLA_NARZEDZIA = [
  ["https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/json/browser_protocol.json", "chrome-devtools-protocol.json", "USP-01, USP-03"],
  ["https://raw.githubusercontent.com/GoogleChrome/lighthouse/main/docs/scoring.md", "lighthouse-punktacja.md", "PERF-08"],
];

/** Cudzy KOD — nie dokumentacja. INT-01 żąda dowodu z kodu, nie z manuala. */
const CUDZY_KOD = [
  ["tutor", "INT-01…INT-11 — Tutor LMS 4.0.7"],
  ["woocommerce", "INT-01…INT-11 — WooCommerce 11"],
];

/* ══════════════════════════════════════════════════════════════════════════ */

const argumenty = process.argv.slice(2);
const ODSWIEZ = argumenty.includes("--odswiez");
const TYLKO = argumenty.find((a) => a.startsWith("--tylko="))?.split("=")[1] ?? null;

/** Minimalna długość SAMEJ TREŚCI (bez nagłówka). Patrz komentarz w zadanieHTTP. */
const PROG_TRESCI = 1500;

const spij = (ms) => new Promise((r) => setTimeout(r, ms));
const istnieje = (p) => access(p).then(() => true, () => false);

const bledy = [];
let pobrane = 0;
let pominiete = 0;

async function pobierz(url, { proby = 4 } = {}) {
  let ostatni;
  for (let i = 0; i < proby; i++) {
    try {
      const odp = await fetch(url, { headers: { "user-agent": AGENT }, redirect: "follow" });
      if (odp.status === 202 || odp.status === 429 || odp.status >= 500) {
        ostatni = new Error(`HTTP ${odp.status}`);
        await spij(1200 * (i + 1));
        continue;
      }
      if (!odp.ok) throw new Error(`HTTP ${odp.status}`);
      return await odp.text();
    } catch (e) {
      ostatni = e;
      await spij(800 * (i + 1));
    }
  }
  throw ostatni;
}

/** HTML → tekst. Nie udaje konwertera Markdowna: ma zachować TREŚĆ i nagłówki. */
function naTekst(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, n, t) => `\n\n${"#".repeat(+n)} ${t.replace(/<[^>]+>/g, "").trim()}\n\n`)
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<\/(p|div|tr|section|article)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function naglowek({ tytul, url, kotwica }) {
  return `<!-- ŹRÓDŁO: ${url} -->\n<!-- KOTWICA: ${kotwica} -->\n<!-- Pobrane przez audyt/tools/pobierz-dokumentacje-audyt.mjs -->\n\n# ${tytul}\n\n`;
}

async function zapisz(sciezka, tresc) {
  await mkdir(dirname(sciezka), { recursive: true });
  await writeFile(sciezka, tresc, "utf8");
}

/** Zwraca true, gdy plik już jest i ma treść — wtedy nie pobieramy. */
async function juzJest(sciezka) {
  if (ODSWIEZ) return false;
  if (!(await istnieje(sciezka))) return false;
  const t = await readFile(sciezka, "utf8").catch(() => "");
  return t.trim().length > 200;
}

async function grupa(nazwa, zadania) {
  if (TYLKO && TYLKO !== nazwa) return;
  process.stdout.write(`\n${nazwa}\n`);
  for (const z of zadania) {
    try {
      const wynik = await z();
      if (wynik === "pominięte") pominiete++;
      else pobrane++;
    } catch (e) {
      bledy.push(`${nazwa}: ${e.message}`);
      process.stdout.write(`  ✗ ${e.message}\n`);
    }
  }
}

function zadanieHTTP({ url, plik, kotwica, tytul, konwertuj }) {
  return async () => {
    const cel = join(CEL, plik);
    if (await juzJest(cel)) { process.stdout.write(`  · ${plik}\n`); return "pominięte"; }
    const surowe = await pobierz(url);
    // MIERZYMY TREŚĆ, NIE PLIK. Pierwsza wersja liczyła długość razem
    // z nagłówkiem — trzy dokumenty prawne przyszły PUSTE (EUR-Lex, HTTP 202),
    // a sam nagłówek waży ~200 B, więc przeszły bramkę i zameldowały sukces.
    // To ta sama klasa co „test przechodzi po pustce": sprawdzenie mierzyło
    // opakowanie zamiast zawartości.
    const ladunek = konwertuj ? naTekst(surowe) : surowe;
    if (ladunek.trim().length < PROG_TRESCI) {
      throw new Error(`${plik}: treść ma ${ladunek.trim().length} B (próg ${PROG_TRESCI}) — źródło oddało pustkę albo zmieniło kształt`);
    }
    const tresc = konwertuj ? naglowek({ tytul, url, kotwica }) + ladunek : ladunek;
    await zapisz(cel, tresc);
    process.stdout.write(`  ✓ ${plik} (${Math.round(tresc.length / 1024)} kB)\n`);
    return "pobrane";
  };
}

/* ── kopia cudzego kodu z kontenera (bez sieci) ── */

async function kopiujCudzyKod(wtyczka, kotwica) {
  const cel = join(CEL, "cudzy-kod", wtyczka);
  if (!ODSWIEZ && (await istnieje(join(cel, ".pobrane")))) {
    process.stdout.write(`  · ${wtyczka} (kopia jest)\n`);
    return "pominięte";
  }
  await mkdir(cel, { recursive: true });
  // tar w kontenerze → rozpakowanie u nas. Kopiujemy WYŁĄCZNIE PHP: audyt ma
  // grepować logikę, a nie zasoby (Woo to 70 MB, z czego PHP jest 25 MB).
  const { stdout: lista } = await wykonaj("podman", [
    "exec", KONTENER, "sh", "-c",
    `cd /var/www/html/wp-content/plugins && find ${wtyczka} -name '*.php' -not -path '*/node_modules/*' | wc -l`,
  ], { maxBuffer: 1 << 20 });
  const ile = Number(lista.trim().split("\n").pop());
  if (!Number.isFinite(ile) || ile < 100) throw new Error(`${wtyczka}: kontener oddał ${lista.trim()} plików PHP — spodziewano się setek`);
  await wykonaj("sh", ["-c",
    `podman exec ${KONTENER} sh -c "cd /var/www/html/wp-content/plugins && find ${wtyczka} -name '*.php' -not -path '*/node_modules/*' -print0 | tar -czf - --null -T -" | tar -xzf - -C ${JSON.stringify(join(CEL, "cudzy-kod"))}`,
  ], { maxBuffer: 1 << 28 });
  const { stdout: po } = await wykonaj("sh", ["-c", `find ${JSON.stringify(cel)} -name '*.php' | wc -l`]);
  const skopiowane = Number(po.trim());
  if (skopiowane !== ile) throw new Error(`${wtyczka}: w kontenerze ${ile} plików, u nas ${skopiowane} — kopia niepełna`);
  await writeFile(join(cel, ".pobrane"), `${wtyczka}\nplików PHP: ${ile}\nkotwica: ${kotwica}\n`, "utf8");
  process.stdout.write(`  ✓ ${wtyczka}: ${ile} plików PHP\n`);
  return "pobrane";
}

const KONTENER = process.env.AAI_WP_KONTENER ?? "aai_wp_wordpress";

/* ══════════════════════════════════════════════════════════════════════════ */

async function main() {
  process.stdout.write(`Sektor AUDYT — dokumentacja do ${CEL}\n`);
  if (CEL.startsWith(KORZEN)) {
    process.stdout.write("\nBŁĄD: katalog docelowy leży W DRZEWIE REPO.\n" +
      "Strażnicy skanują dysk, nie git — cudza dokumentacja w drzewie zapala\n" +
      "fałszywe alarmy (straznik-linkow na odsyłaczach MDN). Użyj ścieżki poza repo.\n");
    process.exit(1);
  }

  await grupa("owasp (typ 5 — specjalistyczna)", ZRODLA_OWASP.map(([n, k]) =>
    zadanieHTTP({ url: OWASP + n, plik: join("owasp", n), kotwica: k, konwertuj: false })));

  await grupa("mdn (typ 2 + 6)", ZRODLA_MDN.map(([sciezka, plik, k]) =>
    zadanieHTTP({ url: MDN + sciezka, plik: join("mdn", plik), kotwica: k, konwertuj: false })));

  await grupa("php (typ 6 — systemowa)", ZRODLA_PHP.map(([strona, plik, k]) =>
    zadanieHTTP({ url: `https://www.php.net/manual/en/${strona}`, plik: join("php", plik), kotwica: k, tytul: plik.replace(/\.md$/, ""), konwertuj: true })));

  await grupa("prawo (typ 1 — dziedzinowa)", ZRODLA_PRAWO.map(([url, plik, k]) =>
    zadanieHTTP({ url, plik: join("prawo", plik), kotwica: k, tytul: plik.replace(/\.md$/, ""), konwertuj: true })));

  await grupa("agentowa (typ 7 — P4, wielu dostawców)", ZRODLA_AGENTOWA.map(([url, plik, k]) =>
    zadanieHTTP({ url, plik: join("agentowa", plik), kotwica: k, tytul: plik.replace(/\.\w+$/, ""), konwertuj: plik.endsWith(".md") })));

  await grupa("narzedzia (typ 5 — USP)", ZRODLA_NARZEDZIA.map(([url, plik, k]) =>
    zadanieHTTP({ url, plik: join("narzedzia", plik), kotwica: k, konwertuj: false })));

  if (!TYLKO || TYLKO === "cudzy-kod") {
    process.stdout.write("\ncudzy-kod (typ 5 — INT, KOD nie dokumentacja)\n");
    for (const [w, k] of CUDZY_KOD) {
      try { (await kopiujCudzyKod(w, k)) === "pominięte" ? pominiete++ : pobrane++; }
      catch (e) { bledy.push(`cudzy-kod: ${e.message}`); process.stdout.write(`  ✗ ${e.message}\n`); }
    }
  }

  process.stdout.write(`\nPobrane: ${pobrane} · pominięte (już były): ${pominiete} · błędy: ${bledy.length}\n`);
  if (bledy.length) {
    process.stdout.write("\nŹRÓDŁA, KTÓRE ZAWIODŁY — katalog jest NIEKOMPLETNY:\n");
    for (const b of bledy) process.stdout.write(`  ${b}\n`);
    process.exit(1);
  }
  process.stdout.write("Komplet.\n");
}

if (process.argv[1] && process.argv[1].endsWith("pobierz-dokumentacje-audyt.mjs")) await main();
