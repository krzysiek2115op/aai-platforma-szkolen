<?php
/**
 * Wersje, na których DOWIEDZIONO fakty o cudzym kodzie (L17 z P2).
 *
 * RÓŻNICA W STOSUNKU DO PLUGINU 2: tam brak WooCommerce albo Tutora
 * znaczył „szew nie ma czego zszywać". Tutaj nie ma zależności twardej.
 * Dziennik logowań stoi na hakach RDZENIA WordPressa, ekran jest nasz,
 * a menu potrafi żyć samo (własna pozycja, gdy sklepu nie ma). Woo
 * i Tutor są potrzebne tylko po to, żeby ISTNIAŁY ścieżki, które
 * rejestrujemy — nie po to, żeby wtyczka działała.
 *
 * Dlatego ta klasa nie blokuje niczego. Mówi tylko, na jakich wersjach
 * potwierdzono fakty ze schematu, i ostrzega, gdy instalacja odjechała:
 * aktualizacja Woo przełączająca kasę na `wp_signon()` zamieniłaby
 * dedup źródła (F1/F3/F4) w cichy podwójny wpis.
 *
 * @package Aai_Monitor
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Dowiedzione wersje i ostrzeżenie o dryfie.
 */
final class Aai_Monitor_Zaleznosci {

	/**
	 * Wersje z sekcji „Fakty zmierzone w cudzym kodzie" schematu.
	 */
	public const WP_DOWIEDZIONE    = '6.9.4';
	public const WOO_DOWIEDZIONE   = '11.0.1';
	public const TUTOR_DOWIEDZIONE = '4.0.7';

	/**
	 * Rejestruje komunikat kokpitu.
	 */
	public static function zarejestruj(): void {
		add_action( 'admin_notices', array( self::class, 'komunikat' ) );
	}

	/**
	 * Zainstalowane wersje: nazwa → wersja (pusta, gdy wtyczki nie ma).
	 *
	 * @return array<string,string>
	 */
	public static function wersje(): array {
		return array(
			'WordPress'   => (string) get_bloginfo( 'version' ),
			'WooCommerce' => defined( 'WC_VERSION' ) ? (string) WC_VERSION : '',
			'Tutor LMS'   => defined( 'TUTOR_VERSION' ) ? (string) TUTOR_VERSION : '',
		);
	}

	/**
	 * Które wersje odjechały od dowiedzionych.
	 *
	 * Nieobecnej wtyczki NIE zgłaszamy: brak Woo to nie dryf, tylko
	 * instalacja bez sklepu — a wtedy po prostu nie ma ścieżki „sesja
	 * z kasy" do rejestrowania.
	 *
	 * @return string[] Opisy różnic, pusta lista = zgodnie ze schematem.
	 */
	public static function dryf(): array {
		$dowiedzione = array(
			'WordPress'   => self::WP_DOWIEDZIONE,
			'WooCommerce' => self::WOO_DOWIEDZIONE,
			'Tutor LMS'   => self::TUTOR_DOWIEDZIONE,
		);
		$rozne = array();
		foreach ( self::wersje() as $nazwa => $wersja ) {
			if ( '' === $wersja ) {
				continue;
			}
			if ( $wersja !== $dowiedzione[ $nazwa ] ) {
				$rozne[] = sprintf( '%s %s (fakty dowiedziono na %s)', $nazwa, $wersja, $dowiedzione[ $nazwa ] );
			}
		}
		return $rozne;
	}

	/**
	 * Komunikat o dryfie — na naszym ekranie, bo to nas dotyczy.
	 */
	public static function komunikat(): void {
		$dryf = self::dryf();
		if ( array() === $dryf || ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$ekran = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( null === $ekran || ! str_contains( (string) $ekran->id, AAI_MONITOR_STRONA ) ) {
			return;
		}
		printf(
			'<div class="notice notice-info"><p><strong>Automatic AI — Monitoring:</strong> %s</p></div>',
			esc_html(
				sprintf(
					'inne wersje niż te, na których dowiedziono zachowanie haków: %s. To nie jest awaria — to znak, żeby potwierdzić fakty ze schematu (docs/plugin-3/DIAGRAM.md, sekcja 0).',
					implode( '; ', $dryf )
				)
			)
		);
	}
}
