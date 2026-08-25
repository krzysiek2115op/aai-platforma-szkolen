<?php
/**
 * „Kto prowadzi ten kurs" — port `components/kurs/SekcjaAutor.tsx`.
 *
 * @package Aai_Sklep
 */

defined( 'ABSPATH' ) || exit;

/** @var array<string,mixed> $tresc */
/** @var string $etykieta */
$aai_inicjal = mb_substr( $tresc['imie'], 0, 1, 'UTF-8' );
?>
<section class="aai-kontener aai-sekcja">
	<?php
	Aai_Sklep_Widok::naglowek_sekcji(
		$etykieta,
		'Kto prowadzi ten kurs?',
		'Uczy praktyk, nie wykładowca — te same narzędzia, na których pracuje na co dzień.'
	);
	?>
	<div class="aai-autor-uklad">
		<div class="aai-panel aai-unos aai-autor-karta aai-reveal aai-reveal-lewo">
			<div aria-hidden="true" class="aai-autor-poswiata aai-dryf-a"></div>
			<div class="aai-autor-naglowek">
				<div aria-hidden="true" class="aai-autor-awatar aai-siatka-tla"><?php echo esc_html( $aai_inicjal ); ?></div>
				<div>
					<h3 class="aai-autor-imie"><?php echo esc_html( $tresc['imie'] ); ?></h3>
					<?php if ( ! empty( $tresc['rola'] ) ) : ?>
						<p class="aai-mono aai-akcent"><?php echo esc_html( $tresc['rola'] ); ?></p>
					<?php endif; ?>
				</div>
			</div>
			<p class="aai-autor-bio"><?php echo esc_html( $tresc['bio'] ); ?></p>

			<?php if ( ! empty( $tresc['cytat'] ) ) : ?>
				<figure class="aai-cytat">
					<?php echo Aai_Sklep_Widok::ikona( 'quote', 'aai-ikona-s aai-akcent-slaby' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
					<blockquote>„<?php echo esc_html( $tresc['cytat'] ); ?>”</blockquote>
					<figcaption class="aai-mono"><?php echo esc_html( $tresc['imie'] ); ?></figcaption>
				</figure>
			<?php endif; ?>

			<?php if ( ! empty( $tresc['link'] ) ) : ?>
				<a class="aai-autor-link" href="<?php echo esc_url( $tresc['link']['url'] ); ?>">
					<?php echo esc_html( $tresc['link']['etykieta'] ); ?>
					<?php echo Aai_Sklep_Widok::ikona( 'arrow-up-right', 'aai-ikona-s' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
				</a>
			<?php endif; ?>
		</div>

		<div class="aai-autor-bok">
			<?php if ( ! empty( $tresc['czym_sie_zajmuje'] ) ) : ?>
				<div class="aai-panel aai-unos aai-kolumna-zwarta aai-reveal aai-reveal-prawo">
					<p class="aai-mono">Czym zajmuje się na co dzień</p>
					<ul class="aai-obszary">
						<?php foreach ( $tresc['czym_sie_zajmuje'] as $aai_obszar ) : ?>
							<li><?php echo esc_html( $aai_obszar ); ?></li>
						<?php endforeach; ?>
					</ul>
				</div>
			<?php endif; ?>

			<?php if ( ! empty( $tresc['atuty'] ) ) : ?>
				<div class="aai-atuty" data-aai-cascade="0.07">
					<?php foreach ( $tresc['atuty'] as $aai_atut ) : ?>
						<div class="aai-panel aai-unos aai-atut aai-reveal aai-reveal-prawo" data-aai-cascade-item>
							<?php echo Aai_Sklep_Widok::ikona( 'check', 'aai-ikona-s aai-akcent' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
							<span><?php echo esc_html( $aai_atut ); ?></span>
						</div>
					<?php endforeach; ?>
				</div>
			<?php endif; ?>
		</div>
	</div>
</section>
