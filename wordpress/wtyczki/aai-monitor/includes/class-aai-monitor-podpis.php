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
 * Własna sól żyje w opcji i zmienia się wtedy, kiedy MY tak zdecydujemy.
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
		return is_string( get_option( self::OPCJA_SOLI ) ) && '' !== get_option( self::OPCJA_SOLI );
	}

	/**
	 * Tworzy sól, jeśli jeszcze jej nie ma. Wołane przy aktywacji.
	 */
	public static function przygotuj(): void {
		self::sol();
	}

	/* ————————————————————————— wnętrze ————————————————————————— */

	/**
	 * Sól podpisu — z opcji, a przy pierwszym użyciu tworzona.
	 *
	 * Tworzenie leniwe, bo aktywacja to nie jedyna droga, którą wtyczka
	 * trafia na instalację (kopiowanie katalogu, przywracanie kopii
	 * zapasowej, `wp plugin activate --network`). Brak soli oznaczałby
	 * podpisy liczone z pustego łańcucha — czyli takie same u wszystkich.
	 *
	 * Opcja jest `autoload`, bo pyta o nią KAŻDA odsłona frontu; osobne
	 * zapytanie na stronę byłoby droższe niż 64 bajty w pamięci.
	 */
	private static function sol(): string {
		$sol = get_option( self::OPCJA_SOLI );
		if ( is_string( $sol ) && '' !== $sol ) {
			return $sol;
		}
		$sol = wp_generate_password( 64, true, true );
		add_option( self::OPCJA_SOLI, $sol, '', true );
		// Wyścig dwóch żądań: wygrywa ten, który zdążył pierwszy —
		// czytamy z powrotem, żeby oba używały TEJ SAMEJ soli.
		$zapisana = get_option( self::OPCJA_SOLI );
		return is_string( $zapisana ) && '' !== $zapisana ? $zapisana : $sol;
	}
}
