<?php
/**
 * Schemat tabel wtyczki — BAZA Pluginu 2.
 *
 * DWIE tabele i ani jednej więcej (decyzja właściciela 2026-08-26):
 * klientów, zamówienia i płatności trzyma WooCommerce, dostęp do
 * materiału trzyma Tutor. Nasze tabele trzymają wyłącznie to, czego
 * nie wie ani jeden, ani drugi:
 *
 *  - `powiazania` — który produkt WooCommerce sprzedaje który kurs
 *    (dopasowanie WYŁĄCZNIE tędy: `_aai_zrodlo_uuid` siedzi już na
 *    90 wpisach Tutora, więc skan postmeta rozstrzyga losowo — B4),
 *  - `dostawy` — czy klient naprawdę DOSTAŁ to, za co zapłacił
 *    (mail konta, mail kursu, dostęp). UNIQUE na parze
 *    (zdarzenie, identyfikator) daje ATOMOWĄ idempotencję: INSERT
 *    wygrywa albo przegrywa, przegrany nie wysyła maila drugi raz.
 *    Cudzy hak potrafi pobiec rekurencyjnie (`mark_order_complete()`
 *    woła zmianę statusu wewnątrz obsługi zmiany statusu — B6),
 *    a `wp_wc_orders_meta` nie ma UNIQUE, więc znacznik musi mieszkać
 *    u nas.
 *
 * @package Aai_Platnosci
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Tworzenie i utrzymanie tabel.
 */
final class Aai_Platnosci_Tabele {

	/**
	 * Opcja z wersją schematu — po niej poznajemy, że trzeba dociągnąć zmiany.
	 */
	private const OPCJA_WERSJI = 'aai_platnosci_wersja_schematu';

	/**
	 * Pełna nazwa tabeli z prefiksem instalacji i prefiksem wtyczki.
	 *
	 * @param string $nazwa Nazwa bez prefiksów, np. `powiazania`.
	 */
	public static function tabela( string $nazwa ): string {
		global $wpdb;
		return $wpdb->prefix . AAI_PLATNOSCI_PREFIKS . $nazwa;
	}

	/**
	 * Wszystkie nasze tabele — jedno miejsce, z którego korzystają
	 * `uninstall.php`, kontrola i smoke.
	 *
	 * @return string[]
	 */
	public static function wszystkie(): array {
		return array_map(
			array( self::class, 'tabela' ),
			array( 'powiazania', 'dostawy' )
		);
	}

	/**
	 * Tworzy schemat. Wołane przy aktywacji wtyczki; `dbDelta` jest
	 * idempotentne, więc druga aktywacja niczego nie psuje.
	 */
	public static function utworz(): void {
		global $wpdb;

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		// Kolacja instalacji — bez niej `JOIN` z tabelami WordPressa
		// wywala się na „Illegal mix of collations" (ta sama uwaga
		// co przy tabelach `aai-sklep`).
		$kolacja = $wpdb->get_charset_collate();

		$p = self::tabela( 'powiazania' );
		$d = self::tabela( 'dostawy' );

		/*
		 * `powiazania`: klucz główny to uuid kursu (jeden kurs = najwyżej
		 * jeden produkt), a `product_id` ma własny UNIQUE (jeden produkt
		 * = najwyżej jeden kurs). `sync_ts` to znacznik czasu ostatniej
		 * udanej kopii — po nim kontrola odróżnia „w trakcie" od
		 * „zepsute" (B15).
		 *
		 * `dostawy`: dziennik zdarzeń dostarczenia. `zdarzenie` mówi CO
		 * (`mail_konta`, `mail_kursu`, `dostep`), `identyfikator` mówi
		 * KOMU/ZA CO (id użytkownika dla maila konta, id zamówienia dla
		 * reszty — patrz sekcja 5.2 schematu). `wynik` niesie m.in.
		 * rezultat `wp_mail()`, bo ten pada po cichu (B8).
		 */
		dbDelta(
			"CREATE TABLE {$p} (
				course_uuid char(36) NOT NULL,
				product_id bigint(20) unsigned NOT NULL,
				sync_ts datetime NULL,
				PRIMARY KEY  (course_uuid),
				UNIQUE KEY produkt (product_id)
			) {$kolacja};"
		);

		dbDelta(
			"CREATE TABLE {$d} (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				zdarzenie varchar(32) NOT NULL,
				identyfikator bigint(20) unsigned NOT NULL,
				wynik varchar(191) NOT NULL DEFAULT '',
				created_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY zdarzenie_cel (zdarzenie,identyfikator)
			) {$kolacja};"
		);

		update_option( self::OPCJA_WERSJI, AAI_PLATNOSCI_WERSJA, false );
	}

	/**
	 * Dociąga zmiany schematu po aktualizacji wtyczki — bez wołania
	 * `dbDelta` przy każdym żądaniu.
	 */
	public static function dociagnij_schemat(): void {
		if ( get_option( self::OPCJA_WERSJI ) !== AAI_PLATNOSCI_WERSJA ) {
			self::utworz();
		}
	}

	/**
	 * Czy obie tabele istnieją w bazie — pytanie kontroli, nie założenie.
	 */
	public static function istnieja(): bool {
		global $wpdb;
		foreach ( self::wszystkie() as $tabela ) {
			// Nazwa tabeli jest identyfikatorem z kodu (prefiks instalacji
			// + stała wtyczki) — do `prepare` idzie jako WARTOŚĆ dla LIKE.
			$jest = $wpdb->get_var(
				$wpdb->prepare( 'SHOW TABLES LIKE %s', $tabela )
			);
			if ( $jest !== $tabela ) {
				return false;
			}
		}
		return true;
	}
}
