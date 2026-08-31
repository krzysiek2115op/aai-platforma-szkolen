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

  /* 11. blokada koszyka istnieje i jest DOMYŚLNIE ZAMKNIĘTA.

     WZORZEC PYTA O KONKRETNY CALLBACK, nie o samą nazwę haka. Pierwsza
     wersja sprawdzała obecność `add_filter( 'woocommerce_add_to_cart_validation'`
     i OŚLEPŁA w chwili, w której na ten sam hak wszedł drugi filtr
     (reguła jednego kursu w koszyku, N2/0.51.0): mutacja kasująca
     rejestrację BLOKADY przechodziła, bo wzorzec trafiał w rejestrację
     sąsiada. Złapał to audyt mutacyjny, nie przegląd — szósty nawrót
     pułapki „wzorzec na napis" w tym projekcie (0.29.0, 0.44.0, 0.47.0,
     c6c9c97, P4 ×2). Do tego pytamy o ZACHOWANIE: któryś z callbacków
     walidacji musi pytać o stan sprzedaży. */
  if (!/add_filter\(\s*'woocommerce_add_to_cart_validation',\s*array\(\s*self::class,\s*'blokada_sprzedazy'\s*\)/.test(ust)) {
    bledy.push(
      `${USTAWIENIA}: BRAK BLOKADY SPRZEDAŻY (filtr woocommerce_add_to_cart_validation nie ma podpiętej blokady). Między P3a a P4 zakup jest technicznie możliwy, a dostarczanie (maile, dostawy) nie istnieje — to okno „klient płaci i nie dostaje nic".`
    );
  }
  {
    /* GRANICA BLOKU: następna deklaracja `function`, nie następny
       docblock — `kod()` komentarze USUWA, więc szukanie `/**` zwracało
       -1, a `slice(i, -1)` brało pół pliku i wzorzec trafiał w wywołanie
       z zupełnie innej metody. Wykryte własnym testem negatywnym. */
    const iBlok = ust.indexOf("function blokada_sprzedazy");
    const iKoniec = iBlok < 0 ? -1 : ust.indexOf("function ", iBlok + 20);
    const blokBlokady = iBlok < 0 ? "" : ust.slice(iBlok, iKoniec < 0 ? undefined : iKoniec);
    if (iBlok >= 0 && !/sprzedaz_otwarta\s*\(\s*\)/.test(blokBlokady)) {
      bledy.push(
        `${USTAWIENIA}: blokada koszyka nie pyta o STAN SPRZEDAŻY — jest podpięta, ale przepuszcza wszystko niezależnie od tego, czy sprzedaż jest otwarta.`
      );
    }
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
       NA ZAWSZE (zmierzone).

       Wzorzec celuje w DECYZJĘ, nie w nazwę funkcji (pierwsza wersja pytała
       o `stan_klienta(` i refactor wynoszący logikę do `stan_posiadania()`
       zapalił ją mimo zachowanej gwarancji — czwarty nawrót klasy wzorca na
       nazwę: 0.29.0, 0.44.0, 0.47.0, c6c9c97). Szukamy więc KAŻDEGO miejsca,
       w którym zapada rozstrzygnięcie „w toku" (`return self::W_TOKU` albo
       napis przycisku), i wymagamy, żeby funkcja podejmująca je na podstawie
       zapisu Tutora czytała jego STATUS (`get_post_status` + lista statusów
       trwających w `in_array`). */
    const decyzjeWToku = [...c.matchAll(/return\s+self::W_TOKU\s*;/g)];
    if (decyzjeWToku.length === 0 && !c.includes("Zamówienie w toku")) {
      bledy.push(
        `${cta}: nie widzę stanu „zamówienie w toku" (ani stałej W_TOKU, ani napisu). Bez niego klient czekający na przelew widzi zachętę do ponownego zakupu.`
      );
    }
    for (const m of decyzjeWToku) {
      const startF = c.lastIndexOf("function ", m.index);
      const dalejF = c.indexOf("\n\tpublic", m.index) >= 0 ? c.indexOf("\n\tpublic", m.index) : c.length;
      const blokF = c.slice(startF, Math.max(m.index, dalejF));
      if (!/get_post_status\s*\(/.test(blokF) || !/in_array\s*\([^)]*ZAMOWIENIE_TRWA/.test(blokF)) {
        bledy.push(
          `${cta}: rozstrzygnięcie „zamówienie w toku" zapada bez sprawdzenia STATUSU zapisu (get_post_status + in_array po liście statusów trwających). Zapis Tutora zostaje po anulowaniu i zwrocie, więc pytanie o samo jego istnienie odbiera takiemu klientowi przycisk zakupu bezpowrotnie.`
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

  /* 22–26. Niezmienniki kroku P4: dwa maile i dziennik dostaw. */
  const maile = join(KATALOG, "includes", "class-aai-platnosci-maile.php");
  if (existsSync(maile)) {
    const c = kod(readFileSync(maile, "utf8"));

    /* 22. mail najwyżej raz: KAŻDA wysyłka stoi za znacznikiem
       `dostawa_odnotuj` (atomowy INSERT z UNIQUE), a znacznik pada PRZED
       zleceniem wysyłki. Cudzy hak biegnie rekurencyjnie
       (mark_order_complete() woła zmianę statusu wewnątrz obsługi zmiany
       statusu — B6), więc „sprawdź czy już wysłano" bez UNIQUE przegrywa
       wyścig. Wzorzec: w obu obsługach zdarzeń (na_koncie / na_dostepie)
       wynik dostawa_odnotuj() jest WARUNKIEM dalszej drogi. */
    for (const obsluga of ["na_koncie", "na_dostepie"]) {
      const start = c.indexOf(`function ${obsluga}(`);
      if (start < 0) {
        bledy.push(`${maile}: nie widzę obsługi ${obsluga}() — któryś z dwóch maili dostarczenia nie ma słuchacza.`);
        continue;
      }
      const dalej = c.indexOf("\n\tpublic", start + 9);
      const blok = c.slice(start, dalej < 0 ? c.length : dalej);
      if (!/if\s*\(\s*!\s*Aai_Platnosci_Zapis::dostawa_odnotuj\s*\(/.test(blok)) {
        bledy.push(
          `${maile}: ${obsluga}() nie uzależnia wysyłki od wyniku dostawa_odnotuj(). Znacznik z UNIQUE jest jedyną atomową bramką — bez niej rekurencyjny hak Tutora (B6) wysyła ten sam mail dwa razy, a drugi klucz resetu unieważnia pierwszy link.`
        );
      }
    }

    /* 23. hasło nie wchodzi do treści maila. Trzeci argument
       woocommerce_created_customer w docbloku Woo nazywa się „password",
       więc pokusa jest realna — a zmierzona wartość to bool. Wzorzec:
       argument hasła jest natychmiast porzucany (unset), zanim cokolwiek
       zbuduje treść. */
    const naKoncie = c.slice(c.indexOf("function na_koncie("));
    if (!/unset\s*\(\s*\$dane\s*,\s*\$haslo_wygenerowane\s*\)/.test(naKoncie)) {
      bledy.push(
        `${maile}: na_koncie() nie porzuca argumentu hasła (unset). Hasło w treści maila to niezmiennik 8 — złamany raz, żyje w skrzynkach klientów na zawsze.`
      );
    }

    /* 24. adresatem jest konto, nie zamówienie (B9): w całym pliku ZERO
       get_billing_email — zamówienie założone w kokpicie na cudze
       customer_id z dowolnym adresem rozliczeniowym wysłałoby ważny klucz
       resetu pod ten adres, czyli oddało konto. */
    if (/get_billing_email\s*\(/.test(c)) {
      bledy.push(
        `${maile}: czyta get_billing_email(). Adresatem maili dostarczenia jest ZAWSZE user_email konta (B9) — adres rozliczeniowy z zamówienia bywa cudzy.`
      );
    }

    /* 25. wysyłka umie biec W TRAKCIE shutdown. Domknięcie zamówienia
       z P3b samo jest odroczone na shutdown, a tutor_after_enrolled leci
       z jego wnętrza — callback dopisany do TRWAJĄCEJ akcji nie wykona
       się już nigdy (zmierzone: znacznik z pustym wynikiem, zero maili).
       Wzorzec: kolejkowanie pyta doing_action('shutdown'). */
    if (!/if\s*\(\s*doing_action\s*\(\s*['"]shutdown['"]\s*\)\s*\)/.test(c)) {
      bledy.push(
        `${maile}: kolejka wysyłki nie pyta doing_action('shutdown'). Mail 2 zlecony z wnętrza odroczonego domknięcia (P3b) przepada bez śladu — WordPress nie woła callbacków dopisanych do akcji, która właśnie trwa.`
      );
    }

    /* 26. status zapisu Tutora czytany z BAZY, nie z cache'u wpisu:
       course_enrol_status_change() pisze surowym $wpdb->update i nie czyści
       cache'u, więc get_post_status() w tym samym żądaniu oddaje wartość
       sprzed zmiany (zmierzone przy E0: hak meldował pending, baza miała
       completed) — bramka „wyślij dopiero przy completed" oparta na
       get_post_status() nie wysłałaby maila 2 nigdy. */
    const naDostepie = c.slice(c.indexOf("function na_dostepie("), c.indexOf("function ponow("));
    if (!/Aai_Platnosci_Zapis::status_zapisu\s*\(/.test(naDostepie) || /get_post_status\s*\(/.test(naDostepie)) {
      bledy.push(
        `${maile}: na_dostepie() nie czyta statusu zapisu z bazy (status_zapisu) albo pyta get_post_status(). Tutor zmienia status surowym SQL-em bez czyszczenia cache'u — bramka na get_post_status() nigdy nie wyśle maila 2 na ścieżce produkcyjnej (zmierzone przy E0).`
      );
    }
  }

  /* 28–29. Znaleziska przeglądu P4 — obie gwarancje zmierzone, obie
     łamią się po cichu. */
  if (existsSync(USTAWIENIA)) {
    const c = kod(readFileSync(USTAWIENIA, "utf8"));

    /* 28. blokada koszyka łapie Throwable. Filtr biegnie na ścieżce
       „dodaj do koszyka" (formularz, AJAX, Store API), a woła NASZĄ tabelę
       i `tutor_utils()` Tutora. ZMIERZONE: wyjątek w tym łańcuchu dawał
       klientowi HTTP 500 i planszę „krytyczny błąd" zamiast odmowy — przy
       czym ta sama decyzja przy RYSOWANIU przycisku była osłonięta. */
    const startB = c.indexOf("function blokada_sprzedazy(");
    if (startB < 0) {
      bledy.push(`${USTAWIENIA}: nie widzę blokady koszyka (blokada_sprzedazy).`);
    } else {
      const dalejB = c.indexOf("\n\tprivate static function", startB);
      const blokB = c.slice(startB, dalejB < 0 ? c.length : dalejB);
      if (!/catch\s*\(\s*Throwable/.test(blokB)) {
        bledy.push(
          `${USTAWIENIA}: blokada koszyka nie łapie Throwable. Ten filtr biegnie przy dodawaniu do koszyka — wyjątek z naszej tabeli albo z tutor_utils() oddaje klientowi HTTP 500 zamiast odmowy (zmierzone).`
        );
      }
      if (!/return false;/.test(blokB.slice(blokB.indexOf("catch")))) {
        bledy.push(
          `${USTAWIENIA}: blokada koszyka po wyjątku nie ODMAWIA. Wpuszczenie produktu przy nieznanym stanie znaczy zakup kursu, który klient może już mieć — do_enroll() wychodzi wtedy przed zapisem meta i zamówienie nigdy się nie domyka (B10).`
        );
      }
    }

    /* 29. zakupu, którego NIE DA SIĘ dostarczyć, nie przyjmujemy. Kurs
       zapisuje się na konto; ZMIERZONE: po dryfie `guest_checkout` na
       `yes` gość przeszedł całą kasę, a skutek to customer_id = 0, zero
       zapisów w Tutorze, zero dostaw i ani jednej naszej wiadomości. */
    /* Wzorzec pyta o DECYZJĘ, nie o obecność napisów. Pierwsza wersja
       sprawdzała, czy w pliku występują `is_user_logged_in` i nazwa opcji —
       a obie występują też gdzie indziej (`WOO_DOCELOWE`, sprawdzenie
       posiadania kursu), więc mutacja podmieniająca całe rozstrzygnięcie na
       `return true;` PRZESZŁA. Piąty nawrót wzorca na napis w tym repo. */
    const porownanieOpcji =
      /(['"]yes['"]\s*[!=]==?\s*)?\(?\s*string\s*\)?\s*get_option\(\s*['"]woocommerce_enable_guest_checkout['"][^)]*\)\s*(?:[!=]==?\s*['"]yes['"])?/;
    const rozstrzyga = new RegExp(
      "return\\s+[^;]*get_option\\(\\s*['\"]woocommerce_enable_guest_checkout['\"]"
    ).test(c);
    if (!rozstrzyga || !porownanieOpcji.test(c)) {
      bledy.push(
        `${USTAWIENIA}: żadne ROZSTRZYGNIĘCIE nie zależy od stanu woocommerce_enable_guest_checkout. Kurs zapisuje się na konto — gość przy zdryfowanym ustawieniu płaci i nie dostaje nic (zmierzone: customer_id 0, zero zapisów w Tutorze, zero dostaw, zero naszych maili).`
      );
    }
    const wywolanie = startB >= 0 ? c.slice(startB, c.indexOf("\n\tprivate static function", startB)) : "";
    if (startB >= 0 && !/da_sie_dostarczyc\s*\(|dostarcz/i.test(wywolanie)) {
      bledy.push(
        `${USTAWIENIA}: blokada koszyka nie pyta, czy zakup da się dostarczyć — reguła istnieje, ale nikt jej nie woła na ścieżce dodania do koszyka.`
      );
    }
  }

  /* 27. mail Woo „nowe konto" ma podmieńca, więc musi WRÓCIĆ przy
     deaktywacji: nasz mail 1 znika razem z wtyczką, a konto bez żadnego
     linku do hasła to klasa K1 (DIAGRAM §14). Wzorzec: hak deaktywacji
     woła przywracanie. */
  if (existsSync(PLIK_GLOWNY)) {
    const cg = kod(readFileSync(PLIK_GLOWNY, "utf8"));
    const startD = cg.indexOf("register_deactivation_hook");
    const blokD = startD >= 0 ? cg.slice(startD, cg.indexOf("add_action", startD)) : "";
    if (!/przywroc_mail_woo\s*\(/.test(blokD)) {
      bledy.push(
        `${PLIK_GLOWNY}: deaktywacja nie przywraca maila WooCommerce „nowe konto". Wyłączyliśmy go, bo jego zadanie przejął nasz mail 1 — a nasz znika razem z wtyczką: konto założone po deaktywacji zostaje bez żadnego linku do hasła (K1).`
      );
    }
  }
}

/* 30. TEKST, KTÓRY KLIENT CZYTA W KASIE, POCHODZI Z NASZEJ TABELI.

   Woo drukuje `short_description` produktu pod nazwą pozycji w koszyku
   i w podsumowaniu zamówienia, a Store API oddaje je publicznie. Do
   0.50.0 kopia tego pola NIE USTAWIAŁA — było niczyje, więc w kasie pod
   nazwą kursu wylądowała „cudza edycja 1787936224" (ślad po ręcznym
   dowodzeniu haka B13 na produkcie 675, znaleziony przez właściciela
   klikaniem, nie przez bramkę).

   Pytamy o ZACHOWANIE, nie o nazwy: (a) czy synchronizacja SIĘGA po
   `short_desc` z kursu, (b) czy oba pola widoczne dla klienta jadą przez
   `wp_slash()`, (c) czy kontrola PORÓWNUJE opis. Wzorzec na nazwę
   zmiennej byłby ślepy na przemianowanie, a wzorzec na samą obecność
   napisu — na przeniesienie go gdzie indziej w pliku (piąty nawrót tej
   pułapki: 0.29.0, 0.44.0, 0.47.0, c6c9c97, P4). */
{
  const zapisT = kod(readFileSync(WARSTWA_ZAPISU, "utf8"));
  const iSync = zapisT.indexOf("function synchronizuj_kurs");
  const blokSync = iSync < 0 ? "" : zapisT.slice(iSync, zapisT.indexOf("\n\tpublic static function", iSync + 10));

  if (!/\[\s*'short_desc'\s*\]/.test(blokSync)) {
    bledy.push(
      `${WARSTWA_ZAPISU}: synchronizacja produktu nie sięga po short_desc kursu. Krótki opis produktu jest wtedy POLEM NICZYIM, a Woo drukuje go klientowi w koszyku i w kasie — tak wyszła „cudza edycja 1787936224" na produkcie 675.`
    );
  }
  for (const [setter, co] of [
    ["set_short_description", "krótki opis"],
    ["set_name", "nazwa"],
  ]) {
    const wywolania = [...blokSync.matchAll(new RegExp(`${setter}\\(([^;]*)\\)`, "g"))];
    if (wywolania.length === 0) {
      bledy.push(
        `${WARSTWA_ZAPISU}: synchronizacja nie ustawia pola „${co}" produktu — klient zobaczy w kasie to, co zostawił tam ktokolwiek inny.`
      );
      continue;
    }
    if (wywolania.some((w) => !/wp_slash\s*\(/.test(w[1]))) {
      bledy.push(
        `${WARSTWA_ZAPISU}: „${co}" produktu zapisywane BEZ wp_slash(). ZMIERZONE na Woo 11.0.1: set_name()/set_short_description() kończą w wp_insert_post(), które puszcza wartość przez wp_unslash() — ginie każdy backslash (C:\\Users, sekwencja \\n; kurs o Gicie takich pełen). To rodzina pułapki update_post_meta z W2.`
      );
    }
  }

  const cliT = kod(readFileSync(join(KATALOG, "includes", "class-aai-platnosci-cli.php"), "utf8"));
  const iRoz = cliT.indexOf("function rozjazdy_kursu");
  const blokRoz = iRoz < 0 ? "" : cliT.slice(iRoz, cliT.indexOf("\n\tprivate static function", iRoz + 10));
  if (!/get_short_description\s*\([^)]*\)\s*!==|!==\s*[^;\n]*get_short_description/.test(blokRoz)) {
    bledy.push(
      `${join(KATALOG, "includes", "class-aai-platnosci-cli.php")}: kontrola nie PORÓWNUJE krótkiego opisu produktu z naszą tabelą. Cudzy tekst pod nazwą kursu w kasie nie zapaliłby wtedy kodu 1 — a to jedyne pole produktu, które klient czyta, a którego nie widać w żadnym innym pomiarze.`
    );
  }
}

/* 31. W KOSZYKU NAJWYŻEJ JEDEN NASZ KURS — i ani jednego cudzego mniej.

   BLAD-023: przycisk obiecywał 299 zł, kasa pokazywała 648 zł, bo koszyk
   kumulował kursy klikane wcześniej. Naprawa ma DWIE strony i obie muszą
   być pilnowane: (a) po dodaniu naszego kursu inne NASZE kursy wypadają,
   (b) cudze produkty zostają — sklep może kiedyś sprzedawać coś jeszcze,
   a opróżnianie komuś koszyka z rzeczy, o których nic nie wiemy, byłoby
   tą samą klasą błędu, tylko odwróconą.

   Pytamy o ZACHOWANIE: czy porządkowanie jest podpięte do haka po
   dodaniu, czy przed skasowaniem pozycji pada pytanie „czy to nasz
   kurs", i czy powtórne dodanie tego samego kursu kończy się
   komunikatem typu `notice`, a nie `error` (to była druga połowa
   zgłoszenia właściciela: „wygląda jak awaria"). */
{
  const ust31 = kod(readFileSync(USTAWIENIA, "utf8"));

  if (!/add_action\(\s*'woocommerce_add_to_cart'/.test(ust31)) {
    bledy.push(
      `${USTAWIENIA}: koszyk nie jest porządkowany po dodaniu kursu (brak haka woocommerce_add_to_cart). Wraca BLAD-023: przycisk obiecuje jedną kwotę, kasa pokazuje sumę wszystkich kiedykolwiek klikniętych kursów.`
    );
  }

  const iPorzadek = ust31.indexOf("function zostaw_jeden_kurs");
  const blokPorzadek = iPorzadek < 0 ? "" : ust31.slice(iPorzadek, ust31.indexOf("\n\tprivate static function", iPorzadek));
  if (blokPorzadek === "") {
    bledy.push(`${USTAWIENIA}: brak reguły „w koszyku zostaje jeden kurs" (BLAD-023).`);
  } else {
    if (!/remove_cart_item\s*\(/.test(blokPorzadek)) {
      bledy.push(
        `${USTAWIENIA}: reguła jednego kursu niczego nie usuwa z koszyka — istnieje, ale nie działa (BLAD-023).`
      );
    }
    /* Kasowanie MUSI być poprzedzone pytaniem o właściciela pozycji.
       Wzorzec celuje w rozstrzygnięcie (wywołanie czy_produkt_kursu na
       INNEJ pozycji niż dodana), nie w obecność nazwy w pliku. */
    const iUsuwanie = blokPorzadek.indexOf("remove_cart_item");
    if (iUsuwanie >= 0 && !/czy_produkt_kursu\s*\(\s*\$inny|czy_produkt_kursu\s*\([^)]*\)\s*\)\s*\{[^}]*do_zdjecia/.test(blokPorzadek.slice(0, iUsuwanie))) {
      bledy.push(
        `${USTAWIENIA}: reguła jednego kursu kasuje pozycje koszyka NIE PYTAJĄC, czy to nasz kurs. Cudzy produkt (sklep może sprzedawać coś jeszcze) wypadałby klientowi z koszyka bez powodu.`
      );
    }
  }

  const iJuz = ust31.indexOf("function juz_w_koszyku");
  const blokJuz = iJuz < 0 ? "" : ust31.slice(iJuz, ust31.indexOf("\n\tpublic static function", iJuz + 10));
  if (blokJuz === "") {
    bledy.push(
      `${USTAWIENIA}: powtórne kliknięcie tego samego kursu nie jest obsłużone — klient dostaje wtedy czerwony błąd Woo „You cannot add another…", choć trafia do kasy dokładnie z tym kursem (druga połowa BLAD-023).`
    );
  } else if (!/wc_add_notice\([^;]*'notice'\s*\)/.test(blokJuz)) {
    bledy.push(
      `${USTAWIENIA}: „ten kurs już jest w koszyku" mówione klientowi JAKO BŁĄD (albo wcale). To nie jest błąd — cel klienta jest osiągnięty; komunikat ma być typu notice.`
    );
  }
}

/* 32. JEDEN NADAWCA POCZTY — ale tylko tam, gdzie nikt go nie ustawił.

   BLAD-025: po ustawieniu hasła szło do właściciela gołe powiadomienie
   od `WordPress <wordpress@127.0.0.1>`, obok naszych maili i maili Woo
   z adresu sklepu. Na produkcji taki nadawca odpada na SPF, więc
   powiadomienia znikają, a nikt się o tym nie dowiaduje.

   Reguła ma DWIE strony i obie są tu pilnowane: filtry muszą istnieć,
   ale muszą naprawiać WYŁĄCZNIE wartość domyślną WordPressa. Bezwarunkowe
   nadpisanie nadawcy zabrałoby głos wtyczce SMTP właściciela — to już
   nie naprawa, tylko przejęcie cudzej poczty. */
{
  const maile = kod(readFileSync(join(KATALOG, "includes", "class-aai-platnosci-maile.php"), "utf8"));

  for (const [filtr, opis] of [
    ["wp_mail_from", "adres"],
    ["wp_mail_from_name", "nazwa"],
  ]) {
    if (!new RegExp(`add_filter\\(\\s*'${filtr}'`).test(maile)) {
      bledy.push(
        `${join(KATALOG, "includes", "class-aai-platnosci-maile.php")}: poczta rdzenia WordPressa idzie z domyślnym nadawcą (brak filtru ${filtr}) — „wordpress@<host>" odpada na SPF, a właściciel przestaje dostawać powiadomienia, nie wiedząc o tym (BLAD-025).`
      );
    }
  }

  /* Warunkowość mierzymy ZACHOWANIEM: obie metody muszą PORÓWNAĆ wartość
     wejściową z domyślną i oddać ją niezmienioną, gdy nie jest domyślna.
     Wzorzec na samą nazwę metody nie odróżniłby naprawy od nadpisania. */
  for (const [metoda, wzorzec, czego] of [
    ["nadawca_adres", /\$adres\s*!==\s*\$domyslny|\$domyslny\s*!==\s*\$adres/, "adresu"],
    ["nadawca_nazwa", /'WordPress'\s*!==\s*\$nazwa|\$nazwa\s*!==\s*'WordPress'/, "nazwy"],
  ]) {
    const i = maile.indexOf(`function ${metoda}`);
    const blok = i < 0 ? "" : maile.slice(i, maile.indexOf("function ", i + 20) < 0 ? undefined : maile.indexOf("function ", i + 20));
    if (i < 0) {
      bledy.push(`${join(KATALOG, "includes", "class-aai-platnosci-maile.php")}: brak metody ${metoda}() — nie ma czym naprawić nadawcy ${czego} (BLAD-025).`);
    } else if (!wzorzec.test(blok)) {
      bledy.push(
        `${join(KATALOG, "includes", "class-aai-platnosci-maile.php")}: ${metoda}() nadpisuje nadawcę ${czego} BEZWARUNKOWO. To już nie naprawa domyślnej wartości, tylko przejęcie cudzej poczty — wtyczka SMTP właściciela przestałaby działać.`
      );
    }
  }
}

/* 33. BRAMKI NIE MOGĄ PYTAĆ O ZAMÓWIENIA PRZEZ `wp_posts`.

   BLAD-026, obie połowy — i obie zmierzone na żywej instalacji.

   (a) Rachunek sumienia obu smoke'ów liczył
       `SELECT COUNT(*) … WHERE post_type='shop_order'` i oddawał ZERO,
       bo instalacja stoi na HPOS: zamówienia mieszkają w `wp_wc_orders`,
       a tamta tabela jest pusta z definicji. Sprawdzenie „czy zostawiłem
       zamówienie" porównywało więc 0 z 0 i przechodziło ZAWSZE.

   (b) Sprzątanie wołało `wp_delete_post()`, które pod HPOS NIE KASUJE
       NICZEGO (zmierzone: zamówienie przeżywa, `wc_get_order()` oddaje
       je dalej). To była prawdziwa przyczyna 146 zamówień-widm na koncie
       `klient-test` — tym samym, na którym właściciel ogląda sklep
       oczami klienta. Ślepy licznik tylko ją ukrył.

   Reguła celuje w PLIKI BRAMEK, nie we wtyczkę: to bramki oślepły.
   Nośnik zamówień należy do WooCommerce i może się zmienić znowu —
   pytanie o niego przez publiczne API (`wc_get_orders`, `$order->delete`)
   jest jedyną odpowiedzią, która nie ma daty ważności. */
{
  const smokeWp = readdirSync(join("tools", "smoke"))
    .filter((f) => f.startsWith("smoke-wp-") && f.endsWith(".mjs"))
    .map((f) => join("tools", "smoke", f));

  for (const plik of smokeWp) {
    /* KOMENTARZE ODPADAJĄ. Te same smoke'i OPISUJĄ w komentarzach, czego
       nie wolno robić — i pierwsza wersja tej reguły zapaliła się właśnie
       na tych opisach. Wzorzec ma pytać o KOD, nie o prozę o kodzie. */
    const tresc = kod(readFileSync(plik, "utf8"));
    if (/post_type\s*=\s*.shop_order./.test(tresc)) {
      bledy.push(
        `${plik}: pyta o zamówienia przez post_type='shop_order'. Pod HPOS ta tabela jest PUSTA, więc odpowiedź brzmi zawsze „zero" — sprawdzenie przechodzi niezależnie od tego, ile śmieci zostawiło (BLAD-026). Pytaj przez wc_get_orders().`
      );
    }
    /* Kasowanie: `wp_delete_post` jest POPRAWNE dla produktów i wpisów
       Tutora — te wciąż mieszkają w `wp_posts`. Pytamy więc wyłącznie
       o wywołanie na LIŚCIE ZAMÓWIEŃ (`zamowienia`), a nie o samo słowo
       „order" w okolicy: pierwsza wersja łapała przez nie sprzątanie
       produktów w tym samym pliku. */
    for (const m of tresc.matchAll(/wp_delete_post/g)) {
      const wyrazenie = tresc.slice(Math.max(0, m.index - 160), m.index);
      if (/zamowienia\b/.test(wyrazenie)) {
        bledy.push(
          `${plik}: kasuje zamówienie przez wp_delete_post(). Pod HPOS ta funkcja NIE KASUJE NICZEGO — zamówienie przeżywa, a smoke melduje porządek (BLAD-026, 146 zamówień-widm). Kasuj przez $order->delete( true ).`
        );
      }
    }
  }
}

/* 34. KASA MÓWI PRAWDĘ O ZGODACH, A POZYCJA KOSZYKA JEST KLIKALNA.

   Dwie reguły z kroku P5, obie o rzeczach, które klient CZYTA i KLIKA,
   a które w cudzym kodzie działają wbrew intuicji:

   (a) WooCommerce drukuje pod formularzem kasy zdanie o „Warunkach
       i zasadach" TAKŻE wtedy, gdy strony regulaminu nie ma — przy braku
       strony nie usuwa wzmianki, tylko drukuje ją bez odnośnika
       (`checkout-frontend.js`: `d.gu ? "<a…>" : "…"`). Klient czytał, że
       zgadza się na dokument, którego nie może przeczytać. Podmiana idzie
       przez drzewo bloków W PAMIĘCI — nigdy przez zapis do treści strony,
       bo `str_replace` w cudzej treści bloków uszkodził przy P3a 13 bloków
       koszyka i 22 kasy bez jednego objawu.

   (b) `tutor_update_product_url()` kończy się BEZ `return` dla produktu,
       który nie jest kursem, więc filtr `woocommerce_cart_item_permalink`
       dostaje `null` i cudza pozycja traci w koszyku odnośnik. Nasza
       naprawa musi biec PO filtrze Tutora (priorytet > 10) — na 10 albo
       niżej Tutor nadpisałby wynik i reguła byłaby martwa. */
{
  const KASA = join(KATALOG, "includes", "class-aai-platnosci-kasa.php");
  if (!existsSync(KASA)) {
    bledy.push(`${KASA}: brak klasy kasy — zdanie o zgodach wraca do wersji WooCommerce, czyli powołuje się na nieistniejący regulamin.`);
  } else {
    const kasa = kod(readFileSync(KASA, "utf8"));

    if (!/add_filter\(\s*'render_block_data'/.test(kasa)) {
      bledy.push(`${KASA}: zdanie o zgodach nie jest podmieniane (brak filtru render_block_data) — kasa wraca do powoływania się na „Warunki i zasady", których nie ma.`);
    }
    /* Zapis do treści strony jest ZAKAZANY — pytamy o zachowanie, nie
       o nazwę: żadnej podmiany łańcuchów na treści wpisu ani zapisu wpisu. */
    if (/wp_update_post|str_replace\s*\([^)]*post_content|->post_content\s*=/.test(kasa)) {
      bledy.push(`${KASA}: zdanie o zgodach zapisywane do TREŚCI strony kasy. Podmiana w cudzej treści bloków to klasa błędu z P3a (35 uszkodzonych bloków bez objawu) — atrybut ustawiamy w drzewie bloków w pamięci.`);
    }
    /* Odnośnik pozycji: filtr MUSI mieć priorytet wyższy niż 10 (Tutor). */
    const mFiltr = kasa.match(/add_filter\(\s*'woocommerce_cart_item_permalink'[^;]*?,\s*(\d+)/);
    if (!mFiltr) {
      bledy.push(`${KASA}: odnośnik pozycji koszyka nie jest naprawiany — filtr Tutora oddaje null dla produktu spoza kursów i zabiera cudzej pozycji klikalność (pułapka 11 schematu).`);
    } else if (Number(mFiltr[1]) <= 10) {
      bledy.push(`${KASA}: naprawa odnośnika pozycji ma priorytet ${mFiltr[1]}, czyli biegnie PRZED albo RAZEM z filtrem Tutora (10) — jego wynik nadpisze nasz i reguła będzie martwa.`);
    }
  }
}

/* 35. `is_tutor_order()` NIGDY BEZ WCZEŚNIEJSZEGO `wc_get_order()`.

   Pułapka 14 schematu, zmierzona w cudzym kodzie: funkcja robi
   `wc_get_order( $id )->get_meta( … )` bez sprawdzenia, czy zamówienie
   istnieje — na nieistniejącym identyfikatorze wywala FATAL, czyli biały
   ekran zamiast komunikatu. Dziś nie wołamy jej ani razu i ta reguła jest
   PREWENCYJNA: pilnuje, żeby pierwsze wywołanie od razu miało bezpiecznik,
   zamiast czekać na awarię u klienta. */
{
  for (const plik of plikiPhp(KATALOG)) {
    const tresc = kod(readFileSync(plik, "utf8"));
    for (const m of tresc.matchAll(/is_tutor_order\s*\(/g)) {
      const przed = tresc.slice(Math.max(0, m.index - 400), m.index);
      if (!/wc_get_order\s*\(/.test(przed)) {
        bledy.push(
          `${plik}: woła is_tutor_order() bez wcześniejszego wc_get_order(). Ta funkcja Tutora robi ->get_meta() na wyniku wc_get_order() BEZ sprawdzenia, czy zamówienie istnieje — na nieistniejącym identyfikatorze daje fatal, czyli biały ekran zamiast komunikatu (pułapka 14 schematu).`
        );
      }
    }
  }
}

/* 36. MAIL 1 POMIJA SIĘ WYŁĄCZNIE PO POTWIERDZONYM MAILU 2 (K1).

   Decyzja właściciela 2026-08-30: przy płatności natychmiastowej klient
   dostaje jedną wiadomość („Twój kurs jest gotowy" niesie odnośnik do
   ustawienia hasła), a nie dwie w tej samej sekundzie. Gwarancja K1 stoi
   jednak dalej: pominąć mail 1 wolno DOPIERO po odczytanym z dziennika
   „wyslano" maila 2 — gdy poczta padła, mail 1 MUSI wyjść, bo inaczej
   klient nie ma ANI JEDNEJ wiadomości z linkiem do hasła. Reguła celuje
   w rozstrzygnięcie (porównanie wyniku i drogę zapasową), nie w nazwę. */
{
  const maile = join(KATALOG, "includes", "class-aai-platnosci-maile.php");
  if (existsSync(maile)) {
    const c = kod(readFileSync(maile, "utf8"));
    const start = c.indexOf("function dostarcz_konto(");
    if (start < 0) {
      if (/WYNIK_POMINIETY/.test(c)) {
        bledy.push(
          `${maile}: jest wynik „pominięto", a nie ma dostarcz_konto() — pominięcie maila 1 żyje poza miejscem, którego pilnuje ta reguła.`
        );
      }
    } else {
      const dalej = c.slice(start + 1).search(/\n\t(?:private|public|protected)\s/);
      const blok = c.slice(start, dalej < 0 ? c.length : start + 1 + dalej);
      if (!/WYNIK_OK\s*===\s*Aai_Platnosci_Zapis::dostawa_rezultat\s*\(/.test(blok)) {
        bledy.push(
          `${maile}: dostarcz_konto() pomija mail 1 bez potwierdzonego wyniku maila 2. Pominięcie wolno zapisać dopiero po odczytanym z dziennika „wyslano" — inaczej awaria poczty zostawia klienta bez ANI JEDNEJ wiadomości z linkiem do hasła (K1).`
        );
      }
      if (!/wyslij_konto\s*\(/.test(blok)) {
        bledy.push(
          `${maile}: dostarcz_konto() nie ma drogi zapasowej (wyslij_konto). Gdy mail 2 nie wyjdzie, mail 1 musi — bez tego klient płacący natychmiastowo przy leżącej poczcie nie dostaje niczego (K1).`
        );
      }
    }

    /* Druga połowa tej samej gwarancji mieszka w KONTROLI: pominięcie
       jest w porządku WYŁĄCZNIE dla maila 1. Kontrola akceptująca
       „pominięto" dla maila 2 przestałaby widzieć jego awarie. */
    const cli = join(KATALOG, "includes", "class-aai-platnosci-cli.php");
    if (existsSync(cli)) {
      const ck = kod(readFileSync(cli, "utf8"));
      const od = ck.indexOf("function czy_dostawa_w_porzadku(");
      const blokCli = od < 0 ? "" : ck.slice(od, od + 1200);
      if (/WYNIK_POMINIETY/.test(blokCli) && !/ZDARZENIE_KONTO\s*===\s*\$zdarzenie\s*&&[^;]*WYNIK_POMINIETY/s.test(blokCli)) {
        bledy.push(
          `${cli}: kontrola akceptuje wynik „pominięto" bez sprawdzenia, że to mail KONTA. Pominięty mail 2 nie istnieje w projekcie — taka akceptacja ukryłaby jego awarię (klient zapłacił, wiadomości nie ma, kontrola zielona).`
        );
      }
    }
  }
}

/* 37. CISZA O CUDZYCH HASŁACH (decyzja właściciela 2026-08-30).

   Rdzeń zawiadamia ADMINISTRATORA o każdej zmianie hasła
   (wp_password_change_notification; klient z tej funkcji nie dostaje nic
   — zmierzone przy P4). Przy sprzedaży to jeden mail na każdego klienta,
   który ustawi hasło z naszego linku: szum zagłuszający prawdziwe
   powiadomienia. Rejestracja maili ma zdejmować ten callback — wzorzec
   celuje w wywołanie zdejmujące WEWNĄTRZ zarejestruj(), nie w obecność
   nazwy gdziekolwiek w pliku (lekcja szóstego nawrotu z P4). */
{
  const maile = join(KATALOG, "includes", "class-aai-platnosci-maile.php");
  if (existsSync(maile)) {
    const c = kod(readFileSync(maile, "utf8"));
    const start = c.indexOf("function zarejestruj(");
    const koniec = start < 0 ? -1 : c.indexOf("\n\t}", start);
    const blok = start < 0 ? "" : c.slice(start, koniec < 0 ? c.length : koniec);
    if (!/remove_action\s*\(\s*'after_password_reset'\s*,\s*'wp_password_change_notification'\s*\)/.test(blok)) {
      bledy.push(
        `${maile}: zarejestruj() nie zdejmuje wp_password_change_notification z after_password_reset. Każdy klient ustawiający hasło wysyła administratorowi mail „Hasło zostało zmienione" — szum, który zagłusza prawdziwe powiadomienia sklepu (decyzja właściciela 2026-08-30).`
      );
    }
  }
}

/* ————— 38. cały start wtyczki stoi w try/catch (test całości 2026-08-31) ————— */
/*
 * DLACZEGO TO JEST REGUŁA, A NIE STYL. Autoloader wtyczki POMIJA plik
 * nieczytelny (`is_readable`), więc brak JEDNEGO pliku z `includes/`
 * kończy się `Error: Class not found` — a jeśli pada on w callbacku
 * `plugins_loaded`, to na KAŻDYM żądaniu, czyli HTTP 500 na całej
 * witrynie razem ze sklepem. Zmierzone różnicowo tego dnia: wywołanie
 * spod `try` → strona 200, to samo wywołanie poza `try` → 500.
 *
 * Pytamy o POŁOŻENIE wywołań, nie o obecność słowa „try": każde
 * `Aai_Platnosci_*::` w tym pliku ma stać między `try {` a `} catch`.
 */
{
  const plikGlowny = PLIK_GLOWNY;
  const zrodlo = existsSync(plikGlowny) ? kod(readFileSync(plikGlowny, "utf8")) : "";
  const start = zrodlo.indexOf("'plugins_loaded'");
  if (start !== -1) {
    const blok = zrodlo.slice(start);
    const otwarcie = blok.indexOf("try {");
    const zamkniecie = blok.indexOf("} catch");
    const pozaOslona = [];
    // Wywołanie PRZED `try` jest niechronione. Wywołania po `} catch`
    // pomijamy świadomie: tam mieszka sam raport o błędzie, strzeżony
    // `class_exists` — reguła pytająca też o nie zapalałaby się na
    // poprawnym kodzie (sprawdzone: pierwsza wersja tak właśnie robiła).
    for (const m of blok.matchAll(/Aai_Platnosci_[A-Za-z_]+::(?:zarejestruj|dociagnij_schemat|utworz)\(/g)) {
      if (otwarcie === -1 || zamkniecie === -1 || m.index < otwarcie) {
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

if (bledy.length > 0) {
  console.error("straznik-platnosci-wp:");
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}

console.log(
  "straznik-platnosci-wp: szew w porządku (zero własnego AJAX-a i tras, jednokierunkowość wobec Pluginu 1, zero kasowania produktów, cena nigdy metą i nigdy _sale_price, słuchacze z Throwable, produkt tylko z warstwy zapisu, kolejność powiązania B2 w obie strony, produkt rodzi się draft i ukryty, blokada sprzedaży domyślnie zamknięta, filtry ustawień przy include, kontrola nie pisze, zamówienia mieszane nie są domykane, cudze pozycje bez zmian, przycisk pyta o zapis i o kupowalność, stan zamówienia po STATUSIE zapisu, domknięcie na koniec żądania, jedna decyzja o sprzedaży, dostępność nie zależy od oglądającego, mail najwyżej raz i bez hasła, adresat z konta, wysyłka przeżywa shutdown, status zapisu z bazy, mail Woo wraca przy deaktywacji, blokada koszyka nie wywraca kasy i odmawia zakupu nie do dostarczenia, tekst widoczny klientowi w kasie pochodzi z naszej tabeli i jedzie ze slashami, w koszyku zostaje jeden kurs i wszystkie cudze produkty, poczta ma jednego nadawcę bez zabierania głosu cudzym ustawieniom, bramki pytają o zamówienia przez API Woo, nie przez wp_posts, kasa nie powołuje się na nieistniejący regulamin i nie pisze do cudzej treści, odnośnik pozycji koszyka naprawiany PO filtrze Tutora, is_tutor_order() nigdy bez wcześniejszego wc_get_order(), mail 1 pomijany wyłącznie po potwierdzonym mailu 2 i tylko on, powiadomienie admina o zmianie hasła zdjęte)."
);
