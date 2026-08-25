<?php
/**
 * Silnik opisu pól — jedno miejsce, które wie, co znaczy „pole typu akapit".
 *
 * PO CO OSOBNA KLASA. Ten sam opis pola odpowiada w tym projekcie na CZTERY
 * pytania i każde zadaje kto inny:
 *
 *   1. czy treść z bazy da się wyświetlić            → strona sprzedażowa,
 *   2. czy treść z formularza wolno zapisać          → kreator (krok W4),
 *   3. jak narysować kontrolkę i co w niej pokazać   → panel,
 *   4. czego jeszcze w sekcji brakuje                → plakietka stanu sekcji.
 *
 * Dopóki odpowiedzi pisało się osobno, potrafiły się rozjechać — a rozjazd
 * tej klasy nie daje żadnego objawu: treść po prostu nie dochodzi do klienta.
 * Port `components/kreator/tresc-sekcji.ts` z prototypu, gdzie ta logika
 * mieszkała poza komponentami dokładnie z tego powodu.
 *
 * DWIE SUROWOŚCI, ŚWIADOMIE RÓŻNE:
 *
 *   * `poblazliwie()` — odczyt. Zły kształt ZNIKA, zamiast wysadzać stronę:
 *     jedna zepsuta opinia nie ma prawa zabrać klientowi całej oferty.
 *   * `scisle()` — zapis. Zły kształt WRACA jako błąd ze ścieżką do pola,
 *     bo cicho odsiana treść wygląda dla właściciela jak utrata pracy.
 *
 * To ten sam podział, co w prototypie: `safeParse` na odczycie strony,
 * pełna walidacja Zod w dyspozytorze.
 *
 * OPIS POLA (tablica):
 *   typ       — krotki | akapit | adres | wybor | lista_tekstow
 *               | lista_obiektow | obiekt
 *   wymagane  — brak albo zły typ przewraca CAŁĄ sekcję,
 *   limit     — nadpisuje domyślny limit znaków dla typu,
 *   pola      — opis pól wewnętrznych (lista_obiektow, obiekt),
 *   opcje     — lista zamknięta dla typu `wybor`: wartosc => tekst,
 *   etykieta  — nazwa po polsku (panel; bez niej pola nie da się wypełnić),
 *   pomoc     — podpowiedź pod kontrolką,
 *   placeholder, wiersze — wygląd kontrolki.
 *
 * @package Aai_Sklep
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Sprawdzanie, czyszczenie i opis pól treści.
 */
final class Aai_Sklep_Pola {

	/**
	 * LIMITY przepisane z prototypu CO DO LICZBY (`modules/m1-sklep/typy.ts`).
	 *
	 * Nie dlatego, że strona musi się bronić przed własną bazą, tylko
	 * dlatego, że po obu stronach migracji ma obowiązywać JEDEN kontrakt —
	 * inaczej ten sam kurs wygląda inaczej w prototypie i na WordPressie,
	 * a nikt nie wie który ma rację.
	 */

	/** Tytuły, etykiety, nazwy, autorzy. */
	public const LIMIT_KROTKI = 200;

	/** Opisy, bio, odpowiedzi, cytaty. */
	public const LIMIT_AKAPIT = 2000;

	/** Adresy (link autora, materiał lekcji). */
	public const LIMIT_ADRESU = 500;

	/** Pozycji w liście wewnątrz sekcji. */
	public const LIMIT_LISTY = 50;

	/**
	 * Domyślny limit znaków dla typu pola.
	 *
	 * @param array<string,mixed> $opis Opis pola.
	 */
	private static function limit( array $opis ): int {
		if ( isset( $opis['limit'] ) ) {
			return (int) $opis['limit'];
		}
		switch ( $opis['typ'] ) {
			case 'akapit':
				return self::LIMIT_AKAPIT;
			case 'adres':
			case 'adres_lub_sciezka':
				return self::LIMIT_ADRESU;
			default:
				return self::LIMIT_KROTKI;
		}
	}

	/**
	 * Ile pozycji wolno mieć liście.
	 *
	 * @param array<string,mixed> $opis Opis pola.
	 */
	private static function limit_listy( array $opis ): int {
		return isset( $opis['maks'] ) ? (int) $opis['maks'] : self::LIMIT_LISTY;
	}

	/* ————————————————————— ODCZYT (pobłażliwie) ————————————————————— */

	/**
	 * Treść z bazy → treść do wyświetlenia. Zły kształt znika.
	 *
	 * @param array<string,array<string,mixed>> $pola  Opis pól.
	 * @param mixed                             $tresc Treść po `json_decode`.
	 * @return array<string,mixed>|null Null = całość odpada.
	 */
	public static function poblazliwie( array $pola, $tresc ): ?array {
		if ( ! is_array( $tresc ) ) {
			return null;
		}

		$wynik = array();
		foreach ( $pola as $nazwa => $opis ) {
			$wartosc = $tresc[ $nazwa ] ?? null;
			$czyste  = null === $wartosc ? null : self::wartosc( $wartosc, $opis );

			if ( null === $czyste ) {
				// Brak wymaganego pola przewraca sekcję. Pole opcjonalne
				// po prostu nie wchodzi — szablon i tak pyta o jego istnienie.
				if ( ! empty( $opis['wymagane'] ) ) {
					return null;
				}
				continue;
			}
			$wynik[ $nazwa ] = $czyste;
		}
		return $wynik;
	}

	/**
	 * Sprawdza jedną wartość wg opisu pola.
	 *
	 * @param mixed               $wartosc Wartość z bazy.
	 * @param array<string,mixed> $opis    Opis pola.
	 * @return mixed|null Null = wartość nie pasuje do opisu.
	 */
	private static function wartosc( $wartosc, array $opis ) {
		switch ( $opis['typ'] ) {
			case 'krotki':
			case 'akapit':
				return self::tekst( $wartosc, self::limit( $opis ) );

			case 'wybor':
				$tekst = self::tekst( $wartosc, self::limit( $opis ) );
				return null !== $tekst && isset( $opis['opcje'][ $tekst ] ) ? $tekst : null;

			case 'adres':
			case 'adres_lub_sciezka':
				$adres = self::tekst( $wartosc, self::limit( $opis ) );
				return null !== $adres && self::adres_bezpieczny( $adres, 'adres_lub_sciezka' === $opis['typ'] )
					? $adres
					: null;

			case 'lista_tekstow':
				return self::lista(
					$wartosc,
					self::limit_listy( $opis ),
					static fn( $element ) => self::tekst( $element, self::LIMIT_AKAPIT )
				);

			case 'lista_obiektow':
				return self::lista(
					$wartosc,
					self::limit_listy( $opis ),
					static fn( $element ) => self::obiekt( $element, $opis['pola'] )
				);

			case 'obiekt':
				return self::obiekt( $wartosc, $opis['pola'] );
		}
		return null;
	}

	/**
	 * Adres, którego wolno użyć w szablonie.
	 *
	 * `esc_url` przychodzi dopiero przy druku; tutaj odsiewamy schematy spoza
	 * białej listy, żeby `javascript:` nie dojechało do szablonu w ogóle.
	 *
	 * DWA TYPY, BO DWIE RÓŻNE RZECZY. `adres` (link autora na stronie
	 * sprzedażowej) musi być pełnym adresem — tak samo jak w prototypie
	 * (`z.url()`). `adres_lub_sciezka` (okładka kursu, materiał lekcji)
	 * przyjmuje też ścieżkę względną, bo właściciel wskazuje plik z tej samej
	 * instalacji — decyzja z D6 powtórzona w KREATOR.md. `//cudzy.host` NIE
	 * jest ścieżką względną, więc leci do sprawdzenia jak adres zewnętrzny.
	 *
	 * DLACZEGO NIE `wp_http_validate_url()` (BLAD-017, znaleziony przy W4).
	 * Tamta funkcja odpowiada na inne pytanie: „czy wolno WYSŁAĆ żądanie pod
	 * ten adres" — broni przed SSRF, więc rozwiązuje nazwę w DNS-ie i odrzuca
	 * hosty, których nie umie rozwiązać. Nasze pytanie brzmi „czy wolno ten
	 * odnośnik WYDRUKOWAĆ", a to nie wymaga, żeby domena już istniała.
	 * Skutek starej reguły był cichy i realny: link autora
	 * `https://automaticai.pl` (domena docelowa, jeszcze niekupiona) po prostu
	 * ZNIKAŁ ze strony sprzedażowej — treść była w bazie, na stronie jej nie
	 * było i nic się przy tym nie zapalało.
	 *
	 * @param string $adres      Adres do sprawdzenia.
	 * @param bool   $ze_sciezka Czy wolno podać ścieżkę względną.
	 */
	private static function adres_bezpieczny( string $adres, bool $ze_sciezka = false ): bool {
		if ( $ze_sciezka && str_starts_with( $adres, '/' ) && ! str_starts_with( $adres, '//' ) ) {
			return true;
		}

		$czesci = wp_parse_url( $adres );
		if ( ! is_array( $czesci ) || empty( $czesci['scheme'] ) || empty( $czesci['host'] ) ) {
			return false;
		}
		// Biała lista schematów: `javascript:` i `data:` nie mają prawa dojechać
		// do szablonu, a wszystko poza siecią nie jest odnośnikiem dla klienta.
		if ( ! in_array( strtolower( $czesci['scheme'] ), array( 'http', 'https' ), true ) ) {
			return false;
		}
		// Login i hasło w adresie to klasyczna zmyłka („https://bank.pl@zly.host").
		if ( isset( $czesci['user'] ) || isset( $czesci['pass'] ) ) {
			return false;
		}
		return ! (bool) strpbrk( $czesci['host'], ':#?[] ' );
	}

	/**
	 * Tekst w granicach limitu. Pusty tekst traktujemy jak brak — sekcja
	 * z pustym napisem wyglądałaby jak usterka renderowania.
	 *
	 * @param mixed $wartosc Wartość z bazy.
	 * @param int   $limit   Maksymalna liczba znaków.
	 */
	private static function tekst( $wartosc, int $limit ): ?string {
		if ( ! is_string( $wartosc ) ) {
			return null;
		}
		$czysty = trim( $wartosc );
		if ( '' === $czysty || mb_strlen( $czysty, 'UTF-8' ) > $limit ) {
			return null;
		}
		return $czysty;
	}

	/**
	 * Lista, w której każdy element przechodzi przez `$sprawdzacz`.
	 *
	 * Element, który nie przechodzi, WYPADA z listy — reszta zostaje.
	 * Jedna zepsuta opinia nie ma prawa skasować pięciu dobrych.
	 *
	 * @param mixed    $wartosc    Wartość z bazy.
	 * @param int      $maks       Ile pozycji wolno.
	 * @param callable $sprawdzacz Sprawdzanie pojedynczego elementu.
	 * @return array<int,mixed>|null
	 */
	private static function lista( $wartosc, int $maks, callable $sprawdzacz ): ?array {
		if ( ! is_array( $wartosc ) || count( $wartosc ) > $maks ) {
			return null;
		}
		$wynik = array();
		foreach ( $wartosc as $element ) {
			$czysty = $sprawdzacz( $element );
			if ( null !== $czysty ) {
				$wynik[] = $czysty;
			}
		}
		return $wynik;
	}

	/**
	 * Obiekt o polach opisanych schematem.
	 *
	 * @param mixed                             $wartosc Wartość z bazy.
	 * @param array<string,array<string,mixed>> $pola    Opis pól.
	 * @return array<string,mixed>|null
	 */
	private static function obiekt( $wartosc, array $pola ): ?array {
		if ( ! is_array( $wartosc ) ) {
			return null;
		}
		$wynik = array();
		foreach ( $pola as $nazwa => $opis ) {
			$czysty = isset( $wartosc[ $nazwa ] )
				? self::wartosc( $wartosc[ $nazwa ], $opis )
				: null;
			if ( null === $czysty ) {
				if ( ! empty( $opis['wymagane'] ) ) {
					return null;
				}
				continue;
			}
			$wynik[ $nazwa ] = $czysty;
		}
		return $wynik;
	}

	/* ————————————————————— ZAPIS (ściśle) ————————————————————— */

	/**
	 * Treść z formularza → treść do bazy, albo błędy ze ścieżką do pola.
	 *
	 * DO BAZY IDZIE WYNIK, NIE WEJŚCIE. Bez tego kroku limity długości dałoby
	 * się obejść jednym nieznanym kluczem: treść sekcji jest w bazie workiem
	 * JSON, schemat tylko by ją SPRAWDZAŁ, a zapisywalibyśmy całość — więc
	 * pole, którego kontrakt nie zna, wchodziłoby bez żadnej granicy i bez
	 * szans pojawienia się na stronie. Lekcja wprost z prototypu (0.28.0).
	 *
	 * @param array<string,array<string,mixed>> $pola     Opis pól.
	 * @param mixed                             $tresc    Treść z formularza.
	 * @param string                            $sciezka  Przedrostek ścieżki błędu.
	 * @param array<string,string>              $bledy    Zebrane błędy (przez referencję).
	 * @return array<string,mixed>
	 */
	public static function scisle( array $pola, $tresc, string $sciezka, array &$bledy ): array {
		if ( ! is_array( $tresc ) ) {
			$bledy[ $sciezka ] = __( 'Oczekiwano zestawu pól.', 'aai-sklep' );
			return array();
		}

		$wynik = array();
		foreach ( $pola as $nazwa => $opis ) {
			$gdzie   = '' === $sciezka ? $nazwa : $sciezka . '.' . $nazwa;
			$wartosc = $tresc[ $nazwa ] ?? null;

			// Pole opcjonalne, którego nie ma, po prostu nie wchodzi do bazy —
			// strona nie rysuje pustych akapitów ani pustych list.
			if ( null === $wartosc || array() === $wartosc || '' === $wartosc ) {
				// Pole, w którym pustka JEST treścią (lekcja bez materiału),
				// wchodzi do bazy jako pustka — inaczej wyczyszczenie lekcji
				// byłoby niewykonalne, a licznik postępu przestałby mówić prawdę.
				if ( ! empty( $opis['pusty_ok'] ) ) {
					$wynik[ $nazwa ] = array() === $wartosc ? array() : '';
					continue;
				}
				if ( ! empty( $opis['wymagane'] ) ) {
					$bledy[ $gdzie ] = sprintf(
						/* translators: %s: nazwa pola po polsku. */
						__( '„%s" jest obowiązkowe.', 'aai-sklep' ),
						self::etykieta( $nazwa, $opis )
					);
				}
				continue;
			}

			$czyste = self::wartosc_scisle( $wartosc, $opis, $nazwa, $gdzie, $bledy );
			if ( null !== $czyste ) {
				$wynik[ $nazwa ] = $czyste;
			}
		}
		return $wynik;
	}

	/**
	 * Jedna wartość, ściśle.
	 *
	 * @param mixed               $wartosc Wartość z formularza.
	 * @param array<string,mixed> $opis    Opis pola.
	 * @param string              $nazwa   Nazwa pola.
	 * @param string              $gdzie   Ścieżka błędu.
	 * @param array<string,string> $bledy  Zebrane błędy (przez referencję).
	 * @return mixed|null
	 */
	private static function wartosc_scisle( $wartosc, array $opis, string $nazwa, string $gdzie, array &$bledy ) {
		$etykieta = self::etykieta( $nazwa, $opis );

		switch ( $opis['typ'] ) {
			case 'krotki':
			case 'akapit':
			case 'adres':
			case 'adres_lub_sciezka':
			case 'wybor':
				if ( ! is_string( $wartosc ) ) {
					$bledy[ $gdzie ] = sprintf(
						/* translators: %s: nazwa pola po polsku. */
						__( '„%s": oczekiwano tekstu.', 'aai-sklep' ),
						$etykieta
					);
					return null;
				}
				$czysty = trim( $wartosc );
				$limit  = self::limit( $opis );
				if ( mb_strlen( $czysty, 'UTF-8' ) > $limit ) {
					$bledy[ $gdzie ] = sprintf(
						/* translators: 1: nazwa pola, 2: limit znaków, 3: obecna długość. */
						__( '„%1$s": najwyżej %2$d znaków (jest %3$d).', 'aai-sklep' ),
						$etykieta,
						$limit,
						mb_strlen( $czysty, 'UTF-8' )
					);
					return null;
				}
				if ( 'wybor' === $opis['typ'] && ! isset( $opis['opcje'][ $czysty ] ) ) {
					$bledy[ $gdzie ] = sprintf(
						/* translators: 1: nazwa pola, 2: dozwolone wartości. */
						__( '„%1$s": dozwolone wartości to %2$s.', 'aai-sklep' ),
						$etykieta,
						implode( ', ', array_keys( $opis['opcje'] ) )
					);
					return null;
				}
				if ( in_array( $opis['typ'], array( 'adres', 'adres_lub_sciezka' ), true ) ) {
					$ze_sciezka = 'adres_lub_sciezka' === $opis['typ'];
					if ( ! self::adres_bezpieczny( $czysty, $ze_sciezka ) ) {
						$bledy[ $gdzie ] = $ze_sciezka
							? sprintf(
								/* translators: %s: nazwa pola po polsku. */
								__( '„%s": podaj ścieżkę od „/" albo pełny adres http/https.', 'aai-sklep' ),
								$etykieta
							)
							: sprintf(
								/* translators: %s: nazwa pola po polsku. */
								__( '„%s": podaj pełny adres http/https.', 'aai-sklep' ),
								$etykieta
							);
						return null;
					}
				}
				return $czysty;

			case 'lista_tekstow':
				$lista = self::lista_scisle( $wartosc, $opis, $etykieta, $gdzie, $bledy );
				if ( null === $lista ) {
					return null;
				}
				$wynik = array();
				foreach ( $lista as $i => $element ) {
					$czysty = self::wartosc_scisle(
						$element,
						array(
							'typ'      => 'akapit',
							'etykieta' => $etykieta,
						),
						$nazwa,
						$gdzie . '[' . $i . ']',
						$bledy
					);
					if ( null !== $czysty && '' !== $czysty ) {
						$wynik[] = $czysty;
					}
				}
				return $wynik;

			case 'lista_obiektow':
				$lista = self::lista_scisle( $wartosc, $opis, $etykieta, $gdzie, $bledy );
				if ( null === $lista ) {
					return null;
				}
				$wynik = array();
				foreach ( $lista as $i => $element ) {
					$wynik[] = self::scisle( $opis['pola'], $element, $gdzie . '[' . $i . ']', $bledy );
				}
				return $wynik;

			case 'obiekt':
				return self::scisle( $opis['pola'], $wartosc, $gdzie, $bledy );
		}

		$bledy[ $gdzie ] = sprintf(
			/* translators: %s: nazwa pola po polsku. */
			__( '„%s": nieznany typ pola.', 'aai-sklep' ),
			$etykieta
		);
		return null;
	}

	/**
	 * Lista o dozwolonej długości, ściśle.
	 *
	 * @param mixed                $wartosc  Wartość z formularza.
	 * @param array<string,mixed>  $opis     Opis pola.
	 * @param string               $etykieta Nazwa pola po polsku.
	 * @param string               $gdzie    Ścieżka błędu.
	 * @param array<string,string> $bledy    Zebrane błędy (przez referencję).
	 * @return array<int,mixed>|null
	 */
	private static function lista_scisle( $wartosc, array $opis, string $etykieta, string $gdzie, array &$bledy ): ?array {
		if ( ! is_array( $wartosc ) ) {
			$bledy[ $gdzie ] = sprintf(
				/* translators: %s: nazwa pola po polsku. */
				__( '„%s": oczekiwano listy.', 'aai-sklep' ),
				$etykieta
			);
			return null;
		}
		$maks = self::limit_listy( $opis );
		if ( count( $wartosc ) > $maks ) {
			$bledy[ $gdzie ] = sprintf(
				/* translators: 1: nazwa pola, 2: dozwolona liczba pozycji. */
				__( '„%1$s": najwyżej %2$d pozycji.', 'aai-sklep' ),
				$etykieta,
				$maks
			);
			return null;
		}
		return array_values( $wartosc );
	}

	/* ————————————————————— PANEL ————————————————————— */

	/**
	 * Nazwa pola po polsku — z opisu, a w ostateczności sama nazwa klucza.
	 *
	 * @param string              $nazwa Nazwa pola.
	 * @param array<string,mixed> $opis  Opis pola.
	 */
	public static function etykieta( string $nazwa, array $opis ): string {
		return isset( $opis['etykieta'] ) ? (string) $opis['etykieta'] : $nazwa;
	}

	/**
	 * Pusta treść — wszystkie pola widoczne od razu.
	 *
	 * Lista zamknięta dostaje PIERWSZĄ opcję, nie pustkę: kontrakt trzyma tam
	 * zbiór wartości, więc pusty napis i tak by nie przeszedł, a właściciel
	 * zobaczyłby błąd przy polu, którego nawet nie tknął.
	 *
	 * @param array<string,array<string,mixed>> $pola Opis pól.
	 * @return array<string,mixed>
	 */
	public static function pusta( array $pola ): array {
		$wynik = array();
		foreach ( $pola as $nazwa => $opis ) {
			$wynik[ $nazwa ] = self::pusta_wartosc( $opis );
		}
		return $wynik;
	}

	/**
	 * Pusta wartość jednego pola.
	 *
	 * @param array<string,mixed> $opis Opis pola.
	 * @return mixed
	 */
	private static function pusta_wartosc( array $opis ) {
		switch ( $opis['typ'] ) {
			case 'lista_tekstow':
			case 'lista_obiektow':
				return array();
			case 'obiekt':
				return self::pusta( $opis['pola'] );
			case 'wybor':
				$opcje = array_keys( $opis['opcje'] ?? array() );
				return $opcje[0] ?? '';
			default:
				return '';
		}
	}

	/**
	 * Treść z bazy → stan formularza.
	 *
	 * Braki uzupełniamy pustymi wartościami, żeby edytor pokazał WSZYSTKIE
	 * pola rodzaju — także te dopisane do kontraktu już po zapisaniu kursu.
	 * Kształt z bazy bierzemy z ograniczonym zaufaniem: wartość w złym
	 * kształcie zamieniamy na pustą, bo edytor ma pozwolić NAPRAWIĆ taki
	 * rekord, a nie wysypać się przy jego wczytywaniu.
	 *
	 * @param array<string,array<string,mixed>> $pola  Opis pól.
	 * @param mixed                             $zbazy Treść z bazy.
	 * @return array<string,mixed>
	 */
	public static function do_formularza( array $pola, $zbazy ): array {
		$zrodlo = is_array( $zbazy ) ? $zbazy : array();
		$wynik  = array();

		foreach ( $pola as $nazwa => $opis ) {
			$wartosc = $zrodlo[ $nazwa ] ?? null;
			if ( null === $wartosc ) {
				$wynik[ $nazwa ] = self::pusta_wartosc( $opis );
				continue;
			}

			switch ( $opis['typ'] ) {
				case 'obiekt':
					$wynik[ $nazwa ] = self::do_formularza( $opis['pola'], $wartosc );
					break;

				case 'lista_obiektow':
					$lista = is_array( $wartosc ) ? $wartosc : array();
					$wynik[ $nazwa ] = array_map(
						static fn( $element ) => self::do_formularza( $opis['pola'], $element ),
						array_values( $lista )
					);
					break;

				case 'lista_tekstow':
					$lista = is_array( $wartosc ) ? $wartosc : array();
					$wynik[ $nazwa ] = array_map(
						static fn( $element ) => is_scalar( $element ) ? (string) $element : '',
						array_values( $lista )
					);
					break;

				default:
					$wynik[ $nazwa ] = is_scalar( $wartosc ) ? (string) $wartosc : '';
			}
		}
		return $wynik;
	}

	/**
	 * Stan formularza → treść do wysłania (bez pustych pól opcjonalnych).
	 *
	 * Puste pole OBOWIĄZKOWE jedzie jak stoi — niech odrzuci je `scisle()`
	 * i wróci czytelnym błędem przy tym polu, zamiast zniknąć po drodze.
	 *
	 * @param array<string,array<string,mixed>> $pola Opis pól.
	 * @param array<string,mixed>               $stan Stan formularza.
	 * @return array<string,mixed>
	 */
	public static function oczysc( array $pola, array $stan ): array {
		$wynik = array();

		foreach ( $pola as $nazwa => $opis ) {
			$wartosc = $stan[ $nazwa ] ?? null;

			switch ( $opis['typ'] ) {
				case 'lista_tekstow':
					$lista = array();
					foreach ( (array) $wartosc as $element ) {
						$tekst = is_scalar( $element ) ? trim( (string) $element ) : '';
						if ( '' !== $tekst ) {
							$lista[] = $tekst;
						}
					}
					if ( array() === $lista && empty( $opis['wymagane'] ) ) {
						break;
					}
					$wynik[ $nazwa ] = $lista;
					break;

				case 'lista_obiektow':
					$lista = array();
					foreach ( (array) $wartosc as $element ) {
						// Element pusty w każdym polu to niedokończony wpis,
						// nie treść — wypada bez słowa.
						if ( ! self::zaczety( $opis['pola'], $element ) ) {
							continue;
						}
						$lista[] = self::oczysc_zagniezdzony( $opis['pola'], (array) $element );
					}
					if ( array() === $lista && empty( $opis['wymagane'] ) ) {
						break;
					}
					$wynik[ $nazwa ] = $lista;
					break;

				case 'obiekt':
					if ( ! self::zaczety( $opis['pola'], $wartosc ) && empty( $opis['wymagane'] ) ) {
						break;
					}
					$wynik[ $nazwa ] = self::oczysc_zagniezdzony( $opis['pola'], (array) $wartosc );
					break;

				default:
					$tekst = is_scalar( $wartosc ) ? trim( (string) $wartosc ) : '';
					if ( '' === $tekst && empty( $opis['wymagane'] ) ) {
						break;
					}
					$wynik[ $nazwa ] = $tekst;
			}
		}

		return $wynik;
	}

	/**
	 * Czyści obiekt zagnieżdżony: puste pola opcjonalne wypadają.
	 *
	 * @param array<string,array<string,mixed>> $pola    Opis pól.
	 * @param array<string,mixed>               $wartosc Wartość z formularza.
	 * @return array<string,mixed>
	 */
	private static function oczysc_zagniezdzony( array $pola, array $wartosc ): array {
		$wynik = array();
		foreach ( $pola as $nazwa => $opis ) {
			$tekst = isset( $wartosc[ $nazwa ] ) && is_scalar( $wartosc[ $nazwa ] )
				? trim( (string) $wartosc[ $nazwa ] )
				: '';
			if ( '' === $tekst && empty( $opis['wymagane'] ) ) {
				continue;
			}
			$wynik[ $nazwa ] = $tekst;
		}
		return $wynik;
	}

	/**
	 * Czy element listy albo obiektu jest ZACZĘTY.
	 *
	 * Pola „wybor" się nie liczą — mają wartość od pierwszej chwili (patrz
	 * `pusta_wartosc`), więc świeżo dodany, jeszcze niewypełniony materiał
	 * wyglądałby przez nie na rozpoczęty i pojechałby do bazy jako pusty
	 * wpis zamiast po cichu wypaść.
	 *
	 * @param array<string,array<string,mixed>> $pola    Opis pól.
	 * @param mixed                             $element Element do sprawdzenia.
	 */
	private static function zaczety( array $pola, $element ): bool {
		if ( ! is_array( $element ) ) {
			return false;
		}
		foreach ( $pola as $nazwa => $opis ) {
			if ( 'wybor' === $opis['typ'] ) {
				continue;
			}
			$wartosc = $element[ $nazwa ] ?? null;
			if ( is_scalar( $wartosc ) && '' !== trim( (string) $wartosc ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Czego brakuje, żeby treść była kompletna — po polach OBOWIĄZKOWYCH.
	 *
	 * Panel pokazuje to jako stan sekcji, ZANIM właściciel kliknie zapis.
	 * Pole opcjonalne, ale ZACZĘTE, też musi być dokończone: obiekt „link"
	 * autora z samą etykietą i bez adresu przechodzi przez „opcjonalne",
	 * a kontrakt go odrzuci — sekcja świeciłaby „gotowa", a zapis by padał.
	 *
	 * @param array<string,array<string,mixed>> $pola Opis pól.
	 * @param array<string,mixed>               $stan Stan formularza.
	 * @return string[] Etykiety pól, których brakuje.
	 */
	public static function braki( array $pola, array $stan ): array {
		$braki = array();

		foreach ( $pola as $nazwa => $opis ) {
			$wartosc  = $stan[ $nazwa ] ?? null;
			$etykieta = self::etykieta( $nazwa, $opis );

			// Pustka jest tu legalnym stanem — nie ma czego brakować.
			if ( ! empty( $opis['pusty_ok'] ) ) {
				continue;
			}

			if ( empty( $opis['wymagane'] ) ) {
				if ( 'obiekt' === $opis['typ'] && self::zaczety( $opis['pola'], $wartosc ) && self::niedokonczony( $opis['pola'], (array) $wartosc ) ) {
					$braki[] = $etykieta;
				}
				if ( 'lista_obiektow' === $opis['typ'] ) {
					foreach ( (array) $wartosc as $element ) {
						if ( self::zaczety( $opis['pola'], $element ) && self::niedokonczony( $opis['pola'], (array) $element ) ) {
							$braki[] = $etykieta;
							break;
						}
					}
				}
				continue;
			}

			switch ( $opis['typ'] ) {
				case 'lista_tekstow':
					$ile = 0;
					foreach ( (array) $wartosc as $element ) {
						if ( is_scalar( $element ) && '' !== trim( (string) $element ) ) {
							++$ile;
						}
					}
					if ( 0 === $ile ) {
						$braki[] = $etykieta;
					}
					break;

				case 'lista_obiektow':
					$ile = 0;
					foreach ( (array) $wartosc as $element ) {
						if ( ! self::niedokonczony( $opis['pola'], (array) $element ) ) {
							++$ile;
						}
					}
					if ( 0 === $ile ) {
						$braki[] = $etykieta;
					}
					break;

				case 'obiekt':
					if ( self::niedokonczony( $opis['pola'], (array) $wartosc ) ) {
						$braki[] = $etykieta;
					}
					break;

				default:
					if ( ! is_scalar( $wartosc ) || '' === trim( (string) $wartosc ) ) {
						$braki[] = $etykieta;
					}
			}
		}

		return $braki;
	}

	/**
	 * Czy w zagnieżdżonym elemencie brakuje pola obowiązkowego.
	 *
	 * @param array<string,array<string,mixed>> $pola    Opis pól.
	 * @param array<string,mixed>               $element Element do sprawdzenia.
	 */
	private static function niedokonczony( array $pola, array $element ): bool {
		foreach ( $pola as $nazwa => $opis ) {
			if ( empty( $opis['wymagane'] ) ) {
				continue;
			}
			$wartosc = $element[ $nazwa ] ?? null;
			if ( ! is_scalar( $wartosc ) || '' === trim( (string) $wartosc ) ) {
				return true;
			}
		}
		return false;
	}
}
