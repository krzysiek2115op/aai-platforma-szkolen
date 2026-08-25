<?php
/**
 * Edytor TREŚCI lekcji — czyli materiału kursu.
 *
 * Program to spis treści; treść lekcji to sam kurs — to, co kupujący czyta
 * po zalogowaniu. Pisze się ją osobno, lekcja po lekcji, i zapis dotyczy
 * WYŁĄCZNIE tej lekcji: program i strona sprzedażowa zostają nietknięte.
 *
 * CZEGO TEN EKRAN NIE ROBI (i nie jest to przeoczenie):
 *
 *  * NIE RENDERUJE MARKDOWNA. Prawdziwy skład przyjdzie z widokiem lekcji
 *    (krok W5, wygląd leży gotowy w `tools/podglad-kursow/`). Udawanie go
 *    tutaj kłamałoby o wyglądzie gotowej lekcji.
 *  * NIE PRZYJMUJE WIDEO. Kurs jest tekstowy — decyzja właściciela
 *    z 2026-08-19. Nie ma pól na hosting, długość filmu ani napisy.
 *  * NIE ZAPISUJE SAM. Wyjście ze strony z niezapisaną lekcją przeglądarka
 *    zatrzyma pytaniem, ale zapisuje się przyciskiem.
 *
 * @package Aai_Sklep
 *
 * @var array<string,mixed>              $lekcja Lekcja do pisania.
 * @var array<string,string>             $bledy  Błędy z odrzuconego zapisu.
 * @var array<string,array<string,mixed>> $pola  Opis pól treści lekcji.
 */

defined( 'ABSPATH' ) || exit;

$aai_tresc = (string) $lekcja['tresc'];
$aai_opis  = $pola['tresc'];
?>
<div class="wrap aai-panel aai-panel--lekcja">
	<h1 class="wp-heading-inline">
		<?php
		printf(
			/* translators: 1: numer lekcji w programie, 2: tytuł lekcji. */
			esc_html__( 'Lekcja %1$s — %2$s', 'aai-sklep' ),
			esc_html( (string) $lekcja['numer'] ),
			esc_html( (string) $lekcja['title'] )
		);
		?>
	</h1>
	<a href="<?php echo esc_url( Aai_Sklep_Panel::adres_kursu( (string) $lekcja['kurs_id'], array( 'zakladka' => 'program' ) ) ); ?>"
		class="page-title-action">
		<?php esc_html_e( 'Wróć do programu', 'aai-sklep' ); ?>
	</a>
	<hr class="wp-header-end" />

	<p class="aai-okruszki">
		<?php echo esc_html( (string) $lekcja['kurs_tytul'] ); ?>
		<span aria-hidden="true">›</span>
		<?php echo esc_html( (string) $lekcja['modul_tytul'] ); ?>
	</p>

	<?php Aai_Sklep_Panel::komunikat(); ?>

	<?php if ( array() !== $bledy ) : ?>
		<div class="notice notice-error">
			<ul class="aai-bledy">
				<?php foreach ( $bledy as $aai_sciezka => $aai_blad ) : ?>
					<li><code><?php echo esc_html( (string) $aai_sciezka ); ?></code> — <?php echo esc_html( (string) $aai_blad ); ?></li>
				<?php endforeach; ?>
			</ul>
		</div>
	<?php endif; ?>

	<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="aai-formularz" data-aai-formularz>
		<?php wp_nonce_field( Aai_Sklep_Panel_Akcje::ZAPISZ_LEKCJE ); ?>
		<input type="hidden" name="action" value="<?php echo esc_attr( Aai_Sklep_Panel_Akcje::ZAPISZ_LEKCJE ); ?>" />
		<input type="hidden" name="id" value="<?php echo esc_attr( (string) $lekcja['id'] ); ?>" />
		<input type="hidden" name="materialy" data-aai-json="materialy"
			value="<?php echo esc_attr( (string) wp_json_encode( array_values( (array) $lekcja['materialy'] ) ) ); ?>" />

		<div class="aai-pole aai-pole--tresc" data-aai-pole="tresc" data-aai-typ="akapit" data-aai-bez-serializacji>
			<label class="aai-pole__etykieta" for="aai-tresc">
				<?php echo esc_html( Aai_Sklep_Pola::etykieta( 'tresc', $aai_opis ) ); ?>
			</label>
			<?php
			/*
			 * `name="tresc"` — jedno pole, więc jedzie zwyczajnie w POST-cie,
			 * bez składania JSON-a. Dzięki temu materiał kursu przechodzi
			 * NAJKRÓTSZĄ drogą: przeglądarka → PHP → baza, bez pośrednictwa
			 * kodowania, które mogłoby cokolwiek po drodze zmienić.
			 */
			?>
			<textarea id="aai-tresc" name="tresc" class="large-text code aai-edytor"
				rows="<?php echo (int) $aai_opis['wiersze']; ?>"
				data-aai-limit="<?php echo (int) $aai_opis['limit']; ?>"
				placeholder="<?php echo esc_attr( (string) $aai_opis['placeholder'] ); ?>"
				spellcheck="true"><?php echo esc_textarea( $aai_tresc ); ?></textarea>
			<p class="description"><?php echo esc_html( (string) $aai_opis['pomoc'] ); ?></p>
			<p class="description aai-licznik" aria-live="polite"></p>
		</div>

		<div class="postbox aai-materialy">
			<div class="postbox-header"><h2 class="hndle"><?php esc_html_e( 'Materiały dodatkowe', 'aai-sklep' ); ?></h2></div>
			<div class="inside">
				<?php Aai_Sklep_Panel_Pola::pole( 'materialy', $pola['materialy'], (array) $lekcja['materialy'] ); ?>
			</div>
		</div>

		<p class="submit aai-zapisz">
			<button type="submit" class="button button-primary button-hero aai-glowny">
				<?php esc_html_e( 'Zapisz lekcję', 'aai-sklep' ); ?>
			</button>
			<a class="button" href="<?php echo esc_url( Aai_Sklep_Widok::adres_kursu( (string) $lekcja['kurs_slug'] ) ); ?>" target="_blank" rel="noopener">
				<?php esc_html_e( 'Podgląd strony kursu', 'aai-sklep' ); ?>
			</a>
			<span class="aai-niezapisane" data-aai-niezapisane hidden>
				<?php esc_html_e( 'Masz niezapisane zmiany.', 'aai-sklep' ); ?>
			</span>
		</p>
	</form>
</div>
