<?php
/**
 * Schemat tabel wtyczki — port bazy `db1_kursy` z prototypu na MySQL.
 *
 * ŹRÓDŁEM PRAWDY O KURSIE SĄ TE TABELE (decyzja właściciela 2026-08-25),
 * a do Tutor LMS idzie przy publikacji KOPIA. Dlatego schemat jest
 * wierny prototypowi: to samo, co przez rok dowiodły testy, goldeny
 * i przegląd B7 — a nie „coś podobnego, dopisane na nowo w PHP".
 *
 * @package Aai_Sklep
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Tworzenie i utrzymanie tabel.
 */
final class Aai_Sklep_Tabele {

	/**
	 * Opcja z wersją schematu — po niej poznajemy, że trzeba dociągnąć zmiany.
	 */
	private const OPCJA_WERSJI = 'aai_sklep_wersja_schematu';

	/**
	 * Pełna nazwa tabeli z prefiksem instalacji i prefiksem wtyczki.
	 *
	 * @param string $nazwa Nazwa bez prefiksów, np. `courses`.
	 */
	public static function tabela( string $nazwa ): string {
		global $wpdb;
		return $wpdb->prefix . AAI_SKLEP_PREFIKS . $nazwa;
	}

	/**
	 * Wszystkie nasze tabele — jedno miejsce, z którego korzystają
	 * `uninstall.php`, strażnik granic i testy.
	 *
	 * @return string[]
	 */
	public static function wszystkie(): array {
		return array_map(
			array( self::class, 'tabela' ),
			array( 'courses', 'sections', 'modules', 'lessons', 'changelog' )
		);
	}

	/**
	 * Tworzy schemat. Wołane przy aktywacji wtyczki.
	 */
	public static function utworz(): void {
		global $wpdb;

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		// Kolacja instalacji — bez niej tabele wtyczki potrafią mieć inną
		// niż tabele WordPressa, a wtedy `JOIN` z `wp_users` wywala się
		// na „Illegal mix of collations". Objaw pojawia się dopiero przy
		// pierwszym złączeniu, czyli długo po instalacji.
		$kolacja = $wpdb->get_charset_collate();

		$c = self::tabela( 'courses' );
		$s = self::tabela( 'sections' );
		$m = self::tabela( 'modules' );
		$l = self::tabela( 'lessons' );
		$a = self::tabela( 'changelog' );

		/*
		 * UWAGI DO PORTU (pełna lista: docs/plugin-1/MIGRACJA-DO-WP.md):
		 *
		 *  * `uuid` → `char(36)`. Identyfikatory generuje PHP
		 *    (`wp_generate_uuid4()`), bo MySQL nie ma odpowiednika
		 *    `gen_random_uuid()` jako DEFAULT w każdej wersji, a klucz
		 *    musi być ten sam po obu stronach migracji z Postgresa.
		 *  * `slug` to `varchar(191)`, nie `text` — bo ma na sobie UNIQUE,
		 *    a indeks w utf8mb4 nie zmieści dłuższej kolumny w starszych
		 *    InnoDB (191 × 4 bajty < 767). Tę samą granicę stosuje WP.
		 *  * `jsonb` → `longtext`. MariaDB traktuje `JSON` jako alias
		 *    `longtext`, więc nazywamy rzecz po imieniu; kształt pilnuje
		 *    kontrakt w PHP, tak jak w prototypie pilnował Zod.
		 *  * treść lekcji to `mediumtext`, NIE `text`: `text` mieści 65 kB,
		 *    a kontrakt dopuszcza 120 000 znaków — po polsku i w UTF-8
		 *    to grubo ponad limit. Najdłuższa dzisiejsza lekcja ma 21 790
		 *    znaków, więc `text` by ją przyjął i uciął dopiero przy
		 *    dłuższej. Cicha utrata treści — dokładnie to, czego ten
		 *    projekt pilnuje najmocniej.
		 *  * `timestamptz` → `datetime` w UTC (WordPress trzyma czas tak samo).
		 *  * SEKCJE: `UNIQUE (course_id, kind)` i BRAK kolumny `position` —
		 *    decyzja właściciela z 2026-08-25 (migracja 008 prototypu),
		 *    podjęta świadomie PRZED napisaniem tego schematu.
		 *  * POZYCJE modułów i lekcji mają UNIQUE, ale MySQL NIE UMIE
		 *    odraczać ograniczeń (Postgres to robił: `DEFERRABLE`).
		 *    Zamiana kolejności dwóch modułów łamie więc unikalność
		 *    w stanie pośrednim — warstwa zapisu MUSI przestawiać pozycje
		 *    dwufazowo (najpierw poza zakres, potem docelowo). To jest
		 *    zapisane tutaj, bo tu jest ograniczenie, które tego wymaga.
		 */

		$sql = array();

		$sql[] = "CREATE TABLE $c (
			id char(36) NOT NULL,
			slug varchar(191) NOT NULL,
			title text NOT NULL,
			type varchar(20) NOT NULL DEFAULT 'kurs',
			short_desc text NULL,
			price_grosze int NOT NULL DEFAULT 0,
			cover_url varchar(500) NULL,
			status varchar(20) NOT NULL DEFAULT 'draft',
			badge varchar(40) NULL,
			level varchar(30) NULL,
			created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY  (id),
			UNIQUE KEY slug (slug),
			KEY status (status)
		) $kolacja;";

		$sql[] = "CREATE TABLE $s (
			id char(36) NOT NULL,
			course_id char(36) NOT NULL,
			kind varchar(30) NOT NULL,
			content longtext NOT NULL,
			PRIMARY KEY  (id),
			UNIQUE KEY kurs_rodzaj (course_id,kind)
		) $kolacja;";

		$sql[] = "CREATE TABLE $m (
			id char(36) NOT NULL,
			course_id char(36) NOT NULL,
			position int NOT NULL DEFAULT 0,
			title text NOT NULL,
			summary text NULL,
			PRIMARY KEY  (id),
			UNIQUE KEY kurs_pozycja (course_id,position)
		) $kolacja;";

		$sql[] = "CREATE TABLE $l (
			id char(36) NOT NULL,
			module_id char(36) NOT NULL,
			position int NOT NULL DEFAULT 0,
			title text NOT NULL,
			duration_min int NULL,
			preview tinyint(1) NOT NULL DEFAULT 0,
			content mediumtext NULL,
			materials longtext NOT NULL,
			PRIMARY KEY  (id),
			UNIQUE KEY modul_pozycja (module_id,position),
			KEY z_trescia (module_id,preview)
		) $kolacja;";

		/*
		 * DZIENNIK AUDYTU — i świadome odstępstwo od prototypu.
		 *
		 * W Postgresie dziennik pisały TRIGGERY, a gwarancja brzmiała:
		 * „kod aplikacji nie umie go ominąć ani sfałszować" (Dział 2).
		 * Tutaj dziennik pisze PHP, w jednej warstwie zapisu — bo
		 * uprawnienie TRIGGER bywa na współdzielonym hostingu odebrane,
		 * a wtyczka, która nie instaluje się u klienta, jest gorsza niż
		 * wtyczka z nieco słabszą gwarancją.
		 *
		 * Czym zastępujemy tamtą gwarancję: strażnikiem, który sprawdza,
		 * że NIKT w kodzie nie pisze do tych tabel poza warstwą zapisu
		 * (odpowiednik `straznik-granic` z prototypu), oraz testem
		 * regresji na każdą operację. To słabsze niż baza pilnująca sama
		 * siebie i tak to nazywamy — bez udawania, że nic się nie zmieniło.
		 */
		$sql[] = "CREATE TABLE $a (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			course_id char(36) NULL,
			tabela varchar(40) NOT NULL,
			action varchar(10) NOT NULL,
			stan_przed longtext NULL,
			stan_po longtext NULL,
			actor varchar(191) NOT NULL,
			created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY  (id),
			KEY kurs_czas (course_id,created_at)
		) $kolacja;";

		foreach ( $sql as $zapytanie ) {
			dbDelta( $zapytanie );
		}

		update_option( self::OPCJA_WERSJI, AAI_SKLEP_WERSJA );
	}

	/**
	 * Dociąga schemat po aktualizacji wtyczki.
	 *
	 * Sprawdzenie jest jedną opcją z cache'u — czyli tanie przy każdym
	 * żądaniu; `dbDelta` (kosztowne) uruchamia się wyłącznie wtedy, gdy
	 * wersja w bazie różni się od wersji w kodzie. Bez tego kroku
	 * aktualizacja wtyczki przez FTP zostawiłaby stary schemat i nowy
	 * kod — awarię, która wygląda jak błąd kodu.
	 */
	public static function dociagnij_schemat(): void {
		if ( get_option( self::OPCJA_WERSJI ) === AAI_SKLEP_WERSJA ) {
			return;
		}
		self::utworz();
	}

	/**
	 * Czy komplet tabel istnieje — do diagnozy i do smoke'ów.
	 */
	public static function czy_gotowe(): bool {
		global $wpdb;
		foreach ( self::wszystkie() as $tabela ) {
			$istnieje = $wpdb->get_var(
				$wpdb->prepare( 'SHOW TABLES LIKE %s', $tabela )
			);
			if ( $istnieje !== $tabela ) {
				return false;
			}
		}
		return true;
	}
}
