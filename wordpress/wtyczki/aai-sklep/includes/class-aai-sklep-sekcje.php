<?php
/**
 * Kontrakt treści sekcji sprzedażowych — port `SCHEMATY_SEKCJI`
 * z `modules/m1-sklep/typy.ts` RAZEM z opisem pól dla kreatora.
 *
 * PO CO. Treść sekcji siedzi w bazie jako JSON i wpisuje ją kreator, więc
 * strona dostaje kształt, którego nie kontroluje w chwili renderowania.
 * W prototypie pilnował tego Zod (`safeParse`), a zasada brzmiała: sekcja
 * o złym kształcie ZNIKA, zamiast wysadzać stronę. Jedno pole nie tego typu
 * nie może zabrać klientowi całej oferty.
 *
 * DLACZEGO ETYKIETY SIEDZĄ TUTAJ, A NIE W OSOBNYM PLIKU PANELU. Bo w
 * prototypie były osobno (`components/kreator/opis-sekcji.ts`) i potrafiły
 * rozjechać się z kontraktem — pole dopisane do kontraktu nie miało czym
 * zostać wypełnione, a objaw był żaden: sekcja po prostu nigdy nie
 * dostawała tej treści. Pilnował tego `straznik-kreatora`. Tutaj idziemy
 * krok dalej, tak samo jak przy `KOLEJNOSC`: jedna tablica czyni ten
 * rozjazd NIEMOŻLIWYM, zamiast pilnowanym. Kontrola treści czyta z niej
 * `typ`/`wymagane`, panel `etykieta`/`pomoc`/`placeholder` — i nie ma
 * dwóch list, które mogłyby się różnić.
 *
 * LIMITY i cała mechanika sprawdzania mieszkają w `Aai_Sklep_Pola`, bo
 * korzysta z nich także treść lekcji (kontrakt W4).
 *
 * @package Aai_Sklep
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Kontrakt i opis sekcji sprzedażowych.
 */
final class Aai_Sklep_Sekcje {

	/**
	 * Rodzaj sekcji → nazwa, cel i opis pól.
	 *
	 * Typy pól: `krotki` (do 200 znaków), `akapit` (do 2000), `adres`,
	 * `lista_tekstow`, `lista_obiektow` (z `pola`), `obiekt` (z `pola`).
	 * `wymagane` = brak pola albo zły typ przewraca CAŁĄ sekcję; pole
	 * opcjonalne o złym typie jest po prostu pomijane.
	 *
	 * Kolejność rodzajów jest tu alfabetyczna dla czytelności — o kolejności
	 * NA STRONIE decyduje `KOLEJNOSC`, a o kolejności W PANELU
	 * `kolejnosc_w_panelu()`.
	 */
	private const SCHEMATY = array(
		'author'         => array(
			'nazwa' => 'Autor',
			'cel'   => 'Dlaczego akurat Ty uczysz tego tematu.',
			'pola'  => array(
				'imie'             => array(
					'typ'      => 'krotki',
					'wymagane' => true,
					'etykieta' => 'Imię i nazwisko',
				),
				'rola'             => array(
					'typ'         => 'krotki',
					'etykieta'    => 'Rola',
					'placeholder' => 'Twórca Automatic AI',
				),
				'bio'              => array(
					'typ'      => 'akapit',
					'wymagane' => true,
					'etykieta' => 'Bio',
				),
				'atuty'            => array(
					'typ'            => 'lista_tekstow',
					'etykieta'       => 'Atuty',
					'nazwa_elementu' => 'atut',
				),
				'cytat'            => array(
					'typ'      => 'akapit',
					'etykieta' => 'Osobisty powód stworzenia kursu',
					'pomoc'    => 'Buduje zaufanie mocniej niż lista osiągnięć.',
				),
				'czym_sie_zajmuje' => array(
					'typ'            => 'lista_tekstow',
					'etykieta'       => 'Czym się zajmuję na co dzień',
					'nazwa_elementu' => 'obszar',
				),
				'link'             => array(
					'typ'      => 'obiekt',
					'etykieta' => 'Link z dowodami',
					'pomoc'    => 'Np. portfolio. Zostaw puste, jeśli nie chcesz linku.',
					'pola'     => array(
						'url'      => array(
							'typ'         => 'adres',
							'wymagane'    => true,
							'etykieta'    => 'Adres',
							'placeholder' => 'https://automaticai.pl',
						),
						'etykieta' => array(
							'typ'         => 'krotki',
							'wymagane'    => true,
							'etykieta'    => 'Napis na linku',
							'placeholder' => 'Zobacz realizacje',
						),
					),
				),
			),
		),
		'benefits'       => array(
			'nazwa' => 'Korzyści',
			'cel'   => 'Co kupujący będzie UMIAŁ, nie co jest w środku.',
			'pola'  => array(
				'punkty' => array(
					'typ'            => 'lista_obiektow',
					'wymagane'       => true,
					'etykieta'       => 'Korzyści',
					'nazwa_elementu' => 'korzyść',
					'pola'           => array(
						'tytul' => array(
							'typ'      => 'krotki',
							'wymagane' => true,
							'etykieta' => 'Tytuł',
						),
						'opis'  => array(
							'typ'      => 'akapit',
							'etykieta' => 'Opis',
						),
					),
				),
			),
		),
		'comparison'     => array(
			'nazwa' => 'Porównanie z alternatywą',
			'cel'   => 'Uczciwe zestawienie z samodzielną nauką lub innym rozwiązaniem.',
			'pola'  => array(
				'alternatywa_nazwa' => array(
					'typ'         => 'krotki',
					'wymagane'    => true,
					'etykieta'    => 'Nazwa alternatywy',
					'placeholder' => 'Nauka na własną rękę',
				),
				'alternatywa'       => array(
					'typ'            => 'lista_tekstow',
					'wymagane'       => true,
					'etykieta'       => 'Alternatywa — jak to wygląda',
					'nazwa_elementu' => 'punkt',
				),
				'kurs'              => array(
					'typ'            => 'lista_tekstow',
					'wymagane'       => true,
					'etykieta'       => 'Ten kurs — jak to wygląda',
					'nazwa_elementu' => 'punkt',
				),
			),
		),
		'faq'            => array(
			'nazwa' => 'FAQ',
			'cel'   => 'Ostatnie obiekcje przed zakupem.',
			'pola'  => array(
				'pytania' => array(
					'typ'            => 'lista_obiektow',
					'wymagane'       => true,
					'etykieta'       => 'Pytania',
					'nazwa_elementu' => 'pytanie',
					'pola'           => array(
						'pytanie'   => array(
							'typ'      => 'krotki',
							'wymagane' => true,
							'etykieta' => 'Pytanie',
						),
						'odpowiedz' => array(
							'typ'      => 'akapit',
							'wymagane' => true,
							'etykieta' => 'Odpowiedź',
						),
					),
				),
			),
		),
		'for_whom'       => array(
			'nazwa' => 'Dla kogo',
			'cel'   => 'Kto skorzysta — i uczciwie: kto nie.',
			'pola'  => array(
				'punkty'  => array(
					'typ'            => 'lista_tekstow',
					'wymagane'       => true,
					'etykieta'       => 'Kurs jest dla Ciebie, jeśli…',
					'nazwa_elementu' => 'punkt',
				),
				'nie_dla' => array(
					'typ'            => 'lista_tekstow',
					'etykieta'       => 'To NIE jest dla Ciebie, jeśli…',
					'nazwa_elementu' => 'punkt',
					'pomoc'          => 'Uczciwe odsianie buduje zaufanie mocniej niż obietnice.',
				),
			),
		),
		'guarantee'      => array(
			'nazwa' => 'Gwarancja',
			'cel'   => 'Zdejmuje ryzyko z kupującego.',
			'pola'  => array(
				'naglowek' => array(
					'typ'      => 'krotki',
					'wymagane' => true,
					'etykieta' => 'Nagłówek',
				),
				'tekst'    => array(
					'typ'      => 'akapit',
					'wymagane' => true,
					'etykieta' => 'Treść',
				),
			),
		),
		'hero'           => array(
			'nazwa' => 'Hero — pierwszy ekran',
			'cel'   => 'Pierwsze 3 sekundy: obietnica efektu, nie opis produktu.',
			'pola'  => array(
				'obietnica'   => array(
					'typ'         => 'akapit',
					'wymagane'    => true,
					'etykieta'    => 'Obietnica',
					'wiersze'     => 2,
					'placeholder' => 'Zamień Claude w narzędzie, które realnie skraca Twoją pracę',
					'pomoc'       => 'Nagłówek nad tytułem kursu — efekt, nie temat.',
				),
				'rozwiniecie' => array(
					'typ'      => 'akapit',
					'etykieta' => 'Rozwinięcie',
					'pomoc'    => 'Jedno–dwa zdania pod tytułem: co konkretnie dostaje kupujący.',
				),
				'dla_kogo'    => array(
					'typ'      => 'akapit',
					'etykieta' => 'Dla kogo (jedno zdanie)',
					'wiersze'  => 2,
					'pomoc'    => 'Hero ma od razu odpowiadać, czy to kurs dla tej osoby.',
				),
			),
		),
		'opinions'       => array(
			'nazwa' => 'Opinie',
			'cel'   => 'Dowód społeczny — konkretna osoba, konkretny efekt.',
			'pola'  => array(
				'opinie' => array(
					'typ'            => 'lista_obiektow',
					'wymagane'       => true,
					'etykieta'       => 'Opinie',
					'nazwa_elementu' => 'opinia',
					'pola'           => array(
						'tekst' => array(
							'typ'      => 'akapit',
							'wymagane' => true,
							'etykieta' => 'Treść opinii',
						),
						'autor' => array(
							'typ'      => 'krotki',
							'wymagane' => true,
							'etykieta' => 'Autor',
						),
						'rola'  => array(
							'typ'      => 'krotki',
							'etykieta' => 'Rola / firma',
						),
					),
				),
			),
		),
		'package'        => array(
			'nazwa' => 'Co otrzymujesz (oferta)',
			'cel'   => 'Konkret za cenę + kotwica cenowa i zdanie domykające nad CTA.',
			'pola'  => array(
				'punkty'     => array(
					'typ'            => 'lista_obiektow',
					'wymagane'       => true,
					'etykieta'       => 'Elementy pakietu',
					'nazwa_elementu' => 'element',
					'pola'           => array(
						'tytul' => array(
							'typ'      => 'krotki',
							'wymagane' => true,
							'etykieta' => 'Tytuł',
						),
						'opis'  => array(
							'typ'      => 'akapit',
							'etykieta' => 'Opis',
						),
					),
				),
				'kotwica'    => array(
					'typ'      => 'akapit',
					'etykieta' => 'Kotwica cenowa',
					'pomoc'    => 'Z czym porównać cenę, żeby wyglądała na to, czym jest.',
				),
				'w_cenie'    => array(
					'typ'            => 'lista_tekstow',
					'etykieta'       => 'W cenie',
					'nazwa_elementu' => 'pozycja',
					'pomoc'          => 'Warunki zakupu pokazywane przy cenie (np. dostęp bezterminowy).',
				),
				'domkniecie' => array(
					'typ'      => 'akapit',
					'etykieta' => 'Zdanie domykające',
					'pomoc'    => 'Ostatnie zdanie tuż nad przyciskiem zakupu.',
				),
			),
		),
		'positioning'    => array(
			'nazwa' => 'To NIE jest / to JEST',
			'cel'   => 'Ucina złe oczekiwania, zanim staną się zwrotem pieniędzy.',
			'pola'  => array(
				'nie_jest' => array(
					'typ'            => 'lista_tekstow',
					'wymagane'       => true,
					'etykieta'       => 'To NIE jest',
					'nazwa_elementu' => 'punkt',
				),
				'jest'     => array(
					'typ'            => 'lista_tekstow',
					'wymagane'       => true,
					'etykieta'       => 'To JEST',
					'nazwa_elementu' => 'punkt',
				),
			),
		),
		'problem'        => array(
			'nazwa' => 'Dlaczego ten kurs',
			'cel'   => 'Sprzedajemy zmianę: problem → rozwiązanie → rezultat.',
			'pola'  => array(
				'wstep'       => array(
					'typ'      => 'akapit',
					'wymagane' => true,
					'etykieta' => 'Wstęp',
				),
				'problem'     => array(
					'typ'      => 'akapit',
					'wymagane' => true,
					'etykieta' => 'Problem',
					'pomoc'    => 'Sytuacja, którą czytelnik rozpozna u siebie.',
				),
				'rozwiazanie' => array(
					'typ'      => 'akapit',
					'wymagane' => true,
					'etykieta' => 'Rozwiązanie',
				),
				'rezultat'    => array(
					'typ'      => 'akapit',
					'wymagane' => true,
					'etykieta' => 'Rezultat',
					'pomoc'    => 'Stan PO kursie — mierzalny, nie ogólnikowy.',
				),
			),
		),
		'transformation' => array(
			'nazwa' => 'Przed / po',
			'cel'   => 'Ta sama osoba przed kursem i po nim.',
			'pola'  => array(
				'przed' => array(
					'typ'            => 'lista_tekstow',
					'wymagane'       => true,
					'etykieta'       => 'Przed',
					'nazwa_elementu' => 'punkt',
				),
				'po'    => array(
					'typ'            => 'lista_tekstow',
					'wymagane'       => true,
					'etykieta'       => 'Po',
					'nazwa_elementu' => 'punkt',
				),
			),
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
	 * DLACZEGO TU, A NIE W SZABLONIE. Bo pytają o to TRZY miejsca: szablon
	 * (co narysować), warstwa SEO (o czym wolno powiedzieć w danych
	 * strukturalnych) i od W4 panel (w jakiej kolejności pokazać zakładki
	 * sekcji). Gdy każde miało własną listę, dało się je rozjechać — i test
	 * negatywny to pokazał: sekcja FAQ usunięta ze strony nadal wystawiała
	 * `FAQPage` z pytaniami, których klient nie widzi. Jedna lista czyni ten
	 * rozjazd niemożliwym, zamiast pilnowanym.
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
	 * KOLEJNOŚĆ SEKCJI W PANELU — wyprowadzona, nie wpisana.
	 *
	 * Właściciel ma wypełniać sekcje w tej kolejności, w jakiej zobaczy je
	 * kupujący (zasada z D6). Lista powstaje z `KOLEJNOSC`, więc nowy rodzaj
	 * dopisany do strony sam wchodzi do panelu; `hero` i `guarantee` stoją
	 * tam, gdzie strona je rysuje (przed rytmem i w karcie oferty), a na
	 * końcu dokładamy każdy rodzaj, którego strona jeszcze nie umieściła —
	 * dzięki temu rodzaj z kontraktu NIE MOŻE wypaść z panelu.
	 *
	 * @return string[]
	 */
	public static function kolejnosc_w_panelu(): array {
		$kolejnosc = array( 'hero' );
		foreach ( self::KOLEJNOSC as $pozycja ) {
			if ( '#cena' === $pozycja[0] ) {
				$kolejnosc[] = 'guarantee';
				continue;
			}
			if ( ! str_starts_with( $pozycja[0], '#' ) ) {
				$kolejnosc[] = $pozycja[0];
			}
		}
		foreach ( self::rodzaje() as $rodzaj ) {
			if ( ! in_array( $rodzaj, $kolejnosc, true ) ) {
				$kolejnosc[] = $rodzaj;
			}
		}
		return array_values( array_intersect( $kolejnosc, self::rodzaje() ) );
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
	 * Nazwa i cel rodzaju sekcji — do nagłówka w panelu.
	 *
	 * @param string $rodzaj Rodzaj sekcji.
	 * @return array{nazwa:string,cel:string}|null
	 */
	public static function opis( string $rodzaj ): ?array {
		if ( ! isset( self::SCHEMATY[ $rodzaj ] ) ) {
			return null;
		}
		return array(
			'nazwa' => self::SCHEMATY[ $rodzaj ]['nazwa'],
			'cel'   => self::SCHEMATY[ $rodzaj ]['cel'],
		);
	}

	/**
	 * Opis pól jednego rodzaju sekcji.
	 *
	 * @param string $rodzaj Rodzaj sekcji.
	 * @return array<string,array<string,mixed>>
	 */
	public static function pola( string $rodzaj ): array {
		return self::SCHEMATY[ $rodzaj ]['pola'] ?? array();
	}

	/**
	 * Sprawdza treść jednej sekcji POBŁAŻLIWIE — do renderowania strony.
	 *
	 * @param string $rodzaj Rodzaj sekcji (kolumna `kind`).
	 * @param mixed  $tresc  Treść po `json_decode`.
	 * @return array<string,mixed>|null Sprawdzona treść albo null (sekcja znika).
	 */
	public static function sprawdz( string $rodzaj, $tresc ): ?array {
		if ( ! isset( self::SCHEMATY[ $rodzaj ] ) ) {
			return null;
		}
		return Aai_Sklep_Pola::poblazliwie( self::pola( $rodzaj ), $tresc );
	}

	/**
	 * Sprawdza treść jednej sekcji ŚCIŚLE — do zapisu z kreatora.
	 *
	 * Różnica wobec `sprawdz()` jest celowa: przy renderowaniu zła treść
	 * znika (jedna zepsuta sekcja nie wysadza oferty), przy zapisie WRACA
	 * jako błąd ze ścieżką do pola. Cicho odsiana treść wygląda dla
	 * właściciela jak utrata pracy — a to najgorsza klasa błędu w tym
	 * projekcie.
	 *
	 * @param string               $rodzaj  Rodzaj sekcji.
	 * @param mixed                $tresc   Treść z formularza.
	 * @param string               $sciezka Przedrostek ścieżki błędu.
	 * @param array<string,string> $bledy   Zebrane błędy (przez referencję).
	 * @return array<string,mixed>
	 */
	public static function sprawdz_scisle( string $rodzaj, $tresc, string $sciezka, array &$bledy ): array {
		if ( ! isset( self::SCHEMATY[ $rodzaj ] ) ) {
			$bledy[ $sciezka ] = sprintf(
				/* translators: %s: nazwa rodzaju sekcji. */
				__( 'Nieznany rodzaj sekcji: %s', 'aai-sklep' ),
				$rodzaj
			);
			return array();
		}
		return Aai_Sklep_Pola::scisle( self::pola( $rodzaj ), $tresc, $sciezka, $bledy );
	}
}
