<?php
/**
 * Proza lekcji (Markdown) → HTML z nadaną strukturą.
 *
 * PORT `tools/podglad-kursow/tresc.mjs` — narzędzia, którym powstał podgląd
 * kursów przyjęty przez właściciela w 0.34.0. Tamten stoi na `marked`
 * z riga; tutaj musimy złożyć Markdown SAMI, bo wtyczka WordPressa ma się
 * wgrywać jako katalog plików, bez Composera i bez zależności (zasada z W1).
 *
 * DLACZEGO NIE „JAKIŚ PARSER MARKDOWNA". Bo nie potrzebujemy WSZYSTKIEGO —
 * potrzebujemy dokładnie tego, co jest w prozie obu kursów. Zakres jest
 * ZMIERZONY na 73 plikach, nie zgadnięty: nagłówki 73/73, listy zagnieżdżone
 * 73/73, bloki kodu 73/73, tabele 73/73, cytaty 34/73, obrazy 64/73,
 * odsyłacze 64/73, linia pozioma 73/73, listy numerowane 73/73. Poza tym
 * zakresem proza nie ma nic — nawet surowego HTML-u (jedyne trzy „tagi"
 * w całej prozie to `<instructions>`, `<context>` i `<input>` w PODPISIE
 * zrzutu, czyli tekst do pokazania, a nie znaczniki do wykonania).
 *
 * DLATEGO UCIEKAMY WSZYSTKO. Renderer nie przepuszcza surowego HTML-u
 * z treści. To nie jest ostrożność na wyrost: materiał kursu wchodzi
 * kreatorem, a kreator ma pole tekstowe — gdyby przepuszczał znaczniki,
 * pierwsze wklejone `<script>` byłoby wykonalne u każdego czytelnika.
 * Cena jest zerowa, bo proza HTML-u nie używa.
 *
 * ASERCJA ZAMIAST NADZIEI. Po złożeniu sprawdzamy, czy w wyjściu nie
 * został surowy znacznik Markdowna (nagłówek, ogrodzenie kodu, wiersz
 * tabeli, nawias odsyłacza). Konstrukcja, której renderer nie zna, ma
 * ZATRZYMAĆ stronę, a nie pokazać klientowi `## Czego się nauczysz`
 * jako zdanie. Ta sama decyzja co przy spłaszczaniu sekcji do Tutora.
 *
 * TREŚĆ ZOSTAJE NIETKNIĘTA. Rozpoznanie sekcji („Czego się nauczysz",
 * „Zrób to teraz", „Zapamiętaj", „Co dalej") działa po nagłówkach, które
 * w prozie JUŻ SĄ — ani jedno słowo nie jest dopisywane ani wycinane
 * (polecenie właściciela z 2026-08-24: „to jest redesign UI/UX, nie
 * przebudowa treści").
 *
 * @package Aai_Sklep
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Składanie prozy lekcji do HTML-u.
 */
final class Aai_Sklep_Proza {

	/**
	 * Rodzaje sekcji rozpoznawane po POCZĄTKU nagłówka.
	 *
	 * Zaczepienie na początku, a nie na całości, jest celowe: w prozie
	 * trafiają się warianty („Prompty z tej lekcji (do biblioteki promptów)",
	 * „Zrób to teraz (10 minut)"). Dopasowanie do pełnego napisu wypadałoby
	 * z rozpoznania przy każdym takim doprecyzowaniu, a sekcja po cichu
	 * traciłaby oprawę.
	 */
	private const RODZAJE = array(
		array( 'wzorzec' => '/^Czego się nauczysz/ui', 'typ' => 'cele', 'ikona' => 'target' ),
		array( 'wzorzec' => '/^Zrób to teraz/ui', 'typ' => 'cwiczenie', 'ikona' => 'terminal' ),
		array( 'wzorzec' => '/^Prompty z tej lekcji/ui', 'typ' => 'prompty', 'ikona' => 'sparkles' ),
		array( 'wzorzec' => '/^Gdy coś nie działa/ui', 'typ' => 'diagnostyka', 'ikona' => 'settings' ),
		array( 'wzorzec' => '/^Zapamiętaj/ui', 'typ' => 'zapamietaj', 'ikona' => 'book' ),
		array( 'wzorzec' => '/^Co dalej/ui', 'typ' => 'co-dalej', 'ikona' => 'bridge' ),
		array( 'wzorzec' => '/^Pytania do wykonawcy/ui', 'typ' => 'pytania', 'ikona' => 'help' ),
		array( 'wzorzec' => '/^Materiały dodatkowe/ui', 'typ' => 'materialy', 'ikona' => 'book' ),
		array( 'wzorzec' => '/^Powiązane/ui', 'typ' => 'materialy', 'ikona' => 'compass' ),
	);

	/**
	 * Wzorce, których w gotowym HTML-u być NIE MOŻE — czyli ślady
	 * nieprzetworzonego Markdownu w tekście widocznym dla klienta.
	 */
	private const SLADY_SUROWEGO = array(
		'/<p>#{1,6}\s/u'      => 'nagłówek',
		'/<p>```/u'           => 'ogrodzenie bloku kodu',
		'/<p>\|/u'            => 'wiersz tabeli',
		'/\]\((?!#)[^)\s]/u'  => 'odsyłacz albo obraz',
	);

	/** Mapa `ścieżka względna → dane obrazu`, ustawiana na czas składania. */
	private static array $obrazy = array();

	/**
	 * Proza → HTML.
	 *
	 * @param string                     $markdown Treść lekcji.
	 * @param array<string,array<string,mixed>> $obrazy   Mapa zrzutów: ścieżka → [url, szerokosc, wysokosc].
	 *
	 * @return array{lead:string,html:string,spis:array<int,array<string,string>>}
	 *
	 * @throws Aai_Sklep_Blad_Zapisu Gdy w wyjściu został surowy Markdown.
	 */
	public static function zloz( string $markdown, array $obrazy = array() ): array {
		self::$obrazy = $obrazy;

		$lead   = '';
		$czesci = array();
		$spis   = array();

		foreach ( self::na_sekcje( $markdown ) as $sekcja ) {
			$html = self::bloki( explode( "\n", $sekcja['md'] ) );

			if ( null === $sekcja['naglowek'] ) {
				$lead = $html;
				continue;
			}

			$id     = self::kotwica( $sekcja['naglowek'] );
			$rodzaj = self::rozpoznaj( $sekcja['naglowek'] );
			$spis[] = array( 'id' => $id, 'tekst' => self::w_linii( $sekcja['naglowek'] ) );

			if ( null !== $rodzaj ) {
				$odznaka = self::odznaka( $sekcja['naglowek'] );
				$podpis  = null === $odznaka
					? $sekcja['naglowek']
					: (string) preg_replace( '/\s*\([^)]+\)\s*$/u', '', $sekcja['naglowek'] );
				// „Co dalej" to most do następnej lekcji — własne pudełko, nie blok.
				$klasa = 'co-dalej' === $rodzaj['typ'] ? 'aai-most' : 'aai-blok aai-blok-' . $rodzaj['typ'];

				$czesci[] = '<section id="' . esc_attr( $id ) . '" class="' . esc_attr( $klasa ) . '">'
					. '<h2 class="aai-blok-naglowek">' . Aai_Sklep_Widok::ikona( $rodzaj['ikona'] )
					. '<span>' . self::uciekaj( $podpis ) . '</span>'
					// Spacja przed odznaką nie jest ozdobą: bez niej `textContent`
					// skleja „Zrób to teraz10 minut" dla czytnika ekranu i dla
					// każdego skryptu, który porównuje treść ze źródłem.
					. ( null === $odznaka ? '' : ' <span class="aai-blok-odznaka">' . self::uciekaj( $odznaka ) . '</span>' )
					. "</h2>\n" . $html . '</section>';
				continue;
			}

			$numerowany = self::rozbij_numerowany( $sekcja['naglowek'] );
			if ( null !== $numerowany ) {
				$czesci[] = '<h2 id="' . esc_attr( $id ) . '"><span class="aai-h2-nr">'
					. self::uciekaj( $numerowany['numer'] ) . '</span> '
					. self::w_linii( $numerowany['tytul'] ) . "</h2>\n" . $html;
				continue;
			}

			$czesci[] = '<h2 id="' . esc_attr( $id ) . '">' . self::w_linii( $sekcja['naglowek'] ) . "</h2>\n" . $html;
		}

		$wynik = array(
			'lead' => $lead,
			'html' => implode( "\n", $czesci ),
			'spis' => $spis,
		);

		self::sprawdz_slady( $wynik['lead'] . $wynik['html'] );
		self::$obrazy = array();

		return $wynik;
	}

	/**
	 * Sam spis sekcji — bez składania całej lekcji.
	 *
	 * @param string $markdown Treść lekcji.
	 *
	 * @return array<int,array<string,string>>
	 */
	public static function spis( string $markdown ): array {
		$spis = array();
		foreach ( self::na_sekcje( $markdown ) as $sekcja ) {
			if ( null === $sekcja['naglowek'] ) {
				continue;
			}
			$spis[] = array(
				'id'    => self::kotwica( $sekcja['naglowek'] ),
				'tekst' => self::w_linii( $sekcja['naglowek'] ),
			);
		}
		return $spis;
	}

	/* ————————————————————— cięcie na sekcje ————————————————————— */

	/**
	 * Dzieli prozę na sekcje po nagłówkach `## `.
	 *
	 * Ogrodzenia kodu są ŚLEDZONE, bo lekcje o Markdownie i o Claude Code
	 * pokazują w blokach kodu tekst zaczynający się od `## ` — bez tego
	 * licznika przykład w bloku kodu rozcinałby lekcję w połowie. Ta sama
	 * klasa pułapki co w `straznik-linkow`.
	 *
	 * @param string $md Proza.
	 *
	 * @return array<int,array{naglowek:string|null,md:string}>
	 */
	private static function na_sekcje( string $md ): array {
		$sekcje  = array();
		$biezaca = array(
			'naglowek' => null,
			'linie'    => array(),
		);
		$w_kodzie   = false;
		$ogrodzenie = '';

		foreach ( explode( "\n", str_replace( "\r\n", "\n", $md ) ) as $linia ) {
			if ( preg_match( '/^\s*(`{3,}|~{3,})/', $linia, $dopasowanie ) ) {
				if ( ! $w_kodzie ) {
					$w_kodzie   = true;
					$ogrodzenie = $dopasowanie[1];
				} elseif ( str_starts_with( ltrim( $linia ), $ogrodzenie ) ) {
					// Ogrodzenie zamyka się dopiero RÓWNIE DŁUGIM albo dłuższym
					// (CommonMark). Lekcja o Markdownie pokazuje blok kodu
					// WEWNĄTRZ bloku kodu — czterema apostrofami wokół trzech —
					// i przy zamykaniu „na trzy" rozpadał się cały jej środek.
					$w_kodzie = false;
				}
			}

			if ( ! $w_kodzie && preg_match( '/^##\s+(.+?)\s*$/u', $linia, $dopasowanie ) ) {
				$sekcje[] = $biezaca;
				$biezaca  = array(
					'naglowek' => $dopasowanie[1],
					'linie'    => array(),
				);
				continue;
			}
			$biezaca['linie'][] = $linia;
		}
		$sekcje[] = $biezaca;

		$wynik = array();
		foreach ( $sekcje as $sekcja ) {
			$tresc = trim( implode( "\n", $sekcja['linie'] ) );
			if ( null === $sekcja['naglowek'] && '' === $tresc ) {
				continue;
			}
			$wynik[] = array(
				'naglowek' => $sekcja['naglowek'],
				'md'       => $tresc,
			);
		}
		return $wynik;
	}

	/* ————————————————————— bloki ————————————————————— */

	/**
	 * Linie Markdowna → HTML blokowy.
	 *
	 * @param array<int,string> $linie Linie treści.
	 */
	private static function bloki( array $linie ): string {
		$wynik = array();
		$i     = 0;
		$ile   = count( $linie );

		while ( $i < $ile ) {
			$linia = $linie[ $i ];

			// pusta linia
			if ( '' === trim( $linia ) ) {
				++$i;
				continue;
			}

			// komentarz HTML (np. dawne znaczniki `<!-- ZRZUT: … -->`) — pomijamy
			if ( preg_match( '/^\s*<!--/', $linia ) ) {
				while ( $i < $ile && ! str_contains( $linie[ $i ], '-->' ) ) {
					++$i;
				}
				++$i;
				continue;
			}

			// blok kodu
			if ( preg_match( '/^\s*(`{3,}|~{3,})\s*([a-zA-Z0-9+#_-]*)\s*$/', $linia, $dopasowanie ) ) {
				$wynik[] = self::blok_kodu( $linie, $i, $dopasowanie[1], $dopasowanie[2] );
				continue;
			}

			// nagłówek niższego rzędu (`##` zjadło cięcie na sekcje)
			if ( preg_match( '/^(#{3,6})\s+(.+?)\s*$/u', $linia, $dopasowanie ) ) {
				$poziom  = strlen( $dopasowanie[1] );
				$wynik[] = '<h' . $poziom . ' id="' . esc_attr( self::kotwica( $dopasowanie[2] ) ) . '">'
					. self::w_linii( $dopasowanie[2] ) . '</h' . $poziom . '>';
				++$i;
				continue;
			}

			// linia pozioma
			if ( preg_match( '/^\s*([-*_])(\s*\1){2,}\s*$/', $linia ) ) {
				$wynik[] = '<hr>';
				++$i;
				continue;
			}

			// tabela: wiersz z potokiem, a pod nim wiersz rozdzielający
			if ( str_contains( $linia, '|' ) && isset( $linie[ $i + 1 ] )
				&& preg_match( '/^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/', $linie[ $i + 1 ] )
				&& str_contains( $linie[ $i + 1 ], '-' ) ) {
				$wynik[] = self::tabela( $linie, $i );
				continue;
			}

			// cytat
			if ( preg_match( '/^\s*>\s?/', $linia ) ) {
				$srodek = array();
				while ( $i < $ile && preg_match( '/^\s*>\s?(.*)$/', $linie[ $i ], $dopasowanie ) ) {
					$srodek[] = $dopasowanie[1];
					++$i;
				}
				$wynik[] = '<blockquote>' . self::bloki( $srodek ) . '</blockquote>';
				continue;
			}

			// lista
			if ( self::czy_pozycja( $linia ) ) {
				$wynik[] = self::lista( $linie, $i, self::wciecie( $linia ) );
				continue;
			}

			// akapit
			$akapit = array();
			while ( $i < $ile && '' !== trim( $linie[ $i ] ) && ! self::zaczyna_blok( $linie, $i ) ) {
				$akapit[] = trim( $linie[ $i ] );
				++$i;
			}
			if ( array() !== $akapit ) {
				$wynik[] = self::akapit( implode( "\n", $akapit ) );
			}
		}

		return implode( "\n", array_filter( $wynik, static fn( $b ) => '' !== $b ) );
	}

	/**
	 * Czy linia otwiera blok inny niż akapit (do przerwania akapitu).
	 *
	 * @param array<int,string> $linie Linie.
	 * @param int               $i     Indeks.
	 */
	private static function zaczyna_blok( array $linie, int $i ): bool {
		$linia = $linie[ $i ];
		if ( preg_match( '/^\s*(`{3,}|~{3,})/', $linia ) ) {
			return true;
		}
		if ( preg_match( '/^#{2,6}\s/u', $linia ) ) {
			return true;
		}
		if ( preg_match( '/^\s*([-*_])(\s*\1){2,}\s*$/', $linia ) ) {
			return true;
		}
		if ( preg_match( '/^\s*>\s?/', $linia ) ) {
			return true;
		}
		if ( self::czy_pozycja( $linia ) ) {
			return true;
		}
		if ( preg_match( '/^\s*<!--/', $linia ) ) {
			return true;
		}
		return str_contains( $linia, '|' ) && isset( $linie[ $i + 1 ] )
			&& (bool) preg_match( '/^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/', $linie[ $i + 1 ] );
	}

	/**
	 * Blok kodu w panelu z etykietą języka.
	 *
	 * Przycisk kopiowania dokłada skrypt, więc bez JavaScriptu zostaje sam
	 * blok kodu — czytelny jak dotąd.
	 *
	 * @param array<int,string> $linie      Linie.
	 * @param int               $i          Indeks (przez referencję).
	 * @param string            $ogrodzenie Znaki ogrodzenia.
	 * @param string            $jezyk      Nazwa języka albo pusty napis.
	 */
	private static function blok_kodu( array $linie, int &$i, string $ogrodzenie, string $jezyk ): string {
		$znak  = substr( $ogrodzenie, 0, 1 );
		$ile   = count( $linie );
		$kod   = array();
		++$i;

		// Zamyka RÓWNIE DŁUGIE albo dłuższe ogrodzenie z tego samego znaku
		// (CommonMark) — patrz komentarz przy cięciu na sekcje.
		$zamkniecie = '/^\s*' . preg_quote( $ogrodzenie, '/' ) . preg_quote( $znak, '/' ) . '*\s*$/';

		while ( $i < $ile && ! preg_match( $zamkniecie, $linie[ $i ] ) ) {
			$kod[] = $linie[ $i ];
			++$i;
		}
		++$i; // linia zamykająca

		$etykieta = '' === $jezyk ? 'tekst' : (string) preg_replace( '/[^a-zA-Z0-9+#_-]/', '', $jezyk );

		return '<div class="aai-kod" data-jezyk="' . esc_attr( $etykieta ) . '">'
			. '<div class="aai-kod-pasek"><span class="aai-kod-jezyk">' . esc_html( $etykieta ) . '</span></div>'
			. '<pre><code>' . self::uciekaj( implode( "\n", $kod ) ) . '</code></pre>'
			. '</div>';
	}

	/**
	 * Tabela w kontenerze, który przewija się w poziomie zamiast strony.
	 *
	 * @param array<int,string> $linie Linie.
	 * @param int               $i     Indeks (przez referencję).
	 */
	private static function tabela( array $linie, int &$i ): string {
		$naglowki   = self::komorki( $linie[ $i ] );
		$wyrownania = array();
		foreach ( self::komorki( $linie[ $i + 1 ] ) as $spec ) {
			$spec         = trim( $spec );
			$od_lewej     = str_starts_with( $spec, ':' );
			$od_prawej    = str_ends_with( $spec, ':' );
			$wyrownania[] = $od_lewej && $od_prawej ? 'center' : ( $od_prawej ? 'right' : ( $od_lewej ? 'left' : '' ) );
		}
		$i += 2;

		$wiersze = array();
		$ile     = count( $linie );
		while ( $i < $ile && '' !== trim( $linie[ $i ] ) && str_contains( $linie[ $i ], '|' ) ) {
			$wiersze[] = self::komorki( $linie[ $i ] );
			++$i;
		}

		$styl = static function ( int $nr ) use ( $wyrownania ): string {
			$w = $wyrownania[ $nr ] ?? '';
			return '' === $w ? '' : ' style="text-align:' . $w . '"';
		};

		$html = '<div class="aai-tabela"><table><thead><tr>';
		foreach ( $naglowki as $nr => $komorka ) {
			$html .= '<th' . $styl( $nr ) . '>' . self::w_linii( $komorka ) . '</th>';
		}
		$html .= '</tr></thead><tbody>';
		foreach ( $wiersze as $wiersz ) {
			$html .= '<tr>';
			foreach ( $wiersz as $nr => $komorka ) {
				$html .= '<td' . $styl( $nr ) . '>' . self::w_linii( $komorka ) . '</td>';
			}
			$html .= '</tr>';
		}
		return $html . '</tbody></table></div>';
	}

	/**
	 * Wiersz tabeli → komórki.
	 *
	 * Dzielimy po potokach NIEPOPRZEDZONYCH ukośnikiem — dokładnie tak, jak
	 * robi to GFM (i `marked`, którym powstał podgląd): potok w kodzie
	 * w linii też rozcina komórkę, więc autor musi go uciec `\|`. Zgodność
	 * z tamtym zachowaniem jest ważniejsza od „mądrzejszej" reguły, bo
	 * proza jest napisana pod nie.
	 *
	 * @param string $linia Wiersz tabeli.
	 *
	 * @return array<int,string>
	 */
	private static function komorki( string $linia ): array {
		$linia = trim( $linia );
		$linia = (string) preg_replace( '/^\||\|$/', '', $linia );
		$czesci = preg_split( '/(?<!\\\\)\|/', $linia );
		return array_map(
			static fn( $k ) => trim( str_replace( '\|', '|', (string) $k ) ),
			(array) $czesci
		);
	}

	/**
	 * Lista — z zagnieżdżeniem po wcięciu.
	 *
	 * @param array<int,string> $linie    Linie.
	 * @param int               $i        Indeks (przez referencję).
	 * @param int               $wciecie  Wcięcie tego poziomu.
	 */
	private static function lista( array $linie, int &$i, int $wciecie ): string {
		$ile          = count( $linie );
		$numerowana   = null;
		$pozycje      = array();
		$luzna        = false;
		$biezaca      = null;

		while ( $i < $ile ) {
			$linia = $linie[ $i ];

			if ( '' === trim( $linia ) ) {
				// Pusta linia kończy listę tylko wtedy, gdy dalej nie ma już
				// jej ciągu dalszego. Inaczej lista jest „luźna" i jej pozycje
				// dostają akapity — tak samo rozstrzyga to GFM.
				$dalej = $i + 1;
				while ( $dalej < $ile && '' === trim( $linie[ $dalej ] ) ) {
					++$dalej;
				}
				if ( $dalej >= $ile ) {
					break;
				}
				$nastepna = $linie[ $dalej ];
				$jest_ciag = ( self::czy_pozycja( $nastepna ) && self::wciecie( $nastepna ) >= $wciecie )
					|| ( '' !== trim( $nastepna ) && self::wciecie( $nastepna ) > $wciecie );
				if ( ! $jest_ciag ) {
					break;
				}
				$luzna = true;
				$i     = $dalej;
				continue;
			}

			$moje_wciecie = self::wciecie( $linia );

			if ( self::czy_pozycja( $linia ) && $moje_wciecie <= $wciecie ) {
				if ( $moje_wciecie < $wciecie ) {
					break;
				}
				preg_match( '/^\s*([-*+]|\d+[.)])\s+(.*)$/u', $linia, $dopasowanie );
				$czy_numerowana = (bool) preg_match( '/^\d/', $dopasowanie[1] );
				if ( null === $numerowana ) {
					$numerowana = $czy_numerowana;
				} elseif ( $numerowana !== $czy_numerowana ) {
					break; // inny rodzaj listy = nowa lista
				}
				$pozycje[] = array( $dopasowanie[2] );
				$biezaca   = count( $pozycje ) - 1;
				++$i;
				continue;
			}

			if ( $moje_wciecie > $wciecie && null !== $biezaca ) {
				// ciąg dalszy pozycji albo lista zagnieżdżona — zdejmujemy
				// wcięcie tego poziomu i oddajemy niżej
				$pozycje[ $biezaca ][] = substr( $linia, min( $moje_wciecie, $wciecie + 2 ) );
				++$i;
				continue;
			}

			break;
		}

		$znacznik = true === $numerowana ? 'ol' : 'ul';
		$html     = '<' . $znacznik . '>';
		foreach ( $pozycje as $pozycja ) {
			$tresc = self::bloki( $pozycja );
			/*
			 * LISTA ZWARTA NIE MA AKAPITÓW. Pozycja z listą zagnieżdżoną
			 * (a takich w prozie jest sporo — cała hierarchia GitHub Actions
			 * to cztery poziomy) niesie więcej niż jedną linię, ale dopóki
			 * nie ma między nimi pustej linii, jej pierwszy tekst zostaje
			 * gołym tekstem, a nie `<p>`. Tak każe GFM i tak składa to
			 * narzędzie, którym powstał przyjęty podgląd.
			 */
			if ( ! $luzna ) {
				$tresc = (string) preg_replace( '~^<p>([\s\S]*?)</p>\s*~u', '$1', $tresc, 1 );
			}
			$html .= '<li>' . $tresc . '</li>';
		}
		return $html . '</' . $znacznik . '>';
	}

	/** Czy linia jest pozycją listy. */
	private static function czy_pozycja( string $linia ): bool {
		return (bool) preg_match( '/^\s*([-*+]|\d+[.)])\s+\S/u', $linia );
	}

	/** Wcięcie linii w spacjach (tabulator liczony jako cztery). */
	private static function wciecie( string $linia ): int {
		$rozwiniete = str_replace( "\t", '    ', $linia );
		return strlen( $rozwiniete ) - strlen( ltrim( $rozwiniete ) );
	}

	/**
	 * Akapit — a jeśli składa się z samych obrazów, to figury.
	 *
	 * BŁĄD, KTÓRY TU MIESZKAŁ W PODGLĄDZIE (znaleziony 2026-08-24): dwa
	 * zrzuty w sąsiednich wierszach Markdowna to JEDEN akapit, a dopasowanie
	 * brało tylko obraz sam w akapicie — takie pary zostawały surowym
	 * `<img>` ze ścieżką ze źródła. `<figure>` w środku `<p>` jest zresztą
	 * niepoprawne i przeglądarka i tak zamknęłaby akapit gdzie indziej.
	 *
	 * @param string $tekst Treść akapitu.
	 */
	private static function akapit( string $tekst ): string {
		$bez_obrazow = trim( (string) preg_replace( '/!\[[^\]]*\]\([^)]*\)/u', '', $tekst ) );
		if ( '' === $bez_obrazow && preg_match( '/!\[/u', $tekst ) ) {
			$figury = '';
			if ( preg_match_all( '/!\[([^\]]*)\]\(([^)]+)\)/u', $tekst, $dopasowania, PREG_SET_ORDER ) ) {
				foreach ( $dopasowania as $obraz ) {
					$figury .= self::figura( $obraz[1], $obraz[2] );
				}
			}
			return $figury;
		}
		return '<p>' . self::w_linii( $tekst ) . '</p>';
	}

	/**
	 * Zrzut ekranu jako `<figure>` z podpisem i ZAREZERWOWANYM miejscem.
	 *
	 * `width`/`height` bierzemy z biblioteki mediów, żeby przeglądarka znała
	 * proporcje przed pobraniem obrazu — inaczej 148 zrzutów przepychałoby
	 * tekst przy każdym doładowaniu (CLS, metryka trzymana w tym projekcie
	 * na zerze).
	 *
	 * @param string $alt    Podpis.
	 * @param string $zrodlo Ścieżka z prozy.
	 */
	private static function figura( string $alt, string $zrodlo ): string {
		$zrodlo = trim( $zrodlo );
		$obraz  = self::$obrazy[ $zrodlo ] ?? null;
		/*
		 * Podpis przechodzi przez skład w linii i wraca jako CZYSTY TEKST.
		 * Podpisy zrzutów są pisane Markdownem („terminal z uruchomionym
		 * `claude`"), a atrybut `alt` nie może nieść znaczników — zostawione
		 * odwrócone apostrofy pokazywałyby się dosłownie i czytnikowi ekranu,
		 * i pod obrazem. Tak samo rozstrzyga to narzędzie podglądu.
		 */
		$alt = self::tekst_prosty( $alt );

		if ( null === $obraz ) {
			/*
			 * Widoczny brak zamiast zepsutego obrazka. Zepsuty obrazek
			 * wygląda jak awaria strony; podpisany brak mówi, czego nie ma
			 * — i tak samo robi podgląd kursów, z którego ten widok pochodzi.
			 */
			return '<div class="aai-brak-zrzutu"><span class="aai-brak-etykieta">brak pliku</span>'
				. '<span class="aai-brak-podpis">' . self::uciekaj( $zrodlo ) . '</span></div>';
		}

		$rozmiar = '';
		if ( ! empty( $obraz['szerokosc'] ) && ! empty( $obraz['wysokosc'] ) ) {
			$rozmiar = ' width="' . (int) $obraz['szerokosc'] . '" height="' . (int) $obraz['wysokosc'] . '"';
		}

		return '<figure class="aai-zrzut">'
			. '<img src="' . esc_url( (string) $obraz['url'] ) . '" alt="' . esc_attr( $alt ) . '"'
			. $rozmiar . ' loading="lazy" decoding="async">'
			. ( '' === $alt ? '' : '<figcaption>' . self::uciekaj( $alt ) . '</figcaption>' )
			. '</figure>';
	}

	/**
	 * Markdown w linii → czysty tekst (do atrybutów i podpisów).
	 *
	 * @param string $tekst Tekst źródłowy.
	 */
	private static function tekst_prosty( string $tekst ): string {
		$html = self::w_linii( $tekst );
		return html_entity_decode( wp_strip_all_tags( $html ), ENT_QUOTES, 'UTF-8' );
	}

	/* ————————————————————— skład w linii ————————————————————— */

	/**
	 * Markdown w linii → HTML.
	 *
	 * KOLEJNOŚĆ MA ZNACZENIE. Najpierw wyjmujemy kod w odwróconych
	 * apostrofach i podmieniamy go na znacznik zastępczy — inaczej
	 * gwiazdka albo podkreślenie WEWNĄTRZ kodu (`git log --oneline`,
	 * `__init__`) zostałyby wzięte za pogrubienie i kod pokazałby się
	 * z kursywą w środku.
	 *
	 * @param string $tekst Tekst źródłowy.
	 */
	private static function w_linii( string $tekst ): string {
		$kody = array();
		$tekst = (string) preg_replace_callback(
			'/(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/u',
			static function ( array $m ) use ( &$kody ): string {
				$kody[] = '<code>' . self::uciekaj( trim( $m[2] ) ) . '</code>';
				return "\x00KOD" . ( count( $kody ) - 1 ) . "\x00";
			},
			$tekst
		);

		// obrazy w linii (rzadkie — zwykle stoją same w akapicie)
		$obrazy = array();
		$tekst  = (string) preg_replace_callback(
			'/!\[([^\]]*)\]\(([^)]+)\)/u',
			static function ( array $m ) use ( &$obrazy ): string {
				$obrazy[] = self::figura( $m[1], $m[2] );
				return "\x00OBR" . ( count( $obrazy ) - 1 ) . "\x00";
			},
			$tekst
		);

		// odsyłacze
		$odsylacze = array();
		$tekst     = (string) preg_replace_callback(
			'/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/u',
			static function ( array $m ) use ( &$odsylacze ): string {
				$adres = self::adres( $m[2] );
				if ( null === $adres ) {
					// Adresu, którego nie wolno wydrukować, nie zamieniamy
					// w martwy odsyłacz — zostaje sam tekst. Pytamy „czy wolno
					// to WYDRUKOWAĆ", nie „czy da się pod to wysłać żądanie"
					// (BLAD-017).
					$odsylacze[] = self::uciekaj( $m[1] );
					return "\x00ODS" . ( count( $odsylacze ) - 1 ) . "\x00";
				}
				$zewnetrzny  = (bool) preg_match( '~^https?://~i', $adres );
				$odsylacze[] = '<a href="' . esc_url( $adres ) . '"'
					. ( $zewnetrzny ? ' target="_blank" rel="noopener noreferrer"' : '' )
					. '>' . self::uciekaj( $m[1] ) . '</a>';
				return "\x00ODS" . ( count( $odsylacze ) - 1 ) . "\x00";
			},
			$tekst
		);

		$tekst = self::uciekaj( $tekst );

		/*
		 * Reguła ograniczników z GFM, nie „cokolwiek między gwiazdkami":
		 * znacznik otwierający nie może stać PRZED spacją, a zamykający PO
		 * spacji. Bez tego `** \ + Enter**` (przykład z lekcji o Claude Code)
		 * robi się pogrubieniem u nas, a zostaje tekstem w `marked` — i cała
		 * lekcja rozjeżdża się od tego miejsca. Wewnątrz pogrubienia wolno
		 * mieć POJEDYNCZĄ gwiazdkę, więc treści nie odcinamy na `[^*]`.
		 */
		$tekst = (string) preg_replace(
			'/\*\*(?=[^\s*])((?:[^*]|\*(?!\*))+?)(?<=[^\s*])\*\*/u',
			'<strong>$1</strong>',
			$tekst
		);
		/*
		 * Kursywa: dwie rzeczy naraz.
		 *
		 * (1) WOLNO jej przejść przez koniec wiersza — akapit w prozie jest
		 *     łamany co ~100 znaków, a cytaty ze źródeł bywają dłuższe.
		 * (2) Składamy ją W PĘTLI, od środka. Kursywa bywa ZAGNIEŻDŻONA
		 *     („*… (ang. *milestones*), żeby je organizować*" z lekcji
		 *     o issues): jedno przejście złoży tylko wewnętrzną parę, bo
		 *     treść zewnętrznej zawiera wtedy gwiazdkę. Powtarzamy, aż nic
		 *     się nie zmienia — sufit pętli jest po to, żeby wzorzec, który
		 *     kiedyś zacznie zapętlać, ZATRZYMAŁ się, a nie zawiesił stronę.
		 */
		for ( $obrot = 0; $obrot < 5; ++$obrot ) {
			$przed = $tekst;
			$tekst = (string) preg_replace( '/(?<![\w*])\*(?=[^\s*])([^*]+?)(?<=[^\s*])\*(?![\w*])/u', '<em>$1</em>', $tekst );
			$tekst = (string) preg_replace( '/(?<![\w_])_(?=[^\s_])([^_]+?)(?<=[^\s_])_(?![\w_])/u', '<em>$1</em>', $tekst );
			if ( $przed === $tekst ) {
				break;
			}
		}
		$tekst = (string) preg_replace( '/~~(?=[^\s~])([^~]+?)(?<=[^\s~])~~/u', '<del>$1</del>', $tekst );

		// twarde przełamanie: dwie spacje na końcu linii
		$tekst = (string) preg_replace( '/ {2,}\n/', "<br>\n", $tekst );

		foreach ( $odsylacze as $nr => $html ) {
			$tekst = str_replace( "\x00ODS" . $nr . "\x00", $html, $tekst );
		}
		foreach ( $obrazy as $nr => $html ) {
			$tekst = str_replace( "\x00OBR" . $nr . "\x00", $html, $tekst );
		}
		foreach ( $kody as $nr => $html ) {
			$tekst = str_replace( "\x00KOD" . $nr . "\x00", $html, $tekst );
		}

		return $tekst;
	}

	/**
	 * Adres, który wolno wydrukować — albo null.
	 *
	 * BLAD-017 w pigułce: `wp_http_validate_url()` jest funkcją od WYCHODZĄCYCH
	 * żądań (SSRF) i rozwiązuje nazwę w DNS-ie, więc odsiewa odnośniki do
	 * domen, których jeszcze nie ma. Tutaj pytamy o co innego: czy to jest
	 * adres, który wolno wstawić do `href`.
	 *
	 * @param string $adres Adres z prozy.
	 */
	private static function adres( string $adres ): ?string {
		$adres = trim( $adres );
		if ( '' === $adres ) {
			return null;
		}
		if ( str_starts_with( $adres, '#' ) || str_starts_with( $adres, '/' ) ) {
			return $adres;
		}
		$schemat = strtolower( (string) wp_parse_url( $adres, PHP_URL_SCHEME ) );
		if ( in_array( $schemat, array( 'http', 'https', 'mailto' ), true ) ) {
			return $adres;
		}
		return null;
	}

	/* ————————————————————— drobiazgi ————————————————————— */

	/**
	 * Rozpoznanie rodzaju sekcji po nagłówku.
	 *
	 * @param string $naglowek Nagłówek sekcji.
	 *
	 * @return array<string,string>|null
	 */
	private static function rozpoznaj( string $naglowek ): ?array {
		foreach ( self::RODZAJE as $rodzaj ) {
			if ( preg_match( $rodzaj['wzorzec'], $naglowek ) ) {
				return $rodzaj;
			}
		}
		return null;
	}

	/** Odznaka z nawiasu na końcu nagłówka („Zrób to teraz (10 minut)"). */
	private static function odznaka( string $naglowek ): ?string {
		return preg_match( '/\(([^)]+)\)\s*$/u', $naglowek, $m ) ? $m[1] : null;
	}

	/**
	 * „3. Trzy drzwi do Claude" → numer i tytuł.
	 *
	 * @param string $naglowek Nagłówek.
	 *
	 * @return array{numer:string,tytul:string}|null
	 */
	private static function rozbij_numerowany( string $naglowek ): ?array {
		if ( ! preg_match( '/^(\d+)\.\s+(.*)$/u', $naglowek, $m ) ) {
			return null;
		}
		return array(
			'numer' => str_pad( $m[1], 2, '0', STR_PAD_LEFT ),
			'tytul' => $m[2],
		);
	}

	/**
	 * Kotwica sekcji — z tytułu, bo numer sam w sobie nie jest stabilny.
	 *
	 * Ta sama transliteracja co w podglądzie kursów: adres `#s-czego-sie-nauczysz`
	 * ma wyglądać tak samo w obu światach.
	 *
	 * @param string $tekst Nagłówek.
	 */
	public static function kotwica( string $tekst ): string {
		$tekst = mb_strtolower( $tekst, 'UTF-8' );
		$tekst = strtr(
			$tekst,
			array(
				'ą' => 'a',
				'à' => 'a',
				'á' => 'a',
				'â' => 'a',
				'ã' => 'a',
				'ć' => 'c',
				'ę' => 'e',
				'ł' => 'l',
				'ń' => 'n',
				'ó' => 'o',
				'ò' => 'o',
				'ô' => 'o',
				'ś' => 's',
				'ż' => 'z',
				'ź' => 'z',
			)
		);
		$tekst = (string) preg_replace( '/[^a-z0-9]+/u', '-', $tekst );
		$tekst = trim( $tekst, '-' );
		return 's-' . mb_substr( $tekst, 0, 48 );
	}

	/**
	 * Ucieczka znaków — jedna dla całego renderera.
	 *
	 * @param string $tekst Tekst.
	 */
	public static function uciekaj( string $tekst ): string {
		return str_replace(
			array( '&', '<', '>', '"' ),
			array( '&amp;', '&lt;', '&gt;', '&quot;' ),
			$tekst
		);
	}

	/**
	 * Asercja: w gotowym HTML-u nie ma surowego Markdownu.
	 *
	 * @param string $html Złożona lekcja.
	 *
	 * @throws Aai_Sklep_Blad_Zapisu Gdy coś zostało nieprzetworzone.
	 */
	private static function sprawdz_slady( string $html ): void {
		/*
		 * BLOKI KODU WYJMUJEMY PRZED SPRAWDZENIEM. Kurs o GitHubie UCZY
		 * Markdowna, więc w jego blokach kodu stoją prawdziwe `[tekst](adres)`
		 * i wiersze tabel — to treść do pokazania, nie ślad po nieudanym
		 * składzie. Dokładnie ta sama poprawka, którą przeszedł
		 * `straznik-linkow` (2026-08-18).
		 */
		$html = (string) preg_replace( '~<pre><code>[\s\S]*?</code></pre>~u', '', $html );
		$html = (string) preg_replace( '~<code>[^<]*</code>~u', '', $html );

		foreach ( self::SLADY_SUROWEGO as $wzorzec => $co ) {
			if ( preg_match( $wzorzec, $html, $m ) ) {
				throw new Aai_Sklep_Blad_Zapisu(
					sprintf(
						'proza lekcji ma nieprzetworzony %s — renderer nie zna tej konstrukcji: „%s”',
						$co,
						mb_substr( (string) $m[0], 0, 60 )
					)
				);
			}
		}
	}
}
