/**
 * Smoke fundamentu Pluginu 3 (`aai-monitor`) — bramka kroku T1.
 *
 * Mierzy ZACHOWANIE na żywej instalacji, nie deklaracje kodu. Strażnik
 * czyta źródło i powie, że tabela wizyt nie ma kolumny `ip`; ten smoke
 * pyta o to BAZĘ, bo między jednym a drugim stoi `dbDelta`, które ma
 * własne zdanie na temat tego, co naprawdę utworzyć.
 *
 * Co dowodzimy:
 *  - schemat: obie tabele istnieją, dziennik logowań UMIE odpowiedzieć
 *    „kto i skąd”, a tabela ruchu jest ANONIMOWA (N7, D3) — mierzone na
 *    kolumnach z `DESCRIBE`, nie na źródle,
 *  - warstwa zapisu: wiersz powstaje, porażka zostawia `user_id` NULL
 *    (nie zero, które udawałoby konto), źródło da się doprecyzować
 *    (mechanizm pary haków z T2), a przydługi agent jest przycinany,
 *  - CZAS PONAD SUFIT JEST PRZYCINANY, NIE ODRZUCANY — rozstrzygnięcie
 *    sprzeczności C-2 z krytyki T0; wiersz MUSI istnieć z sufitem,
 *  - moment WEJŚCIA liczy serwer (`now − trwanie`), bo beacon przychodzi
 *    przy wyjściu ze strony,
 *  - retencja działa i ma DWA wyzwalacze: zapis oraz jawne wywołanie,
 *    którego używa ekran (P7),
 *  - KONTROLA NIE PISZE (N16) — liczniki obu tabel po `sprawdz` są co do
 *    wiersza takie same jak przed; to jest pomiar, nie lektura kodu,
 *  - kontrola świeci kod 1, gdy kanał błędów niesie awarię (N15), i wraca
 *    do zera po jawnym zdjęciu alarmu,
 *  - ekran: admin wchodzi, KLIENT NIE, gość nie; a w oddanym HTML-u nie
 *    ma ani formularza POST, ani nonce'a (N1 mierzone na wyjściu, nie
 *    w źródle),
 *  - kotwica pozycji „Automatic AI” DALEJ celuje w `page=aai-sklep`
 *    (bramka T1) i nasza pozycja stoi na KOŃCU podmenu Pluginu 1 —
 *    priorytet 20 na `admin_menu` (P12),
 *  - deaktywacja NIE kasuje danych (N17), a ponowna aktywacja przywraca
 *    stan — w `try/finally`, żeby padnięcie nie zostawiło `:8892`
 *    z wyłączonym monitoringiem (lekcja 0.53.0).
 *
 * HIGIENA: smoke pisze WYŁĄCZNIE do własnych tabel i sprząta po sobie,
 * a na końcu porównuje liczniki ze stanem sprzed przebiegu (zasada
 * z 0.54.0: test ma prawo psuć swoje dane, nie cudze).
 *
 * WYMAGA środowiska: `cd wordpress/srodowisko && ./postaw.sh`.
 * Nie wchodzi do `npm run smoke` ani CI — CI nie ma podmana.
 *
 * Użycie: node tools/smoke/smoke-wp-monitor.mjs
 */
import { execFileSync } from "node:child_process";
import net from "node:net";
import { readFileSync } from "node:fs";
import { migawkaDziennika, sprzatnijDziennik, ileWpisow } from "./dziennik.mjs";
import { createRequire } from "node:module";

/*
 * OD KROKU T3 TA BRAMKA WYMAGA PRZEGLĄDARKI. Endpoint da się sprawdzić
 * `fetch`em, ale nie o endpoint tu chodzi: beacon odpowiada 204 i na
 * przyjęcie, i na odrzut, więc jedynym dowodem, że pomiar DZIAŁA, jest
 * przejście całej drogi — prawdziwy skrypt, prawdziwe wyjście ze strony,
 * wiersz w tabeli. Para N9/N10 dowodzi przy okazji, że automaty NIE są
 * liczone, a tego bez przeglądarki nie da się pokazać w ogóle.
 */
const RIG = process.env.ZRZUTY_RIG;
if (!RIG) {
  console.error(
    "smoke-wp-monitor: ustaw ZRZUTY_RIG na katalog z zainstalowanym `puppeteer-core`.\n" +
      "  mkdir -p /tmp/rig && cd /tmp/rig && npm init -y && npm i puppeteer-core"
  );
  process.exit(1);
}
const wymagaj = createRequire(RIG.endsWith("/") ? RIG : `${RIG}/`);
const puppeteer = wymagaj("puppeteer-core");
const PRZEGLADARKA = process.env.FIREFOX ?? "/usr/bin/firefox";

const STACK = process.env.STACK_NAZWA ?? "aai_wp";
const KONTENER = `${STACK}_cli`;
const ADRES = process.env.WP_ADRES ?? "http://127.0.0.1:8892";
const STRONA = "/wp-admin/admin.php?page=aai-monitor";
const AGENT_TESTOWY = "smoke-monitor/" + "x".repeat(250);

const bledy = [];
let sprawdzen = 0;

function sprawdz(warunek, opis) {
  sprawdzen += 1;
  if (!warunek) bledy.push(opis);
}

function spawn(argumenty) {
  try {
    const stdout = execFileSync("podman", argumenty, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { kod: 0, stdout: stdout.trim(), stderr: "" };
  } catch (e) {
    return { kod: e.status ?? 1, stdout: (e.stdout ?? "").toString().trim(), stderr: (e.stderr ?? "").toString().trim() };
  }
}
const wp = (...a) => spawn(["exec", KONTENER, "wp", "--path=/var/www/html", ...a]);
const phpEval = (kod) => wp("eval", kod);

/** Liczniki obu tabel jako „a:b” — rachunek sumienia przed i po. */
const liczniki = () =>
  phpEval(
    'global $wpdb; echo (int) $wpdb->get_var("SELECT COUNT(*) FROM " . Aai_Monitor_Tabele::tabela("logowania")), ":", (int) $wpdb->get_var("SELECT COUNT(*) FROM " . Aai_Monitor_Tabele::tabela("wizyty"));'
  ).stdout;

/** Kolumny tabeli — pytamy BAZĘ, nie źródło. */
function kolumny(nazwa) {
  const wynik = wp("db", "query", `DESCRIBE \`$(echo)\``);
  void wynik;
  return phpEval(
    `global $wpdb; $t = Aai_Monitor_Tabele::tabela('${nazwa}'); $k = $wpdb->get_col("DESCRIBE \`{$t}\`"); echo implode(',', $k);`
  ).stdout.split(",").map((s) => s.trim()).filter(Boolean);
}

/* ── sesja HTTP z ciastkami (admin, klient, gość) ────────────────────── */

function sesja() {
  const ciastka = new Map();
  const pobierz = async (sciezka, opcje = {}) => {
    const odp = await fetch(`${ADRES}${sciezka}`, {
      redirect: "manual",
      ...opcje,
      headers: {
        ...(opcje.headers ?? {}),
        cookie: [...ciastka].map(([k, v]) => `${k}=${v}`).join("; "),
        // Zamykamy połączenie po każdym żądaniu. Node utrzymuje je
        // keep-alive, a Apache w kontenerze zrywa bezczynne po kilku
        // sekundach — dokładnie tyle trwa przelot przeglądarką w bloku
        // 10i. Zerwane połączenie wypływa wtedy jako nieobsłużony
        // `SocketError: other side closed` i wygląda jak awaria naszego
        // endpointu, którym nie jest (pojedyncze i seryjne żądania
        // przechodzą bez zarzutu — sprawdzone).
        connection: "close",
      },
    });
    for (const linia of odp.headers.getSetCookie?.() ?? []) {
      const [para] = linia.split(";");
      const i = para.indexOf("=");
      if (i > 0) ciastka.set(para.slice(0, i).trim(), para.slice(i + 1).trim());
    }
    return odp;
  };
  return {
    pobierz,
    /** Nagłówek `cookie` tej sesji — beacon N18 musi jechać jako ZALOGOWANY. */
    naglowekCiastek: () => [...ciastka].map(([k, v]) => `${k}=${v}`).join("; "),
    async zaloguj(login, haslo) {
      await pobierz("/wp-login.php");
      await pobierz("/wp-login.php", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          log: login,
          pwd: haslo,
          "wp-submit": "Zaloguj",
          redirect_to: `${ADRES}/wp-admin/`,
          testcookie: "1",
        }).toString(),
      });
      return [...ciastka.keys()].some((k) => k.startsWith("wordpress_logged_in"));
    },
  };
}

const HASLA = Object.fromEntries(
  readFileSync("wordpress/srodowisko/.env", "utf8")
    .split("\n")
    .filter(Boolean)
    .map((linia) => linia.split("=").map((s) => s.trim()))
);

/* ── stan wyjściowy ─────────────────────────────────────────────────── */

sprawdz(
  wp("plugin", "get", "aai-monitor", "--field=status").stdout === "active",
  "wtyczka aai-monitor nie jest aktywna — postaw środowisko: cd wordpress/srodowisko && ./postaw.sh"
);

const licznikiPrzed = liczniki();
/*
 * Granica „co powstało w TYM przebiegu". Od T2 wiersze produkuje też
 * WordPress — przy każdym logowaniu, które ten smoke wykonuje. Migawkę
 * i sprzątanie bierzemy ze WSPÓLNEGO modułu, tego samego, którego używa
 * siedem pozostałych bramek: zduplikowana logika sprzątania w dwóch
 * miejscach rozjeżdża się przy pierwszej poprawce tylko jednego z nich.
 */
const php = (kod) => phpEval(kod).stdout;
const dziennikPrzed = ileWpisow(php);
const dziennikMigawka = migawkaDziennika(php);

/*
 * Migawka RUCHU: najwyższy identyfikator wizyty sprzed przebiegu.
 * Wzorzec po ścieżce tu nie wystarcza — nasze beacony MUSZĄ jechać
 * realnymi ścieżkami instalacji, bo tylko takie mają podpis. Kasujemy
 * więc okno przebiegu, dokładnie jak w dzienniku logowań.
 */
const wizytyMigawka = Number(
  phpEval("global $wpdb; echo (int) $wpdb->get_var( 'SELECT COALESCE( MAX(id), 0 ) FROM ' . Aai_Monitor_Tabele::tabela('wizyty') );").stdout
);

/* ── 1. schemat: co tabele NAPRAWDĘ mają ────────────────────────────── */

sprawdz(
  phpEval("echo Aai_Monitor_Tabele::istnieja() ? 'sa' : 'brak';").stdout.endsWith("sa"),
  "tabele monitoringu nie istnieją"
);

const kolLogowania = kolumny("logowania");
const kolWizyty = kolumny("wizyty");

for (const k of ["czas", "zdarzenie", "zrodlo", "user_id", "login", "ip", "agent"]) {
  sprawdz(kolLogowania.includes(k), `dziennik logowań nie ma kolumny „${k}” — nie odpowie na pytanie „kto i skąd”`);
}
// N7/D3: to jest sedno anonimowości ruchu i mierzymy je na BAZIE,
// bo między źródłem a tabelą stoi dbDelta.
for (const k of ["ip", "login", "agent", "user_id", "email"]) {
  sprawdz(
    !kolWizyty.includes(k),
    `tabela ruchu MA kolumnę „${k}” — pomiar odsłon zamienia się w profilowanie (N7, decyzja D3)`
  );
}
sprawdz(kolWizyty.includes("sesja") && kolWizyty.includes("sciezka"), "tabela ruchu nie ma sesji albo ścieżki");

sprawdz(
  phpEval("Aai_Monitor_Tabele::utworz(); echo Aai_Monitor_Tabele::istnieja() ? 'sa' : 'brak';").stdout.endsWith("sa"),
  "drugie utworzenie schematu psuje tabele (dbDelta miało być idempotentne)"
);

/* ── 2. warstwa zapisu ──────────────────────────────────────────────── */

const idUdane = phpEval(
  "Aai_Monitor_Zapis::dodaj_logowanie( array( 'zdarzenie' => 'udane', 'zrodlo' => 'sesja', 'user_id' => 1, 'login' => 'smoke-monitor', 'ip' => '203.0.113.7', 'agent' => '" +
    AGENT_TESTOWY +
    "' ) ); echo Aai_Monitor_Zapis::ostatni_id();"
).stdout;
sprawdz(Number(idUdane) > 0, `zapis udanego logowania nie zwrócił identyfikatora (${idUdane})`);

const wiersz = (id) =>
  phpEval(
    `global $wpdb; $t = Aai_Monitor_Tabele::tabela('logowania'); echo wp_json_encode( $wpdb->get_row( $wpdb->prepare( "SELECT * FROM \`{$t}\` WHERE id = %d", ${id} ), ARRAY_A ) );`
  ).stdout;

const udane = JSON.parse(wiersz(idUdane));
sprawdz(udane.zdarzenie === "udane", `zdarzenie zapisane jako „${udane.zdarzenie}”, oczekiwano „udane”`);
sprawdz(udane.ip === "203.0.113.7", `adres zapisany jako „${udane.ip}” — dziennik ma trzymać PEŁNE IP (D2)`);
sprawdz(
  udane.agent.length === 191,
  `agent ma ${udane.agent.length} znaków zamiast 191 — przycinanie ma być NASZĄ decyzją, nie skutkiem ubocznym konfiguracji MySQL-a`
);

sprawdz(
  phpEval(`echo Aai_Monitor_Zapis::uzupelnij_zrodlo( ${idUdane}, 'formularz' ) ? 'tak' : 'nie';`).stdout.endsWith("tak"),
  "nie udało się doprecyzować źródła logowania (to mechanizm pary haków z T2)"
);
sprawdz(
  JSON.parse(wiersz(idUdane)).zrodlo === "formularz",
  "źródło nie zmieniło się na „formularz” po doprecyzowaniu"
);

const idPorazki = phpEval(
  "Aai_Monitor_Zapis::dodaj_logowanie( array( 'zdarzenie' => 'nieudane', 'login' => 'smoke-monitor-zly', 'ip' => '203.0.113.8' ) ); echo Aai_Monitor_Zapis::ostatni_id();"
).stdout;
const porazka = JSON.parse(wiersz(idPorazki));
sprawdz(porazka.zdarzenie === "nieudane", "porażka zapisana ze złym zdarzeniem");
sprawdz(
  porazka.user_id === null,
  `porażka ma user_id = ${porazka.user_id}, a powinna mieć NULL — zero udawałoby konto o identyfikatorze zero`
);
sprawdz(porazka.login === "smoke-monitor-zly", "porażka nie zapamiętała podanego loginu");

/* ── 3. wizyty: sufit przycina, wejście liczy serwer ────────────────── */

phpEval("Aai_Monitor_Zapis::dodaj_wizyte( array( 'sesja' => str_repeat('a', 32), 'sciezka' => '/smoke-monitor/', 'trwanie_ms' => 5000 ) );");
const wizyta = JSON.parse(
  phpEval(
    "global $wpdb; $t = Aai_Monitor_Tabele::tabela('wizyty'); echo wp_json_encode( $wpdb->get_row( \"SELECT *, TIMESTAMPDIFF(SECOND, wejscie, UTC_TIMESTAMP()) AS ile_temu FROM `{$t}` ORDER BY id DESC LIMIT 1\", ARRAY_A ) );"
  ).stdout
);
sprawdz(wizyta.sciezka === "/smoke-monitor/", "wizyta nie zapisała ścieżki");
sprawdz(
  Number(wizyta.ile_temu) >= 5 && Number(wizyta.ile_temu) <= 15,
  `moment wejścia wypada ${wizyta.ile_temu} s temu, a przy trwaniu 5 s powinien wypaść około 5 s temu — wejście liczy SERWER jako „teraz minus trwanie”, bo beacon przychodzi przy WYJŚCIU ze strony`
);

const sufit = 4 * 60 * 60 * 1000;
phpEval(
  `Aai_Monitor_Zapis::dodaj_wizyte( array( 'sesja' => str_repeat('b', 32), 'sciezka' => '/smoke-monitor/dluga/', 'trwanie_ms' => ${sufit * 3} ) );`
);
const dluga = JSON.parse(
  phpEval(
    "global $wpdb; $t = Aai_Monitor_Tabele::tabela('wizyty'); echo wp_json_encode( $wpdb->get_row( \"SELECT * FROM `{$t}` WHERE sciezka = '/smoke-monitor/dluga/' ORDER BY id DESC LIMIT 1\", ARRAY_A ) );"
  ).stdout
);
// To jest rozstrzygnięcie sprzeczności C-2 z krytyki T0: PRZYCINAMY.
sprawdz(dluga !== null && dluga.sciezka === "/smoke-monitor/dluga/", "wizyta ponad sufitem czasu została ODRZUCONA, a ma być PRZYCIĘTA — odrzut wyrzuca prawdziwe wejście razem z jego ścieżką (C-2)");
sprawdz(
  Number(dluga?.trwanie_ms) === sufit,
  `trwanie zapisane jako ${dluga?.trwanie_ms}, oczekiwano przyciętego ${sufit}`
);

/* ── 4. retencja: dwa wyzwalacze ────────────────────────────────────── */

/*
 * Cofa czas WSKAZANEMU wierszowi — nigdy „najstarszemu w tabeli".
 *
 * Pierwsza wersja brała `MIN(id)`, bo do kroku T2 w tych tabelach nie
 * było nic poza wierszami smoke'a. Od T2 pisze do nich WordPress przy
 * każdym logowaniu, a docelowo są tam prawdziwe wpisy właściciela —
 * więc `MIN(id)` trafiał w NAJSTARSZY CUDZY wiersz, cofał mu czas
 * o 400 dni i oddawał go retencji do skasowania.
 *
 * Zmierzone, nie teoretyczne: po przelocie wszystkich bramek WP smoke
 * kasował wiersz `smoke-kreator-gosc` zostawiony przez smoke kreatora
 * (przed 4 wiersze, po 3). Na instalacji właściciela zniknąłby jego
 * najstarszy wpis logowania — czyli DOWÓD, gdyby akurat prowadził
 * dochodzenie po włamaniu. Złapał to rachunek sumienia, który liczy
 * CAŁĄ tabelę, a nie tylko własne ślady (lekcja z P5).
 */
const podlozStary = (tabela, kolumna, dni, id) =>
  phpEval(
    `global $wpdb; $t = Aai_Monitor_Tabele::tabela('${tabela}'); $wpdb->query( $wpdb->prepare( "UPDATE \`{$t}\` SET \`${kolumna}\` = %s WHERE id = %d", gmdate('Y-m-d H:i:s', time() - ${dni} * DAY_IN_SECONDS), ${id} ) ); echo 'ok';`
  ).stdout;

// Własny wiersz do zestarzenia — nie ruszamy niczego, czego nie stworzyliśmy.
const idDoRetencji = phpEval(
  "Aai_Monitor_Zapis::dodaj_logowanie( array( 'zdarzenie' => 'udane', 'login' => 'smoke-monitor-stary', 'ip' => '203.0.113.8' ) ); echo Aai_Monitor_Zapis::ostatni_id();"
).stdout;
sprawdz(Number(idDoRetencji) > 0, "nie udało się utworzyć własnego wiersza do sprawdzenia retencji");
podlozStary("logowania", "czas", 400, Number(idDoRetencji));
/*
 * Porównujemy CAŁĄ wartość, nie końcówkę. `"11".endsWith("1")` jest
 * prawdą, a od kroku T2 w tabeli bywają wiersze spoza tego przebiegu,
 * więc licznik większy niż 1 jest realny. Ta klasa wróciła w repo
 * trzykrotnie (`endsWith("199.00")` przy P2, `includes("99,00 zł")`
 * przy P3b, teraz tutaj).
 */
const liczbaZWyjscia = (tekst) => Number(String(tekst).trim().match(/-?\d+$/)?.[0] ?? NaN);

sprawdz(
  liczbaZWyjscia(
    phpEval(
      "global $wpdb; $t = Aai_Monitor_Tabele::tabela('logowania'); echo (int) $wpdb->get_var(\"SELECT COUNT(*) FROM `{$t}` WHERE czas < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 200 DAY)\");"
    ).stdout
  ) === 1,
  "nie udało się podłożyć starego wiersza — dalsze sprawdzenie retencji byłoby ślepe"
);
phpEval("Aai_Monitor_Zapis::dodaj_logowanie( array( 'zdarzenie' => 'udane', 'login' => 'smoke-monitor-retencja', 'ip' => '203.0.113.9' ) );");
sprawdz(
  liczbaZWyjscia(
    phpEval(
      "global $wpdb; $t = Aai_Monitor_Tabele::tabela('logowania'); echo (int) $wpdb->get_var(\"SELECT COUNT(*) FROM `{$t}` WHERE czas < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 200 DAY)\");"
    ).stdout
  ) === 0,
  "retencja przy zapisie NIE skasowała wiersza starszego niż 90 dni — dane osobowe żyją dłużej, niż obiecuje polityka prywatności"
);

// Ta sama zasada dla ruchu: cofamy czas WŁASNEJ wizycie. Dziś tabela jest
// poza smoke'em pusta, ale od kroku T3 przestanie być — a wtedy `MIN(id)`
// zabierałby prawdziwą odsłonę.
const idWizyty = phpEval(
  "Aai_Monitor_Zapis::dodaj_wizyte( array( 'sesja' => str_repeat('c', 32), 'sciezka' => '/smoke-monitor/stara/', 'trwanie_ms' => 1000 ) ); echo Aai_Monitor_Zapis::ostatni_id();"
).stdout;
sprawdz(Number(idWizyty) > 0, "nie udało się utworzyć własnej wizyty do sprawdzenia retencji");
podlozStary("wizyty", "wejscie", 500, Number(idWizyty));
const skasowane = phpEval("echo (int) Aai_Monitor_Zapis::retencja();").stdout;
sprawdz(
  Number(skasowane.match(/\d+$/)?.[0] ?? 0) >= 1,
  `drugi wyzwalacz retencji (ten, którego używa ekran) nie skasował niczego: ${skasowane}`
);
sprawdz(
  liczbaZWyjscia(
    phpEval(
      "global $wpdb; $t = Aai_Monitor_Tabele::tabela('wizyty'); echo (int) $wpdb->get_var(\"SELECT COUNT(*) FROM `{$t}` WHERE wejscie < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 450 DAY)\");"
    ).stdout
  ) === 0,
  "retencja ruchu nie zadziałała mimo jawnego wywołania"
);

/* ── 5. kontrola: kod 0, kod 1 przy awarii i ANI JEDNEGO zapisu ─────── */

const przedKontrola = liczniki();
const kontrola = wp("aai-monitor", "sprawdz");
sprawdz(kontrola.kod === 0, `sprawdz na zdrowym środowisku oddało kod ${kontrola.kod}: ${kontrola.stderr}`);
sprawdz(/WordPress: /.test(kontrola.stdout), "sprawdz nie wypisuje wersji, na których dowiedziono haki (L17)");
// N16 MIERZONE, nie wyczytane ze źródła.
sprawdz(
  liczniki() === przedKontrola,
  `kontrola ZMIENIŁA dane: przed ${przedKontrola}, po ${liczniki()} — „sprawdz” ma wyłącznie orzekać (N16)`
);

phpEval("Aai_Monitor_Komunikaty::zapisz( 'smoke: udawana awaria zapisu' );");
const zAwaria = wp("aai-monitor", "sprawdz");
sprawdz(zAwaria.kod !== 0, "sprawdz przemilczał awarię w kanale błędów — pusty ekran znaczyłby wtedy „nikt nie próbował” (N15)");
const zdjecie = wp("aai-monitor", "wyczysc-blad");
sprawdz(zdjecie.kod === 0, `zdjęcie alarmu padło: ${zdjecie.stderr}`);
sprawdz(wp("aai-monitor", "sprawdz").kod === 0, "po zdjęciu alarmu kontrola dalej świeci na czerwono — nauczyłaby, żeby jej nie ufać");

/* ── 6. ekran: kto wchodzi, kto nie i co jest w HTML-u ──────────────── */

const admin = sesja();
sprawdz(await admin.zaloguj("admin", HASLA.WP_ADMIN_HASLO), "nie udało się zalogować jako admin");
const odpAdmin = await admin.pobierz(STRONA);
const html = await odpAdmin.text();
sprawdz(odpAdmin.status === 200, `ekran monitoringu oddał adminowi ${odpAdmin.status}, oczekiwano 200`);
sprawdz(html.includes("aai-monitor-kafelki"), "ekran nie wyrenderował swoich kafelków");
// N1 mierzone na WYJŚCIU, nie w źródle.
sprawdz(!/<form[^>]+method=["']post["']/i.test(html), 'ekran oddał formularz method="post" — miał być czystym odczytem (N1)');
sprawdz(!/name=["']_wpnonce["']/.test(html), "ekran oddał nonce — nonce jest po to, żeby chronić ZAPIS, którego tu nie ma (N1)");

const klient = sesja();
if (await klient.zaloguj("klient-test", HASLA.WP_KLIENT_HASLO)) {
  const odpKlient = await klient.pobierz(STRONA);
  sprawdz(
    odpKlient.status === 403,
    `konto bez uprawnień dostało ${odpKlient.status} na ekranie monitoringu, oczekiwano 403 — dziennik logowań to dane osobowe`
  );
} else {
  sprawdz(false, "nie udało się zalogować konta klient-test (uruchom: npm run wp:klient)");
}

// Wtyczka, która wpycha swój CSS w cały kokpit, psuje cudze ekrany —
// tę lekcję odrobiliśmy w 0.38.0 od drugiej strony (arkusz Tutora łamał
// stronę główną). Mierzymy OBIE strony medalu: cudzy arkusz nie wchodzi
// do nas, a nasz nie wychodzi do nich.
const arkusze = (html) =>
  [...html.matchAll(/href=['"]([^'"]*plugins\/aai-[^'"]+\.css[^'"]*)['"]/g)].map(
    (m) => m[1].split("?")[0].split("/plugins/")[1]
  );
const naszeArkusze = arkusze(html);
sprawdz(
  naszeArkusze.some((a) => a.startsWith("aai-monitor/")),
  `ekran monitoringu nie ładuje własnego arkusza (znalezione: ${naszeArkusze.join(", ") || "żadnego"})`
);
sprawdz(
  !naszeArkusze.some((a) => a.startsWith("aai-sklep/")),
  `na ekran monitoringu wszedł arkusz kreatora Pluginu 1 (${naszeArkusze.join(", ")}) — cudzy CSS na naszym ekranie psuje układ w sposób, którego nikt nie zgłosi`
);
const kreatorHtml = await (await admin.pobierz("/wp-admin/admin.php?page=aai-sklep")).text();
sprawdz(
  !arkusze(kreatorHtml).some((a) => a.startsWith("aai-monitor/")),
  `nasz arkusz wyciekł na ekran kreatora Pluginu 1 (${arkusze(kreatorHtml).join(", ")}) — monitoring ma nie dotykać cudzych ekranów`
);

const gosc = await sesja().pobierz(STRONA);
sprawdz([302, 301, 403].includes(gosc.status), `gość dostał ${gosc.status} na ekranie monitoringu, oczekiwano przekierowania albo odmowy`);

/* ── 7. menu: nasza pozycja i CUDZA kotwica ─────────────────────────── */

const kokpit = await (await admin.pobierz("/wp-admin/index.php")).text();
// Bramka T1: podpięcie się pod cudze menu nie może przestawić jego kotwicy.
sprawdz(
  /href=["']admin\.php\?page=aai-sklep["'][^>]*>\s*(?:<[^>]+>\s*)*Automatic AI/.test(kokpit) ||
    kokpit.includes("admin.php?page=aai-sklep"),
  "kotwica pozycji „Automatic AI” nie celuje już w page=aai-sklep — podpięcie monitoringu przestawiło cudze menu"
);
sprawdz(kokpit.includes("admin.php?page=aai-monitor"), "pozycji „Monitoring” nie ma w menu kokpitu");
// P12: priorytet 20 na admin_menu — nasza pozycja ma stać PO pozycjach Pluginu 1.
const pozycjaNasza = kokpit.indexOf("admin.php?page=aai-monitor");
const pozycjaKurs = kokpit.indexOf("admin.php?page=aai-sklep-kurs");
sprawdz(
  pozycjaKurs === -1 || pozycjaNasza > pozycjaKurs,
  "pozycja „Monitoring” weszła do podmenu PRZED pozycjami Pluginu 1 — wtyczki ładują się alfabetycznie, więc bez priorytetu 20 nasza rejestracja biegnie pierwsza (P12)"
);

/* ── 8. deaktywacja nie kasuje danych (N17) ─────────────────────────── */

const przedDeaktywacja = liczniki();
try {
  wp("plugin", "deactivate", "aai-monitor");
  sprawdz(
    phpEval(
      'global $wpdb; $t = $wpdb->prefix . "aai_monitor_logowania"; echo (int) $wpdb->get_var( $wpdb->prepare( "SHOW TABLES LIKE %s", $t ) ? "SELECT 1" : "SELECT 0" );'
    ).kod === 0,
    "po deaktywacji nie da się już zapytać bazy o nasze tabele"
  );
  const poDeaktywacji = spawn([
    "exec",
    KONTENER,
    "wp",
    "--path=/var/www/html",
    "db",
    "query",
    "SELECT COUNT(*) FROM wp_aai_monitor_logowania",
    "--skip-column-names",
  ]);
  sprawdz(
    poDeaktywacji.kod === 0 && Number(poDeaktywacji.stdout) > 0,
    "deaktywacja wtyczki zabrała dane dziennika — dziennik logowań jest materiałem dowodowym po incydencie (N17)"
  );
} finally {
  wp("plugin", "activate", "aai-monitor");
}
sprawdz(
  wp("plugin", "get", "aai-monitor", "--field=status").stdout === "active",
  "smoke zostawił monitoring WYŁĄCZONY — przebieg nie może kończyć się instalacją bez rejestrowania (lekcja 0.53.0)"
);
sprawdz(liczniki() === przedDeaktywacja, "cykl deaktywacja → aktywacja zmienił liczbę wierszy");

/* ── 9. HAKI LOGOWANIA: trzy ścieżki na ŻYWO (T2) ───────────────────── */

/*
 * Bloki 1–8 mierzą warstwę zapisu wołaną WPROST. Ten blok mierzy to,
 * czego nie da się wyczytać ze źródła: czy WordPress i WooCommerce
 * naprawdę odpalają haki, na których stoi cały dziennik — i czy dedup
 * źródła daje JEDEN wiersz, a nie dwa.
 */

const LOGIN_NIEISTNIEJACY = "smoke-monitor-nie-ma-konta";

/** Wiersze dziennika nowsze niż podany identyfikator. */
const nowszeNiz = (id) =>
  JSON.parse(
    phpEval(
      `global $wpdb; $t = Aai_Monitor_Tabele::tabela('logowania'); echo wp_json_encode( $wpdb->get_results( $wpdb->prepare( "SELECT * FROM \`{$t}\` WHERE id > %d ORDER BY id", ${id} ), ARRAY_A ) );`
    ).stdout || "[]"
  );

/** Świeża sesja gościa — każda próba bez ciastek poprzedniej. */
const gosc2 = () => sesja();

const maxId = () => Number(phpEval('global $wpdb; echo (int) $wpdb->get_var("SELECT COALESCE(MAX(id),0) FROM " . Aai_Monitor_Tabele::tabela("logowania"));').stdout || 0);

/* N2 — logowanie formularzem daje DOKŁADNIE JEDEN wiersz. */
const przedFormularzem = maxId();
const klientHakow = sesja();
sprawdz(await klientHakow.zaloguj("klient-test", HASLA.WP_KLIENT_HASLO), "nie udało się zalogować jako klient-test");

const poFormularzu = nowszeNiz(przedFormularzem);
sprawdz(
  poFormularzu.length === 1,
  `logowanie formularzem zostawiło ${poFormularzu.length} wierszy zamiast jednego (N2). Dwa znaczą, że dedup nie zadziałał: set_logged_in_cookie utworzył wiersz, a wp_login dopisał drugi zamiast doprecyzować pierwszy — dziennik działa, tylko liczy każde wejście podwójnie.`
);
sprawdz(
  poFormularzu[0]?.zrodlo === "formularz",
  `logowanie formularzem zapisało źródło „${poFormularzu[0]?.zrodlo}” zamiast „formularz” (N2). Bez doprecyzowania nie da się odróżnić człowieka przy formularzu od automatycznego wejścia z kasy — a po to istnieje ta kolumna.`
);
sprawdz(
  poFormularzu[0]?.zdarzenie === "udane" && Number(poFormularzu[0]?.user_id) > 0,
  "wiersz logowania formularzem nie ma zdarzenia „udane” albo identyfikatora konta"
);
sprawdz(
  (poFormularzu[0]?.ip ?? "") !== "",
  "wiersz logowania nie ma adresu IP — dziennik ma odpowiadać na pytanie „kto i SKĄD” (D2)"
);

/* N5 — porażka trafia do dziennika, a hasła w niej NIE MA. */
const przedPorazka = maxId();
const HASLO_PROBNE = "smoke-monitor-haslo-probne-9f3a";
const goscHakow = sesja();
await goscHakow.pobierz("/wp-login.php");
await goscHakow.pobierz("/wp-login.php", {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    log: LOGIN_NIEISTNIEJACY,
    pwd: HASLO_PROBNE,
    "wp-submit": "Zaloguj",
    testcookie: "1",
  }).toString(),
});

const poPorazce = nowszeNiz(przedPorazka);
sprawdz(
  poPorazce.length === 1 && poPorazce[0]?.zdarzenie === "nieudane",
  `nieudana próba nie zostawiła wiersza „nieudane” (dostałem ${poPorazce.length}). Bez niej licznik porażek z 7 dni — JEDYNA funkcja alarmowa ekranu — pokazuje zero niezależnie od tego, ile razy ktoś próbował się włamać (N5).`
);
/*
 * Login NIEISTNIEJĄCEGO konta jest maskowany do SAMEJ DŁUGOŚCI (od 2026-09-05).
 * Do tego dnia zostawał jeszcze początek, „bo widać wzorzec ataku" — a że
 * w tym polu bywa HASŁO (A1 niżej), były to trzy pierwsze znaki sekretu
 * w bazie na 90 dni. Kształt wartości tego nie rozstrzygał: kryterium
 * `sanitize_user( $x, true ) === $x` przepuszcza każde hasło bez znaku
 * specjalnego. Istniejące konta zapisujemy dosłownie i tego pilnuje osobne
 * sprawdzenie w bloku A1 — tam mieszka cała wartość dowodowa.
 */
sprawdz(
  (poPorazce[0]?.login ?? "").includes(String(LOGIN_NIEISTNIEJACY.length)),
  `wiersz porażki nie zapisał nawet długości podanej wartości: „${poPorazce[0]?.login}” — bez niej nie widać ANI śladu próby`
);
sprawdz(
  !(poPorazce[0]?.login ?? "").includes(LOGIN_NIEISTNIEJACY.slice(0, 3)),
  `wiersz porażki zostawił początek podanej wartości: „${poPorazce[0]?.login}”. W polu loginu bywa hasło (A1), a kształt nie odróżnia go od loginu — więc z wartości nieistniejącego konta nie zostaje ani jeden znak`
);
sprawdz(
  poPorazce[0]?.user_id === null,
  "wiersz porażki ma user_id zamiast NULL-a — zero udawałoby konto o identyfikatorze zero"
);
/*
 * N5 — HASŁO NIGDY W DZIENNIKU. Pytamy o WSZYSTKIE wiersze przebiegu
 * i o WSZYSTKIE hasła, których w nim użyliśmy.
 *
 * Pierwsza wersja tej asercji patrzyła tylko na wiersz PORAŻKI i była
 * ŚLEPA — wykrył to jej własny test negatywny. Mutacja dopisująca
 * $_POST['pwd'] do handlera UDANEGO logowania przeszła na zielono, bo
 * asercja tam nie zaglądała. A przy udanym logowaniu formularzem
 * $_POST['pwd'] jest ustawione dokładnie tak samo jak przy porażce, więc
 * ta ścieżka wycieku jest równie realna.
 *
 * Hak wp_login_failed hasła nie niesie, więc bez mutacji to sprawdzenie
 * przechodzi zawsze — schemat wymaga dla niego UDOKUMENTOWANEGO testu
 * negatywnego (N5) i taki został wykonany na obu handlerach.
 */
const wszystkieWierszePrzebiegu = nowszeNiz(przedFormularzem);
const HASLA_PRZEBIEGU = [HASLO_PROBNE, HASLA.WP_KLIENT_HASLO, HASLA.WP_ADMIN_HASLO].filter(Boolean);
for (const haslo of HASLA_PRZEBIEGU) {
  sprawdz(
    !JSON.stringify(wszystkieWierszePrzebiegu).includes(haslo),
    `HASŁO TRAFIŁO DO DZIENNIKA (N5). Dziennik zapisuje, kto i skąd próbował — nigdy czym. Sprawdzane są WSZYSTKIE wiersze przebiegu i wszystkie użyte hasła, bo wyciek przez handler udanego logowania jest tak samo możliwy jak przez porażkę.`
  );
}

/* ── PO PRZEGLĄDZIE: pięć rzeczy, które przedtem przechodziły ────────── */

/*
 * A1 — w polu loginu bywa HASŁO (autouzupełnianie, zły układ klawiatury).
 * Rdzeń puszcza je przez sanitize_user(), które w trybie nieścisłym NIE
 * usuwa @ ! # $ % & _ - ani cyfr, więc wartość szła do dziennika jawnym
 * tekstem na 90 dni — wbrew obietnicy z polityki prywatności.
 */
const SEKRET = "MojeTajneHaslo#2026";
const przedSekretem = maxId();
await gosc2().pobierz("/wp-login.php");
await gosc2().pobierz("/wp-login.php", {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ log: SEKRET, pwd: SEKRET, "wp-submit": "Zaloguj", testcookie: "1" }).toString(),
});
const poSekrecie = nowszeNiz(przedSekretem);
sprawdz(
  poSekrecie.length === 1 && !JSON.stringify(poSekrecie).includes(SEKRET),
  `wartość wpisana w pole loginu trafiła do dziennika DOSŁOWNIE — a bywa nią hasło (A1). W polu „login” zapisano: „${poSekrecie[0]?.login}”. Nieistniejące konto ma być maskowane; istniejące zostaje dosłownie, bo to sedno pytania „kogo próbowano podszyć”.`
);
sprawdz(
  !(poSekrecie[0]?.login ?? "").includes(SEKRET.slice(0, 3)),
  `wartość nieistniejącego konta zostawiła w dzienniku swój początek: „${poSekrecie[0]?.login}”. W pole loginu trafia czasem hasło (A1) — wtedy każdy zachowany znak jest fragmentem sekretu na 90 dni, wbrew zdaniu polityki „Nie zapisujemy haseł ani ich fragmentów”. Od 2026-09-05 nie zostawiamy znaku z ŻADNEJ wartości, która nie wskazuje konta — kształt jej nie odróżnia`
);

/*
 * DRUGA POŁOWA A1 — WARTOŚĆ O KSZTAŁCIE LOGINU TEŻ NIE ZOSTAWIA ZNAKU.
 *
 * TA ASERCJA WYMAGAŁA WCZEŚNIEJ WYCIEKU, i to jest jej cała historia.
 * Brzmiała: „wartość mogąca być loginem MUSI zostawić początek, bo po to ta
 * kolumna istnieje" — czyli bramka pilnowała, żeby prefiks przetrwał. Tyle że
 * kryterium „może być loginem" to `sanitize_user( $x, true ) === $x`, które
 * przepuszcza KAŻDE hasło bez znaku specjalnego. Zmierzone przez prawdziwy
 * formularz: `Haslo123` → `Has…(8 znaków)`, `MojeTajneHaslo2026` →
 * `Moj…(18 znaków)`. Bramka broniła usterki — druga taka w tym repozytorium.
 *
 * Od 2026-09-05 wartość, która NIE wskazuje istniejącego konta, nie zostawia
 * ANI JEDNEGO znaku, niezależnie od kształtu. Wartości dowodowej pilnuje
 * asercja niżej: istniejące konto dalej zapisujemy dosłownie — i tam sekretu
 * z definicji nie ma. Wzorzec ataku na loginy NIEISTNIEJĄCE oddajemy
 * świadomie: nie da się po kształcie odróżnić loginu od hasła.
 *
 * Kontrprzykład jest w tej samej asercji: wiersz MUSI powstać i MUSI nieść
 * długość. Inaczej „nie ma prefiksu" przechodziłoby też wtedy, gdyby dziennik
 * przestał zapisywać cokolwiek.
 */
const WZORZEC_ATAKU = "administrator_probny";
const przedWzorcem = maxId();
await gosc2().pobierz("/wp-login.php");
await gosc2().pobierz("/wp-login.php", {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    log: WZORZEC_ATAKU,
    pwd: "nieistotne",
    "wp-submit": "Zaloguj",
    testcookie: "1",
  }).toString(),
});
const poWzorcu = nowszeNiz(przedWzorcem);
sprawdz(
  poWzorcu.length === 1 && (poWzorcu[0]?.login ?? "").includes(String(WZORZEC_ATAKU.length)),
  `próba na NIEISTNIEJĄCE konto nie zostawiła w dzienniku wiersza z długością wartości: „${poWzorcu[0]?.login}” (wierszy: ${poWzorcu.length}) — bez tego asercja „nie ma prefiksu" przechodziłaby także przy martwym dzienniku`
);
sprawdz(
  !(poWzorcu[0]?.login ?? "").includes(WZORZEC_ATAKU.slice(0, 3)),
  `wartość o kształcie loginu zostawiła w dzienniku swój początek: „${poWzorcu[0]?.login}”. Kształt NIE odróżnia loginu od hasła: „Haslo123” przechodzi sanitize_user w trybie ścisłym tak samo jak „admin”, więc każdy zachowany znak bywa fragmentem sekretu na 90 dni, wbrew zdaniu polityki „Nie zapisujemy haseł ani ich fragmentów”`
);

/* A1, druga strona: ISTNIEJĄCE konto zapisujemy dosłownie. */

const przedIstniejacym = maxId();
await gosc2().pobierz("/wp-login.php", {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ log: "admin", pwd: "na-pewno-zle", "wp-submit": "Zaloguj", testcookie: "1" }).toString(),
});
sprawdz(
  nowszeNiz(przedIstniejacym)[0]?.login === "admin",
  "nieudana próba na ISTNIEJĄCE konto została zamaskowana — maskowanie ma dotyczyć wyłącznie wartości, które kontem nie są, inaczej dziennik traci wartość dowodową"
);

/*
 * A2 — dedup musi pytać o KONTO. Bez tego sesja jednego konta i wp_login
 * drugiego (jeden proces PHP: WP-CLI, nasze bramki, cudza wtyczka logująca
 * programowo) dawały JEDEN wiersz: logowanie drugiego konta znikało, a wpis
 * pierwszego dostawał cudzą etykietę „formularz”.
 */
const przedDwomaKontami = maxId();
phpEval(
  '$k = get_user_by( "login", "klient-test" ); $a = get_user_by( "login", "admin" );' +
    ' do_action( "set_logged_in_cookie", "c", 0, 0, $k->ID, "logged_in", "t" );' +
    ' do_action( "wp_login", $a->user_login, $a ); echo "ok";'
);
const dwaKonta = nowszeNiz(przedDwomaKontami);
sprawdz(
  dwaKonta.length === 2,
  `sesja jednego konta i logowanie drugiego w tym samym procesie dały ${dwaKonta.length} wierszy zamiast dwóch (A2) — jedno zdarzenie zniknęło z dziennika bez śladu, a dziennik, który cicho gubi zdarzenia, jest gorszy niż brak dziennika`
);
sprawdz(
  dwaKonta[0]?.zrodlo === "sesja" && dwaKonta[1]?.zrodlo === "formularz",
  `wiersz jednego konta przejął źródło drugiego (A2): dostałem „${dwaKonta[0]?.zrodlo}” i „${dwaKonta[1]?.zrodlo}”`
);

/*
 * A4 — ArgumentCountError powstaje PRZY WYWOŁANIU, więc try w ciele metody
 * nigdy się nie zaczyna i wyjątek wychodzi z do_action() prosto do kasy.
 * Mierzymy NASZ handler (cudze na tym haku mają tę samą słabość — Tutor).
 */
sprawdz(
  phpEval(
    /*
     * Zdejmujemy CUDZE callbacki z OBU haków — inaczej mierzylibyśmy
     * cudzą odporność zamiast własnej. Tutor ma na `wp_login` dokładnie
     * tę samą słabość (`TUTOR\User::update_user_last_login()`), więc bez
     * tego kroku test padał na nie naszym kodzie.
     */
    'global $wp_filter; foreach ( array( "wp_login", "set_logged_in_cookie" ) as $hak ) {' +
      ' if ( ! isset( $wp_filter[$hak] ) ) continue;' +
      ' foreach ( $wp_filter[$hak]->callbacks as $p => $cbs ) { foreach ( $cbs as $i => $cb ) {' +
      ' $f = $cb["function"];' +
      ' $nasze = is_array( $f ) && is_string( $f[0] ) && str_starts_with( $f[0], "Aai_Monitor" );' +
      ' if ( ! $nasze ) unset( $wp_filter[$hak]->callbacks[$p][$i] ); } } }' +
      ' try { do_action( "wp_login" ); do_action( "set_logged_in_cookie", "x" ); echo "ok"; } catch ( Throwable $e ) { echo "wyjatek"; }'
  ).stdout.endsWith("ok"),
  "hak odpalony z mniejszą liczbą argumentów wywraca NASZ handler (A4) — ArgumentCountError powstaje przed wejściem do try, więc leci prosto do cudzego żądania; w kasie to HTTP 500 i przerwany zakup. Parametry mają mieć wartości domyślne."
);

/*
 * A5 — sanitize_text_field() ucinał user-agenta na pierwszym „<” i zjadał
 * sekwencje %XX, czyli kasował dokładnie ten przypadek, dla którego ta
 * kolumna istnieje: narzędzie wstrzykujące ładunek w UA.
 */
const UA_ZLOSLIWY = "Mozilla/5.0 <script>alert(1)</script> Bot%20scan";
const przedUa = maxId();
await gosc2().pobierz("/wp-login.php", {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": UA_ZLOSLIWY },
  body: new URLSearchParams({ log: "nie-ma-konta-ua", pwd: "x", "wp-submit": "Zaloguj", testcookie: "1" }).toString(),
});
sprawdz(
  nowszeNiz(przedUa)[0]?.agent === UA_ZLOSLIWY,
  `user-agent zapisany jako „${nowszeNiz(przedUa)[0]?.agent}” zamiast całego łańcucha (A5) — przy próbie włamania liczy się DOKŁADNY ciąg, bo to on odróżnia narzędzie od przeglądarki`
);

/*
 * A11 — cudzy callback rzucający na NIŻSZYM priorytecie przerywa
 * do_action() przed nami i zdarzenie nie trafia do dziennika. Priorytet 1
 * zamyka to okno dla wszystkiego, co nie wchodzi jeszcze wcześniej.
 */
const przedCudzym = maxId();
phpEval(
  'add_action( "set_logged_in_cookie", function () { throw new RuntimeException( "cudza wtyczka" ); }, 5 );' +
    ' try { do_action( "set_logged_in_cookie", "c", 0, 0, 1, "logged_in", "t" ); } catch ( Throwable $e ) {} echo "ok";'
);
sprawdz(
  nowszeNiz(przedCudzym).length === 1,
  "cudzy callback padający na priorytecie 5 zabrał nam zdarzenie (A11) — dziennik bezpieczeństwa ma zapisywać PRZED wszystkimi, więc haki idą z priorytetem 1"
);

/* N3 — auto-login z kasy: źródło „sesja”, bez wp_login (F3). */
const przedKasa = maxId();
phpEval("$u = get_user_by( 'login', 'klient-test' ); wc_set_customer_auth_cookie( $u->ID ); echo 'ok';");
const poKasie = nowszeNiz(przedKasa);
sprawdz(
  poKasie.length === 1 && poKasie[0]?.zrodlo === "sesja",
  `auto-login z kasy nie zostawił wiersza ze źródłem „sesja” (dostałem ${poKasie.length} wierszy, źródło „${poKasie[0]?.zrodlo}”). Zmierzone przy pisaniu T2: wc_set_customer_auth_cookie odpala WYŁĄCZNIE set_logged_in_cookie, bez wp_login — więc bez tego haka ścieżka KAŻDEGO nowego klienta jest dla dziennika niewidzialna (N3, F3).`
);

/* N4 + N15 — awaria zapisu nie wywraca cudzego żądania, ale jest głośna.
 *
 * ROZGRANICZENIE, żeby ten blok nie obiecywał więcej, niż mierzy:
 * `catch ( Throwable )` w handlerach pilnuje STRAŻNIK (reguła 9,
 * z mutacją „łapie tylko Exception”), bo $wpdb->insert na nieistniejącej
 * tabeli zwraca false, a nie rzuca. Tutaj mierzymy SKUTEK, o który
 * w N4 chodzi: przy uszkodzonym dzienniku logowanie ma dalej działać,
 * a awaria ma być widoczna (N15) zamiast zamieniać się w pustą listę.
 */
const tabelaLogowan = phpEval("echo Aai_Monitor_Tabele::tabela( 'logowania' );").stdout;
let uszkodzona = false;
try {
  wp("db", "query", `RENAME TABLE \`${tabelaLogowan}\` TO \`${tabelaLogowan}_smoke_schowana\``);
  uszkodzona = true;

  const przyAwarii = sesja();
  sprawdz(
    await przyAwarii.zaloguj("klient-test", HASLA.WP_KLIENT_HASLO),
    "przy USZKODZONYM dzienniku logowanie przestało działać (N4). Monitoring ma prawo nie zapisać zdarzenia; nie ma prawa zepsuć cudzego żądania — a przy sesji z kasy to samo żądanie jest zakupem (F11)."
  );

  const kontrolaAwarii = wp("aai-monitor", "sprawdz");
  sprawdz(
    kontrolaAwarii.kod !== 0,
    "przy uszkodzonym dzienniku kontrola dalej mówi „w porządku” (N15). Pusty ekran znaczyłby wtedy „nikt nie próbował się włamać” — fałszywy negatyw na jedynym ekranie, który ma ostrzegać."
  );
  sprawdz(
    /brak tabel|logowania/.test(kontrolaAwarii.stdout + kontrolaAwarii.stderr),
    "kontrola świeci na czerwono, ale nie mówi, CZEGO brakuje — komunikat ma prowadzić do naprawy, nie tylko alarmować"
  );
} finally {
  if (uszkodzona) {
    wp("db", "query", `RENAME TABLE \`${tabelaLogowan}_smoke_schowana\` TO \`${tabelaLogowan}\``);
    wp("aai-monitor", "wyczysc-blad");
  }
}
sprawdz(
  wp("aai-monitor", "sprawdz").kod === 0,
  "po przywróceniu tabeli kontrola dalej świeci na czerwono — smoke zostawiłby środowisko w stanie alarmu"
);

/* ── 10. RUCH: pełna ścieżka beaconu, sito i limiter (T3) ───────────── */

/*
 * KAŻDE SPRAWDZENIE PYTA O WIERSZ, NIGDY O KOD ODPOWIEDZI. Endpoint
 * odpowiada 204 na przyjęcie i na odrzut (żeby nie dawać sondy), więc
 * kod HTTP nie niesie tu żadnej informacji — a przy jednej z pułapek
 * (akcja schowana w ciele) sukcesem wygląda właśnie HTTP 200.
 */

const SCIEZKA_A = "/szkolenia/";
const SCIEZKA_B = "/szkolenia/jak-korzystac-z-claude/";
const SESJA_TESTOWA = "0123456789abcdef0123456789abcdef";
const AKCJA = "aai_monitor_wizyta";

const podpisz = (sciezka, bramka = false) =>
  phpEval(`echo Aai_Monitor_Podpis::podpisz('${sciezka}', ${bramka ? "true" : "false"});`).stdout.trim();

/*
 * Identyfikator ODSŁONY — od naprawy B1 każdy beacon go niesie, a UNIQUE
 * w bazie robi z niego regułę „jedna odsłona, jeden wiersz”. Domyślnie
 * LOSOWY, bo dwa beacony z tym samym identyfikatorem to CELOWY przypadek
 * (uzupełnienie czasu), a nie stan domyślny — gdyby był stały, blok sita
 * mierzyłby uzupełnianie jednego wiersza zamiast wstawiania nowych.
 */
let licznikOdslon = 0;
const nowaOdslona = () => (licznikOdslon++).toString(16).padStart(8, "0") + "cafe".repeat(6);
const ileWizyt = () =>
  Number(phpEval("global $wpdb; echo (int) $wpdb->get_var( 'SELECT COUNT(*) FROM ' . Aai_Monitor_Tabele::tabela('wizyty') );").stdout);

async function beacon({
  sciezka = SCIEZKA_A,
  podpis = null,
  sesja = SESJA_TESTOWA,
  odslona = null,
  bramka = false,
  trwanie = 5000,
  wiek = 60000,
  typ = "application/json",
  origin = ADRES,
  wypelniacz = "",
  akcjaWQuery = true,
  ciastka = "",
} = {}) {
  const ladunek = {
    odslona: odslona ?? nowaOdslona(),
    sciezka,
    podpis: podpis ?? podpisz(sciezka, bramka),
    bramka: bramka ? 1 : 0,
    sesja,
    trwanie_ms: trwanie,
    wiek_ms: wiek,
  };
  if (!akcjaWQuery) ladunek.action = AKCJA;
  if (wypelniacz) ladunek.x = wypelniacz;
  const naglowki = { "content-type": typ, connection: "close" };
  if (origin) naglowki.origin = origin;
  if (ciastka) naglowki.cookie = ciastka;
  const odp = await fetch(`${ADRES}/wp-admin/admin-post.php${akcjaWQuery ? `?action=${AKCJA}` : ""}`, {
    method: "POST",
    headers: naglowki,
    body: JSON.stringify(ladunek),
    redirect: "manual",
  });
  return odp.status;
}

/* 10a. BEACON KONTROLNY NA OTWARCIE bloku — bez niego całe „bez zmian”
 * niżej przechodziłoby także na martwym endpoincie (BLAD-022). */
{
  const przed = ileWizyt();
  await beacon();
  sprawdz(ileWizyt() === przed + 1, "poprawny beacon nie utworzył wiersza — dalsze sprawdzenia sita byłyby ślepe");
}

/* 10b. SITO: każdy zły beacon jest poprawny POZA JEDNYM POLEM. */
const odrzuty = [
  ["ciało jako text/plain (F20 — ten typ przechodzi cross-origin)", { typ: "text/plain" }],
  ["obce Origin", { origin: "http://zly.example" }],
  ["Origin: null (piaskownicowana ramka)", { origin: "null" }],
  ["brak Origin i Referera", { origin: "" }],
  ["podpis nie pasuje do ścieżki", { podpis: "0".repeat(32) }],
  ["ścieżka podmieniona po podpisaniu (zatrucie listy stron)", { sciezka: "/zmyslona-sciezka/", podpis: null, sesja: SESJA_TESTOWA }],
  ["sesja krótsza o znak", { sesja: SESJA_TESTOWA.slice(0, 31) }],
  ["identyfikator odsłony krótszy o znak", { odslona: SESJA_TESTOWA.slice(0, 31) }],
  ["brak identyfikatora odsłony", { odslona: "" }],
  ["flaga bramki podniesiona po podpisaniu (fałszywe odbicie)", { bramka: true, podpis: null }],
  ["ciało o bajt ponad sufit", { wypelniacz: "y".repeat(1025) }],
];
for (const [opis, opcje] of odrzuty) {
  const przed = ileWizyt();
  // Ścieżka podmieniona: podpisujemy JEDNĄ, wysyłamy DRUGĄ.
  if (opcje.sciezka === "/zmyslona-sciezka/") opcje.podpis = podpisz(SCIEZKA_A);
  // Flaga bramki jedzie w PODPISYWANYM materiale, więc jej podniesienie
  // po podpisaniu ma unieważnić podpis: podpisujemy bez flagi, wysyłamy z nią.
  if (opcje.bramka === true && opcje.podpis === null) opcje.podpis = podpisz(SCIEZKA_A, false);
  const kod = await beacon(opcje);
  sprawdz(ileWizyt() === przed, `sito przepuściło beacon, którego nie powinno: ${opis}`);
  sprawdz(kod === 204, `odrzut zdradził się kodem odpowiedzi (${kod}) przy: ${opis} — odrzut ma być nieodróżnialny od przyjęcia`);
}

/* 10c. DWA SUFITY, KTÓRE ROBIĄ CO INNEGO (A5 z przeglądu T3).
 *
 * Czas CZYTANIA ponad sufit jest przycinany — uśpiona karta to nie atak,
 * a wizyta ma zostać razem ze swoją ścieżką. WIEK odsłony ponad sufit jest
 * ODRZUCANY, bo przycięcie wieku nie jest niedokładnością, tylko
 * ZMYŚLENIEM GODZINY WEJŚCIA: przed naprawą karta zostawiona na noc
 * zapisywała wejście „4 h temu” (zmierzone co do sekundy), więc wizyta
 * lądowała w złej godzinie, a przy oknie „dziś” w złej dobie. */
{
  const przed = ileWizyt();
  await beacon({ trwanie: 9 * 60 * 60 * 1000, wiek: 9 * 60 * 60 * 1000 });
  sprawdz(ileWizyt() === przed + 1, "beacon z czasem czytania ponad sufit został ODRZUCONY — ma być przycięty (uśpiona karta to nie atak)");
  const wiersz = phpEval(
    "global $wpdb; $w = Aai_Monitor_Tabele::tabela('wizyty');" +
      " $r = $wpdb->get_row( \"SELECT trwanie_ms, TIMESTAMPDIFF( MINUTE, wejscie, UTC_TIMESTAMP() ) AS wiek_min FROM `{$w}` ORDER BY id DESC LIMIT 1\" );" +
      " echo (int) $r->trwanie_ms, ':', (int) $r->wiek_min;"
  ).stdout.trim().split(":");
  sprawdz(Number(wiersz[0]) === 4 * 60 * 60 * 1000, `czas czytania nie został przycięty do sufitu 4 h (zapisano ${wiersz[0]} ms)`);
  // 9 h to PRAWDZIWY wiek odsłony i ma taki zostać. Dopuszczamy minutę
  // luzu na czas przelotu, nie więcej — przed naprawą wychodziło 240 min.
  sprawdz(
    Math.abs(Number(wiersz[1]) - 540) <= 1,
    `moment wejścia został ZMYŚLONY: wiersz mówi ${wiersz[1]} minut wstecz zamiast 540 — sufit przesunął wejście zamiast przyciąć czas czytania (A5)`
  );

  const przedOdrzutem = ileWizyt();
  await beacon({ trwanie: 1000, wiek: 31 * 24 * 60 * 60 * 1000 });
  sprawdz(
    ileWizyt() === przedOdrzutem,
    "beacon z wiekiem ponad 30 dni utworzył wiersz — jego moment wejścia byłby zmyślony, a takiego znacznika czasu wolimy nie mieć wcale"
  );
}

/* 10c2. JEDNA ODSŁONA = JEDEN WIERSZ, mimo wielu beaconów (B1).
 *
 * To jest cała naprawa B1 zmierzona od strony bazy: skrypt wysyła teraz
 * przy KAŻDYM zniknięciu karty, a nie raz, więc bez UNIQUE na `odslona`
 * czytelnik przełączający zakładki produkowałby tyle „odsłon”, ile razy
 * spojrzał gdzie indziej. Sprawdzamy też, że czas rośnie i NIE COFA SIĘ:
 * beacony nie mają obiecanej kolejności dostarczenia. */
{
  const przed = ileWizyt();
  const jedna = nowaOdslona();
  await beacon({ odslona: jedna, trwanie: 1000, wiek: 2000 });
  await beacon({ odslona: jedna, trwanie: 7000, wiek: 9000 });
  await beacon({ odslona: jedna, trwanie: 500, wiek: 600 });
  sprawdz(ileWizyt() === przed + 1, `trzy beacony jednej odsłony dały ${ileWizyt() - przed} wierszy zamiast 1 — odsłony byłyby zawyżone o każde przełączenie karty (B1)`);
  const czas = Number(
    phpEval(
      "global $wpdb; $w = Aai_Monitor_Tabele::tabela('wizyty');" +
        ` echo (int) $wpdb->get_var( $wpdb->prepare( "SELECT trwanie_ms FROM \`{$w}\` WHERE odslona = %s", '${jedna}' ) );`
    ).stdout
  );
  sprawdz(czas === 7000, `czas odsłony to ${czas} ms zamiast 7000 — spóźniony beacon z mniejszą liczbą cofnął już zapisany czas`);
}

/* 10c3. ODBICIA NA BRAMCE LOGOWANIA LICZĄ SIĘ OSOBNO (A6).
 *
 * Gość na płatnej lekcji dostaje HTTP 200 i pełną stronę — z zaproszeniem
 * do logowania zamiast treści. Bez tego rozróżnienia „najczęściej czytane
 * strony” pokazywałyby lekcje, których nikt nie przeczytał. */
{
  const przed = ileWizyt();
  await beacon({ sciezka: SCIEZKA_B, bramka: true, trwanie: 3000, wiek: 4000 });
  sprawdz(ileWizyt() === przed + 1, "beacon z bramki nie utworzył wiersza — odbicia mają ZOSTAĆ w tabeli, tylko liczyć się osobno");
  const stan = phpEval(
    "global $wpdb; $w = Aai_Monitor_Tabele::tabela('wizyty');" +
      " echo (int) $wpdb->get_var( \"SELECT bramka FROM `{$w}` ORDER BY id DESC LIMIT 1\" );"
  ).stdout.trim();
  sprawdz(stan === "1", `wiersz z bramki ma bramka=${stan} zamiast 1 — flaga nie dojechała z beaconu do kolumny`);

  const ruch = phpEval(
    "$r = Aai_Monitor_Odczyt::ruch( 1 );" +
      " $czytane = 0; foreach ( $r['strony'] as $s ) { $czytane += (int) $s['odslony']; }" +
      " $odbicia = 0; foreach ( $r['strony_bramki'] as $s ) { $odbicia += (int) $s['odslony']; }" +
      " echo (int) $r['bramka'], ':', $czytane, ':', $odbicia;"
  ).stdout.trim().split(":");
  sprawdz(Number(ruch[0]) >= 1, "ekran nie liczy odsłon zatrzymanych na bramce — właściciel czytałby odbicia jako czytanie");
  sprawdz(Number(ruch[2]) >= 1, "lista „zatrzymane na bramce” jest pusta mimo odsłony z bramki — informacja o odbiciach przepadła");
}

/* 10c4. LICZBA PRZYSŁANA JAKO ŁAŃCUCH NIE STAJE SIĘ CICHO ZEREM (A10).
 *
 * Zmierzone przed naprawą: `"trwanie_ms":"5000"` dawało wiersz z czasem 0
 * i wejściem „przed chwilą”. Czyli pełna liczba odsłon przy wyzerowanym
 * czasie — wartość FAŁSZYWA, nie brakująca, i nic się przy tym nie
 * zapalało. Nasz skrypt wysyła liczby, więc to jest tama na przyszłość:
 * jedna zmiana po stronie klienta zamieniłaby cały pomiar czasu w zera. */
{
  const odslona = nowaOdslona();
  const podpis = podpisz(SCIEZKA_A);
  const ladunek = {
    odslona,
    sciezka: SCIEZKA_A,
    podpis,
    bramka: 0,
    sesja: SESJA_TESTOWA,
    trwanie_ms: "5000",
    wiek_ms: "9000",
  };
  await fetch(`${ADRES}/wp-admin/admin-post.php?action=${AKCJA}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: ADRES, connection: "close" },
    body: JSON.stringify(ladunek),
    redirect: "manual",
  });
  const czas = Number(
    phpEval(
      "global $wpdb; $w = Aai_Monitor_Tabele::tabela('wizyty');" +
        ` echo (int) $wpdb->get_var( $wpdb->prepare( "SELECT trwanie_ms FROM \`{$w}\` WHERE odslona = %s", '${odslona}' ) );`
    ).stdout
  );
  sprawdz(czas === 5000, `czas przysłany jako łańcuch zapisał się jako ${czas} ms zamiast 5000 — wiersz powstaje, ale niesie nieprawdę (A10)`);
}

/* 10c4b. SITO POCHODZENIA ZAWODZI NA ZAMKNIĘTO (A8).
 *
 * Sprawdzenie „Origin: null jest odrzucany” w bloku sita wyżej przechodzi
 * także BEZ tej naprawy — i to jest ważne, żeby wiedzieć: dowodzi ono
 * tylko, że `null` nie równa się naszemu adresowi. Wada z A8 budzi się
 * dopiero, gdy `home_url()` NIE MA HOSTA: `zrodlo()` oddaje wtedy pusty
 * łańcuch po OBU stronach porównania i obce żądanie przechodzi jako swoje.
 * Pytamy więc o dokładnie ten warunek, podstawiając adres witryny —
 * przez filtr, w jednym żądaniu CLI, bez dotykania instalacji. */
{
  const wynik = phpEval(
    "add_filter( 'home_url', function () { return '/'; }, 9999 );" +
      " $m = new ReflectionMethod( 'Aai_Monitor_Wizyty', 'pochodzenie_pasuje' ); $m->setAccessible( true );" +
      " $_SERVER['HTTP_ORIGIN'] = 'null'; $a = $m->invoke( null );" +
      " $_SERVER['HTTP_ORIGIN'] = 'http://zly.example'; $b = $m->invoke( null );" +
      " echo ( $a ? 'null-przeszlo' : '' ), ( $b ? ',obce-przeszlo' : '' );"
  ).stdout.trim();
  sprawdz(
    wynik === "",
    `przy witrynie bez hosta sito pochodzenia przepuszcza obce żądania (${wynik}) — zawodzi „na otwarto”, a ma na zamknięto: nie wiedząc, jaka jest nasza witryna, nie wpuszczamy nikogo (A8)`
  );
}

/* 10c5. HANDLER NA CUDZYM HAKU NIE WYWRACA SIĘ NA SAMYM WYWOŁANIU (A9).
 *
 * `TypeError` z niezgodnego argumentu powstaje PRZY WYWOŁANIU, więc nie
 * łapie go żaden `try` w środku metody — a `admin_enqueue_scripts`
 * odpala cudzy kod, jak chce. Pytamy WPROST o naszą metodę, bo na tym
 * haku wiszą też Woo i rdzeń: przy `do_action` ich wyjątki wyglądałyby
 * jak nasze (ta sama pułapka co pomiar równoległy z własną pracą). */
{
  const wynik = phpEval(
    "$cb = array( 'Aai_Monitor_Ekran', 'zasoby' ); $zle = array();" +
      " foreach ( array( 'pominiety' => '__POMIN__', 'null' => null, 'liczba' => 42, 'tablica' => array() ) as $opis => $arg ) {" +
      "   try { if ( '__POMIN__' === $arg ) { call_user_func( $cb ); } else { call_user_func( $cb, $arg ); } }" +
      "   catch ( Throwable $e ) { $zle[] = $opis . ':' . get_class( $e ); } }" +
      " echo implode( ',', $zle );"
  ).stdout.trim();
  sprawdz(wynik === "", `nasz handler na admin_enqueue_scripts wywraca się na wywołaniu (${wynik}) — cudza wtyczka położyłaby cały kokpit (A9)`);
}

/* 10c6. SUFIT LICZBY WIERSZY ŚCINA NAJSTARSZE (A2, decyzja właściciela).
 *
 * Bez niego jeden nieuwierzytelniony klient mieści się w limiterze i pisze
 * ~430 000 wierszy na dobę, a retencja po WIEKU ich nie rusza — wszystkie
 * są młodsze niż 400 dni. Nie wstawiamy ćwierć miliona wierszy: rozpychamy
 * AUTO_INCREMENT, bo sufit i tak mierzy ROZPIĘTOŚĆ identyfikatorów (pełny
 * `COUNT(*)` przy każdym beaconie byłby droższy niż sam zapis).
 *
 * TABELA WRACA DO STANU ZASTANEGO i to NIE jest ostrożność na wyrost.
 * Pierwsza wersja tego bloku nie robiła kopii, a sufit z definicji ścina
 * NAJSTARSZE wiersze — więc kasowała wszystko, co powstało wcześniej w tym
 * przebiegu, i wszystko, co zastała na instalacji. Skutek uboczny był
 * gorszy niż sama strata: końcowy rachunek sumienia przestawał cokolwiek
 * znaczyć, bo tabela była już pusta. Zmierzone — po zdjęciu sprzątania
 * wizyt bramka DALEJ świeciła na zielono. Ta sama klasa co znalezisko
 * z P5: rachunek liczący własne ślady nie widzi, że zabrał cudze.
 */
{
  const kopia = phpEval(
    "global $wpdb; $t = Aai_Monitor_Tabele::tabela('wizyty');" +
      " $wpdb->query( \"DROP TABLE IF EXISTS `{$t}_kopia_smoke`\" );" +
      " $wpdb->query( \"CREATE TABLE `{$t}_kopia_smoke` LIKE `{$t}`\" );" +
      " $wpdb->query( \"INSERT INTO `{$t}_kopia_smoke` SELECT * FROM `{$t}`\" );" +
      " echo (int) $wpdb->get_var( \"SELECT COUNT(*) FROM `{$t}_kopia_smoke`\" );"
  ).stdout.trim();
  sprawdz(/^\d+$/.test(kopia), `nie udało się odłożyć kopii tabeli ruchu („${kopia}”) — bez niej ten pomiar skasowałby zastane wiersze`);

  /*
   * DWIE POŁOWY, BO PIERWSZA WERSJA TEGO POMIARU WYMAGAŁA KASOWANIA DANYCH.
   *
   * Sprawdzała, że po skoku AUTO_INCREMENT zostaje sam nowy wiersz — czyli
   * utrwalała zachowanie, w którym DZIURA w identyfikatorach kasuje wiersze,
   * których wcale nie ma za dużo. Zmierzone 2026-09-05 na dzienniku logowań:
   * 41 wierszy, MAX(id) = 334, AUTO_INCREMENT = 200 001 po wcześniejszym
   * pomiarze — pierwszy zapis po takim stanie skasował WSZYSTKO, łącznie
   * z dowodowymi logowaniami właściciela. Bramka broniłaby tego zachowania.
   *
   * Mierzymy więc oba warunki osobno.
   */

  // (a) DZIURA W IDENTYFIKATORACH NIE KASUJE NICZEGO, gdy wierszy jest mało.
  const poDziurze = phpEval(
    "global $wpdb; $t = Aai_Monitor_Tabele::tabela('wizyty');" +
      " $sufit = Aai_Monitor_Tabele::SUFIT_WIERSZY_WIZYT;" +
      " Aai_Monitor_Zapis::dodaj_wizyte( array( 'odslona' => str_repeat('a',32), 'sesja' => str_repeat('1',32), 'sciezka' => '/sufit-stary/', 'trwanie_ms' => 1000, 'wiek_ms' => 2000 ) );" +
      " $stary = (int) $wpdb->get_var( \"SELECT MAX(id) FROM `{$t}`\" );" +
      " $skok = $stary + $sufit + 100; $wpdb->query( \"ALTER TABLE `{$t}` AUTO_INCREMENT = {$skok}\" );" +
      " Aai_Monitor_Zapis::dodaj_wizyte( array( 'odslona' => str_repeat('b',32), 'sesja' => str_repeat('2',32), 'sciezka' => '/sufit-nowy/', 'trwanie_ms' => 1000, 'wiek_ms' => 2000 ) );" +
      " echo (int) $wpdb->get_var( \"SELECT COUNT(*) FROM `{$t}` WHERE sciezka = '/sufit-stary/'\" );"
  ).stdout.trim();
  sprawdz(
    poDziurze === "1",
    `wiersz sprzed skoku AUTO_INCREMENT ZNIKNĄŁ (zostało go ${poDziurze}) — sufit skasował dane po samej DZIURZE w identyfikatorach, a nie po liczbie wierszy. Tak przepadły dowodowe logowania właściciela.`
  );

  // (b) PRAWDZIWY NADMIAR JEST ŚCINANY. Sufitu produkcyjnego (ćwierć miliona
  //     wierszy) nie da się osiągnąć w bramce, więc wołamy tę samą prywatną
  //     metodę refleksją, z sufitem 1 — mierzymy LOGIKĘ, nie stałą.
  const poNadmiarze = phpEval(
    "global $wpdb; $t = Aai_Monitor_Tabele::tabela('wizyty');" +
      " $m = new ReflectionMethod( 'Aai_Monitor_Zapis', 'przytnij_liczbe' ); $m->setAccessible( true );" +
      " $ile = (int) $m->invoke( null, 'wizyty', 1 );" +
      " $zostalo = (int) $wpdb->get_var( \"SELECT COUNT(*) FROM `{$t}`\" );" +
      " echo $ile . '/' . $zostalo;"
  ).stdout.trim();
  sprawdz(
    /^\d+\/1$/.test(poNadmiarze) && poNadmiarze !== "0/1",
    `sufit nie ściął nadmiaru przy suficie 1 (dostałem „${poNadmiarze}", oczekiwałem „N/1" z N > 0) — tabela ruchu rosłaby bez granicy, a kafelki ekranu liczą ją bez okna czasu (A2)`
  );

  // Przywracamy stan zastany CO DO WIERSZA, razem z licznikiem
  // identyfikatorów — inaczej kolejne bloki dostawałyby id z kosmosu.
  const przywrocone = phpEval(
    "global $wpdb; $t = Aai_Monitor_Tabele::tabela('wizyty');" +
      " $wpdb->query( \"DELETE FROM `{$t}`\" );" +
      " $wpdb->query( \"INSERT INTO `{$t}` SELECT * FROM `{$t}_kopia_smoke`\" );" +
      " $wpdb->query( \"DROP TABLE `{$t}_kopia_smoke`\" );" +
      " $max = (int) $wpdb->get_var( \"SELECT COALESCE(MAX(id),0) FROM `{$t}`\" ) + 1;" +
      " $wpdb->query( \"ALTER TABLE `{$t}` AUTO_INCREMENT = {$max}\" );" +
      " echo (int) $wpdb->get_var( \"SELECT COUNT(*) FROM `{$t}`\" );"
  ).stdout.trim();
  sprawdz(
    przywrocone === kopia,
    `po pomiarze sufitu tabela ruchu ma ${przywrocone} wierszy zamiast zastanych ${kopia} — pomiar zabrał cudze dane`
  );
}

/* 10c7. BEACON ADMINISTRATORA NIE TWORZY WIERSZA (D3, B4).
 *
 * Skryptu administrator nie dostaje (blok 10h), ale to za mało: beacon
 * może przyjść z karty otwartej PRZED zalogowaniem. Do przeglądu T3 tej
 * gałęzi nie mierzyło NIC — bramka nigdy nie wysyłała beaconu jako
 * administrator, a mutacja kasująca ją przechodziła też u strażnika. */
{
  const adminBeacon = sesja();
  const zalogowany = await adminBeacon.zaloguj("admin", HASLA.WP_ADMIN_HASLO ?? "");
  sprawdz(zalogowany, "nie udało się zalogować administratora — sprawdzenie B4 nie ma czego mierzyć");
  if (zalogowany) {
    const przed = ileWizyt();
    const kod = await beacon({ ciastka: adminBeacon.naglowekCiastek() });
    sprawdz(ileWizyt() === przed, "beacon administratora utworzył wiersz — jego odsłony mają NIE być liczone (D3)");
    sprawdz(kod === 204, `odrzut beaconu administratora zdradził się kodem ${kod} — ma być nieodróżnialny od przyjęcia`);
  }
}

/* 10c8. CIAŁO PONAD SUFIT BEZ DEKLARACJI DŁUGOŚCI (B6).
 *
 * Blok sita wyżej mierzy gałąź „za duży content-length” — czyli
 * DEKLARACJĘ klienta. Prawdziwym zabezpieczeniem jest sufit przy odczycie
 * strumienia, a tamta gałąź go nie dotyka. Żądanie `Transfer-Encoding:
 * chunked` nie niesie deklaracji w ogóle: zmierzone, że DOCHODZI do PHP
 * (204). Piszemy je gniazdem, bo `fetch` nie wyśle żądania bez
 * `content-length`.
 *
 * CZEGO TEN POMIAR NIE DOWODZI — i to jest ważniejsze niż to, co dowodzi.
 * Zmierzone testem negatywnym: po zdjęciu odrzutu ciała ponad sufit
 * bramka DALEJ świeci na zielono, bo obcięte ciało przestaje być poprawnym
 * JSON-em i beacon i tak przepada. Sufit chroni więc PAMIĘĆ, a nie
 * poprawność — a pamięci nie da się zmierzyć z zewnątrz jednym żądaniem.
 * Tę połowę pilnuje strażnik (reguła 14: sufit MUSI stać przy `fread`
 * i po odczycie), sprawdzony dwiema mutacjami. Zostawiamy asercję
 * zachowania — ona dowodzi, że ta droga w ogóle jest zamknięta — i mówimy
 * wprost, gdzie leży jej granica. */
{
  const przed = ileWizyt();
  const ladunek = JSON.stringify({
    odslona: nowaOdslona(),
    sciezka: SCIEZKA_A,
    podpis: podpisz(SCIEZKA_A),
    bramka: 0,
    sesja: SESJA_TESTOWA,
    trwanie_ms: 1000,
    wiek_ms: 2000,
    x: "y".repeat(2000),
  });
  const adres = new URL(ADRES);
  const kod = await new Promise((gotowe) => {
    const gniazdo = net.connect(Number(adres.port || 80), adres.hostname, () => {
      gniazdo.write(
        `POST /wp-admin/admin-post.php?action=${AKCJA} HTTP/1.1\r\n` +
          `Host: ${adres.host}\r\ncontent-type: application/json\r\norigin: ${ADRES}\r\n` +
          "transfer-encoding: chunked\r\nconnection: close\r\n\r\n"
      );
      const bajty = Buffer.from(ladunek);
      for (let k = 0; k < bajty.length; k += 500) {
        const kawalek = bajty.subarray(k, k + 500);
        gniazdo.write(`${kawalek.length.toString(16)}\r\n`);
        gniazdo.write(kawalek);
        gniazdo.write("\r\n");
      }
      gniazdo.write("0\r\n\r\n");
    });
    gniazdo.once("data", (dane) => {
      gotowe(Number(String(dane).split(" ")[1] ?? 0));
      gniazdo.destroy();
    });
    gniazdo.once("error", () => gotowe(0));
  });
  sprawdz(kod === 204, `żądanie chunked dostało kod ${kod} zamiast 204 — jeśli to 400, serwer odrzucił je przed PHP i ten pomiar nie dotyka naszego sufitu`);
  sprawdz(
    ileWizyt() === przed,
    "ciało ponad sufit przeszło, bo nie zadeklarowało długości — sufit przy odczycie strumienia jest jedyną tamą na tej drodze (B6)"
  );
}

/* 10c9. PO WYŚCIGU O SÓL WSZYSCY PODPISUJĄ TĄ SAMĄ (A7) — I SÓL MIESZKA U NAS.
 *
 * Sól podpisu powstaje leniwie, przy pierwszym użyciu. Gdy dwa żądania
 * trafią w ten moment naraz, przegrany NIE MOŻE nadpisać soli zwycięzcy —
 * strony zwycięzcy są już w przeglądarkach i noszą podpisy liczone jego
 * wartością, a sito odrzuciłoby je w milczeniu (beacon odpowiada 204
 * zawsze). Do 0.5.0 sól leżała w `wp_options` wpisana surowym INSERT-em
 * do tabeli rdzenia, bo `add_option()` przy konflikcie nadpisuje; od 0.5.0
 * mieszka we WŁASNEJ tabeli `ustawienia` (AUD-ARCH-F1-001), a zapis idzie
 * przez warstwę zapisu i jest pusty przy konflikcie.
 *
 * ODTWORZENIE PRZEGRANEGO MUSI BYĆ WIERNE: najpierw zdejmujemy wiersz
 * soli z tabeli I starą opcję (inaczej `sol()` nie wejdzie w gałąź
 * tworzenia), dopiero potem zwycięzca wstawia swój wiersz, a nasz proces
 * próbuje wstawić własny. Na koniec przywracamy sól instalacji co do
 * znaku — inaczej unieważnilibyśmy podpisy stron wyrenderowanych
 * wcześniej w tym przebiegu. */
{
  const wynik = phpEval(
    "global $wpdb; $t = Aai_Monitor_Tabele::tabela('ustawienia'); $o = 'aai_monitor_sol_podpisu';" +
      " $orygTab = $wpdb->get_var( $wpdb->prepare( \"SELECT wartosc FROM `{$t}` WHERE klucz = %s\", 'sol_podpisu' ) );" +
      " $orygOpc = get_option( $o );" +
      " $wpdb->delete( $t, array( 'klucz' => 'sol_podpisu' ) ); delete_option( $o ); wp_cache_delete( 'alloptions', 'options' );" +
      " $wpdb->insert( $t, array( 'klucz' => 'sol_podpisu', 'wartosc' => 'SOL_ZWYCIEZCY' ) );" +
      " $m = new ReflectionMethod( 'Aai_Monitor_Podpis', 'sol' ); $m->setAccessible( true ); $uzyta = $m->invoke( null );" +
      " $wbazie = $wpdb->get_var( $wpdb->prepare( \"SELECT wartosc FROM `{$t}` WHERE klucz = %s\", 'sol_podpisu' ) );" +
      " $wopcji = get_option( $o, 'BRAK' );" +
      " $wpdb->delete( $t, array( 'klucz' => 'sol_podpisu' ) );" +
      " if ( is_string( $orygTab ) && '' !== $orygTab ) { $wpdb->insert( $t, array( 'klucz' => 'sol_podpisu', 'wartosc' => $orygTab ) ); }" +
      " if ( is_string( $orygOpc ) && '' !== $orygOpc ) { add_option( $o, $orygOpc, '', true ); } wp_cache_delete( 'alloptions', 'options' );" +
      " $poTab = $wpdb->get_var( $wpdb->prepare( \"SELECT wartosc FROM `{$t}` WHERE klucz = %s\", 'sol_podpisu' ) );" +
      " echo $uzyta, '|', $wbazie, '|', $wopcji, '|', ( $poTab === $orygTab && get_option( $o ) === $orygOpc ? 'przywrocona' : 'ZGUBIONA' );"
  ).stdout.trim().split("|");
  sprawdz(
    wynik[0] === "SOL_ZWYCIEZCY",
    `przegrany wyścig o sól podpisuje WŁASNĄ wartością zamiast tą z bazy — strony przez niego wyrenderowane niosłyby podpisy, których sito nie przyjmie, i nic by tego nie zgłosiło (A7)`
  );
  sprawdz(
    wynik[1] === "SOL_ZWYCIEZCY",
    "przegrany NADPISAŁ sól zwycięzcy — unieważnia tym podpisy wszystkich stron, które ten zdążył wysłać do przeglądarek (A7)"
  );
  sprawdz(
    wynik[2] === "BRAK",
    "tworzenie soli ZAPISAŁO coś do wp_options — od 0.5.0 sól mieszka wyłącznie w naszej tabeli `ustawienia`, a zapis do tabeli rdzenia to przełamana granica wtyczki (AUD-ARCH-F1-001)"
  );
  sprawdz(wynik[3] === "przywrocona", "pomiar nie oddał instalacji jej własnej soli — unieważniłby podpisy stron wyrenderowanych wcześniej");
}

/* 10c9b. MIGRACJA SOLI JEST FALLBACKIEM: wartość ze starej opcji jest
 * PRZEJMOWANA do tabeli CO DO ZNAKU, więc aktualizacja z 0.4.0 nie zmienia
 * soli ani na chwilę. Odtwarzamy instalację sprzed 0.5.0 (opcja jest, wiersza
 * w tabeli nie ma), wołamy sol() i sprawdzamy trzy rzeczy: użyta wartość =
 * stara, w tabeli = stara, a kontrola PRZED przejęciem świeci kodem 1 (stan po
 * aktualizacji ma być widoczny, nie domniemany), PO przejęciu kodem 0. */
{
  const wynik = phpEval(
    "global $wpdb; $t = Aai_Monitor_Tabele::tabela('ustawienia'); $o = 'aai_monitor_sol_podpisu';" +
      " $orygTab = $wpdb->get_var( $wpdb->prepare( \"SELECT wartosc FROM `{$t}` WHERE klucz = %s\", 'sol_podpisu' ) );" +
      " $orygOpc = get_option( $o );" +
      " $wpdb->delete( $t, array( 'klucz' => 'sol_podpisu' ) ); delete_option( $o ); wp_cache_delete( 'alloptions', 'options' );" +
      " add_option( $o, 'STARA_SOL_Z_0_4_0', '', true );" +
      " $przed = Aai_Monitor_Podpis::stan_soli();" +
      " $m = new ReflectionMethod( 'Aai_Monitor_Podpis', 'sol' ); $m->setAccessible( true ); $uzyta = $m->invoke( null );" +
      " $wbazie = $wpdb->get_var( $wpdb->prepare( \"SELECT wartosc FROM `{$t}` WHERE klucz = %s\", 'sol_podpisu' ) );" +
      " $po = Aai_Monitor_Podpis::stan_soli();" +
      " $wpdb->delete( $t, array( 'klucz' => 'sol_podpisu' ) ); delete_option( $o );" +
      " if ( is_string( $orygTab ) && '' !== $orygTab ) { $wpdb->insert( $t, array( 'klucz' => 'sol_podpisu', 'wartosc' => $orygTab ) ); }" +
      " if ( is_string( $orygOpc ) && '' !== $orygOpc ) { add_option( $o, $orygOpc, '', true ); } wp_cache_delete( 'alloptions', 'options' );" +
      " echo $uzyta, '|', $wbazie, '|', count( $przed ), '|', count( $po );"
  ).stdout.trim().split("|");
  sprawdz(wynik[0] === "STARA_SOL_Z_0_4_0", `po aktualizacji sol() użyło „${wynik[0]}” zamiast wartości ze starej opcji — strony wysłane przed migracją straciłyby ważne podpisy`);
  sprawdz(wynik[1] === "STARA_SOL_Z_0_4_0", `migracja wpisała do tabeli „${wynik[1]}” zamiast przejąć starą wartość co do znaku`);
  sprawdz(wynik[2] === "1", `kontrola przed przejęciem soli oddała ${wynik[2]} uwag zamiast 1 — stan „sól tylko w starej opcji” ma być WIDOCZNY, nie domniemany`);
  sprawdz(wynik[3] === "0", `kontrola po przejęciu soli dalej ma ${wynik[3]} uwag — migracja nie domyka się w jednym kroku`);
}

/* 10c9c. ROZJAZD DWÓCH MIEJSC TO KOD 1. Gdy tabela i stara opcja niosą RÓŻNE
 * sole, część stron w przeglądarkach ma podpisy, których sito nie przyjmie —
 * dokładnie tryb awarii, przed którym ma chronić migracja. Kontrola ma to
 * NAZWAĆ, nie przemilczeć. */
{
  const wynik = phpEval(
    "global $wpdb; $o = 'aai_monitor_sol_podpisu'; $orygOpc = get_option( $o );" +
      " delete_option( $o ); add_option( $o, 'INNA_NIZ_W_TABELI', '', true ); wp_cache_delete( 'alloptions', 'options' );" +
      " $stan = Aai_Monitor_Podpis::stan_soli();" +
      " delete_option( $o ); if ( is_string( $orygOpc ) && '' !== $orygOpc ) { add_option( $o, $orygOpc, '', true ); } wp_cache_delete( 'alloptions', 'options' );" +
      " echo count( $stan ), '|', ( isset( $stan[0] ) && str_contains( $stan[0], 'RÓŻNI SIĘ' ) ? 'nazwany' : 'inny' );"
  ).stdout.trim().split("|");
  sprawdz(wynik[0] === "1" && wynik[1] === "nazwany", "kontrola nie nazywa rozjazdu soli między tabelą a starą opcją — część stron nosi podpisy, których sito nie przyjmie, a kontrola milczy");
}

/* 10c10. KONTROLA ŚWIECI KODEM 1 PRZY ROZJEŹDZIE POCHODZENIA (A4).
 *
 * Adres wystrzału składa `admin_url()`, a sito porównuje `Origin`
 * z `home_url()`. Rozjazd — `www` w jednym, brak w drugim,
 * `FORCE_SSL_ADMIN`, inny port — czyni beacon żądaniem cross-origin:
 * przeglądarka pyta preflightem, WordPress odpowiada 403, i pomiar milczy
 * CAŁKOWICIE przy kontroli świecącej kod 0. Decyzja właściciela
 * (2026-08-30): taki stan ma być czerwony.
 *
 * MIERZYMY KOD WYJŚCIA, NIE PRZECHWYCONE WYJŚCIE. Pierwsza wersja tego
 * sprawdzenia łapała tekst przez `ob_start()` i była martwa: `WP_CLI::
 * error()` KOŃCZY PROCES, więc kod za wywołaniem kontroli nigdy się nie
 * wykonuje. Ta sama pułapka zafałszowała moją wcześniejszą sondę — uznałem
 * ją za potwierdzoną, bo widziałem komunikat, a nie jej własny werdykt.
 *
 * Rozjazd podstawiamy przez `--exec`, czyli w tym samym procesie CLI,
 * w którym biegnie komenda. Instalacji nie dotykamy. */
{
  /*
   * Rozjazd robimy TAK, JAK WYGLĄDA NAPRAWDĘ: rozjeżdżając `siteurl`
   * z `home` — bo `admin_url()` liczy się z pierwszego, a `home_url()`
   * z drugiego. Wariant przez `--exec` odpadł: kod z nawiasami i zmienną
   * nie przeżywa drogi do `eval`, a wynikający z tego BŁĄD SKŁADNI dawał
   * niezerowy kod wyjścia — czyli pierwszą asercję spełnioną z zupełnie
   * innego powodu. Złapał to dopiero kontrprzykład pytający o TREŚĆ
   * komunikatu.
   */
  const siteurl = wp("option", "get", "siteurl").stdout.trim();
  wp("option", "update", "siteurl", siteurl.replace("127.0.0.1", "www.127.0.0.1"));
  const zRozjazdem = wp("aai-monitor", "sprawdz");
  wp("option", "update", "siteurl", siteurl);
  sprawdz(wp("option", "get", "siteurl").stdout.trim() === siteurl, "pomiar nie oddał instalacji jej adresu — kokpit zostałby pod zmyślonym hostem");
  sprawdz(
    zRozjazdem.kod !== 0,
    "kontrola kończy się kodem 0 przy rozjeździe adresu kokpitu i witryny — a wtedy beacon nie zapisuje się ANI RAZU, bez żadnego innego objawu (A4)"
  );
  sprawdz(
    /różne pochodzenie/.test(zRozjazdem.stderr + zRozjazdem.stdout),
    "kontrola świeci na czerwono przy rozjeździe adresów, ale nie mówi DLACZEGO — czerwień bez powodu uczy, żeby jej nie czytać"
  );
  // Kontrprzykład: bez podstawionego rozjazdu ta sama komenda ma milczeć.
  sprawdz(wp("aai-monitor", "sprawdz").kod === 0, "kontrola świeci na czerwono na zdrowym środowisku — sprawdzenie A4 mierzyłoby wtedy własny fałszywy alarm");
}

/* 10d. F18: akcja schowana w ciele daje HTTP 200 i CISZĘ. */
{
  const przed = ileWizyt();
  const kod = await beacon({ akcjaWQuery: false });
  sprawdz(ileWizyt() === przed, "beacon z akcją w ciele zapisał wiersz — a nie ma prawa: $action czytane jest z $_REQUEST");
  sprawdz(kod === 200, `akcja w ciele powinna trafić w gałąź „brak akcji” (200), a dała ${kod} — jeśli to 204, ktoś zarejestrował akcję pod pustą nazwą`);
}

/* 10e. BEACON KONTROLNY NA ZAMKNIĘCIE bloku sita. */
{
  const przed = ileWizyt();
  await beacon({ sciezka: SCIEZKA_B });
  sprawdz(ileWizyt() === przed + 1, "endpoint przestał przyjmować poprawne beacony w trakcie bloku sita");
}

/* 10f. N18: beacon ZALOGOWANEGO klienta też tworzy wiersz.
 * `admin-post.php` rozgałęzia się po stanie zalogowania, a strony lekcji
 * są za logowaniem — bez tej gałęzi cały ruch w kupionym materiale jest
 * niewidzialny. */
{
  const klient = sesja();
  const zalogowany = await klient.zaloguj("klient-test", HASLA.WP_KLIENT_HASLO ?? "");
  sprawdz(zalogowany, "nie udało się zalogować konta klient-test — sprawdzenie N18 nie ma czego mierzyć");
  if (zalogowany) {
    const ciastka = klient.naglowekCiastek();
    const przed = ileWizyt();
    await beacon({ sciezka: SCIEZKA_B, ciastka });
    sprawdz(ileWizyt() === przed + 1, "beacon zalogowanego klienta nie utworzył wiersza (N18) — gałąź admin_post_ jest martwa, a to cały ruch na lekcjach");
  }
}

/* 10g. N12: limiter działa, a pełne IP nie osiada w opcjach. */
{
  const klucz = phpEval(
    "global $wpdb; $k = $wpdb->get_var( \"SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE '_transient_aai\\\\_monitor\\\\_limit\\\\_%' ORDER BY option_id DESC LIMIT 1\" ); echo (string) $k;"
  ).stdout.trim();
  sprawdz(klucz !== "", "limiter nie zostawił licznika w transiencie — nie ma czego mierzyć");
  if (klucz !== "") {
    const nazwa = klucz.replace("_transient_", "");

    /*
     * OKNO JEST KOTWICZONE DO PEŁNEJ MINUTY ZEGARA (naprawa A1).
     *
     * Do naprawy licznik trzymał samą liczbę, a `set_transient` odnawia
     * TTL przy każdym zapisie — więc okno nie kończyło się nigdy, dopóki
     * przerwy były krótsze niż minuta. Zmierzone: dwa beacony w odstępie
     * 5 s przesunęły koniec okna o 5 s przy liczniku 1 → 2. Za wspólnym
     * adresem (biuro, proxy) jeden zapętlony klient gasił wtedy pomiar
     * CAŁEJ witryny — po cichu, przy kontroli świecącej kod 0.
     *
     * Mierzymy to na kształcie zapisu, bo on JEST mechanizmem okna:
     * wartość musi nieść numer minuty, a wpis z minuty minionej ma się
     * czytać jak zero.
     */
    const wartosc = phpEval(`echo (string) get_transient( '${nazwa}' );`).stdout.trim();
    sprawdz(
      /^\d+:\d+$/.test(wartosc),
      `licznik limitera trzyma „${wartosc}” zamiast „minuta:ile” — bez numeru okna limit liczy się od ostatniej pełnej minuty CISZY, a nie na minutę (A1)`
    );
    if (/^\d+:\d+$/.test(wartosc)) {
      const okno = Number(wartosc.split(":")[0]);
      sprawdz(okno % 60 === 0, `okno limitera zaczyna się o ${okno % 60} s po pełnej minucie — kotwica jest w czasie pierwszego żądania, więc okno znów nie ma końca`);
    }

    // Zamiast wysyłać 300 żądań: podnosimy licznik do sufitu W BIEŻĄCYM
    // OKNIE i patrzymy, czy kolejny beacon zostaje odrzucony.
    phpEval(`$t = time(); set_transient( '${nazwa}', ( $t - $t % 60 ) . ':100000', 120 ); echo 'ok';`);
    const przed = ileWizyt();
    await beacon();
    sprawdz(ileWizyt() === przed, "limiter przepuścił beacon po przekroczeniu sufitu na adres");

    // Ten sam licznik, ale przypisany do POPRZEDNIEJ minuty, ma się
    // czytać jak zero — na tym stoi „na minutę”.
    phpEval(`$t = time(); set_transient( '${nazwa}', ( $t - $t % 60 - 60 ) . ':100000', 120 ); echo 'ok';`);
    const poStarym = ileWizyt();
    await beacon();
    sprawdz(
      ileWizyt() === poStarym + 1,
      "licznik z POPRZEDNIEJ minuty dalej blokuje — okno nie kończy się samo, więc jeden klient może zgasić pomiar całej witryny na stałe (A1)"
    );

    /*
     * ODRZUCONE BEACONY NIE ZŻERAJĄ LIMITU (druga połowa A1). Limiter
     * stoi przed sprawdzeniem podpisu, więc do naprawy strumień śmieci
     * wypełniał limit prawdziwym ludziom zza tego samego adresu — czyli
     * robił dokładnie to, przed czym miał chronić.
     */
    phpEval(`delete_transient( '${nazwa}' ); echo 'ok';`);
    for (let i = 0; i < 3; i++) await beacon({ podpis: "0".repeat(32) });
    const poSmieciach = phpEval(`echo (string) get_transient( '${nazwa}' );`).stdout.trim();
    sprawdz(
      "" === poSmieciach || 0 === Number(poSmieciach.split(":")[1] ?? 0),
      `trzy ODRZUCONE beacony podniosły licznik do „${poSmieciach}” — śmieci wypełniają limit prawdziwym ludziom zza tego samego adresu (A1)`
    );

    phpEval(`delete_transient( '${nazwa}' ); echo 'ok';`);
    const po = ileWizyt();
    await beacon();
    sprawdz(ileWizyt() === po + 1, "po zdjęciu licznika beacon dalej jest odrzucany — limiter nie zwalnia okna");
  }
  const zIp = Number(
    phpEval(
      "global $wpdb; echo (int) $wpdb->get_var( \"SELECT COUNT(*) FROM {$wpdb->options} WHERE option_name LIKE '%aai_monitor%' AND ( option_name REGEXP '[0-9]+[.][0-9]+[.][0-9]+[.][0-9]+' OR option_value REGEXP '[0-9]+[.][0-9]+[.][0-9]+[.][0-9]+' )\" );"
    ).stdout
  );
  sprawdz(zIp === 0, `w opcjach osiadł adres IP (${zIp} wpisów) — limiter ma trzymać wyłącznie SKRÓT (N12, D3)`);
}

/* 10h. N8: skryptu nie dostaje ani administrator, ani strona 404. */
{
  const gosc = await (await fetch(`${ADRES}${SCIEZKA_A}`, { headers: { connection: "close" } })).text();
  sprawdz(/<script[^>]+assets\/pomiar\.js/.test(gosc), "gość nie dostaje skryptu pomiaru — nie ma czym mierzyć ruchu");
  sprawdz(gosc.includes("aaiMonitorPomiar"), "strona gościa nie niesie podpisanej ścieżki — beacon nie miałby czym się wylegitymować");

  const admin = sesja();
  const zalogowany = await admin.zaloguj("admin", HASLA.WP_ADMIN_HASLO ?? "");
  sprawdz(zalogowany, "nie udało się zalogować administratora — sprawdzenie N8 nie ma czego mierzyć");
  if (zalogowany) {
    const html = await (await admin.pobierz(SCIEZKA_A)).text();
    sprawdz(!/<script[^>]+assets\/pomiar\.js/.test(html), "administrator dostaje skrypt pomiaru (N8, D3) — jego odsłony byłyby liczone jak cudze");
  }
  const czterysta = await (await fetch(`${ADRES}/na-pewno-nie-ma-takiej-strony/`, { headers: { connection: "close" } })).text();
  sprawdz(
    !czterysta.includes("aaiMonitorPomiar"),
    "strona 404 wydaje podpis — a renderuje się dla DOWOLNEGO adresu, więc listę najczęstszych stron dałoby się zatruć czymkolwiek"
  );
}

/* 10i. N9 + N10 JAKO PARA: prawdziwa przeglądarka, prawdziwe wyjście. */

/*
 * CZEGO TU NIE MA I DLACZEGO. Powrotu „wstecz” NIE wywołujemy przez
 * `goBack()` ani przez `history.back()` — zmierzone: w Firefoksie
 * sterowanym przez BiDi jedno i drugie kończy się timeoutem po 30 s
 * i NIE ZMIENIA ADRESU, a przy okazji psuje sesję na tyle, że kolejna
 * nawigacja też pada. To ograniczenie riga, nie przeglądarki: prawdziwy
 * powrót z bfcache zmierzyliśmy osobno (F22 — `pageshow persisted=true`
 * plus `visibilitychange visible`).
 *
 * Mierzymy więc NASZ mechanizm, a nie cudzy: podstawiamy stronie to samo
 * zdarzenie, które wysyła jej przeglądarka przy powrocie, i sprawdzamy,
 * czy odsłona liczy się PONOWNIE. Bez zdjęcia flagi wysyłki byłby jeden
 * wiersz zamiast dwóch.
 */
async function przelot({ udawajCzlowieka, powrotZBfcache = false }) {
  const p = await puppeteer.launch({
    browser: "firefox",
    executablePath: PRZEGLADARKA,
    headless: true,
    protocol: "webDriverBiDi",
  });
  try {
    const strona = await p.newPage();
    if (udawajCzlowieka) {
      // F16: nadpisanie flagi automatu DZIAŁA i to ono czyni tę bramkę
      // wykonalną — bez niego skrypt wyłączyłby się w każdym rigu.
      await strona.evaluateOnNewDocument(() => Object.defineProperty(navigator, "webdriver", { get: () => false }));
    }
    await strona.goto(`${ADRES}${SCIEZKA_A}`, { waitUntil: "load" });
    await new Promise((ok) => setTimeout(ok, 1200));

    // PRAWDZIWE wyjście ze strony A: nawigacja wywołuje pagehide
    // i visibilitychange dokładnie tak, jak u człowieka.
    await strona.goto(`${ADRES}${SCIEZKA_B}`, { waitUntil: "load" });
    await new Promise((ok) => setTimeout(ok, 900));

    // Wyjście ze strony B — podstawiamy ukrycie karty, bo nawigacja na
    // `about:blank` w tym rigu również kończy się timeoutem.
    const ukryj = () =>
      strona.evaluate(() => {
        Object.defineProperty(document, "visibilityState", { get: () => "hidden", configurable: true });
        document.dispatchEvent(new Event("visibilitychange"));
      });
    const pokaz = () =>
      strona.evaluate(() => {
        Object.defineProperty(document, "visibilityState", { get: () => "visible", configurable: true });
        window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
      });

    await ukryj();
    await new Promise((ok) => setTimeout(ok, 400));

    if (powrotZBfcache) {
      await pokaz();
      await new Promise((ok) => setTimeout(ok, 700));
      await ukryj();
      await new Promise((ok) => setTimeout(ok, 400));
    }
  } finally {
    await p.close();
  }
}

{
  const przed = ileWizyt();
  await przelot({ udawajCzlowieka: true, powrotZBfcache: true });
  const po = ileWizyt();
  /*
   * TRZY wiersze, nie dwa i nie sześć — jedna liczba dowodzi trzech
   * rzeczy naraz:
   *  - pełna ścieżka działa (N9): prawdziwy skrypt, prawdziwe wyjście
   *    ze strony A przy nawigacji, wiersz w tabeli;
   *  - JEDNA wysyłka na odsłonę (P17): pagehide i visibilitychange
   *    odpalają w tej samej milisekundzie, więc bez bramki byłoby sześć;
   *  - powrót z bfcache liczy się jako NOWA odsłona (F22): bez zdjęcia
   *    flagi na `pageshow.persisted` byłyby dwa.
   */
  sprawdz(
    po === przed + 3,
    `przelot przeglądarką dał ${po - przed} wierszy zamiast 3 — dwa znaczą, że powrót z bfcache nie jest liczony, sześć, że każda odsłona zapisuje się dwa razy, zero, że cała ścieżka beaconu jest martwa (N9)`
  );

  const ostatnie = phpEval(
    "global $wpdb; $w = Aai_Monitor_Tabele::tabela('wizyty'); $r = $wpdb->get_row( \"SELECT sciezka, trwanie_ms, sesja FROM `{$w}` ORDER BY id DESC LIMIT 1\", ARRAY_A ); echo $r['sciezka'], '|', (int) $r['trwanie_ms'], '|', strlen( (string) $r['sesja'] );"
  ).stdout.split("|");
  sprawdz(ostatnie[0] === SCIEZKA_B, `ostatnia odsłona z przelotu ma ścieżkę ${ostatnie[0]}, a spodziewaliśmy się ${SCIEZKA_B}`);
  sprawdz(Number(ostatnie[1]) > 300, `czas aktywny z prawdziwej przeglądarki wyszedł ${ostatnie[1]} ms — zegar nie liczy albo liczy tylko chwilę`);
  sprawdz(Number(ostatnie[2]) === 32, `identyfikator sesji ma ${ostatnie[2]} znaków zamiast 32 — sito odrzuciłoby własne beacony`);

  /*
   * CIĄGŁOŚĆ SESJI — luka w dowodach znaleziona w teście ręcznym T4
   * (2026-08-31), nie przez bramkę.
   *
   * Do tej pory pytaliśmy WYŁĄCZNIE o DŁUGOŚĆ identyfikatora (32 znaki),
   * czyli o to, czy sito go przepuści. Nikt nie pytał, czy dwie strony
   * odwiedzone w TEJ SAMEJ karcie dostają TEN SAM identyfikator — a to
   * jest cała treść słowa „sesja" na ekranie.
   *
   * CZYM TO GROZI: gdyby `idSesji()` przestało czytać `sessionStorage`
   * (dość skasować `getItem`, zostawiając `setItem`), każda odsłona
   * dostałaby świeży identyfikator. „Sesje" na ekranie zrównałyby się
   * z „Odsłonami", wszystkie 170 sprawdzeń świeciłoby na zielono,
   * a właściciel czytałby liczbę osób jako liczbę stron. Ta klasa —
   * pomiar prawdziwy co do wiersza, a nieprawdziwy co do ZNACZENIA —
   * jest dokładnie tym, czego bramki łapać nie umiały.
   *
   * Trzy wiersze przelotu powstały w jednej karcie (A, B i powrót B
   * z bfcache), więc MUSZĄ mieć jeden identyfikator sesji. Powrót
   * z bfcache jest tu wart osobnego słowa: on zmienia `odslona`
   * (to nowa odsłona), ale NIE ma prawa zmienić sesji — karta jest ta
   * sama. Jedna liczba pilnuje więc obu rzeczy naraz.
   */
  const sesjePrzelotu = phpEval(
    "global $wpdb; $w = Aai_Monitor_Tabele::tabela('wizyty'); echo (int) $wpdb->get_var( \"SELECT COUNT(DISTINCT sesja) FROM ( SELECT sesja FROM `{$w}` ORDER BY id DESC LIMIT 3 ) AS t\" );"
  ).stdout.trim();
  sprawdz(
    sesjePrzelotu === "1",
    `trzy odsłony z JEDNEJ karty mają ${sesjePrzelotu} różnych identyfikatorów sesji zamiast jednego — „sesja" przestała znaczyć kartę i zaczęła znaczyć odsłonę, więc ekran pokazuje właścicielowi liczbę stron tam, gdzie obiecuje liczbę odwiedzających (ciągłość sessionStorage w funkcji idSesji)`
  );
}

{
  const przed = ileWizyt();
  await przelot({ udawajCzlowieka: false });
  sprawdz(
    ileWizyt() === przed,
    "automat został policzony jako ruch (N10) — skrypt ma się wyłączać przy navigator.webdriver, inaczej własne bramki zawyżą statystyki"
  );
}

/* 10j. OKNA EKRANU liczą się od północy CZASU WITRYNY, nie UTC. */
{
  const granice = phpEval(
    "$m = new ReflectionMethod( 'Aai_Monitor_Odczyt', 'granica_okna' ); $m->setAccessible( true );" +
      " $bylo = get_option( 'gmt_offset' ); $a = $m->invoke( null, 1 );" +
      " update_option( 'gmt_offset', 2 ); $b = $m->invoke( null, 1 );" +
      " update_option( 'gmt_offset', $bylo ); echo $a, '|', $b, '|', get_option( 'gmt_offset' );"
  ).stdout.split("|");
  sprawdz(granice[0] !== granice[1], "granica okna nie zmienia się ze strefą witryny — na produkcji doba zaczynałaby się o złej godzinie");
  sprawdz(granice[0].endsWith("00:00:00"), `przy gmt_offset=0 granica dnia powinna wypaść o północy UTC, a wypadła ${granice[0]}`);
  sprawdz(granice[1].endsWith("22:00:00"), `przy gmt_offset=2 granica dnia powinna wypaść o 22:00 poprzedniej doby UTC, a wypadła ${granice[1]}`);
  sprawdz(String(granice[2]) === "0", "smoke nie przywrócił strefy czasowej instalacji");
}

/* 10k. EKRAN pokazuje ruch i UCIEKA ścieżkę (przyszła z ciała żądania). */
{
  const admin = sesja();
  if (await admin.zaloguj("admin", HASLA.WP_ADMIN_HASLO ?? "")) {
    /*
     * PYTAMY, KTÓRE okno jest zaznaczone (B7 z przeglądu T3). Poprzednia
     * wersja pytała o samą obecność klasy — a ta jest w HTML zawsze, bo
     * zaznaczone jest zawsze któreś. Zmierzone: przy `okno=999` ekran
     * wraca do „dziś” i asercja dalej przechodziła, czyli nie mierzyła
     * przełącznika w ogóle.
     */
    const zaznaczone = async (zapytanie) => {
      const html = await (await admin.pobierz(`/wp-admin/admin.php?page=aai-monitor${zapytanie}`)).text();
      const m = html.match(/class="aai-monitor-okno-wybrane"[^>]*>([^<]*)</);
      return m ? m[1].trim() : "";
    };
    /*
     * `ekran30` jest tu WŁASNĄ zmienną, a nie zapożyczoną z zewnątrz.
     * Przy pierwszym podejściu do B7 zabrałem stąd deklarację `html`
     * i dwie następne asercje zaczęły po cichu czytać `html` z bloku
     * o piętro wyżej — czyli stronę frontu zamiast ekranu monitoringu.
     * Objaw wyglądał jak błąd danych („sekcja Ruch nie pokazuje ścieżek”),
     * a był błędem zakresu.
     */
    const ekran30 = await (await admin.pobierz("/wp-admin/admin.php?page=aai-monitor&okno=30")).text();
    const okno30 = await zaznaczone("&okno=30");
    sprawdz(okno30 === "30 dni", `przy okno=30 ekran zaznacza „${okno30}” zamiast „30 dni” — przełącznik pokazuje inne okno, niż liczy sekcja`);
    sprawdz((await zaznaczone("&okno=7")) === "7 dni", "przy okno=7 ekran zaznacza inne okno niż siedem dni");
    sprawdz((await zaznaczone("")) === "dziś", "bez parametru ekran nie zaznacza „dziś” — a to jest okno, które wtedy liczy");
    sprawdz((await zaznaczone("&okno=999")) === "dziś", "przy nieznanym oknie ekran nie wraca do „dziś” — pokazywałby liczby jednego okna przy zaznaczeniu innego");
    sprawdz(ekran30.includes(SCIEZKA_B) || ekran30.includes(SCIEZKA_A), "sekcja Ruch nie pokazuje ani jednej ścieżki, choć w tabeli są wiersze");
    sprawdz(!ekran30.includes("&amp;quot;"), "ekran drukuje podwójnie uciekany cudzysłów — klient zobaczy encję zamiast znaku");

    /*
     * KAŻDY KAFELEK NIESIE SWÓJ OKRES (T4-D1).
     *
     * Zgłoszenie właściciela z testu ręcznego T4 (2026-08-31): pod
     * kafelkami stało „Kafelki liczą wszystko od początku pomiaru”,
     * a drugi kafelek nazywał się „Nieudane próby (7 dni)”. Jedno zdanie
     * opisywało cztery liczby, z których jedna liczy się inaczej — więc
     * o niej kłamało. Nie pilnowało tego NIC: żaden strażnik i żadna
     * bramka nie patrzyły na napisy przy liczbach, dlatego sprzeczność
     * mogła powstać i przetrwać do testu ręcznego.
     *
     * Sprawdzamy ZACHOWANIE, nie brzmienie: ile kafelków, tyle NIEPUSTYCH
     * podpisów okresu. Reguła przeżyje przemianowanie etykiet i dodanie
     * piątego kafelka — nowy też będzie musiał powiedzieć, co liczy.
     *
     * WZORZEC PYTA O TREŚĆ, NIE O ZNACZNIK, i to nie jest drobiazg:
     * pierwsza wersja liczyła same `class="aai-monitor-okres"`, więc
     * mutacja ustawiająca okres na pusty łańcuch PRZESZŁA NA ZIELONO —
     * znacznik był, podpisu nie było. To siódmy nawrót tej samej pułapki
     * w projekcie (0.29.0 nazwa metody, 0.44.0 nazwa stałej, 0.47.0 napis,
     * c6c9c97, dwa razy w P4) i tym razem wpadła w nią reguła pisana
     * PRZEZ ten sam przegląd, który ją opisuje.
     */
    const kafelkow = (ekran30.match(/class="aai-monitor-kafelek/g) ?? []).length;
    const okresow = (ekran30.match(/class="aai-monitor-okres">[^<\s][^<]*</g) ?? []).length;
    sprawdz(kafelkow >= 4, `ekran pokazuje ${kafelkow} kafelków zamiast co najmniej czterech — pomiar podpisów mierzyłby pustkę`);
    sprawdz(
      kafelkow === okresow,
      `${kafelkow} kafelków niesie ${okresow} podpisów okresu — kafelek bez własnego okresu zmusza czytelnika, żeby dopowiedział go sobie sam, a trzy z nich liczą od początku pomiaru i jeden ostatnie 7 dni (T4-D1)`
    );
    sprawdz(
      !/Kafelki licz\u0105 wszystko/.test(ekran30),
      "wróciło wspólne zdanie „Kafelki liczą wszystko od początku pomiaru” — przeczy kafelkowi nieudanych prób, który liczy 7 dni (zgłoszenie właściciela z T4)"
    );

    const zlosliwa = "/szkolenia/<script>alert(1)</script>/";
    phpEval(
      `global $wpdb; $w = Aai_Monitor_Tabele::tabela('wizyty');` +
        ` $wpdb->insert( $w, array( 'sesja' => '${SESJA_TESTOWA}', 'sciezka' => '${zlosliwa}', 'wejscie' => gmdate('Y-m-d H:i:s'), 'trwanie_ms' => 1000 ) ); echo 'ok';`
    );
    const zeSkryptem = await (await admin.pobierz("/wp-admin/admin.php?page=aai-monitor")).text();
    sprawdz(
      !zeSkryptem.includes("<script>alert(1)</script>"),
      "ścieżka z tabeli trafiła na ekran BEZ ucieczki — podpis dowodzi pochodzenia, nie czyni treści bezpieczną"
    );
    sprawdz(zeSkryptem.includes("&lt;script&gt;"), "ścieżka ze znacznikiem nie pojawiła się na ekranie wcale — sprawdzenie ucieczki byłoby ślepe");
  }
}

/* ── sprzątanie + rachunek sumienia ─────────────────────────────────── */

/*
 * SPRZĄTANIE PO SOBIE, NIGDY HURTOWE (N13, zasada z 0.54.0).
 *
 * Do T2 wystarczał wzorzec `login LIKE 'smoke-monitor%'`, bo smoke pisał
 * do dziennika wyłącznie sam. Od T2 pisze też WORDPRESS — za każdym
 * logowaniem, które ten przebieg wykonuje (blok 6 loguje admina, blok 9
 * klienta i gościa). Te wiersze mają PRAWDZIWE loginy, więc stary wzorzec
 * by ich nie ruszył, a rachunek sumienia padłby na własnych śladach.
 *
 * Kasujemy więc OKNO PRZEBIEGU — wszystko, co powstało po migawce —
 * i nic ponadto. Nigdy `TRUNCATE`, nigdy „wszystko z dzisiaj".
 *
 * ŚWIADOME OGRANICZENIE, nazwane wprost po przeglądzie (wcześniej ten
 * komentarz opisywał mechanizm, którego w kodzie NIE MA — dokładnie
 * klasa BLAD-018): granicą jest sam identyfikator, więc gdyby ktoś
 * zalogował się DOKŁADNIE w oknie przebiegu, jego wiersz też zniknie.
 * Kasowanie po loginach byłoby gorsze, nie lepsze: loginy naszych bramek
 * to prawdziwe konta (`admin`, `klient-test`), więc zabrałoby także
 * WCZEŚNIEJSZE, prawdziwe logowania właściciela na te konta.
 *
 * Ryzyko jest warsztatowe i minutowe: bramki uruchamia się na `:8892`,
 * nigdy na instalacji z ruchem. Gdyby kiedyś miało przestać wystarczać,
 * właściwą drogą jest zbieranie identyfikatorów W TRAKCIE przebiegu
 * (wzorzec `poczta.mjs`: migawka → różnica → jawna lista), a nie druga
 * heurystyka po treści wiersza.
 */
sprzatnijDziennik(php, dziennikMigawka);
/*
 * WIZYTY KASUJEMY PO GRANICY IDENTYFIKATORA, bo rozpoznać ich inaczej się
 * nie da: tabela ruchu jest anonimowa i nie ma w niej ani loginu, ani
 * znacznika, po którym poznalibyśmy własny wiersz.
 *
 * Poprzedni komentarz twierdził, że „wizyty mają własny znacznik
 * w ścieżce”. To była NIEPRAWDA O KODZIE (klasa BLAD-018): bramka używa
 * prawdziwych adresów strony, a kasuje wszystko, co powstało po migawce.
 * Ograniczenie jest więc TAKIE SAMO jak przy dzienniku logowań i tak samo
 * świadome: gdyby ktoś odwiedził witrynę dokładnie w oknie przebiegu, jego
 * odsłona też zniknie. Ryzyko jest warsztatowe — bramki uruchamia się na
 * `:8892`, nigdy na instalacji z ruchem.
 */
phpEval(
  `global $wpdb; $w = Aai_Monitor_Tabele::tabela('wizyty');` +
    ` $wpdb->query( $wpdb->prepare( "DELETE FROM \`{$w}\` WHERE id > %d", ${wizytyMigawka} ) ); echo 'ok';`
);
sprawdz(
  ileWpisow(php) === dziennikPrzed,
  `bramka zostawiła ślad w dzienniku logowań: przed ${dziennikPrzed}, po ${ileWpisow(php)} wpisów (N13)`
);

const licznikiPo = liczniki();
sprawdz(
  licznikiPo === licznikiPrzed,
  `smoke zostawił ślad w tabelach monitoringu: przed ${licznikiPrzed}, po ${licznikiPo} (logowania:wizyty)`
);

/* ── wynik ──────────────────────────────────────────────────────────── */

if (bledy.length > 0) {
  console.error(`smoke-wp-monitor: ${bledy.length} z ${sprawdzen} sprawdzeń padło:`);
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}
console.log(`smoke-wp-monitor: OK (${sprawdzen} sprawdzeń na żywej instalacji).`);
