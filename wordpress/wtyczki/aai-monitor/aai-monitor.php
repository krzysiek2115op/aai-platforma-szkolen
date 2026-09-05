<?php
/**
 * Plugin Name:       Automatic AI — Monitoring
 * Plugin URI:        https://github.com/MatthewPlugins/Pod-strona-Szkolenia
 * Description:       Dziennik logowań (kto, kiedy, skąd) i pomiar wizyt (co oglądano i jak długo), plus ekran w kokpicie dla administratora. Trzecia z trzech wtyczek Automatic AI — rejestruje, niczego nie blokuje.
 * Version:           0.6.0
 * Requires at least: 6.9
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
const AAI_MONITOR_WERSJA = '0.5.0';

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

/**
 * Slug podstrony kokpitu — tu, a nie w klasie ekranu.
 *
 * Pytają o niego trzy klasy: ekran (rysuje się pod tym adresem), kanał
 * błędów (pokazuje komunikat TYLKO na naszym ekranie i na liście wtyczek)
 * i kontrola zależności (to samo). Dopóki slug był stałą `Aai_Monitor_Ekran`,
 * dwie ostatnie znały klasę ekranu wyłącznie po to, żeby odczytać napis —
 * a ekran zna warstwę zapisu, która zna kanał błędów. Trzy klasy zamykały
 * przez to cykl `Ekran → Zapis → Komunikaty → Ekran`, ta sama klasa
 * znaleziska co AUD-ARCH-F1-004 w `aai-sklep` (znalezione przy pomiarze
 * cykli 2026-09-05, poza listą audytu). Konfiguracja wtyczki jest niżej od
 * wszystkich trzech, tak samo jak `AAI_MONITOR_PREFIKS`. Wartość bez zmian.
 */
const AAI_MONITOR_STRONA = 'aai-monitor';

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
		// Sól podpisu ścieżek — własna, nie `wp_salt()`, żeby rotacja
		// kluczy w `wp-config.php` nie unieważniła podpisów wysłanych
		// już do przeglądarek i nie uciszyła pomiaru bez objawu.
		Aai_Monitor_Podpis::przygotuj();
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
		/*
		 * OSŁONA OBEJMUJE CAŁY START, NIE TYLKO CZUJKI. Do testu całości
		 * (2026-08-31) `try` zaczynał się dopiero przy czujkach, a trzy
		 * wywołania stały poza nim — i to wystarczało, żeby brak JEDNEGO
		 * pliku z `includes/` wywrócił CAŁĄ witrynę razem ze sklepem.
		 * Zmierzone różnicowo: bez `class-aai-monitor-tabele.php`
		 * `/szkolenia/` oddawało **HTTP 500**, bez `class-aai-monitor-
		 * logowania.php` (czyli spod `try`) — **200**. Autoloader wyżej
		 * POMIJA plik nieczytelny, więc brakowi jednego pliku towarzyszy
		 * `Error: Class not found` na każdym żądaniu.
		 *
		 * Wyjątek raportujemy przez kanał błędów, ale TYLKO gdy on sam
		 * istnieje: `catch`, który woła klasę, przed której brakiem ma
		 * bronić, sam by się wywrócił. Bez kanału zostaje log serwera —
		 * gorzej widoczny, ale nie wywraca strony.
		 */
		/*
		 * KAŻDY KROK WE WŁASNEJ OSŁONIE (2026-09-05). Wszystkie sześć stało
		 * pod JEDNYM `try`, więc awaria pierwszego — a pierwszy sięga do BAZY
		 * — zabierała pięć pozostałych: dziennik logowań, timer wizyt, ekran
		 * i wpis do polityki prywatności milkły razem, na jeden komunikat.
		 * Monitoring, który cicho przestaje mierzyć, jest gorszy niż jego brak:
		 * pusty ekran czyta się jak „nikt nie próbował się włamać".
		 * Ta sama naprawa co w `aai-sklep`, gdzie skutek był cięższy (zamek
		 * wycieku płatnej treści stał ostatni pod tym samym `try`).
		 */
		$awarie = array();

		/**
		 * Uruchamia jeden krok startu tak, żeby jego awaria nie zabrała reszty.
		 *
		 * @param string   $nazwa Nazwa kroku — trafia do komunikatu.
		 * @param callable $krok  Rejestracja do wykonania.
		 */
		$bezpiecznie = static function ( string $nazwa, callable $krok ) use ( &$awarie ): void {
			try {
				$krok();
			} catch ( Throwable $e ) {
				$awarie[] = $nazwa . ': ' . $e->getMessage();
			}
		};

		try {
			$bezpiecznie( 'schemat tabel', static fn() => Aai_Monitor_Tabele::dociagnij_schemat() );
			// Wersje, na których dowiedziono haki — różnica NIE blokuje
			// wtyczki, tylko każe potwierdzić fakty od nowa (L17 z P2).
			$bezpiecznie( 'zależności', static fn() => Aai_Monitor_Zaleznosci::zarejestruj() );
		// Ekran kokpitu. Priorytet 20, bo wtyczki ładują się alfabetycznie
		// i `aai-monitor` biegnie PRZED `aai-sklep` — przy domyślnym
		// priorytecie nasza pozycja wchodziłaby do podmenu Pluginu 1
		// przed jego własnymi (P12; zmierzone na kolejności podmenu).
		add_action( 'admin_menu', array( 'Aai_Monitor_Ekran', 'menu' ), 20 );
		add_action( 'admin_enqueue_scripts', array( 'Aai_Monitor_Ekran', 'zasoby' ) );
		/*
		 * PRODUCENCI DANYCH — to, czego wtyczka nie miała po kroku T1
		 * („baza stoi, ale nic nie zbiera"): dziennik logowań (trzy haki
		 * rdzenia, T2), timer wizyt (wystrzał `admin-post.php`, T3)
		 * i wpis do kreatora polityki prywatności. Ten drugi
		 * jedynie podpina się pod `admin_init`, bo rdzeń przyjmuje treść
		 * WYŁĄCZNIE stamtąd i tylko w wp-admin — wywołanie wprost stąd nie
		 * dodałoby NIC, meldując to najwyżej w logu przy WP_DEBUG
		 * (zmierzone: plugin.php:2429).
		 *
		 * CAŁOŚĆ W `try/catch`, bo autoloader wyżej POMIJA plik
		 * nieczytelny, a bind mount kontenera potrafi umrzeć po
		 * `git checkout` — ten projekt przerabiał to nieraz. Przy pustym
		 * katalogu WordPress po prostu wyłącza wtyczkę, ale przy braku
		 * JEDNEGO pliku leciałby `Error: Class not found` na każdym
		 * żądaniu, także na froncie sklepu. Monitoring nie ma prawa
		 * wywrócić strony, której tylko się przygląda.
		 */
			$bezpiecznie( 'dziennik logowań', static fn() => Aai_Monitor_Logowania::zarejestruj() );
			$bezpiecznie( 'timer wizyt', static fn() => Aai_Monitor_Wizyty::zarejestruj() );
			$bezpiecznie( 'pomiar', static fn() => Aai_Monitor_Pomiar::zarejestruj() );
			$bezpiecznie( 'wpis do polityki prywatności', static fn() => Aai_Monitor_Prywatnosc::zarejestruj() );
			// Kanał błędów: zapis biegnie w cudzym żądaniu i łapie
			// `Throwable`, więc bez tego uszkodzona tabela dawałaby PUSTĄ
			// listę logowań, czytaną jak „nikt nie próbował" — fałszywy
			// negatyw na jedynym ekranie, który ma ostrzegać (P13).
			$bezpiecznie( 'kanał błędów', static fn() => Aai_Monitor_Komunikaty::zarejestruj() );

			if ( array() !== $awarie ) {
				throw new RuntimeException( implode( ' | ', $awarie ) );
			}
		} catch ( Throwable $e ) {
			if ( class_exists( 'Aai_Monitor_Komunikaty' ) ) {
				Aai_Monitor_Komunikaty::zapisz( 'nie udało się uruchomić monitoringu: ' . $e->getMessage() );
			} else {
				error_log( 'aai-monitor: nie udało się uruchomić monitoringu: ' . $e->getMessage() ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			}
		}
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
