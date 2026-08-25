<?php
/**
 * Podgląd „okna kursu" — mockup platformy zbudowany z PRAWDZIWEGO programu.
 *
 * Port `components/szkolenia/OknoKursu.tsx`. Pasek postępu jest jedyną rzeczą
 * zmyśloną i tak było w prototypie: to obrazek produktu, nie stan konta —
 * pokazuje, jak wygląda kurs w środku, a nie ile ktoś przerobił.
 *
 * Oczekuje zmiennej `$kurs` (kurs ze `szczegoly_kursu`).
 *
 * @package Aai_Sklep
 */

defined( 'ABSPATH' ) || exit;

/** @var array<string,mixed> $kurs */
$aai_moduly = array_slice( $kurs['modules'], 0, 4 );
$aai_lekcje = array();
foreach ( $kurs['modules'] as $aai_modul ) {
	foreach ( $aai_modul['lessons'] as $aai_lekcja ) {
		$aai_lekcje[] = $aai_lekcja;
	}
}
$aai_lekcje = array_slice( $aai_lekcje, 0, 4 );
$aai_postep = array( 100, 60, 0, 0 );
?>
<div class="aai-okno">
	<div class="aai-okno-pasek">
		<span aria-hidden="true" class="aai-okno-kropka"></span>
		<span aria-hidden="true" class="aai-okno-kropka"></span>
		<span aria-hidden="true" class="aai-okno-kropka aai-okno-kropka-volt"></span>
		<span class="aai-okno-adres">automaticai.pl/szkolenia/<?php echo esc_html( $kurs['slug'] ); ?></span>
	</div>
	<div class="aai-okno-tresc">
		<?php if ( ! empty( $aai_moduly ) ) : ?>
			<nav aria-label="Moduły kursu (podgląd)" class="aai-okno-program">
				<p class="aai-okno-naglowek">Program</p>
				<ul class="aai-okno-moduly">
					<?php foreach ( $aai_moduly as $aai_i => $aai_modul ) : ?>
						<li class="aai-okno-modul<?php echo 0 === $aai_i ? ' aai-okno-modul-aktywny' : ''; ?>">
							<span class="aai-liczba"><?php echo esc_html( str_pad( (string) ( $aai_i + 1 ), 2, '0', STR_PAD_LEFT ) ); ?></span>
							<?php echo esc_html( $aai_modul['title'] ); ?>
						</li>
					<?php endforeach; ?>
				</ul>
			</nav>
		<?php endif; ?>
		<div class="aai-okno-lekcje">
			<p class="aai-okno-tytul"><?php echo esc_html( $kurs['title'] ); ?></p>
			<ul class="aai-okno-lista">
				<?php foreach ( $aai_lekcje as $aai_i => $aai_lekcja ) : ?>
					<?php
					$aai_procent = $aai_postep[ $aai_i ] ?? 0;
					$aai_stan    = 100 === $aai_procent ? 'zrobiona' : ( $aai_procent > 0 ? 'w-toku' : 'zamknieta' );
					$aai_ikona   = 100 === $aai_procent ? 'check' : ( $aai_procent > 0 ? 'play' : 'lock' );
					?>
					<li class="aai-okno-lekcja">
						<span aria-hidden="true" class="aai-okno-znacznik aai-okno-znacznik-<?php echo esc_attr( $aai_stan ); ?>">
							<?php echo Aai_Sklep_Widok::ikona( $aai_ikona, 'aai-ikona-xs' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
						</span>
						<span class="aai-okno-lekcja-tresc">
							<span class="aai-okno-lekcja-tytul"><?php echo esc_html( $aai_lekcja['title'] ); ?></span>
							<span class="aai-okno-tor">
								<span class="aai-okno-postep" style="width:<?php echo esc_attr( (string) $aai_procent ); ?>%"></span>
							</span>
						</span>
						<?php if ( ! empty( $aai_lekcja['duration_min'] ) ) : ?>
							<span class="aai-okno-czas"><?php echo esc_html( (string) $aai_lekcja['duration_min'] ); ?> min</span>
						<?php endif; ?>
					</li>
				<?php endforeach; ?>
			</ul>
		</div>
	</div>
</div>
