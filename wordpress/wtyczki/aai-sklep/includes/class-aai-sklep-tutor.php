<?php
/**
 * Kopia kursu w Tutor LMS — jednokierunkowo, z NASZYCH tabel.
 *
 * PO CO TA KLASA ISTNIEJE. Architektura etapu WordPress ma dwie kopie
 * kursu: nasze tabele `wp_aai_sklep_*` (ŹRÓDŁO PRAWDY — decyzja właściciela
 * 2026-08-25) i wpisy Tutor LMS, który daje konta, zapisy i dostęp do
 * materiału za logowaniem. Do kroku W4 kopia trafiała tam RAZ, ręcznym
 * `wordpress/import-kursy.php`, więc każda zmiana w kreatorze rozjeżdżała
 * obie strony po cichu — a cichy rozjazd dwóch kopii to w tym projekcie
 * najdroższa klasa błędu (BLAD-015, znalezisko #1 przeglądu B7).
 *
 * KIERUNEK JEST JEDNOKIERUNKOWY I TO NIE JEST OZDOBA. Piszemy WYŁĄCZNIE
 * z naszych tabel do wpisów Tutora. Nigdy odwrotnie — nawet gdyby ktoś
 * zmienił tytuł w Course Builderze, ta zmiana ma zniknąć przy najbliższej
 * synchronizacji, a nie wrócić do nas. Dwukierunkowa synchronizacja
 * wymaga rozstrzygania konfliktów, a my mamy jedno źródło prawdy właśnie
 * po to, żeby konfliktów nie było. Pilnuje tego `straznik-tutora`.
 *
 * SKĄD SIĘ WZIĘŁA. Port `wordpress/import-kursy.php` (87 obiektów, treść
 * zgodna co do znaku, trzy importy z rzędu bez zmian). Tamten plik sam
 * zapowiadał w nagłówku, że jego mapy przeniosą się tutaj w kroku W5.
 * Zachowane co do decyzji: dopasowanie po `_aai_zrodlo_uuid` (nie po slugu
 * — slug wolno zmienić w kreatorze, a moduły i lekcje slugów nie mają),
 * `wp_slash` przy każdym zapisie meta i asercja przy spłaszczaniu sekcji.
 *
 * AWARIA KOPII NIE COFA ZAPISU. Zapis w kreatorze kończy się w NASZYCH
 * tabelach; kopia jest skutkiem, nie warunkiem. Gdyby Tutor był wyłączony
 * albo rzucił błędem, właściciel i tak ma zapisaną treść — błąd ląduje
 * w opcji `aai_sklep_tutor_blad`, widać go w kokpicie i w komendzie
 * `wp aai-sklep sprawdz-tutora`. Odwrotna decyzja (cofanie zapisu) znaczyłaby,
 * że wyłączenie cudzej wtyczki blokuje właścicielowi edycję własnej treści.
 *
 * @package Aai_Sklep
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Synchronizacja kursu do wpisów Tutor LMS.
 */
final class Aai_Sklep_Tutor {

	/**
	 * Klucz meta z identyfikatorem z NASZEJ tabeli.
	 *
	 * Ten sam co w `wordpress/import-kursy.php`, żeby kopia zrobiona tamtym
	 * skryptem została rozpoznana, a nie zduplikowana.
	 */
	public const META_UUID = '_aai_zrodlo_uuid';

	/** Opcja z ostatnią nieudaną synchronizacją. */
	private const OPCJA_BLEDU = 'aai_sklep_tutor_blad';

	/**
	 * Nasze rodzaje sekcji, które Tutor umie pokazać SAM.
	 *
	 * Cztery z dwunastu (sprawdzone w kodzie wtyczki, nie zgadnięte).
	 * Reszta — hero, faq, gwarancja, opinie, autor, pozycjonowanie,
	 * transformacja, porównanie — nie ma tam odpowiednika i renderuje ją
	 * NASZA strona sprzedażowa. To jest mierzalne uzasadnienie podziału
	 * odpowiedzialności z ETAP-WP.md.
	 *
	 * Rodzaj spoza tej mapy trafia do `_aai_sekcje`, więc nowa sekcja
	 * w kreatorze nie wymaga tu żadnej zmiany.
	 */
	private const SEKCJA_NA_TUTOR = array(
		'benefits' => '_tutor_course_benefits',
		'for_whom' => '_tutor_course_target_audience',
		'package'  => '_tutor_course_material_includes',
		'problem'  => '_tutor_course_requirements',
	);

	/**
	 * Nasz stan kursu → status wpisu KURSU. Szkic nie może stać się publiczny
	 * przez pomyłkę, a kurs zdjęty ze sprzedaży nie może dać się zapisać za darmo.
	 *
	 * `archived` → `private` NIE JEST tu ozdobą: `Course::enroll_now()` Tutora
	 * to publiczny handler POST, który po zalogowaniu i nonce'ie zapisuje na
	 * KAŻDY kurs niebędący `purchasable` — a kurs zdjęty ze sprzedaży właśnie
	 * taki jest, bo `Aai_Platnosci_Zapis::zdejmij_kurs()` ustawia mu
	 * `_tutor_course_price_type = free`. Jedyne, co ten handler zatrzymuje
	 * wprost, to status `private` (sprawdzone w jego kodzie, nie założone).
	 */
	private const STATUS_KURSU_NA_WP = array(
		'draft'     => 'draft',
		'published' => 'publish',
		'archived'  => 'private',
	);

	/**
	 * Nasz stan kursu → status wpisów MATERIAŁU (moduły i lekcje).
	 *
	 * DLACZEGO INNY NIŻ STATUS KURSU. „Ukryj" ma zabierać kurs ze SKLEPU,
	 * a nie odbierać go ludziom, którzy już zapłacili (decyzja właściciela
	 * 2026-08-31, znalezisko 2 z testu całości). Do 0.58.0 cała kopia szła
	 * jednym statusem, więc ukrycie przepisywało 73 lekcje na `private`,
	 * a `private` odcina każdego bez `read_private_posts` — kupujący dostawał
	 * **404**, przy obu kontrolach świecących na zielono.
	 *
	 * Materiał może zostać `publish`, bo dostępu i tak nie pilnuje status
	 * wpisu, tylko ZAPIS na kurs — `has_enrolled_content_access()` sprowadza
	 * się do `is_enrolled()`, a `get_enrolled_courses_ids_by_user()` pyta
	 * wyłącznie o wpisy zapisów i o status kursu w ogóle nie pyta (oba
	 * zmierzone w kodzie Tutora). Publicznych LIST lekcji i modułów nie ma
	 * od naprawy wycieku (`Aai_Sklep_Lekcja::zamknij_typ()`), a darmowe
	 * zapowiedzi gasną razem z kursem — pilnuje tego `Aai_Sklep_Lekcja`.
	 *
	 * Szkic zostaje szkicem w całości: kurs, którego nigdy nie było
	 * w sprzedaży, nie ma komu udostępniać materiału.
	 */
	private const STATUS_MATERIALU_NA_WP = array(
		'draft'     => 'draft',
		'published' => 'publish',
		'archived'  => 'publish',
	);

	/** Nasz poziom → `_tutor_course_level` (Tutor zna beginner/intermediate/expert/all_levels). */
	private const POZIOM_NA_TUTOR = array(
		'podstawowy'          => 'beginner',
		'sredniozaawansowany' => 'intermediate',
		'zaawansowany'        => 'expert',
	);

	/**
	 * Czy synchronizacja jest wstrzymana.
	 *
	 * Import masowy zapisuje kurs po kursie, więc bez tej blokady kopia
	 * jechałaby po każdym z nich osobno. Wstrzymujemy na czas importu
	 * i robimy JEDNĄ synchronizację na kurs na końcu.
	 */
	private static bool $wstrzymana = false;

	/**
	 * Rejestracja — wołane raz, z pliku głównego wtyczki.
	 */
	public static function zarejestruj(): void {
		add_action( 'aai_sklep_kurs_zmieniony', array( self::class, 'na_zmianie' ), 10, 1 );
		add_action( 'aai_sklep_kurs_usuniety', array( self::class, 'na_usunieciu' ), 10, 1 );
	}

	/**
	 * Czy Tutor LMS jest w tej instalacji.
	 *
	 * Bez niego wtyczka ma działać dalej — katalog i strony sprzedażowe są
	 * nasze i nie potrzebują LMS-a. Brak Tutora nie jest błędem, tylko
	 * brakiem odbiorcy kopii.
	 */
	public static function dostepny(): bool {
		return function_exists( 'tutor' ) && is_object( tutor() );
	}

	/**
	 * Typy wpisów pytamy TUTORA, nie wpisujemy na sztywno — są przepuszczone
	 * przez filtry (`tutor_course_post_type` i sąsiednie), więc na cudzej
	 * instalacji mogą nazywać się inaczej.
	 *
	 * @return array{kurs:string,modul:string,lekcja:string}
	 */
	public static function typy(): array {
		if ( ! self::dostepny() ) {
			return array(
				'kurs'   => 'courses',
				'modul'  => 'topics',
				'lekcja' => 'lesson',
			);
		}
		return array(
			'kurs'   => (string) ( tutor()->course_post_type ?? 'courses' ),
			'modul'  => (string) ( tutor()->topics_post_type ?? 'topics' ),
			'lekcja' => (string) ( tutor()->lesson_post_type ?? 'lesson' ),
		);
	}

	/** Wstrzymanie synchronizacji (import masowy). */
	public static function wstrzymaj(): void {
		self::$wstrzymana = true;
	}

	/** Wznowienie synchronizacji. */
	public static function wznow(): void {
		self::$wstrzymana = false;
	}

	/**
	 * Reakcja na zmianę kursu w naszych tabelach.
	 *
	 * WOŁAMY TAKŻE PRZY „BEZ ZMIAN". To nie jest przeoczenie: zapis bez
	 * zmian w naszych tabelach nic nie kosztuje po tamtej stronie (żaden
	 * wpis nie zostanie ruszony), a daje właścicielowi przycisk NAPRAWY —
	 * gdyby kopia rozjechała się po awarii, wystarczy zapisać kurs jeszcze
	 * raz. Synchronizacja, która milczy przy „bez zmian", umiałaby tylko
	 * nadążać, nie leczyć.
	 *
	 * @param string $id Identyfikator kursu w naszych tabelach.
	 */
	public static function na_zmianie( string $id ): void {
		if ( self::$wstrzymana || ! self::dostepny() ) {
			return;
		}
		try {
			self::synchronizuj_kurs( $id );
		} catch ( Throwable $blad ) {
			self::zapamietaj_blad( $id, $blad->getMessage() );
		}
	}

	/**
	 * Reakcja na usunięcie kursu z naszych tabel.
	 *
	 * @param string $id Identyfikator kursu.
	 */
	public static function na_usunieciu( string $id ): void {
		if ( self::$wstrzymana || ! self::dostepny() ) {
			return;
		}
		try {
			self::usun_kopie( $id );
		} catch ( Throwable $blad ) {
			self::zapamietaj_blad( $id, $blad->getMessage() );
		}
	}

	/**
	 * Kopiuje jeden kurs do wpisów Tutora.
	 *
	 * @param string $id Identyfikator kursu w naszych tabelach.
	 *
	 * @return array<string,int> Liczniki: utworzone/zaktualizowane/bez_zmian/usuniete.
	 *
	 * @throws Aai_Sklep_Blad_Zapisu Gdy kursu nie ma albo WordPress odmówi zapisu.
	 */
	public static function synchronizuj_kurs( string $id ): array {
		$kurs = self::dane_kursu( $id );
		if ( null === $kurs ) {
			throw new Aai_Sklep_Blad_Zapisu( sprintf( 'nie ma kursu o id %s', $id ) );
		}

		$liczniki = array(
			'utworzone'      => 0,
			'zaktualizowane' => 0,
			'bez_zmian'      => 0,
			'usuniete'       => 0,
		);

		$posty = array(); // uuid => ID wpisu; potrzebne, żeby dziecko znało rodzica.

		foreach ( self::plan_kursu( $kurs ) as $pozycja ) {
			$rodzic = null === $pozycja['rodzic_uuid'] ? 0 : ( $posty[ $pozycja['rodzic_uuid'] ] ?? 0 );
			if ( null !== $pozycja['rodzic_uuid'] && 0 === $rodzic ) {
				// Nie da się wstawić lekcji pod moduł, którego zapis nie
				// powiódł się wcześniej — lepiej stanąć niż zrobić sierotę.
				throw new Aai_Sklep_Blad_Zapisu(
					sprintf( 'brak wpisu rodzica dla %s', $pozycja['uuid'] )
				);
			}

			$dane                = $pozycja['dane'];
			$dane['post_parent'] = $rodzic;

			list( $id_postu, $stan ) = self::zapisz_post( $dane, $pozycja['uuid'], $pozycja['meta'] );

			$posty[ $pozycja['uuid'] ] = $id_postu;
			++$liczniki[ $stan ];

			if ( 'kurs' === $pozycja['rola'] ) {
				self::miniatura( $id_postu, $kurs['cover_url'] );
			}
		}

		$liczniki['usuniete'] += self::usun_nadmiar( $posty[ $kurs['id'] ], array_keys( $posty ) );

		return $liczniki;
	}

	/**
	 * Kasuje kopię kursu w Tutorze.
	 *
	 * Kurs skasowany u nas MUSI zniknąć tam — inaczej zostaje sierota,
	 * do której Tutor dalej sprzedaje dostęp, a `sprawdz-tutora` słusznie
	 * zapala się na czerwono.
	 *
	 * @param string $id Identyfikator kursu w naszych tabelach.
	 *
	 * @return array<string,int> Liczniki (klucz `usuniete`).
	 */
	public static function usun_kopie( string $id ): array {
		$liczniki = array(
			'utworzone'      => 0,
			'zaktualizowane' => 0,
			'bez_zmian'      => 0,
			'usuniete'       => 0,
		);

		$id_kursu = self::znajdz_po_uuid( $id, self::typy()['kurs'] );
		if ( 0 === $id_kursu ) {
			return $liczniki;
		}

		// Najpierw dzieci, potem rodzic — dokładnie jak w naszej warstwie
		// zapisu: kasowanie od dołu zostawia w każdej chwili spójne drzewo.
		$liczniki['usuniete'] += self::usun_nadmiar( $id_kursu, array() );
		wp_delete_post( $id_kursu, true );
		++$liczniki['usuniete'];

		return $liczniki;
	}

	/**
	 * Porównuje NASZE tabele z kopią w Tutorze.
	 *
	 * Porównujemy przeciw TEMU SAMEMU planowi, z którego synchronizacja
	 * pisze (`plan_kursu`), a nie przeciw drugiej, ręcznie spisanej liście
	 * pól. Lista spisana osobno rozjechałaby się z zapisem przy pierwszym
	 * nowym polu i kontrola meldowałaby zgodność, której nie ma.
	 *
	 * @param string|null $tylko_id Ograniczenie do jednego kursu.
	 *
	 * @return array{roznice:array<int,array<string,string>>,sprawdzonych:int,kursy:int}
	 */
	public static function porownaj( ?string $tylko_id = null ): array {
		$roznice      = array();
		$sprawdzonych = 0;
		$typy         = self::typy();
		$znane        = array();

		$identyfikatory = null === $tylko_id ? self::identyfikatory_kursow() : array( $tylko_id );

		foreach ( $identyfikatory as $id ) {
			$kurs = self::dane_kursu( $id );
			if ( null === $kurs ) {
				$roznice[] = array(
					'rodzaj' => 'brak_kursu',
					'co'     => $id,
					'opis'   => 'kursu nie ma w naszych tabelach',
				);
				continue;
			}

			foreach ( self::plan_kursu( $kurs ) as $pozycja ) {
				++$sprawdzonych;
				$id_postu = self::znajdz_po_uuid( $pozycja['uuid'], $pozycja['dane']['post_type'] );
				$znane[]  = $pozycja['uuid'];

				if ( 0 === $id_postu ) {
					$roznice[] = array(
						'rodzaj' => 'brak_wpisu',
						'co'     => $kurs['slug'] . ' → ' . $pozycja['dane']['post_title'],
						'opis'   => sprintf( 'nie ma wpisu %s o uuid %s', $pozycja['dane']['post_type'], $pozycja['uuid'] ),
					);
					continue;
				}

				$post   = get_post( $id_postu );
				$rodzic = null === $pozycja['rodzic_uuid']
					? 0
					: self::znajdz_po_uuid( $pozycja['rodzic_uuid'], 'lekcja' === $pozycja['rola'] ? $typy['modul'] : $typy['kurs'] );

				$dane                = $pozycja['dane'];
				$dane['post_parent'] = $rodzic;

				foreach ( self::rozjazdy_postu( $post, $dane, $pozycja['meta'] ) as $pole => $opis ) {
					$roznice[] = array(
						'rodzaj' => 'rozjazd',
						'co'     => $kurs['slug'] . ' → ' . $pozycja['dane']['post_title'] . ' (' . $pole . ')',
						'opis'   => $opis,
					);
				}
			}
		}

		// Sieroty i obce wpisy — tylko przy pełnym przebiegu, bo przy
		// pojedynczym kursie nie wiemy, co należy do pozostałych.
		if ( null === $tylko_id ) {
			foreach ( self::wpisy_tutora() as $wpis ) {
				$uuid = (string) get_post_meta( $wpis->ID, self::META_UUID, true );
				if ( '' === $uuid ) {
					$roznice[] = array(
						'rodzaj' => 'obcy',
						'co'     => $wpis->post_type . ' #' . $wpis->ID . ' „' . $wpis->post_title . '”',
						'opis'   => 'wpis w Tutorze bez naszego uuid — powstał poza kreatorem i nikt go nie aktualizuje',
					);
					continue;
				}
				if ( ! in_array( $uuid, $znane, true ) ) {
					$roznice[] = array(
						'rodzaj' => 'sierota',
						'co'     => $wpis->post_type . ' #' . $wpis->ID . ' „' . $wpis->post_title . '”',
						'opis'   => 'kopia obiektu, którego nie ma już w naszych tabelach',
					);
				}
			}
		}

		return array(
			'roznice'      => $roznice,
			'sprawdzonych' => $sprawdzonych,
			'kursy'        => count( $identyfikatory ),
		);
	}

	/**
	 * Ostatni zapamiętany błąd synchronizacji (albo null).
	 *
	 * @return array{kurs:string,komunikat:string,kiedy:string}|null
	 */
	public static function ostatni_blad(): ?array {
		$blad = get_option( self::OPCJA_BLEDU, null );
		return is_array( $blad ) ? $blad : null;
	}

	/** Kasuje zapamiętany błąd — po udanej synchronizacji nie ma czego pokazywać. */
	public static function zapomnij_blad(): void {
		delete_option( self::OPCJA_BLEDU );
	}

	/* ————————————————————— plan kopii ————————————————————— */

	/**
	 * Kurs → lista wpisów, jakie mają być w Tutorze.
	 *
	 * Jedno miejsce, w którym mieszka odpowiedź „jak wygląda kopia" — czyta
	 * je i zapis, i kontrola zgodności.
	 *
	 * @param array<string,mixed> $kurs Kurs z naszych tabel.
	 *
	 * @return array<int,array{uuid:string,rola:string,rodzic_uuid:string|null,dane:array<string,mixed>,meta:array<string,string>}>
	 */
	private static function plan_kursu( array $kurs ): array {
		$typy             = self::typy();
		$status           = self::STATUS_KURSU_NA_WP[ $kurs['status'] ] ?? 'draft';
		$status_materialu = self::STATUS_MATERIALU_NA_WP[ $kurs['status'] ] ?? 'draft';

		$sekcje_tutor = array();
		$sekcje_nasze = array();
		foreach ( $kurs['sekcje'] as $sekcja ) {
			$klucz = self::SEKCJA_NA_TUTOR[ $sekcja['kind'] ] ?? null;
			if ( null !== $klucz ) {
				$sekcje_tutor[ $klucz ] = self::linie_tutora( $sekcja['kind'], (array) $sekcja['content'] );
			}
			$sekcje_nasze[] = array(
				'rodzaj' => $sekcja['kind'],
				'tresc'  => $sekcja['content'],
			);
		}

		$plan = array();

		$plan[] = array(
			'uuid'        => $kurs['id'],
			'rola'        => 'kurs',
			'rodzic_uuid' => null,
			'dane'        => array(
				'post_type'    => $typy['kurs'],
				'post_status'  => $status,
				'post_name'    => $kurs['slug'],
				'post_title'   => $kurs['title'],
				/*
				 * Treść wpisu zostaje PUSTA świadomie. Stroną sprzedażową
				 * jest nasza `/szkolenia/<slug>`, a `/courses/<slug>/` od W3
				 * oddaje na nią 301 — wpis w Tutorze jest kopią techniczną
				 * dla LMS-a, nie drugą wersją oferty. Opis, którym Tutor
				 * podpisuje kurs w swoim panelu, jedzie do zajawki niżej.
				 */
				'post_content' => '',
				'post_excerpt' => (string) ( $kurs['short_desc'] ?? '' ),
				'menu_order'   => 0,
			),
			'meta'        => array_merge(
				$sekcje_tutor,
				array(
					'_tutor_course_level' => null === $kurs['level'] ? '' : ( self::POZIOM_NA_TUTOR[ $kurs['level'] ] ?? '' ),
					/*
					 * Cena jedzie tu jako DANA, nie jako cena Tutora: sprzedaż
					 * bierze WooCommerce (Plugin 2), a decyzja „gdzie mieszka
					 * cena" jeszcze nie zapadła. Do tego czasu kurs w Tutorze
					 * jest `Free` — i to jest prawda, bo kupić się go tam nie da.
					 */
					'_aai_cena_grosze'    => (string) $kurs['price_grosze'],
					'_aai_badge'          => (string) ( $kurs['badge'] ?? '' ),
					'_aai_typ'            => (string) $kurs['type'],
					'_aai_okladka_url'    => (string) ( $kurs['cover_url'] ?? '' ),
					'_aai_sekcje'         => self::json( $sekcje_nasze ),
				)
			),
		);

		foreach ( $kurs['moduly'] as $modul ) {
			$plan[] = array(
				'uuid'        => $modul['id'],
				'rola'        => 'modul',
				'rodzic_uuid' => $kurs['id'],
				'dane'        => array(
					'post_type'    => $typy['modul'],
					'post_status'  => $status_materialu,
					'post_title'   => $modul['title'],
					'post_content' => (string) ( $modul['summary'] ?? '' ),
					'menu_order'   => (int) $modul['position'],
				),
				'meta'        => array(),
			);

			foreach ( $modul['lekcje'] as $lekcja ) {
				$plan[] = array(
					'uuid'        => $lekcja['id'],
					'rola'        => 'lekcja',
					'rodzic_uuid' => $modul['id'],
					'dane'        => array(
						'post_type'    => $typy['lekcja'],
						'post_status'  => $status_materialu,
						'post_title'   => $lekcja['title'],
						'post_content' => (string) $lekcja['content'],
						'menu_order'   => (int) $lekcja['position'],
					),
					'meta'        => array(
						/*
						 * Tutor trzyma czas jako tablicę godzin i minut.
						 * NASZ widok lekcji czyta czas z naszych tabel — to
						 * jest tu dla panelu Tutora, nie dla klienta.
						 */
						'_course_duration' => self::json(
							array(
								'hours'   => intdiv( (int) $lekcja['duration_min'], 60 ),
								'minutes' => ( (int) $lekcja['duration_min'] ) % 60,
								'seconds' => 0,
							)
						),
						'_aai_zapowiedz'   => $lekcja['preview'] ? '1' : '0',
						'_aai_materialy'   => self::json( $lekcja['materials'] ?? array() ),
					),
				);
			}
		}

		return $plan;
	}

	/* ————————————————————— zapis wpisów ————————————————————— */

	/**
	 * Wkłada albo aktualizuje wpis dopasowany po naszym uuid.
	 *
	 * @param array<string,mixed>  $dane Pola wpisu.
	 * @param string               $uuid Nasz identyfikator.
	 * @param array<string,string> $meta Klucze meta.
	 *
	 * @return array{0:int,1:string} ID wpisu i stan: utworzone/zaktualizowane/bez_zmian.
	 *
	 * @throws Aai_Sklep_Blad_Zapisu Gdy WordPress odmówi zapisu.
	 */
	private static function zapisz_post( array $dane, string $uuid, array $meta ): array {
		$istniejacy = self::znajdz_po_uuid( $uuid, (string) $dane['post_type'] );

		if ( $istniejacy > 0 ) {
			$post = get_post( $istniejacy );
			if ( $post instanceof WP_Post && array() === self::rozjazdy_postu( $post, $dane, $meta ) ) {
				return array( $istniejacy, 'bez_zmian' );
			}
			$dane['ID'] = $istniejacy;
			$id         = wp_update_post( wp_slash( $dane ), true );
			$stan       = 'zaktualizowane';
		} else {
			$id   = wp_insert_post( wp_slash( $dane ), true );
			$stan = 'utworzone';
		}

		if ( is_wp_error( $id ) ) {
			throw new Aai_Sklep_Blad_Zapisu(
				sprintf( '%s: %s', $dane['post_title'], $id->get_error_message() )
			);
		}

		/*
		 * `wp_slash` jest OBOWIĄZKOWE, nie ozdobne: `update_post_meta()`
		 * puszcza wartość przez `wp_unslash()`, więc bez tego znika KAŻDY
		 * backslash — w kursie o Gicie to ścieżki `C:\Users` i sekwencje
		 * `\n` w przykładach. Złapane testem idempotencji przy 0.36.0:
		 * drugi import raportował „zaktualizowany", bo zapisane `https://`
		 * nie równało się wysłanemu `https:\/\/`.
		 *
		 * UWAGA: to pułapka API POSTÓW I META. `$wpdb->insert()`/`update()`
		 * NIE puszczają wartości przez `wp_unslash`, więc nasza warstwa
		 * zapisu `wp_slash` nie potrzebuje i nie używa.
		 */
		update_post_meta( (int) $id, self::META_UUID, wp_slash( $uuid ) );
		foreach ( $meta as $klucz => $wartosc ) {
			update_post_meta( (int) $id, $klucz, wp_slash( $wartosc ) );
		}

		return array( (int) $id, $stan );
	}

	/**
	 * Czym wpis różni się od tego, co ma w nim być.
	 *
	 * Pusta tablica = zgodny. Ta sama funkcja odpowiada na pytanie „czy
	 * trzeba pisać" przy synchronizacji i „czy kopie się rozjechały" przy
	 * kontroli — dzięki temu nie ma stanu, który zapis uznaje za zgodny,
	 * a kontrola za rozjazd (ani odwrotnie).
	 *
	 * @param WP_Post|null         $post Wpis z bazy.
	 * @param array<string,mixed>  $dane Pola oczekiwane.
	 * @param array<string,string> $meta Meta oczekiwane.
	 *
	 * @return array<string,string> Pole => opis różnicy.
	 */
	private static function rozjazdy_postu( ?WP_Post $post, array $dane, array $meta ): array {
		if ( ! $post instanceof WP_Post ) {
			return array( 'wpis' => 'nie ma wpisu' );
		}

		$rozjazdy = array();

		$pola = array(
			'post_title'   => (string) $post->post_title,
			'post_content' => (string) $post->post_content,
			'post_status'  => (string) $post->post_status,
			'post_excerpt' => (string) $post->post_excerpt,
			'post_name'    => (string) $post->post_name,
			'menu_order'   => (int) $post->menu_order,
			'post_parent'  => (int) $post->post_parent,
		);

		foreach ( $pola as $pole => $jest ) {
			if ( ! array_key_exists( $pole, $dane ) ) {
				continue;
			}
			$ma_byc = is_int( $jest ) ? (int) $dane[ $pole ] : (string) $dane[ $pole ];
			if ( $jest !== $ma_byc ) {
				$rozjazdy[ $pole ] = self::opis_roznicy( $pole, (string) $jest, (string) $ma_byc );
			}
		}

		foreach ( $meta as $klucz => $ma_byc ) {
			$jest = get_post_meta( $post->ID, $klucz, true );
			if ( ! is_string( $jest ) ) {
				$jest = self::json( $jest );
			}
			if ( $jest !== $ma_byc ) {
				$rozjazdy[ $klucz ] = self::opis_roznicy( $klucz, $jest, $ma_byc );
			}
		}

		return $rozjazdy;
	}

	/**
	 * Opis różnicy — bez wylewania całej treści lekcji do komunikatu.
	 *
	 * @param string $pole   Nazwa pola.
	 * @param string $jest   Wartość w Tutorze.
	 * @param string $ma_byc Wartość u nas.
	 */
	private static function opis_roznicy( string $pole, string $jest, string $ma_byc ): string {
		if ( mb_strlen( $jest ) > 80 || mb_strlen( $ma_byc ) > 80 ) {
			return sprintf(
				'%s: kopia ma %d znaków (sha %s), u nas %d (sha %s)',
				$pole,
				mb_strlen( $jest ),
				substr( hash( 'sha256', $jest ), 0, 8 ),
				mb_strlen( $ma_byc ),
				substr( hash( 'sha256', $ma_byc ), 0, 8 )
			);
		}
		return sprintf( '%s: kopia ma „%s”, u nas „%s”', $pole, $jest, $ma_byc );
	}

	/**
	 * Kasuje wpisy pod kursem, których nie ma już w naszych tabelach.
	 *
	 * @param int           $id_kursu Wpis kursu w Tutorze.
	 * @param array<string> $zostaja  Uuid-y, które mają zostać.
	 *
	 * @return int Ile skasowano.
	 */
	private static function usun_nadmiar( int $id_kursu, array $zostaja ): int {
		$typy      = self::typy();
		$skasowane = 0;

		$moduly = get_posts(
			array(
				'post_type'   => $typy['modul'],
				'post_status' => 'any',
				'post_parent' => $id_kursu,
				'numberposts' => -1,
				'fields'      => 'ids',
			)
		);

		foreach ( (array) $moduly as $id_modulu ) {
			$lekcje = get_posts(
				array(
					'post_type'   => $typy['lekcja'],
					'post_status' => 'any',
					'post_parent' => (int) $id_modulu,
					'numberposts' => -1,
					'fields'      => 'ids',
				)
			);
			foreach ( (array) $lekcje as $id_lekcji ) {
				$uuid = (string) get_post_meta( (int) $id_lekcji, self::META_UUID, true );
				if ( in_array( $uuid, $zostaja, true ) ) {
					continue;
				}
				wp_delete_post( (int) $id_lekcji, true );
				++$skasowane;
			}

			$uuid = (string) get_post_meta( (int) $id_modulu, self::META_UUID, true );
			if ( in_array( $uuid, $zostaja, true ) ) {
				continue;
			}
			wp_delete_post( (int) $id_modulu, true );
			++$skasowane;
		}

		return $skasowane;
	}

	/**
	 * Miniatura kursu z `cover_url`.
	 *
	 * CZEGO TU CELOWO NIE MA. Okładki obu kursów to pliki SVG jadące
	 * Z WTYCZKĄ (`assets/okladki/`), a nie załączniki — WordPress domyślnie
	 * nie wpuszcza SVG do biblioteki mediów i nie zamierzamy tej blokady
	 * otwierać dla strony, którą klient i tak ogląda pod naszym adresem.
	 * Miniatura ustawia się więc wtedy i tylko wtedy, gdy okładka jest
	 * PLIKIEM Z BIBLIOTEKI (tak wybiera ją kreator od W4). W pozostałych
	 * przypadkach kurs w panelu Tutora zostaje bez miniatury, a adres
	 * okładki i tak jedzie w `_aai_okladka_url`.
	 *
	 * @param int         $id_postu  Wpis kursu.
	 * @param string|null $cover_url Wartość kolumny `cover_url`.
	 */
	private static function miniatura( int $id_postu, ?string $cover_url ): void {
		$adres = Aai_Sklep_Widok::okladka( $cover_url );
		if ( null === $adres ) {
			return;
		}
		$zalacznik = attachment_url_to_postid( $adres );
		if ( $zalacznik > 0 ) {
			set_post_thumbnail( $id_postu, $zalacznik );
		}
	}

	/* ————————————————————— odczyt naszych tabel ————————————————————— */

	/**
	 * Kurs z naszych tabel razem z TREŚCIĄ lekcji.
	 *
	 * Osobno od `Aai_Sklep_Odczyt` (ten obsługuje stronę i treści nie zna)
	 * i od `Aai_Sklep_Raport` (ten oddaje skróty, nie tekst). Kopia dla
	 * LMS-a potrzebuje pełnej treści, bo to ona jest towarem za logowaniem.
	 *
	 * @param string $id Identyfikator kursu.
	 *
	 * @return array<string,mixed>|null
	 */
	private static function dane_kursu( string $id ): ?array {
		global $wpdb;

		$t_kursy  = Aai_Sklep_Tabele::tabela( 'courses' );
		$t_sekcje = Aai_Sklep_Tabele::tabela( 'sections' );
		$t_moduly = Aai_Sklep_Tabele::tabela( 'modules' );
		$t_lekcje = Aai_Sklep_Tabele::tabela( 'lessons' );

		$kurs = $wpdb->get_row(
			$wpdb->prepare( "SELECT * FROM `$t_kursy` WHERE id = %s", $id ), // phpcs:ignore WordPress.DB.PreparedSQL
			ARRAY_A
		);
		if ( null === $kurs ) {
			return null;
		}

		$sekcje = array();
		foreach ( (array) $wpdb->get_results( $wpdb->prepare( "SELECT kind, content FROM `$t_sekcje` WHERE course_id = %s ORDER BY kind", $id ), ARRAY_A ) as $s ) { // phpcs:ignore WordPress.DB.PreparedSQL
			$sekcje[] = array(
				'kind'    => (string) $s['kind'],
				'content' => json_decode( (string) $s['content'], true ),
			);
		}

		$wiersze_modulow = (array) $wpdb->get_results( $wpdb->prepare( "SELECT * FROM `$t_moduly` WHERE course_id = %s ORDER BY position", $id ), ARRAY_A ); // phpcs:ignore WordPress.DB.PreparedSQL

		/*
		 * JEDNO zapytanie o WSZYSTKIE lekcje kursu, nie jedno na moduł.
		 *
		 * Do tej poprawki lekcje pobierała pętla wewnątrz pętli po modułach,
		 * więc koszt rósł liniowo z programem kursu — a `dane_kursu()`
		 * wołają DWA miejsca, w których to się mnoży: `synchronizuj_kurs()`
		 * po KAŻDYM zapisie w kreatorze oraz `porownaj()` w pętli po
		 * wszystkich kursach (komenda `wp aai-sklep sprawdz-tutora`, punkt
		 * kontrolny `postaw.sh`). Zmierzone przed poprawką: 6 zapytań
		 * o lekcje na jeden kurs o 6 modułach.
		 *
		 * `JOIN`, a nie `IN (...)`, z tego samego powodu co w
		 * `Aai_Sklep_Odczyt::moduly()`: lista `%s, %s, …` musiałaby wejść
		 * do literału SQL jako zmienna spoza klasy tabel, czego zabrania
		 * reguła 6 `straznik-wtyczki-wp`, a pusta lista w `IN ()` jest
		 * błędem składni.
		 */
		$lekcje_modulu = array();
		if ( array() !== $wiersze_modulow ) {
			// phpcs:ignore WordPress.DB.PreparedSQL
			$wiersze_lekcji = (array) $wpdb->get_results(
				$wpdb->prepare(
					"SELECT l.* FROM `$t_lekcje` l
					   INNER JOIN `$t_moduly` m ON m.id = l.module_id
					  WHERE m.course_id = %s
					  ORDER BY m.position, l.position",
					$id
				),
				ARRAY_A
			);
			// Grupowanie zachowuje kolejność z `ORDER BY`, więc lekcje
			// w module zostają ułożone po `position` — jak przed zmianą.
			foreach ( $wiersze_lekcji as $l ) {
				$lekcje_modulu[ (string) $l['module_id'] ][] = array(
					'id'           => (string) $l['id'],
					'position'     => (int) $l['position'],
					'title'        => (string) $l['title'],
					'duration_min' => (int) $l['duration_min'],
					'preview'      => (bool) (int) $l['preview'],
					'materials'    => json_decode( (string) $l['materials'], true ),
					'content'      => (string) $l['content'],
				);
			}
		}

		$moduly = array();
		foreach ( $wiersze_modulow as $m ) {
			$moduly[] = array(
				'id'       => (string) $m['id'],
				'position' => (int) $m['position'],
				'title'    => (string) $m['title'],
				'summary'  => null === $m['summary'] ? null : (string) $m['summary'],
				'lekcje'   => $lekcje_modulu[ (string) $m['id'] ] ?? array(),
			);
		}

		return array(
			'id'           => (string) $kurs['id'],
			'slug'         => (string) $kurs['slug'],
			'title'        => (string) $kurs['title'],
			'type'         => (string) $kurs['type'],
			'short_desc'   => null === $kurs['short_desc'] ? null : (string) $kurs['short_desc'],
			'price_grosze' => (int) $kurs['price_grosze'],
			'cover_url'    => null === $kurs['cover_url'] ? null : (string) $kurs['cover_url'],
			'status'       => (string) $kurs['status'],
			'badge'        => null === $kurs['badge'] ? null : (string) $kurs['badge'],
			'level'        => null === $kurs['level'] ? null : (string) $kurs['level'],
			'sekcje'       => $sekcje,
			'moduly'       => $moduly,
		);
	}

	/**
	 * Identyfikatory wszystkich kursów w naszych tabelach.
	 *
	 * @return array<int,string>
	 */
	public static function identyfikatory_kursow(): array {
		global $wpdb;

		$tabela = Aai_Sklep_Tabele::tabela( 'courses' );
		return array_map(
			'strval',
			(array) $wpdb->get_col( "SELECT id FROM `$tabela` ORDER BY slug" ) // phpcs:ignore WordPress.DB.PreparedSQL
		);
	}

	/* ————————————————————— drobiazgi ————————————————————— */

	/**
	 * Wpis Tutora po naszym uuid. Zwraca ID albo 0.
	 *
	 * `post_status => any` obejmuje szkice — inaczej powtórna synchronizacja
	 * zduplikowałaby kurs, który leży jako szkic.
	 *
	 * @param string $uuid Nasz identyfikator.
	 * @param string $typ  Typ wpisu.
	 */
	private static function znajdz_po_uuid( string $uuid, string $typ ): int {
		/*
		 * PUSTY UUID NIE PASUJE DO NICZEGO — i to jest zabezpieczenie przed
		 * cichą utratą treści, nie ostrożność na wszelki wypadek.
		 *
		 * ZMIERZONE (P5, sweep). Zapytanie `meta_value => ''` dopasowuje
		 * PIERWSZY LEPSZY wpis danego typu, więc wpis o pustym uuid
		 * „znajdował" cudzy moduł: przejmował go (tytuł, rodzic, uuid),
		 * a `usun_nadmiar()` kasował potem jego lekcje jako nadmiar. Tak
		 * zniknęło 18 lekcji Kursu 2 z kopii w Tutorze, bez jednego objawu
		 * — kontrola `sprawdz-tutora` widziała je dopiero po fakcie.
		 *
		 * Wejście z pustym identyfikatorem jest błędem SAMO W SOBIE (patrz
		 * `Aai_Sklep_Zapis`, gdzie nowy wiersz dostaje uuid), ale ta warstwa
		 * ma go PRZEŻYĆ bez kasowania cudzych danych.
		 */
		if ( '' === trim( $uuid ) ) {
			return 0;
		}
		$znalezione = get_posts(
			array(
				'post_type'   => $typ,
				'post_status' => 'any',
				'numberposts' => 1,
				'fields'      => 'ids',
				'meta_key'    => self::META_UUID, // phpcs:ignore WordPress.DB.SlowDBQuery
				'meta_value'  => $uuid, // phpcs:ignore WordPress.DB.SlowDBQuery
			)
		);
		return $znalezione ? (int) $znalezione[0] : 0;
	}

	/**
	 * Ilu ludzi ma dostęp do tego kursu — pytamy TUTORA.
	 *
	 * DLACZEGO NIE LICZYMY SAMI. To Tutor prowadzi zapisy i to on decyduje
	 * o dostępie; własny licznik byłby DRUGĄ KOPIĄ tej samej prawdy i przy
	 * pierwszej rozbieżności kłamałby w najgorszym możliwym momencie —
	 * przy pytaniu „czy na pewno skasować kurs".
	 *
	 * Liczymy zapisy o statusie `completed`, czyli te, które naprawdę dają
	 * dostęp: `pending` to ktoś, kto zaczął zakup i nie zapłacił (przy kursie
	 * płatnym `do_enroll()` zakłada właśnie taki), a zwrot przestawia zapis
	 * na status zamówienia. To ta sama miara, którą Tutor pokazuje w swoim
	 * panelu.
	 *
	 * Brak Tutora znaczy ZERO, i to nie jest wygodne zaokrąglenie: bez LMS-a
	 * nikt nie ma się gdzie zalogować po materiał, więc nikt dostępu nie
	 * traci.
	 *
	 * @param string $uuid Identyfikator kursu z naszych tabel.
	 */
	public static function kupujacy( string $uuid ): int {
		if ( '' === trim( $uuid ) || ! self::dostepny() || ! function_exists( 'tutor_utils' ) ) {
			return 0;
		}
		$id = self::znajdz_po_uuid( $uuid, self::typy()['kurs'] );
		if ( $id <= 0 ) {
			return 0;
		}
		return (int) tutor_utils()->count_enrolled_users_by_course( $id );
	}

	/**
	 * Adres lekcji-ZAPOWIEDZI, albo `null`.
	 *
	 * SKĄD TA FUNKCJA (P5). Program na stronie sprzedażowej oznacza lekcje
	 * z `preview` etykietą „podgląd", ale do 0.52.0 nie prowadził do nich
	 * ŻADEN odnośnik — zmierzone: zero linków do lekcji w całym HTML strony
	 * kursu. Klient czytał więc, że coś jest otwarte, i nie miał jak tam
	 * wejść; adres zna tylko Tutor. Skoro FAQ obiecuje teraz, że można
	 * zajrzeć przed zakupem, obietnica musi mieć drogę.
	 *
	 * Zwraca `null`, gdy Tutora nie ma albo kopii lekcji jeszcze nie ma —
	 * wtedy szablon zostawia samą etykietę, tak jak dotąd.
	 *
	 * @param string $uuid Identyfikator lekcji z naszych tabel.
	 */
	public static function adres_lekcji( string $uuid ): ?string {
		if ( '' === $uuid || ! self::dostepny() ) {
			return null;
		}
		$id = self::znajdz_po_uuid( $uuid, self::typy()['lekcja'] );
		if ( $id <= 0 || 'publish' !== get_post_status( $id ) ) {
			return null;
		}
		$adres = get_permalink( $id );
		return is_string( $adres ) && '' !== $adres ? $adres : null;
	}

	/**
	 * Wszystkie wpisy Tutora naszych trzech typów.
	 *
	 * @return array<int,WP_Post>
	 */
	private static function wpisy_tutora(): array {
		$typy = self::typy();
		return (array) get_posts(
			array(
				'post_type'   => array( $typy['kurs'], $typy['modul'], $typy['lekcja'] ),
				'post_status' => 'any',
				'numberposts' => -1,
			)
		);
	}

	/**
	 * Sekcja → LINIE, bo tak Tutor trzyma swoje cztery pola.
	 *
	 * Tutor drukuje `_tutor_course_benefits` i sąsiadów WPROST na stronie
	 * kursu, dzieląc wartość po znakach nowej linii. Wrzucony tam JSON nie
	 * wywołuje błędu — po prostu wyświetla się jako `{"punkty":[{"opis":…`
	 * człowiekowi (zgłoszone zrzutem 2026-08-25, poprawka 0.39.1).
	 *
	 * Pełna STRUKTURA nie ginie: leci obok, do `_aai_sekcje`.
	 *
	 * @param string             $rodzaj Nasz rodzaj sekcji.
	 * @param array<string,mixed> $tresc  Treść sekcji.
	 *
	 * @throws Aai_Sklep_Blad_Zapisu Gdy kształt sekcji przestał pasować do spłaszczenia.
	 */
	private static function linie_tutora( string $rodzaj, array $tresc ): string {
		$linie = array();

		switch ( $rodzaj ) {
			case 'benefits':
			case 'package':
				foreach ( (array) ( $tresc['punkty'] ?? array() ) as $punkt ) {
					$tytul = trim( (string) ( $punkt['tytul'] ?? '' ) );
					$opis  = trim( (string) ( $punkt['opis'] ?? '' ) );
					$linie[] = ( '' !== $tytul && '' !== $opis ) ? "$tytul — $opis" : $tytul . $opis;
				}
				// „co w cenie" to też pozycje pakietu, tyle że bez tytułów.
				foreach ( (array) ( $tresc['w_cenie'] ?? array() ) as $pozycja ) {
					$linie[] = (string) $pozycja;
				}
				break;

			case 'for_whom':
				foreach ( (array) ( $tresc['punkty'] ?? array() ) as $punkt ) {
					$linie[] = (string) $punkt;
				}
				// `nie_dla` NIE wchodzi: to lista „to nie jest dla Ciebie, jeśli…",
				// a pole Tutora nazywa się „dla kogo jest ten kurs". Wklejona tam
				// zmieniłaby znaczenie na przeciwne.
				break;

			case 'problem':
				foreach ( array( 'wstep', 'problem', 'rozwiazanie', 'rezultat' ) as $pole ) {
					$linie[] = (string) ( $tresc[ $pole ] ?? '' );
				}
				break;
		}

		$linie  = array_values( array_filter( array_map( 'trim', $linie ), static fn( $l ) => '' !== $l ) );
		$wynik  = implode( "\n", $linie );

		/*
		 * Asercja, nie ozdoba: gdyby kształt sekcji się zmienił i spłaszczenie
		 * przestało go obejmować, chcemy STANĄĆ, a nie wydrukować JSON na
		 * stronie kursu. To ta sama klasa błędu, którą 0.39.1 właśnie naprawiła.
		 */
		if ( '' === $wynik || false !== strpos( $wynik, '{"' ) || false !== strpos( $wynik, '[{' ) ) {
			throw new Aai_Sklep_Blad_Zapisu(
				sprintf(
					'sekcja %s nie dała się spłaszczyć do linii Tutora — kształt się zmienił, popraw linie_tutora(). Wynik: %s',
					$rodzaj,
					mb_substr( $wynik, 0, 120 )
				)
			);
		}
		return $wynik;
	}

	/**
	 * Wartość meta: struktury zapisujemy JSON-em, teksty tekstem.
	 *
	 * @param mixed $wartosc Cokolwiek.
	 */
	private static function json( $wartosc ): string {
		if ( is_string( $wartosc ) ) {
			return $wartosc;
		}
		return (string) wp_json_encode( $wartosc, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES );
	}

	/**
	 * Zapamiętuje nieudaną synchronizację.
	 *
	 * Właściciel ma zobaczyć, że kopia nie nadążyła — cisza po nieudanej
	 * kopii to dokładnie ten cichy rozjazd, przed którym cała ta klasa ma
	 * bronić.
	 *
	 * @param string $id        Kurs.
	 * @param string $komunikat Treść błędu.
	 */
	private static function zapamietaj_blad( string $id, string $komunikat ): void {
		update_option(
			self::OPCJA_BLEDU,
			array(
				'kurs'      => $id,
				'komunikat' => $komunikat,
				'kiedy'     => gmdate( 'Y-m-d H:i:s' ),
			),
			false
		);
	}
}
