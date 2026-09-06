<?php
/**
 * Treść prawna w kasie — zdanie o zgodach pod formularzem zamówienia.
 *
 * PO CO TO ISTNIEJE. Blok kasy WooCommerce drukuje klientowi zdanie
 * „Kontynuując zamówienie wyrażasz zgodę na nasze Warunki i zasady oraz
 * Politykę prywatności". **Warunków i zasad NIE MA** — strona regulaminu
 * nie istnieje, `woocommerce_terms_page_id` jest puste. WooCommerce w takim
 * wypadku nie usuwa wzmianki, tylko drukuje ją bez odnośnika (zmierzone
 * w `checkout-frontend.js`: `d.gu ? "<a…>Terms…</a>" : "Terms…"`), więc
 * klient czyta, że zgadza się na dokument, którego nie może przeczytać.
 * Decyzja właściciela (2026-08-29): zdanie o Warunkach ZDEJMUJEMY do czasu,
 * aż regulamin powstanie; polityka prywatności ZOSTAJE, bo jest podpięta
 * i klikalna.
 *
 * DLACZEGO FILTREM, A NIE ZMIANĄ TREŚCI STRONY. Zdanie składa JavaScript
 * bloku, sterowany atrybutem `text` (`dangerouslySetInnerHTML: {__html:
 * e || wt}` — nasz tekst podmienia całe zdanie). Atrybut da się ustawić
 * dwiema drogami: wpisując go do treści strony w bazie albo podmieniając
 * drzewo bloków w pamięci. Wybieramy drugą, bo pierwsza to zapis w CUDZEJ
 * treści — klasa błędu z P3a, gdzie `str_replace` na treści bloków
 * uszkodził 13 bloków koszyka i 22 kasy bez jednego objawu. Zmiana
 * w pamięci nic nie utrwala: gdy wtyczka zniknie, WooCommerce wraca do
 * swojego zdania (i słusznie — bez naszej wtyczki nikt tu nie kupuje).
 *
 * DLACZEGO W PLUGINIE 2, A NIE W PLUGINIE 1. Wygląd stron WooCommerce
 * należy do Pluginu 1 (`Aai_Sklep_Styl_Woo`, DIAGRAM §12), ale to nie jest
 * wygląd — to treść ścieżki zakupu, którą posiada Plugin 2. Bez niego
 * produkty kursów są szkicami i nikt do kasy nie dojdzie.
 *
 * @package Aai_Platnosci
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Zdanie o zgodach w kasie: bez powołania się na nieistniejący regulamin.
 */
final class Aai_Platnosci_Kasa {

	/** Blok WooCommerce, którego zdanie podmieniamy. */
	private const BLOK_ZGODY = 'woocommerce/checkout-terms-block';

	/** Blok kasy — jedyny, którego drzewo przeglądamy. */
	private const BLOK_KASY = 'woocommerce/checkout';

	/**
	 * Rejestracja. Filtr `render_block_data` dostaje blok NAJWYŻSZEGO
	 * poziomu z całym drzewem w `innerBlocks` — bloki zagnieżdżone nie
	 * dostają własnego wywołania, więc schodzimy po drzewie sami.
	 */
	public static function zarejestruj(): void {
		add_filter( 'render_block_data', array( __CLASS__, 'na_bloku' ) );
		/*
		 * Priorytet 20 — PO filtrze Tutora (10), bo naprawiamy jego wynik.
		 */
		add_filter( 'woocommerce_cart_item_permalink', array( __CLASS__, 'link_pozycji' ), 20, 2 );
	}

	/**
	 * Odnośnik pozycji koszyka: naprawia dwie rzeczy po filtrze Tutora.
	 *
	 * ZMIERZONE na żywej instalacji (P5, pułapka 11 schematu — do tej pory
	 * pozycja „otwarta"):
	 *
	 * | produkt | co oddaje filtr Tutora |
	 * |---|---|
	 * | cudzy (bez `_tutor_product`) | **`null`** |
	 * | nasz kurs | `/courses/<slug>/` |
	 *
	 * `tutor_update_product_url()` (`WooCommerce.php:941`) kończy się BEZ
	 * `return` dla produktu, który nie jest kursem — czyli każdemu obcemu
	 * produktowi w koszyku zabiera odnośnik. Dziś sklep sprzedaje wyłącznie
	 * kursy, ale to nie jest gwarancja na zawsze, a objaw jest cichy: nazwa
	 * pozycji po prostu przestaje być klikalna.
	 *
	 * Drugą rzecz naprawiamy z tego samego powodu, dla którego
	 * `/courses/<slug>/` przekierowuje na `/szkolenia/<slug>/` (decyzja
	 * właściciela 2026-08-25): jeden adres kanoniczny i zero stron
	 * w cudzym wyglądzie. Odnośnik z koszyka prowadził na adres Tutora,
	 * a klient dojeżdżał do nas dopiero przekierowaniem.
	 *
	 * @param mixed                $adres    Wynik poprzednich filtrów.
	 * @param array<string,mixed>  $pozycja  Pozycja koszyka.
	 */
	public static function link_pozycji( $adres, $pozycja ) {
		$product_id = (int) ( $pozycja['product_id'] ?? 0 );
		if ( $product_id <= 0 ) {
			return $adres;
		}

		$uuid = Aai_Platnosci_Zapis::kurs_produktu( $product_id );
		if ( null !== $uuid && class_exists( 'Aai_Sklep_Odczyt' ) && class_exists( 'Aai_Sklep_Widok' ) ) {
			$kurs = Aai_Sklep_Odczyt::kurs_po_id( $uuid );
			if ( is_array( $kurs ) && '' !== (string) ( $kurs['slug'] ?? '' ) ) {
				return Aai_Sklep_Widok::adres_kursu( (string) $kurs['slug'] );
			}
		}

		// Produkt spoza naszego sklepu (albo kurs bez danych): przywracamy
		// odnośnik, jeśli ktoś przed nami oddał pustkę.
		return ( null === $adres || '' === $adres ) ? get_permalink( $product_id ) : $adres;
	}

	/**
	 * Ustawia własny tekst zgody w bloku kasy.
	 *
	 * @param array<string,mixed> $blok Sparsowany blok.
	 * @return array<string,mixed>
	 */
	public static function na_bloku( array $blok ): array {
		if ( ( $blok['blockName'] ?? '' ) !== self::BLOK_KASY ) {
			return $blok;
		}
		/*
		 * PUSTY TEKST TEŻ WCHODZI — I TO JEST CAŁY SENS TEJ KLASY.
		 *
		 * `zdanie()` oddaje pusty łańcuch, gdy nie ma nawet strony polityki
		 * prywatności. Do 0.72.0 wychodziliśmy wtedy z bloku NIETKNIĘTEGO,
		 * czyli oddawaliśmy głos domyślnemu zdaniu WooCommerce — a ono
		 * powołuje się na „Warunki i zasady", których w tej instalacji nie
		 * ma. Własny docblock `przejdz()` mówił wprost, że pusty tekst ma
		 * USUWAĆ zdanie z bloku zgód; ta gałąź nie dawała mu nigdy szansy.
		 */
		$tekst = self::zdanie();
		$blok['innerBlocks'] = self::przejdz( (array) ( $blok['innerBlocks'] ?? array() ), $tekst );
		return $blok;
	}

	/**
	 * Schodzi po drzewie i ustawia `text` blokowi zgód.
	 *
	 * Atrybut ustawiamy BEZWARUNKOWO, także gdy ktoś wpisał własny w
	 * edytorze: zdanie o nieistniejącym regulaminie ma zniknąć niezależnie
	 * od tego, kto je tam wpisał. Odwrócenie decyzji to usunięcie tej
	 * wtyczki albo jednej metody, nie szukanie ustawienia.
	 *
	 * @param array<int,array<string,mixed>> $bloki Poddrzewo.
	 * @param string                         $tekst Gotowy HTML zdania.
	 * @return array<int,array<string,mixed>>
	 */
	private static function przejdz( array $bloki, string $tekst ): array {
		foreach ( $bloki as $i => $blok ) {
			if ( ( $blok['blockName'] ?? '' ) === self::BLOK_ZGODY ) {
				$blok['attrs']          = (array) ( $blok['attrs'] ?? array() );
				$blok['attrs']['text']  = $tekst;
				$bloki[ $i ]            = $blok;
				continue;
			}
			if ( ! empty( $blok['innerBlocks'] ) ) {
				$blok['innerBlocks'] = self::przejdz( (array) $blok['innerBlocks'], $tekst );
				$bloki[ $i ]         = $blok;
			}
		}
		return $bloki;
	}

	/**
	 * Zdanie, które zobaczy klient.
	 *
	 * Tekst trafia do `dangerouslySetInnerHTML`, więc składamy go sami
	 * i przepuszczamy adres przez `esc_url`.
	 *
	 * GDY STRONY POLITYKI NIE MA, ZDANIE NIE PADA W OGÓLE. Wcześniej
	 * zostawała sama nazwa bez odnośnika — a to znaczyło, że klient „wyraża
	 * zgodę" na dokument, którego nie ma jak przeczytać. To ta sama klasa,
	 * którą ta wtyczka naprawiła przy regulaminie: kasa nie powołuje się na
	 * dokument, którego klient nie może otworzyć. Pusty tekst usuwa zdanie
	 * z bloku zgód, bo `przejdz()` ustawia atrybut bezwarunkowo.
	 */
	private static function zdanie(): string {
		$adres = function_exists( 'get_privacy_policy_url' ) ? (string) get_privacy_policy_url() : '';

		if ( '' === $adres ) {
			return '';
		}

		$link = '<a href="' . esc_url( $adres ) . '" target="_blank" rel="noreferrer noopener">Politykę prywatności</a>';

		return 'Kontynuując zamówienie, wyrażasz zgodę na naszą ' . $link . '.';
	}
}
