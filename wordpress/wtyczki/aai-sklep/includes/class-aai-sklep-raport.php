<?php
/**
 * Raport stanu tabel — materiał dowodowy, nie widok.
 *
 * PO CO. Bramka kroku W2 brzmi „73 lekcje zgodne CO DO ZNAKU", a takiego
 * zdania nie da się udowodnić po stronie WordPressa: trzeba porównać dwie
 * bazy. Ten plik oddaje stan NASZEJ strony w formie, którą prototyp umie
 * porównać ze swoją (`tools/sprawdz-import-wp.mjs`).
 *
 * DLACZEGO SKRÓT, A NIE TREŚĆ. Treść lekcji waży 908 kB; przepychanie jej
 * przez `podman exec` tylko po to, żeby porównać, byłoby marnotrawstwem
 * i wpuszczałoby po drodze kodowanie transportu. `sha256` całego łańcucha
 * jest odporny na transport i mocniejszy niż porównanie sum — a właśnie
 * na sumach potknęła się migracja 0.36.0 (`LENGTH()` w MySQL liczy BAJTY,
 * a `.length` w JavaScripcie jednostki UTF-16; „utrata" 47 tys. znaków
 * okazała się siedmioma emoji).
 *
 * Struktury drobne (sekcje sprzedażowe, materiały lekcji) jadą w całości
 * — są małe, a porównanie STRUKTURY łapie rzeczy, których skrót by nie
 * pokazał: pusty obiekt zamieniony w pustą listę wygląda tak samo
 * w sumie i inaczej w danych.
 *
 * @package Aai_Sklep
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Odczyt stanu tabel na potrzeby dowodu.
 */
final class Aai_Sklep_Raport {

	/**
	 * Pełny stan naszych tabel.
	 *
	 * @return array<string,mixed>
	 */
	public static function stan(): array {
		global $wpdb;

		$t_kursy  = Aai_Sklep_Tabele::tabela( 'courses' );
		$t_sekcje = Aai_Sklep_Tabele::tabela( 'sections' );
		$t_moduly = Aai_Sklep_Tabele::tabela( 'modules' );
		$t_lekcje = Aai_Sklep_Tabele::tabela( 'lessons' );

		$kursy = array();
		$wiersze_kursow = $wpdb->get_results( "SELECT * FROM `$t_kursy` ORDER BY slug", ARRAY_A ); // phpcs:ignore WordPress.DB.PreparedSQL

		foreach ( (array) $wiersze_kursow as $k ) {
			$id = (string) $k['id'];

			$sekcje = array();
			$wiersze_sekcji = $wpdb->get_results(
				$wpdb->prepare( "SELECT * FROM `$t_sekcje` WHERE course_id = %s ORDER BY kind", $id ),
				ARRAY_A
			);
			foreach ( (array) $wiersze_sekcji as $s ) {
				$sekcje[] = array(
					'id'      => (string) $s['id'],
					'kind'    => (string) $s['kind'],
					'content' => json_decode( (string) $s['content'], true ),
				);
			}

			$moduly = array();
			$wiersze_modulow = $wpdb->get_results(
				$wpdb->prepare( "SELECT * FROM `$t_moduly` WHERE course_id = %s ORDER BY position", $id ),
				ARRAY_A
			);
			foreach ( (array) $wiersze_modulow as $m ) {
				$mid = (string) $m['id'];

				/*
				 * `CHAR_LENGTH` i `LENGTH` liczy BAZA, `mb_strlen` liczy PHP.
				 * Rozjazd tej pary znaczy, że połączenie ma inne kodowanie
				 * niż tabela — klasyczna cicha korupcja, która na oko
				 * wygląda jak poprawnie zapisany tekst.
				 */
				$wiersze_lekcji = $wpdb->get_results(
					$wpdb->prepare(
						"SELECT id, position, title, duration_min, preview, materials, content,
						        CHAR_LENGTH(content) AS znakow_sql, LENGTH(content) AS bajtow_sql
						 FROM `$t_lekcje` WHERE module_id = %s ORDER BY position",
						$mid
					),
					ARRAY_A
				);

				$lekcje = array();
				foreach ( (array) $wiersze_lekcji as $l ) {
					$tresc    = (string) $l['content'];
					$lekcje[] = array(
						'id'           => (string) $l['id'],
						'position'     => (int) $l['position'],
						'title'        => (string) $l['title'],
						'duration_min' => null === $l['duration_min'] ? null : (int) $l['duration_min'],
						'preview'      => (bool) (int) $l['preview'],
						'materials'    => json_decode( (string) $l['materials'], true ),
						'sha256'       => hash( 'sha256', $tresc ),
						'znakow_php'   => mb_strlen( $tresc, 'UTF-8' ),
						'znakow_sql'   => (int) $l['znakow_sql'],
						'bajtow_sql'   => (int) $l['bajtow_sql'],
					);
				}

				$moduly[] = array(
					'id'       => $mid,
					'position' => (int) $m['position'],
					'title'    => (string) $m['title'],
					'summary'  => null === $m['summary'] ? null : (string) $m['summary'],
					'lekcje'   => $lekcje,
				);
			}

			$kursy[] = array(
				'id'           => $id,
				'slug'         => (string) $k['slug'],
				'title'        => (string) $k['title'],
				'type'         => (string) $k['type'],
				'short_desc'   => null === $k['short_desc'] ? null : (string) $k['short_desc'],
				'price_grosze' => (int) $k['price_grosze'],
				'cover_url'    => null === $k['cover_url'] ? null : (string) $k['cover_url'],
				'status'       => (string) $k['status'],
				'badge'        => null === $k['badge'] ? null : (string) $k['badge'],
				'level'        => null === $k['level'] ? null : (string) $k['level'],
				'sekcje'       => $sekcje,
				'moduly'       => $moduly,
			);
		}

		return array(
			'tabele' => self::liczniki_tabel(),
			'kursy'  => $kursy,
		);
	}

	/**
	 * Identyfikator kursu po slugu — albo null.
	 *
	 * @param string $slug Slug kursu.
	 */
	public static function id_po_slugu( string $slug ): ?string {
		global $wpdb;

		$t_kursy = Aai_Sklep_Tabele::tabela( 'courses' );
		$id      = $wpdb->get_var(
			$wpdb->prepare( "SELECT id FROM `$t_kursy` WHERE slug = %s", $slug )
		);
		return null === $id ? null : (string) $id;
	}

	/**
	 * Ile wierszy w każdej naszej tabeli. `changelog` jest tu nie dla
	 * ozdoby: „dziennik nie urósł po powtórnym imporcie" to najostrzejszy
	 * test idempotencji, jaki mamy.
	 *
	 * BRAKUJĄCA TABELA ODDAJE `null`, A NIE ZERO — i to jest naprawa,
	 * nie szczegół typu. Do 0.78.0 stało tu rzutowanie `(int)` na wyniku
	 * `get_var()`, które przy nieistniejącej tabeli zwraca `null`; zero
	 * czytało się wtedy jak „tabela jest, tylko pusta". Kontrola
	 * `wp aai-sklep sprawdz` ma regułę wprost dla tego przypadku
	 * („brak tabeli to nie zero wierszy — to sklep bez nośnika"), ale
	 * porównywała z `null`, którego nigdy nie dostawała: reguła była
	 * MARTWA. Zmierzone przez schowanie tabeli `courses` — komenda
	 * odpowiedziała „Success: Sklep w porządku." z kodem 0, przy sklepie
	 * bez ani jednego kursu w bazie.
	 *
	 * Istnienie tabeli rozstrzyga `SHOW TABLES LIKE`, tak jak w Pluginie 2
	 * (`Aai_Platnosci_Tabele::istnieja()`) i w Pluginie 3
	 * (`Aai_Monitor_Tabele::brakujace()`) — samo `COUNT(*)` na nieistniejącej
	 * tabeli zapisuje przy okazji błąd bazy, którego nikt nie czyta.
	 *
	 * @return array<string,int|null> Liczba wierszy albo `null`, gdy tabeli nie ma.
	 */
	public static function liczniki_tabel(): array {
		global $wpdb;

		$wynik = array();
		foreach ( array( 'courses', 'sections', 'modules', 'lessons', 'changelog' ) as $nazwa ) {
			$tabela = Aai_Sklep_Tabele::tabela( $nazwa );

			$istnieje = $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $tabela ) );
			if ( $istnieje !== $tabela ) {
				$wynik[ $nazwa ] = null;
				continue;
			}

			$ile             = $wpdb->get_var( "SELECT COUNT(*) FROM `$tabela`" ); // phpcs:ignore WordPress.DB.PreparedSQL
			$wynik[ $nazwa ] = null === $ile ? null : (int) $ile;
		}
		return $wynik;
	}
}
