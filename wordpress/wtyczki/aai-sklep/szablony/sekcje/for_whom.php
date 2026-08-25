<?php
/**
 * „Dla kogo" — port `components/kurs/SekcjaDlaKogo.tsx`.
 *
 * Uczciwe „a NIE jest, jeśli…" (`nie_dla`) jest opcjonalne i znika razem
 * z całą prawą kolumną, gdy kreator go nie wypełnił.
 *
 * @package Aai_Sklep
 */

defined( 'ABSPATH' ) || exit;

/** @var array<string,mixed> $tresc */
/** @var array<string,mixed> $kurs */
/** @var string $etykieta */
?>
<section id="dla-kogo" class="aai-kontener aai-sekcja">
	<?php Aai_Sklep_Widok::naglowek_sekcji( $etykieta, 'Ten ' . $kurs['type'] . ' jest dla Ciebie, jeśli…' ); ?>

	<div class="aai-dwie-kolumny aai-dwie-kolumny-luzne">
		<ul class="aai-lista-ptaszki" data-aai-cascade="0.07">
			<?php foreach ( $tresc['punkty'] as $aai_punkt ) : ?>
				<li class="aai-reveal aai-reveal-lewo" data-aai-cascade-item>
					<?php echo Aai_Sklep_Widok::ikona( 'check', 'aai-ikona-m aai-akcent' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
					<span><?php echo esc_html( $aai_punkt ); ?></span>
				</li>
			<?php endforeach; ?>
		</ul>

		<?php if ( ! empty( $tresc['nie_dla'] ) ) : ?>
			<div class="aai-panel aai-unos aai-kolumna aai-kolumna-zwarta aai-reveal aai-reveal-prawo">
				<p class="aai-mono">A NIE jest, jeśli…</p>
				<ul class="aai-lista-punktow">
					<?php foreach ( $tresc['nie_dla'] as $aai_punkt ) : ?>
						<li>
							<?php echo Aai_Sklep_Widok::ikona( 'x', 'aai-ikona-m aai-cichy' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
							<span class="aai-cichy"><?php echo esc_html( $aai_punkt ); ?></span>
						</li>
					<?php endforeach; ?>
				</ul>
			</div>
		<?php endif; ?>
	</div>
</section>
