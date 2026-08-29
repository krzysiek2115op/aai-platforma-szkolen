<?php
/**
 * Ustawienia jako KOD (krok P3a) — sekcja 8 schematu.
 *
 * Trzy role są ROZDZIELONE (L11 z krytyki P0): USTAWIA aktywacja wtyczki
 * i `wp aai-platnosci sync --napraw` (metoda `napraw()`); KONTROLA
 * (`sprawdz`) tylko czyta — pyta `rozjazdy()`; FILTRY B17 bronią wartości
 * efektywnej między naprawami. Wartość w bazie jest po to, żeby ekran
 * ustawień Tutora pokazywał prawdę; filtr po to, żeby cudza zmiana
 * (ekran, deaktywacja Woo cofająca `monetize_by` na `free`) nie odcięła
 * klientom dostępu do kupionych kursów.
 *
 * SPRZEDAŻ JEST ZAMKNIĘTA DO P4 (rozstrzygnięcie 1 planu P3a): silnik
 * stoi na `wc`, ale filtr `woocommerce_add_to_cart_validation` odrzuca
 * produkty kursów, dopóki flagi otwarcia nie ustawi krok P4. Bez tego
 * między P3a a P4 istniałoby okno „klient płaci i nie dostaje nic" —
 * zakup technicznie działa, a dostarczanie (maile, dostawy) jeszcze nie
 * istnieje. Produkty ZOSTAJĄ `publish` — zejście na `draft` łamałoby
 * niezmiennik 9 i zapalało kontrolę.
 *
 * Filtr pokrywa cztery ścieżki KLIENTA (zmierzone w kodzie Woo 11.0.1,
 * KROK-P3A.md §3): form handler (`?add-to-cart=`), AJAX, Store API kasy
 * blokowej ORAZ wczytanie sesji koszyka — produkt włożony przed blokadą
 * wypada z koszyka przy następnym wczytaniu; ta ostatnia ścieżka obejmuje
 * też „zamów ponownie" (`populate_cart_from_order`).
 *
 * ŚWIADOMIE POZA ZASIĘGIEM: **REST Orders API** (`/wc/v3/orders` i v4)
 * tworzy zamówienie z pominięciem koszyka i tego filtra NIE woła (grep po
 * `rest-api/` i `src/Internal/RestApi/` — zero trafień). Wymaga klucza API
 * z prawem zapisu, czyli dostępu uprzywilejowanego; przed blokadą P3a
 * broni tam wyłącznie to, że zamówienie i tak nie dostarczy kursu
 * (dostarczanie powstaje w P4). Odnotowane w KROK-P3A.md jako przyjęte
 * ryzyko, żeby ten komentarz nie obiecywał szczelności, której nie ma.
 *
 * Blokada NIE otwiera okna klasy B2: `is_course_purchasable` Tutora przy
 * silniku `wc` czyta wyłącznie meta (`price_type` + `product_id`), nigdy
 * nie pyta produktu Woo o kupowalność (`WooCommerce.php:406-428`).
 *
 * @package Aai_Platnosci
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Wartości docelowe, filtry obronne i blokada sprzedaży.
 */
final class Aai_Platnosci_Ustawienia {

	/**
	 * Flaga otwarcia sprzedaży — opcja ORAZ nazwa filtra (wzór B17:
	 * `apply_filters` na nazwie klucza). Domyślnie ZAMKNIĘTE; otwiera
	 * dopiero krok P4, gdy dostarczanie (maile, dostawy) istnieje.
	 */
	public const OPCJA_SPRZEDAZ = 'aai_platnosci_sprzedaz_otwarta';

	/**
	 * Wartość opcji znacząca „otwarte". Wszystko inne = zamknięte.
	 */
	public const SPRZEDAZ_OTWARTA = 'tak';

	/**
	 * Docelowe wartości w tablicy `tutor_option` (sekcja 8 schematu).
	 * Przełączniki Tutora zapisują się jako 'on'/'off'.
	 */
	private const TUTOR_DOCELOWE = array(
		'monetize_by'                           => 'wc',
		'tutor_woocommerce_order_auto_complete' => 'on',
	);

	/**
	 * Docelowe wartości zwykłych opcji WooCommerce (sekcja 8 schematu).
	 *
	 * Para `guest_checkout=no` + `signup_and_login=yes` jest NIEROZŁĄCZNA
	 * (B1): samo wyłączenie gościa bez rejestracji z kasy daje 403
	 * `woocommerce_rest_guest_checkout_disabled` każdemu niezalogowanemu —
	 * nikt nie kupiłby niczego.
	 *
	 * Maila Woo `customer_new_account` tu NIE MA świadomie: zostaje
	 * włączony do kroku P4 — wyłączony wcześniej zostawiałby każde nowe
	 * konto bez żadnego linku do hasła (klasa K1), bo nasz mail 1 jeszcze
	 * nie istnieje.
	 */
	private const WOO_DOCELOWE = array(
		'woocommerce_enable_guest_checkout'                 => 'no',
		'woocommerce_enable_signup_and_login_from_checkout' => 'yes',
		'woocommerce_registration_generate_password'        => 'yes',
		/*
		 * Zasłona „Coming soon" Woo (domyślna na świeżej instalacji) —
		 * WYŁĄCZONA, z dwóch zmierzonych powodów (P3a): (1) jako blokada
		 * jest DZIURAWA — zasłania strony sklepu, ale Store API dalej
		 * przyjmuje produkty do koszyka (zmierzone: 201 mimo zasłony);
		 * właściwą blokadą jest nasza, na `add_to_cart_validation`;
		 * (2) podmienia strony koszyka i kasy na anglojęzyczną planszę
		 * w cudzych fontach (canvas szablonów blokowych zamiast motywu),
		 * czyli dokładnie to, przed czym broni etap 4 planu P3a.
		 */
		'woocommerce_coming_soon'                           => 'no',
	);

	/**
	 * Mail WooCommerce „nowe konto" — opcja tablicowa i nazwa jego filtra
	 * włączenia (`WC_Email::is_enabled()` robi
	 * `apply_filters( 'woocommerce_email_enabled_' . $this->id, … )`).
	 *
	 * WYŁĄCZAMY GO DOPIERO TERAZ, w kroku P4, i to jest istota rzeczy:
	 * do P3b był JEDYNYM linkiem do hasła, jaki dostawał nowy klient.
	 * Od P4 to samo zadanie robi nasz mail 1 — a dwa maile znaczyłyby dwa
	 * klucze resetu, z których każdy unieważnia poprzedni (B8): klient
	 * dostawałby dwie wiadomości i działałaby tylko ta druga.
	 */
	private const MAIL_WOO_OPCJA = 'woocommerce_customer_new_account_settings';
	private const MAIL_WOO_FILTR = 'woocommerce_email_enabled_customer_new_account';

	/**
	 * Polskie sluggi stron WooCommerce (rozstrzygnięcie 2 planu P3a):
	 * koszyk i kasa; `/my-account/` ZOSTAJE — mamy już `/szkolenia/moje/`
	 * i drugi podobny adres myliłby klienta. Odstępstwo od decyzji 6
	 * z 2026-08-26 przyjęte razem z planem P3a (2026-08-29).
	 */
	private const SLUGI_STRON = array(
		'woocommerce_cart_page_id'     => 'koszyk',
		'woocommerce_checkout_page_id' => 'kasa',
	);

	/**
	 * Klucze `tutor_option` wskazujące strony natywnej kasy Tutora.
	 * Przy silniku `wc` zostają jako PUSTE strony `publish` (zmierzone:
	 * 0 znaków treści) — schodzą na `draft` (rozstrzygnięcie 3: odwracalne,
	 * znika z witryny i indeksu, cudzych danych nie kasuje).
	 */
	private const STRONY_TUTORA = array( 'tutor_cart_page_id', 'tutor_checkout_page_id' );

	/**
	 * Bloki stron Woo, które mają mieć WŁASNY ciemny wariant kontrolek.
	 *
	 * `has-dark-controls` to opcja samych bloków Woo („Dark mode inputs"):
	 * ich arkusz przestawia wtedy pola, checkboxy i etykiety na ciemne.
	 * To jedyna wygrywalna droga (zmierzone przy P3a): style komponentów
	 * (`packages-style.css`, `checkout.css`) Woo drukuje W ŚRODKU BODY,
	 * przy renderze bloku — ZAWSZE po każdym arkuszu z `<head>`, więc
	 * przy równej specyficzności (`.wc-block-components-text-input
	 * input[type=text]` = 0,2,1) białe tła wygrywały z naszą integracją
	 * niezależnie od zależności enqueue. Zamiast wyścigu specyficzności
	 * włączamy ICH ciemny wariant — kanoniczną dźwignię bloku.
	 */
	private const KLASA_CIEMNYCH_POL = 'has-dark-controls';

	private const BLOKI_CIEMNYCH_POL = array(
		'woocommerce_cart_page_id'     => 'wp-block-woocommerce-cart',
		'woocommerce_checkout_page_id' => 'wp-block-woocommerce-checkout',
	);

	/**
	 * Rejestruje filtry obronne i blokadę sprzedaży.
	 *
	 * BEZWARUNKOWO i PRZY INCLUDE pliku wtyczki, nie na `plugins_loaded`:
	 * Tutor bootuje się na końcu własnego pliku (`$GLOBALS['tutor'] =
	 * tutor_lms();`), a jego konstruktor OD RAZU czyta `monetize_by`
	 * i tylko przy `wc` rejestruje całą integrację z WooCommerce. Filtr
	 * zarejestrowany na `plugins_loaded` przychodziłby PO tym odczycie
	 * i niczego by nie bronił. Działa, bo `aai-platnosci` stoi w
	 * `active_plugins` przed `tutor` — a gdyby kolejność kiedyś się
	 * odwróciła, kontrola i tak łapie rozjazd bazy z filtrem (kod 1).
	 * Warunki żyją WEWNĄTRZ callbacków (lekcja B18).
	 */
	public static function zarejestruj(): void {
		foreach ( array_keys( self::TUTOR_DOCELOWE ) as $klucz ) {
			add_filter( $klucz, array( self::class, 'wymus_wartosc_tutora' ) );
		}
		add_filter( 'woocommerce_add_to_cart_validation', array( self::class, 'blokada_sprzedazy' ), 10, 2 );
		/*
		 * Filtr obronny B17 dla maila „nowe konto": wartość w bazie
		 * ustawia `napraw()`, ale ekran ustawień WooCommerce cofa ją
		 * jednym kliknięciem. Rozjazd i tak zobaczy kontrola — ten filtr
		 * pilnuje, żeby w międzyczasie klient nie dostał dwóch linków
		 * do hasła, z których działa tylko jeden.
		 */
		add_filter( self::MAIL_WOO_FILTR, '__return_false' );
	}

	/**
	 * Filtr B17: wartość efektywna klucza Tutora.
	 *
	 * `Utils::get_option()` robi `apply_filters( $key, $value )`, więc
	 * nazwą filtra jest nazwa klucza — `current_filter()` mówi, o który
	 * pytają. Wymuszamy TYLKO przy działającym WooCommerce: po deaktywacji
	 * Woo wymuszony `wc` kazałby Tutorowi rejestrować integrację na
	 * nieistniejących klasach.
	 *
	 * @param mixed $wartosc Wartość z bazy.
	 * @return mixed
	 */
	public static function wymus_wartosc_tutora( $wartosc ) {
		if ( ! self::woo_bedzie_dostepne() ) {
			// Bez Woo wymuszony `wc` kazałby Tutorowi wiązać integrację
			// z nieistniejącymi klasami.
			return $wartosc;
		}
		return self::TUTOR_DOCELOWE[ current_filter() ] ?? $wartosc;
	}

	/**
	 * Czy WooCommerce będzie dostępne w tym żądaniu.
	 *
	 * `class_exists` nie wystarcza: w chwili odczytu `monetize_by` przez
	 * konstruktor Tutora plik Woo NIE jest jeszcze wczytany (ładuje się
	 * po Tutorze), więc pytamy też listę aktywnych wtyczek.
	 */
	private static function woo_bedzie_dostepne(): bool {
		if ( class_exists( 'WooCommerce' ) ) {
			return true;
		}
		return in_array( 'woocommerce/woocommerce.php', (array) get_option( 'active_plugins', array() ), true );
	}

	/**
	 * Czy sprzedaż jest otwarta (P4 ustawia flagę, gdy dostarczanie działa).
	 */
	public static function sprzedaz_otwarta(): bool {
		$wartosc = apply_filters( self::OPCJA_SPRZEDAZ, get_option( self::OPCJA_SPRZEDAZ, '' ) );
		return self::SPRZEDAZ_OTWARTA === $wartosc;
	}

	/**
	 * Blokada sprzedaży: produkt kursu nie wchodzi do koszyka przed P4.
	 *
	 * @param bool $przeszlo   Wynik wcześniejszych walidacji.
	 * @param int  $product_id Id produktu.
	 */
	public static function blokada_sprzedazy( $przeszlo, $product_id ): bool {
		if ( true !== $przeszlo ) {
			// Cudzą odmowę zostawiamy w spokoju — filtr nigdy nie ZDEJMUJE
			// odmowy, może najwyżej dołożyć własną.
			return false;
		}
		if ( self::sprzedaz_otwarta() ) {
			return true;
		}
		if ( ! Aai_Platnosci_Zapis::czy_produkt_kursu( (int) $product_id ) ) {
			// Nie nasz produkt — blokada dotyczy WYŁĄCZNIE kursów.
			return true;
		}
		if ( function_exists( 'wc_add_notice' ) ) {
			wc_add_notice(
				__( 'Sprzedaż kursów jeszcze nie ruszyła — przycisk zakupu pojawi się na stronie kursu, gdy wystartujemy.', 'aai-platnosci' ),
				'error'
			);
		}
		return false;
	}

	/**
	 * Doprowadza ustawienia do wartości docelowych (ścieżka USTAWIANIA).
	 *
	 * Idempotentna: pisze wyłącznie to, co się różni, i wypisuje każdą
	 * zmianę. Woła ją aktywacja wtyczki i `sync --napraw` — nigdy kontrola.
	 *
	 * @return string[] Opisy wykonanych zmian (pusta lista = nic do roboty).
	 */
	public static function napraw(): array {
		$zmiany = array();

		if ( Aai_Platnosci_Zaleznosci::jest_tutor() ) {
			$opcje   = (array) get_option( 'tutor_option', array() );
			$zapisac = false;
			foreach ( self::TUTOR_DOCELOWE as $klucz => $docelowa ) {
				$obecna = (string) ( $opcje[ $klucz ] ?? '' );
				if ( $obecna !== $docelowa ) {
					$zmiany[]        = sprintf( 'tutor_option[%s]: „%s" → „%s"', $klucz, '' === $obecna ? '(brak)' : $obecna, $docelowa );
					$opcje[ $klucz ] = $docelowa;
					$zapisac         = true;
				}
			}
			if ( $zapisac ) {
				update_option( 'tutor_option', $opcje );
			}

			foreach ( self::STRONY_TUTORA as $klucz ) {
				$id = (int) ( $opcje[ $klucz ] ?? 0 );
				if ( Aai_Platnosci_Zapis::strona_na_szkic( $id ) ) {
					$zmiany[] = sprintf( 'strona natywnej kasy Tutora %d (%s) → draft', $id, $klucz );
				}
			}
		}

		foreach ( self::WOO_DOCELOWE as $klucz => $docelowa ) {
			if ( (string) get_option( $klucz, '' ) !== $docelowa ) {
				$zmiany[] = sprintf( '%s: „%s" → „%s"', $klucz, (string) get_option( $klucz, '(brak)' ), $docelowa );
				update_option( $klucz, $docelowa );
			}
		}

		if ( self::ustaw_mail_woo( 'no' ) ) {
			$zmiany[] = 'mail WooCommerce „nowe konto": włączony → wyłączony (od P4 link do hasła niesie nasz mail 1)';
		}

		foreach ( self::BLOKI_CIEMNYCH_POL as $klucz => $klasa_bloku ) {
			$id = (int) get_option( $klucz, 0 );
			if ( Aai_Platnosci_Zapis::dopisz_klase_bloku( $id, $klasa_bloku, self::KLASA_CIEMNYCH_POL ) ) {
				$zmiany[] = sprintf( 'strona %d: blok %s dostał %s (ciemne pola formularza z arkusza samego Woo)', $id, $klasa_bloku, self::KLASA_CIEMNYCH_POL );
			}
		}

		foreach ( self::SLUGI_STRON as $klucz => $slug ) {
			$id = (int) get_option( $klucz, 0 );
			if ( $id <= 0 || null === get_post( $id ) ) {
				$zmiany[] = sprintf( '%s: strona nie istnieje — sluga „%s" nie ma gdzie ustawić', $klucz, $slug );
				continue;
			}
			$obecny = (string) get_post_field( 'post_name', $id );
			if ( Aai_Platnosci_Zapis::ustaw_slug_strony( $id, $slug ) ) {
				// ZMIERZONE przy P3a: `wp_old_slug_redirect` nie obejmuje
				// stron — stary adres oddaje 404, nie 301. To jest w porządku
				// (nikt go nie znał — rozstrzygnięcie 2 planu), ale komunikat
				// ma mówić prawdę z pomiaru, nie z dokumentacji.
				$zmiany[] = sprintf( 'slug strony %d: „%s" → „/%s/" (stary adres oddaje odtąd 404)', $id, $obecny, $slug );
			}
		}

		return $zmiany;
	}

	/**
	 * Rozjazdy ustawień — dla kontroli, która NIGDY nie pisze (L11).
	 *
	 * Wywoływana tylko przy działającym otoczeniu (kontrola wcześniej
	 * wychodzi na brakujących zależnościach). Rozjazd wartości = kod 1;
	 * jedyną naprawą jest `sync --napraw` — kontrola o tym MÓWI.
	 *
	 * @return string[] Opisy rozjazdów (pusta lista = porządek).
	 */
	public static function rozjazdy(): array {
		$r = array();

		$opcje = (array) get_option( 'tutor_option', array() );
		foreach ( self::TUTOR_DOCELOWE as $klucz => $docelowa ) {
			$w_bazie    = (string) ( $opcje[ $klucz ] ?? '' );
			$efektywna  = function_exists( 'tutor_utils' ) ? (string) tutor_utils()->get_option( $klucz ) : $w_bazie;
			$naprawa    = ' Napraw: wp aai-platnosci sync --napraw';
			if ( $efektywna !== $docelowa ) {
				// Filtr nie obronił wartości — przy 'monetize_by' to jest
				// dokładnie stan SZEW ROZBROJONY (C5): integracja Tutora
				// z Woo w całości wyłączona, zakup nie zapisze klienta.
				$r[] = sprintf(
					'%stutor_option[%s] = „%s" zamiast „%s".%s',
					'monetize_by' === $klucz ? 'SZEW ROZBROJONY: ' : '',
					$klucz,
					'' === $efektywna ? '(brak)' : $efektywna,
					$docelowa,
					$naprawa
				);
			} elseif ( $w_bazie !== $docelowa ) {
				// B17: filtr broni wartości efektywnej, ale ekran ustawień
				// Tutora czyta bazę i pokazuje nieprawdę. Mówimy, nie piszemy.
				$r[] = sprintf(
					'tutor_option[%s]: baza mówi „%s", filtr wymusza „%s" — ekran Tutora pokazuje nieprawdę.%s',
					$klucz,
					'' === $w_bazie ? '(brak)' : $w_bazie,
					$docelowa,
					$naprawa
				);
			}
		}

		foreach ( self::WOO_DOCELOWE as $klucz => $docelowa ) {
			$obecna = (string) get_option( $klucz, '' );
			if ( $obecna !== $docelowa ) {
				$dopisek = 'woocommerce_enable_signup_and_login_from_checkout' === $klucz
					? ' — bez tego kasa oddaje 403 każdemu niezalogowanemu (B1)'
					: '';
				$r[]     = sprintf( '%s = „%s" zamiast „%s"%s. Napraw: wp aai-platnosci sync --napraw', $klucz, '' === $obecna ? '(brak)' : $obecna, $docelowa, $dopisek );
			}
		}

		foreach ( self::SLUGI_STRON as $klucz => $slug ) {
			$id = (int) get_option( $klucz, 0 );
			if ( $id <= 0 || null === get_post( $id ) ) {
				$r[] = sprintf( '%s nie wskazuje istniejącej strony — koszyk/kasa nie mają adresu', $klucz );
				continue;
			}
			$obecny = (string) get_post_field( 'post_name', $id );
			if ( $obecny !== $slug ) {
				$r[] = sprintf( 'strona %d ma slug „%s" zamiast „%s". Napraw: wp aai-platnosci sync --napraw', $id, $obecny, $slug );
			}
		}

		foreach ( self::STRONY_TUTORA as $klucz ) {
			$id = (int) ( $opcje[ $klucz ] ?? 0 );
			if ( $id > 0 && 'publish' === get_post_status( $id ) ) {
				$r[] = sprintf( 'pusta strona natywnej kasy Tutora %d (%s) jest opublikowana — ma być draft. Napraw: wp aai-platnosci sync --napraw', $id, $klucz );
			}
		}

		/*
		 * PODATKI. Cena pokazywana na stronie (P3b) idzie z
		 * `WC_Product::get_price()`, czyli BEZ doliczonego VAT-u. Dopóki
		 * podatki są wyłączone, cena na stronie równa się cenie w kasie —
		 * i to jest cała obietnica tego kroku (K2). Włączenie naliczania
		 * podatku bez przeliczenia ceny efektywnej rozjeżdża tę parę w sposób,
		 * którego nie widać na żadnym ekranie: strona pokaże kwotę netto,
		 * a kasa doliczy VAT. VAT jest świadomie odłożony (DIAGRAM.md,
		 * sekcja 16) — ten wiersz pilnuje, żeby jego włączenie nie przeszło
		 * w milczeniu.
		 */
		if ( 'yes' === (string) get_option( 'woocommerce_calc_taxes', 'no' ) ) {
			$r[] = 'woocommerce_calc_taxes = „yes", a cena na stronie idzie z get_price() BEZ podatku — kasa doliczyłaby VAT do kwoty, którą klient widział w katalogu (K2). Do czasu przeliczenia ceny efektywnej pod podatek: wyłącz naliczanie albo zmień źródło ceny w Aai_Platnosci_Cena.';
		}

		foreach ( self::BLOKI_CIEMNYCH_POL as $klucz => $klasa_bloku ) {
			$id   = (int) get_option( $klucz, 0 );
			$tekst = $id > 0 ? (string) get_post_field( 'post_content', $id ) : '';
			if ( str_contains( $tekst, $klasa_bloku ) && ! str_contains( $tekst, self::KLASA_CIEMNYCH_POL ) ) {
				$r[] = sprintf( 'blok %s na stronie %d bez klasy %s — formularz kasy będzie miał białe pola na ciemnym motywie. Napraw: wp aai-platnosci sync --napraw', $klasa_bloku, $id, self::KLASA_CIEMNYCH_POL );
			}
			/*
			 * Kontrola DANYCH, nie kodu: nazwa klasy zagnieżdżonego bloku
			 * rozbita naszą klasą (`…-cart has-dark-controls-items-block`
			 * zamiast `…-cart-items-block`). Tak wyglądało uszkodzenie
			 * z pierwszej wersji `dopisz_klase_bloku()` — cicho, bo blok
			 * Woo zwraca zapisaną treść bez regeneracji. `--napraw` tego
			 * NIE cofa (nie zgadujemy cudzej treści): trzeba przywrócić
			 * stronę Woo albo poprawić treść ręcznie.
			 */
			$uszkodzone = preg_match_all( '~' . preg_quote( self::KLASA_CIEMNYCH_POL, '~' ) . '-\w~', $tekst );
			if ( $uszkodzone > 0 ) {
				$r[] = sprintf( 'strona %d ma %d ROZBITYCH nazw klas bloków (%s-…) — treść uszkodzona, bloki zagnieżdżone stracily swoje klasy; przywróć treść strony Woo i uruchom sync --napraw', $id, $uszkodzone, self::KLASA_CIEMNYCH_POL );
			}
		}

		if ( 'no' !== self::stan_mail_woo() ) {
			$r[] = 'mail WooCommerce „nowe konto" jest WŁĄCZONY, a od P4 link do hasła wysyła nasz mail 1 — klient dostanie dwie wiadomości i zadziała tylko druga, bo każdy nowy klucz resetu unieważnia poprzedni (B8). Napraw: wp aai-platnosci sync --napraw';
		}

		/*
		 * Sprzedaż otwarta bez ANI JEDNEJ włączonej bramki płatności.
		 * ZMIERZONE przy E0 kroku P4: kasa oddaje wtedy 400
		 * `woocommerce_rest_checkout_payment_method_disabled`, czyli
		 * „sprzedaż otwarta" znaczy „nikt nie kupi niczego" — a na
		 * stronie kursu przycisk dalej zaprasza do kasy. Kontrola tylko
		 * MÓWI: bramkę wybiera właściciel, wtyczka nie ma prawa włączać
		 * komuś przelewu bankowego.
		 */
		if ( self::sprzedaz_otwarta() && function_exists( 'WC' ) && WC()->payment_gateways ) {
			$wlaczone = 0;
			foreach ( WC()->payment_gateways->payment_gateways() as $bramka ) {
				if ( 'yes' === $bramka->enabled ) {
					++$wlaczone;
				}
			}
			if ( 0 === $wlaczone ) {
				$r[] = 'sprzedaż jest OTWARTA, a w WooCommerce nie ma ani jednej włączonej bramki płatności — przycisk prowadzi do kasy, a kasa odmawia (400). Włącz bramkę w WooCommerce → Ustawienia → Płatności.';
			}
		}

		/*
		 * Asercja DANYCH z B12: opcja `enable_guest_course_cart` niczego
		 * nie chroni (gościnna gałąź zapisu Tutora pyta wyłącznie o brak
		 * `customer_id` i sesję), więc pilnujemy skutku — żaden wpis kursu
		 * nie ma `_tutor_wc_guest_customer_id`.
		 */
		global $wpdb;
		$goscinne = (int) $wpdb->get_var(
			"SELECT COUNT(*) FROM {$wpdb->postmeta} pm
			JOIN {$wpdb->posts} p ON p.ID = pm.post_id AND p.post_type = 'courses'
			WHERE pm.meta_key = '_tutor_wc_guest_customer_id'"
		);
		if ( $goscinne > 0 ) {
			$r[] = sprintf( '%d wpis(ów) kursu z _tutor_wc_guest_customer_id — gościnna gałąź zapisu Tutora ZADZIAŁAŁA, a miała nie mieć prawa (B12)', $goscinne );
		}

		return $r;
	}

	/**
	 * Wartość `enabled` maila WooCommerce „nowe konto" — z BAZY, bez
	 * naszego filtra. Kontrola ma widzieć, co zobaczy ekran ustawień.
	 */
	private static function stan_mail_woo(): string {
		$u = (array) get_option( self::MAIL_WOO_OPCJA, array() );
		// Brak wiersza ustawień znaczy „domyślnie włączony" — zmierzone
		// na świeżej instalacji: WooCommerce wysyła ten mail, choć opcji
		// w bazie nie ma wcale.
		return (string) ( $u['enabled'] ?? 'yes' );
	}

	/**
	 * Ustawia `enabled` maila WooCommerce „nowe konto".
	 *
	 * @param string $wartosc 'yes' albo 'no'.
	 * @return bool Czy coś się zmieniło.
	 */
	private static function ustaw_mail_woo( string $wartosc ): bool {
		if ( self::stan_mail_woo() === $wartosc ) {
			return false;
		}
		$u            = (array) get_option( self::MAIL_WOO_OPCJA, array() );
		$u['enabled'] = $wartosc;
		update_option( self::MAIL_WOO_OPCJA, $u );
		return true;
	}

	/**
	 * Przywraca mail WooCommerce „nowe konto" — woła to DEAKTYWACJA.
	 * Nasz mail 1 znika razem z wtyczką, a konto bez żadnego linku do
	 * hasła to klasa K1 (DIAGRAM.md, sekcja 14).
	 */
	public static function przywroc_mail_woo(): bool {
		return self::ustaw_mail_woo( 'yes' );
	}

	/**
	 * Stan sprzedaży dla kontroli — nazwany, nie przemilczany.
	 */
	public static function stan_sprzedazy(): string {
		return self::sprzedaz_otwarta()
			? 'SPRZEDAŻ OTWARTA — blokada koszyka zdjęta (stan docelowy od P4).'
			: 'SPRZEDAŻ ZAMKNIĘTA (do P4) — produkty kursów nie wchodzą do koszyka; to stan projektowany kroku P3a.';
	}
}
