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

		/*
		 * ODPOWIEDŹ NA PYTANIE PLUGINU 1, nie zdarzenie. Plugin 1 przed
		 * usunięciem kursu musi wiedzieć, czy ktoś ma za niego złożone
		 * i jeszcze nieopłacone zamówienie — a o zamówieniach nie wie nic
		 * i wiedzieć nie ma prawa. Ta sama droga, którą jadą cena i CTA.
		 */
		add_filter( 'aai_sklep_zamowienia_w_drodze', array( self::class, 'zamowienia_w_drodze' ), 10, 2 );
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
				/*
				 * UDANA SYNCHRONIZACJA UNIEWAŻNIA UWAGĘ OGÓLNĄ (MAR-A-14).
				 *
				 * Aktywacja bez Pluginu 1 zapisuje pod `_ogolny` uwagę
				 * „brak Pluginu 1 — nie ma czego synchronizować". Kasowało
				 * ją TYLKO ręczne `wp aai-platnosci sync`, więc po powrocie
				 * Pluginu 1 kontrola świeciła kodem 1, a kokpit straszył
				 * właściciela — przy produktach już opublikowanych
				 * i sprzedaży działającej. Skoro właśnie zsynchronizowaliśmy
				 * kurs, to zdanie jest po prostu nieprawdziwe: alarm, który
				 * nie umie zgasnąć, uczy, żeby mu nie ufać (MAR-A-08).
				 */
				Aai_Platnosci_Komunikaty::wyczysc();
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
	 * Ile ZŁOŻONYCH, a jeszcze niedostarczonych zamówień dotyczy tego kursu.
	 *
	 * DLACZEGO TO NIE JEST TO SAMO, CO LICZBA KUPUJĄCYCH. Kupujących liczy
	 * Tutor po zapisach `completed`, czyli po ludziach, którzy dostęp JUŻ
	 * MAJĄ. Klient płacący przelewem nie ma go przez te dni ani przez chwilę:
	 * jego zapis stoi na `pending`, więc dla tamtej miary jest niewidzialny.
	 * Usunięcie kursu w tym oknie przechodziło więc z komunikatem
	 * „0 kupujących", a klient po zaksięgowaniu wpłaty dostawał NIC —
	 * zapłacone pieniądze bez produktu (znalezisko testu całości).
	 *
	 * To są dwie różne straty i dlatego są dwa różne pytania: tam ktoś
	 * TRACI dostęp, tu ktoś ZAPŁACI i go nie dostanie.
	 *
	 * Statusy bierzemy te same, którymi `Aai_Platnosci_Posiadanie` rozpoznaje
	 * „zamówienie w toku" — jedna definicja „w drodze" w całej wtyczce.
	 *
	 * PRZY BŁĘDZIE ODDAJEMY -1, czyli „nie wiem". Plugin 1 traktuje to jak
	 * powód do zapytania, a nie jak zero: przy nieznanym stanie odmawiamy,
	 * tak samo jak blokada koszyka przy wyjątku (B10). Cisza znaczyłaby tu
	 * zgodę na skasowanie cudzego, opłacanego właśnie zakupu.
	 *
	 * @param mixed  $ile         Wartość wejściowa filtru (Plugin 1 podaje 0).
	 * @param string $course_uuid Identyfikator kursu z tabel Pluginu 1.
	 * @return int Liczba zamówień w drodze, albo -1 gdy nie dało się sprawdzić.
	 */
	public static function zamowienia_w_drodze( $ile, string $course_uuid = '' ): int {
		try {
			if ( '' === trim( $course_uuid ) || ! function_exists( 'wc_get_orders' ) ) {
				return (int) $ile;
			}
			$product_id = Aai_Platnosci_Zapis::produkt_kursu( $course_uuid );
			if ( null === $product_id ) {
				// Kurs nigdy nie miał produktu — nie ma czego kupować, więc
				// nie ma zamówień. To jest zero ZMIERZONE, nie domyślne.
				return 0;
			}

			$mapa = self::mapa_zamowien_w_drodze();
			return $mapa[ (int) $product_id ] ?? 0;
		} catch ( Throwable $e ) {
			Aai_Platnosci_Komunikaty::zapisz( $e->getMessage(), $course_uuid );
			return -1;
		}
	}

	/**
	 * Produkt → ile zamówień w drodze go zawiera. Liczone RAZ NA ŻĄDANIE.
	 *
	 * Lista kursów w kokpicie pyta o to raz na kurs, a odpowiedź wymaga
	 * przejrzenia wszystkich trwających zamówień. Bez tej pamięci sklep
	 * z setkami zamówień płaciłby za każdy wiersz listy osobno — ta sama
	 * klasa kosztu, którą naprawiono przy W6 (menu za 90 zapytań).
	 *
	 * Pamięć żyje tylko przez jedno żądanie: usunięcie kursu i rysowanie
	 * listy to dwa różne żądania, więc świeżość jest zachowana tam, gdzie
	 * ma znaczenie.
	 *
	 * @return array<int,int> Klucz: id produktu. Wartość: liczba zamówień.
	 */
	private static function mapa_zamowien_w_drodze(): array {
		static $mapa = null;
		if ( is_array( $mapa ) ) {
			return $mapa;
		}
		$mapa = array();
		$zamowienia = wc_get_orders(
			array(
				'limit'  => -1,
				'return' => 'ids',
				'status' => Aai_Platnosci_Posiadanie::ZAMOWIENIE_TRWA,
			)
		);
		foreach ( (array) $zamowienia as $id_zamowienia ) {
			$order = wc_get_order( $id_zamowienia );
			if ( ! $order instanceof WC_Order ) {
				continue;
			}
			$policzone = array();
			foreach ( $order->get_items() as $pozycja ) {
				if ( ! $pozycja instanceof WC_Order_Item_Product ) {
					continue;
				}
				$pid = (int) $pozycja->get_product_id();
				// Jedno zamówienie liczy się do danego produktu RAZ, choćby
				// miało go w dwóch pozycjach — liczymy zamówienia, nie sztuki.
				if ( isset( $policzone[ $pid ] ) ) {
					continue;
				}
				$policzone[ $pid ] = true;
				$mapa[ $pid ]      = ( $mapa[ $pid ] ?? 0 ) + 1;
			}
		}
		return $mapa;
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
