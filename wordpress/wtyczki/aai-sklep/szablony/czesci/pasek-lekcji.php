<?php
/**
 * Pływająca pigułka widoku lekcji — port `pigulka()` z podglądu kursów.
 *
 * MUSI STAĆ POZA `<main>` (`position: fixed`) — uzasadnienie w `czesci/tlo.php`.
 *
 * BEZ JS DZIAŁA W CAŁOŚCI: rozwijane menu to `<details>`, a spis lekcji
 * i spis sekcji to zwykłe odsyłacze. Skrypt dokłada wyłącznie podświetlenie
 * sekcji, na której właśnie jesteś, i nitkę postępu czytania.
 *
 * Oczekuje `$dane` z `Aai_Sklep_Lekcja::dane()`.
 *
 * @package Aai_Sklep
 */

defined( 'ABSPATH' ) || exit;

/** @var array<string,mixed> $dane */
$aai_ukonczonych = Aai_Sklep_Lekcja::ile_ukonczonych( $dane['program'] );
?>
<header class="aai-pasek" data-aai-pasek>
	<nav aria-label="Nawigacja lekcji" class="aai-pasek-pigulka">
		<a href="<?php echo esc_url( $dane['wroc']['adres'] ); ?>"
			aria-label="<?php echo esc_attr( $dane['wroc']['etykieta'] ); ?>" class="aai-pasek-wroc">
			<?php echo Aai_Sklep_Widok::sygnet( 'aai-pasek-sygnet' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
			<?php echo Aai_Sklep_Widok::ikona( 'arrow-left', 'aai-pasek-strzalka' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
		</a>

		<p class="aai-pasek-tytul">
			<?php echo esc_html( $dane['kurs']['title'] ); ?>
			<span>Lekcja <?php echo (int) $dane['numer']; ?> z <?php echo (int) $dane['wszystkich']; ?></span>
		</p>

		<details class="aai-rozwijane">
			<summary class="aai-pasek-kotwica">
				<?php echo Aai_Sklep_Widok::ikona( 'list', 'aai-ikona-xs' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
				<span>Program</span>
				<?php echo Aai_Sklep_Widok::ikona( 'chevron-down', 'aai-ikona-xs' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
			</summary>
			<div class="aai-rozwijane-tresc">
				<p class="aai-rozwijane-naglowek"><?php echo esc_html( $dane['kurs']['title'] ); ?></p>
				<?php if ( is_user_logged_in() ) : ?>
					<div class="aai-postep-kursu">
						<span>Przerobione</span>
						<span class="aai-postep-tor"><span class="aai-postep-wypelnienie"
							style="width: <?php echo (int) ( $dane['wszystkich'] > 0 ? round( 100 * $aai_ukonczonych / $dane['wszystkich'] ) : 0 ); ?>%"></span></span>
						<span class="aai-postep-etykieta"><?php echo (int) $aai_ukonczonych; ?> / <?php echo (int) $dane['wszystkich']; ?></span>
					</div>
				<?php endif; ?>
				<?php foreach ( $dane['program'] as $aai_modul ) : ?>
					<div class="aai-spis-modul">
						<p class="aai-rozwijane-naglowek">Moduł <?php echo (int) $aai_modul['nr']; ?> — <?php echo esc_html( $aai_modul['tytul'] ); ?></p>
						<ul class="aai-spis-lista">
							<?php foreach ( $aai_modul['lekcje'] as $aai_poz ) : ?>
								<li>
									<a href="<?php echo esc_url( $aai_poz['adres'] ); ?>"
										<?php echo $aai_poz['id'] === $dane['lekcja']['id'] ? ' aria-current="page"' : ''; ?>
										<?php echo $aai_poz['post_id'] > 0 && Aai_Sklep_Lekcja::ukonczona( (int) $aai_poz['post_id'] ) ? ' data-aai-przeczytana="1"' : ''; ?>>
										<span class="aai-spis-nr"><?php echo (int) $aai_poz['modul']; ?>.<?php echo (int) $aai_poz['nr']; ?></span>
										<span><?php echo esc_html( $aai_poz['tytul'] ); ?></span>
									</a>
								</li>
							<?php endforeach; ?>
						</ul>
					</div>
				<?php endforeach; ?>
			</div>
		</details>

		<?php if ( ! empty( $dane['spis'] ) ) : ?>
			<details class="aai-rozwijane">
				<summary class="aai-pasek-kotwica">
					<?php echo Aai_Sklep_Widok::ikona( 'target', 'aai-ikona-xs' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
					<span>W tej lekcji</span>
					<?php echo Aai_Sklep_Widok::ikona( 'chevron-down', 'aai-ikona-xs' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
				</summary>
				<div class="aai-rozwijane-tresc">
					<p class="aai-rozwijane-naglowek">W tej lekcji</p>
					<ul class="aai-spis-lista">
						<?php foreach ( $dane['spis'] as $aai_sekcja ) : ?>
							<li>
								<a href="#<?php echo esc_attr( $aai_sekcja['id'] ); ?>">
									<?php
									/*
									 * Tekst pozycji jest już ZŁOŻONY (przeszedł przez skład
									 * w linii, żeby nazwy plików w odwróconych apostrofach
									 * były pisane czcionką o stałej szerokości). Druga
									 * ucieczka pokazałaby tu surowe znaczniki.
									 */
									echo wp_kses( $aai_sekcja['tekst'], array( 'code' => array(), 'strong' => array(), 'em' => array() ) );
									?>
								</a>
							</li>
						<?php endforeach; ?>
					</ul>
				</div>
			</details>
		<?php endif; ?>

		<?php if ( null !== $dane['nastepna'] ) : ?>
			<a class="aai-btn aai-btn-glowny aai-pasek-cta" href="<?php echo esc_url( $dane['nastepna']['adres'] ); ?>">
				Następna
				<?php echo Aai_Sklep_Widok::ikona( 'arrow-right', 'aai-ikona-xs' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
			</a>
		<?php endif; ?>

		<span class="aai-pasek-postep" aria-hidden="true"></span>
	</nav>
</header>
