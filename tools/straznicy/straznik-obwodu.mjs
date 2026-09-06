/**
 * Strażnik obwodu bezpieczeństwa — mu-plugin `aai-obwod.php` trzyma się
 * swojej roli, a hash skryptu motywu w CSP nadal pasuje do żywego motywu.
 *
 * PO CO. Warstwa B audytu (2026-08-31) mieszka POZA trzema wtyczkami
 * produktowymi — w mu-pluginie, którego nie pilnuje `straznik-wtyczki-wp`
 * (ten iteruje po `wordpress/wtyczki/*`). Bez własnego strażnika każde
 * z tych złamań byłoby CICHE, bo strona dalej się otwiera:
 *   - ktoś przywraca XML-RPC „bo apka mobilna" i wraca amplifikacja
 *     brute-force (20 prób w jednym `system.multicall` → 1 wiersz w
 *     dzienniku Pluginu 3 — niespełniony kontrakt D6);
 *   - znika odcięcie `/wp/v2/users` i login administratora znów wisi
 *     publicznie (S-2);
 *   - znika któryś nagłówek albo bramka `is_admin()` puszcza je do wp-admin;
 *   - CSP przestaje być Report-Only albo gubi `style-src 'unsafe-inline'`
 *     (zmierzone jako KONIECZNE — 15–23 atrybuty `style=` na stronę) czy
 *     `report-uri` (bez niego etap obserwacji nic nie zbiera).
 *
 * NAJWAŻNIEJSZE — HASH MOTYWU. CSP obejmuje surowy, wykonywalny `<script>`
 * motywu (guard hydracji z `header.php`) HASHEM, bo motyw jest GENEROWANY
 * i read-only, więc WordPress nie może dołożyć mu nonce'a. Regeneracja
 * motywu zmieni ten skrypt i pod EGZEKWUJĄCYM CSP hydracja padłaby po cichu
 * (Report-Only tylko raportuje). Ten strażnik liczy hash ŻYWEGO skryptu
 * i porównuje z tym, co zaszyto w mu-pluginie — pyta o ZGODNOŚĆ, nie o to,
 * czy stała gdzieś występuje (nawrót pułapki „wzorzec na nazwę" — siódmy
 * w tym projekcie). Motyw leży poza repo; gdy go nie ma, ta część jest
 * POMIJANA (jak straznik-podgladu-kursow), a reszta reguł działa.
 *
 * Użycie:
 *   node tools/straznicy/straznik-obwodu.mjs
 *   AAI_MOTYW_HEADER=<ścieżka do header.php> node ...   (nadpisuje szukanie)
 */
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const KORZEN = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MU = join(KORZEN, "wordpress", "srodowisko", "mu-plugins", "aai-obwod.php");

const bledy = [];

if (!existsSync(MU)) {
  console.error(`straznik-obwodu: nie znalazłem mu-pluginu obwodu (${MU}).`);
  process.exit(1);
}
const kod = readFileSync(MU, "utf8");

/**
 * Reguła pyta o ZACHOWANIE (konkretne rozstrzygnięcie w kodzie), nie o to,
 * czy słowo gdzieś pada. Wzorzec ma trafiać w decyzję.
 */
function regula(nazwa, wzorzec, komunikat) {
  if (!wzorzec.test(kod)) {
    bledy.push(`${nazwa}: ${komunikat}`);
  }
}

// 1. XML-RPC wyłączony w OBU członach (sam interfejs I lista metod) —
//    nie sam komentarz o nim.
regula(
  "xmlrpc-off",
  /add_filter\(\s*'xmlrpc_enabled',\s*'__return_false'\s*\)/,
  "brak wyłączenia XML-RPC (`xmlrpc_enabled` → `__return_false`) — wraca brute-force i amplifikacja przez system.multicall (W-1).",
);
regula(
  "xmlrpc-metody",
  /add_filter\(\s*'xmlrpc_methods',\s*'__return_empty_array'\s*\)/,
  "lista metod XML-RPC nie jest opróżniana — druga warstwa na multicall/pingback znika.",
);

// 2. S-2 — trasa listy użytkowników zdejmowana gościowi.
regula(
  "rest-users",
  /is_user_logged_in\(\)[\s\S]{0,120}unset\(\s*\$trasy\[\s*'\/wp\/v2\/users'\s*\]/,
  "brak odcięcia `/wp/v2/users` dla gości (S-2) — publiczna enumeracja loginu administratora wraca.",
);

// 3. Trzy nagłówki + bramka is_admin (nie w wp-admin).
regula(
  "naglowek-nosniff",
  /header\(\s*'X-Content-Type-Options:\s*nosniff'\s*\)/,
  "brak `X-Content-Type-Options: nosniff`.",
);
regula(
  "naglowek-referrer",
  /header\(\s*'Referrer-Policy:[^']+'\s*\)/,
  "brak `Referrer-Policy`.",
);
regula(
  "naglowek-frame",
  /header\(\s*'X-Frame-Options:\s*SAMEORIGIN'\s*\)/,
  "brak `X-Frame-Options: SAMEORIGIN` (anti-clickjacking kasy i logowania).",
);
regula(
  "bramka-admin",
  /function naglowki\(\)[\s\S]{0,120}if\s*\(\s*is_admin\(\)\s*\)\s*\{\s*return;/,
  "nagłówki nie są bramkowane `is_admin()` — wpadłyby do wp-admin (decyzja: front bez kokpitu).",
);

// 4. CSP EGZEKWUJĄCE, ale z częściami, które trzymają je przy życiu i przy
//    zębach naraz: nonce dla inline skryptów, hashe statycznych, style
//    unsafe-inline (konieczne), report-uri (kolektor), i BEZ unsafe-inline
//    w script-src (który uczyniłby nonce/hashe bezużytecznymi).
regula(
  "csp-naglowek",
  /CSP_NAGLOWEK\s*=\s*'Content-Security-Policy'/,
  "CSP nie jest egzekwujące (`Content-Security-Policy`) — po obserwacji, która dała ZERO naruszeń, egzekwowanie jest stanem docelowym.",
);
regula(
  "csp-nonce",
  /script-src 'self' 'nonce-"\s*\.\s*self::csp_nonce\(\)/,
  "`script-src` bez nonce'a — 23 inline skrypty kasy i inline WordPressa nie mają jak być zaufane bez `'unsafe-inline'`.",
);
regula(
  "csp-nonce-filtr",
  /add_filter\(\s*'wp_inline_script_attributes'/,
  "nonce nie jedzie na inline skrypty (brak filtra `wp_inline_script_attributes`) — nagłówek obiecuje nonce, którego skrypty nie noszą, i wszystko pada.",
);
// Pyta o LITERAŁ polityki (`"script-src …"`), nie o słowo „script-src"
// w komentarzu: `'unsafe-inline'` w script-src unieważnia nonce i hashe.
if (/"script-src[^\n]*'unsafe-inline'/.test(kod)) {
  bledy.push(
    "csp-script-nie-unsafe: `script-src` zawiera `'unsafe-inline'` — to unieważnia nonce i hashe, czyli czyni CSP bezzębnym.",
  );
}
regula(
  "csp-style-inline",
  /style-src 'self' 'unsafe-inline'/,
  "`style-src` bez `'unsafe-inline'` — zmierzone jako KONIECZNE (15–23 atrybuty `style=` na stronę), inaczej front tonie w naruszeniach.",
);
regula(
  "csp-report-uri",
  /'report-uri '\s*\.\s*admin_url\(/,
  "brak `report-uri` — kolektor nie złapałby zmiany w cudzym statycznym skrypcie (Woo/motyw) pod egzekwowaniem.",
);

// 5. Hashe statycznych skryptów — obecność stałych (ZGODNOŚĆ motywu sprawdza pomiar niżej).
const dopasHash = kod.match(/HASH_SKRYPTU_MOTYWU\s*=\s*'(sha256-[A-Za-z0-9+/=]+)'/);
if (!dopasHash) {
  bledy.push(
    "hash-stała: brak stałej HASH_SKRYPTU_MOTYWU — CSP nie ma czym objąć surowego skryptu motywu.",
  );
}
if (!/HASH_WC_NO_JS\s*=\s*'sha256-[A-Za-z0-9+/=]+'/.test(kod)) {
  bledy.push(
    "hash-wcnojs: brak stałej HASH_WC_NO_JS — statyczny skrypt WooCommerce (jedyny łamiący politykę z nonce'em) nie jest objęty i egzekwowanie połamałoby front.",
  );
}

// 5b. Hardening: enumeracja autorów, hasła aplikacji, Permissions-Policy.
regula(
  "author-enum",
  /parse_request[\s\S]{0,300}query_vars\['author'\]/,
  "brak zamknięcia enumeracji autorów (`?author=N` → 301 na `/author/<login>/`) — druga droga do loginu administratora (S-2).",
);
regula(
  "app-passwords",
  /add_filter\(\s*'wp_is_application_passwords_available',\s*'__return_false'\s*\)/,
  "hasła aplikacji nie są wyłączone — kanał uwierzytelniania REST omijający dziennik logowań (F12).",
);
// 5c. Trzecia droga do loginu administratora: mapa autorów w sitemapie.
//     Pytamy o ROZSTRZYGNIĘCIE (zwrot `false` dla dostawcy `users`), a nie
//     o to, czy nazwa filtra gdzieś pada — inaczej sam komentarz o mapie
//     wystarczyłby, żeby strażnik zzieleniał (nawrót klasy z 0.29.0/0.44.0).
regula(
  "mapa-autorow",
  /'wp_sitemaps_add_provider'[\s\S]{0,240}'users'\s*===\s*\$nazwa\s*\?\s*false/,
  "mapa autorów wraca do sitemapy — rdzeń buduje jej adresy z `user_nicename`, czyli PUBLIKUJE login administratora (trzecia droga tego samego wycieku co S-2 i `?author=N`).",
);
regula(
  "mapa-bez-dostawcy-404",
  /'template_redirect'[\s\S]{0,400}get_query_var\(\s*'sitemap'\s*\)[\s\S]{0,400}status_header\(\s*404\s*\)/,
  "trasa mapy bez dostawcy nie oddaje prawdziwego 404 — rdzeń robi tam gołe `return` (zmierzone w `class-wp-sitemaps.php`), więc adres oddaje stronę błędu ze statusem 200, czyli miękkie 404 do zaindeksowania.",
);

regula(
  "permissions-policy",
  /header\(\s*'Permissions-Policy:[^']+'\s*\)/,
  "brak `Permissions-Policy` — kamera/mikrofon/geolokalizacja zostają dostępne dla cudzego skryptu.",
);

// ————————————————————————— pomiar hasha motywu —————————————————————————
// Warunkowy: motyw leży poza repo. Gdy jest — porównujemy ZGODNOŚĆ.
const kandydaci = [
  process.env.AAI_MOTYW_HEADER,
  process.env.WARSZTAT && join(process.env.WARSZTAT, "wp/theme/automatic-ai/header.php"),
  join(process.env.XDG_CACHE_HOME ?? join(process.env.HOME ?? "", ".cache"), "automatic-ai-warsztat/wp/theme/automatic-ai/header.php"),
].filter(Boolean);

const header = kandydaci.find((p) => existsSync(p));

if (!header) {
  console.log(
    "straznik-obwodu: hash motywu POMINIĘTY — nie znalazłem header.php motywu (leży poza repo).\n" +
      "  Wskaż: AAI_MOTYW_HEADER=<ścieżka do header.php> albo ustaw WARSZTAT.",
  );
} else if (dopasHash) {
  const html = readFileSync(header, "utf8");
  // Pierwszy BARE `<script>` (bez atrybutów) = guard hydracji; ld+json
  // i speculationrules mają `type=`, więc odpadają.
  const m = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!m) {
    bledy.push(
      "hash-motyw: nie znalazłem surowego `<script>` w header.php motywu — zmienił się kształt guardu hydracji, sprawdź ręcznie.",
    );
  } else {
    const zywy = "sha256-" + createHash("sha256").update(m[1], "utf8").digest("base64");
    if (zywy !== dopasHash[1]) {
      bledy.push(
        `hash-motyw: hash skryptu motywu NIE PASUJE do CSP.\n` +
          `  w mu-pluginie: ${dopasHash[1]}\n` +
          `  żywy motyw:    ${zywy}\n` +
          `  Motyw się przegenerował. Pod EGZEKWUJĄCYM CSP hydracja padłaby po cichu — zaktualizuj HASH_SKRYPTU_MOTYWU.`,
      );
    }
  }
}

/* KOLEKTOR CSP NIE PISZE DO BAZY.

   To jedyny w tym repozytorium punkt zapisu, który z natury NIE MOŻE być
   uwierzytelniony: raport wysyła silnik przeglądarki, więc nie da się go
   podpisać ani opatrzyć nonce'em (bliźniaczy beacon monitoringu podpisujemy
   tylko dlatego, że materiał do podpisu drukujemy sami). Dopóki wynik
   lądował w `wp_options`, każdy POST z internetu, który przeszedł sito typu
   treści, zapisywał się do wspólnego stanu aplikacji — a agregat nie miał
   w całym repozytorium ANI JEDNEGO czytelnika.

   Nośnikiem jest dziennik serwera: nie jest wspólnym stanem, rotuje sam
   i bywa czytany. Sito typu treści i limit z adresu zostają. */
{
  const t = readFileSync(MU, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const i = t.indexOf("function dopisz_do_agregatu(");
  if (i < 0) {
    bledy.push(
      "aai-obwod.php: nie ma dopisz_do_agregatu() — samokontrola zakresu reguły o nieuwierzytelnionym zapisie kolektora CSP."
    );
  } else {
    const cialo = t.slice(i, t.indexOf("\n\t}", i));
    if (/update_option\s*\(/.test(cialo) || /\$wpdb\b/.test(cialo)) {
      bledy.push(
        "aai-obwod.php: kolektor CSP zapisuje raport do bazy. To punkt PUBLICZNY i z natury nieuwierzytelniony (raport wysyła przeglądarka, nie nasz kod), więc każdy POST z internetu dopisywałby się do wspólnego stanu aplikacji. Nośnikiem ma być dziennik serwera."
      );
    }
    if (!/error_log\s*\(/.test(cialo)) {
      bledy.push(
        "aai-obwod.php: kolektor CSP niczego nie zapisuje — naruszenie polityki przepadałoby bez śladu, a to jedyny sygnał o zmianie w cudzym statycznym skrypcie pod egzekwowaniem."
      );
    }
  }
}

if (bledy.length > 0) {
  console.error(`straznik-obwodu: ${bledy.length} naruszeń:\n- ${bledy.join("\n- ")}`);
  process.exit(1);
}
console.log("straznik-obwodu: obwód na miejscu (XML-RPC off, S-2 + author enum + mapa autorów, mapa bez dostawcy oddaje 404, hasła aplikacji off, 4 nagłówki, CSP egzekwujące z nonce + 2 hashe + kolektor piszący do dziennika, nie do bazy, hash motywu zgodny).");
