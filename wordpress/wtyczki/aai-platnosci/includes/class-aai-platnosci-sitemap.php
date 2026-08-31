<?php
/**
 * Ścieżka zakupu poza wyszukiwarką.
 *
 * DLACZEGO TO NALEŻY DO PLUGINU 2. Reguła podziału (decyzja właściciela
 * 2026-08-31, wariant „b"): każda wtyczka sprząta w sitemapie dokładnie te
 * adresy, które istnieją Z JEJ POWODU. Produkty WooCommerce naszych kursów
 * zakłada `Aai_Platnosci_Zapis`, a koszyk i kasę powołał krok P3a — więc to
 * tutaj, a nie w Pluginie 1.
 *
 * CO ZMIERZONO (2026-08-31, żywa instalacja, `blog_public = 1`, czyli jak
 * na produkcji):
 *   - `/koszyk/` i `/my-account/` nie miały **ŻADNEGO** znacznika `robots`,
 *     czyli w produkcji byłyby indeksowalne; strony Woo są w mapie rdzenia
 *     wskazane poprawnie (id 6/7/8), więc to nie była kwestia konfiguracji;
 *   - `/product/<slug>/` był w mapie jako osobny adres, choć od testu
 *     całości oddaje **301** na naszą stronę sprzedażową.
 * Mapa zapraszała więc do indeksu koszyk klienta i drugi adres tego samego
 * kursu.
 *
 * DLACZEGO SAMI, A NIE „WOO TO ZROBI". Bo nie zrobił — pomiar wyżej jest
 * rozstrzygający. Na cudzy `noindex` nie liczymy; ta sama zasada, dla
 * której widok lekcji i „Moje kursy" emitują swój własny (W5, W6).
 *
 * @package Aai_Platnosci
 */

defined( 'ABSPATH' ) || exit;

/**
 * Koszyk, kasa, konto i produkty poza mapą i poza indeksem.
 */
class Aai_Platnosci_Sitemap {

	/**
	 * Rejestracja — wołane raz, z pliku głównego wtyczki.
	 */
	public static function zarejestruj(): void {
		add_filter( 'wp_sitemaps_post_types', array( self::class, 'bez_produktow' ) );
		add_filter( 'wp_sitemaps_taxonomies', array( self::class, 'bez_kategorii_produktow' ) );
		add_filter( 'wp_sitemaps_posts_query_args', array( self::class, 'bez_stron_zakupu' ), 10, 2 );

		// Priorytet 3: zaraz po znacznikach Pluginu 1 (ten stoi na 2).
		add_action( 'wp_head', array( self::class, 'noindex_sciezki_zakupu' ), 3 );
	}

	/**
	 * Wycina z mapy produkty WooCommerce.
	 *
	 * Produkt kursu nie jest osobną treścią — jest technicznym nośnikiem
	 * ceny i koszyka, a jego adres oddaje 301 na naszą stronę sprzedażową.
	 * Zostawienie go w mapie znaczyłoby zgłaszanie wyszukiwarce dwóch
	 * adresów tego samego kursu.
	 *
	 * @param array<string,WP_Post_Type> $typy Typy wpisów zgłoszone do mapy.
	 * @return array<string,WP_Post_Type>
	 */
	public static function bez_produktow( $typy ) {
		if ( ! is_array( $typy ) ) {
			return $typy;
		}
		unset( $typy['product'] );
		return $typy;
	}

	/**
	 * Wycina z mapy archiwa kategorii produktów.
	 *
	 * Skoro produktów w mapie nie ma, to archiwum, które je listuje, tym
	 * bardziej nie ma czego w niej szukać. Produkty kursów są w Woo
	 * `hidden` (P2), więc `/product-category/…/` oddaje dziś PUSTĄ listę
	 * w cudzym wyglądzie (zmierzone) — zapraszanie do niej wyszukiwarki
	 * byłoby zgłaszaniem strony bez treści.
	 *
	 * @param array<string,WP_Taxonomy> $taksonomie Taksonomie zgłoszone do mapy.
	 * @return array<string,WP_Taxonomy>
	 */
	public static function bez_kategorii_produktow( $taksonomie ) {
		if ( ! is_array( $taksonomie ) ) {
			return $taksonomie;
		}
		unset( $taksonomie['product_cat'], $taksonomie['product_tag'] );
		return $taksonomie;
	}

	/**
	 * Wycina z mapy strony koszyka, kasy i konta.
	 *
	 * @param array<string,mixed> $argumenty Argumenty zapytania mapy.
	 * @param string              $typ       Typ wpisu, dla którego pyta rdzeń.
	 * @return array<string,mixed>
	 */
	public static function bez_stron_zakupu( $argumenty, $typ ) {
		if ( 'page' !== $typ || ! is_array( $argumenty ) ) {
			return $argumenty;
		}

		$strony = self::strony_zakupu();
		if ( array() === $strony ) {
			return $argumenty;
		}

		$juz = isset( $argumenty['post__not_in'] ) && is_array( $argumenty['post__not_in'] )
			? $argumenty['post__not_in']
			: array();

		// Dokładamy do cudzej listy zamiast ją nadpisywać — pod tym samym
		// filtrem Plugin 1 wycina strony Tutora.
		$argumenty['post__not_in'] = array_values( array_unique( array_merge( $juz, $strony ) ) );

		return $argumenty;
	}

	/**
	 * `noindex` na stronach ścieżki zakupu.
	 *
	 * Koszyk i kasa są stanem JEDNEJ sesji, a konto jest prywatne: robot
	 * indeksujący jest gościem, więc zaindeksowałby pusty koszyk albo
	 * formularz logowania pod adresem marki.
	 */
	public static function noindex_sciezki_zakupu(): void {
		if ( ! self::czy_strona_zakupu() ) {
			return;
		}
		echo '<meta name="robots" content="noindex, nofollow"/>' . "\n";
	}

	/**
	 * Czy oglądamy koszyk, kasę albo konto.
	 *
	 * Pytamy WooCommerce jego własnymi funkcjami, a nie o slug: strony są
	 * wskazane w opcjach i właściciel może je przenieść.
	 */
	private static function czy_strona_zakupu(): bool {
		if ( ! function_exists( 'is_cart' ) ) {
			return false;
		}
		return is_cart() || is_checkout() || is_account_page();
	}

	/**
	 * Identyfikatory stron koszyka, kasy i konta.
	 *
	 * @return array<int,int>
	 */
	private static function strony_zakupu(): array {
		if ( ! function_exists( 'wc_get_page_id' ) ) {
			return array();
		}

		$strony = array();
		foreach ( array( 'cart', 'checkout', 'myaccount' ) as $nazwa ) {
			$id = (int) wc_get_page_id( $nazwa );
			if ( $id > 0 ) {
				$strony[] = $id;
			}
		}

		return array_values( array_unique( $strony ) );
	}
}
