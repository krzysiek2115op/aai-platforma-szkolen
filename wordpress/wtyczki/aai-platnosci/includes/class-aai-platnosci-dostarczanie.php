<?php
/**
 * Dostarczanie dostępu do kursu — domykanie zamówienia.
 *
 * DLACZEGO TA KLASA W OGÓLE ISTNIEJE. Tutor nadaje dostęp do kursu, gdy
 * status ZAPISU stanie się `completed`, a status zapisu idzie za statusem
 * ZAMÓWIENIA (`WooCommerce::enrolled_courses_status_change()`). Jego własne
 * domykanie (`should_order_auto_complete()`) ma jednak czarną listę metod
 * płatności — `cod`, `cheque`, `bacs` — i przy nich NIE domyka zamówienia
 * stojącego na `processing`. Zmierzone na `:8892` (KROK-P3B.md §3):
 *
 *   `bacs` + `payment_complete()`  → zamówienie `processing`, dostęp NIE
 *   `bacs`, ręcznie `on-hold` → `processing` → zamówienie `processing`, dostęp NIE
 *
 * W obu wypadkach klient zapłacił, wpłata została potwierdzona, a kursu nie
 * dostał — i nic tego nie sygnalizuje. Ta klasa zamyka obie ścieżki.
 *
 * NIE NADAJE DOSTĘPU SAMA i nie dotyka zapisów Tutora. Robi jedną rzecz:
 * pilnuje, żeby zamówienie z naszym kursem nie utknęło w `processing`,
 * bo `processing` znaczy „zapłacone, czekamy aż ktoś to wyśle", a kursu
 * nikt nie wysyła. Dostęp nadaje dalej Tutor, swoim mechanizmem.
 *
 * DWA MECHANIZMY, BO ZAMYKAJĄ RÓŻNE ŚCIEŻKI:
 *  1. filtr `woocommerce_order_item_needs_processing` — u źródła: produkt
 *     kursu nigdy nie wymaga obsługi, więc `payment_complete()` prowadzi
 *     PROSTO do `completed`, z pominięciem `processing`. Dzięki temu klient
 *     dostaje JEDEN mail zamiast dwóch („w realizacji", potem „zrealizowane");
 *  2. hak `woocommerce_order_status_processing` — siatka bezpieczeństwa na
 *     ręczną zmianę statusu w panelu (decyzja właściciela 2026-08-29).
 *     Filtr z punktu 1 tej ścieżki nie łapie, bo ręczna zmiana nie idzie
 *     przez `payment_complete()`.
 *
 * DLACZEGO NIE `_downloadable = yes` (wariant odrzucony, choć zmierzony jako
 * działający): zmienia DANE produktu, które nasz szew nadpisuje przy każdym
 * zapisie kursu — doszłoby kolejne pole do synchronizacji i kolejny rozjazd
 * do pilnowania; kłamie o naturze produktu przy decyzji właściciela
 * „e-booki NIGDY"; włącza w panelu produktu zakładkę plików, której nikt
 * nigdy nie wypełni.
 *
 * @package Aai_Platnosci
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Domykanie zamówień zawierających kursy.
 */
final class Aai_Platnosci_Dostarczanie {

	/**
	 * Zamówienia zgłoszone do domknięcia w tym żądaniu.
	 *
	 * Chroni przed dopisaniem tego samego domknięcia dwa razy, gdyby
	 * zamówienie weszło w `processing` więcej niż raz w jednym żądaniu.
	 *
	 * @var array<int,bool>
	 */
	private static $do_domkniecia = array();

	/**
	 * Podpina oba mechanizmy.
	 *
	 * Rejestracja BEZWARUNKOWA, warunki żyją wewnątrz callbacków (ta sama
	 * zasada co przy filtrach B17): bez WooCommerce te haki po prostu nigdy
	 * nie odpalą, a warunek „czy Woo jest" sprawdzany przy rejestracji
	 * zależałby od kolejności ładowania wtyczek.
	 */
	public static function zarejestruj(): void {
		add_filter( 'woocommerce_order_item_needs_processing', array( self::class, 'czy_wymaga_obslugi' ), 10, 3 );

		/*
		 * `woocommerce_order_status_processing`, a NIE `..._status_changed`:
		 * ten drugi odpala się tylko wtedy, gdy przejście ma niepuste `from`
		 * (`class-wc-order.php` — `do_action` w gałęzi `! empty( $from )`),
		 * więc zamówienie utworzone OD RAZU ze statusem `processing`
		 * przeszłoby mu pod nosem. Ten hak odpala się bezwarunkowo.
		 *
		 * Zagnieżdżona zmiana statusu w środku obsługi przejścia jest
		 * bezpieczna: WooCommerce zeruje `$this->status_transition` PRZED
		 * odpaleniem haków, więc nowe przejście obsługuje się do końca
		 * i wraca. Tak samo domyka zamówienia sam Tutor
		 * (`WooCommerce::mark_order_complete()`).
		 */
		add_action( 'woocommerce_order_status_processing', array( self::class, 'domknij' ), 20, 2 );

		/*
		 * SKASOWANIE zamówienia, a nie zmiana jego statusu (AUD-INT-F1-001).
		 *
		 * Tutor odbiera dostęp WYŁĄCZNIE reagując na `woocommerce_order_status_changed`
		 * (`WooCommerce::enrolled_courses_status_change`), a ten hak nie odpala się,
		 * gdy zamówienie znika w całości. Skutek zmierzony uruchomieniowo na obu
		 * kursach katalogu: zapis `tutor_enrolled` zostaje na zawsze `completed`,
		 * więc klient, którego zamówienie skasowano — przez pomyłkę administratora,
		 * przez retencję RODO WooCommerce (`woocommerce_trash_pending_orders`) albo
		 * przy porządkach — zachowuje dostęp do kursu bez śladu zakupu.
		 *
		 * Dwa haki, bo instalacja może stać na obu magazynach zamówień:
		 * `woocommerce_before_delete_order` (HPOS, własne tabele `wp_wc_orders`)
		 * oraz `before_delete_post` (magazyn starszy, zamówienia we `wp_posts`).
		 * Oba biegną PRZED usunięciem, więc powiązania jeszcze istnieją.
		 */
		/*
		 * PRIORYTET 1, NIE 10 — ZMIERZONE 2026-09-05. Na priorytecie 10 tego
		 * samego haka Woo rejestruje `WC_Post_Data::before_delete_order()`,
		 * a ta metoda KASUJE POZYCJE ZAMÓWIENIA (`delete_order_items`) zanim
		 * dojdzie do nas (rejestrowała się wcześniej, więc biegnie wcześniej).
		 * Nasz callback pytał wtedy `same_kursy()` zamówienie BEZ pozycji,
		 * dostawał „nie nasze" i wychodził — sprzątanie księgowości i notatek
		 * nie działo się NIGDY przy prawdziwym kasowaniu, choć wywołane wprost
		 * działało. Bez objawu: hak nie ma czytelnika. Na 1 widzimy zamówienie
		 * takie, jakie było.
		 */
		add_action( 'woocommerce_before_delete_order', array( self::class, 'zamowienie_znika' ), 1, 2 );
		add_action( 'before_delete_post', array( self::class, 'zamowienie_znika' ), 1, 1 );
	}

	/**
	 * Czy pozycja zamówienia wymaga obsługi (filtr WooCommerce).
	 *
	 * Odpowiada TYLKO za nasze produkty — dla cudzych oddaje wartość
	 * bez zmian, więc inne produkty w tym samym sklepie zachowują się
	 * dokładnie jak dotąd.
	 *
	 * UWAGA NA CACHE: wynik `WC_Order::needs_processing()` ląduje w cache
	 * obiektowym grupy `orders` na dobę, kluczem per zamówienie. Bez trwałego
	 * cache znika po żądaniu; z Redisem zamówienie policzone przed włączeniem
	 * tej wtyczki trzymałoby starą odpowiedź do doby. Dotyczy wyłącznie
	 * zamówień sprzed instalacji — nowe liczą się już z tym filtrem.
	 *
	 * @param bool  $wymaga    Wartość domyślna WooCommerce.
	 * @param mixed $produkt   Produkt pozycji (`WC_Product` albo `false`).
	 * @param int   $id_zamowienia Id zamówienia.
	 * @return bool
	 */
	public static function czy_wymaga_obslugi( $wymaga, $produkt = null, $id_zamowienia = 0 ): bool {
		unset( $id_zamowienia );
		if ( ! $produkt instanceof WC_Product ) {
			return (bool) $wymaga;
		}
		try {
			if ( Aai_Platnosci_Zapis::czy_produkt_kursu( (int) $produkt->get_id() ) ) {
				return false;
			}
		} catch ( Throwable $e ) {
			// Niezmiennik 17: awaria naszej tabeli nie może wywrócić cudzej
			// kasy. Bez odpowiedzi zostaje zachowanie WooCommerce, czyli
			// `processing` — gorsze dla klienta, ale nie wywraca zakupu,
			// a hak `domknij()` niżej i tak zadziała jako siatka.
			Aai_Platnosci_Komunikaty::zapisz( 'przy liczeniu obsługi pozycji: ' . $e->getMessage() );
		}
		return (bool) $wymaga;
	}

	/**
	 * Zamówienie weszło w `processing` — domknij je, jeśli niesie kurs.
	 *
	 * @param int   $id_zamowienia Id zamówienia.
	 * @param mixed $zamowienie    Obiekt zamówienia (WooCommerce podaje go od 3.x).
	 */
	public static function domknij( int $id_zamowienia, $zamowienie = null ): void {
		try {
			$order = $zamowienie instanceof WC_Order ? $zamowienie : wc_get_order( $id_zamowienia );
			if ( ! $order instanceof WC_Order ) {
				return;
			}
			if ( ! self::same_kursy( $order ) ) {
				return;
			}

			/*
			 * DOMYKAMY DOPIERO NA KOŃCU ŻĄDANIA, nie tu.
			 *
			 * Ten hak biegnie W ŚRODKU cudzego przejścia statusu: WooCommerce
			 * odpala najpierw `woocommerce_order_status_<nowy>`, a DOPIERO
			 * POTEM `..._<stary>_to_<nowy>` i `..._status_changed` — czyli
			 * haki, na których wiszą maile i notatki. Zapis wykonany od razu
			 * kończył się tym, że reszta TAMTEGO przejścia dojeżdżała już po
			 * nadaniu `completed`: klient dostawał mail „Zamówienie
			 * zrealizowane”, a chwilę po nim „Zamówienie w realizacji”,
			 * a notatki zamówienia szły w odwróconej kolejności. Zmierzone na
			 * `:8892` przy przeglądzie P3b (notatki 298–301).
			 *
			 * `shutdown` czeka, aż cudze przejście dokończy się w całości.
			 * Kolejność wraca do naturalnej: „w realizacji” → „zrealizowane”.
			 * Bezpiecznik na status siedzi w warstwie zapisu, więc jeśli w tym
			 * czasie ktoś inny domknie zamówienie, nasz zapis nic nie zrobi.
			 */
			$id = (int) $order->get_id();
			if ( isset( self::$do_domkniecia[ $id ] ) ) {
				return;
			}
			self::$do_domkniecia[ $id ] = true;
			add_action(
				'shutdown',
				static function () use ( $id ): void {
					try {
						// Sam zapis robi warstwa zapisu — tu zostaje DECYZJA,
						// tam ZMIANA STANU (niezmiennik „jedyny pisarz”).
						Aai_Platnosci_Zapis::zamknij_zamowienie( $id );
					} catch ( Throwable $e ) {
						Aai_Platnosci_Komunikaty::zapisz( 'przy domykaniu zamówienia ' . $id . ': ' . $e->getMessage() );
					}
				}
			);
		} catch ( Throwable $e ) {
			// Wyjątek tutaj poleciałby przez zapis zamówienia w cudzej
			// kasie. Zamiast tego: zamówienie zostaje w `processing`,
			// a kontrola `wp aai-platnosci sprawdz` to pokaże.
			Aai_Platnosci_Komunikaty::zapisz( 'przy domykaniu zamówienia ' . $id_zamowienia . ': ' . $e->getMessage() );
		}
	}

	/**
	 * Czy zamówienie składa się WYŁĄCZNIE z naszych kursów.
	 *
	 * DLACZEGO „WYŁĄCZNIE", A NIE „ZAWIERA CHOĆ JEDEN". Pierwsza wersja tej
	 * metody pytała o obecność kursu — i zamówienie mieszane (kurs + cudzy
	 * produkt fizyczny) dostawało `completed`, choć towar czekał na wysyłkę.
	 * Zmierzone na `:8892` przed naprawą: zamówienie z dwiema pozycjami
	 * kończyło jako `completed`, czyli właściciel widziałby „zrealizowane"
	 * przy nienadanej paczce. `processing` znaczy „jest co wysłać" i przy
	 * takim zamówieniu jest stanem PRAWDZIWYM — domykać wolno tylko wtedy,
	 * gdy wysyłać nie ma czego.
	 *
	 * Zamówienie bez ani jednej pozycji produktowej nie jest nasze — wtedy
	 * `false`, bo nie ma czego domykać.
	 *
	 * @param WC_Order $order Zamówienie.
	 * @return bool
	 */
	/**
	 * Odbiera dostęp do kursów, gdy zamówienie jest kasowane — i sprząta po nim
	 * księgowość Tutora oraz notatki Woo, pod zamkami opisanymi w kodzie.
	 *
	 * Wywoływana z DWÓCH haków (HPOS i magazyn starszy), więc musi być
	 * odporna na wywołanie dla czegokolwiek — `before_delete_post` odpala się
	 * przy usuwaniu KAŻDEGO wpisu WordPressa, nie tylko zamówienia.
	 *
	 * Nie odbieramy dostępu sami: prosimy o to Tutora jego własnym API
	 * (`course_enrol_status_change`), tym samym, którego używa przy zwrocie.
	 * Dzięki temu jego księgowość i liczniki widzą to jak każde inne cofnięcie,
	 * a my nie tworzymy drugiej definicji tego, co znaczy „dostęp odebrany".
	 *
	 * `Throwable`, bo ta metoda biegnie w środku usuwania zamówienia
	 * w panelu administratora — nasz błąd nie może wywrócić cudzej operacji
	 * ani zostawić zamówienia w połowie skasowanego.
	 *
	 * @param int   $id_zamowienia Id kasowanego zamówienia (albo dowolnego wpisu).
	 * @param mixed $obiekt        Zamówienie z haka HPOS (drugi argument) albo nic.
	 * @return void
	 */
	public static function zamowienie_znika( $id_zamowienia, $obiekt = null ): void {
		try {
			$id_zamowienia = (int) $id_zamowienia;

			if ( $id_zamowienia <= 0 || ! function_exists( 'tutor_utils' ) ) {
				return;
			}

			/*
			 * NAJPIERW `wc_get_order()`, DOPIERO POTEM `is_tutor_order()`.
			 * Ta metoda biegnie z `before_delete_post`, czyli dostaje KAŻDY
			 * kasowany wpis WordPressa — stronę, załącznik, lekcję. Tutorowe
			 * `is_tutor_order()` robi `->get_meta()` na wyniku `wc_get_order()`
			 * BEZ sprawdzenia, czy zamówienie istnieje, więc na cudzym
			 * identyfikatorze daje fatal: biały ekran zamiast skasowanego wpisu
			 * (pułapka 14 schematu Pluginu 2).
			 */
			if ( ! function_exists( 'wc_get_order' ) || ! wc_get_order( $id_zamowienia ) ) {
				return;
			}

			// Hak HPOS podaje zamówienie w drugim argumencie — bierzemy je,
			// zamiast czytać drugi raz; magazyn starszy podaje samo id.
			$zamowienie = $obiekt instanceof WC_Order ? $obiekt : wc_get_order( $id_zamowienia );
			if ( ! $zamowienie instanceof WC_Order ) {
				return;
			}

			/*
			 * „NASZE" ROZSTRZYGAMY DWOMA PYTANIAMI, NIE JEDNYM. `is_tutor_order()`
			 * czyta metę `_is_tutor_order_for_course`, którą Tutor zakłada przy
			 * składaniu zamówienia W KASIE. ZMIERZONE 2026-09-05: zamówienie
			 * utworzone `wc_create_order()` + `add_product()` (WP-CLI, import,
			 * cudza wtyczka) tej mety NIE MA, choć Tutor dołożył mu wiersz
			 * księgowy — dla takiego zamówienia hak wychodził tu bez śladu
			 * i zostawiał zapis, earning i notatki. Zamówienie złożone
			 * w całości z naszych kursów (nasza tabela powiązań) jest nasze
			 * niezależnie od tego, czy Tutor zdążył je oznaczyć.
			 */
			if ( ! tutor_utils()->is_tutor_order( $id_zamowienia ) && ! self::same_kursy( $zamowienie ) ) {
				return;
			}

			$zapisy = tutor_utils()->get_course_enrolled_ids_by_order_id( $id_zamowienia );

			if ( is_array( $zapisy ) ) {
				foreach ( $zapisy as $zapis ) {
					$id_zapisu = (int) ( $zapis['enrolled_id'] ?? 0 );

					if ( $id_zapisu > 0 ) {
						tutor_utils()->course_enrol_status_change( $id_zapisu, 'cancelled' );
					}
				}
			}

			/*
			 * SPRZĄTANIE PO ZAMÓWIENIU, KTÓREGO ZA CHWILĘ NIE BĘDZIE (REA-INT-F1-003).
			 *
			 * Woo pod HPOS kasuje zamówienie surowym DELETE z pominięciem
			 * wp_delete_post(), więc jego notatki (historia „status zmieniony",
			 * „mail wysłany" w wp_comments) zostają przypięte do id, którego nie
			 * ma; w trybie starszego magazynu Woo kasuje je razem z wpisem, więc
			 * sprzątając, PRZYWRACAMY zachowanie, które Woo ma w swoim drugim
			 * trybie. Tutor słucha wyłącznie zmian statusu, więc jego wiersz
			 * księgowy (wp_tutor_earnings: „przychód X z zamówienia N") zostaje
			 * bez zamówienia. Zmierzone przy re-audycie: 2 earnings + 10 notatek
			 * po dwóch skasowanych zamówieniach, kontrola kod 0.
			 *
			 * Tabele są CUDZE, a ten hak dostaje KAŻDY kasowany wpis — stąd
			 * zamki, każdy osobno (decyzja właściciela 2026-09-05: naprawa
			 * najgłębsza z ryzykiem sprowadzonym do zera, jeśli się da):
			 */

			// Zamek 1: wyłącznie zamówienie złożone W CAŁOŚCI z naszych kursów.
			// Zamówienie mieszane ma cudzą księgowość i cudzą historię — zostaje.
			if ( ! self::same_kursy( $zamowienie ) ) {
				return;
			}

			// Zamek 2 (księgowość Tutora): tylko przez JEGO publiczne API
			// (\TUTOR\Earnings, od 3.0.0) — nigdy surowym SQL-em do jego tabeli.
			// Zamek 3: tylko gdy instruktor NIE MIAŁ ANI JEDNEJ WYPŁATY —
			// earning, który zasilił już wypłatę, po skasowaniu zmienia saldo
			// wstecz. Wtedy nie kasujemy, tylko meldujemy; decyzja należy do
			// człowieka i do księgowości, nie do haka.
			// Zamek 4: osobny try — awaria tu nie zabiera notatek ani kasowania.
			try {
				$ksiegowosc = class_exists( '\TUTOR\Earnings' ) ? \TUTOR\Earnings::get_instance() : null;
				if ( $ksiegowosc && method_exists( $ksiegowosc, 'delete_earning_by_order' ) && method_exists( $ksiegowosc, 'get_order_earnings' ) ) {
					$wyplaty = 0;
					foreach ( (array) $ksiegowosc->get_order_earnings( $id_zamowienia ) as $wiersz ) {
						$instruktor = (int) ( is_object( $wiersz ) ? ( $wiersz->user_id ?? 0 ) : ( $wiersz['user_id'] ?? 0 ) );
						if ( $instruktor > 0 && class_exists( '\Tutor\Models\WithdrawModel' ) ) {
							$wyplaty += (int) \Tutor\Models\WithdrawModel::get_withdrawal_count( array( 'user_id' => $instruktor ) );
						}
					}
					if ( $wyplaty > 0 ) {
						Aai_Platnosci_Komunikaty::zapisz(
							sprintf(
								'zamówienie %d skasowane, ale jego wiersz księgowy Tutora ZOSTAJE: instruktor ma już %d wypłat(y), więc skasowanie zmieniłoby saldo wstecz — rozstrzygnij ręcznie (wp aai-platnosci sieroty)',
								(int) $id_zamowienia,
								$wyplaty
							)
						);
					} else {
						$ksiegowosc->delete_earning_by_order( $id_zamowienia );
					}
				}
			} catch ( Throwable $e ) {
				Aai_Platnosci_Komunikaty::zapisz(
					sprintf( 'nie udało się sprzątnąć księgowości Tutora po skasowaniu zamówienia %d: %s', (int) $id_zamowienia, $e->getMessage() )
				);
			}

			// Zamek 2 (notatki Woo): tylko przez JEGO API — `wc_get_order_notes()`
			// + `wc_delete_order_note()`, jawnie po id notatki, nigdy zakresem.
			// BEZ `limit`: Woo mapuje je na `number` zapytania o komentarze,
			// a `-1` staje się tam `1` (zmierzone: 1 z 3 notatek). NIE
			// `get_comments()` wprost: Woo wycina notatki zamówień z każdego
			// zapytania o komentarze filtrem `comments_clauses` i tylko własne
			// `wc_get_order_notes()` zdejmuje go na czas odczytu (zmierzone:
			// `get_comments` oddaje 0 przy 3 notatkach w bazie).
			// Zamek 4: osobny try.
			try {
				if ( function_exists( 'wc_get_order_notes' ) && function_exists( 'wc_delete_order_note' ) ) {
					foreach ( (array) wc_get_order_notes( array( 'order_id' => $id_zamowienia ) ) as $notatka ) {
						$id_notatki = (int) ( is_object( $notatka ) ? ( $notatka->id ?? 0 ) : 0 );
						if ( $id_notatki > 0 ) {
							wc_delete_order_note( $id_notatki );
						}
					}
				}
			} catch ( Throwable $e ) {
				Aai_Platnosci_Komunikaty::zapisz(
					sprintf( 'nie udało się sprzątnąć notatek po skasowaniu zamówienia %d: %s', (int) $id_zamowienia, $e->getMessage() )
				);
			}
		} catch ( Throwable $e ) {
			Aai_Platnosci_Komunikaty::zapisz(
				sprintf(
					'nie udało się odebrać dostępu po skasowaniu zamówienia %d: %s',
					(int) $id_zamowienia,
					$e->getMessage()
				)
			);
		}
	}

	private static function same_kursy( WC_Order $order ): bool {
		$kursow = 0;
		foreach ( $order->get_items() as $pozycja ) {
			if ( ! $pozycja instanceof WC_Order_Item_Product ) {
				continue;
			}
			if ( ! Aai_Platnosci_Zapis::czy_produkt_kursu( (int) $pozycja->get_product_id() ) ) {
				return false;
			}
			++$kursow;
		}
		return $kursow > 0;
	}
}
