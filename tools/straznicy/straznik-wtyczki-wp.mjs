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
 * DZIEWIĘĆ NIEZMIENNIKÓW (każdy z własną mutacją w audyt-straznikow):
 *   1. plik główny ma komplet nagłówków WordPressa,
 *   2. każdy plik PHP blokuje bezpośrednie wywołanie (`ABSPATH`),
 *   3. nazwy tabel składa WYŁĄCZNIE klasa tabel — nigdzie indziej nie
 *      wolno wklepać prefiksu na sztywno,
 *   4. `uninstall.php` istnieje,
 *   5. …i NIE kasuje danych bez jawnej zgody właściciela,
 *   6. do SQL-a wolno wkleić WYŁĄCZNIE nazwę tabeli z klasy tabel;
 *      każda wartość idzie przez `$wpdb->prepare()` (odpowiednik
 *      straznik-granic),
 *   7. treść lekcji jest `mediumtext`, nie `text` (65 kB ucięłoby lekcję
 *      w milczeniu — kontrakt dopuszcza 120 000 znaków),
 *   8. do NASZYCH tabel pisze wyłącznie warstwa zapisu — to ona zna
 *      transakcje, dziennik audytu i ochronę napisanej treści,
 *   9. JSON w warstwie zapisu ma STAŁY kształt (klucze uporządkowane) —
 *      inaczej „czy się zmieniło" kłamie przy każdej zmianie pisarza
 *      (BLAD-020: zapis bez zmian meldował „zapisano" i puchł dziennik).
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

  /* 6. do SQL-a wolno wkleić tylko nazwę tabeli */
  //
  // Poprzednia wersja tej reguły szukała JAKIEJKOLWIEK zmiennej w łańcuchu
  // podanym do `$wpdb->`, więc oskarżała też `"SELECT * FROM `$t_kursy`"` —
  // a nazwy tabeli nie da się podać przez `prepare()` (to identyfikator,
  // nie wartość). Reguła celuje teraz w ZACHOWANIE: nazwa tabeli wzięta
  // z klasy tabel jest kodem i wolno ją wkleić; wszystko inne to wartość
  // i musi iść przez `prepare()`. Ta sama lekcja co przy `straznik-limitera`
  // w 0.28.0 — wzorzec przypięty do nazwy przestaje pilnować rzeczy.
  for (const plik of plikiPhp(katalog)) {
    const tresc = kod(readFileSync(plik, "utf8"));

    // Zmienne trzymające nazwę tabeli: `$x = Cokolwiek_Tabele::tabela( … )`.
    const nazwyTabel = new Set(
      [...tresc.matchAll(/\$(\w+)\s*=\s*[A-Za-z_][\w]*_Tabele::tabela\(/g)].map((m) => m[1])
    );

    const wywolania = tresc.matchAll(
      /\$wpdb->(?:get_var|get_row|get_col|get_results|query|prepare)\(\s*(["'])((?:\\.|(?!\1)[\s\S])*?)\1/g
    );
    const podejrzane = [];
    for (const [, , sql] of wywolania) {
      const bezWpdb = sql
        .replace(/\{\$(\w+)\}/g, "$$$1") // `{$tabela}` → `$tabela`
        .replace(/\$wpdb->\w+/g, ""); // `$wpdb->posts` to tabela WordPressa
      for (const [, zmienna] of bezWpdb.matchAll(/\$(\w+)/g)) {
        if (!nazwyTabel.has(zmienna)) podejrzane.push(zmienna);
      }
    }
    if (podejrzane.length > 0) {
      bledy.push(
        `${plik}: do SQL-a wklejone zmienne spoza klasy tabel (${[...new Set(podejrzane)].map((z) => "$" + z).join(", ")}). Nazwę tabeli wolno wkleić, bo to identyfikator z kodu; wartość musi iść przez $wpdb->prepare() — to jedyna granica między wejściem a bazą.`
      );
    }
  }

  /* 8. do naszych tabel pisze wyłącznie warstwa zapisu */
  //
  // W Postgresie prototypu tę gwarancję dawały TRIGGERY: dziennik audytu
  // powstawał w bazie i kod aplikacji nie umiał go ominąć. Tutaj dziennik
  // pisze PHP (uprawnienie TRIGGER bywa na hostingu odebrane), więc
  // gwarancję musi dać architektura — a architektury pilnuje strażnik.
  // Zapis z pominięciem tej warstwy nie objawia się błędem: dane wchodzą,
  // tylko bez transakcji, bez wpisu w dzienniku i bez pytania o zgodę na
  // skasowanie napisanych lekcji.
  const warstwaZapisu = join(katalog, "includes", `class-${wtyczka}-zapis.php`);
  for (const plik of plikiPhp(katalog)) {
    if (plik === warstwaZapisu || plik.endsWith("uninstall.php")) continue;
    const tresc = kod(readFileSync(plik, "utf8"));
    const zapisy = [
      ...tresc.matchAll(/\$wpdb->(insert|update|delete|replace)\s*\(/g),
      ...tresc.matchAll(
        /\$wpdb->query\(\s*["']?\s*(INSERT|UPDATE|DELETE|REPLACE|TRUNCATE|DROP|ALTER)\b/gi
      ),
    ].map((m) => m[1].toLowerCase());
    if (zapisy.length > 0) {
      bledy.push(
        `${plik}: pisze do bazy z pominięciem warstwy zapisu (${[...new Set(zapisy)].join(", ")}). Do naszych tabel wolno pisać wyłącznie z ${warstwaZapisu} — tam mieszkają transakcja, dziennik audytu i odmowa skasowania napisanej treści. Zapis obok nich niczego nie zgłasza; po prostu tych rzeczy nie ma.`
      );
    }
  }

  /* 9. JSON w warstwie zapisu ma STAŁY kształt */
  //
  // Porównanie „czy się zmieniło" robimy na ŁAŃCUCHU JSON-a, więc ten sam
  // obiekt musi zawsze dawać ten sam łańcuch. `wp_json_encode` zachowuje
  // kolejność kluczy tablicy — a klucze układa ten, kto akurat pisze:
  // import w kolejności eksportu, panel w kolejności opisu pól. Bez
  // porządkowania pierwszy zapis po imporcie przepisywał WSZYSTKIE sekcje,
  // dopisywał tyleż wierszy do dziennika zmian i meldował „Kurs zapisany",
  // choć właściciel niczego nie dotknął (BLAD-020). Dziennik ma nieść
  // wyłącznie realne zmiany — to decyzja właściciela z 0.37.0.
  if (existsSync(warstwaZapisu)) {
    const tresc = kod(readFileSync(warstwaZapisu, "utf8"));
    for (const [wywolanie] of tresc.matchAll(/wp_json_encode\(([\s\S]{0,120})/g)) {
      if (!/uporzadkuj\s*\(/.test(wywolanie)) {
        bledy.push(
          `${warstwaZapisu}: koduje JSON bez uporządkowania kluczy. Porównanie „czy się zmieniło" jest tu porównaniem łańcuchów, więc ta sama treść zapisana w innej kolejności kluczy udaje zmianę: dziennik audytu puchnie o wpisy bez zmian, a panel melduje „zapisano" po zapisie, w którym niczego nie dotknięto (BLAD-020).`
        );
      }
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
  `straznik-wtyczki-wp: ${wtyczki.length} wtyczka/wtyczki w porządku (nagłówki, blokada wywołania, jedno źródło nazw tabel, uninstall nie kasuje treści bez zgody, wartości przez prepare, zapis tylko przez warstwę zapisu, JSON o stałym kształcie).`
);
