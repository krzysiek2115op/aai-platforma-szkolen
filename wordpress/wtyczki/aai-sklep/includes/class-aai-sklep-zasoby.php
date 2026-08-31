<?php
/**
 * Higiena zasobów: style i skrypty Tutora oraz WooCommerce nie wchodzą
 * na strony, które ich nie używają.
 *
 * SKĄD TA KLASA. Pierwsze uruchomienie motywu Automatic AI obok Tutora
 * i WooCommerce POŁAMAŁO stronę główną: `tutor-front.min.css` definiuje
 * globalnie `.text-label { background-color:#e8eff1; padding:4px 7px;
 * display:inline-block }`, a motyw używa klasy o tej samej nazwie jako
 * rozmiaru pisma (Tailwind). Efekt: jasne plakietki na 30+ elementach
 * i rozjechany marquee stopki, bo `inline-block` z paddingiem zmienia
 * szerokość taśmy. Zmierzone skanem WSZYSTKICH klas motywu przeciw
 * arkuszom wtyczek (2026-08-25): jedyna groźna kolizja to właśnie
 * `.text-label`; cztery pozostałe (`hidden`, `invisible`, `align-bottom`,
 * `panel`) mają identyczne wartości albo selektory zawężone do stron Woo.
 *
 * DLACZEGO DEQUEUE, A NIE NADPISANIE JEDNEJ REGUŁY. Nadpisanie leczy
 * dzisiejszy objaw; każda aktualizacja Tutora może dołożyć następną
 * globalną klasę i wrócimy do tego samego. Zdjęcie CUDZYCH zasobów ze
 * stron, na których nie mają nic do roboty, zamyka klasę problemu TAM,
 * GDZIE DA SIĘ JE ZDJĄĆ — i przy okazji zdejmuje ~0,5 MB CSS+JS z każdej
 * strony motywu.
 *
 * CZEGO TO NIE ZAŁATWIA (uzupełnienie z 0.40.0). Na WŁASNYCH stronach
 * Tutora jego CSS musi zostać, więc kolizja `.text-label` żyła tam dalej
 * — i była nie do zauważenia, dopóki nikt nie zmierzył stopki na stronie
 * kursu. Powód jest głębszy niż nazwa klasy: motyw to Tailwind 4 i trzyma
 * CAŁY swój CSS w warstwach kaskady, a arkusze Tutora są poza warstwami.
 * Reguła bez warstwy bije każdą regułę w warstwie, niezależnie od
 * specyficzności i kolejności ładowania — więc NA STRONACH TUTORA KAŻDA
 * jego reguła wygrywa z każdą klasą motywu. Tamtą stronę medalu obsługuje
 * `Aai_Sklep_Styl_Tutora`, a pilnuje `smoke-wp-motyw`.
 *
 * DLACZEGO TO ROBI NASZA WTYCZKA. Motyw jest generowany (nie wolno w nim
 * grzebać), a Tutor i WooCommerce są zależnościami NASZEJ architektury —
 * to my je wprowadzamy, więc my pilnujemy, żeby nie psuły strony,
 * do której wtyczka ma się „dopasowywać" (ETAP-WP.md).
 *
 * ZASADA OSTROŻNOŚCI: zdejmujemy wyłącznie wtedy, gdy umiemy STWIERDZIĆ,
 * że strona nie należy do Tutora/Woo. Gdy nie umiemy (brak funkcji,
 * nieznany kontekst) — zostawiamy wszystko, bo zepsuta kasa sklepu jest
 * gorsza niż jasna plakietka na stronie głównej.
 *
 * @package Aai_Sklep
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Zdejmowanie cudzych zasobów ze stron motywu.
 */
final class Aai_Sklep_Zasoby {

	/**
	 * Rejestracja — wołane raz, z pliku głównego wtyczki.
	 */
	public static function zarejestruj(): void {
		// Priorytet 999: PO tym, jak Tutor i Woo dodadzą swoje wpisy
		// do kolejki. Wcześniejszy bieg nie miałby czego zdejmować.
		add_action( 'wp_enqueue_scripts', array( self::class, 'posprzataj' ), 999 );

		// GWARANCJA, nie optymalizacja: filtry `*_loader_src` biegną
		// w chwili DRUKOWANIA każdego znacznika, więc łapią też zasoby
		// dokładane po naszym hooku. Zmierzone na żywej stronie: samo
		// zdejmowanie z kolejki przepuszczało `wc-blocks-style` (dokładany
		// po `wp_enqueue_scripts`) i `sourcebuster-js` (drukowany w stopce
		// jako zależność). Zwrot false = znacznik w ogóle nie powstaje.
		add_filter( 'style_loader_src', array( self::class, 'filtruj_zrodlo' ), 10, 2 );
		add_filter( 'script_loader_src', array( self::class, 'filtruj_zrodlo' ), 10, 2 );
	}

	/**
	 * Czy bieżące żądanie to strona WooCommerce (sklep, koszyk, kasa, konto).
	 *
	 * PUBLICZNA z tego samego powodu co `strona_tutora()`: pyta o to także
	 * `Aai_Sklep_Styl_Woo` i ma pytać TĘ funkcję, a nie mieć własną kopię
	 * warunku. Dwie kopie rozjechałyby się przy pierwszej zmianie w Woo,
	 * a objawem byłaby strona konta bez stylów — czyli dokładnie to, co
	 * właściciel zgłosił zrzutem w teście ręcznym W6.
	 */
	public static function strona_woo(): bool {
		return ( function_exists( 'is_woocommerce' ) && is_woocommerce() )
			|| ( function_exists( 'is_cart' ) && is_cart() )
			|| ( function_exists( 'is_checkout' ) && is_checkout() )
			|| ( function_exists( 'is_account_page' ) && is_account_page() );
	}

	/**
	 * Czy bieżące żądanie to strona Tutora (kurs, lekcja, quiz, panel kursanta).
	 *
	 * PUBLICZNA, bo pyta o to także `Aai_Sklep_Styl_Tutora` — i ma pytać
	 * TĘ funkcję, a nie mieć własną kopię warunku. Dwie kopie rozjechałyby
	 * się przy pierwszej zmianie w Tutorze, a objawem byłaby strona bez
	 * stylów albo strona motywu z cudzym CSS-em.
	 */
	public static function strona_tutora(): bool {
		/*
		 * NASZA strona lekcji stoi pod adresem Tutora, ale rysuje ją nasz
		 * szablon i nie ma na niej ani jednego elementu jego interfejsu —
		 * jego arkusz zrobiłby tam dokładnie to, co zrobił stronie głównej
		 * przed 0.38.0 (kolizja `.text-label`), tylko że w widoku, za który
		 * klient zapłacił. Pytanie „czy to strona Tutora" odpowiadamy więc
		 * PRZECZĄCO wszędzie tam, gdzie rysujemy własny widok.
		 */
		if ( class_exists( 'Aai_Sklep_Lekcja' ) && Aai_Sklep_Lekcja::czy_nasza() ) {
			return false;
		}
		if ( ! function_exists( 'tutor' ) ) {
			return false;
		}

		// Typy wpisów bierzemy Z TUTORA, nie z listy wpisanej na sztywno —
		// nazwy CPT bywały w historii Tutora konfigurowalne.
		$typy = array_filter(
			array(
				tutor()->course_post_type ?? null,
				tutor()->lesson_post_type ?? null,
				'tutor_quiz',
				'tutor_assignments',
			)
		);
		if ( is_singular( $typy ) || is_post_type_archive( $typy ) ) {
			return true;
		}

		/*
		 * Panel kursanta, rejestracje i kasa Tutora to zwykłe strony
		 * WordPressa wskazane w jego opcjach — po samym typie wpisu nie da
		 * się ich poznać. Pytamy więc o KOMPLET tych opcji, nie tylko
		 * o panel: brak którejkolwiek znaczy stronę Tutora bez naszego
		 * arkusza, czyli białe pola formularza na ciemnym motywie. Wykryte
		 * dopiero wtedy, gdy `smoke-wp-motyw` zaczął mierzyć rejestrację
		 * (W3) — wcześniej mierzył wyłącznie strony kursów.
		 */
		foreach ( self::strony_tutora() as $id ) {
			if ( is_page( $id ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Identyfikatory stron, które na tej witrynie postawił Tutor.
	 *
	 * JEDNO ŹRÓDŁO, bo pytają o nie dwie różne sprawy: czy stronie podać
	 * nasz arkusz integracji (tutaj) i czy wpuścić ją do sitemapy
	 * (`Aai_Sklep_Sitemap`). Dwie listy tych samych opcji rozjechałyby
	 * się przy pierwszej zmianie w Tutorze — a rozjazd byłby niemy.
	 *
	 * Panel kursanta, rejestracje i kasa Tutora to zwykłe strony
	 * WordPressa wskazane w jego opcjach: po samym typie wpisu nie da się
	 * ich poznać. Pytamy o KOMPLET tych opcji, nie tylko o panel — brak
	 * którejkolwiek znaczył białe pola formularza na ciemnym motywie
	 * (wykryte, gdy `smoke-wp-motyw` zaczął mierzyć rejestrację, W3).
	 *
	 * @return array<int,int> Identyfikatory istniejących stron Tutora.
	 */
	public static function strony_tutora(): array {
		if ( ! function_exists( 'tutor_utils' ) ) {
			return array();
		}

		$opcje = array(
			'tutor_dashboard_page_id',
			'student_register_page',
			'instructor_register_page',
			'tutor_cart_page_id',
			'tutor_checkout_page_id',
		);

		$strony = array();
		foreach ( $opcje as $opcja ) {
			$id = (int) tutor_utils()->get_option( $opcja );
			if ( $id > 0 ) {
				$strony[] = $id;
			}
		}

		return array_values( array_unique( $strony ) );
	}

	/**
	 * Zdejmuje z kolejki style i skrypty po prefiksie uchwytu.
	 *
	 * Po PREFIKSIE, nie po wyliczonej liście: Tutor rejestruje kilkanaście
	 * uchwytów i dokłada nowe między wersjami — lista wpisana na sztywno
	 * przestałaby być prawdziwa przy pierwszej aktualizacji, a nikt by
	 * tego nie zauważył, bo strona dalej działa (to ta sama klasa pułapki
	 * co wzorzec przypięty do nazwy metody w strażniku limitera).
	 *
	 * @param string[] $prefiksy Prefiksy uchwytów do zdjęcia.
	 */
	private static function zdejmij_po_prefiksie( array $prefiksy ): void {
		foreach ( wp_styles()->queue as $uchwyt ) {
			foreach ( $prefiksy as $prefiks ) {
				if ( str_starts_with( $uchwyt, $prefiks ) ) {
					wp_dequeue_style( $uchwyt );
				}
			}
		}
		foreach ( wp_scripts()->queue as $uchwyt ) {
			foreach ( $prefiksy as $prefiks ) {
				if ( str_starts_with( $uchwyt, $prefiks ) ) {
					wp_dequeue_script( $uchwyt );
				}
			}
		}
	}

	/**
	 * Prefiksy uchwytów do zdjęcia na bieżącej stronie (pusta lista,
	 * gdy strona należy do Tutora/Woo i niczego nie zdejmujemy).
	 *
	 * @return string[]
	 */
	private static function prefiksy_do_zdjecia(): array {
		if ( is_admin() ) {
			return array();
		}
		$prefiksy = array();
		if ( ! self::strona_tutora() ) {
			$prefiksy[] = 'tutor';
		}
		if ( ! self::strona_woo() ) {
			array_push( $prefiksy, 'wc-', 'woocommerce', 'sourcebuster' );
		}
		return $prefiksy;
	}

	/**
	 * Filtr źródła znacznika `<link>`/`<script>` — ostatnia linia obrony.
	 *
	 * @param string|false $zrodlo Adres zasobu.
	 * @param string       $uchwyt Uchwyt zasobu.
	 * @return string|false False = znacznik nie zostanie wydrukowany.
	 */
	public static function filtruj_zrodlo( $zrodlo, string $uchwyt ) {
		foreach ( self::prefiksy_do_zdjecia() as $prefiks ) {
			if ( str_starts_with( $uchwyt, $prefiks ) ) {
				return false;
			}
		}
		return $zrodlo;
	}

	/**
	 * Sprzątanie kolejki zasobów dla bieżącego żądania.
	 */
	public static function posprzataj(): void {
		// Kokpit i podglądy edycyjne zostawiamy w spokoju.
		if ( is_admin() ) {
			return;
		}

		self::zdejmij_po_prefiksie( self::prefiksy_do_zdjecia() );
	}
}
