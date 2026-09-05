<?php
/**
 * Dwa maile dostarczenia — konto i dostęp do kursu (krok P4).
 *
 * DLACZEGO DWA, A NIE JEDEN (K1 z krytyki P0). Konto powstaje przy
 * SKŁADANIU zamówienia, a dostęp dopiero po opłacie. Mail z linkiem do
 * hasła zawieszony na `completed` zostawiałby bez ani jednej wiadomości
 * każde zamówienie, które tam nie doszło — nieudaną płatność, porzuconą
 * kasę, a przede wszystkim przelew (`bacs`), który stoi na `on-hold`
 * dwa dni. Klient miałby konto, do którego nie ma jak wejść.
 *
 * | | MAIL 1 „Ustaw hasło i wejdź" | MAIL 2 „Twój kurs jest gotowy" |
 * |---|---|---|
 * | zdarzenie | `woocommerce_created_customer` | `tutor_after_enrolled` |
 * | znacznik | wiersz `dostawy` na UŻYTKOWNIKA | wiersz `dostawy` na ZAMÓWIENIE |
 * | niesie | klucz resetu + termin ważności + zapasowy odnośnik | nazwy kursów + przycisk do „Moich kursów" |
 * | hasło w treści | NIGDY (niezmiennik 8) | NIGDY |
 *
 * ZNACZNIK JEST ATOMOWY: `INSERT` z UNIQUE `(zdarzenie, identyfikator)`
 * w tabeli `dostawy` — wygrywa jeden, przegrany nie wysyła. Tak, a nie
 * przez sprawdzenie „czy już wysłano", bo cudzy hak potrafi pobiec
 * rekurencyjnie: `mark_order_complete()` Tutora woła zmianę statusu
 * WEWNĄTRZ obsługi zmiany statusu (B6), a `wp_wc_orders_meta` nie ma
 * UNIQUE, więc znacznik musi mieszkać u nas.
 *
 * WYSYŁKA IDZIE NA `shutdown`, ZNACZNIK NIE. Powody, oba zmierzone:
 *  1. mail 2 składa treść z POZYCJI ZAMÓWIENIA, a `tutor_after_enrolled`
 *     leci osobno dla każdego kursu, w środku pętli po zapisach — przy
 *     zamówieniu na dwa kursy pierwszy hak zastałby drugi zapis jeszcze
 *     nieukończony;
 *  2. haki statusu biegną W ŚRODKU cudzego przejścia (zmierzone przy
 *     P3b na notatkach zamówienia 298–301: nasze działanie wykonane od
 *     razu odwracało kolejność maili WooCommerce).
 * Cena: wysyłka dzieje się na końcu tego samego żądania, więc powolny
 * SMTP dalej opóźnia odpowiedź — chroni przed tym wyłącznie krótki
 * timeout po stronie konfiguracji poczty, nie nasz kod.
 *
 * @package Aai_Platnosci
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Składanie i wysyłka obu maili dostarczenia.
 */
final class Aai_Platnosci_Maile {

	/**
	 * Zdarzenia w tabeli `dostawy`. `dostep` nie jest mailem — to zapis
	 * faktu, że klient DOSTAŁ to, za co zapłacił; po nim kontrola poznaje
	 * opłacone zamówienie bez dostarczenia.
	 */
	public const ZDARZENIE_KONTO  = 'mail_konta';
	public const ZDARZENIE_KURS   = 'mail_kursu';
	public const ZDARZENIE_DOSTEP = 'dostep';

	/**
	 * Jedyna wartość `wynik` znacząca „poszło". Wszystko inne — także
	 * PUSTA wartość — jest dla kontroli problemem: pusta znaczy
	 * „znacznik jest, wysyłki nikt nie potwierdził", czyli żądanie padło
	 * między jednym a drugim.
	 */
	public const WYNIK_OK = 'wyslano';

	/**
	 * Wynik „mail 1 świadomie nie wyszedł" (decyzja właściciela 2026-08-30).
	 *
	 * Przy płatności natychmiastowej (bramka domyka zamówienie w TYM SAMYM
	 * żądaniu, w którym kasa założyła konto) klient dostawał dwie wiadomości
	 * w tej samej sekundzie, a pierwsza kazała mu „wejść na konto", na
	 * którym właśnie siedział — kasa loguje po zakupie na 14 dni
	 * (`wc_set_customer_auth_cookie()`). Mail o kursie niesie odnośnik do
	 * ustawienia hasła, więc pierwszy jest wtedy zbędny.
	 *
	 * Przy przelewie (`bacs`) nic się nie zmienia: konto i opłata to dwa
	 * żądania w odstępie dni, mail 1 idzie jak szedł — wymaganie K1 stoi.
	 */
	public const WYNIK_POMINIETY = 'pominięto: opłacone od razu — link do hasła jedzie w mailu o kursie';

	/**
	 * Przedrostek wyniku zamkniętego RĘCZNIE przez człowieka.
	 *
	 * PO CO TO ISTNIEJE. Kontrola melduje kodem 1 każdą dostawę, która nie
	 * doszła do skutku, i podaje komendę naprawy: `dostawy --ponow=…`. Są
	 * jednak wpisy, których ponowić NIE DA SIĘ NIGDY — zmierzone na żywej
	 * instalacji:
	 *   · `dostep/<id>` z pustym wynikiem: `ponow()` odpowiada „zdarzenie
	 *     »dostep« nie jest mailem — nie ma czego ponawiać";
	 *   · `mail_konta/<id>` konta, którego już nie ma: „konto <id> już nie
	 *     istnieje".
	 * Kontrola świeciła wtedy na czerwono NA ZAWSZE, każąc uruchamiać
	 * komendę, która nie mogła pomóc. A `wp aai-platnosci sprawdz` jest
	 * punktem kontrolnym `postaw.sh`, czyli KROKU ZEROWEGO każdego testu
	 * ręcznego — jeden taki wiersz blokował stawianie środowiska.
	 *
	 * Zamknięcie ręczne NIE JEST ukryciem błędu: wiersz zostaje w dzienniku,
	 * niesie datę i POWÓD podany przez człowieka, a powodu nie da się
	 * pominąć. To zapis decyzji („sprawdziłem, klient dostał dostęp inną
	 * drogą"), a nie kasowanie śladu.
	 */
	public const WYNIK_ZAMKNIETY = 'zamknięte ręcznie: ';

	/**
	 * Czy wynik znaczy „człowiek to rozstrzygnął i opisał".
	 *
	 * @param string $wynik Zapisany rezultat.
	 */
	public static function zamkniety_recznie( string $wynik ): bool {
		return str_starts_with( $wynik, self::WYNIK_ZAMKNIETY );
	}

	/**
	 * Wiadomości zgłoszone do wysłania na końcu żądania.
	 *
	 * @var array<string,callable>
	 */
	private static $kolejka = array();

	/**
	 * Podpina oba zdarzenia.
	 *
	 * Rejestracja bezwarunkowa, warunki wewnątrz callbacków — ta sama
	 * zasada co przy filtrach B17 i przy dostarczaniu z P3b.
	 */
	public static function zarejestruj(): void {
		add_action( 'woocommerce_created_customer', array( self::class, 'na_koncie' ), 10, 3 );
		add_action( 'tutor_after_enrolled', array( self::class, 'na_dostepie' ), 10, 3 );
		/*
		 * JEDEN NADAWCA (BLAD-025, decyzja właściciela 2026-08-29).
		 * Priorytet 1, czyli PRZED czymkolwiek innym: to jest naprawa
		 * wartości DOMYŚLNEJ, a nie zdanie w cudzej sprawie — kto ustawi
		 * nadawcę świadomie (Woo, wtyczka SMTP, filtr o wyższym
		 * priorytecie), ten wygrywa z nami.
		 */
		add_filter( 'wp_mail_from', array( self::class, 'nadawca_adres' ), 1 );
		add_filter( 'wp_mail_from_name', array( self::class, 'nadawca_nazwa' ), 1 );
		/*
		 * CISZA O CUDZYCH HASŁACH (decyzja właściciela 2026-08-30). Rdzeń
		 * zawiadamia ADMINISTRATORA o każdej zmianie hasła
		 * (`wp_password_change_notification`, pluggable.php:2179 — KLIENT
		 * nie dostaje z tej funkcji nic, zmierzone przy P4). Przy sprzedaży
		 * to jeden mail na każdego klienta, który ustawi hasło z naszego
		 * linku — szum zagłuszający prawdziwe powiadomienia sklepu.
		 *
		 * Zdejmujemy CALLBACK z haka zamiast podmieniać funkcję pluggable:
		 * dwie wtyczki definiujące tę samą pluggable to fatal, a zdjęcie
		 * callbacku znika razem z deaktywacją wtyczki. Hak wisi od
		 * `default-filters.php`, ładowanego PRZED wtyczkami, więc w chwili
		 * rejestracji już istnieje. Mail DO KLIENTA z linkiem „ustaw nowe
		 * hasło" to inny mechanizm (`retrieve_password()`) — nietknięty.
		 */
		remove_action( 'after_password_reset', 'wp_password_change_notification' );
	}

	/**
	 * Adres nadawcy: naprawiamy WYŁĄCZNIE domyślny `wordpress@<host>`.
	 *
	 * BLAD-025 ze zgłoszenia właściciela. Po zakupie w tej samej skrzynce
	 * lądowały wiadomości z DWÓCH światów: nasze i WooCommerce z adresu
	 * sklepu, a powiadomienia rdzenia WordPressa z `wordpress@127.0.0.1`.
	 * Na produkcji taki nadawca nie przechodzi SPF-u i trafia do spamu
	 * albo zostaje odrzucony — czyli właściciel przestaje dostawać
	 * powiadomienia, o których nawet nie wie, że mu uciekają.
	 *
	 * ZMIERZONE w `wp_mail()`: gdy nikt nie ustawi nadawcy, WordPress
	 * skleja `'wordpress@' . host`. Rozpoznajemy dokładnie ten kształt
	 * i tylko jego — adresu, który ktoś ustawił świadomie, NIE ruszamy.
	 * To jest różnica między naprawą domyślnej wartości a przejmowaniem
	 * cudzej poczty.
	 *
	 * @param string|mixed $adres Adres nadawcy proponowany przez WordPressa.
	 * @return string
	 */
	public static function nadawca_adres( $adres ): string {
		$adres = (string) $adres;
		try {
			$host      = (string) wp_parse_url( network_home_url(), PHP_URL_HOST );
			$domyslny  = '' === $host ? '' : 'wordpress@' . $host;
			if ( '' === $domyslny || $adres !== $domyslny ) {
				return $adres;
			}
			// Kolejność źródeł: adres sklepu (tam właściciel go ustawia),
			// potem adres administratora. Oba mogą być puste na świeżej
			// instalacji — wtedy zostawiamy WordPressowi jego wartość,
			// bo pusty nadawca wywala wysyłkę w całości.
			foreach ( array( (string) get_option( 'woocommerce_email_from_address', '' ), (string) get_option( 'admin_email', '' ) ) as $kandydat ) {
				if ( '' !== $kandydat && is_email( $kandydat ) ) {
					return $kandydat;
				}
			}
			return $adres;
		} catch ( Throwable $e ) {
			// Poczta jest ważniejsza od kosmetyki nadawcy.
			return $adres;
		}
	}

	/**
	 * Nazwa nadawcy: to samo co przy adresie, dla domyślnego „WordPress".
	 *
	 * @param string|mixed $nazwa Nazwa proponowana przez WordPressa.
	 * @return string
	 */
	public static function nadawca_nazwa( $nazwa ): string {
		$nazwa = (string) $nazwa;
		if ( 'WordPress' !== $nazwa ) {
			return $nazwa;
		}
		try {
			foreach ( array( (string) get_option( 'woocommerce_email_from_name', '' ), (string) get_option( 'blogname', '' ) ) as $kandydat ) {
				$kandydat = trim( wp_specialchars_decode( $kandydat, ENT_QUOTES ) );
				if ( '' !== $kandydat ) {
					return $kandydat;
				}
			}
			return $nazwa;
		} catch ( Throwable $e ) {
			return $nazwa;
		}
	}

	/**
	 * Powstało konto klienta — mail 1.
	 *
	 * ZMIERZONE przy E0: kasa blokowa zakłada konto sama (bez checkboksa,
	 * przy `guest_checkout=no` + `signup_and_login=yes`), hak leci RAZ
	 * i PRZED powstaniem zamówienia — dlatego mail 1 nie wie i nie może
	 * wiedzieć, co klient kupił. Kurs nazywa mail 2.
	 *
	 * Trzeci argument WooCommerce nazywa w docbloku „The generated
	 * password", ale zmierzona wartość to `bool` (długość 1). Nie
	 * używamy go do niczego poza tym komentarzem — hasła w mailu nie ma
	 * nigdy (niezmiennik 8).
	 *
	 * @param int   $user_id            Id nowego użytkownika.
	 * @param array $dane               Dane rejestracji (nieużywane).
	 * @param mixed $haslo_wygenerowane Czy Woo wygenerowało hasło (bool).
	 */
	public static function na_koncie( $user_id, $dane = array(), $haslo_wygenerowane = false ): void {
		unset( $dane, $haslo_wygenerowane );
		try {
			$id = (int) $user_id;
			if ( $id <= 0 || false === get_userdata( $id ) ) {
				return;
			}
			if ( ! Aai_Platnosci_Zapis::dostawa_odnotuj( self::ZDARZENIE_KONTO, $id ) ) {
				// Ktoś już odnotował to konto — drugi mail z kluczem
				// resetu unieważniłby pierwszy link (B8).
				return;
			}
			self::na_koniec_zadania(
				'konto-' . $id,
				static function () use ( $id ): void {
					self::dostarcz_konto( $id );
				}
			);
		} catch ( Throwable $e ) {
			// Wyjątek poleciałby przez `wc_create_new_customer()` w środku
			// kasy: konto już istnieje, a klient dostaje 500 zamiast
			// zamówienia. Awaria maila nie ma prawa wywrócić zakupu.
			Aai_Platnosci_Komunikaty::zapisz( 'przy mailu o koncie (' . (int) $user_id . '): ' . $e->getMessage() );
		}
	}

	/**
	 * Dostęp do kursu przyznany — mail 2 i zapis faktu dostarczenia.
	 *
	 * @param mixed $kurs_id  Id kursu w Tutorze (nieużywane — treść składamy z zamówienia).
	 * @param mixed $user_id  Id kursanta (nieużywane — adresata bierzemy z zamówienia).
	 * @param mixed $zapis_id Id wpisu `tutor_enrolled`.
	 */
	public static function na_dostepie( $kurs_id, $user_id, $zapis_id ): void {
		unset( $kurs_id, $user_id );
		try {
			$zapis = (int) $zapis_id;
			$order_id = (int) get_post_meta( $zapis, '_tutor_enrolled_by_order_id', true );
			if ( $order_id <= 0 ) {
				// Zapis spoza zakupu (ręczny, `wp:klient`, kurs darmowy) —
				// nie jest dostawą, więc nie ma czego dostarczać ani
				// odnotowywać. Cisza jest tu poprawną odpowiedzią.
				return;
			}
			/*
			 * Status zapisu CZYTAMY Z BAZY. `get_post_status()` w tym
			 * żądaniu kłamie — Tutor pisze status surowym `$wpdb->update`
			 * bez czyszczenia cache'u (zmierzone przy E0: hak meldował
			 * `pending`, baza miała `completed`).
			 */
			if ( 'completed' !== Aai_Platnosci_Zapis::status_zapisu( $zapis ) ) {
				return;
			}

			// Fakt dostarczenia — osobno od maila, bo to dwie różne rzeczy:
			// klient może mieć dostęp mimo niedoręczonej wiadomości.
			Aai_Platnosci_Zapis::dostawa_odnotuj( self::ZDARZENIE_DOSTEP, $order_id, 'przyznany' );

			if ( ! Aai_Platnosci_Zapis::dostawa_odnotuj( self::ZDARZENIE_KURS, $order_id ) ) {
				// Drugi kurs z tego samego zamówienia — jeden mail na
				// zamówienie, nie na kurs.
				return;
			}
			self::na_koniec_zadania(
				'kurs-' . $order_id,
				static function () use ( $order_id ): void {
					self::zapisz_wynik( self::ZDARZENIE_KURS, $order_id, self::wyslij_kurs( $order_id ) );
				}
			);
		} catch ( Throwable $e ) {
			Aai_Platnosci_Komunikaty::zapisz( 'przy mailu o dostępie (zapis ' . (int) $zapis_id . '): ' . $e->getMessage() );
		}
	}

	/**
	 * Ponowna wysyłka — jedyna droga, którą mail wychodzi drugi raz.
	 *
	 * Świadome działanie człowieka (`wp aai-platnosci dostawy --ponow`),
	 * więc omija znacznik: znacznik broni przed DUPLIKATEM z cudzej
	 * rekurencji, nie przed decyzją właściciela. Nie tworzy wiersza —
	 * nadpisuje `wynik` istniejącego.
	 *
	 * @param string $zdarzenie     Zdarzenie z tabeli `dostawy`.
	 * @param int    $identyfikator Użytkownik (mail 1) albo zamówienie (mail 2).
	 * @return string Wynik wysyłki.
	 */
	public static function ponow( string $zdarzenie, int $identyfikator ): string {
		/*
		 * PONAWIAMY WYŁĄCZNIE TO, CO JEST W DZIENNIKU. Bez tego warunku
		 * `--ponow=mail_konta/1` wysyłał świeży klucz resetu DOWOLNEMU
		 * użytkownikowi (zmierzone: literówka w id posłała link
		 * administratorowi), nie zostawiał śladu — bo `dostawa_wynik()`
		 * aktualizuje nieistniejący wiersz — i meldował „wysłano ponownie”.
		 * Każdy nowy klucz unieważnia poprzedni, więc pomyłka odbierałaby
		 * czekającemu klientowi jego jedyny link (B8).
		 */
		if ( ! Aai_Platnosci_Zapis::dostawa_istnieje( $zdarzenie, $identyfikator ) ) {
			return sprintf(
				'blad: dziennik nie zna dostawy %s/%d — ponawiamy tylko wiadomości, które już raz zostały zlecone',
				$zdarzenie,
				$identyfikator
			);
		}
		if ( self::ZDARZENIE_KONTO === $zdarzenie ) {
			$wynik = self::wyslij_konto( $identyfikator );
		} elseif ( self::ZDARZENIE_KURS === $zdarzenie ) {
			$wynik = self::wyslij_kurs( $identyfikator );
		} else {
			return sprintf( 'zdarzenie „%s" nie jest mailem — nie ma czego ponawiać', $zdarzenie );
		}
		self::zapisz_wynik( $zdarzenie, $identyfikator, $wynik );
		return $wynik;
	}

	/**
	 * Zapisuje wynik wysyłki i — przy porażce — mówi o niej w kokpicie.
	 *
	 * Sam wiersz w `dostawy` widzi kontrola i nikt więcej, a niedoręczony
	 * link do hasła nie ma drugiego kanału (B8): klient siedzi z kontem,
	 * do którego nie umie wejść, i nic tego nie pokazuje. Dlatego porażka
	 * jedzie także na ekran właściciela.
	 *
	 * @param string $zdarzenie     Zdarzenie.
	 * @param int    $identyfikator Identyfikator.
	 * @param string $wynik         Rezultat wysyłki.
	 */
	private static function zapisz_wynik( string $zdarzenie, int $identyfikator, string $wynik ): void {
		Aai_Platnosci_Zapis::dostawa_wynik( $zdarzenie, $identyfikator, $wynik );
		$klucz = Aai_Platnosci_Komunikaty::KLUCZ_MAILA . $zdarzenie . '/' . $identyfikator;
		if ( self::WYNIK_OK === $wynik || self::WYNIK_POMINIETY === $wynik ) {
			// Udana wysyłka zdejmuje DOKŁADNIE swój komunikat — także
			// wtedy, gdy poszła dopiero ponowieniem z wiersza poleceń.
			Aai_Platnosci_Komunikaty::wyczysc( $klucz );
			return;
		}
		Aai_Platnosci_Komunikaty::zapisz(
			sprintf(
				// Obie drogi, tak samo jak w komunikacie kontroli: ponowienie
				// bywa NIEMOŻLIWE (konto skasowane), a wtedy jedynym wyjściem
				// jest zamknięcie z powodem — inaczej komunikat zostaje na
				// ekranie właściciela na zawsze.
				'wiadomość %s/%d NIE wyszła (%s) — klient jej nie dostał. Ponów: wp aai-platnosci dostawy --ponow=%s/%d — a jeśli ponowić się nie da, zamknij z powodem: wp aai-platnosci dostawy --zamknij=%s/%d --powod="…"',
				$zdarzenie,
				$identyfikator,
				$wynik,
				$zdarzenie,
				$identyfikator,
				$zdarzenie,
				$identyfikator
			),
			$klucz
		);
	}

	/**
	 * Odkłada wysyłkę na koniec żądania, najwyżej raz na klucz.
	 *
	 * @param string   $klucz    Klucz jednokrotności w tym żądaniu.
	 * @param callable $zadanie  Co wysłać.
	 */
	private static function na_koniec_zadania( string $klucz, callable $zadanie ): void {
		if ( isset( self::$kolejka[ $klucz ] ) ) {
			return;
		}
		/*
		 * JESTEŚMY JUŻ W `shutdown` — wysyłamy OD RAZU.
		 *
		 * ZMIERZONE: zamówienie przestawione ręcznie na `processing`
		 * domykamy odroczeniem na `shutdown` (P3b), a to domknięcie
		 * przestawia zapis Tutora i odpala `tutor_after_enrolled` —
		 * czyli nasze zgłoszenie trafiało do akcji, która WŁAŚNIE trwa.
		 * WordPress nie woła callbacku dopisanego do wykonywanej akcji
		 * w tym samym priorytecie: znacznik `mail_kursu/1312` zostawał
		 * z PUSTYM wynikiem, w skrzynce były cztery maile WooCommerce
		 * i ani jednego naszego. Klient miał dostęp i nie wiedział o tym.
		 *
		 * Bez pytania o `doing_action` ta ścieżka milczałaby zawsze —
		 * i milczałaby dokładnie tam, gdzie P3b dokładało siatkę
		 * bezpieczeństwa na ręczną zmianę statusu w panelu.
		 */
		if ( doing_action( 'shutdown' ) ) {
			try {
				$zadanie();
			} catch ( Throwable $e ) {
				Aai_Platnosci_Komunikaty::zapisz( 'przy wysyłce (' . $klucz . '): ' . $e->getMessage() );
			}
			return;
		}
		self::$kolejka[ $klucz ] = $zadanie;
		add_action(
			'shutdown',
			static function () use ( $klucz ): void {
				self::wykonaj( $klucz );
			}
		);
	}

	/**
	 * Wykonuje zadanie z kolejki dokładnie raz i zdejmuje je z niej.
	 *
	 * Wołane z callbacku `shutdown` ORAZ z `dostarcz_konto()`, które
	 * potrafi przyspieszyć cudze zadanie — dlatego pierwszy ruch to
	 * zdjęcie z kolejki: drugi chętny zastaje pustkę i wraca.
	 *
	 * @param string $klucz Klucz zadania w kolejce.
	 */
	private static function wykonaj( string $klucz ): void {
		if ( ! isset( self::$kolejka[ $klucz ] ) ) {
			return;
		}
		$zadanie = self::$kolejka[ $klucz ];
		unset( self::$kolejka[ $klucz ] );
		try {
			$zadanie();
		} catch ( Throwable $e ) {
			Aai_Platnosci_Komunikaty::zapisz( 'przy wysyłce (' . $klucz . '): ' . $e->getMessage() );
		}
	}

	/**
	 * Id zamówienia z kolejki maila 2 należącego do tego użytkownika.
	 *
	 * @param int $user_id Id użytkownika.
	 */
	private static function zamowienie_w_kolejce( int $user_id ): ?int {
		foreach ( array_keys( self::$kolejka ) as $klucz ) {
			if ( ! str_starts_with( (string) $klucz, 'kurs-' ) ) {
				continue;
			}
			$order_id = (int) substr( (string) $klucz, 5 );
			$order    = $order_id > 0 ? wc_get_order( $order_id ) : false;
			if ( $order instanceof WC_Order && (int) $order->get_customer_id() === $user_id ) {
				return $order_id;
			}
		}
		return null;
	}

	/**
	 * Mail 1 — z pominięciem, gdy w TYM żądaniu wychodzi mail 2.
	 *
	 * Płatność natychmiastowa domyka zamówienie w żądaniu kasy, więc oba
	 * maile stałyby w skrzynce w tej samej sekundzie, a pierwszy kazałby
	 * klientowi „wejść na konto", na którym właśnie siedzi (kasa loguje
	 * po zakupie). Wtedy wysyłamy TYLKO mail o kursie — on niesie odnośnik
	 * do ustawienia hasła.
	 *
	 * KOLEJNOŚĆ JEST CZĘŚCIĄ GWARANCJI K1: najpierw wykonujemy zadanie
	 * maila 2 i sprawdzamy jego WYNIK. Pominięcie zapisujemy wyłącznie po
	 * potwierdzonym „wyslano" — gdy mail 2 padł (poczta leży), klient
	 * dostaje mail 1 jak zawsze, bo bez niego nie miałby ANI JEDNEJ
	 * wiadomości z linkiem do hasła.
	 *
	 * @param int $id Id użytkownika.
	 */
	private static function dostarcz_konto( int $id ): void {
		$order_id = self::zamowienie_w_kolejce( $id );
		if ( null !== $order_id ) {
			self::wykonaj( 'kurs-' . $order_id );
			if ( self::WYNIK_OK === Aai_Platnosci_Zapis::dostawa_rezultat( self::ZDARZENIE_KURS, $order_id ) ) {
				self::zapisz_wynik( self::ZDARZENIE_KONTO, $id, self::WYNIK_POMINIETY );
				return;
			}
		}
		self::zapisz_wynik( self::ZDARZENIE_KONTO, $id, self::wyslij_konto( $id ) );
	}

	/**
	 * MAIL 1 — „Ustaw hasło i wejdź".
	 *
	 * Adresatem jest ZAWSZE `$user->user_email`, nigdy adres rozliczeniowy
	 * z zamówienia (B9): zamówienie założone w kokpicie na cudze
	 * `customer_id` z dowolnym adresem wysłałoby ważny klucz resetu pod
	 * ten adres, czyli oddałoby konto.
	 *
	 * @param int $user_id Id użytkownika.
	 * @return string Wynik do kolumny `wynik`.
	 */
	private static function wyslij_konto( int $user_id ): string {
		$user = get_userdata( $user_id );
		if ( false === $user ) {
			return 'blad: konto ' . $user_id . ' już nie istnieje';
		}

		$klucz = get_password_reset_key( $user );
		if ( is_wp_error( $klucz ) ) {
			return 'blad: klucz resetu — ' . $klucz->get_error_message();
		}

		/*
		 * Adres składamy DOKŁADNIE tak jak WooCommerce w swoim mailu
		 * „nowe konto" (`class-wc-email-customer-new-account.php:230`):
		 * strona `/my-account/lost-password/`, a nie `wp-login.php`.
		 * Powód nie jest kosmetyczny — tamta strona ma nasz wygląd
		 * (`aai-sklep/assets/woo-motyw.css`), a `wp-login.php` wyrzuciłby
		 * klienta na surowy ekran WordPressa zaraz po premium mailu.
		 * `sprintf`, a nie `add_query_arg`: to drugie zakodowałoby login
		 * powtórnie.
		 */
		$adres = sprintf(
			'%s?action=newaccount&key=%s&login=%s',
			wc_get_account_endpoint_url( 'lost-password' ),
			$klucz,
			rawurlencode( $user->user_login )
		);
		$zapasowy = wc_get_account_endpoint_url( 'lost-password' );

		// Termin bierzemy Z FILTRA, a nie z pamięci: WordPress daje na
		// reset dobę, ale wartość jest filtrowalna, a mail ma mówić
		// prawdę o tej instalacji (B8).
		$godzin = max( 1, (int) round( ( (int) apply_filters( 'password_reset_expiration', DAY_IN_SECONDS ) ) / HOUR_IN_SECONDS ) );

		$imie  = trim( (string) $user->first_name );
		$lead  = '' === $imie
			? 'Twoje konto w Automatic AI jest już założone.'
			: sprintf( '%s, Twoje konto w Automatic AI jest już założone.', esc_html( $imie ) );

		$tresc = '<p style="margin:0 0 16px">Zostało jedno kliknięcie: ustaw hasło, a potem wejdziesz na swoje kursy tym samym adresem e-mail.</p>'
			. '<p style="margin:0 0 16px">Gdy zamówienie zostanie opłacone, dostaniesz od nas drugą wiadomość — z linkiem prosto do materiału.</p>';

		$pod = sprintf(
			'<p style="margin:0 0 10px">Link jest ważny przez %d h. Gdy wygaśnie, ustaw hasło stąd: <a href="%s" style="color:#bfff38">%s</a></p>'
			. '<p style="margin:0">Tej wiadomości nie zamawiałeś? Napisz do nas — konto bez ustawionego hasła jest nieaktywne.</p>',
			$godzin,
			esc_url( $zapasowy ),
			esc_html( $zapasowy )
		);

		$tekst = sprintf(
			"%s\n\nUstaw hasło: %s\n\nLink jest ważny przez %d h. Gdy wygaśnie, ustaw hasło stąd: %s\n\nGdy zamówienie zostanie opłacone, dostaniesz drugą wiadomość — z linkiem do materiału.\n",
			'' === $imie ? 'Twoje konto w Automatic AI jest już założone.' : $imie . ', Twoje konto w Automatic AI jest już założone.',
			$adres,
			$godzin,
			$zapasowy
		);

		return self::wyslij(
			$user->user_email,
			'Ustaw hasło i wejdź na swoje konto',
			self::skorupa( 'Konto gotowe', $lead, $tresc, $adres, 'Ustaw hasło', $pod ),
			$tekst
		);
	}

	/**
	 * MAIL 2 — „Twój kurs jest gotowy".
	 *
	 * Treść składamy z POZYCJI ZAMÓWIENIA, nie z argumentów haka: jedno
	 * zamówienie może nieść dwa kursy, a hak leci osobno dla każdego.
	 * Zamówienie czytamy ŚWIEŻE (`wc_get_order`), nigdy z obiektu podanego
	 * przez cudzy hak — w rekurencji jest nieaktualny (B6).
	 *
	 * @param int $order_id Id zamówienia.
	 * @return string Wynik do kolumny `wynik`.
	 */
	private static function wyslij_kurs( int $order_id ): string {
		$order = wc_get_order( $order_id );
		if ( ! $order instanceof WC_Order ) {
			return 'blad: zamówienie ' . $order_id . ' nie istnieje';
		}
		$user = get_userdata( (int) $order->get_customer_id() );
		if ( false === $user ) {
			// Zakup gościa jest wyłączony (P3a), więc to stan nienormalny:
			// nie ma komu wysłać ani do czego wpuścić.
			return 'blad: zamówienie ' . $order_id . ' nie ma konta klienta';
		}

		$kursy = self::kursy_zamowienia( $order );
		if ( array() === $kursy ) {
			return 'blad: zamówienie ' . $order_id . ' nie niesie ani jednego kursu';
		}

		$lista = '';
		$lista_tekst = '';
		foreach ( $kursy as $kurs ) {
			$lista .= sprintf(
				'<tr><td style="padding:10px 14px;border:1px solid rgba(245,245,245,0.12);border-radius:8px;color:#f5f5f5;font-weight:600">%s</td></tr><tr><td style="height:8px"></td></tr>',
				esc_html( $kurs )
			);
			$lista_tekst .= '  • ' . $kurs . "\n";
		}

		$imie = trim( (string) $user->first_name );
		$lead = sprintf(
			'%sdostęp jest już na Twoim koncie.',
			'' === $imie ? 'Gotowe — ' : esc_html( $imie ) . ', '
		);

		$moje = self::adres_moich_kursow();
		$tresc = '<p style="margin:0 0 16px">Od tej chwili masz w Automatic AI:</p>'
			. '<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 20px">' . $lista . '</table>'
			. '<p style="margin:0 0 16px">Materiał czeka na Twoim koncie — wejdź tym samym adresem e-mail, na który przyszła ta wiadomość.</p>';

		/*
		 * ODNOŚNIK DO USTAWIENIA HASŁA JEST TU KONIECZNY, nie uprzejmy.
		 * ZMIERZONE: konto założone POZA kasą (wp-admin, `POST /wc/v3/customers`,
		 * `wp user create`) nie przechodzi przez `wc_create_new_customer()`,
		 * więc `woocommerce_created_customer` nie odpala i mail 1 NIE POWSTAJE
		 * — a zamówienie założone takiemu klientowi w kokpicie dostarcza mail 2
		 * normalnie. Klient miał wtedy kurs i ani jednego linku do hasła.
		 * Zdanie „ustaw je na stronie logowania" bez adresu tego nie ratowało.
		 *
		 * Klucza resetu tu NIE MA i nie będzie (niezmiennik 8): to zwykły
		 * odnośnik do strony odzyskiwania, więc nie unieważnia klucza z maila 1,
		 * gdyby ten jednak poszedł (B8).
		 */
		$odzyskanie = wc_get_account_endpoint_url( 'lost-password' );
		$pod        = sprintf(
			'<p style="margin:0">Pierwszy raz u nas albo nie pamiętasz hasła? Ustaw je tutaj: <a href="%s" style="color:#bfff38">%s</a> — dostęp do kursu zostaje.</p>',
			esc_url( $odzyskanie ),
			esc_html( $odzyskanie )
		);

		$tekst = sprintf(
			"%s\n\nMasz dostęp do:\n%s\nWejdź na swoje kursy: %s\n\nPierwszy raz u nas albo nie pamiętasz hasła? Ustaw je tutaj: %s\n",
			'' === $imie ? 'Gotowe — dostęp jest już na Twoim koncie.' : $imie . ', dostęp jest już na Twoim koncie.',
			$lista_tekst,
			$moje,
			$odzyskanie
		);

		return self::wyslij(
			$user->user_email,
			1 === count( $kursy ) ? 'Twój kurs jest gotowy' : 'Twoje kursy są gotowe',
			self::skorupa( 'Kurs jest Twój', $lead, $tresc, $moje, 'Przejdź do kursu', $pod ),
			$tekst
		);
	}

	/**
	 * Nazwy kursów z zamówienia — przez tabelę `powiazania`, nigdy po
	 * nazwie produktu. Gdy Pluginu 1 nie ma (można go wyłączyć osobno),
	 * zostaje nazwa pozycji zamówienia: gorsza, ale prawdziwa.
	 *
	 * @param WC_Order $order Zamówienie.
	 * @return string[] Nazwy kursów.
	 */
	private static function kursy_zamowienia( WC_Order $order ): array {
		$kursy = array();
		foreach ( $order->get_items() as $pozycja ) {
			if ( ! $pozycja instanceof WC_Order_Item_Product ) {
				continue;
			}
			$uuid = Aai_Platnosci_Zapis::kurs_produktu( (int) $pozycja->get_product_id() );
			if ( null === $uuid ) {
				continue;
			}
			$nazwa = '';
			if ( class_exists( 'Aai_Sklep_Odczyt' ) ) {
				$kurs  = Aai_Sklep_Odczyt::kurs_po_id( $uuid );
				$nazwa = is_array( $kurs ) ? (string) ( $kurs['title'] ?? '' ) : '';
			}
			$kursy[] = '' === $nazwa ? (string) $pozycja->get_name() : $nazwa;
		}
		return $kursy;
	}

	/**
	 * Adres „Moich kursów" — z Pluginu 1, bo tam mieszka ta strona.
	 * Bez niego zostaje strona konta WooCommerce: klient i tak trafi
	 * do materiału, tylko dłuższą drogą.
	 */
	private static function adres_moich_kursow(): string {
		if ( class_exists( 'Aai_Sklep_Moje' ) ) {
			return Aai_Sklep_Moje::adres();
		}
		return wc_get_page_permalink( 'myaccount' );
	}

	/**
	 * Nadawca — ten sam, którym podpisuje się poczta WooCommerce.
	 *
	 * Dwa różne nadawcy w jednym zakupie (potwierdzenie zamówienia od
	 * sklepu, mail o koncie od `wordpress@…`) wyglądają jak phishing.
	 */
	private static function nadawca(): string {
		$nazwa = (string) get_option( 'woocommerce_email_from_name', '' );
		$adres = (string) get_option( 'woocommerce_email_from_address', '' );
		if ( '' === $nazwa ) {
			$nazwa = wp_specialchars_decode( (string) get_option( 'blogname' ), ENT_QUOTES );
		}
		if ( '' === $adres || ! is_email( $adres ) ) {
			$adres = (string) get_option( 'admin_email' );
		}
		return sprintf( '%s <%s>', $nazwa, $adres );
	}

	/**
	 * Wysyłka: HTML z wersją tekstową obok.
	 *
	 * Typ treści idzie NAGŁÓWKIEM, nie filtrem `wp_mail_content_type` —
	 * filtr jest globalny i zostawiony w miejscu zamienia w HTML każdą
	 * cudzą wiadomość w tym żądaniu. Wersja tekstowa wchodzi przez
	 * `phpmailer_init` i jest zdejmowana zaraz po wysyłce.
	 *
	 * @param string $do    Adresat.
	 * @param string $temat Temat.
	 * @param string $html  Treść HTML.
	 * @param string $tekst Treść tekstowa.
	 * @return string Wynik do kolumny `wynik`.
	 */
	private static function wyslij( string $do, string $temat, string $html, string $tekst ): string {
		$powod = '';
		$zapamietaj = static function ( $blad ) use ( &$powod ): void {
			$powod = $blad instanceof WP_Error ? $blad->get_error_message() : '';
		};
		$alternatywa = static function ( $mailer ) use ( $tekst ): void {
			$mailer->AltBody = $tekst;
		};

		add_action( 'wp_mail_failed', $zapamietaj );
		add_action( 'phpmailer_init', $alternatywa );
		try {
			$poszlo = wp_mail(
				$do,
				$temat,
				$html,
				array( 'Content-Type: text/html; charset=UTF-8', 'From: ' . self::nadawca() )
			);
		} finally {
			// `finally`, bo `wp_mail()` potrafi rzucić wyjątkiem PHPMailera
			// przy nietypowej konfiguracji — filtr zostawiony w miejscu
			// doklejałby naszą wersję tekstową do CUDZYCH wiadomości.
			remove_action( 'phpmailer_init', $alternatywa );
			remove_action( 'wp_mail_failed', $zapamietaj );
		}

		if ( true === $poszlo ) {
			return self::WYNIK_OK;
		}
		// `wp_mail()` pada PO CICHU — bez tego zapisu link do hasła
		// przepadałby bez śladu, a innego kanału nie ma (B8).
		return 'blad: ' . ( '' === $powod ? 'wp_mail() oddało false' : $powod );
	}

	/**
	 * Skorupa wiadomości — jedna kolumna, jeden przycisk, barwy marki.
	 *
	 * Tabele i style w atrybutach, bo klienci pocztowi nie mają kaskady
	 * ani nowoczesnego układu; `background-color` dublujemy atrybutem
	 * `bgcolor` dla starych Outlooków.
	 *
	 * @param string $naglowek       Nagłówek nad treścią.
	 * @param string $lead           Zdanie wiodące.
	 * @param string $tresc          Treść HTML.
	 * @param string $przycisk_adres Adres przycisku.
	 * @param string $przycisk_napis Napis przycisku.
	 * @param string $pod            Drobny druk pod przyciskiem.
	 */
	private static function skorupa( string $naglowek, string $lead, string $tresc, string $przycisk_adres, string $przycisk_napis, string $pod ): string {
		$marka = wp_specialchars_decode( (string) get_option( 'blogname' ), ENT_QUOTES );
		return '<!DOCTYPE html><html lang="pl"><head><meta charset="UTF-8">'
			. '<meta name="viewport" content="width=device-width,initial-scale=1">'
			. '<title>' . esc_html( $naglowek ) . '</title></head>'
			. '<body style="margin:0;padding:0;background-color:#08090b" bgcolor="#08090b">'
			. '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#08090b" bgcolor="#08090b"><tr><td align="center" style="padding:32px 16px">'
			. '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#101116;border:1px solid rgba(245,245,245,0.08);border-radius:14px" bgcolor="#101116">'
			. '<tr><td style="padding:28px 28px 0;font-family:Helvetica,Arial,sans-serif">'
			. '<div style="font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:#bfff38;font-weight:700">' . esc_html( $marka ) . '</div>'
			. '<h1 style="margin:14px 0 10px;font-size:26px;line-height:1.25;color:#f5f5f5;font-weight:800">' . esc_html( $naglowek ) . '</h1>'
			. '<p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#8f929c">' . $lead . '</p>'
			. '</td></tr>'
			. '<tr><td style="padding:0 28px;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#f5f5f5">' . $tresc . '</td></tr>'
			. '<tr><td style="padding:8px 28px 4px" align="left">'
			. '<a href="' . esc_url( $przycisk_adres ) . '" style="display:inline-block;padding:14px 26px;background-color:#bfff38;color:#08090b;font-family:Helvetica,Arial,sans-serif;font-size:16px;font-weight:800;text-decoration:none;border-radius:9px">' . esc_html( $przycisk_napis ) . '</a>'
			. '</td></tr>'
			. '<tr><td style="padding:20px 28px 28px;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:#8f929c">' . $pod . '</td></tr>'
			. '</table>'
			. '<div style="max-width:560px;padding:16px 6px 0;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#8f929c">' . esc_html( $marka ) . '</div>'
			. '</td></tr></table></body></html>';
	}
}
