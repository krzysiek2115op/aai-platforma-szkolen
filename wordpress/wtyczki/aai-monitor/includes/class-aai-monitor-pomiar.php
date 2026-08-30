<?php
/**
 * Podawanie timera wizyt — strona klienta wystrzału.
 *
 * Tu zapada JEDNA rzecz, której nie widać w skrypcie: **komu w ogóle
 * dajemy możliwość zapisania odsłony**. Beacon bez podpisu nie wejdzie
 * do bazy, a podpis wydaje wyłącznie ten kod — więc to jest realna
 * bramka, nie kosmetyka.
 *
 * KOGO NIE MIERZYMY (D3):
 *  - **administratora** — skrypt nie jest mu podawany w ogóle (N8),
 *    a gdyby beacon przyszedł ze starej karty, endpoint go odrzuci;
 *  - **stron 404** — i to jest powód głębszy niż „po co liczyć błędy".
 *    Strona 404 renderuje się dla DOWOLNEGO adresu, więc podanie tam
 *    skryptu rozdawałoby podpisy na ścieżki, których nie ma. Wystarczyłoby
 *    wejść na `/zmyslona-sciezka`, wziąć podpis ze źródła strony i wysłać
 *    beacon — a „top 10 stron" dałoby się zatruć czymkolwiek. Podpis ma
 *    dowodzić, że stronę wyrenderowano JAKO SIEBIE, nie jako komunikat
 *    o jej braku.
 *
 * Uchwyt zaczyna się od `aai-monitor-` i to NIE jest zwyczaj:
 * `Aai_Sklep_Zasoby` zdejmuje z frontu uchwyty o prefiksach `tutor`,
 * `wc-`, `woocommerce` i `sourcebuster` (żeby cudze arkusze nie łamały
 * motywu). Nazwa spoza naszej rodziny mogłaby więc wpaść pod cudzy filtr
 * i wyciszyć pomiar bez śladu.
 *
 * @package Aai_Monitor
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Skrypt pomiaru na froncie.
 */
final class Aai_Monitor_Pomiar {

	/**
	 * Uchwyt skryptu — musi zaczynać się od `aai-monitor-` (patrz wyżej).
	 */
	public const UCHWYT = 'aai-monitor-pomiar';

	/**
	 * Rejestracja — wołane z pliku głównego.
	 */
	public static function zarejestruj(): void {
		add_action( 'wp_enqueue_scripts', array( self::class, 'podaj' ) );
	}

	/**
	 * Podaje skrypt razem z podpisaną ścieżką bieżącej strony.
	 *
	 * CAŁOŚĆ W `try/catch ( Throwable )`, bo ta metoda biegnie w CUDZYM
	 * żądaniu — przy renderowaniu KAŻDEJ strony frontu, łącznie z kasą
	 * WooCommerce. Wyjątek stąd nie zepsułby monitoringu, tylko stronę,
	 * której monitoring się przygląda (F11, N4). Monitoring ma prawo nie
	 * zmierzyć odsłony; nie ma prawa przerwać zakupu.
	 */
	public static function podaj(): void {
		try {
			self::wpnij();
		} catch ( Throwable $e ) {
			Aai_Monitor_Komunikaty::zapisz( 'nie udało się podać timera wizyt: ' . $e->getMessage() );
		}
	}

	/**
	 * Właściwe wpięcie skryptu.
	 */
	private static function wpnij(): void {
		if ( ! self::mierzymy() ) {
			return;
		}

		$sciezka = Aai_Monitor_Podpis::sciezka_zadania();

		wp_enqueue_script(
			self::UCHWYT,
			AAI_MONITOR_URL . 'assets/pomiar.js',
			array(),
			AAI_MONITOR_WERSJA,
			array(
				'in_footer' => true,
				'strategy'  => 'defer',
			)
		);

		/*
		 * Dane WPROST z serwera — łącznie ze ŚCIEŻKĄ. Skrypt jej nie
		 * wyprowadza, tylko odsyła nietkniętą: podpis liczymy z dokładnie
		 * tej wartości, która pojedzie do bazy, więc rozjazd normalizacji
		 * (ukośnik na końcu, procent-kodowanie, wielkość liter) nie ma
		 * gdzie powstać. Gdyby ścieżkę składał `location.pathname`,
		 * każda taka różnica kasowałaby beacon po cichu.
		 */
		wp_add_inline_script(
			self::UCHWYT,
			'window.aaiMonitorPomiar=' . wp_json_encode(
				array(
					'adres'   => Aai_Monitor_Wizyty::adres(),
					'sciezka' => $sciezka,
					'podpis'  => Aai_Monitor_Podpis::podpisz( $sciezka ),
				)
			) . ';',
			'before'
		);
	}

	/**
	 * Czy mierzymy bieżącą odsłonę.
	 *
	 * Osobna metoda, bo o to samo pyta bramka jakości: porównuje HTML
	 * oddany gościowi i administratorowi, i musi mieć jedno miejsce,
	 * które o tym decyduje.
	 */
	public static function mierzymy(): bool {
		if ( current_user_can( Aai_Monitor_Ekran::UPRAWNIENIE ) ) {
			return false;
		}
		if ( is_404() ) {
			return false;
		}
		return true;
	}
}
