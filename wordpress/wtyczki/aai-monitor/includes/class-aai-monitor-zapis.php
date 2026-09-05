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
	 * Sufit WIEKU odsłony: 30 dni w milisekundach.
	 *
	 * OSOBNY OD SUFITU TRWANIA I ROBIĄCY CO INNEGO — to naprawa A5
	 * z przeglądu T3. Do niej obie liczby dzieliły sufit 4 h i obie były
	 * PRZYCINANE, przez co karta zostawiona na noc zapisywała wejście
	 * „4 h temu" (zmierzone co do sekundy). Przycięcie czasu czytania jest
	 * niedokładnością; przycięcie WIEKU jest ZMYŚLENIEM GODZINY — wizyta
	 * ląduje w złej godzinie, a przy oknie „dziś" często w złej dobie,
	 * czyli psuje dokładnie tę liczbę, dla której cały mechanizm powstał.
	 *
	 * Dlatego wiek ponad sufit ODRZUCAMY, a nie przycinamy: wizyta sprzed
	 * ponad miesiąca to nie jest opóźniony beacon czytelnika, tylko śmieć
	 * albo cudza zabawa. Lepiej stracić jeden wątpliwy wiersz niż wpisać
	 * do tabeli wymyślony znacznik czasu. Wszystko poniżej sufitu — także
	 * karta otwarta przez trzy dni — zapisuje się z PRAWDZIWYM momentem
	 * wejścia.
	 */
	public const SUFIT_WIEKU_MS = 30 * 24 * 60 * 60 * 1000;

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
	 * DWIE LICZBY CZASU, NIE JEDNA — i to nie jest nadmiar. `trwanie_ms`
	 * znaczy czas AKTYWNY (zegar w przeglądarce stoi, gdy karta jest
	 * ukryta), a `wiek_ms` to czas od wejścia na stronę do wysłania
	 * beaconu. Moment wejścia liczy się z DRUGIEJ: karta otwarta o 9:00,
	 * czytana dwie minuty i zamknięta o 17:00 zapisałaby przy pierwszej
	 * wejście o 16:58 — czyli w złej godzinie, a bywa że i w złej dobie
	 * (P16 schematu; ta sama wada, przed którą broniło liczenie momentu
	 * wejścia po stronie serwera).
	 *
	 * Klientowi nie ufamy w żadnym ZNACZNIKU czasu — obie wartości to
	 * RÓŻNICE, obie przycinane sufitem, a chwilę „teraz" bierze serwer.
	 *
	 * @param array<string,mixed> $dane Klucze: `odslona` (32 hex), `sesja`
	 *                                  (32 hex), `sciezka`, `bramka`,
	 *                                  `trwanie_ms`, `wiek_ms`.
	 * @return bool Czy odsłona jest zapisana (nowym wierszem albo
	 *              uzupełnieniem istniejącego).
	 */
	public static function dodaj_wizyte( array $dane ): bool {
		// Czas czytania PRZYCINAMY (patrz SUFIT_TRWANIA_MS)...
		$trwanie = min( max( 0, (int) ( $dane['trwanie_ms'] ?? 0 ) ), self::SUFIT_TRWANIA_MS );

		// ...a wiek ODRZUCAMY ponad sufitem, bo przycięty wiek to
		// zmyślona godzina wejścia (patrz SUFIT_WIEKU_MS).
		$wiek = max( 0, (int) ( $dane['wiek_ms'] ?? 0 ) );
		if ( $wiek > self::SUFIT_WIEKU_MS ) {
			return false;
		}

		// Wiek nie może być mniejszy niż czas aktywny — to fizycznie
		// niemożliwe, więc znaczy tyle, że klient przysłał nieprawdę albo
		// że któraś liczba oberwała sufitem. Bierzemy większą: moment
		// wejścia ma być NAJWCZEŚNIEJSZY, jaki da się obronić.
		$wiek = max( $wiek, $trwanie );

		$odslona = self::przytnij( (string) ( $dane['odslona'] ?? '' ), 32 );

		$wiersz = array(
			// Pusty identyfikator idzie jako NULL, nigdy jako '': UNIQUE
			// przepuszcza wiele NULL-i, ale dwa puste łańcuchy uznałby za
			// ten sam wiersz i druga odsłona bez identyfikatora nadpisałaby
			// pierwszą. Ta sama pułapka, która przy P5 zjadła 18 modułów
			// i lekcji w Tutorze (`meta_value => ''` dopasowywało cudze).
			'odslona'    => '' !== $odslona ? $odslona : null,
			'sesja'      => self::przytnij( (string) ( $dane['sesja'] ?? '' ), 32 ),
			'sciezka'    => self::przytnij( (string) ( $dane['sciezka'] ?? '' ), 191 ),
			'bramka'     => empty( $dane['bramka'] ) ? 0 : 1,
			'wejscie'    => self::teraz_utc( -$wiek ),
			'trwanie_ms' => $trwanie,
		);

		// Kolejne beacony TEJ SAMEJ odsłony uzupełniają istniejący wiersz,
		// zamiast dokładać nowy — inaczej czas doczytany po powrocie do
		// karty (naprawa B1) zawyżałby liczbę odsłon zamiast wydłużać
		// czytanie.
		if ( '' !== $odslona && self::podnies_wizyte( $odslona, $wiersz ) ) {
			return true;
		}

		$zapisane = self::wstaw( Aai_Monitor_Tabele::tabela( 'wizyty' ), $wiersz, 'wizyty' );
		if ( ! $zapisane && '' !== $odslona ) {
			// Wyścig: wiersz tej odsłony powstał między naszym sprawdzeniem
			// a wstawieniem (dwa beacony w locie naraz). To nie jest awaria,
			// tylko rzecz, przed którą stoi UNIQUE — dokładamy czas do tego,
			// co zdążyło powstać.
			return self::podnies_wizyte( $odslona, $wiersz );
		}
		return $zapisane;
	}

	/**
	 * Uzupełnia wiersz istniejącej odsłony. `false` = takiego wiersza nie ma.
	 *
	 * OBIE WARTOŚCI ZMIENIAMY MONOTONICZNIE, w SQL-u, a nie w PHP:
	 * `GREATEST` na czasie czytania i `LEAST` na momencie wejścia. Beacony
	 * bywają dostarczane nie po kolei (`sendBeacon` niczego nie obiecuje
	 * o kolejności), a bez tego spóźniony beacon z mniejszą liczbą cofnąłby
	 * już zapisany czas. Przy okazji robi to baza w jednym zapytaniu, więc
	 * dwa równoległe beacony nie mają się jak nadpisać.
	 *
	 * `sciezka`, `sesja` i `bramka` NIE są aktualizowane: pochodzą
	 * z podpisu tej samej strony i zmienić się nie mogą, a gdyby przyszły
	 * inne, znaczyłoby to podrobiony beacon — i wtedy tym bardziej nie
	 * chcemy ich wpisywać do cudzego wiersza.
	 *
	 * @param string              $odslona Identyfikator odsłony (32 hex).
	 * @param array<string,mixed> $wiersz  Wartości z beaconu.
	 */
	private static function podnies_wizyte( string $odslona, array $wiersz ): bool {
		global $wpdb;

		try {
			$t = Aai_Monitor_Tabele::tabela( 'wizyty' );

			$id = $wpdb->get_var(
				$wpdb->prepare( "SELECT `id` FROM `{$t}` WHERE `odslona` = %s", $odslona )
			); // phpcs:ignore WordPress.DB.PreparedSQL,WordPress.DB.DirectDatabaseQuery
			if ( null === $id ) {
				return false;
			}

			$zmienione = $wpdb->query(
				$wpdb->prepare(
					"UPDATE `{$t}` SET `trwanie_ms` = GREATEST( `trwanie_ms`, %d ), `wejscie` = LEAST( `wejscie`, %s ) WHERE `id` = %d",
					(int) $wiersz['trwanie_ms'],
					(string) $wiersz['wejscie'],
					(int) $id
				)
			); // phpcs:ignore WordPress.DB.PreparedSQL,WordPress.DB.DirectDatabaseQuery
			if ( false === $zmienione ) {
				self::zglos( 'nie udało się uzupełnić czasu odsłony: ' . $wpdb->last_error );
			}

			// Wiersz ISTNIEJE — i tylko to rozstrzyga. Zero zmienionych
			// wierszy znaczy tu „ten beacon nic nie wnosił", a nie porażkę.
			return true;
		} catch ( Throwable $e ) {
			self::zglos( 'nie udało się uzupełnić czasu odsłony: ' . $e->getMessage() );
			return false;
		}
	}

	/**
	 * Zapisuje ustawienie WYŁĄCZNIE wtedy, gdy go jeszcze nie ma — i oddaje
	 * wartość, która NAPRAWDĘ leży w bazie.
	 *
	 * To zapis dla wartości, które mają powstać raz i nigdy się nie zmienić
	 * (dziś: sól podpisu ścieżek). Przy wyścigu dwóch pierwszych żądań
	 * pierwszy pisarz wygrywa, reszta niczego nie rusza — `ON DUPLICATE KEY
	 * UPDATE klucz = klucz` to zapis PUSTY przy konflikcie. Nie `INSERT
	 * IGNORE`, bo ten ucisza WSZYSTKIE błędy zapisu, a my chcemy uciszyć
	 * dokładnie jeden: „ten klucz już jest". Nie `add_option()`, bo ten przy
	 * konflikcie NADPISUJE (option.php: `VALUES(option_value)`) — i to był
	 * powód, dla którego sól do 0.5.0 leżała w `wp_options` wpisana surowym
	 * INSERT-em, czyli zapisem do tabeli rdzenia (AUD-ARCH-F1-001).
	 *
	 * Odczyt zwrotny jest obowiązkowy: wołający ma używać wartości Z BAZY,
	 * nie tej, którą próbował wpisać — przegrany wyścigu inaczej podpisywałby
	 * własną solą strony, których sito nigdy nie przyjmie.
	 *
	 * @param string $klucz   Klucz ustawienia (≤ 64 znaki).
	 * @param string $wartosc Wartość proponowana, gdy klucza jeszcze nie ma.
	 * @return string|null Wartość z bazy po zapisie; `null`, gdy zapis i odczyt zawiodły.
	 */
	public static function ustawienie_utworz( string $klucz, string $wartosc ): ?string {
		global $wpdb;
		$t = Aai_Monitor_Tabele::tabela( 'ustawienia' );
		try {
			$wynik = $wpdb->query(
				$wpdb->prepare(
					"INSERT INTO `{$t}` (`klucz`, `wartosc`) VALUES (%s, %s) ON DUPLICATE KEY UPDATE `klucz` = `klucz`",
					self::przytnij( $klucz, 64 ),
					$wartosc
				)
			); // phpcs:ignore WordPress.DB.PreparedSQL,WordPress.DB.DirectDatabaseQuery
			if ( false === $wynik ) {
				self::zglos( 'nie udało się zapisać ustawienia „' . $klucz . '”: ' . $wpdb->last_error );
			}
			$w_bazie = $wpdb->get_var(
				$wpdb->prepare( "SELECT `wartosc` FROM `{$t}` WHERE `klucz` = %s", self::przytnij( $klucz, 64 ) )
			); // phpcs:ignore WordPress.DB.PreparedSQL,WordPress.DB.DirectDatabaseQuery
			return is_string( $w_bazie ) && '' !== $w_bazie ? $w_bazie : null;
		} catch ( Throwable $e ) {
			self::zglos( 'nie udało się zapisać ustawienia „' . $klucz . '”: ' . $e->getMessage() );
			return null;
		}
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
				$ile = (int) $ile + self::przytnij_liczbe( 'logowania', Aai_Monitor_Tabele::SUFIT_WIERSZY_LOGOWAN );
			} else {
				$t   = Aai_Monitor_Tabele::tabela( 'wizyty' );
				$ile = $wpdb->query(
					$wpdb->prepare(
						"DELETE FROM `{$t}` WHERE `wejscie` < %s",
						self::teraz_utc( 0, -Aai_Monitor_Tabele::OKNO_WIZYTY_DNI )
					)
				); // phpcs:ignore WordPress.DB.PreparedSQL
				$ile = (int) $ile + self::przytnij_liczbe( 'wizyty', Aai_Monitor_Tabele::SUFIT_WIERSZY_WIZYT );
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
	 * Ścina tabelę do sufitu liczby wierszy (A2, decyzja właściciela).
	 *
	 * OBIE TABELE, nie tylko ruch. Od 2026-09-05 ten sam sufit ma dziennik
	 * logowań: nieudane logowanie zapisuje KAŻDY, kto wyśle formularz
	 * (zmierzone: 28 wierszy w 1,4 s), a wszystkie takie wiersze są młodsze
	 * niż 90 dni, więc retencja po wieku nie rusza ich w ogóle.
	 *
	 * WIEK NIE WYSTARCZY JAKO JEDYNE KRYTERIUM: podpis ścieżki stoi jawnie
	 * w HTML i jest wielokrotnego użytku, więc jeden nieuwierzytelniony
	 * klient mieści się w limiterze i dopisuje ~430 000 wierszy na dobę —
	 * a wszystkie są młodsze niż 400 dni, czyli retencja po wieku ich nie
	 * rusza. Sufit ścina NAJSTARSZE, bo to one najmniej znaczą.
	 *
	 * LICZYMY NAJPIERW ROZPIĘTOŚĆ IDENTYFIKATORÓW, NIE WIERSZY. `COUNT(*)`
	 * przy KAŻDYM zapisie kosztowałby pełny skan tabeli, a beacon jest
	 * najczęstszym zapisem tego modułu. Rozpiętość `MAX(id) − MIN(id)` jest
	 * z definicji NIE MNIEJSZA niż liczba wierszy i bierze się z indeksu,
	 * więc jako WSTĘPNE sito jest bezpieczna: gdy nie przekracza sufitu,
	 * wierszy na pewno też nie ma za dużo i nie dotykamy tabeli w ogóle.
	 *
	 * ALE ROZPIĘTOŚĆ NIE WYSTARCZA DO KASOWANIA — i to jest różnica, która
	 * kosztowała dane. Rozpiętość rośnie od DZIUR w identyfikatorach, a te
	 * robią się przy każdym masowym usunięciu: sprzątaniu po testach,
	 * czyszczeniu śladów, `ALTER TABLE … AUTO_INCREMENT`. Zmierzone
	 * 2026-09-05 na dzienniku logowań: 41 wierszy, `MAX(id)` = 334,
	 * a `AUTO_INCREMENT` = 200 001 po wcześniejszym pomiarze. Pierwszy zapis
	 * po takim stanie dawał rozpiętość 200 000 przy 42 wierszach — i sufit
	 * skasował WSZYSTKO, łącznie z dowodowymi logowaniami właściciela.
	 * Fałszywy alarm sita zamieniał się wprost w utratę danych.
	 *
	 * Dlatego po przekroczeniu sita PYTAMY O PRAWDZIWĄ LICZBĘ. `COUNT(*)`
	 * biegnie wtedy najwyżej raz na tabelę, i to tylko w stanie, w którym
	 * i tak podejrzewamy, że jest duża — a próg kasowania wyznacza
	 * IDENTYFIKATOR wiersza stojącego dokładnie na granicy sufitu, nie
	 * arytmetyka na `MAX(id)`.
	 */
	private static function przytnij_liczbe( string $ktora, int $sufit ): int {
		global $wpdb;

		$t = Aai_Monitor_Tabele::tabela( $ktora );

		$granice = $wpdb->get_row( "SELECT MIN(`id`) AS naj_starszy, MAX(`id`) AS naj_nowszy FROM `{$t}`" ); // phpcs:ignore WordPress.DB.PreparedSQL,WordPress.DB.DirectDatabaseQuery
		if ( null === $granice || null === $granice->naj_nowszy ) {
			return 0;
		}

		$rozpietosc = (int) $granice->naj_nowszy - (int) $granice->naj_starszy + 1;
		if ( $rozpietosc <= $sufit ) {
			return 0;
		}

		// Sito powiedziało „może być za dużo". Teraz pytamy, ILE JEST NAPRAWDĘ.
		$wierszy = (int) $wpdb->get_var( "SELECT COUNT(*) FROM `{$t}`" ); // phpcs:ignore WordPress.DB.PreparedSQL,WordPress.DB.DirectDatabaseQuery
		if ( $wierszy <= $sufit ) {
			return 0;
		}

		/*
		 * Próg to IDENTYFIKATOR wiersza stojącego dokładnie na granicy sufitu,
		 * a nie `MAX(id) − sufit`: przy dziurach w identyfikatorach ta druga
		 * arytmetyka kasuje wiersze, których wcale nie ma za dużo.
		 */
		$prog = $wpdb->get_var(
			$wpdb->prepare( "SELECT `id` FROM `{$t}` ORDER BY `id` DESC LIMIT 1 OFFSET %d", $sufit )
		); // phpcs:ignore WordPress.DB.PreparedSQL,WordPress.DB.DirectDatabaseQuery
		if ( null === $prog ) {
			return 0;
		}

		$ile = $wpdb->query(
			$wpdb->prepare( "DELETE FROM `{$t}` WHERE `id` <= %d", (int) $prog )
		); // phpcs:ignore WordPress.DB.PreparedSQL,WordPress.DB.DirectDatabaseQuery

		return false === $ile ? 0 : (int) $ile;
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
