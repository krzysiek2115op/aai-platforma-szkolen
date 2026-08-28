<?php
/**
 * Ostatni błąd kopii — na ekran kokpitu, nie w ciszę (L14).
 *
 * Słuchacze łapią `Throwable`, żeby awaria kopii nie cofała zapisu kursu
 * — ceną jest niewidzialność błędu. Dlatego błąd ląduje w opcji i wraca
 * jako `admin_notices` na ekranach kreatora Pluginu 1 (`aai-sklep*`)
 * ze zdaniem, CO zrobić: „kliknij Zapisz kurs, żeby naprawić". Naprawa
 * zbiorcza jedzie komendą `wp aai-platnosci sync`. Takiego haka jak
 * `aai_platnosci_blad` w Pluginie 1 nie ma i nie potrzeba (L14).
 *
 * @package Aai_Platnosci
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Opcja błędu + komunikat kokpitu.
 */
final class Aai_Platnosci_Komunikaty {

	/**
	 * Nazwa opcji z ostatnim błędem.
	 */
	private const OPCJA = 'aai_platnosci_blad';

	/**
	 * Rejestruje komunikat kokpitu.
	 */
	public static function zarejestruj(): void {
		add_action( 'admin_notices', array( self::class, 'komunikat' ) );
	}

	/**
	 * Zapisuje ostatni błąd kopii (bez autoloadu — czytany tylko w kokpicie).
	 *
	 * @param string $tresc Opis błędu.
	 */
	public static function zapisz( string $tresc ): void {
		update_option( self::OPCJA, $tresc, false );
	}

	/**
	 * Czyści błąd po udanym przebiegu.
	 */
	public static function wyczysc(): void {
		delete_option( self::OPCJA );
	}

	/**
	 * Ostatni błąd (dla kontroli CLI).
	 */
	public static function ostatni(): string {
		return (string) get_option( self::OPCJA, '' );
	}

	/**
	 * Komunikat na ekranach kreatora Pluginu 1.
	 */
	public static function komunikat(): void {
		$blad = self::ostatni();
		if ( '' === $blad || ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$ekran = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( null === $ekran || ! str_contains( (string) $ekran->id, 'aai-sklep' ) ) {
			return;
		}
		printf(
			'<div class="notice notice-warning"><p><strong>Automatic AI — Płatności:</strong> %s %s</p></div>',
			esc_html( sprintf( 'kopia produktu nie nadążyła: %s.', $blad ) ),
			esc_html( 'Kliknij „Zapisz kurs", żeby naprawić ten jeden kurs, albo uruchom `wp aai-platnosci sync`.' )
		);
	}
}
