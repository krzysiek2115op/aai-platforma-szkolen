<?php
/**
 * Kontrakt zapisu — to, czego krok W2 świadomie nie zrobił.
 *
 * PO CO DOPIERO TERAZ. Do W3 jedynym klientem warstwy zapisu był import
 * WŁASNEGO eksportu: dane szły z naszej bazy, przez nasz skrypt, do naszych
 * tabel. Od kroku W4 klientem jest FORMULARZ Z SIECI — a to zupełnie inna
 * klasa wejścia. Warstwa zapisu mówi to wprost w swoim nagłówku:
 * „Kontraktu pól — ten przychodzi z kreatorem w kroku W4".
 *
 * PORT `KursWejscie`, `TrescLekcji` i `MaterialLekcji` z
 * `modules/m1-sklep/typy.ts`, CO DO LICZBY. Nie „coś podobnego": po obu
 * stronach migracji ma obowiązywać jeden kontrakt, inaczej ten sam kurs
 * wygląda inaczej w prototypie i na WordPressie, a nikt nie wie który ma
 * rację.
 *
 * TRZY BLOKADY, KTÓRE MAJĄ WŁASNĄ HISTORIĘ:
 *
 *  * powtórzony `id` modułu albo lekcji w jednym zapisie — znalezisko
 *    przeglądu B7: drugi wpis kasował lekcje zachowane przez pierwszy,
 *    transakcja się commitowała, a odpowiedź brzmiała „ok";
 *  * powtórzony RODZAJ sekcji — `UNIQUE (course_id, kind)` odrzuciłby to
 *    komunikatem o slugu, czyli o czymś zupełnie innym niż pomyłka;
 *  * powtórzona POZYCJA w jednym rodzicu — `UNIQUE (course_id, position)`
 *    wywaliłby zapis w środku transakcji, a właściciel zobaczyłby błąd
 *    bazy zamiast wskazania modułu.
 *
 * POZYCJI NIE PRZENUMEROWUJEMY. Kurs 2 ma w bazie dziury w `position`
 * (decyzja właściciela 2026-08-23: „dziury zostają"), a strona i tak numeruje
 * moduły kolejnością wyświetlania. Panel przysyła pozycje takie, jakie
 * wczytał, i zmienia je wyłącznie tam, gdzie właściciel nacisnął strzałkę —
 * dzięki temu zapis nie rusza wierszy, których nikt nie tknął, i nie zaśmieca
 * dziennika audytu.
 *
 * @package Aai_Sklep
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Sprawdzanie wejścia z kreatora.
 */
final class Aai_Sklep_Kontrakt {

	public const LIMIT_SLUGU        = 120;
	public const LIMIT_TYTULU       = 200;
	public const LIMIT_OPISU        = 500;
	public const LIMIT_ADRESU       = 500;
	public const LIMIT_PLAKIETKI    = 40;
	public const LIMIT_PODSUMOWANIA = 2000;
	public const LIMIT_SEKCJI       = 50;
	public const LIMIT_MODULOW      = 50;
	public const LIMIT_LEKCJI       = 200;
	public const LIMIT_POZYCJI      = 999;
	public const LIMIT_CZASU_MIN    = 1440;
	public const LIMIT_TRESCI       = 120000;
	public const LIMIT_MATERIALOW   = 12;

	/**
	 * 100 000 zł w groszach. Kolumna to `int`, więc bez sufitu wartość
	 * spoza zakresu wylądowałaby w bazie UCIĘTA — cicha zmiana ceny.
	 */
	public const SUFIT_CENY = 10000000;

	/**
	 * Typy produktu — kolumna `courses.type`.
	 *
	 * ŚWIADOME ODSTĘPSTWO OD PROTOTYPU: tam enum ma jeszcze `ebook`.
	 * Właściciel zamknął ten temat 2026-08-25 słowem „na zawsze" —
	 * produktem jest wyłącznie kurs tekstowy za logowaniem. Panel, który
	 * dawałby ebooka do wyboru, byłby zaproszeniem do złamania tej decyzji
	 * jednym kliknięciem. Oba kursy w bazie mają `kurs` (sprawdzone), więc
	 * nic się przez to nie staje nieedytowalne.
	 */
	public const TYPY = array( 'kurs' => 'Kurs' );

	/** Stany kursu — kolumna `courses.status`. */
	public const STANY = array(
		'draft'     => 'Szkic',
		'published' => 'Opublikowany',
		'archived'  => 'Ukryty',
	);

	/** Poziom trudności — kolumna `courses.level` (migracja 004 prototypu). */
	public const POZIOMY = array(
		'podstawowy'          => 'Podstawowy',
		'sredniozaawansowany' => 'Średniozaawansowany',
		'zaawansowany'        => 'Zaawansowany',
	);

	/**
	 * Opis pól TREŚCI LEKCJI — dla panelu i dla kontraktu naraz.
	 *
	 * Ten sam mechanizm co przy sekcjach: kształt i etykiety w jednej
	 * tablicy, żeby nie dało się dopisać pola do kontraktu bez miejsca
	 * w panelu (ani odwrotnie).
	 *
	 * CZEGO TU NIE MA i nie będzie bez nowej decyzji właściciela: pól
	 * nagrania wideo (hosting, długość filmu, napisy). Kurs jest tekstowy —
	 * decyzja z 2026-08-19.
	 *
	 * @return array<string,array<string,mixed>>
	 */
	public static function pola_lekcji(): array {
		return array(
			'tresc'     => array(
				'typ'         => 'akapit',
				'wymagane'    => true,
				'pusty_ok'    => true,
				'limit'       => self::LIMIT_TRESCI,
				'etykieta'    => 'Treść lekcji (Markdown)',
				'wiersze'     => 24,
				'placeholder' => "## Co zrobimy w tej lekcji\n\nProza, bloki terminala, prompty do skopiowania.",
				'pomoc'       => 'Markdown — dokładnie ten sam format co scenariusze w tresc-kursow/. Pusto = lekcja jeszcze bez materiału (liczniki pokazują ją jako pustą).',
			),
			'materialy' => array(
				'typ'            => 'lista_obiektow',
				'pusty_ok'       => true,
				'maks'           => self::LIMIT_MATERIALOW,
				'etykieta'       => 'Materiały dodatkowe',
				'nazwa_elementu' => 'materiał',
				'pomoc'          => 'Dodatki do lekcji: ściągawka, plik, odsyłacz do dokumentacji.',
				'pola'           => array(
					'rodzaj' => array(
						'typ'      => 'wybor',
						'wymagane' => true,
						'etykieta' => 'Rodzaj',
						'opcje'    => array(
							'pdf'  => 'PDF',
							'plik' => 'Plik do pobrania',
							'link' => 'Odsyłacz',
						),
					),
					'tytul'  => array(
						'typ'         => 'krotki',
						'wymagane'    => true,
						'limit'       => 160,
						'etykieta'    => 'Tytuł',
						'placeholder' => 'Ściągawka: komendy z tej lekcji',
					),
					'url'    => array(
						'typ'         => 'adres_lub_sciezka',
						'wymagane'    => true,
						'limit'       => self::LIMIT_ADRESU,
						'etykieta'    => 'Adres',
						'placeholder' => '/dodatki/sciagawka.pdf',
						'pomoc'       => 'Ścieżka w tej instalacji albo pełny adres — jak okładka kursu.',
					),
					'opis'   => array(
						'typ'      => 'krotki',
						'limit'    => 400,
						'etykieta' => 'Opis',
					),
				),
			),
		);
	}

	/* ————————————————————————— CENA ————————————————————————— */

	/**
	 * Tekst z pola ceny → grosze. `null` = to nie jest liczba.
	 *
	 * OSOBNO, BO NA TYM DA SIĘ STRACIĆ PIENIĄDZE. W prototypie pierwsza
	 * wersja pola liczyła cenę w trakcie pisania i po cichu zapisywała
	 * 0 zł (BLAD-005). Zaokrąglamy jawnie, bo `(int) ( 199.90 * 100 )`
	 * to w arytmetyce zmiennoprzecinkowej 19989.
	 *
	 * Przecinek i kropka są równoważne — właściciel pisze po polsku.
	 *
	 * @param string $tekst Wartość z pola.
	 */
	public static function grosze_z_tekstu( string $tekst ): ?int {
		$oczyszczony = str_replace( ',', '.', trim( $tekst ) );
		if ( '' === $oczyszczony || ! preg_match( '/^\d+(\.\d{1,2})?$/', $oczyszczony ) ) {
			return null;
		}
		return (int) round( ( (float) $oczyszczony ) * 100 );
	}

	/**
	 * Grosze → tekst do pola („19990" → „199,90", „29900" → „299").
	 *
	 * @param int $grosze Cena w groszach.
	 */
	public static function zlote_do_pola( int $grosze ): string {
		$tekst = number_format( $grosze / 100, 2, ',', '' );
		return str_ends_with( $tekst, ',00' ) ? substr( $tekst, 0, -3 ) : $tekst;
	}

	/* ————————————————————————— KURS ————————————————————————— */

	/**
	 * Sprawdza wejście z formularza kursu.
	 *
	 * Wynik `dane` ma kształt, którego oczekuje `Aai_Sklep_Zapis::zapisz_kurs()`
	 * (format 2 eksportu). Lekcje jadą BEZ pól `content` i `materials` — i to
	 * jest cała różnica między zapisem programu a zapisem materiału: warstwa
	 * zapisu zostawia wtedy napisaną treść nietkniętą.
	 *
	 * @param array<string,mixed> $wejscie Dane z formularza.
	 * @return array{dane:array<string,mixed>|null,bledy:array<string,string>}
	 */
	public static function kurs( array $wejscie ): array {
		$bledy = array();

		$id = self::identyfikator( $wejscie['id'] ?? null, 'id', $bledy );

		$dane = array(
			'id'           => $id,
			'slug'         => self::slug( $wejscie['slug'] ?? '', $bledy ),
			'title'        => self::tekst_wymagany( $wejscie['title'] ?? '', self::LIMIT_TYTULU, 'title', 'Tytuł', $bledy ),
			'type'         => self::z_listy( $wejscie['type'] ?? 'kurs', self::TYPY, 'type', 'Typ', $bledy ),
			'status'       => self::z_listy( $wejscie['status'] ?? 'draft', self::STANY, 'status', 'Stan', $bledy ),
			'short_desc'   => self::tekst_opcjonalny( $wejscie['short_desc'] ?? null, self::LIMIT_OPISU, 'short_desc', 'Krótki opis', $bledy ),
			'price_grosze' => self::cena( $wejscie['price_grosze'] ?? 0, $bledy ),
			'cover_url'    => self::adres_opcjonalny( $wejscie['cover_url'] ?? null, 'cover_url', 'Okładka', $bledy ),
			'badge'        => self::tekst_opcjonalny( $wejscie['badge'] ?? null, self::LIMIT_PLAKIETKI, 'badge', 'Plakietka', $bledy ),
			'level'        => self::poziom( $wejscie['level'] ?? null, $bledy ),
		);

		// Tablice sekcji i modułów podane = PEŁNA podmiana. Brak klucza znaczy
		// „nie ruszaj" — warstwa zapisu rozumie to tak samo.
		if ( array_key_exists( 'sekcje', $wejscie ) ) {
			$dane['sekcje'] = self::sekcje( $wejscie['sekcje'], $bledy );
		}
		if ( array_key_exists( 'moduly', $wejscie ) ) {
			$dane['moduly'] = self::moduly( $wejscie['moduly'], $bledy );
		}

		return array(
			'dane'  => array() === $bledy ? $dane : null,
			'bledy' => $bledy,
		);
	}

	/**
	 * Sekcje sprzedażowe.
	 *
	 * @param mixed                $wejscie Lista sekcji z formularza.
	 * @param array<string,string> $bledy   Zebrane błędy (przez referencję).
	 * @return array<int,array<string,mixed>>
	 */
	private static function sekcje( $wejscie, array &$bledy ): array {
		if ( ! is_array( $wejscie ) ) {
			$bledy['sekcje'] = __( 'Sekcje mają zły kształt.', 'aai-sklep' );
			return array();
		}
		if ( count( $wejscie ) > self::LIMIT_SEKCJI ) {
			$bledy['sekcje'] = sprintf(
				/* translators: %d: dozwolona liczba sekcji. */
				__( 'Najwyżej %d sekcji na kurs.', 'aai-sklep' ),
				self::LIMIT_SEKCJI
			);
			return array();
		}

		$wynik    = array();
		$widziane = array();

		foreach ( array_values( $wejscie ) as $i => $sekcja ) {
			$gdzie  = 'sekcje[' . $i . ']';
			$sekcja = (array) $sekcja;
			$rodzaj = isset( $sekcja['kind'] ) ? (string) $sekcja['kind'] : '';

			if ( ! in_array( $rodzaj, Aai_Sklep_Sekcje::rodzaje(), true ) ) {
				$bledy[ $gdzie . '.kind' ] = sprintf(
					/* translators: %s: nazwa rodzaju sekcji. */
					__( 'Nieznany rodzaj sekcji: %s', 'aai-sklep' ),
					$rodzaj
				);
				continue;
			}
			if ( isset( $widziane[ $rodzaj ] ) ) {
				$bledy[ $gdzie . '.kind' ] = sprintf(
					/* translators: %s: nazwa rodzaju sekcji. */
					__( 'Sekcja „%s" podana dwa razy — strona pokazuje po jednej sekcji każdego rodzaju, więc druga i tak by przepadła.', 'aai-sklep' ),
					$rodzaj
				);
				continue;
			}
			$widziane[ $rodzaj ] = true;

			$wynik[] = array(
				'id'      => self::identyfikator( $sekcja['id'] ?? null, $gdzie . '.id', $bledy ),
				'kind'    => $rodzaj,
				'content' => Aai_Sklep_Sekcje::sprawdz_scisle(
					$rodzaj,
					$sekcja['content'] ?? array(),
					$gdzie . '.content',
					$bledy
				),
			);
		}

		return $wynik;
	}

	/**
	 * Program: moduły z lekcjami.
	 *
	 * @param mixed                $wejscie Lista modułów z formularza.
	 * @param array<string,string> $bledy   Zebrane błędy (przez referencję).
	 * @return array<int,array<string,mixed>>
	 */
	private static function moduly( $wejscie, array &$bledy ): array {
		if ( ! is_array( $wejscie ) ) {
			$bledy['moduly'] = __( 'Program ma zły kształt.', 'aai-sklep' );
			return array();
		}
		if ( count( $wejscie ) > self::LIMIT_MODULOW ) {
			$bledy['moduly'] = sprintf(
				/* translators: %d: dozwolona liczba modułów. */
				__( 'Najwyżej %d modułów w kursie.', 'aai-sklep' ),
				self::LIMIT_MODULOW
			);
			return array();
		}

		$wynik            = array();
		$pozycje_modulow  = array();
		$widziane_moduly  = array();
		$widziane_lekcje  = array();

		foreach ( array_values( $wejscie ) as $i => $modul ) {
			$gdzie = 'moduly[' . $i . ']';
			$modul = (array) $modul;

			$id_modulu = self::identyfikator( $modul['id'] ?? null, $gdzie . '.id', $bledy );
			self::bez_powtorzen( $id_modulu, $widziane_moduly, $gdzie . '.id', __( 'moduł', 'aai-sklep' ), $bledy );

			$pozycja = self::pozycja( $modul['position'] ?? 0, $gdzie . '.position', $bledy );
			self::bez_powtorzen( (string) $pozycja, $pozycje_modulow, $gdzie . '.position', __( 'pozycja modułu', 'aai-sklep' ), $bledy );

			$lekcje          = array();
			$pozycje_lekcji  = array();
			$wejscie_lekcji  = $modul['lekcje'] ?? array();

			if ( ! is_array( $wejscie_lekcji ) ) {
				$bledy[ $gdzie . '.lekcje' ] = __( 'Lekcje mają zły kształt.', 'aai-sklep' );
				$wejscie_lekcji              = array();
			} elseif ( count( $wejscie_lekcji ) > self::LIMIT_LEKCJI ) {
				$bledy[ $gdzie . '.lekcje' ] = sprintf(
					/* translators: %d: dozwolona liczba lekcji. */
					__( 'Najwyżej %d lekcji w module.', 'aai-sklep' ),
					self::LIMIT_LEKCJI
				);
				$wejscie_lekcji = array();
			}

			foreach ( array_values( $wejscie_lekcji ) as $j => $lekcja ) {
				$gdzie_lekcji = $gdzie . '.lekcje[' . $j . ']';
				$lekcja       = (array) $lekcja;

				$id_lekcji = self::identyfikator( $lekcja['id'] ?? null, $gdzie_lekcji . '.id', $bledy );
				self::bez_powtorzen( $id_lekcji, $widziane_lekcje, $gdzie_lekcji . '.id', __( 'lekcja', 'aai-sklep' ), $bledy );

				$pozycja_lekcji = self::pozycja( $lekcja['position'] ?? 0, $gdzie_lekcji . '.position', $bledy );
				self::bez_powtorzen( (string) $pozycja_lekcji, $pozycje_lekcji, $gdzie_lekcji . '.position', __( 'pozycja lekcji', 'aai-sklep' ), $bledy );

				/*
				 * BEZ `content` I `materials` — to nie jest przeoczenie.
				 *
				 * Zapis programu ma prawo zmienić spis treści, ale nie ma prawa
				 * tknąć napisanego materiału. Warstwa zapisu rozpoznaje BRAK
				 * tych kluczy i zostawia kolumny w spokoju; gdyby panel wysyłał
				 * je puste, jeden zapis programu wyczyściłby prozę całego kursu.
				 */
				$lekcje[] = array(
					'id'           => $id_lekcji,
					'position'     => $pozycja_lekcji,
					'title'        => self::tekst_wymagany( $lekcja['title'] ?? '', self::LIMIT_TYTULU, $gdzie_lekcji . '.title', 'Tytuł lekcji', $bledy ),
					'duration_min' => self::czas( $lekcja['duration_min'] ?? null, $gdzie_lekcji . '.duration_min', $bledy ),
					'preview'      => ! empty( $lekcja['preview'] ),
				);
			}

			$wynik[] = array(
				'id'       => $id_modulu,
				'position' => $pozycja,
				'title'    => self::tekst_wymagany( $modul['title'] ?? '', self::LIMIT_TYTULU, $gdzie . '.title', 'Tytuł modułu', $bledy ),
				'summary'  => self::tekst_opcjonalny( $modul['summary'] ?? null, self::LIMIT_PODSUMOWANIA, $gdzie . '.summary', 'Opis modułu', $bledy ),
				'lekcje'   => $lekcje,
			);
		}

		return $wynik;
	}

	/* ———————————————————— TREŚĆ LEKCJI ———————————————————— */

	/**
	 * Sprawdza wejście z edytora lekcji.
	 *
	 * @param array<string,mixed> $wejscie Dane z formularza.
	 * @return array{dane:array<string,mixed>|null,bledy:array<string,string>}
	 */
	public static function tresc_lekcji( array $wejscie ): array {
		$bledy = array();
		$dane  = Aai_Sklep_Pola::scisle( self::pola_lekcji(), $wejscie, '', $bledy );

		return array(
			'dane'  => array() === $bledy ? $dane : null,
			'bledy' => $bledy,
		);
	}

	/* ———————————————————— POJEDYNCZE POLA ———————————————————— */

	/**
	 * Identyfikator wiersza. Brak = nowy wiersz, więc nadajemy uuid.
	 *
	 * DLACZEGO TU, A NIE W WARSTWIE ZAPISU. Bo warstwa zapisu porównuje stan
	 * przed i po po KLUCZU: wiersz bez `id` nie miałby jak trafić na swój
	 * odpowiednik w bazie i za każdym zapisem powstawałby na nowo. To ta sama
	 * decyzja co w prototypie („brak id = nowy wiersz").
	 *
	 * @param mixed                $wartosc Identyfikator albo nic.
	 * @param string               $gdzie   Ścieżka błędu.
	 * @param array<string,string> $bledy   Zebrane błędy (przez referencję).
	 */
	private static function identyfikator( $wartosc, string $gdzie, array &$bledy ): string {
		if ( null === $wartosc || '' === $wartosc ) {
			return wp_generate_uuid4();
		}
		$id = is_string( $wartosc ) ? trim( $wartosc ) : '';
		if ( ! wp_is_uuid( $id, 4 ) ) {
			$bledy[ $gdzie ] = __( 'Identyfikator nie jest poprawnym UUID.', 'aai-sklep' );
			return wp_generate_uuid4();
		}
		return $id;
	}

	/**
	 * Pilnuje, żeby ten sam klucz nie przyszedł dwa razy w jednym zapisie.
	 *
	 * @param string               $wartosc  Klucz.
	 * @param array<string,bool>   $widziane Klucze już widziane (przez referencję).
	 * @param string               $gdzie    Ścieżka błędu.
	 * @param string               $co       Nazwa rzeczy (do komunikatu).
	 * @param array<string,string> $bledy    Zebrane błędy (przez referencję).
	 */
	private static function bez_powtorzen( string $wartosc, array &$widziane, string $gdzie, string $co, array &$bledy ): void {
		if ( isset( $widziane[ $wartosc ] ) ) {
			$bledy[ $gdzie ] = sprintf(
				/* translators: %s: nazwa powtórzonej rzeczy (moduł, lekcja, pozycja). */
				__( 'Ten sam %s podany dwa razy w jednym zapisie — drugi wpis skasowałby to, co zachował pierwszy.', 'aai-sklep' ),
				$co
			);
		}
		$widziane[ $wartosc ] = true;
	}

	/**
	 * Adres strony kursu.
	 *
	 * @param mixed                $wartosc Slug z formularza.
	 * @param array<string,string> $bledy   Zebrane błędy (przez referencję).
	 */
	private static function slug( $wartosc, array &$bledy ): string {
		$slug = is_string( $wartosc ) ? trim( $wartosc ) : '';
		if ( '' === $slug ) {
			$bledy['slug'] = __( 'Adres (slug) jest obowiązkowy.', 'aai-sklep' );
			return '';
		}
		if ( mb_strlen( $slug, 'UTF-8' ) > self::LIMIT_SLUGU ) {
			$bledy['slug'] = sprintf(
				/* translators: %d: dozwolona długość. */
				__( 'Adres (slug): najwyżej %d znaków.', 'aai-sklep' ),
				self::LIMIT_SLUGU
			);
			return '';
		}
		if ( ! preg_match( '/^[a-z0-9-]+$/', $slug ) ) {
			$bledy['slug'] = __( 'Adres (slug): tylko małe litery, cyfry i myślniki.', 'aai-sklep' );
			return '';
		}
		return $slug;
	}

	/**
	 * Tekst obowiązkowy.
	 *
	 * @param mixed                $wartosc  Wartość z formularza.
	 * @param int                  $limit    Limit znaków.
	 * @param string               $gdzie    Ścieżka błędu.
	 * @param string               $etykieta Nazwa pola po polsku.
	 * @param array<string,string> $bledy    Zebrane błędy (przez referencję).
	 */
	private static function tekst_wymagany( $wartosc, int $limit, string $gdzie, string $etykieta, array &$bledy ): string {
		$tekst = is_scalar( $wartosc ) ? trim( (string) $wartosc ) : '';
		if ( '' === $tekst ) {
			$bledy[ $gdzie ] = sprintf(
				/* translators: %s: nazwa pola po polsku. */
				__( '„%s" jest obowiązkowe.', 'aai-sklep' ),
				$etykieta
			);
			return '';
		}
		if ( mb_strlen( $tekst, 'UTF-8' ) > $limit ) {
			$bledy[ $gdzie ] = sprintf(
				/* translators: 1: nazwa pola, 2: limit znaków, 3: obecna długość. */
				__( '„%1$s": najwyżej %2$d znaków (jest %3$d).', 'aai-sklep' ),
				$etykieta,
				$limit,
				mb_strlen( $tekst, 'UTF-8' )
			);
			return '';
		}
		return $tekst;
	}

	/**
	 * Tekst opcjonalny — pusty wchodzi do bazy jako NULL.
	 *
	 * @param mixed                $wartosc  Wartość z formularza.
	 * @param int                  $limit    Limit znaków.
	 * @param string               $gdzie    Ścieżka błędu.
	 * @param string               $etykieta Nazwa pola po polsku.
	 * @param array<string,string> $bledy    Zebrane błędy (przez referencję).
	 */
	private static function tekst_opcjonalny( $wartosc, int $limit, string $gdzie, string $etykieta, array &$bledy ): ?string {
		$tekst = is_scalar( $wartosc ) ? trim( (string) $wartosc ) : '';
		if ( '' === $tekst ) {
			return null;
		}
		if ( mb_strlen( $tekst, 'UTF-8' ) > $limit ) {
			$bledy[ $gdzie ] = sprintf(
				/* translators: 1: nazwa pola, 2: limit znaków, 3: obecna długość. */
				__( '„%1$s": najwyżej %2$d znaków (jest %3$d).', 'aai-sklep' ),
				$etykieta,
				$limit,
				mb_strlen( $tekst, 'UTF-8' )
			);
			return null;
		}
		return $tekst;
	}

	/**
	 * Adres okładki — ścieżka w tej instalacji albo pełny adres.
	 *
	 * @param mixed                $wartosc  Wartość z formularza.
	 * @param string               $gdzie    Ścieżka błędu.
	 * @param string               $etykieta Nazwa pola po polsku.
	 * @param array<string,string> $bledy    Zebrane błędy (przez referencję).
	 */
	private static function adres_opcjonalny( $wartosc, string $gdzie, string $etykieta, array &$bledy ): ?string {
		$adres = self::tekst_opcjonalny( $wartosc, self::LIMIT_ADRESU, $gdzie, $etykieta, $bledy );
		if ( null === $adres ) {
			return null;
		}
		// Sprawdzenie takie samo jak przy polach treści — patrz BLAD-017
		// w `Aai_Sklep_Pola::adres_bezpieczny()`: pytamy, czy adres wolno
		// WYDRUKOWAĆ, a nie czy wolno pod niego wysłać żądanie.
		$wewnetrzna = str_starts_with( $adres, '/' ) && ! str_starts_with( $adres, '//' );
		$czesci     = wp_parse_url( $adres );
		$sieciowy   = is_array( $czesci )
			&& ! empty( $czesci['host'] )
			&& in_array( strtolower( (string) ( $czesci['scheme'] ?? '' ) ), array( 'http', 'https' ), true )
			&& ! isset( $czesci['user'] )
			&& ! isset( $czesci['pass'] );
		if ( ! $wewnetrzna && ! $sieciowy ) {
			$bledy[ $gdzie ] = sprintf(
				/* translators: %s: nazwa pola po polsku. */
				__( '„%s": podaj ścieżkę od „/" albo pełny adres http/https.', 'aai-sklep' ),
				$etykieta
			);
			return null;
		}
		return $adres;
	}

	/**
	 * Wartość z listy zamkniętej.
	 *
	 * @param mixed                $wartosc  Wartość z formularza.
	 * @param array<string,string> $lista    Dozwolone wartości.
	 * @param string               $gdzie    Ścieżka błędu.
	 * @param string               $etykieta Nazwa pola po polsku.
	 * @param array<string,string> $bledy    Zebrane błędy (przez referencję).
	 */
	private static function z_listy( $wartosc, array $lista, string $gdzie, string $etykieta, array &$bledy ): string {
		$tekst = is_scalar( $wartosc ) ? (string) $wartosc : '';
		if ( ! isset( $lista[ $tekst ] ) ) {
			$bledy[ $gdzie ] = sprintf(
				/* translators: 1: nazwa pola, 2: dozwolone wartości. */
				__( '„%1$s": dozwolone wartości to %2$s.', 'aai-sklep' ),
				$etykieta,
				implode( ', ', array_keys( $lista ) )
			);
			return (string) array_key_first( $lista );
		}
		return $tekst;
	}

	/**
	 * Poziom trudności — opcjonalny.
	 *
	 * @param mixed                $wartosc Wartość z formularza.
	 * @param array<string,string> $bledy   Zebrane błędy (przez referencję).
	 */
	private static function poziom( $wartosc, array &$bledy ): ?string {
		$tekst = is_scalar( $wartosc ) ? trim( (string) $wartosc ) : '';
		if ( '' === $tekst ) {
			return null;
		}
		if ( ! isset( self::POZIOMY[ $tekst ] ) ) {
			$bledy['level'] = sprintf(
				/* translators: %s: dozwolone wartości. */
				__( 'Poziom: dozwolone wartości to %s.', 'aai-sklep' ),
				implode( ', ', array_keys( self::POZIOMY ) )
			);
			return null;
		}
		return $tekst;
	}

	/**
	 * Cena w groszach.
	 *
	 * @param mixed                $wartosc Wartość z formularza.
	 * @param array<string,string> $bledy   Zebrane błędy (przez referencję).
	 */
	private static function cena( $wartosc, array &$bledy ): int {
		if ( ! is_numeric( $wartosc ) ) {
			$bledy['price_grosze'] = __( 'Cena: oczekiwano liczby.', 'aai-sklep' );
			return 0;
		}
		$grosze = (int) $wartosc;
		if ( $grosze < 0 || $grosze > self::SUFIT_CENY ) {
			$bledy['price_grosze'] = sprintf(
				/* translators: %s: najwyższa dozwolona cena w złotówkach. */
				__( 'Cena: od 0 do %s zł.', 'aai-sklep' ),
				number_format_i18n( self::SUFIT_CENY / 100 )
			);
			return 0;
		}
		return $grosze;
	}

	/**
	 * Pozycja modułu albo lekcji.
	 *
	 * @param mixed                $wartosc Wartość z formularza.
	 * @param string               $gdzie   Ścieżka błędu.
	 * @param array<string,string> $bledy   Zebrane błędy (przez referencję).
	 */
	private static function pozycja( $wartosc, string $gdzie, array &$bledy ): int {
		if ( ! is_numeric( $wartosc ) ) {
			$bledy[ $gdzie ] = __( 'Pozycja: oczekiwano liczby.', 'aai-sklep' );
			return 0;
		}
		$pozycja = (int) $wartosc;
		if ( $pozycja < 0 || $pozycja > self::LIMIT_POZYCJI ) {
			$bledy[ $gdzie ] = sprintf(
				/* translators: %d: najwyższa dozwolona pozycja. */
				__( 'Pozycja: od 0 do %d.', 'aai-sklep' ),
				self::LIMIT_POZYCJI
			);
			return 0;
		}
		return $pozycja;
	}

	/**
	 * Czas przerobienia lekcji w minutach — opcjonalny.
	 *
	 * ZNACZENIE POLA: „ile zajmie przerobienie lekcji", NIE długość filmu
	 * (decyzja właściciela 2026-08-19, kurs jest tekstowy).
	 *
	 * @param mixed                $wartosc Wartość z formularza.
	 * @param string               $gdzie   Ścieżka błędu.
	 * @param array<string,string> $bledy   Zebrane błędy (przez referencję).
	 */
	private static function czas( $wartosc, string $gdzie, array &$bledy ): ?int {
		if ( null === $wartosc || '' === $wartosc ) {
			return null;
		}
		if ( ! is_numeric( $wartosc ) ) {
			$bledy[ $gdzie ] = __( 'Czas: oczekiwano liczby minut.', 'aai-sklep' );
			return null;
		}
		$minuty = (int) $wartosc;
		if ( $minuty < 1 || $minuty > self::LIMIT_CZASU_MIN ) {
			$bledy[ $gdzie ] = sprintf(
				/* translators: %d: najwyższa dozwolona liczba minut. */
				__( 'Czas: od 1 do %d minut.', 'aai-sklep' ),
				self::LIMIT_CZASU_MIN
			);
			return null;
		}
		return $minuty;
	}
}
