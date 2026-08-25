<?php
/**
 * Edytor kursu: dane, sekcje sprzedażowe, program.
 *
 * JEDEN ZAPIS NA TRZY ZAKŁADKI — tak samo jak w prototypie. Zakładki nie są
 * osobnymi formularzami, tylko widokami tego samego: właściciel poprawia
 * zdanie w hero, dokłada lekcję i klika raz. Przełączanie zakładek nie
 * przeładowuje strony, więc niezapisany stan przeżywa zmianę widoku.
 *
 * SEKCJE STOJĄ W KOLEJNOŚCI, W JAKIEJ ZOBACZY JE KUPUJĄCY
 * (`Aai_Sklep_Sekcje::kolejnosc_w_panelu()`), a nie alfabetycznie. Panel nie
 * udaje, że kolejność da się przestawiać — wynika z układu strony
 * sprzedażowej (psychologia scrolla z briefu B5), nie z danych.
 *
 * @package Aai_Sklep
 *
 * @var array<string,mixed>  $kurs     Kurs do edycji.
 * @var array<string,string> $bledy    Błędy pól z odrzuconego zapisu.
 * @var string               $zakladka Zakładka do pokazania.
 */

defined( 'ABSPATH' ) || exit;

$aai_id    = (string) $kurs['id'];
$aai_nowy  = '' === $aai_id;
$aai_kolejnosc = Aai_Sklep_Sekcje::kolejnosc_w_panelu();

/** Do której zakładki należy błąd o tej ścieżce. */
$aai_zakladka_bledu = static function ( string $sciezka ): string {
	if ( str_starts_with( $sciezka, 'sekcje' ) ) {
		return 'sekcje';
	}
	if ( str_starts_with( $sciezka, 'moduly' ) ) {
		return 'program';
	}
	return 'kurs';
};

$aai_bledy_zakladek = array(
	'kurs'    => 0,
	'sekcje'  => 0,
	'program' => 0,
);
foreach ( array_keys( $bledy ) as $aai_sciezka ) {
	++$aai_bledy_zakladek[ $aai_zakladka_bledu( $aai_sciezka ) ];
}

/** Ludzka nazwa sekcji dla ścieżki błędu `sekcje[3]...`. */
$aai_nazwa_sciezki = static function ( string $sciezka ) use ( $kurs ): string {
	if ( preg_match( '/^sekcje\[(\d+)\]/', $sciezka, $dopasowanie ) ) {
		$rodzaje = array_keys( $kurs['sekcje'] );
		$rodzaj  = $rodzaje[ (int) $dopasowanie[1] ] ?? '';
		$opis    = '' === $rodzaj ? null : Aai_Sklep_Sekcje::opis( $rodzaj );
		if ( null !== $opis ) {
			return (string) $opis['nazwa'] . ' → ' . preg_replace( '/^sekcje\[\d+\]\.(content\.)?/', '', $sciezka );
		}
	}
	return $sciezka;
};
?>
<div class="wrap aai-panel">
	<h1 class="wp-heading-inline">
		<?php
		echo $aai_nowy
			? esc_html__( 'Nowy kurs', 'aai-sklep' )
			: esc_html( (string) $kurs['title'] );
		?>
	</h1>
	<?php if ( ! $aai_nowy ) : ?>
		<a href="<?php echo esc_url( Aai_Sklep_Widok::adres_kursu( (string) $kurs['slug'] ) ); ?>"
			class="page-title-action" target="_blank" rel="noopener">
			<?php esc_html_e( 'Podgląd strony kursu', 'aai-sklep' ); ?>
		</a>
	<?php endif; ?>
	<a href="<?php echo esc_url( Aai_Sklep_Panel::adres_listy() ); ?>" class="page-title-action">
		<?php esc_html_e( 'Wróć do listy', 'aai-sklep' ); ?>
	</a>
	<hr class="wp-header-end" />

	<?php Aai_Sklep_Panel::komunikat(); ?>

	<?php if ( array() !== $bledy ) : ?>
		<div class="notice notice-error">
			<p><strong><?php esc_html_e( 'Tych rzeczy baza nie przyjmie:', 'aai-sklep' ); ?></strong></p>
			<ul class="aai-bledy">
				<?php foreach ( $bledy as $aai_sciezka => $aai_tresc ) : ?>
					<li>
						<code><?php echo esc_html( $aai_nazwa_sciezki( (string) $aai_sciezka ) ); ?></code>
						— <?php echo esc_html( (string) $aai_tresc ); ?>
					</li>
				<?php endforeach; ?>
			</ul>
		</div>
	<?php endif; ?>

	<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="aai-formularz" data-aai-formularz>
		<?php wp_nonce_field( Aai_Sklep_Panel_Akcje::ZAPISZ_KURS ); ?>
		<input type="hidden" name="action" value="<?php echo esc_attr( Aai_Sklep_Panel_Akcje::ZAPISZ_KURS ); ?>" />
		<input type="hidden" name="id" value="<?php echo esc_attr( $aai_id ); ?>" />
		<input type="hidden" name="type" value="<?php echo esc_attr( (string) $kurs['type'] ); ?>" />
		<input type="hidden" name="status" value="<?php echo esc_attr( (string) $kurs['status'] ); ?>" />
		<input type="hidden" name="zakladka" value="<?php echo esc_attr( $zakladka ); ?>" data-aai-zakladka-pole />
		<?php
		/*
		 * ZGODA NA UTRATĘ TREŚCI zaczyna od zera przy każdym wejściu na stronę.
		 * Podnosi ją wyłącznie świadome kliknięcie w przycisk potwierdzenia,
		 * który pojawia się dopiero PO odmowie — razem z liczbą lekcji.
		 */
		?>
		<input type="hidden" name="pozwol_skasowac_tresc" value="0" data-aai-zgoda />
		<?php
		/*
		 * SEKCJE I PROGRAM JADĄ JAKO JEDEN JSON, a nie jako setki pól.
		 *
		 * `max_input_vars` (domyślnie 1000) ucina POST W MILCZENIU — kurs
		 * z 41 lekcjami wystawiłby setki pól i część zapisu przepadłaby bez
		 * słowa. Pola startują wypełnione stanem Z BAZY, więc gdyby skrypt
		 * nie wystartował, zapis jest pusty w skutkach zamiast czyścić kurs.
		 */
		?>
		<input type="hidden" name="sekcje" data-aai-json="sekcje"
			value="<?php echo esc_attr( (string) wp_json_encode( Aai_Sklep_Panel::sekcje_do_zapisu( $kurs['sekcje'] ) ) ); ?>" />
		<input type="hidden" name="moduly" data-aai-json="moduly"
			value="<?php echo esc_attr( (string) wp_json_encode( Aai_Sklep_Panel::program_do_zapisu( $kurs['moduly'] ) ) ); ?>" />

		<nav class="nav-tab-wrapper aai-zakladki" data-aai-zakladki>
			<?php
			$aai_nazwy = array(
				'kurs'    => __( 'Kurs', 'aai-sklep' ),
				'sekcje'  => __( 'Sekcje strony', 'aai-sklep' ),
				'program' => __( 'Program', 'aai-sklep' ),
			);
			foreach ( $aai_nazwy as $aai_klucz => $aai_nazwa ) :
				?>
				<button type="button"
					class="nav-tab<?php echo $zakladka === $aai_klucz ? ' nav-tab-active' : ''; ?>"
					data-aai-zakladka="<?php echo esc_attr( $aai_klucz ); ?>">
					<?php echo esc_html( $aai_nazwa ); ?>
					<?php if ( $aai_bledy_zakladek[ $aai_klucz ] > 0 ) : ?>
						<span class="aai-znacznik-bledu"><?php echo esc_html( (string) $aai_bledy_zakladek[ $aai_klucz ] ); ?></span>
					<?php endif; ?>
				</button>
			<?php endforeach; ?>
		</nav>

		<!-- ————————————————————— zakładka: kurs ————————————————————— -->
		<div class="aai-panel-zakladki" data-aai-widok="kurs"<?php echo 'kurs' === $zakladka ? '' : ' hidden'; ?>>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><label for="aai-title"><?php esc_html_e( 'Tytuł', 'aai-sklep' ); ?> <span class="aai-pole__gwiazdka">*</span></label></th>
					<td>
						<input type="text" id="aai-title" name="title" class="regular-text"
							value="<?php echo esc_attr( (string) $kurs['title'] ); ?>"
							data-aai-tytul<?php echo $aai_nowy ? ' data-aai-zrodlo-slugu' : ''; ?> required />
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="aai-slug"><?php esc_html_e( 'Adres (slug)', 'aai-sklep' ); ?> <span class="aai-pole__gwiazdka">*</span></label></th>
					<td>
						<code>/szkolenia/</code><input type="text" id="aai-slug" name="slug" class="regular-text aai-slug-pole"
							value="<?php echo esc_attr( (string) $kurs['slug'] ); ?>" data-aai-slug required /><code>/</code>
						<p class="description">
							<?php
							echo $aai_nowy
								? esc_html__( 'Podpowiada się z tytułu. Tylko małe litery, cyfry i myślniki.', 'aai-sklep' )
								: esc_html__( 'Zmiana adresu zmienia adres opublikowanej strony — stary przestanie działać.', 'aai-sklep' );
							?>
						</p>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="aai-short-desc"><?php esc_html_e( 'Krótki opis', 'aai-sklep' ); ?></label></th>
					<td>
						<textarea id="aai-short-desc" name="short_desc" class="large-text" rows="2"
							data-aai-limit="<?php echo (int) Aai_Sklep_Kontrakt::LIMIT_OPISU; ?>"><?php echo esc_textarea( (string) $kurs['short_desc'] ); ?></textarea>
						<p class="description"><?php esc_html_e( 'Widoczny na karcie w katalogu i w opisie dla wyszukiwarek.', 'aai-sklep' ); ?></p>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="aai-cena"><?php esc_html_e( 'Cena', 'aai-sklep' ); ?></label></th>
					<td>
						<input type="text" id="aai-cena" name="cena_zl" class="small-text" inputmode="decimal"
							value="<?php echo esc_attr( Aai_Sklep_Kontrakt::zlote_do_pola( (int) $kurs['price_grosze'] ) ); ?>" /> zł
						<p class="description"><?php esc_html_e( 'W złotówkach — baza trzyma grosze, żeby nie było błędów zaokrągleń.', 'aai-sklep' ); ?></p>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="aai-level"><?php esc_html_e( 'Poziom', 'aai-sklep' ); ?></label></th>
					<td>
						<select id="aai-level" name="level">
							<option value=""><?php esc_html_e( '— nie pokazuj —', 'aai-sklep' ); ?></option>
							<?php foreach ( Aai_Sklep_Kontrakt::POZIOMY as $aai_klucz => $aai_nazwa ) : ?>
								<option value="<?php echo esc_attr( $aai_klucz ); ?>" <?php selected( $aai_klucz, (string) $kurs['level'] ); ?>>
									<?php echo esc_html( $aai_nazwa ); ?>
								</option>
							<?php endforeach; ?>
						</select>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="aai-badge"><?php esc_html_e( 'Plakietka', 'aai-sklep' ); ?></label></th>
					<td>
						<input type="text" id="aai-badge" name="badge" class="regular-text"
							value="<?php echo esc_attr( (string) $kurs['badge'] ); ?>"
							data-aai-limit="<?php echo (int) Aai_Sklep_Kontrakt::LIMIT_PLAKIETKI; ?>" />
						<p class="description"><?php esc_html_e( 'Krótki napis na karcie kursu, np. „Bestseller".', 'aai-sklep' ); ?></p>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="aai-cover"><?php esc_html_e( 'Okładka', 'aai-sklep' ); ?></label></th>
					<td>
						<input type="text" id="aai-cover" name="cover_url" class="large-text"
							value="<?php echo esc_attr( (string) $kurs['cover_url'] ); ?>" data-aai-okladka />
						<p>
							<button type="button" class="button" data-aai-wybierz-okladke>
								<?php esc_html_e( 'Wybierz z biblioteki mediów', 'aai-sklep' ); ?>
							</button>
							<button type="button" class="button-link aai-usun" data-aai-wyczysc-okladke>
								<?php esc_html_e( 'Wyczyść', 'aai-sklep' ); ?>
							</button>
						</p>
						<div class="aai-podglad-okladki" data-aai-podglad-okladki>
							<?php if ( '' !== (string) $kurs['cover_url'] ) : ?>
								<img src="<?php echo esc_url( (string) $kurs['cover_url'] ); ?>" alt="" />
							<?php endif; ?>
						</div>
					</td>
				</tr>
				<tr>
					<th scope="row"><?php esc_html_e( 'Stan', 'aai-sklep' ); ?></th>
					<td>
						<span class="aai-stan aai-stan--<?php echo esc_attr( (string) $kurs['status'] ); ?>">
							<?php echo esc_html( Aai_Sklep_Kontrakt::STANY[ (string) $kurs['status'] ] ?? (string) $kurs['status'] ); ?>
						</span>
						<p class="description">
							<?php esc_html_e( 'Stan zmienia się na liście kursów, przyciskiem „Opublikuj" albo „Ukryj". Szkic i kurs ukryty oddają gościowi 404.', 'aai-sklep' ); ?>
						</p>
					</td>
				</tr>
			</table>
		</div>

		<!-- ————————————————————— zakładka: sekcje ————————————————————— -->
		<div class="aai-panel-zakladki" data-aai-widok="sekcje"<?php echo 'sekcje' === $zakladka ? '' : ' hidden'; ?>>
			<p class="description aai-wstep">
				<?php esc_html_e( 'Sekcje w kolejności, w jakiej zobaczy je kupujący. Sekcja, której nie dodasz, po prostu nie pojawia się na stronie.', 'aai-sklep' ); ?>
			</p>
			<?php foreach ( $aai_kolejnosc as $aai_rodzaj ) : ?>
				<?php
				$aai_opis    = Aai_Sklep_Sekcje::opis( $aai_rodzaj );
				$aai_pola    = Aai_Sklep_Sekcje::pola( $aai_rodzaj );
				$aai_dodana  = isset( $kurs['sekcje'][ $aai_rodzaj ] );
				$aai_stan    = Aai_Sklep_Pola::do_formularza(
					$aai_pola,
					$aai_dodana ? $kurs['sekcje'][ $aai_rodzaj ]['tresc'] : array()
				);
				$aai_braki   = Aai_Sklep_Pola::braki( $aai_pola, $aai_stan );
				?>
				<div class="postbox aai-sekcja<?php echo $aai_dodana ? '' : ' aai-sekcja--pusta'; ?>"
					data-aai-sekcja="<?php echo esc_attr( $aai_rodzaj ); ?>"
					data-aai-id="<?php echo esc_attr( $aai_dodana ? (string) $kurs['sekcje'][ $aai_rodzaj ]['id'] : '' ); ?>"
					data-aai-dodana="<?php echo $aai_dodana ? '1' : '0'; ?>">
					<div class="postbox-header aai-sekcja__naglowek">
						<h2 class="hndle">
							<?php echo esc_html( (string) $aai_opis['nazwa'] ); ?>
							<span class="aai-plakietka<?php echo array() === $aai_braki ? ' aai-plakietka--gotowa' : ' aai-plakietka--braki'; ?>"
								data-aai-stan-sekcji>
								<?php
								echo array() === $aai_braki
									? esc_html__( 'gotowa', 'aai-sklep' )
									: esc_html( sprintf( /* translators: %s: lista brakujących pól. */ __( 'brakuje: %s', 'aai-sklep' ), implode( ', ', $aai_braki ) ) );
								?>
							</span>
						</h2>
						<div class="aai-sekcja__akcje">
							<button type="button" class="button button-small" data-aai-dodaj-sekcje>
								<?php esc_html_e( 'Dodaj sekcję', 'aai-sklep' ); ?>
							</button>
							<button type="button" class="button button-small button-link-delete" data-aai-usun-sekcje>
								<?php esc_html_e( 'Usuń sekcję', 'aai-sklep' ); ?>
							</button>
						</div>
					</div>
					<div class="inside">
						<p class="description aai-cel"><?php echo esc_html( (string) $aai_opis['cel'] ); ?></p>
						<?php Aai_Sklep_Panel_Pola::pola( $aai_pola, $aai_stan ); ?>
					</div>
				</div>
			<?php endforeach; ?>
		</div>

		<!-- ————————————————————— zakładka: program ————————————————————— -->
		<div class="aai-panel-zakladki" data-aai-widok="program"<?php echo 'program' === $zakladka ? '' : ' hidden'; ?>>
			<p class="description aai-wstep">
				<?php esc_html_e( 'Program to spis treści realnego materiału: z niego strona liczy statystyki katalogu. Kolejność ustawiasz strzałkami, numeracja liczy się sama.', 'aai-sklep' ); ?>
			</p>
			<div class="aai-moduly" data-aai-moduly>
				<?php foreach ( $kurs['moduly'] as $aai_modul ) : ?>
					<?php
					$aai_szablon_modulu = false;
					require AAI_SKLEP_KATALOG . 'szablony/panel/modul.php';
					?>
				<?php endforeach; ?>
			</div>
			<template data-aai-szablon-modulu>
				<?php
				$aai_modul = array(
					'id'       => '',
					'position' => 0,
					'title'    => '',
					'summary'  => '',
					'lekcje'   => array(),
				);
				$aai_szablon_modulu = true;
				require AAI_SKLEP_KATALOG . 'szablony/panel/modul.php';
				?>
			</template>
			<p>
				<button type="button" class="button" data-aai-dodaj-modul>
					<?php esc_html_e( 'Dodaj moduł', 'aai-sklep' ); ?>
				</button>
			</p>
		</div>

		<p class="submit aai-zapisz">
			<button type="submit" class="button button-primary button-hero aai-glowny">
				<?php esc_html_e( 'Zapisz kurs', 'aai-sklep' ); ?>
			</button>
			<?php
			// phpcs:ignore WordPress.Security.NonceVerification.Recommended
			$aai_odmowa = isset( $_GET['aai_komunikat'] ) && 'odmowa_tresci' === $_GET['aai_komunikat'];
			?>
			<?php if ( $aai_odmowa ) : ?>
				<button type="submit" class="button button-secondary aai-potwierdz-utrate" data-aai-potwierdz-utrate>
					<?php esc_html_e( 'Zapisz mimo to i skasuj tę treść', 'aai-sklep' ); ?>
				</button>
			<?php endif; ?>
			<span class="aai-niezapisane" data-aai-niezapisane hidden>
				<?php esc_html_e( 'Masz niezapisane zmiany.', 'aai-sklep' ); ?>
			</span>
		</p>
	</form>
</div>
