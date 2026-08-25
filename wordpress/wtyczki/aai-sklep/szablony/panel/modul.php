<?php
/**
 * Jeden moduł programu — w liście modułów i jako szablon dla nowego.
 *
 * TEN SAM PLIK W OBU ROLACH celowo: gdyby „nowy moduł" rysował inny kod niż
 * „moduł z bazy", oba warianty rozjechałyby się przy pierwszym nowym polu,
 * a objaw byłby taki, że nowo dodany moduł gubi wartość, której nikt nie
 * widzi w formularzu.
 *
 * @package Aai_Sklep
 *
 * @var array<string,mixed> $aai_modul          Moduł do narysowania.
 * @var bool                $aai_szablon_modulu Czy to pusty szablon dla skryptu.
 */

defined( 'ABSPATH' ) || exit;
?>
<div class="postbox aai-modul" data-aai-modul
	data-aai-id="<?php echo esc_attr( (string) $aai_modul['id'] ); ?>"
	data-aai-position="<?php echo esc_attr( (string) $aai_modul['position'] ); ?>">
	<div class="postbox-header aai-modul__naglowek">
		<h2 class="hndle">
			<span class="aai-numer" data-aai-numer-modulu></span>
			<span class="aai-modul__tytul" data-aai-podglad-tytulu><?php echo esc_html( (string) $aai_modul['title'] ); ?></span>
			<span class="aai-plakietka" data-aai-licznik-lekcji></span>
		</h2>
		<div class="aai-modul__akcje">
			<button type="button" class="button button-small" data-aai-gora aria-label="<?php esc_attr_e( 'Przenieś moduł wyżej', 'aai-sklep' ); ?>">↑</button>
			<button type="button" class="button button-small" data-aai-dol aria-label="<?php esc_attr_e( 'Przenieś moduł niżej', 'aai-sklep' ); ?>">↓</button>
			<button type="button" class="button button-small button-link-delete" data-aai-usun-modul>
				<?php esc_html_e( 'Usuń moduł', 'aai-sklep' ); ?>
			</button>
		</div>
	</div>
	<div class="inside">
		<div class="aai-pole" data-aai-pole="title" data-aai-typ="krotki">
			<label class="aai-pole__etykieta">
				<?php esc_html_e( 'Tytuł modułu', 'aai-sklep' ); ?>
				<span class="aai-pole__gwiazdka" aria-hidden="true">*</span>
			</label>
			<input type="text" class="large-text aai-wartosc" data-aai-wartosc
				value="<?php echo esc_attr( (string) $aai_modul['title'] ); ?>"
				data-aai-limit="<?php echo (int) Aai_Sklep_Kontrakt::LIMIT_TYTULU; ?>" />
		</div>
		<div class="aai-pole" data-aai-pole="summary" data-aai-typ="akapit">
			<label class="aai-pole__etykieta"><?php esc_html_e( 'Opis modułu', 'aai-sklep' ); ?></label>
			<textarea class="large-text aai-wartosc" rows="2" data-aai-wartosc
				data-aai-limit="<?php echo (int) Aai_Sklep_Kontrakt::LIMIT_PODSUMOWANIA; ?>"><?php echo esc_textarea( (string) $aai_modul['summary'] ); ?></textarea>
		</div>

		<div class="aai-lekcje" data-aai-lekcje>
			<?php foreach ( (array) $aai_modul['lekcje'] as $aai_lekcja ) : ?>
				<?php require AAI_SKLEP_KATALOG . 'szablony/panel/lekcja-wiersz.php'; ?>
			<?php endforeach; ?>
		</div>
		<template data-aai-szablon-lekcji>
			<?php
			$aai_lekcja = array(
				'id'           => '',
				'position'     => 0,
				'title'        => '',
				'duration_min' => '',
				'preview'      => false,
				'ma_tresc'     => false,
				'znakow'       => 0,
			);
			require AAI_SKLEP_KATALOG . 'szablony/panel/lekcja-wiersz.php';
			?>
		</template>
		<p>
			<button type="button" class="button button-small" data-aai-dodaj-lekcje>
				<?php esc_html_e( 'Dodaj lekcję', 'aai-sklep' ); ?>
			</button>
		</p>
	</div>
</div>
