<?php
/**
 * „Dlaczego ten kurs?" — port `components/kurs/SekcjaProblem.tsx`.
 *
 * Sprzedajemy zmianę, nie funkcje: problem → rozwiązanie → rezultat. Trzeci
 * krok jest wyróżniony kolorem, bo to on jest obietnicą.
 *
 * @package Aai_Sklep
 */

defined( 'ABSPATH' ) || exit;

/** @var array<string,mixed> $tresc */
/** @var string $etykieta */
$aai_kroki = array(
	array( 'problem', 'Problem' ),
	array( 'rozwiazanie', 'Rozwiązanie' ),
	array( 'rezultat', 'Rezultat' ),
);
?>
<section id="poznaj" class="aai-kontener aai-sekcja">
	<?php Aai_Sklep_Widok::naglowek_sekcji( $etykieta, 'Dlaczego ten kurs?' ); ?>

	<div class="aai-reveal aai-opoznienie">
		<p class="aai-wstep"><?php echo esc_html( $tresc['wstep'] ); ?></p>
	</div>

	<ol class="aai-kroki" data-aai-cascade="0.12">
		<?php foreach ( $aai_kroki as $aai_i => list( $aai_klucz, $aai_nazwa ) ) : ?>
			<li class="aai-krok aai-reveal" data-aai-cascade-item>
				<div class="aai-panel aai-unos aai-krok-karta<?php echo 'rezultat' === $aai_klucz ? ' aai-krok-karta-mocna' : ''; ?>">
					<div aria-hidden="true" class="aai-krok-poswiata"></div>
					<p class="aai-mono<?php echo 'rezultat' === $aai_klucz ? ' aai-akcent' : ''; ?>">
						<?php echo esc_html( str_pad( (string) ( $aai_i + 1 ), 2, '0', STR_PAD_LEFT ) . ' · ' . $aai_nazwa ); ?>
					</p>
					<p class="aai-krok-tekst"><?php echo esc_html( $tresc[ $aai_klucz ] ); ?></p>
				</div>
				<?php if ( $aai_i < 2 ) : ?>
					<?php echo Aai_Sklep_Widok::ikona( 'move-right', 'aai-ikona-m aai-akcent aai-krok-strzalka' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
				<?php endif; ?>
			</li>
		<?php endforeach; ?>
	</ol>
</section>
