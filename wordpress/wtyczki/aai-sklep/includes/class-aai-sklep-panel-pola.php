<?php
/**
 * Kontrolki panelu rysowane Z OPISU PÓL.
 *
 * PO CO Z OPISU, A NIE RĘCZNIE. Bo ręcznie napisany formularz starzeje się
 * w ciszy: pole dopisane do kontraktu nie dostaje kontrolki, właściciel nie
 * ma go czym wypełnić, a strona po prostu nigdy nie dostaje tej treści.
 * Objaw żaden, strata realna. Opis pól (`Aai_Sklep_Sekcje::pola()`,
 * `Aai_Sklep_Kontrakt::pola_lekcji()`) jest tą samą tablicą, którą sprawdzana
 * jest treść — więc kontrolka nie ma jak wypaść.
 *
 * WYGLĄD: natywne komponenty kokpitu (decyzja właściciela 2026-08-25).
 * Panel ma zachowywać się jak reszta wp-admin — dziedziczy jego dostępność,
 * responsywność i przeżywa aktualizacje WordPressa. Akcent volt (`panel.css`)
 * dokładamy tam, gdzie niesie znaczenie: przycisk główny i stan sekcji.
 *
 * UMOWA Z JAVASCRIPTEM. Kontrolki sekcji i programu NIE MAJĄ atrybutu `name` —
 * są opisane atrybutami `data-aai-*`, a `panel.js` składa z nich jeden JSON
 * tuż przed wysyłką. Powód jest twardy: `max_input_vars` (domyślnie 1000)
 * ucina POST W MILCZENIU, a kurs z 41 lekcjami wystawiłby setki pól. Ucięty
 * POST to cicha utrata treści — dokładnie ta klasa błędu, której ten projekt
 * pilnuje najmocniej. Pola ukryte z JSON-em są PRZED wysyłką wypełnione
 * stanem wczytanym z bazy, więc gdyby skrypt nie wystartował, zapis jest
 * pusty w skutkach zamiast kasować kurs.
 *
 * @package Aai_Sklep
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Rysowanie pól treści w kokpicie.
 */
final class Aai_Sklep_Panel_Pola {

	/**
	 * Rysuje komplet pól jednego opisu (sekcja albo treść lekcji).
	 *
	 * @param array<string,array<string,mixed>> $pola Opis pól.
	 * @param array<string,mixed>               $stan Wartości do wpisania.
	 */
	public static function pola( array $pola, array $stan ): void {
		foreach ( $pola as $nazwa => $opis ) {
			self::pole( $nazwa, $opis, $stan[ $nazwa ] ?? null );
		}
	}

	/**
	 * Rysuje jedno pole.
	 *
	 * @param string              $nazwa   Nazwa pola.
	 * @param array<string,mixed> $opis    Opis pola.
	 * @param mixed               $wartosc Wartość.
	 */
	public static function pole( string $nazwa, array $opis, $wartosc ): void {
		$etykieta = Aai_Sklep_Pola::etykieta( $nazwa, $opis );
		?>
		<div class="aai-pole" data-aai-pole="<?php echo esc_attr( $nazwa ); ?>" data-aai-typ="<?php echo esc_attr( $opis['typ'] ); ?>">
			<label class="aai-pole__etykieta">
				<?php echo esc_html( $etykieta ); ?>
				<?php if ( ! empty( $opis['wymagane'] ) && empty( $opis['pusty_ok'] ) ) : ?>
					<span class="aai-pole__gwiazdka" aria-hidden="true">*</span>
					<span class="screen-reader-text"><?php esc_html_e( '(obowiązkowe)', 'aai-sklep' ); ?></span>
				<?php endif; ?>
			</label>
			<?php self::kontrolka( $opis, $wartosc ); ?>
			<?php if ( ! empty( $opis['pomoc'] ) ) : ?>
				<p class="description"><?php echo esc_html( $opis['pomoc'] ); ?></p>
			<?php endif; ?>
		</div>
		<?php
	}

	/**
	 * Sama kontrolka — bez etykiety i podpowiedzi.
	 *
	 * @param array<string,mixed> $opis    Opis pola.
	 * @param mixed               $wartosc Wartość.
	 */
	private static function kontrolka( array $opis, $wartosc ): void {
		switch ( $opis['typ'] ) {
			case 'lista_tekstow':
				self::lista_tekstow( $opis, is_array( $wartosc ) ? $wartosc : array() );
				return;

			case 'lista_obiektow':
				self::lista_obiektow( $opis, is_array( $wartosc ) ? $wartosc : array() );
				return;

			case 'obiekt':
				echo '<div class="aai-obiekt" data-aai-obiekt>';
				self::pola( $opis['pola'], is_array( $wartosc ) ? $wartosc : array() );
				echo '</div>';
				return;

			case 'wybor':
				self::wybor( $opis, is_scalar( $wartosc ) ? (string) $wartosc : '' );
				return;

			default:
				self::tekst( $opis, is_scalar( $wartosc ) ? (string) $wartosc : '' );
		}
	}

	/**
	 * Pole tekstowe: jedna linijka albo obszar.
	 *
	 * Decyduje `wiersze` z opisu, nie typ kontraktu: `akapit` bywa jednym
	 * zdaniem (obietnica hero), a wpisywanie go w wielolinijkowe pole
	 * sugerowałoby, że ma być dłuższy niż powinien.
	 *
	 * @param array<string,mixed> $opis    Opis pola.
	 * @param string              $wartosc Wartość.
	 */
	private static function tekst( array $opis, string $wartosc ): void {
		$wiersze = isset( $opis['wiersze'] ) ? (int) $opis['wiersze'] : ( 'akapit' === $opis['typ'] ? 4 : 1 );
		$limit   = isset( $opis['limit'] ) ? (int) $opis['limit'] : null;

		if ( $wiersze > 1 ) {
			printf(
				'<textarea class="large-text aai-wartosc" rows="%d" data-aai-wartosc%s%s>%s</textarea>',
				(int) $wiersze,
				isset( $opis['placeholder'] ) ? ' placeholder="' . esc_attr( $opis['placeholder'] ) . '"' : '',
				null === $limit ? '' : ' data-aai-limit="' . (int) $limit . '"',
				esc_textarea( $wartosc )
			);
			if ( null !== $limit && $limit > Aai_Sklep_Pola::LIMIT_AKAPIT ) {
				echo '<p class="description aai-licznik" aria-live="polite"></p>';
			}
			return;
		}

		printf(
			'<input type="text" class="regular-text aai-wartosc" value="%s" data-aai-wartosc%s%s />',
			esc_attr( $wartosc ),
			isset( $opis['placeholder'] ) ? ' placeholder="' . esc_attr( $opis['placeholder'] ) . '"' : '',
			null === $limit ? '' : ' data-aai-limit="' . (int) $limit . '"'
		);
	}

	/**
	 * Lista zamknięta.
	 *
	 * @param array<string,mixed> $opis    Opis pola.
	 * @param string              $wartosc Wartość.
	 */
	private static function wybor( array $opis, string $wartosc ): void {
		echo '<select class="aai-wartosc" data-aai-wartosc>';
		foreach ( (array) ( $opis['opcje'] ?? array() ) as $klucz => $tekst ) {
			printf(
				'<option value="%s"%s>%s</option>',
				esc_attr( (string) $klucz ),
				selected( (string) $klucz, $wartosc, false ),
				esc_html( (string) $tekst )
			);
		}
		echo '</select>';
	}

	/**
	 * Lista tekstów — punkty, atuty, „to NIE jest".
	 *
	 * @param array<string,mixed> $opis  Opis pola.
	 * @param array<int,mixed>    $lista Wartości.
	 */
	private static function lista_tekstow( array $opis, array $lista ): void {
		$nazwa_elementu = (string) ( $opis['nazwa_elementu'] ?? 'pozycja' );
		?>
		<div class="aai-lista" data-aai-lista>
			<?php foreach ( array_values( $lista ) as $wartosc ) : ?>
				<?php self::wiersz_tekstu( is_scalar( $wartosc ) ? (string) $wartosc : '' ); ?>
			<?php endforeach; ?>
		</div>
		<template data-aai-szablon><?php self::wiersz_tekstu( '' ); ?></template>
		<button type="button" class="button button-small aai-dodaj" data-aai-dodaj>
			<?php
			printf(
				/* translators: %s: nazwa dodawanego elementu, np. „punkt". */
				esc_html__( 'Dodaj %s', 'aai-sklep' ),
				esc_html( $nazwa_elementu )
			);
			?>
		</button>
		<?php
	}

	/**
	 * Jeden wiersz listy tekstów.
	 *
	 * @param string $wartosc Wartość.
	 */
	private static function wiersz_tekstu( string $wartosc ): void {
		?>
		<div class="aai-wiersz" data-aai-wiersz>
			<input type="text" class="large-text aai-wartosc" value="<?php echo esc_attr( $wartosc ); ?>" data-aai-wartosc />
			<?php self::przyciski_wiersza(); ?>
		</div>
		<?php
	}

	/**
	 * Lista obiektów — korzyści, opinie, pytania FAQ, materiały lekcji.
	 *
	 * @param array<string,mixed> $opis  Opis pola.
	 * @param array<int,mixed>    $lista Wartości.
	 */
	private static function lista_obiektow( array $opis, array $lista ): void {
		$nazwa_elementu = (string) ( $opis['nazwa_elementu'] ?? 'pozycja' );
		?>
		<div class="aai-lista aai-lista--obiekty" data-aai-lista>
			<?php foreach ( array_values( $lista ) as $element ) : ?>
				<?php self::wiersz_obiektu( $opis['pola'], is_array( $element ) ? $element : array() ); ?>
			<?php endforeach; ?>
		</div>
		<template data-aai-szablon><?php self::wiersz_obiektu( $opis['pola'], Aai_Sklep_Pola::pusta( $opis['pola'] ) ); ?></template>
		<button type="button" class="button button-small aai-dodaj" data-aai-dodaj>
			<?php
			printf(
				/* translators: %s: nazwa dodawanego elementu, np. „opinia". */
				esc_html__( 'Dodaj %s', 'aai-sklep' ),
				esc_html( $nazwa_elementu )
			);
			?>
		</button>
		<?php
	}

	/**
	 * Jeden wiersz listy obiektów.
	 *
	 * @param array<string,array<string,mixed>> $pola    Opis pól elementu.
	 * @param array<string,mixed>               $wartosc Wartości elementu.
	 */
	private static function wiersz_obiektu( array $pola, array $wartosc ): void {
		?>
		<div class="aai-wiersz aai-wiersz--obiekt" data-aai-wiersz>
			<div class="aai-wiersz__pola">
				<?php self::pola( $pola, $wartosc ); ?>
			</div>
			<?php self::przyciski_wiersza(); ?>
		</div>
		<?php
	}

	/**
	 * Przyciski przy wierszu listy: w górę, w dół, usuń.
	 *
	 * Kolejność zmienia się strzałkami, a nie przeciąganiem — tak samo jak
	 * w prototypie. Przeciąganie wymaga myszy i sprawnej ręki; strzałki
	 * działają z klawiatury i mówią, co robią.
	 */
	private static function przyciski_wiersza(): void {
		?>
		<div class="aai-wiersz__akcje">
			<button type="button" class="button button-small" data-aai-gora aria-label="<?php esc_attr_e( 'Przenieś wyżej', 'aai-sklep' ); ?>">↑</button>
			<button type="button" class="button button-small" data-aai-dol aria-label="<?php esc_attr_e( 'Przenieś niżej', 'aai-sklep' ); ?>">↓</button>
			<button type="button" class="button button-small button-link-delete" data-aai-usun aria-label="<?php esc_attr_e( 'Usuń pozycję', 'aai-sklep' ); ?>">✕</button>
		</div>
		<?php
	}
}
