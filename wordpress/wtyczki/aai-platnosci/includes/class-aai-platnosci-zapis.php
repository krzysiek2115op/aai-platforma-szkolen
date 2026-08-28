<?php
/**
 * Warstwa zapisu — DZIAŁ-DYSPOZYTOR Pluginu 2.
 *
 * JEDYNE miejsce, które pisze do BAZY Pluginu 2 (obu tabel) i do
 * produktu WooCommerce. Ta sama zasada co `Aai_Sklep_Zapis` w Pluginie 1
 * i dyspozytor w prototypie; pilnują jej `straznik-wtyczki-wp`
 * (zapis tylko przez warstwę zapisu) i `straznik-platnosci-wp`
 * (produkt tylko stąd).
 *
 * CZEGO TU NIE MA — i nie będzie:
 *  - zapisów do tabel `aai_sklep_*` ani wywołań `Aai_Sklep_Zapis::`
 *    (jednokierunkowość — niezmiennik 2 schematu),
 *  - kasowania produktów (niezmiennik 13),
 *  - dotykania `_sale_price` w jakiejkolwiek formie (niezmiennik 3).
 *
 * @package Aai_Platnosci
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Jedyny pisarz Pluginu 2.
 */
final class Aai_Platnosci_Zapis {

	/**
	 * Ustawia (lub odświeża) powiązanie kursu z produktem WooCommerce.
	 *
	 * Idempotentne: ten sam wpis drugi raz tylko odświeża `sync_ts`.
	 * Zmiana produktu dla istniejącego kursu przechodzi przez UPDATE
	 * po kluczu głównym — a gdyby nowy produkt był już powiązany
	 * z INNYM kursem, UNIQUE na `product_id` odmówi zapisu i metoda
	 * odda `false`: jeden produkt sprzedaje najwyżej jeden kurs,
	 * „weź pierwszy" nie istnieje (B4).
	 *
	 * @param string $course_uuid Uuid kursu z tabel Pluginu 1.
	 * @param int    $product_id  Id wpisu produktu WooCommerce.
	 */
	public static function powiazanie_ustaw( string $course_uuid, int $product_id ): bool {
		global $wpdb;
		$tabela = Aai_Platnosci_Tabele::tabela( 'powiazania' );

		/*
		 * ŚWIADOMIE NIE `ON DUPLICATE KEY UPDATE`: ten zapis reaguje na
		 * konflikt KAŻDEGO klucza unikalnego, więc próba powiązania
		 * zajętego produktu z drugim kursem „aktualizowałaby" CUDZY
		 * wiersz i meldowała sukces — dokładnie klasa „weź pierwszy"
		 * z B4. Złapane smoke'iem przy P1. Zamiast tego: jawny UPDATE
		 * po własnym kluczu albo czysty INSERT; konflikt UNIQUE
		 * w którymkolwiek = odmowa, nigdy cicha podmiana.
		 */
		$teraz = current_time( 'mysql', true );

		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- nazwa tabeli z klasy tabel.
		$jest = $wpdb->get_var(
			$wpdb->prepare( "SELECT course_uuid FROM {$tabela} WHERE course_uuid = %s", $course_uuid )
		);

		$cicho = $wpdb->suppress_errors( true );
		if ( null !== $jest ) {
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- nazwa tabeli z klasy tabel.
			$wynik = $wpdb->query(
				$wpdb->prepare(
					"UPDATE {$tabela} SET product_id = %d, sync_ts = %s WHERE course_uuid = %s",
					$product_id,
					$teraz,
					$course_uuid
				)
			);
		} else {
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- nazwa tabeli z klasy tabel.
			$wynik = $wpdb->query(
				$wpdb->prepare(
					"INSERT INTO {$tabela} (course_uuid, product_id, sync_ts) VALUES (%s, %d, %s)",
					$course_uuid,
					$product_id,
					$teraz
				)
			);
		}
		$wpdb->suppress_errors( $cicho );

		return false !== $wynik;
	}

	/**
	 * Usuwa powiązanie kursu. Produkt zostaje (nigdy go nie kasujemy) —
	 * o jego statusie decyduje osobno logika stanów z sekcji 9.3 schematu.
	 *
	 * @param string $course_uuid Uuid kursu.
	 */
	public static function powiazanie_usun( string $course_uuid ): void {
		global $wpdb;
		$wpdb->delete(
			Aai_Platnosci_Tabele::tabela( 'powiazania' ),
			array( 'course_uuid' => $course_uuid ),
			array( '%s' )
		);
	}

	/**
	 * Odnotowuje zdarzenie dostarczenia — ATOMOWO.
	 *
	 * `true` = ten przebieg jest PIERWSZY i wolno mu działać (wysłać
	 * mail); `false` = ktoś już był. Rozstrzyga UNIQUE na parze
	 * (zdarzenie, identyfikator): dwa równoległe przebiegi nie
	 * przeczytają zgodnie „nie było", bo nie ma tu żadnego odczytu —
	 * jest jeden INSERT, który w bazie może wygrać tylko raz (B6).
	 *
	 * `INSERT IGNORE` połyka wyłącznie konflikt klucza w tabeli
	 * o schemacie z kodu (kolumny i typy nasze, wartości przez
	 * `prepare`), więc „0 wierszy" znaczy tu dokładnie „duplikat".
	 *
	 * @param string $zdarzenie     Np. `mail_konta`, `mail_kursu`, `dostep`.
	 * @param int    $identyfikator Id użytkownika (mail konta) albo zamówienia.
	 * @param string $wynik         Krótki opis rezultatu (np. wynik wp_mail).
	 */
	public static function dostawa_odnotuj( string $zdarzenie, int $identyfikator, string $wynik = '' ): bool {
		global $wpdb;

		/*
		 * Identyfikator musi być prawdziwy. Kolumna jest `bigint unsigned`,
		 * a instalacja stoi na NIE-strict `sql_mode` — wartość ujemna
		 * zostałaby po cichu przycięta do zera i dwa różne zdarzenia
		 * zlałyby się w jeden wiersz, czyli drugi mail nigdy by nie
		 * wyszedł. Wolimy głośną odmowę.
		 */
		if ( $identyfikator <= 0 ) {
			throw new InvalidArgumentException(
				sprintf( 'dostawa „%s" bez prawidłowego identyfikatora (%d)', $zdarzenie, $identyfikator )
			);
		}
		// `wynik` przycinamy SAMI, z widocznym wielokropkiem: kolumna ma
		// 191 znaków i utnie dłuższy komunikat w milczeniu.
		if ( mb_strlen( $wynik ) > 190 ) {
			$wynik = mb_substr( $wynik, 0, 189 ) . '…';
		}

		$tabela = Aai_Platnosci_Tabele::tabela( 'dostawy' );

		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- nazwa tabeli z klasy tabel.
		$dodane = $wpdb->query(
			$wpdb->prepare(
				"INSERT IGNORE INTO {$tabela} (zdarzenie, identyfikator, wynik, created_at)
				VALUES (%s, %d, %s, %s)",
				$zdarzenie,
				$identyfikator,
				$wynik,
				current_time( 'mysql', true )
			)
		);

		if ( false === $dodane ) {
			/*
			 * AWARIA ZAPYTANIA to NIE „duplikat". Pierwsza wersja zwracała
			 * tu `false` (bo `1 === false`), a wołający czyta `false` jako
			 * „ktoś już dostarczył" — więc przy zepsutej tabeli mail
			 * i dostęp przepadłyby bez jednego objawu, a dziennik
			 * twierdziłby, że wszystko poszło. Klasa BLAD-018: kod pisał
			 * co innego, niż robił. Awaria musi być głośna.
			 */
			throw new RuntimeException(
				sprintf( 'nie udało się odnotować dostawy (%s/%d): %s', $zdarzenie, $identyfikator, $wpdb->last_error )
			);
		}

		return 1 === $dodane;
	}

	/**
	 * Dopisuje rezultat do JUŻ odnotowanego zdarzenia (np. wynik
	 * `wp_mail()` znany dopiero po wysyłce). Nie tworzy wiersza —
	 * od tworzenia jest `dostawa_odnotuj()`.
	 *
	 * @param string $zdarzenie     Zdarzenie.
	 * @param int    $identyfikator Identyfikator.
	 * @param string $wynik         Rezultat.
	 */
	public static function dostawa_wynik( string $zdarzenie, int $identyfikator, string $wynik ): void {
		global $wpdb;
		$wpdb->update(
			Aai_Platnosci_Tabele::tabela( 'dostawy' ),
			array( 'wynik' => $wynik ),
			array(
				'zdarzenie'     => $zdarzenie,
				'identyfikator' => $identyfikator,
			),
			array( '%s' ),
			array( '%s', '%d' )
		);
	}

	/**
	 * Id produktu powiązanego z kursem — z NASZEJ tabeli, nigdy ze skanu
	 * postmeta (B4: `_aai_zrodlo_uuid` siedzi na 90 wpisach Tutora).
	 *
	 * @param string $course_uuid Uuid kursu.
	 */
	public static function produkt_kursu( string $course_uuid ): ?int {
		global $wpdb;
		$tabela = Aai_Platnosci_Tabele::tabela( 'powiazania' );
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- nazwa tabeli z klasy tabel.
		$id = $wpdb->get_var(
			$wpdb->prepare( "SELECT product_id FROM {$tabela} WHERE course_uuid = %s", $course_uuid )
		);
		return null === $id ? null : (int) $id;
	}

	/**
	 * Wpis kursu w Tutorze po uuid. ZAWSZE z `post_type` i z twardą
	 * odmową przy więcej niż jednym trafieniu — „weź pierwszy" nie
	 * istnieje (B4). `-1` znaczy: niejednoznaczność, zatrzymaj się.
	 *
	 * @param string $course_uuid Uuid kursu.
	 */
	public static function kurs_tutora( string $course_uuid ): ?int {
		$typ = function_exists( 'tutor' ) ? (string) ( tutor()->course_post_type ?? 'courses' ) : 'courses';

		$wpisy = get_posts(
			array(
				'post_type'      => $typ,
				'post_status'    => 'any',
				'posts_per_page' => 2,
				'fields'         => 'ids',
				'meta_key'       => '_aai_zrodlo_uuid', // phpcs:ignore WordPress.DB.SlowDBQuery
				'meta_value'     => $course_uuid, // phpcs:ignore WordPress.DB.SlowDBQuery
			)
		);

		if ( count( $wpisy ) > 1 ) {
			return -1;
		}
		return array() === $wpisy ? null : (int) $wpisy[0];
	}

	/**
	 * Pełna synchronizacja jednego kursa do produktu WooCommerce.
	 *
	 * Kolejność jest treścią bezpieczeństwa, nie stylem (schemat,
	 * sekcja 7): produkt rodzi się jako `draft` (B3), powiązanie na
	 * wpisie kursu Tutora idzie `price_type` NAJPIERW i `product_id`
	 * NA KOŃCU (B2 — odwrotna kolejność ROZDAJE kurs za darmo, bo
	 * `do_enroll()` widzi kurs „darmowy" w stanie pośrednim), a na
	 * `publish` produkt przechodzi dopiero z kompletem warunków.
	 *
	 * IDEMPOTENCJA JEST WARUNKIEM BRAMKI P2 (korekta schematu przy P2):
	 * bez realnych zmian NIE wołamy `save()` — każdy zapis zmienia
	 * `post_modified` i sha256 wiersza produktu przestaje być stabilne
	 * między przebiegami importu.
	 *
	 * @param string $course_uuid Uuid kursu z tabel Pluginu 1.
	 * @return array<string,mixed> Liczniki + uwagi.
	 */
	public static function synchronizuj_kurs( string $course_uuid ): array {
		$w = array(
			'produkt_utworzony' => 0,
			'zaktualizowany'    => 0,
			'bez_zmian'         => 0,
			'zdjety'            => 0,
			'uwagi'             => array(),
		);

		if ( ! class_exists( 'WooCommerce' ) || ! class_exists( 'Aai_Sklep_Odczyt' ) ) {
			$w['uwagi'][] = 'brak WooCommerce albo Pluginu 1 — synchronizacja pominięta';
			return $w;
		}

		/*
		 * Bez naszych tabel nie wolno TWORZYĆ produktu: powiązania nie
		 * dałoby się zapisać, a produkt zostałby sierotą, której kontrola
		 * NIGDY nie zobaczy (iteruje po wierszach `powiazania`) — i rósłby
		 * o jeden przy każdym przebiegu.
		 */
		if ( ! Aai_Platnosci_Tabele::istnieja() ) {
			$w['uwagi'][] = 'brak tabel Pluginu 2 — synchronizacja wstrzymana, żeby nie tworzyć produktów bez powiązania';
			return $w;
		}

		$kurs = Aai_Sklep_Odczyt::kurs_po_id( $course_uuid );
		if ( null === $kurs ) {
			// Kurs zniknął — traktujemy jak usunięcie (tabela stanów 9.3).
			return self::zdejmij_kurs( $course_uuid );
		}

		$sprzedawalny = 'published' === $kurs['status'] && $kurs['price_grosze'] > 0;
		if ( ! $sprzedawalny ) {
			// `draft` kursu NIE dotyka price_type (9.3); cena 0 i archiwum — tak.
			$cel_price_type = 'draft' === $kurs['status'] ? null : 'free';
			return self::zdejmij_kurs( $course_uuid, $cel_price_type );
		}

		$cena       = number_format( $kurs['price_grosze'] / 100, 2, '.', '' );
		$product_id = self::produkt_kursu( $course_uuid );
		$produkt    = null !== $product_id ? wc_get_product( $product_id ) : false;

		if ( ! $produkt ) {
			// Produkt rodzi się jako DRAFT (B3) i UKRYTY w katalogu Woo
			// (decyzja właściciela 2026-08-28): jedyną witryną zakupu jest
			// nasza strona sprzedażowa — klient nie ma trafiać na produkt
			// w cudzym wyglądzie.
			$produkt = new WC_Product_Simple();
			$produkt->set_name( $kurs['title'] );
			$produkt->set_status( 'draft' );
			$produkt->set_virtual( true );
			$produkt->set_sold_individually( true );
			$produkt->set_catalog_visibility( 'hidden' );
			$produkt->set_regular_price( $cena );
			$product_id = $produkt->save();
			if ( $product_id <= 0 ) {
				$w['uwagi'][] = 'WooCommerce nie utworzyło produktu';
				return $w;
			}
			$w['produkt_utworzony'] = 1;
		} else {
			// Aktualizacja TYLKO przy realnej różnicy.
			$zmiany = false;
			if ( $produkt->get_name( 'edit' ) !== $kurs['title'] ) {
				$produkt->set_name( $kurs['title'] );
				$zmiany = true;
			}
			if ( $produkt->get_regular_price( 'edit' ) !== $cena ) {
				/*
				 * Woo KASUJE promocję, gdy cena promocyjna wyjdzie równa
				 * albo wyższa od regularnej (`class-wc-product-data-store-cpt.php:857`).
				 * To nie jest nasza operacja, ale nasza kopia potrafi ją
				 * wywołać — więc mówimy o tym wprost, zamiast udawać, że
				 * nic nie zaszło (wymóg schematu, sekcja 6).
				 */
				$promocyjna = (string) $produkt->get_sale_price( 'edit' );
				if ( '' !== $promocyjna && (float) $promocyjna >= (float) $cena ) {
					$w['uwagi'][] = sprintf(
						'obniżenie ceny kursu do %s zł SKASUJE promocję %s zł ustawioną w WooCommerce (robi to Woo, nie my)',
						$cena,
						$promocyjna
					);
				}
				$produkt->set_regular_price( $cena );
				$zmiany = true;
			}
			/*
			 * `_price` (pole, którym Woo liczy w koszyku — B5) CELOWO nie
			 * jest tu naprawiane. ZMIERZONE w kodzie Woo 11.0.1
			 * (`class-wc-product-data-store-cpt.php:856`): to pole
			 * przelicza się WYŁĄCZNIE wtedy, gdy `_regular_price` albo
			 * `_sale_price` REALNIE zmieni się w bazie — `set_price()`
			 * przez API nie zapisuje go wcale, a ponowny zapis tej samej
			 * ceny regularnej niczego nie wywołuje. Rozjazd `_price`
			 * powstaje więc tylko wtedy, gdy ktoś zapisał to pole metą
			 * z pominięciem API (cudza wtyczka, ręczna zmiana w bazie),
			 * i jest ANOMALIĄ, nie stanem roboczym.
			 *
			 * Dlatego: kontrola go WYKRYWA (kod 1), a naprawa jest JAWNA
			 * — `wp aai-platnosci sync --napraw-cene` (patrz
			 * `napraw_cene_efektywna()`). Nie robimy jej przy każdym
			 * zapisie kursu, bo wymaga przejścia przez cenę tymczasową,
			 * a to nie ma prawa dziać się po cichu na produkcie, który
			 * ktoś właśnie ogląda w kasie.
			 */
			if ( ! $produkt->get_virtual( 'edit' ) ) {
				$produkt->set_virtual( true );
				$zmiany = true;
			}
			if ( ! $produkt->get_sold_individually( 'edit' ) ) {
				$produkt->set_sold_individually( true );
				$zmiany = true;
			}
			if ( 'hidden' !== $produkt->get_catalog_visibility( 'edit' ) ) {
				$produkt->set_catalog_visibility( 'hidden' );
				$zmiany = true;
			}
			if ( $zmiany ) {
				$produkt->save();
				$w['zaktualizowany'] = 1;
			}
		}

		/*
		 * OD TĄD ANI JEDNEGO WCZESNEGO `return` — status produktu nadaje
		 * JEDNO miejsce na końcu metody.
		 *
		 * Pierwsza wersja wychodziła z metody przy każdej przeszkodzie
		 * (odmowa powiązania, dwa wpisy Tutora, brak kopii w Tutorze)
		 * i zostawiała produkt w statusie, który miał wcześniej. Dla
		 * produktu tworzonego od zera to nie szkodziło (rodzi się
		 * `draft`), ale w stanie ustalonym produkt jest `publish` —
		 * więc skasowanie kopii kursu w Tutorze zostawiało KUPOWALNY
		 * produkt bez powiązania, czyli „klient płaci i nie dostaje
		 * nic" (B3). Kod pisał przy tym w uwadze „produkt zostaje
		 * draft", czego nic nie egzekwowało — nieprawda o zachowaniu,
		 * klasa BLAD-018. Zmierzone uruchomieniowo przy przeglądzie P2.
		 */
		$komplet = false;

		if ( ! self::powiazanie_ustaw( $course_uuid, (int) $product_id ) ) {
			// Powód podajemy zmierzony, nie zgadnięty: konflikt UNIQUE to
			// co innego niż padnięte zapytanie, a operator dostaje inną
			// instrukcję w każdym z tych przypadków.
			global $wpdb;
			$w['uwagi'][] = false !== strpos( (string) $wpdb->last_error, 'Duplicate entry' )
				? sprintf( 'produkt %d jest już powiązany z INNYM kursem — odmowa (B4)', $product_id )
				: sprintf( 'nie udało się zapisać powiązania produktu %d: %s', $product_id, (string) $wpdb->last_error );
		} else {
			// Znaczniki PO zapisie: handler Tutora na `save_post_product`
			// czyta $_POST i przy programowym zapisie KASUJE `_tutor_product`
			// (pułapka 2 schematu) — dlatego stawiamy je po każdym save(),
			// a cudze zapisy naprawia hak `przywroc_znaczniki()`.
			self::ustaw_znaczniki_produktu( (int) $product_id, $course_uuid );

			$tutor_id = self::kurs_tutora( $course_uuid );
			if ( -1 === $tutor_id ) {
				$w['uwagi'][] = 'więcej niż jeden wpis Tutora z tym uuid — zatrzymane, wyjaśnij dane (B4)';
			} elseif ( null === $tutor_id ) {
				// Projektowany stan degradacji (korekta schematu przy P2):
				// bez kopii w Tutorze produkt zostaje szkicem, komplet
				// domyka `wp aai-platnosci sync` po imporcie.
				$w['uwagi'][] = 'kopii kursu w Tutorze jeszcze nie ma — produkt zostaje draft, dokończy sync';
			} else {
				// KOLEJNOŚĆ B2: price_type NAJPIERW, product_id NA KOŃCU.
				update_post_meta( $tutor_id, '_tutor_course_price_type', 'paid' );
				update_post_meta( $tutor_id, '_tutor_course_product_id', (int) $product_id );
				$komplet = true;
			}
		}

		// JEDYNE miejsce nadające status produktowi w tej metodzie.
		$cel = $komplet ? 'publish' : 'draft';
		if ( get_post_status( (int) $product_id ) !== $cel ) {
			$przestawiany = wc_get_product( (int) $product_id );
			$przestawiany->set_status( $cel );
			$przestawiany->save();
			self::ustaw_znaczniki_produktu( (int) $product_id, $course_uuid );
			if ( 0 === $w['produkt_utworzony'] ) {
				$w['zaktualizowany'] = 1;
			}
		}

		if ( 0 === $w['produkt_utworzony'] && 0 === $w['zaktualizowany'] ) {
			$w['bez_zmian'] = 1;
		}
		return $w;
	}

	/**
	 * Zdejmuje kurs ze sprzedaży: powiązanie w Tutorze schodzi ODWROTNĄ
	 * kolejnością (`product_id` najpierw, `price_type` na końcu — B2),
	 * produkt przechodzi na `draft` i NIGDY nie jest kasowany
	 * (niezmiennik 13). Wiersz `powiazania` zostaje — kontrola raportuje
	 * produkt jako zdjęty/osierocony, a historia wie, czyj był.
	 *
	 * @param string      $course_uuid    Uuid kursu.
	 * @param string|null $cel_price_type Docelowy `_tutor_course_price_type`
	 *                                    (`free`) albo null = nie dotykać
	 *                                    (szkic kursu, tabela 9.3).
	 * @return array<string,mixed>
	 */
	public static function zdejmij_kurs( string $course_uuid, ?string $cel_price_type = 'free' ): array {
		$w = array(
			'produkt_utworzony' => 0,
			'zaktualizowany'    => 0,
			'bez_zmian'         => 0,
			'zdjety'            => 0,
			'uwagi'             => array(),
		);

		$tutor_id = self::kurs_tutora( $course_uuid );
		if ( is_int( $tutor_id ) && $tutor_id > 0 ) {
			// Kolejność ODWROTNA do wiązania (B2).
			delete_post_meta( $tutor_id, '_tutor_course_product_id' );
			if ( null !== $cel_price_type ) {
				update_post_meta( $tutor_id, '_tutor_course_price_type', $cel_price_type );
			}
		}

		$product_id = self::produkt_kursu( $course_uuid );
		if ( null !== $product_id && 'draft' !== get_post_status( $product_id ) && false !== get_post_status( $product_id ) ) {
			wp_update_post(
				array(
					'ID'          => $product_id,
					'post_status' => 'draft',
				)
			);
			self::ustaw_znaczniki_produktu( $product_id, $course_uuid );
			$w['zdjety'] = 1;
		} else {
			$w['bez_zmian'] = 1;
		}
		return $w;
	}

	/**
	 * Synchronizacja WSZYSTKICH kursów: opublikowane w przód, a wiersze
	 * `powiazania` kursów już nieopublikowanych — w dół (draft). Woła ją
	 * komenda `wp aai-platnosci sync` i aktywacja wtyczki (U3: na
	 * istniejącej instalacji nikt kursów nie zapisuje, więc bez tego po
	 * aktywacji nie powstałby ani jeden produkt).
	 *
	 * @return array<string,mixed> Zsumowane liczniki.
	 */
	public static function synchronizuj_wszystkie(): array {
		global $wpdb;
		$suma = array(
			'produkt_utworzony' => 0,
			'zaktualizowany'    => 0,
			'bez_zmian'         => 0,
			'zdjety'            => 0,
			'uwagi'             => array(),
		);
		if ( ! class_exists( 'Aai_Sklep_Odczyt' ) ) {
			$suma['uwagi'][] = 'brak Pluginu 1 — nie ma czego synchronizować';
			return $suma;
		}

		$uuidy = array();
		foreach ( Aai_Sklep_Odczyt::lista_kursow() as $kurs ) {
			$uuidy[ (string) $kurs['id'] ] = true;
		}
		$tabela = Aai_Platnosci_Tabele::tabela( 'powiazania' );
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- nazwa tabeli z klasy tabel.
		foreach ( $wpdb->get_col( "SELECT course_uuid FROM {$tabela}" ) as $uuid ) {
			$uuidy[ (string) $uuid ] = true;
		}

		foreach ( array_keys( $uuidy ) as $uuid ) {
			/*
			 * `Throwable` per kurs — ten sam wzorzec co w
			 * `produkty_na_szkic()`. Jeden zepsuty kurs nie ma prawa
			 * zatrzymać całego przebiegu: przy aktywacji wtyczki zrobiłby
			 * to niewidzialnie (wyjątek ląduje w opcji), a reszta kursów
			 * zostałaby bez produktów.
			 */
			try {
				$w = self::synchronizuj_kurs( (string) $uuid );
			} catch ( Throwable $e ) {
				$suma['uwagi'][] = $uuid . ': synchronizacja przerwana — ' . $e->getMessage();
				continue;
			}
			foreach ( array( 'produkt_utworzony', 'zaktualizowany', 'bez_zmian', 'zdjety' ) as $k ) {
				$suma[ $k ] += $w[ $k ];
			}
			foreach ( $w['uwagi'] as $uwaga ) {
				$suma['uwagi'][] = $uuid . ': ' . $uwaga;
			}
		}
		return $suma;
	}

	/**
	 * Znaczniki, które KAŻDY zapis produktu potrafi zgubić.
	 *
	 * `_tutor_product` kasuje handler Tutora na `save_post_product`
	 * (czyta $_POST — masowa edycja, REST, `wc_scheduled_sales`, nasz
	 * własny `save()`; B13). `update_post_meta` z tą samą wartością
	 * niczego nie pisze, więc te trzy klucze są bezpieczne dla sha256.
	 *
	 * ZNACZNIKA CZASU TU NIE MA — i to jest treść, nie porządki. Metoda
	 * biegnie także z haka `save_post_product`, czyli po CUDZYM zapisie
	 * produktu; gdyby stawiała `sync_ts`, pole znaczyłoby „kiedy ktokolwiek
	 * zapisał produkt" zamiast „kiedy MY synchronizowaliśmy", a kontrola
	 * degradowałaby niekompletny stan do „w trakcie" po każdej cudzej
	 * edycji. Zmierzone przy przeglądzie P2. Znacznik czasu ma JEDNO
	 * miejsce w całym module — kolumnę `sync_ts` w tabeli `powiazania`
	 * (`powiazanie_ustaw()`); meta o tej nazwie nie istnieje, żeby nie
	 * było dwóch kopii tej samej prawdy.
	 *
	 * @param int    $product_id  Id produktu.
	 * @param string $course_uuid Uuid kursu.
	 */
	public static function ustaw_znaczniki_produktu( int $product_id, string $course_uuid ): void {
		update_post_meta( $product_id, '_tutor_product', 'yes' );
		update_post_meta( $product_id, '_virtual', 'yes' );
		update_post_meta( $product_id, '_aai_platnosci_kurs_uuid', $course_uuid );
	}


	/**
	 * Hak naprawczy dla CUDZYCH zapisów produktu (B13): po każdym
	 * `save_post_product` (priorytet > 10, czyli PO handlerze Tutora)
	 * produkt obecny w `powiazania` odzyskuje swoje znaczniki.
	 *
	 * @param int $post_id Id zapisanego wpisu produktu.
	 */
	public static function przywroc_znaczniki( int $post_id ): void {
		global $wpdb;
		$tabela = Aai_Platnosci_Tabele::tabela( 'powiazania' );
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- nazwa tabeli z klasy tabel.
		$uuid = $wpdb->get_var(
			$wpdb->prepare( "SELECT course_uuid FROM {$tabela} WHERE product_id = %d", $post_id )
		);
		if ( null !== $uuid ) {
			self::ustaw_znaczniki_produktu( $post_id, (string) $uuid );
		}
	}

	/**
	 * JAWNA naprawa ceny efektywnej (`_price`), gdy ktoś zapisał ją metą
	 * z pominięciem API Woo.
	 *
	 * DLACZEGO TAK, A NIE PROŚCIEJ. `_price` przelicza wyłącznie data
	 * store Woo i tylko przy REALNEJ zmianie `_regular_price`/`_sale_price`
	 * (zmierzone: `class-wc-product-data-store-cpt.php:856`). Trzeba więc
	 * przejść przez cenę tymczasową — a to znaczy, że przez moment produkt
	 * ma w bazie inną cenę niż ta ze strony sprzedażowej. Żeby w tym
	 * momencie NIKT nie mógł go kupić, produkt na czas naprawy schodzi na
	 * `draft` i wraca do poprzedniego statusu na końcu.
	 *
	 * Cena tymczasowa jest WYŻSZA od docelowej o grosz — nigdy niższa:
	 * Woo kasuje promocję, gdy cena promocyjna wyjdzie ≥ regularnej
	 * (`:857`), a promocji nie wolno nam dotknąć (niezmiennik 3).
	 *
	 * @param int    $product_id Id produktu.
	 * @param string $cena       Docelowa cena regularna (string z kropką).
	 * @return bool Czy naprawa doszła do skutku.
	 */
	public static function napraw_cene_efektywna( int $product_id, string $cena ): bool {
		$produkt = wc_get_product( $product_id );
		if ( ! $produkt ) {
			return false;
		}

		$status_przed = $produkt->get_status();
		if ( 'draft' !== $status_przed ) {
			$produkt->set_status( 'draft' );
			$produkt->save();
		}

		/*
		 * `finally` jest tu warunkiem poprawności, nie ostrożnością:
		 * bez niego wyjątek w środku (cudzy filtr na
		 * `woocommerce_before_product_object_save`, padnięta baza)
		 * zostawiłby produkt jako `draft` z ceną tymczasową NA STAŁE —
		 * czyli kurs zniknąłby ze sprzedaży po operacji, która miała go
		 * naprawić. Ta sama zasada co przy wstrzymaniu kopii w imporcie
		 * Pluginu 1.
		 */
		try {
			$tymczasowa = number_format( ( (float) $cena ) + 0.01, 2, '.', '' );
			$krok       = wc_get_product( $product_id );
			$krok->set_regular_price( $tymczasowa );
			$krok->save();

			$powrot = wc_get_product( $product_id );
			$powrot->set_regular_price( $cena );
			$powrot->save();
		} finally {
			$finalny = wc_get_product( $product_id );
			if ( $finalny && $finalny->get_regular_price( 'edit' ) !== $cena ) {
				// Cena tymczasowa nie ma prawa przeżyć tej metody.
				$finalny->set_regular_price( $cena );
				$finalny->save();
				$finalny = wc_get_product( $product_id );
			}
			if ( $finalny && 'draft' !== $status_przed && $finalny->get_status() !== $status_przed ) {
				$finalny->set_status( $status_przed );
				$finalny->save();
			}
		}

		/*
		 * Uuid bierzemy z TABELI, nie z pomocniczej mety: meta bywa pusta
		 * (produkt sprzed powiązania, cudza edycja), a pusta wartość
		 * wpisana z powrotem uruchamia fałszywy alarm o duplikacie uuid.
		 * Dopasowanie idzie wyłącznie przez `powiazania` (B4).
		 */
		global $wpdb;
		$tabela = Aai_Platnosci_Tabele::tabela( 'powiazania' );
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- nazwa tabeli z klasy tabel.
		$uuid = $wpdb->get_var(
			$wpdb->prepare( "SELECT course_uuid FROM {$tabela} WHERE product_id = %d", $product_id )
		);
		if ( null !== $uuid ) {
			self::ustaw_znaczniki_produktu( $product_id, (string) $uuid );
		}

		$sprawdzenie = wc_get_product( $product_id );
		$promocyjna  = (string) $sprawdzenie->get_sale_price( 'edit' );
		$oczekiwana  = '' === $promocyjna ? $cena : $promocyjna;
		return (string) $sprawdzenie->get_price( 'edit' ) === $oczekiwana;
	}

	/**
	 * Przestawia wszystkie produkty z `powiazania` na `draft` —
	 * deaktywacja wtyczki (L4). Kasowania nie ma: produkt kupiony jest
	 * częścią historii zamówień (niezmiennik 13); `draft` wystarcza,
	 * żeby `?add-to-cart` przestał działać.
	 *
	 * `Throwable` łapany per produkt: deaktywacja ma zejść do końca
	 * listy nawet wtedy, gdy jeden wpis jest uszkodzony — inaczej
	 * reszta produktów zostaje kupowalna bez jednego objawu.
	 */
	public static function produkty_na_szkic(): void {
		global $wpdb;
		$tabela = Aai_Platnosci_Tabele::tabela( 'powiazania' );

		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- nazwa tabeli z klasy tabel.
		$produkty = $wpdb->get_col( "SELECT product_id FROM {$tabela}" );

		$nieudane = array();
		foreach ( $produkty as $product_id ) {
			try {
				$wpis = get_post( (int) $product_id );
				if ( $wpis && 'product' === $wpis->post_type && 'draft' !== $wpis->post_status ) {
					// Wynik SPRAWDZAMY: `wp_update_post` oddaje 0 przy
					// porażce, a bramka P1 obiecuje, że po deaktywacji
					// żaden produkt kursu nie jest kupowalny — cicha
					// porażka zostawiałaby go w sprzedaży.
					$ok = wp_update_post(
						array(
							'ID'          => (int) $product_id,
							'post_status' => 'draft',
						)
					);
					if ( ! $ok ) {
						$nieudane[] = (int) $product_id;
					}
				}
			} catch ( Throwable $e ) {
				// Celowo bez ponownego rzucenia — patrz komentarz metody.
				$nieudane[] = (int) $product_id;
				continue;
			}
		}

		if ( array() !== $nieudane ) {
			Aai_Platnosci_Komunikaty::zapisz(
				sprintf(
					'przy wyłączaniu wtyczki NIE udało się zdjąć ze sprzedaży produktów: %s — są dalej kupowalne',
					implode( ', ', $nieudane )
				)
			);
		}
	}
}
