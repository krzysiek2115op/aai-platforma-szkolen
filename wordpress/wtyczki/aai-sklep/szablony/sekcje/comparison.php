<?php
/**
 * „Dasz radę bez nas. Pytanie: kiedy?" — port `components/kurs/SekcjaPorownanie.tsx`.
 *
 * Nazwa alternatywy idzie Z BAZY — kurs ma prawo porównywać się z czym innym
 * niż „samodzielna nauka", a wpisany na sztywno napis kłamałby przy pierwszym
 * takim kursie.
 *
 * @package Aai_Sklep
 */

defined( 'ABSPATH' ) || exit;

/** @var array<string,mixed> $tresc */
/** @var string $etykieta */
?>
<section class="aai-kontener aai-sekcja">
	<?php
	Aai_Sklep_Widok::naglowek_sekcji(
		$etykieta,
		'Dasz radę bez nas. Pytanie: kiedy?',
		'Nie udajemy, że nie da się nauczyć samemu. Pokazujemy, ile to kosztuje czasu.'
	);
	?>
	<div class="aai-dwie-kolumny">
		<div class="aai-panel aai-unos aai-kolumna aai-reveal aai-reveal-lewo">
			<p class="aai-mono"><?php echo esc_html( $tresc['alternatywa_nazwa'] ); ?></p>
			<ul class="aai-lista-punktow">
				<?php foreach ( $tresc['alternatywa'] as $aai_punkt ) : ?>
					<li>
						<?php echo Aai_Sklep_Widok::ikona( 'minus', 'aai-ikona-m aai-cichy' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
						<span class="aai-cichy"><?php echo esc_html( $aai_punkt ); ?></span>
					</li>
				<?php endforeach; ?>
			</ul>
		</div>
		<div class="aai-panel aai-unos aai-kolumna aai-kolumna-mocna aai-reveal aai-reveal-prawo">
			<div aria-hidden="true" class="aai-kolumna-poswiata aai-dryf-a"></div>
			<p class="aai-mono aai-akcent">Z tym kursem</p>
			<ul class="aai-lista-punktow">
				<?php foreach ( $tresc['kurs'] as $aai_punkt ) : ?>
					<li>
						<?php echo Aai_Sklep_Widok::ikona( 'check', 'aai-ikona-m aai-akcent' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
						<span><?php echo esc_html( $aai_punkt ); ?></span>
					</li>
				<?php endforeach; ?>
			</ul>
		</div>
	</div>
</section>
