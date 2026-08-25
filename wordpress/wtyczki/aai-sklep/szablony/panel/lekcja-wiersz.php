<?php
/**
 * Jedna lekcja w programie modułu.
 *
 * PRZYCISK „TREŚĆ" POJAWIA SIĘ DOPIERO, GDY LEKCJA JEST W BAZIE. Do pisania
 * materiału potrzebny jest jej identyfikator, a świeżo dodany wiersz jeszcze
 * go nie ma — dlatego w tym miejscu stoi wtedy „zapisz kurs". Tak samo
 * zachowywał się panel prototypu i tak samo brzmi tabela usterek w KREATOR.md.
 *
 * @package Aai_Sklep
 *
 * @var array<string,mixed> $aai_lekcja Lekcja do narysowania.
 */

defined( 'ABSPATH' ) || exit;

$aai_lekcja_id = (string) $aai_lekcja['id'];
?>
<div class="aai-lekcja" data-aai-lekcja
	data-aai-id="<?php echo esc_attr( $aai_lekcja_id ); ?>"
	data-aai-position="<?php echo esc_attr( (string) $aai_lekcja['position'] ); ?>">
	<span class="aai-numer" data-aai-numer-lekcji></span>

	<span class="aai-pole aai-lekcja__tytul" data-aai-pole="title" data-aai-typ="krotki">
		<label class="screen-reader-text"><?php esc_html_e( 'Tytuł lekcji', 'aai-sklep' ); ?></label>
		<input type="text" class="large-text aai-wartosc" data-aai-wartosc
			value="<?php echo esc_attr( (string) $aai_lekcja['title'] ); ?>"
			placeholder="<?php esc_attr_e( 'Tytuł lekcji', 'aai-sklep' ); ?>"
			data-aai-limit="<?php echo (int) Aai_Sklep_Kontrakt::LIMIT_TYTULU; ?>" />
	</span>

	<span class="aai-pole aai-lekcja__czas" data-aai-pole="duration_min" data-aai-typ="liczba">
		<label class="screen-reader-text"><?php esc_html_e( 'Czas przerobienia w minutach', 'aai-sklep' ); ?></label>
		<input type="number" class="small-text aai-wartosc" data-aai-wartosc min="1"
			max="<?php echo (int) Aai_Sklep_Kontrakt::LIMIT_CZASU_MIN; ?>"
			value="<?php echo esc_attr( (string) $aai_lekcja['duration_min'] ); ?>"
			placeholder="<?php esc_attr_e( 'min', 'aai-sklep' ); ?>" />
	</span>

	<label class="aai-lekcja__zajawka">
		<span class="aai-pole" data-aai-pole="preview" data-aai-typ="prawda_falsz">
			<input type="checkbox" class="aai-wartosc" data-aai-wartosc <?php checked( (bool) $aai_lekcja['preview'] ); ?> />
		</span>
		<?php esc_html_e( 'zajawka', 'aai-sklep' ); ?>
	</label>

	<span class="aai-lekcja__tresc">
		<?php if ( '' === $aai_lekcja_id ) : ?>
			<span class="aai-podpowiedz"><?php esc_html_e( 'zapisz kurs', 'aai-sklep' ); ?></span>
		<?php else : ?>
			<a class="button button-small" href="<?php echo esc_url( Aai_Sklep_Panel::adres_lekcji( $aai_lekcja_id ) ); ?>">
				<?php esc_html_e( 'Treść', 'aai-sklep' ); ?>
			</a>
			<?php if ( ! empty( $aai_lekcja['ma_tresc'] ) ) : ?>
				<span class="aai-plakietka aai-plakietka--gotowa" title="<?php
					echo esc_attr(
						sprintf(
							/* translators: %s: liczba znaków treści. */
							__( '%s znaków', 'aai-sklep' ),
							number_format_i18n( (int) $aai_lekcja['znakow'] )
						)
					);
				?>"><?php esc_html_e( 'z treścią', 'aai-sklep' ); ?></span>
			<?php else : ?>
				<span class="aai-plakietka aai-plakietka--braki"><?php esc_html_e( 'pusta', 'aai-sklep' ); ?></span>
			<?php endif; ?>
		<?php endif; ?>
	</span>

	<span class="aai-lekcja__akcje">
		<button type="button" class="button button-small" data-aai-gora aria-label="<?php esc_attr_e( 'Przenieś lekcję wyżej', 'aai-sklep' ); ?>">↑</button>
		<button type="button" class="button button-small" data-aai-dol aria-label="<?php esc_attr_e( 'Przenieś lekcję niżej', 'aai-sklep' ); ?>">↓</button>
		<button type="button" class="button button-small button-link-delete" data-aai-usun-lekcje aria-label="<?php esc_attr_e( 'Usuń lekcję', 'aai-sklep' ); ?>">✕</button>
	</span>
</div>
