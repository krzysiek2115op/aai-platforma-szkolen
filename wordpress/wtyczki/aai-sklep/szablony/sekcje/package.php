<?php
/**
 * „Co znajduje się w środku" — port `components/kurs/SekcjaPakiet.tsx`.
 *
 * Pola `w_cenie` i `domkniecie` z tego samego kontraktu renderuje sekcja oferty
 * (`czesci/cena.php`) — tak samo jak w prototypie. Jedna treść, dwa miejsca,
 * w których jest potrzebna.
 *
 * @package Aai_Sklep
 */

defined( 'ABSPATH' ) || exit;

/** @var array<string,mixed> $tresc */
/** @var string $etykieta */
?>
<section id="pakiet" class="aai-kontener aai-sekcja">
	<?php
	Aai_Sklep_Widok::naglowek_sekcji(
		$etykieta,
		'Co znajduje się w środku?',
		'To nie jest „dostęp do nagrań”. To komplet rzeczy, które wdrażasz u siebie.'
	);
	?>
	<ul class="aai-siatka-kart" data-aai-cascade="0.07">
		<?php foreach ( $tresc['punkty'] as $aai_i => $aai_punkt ) : ?>
			<li class="aai-panel aai-unos aai-karta-punkt aai-reveal" data-aai-cascade-item>
				<div aria-hidden="true" class="aai-karta-poswiata"></div>
				<span class="aai-karta-punkt-numer"><?php echo esc_html( str_pad( (string) ( $aai_i + 1 ), 2, '0', STR_PAD_LEFT ) ); ?></span>
				<h3 class="aai-karta-punkt-tytul"><?php echo esc_html( $aai_punkt['tytul'] ); ?></h3>
				<?php if ( ! empty( $aai_punkt['opis'] ) ) : ?>
					<p class="aai-karta-punkt-opis"><?php echo esc_html( $aai_punkt['opis'] ); ?></p>
				<?php endif; ?>
			</li>
		<?php endforeach; ?>
	</ul>
	<?php if ( ! empty( $tresc['kotwica'] ) ) : ?>
		<p class="aai-kotwica"><?php echo esc_html( $tresc['kotwica'] ); ?></p>
	<?php endif; ?>
</section>
