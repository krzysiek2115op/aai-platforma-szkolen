<?php
/**
 * Zależności od cudzych wtyczek — komunikat, nie cisza.
 *
 * Sklep bez Tutor LMS działa w POŁOWIE: katalog, strony sprzedażowe
 * i kreator stoją, ale kopia kursu dla LMS-a nie powstaje, a klient nie ma
 * jak dostać materiału za logowaniem. Do 0.75.0 nie mówiło o tym NIC —
 * `Aai_Sklep_Tutor::na_zmianie()` wychodziła cicho przez `! dostepny()`,
 * więc każdy zapis kursu przy wyłączonym Tutorze zostawiał kopię
 * przestarzałą i nikt się o tym nie dowiadywał (MAR-A-07).
 *
 * Obie siostrzane wtyczki miały taką klasę od początku; ta jedna, mimo 28
 * własnych klas, miała w całym kodzie DOKŁADNIE JEDNO `admin_notices` —
 * to z `catch` w bootstrapie.
 *
 * Blokada aktywacji byłaby gorsza od komunikatu: po chwilowym wyłączeniu
 * Tutora do diagnozy zniknęłaby też strona sprzedażowa, a razem z nią
 * katalog. Wtyczka ZOSTAJE i mówi, czego brakuje.
 *
 * @package Aai_Sklep
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Sprawdzanie obecności Tutor LMS.
 */
final class Aai_Sklep_Zaleznosci {

	/**
	 * Rejestruje komunikat kokpitu o brakujących zależnościach.
	 */
	public static function zarejestruj(): void {
		add_action( 'admin_notices', array( self::class, 'komunikat' ) );
	}

	/**
	 * Czy Tutor LMS jest wczytany.
	 *
	 * Pytamy tę samą funkcję co `Aai_Sklep_Tutor::dostepny()` — jedno
	 * źródło odpowiedzi, żeby komunikat nie mówił czego innego niż kod,
	 * który z tej odpowiedzi korzysta.
	 */
	public static function jest_tutor(): bool {
		return class_exists( 'Aai_Sklep_Tutor' ) && Aai_Sklep_Tutor::dostepny();
	}

	/**
	 * Nazwy brakujących zależności (pusta lista = komplet).
	 *
	 * @return string[]
	 */
	public static function brakuje(): array {
		$brak = array();
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
			'<div class="notice notice-warning"><p><strong>Automatic AI — Sklep:</strong> %s</p></div>',
			esc_html(
				sprintf(
					'brakuje wtyczki: %s. Katalog i strony sprzedażowe działają, ale kopia kursu dla LMS-a nie powstaje — klient nie dostanie materiału za logowaniem, a każdy zapis w kreatorze zostawia kopię coraz starszą. Treść w naszych tabelach jest bezpieczna; po włączeniu Tutora uruchom `wp aai-sklep sync`.',
					implode( ', ', $brak )
				)
			)
		);
	}
}
