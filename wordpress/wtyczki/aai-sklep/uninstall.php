<?php
/**
 * Odinstalowanie wtyczki.
 *
 * DOMYŚLNIE NIE KASUJEMY DANYCH — i to jest decyzja, nie przeoczenie.
 *
 * W tych tabelach leży treść dwóch kursów: 73 lekcje prozy, 908 kB, praca
 * kilku tygodni. WordPress uruchamia ten plik po kliknięciu „Usuń" przy
 * wtyczce — czyli po jednym kliknięciu w miejscu, gdzie ludzie klikają
 * także po to, żeby wtyczkę przeinstalować albo zdiagnozować konflikt.
 * Wtyczka, która przy takim kliknięciu kasuje treść, jest pułapką.
 *
 * Kto NAPRAWDĘ chce usunąć dane razem z wtyczką, włącza to świadomie
 * w ustawieniach (opcja `aai_sklep_kasuj_dane_przy_usuwaniu`). Wtedy
 * i tylko wtedy ten plik czyści po sobie do zera.
 *
 * @package Aai_Sklep
 */

declare( strict_types = 1 );

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

global $wpdb;

$prefiks = $wpdb->prefix . 'aai_sklep_';

if ( ! get_option( 'aai_sklep_kasuj_dane_przy_usuwaniu' ) ) {
	// Zostawiamy komplet danych. Kasujemy wyłącznie ślad wersji schematu,
	// żeby ponowna instalacja dociągnęła go od nowa — to jedyna rzecz,
	// której trzymanie po odinstalowaniu nie ma sensu.
	delete_option( 'aai_sklep_wersja_schematu' );
	return;
}

// Kasujemy od dołu, jak dyspozytor w prototypie: dziennik audytu jako
// ostatni, bo do niego trafiają wpisy o kasowaniu wszystkiego innego.
$tabele = array( 'lessons', 'modules', 'sections', 'courses', 'changelog' );
foreach ( $tabele as $tabela ) {
	// Nazwa tabeli nie może iść przez `prepare` (to identyfikator, nie
	// wartość), więc składamy ją wyłącznie z prefiksu instalacji i stałej
	// z kodu — żaden fragment nie pochodzi z zewnątrz.
	$wpdb->query( 'DROP TABLE IF EXISTS `' . $prefiks . $tabela . '`' ); // phpcs:ignore WordPress.DB.PreparedSQL
}

delete_option( 'aai_sklep_wersja_schematu' );
delete_option( 'aai_sklep_kasuj_dane_przy_usuwaniu' );

/*
 * ——— „DO ZERA" ZNACZY TAKŻE POZA NASZYMI TABELAMI (MAR-A-16) ———
 *
 * Nagłówek tego pliku obiecywał czyszczenie „do zera", a kasował wyłącznie
 * PIĘĆ TABEL. Po pełnym odinstalowaniu zostawało w instalacji: 148
 * załączników zrzutów z metami `_aai_zrzut_*`, wpisy Tutora z ośmioma
 * naszymi metami i dwie własne opcje. Obietnica bez pokrycia jest gorsza od
 * braku obietnicy — właściciel, który wyczyścił witrynę, miał prawo sądzić,
 * że jest czysta.
 *
 * Ta gałąź wykonuje się WYŁĄCZNIE po jawnej zgodzie (flaga sprawdzona
 * wyżej). Bez niej nie kasujemy niczego — to zostaje bez zmian.
 *
 * Wtyczka JEST JUŻ WYŁĄCZONA, więc nie mamy tu ani jednej swojej klasy:
 * wszystko idzie przez API WordPressa i surowe zapytania po naszych
 * własnych kluczach.
 */

/* 1. Kopia kursu w Tutorze. Te wpisy powstały WYŁĄCZNIE z naszego powodu
      i bez naszych tabel są śmieciem, do którego nikt nie ma źródła.
      Rozpoznajemy je po NASZYM znaczniku, nigdy po typie wpisu — cudzych
      kursów w Tutorze nie ruszamy. */
$nasze_wpisy = $wpdb->get_col(
	$wpdb->prepare( "SELECT post_id FROM {$wpdb->postmeta} WHERE meta_key = %s", '_aai_zrodlo_uuid' )
);
foreach ( (array) $nasze_wpisy as $id_wpisu ) {
	wp_delete_post( (int) $id_wpisu, true );
}

/* 2. Załączniki, które wgraliśmy sami: 148 zrzutów lekcji i okładki kursów.
      Znów po NASZYCH metach — cudzych mediów nie dotykamy. */
$nasze_zalaczniki = $wpdb->get_col(
	$wpdb->prepare(
		"SELECT DISTINCT post_id FROM {$wpdb->postmeta} WHERE meta_key IN ( %s, %s )",
		'_aai_zrzut_lekcja',
		'_aai_zrzut_nazwa'
	)
);
foreach ( (array) $nasze_zalaczniki as $id_zalacznika ) {
	wp_delete_attachment( (int) $id_zalacznika, true );
}

/* 3. Resztki met na wpisach, które przeżyły (gdyby jakiś wpis Tutora został
      ręcznie odpięty od naszego uuid) oraz nasze opcje. */
foreach ( array( '_aai_zrodlo_uuid', '_aai_cena_grosze', '_aai_badge', '_aai_typ', '_aai_okladka_url', '_aai_sekcje', '_aai_zapowiedz', '_aai_materialy', '_aai_zrzut_lekcja', '_aai_zrzut_nazwa' ) as $klucz ) {
	delete_post_meta_by_key( $klucz );
}
delete_option( 'aai_sklep_wersja_regul' );
delete_option( 'aai_sklep_tutor_blad' );

/*
 * CO TEN PLIK ZOSTAWIA ZAWSZE (sekcja, którą obie siostry miały, a ta
 * wtyczka nie — i jako jedyna zostawiała najwięcej):
 *   - konta klientów i ich zapisy na kursy (`wp_users`, tabele Tutora) —
 *     to nie są nasze dane, a klient zapłacił za dostęp,
 *   - produkty WooCommerce (kasuje je odinstalowanie Pluginu 2),
 *   - strony i treść, których nie stworzyliśmy.
 */
