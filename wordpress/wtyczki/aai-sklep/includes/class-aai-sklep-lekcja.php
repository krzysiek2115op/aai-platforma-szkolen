<?php
/**
 * Widok lekcji — to, co klient dostaje po zakupie.
 *
 * DLACZEGO NASZ SZABLON, A NIE TUTOROWY. Klient ma widzieć jeden świat od
 * katalogu po ostatnią lekcję (potwierdzenie właściciela 2026-08-25).
 * Wygląd tej strony jest przeniesiony z podglądu kursów przyjętego
 * 2026-08-24 („redesign jest dobry", 0.34.0) — po to został wtedy wyjęty
 * z generatora do `tools/podglad-kursow/` jako CSS i szablony.
 *
 * DLACZEGO `template_include`, A NIE PODMIANA SZABLONÓW TUTORA. Tutor daje
 * filtr `tutor_get_template_path`, ale jego strona lekcji ładuje własny
 * arkusz — a każda reguła Tutora bije regułę motywu, bo motyw trzyma swój
 * CSS w warstwach kaskady, a Tutor nie (znalezisko 0.40.0). Nasza trasa
 * omija ten problem u źródła: bierzemy całą stronę i NIE wpuszczamy na nią
 * CSS-u Tutora — dokładnie tak, jak `/szkolenia` w kroku W3.
 *
 * DOSTĘPU PILNUJE TUTOR, NIE MY. Pytamy go `has_enrolled_content_access()`
 * i przyjmujemy odpowiedź. Własna reguła („kupił, więc wpuść") byłaby drugim
 * systemem uprawnień obok istniejącego i pierwsza rozbieżność między nimi
 * skończyłaby się albo wyciekiem materiału, albo zamkniętymi drzwiami przed
 * płacącym klientem.
 *
 * TREŚĆ NIE PRZECHODZI PRZEZ SZABLON. Klasa oddaje szablonowi GOTOWY HTML
 * (`tresc_html`), a nie surową prozę — dzięki temu zostaje w mocy reguła
 * z W4: szablon frontu nie sięga po `content` lekcji. Materiał czyta ta
 * klasa, za bramką dostępu, i tylko ona.
 *
 * @package Aai_Sklep
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Trasa i dane widoku lekcji.
 */
final class Aai_Sklep_Lekcja {

	/** Uchwyty zasobów tej strony. */
	private const UCHWYT_CSS = 'aai-sklep-lekcja';
	private const UCHWYT_JS  = 'aai-sklep-lekcja';

	/** Dane widoku — liczone raz na żądanie. */
	private static ?array $dane = null;

	/** Czy dane już liczyliśmy (bo `null` jest poprawnym wynikiem). */
	private static bool $policzone = false;

	/** Czy to żądanie zostało zasłonięte jako publiczna lista lekcji. */
	private static bool $zaslonieto = false;

	/**
	 * Rejestracja — wołane raz, z pliku głównego wtyczki.
	 */
	public static function zarejestruj(): void {
		add_filter( 'template_include', array( self::class, 'wybierz_szablon' ), 20 );
		add_filter( 'body_class', array( self::class, 'klasa_body' ) );
		add_action( 'wp_enqueue_scripts', array( self::class, 'zasoby' ), 1000 );
		add_action( 'wp_head', array( self::class, 'nie_indeksuj' ), 1 );
		add_filter( 'aai_monitor_strona_za_bramka', array( self::class, 'za_bramka' ) );
		add_filter( 'register_post_type_args', array( self::class, 'zamknij_typ' ), 10, 2 );
		add_action( 'pre_get_posts', array( self::class, 'zamknij_listy' ) );
		add_action( 'template_redirect', array( self::class, 'odpowiedz_zaslony' ), 1 );
	}

	/**
	 * Typy wpisów Tutora, których LISTY zamykamy przed publicznością.
	 *
	 * Nazwy bierzemy z jednego miejsca (`Aai_Sklep_Tutor::typy()`), bo to samo
	 * miejsce decyduje, do jakich wpisów kopiujemy treść — dwie listy
	 * rozjechałyby się przy pierwszej zmianie po stronie Tutora.
	 *
	 * @return string[]
	 */
	private static function typy_zamkniete(): array {
		$typy = Aai_Sklep_Tutor::typy();
		return array( (string) $typy['lekcja'], (string) $typy['modul'] );
	}

	/**
	 * Lekcja nie ma archiwum i nie wchodzi do wyszukiwarki.
	 *
	 * ZNALEZIONE PRZY TEŚCIE CAŁOŚCI (2026-08-31) i zmierzone jako WYCIEK
	 * CAŁEGO PRODUKTU: `/?post_type=lesson` oddawało gościowi 73 lekcje prozy
	 * (osiem stron po dziesięć, 116 kB treści w jednym `<main>`), a te same
	 * teksty wychodziły kanałem RSS i przez wyszukiwarkę witryny. Pojedyncza
	 * lekcja była za bramką — wyciekała LISTA, której nasza bramka w ogóle
	 * nie widzi, bo `Aai_Sklep_Lekcja::policz()` zaczyna od `is_singular()`.
	 *
	 * Przyczyna nie jest po stronie Tutora: to MY kopiujemy pełną prozę
	 * płatnej lekcji do `post_content` wpisu publicznego typu (kopia jest
	 * potrzebna Tutorowi do dostępu i postępu — patrz `Aai_Sklep_Tutor`).
	 * Skoro treść jest nasza, osłona też jest nasza.
	 *
	 * `publicly_queryable` ZOSTAJE PRAWDZIWE — na nim stoi adres pojedynczej
	 * lekcji (`/courses/<kurs>/lessons/<lekcja>/`), czyli to, za co klient
	 * zapłacił. Zamykamy wyłącznie LISTY: archiwum i wyszukiwarkę.
	 *
	 * @param array<string,mixed> $args Argumenty rejestracji.
	 * @param string              $typ  Nazwa typu wpisu.
	 * @return array<string,mixed>
	 */
	public static function zamknij_typ( $args = array(), $typ = '' ) {
		/*
		 * Ten filtr biegnie WEWNĄTRZ rejestracji cudzego typu wpisu, na
		 * `init` — wyjątek stąd wywróciłby całą witrynę razem ze sklepem
		 * (ta sama klasa co F11 w Pluginie 3). Dlatego przy jakimkolwiek
		 * kłopocie oddajemy argumenty NIETKNIĘTE.
		 */
		try {
			if ( ! is_array( $args ) || ! is_string( $typ ) || ! in_array( $typ, self::typy_zamkniete(), true ) ) {
				return $args;
			}
			$args['has_archive']        = false;
			$args['exclude_from_search'] = true;
			return $args;
		} catch ( Throwable $blad ) {
			return $args;
		}
	}

	/**
	 * Każde publiczne zapytanie o LISTĘ lekcji albo modułów oddaje 404.
	 *
	 * SAMA ZMIANA ARGUMENTÓW REJESTRACJI NIE WYSTARCZA i to jest zmierzone:
	 * `has_archive => false` zamyka ładny adres `/lesson/`, ale
	 * `?post_type=lesson` idzie dalej, dopóki typ jest `publicly_queryable`
	 * (a musi być — patrz wyżej). Kanał RSS tej listy działa tak samo.
	 * Dlatego drugi zamek stoi na zapytaniu, nie na rejestracji.
	 *
	 * Zamykamy WYŁĄCZNIE listy w głównym zapytaniu frontu: pojedyncza lekcja
	 * (`is_singular`) przechodzi bez zmian, kokpit i zapytania własne kodu
	 * (`get_posts` w synchronizacji, kreatorze, bramkach) nie są dotykane.
	 *
	 * @param WP_Query $zapytanie Zapytanie WordPressa.
	 */
	public static function zamknij_listy( $zapytanie = null ): void {
		try {
			if ( ! $zapytanie instanceof WP_Query || is_admin() || ! $zapytanie->is_main_query() ) {
				return;
			}
			if ( $zapytanie->is_singular() ) {
				return;
			}
			$zadany = $zapytanie->get( 'post_type' );
			$zadany = is_array( $zadany ) ? array_map( 'strval', $zadany ) : array( (string) $zadany );
			if ( array() === array_intersect( $zadany, self::typy_zamkniete() ) ) {
				return;
			}
			/*
			 * DWIE RZECZY NARAZ, I OBIE SĄ KONIECZNE — zmierzone.
			 * `set_404()` samo w sobie ustawia wyłącznie FLAGĘ: zapytanie i tak
			 * pobiera wiersze, a motyw nie ma `404.php`, więc spada na `index.php`
			 * i drukuje pętlę — czyli po samym `set_404()` proza wyciekała dalej
			 * (pierwsza wersja tej naprawy: kod 200 i dziesięć lekcji na stronie).
			 * Dlatego zapytanie dostaje też pustą listę identyfikatorów: pętla nie
			 * ma czego wydrukować, cokolwiek zrobi cudzy szablon.
			 */
			$zapytanie->set( 'post__in', array( 0 ) );
			$zapytanie->set_404();
			self::$zaslonieto = true;
		} catch ( Throwable $blad ) {
			return;
		}
	}

	/**
	 * Zasłonięta lista oddaje 404 — nie 200 z pustą stroną.
	 *
	 * ZMIERZONE: samo `set_404()` w zapytaniu NIE zmienia kodu odpowiedzi
	 * (rdzeń ustawia go w `WP::handle_404()`, które przy naszej ingerencji
	 * już nie dochodzi do swojego warunku), więc po pierwszej wersji tej
	 * naprawy archiwum lekcji oddawało **200 z pustą treścią**. Kod 200
	 * na liście, której nie ma, kłamie: wyszukiwarki trzymałyby taki adres
	 * w indeksie, a monitoring liczyłby te odsłony jako czytanie strony.
	 */
	public static function odpowiedz_zaslony(): void {
		if ( ! self::$zaslonieto ) {
			return;
		}
		status_header( 404 );
		nocache_headers();
	}

	/**
	 * Odpowiedź monitoringowi: czy rysujemy TERAZ bramkę logowania.
	 *
	 * Pytanie zadaje Plugin 3 filtrem, bo sam nie ma jak tego wiedzieć —
	 * gość na płatnej lekcji dostaje HTTP 200 i pełną stronę, więc z jego
	 * strony odbicie wygląda dokładnie jak przeczytana lekcja (A6
	 * z przeglądu T3). Różnicę zna wyłącznie ten widok.
	 *
	 * Filtr jest w Pluginie 3, odpowiedź w Pluginie 1 — dzięki temu żadna
	 * z wtyczek nie zagląda w drugą: monitoring nie wie nic o lekcjach,
	 * a sklep nie wie nic o tabeli ruchu. Brak Pluginu 3 nic tu nie psuje
	 * (filtr, którego nikt nie woła, po prostu milczy).
	 *
	 * @param bool $za_bramka Odpowiedź dotychczasowa.
	 */
	public static function za_bramka( bool $za_bramka ): bool {
		if ( $za_bramka ) {
			return true;
		}
		$dane = self::dane();
		return null !== $dane && empty( $dane['dostep'] );
	}

	/**
	 * Czy bieżące żądanie to lekcja, którą znamy.
	 */
	public static function czy_nasza(): bool {
		return null !== self::dane();
	}

	/**
	 * Podmiana szablonu.
	 *
	 * @param string $szablon Szablon wybrany przez WordPressa.
	 */
	public static function wybierz_szablon( string $szablon ): string {
		if ( ! self::czy_nasza() ) {
			return $szablon;
		}
		return AAI_SKLEP_KATALOG . 'szablony/lekcja.php';
	}

	/**
	 * Klasy `body` — po nich zaczepiony jest cały arkusz.
	 *
	 * @param string[] $klasy Klasy WordPressa.
	 * @return string[]
	 */
	public static function klasa_body( array $klasy ): array {
		if ( self::czy_nasza() ) {
			// `aai-sklep` niesie TOKENY (kolory, promienie, odstęp pod nagłówek
			// motywu) — bez niej arkusz lekcji nie miałby z czego rysować.
			$klasy[] = 'aai-sklep';
			$klasy[] = 'aai-sklep-lekcja';
		}
		return $klasy;
	}

	/**
	 * Nasz arkusz i skrypt. Zasoby Tutora zdejmuje `Aai_Sklep_Zasoby`.
	 */
	public static function zasoby(): void {
		if ( ! self::czy_nasza() ) {
			return;
		}
		wp_enqueue_style( 'aai-sklep-front', AAI_SKLEP_URL . 'assets/sklep.css', array(), AAI_SKLEP_WERSJA );
		wp_enqueue_style( self::UCHWYT_CSS, AAI_SKLEP_URL . 'assets/lekcja.css', array( 'aai-sklep-front' ), AAI_SKLEP_WERSJA );
		/*
		 * `sklep.js` wchodzi też tutaj: to on prowadzi poświatę za kursorem
		 * (ten sam element tła, co na stronie kursu). Jego podświetlanie
		 * sekcji w pasku nie ma tu czego robić — pyta o `href` kotwic,
		 * a w pigułce lekcji kotwicami są `<summary>` bez adresu, więc
		 * po prostu odpuszcza.
		 */
		wp_enqueue_script( 'aai-sklep-front', AAI_SKLEP_URL . 'assets/sklep.js', array(), AAI_SKLEP_WERSJA, true );
		wp_enqueue_script( self::UCHWYT_JS, AAI_SKLEP_URL . 'assets/lekcja.js', array(), AAI_SKLEP_WERSJA, true );
	}

	/**
	 * Materiał kursu nie ma czego szukać w wyszukiwarce.
	 *
	 * Strona i tak jest za logowaniem, ale `noindex` mówi to wprost — i chroni
	 * przed sytuacją, w której zmiana ustawień dostępu w Tutorze odsłania
	 * treść, a wyszukiwarka ma ją już zaindeksowaną.
	 */
	public static function nie_indeksuj(): void {
		if ( self::czy_nasza() ) {
			echo '<meta name="robots" content="noindex, nofollow">' . "\n";
		}
	}

	/**
	 * Dane widoku albo null, gdy to nie jest nasza lekcja.
	 *
	 * @return array<string,mixed>|null
	 */
	public static function dane(): ?array {
		if ( self::$policzone ) {
			return self::$dane;
		}
		self::$policzone = true;
		self::$dane      = self::policz();
		return self::$dane;
	}

	/**
	 * Zbiera wszystko, czego potrzebuje szablon.
	 *
	 * @return array<string,mixed>|null
	 */
	private static function policz(): ?array {
		if ( ! Aai_Sklep_Tutor::dostepny() || ! is_singular( Aai_Sklep_Tutor::typy()['lekcja'] ) ) {
			return null;
		}

		$post = get_queried_object();
		if ( ! $post instanceof WP_Post ) {
			return null;
		}

		$uuid = (string) get_post_meta( $post->ID, Aai_Sklep_Tutor::META_UUID, true );
		if ( '' === $uuid ) {
			// Lekcja spoza naszych tabel (ktoś dodał ją w Course Builderze).
			// Zostawiamy ją Tutorowi — nie mamy dla niej ani treści, ani programu.
			return null;
		}

		global $wpdb;

		$t_lekcje = Aai_Sklep_Tabele::tabela( 'lessons' );
		$t_moduly = Aai_Sklep_Tabele::tabela( 'modules' );
		$t_kursy  = Aai_Sklep_Tabele::tabela( 'courses' );

		$lekcja = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT l.*, m.course_id AS kurs_id, m.position AS modul_pozycja, m.title AS modul_tytul
				   FROM `$t_lekcje` l
				   JOIN `$t_moduly` m ON m.id = l.module_id
				  WHERE l.id = %s", // phpcs:ignore WordPress.DB.PreparedSQL
				$uuid
			),
			ARRAY_A
		);
		if ( null === $lekcja ) {
			return null;
		}

		$kurs = $wpdb->get_row(
			$wpdb->prepare( "SELECT id, slug, title FROM `$t_kursy` WHERE id = %s", (string) $lekcja['kurs_id'] ), // phpcs:ignore WordPress.DB.PreparedSQL
			ARRAY_A
		);
		if ( null === $kurs ) {
			return null;
		}

		$dostep = self::czy_wolno( $post->ID, (bool) (int) $lekcja['preview'] );

		$program  = self::program( (string) $kurs['id'] );
		$kolejnosc = array();
		foreach ( $program as $modul ) {
			foreach ( $modul['lekcje'] as $poz ) {
				$kolejnosc[] = $poz;
			}
		}

		$numer = 0;
		foreach ( $kolejnosc as $nr => $poz ) {
			if ( $poz['id'] === $uuid ) {
				$numer = $nr;
				break;
			}
		}

		$dane = array(
			'kurs'       => $kurs,
			'lekcja'     => array(
				'id'           => $uuid,
				'title'        => (string) $lekcja['title'],
				'duration_min' => (int) $lekcja['duration_min'],
			),
			'modul'      => array(
				'tytul'    => (string) $lekcja['modul_tytul'],
				'pozycja'  => (int) $lekcja['modul_pozycja'],
			),
			'program'    => $program,
			'numer'      => $numer + 1,
			'wszystkich' => count( $kolejnosc ),
			'poprzednia' => $kolejnosc[ $numer - 1 ] ?? null,
			'nastepna'   => $kolejnosc[ $numer + 1 ] ?? null,
			'dostep'     => $dostep,
			'ukonczona'  => self::ukonczona( $post->ID ),
			'post_id'    => $post->ID,
			'adres_kursu' => Aai_Sklep_Widok::adres_kursu( (string) $kurs['slug'] ),
			'wroc'        => self::wroc( $post->ID, (string) $kurs['slug'] ),
			'tresc_html' => '',
			'lead'       => '',
			'spis'       => array(),
			'blad'       => null,
		);

		if ( ! $dostep ) {
			// Bez dostępu NIE CZYTAMY treści w ogóle. To nie jest oszczędność
			// zapytania: materiał, którego nie wczytano, nie ma jak wyciec
			// przez pomyłkę w szablonie.
			return $dane;
		}

		try {
			$zlozona            = Aai_Sklep_Proza::zloz( (string) $lekcja['content'], Aai_Sklep_Zrzuty::mapa( $uuid ) );
			$dane['tresc_html'] = $zlozona['html'];
			$dane['lead']       = $zlozona['lead'];
			$dane['spis']       = $zlozona['spis'];
		} catch ( Aai_Sklep_Blad_Zapisu $blad ) {
			/*
			 * Konstrukcja, której renderer nie zna, ZATRZYMUJE lekcję — ale nie
			 * wywala całej strony. Klient widzi uczciwy komunikat, właściciel
			 * dostaje powód w kodzie źródłowym strony, a nie białą kartę.
			 */
			$dane['blad'] = $blad->getMessage();
		}

		return $dane;
	}

	/**
	 * Program kursu razem z adresami lekcji w Tutorze.
	 *
	 * Adresy zbieramy JEDNYM przejściem po wpisach, a nie pytaniem o każdą
	 * lekcję osobno: kurs o Claude ma 41 lekcji, więc „po jednym" znaczyłoby
	 * 41 zapytań o meta przy każdym wyświetleniu strony.
	 *
	 * @param string $id_kursu Identyfikator kursu.
	 *
	 * @return array<int,array<string,mixed>>
	 */
	private static function program( string $id_kursu ): array {
		global $wpdb;

		$t_moduly = Aai_Sklep_Tabele::tabela( 'modules' );
		$t_lekcje = Aai_Sklep_Tabele::tabela( 'lessons' );

		$wiersze = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT m.id AS modul_id, m.position AS modul_pozycja, m.title AS modul_tytul,
				        l.id AS lekcja_id, l.position AS lekcja_pozycja, l.title AS lekcja_tytul,
				        l.duration_min, CHAR_LENGTH(l.content) AS znakow
				   FROM `$t_moduly` m
				   LEFT JOIN `$t_lekcje` l ON l.module_id = m.id
				  WHERE m.course_id = %s
				  ORDER BY m.position, l.position", // phpcs:ignore WordPress.DB.PreparedSQL
				$id_kursu
			),
			ARRAY_A
		);

		$adresy = self::adresy_lekcji( $id_kursu );

		$program = array();
		foreach ( (array) $wiersze as $wiersz ) {
			$modul_id = (string) $wiersz['modul_id'];
			if ( ! isset( $program[ $modul_id ] ) ) {
				$program[ $modul_id ] = array(
					'id'      => $modul_id,
					'nr'      => (int) $wiersz['modul_pozycja'] + 1,
					'tytul'   => (string) $wiersz['modul_tytul'],
					'lekcje'  => array(),
				);
			}
			if ( null === $wiersz['lekcja_id'] ) {
				continue;
			}
			$id_lekcji = (string) $wiersz['lekcja_id'];
			$program[ $modul_id ]['lekcje'][] = array(
				'id'      => $id_lekcji,
				'nr'      => (int) $wiersz['lekcja_pozycja'] + 1,
				'modul'   => (int) $wiersz['modul_pozycja'] + 1,
				'tytul'   => (string) $wiersz['lekcja_tytul'],
				'minuty'  => (int) $wiersz['duration_min'],
				'znakow'  => (int) $wiersz['znakow'],
				'adres'   => $adresy[ $id_lekcji ]['adres'] ?? '',
				'post_id' => $adresy[ $id_lekcji ]['id'] ?? 0,
			);
		}

		return array_values( $program );
	}

	/**
	 * Mapa `nasze id lekcji → [id wpisu, adres]` dla całego kursu.
	 *
	 * @param string $id_kursu Identyfikator kursu.
	 *
	 * @return array<string,array<string,mixed>>
	 */
	private static function adresy_lekcji( string $id_kursu ): array {
		$typy      = Aai_Sklep_Tutor::typy();
		$kurs_post = get_posts(
			array(
				'post_type'   => $typy['kurs'],
				'post_status' => 'any',
				'numberposts' => 1,
				'fields'      => 'ids',
				'meta_key'    => Aai_Sklep_Tutor::META_UUID, // phpcs:ignore WordPress.DB.SlowDBQuery
				'meta_value'  => $id_kursu, // phpcs:ignore WordPress.DB.SlowDBQuery
			)
		);
		if ( ! $kurs_post ) {
			return array();
		}

		$moduly = get_posts(
			array(
				'post_type'   => $typy['modul'],
				'post_status' => 'any',
				'post_parent' => (int) $kurs_post[0],
				'numberposts' => -1,
				'fields'      => 'ids',
			)
		);
		if ( ! $moduly ) {
			return array();
		}

		$lekcje = get_posts(
			array(
				'post_type'    => $typy['lekcja'],
				'post_status'  => 'any',
				'post_parent__in' => array_map( 'intval', (array) $moduly ),
				'numberposts'  => -1,
			)
		);

		$mapa = array();
		foreach ( (array) $lekcje as $wpis ) {
			$uuid = (string) get_post_meta( $wpis->ID, Aai_Sklep_Tutor::META_UUID, true );
			if ( '' === $uuid ) {
				continue;
			}
			$mapa[ $uuid ] = array(
				'id'    => (int) $wpis->ID,
				'adres' => (string) get_permalink( $wpis ),
			);
		}
		return $mapa;
	}

	/**
	 * Czy ten użytkownik ma prawo czytać tę lekcję — pyta TUTORA.
	 *
	 * @param int  $id_postu   Wpis lekcji.
	 * @param bool $zapowiedz  Czy lekcja jest oznaczona jako zapowiedź.
	 */
	private static function czy_wolno( int $id_postu, bool $zapowiedz ): bool {
		if ( current_user_can( 'manage_options' ) ) {
			return true;
		}
		if ( function_exists( 'tutor_utils' ) ) {
			$odpowiedz = tutor_utils()->has_enrolled_content_access( 'lesson', $id_postu );
			if ( $odpowiedz ) {
				return true;
			}
		}
		return $zapowiedz;
	}

	/**
	 * Dokąd prowadzi strzałka „wróć" w pigułce lekcji.
	 *
	 * DLACZEGO TO NIE JEST ZAWSZE STRONA KURSU. Bo dla KUPUJĄCEGO strona
	 * sprzedażowa jest ślepym zaułkiem: próbuje mu sprzedać coś, co już ma,
	 * a jedynym wyjściem z niej jest przycisk „Dołącz". Właściciel złapał to
	 * w teście ręcznym W6 — cofnął się z lekcji i wylądował na cenniku.
	 * Kto ma kurs, wraca więc do „Moich kursów"; kto go nie ma (gość na
	 * darmowej zapowiedzi, ktoś, kto trafił z wyszukiwarki), dalej trafia na
	 * stronę sprzedażową, bo dla NIEGO to jest właściwe następne miejsce.
	 *
	 * Pytamy Tutora o zapis na kurs, a nie o `dostep` z tego widoku: `dostep`
	 * jest prawdziwy także dla zapowiedzi i dla administratora, więc gość
	 * czytający darmową lekcję dostałby odnośnik do pustej listy.
	 *
	 * @param int    $id_postu Wpis lekcji w Tutorze.
	 * @param string $slug     Slug kursu w naszych tabelach.
	 * @return array{adres:string,etykieta:string}
	 */
	private static function wroc( int $id_postu, string $slug ): array {
		$kupiony = false;
		if ( is_user_logged_in() && function_exists( 'tutor_utils' ) ) {
			$id_kursu = (int) tutor_utils()->get_course_id_by_content( $id_postu );
			$kupiony  = $id_kursu > 0
				&& (bool) tutor_utils()->is_enrolled( $id_kursu, get_current_user_id() );
		}

		if ( $kupiony && class_exists( 'Aai_Sklep_Moje' ) ) {
			return array(
				'adres'    => Aai_Sklep_Moje::adres(),
				'etykieta' => 'Wróć do moich kursów',
			);
		}

		return array(
			'adres'    => Aai_Sklep_Widok::adres_kursu( $slug ),
			'etykieta' => 'Wróć na stronę kursu',
		);
	}

	/**
	 * Czy lekcja jest odhaczona jako przerobiona (stan trzyma Tutor).
	 *
	 * @param int $id_postu Wpis lekcji.
	 */
	public static function ukonczona( int $id_postu ): bool {
		if ( ! function_exists( 'tutor_utils' ) || ! is_user_logged_in() ) {
			return false;
		}
		return (bool) tutor_utils()->is_completed_lesson( $id_postu, get_current_user_id() );
	}

	/**
	 * Ile lekcji kursu ten użytkownik ma już odhaczonych.
	 *
	 * @param array<int,array<string,mixed>> $program Program z `dane()`.
	 */
	public static function ile_ukonczonych( array $program ): int {
		$ile = 0;
		foreach ( $program as $modul ) {
			foreach ( $modul['lekcje'] as $lekcja ) {
				if ( $lekcja['post_id'] > 0 && self::ukonczona( (int) $lekcja['post_id'] ) ) {
					++$ile;
				}
			}
		}
		return $ile;
	}
}
