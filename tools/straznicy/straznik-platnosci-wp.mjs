/**
 * Strażnik Pluginu 2 (`aai-platnosci`) — niezmienniki zaakceptowanego
 * schematu (docs/plugin-2/DIAGRAM.md, sekcja 10), których złamanie NIE
 * objawia się błędem.
 *
 * PO CO OSOBNY STRAŻNIK. `straznik-wtyczki-wp` pilnuje reguł wspólnych
 * każdej naszej wtyczce (nagłówki, ABSPATH, prepare, warstwa zapisu).
 * Plugin 2 ma do tego niezmienniki WŁASNE, wynikające z bycia szwem do
 * cudzego kodu — i każdy z nich łamie się po cichu: sklep dalej działa,
 * tylko klient płaci i nie dostaje, albo dostaje za darmo.
 *
 * SIEDEM NIEZMIENNIKÓW (numery z sekcji 10 schematu; każdy z mutacją
 * w audyt-straznikow):
 *   1. zero `wp_ajax_*` — DECYZJA WŁAŚCICIELA 2026-08-28: „Plugin 2 nie
 *      wprowadza żadnego własnego AJAX-a" (sekcja 11 schematu),
 *   2. zero `add_rewrite_rule` — Plugin 2 nie dodaje żadnej trasy
 *      (niezm. 11; koszyk i kasa to strony WP, nie reguły),
 *   3. jednokierunkowość (niezm. 2): zero zapisów do tabel `aai_sklep_*`
 *      i zero wywołań `Aai_Sklep_Zapis::` — dane Pluginu 1 są dla nas
 *      tylko do czytania,
 *   4. zero kasowania produktu WooCommerce (niezm. 13) — produkt kupiony
 *      jest częścią historii zamówień,
 *   5. cena nigdy metą (niezm. 3 + B5): zero `_sale_price` w jakiejkolwiek
 *      formie, zero `update_post_meta` na `_regular_price`/`_price` —
 *      zapis samej mety zostawia `_price` po staremu: katalog pokazuje
 *      nową cenę, kasa liczy starą, kontrola tego nie widzi,
 *   6. każdy słuchacz haków `aai_sklep_*` łapie `Throwable` (niezm. 17) —
 *      niezłapany wyjątek wylatuje przez `zapisz_kurs()` Pluginu 1
 *      i właściciel zamiast „Kurs zapisany" widzi błąd krytyczny; słuchacz
 *      musi być tablicą (klasa, metoda), bo domknięcia nie da się
 *      statycznie sprawdzić,
 *   7. produkt WooCommerce piszą wyłącznie metody warstwy zapisu
 *      (niezm. 1 i 6 od strony naszego kodu): `wp_update_post`,
 *      `wp_insert_post`, `->save()` i `update_post_meta` poza
 *      `class-aai-platnosci-zapis.php` = czerwone.
 *
 *   8. KOLEJNOŚĆ POWIĄZANIA (B2): przy wiązaniu `_tutor_course_price_type`
 *      pada PRZED `_tutor_course_product_id`, przy zdejmowaniu — odwrotnie.
 *      Odwrotna kolejność ROZDAJE KURS ZA DARMO: `product_belongs_with_course()`
 *      już znajduje kurs, `is_course_purchasable()` jeszcze nie, więc
 *      `do_enroll()` tworzy zapis `completed` na zamówieniu `pending`.
 *      Smoke mierzy to samo uruchomieniowo (hakiem na meta) — strażnik
 *      łapie regresję od razu, bez stawiania środowiska,
 *   9. produkt RODZI SIĘ jako `draft` (B3) — opublikowany produkt bez
 *      powiązania to stan „klient płaci i nie dostaje nic",
 *  10. produkt jest UKRYTY w katalogu Woo (decyzja właściciela 2026-08-28):
 *      jedyną witryną zakupu jest nasza strona sprzedażowa.
 *
 * Użycie: node tools/straznicy/straznik-platnosci-wp.mjs
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const KATALOG = "wordpress/wtyczki/aai-platnosci";
const WARSTWA_ZAPISU = join(KATALOG, "includes", "class-aai-platnosci-zapis.php");
const bledy = [];

if (!existsSync(KATALOG)) {
  console.log("straznik-platnosci-wp: pominięte — wtyczki aai-platnosci jeszcze nie ma.");
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

for (const plik of plikiPhp(KATALOG)) {
  const tresc = kod(readFileSync(plik, "utf8"));

  /* 1. zero wp_ajax_* */
  if (/wp_ajax_/.test(tresc)) {
    bledy.push(
      `${plik}: rejestruje AJAX (wp_ajax_*). Decyzja właściciela 2026-08-28: Plugin 2 nie wprowadza żadnego własnego AJAX-a — naprawę jednego kursu robi przycisk „Zapisz kurs" Pluginu 1, zbiorczą komenda wp aai-platnosci sync.`
    );
  }

  /* 2. zero add_rewrite_rule */
  if (/add_rewrite_rule\s*\(/.test(tresc)) {
    bledy.push(
      `${plik}: dodaje trasę (add_rewrite_rule). Plugin 2 nie dodaje żadnej trasy (niezmiennik 11 schematu); gdyby trasa była kiedyś potrzebna, wchodzi przez otwarcie Aai_Sklep_Trasy::PODSTRONY filtrem — BLAD-021.`
    );
  }

  /* 3. jednokierunkowość */
  if (/Aai_Sklep_Zapis::/.test(tresc)) {
    bledy.push(
      `${plik}: woła Aai_Sklep_Zapis:: — Plugin 2 NIE pisze do danych Pluginu 1 (niezmiennik 2). Droga powrotna nie istnieje: kopia ceny jedzie w jedną stronę.`
    );
  }
  if (/aai_sklep_(courses|sections|modules|lessons|changelog)/.test(tresc)) {
    // Sama nazwa tabeli Pluginu 1 w naszym kodzie to podejrzenie odczytu
    // wprost z cudzych tabel — odczyt idzie przez publiczne API Pluginu 1
    // (Aai_Sklep_Odczyt), zapis jest zakazany bezwzględnie.
    bledy.push(
      `${plik}: dotyka tabel aai_sklep_* po nazwie. Dane Pluginu 1 czytamy przez jego publiczne API (Aai_Sklep_Odczyt), nie SQL-em po cudzych tabelach; pisanie do nich jest zakazane bezwzględnie (niezmiennik 2).`
    );
  }

  /* 4. zero kasowania produktu — `$wpdb->delete` na WŁASNEJ tabeli
     (zdjęcie powiązania) to nie kasowanie wpisu, stąd wyjątek dla wpdb. */
  if (/wp_delete_post\s*\(|wp_trash_post\s*\(|(?<!wpdb)->\s*delete\s*\(/.test(tresc)) {
    bledy.push(
      `${plik}: kasuje wpis (wp_delete_post / wp_trash_post / ->delete()). W kodzie Pluginu 2 nie ma ŻADNEGO kasowania produktu (niezmiennik 13) — produkt kupiony to historia zamówień, faktury i wpisy zarobkowe; ze sklepu zdejmuje go status draft.`
    );
  }

  /* 5. cena nigdy metą — reguła celuje w ZAPIS, nie w wystąpienie nazwy.
     `get_sale_price()` musimy czytać, żeby NIE nadpisać promocji ustawionej
     w Woo (kontrola ceny efektywnej, B5); zakaz dotyczy pisania. */
  const zapisPromocji = tresc.match(
    /set_sale_price\s*\(|update_post_meta\s*\([^;]*['"]_sale_price['"]|['"]_sale_price['"]\s*=>/
  );
  if (zapisPromocji) {
    bledy.push(
      `${plik}: ZAPISUJE cenę promocyjną (${zapisPromocji[0].trim()}). Pola ceny promocyjnej nie dotykamy NIGDY (decyzja właściciela 2026-08-26, niezmiennik 3) — promocje należą do WooCommerce. Odczyt get_sale_price() jest dozwolony i konieczny, żeby kontrola ceny efektywnej nie kłamała.`
    );
  }
  const metaCeny = tresc.match(/update_post_meta\s*\([^;]*['"](_regular_price|_price)['"]/);
  if (metaCeny) {
    bledy.push(
      `${plik}: ZAPISUJE cenę metą (${metaCeny[1]} przez update_post_meta). Cena idzie WYŁĄCZNIE przez WC_Product::set_regular_price() + save() (B5): zapis samej mety zostawia _price po staremu — katalog pokazuje nową cenę, kasa liczy starą, a kontrola porównująca get_regular_price() tego nie widzi.`
    );
  }

  /* 6. słuchacze aai_sklep_* łapią Throwable */
  //
  // Wzorzec bierze CAŁY argument callbacku aż do zamknięcia `array( … )`
  // — pierwsza wersja urywała się na przecinku WEWNĄTRZ `array( self::class,`
  // i oskarżała poprawnych słuchaczy (fałszywy alarm złapany przy P2).
  const rejestracje = [
    ...tresc.matchAll(
      /add_(?:action|filter)\(\s*['"](aai_sklep_\w+)['"]\s*,\s*(array\s*\([^)]*\)|[^,)]+)/gs
    ),
  ];
  for (const [, hak, callback] of rejestracje) {
    const tablica = callback.match(/array\s*\(\s*(?:self::class|__CLASS__|['"][\w\\]+['"])\s*,\s*['"](\w+)['"]\s*\)/);
    if (!tablica) {
      bledy.push(
        `${plik}: słuchacz haka ${hak} nie jest tablicą (klasa, metoda) — domknięcia nie da się statycznie sprawdzić na catch(Throwable), a każdy słuchacz haków Pluginu 1 MUSI go mieć (niezmiennik 17): wyjątek wyleciałby przez zapisz_kurs() i przerwał zapis właściciela.`
      );
      continue;
    }
    const metoda = tablica[1];
    const cialo = tresc.match(
      new RegExp(`function\\s+${metoda}\\s*\\([\\s\\S]*?\\n\\t\\}`)
    );
    if (!cialo || !/catch\s*\(\s*Throwable\b/.test(cialo[0])) {
      bledy.push(
        `${plik}: metoda ${metoda}() słucha haka ${hak} i nie łapie Throwable (niezmiennik 17). Awaria kopii NIE może cofać zapisu kursu — błąd jedzie do opcji i na ekran kokpitu, nie przez wyjątek do właściciela.`
      );
    }
  }

  /* 7. produkt piszą wyłącznie metody warstwy zapisu */
  if (plik !== WARSTWA_ZAPISU && !plik.endsWith("uninstall.php")) {
    const zapisWpisu = tresc.match(
      /wp_update_post\s*\(|wp_insert_post\s*\(|->\s*save\s*\(\s*\)|update_post_meta\s*\(/
    );
    if (zapisWpisu) {
      bledy.push(
        `${plik}: pisze do wpisu/produktu (${zapisWpisu[0].trim()}) poza warstwą zapisu. Produkt WooCommerce rusza wyłącznie ${WARSTWA_ZAPISU} — jedno miejsce zapisu to jedyny sposób, żeby niezmienniki ceny i kolejności powiązania dały się sprawdzić (sekcja 10 schematu).`
      );
    }
  }
}

/* 8–10. Niezmienniki warstwy zapisu produktu — czytane RAZ, na całym pliku:
   kolejność powiązania, narodziny produktu jako draft, ukrycie w katalogu. */
if (existsSync(WARSTWA_ZAPISU)) {
  const zapis = kod(readFileSync(WARSTWA_ZAPISU, "utf8"));

  /* 8. kolejność B2 — mierzona pozycją w kodzie, w OBIE strony */
  const wiazanie = zapis.match(/function synchronizuj_kurs[\s\S]*?\n\tpublic static function/);
  if (!wiazanie) {
    bledy.push(
      `${WARSTWA_ZAPISU}: nie znalazłem metody wiążącej kurs z produktem — bez niej nie da się sprawdzić kolejności B2, a to ona stoi między „kurs płatny" a „kurs rozdany za darmo".`
    );
  } else {
    const pType = wiazanie[0].indexOf("_tutor_course_price_type");
    const pId = wiazanie[0].indexOf("_tutor_course_product_id");
    if (pType < 0 || pId < 0) {
      bledy.push(
        `${WARSTWA_ZAPISU}: wiązanie nie ustawia obu kluczy Tutora (_tutor_course_price_type oraz _tutor_course_product_id) — kurs bez pary jest niesprzedawalny albo darmowy.`
      );
    } else if (pType > pId) {
      bledy.push(
        `${WARSTWA_ZAPISU}: ZŁA KOLEJNOŚĆ POWIĄZANIA (B2) — _tutor_course_product_id zapisywane PRZED _tutor_course_price_type. W stanie pośrednim Tutor uznaje kurs za darmowy i do_enroll() tworzy zapis „completed" na niezapłaconym zamówieniu: KLIENT DOSTAJE KURS ZA DARMO, a po fatalu okno zostaje na stałe.`
      );
    }
  }

  const zdejmowanie = zapis.match(/function zdejmij_kurs[\s\S]*?\n\tpublic static function/);
  if (zdejmowanie) {
    const dType = zdejmowanie[0].indexOf("_tutor_course_price_type");
    const dId = zdejmowanie[0].indexOf("_tutor_course_product_id");
    if (dId >= 0 && dType >= 0 && dId > dType) {
      bledy.push(
        `${WARSTWA_ZAPISU}: ZŁA KOLEJNOŚĆ ZDEJMOWANIA (B2) — przy rozpinaniu pary product_id musi znikać PIERWSZY. Odwrotna kolejność zostawia okno, w którym kurs jest „darmowy", ale wciąż powiązany z produktem.`
      );
    }
  }

  /* 9. produkt rodzi się jako draft (B3) */
  const narodziny = zapis.match(/new WC_Product_Simple\(\)[\s\S]*?->save\(\)/);
  if (!narodziny) {
    bledy.push(
      `${WARSTWA_ZAPISU}: nie znalazłem miejsca tworzenia produktu — nie da się sprawdzić, czy rodzi się jako draft (B3).`
    );
  } else if (!/set_status\(\s*['"]draft['"]\s*\)/.test(narodziny[0])) {
    bledy.push(
      `${WARSTWA_ZAPISU}: nowy produkt NIE rodzi się jako draft (B3). Opublikowany produkt bez powiązania z kursem Tutora to stan „klient płaci i nie dostaje nic": bez powiązania nie ma zapisu na kurs, zamówienie nigdy nie dojdzie do completed.`
    );
  } else if (!/set_catalog_visibility\(\s*['"]hidden['"]\s*\)/.test(narodziny[0])) {
    /* 10. ukryty w katalogu Woo */
    bledy.push(
      `${WARSTWA_ZAPISU}: nowy produkt nie jest ukrywany w katalogu Woo (decyzja właściciela 2026-08-28: catalog_visibility = hidden). Widoczny produkt daje DRUGĄ ścieżkę zakupu w cudzym wyglądzie — klient omija naszą stronę sprzedażową.`
    );
  }
}

/* 11–13. P3a: blokada sprzedaży i rozdział ról ustawień.
   Wzorce celują w ZACHOWANIE (trzy nawroty pułapki nazwy: 0.29.0, 0.44.0,
   walidacja przed PR-em P2), więc pytają o wywołania i wartości domyślne,
   nie o nazwy metod. */
const USTAWIENIA = join(KATALOG, "includes", "class-aai-platnosci-ustawienia.php");
const PLIK_GLOWNY = join(KATALOG, "aai-platnosci.php");
if (!existsSync(USTAWIENIA)) {
  bledy.push(
    `${USTAWIENIA}: brak klasy ustawień — bez niej silnik `
      + "sprzedaży i blokada do P4 nie mają właściciela (krok P3a)."
  );
} else {
  const ust = kod(readFileSync(USTAWIENIA, "utf8"));

  /* 11. blokada koszyka istnieje i jest DOMYŚLNIE ZAMKNIĘTA */
  if (!/add_filter\(\s*'woocommerce_add_to_cart_validation'/.test(ust)) {
    bledy.push(
      `${USTAWIENIA}: BRAK BLOKADY SPRZEDAŻY (filtr woocommerce_add_to_cart_validation). Między P3a a P4 zakup jest technicznie możliwy, a dostarczanie (maile, dostawy) nie istnieje — to okno „klient płaci i nie dostaje nic".`
    );
  }
  if (!/get_option\(\s*self::OPCJA_SPRZEDAZ,\s*''\s*\)/.test(ust)) {
    bledy.push(
      `${USTAWIENIA}: flaga sprzedaży bez PUSTEJ wartości domyślnej — brak opcji w bazie musi znaczyć „sprzedaż ZAMKNIĘTA". Domyślne otwarcie sprzedaje kursy bez dostarczania na każdej świeżej instalacji.`
    );
  }

  /* 12. filtry rejestrowane PRZY INCLUDE pliku głównego, nie w plugins_loaded:
     Tutor bootuje przy include i OD RAZU czyta monetize_by — rejestracja
     z plugins_loaded przychodzi po tym odczycie i niczego nie broni. */
  const glowny = existsSync(PLIK_GLOWNY) ? kod(readFileSync(PLIK_GLOWNY, "utf8")) : "";
  /*
   * „Na poziomie pliku" znaczy GŁĘBOKOŚĆ ZERO, nie „bez wcięcia": pierwsza
   * wersja pytała regexem o pozycję w linii (`^…::zarejestruj();`) i była
   * ślepa na `if ( is_admin() ) {` z wywołaniem przy lewym marginesie —
   * czyli na rejestrację WARUNKOWĄ, przed którą ten niezmiennik broni
   * (zmierzone mutacją-pytaniem przy przeglądzie P3a). Liczymy klamry
   * przed wywołaniem; łańcuchy i komentarze są już usunięte przez kod(),
   * a klamry w łańcuchach znakowych w tym pliku nie występują.
   */
  const iWywolania = glowny.indexOf("Aai_Platnosci_Ustawienia::zarejestruj()");
  const glebokosc = iWywolania < 0
    ? -1
    : [...glowny.slice(0, iWywolania)].reduce((n, z) => n + (z === "{" ? 1 : z === "}" ? -1 : 0), 0);
  if (0 !== glebokosc) {
    bledy.push(
      `${PLIK_GLOWNY}: Aai_Platnosci_Ustawienia::zarejestruj() nie stoi na POZIOMIE PLIKU (głębokość ${glebokosc < 0 ? "brak wywołania" : glebokosc}). Rejestracja warunkowa albo z wnętrza plugins_loaded przychodzi PO odczycie monetize_by w konstruktorze Tutora — filtr B17 niczego wtedy nie broni; zmierzone przy P3a.`
    );
  }

  /* 13b. dopisywanie klasy do bloku celuje w GRANICĘ ATRYBUTU.
     `str_replace( 'class="' . $blok, … )` trafia w każdy blok zagnieżdżony
     o tym samym początku nazwy i ROZBIJA jego klasę — zmierzone na żywych
     stronach (13 uszkodzeń w koszyku, 22 w kasie), cicho, bo blok Woo
     zwraca zapisaną treść bez regeneracji. */
  const zapisKlas = kod(readFileSync(WARSTWA_ZAPISU, "utf8"));
  const metodaKlasy = zapisKlas.match(/function dopisz_klase_bloku[\s\S]*?\n\tpublic static function/);
  if (metodaKlasy && /str_replace\(\s*'class="'\s*\.\s*\$blok/.test(metodaKlasy[0])) {
    bledy.push(
      `${WARSTWA_ZAPISU}: dopisz_klase_bloku() podmienia PREFIKS klasy (str_replace na 'class="' . $blok). Trafia wtedy w każdy blok zagnieżdżony o tej samej nazwie początkowej i rozbija jego klasę — treść strony psuje się CICHO. Dopasowanie musi kończyć się granicą atrybutu (spacja albo cudzysłów) i podmieniać tylko pierwsze wystąpienie.`
    );
  }

  /* 13. rozdział ról (L11): kontrola nigdy nie pisze. Pilnujemy MIEJSCA,
     nie liczby sztuk — pierwsza wersja liczyła wywołania (`=== 1`)
     i zzieleniała na PRZENIESIENIU napraw() z sync do sprawdz, bo licznik
     dalej wynosił jeden (zmierzone przy przeglądzie P3a). Blok metody
     wycinamy od jej nagłówka do następnego `function ` — kolejność metod
     w pliku może się zmieniać, granica bloku nie. */
  const cli = kod(readFileSync(join(KATALOG, "includes", "class-aai-platnosci-cli.php"), "utf8"));
  const blokMetody = (nazwa) => {
    const start = cli.indexOf(`function ${nazwa}(`);
    if (start < 0) return null;
    const dalej = cli.indexOf("function ", start + 9);
    return cli.slice(start, dalej < 0 ? cli.length : dalej);
  };
  const sync = blokMetody("sync");
  const sprawdzBlok = blokMetody("sprawdz");
  if (null === sync || !sync.includes("Aai_Platnosci_Ustawienia::napraw(")) {
    bledy.push(
      "class-aai-platnosci-cli.php: komenda sync nie woła Ustawienia::napraw() — `--napraw` przestało naprawiać, a kontrola dalej każe je uruchamiać (martwa instrukcja w każdym komunikacie rozjazdu)."
    );
  }
  if (null !== sprawdzBlok && sprawdzBlok.includes("Aai_Platnosci_Ustawienia::napraw(")) {
    bledy.push(
      "class-aai-platnosci-cli.php: KONTROLA PISZE — sprawdz() woła Ustawienia::napraw(). Kontrola, która pisze, mierzy skutek własnego działania i nigdy nie jest czerwona (L11)."
    );
  }

  /* 14–17. Niezmienniki kroku P3b: dostarczanie i przycisk zakupu. */
  const dostarczanie = join(KATALOG, "includes", "class-aai-platnosci-dostarczanie.php");
  const cta = join(KATALOG, "includes", "class-aai-platnosci-cta.php");

  if (!existsSync(dostarczanie)) {
    bledy.push(
      `${dostarczanie}: brak klasy domykającej zamówienia. Bez niej zamówienie opłacone metodą z czarnej listy Tutora (bacs, cod, cheque) zostaje w processing, a klient nie dostaje kursu mimo zapłaty (zmierzone, KROK-P3B.md §3).`
    );
  } else {
    const d = kod(readFileSync(dostarczanie, "utf8"));

    /* 14. domykamy WYŁĄCZNIE zamówienia złożone z samych kursów. Reguła
       celuje w ZACHOWANIE: gdzieś musi paść „obcy produkt → nie domykamy",
       czyli zanegowane pytanie o produkt kursu kończące się odmową. Wersja
       bez tego domykała zamówienia mieszane i cudzy produkt fizyczny
       wyglądał na wysłany (zmierzone przed naprawą). */
    const odmowaNaObcym =
      /!\s*Aai_Platnosci_Zapis::czy_produkt_kursu\s*\([^;{}]{0,160}\)\s*\{\s*return\s+false\s*;/.test(d);
    if (!odmowaNaObcym) {
      bledy.push(
        `${dostarczanie}: nie widzę odmowy domknięcia na CUDZYM produkcie. Zamówienie mieszane (kurs + towar do wysyłki) dostałoby wtedy status „zrealizowane", choć paczka czeka — processing jest przy nim stanem PRAWDZIWYM.`
      );
    }

    /* 21. domknięcie odłożone do KOŃCA ŻĄDANIA. Hak biegnie w środku cudzego
       przejścia statusu: zapis wykonany od razu pozwalał reszcie TAMTEGO
       przejścia dojechać już po nadaniu `completed`, więc klient dostawał mail
       „zrealizowane" przed „w realizacji", a notatki szły w odwrotnej
       kolejności (zmierzone na notatkach zamówienia). */
    if (!/add_action\s*\(\s*['"]shutdown['"]/.test(d)) {
      bledy.push(
        `${dostarczanie}: domknięcie zamówienia nie jest odłożone na koniec żądania. Zapis w środku cudzego przejścia statusu odwraca kolejność maili i notatek — klient dostaje „zamówienie zrealizowane" przed „zamówienie w realizacji".`
      );
    }

    /* 15. filtr obsługi pozycji nie rusza cudzych produktów: musi oddać
       wartość WEJŚCIOWĄ, a nie własną stałą. */
    if (!/return\s+\(bool\)\s*\$wymaga\s*;/.test(d)) {
      bledy.push(
        `${dostarczanie}: filtr obsługi pozycji nie oddaje wartości wejściowej. Cudze produkty w tym samym sklepie muszą zachować zachowanie WooCommerce — inaczej ta wtyczka zmienia sposób realizacji zamówień, których nie dotyczy.`
      );
    }
  }

  if (!existsSync(cta)) {
    bledy.push(
      `${cta}: brak klasy przycisku zakupu. Bez niej sklep nie wie, czy sprzedaż jest otwarta, i każde CTA prowadzi do kontaktu.`
    );
  } else {
    const c = kod(readFileSync(cta, "utf8"));

    /* 16. stan „klient ma ten kurs" pyta o ZAPIS. `dostep` jest prawdziwy
       także dla lekcji-zapowiedzi i dla administratora, więc pokazywałby
       „Przejdź do kursu" komuś, kto nic nie kupił (pułapka z W6). */
    if (!/is_enrolled\s*\(/.test(c)) {
      bledy.push(
        `${cta}: przycisk nie pyta Tutora o ZAPIS (is_enrolled). Pytanie o sam dostęp jest prawdziwe też dla zapowiedzi i dla administratora — „Przejdź do kursu" zobaczyłby ktoś, kto niczego nie kupił.`
      );
    }

    /* 17. jedna decyzja „czy da się kupić" na całą klasę. Reguła celowo NIE
       pyta o nazwę metody (ta klasa błędu wracała trzykrotnie: 0.29.0,
       0.44.0, 0.47.0) — liczy MIEJSCA, w których warunek sprzedaży jest
       badany. Dwa oznaczają, że przycisk i dane strukturalne mogą się
       rozjechać: strona powie „kup teraz", a oferta zadeklaruje PreOrder. */
    const pytanO = (c.match(/sprzedaz_otwarta\s*\(/g) || []).length;
    if (pytanO !== 1) {
      bledy.push(
        `${cta}: warunek „sprzedaż otwarta" jest badany ${pytanO} raz(y), a ma być dokładnie raz. Przycisk dla człowieka i dostępność oferty dla wyszukiwarki muszą wynikać z JEDNEJ decyzji, inaczej strona może mówić „kup teraz" przy ofercie PreOrder (K2).`
      );
    }

    /* 19. „czy da się kupić" pyta WooCommerce o KUPOWALNOŚĆ, nie tylko
       o status wpisu. Produkt `publish` z pustą ceną jest niekupowalny
       (`is_purchasable()` wymaga niepustej ceny), a koszyk odmawia dodania —
       bez tego pytania przycisk prowadziłby do kasy, która odrzuca, a oferta
       deklarowałaby `InStock` (znalezisko przeglądu P3b, potwierdzone
       uruchomieniowo). */
    if (!/is_purchasable\s*\(/.test(c)) {
      bledy.push(
        `${cta}: decyzja „czy da się kupić" nie pyta WooCommerce o kupowalność produktu. Sam status „publish” to za mało — produkt z pustą ceną jest opublikowany, a koszyk i tak odmówi; klient kliknąłby „Kup teraz" i trafił na kasę, która go odrzuca.`
      );
    }

    /* 20. stan „zamówienie w toku" pyta o STATUS zapisu, nie o samo jego
       istnienie. Tutor tworzy zapis przy składaniu zamówienia i nigdy go nie
       kasuje — anulowanie tylko przestawia status. Pytanie o istnienie
       zostawiało klienta z anulowanym zamówieniem bez przycisku zakupu
       NA ZAWSZE (zmierzone). */
    const startK = c.indexOf("function stan_klienta(");
    if (startK >= 0) {
      const dalejK = c.indexOf("function ", startK + 9);
      const blokK = c.slice(startK, dalejK < 0 ? c.length : dalejK);
      if (!/get_post_status\s*\(/.test(blokK) || !/in_array\s*\(/.test(blokK)) {
        bledy.push(
          `${cta}: stan „zamówienie w toku" nie sprawdza STATUSU zapisu. Zapis Tutora zostaje po anulowaniu i zwrocie, więc pytanie o samo jego istnienie odbiera takiemu klientowi przycisk zakupu bezpowrotnie.`
        );
      }
    }

    /* 18. dostępność oferty nie zależy od oglądającego — dane strukturalne
       czyta robot, czyli gość. Blok metody wycinamy od nagłówka do
       następnego `function `. */
    const startD = c.indexOf("function dostepnosc(");
    if (startD >= 0) {
      const dalej = c.indexOf("function ", startD + 9);
      const blokD = c.slice(startD, dalej < 0 ? c.length : dalej);
      if (/get_current_user_id\s*\(|is_user_logged_in\s*\(|is_enrolled\s*\(/.test(blokD)) {
        bledy.push(
          `${cta}: dostępność oferty pyta o OGLĄDAJĄCEGO. Dane strukturalne czyta robot indeksujący — jest gościem, więc stan „mam już ten kurs" opisałby ofertę dla wszystkich stanem jednego człowieka.`
        );
      }
    }
  }
}

if (bledy.length > 0) {
  console.error("straznik-platnosci-wp:");
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}

console.log(
  "straznik-platnosci-wp: szew w porządku (zero własnego AJAX-a i tras, jednokierunkowość wobec Pluginu 1, zero kasowania produktów, cena nigdy metą i nigdy _sale_price, słuchacze z Throwable, produkt tylko z warstwy zapisu, kolejność powiązania B2 w obie strony, produkt rodzi się draft i ukryty, blokada sprzedaży domyślnie zamknięta, filtry ustawień przy include, kontrola nie pisze, zamówienia mieszane nie są domykane, cudze pozycje bez zmian, przycisk pyta o zapis i o kupowalność, stan zamówienia po STATUSIE zapisu, domknięcie na koniec żądania, jedna decyzja o sprzedaży, dostępność nie zależy od oglądającego)."
);
