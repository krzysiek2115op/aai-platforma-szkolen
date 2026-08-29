<?php
/**
 * „Pytania, które zadałbyś i Ty" — port `components/kurs/SekcjaFaq.tsx`.
 *
 * Akordeon na natywnym `<details>` — bez JavaScriptu. Te same pytania trafiają
 * do danych strukturalnych `FAQPage`, i tylko wtedy, gdy ta sekcja naprawdę
 * jest na stronie.
 *
 * @package Aai_Sklep
 */

defined( 'ABSPATH' ) || exit;

/** @var array<string,mixed> $tresc */
/** @var string $etykieta */
?>
<section id="faq" class="aai-kontener aai-sekcja">
	<?php Aai_Sklep_Widok::naglowek_sekcji( $etykieta, 'Pytania, które zadałbyś i Ty' ); ?>

	<div class="aai-lista-pionowa aai-lista-waska" data-aai-cascade="0.05">
		<?php foreach ( $tresc['pytania'] as $aai_p ) : ?>
			<div class="aai-reveal" data-aai-cascade-item>
				<details class="aai-panel aai-akordeon">
					<summary class="aai-akordeon-naglowek">
						<span class="aai-akordeon-pytanie"><?php echo esc_html( $aai_p['pytanie'] ); ?></span>
						<?php echo Aai_Sklep_Widok::ikona( 'chevron-down', 'aai-ikona-s aai-akordeon-strzalka' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
					</summary>
					<p class="aai-akordeon-odpowiedz"><?php echo esc_html( $aai_p['odpowiedz'] ); ?></p>
				</details>
			</div>
		<?php endforeach; ?>
	</div>

	<p class="aai-faq-stopka">
		Masz inne pytanie?
		<a href="<?php echo esc_url( Aai_Sklep_Widok::adres_kontaktu() ); ?>">Napisz do nas</a>
		— odpowiadamy szczerze, także gdy ten kurs nie jest dla Ciebie.
	</p>
</section>
