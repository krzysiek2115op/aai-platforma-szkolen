<?php
/**
 * Pływająca pigułka nawigacji kursu — port `components/kurs/PasekKursu.tsx`.
 *
 * MUSI STAĆ POZA `<main>` (`position: fixed`) — uzasadnienie w `czesci/tlo.php`.
 *
 * BEZ JS PASEK DZIAŁA: kotwice są zwykłymi odnośnikami, a `sklep.js` dokłada
 * wyłącznie podświetlenie sekcji, na której właśnie jesteś. To ta sama zasada
 * co w prototypie — skrypt ulepsza, nie warunkuje.
 *
 * Oczekuje `$pozycje` (lista par [id, napis]) i `$kurs`.
 *
 * @package Aai_Sklep
 */

defined( 'ABSPATH' ) || exit;

/** @var array<int,array{0:string,1:string}> $pozycje */
?>
<header class="aai-pasek" data-aai-pasek>
	<nav aria-label="Nawigacja kursu" class="aai-pasek-pigulka">
		<a href="<?php echo esc_url( Aai_Sklep_Widok::adres_kursu() ); ?>"
			aria-label="Wróć do katalogu szkoleń" class="aai-pasek-wroc">
			<?php echo Aai_Sklep_Widok::sygnet( 'aai-pasek-sygnet' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
			<?php echo Aai_Sklep_Widok::ikona( 'arrow-left', 'aai-pasek-strzalka' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
		</a>

		<ul class="aai-pasek-lista">
			<?php foreach ( $pozycje as $aai_pozycja ) : ?>
				<li>
					<a href="#<?php echo esc_attr( $aai_pozycja[0] ); ?>" class="aai-pasek-kotwica">
						<?php echo esc_html( $aai_pozycja[1] ); ?>
					</a>
				</li>
			<?php endforeach; ?>
		</ul>

		<a href="#cena" class="aai-btn aai-btn-glowny aai-pasek-cta">
			Dołącz
			<?php echo Aai_Sklep_Widok::ikona( 'arrow-right', 'aai-ikona-xs' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
		</a>
	</nav>
</header>
