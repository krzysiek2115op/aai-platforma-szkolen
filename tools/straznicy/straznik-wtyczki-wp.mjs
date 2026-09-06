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
 * CZTERNAŚCIE NIEZMIENNIKÓW (każdy z własną mutacją w audyt-straznikow):
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
 *      (BLAD-020: zapis bez zmian meldował „zapisano" i puchł dziennik),
 *  10. SQL jedzie do `$wpdb->` DOSŁOWNIE, nie zmienną — inaczej reguła 6
 *      go nie widzi i cała granica „wartość przez prepare()" przestaje
 *      obowiązywać dla każdego, kto sklei zapytanie linijkę wyżej,
 *  11. żadna wtyczka nie pisze do tabel siostry — cudze dane wyłącznie
 *      przez publiczne API właściciela,
 *  12. archiwum o tej samej nazwie niesie tę samą TREŚĆ — nazwa paczki
 *      jest dla klienta obietnicą wersji,
 *  13. handler szwu `aai_*` przyjmuje cudzą odpowiedź bez twardego typu
 *      i ma osłonę `catch ( Throwable )` — filtr jest publiczny, a te
 *      biegną w kasie i na stronie płatnej lekcji (MAR-A-20),
 *  14. odinstalowanie deklarujące kasowanie sprząta TAKŻE poza własnymi
 *      tabelami i nie zostawia opcji zmieniającej zachowanie świeżej
 *      instalacji (MAR-A-16).
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

  /* 1b. wersja w nagłówku = wersja w readme.txt (P1 poz. 18)

     Nazwa paczki dla klienta bierze wersję z nagłówka wtyczki, a `readme.txt`
     podaje ją drugi raz jako `Stable tag`. Rozjazd tych dwóch liczb znaczy,
     że klient czyta w opisie inną wersję, niż ma w pliku — a przy sprzedaży
     obcemu człowiekowi to jedyne dwa miejsca, po których może się poznać.
     Nie pilnowało tego NIC. */
  const wersjaNaglowka = trescGlownego.match(/^\s*\*\s*Version:\s*(\S+)\s*$/m);
  const readme = join(katalog, "readme.txt");
  if (!wersjaNaglowka) {
    bledy.push(
      `${glowny}: nagłówek „Version:" nie ma wartości, którą da się odczytać — nazwa paczki dla klienta bierze się właśnie stąd.`
    );
  } else if (existsSync(readme)) {
    const stabilna = readFileSync(readme, "utf8").match(/^Stable tag:\s*(\S+)\s*$/m);
    if (!stabilna) {
      bledy.push(
        `${readme}: brak wiersza „Stable tag:" — WordPress i katalog wtyczek czytają wersję właśnie stąd, a klient porównuje ją z nagłówkiem.`
      );
    } else if (stabilna[1] !== wersjaNaglowka[1]) {
      bledy.push(
        `${readme}: „Stable tag: ${stabilna[1]}" przy nagłówku „Version: ${wersjaNaglowka[1]}" — dwie różne wersje tej samej wtyczki w dwóch plikach, które klient ogląda obok siebie. Paczka nazwie się po nagłówku, a opis powie co innego.`
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

  /* 10. SQL podawany do $wpdb DOSŁOWNIE, nie zmienną */
  //
  // Reguła 6 czyta łańcuch podany WPROST do `$wpdb->…` — więc zapytanie
  // sklejone linijkę wyżej i podane zmienną jest dla niej NIEWIDZIALNE.
  // To nie jest hipoteza: przy pisaniu `aai-monitor` sam obszedłem
  // regułę 6 przypadkiem, składając `DELETE` konkatenacją z nazwą
  // kolumny w zmiennej. Reguła 6 zapaliła się na jednym miejscu i
  // przemilczała drugie, identyczne. Ta reguła zamyka tę furtkę:
  // literał ma stać przy wywołaniu, bo tam patrzy kontroler.
  //
  // `$wpdb` jako pierwszy argument jest w porządku — to zagnieżdżone
  // `$wpdb->get_results( $wpdb->prepare( "…" ) )`, gdzie literał i tak
  // stoi przy `prepare`.
  for (const plik of plikiPhp(katalog)) {
    const tresc = kod(readFileSync(plik, "utf8"));
    const zmienne = [
      ...tresc.matchAll(
        /\$wpdb->(?:query|prepare|get_var|get_row|get_col|get_results)\(\s*\$(?!wpdb\b)(\w+)/g
      ),
    ].map((m) => m[1]);
    if (zmienne.length > 0) {
      bledy.push(
        `${plik}: SQL podany do $wpdb-> zmienną (${[...new Set(zmienne)].map((z) => "$" + z).join(", ")}), a nie literałem. Reguła o wartościach przez prepare() czyta łańcuch stojący PRZY wywołaniu — zapytanie sklejone wcześniej przechodzi bez sprawdzenia, więc granica między wejściem a bazą przestaje istnieć dokładnie tam, gdzie ktoś był sprytny.`
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

  /* 11. żadna wtyczka nie sięga po tabele SIOSTRZANEJ wtyczki */
  //
  // DLACZEGO TA REGUŁA POWSTAŁA DOPIERO PRZY TEŚCIE CAŁOŚCI. Kod obu
  // starszych wtyczek OBIECYWAŁ tę izolację („nie dotykamy tabel cudzego
  // prefiksu, pilnuje tego strażnik"), a pilnowała jej jedna reguła
  // `straznik-platnosci-wp` szukająca DOSŁOWNYCH nazw tabel Pluginu 1.
  // Kanoniczna droga — `Aai_Sklep_Tabele::tabela( 'lessons' )` — tych nazw
  // nie zawiera, więc zapis Pluginu 2 do tabeli lekcji Pluginu 1
  // przechodził WSZYSTKICH 37 strażników na zielono (zmierzone mutacją
  // 2026-08-31). Reguła pyta więc o KLASĘ TABEL: wolno używać wyłącznie
  // własnej. Dane siostry czyta się przez jej publiczne API.
  const wlasnaKlasaTabel = wtyczka
    .split("-")
    .map((c) => c.charAt(0).toUpperCase() + c.slice(1))
    .join("_");
  for (const plik of plikiPhp(katalog)) {
    const tresc = kod(readFileSync(plik, "utf8"));
    for (const m of tresc.matchAll(/([A-Za-z_][\w]*)_Tabele::/g)) {
      if (m[1] !== wlasnaKlasaTabel) {
        bledy.push(
          `${plik}: sięga po ${m[1]}_Tabele:: — to tabele SIOSTRZANEJ wtyczki. Każda wtyczka pisze i czyta wyłącznie swoje tabele; cudze dane biorze się przez publiczne API tamtej wtyczki (transakcje, dziennik audytu i odmowa skasowania napisanej treści żyją w JEJ warstwie zapisu, nie w naszej).`
        );
      }
    }
  }
}

/* 12. PACZKA O TEJ SAMEJ NAZWIE MA MIEĆ TĘ SAMĄ TREŚĆ (P1 poz. 18).

   Nazwa archiwum bierze wersję z nagłówka wtyczki, a treść z bieżącego kodu.
   Bez tej odmowy kod zmieniony bez podbicia wersji dawał DWA RÓŻNE archiwa
   `aai-sklep-0.6.0.zip` — i klient nie miał jak sprawdzić, które ma. */
{
  const PAKUJ = "tools/pakuj-wtyczki.mjs";
  if (!existsSync(PAKUJ)) {
    bledy.push(`${PAKUJ}: nie ma narzędzia pakującego — instrukcja dla klienta każe wgrać plik ZIP, którego nikt nie produkuje.`);
  } else {
    const p = readFileSync(PAKUJ, "utf8");
    // Pytamy o ROZSTRZYGNIĘCIE: istnieje archiwum + treść się nie zgadza → wyjście błędem.
    if (!/existsSync\(\s*paczka\s*\)\s*&&\s*![A-Za-z]\w*\([\s\S]{0,200}?\)\s*\)\s*\{[\s\S]{0,900}?process\.exit\(\s*1\s*\)/.test(p)) {
      bledy.push(
        `${PAKUJ}: pakowanie nadpisuje istniejące archiwum bez sprawdzenia, czy niesie tę samą treść. Nazwa paczki to obietnica wersji — dwa różne pliki o jednej nazwie są dla klienta nie do odróżnienia (P1 poz. 18).`
      );
    }
    // I o to, że porównuje TREŚĆ, nie bajty: ZIP zapisuje mtime, a `git checkout`
    // przestawia je wszystkim plikom — porównanie bajtów dawałoby fałszywy alarm
    // po każdym przełączeniu gałęzi (zmierzone: wystarczył `touch`).
    if (!/function tresciSieZgadzaja\(/.test(p)) {
      bledy.push(
        `${PAKUJ}: brak porównania TREŚCI archiwum (tresciSieZgadzaja). Porównanie bajtów ZIP-a zapala się po samym touch/git checkout, bo archiwum niesie czasy modyfikacji — bramka, która krzyczy zawsze, zostanie wyłączona.`
      );
    }
  }
}

/* 13. HANDLER SZWU PRZYJMUJE CUDZĄ ODPOWIEDŹ I NIE WYWRACA CUDZEGO ŻĄDANIA
      (MAR-A-20).

   Siedem szwów spina trzy wtyczki; PIĘĆ z nich to filtry `aai_*` (dwa
   pozostałe — `aai_sklep_kurs_zmieniony` i `_usuniety` — są akcjami i mają
   własne reguły). Filtr jest PUBLICZNY:
   przed nami może stanąć dowolny callback i oddać `1`, `null` albo tablicę
   zamiast obiecanego kształtu. W pliku z `declare( strict_types = 1 )`
   twardy typ skalarny na pierwszym parametrze zamienia to w `TypeError` —
   czyli w BIAŁY EKRAN, i to na stronie, za którą klient zapłacił, bo
   `aai_monitor_strona_za_bramka` pyta właśnie widok lekcji.

   Cztery z pięciu handlerów miały już `mixed` i `try/catch ( Throwable )`;
   `Aai_Sklep_Lekcja::za_bramka()` był jedynym wyjątkiem i to on siedzi na
   trasie płatnej treści. Reguła pyta o dwie rzeczy naraz, obie
   o ROZSTRZYGNIĘCIU, nie o nazwie: kształt pierwszego parametru i obecność
   osłony w ciele. Bez samokontroli zakresu przeszłaby po pustce w dniu,
   w którym ktoś zmieni sposób rejestracji szwów. */
{
  const SZWOW_CO_NAJMNIEJ = 5;
  const handlery = [];
  for (const wtyczka of wtyczki) {
    for (const plik of plikiPhp(join(KATALOG_WTYCZEK, wtyczka))) {
      const tresc = kod(readFileSync(plik, "utf8"));
      for (const m of tresc.matchAll(
        /add_filter\(\s*'(aai_[a-z0-9_]+)'\s*,\s*array\(\s*self::class\s*,\s*'(\w+)'/g
      )) {
        handlery.push({ plik, tresc, filtr: m[1], metoda: m[2] });
      }
    }
  }

  if (handlery.length < SZWOW_CO_NAJMNIEJ) {
    bledy.push(
      `straznik-wtyczki-wp: znalazłem ${handlery.length} handlerów szwów aai_* przy oczekiwanych co najmniej ${SZWOW_CO_NAJMNIEJ} — reguła o kształcie handlera przechodziłaby po pustce (samokontrola zakresu, MAR-A-20). Sprawdź, czy szwy nie są rejestrowane inaczej niż add_filter( 'aai_…', array( self::class, '…' ) ).`
    );
  }

  for (const h of handlery) {
    const od = h.tresc.indexOf(`function ${h.metoda}(`);
    if (od < 0) {
      bledy.push(
        `${h.plik}: szew ${h.filtr} wskazuje na self::${h.metoda}(), której w tym pliku nie ma — filtr jest martwy albo handler wyprowadził się bez zmiany rejestracji (MAR-A-20).`
      );
      continue;
    }
    const sygnatura = h.tresc.slice(od, h.tresc.indexOf(")", od) + 1);
    const pierwszy = sygnatura.slice(sygnatura.indexOf("(") + 1).split(",")[0].trim();
    // Twardy typ skalarny PRZED zmienną = TypeError przy cudzej odpowiedzi.
    if (/^\??\s*(bool|int|float|string|array|iterable|callable)\s+\$/i.test(pierwszy)) {
      bledy.push(
        `${h.plik}: handler szwu ${h.filtr} (${h.metoda}) ma na pierwszym parametrze twardy typ „${pierwszy.split("$")[0].trim()}". To filtr PUBLICZNY — cudzy callback o niższym priorytecie może oddać 1 albo null, a przy strict_types daje to TypeError, czyli biały ekran na stronie klienta. Przyjmuj mixed z wartością domyślną i sprawdzaj kształt w ciele (MAR-A-20).`
      );
    }
    const doKonca = h.tresc.slice(od);
    const nast = doKonca.slice(1).search(/\n\t(?:private|public|protected)\s/);
    const cialo = nast > 0 ? doKonca.slice(0, nast + 1) : doKonca;
    if (!/catch\s*\(\s*\\?Throwable\s/.test(cialo)) {
      bledy.push(
        `${h.plik}: handler szwu ${h.filtr} (${h.metoda}) nie ma osłony catch ( Throwable ). Rzut z NASZEJ strony wychodzi wtedy do cudzego żądania — a te filtry biegną m.in. w kasie WooCommerce i na stronie lekcji, więc awaria u nas wywraca zakup albo płatną treść (MAR-A-20).`
      );
    }
  }
}

/* 14. „CZYŚCI DO ZERA" MUSI ZNACZYĆ TAKŻE POZA WŁASNYMI TABELAMI (MAR-A-16).

   `aai-sklep/uninstall.php` deklarował czyszczenie „do zera", a kasował
   wyłącznie pięć tabel. Po pełnym odinstalowaniu zostawało w instalacji 148
   załączników zrzutów, wpisy Tutora z ośmioma naszymi metami i dwie własne
   opcje; w Pluginie 2 przeżywała PEŁNE odinstalowanie flaga
   `aai_platnosci_sprzedaz_otwarta` — czyli po ponownej instalacji sprzedaż
   była otwarta od pierwszej sekundy, przy pustym dzienniku dostaw, wbrew
   własnej deklaracji „SPRZEDAŻ OTWIERA CZŁOWIEK, NIE AKTUALIZACJA".

   Reguła pyta o dwie rzeczy: czy wtyczka deklarująca kasowanie sprząta
   TAKŻE swoje meta (a nie tylko `DROP TABLE`) i czy żadna nie zostawia
   opcji zmieniającej zachowanie po ponownej instalacji. */
{
  // Opcje, których przeżycie ZMIENIA zachowanie świeżej instalacji.
  const GROZNE_OPCJE = {
    "aai-platnosci": ["aai_platnosci_sprzedaz_otwarta"],
  };
  for (const wtyczka of wtyczki) {
    const u = join(KATALOG_WTYCZEK, wtyczka, "uninstall.php");
    if (!existsSync(u)) continue; // reguła 4 pilnuje istnienia
    const t = kod(readFileSync(u, "utf8"));
    // Interesuje nas WYŁĄCZNIE gałąź kasowania (po `return;` gałęzi „zostaw").
    const iGaleziKasowania = t.indexOf("return;");
    const kasujaca = iGaleziKasowania < 0 ? t : t.slice(iGaleziKasowania);

    /* KONTRPRZYKŁAD: wtyczka, która nigdy nie zapisuje mety, nie ma czego
       po sobie sprzątać. Bez tego pytania reguła oskarżała monitoring —
       a on nie dotyka ani jednego wpisu (zmierzone: 0 wywołań zapisu mety). */
    const pisze = plikiPhp(join(KATALOG_WTYCZEK, wtyczka)).some((f) =>
      /(update|add)_post_meta\s*\(/.test(kod(readFileSync(f, "utf8")))
    );
    if (pisze && /DROP TABLE/i.test(kasujaca) && !/delete_post_meta_by_key\s*\(/.test(kasujaca)) {
      bledy.push(
        `${u}: kasuje własne tabele, a zostawia swoje meta na cudzych wpisach (brak delete_post_meta_by_key). „Czyści do zera" musi znaczyć także poza własnymi tabelami — inaczej po wyczyszczeniu witryny zostają nasze znaczniki na wpisach i mediach, a obietnica w nagłówku jest nieprawdziwa (MAR-A-16).`
      );
    }
    for (const opcja of GROZNE_OPCJE[wtyczka] ?? []) {
      if (!new RegExp(`delete_option\\(\\s*'${opcja}'`).test(kasujaca)) {
        bledy.push(
          `${u}: nie kasuje opcji \`${opcja}\`, która przeżywa odinstalowanie i ZMIENIA zachowanie świeżej instalacji. Sprzedaż otwarta od pierwszej sekundy przy pustym dzienniku dostaw to nie jest decyzja człowieka, choć wtyczka deklaruje, że tylko nią bywa (MAR-A-16).`
        );
      }
    }
  }
}

if (bledy.length > 0) {
  console.error("straznik-wtyczki-wp:");
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}

console.log(
  `straznik-wtyczki-wp: ${wtyczki.length} wtyczka/wtyczki w porządku (nagłówki, wersja zgodna z readme.txt, blokada wywołania, jedno źródło nazw tabel, uninstall nie kasuje treści bez zgody, wartości przez prepare, SQL literałem przy wywołaniu, zapis tylko przez warstwę zapisu, JSON o stałym kształcie, żadna nie sięga po tabele siostry, paczka o tej samej nazwie niesie tę samą treść, handler szwu przyjmuje cudzą odpowiedź i ma osłonę, odinstalowanie sprząta też poza własnymi tabelami).`
);
