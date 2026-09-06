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

/*
 * ——— FLAGA SPRZEDAŻY NIE MOŻE PRZEŻYĆ ODINSTALOWANIA (MAR-A-16) ———
 *
 * `Aai_Platnosci_Ustawienia` deklaruje wprost: „SPRZEDAŻ OTWIERA CZŁOWIEK,
 * NIE AKTUALIZACJA". Do 0.75.0 `aai_platnosci_sprzedaz_otwarta` przeżywała
 * PEŁNE odinstalowanie z kasowaniem danych — więc po ponownej instalacji
 * tabele powstawały puste, `napraw()` ustawiało silnik, synchronizacja
 * publikowała produkty i **sprzedaż była otwarta od pierwszej sekundy**,
 * przy PUSTYM dzienniku `dostawy`, czyli przy skasowanym nośniku
 * idempotencji maili. Deklaracja, którą kasowanie danych po cichu omija,
 * nie jest decyzją człowieka.
 */
delete_option( 'aai_platnosci_sprzedaz_otwarta' );
delete_option( 'aai_platnosci_blad' );
delete_option( 'aai_platnosci_punkt_przywracania' );

/* Nasze znaczniki na produktach WooCommerce. Produktów NIE kasujemy —
   niezmiennik 13 mówi, że ta wtyczka nigdy nie kasuje produktu; są w koszyku
   i w historii zamówień klientów. Zdejmujemy z nich tylko nasze meta. */
foreach ( array( '_aai_platnosci_kurs_uuid', '_aai_platnosci_okladka_kurs', '_aai_platnosci_okladka_sha' ) as $klucz ) {
	delete_post_meta_by_key( $klucz );
}

/*
 * CO TEN PLIK ZOSTAWIA ZAWSZE:
 *   - produkty WooCommerce, zamówienia i konta klientów (patrz wyżej),
 *   - ustawienia Woo i Tutora przestawione przy aktywacji — cofa je
 *     DEAKTYWACJA z punktu przywracania, a nie ten plik: on wykonuje się
 *     PO niej i miałby skąd czytać tylko śmieci.
 */
