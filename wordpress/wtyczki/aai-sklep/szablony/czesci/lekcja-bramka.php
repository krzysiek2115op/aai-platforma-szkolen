<?php
/**
 * Lekcja bez dostępu — zaproszenie zamiast materiału.
 *
 * O dostępie decyduje TUTOR (`has_enrolled_content_access`), a my
 * pokazujemy odmowę w naszym wyglądzie. Materiał NIE jest tu wczytany —
 * `Aai_Sklep_Lekcja` nie czyta treści, gdy dostępu nie ma, więc nie ma jak
 * wyciec przez pomyłkę w szablonie.
 *
 * @package Aai_Sklep
 */

defined( 'ABSPATH' ) || exit;

/** @var array<string,mixed> $dane */
?>
<div class="aai-tresc">
	<div class="aai-uwaga">
		<p><strong>Ta lekcja jest częścią kursu.</strong>
		Materiał otwiera się po zakupie i zalogowaniu — wtedy zobaczysz go tutaj,
		razem z całym programem i swoim postępem.</p>
	</div>

	<p style="text-align:center">
		<a class="aai-btn aai-btn-glowny" href="<?php echo esc_url( $dane['adres_kursu'] ); ?>">
			Zobacz, co jest w kursie
			<?php echo Aai_Sklep_Widok::ikona( 'arrow-right', 'aai-ikona-xs' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
		</a>
	</p>

	<?php if ( ! is_user_logged_in() ) : ?>
		<p style="text-align:center">
			<a href="<?php echo esc_url( wp_login_url( get_permalink( (int) $dane['post_id'] ) ) ); ?>">
				Masz już dostęp? Zaloguj się
			</a>
		</p>
	<?php endif; ?>
</div>
