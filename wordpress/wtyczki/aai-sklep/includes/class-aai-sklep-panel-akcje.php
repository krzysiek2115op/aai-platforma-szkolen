<?php
/**
 * Akcje kreatora — jedyna droga z formularza do bazy.
 *
 * KAŻDA AKCJA MA TRZY BRAMKI, ZAWSZE W TEJ KOLEJNOŚCI:
 *   1. `check_admin_referer` — żądanie przyszło z NASZEGO formularza,
 *      a nie z cudzej strony otwartej w sąsiedniej karcie (CSRF),
 *   2. `current_user_can` — ta osoba ma prawo zarządzać kursami,
 *   3. `Aai_Sklep_Kontrakt` — dane mają kształt, który wolno zapisać.
 * Do tabel pisze wyłącznie `Aai_Sklep_Zapis` (ósmy niezmiennik
 * `straznik-wtyczki-wp`); tutaj nie ma ani jednego zapytania do bazy.
 *
 * DLACZEGO NONCE *I* UPRAWNIENIE. Bo odpowiadają na różne pytania.
 * Uprawnienie mówi „ta osoba może"; nonce mówi „ta osoba naprawdę o to
 * poprosiła". Sam nonce puściłby zalogowanego bez uprawnień; samo
 * uprawnienie puściłoby administratora, którego cudza strona kliknęła
 * za plecami. Pilnuje tego `straznik-kreatora-wp`.
 *
 * PO ZAPISIE PRZEKIEROWANIE. Zapis kursu jest PEŁNĄ PODMIANĄ programu,
 * więc odświeżenie strony z formularzem w pamięci przeglądarki potrafiłoby
 * powtórzyć zapis i skasować to, co powstało w międzyczasie.
 *
 * @package Aai_Sklep
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Obsługa wysyłek z panelu.
 */
final class Aai_Sklep_Panel_Akcje {

	/** Zapis kursu razem z sekcjami i programem. */
	public const ZAPISZ_KURS = 'aai_sklep_zapisz_kurs';

	/** Zapis treści jednej lekcji. */
	public const ZAPISZ_LEKCJE = 'aai_sklep_zapisz_lekcje';

	/** Zmiana stanu kursu (publikacja, ukrycie). */
	public const STAN_KURSU = 'aai_sklep_stan_kursu';

	/** Usunięcie kursu. */
	public const USUN_KURS = 'aai_sklep_usun_kurs';

	/**
	 * Podpina akcje pod `admin-post.php`.
	 *
	 * Rejestrujemy WYŁĄCZNIE warianty dla zalogowanych (`admin_post_`), bez
	 * `admin_post_nopriv_`. Gość, który trafi na te adresy, dostaje wtedy
	 * zwykłe „0" WordPressa, a nie naszą obsługę — jedna bramka mniej do
	 * przeoczenia.
	 */
	public static function zarejestruj(): void {
		add_action( 'admin_post_' . self::ZAPISZ_KURS, array( self::class, 'zapisz_kurs' ) );
		add_action( 'admin_post_' . self::ZAPISZ_LEKCJE, array( self::class, 'zapisz_lekcje' ) );
		add_action( 'admin_post_' . self::STAN_KURSU, array( self::class, 'stan_kursu' ) );
		add_action( 'admin_post_' . self::USUN_KURS, array( self::class, 'usun_kurs' ) );
	}

	/* ————————————————————————— KURS ————————————————————————— */

	/**
	 * Zapisuje kurs: dane, sekcje i program.
	 */
	public static function zapisz_kurs(): void {
		check_admin_referer( self::ZAPISZ_KURS );
		self::brama();

		$zakladka = self::tekst( 'zakladka' );
		$id       = self::tekst( 'id' );

		$wejscie = array(
			'slug'         => self::tekst( 'slug' ),
			'title'        => self::tekst( 'title' ),
			'type'         => self::tekst( 'type' ),
			'short_desc'   => self::tekst( 'short_desc' ),
			'cover_url'    => self::tekst( 'cover_url' ),
			'badge'        => self::tekst( 'badge' ),
			'level'        => self::tekst( 'level' ),
			'price_grosze' => Aai_Sklep_Kontrakt::grosze_z_tekstu( self::tekst( 'cena_zl' ) ),
		);
		/*
		 * POLE NIEPRZYSŁANE ZNIKA Z WEJŚCIA, zamiast wchodzić jako `null`.
		 *
		 * Reguła całej warstwy zapisu brzmi „brak klucza znaczy nie ruszaj"
		 * (BLAD-018), a `null` nie jest brakiem — to wartość, którą kontrakt
		 * słusznie odrzuca jako zły kształt. Przekładanie „nie przysłano" na
		 * `null` zrywało więc ten łańcuch: żądanie bez programu dostawało
		 * odmowę z komunikatem „Program ma zły kształt", czyli o czymś
		 * zupełnie innym niż rzeczywistość. Panel zawsze wysyła oba pola,
		 * więc właściciel tego nie widział — ale ślepy był też nasz własny
		 * test złego wejścia: sześć przypadków przechodziło z tego jednego
		 * powodu, a nie z powodu błędu, który nazywały.
		 */
		foreach ( array( 'sekcje', 'moduly' ) as $klucz ) {
			$wartosc = self::json( $klucz );
			if ( null !== $wartosc ) {
				$wejscie[ $klucz ] = $wartosc;
			}
		}
		if ( '' !== $id ) {
			$wejscie['id'] = $id;
		}
		// `null` znaczy „to nie jest liczba" — kontrakt ma o tym powiedzieć
		// przy polu ceny, a nie zapisać po cichu zero (BLAD-005 prototypu).
		if ( null === $wejscie['price_grosze'] ) {
			$wejscie['price_grosze'] = 'nie liczba';
		}

		$sprawdzone = Aai_Sklep_Kontrakt::kurs( $wejscie );

		if ( null === $sprawdzone['dane'] ) {
			self::odrzuc( 'kurs', $wejscie, $sprawdzone['bledy'], $id, $zakladka );
		}

		// Zajęty adres to POMYŁKA WŁAŚCICIELA, nie awaria zapisu. Bez tego
		// sprawdzenia baza odrzuca zapis kluczem UNIQUE, a panel mówi
		// „zapis się nie powiódł" — czyli o czymś zupełnie innym niż to,
		// co trzeba poprawić.
		if ( Aai_Sklep_Odczyt_Panelu::slug_zajety( (string) $sprawdzone['dane']['slug'], (string) $sprawdzone['dane']['id'] ) ) {
			self::odrzuc(
				'kurs',
				$wejscie,
				array( 'slug' => __( 'Ten adres (slug) jest już zajęty przez inny kurs.', 'aai-sklep' ) ),
				$id,
				$zakladka
			);
		}

		$zgoda = '1' === self::tekst( 'pozwol_skasowac_tresc' );

		try {
			$liczniki = Aai_Sklep_Zapis::zapisz_kurs( $sprawdzone['dane'], self::aktor(), $zgoda );
		} catch ( Aai_Sklep_Blad_Zapisu $blad ) {
			$szczegoly = $blad->dane();
			if ( isset( $szczegoly['lekcje_z_trescia'] ) ) {
				// Odmowa skasowania napisanej treści NIE jest błędem formularza:
				// właściciel ma zobaczyć liczbę i świadomie potwierdzić.
				Aai_Sklep_Panel::zapamietaj( 'kurs', $wejscie, array() );
				self::wroc(
					Aai_Sklep_Panel::adres_kursu(
						$id,
						array(
							'zakladka'      => $zakladka,
							'aai_komunikat' => 'odmowa_tresci',
							'aai_ile'       => (string) (int) $szczegoly['lekcje_z_trescia'],
						)
					)
				);
			}
			self::odrzuc( 'kurs', $wejscie, array( 'zapis' => $blad->getMessage() ), $id, $zakladka, 'blad' );
		}

		$nowy = (string) $sprawdzone['dane']['id'];
		self::wroc(
			Aai_Sklep_Panel::adres_kursu(
				$nowy,
				array(
					'zakladka'      => $zakladka,
					'aai_komunikat' => self::czy_zmiana( $liczniki ) ? 'zapisano' : 'bez_zmian',
				)
			)
		);
	}

	/**
	 * Zmienia stan kursu (publikacja, ukrycie, powrót do szkicu).
	 */
	public static function stan_kursu(): void {
		check_admin_referer( self::STAN_KURSU );
		self::brama();

		$id     = self::tekst( 'id' );
		$status = self::tekst( 'status' );

		if ( ! isset( Aai_Sklep_Kontrakt::STANY[ $status ] ) ) {
			self::wroc( Aai_Sklep_Panel::adres_listy( array( 'aai_komunikat' => 'blad' ) ) );
		}

		try {
			Aai_Sklep_Zapis::ustaw_status( $id, $status, self::aktor() );
		} catch ( Aai_Sklep_Blad_Zapisu $blad ) {
			self::wroc( Aai_Sklep_Panel::adres_listy( array( 'aai_komunikat' => 'blad' ) ) );
		}

		self::wroc(
			Aai_Sklep_Panel::adres_listy(
				array( 'aai_komunikat' => 'published' === $status ? 'opublikowano' : 'ukryto' )
			)
		);
	}

	/**
	 * Usuwa kurs razem z treścią.
	 */
	public static function usun_kurs(): void {
		check_admin_referer( self::USUN_KURS );
		self::brama();

		$id     = self::tekst( 'id' );
		$zgoda  = '1' === self::tekst( 'pozwol_skasowac_tresc' );
		$dostep = '1' === self::tekst( 'pozwol_stracic_dostep' );

		try {
			Aai_Sklep_Zapis::usun_kurs( $id, self::aktor(), $zgoda, $dostep );
		} catch ( Aai_Sklep_Blad_Zapisu $blad ) {
			$szczegoly = $blad->dane();
			/*
			 * Dwie odmowy, dwa komunikaty — i to nie jest kosmetyka.
			 * „Skasujesz treść" i „ludzie stracą dostęp" to różne straty
			 * i różne decyzje; jeden wspólny komunikat kazałby właścicielowi
			 * zgadywać, na co właściwie się godzi.
			 */
			if ( isset( $szczegoly['kupujacy'] ) ) {
				self::wroc(
					Aai_Sklep_Panel::adres_listy(
						array(
							'aai_komunikat' => 'odmowa_dostepu',
							'aai_ile'       => (string) (int) $szczegoly['kupujacy'],
						)
					)
				);
			}
			if ( isset( $szczegoly['lekcje_z_trescia'] ) ) {
				self::wroc(
					Aai_Sklep_Panel::adres_listy(
						array(
							'aai_komunikat' => 'odmowa_tresci',
							'aai_ile'       => (string) (int) $szczegoly['lekcje_z_trescia'],
						)
					)
				);
			}
			self::wroc( Aai_Sklep_Panel::adres_listy( array( 'aai_komunikat' => 'blad' ) ) );
		}

		self::wroc( Aai_Sklep_Panel::adres_listy( array( 'aai_komunikat' => 'usunieto' ) ) );
	}

	/* ————————————————————————— LEKCJA ————————————————————————— */

	/**
	 * Zapisuje treść jednej lekcji.
	 *
	 * Zapis dotyczy WYŁĄCZNIE tej lekcji: program kursu i strona sprzedażowa
	 * zostają nietknięte. To ta sama granica, co w prototypie.
	 */
	public static function zapisz_lekcje(): void {
		check_admin_referer( self::ZAPISZ_LEKCJE );
		self::brama();

		$id = self::tekst( 'id' );

		$wejscie = array(
			'id'        => $id,
			'tresc'     => self::tresc( 'tresc' ),
			'materialy' => self::json( 'materialy' ),
		);

		$sprawdzone = Aai_Sklep_Kontrakt::tresc_lekcji( $wejscie );
		if ( null === $sprawdzone['dane'] ) {
			Aai_Sklep_Panel::zapamietaj( 'lekcja', $wejscie, $sprawdzone['bledy'] );
			self::wroc( Aai_Sklep_Panel::adres_lekcji( $id ) . '&aai_komunikat=bledy' );
		}

		try {
			$liczniki = Aai_Sklep_Zapis::zapisz_tresc_lekcji( $id, $sprawdzone['dane'], self::aktor() );
		} catch ( Aai_Sklep_Blad_Zapisu $blad ) {
			Aai_Sklep_Panel::zapamietaj( 'lekcja', $wejscie, array( 'zapis' => $blad->getMessage() ) );
			self::wroc( Aai_Sklep_Panel::adres_lekcji( $id ) . '&aai_komunikat=blad' );
		}

		self::wroc(
			Aai_Sklep_Panel::adres_lekcji( $id )
			. '&aai_komunikat=' . ( self::czy_zmiana( $liczniki ) ? 'zapisano_lekcje' : 'bez_zmian' )
		);
	}

	/* ————————————————————————— POMOCNICZE ————————————————————————— */

	/**
	 * Uprawnienie. Nonce sprawdza każda akcja u siebie, żeby było widać
	 * przy niej samej, że o nim nie zapomniano.
	 */
	private static function brama(): void {
		if ( ! current_user_can( Aai_Sklep_Panel::UPRAWNIENIE ) ) {
			wp_die(
				esc_html__( 'Nie masz uprawnień do zarządzania kursami.', 'aai-sklep' ),
				esc_html__( 'Brak uprawnień', 'aai-sklep' ),
				array( 'response' => 403 )
			);
		}
	}

	/**
	 * Kto zapisuje — do dziennika audytu.
	 *
	 * Login, nie identyfikator liczbowy: dziennik ma się czytać bez
	 * zaglądania do tabeli użytkowników, także po latach.
	 */
	private static function aktor(): string {
		$uzytkownik = wp_get_current_user();
		return $uzytkownik->user_login ? 'wp:' . $uzytkownik->user_login : 'wp:?';
	}

	/**
	 * Pole tekstowe z wysyłki.
	 *
	 * `wp_unslash` NIE jest ozdobą: WordPress dokłada do `$_POST` ukośniki
	 * przed cudzysłowami, więc bez tego kroku ścieżka `C:\Users` z kursu
	 * o Gicie zapisałaby się jako `C:\\Users`. Cicha zmiana treści.
	 *
	 * @param string $nazwa Nazwa pola.
	 */
	private static function tekst( string $nazwa ): string {
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- nonce sprawdza wywołujący.
		if ( ! isset( $_POST[ $nazwa ] ) || ! is_string( $_POST[ $nazwa ] ) ) {
			return '';
		}
		// phpcs:ignore WordPress.Security.NonceVerification.Missing
		return trim( sanitize_text_field( wp_unslash( $_POST[ $nazwa ] ) ) );
	}

	/**
	 * Pole wielolinijkowe (treść lekcji) — BEZ `sanitize_text_field`.
	 *
	 * `sanitize_text_field` skleiłoby lekcję w jedną linię, bo usuwa znaki
	 * nowej linii. Materiał kursu to Markdown: puste linie są w nim
	 * składnią, nie ozdobą. Bezpieczeństwo bierze się tu z ucieczki przy
	 * DRUKU, a nie z kaleczenia treści przy zapisie.
	 *
	 * @param string $nazwa Nazwa pola.
	 */
	private static function tresc( string $nazwa ): string {
		// phpcs:ignore WordPress.Security.NonceVerification.Missing
		if ( ! isset( $_POST[ $nazwa ] ) || ! is_string( $_POST[ $nazwa ] ) ) {
			return '';
		}
		// phpcs:ignore WordPress.Security.NonceVerification.Missing
		return (string) wp_unslash( $_POST[ $nazwa ] );
	}

	/**
	 * Pole niosące JSON (sekcje, program, materiały).
	 *
	 * Zwraca `null`, gdy pola nie ma — a kontrakt i warstwa zapisu rozumieją
	 * to jako „nie ruszaj". Pusty JSON to co innego niż brak pola i tę
	 * różnicę trzeba przenieść nietkniętą.
	 *
	 * @param string $nazwa Nazwa pola.
	 * @return array<int|string,mixed>|null
	 */
	private static function json( string $nazwa ) {
		// phpcs:ignore WordPress.Security.NonceVerification.Missing
		if ( ! isset( $_POST[ $nazwa ] ) || ! is_string( $_POST[ $nazwa ] ) ) {
			return null;
		}
		// phpcs:ignore WordPress.Security.NonceVerification.Missing
		$surowe = trim( (string) wp_unslash( $_POST[ $nazwa ] ) );
		if ( '' === $surowe ) {
			return null;
		}
		$dane = json_decode( $surowe, true );
		return is_array( $dane ) ? $dane : array();
	}

	/**
	 * Czy zapis cokolwiek zmienił.
	 *
	 * @param array<string,int> $liczniki Liczniki z warstwy zapisu.
	 */
	private static function czy_zmiana( array $liczniki ): bool {
		return ( $liczniki['utworzone'] + $liczniki['zaktualizowane'] + $liczniki['usuniete'] ) > 0;
	}

	/**
	 * Odrzuca formularz: zapamiętuje stan i wraca do edytora.
	 *
	 * @param string               $co       „kurs" albo „lekcja".
	 * @param array<string,mixed>  $wejscie  Odrzucone dane.
	 * @param array<string,string> $bledy    Błędy pól.
	 * @param string               $id       Identyfikator kursu.
	 * @param string               $zakladka Zakładka, do której wrócić.
	 * @param string               $kod      Kod komunikatu.
	 */
	private static function odrzuc( string $co, array $wejscie, array $bledy, string $id, string $zakladka, string $kod = 'bledy' ): void {
		$wejscie['id'] = $id;
		Aai_Sklep_Panel::zapamietaj( $co, $wejscie, $bledy );
		self::wroc(
			Aai_Sklep_Panel::adres_kursu(
				$id,
				array(
					'zakladka'      => $zakladka,
					'aai_komunikat' => $kod,
				)
			)
		);
	}

	/**
	 * Przekierowanie i koniec żądania.
	 *
	 * @param string $adres Dokąd wrócić.
	 */
	private static function wroc( string $adres ): void {
		wp_safe_redirect( $adres );
		exit;
	}
}
