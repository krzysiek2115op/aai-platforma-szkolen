/**
 * Higiena dziennika logowań — wspólny moduł smoke'ów WP.
 *
 * PO CO. Od kroku T2 (Plugin 3) WordPress zapisuje KAŻDE logowanie do
 * tabeli `wp_aai_monitor_logowania`. Nasze bramki logują się po wielekroć
 * — jako administrator, jako `klient-test`, jako gość przy zakupie — więc
 * od tej chwili każda z nich produkuje wpisy w dzienniku, nie wiedząc
 * o tym.
 *
 * To nie jest bałagan kosmetyczny. Jedyną funkcją ALARMOWĄ ekranu
 * monitoringu jest licznik nieudanych prób z ostatnich 7 dni; a jedynym
 * powodem, dla którego ten dziennik istnieje, jest odpowiedź na pytanie
 * „kto i skąd wchodził na konta". Serie wpisów wyprodukowane przez własne
 * testy zamieniają obie te rzeczy w szum — i to szum wyglądający dokładnie
 * jak próba włamania.
 *
 * ZMIERZONE (przelot wszystkich czternastu bramek WP z licznikiem
 * przed/po, 2026-08-30) — wpisy zostawia SIEDEM bramek, razem osiem
 * wierszy na pełny przelot: `smoke-wp-kreator` (2) oraz `smoke-wp-lekcja`,
 * `smoke-wp-produkty`, `smoke-wp-zakup`, `smoke-wp-jezyk`,
 * `smoke-wp-panel` i `smoke-wp-motyw` (po 1). Nie zostawiają nic:
 * `smoke-wp-dane`, `-front`, `-tutor`, `-platnosci`, `-zwroty`, `-maile`.
 *
 * GREP TEGO NIE POWIEDZIAŁ i mylił się w OBIE strony: wskazywał
 * `platnosci` (który tylko asertuje, że ekran logowania oddaje 200)
 * i przegapił `produkty` oraz `zakup`, bo one nie dotykają
 * `wp-login.php` — sesja powstaje im w kasie WooCommerce. Ta sama lekcja
 * co przy poczcie w 0.54.0: grep kłamie, pomiar nie.
 *
 * PIERWSZY PRZELOT TEŻ KŁAMAŁ, i to ciszej: `jezyk`, `panel` i `motyw`
 * pokazały „zostawia 0", bo w ogóle się nie uruchomiły — wymagają
 * `ZRZUTY_RIG`, którego przelot nie ustawił, więc padły przed pierwszym
 * logowaniem. Kod wyjścia 1 był jedynym śladem. POMIAR BEZ SPRAWDZENIA
 * KODU WYJŚCIA MIERZY CISZĘ, NIE STAN.
 *
 * ZASADA (N13, ta sama co w `poczta.mjs`): bramka kasuje wyłącznie to, co
 * sama wywołała. Nie `TRUNCATE`, nie „wszystko z dzisiaj" — tylko wiersze,
 * które powstały PO jej starcie.
 *
 * DLACZEGO GRANICĄ JEST IDENTYFIKATOR, A NIE LISTA LOGINÓW. Loginy naszych
 * bramek to prawdziwe konta (`admin`, `klient-test`), więc kasowanie po
 * nazwie zabrałoby także wcześniejsze, PRAWDZIWE logowania właściciela na
 * to samo konto. Wiersz o identyfikatorze większym niż migawka powstał
 * natomiast w oknie przebiegu — a bramki uruchamia się na warsztacie,
 * nigdy na instalacji z ruchem.
 */

/*
 * UCHWYT. Każdy smoke woła `wp eval` inaczej (jeden zwraca łańcuch, drugi
 * obiekt z polem `.out`, trzeci ma własne `wpEval`), więc moduł przyjmuje
 * najniższy wspólny mianownik: funkcję `(kodPhp) => tekst wyjścia`.
 * Opakowanie po stronie smoke'a to jedna linia i nie wymaga ruszania jego
 * własnej warstwy uruchamiania podmana.
 */

/**
 * Migawka dziennika: identyfikator ostatniego wiersza sprzed przebiegu.
 *
 * Zwraca `null`, gdy monitoringu nie ma (wtyczka wyłączona albo instalacja
 * bez Pluginu 3) — wtedy sprzątanie i rozliczenie są bezczynne, zamiast
 * wywracać bramkę, która z monitoringiem nie ma nic wspólnego.
 *
 * @param {(kod: string) => string} php Uchwyt `wp eval` smoke'a.
 */
export function migawkaDziennika(php) {
  let tekst = "";
  try {
    tekst = String(
      php(
        "if ( ! class_exists( 'Aai_Monitor_Tabele' ) || ! Aai_Monitor_Tabele::istnieja() ) { echo 'brak'; return; } global $wpdb; echo (int) $wpdb->get_var( 'SELECT COALESCE(MAX(id),0) FROM ' . Aai_Monitor_Tabele::tabela( 'logowania' ) );"
      ) ?? ""
    ).trim();
  } catch {
    return null;
  }
  if (tekst.endsWith("brak") || !/\d$/.test(tekst)) return null;
  return Number(tekst.match(/\d+$/)[0]);
}

/**
 * Ile wierszy dziennika przybyło od migawki.
 *
 * @param {(kod: string) => string} php Uchwyt `wp eval`.
 * @param {number|null} migawka Wynik `migawkaDziennika`.
 */
export function wlasneWpisy(php, migawka) {
  if (migawka === null) return 0;
  const out = String(
    php(
      `global $wpdb; $t = Aai_Monitor_Tabele::tabela( 'logowania' ); echo (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM \`{$t}\` WHERE id > %d", ${migawka} ) );`
    ) ?? ""
  );
  return Number(out.match(/\d+$/)?.[0] ?? 0);
}

/**
 * Kasuje wiersze powstałe po migawce — i tylko je.
 *
 * @param {(kod: string) => string} php Uchwyt `wp eval`.
 * @param {number|null} migawka Wynik `migawkaDziennika`.
 * @return {number} Ile wierszy skasowano.
 */
export function sprzatnijDziennik(php, migawka) {
  // Bez migawki NIE WOLNO wysłać żadnego DELETE: brak granicy znaczyłby
  // „skasuj wszystko", czyli dokładnie to, czemu ten moduł zapobiega
  // (ta sama pułapka co puste `IDs` w API Mailpita — 0.54.0).
  if (migawka === null) return 0;
  const out = String(
    php(
      `global $wpdb; $t = Aai_Monitor_Tabele::tabela( 'logowania' ); echo (int) $wpdb->query( $wpdb->prepare( "DELETE FROM \`{$t}\` WHERE id > %d", ${migawka} ) );`
    ) ?? ""
  );
  return Number(out.match(/\d+$/)?.[0] ?? 0);
}

/**
 * Liczba wszystkich wierszy dziennika — do rachunku sumienia „przed i po".
 *
 * @param {(kod: string) => string} php Uchwyt `wp eval`.
 */
export function ileWpisow(php) {
  const out = String(
    php(
      "if ( ! class_exists( 'Aai_Monitor_Tabele' ) || ! Aai_Monitor_Tabele::istnieja() ) { echo 0; return; } global $wpdb; echo (int) $wpdb->get_var( 'SELECT COUNT(*) FROM ' . Aai_Monitor_Tabele::tabela( 'logowania' ) );"
    ) ?? ""
  );
  return Number(out.match(/\d+$/)?.[0] ?? 0);
}
