<?php
/**
 * Domknięcie strony — port `components/kurs/FinalCta.tsx`.
 *
 * Oczekuje `$kurs`.
 *
 * @package Aai_Sklep
 */

defined( 'ABSPATH' ) || exit;

/** @var array<string,mixed> $kurs */
?>
<section class="aai-final">
	<div aria-hidden="true" class="aai-final-poswiata"></div>
	<div class="aai-kontener aai-final-uklad">
		<div>
			<h2 class="aai-final-tytul">
				Za tydzień możesz dalej próbować na czuja —<span class="aai-akcent"> albo pracować systemem.</span>
			</h2>
			<p class="aai-final-opis">
				Dostęp od razu po zakupie, bez limitu czasu. Masz pytanie przed zakupem?
				Napisz — odpowiadamy szczerze.
			</p>
		</div>
		<?php Aai_Sklep_Widok::cta( Aai_Sklep_Widok::cena_grosze( $kurs ) ); ?>
	</div>
</section>
