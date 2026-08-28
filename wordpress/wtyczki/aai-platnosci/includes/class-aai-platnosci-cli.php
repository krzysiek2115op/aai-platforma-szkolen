<?php
/**
 * Komendy WP-CLI Pluginu 2 — kontrola w wersji minimalnej (krok P1).
 *
 * ROLE SĄ ROZDZIELONE (L11 z krytyki P0): kontrola NIGDY nie pisze —
 * inaczej mierzyłaby skutek własnego działania i nigdy nie byłaby
 * czerwona. Ustawianie żyje przy aktywacji i (od P3a) w `sync --napraw`.
 *
 * Kody wyjścia:
 *  - 0 — porządek, ALBO stan „Woo/Tutor wyłączone" (z komunikatem;
 *    1 rezerwujemy dla działającego otoczenia z rozjazdem, bo bramka P1
 *    mówi „wyłączenie Woo daje komunikat" — kod 1 by jej przeczył),
 *  - 0 z OSTRZEŻENIEM — inna wersja Tutora/Woo niż dowiedziona
 *    (aktualizacja to nie awaria, ale unieważnia dowody — L17),
 *  - 1 — rozjazd: wtyczka aktywna, a jej tabel nie ma.
 *
 * Kolejne kroki (P2+) tylko DOKŁADAJĄ sprawdzenia do tej komendy —
 * kontrola rośnie razem z wtyczką.
 *
 * @package Aai_Platnosci
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * `wp aai-platnosci <komenda>`.
 */
final class Aai_Platnosci_Cli {

	/**
	 * Synchronizacja kursów do produktów WooCommerce.
	 *
	 * Bez argumentu: wszystkie (opublikowane w przód, zdjęte w dół).
	 * Ze slugiem: jeden kurs, także szkic (zejdzie na draft).
	 *
	 * ## OPTIONS
	 *
	 * [<slug>]
	 * : Slug kursu.
	 *
	 * [--napraw-cene]
	 * : Napraw cenę efektywną (`_price`) produktów, którym ktoś zapisał ją
	 * metą z pominięciem API Woo. Operacja JAWNA, bo wymaga przejścia przez
	 * cenę tymczasową — produkt schodzi na czas naprawy na `draft`, żeby
	 * nikt nie kupił go po cenie przejściowej.
	 *
	 * ## EXAMPLES
	 *
	 *     wp aai-platnosci sync
	 *     wp aai-platnosci sync jak-korzystac-z-claude
	 *     wp aai-platnosci sync --napraw-cene
	 *
	 * @param string[]             $args       Argumenty pozycyjne.
	 * @param array<string,string> $assoc_args Argumenty nazwane.
	 * @when after_wp_load
	 */
	public function sync( array $args, array $assoc_args = array() ): void {
		if ( array() !== Aai_Platnosci_Zaleznosci::brakuje() ) {
			WP_CLI::log( 'sync: wyłączone — ' . implode( ', ', Aai_Platnosci_Zaleznosci::brakuje() ) . '.' );
			WP_CLI::halt( 0 );
		}

		if ( isset( $args[0] ) ) {
			$kurs = Aai_Sklep_Odczyt::szczegoly_kursu( (string) $args[0], true );
			if ( null === $kurs ) {
				WP_CLI::error( sprintf( 'nie ma kursu o slugu „%s".', $args[0] ) );
			}
			$w = Aai_Platnosci_Zapis::synchronizuj_kurs( (string) $kurs['id'] );
		} else {
			$w = Aai_Platnosci_Zapis::synchronizuj_wszystkie();
		}

		$naprawione = 0;
		if ( isset( $assoc_args['napraw-cene'] ) ) {
			foreach ( Aai_Sklep_Odczyt::lista_kursow() as $kurs ) {
				if ( (int) $kurs['price_grosze'] <= 0 ) {
					continue;
				}
				$product_id = Aai_Platnosci_Zapis::produkt_kursu( (string) $kurs['id'] );
				if ( null === $product_id ) {
					continue;
				}
				$produkt = wc_get_product( $product_id );
				if ( ! $produkt ) {
					continue;
				}
				$cena       = number_format( ( (int) $kurs['price_grosze'] ) / 100, 2, '.', '' );
				$promocyjna = (string) $produkt->get_sale_price( 'edit' );
				$oczekiwana = '' === $promocyjna ? $cena : $promocyjna;
				if ( (string) $produkt->get_price( 'edit' ) === $oczekiwana ) {
					continue;
				}
				if ( Aai_Platnosci_Zapis::napraw_cene_efektywna( $product_id, $cena ) ) {
					++$naprawione;
					WP_CLI::log( sprintf( 'naprawiono cenę efektywną produktu %d (%s)', $product_id, $kurs['slug'] ) );
				} else {
					WP_CLI::warning( sprintf( 'naprawa ceny produktu %d NIE powiodła się', $product_id ) );
				}
			}
		}

		foreach ( $w['uwagi'] as $uwaga ) {
			WP_CLI::warning( $uwaga );
		}
		WP_CLI::success(
			sprintf(
				'sync: utworzone %d, zaktualizowane %d, bez zmian %d, zdjęte %d'
				. ( isset( $assoc_args['napraw-cene'] ) ? ', naprawione ceny ' . $naprawione : '' ) . '.',
				$w['produkt_utworzony'],
				$w['zaktualizowany'],
				$w['bez_zmian'],
				$w['zdjety']
			)
		);
	}

	/**
	 * Kontrola stanu szwu.
	 *
	 * ## EXAMPLES
	 *
	 *     wp aai-platnosci sprawdz
	 *
	 * @when after_wp_load
	 */
	public function sprawdz(): void {
		$bledy       = array();
		$ostrzezenia = array();

		if ( ! Aai_Platnosci_Tabele::istnieja() ) {
			$bledy[] = 'brak tabel wtyczki (powiazania, dostawy) — aktywuj wtyczkę ponownie, aktywacja tworzy schemat.';
		}

		$brak = Aai_Platnosci_Zaleznosci::brakuje();
		if ( array() !== $brak ) {
			// Świadomie kod 0: wyłączone otoczenie to stan nazwany, nie rozjazd.
			WP_CLI::log( 'sprawdz: wyłączone — ' . implode( ', ', $brak ) . '. Sprzedaż nie działa; dane Pluginu 2 czekają.' );
			foreach ( $bledy as $blad ) {
				WP_CLI::warning( $blad );
			}
			WP_CLI::halt( 0 );
		}

		$woo = defined( 'WC_VERSION' ) ? WC_VERSION : '?';
		if ( Aai_Platnosci_Zaleznosci::WOO_DOWIEDZIONE !== $woo ) {
			$ostrzezenia[] = "WooCommerce {$woo}, a łańcuch dowiedziono na " . Aai_Platnosci_Zaleznosci::WOO_DOWIEDZIONE . '.';
		}
		$tutor = defined( 'TUTOR_VERSION' ) ? TUTOR_VERSION : '?';
		if ( Aai_Platnosci_Zaleznosci::TUTOR_DOWIEDZIONE !== $tutor ) {
			$ostrzezenia[] = "Tutor LMS {$tutor}, a łańcuch dowiedziono na " . Aai_Platnosci_Zaleznosci::TUTOR_DOWIEDZIONE . '.';
		}

		if ( array() !== $ostrzezenia ) {
			foreach ( $ostrzezenia as $o ) {
				WP_CLI::warning( $o );
			}
			WP_CLI::log( 'Po aktualizacji potwierdź trzy fakty z sekcji 0 schematu (docs/plugin-2/DIAGRAM.md):' );
			WP_CLI::log( ' 1. łańcuch domknięcia zamówienia (needs_processing → completed),' );
			WP_CLI::log( ' 2. kolejność pary _tutor_course_price_type / _tutor_course_product_id w do_enroll(),' );
			WP_CLI::log( ' 3. para opcji kasy: zakup gościa + rejestracja z kasy.' );
		}

		// ── Kontrola rozjazdu kurs ↔ produkt (krok P2) ────────────────
		// Kontrola NIGDY nie pisze (L11). Dwa progi (B15): świeży
		// `sync_ts` (młodszy niż 10 minut) degraduje rozjazd do
		// komunikatu „w trakcie" — kod 0.
		$w_trakcie = array();
		if ( class_exists( 'Aai_Sklep_Odczyt' ) && Aai_Platnosci_Tabele::istnieja() ) {
			foreach ( Aai_Sklep_Odczyt::lista_kursow() as $kurs ) {
				if ( (int) $kurs['price_grosze'] <= 0 ) {
					continue;
				}
				$rozjazdy = self::rozjazdy_kursu( $kurs );
				if ( array() === $rozjazdy ) {
					continue;
				}
				/*
				 * DWA PROGI (B15) — ale rozstrzygane po RODZAJU rozjazdu,
				 * nie po samym czasie. Pierwsza wersja degradowała KAŻDY
				 * rozjazd do „w trakcie" przy świeżym `sync_ts`, przez co
				 * kontrola była ŚLEPA na zepsutą cenę przez 10 minut po
				 * każdej synchronizacji (złapał to smoke P2).
				 *
				 * „W trakcie" może być wyłącznie stan NIEKOMPLETNY —
				 * przerwane żądanie zostawia produkt bez powiązania i taki
				 * stan dokończy najbliższy `sync`. Rozjazd WARTOŚCI (cena,
				 * widoczność, znaczniki, obce powiązanie) nie dokończy się
				 * sam nigdy: to zawsze kod 1, niezależnie od zegara.
				 * Okno jest też krótkie (60 s), bo synchronizacja jednego
				 * kursu trwa milisekundy — dłuższe okno chroni tylko błąd.
				 */
				$product_id  = Aai_Platnosci_Zapis::produkt_kursu( (string) $kurs['id'] );
				$sync_ts     = null !== $product_id ? (int) get_post_meta( $product_id, '_aai_platnosci_sync_ts', true ) : 0;
				$swieza_syn  = $sync_ts > 0 && ( time() - $sync_ts ) < 60;
				foreach ( $rozjazdy as $r ) {
					if ( $swieza_syn && self::niekompletny( $r ) ) {
						$w_trakcie[] = sprintf( '%s: %s (kopia w trakcie — sync_ts sprzed %d s)', $kurs['slug'], $r, time() - $sync_ts );
					} else {
						$bledy[] = sprintf( '%s: %s', $kurs['slug'], $r );
					}
				}
			}
			foreach ( self::duplikaty_uuid() as $blad_uuid ) {
				$bledy[] = $blad_uuid;
			}
			$osierocone = self::osierocone();
			foreach ( $osierocone['bledy'] as $blad_sieroty ) {
				$bledy[] = $blad_sieroty;
			}
			foreach ( $osierocone['info'] as $info ) {
				$w_trakcie[] = $info;
			}
		}
		$blad_kopii = Aai_Platnosci_Komunikaty::ostatni();
		if ( '' !== $blad_kopii ) {
			$bledy[] = 'ostatnia kopia zgłosiła błąd: ' . $blad_kopii;
		}
		foreach ( $w_trakcie as $info ) {
			WP_CLI::log( 'sprawdz: ' . $info );
		}

		if ( array() !== $bledy ) {
			foreach ( $bledy as $blad ) {
				WP_CLI::error( $blad, false );
			}
			WP_CLI::halt( 1 );
		}

		WP_CLI::success(
			sprintf(
				'sprawdz: tabele są, WooCommerce %s i Tutor %s aktywne%s.',
				$woo,
				$tutor,
				array() === $ostrzezenia ? ' (wersje dowiedzione)' : ' (wersje INNE niż dowiedzione — patrz wyżej)'
			)
		);
	}

	/**
	 * Rozjazdy jednego opublikowanego, płatnego kursu (kontrola CZYTA,
	 * nigdy nie pisze — L11).
	 *
	 * @param array<string,mixed> $kurs Karta kursu z Pluginu 1.
	 * @return string[] Opisy rozjazdów (pusta lista = porządek).
	 */
	private static function rozjazdy_kursu( array $kurs ): array {
		$r          = array();
		$product_id = Aai_Platnosci_Zapis::produkt_kursu( (string) $kurs['id'] );
		if ( null === $product_id ) {
			return array( 'kurs płatny bez wiersza w powiazania — produkt nie powstał (uruchom sync)' );
		}
		$produkt = wc_get_product( $product_id );
		if ( ! $produkt ) {
			return array( sprintf( 'wiersz powiazania wskazuje produkt %d, którego nie ma', $product_id ) );
		}

		if ( 'publish' !== $produkt->get_status() ) {
			$r[] = sprintf( 'produkt %d ma status %s zamiast publish', $product_id, $produkt->get_status() );
		}

		$cena = number_format( ( (int) $kurs['price_grosze'] ) / 100, 2, '.', '' );
		if ( $produkt->get_regular_price( 'edit' ) !== $cena ) {
			$r[] = sprintf( 'cena regularna %s zamiast %s', $produkt->get_regular_price( 'edit' ), $cena );
		}
		// B5: `_price` liczy kasa — porównujemy get_price() OBOK regularnej.
		// Promocja ustawiona w Woo jest legalna: wtedy get_price() ma równać
		// się cenie promocyjnej, nie regularnej.
		$promocyjna = $produkt->get_sale_price( 'edit' );
		$oczekiwana = '' === (string) $promocyjna ? $cena : (string) $promocyjna;
		if ( (string) $produkt->get_price( 'edit' ) !== $oczekiwana ) {
			$r[] = sprintf(
				'cena liczona w kasie (_price = %s) nie zgadza się z oczekiwaną %s — ktoś zapisał to pole metą z pominięciem API Woo (B5). Napraw: wp aai-platnosci sync --napraw-cene',
				(string) $produkt->get_price( 'edit' ),
				$oczekiwana
			);
		}

		if ( 'hidden' !== $produkt->get_catalog_visibility() ) {
			$r[] = 'produkt widoczny w katalogu Woo — ma być hidden (decyzja właściciela 2026-08-28)';
		}
		if ( ! $produkt->get_virtual( 'edit' ) ) {
			$r[] = 'produkt nie jest wirtualny';
		}
		if ( ! $produkt->get_sold_individually( 'edit' ) ) {
			$r[] = 'produkt bez _sold_individually — quantity=3 w adresie weźmie trzy sztuki (B14)';
		}
		if ( 'yes' !== get_post_meta( $product_id, '_tutor_product', true ) ) {
			$r[] = 'produkt bez _tutor_product — cudzy zapis go skasował, a hak naprawczy nie zadziałał (B13)';
		}

		$tutor_id = Aai_Platnosci_Zapis::kurs_tutora( (string) $kurs['id'] );
		if ( -1 === $tutor_id ) {
			$r[] = 'więcej niż jeden wpis Tutora z tym uuid (B4)';
		} elseif ( null === $tutor_id ) {
			$r[] = 'brak kopii kursu w Tutorze — powiązanie nie istnieje';
		} else {
			if ( 'paid' !== get_post_meta( $tutor_id, '_tutor_course_price_type', true ) ) {
				$r[] = 'wpis Tutora bez _tutor_course_price_type=paid';
			}
			if ( (int) get_post_meta( $tutor_id, '_tutor_course_product_id', true ) !== $product_id ) {
				$r[] = 'wpis Tutora wskazuje inny produkt niż powiazania';
			}
		}
		return $r;
	}

	/**
	 * Czy opis rozjazdu mówi o stanie NIEKOMPLETNYM (przerwany łańcuch),
	 * który dokończy najbliższy `sync` — w odróżnieniu od rozjazdu
	 * WARTOŚCI, który sam się nigdy nie naprawi.
	 *
	 * @param string $opis Opis rozjazdu z `rozjazdy_kursu()`.
	 */
	private static function niekompletny( string $opis ): bool {
		foreach ( array( 'produkt nie powstał', 'brak kopii kursu w Tutorze', 'którego nie ma' ) as $slad ) {
			if ( str_contains( $opis, $slad ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Duplikaty naszego klucza uuid na produktach — „weź pierwszy" nie
	 * istnieje (B4).
	 *
	 * @return string[]
	 */
	private static function duplikaty_uuid(): array {
		global $wpdb;
		$powtorki = $wpdb->get_col(
			"SELECT pm.meta_value FROM {$wpdb->postmeta} pm
			JOIN {$wpdb->posts} p ON p.ID = pm.post_id AND p.post_type = 'product'
			WHERE pm.meta_key = '_aai_platnosci_kurs_uuid'
			GROUP BY pm.meta_value HAVING COUNT(*) > 1"
		);
		return array_map(
			static fn( $uuid ) => sprintf( 'DWA produkty z uuid %s — dopasowanie stało się loterią (B4)', (string) $uuid ),
			$powtorki
		);
	}

	/**
	 * Wiersze `powiazania` kursów, które nie są już opublikowane.
	 * Sierota w statusie `draft` to informacja; sierota w `publish` to
	 * BŁĄD — produkt bez działającego szwu dalej daje się kupić przez
	 * `?add-to-cart`, a klient nie dostanie nic.
	 *
	 * @return array{info: string[], bledy: string[]}
	 */
	private static function osierocone(): array {
		global $wpdb;
		$wynik = array(
			'info'  => array(),
			'bledy' => array(),
		);
		$tabela = Aai_Platnosci_Tabele::tabela( 'powiazania' );
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- nazwa tabeli z klasy tabel.
		foreach ( $wpdb->get_results( "SELECT course_uuid, product_id FROM {$tabela}", ARRAY_A ) as $wiersz ) {
			$kurs = Aai_Sklep_Odczyt::kurs_po_id( (string) $wiersz['course_uuid'] );
			if ( null !== $kurs && 'published' === $kurs['status'] ) {
				continue;
			}
			$status = (string) get_post_status( (int) $wiersz['product_id'] );
			$opis   = null === $kurs ? 'kurs usunięty' : 'kurs ' . $kurs['status'];
			$zdanie = sprintf( 'produkt %d osierocony (%s), status %s', (int) $wiersz['product_id'], $opis, $status );
			if ( 'publish' === $status ) {
				$wynik['bledy'][] = $zdanie . ' — KUPOWALNY bez działającego szwu';
			} else {
				$wynik['info'][] = $zdanie;
			}
		}
		return $wynik;
	}
}
