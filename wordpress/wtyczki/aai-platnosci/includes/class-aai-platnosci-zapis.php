<?php
/**
 * Warstwa zapisu — DZIAŁ-DYSPOZYTOR Pluginu 2.
 *
 * JEDYNE miejsce, które pisze do BAZY Pluginu 2 (obu tabel) i do
 * produktu WooCommerce. Ta sama zasada co `Aai_Sklep_Zapis` w Pluginie 1
 * i dyspozytor w prototypie; pilnują jej `straznik-wtyczki-wp`
 * (zapis tylko przez warstwę zapisu) i `straznik-platnosci-wp`
 * (produkt tylko stąd).
 *
 * CZEGO TU NIE MA — i nie będzie:
 *  - zapisów do tabel `aai_sklep_*` ani wywołań `Aai_Sklep_Zapis::`
 *    (jednokierunkowość — niezmiennik 2 schematu),
 *  - kasowania produktów (niezmiennik 13),
 *  - dotykania `_sale_price` w jakiejkolwiek formie (niezmiennik 3).
 *
 * @package Aai_Platnosci
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Jedyny pisarz Pluginu 2.
 */
final class Aai_Platnosci_Zapis {

	/**
	 * Ustawia (lub odświeża) powiązanie kursu z produktem WooCommerce.
	 *
	 * Idempotentne: ten sam wpis drugi raz tylko odświeża `sync_ts`.
	 * Zmiana produktu dla istniejącego kursu przechodzi przez UPDATE
	 * po kluczu głównym — a gdyby nowy produkt był już powiązany
	 * z INNYM kursem, UNIQUE na `product_id` odmówi zapisu i metoda
	 * odda `false`: jeden produkt sprzedaje najwyżej jeden kurs,
	 * „weź pierwszy" nie istnieje (B4).
	 *
	 * @param string $course_uuid Uuid kursu z tabel Pluginu 1.
	 * @param int    $product_id  Id wpisu produktu WooCommerce.
	 */
	public static function powiazanie_ustaw( string $course_uuid, int $product_id ): bool {
		global $wpdb;
		$tabela = Aai_Platnosci_Tabele::tabela( 'powiazania' );

		/*
		 * ŚWIADOMIE NIE `ON DUPLICATE KEY UPDATE`: ten zapis reaguje na
		 * konflikt KAŻDEGO klucza unikalnego, więc próba powiązania
		 * zajętego produktu z drugim kursem „aktualizowałaby" CUDZY
		 * wiersz i meldowała sukces — dokładnie klasa „weź pierwszy"
		 * z B4. Złapane smoke'iem przy P1. Zamiast tego: jawny UPDATE
		 * po własnym kluczu albo czysty INSERT; konflikt UNIQUE
		 * w którymkolwiek = odmowa, nigdy cicha podmiana.
		 */
		$teraz = current_time( 'mysql', true );

		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- nazwa tabeli z klasy tabel.
		$jest = $wpdb->get_var(
			$wpdb->prepare( "SELECT course_uuid FROM {$tabela} WHERE course_uuid = %s", $course_uuid )
		);

		$cicho = $wpdb->suppress_errors( true );
		if ( null !== $jest ) {
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- nazwa tabeli z klasy tabel.
			$wynik = $wpdb->query(
				$wpdb->prepare(
					"UPDATE {$tabela} SET product_id = %d, sync_ts = %s WHERE course_uuid = %s",
					$product_id,
					$teraz,
					$course_uuid
				)
			);
		} else {
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- nazwa tabeli z klasy tabel.
			$wynik = $wpdb->query(
				$wpdb->prepare(
					"INSERT INTO {$tabela} (course_uuid, product_id, sync_ts) VALUES (%s, %d, %s)",
					$course_uuid,
					$product_id,
					$teraz
				)
			);
		}
		$wpdb->suppress_errors( $cicho );

		return false !== $wynik;
	}

	/**
	 * Usuwa powiązanie kursu. Produkt zostaje (nigdy go nie kasujemy) —
	 * o jego statusie decyduje osobno logika stanów z sekcji 9.3 schematu.
	 *
	 * @param string $course_uuid Uuid kursu.
	 */
	public static function powiazanie_usun( string $course_uuid ): void {
		global $wpdb;
		$wpdb->delete(
			Aai_Platnosci_Tabele::tabela( 'powiazania' ),
			array( 'course_uuid' => $course_uuid ),
			array( '%s' )
		);
	}

	/**
	 * Odnotowuje zdarzenie dostarczenia — ATOMOWO.
	 *
	 * `true` = ten przebieg jest PIERWSZY i wolno mu działać (wysłać
	 * mail); `false` = ktoś już był. Rozstrzyga UNIQUE na parze
	 * (zdarzenie, identyfikator): dwa równoległe przebiegi nie
	 * przeczytają zgodnie „nie było", bo nie ma tu żadnego odczytu —
	 * jest jeden INSERT, który w bazie może wygrać tylko raz (B6).
	 *
	 * `INSERT IGNORE` połyka wyłącznie konflikt klucza w tabeli
	 * o schemacie z kodu (kolumny i typy nasze, wartości przez
	 * `prepare`), więc „0 wierszy" znaczy tu dokładnie „duplikat".
	 *
	 * @param string $zdarzenie     Np. `mail_konta`, `mail_kursu`, `dostep`.
	 * @param int    $identyfikator Id użytkownika (mail konta) albo zamówienia.
	 * @param string $wynik         Krótki opis rezultatu (np. wynik wp_mail).
	 */
	public static function dostawa_odnotuj( string $zdarzenie, int $identyfikator, string $wynik = '' ): bool {
		global $wpdb;
		$tabela = Aai_Platnosci_Tabele::tabela( 'dostawy' );

		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- nazwa tabeli z klasy tabel.
		$dodane = $wpdb->query(
			$wpdb->prepare(
				"INSERT IGNORE INTO {$tabela} (zdarzenie, identyfikator, wynik, created_at)
				VALUES (%s, %d, %s, %s)",
				$zdarzenie,
				$identyfikator,
				$wynik,
				current_time( 'mysql', true )
			)
		);

		return 1 === $dodane;
	}

	/**
	 * Dopisuje rezultat do JUŻ odnotowanego zdarzenia (np. wynik
	 * `wp_mail()` znany dopiero po wysyłce). Nie tworzy wiersza —
	 * od tworzenia jest `dostawa_odnotuj()`.
	 *
	 * @param string $zdarzenie     Zdarzenie.
	 * @param int    $identyfikator Identyfikator.
	 * @param string $wynik         Rezultat.
	 */
	public static function dostawa_wynik( string $zdarzenie, int $identyfikator, string $wynik ): void {
		global $wpdb;
		$wpdb->update(
			Aai_Platnosci_Tabele::tabela( 'dostawy' ),
			array( 'wynik' => $wynik ),
			array(
				'zdarzenie'     => $zdarzenie,
				'identyfikator' => $identyfikator,
			),
			array( '%s' ),
			array( '%s', '%d' )
		);
	}

	/**
	 * Przestawia wszystkie produkty z `powiazania` na `draft` —
	 * deaktywacja wtyczki (L4). Kasowania nie ma: produkt kupiony jest
	 * częścią historii zamówień (niezmiennik 13); `draft` wystarcza,
	 * żeby `?add-to-cart` przestał działać.
	 *
	 * `Throwable` łapany per produkt: deaktywacja ma zejść do końca
	 * listy nawet wtedy, gdy jeden wpis jest uszkodzony — inaczej
	 * reszta produktów zostaje kupowalna bez jednego objawu.
	 */
	public static function produkty_na_szkic(): void {
		global $wpdb;
		$tabela = Aai_Platnosci_Tabele::tabela( 'powiazania' );

		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- nazwa tabeli z klasy tabel.
		$produkty = $wpdb->get_col( "SELECT product_id FROM {$tabela}" );

		foreach ( $produkty as $product_id ) {
			try {
				$wpis = get_post( (int) $product_id );
				if ( $wpis && 'product' === $wpis->post_type && 'draft' !== $wpis->post_status ) {
					wp_update_post(
						array(
							'ID'          => (int) $product_id,
							'post_status' => 'draft',
						)
					);
				}
			} catch ( Throwable $e ) {
				// Celowo bez ponownego rzucenia — patrz komentarz metody.
				continue;
			}
		}
	}
}
