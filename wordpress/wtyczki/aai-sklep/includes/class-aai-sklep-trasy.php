<?php
/**
 * Trasy sklepu: `/szkolenia` i `/szkolenia/<slug>` renderowane z naszych tabel.
 *
 * DLACZEGO REGUŁY PRZEPISYWANIA, A NIE STRONY WORDPRESSA. Bo źródłem prawdy
 * o kursie są NASZE tabele (decyzja właściciela 2026-08-25). Gdyby katalog był
 * stroną WP, a kurs wpisem, mielibyśmy trzecią kopię treści obok naszych tabel
 * i kopii w Tutorze — i trzeba by pilnować, żeby ktoś nie skasował strony
 * z kokpitu. Trasa nie jest treścią: nie da się jej przypadkiem edytować,
 * a adres wygląda dokładnie tak, jak w prototypie.
 *
 * PRZEKIEROWANIA Z `/courses/*` (decyzja właściciela 2026-08-25). Tutor tworzy
 * własne wpisy kursów i własne adresy. To NIE jest produkt — to techniczna kopia
 * dla LMS-a, który daje konta i dostęp za logowaniem. Klient ma widzieć jeden
 * adres kanoniczny i jeden wygląd, więc `/courses/<slug>/` idzie na
 * `/szkolenia/<slug>`, a `/courses/` na `/szkolenia`. Adresy LEKCJI zostają
 * Tutora — nasze szablony wchodzą tam dopiero w W5.
 *
 * @package Aai_Sklep
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Rejestracja tras i wybór szablonu.
 */
final class Aai_Sklep_Trasy {

	/**
	 * Wersja REGUŁ przepisywania — osobna od wersji wtyczki.
	 *
	 * Reguły trzeba przepłukać, gdy się ZMIENIĄ, a nie przy każdym wydaniu:
	 * `flush_rewrite_rules()` przepisuje całą tablicę reguł WordPressa i jest
	 * kosztowne. Bez tego licznika aktualizacja wtyczki przez FTP zostawiłaby
	 * stare reguły i nowy kod — czyli 404 na stronie, której plik istnieje.
	 */
	private const WERSJA_REGUL = '2';

	/** Opcja z wersją przepłukanych reguł. */
	private const OPCJA_REGUL = 'aai_sklep_wersja_regul';

	/** Uchwyty naszych zasobów. */
	private const UCHWYT_CSS = 'aai-sklep-front';
	private const UCHWYT_JS  = 'aai-sklep-front';

	/**
	 * Typ wpisu kursów w Tutorze — pytamy o niego TUTORA, nie wpisujemy
	 * na sztywno (nazwa bywała konfigurowalna), ale znamy wartość domyślną
	 * na wypadek, gdyby Tutora nie było wcale.
	 */
	private const TYP_TUTORA = 'courses';

	/**
	 * Rejestracja — wołane raz, z pliku głównego wtyczki.
	 */
	public static function zarejestruj(): void {
		add_action( 'init', array( self::class, 'dodaj_reguly' ) );
		add_action( 'init', array( self::class, 'przeplucz_gdy_trzeba' ), 20 );
		add_filter( 'query_vars', array( self::class, 'dodaj_zmienne' ) );

		// Priorytet 1: PRZED czymkolwiek, co mogłoby wysłać własne
		// przekierowanie albo zdążyć wydrukować nagłówki.
		add_action( 'template_redirect', array( self::class, 'przekieruj_z_tutora' ), 1 );
		add_action( 'template_redirect', array( self::class, 'ustal_odpowiedz' ), 2 );

		add_filter( 'template_include', array( self::class, 'wybierz_szablon' ) );
		add_filter( 'body_class', array( self::class, 'dodaj_klase_body' ) );
		add_action( 'wp_enqueue_scripts', array( self::class, 'dodaj_zasoby' ), 1000 );
	}

	/**
	 * NASZE podstrony pod `/szkolenia/`: ścieżka => nazwa widoku.
	 *
	 * JEDNO ŹRÓDŁO dla trzech rzeczy: reguł przepisywania, listy widoków
	 * i slugów zarezerwowanych dla kursów (`zarezerwowane_slugi()`).
	 *
	 * @var array<string,string>
	 */
	private const PODSTRONY = array( Aai_Sklep_Moje::SCIEZKA => 'moje' );

	/**
	 * Reguły przepisywania. `top` — przed regułami WordPressa, żeby jego
	 * własne zgadywanie adresu (to ono odsyłało dziś `/szkolenia/<slug>`
	 * na `/courses/<slug>/`) nie miało już czego zgadywać.
	 */
	public static function dodaj_reguly(): void {
		add_rewrite_rule( '^szkolenia/?$', 'index.php?aai_widok=katalog', 'top' );
		/*
		 * KOLEJNOŚĆ MA ZNACZENIE: nasze podstrony muszą być dopasowane ZANIM
		 * zadziała reguła slugu, inaczej WordPress wziąłby je za adres kursu.
		 * Reguły `top` są sprawdzane w kolejności dodania.
		 */
		foreach ( self::PODSTRONY as $sciezka => $widok ) {
			add_rewrite_rule( '^' . $sciezka . '/?$', 'index.php?aai_widok=' . $widok, 'top' );
		}
		add_rewrite_rule(
			'^szkolenia/([^/]+)/?$',
			'index.php?aai_widok=kurs&aai_slug=$matches[1]',
			'top'
		);
	}

	/**
	 * Slugi, których kursowi nadać NIE WOLNO.
	 *
	 * Adres kursu i adres naszej podstrony mieszkają w tej samej przestrzeni
	 * `/szkolenia/<coś>/`, a reguła podstrony jest sprawdzana pierwsza. Kurs
	 * o slugu `moje` wchodziłby więc do katalogu i miał kartę, ale jego strona
	 * sprzedażowa nie istniałaby — kliknięcie karty prowadziłoby na „Moje
	 * kursy". Nic by się przy tym nie zapaliło: dane poprawne, strona 200,
	 * tylko sprzedaż niemożliwa. Stąd odmowa NA WEJŚCIU, w kontrakcie.
	 *
	 * Lista wyprowadza się z `PODSTRONY`, czyli z tego samego miejsca, z
	 * którego powstają reguły przepisywania — druga lista rozjechałaby się
	 * przy pierwszej nowej podstronie.
	 *
	 * @return array<int,string>
	 */
	public static function zarezerwowane_slugi(): array {
		$slugi = array();
		foreach ( array_keys( self::PODSTRONY ) as $sciezka ) {
			$czesci  = explode( '/', trim( (string) $sciezka, '/' ) );
			$slugi[] = (string) end( $czesci );
		}
		return $slugi;
	}

	/**
	 * Przepłukanie reguł po zmianie ich wersji albo po aktywacji.
	 */
	public static function przeplucz_gdy_trzeba(): void {
		if ( get_option( self::OPCJA_REGUL ) === self::WERSJA_REGUL ) {
			return;
		}
		flush_rewrite_rules();
		update_option( self::OPCJA_REGUL, self::WERSJA_REGUL );
	}

	/**
	 * Wymuszenie przepłukania — wołane przy aktywacji wtyczki.
	 */
	public static function wymus_przeplukanie(): void {
		delete_option( self::OPCJA_REGUL );
	}

	/**
	 * Nasze zmienne zapytania.
	 *
	 * @param string[] $zmienne Zmienne WordPressa.
	 * @return string[]
	 */
	public static function dodaj_zmienne( array $zmienne ): array {
		$zmienne[] = 'aai_widok';
		$zmienne[] = 'aai_slug';
		return $zmienne;
	}

	/**
	 * Który widok obsługuje bieżące żądanie: `katalog`, `kurs` albo null.
	 */
	public static function widok(): ?string {
		$widok = get_query_var( 'aai_widok' );
		$znane = array_merge( array( 'katalog', 'kurs' ), array_values( self::PODSTRONY ) );
		return in_array( $widok, $znane, true ) ? $widok : null;
	}

	/**
	 * Slug kursu z adresu.
	 */
	public static function slug(): string {
		return (string) get_query_var( 'aai_slug' );
	}

	/**
	 * Czy oglądający ma prawo widzieć szkice.
	 *
	 * W prototypie rozstrzygał o tym token bramy kreatora; tutaj rozstrzyga
	 * uprawnienie WordPressa. Dla wszystkich innych kurs w statusie `draft`
	 * po prostu nie istnieje — trasa oddaje 404, nie „brak dostępu".
	 */
	public static function widzi_szkice(): bool {
		return current_user_can( Aai_Sklep_Panel::UPRAWNIENIE );
	}

	/**
	 * Kurs bieżącego żądania — wczytywany RAZ na żądanie.
	 *
	 * Pyta o niego szablon, dane strukturalne i tytuł dokumentu; bez pamięci
	 * podręcznej byłyby to trzy komplety zapytań o ten sam kurs.
	 *
	 * @return array<string,mixed>|null
	 */
	public static function kurs(): ?array {
		static $kurs   = null;
		static $pytano = false;

		if ( ! $pytano ) {
			$pytano = true;
			$slug   = self::slug();
			if ( 'kurs' === self::widok() && '' !== $slug ) {
				$kurs = Aai_Sklep_Odczyt::szczegoly_kursu( $slug, self::widzi_szkice() );
			}
		}
		return $kurs;
	}

	/**
	 * Kod odpowiedzi i flagi zapytania.
	 *
	 * DLACZEGO TU, A NIE W `parse_query`. Bo `WP::handle_404()` biegnie już po
	 * `parse_query` i potrafi ustawić 404 na zapytaniu, które nie znalazło
	 * wpisów — a nasze strony żadnych wpisów nie mają i mieć nie będą.
	 * `template_redirect` jest pierwszym punktem PO tamtej decyzji, więc
	 * ustawiony tutaj kod jest ostateczny.
	 */
	public static function ustal_odpowiedz(): void {
		global $wp_query;

		$widok = self::widok();
		if ( null === $widok ) {
			return;
		}

		// Nieznany albo nieopublikowany kurs to prawdziwe 404 — z kodem
		// odpowiedzi, nie samą stroną. Strona, która wygląda na „nie ma",
		// a oddaje 200, zostaje w indeksie wyszukiwarki na zawsze.
		if ( 'kurs' === $widok && null === self::kurs() ) {
			$wp_query->set_404();
			status_header( 404 );
			nocache_headers();
			return;
		}

		$wp_query->is_404     = false;
		$wp_query->is_home    = false;
		$wp_query->is_archive = false;
		status_header( 200 );
	}

	/**
	 * Wybór szablonu.
	 *
	 * @param string $szablon Szablon wybrany przez WordPressa.
	 */
	public static function wybierz_szablon( string $szablon ): string {
		$widok = self::widok();
		if ( null === $widok ) {
			/*
			 * KAŻDE 404 dostaje naszą stronę — nie tylko to spod
			 * `/szkolenia`. Motyw nie ma `404.php`, więc WordPress spadał
			 * na `index.php`, a ten na pustej pętli nie drukuje nic:
			 * klient widział nagłówek, białą pustkę i stopkę, czyli stronę
			 * wyglądającą na awarię. Zmierzone przy teście całości
			 * (2026-08-31): `<main>` miał 24 znaki na `/cart/`,
			 * `/checkout/` i `/courses/nie-ma/` wobec 898 na naszej
			 * stronie 404. Dwa z tych adresów sami stworzyliśmy —
			 * `/cart/` i `/checkout/` żyły do czasu, aż zmieniliśmy slugi
			 * koszyka i kasy na polskie.
			 */
			return is_404() ? AAI_SKLEP_KATALOG . 'szablony/nie-znaleziono.php' : $szablon;
		}

		if ( 'kurs' === $widok ) {
			return null === self::kurs()
				? AAI_SKLEP_KATALOG . 'szablony/nie-znaleziono.php'
				: AAI_SKLEP_KATALOG . 'szablony/kurs.php';
		}
		if ( 'moje' === $widok ) {
			/*
			 * Treść zależy od KONTA oglądającego, więc odpowiedzi nie wolno
			 * odłożyć na półkę. Bez tych nagłówków cache strony albo CDN bez
			 * reguły na ciasteczko logowania mógłby wydać listę kursów
			 * jednego klienta drugiemu. Ta sama przesłanka, dla której ten
			 * widok dostał `noindex`.
			 */
			nocache_headers();
			return AAI_SKLEP_KATALOG . 'szablony/moje.php';
		}
		return AAI_SKLEP_KATALOG . 'szablony/katalog.php';
	}

	/**
	 * Klasy `body` naszych stron — z nich korzysta arkusz i smoke.
	 *
	 * @param string[] $klasy Klasy WordPressa.
	 * @return string[]
	 */
	public static function dodaj_klase_body( array $klasy ): array {
		$widok = self::widok();
		if ( null === $widok ) {
			return $klasy;
		}
		$klasy[] = 'aai-sklep';
		$klasy[] = 'aai-sklep-' . $widok;
		return $klasy;
	}

	/**
	 * Nasz arkusz i skrypt — wyłącznie na naszych stronach.
	 *
	 * Priorytet 1000, czyli PO higienie zasobów (`Aai_Sklep_Zasoby`, 999):
	 * gdyby nasz arkusz wszedł do kolejki wcześniej, sprzątanie po prefiksach
	 * mogłoby go kiedyś zabrać razem z cudzymi.
	 *
	 * Zależność od `automatic-ai` daje dwie rzeczy naraz: nasze reguły są
	 * drukowane PO arkuszu motywu, a jego tokeny (`--color-volt` i reszta)
	 * na pewno już istnieją, gdy nasze `var()` po nie sięgają.
	 */
	public static function dodaj_zasoby(): void {
		if ( null === self::widok() ) {
			return;
		}

		$css = 'assets/sklep.css';
		wp_enqueue_style(
			self::UCHWYT_CSS,
			AAI_SKLEP_URL . $css,
			array( 'automatic-ai' ),
			(string) filemtime( AAI_SKLEP_KATALOG . $css )
		);

		$js = 'assets/sklep.js';
		wp_enqueue_script(
			self::UCHWYT_JS,
			AAI_SKLEP_URL . $js,
			array(),
			(string) filemtime( AAI_SKLEP_KATALOG . $js ),
			true
		);
	}

	/**
	 * 301 ze stron Tutora na nasze adresy.
	 *
	 * Slug bierzemy z NASZYCH tabel po `_aai_zrodlo_uuid` — to klucz, którym
	 * import wiąże obie kopie, i to nasze tabele są źródłem prawdy. `post_name`
	 * zostaje jako awaria: dziś jest równy naszemu slugowi, ale wystarczy, że
	 * ktoś zmieni odnośnik wpisu w kokpicie Tutora, i przestanie być.
	 */
	public static function przekieruj_z_tutora(): void {
		$typ = self::typ_tutora();

		if ( is_post_type_archive( $typ ) ) {
			wp_safe_redirect( Aai_Sklep_Widok::adres_kursu(), 301 );
			exit;
		}

		if ( ! is_singular( $typ ) ) {
			return;
		}

		$wpis = get_queried_object();
		if ( ! $wpis instanceof WP_Post ) {
			return;
		}

		$slug = self::slug_po_uuid( (string) get_post_meta( $wpis->ID, '_aai_zrodlo_uuid', true ) )
			?? $wpis->post_name;

		if ( '' === $slug ) {
			return;
		}
		wp_safe_redirect( Aai_Sklep_Widok::adres_kursu( $slug ), 301 );
		exit;
	}

	/**
	 * Nazwa typu wpisu kursów — z Tutora, gdy jest.
	 */
	private static function typ_tutora(): string {
		if ( function_exists( 'tutor' ) && ! empty( tutor()->course_post_type ) ) {
			return (string) tutor()->course_post_type;
		}
		return self::TYP_TUTORA;
	}

	/**
	 * Slug kursu w naszych tabelach po identyfikatorze źródłowym.
	 *
	 * @param string $uuid Identyfikator z `_aai_zrodlo_uuid`.
	 */
	private static function slug_po_uuid( string $uuid ): ?string {
		global $wpdb;

		if ( '' === $uuid ) {
			return null;
		}
		$t_kursy = Aai_Sklep_Tabele::tabela( 'courses' );
		$slug    = $wpdb->get_var(
			$wpdb->prepare( "SELECT slug FROM `$t_kursy` WHERE id = %s", $uuid )
		);
		return null === $slug ? null : (string) $slug;
	}
}
