<?php
/**
 * Komendy WP-CLI Pluginu 2 — kontrola w wersji minimalnej (krok P1).
 *
 * ROLE SĄ ROZDZIELONE (L11 z krytyki P0): kontrola NIGDY nie pisze —
 * inaczej mierzyłaby skutek własnego działania i nigdy nie byłaby
 * czerwona. Ustawianie żyje przy aktywacji i (od P3a) w `sync --napraw`.
 *
 * Kody wyjścia:
 *  - 0 — porządek, ALBO stan „Woo/Tutor wyłączone" (z komunikatem;
 *    1 rezerwujemy dla działającego otoczenia z rozjazdem, bo bramka P1
 *    mówi „wyłączenie Woo daje komunikat" — kod 1 by jej przeczył),
 *  - 0 z OSTRZEŻENIEM — inna wersja Tutora/Woo niż dowiedziona
 *    (aktualizacja to nie awaria, ale unieważnia dowody — L17),
 *  - 1 — rozjazd: wtyczka aktywna, a jej tabel nie ma.
 *
 * Kolejne kroki (P2+) tylko DOKŁADAJĄ sprawdzenia do tej komendy —
 * kontrola rośnie razem z wtyczką.
 *
 * @package Aai_Platnosci
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * `wp aai-platnosci <komenda>`.
 */
final class Aai_Platnosci_Cli {

	/**
	 * Rozjazd, który sam się nie naprawi — zawsze kod wyjścia 1.
	 */
	private const STAN_ROZJAZD = 'rozjazd';

	/**
	 * Stan przejściowy, który dokańcza najbliższa synchronizacja —
	 * degradowany do komunikatu, gdy synchronizacja była świeża (B15).
	 */
	private const STAN_DOKANCZA_SIE = 'dokancza-sie';

	/**
	 * Synchronizacja kursów do produktów WooCommerce.
	 *
	 * Bez argumentu: wszystkie (opublikowane w przód, zdjęte w dół).
	 * Ze slugiem: jeden kurs, także szkic (zejdzie na draft).
	 *
	 * ## OPTIONS
	 *
	 * [<slug>]
	 * : Slug kursu.
	 *
	 * [--napraw-cene]
	 * : Napraw cenę efektywną (`_price`) produktów, którym ktoś zapisał ją
	 * metą z pominięciem API Woo. Operacja JAWNA, bo wymaga przejścia przez
	 * cenę tymczasową — produkt schodzi na czas naprawy na `draft`, żeby
	 * nikt nie kupił go po cenie przejściowej.
	 *
	 * [--napraw]
	 * : Doprowadź USTAWIENIA do wartości docelowych sekcji 8 schematu
	 * (silnik `wc`, para opcji kasy, polskie sluggi koszyka i kasy, strony
	 * natywnej kasy Tutora na draft). Jedyna ścieżka ustawiania obok
	 * aktywacji wtyczki — kontrola (`sprawdz`) NIGDY nie pisze (L11).
	 *
	 * ## EXAMPLES
	 *
	 *     wp aai-platnosci sync
	 *     wp aai-platnosci sync jak-korzystac-z-claude
	 *     wp aai-platnosci sync --napraw-cene
	 *     wp aai-platnosci sync --napraw
	 *
	 * @param string[]             $args       Argumenty pozycyjne.
	 * @param array<string,string> $assoc_args Argumenty nazwane.
	 * @when after_wp_load
	 */
	public function sync( array $args, array $assoc_args = array() ): void {
		if ( array() !== Aai_Platnosci_Zaleznosci::brakuje() ) {
			WP_CLI::log( 'sync: wyłączone — ' . implode( ', ', Aai_Platnosci_Zaleznosci::brakuje() ) . '.' );
			WP_CLI::halt( 0 );
		}

		if ( ! class_exists( 'Aai_Sklep_Odczyt' ) ) {
			// Bez Pluginu 1 nie ma źródła kursów. Komunikat, nie fatal:
			// pierwsza wersja wchodziła tu w nieistniejącą klasę i kończyła
			// się BŁĘDEM KRYTYCZNYM PHP.
			WP_CLI::log( 'sync: wyłączone — brak wtyczki „Automatic AI — Sklep" (Plugin 1). Nie ma czego synchronizować.' );
			WP_CLI::halt( 0 );
		}

		if ( isset( $assoc_args['napraw'] ) ) {
			// Ustawienia PRZED produktami — ta sama kolejność co przy
			// aktywacji: synchronizacja przy rozbrojonym szwie zostawiałaby
			// produkty, których strona Tutora jeszcze nie rozumie.
			foreach ( Aai_Platnosci_Ustawienia::napraw() as $zmiana ) {
				WP_CLI::log( 'napraw: ' . $zmiana );
			}
		}

		if ( isset( $args[0] ) ) {
			$kurs = Aai_Sklep_Odczyt::szczegoly_kursu( (string) $args[0], true );
			if ( null === $kurs ) {
				WP_CLI::error( sprintf( 'nie ma kursu o slugu „%s".', $args[0] ) );
			}
			$w = Aai_Platnosci_Zapis::synchronizuj_kurs( (string) $kurs['id'] );
		} else {
			$w = Aai_Platnosci_Zapis::synchronizuj_wszystkie();
		}

		$naprawione = 0;
		if ( isset( $assoc_args['napraw-cene'] ) ) {
			// Slug ZAWĘŻA także naprawę — inaczej `sync <slug> --napraw-cene`
			// obiecywałby jeden kurs, a przepuszczał przez cenę tymczasową
			// wszystkie opublikowane produkty.
			$do_naprawy = isset( $args[0] )
				? array_filter(
					Aai_Sklep_Odczyt::lista_kursow(),
					static fn( $k ) => (string) $k['slug'] === (string) $args[0]
				)
				: Aai_Sklep_Odczyt::lista_kursow();
			foreach ( $do_naprawy as $kurs ) {
				if ( (int) $kurs['price_grosze'] <= 0 ) {
					continue;
				}
				$product_id = Aai_Platnosci_Zapis::produkt_kursu( (string) $kurs['id'] );
				if ( null === $product_id ) {
					continue;
				}
				$produkt = wc_get_product( $product_id );
				if ( ! $produkt ) {
					continue;
				}
				$cena       = number_format( ( (int) $kurs['price_grosze'] ) / 100, 2, '.', '' );
				$promocyjna = (string) $produkt->get_sale_price( 'edit' );
				$oczekiwana = '' === $promocyjna ? $cena : $promocyjna;
				if ( (string) $produkt->get_price( 'edit' ) === $oczekiwana ) {
					continue;
				}
				if ( Aai_Platnosci_Zapis::napraw_cene_efektywna( $product_id, $cena ) ) {
					++$naprawione;
					WP_CLI::log( sprintf( 'naprawiono cenę efektywną produktu %d (%s)', $product_id, $kurs['slug'] ) );
				} else {
					WP_CLI::warning( sprintf( 'naprawa ceny produktu %d NIE powiodła się', $product_id ) );
				}
			}
		}

		/*
		 * Stan błędu czyścimy TU, a nie tylko przy zapisie w kokpicie:
		 * komunikat kontroli kieruje właśnie do tej komendy, więc bez
		 * tego naprawa zostawiałaby kontrolę czerwoną na zawsze (B5).
		 * To jest ścieżka USTAWIANIA, nie kontroli — L11 nienaruszone.
		 */
		if ( array() === $w['uwagi'] ) {
			foreach ( array_keys( Aai_Platnosci_Komunikaty::wszystkie() ) as $klucz ) {
				Aai_Platnosci_Komunikaty::wyczysc( '_ogolny' === $klucz ? '' : (string) $klucz );
			}
		}

		foreach ( $w['uwagi'] as $uwaga ) {
			WP_CLI::warning( $uwaga );
		}
		WP_CLI::success(
			sprintf(
				'sync: utworzone %d, zaktualizowane %d, bez zmian %d, zdjęte %d'
				. ( isset( $assoc_args['napraw-cene'] ) ? ', naprawione ceny ' . $naprawione : '' ) . '.',
				$w['produkt_utworzony'],
				$w['zaktualizowany'],
				$w['bez_zmian'],
				$w['zdjety']
			)
		);
	}

	/**
	 * Otwiera albo zamyka sprzedaż kursów.
	 *
	 * Sprzedaży NIE otwiera aktywacja wtyczki i nie otworzy jej żadna
	 * aktualizacja — to jest świadome działanie właściciela. Powód nie
	 * jest techniczny: kod bywa gotowy wcześniej niż regulamin, zgoda na
	 * natychmiastowe dostarczenie treści cyfrowej i prawdziwa bramka
	 * płatności, a „zielone dowody" nie znaczą „można sprzedawać ludziom".
	 *
	 * ## OPTIONS
	 *
	 * [<co>]
	 * : `otworz` albo `zamknij`. Bez argumentu: pokazuje stan.
	 *
	 * ## EXAMPLES
	 *
	 *     wp aai-platnosci sprzedaz
	 *     wp aai-platnosci sprzedaz otworz
	 *
	 * @when after_wp_load
	 *
	 * @param array $args Argumenty pozycyjne.
	 */
	public function sprzedaz( array $args = array() ): void {
		$co = (string) ( $args[0] ?? '' );
		if ( '' === $co ) {
			WP_CLI::log( Aai_Platnosci_Ustawienia::stan_sprzedazy() );
			return;
		}
		if ( ! in_array( $co, array( 'otworz', 'zamknij' ), true ) ) {
			WP_CLI::error( sprintf( 'nie wiem, co znaczy „%s" — użyj `otworz` albo `zamknij`.', $co ) );
		}

		$otwiera = 'otworz' === $co;
		update_option(
			Aai_Platnosci_Ustawienia::OPCJA_SPRZEDAZ,
			$otwiera ? Aai_Platnosci_Ustawienia::SPRZEDAZ_OTWARTA : ''
		);

		if ( $otwiera && 0 === self::wlaczonych_bramek() ) {
			// Ostrzeżenie, nie odmowa: bramkę wybiera właściciel i może ją
			// włączyć minutę później. Ale milczeć tu nie wolno — zmierzone
			// przy E0: bez bramki kasa oddaje 400, więc przycisk prowadzi
			// do kasy, która odmawia każdemu.
			WP_CLI::warning( 'sprzedaż otwarta, ale w WooCommerce nie ma ani jednej włączonej bramki płatności — kasa odmówi każdemu klientowi (400).' );
		}
		WP_CLI::success( Aai_Platnosci_Ustawienia::stan_sprzedazy() );
	}

	/**
	 * Ile bramek płatności jest włączonych w WooCommerce.
	 */
	private static function wlaczonych_bramek(): int {
		if ( ! function_exists( 'WC' ) || ! WC()->payment_gateways ) {
			return 0;
		}
		$ile = 0;
		foreach ( WC()->payment_gateways->payment_gateways() as $bramka ) {
			if ( 'yes' === $bramka->enabled ) {
				++$ile;
			}
		}
		return $ile;
	}

	/**
	 * Dziennik dostarczenia: co klient dostał i czy wiadomość wyszła.
	 *
	 * ## OPTIONS
	 *
	 * [--ponow=<zdarzenie-ukosnik-id>]
	 * : Wyślij wiadomość jeszcze raz, np. `mail_konta/41`. Jedyna droga,
	 * którą mail wychodzi drugi raz — znacznik broni przed duplikatem
	 * z cudzej rekurencji, nie przed decyzją właściciela.
	 *
	 * ## EXAMPLES
	 *
	 *     wp aai-platnosci dostawy
	 *     wp aai-platnosci dostawy --ponow=mail_konta/41
	 *
	 * @when after_wp_load
	 *
	 * @param array $args      Argumenty pozycyjne (nieużywane).
	 * @param array $opcje     Opcje.
	 */
	public function dostawy( array $args = array(), array $opcje = array() ): void {
		unset( $args );
		if ( ! Aai_Platnosci_Tabele::istnieja() ) {
			WP_CLI::error( 'brak tabel wtyczki — aktywuj ją ponownie.' );
		}

		$ponow = (string) ( $opcje['ponow'] ?? '' );
		if ( '' !== $ponow ) {
			$czesci = explode( '/', $ponow, 2 );
			if ( 2 !== count( $czesci ) || '' === $czesci[0] || ! ctype_digit( $czesci[1] ) ) {
				WP_CLI::error( 'oczekiwałem postaci `zdarzenie/id`, np. mail_konta/41.' );
			}
			$wynik = Aai_Platnosci_Maile::ponow( $czesci[0], (int) $czesci[1] );
			if ( Aai_Platnosci_Maile::WYNIK_OK === $wynik ) {
				WP_CLI::success( sprintf( 'wysłano ponownie: %s', $ponow ) );
				return;
			}
			WP_CLI::error( sprintf( 'ponowna wysyłka %s nie powiodła się: %s', $ponow, $wynik ) );
		}

		global $wpdb;
		$tabela = Aai_Platnosci_Tabele::tabela( 'dostawy' );
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- nazwa tabeli z klasy tabel.
		$wiersze = $wpdb->get_results( "SELECT * FROM {$tabela} ORDER BY id DESC LIMIT 200" );
		if ( ! is_array( $wiersze ) || array() === $wiersze ) {
			WP_CLI::log( 'dostawy: dziennik jest pusty — nikt jeszcze nic nie kupił.' );
			return;
		}
		foreach ( $wiersze as $w ) {
			WP_CLI::log(
				sprintf(
					'%s %s/%d %s [%s]',
					self::czy_dostawa_w_porzadku( (string) $w->zdarzenie, (string) $w->wynik ) ? '  ok ' : 'BŁĄD',
					$w->zdarzenie,
					$w->identyfikator,
					$w->created_at,
					'' === $w->wynik ? 'brak potwierdzenia wysyłki' : $w->wynik
				)
			);
		}
	}

	/**
	 * Czy wiersz dziennika opisuje dostawę, która doszła do skutku.
	 *
	 * PUSTA wartość NIE JEST w porządku: znacznik zapisujemy przed
	 * wysyłką (musi być atomowy), więc pusty `wynik` znaczy „żądanie
	 * padło między znacznikiem a wysyłką" — czyli klient zapłacił i nie
	 * dostał wiadomości. To jest dokładnie ten stan, o którym kontrola
	 * ma krzyczeć.
	 *
	 * @param string $zdarzenie Zdarzenie.
	 * @param string $wynik     Zapisany rezultat.
	 */
	private static function czy_dostawa_w_porzadku( string $zdarzenie, string $wynik ): bool {
		if ( Aai_Platnosci_Maile::ZDARZENIE_DOSTEP === $zdarzenie ) {
			return '' !== $wynik;
		}
		return Aai_Platnosci_Maile::WYNIK_OK === $wynik;
	}

	/**
	 * Błędy dziennika dostaw — dla kontroli.
	 *
	 * Dwa pytania, każde o coś innego: (1) czy któraś wiadomość nie
	 * wyszła; (2) czy jest opłacone zamówienie z kursem, przy którym
	 * dostępu w ogóle nie odnotowaliśmy. Drugie pytanie jest ważniejsze —
	 * mówi o kliencie, który zapłacił i nic nie dostał.
	 *
	 * @return string[]
	 */
	private static function bledy_dostaw(): array {
		if ( ! Aai_Platnosci_Tabele::istnieja() ) {
			return array();
		}
		global $wpdb;
		$bledy  = array();
		$tabela = Aai_Platnosci_Tabele::tabela( 'dostawy' );
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- nazwa tabeli z klasy tabel.
		$wiersze = $wpdb->get_results( "SELECT zdarzenie, identyfikator, wynik FROM {$tabela}" );
		foreach ( (array) $wiersze as $w ) {
			if ( self::czy_dostawa_w_porzadku( (string) $w->zdarzenie, (string) $w->wynik ) ) {
				continue;
			}
			$bledy[] = sprintf(
				'dostawa %s/%d NIE doszła do skutku (%s). Napraw: wp aai-platnosci dostawy --ponow=%s/%d',
				$w->zdarzenie,
				$w->identyfikator,
				'' === $w->wynik ? 'brak potwierdzenia wysyłki — żądanie padło między znacznikiem a wysyłką' : $w->wynik,
				$w->zdarzenie,
				$w->identyfikator
			);
		}

		if ( ! function_exists( 'wc_get_orders' ) ) {
			return $bledy;
		}
		/*
		 * OKNO 30 DNI I SUFIT 100 ZAMÓWIEŃ — powiedziane wprost, bo cichy
		 * sufit czyta się jak „sprawdziłem wszystko". Starsze zamówienia
		 * pomijamy świadomie: dostawa, której nie odnotowaliśmy pół roku
		 * temu, i tak nie doczeka się już maila, a kontrola ma pokazywać
		 * to, na co da się zareagować.
		 */
		$zamowienia = wc_get_orders(
			array(
				'status'       => array( 'completed' ),
				'limit'        => 100,
				'orderby'      => 'date',
				'order'        => 'DESC',
				'date_created' => '>' . ( time() - 30 * DAY_IN_SECONDS ),
			)
		);
		foreach ( (array) $zamowienia as $order ) {
			if ( ! $order instanceof WC_Order ) {
				continue;
			}
			$ma_kurs = false;
			foreach ( $order->get_items() as $pozycja ) {
				if ( $pozycja instanceof WC_Order_Item_Product
					&& Aai_Platnosci_Zapis::czy_produkt_kursu( (int) $pozycja->get_product_id() ) ) {
					$ma_kurs = true;
					break;
				}
			}
			if ( ! $ma_kurs ) {
				continue;
			}
			$id = (int) $order->get_id();
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- nazwa tabeli z klasy tabel.
			$jest = $wpdb->get_var(
				$wpdb->prepare(
					"SELECT id FROM {$tabela} WHERE zdarzenie = %s AND identyfikator = %d",
					Aai_Platnosci_Maile::ZDARZENIE_DOSTEP,
					$id
				)
			);
			if ( null === $jest ) {
				$bledy[] = sprintf(
					'zamówienie %d jest ZREALIZOWANE i niesie kurs, a dostępu nie odnotowaliśmy — klient mógł zapłacić i nic nie dostać. Sprawdź zapis w Tutorze, potem: wp aai-platnosci sync',
					$id
				);
			}
		}
		return $bledy;
	}

	/**
	 * Kontrola stanu szwu.
	 *
	 * ## EXAMPLES
	 *
	 *     wp aai-platnosci sprawdz
	 *
	 * @when after_wp_load
	 */
	public function sprawdz(): void {
		$bledy       = array();
		$ostrzezenia = array();

		if ( ! Aai_Platnosci_Tabele::istnieja() ) {
			$bledy[] = 'brak tabel wtyczki (powiazania, dostawy) — aktywuj wtyczkę ponownie, aktywacja tworzy schemat.';
		}

		/*
		 * BRAK WŁASNYCH TABEL TO NASZ ROZJAZD — kod 1, i to PRZED bramką
		 * zależności. Pierwsza wersja drukowała go jako ostrzeżenie
		 * i kończyła zerem, gdy przy okazji brakowało Woo: stan „schematu
		 * Pluginu 2 nie ma" przechodził wtedy jako zielona bramka.
		 */
		if ( array() !== $bledy ) {
			foreach ( $bledy as $blad ) {
				WP_CLI::error( $blad, false );
			}
			WP_CLI::halt( 1 );
		}

		$brak = Aai_Platnosci_Zaleznosci::brakuje();
		if ( array() !== $brak ) {
			// Świadomie kod 0: wyłączone otoczenie to stan nazwany, nie rozjazd.
			WP_CLI::log( 'sprawdz: wyłączone — ' . implode( ', ', $brak ) . '. Sprzedaż nie działa; dane Pluginu 2 czekają.' );
			// Mówimy WPROST, że kursów nie sprawdzono. „Wyłączone" bez tego
			// zdania czyta się jak „sprawdziłem i jest w porządku" — a to
			// dwie różne rzeczy (B2).
			WP_CLI::log( 'sprawdz: kontrola rozjazdu POMINIĘTA — nie było z czym porównywać produktów.' );
			WP_CLI::halt( 0 );
		}

		$woo = defined( 'WC_VERSION' ) ? WC_VERSION : '?';
		if ( Aai_Platnosci_Zaleznosci::WOO_DOWIEDZIONE !== $woo ) {
			$ostrzezenia[] = "WooCommerce {$woo}, a łańcuch dowiedziono na " . Aai_Platnosci_Zaleznosci::WOO_DOWIEDZIONE . '.';
		}
		$tutor = defined( 'TUTOR_VERSION' ) ? TUTOR_VERSION : '?';
		if ( Aai_Platnosci_Zaleznosci::TUTOR_DOWIEDZIONE !== $tutor ) {
			$ostrzezenia[] = "Tutor LMS {$tutor}, a łańcuch dowiedziono na " . Aai_Platnosci_Zaleznosci::TUTOR_DOWIEDZIONE . '.';
		}

		if ( array() !== $ostrzezenia ) {
			foreach ( $ostrzezenia as $o ) {
				WP_CLI::warning( $o );
			}
			WP_CLI::log( 'Po aktualizacji potwierdź trzy fakty z sekcji 0 schematu (docs/plugin-2/DIAGRAM.md):' );
			WP_CLI::log( ' 1. łańcuch domknięcia zamówienia (needs_processing → completed),' );
			WP_CLI::log( ' 2. kolejność pary _tutor_course_price_type / _tutor_course_product_id w do_enroll(),' );
			WP_CLI::log( ' 3. para opcji kasy: zakup gościa + rejestracja z kasy.' );
		}

		// ── Kontrola rozjazdu kurs ↔ produkt (krok P2) ────────────────
		// Kontrola NIGDY nie pisze (L11). Dwa progi (B15): świeży
		// `sync_ts` (młodszy niż 10 minut) degraduje rozjazd do
		// komunikatu „w trakcie" — kod 0.
		/*
		 * Ustawienia (P3a): rozjazd wartości = kod 1 — w tym SZEW ROZBROJONY
		 * (C5), który do P3a był stanem projektowanym (kod 0), a od P3a jest
		 * awarią: silnik ma stać na `wc`, pilnuje go filtr B17, a jedyną
		 * naprawą jest `sync --napraw`. Stan sprzedaży (zamknięta do P4)
		 * jest NAZYWANY osobno — to stan projektowany, nie rozjazd.
		 */
		foreach ( Aai_Platnosci_Ustawienia::rozjazdy() as $rozjazd_ustawien ) {
			$bledy[] = $rozjazd_ustawien;
		}

		$w_trakcie   = array();
		$w_trakcie[] = Aai_Platnosci_Ustawienia::stan_sprzedazy();
		if ( ! class_exists( 'Aai_Sklep_Odczyt' ) ) {
			// B2: brak Pluginu 1 to stan nazwany (kod 0), ale kontrola
			// NIE MA PRAWA meldować sukcesu, nie sprawdziwszy ani jednego
			// kursu — pierwsza wersja mówiła „Success" i milczała o tym.
			WP_CLI::log( 'sprawdz: kontrola rozjazdu POMINIĘTA — nie ma wtyczki „Automatic AI — Sklep" (Plugin 1), więc nie ma z czym porównywać produktów.' );
			foreach ( $w_trakcie as $info ) {
				WP_CLI::log( 'sprawdz: ' . $info );
			}
			WP_CLI::halt( 0 );
		}
		if ( class_exists( 'Aai_Sklep_Odczyt' ) && Aai_Platnosci_Tabele::istnieja() ) {
			foreach ( Aai_Sklep_Odczyt::lista_kursow() as $kurs ) {
				if ( (int) $kurs['price_grosze'] <= 0 ) {
					continue;
				}
				$rozjazdy = self::rozjazdy_kursu( $kurs );
				if ( array() === $rozjazdy ) {
					continue;
				}
				/*
				 * DWA PROGI (B15) rozstrzygane po KODZIE stanu, nie po
				 * treści komunikatu. Dwie poprzednie wersje myliły się tu
				 * inaczej: pierwsza degradowała KAŻDY rozjazd przez
				 * 10 minut (ślepota na zepsutą cenę), druga rozpoznawała
				 * „stan niekompletny" po fragmentach napisu — a wzorzec
				 * na napis w tym repo zzieleniał już trzy razy (0.29.0,
				 * 0.44.0, P1). Do tego dwa z trzech tamtych śladów były
				 * MARTWE: dotyczyły stanów, w których produktu nie ma,
				 * więc znacznika czasu nie było skąd wziąć.
				 *
				 * Degradacji podlega DOKŁADNIE JEDEN stan: brak wiersza
				 * powiązania tuż po synchronizacji — bo tylko on dokańcza
				 * się sam. Znacznik czasu bierzemy z NASZEGO wiersza
				 * `powiazania`, nie z mety produktu (którego w tym stanie
				 * może nie być).
				 */
				$sync_ts    = self::sync_ts_kursu( (string) $kurs['id'] );
				$swieza_syn = $sync_ts > 0 && ( time() - $sync_ts ) < 60;
				foreach ( $rozjazdy as $r ) {
					list( $kod, $opis ) = $r;
					if ( $swieza_syn && self::STAN_DOKANCZA_SIE === $kod ) {
						$w_trakcie[] = sprintf( '%s: %s (kopia w trakcie — sync sprzed %d s)', $kurs['slug'], $opis, time() - $sync_ts );
					} else {
						$bledy[] = sprintf( '%s: %s', $kurs['slug'], $opis );
					}
				}
			}
			foreach ( self::duplikaty_uuid() as $blad_uuid ) {
				$bledy[] = $blad_uuid;
			}
			$osierocone = self::osierocone();
			foreach ( $osierocone['bledy'] as $blad_sieroty ) {
				$bledy[] = $blad_sieroty;
			}
			foreach ( $osierocone['info'] as $info ) {
				$w_trakcie[] = $info;
			}
		}
		foreach ( self::bledy_dostaw() as $blad_dostawy ) {
			$bledy[] = $blad_dostawy;
		}
		$blad_kopii = Aai_Platnosci_Komunikaty::ostatni();
		if ( '' !== $blad_kopii ) {
			$bledy[] = 'ostatni błąd zgłoszony przez wtyczkę: ' . $blad_kopii;
		}
		foreach ( $w_trakcie as $info ) {
			WP_CLI::log( 'sprawdz: ' . $info );
		}

		if ( array() !== $bledy ) {
			foreach ( $bledy as $blad ) {
				WP_CLI::error( $blad, false );
			}
			WP_CLI::halt( 1 );
		}

		WP_CLI::success(
			sprintf(
				'sprawdz: tabele są, WooCommerce %s i Tutor %s aktywne%s.',
				$woo,
				$tutor,
				array() === $ostrzezenia ? ' (wersje dowiedzione)' : ' (wersje INNE niż dowiedzione — patrz wyżej)'
			)
		);
	}

	/**
	 * Rozjazdy jednego opublikowanego, płatnego kursu (kontrola CZYTA,
	 * nigdy nie pisze — L11).
	 *
	 * @param array<string,mixed> $kurs Karta kursu z Pluginu 1.
	 * @return string[] Opisy rozjazdów (pusta lista = porządek).
	 */
	private static function rozjazdy_kursu( array $kurs ): array {
		$r          = array();
		$product_id = Aai_Platnosci_Zapis::produkt_kursu( (string) $kurs['id'] );
		if ( null === $product_id ) {
			// JEDYNY stan, który dokańcza się sam: powiązania jeszcze nie ma.
			return array( array( self::STAN_DOKANCZA_SIE, 'kurs płatny bez wiersza w powiazania — produkt nie powstał (uruchom sync)' ) );
		}
		$produkt = wc_get_product( $product_id );
		if ( ! $produkt ) {
			return array( array( self::STAN_ROZJAZD, sprintf( 'wiersz powiazania wskazuje produkt %d, którego nie ma', $product_id ) ) );
		}

		if ( 'publish' !== $produkt->get_status() ) {
			$r[] = array( self::STAN_ROZJAZD, sprintf( 'produkt %d ma status %s zamiast publish', $product_id, $produkt->get_status() ) );
		}

		$cena = number_format( ( (int) $kurs['price_grosze'] ) / 100, 2, '.', '' );
		if ( $produkt->get_regular_price( 'edit' ) !== $cena ) {
			$r[] = array( self::STAN_ROZJAZD, sprintf( 'cena regularna %s zamiast %s', $produkt->get_regular_price( 'edit' ), $cena ) );
		}
		// B5: `_price` liczy kasa — porównujemy get_price() OBOK regularnej.
		// Promocja ustawiona w Woo jest legalna: wtedy get_price() ma równać
		// się cenie promocyjnej, nie regularnej.
		$promocyjna = $produkt->get_sale_price( 'edit' );
		$oczekiwana = '' === (string) $promocyjna ? $cena : (string) $promocyjna;
		if ( (string) $produkt->get_price( 'edit' ) !== $oczekiwana ) {
			$r[] = array(
				self::STAN_ROZJAZD,
				sprintf(
					'cena liczona w kasie (_price = %s) nie zgadza się z oczekiwaną %s — ktoś zapisał to pole metą z pominięciem API Woo (B5). Napraw: wp aai-platnosci sync --napraw-cene',
					(string) $produkt->get_price( 'edit' ),
					$oczekiwana
				),
			);
		}

		if ( 'hidden' !== $produkt->get_catalog_visibility( 'edit' ) ) {
			$r[] = array( self::STAN_ROZJAZD, 'produkt widoczny w katalogu Woo — ma być hidden (decyzja właściciela 2026-08-28)' );
		}
		if ( ! $produkt->get_virtual( 'edit' ) ) {
			$r[] = array( self::STAN_ROZJAZD, 'produkt nie jest wirtualny' );
		}
		if ( ! $produkt->get_sold_individually( 'edit' ) ) {
			$r[] = array( self::STAN_ROZJAZD, 'produkt bez _sold_individually — quantity=3 w adresie weźmie trzy sztuki (B14)' );
		}
		if ( 'yes' !== get_post_meta( $product_id, '_tutor_product', true ) ) {
			$r[] = array( self::STAN_ROZJAZD, 'produkt bez _tutor_product — cudzy zapis go skasował, a hak naprawczy nie zadziałał (B13)' );
		}

		$tutor_id = Aai_Platnosci_Zapis::kurs_tutora( (string) $kurs['id'] );
		if ( -1 === $tutor_id ) {
			$r[] = array( self::STAN_ROZJAZD, 'więcej niż jeden wpis Tutora z tym uuid (B4)' );
		} elseif ( null === $tutor_id ) {
			// NIE degradujemy: produkt jest opublikowany i kupowalny, a szew
			// nie działa — to jest „klient płaci i nie dostaje nic" (B3).
			$r[] = array( self::STAN_ROZJAZD, 'brak kopii kursu w Tutorze — powiązanie nie istnieje' );
		} else {
			if ( 'paid' !== get_post_meta( $tutor_id, '_tutor_course_price_type', true ) ) {
				$r[] = array( self::STAN_ROZJAZD, 'wpis Tutora bez _tutor_course_price_type=paid' );
			}
			if ( (int) get_post_meta( $tutor_id, '_tutor_course_product_id', true ) !== $product_id ) {
				$r[] = array( self::STAN_ROZJAZD, 'wpis Tutora wskazuje inny produkt niż powiazania' );
			}
		}
		return $r;
	}

	/**
	 * Znacznik czasu NASZEJ synchronizacji — z wiersza `powiazania`.
	 *
	 * Świadomie NIE z mety produktu: w stanie „produkt jeszcze nie
	 * powstał" produktu nie ma, więc meta zawsze dawała zero i cała
	 * degradacja była martwa. Kolumna jest też odporna na cudze zapisy
	 * produktu.
	 *
	 * @param string $course_uuid Uuid kursu.
	 */
	private static function sync_ts_kursu( string $course_uuid ): int {
		global $wpdb;
		$tabela = Aai_Platnosci_Tabele::tabela( 'powiazania' );
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- nazwa tabeli z klasy tabel.
		$ts = $wpdb->get_var(
			$wpdb->prepare( "SELECT sync_ts FROM {$tabela} WHERE course_uuid = %s", $course_uuid )
		);
		return null === $ts ? 0 : (int) strtotime( (string) $ts . ' UTC' );
	}

	/**
	 * Duplikaty naszego klucza uuid na produktach — „weź pierwszy" nie
	 * istnieje (B4).
	 *
	 * @return string[]
	 */
	private static function duplikaty_uuid(): array {
		global $wpdb;
		$powtorki = $wpdb->get_col(
			"SELECT pm.meta_value FROM {$wpdb->postmeta} pm
			JOIN {$wpdb->posts} p ON p.ID = pm.post_id AND p.post_type = 'product'
			WHERE pm.meta_key = '_aai_platnosci_kurs_uuid'
			GROUP BY pm.meta_value HAVING COUNT(*) > 1"
		);
		return array_map(
			static fn( $uuid ) => sprintf( 'DWA produkty z uuid %s — dopasowanie stało się loterią (B4)', (string) $uuid ),
			$powtorki
		);
	}

	/**
	 * Wiersze `powiazania` kursów, które nie są już opublikowane.
	 * Sierota w statusie `draft` to informacja; sierota w `publish` to
	 * BŁĄD — produkt bez działającego szwu dalej daje się kupić przez
	 * `?add-to-cart`, a klient nie dostanie nic.
	 *
	 * @return array{info: string[], bledy: string[]}
	 */
	private static function osierocone(): array {
		global $wpdb;
		$wynik = array(
			'info'  => array(),
			'bledy' => array(),
		);
		$tabela = Aai_Platnosci_Tabele::tabela( 'powiazania' );
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- nazwa tabeli z klasy tabel.
		foreach ( $wpdb->get_results( "SELECT course_uuid, product_id FROM {$tabela}", ARRAY_A ) as $wiersz ) {
			$kurs = Aai_Sklep_Odczyt::kurs_po_id( (string) $wiersz['course_uuid'] );
			if ( null !== $kurs && 'published' === $kurs['status'] ) {
				continue;
			}
			$status = (string) get_post_status( (int) $wiersz['product_id'] );
			$opis   = null === $kurs ? 'kurs usunięty' : 'kurs ' . $kurs['status'];
			$zdanie = sprintf( 'produkt %d osierocony (%s), status %s', (int) $wiersz['product_id'], $opis, $status );
			if ( 'publish' === $status ) {
				$wynik['bledy'][] = $zdanie . ' — KUPOWALNY bez działającego szwu';
			} else {
				$wynik['info'][] = $zdanie;
			}
		}
		return $wynik;
	}
}
