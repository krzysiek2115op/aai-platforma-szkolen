<?php
/**
 * Dziennik logowań — trzy haki rdzenia, czyli PRODUCENT danych.
 *
 * Warstwa zapisu stała gotowa od kroku T1; tu mieszka to, co ją wywołuje.
 * Rozdział jest celowy: `Aai_Monitor_Zapis` wie, JAK zapisać (sufity,
 * retencja, kanał błędów), a ta klasa wie, KIEDY — i to ona rozmawia
 * z cudzym kodem.
 *
 * DLACZEGO DWA HAKI NA SUKCES, a nie jeden. Zmierzone na WP 6.9.4
 * i WooCommerce 11.0.1 (fakty F1, F3, F4 schematu):
 *
 *   - logowanie formularzem odpala `set_logged_in_cookie`, a chwilę
 *     później, w TYM SAMYM żądaniu, `wp_login`;
 *   - auto-login z kasy (`wc_set_customer_auth_cookie()`) odpala
 *     WYŁĄCZNIE `set_logged_in_cookie` — pomiar tego kroku:
 *     „ŚCIEŻKA KASY: set_logged_in_cookie(user=21)", ani śladu `wp_login`.
 *
 * Sam `wp_login` przegapiłby więc ścieżkę KAŻDEGO nowego klienta, a sam
 * `set_logged_in_cookie` nie odróżniłby formularza od kasy. Dlatego:
 * pierwszy TWORZY wiersz ze źródłem `sesja`, drugi DOPRECYZOWUJE je na
 * `formularz`.
 *
 * `set_logged_in_cookie` NIE odpala się przy każdym żądaniu zalogowanego
 * — zmierzone: pięć kolejnych odsłon `/wp-admin/` na gotowej sesji nie
 * dołożyło ani jednego wpisu. Dziennik rośnie w tempie LOGOWAŃ, nie
 * odsłon.
 *
 * KAŻDY HANDLER W `try/catch ( Throwable )` — to jest wymaganie
 * bezpieczeństwa sklepu, nie higiena kodu (N4, F11). Wyjątek rzucony
 * z `set_logged_in_cookie` WYCHODZI z `wc_set_customer_auth_cookie()`,
 * czyli w żądaniu kasy oznacza HTTP 500 i przerwany zakup. Monitoring
 * ma prawo nie zapisać zdarzenia; nie ma prawa zepsuć transakcji.
 *
 * @package Aai_Monitor
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Haki logowania.
 */
final class Aai_Monitor_Logowania {

	/**
	 * Identyfikator wiersza utworzonego w TYM żądaniu przez `sesja()`.
	 *
	 * Żyje przez jedno żądanie i tylko po to, żeby `formularz()` wiedział,
	 * który wiersz doprecyzować. Zerowanie po użyciu jest istotne: drugie
	 * `wp_login` w tym samym żądaniu (cudza wtyczka logująca programowo)
	 * nie ma nadpisać cudzego wiersza, tylko utworzyć własny.
	 */
	private static int $swiezy_wiersz = 0;

	/**
	 * Konto, do którego należy wiersz z `$swiezy_wiersz`.
	 *
	 * Bez tego `formularz()` doprecyzowywał CUDZY wiersz. Zmierzone
	 * w jednym procesie PHP: `set_logged_in_cookie` dla klienta (ścieżka
	 * kasy, bez `wp_login`), a chwilę później `wp_login` dla admina —
	 * w dzienniku został JEDEN wiersz, z kontem klienta i źródłem
	 * „formularz". Logowanie administratora zniknęło w całości, a wpis
	 * klienta dostał cudzą etykietę.
	 *
	 * W żądaniu przeglądarki dziś nieosiągalne (rdzeń emituje `wp_login`
	 * zaraz po ciastku, dla tego samego konta), ale osiągalne w każdym
	 * długo żyjącym procesie: WP-CLI, nasze własne bramki, a w przyszłości
	 * każda wtyczka logująca kogoś programowo w środku żądania.
	 */
	private static int $swieze_konto = 0;

	/**
	 * Podpina haki i melduje czujkę.
	 *
	 * Meldunek nie jest ozdobą: bez niego ekran po całym tym kroku dalej
	 * twierdziłby „baza stoi, ale nic nie zbiera" (P13). Zdanie na ekranie
	 * ma być odbiciem stanu KODU, nie tekstem do ręcznej aktualizacji.
	 */
	public static function zarejestruj(): void {
		/*
		 * PRIORYTET 1, nie domyślne 10. Dziennik bezpieczeństwa ma zapisać
		 * ZANIM cokolwiek innego dostanie szansę przerwać zdarzenie:
		 * zmierzone — cudzy callback rzucający wyjątek na priorytecie 5
		 * przerywa `do_action()` przed nami i wiersz nie powstaje.
		 * Domknąć tego się nie da (ktoś zawsze może wejść wcześniej), ale
		 * okno zmniejsza się do zera przypadków realnych.
		 *
		 * WARTOŚCI DOMYŚLNE parametrów są tu wymaganiem, nie stylem:
		 * `ArgumentCountError` powstaje PRZY WYWOŁANIU, więc `try` w ciele
		 * metody nigdy się nie zaczyna i wyjątek wychodzi z `do_action()`
		 * — czyli w kasie daje HTTP 500 (zmierzone). Rdzeń podaje dziś
		 * komplet argumentów, ale cudza wtyczka odpalająca hak z mniejszą
		 * liczbą przewróciłaby zakup.
		 *
		 * Czwarty argument `set_logged_in_cookie` to `$user_id` —
		 * sprawdzone w pluggable.php:1167.
		 */
		add_action( 'set_logged_in_cookie', array( self::class, 'sesja' ), 1, 4 );
		add_action( 'wp_login', array( self::class, 'formularz' ), 1, 2 );
		add_action( 'wp_login_failed', array( self::class, 'porazka' ), 1, 2 );

		Aai_Monitor_Ekran::zglos_czujke(
			'logowania',
			__( 'logowania (udane i nieudane)', 'aai-monitor' )
		);
	}

	/**
	 * Powstała sesja — wiersz `udane` ze źródłem `sesja`.
	 *
	 * Źródło `sesja` znaczy „każda sesja spoza formularza" i jest to
	 * definicja OTWARTA, nie lista emiterów: kasa Woo (F3), odnowienie
	 * ciastka po zmianie hasła (F4), rejestracja Tutora (F15, dziś
	 * uśpiona), przyszłe kanały. Zamknięta lista starzałaby się po cichu
	 * — nowy emiter po prostu zniknąłby z dziennika.
	 *
	 * @param string $ciastko     Wartość ciastka (nieużywana).
	 * @param int    $wygasa      Koniec okresu karencji (nieużywany).
	 * @param int    $wygasniecie Wygaśnięcie ciastka (nieużywane).
	 * @param int    $user_id     Konto, dla którego powstała sesja.
	 */
	public static function sesja( $ciastko = '', $wygasa = 0, $wygasniecie = 0, $user_id = 0 ): void {
		try {
			$id = (int) $user_id;
			if ( $id <= 0 ) {
				return;
			}
			$powstal = Aai_Monitor_Zapis::dodaj_logowanie(
				array(
					'zdarzenie' => 'udane',
					'zrodlo'    => 'sesja',
					'user_id'   => $id,
					'login'     => self::login_konta( $id ),
					'ip'        => Aai_Monitor_Zadanie::ip(),
					'agent'     => Aai_Monitor_Zadanie::agent(),
				)
			);
			// Bez udanego zapisu nie ma czego doprecyzowywać, a
			// `insert_id` niósłby wtedy identyfikator CUDZEGO wiersza
			// wstawionego wcześniej w tym samym żądaniu.
			self::$swiezy_wiersz = $powstal ? Aai_Monitor_Zapis::ostatni_id() : 0;
			self::$swieze_konto  = $powstal ? $id : 0;
		} catch ( Throwable $e ) {
			self::przemilcz( $e );
		}
	}

	/**
	 * Logowanie formularzem — doprecyzowuje źródło świeżego wiersza.
	 *
	 * GDY WIERSZA NIE MA, tworzy nowy zamiast robić UPDATE w próżnię.
	 * Dziś każdy znany emiter `wp_login` woła wcześniej
	 * `wp_set_auth_cookie()`, ale to jest ZAŁOŻENIE O CUDZYM KODZIE:
	 * wtyczka logująca programowo (albo przyszła zmiana w rdzeniu) nie ma
	 * przepaść z dziennika bez śladu. Dziennik, który cicho gubi
	 * zdarzenia, jest gorszy niż brak dziennika — bo mu się ufa.
	 *
	 * @param string       $login Login konta.
	 * @param WP_User|null $user  Obiekt konta.
	 */
	public static function formularz( $login = '', $user = null ): void {
		try {
			$id    = self::$swiezy_wiersz;
			$konto = self::$swieze_konto;
			// Zerujemy ZAWSZE, także przed wyjściem: drugie `wp_login`
			// w tym żądaniu ma utworzyć własny wiersz, nie nadpisać ten.
			self::$swiezy_wiersz = 0;
			self::$swieze_konto  = 0;

			$user_id = $user instanceof WP_User ? (int) $user->ID : 0;

			// Doprecyzowujemy TYLKO wiersz tego samego konta. Inaczej
			// logowanie drugiego konta w tym samym procesie przejmowało
			// cudzy wiersz, a własne ginęło bez śladu — a dziennik, który
			// cicho gubi zdarzenia, jest gorszy niż brak dziennika.
			if ( $id > 0 && ( 0 === $user_id || $konto === $user_id ) ) {
				Aai_Monitor_Zapis::uzupelnij_zrodlo( $id, 'formularz' );
				return;
			}

			Aai_Monitor_Zapis::dodaj_logowanie(
				array(
					'zdarzenie' => 'udane',
					'zrodlo'    => 'formularz',
					'user_id'   => $user_id,
					'login'     => (string) $login,
					'ip'        => Aai_Monitor_Zadanie::ip(),
					'agent'     => Aai_Monitor_Zadanie::agent(),
				)
			);
		} catch ( Throwable $e ) {
			self::przemilcz( $e );
		}
	}

	/**
	 * Nieudana próba — wiersz `nieudane` z PODANYM loginem.
	 *
	 * Zapisujemy to, co ktoś wpisał w pole loginu, bo przy porażce konta
	 * nie ma i jest to jedyna informacja o tym, kogo próbowano podszyć —
	 * ale przez `bezpieczny_login()`, bo w tym polu bywa HASŁO.
	 * HASŁA NIE ZAPISUJEMY NIGDY — hak go zresztą nie niesie, ale
	 * niezmiennik N5 pilnuje, żeby nikt go tu nie dołożył „do diagnozy".
	 *
	 * Hak łapie formularz I XML-RPC (F2). CZEGO NIE ŁAPIE — wypisane
	 * wprost, żeby dziennik nie obiecywał kompletu:
	 *   - nieudanego logowania hasłem aplikacji REST (F12): ta ścieżka
	 *     omija `wp_authenticate()`;
	 *   - próby z PUSTYM loginem albo PUSTYM hasłem: rdzeń trzyma dla
	 *     nich listę `$ignore_codes = array( 'empty_username',
	 *     'empty_password' )` (`pluggable.php:712`) i haka wtedy nie
	 *     odpala. Zmierzone: trzy próby (puste hasło / pusty login / złe
	 *     hasło) zostawiają JEDEN wiersz.
	 *
	 * @param string        $login Podany login albo adres e-mail.
	 * @param WP_Error|null $blad  Szczegóły niepowodzenia (nieużywane).
	 */
	public static function porazka( $login = '', $blad = null ): void {
		try {
			Aai_Monitor_Zapis::dodaj_logowanie(
				array(
					'zdarzenie' => 'nieudane',
					// Przy porażce źródło zostaje puste: nie wiemy, czy to
					// formularz, czy XML-RPC, a zgadywanie zamieniłoby
					// kolumnę dowodową w domysł.
					'zrodlo'    => '',
					'user_id'   => 0,
					'login'     => self::bezpieczny_login( (string) $login ),
					'ip'        => Aai_Monitor_Zadanie::ip(),
					'agent'     => Aai_Monitor_Zadanie::agent(),
				)
			);
		} catch ( Throwable $e ) {
			self::przemilcz( $e );
		}
	}

	/* ————————————————————————— wnętrze ————————————————————————— */

	/**
	 * Podany login — dosłownie, gdy wskazuje konto; zamaskowany, gdy nie.
	 *
	 * PO CO. Pole loginu bywa wypełniane HASŁEM: przy autouzupełnianiu,
	 * przy przełączonym układzie klawiatury, przy wklejeniu nie tam.
	 * Rdzeń puszcza taką wartość przez `sanitize_user()`, które w trybie
	 * nieścisłym NIE usuwa `@ ! # $ % & _ -` ani cyfr — zmierzone:
	 * `MojeTajneHaslo#2026` przechodzi bez zmiany i ląduje w dzienniku
	 * jawnym tekstem na 90 dni, widoczne dla każdego z `manage_options`
	 * i obecne w każdej kopii zapasowej bazy.
	 *
	 * To by przeczyło trzem miejscom naraz: obietnicy w tym pliku,
	 * zdaniu w kreatorze polityki prywatności („Nie zapisujemy haseł ani
	 * ich fragmentów") i tekstowi, który czyta osoba, której dane
	 * dotyczą. `wp_users.user_pass` jest zahaszowane — ta kolumna nie.
	 *
	 * DLACZEGO NIE PORÓWNUJEMY Z `$_POST['pwd']`. Bo to znaczyłoby
	 * sięgnąć po hasło, czego zabrania N5 — i słusznie: kod, który raz
	 * dotknie hasła, przy następnej poprawce je zapisze.
	 *
	 * CO ZOSTAJE Z WARTOŚCI DOWODOWEJ. Istniejące konto zapisujemy
	 * dosłownie, bo to sedno pytania „kogo próbowano podszyć". Przy
	 * nieistniejącym zostaje początek i długość — widać wzorzec ataku
	 * (`adm…`, `roo…`, `tes…`), nie widać sekretu.
	 */
	private static function bezpieczny_login( string $podany ): string {
		if ( '' === $podany ) {
			return '';
		}
		if ( false !== get_user_by( 'login', $podany ) || false !== get_user_by( 'email', $podany ) ) {
			return $podany;
		}
		/*
		 * POCZĄTEK POKAZUJEMY TYLKO WTEDY, GDY WARTOŚĆ MOŻE BYĆ LOGINEM.
		 *
		 * Trzy pierwsze znaki pokazują wzorzec ataku (`adm…`, `roo…`, `tes…`)
		 * i po to ta kolumna istnieje. Ale w pole loginu trafia czasem HASŁO
		 * — autouzupełnianie, zły układ klawiatury, pomyłka o jedno pole —
		 * i wtedy te trzy znaki są fragmentem sekretu zapisanym jawnym
		 * tekstem na 90 dni, w każdej kopii bazy, wbrew zdaniu z polityki
		 * prywatności („Nie zapisujemy haseł ani ich fragmentów").
		 *
		 * Rozstrzyga KSZTAŁT wartości, nie zgadywanie intencji: login
		 * WordPressa przechodzi przez `sanitize_user()` w trybie ścisłym bez
		 * zmiany, bo mieści się w `a-z A-Z 0-9 _ . - @` i spacji. Wartość,
		 * która tego nie przechodzi (`MojeTajneHaslo#2026`), sekretem być
		 * może — i wtedy nie zostawiamy z niej ani jednego znaku.
		 *
		 * Nie porównujemy z `$_POST['pwd']` — zabrania tego N5 i słusznie:
		 * kod, który raz dotknie hasła, przy następnej poprawce je zapisze.
		 */
		$wyglada_na_login = ( $podany === sanitize_user( $podany, true ) );

		if ( $wyglada_na_login ) {
			return sprintf(
				'%s…(%d znaków)',
				mb_substr( $podany, 0, 3 ),
				mb_strlen( $podany )
			);
		}

		return sprintf( '…(%d znaków, nie jest loginem)', mb_strlen( $podany ) );
	}

	/**
	 * Login konta albo pusty łańcuch.
	 *
	 * Kolumna `login` przy sukcesie jest wygodą ekranu; PEWNYM
	 * identyfikatorem jest `user_id` (login bywa zmieniany). Dlatego brak
	 * konta nie jest tu błędem — po prostu nie ma czego wpisać.
	 */
	private static function login_konta( int $user_id ): string {
		$konto = get_userdata( $user_id );
		return false !== $konto ? (string) $konto->user_login : '';
	}

	/**
	 * Awaria handlera nie wychodzi na zewnątrz — ale zostawia ślad.
	 *
	 * Zgłoszenie samo jest w `try`, bo kanał błędów pisze do opcji, więc
	 * przy uszkodzonej bazie mógłby rzucić drugi raz. Wyjątek z tego
	 * miejsca trafiłby prosto do kasy (F11), a wtedy monitoring zepsułby
	 * dokładnie to, czego ma pilnować.
	 */
	private static function przemilcz( Throwable $e ): void {
		try {
			Aai_Monitor_Komunikaty::zapisz( 'hak logowania nie zapisał zdarzenia: ' . $e->getMessage() );
		} catch ( Throwable $drugi ) {
			// Świadomie pusto: nie ma już gdzie tego zgłosić, a rzucenie
			// dalej przerwałoby cudze żądanie.
			return;
		}
	}
}
