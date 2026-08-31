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
		add_action( 'aai_sklep_kurs_usuniety', array( self::class, 'na_usunieciu' ), 20, 2 );
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
	 * Produktu NIE KASUJEMY (niezmiennik 13) — zostaje sierotą, którą
	 * sprząta człowiek. Zapisujemy jednak na nim, ilu ludzi straciło razem
	 * z kursem dostęp: sierota po kursie testowym to śmieć, a sierota po
	 * kursie, za który ktoś zapłacił, to sprawa dla właściciela. Po
	 * usunięciu tej liczby nie da się już odtworzyć, bo zapisy znikają
	 * razem z kopią kursu w Tutorze.
	 *
	 * Wartość domyślna parametru nie jest ozdobą: ta metoda wisi na cudzej
	 * akcji, a callback wołany z jednym argumentem rzuciłby wtedy
	 * `ArgumentCountError` PRZY WYWOŁANIU, czyli poza naszym `try`
	 * (lekcja z przeglądu T2).
	 *
	 * @param string $id       Uuid kursu.
	 * @param int    $kupujacy Ilu ludzi miało dostęp w chwili usunięcia.
	 */
	public static function na_usunieciu( string $id, int $kupujacy = 0 ): void {
		try {
			Aai_Platnosci_Zapis::zdejmij_kurs( $id );
			// PO zdjęciu, nie przed: zdejmowanie przywraca znaczniki produktu.
			Aai_Platnosci_Zapis::oznacz_utracony_dostep( $id, $kupujacy );
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
