<?php
/**
 * „Moje kursy" — strona, na którą trafia klient po zakupie.
 *
 * PO CO ISTNIEJE. Do 0.45.0 kupiony kurs był w systemie, ale klient nie miał
 * jak do niego trafić: logowanie WordPressa wyrzuca na `/my-account/`, a jedyną
 * listą kupionych kursów był panel Tutora — pełnoekranowa aplikacja z własnym
 * paskiem bocznym, własnym nagłówkiem i oknem powitalnym Tutora (ze zrzutem
 * cudzego kursu fotografii i napisem „Hi, Sophia!"). Właściciel znalazł to
 * w teście ręcznym W6 słowami „zalogowałem się na dane klienta i nie widzę
 * kupionego kursu" — i podjął decyzję: robimy WŁASNY widok, a panel Tutora
 * przekierowujemy tutaj.
 *
 * To jest ta sama zasada, którą kierowaliśmy się w W3 i W5: klient nigdy nie
 * ogląda cudzego wyglądu. Tutor zostaje tam, gdzie jest naprawdę potrzebny —
 * trzyma konta, zapisy na kurs i stan ukończenia lekcji. O to go tutaj pytamy
 * i nic więcej od niego nie bierzemy.
 *
 * CZEGO TU NIE MA I DLACZEGO. Nie liczymy postępu sami: `is_completed_lesson()`
 * to stan Tutora i tylko on wie, co klient odhaczył w widoku lekcji (W5).
 * Własny licznik byłby drugą kopią tej samej prawdy — a rozjazd dwóch kopii
 * jest w tym projekcie najdroższą klasą błędu (BLAD-015).
 *
 * @package Aai_Sklep
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Lista kupionych kursów z postępem.
 */
final class Aai_Sklep_Moje {

	/**
	 * Adres widoku — jedno źródło prawdy dla trasy, menu i przekierowań.
	 */
	public const SCIEZKA = 'szkolenia/moje';

	/**
	 * Pełny adres „Moich kursów".
	 */
	public static function adres(): string {
		return user_trailingslashit( home_url( '/' . self::SCIEZKA ) );
	}

	/**
	 * Rejestracja — wołane raz, z pliku głównego wtyczki.
	 */
	public static function zarejestruj(): void {
		// Panel kursanta Tutora przekierowujemy do nas. `template_redirect`,
		// bo dopiero tam wiadomo, którą stronę WordPress wybrał.
		add_action( 'template_redirect', array( self::class, 'przekieruj_z_panelu' ), 5 );
	}

	/**
	 * Panel Tutora → nasze „Moje kursy".
	 *
	 * DLACZEGO TYLKO PANEL, A NIE CAŁY `/dashboard/*`. Bo pod tym adresem
	 * Tutor trzyma też rzeczy, których nie dublujemy (odzyskiwanie hasła,
	 * ustawienia konta). Przekierowanie wszystkiego odcięłoby klientowi
	 * drogę do nich, a zysk byłby żaden — do tamtych podstron i tak nic
	 * u nas nie prowadzi, skoro pasek boczny Tutora znika razem z panelem.
	 */
	public static function przekieruj_z_panelu(): void {
		if ( ! function_exists( 'tutor_utils' ) ) {
			return;
		}
		$strona_panelu = (int) tutor_utils()->get_option( 'tutor_dashboard_page_id' );
		if ( $strona_panelu <= 0 || ! is_page( $strona_panelu ) ) {
			return;
		}

		$podstrona = (string) get_query_var( 'tutor_dashboard_page' );
		// Pusta podstrona = korzeń panelu; `courses` = lista kupionych kursów.
		// Obie zastępujemy własnym widokiem, resztę zostawiamy Tutorowi.
		if ( '' !== $podstrona && 'courses' !== $podstrona ) {
			return;
		}

		wp_safe_redirect( self::adres(), 302 );
		exit;
	}

	/**
	 * Kursy kupione przez zalogowanego klienta, z postępem.
	 *
	 * @return array<int,array<string,mixed>>
	 */
	public static function kursy(): array {
		$uzytkownik = get_current_user_id();
		if ( $uzytkownik <= 0 || ! function_exists( 'tutor_utils' ) ) {
			return array();
		}

		$zapisane = (array) tutor_utils()->get_enrolled_courses_ids_by_user( $uzytkownik );
		if ( ! $zapisane ) {
			return array();
		}

		// Nasze kursy po uuid — dopasowanie idzie po `_aai_zrodlo_uuid`, nie po
		// slugu, tak samo jak synchronizacja do Tutora (slug bywa poprawiany).
		$nasze = array();
		foreach ( Aai_Sklep_Odczyt::lista_kursow() as $kurs ) {
			$nasze[ $kurs['id'] ] = $kurs;
		}

		$wynik = array();
		foreach ( $zapisane as $id_kursu ) {
			$id_kursu = (int) $id_kursu;
			$uuid     = (string) get_post_meta( $id_kursu, Aai_Sklep_Tutor::META_UUID, true );
			// Kurs spoza kreatora albo cofnięty do szkicu: klient jest na niego
			// zapisany, ale my nie mamy czego pokazać. Milczymy — obietnica
			// „masz dostęp" bez treści byłaby gorsza niż brak kafelka.
			if ( '' === $uuid || ! isset( $nasze[ $uuid ] ) ) {
				continue;
			}

			$lekcje      = self::lekcje_kursu( $id_kursu );
			$ukonczonych = 0;
			$dalej       = null;
			foreach ( $lekcje as $lekcja ) {
				if ( tutor_utils()->is_completed_lesson( $lekcja['id'], $uzytkownik ) ) {
					++$ukonczonych;
					continue;
				}
				if ( null === $dalej ) {
					$dalej = $lekcja;
				}
			}

			$wszystkich = count( $lekcje );
			$wynik[]    = array_merge(
				$nasze[ $uuid ],
				array(
					'wszystkich'  => $wszystkich,
					'ukonczonych' => $ukonczonych,
					'procent'     => $wszystkich > 0 ? (int) round( $ukonczonych * 100 / $wszystkich ) : 0,
					// Gdy wszystko odhaczone, „dalej" wraca na początek —
					// kurs czyta się też drugi raz.
					'dalej'       => $dalej ?? ( $lekcje[0] ?? null ),
					'skonczony'   => $wszystkich > 0 && $ukonczonych === $wszystkich,
				)
			);
		}

		return $wynik;
	}

	/**
	 * Lekcje kursu w kolejności programu: `[ id, tytul, adres ]`.
	 *
	 * Pytamy o wpisy TUTORA, bo to one mają adresy i to ich dotyczy stan
	 * ukończenia. Kolejność bierzemy z `menu_order`, którą ustawia nasza
	 * synchronizacja — czyli z programu z kreatora.
	 *
	 * @param int $id_kursu Wpis kursu w Tutorze.
	 * @return array<int,array<string,mixed>>
	 */
	private static function lekcje_kursu( int $id_kursu ): array {
		$typy = Aai_Sklep_Tutor::typy();

		$moduly = get_posts(
			array(
				'post_type'   => $typy['modul'],
				'post_status' => 'any',
				'post_parent' => $id_kursu,
				'numberposts' => -1,
				'orderby'     => 'menu_order',
				'order'       => 'ASC',
				'fields'      => 'ids',
			)
		);
		if ( ! $moduly ) {
			return array();
		}

		$lekcje = array();
		foreach ( (array) $moduly as $id_modulu ) {
			$wpisy = get_posts(
				array(
					'post_type'   => $typy['lekcja'],
					'post_status' => 'any',
					'post_parent' => (int) $id_modulu,
					'numberposts' => -1,
					'orderby'     => 'menu_order',
					'order'       => 'ASC',
				)
			);
			foreach ( (array) $wpisy as $wpis ) {
				$lekcje[] = array(
					'id'    => (int) $wpis->ID,
					'tytul' => (string) $wpis->post_title,
					'adres' => (string) get_permalink( $wpis ),
				);
			}
		}
		return $lekcje;
	}
}
