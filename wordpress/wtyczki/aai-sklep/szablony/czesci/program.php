<?php
/**
 * Program kursu — port `components/kurs/SekcjaProgram.tsx`.
 *
 * Akordeon na natywnym `<details>`, czyli ZERO JavaScriptu: program otwiera się
 * także wtedy, gdy skrypt się nie wczyta, a wyszukiwarka widzi wszystkie tytuły
 * lekcji. Wymóg właściciela: każdy tytuł lekcji widoczny PRZED zakupem.
 *
 * Oczekuje `$kurs` i `$etykieta`.
 *
 * @package Aai_Sklep
 */

defined( 'ABSPATH' ) || exit;

/** @var array<string,mixed> $kurs */
/** @var string $etykieta */
$aai_opis = Aai_Sklep_Widok::metadane_kursu( $kurs, false );
$aai_opis = ( empty( $aai_opis ) ? '' : implode( ' · ', $aai_opis ) . ' — ' )
	. 'każdy tytuł lekcji widzisz przed zakupem, żadnych niespodzianek.';
?>
<section id="program" class="aai-kontener aai-sekcja">
	<?php Aai_Sklep_Widok::naglowek_sekcji( $etykieta, 'Program: dokładnie wiesz, co dostajesz', $aai_opis ); ?>

	<div class="aai-lista-pionowa" data-aai-cascade="0.05">
		<?php foreach ( $kurs['modules'] as $aai_i => $aai_modul ) : ?>
			<?php
			$aai_minuty = 0;
			foreach ( $aai_modul['lessons'] as $aai_lekcja ) {
				$aai_minuty += (int) $aai_lekcja['duration_min'];
			}
			?>
			<div class="aai-reveal" data-aai-cascade-item>
				<details class="aai-panel aai-akordeon"<?php echo 0 === $aai_i ? ' open' : ''; ?>>
					<summary class="aai-akordeon-naglowek">
						<span class="aai-liczba"><?php echo esc_html( str_pad( (string) ( $aai_i + 1 ), 2, '0', STR_PAD_LEFT ) ); ?></span>
						<span class="aai-akordeon-tresc">
							<span class="aai-akordeon-tytul"><?php echo esc_html( $aai_modul['title'] ); ?></span>
							<?php if ( ! empty( $aai_modul['summary'] ) ) : ?>
								<span class="aai-akordeon-opis"><?php echo esc_html( $aai_modul['summary'] ); ?></span>
							<?php endif; ?>
						</span>
						<span class="aai-mono aai-akordeon-meta">
							<?php
							echo esc_html(
								Aai_Sklep_Widok::lekcje( count( $aai_modul['lessons'] ) )
									. ( $aai_minuty > 0 ? ' · ' . $aai_minuty . ' min' : '' )
							);
							?>
						</span>
						<?php echo Aai_Sklep_Widok::ikona( 'chevron-down', 'aai-ikona-s aai-akordeon-strzalka' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
					</summary>
					<?php if ( ! empty( $aai_modul['lessons'] ) ) : ?>
						<ul class="aai-lekcje">
							<?php foreach ( $aai_modul['lessons'] as $aai_lekcja ) : ?>
								<li class="aai-lekcja">
									<?php echo Aai_Sklep_Widok::ikona( 'play', 'aai-ikona-xs aai-cichy' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
									<span class="aai-lekcja-tytul"><?php echo esc_html( $aai_lekcja['title'] ); ?></span>
									<?php if ( ! empty( $aai_lekcja['preview'] ) ) : ?>
										<span class="aai-mono aai-akcent">podgląd</span>
									<?php endif; ?>
									<?php if ( ! empty( $aai_lekcja['duration_min'] ) ) : ?>
										<span class="aai-mono aai-lekcja-czas"><?php echo esc_html( (string) $aai_lekcja['duration_min'] ); ?> min</span>
									<?php endif; ?>
								</li>
							<?php endforeach; ?>
						</ul>
					<?php endif; ?>
				</details>
			</div>
		<?php endforeach; ?>
	</div>
</section>
