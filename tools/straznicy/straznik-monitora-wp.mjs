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
 * NIEZMIENNIKI KROKÓW T1–T3 (numery N z sekcji 8 schematu; każdy z mutacją
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
 *      linii dziennik jest martwy przy WSZYSTKICH bramkach zielonych,
 *  14. (P14, N18, F18, F20) KONTRAKT WYSTRZAŁU, cztery rzeczy naraz:
 *      obie nazwy akcji (`admin-post.php` rozgałęzia się po stanie
 *      zalogowania, a strony lekcji są za logowaniem), nazwa akcji
 *      w query stringu (schowana w ciele daje HTTP 200 i ciszę), wymóg
 *      typu `application/json` (cross-origin `text/plain` DOCHODZI,
 *      JSON nie — więc to typ, a nie `Origin`, jest tamą) oraz czytanie
 *      ciała strumieniem z sufitem (`post_max_size` to 8 MB, a limit
 *      64 KiB `sendBeacon` w pomiarze nie zadziałał).
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
const WYSTRZAL = join(KATALOG, "includes", "class-aai-monitor-wizyty.php");
const POMIAR = join(KATALOG, "includes", "class-aai-monitor-pomiar.php");
const SKRYPT = join(KATALOG, "assets", "pomiar.js");
const PODPIS = join(KATALOG, "includes", "class-aai-monitor-podpis.php");
const PRYWATNOSC = join(KATALOG, "includes", "class-aai-monitor-prywatnosc.php");
const FRAGMENT_POLITYKI = "docs/plugin-3/POLITYKA-PRYWATNOSCI.md";
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
  // Akcja `admin_post_*` jest dozwolona W JEDNYM PLIKU — w wystrzale
  // (T3). To NIE jest wyłom w N1: N1 mówi, że EKRAN nie zapisuje, a nie
  // że wtyczka nie ma prawa mieć punktu wejścia. Timer wizyt musi mieć
  // dokąd wysyłać beacon, i kanałem jest ten sam `admin-post.php`, którym
  // idą wszystkie akcje Pluginu 1. Regułę zawężamy więc do miejsca,
  // a w zamian reguła 14 wymaga od tego pliku obu nazw akcji — czyli
  // strażnik po tej zmianie pilnuje WIĘCEJ, nie mniej.
  const wystrzal = plik === WYSTRZAL;
  const zapisujace = [
    [/add_action\(\s*['"]admin_post_/, "akcja admin-post.php", wystrzal],
    [/add_action\(\s*['"]wp_ajax_/, "akcja wp_ajax", false],
    [/method\s*=\s*["']post["']/i, 'formularz method="post"', false],
    [/wp_nonce_field\s*\(|check_admin_referer\s*\(|wp_verify_nonce\s*\(/, "nonce", false],
  ];
  for (const [wzorzec, co, wolno] of zapisujace) {
    if (!wolno && wzorzec.test(tresc)) {
      bledy.push(
        `${plik}: ${co} w module, który ma wyłącznie patrzeć (N1). Ekran monitoringu jest czystym odczytem — jedyne, co można na nim zrobić, to patrzeć. Pojawienie się tu zapisu znaczy, że moduł przestał być monitoringiem i nikt tego nie zauważy, bo ekran dalej się otwiera. Filtry i stronicowanie jadą GET-em. Jedyny wyjątek to wystrzał timera wizyt (${WYSTRZAL}), który MUSI mieć akcję — i ma na to własną regułę.`
      );
    }
  }
}

/* ——— 14. (P14, N18) wystrzał rejestruje OBIE nazwy akcji ——— */

if (existsSync(WYSTRZAL)) {
  const tresc = kod(readFileSync(WYSTRZAL, "utf8"));
  // Pytamy o REJESTRACJĘ, nie o nazwę stałej: wzorzec przypięty do nazwy
  // przechodzi po przemianowaniu, a mechanizm zostaje martwy (nawrót
  // pułapki z 0.29.0, 0.44.0, 0.47.0 i c6c9c97).
  const gosc = /add_action\(\s*['"]admin_post_nopriv_/.test(tresc);
  const zalogowany = /add_action\(\s*['"]admin_post_(?!nopriv_)/.test(tresc);
  if (!gosc || !zalogowany) {
    bledy.push(
      `${WYSTRZAL}: wystrzał rejestruje tylko ${gosc ? "gałąź gościa" : "gałąź zalogowanych"} (P14, N18). \`admin-post.php\` rozgałęzia się po \`is_user_logged_in()\` na DWA ROZŁĄCZNE haki, a wizyty liczymy wszystkim oprócz adminów — strony lekcji są za logowaniem, więc brak \`admin_post_{action}\` gubi CAŁY ruch w kupionym materiale, a brak \`admin_post_nopriv_{action}\` cały ruch gości. Objawu nie ma: beacon dostaje \`wp_die( '', 400 )\`, którego nikt nie czyta.`
    );
  }

  // Nazwa akcji MUSI jechać w query stringu (F18): `$action` bierze się
  // z `$_REQUEST`, a ciała `application/json` PHP nie wkłada do `$_POST`.
  // Akcja schowana w ciele daje HTTP 200 i ciszę — najgorszy możliwy
  // objaw, czyli jego brak.
  if (!/admin_url\(\s*['"]admin-post\.php\?action=/.test(tresc)) {
    bledy.push(
      `${WYSTRZAL}: adres wystrzału nie niesie nazwy akcji w query stringu (F18). Bez \`?action=\` żądanie wpada w gałąź „brak akcji”, odpowiada HTTP 200 i nie zapisuje niczego — zmierzone na żywej instalacji.`
    );
  }

  // Typ ciała jest JEDYNĄ tamą na beacon z obcej witryny (F20):
  // cross-origin `text/plain` dochodzi, `application/json` nie, bo wymaga
  // preflightu. Bez tego sprawdzenia sito na `Origin` jest dekoracją.
  // Pytamy o POROWNANIE, nie o obecność napisu: sam łańcuch
  // „application/json” może zostać w kodzie (komunikat, komentarz
  // w stałej), a wymóg zniknąć — to szósty nawrót tej pułapki
  // w projekcie (0.29.0, 0.44.0, 0.47.0, c6c9c97, dwa razy w P4).
  if (!/['"]application\/json['"]\s*===|===\s*['"]application\/json['"]/.test(tresc)) {
    bledy.push(
      `${WYSTRZAL}: endpoint nie wymaga typu \`application/json\` (F20). Zmierzone: beacon z obcej witryny wysłany jako \`text/plain\` DOCHODZI, a ten sam ładunek jako JSON nie — bo wymaga preflightu, na który WordPress odpowiada 403. Bez wymogu typu obca strona może zawyżać nasz ruch z przeglądarki dowolnego odwiedzającego.`
    );
  }

  // Ciało czytane STRUMIENIEM z sufitem: `post_max_size` to 8 MB, więc
  // `file_get_contents( 'php://input' )` wciąga do pamięci wszystko, co
  // ktoś wyśle, ZANIM cokolwiek sprawdzimy. Limit 64 KiB `sendBeacon`
  // w pomiarze nie zadziałał (F23), więc sufit jest nasz albo go nie ma.
  /*
   * PYTAMY O SUFIT PRZY ODCZYCIE, nie o obecność słowa `fread` (B6
   * z przeglądu T3). Zmierzone: `fread( $uchwyt, 8 * 1024 * 1024 )`
   * z natychmiastowym `return $cialo` przechodziło na zielono, choć
   * wciąga do pamięci wszystko, co ktoś wyśle — a właśnie temu ten
   * mechanizm miał zapobiec. Dwa wymagania, bo są dwie decyzje:
   * ile najwyżej czytamy i co robimy, gdy tyle się doczytało.
   */
  const odczyt = tresc.match(/fread\s*\(\s*\$\w+\s*,\s*([^)]*)\)/);
  const jestSufitPrzyOdczycie = Boolean(odczyt && /SUFIT_CIALA_B/.test(odczyt[1]));
  const jestOdrzutPoOdczycie = /strlen\(\s*\$\w+\s*\)\s*>\s*self::SUFIT_CIALA_B\s*\?\s*null/.test(tresc);
  if (/file_get_contents\(\s*['"]php:\/\/input/.test(tresc) || !odczyt) {
    bledy.push(
      `${WYSTRZAL}: ciało żądania nie jest czytane strumieniem (Z9 audytu T3). \`post_max_size\` w kontenerze to 8 MB, a limit 64 KiB z dokumentacji \`sendBeacon\` w pomiarze NIE zadziałał — beacon 70 kB przeszedł i doszedł w całości.`
    );
  } else if (!jestSufitPrzyOdczycie) {
    bledy.push(
      `${WYSTRZAL}: strumień jest czytany BEZ SUFITU — drugi argument \`fread\` to „${odczyt[1].trim()}” i nie odwołuje się do \`SUFIT_CIALA_B\` (B6). Czytanie jest jedyną częścią obsługi, która kosztuje pamięć, więc sufit ma stać DOKŁADNIE tutaj; sam \`fread\` niczego nie chroni.`
    );
  }
  if (!jestOdrzutPoOdczycie) {
    bledy.push(
      `${WYSTRZAL}: po odczycie brakuje odrzutu ciała ponad sufit (B6). Deklarowany \`content-length\` to za mało — zmierzone na żywej instalacji: żądanie \`Transfer-Encoding: chunked\` NIE niesie deklaracji, dochodzi do PHP i zatrzymuje je wyłącznie porównanie tego, ile bajtów NAPRAWDĘ się doczytało.`
    );
  }
}

/* ——— 14b. (D3, B4) wystrzał ODMAWIA administratorowi ——— */

/*
 * Skrypt i tak nie jest administratorowi podawany (reguła 15), ale to za
 * mało: beacon może przyjść z karty otwartej PRZED zalogowaniem, a wtedy
 * odsłona zostałaby przypisana komuś, kogo z definicji nie mierzymy (D3).
 * Do przeglądu T3 tej gałęzi nie pilnowało NIC — mutacja kasująca ją
 * przechodziła u strażnika, a bramka nigdy nie wysyłała beaconu jako
 * administrator. Pytamy o ODMOWĘ, nie o wywołanie.
 */
if (existsSync(WYSTRZAL)) {
  const tresc = kod(readFileSync(WYSTRZAL, "utf8"));
  const obsluga = cialoMetody(tresc, "obsluz");
  if (null === obsluga) {
    bledy.push(`${WYSTRZAL}: nie znalazłem metody obsluz() — reguła o wykluczeniu administratora nie ma czego sprawdzić i milczy.`);
  } else if (!/if\s*\(\s*current_user_can\s*\([^)]*\)\s*\)\s*\{\s*return\s*;/.test(obsluga)) {
    bledy.push(
      `${WYSTRZAL}: obsluz() nie odmawia administratorowi (D3, B4). Beacon z karty otwartej przed zalogowaniem przypisałby odsłonę komuś, kogo z założenia nie mierzymy — a ekran obiecuje ruch KLIENTÓW, nie własny.`
    );
  }
}

/* ——— 15. (N8) skryptu pomiaru nie dostaje ani admin, ani strona 404 ——— */

if (existsSync(POMIAR)) {
  const tresc = kod(readFileSync(POMIAR, "utf8"));
  const decyzja = cialoMetody(tresc, "mierzymy");
  if (null === decyzja) {
    bledy.push(
      `${POMIAR}: nie znalazłem metody mierzymy() — to jedyne miejsce, które rozstrzyga, KTO dostaje skrypt pomiaru. Bez niej reguła nie ma czego sprawdzać i milczy.`
    );
  } else {
    /*
     * OBA WYMAGANIA PYTAJĄ O ODMOWĘ, nie o obecność wywołania (B5
     * z przeglądu T3). Zmierzone: `current_user_can( … );` bez `return
     * false` i `$blad = is_404();` przechodziły na zielono — mechanizm
     * był martwy, a strażnik zielony. Ósmy nawrót tej pułapki
     * w projekcie.
     */
    if (!/if\s*\(\s*current_user_can\s*\([^)]*\)\s*\)\s*\{\s*return\s+false\s*;/.test(decyzja)) {
      bledy.push(
        `${POMIAR}: mierzymy() nie ODMAWIA administratorowi (N8, D3). Samo wywołanie \`current_user_can\` niczego nie rozstrzyga — ma z niego wynikać \`return false\`. Administrator ma NIE być liczony, a skoro skrypt dostaje każdy, kto dostanie stronę, to jest jedyne miejsce, w którym da się go wykluczyć.`
      );
    }
    if (!/if\s*\(\s*is_404\s*\(\s*\)\s*\)\s*\{\s*return\s+false\s*;/.test(decyzja)) {
      bledy.push(
        `${POMIAR}: mierzymy() nie ODMAWIA stronie 404 (samo wywołanie is_404() bez odmowy nie wyklucza niczego) — a to nie jest oszczędność, tylko dziura w podpisie. Strona błędu renderuje się dla DOWOLNEGO adresu, więc podawanie tam skryptu rozdaje podpisy na ścieżki, których nie ma: wystarczy wejść na zmyślony adres, wziąć podpis ze źródła i zatruć nim listę najczęstszych stron.`
      );
    }
  }

  if (!/const UCHWYT = 'aai-monitor-/.test(tresc)) {
    bledy.push(
      `${POMIAR}: uchwyt skryptu nie zaczyna się od \`aai-monitor-\` (P11). To nie zwyczaj nazewniczy: \`Aai_Sklep_Zasoby\` zdejmuje z frontu uchwyty o prefiksach \`tutor\`, \`wc-\`, \`woocommerce\` i \`sourcebuster\`, więc nazwa spoza naszej rodziny może wpaść pod cudzy filtr i wyciszyć pomiar bez śladu.`
    );
  }
}

/* ——— 15c. (A4) kontrola pyta, czy kokpit i witryna mają to samo pochodzenie ——— */

/*
 * Adres wystrzału składa `admin_url()`, sito porównuje `Origin`
 * z `home_url()`. Każda różnica schematu, hosta albo portu zamienia
 * beacon w żądanie cross-origin — preflight, 403, zero zapisów, kontrola
 * zielona. Decyzja właściciela (2026-08-30): kod 1.
 */
if (existsSync(CLI)) {
  const tresc = kod(readFileSync(CLI, "utf8"));
  const kontrola = cialoMetody(tresc, "sprawdz");
  if (null === kontrola) {
    bledy.push(`${CLI}: nie znalazłem metody sprawdz() — reguła o pochodzeniu nie ma czego sprawdzić i milczy.`);
  } else {
    /*
     * PYTAMY O PORÓWNANIE DWÓCH PRZYPISAŃ, nie o obecność nazw.
     * Pierwsza wersja tej reguły sprawdzała, czy w ciele kontroli
     * występują `admin_url(` i `home_url(` — i była ŚLEPA, co złapał
     * audyt mutacyjny: podmiana `admin_url()` na `home_url()` w miejscu
     * pomiaru przechodziła, bo `admin_url()` zostawało w TREŚCI
     * KOMUNIKATU BŁĘDU. Dziewiąty nawrót tej pułapki w projekcie —
     * i pierwszy raz w regule napisanej PO opisaniu jej w tym samym
     * przeglądzie.
     */
    const zKokpitu = kontrola.match(/(\$\w+)\s*=\s*[^;]*admin_url\(\s*\)/);
    const zWitryny = kontrola.match(/(\$\w+)\s*=\s*[^;]*home_url\(\s*\)/);
    const uciekana = (nazwa) => nazwa.replace("$", "\\$");
    const porownane =
      zKokpitu &&
      zWitryny &&
      new RegExp(`${uciekana(zKokpitu[1])}\\s*!==\\s*${uciekana(zWitryny[1])}|${uciekana(zWitryny[1])}\\s*!==\\s*${uciekana(zKokpitu[1])}`).test(kontrola);
    if (!porownane) {
      bledy.push(
        `${CLI}: kontrola nie PORÓWNUJE pochodzenia kokpitu (\`admin_url\`) z pochodzeniem witryny (\`home_url\`) (A4). Przy rozjeździe beacon jedzie cross-origin, dostaje 403 na preflighcie i nie zapisuje się ANI RAZU — a kontrola melduje „w porządku”.`
      );
    }
  }
}

/* ——— 15b. (A7 + AUD-ARCH-F1-001) sól podpisu: zapis pusty przy konflikcie, do NASZEJ tabeli ——— */

/*
 * Dwie gwarancje, obie o tym samym wierszu:
 *
 *  1. ZAPIS NIE NADPISUJE (A7). `add_option()` pisze `INSERT … ON DUPLICATE
 *     KEY UPDATE` z `VALUES(option_value)` (zmierzone w option.php), więc
 *     przy wyścigu dwóch pierwszych żądań NADPISUJE sól tego, kto zdążył
 *     pierwszy — a jego strony są już w przeglądarkach i noszą podpisy
 *     liczone starą wartością. Objawu brak: beacon odpowiada 204 zawsze.
 *     Zapis ma być pusty przy konflikcie: `ON DUPLICATE KEY UPDATE k = k`.
 *
 *  2. ZAPIS IDZIE DO NASZEJ TABELI, NIE DO `wp_options` (AUD-ARCH-F1-001).
 *     Do 0.5.0 gwarancję 1 kupowaliśmy surowym INSERT-em do tabeli rdzenia
 *     — jedynym zapisem do cudzej tabeli w całym repo. Od 0.5.0 sól mieszka
 *     w `ustawienia`, a pisze ją warstwa zapisu (`ustawienie_utworz`).
 *     Reguła pyta o ZACHOWANIE w dwóch miejscach: tworzenie soli nie może
 *     dotykać `$wpdb->options` ani `add_option()`, a metoda warstwy zapisu
 *     musi mieć pusty `ON DUPLICATE`. Samo przeniesienie wywołania do innej
 *     metody niczego nie osłabia — pytamy o obie połowy niezależnie.
 */
if (existsSync(PODPIS)) {
  const tresc = kod(readFileSync(PODPIS, "utf8"));
  const tworzenie = cialoMetody(tresc, "sol");
  if (null === tworzenie) {
    bledy.push(`${PODPIS}: nie znalazłem metody sol() — reguła o powstawaniu soli nie ma czego sprawdzić i milczy.`);
  } else {
    if (/add_option\s*\(|update_option\s*\(/.test(tworzenie) || /\$wpdb->options/.test(tworzenie)) {
      bledy.push(
        `${PODPIS}: tworzenie soli pisze do \`wp_options\` (add_option/update_option albo surowo do \$wpdb->options). Od 0.5.0 sól mieszka w naszej tabeli \`ustawienia\` — zapis do tabeli rdzenia to przełamana granica wtyczki (AUD-ARCH-F1-001), a \`add_option()\` przy wyścigu NADPISUJE sól zwycięzcy (A7).`
      );
    }
    if (!/ustawienie_utworz\s*\(/.test(tworzenie)) {
      bledy.push(
        `${PODPIS}: tworzenie soli nie idzie przez warstwę zapisu (\`Aai_Monitor_Zapis::ustawienie_utworz\`). Zapis obok niej nie ma gwarancji „pusty przy konflikcie” — przegrany wyścig kasowałby sól zwycięzcy, a sito odrzucałoby jego strony w milczeniu (A7).`
      );
    }
  }
  // Sól z tabeli ma być czytana PRZED sięgnięciem do starej opcji — inaczej
  // migracja nigdy nie kończy się przejęciem, a kontrola świeci na zawsze.
  if (tworzenie) {
    /*
     * NAJPIERW „CZY OBA PYTANIA W OGÓLE PADAJĄ", POTEM KOLEJNOŚĆ.
     *
     * Pierwsza wersja porównywała same `indexOf`, a brakujące wywołanie
     * daje -1 — więc `sol()`, które w ogóle nie pyta tabeli, przechodziło
     * jako „dobra kolejność" (złapane mutacją przy P1 poz. 16). Reguła
     * o kolejności musi zacząć od tego, że jest co ustawiać w kolejności.
     */
    const wTabeli = tworzenie.indexOf("sol_z_tabeli");
    const wOpcji = tworzenie.indexOf("sol_z_opcji");
    if (wTabeli < 0) {
      bledy.push(`${PODPIS}: sol() nie pyta o sól WŁASNEJ tabeli — cała migracja z wp_options jest wtedy martwa, a tabela ozdobą.`);
    } else if (wOpcji < 0) {
      bledy.push(`${PODPIS}: sol() nie sięga po starą sól z wp_options — instalacja sprzed migracji straci podpisy stron już wysłanych do przeglądarek.`);
    } else if (wTabeli > wOpcji) {
      bledy.push(`${PODPIS}: sol() pyta starą opcję PRZED własną tabelą — po migracji dalej rządzi wp_options, a tabela jest ozdobą.`);
    }
  }
}
if (existsSync(WARSTWA_ZAPISU)) {
  const zapis = kod(readFileSync(WARSTWA_ZAPISU, "utf8"));
  const utworz = cialoMetody(zapis, "ustawienie_utworz");
  if (null === utworz) {
    bledy.push(`${WARSTWA_ZAPISU}: nie ma metody ustawienie_utworz() — sól nie ma jak powstać przez warstwę zapisu.`);
  } else if (!/ON DUPLICATE KEY UPDATE\s+`?(\w+)`?\s*=\s*`?\1`?/.test(utworz) || /REPLACE\s+INTO|INSERT\s+IGNORE|VALUES\s*\(\s*`?wartosc`?\s*\)/i.test(utworz)) {
    bledy.push(
      `${WARSTWA_ZAPISU}: ustawienie_utworz() nie jest zapisem PUSTYM przy konflikcie (oczekuję \`ON DUPLICATE KEY UPDATE klucz = klucz\`, nie REPLACE/INSERT IGNORE/VALUES(wartosc)). Przy wyścigu dwóch pierwszych żądań przegrany nadpisałby sól zwycięzcy, a strony wysłane przez zwycięzcę niosą już podpisy liczone starą solą — sito odrzuci je w milczeniu (A7).`
      );
  }
  if (utworz && !/\$wpdb->get_var\s*\(/.test(utworz)) {
    bledy.push(`${WARSTWA_ZAPISU}: ustawienie_utworz() nie czyta wartości Z BAZY po zapisie — przegrany wyścigu dostałby własną, niezapisaną sól i podpisywał nią strony, których sito nie przyjmie (A7).`);
  }
}

/* ——— 15c. (AUD-ARCH-F1-001) ŻADEN plik wtyczki nie pisze do tabel rdzenia ——— */

/*
 * Granica „wtyczka pisze tylko do swoich tabel" była do 0.5.0 przełamana
 * w jednym miejscu (sól). Po naprawie pilnujemy, żeby drugie takie miejsce
 * nie weszło po cichu: surowy INSERT/UPDATE/DELETE/REPLACE do
 * `$wpdb->options|posts|postmeta|users|usermeta|comments|terms*` jest
 * błędem w każdym pliku wtyczki. Odczyty (SELECT) są dozwolone.
 */
for (const [plik, tresc] of kodWtyczki) {
  const m = tresc.match(/(INSERT\s+INTO|UPDATE|DELETE\s+FROM|REPLACE\s+INTO)\s+`?\{?\$wpdb->(options|posts|postmeta|users|usermeta|comments|commentmeta|terms|termmeta|term_taxonomy|term_relationships)\b/i);
  if (m) {
    bledy.push(`${plik}: pisze surowym SQL-em do tabeli rdzenia WordPressa (${m[1]} \$wpdb->${m[2]}). Wtyczka pisze wyłącznie do WŁASNYCH tabel; do cudzych — przez API właściciela (AUD-ARCH-F1-001).`);
  }
}

/* ——— 16. (P17, F6, F22, B1) skrypt: jeden wiersz na odsłonę, reset po bfcache, bez automatów ——— */

/*
 * KAŻDE WYMAGANIE PYTA O ROZSTRZYGNIĘCIE, NIE O OBECNOŚĆ NAZWY.
 *
 * Do naprawy B2 (przegląd T3) trzy z sześciu wymagań pytały o sam napis
 * i były przez to ślepe — zmierzone na oryginale, trzema mutacjami, które
 * przeszły na zielono: `navigator.webdriver` przypisany do zmiennej
 * zamiast rozstrzygać (automaty liczone jak ludzie), `getItem` bez
 * `catch` (pomiar milczy u każdego, kto blokuje ciasteczka — drugi
 * `catch` w pliku wystarczał wzorcowi), skasowane startowe uruchomienie
 * zegara (strona przeczytana bez przełączania karty nie zapisuje się
 * wcale). To siódmy nawrót tej samej pułapki w projekcie: 0.29.0 nazwa
 * metody, 0.44.0 nazwa stałej, 0.47.0 treść komunikatu, c6c9c97 nazwa
 * stałej, dwa razy w P4.
 */

if (existsSync(SKRYPT)) {
  const js = readFileSync(SKRYPT, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  // Zmienna, której wartość naprawdę jedzie w ładunku jako czas czytania.
  // Od niej zależą dwa wymagania niżej, więc wyprowadzamy ją raz.
  const wLadunku = js.match(/trwanie_ms\s*:\s*([A-Za-z_$][\w$]*)/);
  // Bramka drugiej wysyłki: TA SAMA zmienna porównana ze znacznikiem
  // ostatniej wysyłki, z wyjściem z funkcji.
  const bramka = js.match(/if\s*\(\s*([A-Za-z_$][\w$]*)\s*<=\s*([A-Za-z_$][\w$]*)\s*\)\s*\{\s*return/);

  const wymagania = [
    [
      // Nie „czy pada słowo webdriver", tylko „czy z tego wynika wyjście".
      /if\s*\(\s*navigator\.webdriver\s*\)\s*\{\s*return/.test(js),
      "skrypt nie WYCHODZI przy navigator.webdriver (F6) — samo odczytanie flagi niczego nie daje, a automaty liczyłyby się jak ludzie i para bramek N9/N10 straciłaby sens",
    ],
    [
      // Bramka drugiej wysyłki musi porównywać DOKŁADNIE tę liczbę, która
      // pojedzie w ładunku — inaczej pilnuje czegoś innego niż wysyłka.
      Boolean(bramka && wLadunku && bramka[1] === wLadunku[1]),
      "skrypt nie porównuje wysyłanego czasu z czasem ostatniej wysyłki (P17, B1). Bez tego: pagehide i visibilitychange odpalają w TEJ SAMEJ milisekundzie, więc każda odsłona szłaby dwoma identycznymi beaconami; a z bramką na samej fladze „już wysłane” czas doczytany po powrocie do karty nie dojeżdża wcale (zmierzone: 1559 ms zamiast 5530)",
    ],
    [
      // Powrót z bfcache musi ZDJĄĆ znacznik wysyłki, nie tylko go zauważyć.
      Boolean(bramka && new RegExp(`persisted[\\s\\S]{0,600}?\\b${bramka[2]}\\s*=`).test(js)),
      "skrypt nie zeruje znacznika wysyłki po powrocie z bfcache (F22). Strona wraca z ZACHOWANYM stanem JS, więc bez zdjęcia znacznika nawigacja „wstecz” nie liczy się ani razu",
    ],
    [
      // Każde sięgnięcie do magazynu ma stać W ŚRODKU `try` — liczymy to
      // po pozycji, bo obecność słowa `catch` gdziekolwiek w pliku
      // przepuszczała zdjęcie osłony z drugiego wywołania.
      [...js.matchAll(/sessionStorage/g)].every((m) => /try\s*\{[^{}]*$/.test(js.slice(Math.max(0, m.index - 200), m.index))),
      "skrypt sięga po sessionStorage POZA `try` (choćby raz). Magazyn rzuca SecurityError przy zablokowanych ciasteczkach, więc pomiar milczałby u części odwiedzających — bez jednego objawu",
    ],
    [
      /sendBeacon\([\s\S]{0,300}?type:\s*["']application\/json["']/.test(js),
      "beacon nie deklaruje typu application/json PRZY WYSYŁCE (F10, F20). Zwykły łańcuch idzie jako text/plain, którego endpoint nie przyjmuje — a przyjmować nie może, bo to właśnie text/plain przechodzi cross-origin",
    ],
    [
      // Zegar MUSI ruszyć już przy wejściu na stronę. Bez tego odsłona
      // bez ani jednego przełączenia karty ma czas 0 i nie powstaje wcale.
      /if\s*\(\s*["']visible["']\s*===\s*document\.visibilityState\s*\)\s*\{\s*[A-Za-z_$][\w$]*\(\);?\s*\}\s*\}\)\(\);?\s*$/.test(js.trim()),
      "skrypt nie uruchamia zegara przy WEJŚCIU na widoczną stronę — czas liczyłby się dopiero od pierwszego przełączenia karty, więc strona przeczytana i zamknięta bez przełączania nie zapisałaby się ani razu",
    ],
  ];
  for (const [spelnione, opis] of wymagania) {
    if (!spelnione) {
      bledy.push(`${SKRYPT}: ${opis}.`);
    }
  }
}

/* ——— 17. teksty ekranu bez podwójnej ucieczki cudzysłowu ——— */

if (existsSync(EKRAN)) {
  // `esc_html` zamienia prosty `"` na `&quot;`, więc cudzysłów wpisany
  // w tekst tłumaczony trafia na ekran jako encja. Ta sama klasa co
  // 29 podpisów w podglądzie kursów (0.34.0) — i tak samo niewidoczna
  // dla wszystkiego poza ludzkim okiem.
  const zle = [...readFileSync(EKRAN, "utf8").matchAll(/__\(\s*'([^']*)'/g)]
    .map((m) => m[1])
    .filter((t) => t.includes('"'));
  for (const tekst of zle) {
    bledy.push(
      `${EKRAN}: tekst na ekran zawiera prosty cudzysłów — \`esc_html\` zamieni go na \`&quot;\` i klient zobaczy encję zamiast znaku. Użyj „typograficznych”. Tekst: „${tekst.slice(0, 60)}…”`
    );
  }
}

/* ——— 18. fragment polityki w repo zgodny z treścią w kodzie ——— */

if (existsSync(PRYWATNOSC) && existsSync(FRAGMENT_POLITYKI)) {
  // Dokument obiecuje wprost, że jego treść jest identyczna z tą, którą
  // melduje wtyczka. Dwie kopie tekstu PRAWNEGO rozjadą się przy
  // pierwszej poprawce, a rozjazd zobaczy dopiero ktoś, kto czyta oba
  // naraz — czyli nikt.
  const zKodu = [...readFileSync(PRYWATNOSC, "utf8").matchAll(/__\(\s*'([^']*)'\s*,\s*'aai-monitor'\s*\)/g)]
    .map((m) => m[1].replace(/\\'/g, "'"))
    .filter((t) => t.length > 120);
  // Fragment stoi w cytacie blokowym, więc najpierw zdejmujemy „> ”
  // z początku linii — inaczej porównanie nie ma szans i reguła zapala
  // się fałszywie przy zgodnej treści.
  const dokument = readFileSync(FRAGMENT_POLITYKI, "utf8").replace(/^>\s?/gm, "").replace(/\s+/g, " ");
  const brakujace = zKodu.filter((t) => !dokument.includes(t.replace(/\s+/g, " ")));
  if (brakujace.length > 0) {
    bledy.push(
      `${FRAGMENT_POLITYKI}: ${brakujace.length} akapit(ów) z ${PRYWATNOSC} nie ma w gotowym fragmencie, choć dokument obiecuje treść identyczną. Polityka prywatności żyje w dwóch miejscach (kod wtyczki i tekst do wklejenia w motywie, do którego mamy dostęp tylko do odczytu) — rozjazd między nimi znaczy, że klient czyta co innego, niż witryna robi. Pierwszy brakujący: „${brakujace[0].slice(0, 70)}…”`
    );
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

/*
 * 5b. (N5, druga połowa) Z WARTOŚCI NIEISTNIEJĄCEGO KONTA NIE ZOSTAJE ZNAK.
 *
 * Reguła 5 wyżej pilnuje, żeby kod nie sięgnął po hasło z żądania. Nie broniła
 * jednak przed drugą drogą, którą hasło NAPRAWDĘ wyciekło: rdzeń sam podaje
 * `wp_login_failed` wartość wpisaną w pole loginu, a w to pole hasło trafia
 * przy autouzupełnianiu, złym układzie klawiatury i pomyłce o jedno pole.
 * Maskowanie zostawiało trzy pierwsze znaki, „gdy wartość wygląda na login" —
 * a kryterium `sanitize_user( $x, true ) === $x` przepuszcza KAŻDE hasło bez
 * znaku specjalnego. Zmierzone przez prawdziwy formularz: „Haslo123" wylądowało
 * w bazie jako „Has…(8 znaków)" na 90 dni, w każdej kopii zapasowej i na ekranie
 * każdego z `manage_options` — wbrew zdaniu, które sama ta wtyczka drukuje
 * w polityce prywatności.
 *
 * REGUŁA CELUJE W ROZSTRZYGNIĘCIE, NIE W NAZWĘ (dziewięć nawrotów tej pułapki
 * w tym projekcie): pytamy, czy maskujący kod WYCINA KAWAŁEK podanej wartości —
 * dowolną funkcją krojącą łańcuch. Nie pytamy o nazwę stałej, kryterium ani
 * komentarz, bo każde z nich da się przemianować, zostawiając wyciek.
 *
 * Dlaczego tutaj, a nie tylko w bramce: `smoke-wp-monitor` mierzy to na żywej
 * instalacji i jest mocniejszym dowodem, ale wymaga kontenera i NIE biegnie
 * w CI. Ta reguła biegnie w `npm run check` przy każdym commicie.
 */
{
  const PLIK_LOGOWAN = "wordpress/wtyczki/aai-monitor/includes/class-aai-monitor-logowania.php";
  const wpis = kodWtyczki.find(([plik]) => plik === PLIK_LOGOWAN);
  if (!wpis) {
    bledy.push(
      `${PLIK_LOGOWAN}: nie znalazłem pliku producenta dziennika logowań (5b) — reguła nie ma czego sprawdzić, a milcząca reguła jest gorsza niż jej brak.`
    );
  } else {
    const ciało = wpis[1].match(/function\s+bezpieczny_login\s*\([^)]*\)[^{]*\{([\s\S]*?)\n\t\}/);
    if (!ciało) {
      bledy.push(
        `${PLIK_LOGOWAN}: nie znalazłem ciała bezpieczny_login() (5b). Samokontrola zakresu: reguła, która nie trafia w mierzony kod, przechodzi PO PUSTCE.`
      );
    } else {
      const kroi = ciało[1].match(/\b(?:mb_substr|substr|mb_strcut|str_split|preg_replace)\s*\(/);
      if (kroi) {
        bledy.push(
          `${PLIK_LOGOWAN}: bezpieczny_login() wycina kawałek podanej wartości (${kroi[0].trim()}) na ścieżce maskowania (N5, 5b). W pole loginu trafia czasem HASŁO, a kształt go od loginu NIE odróżnia — sanitize_user( $x, true ) przepuszcza każde hasło bez znaku specjalnego. Wartość, która nie wskazuje ISTNIEJĄCEGO konta, ma zostawić samą długość: ani jednego znaku.`
        );
      }
    }
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
  /*
   * 9b. (A9) ŻADEN NASZ HANDLER NIE MOŻE WYWRÓCIĆ SIĘ NA SAMYM WYWOŁANIU.
   *
   * Ta reguła obejmuje TAKŻE haki naszego kokpitu — bo tam właśnie
   * znalazł ją przegląd T3. `Aai_Monitor_Ekran::zasoby( string $uchwyt )`
   * był jedynym typowanym parametrem bez wartości domyślnej i cudza
   * wtyczka odpalająca `admin_enqueue_scripts` z `null` wywracała CAŁY
   * kokpit. `TypeError` powstaje PRZY WYWOŁANIU, więc nie łapie go żaden
   * `try` w środku metody — reguła o Throwable jest wtedy bezradna,
   * a sama wartość domyślna broni wyłącznie przed argumentem POMINIĘTYM
   * (zmierzone: z `null` typowany parametr dalej rzucał).
   *
   * Stąd dwa wymagania naraz: KAŻDY parametr ma wartość domyślną
   * i NIE MA deklaracji typu. Typ sprawdza się w ciele — tam wynikiem
   * jest `return`, a nie wyjątek u kogoś obcego.
   */
  for (const [, hak, metoda] of rejestracje) {
    /*
     * Sygnatury szukamy w CAŁEJ wtyczce, nie w pliku rejestracji.
     * Pierwsza wersja tej reguły pytała o ten sam plik i była przez to
     * ŚLEPA — zmierzone testem negatywnym: `Aai_Monitor_Ekran::zasoby()`
     * jest rejestrowana w `aai-monitor.php`, a mieszka w swojej klasie,
     * więc przywrócenie typowanego parametru przechodziło na zielono.
     */
    const sygnatury = kodWtyczki
      .map(([, t]) => t.match(new RegExp(`function\\s+${metoda}\\s*\\(([^)]*)\\)`)))
      .filter(Boolean);
    for (const sygnatura of sygnatury) {
      for (const parametr of sygnatura[1].split(",").map((x) => x.trim()).filter(Boolean)) {
        if (!parametr.includes("=")) {
          bledy.push(
            `${plik}: ${metoda}() (hak „${hak}") ma parametr „${parametr}" BEZ WARTOŚCI DOMYŚLNEJ (A9). Cudzy kod woła nasze haki, jak chce — także z mniejszą liczbą argumentów — a brakujący argument to ArgumentCountError rzucony PRZY WYWOŁANIU, poza zasięgiem jakiegokolwiek try w środku.`
          );
        } else if (!/^\$/.test(parametr)) {
          bledy.push(
            `${plik}: ${metoda}() (hak „${hak}") ma parametr z DEKLARACJĄ TYPU: „${parametr}" (A9). Przy strict_types wywołanie z „null” albo z innym typem rzuca TypeError PRZY WYWOŁANIU — zmierzone na admin_enqueue_scripts, gdzie wywracało cały kokpit; wartość domyślna przed tym NIE broni. Typ sprawdź w ciele metody.`
          );
        }
      }
    }
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

/* ————— 19. cały start wtyczki stoi w try/catch (test całości 2026-08-31) ————— */
/*
 * DLACZEGO TO JEST REGUŁA, A NIE STYL. Autoloader wtyczki POMIJA plik
 * nieczytelny (`is_readable`), więc brak JEDNEGO pliku z `includes/`
 * kończy się `Error: Class not found` — a jeśli pada on w callbacku
 * `plugins_loaded`, to na KAŻDYM żądaniu, czyli HTTP 500 na całej
 * witrynie razem ze sklepem. Zmierzone różnicowo tego dnia: wywołanie
 * spod `try` → strona 200, to samo wywołanie poza `try` → 500.
 *
 * Pytamy o POŁOŻENIE wywołań, nie o obecność słowa „try": każde
 * `Aai_Monitor_*::` w tym pliku ma stać między `try {` a `} catch`.
 */
{
  const plikGlowny = GLOWNY;
  const zrodlo = existsSync(plikGlowny) ? kod(readFileSync(plikGlowny, "utf8")) : "";
  const start = zrodlo.indexOf("'plugins_loaded'");
  if (start !== -1) {
    const blok = zrodlo.slice(start);
    /*
     * KAŻDY ZAKRES `try … } catch` OSOBNO, nie „pierwszy w pliku".
     *
     * Pierwsza wersja brała `blok.indexOf("try {")` i uznawała za chronione
     * wszystko, co stoi dalej. Działało, dopóki w haku był JEDEN `try`.
     * Od 2026-09-05 każdy krok startu jedzie przez osłonę `$bezpiecznie(…)`,
     * a ta ma WŁASNY `try` w swoim ciele — i ten własny stoi PIERWSZY. Reguła
     * zaczęła więc uznawać za chronione dosłownie wszystko po definicji
     * pomocnika, łącznie z wywołaniami wystawionymi poza ochronę. Wykrył to
     * audyt mutacyjny (mutacja „start wychodzi poza try/catch" przeszła), nie
     * lektura.
     *
     * Teraz liczymy WSZYSTKIE pary `try … } catch` i pytamy, czy wywołanie
     * mieści się w którejkolwiek. Wywołania po ostatnim `} catch` pomijamy
     * świadomie: tam mieszka sam raport o błędzie, strzeżony `class_exists` —
     * reguła pytająca też o nie zapalałaby się na poprawnym kodzie
     * (sprawdzone: najwcześniejsza wersja tak właśnie robiła).
     */
    const zakresy = [];
    for (const t of blok.matchAll(/\btry\s*\{/g)) {
      const c = blok.indexOf("} catch", t.index);
      if (c !== -1) zakresy.push([t.index, c]);
    }
    const ostatnieZamkniecie = zakresy.length ? Math.max(...zakresy.map(([, c]) => c)) : -1;
    const pozaOslona = [];
    for (const m of blok.matchAll(/Aai_Monitor_[A-Za-z_]+::(?:zarejestruj|dociagnij_schemat|utworz)\(/g)) {
      if (m.index > ostatnieZamkniecie) continue;
      if (!zakresy.some(([o, c]) => m.index > o && m.index < c)) {
        pozaOslona.push(m[0]);
      }
    }
    if (pozaOslona.length > 0) {
      bledy.push(
        `${plikGlowny}: ${pozaOslona.length} wywołań startu poza try/catch (np. ${pozaOslona[0]}). Brak jednego pliku z includes/ daje wtedy HTTP 500 na CAŁEJ witrynie — zmierzone 2026-08-31.`
      );
    }
  }
}

/*
 * OBIE TABELE MONITORINGU MAJĄ SUFIT LICZBY WIERSZY, NIE TYLKO WIEK.
 *
 * Ruch dostał go przy przeglądzie T3 (A2). Dziennik logowań został z samą
 * retencją po WIEKU — a nieudane logowanie zapisuje KAŻDY, kto wyśle
 * formularz. Zmierzone tempo: 28 wierszy w 1,4 s, czyli ~72 000 na godzinę.
 * Wszystkie te wiersze są młodsze niż 90 dni, więc retencja po wieku nie
 * rusza ich w ogóle: jedna uparta próba zgadywania hasła rozdyma tabelę,
 * kopie zapasowe i ekran właściciela, a jedynym hamulcem jest limiter.
 *
 * Reguła pyta o rozstrzygnięcie: przycinanie po liczbie wierszy jest
 * wywoływane dla OBU tabel. Ma samokontrolę zakresu.
 */
{
  const ZAPIS = "wordpress/wtyczki/aai-monitor/includes/class-aai-monitor-zapis.php";
  const TABELE = "wordpress/wtyczki/aai-monitor/includes/class-aai-monitor-tabele.php";
  if (!existsSync(ZAPIS) || !existsSync(TABELE)) {
    bledy.push(`${ZAPIS}: nie znalazłem warstwy zapisu monitoringu — reguła o sufitach nie ma czego sprawdzić.`);
  } else {
    const zapis = kod(readFileSync(ZAPIS, "utf8"));
    const tabele = kod(readFileSync(TABELE, "utf8"));
    const wywolania = (zapis.match(/przytnij_liczbe\s*\(/g) ?? []).length;
    if (wywolania === 0) {
      bledy.push(
        `${ZAPIS}: nie ma przycinania po liczbie wierszy — samokontrola zakresu: reguła o sufitach przechodziłaby PO PUSTCE.`
      );
    } else {
      for (const [ktora, stala] of [["logowania", "SUFIT_WIERSZY_LOGOWAN"], ["wizyty", "SUFIT_WIERSZY_WIZYT"]]) {
        if (!new RegExp(`przytnij_liczbe\\s*\\(\\s*'${ktora}'`).test(zapis)) {
          bledy.push(
            `${ZAPIS}: tabela „${ktora}" nie jest przycinana po LICZBIE wierszy, tylko po wieku. Wiersze młodsze niż okno retencji rosną wtedy bez ograniczenia — przy dzienniku logowań zmierzono 28 wierszy w 1,4 s, czyli ~72 000 na godzinę, wszystkie młodsze niż 90 dni.`
          );
        }
        if (!new RegExp(`const ${stala}\\s*=\\s*\\d+`).test(tabele)) {
          bledy.push(`${TABELE}: brak stałej ${stala} — sufit tabeli „${ktora}" nie ma wartości.`);
        }
      }
    }
  }
}

/* ————————— 19. kontrola pyta, czy ktokolwiek odpowiada o bramkę —————————
   Kolumna „bramka" odróżnia „ktoś przeczytał lekcję" od „ktoś odbił się
   od logowania" — i jest jedyną liczbą na ekranie, która to potrafi.
   Monitoring sam nie wie, co jest bramką: pyta filtrem, a odpowiada widok
   lekcji Pluginu 1. Gdy rejestracja zniknie, flaga jest zawsze fałszywa,
   dane wyglądają zdrowo i NIC się nie zapala. Zmierzone 0.78.0 mutacją
   zdejmującą add_filter w Pluginie 1: kontrola milczała. */
{
  const cli = "wordpress/wtyczki/aai-monitor/includes/class-aai-monitor-cli.php";
  const pomiar = "wordpress/wtyczki/aai-monitor/includes/class-aai-monitor-pomiar.php";
  if (existsSync(cli) && existsSync(pomiar)) {
    const c = kod(readFileSync(cli, "utf8"));
    const pm = kod(readFileSync(pomiar, "utf8"));

    if (!/has_filter\s*\(\s*Aai_Monitor_Pomiar::FILTR_BRAMKI/.test(c)) {
      bledy.push(
        `${cli}: kontrola nie pyta, czy ktokolwiek odpowiada na filtr bramki logowania (19). Bez odpowiadającego kolumna „bramka" jest zawsze fałszywa, a ekran pokazuje odbicia od logowania jako zwykłe odsłony — dane są ciche i wyglądają zdrowo.`
      );
    }
    if (!/public const FILTR_BRAMKI/.test(pm)) {
      bledy.push(
        `${pomiar}: nazwa filtru bramki nie jest stałą (19). Wpisana dwa razy rozjeżdża się przy pierwszej zmianie, a wtedy kontrola pyta o filtr, którego nikt nie używa, i milczy o tym, który jest naprawdę potrzebny.`
      );
    }
  }
}

/* ————————— 20. każda gałąź retencji jest SŁYSZALNA —————————
   Retencja ma dwie drogi kasowania: po wieku i po suficie liczby wierszy.
   Obie mogą zawieść, obie milczą z natury (biegną w cudzym żądaniu), więc
   obie muszą zgłaszać awarię do kanału błędów. Do 0.78.0 zgłaszała tylko
   pierwsza, a i to sprawdzeniem, które stało za rzutowaniem i było martwe. */
{
  const zapis = "wordpress/wtyczki/aai-monitor/includes/class-aai-monitor-zapis.php";
  if (existsSync(zapis)) {
    const t = kod(readFileSync(zapis, "utf8"));
    const sufit = t.match(/private static function przytnij_liczbe\([\s\S]*?\n\t\}/);
    if (!sufit) {
      bledy.push(`${zapis}: nie znalazłem ciała przytnij_liczbe() (20). Samokontrola zakresu.`);
    } else if (!/self::zglos\s*\(/.test(sufit[0])) {
      bledy.push(
        `${zapis}: ścinanie tabeli do sufitu nie zgłasza awarii (20). Nieudane kasowanie oddaje wtedy zero, czyli liczbę nie do odróżnienia od „nie było czego kasować" — tabela rośnie dalej, a jedyny ekran, który miałby o tym powiedzieć, milczy.`
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
  "straznik-monitora-wp: monitoring w porządku (ekran czystym odczytem, kontrola nie pisze, cudze dane nietknięte, ruch anonimowy, hasło poza dziennikiem, awaria zapisu głośna, retencja z dwoma wyzwalaczami, ekran mówi prawdę o czujkach, handlery cudzych haków łapią Throwable, źródło doprecyzowane zamiast dublowane, trzy ścieżki logowania mają swoje haki, producent melduje czujkę i jest podpięty w pliku głównym, kontrola pyta o tabelę odłożoną przez przerwany test, wystrzał ma obie nazwy akcji i akcję w query stringu, wymaga typu JSON i czyta ciało strumieniem, skryptu nie dostaje admin ani strona 404, skrypt wysyła raz i wraca do życia po bfcache, teksty ekranu bez podwójnej ucieczki, polityka w repo zgodna z kodem, obie tabele mają sufit liczby wierszy, kontrola pyta, czy ktokolwiek odpowiada o bramkę logowania, a obie gałęzie retencji są słyszalne)."
);
