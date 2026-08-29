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
			 * Sam zapis robi warstwa zapisu — tu zostaje DECYZJA, tam
			 * ZMIANA STANU (niezmiennik „jedyny pisarz", sekcja 10
			 * schematu). Ona też trzyma bezpiecznik na status: między tą
			 * decyzją a zapisem mógł zadziałać ktoś inny.
			 */
			Aai_Platnosci_Zapis::zamknij_zamowienie( (int) $order->get_id() );
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
