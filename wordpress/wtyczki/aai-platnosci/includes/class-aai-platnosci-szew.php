<?php
/**
 * Słuchacze zdarzeń Pluginu 1 — WYSTRZAŁ Pluginu 2.
 *
 * Priorytet 20, bo kopia Pluginu 1 do Tutora (`Aai_Sklep_Tutor`) wisi na
 * 10 — wchodzimy PO niej i zastajemy wpis kursu w Tutorze już zrobiony
 * (U2 z krytyki P0: nowa akcja w Pluginie 1 jest niepotrzebna). Gdyby ktoś
 * przestawił priorytet Tutora na ≥ 20, krok powiązania sam wykryje brak
 * wpisu i zdegraduje się do produktu `draft` — kontrola o tym powie.
 *
 * KAŻDY słuchacz łapie `Throwable` (niezmiennik 17): wyjątek wyleciałby
 * przez `zapisz_kurs()` Pluginu 1 i właściciel zamiast „Kurs zapisany"
 * zobaczyłby błąd krytyczny, a import przerwałby cały przebieg. Awaria
 * kopii NIE cofa zapisu; błąd jedzie do opcji i na ekran kokpitu (L14).
 *
 * @package Aai_Platnosci
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Rejestracja i obsługa zdarzeń.
 */
final class Aai_Platnosci_Szew {

	/**
	 * Podpina słuchaczy.
	 */
	public static function zarejestruj(): void {
		add_action( 'aai_sklep_kurs_zmieniony', array( self::class, 'na_zmianie' ), 20, 1 );
		add_action( 'aai_sklep_kurs_usuniety', array( self::class, 'na_usunieciu' ), 20, 1 );
		// B13: cudzy zapis produktu (masowa edycja, REST, wc_scheduled_sales)
		// kasuje `_tutor_product` — przywracamy PO handlerze Tutora (prio 20).
		add_action( 'save_post_product', array( self::class, 'na_zapisie_produktu' ), 20, 1 );
	}

	/**
	 * Kurs zapisany w kreatorze albo imporcie.
	 *
	 * @param string $id Uuid kursu.
	 */
	public static function na_zmianie( string $id ): void {
		try {
			$w = Aai_Platnosci_Zapis::synchronizuj_kurs( $id );
			if ( array() === $w['uwagi'] ) {
				Aai_Platnosci_Komunikaty::wyczysc( $id );
			} else {
				Aai_Platnosci_Komunikaty::zapisz( implode( '; ', $w['uwagi'] ), $id );
			}
		} catch ( Throwable $e ) {
			Aai_Platnosci_Komunikaty::zapisz( $e->getMessage(), $id );
		}
	}

	/**
	 * Kurs usunięty.
	 *
	 * @param string $id Uuid kursu.
	 */
	public static function na_usunieciu( string $id ): void {
		try {
			Aai_Platnosci_Zapis::zdejmij_kurs( $id );
			Aai_Platnosci_Komunikaty::wyczysc( $id );
		} catch ( Throwable $e ) {
			Aai_Platnosci_Komunikaty::zapisz( $e->getMessage(), $id );
		}
	}

	/**
	 * Każdy zapis wpisu produktu — przywrócenie znaczników (B13).
	 *
	 * @param int $post_id Id wpisu.
	 */
	public static function na_zapisie_produktu( int $post_id ): void {
		try {
			Aai_Platnosci_Zapis::przywroc_znaczniki( $post_id );
		} catch ( Throwable $e ) {
			Aai_Platnosci_Komunikaty::zapisz( $e->getMessage() );
		}
	}
}
