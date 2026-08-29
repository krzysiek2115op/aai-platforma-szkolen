<?php
/**
 * Cena, którą widzi klient — z WooCommerce, jednym wywołaniem.
 *
 * PODZIAŁ RÓL (decyzja właściciela 2026-08-26 i 2026-08-29). Nasza tabela
 * `courses.price_grosze` jest ŹRÓDŁEM ceny KATALOGOWEJ i to ona jedzie do
 * produktu jako cena regularna. Ale klient płaci cenę EFEKTYWNĄ — czyli
 * z promocją, jeśli właściciel ustawi ją w WooCommerce. Strona sprzedażowa
 * i katalog mają pokazywać dokładnie tę liczbę, którą zobaczy w kasie.
 *
 * DLACZEGO FILTREM, A NIE ODCZYTEM W PLUGINIE 1. Bo Plugin 1 nie ma prawa
 * wiedzieć o WooCommerce — to jest sklep kursów, który działa także bez
 * płatności (i tak działał przez cały krok W1–W6). Filtr `aai_sklep_cena_kursu`
 * jest jedynym szwem: bez tej wtyczki nikt go nie obsługuje i strona pokazuje
 * cenę katalogową, dokładnie jak dotąd.
 *
 * POLA CENY PROMOCYJNEJ NIE DOTYKAMY NIGDY (decyzja właściciela 2026-08-26) —
 * tu ją tylko CZYTAMY. Promocje, kupony, podatki i waluta zostają po stronie
 * WooCommerce, bo tam mają swoje mechanizmy.
 *
 * @package Aai_Platnosci
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Dostawca ceny efektywnej.
 */
final class Aai_Platnosci_Cena {

	/**
	 * Podpina filtr Pluginu 1.
	 */
	public static function zarejestruj(): void {
		add_filter( 'aai_sklep_cena_kursu', array( self::class, 'z_woo' ), 10, 2 );
	}

	/**
	 * Cena efektywna produktu kursu, w groszach.
	 *
	 * ODDAJE CENĘ KATALOGOWĄ BEZ ZMIAN, gdy czegokolwiek brakuje: kurs bez
	 * produktu (jeszcze niezsynchronizowany), produkt skasowany, WooCommerce
	 * wyłączone, cena pusta. Pusta cena w Woo to NIE jest „za darmo" — to
	 * brak danych, a wyświetlenie „0 zł" na stronie sprzedażowej byłoby
	 * gorsze niż pokazanie ceny katalogowej.
	 *
	 * @param int                 $katalogowa Cena z naszej tabeli (grosze).
	 * @param array<string,mixed> $kurs       Kurs z warstwy odczytu Pluginu 1.
	 * @return int
	 */
	public static function z_woo( $katalogowa, $kurs = array() ): int {
		$katalogowa = (int) $katalogowa;
		try {
			if ( ! is_array( $kurs ) || ! function_exists( 'wc_get_product' ) ) {
				return $katalogowa;
			}
			$uuid = (string) ( $kurs['id'] ?? '' );
			if ( '' === $uuid ) {
				return $katalogowa;
			}
			$produkt_id = Aai_Platnosci_Zapis::produkt_kursu( $uuid );
			if ( null === $produkt_id ) {
				return $katalogowa;
			}
			$produkt = wc_get_product( $produkt_id );
			if ( ! $produkt instanceof WC_Product ) {
				return $katalogowa;
			}
			/*
			 * `get_price()` bez `'edit'`, czyli cena EFEKTYWNA: WooCommerce
			 * liczy do niej promocję. Wariant `'edit'` oddałby cenę surową
			 * i promocja nigdy nie doszłaby na stronę — a to jest cała
			 * treść tej klasy.
			 */
			$cena = $produkt->get_price();
			if ( '' === $cena || null === $cena || ! is_numeric( $cena ) ) {
				return $katalogowa;
			}
			$grosze = (int) round( ( (float) $cena ) * 100 );
			return $grosze >= 0 ? $grosze : $katalogowa;
		} catch ( Throwable $e ) {
			// Niezmiennik 17: cena na stronie nie może wywrócić strony.
			// Bez odpowiedzi zostaje cena katalogowa — liczba prawdziwa,
			// tylko bez promocji.
			Aai_Platnosci_Komunikaty::zapisz( 'przy czytaniu ceny kursu: ' . $e->getMessage() );
			return $katalogowa;
		}
	}
}
