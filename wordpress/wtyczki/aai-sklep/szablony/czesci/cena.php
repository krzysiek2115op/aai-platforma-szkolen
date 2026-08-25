<?php
/**
 * Sekcja oferty — port `components/kurs/SekcjaCena.tsx`.
 *
 * RENDERUJE SIĘ ZAWSZE, także gdy kreator nie wypełnił sekcji pakietu: strona
 * sprzedażowa bez ceny i bez przycisku nie jest stroną sprzedażową. Treść
 * pakietu i gwarancji jest dodatkiem, nie warunkiem.
 *
 * Oczekuje `$kurs`, `$etykieta` oraz `$aai_sekcje`.
 *
 * @package Aai_Sklep
 */

defined( 'ABSPATH' ) || exit;

/** @var array<string,mixed> $kurs */
/** @var string $etykieta */
/** @var array<string,mixed> $aai_sekcje */
$aai_pakiet    = $aai_sekcje['package'] ?? array();
$aai_gwarancja = $aai_sekcje['guarantee'] ?? null;
$aai_punkty    = $aai_pakiet['punkty'] ?? array();
$aai_cena      = Aai_Sklep_Widok::formatuj_cene( (int) $kurs['price_grosze'] );
$aai_liczby    = Aai_Sklep_Widok::metadane_kursu( $kurs, false );
?>
<section id="cena" class="aai-oferta">
	<div aria-hidden="true" class="aai-siatka-tla aai-maska-y aai-warstwa"></div>
	<div aria-hidden="true" class="aai-oferta-poswiata-a aai-dryf-a"></div>
	<div aria-hidden="true" class="aai-oferta-poswiata-b aai-dryf-b"></div>

	<div class="aai-kontener aai-oferta-tresc">
		<div class="aai-reveal">
			<p class="aai-etykieta">[ <?php echo esc_html( $etykieta ); ?> ]</p>
			<h2 class="aai-sekcja-tytul aai-oferta-tytul">
				Co dokładnie dostajesz za <?php echo esc_html( $aai_cena ); ?>?
			</h2>
			<?php if ( ! empty( $aai_liczby ) ) : ?>
				<p class="aai-mono aai-oferta-liczby">
					<?php echo esc_html( implode( ' · ', $aai_liczby ) ); ?> · płacisz raz
				</p>
			<?php endif; ?>
		</div>

		<div class="aai-oferta-uklad">
			<div class="aai-oferta-punkty" data-aai-cascade="0.06">
				<?php foreach ( $aai_punkty as $aai_punkt ) : ?>
					<div class="aai-panel aai-unos aai-oferta-punkt aai-reveal" data-aai-cascade-item>
						<?php echo Aai_Sklep_Widok::ikona( 'check', 'aai-ikona-m aai-akcent' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
						<span>
							<span class="aai-oferta-punkt-tytul"><?php echo esc_html( $aai_punkt['tytul'] ); ?></span>
							<?php if ( ! empty( $aai_punkt['opis'] ) ) : ?>
								<span class="aai-oferta-punkt-opis"><?php echo esc_html( $aai_punkt['opis'] ); ?></span>
							<?php endif; ?>
						</span>
					</div>
				<?php endforeach; ?>
			</div>

			<div class="aai-panel aai-oferta-karta aai-reveal aai-reveal-prawo">
				<div aria-hidden="true" class="aai-oferta-karta-poswiata"></div>
				<div class="aai-oferta-karta-tresc">
					<p class="aai-plakietka aai-plakietka-akcent aai-oferta-plakietka">
						<?php echo Aai_Sklep_Widok::ikona( 'sparkles', 'aai-ikona-xs' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
						Pełny dostęp
					</p>
					<p class="aai-oferta-cena"><?php echo esc_html( $aai_cena ); ?></p>
					<p class="aai-oferta-podpis">jednorazowo, bez abonamentu i bez ukrytych kosztów</p>

					<?php if ( ! empty( $aai_pakiet['w_cenie'] ) ) : ?>
						<ul class="aai-oferta-w-cenie">
							<?php foreach ( $aai_pakiet['w_cenie'] as $aai_punkt ) : ?>
								<li>
									<?php echo Aai_Sklep_Widok::ikona( 'check', 'aai-ikona-s aai-akcent' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
									<span><?php echo esc_html( $aai_punkt ); ?></span>
								</li>
							<?php endforeach; ?>
						</ul>
					<?php endif; ?>

					<?php if ( ! empty( $aai_pakiet['domkniecie'] ) ) : ?>
						<p class="aai-oferta-domkniecie"><?php echo esc_html( $aai_pakiet['domkniecie'] ); ?></p>
					<?php endif; ?>

					<?php Aai_Sklep_Widok::cta( null, true, 'Dołączam do kursu', 'aai-btn-pelny' ); ?>

					<p class="aai-oferta-wahanie">
						Wciąż się wahasz? <a href="#program">Zobacz jeszcze raz pełny program</a>.
					</p>
				</div>
			</div>
		</div>

		<?php if ( ! empty( $aai_pakiet['kotwica'] ) || null !== $aai_gwarancja ) : ?>
			<div class="aai-oferta-dopiski">
				<?php if ( ! empty( $aai_pakiet['kotwica'] ) ) : ?>
					<div class="aai-panel aai-unos aai-kolumna-zwarta aai-reveal">
						<p class="aai-mono">Dla porównania</p>
						<p class="aai-oferta-kotwica"><?php echo esc_html( $aai_pakiet['kotwica'] ); ?></p>
					</div>
				<?php endif; ?>
				<?php
				if ( null !== $aai_gwarancja ) :
					$tresc = $aai_gwarancja;
					require __DIR__ . '/../sekcje/guarantee.php';
				endif;
				?>
			</div>
		<?php endif; ?>
	</div>
</section>
