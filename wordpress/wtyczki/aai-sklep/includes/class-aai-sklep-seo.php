<?php
/**
 * Tytuł, opis, kanonik, OpenGraph i dane strukturalne naszych stron.
 *
 * DLACZEGO WTYCZKA, A NIE MOTYW. Motyw Automatic AI przejął cały `<head>`:
 * zdejmuje `rel_canonical` i `wp_shortlink_wp_head`, a tytuł, opis i OpenGraph
 * bierze z post meta `_aai_*` — czyli z danych, które ma tylko WPIS. Nasze
 * strony wpisami nie są (renderuje je reguła przepisywania z naszych tabel),
 * więc bez tej klasy `/szkolenia` nie dostałoby ANI kanonika, ANI opisu, ANI
 * poprawnego tytułu. Objaw jest cichy: strona wygląda dobrze i jest niewidoczna
 * dla wyszukiwarki.
 *
 * ZASADA Z PROTOTYPU, KTÓRA ZOSTAJE (`lib/jsonld.ts`): dane strukturalne nie
 * mówią NICZEGO, czego nie widać na stronie. Każdy węzeł powstaje z tego samego
 * obiektu kursu, który renderuje szablon — cena, poziom i program nie mają jak
 * rozjechać się z treścią, a FAQ wchodzi tylko wtedy, gdy sekcja FAQ naprawdę
 * jest na stronie.
 *
 * `Organization` i `WebSite` emituje już nagłówek motywu — nie powtarzamy ich,
 * bo dwa sprzeczne opisy tej samej marki są gorsze niż jeden.
 *
 * INDEKSOWANIA NIE RUSZAMY: rozstrzyga o nim ustawienie WordPressa
 * („widoczność dla wyszukiwarek"), które i tak dokłada `noindex` przez
 * `wp_robots`. Drugie, własne ustawienie byłoby trzecią wersją prawdy.
 *
 * @package Aai_Sklep
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Metadane i dane strukturalne stron sklepu.
 */
final class Aai_Sklep_Seo {

	/** Marka — ten sam napis, co w tytułach prototypu. */
	private const MARKA = 'Automatic AI';

	/**
	 * Tytuł katalogu.
	 *
	 * Sam „Szkolenia" dawał w wynikach wyszukiwania nazwę kategorii bez tematu
	 * (audyt SEO na żywym adresie zgłosił go jako za krótki). Ten mówi, CZEGO
	 * uczą kursy, i mieści się w tym, co Google pokazuje.
	 */
	private const TYTUL_KATALOGU = 'Szkolenia z AI i automatyzacji procesów';

	/**
	 * Opis katalogu.
	 *
	 * BEZ SŁOWA „ebooki" — właściciel zamknął ten temat na zawsze 2026-08-25
	 * („E-BOOKI: NIGDY"), a produktem jest wyłącznie kurs tekstowy za
	 * logowaniem. Opis, który obiecuje produkt, którego nie ma, to ta sama
	 * klasa usterki, którą naprawiał audyt kursów w 0.33.0.
	 */
	private const OPIS_KATALOGU = 'Kursy Automatic AI — systemy pracy z AI, Claude i GitHubem, nie kolejne nagrania do obejrzenia.';

	/** Poziom kursu → słownik schema.org. */
	private const POZIOM_SCHEMA = array(
		'podstawowy'          => 'Beginner',
		'sredniozaawansowany' => 'Intermediate',
		'zaawansowany'        => 'Advanced',
	);

	/**
	 * Rejestracja — wołane raz, z pliku głównego wtyczki.
	 */
	public static function zarejestruj(): void {
		// Priorytet 20: PO filtrze motywu (ten stoi na domyślnym 10 i dla
		// naszych stron przepuszcza tytuł bez zmian). Ustawiony później,
		// nasz ma ostatnie słowo.
		add_filter( 'pre_get_document_title', array( self::class, 'tytul' ), 20 );

		// Priorytet 2: tuż po znacznikach motywu, przed resztą `wp_head`.
		add_action( 'wp_head', array( self::class, 'znaczniki' ), 2 );
	}

	/**
	 * Tytuł dokumentu.
	 *
	 * @param string $tytul Tytuł wyliczony wcześniej.
	 */
	public static function tytul( string $tytul ): string {
		$widok = Aai_Sklep_Trasy::widok();
		if ( null === $widok ) {
			return $tytul;
		}

		if ( 'katalog' === $widok ) {
			return self::TYTUL_KATALOGU . ' — ' . self::MARKA;
		}
		if ( 'moje' === $widok ) {
			return 'Moje kursy — ' . self::MARKA;
		}

		$kurs = Aai_Sklep_Trasy::kurs();
		if ( null === $kurs ) {
			return 'Nie znaleziono — ' . self::MARKA;
		}
		return $kurs['title'] . ' — ' . self::MARKA;
	}

	/**
	 * Znaczniki `<head>`: opis, kanonik, OpenGraph, Twitter, JSON-LD.
	 */
	public static function znaczniki(): void {
		$widok = Aai_Sklep_Trasy::widok();
		if ( null === $widok ) {
			return;
		}

		/*
		 * „MOJE KURSY" NIE MA PRAWA WEJŚĆ DO WYSZUKIWARKI. To strona prywatna:
		 * jej treść zależy od konta oglądającego, a robot indeksujący jest
		 * gościem, więc zaindeksowałby pustą zachętę do logowania pod adresem
		 * marki. Zamiast kanonika i OpenGraphu dostaje więc `noindex` — tak
		 * samo jak widok lekcji (W5).
		 */
		if ( 'moje' === $widok ) {
			echo '<meta name="robots" content="noindex, nofollow"/>' . "\n";
			return;
		}

		$kurs = 'kurs' === $widok ? Aai_Sklep_Trasy::kurs() : null;
		if ( 'kurs' === $widok && null === $kurs ) {
			// Strona, której nie ma, nie ma też prawa mieć kanonika ani
			// OpenGraphu — inaczej podsuwalibyśmy wyszukiwarce adres
			// oddający 404.
			return;
		}

		$tytul  = 'katalog' === $widok ? self::TYTUL_KATALOGU : (string) $kurs['title'];
		$opis   = 'katalog' === $widok ? self::OPIS_KATALOGU : (string) ( $kurs['short_desc'] ?? '' );
		$adres  = Aai_Sklep_Widok::adres_kursu( 'katalog' === $widok ? null : $kurs['slug'] );
		$obrazek = null === $kurs ? null : self::obrazek( $kurs );

		if ( '' !== $opis ) {
			printf( '<meta name="description" content="%s"/>' . "\n", esc_attr( $opis ) );
		}
		printf( '<link rel="canonical" href="%s"/>' . "\n", esc_url( $adres ) );

		printf( '<meta property="og:type" content="website"/>' . "\n" );
		printf( '<meta property="og:site_name" content="%s"/>' . "\n", esc_attr( self::MARKA ) );
		printf( '<meta property="og:locale" content="pl_PL"/>' . "\n" );
		printf( '<meta property="og:url" content="%s"/>' . "\n", esc_url( $adres ) );
		printf( '<meta property="og:title" content="%s"/>' . "\n", esc_attr( $tytul ) );
		printf( '<meta name="twitter:card" content="summary_large_image"/>' . "\n" );
		printf( '<meta name="twitter:title" content="%s"/>' . "\n", esc_attr( $tytul ) );
		if ( '' !== $opis ) {
			printf( '<meta property="og:description" content="%s"/>' . "\n", esc_attr( $opis ) );
			printf( '<meta name="twitter:description" content="%s"/>' . "\n", esc_attr( $opis ) );
		}
		if ( null !== $obrazek ) {
			printf( '<meta property="og:image" content="%s"/>' . "\n", esc_url( $obrazek ) );
			printf( '<meta name="twitter:image" content="%s"/>' . "\n", esc_url( $obrazek ) );
		}

		foreach ( self::dane_strukturalne( $widok, $kurs ) as $wezel ) {
			self::wypisz_jsonld( $wezel );
		}
	}

	/**
	 * Obrazek OpenGraph — TYLKO rastrowa okładka.
	 *
	 * Okładki kursów bywają u nas plikami SVG, a scrapery mediów
	 * społecznościowych SVG odrzucają. Podanie adresu, którego druga strona
	 * nie przyjmie, jest gorsze niż niepodanie żadnego: wygląda na zrobione.
	 * Własna miniatura per kurs (w prototypie robił ją `next/og`) czeka na
	 * osobny krok.
	 *
	 * @param array<string,mixed> $kurs Kurs z bazy.
	 */
	private static function obrazek( array $kurs ): ?string {
		// Ten sam rozstrzygacz, co w karcie katalogu — inaczej strona
		// pokazywałaby jedną okładkę, a scraper dostawałby adres innej.
		$okladka = Aai_Sklep_Widok::okladka( $kurs['cover_url'] ?? null );
		if ( null === $okladka ) {
			return null;
		}
		$sciezka = (string) wp_parse_url( $okladka, PHP_URL_PATH );
		return preg_match( '~\.(png|jpe?g|webp)$~i', $sciezka ) ? $okladka : null;
	}

	/**
	 * Węzły JSON-LD dla bieżącej strony.
	 *
	 * @param string                   $widok Widok (`katalog` albo `kurs`).
	 * @param array<string,mixed>|null $kurs  Kurs, gdy widok to `kurs`.
	 * @return array<int,array<string,mixed>>
	 */
	private static function dane_strukturalne( string $widok, ?array $kurs ): array {
		$okruszki = array(
			array( 'nazwa' => self::MARKA, 'adres' => home_url( '/' ) ),
			array( 'nazwa' => 'Szkolenia', 'adres' => Aai_Sklep_Widok::adres_kursu() ),
		);

		if ( 'katalog' === $widok ) {
			return array(
				self::lista_katalogu( Aai_Sklep_Odczyt::lista_kursow() ),
				self::okruszki( $okruszki ),
			);
		}

		$okruszki[] = array(
			'nazwa' => (string) $kurs['title'],
			'adres' => Aai_Sklep_Widok::adres_kursu( (string) $kurs['slug'] ),
		);

		$wezly = array( self::kurs( $kurs ), self::okruszki( $okruszki ) );

		/*
		 * FAQ wchodzi do danych strukturalnych TYLKO wtedy, gdy strona
		 * naprawdę je rysuje. Pytamy o to `Aai_Sklep_Sekcje::renderowane()`,
		 * czyli tej samej listy, z której korzysta szablon — inaczej dałoby
		 * się usunąć sekcję ze strony i zostawić obietnicę w `FAQPage`.
		 */
		$faq = $kurs['sections']['faq'] ?? null;
		if ( is_array( $faq ) && ! empty( $faq['pytania'] )
			&& in_array( 'faq', Aai_Sklep_Sekcje::renderowane(), true ) ) {
			$wezly[] = self::faq( $faq['pytania'] );
		}
		return $wezly;
	}

	/**
	 * Katalog jako lista produktów — kolejność taka jak w siatce na stronie.
	 *
	 * @param array<int,array<string,mixed>> $kursy Kursy.
	 * @return array<string,mixed>
	 */
	private static function lista_katalogu( array $kursy ): array {
		$pozycje = array();
		foreach ( $kursy as $i => $k ) {
			$pozycje[] = array(
				'@type'    => 'ListItem',
				'position' => $i + 1,
				'url'      => Aai_Sklep_Widok::adres_kursu( (string) $k['slug'] ),
				'name'     => (string) $k['title'],
			);
		}
		return array(
			'@context'        => 'https://schema.org',
			'@type'           => 'ItemList',
			'name'            => 'Kursy ' . self::MARKA,
			'numberOfItems'   => count( $kursy ),
			'itemListElement' => $pozycje,
		);
	}

	/**
	 * Kurs jako `Course` z ofertą.
	 *
	 * DOSTĘPNOŚĆ ROZSTRZYGA TEN, KTO PROWADZI SPRZEDAŻ. Domyślnie `PreOrder`,
	 * bo bez Pluginu 2 przycisk prowadzi do kontaktu — `InStock` byłoby wtedy
	 * deklaracją, że da się kupić od ręki, czyli zmyślaniem, a Google traktuje
	 * rozjazd oferty z rzeczywistością jako powód do kary. Plugin 2 podmienia
	 * to na `InStock` DOKŁADNIE wtedy, gdy przycisk prowadzi do kasy — jedna
	 * decyzja („czy da się kupić"), dwa jej wyrazy: przycisk dla człowieka
	 * i dostępność dla wyszukiwarki. Rozjazd między nimi jest niemożliwy,
	 * bo pytają tego samego.
	 *
	 * @param array<string,mixed> $kurs Kurs z bazy.
	 * @return array<string,mixed>
	 */
	private static function kurs( array $kurs ): array {
		$adres = Aai_Sklep_Widok::adres_kursu( (string) $kurs['slug'] );

		$wezel = array(
			'@context'   => 'https://schema.org',
			'@type'      => 'Course',
			'name'       => (string) $kurs['title'],
			'url'        => $adres,
			'inLanguage' => 'pl-PL',
			'provider'   => array(
				'@type' => 'Organization',
				'name'  => self::MARKA,
				'url'   => home_url( '/' ),
			),
			'offers'     => array(
				'@type'         => 'Offer',
				'price'         => number_format( Aai_Sklep_Widok::cena_grosze( $kurs ) / 100, 2, '.', '' ),
				'priceCurrency' => 'PLN',
				/**
				 * Dostępność oferty w danych strukturalnych.
				 *
				 * @param string              $dostepnosc Pełny adres schema.org.
				 * @param array<string,mixed> $kurs       Kurs z bazy.
				 */
				'availability'  => (string) apply_filters(
					'aai_sklep_dostepnosc_kursu',
					'https://schema.org/PreOrder',
					$kurs
				),
				'category'      => 'Paid',
				'url'           => $adres,
			),
		);

		if ( ! empty( $kurs['short_desc'] ) ) {
			$wezel['description'] = (string) $kurs['short_desc'];
		}
		$poziom = $kurs['level'] ?? null;
		if ( is_string( $poziom ) && isset( self::POZIOM_SCHEMA[ $poziom ] ) ) {
			$wezel['educationalLevel'] = self::POZIOM_SCHEMA[ $poziom ];
		}

		// Program wchodzi do danych strukturalnych tylko wtedy, gdy jest też
		// na stronie — sekcja programu znika, gdy kurs nie ma modułów.
		if ( ! empty( $kurs['modules'] ) ) {
			$sekcje = array();
			foreach ( $kurs['modules'] as $modul ) {
				$sekcja = array(
					'@type'    => 'Syllabus',
					'position' => (int) $modul['position'],
					'name'     => (string) $modul['title'],
				);
				if ( ! empty( $modul['summary'] ) ) {
					$sekcja['description'] = (string) $modul['summary'];
				}
				$sekcje[] = $sekcja;
			}
			$wezel['syllabusSections'] = $sekcje;

			$instancja = array( '@type' => 'CourseInstance', 'courseMode' => 'online' );
			$minuty    = (int) $kurs['total_min'];
			if ( $minuty > 0 ) {
				$instancja['courseWorkload'] = self::czas_iso( $minuty );
			}
			$wezel['hasCourseInstance'] = array( $instancja );
		}

		return $wezel;
	}

	/**
	 * Okruszki: gdzie użytkownik jest w strukturze serwisu.
	 *
	 * @param array<int,array<string,string>> $sciezka Kroki ścieżki.
	 * @return array<string,mixed>
	 */
	private static function okruszki( array $sciezka ): array {
		$pozycje = array();
		foreach ( $sciezka as $i => $krok ) {
			$pozycje[] = array(
				'@type'    => 'ListItem',
				'position' => $i + 1,
				'name'     => $krok['nazwa'],
				'item'     => $krok['adres'],
			);
		}
		return array(
			'@context'        => 'https://schema.org',
			'@type'           => 'BreadcrumbList',
			'itemListElement' => $pozycje,
		);
	}

	/**
	 * FAQ — wyłącznie pytania, które NAPRAWDĘ są w sekcji FAQ strony.
	 *
	 * @param array<int,array<string,string>> $pytania Pytania z sekcji.
	 * @return array<string,mixed>
	 */
	private static function faq( array $pytania ): array {
		$wezly = array();
		foreach ( $pytania as $p ) {
			$wezly[] = array(
				'@type'          => 'Question',
				'name'           => (string) $p['pytanie'],
				'acceptedAnswer' => array(
					'@type' => 'Answer',
					'text'  => (string) $p['odpowiedz'],
				),
			);
		}
		return array(
			'@context'   => 'https://schema.org',
			'@type'      => 'FAQPage',
			'mainEntity' => $wezly,
		);
	}

	/**
	 * Minuty → czas trwania ISO 8601 (720 → „PT12H"), dla schema.org.
	 *
	 * @param int $minuty Minuty.
	 */
	private static function czas_iso( int $minuty ): string {
		$godziny = intdiv( $minuty, 60 );
		$reszta  = $minuty % 60;
		if ( 0 === $godziny ) {
			return 'PT' . $reszta . 'M';
		}
		return 0 === $reszta ? 'PT' . $godziny . 'H' : 'PT' . $godziny . 'H' . $reszta . 'M';
	}

	/**
	 * Wypisuje jeden węzeł JSON-LD.
	 *
	 * `JSON_HEX_TAG` i spółka zamieniają `<`, `>`, `&` i apostrofy na sekwencje
	 * `\uXXXX` — dzięki temu treść z bazy nie ma jak zamknąć znacznika
	 * `<script>` i wyjść poza niego. To jedyne miejsce w tej wtyczce, gdzie
	 * dane z bazy trafiają do `<script>`, więc ucieczka musi być tutaj.
	 *
	 * @param array<string,mixed> $wezel Węzeł JSON-LD.
	 */
	private static function wypisz_jsonld( array $wezel ): void {
		$json = wp_json_encode(
			$wezel,
			JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
				| JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT
		);
		if ( false === $json ) {
			return;
		}
		echo '<script type="application/ld+json">' . $json . '</script>' . "\n"; // phpcs:ignore WordPress.Security.EscapeOutput
	}
}
