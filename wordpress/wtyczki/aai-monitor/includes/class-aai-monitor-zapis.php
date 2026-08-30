<?php
/**
 * Warstwa zapisu — JEDYNE miejsce, które pisze do tabel Pluginu 3.
 *
 * Ta sama rola co `Aai_Sklep_Zapis` i `Aai_Platnosci_Zapis`, i ten sam
 * powód: zapis z pominięciem tej warstwy niczego nie zgłasza, po prostu
 * omija retencję, sufity i kanał błędów. Pilnuje tego reguła zapisu
 * w `straznik-wtyczki-wp` (iteruje po wszystkich wtyczkach i wymaga
 * pliku `class-<wtyczka>-zapis.php`).
 *
 * CZEGO TU NIE MA I DLACZEGO. Nie ma haków ani endpointu — to są
 * PRODUCENCI danych i wchodzą w krokach T2 (dziennik logowań) i T3
 * (timer wizyt). Tu mieszka sam zapis: sufity, retencja i to, że awaria
 * nie wychodzi na zewnątrz.
 *
 * @package Aai_Monitor
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Zapis zdarzeń monitoringu.
 */
final class Aai_Monitor_Zapis {

	/**
	 * Sufit czasu na stronie: 4 godziny w milisekundach.
	 *
	 * Czas ponad sufit jest PRZYCINANY, nie odrzucany (rozstrzygnięcie
	 * sprzeczności C-2 z krytyki T0): tak długa wizyta to zwykle uśpiona
	 * karta, a odrzut wyrzucałby prawdziwe wejście razem z jego ścieżką.
	 */
	public const SUFIT_TRWANIA_MS = 4 * 60 * 60 * 1000;

	/**
	 * Dopisuje zdarzenie logowania.
	 *
	 * @param array<string,mixed> $dane Klucze: `zdarzenie` (udane|nieudane),
	 *                                  `zrodlo`, `user_id`, `login`, `ip`, `agent`.
	 * @return bool Czy wiersz powstał.
	 */
	public static function dodaj_logowanie( array $dane ): bool {
		global $wpdb;

		$zdarzenie = 'nieudane' === ( $dane['zdarzenie'] ?? '' ) ? 'nieudane' : 'udane';
		$user_id   = isset( $dane['user_id'] ) ? (int) $dane['user_id'] : 0;

		$wiersz = array(
			'czas'      => self::teraz_utc(),
			'zdarzenie' => $zdarzenie,
			// Źródło `sesja` znaczy „każda sesja spoza formularza" —
			// kasa Woo (F3), odnowienie ciastka, rejestracja Tutora (F15),
			// przyszłe kanały. To NIE jest zamknięta lista emiterów.
			'zrodlo'    => self::przytnij( (string) ( $dane['zrodlo'] ?? '' ), 16 ),
			// Przy porażce konta NIE MA, więc kolumna zostaje NULL-em;
			// zero udawałoby użytkownika o identyfikatorze zero.
			'user_id'   => $user_id > 0 ? $user_id : null,
			'login'     => self::przytnij( (string) ( $dane['login'] ?? '' ), 60 ),
			'ip'        => self::przytnij( (string) ( $dane['ip'] ?? '' ), 45 ),
			'agent'     => self::przytnij( (string) ( $dane['agent'] ?? '' ), 191 ),
		);

		return self::wstaw( Aai_Monitor_Tabele::tabela( 'logowania' ), $wiersz, 'logowania' );
	}

	/**
	 * Uzupełnia źródło ostatnio dopisanego wiersza logowania.
	 *
	 * Po co osobna metoda: `set_logged_in_cookie` TWORZY wiersz (źródło
	 * `sesja`), a `wp_login` — który w żądaniu formularzowym biegnie
	 * chwilę później (F1) — DOPRECYZOWUJE źródło na `formularz`. Sam
	 * `wp_login` przegapiłby auto-login z kasy (F3), czyli ścieżkę
	 * każdego nowego klienta; sam `set_logged_in_cookie` nie odróżnia
	 * formularza od kasy. Producentów obu zdarzeń dokłada krok T2.
	 *
	 * @param int    $id     Identyfikator wiersza z `dodaj_logowanie()`.
	 * @param string $zrodlo Nowe źródło.
	 * @return bool Czy wiersz zmieniono.
	 */
	public static function uzupelnij_zrodlo( int $id, string $zrodlo ): bool {
		global $wpdb;

		if ( $id <= 0 ) {
			return false;
		}
		try {
			$zmienione = $wpdb->update(
				Aai_Monitor_Tabele::tabela( 'logowania' ),
				array( 'zrodlo' => self::przytnij( $zrodlo, 16 ) ),
				array( 'id' => $id ),
				array( '%s' ),
				array( '%d' )
			);
			if ( false === $zmienione ) {
				self::zglos( 'nie udało się uzupełnić źródła logowania: ' . $wpdb->last_error );
				return false;
			}
			return $zmienione > 0;
		} catch ( Throwable $e ) {
			self::zglos( 'nie udało się uzupełnić źródła logowania: ' . $e->getMessage() );
			return false;
		}
	}

	/**
	 * Identyfikator ostatnio dopisanego wiersza (0, gdy zapis się nie udał).
	 *
	 * Potrzebny wyłącznie parze haków z T2, żeby drugi z nich wiedział,
	 * który wiersz doprecyzować w tym samym żądaniu.
	 */
	public static function ostatni_id(): int {
		global $wpdb;
		return (int) $wpdb->insert_id;
	}

	/**
	 * Dopisuje wizytę.
	 *
	 * @param array<string,mixed> $dane Klucze: `sesja` (32 hex), `sciezka`,
	 *                                  `trwanie_ms`.
	 * @return bool Czy wiersz powstał.
	 */
	public static function dodaj_wizyte( array $dane ): bool {
		$trwanie = max( 0, (int) ( $dane['trwanie_ms'] ?? 0 ) );
		// PRZYCINAMY, nie odrzucamy (patrz SUFIT_TRWANIA_MS).
		$trwanie = min( $trwanie, self::SUFIT_TRWANIA_MS );

		$wiersz = array(
			'sesja'      => self::przytnij( (string) ( $dane['sesja'] ?? '' ), 32 ),
			'sciezka'    => self::przytnij( (string) ( $dane['sciezka'] ?? '' ), 191 ),
			// Moment WEJŚCIA liczy serwer: beacon przychodzi przy wyjściu
			// ze strony, więc `now()` byłoby momentem wyjścia i wizyta
			// zaczęta o 23:50 lądowałaby w następnej dobie. Klientowi nie
			// ufamy w żadnym znaczniku czasu.
			'wejscie'    => self::teraz_utc( -$trwanie ),
			'trwanie_ms' => $trwanie,
		);

		return self::wstaw( Aai_Monitor_Tabele::tabela( 'wizyty' ), $wiersz, 'wizyty' );
	}

	/**
	 * Kasuje wiersze starsze niż okno — obie tabele naraz.
	 *
	 * DRUGI WYZWALACZ retencji, obok zapisu: woła go ekran panelu, raz
	 * dziennie. Bez niego mechanizm jest z definicji leniwy — gdy przez
	 * 90 dni nie ma ANI JEDNEGO logowania, stare wiersze z adresami IP
	 * czekają na następny zapis. WP-Cron tego nie załatwia: na mało
	 * odwiedzanej stronie potrafi nie wstać całymi dniami (P7).
	 *
	 * @return int Ile wierszy skasowano łącznie.
	 */
	public static function retencja(): int {
		return self::sprzataj( 'logowania' ) + self::sprzataj( 'wizyty' );
	}

	/* ————————————————————————— wnętrze ————————————————————————— */

	/**
	 * Wspólny zapis: wiersz + retencja tej tabeli.
	 *
	 * @param string              $tabela Nazwa tabeli z klasy tabel.
	 * @param array<string,mixed> $wiersz Dane do wstawienia.
	 * @param string              $ktora  `logowania` albo `wizyty`.
	 */
	private static function wstaw( string $tabela, array $wiersz, string $ktora ): bool {
		global $wpdb;

		try {
			$wstawione = $wpdb->insert( $tabela, $wiersz );
			if ( false === $wstawione ) {
				self::zglos( 'nie udało się zapisać zdarzenia monitoringu: ' . $wpdb->last_error );
				return false;
			}
		} catch ( Throwable $e ) {
			self::zglos( 'nie udało się zapisać zdarzenia monitoringu: ' . $e->getMessage() );
			return false;
		}

		// Retencja PO udanym zapisie i w osobnym `try`: nieudane
		// sprzątanie nie może unieważnić zapisanego zdarzenia.
		self::sprzataj( $ktora );

		return true;
	}

	/**
	 * Kasuje z jednej tabeli wiersze starsze niż okno.
	 *
	 * BEZ `LIMIT` świadomie: niezmiennik N6 mówi „nie istnieje wiersz
	 * starszy niż okno", więc jeden zapis musi go domknąć w całości.
	 * Limit rozłożyłby czyszczenie na wiele zapisów i zostawiał okno,
	 * w którym dane osobowe żyją dłużej, niż obiecuje polityka
	 * prywatności. Ceną jest jedno wolniejsze żądanie po długiej ciszy —
	 * płacone raz, na kolumnie z indeksem.
	 *
	 * KAŻDE ZAPYTANIE STOI TU DOSŁOWNIE, przy swoim `$wpdb->prepare()`,
	 * zamiast być składane ze zmiennych. Wersja ze zmienną nazwą kolumny
	 * była krótsza i NIEWIDZIALNA dla `straznik-wtyczki-wp`: jego reguła
	 * czyta łańcuch podany wprost do `$wpdb->`, więc SQL sklejony
	 * konkatenacją przechodzi bez sprawdzenia. Kod ma być widoczny dla
	 * kontrolera, a nie sprytny.
	 *
	 * @param string $ktora `logowania` albo `wizyty`.
	 */
	private static function sprzataj( string $ktora ): int {
		global $wpdb;

		try {
			if ( 'logowania' === $ktora ) {
				$t   = Aai_Monitor_Tabele::tabela( 'logowania' );
				$ile = $wpdb->query(
					$wpdb->prepare(
						"DELETE FROM `{$t}` WHERE `czas` < %s",
						self::teraz_utc( 0, -Aai_Monitor_Tabele::OKNO_LOGOWANIA_DNI )
					)
				); // phpcs:ignore WordPress.DB.PreparedSQL
			} else {
				$t   = Aai_Monitor_Tabele::tabela( 'wizyty' );
				$ile = $wpdb->query(
					$wpdb->prepare(
						"DELETE FROM `{$t}` WHERE `wejscie` < %s",
						self::teraz_utc( 0, -Aai_Monitor_Tabele::OKNO_WIZYTY_DNI )
					)
				); // phpcs:ignore WordPress.DB.PreparedSQL
			}
			if ( false === $ile ) {
				self::zglos( 'retencja nie zadziałała: ' . $wpdb->last_error );
				return 0;
			}
			return (int) $ile;
		} catch ( Throwable $e ) {
			self::zglos( 'retencja nie zadziałała: ' . $e->getMessage() );
			return 0;
		}
	}

	/**
	 * Chwila obecna w UTC, z opcjonalnym przesunięciem.
	 *
	 * Obie kolumny czasu trzymamy w UTC, a okna liczymy od
	 * `current_datetime()` przeliczonego na UTC. W warsztacie
	 * `gmt_offset = 0`, więc błąd strefy byłby tu NIEWIDOCZNY i wyszedłby
	 * dopiero na produkcji (Europe/Warsaw: doba zaczynałaby się o 02:00).
	 *
	 * @param int $ms  Przesunięcie w milisekundach.
	 * @param int $dni Przesunięcie w dniach.
	 */
	private static function teraz_utc( int $ms = 0, int $dni = 0 ): string {
		$chwila = current_datetime()->setTimezone( new DateTimeZone( 'UTC' ) );
		$sekundy = intdiv( $ms, 1000 ) + $dni * DAY_IN_SECONDS;
		if ( 0 !== $sekundy ) {
			$chwila = $chwila->modify( sprintf( '%+d seconds', $sekundy ) );
		}
		return $chwila->format( 'Y-m-d H:i:s' );
	}

	/**
	 * Przycina wartość do szerokości kolumny.
	 *
	 * MySQL w trybie niestriktnym ucina nadmiar W MILCZENIU, a user-agent
	 * bywa dłuższy niż 191 znaków — przycinamy sami, żeby długość była
	 * naszą decyzją, nie skutkiem ubocznym konfiguracji serwera.
	 */
	private static function przytnij( string $wartosc, int $ile ): string {
		return mb_substr( $wartosc, 0, $ile );
	}

	/**
	 * Zgłasza awarię do kanału błędów.
	 *
	 * Zapis biegnie w CUDZYM żądaniu (logowanie, kasa, beacon), więc
	 * awaria nie ma komu nic zwrócić. Bez tego kanału uszkodzona tabela
	 * dawałaby pustą listę logowań, czytaną jak „nikt nie próbował" —
	 * fałszywy negatyw na jedynym ekranie, który ma ostrzegać (P13).
	 */
	private static function zglos( string $tresc ): void {
		Aai_Monitor_Komunikaty::zapisz( $tresc );
	}
}
