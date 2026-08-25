<?php
/**
 * Karta katalogu — port `Karta` z `app/szkolenia/widok.tsx`.
 *
 * WSZYSTKIE PRODUKTY RÓWNE (decyzja właściciela, brief Course Detail System
 * pkt 1–2): żadnej karty wyróżnionej i pełny opis „dlaczego my", a nie ucięte
 * dwie linie.
 *
 * Oczekuje `$kurs` (karta z `lista_kursow`) i `$numer` (napis „01").
 *
 * @package Aai_Sklep
 */

defined( 'ABSPATH' ) || exit;

/** @var array<string,mixed> $kurs */
/** @var string $numer */
$aai_meta = Aai_Sklep_Widok::metadane_kursu( $kurs );
$aai_okladka = Aai_Sklep_Widok::okladka( $kurs['cover_url'] ?? null );
?>
<article class="aai-karta aai-unos">
	<div class="aai-karta-okladka">
		<?php if ( null !== $aai_okladka ) : ?>
			<img
				src="<?php echo esc_url( $aai_okladka ); ?>"
				alt="<?php echo esc_attr( 'Okładka kursu: ' . $kurs['title'] ); ?>"
				class="aai-karta-obraz"
				loading="lazy"
				decoding="async" />
		<?php else : ?>
			<div aria-hidden="true" class="aai-karta-zastepnik aai-siatka-tla aai-maska-y">
				<span class="aai-mono">[ okładka ]</span>
			</div>
		<?php endif; ?>
		<span class="aai-karta-numer">/<?php echo esc_html( $numer ); ?></span>
	</div>
	<div class="aai-karta-tresc">
		<div class="aai-plakietki">
			<?php if ( ! empty( $kurs['badge'] ) ) : ?>
				<span class="aai-plakietka aai-plakietka-akcent"><?php echo esc_html( $kurs['badge'] ); ?></span>
			<?php endif; ?>
			<span class="aai-plakietka"><?php echo esc_html( $kurs['type'] ); ?></span>
		</div>
		<h3 class="aai-karta-tytul"><?php echo esc_html( $kurs['title'] ); ?></h3>
		<?php if ( ! empty( $kurs['short_desc'] ) ) : ?>
			<p class="aai-karta-opis"><?php echo esc_html( $kurs['short_desc'] ); ?></p>
		<?php endif; ?>
		<?php if ( ! empty( $aai_meta ) ) : ?>
			<p class="aai-karta-meta aai-mono"><?php echo esc_html( implode( ' · ', $aai_meta ) ); ?></p>
		<?php endif; ?>
		<div class="aai-karta-stopka">
			<p class="aai-karta-cena"><?php echo esc_html( Aai_Sklep_Widok::formatuj_cene( (int) $kurs['price_grosze'] ) ); ?></p>
			<a class="aai-btn aai-btn-glowny" href="<?php echo esc_url( Aai_Sklep_Widok::adres_kursu( (string) $kurs['slug'] ) ); ?>">
				Sprawdź ofertę
				<?php echo Aai_Sklep_Widok::ikona( 'arrow-right', 'aai-ikona-s' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
			</a>
		</div>
	</div>
</article>
