<?php
/**
 * Komendy WP-CLI Pluginu 2 — kontrola w wersji minimalnej (krok P1).
 *
 * ROLE SĄ ROZDZIELONE (L11 z krytyki P0): kontrola NIGDY nie pisze —
 * inaczej mierzyłaby skutek własnego działania i nigdy nie byłaby
 * czerwona. Ustawianie żyje przy aktywacji i (od P3a) w `sync --napraw`.
 *
 * Kody wyjścia:
 *  - 0 — porządek, ALBO stan „Woo/Tutor wyłączone" (z komunikatem;
 *    1 rezerwujemy dla działającego otoczenia z rozjazdem, bo bramka P1
 *    mówi „wyłączenie Woo daje komunikat" — kod 1 by jej przeczył),
 *  - 0 z OSTRZEŻENIEM — inna wersja Tutora/Woo niż dowiedziona
 *    (aktualizacja to nie awaria, ale unieważnia dowody — L17),
 *  - 1 — rozjazd: wtyczka aktywna, a jej tabel nie ma.
 *
 * Kolejne kroki (P2+) tylko DOKŁADAJĄ sprawdzenia do tej komendy —
 * kontrola rośnie razem z wtyczką.
 *
 * @package Aai_Platnosci
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * `wp aai-platnosci <komenda>`.
 */
final class Aai_Platnosci_Cli {

	/**
	 * Kontrola stanu szwu.
	 *
	 * ## EXAMPLES
	 *
	 *     wp aai-platnosci sprawdz
	 *
	 * @when after_wp_load
	 */
	public function sprawdz(): void {
		$bledy       = array();
		$ostrzezenia = array();

		if ( ! Aai_Platnosci_Tabele::istnieja() ) {
			$bledy[] = 'brak tabel wtyczki (powiazania, dostawy) — aktywuj wtyczkę ponownie, aktywacja tworzy schemat.';
		}

		$brak = Aai_Platnosci_Zaleznosci::brakuje();
		if ( array() !== $brak ) {
			// Świadomie kod 0: wyłączone otoczenie to stan nazwany, nie rozjazd.
			WP_CLI::log( 'sprawdz: wyłączone — ' . implode( ', ', $brak ) . '. Sprzedaż nie działa; dane Pluginu 2 czekają.' );
			foreach ( $bledy as $blad ) {
				WP_CLI::warning( $blad );
			}
			WP_CLI::halt( 0 );
		}

		$woo = defined( 'WC_VERSION' ) ? WC_VERSION : '?';
		if ( Aai_Platnosci_Zaleznosci::WOO_DOWIEDZIONE !== $woo ) {
			$ostrzezenia[] = "WooCommerce {$woo}, a łańcuch dowiedziono na " . Aai_Platnosci_Zaleznosci::WOO_DOWIEDZIONE . '.';
		}
		$tutor = defined( 'TUTOR_VERSION' ) ? TUTOR_VERSION : '?';
		if ( Aai_Platnosci_Zaleznosci::TUTOR_DOWIEDZIONE !== $tutor ) {
			$ostrzezenia[] = "Tutor LMS {$tutor}, a łańcuch dowiedziono na " . Aai_Platnosci_Zaleznosci::TUTOR_DOWIEDZIONE . '.';
		}

		if ( array() !== $ostrzezenia ) {
			foreach ( $ostrzezenia as $o ) {
				WP_CLI::warning( $o );
			}
			WP_CLI::log( 'Po aktualizacji potwierdź trzy fakty z sekcji 0 schematu (docs/plugin-2/DIAGRAM.md):' );
			WP_CLI::log( ' 1. łańcuch domknięcia zamówienia (needs_processing → completed),' );
			WP_CLI::log( ' 2. kolejność pary _tutor_course_price_type / _tutor_course_product_id w do_enroll(),' );
			WP_CLI::log( ' 3. para opcji kasy: zakup gościa + rejestracja z kasy.' );
		}

		if ( array() !== $bledy ) {
			foreach ( $bledy as $blad ) {
				WP_CLI::error( $blad, false );
			}
			WP_CLI::halt( 1 );
		}

		WP_CLI::success(
			sprintf(
				'sprawdz: tabele są, WooCommerce %s i Tutor %s aktywne%s.',
				$woo,
				$tutor,
				array() === $ostrzezenia ? ' (wersje dowiedzione)' : ' (wersje INNE niż dowiedzione — patrz wyżej)'
			)
		);
	}
}
