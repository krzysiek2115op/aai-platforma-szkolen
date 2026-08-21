/**
 * Pobiera oryginalną dokumentację techniczną dla etapu WordPress
 * (WYTYCZNE §7 i N2).
 *
 * PO CO TO ISTNIEJE. Sklep z prototypu Next.js zostanie odtworzony jako
 * wtyczka WordPressa (docs/ETAP-WP.md), a wtyczka ma współpracować
 * z Tutor LMS i WooCommerce. Kod PHP ma powstawać z ORYGINALNEJ
 * dokumentacji wydawców, nie z pamięci modelu — pamięć modelu myli wersje
 * API, a w WordPressie różnica między `$wpdb->prepare()` a sklejaniem
 * zapytania to różnica między wtyczką a dziurą w sklepie.
 *
 * DLACZEGO PLIKI LEŻĄ POZA REPO. Tak jak przy Dziale 7: git przechowuje
 * każdą wersję na stałe, więc komplet dokumentacji obciążyłby każde
 * klonowanie już zawsze. Do repozytorium idzie ten skrypt i opis źródeł
 * (docs/dokumentacja-techniczna/wordpress/ZRODLA.md), a pilnuje tego
 * `straznik-wagi-dokumentacji`.
 *
 * JAK DZIAŁA. Idempotentnie — plik już pobrany pomija, więc przerwane
 * pobieranie wznawia się bez strat i bez ponownego obciążania serwerów.
 * Tempo jest celowo wolne (2 wątki, przerwa, ponawianie z narastającym
 * odczekaniem i honorowaniem `Retry-After`) — lekcja z D7, gdzie sześć
 * wątków bez przerw wywołało HTTP 429 i zostawiło DZIURAWĄ dokumentację,
 * czyli stan gorszy niż jej brak, bo nie widać, czego brakuje.
 *
 * TRZY KANAŁY ŹRÓDŁOWE, bo wydawcy publikują różnie:
 *  1. REST API WordPressa — developer.wordpress.org i docs.themeum.com to
 *     WordPressy, więc oddają treść przez `/wp-json/wp/v2/<typ>`; treść
 *     przychodzi jako HTML i tu jest zamieniana na markdown.
 *  2. Repozytorium GitHuba — WooCommerce trzyma dokumentację dewelopera
 *     w monorepo jako gotowy markdown (`docs/**.md`).
 *  3. Zwykły HTML — manual MySQL-a nie ma innego kanału; z każdej strony
 *     wycinany jest sam artykuł (`id="docs-body"`), reszta to nawigacja.
 *
 * ZAKRES JEST PRZYCIĘTY do tego, czego etap WP faktycznie używa —
 * uzasadnienie każdego cięcia stoi w ZRODLA.md.
 *
 * Użycie: node tools/pobierz-dokumentacje-wp.mjs
 */
import { mkdir, writeFile, access } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const KORZEN = join(dirname(fileURLToPath(import.meta.url)), "..");
const CEL = join(KORZEN, "docs", "dokumentacja-techniczna", "wordpress");

/**
 * MANIFEST — jedyne źródło prawdy o tym, co ten skrypt kładzie na dysku.
 *
 * Czyta go `straznik-wagi-dokumentacji`, żeby wiedzieć, które katalogi mają
 * zostać poza gitem. Dzięki temu strażnik nie trzyma własnej kopii listy,
 * która milczkiem rozjechałaby się ze skryptem po dopisaniu nowego źródła.
 * Skrypt jest z tego powodu bezpieczny do zaimportowania: pobieranie rusza
 * dopiero po sprawdzeniu, czy plik uruchomiono wprost (na dole).
 */
export const KATALOG_DZIALU = "docs/dokumentacja-techniczna/wordpress";
export const KATALOGI_MASOWE = [
  "wp-wtyczki",
  "wp-motywy",
  "wp-api",
  "wp-rest",
  "wp-standardy",
  "wp-bloki",
  "wp-referencja",
  "woocommerce",
  "tutor-lms",
  "mysql",
];

/* ─────────────────────────── ZAKRESY ─────────────────────────── */

/**
 * Podręczniki developer.wordpress.org brane w CAŁOŚCI — każdy z nich
 * dotyczy warstwy, którą wtyczka realizuje sama (patrz podział
 * odpowiedzialności w docs/ETAP-WP.md).
 */
const PODRECZNIKI_WP = [
  { typ: "plugin-handbook", katalog: "wp-wtyczki", prefiks: "/plugins/" },
  { typ: "theme-handbook", katalog: "wp-motywy", prefiks: "/themes/" },
  { typ: "apis-handbook", katalog: "wp-api", prefiks: "/apis/" },
  { typ: "rest-api-handbook", katalog: "wp-rest", prefiks: "/rest-api/" },
  { typ: "wpcs-handbook", katalog: "wp-standardy", prefiks: "/coding-standards/" },
];

/**
 * Block Editor Handbook ma 572 strony, z czego większość to katalog bloków
 * rdzenia, biblioteka komponentów React edytora i API paczek `@wordpress/*`.
 * Nie budujemy bloków w JavaScripcie — potrzebujemy warstwy, przez którą
 * wtyczka DZIEDZICZY wygląd motywu (theme.json, style globalne) i tego, jak
 * motyw blokowy składa szablony. Stąd wybór sekcji zamiast kompletu.
 */
const SEKCJE_BLOKOW = [
  /^\/block-editor\/reference-guides\/theme-json-reference(\/|$)/,
  /^\/block-editor\/reference-guides\/block-api(\/|$)/,
  /^\/block-editor\/reference-guides\/filters(\/|$)/,
  /^\/block-editor\/getting-started\/fundamentals(\/|$)/,
  /^\/block-editor\/how-to-guides\/themes(\/|$)/,
  /^\/block-editor\/how-to-guides\/curating-the-editor-experience(\/|$)/,
  /^\/block-editor\/how-to-guides\/enqueueing-assets-in-the-editor(\/|$)/,
];

/**
 * Code Reference to ponad 3600 funkcji — bierzemy wyłącznie te, których
 * wtyczka faktycznie użyje. Powód jest praktyczny: przy pisaniu PHP liczy
 * się DOKŁADNA sygnatura i lista parametrów, a nie ogólne wrażenie, że
 * „coś takiego istnieje". Lista rośnie razem z kodem wtyczki.
 */
const REFERENCJA_KLASY = ["wpdb"];
const REFERENCJA_FUNKCJE = [
  // własne tabele i zapytania (odpowiednik D2: schemat + audyt)
  "dbdelta", "maybe_create_table", "get_option", "update_option", "add_option",
  "delete_option", "register_activation_hook", "register_deactivation_hook",
  "register_uninstall_hook", "get_transient", "set_transient", "delete_transient",
  "wp_cache_get", "wp_cache_set", "wp_cache_delete",
  // REST i jedyny kanał zapisu (odpowiednik D3)
  "register_rest_route", "rest_ensure_response", "wp_send_json_success",
  "wp_send_json_error", "check_ajax_referer", "wp_verify_nonce", "wp_create_nonce",
  "wp_nonce_field", "admin_url", "rest_url", "wp_remote_get", "wp_remote_post",
  // bezpieczeństwo: uprawnienia, sanitizacja, escapowanie (krok 2 planu)
  "current_user_can", "is_user_logged_in", "wp_get_current_user",
  "sanitize_text_field", "sanitize_textarea_field", "sanitize_key",
  "sanitize_title", "sanitize_email", "sanitize_url", "wp_kses", "wp_kses_post",
  "wp_unslash", "absint", "esc_html", "esc_attr", "esc_url", "esc_url_raw",
  "esc_textarea", "esc_html__", "esc_attr__", "wp_json_encode", "wp_slash",
  // widok: trasy, szablony, kolejkowanie zasobów, menu (odpowiednik D4/D5)
  "add_rewrite_rule", "add_rewrite_tag", "flush_rewrite_rules", "get_query_var",
  "wp_enqueue_script", "wp_enqueue_style", "wp_register_style", "wp_register_script",
  "wp_add_inline_style", "wp_localize_script", "get_template_part",
  "locate_template", "load_template", "wp_head", "wp_footer", "get_stylesheet_directory",
  "wp_get_global_settings", "wp_get_global_styles", "wp_is_block_theme",
  "register_block_type", "add_shortcode", "wp_register_sidebar_widget",
  // kokpit kreatora (odpowiednik D6)
  "add_menu_page", "add_submenu_page", "add_action", "add_filter",
  "register_post_type", "register_taxonomy", "register_setting",
  "add_settings_field", "settings_fields", "wp_insert_post", "wp_update_post",
  // wielojęzyczność i wersjonowanie
  "load_plugin_textdomain", "plugin_dir_path", "plugin_dir_url", "plugins_url",
  "get_plugin_data", "wp_get_environment_type",
];
const REFERENCJA_HAKI = [
  "template_include", "init", "rest_api_init", "admin_menu", "admin_enqueue_scripts",
  "wp_enqueue_scripts", "query_vars", "template_redirect", "plugins_loaded",
  "wp_head", "the_content", "wp_nav_menu_items", "body_class",
];

/**
 * WooCommerce trzyma dokumentację dewelopera w monorepo jako markdown.
 * Bierzemy to, co dotyczy integracji (produkt, zamówienie, dostęp po
 * zakupie, pliki do pobrania) i pisania rozszerzeń; odpuszczamy budowę
 * bloków Woo, wkład do projektu i sprawy sklepu z rozszerzeniami.
 */
const SEKCJE_WOO = [
  "docs/getting-started/",
  "docs/apis/",
  "docs/best-practices/",
  "docs/code-snippets/",
  "docs/extensions/",
  "docs/features/",
  "docs/theming/",
  "docs/wc-cli/",
];

/**
 * Tutor LMS: docs.themeum.com serwuje dokumentację wszystkich produktów
 * Themeum, więc najpierw filtr po adresie, potem cięcie sekcji, które nie
 * dotyczą naszej instalacji (integracje z page builderami, których nie
 * używamy — wyjątkiem jest WooCommerce, bo na nim stoi cała sprzedaż).
 */
const TUTOR_PREFIKS = "https://docs.themeum.com/tutor-lms/";
const TUTOR_POZA_ZAKRESEM = [
  /^third-party-integration\/(?!woocommerce)/,
  /^kirki-integration\//,
];

/**
 * Manual MySQL-a: strony potrzebne przy przenoszeniu schematu z Postgresa
 * (typy, kodowanie, indeksy, transakcje, wyzwalacze pod audyt zmian).
 * Wersja 8.4 to bieżące LTS; dla tych rozdziałów 8.0 i MariaDB nie różnią
 * się w sposób, który zmieniałby projekt schematu.
 */
const MYSQL_WERSJA = "8.4";
const STRONY_MYSQL = [
  // typy danych
  "data-types", "numeric-types", "integer-types", "fixed-point-types",
  "floating-point-types", "date-and-time-types", "datetime", "string-types",
  "char", "blob", "json", "data-type-defaults", "storage-requirements",
  // kodowanie znaków (utf8mb4 — polskie znaki i emoji w treści kursów)
  "charset", "charset-unicode-utf8mb4", "charset-connection", "charset-column",
  "charset-collation-names", "charset-mysql",
  // indeksy i wydajność
  "mysql-indexes", "optimization-indexes", "create-index", "innodb-index-types",
  "column-indexes", "multiple-column-indexes", "index-btree-hash",
  "optimizing-database-structure", "using-explain",
  // klucze obce i integralność
  "create-table-foreign-keys", "constraint-foreign-key", "constraint-primary-key",
  // transakcje i blokowanie
  "sql-transactional-statements", "commit", "innodb-transaction-model",
  "innodb-transaction-isolation-levels", "innodb-locking", "innodb-deadlocks",
  "innodb-autocommit-commit-rollback", "savepoint",
  // wyzwalacze (odpowiednik audytu course_changelog z Działu 2)
  "triggers", "trigger-syntax", "trigger-metadata", "create-trigger",
  "drop-trigger", "stored-programs-defining", "faqs-triggers",
  // struktura tabel
  "create-table", "alter-table", "innodb-storage-engine", "innodb-row-format",
];

/* ─────────────────────────── NARZĘDZIA ─────────────────────────── */

const AGENT = "pobierz-dokumentacje-wp (Pod-strona-Szkolenia, dokumentacja projektu)";
const spij = (ms) => new Promise((r) => setTimeout(r, ms));
const istnieje = (p) => access(p).then(() => true, () => false);

async function pobierz(url, { json = false, proby = 6 } = {}) {
  for (let i = 0; i < proby; i++) {
    try {
      const r = await fetch(url, {
        redirect: "follow",
        headers: { "user-agent": AGENT, accept: json ? "application/json" : "*/*" },
      });
      if (r.status === 429 || r.status >= 500) {
        const retry = Number(r.headers.get("retry-after")) || 0;
        await spij(retry ? retry * 1000 : 4000 * (i + 1));
        continue;
      }
      if (!r.ok) return null; // 404 itp. — strona zniknęła z indeksu
      if (json) return { dane: await r.json(), naglowki: r.headers };
      const t = await r.text();
      return t.trim() ? t : null;
    } catch {
      await spij(4000 * (i + 1));
    }
  }
  return null;
}

/**
 * Uruchamia zadania parami, z przerwą — przerwa należy się serwerowi.
 *
 * Wynik zadania rozróżnia PUSTĄ STRONĘ U WYDAWCY od nieudanego pobrania.
 * Bez tego rozróżnienia komplet nigdy nie byłby kompletny: Tutor LMS ma
 * 13 stron-rozdzielaczy z pustą treścią (sama gałąź spisu treści), więc
 * skrypt kończyłby się błędem po każdym, choćby idealnym, przebiegu —
 * a alarm, który dzwoni zawsze, przestaje cokolwiek znaczyć.
 */
async function pula(zadania, etykieta) {
  let i = 0, ok = 0, pominiete = 0, puste = 0, brak = 0;
  const robotnik = async () => {
    while (i < zadania.length) {
      const wynik = await zadania[i++]();
      if (wynik === "ok") ok++;
      else if (wynik === "jest") pominiete++;
      else if (wynik === "pusta") puste++;
      else brak++;
      const zrobione = ok + pominiete + puste + brak;
      if (zrobione % 100 === 0) console.log(`  ${etykieta}: ${zrobione}/${zadania.length}`);
      // plik już pobrany nie kosztował żądania, więc wznowienie nie czeka
      if (wynik !== "jest") await spij(300);
    }
  };
  await Promise.all([robotnik(), robotnik()]);
  const opisPustych = puste > 0 ? `, pustych u wydawcy ${puste}` : "";
  console.log(`${etykieta}: pobrano ${ok}, było już ${pominiete}${opisPustych}, nie udało się ${brak}`);
  return brak;
}

async function zapisz(plik, tresc) {
  await mkdir(dirname(plik), { recursive: true });
  await writeFile(plik, tresc);
}

/* ──────────────────────── HTML → MARKDOWN ──────────────────────── */

const ENCJE = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", hellip: "…",
  mdash: "—", ndash: "–", rsquo: "'", lsquo: "'", ldquo: '"', rdquo: '"',
  laquo: "«", raquo: "»", copy: "©", reg: "®", trade: "™", deg: "°",
};

function odkoduj(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENCJE[n.toLowerCase()] ?? m);
}

/**
 * Zamienia HTML dokumentacji na markdown.
 *
 * KOLEJNOŚĆ MA ZNACZENIE: bloki kodu są najpierw ODKŁADANE na bok pod
 * znacznik zastępczy, bo inaczej dalsze reguły (usuwanie tagów, odkodowanie
 * encji, zwijanie pustych linii) zniszczyłyby przykłady PHP — a to one są
 * powodem, dla którego w ogóle pobieramy tę dokumentację. Wracają na
 * miejsce dopiero na końcu, nietknięte.
 *
 * Wyeksportowana, żeby dało się sprawdzić konwersję na pojedynczej stronie
 * przed puszczeniem pobierania całości — psucie przykładów kodu w tysiącu
 * plików naraz jest kosztowne, bo skrypt jest idempotentny i nie nadpisuje
 * tego, co już leży na dysku.
 */
export function naMarkdown(html) {
  const bloki = [];
  let s = html;

  s = s.replace(/<pre[^>]*>\s*<code([^>]*)>([\s\S]*?)<\/code>\s*<\/pre>/gi, (_, atrybuty, kod) => {
    const jezyk = /(?:lang|class)="(?:language-)?([a-z0-9+#-]+)"/i.exec(atrybuty)?.[1] ?? "";
    bloki.push("```" + (jezyk === "language" ? "" : jezyk) + "\n" + odkoduj(kod).replace(/\s+$/, "") + "\n```");
    return `%%BLOK${bloki.length - 1}%%`;
  });
  s = s.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, kod) => {
    bloki.push("```\n" + odkoduj(kod.replace(/<[^>]+>/g, "")).replace(/\s+$/, "") + "\n```");
    return `%%BLOK${bloki.length - 1}%%`;
  });

  // elementy, których treść jest szumem nawigacyjnym
  s = s.replace(/<(script|style|nav|noscript)[^>]*>[\s\S]*?<\/\1>/gi, "");

  /*
   * INLINE PRZED BLOKOWYMI. Nagłówki, pozycje list i komórki tabel biorą
   * swoją treść przez `czysty()`, które zdejmuje wszystkie tagi — gdyby
   * szły pierwsze, zjadłyby odsyłacze i wyróżnienia ze środka. Podręcznik
   * WordPressa prowadzi czytelnika właśnie listami odsyłaczy, więc taka
   * kolejność kosztowałaby najwięcej tam, gdzie najbardziej boli.
   */
  s = s.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_, t) => "`" + odkoduj(t.replace(/<[^>]+>/g, "")).trim() + "`");
  s = s.replace(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, t) => {
    const tekst = czysty(t);
    return tekst ? `[${tekst}](${href})` : "";
  });
  s = s.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, t) => (t.trim() ? `**${t.trim()}**` : ""));
  s = s.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, t) => (t.trim() ? `*${t.trim()}*` : ""));

  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<hr\s*\/?>/gi, "\n---\n");
  s = s.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, p, t) => `\n\n${"#".repeat(Number(p))} ${czysty(t)}\n\n`);
  /*
   * Pozycja listy i komórka tabeli kończą się na NASTĘPNYM znaczniku swojej
   * rodziny, a nie dopiero na własnym zamknięciu. Powód jest twardy:
   * WordPress generuje spisy treści z NIEDOMKNIĘTYMI `<li>`, więc przy
   * dopasowaniu pary „otwarcie–zamknięcie" wyrażenie połykało resztę
   * dokumentu, a `czysty()` spłaszczał ją do jednej linii — nagłówki, tabela
   * parametrów i sekcja ŹRÓDŁA zlewały się w jeden akapit. Złapane na
   * stronie dbDelta() w Code Reference.
   */
  s = s.replace(/<li[^>]*>((?:(?!<\/?li|<\/?[uo]l)[\s\S])*)/gi, (_, t) => `\n- ${czysty(t)}`);
  // Code Reference opisuje parametry funkcji listą definicyjną — bez tego
  // nazwa parametru, jego typ i opis zlewają się w jeden ciąg
  s = s.replace(/<dt[^>]*>((?:(?!<\/?d[tdl])[\s\S])*)/gi, (_, t) => `\n- ${czysty(t)}`);
  s = s.replace(/<dd[^>]*>((?:(?!<\/?d[tdl])[\s\S])*)/gi, (_, t) => `\n  ${czysty(t)}`);
  s = s.replace(/<(th|td)[^>]*>((?:(?!<\/?t[hdr])[\s\S])*)/gi, (_, __, t) => `| ${czysty(t)} `);
  s = s.replace(/<\/tr>/gi, "|\n");
  s = s.replace(/<\/(ul|ol|dl|table|div|section|article)>/gi, "\n\n");
  s = s.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, t) => `\n\n${t}\n\n`);

  s = s.replace(/<[^>]+>/g, "");
  s = odkoduj(s);
  // manual MySQL wcina prozę sześcioma spacjami, a markdown czyta cztery
  // spacje jako blok kodu — wcięcia lecą PRZED przywróceniem prawdziwych
  // bloków, żeby ich własnego formatowania nie ruszyć
  s = s.replace(/^[ \t]+/gm, "").replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n").trim();
  s = s.replace(/%%BLOK(\d+)%%/g, (_, n) => "\n\n" + bloki[Number(n)] + "\n\n");
  return s.replace(/\n{3,}/g, "\n\n") + "\n";
}

/** Tekst bez tagów, do nagłówków i etykiet odsyłaczy. */
function czysty(t) {
  return odkoduj(t.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}

function naglowek({ tytul, url, zrodlo }) {
  return `---\ntytul: ${JSON.stringify(tytul)}\nurl: ${url}\nzrodlo: ${zrodlo}\n---\n\n`;
}

/* ─────────────────────── KANAŁ 1: REST WordPressa ─────────────────────── */

/**
 * Wyciąga wszystkie wpisy danego typu przez REST API WordPressa.
 * Stronicowanie idzie po nagłówku `x-wp-totalpages`, bo pytanie o stronę
 * poza zakresem kończy się błędem 400, a nie pustą listą.
 */
async function wpisyTypu(baza, typ) {
  const wpisy = [];
  let stron = 1;
  for (let p = 1; p <= stron; p++) {
    const odp = await pobierz(
      `${baza}/wp-json/wp/v2/${typ}?per_page=100&page=${p}&_fields=link,title,content,slug`,
      { json: true },
    );
    if (!odp) throw new Error(`nie udało się pobrać ${typ} (strona ${p}) z ${baza}`);
    if (p === 1) stron = Number(odp.naglowki.get("x-wp-totalpages")) || 1;
    wpisy.push(...odp.dane);
    await spij(300);
  }
  return wpisy;
}

/** Ścieżka pliku z adresu strony — struktura katalogów odbija strukturę podręcznika. */
function plikZAdresu(katalog, link, prefiks) {
  let sciezka = new URL(link).pathname;
  if (prefiks && sciezka.startsWith(prefiks)) sciezka = sciezka.slice(prefiks.length);
  sciezka = sciezka.replace(/^\/+|\/+$/g, "") || "index";
  return join(CEL, katalog, sciezka + ".md");
}

async function zRestWordPressa({ baza, typ, katalog, prefiks, filtr, zrodlo }) {
  const wpisy = (await wpisyTypu(baza, typ)).filter((w) => (filtr ? filtr(w) : true));
  console.log(`${katalog}: ${wpisy.length} stron`);
  return wpisy.map((w) => async () => {
    const plik = plikZAdresu(katalog, w.link, prefiks);
    if (await istnieje(plik)) return "jest";
    const tresc = w.content?.rendered ?? "";
    if (!tresc.trim()) return "pusta"; // strona-rozdzielacz u wydawcy, nie błąd
    await zapisz(
      plik,
      naglowek({ tytul: czysty(w.title?.rendered ?? w.slug), url: w.link, zrodlo }) + naMarkdown(tresc),
    );
    return "ok";
  });
}

/* ────────────────── KANAŁ 2: markdown z repozytorium GitHuba ────────────────── */

async function zRepozytorium({ repo, galaz, sciezki, katalog }) {
  const odp = await pobierz(
    `https://api.github.com/repos/${repo}/git/trees/${galaz}?recursive=1`,
    { json: true },
  );
  if (!odp) throw new Error(`nie udało się pobrać drzewa plików ${repo}`);
  if (odp.dane.truncated) throw new Error(`drzewo ${repo} zostało obcięte przez API — zawęź zakres`);
  const pliki = odp.dane.tree
    .map((x) => x.path)
    .filter((p) => p.endsWith(".md") && sciezki.some((s) => p.startsWith(s)));
  console.log(`${katalog}: ${pliki.length} plików markdown`);
  return pliki.map((p) => async () => {
    const cel = join(CEL, katalog, p.replace(/^docs\//, ""));
    if (await istnieje(cel)) return "jest";
    const t = await pobierz(`https://raw.githubusercontent.com/${repo}/${galaz}/${p}`);
    if (!t) return "brak";
    await zapisz(cel, t);
    return "ok";
  });
}

/* ───────────────────── KANAŁ 3: HTML manuala MySQL ───────────────────── */

/**
 * Ze strony HTML wycinany jest sam artykuł. Bez tego cięcia większość
 * każdego pliku to powtórzone menu i stopka — szum, który rozmywa
 * wyszukiwanie w korpusie. Granice podajemy jako znaczniki z HTML-a,
 * bo obaj wydawcy mają je jawne i stabilne.
 */
function wytnij(html, poczatek, konce) {
  const start = html.indexOf(poczatek);
  if (start < 0) return null;
  const od = html.indexOf(">", start) + 1;
  const znalezione = konce.map((k) => html.indexOf(k, od)).filter((i) => i > 0);
  return html.slice(od, znalezione.length ? Math.min(...znalezione) : html.length);
}

const trescMysql = (html) =>
  wytnij(html, 'id="docs-body"', [
    'id="docs-in-page-nav-container"',
    'id="docs-body-extra"',
    'id="footer-bottom"',
  ]);

/**
 * Code Reference nie oddaje treści przez REST API — typy `wp-parser-*` mają
 * w odpowiedzi tytuł i odsyłacz, ale NIE mają pola `content` (sprawdzone).
 * Zostaje strona HTML, a w niej cały artykuł siedzi w jednym `<main>`:
 * sygnatura, parametry z typami i wartościami domyślnymi, zwracana wartość,
 * ŹRÓDŁO funkcji i uwagi społeczności — czyli dokładnie to, po co się tu
 * przychodzi, pisząc PHP.
 */
const trescReferencji = (html) => wytnij(html, "<main", ["</main"]);

function zadaniaMysql() {
  console.log(`mysql: ${STRONY_MYSQL.length} stron`);
  return STRONY_MYSQL.map((slug) => async () => {
    const plik = join(CEL, "mysql", slug + ".md");
    if (await istnieje(plik)) return "jest";
    const url = `https://dev.mysql.com/doc/refman/${MYSQL_WERSJA}/en/${slug}.html`;
    const html = await pobierz(url);
    if (!html) return "brak";
    const wnetrze = trescMysql(html);
    if (!wnetrze) return "brak";
    const tytul = czysty(/<title>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? slug);
    await zapisz(
      plik,
      naglowek({ tytul, url, zrodlo: `MySQL ${MYSQL_WERSJA} Reference Manual` }) + naMarkdown(wnetrze),
    );
    return "ok";
  });
}

/* ─────────────────────────── PRZEBIEG ─────────────────────────── */

/*
 * Pobieranie rusza WYŁĄCZNIE przy uruchomieniu wprost. Import (robi to
 * straznik-wagi-dokumentacji, żeby odczytać manifest) nie może ściągać
 * dokumentacji z sieci ani kończyć procesu kodem błędu.
 */
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const WPORG = "https://developer.wordpress.org";
  let bledy = 0;

  for (const { typ, katalog, prefiks } of PODRECZNIKI_WP) {
    bledy += await pula(
      await zRestWordPressa({ baza: WPORG, typ, katalog, prefiks, zrodlo: `${WPORG} (${typ})` }),
      katalog,
    );
  }

  bledy += await pula(
    await zRestWordPressa({
      baza: WPORG,
      typ: "blocks-handbook",
      katalog: "wp-bloki",
      prefiks: "/block-editor/",
      zrodlo: `${WPORG} (blocks-handbook)`,
      filtr: (w) => SEKCJE_BLOKOW.some((re) => re.test(new URL(w.link).pathname)),
    }),
    "wp-bloki",
  );

  // Code Reference: po nazwie, nie hurtem, i ze strony HTML — powód przy
  // trescReferencji(): REST tych typów nie oddaje treści
  const referencja = [
    ["classes", REFERENCJA_KLASY],
    ["functions", REFERENCJA_FUNKCJE],
    ["hooks", REFERENCJA_HAKI],
  ];
  console.log(`wp-referencja: ${referencja.reduce((n, [, l]) => n + l.length, 0)} haseł`);
  bledy += await pula(
    referencja.flatMap(([rodzaj, nazwy]) =>
      nazwy.map((nazwa) => async () => {
        const plik = join(CEL, "wp-referencja", rodzaj, nazwa + ".md");
        if (await istnieje(plik)) return "jest";
        const url = `${WPORG}/reference/${rodzaj}/${nazwa}/`;
        const html = await pobierz(url);
        const wnetrze = html && trescReferencji(html);
        if (!wnetrze) return "brak";
        const tytul = czysty(/<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(wnetrze)?.[1] ?? nazwa);
        await zapisz(plik, naglowek({ tytul, url, zrodlo: `${WPORG} (Code Reference)` }) + naMarkdown(wnetrze));
        return "ok";
      }),
    ),
    "wp-referencja",
  );

  bledy += await pula(
    await zRepozytorium({
      repo: "woocommerce/woocommerce",
      galaz: "trunk",
      sciezki: SEKCJE_WOO,
      katalog: "woocommerce",
    }),
    "woocommerce",
  );

  bledy += await pula(
    await zRestWordPressa({
      baza: "https://docs.themeum.com",
      typ: "docs",
      katalog: "tutor-lms",
      prefiks: "/tutor-lms/",
      zrodlo: "https://docs.themeum.com/tutor-lms (Tutor LMS)",
      filtr: (w) => {
        if (!w.link.startsWith(TUTOR_PREFIKS)) return false;
        const reszta = w.link.slice(TUTOR_PREFIKS.length);
        return !TUTOR_POZA_ZAKRESEM.some((re) => re.test(reszta));
      },
    }),
    "tutor-lms",
  );

  bledy += await pula(zadaniaMysql(), "mysql");

  if (bledy > 0) {
    console.error(`\nNIEKOMPLETNE: ${bledy} stron się nie pobrało. Uruchom ponownie —`);
    console.error("skrypt pomija to, co już jest, więc dobierze tylko braki.");
    process.exit(1);
  }
  console.log("\nGotowe — komplet dokumentacji dla etapu WordPress.");
}
