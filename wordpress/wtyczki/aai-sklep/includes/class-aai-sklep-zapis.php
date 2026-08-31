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
 * SKĄD PRZYCHODZI KSZTAŁT. Od kroku W4 wejście z sieci sprawdza
 * `Aai_Sklep_Kontrakt` (odpowiednik Zod z prototypu) — ta warstwa dostaje
 * dane już opisane kontraktem. Import sprawdza kształt u siebie, a każda
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
	 * Identyfikator wiersza: podany albo świeżo nadany.
	 *
	 * Ta sama zasada, co w `Aai_Sklep_Kontrakt` panelu (W4): brak `id`
	 * znaczy NOWY wiersz, a nowy wiersz musi dostać uuid — bo pusty
	 * identyfikator nie jest „brakiem danych", tylko daną, która zderza
	 * się z każdą inną pustą.
	 *
	 * @param mixed $id Wartość z wejścia.
	 */
	private static function identyfikator( $id ): string {
		$id = is_string( $id ) ? trim( $id ) : '';
		return '' !== $id ? $id : wp_generate_uuid4();
	}

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

		self::powiadom( (string) $kurs['id'], $liczniki );

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
	 * DRUGI HAMULEC: LUDZIE, KTÓRZY ZA TO ZAPŁACILI. Usunięcie kursu kasuje
	 * też jego kopię w Tutorze, a razem z nią dostęp każdego, kto go kupił —
	 * bezpowrotnie i bez śladu na jego koncie. Do 0.58.0 nie pytało o to nic
	 * (znalezisko testu całości). Zgoda jest osobna od zgody na utratę treści,
	 * bo to dwie różne straty: tam ginie praca właściciela, tu cudzy dostęp.
	 *
	 * TRZECI HAMULEC: ZAMÓWIENIA W DRODZE. Kupujących liczy Tutor po zapisach
	 * `completed`, czyli po ludziach, którzy dostęp JUŻ MAJĄ. Klient płacący
	 * przelewem nie ma go ani przez chwilę — jego zapis stoi na `pending`,
	 * więc dla tamtej miary jest niewidzialny, a okno między złożeniem
	 * zamówienia a wpłatą trwa dniami. Usunięcie kursu w tym oknie
	 * przechodziło z komunikatem „0 kupujących", po czym klient księgował
	 * przelew i nie dostawał NIC.
	 *
	 * To trzecia, osobna strata i osobna zgoda: tam ginie praca właściciela,
	 * tam ktoś TRACI dostęp, a tu ktoś ZAPŁACI i go nie dostanie.
	 *
	 * O zamówieniach ta wtyczka nie wie nic i wiedzieć nie ma prawa — pyta
	 * o nie filtrem, na który odpowiada Plugin 2 (tak samo jak o cenę i CTA).
	 * Bez Pluginu 2 filtr oddaje wartość wejściową, czyli zero: sklep bez
	 * płatności nie ma zamówień, więc to zero jest PRAWDĄ, a nie ciszą.
	 *
	 * @param string $id                          Identyfikator kursu.
	 * @param string $aktor                       Kto usuwa.
	 * @param bool   $pozwol_skasowac_tresc       Zgoda na utratę napisanych lekcji.
	 * @param bool   $pozwol_stracic_dostep       Zgoda na odebranie dostępu kupującym.
	 * @param bool   $pozwol_porzucic_zamowienia  Zgoda na porzucenie zamówień w drodze.
	 *
	 * @return array<string,int> Liczniki (klucz `usuniete`).
	 *
	 * @throws Aai_Sklep_Blad_Zapisu Gdy kursu nie ma, niesie treść bez zgody, ma kupujących bez zgody albo ma zamówienia w drodze bez zgody.
	 */
	public static function usun_kurs( string $id, string $aktor, bool $pozwol_skasowac_tresc = false, bool $pozwol_stracic_dostep = false, bool $pozwol_porzucic_zamowienia = false ): array {
		$liczniki = array(
			'utworzone'      => 0,
			'zaktualizowane' => 0,
			'bez_zmian'      => 0,
			'usuniete'       => 0,
		);

		/*
		 * Liczbę kupujących bierzemy PRZED transakcją i podajemy dalej: po
		 * usunięciu kursu nikt jej już nie odtworzy (kopia w Tutorze znika
		 * razem z zapisami), a Plugin 2 musi wiedzieć, czy osierocony produkt
		 * jest zwykłym śmieciem po kursie testowym, czy śladem po tym, że
		 * ludzie stracili dostęp do czegoś, za co zapłacili.
		 */
		$kupujacy = Aai_Sklep_Tutor::kupujacy( $id );

		/**
		 * Ile złożonych, a jeszcze niedostarczonych zamówień dotyczy kursu.
		 *
		 * Odpowiada Plugin 2. `-1` znaczy „nie udało się sprawdzić" i jest
		 * traktowane jak powód do zapytania, nie jak zero: przy nieznanym
		 * stanie odmawiamy, bo cisza znaczyłaby zgodę na skasowanie cudzego,
		 * właśnie opłacanego zakupu.
		 *
		 * @param int    $ile Domyślnie zero — sklep bez płatności nie ma zamówień.
		 * @param string $id  Identyfikator kursu.
		 */
		$w_drodze = (int) apply_filters( 'aai_sklep_zamowienia_w_drodze', 0, $id );

		self::w_transakcji(
			static function () use ( $id, $aktor, $pozwol_skasowac_tresc, $pozwol_stracic_dostep, $pozwol_porzucic_zamowienia, $kupujacy, $w_drodze, &$liczniki ): void {
				self::usun_kurs_w_transakcji( $id, $aktor, $pozwol_skasowac_tresc, $pozwol_stracic_dostep, $pozwol_porzucic_zamowienia, $kupujacy, $w_drodze, $liczniki );
			}
		);

		/**
		 * Kurs zniknął z naszych tabel.
		 *
		 * @param string $id       Identyfikator kursu.
		 * @param int    $kupujacy Ilu ludzi miało do niego dostęp w chwili usunięcia.
		 */
		do_action( 'aai_sklep_kurs_usuniety', $id, $kupujacy );

		return $liczniki;
	}

	/**
	 * Rdzeń usuwania. Woływany wyłącznie w otwartej transakcji.
	 *
	 * @param string            $id            Identyfikator kursu.
	 * @param string            $aktor         Kto usuwa.
	 * @param bool              $pozwol        Zgoda na utratę treści.
	 * @param bool              $pozwol_dostep Zgoda na odebranie dostępu kupującym.
	 * @param bool              $pozwol_w_drodze Zgoda na porzucenie zamówień w drodze.
	 * @param int               $kupujacy      Ilu ludzi ma dostęp do kursu.
	 * @param int               $w_drodze      Ile zamówień złożono i nie dostarczono (-1 = nie wiadomo).
	 * @param array<string,int> $liczniki      Liczniki (przez referencję).
	 *
	 * @throws Aai_Sklep_Blad_Zapisu Gdy kursu nie ma, niesie treść bez zgody albo ma kupujących bez zgody.
	 */
	private static function usun_kurs_w_transakcji( string $id, string $aktor, bool $pozwol, bool $pozwol_dostep, bool $pozwol_w_drodze, int $kupujacy, int $w_drodze, array &$liczniki ): void {
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

		if ( $kupujacy > 0 && ! $pozwol_dostep ) {
			throw new Aai_Sklep_Blad_Zapisu(
				sprintf(
					/* translators: %d: liczba osób z dostępem do kursu. */
					_n(
						'Ten kurs ma %d kupującego — straci dostęp do materiału. Usunięcie wymaga jawnej zgody.',
						'Ten kurs ma %d kupujących — stracą dostęp do materiału. Usunięcie wymaga jawnej zgody.',
						$kupujacy,
						'aai-sklep'
					),
					$kupujacy
				),
				array( 'kupujacy' => $kupujacy )
			);
		}

		/*
		 * TRZECI HAMULEC, osobny od dwóch poprzednich. `-1` znaczy „nie
		 * udało się sprawdzić" i zatrzymuje tak samo jak liczba dodatnia:
		 * przy nieznanym stanie odmawiamy.
		 */
		if ( 0 !== $w_drodze && ! $pozwol_w_drodze ) {
			throw new Aai_Sklep_Blad_Zapisu(
				$w_drodze < 0
					? __( 'Nie udało się sprawdzić, czy ktoś ma za ten kurs złożone zamówienie. Usunięcie wymaga jawnej zgody.', 'aai-sklep' )
					: sprintf(
						/* translators: %d: liczba złożonych, jeszcze niedostarczonych zamówień. */
						_n(
							'Ten kurs ma %d złożone zamówienie, za które nie wpłynęła jeszcze wpłata — po zapłacie klient nie dostanie materiału. Usunięcie wymaga jawnej zgody.',
							'Ten kurs ma %d złożonych zamówień, za które nie wpłynęła jeszcze wpłata — po zapłacie klienci nie dostaną materiału. Usunięcie wymaga jawnej zgody.',
							$w_drodze,
							'aai-sklep'
						),
						$w_drodze
					),
				array( 'w_drodze' => $w_drodze )
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
	 * Zapisuje TREŚĆ jednej lekcji — materiał kursu, nie spis treści.
	 *
	 * DLACZEGO OSOBNA DROGA, A NIE POLE W ZAPISIE KURSU. Powód jest ten sam,
	 * dla którego prototyp miał na to osobną akcję dyspozytora: ładunek
	 * i ryzyko. Ładunek — proza obu kursów waży dziś 1,3 MB, więc dokładanie
	 * jej do każdego zapisu programu byłoby przesyłaniem całego kursu przy
	 * poprawce jednego tytułu. Ryzyko — pisanie lekcji nie ma prawa
	 * przepisywać przy okazji struktury kursu ani strony sprzedażowej.
	 *
	 * @param string              $id_lekcji Identyfikator lekcji.
	 * @param array<string,mixed> $tresc     Klucze `tresc` i `materialy`.
	 * @param string              $aktor     Kto zapisuje.
	 *
	 * @return array<string,int> Liczniki: utworzone/zaktualizowane/bez_zmian/usuniete.
	 *
	 * @throws Aai_Sklep_Blad_Zapisu Gdy lekcji nie ma albo baza odmówi.
	 */
	public static function zapisz_tresc_lekcji( string $id_lekcji, array $tresc, string $aktor ): array {
		$liczniki = array(
			'utworzone'      => 0,
			'zaktualizowane' => 0,
			'bez_zmian'      => 0,
			'usuniete'       => 0,
		);

		$id_kursu = '';

		self::w_transakcji(
			static function () use ( $id_lekcji, $tresc, $aktor, &$liczniki, &$id_kursu ): void {
				global $wpdb;

				$t_lekcje = Aai_Sklep_Tabele::tabela( 'lessons' );
				$t_moduly = Aai_Sklep_Tabele::tabela( 'modules' );

				// Kurs bierzemy z modułu, bo dziennik audytu ma znać kurs przy
				// KAŻDYM wpisie — bez tego wpisy o lekcjach byłyby sierotami
				// i „odtwórz kurs z dziennika" przestałoby działać.
				$wiersz = $wpdb->get_row(
					$wpdb->prepare(
						"SELECT l.*, m.course_id AS kurs
						   FROM `$t_lekcje` l
						   JOIN `$t_moduly` m ON m.id = l.module_id
						  WHERE l.id = %s",
						$id_lekcji
					),
					ARRAY_A
				);
				if ( null === $wiersz ) {
					throw new Aai_Sklep_Blad_Zapisu(
						sprintf( 'nie ma lekcji o id %s', $id_lekcji )
					);
				}

				$kurs     = (string) $wiersz['kurs'];
				$id_kursu = $kurs;
				unset( $wiersz['kurs'] );

				$docelowa = array(
					'id'        => $id_lekcji,
					'content'   => (string) ( $tresc['tresc'] ?? '' ),
					'materials' => self::json( $tresc['materialy'] ?? array() ),
				);

				if ( ! self::rozni_sie( $wiersz, $docelowa ) ) {
					++$liczniki['bez_zmian'];
					return;
				}

				self::zmien( $t_lekcje, $docelowa, array( 'id' => $id_lekcji ) );
				self::dziennik( $kurs, 'lessons', 'update', $wiersz, array_merge( $wiersz, $docelowa ), $aktor );
				++$liczniki['zaktualizowane'];
			}
		);

		self::powiadom( $id_kursu, $liczniki );

		return $liczniki;
	}

	/**
	 * Zmienia STAN kursu (szkic / opublikowany / ukryty).
	 *
	 * Osobno od zapisu kursu, bo publikacja nie jest edycją treści: właściciel
	 * klika ją na liście kursów, nie mając otwartego formularza. Gdyby szła
	 * przez `zapisz_kurs()`, trzeba by wtedy odesłać CAŁY kurs — a zapis
	 * niosący komplet sekcji i modułów po to, żeby zmienić jedno słowo, to
	 * proszenie się o utratę tego, czego akurat nie wczytano.
	 *
	 * @param string $id     Identyfikator kursu.
	 * @param string $status Nowy stan.
	 * @param string $aktor  Kto zmienia.
	 *
	 * @return array<string,int> Liczniki.
	 *
	 * @throws Aai_Sklep_Blad_Zapisu Gdy kursu nie ma albo baza odmówi.
	 */
	public static function ustaw_status( string $id, string $status, string $aktor ): array {
		$liczniki = array(
			'utworzone'      => 0,
			'zaktualizowane' => 0,
			'bez_zmian'      => 0,
			'usuniete'       => 0,
		);

		self::w_transakcji(
			static function () use ( $id, $status, $aktor, &$liczniki ): void {
				global $wpdb;

				$t_kursy = Aai_Sklep_Tabele::tabela( 'courses' );

				$wiersz = $wpdb->get_row(
					$wpdb->prepare( "SELECT * FROM `$t_kursy` WHERE id = %s", $id ),
					ARRAY_A
				);
				if ( null === $wiersz ) {
					throw new Aai_Sklep_Blad_Zapisu( sprintf( 'nie ma kursu o id %s', $id ) );
				}
				if ( (string) $wiersz['status'] === $status ) {
					++$liczniki['bez_zmian'];
					return;
				}

				$docelowy = array(
					'status'     => $status,
					'updated_at' => gmdate( 'Y-m-d H:i:s' ),
				);
				self::zmien( $t_kursy, $docelowy, array( 'id' => $id ) );
				self::dziennik( $id, 'courses', 'update', $wiersz, array_merge( $wiersz, $docelowy ), $aktor );
				++$liczniki['zaktualizowane'];
			}
		);

		self::powiadom( $id, $liczniki );

		return $liczniki;
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
			'badge'        => self::tekst_albo_null( $kurs['badge'] ?? null ),
			'level'        => self::tekst_albo_null( $kurs['level'] ?? null ),
		);

		/*
		 * STAN KURSU: BRAK KLUCZA ZNACZY „ZOSTAW, JAK JEST".
		 *
		 * Ta sama reguła co przy treści lekcji i z tego samego powodu.
		 * Publikację klika się na LIŚCIE kursów, nie w formularzu — a formularz
		 * otwarty wcześniej w drugiej karcie niósłby stan sprzed publikacji.
		 * Zapis poprawki jednego zdania COFAŁBY wtedy publikację: kurs
		 * wypadałby z katalogu, nikt by o tym nie wiedział, a odpowiedź
		 * brzmiałaby „zapisano". Sprawdzone uruchomieniowo w przeglądzie W4.
		 *
		 * Nowy kurs zaczyna jako szkic — tak samo jak w prototypie.
		 */
		if ( array_key_exists( 'status', $kurs ) ) {
			$docelowy_kurs['status'] = (string) $kurs['status'];
		} elseif ( null !== $stary_kurs ) {
			$docelowy_kurs['status'] = (string) $stary_kurs['status'];
		} else {
			$docelowy_kurs['status'] = 'draft';
		}

		/*
		 * SEKCJE I PROGRAM: BRAK KLUCZA ZNACZY „NIE RUSZAJ", PODANA TABLICA
		 * ZNACZY PEŁNĄ PODMIANĘ.
		 *
		 * Do przeglądu W4 brak klucza znaczył PUSTKĘ, więc zapis samych kolumn
		 * kursu kasował wszystkie sekcje i cały program — mimo że kontrakt
		 * (i ten plik) obiecywały co innego. Objaw: `zapisz_kurs()` z trzema
		 * polami czyściło kurs i wracało z sukcesem. Sprawdzone uruchomieniowo:
		 * „po utworzeniu: sekcji=1 moduly=1" → „po zapisie bez kluczy:
		 * sekcji=0 moduly=0". Panel zawsze wysyła oba klucze, więc usterka nie
		 * była widoczna z zewnątrz — ale czekała na pierwszego nowego klienta
		 * tej warstwy (synchronizacja do Tutora w W5).
		 *
		 * `null` traktujemy jak brak klucza: tak wygląda pole, którego
		 * w wysyłce nie było.
		 */
		$zmieniamy_sekcje = array_key_exists( 'sekcje', $kurs ) && null !== $kurs['sekcje'];
		$zmieniamy_program = array_key_exists( 'moduly', $kurs ) && null !== $kurs['moduly'];

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
			/*
			 * NOWY WIERSZ DOSTAJE UUID TUTAJ, nie tylko w kontrakcie panelu.
			 *
			 * `(string) null` to PUSTY ŁAŃCUCH, a wiersz o pustym `id` jest
			 * nieodróżnialny od innych takich: kopia do Tutora „znajdowała"
			 * po nim cudzy moduł, przejmowała go i kasowała jego lekcje
			 * (zmierzone przy P5 — 18 lekcji Kursu 2 zniknęło z kopii).
			 * Kontrakt kreatora nadaje uuid od W4, więc ścieżka właściciela
			 * była bezpieczna — ale warstwa zapisu jest publicznym API tej
			 * wtyczki i nie może zależeć od tego, kto ją woła.
			 */
			$mid                       = self::identyfikator( $m['id'] ?? null );
			$docelowe_moduly[ $mid ] = array(
				'id'        => $mid,
				'course_id' => $id,
				'position'  => (int) $m['position'],
				'title'     => (string) $m['title'],
				'summary'   => self::tekst_albo_null( $m['summary'] ?? null ),
			);
			foreach ( (array) ( $m['lekcje'] ?? array() ) as $l ) {
				$lid       = self::identyfikator( $l['id'] ?? null );
				$docelowa  = array(
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
				);

				/*
				 * TREŚĆ I MATERIAŁY: BRAK KLUCZA ZNACZY „NIE RUSZAJ".
				 *
				 * To nie jest wygoda, tylko warunek istnienia kreatora.
				 * Zapis programu (krok W4) przysyła sam SPIS TREŚCI: tytuły,
				 * kolejność, czasy. Gdyby brak klucza znaczył pustkę — jak
				 * znaczył do 0.41.0 — pierwsze naciśnięcie „Zapisz kurs"
				 * w panelu wyczyściłoby prozę 73 lekcji i zameldowałoby
				 * sukces. Klucz PODANY, choćby pusty, dalej znaczy dokładnie
				 * to, co przyszło: import wysyła te kolumny zawsze, więc jego
				 * zachowanie jest bez zmian, także przy celowym czyszczeniu.
				 *
				 * Nowa lekcja musi dostać wartości, bo `materials` jest
				 * NOT NULL — a wiersza, którego nie ma, nie da się „nie ruszyć".
				 */
				$nowa = ! isset( $stare_lekcje[ $lid ] );
				if ( array_key_exists( 'content', $l ) || $nowa ) {
					// Treść trzymamy dokładnie taką, jaka przyszła — także
					// pustą. Zamiana '' na NULL byłaby cichą modyfikacją
					// danych, a bramka tego kroku brzmi „co do znaku".
					$docelowa['content'] = (string) ( $l['content'] ?? '' );
				}
				if ( array_key_exists( 'materials', $l ) || $nowa ) {
					$docelowa['materials'] = self::json( $l['materials'] ?? array() );
				}

				$docelowe_lekcje[ $lid ] = $docelowa;
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
		foreach ( $zmieniamy_program ? $stare_lekcje : array() as $lid => $wiersz ) {
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

		if ( $zmieniamy_sekcje ) {
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
		}

		if ( ! $zmieniamy_program ) {
			// Zapis samych kolumn kursu (albo samych sekcji) nie ma prawa
			// tknąć programu ani materiału — nie ma tu nic do zrobienia.
			return;
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
	 * Ogłasza, że kurs w naszych tabelach jest w nowym stanie.
	 *
	 * PO CO AKCJA, A NIE WYWOŁANIE WPROST. Warstwa zapisu ma nie wiedzieć,
	 * kto na jej zmiany czeka — dziś jest to kopia w Tutor LMS (W5), jutro
	 * może dojść zapis kupującego albo odświeżenie pamięci podręcznej.
	 * Wywołanie wprost związałoby jedyne miejsce piszące do naszych tabel
	 * z cudzą wtyczką, a wtedy jej brak byłby awarią zapisu.
	 *
	 * OGŁASZAMY TAKŻE PRZY „BEZ ZMIAN". Zapis, który niczego u nas nie
	 * zmienił, nadal jest dobrą chwilą, żeby kopia dogoniła stan — dzięki
	 * temu ponowne kliknięcie „Zapisz kurs" NAPRAWIA rozjazd, zamiast go
	 * potwierdzać.
	 *
	 * SŁUCHACZ NIE MOŻE COFNĄĆ ZAPISU: ogłaszamy PO zatwierdzeniu
	 * transakcji, więc cokolwiek wydarzy się dalej, treść właściciela jest
	 * już zapisana.
	 *
	 * @param string            $id       Identyfikator kursu.
	 * @param array<string,int> $liczniki Liczniki zakończonego zapisu.
	 */
	private static function powiadom( string $id, array $liczniki ): void {
		if ( '' === $id ) {
			return;
		}

		/**
		 * Kurs został zapisany (także wtedy, gdy nic się nie zmieniło).
		 *
		 * @param string            $id       Identyfikator kursu.
		 * @param array<string,int> $liczniki Liczniki zapisu.
		 */
		do_action( 'aai_sklep_kurs_zmieniony', $id, $liczniki );
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
	 * Klucze W JEDNEJ, USTALONEJ KOLEJNOŚCI — na każdym poziomie zagnieżdżenia.
	 *
	 * Bez tego dwaj pisarze tej samej treści dają dwa różne łańcuchy:
	 * import układa klucze tak, jak przyszły z eksportu, panel tak, jak stoją
	 * w opisie pól. LISTY zostają nietknięte — ich kolejność JEST treścią
	 * (moduły, lekcje, punkty korzyści); porządkujemy wyłącznie mapy, gdzie
	 * kolejność kluczy nie znaczy nic.
	 *
	 * @param mixed $wartosc Struktura do uporządkowania.
	 *
	 * @return mixed Ta sama wartość, z mapami posortowanymi po kluczach.
	 */
	private static function uporzadkuj( $wartosc ) {
		if ( ! is_array( $wartosc ) ) {
			return $wartosc;
		}
		if ( array_is_list( $wartosc ) ) {
			return array_map( array( self::class, 'uporzadkuj' ), $wartosc );
		}
		ksort( $wartosc );
		return array_map( array( self::class, 'uporzadkuj' ), $wartosc );
	}

	/**
	 * JSON o STAŁYM kształcie — ta sama wartość musi dawać ten sam łańcuch,
	 * inaczej porównanie „czy się zmieniło" kłamałoby przy każdym imporcie.
	 *
	 * TA OBIETNICA MUSI BYĆ PRAWDZIWA, BO NA NIEJ STOI CAŁE „CZY SIĘ ZMIENIŁO".
	 * Do W6 stało tu samo `wp_json_encode`, które zachowuje kolejność kluczy
	 * tablicy — więc identyczna treść zapisana raz przez import, a raz przez
	 * panel dawała dwa różne łańcuchy. Skutek był cichy: pierwszy zapis po
	 * imporcie przepisywał WSZYSTKIE 24 sekcje, dopisywał 24 wiersze do
	 * dziennika zmian i meldował „Kurs zapisany", choć właściciel niczego nie
	 * dotknął — a dziennik ma zapisywać wyłącznie realne zmiany.
	 *
	 * @param mixed $wartosc Struktura do zapisania.
	 *
	 * @throws Aai_Sklep_Blad_Zapisu Gdy wartości nie da się zakodować.
	 */
	private static function json( $wartosc ): string {
		$json = wp_json_encode(
			self::uporzadkuj( $wartosc ),
			JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
		);
		if ( false === $json ) {
			throw new Aai_Sklep_Blad_Zapisu( 'nie udało się zakodować wartości do JSON-a' );
		}
		return $json;
	}
}
