/**
 * ŚRODOWISKO `:8892` — liczniki, zrzut, przywrócenie, kontrola KIER-00 (pakiet
 * E7.7, pozycja 7; krytyka budowy C3, sześć rozstrzygnięć właściciela 2026-09-03).
 *
 * PO CO. Pogłębiacz re-audytu mierzy na `:8892` LICZBY — zapytania na odsłonę,
 * wiersze w tabelach, liczniki przed/po — a Pogłębiacze PISZĄ do środowiska
 * (PRIV-R6 odczyt wiersza po żądaniu, SEC-R6 żądania bez nonce'a zapisują
 * logowanie, PIK-R6 przechodzi ścieżkę zakupu). Dwie role naraz zanieczyszczają
 * sobie liczby bez jednego objawu, a bez przywracania stanu MIĘDZY działami
 * migawka „przed == po" byłaby czerwona po każdym dziale. Stąd: jedna rola na
 * środowisku naraz (`status.mjs`, odmowa 6; reguła 30 strażnika), zrzut bazowy na
 * falę przywracany po każdym dziale, zrzut „po dziale" zachowany jako dowód
 * SKUT-R4/R5.
 *
 * PIĘĆ FAKTÓW ZMIERZONYCH PRZED KODEM I PRZY PIERWSZEJ SAMOKONTROLI (2026-09-03), od których zależy kształt:
 *   1. `information_schema.table_rows` KŁAMIE (InnoDB szacuje): `wp_postmeta` 1866
 *      wobec `COUNT(*)` 1786, `wp_options` 447 wobec 453. Liczniki idą przez
 *      `COUNT(*)` na KAŻDEJ tabeli — jednym zapytaniem `UNION ALL`, milisekundy.
 *   2. `mariadb-dump` bazy (bez `--databases`) NIE niesie `USE` ani `CREATE
 *      DATABASE`, więc ten sam plik wchodzi do DOWOLNEGO schematu — przywrócenie
 *      idzie najpierw do schematu TYMCZASOWEGO, gdzie liczniki są sprawdzane.
 *   3. `RENAME TABLE a.t TO b.t, …` w jednym zdaniu jest atomowe, zachowuje
 *      `AUTO_INCREMENT` (267 na `wp_aai_monitor_logowania`) i przenosi KLUCZE OBCE
 *      razem z tabelą (9 kluczy Tutora; sprawdzone: po przeniesieniu wstawienie
 *      sieroty dalej pada). Dlatego podmiana to RENAME, nigdy „DROP, potem import".
 *   4. Media (`wp-content/uploads`, 1348 plików, 34 MB) leżą POZA bazą i są
 *      LICZONE, nie kopiowane (rozstrzygnięcie 5): żadna rola nie ma prawa pisać
 *      mediów (W2), więc rozjazd licznika = STOP.
 *   5. `AUTO_INCREMENT` tabeli `wp_options` rośnie od SAMYCH ODCZYTÓW — WordPress
 *      zapisuje transienty przy każdym żądaniu, a `wp plugin list` przy każdym
 *      uruchomieniu (`_site_transient_update_plugins`). Zmierzone: pięć odczytów
 *      HTTP → `2720 → 2722`, liczba wierszy bez zmian, sześć sekund ciszy → nic.
 *      Pierwsza wersja samokontroli padła właśnie na tym („ktoś pisze do
 *      środowiska" przy własnym pomiarze). Ten JEDEN licznik jest wyłączony
 *      z porównań i ze skrótu (`ULOTNE_AUTO_INCREMENT`), ale zapisywany
 *      i widoczny; LICZBA WIERSZY `wp_options` jest porównywana jak każda inna.
 *
 * Zrzuty `.sql` żyją POZA repo (`~/.cache/aai-kopie/audyt/`, rozstrzygnięcie 4);
 * w repo zostają liczniki (`audyt/migawki/srodowisko-<nazwa>.json`, kilka kB).
 *
 * Użycie:
 *   node audyt/tools/srodowisko.mjs --liczniki                 # JSON: COUNT(*) + AUTO_INCREMENT każdej tabeli, media, wtyczki
 *   node audyt/tools/srodowisko.mjs --zrzut=f1-baza            # przed pierwszym Pogłębiaczem fali 1
 *   node audyt/tools/srodowisko.mjs --zrzut=f1-SEC-po          # po dziale (dowód SKUT-R4/R5)
 *   node audyt/tools/srodowisko.mjs --przywroc=f1-baza         # schemat tymczasowy → asercja liczników → RENAME; rozjazd = kod 1
 *   node audyt/tools/srodowisko.mjs --sprawdz --fala=1         # KIER-00: co musi stać, zanim wejdzie pierwsza rola na środowisku
 *   node audyt/tools/srodowisko.mjs --stoi                     # kod 0, gdy kontener bazy stoi (dla bramek warunkowych)
 *   node audyt/tools/srodowisko.mjs --test                     # samokontrola na schemacie tymczasowym; bez kontenera: „pominięte"
 *
 * `--katalog-zrzutow=<dir>` przestawia katalog zrzutów — używa go WYŁĄCZNIE
 * samokontrola, na katalogu tymczasowym.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { KORZEN, SEKTOR, czytajJSON, zapiszJSON } from "./wspolne.mjs";

/** Nazwy kontenerów z `STACK_NAZWA`, jak w `package.json` i `compose.yml`. */
export const STACK = process.env.STACK_NAZWA ?? "aai_wp";
export const KONTENERY = {
  db: `${STACK}_db`,
  wordpress: `${STACK}_wordpress`,
  mailpit: `${STACK}_mailpit`,
  cli: `${STACK}_cli`,
  db1: "db1_kursy",
};
export const BAZA = "wordpress";
export const PORT = process.env.WP_PORT ?? "8892";
export const ADRES = `http://127.0.0.1:${PORT}/szkolenia/`;
/** Prototyp — `--sprawdz` tylko MELDUJE, czy stoi (PROTO-R6 o niego pyta); nie stawia go. */
export const ADRES_PROTO = "http://127.0.0.1:3001/szkolenia";
export const WTYCZKI_WYMAGANE = ["aai-monitor", "aai-platnosci", "aai-sklep", "tutor", "woocommerce"];
export const KATALOG_ZRZUTOW = join(homedir(), ".cache", "aai-kopie", "audyt");
export const KATALOG_MIGAWEK = join(SEKTOR, "migawki");
export const NAZWA_ZRZUTU = /^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/;
const NAZWA_SCHEMATU = /^[A-Za-z0-9_]{1,64}$/;
/**
 * Tabele, których `AUTO_INCREMENT` zmienia się od samych odczytów (fakt 5 w nagłówku).
 * Lista jest ZMIERZONA, nie założona; dopisanie tabeli wymaga pomiaru jak tamten.
 */
export const ULOTNE_AUTO_INCREMENT = new Set(["wp_options"]);
/** Procesy, które piszą na `:8892` poza sektorem — bramki projektu z `main`. */
const CUDZE_PROCESY = /smoke-wp|przelot-calosc|postaw\.sh/;

export const zrzutBazowy = (fala) => `f${fala}-baza`;
export const zrzutPoDziale = (fala, kod) => `f${fala}-${kod}-po`;

/* ── podman / SQL ───────────────────────────────────────────────────────── */

const bezSzumu = (t) => String(t).split("\n").filter((l) => l && !/graph driver/.test(l)).join(" ").trim();

function podman(args, { input, encoding = "utf8" } = {}) {
  const r = spawnSync("podman", args, { encoding, input, maxBuffer: 1 << 28 });
  return { kod: r.status, out: r.stdout ?? (encoding === "buffer" ? Buffer.alloc(0) : ""), err: String(r.stderr ?? "") };
}

/** Czy kontener działa — `podman inspect`, nie parsowanie tabeli `podman ps`. */
export function kontenerStoi(nazwa) {
  const r = podman(["inspect", "-f", "{{.State.Running}}", nazwa]);
  return r.kod === 0 && r.out.trim() === "true";
}

/** Warunek bramek warunkowych: kontener bazy stoi. */
export const stoi = () => kontenerStoi(KONTENERY.db);

/**
 * Zapytanie jako root W KONTENERZE (hasło z jego środowiska, nigdy z naszego
 * `.env` na wiersz komend). Wynik: wiersze TSV bez nagłówka, `--raw` bez ucieczek.
 */
export function sql(zapytanie, schemat = null) {
  if (schemat !== null && !NAZWA_SCHEMATU.test(schemat)) throw new Error(`niedozwolona nazwa schematu "${schemat}"`);
  const komenda = `exec mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" -N -B --raw${schemat ? ` ${schemat}` : ""}`;
  const r = podman(["exec", "-i", KONTENERY.db, "sh", "-c", komenda], { input: zapytanie });
  if (r.kod !== 0) throw new Error(`SQL w ${KONTENERY.db} padło (kod ${r.kod}): ${bezSzumu(r.err)}`);
  return r.out.split("\n").filter(Boolean).map((l) => l.split("\t"));
}

/* ── czyste funkcje: skrót i porównanie liczników ───────────────────────── */

/** `AUTO_INCREMENT` brany do porównań i skrótu — dla tabel ulotnych zawsze null. */
const aiPorownywalne = (t, x) => (ULOTNE_AUTO_INCREMENT.has(t) ? null : (x?.auto_increment ?? null));

/** Skrót z POSORTOWANEJ listy `tabela:wierszy:auto_increment` — kolejność kluczy w JSON nie ma znaczenia. */
export function skrotTabel(tabele) {
  const h = createHash("sha256");
  for (const t of Object.keys(tabele).sort()) h.update(`${t}:${tabele[t].wierszy}:${aiPorownywalne(t, tabele[t]) ?? ""}\n`);
  return h.digest("hex");
}

/** Lista rozjazdów liczników tabel (pusta = równe). Pyta o każdą tabelę z OBU stron. */
export function porownajTabele(a, b) {
  const rozjazdy = [];
  for (const t of new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]).values()) {
    const x = a?.[t];
    const y = b?.[t];
    if (!x || !y) { rozjazdy.push(`${t}: tabela ${x ? "zniknęła" : "doszła"}`); continue; }
    if (x.wierszy !== y.wierszy) rozjazdy.push(`${t}: wierszy ${x.wierszy} → ${y.wierszy}`);
    if (aiPorownywalne(t, x) !== aiPorownywalne(t, y)) rozjazdy.push(`${t}: AUTO_INCREMENT ${x.auto_increment ?? "—"} → ${y.auto_increment ?? "—"}`);
  }
  return rozjazdy.sort();
}

/** Rozjazdy pełnych liczników: tabele + media (media tylko, gdy obie strony je mają). */
export function porownajLiczniki(a, b) {
  const rozjazdy = porownajTabele(a?.tabele, b?.tabele);
  if (a?.media && b?.media) {
    if (a.media.plikow !== b.media.plikow) rozjazdy.push(`media: plików ${a.media.plikow} → ${b.media.plikow}`);
    if (a.media.bajtow !== b.media.bajtow) rozjazdy.push(`media: bajtów ${a.media.bajtow} → ${b.media.bajtow}`);
    if (a.media.skrot !== b.media.skrot) rozjazdy.push("media: inna lista plików (skrót ścieżka:rozmiar)");
  }
  return rozjazdy;
}

/* ── pomiar ─────────────────────────────────────────────────────────────── */

/**
 * `COUNT(*)` + `AUTO_INCREMENT` każdej tabeli BAZOWEJ schematu, jednym zapytaniem.
 * `information_schema.table_rows` nie wchodzi tu nigdzie — patrz fakt 1 w nagłówku.
 */
export function licznikiTabel(schemat = BAZA) {
  const lista = sql(
    `SELECT table_name, IFNULL(auto_increment, '') FROM information_schema.tables ` +
    `WHERE table_schema='${schemat}' AND table_type='BASE TABLE' ORDER BY table_name`,
  );
  if (!lista.length) throw new Error(`schemat ${schemat} nie ma tabel — pusty schemat nie jest stanem środowiska`);
  const ai = new Map(lista.map(([t, a]) => [t, a === "" ? null : Number(a)]));
  const union = lista.map(([t]) => `SELECT '${t}', COUNT(*) FROM \`${schemat}\`.\`${t}\``).join(" UNION ALL ");
  const wiersze = sql(union);
  const tabele = {};
  for (const [t, c] of wiersze) tabele[t] = { wierszy: Number(c), auto_increment: ai.get(t) ?? null };
  if (Object.keys(tabele).length !== lista.length) {
    throw new Error(`liczniki: ${lista.length} tabel w schemacie, ${Object.keys(tabele).length} policzonych — pomiar przeszedł po części`);
  }
  return tabele;
}

/** Liczba, bajty i skrót posortowanej listy `ścieżka:rozmiar` plików `uploads/` — kopii nie robimy (rozstrzygnięcie 5). */
export function licznikiMediow() {
  const r = podman(["exec", KONTENERY.wordpress, "sh", "-c", "cd /var/www/html/wp-content/uploads && find . -type f -printf '%s %P\\n'"]);
  if (r.kod !== 0) throw new Error(`liczenie mediów w ${KONTENERY.wordpress} padło (kod ${r.kod}): ${bezSzumu(r.err)}`);
  const pliki = r.out.split("\n").filter(Boolean).map((l) => {
    const i = l.indexOf(" ");
    return { rozmiar: Number(l.slice(0, i)), sciezka: l.slice(i + 1) };
  }).sort((a, b) => (a.sciezka < b.sciezka ? -1 : a.sciezka > b.sciezka ? 1 : 0));
  const h = createHash("sha256");
  for (const { sciezka, rozmiar } of pliki) h.update(`${sciezka}:${rozmiar}\n`);
  return { plikow: pliki.length, bajtow: pliki.reduce((s, p) => s + p.rozmiar, 0), skrot: h.digest("hex") };
}

/**
 * Wtyczki i wersje z `wp plugin list --format=json` — nie z nazw katalogów. Raz na
 * proces, a WP-CLI bez ładowania wtyczek i motywu (`--skip-plugins --skip-themes`):
 * lista i statusy pochodzą z dysku i z opcji `active_plugins`, więc wynik jest ten
 * sam (porównany co do bajtu), a rozruch spada z ~1,5 s do ~0,7 s — strażnik
 * uruchamia `--test` przy każdej mutacji audytu.
 */
let WTYCZKI_PROCESU = null;
export function wtyczki() {
  if (WTYCZKI_PROCESU) return WTYCZKI_PROCESU;
  const wp = (...a) => podman(["exec", KONTENERY.cli, "wp", "--path=/var/www/html", "--skip-plugins", "--skip-themes", ...a]);
  const lista = wp("plugin", "list", "--format=json", "--fields=name,status,version");
  if (lista.kod !== 0) throw new Error(`wp plugin list padło (kod ${lista.kod}): ${bezSzumu(lista.err)}`);
  const wpisy = JSON.parse(lista.out);
  const wersja = (n) => wpisy.find((p) => p.name === n)?.version ?? null;
  const rdzen = wp("core", "version");
  WTYCZKI_PROCESU = {
    aktywne: wpisy.filter((p) => p.status === "active").map((p) => p.name).sort(),
    wersje: { wordpress: rdzen.kod === 0 ? rdzen.out.trim() : null, tutor: wersja("tutor"), woocommerce: wersja("woocommerce") },
  };
  return WTYCZKI_PROCESU;
}

/**
 * Pełne liczniki środowiska. `pelne: false` = same tabele (schemat tymczasowy
 * w samokontroli nie ma swoich mediów ani wtyczek).
 */
export function liczniki(schemat = BAZA, { pelne = true } = {}) {
  const tabele = licznikiTabel(schemat);
  const nasze = Object.fromEntries(Object.entries(tabele).filter(([t]) => /^wp_aai_/.test(t)));
  const wynik = { kiedy: new Date().toISOString(), baza: schemat, tabel: Object.keys(tabele).length, skrot_tabel: skrotTabel(tabele), nasze, tabele };
  if (pelne) {
    const w = wtyczki();
    Object.assign(wynik, { media: licznikiMediow(), wtyczki_aktywne: w.aktywne, wersje: w.wersje });
  }
  return wynik;
}

/**
 * POLE `srodowisko` MIGAWKI WARTOŚCI (W6): skrót + liczniki naszych 9 tabel
 * i mediów — rozjazd ma być CZYTELNY, nie tylko wykryty. Bez `tabele` (80 wpisów),
 * bez `kiedy` (czas nie jest wartością do porównania).
 */
export function migawkaSrodowiska() {
  const l = liczniki();
  return { skrot_tabel: l.skrot_tabel, tabel: l.tabel, nasze: l.nasze, media: l.media, wtyczki_aktywne: l.wtyczki_aktywne, wersje: l.wersje };
}

/* ── zrzut i przywrócenie ───────────────────────────────────────────────── */

function sciezkiZrzutu(nazwa, katalog) {
  if (!NAZWA_ZRZUTU.test(nazwa)) throw new Error(`niedozwolona nazwa zrzutu "${nazwa}" (litery, cyfry, . _ -)`);
  return { sql: join(katalog, `${nazwa}.sql`), json: join(katalog, `${nazwa}.json`) };
}

/**
 * Zrzut schematu + liczniki OBOK. Liczniki mierzone PRZED i PO zrzucie muszą być
 * równe — inaczej ktoś pisze do środowiska w trakcie i zrzut nie jest stanem.
 * Zrzut bazy `wordpress` zostawia kopię liczników w repo (`audyt/migawki/`).
 */
export function zrzut(nazwa, { katalog = KATALOG_ZRZUTOW, schemat = BAZA, migawki = KATALOG_MIGAWEK } = {}) {
  const pliki = sciezkiZrzutu(nazwa, katalog);
  const pelne = schemat === BAZA;
  const przed = liczniki(schemat, { pelne });
  const r = podman(
    ["exec", KONTENERY.db, "sh", "-c", `exec mariadb-dump -uroot -p"$MARIADB_ROOT_PASSWORD" --single-transaction --routines --triggers ${schemat}`],
    { encoding: "buffer" },
  );
  if (r.kod !== 0) throw new Error(`mariadb-dump padło (kod ${r.kod}): ${bezSzumu(r.err)}`);
  if (/^(USE |CREATE DATABASE)/m.test(r.out.toString("latin1"))) {
    throw new Error("zrzut niesie USE/CREATE DATABASE — nie dałoby się go przywrócić do schematu tymczasowego");
  }
  const po = liczniki(schemat, { pelne });
  const wTrakcie = porownajLiczniki(przed, po);
  if (wTrakcie.length) throw new Error(`liczniki zmieniły się W TRAKCIE zrzutu — ktoś pisze do środowiska:\n  ${wTrakcie.join("\n  ")}`);
  mkdirSync(katalog, { recursive: true });
  writeFileSync(pliki.sql, r.out);
  zapiszJSON(pliki.json, po);
  if (pelne && migawki) zapiszJSON(join(migawki, `srodowisko-${nazwa}.json`), po);
  return { ...pliki, bajtow: r.out.length, liczniki: po };
}

function importuj(schemat, tresc) {
  if (!NAZWA_SCHEMATU.test(schemat)) throw new Error(`niedozwolona nazwa schematu "${schemat}"`);
  const r = podman(["exec", "-i", KONTENERY.db, "sh", "-c", `exec mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" ${schemat}`], { input: tresc });
  if (r.kod !== 0) throw new Error(`import do ${schemat} padł (kod ${r.kod}): ${bezSzumu(r.err)}`);
}

const nazwyTabel = (schemat) => sql(`SELECT table_name FROM information_schema.tables WHERE table_schema='${schemat}' AND table_type='BASE TABLE' ORDER BY table_name`).map(([t]) => t);
const schematIstnieje = (schemat) => sql(`SELECT 1 FROM information_schema.schemata WHERE schema_name='${schemat}'`).length > 0;

/**
 * PRZYWRÓCENIE — najgroźniejsza operacja sektora, dlatego w tej kolejności i żadnej innej:
 *   1. odmowa, gdy zrzutu albo jego liczników nie ma;
 *   2. import do schematu TYMCZASOWEGO `proba_przywroc_<pid>`;
 *   3. ASERCJA: liczniki tabel w schemacie tymczasowym == liczniki zapisane przy
 *      zrzucie — rozjazd = wyjątek, baza docelowa NIETKNIĘTA;
 *   4. podmiana JEDNYM `RENAME TABLE` (atomowe; stare tabele celu odjeżdżają do
 *      `…_stare`, nowe wjeżdżają z tymczasowego) — nigdy „DROP, potem import";
 *   5. oba schematy pomocnicze kasowane w `finally`, także po padnięciu.
 * Zwraca rozjazdy PEŁNYCH liczników po podmianie (media włącznie): media rozjechane
 * to STOP (kod 1 w CLI), bo przywrócenie bazy nie odtwarza plików.
 */
export function przywroc(nazwa, { katalog = KATALOG_ZRZUTOW, cel = BAZA } = {}) {
  const pliki = sciezkiZrzutu(nazwa, katalog);
  if (!existsSync(pliki.sql) || !existsSync(pliki.json)) {
    throw new Error(`odmowa: brak zrzutu "${nazwa}" w ${katalog} (potrzebne ${nazwa}.sql i ${nazwa}.json) — zrób go: node audyt/tools/srodowisko.mjs --zrzut=${nazwa}`);
  }
  if (!NAZWA_SCHEMATU.test(cel)) throw new Error(`niedozwolona nazwa schematu "${cel}"`);
  const zapisane = czytajJSON(pliki.json);
  if (!zapisane?.tabele) throw new Error(`odmowa: ${pliki.json} nie niesie liczników tabel — bez nich nie ma wobec czego sprawdzić przywrócenia`);
  const tmp = `proba_przywroc_${process.pid}`;
  const stare = `${tmp}_stare`;
  if (schematIstnieje(tmp) || schematIstnieje(stare)) throw new Error(`schemat ${tmp} już istnieje — inne przywracanie w toku?`);
  try {
    sql(`CREATE DATABASE \`${tmp}\``);
    importuj(tmp, readFileSync(pliki.sql));
    const wTmp = licznikiTabel(tmp);
    const roznice = porownajTabele(zapisane.tabele, wTmp);
    if (roznice.length) {
      throw new Error(
        `zrzut "${nazwa}" po imporcie do schematu tymczasowego NIE zgadza się z licznikami zapisanymi przy zrzucie — ` +
        `baza ${cel} NIETKNIĘTA:\n  ${roznice.join("\n  ")}`,
      );
    }
    sql(`CREATE DATABASE \`${stare}\``);
    const pary = [
      ...nazwyTabel(cel).map((t) => `\`${cel}\`.\`${t}\` TO \`${stare}\`.\`${t}\``),
      ...nazwyTabel(tmp).map((t) => `\`${tmp}\`.\`${t}\` TO \`${cel}\`.\`${t}\``),
    ];
    sql(`RENAME TABLE ${pary.join(", ")}`);
    const po = liczniki(cel, { pelne: cel === BAZA && Boolean(zapisane.media) });
    return { rozjazd: porownajLiczniki(zapisane, po), liczniki: po, tabel: nazwyTabel(cel).length };
  } finally {
    sql(`DROP DATABASE IF EXISTS \`${tmp}\`; DROP DATABASE IF EXISTS \`${stare}\``);
  }
}

/* ── KIER-00: co musi stać, zanim wejdzie pierwsza rola na środowisku ──── */

async function odpowiada(adres) {
  try {
    const r = await fetch(adres, { signal: AbortSignal.timeout(5000), redirect: "manual" });
    return r.status;
  } catch {
    return null;
  }
}

/** Gałąź fali 2 z nazwy gałęzi sektora — ta sama reguła, co w `fala.mjs`. */
function galazFali2() {
  const r = spawnSync("git", ["branch", "--show-current"], { cwd: KORZEN, encoding: "utf8" });
  const sektor = (r.stdout ?? "").trim().split("/sektor-")[0];
  return sektor ? `${sektor}/fala-2` : null;
}

export async function sprawdz({ fala = 1, katalog = KATALOG_ZRZUTOW } = {}) {
  const wyniki = [];
  const p = (nazwa, ok, szczegol = "") => wyniki.push({ nazwa, ok, szczegol });
  const meldunki = [];

  for (const [rola, nazwa] of Object.entries(KONTENERY)) p(`kontener ${nazwa} (${rola}) stoi`, kontenerStoi(nazwa));

  const kod = await odpowiada(ADRES);
  p(`${ADRES} odpowiada 200`, kod === 200, kod === null ? "brak odpowiedzi" : `kod ${kod}`);

  let aktywne = [];
  try {
    aktywne = wtyczki().aktywne;
    const brak = WTYCZKI_WYMAGANE.filter((w) => !aktywne.includes(w));
    p(`wtyczki aktywne: ${WTYCZKI_WYMAGANE.join(", ")}`, !brak.length, brak.length ? `nieaktywne: ${brak.join(", ")}` : "");
  } catch (e) {
    p("wtyczki aktywne (wp plugin list)", false, e.message);
  }

  // ZRZUT BAZOWY FALI — bez niego kierownik nie ma do czego wracać po pierwszym dziale.
  const pliki = sciezkiZrzutu(zrzutBazowy(fala), katalog);
  const zrzutJest = existsSync(pliki.sql) && existsSync(pliki.json);
  p(`zrzut bazowy ${zrzutBazowy(fala)} istnieje (${katalog})`, zrzutJest, zrzutJest ? "" : `zrób go PRZED pierwszym Pogłębiaczem: node audyt/tools/srodowisko.mjs --zrzut=${zrzutBazowy(fala)}`);
  if (zrzutJest) {
    try {
      const rozjazd = porownajLiczniki(czytajJSON(pliki.json), liczniki());
      p(`liczniki żywej bazy = zrzut bazowy ${zrzutBazowy(fala)}`, !rozjazd.length, rozjazd.slice(0, 8).join("; ") + (rozjazd.length > 8 ? ` … i ${rozjazd.length - 8} dalszych` : ""));
    } catch (e) {
      p("liczniki żywej bazy", false, e.message);
    }
  }

  if (fala === 2) {
    const galaz = galazFali2();
    const wt = spawnSync("git", ["worktree", "list", "--porcelain"], { cwd: KORZEN, encoding: "utf8" });
    const stoiWorktree = Boolean(galaz) && new RegExp(`^branch refs/heads/${galaz.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}$`, "m").test(wt.stdout ?? "");
    p(`worktree fali 2 (${galaz ?? "?"}) stoi`, stoiWorktree, stoiWorktree ? "" : "node audyt/tools/fala.mjs --postaw=2");
  }

  // KTOŚ INNY NA ŚRODOWISKU — bramki projektu z `main` też piszą na `:8892`.
  const ps = spawnSync("pgrep", ["-af", CUDZE_PROCESY.source], { encoding: "utf8" });
  const cudze = (ps.stdout ?? "").split("\n").filter((l) => l && !/pgrep/.test(l));
  p("nikt inny nie pracuje na środowisku (smoke-wp, przelot-calosc, postaw.sh)", !cudze.length, cudze.slice(0, 3).join(" | "));

  // Meldunki — nigdy nie decydują o kodzie wyjścia.
  const proto = await odpowiada(ADRES_PROTO);
  meldunki.push(`prototyp ${ADRES_PROTO}: ${proto === null ? "nie stoi" : `stoi (kod ${proto})`} — potrzebny tylko PROTO-R6`);

  return { ok: wyniki.every((w) => w.ok), wyniki, meldunki };
}

/* ── samokontrola: `--test` na schemacie tymczasowym ───────────────────── */

const SCHEMAT_PROBNY = `proba_srodowisko_${process.pid}`;
const NAZWA_PROBNA = "proba";

const sprawdz_ = sprawdz; // nazwa `sprawdz` jest w samokontroli zajęta przez asercję
async function samokontrola({ padnij = false } = {}) {
  if (!stoi()) {
    process.stdout.write(`srodowisko.mjs --test: pominięte — kontener ${KONTENERY.db} nie stoi (samokontrola wymaga bazy)\n`);
    return true;
  }
  let zle = 0;
  const sprawdz = (nazwa, warunek, szczegol = "") => {
    if (!warunek) zle++;
    process.stdout.write(`  ${warunek ? "✓" : "✗"} ${nazwa}${!warunek && szczegol ? `\n      ${szczegol}` : ""}\n`);
  };
  const pada = (fn, wzorzec) => {
    try { fn(); return false; } catch (e) { return wzorzec.test(e.message); }
  };

  /* czyste funkcje */
  const A = { t1: { wierszy: 3, auto_increment: 4 }, t2: { wierszy: 0, auto_increment: null } };
  const B = { t2: { wierszy: 0, auto_increment: null }, t1: { wierszy: 3, auto_increment: 4 } };
  sprawdz("CZYSTE    skrót tabel niezależny od kolejności kluczy", skrotTabel(A) === skrotTabel(B));
  sprawdz("CZYSTE    skrót zmienia się przy zmianie JEDNEJ liczby", skrotTabel(A) !== skrotTabel({ ...A, t1: { wierszy: 3, auto_increment: 5 } }));
  sprawdz("CZYSTE    porównanie: równe → pusta lista", porownajTabele(A, B).length === 0);
  sprawdz("CZYSTE    porównanie widzi wiersze, AUTO_INCREMENT i tabelę po jednej stronie",
    porownajTabele(A, { t1: { wierszy: 2, auto_increment: 9 }, t3: { wierszy: 1, auto_increment: null } }).length === 4);
  sprawdz("CZYSTE    porównanie mediów: inna liczba plików i bajtów = dwa rozjazdy",
    porownajLiczniki({ tabele: A, media: { plikow: 1, bajtow: 1, skrot: "a" } }, { tabele: A, media: { plikow: 2, bajtow: 3, skrot: "a" } }).length === 2);
  const O1 = { wp_options: { wierszy: 453, auto_increment: 2720 } };
  sprawdz("CZYSTE    AUTO_INCREMENT wp_options (ulotny, fakt 5) NIE jest rozjazdem, a jego skrót jest stały",
    porownajTabele(O1, { wp_options: { wierszy: 453, auto_increment: 2722 } }).length === 0 && skrotTabel(O1) === skrotTabel({ wp_options: { wierszy: 453, auto_increment: 2722 } }));
  sprawdz("CZYSTE    liczba WIERSZY wp_options jest porównywana jak każda inna",
    porownajTabele(O1, { wp_options: { wierszy: 455, auto_increment: 2720 } }).length === 1);
  sprawdz("CZYSTE    media tylko po jednej stronie NIE są porównywane (schemat tymczasowy)",
    porownajLiczniki({ tabele: A, media: { plikow: 1, bajtow: 1, skrot: "a" } }, { tabele: A }).length === 0);

  /* COUNT(*) kontra information_schema — NIEZALEŻNYM zapytaniem, spisanym tutaj */
  {
    const zywe = licznikiTabel(BAZA);
    const kontrolne = ["wp_postmeta", "wp_options", "wp_posts", "wp_usermeta", ...Object.keys(zywe).filter((t) => /^wp_aai_/.test(t))].filter((t) => zywe[t]);
    const niezalezne = new Map(sql(kontrolne.map((t) => `SELECT '${t}', COUNT(*) FROM \`${BAZA}\`.\`${t}\``).join(" UNION ALL ")).map(([t, c]) => [t, Number(c)]));
    const rozne = kontrolne.filter((t) => niezalezne.get(t) !== zywe[t].wierszy);
    sprawdz(`LICZNIKI  COUNT(*) z liczników = COUNT(*) niezależne na ${kontrolne.length} tabelach (table_rows kłamie)`, kontrolne.length >= 10 && !rozne.length,
      rozne.map((t) => `${t}: liczniki ${zywe[t].wierszy}, niezależnie ${niezalezne.get(t)}`).join("; "));
  }

  const katalogTmp = mkdtempSync(join(tmpdir(), "srodowisko-"));
  try {
    if (schematIstnieje(SCHEMAT_PROBNY)) throw new Error(`schemat ${SCHEMAT_PROBNY} już istnieje`);
    sql(`CREATE DATABASE \`${SCHEMAT_PROBNY}\``);
    sql(
      "CREATE TABLE r (id INT AUTO_INCREMENT PRIMARY KEY, v VARCHAR(8)) ENGINE=InnoDB; " +
      "CREATE TABLE d (id INT AUTO_INCREMENT PRIMARY KEY, r_id INT NOT NULL, CONSTRAINT fk_proba FOREIGN KEY (r_id) REFERENCES r(id)) ENGINE=InnoDB; " +
      "INSERT INTO r (v) VALUES ('a'),('b'),('c'); DELETE FROM r WHERE id=3; INSERT INTO d (r_id) VALUES (1),(2);",
      SCHEMAT_PROBNY,
    );
    // Test negatywny sprzątania: padamy ZA schematem, przed jakimkolwiek sprzątaniem — `finally` ma go zabrać.
    if (padnij) throw new Error("padnięcie na życzenie (--padnij) — sprawdzam, czy schemat próbny znika");

    const z = zrzut(NAZWA_PROBNA, { katalog: katalogTmp, schemat: SCHEMAT_PROBNY, migawki: null });
    sprawdz("ZRZUT     plik .sql i .json obok, liczniki r=2 (AUTO_INCREMENT 4), d=2", existsSync(z.sql) && existsSync(z.json)
      && z.liczniki.tabele.r.wierszy === 2 && z.liczniki.tabele.r.auto_increment === 4 && z.liczniki.tabele.d.wierszy === 2, JSON.stringify(z.liczniki.tabele));

    sql("INSERT INTO r (v) VALUES ('x'),('y'),('z'); DROP TABLE d;", SCHEMAT_PROBNY);
    const poZmianie = licznikiTabel(SCHEMAT_PROBNY);
    sprawdz("ZMIANA    liczniki widzą 3 nowe wiersze i zniknięcie tabeli", porownajTabele(z.liczniki.tabele, poZmianie).length === 3, porownajTabele(z.liczniki.tabele, poZmianie).join("; "));

    /* ASERCJA LICZNIKÓW: zrzut z podrobionym .json ma być ODRZUCONY, a cel NIETKNIĘTY */
    const podrobione = czytajJSON(z.json);
    podrobione.tabele.r.wierszy += 1;
    zapiszJSON(join(katalogTmp, "podrobiony.json"), podrobione);
    writeFileSync(join(katalogTmp, "podrobiony.sql"), readFileSync(z.sql));
    sprawdz("ASERCJA   przywrócenie z licznikami niezgodnymi ze zrzutem → odmowa, cel NIETKNIĘTY",
      pada(() => przywroc("podrobiony", { katalog: katalogTmp, cel: SCHEMAT_PROBNY }), /NIE zgadza się z licznikami zapisanymi przy zrzucie/)
      && porownajTabele(poZmianie, licznikiTabel(SCHEMAT_PROBNY)).length === 0 && !schematIstnieje(`proba_przywroc_${process.pid}`));
    sprawdz("ASERCJA   przywrócenie z nieistniejącego zrzutu → odmowa z komendą --zrzut=", pada(() => przywroc("nie-ma-takiego", { katalog: katalogTmp, cel: SCHEMAT_PROBNY }), /odmowa: brak zrzutu .* --zrzut=nie-ma-takiego/));

    /* PRZYWRÓCENIE: liczniki wracają, AUTO_INCREMENT też, klucz obcy dalej pilnuje */
    const w = przywroc(NAZWA_PROBNA, { katalog: katalogTmp, cel: SCHEMAT_PROBNY });
    const poPrzywroceniu = licznikiTabel(SCHEMAT_PROBNY);
    sprawdz("PRZYWRÓĆ  liczniki równe zapisanym przy zrzucie (r=2, AUTO_INCREMENT 4, d wróciło)", w.rozjazd.length === 0 && porownajTabele(z.liczniki.tabele, poPrzywroceniu).length === 0 && w.tabel === 2, w.rozjazd.join("; "));
    sprawdz("PRZYWRÓĆ  klucz obcy przeniesiony RENAME'em dalej odrzuca sierotę", pada(() => sql("INSERT INTO d (r_id) VALUES (99)", SCHEMAT_PROBNY), /foreign key|FOREIGN KEY|padło/i));
    sprawdz("PRZYWRÓĆ  schematy pomocnicze skasowane", !schematIstnieje(`proba_przywroc_${process.pid}`) && !schematIstnieje(`proba_przywroc_${process.pid}_stare`));

    /* PRZEBIEG CLI — dowód, że narzędzie jest PODPIĘTE do tych funkcji */
    const uruchom = (...a) => {
      const r = spawnSync("node", ["audyt/tools/srodowisko.mjs", ...a], { cwd: KORZEN, encoding: "utf8" });
      return { kod: r.status, wyjscie: (r.stdout ?? "") + (r.stderr ?? "") };
    };
    const pusty = mkdtempSync(join(tmpdir(), "srodowisko-zrzuty-"));
    try {
      const bez = uruchom("--sprawdz", "--fala=1", `--katalog-zrzutow=${pusty}`);
      sprawdz("CLI       --sprawdz bez zrzutu bazowego fali → kod 1 z ✗ przy zrzucie bazowym i komendą --zrzut=f1-baza",
        bez.kod === 1 && /✗ zrzut bazowy f1-baza/.test(bez.wyjscie) && /--zrzut=f1-baza/.test(bez.wyjscie), `kod ${bez.kod}: ${bez.wyjscie.trim().slice(0, 300)}`);
      const zlaNazwa = uruchom("--zrzut=zle/nazwa", `--katalog-zrzutow=${pusty}`);
      sprawdz("CLI       --zrzut=zle/nazwa → kod 1, nic nie zapisane", zlaNazwa.kod === 1 && /niedozwolona nazwa zrzutu/.test(zlaNazwa.wyjscie), `kod ${zlaNazwa.kod}`);
      // Dodatnia strona KIER-00 w TYM procesie (te same funkcje, co CLI; bez drugiego rozruchu WP-CLI).
      const zr = zrzut("f1-baza", { katalog: pusty, migawki: null });
      sprawdz("ZRZUT     f1-baza żywej bazy: .sql i .json w katalogu, 80 tabel, media policzone", existsSync(zr.sql) && existsSync(zr.json) && zr.liczniki.tabel >= 10 && zr.liczniki.media.plikow > 0, JSON.stringify({ tabel: zr.liczniki.tabel }));
      const ze = await sprawdz_({ fala: 1, katalog: pusty });
      sprawdz("KIER-00   ze zrzutem bazowym zgodnym z żywą bazą → wszystko ✓ (kod 0)", ze.ok && ze.wyniki.some((w) => /liczniki żywej bazy/.test(w.nazwa) && w.ok), ze.wyniki.filter((w) => !w.ok).map((w) => `${w.nazwa}: ${w.szczegol}`).join("; "));
      const pad = uruchom("--test", "--padnij");
      sprawdz("CLI       --test, który PADA za schematem próbnym → kod 1, a schematu NIE MA (finally sprząta)",
        pad.kod === 1 && /padnięcie na życzenie/.test(pad.wyjscie) && !sql("SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'proba_srodowisko_%'").some(([n]) => n !== SCHEMAT_PROBNY),
        `kod ${pad.kod}: ${pad.wyjscie.trim().slice(0, 200)}`);
    } finally {
      rmSync(pusty, { recursive: true, force: true });
    }
  } finally {
    sql(`DROP DATABASE IF EXISTS \`${SCHEMAT_PROBNY}\``);
    rmSync(katalogTmp, { recursive: true, force: true });
  }

  process.stdout.write(`\nSamokontrola środowiska: ${zle === 0 ? "wszystkie przypadki zaliczone" : `${zle} NIE zaliczonych`}\n`);
  return zle === 0;
}

/* ── wejście ── */

const GLOWNY_MODUL =
  Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (GLOWNY_MODUL) {
  const arg = process.argv.slice(2);
  const wartosc = (n) => arg.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
  const katalog = wartosc("katalog-zrzutow") ?? KATALOG_ZRZUTOW;
  const surowaFala = wartosc("fala") ?? "1";
  const fala = /^[12]$/.test(surowaFala) ? Number(surowaFala) : null;
  const pisz = (t) => process.stdout.write(t);

  try {
    if (arg.includes("--test")) {
      process.exit((await samokontrola({ padnij: arg.includes("--padnij") })) ? 0 : 1);
    }
    if (arg.includes("--stoi")) {
      const s = stoi();
      pisz(`${KONTENERY.db}: ${s ? "stoi" : "NIE stoi"}\n`);
      process.exit(s ? 0 : 1);
    }
    if (arg.includes("--liczniki")) {
      pisz(JSON.stringify(liczniki(), null, 2) + "\n");
      process.exit(0);
    }
    if (wartosc("zrzut")) {
      // `--katalog-zrzutow` (samokontrola) przekierowuje TAKŻE liczniki — inaczej próba zostawiłaby plik w audyt/migawki/.
      const z = zrzut(wartosc("zrzut"), { katalog, migawki: wartosc("katalog-zrzutow") ? katalog : KATALOG_MIGAWEK });
      pisz(`Zrzut "${wartosc("zrzut")}": ${z.sql} (${(z.bajtow / 1e6).toFixed(1)} MB), liczniki ${z.json}\n`);
      pisz(`  tabel ${z.liczniki.tabel}, skrót ${z.liczniki.skrot_tabel.slice(0, 16)}…, media ${z.liczniki.media.plikow} plików, wtyczki aktywne ${z.liczniki.wtyczki_aktywne.length}\n`);
      process.exit(0);
    }
    if (wartosc("przywroc")) {
      const w = przywroc(wartosc("przywroc"), { katalog });
      pisz(`Przywrócono "${wartosc("przywroc")}" do bazy ${BAZA}: ${w.tabel} tabel, skrót ${w.liczniki.skrot_tabel.slice(0, 16)}…\n`);
      if (w.rozjazd.length) {
        pisz("ROZJAZD po przywróceniu — to zatrzymuje proces:\n" + w.rozjazd.map((r) => `  - ${r}\n`).join("") +
          "Baza wróciła do zrzutu, ale środowisko NIE jest stanem ze zrzutu (media leżą poza bazą, W2: nikt nie ma prawa ich pisać).\n");
        process.exit(1);
      }
      pisz("  liczniki żywej bazy = liczniki zapisane przy zrzucie.\n");
      process.exit(0);
    }
    if (arg.includes("--sprawdz")) {
      if (fala === null) {
        pisz(`Fala musi być 1 albo 2, jest "${surowaFala}".\n`);
        process.exit(1);
      }
      const w = await sprawdz({ fala, katalog });
      pisz(`KIER-00 — co musi stać, zanim wejdzie pierwsza rola na środowisku (fala ${fala}):\n`);
      for (const x of w.wyniki) pisz(`  ${x.ok ? "✓" : "✗"} ${x.nazwa}${!x.ok && x.szczegol ? `\n      ${x.szczegol}` : ""}\n`);
      for (const m of w.meldunki) pisz(`  · ${m}\n`);
      pisz(w.ok ? "Środowisko gotowe.\n" : "Środowisko NIE jest gotowe — żadna rola z listy NA_SRODOWISKU nie wchodzi.\n");
      process.exit(w.ok ? 0 : 1);
    }
    pisz("Użycie: --liczniki | --zrzut=<nazwa> | --przywroc=<nazwa> | --sprawdz --fala=N | --stoi | --test\n");
    process.exit(1);
  } catch (e) {
    pisz(`srodowisko.mjs: ${e.message}\n`);
    process.exit(1);
  }
}
