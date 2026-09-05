<?php
/**
 * „Moje kursy" — strona, na którą trafia klient po zakupie.
 *
 * PO CO ISTNIEJE. Do 0.45.0 kupiony kurs był w systemie, ale klient nie miał
 * jak do niego trafić: logowanie WordPressa wyrzuca na `/my-account/`, a jedyną
 * listą kupionych kursów był panel Tutora — pełnoekranowa aplikacja z własnym
 * paskiem bocznym, własnym nagłówkiem i oknem powitalnym Tutora (ze zrzutem
 * cudzego kursu fotografii i napisem „Hi, Sophia!"). Właściciel znalazł to
 * w teście ręcznym W6 słowami „zalogowałem się na dane klienta i nie widzę
 * kupionego kursu" — i podjął decyzję: robimy WŁASNY widok, a panel Tutora
 * przekierowujemy tutaj.
 *
 * To jest ta sama zasada, którą kierowaliśmy się w W3 i W5: klient nigdy nie
 * ogląda cudzego wyglądu. Tutor zostaje tam, gdzie jest naprawdę potrzebny —
 * trzyma konta, zapisy na kurs i stan ukończenia lekcji. O to go tutaj pytamy
 * i nic więcej od niego nie bierzemy.
 *
 * CZEGO TU NIE MA I DLACZEGO. Nie liczymy postępu sami: `is_completed_lesson()`
 * to stan Tutora i tylko on wie, co klient odhaczył w widoku lekcji (W5).
 * Własny licznik byłby drugą kopią tej samej prawdy — a rozjazd dwóch kopii
 * jest w tym projekcie najdroższą klasą błędu (BLAD-015).
 *
 * @package Aai_Sklep
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Lista kupionych kursów z postępem.
 */
final class Aai_Sklep_Moje {

	/**
	 * Adres widoku — jedno źródło prawdy dla trasy, menu i przekierowań.
	 */
	public const SCIEZKA = 'szkolenia/moje';

	/**
	 * Pełny adres „Moich kursów".
	 */
	public static function adres(): string {
		return user_trailingslashit( home_url( '/' . self::SCIEZKA ) );
	}

	/**
	 * Rejestracja — wołane raz, z pliku głównego wtyczki.
	 */
	/** Klucz naszej pozycji w menu konta WooCommerce. */
	private const KLUCZ_WOO = 'aai-moje-kursy';

	/**
	 * Nazwa parametru, którym niesiemy adres powrotu przez logowanie.
	 */
	public const PARAM_POWROTU = 'aai_po_logowaniu';

	/**
	 * Adres, pod którym klient ma się zalogować.
	 *
	 * NIE `wp_login_url()`. Zgłosił to właściciel (2026-08-29), klikając
	 * „Przejdź do kursu" w mailu: przycisk prowadził na **surowy ekran
	 * logowania WordPressa**, czyli dokładnie w to, czego klient nigdy nie
	 * ma widzieć (decyzja z W6, potwierdzona 2026-08-25). Strona konta
	 * WooCommerce ma nasz wygląd (`assets/woo-motyw.css` + `Aai_Sklep_Styl_Woo`)
	 * i jest tą samą stroną, na którą prowadzi link „Ustaw hasło" z maila —
	 * klient widzi jeden, spójny ekran zamiast dwóch obcych.
	 *
	 * Adres powrotu doklejamy WŁASNYM parametrem, bo szablon logowania Woo
	 * nie ma pola `redirect` (sprawdzone w `templates/myaccount/form-login.php`),
	 * a jego formularz nie ma atrybutu `action` — POST leci pod ten sam adres
	 * razem z parametrami, więc filtr `woocommerce_login_redirect` je zastanie.
	 *
	 * Bez WooCommerce zostaje `wp_login_url()`: Plugin 1 działa samodzielnie
	 * i lepszy surowy ekran niż odnośnik donikąd.
	 *
	 * @param string $cel Adres, na który klient ma wrócić po zalogowaniu.
	 */
	public static function adres_logowania( string $cel = '' ): string {
		if ( ! function_exists( 'wc_get_page_permalink' ) ) {
			return '' === $cel ? wp_login_url() : wp_login_url( $cel );
		}
		$konto = wc_get_page_permalink( 'myaccount' );
		if ( ! is_string( $konto ) || '' === $konto ) {
			return '' === $cel ? wp_login_url() : wp_login_url( $cel );
		}
		return '' === $cel ? $konto : add_query_arg( self::PARAM_POWROTU, rawurlencode( $cel ), $konto );
	}

	/**
	 * Dokąd po zalogowaniu — filtr WooCommerce.
	 *
	 * `wp_validate_redirect` pilnuje, żeby parametr z adresu nie wyprowadził
	 * klienta na cudzą domenę; przy nieznanym celu zostaje zachowanie Woo.
	 *
	 * @param string $adres Adres wyliczony przez WooCommerce.
	 */
	public static function powrot_po_logowaniu( $adres ) {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- odczyt adresu powrotu, bez zmiany stanu.
		$cel = isset( $_GET[ self::PARAM_POWROTU ] ) ? rawurldecode( wp_unslash( (string) $_GET[ self::PARAM_POWROTU ] ) ) : '';
		if ( '' === $cel ) {
			return $adres;
		}
		return wp_validate_redirect( $cel, is_string( $adres ) ? $adres : self::adres() );
	}

	public static function zarejestruj(): void {
		// Panel kursanta Tutora przekierowujemy do nas. `template_redirect`,
		// bo dopiero tam wiadomo, którą stronę WordPress wybrał.
		add_action( 'template_redirect', array( self::class, 'przekieruj_z_panelu' ), 5 );

		// Pozycja w menu konta WooCommerce — patrz `menu_konta()`.
		add_filter( 'woocommerce_account_menu_items', array( self::class, 'menu_konta' ) );
		// Powrót TAM, SKĄD klient przyszedł się zalogować (patrz `adres_logowania`).
		add_filter( 'woocommerce_login_redirect', array( self::class, 'powrot_po_logowaniu' ), 10, 1 );
		add_filter( 'woocommerce_get_endpoint_url', array( self::class, 'adres_pozycji' ), 10, 2 );
	}

	/**
	 * „Moje kursy" w menu konta WooCommerce, jako PIERWSZA pozycja.
	 *
	 * PO CO, skoro pozycja jest już w menu strony. Bo konto to miejsce, do
	 * którego WordPress odsyła klienta po zalogowaniu — i właśnie tam
	 * właściciel szukał kursów w teście ręcznym W6, klikając „Dashboard".
	 * Menu konta mówiło wtedy o zamówieniach, pobraniach i adresach, czyli
	 * o wszystkim poza rzeczą, po którą klient przyszedł.
	 *
	 * Pozycja idzie NA POCZĄTEK, bo dla naszego produktu jest ważniejsza niż
	 * zamówienia — kurs czyta się wiele razy, fakturę ogląda raz.
	 *
	 * @param array<string,string> $pozycje Pozycje menu konta.
	 * @return array<string,string>
	 */
	public static function menu_konta( array $pozycje ): array {
		return array_merge(
			array( self::KLUCZ_WOO => __( 'Moje kursy', 'aai-sklep' ) ),
			$pozycje
		);
	}

	/**
	 * Adres naszej pozycji.
	 *
	 * WooCommerce buduje adresy pozycji menu z ENDPOINTÓW konta, a nasza
	 * strona endpointem nie jest — mieszka pod `/szkolenia/moje/`, przy
	 * reszcie sklepu. Bez tego filtra pozycja prowadziłaby do
	 * `/my-account/aai-moje-kursy/`, czyli do 404.
	 *
	 * @param string $adres     Adres wyliczony przez WooCommerce.
	 * @param string $endpoint  Nazwa endpointu.
	 */
	public static function adres_pozycji( string $adres, string $endpoint ): string {
		return self::KLUCZ_WOO === $endpoint ? self::adres() : $adres;
	}

	/**
	 * Panel Tutora → nasze „Moje kursy".
	 *
	 * DLACZEGO TYLKO PANEL, A NIE CAŁY `/dashboard/*`. Bo pod tym adresem
	 * Tutor trzyma też rzeczy, których nie dublujemy (odzyskiwanie hasła,
	 * ustawienia konta). Przekierowanie wszystkiego odcięłoby klientowi
	 * drogę do nich, a zysk byłby żaden — do tamtych podstron i tak nic
	 * u nas nie prowadzi, skoro pasek boczny Tutora znika razem z panelem.
	 */
	public static function przekieruj_z_panelu(): void {
		if ( ! function_exists( 'tutor_utils' ) ) {
			return;
		}
		$strona_panelu = (int) tutor_utils()->get_option( 'tutor_dashboard_page_id' );
		if ( $strona_panelu <= 0 || ! is_page( $strona_panelu ) ) {
			return;
		}

		$podstrona = (string) get_query_var( 'tutor_dashboard_page' );
		// Pusta podstrona = korzeń panelu; `courses` = lista kupionych kursów.
		// Obie zastępujemy własnym widokiem, resztę zostawiamy Tutorowi.
		if ( '' !== $podstrona && 'courses' !== $podstrona ) {
			return;
		}

		wp_safe_redirect( self::adres(), 302 );
		exit;
	}

	/**
	 * Policzone kursy na czas TEGO żądania.
	 *
	 * `kursy()` kosztuje 45 zapytań i ~19 ms (pomiar na dwóch kursach i 73
	 * lekcjach), bo o stan ukończenia pyta Tutora lekcja po lekcji. Bez tej
	 * pamięci menu wołałoby to dwa razy (raz na kotwicę nawigacji), a na
	 * „Moich kursach" dochodziłoby trzecie wywołanie z szablonu.
	 *
	 * @var array<int,array<string,mixed>>|null
	 */
	private static ?array $pamiec = null;

	/**
	 * Czy zalogowany ma cokolwiek kupionego — TANIO.
	 *
	 * Menu potrzebuje odpowiedzi „tak/nie" na każdej odsłonie każdej strony,
	 * a nie postępu w lekcjach. Pytamy więc o listę zapisów (jedno zapytanie)
	 * i sprawdzamy, czy choć jeden zapis wskazuje kurs, który u NAS istnieje —
	 * bo tylko taki ma co pokazać.
	 *
	 * O STAN SPRZEDAŻY NIE PYTAMY, i to jest sedno. Do 2026-09-05 warunek
	 * brzmiał „istnieje I JEST OPUBLIKOWANY", a rozumowanie pod nim było
	 * świadome: pozycja „Moje kursy" nie ma prowadzić do pustej listy. Tyle
	 * że po decyzji C1 („Ukryj" zdejmuje kurs ze sprzedaży, nie odbiera go
	 * kupującym) lista przestała być pusta — pusty był tylko WYNIK TEGO
	 * WARUNKU. Ukrycie obu kursów zabierało klientowi menu, kafelki i jedyną
	 * drogę do materiału, za który zapłacił, przy dwóch żywych zapisach
	 * w Tutorze. Rozumowanie było poprawne PRZED C1 i nikt do niego nie wrócił.
	 */
	public static function ma_kursy(): bool {
		if ( null !== self::$pamiec ) {
			return array() !== self::$pamiec;
		}

		$uzytkownik = get_current_user_id();
		if ( $uzytkownik <= 0 || ! function_exists( 'tutor_utils' ) ) {
			return false;
		}

		$zapisane = (array) tutor_utils()->get_enrolled_courses_ids_by_user( $uzytkownik );
		if ( ! $zapisane ) {
			return false;
		}

		$nasze = array();
		foreach ( Aai_Sklep_Odczyt::lista_kursow_posiadane() as $kurs ) {
			$nasze[ $kurs['id'] ] = true;
		}

		foreach ( $zapisane as $id_kursu ) {
			$uuid = (string) get_post_meta( (int) $id_kursu, Aai_Sklep_Tutor::META_UUID, true );
			if ( '' !== $uuid && isset( $nasze[ $uuid ] ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Kursy kupione przez zalogowanego klienta, z postępem.
	 *
	 * @return array<int,array<string,mixed>>
	 */
	public static function kursy(): array {
		if ( null !== self::$pamiec ) {
			return self::$pamiec;
		}
		$uzytkownik = get_current_user_id();
		if ( $uzytkownik <= 0 || ! function_exists( 'tutor_utils' ) ) {
			return self::$pamiec = array();
		}

		$zapisane = (array) tutor_utils()->get_enrolled_courses_ids_by_user( $uzytkownik );
		if ( ! $zapisane ) {
			return self::$pamiec = array();
		}

		// Nasze kursy po uuid — dopasowanie idzie po `_aai_zrodlo_uuid`, nie po
		// slugu, tak samo jak synchronizacja do Tutora (slug bywa poprawiany).
		$nasze = array();
		foreach ( Aai_Sklep_Odczyt::lista_kursow_posiadane() as $kurs ) {
			$nasze[ $kurs['id'] ] = $kurs;
		}

		$wynik = array();
		foreach ( $zapisane as $id_kursu ) {
			$id_kursu = (int) $id_kursu;
			$uuid     = (string) get_post_meta( $id_kursu, Aai_Sklep_Tutor::META_UUID, true );
			// Kurs spoza kreatora: klient jest na niego zapisany w Tutorze,
			// ale u NAS takiego wiersza nie ma, więc nie mamy czego pokazać.
			// Milczymy — obietnica „masz dostęp" bez treści byłaby gorsza niż
			// brak kafelka. Kurs UKRYTY tu NIE wpada: jest nasz, klient go
			// kupił i dostaje kafelek z adnotacją o wycofaniu ze sprzedaży.
			if ( '' === $uuid || ! isset( $nasze[ $uuid ] ) ) {
				continue;
			}

			$lekcje      = self::lekcje_kursu( $id_kursu );
			$ukonczonych = 0;
			$dalej       = null;
			foreach ( $lekcje as $lekcja ) {
				if ( tutor_utils()->is_completed_lesson( $lekcja['id'], $uzytkownik ) ) {
					++$ukonczonych;
					continue;
				}
				if ( null === $dalej ) {
					$dalej = $lekcja;
				}
			}

			$wszystkich = count( $lekcje );
			$wynik[]    = array_merge(
				$nasze[ $uuid ],
				array(
					'wszystkich'  => $wszystkich,
					'ukonczonych' => $ukonczonych,
					'procent'     => $wszystkich > 0 ? (int) round( $ukonczonych * 100 / $wszystkich ) : 0,
					// Gdy wszystko odhaczone, „dalej" wraca na początek —
					// kurs czyta się też drugi raz.
					'dalej'       => $dalej ?? ( $lekcje[0] ?? null ),
					'skonczony'   => $wszystkich > 0 && $ukonczonych === $wszystkich,
				)
			);
		}

		return self::$pamiec = $wynik;
	}

	/**
	 * Lekcje kursu w kolejności programu: `[ id, tytul, adres ]`.
	 *
	 * Pytamy o wpisy TUTORA, bo to one mają adresy i to ich dotyczy stan
	 * ukończenia. Kolejność bierzemy z `menu_order`, którą ustawia nasza
	 * synchronizacja — czyli z programu z kreatora.
	 *
	 * @param int $id_kursu Wpis kursu w Tutorze.
	 * @return array<int,array<string,mixed>>
	 */
	private static function lekcje_kursu( int $id_kursu ): array {
		$typy = Aai_Sklep_Tutor::typy();

		$moduly = get_posts(
			array(
				'post_type'   => $typy['modul'],
				'post_status' => 'any',
				'post_parent' => $id_kursu,
				'numberposts' => -1,
				'orderby'     => 'menu_order',
				'order'       => 'ASC',
				'fields'      => 'ids',
			)
		);
		if ( ! $moduly ) {
			return array();
		}

		$lekcje = array();
		foreach ( (array) $moduly as $id_modulu ) {
			$wpisy = get_posts(
				array(
					'post_type'   => $typy['lekcja'],
					'post_status' => 'any',
					'post_parent' => (int) $id_modulu,
					'numberposts' => -1,
					'orderby'     => 'menu_order',
					'order'       => 'ASC',
				)
			);
			foreach ( (array) $wpisy as $wpis ) {
				$lekcje[] = array(
					'id'    => (int) $wpis->ID,
					'tytul' => (string) $wpis->post_title,
					'adres' => (string) get_permalink( $wpis ),
				);
			}
		}
		return $lekcje;
	}
}
