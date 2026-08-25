/**
 * Strażnik wtyczek WordPressa — reguły, których złamanie NIE objawia się
 * błędem.
 *
 * PO CO. Wtyczka WP działa nawet wtedy, gdy brakuje jej ochrony przed
 * bezpośrednim wywołaniem pliku, gdy nazwy tabel są wklepane na sztywno
 * w dziesięciu miejscach albo gdy odinstalowanie kasuje treść dwóch
 * kursów bez pytania. Objaw pojawia się dopiero u klienta — czyli za
 * późno. To ta sama klasa co CSP i limiter w prototypie: strona działa,
 * tylko przestaje chronić.
 *
 * SIEDEM NIEZMIENNIKÓW (każdy z własną mutacją w audyt-straznikow):
 *   1. plik główny ma komplet nagłówków WordPressa,
 *   2. każdy plik PHP blokuje bezpośrednie wywołanie (`ABSPATH`),
 *   3. nazwy tabel składa WYŁĄCZNIE klasa tabel — nigdzie indziej nie
 *      wolno wklepać prefiksu na sztywno,
 *   4. `uninstall.php` istnieje,
 *   5. …i NIE kasuje danych bez jawnej zgody właściciela,
 *   6. zapytania z wartościami idą przez `$wpdb->prepare()` — żadnego
 *      sklejania danych z SQL-em (odpowiednik straznik-granic),
 *   7. treść lekcji jest `mediumtext`, nie `text` (65 kB ucięłoby lekcję
 *      w milczeniu — kontrakt dopuszcza 120 000 znaków).
 *
 * Użycie: node tools/straznicy/straznik-wtyczki-wp.mjs
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const KATALOG_WTYCZEK = "wordpress/wtyczki";
const bledy = [];

/** Wszystkie pliki .php danej wtyczki. */
function plikiPhp(katalog) {
  const wynik = [];
  for (const wpis of readdirSync(katalog)) {
    const sciezka = join(katalog, wpis);
    if (statSync(sciezka).isDirectory()) wynik.push(...plikiPhp(sciezka));
    else if (wpis.endsWith(".php")) wynik.push(sciezka);
  }
  return wynik;
}

/** Kod bez komentarzy — reguły mają celować w ZACHOWANIE, nie w opis. */
const kod = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

if (!existsSync(KATALOG_WTYCZEK)) {
  console.log(
    "straznik-wtyczki-wp: pominięte — nie ma jeszcze katalogu wordpress/wtyczki."
  );
  process.exit(0);
}

const wtyczki = readdirSync(KATALOG_WTYCZEK).filter((w) =>
  statSync(join(KATALOG_WTYCZEK, w)).isDirectory()
);

for (const wtyczka of wtyczki) {
  const katalog = join(KATALOG_WTYCZEK, wtyczka);
  const glowny = join(katalog, `${wtyczka}.php`);

  /* 1. nagłówki wtyczki */
  if (!existsSync(glowny)) {
    bledy.push(
      `${katalog}: brak pliku głównego ${wtyczka}.php — WordPress nie rozpozna tego katalogu jako wtyczki.`
    );
    continue;
  }
  const trescGlownego = readFileSync(glowny, "utf8");
  for (const naglowek of [
    "Plugin Name:",
    "Description:",
    "Version:",
    "Requires PHP:",
    "License:",
    "Text Domain:",
  ]) {
    if (!trescGlownego.includes(naglowek)) {
      bledy.push(
        `${glowny}: brak nagłówka „${naglowek}" — bez kompletu WordPress pokazuje wtyczkę bez opisu, a część narzędzi jej nie zaktualizuje.`
      );
    }
  }

  /* 2. ochrona przed bezpośrednim wywołaniem */
  for (const plik of plikiPhp(katalog)) {
    const tresc = readFileSync(plik, "utf8");
    if (tresc.trim().split("\n").length <= 3) continue; // pliki-ciszy (index.php)
    const chroniony =
      /defined\(\s*['"]ABSPATH['"]\s*\)/.test(tresc) ||
      /defined\(\s*['"]WP_UNINSTALL_PLUGIN['"]\s*\)/.test(tresc);
    if (!chroniony) {
      bledy.push(
        `${plik}: brak blokady bezpośredniego wywołania (defined('ABSPATH') || exit). Plik wtyczki wywołany wprost z przeglądarki wykonuje się poza WordPressem — bez uprawnień, bez nonce'ów i bez niczego, co go pilnuje.`
      );
    }
  }

  /* 3. nazwy tabel tylko z klasy tabel */
  const klasaTabel = join(katalog, "includes", `class-${wtyczka}-tabele.php`);
  for (const plik of plikiPhp(katalog)) {
    if (plik === klasaTabel || plik.endsWith("uninstall.php")) continue;
    const tresc = kod(readFileSync(plik, "utf8"));
    if (/\$wpdb->prefix\s*\.\s*['"]/.test(tresc)) {
      bledy.push(
        `${plik}: nazwa tabeli składana na sztywno z $wpdb->prefix. Prefiks ma jedno źródło (klasa tabel) — inaczej zmiana nazwy tabeli wymaga znalezienia wszystkich miejsc, a te, których nikt nie znajdzie, wywalą się dopiero na produkcji.`
      );
    }
  }

  /* 4–5. uninstall.php i ochrona treści */
  const uninstall = join(katalog, "uninstall.php");
  if (!existsSync(uninstall)) {
    bledy.push(
      `${katalog}: brak uninstall.php — wtyczka usunięta z panelu zostawia po sobie tabele i opcje na zawsze.`
    );
  } else {
    const tresc = kod(readFileSync(uninstall, "utf8"));
    const kasuje = /DROP TABLE/i.test(tresc);
    const pytaOZgode = /get_option\(\s*['"][a-z0-9_]*kasuj/i.test(tresc);
    if (kasuje && !pytaOZgode) {
      bledy.push(
        `${uninstall}: kasuje tabele BEZ sprawdzania jawnej zgody właściciela. „Usuń" przy wtyczce klika się też przy przeinstalowaniu i przy diagnozie konfliktu — a w tych tabelach leży treść kursów.`
      );
    }
  }

  /* 6. zapytania parametryzowane */
  for (const plik of plikiPhp(katalog)) {
    const tresc = kod(readFileSync(plik, "utf8"));
    // Sklejanie zmiennej wprost w SQL-u wewnątrz wywołania $wpdb->
    const podejrzane = tresc.match(
      /\$wpdb->(get_var|get_row|get_col|get_results|query)\(\s*["'][^"']*\$(?!wpdb)/g
    );
    if (podejrzane) {
      bledy.push(
        `${plik}: zapytanie do bazy skleja zmienną z SQL-em (${podejrzane.length} miejsc). Wartości idą przez $wpdb->prepare() — to jedyna granica między wejściem a bazą.`
      );
    }
  }

  /* 7. treść lekcji nie mieści się w `text` */
  if (existsSync(klasaTabel)) {
    const tresc = readFileSync(klasaTabel, "utf8");
    if (/content\s+text\b/i.test(tresc)) {
      bledy.push(
        `${klasaTabel}: kolumna treści zadeklarowana jako typ „text” (65 kB). Kontrakt dopuszcza 120 000 znaków, a MySQL ucina nadmiar W MILCZENIU — to cicha utrata treści, czyli najgorsza klasa błędu w tym projekcie.`
      );
    }
  }
}

if (bledy.length > 0) {
  console.error("straznik-wtyczki-wp:");
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}

console.log(
  `straznik-wtyczki-wp: ${wtyczki.length} wtyczka/wtyczki w porządku (nagłówki, blokada wywołania, jedno źródło nazw tabel, uninstall nie kasuje treści bez zgody, zapytania parametryzowane).`
);
