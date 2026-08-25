<?php
/**
 * „Efekt: przed i po kursie" — port `components/kurs/SekcjaTransformacja.tsx`.
 *
 * @package Aai_Sklep
 */

defined( 'ABSPATH' ) || exit;

/** @var array<string,mixed> $tresc */
/** @var string $etykieta */
?>
<section class="aai-kontener aai-sekcja">
	<?php Aai_Sklep_Widok::naglowek_sekcji( $etykieta, 'Efekt: przed i po kursie' ); ?>

	<div class="aai-dwie-kolumny aai-dwie-kolumny-strzalka">
		<div class="aai-panel aai-unos aai-kolumna aai-reveal aai-reveal-lewo">
			<p class="aai-mono">Przed</p>
			<ul class="aai-lista-punktow">
				<?php foreach ( $tresc['przed'] as $aai_punkt ) : ?>
					<li>
						<span aria-hidden="true" class="aai-punkt-kropka"></span>
						<span class="aai-cichy"><?php echo esc_html( $aai_punkt ); ?></span>
					</li>
				<?php endforeach; ?>
			</ul>
		</div>

		<?php echo Aai_Sklep_Widok::ikona( 'move-right', 'aai-ikona-l aai-akcent aai-strzalka-srodek' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>

		<div class="aai-panel aai-unos aai-kolumna aai-kolumna-mocna aai-reveal aai-reveal-prawo">
			<div aria-hidden="true" class="aai-kolumna-poswiata aai-dryf-b"></div>
			<p class="aai-mono aai-akcent">Po</p>
			<ul class="aai-lista-punktow">
				<?php foreach ( $tresc['po'] as $aai_punkt ) : ?>
					<li>
						<span aria-hidden="true" class="aai-punkt-kropka aai-punkt-kropka-akcent"></span>
						<span><?php echo esc_html( $aai_punkt ); ?></span>
					</li>
				<?php endforeach; ?>
			</ul>
		</div>
	</div>
</section>
