<?php
/**
 * Błąd warstwy zapisu — z danymi, które wołający ma pokazać człowiekowi.
 *
 * Odpowiednik `BladDyspozytora` z prototypu. Sam komunikat nie wystarcza:
 * odmowa skasowania treści musi podać LICZBĘ zagrożonych lekcji, żeby
 * pytanie do właściciela brzmiało „skasować treść 12 lekcji?", a nie
 * „coś poszło nie tak".
 *
 * @package Aai_Sklep
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Wyjątek warstwy zapisu.
 */
final class Aai_Sklep_Blad_Zapisu extends RuntimeException {

	/**
	 * Dane towarzyszące błędowi (np. `lekcje_z_trescia`).
	 *
	 * @var array<string,mixed>
	 */
	private array $dane;

	/**
	 * @param string              $komunikat Treść dla człowieka.
	 * @param array<string,mixed> $dane      Dane towarzyszące.
	 */
	public function __construct( string $komunikat, array $dane = array() ) {
		parent::__construct( $komunikat );
		$this->dane = $dane;
	}

	/**
	 * @return array<string,mixed>
	 */
	public function dane(): array {
		return $this->dane;
	}
}
