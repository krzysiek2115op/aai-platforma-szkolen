<?php
/**
 * Warstwa odczytu — port kanału JSON z prototypu (`modules/m1-sklep/odczyt.ts`).
 *
 * PO CO OSOBNA KLASA, SKORO JEST JUŻ `Aai_Sklep_Raport`. Bo to dwie różne
 * rzeczy. Raport oddaje MATERIAŁ DOWODOWY: skróty sha256, liczniki bajtów,
 * pełny stan tabel do porównania z drugą bazą — i celowo nie nadaje się do
 * renderowania strony (nie ma treści lekcji, ma za to trzy sposoby liczenia
 * znaków). Tutaj jest ODCZYT DLA STRONY: dokładnie te pola, których potrzebuje
 * katalog i strona sprzedażowa, w kolejności, w której mają się pokazać.
 *
 * ZASADA Z PROTOTYPU, KTÓRA ZOSTAJE: liczniki (moduły, lekcje, minuty) liczy
 * BAZA, nie szablon. Szablon, który sam sumuje, prędzej czy później policzy
 * co innego niż drugi szablon obok — a rozjazd liczby lekcji między katalogiem
 * a stroną kursu to dokładnie ta klasa usterki, którą przegląd B7 znalazł
 * w miniaturze OG („41 41 lekcji").
 *
 * KLASA WYŁĄCZNIE CZYTA. Do naszych tabel pisze `Aai_Sklep_Zapis` i tylko on
 * (ósmy niezmiennik `straznik-wtyczki-wp`) — tam mieszkają transakcje, dziennik
 * audytu i odmowa skasowania napisanej treści.
 *
 * @package Aai_Sklep
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Odczyt kursów na potrzeby stron `/szkolenia`.
 */
final class Aai_Sklep_Odczyt {

	/**
	 * Katalog: wyłącznie kursy opublikowane, najnowsze pierwsze.
	 *
	 * Liczniki idą podzapytaniami, a nie `GROUP BY` ze złączeniami — dwa
	 * `LEFT JOIN` z rzędu mnożą wiersze (każda lekcja razy każdy moduł),
	 * więc `COUNT` po takim złączeniu trzeba ratować `DISTINCT`, a `SUM`
	 * już się nie da. Podzapytanie liczy to, co ma policzyć, i czyta się
	 * dokładnie tak, jak brzmi pytanie.
	 *
	 * @return array<int,array<string,mixed>>
	 */
	public static function lista_kursow(): array {
		global $wpdb;

		$t_kursy  = Aai_Sklep_Tabele::tabela( 'courses' );
		$t_moduly = Aai_Sklep_Tabele::tabela( 'modules' );
		$t_lekcje = Aai_Sklep_Tabele::tabela( 'lessons' );

		$wiersze = $wpdb->get_results(
			"SELECT c.id, c.slug, c.title, c.type, c.short_desc, c.price_grosze,
			        c.cover_url, c.status, c.badge, c.level,
			        (SELECT COUNT(*) FROM `$t_moduly` m WHERE m.course_id = c.id)
			          AS modules_count,
			        (SELECT COUNT(*) FROM `$t_lekcje` l
			           JOIN `$t_moduly` m ON m.id = l.module_id
			          WHERE m.course_id = c.id) AS lessons_count,
			        (SELECT COALESCE(SUM(l.duration_min), 0) FROM `$t_lekcje` l
			           JOIN `$t_moduly` m ON m.id = l.module_id
			          WHERE m.course_id = c.id) AS total_min
			   FROM `$t_kursy` c
			  WHERE c.status = 'published'
			  ORDER BY c.created_at DESC", // phpcs:ignore WordPress.DB.PreparedSQL
			ARRAY_A
		);

		$kursy = array();
		foreach ( (array) $wiersze as $wiersz ) {
			$kursy[] = self::karta( $wiersz );
		}
		return $kursy;
	}

	/**
	 * Strona sprzedażowa: pełny kurs z sekcjami, modułami i lekcjami.
	 *
	 * Szkice widzi wyłącznie ten, kto nimi zarządza — dla wszystkich
	 * innych kurs w statusie `draft` po prostu NIE ISTNIEJE (zwracamy
	 * `null`, trasa oddaje 404). To ta sama zasada co w prototypie:
	 * nieopublikowana treść nie ma prawa wyciec przez adres, który ktoś
	 * zgadł, a właściciel musi umieć obejrzeć kurs przed publikacją —
	 * publikacja „w ciemno" to publikacja z literówkami.
	 *
	 * @param string $slug         Slug kursu.
	 * @param bool   $takze_szkice Czy pokazać także kursy nieopublikowane.
	 * @return array<string,mixed>|null
	 */
	public static function szczegoly_kursu( string $slug, bool $takze_szkice = false ): ?array {
		global $wpdb;

		$t_kursy = Aai_Sklep_Tabele::tabela( 'courses' );

		$wiersz = $takze_szkice
			? $wpdb->get_row(
				$wpdb->prepare( "SELECT * FROM `$t_kursy` WHERE slug = %s", $slug ),
				ARRAY_A
			)
			: $wpdb->get_row(
				$wpdb->prepare(
					"SELECT * FROM `$t_kursy` WHERE slug = %s AND status = 'published'",
					$slug
				),
				ARRAY_A
			);

		if ( null === $wiersz ) {
			return null;
		}

		$kurs             = self::karta( $wiersz );
		$kurs['sections'] = self::sekcje( $kurs['id'] );
		$kurs['modules']  = self::moduly( $kurs['id'] );

		// Liczniki karty przy odczycie po slugu składamy z programu, który
		// właśnie wczytaliśmy — jedno źródło zamiast trzech podzapytań
		// mówiących o tym samym.
		$kurs['modules_count'] = count( $kurs['modules'] );
		$kurs['lessons_count'] = 0;
		$kurs['total_min']     = 0;
		foreach ( $kurs['modules'] as $modul ) {
			$kurs['lessons_count'] += count( $modul['lessons'] );
			foreach ( $modul['lessons'] as $lekcja ) {
				$kurs['total_min'] += (int) $lekcja['duration_min'];
			}
		}

		return $kurs;
	}

	/**
	 * Sekcje sprzedażowe kursu, po jednej na rodzaj.
	 *
	 * Kolejność po `kind` jest bez znaczenia dla wyglądu — o kolejności
	 * na stronie decyduje szablon (psychologia scrolla z briefu B5), a nie
	 * baza. Tabela ma `UNIQUE (course_id, kind)` i NIE MA kolumny `position`
	 * (decyzja właściciela 2026-08-25), więc nie ma czego sortować.
	 *
	 * @param string $id_kursu Identyfikator kursu.
	 * @return array<string,array<string,mixed>> Rodzaj sekcji → sprawdzona treść.
	 */
	private static function sekcje( string $id_kursu ): array {
		global $wpdb;

		$t_sekcje = Aai_Sklep_Tabele::tabela( 'sections' );
		$wiersze  = $wpdb->get_results(
			$wpdb->prepare( "SELECT kind, content FROM `$t_sekcje` WHERE course_id = %s", $id_kursu ),
			ARRAY_A
		);

		$sekcje = array();
		foreach ( (array) $wiersze as $wiersz ) {
			$rodzaj = (string) $wiersz['kind'];
			$tresc  = json_decode( (string) $wiersz['content'], true );

			// Sekcja o złym kształcie ZNIKA, zamiast wysadzać stronę —
			// odpowiednik `safeParse` z prototypu. Treść wpisuje kreator,
			// a jedno pole nie tego typu nie może wywalić całej oferty.
			$sprawdzona = Aai_Sklep_Sekcje::sprawdz( $rodzaj, $tresc );
			if ( null !== $sprawdzona ) {
				$sekcje[ $rodzaj ] = $sprawdzona;
			}
		}
		return $sekcje;
	}

	/**
	 * Program kursu: moduły z lekcjami, w kolejności z pozycji.
	 *
	 * `ma_tresc` mówi, czy lekcja ma napisany materiał — strona sprzedażowa
	 * tego nie pokazuje, ale kreator i przyszły widok kursu tak, a jedno
	 * zapytanie mniej to jedno miejsce mniej, w którym te dwie liczby mogą
	 * się rozjechać. Sama TREŚĆ nie wchodzi: waży 908 kB i strona
	 * sprzedażowa nie ma jej po co wczytywać.
	 *
	 * @param string $id_kursu Identyfikator kursu.
	 * @return array<int,array<string,mixed>>
	 */
	private static function moduly( string $id_kursu ): array {
		global $wpdb;

		$t_moduly = Aai_Sklep_Tabele::tabela( 'modules' );
		$t_lekcje = Aai_Sklep_Tabele::tabela( 'lessons' );

		$wiersze_modulow = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT id, position, title, summary FROM `$t_moduly`
				  WHERE course_id = %s ORDER BY position",
				$id_kursu
			),
			ARRAY_A
		);

		$moduly = array();
		foreach ( (array) $wiersze_modulow as $modul ) {
			$id_modulu = (string) $modul['id'];

			$wiersze_lekcji = $wpdb->get_results(
				$wpdb->prepare(
					"SELECT id, position, title, duration_min, preview,
					        (content IS NOT NULL AND content <> '') AS ma_tresc
					   FROM `$t_lekcje` WHERE module_id = %s ORDER BY position",
					$id_modulu
				),
				ARRAY_A
			);

			$lekcje = array();
			foreach ( (array) $wiersze_lekcji as $lekcja ) {
				$lekcje[] = array(
					'id'           => (string) $lekcja['id'],
					'position'     => (int) $lekcja['position'],
					'title'        => (string) $lekcja['title'],
					'duration_min' => null === $lekcja['duration_min'] ? null : (int) $lekcja['duration_min'],
					'preview'      => (bool) (int) $lekcja['preview'],
					'ma_tresc'     => (bool) (int) $lekcja['ma_tresc'],
				);
			}

			$moduly[] = array(
				'id'       => $id_modulu,
				'position' => (int) $modul['position'],
				'title'    => (string) $modul['title'],
				'summary'  => null === $modul['summary'] ? null : (string) $modul['summary'],
				'lessons'  => $lekcje,
			);
		}
		return $moduly;
	}

	/**
	 * Wiersz kursu → karta o stałym kształcie.
	 *
	 * Typy nadajemy TUTAJ, raz. `$wpdb` oddaje wszystko jako łańcuchy, więc
	 * bez tego `price_grosze` byłoby napisem, a `0` z bazy — napisem „0",
	 * który w PHP jest fałszem, ale w porównaniu `=== 0` już nie. Kształt
	 * odpowiada `KartaKatalogu` z `modules/m1-sklep/typy.ts`.
	 *
	 * @param array<string,mixed> $wiersz Wiersz z bazy.
	 * @return array<string,mixed>
	 */
	/**
	 * Karta kursu po uuid — publiczny odczyt dla innych wtyczek (L2).
	 *
	 * Powstało dla Pluginu 2: akcja `aai_sklep_kurs_zmieniony` niesie sam
	 * uuid, a `szczegoly_kursu()` bierze slug i tylko kursy opublikowane.
	 * Tu wracają kursy w KAŻDYM stanie (szkic, zarchiwizowany) — słuchacz
	 * musi znać stan, żeby przestawić produkt na `draft` (tabela stanów
	 * w docs/plugin-2/DIAGRAM.md, sekcja 9.3). Zwraca kartę BEZ sekcji,
	 * programu i treści lekcji — cena i stan to wszystko, czego szew
	 * potrzebuje, a materiał kursu nie ma czego szukać poza tą wtyczką.
	 *
	 * @param string $id Uuid kursu.
	 * @return array<string,mixed>|null
	 */
	public static function kurs_po_id( string $id ): ?array {
		global $wpdb;

		$t_kursy = Aai_Sklep_Tabele::tabela( 'courses' );

		$wiersz = $wpdb->get_row(
			$wpdb->prepare( "SELECT * FROM `$t_kursy` WHERE id = %s", $id ),
			ARRAY_A
		);

		return null === $wiersz ? null : self::karta( $wiersz );
	}

	private static function karta( array $wiersz ): array {
		$tekst_lub_null = static fn( $wartosc ) => null === $wartosc || '' === $wartosc
			? null
			: (string) $wartosc;

		return array(
			'id'            => (string) $wiersz['id'],
			'slug'          => (string) $wiersz['slug'],
			'title'         => (string) $wiersz['title'],
			'type'          => (string) $wiersz['type'],
			'short_desc'    => $tekst_lub_null( $wiersz['short_desc'] ?? null ),
			'price_grosze'  => (int) $wiersz['price_grosze'],
			'cover_url'     => $tekst_lub_null( $wiersz['cover_url'] ?? null ),
			'status'        => (string) $wiersz['status'],
			'badge'         => $tekst_lub_null( $wiersz['badge'] ?? null ),
			'level'         => $tekst_lub_null( $wiersz['level'] ?? null ),
			'modules_count' => (int) ( $wiersz['modules_count'] ?? 0 ),
			'lessons_count' => (int) ( $wiersz['lessons_count'] ?? 0 ),
			'total_min'     => (int) ( $wiersz['total_min'] ?? 0 ),
		);
	}
}
