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
import { join, relative } from "node:path";

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

  /* 1c. wersja w nagłówku = stała `*_WERSJA` w tym samym pliku

     Ta stała jest w tym produkcie DWIEMA rzeczami naraz: numerem schematu
     (`Tabele::dociagnij_schemat()` porównuje ją z opcją i tylko przy
     różnicy puszcza `dbDelta`) ORAZ przełamywaczem pamięci przeglądarki
     przy KAŻDYM arkuszu i skrypcie wtyczki (`wp_enqueue_*( …, WERSJA )`).

     Zmierzone przed dołożeniem tej reguły: nagłówek `aai-sklep` doszedł do
     0.9.0, a stała stała na 0.6.0 od 2026-08-25 — przez DZIESIĘĆ commitów,
     które zmieniały pliki w `assets/`. Klient, który zaktualizuje wtyczkę,
     dostaje więc adres arkusza z tym samym `?ver=`, czyli **stary CSS
     z własnego cache'u przy nowym HTML-u** — objaw wygląda jak zepsuty
     wygląd po aktualizacji, a nie jak nieruszona liczba. Wszystkie trzy
     wtyczki miały ten rozjazd. */
  if (wersjaNaglowka) {
    const stala = trescGlownego.match(/^const\s+AAI_[A-Z]+_WERSJA\s*=\s*'([^']+)';/m);
    if (!stala) {
      bledy.push(
        `${glowny}: nie ma stałej AAI_…_WERSJA — a to ona przełamuje pamięć przeglądarki przy arkuszach i skryptach wtyczki oraz decyduje o przebiegu dbDelta.`
      );
    } else if (stala[1] !== wersjaNaglowka[1]) {
      bledy.push(
        `${glowny}: stała AAI_…_WERSJA = „${stala[1]}" przy nagłówku „Version: ${wersjaNaglowka[1]}". Ta stała jedzie w adresie KAŻDEGO arkusza i skryptu wtyczki, więc klient po aktualizacji dostaje nowy HTML i STARY CSS z własnego cache'u — objaw wygląda jak zepsuty wygląd, nie jak nieruszona liczba.`
      );
    }
  }

  /* 1d. schemat NOWSZY niż kod nie jest cofany (MAR-A-18)

     Wszystkie trzy `dociagnij_schemat()` porównywały wersję zwykłą
     nierównością, a nierówność spełnia też DOWNGRADE. Wgranie starszej
     wtyczki na nowszy schemat uruchamiało więc `utworz()` STAREJ wersji
     i zapisywało starą wersję jako aktualną. Dziś nieszkodliwe (historia
     schematu zna wyłącznie dodawanie), ale `dbDelta` wystawia
     `ALTER … CHANGE` przy różnicy typu kolumny, a instalacja stoi na
     nieścisłym `sql_mode` — pierwsze zwężenie typu utnie treść po cichu.

     Reguła pyta o ROZSTRZYGNIĘCIE: czy w tej metodzie w ogóle porównuje
     się kolejność wersji. Zmierzone testem negatywnym: bez tej gałęzi
     wersja 9.9.9 w bazie zostaje nadpisana bieżącą przy pierwszym
     żądaniu. */
  {
    const tabele = plikiPhp(katalog).filter((f) => /tabele\.php$/.test(f));
    for (const plik of tabele) {
      const t = kod(readFileSync(plik, "utf8"));
      const i = t.indexOf("function dociagnij_schemat(");
      if (i < 0) {
        continue;
      }
      const koniec = t.indexOf("\n\t}", i);
      const cialo = t.slice(i, koniec < 0 ? undefined : koniec);
      if (!/version_compare\s*\(/.test(cialo)) {
        bledy.push(
          `${plik}: dociagnij_schemat() nie porównuje KOLEJNOŚCI wersji (brak version_compare). Zwykła nierówność spełnia też downgrade, więc starsza wtyczka uruchomi na nowszym schemacie swoje dbDelta — a ono wystawia ALTER … CHANGE przy różnicy typu kolumny i przy nieścisłym sql_mode utnie treść po cichu (MAR-A-18).`
        );
      }
    }
  }

  /* 1e. zależność niezbywalna jest zadeklarowana PLATFORMIE (MAR-A-09)

     `Requires Plugins:` (WordPress 6.5+) blokuje aktywację wtyczki bez
     jej zależności. ZMIERZONE na tej instalacji: przy wyłączonym
     `aai-sklep` aktywacja `aai-platnosci` z tym nagłówkiem kończy się
     odmową i komunikatem nazywającym brakującą wtyczkę — czyli nagłówek
     działa także dla wtyczek spoza katalogu WP.org.

     Bez niego jedynym nośnikiem kolejności był plik tekstowy w paczce
     i proza instrukcji, czyli prośba do człowieka. Prześledzona ścieżka
     „klient aktywuje Płatności pierwsze" przestawia 13 cudzych ustawień
     (w tym `monetize_by`), nie zakłada ANI JEDNEGO produktu i kończy
     kontrolę kodem 0.

     Reguła pyta o ZACHOWANIE, nie o nazwę wtyczki: jeżeli kod tej wtyczki
     odwołuje się do klas siostry, siostra ma być w nagłówku. */
  {
    const siostry = wtyczki.filter((w) => w !== wtyczka);
    const wymagane = (trescGlownego.match(/^\s*\*\s*Requires Plugins:\s*(.+)$/m)?.[1] ?? "")
      .split(",")
      .map((x) => x.trim());
    for (const siostra of siostry) {
      const klasa = new RegExp(`\\b${siostra.replace(/-/g, "_").replace(/^aai_/, "Aai_")}_\\w+::`, "i");
      const uzywa = plikiPhp(katalog).some((f) => klasa.test(kod(readFileSync(f, "utf8"))));
      if (uzywa && !wymagane.includes(siostra)) {
        bledy.push(
          `${glowny}: kod tej wtyczki woła klasy wtyczki „${siostra}", a nagłówek „Requires Plugins:" jej nie wymienia. WordPress od 6.5 potrafi odmówić aktywacji bez zależności (zmierzone na tej instalacji) — bez tego jedynym nośnikiem kolejności instalacji jest prośba do człowieka, a zła kolejność przestawia cudze ustawienia i nie zakłada ani jednego produktu (MAR-A-09).`
        );
      }
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
    /*
     * WZORZEC MUSI WIDZIEĆ IDIOM, KTÓREGO REPO UŻYWA (MAR-A-29).
     *
     * Pierwsza wersja pytała o `$wpdb->query( "INSERT …` — czyli o łańcuch
     * ZARAZ po nawiasie. Nie widziała więc
     * `$wpdb->query( $wpdb->prepare( "INSERT …" ) )`, a to jest idiom
     * używany w tym repo (warstwa zapisu Pluginu 2). Ten sam kod w dowolnym
     * innym pliku przechodziłby na zielono — czyli reguła, która ma łapać
     * zapis niedający objawu, sama nie widziała najczęstszej jego formy.
     *
     * Pytamy więc o SŁOWO KLUCZOWE SQL-a w argumentach `query()`, niezależnie
     * od tego, ile owijek stoi po drodze.
     */
    const zapisy = [
      ...tresc.matchAll(/\$wpdb->(insert|update|delete|replace)\s*\(/g),
      ...tresc.matchAll(
        /\$wpdb->query\([^;]{0,200}?["']\s*(INSERT|UPDATE|DELETE|REPLACE|TRUNCATE|DROP|ALTER)\b/gi
      ),
    ].map((m) => m[1].toLowerCase());
    /*
     * OBEJŚCIE 2 (MAR-A-29): nazwa NASZEJ tabeli sklejona wprost
     * `{$wpdb->prefix}aai_sklep_lessons` omijała reguły 3, 6, 10 i 11 naraz,
     * bo reguła 6 usuwa `$wpdb->\w+` z łańcucha przed sprawdzeniem, a ten
     * idiom w repo już występuje (przy CUDZYCH tabelach Woo, gdzie jest
     * poprawny). Do NASZYCH tabel nazwa ma iść WYŁĄCZNIE z klasy tabel.
     */
    for (const m of tresc.matchAll(/\{\$wpdb->prefix\}\s*aai_\w+/g)) {
      const nr = tresc.slice(0, m.index).split("\n").length;
      bledy.push(
        `${plik}:${nr}: składa nazwę NASZEJ tabeli wprost („${m[0]}") zamiast brać ją z klasy tabel. Ten idiom omija naraz cztery reguły tego strażnika — prefiks znika przed sprawdzeniem, więc zapis do naszych tabel poza warstwą zapisu przeszedłby na zielono (MAR-A-29).`
      );
    }

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

/* KOLEJNOŚĆ ŁADOWANIA JEST ODWROTNA DO ZALEŻNOŚCI — ZAPISANE JAKO ZAŁOŻENIE
   (MAR-A-19).

   WordPress ładuje wtyczki ALFABETYCZNIE: `aai-monitor` → `aai-platnosci`
   → `aai-sklep`, czyli Plugin 3, potem 2, na końcu 1 — dokładnie odwrotnie
   niż zależności. Projekt obszedł to już raz punktowo (menu monitoringu
   rejestruje się z priorytetem 20 właśnie dlatego), ale nigdzie nie było
   napisane, że to WŁAŚCIWOŚĆ, na której coś stoi.

   Najostrzejszym miejscem są handlery `template_redirect` na priorytecie 1:
   jest ich TRZY, w DWÓCH wtyczkach, a każdy może zakończyć żądanie
   przekierowaniem. Dziś nic się nie psuje, bo ich zbiory żądań są
   ROZŁĄCZNE — ale przy kolizji o wyniku rozstrzygałaby nazwa pliku
   wtyczki, czyli rzecz, której nikt świadomie nie wybrał.

   Reguła nie zabrania czwartego handlera. Wymusza DECYZJĘ: dopisanie go
   zapala tę bramkę, więc ktoś musi wtedy sprawdzić rozłączność zbiorów
   i dopisać go tutaj świadomie. */
{
  const OCZEKIWANE_PRIO_1 = [
    "aai-sklep/includes/class-aai-sklep-trasy.php: przekieruj_z_tutora",
    "aai-sklep/includes/class-aai-sklep-lekcja.php: odpowiedz_zaslony",
    "aai-platnosci/includes/class-aai-platnosci-ustawienia.php: przekieruj_ze_strony_produktu",
  ];
  const znalezione = [];
  for (const wtyczka of wtyczki) {
    for (const plik of plikiPhp(join(KATALOG_WTYCZEK, wtyczka))) {
      const t = kod(readFileSync(plik, "utf8"));
      for (const m of t.matchAll(
        /add_action\(\s*'template_redirect'\s*,\s*array\(\s*self::class\s*,\s*'(\w+)'\s*\)\s*,\s*(\d+)\s*\)/g
      )) {
        if (Number(m[2]) === 1) {
          znalezione.push(`${relative(KATALOG_WTYCZEK, plik)}: ${m[1]}`);
        }
      }
    }
  }
  const brak = OCZEKIWANE_PRIO_1.filter((x) => !znalezione.includes(x));
  const nadmiar = znalezione.filter((x) => !OCZEKIWANE_PRIO_1.includes(x));
  if (brak.length > 0 || nadmiar.length > 0) {
    bledy.push(
      `handlery template_redirect na priorytecie 1 rozjechały się ze spisem w tym strażniku` +
        (nadmiar.length > 0 ? ` (doszło: ${nadmiar.join(", ")})` : "") +
        (brak.length > 0 ? ` (zniknęło: ${brak.join(", ")})` : "") +
        `. Każdy z nich może zakończyć żądanie przekierowaniem, a wtyczki ładują się ALFABETYCZNIE, czyli odwrotnie do zależności — przy kolizji o wyniku rozstrzygnęłaby nazwa pliku wtyczki. Sprawdź, czy zbiory żądań są nadal rozłączne, i dopisz zmianę do spisu świadomie (MAR-A-19).`
    );
  }
}

/* ————————— 14. sprawdzenie awarii nie stoi ZA rzutowaniem —————————
   Klasa błędu, nie miejsce. `$wpdb->query/insert/update/delete` oddaje
   `false` przy awarii, a `get_var()` oddaje `null`, gdy nie ma czego
   policzyć. Rzutowanie na `int` zamienia oba w zero, więc sprawdzenie
   postawione PO nim nie może zajść NIGDY — jest martwym kodem, który
   wygląda jak zabezpieczenie i przechodzi każdą lekturę.

   Zmierzone dwa razy w tym repozytorium, w dwóch różnych wtyczkach:
     - `Aai_Monitor_Zapis::sprzataj()` — zablokowany DELETE, retencja
       oddaje 0, kanał błędów PUSTY (zgłoszenie zewnętrzne, 0.78.0);
     - `Aai_Sklep_Raport::liczniki_tabel()` + reguła kontroli — schowana
       tabela `courses`, a komenda mówi „Sklep w porządku." kodem 0.

   Reguła celuje w ZACHOWANIE: szuka przypisania z rzutowaniem, po którym
   ta sama zmienna jest porównywana z `false` albo `null`. Nie pyta
   o nazwy metod ani o napisy — to nawracająca pułapka tego repozytorium
   (dziesięć nawrotów do 0.77.0). */
{
  const RZUTUJACE = /^\s*(?:\$(\w+)\s*=\s*(?:\(\s*(?:int|integer|float|string|bool|boolean)\s*\)|intval\s*\(|floatval\s*\(|strval\s*\())/;
  let sprawdzonych = 0;

  for (const wtyczka of wtyczki) {
    for (const plik of plikiPhp(join(KATALOG_WTYCZEK, wtyczka))) {
      const linie = kod(readFileSync(plik, "utf8")).split("\n");
      for (let i = 0; i < linie.length; i += 1) {
        const m = linie[i].match(RZUTUJACE);
        if (!m || !m[1]) continue;
        sprawdzonych += 1;
        const zmienna = m[1];
        // Szukamy porównania z false/null tej samej zmiennej w najbliższych
        // ośmiu liniach — dalej to już inna myśl, nie ta sama decyzja.
        const okno = linie.slice(i + 1, i + 9).join("\n");
        const martwe = new RegExp(
          `(?:false|null)\\s*===?\\s*\\$${zmienna}\\b|\\$${zmienna}\\s*===?\\s*(?:false|null)`
        );
        if (martwe.test(okno)) {
          bledy.push(
            `${relative(".", plik)}:${i + 1}: zmienna $${zmienna} jest rzutowana, a POTEM porównywana z false/null — po rzutowaniu obie te wartości są zerem, więc sprawdzenie nie może zajść i jest martwym kodem. Sprawdź wynik PRZY wywołaniu, przed jakąkolwiek konwersją.`
          );
        }
      }
    }
  }

  if (sprawdzonych < 20) {
    bledy.push(
      `samokontrola zakresu reguły 14: znalazłem tylko ${sprawdzonych} przypisań z rzutowaniem w trzech wtyczkach. Tak mało znaczy, że wzorzec przestał trafiać w kod — reguła przechodziłaby PO PUSTCE.`
    );
  }
}

/* ————————— 15. transakcja i kontrola Pluginu 1 umieją zawieść —————————
   (a) `w_transakcji()` puszczało trzy zapytania bez sprawdzenia. Nieudany
       COMMIT jest ZMIERZONY: baza wycofuje transakcję przy rozłączeniu,
       zapis oddaje liczniki sukcesu, panel pisze „Kurs zapisany", a w bazie
       zostaje stara treść — cicha utrata zmiany właściciela.
   (b) `liczniki_tabel()` rzutowały wynik na int, więc brakująca tabela
       docierała do kontroli jako zero i reguła „brak tabeli to nie zero
       wierszy" była martwa. ZMIERZONE: schowana tabela courses, a komenda
       mówi „Sklep w porządku." kodem 0.
   (c) kontrola liczy długość treści na trzy sposoby od W2 i do 0.78.0
       nigdy ich nie porównywała — sonda na cichą korupcję kodowania
       zbierała dane, których nikt nie czytał. */
{
  const zapisP1 = "wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-zapis.php";
  const raport = "wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-raport.php";
  const cliP1 = "wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-cli.php";

  if (existsSync(zapisP1)) {
    const t = kod(readFileSync(zapisP1, "utf8"));
    const m = t.match(/private static function w_transakcji\([\s\S]*?\n\t\}/);
    if (!m) {
      bledy.push(`${zapisP1}: nie znalazłem ciała w_transakcji() (15a). Samokontrola zakresu.`);
    } else {
      for (const zapytanie of ["START TRANSACTION", "COMMIT", "ROLLBACK"]) {
        const sprawdzone = new RegExp(
          `false === \\$wpdb->query\\(\\s*'${zapytanie}'\\s*\\)`
        ).test(m[0]);
        if (!sprawdzone) {
          bledy.push(
            `${zapisP1}: wynik zapytania ${zapytanie} nie jest sprawdzany (15a). Nieudany COMMIT znaczy, że zapis oddaje liczniki sukcesu, a w bazie zostaje stara treść; nieudany ROLLBACK zostawia dane w połowie, a wołający czyta pierwotny wyjątek jak „nic się nie stało".`
          );
        }
      }
    }
  }

  if (existsSync(raport)) {
    const t = kod(readFileSync(raport, "utf8"));
    const m = t.match(/public static function liczniki_tabel\([\s\S]*?\n\t\}/);
    if (!m) {
      bledy.push(`${raport}: nie znalazłem ciała liczniki_tabel() (15b). Samokontrola zakresu.`);
    } else if (!/SHOW TABLES LIKE/.test(m[0])) {
      bledy.push(
        `${raport}: liczniki_tabel() nie pyta o ISTNIENIE tabeli (15b). Samo COUNT(*) na nieistniejącej tabeli oddaje null, a po rzutowaniu na int wygląda jak „tabela jest, tylko pusta" — reguła kontroli o braku tabeli staje się wtedy martwa. Obie siostrzane wtyczki pytają SHOW TABLES LIKE.`
      );
    }
  }

  if (existsSync(cliP1)) {
    const t = kod(readFileSync(cliP1, "utf8"));
    const m = t.match(/private static function bledy_stanu\([\s\S]*?\n\t\}/);
    if (!m) {
      bledy.push(`${cliP1}: nie znalazłem ciała bledy_stanu() (15c). Samokontrola zakresu.`);
    } else if (!/znakow_php/.test(m[0]) || !/znakow_sql/.test(m[0])) {
      bledy.push(
        `${cliP1}: kontrola nie porównuje długości treści liczonej w PHP z długością liczoną przez bazę (15c). Te liczby są zbierane przy każdym uruchomieniu jako sonda na cichą korupcję kodowania — nieporównane nie mówią nic, a rozjazd znaczy, że połączenie ma inne kodowanie niż tabela i treść kursów psuje się po cichu.`
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
  `straznik-wtyczki-wp: ${wtyczki.length} wtyczka/wtyczki w porządku (nagłówki, wersja zgodna z readme.txt i ze stałą przełamującą cache, blokada wywołania, jedno źródło nazw tabel, uninstall nie kasuje treści bez zgody, wartości przez prepare, SQL literałem przy wywołaniu, zapis tylko przez warstwę zapisu, JSON o stałym kształcie, żadna nie sięga po tabele siostry, paczka o tej samej nazwie niesie tę samą treść, handler szwu przyjmuje cudzą odpowiedź i ma osłonę, odinstalowanie sprząta też poza własnymi tabelami, spis handlerów kończących żądanie na priorytecie 1 się zgadza, żadne sprawdzenie awarii nie stoi za rzutowaniem, które zamienia false i null w zero, transakcja Pluginu 1 sprawdza wszystkie trzy zapytania, a jego kontrola widzi brak tabeli i rozjazd kodowania).`
);
