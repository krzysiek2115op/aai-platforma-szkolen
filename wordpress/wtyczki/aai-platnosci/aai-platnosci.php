<?php
/**
 * Plugin Name:       Automatic AI — Płatności
 * Plugin URI:        https://github.com/MatthewPlugins/Pod-strona-Szkolenia
 * Description:       Szew między sklepem kursów a WooCommerce i Tutor LMS: produkt z naszej ceny, powiązanie z kursem, dostawa dostępu i maili. Druga z trzech wtyczek Automatic AI — własnej kasy ani bramki płatności NIE zawiera.
 * Version:           0.4.0
 * Requires at least: 6.9
 * Requires PHP:      8.1
 * Author:            Automatic AI
 * License:           MIT
 * License URI:       https://opensource.org/licenses/MIT
 * Text Domain:       aai-platnosci
 *
 * @package Aai_Platnosci
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * WERSJA WTYCZKI, nie wersja projektu (CHANGELOG repo jest źródłem prawdy
 * o wersji projektu). Stała steruje dociąganiem schematu tabel.
 */
const AAI_PLATNOSCI_WERSJA = '0.2.0';

/**
 * PREFIKS TABEL — ta sama decyzja właściciela co przy `aai-sklep`
 * (2026-08-25): własne tabele z własnym prefiksem w bazie WP, nie osobna
 * baza MySQL. BAZA Pluginu 2 to DWIE tabele: `powiazania` (kurs ↔ produkt
 * WooCommerce) i `dostawy` (co klient naprawdę DOSTAŁ: mail, dostęp) —
 * bez klientów, zamówień i płatności, bo te ma WooCommerce
 * (decyzja właściciela 2026-08-26, schemat: docs/plugin-2/DIAGRAM.md).
 */
const AAI_PLATNOSCI_PREFIKS = 'aai_platnosci_';

define( 'AAI_PLATNOSCI_KATALOG', plugin_dir_path( __FILE__ ) );

/**
 * Ładowanie klas bez Composera — ten sam powód co w `aai-sklep`:
 * wtyczka ma się wgrywać jako katalog plików, bez kroku budowania.
 */
spl_autoload_register(
	static function ( string $klasa ): void {
		if ( ! str_starts_with( $klasa, 'Aai_Platnosci' ) ) {
			return;
		}
		$plik = AAI_PLATNOSCI_KATALOG . 'includes/class-'
			. str_replace( '_', '-', strtolower( $klasa ) ) . '.php';
		if ( is_readable( $plik ) ) {
			require_once $plik;
		}
	}
);

/*
 * P3a: filtry obronne B17 i blokada sprzedaży — rejestrowane TU, przy
 * include pliku, nie na `plugins_loaded`: Tutor bootuje się przy include
 * i jego konstruktor od razu czyta `monetize_by`; filtr z `plugins_loaded`
 * przychodziłby po tym odczycie i niczego by nie bronił (KROK-P3A.md §3).
 * Rejestracja bezwarunkowa — warunki żyją wewnątrz callbacków (lekcja B18).
 */
Aai_Platnosci_Ustawienia::zarejestruj();

/**
 * Aktywacja: powstaje schemat obu tabel. Od kroku P2 dojdzie tu także
 * pierwsza synchronizacja (`sync`) — na istniejącej instalacji nikt
 * kursów nie zapisuje, więc bez niej po aktywacji nie powstałby ani
 * jeden produkt (znalezisko U3 z krytyki P0).
 */
register_activation_hook(
	__FILE__,
	static function (): void {
		Aai_Platnosci_Tabele::utworz();
		// P3a: ustawienia jako kod — NAJPIERW ustawienia (silnik `wc`),
		// POTEM synchronizacja produktów; odwrotna kolejność zostawiałaby
		// produkty zsynchronizowane przy rozbrojonym szwie.
		// Awaria nie może zablokować aktywacji: błąd idzie do opcji.
		try {
			/*
			 * UDANA NAPRAWA NIE JEST BŁĘDEM. Pierwsza wersja zapisywała
			 * listę zmian do kanału komunikatów — a ten kanał czyta
			 * kontrola i traktuje jego zawartość jako rozjazd. Skutek
			 * wyszedł dopiero przy P4, gdy doszło nowe ustawienie:
			 * zwykła aktywacja wtyczki zostawiała `wp aai-platnosci
			 * sprawdz` na czerwono z komunikatem opisującym rzecz, która
			 * się UDAŁA. Zmiany widać w `sync --napraw`, stan widać
			 * w kontroli; do kanału błędów idzie wyłącznie awaria.
			 */
			Aai_Platnosci_Ustawienia::napraw();
		} catch ( Throwable $e ) {
			Aai_Platnosci_Komunikaty::zapisz( $e->getMessage() );
		}
		// U3: na istniejącej instalacji nikt kursów nie zapisuje — bez tej
		// synchronizacji po aktywacji nie powstałby ani jeden produkt.
		try {
			$wynik = Aai_Platnosci_Zapis::synchronizuj_wszystkie();
			// Uwagi z jedynej automatycznej ścieżki bootstrapu nie mogą
			// wyparować: to tu wychodzi „produkt już powiązany z INNYM
			// kursem" i podobne, a właściciel nie widzi wyjścia CLI.
			if ( array() !== $wynik['uwagi'] ) {
				Aai_Platnosci_Komunikaty::zapisz( 'przy aktywacji: ' . implode( '; ', $wynik['uwagi'] ) );
			}
		} catch ( Throwable $e ) {
			Aai_Platnosci_Komunikaty::zapisz( $e->getMessage() );
		}
	}
);

/**
 * Deaktywacja NIE kasuje danych (od tego jest `uninstall.php`), ale MUSI
 * zdjąć produkty kursów ze sprzedaży: filtry i haki wtyczki znikają razem
 * z nią, a produkt `publish` zostałby kupowalny przez `?add-to-cart`,
 * choć szew — czyli dostawa dostępu — już nie działa (L4 z krytyki P0).
 * `draft`, nigdy kasowanie: produkt kupiony przez kogokolwiek jest
 * częścią historii zamówień (niezmiennik 13 schematu).
 */
register_deactivation_hook(
	__FILE__,
	static function (): void {
		// `Throwable` także tutaj: WordPress zdejmuje wtyczkę z listy
		// aktywnych PRZED tym hakiem, więc wyjątek zostawiłby produkty
		// w sprzedaży po już nieaktywnym szwie — dokładnie stan, przed
		// którym ten hak broni.
		try {
			Aai_Platnosci_Zapis::produkty_na_szkic();
		} catch ( Throwable $e ) {
			Aai_Platnosci_Komunikaty::zapisz( 'przy wyłączaniu wtyczki: ' . $e->getMessage() );
		}
		/*
		 * Mail WooCommerce „nowe konto" WRACA. Wyłączyliśmy go tylko
		 * dlatego, że jego zadanie przejął nasz mail 1 — a nasz znika
		 * razem z wtyczką. Konto założone po deaktywacji bez żadnego
		 * linku do hasła to dokładnie klasa K1, przed którą broni cały
		 * ten krok.
		 */
		try {
			Aai_Platnosci_Ustawienia::przywroc_mail_woo();
		} catch ( Throwable $e ) {
			Aai_Platnosci_Komunikaty::zapisz( 'przy przywracaniu maila WooCommerce: ' . $e->getMessage() );
		}
		/*
		 * CUDZE USTAWIENIA WRACAJĄ TAKIE, JAKIE JE ZASTALIŚMY.
		 *
		 * Aktywacja przestawia kilkanaście ustawień, które nie należą do tej
		 * wtyczki: dwa klucze `tutor_option`, cztery opcje WooCommerce, status
		 * dwóch stron natywnej kasy Tutora i slugi koszyka oraz kasy. Do
		 * 2026-09-05 deaktywacja cofała z tego DOKŁADNIE JEDNĄ rzecz — mail
		 * powyżej — a wartość sprzed zmiany żyła wyłącznie na wyjściu komendy.
		 * Klient wyłączający wtyczkę na stałe zostawał z Tutorem w trybie `wc`
		 * bez szwu, który ten tryb obsługiwał: sprzedaż kursów przestaje
		 * działać, a nic tego nie tłumaczy.
		 *
		 * Osobny `try`, bo to jest niezależne od maila: awaria jednego nie ma
		 * prawa zabrać drugiego (ta sama zasada, co przy starcie obu sióstr).
		 */
		try {
			Aai_Platnosci_Ustawienia::przywroc_stan_zastany();
		} catch ( Throwable $e ) {
			Aai_Platnosci_Komunikaty::zapisz( 'przy przywracaniu zastanych ustawień: ' . $e->getMessage() );
		}
	}
);

add_action(
	'plugins_loaded',
	static function (): void {
		/*
		 * CAŁY START W `try` — zmierzone przy teście całości (2026-08-31):
		 * brak JEDNEGO pliku z `includes/` (autoloader pomija nieczytelny)
		 * dawał `Error: Class not found` na każdym żądaniu, czyli **HTTP
		 * 500 na całej witrynie**, łącznie z katalogiem i stronami kursów.
		 * Szew płatności nie ma prawa wywrócić sklepu, którego tylko
		 * pilnuje — tak samo jak monitoring (ta sama naprawa tego dnia).
		 * Wyjątek melduje kanał błędów, ale tylko jeśli sam istnieje.
		 */
		try {
		Aai_Platnosci_Tabele::dociagnij_schemat();
		// Bez WooCommerce albo Tutora wtyczka zostaje aktywna i mówi
		// o tym w kokpicie — komunikat, nie biały ekran (bramka P1).
		Aai_Platnosci_Zaleznosci::zarejestruj();
		// Szew (krok P2): słuchacze zdarzeń Pluginu 1 (prio 20) i hak
		// przywracający znaczniki produktu (B13). Rejestrowane zawsze —
		// import z WP-CLI biegnie przez ten sam hak.
		Aai_Platnosci_Szew::zarejestruj();
		// Dostarczanie (krok P3b): zamówienie z kursem nie ma czego
		// „realizować", więc nie wolno mu utknąć w `processing` — Tutor
		// przy metodach ze swojej czarnej listy (`bacs`, `cod`, `cheque`)
		// go stamtąd NIE wyciągnie, a klient zostałby bez dostępu mimo
		// zapłaty (zmierzone: KROK-P3B.md §3).
		Aai_Platnosci_Dostarczanie::zarejestruj();
		// Dwa maile dostarczenia (krok P4): „Ustaw hasło" przy powstaniu
		// konta i „Twój kurs jest gotowy" przy przyznaniu dostępu. Nie
		// jeden, bo to dwa różne zdarzenia: konto powstaje przy składaniu
		// zamówienia, dostęp dopiero po opłacie — a przelew stoi na
		// `on-hold` dwa dni (K1 z krytyki P0).
		Aai_Platnosci_Maile::zarejestruj();
		// Cena efektywna na stronie (krok P3b): klient ma widzieć tę samą
		// liczbę, którą zapłaci w kasie — także wtedy, gdy właściciel
		// ustawi w WooCommerce promocję (K2 z krytyki P0).
		Aai_Platnosci_Cena::zarejestruj();
		// Przycisk zakupu (krok P3b): sklep kursów nie wie, czy sprzedaż
		// jest otwarta ani czy oglądający ma już ten kurs — pyta filtrem,
		// odpowiada Plugin 2.
		Aai_Platnosci_Cta::zarejestruj();
		// Zdanie o zgodach w kasie (krok P5): WooCommerce powołuje się tam
		// na „Warunki i zasady", których nie ma — a przy braku strony NIE
		// usuwa wzmianki, tylko drukuje ją bez odnośnika. Decyzja właściciela
		// 2026-08-29: zdejmujemy do czasu, aż regulamin powstanie; polityka
		// prywatności zostaje.
		Aai_Platnosci_Kasa::zarejestruj();
		Aai_Platnosci_Komunikaty::zarejestruj();
		Aai_Platnosci_Sitemap::zarejestruj();
		} catch ( Throwable $e ) {
			if ( class_exists( 'Aai_Platnosci_Komunikaty' ) ) {
				Aai_Platnosci_Komunikaty::zapisz( 'nie udało się uruchomić szwu płatności: ' . $e->getMessage() );
			} else {
				error_log( 'aai-platnosci: nie udało się uruchomić szwu płatności: ' . $e->getMessage() ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			}
		}
	}
);

/**
 * Komendy wiersza poleceń — rejestrowane przy wczytaniu pliku, nie
 * w `plugins_loaded` (WP-CLI zbiera komendy wcześniej; ta sama uwaga
 * co w `aai-sklep`).
 */
if ( defined( 'WP_CLI' ) && WP_CLI ) {
	WP_CLI::add_command( 'aai-platnosci', 'Aai_Platnosci_Cli' );
}
