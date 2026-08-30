/**
 * Strażnik Pluginu 3 (`aai-monitor`) — niezmienniki zaakceptowanego
 * schematu (docs/plugin-3/DIAGRAM.md, sekcja 8), których złamanie NIE
 * objawia się błędem.
 *
 * PO CO OSOBNY STRAŻNIK. `straznik-wtyczki-wp` pilnuje reguł wspólnych
 * każdej naszej wtyczce (nagłówki, ABSPATH, prepare, warstwa zapisu,
 * SQL literałem). Plugin 3 ma do tego niezmienniki WŁASNE, wynikające
 * z tego, czym jest: modułem, który wyłącznie PATRZY. Każdy z nich łamie
 * się po cichu — ekran dalej się otwiera, tylko zaczyna kłamać albo
 * zbierać rzeczy, których zbierać nie wolno.
 *
 * CZTERNAŚCIE NIEZMIENNIKÓW (numery N z sekcji 8 schematu; każdy z mutacją
 * w audyt-straznikow). Reguły 1–8 przyszły z krokiem T1, reguły 9–12
 * z T2 razem z pierwszym producentem danych; reguły o sicie beaconu
 * dochodzą w T3, bo dziś nie miałyby czego pilnować:
 *   1. (N1) ekran jest CZYSTYM ODCZYTEM: zero `admin_post_*`, zero
 *      `wp_ajax_*`, zero `method="post"`, zero nonce'ów. Panel, który
 *      zaczyna zapisywać, przestaje być monitoringiem,
 *   2. (N16) KONTROLA NIGDY NIE PISZE: `sprawdz()` i cała klasa odczytu
 *      bez jednego zapisu — ani do bazy, ani do opcji. Kontrola, która
 *      po drodze naprawia, nie umie odpowiedzieć „jak było przed nią",
 *   3. (N14) nie ruszamy CUDZYCH danych: zero zapisów do tabel
 *      WordPressa, zero `update_post_meta`/`wp_insert_post` i pochodnych,
 *      zero podmieniania funkcji pluggable,
 *   4. (N7) tabela `wizyty` jest ANONIMOWA — bez `ip`, `login`, `agent`
 *      i `user_id` (D3). Jedna kolumna dopisana „bo się przyda"
 *      zamienia pomiar ruchu w profilowanie,
 *   5. (N5) hasło NIGDY nie wchodzi do dziennika — kod nie sięga po
 *      `$_POST['pwd']` ani nic o tej roli,
 *   6. (N15) awaria zapisu jest GŁOŚNA: każdy `catch ( Throwable )`
 *      w warstwie zapisu melduje do kanału błędów. Cichy `catch` zamienia
 *      uszkodzoną tabelę w pustą listę, czytaną jako „nikt nie próbował",
 *   7. (P7) retencja ma DWA wyzwalacze: zapis i render ekranu. Sam zapis
 *      nie wystarcza — przy ciszy dane osobowe żyją dłużej, niż obiecuje
 *      polityka prywatności, a WP-Cron na cichej stronie nie wstaje,
 *   8. (P13) ekran mówi prawdę o tym, CO zbiera — pyta o zameldowane
 *      czujki, zamiast mieć to wpisane w tekst. Inaczej po wyłączeniu
 *      producenta danych ekran dalej twierdziłby, że go ma,
 *   9. (N4) KAŻDY handler haka biegnącego w CUDZYM żądaniu ma
 *      `catch ( Throwable )`. To wymaganie bezpieczeństwa sklepu, nie
 *      higiena: wyjątek z `set_logged_in_cookie` wychodzi z kasy
 *      WooCommerce, czyli daje HTTP 500 i przerwany zakup (F11),
 *  10. (N2) dedup źródła: handler `wp_login` DOPRECYZOWUJE wiersz
 *      utworzony przez `set_logged_in_cookie`, zamiast dopisywać drugi.
 *      Złamanie jest ciche — dziennik działa, tylko liczy każde
 *      logowanie formularzem dwa razy,
 *  11. (N2, N3) wszystkie TRZY ścieżki mają swoje haki. Każdy pilnuje
 *      innej: formularza, sesji z kasy (F3) i porażki. Skasowanie
 *      jednego nie zapala niczego — po prostu cała klasa zdarzeń
 *      przestaje istnieć w dzienniku,
 *  12. (P13) producent danych MELDUJE czujkę. Reguła 8 pilnuje, że
 *      ekran o nie pyta; ta — że ma o co. Bez meldunku ekran wraca do
 *      zdania „nic nie zbiera" przy działających hakach, czyli kłamie
 *      w drugą stronę,
 *  13. (P13) producent jest PODPIĘTY: plik główny naprawdę woła jego
 *      `zarejestruj()`. Reguły 10–12 czytają plik producenta i nie
 *      widzą, że nikt go nie uruchamia — zmierzone: po zdjęciu jednej
 *      linii dziennik jest martwy przy WSZYSTKICH bramkach zielonych.
 *
 * Użycie: node tools/straznicy/straznik-monitora-wp.mjs
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const KATALOG = "wordpress/wtyczki/aai-monitor";
const WARSTWA_ZAPISU = join(KATALOG, "includes", "class-aai-monitor-zapis.php");
const ODCZYT = join(KATALOG, "includes", "class-aai-monitor-odczyt.php");
const EKRAN = join(KATALOG, "includes", "class-aai-monitor-ekran.php");
const CLI = join(KATALOG, "includes", "class-aai-monitor-cli.php");
const TABELE = join(KATALOG, "includes", "class-aai-monitor-tabele.php");
const LOGOWANIA = join(KATALOG, "includes", "class-aai-monitor-logowania.php");
const GLOWNY = join(KATALOG, "aai-monitor.php");
const bledy = [];

if (!existsSync(KATALOG)) {
  console.log("straznik-monitora-wp: pominięte — wtyczki aai-monitor jeszcze nie ma.");
  process.exit(0);
}

/** Wszystkie pliki .php wtyczki. */
function plikiPhp(katalog) {
  const wynik = [];
  for (const wpis of readdirSync(katalog)) {
    const sciezka = join(katalog, wpis);
    if (statSync(sciezka).isDirectory()) wynik.push(...plikiPhp(sciezka));
    else if (wpis.endsWith(".php")) wynik.push(sciezka);
  }
  return wynik;
}

/** Kod bez komentarzy — reguły celują w ZACHOWANIE, nie w opis. */
const kod = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/**
 * Ciało metody o podanej nazwie — po klamrach, nie po następnym słowie
 * kluczowym. Wersja „od nazwy do następnego `function`" gubiłaby ostatnią
 * metodę w pliku i milczała o niej na zawsze.
 */
function cialoMetody(zrodlo, nazwa) {
  const start = zrodlo.search(new RegExp(`function\\s+${nazwa}\\s*\\(`));
  if (start < 0) return null;
  const otwarcie = zrodlo.indexOf("{", start);
  if (otwarcie < 0) return null;
  let glebokosc = 0;
  for (let i = otwarcie; i < zrodlo.length; i++) {
    if (zrodlo[i] === "{") glebokosc++;
    else if (zrodlo[i] === "}") {
      glebokosc--;
      if (glebokosc === 0) return zrodlo.slice(otwarcie, i + 1);
    }
  }
  return null;
}

const plikiWtyczki = plikiPhp(KATALOG);
const kodWtyczki = plikiWtyczki.map((p) => [p, kod(readFileSync(p, "utf8"))]);

/* ————————————————— 1. (N1) ekran jest czystym odczytem ————————————————— */

for (const [plik, tresc] of kodWtyczki) {
  const zapisujace = [
    [/add_action\(\s*['"]admin_post_/, "akcja admin-post.php"],
    [/add_action\(\s*['"]wp_ajax_/, "akcja wp_ajax"],
    [/method\s*=\s*["']post["']/i, 'formularz method="post"'],
    [/wp_nonce_field\s*\(|check_admin_referer\s*\(|wp_verify_nonce\s*\(/, "nonce"],
  ];
  for (const [wzorzec, co] of zapisujace) {
    if (wzorzec.test(tresc)) {
      bledy.push(
        `${plik}: ${co} w module, który ma wyłącznie patrzeć (N1). Ekran monitoringu jest czystym odczytem — jedyne, co można na nim zrobić, to patrzeć. Pojawienie się tu zapisu znaczy, że moduł przestał być monitoringiem i nikt tego nie zauważy, bo ekran dalej się otwiera. Filtry i stronicowanie jadą GET-em.`
      );
    }
  }
}

/* ————————————————— 2. (N16) kontrola nigdy nie pisze ————————————————— */

const ZAPISY = [
  [/\$wpdb->(?:insert|update|delete|replace)\s*\(/, "zapis do bazy przez $wpdb"],
  [/\$wpdb->query\(\s*["']?\s*(?:INSERT|UPDATE|DELETE|REPLACE|TRUNCATE|DROP|ALTER)\b/i, "DML w $wpdb->query"],
  [/\b(?:update_option|add_option|delete_option|set_transient|delete_transient)\s*\(/, "zapis do opcji"],
];

if (existsSync(CLI)) {
  const cialo = cialoMetody(kod(readFileSync(CLI, "utf8")), "sprawdz");
  if (null === cialo) {
    bledy.push(
      `${CLI}: nie znalazłem metody sprawdz() — kontrola jest jedyną bramką, którą woła postaw.sh, więc jej brak albo zmiana nazwy przechodzi bez objawu aż do wdrożenia.`
    );
  } else {
    for (const [wzorzec, co] of ZAPISY) {
      if (wzorzec.test(cialo)) {
        bledy.push(
          `${CLI}: sprawdz() zawiera ${co} (N16). Kontrola, która po drodze naprawia, nie umie odpowiedzieć na pytanie „jaki był stan przed nią" — a to jedyne pytanie, które się jej zadaje. Naprawy robi warstwa zapisu, alarm zdejmuje osobna, jawna komenda.`
        );
      }
    }
  }
}

if (existsSync(ODCZYT)) {
  const tresc = kod(readFileSync(ODCZYT, "utf8"));
  for (const [wzorzec, co] of ZAPISY) {
    if (wzorzec.test(tresc)) {
      bledy.push(
        `${ODCZYT}: klasa odczytu zawiera ${co} (N16). Kanał JSON ma wyłącznie czytać; zapis w nim znaczy, że renderowanie ekranu zmienia stan, który ekran pokazuje.`
      );
    }
  }
}

/* ——————————— 3. (N14) nie ruszamy cudzych danych ani rdzenia ——————————— */

for (const [plik, tresc] of kodWtyczki) {
  const cudze = [
    [/\$wpdb->(?:insert|update|delete|replace)\s*\(\s*\$wpdb->(\w+)/, "zapis do tabeli WordPressa"],
    [/\b(?:update_post_meta|add_post_meta|delete_post_meta|update_user_meta|add_user_meta|delete_user_meta)\s*\(/, "zapis cudzej mety"],
    [/\b(?:wp_insert_post|wp_update_post|wp_delete_post|wp_insert_user|wp_update_user|wp_delete_user)\s*\(/, "zapis cudzego wpisu lub konta"],
    [/function\s+(?:wp_mail|wp_set_auth_cookie|wp_authenticate|wp_password_change_notification|wp_new_user_notification)\s*\(/, "podmiana funkcji pluggable"],
  ];
  for (const [wzorzec, co] of cudze) {
    if (wzorzec.test(tresc)) {
      bledy.push(
        `${plik}: ${co} (N14). Plugin 3 wyłącznie nasłuchuje i zapisuje U SIEBIE — nie zmienia ani jednego cudzego zachowania. Podmiana funkcji pluggable jest tu osobno zakazana: ciszę rdzenia o hasłach osiągnęliśmy w P6 ZDJĘCIEM callbacku, nie podmianą funkcji, i tak ma zostać.`
      );
    }
  }
}

/* ————————————— 4. (N7) tabela `wizyty` jest anonimowa ————————————— */

if (existsSync(TABELE)) {
  const tresc = readFileSync(TABELE, "utf8");
  const definicja = tresc.match(/CREATE TABLE \{\$w\}([\s\S]*?)\) \{\$kolacja\}/);
  if (null === definicja) {
    bledy.push(
      `${TABELE}: nie znalazłem definicji tabeli wizyt (CREATE TABLE {$w}). Bez niej reguła o anonimowości ruchu nie ma czego sprawdzać i milczy — a milcząca reguła jest gorsza niż jej brak.`
    );
  } else {
    for (const kolumna of ["ip", "login", "agent", "user_id", "email"]) {
      if (new RegExp(`^\\s*${kolumna}\\s`, "m").test(definicja[1])) {
        bledy.push(
          `${TABELE}: tabela wizyt ma kolumnę „${kolumna}" (N7). Ruch mierzymy ANONIMOWO — decyzja właściciela D3: sesja bez IP i bez łączenia z kontem. Jedna taka kolumna zamienia pomiar odsłon w profilowanie, a tabele logowań i wizyt dają się wtedy złączyć, czego ten moduł z założenia nie robi.`
        );
      }
    }
  }
}

/* ——————————— 5. (N5) hasło nigdy nie wchodzi do dziennika ——————————— */

for (const [plik, tresc] of kodWtyczki) {
  if (/\$_(?:POST|REQUEST|GET)\s*\[\s*['"](?:pwd|pass|password|user_pass)['"]\s*\]/.test(tresc)) {
    bledy.push(
      `${plik}: kod sięga po hasło z żądania (N5). Dziennik logowań zapisuje, KTO i SKĄD próbował — nigdy CZYM. Hak porażki hasła nie niesie, więc jedyną drogą do niego jest świadome sięgnięcie do $_POST; dlatego zakaz stoi tutaj, a nie w recenzji.`
    );
  }
}

/* ————————————— 6. (N15) awaria zapisu jest głośna ————————————— */

if (existsSync(WARSTWA_ZAPISU)) {
  const tresc = kod(readFileSync(WARSTWA_ZAPISU, "utf8"));
  const bloki = [...tresc.matchAll(/catch\s*\(\s*Throwable\s+\$(\w+)\s*\)\s*\{([\s\S]*?)\n\t\t\}/g)];
  if (bloki.length === 0) {
    bledy.push(
      `${WARSTWA_ZAPISU}: ani jednego bloku catch ( Throwable ) (N15). Zapis biegnie w CUDZYM żądaniu — przy logowaniu i w kasie WooCommerce — więc niezłapany wyjątek przerywa cudzą operację, a w kasie znaczy HTTP 500 i utracony zakup (F11).`
    );
  }
  for (const [, , cialo] of bloki) {
    if (!/(?:self::zglos|Aai_Monitor_Komunikaty::zapisz)\s*\(/.test(cialo)) {
      bledy.push(
        `${WARSTWA_ZAPISU}: blok catch ( Throwable ) bez zgłoszenia do kanału błędów (N15). Cichy catch zamienia uszkodzoną tabelę w PUSTĄ listę na ekranie, którą właściciel przeczyta jako „nikt nie próbował się włamać" — fałszywy negatyw na jedynym ekranie, który ma ostrzegać.`
      );
    }
  }
}

/* ————————————— 7. (P7) retencja ma dwa wyzwalacze ————————————— */

if (existsSync(WARSTWA_ZAPISU)) {
  const wstaw = cialoMetody(kod(readFileSync(WARSTWA_ZAPISU, "utf8")), "wstaw");
  if (null === wstaw || !/self::sprzataj\s*\(/.test(wstaw ?? "")) {
    bledy.push(
      `${WARSTWA_ZAPISU}: zapis nie uruchamia retencji (P7, pierwszy wyzwalacz). Bez sprzątania przy zapisie wiersze z pełnymi adresami IP żyją bez końca, a polityka prywatności obiecuje 90 dni.`
    );
  }
}

if (existsSync(EKRAN)) {
  const tresc = kod(readFileSync(EKRAN, "utf8"));
  if (!/Aai_Monitor_Zapis::retencja\s*\(/.test(tresc)) {
    bledy.push(
      `${EKRAN}: ekran nie uruchamia retencji (P7, DRUGI wyzwalacz). Sprzątanie przy zapisie jest z definicji leniwe: gdy przez 90 dni nikt się nie zaloguje, stare wiersze z adresami IP czekają na następny zapis. WP-Cron tego nie ratuje — na mało odwiedzanej stronie potrafi nie wstać całymi dniami.`
    );
  }
}

/* ————————————— 8. (P13) ekran mówi prawdę o czujkach ————————————— */

if (existsSync(EKRAN)) {
  const ekranMetoda = cialoMetody(kod(readFileSync(EKRAN, "utf8")), "ekran");
  if (null === ekranMetoda || !/self::czujki\s*\(/.test(ekranMetoda ?? "")) {
    bledy.push(
      `${EKRAN}: ekran nie pyta o zameldowane czujki (P13). Pusta lista nie odróżnia „nikt nie próbował" od „nic nie zbiera", a to różnica między dobrą wiadomością a awarią. Zdanie o tym, co zbieramy, ma być ODBICIEM STANU KODU, nie tekstem do ręcznej aktualizacji — inaczej po wyłączeniu producenta danych ekran dalej twierdzi, że go ma.`
    );
  }
}

/* ————— 9. (N4) handler cudzego haka nie wypuszcza wyjątku ————— */

/*
 * Wyjątki z NASZEGO kodu lecą w CUDZYM żądaniu. Przy `set_logged_in_cookie`
 * to żądanie kasy WooCommerce (F11: zmierzone, wyjątek wychodzi
 * z `wc_set_customer_auth_cookie()`), czyli HTTP 500 i utracony zakup.
 * Monitoring ma prawo nie zapisać zdarzenia; nie ma prawa zepsuć
 * transakcji.
 *
 * WYJĄTKI OD REGUŁY SĄ JAWNE, a nie domyślne: trzy haki poniżej biegną
 * w NASZYM kokpicie, pod naszym ekranem, gdzie awaria psuje najwyżej
 * wygląd strony administratora. Każdy inny hak podpięty w tej wtyczce
 * — także dopisany kiedyś — wpada pod regułę sam, bo pytamy o
 * REJESTRACJE w kodzie, nie o listę znanych nazw.
 */
const HAKI_NASZEGO_KOKPITU = ["admin_menu", "admin_enqueue_scripts", "admin_notices"];

for (const [plik, tresc] of kodWtyczki) {
  const rejestracje = [
    ...tresc.matchAll(
      /add_(?:action|filter)\(\s*['"]([\w-]+)['"]\s*,\s*array\(\s*(?:self::class|'[\w]+')\s*,\s*['"](\w+)['"]/g
    ),
  ];
  for (const [, hak, metoda] of rejestracje) {
    if (HAKI_NASZEGO_KOKPITU.includes(hak)) continue;
    const cialo = cialoMetody(tresc, metoda);
    if (null === cialo) {
      bledy.push(
        `${plik}: hak „${hak}" wskazuje na metodę ${metoda}(), której nie ma w tym pliku (N4). Reguła o łapaniu wyjątków nie ma wtedy czego sprawdzić i milczy — a milcząca reguła jest gorsza niż jej brak.`
      );
      continue;
    }
    /*
     * PYTAMY O OSŁONIĘTE CIAŁO, nie o obecność słowa `catch`.
     *
     * Pierwsza wersja sprawdzała tylko, czy gdziekolwiek w ciele stoi
     * `catch ( Throwable` — i była ŚLEPA. Instrukcja wstawiona JEDNĄ
     * LINIĘ przed `try` przechodziła na zielono, a wyjątek z niej
     * wychodził z `do_action()` prosto do kasy WooCommerce (zmierzone
     * uruchomieniowo: `Error` wyleciał z `set_logged_in_cookie`).
     *
     * Teraz `try` musi być PIERWSZĄ instrukcją ciała. To wyklucza całą
     * klasę: cokolwiek stoi przed nim, nie jest chronione.
     */
    const pierwszaInstrukcja = cialo.replace(/^\{\s*/, "").trimStart();
    if (!/catch\s*\(\s*Throwable\s/.test(cialo)) {
      bledy.push(
        `${plik}: ${metoda}() jest podpięta pod hak „${hak}" i nie łapie Throwable (N4). Ten kod biegnie w CUDZYM żądaniu — przy logowaniu i w kasie WooCommerce. Zmierzone (F11): wyjątek z handlera set_logged_in_cookie wychodzi z wc_set_customer_auth_cookie(), więc w kasie znaczy HTTP 500 i przerwany zakup. Monitoring ma prawo nie zapisać zdarzenia; nie ma prawa zepsuć transakcji.`
      );
    } else if (!pierwszaInstrukcja.startsWith("try")) {
      bledy.push(
        `${plik}: ${metoda}() (hak „${hak}") ma catch ( Throwable ), ale NIE JEST NIM OSŁONIĘTA W CAŁOŚCI — przed blokiem try stoi instrukcja „${pierwszaInstrukcja.split("\n")[0].trim().slice(0, 60)}" (N4). Wyjątek stamtąd wychodzi z do_action() tak samo, jakby catcha nie było wcale: zmierzone uruchomieniowo — Error rzucony linię przed try wyleciał z set_logged_in_cookie, czyli w żądaniu kasy dałby HTTP 500 i przerwany zakup. „try” ma być PIERWSZĄ instrukcją ciała.`
      );
    }
  }
}

/* ————————— 10. (N2) dedup źródła zamiast drugiego wiersza ————————— */

if (existsSync(LOGOWANIA)) {
  const tresc = kod(readFileSync(LOGOWANIA, "utf8"));
  const podpiety = tresc.match(
    /add_action\(\s*['"]wp_login['"]\s*,\s*array\(\s*(?:self::class|'[\w]+')\s*,\s*['"](\w+)['"]/
  );
  if (null === podpiety) {
    bledy.push(
      `${LOGOWANIA}: nie znalazłem rejestracji haka „wp_login" (N2). Bez niego każde logowanie formularzem zostaje w dzienniku jako „sesja" i nie da się odróżnić człowieka przy formularzu od automatycznego wejścia z kasy — a po to właśnie istnieje kolumna „źródło".`
    );
  } else {
    const cialo = cialoMetody(tresc, podpiety[1]);
    if (null === cialo || !/Aai_Monitor_Zapis::uzupelnij_zrodlo\s*\(/.test(cialo ?? "")) {
      bledy.push(
        `${LOGOWANIA}: ${podpiety[1]}() (hak wp_login) nie doprecyzowuje wiersza przez uzupelnij_zrodlo() (N2). Zmierzone: przy logowaniu formularzem WordPress odpala NAJPIERW set_logged_in_cookie, a chwilę później, w tym samym żądaniu, wp_login. Handler, który zamiast doprecyzować dopisuje własny wiersz, podwaja każde logowanie formularzem — dziennik dalej działa, tylko kłamie o liczbie wejść, a licznik porażek z 7 dni przestaje być porównywalny.`
      );
    }
  }
}

/* ————————— 11. (N2, N3) trzy ścieżki mają swoje haki ————————— */

if (existsSync(LOGOWANIA)) {
  const tresc = kod(readFileSync(LOGOWANIA, "utf8"));
  const SCIEZKI = [
    [
      "set_logged_in_cookie",
      "sesja powstała poza formularzem — czyli auto-login z kasy WooCommerce (F3, zmierzone: wc_set_customer_auth_cookie odpala WYŁĄCZNIE ten hak). Bez niego ścieżka KAŻDEGO nowego klienta jest dla dziennika niewidzialna",
    ],
    [
      "wp_login",
      "logowanie formularzem — bez niego wszystko wygląda w dzienniku na sesję z kasy",
    ],
    [
      "wp_login_failed",
      "nieudana próba — bez niej licznik porażek z 7 dni, czyli JEDYNA funkcja alarmowa ekranu, pokazuje zero niezależnie od tego, ile razy ktoś próbował się włamać",
    ],
  ];
  for (const [hak, po_co] of SCIEZKI) {
    // Pytamy o REJESTRACJĘ, nie o obecność napisu: nazwa haka pada
    // w tym pliku także w prozie i w komentarzach, a szósty nawrót tej
    // pułapki w projekcie kosztował całą regułę blokady sprzedaży.
    if (!new RegExp(`add_action\\(\\s*['"]${hak}['"]\\s*,`).test(tresc)) {
      bledy.push(
        `${LOGOWANIA}: hak „${hak}" nie jest zarejestrowany (N2/N3). Pilnuje ścieżki: ${po_co}. Skasowanie tej rejestracji niczego nie zapala — ekran dalej się otwiera, kontrola dalej mówi „w porządku", po prostu cała klasa zdarzeń przestaje istnieć.`
      );
    }
  }
}

/* ————————— 12. (P13) producent danych melduje czujkę ————————— */

if (existsSync(LOGOWANIA)) {
  const tresc = kod(readFileSync(LOGOWANIA, "utf8"));
  if (!/Aai_Monitor_Ekran::zglos_czujke\s*\(/.test(tresc)) {
    bledy.push(
      `${LOGOWANIA}: producent danych nie melduje czujki (P13). Reguła 8 pilnuje, że ekran o czujki PYTA; ta pilnuje, żeby miał o co. Bez meldunku ekran przy działających hakach dalej twierdzi „baza stoi, ale nic nie zbiera" — kłamstwo w drugą stronę, groźniejsze od pustej listy, bo każe szukać awarii tam, gdzie jej nie ma.`
    );
  }
}

/* ————— 14. kontrola pyta o tabelę odłożoną przez przerwany test ————— */

/*
 * `smoke-wp-monitor` chowa dziennik `RENAME`-em, żeby zmierzyć, czy awaria
 * zapisu jest głośna, i przywraca go w `finally`. Ale `finally` chroni przed
 * wyjątkiem, nie przed zabiciem procesu: po `Ctrl+C` w złym momencie
 * prawdziwy dziennik zostaje pod nazwą `…_smoke_schowana`, a najbliższy
 * `postaw.sh` odtworzy przez `dbDelta` PUSTĄ tabelę o właściwej nazwie.
 * Wszystko wygląda zdrowo, tylko historia logowań zniknęła — a to materiał
 * dowodowy, którego `uninstall.php` celowo nie kasuje.
 */
if (existsSync(CLI)) {
  const tresc = kod(readFileSync(CLI, "utf8"));
  if (!/_smoke\\_schowana|_smoke_schowana/.test(tresc)) {
    bledy.push(
      `${CLI}: sprawdz() nie pyta o tabele odłożone przez przerwany test (nazwa kończąca się na _smoke_schowana). Przerwany smoke zostawia prawdziwy dziennik pod cudzą nazwą, a schemat odtwarza PUSTY — wszystko wygląda zdrowo, tylko historia logowań zniknęła. Jedno SHOW TABLES LIKE zamienia cichą podmianę materiału dowodowego w komunikat z komendą przywracającą.`
    );
  }
}

/* ————— 13. (P13) producent jest PODPIĘTY, nie tylko napisany ————— */

/*
 * Reguły 10–12 czytają PLIK producenta. Ta pyta o coś innego: czy plik
 * główny w ogóle go uruchamia.
 *
 * Zmierzone: zdjęcie jednej linii `Aai_Monitor_Logowania::zarejestruj()`
 * z `aai-monitor.php` zostawia OBA strażniki zielone, a `wp aai-monitor
 * sprawdz` kończy się kodem 0 — przy całkowicie martwym dzienniku. Kod
 * żyje i nikogo nie słucha. Tę samą regułę ma `straznik-tutora` dla
 * swojego modułu, z tego samego powodu.
 */
if (existsSync(GLOWNY)) {
  const tresc = kod(readFileSync(GLOWNY, "utf8"));
  const PRODUCENCI = [
    ["Aai_Monitor_Logowania", "dziennik logowań przestaje cokolwiek zapisywać, a ekran wraca do zdania „nic nie zbiera”"],
    ["Aai_Monitor_Prywatnosc", "wpis o dzienniku znika z kreatora polityki prywatności — a dziennik dalej zapisuje adresy IP"],
  ];
  for (const [klasa, skutek] of PRODUCENCI) {
    if (!new RegExp(`${klasa}::zarejestruj\\s*\\(\\s*\\)`).test(tresc)) {
      bledy.push(
        `${GLOWNY}: nie woła ${klasa}::zarejestruj() (P13). Skutek: ${skutek}. Złamanie jest CICHE — zmierzone: po zdjęciu tej jednej linii oba strażniki są zielone, a kontrola kończy kodem 0. Reguły czytające plik producenta tego nie widzą, bo tam wszystko jest na miejscu — po prostu nikt tego nie uruchamia.`
      );
    }
  }
}

if (bledy.length > 0) {
  console.error("straznik-monitora-wp:");
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}

console.log(
  "straznik-monitora-wp: monitoring w porządku (ekran czystym odczytem, kontrola nie pisze, cudze dane nietknięte, ruch anonimowy, hasło poza dziennikiem, awaria zapisu głośna, retencja z dwoma wyzwalaczami, ekran mówi prawdę o czujkach, handlery cudzych haków łapią Throwable, źródło doprecyzowane zamiast dublowane, trzy ścieżki logowania mają swoje haki, producent melduje czujkę i jest podpięty w pliku głównym, kontrola pyta o tabelę odłożoną przez przerwany test)."
);
