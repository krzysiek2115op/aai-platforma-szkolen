<?php
/**
 * Plugin Name:       Automatic AI — Sklep z kursami
 * Plugin URI:        https://github.com/MatthewPlugins/Pod-strona-Szkolenia
 * Description:       Katalog /szkolenia, strony sprzedażowe kursów i kreator treści. Pierwsza z trzech wtyczek Automatic AI; sprzedaż bierze WooCommerce, dostęp do materiału Tutor LMS.
 * Version:           0.4.0
 * Requires at least: 6.5
 * Requires PHP:      8.1
 * Author:            Automatic AI
 * License:           MIT
 * License URI:       https://opensource.org/licenses/MIT
 * Text Domain:       aai-sklep
 * Domain Path:       /languages
 *
 * @package Aai_Sklep
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * WERSJA WTYCZKI, nie wersja projektu. Repo ma własne wersjonowanie
 * (CHANGELOG jest źródłem prawdy o wersji projektu — pilnuje tego
 * `straznik-wersji`), a wtyczka dopiero się rodzi. Ta stała steruje
 * jedną rzeczą: czy przy wczytaniu trzeba dociągnąć schemat tabel.
 */
const AAI_SKLEP_WERSJA = '0.4.0';

/**
 * PREFIKS TABEL — decyzja właściciela z 2026-08-25.
 *
 * „Każda wtyczka z własną bazą" znaczy w WordPressie: własny komplet
 * tabel z własnym prefiksem w bazie WP, a NIE osobna baza MySQL.
 * Powód jest praktyczny, nie estetyczny: zamówienie musi wiedzieć
 * o kursie i o użytkowniku, a przez granicę osobnych baz nie przechodzą
 * ani transakcje, ani `JOIN` — czyli dokładnie to, na czym stoi spójność
 * danych. Izolacja zostaje logiczna: żadna z trzech wtyczek nie dotyka
 * tabel cudzego prefiksu, a pilnuje tego strażnik.
 *
 * Pełny prefiks powstaje przez doklejenie prefiksu instalacji
 * (`$wpdb->prefix`), więc dwie instalacje w jednej bazie się nie zderzą.
 */
const AAI_SKLEP_PREFIKS = 'aai_sklep_';

const AAI_SKLEP_PLIK = __FILE__;
define( 'AAI_SKLEP_KATALOG', plugin_dir_path( __FILE__ ) );
define( 'AAI_SKLEP_URL', plugin_dir_url( __FILE__ ) );

/**
 * Ładowanie klas bez Composera.
 *
 * DLACZEGO BEZ COMPOSERA. Wtyczka ma się wgrywać na współdzielony
 * hosting jako katalog plików — tak, jak wgrywa się każdą wtyczkę
 * z WordPress.org. Composer wymagałby albo commitowania `vendor/`,
 * albo kroku budowania przed wgraniem; jedno i drugie jest kosztem
 * bez korzyści przy kilkunastu własnych klasach i zerze zależności
 * zewnętrznych. Ten sam powód, dla którego prototyp nie wziął ORM-a.
 *
 * Konwencja nazw jest wordpressowa: klasa `Aai_Sklep_Tabele` mieszka
 * w `includes/class-aai-sklep-tabele.php`.
 */
spl_autoload_register(
	static function ( string $klasa ): void {
		if ( ! str_starts_with( $klasa, 'Aai_Sklep' ) ) {
			return;
		}
		$plik = AAI_SKLEP_KATALOG . 'includes/class-'
			. str_replace( '_', '-', strtolower( $klasa ) ) . '.php';
		if ( is_readable( $plik ) ) {
			require_once $plik;
		}
	}
);

/**
 * Aktywacja: schemat tabel powstaje TU, a nie przy każdym żądaniu.
 *
 * `dbDelta` jest kosztowne (czyta strukturę tabel z bazy i porównuje
 * ją z opisem), więc wołanie go przy każdym wczytaniu wtyczki byłoby
 * podatkiem od każdej odsłony strony. Zmiana schematu między wersjami
 * dociąga się osobno — patrz `Aai_Sklep_Tabele::dociagnij_schemat()`.
 */
register_activation_hook(
	__FILE__,
	static function (): void {
		Aai_Sklep_Tabele::utworz();
		// Reguły przepisywania powstają na haku `init`, którego przy
		// aktywacji już nie będzie — kasujemy więc znacznik wersji, żeby
		// najbliższe żądanie przepłukało reguły i `/szkolenia` odpowiadało
		// od razu, a nie dopiero po ręcznym zapisaniu bezpośrednich odnośników.
		Aai_Sklep_Trasy::wymus_przeplukanie();
	}
);

/**
 * Dezaktywacja NIE kasuje danych — od tego jest `uninstall.php`.
 * Właściciel, który wyłącza wtyczkę na chwilę (diagnoza, konflikt
 * z inną wtyczką), nie spodziewa się, że straci treść kursów.
 */
register_deactivation_hook(
	__FILE__,
	static function (): void {
		flush_rewrite_rules();
	}
);

add_action(
	'plugins_loaded',
	static function (): void {
		Aai_Sklep_Tabele::dociagnij_schemat();
		Aai_Sklep_Zasoby::zarejestruj();
		Aai_Sklep_Styl_Tutora::zarejestruj();
		Aai_Sklep_Trasy::zarejestruj();
		Aai_Sklep_Menu::zarejestruj();
		Aai_Sklep_Seo::zarejestruj();
	}
);

/**
 * Komendy wiersza poleceń.
 *
 * Rejestrujemy je przy wczytaniu pliku, a nie w `plugins_loaded`: WP-CLI
 * zbiera komendy z wtyczek, ZANIM ten hak zdąży pobiec, więc komenda
 * dorejestrowana później byłaby niewidoczna. `add_command` przyjmuje
 * nazwę klasy, więc autoloader ruszy dopiero przy faktycznym wywołaniu.
 */
if ( defined( 'WP_CLI' ) && WP_CLI ) {
	WP_CLI::add_command( 'aai-sklep', 'Aai_Sklep_Cli' );
}
