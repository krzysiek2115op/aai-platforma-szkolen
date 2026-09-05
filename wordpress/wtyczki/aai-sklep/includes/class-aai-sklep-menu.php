<?php
/**
 * Pozycja „Szkolenia" w nawigacji motywu — podmiana nagłówka w locie.
 *
 * DLACZEGO TAK, SKORO TO BRZYDKIE. Bo motyw Automatic AI ma nawigację wpisaną
 * NA SZTYWNO w `header.php`: zero `wp_nav_menu()`, zero `register_nav_menu()`.
 * Standardowe API WordPressa nie ma się gdzie wpiąć. Z pięciu rozważonych dróg
 * (tabela w `docs/ETAP-WP.md`) właściciel wybrał tę — jedyną, która działa bez
 * niczyjej zgody i bez zmian w cudzym repo. Docelowa jest droga 2 (hak
 * `do_action` w generatorze motywu), gdy będzie o co poprosić.
 *
 * TA DROGA JEST KRUCHA I WIEMY O TYM: motyw jest GENEROWANY z builda Next.js,
 * więc każda regeneracja może zmienić klasy Tailwinda i pozycja zniknęłaby
 * PO CICHU. Stąd dwie decyzje projektowe:
 *
 *  1. **Kotwiczymy na TREŚCI, nie na klasie.** `aria-label="Nawigacja główna"`
 *     to etykieta dla czytników ekranu — zmienia się razem ze znaczeniem
 *     elementu, a nie razem z wyglądem. Klasa `lg:flex` zmieni się przy
 *     pierwszym przestawieniu układu.
 *  2. **Klonujemy ostatnią pozycję menu** i podmieniamy w niej adres i napis,
 *     zamiast wpisywać własny markup. Klon ma z definicji te klasy, które
 *     motyw ma DZISIAJ — więc po regeneracji nasza pozycja wygląda jak
 *     sąsiednie, a nie jak relikt poprzedniej wersji.
 *
 * A i tak nie ufamy sobie na słowo: `straznik-frontu-wp` pilnuje kotwic
 * w kodzie, a `smoke-wp-front` sprawdza na ŻYWEJ stronie, że pozycja naprawdę
 * jest w wyjściowym HTML — w pasku i w menu mobilnym.
 *
 * @package Aai_Sklep
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Wstrzykiwanie pozycji menu do nagłówka motywu.
 */
final class Aai_Sklep_Menu {

	/** Napis pozycji. */
	private const NAPIS = 'Szkolenia';

	/** Napis pozycji dla zalogowanego klienta z kursami. */
	private const NAPIS_MOJE = 'Moje kursy';

	/** Napis pozycji konta dla każdego zalogowanego. */
	private const NAPIS_KONTO = 'Moje konto';

	/**
	 * Etykiety nawigacji, do których wstrzykujemy — KOTWICE.
	 *
	 * To treść atrybutu `aria-label`, nie klasa CSS. Zmiana tej listy jest
	 * zmianą kontraktu z motywem i musi iść razem z pomiarem żywej strony.
	 */
	private const KOTWICE = array( 'Nawigacja główna', 'Nawigacja mobilna' );

	/** Czy nasz bufor jest otwarty (żeby zamknąć dokładnie swój). */
	private static bool $bufor_otwarty = false;

	/**
	 * Rejestracja — wołane raz, z pliku głównego wtyczki.
	 */
	public static function zarejestruj(): void {
		// `get_header` biegnie WEWNĄTRZ get_header(), zanim motyw wczyta
		// header.php — czyli zanim powstanie choć jeden znak nagłówka.
		add_action( 'get_header', array( self::class, 'otworz_bufor' ), 0 );
		add_action( 'get_footer', array( self::class, 'zamknij_bufor' ), 0 );
	}

	/**
	 * Otwiera bufor wyjścia.
	 */
	public static function otworz_bufor(): void {
		if ( self::$bufor_otwarty ) {
			return;
		}
		self::$bufor_otwarty = true;
		ob_start( array( self::class, 'wstrzyknij' ) );
	}

	/**
	 * Zamyka bufor.
	 *
	 * Gdyby szablon nie zawołał `get_footer()`, PHP i tak domknie bufor na
	 * koniec żądania i oddzwonienie pobiegnie — wstawka nie ginie, obejmuje
	 * tylko większy kawałek strony. Nic nie kosztuje, bo szukamy kotwicy,
	 * a nie przeglądamy całości.
	 */
	public static function zamknij_bufor(): void {
		if ( ! self::$bufor_otwarty ) {
			return;
		}
		self::$bufor_otwarty = false;
		ob_end_flush();
	}

	/**
	 * Oddzwonienie bufora: wstawia pozycję do każdej znalezionej nawigacji.
	 *
	 * @param string $html Zawartość bufora.
	 */
	public static function wstrzyknij( string $html ): string {
		foreach ( self::KOTWICE as $kotwica ) {
			foreach ( self::pozycje() as $pozycja ) {
				$html = self::wstaw_do_nawigacji( $html, $kotwica, $pozycja );
			}
		}
		return $html;
	}

	/**
	 * Które pozycje wstrzykujemy — i dlaczego czasem dwie.
	 *
	 * „Moje kursy" wchodzi WYŁĄCZNIE zalogowanemu klientowi, który ma choć
	 * jeden kurs. Gościowi nie pokazujemy drzwi, za którymi nic dla niego nie
	 * ma, a właścicielowi bez zakupów — pustej listy. Pozycja powstała
	 * w W6: klient logował się i nie miał JAK trafić do kupionego kursu, bo
	 * jedyną listą był panel Tutora w cudzym wyglądzie.
	 *
	 * @return array<int,array<string,string>>
	 */
	private static function pozycje(): array {
		$pozycje = array(
			array( 'adres' => Aai_Sklep_Widok::adres_kursu(), 'napis' => self::NAPIS, 'widok' => 'katalog' ),
		);

		// `ma_kursy()`, nie `kursy()`: menu potrzebuje odpowiedzi „tak/nie",
		// a policzenie postępu kosztuje 45 zapytań — na każdej odsłonie
		// każdej strony i dwa razy, bo kotwice nawigacji są dwie.
		/*
		 * PYTANIE O KURSY W `try`, BO ODPOWIADA NA NIE CUDZA WTYCZKA.
		 *
		 * `ma_kursy()` pyta Tutora (`get_enrolled_courses_ids_by_user`) i naszą
		 * bazę. Menu wstrzykujemy w nagłówek KAŻDEJ strony, więc rzut stąd
		 * przerywa całe żądanie. ZMIERZONE (rzut wstrzyknięty w `ma_kursy()`):
		 * gość dostaje 200, a ZALOGOWANY KLIENT **HTTP 500 na każdej stronie** —
		 * stronie głównej, katalogu, koszyku, KASIE i własnym koncie. Czyli
		 * awaria cudzej wtyczki albo uszkodzona tabela Tutora zamykają sklep
		 * dokładnie tym ludziom, którzy już zapłacili albo właśnie płacą.
		 *
		 * Przy awarii pozycji po prostu NIE MA. To jest wygoda nawigacyjna, nie
		 * bramka dostępu: kurs zostaje dostępny pod swoim adresem, a witryna
		 * stoi. Ta sama zasada, co przy starcie wtyczki — sklep bez menu jest
		 * gorszy od sklepu z menu i nieporównanie lepszy od białego ekranu.
		 */
		$ma_kursy = false;
		if ( is_user_logged_in() && class_exists( 'Aai_Sklep_Moje' ) ) {
			try {
				$ma_kursy = Aai_Sklep_Moje::ma_kursy();
			} catch ( Throwable $e ) {
				$ma_kursy = false;
				error_log( 'aai-sklep: nie udało się sprawdzić kursów klienta do menu: ' . $e->getMessage() ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			}
		}
		if ( $ma_kursy ) {
			$pozycje[] = array(
				'adres' => Aai_Sklep_Moje::adres(),
				'napis' => self::NAPIS_MOJE,
				'widok' => 'moje',
			);
		}

		/*
		 * „Moje konto" — droga POWROTNA do zamówień i ustawień (zgłoszenie
		 * właściciela z testu P6, decyzja 2026-08-30). Do tej zmiany drzwi
		 * były jednokierunkowe: strona konta miała „Moje kursy" jako
		 * pierwszą pozycję, ale z „Moich kursów" ani z lekcji NIC nie
		 * prowadziło z powrotem — klient wpisywał adres z palca.
		 *
		 * Dla KAŻDEGO zalogowanego, nie tylko klienta z kursem: konto ma
		 * każdy, kto się zalogował, a klient czekający na przelew ma tam
		 * swoje zamówienie, choć kursu jeszcze nie widzi.
		 */
		if ( is_user_logged_in() && function_exists( 'wc_get_page_permalink' ) ) {
			$adres_konta = (string) wc_get_page_permalink( 'myaccount' );
			if ( '' !== $adres_konta ) {
				$pozycje[] = array(
					'adres' => $adres_konta,
					'napis' => self::NAPIS_KONTO,
					'widok' => 'konto',
				);
			}
		}

		return $pozycje;
	}

	/**
	 * Wstawia pozycję do listy w nawigacji o podanej etykiecie.
	 *
	 * @param string $html     Zawartość bufora.
	 * @param string $etykieta Treść `aria-label` nawigacji.
	 */
	private static function wstaw_do_nawigacji( string $html, string $etykieta, array $pozycja ): string {
		$kotwica = 'aria-label="' . $etykieta . '"';
		$poz     = strpos( $html, $kotwica );
		if ( false === $poz ) {
			return $html;
		}

		// Pierwsza lista PO kotwicy to lista pozycji menu; jej zamknięcie
		// szukamy licząc zagnieżdżenia, bo menu mobilne ma podlistę usług
		// i „pierwsze `</ul>`" trafiłoby w nią, nie w listę główną.
		$poz_ul = strpos( $html, '<ul', $poz );
		if ( false === $poz_ul ) {
			return $html;
		}
		$koniec_ul = self::koniec_elementu( $html, $poz_ul, 'ul' );
		if ( null === $koniec_ul ) {
			return $html;
		}

		$wstawka = self::pozycja( $html, $poz_ul, $koniec_ul, $pozycja );

		// Wstawiamy PRZED zamykającym `</ul>`, czyli jako ostatnia pozycja.
		$przed_zamknieciem = strrpos( substr( $html, 0, $koniec_ul ), '</ul' );
		if ( false === $przed_zamknieciem ) {
			return $html;
		}

		return substr( $html, 0, $przed_zamknieciem )
			. $wstawka
			. substr( $html, $przed_zamknieciem );
	}

	/**
	 * Markup naszej pozycji: klon ostatniej pozycji listy albo, gdy klon się
	 * nie uda, prosty odnośnik.
	 *
	 * @param string $html      Zawartość bufora.
	 * @param int    $poz_ul    Pozycja `<ul`.
	 * @param int    $koniec_ul Pozycja tuż za `</ul>`.
	 */
	private static function pozycja( string $html, int $poz_ul, int $koniec_ul, array $co ): string {
		$klon = self::sklonuj_ostatnia( $html, $poz_ul, $koniec_ul, $co );
		if ( null !== $klon ) {
			return $klon;
		}

		// Awaria: motyw zmienił się tak, że nie ma czego klonować. Pozycja
		// wchodzi bez klas — wygląda surowo, ale JEST, a `smoke-wp-front`
		// sprawdza jej obecność, nie urodę.
		return '<li><a href="' . esc_url( $co['adres'] ) . '"'
			. self::biezaca( $co['widok'] ) . '>' . esc_html( $co['napis'] ) . '</a></li>';
	}

	/**
	 * Klonuje ostatnią pozycję listy i podmienia w niej adres, napis, numer
	 * porządkowy i opóźnienie animacji.
	 *
	 * @param string $html      Zawartość bufora.
	 * @param int    $poz_ul    Pozycja `<ul`.
	 * @param int    $koniec_ul Pozycja tuż za `</ul>`.
	 */
	private static function sklonuj_ostatnia( string $html, int $poz_ul, int $koniec_ul, array $co ): ?string {
		$lista = substr( $html, $poz_ul, $koniec_ul - $poz_ul );

		// Ostatnia pozycja NAJWYŻSZEGO poziomu: idziemy od początku listy
		// i za każdym razem przeskakujemy całą pozycję razem z podlistami.
		$ostatnia = null;
		$offset   = strpos( $lista, '>' );
		if ( false === $offset ) {
			return null;
		}
		while ( true ) {
			$poz_li = strpos( $lista, '<li', $offset );
			if ( false === $poz_li ) {
				break;
			}
			$koniec_li = self::koniec_elementu( $lista, $poz_li, 'li' );
			if ( null === $koniec_li ) {
				break;
			}
			$ostatnia = substr( $lista, $poz_li, $koniec_li - $poz_li );
			$offset   = $koniec_li;
		}

		if ( null === $ostatnia || ! str_contains( $ostatnia, '<a' ) ) {
			return null;
		}

		/*
		 * ZDEJMUJEMY `aria-current` Z KLONU. Drugi przebieg (pozycja „Moje
		 * kursy") klonuje ostatnie `<li>` listy, czyli pozycję wstawioną
		 * przed chwilą — a ta na naszych stronach nosi już `aria-current`.
		 * Podmiana adresu doklejała nasze `aria-current` obok cudzego, więc
		 * na `/szkolenia/` bieżące były OBIE pozycje naraz i skrypt motywu
		 * podświetlał dwie. Zmierzone na żywej stronie: katalog 2, strona
		 * kursu 2, „Moje kursy" 1.
		 */
		$klon = (string) preg_replace( '~\s*aria-current="[^"]*"~', '', $ostatnia );

		// 1. adres
		$klon = preg_replace(
			'~href="[^"]*"~',
			'href="' . esc_url( $co['adres'] ) . '"' . self::biezaca( $co['widok'] ),
			$klon,
			1
		);

		// 2. numer porządkowy menu mobilnego (`>07<` → `>08<`)
		$klon = preg_replace_callback(
			'~>(\d{2})<~',
			static fn( array $t ): string => '>' . str_pad(
				(string) ( (int) $t[1] + 1 ),
				2,
				'0',
				STR_PAD_LEFT
			) . '<',
			(string) $klon,
			1
		);

		// 3. opóźnienie kaskady menu mobilnego — kolejny krok tej samej serii
		$klon = preg_replace_callback(
			'~--menu-delay:\s*([0-9.]+)s~',
			static fn( array $t ): string => '--menu-delay: '
				. rtrim( rtrim( number_format( (float) $t[1] + 0.05, 4, '.', '' ), '0' ), '.' ) . 's',
			(string) $klon,
			1
		);

		// 4. napis — tekst tuż przed `</a>`. Zawartość odnośnika bierzemy
		//    NIEZACHŁANNIE do pierwszego `</a>`: pozycja menu może nieść
		//    podlistę z własnymi odnośnikami, a wtedy zachłanne dopasowanie
		//    podmieniłoby napis w cudzej pozycji, nie w naszym klonie.
		$klon = preg_replace_callback(
			'~(<a\b[^>]*>)(.*?)(</a>)~s',
			static function ( array $t ) use ( $co ): string {
				$wnetrze = $t[2];
				$ostatni = strrpos( $wnetrze, '>' );
				$przed   = false === $ostatni ? '' : substr( $wnetrze, 0, $ostatni + 1 );
				return $t[1] . $przed . esc_html( $co['napis'] ) . $t[3];
			},
			(string) $klon,
			1
		);

		return is_string( $klon ) ? $klon : null;
	}

	/**
	 * `aria-current` na naszych stronach — tego atrybutu szuka skrypt motywu,
	 * podświetlając aktywną pozycję menu.
	 */
	private static function biezaca( string $widok ): string {
		/*
		 * Strona konta nie jest naszą trasą (`Aai_Sklep_Trasy::widok()`
		 * oddaje tam null), więc pytamy WooCommerce. `is_account_page()`
		 * obejmuje też podstrony konta (zamówienia, edycję danych).
		 */
		if ( 'konto' === $widok ) {
			return function_exists( 'is_account_page' ) && is_account_page() ? ' aria-current="page"' : '';
		}
		$biezacy = Aai_Sklep_Trasy::widok();
		if ( null === $biezacy ) {
			return '';
		}
		/*
		 * Katalog i strona kursu podświetlają „Szkolenia", widok „Moje kursy"
		 * podświetla siebie. Bez tego rozróżnienia obie pozycje byłyby
		 * bieżące naraz, a skrypt motywu podświetliłby dwie.
		 */
		$pasuje = 'moje' === $widok ? 'moje' === $biezacy : 'moje' !== $biezacy;
		return $pasuje ? ' aria-current="page"' : '';
	}

	/**
	 * Pozycja tuż za zamknięciem elementu otwartego na `$start`.
	 *
	 * Liczymy zagnieżdżenia, bo „pierwsze `</ul>`" po `<ul>` z podlistą
	 * zamyka podlistę, nie tę listę. Ten sam błąd na `<li>` wybrałby
	 * pozycję z podmenu zamiast ostatniej pozycji menu.
	 *
	 * @param string $html  Przeszukiwany HTML.
	 * @param int    $start Pozycja znacznika otwierającego.
	 * @param string $tag   Nazwa znacznika.
	 */
	private static function koniec_elementu( string $html, int $start, string $tag ): ?int {
		$wzorzec    = '~<' . $tag . '\b|</' . $tag . '\s*>~i';
		$glebokosc  = 0;
		$offset     = $start;
		$trafienia  = array();

		while ( preg_match( $wzorzec, $html, $trafienia, PREG_OFFSET_CAPTURE, $offset ) ) {
			$znacznik = $trafienia[0][0];
			$poz      = (int) $trafienia[0][1];
			$offset   = $poz + strlen( $znacznik );

			if ( str_starts_with( $znacznik, '</' ) ) {
				--$glebokosc;
				if ( 0 === $glebokosc ) {
					return $offset;
				}
			} else {
				++$glebokosc;
			}
		}
		return null;
	}
}
