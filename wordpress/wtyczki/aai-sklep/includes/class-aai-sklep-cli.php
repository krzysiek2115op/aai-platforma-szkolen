<?php
/**
 * Komendy WP-CLI wtyczki.
 *
 * PO CO WP-CLI, A NIE EKRAN W KOKPICIE. Import kursów to operacja
 * wdrożeniowa: robi się ją raz przy przenosinach i potem przy każdej
 * większej poprawce treści, zwykle po SSH, i musi dać się powtórzyć
 * w skrypcie. Ekran w panelu przyjdzie z kreatorem (krok W4) i będzie
 * o czym innym — o codziennej pracy nad kursem.
 *
 * @package Aai_Sklep
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Obsługa kursów Automatic AI z wiersza poleceń.
 */
final class Aai_Sklep_Cli {

	/**
	 * Wgrywa kursy z pliku eksportu do tabel wtyczki.
	 *
	 * Idempotentnie: powtórzenie tej samej komendy nie duplikuje niczego
	 * i nie rusza wierszy, które się nie zmieniły.
	 *
	 * ## OPTIONS
	 *
	 * <plik>
	 * : Ścieżka do pliku JSON z `tools/eksport-wp.mjs` (format 2).
	 *
	 * [--aktor=<aktor>]
	 * : Kto zapisuje — trafia do dziennika audytu.
	 * ---
	 * default: import-postgres
	 * ---
	 *
	 * [--pozwol-skasowac-tresc]
	 * : Zgoda na usunięcie lekcji, które mają NAPISANĄ TREŚĆ, a których
	 * nie ma w pliku. Bez tej flagi import odmawia i podaje ich liczbę.
	 *
	 * [--format=<format>]
	 * : Postać wyniku. `json` jest dla skryptów — liczniki wyciągane
	 * z ludzkiego komunikatu wyrażeniem regularnym zaczynają kłamać przy
	 * pierwszej poprawce brzmienia.
	 * ---
	 * default: podsumowanie
	 * options:
	 *   - podsumowanie
	 *   - json
	 * ---
	 *
	 * ## EXAMPLES
	 *
	 *     wp aai-sklep import /tmp/kursy.json
	 *
	 * @param string[]              $args       Argumenty pozycyjne.
	 * @param array<string,string>  $assoc_args Argumenty nazwane.
	 */
	public function import( array $args, array $assoc_args ): void {
		$plik   = (string) ( $args[0] ?? '' );
		$aktor  = (string) ( $assoc_args['aktor'] ?? 'import-postgres' );
		$pozwol = isset( $assoc_args['pozwol-skasowac-tresc'] );

		$przed = Aai_Sklep_Raport::liczniki_tabel();

		try {
			$wynik = Aai_Sklep_Import::z_pliku( $plik, $aktor, $pozwol );
		} catch ( Aai_Sklep_Blad_Zapisu $blad ) {
			WP_CLI::error( $blad->getMessage() );
			return;
		}

		$po = Aai_Sklep_Raport::liczniki_tabel();

		if ( 'json' === ( $assoc_args['format'] ?? 'podsumowanie' ) ) {
			WP_CLI::line(
				(string) wp_json_encode(
					array(
						'liczniki'  => $wynik['liczniki'],
						'kursy'     => $wynik['kursy'],
						'changelog' => array(
							'przed' => $przed['changelog'],
							'po'    => $po['changelog'],
						),
					),
					JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
				)
			);
			return;
		}

		foreach ( $wynik['kursy'] as $kurs ) {
			WP_CLI::log( sprintf( '  %s: %s', $kurs['slug'], self::liczniki_tekstem( $kurs['liczniki'] ) ) );
		}

		WP_CLI::log(
			sprintf(
				'  dziennik audytu: %d → %d wierszy',
				$przed['changelog'],
				$po['changelog']
			)
		);

		WP_CLI::success( 'Import: ' . self::liczniki_tekstem( $wynik['liczniki'] ) );
	}

	/**
	 * Oddaje stan naszych tabel — materiał do porównania z prototypem.
	 *
	 * Sam niczego nie ocenia: ocenia `tools/sprawdz-import-wp.mjs`, bo
	 * tylko on ma dostęp do DRUGIEJ bazy. Werdykt wydany po jednej stronie
	 * nie jest dowodem zgodności.
	 *
	 * ## OPTIONS
	 *
	 * [--format=<format>]
	 * : Postać wyniku.
	 * ---
	 * default: podsumowanie
	 * options:
	 *   - podsumowanie
	 *   - json
	 * ---
	 *
	 * ## EXAMPLES
	 *
	 *     wp aai-sklep sprawdz --format=json
	 *
	 * @param string[]             $args       Argumenty pozycyjne.
	 * @param array<string,string> $assoc_args Argumenty nazwane.
	 */
	public function sprawdz( array $args, array $assoc_args ): void {
		unset( $args );
		$stan = Aai_Sklep_Raport::stan();

		if ( 'json' === ( $assoc_args['format'] ?? 'podsumowanie' ) ) {
			// Bez `pretty`: to wejście dla skryptu, nie dla oka, a plik
			// z 73 lekcjami i tak nie nadaje się do czytania w terminalu.
			WP_CLI::line( (string) wp_json_encode( $stan, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) );
			return;
		}

		foreach ( $stan['tabele'] as $nazwa => $ile ) {
			WP_CLI::log( sprintf( '  %-10s %d', $nazwa, $ile ) );
		}
		foreach ( $stan['kursy'] as $kurs ) {
			$lekcji = 0;
			$znakow = 0;
			foreach ( $kurs['moduly'] as $modul ) {
				$lekcji += count( $modul['lekcje'] );
				foreach ( $modul['lekcje'] as $lekcja ) {
					$znakow += $lekcja['znakow_php'];
				}
			}
			WP_CLI::log(
				sprintf(
					'  %s: %d modułów, %d lekcji, %d sekcji, %s znaków treści, status %s',
					$kurs['slug'],
					count( $kurs['moduly'] ),
					$lekcji,
					count( $kurs['sekcje'] ),
					number_format_i18n( $znakow ),
					$kurs['status']
				)
			);
		}
	}

	/**
	 * Wypisuje OPIS PÓL kreatora: sekcje sprzedażowe i treść lekcji.
	 *
	 * PO CO KOMENDA DIAGNOSTYCZNA DO OPISU PÓL. Żeby smoke kreatora umiał
	 * wygenerować przykładową treść Z KONTRAKTU, a nie z listy wpisanej
	 * w teście. Dzięki temu pole dopisane do kontraktu samo wchodzi do rundy
	 * „zapis → odczyt" i nikt nie musi pamiętać o dopisaniu go do testu —
	 * ten sam mechanizm, który w prototypie chronił kreator (D6).
	 *
	 * ## OPTIONS
	 *
	 * [--format=<format>]
	 * : Postać wyniku.
	 * ---
	 * default: podsumowanie
	 * options:
	 *   - podsumowanie
	 *   - json
	 * ---
	 *
	 * ## EXAMPLES
	 *
	 *     wp aai-sklep opis --format=json
	 *
	 * @param array<int,string>    $args       Argumenty pozycyjne.
	 * @param array<string,string> $assoc_args Argumenty nazwane.
	 */
	public function opis( array $args, array $assoc_args ): void {
		$sekcje = array();
		foreach ( Aai_Sklep_Sekcje::kolejnosc_w_panelu() as $rodzaj ) {
			$opis             = Aai_Sklep_Sekcje::opis( $rodzaj );
			$sekcje[ $rodzaj ] = array(
				'nazwa' => $opis['nazwa'],
				'cel'   => $opis['cel'],
				'pola'  => Aai_Sklep_Sekcje::pola( $rodzaj ),
			);
		}

		$wynik = array(
			'sekcje' => $sekcje,
			'lekcja' => Aai_Sklep_Kontrakt::pola_lekcji(),
			'stany'  => Aai_Sklep_Kontrakt::STANY,
			'typy'   => Aai_Sklep_Kontrakt::TYPY,
			'poziomy' => Aai_Sklep_Kontrakt::POZIOMY,
		);

		if ( 'json' === ( $assoc_args['format'] ?? 'podsumowanie' ) ) {
			WP_CLI::line( (string) wp_json_encode( $wynik, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) );
			return;
		}

		foreach ( $sekcje as $rodzaj => $dane ) {
			WP_CLI::line( sprintf( '%s (%s): %s', $dane['nazwa'], $rodzaj, implode( ', ', array_keys( $dane['pola'] ) ) ) );
		}
		WP_CLI::line( sprintf( 'treść lekcji: %s', implode( ', ', array_keys( $wynik['lekcja'] ) ) ) );
	}

	/**
	 * Usuwa kurs razem z sekcjami, modułami i lekcjami.
	 *
	 * ## OPTIONS
	 *
	 * <kurs>
	 * : Slug albo identyfikator kursu.
	 *
	 * [--aktor=<aktor>]
	 * : Kto usuwa — trafia do dziennika audytu.
	 * ---
	 * default: wp-cli
	 * ---
	 *
	 * [--pozwol-skasowac-tresc]
	 * : Zgoda na usunięcie kursu, który ma NAPISANE lekcje.
	 *
	 * ## EXAMPLES
	 *
	 *     wp aai-sklep usun jak-uzywac-githuba --pozwol-skasowac-tresc
	 *
	 * @param string[]             $args       Argumenty pozycyjne.
	 * @param array<string,string> $assoc_args Argumenty nazwane.
	 */
	public function usun( array $args, array $assoc_args ): void {
		$kurs   = (string) ( $args[0] ?? '' );
		$aktor  = (string) ( $assoc_args['aktor'] ?? 'wp-cli' );
		$pozwol = isset( $assoc_args['pozwol-skasowac-tresc'] );

		$id = Aai_Sklep_Raport::id_po_slugu( $kurs ) ?? $kurs;

		try {
			$liczniki = Aai_Sklep_Zapis::usun_kurs( $id, $aktor, $pozwol );
		} catch ( Aai_Sklep_Blad_Zapisu $blad ) {
			WP_CLI::error( $blad->getMessage() );
			return;
		}

		WP_CLI::success( sprintf( 'Usunięto %d wierszy kursu %s.', $liczniki['usuniete'], $kurs ) );
	}

	/**
	 * Liczniki w jednej linii.
	 *
	 * @param array<string,int> $liczniki Liczniki z warstwy zapisu.
	 */
	private static function liczniki_tekstem( array $liczniki ): string {
		return sprintf(
			'%d utworzonych, %d zaktualizowanych, %d bez zmian, %d usuniętych',
			$liczniki['utworzone'],
			$liczniki['zaktualizowane'],
			$liczniki['bez_zmian'],
			$liczniki['usuniete']
		);
	}
}
