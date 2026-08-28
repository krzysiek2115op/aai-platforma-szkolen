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
	 * Nazwa opcji ze stanem błędów — MAPA `uuid kursu → komunikat`.
	 *
	 * Jeden globalny slot był zatrzaskiem i kłamcą naraz: udany zapis
	 * kursu B kasował błąd kursu A (alarm gasł tam, gdzie miał świecić),
	 * a `wp aai-platnosci sync` nie miał jak go zdjąć, więc kontrola
	 * zostawała czerwona po naprawie i uczyła, żeby jej nie ufać.
	 * Stan trzymamy więc per kurs i czyści go każda udana synchronizacja
	 * TEGO kursu — także z wiersza poleceń.
	 */
	private const OPCJA = 'aai_platnosci_blad';

	/**
	 * Rejestruje komunikat kokpitu.
	 */
	public static function zarejestruj(): void {
		add_action( 'admin_notices', array( self::class, 'komunikat' ) );
	}

	/**
	 * Cała mapa błędów.
	 *
	 * @return array<string,string>
	 */
	public static function wszystkie(): array {
		$mapa = get_option( self::OPCJA, array() );
		return is_array( $mapa ) ? $mapa : array();
	}

	/**
	 * Zapisuje błąd konkretnego kursu.
	 *
	 * @param string $tresc       Opis błędu.
	 * @param string $course_uuid Uuid kursu; pusty = błąd niezwiązany z kursem.
	 */
	public static function zapisz( string $tresc, string $course_uuid = '' ): void {
		$mapa = self::wszystkie();
		$mapa[ '' === $course_uuid ? '_ogolny' : $course_uuid ] = $tresc;
		update_option( self::OPCJA, $mapa, false );
	}

	/**
	 * Czyści błąd konkretnego kursu (po udanej synchronizacji).
	 *
	 * @param string $course_uuid Uuid kursu; pusty = czyści wpis ogólny.
	 */
	public static function wyczysc( string $course_uuid = '' ): void {
		$mapa  = self::wszystkie();
		$klucz = '' === $course_uuid ? '_ogolny' : $course_uuid;
		if ( ! array_key_exists( $klucz, $mapa ) ) {
			return;
		}
		unset( $mapa[ $klucz ] );
		if ( array() === $mapa ) {
			delete_option( self::OPCJA );
			return;
		}
		update_option( self::OPCJA, $mapa, false );
	}

	/**
	 * Wszystkie błędy jednym łańcuchem (dla kontroli CLI); pusty = porządek.
	 */
	public static function ostatni(): string {
		$mapa = self::wszystkie();
		if ( array() === $mapa ) {
			return '';
		}
		$linie = array();
		foreach ( $mapa as $uuid => $tresc ) {
			$linie[] = ( '_ogolny' === $uuid ? '' : $uuid . ': ' ) . $tresc;
		}
		return implode( ' | ', $linie );
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
