<?php
/**
 * Ekran monitoringu w kokpicie — CZYSTY ODCZYT (N1).
 *
 * Jedyne, co można na tym ekranie zrobić, to patrzeć: zero akcji
 * `admin-post.php`, zero `wp_ajax_*`, zero formularzy `method="post"`,
 * zero nonce'ów. Filtry i stronicowanie jadą parametrami GET — formularz
 * `method="get"` jest dozwolony, bo niezmiennik celuje w ZAPIS, nie
 * w znacznik.
 *
 * D1 (decyzja właściciela 2026-08-30): panel mieszka w KOKPICIE, jak
 * kreator z W4 — nie na froncie. Zero nowych publicznych adresów,
 * zero zmian w `Aai_Sklep_Trasy::PODSTRONY`.
 *
 * D4: pokazujemy TYLKO nasze dwie rzeczy — logowania i ruch. Sprzedaż
 * ma raporty w WooCommerce; druga kopia tych liczb wymagałaby kontroli
 * rozjazdu i kłamałaby przy pierwszej rozbieżności.
 *
 * @package Aai_Monitor
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Podstrona kokpitu.
 */
final class Aai_Monitor_Ekran {

	/**
	 * Slug naszej podstrony.
	 */
	public const STRONA = 'aai-monitor';

	/**
	 * Uprawnienie: to samo, którym kreator wpuszcza do sklepu.
	 *
	 * Osobnej roli „redaktora kursów" NIE BĘDZIE (decyzja właściciela
	 * 2026-08-30): konta i role ma WordPress, a druga kopia uprawnień to
	 * druga rzecz do utrzymywania.
	 */
	public const UPRAWNIENIE = 'manage_options';

	/**
	 * Slug menu Pluginu 1, pod które się podczepiamy, gdy jest.
	 */
	private const RODZIC = 'aai-sklep';

	/**
	 * Transient strzegący drugiego wyzwalacza retencji.
	 */
	private const TRANSIENT_RETENCJI = 'aai_monitor_retencja_dnia';

	/**
	 * Czujki, które faktycznie rejestrują dane.
	 *
	 * PO CO TO ISTNIEJE. Pusty ekran nie odróżnia „nikt nie próbował" od
	 * „nic nie zbiera" (P13), a różnica jest zasadnicza: pierwsze to
	 * dobra wiadomość, drugie to awaria. Producenci danych — haki
	 * logowania (T2) i endpoint beaconu (T3) — meldują się tutaj przy
	 * rejestracji, a ekran mówi wprost, co dziś działa. Dzięki temu
	 * zdanie na ekranie nie jest tekstem do ręcznej aktualizacji, tylko
	 * odbiciem stanu kodu.
	 *
	 * @var array<string,string>
	 */
	private static array $czujki = array();

	/**
	 * Melduje działającą czujkę.
	 *
	 * @param string $klucz Identyfikator, np. `logowania`.
	 * @param string $opis  Zdanie dla człowieka.
	 */
	public static function zglos_czujke( string $klucz, string $opis ): void {
		self::$czujki[ $klucz ] = $opis;
	}

	/**
	 * Zameldowane czujki.
	 *
	 * @return array<string,string>
	 */
	public static function czujki(): array {
		return self::$czujki;
	}

	/**
	 * Pozycja w menu kokpitu.
	 *
	 * Podpinamy się pod menu Pluginu 1, gdy istnieje — właściciel ma
	 * jedno miejsce „Automatic AI", nie dwa. Gdy sklepu nie ma, stawiamy
	 * własną pozycję: wtyczka monitoringu nie może zniknąć z kokpitu
	 * dlatego, że ktoś wyłączył inną wtyczkę.
	 *
	 * Pytamy o ISTNIENIE MENU (`$admin_page_hooks`), nie o nazwę klasy:
	 * klasa może być wczytana, a menu niezarejestrowane — wtedy
	 * `add_submenu_page` wpiąłby nas w nicość i strona oddałaby 403.
	 */
	public static function menu(): void {
		$rodzic = isset( $GLOBALS['admin_page_hooks'][ self::RODZIC ] ) ? self::RODZIC : null;

		if ( null !== $rodzic ) {
			add_submenu_page(
				$rodzic,
				__( 'Monitoring', 'aai-monitor' ),
				__( 'Monitoring', 'aai-monitor' ),
				self::UPRAWNIENIE,
				self::STRONA,
				array( self::class, 'ekran' )
			);
			return;
		}

		add_menu_page(
			__( 'Automatic AI — monitoring', 'aai-monitor' ),
			__( 'Monitoring', 'aai-monitor' ),
			self::UPRAWNIENIE,
			self::STRONA,
			array( self::class, 'ekran' ),
			'dashicons-visibility',
			31
		);
	}

	/**
	 * Arkusz — WYŁĄCZNIE na naszym ekranie.
	 *
	 * Wtyczka, która wpycha swój CSS w cały kokpit, psuje cudze ekrany;
	 * tę lekcję odrobiliśmy w 0.38.0 od drugiej strony (arkusz Tutora
	 * łamał stronę główną). Arkusz kreatora Pluginu 1 tu nie wejdzie —
	 * `Aai_Sklep_Panel::zasoby()` wychodzi na uchwytach spoza `aai-sklep`,
	 * a nasz uchwyt to `…_page_aai-monitor`.
	 *
	 * @param string $uchwyt Identyfikator ekranu kokpitu.
	 */
	public static function zasoby( string $uchwyt ): void {
		if ( ! str_contains( $uchwyt, self::STRONA ) ) {
			return;
		}
		wp_enqueue_style(
			'aai-monitor-panel',
			AAI_MONITOR_URL . 'assets/panel.css',
			array(),
			AAI_MONITOR_WERSJA
		);
	}

	/**
	 * Renderuje ekran.
	 */
	public static function ekran(): void {
		if ( ! current_user_can( self::UPRAWNIENIE ) ) {
			wp_die( esc_html__( 'Brak uprawnień.', 'aai-monitor' ) );
		}

		self::retencja_raz_dziennie();

		$stan   = Aai_Monitor_Odczyt::podsumowanie();
		$czujki = self::czujki();
		// Filtr jedzie GET-em; to odczyt, więc nonce nie ma czego chronić.
		$tylko_porazki = isset( $_GET['porazki'] ) && '1' === $_GET['porazki']; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$wiersze       = Aai_Monitor_Odczyt::logowania( 20, $tylko_porazki );

		echo '<div class="wrap aai-monitor">';
		printf( '<h1>%s</h1>', esc_html__( 'Monitoring', 'aai-monitor' ) );

		if ( array() === $czujki ) {
			printf(
				'<div class="notice notice-info inline"><p>%s</p></div>',
				esc_html__( 'Baza monitoringu stoi, ale nic jeszcze nie zbiera danych — żadna czujka nie jest podpięta. Pusta lista poniżej znaczy więc „nie ma czego pokazać", a nie „nikt nie próbował".', 'aai-monitor' )
			);
		} else {
			printf(
				'<p class="aai-monitor-czujki">%s <strong>%s</strong></p>',
				esc_html__( 'Zbieramy:', 'aai-monitor' ),
				esc_html( implode( ', ', $czujki ) )
			);
		}

		self::kafelki( $stan );
		self::sekcja_logowan( $stan, $wiersze, $tylko_porazki );
		self::sekcja_ruchu( $stan );

		echo '</div>';
	}

	/* ————————————————————————— części ekranu ————————————————————————— */

	/**
	 * Liczby na wierzchu.
	 *
	 * @param array<string,array<string,mixed>> $stan Podsumowanie z działu.
	 */
	private static function kafelki( array $stan ): void {
		$kafelki = array(
			array(
				'etykieta' => __( 'Logowania razem', 'aai-monitor' ),
				'wartosc'  => (int) $stan['logowania']['razem'],
				'alarm'    => false,
			),
			array(
				'etykieta' => __( 'Nieudane próby (7 dni)', 'aai-monitor' ),
				'wartosc'  => (int) $stan['logowania']['porazki_7dni'],
				// Jedyna funkcja alarmowa tego ekranu — dlatego wyróżniona
				// dopiero, gdy naprawdę jest co pokazać.
				'alarm'    => $stan['logowania']['porazki_7dni'] > 0,
			),
			array(
				'etykieta' => __( 'Odsłony', 'aai-monitor' ),
				'wartosc'  => (int) $stan['wizyty']['razem'],
				'alarm'    => false,
			),
			array(
				'etykieta' => __( 'Sesje', 'aai-monitor' ),
				'wartosc'  => (int) $stan['wizyty']['sesje'],
				'alarm'    => false,
			),
		);

		echo '<div class="aai-monitor-kafelki">';
		foreach ( $kafelki as $kafelek ) {
			printf(
				'<div class="aai-monitor-kafelek%s"><span class="aai-monitor-liczba">%s</span><span class="aai-monitor-etykieta">%s</span></div>',
				$kafelek['alarm'] ? ' aai-monitor-alarm' : '',
				esc_html( number_format_i18n( $kafelek['wartosc'] ) ),
				esc_html( $kafelek['etykieta'] )
			);
		}
		echo '</div>';
	}

	/**
	 * Sekcja „Logowania".
	 *
	 * @param array<string,array<string,mixed>> $stan          Podsumowanie.
	 * @param array<int,array<string,mixed>>    $wiersze       Ostatnie wpisy.
	 * @param bool                              $tylko_porazki Czy filtr włączony.
	 */
	private static function sekcja_logowan( array $stan, array $wiersze, bool $tylko_porazki ): void {
		echo '<h2>' . esc_html__( 'Logowania', 'aai-monitor' ) . '</h2>';

		// Formularz GET — to odczyt, nie akcja (N1).
		echo '<form method="get" class="aai-monitor-filtr">';
		printf( '<input type="hidden" name="page" value="%s" />', esc_attr( self::STRONA ) );
		printf(
			'<label><input type="checkbox" name="porazki" value="1" %s onchange="this.form.submit()" /> %s</label>',
			checked( $tylko_porazki, true, false ),
			esc_html__( 'tylko nieudane', 'aai-monitor' )
		);
		echo '</form>';

		if ( array() === $wiersze ) {
			printf(
				'<p class="aai-monitor-pusto">%s</p>',
				esc_html__( 'Ani jednego wpisu.', 'aai-monitor' )
			);
			return;
		}

		echo '<table class="widefat striped aai-monitor-tabela"><thead><tr>';
		foreach ( array(
			__( 'Kiedy (UTC)', 'aai-monitor' ),
			__( 'Zdarzenie', 'aai-monitor' ),
			__( 'Kto', 'aai-monitor' ),
			__( 'Źródło', 'aai-monitor' ),
			__( 'Skąd', 'aai-monitor' ),
		) as $naglowek ) {
			printf( '<th>%s</th>', esc_html( $naglowek ) );
		}
		echo '</tr></thead><tbody>';

		foreach ( $wiersze as $w ) {
			$nieudane = 'nieudane' === ( $w['zdarzenie'] ?? '' );
			printf(
				'<tr><td>%s</td><td><span class="aai-monitor-plakietka%s">%s</span></td><td>%s</td><td>%s</td><td>%s<br /><span class="aai-monitor-agent">%s</span></td></tr>',
				esc_html( (string) ( $w['czas'] ?? '' ) ),
				$nieudane ? ' aai-monitor-plakietka-zla' : '',
				esc_html( (string) ( $w['zdarzenie'] ?? '' ) ),
				esc_html( self::kto( $w ) ),
				esc_html( (string) ( $w['zrodlo'] ?? '' ) ),
				esc_html( (string) ( $w['ip'] ?? '' ) ),
				esc_html( (string) ( $w['agent'] ?? '' ) )
			);
		}
		echo '</tbody></table>';

		if ( '' !== $stan['logowania']['ostatnie'] ) {
			printf(
				'<p class="description">%s</p>',
				esc_html(
					sprintf(
						/* translators: %d: liczba dni retencji. */
						__( 'Wpisy starsze niż %d dni są kasowane automatycznie — do 90 dni od ostatniej aktywności, bo sprzątanie biegnie przy zapisie i przy otwarciu tego ekranu.', 'aai-monitor' ),
						Aai_Monitor_Tabele::OKNO_LOGOWANIA_DNI
					)
				)
			);
		}
	}

	/**
	 * Sekcja „Ruch".
	 *
	 * @param array<string,array<string,mixed>> $stan Podsumowanie.
	 */
	private static function sekcja_ruchu( array $stan ): void {
		echo '<h2>' . esc_html__( 'Ruch', 'aai-monitor' ) . '</h2>';

		if ( 0 === (int) $stan['wizyty']['razem'] ) {
			printf(
				'<p class="aai-monitor-pusto">%s</p>',
				esc_html__( 'Ani jednej odsłony.', 'aai-monitor' )
			);
			return;
		}

		printf(
			'<p>%s</p>',
			esc_html(
				sprintf(
					/* translators: 1: liczba odsłon, 2: liczba sesji, 3: data ostatniej odsłony. */
					__( 'Odsłon: %1$s, sesji: %2$s. Ostatnia odsłona: %3$s UTC.', 'aai-monitor' ),
					number_format_i18n( (int) $stan['wizyty']['razem'] ),
					number_format_i18n( (int) $stan['wizyty']['sesje'] ),
					(string) $stan['wizyty']['ostatnia']
				)
			)
		);
	}

	/**
	 * Kto — konto przy sukcesie, podany login przy porażce.
	 *
	 * `user_id` jest jedynym PEWNYM identyfikatorem konta (login bywa
	 * zmieniany), ale przy porażce konta nie ma i wtedy jedyne, co mamy,
	 * to łańcuch wpisany w formularz.
	 *
	 * @param array<string,mixed> $w Wiersz dziennika.
	 */
	private static function kto( array $w ): string {
		$user_id = (int) ( $w['user_id'] ?? 0 );
		if ( $user_id > 0 ) {
			$konto = get_userdata( $user_id );
			return false !== $konto ? $konto->user_login : sprintf( '#%d', $user_id );
		}
		$login = (string) ( $w['login'] ?? '' );
		return '' !== $login ? $login : '—';
	}

	/**
	 * Drugi wyzwalacz retencji — raz na dobę, przy otwarciu ekranu.
	 *
	 * Retencja przy zapisie jest z definicji LENIWA: gdy przez 90 dni nie
	 * ma ani jednego logowania, wiersze z adresami IP czekają na następny
	 * zapis. WP-Cron tego nie ratuje (na cichej stronie potrafi nie wstać
	 * całymi dniami, P7), więc drugim wyzwalaczem jest ten ekran.
	 *
	 * To NIE łamie N1: ekran nie jest powierzchnią akcji (żadnego POST-u,
	 * żadnej akcji, żadnego nonce'a), a sprzątanie robi warstwa zapisu —
	 * jedyne miejsce, które w tej wtyczce w ogóle pisze.
	 */
	private static function retencja_raz_dziennie(): void {
		if ( false !== get_transient( self::TRANSIENT_RETENCJI ) ) {
			return;
		}
		set_transient( self::TRANSIENT_RETENCJI, 1, DAY_IN_SECONDS );
		Aai_Monitor_Zapis::retencja();
	}
}
