<?php
/**
 * Kanał błędów — awaria zapisu musi być GŁOŚNA (N15, P13).
 *
 * Zapis monitoringu biegnie w CUDZYM żądaniu: przy logowaniu, w kasie
 * WooCommerce, przy beaconie z przeglądarki. Żadne z nich nie ma komu
 * pokazać błędu — beacon z założenia milczy (204), a hak rdzenia nie ma
 * kanału zwrotnego. Bez tej opcji uszkodzona tabela dawałaby PUSTĄ listę
 * logowań, którą właściciel przeczyta jako „nikt nie próbował się
 * włamać". Fałszywy negatyw na jedynym ekranie, który ma ostrzegać, jest
 * gorszy niż brak ekranu.
 *
 * Wzorem `Aai_Platnosci_Komunikaty`, ale prościej: tam stan trzeba było
 * trzymać per kurs, bo naprawa dotyczyła pojedynczego kursu. Tutaj jest
 * jedna rzecz do naprawienia — zapis do naszych tabel — więc jeden wpis
 * wystarcza. Liczymy za to POWTÓRZENIA: „raz nie wyszło" i „nie wychodzi
 * od tysiąca żądań" to dwie różne wiadomości.
 *
 * @package Aai_Monitor
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Ostatnia awaria zapisu + komunikat w kokpicie.
 */
final class Aai_Monitor_Komunikaty {

	/**
	 * Opcja ze stanem ostatniej awarii.
	 */
	private const OPCJA = 'aai_monitor_blad';

	/**
	 * Rejestruje komunikat kokpitu.
	 */
	public static function zarejestruj(): void {
		add_action( 'admin_notices', array( self::class, 'komunikat' ) );
	}

	/**
	 * Zapisuje awarię.
	 *
	 * @param string $tresc Opis awarii.
	 */
	public static function zapisz( string $tresc ): void {
		$stan = self::stan();
		update_option(
			self::OPCJA,
			array(
				'tresc' => mb_substr( $tresc, 0, 500 ),
				'czas'  => current_datetime()->setTimezone( new DateTimeZone( 'UTC' ) )->format( 'Y-m-d H:i:s' ),
				'ile'   => ( $stan['tresc'] ?? '' ) === mb_substr( $tresc, 0, 500 )
					? ( (int) ( $stan['ile'] ?? 0 ) ) + 1
					: 1,
			),
			false
		);
	}

	/**
	 * Zdejmuje wpis o awarii.
	 *
	 * Kasuje WYŁĄCZNIE ten, kto naprawił — czyli człowiek, komendą.
	 * Automatyczne czyszczenie „bo następny zapis się udał" gasiłoby
	 * alarm w chwili, w której właściciel jeszcze go nie zobaczył:
	 * przy monitoringu udany zapis zdarza się co żądanie, więc alarm
	 * żyłby ułamek sekundy.
	 */
	public static function wyczysc(): void {
		delete_option( self::OPCJA );
	}

	/**
	 * Surowy stan awarii (pusta tablica = porządek).
	 *
	 * @return array<string,mixed>
	 */
	public static function stan(): array {
		$stan = get_option( self::OPCJA, array() );
		return is_array( $stan ) ? $stan : array();
	}

	/**
	 * Awaria jednym zdaniem; pusty łańcuch = porządek.
	 */
	public static function ostatni(): string {
		$stan = self::stan();
		if ( array() === $stan || '' === ( $stan['tresc'] ?? '' ) ) {
			return '';
		}
		$ile = (int) ( $stan['ile'] ?? 1 );
		return sprintf(
			'%s (ostatnio %s UTC%s)',
			(string) $stan['tresc'],
			(string) ( $stan['czas'] ?? '?' ),
			$ile > 1 ? sprintf( ', powtórzeń: %d', $ile ) : ''
		);
	}

	/**
	 * Komunikat w kokpicie.
	 *
	 * Pokazujemy na NASZYM ekranie (tam pusta lista wymaga wyjaśnienia)
	 * ORAZ na liście wtyczek — bo tam zagląda się, gdy coś nie działa,
	 * a do ekranu monitoringu nikt nie wejdzie bez powodu.
	 */
	public static function komunikat(): void {
		$blad = self::ostatni();
		if ( '' === $blad || ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$ekran = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( null === $ekran ) {
			return;
		}
		$nasz = str_contains( (string) $ekran->id, Aai_Monitor_Ekran::STRONA ) || 'plugins' === $ekran->id;
		if ( ! $nasz ) {
			return;
		}
		printf(
			'<div class="notice notice-warning"><p><strong>Automatic AI — Monitoring:</strong> %s %s</p></div>',
			esc_html( $blad ),
			esc_html( 'Pusta lista na ekranie monitoringu może więc znaczyć „awaria", a nie „cisza". Szczegóły i naprawę podaje `wp aai-monitor sprawdz`.' )
		);
	}
}
