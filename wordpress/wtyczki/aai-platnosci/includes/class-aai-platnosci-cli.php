<?php
/**
 * Komendy WP-CLI Pluginu 2.
 *
 * ROLE SĄ ROZDZIELONE (L11 z krytyki P0): kontrola NIGDY nie pisze —
 * inaczej mierzyłaby skutek własnego działania i nigdy nie byłaby
 * czerwona. Ustawianie żyje przy aktywacji i (od P3a) w `sync --napraw`.
 *
 * Kody wyjścia `sprawdz`:
 *  - 0 — porządek, ALBO stan „Woo/Tutor wyłączone" (z komunikatem;
 *    1 rezerwujemy dla działającego otoczenia z rozjazdem, bo bramka P1
 *    mówi „wyłączenie Woo daje komunikat" — kod 1 by jej przeczył),
 *  - 0 z OSTRZEŻENIEM — inna wersja Tutora/Woo niż dowiedziona
 *    (aktualizacja to nie awaria, ale unieważnia dowody — L17),
 *  - 1 — KAŻDY rozjazd, który kontrola potrafi nazwać. Pełnej listy tu
 *    NIE MA i nie będzie: rośnie z każdym krokiem (dziś m.in. brak tabel,
 *    rozjazd ustawień, cena i status produktu, zduplikowany uuid,
 *    opublikowana sierota, otwarta sprzedaż bez bramki płatności,
 *    niedoręczona wiadomość), a spis w nagłówku i tak by się rozjechał
 *    z kodem. **Powód czerwieni podaje sama komenda w komunikacie** —
 *    razem z komendą naprawczą. Wcześniejsza wersja tego nagłówka
 *    wymieniała jeden powód („wtyczka aktywna, a jej tabel nie ma")
 *    i po pięciu krokach mówiła nieprawdę.
 *
 * Kolejne kroki tylko DOKŁADAJĄ sprawdzenia do tej komendy — kontrola
 * rośnie razem z wtyczką.
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
	 * [--zamknij=<zdarzenie-ukosnik-id>]
	 * : Uznaj dostawę za rozstrzygniętą, gdy ponowić się jej NIE DA:
	 * `dostep/<id>` nie jest mailem, a konto z `mail_konta/<id>` mogło
	 * zostać skasowane. Bez tej drogi kontrola świeciła przy takim wpisie
	 * czerwono na zawsze i blokowała `postaw.sh`. Wymaga `--powod`.
	 *
	 * [--powod=<tekst>]
	 * : Dlaczego sprawa jest rozstrzygnięta. Obowiązkowy przy `--zamknij` —
	 * wiersz ZOSTAJE w dzienniku i ma mówić, co się naprawdę stało.
	 *
	 * ## EXAMPLES
	 *
	 *     wp aai-platnosci dostawy
	 *     wp aai-platnosci dostawy --ponow=mail_konta/41
	 *     wp aai-platnosci dostawy --zamknij=dostep/41 --powod="klient ma dostęp, sprawdzone ręcznie"
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

		/*
		 * ZAMKNIĘCIE RĘCZNE — jedyna droga wyjścia dla dostawy, której NIE DA
		 * SIĘ ponowić. Zmierzone dead endy: `dostep/<id>` z pustym wynikiem
		 * („zdarzenie »dostep« nie jest mailem") i `mail_konta/<id>` konta,
		 * którego już nie ma („konto już nie istnieje"). Kontrola świeciła
		 * przy nich czerwono NA ZAWSZE i kazała uruchamiać komendę, która
		 * nie mogła pomóc — a jest punktem kontrolnym `postaw.sh`, czyli
		 * kroku zerowego każdego testu ręcznego.
		 *
		 * POWÓD JEST OBOWIĄZKOWY i to jest cała różnica między zamknięciem
		 * a zamiataniem pod dywan: wiersz zostaje w dzienniku i mówi, KTO
		 * uznał sprawę za rozstrzygniętą i DLACZEGO. Zamykamy wyłącznie
		 * wpisy, które już są w dzienniku — ta sama ochrona co przy
		 * ponawianiu.
		 */
		$zamknij = (string) ( $opcje['zamknij'] ?? '' );
		if ( '' !== $zamknij ) {
			$powod = trim( (string) ( $opcje['powod'] ?? '' ) );
			if ( '' === $powod ) {
				WP_CLI::error( 'zamknięcie ręczne wymaga --powod="…" — wpis zostaje w dzienniku i ma mówić, dlaczego uznano sprawę za rozstrzygniętą.' );
			}
			$czesci = explode( '/', $zamknij, 2 );
			if ( 2 !== count( $czesci ) || '' === $czesci[0] || ! ctype_digit( $czesci[1] ) ) {
				WP_CLI::error( 'oczekiwałem postaci `zdarzenie/id`, np. dostep/41.' );
			}
			$zdarzenie     = $czesci[0];
			$identyfikator = (int) $czesci[1];
			if ( ! Aai_Platnosci_Zapis::dostawa_istnieje( $zdarzenie, $identyfikator ) ) {
				WP_CLI::error( sprintf( 'dziennik nie zna dostawy %s/%d — zamykamy wyłącznie wpisy, które w nim są.', $zdarzenie, $identyfikator ) );
			}
			if ( ! Aai_Platnosci_Zapis::dostawa_wynik(
				$zdarzenie,
				$identyfikator,
				Aai_Platnosci_Maile::WYNIK_ZAMKNIETY . $powod
			) ) {
				/*
				 * Bez tego sprawdzenia komenda meldowała „Success" przy
				 * NIEZMIENIONYM wierszu (zmierzone), a kontrola upominała
				 * się o tę dostawę dalej — i blokowała `postaw.sh`, którego
				 * jedynym wyjściem miało być właśnie to zamknięcie.
				 */
				WP_CLI::error( sprintf( 'nie udało się zamknąć dostawy %s — dziennik się nie zmienił, powód nie jest zapisany.', $zamknij ) );
			}
			WP_CLI::success( sprintf( 'zamknięte ręcznie: %s — %s', $zamknij, $powod ) );
			return;
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
		// Rozstrzygnięcie CZŁOWIEKA, z powodem w treści — patrz
		// `Aai_Platnosci_Maile::WYNIK_ZAMKNIETY`. Dotyczy każdego zdarzenia,
		// bo dead endy trafiały się w obu rodzinach (dostęp i maile).
		if ( Aai_Platnosci_Maile::zamkniety_recznie( $wynik ) ) {
			return true;
		}
		if ( Aai_Platnosci_Maile::ZDARZENIE_DOSTEP === $zdarzenie ) {
			return '' !== $wynik;
		}
		/*
		 * Pominięcie jest w porządku WYŁĄCZNIE dla maila 1 — i tylko ono.
		 * Mail 1 wolno pominąć, bo przy płatności natychmiastowej link do
		 * hasła jedzie w mailu o kursie (decyzja właściciela 2026-08-30);
		 * pominięty mail 2 nie istnieje w projekcie, więc dla kontroli
		 * byłby zwykłą awarią.
		 */
		if ( Aai_Platnosci_Maile::ZDARZENIE_KONTO === $zdarzenie && Aai_Platnosci_Maile::WYNIK_POMINIETY === $wynik ) {
			return true;
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
			/*
			 * Komunikat podaje OBIE drogi, bo ponowienie nie zawsze jest
			 * możliwe: `dostep` nie jest mailem, a konto z maila 1 mogło
			 * zostać skasowane. Do 2026-09-05 stała tu tylko pierwsza droga
			 * i przy takim wpisie kontrola świeciła czerwono NA ZAWSZE,
			 * blokując `postaw.sh`.
			 */
			$bledy[] = sprintf(
				'dostawa %s/%d NIE doszła do skutku (%s). Ponów: wp aai-platnosci dostawy --ponow=%s/%d — a jeśli ponowić się nie da (dostęp przyznany inaczej, konto skasowane), zamknij z powodem: wp aai-platnosci dostawy --zamknij=%s/%d --powod="…"',
				$w->zdarzenie,
				$w->identyfikator,
				'' === $w->wynik ? 'brak potwierdzenia wysyłki — żądanie padło między znacznikiem a wysyłką' : $w->wynik,
				$w->zdarzenie,
				$w->identyfikator,
				$w->zdarzenie,
				$w->identyfikator
			);
		}

		if ( ! function_exists( 'wc_get_orders' ) ) {
			return $bledy;
		}
		/*
		 * BEZ OKNA CZASOWEGO I BEZ SUFITU — świadoma zmiana po przeglądzie P4.
		 *
		 * Pierwsza wersja pytała o 100 zamówień z ostatnich 30 dni i nazywała
		 * to kompromisem w komentarzu. ZMIERZONE: opłacone zamówienie z kursem
		 * sprzed 40 dni, bez ani jednego wiersza `dostep`, przechodziło jako
		 * **Success, kod 0** — czyli kontrola mówiła „porządek" o kliencie,
		 * który zapłacił i nic nie dostał. Sufit opisany w komentarzu, ale
		 * niewidoczny w wyjściu, czyta się jak „sprawdziłem wszystko".
		 *
		 * Koszt zamykamy inaczej niż oknem: bierzemy same IDENTYFIKATORY
		 * (`return => 'ids'`, bez budowania obiektów zamówień), a pełne
		 * zamówienie wczytujemy WYŁĄCZNIE dla tych, którym brakuje wiersza
		 * `dostep` — czyli w zdrowym sklepie dla żadnego.
		 */
		$identyfikatory = wc_get_orders(
			array(
				'status' => array( 'completed' ),
				'limit'  => -1,
				'return' => 'ids',
			)
		);
		foreach ( (array) $identyfikatory as $id_zamowienia ) {
			$id = (int) $id_zamowienia;
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- nazwa tabeli z klasy tabel.
			$jest = $wpdb->get_var(
				$wpdb->prepare(
					"SELECT id FROM {$tabela} WHERE zdarzenie = %s AND identyfikator = %d",
					Aai_Platnosci_Maile::ZDARZENIE_DOSTEP,
					$id
				)
			);
			if ( null !== $jest ) {
				continue;
			}
			// Dopiero teraz płacimy za wczytanie zamówienia: pytamy, czy
			// w ogóle niosło kurs. Zamówienia bez kursu nas nie dotyczą.
			$order = wc_get_order( $id );
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
			if ( $ma_kurs ) {
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
	/**
	 * Osierocone ślady po zamówieniach, których już nie ma (REA-INT-F1-003).
	 *
	 * Dwie CUDZE tabele, obie sprawdzane wyłącznie ODCZYTEM (L11: kontrola
	 * nigdy nie pisze): wiersze księgowe Tutora (`wp_tutor_earnings`) i notatki
	 * zamówień Woo (`wp_comments` typu `order_note`) wskazujące `order_id`,
	 * którego nie ma w `wp_wc_orders` (HPOS) ani w `wp_posts` (magazyn
	 * starszy). Do 0.2.0 kontrola o żadną z nich nie pytała — 12 osieroconych
	 * wierszy księgowych i 1345 notatek przy zerze zamówień przechodziło jako
	 * kod 0. Kasuje osobna, jawna komenda `sieroty --usun`, po id.
	 *
	 * @return array{bledy:string[],earnings:int[],notatki:int[]}
	 */
	private static function sieroty_po_zamowieniach(): array {
		global $wpdb;
		$puste = array( 'bledy' => array(), 'earnings' => array(), 'notatki' => array() );
		if ( ! function_exists( 'wc_get_orders' ) ) {
			return $puste;
		}
		try {
			/*
			 * NAZWY CUDZYCH TABEL Z ICH WŁAŚCICIELI, NIE SKLEJANE: `$wpdb->tutor_earnings`
			 * ustawia sam Tutor (Tutor.php), `{$wpdb->prefix}wc_orders` to tabela
			 * HPOS Woo, `{$wpdb->posts}`/`{$wpdb->comments}` — rdzeń. Istniejące
			 * zamówienia liczymy w OBU magazynach, więc „nie ma zamówienia" znaczy
			 * „nie ma go w żadnym". Dwa literały SQL zamiast składanego, bo SQL do
			 * $wpdb idzie w tym repo dosłownie (reguła 6 straznik-wtyczki-wp).
			 */
			// O magazyn zamówień pytamy Woo jego własnym API, nie składaniem nazwy tabeli.
			$ma_hpos = class_exists( '\\Automattic\\WooCommerce\\Utilities\\OrderUtil' ) && \Automattic\WooCommerce\Utilities\OrderUtil::custom_orders_table_usage_is_enabled();
			$ma_earn = isset( $wpdb->tutor_earnings ) && $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $wpdb->esc_like( (string) $wpdb->tutor_earnings ) ) ) === $wpdb->tutor_earnings;

			$earnings = array();
			if ( $ma_earn ) {
				$earnings = $ma_hpos
					? $wpdb->get_col( "SELECT e.earning_id FROM {$wpdb->tutor_earnings} e LEFT JOIN ( SELECT id FROM {$wpdb->prefix}wc_orders UNION SELECT ID AS id FROM {$wpdb->posts} WHERE post_type = 'shop_order' ) z ON z.id = e.order_id WHERE z.id IS NULL AND e.order_id > 0 ORDER BY e.earning_id" ) // phpcs:ignore WordPress.DB.PreparedSQL,WordPress.DB.DirectDatabaseQuery
					: $wpdb->get_col( "SELECT e.earning_id FROM {$wpdb->tutor_earnings} e LEFT JOIN ( SELECT ID AS id FROM {$wpdb->posts} WHERE post_type = 'shop_order' ) z ON z.id = e.order_id WHERE z.id IS NULL AND e.order_id > 0 ORDER BY e.earning_id" ); // phpcs:ignore WordPress.DB.PreparedSQL,WordPress.DB.DirectDatabaseQuery
			}
			$earnings = array_map( 'intval', (array) $earnings );
			$notatki  = $ma_hpos
				? $wpdb->get_col( "SELECT c.comment_ID FROM {$wpdb->comments} c LEFT JOIN ( SELECT id FROM {$wpdb->prefix}wc_orders UNION SELECT ID AS id FROM {$wpdb->posts} WHERE post_type = 'shop_order' ) z ON z.id = c.comment_post_ID WHERE c.comment_type = 'order_note' AND z.id IS NULL ORDER BY c.comment_ID" ) // phpcs:ignore WordPress.DB.PreparedSQL,WordPress.DB.DirectDatabaseQuery
				: $wpdb->get_col( "SELECT c.comment_ID FROM {$wpdb->comments} c LEFT JOIN ( SELECT ID AS id FROM {$wpdb->posts} WHERE post_type = 'shop_order' ) z ON z.id = c.comment_post_ID WHERE c.comment_type = 'order_note' AND z.id IS NULL ORDER BY c.comment_ID" ); // phpcs:ignore WordPress.DB.PreparedSQL,WordPress.DB.DirectDatabaseQuery
			$notatki  = array_map( 'intval', (array) $notatki );

			$bledy = array();
			if ( array() !== $earnings ) {
				$bledy[] = sprintf(
					'%d wiersz(y) księgowych Tutora (wp_tutor_earnings) wskazuje zamówienia, których nie ma: earning_id %s%s. Raport przychodu liczy pieniądze z zamówień skasowanych. Obejrzyj i skasuj po id: wp aai-platnosci sieroty [--usun]',
					count( $earnings ),
					implode( ', ', array_slice( $earnings, 0, 20 ) ),
					count( $earnings ) > 20 ? ', …' : ''
				);
			}
			if ( array() !== $notatki ) {
				$bledy[] = sprintf(
					'%d notatek zamówień WooCommerce (wp_comments/order_note) wskazuje zamówienia, których nie ma: comment_ID %s%s. Historia przypięta do nieistniejących id. Obejrzyj i skasuj po id: wp aai-platnosci sieroty [--usun]',
					count( $notatki ),
					implode( ', ', array_slice( $notatki, 0, 20 ) ),
					count( $notatki ) > 20 ? ', …' : ''
				);
			}
			return array( 'bledy' => $bledy, 'earnings' => $earnings, 'notatki' => $notatki );
		} catch ( Throwable $e ) {
			return array( 'bledy' => array( 'nie udało się policzyć sierot po zamówieniach: ' . $e->getMessage() ), 'earnings' => array(), 'notatki' => array() );
		}
	}

	/**
	 * Osierocone ślady po skasowanych zamówieniach — lista, a na żądanie kasowanie.
	 *
	 * Bez `--usun` wyłącznie WYPISUJE identyfikatory (kontrola i tak je liczy).
	 * Z `--usun` kasuje DOKŁADNIE wypisane wiersze — wyłącznie przez publiczne
	 * API właścicieli tabel (\TUTOR\Earnings::delete_earning_by_order,
	 * wc_delete_order_note), po jawnej liście id, nigdy zakresem ani datą.
	 * To jedyna droga kasowania sierot HISTORYCZNYCH (sprzed 0.2.0) — hak
	 * kasowania zamówienia sprząta tylko za sobą, i tylko zamówienia w 100%
	 * z kursów.
	 *
	 * ## OPTIONS
	 *
	 * [--usun]
	 * : Skasuj wypisane wiersze (przez API Tutora i Woo, po id).
	 *
	 * ## EXAMPLES
	 *
	 *     wp aai-platnosci sieroty
	 *     wp aai-platnosci sieroty --usun
	 *
	 * @when after_wp_load
	 *
	 * @param array $args  Argumenty pozycyjne (nieużywane).
	 * @param array $opcje Opcje.
	 */
	public function sieroty( array $args = array(), array $opcje = array() ): void {
		unset( $args );
		$sieroty = self::sieroty_po_zamowieniach();
		if ( array() === $sieroty['earnings'] && array() === $sieroty['notatki'] ) {
			WP_CLI::success( 'sieroty: żaden wiersz księgowy ani notatka nie wskazuje skasowanego zamówienia.' );
			return;
		}
		WP_CLI::line( 'earnings (wp_tutor_earnings.earning_id): ' . ( array() === $sieroty['earnings'] ? '—' : implode( ', ', $sieroty['earnings'] ) ) );
		WP_CLI::line( 'notatki (wp_comments.comment_ID):        ' . ( array() === $sieroty['notatki'] ? '—' : implode( ', ', $sieroty['notatki'] ) ) );
		if ( empty( $opcje['usun'] ) ) {
			WP_CLI::warning( sprintf( 'sieroty: %d wierszy księgowych i %d notatek do rozstrzygnięcia. Kasuje `--usun`.', count( $sieroty['earnings'] ), count( $sieroty['notatki'] ) ) );
			return;
		}

		$skasowane_e = 0;
		if ( array() !== $sieroty['earnings'] && class_exists( '\TUTOR\Earnings' ) ) {
			global $wpdb;
			$ksiegowosc = \TUTOR\Earnings::get_instance();
			// API Tutora kasuje po ORDER_ID — bierzemy order_id z wypisanych
			// wierszy (odczyt), a kasowanie zlecamy właścicielowi tabeli.
			// Każdy earning_id osobno przez prepare — bez sklejania listy w SQL.
			$order_ids = array();
			foreach ( $sieroty['earnings'] as $earning_id ) {
				$order_id = (int) $wpdb->get_var( $wpdb->prepare( "SELECT order_id FROM {$wpdb->tutor_earnings} WHERE earning_id = %d", (int) $earning_id ) ); // phpcs:ignore WordPress.DB.PreparedSQL,WordPress.DB.DirectDatabaseQuery
				if ( $order_id > 0 ) {
					$order_ids[ $order_id ] = $order_id;
				}
			}
			foreach ( $order_ids as $order_id ) {
				if ( $order_id > 0 && ! wc_get_order( $order_id ) ) {
					$ksiegowosc->delete_earning_by_order( $order_id );
					++$skasowane_e;
				}
			}
		}
		$skasowane_n = 0;
		foreach ( $sieroty['notatki'] as $id_notatki ) {
			if ( wc_delete_order_note( (int) $id_notatki ) ) {
				++$skasowane_n;
			}
		}
		WP_CLI::success( sprintf( 'sieroty: skasowano księgowość %d zamówień i %d notatek.', $skasowane_e, $skasowane_n ) );
	}

	/**
	 * Zamówienia kursów, które UTKNĘŁY w `processing`.
	 *
	 * Pułapka 8 schematu. Zamówienie złożone wyłącznie z kursów domykamy
	 * natychmiast (P3b: filtr `needs_processing` plus siatka na ręczną
	 * zmianę statusu), bo produkt cyfrowy nie ma czego „realizować".
	 * Zamówienie kursu stojące w `processing` znaczy więc, że mechanizm
	 * NIE zadziałał — a wtedy klient zapłacił i nie ma dostępu, bo ten
	 * daje wyłącznie zapis `completed`.
	 *
	 * Czego ta kontrola NIE zgłasza: `on-hold` (przelew czeka na wpłatę
	 * — stan normalny, czasem dwudniowy), `pending` (klient nie dokończył
	 * płatności) i zamówień MIESZANYCH (tam `processing` jest prawdziwe,
	 * bo jest co wysłać). Próg godziny, nie minut: domknięcie jedzie na
	 * `shutdown` tego samego żądania, więc świeże `processing` może być
	 * zwykłym wyścigiem z odczytem.
	 *
	 * @return array<int,string>
	 */
	private static function zamowienia_wiszace(): array {
		if ( ! function_exists( 'wc_get_orders' ) || ! Aai_Platnosci_Tabele::istnieja() ) {
			return array();
		}
		$bledy = array();
		$stare = wc_get_orders(
			array(
				'limit'        => 50,
				'status'       => array( 'processing' ),
				'date_created' => '<' . ( time() - HOUR_IN_SECONDS ),
				'return'       => 'ids',
			)
		);
		foreach ( (array) $stare as $id ) {
			$zamowienie = wc_get_order( $id );
			if ( ! $zamowienie ) {
				continue;
			}
			$kursow = 0;
			$pozycji = 0;
			foreach ( $zamowienie->get_items() as $pozycja ) {
				++$pozycji;
				if ( Aai_Platnosci_Zapis::czy_produkt_kursu( (int) $pozycja->get_product_id() ) ) {
					++$kursow;
				}
			}
			// Tylko zamówienia złożone WYŁĄCZNIE z kursów — mieszane mają
			// prawo stać w `processing`, bo czeka je wysyłka.
			if ( $pozycji > 0 && $kursow === $pozycji ) {
				$bledy[] = sprintf(
					'zamówienie %d stoi w „processing" od %s, a jest złożone wyłącznie z kursów — klient zapłacił i NIE MA dostępu (dostęp daje dopiero „completed"). Sprawdź, czy wtyczka jest aktywna, i domknij zamówienie w panelu',
					$id,
					$zamowienie->get_date_created() ? $zamowienie->get_date_created()->date( 'Y-m-d H:i' ) : 'nieznanej daty'
				);
			}
		}
		return $bledy;
	}

	/**
	 * Tutor Pro obecny? (pułapka 3 schematu)
	 *
	 * Jednokierunkowość ceny stoi na tym, że nikt jej po naszej stronie nie
	 * nadpisuje. Tutor Pro ma własny zapis ceny kursu, więc jego obecność
	 * unieważnia dowody, na których stoi cały krok P2 — i musi być
	 * POWIEDZIANA, a nie odkryta przy pierwszym rozjeździe ceny.
	 */
	private static function tutor_pro(): string {
		if ( ! function_exists( 'tutor' ) ) {
			return '';
		}
		$tutor = tutor();
		$ma_pro = ( isset( $tutor->has_pro ) && $tutor->has_pro ) || function_exists( 'tutor_pro' );
		return $ma_pro
			? 'wykryto Tutor Pro — ma własny zapis ceny kursu, więc jednokierunkowość naszej kopii (nasza tabela → produkt WooCommerce) przestaje być dowiedziona. Sprawdź, czy Pro nie nadpisuje ceny, zanim ruszy sprzedaż'
			: '';
	}

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
			/*
			 * NAJPIERW SPRAWDŹ, CZY „SPRZEDAŻ NIE DZIAŁA" JEST PRAWDĄ.
			 *
			 * Znalezisko testu całości (2026-08-31), zreprodukowane: po
			 * wyłączeniu Pluginu 1 produkty kursów zostają `publish` i dalej
			 * wchodzą do koszyka przez `?add-to-cart` (zmierzone:
			 * `woocommerce_items_in_cart=1`), a kontrola pisała „Sprzedaż nie
			 * działa" i kończyła ZEREM. Klient kupowałby wtedy kurs, którego
			 * strony sprzedażowej ani danych już nie ma.
			 *
			 * Zamknięcie sprzedaży NAPRAWDĘ to blokuje także bez Pluginu 1
			 * (zmierzone: w koszyku 0) — blokada siedzi w tej wtyczce. Dlatego
			 * instrukcja w komunikacie jest wykonalna, a nie życzeniowa.
			 */
			$kupowalne = self::kupowalne_bez_sklepu();
			if ( $kupowalne > 0 ) {
				WP_CLI::error(
					sprintf(
						'brakuje: %s — a mimo to %d produkt(ów) kursów DALEJ DA SIĘ KUPIĆ (sprzedaż otwarta, produkty opublikowane). Klient zapłaci za kurs, którego strony i danych już nie ma. Włącz brakującą wtyczkę albo zamknij sprzedaż: wp aai-platnosci sprzedaz zamknij',
						implode( ', ', $brak ),
						$kupowalne
					),
					false
				);
				WP_CLI::halt( 1 );
			}
			// Świadomie kod 0: wyłączone otoczenie to stan nazwany, nie rozjazd.
			WP_CLI::log( 'sprawdz: wyłączone — ' . implode( ', ', $brak ) . '. Sprzedaż nie działa; dane Pluginu 2 czekają.' );
			// Mówimy WPROST, że kursów nie sprawdzono. „Wyłączone" bez tego
			// zdania czyta się jak „sprawdziłem i jest w porządku" — a to
			// dwie różne rzeczy (B2).
			WP_CLI::log( 'sprawdz: kontrola rozjazdu POMINIĘTA — nie było z czym porównywać produktów.' );

			/*
			 * ALE RESZTY NIE ODPUSZCZAMY (P1 poz. 19). Do 0.68.0 stało tu
			 * gołe `halt( 0 )`, więc wyłączenie JEDNEJ wtyczki uciszało
			 * kontrole, które z nią nie mają nic wspólnego. Zmierzone:
			 * przy walucie sklepu EUR kontrola z Pluginem 1 kończyła kodem 1
			 * i nazywała rozjazd, a bez Pluginu 1 — kodem 0 i ciszą, choć
			 * waluta jest ustawieniem SKLEPU, nie kursu.
			 */
			$poza = self::bledy_poza_kursami();
			if ( array() !== $poza ) {
				foreach ( $poza as $blad_poza ) {
					WP_CLI::error( $blad_poza, false );
				}
				WP_CLI::halt( 1 );
			}
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

		$w_trakcie   = array();
		$w_trakcie[] = Aai_Platnosci_Ustawienia::stan_sprzedazy();
		if ( ! class_exists( 'Aai_Sklep_Odczyt' ) ) {
			/*
			 * B2: brak Pluginu 1 to stan nazwany, ale kontrola NIE MA PRAWA
			 * meldować sukcesu, nie sprawdziwszy ani jednego kursu —
			 * pierwsza wersja mówiła „Success" i milczała o tym.
			 *
			 * NIE WYCHODZIMY TU Z KODEM 0 (P1 poz. 19). Do 0.68.0 stało tu
			 * `WP_CLI::halt( 0 )`, które PORZUCAŁO wszystko, co kontrola już
			 * zdążyła zebrać, i wszystko, o co jeszcze nie zdążyła zapytać —
			 * a to są rzeczy od Pluginu 1 NIEZALEŻNE: waluta sklepu, cudze
			 * ustawienia przestawione instalatorem, dziennik dostaw,
			 * zamówienia wiszące, sieroty po skasowanych zamówieniach.
			 * Zmierzone: przy walucie EUR kontrola z Pluginem 1 dawała kod 1
			 * i nazywała rozjazd, a bez Pluginu 1 — kod 0 i ciszę.
			 *
			 * Pomijamy więc DOKŁADNIE JEDNO: pętlę po kursach, bo tylko ona
			 * potrzebuje danych Pluginu 1.
			 */
			WP_CLI::log( 'sprawdz: kontrola rozjazdu POMINIĘTA — nie ma wtyczki „Automatic AI — Sklep" (Plugin 1), więc nie ma z czym porównywać produktów. Reszta kontroli biegnie dalej.' );
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
			$rezerwacje = self::rezerwacje_wiszace();
			foreach ( $rezerwacje['bledy'] as $blad_rezerwacji ) {
				$bledy[] = $blad_rezerwacji;
			}
			foreach ( $rezerwacje['info'] as $info_rezerwacji ) {
				$w_trakcie[] = $info_rezerwacji;
			}
			$osierocone = self::osierocone();
			foreach ( $osierocone['bledy'] as $blad_sieroty ) {
				$bledy[] = $blad_sieroty;
			}
			foreach ( $osierocone['info'] as $info ) {
				$w_trakcie[] = $info;
			}
		}
		foreach ( self::bledy_poza_kursami() as $blad_poza_kursami ) {
			$bledy[] = $blad_poza_kursami;
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
	 * Rozjazdy, które NIE zależą od danych Pluginu 1.
	 *
	 * Jedno miejsce, bo woła je i ścieżka pełna, i ta przy wyłączonej
	 * wtyczce — inaczej wyłączenie jednej wtyczki uciszało kontrole, które
	 * z nią nie mają nic wspólnego (P1 poz. 19, zmierzone na walucie).
	 * Każda pozycja sama sprawdza, czy ma o co pytać: ta metoda biega
	 * także wtedy, gdy brakuje WooCommerce albo Tutora.
	 *
	 * Kontrola CZYTA, nigdy nie pisze (L11).
	 *
	 * @return string[]
	 */
	private static function bledy_poza_kursami(): array {
		$bledy = array();

		/*
		 * Ustawienia Woo i Tutora porównujemy TYLKO wtedy, gdy obie wtyczki
		 * są. Bez nich rozjazd jest SKUTKIEM ich nieobecności, nie usterką:
		 * wyłączenie WooCommerce zeruje `monetize_by` cudzą mechaniką
		 * (U1), a kontrola meldowałaby wtedy własną naprawialną awarię tam,
		 * gdzie jest tylko wyłączone otoczenie. Zmierzone przy P1 poz. 19 —
		 * pierwsza wersja tej metody zapaliła istniejące sprawdzenie
		 * „sprawdz bez Woo oddaje kod 0".
		 */
		if ( Aai_Platnosci_Zaleznosci::jest_woo() && Aai_Platnosci_Zaleznosci::jest_tutor() ) {
			foreach ( Aai_Platnosci_Ustawienia::rozjazdy() as $rozjazd_ustawien ) {
				$bledy[] = $rozjazd_ustawien;
			}
		}

		/*
		 * WALUTA SKLEPU MUSI ZGADZAĆ SIĘ Z TĄ, KTÓRĄ DRUKUJE STRONA.
		 *
		 * Strony sprzedażowe Pluginu 1 formatują cenę ze znakiem „zł"
		 * WPISANYM NA SZTYWNO — w sześciu miejscach, żadne nie pyta
		 * WooCommerce o walutę. To świadome: katalog ma działać bez Pluginu 2
		 * i bez Woo. Ceną tej niezależności jest możliwość rozjazdu, więc
		 * rozjazd musi mieć KONTROLĘ, a nie tylko dobre intencje.
		 *
		 * WooCommerce startuje z `USD` i nigdy o to nie pyta. Klient widział
		 * wtedy „Dołączam za 299,00 zł" na stronie kursu i tę samą liczbę
		 * z dolarem w kasie, czyli dokładnie tam, gdzie płaci (AUD-WDR-F1-004,
		 * AUD-FE-F1-002). Nie zmieniamy waluty za właściciela — to ustawienie
		 * sklepu, nie nasze — ale mówimy o rozjeździe głośno i kodem 1.
		 */
		if ( function_exists( 'get_woocommerce_currency' ) ) {
			$waluta = (string) get_woocommerce_currency();

			if ( 'PLN' !== $waluta ) {
				$bledy[] = sprintf(
					'waluta sklepu to %s, a strony kursów drukują ceny w złotych — klient zobaczy inną walutę w kasie niż w ofercie. Napraw: wp option update woocommerce_currency PLN',
					$waluta
				);
			}
		}
		foreach ( self::bledy_dostaw() as $blad_dostawy ) {
			$bledy[] = $blad_dostawy;
		}
		if ( function_exists( 'wc_get_orders' ) ) {
			foreach ( self::zamowienia_wiszace() as $blad_wiszacy ) {
				$bledy[] = $blad_wiszacy;
			}
			foreach ( self::sieroty_po_zamowieniach()['bledy'] as $blad_sieroty ) {
				$bledy[] = $blad_sieroty;
			}
		}
		$pro = self::tutor_pro();
		if ( '' !== $pro ) {
			$bledy[] = $pro;
		}
		$blad_kopii = Aai_Platnosci_Komunikaty::ostatni();
		if ( '' !== $blad_kopii ) {
			$bledy[] = 'ostatni błąd zgłoszony przez wtyczkę: ' . $blad_kopii;
		}
		return $bledy;
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

		/*
		 * NAZWA i KRÓTKI OPIS — to jedyne dwa pola produktu, które klient
		 * CZYTA na ekranie kasy i koszyka (Woo drukuje `short_description`
		 * pod nazwą pozycji, a Store API oddaje je publicznie). Rozjazd
		 * tutaj nie jest usterką techniczną, tylko cudzym tekstem pod
		 * nazwą naszego kursu — dokładnie tak wyszła „cudza edycja
		 * 1787936224" na produkcie 675. Dlatego kod 1, jak przy cenie.
		 */
		if ( (string) $produkt->get_name( 'edit' ) !== (string) $kurs['title'] ) {
			$r[] = array(
				self::STAN_ROZJAZD,
				sprintf(
					'nazwa produktu „%s" zamiast „%s" — klient widzi ją w kasie. Napraw: wp aai-platnosci sync %s',
					(string) $produkt->get_name( 'edit' ),
					(string) $kurs['title'],
					(string) $kurs['slug']
				),
			);
		}
		$opis_kursu = (string) ( $kurs['short_desc'] ?? '' );
		if ( (string) $produkt->get_short_description( 'edit' ) !== $opis_kursu ) {
			$r[] = array(
				self::STAN_ROZJAZD,
				sprintf(
					'krótki opis produktu nie pochodzi z naszej tabeli — klient czyta w kasie „%s". Napraw: wp aai-platnosci sync %s',
					wp_trim_words( (string) $produkt->get_short_description( 'edit' ), 12, '…' ),
					(string) $kurs['slug']
				),
			);
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

		/*
		 * PYTAMY O OBA KLUCZE, BO NAPRAWA I WYKRYWANIE STAŁY NA RÓŻNYCH.
		 *
		 * Idempotencja tworzenia produktu odnajduje sierotę po
		 * `_aai_zrodlo_uuid`, a ta kontrola pytała wyłącznie
		 * o `_aai_platnosci_kurs_uuid`. Duplikat z dwoma znacznikami
		 * pochodzenia, a jednym kursowym, przechodził więc kodem 0 —
		 * dopasowanie było już loterią, a nikt tego nie mówił.
		 */
		$bledy = array();
		foreach ( array( '_aai_platnosci_kurs_uuid', '_aai_zrodlo_uuid' ) as $klucz ) {
			$powtorki = $wpdb->get_col(
				$wpdb->prepare(
					"SELECT pm.meta_value FROM {$wpdb->postmeta} pm
					JOIN {$wpdb->posts} p ON p.ID = pm.post_id AND p.post_type = 'product'
					WHERE pm.meta_key = %s
					GROUP BY pm.meta_value HAVING COUNT(*) > 1",
					$klucz
				)
			);
			foreach ( (array) $powtorki as $uuid ) {
				$bledy[] = sprintf(
					'DWA produkty z uuid %s (meta %s) — dopasowanie stało się loterią (B4)',
					(string) $uuid,
					$klucz
				);
			}
		}
		return $bledy;
	}

	/**
	 * Rezerwacje produktów, których zakładanie się nie domknęło.
	 *
	 * Rezerwację otwiera warstwa zapisu tuż przed `WC_Product::save()`
	 * i zamyka dopiero, gdy powiązanie stoi w naszej tabeli. Wpis, który
	 * został, znaczy więc jedno: łańcuch przerwał się w środku i gdzieś
	 * w bazie może leżeć produkt-widmo — wiersz `product` bez powiązania,
	 * a przy przerwaniu w najgorszym momencie także bez znacznika.
	 *
	 * Świeżą rezerwację (do 60 s) meldujemy jako „w trakcie", nie jako
	 * błąd — tyle samo, ile wynosi okno degradacji przy kopii w Tutorze,
	 * i z tego samego powodu: przebieg mógł jeszcze nie skończyć.
	 *
	 * @return array{bledy:string[], info:string[]}
	 */
	private static function rezerwacje_wiszace(): array {
		$wynik = array(
			'bledy' => array(),
			'info'  => array(),
		);
		if ( ! class_exists( 'Aai_Platnosci_Zapis' ) ) {
			return $wynik;
		}
		foreach ( Aai_Platnosci_Zapis::rezerwacje() as $uuid => $wpis ) {
			$czas  = isset( $wpis['czas'] ) ? (int) $wpis['czas'] : 0;
			$tytul = isset( $wpis['tytul'] ) ? (string) $wpis['tytul'] : '';
			$wiek  = time() - $czas;
			if ( $czas > 0 && $wiek < 60 ) {
				$wynik['info'][] = sprintf( 'produkt kursu „%s" zakładany właśnie teraz (%d s temu)', $tytul, $wiek );
				continue;
			}
			$wynik['bledy'][] = sprintf(
				'zakładanie produktu dla kursu „%s" (uuid %s) przerwało się %s — w bazie może leżeć produkt-widmo bez powiązania. Sprawdź szkice produktów o tym tytule i skasuj zbędny, potem: wp aai-platnosci sync',
				$tytul,
				(string) $uuid,
				$czas > 0 ? sprintf( '%d s temu', $wiek ) : 'w nieznanym momencie'
			);
		}
		return $wynik;
	}

	/**
	 * Ile produktów kursów zostaje KUPOWALNYCH mimo braku zależności.
	 *
	 * „Kupowalny" znaczy tu trzy rzeczy naraz, bo każda z osobna nie
	 * wystarcza: sprzedaż jest otwarta (inaczej blokada koszyka odmawia),
	 * WooCommerce działa (inaczej nie ma koszyka) i produkt jest
	 * opublikowany. Liczymy przez `get_post_status`, nie przez API Woo —
	 * ta metoda biega także wtedy, gdy zależności brakuje.
	 */
	private static function kupowalne_bez_sklepu(): int {
		global $wpdb;
		if ( ! Aai_Platnosci_Ustawienia::sprzedaz_otwarta() || ! Aai_Platnosci_Zaleznosci::jest_woo() || ! Aai_Platnosci_Tabele::istnieja() ) {
			return 0;
		}
		$tabela = Aai_Platnosci_Tabele::tabela( 'powiazania' );
		$ile    = 0;
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- nazwa tabeli z klasy tabel.
		foreach ( (array) $wpdb->get_col( "SELECT product_id FROM {$tabela}" ) as $produkt ) {
			if ( 'publish' === (string) get_post_status( (int) $produkt ) ) {
				++$ile;
			}
		}
		return $ile;
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

		/*
		 * Stany kursów JEDNYM zapytaniem, przed pętlą.
		 *
		 * Do tej poprawki każdy wiersz `powiazania` pytał osobno przez
		 * `Aai_Sklep_Odczyt::kurs_po_id()`, czyli N+1 w komendzie, którą
		 * `postaw.sh` uruchamia jako punkt kontrolny przy KAŻDYM
		 * postawieniu środowiska. Pytanie jest tu jedno — czy kurs istnieje
		 * i czy jest opublikowany — więc pyta o nie mapa, nie karta na
		 * wiersz. Brak klucza w mapie znaczy dokładnie to, co `null`
		 * z `kurs_po_id()`: kursu nie ma.
		 */
		$statusy = Aai_Sklep_Odczyt::statusy_kursow();

		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- nazwa tabeli z klasy tabel.
		foreach ( $wpdb->get_results( "SELECT course_uuid, product_id FROM {$tabela}", ARRAY_A ) as $wiersz ) {
			$uuid         = (string) $wiersz['course_uuid'];
			$status_kursu = $statusy[ $uuid ] ?? null;
			if ( 'published' === $status_kursu ) {
				continue;
			}
			$status   = (string) get_post_status( (int) $wiersz['product_id'] );
			$opis     = null === $status_kursu ? 'kurs usunięty' : 'kurs ' . $status_kursu;
			$zdanie   = sprintf( 'produkt %d osierocony (%s), status %s', (int) $wiersz['product_id'], $opis, $status );
			$utracony = Aai_Platnosci_Zapis::utracony_dostep( (int) $wiersz['product_id'] );
			if ( 'publish' === $status ) {
				$wynik['bledy'][] = $zdanie . ' — KUPOWALNY bez działającego szwu';
			} elseif ( $utracony > 0 ) {
				/*
				 * Rozstrzygnięcie właściciela (2026-08-31): sierota po kursie
				 * BEZ kupujących to informacja, a po kursie z kupującymi —
				 * błąd. Ludzie stracili dostęp do czegoś, za co zapłacili,
				 * i ktoś musi z tym coś zrobić: zwrócić pieniądze albo
				 * przywrócić kurs. Cisza jest tu gorsza niż fałszywy alarm.
				 */
				$wynik['bledy'][] = sprintf(
					'%s — kurs miał %d kupujących i STRACILI DOSTĘP; zdecyduj, co z nimi (zwrot albo odtworzenie kursu), potem zdejmij znacznik z produktu',
					$zdanie,
					$utracony
				);
			} else {
				$wynik['info'][] = $zdanie;
			}
		}
		return $wynik;
	}
}
