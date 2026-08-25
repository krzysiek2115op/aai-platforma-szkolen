<?php
/**
 * Wpięcie warstwy integracji Tutor ↔ motyw Automatic AI.
 *
 * Sam wygląd mieszka w `assets/tutor-motyw.css` — tam też stoi
 * uzasadnienie każdej reguły. Ten plik odpowiada za trzy rzeczy:
 * kiedy arkusz wchodzi, po czym poznać stronę Tutora i skąd bierze się
 * klasa, pod którą wszystkie reguły są zakotwiczone.
 *
 * DLACZEGO KLASA NA `body`, A NIE SELEKTOR NA KONTENER TUTORA.
 * Kontener Tutora ma inne zagnieżdżenie na każdej stronie (na stronie
 * kursu jest dzieckiem `body`, w panelu kursanta siedzi w treści strony
 * WordPressa), więc odstęp pod nagłówek trzeba dać czemuś, co jest
 * zawsze w tym samym miejscu. Klasa na `body` jest też jedynym miejscem,
 * z którego widać, KTÓRA strona dostała nasz arkusz — dzięki temu
 * `smoke-wp-motyw` ma czego szukać.
 *
 * DLACZEGO ARKUSZ, A NIE NADPISANE SZABLONY. Szablony Tutora nadpisujemy
 * w W5, i tylko te, których wygląd należy do nas (widok lekcji). Panel
 * kursanta, logowanie i „moje kursy" zostają Tutora wg podziału
 * z ETAP-WP.md — a te strony też muszą dać się przeczytać.
 *
 * @package Aai_Sklep
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Arkusz dopasowujący Tutora do motywu.
 */
final class Aai_Sklep_Styl_Tutora {

	/**
	 * Klasa dopinana do `body` na stronach Tutora. Wszystkie reguły
	 * arkusza są pod nią zakotwiczone, więc strona motywu nie dostaje
	 * ani jednej.
	 */
	public const KLASA_BODY = 'aai-tutor-na-motywie';

	/**
	 * Uchwyt arkusza.
	 */
	private const UCHWYT = 'aai-sklep-tutor-motyw';

	/**
	 * Rejestracja — wołane raz, z pliku głównego wtyczki.
	 */
	public static function zarejestruj(): void {
		// Priorytet 1000: PO higienie zasobów (999). Kolejność ma znaczenie —
		// gdyby nasz arkusz wszedł do kolejki wcześniej, sprzątanie po
		// prefiksach mogłoby go kiedyś zabrać razem z cudzymi.
		add_action( 'wp_enqueue_scripts', array( self::class, 'dodaj_arkusz' ), 1000 );
		add_filter( 'body_class', array( self::class, 'dodaj_klase' ) );
	}

	/**
	 * Dokłada arkusz na stronach Tutora.
	 */
	public static function dodaj_arkusz(): void {
		if ( ! Aai_Sklep_Zasoby::strona_tutora() ) {
			return;
		}

		$plik = 'assets/tutor-motyw.css';
		wp_enqueue_style(
			self::UCHWYT,
			AAI_SKLEP_URL . $plik,
			// Zależność od arkusza motywu, żeby nasze reguły były
			// drukowane PO nim — a przy okazji żeby tokeny (`--color-*`),
			// z których korzystamy, na pewno już istniały.
			array( 'automatic-ai' ),
			(string) filemtime( AAI_SKLEP_KATALOG . $plik )
		);
	}

	/**
	 * Dopina klasę do `body` na stronach Tutora.
	 *
	 * @param string[] $klasy Klasy WordPressa.
	 * @return string[]
	 */
	public static function dodaj_klase( array $klasy ): array {
		if ( Aai_Sklep_Zasoby::strona_tutora() ) {
			$klasy[] = self::KLASA_BODY;
		}
		return $klasy;
	}
}
