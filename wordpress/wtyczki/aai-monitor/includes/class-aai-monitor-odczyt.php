<?php
/**
 * Kanał JSON — odczyt serwerowy dla ekranu. NIGDY nie pisze (N16).
 *
 * Rozdzielenie ról przeniesione z Pluginu 2 (L11 z krytyki P0): klasa,
 * która czyta, nie ma prawa niczego naprawiać. Naprawy robi wyłącznie
 * warstwa zapisu — inaczej „sprawdzenie stanu" zmieniałoby stan, który
 * sprawdza, a nikt by nie wiedział, co było przed nim.
 *
 * Ekran nigdy nie rozmawia z bazą; oba kanały (ten i wystrzał) przechodzą
 * przez dział. Ten oddaje gotowe AGREGATY, nie surowe wiersze — poza
 * jedną listą ostatnich logowań, która jest treścią ekranu.
 *
 * @package Aai_Monitor
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Zapytania agregujące dla ekranu i kontroli.
 */
final class Aai_Monitor_Odczyt {

	/**
	 * Podsumowanie obu tabel — jeden agregat, którym żyje ekran.
	 *
	 * @return array{
	 *     logowania: array{razem:int, udane:int, nieudane:int, porazki_7dni:int, ostatnie:string},
	 *     wizyty: array{razem:int, sesje:int, ostatnia:string}
	 * }
	 */
	public static function podsumowanie(): array {
		global $wpdb;

		$puste = array(
			'logowania' => array(
				'razem'        => 0,
				'udane'        => 0,
				'nieudane'     => 0,
				'porazki_7dni' => 0,
				'ostatnie'     => '',
			),
			'wizyty'    => array(
				'razem'    => 0,
				'sesje'    => 0,
				'ostatnia' => '',
			),
		);

		// Bez tabel nie ma czego liczyć — a zapytanie do nieistniejącej
		// tabeli zostawiłoby błąd w logu MySQL przy każdej odsłonie ekranu.
		if ( ! Aai_Monitor_Tabele::istnieja() ) {
			return $puste;
		}

		$l = Aai_Monitor_Tabele::tabela( 'logowania' );
		$w = Aai_Monitor_Tabele::tabela( 'wizyty' );

		$granica = current_datetime()
			->setTimezone( new DateTimeZone( 'UTC' ) )
			->modify( '-7 days' )
			->format( 'Y-m-d H:i:s' );

		// Nazwy tabel to identyfikatory z klasy tabel; jedyna wartość
		// (granica 7 dni) idzie przez `prepare()`.
		$logowania = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT
					COUNT(*) AS razem,
					SUM( CASE WHEN zdarzenie = 'udane' THEN 1 ELSE 0 END ) AS udane,
					SUM( CASE WHEN zdarzenie = 'nieudane' THEN 1 ELSE 0 END ) AS nieudane,
					SUM( CASE WHEN zdarzenie = 'nieudane' AND czas >= %s THEN 1 ELSE 0 END ) AS porazki_7dni,
					MAX( czas ) AS ostatnie
				FROM `{$l}`",
				$granica
			),
			ARRAY_A
		); // phpcs:ignore WordPress.DB.PreparedSQL

		$wizyty = $wpdb->get_row(
			"SELECT COUNT(*) AS razem, COUNT( DISTINCT sesja ) AS sesje, MAX( wejscie ) AS ostatnia FROM `{$w}`",
			ARRAY_A
		); // phpcs:ignore WordPress.DB.PreparedSQL,WordPress.DB.DirectDatabaseQuery

		return array(
			'logowania' => array(
				'razem'        => (int) ( $logowania['razem'] ?? 0 ),
				'udane'        => (int) ( $logowania['udane'] ?? 0 ),
				'nieudane'     => (int) ( $logowania['nieudane'] ?? 0 ),
				'porazki_7dni' => (int) ( $logowania['porazki_7dni'] ?? 0 ),
				'ostatnie'     => (string) ( $logowania['ostatnie'] ?? '' ),
			),
			'wizyty'    => array(
				'razem'    => (int) ( $wizyty['razem'] ?? 0 ),
				'sesje'    => (int) ( $wizyty['sesje'] ?? 0 ),
				'ostatnia' => (string) ( $wizyty['ostatnia'] ?? '' ),
			),
		);
	}

	/**
	 * Ruch w oknie czasu — treść drugiej sekcji ekranu.
	 *
	 * OKNO LICZY SIĘ OD PÓŁNOCY CZASU WITRYNY, nie od północy UTC i nie
	 * „24 godziny wstecz". W warsztacie `gmt_offset = 0`, więc różnica
	 * jest tu NIEWIDOCZNA i wyszłaby dopiero na produkcji: w strefie
	 * Europe/Warsaw doba zaczynałaby się o 02:00, a odsłony z pierwszych
	 * dwóch godzin dnia trafiałyby do „wczoraj". Kolumny trzymamy w UTC,
	 * więc granicę wyliczamy lokalnie i PRZELICZAMY na UTC.
	 *
	 * ODSŁONY BRAMKI LICZĄ SIĘ OSOBNO (A6 z przeglądu T3). Gość na płatnej
	 * lekcji dostaje HTTP 200 i pełną stronę — tyle że z zaproszeniem do
	 * logowania zamiast treści. Wrzucone do jednego worka zawyżałyby
	 * „najczęściej czytane strony" o lekcje, których nikt nie przeczytał,
	 * a wyrzucone z tabeli skasowałyby jedyny ślad po kimś, kto chciał
	 * wejść i nie mógł. Więc: lista czytanych stron bierze wyłącznie
	 * odsłony TREŚCI, a odbicia mają własną liczbę i własną listę.
	 *
	 * @param int $dni Ile dób wstecz (1 = dzisiaj od północy).
	 * @return array{odslony:int, sesje:int, bramka:int, laczny_ms:int, sredni_ms:int, strony:array<int,array<string,mixed>>, strony_bramki:array<int,array<string,mixed>>}
	 */
	public static function ruch( int $dni = 1 ): array {
		global $wpdb;

		$puste = array(
			'odslony'       => 0,
			'sesje'         => 0,
			'bramka'        => 0,
			'laczny_ms'     => 0,
			'sredni_ms'     => 0,
			'strony'        => array(),
			'strony_bramki' => array(),
		);
		if ( ! Aai_Monitor_Tabele::istnieja() ) {
			return $puste;
		}

		$granica = self::granica_okna( $dni );
		$w       = Aai_Monitor_Tabele::tabela( 'wizyty' );

		// Zapytania stoją tu DOSŁOWNIE, przy swoim `prepare()` — SQL
		// sklejony ze zmiennej jest niewidzialny dla `straznik-wtyczki-wp`
		// (jego reguła czyta łańcuch podany wprost do `$wpdb->`).
		$suma = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT
					COUNT(*) AS odslony,
					COUNT( DISTINCT sesja ) AS sesje,
					COALESCE( SUM( CASE WHEN bramka = 1 THEN 1 ELSE 0 END ), 0 ) AS bramka,
					COALESCE( SUM( trwanie_ms ), 0 ) AS laczny,
					COALESCE( AVG( trwanie_ms ), 0 ) AS sredni
				FROM `{$w}` WHERE wejscie >= %s",
				$granica
			),
			ARRAY_A
		); // phpcs:ignore WordPress.DB.PreparedSQL

		// Indeks pod to zapytanie ROZWAŻONY I ODRZUCONY pomiarem przy T3:
		// na 200 000 wierszy kosztuje 50 ms bez indeksu i 28 ms z indeksem
		// pokrywającym, a ten drugi czyni zapis 2,9× droższym i zajmuje
		// 33 MB. Beacon jest najczęstszym zapisem tego modułu.
		$strony = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT sciezka, COUNT(*) AS odslony, COALESCE( AVG( trwanie_ms ), 0 ) AS sredni
				FROM `{$w}` WHERE wejscie >= %s AND bramka = 0
				GROUP BY sciezka ORDER BY odslony DESC, sciezka ASC LIMIT 10",
				$granica
			),
			ARRAY_A
		); // phpcs:ignore WordPress.DB.PreparedSQL

		// Krótsza lista, bo odpowiada na węższe pytanie: czego ludzie
		// chcieli, a nie dostali.
		$bramki = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT sciezka, COUNT(*) AS odslony, COALESCE( AVG( trwanie_ms ), 0 ) AS sredni
				FROM `{$w}` WHERE wejscie >= %s AND bramka = 1
				GROUP BY sciezka ORDER BY odslony DESC, sciezka ASC LIMIT 5",
				$granica
			),
			ARRAY_A
		); // phpcs:ignore WordPress.DB.PreparedSQL

		return array(
			'odslony'       => (int) ( $suma['odslony'] ?? 0 ),
			'sesje'         => (int) ( $suma['sesje'] ?? 0 ),
			'bramka'        => (int) ( $suma['bramka'] ?? 0 ),
			'laczny_ms'     => (int) ( $suma['laczny'] ?? 0 ),
			'sredni_ms'     => (int) round( (float) ( $suma['sredni'] ?? 0 ) ),
			'strony'        => is_array( $strony ) ? $strony : array(),
			'strony_bramki' => is_array( $bramki ) ? $bramki : array(),
		);
	}

	/**
	 * Granica okna: północ czasu WITRYNY sprzed `$dni - 1` dób, w UTC.
	 *
	 * @param int $dni Ile dób obejmuje okno (1 = dzisiaj).
	 */
	private static function granica_okna( int $dni ): string {
		$dni    = max( 1, $dni );
		$polnoc = current_datetime()->setTime( 0, 0, 0 );
		if ( $dni > 1 ) {
			$polnoc = $polnoc->modify( sprintf( '-%d days', $dni - 1 ) );
		}
		return $polnoc->setTimezone( new DateTimeZone( 'UTC' ) )->format( 'Y-m-d H:i:s' );
	}

	/**
	 * Najstarszy wiersz każdej tabeli — materiał dla kontroli retencji.
	 *
	 * Kontrola porównuje go do NAJNOWSZEGO wiersza, nie do zegara:
	 * retencja jest leniwa z definicji (biegnie przy zapisie i przy
	 * renderze ekranu), więc na cichej instalacji porównanie z zegarem
	 * dawałoby fałszywą czerwień i wywracało `postaw.sh` (C-3 z krytyki).
	 *
	 * @return array<string,array{najstarszy:string, najnowszy:string}>
	 */
	public static function zakresy(): array {
		global $wpdb;

		$wynik = array();
		if ( ! Aai_Monitor_Tabele::istnieja() ) {
			return $wynik;
		}

		// KAŻDE ZAPYTANIE STOI TU DOSŁOWNIE. Wersja z nazwą kolumny
		// w zmiennej była krótsza i słusznie odrzucona przez
		// `straznik-wtyczki-wp`: whitelistą są WYŁĄCZNIE nazwy tabel
		// z klasy tabel, a reguła nie ma jak sprawdzić, skąd wzięła się
		// nazwa kolumny. Kod ma być widoczny dla kontrolera.
		$l = Aai_Monitor_Tabele::tabela( 'logowania' );
		$w = Aai_Monitor_Tabele::tabela( 'wizyty' );

		$logowania = $wpdb->get_row(
			"SELECT MIN( `czas` ) AS najstarszy, MAX( `czas` ) AS najnowszy FROM `{$l}`",
			ARRAY_A
		); // phpcs:ignore WordPress.DB.PreparedSQL,WordPress.DB.DirectDatabaseQuery

		$wizyty = $wpdb->get_row(
			"SELECT MIN( `wejscie` ) AS najstarszy, MAX( `wejscie` ) AS najnowszy FROM `{$w}`",
			ARRAY_A
		); // phpcs:ignore WordPress.DB.PreparedSQL,WordPress.DB.DirectDatabaseQuery

		foreach ( array( 'logowania' => $logowania, 'wizyty' => $wizyty ) as $nazwa => $wiersz ) {
			$wynik[ $nazwa ] = array(
				'najstarszy' => (string) ( $wiersz['najstarszy'] ?? '' ),
				'najnowszy'  => (string) ( $wiersz['najnowszy'] ?? '' ),
			);
		}
		return $wynik;
	}

	/**
	 * Ostatnie logowania — treść pierwszej sekcji ekranu.
	 *
	 * @param int  $ile          Ile wierszy.
	 * @param bool $tylko_porazki Czy pokazać wyłącznie nieudane.
	 * @return array<int,array<string,mixed>>
	 */
	public static function logowania( int $ile = 20, bool $tylko_porazki = false ): array {
		global $wpdb;

		if ( ! Aai_Monitor_Tabele::istnieja() ) {
			return array();
		}
		$ile = max( 1, min( 200, $ile ) );
		$l   = Aai_Monitor_Tabele::tabela( 'logowania' );

		// Dwa dosłowne zapytania zamiast jednego składanego ze zmiennej:
		// reguła strażnika czyta łańcuch podany WPROST do `$wpdb->`,
		// więc SQL schowany w zmiennej przechodziłby bez sprawdzenia.
		$wiersze = $tylko_porazki
			? $wpdb->get_results(
				$wpdb->prepare( "SELECT * FROM `{$l}` WHERE zdarzenie = 'nieudane' ORDER BY czas DESC, id DESC LIMIT %d", $ile ),
				ARRAY_A
			) // phpcs:ignore WordPress.DB.PreparedSQL
			: $wpdb->get_results(
				$wpdb->prepare( "SELECT * FROM `{$l}` ORDER BY czas DESC, id DESC LIMIT %d", $ile ),
				ARRAY_A
			); // phpcs:ignore WordPress.DB.PreparedSQL

		return is_array( $wiersze ) ? $wiersze : array();
	}
}
