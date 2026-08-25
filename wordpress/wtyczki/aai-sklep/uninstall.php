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
