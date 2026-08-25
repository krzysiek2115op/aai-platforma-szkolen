<?php
/**
 * Kontrakt treści sekcji sprzedażowych — port `SCHEMATY_SEKCJI`
 * z `modules/m1-sklep/typy.ts`.
 *
 * PO CO. Treść sekcji siedzi w bazie jako JSON i wpisuje ją kreator, więc
 * strona dostaje kształt, którego nie kontroluje w chwili renderowania.
 * W prototypie pilnował tego Zod (`safeParse`), a zasada brzmiała: sekcja
 * o złym kształcie ZNIKA, zamiast wysadzać stronę. Jedno pole nie tego typu
 * nie może zabrać klientowi całej oferty.
 *
 * DLACZEGO OPIS POLA, A NIE RĘCZNE `isset()` W SZABLONIE. Bo z tego opisu
 * korzystają DWIE rzeczy: sprawdzanie treści tutaj i `straznik-frontu-wp`,
 * który porównuje pola kontraktu z polami renderowanymi w szablonach. Pole
 * dopisane do kontraktu bez renderu to treść wpisana kreatorem, której
 * klient nigdy nie zobaczy — usterka, która nie daje żadnego objawu. To ta
 * sama konstrukcja, co `opis-sekcji.ts` + `straznik-kreatora` w prototypie.
 *
 * LIMITY są przepisane z prototypu co do liczby (`LIMIT_KROTKI` 200,
 * `LIMIT_AKAPIT` 2000, `LIMIT_LISTY` 50). Nie dlatego, że strona musi się
 * bronić przed własną bazą, tylko dlatego, że po obu stronach migracji ma
 * obowiązywać JEDEN kontrakt — inaczej ten sam kurs wygląda inaczej
 * w prototypie i na WordPressie, a nikt nie wie który ma rację.
 *
 * @package Aai_Sklep
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Sprawdzanie treści sekcji przed renderowaniem.
 */
final class Aai_Sklep_Sekcje {

	/** Tytuły, etykiety, nazwy, autorzy. */
	private const LIMIT_KROTKI = 200;

	/** Opisy, bio, odpowiedzi, cytaty. */
	private const LIMIT_AKAPIT = 2000;

	/** Adresy (link autora). */
	private const LIMIT_ADRESU = 500;

	/** Pozycji w liście wewnątrz sekcji. */
	private const LIMIT_LISTY = 50;

	/**
	 * Rodzaj sekcji → opis jej pól.
	 *
	 * Typy: `krotki` (tekst do 200 znaków), `akapit` (do 2000), `adres`,
	 * `lista_tekstow`, `lista_obiektow` (z `pola`), `obiekt` (z `pola`).
	 * `wymagane` = brak pola albo zły typ przewraca CAŁĄ sekcję; pole
	 * opcjonalne o złym typie jest po prostu pomijane.
	 *
	 * Kolejność rodzajów jest tu alfabetyczna dla czytelności — o kolejności
	 * NA STRONIE decyduje szablon `szablony/kurs.php` (psychologia scrolla
	 * z briefu B5), nie ta tablica i nie baza.
	 */
	private const SCHEMATY = array(
		'author'         => array(
			'imie'             => array( 'typ' => 'krotki', 'wymagane' => true ),
			'rola'             => array( 'typ' => 'krotki' ),
			'bio'              => array( 'typ' => 'akapit', 'wymagane' => true ),
			'atuty'            => array( 'typ' => 'lista_tekstow' ),
			'cytat'            => array( 'typ' => 'akapit' ),
			'czym_sie_zajmuje' => array( 'typ' => 'lista_tekstow' ),
			'link'             => array(
				'typ'  => 'obiekt',
				'pola' => array(
					'url'      => array( 'typ' => 'adres', 'wymagane' => true ),
					'etykieta' => array( 'typ' => 'krotki', 'wymagane' => true ),
				),
			),
		),
		'benefits'       => array(
			'punkty' => array(
				'typ'      => 'lista_obiektow',
				'wymagane' => true,
				'pola'     => array(
					'tytul' => array( 'typ' => 'krotki', 'wymagane' => true ),
					'opis'  => array( 'typ' => 'akapit' ),
				),
			),
		),
		'comparison'     => array(
			'alternatywa_nazwa' => array( 'typ' => 'krotki', 'wymagane' => true ),
			'alternatywa'       => array( 'typ' => 'lista_tekstow', 'wymagane' => true ),
			'kurs'              => array( 'typ' => 'lista_tekstow', 'wymagane' => true ),
		),
		'faq'            => array(
			'pytania' => array(
				'typ'      => 'lista_obiektow',
				'wymagane' => true,
				'pola'     => array(
					'pytanie'   => array( 'typ' => 'krotki', 'wymagane' => true ),
					'odpowiedz' => array( 'typ' => 'akapit', 'wymagane' => true ),
				),
			),
		),
		'for_whom'       => array(
			'punkty'  => array( 'typ' => 'lista_tekstow', 'wymagane' => true ),
			'nie_dla' => array( 'typ' => 'lista_tekstow' ),
		),
		'guarantee'      => array(
			'naglowek' => array( 'typ' => 'krotki', 'wymagane' => true ),
			'tekst'    => array( 'typ' => 'akapit', 'wymagane' => true ),
		),
		'hero'           => array(
			'obietnica'   => array( 'typ' => 'akapit', 'wymagane' => true ),
			'rozwiniecie' => array( 'typ' => 'akapit' ),
			'dla_kogo'    => array( 'typ' => 'akapit' ),
		),
		'opinions'       => array(
			'opinie' => array(
				'typ'      => 'lista_obiektow',
				'wymagane' => true,
				'pola'     => array(
					'tekst' => array( 'typ' => 'akapit', 'wymagane' => true ),
					'autor' => array( 'typ' => 'krotki', 'wymagane' => true ),
					'rola'  => array( 'typ' => 'krotki' ),
				),
			),
		),
		'package'        => array(
			'punkty'     => array(
				'typ'      => 'lista_obiektow',
				'wymagane' => true,
				'pola'     => array(
					'tytul' => array( 'typ' => 'krotki', 'wymagane' => true ),
					'opis'  => array( 'typ' => 'akapit' ),
				),
			),
			'kotwica'    => array( 'typ' => 'akapit' ),
			'w_cenie'    => array( 'typ' => 'lista_tekstow' ),
			'domkniecie' => array( 'typ' => 'akapit' ),
		),
		'positioning'    => array(
			'nie_jest' => array( 'typ' => 'lista_tekstow', 'wymagane' => true ),
			'jest'     => array( 'typ' => 'lista_tekstow', 'wymagane' => true ),
		),
		'problem'        => array(
			'wstep'       => array( 'typ' => 'akapit', 'wymagane' => true ),
			'problem'     => array( 'typ' => 'akapit', 'wymagane' => true ),
			'rozwiazanie' => array( 'typ' => 'akapit', 'wymagane' => true ),
			'rezultat'    => array( 'typ' => 'akapit', 'wymagane' => true ),
		),
		'transformation' => array(
			'przed' => array( 'typ' => 'lista_tekstow', 'wymagane' => true ),
			'po'    => array( 'typ' => 'lista_tekstow', 'wymagane' => true ),
		),
	);

	/**
	 * KOLEJNOŚĆ SEKCJI NA STRONIE SPRZEDAŻOWEJ — jedno źródło prawdy.
	 *
	 * Kolejność bierze się z psychologii scrolla z briefu B5 (zainteresowanie →
	 * problem → wartość → program → dowód → oferta → redukcja obaw → CTA),
	 * a NIE z bazy: tabela sekcji nie ma kolumny `position` (decyzja właściciela
	 * 2026-08-25), bo o układzie strony decyduje projekt, nie dane.
	 *
	 * DLACZEGO TU, A NIE W SZABLONIE. Bo pytają o to DWA miejsca: szablon
	 * (co narysować) i warstwa SEO (o czym wolno powiedzieć w danych
	 * strukturalnych). Gdy każde miało własną listę, dało się je rozjechać —
	 * i test negatywny to pokazał: sekcja FAQ usunięta ze strony nadal
	 * wystawiała `FAQPage` z pytaniami, których klient nie widzi. Jedna lista
	 * czyni ten rozjazd niemożliwym, zamiast pilnowanym.
	 *
	 * Wpisy z „#" to sekcje WŁASNE strony (program, platforma, oferta) —
	 * powstają z kolumn kursu, nie z tabeli sekcji.
	 */
	public const KOLEJNOSC = array(
		array( 'problem', 'Poznaj kurs' ),
		array( 'benefits', 'Rezultaty' ),
		array( 'package', 'W środku' ),
		array( '#program', 'Program' ),
		array( '#platforma', 'Platforma' ),
		array( 'positioning', 'Pozycjonowanie' ),
		array( 'for_whom', 'Dla kogo' ),
		array( 'transformation', 'Transformacja' ),
		array( 'opinions', 'Opinie' ),
		array( 'author', 'Prowadzący' ),
		array( '#cena', 'Dołącz' ),
		array( 'comparison', 'Porównanie' ),
		array( 'faq', 'FAQ' ),
	);

	/**
	 * Rodzaje sekcji, które strona NAPRAWDĘ rysuje.
	 *
	 * Poza `KOLEJNOSC` są dwa: `hero` (renderowany przed listą, bo nie jest
	 * sekcją w rytmie strony) i `guarantee` (kartą wewnątrz oferty — tak samo
	 * jak w prototypie). Ta lista jest odpowiedzią na pytanie „czy klient to
	 * zobaczy", więc pyta o nią i warstwa SEO, i strażnik.
	 *
	 * @return string[]
	 */
	public static function renderowane(): array {
		$rodzaje = array( 'hero', 'guarantee' );
		foreach ( self::KOLEJNOSC as $pozycja ) {
			if ( ! str_starts_with( $pozycja[0], '#' ) ) {
				$rodzaje[] = $pozycja[0];
			}
		}
		return $rodzaje;
	}

	/**
	 * Wszystkie rodzaje sekcji, które umiemy wyświetlić.
	 *
	 * @return string[]
	 */
	public static function rodzaje(): array {
		return array_keys( self::SCHEMATY );
	}

	/**
	 * Sprawdza treść jednej sekcji.
	 *
	 * @param string $rodzaj Rodzaj sekcji (kolumna `kind`).
	 * @param mixed  $tresc  Treść po `json_decode`.
	 * @return array<string,mixed>|null Sprawdzona treść albo null (sekcja znika).
	 */
	public static function sprawdz( string $rodzaj, $tresc ): ?array {
		if ( ! isset( self::SCHEMATY[ $rodzaj ] ) || ! is_array( $tresc ) ) {
			return null;
		}

		$wynik = array();
		foreach ( self::SCHEMATY[ $rodzaj ] as $nazwa => $opis ) {
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
	 * @param mixed                $wartosc Wartość z bazy.
	 * @param array<string,mixed>  $opis    Opis pola ze schematu.
	 * @return mixed|null Null = wartość nie pasuje do opisu.
	 */
	private static function wartosc( $wartosc, array $opis ) {
		switch ( $opis['typ'] ) {
			case 'krotki':
				return self::tekst( $wartosc, self::LIMIT_KROTKI );

			case 'akapit':
				return self::tekst( $wartosc, self::LIMIT_AKAPIT );

			case 'adres':
				$adres = self::tekst( $wartosc, self::LIMIT_ADRESU );
				// `esc_url` dopiero przy druku; tutaj odsiewamy schematy
				// spoza białej listy, żeby `javascript:` nie dojechało do
				// szablonu w ogóle.
				return null !== $adres && wp_http_validate_url( $adres ) ? $adres : null;

			case 'lista_tekstow':
				return self::lista(
					$wartosc,
					static fn( $element ) => self::tekst( $element, self::LIMIT_AKAPIT )
				);

			case 'lista_obiektow':
				return self::lista(
					$wartosc,
					static fn( $element ) => self::obiekt( $element, $opis['pola'] )
				);

			case 'obiekt':
				return self::obiekt( $wartosc, $opis['pola'] );
		}
		return null;
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
	 * @param callable $sprawdzacz Sprawdzanie pojedynczego elementu.
	 * @return array<int,mixed>|null
	 */
	private static function lista( $wartosc, callable $sprawdzacz ): ?array {
		if ( ! is_array( $wartosc ) || count( $wartosc ) > self::LIMIT_LISTY ) {
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
	 * @param mixed                            $wartosc Wartość z bazy.
	 * @param array<string,array<string,mixed>> $pola   Opis pól.
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
}
