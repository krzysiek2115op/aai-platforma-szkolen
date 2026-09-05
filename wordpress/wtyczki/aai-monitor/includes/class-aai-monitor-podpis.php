<?php
/**
 * Podpis ścieżki — dowód, że stronę NAPRAWDĘ wyrenderował WordPress.
 *
 * SKĄD TO SIĘ WZIĘŁO. Schemat kazał sprawdzać, czy ścieżka z beaconu
 * „trafia w realną trasę (nasze widoki albo `url_to_postid()`)". Pomiar
 * przed pisaniem kodu pokazał, że taki mechanizm odrzuciłby wszystko,
 * na czym nam zależy (F24): `url_to_postid()` zwraca **0** dla
 * `/szkolenia/`, obu stron sprzedażowych, wszystkich 73 lekcji i strony
 * głównej — bo nasze trasy to reguły przepisywania, a lekcje to typ
 * wpisu Tutora z własną strukturą adresów. Awaria byłaby BEZOBJAWOWA:
 * beacon odpowiada 204 zawsze, więc nikt by się nie dowiedział, że
 * tabela ruchu jest pusta z powodu sita, a nie z powodu ciszy.
 *
 * ODWRÓCENIE PYTANIA. Zamiast pytać „czy ta ścieżka istnieje" — na co
 * WordPress nie umie odpowiedzieć bez pełnego rozbioru żądania — strona
 * przy renderze PODPISUJE własną ścieżkę, a beacon podpis odsyła.
 * Wtedy dowodzimy czegoś mocniejszego: że tę stronę naprawdę
 * wyrenderowano. Zmyślona ścieżka nie ma jak wejść do „top 10 stron",
 * a my nie trzymamy kopii cudzych reguł routingu, która rozjechałaby
 * się przy pierwszej zmianie w Tutorze albo w Pluginie 1.
 *
 * CZEGO PODPIS NIE ROBI: nie dowodzi, że wizyta była. Kto raz dostał
 * podpis, może wysłać ten sam beacon wielokrotnie — tłumi to wyłącznie
 * (miękki) limiter. To świadoma granica, nie przeoczenie.
 *
 * SÓL WŁASNA, NIE `wp_salt()`. Klucze w `wp-config.php` bywają
 * rotowane (wylogowanie wszystkich, reakcja na incydent, panel
 * hostingu). Podpis oparty na nich przestałby pasować do stron już
 * wysłanych do przeglądarek i pomiar zamilkłby — znowu bezobjawowo.
 * Własna sól żyje w NASZEJ tabeli `ustawienia` (do 0.5.0: w opcji, wpisywanej
 * surowym INSERT-em do tabeli rdzenia — AUD-ARCH-F1-001) i zmienia się wtedy,
 * kiedy MY tak zdecydujemy.
 *
 * @package Aai_Monitor
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Podpisywanie i weryfikacja ścieżek.
 */
final class Aai_Monitor_Podpis {

	/**
	 * Opcja z solą podpisu.
	 */
	/**
	 * Klucz soli w naszej tabeli `ustawienia` (od 0.5.0).
	 */
	private const KLUCZ_SOLI = 'sol_podpisu';

	/**
	 * Opcja, w której sól leżała do 0.5.0 — czytana WYŁĄCZNIE po to, żeby
	 * ją PRZEJĄĆ do tabeli bez zmiany wartości. Nigdy więcej nie pisana.
	 */
	private const OPCJA_SOLI = 'aai_monitor_sol_podpisu';

	/**
	 * Długość podpisu w znakach hex.
	 *
	 * 32 znaki to 128 bitów obciętego HMAC-a. Pełne 64 znaki niczego by
	 * tu nie kupiły (nie chronimy tajemnicy, tylko odróżniamy „nasza
	 * strona" od „zmyślona ścieżka"), a każda strona nosi ten łańcuch
	 * w swoim HTML-u.
	 */
	private const DLUGOSC = 32;

	/**
	 * Maksymalna długość ścieżki — szerokość kolumny `sciezka`.
	 *
	 * Przycinamy PRZED podpisaniem, żeby podpisana była dokładnie ta
	 * wartość, która pojedzie do bazy. Przycięcie po podpisaniu dałoby
	 * podpis, który do niczego nie pasuje.
	 */
	public const MAX_SCIEZKI = 191;

	/**
	 * Ścieżka bieżącego żądania, znormalizowana i przycięta.
	 *
	 * Bez query i bez fragmentu (decyzja właściciela R3): inaczej jedna
	 * strona rozpadłaby się w „top 10" na tyle wierszy, ile wariantów
	 * adresu, a identyfikatory kampanii zatkałyby listę.
	 *
	 * Zostawiamy procent-kodowanie takie, jakie przyszło — to jest ta
	 * sama postać, którą widzi przeglądarka, i ta sama, którą pokażemy
	 * na ekranie.
	 */
	public static function sciezka_zadania(): string {
		$surowa = isset( $_SERVER['REQUEST_URI'] ) ? (string) wp_unslash( $_SERVER['REQUEST_URI'] ) : '/';
		$sciezka = (string) wp_parse_url( $surowa, PHP_URL_PATH );
		if ( '' === $sciezka ) {
			$sciezka = '/';
		}
		// Znaki sterujące nie mają prawa wejść ani do podpisu, ani do bazy.
		$sciezka = (string) preg_replace( '/[\x00-\x1F\x7F]/u', '', $sciezka );
		return mb_substr( $sciezka, 0, self::MAX_SCIEZKI );
	}

	/**
	 * Podpis danej ścieżki — RAZEM z flagą bramki logowania.
	 *
	 * Flaga wchodzi do PODPISYWANEGO MATERIAŁU, a nie obok niego, i to
	 * jest cała jej ochrona: gdyby jechała w beaconie osobno, każdy mógłby
	 * oznaczyć dowolną odsłonę jako „zatrzymana na bramce" albo zdjąć to
	 * oznaczenie z własnej. Materiał jest rozdzielony pionową kreską, bo
	 * ścieżka zaczyna się od ukośnika i nie da się jej pomylić z flagą.
	 *
	 * @param string $sciezka Znormalizowana ścieżka.
	 * @param bool   $bramka  Czy stronę wyrenderowano jako bramkę logowania.
	 */
	public static function podpisz( string $sciezka, bool $bramka = false ): string {
		$material = ( $bramka ? '1' : '0' ) . '|' . $sciezka;
		return substr( hash_hmac( 'sha256', $material, self::sol() ), 0, self::DLUGOSC );
	}

	/**
	 * Czy podpis pasuje do ścieżki.
	 *
	 * `hash_equals`, a nie `===`: porównanie w stałym czasie jest tu
	 * tanie, a różnica czasu odpowiedzi bywa jedynym kanałem, który
	 * publiczny endpoint oddaje napastnikowi za darmo (ta sama decyzja
	 * co `timingSafeEqual` w dyspozytorze prototypu, 0.27.0).
	 *
	 * @param string $sciezka Ścieżka z beaconu.
	 * @param string $podpis  Podpis z beaconu.
	 * @param bool   $bramka  Flaga bramki z beaconu.
	 */
	public static function pasuje( string $sciezka, string $podpis, bool $bramka = false ): bool {
		if ( self::DLUGOSC !== strlen( $podpis ) ) {
			return false;
		}
		return hash_equals( self::podpisz( $sciezka, $bramka ), $podpis );
	}

	/**
	 * Czy sól już istnieje — pytanie KONTROLI, która nie ma prawa pisać
	 * (N16). `sol()` w razie potrzeby sól tworzy, więc kontrola musi mieć
	 * własną, czysto odczytową drogę.
	 */
	public static function gotowa(): bool {
		return '' !== self::sol_z_tabeli() || '' !== self::sol_z_opcji();
	}

	/**
	 * Co jest nie tak z solą — lista dla kontroli (pusta = porządek).
	 *
	 * Trzy stany, każdy z innym skutkiem, więc każdy nazwany osobno:
	 *  - brak soli gdziekolwiek → beacony będą odrzucane po cichu;
	 *  - sól TYLKO w starej opcji → działa, ale pierwsza odsłona ją dopiero
	 *    przejmie; kontrola mówi to wprost, żeby stan po aktualizacji był
	 *    widoczny, a nie domniemany;
	 *  - sól w tabeli I w opcji, RÓŻNE → to jest tryb awarii migracji:
	 *    strony wysłane przed przejęciem noszą podpisy starą wartością,
	 *    a sito liczy nową. Kod 1, nie ostrzeżenie.
	 *
	 * Wyłącznie ODCZYT (N16) — kontrola nie ma prawa niczego naprawiać.
	 *
	 * @return string[]
	 */
	public static function stan_soli(): array {
		$w_tabeli = self::sol_z_tabeli();
		$w_opcji  = self::sol_z_opcji();
		if ( '' === $w_tabeli && '' === $w_opcji ) {
			return array( 'brak soli podpisu ścieżek — beacony wizyt będą odrzucane po cichu. Napraw: wp plugin deactivate aai-monitor && wp plugin activate aai-monitor' );
		}
		if ( '' === $w_tabeli ) {
			return array( 'sól podpisu leży jeszcze tylko w starej opcji `' . self::OPCJA_SOLI . '` — pierwsza odsłona frontu przejmie ją do tabeli `ustawienia` bez zmiany wartości; jeśli ten komunikat nie znika, tabela nie powstała (wp plugin deactivate aai-monitor && wp plugin activate aai-monitor)' );
		}
		if ( '' !== $w_opcji && ! hash_equals( $w_tabeli, $w_opcji ) ) {
			return array( 'sól podpisu w tabeli `ustawienia` RÓŻNI SIĘ od soli w starej opcji `' . self::OPCJA_SOLI . '` — strony wysłane przed migracją noszą podpisy, których sito nie przyjmie. Ustal, która wartość jest tą, którą podpisano strony, i usuń drugą (delete_option albo DELETE z tabeli); obu naraz zostawić nie wolno' );
		}
		return array();
	}

	/**
	 * Sól z naszej tabeli albo pusty łańcuch. Czysty odczyt.
	 */
	private static function sol_z_tabeli(): string {
		global $wpdb;
		try {
			$t = Aai_Monitor_Tabele::tabela( 'ustawienia' );
			$v = $wpdb->get_var(
				$wpdb->prepare( "SELECT `wartosc` FROM `{$t}` WHERE `klucz` = %s", self::KLUCZ_SOLI )
			); // phpcs:ignore WordPress.DB.PreparedSQL,WordPress.DB.DirectDatabaseQuery
			return is_string( $v ) ? $v : '';
		} catch ( Throwable $e ) {
			return '';
		}
	}

	/**
	 * Sól ze STAREJ opcji (sprzed 0.5.0) albo pusty łańcuch. Czysty odczyt.
	 */
	private static function sol_z_opcji(): string {
		$v = get_option( self::OPCJA_SOLI );
		return is_string( $v ) ? $v : '';
	}

	/**
	 * Tworzy sól, jeśli jeszcze jej nie ma. Wołane przy aktywacji.
	 */
	public static function przygotuj(): void {
		self::sol();
	}

	/* ————————————————————————— wnętrze ————————————————————————— */

	/**
	 * Sól podpisu — z naszej tabeli; w razie potrzeby powstaje RAZ.
	 *
	 * KOLEJNOŚĆ JEST MIGRACJĄ (0.5.0, AUD-ARCH-F1-001):
	 *  1. tabela `ustawienia` → to jest dom soli;
	 *  2. stara opcja `wp_options` → PRZEJMUJEMY jej wartość do tabeli,
	 *     co do znaku. Dzięki temu instalacja aktualizowana z 0.4.0 nie
	 *     zmienia soli ani na chwilę, a strony wysłane wcześniej do
	 *     przeglądarek zachowują ważne podpisy. Opcji nie kasujemy —
	 *     kontrola porównuje oba miejsca i zapala się, gdyby się rozjechały;
	 *  3. dopiero gdy nie ma ani jednej — nowa, losowa.
	 *
	 * ZAPIS IDZIE PRZEZ WARSTWĘ ZAPISU, jak każdy zapis tej wtyczki, i jest
	 * pusty przy konflikcie (pierwszy pisarz wygrywa). Używamy wartości
	 * ODCZYTANEJ z bazy, nie tej, którą próbowaliśmy wpisać — przegrany
	 * wyścigu inaczej podpisywałby strony solą, której sito nie zna (A7).
	 *
	 * Gdy zapis zawiedzie (np. tabeli jeszcze nie ma), wracamy z tym, co
	 * mamy — przejętą wartością z opcji albo świeżą — i nie kładziemy
	 * strony: brak soli oznaczałby podpisy liczone z pustego łańcucha.
	 */
	private static function sol(): string {
		$sol = self::sol_z_tabeli();
		if ( '' !== $sol ) {
			return $sol;
		}

		$kandydat = self::sol_z_opcji();
		if ( '' === $kandydat ) {
			$kandydat = wp_generate_password( 64, true, true );
		}

		$zapisana = Aai_Monitor_Zapis::ustawienie_utworz( self::KLUCZ_SOLI, $kandydat );

		return is_string( $zapisana ) && '' !== $zapisana ? $zapisana : $kandydat;
	}
}
