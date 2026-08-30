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
 * Login NIEISTNIEJĄCEGO konta jest maskowany — celowo, od przeglądu T2:
 * w tym polu bywa HASŁO (A1 niżej). Zostaje początek i długość, czyli
 * wzorzec ataku bez sekretu. Istniejące konta zapisujemy dosłownie
 * i tego pilnuje osobne sprawdzenie w bloku A1.
 */
sprawdz(
  (poPorazce[0]?.login ?? "").startsWith(LOGIN_NIEISTNIEJACY.slice(0, 3)) &&
    (poPorazce[0]?.login ?? "").includes(String(LOGIN_NIEISTNIEJACY.length)),
  `wiersz porażki zapisał login „${poPorazce[0]?.login}” — oczekiwano początku „${LOGIN_NIEISTNIEJACY.slice(0, 3)}” i długości ${LOGIN_NIEISTNIEJACY.length}. To jedyna informacja o tym, kogo próbowano podszyć, więc nie może zniknąć w całości`
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
  (poSekrecie[0]?.login ?? "").startsWith(SEKRET.slice(0, 3)),
  "zamaskowany login stracił początek — wtedy nie widać wzorca ataku (adm…, roo…, tes…), a po to ta kolumna istnieje"
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

const podpisz = (sciezka) => phpEval(`echo Aai_Monitor_Podpis::podpisz('${sciezka}');`).stdout.trim();
const ileWizyt = () =>
  Number(phpEval("global $wpdb; echo (int) $wpdb->get_var( 'SELECT COUNT(*) FROM ' . Aai_Monitor_Tabele::tabela('wizyty') );").stdout);

async function beacon({
  sciezka = SCIEZKA_A,
  podpis = null,
  sesja = SESJA_TESTOWA,
  trwanie = 5000,
  wiek = 60000,
  typ = "application/json",
  origin = ADRES,
  wypelniacz = "",
  akcjaWQuery = true,
  ciastka = "",
} = {}) {
  const ladunek = { sciezka, podpis: podpis ?? podpisz(sciezka), sesja, trwanie_ms: trwanie, wiek_ms: wiek };
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
  ["brak Origin i Referera", { origin: "" }],
  ["podpis nie pasuje do ścieżki", { podpis: "0".repeat(32) }],
  ["ścieżka podmieniona po podpisaniu (zatrucie listy stron)", { sciezka: "/zmyslona-sciezka/", podpis: null, sesja: SESJA_TESTOWA }],
  ["sesja krótsza o znak", { sesja: SESJA_TESTOWA.slice(0, 31) }],
  ["ciało o bajt ponad sufit", { wypelniacz: "y".repeat(1025) }],
];
for (const [opis, opcje] of odrzuty) {
  const przed = ileWizyt();
  // Ścieżka podmieniona: podpisujemy JEDNĄ, wysyłamy DRUGĄ.
  if (opcje.sciezka === "/zmyslona-sciezka/") opcje.podpis = podpisz(SCIEZKA_A);
  const kod = await beacon(opcje);
  sprawdz(ileWizyt() === przed, `sito przepuściło beacon, którego nie powinno: ${opis}`);
  sprawdz(kod === 204, `odrzut zdradził się kodem odpowiedzi (${kod}) przy: ${opis} — odrzut ma być nieodróżnialny od przyjęcia`);
}

/* 10c. CZAS PONAD SUFIT JEST PRZYCINANY, NIE ODRZUCANY. */
{
  const przed = ileWizyt();
  await beacon({ trwanie: 9 * 60 * 60 * 1000, wiek: 9 * 60 * 60 * 1000 });
  sprawdz(ileWizyt() === przed + 1, "beacon z czasem ponad sufit został ODRZUCONY — ma być przycięty (uśpiona karta to nie atak)");
  const sufit = Number(
    phpEval("global $wpdb; $w = Aai_Monitor_Tabele::tabela('wizyty'); echo (int) $wpdb->get_var( \"SELECT trwanie_ms FROM `{$w}` ORDER BY id DESC LIMIT 1\" );").stdout
  );
  sprawdz(sufit === 4 * 60 * 60 * 1000, `czas nie został przycięty do sufitu 4 h (zapisano ${sufit} ms)`);
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
    // Zamiast wysyłać 300 żądań: podnosimy licznik do sufitu i patrzymy,
    // czy kolejny beacon zostaje odrzucony.
    phpEval(`set_transient( '${klucz.replace("_transient_", "")}', 100000, 60 ); echo 'ok';`);
    const przed = ileWizyt();
    await beacon();
    sprawdz(ileWizyt() === przed, "limiter przepuścił beacon po przekroczeniu sufitu na adres");
    phpEval(`delete_transient( '${klucz.replace("_transient_", "")}' ); echo 'ok';`);
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
    const html = await (await admin.pobierz("/wp-admin/admin.php?page=aai-monitor&okno=30")).text();
    sprawdz(html.includes("aai-monitor-okno-wybrane"), "ekran nie zaznacza wybranego okna ruchu");
    sprawdz(html.includes(SCIEZKA_B) || html.includes(SCIEZKA_A), "sekcja Ruch nie pokazuje ani jednej ścieżki, choć w tabeli są wiersze");
    sprawdz(!html.includes("&amp;quot;"), "ekran drukuje podwójnie uciekany cudzysłów — klient zobaczy encję zamiast znaku");

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
// Wizyty mają własny znacznik w ścieżce — tabela ruchu jest anonimowa,
// więc nie ma w niej loginu, po którym dałoby się rozpoznać nasze wiersze.
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
