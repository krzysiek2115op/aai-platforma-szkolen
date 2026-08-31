<?php
/**
 * Kreator kursów w kokpicie WordPressa (krok W4).
 *
 * CZYM TO JEST. Portem panelu z Działu 6 prototypu
 * (`app/szkolenia/kreator/*`) — kurs, program, dwanaście rodzajów sekcji
 * sprzedażowych i treść lekcji. Do W3 wtyczka miała dane i front, ale nie
 * miała czym ich zmienić: treść wchodziła wyłącznie importem z Postgresa
 * komendą wiersza poleceń. Kurs, którego właściciel nie umie poprawić bez
 * programisty, nie jest produktem.
 *
 * CZEGO NIE PRZENOSIMY Z PROTOTYPU I DLACZEGO:
 *
 *  * BRAMY NA TOKEN. `KREATOR_TOKEN` był rozwiązaniem na czas budowy, bo
 *    prototyp nie miał kont („pełne logowanie da Plugin 3" — KREATOR.md).
 *    WordPress ma je z pudełka, więc dostępu pilnuje uprawnienie i nonce.
 *    Token w tym miejscu byłby drugim, słabszym systemem uprawnień obok
 *    istniejącego.
 *  * JEDNEGO AJAX-A. Wytyczna §8 („jedna baza = jeden AJAX") powstała
 *    przeciwko rozlewaniu zapisu po wielu trasach. Tutaj rolę tej jednej
 *    bramy pełni `admin-post.php` z akcjami `aai_sklep_*`: każda ma nonce,
 *    uprawnienie i kontrakt, a do bazy pisze wyłącznie `Aai_Sklep_Zapis`.
 *
 * PO ZAPISIE PRZEKIEROWANIE (wzorzec PRG). Bez niego odświeżenie strony
 * powtarza zapis — a nasz zapis kursu jest PEŁNĄ PODMIANĄ programu.
 * Powtórzony przypadkiem, potrafi skasować to, co właściciel dodał
 * w międzyczasie w drugiej karcie.
 *
 * BŁĘDY I NIEZAPISANY STAN PRZEŻYWAJĄ PRZEKIEROWANIE. Odrzucony formularz
 * ląduje w krótkiej pamięci podręcznej (transient na użytkownika), a edytor
 * woli go od stanu z bazy. Inaczej jedna literówka w slugu kosztowałaby
 * właściciela wszystko, co wpisał — a przy sekcji FAQ to bywa pół godziny.
 *
 * @package Aai_Sklep
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Ekrany kreatora.
 */
final class Aai_Sklep_Panel {

	/**
	 * Uprawnienie wymagane do WSZYSTKIEGO w kreatorze.
	 *
	 * To samo, którym `Aai_Sklep_Trasy` wpuszcza na podgląd szkiców — jedno
	 * pytanie „czy ta osoba zarządza sklepem", zadawane w jednym miejscu.
	 *
	 * OSOBNEJ ROLI REDAKTORA KURSÓW NIE BĘDZIE — decyzja właściciela
	 * 2026-08-30. Wcześniej stało tu, że dołoży ją Plugin 3 „razem
	 * z kontami klientów"; konta dowiózł Plugin 2 (WooCommerce), a rola
	 * odpadła świadomie: właściciel jest jedynym redaktorem, więc byłoby
	 * to uprawnienie, migracja, strażnik i mutacje utrzymywane dla nikogo.
	 * Gdyby doszła druga osoba, WordPress pozwala nadać jej konto albo
	 * dorobić rolę wtedy.
	 */
	public const UPRAWNIENIE = 'manage_options';

	/** Strona z listą kursów. */
	public const STRONA_LISTA = 'aai-sklep';

	/** Strona edytora kursu. */
	public const STRONA_KURS = 'aai-sklep-kurs';

	/** Strona edytora treści lekcji. */
	public const STRONA_LEKCJA = 'aai-sklep-lekcja';

	/**
	 * Podpina ekrany i zasoby.
	 */
	public static function zarejestruj(): void {
		add_action( 'admin_menu', array( self::class, 'menu' ) );
		add_action( 'admin_enqueue_scripts', array( self::class, 'zasoby' ) );
		add_action( 'admin_bar_menu', array( self::class, 'pasek_administracyjny' ), 80 );
	}

	/**
	 * Pozycje w menu kokpitu.
	 */
	public static function menu(): void {
		add_menu_page(
			__( 'Automatic AI — kursy', 'aai-sklep' ),
			__( 'Automatic AI', 'aai-sklep' ),
			self::UPRAWNIENIE,
			self::STRONA_LISTA,
			array( self::class, 'ekran_listy' ),
			'dashicons-welcome-learn-more',
			30
		);
		add_submenu_page(
			self::STRONA_LISTA,
			__( 'Kursy', 'aai-sklep' ),
			__( 'Kursy', 'aai-sklep' ),
			self::UPRAWNIENIE,
			self::STRONA_LISTA,
			array( self::class, 'ekran_listy' )
		);
		add_submenu_page(
			self::STRONA_LISTA,
			__( 'Nowy kurs', 'aai-sklep' ),
			__( 'Nowy kurs', 'aai-sklep' ),
			self::UPRAWNIENIE,
			self::STRONA_KURS,
			array( self::class, 'ekran_kursu' )
		);
		/*
		 * Edytor lekcji ma być OSIĄGALNY, ale nie w menu: wchodzi się do niego
		 * z programu konkretnego kursu, a pozycja „Treść lekcji" bez kontekstu
		 * nie miałaby czego otworzyć.
		 *
		 * `null` jako rodzic, a NIE `add_submenu_page()` + `remove_submenu_page()`.
		 * Ta druga droga wygląda na czystszą i jest pułapką: `remove_submenu_page`
		 * wycina wpis z `$submenu`, a `get_admin_page_parent()` szuka rodzica
		 * właśnie tam — bez niego `admin.php` nie znajduje haka strony i oddaje
		 * 403 „Sorry, you are not allowed to access this page". Wygląda to jak
		 * błąd uprawnień, a jest błędem rejestracji; sprawdzone na żywej
		 * instalacji przy W4.
		 */
		add_submenu_page(
			null,
			__( 'Treść lekcji', 'aai-sklep' ),
			__( 'Treść lekcji', 'aai-sklep' ),
			self::UPRAWNIENIE,
			self::STRONA_LEKCJA,
			array( self::class, 'ekran_lekcji' )
		);
	}

	/**
	 * Arkusz i skrypt panelu — WYŁĄCZNIE na naszych ekranach.
	 *
	 * Wtyczka, która wpycha swój CSS w cały kokpit, psuje cudze ekrany; tę
	 * lekcję odrobiliśmy w 0.38.0 na własnej skórze, tyle że od drugiej
	 * strony (arkusz Tutora łamał stronę główną).
	 *
	 * @param string $uchwyt Identyfikator ekranu kokpitu.
	 */
	public static function zasoby( string $uchwyt ): void {
		if ( ! str_contains( $uchwyt, self::STRONA_LISTA ) ) {
			return;
		}

		wp_enqueue_style(
			'aai-sklep-panel',
			AAI_SKLEP_URL . 'assets/panel.css',
			array(),
			AAI_SKLEP_WERSJA
		);
		wp_enqueue_script(
			'aai-sklep-panel',
			AAI_SKLEP_URL . 'assets/panel.js',
			array(),
			AAI_SKLEP_WERSJA,
			true
		);
		wp_localize_script(
			'aai-sklep-panel',
			'aaiSklepPanel',
			array(
				'wybierzOkladke' => __( 'Wybierz okładkę kursu', 'aai-sklep' ),
				'uzyjObrazka'    => __( 'Użyj tego obrazka', 'aai-sklep' ),
				'niezapisane'    => __( 'Masz niezapisane zmiany.', 'aai-sklep' ),
				'znakow'         => __( 'Znaków: %1$s z %2$s', 'aai-sklep' ),
			)
		);

		// Biblioteka mediów — okładkę wybiera się z niej, a nie wkleja adresem
		// (decyzja właściciela 2026-08-25). Prototyp odrzucił wgrywanie tylko
		// dlatego, że nie miał gdzie trzymać plików; WordPress ma.
		if ( str_contains( $uchwyt, self::STRONA_KURS ) ) {
			wp_enqueue_media();
		}
	}

	/**
	 * Pozycja „Edytuj kurs" w pasku administracyjnym na stronie kursu.
	 *
	 * Odpowiednik pigułki „Kreator kursów ADMIN" z prototypu, tyle że
	 * wordpressowy: gość nie ma jej nawet w źródle strony, bo pasek
	 * administracyjny dla niego w ogóle się nie renderuje.
	 *
	 * @param WP_Admin_Bar $pasek Pasek administracyjny.
	 */
	public static function pasek_administracyjny( $pasek ): void {
		if ( is_admin() || 'kurs' !== Aai_Sklep_Trasy::widok() || ! current_user_can( self::UPRAWNIENIE ) ) {
			return;
		}
		$id = Aai_Sklep_Odczyt_Panelu::id_po_slugu( Aai_Sklep_Trasy::slug() );
		if ( null === $id ) {
			return;
		}
		$pasek->add_node(
			array(
				'id'    => 'aai-sklep-edytuj',
				'title' => __( 'Edytuj kurs', 'aai-sklep' ),
				'href'  => self::adres_kursu( $id ),
			)
		);
	}

	/* ————————————————————————— ADRESY ————————————————————————— */

	/**
	 * Adres listy kursów.
	 *
	 * @param array<string,string> $dodatkowe Dodatkowe parametry.
	 */
	public static function adres_listy( array $dodatkowe = array() ): string {
		return add_query_arg(
			array_merge( array( 'page' => self::STRONA_LISTA ), $dodatkowe ),
			admin_url( 'admin.php' )
		);
	}

	/**
	 * Adres edytora kursu.
	 *
	 * @param string               $id        Identyfikator kursu (pusty = nowy).
	 * @param array<string,string> $dodatkowe Dodatkowe parametry.
	 */
	public static function adres_kursu( string $id = '', array $dodatkowe = array() ): string {
		$parametry = array( 'page' => self::STRONA_KURS );
		if ( '' !== $id ) {
			$parametry['id'] = $id;
		}
		return add_query_arg( array_merge( $parametry, $dodatkowe ), admin_url( 'admin.php' ) );
	}

	/**
	 * Adres edytora treści lekcji.
	 *
	 * @param string $id Identyfikator lekcji.
	 */
	public static function adres_lekcji( string $id ): string {
		return add_query_arg(
			array(
				'page' => self::STRONA_LEKCJA,
				'id'   => $id,
			),
			admin_url( 'admin.php' )
		);
	}

	/* ————————————————————————— EKRANY ————————————————————————— */

	/**
	 * Lista kursów.
	 */
	public static function ekran_listy(): void {
		self::brama();
		$kursy = Aai_Sklep_Odczyt_Panelu::kursy();
		require AAI_SKLEP_KATALOG . 'szablony/panel/lista.php';
	}

	/**
	 * Edytor kursu: dane, sekcje, program.
	 */
	public static function ekran_kursu(): void {
		self::brama();

		$id   = isset( $_GET['id'] ) ? sanitize_text_field( wp_unslash( $_GET['id'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$kurs = '' === $id ? self::nowy_kurs() : Aai_Sklep_Odczyt_Panelu::kurs( $id );

		if ( null === $kurs ) {
			self::nie_znaleziono( __( 'Nie ma takiego kursu.', 'aai-sklep' ) );
			return;
		}

		// Odrzucony formularz wraca dokładnie taki, jaki był — razem z tym,
		// czego baza nie przyjęła. Inaczej poprawianie błędu zaczynałoby się
		// od przepisywania wszystkiego od nowa.
		$odrzucony = self::odloz_stan( 'kurs' );
		if ( is_array( $odrzucony ) && ( $odrzucony['id'] ?? '' ) === $id ) {
			$kurs = self::wroc_do_formularza( $kurs, $odrzucony );
		}

		$bledy    = self::odloz_bledy();
		$zakladka = isset( $_GET['zakladka'] ) ? sanitize_key( wp_unslash( $_GET['zakladka'] ) ) : 'kurs'; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		if ( ! in_array( $zakladka, array( 'kurs', 'sekcje', 'program' ), true ) ) {
			$zakladka = 'kurs';
		}

		require AAI_SKLEP_KATALOG . 'szablony/panel/kurs.php';
	}

	/**
	 * Edytor treści lekcji.
	 */
	public static function ekran_lekcji(): void {
		self::brama();

		$id     = isset( $_GET['id'] ) ? sanitize_text_field( wp_unslash( $_GET['id'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$lekcja = '' === $id ? null : Aai_Sklep_Odczyt_Panelu::lekcja( $id );

		if ( null === $lekcja ) {
			self::nie_znaleziono( __( 'Nie ma takiej lekcji.', 'aai-sklep' ) );
			return;
		}

		$odrzucony = self::odloz_stan( 'lekcja' );
		if ( is_array( $odrzucony ) && ( $odrzucony['id'] ?? '' ) === $id ) {
			$lekcja = array_merge( $lekcja, $odrzucony );
		}

		$bledy = self::odloz_bledy();
		$pola  = Aai_Sklep_Kontrakt::pola_lekcji();

		require AAI_SKLEP_KATALOG . 'szablony/panel/lekcja.php';
	}

	/* ————————— przekład między kształtem formularza a kształtem zapisu ————————— */

	/**
	 * Sekcje z bazy → kształt, który przyjmuje kontrakt.
	 *
	 * PO CO WSTAWIAĆ TO W FORMULARZ OD RAZU. Bo pola ukryte z JSON-em są
	 * bezpiecznikiem na wypadek, gdyby skrypt panelu nie wystartował: zapis
	 * odsyła wtedy stan, który właśnie wczytano, więc jest pusty w skutkach.
	 * Gdyby startowały puste, jedno kliknięcie „Zapisz kurs" bez działającego
	 * JavaScriptu skasowałoby wszystkie sekcje i cały program.
	 *
	 * @param array<string,array<string,mixed>> $sekcje Sekcje z odczytu panelu.
	 * @return array<int,array<string,mixed>>
	 */
	public static function sekcje_do_zapisu( array $sekcje ): array {
		$wynik = array();
		foreach ( $sekcje as $rodzaj => $sekcja ) {
			$pola    = Aai_Sklep_Sekcje::pola( (string) $rodzaj );
			$wynik[] = array(
				'id'      => (string) ( $sekcja['id'] ?? '' ),
				'kind'    => (string) $rodzaj,
				'content' => Aai_Sklep_Pola::oczysc(
					$pola,
					Aai_Sklep_Pola::do_formularza( $pola, $sekcja['tresc'] ?? array() )
				),
			);
		}
		return $wynik;
	}

	/**
	 * Program z bazy → kształt, który przyjmuje kontrakt.
	 *
	 * BEZ `content` I `materials` — zapis programu nie ma prawa tknąć
	 * napisanego materiału, a warstwa zapisu rozpoznaje brak tych kluczy
	 * jako „nie ruszaj".
	 *
	 * @param array<int,array<string,mixed>> $moduly Program z odczytu panelu.
	 * @return array<int,array<string,mixed>>
	 */
	public static function program_do_zapisu( array $moduly ): array {
		$wynik = array();
		foreach ( $moduly as $modul ) {
			$lekcje = array();
			foreach ( (array) ( $modul['lekcje'] ?? array() ) as $lekcja ) {
				$lekcje[] = array(
					'id'           => (string) ( $lekcja['id'] ?? '' ),
					'position'     => (int) ( $lekcja['position'] ?? 0 ),
					'title'        => (string) ( $lekcja['title'] ?? '' ),
					'duration_min' => '' === (string) ( $lekcja['duration_min'] ?? '' )
						? null
						: (int) $lekcja['duration_min'],
					'preview'      => ! empty( $lekcja['preview'] ),
				);
			}
			$wynik[] = array(
				'id'       => (string) ( $modul['id'] ?? '' ),
				'position' => (int) ( $modul['position'] ?? 0 ),
				'title'    => (string) ( $modul['title'] ?? '' ),
				'summary'  => (string) ( $modul['summary'] ?? '' ),
				'lekcje'   => $lekcje,
			);
		}
		return $wynik;
	}

	/**
	 * Odrzucony zapis → stan formularza.
	 *
	 * Kontrakt i formularz mówią o tym samym w dwóch kształtach: kontrakt
	 * listą sekcji, formularz mapą po rodzaju. Bez tego przekładu odrzucony
	 * zapis wracałby do panelu jako pusta strona — czyli kara za literówkę
	 * byłaby większa niż sama literówka.
	 *
	 * `ma_tresc` i liczbę znaków dokładamy Z BAZY po identyfikatorze lekcji:
	 * wysyłka ich nie niesie (i słusznie), a bez nich program po odrzuceniu
	 * pokazywałby każdą napisaną lekcję jako pustą.
	 *
	 * @param array<string,mixed> $kurs      Kurs wczytany z bazy.
	 * @param array<string,mixed> $odrzucony Odrzucona wysyłka.
	 * @return array<string,mixed>
	 */
	private static function wroc_do_formularza( array $kurs, array $odrzucony ): array {
		$stan = $kurs;

		foreach ( array( 'slug', 'title', 'type', 'status', 'short_desc', 'cover_url', 'badge', 'level' ) as $pole ) {
			if ( isset( $odrzucony[ $pole ] ) ) {
				$stan[ $pole ] = (string) $odrzucony[ $pole ];
			}
		}
		if ( isset( $odrzucony['price_grosze'] ) && is_numeric( $odrzucony['price_grosze'] ) ) {
			$stan['price_grosze'] = (int) $odrzucony['price_grosze'];
		}

		if ( is_array( $odrzucony['sekcje'] ?? null ) ) {
			$sekcje = array();
			foreach ( $odrzucony['sekcje'] as $sekcja ) {
				$rodzaj = (string) ( $sekcja['kind'] ?? '' );
				if ( '' === $rodzaj ) {
					continue;
				}
				$sekcje[ $rodzaj ] = array(
					'id'    => (string) ( $sekcja['id'] ?? '' ),
					'tresc' => (array) ( $sekcja['content'] ?? array() ),
				);
			}
			$stan['sekcje'] = $sekcje;
		}

		if ( is_array( $odrzucony['moduly'] ?? null ) ) {
			// Stan treści lekcji bierzemy z bazy, po identyfikatorze.
			$z_trescia = array();
			foreach ( (array) $kurs['moduly'] as $modul ) {
				foreach ( (array) $modul['lekcje'] as $lekcja ) {
					$z_trescia[ (string) $lekcja['id'] ] = $lekcja;
				}
			}

			$moduly = array();
			foreach ( $odrzucony['moduly'] as $modul ) {
				$lekcje = array();
				foreach ( (array) ( $modul['lekcje'] ?? array() ) as $lekcja ) {
					$id_lekcji = (string) ( $lekcja['id'] ?? '' );
					$z_bazy    = $z_trescia[ $id_lekcji ] ?? array();
					$lekcje[]  = array(
						'id'           => $id_lekcji,
						'position'     => (int) ( $lekcja['position'] ?? 0 ),
						'title'        => (string) ( $lekcja['title'] ?? '' ),
						'duration_min' => (string) ( $lekcja['duration_min'] ?? '' ),
						'preview'      => ! empty( $lekcja['preview'] ),
						'ma_tresc'     => ! empty( $z_bazy['ma_tresc'] ),
						'znakow'       => (int) ( $z_bazy['znakow'] ?? 0 ),
					);
				}
				$moduly[] = array(
					'id'       => (string) ( $modul['id'] ?? '' ),
					'position' => (int) ( $modul['position'] ?? 0 ),
					'title'    => (string) ( $modul['title'] ?? '' ),
					'summary'  => (string) ( $modul['summary'] ?? '' ),
					'lekcje'   => $lekcje,
				);
			}
			$stan['moduly'] = $moduly;
		}

		return $stan;
	}

	/* ————————————————————————— POMOCNICZE ————————————————————————— */

	/**
	 * Brama uprawnień na każdym ekranie.
	 *
	 * WordPress i tak nie pokaże pozycji menu bez uprawnienia, ale adres
	 * ekranu jest zwyczajnym adresem — a „nie ma linku" nie jest kontrolą
	 * dostępu.
	 */
	private static function brama(): void {
		if ( ! current_user_can( self::UPRAWNIENIE ) ) {
			wp_die(
				esc_html__( 'Nie masz uprawnień do zarządzania kursami.', 'aai-sklep' ),
				esc_html__( 'Brak uprawnień', 'aai-sklep' ),
				array( 'response' => 403 )
			);
		}
	}

	/**
	 * Ekran „nie ma takiej rzeczy".
	 *
	 * @param string $komunikat Co dokładnie się nie znalazło.
	 */
	private static function nie_znaleziono( string $komunikat ): void {
		echo '<div class="wrap"><h1>' . esc_html__( 'Automatic AI', 'aai-sklep' ) . '</h1>';
		echo '<div class="notice notice-error"><p>' . esc_html( $komunikat ) . '</p></div>';
		echo '<p><a class="button" href="' . esc_url( self::adres_listy() ) . '">'
			. esc_html__( 'Wróć do listy kursów', 'aai-sklep' ) . '</a></p></div>';
	}

	/**
	 * Świeży kurs — puste pola, stan „szkic".
	 *
	 * @return array<string,mixed>
	 */
	private static function nowy_kurs(): array {
		return array(
			'id'           => '',
			'slug'         => '',
			'title'        => '',
			'type'         => 'kurs',
			'short_desc'   => '',
			'price_grosze' => 0,
			'cover_url'    => '',
			'status'       => 'draft',
			'badge'        => '',
			'level'        => '',
			'sekcje'       => array(),
			'moduly'       => array(),
		);
	}

	/* ———————— przenoszenie odrzuconego formularza przez przekierowanie ———————— */

	/**
	 * Klucz krótkiej pamięci na odrzucony formularz.
	 *
	 * @param string $co „kurs" albo „lekcja".
	 */
	private static function klucz( string $co ): string {
		return 'aai_sklep_' . $co . '_' . get_current_user_id();
	}

	/**
	 * Zapamiętuje odrzucony formularz i jego błędy (woła akcja zapisu).
	 *
	 * @param string               $co    „kurs" albo „lekcja".
	 * @param array<string,mixed>  $stan  Odrzucone dane.
	 * @param array<string,string> $bledy Błędy pól.
	 */
	public static function zapamietaj( string $co, array $stan, array $bledy ): void {
		set_transient( self::klucz( $co ), $stan, 5 * MINUTE_IN_SECONDS );
		set_transient( self::klucz( 'bledy' ), $bledy, 5 * MINUTE_IN_SECONDS );
	}

	/**
	 * Odbiera zapamiętany formularz i od razu go kasuje.
	 *
	 * @param string $co „kurs" albo „lekcja".
	 * @return array<string,mixed>|null
	 */
	private static function odloz_stan( string $co ) {
		$stan = get_transient( self::klucz( $co ) );
		delete_transient( self::klucz( $co ) );
		return is_array( $stan ) ? $stan : null;
	}

	/**
	 * Odbiera zapamiętane błędy i od razu je kasuje.
	 *
	 * @return array<string,string>
	 */
	private static function odloz_bledy(): array {
		$bledy = get_transient( self::klucz( 'bledy' ) );
		delete_transient( self::klucz( 'bledy' ) );
		return is_array( $bledy ) ? $bledy : array();
	}

	/**
	 * Ostrzeżenie, gdy kopia kursu w Tutorze nie nadążyła.
	 *
	 * PO CO OSOBNY KOMUNIKAT. Kopia dla LMS-a jedzie SKUTKIEM zapisu, a nie
	 * jego warunkiem — awaria Tutora nie ma prawa wywalić właścicielowi
	 * zapisu własnej treści (patrz `Aai_Sklep_Tutor`). Cena tej decyzji jest
	 * taka, że nieudana kopia byłaby NIEWIDOCZNA: zapis melduje sukces,
	 * a klient po zalogowaniu czyta starą wersję. Dlatego błąd zostaje
	 * zapamiętany i pokazujemy go tutaj, dopóki nie uda się następna kopia.
	 */
	public static function stan_kopii(): void {
		if ( ! class_exists( 'Aai_Sklep_Tutor' ) ) {
			return;
		}
		$blad = Aai_Sklep_Tutor::ostatni_blad();
		if ( null === $blad ) {
			return;
		}
		printf(
			'<div class="notice notice-warning"><p><strong>%s</strong> %s</p><p><code>wp aai-sklep sync</code> %s</p></div>',
			esc_html__( 'Kopia kursu w Tutor LMS nie nadążyła za ostatnim zapisem.', 'aai-sklep' ),
			esc_html(
				sprintf(
					/* translators: 1: komunikat błędu, 2: data i godzina. */
					__( 'Treść jest bezpieczna w naszych tabelach, ale materiał za logowaniem może być starszy. Powód: %1$s (%2$s).', 'aai-sklep' ),
					$blad['komunikat'],
					$blad['kiedy']
				)
			),
			esc_html__( '— ta komenda naprawia kopię; zapisanie kursu jeszcze raz robi to samo.', 'aai-sklep' )
		);
	}

	/**
	 * Komunikat po przekierowaniu — z parametrów adresu.
	 *
	 * Sam TEKST nie jedzie w adresie: przenosimy kod, a treść wpisujemy tutaj.
	 * Inaczej adres byłby miejscem, w którym da się wstrzyknąć dowolny napis
	 * z naszego panelu na nasz ekran.
	 */
	public static function komunikat(): void {
		// phpcs:disable WordPress.Security.NonceVerification.Recommended
		$kod = isset( $_GET['aai_komunikat'] ) ? sanitize_key( wp_unslash( $_GET['aai_komunikat'] ) ) : '';
		$ile = isset( $_GET['aai_ile'] ) ? (int) $_GET['aai_ile'] : 0;
		// phpcs:enable WordPress.Security.NonceVerification.Recommended
		if ( '' === $kod ) {
			return;
		}

		$teksty = array(
			'zapisano'        => __( 'Kurs zapisany.', 'aai-sklep' ),
			'bez_zmian'       => __( 'Nic się nie zmieniło — zapis niczego nie ruszył.', 'aai-sklep' ),
			'zapisano_lekcje' => __( 'Treść lekcji zapisana.', 'aai-sklep' ),
			'opublikowano'    => __( 'Kurs opublikowany — jest w katalogu.', 'aai-sklep' ),
			'ukryto'          => __( 'Kurs ukryty — gość dostaje 404.', 'aai-sklep' ),
			'usunieto'        => __( 'Kurs usunięty. Stan sprzed usunięcia został w dzienniku audytu.', 'aai-sklep' ),
			'bledy'           => __( 'Formularz ma błędy — poprawki są zaznaczone przy polach.', 'aai-sklep' ),
			'odmowa_tresci'   => sprintf(
				/* translators: %d: liczba lekcji z napisaną treścią. */
				_n(
					'Ten zapis skasowałby napisaną treść %d lekcji. Potwierdź, jeśli naprawdę o to chodzi.',
					'Ten zapis skasowałby napisaną treść %d lekcji. Potwierdź, jeśli naprawdę o to chodzi.',
					max( 1, $ile ),
					'aai-sklep'
				),
				$ile
			),
			'odmowa_dostepu'  => sprintf(
				/* translators: %d: liczba osób, które kupiły kurs. */
				_n(
					'Ten kurs ma %d kupującego — usunięcie odebrałoby mu dostęp do materiału. Potwierdź, jeśli naprawdę o to chodzi.',
					'Ten kurs ma %d kupujących — usunięcie odebrałoby im dostęp do materiału. Potwierdź, jeśli naprawdę o to chodzi.',
					max( 1, $ile ),
					'aai-sklep'
				),
				$ile
			),
			'blad'            => __( 'Zapis się nie powiódł. Szczegóły niżej.', 'aai-sklep' ),
		);

		if ( ! isset( $teksty[ $kod ] ) ) {
			return;
		}
		$zly = in_array( $kod, array( 'bledy', 'blad', 'odmowa_tresci', 'odmowa_dostepu' ), true );
		printf(
			'<div class="notice notice-%s is-dismissible"><p>%s</p></div>',
			$zly ? 'error' : 'success',
			esc_html( $teksty[ $kod ] )
		);
	}
}
