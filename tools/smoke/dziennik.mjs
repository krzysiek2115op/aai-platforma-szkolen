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
 * ZMIERZONE (czysty przelot wszystkich czternastu bramek WP,
 * 2026-08-30) — wpisy tworzy PIĘĆ bramek plus smoke monitoringu:
 * `smoke-wp-kreator` (2), `smoke-wp-lekcja`, `smoke-wp-panel`,
 * `smoke-wp-motyw` i `smoke-wp-jezyk` (po 1) oraz `smoke-wp-monitor`
 * (16 — on ten mechanizm mierzy). Nie tworzą ani jednego:
 * `smoke-wp-dane`, `-front`, `-tutor`, `-platnosci`, `-produkty`,
 * `-zakup`, `-zwroty`, `-maile`.
 *
 * DWA MOJE WCZEŚNIEJSZE POMIARY KŁAMAŁY i warto wiedzieć jak, bo obie
 * pułapki są łatwe do powtórzenia:
 *
 *   1. pierwszy przelot policzył `jezyk`, `panel` i `motyw` jako
 *      „zostawia 0", bo one w ogóle SIĘ NIE URUCHOMIŁY — wymagają
 *      `ZRZUTY_RIG`, którego nie ustawił, więc padły przed pierwszym
 *      logowaniem. Kod wyjścia 1 był jedynym śladem. POMIAR BEZ
 *      SPRAWDZENIA KODU WYJŚCIA MIERZY CISZĘ, NIE STAN;
 *   2. drugi przypisał wpisy `produkty` i `zakup`, których one nie
 *      tworzą — w tle biegły MOJE WŁASNE żądania HTTP (logowanie admina
 *      przy sprawdzaniu polityki prywatności), a licznik nie wie, czyj
 *      jest wiersz. POMIAR RÓWNOLEGŁY Z WŁASNĄ PRACĄ PRZYPISUJE JEJ
 *      SKUTKI MIERZONEMU. Wykrył to dopiero przegląd.
 *
 * Ostateczny pomiar liczy `AUTO_INCREMENT` tabeli, nie liczbę wierszy:
 * sprzątanie kasuje ślad, ale licznika nie cofa, więc widać, ile wierszy
 * NAPRAWDĘ powstało — także wtedy, gdy bramka po sobie posprzątała.
 *
 * `smoke-wp-produkty` i `smoke-wp-zakup` mają moduł wpięty mimo zera:
 * składają zamówienia i zakładają konta, więc pierwsza zmiana w tamtej
 * ścieżce może zacząć tworzyć sesje. To PROFILAKTYKA, nie naprawa
 * czynnego wycieku — i tak jest nazwana, żeby nikt nie brał jej za dowód.
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
 *
 * OGRANICZENIE, nazwane wprost: gdyby ktoś zalogował się DOKŁADNIE
 * w oknie przebiegu bramki, jego wiersz też zniknie — a rachunek sumienia
 * tego nie wykryje, bo licznik wróci do wartości sprzed przebiegu. Ryzyko
 * jest warsztatowe i minutowe. Gdyby przestało wystarczać, właściwą drogą
 * jest zbieranie identyfikatorów W TRAKCIE przebiegu (wzorzec
 * `poczta.mjs`: migawka → różnica → jawna lista `IDs`), nie druga
 * heurystyka po treści wiersza.
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
        "if ( ! class_exists( 'Aai_Monitor_Tabele' ) || ! Aai_Monitor_Tabele::istnieja() ) { echo 'AAI-BRAK'; return; } global $wpdb; echo 'AAI-MIGAWKA:', (int) $wpdb->get_var( 'SELECT COALESCE(MAX(id),0) FROM ' . Aai_Monitor_Tabele::tabela( 'logowania' ) );"
      ) ?? ""
    ).trim();
  } catch {
    return null;
  }
  if (tekst.includes("AAI-BRAK")) return null;
  /*
   * Czytamy WŁASNY ZNACZNIK, nie „ostatnią liczbę z wyjścia".
   * Gdyby `wp` dopisał do stdout cokolwiek zakończonego cyfrą (ostrzeżenie
   * PHP, komunikat wtyczki), migawka byłaby ZANIŻONA — a wtedy sprzątanie
   * `WHERE id > <mała liczba>` wycięłoby prawdziwe wiersze. Brak znacznika
   * znaczy „nie wiem", czyli `null`, czyli sprzątanie nic nie wyśle.
   * `poczta.mjs` ma na tę klasę własne zabezpieczenie (porównanie z `total`).
   */
  const znacznik = tekst.match(/AAI-MIGAWKA:(\d+)/);
  return znacznik ? Number(znacznik[1]) : null;
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
