<?php
/**
 * Dostawca sitemapy dla tras sklepu.
 *
 * DLACZEGO WŁASNY DOSTAWCA, A NIE TYP WPISU. Katalog i strony sprzedażowe
 * nie są wpisami WordPressa — to reguły przepisywania obsługiwane przez
 * `Aai_Sklep_Trasy` i renderowane z NASZYCH tabel. Rdzeń buduje sitemapę
 * wyłącznie z typów wpisów i taksonomii, więc bez tego dostawcy nasze
 * jedyne kanoniczne adresy nie trafiłyby do niej wcale (zmierzone
 * 2026-08-31: sitemapa nie zawierała ANI JEDNEJ naszej trasy).
 *
 * @package Aai_Sklep
 */

defined( 'ABSPATH' ) || exit;

/**
 * Katalog i strony kursów w `wp-sitemap.xml`.
 */
class Aai_Sklep_Sitemap_Dostawca extends WP_Sitemaps_Provider {

	/**
	 * Nazwa dostawcy — wchodzi do adresu `wp-sitemap-szkolenia-1.xml`.
	 */
	public function __construct() {
		$this->name        = 'szkolenia';
		$this->object_type = 'szkolenia';
	}

	/**
	 * Adresy do mapy.
	 *
	 * Kursy bierzemy z `lista_kursow()`, czyli z TEGO SAMEGO odczytu, z
	 * którego renderuje się katalog. Dzięki temu mapa nie może obiecać
	 * strony, której nie ma (odczyt filtruje `status = 'published'`), ani
	 * pominąć kursu, który jest.
	 *
	 * BEZ `lastModified`. Kuszące jest podać `updated_at`, ale pomiar
	 * (2026-08-31) pokazał, że ta kolumna nie znaczy „zmiana treści":
	 * trigger ustawia ją przy KAŻDYM `UPDATE` wiersza kursu, bez
	 * porównania wartości, a poprawka prozy lekcji — czyli jedyna zmiana,
	 * która czytelnika obchodzi — siedzi w tabeli `lessons` i wiersza
	 * kursu nie dotyka. Data byłaby więc jednocześnie zawyżona i zaniżona.
	 * Zasada projektu (zero zmyślania) obowiązuje też metadane.
	 *
	 * @param int    $page_num       Numer strony mapy (mamy jedną).
	 * @param string $object_subtype Nieużywane — nie mamy podtypów.
	 * @return array<int,array<string,mixed>>
	 */
	public function get_url_list( $page_num, $object_subtype = '' ): array {
		$adresy = array( array( 'loc' => Aai_Sklep_Widok::adres_kursu() ) );

		foreach ( Aai_Sklep_Odczyt::lista_kursow() as $kurs ) {
			$adresy[] = array( 'loc' => Aai_Sklep_Widok::adres_kursu( (string) $kurs['slug'] ) );
		}

		/** Ten sam filtr, co w rdzeniu — pozwala wyciąć adres bez łatania klasy. */
		return apply_filters( 'wp_sitemaps_szkolenia_url_list', $adresy, $object_subtype );
	}

	/**
	 * Liczba stron mapy.
	 *
	 * Jedna. Sklep ma dwa kursy, a sufit rdzenia to 2000 adresów na stronę
	 * — dzielenie na strony byłoby udawaniem skali, której nie mamy.
	 *
	 * @param string $object_subtype Nieużywane.
	 */
	public function get_max_num_pages( $object_subtype = '' ): int {
		return 1;
	}
}
