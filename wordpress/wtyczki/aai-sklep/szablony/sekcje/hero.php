<?php
/**
 * Hero strony kursu — port `components/kurs/HeroKursu.tsx`.
 *
 * Obietnica i rozwinięcie mają AWARIE: gdy sekcja `hero` nie istnieje albo nie
 * ma pola, hero bierze tytuł i krótki opis kursu. Strona sprzedażowa nie ma
 * prawa być pusta tylko dlatego, że ktoś nie wypełnił jednej sekcji w kreatorze.
 *
 * Oczekuje `$kurs` oraz `$hero` (treść sekcji `hero` albo null).
 *
 * @package Aai_Sklep
 */

defined( 'ABSPATH' ) || exit;

/** @var array<string,mixed> $kurs */
/** @var array<string,mixed>|null $hero */
$aai_obietnica   = $hero['obietnica'] ?? $kurs['title'];
$aai_rozwiniecie = $hero['rozwiniecie'] ?? $kurs['short_desc'] ?? null;
$aai_dla_kogo    = $hero['dla_kogo'] ?? null;

/* Plakietka: typ · moduły · lekcje · poziom. Kurs bez lekcji mówi wprost,
   że materiału jeszcze nie ma — zamiast milczeć i udawać, że jest. */
$aai_plakietka = array( $kurs['type'] );
if ( $kurs['modules_count'] > 0 ) {
	$aai_plakietka[] = Aai_Sklep_Widok::moduly( (int) $kurs['modules_count'] );
}
$aai_plakietka[] = $kurs['lessons_count'] > 0
	? Aai_Sklep_Widok::lekcje( (int) $kurs['lessons_count'] )
	: 'premiera wkrótce';
$aai_poziom = Aai_Sklep_Widok::poziom( $kurs['level'] ?? null );
if ( null !== $aai_poziom ) {
	$aai_plakietka[] = 'poziom ' . $aai_poziom;
}
?>
<section class="aai-hero aai-spotlight" data-aai-spotlight>
	<div aria-hidden="true" class="aai-siatka-tla aai-maska-y aai-warstwa"></div>
	<div aria-hidden="true" class="aai-hero-poswiata"></div>
	<div aria-hidden="true" class="aai-ziarno aai-warstwa"></div>

	<div class="aai-kontener aai-hero-uklad">
		<div>
			<p class="aai-etykieta">[ <?php echo esc_html( implode( ' · ', $aai_plakietka ) ); ?> ]</p>
			<h1 class="aai-hero-tytul"><?php echo esc_html( $aai_obietnica ); ?></h1>
			<?php if ( null !== $aai_rozwiniecie ) : ?>
				<p class="aai-hero-lead"><?php echo esc_html( $aai_rozwiniecie ); ?></p>
			<?php endif; ?>
			<?php if ( null !== $aai_dla_kogo ) : ?>
				<p class="aai-hero-dla-kogo"><?php echo esc_html( $aai_dla_kogo ); ?></p>
			<?php endif; ?>

			<div class="aai-hero-akcje">
				<?php Aai_Sklep_Widok::cta( $kurs ); ?>
				<a class="aai-btn aai-btn-obrys aai-btn-duzy" href="#program">Zobacz program</a>
			</div>
			<p class="aai-mono aai-hero-warunki">
				<?php echo esc_html( Aai_Sklep_Widok::formatuj_cene( Aai_Sklep_Widok::cena_grosze( $kurs ) ) ); ?>
				· dostęp bez limitu czasu · aktualizacje w cenie
			</p>
		</div>

		<div class="aai-hero-wizual aai-paralaksa-1" aria-hidden="true">
			<?php require __DIR__ . '/../czesci/okno-kursu.php'; ?>
		</div>
	</div>
</section>
