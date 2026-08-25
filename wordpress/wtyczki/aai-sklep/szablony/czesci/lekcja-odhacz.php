<?php
/**
 * Odhaczenie lekcji — formularz TUTORA, w naszej oprawie.
 *
 * DLACZEGO FORMULARZ TUTORA, A NIE WŁASNY STAN. Bo w podglądzie kursów
 * postęp mieszkał w pamięci przeglądarki i był podpisany „nie na koncie" —
 * podgląd nie znał konta. Tutaj klient JEST zalogowany, a Tutor prowadzi
 * ukończenia lekcji i z nich liczy postęp kursu. Własny licznik obok byłby
 * drugą wersją prawdy o tym samym; ta strona ma pokazywać tę, którą widzi
 * LMS.
 *
 * Pola są dokładnie te, których oczekuje Tutor (`single/lesson/complete_form.php`):
 * nonce, identyfikator lekcji i nazwa akcji. Formularz działa BEZ JavaScriptu.
 *
 * @package Aai_Sklep
 */

defined( 'ABSPATH' ) || exit;

/** @var array<string,mixed> $dane */
if ( ! is_user_logged_in() || ! function_exists( 'tutor' ) ) {
	return;
}
?>
<div class="aai-odhacz-pas">
	<?php if ( $dane['ukonczona'] ) : ?>
		<button type="button" class="aai-odhacz" aria-pressed="true" disabled>
			<?php echo Aai_Sklep_Widok::ikona( 'check', 'aai-ikona-xs' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
			<span>Lekcja przerobiona</span>
		</button>
	<?php else : ?>
		<form method="post">
			<?php wp_nonce_field( tutor()->nonce_action, tutor()->nonce, false ); ?>
			<input type="hidden" name="lesson_id" value="<?php echo (int) $dane['post_id']; ?>">
			<input type="hidden" name="tutor_action" value="tutor_complete_lesson">
			<button type="submit" class="aai-odhacz" name="complete_lesson_btn" value="complete_lesson">
				<?php echo Aai_Sklep_Widok::ikona( 'check', 'aai-ikona-xs' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
				<span>Oznacz jako przerobioną</span>
			</button>
		</form>
	<?php endif; ?>
	<p class="aai-odhacz-nota">Postęp zapisuje się na Twoim koncie — zobaczysz go na każdym urządzeniu.</p>
</div>
