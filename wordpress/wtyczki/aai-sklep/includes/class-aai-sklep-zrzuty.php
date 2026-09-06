<?php
/**
 * Zrzuty ekranu z lekcji w bibliotece mediów WordPressa.
 *
 * SKĄD SIĘ TU WZIĘŁY. Proza obu kursów odwołuje się do 148 obrazów ścieżką
 * WZGLĘDNĄ (`![podpis](zrzuty/z01-….webp)`) — tak, jak leżą w repozytorium
 * obok plików prozy. WordPress takiej ścieżki nie zna, więc ktoś musi
 * przenieść pliki i powiedzieć rendererowi, gdzie ich szukać.
 *
 * DLACZEGO BIBLIOTEKA MEDIÓW, A NIE KATALOG W PACZCE WTYCZKI (decyzja
 * właściciela 2026-08-25). Bo to jest to samo miejsce, z którego kreator
 * wybiera okładkę od kroku W4, i jedyne, do którego właściciel może DODAĆ
 * nowy zrzut bez wypuszczania wersji wtyczki. Koszt: osobny krok wgrania —
 * ale jednorazowy i idempotentny.
 *
 * TREŚĆ W BAZIE ZOSTAJE NIETKNIĘTA. Nie przepisujemy ścieżek w prozie na
 * adresy — proza jest porównywana z plikami repozytorium ZNAK W ZNAK
 * (`npm run wp:sprawdz`, golden treści), więc podmiana w treści zerwałaby
 * ten dowód. Ścieżka zamienia się w adres dopiero przy renderowaniu.
 *
 * KLUCZ TO LEKCJA + NAZWA, nie sama nazwa pliku. Nazwy powtarzają się
 * między kursami (`z01-terminal-po-git-status.webp` jest w obu), a nawet
 * wewnątrz jednego kursu — sprawdzone policzeniem, nie założone.
 *
 * @package Aai_Sklep
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Wgrywanie zrzutów i mapa dla renderera.
 */
final class Aai_Sklep_Zrzuty {

	/** Meta: do której lekcji należy zrzut. */
	public const META_LEKCJA = '_aai_zrzut_lekcja';

	/** Meta: pod jaką ścieżką odwołuje się do niego proza. */
	public const META_NAZWA = '_aai_zrzut_nazwa';

	/** Meta: skrót pliku źródłowego — po nim poznajemy, że plik się zmienił. */
	public const META_SHA = '_aai_zrzut_sha';

	/**
	 * Wgrywa zrzuty z manifestu.
	 *
	 * @param string $manifest Ścieżka do pliku JSON z listą zrzutów.
	 *
	 * @return array<string,int> Liczniki: utworzone/zaktualizowane/bez_zmian.
	 *
	 * @throws Aai_Sklep_Blad_Zapisu Gdy manifestu nie da się odczytać albo plik nie istnieje.
	 */
	public static function wgraj( string $manifest ): array {
		if ( ! is_readable( $manifest ) ) {
			throw new Aai_Sklep_Blad_Zapisu( sprintf( 'nie mogę odczytać manifestu: %s', $manifest ) );
		}
		$paczka = json_decode( (string) file_get_contents( $manifest ), true ); // phpcs:ignore WordPress.WP.AlternativeFunctions
		if ( ! is_array( $paczka ) || ! isset( $paczka['zrzuty'] ) ) {
			throw new Aai_Sklep_Blad_Zapisu( 'manifest nie ma klucza `zrzuty`' );
		}

		require_once ABSPATH . 'wp-admin/includes/image.php';

		$katalog  = dirname( $manifest );
		$liczniki = array(
			'utworzone'      => 0,
			'zaktualizowane' => 0,
			'bez_zmian'      => 0,
		);

		foreach ( $paczka['zrzuty'] as $zrzut ) {
			$lekcja = (string) ( $zrzut['lekcja'] ?? '' );
			$nazwa  = (string) ( $zrzut['nazwa'] ?? '' );
			$plik   = $katalog . '/' . (string) ( $zrzut['plik'] ?? '' );

			if ( '' === $lekcja || '' === $nazwa || ! is_readable( $plik ) ) {
				throw new Aai_Sklep_Blad_Zapisu(
					sprintf( 'zrzut bez lekcji, nazwy albo pliku: %s', wp_json_encode( $zrzut ) )
				);
			}

			$sha        = (string) hash_file( 'sha256', $plik );
			$istniejacy = self::znajdz( $lekcja, $nazwa );

			if ( $istniejacy > 0 ) {
				$stary_sha  = (string) get_post_meta( $istniejacy, self::META_SHA, true );
				$stary_plik = get_attached_file( $istniejacy );
				if ( $stary_sha === $sha && is_string( $stary_plik ) && file_exists( $stary_plik ) ) {
					++$liczniki['bez_zmian'];
					continue;
				}
				// Plik się zmienił — kasujemy stary załącznik razem z plikiem,
				// zamiast zostawiać w bibliotece dwie wersje tego samego zrzutu.
				wp_delete_attachment( $istniejacy, true );
			}

			self::wstaw( $lekcja, $nazwa, $plik, $sha );
			$liczniki[ $istniejacy > 0 ? 'zaktualizowane' : 'utworzone' ] += 1;
		}

		return $liczniki;
	}

	/**
	 * Mapa zrzutów jednej lekcji: ścieżka z prozy → adres i wymiary.
	 *
	 * WYMIARY SĄ TU PO COŚ: renderer wstawia je w `width`/`height`, żeby
	 * przeglądarka znała proporcje przed pobraniem obrazu. Bez tego 148
	 * zrzutów przepychałoby tekst przy każdym doładowaniu — a CLS jest
	 * w tym projekcie trzymany na zerze (pomiary 0.25.0).
	 *
	 * @param string $id_lekcji Identyfikator lekcji w naszych tabelach.
	 *
	 * @return array<string,array<string,mixed>>
	 */
	public static function mapa( string $id_lekcji ): array {
		$zalaczniki = get_posts(
			array(
				'post_type'   => 'attachment',
				'post_status' => 'inherit',
				'numberposts' => -1,
				'meta_key'    => self::META_LEKCJA, // phpcs:ignore WordPress.DB.SlowDBQuery
				'meta_value'  => $id_lekcji, // phpcs:ignore WordPress.DB.SlowDBQuery
			)
		);

		$mapa = array();
		foreach ( (array) $zalaczniki as $zalacznik ) {
			$nazwa = (string) get_post_meta( $zalacznik->ID, self::META_NAZWA, true );
			if ( '' === $nazwa ) {
				continue;
			}
			$dane           = wp_get_attachment_metadata( $zalacznik->ID );
			$mapa[ $nazwa ] = array(
				'url'        => (string) wp_get_attachment_url( $zalacznik->ID ),
				'szerokosc'  => is_array( $dane ) ? (int) ( $dane['width'] ?? 0 ) : 0,
				'wysokosc'   => is_array( $dane ) ? (int) ( $dane['height'] ?? 0 ) : 0,
			);
		}
		return $mapa;
	}

	/**
	 * Ile zrzutów mamy w bibliotece (do raportu i do smoke'a).
	 */
	public static function ile(): int {
		$znalezione = get_posts(
			array(
				'post_type'   => 'attachment',
				'post_status' => 'inherit',
				'numberposts' => -1,
				'fields'      => 'ids',
				'meta_key'    => self::META_LEKCJA, // phpcs:ignore WordPress.DB.SlowDBQuery
			)
		);
		return count( (array) $znalezione );
	}

	/**
	 * Czego proza żąda, a czego nie ma w bibliotece — po lekcji.
	 *
	 * PO CO (MAR-A-28). Źródłem prawdy są pliki repo, kopią biblioteka
	 * mediów, a przeniesienie jest RĘCZNE (`wp aai-sklep zrzuty <manifest>`)
	 * i nie było wpięte w `postaw.sh`. Odtworzenie środowiska wymaga trzech
	 * komend; po pominięciu trzeciej klient czyta lekcję z podpisanymi
	 * dziurami („brak pliku"), a obie kontrole świecą kod 0. Nic na żywej
	 * instalacji nie porównywało kompletu — `ile()` zwraca samą liczbę,
	 * a bramki repo nie sięgają na produkcję.
	 *
	 * Ta metoda pyta o to, co widzi KLIENT: czy dla każdego obrazu żądanego
	 * przez prozę istnieje wpis w bibliotece. Ta sama klasa błędu ugryzła nas
	 * w tej sesji — przywrócenie bazy ze zrzutu nie przywraca PLIKÓW.
	 *
	 * @return array<int,array{lekcja:string,tytul:string,brakuje:string[]}>
	 */
	public static function brakujace(): array {
		global $wpdb;

		$tabela  = Aai_Sklep_Tabele::tabela( 'lessons' );
		$wiersze = $wpdb->get_results( "SELECT id, title, content FROM `$tabela`", ARRAY_A ); // phpcs:ignore WordPress.DB.PreparedSQL

		$wynik = array();
		foreach ( (array) $wiersze as $lekcja ) {
			/*
			 * BLOKI KODU I KOD W LINII NIE SĄ ŻĄDANIEM ZRZUTU.
			 *
			 * Lekcja „Markdown: formatowanie na GitHubie" UCZY tej składni,
			 * więc zawiera przykłady `![opis](sciezka/obraz.png)`, które
			 * nie są obrazami — pierwsza wersja tej kontroli zgłosiła je
			 * jako brakujące zrzuty. To znana w tym projekcie klasa
			 * fałszywego alarmu: `straznik-linkow` przerabiał ją w 0.21.0
			 * i tak samo pomija bloki kodu.
			 */
			$tresc = (string) $lekcja['content'];
			$tresc = (string) preg_replace( '/```[\s\S]*?```/u', '', $tresc );
			$tresc = (string) preg_replace( '/`[^`\n]*`/u', '', $tresc );
			if ( '' === $tresc || ! preg_match_all( '/!\[[^\]]*\]\(([^)]+)\)/u', $tresc, $trafienia ) ) {
				continue;
			}
			$mapa  = self::mapa( (string) $lekcja['id'] );
			$braki = array();
			foreach ( $trafienia[1] as $zrodlo ) {
				$zrodlo = trim( $zrodlo );
				if ( ! array_key_exists( $zrodlo, $mapa ) ) {
					$braki[] = $zrodlo;
				}
			}
			if ( array() !== $braki ) {
				$wynik[] = array(
					'lekcja'  => (string) $lekcja['id'],
					'tytul'   => (string) $lekcja['title'],
					'brakuje' => array_values( array_unique( $braki ) ),
				);
			}
		}
		return $wynik;
	}

	/**
	 * Kasuje zrzuty lekcji, których nie ma już w manifeście.
	 *
	 * @param array<int,string> $klucze Klucze `lekcja|nazwa`, które mają zostać.
	 *
	 * @return int Ile skasowano.
	 */
	public static function usun_nadmiar( array $klucze ): int {
		$skasowane = 0;
		foreach ( (array) get_posts(
			array(
				'post_type'   => 'attachment',
				'post_status' => 'inherit',
				'numberposts' => -1,
				'meta_key'    => self::META_LEKCJA, // phpcs:ignore WordPress.DB.SlowDBQuery
			)
		) as $zalacznik ) {
			$klucz = get_post_meta( $zalacznik->ID, self::META_LEKCJA, true )
				. '|' . get_post_meta( $zalacznik->ID, self::META_NAZWA, true );
			if ( in_array( $klucz, $klucze, true ) ) {
				continue;
			}
			wp_delete_attachment( $zalacznik->ID, true );
			++$skasowane;
		}
		return $skasowane;
	}

	/* ————————————————————— środek ————————————————————— */

	/**
	 * Załącznik po lekcji i nazwie — albo 0.
	 *
	 * @param string $lekcja Identyfikator lekcji.
	 * @param string $nazwa  Ścieżka z prozy.
	 */
	private static function znajdz( string $lekcja, string $nazwa ): int {
		$znalezione = get_posts(
			array(
				'post_type'   => 'attachment',
				'post_status' => 'inherit',
				'numberposts' => 1,
				'fields'      => 'ids',
				// phpcs:disable WordPress.DB.SlowDBQuery
				'meta_query'  => array(
					array(
						'key'   => self::META_LEKCJA,
						'value' => $lekcja,
					),
					array(
						'key'   => self::META_NAZWA,
						'value' => $nazwa,
					),
				),
				// phpcs:enable WordPress.DB.SlowDBQuery
			)
		);
		return $znalezione ? (int) $znalezione[0] : 0;
	}

	/**
	 * Wkłada plik do biblioteki mediów.
	 *
	 * @param string $lekcja Identyfikator lekcji.
	 * @param string $nazwa  Ścieżka z prozy.
	 * @param string $plik   Ścieżka do pliku na dysku.
	 * @param string $sha    Skrót pliku.
	 *
	 * @throws Aai_Sklep_Blad_Zapisu Gdy WordPress odmówi zapisu.
	 */
	private static function wstaw( string $lekcja, string $nazwa, string $plik, string $sha ): void {
		$zawartosc = file_get_contents( $plik ); // phpcs:ignore WordPress.WP.AlternativeFunctions
		if ( false === $zawartosc ) {
			throw new Aai_Sklep_Blad_Zapisu( sprintf( 'nie mogę odczytać zrzutu: %s', $plik ) );
		}

		/*
		 * `wp_upload_bits` kładzie plik tam, gdzie WordPress trzyma media
		 * (z podziałem na rok i miesiąc), sam pilnuje unikalnej nazwy
		 * i sam sprawdza uprawnienia katalogu. Ręczne kopiowanie do
		 * `wp-content/uploads` omijałoby wszystkie trzy rzeczy naraz.
		 */
		/*
		 * Nazwa w bibliotece to nazwa Z PROZY, nie nazwa z katalogu
		 * przejściowego (ta niesie identyfikator lekcji, żeby pliki się nie
		 * nadpisały po drodze). Właściciel ogląda tę bibliotekę i wybiera
		 * z niej okładki — `z04-edytor-kodu.webp` da się w niej znaleźć,
		 * `3da5293b-…__zrzuty_z04-edytor-kodu.webp` nie.
		 */
		$wgrany = wp_upload_bits( basename( $nazwa ), null, $zawartosc );
		if ( ! empty( $wgrany['error'] ) ) {
			throw new Aai_Sklep_Blad_Zapisu( sprintf( 'nie mogę wgrać zrzutu %s: %s', $nazwa, $wgrany['error'] ) );
		}

		$typ = wp_check_filetype( $wgrany['file'], null );
		$id  = wp_insert_attachment(
			array(
				'post_mime_type' => (string) $typ['type'],
				'post_title'     => sanitize_file_name( basename( $nazwa ) ),
				'post_status'    => 'inherit',
			),
			$wgrany['file'],
			0,
			true
		);
		if ( is_wp_error( $id ) ) {
			throw new Aai_Sklep_Blad_Zapisu( sprintf( 'nie mogę zapisać zrzutu %s: %s', $nazwa, $id->get_error_message() ) );
		}

		wp_update_attachment_metadata( (int) $id, wp_generate_attachment_metadata( (int) $id, $wgrany['file'] ) );

		// `wp_slash` z tego samego powodu, co przy kopii do Tutora: meta
		// przechodzi przez `wp_unslash`, więc bez tego znikają backslashe.
		update_post_meta( (int) $id, self::META_LEKCJA, wp_slash( $lekcja ) );
		update_post_meta( (int) $id, self::META_NAZWA, wp_slash( $nazwa ) );
		update_post_meta( (int) $id, self::META_SHA, wp_slash( $sha ) );

		/*
		 * ZNACZNIKI POTWIERDZAMY ODCZYTEM, A NIEOZNACZONY PLIK KASUJEMY.
		 *
		 * To te trzy klucze CZYNIĄ załącznik naszym: wszystkie zapytania
		 * tej klasy szukają po `meta_key = _aai_zrzut_lekcja`, więc plik
		 * bez znacznika jest dla niej NIEWIDZIALNY — a wtedy każdy kolejny
		 * przebieg `wp aai-sklep zrzuty` wgrywa go od nowa (zmierzone:
		 * załącznik bez znaczników nie trafia do wyniku zapytania). Przy
		 * 148 zrzutach jeden nieudany zapis meta zamienia bibliotekę
		 * mediów w hałdę kopii z przyrostkami `-1`, `-2`, `-3`.
		 *
		 * Ta sama klasa co Z-5 w Pluginie 2 (znaczniki tożsamości okładki),
		 * naprawiona tam w 0.73.0 — tu została do 0.78.0.
		 *
		 * Odczyt, nie wynik `update_post_meta()`: ta funkcja oddaje `false`
		 * także wtedy, gdy wartość już była taka sama.
		 */
		$oznaczony = (string) get_post_meta( (int) $id, self::META_LEKCJA, true ) === $lekcja
			&& (string) get_post_meta( (int) $id, self::META_NAZWA, true ) === $nazwa
			&& (string) get_post_meta( (int) $id, self::META_SHA, true ) === $sha;

		if ( ! $oznaczony ) {
			// Świeży, nierozpoznawalny plik kasujemy: brak zrzutu jest
			// stanem odwracalnym (lekcja pokazuje podpis), a sierota-widmo
			// mnoży się przy KAŻDYM przebiegu.
			wp_delete_attachment( (int) $id, true );
			throw new Aai_Sklep_Blad_Zapisu(
				sprintf( 'zrzut %s wgrał się, ale nie przyjął znaczników — usunięty, żeby nie mnożył kopii', $nazwa )
			);
		}
	}
}
