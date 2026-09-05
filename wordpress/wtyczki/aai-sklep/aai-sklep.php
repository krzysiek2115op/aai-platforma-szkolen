<?php
/**
 * Plugin Name:       Automatic AI — Sklep z kursami
 * Plugin URI:        https://github.com/MatthewPlugins/Pod-strona-Szkolenia
 * Description:       Katalog /szkolenia, strony sprzedażowe kursów i kreator treści. Pierwsza z trzech wtyczek Automatic AI; sprzedaż bierze WooCommerce, dostęp do materiału Tutor LMS.
 * Version:           0.8.0
 * Requires at least: 6.9
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
const AAI_SKLEP_WERSJA = '0.6.0';

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

/**
 * UPRAWNIENIE WŁAŚCICIELA — jedno na całą wtyczkę.
 *
 * Mieszka TU, a nie w klasie kokpitu, bo pytają o nie dwie różne warstwy:
 * kokpit (menu kreatora, akcje zapisu) i TRASY na froncie (czy oglądający
 * widzi kurs w statusie `draft`). Dopóki stała była własnością
 * `Aai_Sklep_Panel`, warstwa routingu musiała znać klasę panelu, a panel
 * znał trasy — czyli dwie klasy zależały od siebie nawzajem i żadna nie
 * była fundamentem dla drugiej (zgłoszenie AUD-ARCH-F1-004). Konfiguracja
 * wtyczki jest niżej od obu, tak samo jak `AAI_SKLEP_PREFIKS`.
 *
 * Wartość bez zmian: `manage_options`. Rola „redaktora kursów" odpadła
 * definitywnie decyzją właściciela (D5, 2026-08-30).
 */
const AAI_SKLEP_UPRAWNIENIE = 'manage_options';

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

		/*
		 * POWRÓT TEJ WTYCZKI OGŁASZA KURSY SIOSTROM (MAR-A-14).
		 *
		 * Deaktywacja Pluginu 2 przestawia produkty na `draft`, a jego
		 * aktywacja próbuje to cofnąć — ale wychodzi na braku
		 * `Aai_Sklep_Odczyt`, gdy Plugin 1 jest wtedy wyłączony. Bez tej
		 * pętli powrót Pluginu 1 nie synchronizował NICZEGO, więc produkty
		 * zostawały szkicami do ręcznego `wp aai-platnosci sync` — czyli
		 * sklep z działającym katalogiem, w którym nic nie da się kupić,
		 * i to bez jednego objawu.
		 *
		 * Osłona jest warunkiem, nie ostrożnością: aktywacja wtyczki, która
		 * rzuci wyjątek, kończy się dla właściciela białym ekranem
		 * w kokpicie. Kursy są dwa, a nie dwa tysiące — koszt tej pętli
		 * jest jednorazowy i mierzalny.
		 */
		try {
			foreach ( Aai_Sklep_Tutor::identyfikatory_kursow() as $id ) {
				do_action( 'aai_sklep_kurs_zmieniony', $id, array() );
			}
		} catch ( Throwable $e ) {
			error_log( 'aai-sklep: aktywacja nie ogłosiła kursów: ' . $e->getMessage() ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
		}
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
		/*
		 * KAŻDA REJESTRACJA WE WŁASNEJ OSŁONIE, A ZAMEK WYCIEKU PIERWSZY.
		 *
		 * Autoloader wyżej POMIJA plik nieczytelny (warunek `is_readable`, bez
		 * `else`), więc brak albo uszkodzenie JEDNEGO z trzynastu plików klas
		 * dawało `Error: Class not found`. Do 2026-08-31 znaczyło to HTTP 500
		 * na całej witrynie; naprawa z testu całości objęła cały start jednym
		 * `try` i zamieniła awarię głośną na cichą. Klasa awarii jest tu
		 * udokumentowana i powtarzalna: martwy bind mount kontenera po
		 * `git checkout`, częściowe wgrywanie przez FTP, `git clean`.
		 *
		 * TA NAPRAWA MIAŁA JEDNAK SKUTEK UBOCZNY, KTÓRY BYŁ GORSZY OD CHOROBY.
		 * Trzynaście rejestracji stało pod jednym `try`, a `Aai_Sklep_Lekcja`
		 * — jedyna, która zakłada ZAMKI na publiczne listy lekcji
		 * (`register_post_type_args`, `pre_get_posts`) — była OSTATNIA. Rzut
		 * w którejkolwiek z dwunastu wcześniejszych (pierwsza sięga do BAZY)
		 * przeskakiwał do `catch`, zamki nie powstawały, a witryna działała
		 * dalej z otwartą dziurą. Notka o błędzie jest widoczna wyłącznie dla
		 * administratora w kokpicie, więc nikt nie musiał tego zauważyć.
		 *
		 * ZMIERZONE (rzut wstrzyknięty w rejestrację nr 2 z 13): strona główna
		 * oddaje 200, a `/?post_type=lesson&feed=rss2` oddaje anonimowi
		 * 135 kB PŁATNEJ TREŚCI w 10 wpisach, z prawdziwymi tytułami lekcji.
		 * Przy zdrowym kodzie ten sam adres oddaje 404 i zero wpisów.
		 *
		 * STĄD DWIE WARSTWY:
		 *   1. `Aai_Sklep_Lekcja::zarejestruj()` idzie PIERWSZA. Ochrona
		 *      produktu nie ma prawa zależeć od powodzenia dwunastu rzeczy
		 *      przed nią. Sama nie sięga do bazy — zakłada filtry.
		 *   2. Każda rejestracja dostaje WŁASNĄ osłonę, więc awaria jednej
		 *      klasy nie zabiera dwunastu pozostałych. Sklep bez menu jest
		 *      gorszy od sklepu z menu, ale nieporównanie lepszy od witryny,
		 *      która po cichu rozdaje płatną treść.
		 *
		 * CENA jest świadoma: przy uszkodzonym pliku część sklepu nie działa,
		 * ale reszta witryny stoi, a właściciel dostaje komunikat zamiast
		 * białego ekranu. `aai-sklep` nie ma kanału błędów (klasy `Komunikaty`
		 * jak siostry), więc meldujemy do logu serwera i notką w kokpicie —
		 * obie drogi nie potrzebują ani jednej naszej klasy, czyli działają
		 * dokładnie wtedy, gdy klas brakuje.
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

		// ZAMEK WYCIEKU PIERWSZY — patrz komentarz wyżej. Nie przestawiać.
		$bezpiecznie( 'widok lekcji i zamki publicznych list', static fn() => Aai_Sklep_Lekcja::zarejestruj() );

		$bezpiecznie( 'schemat tabel', static fn() => Aai_Sklep_Tabele::dociagnij_schemat() );
		$bezpiecznie( 'zasoby', static fn() => Aai_Sklep_Zasoby::zarejestruj() );
		$bezpiecznie( 'styl stron Tutora', static fn() => Aai_Sklep_Styl_Tutora::zarejestruj() );
		$bezpiecznie( 'styl stron WooCommerce', static fn() => Aai_Sklep_Styl_Woo::zarejestruj() );
		$bezpiecznie( 'trasy', static fn() => Aai_Sklep_Trasy::zarejestruj() );
		// „Moje kursy" (W6) — nasza lista kupionych kursów w miejsce panelu Tutora.
		$bezpiecznie( 'Moje kursy', static fn() => Aai_Sklep_Moje::zarejestruj() );
		$bezpiecznie( 'menu', static fn() => Aai_Sklep_Menu::zarejestruj() );
		$bezpiecznie( 'SEO', static fn() => Aai_Sklep_Seo::zarejestruj() );
		$bezpiecznie( 'mapa strony', static fn() => Aai_Sklep_Sitemap::zarejestruj() );
		// Kreator (krok W4). Ekrany kokpitu i akcje zapisu rejestrujemy zawsze,
		// nie tylko przy `is_admin()`: `admin-post.php` biegnie przez ten sam
		// hak, a odnośnik „Edytuj kurs" wchodzi do paska na FRONCIE.
		$bezpiecznie( 'kreator', static fn() => Aai_Sklep_Panel::zarejestruj() );
		$bezpiecznie( 'akcje kreatora', static fn() => Aai_Sklep_Panel_Akcje::zarejestruj() );
		// Kopia kursu w Tutor LMS (krok W5). Nasłuchuje na akcjach warstwy
		// zapisu, więc musi być podpięta ZANIM cokolwiek zapisze — także
		// przy imporcie z wiersza poleceń, który biegnie przez ten sam hak.
		$bezpiecznie( 'kopia kursu w Tutorze', static fn() => Aai_Sklep_Tutor::zarejestruj() );

		if ( array() !== $awarie ) {
			$powod = 'aai-sklep: nie udało się uruchomić części sklepu z kursami: '
				. implode( ' | ', $awarie );
			error_log( $powod ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			add_action(
				'admin_notices',
				static function () use ( $powod ): void {
					if ( ! current_user_can( AAI_SKLEP_UPRAWNIENIE ) ) {
						return;
					}
					echo '<div class="notice notice-error"><p>'
						. esc_html( $powod )
						. '</p></div>';
				}
			);
		}
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
