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
						'tutor'     => $wynik['tutor'],
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

		if ( Aai_Sklep_Tutor::dostepny() ) {
			WP_CLI::log( '  kopia w Tutorze: ' . self::liczniki_tekstem( $wynik['tutor'] ) );
		} else {
			WP_CLI::log( '  kopia w Tutorze: pominięta — nie ma tej wtyczki w instalacji' );
		}

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
	 * [--pozwol-stracic-dostep]
	 * : Zgoda na odebranie dostępu ludziom, którzy ten kurs KUPILI.
	 *
	 * [--pozwol-porzucic-zamowienia]
	 * : Zgoda na porzucenie ZŁOŻONYCH, jeszcze nieopłaconych zamówień za ten kurs.
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
		$dostep = isset( $assoc_args['pozwol-stracic-dostep'] );
		$drodze = isset( $assoc_args['pozwol-porzucic-zamowienia'] );

		$id = Aai_Sklep_Raport::id_po_slugu( $kurs ) ?? $kurs;

		try {
			$liczniki = Aai_Sklep_Zapis::usun_kurs( $id, $aktor, $pozwol, $dostep, $drodze );
		} catch ( Aai_Sklep_Blad_Zapisu $blad ) {
			WP_CLI::error( $blad->getMessage() );
			return;
		}

		WP_CLI::success( sprintf( 'Usunięto %d wierszy kursu %s.', $liczniki['usuniete'], $kurs ) );
	}

	/**
	 * Kopiuje kursy do wpisów Tutor LMS.
	 *
	 * Normalnie nie trzeba jej wołać: kopia jedzie sama po każdym zapisie
	 * w kreatorze. Ta komenda jest do dwóch rzeczy — pierwszego wypełnienia
	 * po instalacji Tutora i naprawy po awarii, którą pokazał
	 * `wp aai-sklep sprawdz-tutora`.
	 *
	 * ## OPTIONS
	 *
	 * [<kurs>]
	 * : Slug albo identyfikator kursu. Bez tego — wszystkie kursy.
	 *
	 * ## EXAMPLES
	 *
	 *     wp aai-sklep sync
	 *     wp aai-sklep sync jak-uzywac-githuba
	 *
	 * @param string[]             $args       Argumenty pozycyjne.
	 * @param array<string,string> $assoc_args Argumenty nazwane.
	 */
	public function sync( array $args, array $assoc_args ): void {
		unset( $assoc_args );

		if ( ! Aai_Sklep_Tutor::dostepny() ) {
			WP_CLI::error( 'Tutor LMS nie jest w tej instalacji — nie ma dokąd kopiować.' );
			return;
		}

		$kurs = (string) ( $args[0] ?? '' );
		$idki = '' === $kurs
			? Aai_Sklep_Tutor::identyfikatory_kursow()
			: array( Aai_Sklep_Raport::id_po_slugu( $kurs ) ?? $kurs );

		$razem = array(
			'utworzone'      => 0,
			'zaktualizowane' => 0,
			'bez_zmian'      => 0,
			'usuniete'       => 0,
		);

		foreach ( $idki as $id ) {
			try {
				$liczniki = Aai_Sklep_Tutor::synchronizuj_kurs( $id );
			} catch ( Aai_Sklep_Blad_Zapisu $blad ) {
				WP_CLI::error( $blad->getMessage() );
				return;
			}
			foreach ( $liczniki as $klucz => $ile ) {
				$razem[ $klucz ] += $ile;
			}
			WP_CLI::log( sprintf( '  %s: %s', $id, self::liczniki_tekstem( $liczniki ) ) );
		}

		Aai_Sklep_Tutor::zapomnij_blad();
		WP_CLI::success( 'Kopia w Tutorze: ' . self::liczniki_tekstem( $razem ) );
	}

	/**
	 * Porównuje NASZE tabele z kopią w Tutorze.
	 *
	 * PO CO OSOBNA KONTROLA, SKORO KOPIA JEDZIE SAMA. Bo „jedzie sama"
	 * to obietnica kodu, a nie stan bazy. Kopia mogła nie dojechać przy
	 * awarii, mógł ją zmienić ktoś w Course Builderze, mogła zostać sierota
	 * po skasowanym kursie. Rozjazd dwóch kopii nie objawia się błędem —
	 * dlatego pytamy o niego wprost, komendą i smoke'em.
	 *
	 * Kod wyjścia: 0 gdy zgodne, 1 gdy jest choć jedna różnica.
	 *
	 * ## OPTIONS
	 *
	 * [<kurs>]
	 * : Slug albo identyfikator kursu. Bez tego wszystkie, razem z szukaniem sierot.
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
	 *     wp aai-sklep sprawdz-tutora
	 *     wp aai-sklep sprawdz-tutora --format=json
	 *
	 * @subcommand sprawdz-tutora
	 *
	 * @param string[]             $args       Argumenty pozycyjne.
	 * @param array<string,string> $assoc_args Argumenty nazwane.
	 */
	public function sprawdz_tutora( array $args, array $assoc_args ): void {
		if ( ! Aai_Sklep_Tutor::dostepny() ) {
			WP_CLI::error( 'Tutor LMS nie jest w tej instalacji — nie ma czego porównywać.' );
			return;
		}

		$kurs = (string) ( $args[0] ?? '' );
		$id   = '' === $kurs ? null : ( Aai_Sklep_Raport::id_po_slugu( $kurs ) ?? $kurs );

		$wynik          = Aai_Sklep_Tutor::porownaj( $id );
		$wynik['blad']  = Aai_Sklep_Tutor::ostatni_blad();
		$wynik['zgoda'] = array() === $wynik['roznice'] && null === $wynik['blad'];

		if ( 'json' === ( $assoc_args['format'] ?? 'podsumowanie' ) ) {
			WP_CLI::line( (string) wp_json_encode( $wynik, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) );
		} else {
			WP_CLI::log(
				sprintf(
					'  kursów: %d, sprawdzonych obiektów: %d, różnic: %d',
					$wynik['kursy'],
					$wynik['sprawdzonych'],
					count( $wynik['roznice'] )
				)
			);
			foreach ( $wynik['roznice'] as $roznica ) {
				WP_CLI::log( sprintf( '  [%s] %s — %s', $roznica['rodzaj'], $roznica['co'], $roznica['opis'] ) );
			}
			if ( null !== $wynik['blad'] ) {
				WP_CLI::log(
					sprintf(
						'  ostatnia nieudana synchronizacja: kurs %s, %s (%s)',
						$wynik['blad']['kurs'],
						$wynik['blad']['komunikat'],
						$wynik['blad']['kiedy']
					)
				);
			}
		}

		if ( ! $wynik['zgoda'] ) {
			WP_CLI::halt( 1 );
		}
	}

	/**
	 * Wgrywa zrzuty ekranu z lekcji do biblioteki mediów.
	 *
	 * Idempotentnie: plik, który się nie zmienił, nie jest wgrywany drugi
	 * raz (porównujemy `sha256` źródła, nie datę pliku).
	 *
	 * ## OPTIONS
	 *
	 * <manifest>
	 * : Plik JSON z listą zrzutów; pliki leżą w tym samym katalogu.
	 *
	 * [--usun-nadmiar]
	 * : Skasuj z biblioteki zrzuty, których nie ma w manifeście.
	 *
	 * ## EXAMPLES
	 *
	 *     wp aai-sklep zrzuty /tmp/zrzuty/manifest.json --usun-nadmiar
	 *
	 * @param string[]             $args       Argumenty pozycyjne.
	 * @param array<string,string> $assoc_args Argumenty nazwane.
	 */
	public function zrzuty( array $args, array $assoc_args ): void {
		$manifest = (string) ( $args[0] ?? '' );

		try {
			$liczniki = Aai_Sklep_Zrzuty::wgraj( $manifest );
		} catch ( Aai_Sklep_Blad_Zapisu $blad ) {
			WP_CLI::error( $blad->getMessage() );
			return;
		}

		if ( isset( $assoc_args['usun-nadmiar'] ) ) {
			$paczka = json_decode( (string) file_get_contents( $manifest ), true ); // phpcs:ignore WordPress.WP.AlternativeFunctions
			$klucze = array();
			foreach ( (array) ( $paczka['zrzuty'] ?? array() ) as $zrzut ) {
				$klucze[] = (string) $zrzut['lekcja'] . '|' . (string) $zrzut['nazwa'];
			}
			$skasowane = Aai_Sklep_Zrzuty::usun_nadmiar( $klucze );
			WP_CLI::log( sprintf( '  skasowanych zrzutów spoza manifestu: %d', $skasowane ) );
		}

		WP_CLI::success(
			sprintf(
				'Zrzuty: %d utworzonych, %d zaktualizowanych, %d bez zmian (w bibliotece: %d).',
				$liczniki['utworzone'],
				$liczniki['zaktualizowane'],
				$liczniki['bez_zmian'],
				Aai_Sklep_Zrzuty::ile()
			)
		);
	}

	/**
	 * Składa podaną prozę do HTML-u i oddaje wynik JSON-em.
	 *
	 * PO CO KOMENDA DIAGNOSTYCZNA DO RENDERERA. Bo widok lekcji ma DWIE
	 * implementacje tego samego składu: PHP we wtyczce i `marked` w narzędziu
	 * `tools/podglad-kursow/`, którym powstał podgląd przyjęty przez
	 * właściciela w 0.34.0. Dwie implementacje bez porównania to dwie okazje
	 * do rozjazdu, więc `tools/sprawdz-proze-php.mjs` puszcza przez OBIE te
	 * same 73 lekcje i porównuje tekst co do słowa oraz strukturę co do
	 * znacznika. Ta komenda jest wejściem dla tamtego porównania.
	 *
	 * ## OPTIONS
	 *
	 * <plik>
	 * : Plik JSON: { "lekcje": [ { "klucz": …, "md": …, "obrazy": {…} } ] }.
	 *
	 * ## EXAMPLES
	 *
	 *     wp aai-sklep proza /tmp/proza.json
	 *
	 * @param string[]             $args       Argumenty pozycyjne.
	 * @param array<string,string> $assoc_args Argumenty nazwane.
	 */
	public function proza( array $args, array $assoc_args ): void {
		unset( $assoc_args );

		$plik = (string) ( $args[0] ?? '' );
		if ( ! is_readable( $plik ) ) {
			WP_CLI::error( sprintf( 'nie mogę odczytać pliku: %s', $plik ) );
			return;
		}
		$paczka = json_decode( (string) file_get_contents( $plik ), true ); // phpcs:ignore WordPress.WP.AlternativeFunctions
		if ( ! is_array( $paczka ) || ! isset( $paczka['lekcje'] ) ) {
			WP_CLI::error( 'plik nie ma klucza `lekcje`' );
			return;
		}

		$wynik = array();
		foreach ( $paczka['lekcje'] as $lekcja ) {
			$klucz = (string) ( $lekcja['klucz'] ?? '' );
			try {
				$wynik[ $klucz ] = Aai_Sklep_Proza::zloz(
					(string) ( $lekcja['md'] ?? '' ),
					(array) ( $lekcja['obrazy'] ?? array() )
				);
			} catch ( Aai_Sklep_Blad_Zapisu $blad ) {
				$wynik[ $klucz ] = array( 'blad' => $blad->getMessage() );
			}
		}

		WP_CLI::line( (string) wp_json_encode( $wynik, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) );
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
