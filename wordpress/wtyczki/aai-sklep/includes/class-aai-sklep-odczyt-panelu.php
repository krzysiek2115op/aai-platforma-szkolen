<?php
/**
 * Odczyt dla kreatora — osobno od odczytu dla strony, i to jest cała treść
 * tej decyzji.
 *
 * TRZY RÓŻNICE, KAŻDA Z POWODEM:
 *
 *  1. WSZYSTKIE STANY. Strona pyta o kursy opublikowane; panel musi widzieć
 *     szkice i ukryte, bo inaczej nie da się ich dokończyć.
 *  2. SEKCJE SUROWE, bez pobłażliwego odsiewu. Strona odsiewa treść o złym
 *     kształcie, żeby jedno zepsute pole nie zabrało klientowi całej oferty.
 *     W panelu byłoby to okrutne: pole odrzucone przez kontrakt zniknęłoby
 *     właścicielowi z formularza przy pierwszym otwarciu i nie miałby czego
 *     poprawić. Edytor ma pozwolić NAPRAWIĆ zły rekord, nie ukryć go.
 *  3. TREŚĆ LEKCJI. Materiał kursu jest towarem — kupujący płaci za dostęp
 *     do niego. Kolumnę `lessons.content` czyta WYŁĄCZNIE ta klasa, za bramą
 *     uprawnień panelu; katalog i strona sprzedażowa dostają z bazy samą
 *     informację, że lekcja ma treść (`ma_tresc`), nigdy tekst. To ta sama
 *     granica, którą w prototypie pilnowały `straznik-tresci-lekcji`
 *     i `smoke-lekcje`.
 *
 * KLASA WYŁĄCZNIE CZYTA. Do naszych tabel pisze `Aai_Sklep_Zapis` i tylko on.
 *
 * @package Aai_Sklep
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Odczyt kursów na potrzeby kreatora w kokpicie.
 */
final class Aai_Sklep_Odczyt_Panelu {

	/**
	 * Lista kursów do panelu: wszystkie stany, z licznikami postępu.
	 *
	 * `lekcje_z_trescia` to postęp pisania materiału — właściciel ma go
	 * widzieć BEZ wchodzenia w kurs, bo przy 73 lekcjach „ile jeszcze
	 * zostało" jest pierwszym pytaniem dnia.
	 *
	 * @return array<int,array<string,mixed>>
	 */
	public static function kursy(): array {
		global $wpdb;

		$t_kursy  = Aai_Sklep_Tabele::tabela( 'courses' );
		$t_sekcje = Aai_Sklep_Tabele::tabela( 'sections' );
		$t_moduly = Aai_Sklep_Tabele::tabela( 'modules' );
		$t_lekcje = Aai_Sklep_Tabele::tabela( 'lessons' );

		$wiersze = $wpdb->get_results(
			"SELECT c.id, c.slug, c.title, c.status, c.price_grosze, c.badge, c.level,
			        c.updated_at,
			        (SELECT COUNT(*) FROM `$t_sekcje` s WHERE s.course_id = c.id)
			          AS sekcji,
			        (SELECT COUNT(*) FROM `$t_moduly` m WHERE m.course_id = c.id)
			          AS modulow,
			        (SELECT COUNT(*) FROM `$t_lekcje` l
			           JOIN `$t_moduly` m ON m.id = l.module_id
			          WHERE m.course_id = c.id) AS lekcji,
			        (SELECT COUNT(*) FROM `$t_lekcje` l
			           JOIN `$t_moduly` m ON m.id = l.module_id
			          WHERE m.course_id = c.id
			            AND l.content IS NOT NULL AND l.content <> '')
			          AS lekcji_z_trescia
			   FROM `$t_kursy` c
			  ORDER BY c.created_at DESC", // phpcs:ignore WordPress.DB.PreparedSQL
			ARRAY_A
		);

		$kursy = array();
		foreach ( (array) $wiersze as $wiersz ) {
			$kursy[] = array(
				'id'               => (string) $wiersz['id'],
				'slug'             => (string) $wiersz['slug'],
				'title'            => (string) $wiersz['title'],
				'status'           => (string) $wiersz['status'],
				'price_grosze'     => (int) $wiersz['price_grosze'],
				'badge'            => null === $wiersz['badge'] ? null : (string) $wiersz['badge'],
				'level'            => null === $wiersz['level'] ? null : (string) $wiersz['level'],
				'sekcji'           => (int) $wiersz['sekcji'],
				'modulow'          => (int) $wiersz['modulow'],
				'lekcji'           => (int) $wiersz['lekcji'],
				'lekcji_z_trescia' => (int) $wiersz['lekcji_z_trescia'],
			);
		}
		return $kursy;
	}

	/**
	 * Identyfikator kursu po slugu — do odnośnika „Edytuj kurs" na froncie.
	 *
	 * Osobne, jednokolumnowe zapytanie zamiast pełnego odczytu kursu: pasek
	 * administracyjny potrzebuje adresu, nie treści, a strona kursu i tak
	 * właśnie wczytała swoje dane.
	 *
	 * @param string $slug Adres kursu.
	 */
	public static function id_po_slugu( string $slug ): ?string {
		global $wpdb;

		if ( '' === $slug ) {
			return null;
		}
		$t_kursy = Aai_Sklep_Tabele::tabela( 'courses' );
		$id      = $wpdb->get_var(
			$wpdb->prepare( "SELECT id FROM `$t_kursy` WHERE slug = %s", $slug )
		);
		return null === $id ? null : (string) $id;
	}

	/**
	 * Czy adres (slug) jest już zajęty przez INNY kurs.
	 *
	 * PO CO PYTAĆ, SKORO BAZA MA UNIQUE. Bo baza odpowiada wtedy błędem
	 * zapisu, a właściciel widzi „zapis się nie powiódł" zamiast „ten adres
	 * jest zajęty" przy polu, które ma poprawić. Kolumna zostaje ostatnią
	 * linią obrony — to jest pierwsza, ta z komunikatem.
	 *
	 * @param string $slug     Adres do sprawdzenia.
	 * @param string $id_kursu Kurs, którego to własny adres (pomijany).
	 */
	public static function slug_zajety( string $slug, string $id_kursu ): bool {
		global $wpdb;

		$t_kursy = Aai_Sklep_Tabele::tabela( 'courses' );
		$zajety  = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM `$t_kursy` WHERE slug = %s AND id <> %s",
				$slug,
				$id_kursu
			)
		);
		return (int) $zajety > 0;
	}

	/**
	 * Jeden kurs do edycji: kolumny, sekcje SUROWE i program.
	 *
	 * @param string $id Identyfikator kursu.
	 * @return array<string,mixed>|null
	 */
	public static function kurs( string $id ): ?array {
		global $wpdb;

		$t_kursy = Aai_Sklep_Tabele::tabela( 'courses' );

		$wiersz = $wpdb->get_row(
			$wpdb->prepare( "SELECT * FROM `$t_kursy` WHERE id = %s", $id ),
			ARRAY_A
		);
		if ( null === $wiersz ) {
			return null;
		}

		return array(
			'id'           => (string) $wiersz['id'],
			'slug'         => (string) $wiersz['slug'],
			'title'        => (string) $wiersz['title'],
			'type'         => (string) $wiersz['type'],
			'short_desc'   => null === $wiersz['short_desc'] ? '' : (string) $wiersz['short_desc'],
			'price_grosze' => (int) $wiersz['price_grosze'],
			'cover_url'    => null === $wiersz['cover_url'] ? '' : (string) $wiersz['cover_url'],
			'status'       => (string) $wiersz['status'],
			'badge'        => null === $wiersz['badge'] ? '' : (string) $wiersz['badge'],
			'level'        => null === $wiersz['level'] ? '' : (string) $wiersz['level'],
			'sekcje'       => self::sekcje( $id ),
			'moduly'       => self::program( $id ),
		);
	}

	/**
	 * Sekcje kursu: rodzaj → identyfikator i treść odkodowana z JSON-a.
	 *
	 * @param string $id_kursu Identyfikator kursu.
	 * @return array<string,array<string,mixed>>
	 */
	private static function sekcje( string $id_kursu ): array {
		global $wpdb;

		$t_sekcje = Aai_Sklep_Tabele::tabela( 'sections' );

		$wiersze = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT id, kind, content FROM `$t_sekcje` WHERE course_id = %s",
				$id_kursu
			),
			ARRAY_A
		);

		$sekcje = array();
		foreach ( (array) $wiersze as $wiersz ) {
			$rodzaj = (string) $wiersz['kind'];
			$tresc  = json_decode( (string) $wiersz['content'], true );
			$sekcje[ $rodzaj ] = array(
				'id'    => (string) $wiersz['id'],
				'tresc' => is_array( $tresc ) ? $tresc : array(),
			);
		}
		return $sekcje;
	}

	/**
	 * Program kursu: moduły z lekcjami, bez treści lekcji.
	 *
	 * `ma_tresc` decyduje o tym, czy panel pokaże przy lekcji przycisk
	 * „Treść" jako zaczętą pracę czy jako pustkę — a przy okazji jest
	 * dowodem, że spis treści da się wczytać BEZ czytania 1,3 MB prozy.
	 *
	 * @param string $id_kursu Identyfikator kursu.
	 * @return array<int,array<string,mixed>>
	 */
	private static function program( string $id_kursu ): array {
		global $wpdb;

		$t_moduly = Aai_Sklep_Tabele::tabela( 'modules' );
		$t_lekcje = Aai_Sklep_Tabele::tabela( 'lessons' );

		$moduly = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT id, position, title, summary FROM `$t_moduly`
				  WHERE course_id = %s ORDER BY position",
				$id_kursu
			),
			ARRAY_A
		);

		$wynik = array();
		foreach ( (array) $moduly as $modul ) {
			$id_modulu = (string) $modul['id'];

			$lekcje = $wpdb->get_results(
				$wpdb->prepare(
					"SELECT id, position, title, duration_min, preview,
					        (content IS NOT NULL AND content <> '') AS ma_tresc,
					        CHAR_LENGTH(COALESCE(content, '')) AS znakow
					   FROM `$t_lekcje` WHERE module_id = %s ORDER BY position",
					$id_modulu
				),
				ARRAY_A
			);

			$lista = array();
			foreach ( (array) $lekcje as $lekcja ) {
				$lista[] = array(
					'id'           => (string) $lekcja['id'],
					'position'     => (int) $lekcja['position'],
					'title'        => (string) $lekcja['title'],
					'duration_min' => null === $lekcja['duration_min'] ? '' : (string) (int) $lekcja['duration_min'],
					'preview'      => (bool) (int) $lekcja['preview'],
					'ma_tresc'     => (bool) (int) $lekcja['ma_tresc'],
					'znakow'       => (int) $lekcja['znakow'],
				);
			}

			$wynik[] = array(
				'id'       => $id_modulu,
				'position' => (int) $modul['position'],
				'title'    => (string) $modul['title'],
				'summary'  => null === $modul['summary'] ? '' : (string) $modul['summary'],
				'lekcje'   => $lista,
			);
		}
		return $wynik;
	}

	/**
	 * Jedna lekcja do pisania: treść, materiały i KONTEKST.
	 *
	 * Kontekst (kurs, moduł, numer w programie) nie jest ozdobą: edytor
	 * lekcji to osobny ekran, więc bez niego panel nie miałby jak nazwać
	 * tego, co właściciel pisze, ani dokąd wrócić — a przy 73 lekcjach
	 * pomyłka o jedną kosztuje godzinę pracy.
	 *
	 * @param string $id Identyfikator lekcji.
	 * @return array<string,mixed>|null
	 */
	public static function lekcja( string $id ): ?array {
		global $wpdb;

		$t_lekcje = Aai_Sklep_Tabele::tabela( 'lessons' );
		$t_moduly = Aai_Sklep_Tabele::tabela( 'modules' );
		$t_kursy  = Aai_Sklep_Tabele::tabela( 'courses' );

		$wiersz = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT l.id, l.title, l.content, l.materials, l.position AS pozycja_lekcji,
				        m.id AS modul_id, m.title AS modul_tytul, m.position AS pozycja_modulu,
				        c.id AS kurs_id, c.title AS kurs_tytul, c.slug AS kurs_slug
				   FROM `$t_lekcje` l
				   JOIN `$t_moduly` m ON m.id = l.module_id
				   JOIN `$t_kursy` c ON c.id = m.course_id
				  WHERE l.id = %s",
				$id
			),
			ARRAY_A
		);
		if ( null === $wiersz ) {
			return null;
		}

		$materialy = json_decode( (string) $wiersz['materials'], true );

		return array(
			'id'          => (string) $wiersz['id'],
			'title'       => (string) $wiersz['title'],
			'tresc'       => (string) ( $wiersz['content'] ?? '' ),
			'materialy'   => is_array( $materialy ) ? $materialy : array(),
			'kurs_id'     => (string) $wiersz['kurs_id'],
			'kurs_tytul'  => (string) $wiersz['kurs_tytul'],
			'kurs_slug'   => (string) $wiersz['kurs_slug'],
			'modul_tytul' => (string) $wiersz['modul_tytul'],
			'numer'       => self::numer( (string) $wiersz['kurs_id'], (string) $wiersz['modul_id'], $id ),
		);
	}

	/**
	 * Numer lekcji jak w programie na stronie („3.4").
	 *
	 * Liczymy z KOLEJNOŚCI, nie z kolumny `position`: pozycje mają dziury
	 * (decyzja właściciela 2026-08-23 — „dziury zostają"), a strona i tak
	 * numeruje moduły kolejnością wyświetlania. Numer z pozycji kłamałby
	 * więc wobec tego, co widzi kupujący.
	 *
	 * @param string $id_kursu  Identyfikator kursu.
	 * @param string $id_modulu Identyfikator modułu.
	 * @param string $id_lekcji Identyfikator lekcji.
	 */
	private static function numer( string $id_kursu, string $id_modulu, string $id_lekcji ): string {
		global $wpdb;

		$t_moduly = Aai_Sklep_Tabele::tabela( 'modules' );
		$t_lekcje = Aai_Sklep_Tabele::tabela( 'lessons' );

		$moduly = (array) $wpdb->get_col(
			$wpdb->prepare(
				"SELECT id FROM `$t_moduly` WHERE course_id = %s ORDER BY position",
				$id_kursu
			)
		);
		$lekcje = (array) $wpdb->get_col(
			$wpdb->prepare(
				"SELECT id FROM `$t_lekcje` WHERE module_id = %s ORDER BY position",
				$id_modulu
			)
		);

		$nr_modulu = array_search( $id_modulu, $moduly, true );
		$nr_lekcji = array_search( $id_lekcji, $lekcje, true );

		return sprintf(
			'%d.%d',
			false === $nr_modulu ? 0 : $nr_modulu + 1,
			false === $nr_lekcji ? 0 : $nr_lekcji + 1
		);
	}
}
