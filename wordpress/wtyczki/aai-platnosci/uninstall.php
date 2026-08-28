<?php
/**
 * Odinstalowanie wtyczki.
 *
 * DOMYŚLNIE NIE KASUJEMY DANYCH — ta sama decyzja co w `aai-sklep`.
 *
 * W tych tabelach leży wiedza, której nie ma nikt inny: które produkty
 * sprzedają które kursy i którym klientom NAPRAWDĘ dostarczono mail
 * i dostęp. Skasowanie `dostawy` przy przeinstalowaniu wtyczki
 * oznaczałoby, że pierwszy przebieg po powrocie wyśle klientom maile
 * DRUGI RAZ — znacznik idempotencji mieszka właśnie tu.
 *
 * Kto naprawdę chce usunąć dane razem z wtyczką, włącza to świadomie
 * opcją `aai_platnosci_kasuj_dane_przy_usuwaniu`. Wtedy i tylko wtedy
 * ten plik czyści po sobie do zera.
 *
 * CO TEN PLIK ZOSTAWIA ZAWSZE (nie jego własność): produkty WooCommerce
 * (historia zamówień), wpisy kursów Tutora, konta klientów, zamówienia.
 *
 * @package Aai_Platnosci
 */

declare( strict_types = 1 );

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

global $wpdb;

$prefiks = $wpdb->prefix . 'aai_platnosci_';

if ( ! get_option( 'aai_platnosci_kasuj_dane_przy_usuwaniu' ) ) {
	// Zostawiamy komplet danych; kasujemy wyłącznie ślad wersji schematu.
	delete_option( 'aai_platnosci_wersja_schematu' );
	return;
}

foreach ( array( 'powiazania', 'dostawy' ) as $tabela ) {
	// Nazwa tabeli to identyfikator złożony z prefiksu instalacji i stałej
	// z kodu — żaden fragment nie pochodzi z zewnątrz.
	$wpdb->query( 'DROP TABLE IF EXISTS `' . $prefiks . $tabela . '`' ); // phpcs:ignore WordPress.DB.PreparedSQL
}

delete_option( 'aai_platnosci_wersja_schematu' );
delete_option( 'aai_platnosci_kasuj_dane_przy_usuwaniu' );
