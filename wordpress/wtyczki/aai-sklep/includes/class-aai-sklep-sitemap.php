<?php
/**
 * Mapa strony — nasze trasy do środka, nasze duplikaty na zewnątrz.
 *
 * DLACZEGO WTYCZKA W OGÓLE RUSZA SITEMAPĘ. Zmierzone 2026-08-31 na żywej
 * instalacji: `wp-sitemap.xml` nie zawierał ANI JEDNEJ naszej trasy
 * (`/szkolenia/` i strony sprzedażowe to reguły przepisywania, nie wpisy),
 * a za to wystawiał adresy, które sami przekierowujemy (`/courses/<slug>/`)
 * i 73 adresy lekcji, którym sami dajemy `noindex`. Mapa mówiła więc
 * wyszukiwarce coś przeciwnego niż strony, do których prowadziła — czyli
 * dokładnie ten rozjazd sygnałów, przed którym ostrzega `lib/seo.ts`
 * prototypu.
 *
 * GRANICA (decyzja właściciela 2026-08-31, wariant „b"): wtyczka pilnuje
 * TYLKO swoich tras. Sprzątamy więc dokładnie te adresy, które istnieją
 * Z NASZEGO POWODU — kopię kursów w Tutorze i strony, które Tutor postawił,
 * bo my go używamy. Blog, `/shop/`, `sample-page`, kategorie i tagi należą
 * do właściciela witryny i idą na listę wdrożeniową, a nie pod nasz filtr.
 * Produkty Woo i strony transakcyjne sprząta Plugin 2, bo to on je powołał.
 *
 * CZEGO TA KLASA NIE ROBI: nie włącza sitemapy. Rdzeń bramkuje ją opcją
 * `blog_public` („widoczność dla wyszukiwarek") i to zostaje jedynym
 * przełącznikiem indeksowania — drugi byłby trzecią wersją prawdy
 * (ta sama zasada, co w `Aai_Sklep_Seo`).
 *
 * @package Aai_Sklep
 */

defined( 'ABSPATH' ) || exit;

/**
 * Wpływ sklepu na `wp-sitemap.xml`.
 */
class Aai_Sklep_Sitemap {

	/**
	 * Typy wpisów, które są KOPIĄ naszej treści w Tutorze.
	 *
	 * Kurs w Tutorze ma własny adres `/courses/<slug>/`, który od W3
	 * oddaje **301** na naszą stronę sprzedażową; lekcje stoją za bramką
	 * i dostają `noindex`. Jedno i drugie nie ma czego szukać w mapie:
	 * pierwsze jest przekierowaniem, drugie zamkniętą stroną.
	 */
	private const KOPIE_TUTORA = array( 'courses', 'lesson' );

	/**
	 * Rejestracja — wołane raz, z pliku głównego wtyczki.
	 */
	public static function zarejestruj(): void {
		// Priorytet 20: po `init` rdzenia, który stawia serwer sitemapy.
		add_action( 'init', array( self::class, 'dodaj_dostawce' ), 20 );

		add_filter( 'wp_sitemaps_post_types', array( self::class, 'bez_kopii_tutora' ) );
		add_filter( 'wp_sitemaps_posts_query_args', array( self::class, 'bez_stron_tutora' ), 10, 2 );
	}

	/**
	 * Dokłada dostawcę naszych tras.
	 */
	public static function dodaj_dostawce(): void {
		if ( ! function_exists( 'wp_register_sitemap_provider' ) ) {
			return;
		}
		wp_register_sitemap_provider( 'szkolenia', new Aai_Sklep_Sitemap_Dostawca() );
	}

	/**
	 * Wycina z mapy typy wpisów będące kopią naszej treści.
	 *
	 * @param array<string,WP_Post_Type> $typy Typy wpisów zgłoszone do mapy.
	 * @return array<string,WP_Post_Type>
	 */
	public static function bez_kopii_tutora( $typy ) {
		if ( ! is_array( $typy ) ) {
			return $typy;
		}
		foreach ( self::KOPIE_TUTORA as $typ ) {
			unset( $typy[ $typ ] );
		}
		return $typy;
	}

	/**
	 * Wycina z mapy strony, które postawił Tutor.
	 *
	 * Panel kursanta oddaje **302** na nasze „Moje kursy" (W6), a obie
	 * rejestracje są wyłączone — trzy adresy, które istnieją wyłącznie
	 * dlatego, że używamy Tutora, i pod którymi nie ma treści dla nikogo
	 * przychodzącego z wyszukiwarki.
	 *
	 * @param array<string,mixed> $argumenty Argumenty zapytania mapy.
	 * @param string              $typ       Typ wpisu, dla którego pyta rdzeń.
	 * @return array<string,mixed>
	 */
	public static function bez_stron_tutora( $argumenty, $typ ) {
		if ( 'page' !== $typ || ! is_array( $argumenty ) ) {
			return $argumenty;
		}

		$strony = Aai_Sklep_Zasoby::strony_tutora();
		if ( array() === $strony ) {
			return $argumenty;
		}

		$juz = isset( $argumenty['post__not_in'] ) && is_array( $argumenty['post__not_in'] )
			? $argumenty['post__not_in']
			: array();

		// Dokładamy do cudzej listy zamiast ją nadpisywać: ten sam filtr
		// jest jedynym miejscem, w którym Plugin 2 wycina koszyk i kasę.
		$argumenty['post__not_in'] = array_values( array_unique( array_merge( $juz, $strony ) ) );

		return $argumenty;
	}
}
