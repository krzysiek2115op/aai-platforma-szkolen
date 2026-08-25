<?php
/**
 * Gwarancja — karta w sekcji oferty.
 *
 * DLACZEGO OSOBNY PLIK, SKORO RENDERUJE SIĘ WEWNĄTRZ `czesci/cena.php`.
 * Bo `guarantee` jest pełnoprawnym rodzajem sekcji z kontraktu i ma mieć swój
 * szablon jak każdy inny — inaczej „każdy rodzaj ma szablon" przestaje być
 * regułą, którą da się sprawdzić. W prototypie ta treść też nie miała własnej
 * sekcji, tylko wchodziła do `SekcjaCena`.
 *
 * @package Aai_Sklep
 */

defined( 'ABSPATH' ) || exit;

/** @var array<string,mixed> $tresc */
?>
<div class="aai-panel aai-unos aai-gwarancja aai-reveal">
	<?php echo Aai_Sklep_Widok::ikona( 'shield-check', 'aai-ikona-xl aai-akcent' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
	<div>
		<h3 class="aai-gwarancja-tytul"><?php echo esc_html( $tresc['naglowek'] ); ?></h3>
		<p class="aai-gwarancja-tekst"><?php echo esc_html( $tresc['tekst'] ); ?></p>
	</div>
</div>
