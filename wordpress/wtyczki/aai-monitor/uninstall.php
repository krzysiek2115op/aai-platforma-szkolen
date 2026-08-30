<?php
/**
 * Odinstalowanie wtyczki.
 *
 * DOMYŚLNIE NIE KASUJEMY DANYCH — ta sama decyzja co w `aai-sklep`
 * i `aai-platnosci`, ale tutaj z mocniejszym powodem niż wygoda:
 * DZIENNIK LOGOWAŃ JEST MATERIAŁEM DOWODOWYM PO INCYDENCIE. Kto
 * przeinstalowuje wtyczkę po włamaniu, robi to właśnie po to, żeby
 * zobaczyć, kto i skąd wchodził — a „Usuń" przy wtyczce klika się też
 * przy diagnozie konfliktu.
 *
 * Kto naprawdę chce usunąć dane razem z wtyczką, włącza to świadomie
 * opcją `aai_monitor_kasuj_dane_przy_usuwaniu`. Wtedy i tylko wtedy ten
 * plik czyści po sobie do zera.
 *
 * CO TEN PLIK ZOSTAWIA ZAWSZE (nie jego własność): konta, wpisy, kursy,
 * zamówienia — Plugin 3 nie pisze do żadnej cudzej tabeli DZIEDZINOWEJ (N14) — poza `wp_options`, i to wyłącznie przez API rdzenia (`update_option` kanału błędów, transient retencji), czyli tak jak każda wtyczka trzyma swoje ustawienia.
 *
 * @package Aai_Monitor
 */

declare( strict_types = 1 );

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

global $wpdb;

$prefiks = $wpdb->prefix . 'aai_monitor_';

if ( ! get_option( 'aai_monitor_kasuj_dane_przy_usuwaniu' ) ) {
	// Zostawiamy komplet danych; kasujemy wyłącznie ślady stanu.
	delete_option( 'aai_monitor_wersja_schematu' );
	delete_option( 'aai_monitor_blad' );
	delete_transient( 'aai_monitor_retencja_dnia' );
	return;
}

foreach ( array( 'logowania', 'wizyty' ) as $tabela ) {
	// Nazwa tabeli to identyfikator złożony z prefiksu instalacji i stałej
	// z kodu — żaden fragment nie pochodzi z zewnątrz.
	$wpdb->query( 'DROP TABLE IF EXISTS `' . $prefiks . $tabela . '`' ); // phpcs:ignore WordPress.DB.PreparedSQL
}

delete_option( 'aai_monitor_wersja_schematu' );
delete_option( 'aai_monitor_blad' );
delete_option( 'aai_monitor_kasuj_dane_przy_usuwaniu' );
delete_transient( 'aai_monitor_retencja_dnia' );
