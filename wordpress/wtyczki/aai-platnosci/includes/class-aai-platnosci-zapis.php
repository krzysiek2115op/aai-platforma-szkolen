<?php
/**
 * Warstwa zapisu — DZIAŁ-DYSPOZYTOR Pluginu 2.
 *
 * JEDYNE miejsce, które pisze do BAZY Pluginu 2 (obu tabel) i do
 * produktu WooCommerce. Ta sama zasada co `Aai_Sklep_Zapis` w Pluginie 1
 * i dyspozytor w prototypie; pilnują jej `straznik-wtyczki-wp`
 * (zapis tylko przez warstwę zapisu) i `straznik-platnosci-wp`
 * (produkt tylko stąd).
 *
 * CZEGO TU NIE MA — i nie będzie:
 *  - zapisów do tabel `aai_sklep_*` ani wywołań `Aai_Sklep_Zapis::`
 *    (jednokierunkowość — niezmiennik 2 schematu),
 *  - kasowania produktów (niezmiennik 13),
 *  - dotykania `_sale_price` w jakiejkolwiek formie (niezmiennik 3).
 *
 * @package Aai_Platnosci
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Jedyny pisarz Pluginu 2.
 */
final class Aai_Platnosci_Zapis {

	/**
	 * Klucze meta okładki na ZAŁĄCZNIKU. Własny przedrostek (L13 schematu):
	 * `_aai_zrodlo_uuid` siedzi już na 90 wpisach Tutora, więc zapytanie po
	 * nim rozstrzygałoby losowo.
	 */
	private const META_OKLADKA_KURS = '_aai_platnosci_okladka_kurs';

	/** Meta produktu WooCommerce wskazujące kurs, z którego powstał. */
	private const ZNACZNIK_ZRODLA = '_aai_zrodlo_uuid';

	/** Skrót PLIKU, z którego powstał załącznik — decyduje o przewgraniu. */
	private const META_OKLADKA_SHA = '_aai_platnosci_okladka_sha';

	/**
	 * Ilu ludzi straciło dostęp, gdy kurs tego produktu został usunięty.
	 *
	 * Osierocony produkt po kursie testowym to śmieć do sprzątnięcia,
	 * a osierocony produkt po kursie, który ktoś KUPIŁ, to ślad po utracie
	 * cudzego dostępu — kontrola ma je rozróżniać, a po usunięciu kursu
	 * tej liczby nie da się już odtworzyć (kopia w Tutorze znika razem
	 * z zapisami). Dlatego zapisujemy ją w chwili usunięcia.
	 */
	private const META_UTRACONY_DOSTEP = '_aai_platnosci_utracony_dostep';

	/**
	 * Pamięć mapowania kurs → produkt NA CZAS JEDNEGO ŻĄDANIA.
	 *
	 * Strona sprzedażowa pyta o to samo mapowanie PIĘĆ razy w jednym
	 * renderze (zmierzone na `:8892`, gość: trzy przyciski CTA przez
	 * `Aai_Platnosci_Cta::stan()`, dostępność w danych strukturalnych
	 * przez `Cta::dostepnosc()` i cena przez `Aai_Platnosci_Cena`), a
	 * odpowiedź w obrębie żądania jest stała. To ta sama klasa kosztu,
	 * dla której `Aai_Sklep_Widok::cena_grosze()` ma swoją pamięć —
	 * i ta sama, która przy W6 dała 90 zapytań na odsłonę menu.
	 *
	 * DLACZEGO WŁAŚCIWOŚĆ KLASY, A NIE `static $pamiec` W METODZIE.
	 * Bo tę pamięć trzeba UNIEWAŻNIAĆ: `powiazanie_ustaw()`
	 * i `powiazanie_usun()` zmieniają dokładnie to mapowanie, a
	 * `synchronizuj_kurs()` czyta je PO zapisie w tym samym przebiegu
	 * (komenda `sync` robi tak dla każdego kursu z rzędu). Pamięć
	 * zamknięta w metodzie nie dałaby się wyczyścić i oddawałaby wartość
	 * sprzed zapisu — czyli kupiłaby zapytanie kosztem prawdy.
	 *
	 * @var array<string,int|null>
	 */
	private static array $pamiec_produktow = array();

	/**
	 * Ustawia (lub odświeża) powiązanie kursu z produktem WooCommerce.
	 *
	 * Idempotentne: ten sam wpis drugi raz tylko odświeża `sync_ts`.
	 * Zmiana produktu dla istniejącego kursu przechodzi przez UPDATE
	 * po kluczu głównym — a gdyby nowy produkt był już powiązany
	 * z INNYM kursem, UNIQUE na `product_id` odmówi zapisu i metoda
	 * odda `false`: jeden produkt sprzedaje najwyżej jeden kurs,
	 * „weź pierwszy" nie istnieje (B4).
	 *
	 * @param string $course_uuid Uuid kursu z tabel Pluginu 1.
	 * @param int    $product_id  Id wpisu produktu WooCommerce.
	 */
	public static function powiazanie_ustaw( string $course_uuid, int $product_id ): bool {
		global $wpdb;
		$tabela = Aai_Platnosci_Tabele::tabela( 'powiazania' );

		/*
		 * ŚWIADOMIE NIE `ON DUPLICATE KEY UPDATE`: ten zapis reaguje na
		 * konflikt KAŻDEGO klucza unikalnego, więc próba powiązania
		 * zajętego produktu z drugim kursem „aktualizowałaby" CUDZY
		 * wiersz i meldowała sukces — dokładnie klasa „weź pierwszy"
		 * z B4. Złapane smoke'iem przy P1. Zamiast tego: jawny UPDATE
		 * po własnym kluczu albo czysty INSERT; konflikt UNIQUE
		 * w którymkolwiek = odmowa, nigdy cicha podmiana.
		 */
		$teraz = current_time( 'mysql', true );

		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- nazwa tabeli z klasy tabel.
		$jest = $wpdb->get_var(
			$wpdb->prepare( "SELECT course_uuid FROM {$tabela} WHERE course_uuid = %s", $course_uuid )
		);

		$cicho = $wpdb->suppress_errors( true );
		if ( null !== $jest ) {
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- nazwa tabeli z klasy tabel.
			$wynik = $wpdb->query(
				$wpdb->prepare(
					"UPDATE {$tabela} SET product_id = %d, sync_ts = %s WHERE course_uuid = %s",
					$product_id,
					$teraz,
					$course_uuid
				)
			);
		} else {
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- nazwa tabeli z klasy tabel.
			$wynik = $wpdb->query(
				$wpdb->prepare(
					"INSERT INTO {$tabela} (course_uuid, product_id, sync_ts) VALUES (%s, %d, %s)",
					$course_uuid,
					$product_id,
					$teraz
				)
			);
		}
		$wpdb->suppress_errors( $cicho );

		// Mapowanie właśnie się zmieniło — pamięć żądania przestaje być prawdą.
		self::zapomnij_produkt( $course_uuid );

		return false !== $wynik;
	}

	/**
	 * Usuwa powiązanie kursu. Produkt zostaje (nigdy go nie kasujemy) —
	 * o jego statusie decyduje osobno logika stanów z sekcji 9.3 schematu.
	 *
	 * @param string $course_uuid Uuid kursu.
	 */
	public static function powiazanie_usun( string $course_uuid ): void {
		global $wpdb;
		$wpdb->delete(
			Aai_Platnosci_Tabele::tabela( 'powiazania' ),
			array( 'course_uuid' => $course_uuid ),
			array( '%s' )
		);

		// Mapowanie właśnie zniknęło — pamięć żądania przestaje być prawdą.
		self::zapomnij_produkt( $course_uuid );
	}

	/**
	 * Odnotowuje zdarzenie dostarczenia — ATOMOWO.
	 *
	 * `true` = ten przebieg jest PIERWSZY i wolno mu działać (wysłać
	 * mail); `false` = ktoś już był. Rozstrzyga UNIQUE na parze
	 * (zdarzenie, identyfikator): dwa równoległe przebiegi nie
	 * przeczytają zgodnie „nie było", bo nie ma tu żadnego odczytu —
	 * jest jeden INSERT, który w bazie może wygrać tylko raz (B6).
	 *
	 * `INSERT IGNORE` połyka wyłącznie konflikt klucza w tabeli
	 * o schemacie z kodu (kolumny i typy nasze, wartości przez
	 * `prepare`), więc „0 wierszy" znaczy tu dokładnie „duplikat".
	 *
	 * @param string $zdarzenie     Np. `mail_konta`, `mail_kursu`, `dostep`.
	 * @param int    $identyfikator Id użytkownika (mail konta) albo zamówienia.
	 * @param string $wynik         Krótki opis rezultatu (np. wynik wp_mail).
	 */
	public static function dostawa_odnotuj( string $zdarzenie, int $identyfikator, string $wynik = '' ): bool {
		global $wpdb;

		/*
		 * Identyfikator musi być prawdziwy. Kolumna jest `bigint unsigned`,
		 * a instalacja stoi na NIE-strict `sql_mode` — wartość ujemna
		 * zostałaby po cichu przycięta do zera i dwa różne zdarzenia
		 * zlałyby się w jeden wiersz, czyli drugi mail nigdy by nie
		 * wyszedł. Wolimy głośną odmowę.
		 */
		if ( $identyfikator <= 0 ) {
			throw new InvalidArgumentException(
				sprintf( 'dostawa „%s" bez prawidłowego identyfikatora (%d)', $zdarzenie, $identyfikator )
			);
		}
		// `wynik` przycinamy SAMI, z widocznym wielokropkiem: kolumna ma
		// 191 znaków i utnie dłuższy komunikat w milczeniu.
		if ( mb_strlen( $wynik ) > 190 ) {
			$wynik = mb_substr( $wynik, 0, 189 ) . '…';
		}

		$tabela = Aai_Platnosci_Tabele::tabela( 'dostawy' );

		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- nazwa tabeli z klasy tabel.
		$dodane = $wpdb->query(
			$wpdb->prepare(
				"INSERT IGNORE INTO {$tabela} (zdarzenie, identyfikator, wynik, created_at)
				VALUES (%s, %d, %s, %s)",
				$zdarzenie,
				$identyfikator,
				$wynik,
				current_time( 'mysql', true )
			)
		);

		if ( false === $dodane ) {
			/*
			 * AWARIA ZAPYTANIA to NIE „duplikat". Pierwsza wersja zwracała
			 * tu `false` (bo `1 === false`), a wołający czyta `false` jako
			 * „ktoś już dostarczył" — więc przy zepsutej tabeli mail
			 * i dostęp przepadłyby bez jednego objawu, a dziennik
			 * twierdziłby, że wszystko poszło. Klasa BLAD-018: kod pisał
			 * co innego, niż robił. Awaria musi być głośna.
			 */
			throw new RuntimeException(
				sprintf( 'nie udało się odnotować dostawy (%s/%d): %s', $zdarzenie, $identyfikator, $wpdb->last_error )
			);
		}

		return 1 === $dodane;
	}

	/**
	 * Czy dostawa o tym kluczu jest w dzienniku.
	 *
	 * Pyta o to ponowna wysyłka: bez tego `--ponow=mail_konta/1` wysyłał
	 * ŚWIEŻY klucz resetu hasła komukolwiek (zmierzone: literówka w id
	 * posłała link administratorowi), nie zapisywał nic — bo `dostawa_wynik()`
	 * aktualizuje wiersz, którego nie ma — i meldował „wysłano ponownie”.
	 * Trzy nieprawdy naraz, a przy okazji każdy nowy klucz UNIEWAŻNIA
	 * poprzedni, więc pomyłka odbierałaby prawdziwemu klientowi jego link.
	 *
	 * @param string $zdarzenie     Zdarzenie.
	 * @param int    $identyfikator Identyfikator.
	 */
	public static function dostawa_istnieje( string $zdarzenie, int $identyfikator ): bool {
		if ( $identyfikator <= 0 ) {
			return false;
		}
		global $wpdb;
		$tabela = Aai_Platnosci_Tabele::tabela( 'dostawy' );
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- nazwa tabeli z klasy tabel.
		return null !== $wpdb->get_var(
			$wpdb->prepare(
				"SELECT id FROM {$tabela} WHERE zdarzenie = %s AND identyfikator = %d",
				$zdarzenie,
				$identyfikator
			)
		);
	}

	/**
	 * Zapisany rezultat zdarzenia — albo null, gdy wiersza nie ma.
	 *
	 * Potrzebne mailowi 1: pomija się wyłącznie po POTWIERDZONYM
	 * „wyslano" maila 2, więc musi przeczytać cudzy wynik z tabeli,
	 * nie założyć go.
	 *
	 * @param string $zdarzenie     Zdarzenie.
	 * @param int    $identyfikator Identyfikator.
	 */
	public static function dostawa_rezultat( string $zdarzenie, int $identyfikator ): ?string {
		if ( $identyfikator <= 0 ) {
			return null;
		}
		global $wpdb;
		$tabela = Aai_Platnosci_Tabele::tabela( 'dostawy' );
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- nazwa tabeli z klasy tabel.
		$wynik = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT wynik FROM {$tabela} WHERE zdarzenie = %s AND identyfikator = %d",
				$zdarzenie,
				$identyfikator
			)
		);
		return null === $wynik ? null : (string) $wynik;
	}

	/**
	 * Dopisuje rezultat do JUŻ odnotowanego zdarzenia (np. wynik
	 * `wp_mail()` znany dopiero po wysyłce). Nie tworzy wiersza —
	 * od tworzenia jest `dostawa_odnotuj()`.
	 *
	 * @param string $zdarzenie     Zdarzenie.
	 * @param int    $identyfikator Identyfikator.
	 * @param string $wynik         Rezultat.
	 */
	public static function dostawa_wynik( string $zdarzenie, int $identyfikator, string $wynik ): void {
		global $wpdb;
		$wpdb->update(
			Aai_Platnosci_Tabele::tabela( 'dostawy' ),
			array( 'wynik' => $wynik ),
			array(
				'zdarzenie'     => $zdarzenie,
				'identyfikator' => $identyfikator,
			),
			array( '%s' ),
			array( '%s', '%d' )
		);
	}

	/**
	 * Id produktu powiązanego z kursem — z NASZEJ tabeli, nigdy ze skanu
	 * postmeta (B4: `_aai_zrodlo_uuid` siedzi na 90 wpisach Tutora).
	 *
	 * @param string $course_uuid Uuid kursu.
	 */
	/**
	 * Strona WP na szkic — jedyne miejsce, które to robi (jedyny pisarz).
	 *
	 * Używane przez ustawienia P3a dla pustych stron natywnej kasy Tutora;
	 * kasowania nie ma tu tak samo, jak nie ma go dla produktów.
	 *
	 * @param int $id Id strony.
	 * @return bool Czy stan się ZMIENIŁ.
	 */
	public static function strona_na_szkic( int $id ): bool {
		if ( $id <= 0 || 'publish' !== get_post_status( $id ) ) {
			return false;
		}
		wp_update_post(
			array(
				'ID'          => $id,
				'post_status' => 'draft',
			)
		);
		return true;
	}

	/**
	 * Przywraca ZASTANY status strony — droga powrotna dla `strona_na_szkic()`.
	 *
	 * Deaktywacja wtyczki oddaje cudze ustawienia takimi, jakie je zastaliśmy
	 * (punkt przywracania `aai_platnosci_stan_zastany`). Strony natywnej kasy
	 * Tutora schodzą przy aktywacji na `draft`; bez tej metody zostawałyby tak
	 * na zawsze. Zapis wpisów rusza WYŁĄCZNIE ta warstwa (niezmiennik 10
	 * schematu), więc droga powrotna mieszka tutaj, a nie w klasie ustawień.
	 *
	 * @param int    $id     Id strony.
	 * @param string $status Status, jaki strona miała przed naszą zmianą.
	 * @return bool Czy stan się ZMIENIŁ.
	 */
	public static function przywroc_status_strony( int $id, string $status ): bool {
		if ( $id <= 0 || '' === $status || null === get_post( $id ) || get_post_status( $id ) === $status ) {
			return false;
		}
		wp_update_post(
			array(
				'ID'          => $id,
				'post_status' => $status,
			)
		);
		return true;
	}

	/**
	 * Slug strony WP (polskie adresy koszyka i kasy, P3a).
	 *
	 * @param int    $id   Id strony.
	 * @param string $slug Docelowy slug.
	 * @return bool Czy stan się ZMIENIŁ.
	 */
	public static function ustaw_slug_strony( int $id, string $slug ): bool {
		if ( $id <= 0 || null === get_post( $id ) || (string) get_post_field( 'post_name', $id ) === $slug ) {
			return false;
		}
		wp_update_post(
			array(
				'ID'        => $id,
				'post_name' => $slug,
			)
		);
		return true;
	}

	/**
	 * Dopisuje klasę do bloku w treści strony (idempotentnie).
	 *
	 * P3a: `has-dark-controls` na blokach koszyka i kasy — ciemny wariant
	 * kontrolek z arkusza samego Woo.
	 *
	 * @param int    $id    Id strony.
	 * @param string $blok  Klasa główna bloku (np. wp-block-woocommerce-cart).
	 * @param string $klasa Klasa do dopisania.
	 * @return bool Czy stan się ZMIENIŁ.
	 */
	public static function dopisz_klase_bloku( int $id, string $blok, string $klasa ): bool {
		$wpis = $id > 0 ? get_post( $id ) : null;
		if ( null === $wpis ) {
			return false;
		}
		$tresc = (string) $wpis->post_content;
		if ( ! str_contains( $tresc, $blok ) || str_contains( $tresc, $klasa ) ) {
			return false;
		}
		/*
		 * DOPASOWANIE NA GRANICY ATRYBUTU, nie na prefiksie.
		 *
		 * Pierwsza wersja robiła `str_replace( 'class="' . $blok, … )`, co
		 * trafiało też w KAŻDY blok zagnieżdżony o tym samym początku nazwy:
		 * `class="wp-block-woocommerce-cart-items-block` stawało się
		 * `class="wp-block-woocommerce-cart has-dark-controls-items-block`
		 * — czyli nazwa klasy dziecka ROZPADAŁA SIĘ na naszą klasę i ogon.
		 * Zmierzone na żywych stronach: 13 uszkodzeń w koszyku, 22 w kasie.
		 * Cicho, bo blok Woo zwraca zapisaną treść bez regeneracji, więc
		 * ani zapis, ani render niczego nie zgłaszały.
		 *
		 * Klasa musi kończyć się granicą atrybutu (spacja albo cudzysłów),
		 * a podmieniamy TYLKO pierwsze wystąpienie — blok zewnętrzny.
		 */
		$nowa = preg_replace(
			'~class="' . preg_quote( $blok, '~' ) . '(["\s])~',
			'class="' . $blok . ' ' . $klasa . '$1',
			$tresc,
			1
		);
		if ( null === $nowa || $nowa === $tresc ) {
			return false;
		}
		wp_update_post(
			array(
				'ID'           => $id,
				'post_content' => $nowa,
			)
		);
		return true;
	}

	/**
	 * Domknięcie zamówienia stojącego w `processing` (P3b).
	 *
	 * DLACZEGO TO TU, A NIE W KLASIE DOSTARCZANIA. Bo tu mieszka JEDYNY
	 * pisarz — decyzję „czy domknąć" podejmuje `Aai_Platnosci_Dostarczanie`
	 * (czytając pozycje zamówienia), a sam zapis musi być w jednym miejscu,
	 * żeby dało się go sprawdzić skryptem. Ta sama zasada wyprowadziła tu
	 * przy P3a trzy metody piszące do stron.
	 *
	 * BEZPIECZNIK NA STATUS zostaje mimo sprawdzenia u wołającego: między
	 * jego decyzją a tym zapisem mógł zadziałać ktoś inny (auto-complete
	 * Tutora przy metodzie spoza jego czarnej listy), a wtedy nie ma czego
	 * domykać. Zwraca `false`, czyli „stan się nie zmienił".
	 *
	 * @param int $order_id Id zamówienia WooCommerce.
	 * @return bool Czy stan się ZMIENIŁ.
	 */
	/**
	 * Status zapisu kursanta CZYTANY Z BAZY, z pominięciem cache'u wpisu.
	 *
	 * ZMIERZONE przy E0 kroku P4: `Utils::course_enrol_status_change()`
	 * Tutora zmienia status surowym `$wpdb->update` po `wp_posts`
	 * (`Utils.php:2478`) i NIE czyści cache'u wpisu. W tym samym żądaniu
	 * `get_post_status()` oddaje więc wartość sprzed zmiany: hak
	 * `tutor_after_enrolled` meldował `pending`, a baza miała `completed`.
	 * Bramka „wyślij dopiero, gdy dostęp naprawdę jest" oparta na
	 * `get_post_status()` NIE ZADZIAŁAŁABY NIGDY na ścieżce produkcyjnej.
	 *
	 * @param int $zapis_id Id wpisu `tutor_enrolled`.
	 */
	public static function status_zapisu( int $zapis_id ): string {
		if ( $zapis_id <= 0 ) {
			return '';
		}
		global $wpdb;
		return (string) $wpdb->get_var(
			$wpdb->prepare( "SELECT post_status FROM {$wpdb->posts} WHERE ID = %d", $zapis_id )
		);
	}

	/**
	 * Dopisuje blok komunikatów sklepu na POCZĄTEK treści strony.
	 *
	 * DLACZEGO (P4, zmierzone): strony koszyka i kasy z tej instalacji nie
	 * mają bloku `woocommerce/store-notices`, a motyw jest klasyczny —
	 * renderuje samą treść strony, więc klasyczne komunikaty WooCommerce
	 * (`wc_add_notice`) nie miały się GDZIE wydrukować. Skutek: każda
	 * nasza odmowa (drugi zakup posiadanego kursu, sprzedaż zamknięta)
	 * była NIEMA — klient lądował na pustym koszyku bez słowa wyjaśnienia.
	 * Z blokiem ten sam scenariusz pokazuje pełne zdanie odmowy.
	 *
	 * DOPISUJEMY, NICZEGO NIE PODMIENIAMY: lekcja P3a (rozbite nazwy klas
	 * przy `str_replace` w cudzej treści) — prepend całego bloku nie ma
	 * jak uszkodzić istniejącej treści. Idempotentne po obecności bloku.
	 *
	 * @param int $id Id strony.
	 * @return bool Czy coś się zmieniło.
	 */
	public static function dopisz_blok_komunikatow( int $id ): bool {
		if ( $id <= 0 ) {
			return false;
		}
		$tresc = (string) get_post_field( 'post_content', $id );
		if ( '' === $tresc || str_contains( $tresc, 'wp:woocommerce/store-notices' ) ) {
			return false;
		}
		$w = wp_update_post(
			array(
				'ID'           => $id,
				'post_content' => "<!-- wp:woocommerce/store-notices /-->\n" . $tresc,
			),
			true
		);
		return ! is_wp_error( $w ) && $w > 0;
	}

	public static function zamknij_zamowienie( int $order_id ): bool {
		if ( $order_id <= 0 || ! function_exists( 'wc_get_order' ) ) {
			return false;
		}
		$order = wc_get_order( $order_id );
		if ( ! $order instanceof WC_Order || 'processing' !== $order->get_status() ) {
			return false;
		}
		$order->set_status(
			'completed',
			__( 'Zamówienie zawiera wyłącznie kursy — dostęp jest cyfrowy, więc nie ma czego realizować.', 'aai-platnosci' )
		);
		$order->save();
		return true;
	}

	/**
	 * Czy produkt jest produktem kursu (ma wiersz w `powiazania`).
	 *
	 * Pyta o to blokada sprzedaży (P3a) przy KAŻDEJ walidacji koszyka —
	 * zapytanie idzie po kluczu UNIQUE `product_id`, więc jest tanie.
	 * Dopasowanie przez tabelę, nigdy po meta (B4).
	 *
	 * @param int $product_id Id produktu WooCommerce.
	 */
	public static function czy_produkt_kursu( int $product_id ): bool {
		if ( $product_id <= 0 ) {
			return false;
		}
		global $wpdb;
		$tabela = Aai_Platnosci_Tabele::tabela( 'powiazania' );
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- nazwa tabeli z klasy tabel.
		return null !== $wpdb->get_var(
			$wpdb->prepare( "SELECT product_id FROM {$tabela} WHERE product_id = %d", $product_id )
		);
	}

	/**
	 * Uuid kursu sprzedawanego przez ten produkt — odwrotność
	 * `produkt_kursu()`. Pyta mail 2 (P4), który zna zamówienie, a musi
	 * nazwać kursy; dopasowanie przez tabelę, nigdy po meta (B4).
	 *
	 * @param int $product_id Id produktu WooCommerce.
	 */
	public static function kurs_produktu( int $product_id ): ?string {
		if ( $product_id <= 0 ) {
			return null;
		}
		global $wpdb;
		$tabela = Aai_Platnosci_Tabele::tabela( 'powiazania' );
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- nazwa tabeli z klasy tabel.
		$uuid = $wpdb->get_var(
			$wpdb->prepare( "SELECT course_uuid FROM {$tabela} WHERE product_id = %d", $product_id )
		);
		return null === $uuid ? null : (string) $uuid;
	}

	public static function produkt_kursu( string $course_uuid ): ?int {
		// `array_key_exists`, nie `isset`: BRAK produktu (null) też jest
		// odpowiedzią i też ma być zapamiętany — inaczej kurs bez produktu
		// pytałby bazę tyle samo razy co przed poprawką.
		if ( array_key_exists( $course_uuid, self::$pamiec_produktow ) ) {
			return self::$pamiec_produktow[ $course_uuid ];
		}

		global $wpdb;
		$tabela = Aai_Platnosci_Tabele::tabela( 'powiazania' );
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- nazwa tabeli z klasy tabel.
		$id = $wpdb->get_var(
			$wpdb->prepare( "SELECT product_id FROM {$tabela} WHERE course_uuid = %s", $course_uuid )
		);

		$wynik                                  = null === $id ? null : (int) $id;
		self::$pamiec_produktow[ $course_uuid ] = $wynik;
		return $wynik;
	}

	/**
	 * Produkt oznaczony jako pochodzący z danego kursu — także taki,
	 * który NIE MA jeszcze wiersza w tabeli powiązań.
	 *
	 * To jedyna droga do odnalezienia produktu-sieroty po przerwanym
	 * zapisie. Pusty uuid nie ma prawa niczego dopasować (ta sama obrona
	 * co w `kurs_tutora()`: zapytanie po pustej wartości meta trafia
	 * w pierwszy lepszy wpis).
	 *
	 * @param string $course_uuid Uuid kursu.
	 * @return int|null Id produktu albo null.
	 */
	private static function produkt_po_znaczniku( string $course_uuid ): ?int {
		if ( '' === trim( $course_uuid ) || ! function_exists( 'wc_get_products' ) ) {
			return null;
		}

		$znalezione = wc_get_products(
			array(
				'limit'      => 2,
				'status'     => array( 'draft', 'publish', 'pending', 'private' ),
				'return'     => 'ids',
				'meta_key'   => self::ZNACZNIK_ZRODLA, // phpcs:ignore WordPress.DB.SlowDBQuery
				'meta_value' => $course_uuid, // phpcs:ignore WordPress.DB.SlowDBQuery
			)
		);

		// Więcej niż jeden znacznik znaczy, że duplikat JUŻ powstał —
		// wtedy nie zgadujemy, który jest prawdziwy. Kontrola to pokaże.
		if ( ! is_array( $znalezione ) || 1 !== count( $znalezione ) ) {
			return null;
		}

		return (int) $znalezione[0];
	}

	/**
	 * Zapomina zapamiętane mapowanie kurs → produkt.
	 *
	 * Woła ją KAŻDY zapis zmieniający to mapowanie. Bez tego kolejny
	 * odczyt w tym samym żądaniu oddałby stan sprzed zapisu — a czyta go
	 * m.in. `synchronizuj_kurs()` zaraz po `powiazanie_ustaw()`.
	 *
	 * @param string $course_uuid Uuid kursu; pusty łańcuch = zapomnij wszystko.
	 */
	private static function zapomnij_produkt( string $course_uuid = '' ): void {
		if ( '' === $course_uuid ) {
			self::$pamiec_produktow = array();
			return;
		}
		unset( self::$pamiec_produktow[ $course_uuid ] );
	}

	/**
	 * Wpis kursu w Tutorze po uuid. ZAWSZE z `post_type` i z twardą
	 * odmową przy więcej niż jednym trafieniu — „weź pierwszy" nie
	 * istnieje (B4). `-1` znaczy: niejednoznaczność, zatrzymaj się.
	 *
	 * @param string $course_uuid Uuid kursu.
	 */
	public static function kurs_tutora( string $course_uuid ): ?int {
		/*
		 * PUSTY UUID NIE MA PRAWA NICZEGO DOPASOWAĆ.
		 *
		 * Zapytanie po `meta_value => ''` dopasowuje PIERWSZY LEPSZY wpis
		 * danego typu — tak w sweepie P5 kopia kursu przejęła cudzy moduł
		 * i skasowała jego lekcje. Plugin 1 ma tę obronę od tamtej pory
		 * (`Aai_Sklep_Tutor::znajdz_po_uuid()`), Plugin 2 jej nie miał.
		 * Dziś ratuje nas przypadek: kursy są dwa, więc pusty uuid trafia
		 * w dwa wpisy i metoda oddaje -1. Przy JEDNYM kursie oddałaby jego
		 * id i szew powiązałby z nim cudzy produkt.
		 */
		if ( '' === trim( $course_uuid ) ) {
			return null;
		}

		$typ = function_exists( 'tutor' ) ? (string) ( tutor()->course_post_type ?? 'courses' ) : 'courses';

		$wpisy = get_posts(
			array(
				'post_type'      => $typ,
				'post_status'    => 'any',
				'posts_per_page' => 2,
				'fields'         => 'ids',
				'meta_key'       => '_aai_zrodlo_uuid', // phpcs:ignore WordPress.DB.SlowDBQuery
				'meta_value'     => $course_uuid, // phpcs:ignore WordPress.DB.SlowDBQuery
			)
		);

		if ( count( $wpisy ) > 1 ) {
			return -1;
		}
		return array() === $wpisy ? null : (int) $wpisy[0];
	}

	/**
	 * Pełna synchronizacja jednego kursa do produktu WooCommerce.
	 *
	 * Kolejność jest treścią bezpieczeństwa, nie stylem (schemat,
	 * sekcja 7): produkt rodzi się jako `draft` (B3), powiązanie na
	 * wpisie kursu Tutora idzie `price_type` NAJPIERW i `product_id`
	 * NA KOŃCU (B2 — odwrotna kolejność ROZDAJE kurs za darmo, bo
	 * `do_enroll()` widzi kurs „darmowy" w stanie pośrednim), a na
	 * `publish` produkt przechodzi dopiero z kompletem warunków.
	 *
	 * IDEMPOTENCJA JEST WARUNKIEM BRAMKI P2 (korekta schematu przy P2):
	 * bez realnych zmian NIE wołamy `save()` — każdy zapis zmienia
	 * `post_modified` i sha256 wiersza produktu przestaje być stabilne
	 * między przebiegami importu.
	 *
	 * @param string $course_uuid Uuid kursu z tabel Pluginu 1.
	 * @return array<string,mixed> Liczniki + uwagi.
	 */
	public static function synchronizuj_kurs( string $course_uuid ): array {
		$w = array(
			'produkt_utworzony' => 0,
			'zaktualizowany'    => 0,
			'bez_zmian'         => 0,
			'zdjety'            => 0,
			'uwagi'             => array(),
		);

		if ( ! class_exists( 'WooCommerce' ) || ! class_exists( 'Aai_Sklep_Odczyt' ) ) {
			$w['uwagi'][] = 'brak WooCommerce albo Pluginu 1 — synchronizacja pominięta';
			return $w;
		}

		/*
		 * Bez naszych tabel nie wolno TWORZYĆ produktu: powiązania nie
		 * dałoby się zapisać, a produkt zostałby sierotą, której kontrola
		 * NIGDY nie zobaczy (iteruje po wierszach `powiazania`) — i rósłby
		 * o jeden przy każdym przebiegu.
		 */
		if ( ! Aai_Platnosci_Tabele::istnieja() ) {
			$w['uwagi'][] = 'brak tabel Pluginu 2 — synchronizacja wstrzymana, żeby nie tworzyć produktów bez powiązania';
			return $w;
		}

		$kurs = Aai_Sklep_Odczyt::kurs_po_id( $course_uuid );
		if ( null === $kurs ) {
			// Kurs zniknął — traktujemy jak usunięcie (tabela stanów 9.3).
			return self::zdejmij_kurs( $course_uuid );
		}

		$sprzedawalny = 'published' === $kurs['status'] && $kurs['price_grosze'] > 0;
		if ( ! $sprzedawalny ) {
			// `draft` kursu NIE dotyka price_type (9.3); cena 0 i archiwum — tak.
			$cel_price_type = 'draft' === $kurs['status'] ? null : 'free';
			return self::zdejmij_kurs( $course_uuid, $cel_price_type );
		}

		$cena       = number_format( $kurs['price_grosze'] / 100, 2, '.', '' );
		/*
		 * KRÓTKI OPIS PRODUKTU — pole, które klient CZYTA W KASIE.
		 *
		 * Woo drukuje `short_description` pod nazwą pozycji w koszyku,
		 * w podsumowaniu zamówienia w kasie i oddaje je publicznie przez
		 * Store API (`/wc/store/v1/products/<id>`). Do 0.50.0 kopia go
		 * NIE USTAWIAŁA — pole było niczyje, więc czytelnikiem stawał się
		 * każdy, kto cokolwiek tam zapisał. Znalezione na żywej instalacji:
		 * w kasie pod nazwą kursu widniało „cudza edycja 1787936224",
		 * ślad po ręcznym dowodzeniu haka B13 na produkcie 675.
		 *
		 * Źródłem jest `courses.short_desc` — ta sama kolumna, którą do
		 * Tutora kopiuje `Aai_Sklep_Tutor`. Jedno źródło, dwie kopie.
		 *
		 * `wp_slash()` NIE jest ostrożnością na zapas — ZMIERZONE na
		 * `:8892` (Woo 11.0.1): `set_short_description()` i `set_name()`
		 * kończą w `wp_insert_post()`, które przepuszcza wartość przez
		 * `wp_unslash()`, więc bez posłodzenia z opisu ginie KAŻDY
		 * backslash (`C:\Users`, sekwencja `\n` — a kurs o Gicie takich
		 * zapisów pełen). Powtórny zapis tej samej wartości slashy NIE
		 * kumuluje (też zmierzone), więc idempotencja zostaje.
		 * To ta sama rodzina co pułapka `update_post_meta` z kroku W2 —
		 * różnica jest taka, że tam ratował nas `$wpdb`, a tu nie.
		 */
		$opis       = (string) ( $kurs['short_desc'] ?? '' );
		$product_id = self::produkt_kursu( $course_uuid );
		$produkt    = null !== $product_id ? wc_get_product( $product_id ) : false;

		if ( ! $produkt ) {
			/*
			 * NAJPIERW SZUKAMY SIEROTY, DOPIERO POTEM TWORZYMY.
			 *
			 * `produkt_kursu()` pyta tabelę POWIĄZAŃ, a produkt powstaje
			 * PRZED wpisem do niej — więc przerwanie procesu między
			 * `$produkt->save()` a `powiazanie_ustaw()` (fatal, timeout,
			 * restart) zostawia produkt bez powiązania. Przy następnym
			 * przebiegu tabela dalej milczy i powstawał DRUGI produkt dla
			 * tego samego kursu: dwie ceny, dwa adresy zakupu, a kontrola
			 * meldowała sierotę bez wskazania, który jest prawdziwy.
			 *
			 * Zapisu wielotabelowego nie da się tu domknąć transakcją:
			 * produkt zakłada WooCommerce własnym API, przez własne
			 * połączenie i własne cache, więc `START TRANSACTION` objąłby
			 * naszą tabelę, a nie jego wpisy. Zamiast atomowości dajemy
			 * IDEMPOTENCJĘ: znacznik pochodzenia na produkcie sprawia, że
			 * powtórzone wywołanie ODNAJDUJE sierotę i domyka powiązanie,
			 * zamiast mnożyć produkty.
			 */
			$sierota = self::produkt_po_znaczniku( $course_uuid );

			if ( null !== $sierota ) {
				$produkt = wc_get_product( $sierota );

				// `$product_id` MUSI iść w parze z `$produkt` — dalszy ciąg
				// metody (status, powiązanie, kontrola) używa identyfikatora,
				// a nie obiektu. Bez tej linii sierota zostaje odnaleziona,
				// ale identyfikator zostaje `null` i metoda przerywa się na
				// „set_status() on false" — zmierzone.
				if ( $produkt ) {
					$product_id = $sierota;
				}
			}
		}

		if ( ! $produkt ) {
			// Produkt rodzi się jako DRAFT (B3) i UKRYTY w katalogu Woo
			// (decyzja właściciela 2026-08-28): jedyną witryną zakupu jest
			// nasza strona sprzedażowa — klient nie ma trafiać na produkt
			// w cudzym wyglądzie.
			$produkt = new WC_Product_Simple();
			$produkt->update_meta_data( self::ZNACZNIK_ZRODLA, $course_uuid );
			$produkt->set_name( wp_slash( $kurs['title'] ) );
			$produkt->set_short_description( wp_slash( $opis ) );
			$produkt->set_status( 'draft' );
			$produkt->set_virtual( true );
			$produkt->set_sold_individually( true );
			$produkt->set_catalog_visibility( 'hidden' );
			$produkt->set_regular_price( $cena );
			$product_id = $produkt->save();
			if ( $product_id <= 0 ) {
				$w['uwagi'][] = 'WooCommerce nie utworzyło produktu';
				return $w;
			}
			$w['produkt_utworzony'] = 1;
		} else {
			// Aktualizacja TYLKO przy realnej różnicy.
			$zmiany = false;

			// Znacznik pochodzenia uzupełniamy też produktom, które powstały
			// PRZED tą poprawką — bez tego idempotencja obejmowałaby wyłącznie
			// produkty założone od dziś, a sierotę po starym produkcie dalej
			// dałoby się zduplikować.
			if ( (string) $produkt->get_meta( self::ZNACZNIK_ZRODLA, true ) !== $course_uuid ) {
				$produkt->update_meta_data( self::ZNACZNIK_ZRODLA, $course_uuid );
				$zmiany = true;
			}
			if ( $produkt->get_name( 'edit' ) !== $kurs['title'] ) {
				$produkt->set_name( wp_slash( $kurs['title'] ) );
				$zmiany = true;
			}
			if ( (string) $produkt->get_short_description( 'edit' ) !== $opis ) {
				$produkt->set_short_description( wp_slash( $opis ) );
				$zmiany = true;
			}
			if ( $produkt->get_regular_price( 'edit' ) !== $cena ) {
				/*
				 * Woo KASUJE promocję, gdy cena promocyjna wyjdzie równa
				 * albo wyższa od regularnej (`class-wc-product-data-store-cpt.php:857`).
				 * To nie jest nasza operacja, ale nasza kopia potrafi ją
				 * wywołać — więc mówimy o tym wprost, zamiast udawać, że
				 * nic nie zaszło (wymóg schematu, sekcja 6).
				 */
				$promocyjna = (string) $produkt->get_sale_price( 'edit' );
				if ( '' !== $promocyjna && (float) $promocyjna >= (float) $cena ) {
					$w['uwagi'][] = sprintf(
						'obniżenie ceny kursu do %s zł SKASUJE promocję %s zł ustawioną w WooCommerce (robi to Woo, nie my)',
						$cena,
						$promocyjna
					);
				}
				$produkt->set_regular_price( $cena );
				$zmiany = true;
			}
			/*
			 * `_price` (pole, którym Woo liczy w koszyku — B5) CELOWO nie
			 * jest tu naprawiane. ZMIERZONE w kodzie Woo 11.0.1
			 * (`class-wc-product-data-store-cpt.php:856`): to pole
			 * przelicza się WYŁĄCZNIE wtedy, gdy `_regular_price` albo
			 * `_sale_price` REALNIE zmieni się w bazie — `set_price()`
			 * przez API nie zapisuje go wcale, a ponowny zapis tej samej
			 * ceny regularnej niczego nie wywołuje. Rozjazd `_price`
			 * powstaje więc tylko wtedy, gdy ktoś zapisał to pole metą
			 * z pominięciem API (cudza wtyczka, ręczna zmiana w bazie),
			 * i jest ANOMALIĄ, nie stanem roboczym.
			 *
			 * Dlatego: kontrola go WYKRYWA (kod 1), a naprawa jest JAWNA
			 * — `wp aai-platnosci sync --napraw-cene` (patrz
			 * `napraw_cene_efektywna()`). Nie robimy jej przy każdym
			 * zapisie kursu, bo wymaga przejścia przez cenę tymczasową,
			 * a to nie ma prawa dziać się po cichu na produkcie, który
			 * ktoś właśnie ogląda w kasie.
			 */
			if ( ! $produkt->get_virtual( 'edit' ) ) {
				$produkt->set_virtual( true );
				$zmiany = true;
			}
			if ( ! $produkt->get_sold_individually( 'edit' ) ) {
				$produkt->set_sold_individually( true );
				$zmiany = true;
			}
			if ( 'hidden' !== $produkt->get_catalog_visibility( 'edit' ) ) {
				$produkt->set_catalog_visibility( 'hidden' );
				$zmiany = true;
			}
			if ( $zmiany ) {
				$produkt->save();
				$w['zaktualizowany'] = 1;
			}
		}

		/*
		 * OD TĄD ANI JEDNEGO WCZESNEGO `return` — status produktu nadaje
		 * JEDNO miejsce na końcu metody.
		 *
		 * Pierwsza wersja wychodziła z metody przy każdej przeszkodzie
		 * (odmowa powiązania, dwa wpisy Tutora, brak kopii w Tutorze)
		 * i zostawiała produkt w statusie, który miał wcześniej. Dla
		 * produktu tworzonego od zera to nie szkodziło (rodzi się
		 * `draft`), ale w stanie ustalonym produkt jest `publish` —
		 * więc skasowanie kopii kursu w Tutorze zostawiało KUPOWALNY
		 * produkt bez powiązania, czyli „klient płaci i nie dostaje
		 * nic" (B3). Kod pisał przy tym w uwadze „produkt zostaje
		 * draft", czego nic nie egzekwowało — nieprawda o zachowaniu,
		 * klasa BLAD-018. Zmierzone uruchomieniowo przy przeglądzie P2.
		 */
		$komplet = false;

		if ( ! self::powiazanie_ustaw( $course_uuid, (int) $product_id ) ) {
			// Powód podajemy zmierzony, nie zgadnięty: konflikt UNIQUE to
			// co innego niż padnięte zapytanie, a operator dostaje inną
			// instrukcję w każdym z tych przypadków.
			global $wpdb;
			$w['uwagi'][] = false !== strpos( (string) $wpdb->last_error, 'Duplicate entry' )
				? sprintf( 'produkt %d jest już powiązany z INNYM kursem — odmowa (B4)', $product_id )
				: sprintf( 'nie udało się zapisać powiązania produktu %d: %s', $product_id, (string) $wpdb->last_error );
		} else {
			// Znaczniki PO zapisie: handler Tutora na `save_post_product`
			// czyta $_POST i przy programowym zapisie KASUJE `_tutor_product`
			// (pułapka 2 schematu) — dlatego stawiamy je po każdym save(),
			// a cudze zapisy naprawia hak `przywroc_znaczniki()`.
			self::ustaw_znaczniki_produktu( (int) $product_id, $course_uuid );

			$tutor_id = self::kurs_tutora( $course_uuid );
			if ( -1 === $tutor_id ) {
				$w['uwagi'][] = 'więcej niż jeden wpis Tutora z tym uuid — zatrzymane, wyjaśnij dane (B4)';
			} elseif ( null === $tutor_id ) {
				// Projektowany stan degradacji (korekta schematu przy P2):
				// bez kopii w Tutorze produkt zostaje szkicem, komplet
				// domyka `wp aai-platnosci sync` po imporcie.
				$w['uwagi'][] = 'kopii kursu w Tutorze jeszcze nie ma — produkt zostaje draft, dokończy sync';
			} else {
				// KOLEJNOŚĆ B2: price_type NAJPIERW, product_id NA KOŃCU.
				update_post_meta( $tutor_id, '_tutor_course_price_type', 'paid' );
				update_post_meta( $tutor_id, '_tutor_course_product_id', (int) $product_id );
				$komplet = true;
			}
		}

		/*
		 * Okładka produktu (P5). Poza łańcuchem powiązania celowo: to
		 * atrybut prezentacyjny, a nie warunek sprzedaży — kurs bez
		 * rastrowej okładki ma się dać kupić, tylko z zastępnikiem
		 * zamiast obrazka. Metoda sama pyta o stan, więc drugi zapis
		 * tego samego kursu nic nie zmienia (bramka P2: sha produktu
		 * niezmieniony między przebiegami).
		 */
		if ( self::ustaw_okladke( (int) $product_id, $course_uuid, $kurs['cover_url'] ?? null, (string) ( $kurs['title'] ?? '' ) )
			&& 0 === $w['produkt_utworzony'] ) {
			$w['zaktualizowany'] = 1;
		}

		// JEDYNE miejsce nadające status produktowi w tej metodzie.
		$cel = $komplet ? 'publish' : 'draft';
		if ( get_post_status( (int) $product_id ) !== $cel ) {
			$przestawiany = wc_get_product( (int) $product_id );
			$przestawiany->set_status( $cel );
			$przestawiany->save();
			self::ustaw_znaczniki_produktu( (int) $product_id, $course_uuid );
			if ( 0 === $w['produkt_utworzony'] ) {
				$w['zaktualizowany'] = 1;
			}
		}

		if ( 0 === $w['produkt_utworzony'] && 0 === $w['zaktualizowany'] ) {
			$w['bez_zmian'] = 1;
		}
		return $w;
	}

	/**
	 * Miniatura produktu = okładka kursu. Zwraca `true`, gdy COŚ zmieniła.
	 *
	 * PO CO (krok P5, decyzja właściciela 2026-08-29). Bez miniatury
	 * WooCommerce rysuje w koszyku i w kasie szary zastępnik — klient płaci
	 * 299 zł i widzi pusty prostokąt zamiast kursu. Plik bierzemy z Pluginu 1
	 * (`okladka_plik()`), bo to jego dane i jego katalog `assets/okladki`;
	 * my go tylko wgrywamy i wskazujemy produktowi.
	 *
	 * IDEMPOTENCJA JEST TU WYMOGIEM, NIE OZDOBĄ. Bramka kroku P2 mówi:
	 * „sha256 wiersza produktu razem z meta niezmieniony między drugim
	 * a trzecim przebiegiem importu". Gdyby ta metoda wgrywała plik albo
	 * przestawiała `_thumbnail_id` przy każdym zapisie, bramka padłaby —
	 * a przy okazji biblioteka mediów puchłaby o kopię okładki na każdy
	 * zapis kursu. Dlatego pytamy o STAN: jest już załącznik tego kursu
	 * o tym samym skrócie pliku i produkt na niego wskazuje? To nic nie
	 * robimy.
	 *
	 * @param int         $product_id  Produkt WooCommerce.
	 * @param string      $course_uuid Uuid kursu.
	 * @param string|null $cover_url   Wartość kolumny `cover_url`.
	 */
	public static function ustaw_okladke( int $product_id, string $course_uuid, ?string $cover_url, string $tytul = '' ): bool {
		if ( ! class_exists( 'Aai_Sklep_Widok' ) || ! method_exists( 'Aai_Sklep_Widok', 'okladka_plik' ) ) {
			return false;
		}
		$plik = Aai_Sklep_Widok::okladka_plik( $cover_url );
		if ( null === $plik ) {
			return false;
		}
		$sha = (string) hash_file( 'sha256', $plik );
		if ( '' === $sha ) {
			return false;
		}

		$zalacznik = self::zalacznik_okladki( $course_uuid );
		$aktualny  = $zalacznik > 0
			&& (string) get_post_meta( $zalacznik, self::META_OKLADKA_SHA, true ) === $sha;

		if ( ! $aktualny ) {
			/*
			 * Poprzednia okładka TEGO kursu znika PRZED wgraniem nowej.
			 *
			 * Kolejność jest tu treścią, nie stylem. Przy kasowaniu PO
			 * wgraniu WordPress zastaje zajętą nazwę i nadaje plikowi
			 * przyrostek — zmierzone: `jak-korzystac-z-claude-1.png`.
			 * Po kilku poprawkach okładki właściciel miałby w bibliotece
			 * `…-7.png` bez jednego duplikatu na dysku, czyli nazwę, która
			 * kłamie o historii pliku.
			 *
			 * Ceną jest okno: gdyby wgranie padło, produkt zostaje bez
			 * miniatury do następnej synchronizacji. To akceptowalne —
			 * okładka jest atrybutem prezentacyjnym, nie warunkiem
			 * sprzedaży, a kurs bez niej ma się dać kupić.
			 *
			 * Zakaz kasowania (niezmiennik 13) dotyczy PRODUKTU: ten jest
			 * częścią historii zamówień i faktur. Załącznik okładki nie
			 * jest niczyją historią — to plik, który sami tu wstawiliśmy,
			 * oznaczony naszym kluczem meta i tym uuid. Kasujemy WYŁĄCZNIE
			 * wpis z tym meta, więc plik podstawiony ręcznie zostaje.
			 */
			if ( $zalacznik > 0
				&& (string) get_post_meta( $zalacznik, self::META_OKLADKA_KURS, true ) === $course_uuid ) {
				wp_delete_attachment( $zalacznik, true );
			}
			$zalacznik = self::wgraj_okladke( $plik, $course_uuid, $sha, $tytul );
			if ( $zalacznik <= 0 ) {
				return false;
			}
		}

		/*
		 * Tekst alternatywny uzupełniamy TAKŻE dla okładki wgranej
		 * wcześniej: gdyby siedział tylko w gałęzi wgrywania, załącznik
		 * sprzed tej poprawki zostałby z pustym `alt` na zawsze —
		 * a niczego by to nie zgłosiło. Zapis tylko gdy pusty, więc
		 * ręczna zmiana w bibliotece mediów zostaje uszanowana.
		 */
		if ( '' !== $tytul && '' === (string) get_post_meta( $zalacznik, '_wp_attachment_image_alt', true ) ) {
			update_post_meta( $zalacznik, '_wp_attachment_image_alt', wp_slash( sprintf( 'Okładka kursu: %s', $tytul ) ) );
		}

		$produkt = wc_get_product( $product_id );
		if ( ! $produkt instanceof WC_Product ) {
			return false;
		}
		if ( (int) $produkt->get_image_id( 'edit' ) === $zalacznik ) {
			// Plik ten sam i produkt już na niego wskazuje — cisza.
			return ! $aktualny;
		}
		$produkt->set_image_id( $zalacznik );
		$produkt->save();
		// Znaczniki Tutora po każdym `save()` — handler `save_post_product`
		// kasuje `_tutor_product`, czytając `$_POST` (pułapka 2 schematu).
		self::ustaw_znaczniki_produktu( $product_id, $course_uuid );
		return true;
	}

	/**
	 * Załącznik będący okładką TEGO kursu, albo 0.
	 *
	 * Szukamy po WŁASNYM kluczu meta, nigdy po nazwie pliku: obie okładki
	 * nazywają się jak slug kursu dziś, ale nazwa to nie jest tożsamość
	 * (ta sama lekcja co przy zrzutach — 148 plików, powtarzające się nazwy).
	 */
	private static function zalacznik_okladki( string $course_uuid ): int {
		$znalezione = get_posts(
			array(
				'post_type'   => 'attachment',
				'post_status' => 'inherit',
				'numberposts' => 1,
				'fields'      => 'ids',
				// phpcs:disable WordPress.DB.SlowDBQuery
				'meta_query'  => array(
					array(
						'key'   => self::META_OKLADKA_KURS,
						'value' => $course_uuid,
					),
				),
				// phpcs:enable WordPress.DB.SlowDBQuery
			)
		);
		return $znalezione ? (int) $znalezione[0] : 0;
	}

	/**
	 * Wkłada plik okładki do biblioteki mediów i zwraca jego identyfikator.
	 *
	 * `wp_upload_bits` — jak w Pluginie 1 przy zrzutach: kładzie plik tam,
	 * gdzie WordPress trzyma media, pilnuje unikalnej nazwy i sprawdza
	 * uprawnienia katalogu. Ręczne kopiowanie omijałoby wszystkie trzy.
	 */
	private static function wgraj_okladke( string $plik, string $course_uuid, string $sha, string $tytul = '' ): int {
		$zawartosc = file_get_contents( $plik ); // phpcs:ignore WordPress.WP.AlternativeFunctions
		if ( false === $zawartosc ) {
			return 0;
		}
		$wgrany = wp_upload_bits( basename( $plik ), null, $zawartosc );
		if ( ! empty( $wgrany['error'] ) ) {
			return 0;
		}
		$typ = wp_check_filetype( $wgrany['file'], null );
		$id  = wp_insert_attachment(
			array(
				'post_mime_type' => (string) $typ['type'],
				'post_title'     => sanitize_file_name( basename( $plik ) ),
				'post_status'    => 'inherit',
			),
			$wgrany['file'],
			0,
			true
		);
		if ( is_wp_error( $id ) ) {
			return 0;
		}
		require_once ABSPATH . 'wp-admin/includes/image.php';
		wp_update_attachment_metadata( (int) $id, wp_generate_attachment_metadata( (int) $id, $wgrany['file'] ) );
		update_post_meta( (int) $id, self::META_OKLADKA_KURS, wp_slash( $course_uuid ) );
		update_post_meta( (int) $id, self::META_OKLADKA_SHA, wp_slash( $sha ) );
		/*
		 * TEKST ALTERNATYWNY. Bez niego WooCommerce drukuje w koszyku
		 * i w kasie `<img alt="">` — czytnik ekranu mówi klientowi
		 * „obraz" i nic więcej, a przy niewczytanym obrazku zostaje pusty
		 * prostokąt. Zmierzone przed poprawką: Store API oddawało `alt: ""`.
		 * Nazwa kursu jest tu prawdziwym opisem: to okładka TEGO kursu.
		 */
		if ( '' !== $tytul ) {
			update_post_meta( (int) $id, '_wp_attachment_image_alt', wp_slash( sprintf( 'Okładka kursu: %s', $tytul ) ) );
		}
		return (int) $id;
	}

	/**
	 * Zdejmuje kurs ze sprzedaży: powiązanie w Tutorze schodzi ODWROTNĄ
	 * kolejnością (`product_id` najpierw, `price_type` na końcu — B2),
	 * produkt przechodzi na `draft` i NIGDY nie jest kasowany
	 * (niezmiennik 13). Wiersz `powiazania` zostaje — kontrola raportuje
	 * produkt jako zdjęty/osierocony, a historia wie, czyj był.
	 *
	 * @param string      $course_uuid    Uuid kursu.
	 * @param string|null $cel_price_type Docelowy `_tutor_course_price_type`
	 *                                    (`free`) albo null = nie dotykać
	 *                                    (szkic kursu, tabela 9.3).
	 * @return array<string,mixed>
	 */
	public static function zdejmij_kurs( string $course_uuid, ?string $cel_price_type = 'free' ): array {
		$w = array(
			'produkt_utworzony' => 0,
			'zaktualizowany'    => 0,
			'bez_zmian'         => 0,
			'zdjety'            => 0,
			'uwagi'             => array(),
		);

		$tutor_id = self::kurs_tutora( $course_uuid );
		if ( is_int( $tutor_id ) && $tutor_id > 0 ) {
			// Kolejność ODWROTNA do wiązania (B2).
			delete_post_meta( $tutor_id, '_tutor_course_product_id' );
			if ( null !== $cel_price_type ) {
				update_post_meta( $tutor_id, '_tutor_course_price_type', $cel_price_type );
			}
		}

		$product_id = self::produkt_kursu( $course_uuid );
		if ( null !== $product_id && 'draft' !== get_post_status( $product_id ) && false !== get_post_status( $product_id ) ) {
			wp_update_post(
				array(
					'ID'          => $product_id,
					'post_status' => 'draft',
				)
			);
			self::ustaw_znaczniki_produktu( $product_id, $course_uuid );
			$w['zdjety'] = 1;
		} else {
			$w['bez_zmian'] = 1;
		}
		return $w;
	}

	/**
	 * Synchronizacja WSZYSTKICH kursów: opublikowane w przód, a wiersze
	 * `powiazania` kursów już nieopublikowanych — w dół (draft). Woła ją
	 * komenda `wp aai-platnosci sync` i aktywacja wtyczki (U3: na
	 * istniejącej instalacji nikt kursów nie zapisuje, więc bez tego po
	 * aktywacji nie powstałby ani jeden produkt).
	 *
	 * @return array<string,mixed> Zsumowane liczniki.
	 */
	public static function synchronizuj_wszystkie(): array {
		global $wpdb;
		$suma = array(
			'produkt_utworzony' => 0,
			'zaktualizowany'    => 0,
			'bez_zmian'         => 0,
			'zdjety'            => 0,
			'uwagi'             => array(),
		);
		if ( ! class_exists( 'Aai_Sklep_Odczyt' ) ) {
			$suma['uwagi'][] = 'brak Pluginu 1 — nie ma czego synchronizować';
			return $suma;
		}

		$uuidy = array();
		foreach ( Aai_Sklep_Odczyt::lista_kursow() as $kurs ) {
			$uuidy[ (string) $kurs['id'] ] = true;
		}
		$tabela = Aai_Platnosci_Tabele::tabela( 'powiazania' );
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- nazwa tabeli z klasy tabel.
		foreach ( $wpdb->get_col( "SELECT course_uuid FROM {$tabela}" ) as $uuid ) {
			$uuidy[ (string) $uuid ] = true;
		}

		foreach ( array_keys( $uuidy ) as $uuid ) {
			/*
			 * `Throwable` per kurs — ten sam wzorzec co w
			 * `produkty_na_szkic()`. Jeden zepsuty kurs nie ma prawa
			 * zatrzymać całego przebiegu: przy aktywacji wtyczki zrobiłby
			 * to niewidzialnie (wyjątek ląduje w opcji), a reszta kursów
			 * zostałaby bez produktów.
			 */
			try {
				$w = self::synchronizuj_kurs( (string) $uuid );
			} catch ( Throwable $e ) {
				$suma['uwagi'][] = $uuid . ': synchronizacja przerwana — ' . $e->getMessage();
				continue;
			}
			foreach ( array( 'produkt_utworzony', 'zaktualizowany', 'bez_zmian', 'zdjety' ) as $k ) {
				$suma[ $k ] += $w[ $k ];
			}
			foreach ( $w['uwagi'] as $uwaga ) {
				$suma['uwagi'][] = $uuid . ': ' . $uwaga;
			}
		}
		return $suma;
	}

	/**
	 * Zapisuje na produkcie, ilu ludzi straciło dostęp razem z kursem.
	 *
	 * Wołane wyłącznie ze słuchacza usunięcia kursu, PO zdjęciu produktu —
	 * kolejność jest istotna, bo `zdejmij_kurs()` przywraca znaczniki
	 * produktu i nadpisałoby ten wpis, gdyby szedł wcześniej.
	 *
	 * @param string $course_uuid Uuid usuwanego kursu.
	 * @param int    $kupujacy    Ilu ludzi miało dostęp w chwili usunięcia.
	 */
	public static function oznacz_utracony_dostep( string $course_uuid, int $kupujacy ): void {
		if ( $kupujacy <= 0 ) {
			return;
		}
		$product_id = self::produkt_kursu( $course_uuid );
		if ( null === $product_id ) {
			return;
		}
		update_post_meta( $product_id, self::META_UTRACONY_DOSTEP, (string) $kupujacy );
	}

	/**
	 * Ilu ludzi straciło dostęp razem z kursem tego produktu (0 = nikt).
	 *
	 * @param int $product_id Id produktu.
	 */
	public static function utracony_dostep( int $product_id ): int {
		return (int) get_post_meta( $product_id, self::META_UTRACONY_DOSTEP, true );
	}

	/**
	 * Znaczniki, które KAŻDY zapis produktu potrafi zgubić.
	 *
	 * `_tutor_product` kasuje handler Tutora na `save_post_product`
	 * (czyta $_POST — masowa edycja, REST, `wc_scheduled_sales`, nasz
	 * własny `save()`; B13). `update_post_meta` z tą samą wartością
	 * niczego nie pisze, więc te trzy klucze są bezpieczne dla sha256.
	 *
	 * ZNACZNIKA CZASU TU NIE MA — i to jest treść, nie porządki. Metoda
	 * biegnie także z haka `save_post_product`, czyli po CUDZYM zapisie
	 * produktu; gdyby stawiała `sync_ts`, pole znaczyłoby „kiedy ktokolwiek
	 * zapisał produkt" zamiast „kiedy MY synchronizowaliśmy", a kontrola
	 * degradowałaby niekompletny stan do „w trakcie" po każdej cudzej
	 * edycji. Zmierzone przy przeglądzie P2. Znacznik czasu ma JEDNO
	 * miejsce w całym module — kolumnę `sync_ts` w tabeli `powiazania`
	 * (`powiazanie_ustaw()`); meta o tej nazwie nie istnieje, żeby nie
	 * było dwóch kopii tej samej prawdy.
	 *
	 * @param int    $product_id  Id produktu.
	 * @param string $course_uuid Uuid kursu.
	 */
	public static function ustaw_znaczniki_produktu( int $product_id, string $course_uuid ): void {
		update_post_meta( $product_id, '_tutor_product', 'yes' );
		update_post_meta( $product_id, '_virtual', 'yes' );
		update_post_meta( $product_id, '_aai_platnosci_kurs_uuid', $course_uuid );
	}


	/**
	 * Hak naprawczy dla CUDZYCH zapisów produktu (B13): po każdym
	 * `save_post_product` (priorytet > 10, czyli PO handlerze Tutora)
	 * produkt obecny w `powiazania` odzyskuje swoje znaczniki.
	 *
	 * @param int $post_id Id zapisanego wpisu produktu.
	 */
	public static function przywroc_znaczniki( int $post_id ): void {
		global $wpdb;
		$tabela = Aai_Platnosci_Tabele::tabela( 'powiazania' );
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- nazwa tabeli z klasy tabel.
		$uuid = $wpdb->get_var(
			$wpdb->prepare( "SELECT course_uuid FROM {$tabela} WHERE product_id = %d", $post_id )
		);
		if ( null !== $uuid ) {
			self::ustaw_znaczniki_produktu( $post_id, (string) $uuid );
		}
	}

	/**
	 * JAWNA naprawa ceny efektywnej (`_price`), gdy ktoś zapisał ją metą
	 * z pominięciem API Woo.
	 *
	 * DLACZEGO TAK, A NIE PROŚCIEJ. `_price` przelicza wyłącznie data
	 * store Woo i tylko przy REALNEJ zmianie `_regular_price`/`_sale_price`
	 * (zmierzone: `class-wc-product-data-store-cpt.php:856`). Trzeba więc
	 * przejść przez cenę tymczasową — a to znaczy, że przez moment produkt
	 * ma w bazie inną cenę niż ta ze strony sprzedażowej. Żeby w tym
	 * momencie NIKT nie mógł go kupić, produkt na czas naprawy schodzi na
	 * `draft` i wraca do poprzedniego statusu na końcu.
	 *
	 * Cena tymczasowa jest WYŻSZA od docelowej o grosz — nigdy niższa:
	 * Woo kasuje promocję, gdy cena promocyjna wyjdzie ≥ regularnej
	 * (`:857`), a promocji nie wolno nam dotknąć (niezmiennik 3).
	 *
	 * @param int    $product_id Id produktu.
	 * @param string $cena       Docelowa cena regularna (string z kropką).
	 * @return bool Czy naprawa doszła do skutku.
	 */
	public static function napraw_cene_efektywna( int $product_id, string $cena ): bool {
		$produkt = wc_get_product( $product_id );
		if ( ! $produkt ) {
			return false;
		}

		$status_przed = $produkt->get_status();
		if ( 'draft' !== $status_przed ) {
			$produkt->set_status( 'draft' );
			$produkt->save();
		}

		/*
		 * `finally` jest tu warunkiem poprawności, nie ostrożnością:
		 * bez niego wyjątek w środku (cudzy filtr na
		 * `woocommerce_before_product_object_save`, padnięta baza)
		 * zostawiłby produkt jako `draft` z ceną tymczasową NA STAŁE —
		 * czyli kurs zniknąłby ze sprzedaży po operacji, która miała go
		 * naprawić. Ta sama zasada co przy wstrzymaniu kopii w imporcie
		 * Pluginu 1.
		 */
		try {
			$tymczasowa = number_format( ( (float) $cena ) + 0.01, 2, '.', '' );
			$krok       = wc_get_product( $product_id );
			$krok->set_regular_price( $tymczasowa );
			$krok->save();

			$powrot = wc_get_product( $product_id );
			$powrot->set_regular_price( $cena );
			$powrot->save();
		} finally {
			$finalny = wc_get_product( $product_id );
			if ( $finalny && $finalny->get_regular_price( 'edit' ) !== $cena ) {
				// Cena tymczasowa nie ma prawa przeżyć tej metody.
				$finalny->set_regular_price( $cena );
				$finalny->save();
				$finalny = wc_get_product( $product_id );
			}
			if ( $finalny && 'draft' !== $status_przed && $finalny->get_status() !== $status_przed ) {
				$finalny->set_status( $status_przed );
				$finalny->save();
			}
		}

		/*
		 * Uuid bierzemy z TABELI, nie z pomocniczej mety: meta bywa pusta
		 * (produkt sprzed powiązania, cudza edycja), a pusta wartość
		 * wpisana z powrotem uruchamia fałszywy alarm o duplikacie uuid.
		 * Dopasowanie idzie wyłącznie przez `powiazania` (B4).
		 */
		global $wpdb;
		$tabela = Aai_Platnosci_Tabele::tabela( 'powiazania' );
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- nazwa tabeli z klasy tabel.
		$uuid = $wpdb->get_var(
			$wpdb->prepare( "SELECT course_uuid FROM {$tabela} WHERE product_id = %d", $product_id )
		);
		if ( null !== $uuid ) {
			self::ustaw_znaczniki_produktu( $product_id, (string) $uuid );
		}

		$sprawdzenie = wc_get_product( $product_id );
		$promocyjna  = (string) $sprawdzenie->get_sale_price( 'edit' );
		$oczekiwana  = '' === $promocyjna ? $cena : $promocyjna;
		return (string) $sprawdzenie->get_price( 'edit' ) === $oczekiwana;
	}

	/**
	 * Przestawia wszystkie produkty z `powiazania` na `draft` —
	 * deaktywacja wtyczki (L4). Kasowania nie ma: produkt kupiony jest
	 * częścią historii zamówień (niezmiennik 13); `draft` wystarcza,
	 * żeby `?add-to-cart` przestał działać.
	 *
	 * `Throwable` łapany per produkt: deaktywacja ma zejść do końca
	 * listy nawet wtedy, gdy jeden wpis jest uszkodzony — inaczej
	 * reszta produktów zostaje kupowalna bez jednego objawu.
	 */
	public static function produkty_na_szkic(): void {
		global $wpdb;
		$tabela = Aai_Platnosci_Tabele::tabela( 'powiazania' );

		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- nazwa tabeli z klasy tabel.
		$produkty = $wpdb->get_col( "SELECT product_id FROM {$tabela}" );

		$nieudane = array();
		foreach ( $produkty as $product_id ) {
			try {
				$wpis = get_post( (int) $product_id );
				if ( $wpis && 'product' === $wpis->post_type && 'draft' !== $wpis->post_status ) {
					// Wynik SPRAWDZAMY: `wp_update_post` oddaje 0 przy
					// porażce, a bramka P1 obiecuje, że po deaktywacji
					// żaden produkt kursu nie jest kupowalny — cicha
					// porażka zostawiałaby go w sprzedaży.
					$ok = wp_update_post(
						array(
							'ID'          => (int) $product_id,
							'post_status' => 'draft',
						)
					);
					if ( ! $ok ) {
						$nieudane[] = (int) $product_id;
					}
				}
			} catch ( Throwable $e ) {
				// Celowo bez ponownego rzucenia — patrz komentarz metody.
				$nieudane[] = (int) $product_id;
				continue;
			}
		}

		if ( array() !== $nieudane ) {
			Aai_Platnosci_Komunikaty::zapisz(
				sprintf(
					'przy wyłączaniu wtyczki NIE udało się zdjąć ze sprzedaży produktów: %s — są dalej kupowalne',
					implode( ', ', $nieudane )
				)
			);
		}
	}
}
