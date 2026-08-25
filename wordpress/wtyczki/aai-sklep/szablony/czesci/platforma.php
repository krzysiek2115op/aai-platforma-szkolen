<?php
/**
 * „Tak wygląda kurs od środka" — port `components/kurs/SekcjaPlatforma.tsx`.
 *
 * Trzy obietnice tej sekcji są wpisane w kod, a nie brane z bazy — i wszystkie
 * trzy dotrzymuje widok kursu z 0.34.0 (stała kolejność modułów, postęp lekcja
 * po lekcji, powrót do dowolnej lekcji). To nie jest ozdoba: przegląd B7 pokazał
 * (BLAD-015), że strona sprzedażowa obiecywała tu rzeczy, których widok kursu
 * wtedy nie miał. Zmiana tych zdań wymaga sprawdzenia, czy produkt nadal je
 * spełnia.
 *
 * Oczekuje `$kurs` i `$etykieta`.
 *
 * @package Aai_Sklep
 */

defined( 'ABSPATH' ) || exit;

/** @var string $etykieta */
$aai_punkty = array(
	'Moduły i lekcje w stałej kolejności — zawsze wiesz, gdzie jesteś.',
	'Widzisz swój postęp lekcja po lekcji.',
	'Wracasz do dowolnej lekcji, kiedy chcesz — dostęp bez limitu czasu.',
);
?>
<section class="aai-kontener aai-sekcja">
	<?php
	Aai_Sklep_Widok::naglowek_sekcji(
		$etykieta,
		'Tak wygląda kurs od środka',
		'Podgląd zbudowany z prawdziwego programu tego kursu — to nie jest zdjęcie z banku obrazków.'
	);
	?>
	<div class="aai-platforma-uklad">
		<div class="aai-reveal">
			<?php require __DIR__ . '/okno-kursu.php'; ?>
		</div>
		<ul class="aai-lista-ptaszki" data-aai-cascade="0.09">
			<?php foreach ( $aai_punkty as $aai_punkt ) : ?>
				<li class="aai-reveal aai-reveal-prawo" data-aai-cascade-item>
					<?php echo Aai_Sklep_Widok::ikona( 'check', 'aai-ikona-m aai-akcent' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
					<span><?php echo esc_html( $aai_punkt ); ?></span>
				</li>
			<?php endforeach; ?>
		</ul>
	</div>
</section>
