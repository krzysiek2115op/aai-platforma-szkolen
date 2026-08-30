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
	 * Okna ruchu w dobach — skończona lista, bo wartość z adresu idzie
	 * do zapytania o zakres dat.
	 */
	private const OKNA = array( 1, 7, 30 );

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
	/*
	 * WARTOŚĆ DOMYŚLNA NIE JEST OZDOBNIKIEM (A9 z przeglądu T3): ta
	 * metoda wisi na CUDZYM haku, a `admin_enqueue_scripts` odpalone
	 * przez cudzą wtyczkę bez argumentu (albo z `null`) rzuca wtedy
	 * `TypeError` — zmierzone — i wywraca CAŁY kokpit. Wyjątek powstaje
	 * PRZY WYWOŁANIU, więc nie łapie go żaden `try` w środku. Ta sama
	 * lekcja co znalezisko (3) z przeglądu T2, gdzie `Aai_Monitor_Logowania`
	 * dostało wartości domyślne WSZĘDZIE.
	 *
	 * SAMA WARTOŚĆ DOMYŚLNA NIE WYSTARCZA i to też jest zmierzone: broni
	 * przed argumentem POMINIĘTYM, ale `do_action( 'admin_enqueue_scripts',
	 * null )` przy `strict_types` dalej rzucało `TypeError`. Dlatego typ
	 * jest zdjęty z sygnatury i sprawdzany w środku — tak jak w trzech
	 * handlerach `Aai_Monitor_Logowania`.
	 */
	public static function zasoby( $uchwyt = '' ): void {
		if ( ! is_string( $uchwyt ) || ! str_contains( $uchwyt, self::STRONA ) ) {
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

		// Okno ruchu też jedzie GET-em i też ze SKOŃCZONEJ listy: parametr
		// z adresu trafia prosto do zapytania o zakres dat, więc jedyną
		// dopuszczalną odpowiedzią na wartość spoza listy jest wartość
		// domyślna, nie „co przyszło".
		$okno = isset( $_GET['okno'] ) ? (int) $_GET['okno'] : 1; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		if ( ! in_array( $okno, self::OKNA, true ) ) {
			$okno = 1;
		}
		$ruch = Aai_Monitor_Odczyt::ruch( $okno );

		echo '<div class="wrap aai-monitor">';
		printf( '<h1>%s</h1>', esc_html__( 'Monitoring', 'aai-monitor' ) );

		if ( array() === $czujki ) {
			printf(
				'<div class="notice notice-info inline"><p>%s</p></div>',
				esc_html__( 'Baza monitoringu stoi, ale nic jeszcze nie zbiera danych — żadna czujka nie jest podpięta. Pusta lista poniżej znaczy więc „nie ma czego pokazać”, a nie „nikt nie próbował”.', 'aai-monitor' )
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
		self::sekcja_ruchu( $ruch, $okno );

		echo '</div>';
	}

	/* ————————————————————————— części ekranu ————————————————————————— */

	/**
	 * Liczby na wierzchu — KAŻDA z własnym okresem pod spodem.
	 *
	 * KAŻDY KAFELEK NIESIE SWÓJ OKRES i to jest cała reguła tego bloku.
	 * Wspólnego zdania o okresie tu nie ma i nie ma go być: trzy kafelki
	 * liczą od początku pomiaru, a jeden — ostatnie 7 dni, więc jedno
	 * zdanie dla czterech różnych rzeczy musiałoby o którymś skłamać.
	 *
	 * TAK BYŁO DO T4 i tak to zgłosił właściciel w teście ręcznym
	 * (2026-08-31, decyzja T4-D1): pod kafelkami stało „Kafelki liczą
	 * wszystko od początku pomiaru", a drugi kafelek nazywał się wprost
	 * „Nieudane próby (7 dni)". Podpis przeczył kafelkowi, który opisywał.
	 *
	 * NIE ZDEJMOWAĆ OKRESU Z KAFELKA W IMIĘ ZWIĘZŁOŚCI — to cofnęłoby A3
	 * z przeglądu T3. Wtedy liczby nazywały się samymi „Odsłony" i „Sesje",
	 * a właściciel czytał je jako ruch dzisiejszy. Zmierzone: jeden wiersz
	 * sprzed 40 dni dawał kafelek 1 i sekcję 0 przy identycznym napisie
	 * obok. Okres jest tu treścią, nie ozdobnikiem.
	 *
	 * @param array<string,array<string,mixed>> $stan Podsumowanie z działu.
	 */
	private static function kafelki( array $stan ): void {
		$od_poczatku = __( 'od początku pomiaru', 'aai-monitor' );

		$kafelki = array(
			array(
				'etykieta' => __( 'Logowania', 'aai-monitor' ),
				'okres'    => $od_poczatku,
				'wartosc'  => (int) $stan['logowania']['razem'],
				'alarm'    => false,
			),
			array(
				'etykieta' => __( 'Nieudane próby', 'aai-monitor' ),
				'okres'    => __( 'ostatnie 7 dni', 'aai-monitor' ),
				'wartosc'  => (int) $stan['logowania']['porazki_7dni'],
				// Jedyna funkcja alarmowa tego ekranu — dlatego wyróżniona
				// dopiero, gdy naprawdę jest co pokazać. Okres jest tu
				// KRÓTSZY niż w pozostałych kafelkach celowo: alarm ma
				// mówić „dzieje się TERAZ", a nie „kiedyś się zdarzyło".
				'alarm'    => $stan['logowania']['porazki_7dni'] > 0,
			),
			array(
				'etykieta' => __( 'Odsłony', 'aai-monitor' ),
				'okres'    => $od_poczatku,
				'wartosc'  => (int) $stan['wizyty']['razem'],
				'alarm'    => false,
			),
			array(
				'etykieta' => __( 'Sesje', 'aai-monitor' ),
				'okres'    => $od_poczatku,
				'wartosc'  => (int) $stan['wizyty']['sesje'],
				'alarm'    => false,
			),
		);

		echo '<div class="aai-monitor-kafelki">';
		foreach ( $kafelki as $kafelek ) {
			printf(
				'<div class="aai-monitor-kafelek%s"><span class="aai-monitor-liczba">%s</span><span class="aai-monitor-etykieta">%s</span><span class="aai-monitor-okres">%s</span></div>',
				$kafelek['alarm'] ? ' aai-monitor-alarm' : '',
				esc_html( number_format_i18n( $kafelek['wartosc'] ) ),
				esc_html( $kafelek['etykieta'] ),
				esc_html( $kafelek['okres'] )
			);
		}
		echo '</div>';
		// Zdanie mówi już WYŁĄCZNIE o tym, gdzie szukać okna czasu —
		// o okresach mówią same kafelki. Ta połowa dawnego zdania była
		// prawdziwa i jest potrzebna, bo sekcja „Ruch" liczy co innego.
		printf(
			'<p class="description">%s</p>',
			esc_html__( 'Liczby w wybranym oknie czasu są niżej, w sekcji „Ruch”.', 'aai-monitor' )
		);
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
	 * DWIE RZECZY SĄ TU NAPISANE WPROST, bo bez nich liczby kłamią po
	 * cichu:
	 *  - **sesja to karta-drzewo, nie człowiek**: `sessionStorage` jest
	 *    kopiowany do karty otwartej z linku, więc dwie karty jednej
	 *    osoby bywają jedną sesją (a dwa urządzenia zawsze są dwiema);
	 *  - **odsłony są zaniżone**: wiersz powstaje z beaconu wysyłanego
	 *    przy WYJŚCIU ze strony, więc odsłona urwana awarią, ubiciem
	 *    przeglądarki albo wyłączonym JavaScriptem nie zostawia śladu.
	 *
	 * Liczba, która przemilcza swoją definicję, jest gorsza od braku
	 * liczby — dlatego stoi to na ekranie, a nie w dokumentacji.
	 *
	 * @param array<string,mixed> $ruch Agregat z działu.
	 * @param int                 $okno Okno w dobach.
	 */
	private static function sekcja_ruchu( array $ruch, int $okno ): void {
		echo '<h2>' . esc_html__( 'Ruch', 'aai-monitor' ) . '</h2>';

		self::przelacznik_okna( $okno );

		$odslony = (int) $ruch['odslony'];
		if ( 0 === $odslony ) {
			printf(
				'<p class="aai-monitor-pusto">%s</p>',
				esc_html__( 'Ani jednej odsłony w tym oknie.', 'aai-monitor' )
			);
			return;
		}

		printf(
			'<p>%s</p>',
			esc_html(
				sprintf(
					/* translators: 1: odsłony, 2: sesje, 3: czas łączny, 4: czas średni. */
					__( 'Odsłon: %1$s. Sesji: %2$s. Czas łączny: %3$s, średnio na odsłonę: %4$s.', 'aai-monitor' ),
					number_format_i18n( $odslony ),
					number_format_i18n( (int) $ruch['sesje'] ),
					self::czas( (int) $ruch['laczny_ms'] ),
					self::czas( (int) $ruch['sredni_ms'] )
				)
			)
		);

		$bramka = (int) $ruch['bramka'];
		if ( $bramka > 0 ) {
			printf(
				'<p>%s</p>',
				esc_html(
					sprintf(
						/* translators: %s: liczba odsłon zatrzymanych na bramce logowania. */
						__( 'W tym %s odsłon, które zatrzymała bramka logowania — ktoś otworzył płatną lekcję i zobaczył zaproszenie do logowania zamiast treści. Te odsłony NIE wchodzą do listy czytanych stron.', 'aai-monitor' ),
						number_format_i18n( $bramka )
					)
				)
			);
		}

		echo '<h3>' . esc_html__( 'Najczęściej czytane strony', 'aai-monitor' ) . '</h3>';
		self::tabela_stron( $ruch['strony'] );

		if ( array() !== $ruch['strony_bramki'] ) {
			echo '<h3>' . esc_html__( 'Zatrzymane na bramce logowania', 'aai-monitor' ) . '</h3>';
			self::tabela_stron( $ruch['strony_bramki'] );
		}

		printf(
			'<p class="description">%s</p>',
			esc_html__( 'Czas liczy się tylko wtedy, gdy karta jest widoczna. „Sesja” znaczy kartę wraz z otwartymi z niej kartami — nie osobę. Odsłony przerwane awarią przeglądarki albo bez JavaScriptu nie są liczone, więc te liczby są dolną granicą ruchu, nie dokładnym pomiarem.', 'aai-monitor' )
		);
	}

	/**
	 * Tabela stron — ten sam kształt dla czytanych i dla odbić na bramce.
	 *
	 * @param array<int,array<string,mixed>> $strony Wiersze z działu.
	 */
	private static function tabela_stron( array $strony ): void {
		echo '<table class="widefat striped aai-monitor-tabela"><thead><tr>';
		foreach ( array(
			__( 'Strona', 'aai-monitor' ),
			__( 'Odsłony', 'aai-monitor' ),
			__( 'Średni czas', 'aai-monitor' ),
		) as $naglowek ) {
			printf( '<th>%s</th>', esc_html( $naglowek ) );
		}
		echo '</tr></thead><tbody>';

		foreach ( $strony as $strona ) {
			// `esc_html` na ścieżce nie jest formalnością: wartość
			// przyszła z ciała żądania. Podpis dowodzi, że stronę
			// wyrenderowano — nie czyni treści bezpieczną.
			printf(
				'<tr><td><code>%s</code></td><td>%s</td><td>%s</td></tr>',
				esc_html( (string) $strona['sciezka'] ),
				esc_html( number_format_i18n( (int) $strona['odslony'] ) ),
				esc_html( self::czas( (int) round( (float) $strona['sredni'] ) ) )
			);
		}
		echo '</tbody></table>';
	}

	/**
	 * Przełącznik okna — odsyłacze GET-em, bo ekran niczego nie zapisuje.
	 *
	 * @param int $okno Wybrane okno.
	 */
	private static function przelacznik_okna( int $okno ): void {
		$etykiety = array(
			1  => __( 'dziś', 'aai-monitor' ),
			7  => __( '7 dni', 'aai-monitor' ),
			30 => __( '30 dni', 'aai-monitor' ),
		);

		echo '<p class="aai-monitor-okna">';
		foreach ( self::OKNA as $ile ) {
			$adres = add_query_arg(
				array(
					'page' => self::STRONA,
					'okno' => $ile,
				),
				admin_url( 'admin.php' )
			);
			printf(
				'<a href="%s" class="%s">%s</a> ',
				esc_url( $adres ),
				$ile === $okno ? 'aai-monitor-okno-wybrane' : '',
				esc_html( $etykiety[ $ile ] ?? (string) $ile )
			);
		}
		echo '</p>';
	}

	/**
	 * Czas dla człowieka: „14 s", „3 min 20 s", „1 h 12 min".
	 *
	 * @param int $ms Milisekundy.
	 */
	private static function czas( int $ms ): string {
		$sekundy = (int) round( $ms / 1000 );
		if ( $sekundy < 60 ) {
			return sprintf( '%d s', $sekundy );
		}
		$minuty = intdiv( $sekundy, 60 );
		if ( $minuty < 60 ) {
			return sprintf( '%d min %d s', $minuty, $sekundy % 60 );
		}
		return sprintf( '%d h %d min', intdiv( $minuty, 60 ), $minuty % 60 );
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
