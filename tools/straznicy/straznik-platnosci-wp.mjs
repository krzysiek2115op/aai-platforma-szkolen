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
      `${plik}: zapisuje ${metaCeny[1]} przez update_post_meta. Cena idzie WYŁĄCZNIE przez WC_Product::set_regular_price() + save() (B5): zapis samej mety zostawia _price po staremu — katalog pokazuje nową cenę, kasa liczy starą, a kontrola porównująca get_regular_price() tego nie widzi.`
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

if (bledy.length > 0) {
  console.error("straznik-platnosci-wp:");
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}

console.log(
  "straznik-platnosci-wp: szew w porządku (zero własnego AJAX-a i tras, jednokierunkowość wobec Pluginu 1, zero kasowania produktów, cena nigdy metą i nigdy _sale_price, słuchacze z Throwable, produkt tylko z warstwy zapisu, kolejność powiązania B2 w obie strony, produkt rodzi się draft i ukryty)."
);
