<?php
/**
 * Strona sprzedażowa `/szkolenia/<slug>` — port `app/szkolenia/[slug]/widok.tsx`.
 *
 * Course Detail System (brief właściciela, B5 iteracja 3): premium product page
 * + sales page + mini sklep. Ten plik jest CIENKĄ KOMPOZYCJĄ — każda sekcja
 * mieszka w osobnym pliku, bierze treść z bazy, a sekcja bez treści po prostu
 * znika. Kolejność to psychologia scrolla z briefu: zainteresowanie → problem →
 * wartość → program → dowód → oferta → redukcja obaw → CTA.
 *
 * UWAGA NA UKŁAD: tło i pasek są `position: fixed` i MUSZĄ stać poza `<main>` —
 * uzasadnienie w `czesci/tlo.php`.
 *
 * @package Aai_Sklep
 */

defined( 'ABSPATH' ) || exit;

$kurs = Aai_Sklep_Trasy::kurs();
if ( null === $kurs ) {
	require __DIR__ . '/nie-znaleziono.php';
	return;
}

$aai_sekcje = $kurs['sections'];
$aai_ma     = static fn( string $rodzaj ): bool => ! empty( $aai_sekcje[ $rodzaj ] );

/* Numeracja etykiet liczy się dynamicznie: pominięta sekcja nie zużywa numeru. */
$aai_licznik = 0;
$aai_numer   = static function ( string $nazwa ) use ( &$aai_licznik ): string {
	++$aai_licznik;
	return str_pad( (string) $aai_licznik, 2, '0', STR_PAD_LEFT ) . ' · ' . $nazwa;
};

/* Pasek pokazuje wyłącznie sekcje, które naprawdę są na stronie. */
$aai_pozycje = array();
if ( $aai_ma( 'problem' ) ) {
	$aai_pozycje[] = array( 'poznaj', 'Poznaj kurs' );
}
if ( ! empty( $kurs['modules'] ) ) {
	$aai_pozycje[] = array( 'program', 'Program' );
}
if ( $aai_ma( 'package' ) ) {
	$aai_pozycje[] = array( 'pakiet', 'Co otrzymujesz' );
}
if ( $aai_ma( 'for_whom' ) ) {
	$aai_pozycje[] = array( 'dla-kogo', 'Dla kogo' );
}
if ( $aai_ma( 'opinions' ) ) {
	$aai_pozycje[] = array( 'opinie', 'Opinie' );
}
if ( $aai_ma( 'faq' ) ) {
	$aai_pozycje[] = array( 'faq', 'FAQ' );
}
$aai_pozycje[] = array( 'cena', 'Cena' );

get_header();

require __DIR__ . '/czesci/tlo.php';

$pozycje = $aai_pozycje;
require __DIR__ . '/czesci/pasek.php';
?>
<main id="tresc" class="aai-strona" data-kurs>

	<?php
	$hero = $aai_sekcje['hero'] ?? null;
	require __DIR__ . '/sekcje/hero.php';
	?>

	<?php
	/* Sekcje sprzedażowe — kolejność i uzasadnienie w Aai_Sklep_Sekcje. */
	// Lista mieszka w `Aai_Sklep_Sekcje::KOLEJNOSC` — patrz komentarz tam.

	foreach ( Aai_Sklep_Sekcje::KOLEJNOSC as list( $aai_rodzaj, $aai_nazwa ) ) :
		// Pozycje z „#" to sekcje własne strony (program, platforma, cena),
		// a nie treść z tabeli sekcji.
		if ( str_starts_with( $aai_rodzaj, '#' ) ) {
			$aai_plik = substr( $aai_rodzaj, 1 );
			if ( in_array( $aai_plik, array( 'program', 'platforma' ), true ) && empty( $kurs['modules'] ) ) {
				continue;
			}
			$etykieta = $aai_numer( $aai_nazwa );
			require __DIR__ . '/czesci/' . $aai_plik . '.php';
			continue;
		}

		if ( ! $aai_ma( $aai_rodzaj ) ) {
			continue;
		}
		$etykieta = $aai_numer( $aai_nazwa );
		$tresc    = $aai_sekcje[ $aai_rodzaj ];
		require __DIR__ . '/sekcje/' . $aai_rodzaj . '.php';
	endforeach;
	?>

	<?php require __DIR__ . '/czesci/final-cta.php'; ?>

</main>
<?php
get_footer();
