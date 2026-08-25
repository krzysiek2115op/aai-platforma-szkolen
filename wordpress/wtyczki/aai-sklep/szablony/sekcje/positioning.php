<?php
/**
 * „To NIE jest / To JEST" — port `components/kurs/SekcjaPozycjonowanie.tsx`.
 *
 * @package Aai_Sklep
 */

defined( 'ABSPATH' ) || exit;

/** @var array<string,mixed> $tresc */
/** @var array<string,mixed> $kurs */
/** @var string $etykieta */
?>
<section class="aai-kontener aai-sekcja">
	<?php
	Aai_Sklep_Widok::naglowek_sekcji(
		$etykieta,
		'To NIE jest kolejny ' . $kurs['type'] . ' do odhaczenia.',
		null,
		'To system pracy, który zostaje z Tobą.'
	);
	?>
	<div class="aai-dwie-kolumny">
		<div class="aai-panel aai-unos aai-kolumna aai-reveal aai-reveal-lewo">
			<p class="aai-mono">To NIE jest</p>
			<ul class="aai-lista-punktow">
				<?php foreach ( $tresc['nie_jest'] as $aai_punkt ) : ?>
					<li>
						<?php echo Aai_Sklep_Widok::ikona( 'x', 'aai-ikona-m aai-cichy' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
						<span class="aai-cichy"><?php echo esc_html( $aai_punkt ); ?></span>
					</li>
				<?php endforeach; ?>
			</ul>
		</div>
		<div class="aai-panel aai-unos aai-kolumna aai-kolumna-mocna aai-reveal aai-reveal-prawo">
			<div aria-hidden="true" class="aai-kolumna-poswiata aai-dryf-a"></div>
			<p class="aai-mono aai-akcent">To JEST</p>
			<ul class="aai-lista-punktow">
				<?php foreach ( $tresc['jest'] as $aai_punkt ) : ?>
					<li>
						<?php echo Aai_Sklep_Widok::ikona( 'check', 'aai-ikona-m aai-akcent' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
						<span><?php echo esc_html( $aai_punkt ); ?></span>
					</li>
				<?php endforeach; ?>
			</ul>
		</div>
	</div>
</section>
