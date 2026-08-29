<?php
/**
 * Pomocniki renderu stron sklepu — port `lib/odmiana.ts`
 * i `components/kurs/Wspolne.tsx`.
 *
 * DLACZEGO PORT, A NIE NAPISANIE OD NOWA. Bo te funkcje mają dawać ten sam
 * wynik, co prototyp — inaczej ten sam kurs pokazuje „2 modułów" na WordPressie
 * i „2 moduły" w podglądzie, a nikt nie wie, która strona kłamie. Polska
 * odmiana liczebników weszła do prototypu jako poprawka właściciela przy B5
 * i ma tu obowiązywać co do znaku.
 *
 * IKONY jako wklejony SVG, bo lucide-react to komponenty Reacta — w PHP nie
 * istnieją. Dane ścieżek wzięte z `node_modules/lucide-react`, nie przerysowane
 * ze zrzutu; ta sama decyzja co w `tools/podglad-kursow/ikony.mjs`.
 *
 * @package Aai_Sklep
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Formatowanie i drobne elementy widoku.
 */
final class Aai_Sklep_Widok {

	/**
	 * Twarda spacja. Wpisana jako stała, bo w źródle jest nie do odróżnienia
	 * od zwykłej — a to ona trzyma „1 499,00 zł" w jednej linii.
	 */
	private const NBSP = "\u{00A0}";

	/**
	 * Nazwy poziomów dokładnie jak na stronie sprzedażowej prototypu.
	 */
	private const POZIOMY = array(
		'podstawowy'          => 'podstawowy',
		'sredniozaawansowany' => 'średnio zaawansowany',
		'zaawansowany'        => 'zaawansowany',
	);

	/**
	 * Nazwy poziomów w katalogu — z wielkiej litery, bo stoją samodzielnie
	 * w pasku metadanych karty, a nie w środku zdania.
	 */
	private const POZIOMY_KATALOG = array(
		'podstawowy'          => 'Podstawowy',
		'sredniozaawansowany' => 'Średnio zaawansowany',
		'zaawansowany'        => 'Zaawansowany',
	);

	/**
	 * Polska odmiana liczebnika — samo słowo.
	 *
	 * @param int    $ile   Liczba.
	 * @param string $jeden Forma dla 1.
	 * @param string $kilka Forma dla 2–4 (poza 12–14).
	 * @param string $wiele Forma pozostała.
	 */
	public static function slowo( int $ile, string $jeden, string $kilka, string $wiele ): string {
		if ( 1 === $ile ) {
			return $jeden;
		}
		$r10  = $ile % 10;
		$r100 = $ile % 100;
		if ( $r10 >= 2 && $r10 <= 4 && ( $r100 < 12 || $r100 > 14 ) ) {
			return $kilka;
		}
		return $wiele;
	}

	/**
	 * Liczba z odmienionym słowem.
	 *
	 * @param int    $ile   Liczba.
	 * @param string $jeden Forma dla 1.
	 * @param string $kilka Forma dla 2–4.
	 * @param string $wiele Forma pozostała.
	 */
	public static function odmien( int $ile, string $jeden, string $kilka, string $wiele ): string {
		return $ile . ' ' . self::slowo( $ile, $jeden, $kilka, $wiele );
	}

	/**
	 * „3 moduły".
	 *
	 * @param int $ile Liczba modułów.
	 */
	public static function moduly( int $ile ): string {
		return self::odmien( $ile, 'moduł', 'moduły', 'modułów' );
	}

	/**
	 * „41 lekcji".
	 *
	 * @param int $ile Liczba lekcji.
	 */
	public static function lekcje( int $ile ): string {
		return self::odmien( $ile, 'lekcja', 'lekcje', 'lekcji' );
	}

	/**
	 * Czas materiału po polsku: „45 min", „3 h", „7 h 30 min" — nigdy „0.8 h".
	 *
	 * @param int $minuty Minuty.
	 */
	public static function czas_materialu( int $minuty ): string {
		if ( $minuty < 60 ) {
			return $minuty . ' min';
		}
		$godziny = intdiv( $minuty, 60 );
		$reszta  = $minuty % 60;
		return 0 === $reszta ? $godziny . ' h' : $godziny . ' h ' . $reszta . ' min';
	}

	/**
	 * Grosze → „1 499,00 zł" z twardymi spacjami.
	 *
	 * Nie używamy `number_format_i18n` ani ustawień WooCommerce: cena ma
	 * wyglądać identycznie jak w prototypie i w podglądzie, a jedno i drugie
	 * bierze `Intl.NumberFormat("pl-PL")`. Ustawienie sklepu zmieniłoby
	 * format po cichu, bez żadnego objawu poza inną stroną.
	 *
	 * @param int $grosze Cena w groszach.
	 */
	/**
	 * Cena kursu w groszach — JEDNO źródło dla strony i danych strukturalnych.
	 *
	 * DLACZEGO NIE `$kurs['price_grosze']` WPROST. Bo od kroku P3b cena, którą
	 * widzi klient, może pochodzić z WooCommerce (promocja ustawiona w sklepie),
	 * a nasza tabela trzyma cenę KATALOGOWĄ. Gdyby szablon czytał kolumnę,
	 * a dane strukturalne pytały Woo (albo odwrotnie), wyszukiwarka dostałaby
	 * inną cenę niż człowiek — a Google traktuje taki rozjazd jako powód do
	 * kary (K2 z krytyki P0). Wszyscy pytają więc tę jedną metodę.
	 *
	 * PAMIĘĆ NA ŻĄDANIE, bo strona kursu pyta o tę samą cenę cztery razy
	 * (hero, sekcja oferty, napis przycisku, dane strukturalne). Bez niej
	 * każde z tych miejsc odpytywałoby WooCommerce osobno, a przy dwóch
	 * kartach katalogu doszłyby kolejne — to ta sama klasa kosztu, która
	 * przy W6 dała 90 zapytań na odsłonę menu.
	 *
	 * Bez Pluginu 2 filtru nikt nie obsługuje i metoda oddaje cenę z bazy,
	 * czyli dokładnie to, co strona pokazywała do tej pory.
	 *
	 * @param array<string,mixed> $kurs Kurs z warstwy odczytu.
	 * @return int Cena w groszach.
	 */
	public static function cena_grosze( array $kurs ): int {
		static $pamiec = array();

		$klucz = (string) ( $kurs['id'] ?? '' );
		if ( '' !== $klucz && isset( $pamiec[ $klucz ] ) ) {
			return $pamiec[ $klucz ];
		}

		$katalogowa = (int) ( $kurs['price_grosze'] ?? 0 );
		/**
		 * Cena kursu pokazywana klientowi, w groszach.
		 *
		 * Plugin 2 podmienia ją na cenę EFEKTYWNĄ z WooCommerce (czyli
		 * z uwzględnieniem promocji). Wartość wejściowa to nasza cena
		 * katalogowa — i ona zostaje, gdy kurs nie ma jeszcze produktu.
		 *
		 * @param int                 $katalogowa Cena z naszej tabeli (grosze).
		 * @param array<string,mixed> $kurs       Kurs z warstwy odczytu.
		 */
		$cena = (int) apply_filters( 'aai_sklep_cena_kursu', $katalogowa, $kurs );

		// Ujemna cena nie ma znaczenia na stronie sprzedażowej, a wzięłaby
		// się wyłącznie z cudzego błędu — wtedy wracamy do swojej liczby.
		if ( $cena < 0 ) {
			$cena = $katalogowa;
		}
		if ( '' !== $klucz ) {
			$pamiec[ $klucz ] = $cena;
		}
		return $cena;
	}

	public static function formatuj_cene( int $grosze ): string {
		return number_format( $grosze / 100, 2, ',', self::NBSP ) . self::NBSP . 'zł';
	}

	/**
	 * Nazwa poziomu w zdaniu („poziom średnio zaawansowany").
	 *
	 * @param string|null $poziom Wartość kolumny `level`.
	 */
	public static function poziom( ?string $poziom ): ?string {
		if ( null === $poziom ) {
			return null;
		}
		return self::POZIOMY[ $poziom ] ?? $poziom;
	}

	/**
	 * Nazwa poziomu na karcie katalogu.
	 *
	 * @param string|null $poziom Wartość kolumny `level`.
	 */
	public static function poziom_katalogu( ?string $poziom ): ?string {
		if ( null === $poziom ) {
			return null;
		}
		return self::POZIOMY_KATALOG[ $poziom ] ?? $poziom;
	}

	/**
	 * Adres, pod który prowadzi każde CTA zakupu.
	 *
	 * PLACEHOLDER — i to jest świadome. Płatności przynosi Plugin 2; do tego
	 * czasu przycisk prowadzi do kontaktu, a dane strukturalne mówią
	 * `PreOrder`. Wpisanie tu koszyka WooCommerce, zanim koszyk działa,
	 * byłoby obietnicą zakupu od ręki, której strona nie umie dotrzymać.
	 */
	public static function adres_zakupu(): string {
		return home_url( '/kontakt' );
	}

	/**
	 * Adres katalogu i strony kursu — jedno miejsce, z którego biorą je
	 * szablony, trasy, SEO i dane strukturalne.
	 *
	 * @param string|null $slug Slug kursu albo null dla katalogu.
	 */
	public static function adres_kursu( ?string $slug = null ): string {
		/*
		 * `user_trailingslashit` dokleja (albo nie) ukośnik zgodnie ze STRUKTURĄ
		 * ODNOŚNIKÓW tej instalacji. Bez tego nasze adresy różniłyby się od
		 * kanonicznych o jeden znak, a `redirect_canonical` WordPressa robiłby
		 * z każdego kliknięcia przekierowanie 301 — łańcuch, który kosztuje
		 * rundę sieciową i który wyszukiwarka liczy jako przekierowanie
		 * z naszego własnego adresu na nasz własny adres.
		 */
		$sciezka = null === $slug ? '/szkolenia' : '/szkolenia/' . $slug;
		return home_url( user_trailingslashit( $sciezka ) );
	}

	/**
	 * Ikona jako wklejony SVG.
	 *
	 * Zwraca gotowy HTML — wywołania w szablonach idą przez `echo` bez
	 * ucieczki, bo to nasz własny, stały markup, a nie dane z bazy.
	 *
	 * @param string $nazwa Nazwa ikony (lista w `IKONY`).
	 * @param string $klasy Klasy CSS dokładane do `<svg>`.
	 */
	public static function ikona( string $nazwa, string $klasy = '' ): string {
		$sciezki = self::IKONY[ $nazwa ] ?? null;
		if ( null === $sciezki ) {
			return '';
		}
		return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"'
			. ' stroke="currentColor" stroke-width="2" stroke-linecap="round"'
			. ' stroke-linejoin="round" aria-hidden="true" class="aai-ikona '
			. esc_attr( $klasy ) . '">' . $sciezki . '</svg>';
	}

	/**
	 * Sygnet Automatic AI — ten sam kształt, co w nagłówku motywu.
	 *
	 * Bez klas animacji motywu (`mark-modul`, `mark-impuls`): tam sterują nimi
	 * jego skrypty, a my rysujemy nieruchomy znaczek w przycisku powrotu.
	 *
	 * @param string $klasy Klasy CSS dokładane do `<svg>`.
	 */
	public static function sygnet( string $klasy = '' ): string {
		return '<svg viewBox="0 0 48 48" aria-hidden="true" class="' . esc_attr( $klasy ) . '">'
			. '<path d="M8 43 L26.5 4.5" fill="none" stroke="currentColor" stroke-width="5.2"/>'
			. '<path d="M23.21 14.38 L40 43" fill="none" stroke="currentColor" stroke-width="5.2"/>'
			. '<rect x="12.8" y="26.2" width="22.2" height="5.4" fill="currentColor"/>'
			. '</svg>';
	}

	/**
	 * Adres okładki — albo `null`, gdy nie ma czego pokazać.
	 *
	 * SKĄD TA FUNKCJA. `cover_url` jest polem TEKSTOWYM wypełnianym w kreatorze
	 * (decyzja właściciela z D6: adres albo ścieżka, bez wgrywania plików), więc
	 * potrafi wskazywać plik, którego na tej instalacji nie ma. Tak jest dzisiaj:
	 * kursy przyjechały z prototypu Next.js, gdzie `/okladki/*.svg` leżało
	 * w `public/` i było adresem od korzenia serwisu. Na WordPressie ten adres
	 * oddaje 404, a przeglądarka rysuje w karcie ikonę zepsutego obrazka
	 * z tekstem alternatywnym — czyli katalog wygląda na zepsuty.
	 *
	 * Kolejność szukania jest jawna i sprawdzalna, bez zgadywania:
	 *   1. pełny adres (`http(s)://`) — bierzemy jak stoi, bo nie mamy jak
	 *      sprawdzić cudzego serwera i nie zamierzamy odpytywać go przy
	 *      każdej odsłonie strony,
	 *   2. plik istniejący w katalogu instalacji (np. z biblioteki mediów),
	 *   3. okładka przeniesiona z prototypu, leżąca PRZY WTYCZCE
	 *      (`assets/okladki/`) — wtyczka ma być samowystarczalna,
	 *   4. nic z powyższych → `null`, a karta rysuje zaprojektowany zastępnik.
	 *
	 * Punkt 4 jest tu najważniejszy: zastępnik jest częścią projektu, zepsuty
	 * obrazek nie jest niczyim projektem.
	 *
	 * @param string|null $wartosc Wartość kolumny `cover_url`.
	 */
	public static function okladka( ?string $wartosc ): ?string {
		if ( null === $wartosc || '' === trim( $wartosc ) ) {
			return null;
		}
		$wartosc = trim( $wartosc );

		if ( preg_match( '~^https?://~i', $wartosc ) ) {
			return $wartosc;
		}

		$sciezka = '/' . ltrim( $wartosc, '/' );
		if ( is_readable( ABSPATH . ltrim( $sciezka, '/' ) ) ) {
			return home_url( $sciezka );
		}

		$przy_wtyczce = 'assets/okladki/' . basename( $sciezka );
		if ( is_readable( AAI_SKLEP_KATALOG . $przy_wtyczce ) ) {
			return AAI_SKLEP_URL . $przy_wtyczce;
		}

		return null;
	}

	/**
	 * Nagłówek sekcji: etykieta z numerem, tytuł i opcjonalny wstęp.
	 *
	 * Wspólny dla wszystkich sekcji strony sprzedażowej, bo w prototypie był
	 * wspólny (`components/kurs/Wspolne.tsx`, komponent `Sekcja`) — a nagłówki
	 * przepisane osobno w dwunastu plikach rozjeżdżają się przy pierwszej
	 * poprawce odstępu i nikt tego nie zauważa.
	 *
	 * @param string      $etykieta Etykieta, np. „01 · Poznaj kurs".
	 * @param string      $tytul    Tytuł sekcji.
	 * @param string|null $opis     Wstęp pod tytułem.
	 * @param string|null $akcent   Druga linia tytułu, wyróżniona kolorem.
	 */
	public static function naglowek_sekcji(
		string $etykieta,
		string $tytul,
		?string $opis = null,
		?string $akcent = null
	): void {
		?>
		<div class="aai-reveal">
			<p class="aai-etykieta">[ <?php echo esc_html( $etykieta ); ?> ]</p>
			<h2 class="aai-sekcja-tytul">
				<?php if ( null === $akcent ) : ?>
					<?php echo esc_html( $tytul ); ?>
				<?php else : ?>
					<span class="aai-linia"><?php echo esc_html( $tytul ); ?></span>
					<span class="aai-linia aai-akcent"><?php echo esc_html( $akcent ); ?></span>
				<?php endif; ?>
			</h2>
			<?php if ( null !== $opis && '' !== $opis ) : ?>
				<p class="aai-sekcja-opis"><?php echo esc_html( $opis ); ?></p>
			<?php endif; ?>
		</div>
		<?php
	}

	/**
	 * Przycisk zakupu.
	 *
	 * Napis domyślny bierze cenę, bo „Dołączam za 299,00 zł" mówi klientowi
	 * dokładnie, co się stanie po kliknięciu — a tak brzmiał w prototypie.
	 *
	 * @param int|null    $cena  Cena w groszach (null = napis bez ceny).
	 * @param bool        $duzy  Wariant duży.
	 * @param string|null $tekst Własny napis.
	 * @param string      $klasy Dodatkowe klasy.
	 */
	public static function cta( ?int $cena = null, bool $duzy = true, ?string $tekst = null, string $klasy = '' ): void {
		$napis = $tekst
			?? ( null === $cena ? 'Dołączam do kursu' : 'Dołączam za ' . self::formatuj_cene( $cena ) );
		?>
		<a class="aai-btn aai-btn-glowny <?php echo $duzy ? 'aai-btn-duzy' : ''; ?> <?php echo esc_attr( $klasy ); ?>"
			href="<?php echo esc_url( self::adres_zakupu() ); ?>">
			<?php echo esc_html( $napis ); ?>
			<?php echo self::ikona( 'arrow-right', 'aai-ikona-s' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
		</a>
		<?php
	}

	/**
	 * Lista metadanych kursu rozdzielona kropkami: „6 modułów · 41 lekcji · 12 h materiału".
	 *
	 * Liczby pochodzą z bazy i są liczone RAZ, w warstwie odczytu — żaden
	 * szablon nie sumuje ich sam.
	 *
	 * @param array<string,mixed> $kurs      Kurs.
	 * @param bool                $z_poziomem Czy dołożyć poziom.
	 * @return string[]
	 */
	public static function metadane_kursu( array $kurs, bool $z_poziomem = true ): array {
		$czesci = array();
		if ( $kurs['modules_count'] > 0 ) {
			$czesci[] = self::moduly( (int) $kurs['modules_count'] );
		}
		if ( $kurs['lessons_count'] > 0 ) {
			$czesci[] = self::lekcje( (int) $kurs['lessons_count'] );
		}
		if ( $kurs['total_min'] > 0 ) {
			$czesci[] = self::czas_materialu( (int) $kurs['total_min'] ) . ' materiału';
		}
		$poziom = $z_poziomem ? self::poziom_katalogu( $kurs['level'] ?? null ) : null;
		if ( null !== $poziom ) {
			$czesci[] = $poziom;
		}
		return $czesci;
	}

	/**
	 * Dane ścieżek ikon lucide (wersja z `node_modules/lucide-react`).
	 */
	/**
	 * Lista znaczników dozwolonych w złożonej prozie lekcji.
	 *
	 * PO CO ROZSZERZAĆ `wp_kses_post`. Bo domyślna lista NIE ZNA `<svg>` —
	 * a nasze bloki („Czego się nauczysz", „Zrób to teraz") mają ikonę
	 * w nagłówku i to po niej poznaje się rodzaj sekcji. Bez tego kses
	 * zjadał ikony po cichu: strona wyglądała poprawnie, tylko uboższa
	 * o element, który miał nieść znaczenie.
	 *
	 * Rozszerzenie jest WĄSKIE i celowo nie obejmuje `<script>`, `<style>`
	 * ani zdarzeń — kses zostaje drugim zamkiem na tych samych drzwiach
	 * (pierwszym jest renderer, który ucieka wszystko, co przyszło z bazy).
	 *
	 * @return array<string,array<string,bool>>
	 */
	public static function dozwolone_znaczniki(): array {
		$dozwolone = wp_kses_allowed_html( 'post' );

		$wspolne = array(
			'class'       => true,
			'aria-hidden' => true,
			'focusable'   => true,
		);

		$dozwolone['svg'] = array_merge(
			$wspolne,
			array(
				'xmlns'             => true,
				'viewbox'           => true,
				'fill'              => true,
				'stroke'            => true,
				'stroke-width'      => true,
				'stroke-linecap'    => true,
				'stroke-linejoin'   => true,
				'width'             => true,
				'height'            => true,
			)
		);
		foreach ( array( 'path', 'circle', 'rect', 'polygon', 'line', 'g' ) as $ksztalt ) {
			$dozwolone[ $ksztalt ] = array_merge(
				$wspolne,
				array(
					'd'      => true,
					'cx'     => true,
					'cy'     => true,
					'r'      => true,
					'x'      => true,
					'y'      => true,
					'x1'     => true,
					'x2'     => true,
					'y1'     => true,
					'y2'     => true,
					'rx'     => true,
					'ry'     => true,
					'width'  => true,
					'height' => true,
					'points' => true,
					'fill'   => true,
					'stroke' => true,
				)
			);
		}

		// Wymiary i leniwe ładowanie obrazów: bez nich zrzuty przepychałyby
		// tekst przy doładowaniu (CLS trzymany w tym projekcie na zerze).
		$dozwolone['img'] = array_merge(
			$dozwolone['img'] ?? array(),
			array(
				'width'    => true,
				'height'   => true,
				'loading'  => true,
				'decoding' => true,
			)
		);
		$dozwolone['div'] = array_merge( $dozwolone['div'] ?? array(), array( 'data-jezyk' => true ) );

		return $dozwolone;
	}

	private const IKONY = array(
		'arrow-left'     => '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
		'arrow-right'    => '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
		'arrow-up-right' => '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
		'check'          => '<path d="M20 6 9 17l-5-5"/>',
		'chevron-down'   => '<path d="m6 9 6 6 6-6"/>',
		'lock'           => '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
		'minus'          => '<path d="M5 12h14"/>',
		'move-right'     => '<path d="M18 8L22 12L18 16"/><path d="M2 12H22"/>',
		'play'           => '<path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"/>',
		'quote'          => '<path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/><path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/>',
		'shield-check'   => '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
		'sparkles'       => '<path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/><path d="M20 2v4"/><path d="M22 4h-4"/><circle cx="4" cy="20" r="2"/>',
		'x'              => '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
		/*
		 * Zestaw widoku lekcji (W5) — te same kształty, co w podglądzie
		 * kursów przyjętym przez właściciela: rodzaj sekcji prozy poznaje się
		 * po ikonie, więc muszą być identyczne po obu stronach.
		 */
		'target'         => '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
		'terminal'       => '<path d="m4 17 6-6-6-6"/><path d="M12 19h8"/>',
		'settings'       => '<path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/><circle cx="12" cy="12" r="4"/>',
		'book'           => '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/>',
		'bridge'         => '<path d="M6 20V10"/><path d="M18 20V10"/><path d="M2 10h20"/><path d="M12 20V4"/><path d="M4 20h16"/>',
		'help'           => '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
		'compass'        => '<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>',
		'list'           => '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',
		'copy'           => '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
	);
}
