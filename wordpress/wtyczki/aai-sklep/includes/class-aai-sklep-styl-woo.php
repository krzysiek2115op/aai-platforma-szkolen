<?php
/**
 * Wpięcie warstwy integracji WooCommerce ↔ motyw Automatic AI.
 *
 * Bliźniak `Aai_Sklep_Styl_Tutora` — ta sama konstrukcja, bo to ta sama
 * klasa problemu: cudza wtyczka rysuje własne strony CSS-em spoza warstw
 * kaskady motywu, więc jej reguły biją motyw niezależnie od kolejności
 * ładowania. Sam wygląd mieszka w `assets/woo-motyw.css` — tam też stoi
 * uzasadnienie każdej reguły.
 *
 * DLACZEGO OSOBNA KLASA, A NIE GAŁĄŹ W `Styl_Tutora`. Bo to dwa różne
 * pytania: „czy to strona Tutora" i „czy to strona Woo" mają różne
 * odpowiedzi, różne markupy i różne cykle życia (Woo dostanie koszyk
 * i kasę w Pluginie 2). Wspólna klasa musiałaby rozgałęziać się w każdej
 * metodzie, a dwa arkusze i tak są dwa.
 *
 * SKĄD SIĘ WZIĘŁA. Ze zgłoszenia właściciela w teście ręcznym W6: strona
 * `/my-account/` renderowała się bez odstępu pod nagłówek i bez kontenera,
 * ciemnym tekstem na ciemnym tle. Nie złapał tego żaden automat, bo
 * `smoke-wp-motyw` mierzył pięć stron i ani jedna nie była stroną Woo.
 *
 * @package Aai_Sklep
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Arkusz dopasowujący WooCommerce do motywu.
 */
final class Aai_Sklep_Styl_Woo {

	/**
	 * Klasa dopinana do `body` na stronach Woo. Wszystkie reguły arkusza
	 * są pod nią zakotwiczone, więc strona motywu nie dostaje ani jednej —
	 * a `smoke-wp-motyw` ma czego szukać.
	 */
	public const KLASA_BODY = 'aai-woo-na-motywie';

	/**
	 * Uchwyt arkusza.
	 */
	private const UCHWYT = 'aai-sklep-woo-motyw';

	/**
	 * Rejestracja — wołane raz, z pliku głównego wtyczki.
	 */
	public static function zarejestruj(): void {
		// Priorytet 1000: PO higienie zasobów (999), tak samo jak arkusz
		// Tutora. Gdyby nasz arkusz wszedł do kolejki wcześniej, sprzątanie
		// po prefiksach mogłoby go kiedyś zabrać razem z cudzymi.
		add_action( 'wp_enqueue_scripts', array( self::class, 'dodaj_arkusz' ), 1000 );
		add_filter( 'body_class', array( self::class, 'dodaj_klase' ) );
	}

	/**
	 * Dokłada arkusz na stronach WooCommerce.
	 */
	public static function dodaj_arkusz(): void {
		if ( ! Aai_Sklep_Zasoby::strona_woo() ) {
			return;
		}

		$plik = 'assets/woo-motyw.css';
		wp_enqueue_style(
			self::UCHWYT,
			AAI_SKLEP_URL . $plik,
			// Zależność od arkusza motywu, żeby nasze reguły były drukowane
			// PO nim, a tokeny (`--color-*`), z których korzystamy, na pewno
			// już istniały.
			array( 'automatic-ai' ),
			(string) filemtime( AAI_SKLEP_KATALOG . $plik )
		);
	}

	/**
	 * Dopina klasę do `body` na stronach WooCommerce.
	 *
	 * @param string[] $klasy Klasy WordPressa.
	 * @return string[]
	 */
	public static function dodaj_klase( array $klasy ): array {
		if ( Aai_Sklep_Zasoby::strona_woo() ) {
			$klasy[] = self::KLASA_BODY;
		}
		return $klasy;
	}
}
