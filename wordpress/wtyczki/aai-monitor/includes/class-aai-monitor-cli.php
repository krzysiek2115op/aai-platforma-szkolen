<?php
/**
 * Komendy wiersza poleceń: `wp aai-monitor …`.
 *
 * KONTROLA NIGDY NIE PISZE (N16, L11 z krytyki P0 Pluginu 2). `sprawdz`
 * wyłącznie odczytuje i orzeka; naprawy robi warstwa zapisu, a zdjęcie
 * alarmu — osobna, jawna komenda człowieka. Kontrola, która po drodze
 * naprawia, nie umie odpowiedzieć na pytanie „jak było przed nią".
 *
 * WYSTRZAŁ SPRAWDZAMY REJESTREM TRAS, NIGDY ŻĄDANIEM HTTP. Kontener
 * WP-CLI jest osobny i `home_url()` jest z niego nieosiągalny (zmierzone:
 * cURL error 7), więc kontrola po żądaniu byłaby czerwona ZAWSZE
 * i wywracała `postaw.sh` na rzeczy, która działa (P11).
 *
 * @package Aai_Monitor
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Komendy monitoringu.
 */
final class Aai_Monitor_Cli {

	/**
	 * Margines retencji w dniach.
	 *
	 * Retencja jest LENIWA (biegnie przy zapisie i przy otwarciu ekranu),
	 * więc porównanie najstarszego wiersza z ZEGAREM dawałoby fałszywą
	 * czerwień na cichej instalacji — a `postaw.sh` przewraca się na
	 * kodzie 1 (C-3 z krytyki T0). Porównujemy więc z NAJNOWSZYM wierszem:
	 * pytanie brzmi „czy retencja miała okazję i jej nie wykorzystała".
	 */
	private const MARGINES_DNI = 1;

	/**
	 * Sprawdza stan monitoringu.
	 *
	 * Kod 1, gdy: brakuje tabeli, kanał błędów niesie awarię albo
	 * retencja miała okazję zadziałać i nie zadziałała.
	 *
	 * ## EXAMPLES
	 *
	 *     wp aai-monitor sprawdz
	 *
	 * @when after_wp_load
	 */
	public function sprawdz(): void {
		global $wpdb;

		$bledy = array();

		/* 1. schemat */
		$brak = Aai_Monitor_Tabele::brakujace();
		if ( array() !== $brak ) {
			$bledy[] = 'brak tabel: ' . implode( ', ', $brak ) . ' — włącz wtyczkę ponownie, schemat powstaje przy aktywacji';
		} else {
			WP_CLI::line( 'Tabele: ' . implode( ', ', Aai_Monitor_Tabele::wszystkie() ) );
		}

		/* 2. kanał błędów */
		$blad = Aai_Monitor_Komunikaty::ostatni();
		if ( '' !== $blad ) {
			$bledy[] = 'ostatni zapis zgłosił błąd: ' . $blad . ' — po naprawie zdejmij alarm komendą `wp aai-monitor wyczysc-blad`';
		}

		/*
		 * 2b. TABELA ODŁOŻONA NA BOK PRZEZ PRZERWANY TEST.
		 *
		 * `smoke-wp-monitor` chowa dziennik `RENAME`-em, żeby zmierzyć, czy
		 * awaria zapisu jest głośna, i przywraca go w `finally`. Ale
		 * `finally` chroni przed wyjątkiem, nie przed zabiciem procesu:
		 * po `Ctrl+C` w złym momencie prawdziwy dziennik zostaje pod nazwą
		 * `…_smoke_schowana`, a najbliższy `postaw.sh` utworzy przez
		 * `dbDelta` PUSTĄ tabelę o właściwej nazwie. Wszystko wygląda
		 * zdrowo, tylko historia logowań zniknęła — a to materiał dowodowy
		 * po incydencie, którego `uninstall.php` celowo nie kasuje.
		 *
		 * Jedno `SHOW TABLES LIKE` na przebieg kontroli zamienia cichą
		 * podmianę w komunikat z komendą przywracającą.
		 */
		$odlozone = $wpdb->get_col(
			$wpdb->prepare( 'SHOW TABLES LIKE %s', $wpdb->esc_like( $wpdb->prefix . AAI_MONITOR_PREFIKS ) . '%\_smoke\_schowana' )
		);
		if ( is_array( $odlozone ) && array() !== $odlozone ) {
			foreach ( $odlozone as $tabela ) {
				$wlasciwa = str_replace( '_smoke_schowana', '', (string) $tabela );
				$bledy[]  = sprintf(
					'została tabela %s — przerwany test odłożył prawdziwy dziennik na bok, a schemat odtworzył PUSTY. '
						. 'Przywróć: wp db query "DROP TABLE IF EXISTS %s; RENAME TABLE %s TO %s;"',
					$tabela,
					$wlasciwa,
					$tabela,
					$wlasciwa
				);
			}
		}

		/* 3. retencja — wobec NAJNOWSZEGO wiersza, nie wobec zegara */
		foreach ( Aai_Monitor_Odczyt::zakresy() as $nazwa => $zakres ) {
			if ( '' === $zakres['najstarszy'] || '' === $zakres['najnowszy'] ) {
				WP_CLI::line( sprintf( 'Retencja %s: brak wierszy, nie ma czego mierzyć.', $nazwa ) );
				continue;
			}
			$okno = 'logowania' === $nazwa
				? Aai_Monitor_Tabele::OKNO_LOGOWANIA_DNI
				: Aai_Monitor_Tabele::OKNO_WIZYTY_DNI;

			$granica = ( new DateTimeImmutable( $zakres['najnowszy'], new DateTimeZone( 'UTC' ) ) )
				->modify( sprintf( '-%d days', $okno + self::MARGINES_DNI ) );

			if ( new DateTimeImmutable( $zakres['najstarszy'], new DateTimeZone( 'UTC' ) ) < $granica ) {
				$bledy[] = sprintf(
					'retencja %s nie zadziałała: najstarszy wiersz %s przy najnowszym %s (okno %d dni)',
					$nazwa,
					$zakres['najstarszy'],
					$zakres['najnowszy'],
					$okno
				);
				continue;
			}
			WP_CLI::line(
				sprintf(
					'Retencja %s: najstarszy %s, najnowszy %s, okno %d dni — w porządku.',
					$nazwa,
					$zakres['najstarszy'],
					$zakres['najnowszy'],
					$okno
				)
			);
		}

		/*
		 * 4. co dziś zbieramy — i dlaczego BRAK czujki jest teraz BŁĘDEM.
		 *
		 * W kroku T1 zero czujek było stanem normalnym: baza i ekran już
		 * stały, producenci danych mieli dojść później. Od T2 wtyczka ma
		 * dziennik logowań, więc zero czujek znaczy, że coś jest zepsute —
		 * najczęściej niekompletnie wgrany katalog albo zdjęta rejestracja
		 * w pliku głównym. Bez tego warunku dziennik może być martwy przy
		 * WSZYSTKICH bramkach na zielono: zmierzone — zdjęcie jednej linii
		 * `Aai_Monitor_Logowania::zarejestruj()` zostawiało oba strażniki
		 * zielone i kontrolę z kodem 0.
		 */
		$czujki = Aai_Monitor_Ekran::czujki();
		if ( array() === $czujki ) {
			$bledy[] = 'żadna czujka nie jest podpięta — baza stoi, ale NIC NIE ZBIERA danych. '
				. 'Sprawdź, czy katalog wtyczki jest kompletny i czy plik główny woła zarejestruj() '
				. 'producentów (bind mount potrafi umrzeć po checkoucie: podman-compose down && ./postaw.sh)';
		} else {
			WP_CLI::line( 'Czujki: ' . implode( ', ', array_keys( $czujki ) ) . '.' );
		}

		/*
		 * 4b. WYSTRZAŁ — pytamy REJESTR TRAS, nigdy żądaniem HTTP.
		 *
		 * Kontener WP-CLI jest osobny i `home_url()` jest z niego
		 * nieosiągalny (zmierzone: cURL error 7), więc kontrola po
		 * żądaniu byłaby czerwona ZAWSZE i wywracała `postaw.sh` na
		 * rzeczy, która działa (P11).
		 *
		 * Pytamy o OBIE nazwy, bo `admin-post.php` rozgałęzia się po
		 * `is_user_logged_in()` na dwa rozłączne haki (F17). Brak
		 * `admin_post_{action}` gubi cały ruch ZA LOGOWANIEM, czyli
		 * wszystkie strony lekcji; brak `admin_post_nopriv_{action}` —
		 * cały ruch gości. W obu przypadkach beacon dostaje
		 * `wp_die( '', 400 )`, którego nikt nie czyta, więc jedynym
		 * objawem jest pusta tabela.
		 */
		$galezie = array(
			'goście'      => has_action( 'admin_post_nopriv_' . Aai_Monitor_Wizyty::AKCJA ),
			'zalogowani'  => has_action( 'admin_post_' . Aai_Monitor_Wizyty::AKCJA ),
		);
		$martwe = array_keys( array_filter( $galezie, static fn( $jest ) => false === $jest || 0 === $jest ) );
		if ( array() !== $martwe ) {
			$bledy[] = sprintf(
				'wystrzał wizyt nie obsługuje gałęzi: %s. `admin-post.php` ma DWIE rozłączne nazwy akcji — brak którejkolwiek gubi połowę ruchu bez objawu (strony lekcji są za logowaniem).',
				implode( ', ', $martwe )
			);
		} else {
			WP_CLI::line( sprintf( 'Wystrzał: %s?action=%s, obie gałęzie podpięte.', 'admin-post.php', Aai_Monitor_Wizyty::AKCJA ) );
		}

		/*
		 * 4b2. CEL BEACONU I WITRYNA MUSZĄ MIEĆ TO SAMO POCHODZENIE
		 * (A4 z przeglądu T3, decyzja właściciela 2026-08-30: kod 1).
		 *
		 * Adres wystrzału składa `admin_url()`, a sito porównuje `Origin`
		 * z `home_url()`. Typowy rozjazd produkcyjny — `www` w jednym
		 * i brak w drugim, `FORCE_SSL_ADMIN`, inny port — czyni beacon
		 * żądaniem cross-origin: przeglądarka pyta wtedy preflightem,
		 * WordPress odpowiada 403 i pomiar milczy CAŁKOWICIE, przy
		 * kontroli świecącej kod 0. Sprawdzenie jest czystym porównaniem
		 * łańcuchów, bez ani jednego żądania (P11).
		 */
		$pochodzenie = static function ( string $adres ): string {
			$czesci = wp_parse_url( $adres );
			if ( ! is_array( $czesci ) || ! isset( $czesci['host'] ) ) {
				return '';
			}
			$port = isset( $czesci['port'] ) ? ':' . $czesci['port'] : '';
			return strtolower( ( $czesci['scheme'] ?? 'http' ) . '://' . $czesci['host'] . $port );
		};
		$zWystrzalu = $pochodzenie( admin_url() );
		$zWitryny   = $pochodzenie( home_url() );
		if ( '' === $zWystrzalu || '' === $zWitryny || $zWystrzalu !== $zWitryny ) {
			$bledy[] = sprintf(
				'adres kokpitu (%s) i adres witryny (%s) mają różne pochodzenie — beacon jedzie wtedy jako żądanie cross-origin, dostaje 403 na preflighcie i NIE ZAPISUJE SIĘ ANI RAZU, bez żadnego objawu. Uzgodnij `WP_HOME` i `WP_SITEURL` (schemat, host i port).',
				'' === $zWystrzalu ? admin_url() : $zWystrzalu,
				'' === $zWitryny ? home_url() : $zWitryny
			);
		} else {
			WP_CLI::line( sprintf( 'Pochodzenie: kokpit i witryna zgodne (%s).', $zWystrzalu ) );
		}

		/*
		 * 4b2. KTO ODPOWIADA NA PYTANIE O BRAMKĘ LOGOWANIA.
		 *
		 * Kolumna `bramka` w tabeli ruchu mówi, czy odsłona zatrzymała się
		 * na bramce logowania — i jest jedyną liczbą na ekranie, która
		 * odróżnia „ktoś czytał lekcję" od „ktoś odbił się od logowania".
		 * Monitoring sam NIE WIE, co jest bramką: pyta o to filtrem, a
		 * odpowiada widok lekcji Pluginu 1. Gdy nikt nie odpowiada (Plugin 1
		 * wyłączony, zerwana rejestracja po refaktorze), flaga jest zawsze
		 * fałszywa, ekran pokazuje same „przeczytane" i NIC się nie zapala —
		 * dane są ciche i wyglądają zdrowo.
		 *
		 * Pytamy tylko wtedy, gdy Plugin 1 W OGÓLE JEST. Bez niego brak
		 * odpowiadającego nie jest usterką, tylko brakiem tego, kto miałby
		 * odpowiedzieć — i wtedy nie ma też żadnych stron za logowaniem.
		 */
		if ( class_exists( 'Aai_Sklep_Lekcja' ) ) {
			if ( false === has_filter( Aai_Monitor_Pomiar::FILTR_BRAMKI ) ) {
				$bledy[] = sprintf(
					'nikt nie odpowiada na filtr `%s`, choć Plugin 1 jest włączony — kolumna „bramka" w danych ruchu będzie zawsze fałszywa, a ekran pokaże odbicia od logowania jako zwykłe odsłony.',
					Aai_Monitor_Pomiar::FILTR_BRAMKI
				);
			} else {
				WP_CLI::line( 'Bramka logowania: pytanie ma odpowiadającego.' );
			}
		}

		/*
		 * 4c. SÓL PODPISU. Bez niej beacon nie ma jak dowieść, że ścieżka
		 * jest prawdziwa — a odrzuty są ciche (204 jak przyjęcia), więc
		 * objawem byłaby pusta tabela ruchu. Sól powstaje przy aktywacji;
		 * kontrola tylko PYTA (N16 — kontrola nigdy nie pisze), więc
		 * naprawą jest ponowne włączenie wtyczki.
		 */
		foreach ( Aai_Monitor_Podpis::stan_soli() as $blad_soli ) {
			$bledy[] = $blad_soli;
		}

		/* 5. wersje cudzego kodu */
		foreach ( Aai_Monitor_Zaleznosci::wersje() as $nazwa => $wersja ) {
			WP_CLI::line( sprintf( '%s: %s', $nazwa, '' === $wersja ? 'nieobecne' : $wersja ) );
		}
		$dryf = Aai_Monitor_Zaleznosci::dryf();
		if ( array() !== $dryf ) {
			WP_CLI::warning( 'inne wersje niż dowiedzione: ' . implode( '; ', $dryf ) . '. Potwierdź fakty ze schematu (docs/plugin-3/DIAGRAM.md, sekcja 0).' );
		}

		/* 6. czy IP w dzienniku ma sens na tej maszynie (F14) */
		$ip = isset( $_SERVER['REMOTE_ADDR'] ) ? (string) $_SERVER['REMOTE_ADDR'] : '';
		if ( '' !== $ip && false === filter_var( $ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE ) ) {
			WP_CLI::warning(
				sprintf(
					'REMOTE_ADDR = %s to adres prywatny — w warsztacie widać bramę kontenera, nie klienta. Na hostingu trzeba ustalić, gdzie siedzi realny adres.',
					$ip
				)
			);
		}

		if ( array() !== $bledy ) {
			foreach ( $bledy as $b ) {
				WP_CLI::warning( $b );
			}
			WP_CLI::error( sprintf( 'Monitoring: %d rzecz(y) do naprawy.', count( $bledy ) ) );
		}

		WP_CLI::success( 'Monitoring w porządku.' );
	}

	/**
	 * Zdejmuje alarm z kanału błędów.
	 *
	 * Osobna komenda, a nie automat w `sprawdz`: alarm gaśnie wtedy, gdy
	 * CZŁOWIEK potwierdzi, że naprawił. Automatyczne gaszenie „bo
	 * następny zapis się udał" byłoby tu bezużyteczne — przy monitoringu
	 * udany zapis zdarza się co żądanie, więc alarm żyłby ułamek sekundy
	 * i nikt by go nie zobaczył.
	 *
	 * ## EXAMPLES
	 *
	 *     wp aai-monitor wyczysc-blad
	 *
	 * @subcommand wyczysc-blad
	 * @when after_wp_load
	 */
	public function wyczysc_blad(): void {
		$blad = Aai_Monitor_Komunikaty::ostatni();
		if ( '' === $blad ) {
			WP_CLI::success( 'Kanał błędów i tak był pusty.' );
			return;
		}
		Aai_Monitor_Komunikaty::wyczysc();
		WP_CLI::success( 'Zdjęty alarm: ' . $blad );
	}
}
