<?php
/**
 * „Co będziesz potrafić po kursie" — port `components/kurs/SekcjaKorzysci.tsx`.
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
		'Co będziesz potrafić po kursie?',
		'Nie „poznasz podstawy” — konkretne umiejętności, które sprawdzisz w swojej pracy tego samego dnia.'
	);
	?>
	<ul class="aai-siatka-kart" data-aai-cascade="0.07">
		<?php foreach ( $tresc['punkty'] as $aai_punkt ) : ?>
			<li class="aai-panel aai-unos aai-karta-punkt aai-reveal" data-aai-cascade-item>
				<div aria-hidden="true" class="aai-karta-poswiata"></div>
				<?php echo Aai_Sklep_Widok::ikona( 'check', 'aai-ikona-m aai-akcent' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
				<h3 class="aai-karta-punkt-tytul"><?php echo esc_html( $aai_punkt['tytul'] ); ?></h3>
				<?php if ( ! empty( $aai_punkt['opis'] ) ) : ?>
					<p class="aai-karta-punkt-opis"><?php echo esc_html( $aai_punkt['opis'] ); ?></p>
				<?php endif; ?>
			</li>
		<?php endforeach; ?>
	</ul>
</section>
