<?php
/**
 * Warstwa zapisu — JEDYNE miejsce, które pisze do tabel wtyczki.
 *
 * PO CO OSOBNA WARSTWA. W Postgresie prototypu dziennik audytu pisały
 * TRIGGERY i gwarancja brzmiała: „kod aplikacji nie umie go ominąć ani
 * sfałszować". W MySQL wtyczki dziennik pisze PHP (uprawnienie TRIGGER
 * bywa na hostingu odebrane — patrz `class-aai-sklep-tabele.php`), więc
 * gwarancję musi dać architektura: skoro tylko ten plik pisze do naszych
 * tabel, to każdy zapis przechodzi przez jedno miejsce, które zna audyt,
 * transakcje i ochronę treści. Pilnuje tego `straznik-wtyczki-wp`
 * (niezmiennik 8) — odpowiednik `straznik-granic` z prototypu.
 *
 * PORT `modules/m1-sklep/dyspozytor.ts`, z tymi samymi decyzjami:
 *
 *  * jedna TRANSAKCJA na kurs — awaria w środku nie zostawia połowy kursu;
 *  * upsert po `id` (uuid): identyfikatory z Postgresa jadą 1:1, więc klucz
 *    idempotencji jest kluczem głównym, a nie polem obok;
 *  * ODMOWA skasowania lekcji z treścią bez jawnej zgody (decyzja D
 *    przeglądu B7) — liczona ze stanu BAZY, nie z wejścia: liczy się to,
 *    co naprawdę zniknie;
 *  * dziennik audytu tylko przy REALNEJ zmianie (decyzja E) — `UPDATE`
 *    niezmieniający wiersza nie jest zdarzeniem. Tutaj idziemy krok dalej
 *    niż prototyp: wiersz bez zmian nie dostaje nawet `UPDATE`-a.
 *
 * CZEGO TU NIE MA. Kontraktu pól (odpowiednika Zod) — ten przychodzi
 * z kreatorem w kroku W4. Import sprawdza kształt u siebie, a każda
 * wartość i tak idzie przez `$wpdb->insert/update/delete`, więc do SQL-a
 * nie trafia nic sklejonego z tekstu.
 *
 * @package Aai_Sklep
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Zapis kursów do tabel wtyczki.
 */
final class Aai_Sklep_Zapis {

	/**
	 * Kolumny pomijane przy pytaniu „czy wiersz naprawdę się zmienił".
	 *
	 * `updated_at` ustawiamy sami przy zmianie, więc porównywanie go
	 * kazałoby każdemu zapisowi wyglądać na zmianę — dokładnie ten sam
	 * wyjątek zrobiła migracja 007 prototypu.
	 */
	private const POMIJANE_W_POROWNANIU = array( 'created_at', 'updated_at' );

	/**
	 * Zapisuje jeden kurs razem z sekcjami, modułami i lekcjami.
	 *
	 * Wejście ma kształt formatu 2 z `tools/eksport-wp.mjs`: nazwa pola
	 * jest nazwą kolumny (poza `sekcje`, `moduly` i `lekcje`, które są
	 * listami wierszy tabel podrzędnych).
	 *
	 * @param array<string,mixed> $kurs                   Kurs w formacie 2.
	 * @param string              $aktor                  Kto zapisuje (idzie do dziennika).
	 * @param bool                $pozwol_skasowac_tresc  Zgoda na utratę napisanych lekcji.
	 *
	 * @return array<string,int> Liczniki: utworzone/zaktualizowane/bez_zmian/usuniete.
	 *
	 * @throws Aai_Sklep_Blad_Zapisu Gdy zapis skasowałby treść bez zgody albo gdy baza odmówi.
	 */
	public static function zapisz_kurs( array $kurs, string $aktor, bool $pozwol_skasowac_tresc = false ): array {
		$liczniki = array(
			'utworzone'      => 0,
			'zaktualizowane' => 0,
			'bez_zmian'      => 0,
			'usuniete'       => 0,
		);

		self::w_transakcji(
			static function () use ( $kurs, $aktor, $pozwol_skasowac_tresc, &$liczniki ): void {
				self::zapisz_kurs_w_transakcji( $kurs, $aktor, $pozwol_skasowac_tresc, $liczniki );
			}
		);

		return $liczniki;
	}

	/**
	 * Usuwa kurs razem z sekcjami, modułami i lekcjami.
	 *
	 * PO CO TO JUŻ TERAZ. Krok, który umie tylko dodawać, nie daje się
	 * sprawdzić: test musiałby po sobie posprzątać SUROWYM SQL-em, czyli
	 * ominąć tę warstwę — a wtedy niezmiennik „tylko warstwa zapisu pisze
	 * do naszych tabel" pilnowałby kodu, którego sam test nie przestrzega.
	 *
	 * Ochrona treści jest ta sama co przy zapisie: bez jawnej zgody kurs
	 * z napisanymi lekcjami nie znika.
	 *
	 * @param string $id                     Identyfikator kursu.
	 * @param string $aktor                  Kto usuwa.
	 * @param bool   $pozwol_skasowac_tresc  Zgoda na utratę napisanych lekcji.
	 *
	 * @return array<string,int> Liczniki (klucz `usuniete`).
	 *
	 * @throws Aai_Sklep_Blad_Zapisu Gdy kursu nie ma albo gdy niesie treść bez zgody.
	 */
	public static function usun_kurs( string $id, string $aktor, bool $pozwol_skasowac_tresc = false ): array {
		$liczniki = array(
			'utworzone'      => 0,
			'zaktualizowane' => 0,
			'bez_zmian'      => 0,
			'usuniete'       => 0,
		);

		self::w_transakcji(
			static function () use ( $id, $aktor, $pozwol_skasowac_tresc, &$liczniki ): void {
				self::usun_kurs_w_transakcji( $id, $aktor, $pozwol_skasowac_tresc, $liczniki );
			}
		);

		return $liczniki;
	}

	/**
	 * Rdzeń usuwania. Woływany wyłącznie w otwartej transakcji.
	 *
	 * @param string            $id       Identyfikator kursu.
	 * @param string            $aktor    Kto usuwa.
	 * @param bool              $pozwol   Zgoda na utratę treści.
	 * @param array<string,int> $liczniki Liczniki (przez referencję).
	 *
	 * @throws Aai_Sklep_Blad_Zapisu Gdy kursu nie ma albo gdy niesie treść bez zgody.
	 */
	private static function usun_kurs_w_transakcji( string $id, string $aktor, bool $pozwol, array &$liczniki ): void {
		global $wpdb;

		$t_kursy  = Aai_Sklep_Tabele::tabela( 'courses' );
		$t_moduly = Aai_Sklep_Tabele::tabela( 'modules' );
		$t_lekcje = Aai_Sklep_Tabele::tabela( 'lessons' );

		$kurs = $wpdb->get_row(
			$wpdb->prepare( "SELECT * FROM `$t_kursy` WHERE id = %s", $id ),
			ARRAY_A
		);
		if ( null === $kurs ) {
			throw new Aai_Sklep_Blad_Zapisu( sprintf( 'nie ma kursu o id %s', $id ) );
		}

		$lekcje = (array) $wpdb->get_results(
			$wpdb->prepare(
				"SELECT l.* FROM `$t_lekcje` l
				 JOIN `$t_moduly` m ON m.id = l.module_id
				 WHERE m.course_id = %s",
				$id
			),
			ARRAY_A
		);

		$z_trescia = 0;
		foreach ( $lekcje as $lekcja ) {
			if ( '' !== (string) ( $lekcja['content'] ?? '' ) ) {
				++$z_trescia;
			}
		}
		if ( $z_trescia > 0 && ! $pozwol ) {
			throw new Aai_Sklep_Blad_Zapisu(
				sprintf(
					/* translators: %d: liczba lekcji z napisaną treścią. */
					__( 'Ten kurs ma %d lekcji z napisaną treścią. Usunięcie wymaga jawnej zgody.', 'aai-sklep' ),
					$z_trescia
				),
				array( 'lekcje_z_trescia' => $z_trescia )
			);
		}

		// Od dołu: lekcje → moduły → sekcje → kurs. Dziennik audytu zna
		// kurs przy każdym wpisie, bo `course_id` podajemy wprost.
		foreach ( $lekcje as $lekcja ) {
			self::skasuj( $t_lekcje, array( 'id' => (string) $lekcja['id'] ) );
			self::dziennik( $id, 'lessons', 'delete', $lekcja, null, $aktor );
			++$liczniki['usuniete'];
		}
		// Nazwę tabeli bierzemy tu z klasy tabel W PĘTLI, a nie z listy par:
		// zmienna z rozpakowania nie jest widocznie nazwą tabeli ani dla
		// czytelnika, ani dla strażnika, który pilnuje, że do SQL-a wchodzą
		// wyłącznie identyfikatory z kodu.
		foreach ( array( 'modules', 'sections' ) as $nazwa ) {
			$tabela  = Aai_Sklep_Tabele::tabela( $nazwa );
			$wiersze = (array) $wpdb->get_results(
				$wpdb->prepare( "SELECT * FROM `$tabela` WHERE course_id = %s", $id ),
				ARRAY_A
			);
			foreach ( $wiersze as $wiersz ) {
				self::skasuj( $tabela, array( 'id' => (string) $wiersz['id'] ) );
				self::dziennik( $id, $nazwa, 'delete', $wiersz, null, $aktor );
				++$liczniki['usuniete'];
			}
		}
		self::skasuj( $t_kursy, array( 'id' => $id ) );
		self::dziennik( $id, 'courses', 'delete', $kurs, null, $aktor );
		++$liczniki['usuniete'];
	}

	/**
	 * Rdzeń zapisu. Woływany wyłącznie w otwartej transakcji.
	 *
	 * @param array<string,mixed> $kurs      Kurs w formacie 2.
	 * @param string              $aktor     Kto zapisuje.
	 * @param bool                $pozwol    Zgoda na utratę treści.
	 * @param array<string,int>   $liczniki  Liczniki (przez referencję).
	 *
	 * @throws Aai_Sklep_Blad_Zapisu Gdy zapis skasowałby treść bez zgody.
	 */
	private static function zapisz_kurs_w_transakcji( array $kurs, string $aktor, bool $pozwol, array &$liczniki ): void {
		global $wpdb;

		$t_kursy  = Aai_Sklep_Tabele::tabela( 'courses' );
		$t_sekcje = Aai_Sklep_Tabele::tabela( 'sections' );
		$t_moduly = Aai_Sklep_Tabele::tabela( 'modules' );
		$t_lekcje = Aai_Sklep_Tabele::tabela( 'lessons' );

		$id = (string) $kurs['id'];

		/*
		 * ── 1. MIGAWKA STANU SPRZED ZAPISU ──
		 *
		 * Wszystkie porównania („czy się zmieniło", „co zniknie") robimy
		 * wobec TEJ migawki, a nie wobec odczytu po drodze. Dzięki temu
		 * mechanika z fazy przestawiania pozycji (niżej) jest niewidoczna
		 * dla dziennika: liczy się stan przed i stan po, nie krok pośredni.
		 */
		$stary_kurs = $wpdb->get_row(
			$wpdb->prepare( "SELECT * FROM `$t_kursy` WHERE id = %s", $id ),
			ARRAY_A
		);
		$stare_sekcje = self::po_id(
			$wpdb->get_results(
				$wpdb->prepare( "SELECT * FROM `$t_sekcje` WHERE course_id = %s", $id ),
				ARRAY_A
			)
		);
		$stare_moduly = self::po_id(
			$wpdb->get_results(
				$wpdb->prepare( "SELECT * FROM `$t_moduly` WHERE course_id = %s", $id ),
				ARRAY_A
			)
		);
		$stare_lekcje = self::po_id(
			$wpdb->get_results(
				$wpdb->prepare(
					"SELECT l.* FROM `$t_lekcje` l
					 JOIN `$t_moduly` m ON m.id = l.module_id
					 WHERE m.course_id = %s",
					$id
				),
				ARRAY_A
			)
		);

		// ── 2. STAN DOCELOWY ──

		$docelowy_kurs = array(
			'id'           => $id,
			'slug'         => (string) $kurs['slug'],
			'title'        => (string) $kurs['title'],
			'type'         => (string) $kurs['type'],
			'short_desc'   => self::tekst_albo_null( $kurs['short_desc'] ?? null ),
			'price_grosze' => (int) $kurs['price_grosze'],
			'cover_url'    => self::tekst_albo_null( $kurs['cover_url'] ?? null ),
			'status'       => (string) $kurs['status'],
			'badge'        => self::tekst_albo_null( $kurs['badge'] ?? null ),
			'level'        => self::tekst_albo_null( $kurs['level'] ?? null ),
		);

		$docelowe_sekcje = array();
		foreach ( (array) ( $kurs['sekcje'] ?? array() ) as $s ) {
			$sid                       = (string) $s['id'];
			$docelowe_sekcje[ $sid ] = array(
				'id'        => $sid,
				'course_id' => $id,
				'kind'      => (string) $s['kind'],
				'content'   => self::json( $s['content'] ?? array() ),
			);
		}

		$docelowe_moduly = array();
		$docelowe_lekcje = array();
		foreach ( (array) ( $kurs['moduly'] ?? array() ) as $m ) {
			$mid                       = (string) $m['id'];
			$docelowe_moduly[ $mid ] = array(
				'id'        => $mid,
				'course_id' => $id,
				'position'  => (int) $m['position'],
				'title'     => (string) $m['title'],
				'summary'   => self::tekst_albo_null( $m['summary'] ?? null ),
			);
			foreach ( (array) ( $m['lekcje'] ?? array() ) as $l ) {
				$lid                       = (string) $l['id'];
				$docelowe_lekcje[ $lid ] = array(
					'id'           => $lid,
					'module_id'    => $mid,
					'position'     => (int) $l['position'],
					'title'        => (string) $l['title'],
					'duration_min' => isset( $l['duration_min'] ) && null !== $l['duration_min']
						? (int) $l['duration_min']
						: null,
					// `preview` normalizujemy do 0/1 JUŻ TUTAJ: `(string) false`
					// to pusty łańcuch, więc porównanie z bazowym „0" mówiłoby
					// „zmiana" przy każdym imporcie.
					'preview'      => empty( $l['preview'] ) ? 0 : 1,
					// Treść trzymamy dokładnie taką, jaka przyszła — także
					// pustą. Zamiana '' na NULL byłaby cichą modyfikacją
					// danych, a bramka tego kroku brzmi „co do znaku".
					'content'      => (string) ( $l['content'] ?? '' ),
					'materials'    => self::json( $l['materials'] ?? array() ),
				);
			}
		}

		/*
		 * ── 3. DRUGA WARSTWA OBRONY NAD NAPISANĄ TREŚCIĄ ──
		 *
		 * Znalezisko D przeglądu B7. Pełna podmiana programu jest cechą,
		 * ale jedno wejście bez modułów potrafiłoby wyczyścić 908 kB prozy
		 * i wrócić z sukcesem. Pytamy więc bazę, ile lekcji Z TREŚCIĄ
		 * wypadłoby z tego kursu — ZANIM cokolwiek skasujemy.
		 */
		$zagrozone = 0;
		foreach ( $stare_lekcje as $lid => $wiersz ) {
			if ( isset( $docelowe_lekcje[ $lid ] ) ) {
				continue;
			}
			if ( '' !== (string) ( $wiersz['content'] ?? '' ) ) {
				++$zagrozone;
			}
		}
		if ( $zagrozone > 0 && ! $pozwol ) {
			throw new Aai_Sklep_Blad_Zapisu(
				sprintf(
					/* translators: %d: liczba lekcji z napisaną treścią. */
					__( 'Ten zapis skasowałby napisaną treść %d lekcji. Jeśli naprawdę o to chodzi, powtórz z jawną zgodą.', 'aai-sklep' ),
					$zagrozone
				),
				array( 'lekcje_z_trescia' => $zagrozone )
			);
		}

		// ── 4. KURS ──

		if ( null === $stary_kurs ) {
			self::wstaw( $t_kursy, $docelowy_kurs );
			self::dziennik( $id, 'courses', 'create', null, $docelowy_kurs, $aktor );
			++$liczniki['utworzone'];
		} elseif ( self::rozni_sie( $stary_kurs, $docelowy_kurs ) ) {
			$dane               = $docelowy_kurs;
			$dane['updated_at'] = gmdate( 'Y-m-d H:i:s' );
			self::zmien( $t_kursy, $dane, array( 'id' => $id ) );
			self::dziennik( $id, 'courses', 'update', $stary_kurs, array_merge( $stary_kurs, $dane ), $aktor );
			++$liczniki['zaktualizowane'];
		} else {
			++$liczniki['bez_zmian'];
		}

		// ── 5. SEKCJE ──
		//
		// Kasujemy PRZED zapisem: `UNIQUE (course_id, kind)` znaczy, że
		// rodzaj przeniesiony na inny wiersz zderzyłby się ze starym.

		foreach ( $stare_sekcje as $sid => $wiersz ) {
			if ( isset( $docelowe_sekcje[ $sid ] ) ) {
				continue;
			}
			self::skasuj( $t_sekcje, array( 'id' => $sid ) );
			self::dziennik( $id, 'sections', 'delete', $wiersz, null, $aktor );
			++$liczniki['usuniete'];
		}
		foreach ( $docelowe_sekcje as $sid => $docelowa ) {
			self::upsert( $t_sekcje, 'sections', $id, $stare_sekcje[ $sid ] ?? null, $docelowa, $aktor, $liczniki );
		}

		/*
		 * ── 6. LEKCJE, KTÓRE ZNIKAJĄ — NAJPIERW, OD DOŁU ──
		 *
		 * Kolejność jest z prototypu i dalej ma powód, choć inny: nie ma
		 * tu kluczy obcych (dbDelta ich nie utrzymuje), więc integralność
		 * trzyma ta warstwa. Moduł kasujemy dopiero na końcu — po tym, jak
		 * każda OCALAŁA lekcja dostanie nowego rodzica.
		 */
		foreach ( $stare_lekcje as $lid => $wiersz ) {
			if ( isset( $docelowe_lekcje[ $lid ] ) ) {
				continue;
			}
			self::skasuj( $t_lekcje, array( 'id' => $lid ) );
			self::dziennik( $id, 'lessons', 'delete', $wiersz, null, $aktor );
			++$liczniki['usuniete'];
		}

		/*
		 * ── 7. FAZA PRZEJŚCIOWA POZYCJI ──
		 *
		 * MySQL NIE UMIE odroczyć ograniczenia (Postgres to robił:
		 * `DEFERRABLE`), więc zamiana miejscami dwóch modułów łamie
		 * `UNIQUE (course_id, position)` w stanie pośrednim. Rozwiązanie:
		 * wiersze, które mają się przesunąć — i te, które za chwilę znikną
		 * — dostają najpierw pozycje UJEMNE, kolejne z jednego licznika.
		 * Wartości ujemne nie mogą zderzyć się z niczym, bo w spójnej
		 * bazie żaden wiersz nie ma pozycji poniżej zera, a licznik
		 * gwarantuje, że nie zderzą się między sobą.
		 *
		 * Wierszy, które zostają na swojej pozycji, NIE ruszamy: kolidować
		 * może wyłącznie z wierszem, który sam się przesuwa — a ten jest
		 * już odsunięty poza zakres.
		 */
		$tymczasowa = 0;
		foreach ( $stare_moduly as $mid => $wiersz ) {
			$docelowy = $docelowe_moduly[ $mid ] ?? null;
			$znika    = ( null === $docelowy );
			$rusza    = ( ! $znika && (int) $wiersz['position'] !== $docelowy['position'] );
			if ( $znika || $rusza ) {
				--$tymczasowa;
				self::zmien( $t_moduly, array( 'position' => $tymczasowa ), array( 'id' => $mid ) );
			}
		}
		foreach ( $stare_lekcje as $lid => $wiersz ) {
			$docelowa = $docelowe_lekcje[ $lid ] ?? null;
			if ( null === $docelowa ) {
				continue; // skasowana w kroku 6
			}
			$rusza = (int) $wiersz['position'] !== $docelowa['position']
				|| (string) $wiersz['module_id'] !== $docelowa['module_id'];
			if ( $rusza ) {
				--$tymczasowa;
				self::zmien( $t_lekcje, array( 'position' => $tymczasowa ), array( 'id' => $lid ) );
			}
		}

		// ── 8. MODUŁY I LEKCJE W STANIE DOCELOWYM ──

		foreach ( $docelowe_moduly as $mid => $docelowy ) {
			self::upsert( $t_moduly, 'modules', $id, $stare_moduly[ $mid ] ?? null, $docelowy, $aktor, $liczniki );
		}
		// Lekcja zmieniająca `module_id` przenosi się między modułami sama
		// z siebie — builder Tutora tego wymaga (wymaganie F przeglądu B7),
		// a prototyp tego nie umiał (`WHERE module_id=` nigdy nie zmieniało
		// rodzica).
		foreach ( $docelowe_lekcje as $lid => $docelowa ) {
			self::upsert( $t_lekcje, 'lessons', $id, $stare_lekcje[ $lid ] ?? null, $docelowa, $aktor, $liczniki );
		}

		// ── 9. MODUŁY, KTÓRE ZNIKAJĄ — NA KOŃCU ──

		foreach ( $stare_moduly as $mid => $wiersz ) {
			if ( isset( $docelowe_moduly[ $mid ] ) ) {
				continue;
			}
			self::skasuj( $t_moduly, array( 'id' => $mid ) );
			self::dziennik( $id, 'modules', 'delete', $wiersz, null, $aktor );
			++$liczniki['usuniete'];
		}
	}

	/**
	 * Wstawia albo aktualizuje jeden wiersz i odnotowuje REALNĄ zmianę.
	 *
	 * @param string                   $tabela     Pełna nazwa tabeli.
	 * @param string                   $nazwa      Nazwa tabeli do dziennika.
	 * @param string                   $course_id  Kurs, do którego wiersz należy.
	 * @param array<string,mixed>|null $stary      Wiersz sprzed zapisu albo null.
	 * @param array<string,mixed>      $docelowy   Wiersz docelowy.
	 * @param string                   $aktor      Kto zapisuje.
	 * @param array<string,int>        $liczniki   Liczniki (przez referencję).
	 */
	private static function upsert(
		string $tabela,
		string $nazwa,
		string $course_id,
		?array $stary,
		array $docelowy,
		string $aktor,
		array &$liczniki
	): void {
		if ( null === $stary ) {
			self::wstaw( $tabela, $docelowy );
			self::dziennik( $course_id, $nazwa, 'create', null, $docelowy, $aktor );
			++$liczniki['utworzone'];
			return;
		}
		if ( ! self::rozni_sie( $stary, $docelowy ) ) {
			++$liczniki['bez_zmian'];
			return;
		}
		self::zmien( $tabela, $docelowy, array( 'id' => $docelowy['id'] ) );
		self::dziennik( $course_id, $nazwa, 'update', $stary, array_merge( $stary, $docelowy ), $aktor );
		++$liczniki['zaktualizowane'];
	}

	/**
	 * Czy wiersz naprawdę się zmienił.
	 *
	 * Porównujemy przez `(string)`, bo `$wpdb` oddaje z bazy wszystko jako
	 * łańcuchy, a stan docelowy składamy z typów PHP. NULL porównujemy
	 * tożsamością — inaczej pusty tekst udawałby brak wartości.
	 *
	 * @param array<string,mixed> $stary    Wiersz z bazy.
	 * @param array<string,mixed> $docelowy Wiersz docelowy.
	 */
	private static function rozni_sie( array $stary, array $docelowy ): bool {
		foreach ( $docelowy as $kolumna => $wartosc ) {
			if ( in_array( $kolumna, self::POMIJANE_W_POROWNANIU, true ) ) {
				continue;
			}
			$byla = $stary[ $kolumna ] ?? null;
			if ( null === $wartosc || null === $byla ) {
				if ( $wartosc !== $byla ) {
					return true;
				}
				continue;
			}
			if ( (string) $byla !== (string) $wartosc ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Wpis do dziennika audytu.
	 *
	 * Nazwy tabel w dzienniku są NASZE (`courses`, `sections`, `modules`,
	 * `lessons`), nie postgresowe — dziennik opisuje tę bazę, w której leży.
	 *
	 * @param string|null              $course_id Kurs, którego dotyczy wpis.
	 * @param string                   $tabela    Nazwa tabeli bez prefiksu.
	 * @param string                   $akcja     create|update|delete.
	 * @param array<string,mixed>|null $przed     Stan przed.
	 * @param array<string,mixed>|null $po        Stan po.
	 * @param string                   $aktor     Kto zmienił.
	 */
	private static function dziennik(
		?string $course_id,
		string $tabela,
		string $akcja,
		?array $przed,
		?array $po,
		string $aktor
	): void {
		self::wstaw(
			Aai_Sklep_Tabele::tabela( 'changelog' ),
			array(
				'course_id'  => $course_id,
				'tabela'     => $tabela,
				'action'     => $akcja,
				'stan_przed' => null === $przed ? null : self::json( $przed ),
				'stan_po'    => null === $po ? null : self::json( $po ),
				'actor'      => $aktor,
			)
		);
	}

	/**
	 * Transakcja. Awaria w środku cofa CAŁY kurs, nie jego połowę.
	 *
	 * @param callable $praca Ciało transakcji.
	 *
	 * @throws Throwable Cokolwiek rzuci ciało — po wycofaniu zmian.
	 */
	private static function w_transakcji( callable $praca ): void {
		global $wpdb;

		$wpdb->query( 'START TRANSACTION' );
		try {
			$praca();
			$wpdb->query( 'COMMIT' );
		} catch ( Throwable $blad ) {
			$wpdb->query( 'ROLLBACK' );
			throw $blad;
		}
	}

	/**
	 * Wstawienie wiersza. Nieudany zapis MUSI zatrzymać całość.
	 *
	 * `$wpdb->insert()` zwraca `false` po cichu — bez tego sprawdzenia
	 * transakcja zatwierdziłaby brakujący wiersz i import zameldowałby
	 * sukces. To dokładnie ta klasa błędu, której ten projekt pilnuje
	 * najmocniej: cicha utrata treści.
	 *
	 * @param string              $tabela Pełna nazwa tabeli.
	 * @param array<string,mixed> $dane   Kolumna => wartość.
	 *
	 * @throws Aai_Sklep_Blad_Zapisu Gdy baza odmówi.
	 */
	private static function wstaw( string $tabela, array $dane ): void {
		global $wpdb;

		if ( false === $wpdb->insert( $tabela, $dane, self::formaty( $dane ) ) ) {
			throw new Aai_Sklep_Blad_Zapisu(
				sprintf( 'zapis do %s nie powiódł się: %s', $tabela, $wpdb->last_error )
			);
		}
	}

	/**
	 * Zmiana wiersza.
	 *
	 * @param string              $tabela Pełna nazwa tabeli.
	 * @param array<string,mixed> $dane   Kolumna => wartość.
	 * @param array<string,mixed> $gdzie  Warunek.
	 *
	 * @throws Aai_Sklep_Blad_Zapisu Gdy baza odmówi.
	 */
	private static function zmien( string $tabela, array $dane, array $gdzie ): void {
		global $wpdb;

		if ( false === $wpdb->update( $tabela, $dane, $gdzie, self::formaty( $dane ), self::formaty( $gdzie ) ) ) {
			throw new Aai_Sklep_Blad_Zapisu(
				sprintf( 'zmiana w %s nie powiodła się: %s', $tabela, $wpdb->last_error )
			);
		}
	}

	/**
	 * Skasowanie wiersza.
	 *
	 * @param string              $tabela Pełna nazwa tabeli.
	 * @param array<string,mixed> $gdzie  Warunek.
	 *
	 * @throws Aai_Sklep_Blad_Zapisu Gdy baza odmówi.
	 */
	private static function skasuj( string $tabela, array $gdzie ): void {
		global $wpdb;

		if ( false === $wpdb->delete( $tabela, $gdzie, self::formaty( $gdzie ) ) ) {
			throw new Aai_Sklep_Blad_Zapisu(
				sprintf( 'usunięcie z %s nie powiodło się: %s', $tabela, $wpdb->last_error )
			);
		}
	}

	/**
	 * Formaty pod `$wpdb`. Wartości NULL `$wpdb` i tak zapisuje jako NULL,
	 * niezależnie od formatu.
	 *
	 * @param array<string,mixed> $dane Kolumna => wartość.
	 *
	 * @return string[]
	 */
	private static function formaty( array $dane ): array {
		return array_map(
			static fn( $wartosc ): string => is_int( $wartosc ) ? '%d' : '%s',
			array_values( $dane )
		);
	}

	/**
	 * Lista wierszy → mapa po kolumnie `id`.
	 *
	 * @param array<int,array<string,mixed>>|null $wiersze Wiersze z bazy.
	 *
	 * @return array<string,array<string,mixed>>
	 */
	private static function po_id( ?array $wiersze ): array {
		$mapa = array();
		foreach ( (array) $wiersze as $wiersz ) {
			$mapa[ (string) $wiersz['id'] ] = $wiersz;
		}
		return $mapa;
	}

	/**
	 * Pusty tekst i brak wartości to w tych kolumnach to samo — NULL.
	 * Dotyczy pól opcjonalnych kursu i modułu; treści lekcji NIE dotyczy
	 * (tam pusty łańcuch jest wartością).
	 *
	 * @param mixed $wartosc Wartość z wejścia.
	 */
	private static function tekst_albo_null( $wartosc ): ?string {
		if ( null === $wartosc ) {
			return null;
		}
		$tekst = (string) $wartosc;
		return '' === $tekst ? null : $tekst;
	}

	/**
	 * JSON o STAŁYM kształcie — ta sama wartość musi dawać ten sam łańcuch,
	 * inaczej porównanie „czy się zmieniło" kłamałoby przy każdym imporcie.
	 *
	 * @param mixed $wartosc Struktura do zapisania.
	 *
	 * @throws Aai_Sklep_Blad_Zapisu Gdy wartości nie da się zakodować.
	 */
	private static function json( $wartosc ): string {
		$json = wp_json_encode( $wartosc, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES );
		if ( false === $json ) {
			throw new Aai_Sklep_Blad_Zapisu( 'nie udało się zakodować wartości do JSON-a' );
		}
		return $json;
	}
}
