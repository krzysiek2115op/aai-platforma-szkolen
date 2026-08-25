<?php
/**
 * „Nie wierz nam na słowo" — port `components/kurs/SekcjaOpinie.tsx`.
 *
 * Opinie w seedach są JAWNYMI placeholderami: prawdziwe wchodzą dopiero po
 * pierwszych sprzedażach. Sekcja bez treści w bazie po prostu nie powstaje,
 * więc pusty kurs niczego nie udaje.
 *
 * @package Aai_Sklep
 */

defined( 'ABSPATH' ) || exit;

/** @var array<string,mixed> $tresc */
/** @var string $etykieta */
?>
<section id="opinie" class="aai-kontener aai-sekcja">
	<?php Aai_Sklep_Widok::naglowek_sekcji( $etykieta, 'Nie wierz nam na słowo' ); ?>
	<ul class="aai-siatka-dwie" data-aai-cascade="0.08">
		<?php foreach ( $tresc['opinie'] as $aai_opinia ) : ?>
			<li class="aai-panel aai-unos aai-opinia aai-reveal" data-aai-cascade-item>
				<p class="aai-opinia-tekst">„<?php echo esc_html( $aai_opinia['tekst'] ); ?>”</p>
				<p class="aai-mono aai-opinia-autor">
					<span class="aai-akcent"><?php echo esc_html( $aai_opinia['autor'] ); ?></span>
					<?php if ( ! empty( $aai_opinia['rola'] ) ) : ?>
						<span> · <?php echo esc_html( $aai_opinia['rola'] ); ?></span>
					<?php endif; ?>
				</p>
			</li>
		<?php endforeach; ?>
	</ul>
</section>
