<?php
/**
 * Zależności od cudzych wtyczek — komunikat, nie biały ekran.
 *
 * Szew bez WooCommerce albo Tutora nie ma czego zszywać, ale wtyczka
 * ZOSTAJE aktywna i mówi o tym w kokpicie (bramka P1 schematu:
 * „wyłączenie Woo/Tutora daje komunikat, nie biały ekran"). Blokada
 * aktywacji byłaby gorsza: po chwilowej deaktywacji Woo do diagnozy
 * wtyczka by zniknęła i nikt by jej z powrotem nie włączył.
 *
 * @package Aai_Platnosci
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Sprawdzanie obecności WooCommerce i Tutora.
 */
final class Aai_Platnosci_Zaleznosci {

	/**
	 * Wersje, na których DOWIEDZIONO łańcuch zakupu (sekcja 0 schematu).
	 * Inna wersja to nie awaria — to sygnał, że trzy fakty z sekcji 0
	 * trzeba potwierdzić od nowa. Mówi o tym `wp aai-platnosci sprawdz`.
	 */
	public const WOO_DOWIEDZIONE   = '11.0.1';
	public const TUTOR_DOWIEDZIONE = '4.0.7';

	/**
	 * Rejestruje komunikat kokpitu o brakujących zależnościach.
	 */
	public static function zarejestruj(): void {
		add_action( 'admin_notices', array( self::class, 'komunikat' ) );
	}

	/**
	 * Czy WooCommerce jest wczytane.
	 */
	public static function jest_woo(): bool {
		return class_exists( 'WooCommerce' );
	}

	/**
	 * Czy Tutor LMS jest wczytany.
	 */
	public static function jest_tutor(): bool {
		return function_exists( 'tutor' );
	}

	/**
	 * Nazwy brakujących zależności (pusta lista = komplet).
	 *
	 * @return string[]
	 */
	public static function brakuje(): array {
		$brak = array();
		if ( ! self::jest_woo() ) {
			$brak[] = 'WooCommerce';
		}
		if ( ! self::jest_tutor() ) {
			$brak[] = 'Tutor LMS';
		}
		return $brak;
	}

	/**
	 * Komunikat w kokpicie, gdy czegoś brakuje.
	 */
	public static function komunikat(): void {
		$brak = self::brakuje();
		if ( array() === $brak || ! current_user_can( 'activate_plugins' ) ) {
			return;
		}
		printf(
			'<div class="notice notice-warning"><p><strong>Automatic AI — Płatności:</strong> %s</p></div>',
			esc_html(
				sprintf(
					'brakuje wtyczki: %s. Sprzedaż kursów nie działa, dopóki jej nie włączysz — dane Pluginu 2 są bezpieczne i czekają.',
					implode( ', ', $brak )
				)
			)
		);
	}
}
