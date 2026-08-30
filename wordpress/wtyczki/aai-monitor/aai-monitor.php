<?php
/**
 * Plugin Name:       Automatic AI — Monitoring
 * Plugin URI:        https://github.com/MatthewPlugins/Pod-strona-Szkolenia
 * Description:       Dziennik logowań (kto, kiedy, skąd) i pomiar wizyt (co oglądano i jak długo), plus ekran w kokpicie dla administratora. Trzecia z trzech wtyczek Automatic AI — rejestruje, niczego nie blokuje.
 * Version:           0.2.0
 * Requires at least: 6.5
 * Requires PHP:      8.1
 * Author:            Automatic AI
 * License:           MIT
 * License URI:       https://opensource.org/licenses/MIT
 * Text Domain:       aai-monitor
 *
 * @package Aai_Monitor
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * WERSJA WTYCZKI, nie wersja projektu (źródłem prawdy o wersji projektu
 * jest CHANGELOG repo). Stała steruje dociąganiem schematu tabel.
 */
const AAI_MONITOR_WERSJA = '0.2.0';

/**
 * PREFIKS TABEL — ta sama decyzja właściciela co przy `aai-sklep`
 * i `aai-platnosci` (2026-08-25): własne tabele z własnym prefiksem
 * w bazie WP, nie osobna baza MySQL.
 *
 * BAZA Pluginu 3 to DWIE tabele, których nie ma ani WordPress, ani
 * WooCommerce, ani Tutor: `logowania` (kto wchodził na konto i skąd)
 * oraz `wizyty` (co oglądano i jak długo, anonimowo). Nie są ze sobą
 * złączone i to jest świadome — złączenie dałoby profilowanie, którego
 * ten moduł z założenia nie robi (D3, schemat: docs/plugin-3/DIAGRAM.md).
 */
const AAI_MONITOR_PREFIKS = 'aai_monitor_';

define( 'AAI_MONITOR_KATALOG', plugin_dir_path( __FILE__ ) );
define( 'AAI_MONITOR_URL', plugin_dir_url( __FILE__ ) );

/**
 * Ładowanie klas bez Composera — ten sam powód co w obu poprzednich
 * wtyczkach: ma się wgrywać jako katalog plików, bez kroku budowania.
 */
spl_autoload_register(
	static function ( string $klasa ): void {
		if ( ! str_starts_with( $klasa, 'Aai_Monitor' ) ) {
			return;
		}
		$plik = AAI_MONITOR_KATALOG . 'includes/class-'
			. str_replace( '_', '-', strtolower( $klasa ) ) . '.php';
		if ( is_readable( $plik ) ) {
			require_once $plik;
		}
	}
);

/**
 * Aktywacja: powstaje schemat obu tabel.
 *
 * I nic więcej. W przeciwieństwie do Pluginu 2 nie ma tu czego dogonić
 * na istniejącej instalacji: ten moduł nie kopiuje cudzych danych, tylko
 * zapisuje zdarzenia od chwili włączenia. Historii sprzed aktywacji nikt
 * nie ma — WordPress logowań nie przechowuje (F7).
 */
register_activation_hook(
	__FILE__,
	static function (): void {
		Aai_Monitor_Tabele::utworz();
	}
);

/*
 * Deaktywacji NIE obsługujemy i to jest decyzja, nie przeoczenie.
 *
 * Plugin 2 musiał przy wyłączaniu zdejmować produkty ze sprzedaży, bo
 * zostawiony `publish` byłby kupowalny bez działającego szwu. Tutaj nie
 * ma odpowiednika: haki znikają razem z wtyczką, więc rejestrowanie po
 * prostu ustaje, a zebrane dane czekają (sekcja 10 schematu). Jedyne,
 * co robi deaktywacja, to zatrzymanie zapisu — czyli dokładnie to, czego
 * się po niej spodziewamy.
 */

add_action(
	'plugins_loaded',
	static function (): void {
		Aai_Monitor_Tabele::dociagnij_schemat();
		// Wersje, na których dowiedziono haki — różnica NIE blokuje
		// wtyczki, tylko każe potwierdzić fakty od nowa (L17 z P2).
		Aai_Monitor_Zaleznosci::zarejestruj();
		// Ekran kokpitu. Priorytet 20, bo wtyczki ładują się alfabetycznie
		// i `aai-monitor` biegnie PRZED `aai-sklep` — przy domyślnym
		// priorytecie nasza pozycja wchodziłaby do podmenu Pluginu 1
		// przed jego własnymi (P12; zmierzone na kolejności podmenu).
		add_action( 'admin_menu', array( 'Aai_Monitor_Ekran', 'menu' ), 20 );
		add_action( 'admin_enqueue_scripts', array( 'Aai_Monitor_Ekran', 'zasoby' ) );
		// Dziennik logowań — PRODUCENT danych, czyli to, czego wtyczka nie
		// miała po kroku T1 („baza stoi, ale nic nie zbiera"). Trzy haki
		// rdzenia, każdy w `try/catch ( Throwable )`: wyjątek z handlera
		// `set_logged_in_cookie` wychodzi z kasy WooCommerce (F11), więc
		// monitoring ma prawo nie zapisać zdarzenia, ale nie ma prawa
		// przerwać zakupu.
		Aai_Monitor_Logowania::zarejestruj();
		// Sugerowany wpis do polityki prywatności. Osobna rejestracja, bo
		// rdzeń przyjmuje go WYŁĄCZNIE z haka `admin_init` i tylko w
		// wp-admin — wywołany stąd nie dodałby NIC i zameldowałby to
		// najwyżej w logu przy WP_DEBUG (zmierzone: plugin.php:2429).
		Aai_Monitor_Prywatnosc::zarejestruj();
		// Kanał błędów: zapis biegnie w cudzym żądaniu i łapie `Throwable`,
		// więc bez tego uszkodzona tabela dawałaby PUSTĄ listę logowań,
		// czytaną jak „nikt nie próbował" — fałszywy negatyw na jedynym
		// ekranie, który ma ostrzegać (P13).
		Aai_Monitor_Komunikaty::zarejestruj();
	}
);

/**
 * Komendy wiersza poleceń — rejestrowane przy wczytaniu pliku, nie
 * w `plugins_loaded` (WP-CLI zbiera komendy wcześniej; ta sama uwaga
 * co w obu poprzednich wtyczkach).
 */
if ( defined( 'WP_CLI' ) && WP_CLI ) {
	WP_CLI::add_command( 'aai-monitor', 'Aai_Monitor_Cli' );
}
