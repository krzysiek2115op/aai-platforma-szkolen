<?php
/**
 * Lista kursów w kokpicie.
 *
 * LICZNIKI SĄ TU PO COŚ. „Treść lekcji 41/41" odpowiada na pierwsze pytanie
 * dnia przy pisaniu kursu — ile jeszcze zostało — bez wchodzenia w kurs
 * i przewijania programu. Tak samo działała lista w prototypie.
 *
 * @package Aai_Sklep
 *
 * @var array<int,array<string,mixed>> $kursy Kursy z warstwy odczytu panelu.
 */

defined( 'ABSPATH' ) || exit;
?>
<div class="wrap aai-panel">
	<h1 class="wp-heading-inline"><?php esc_html_e( 'Kursy', 'aai-sklep' ); ?></h1>
	<a href="<?php echo esc_url( Aai_Sklep_Panel::adres_kursu() ); ?>" class="page-title-action">
		<?php esc_html_e( 'Nowy kurs', 'aai-sklep' ); ?>
	</a>
	<hr class="wp-header-end" />

	<?php Aai_Sklep_Panel::komunikat(); ?>
	<?php Aai_Sklep_Panel::stan_kopii(); ?>

	<?php if ( array() === $kursy ) : ?>
		<div class="aai-pustka">
			<p><?php esc_html_e( 'Nie ma jeszcze żadnego kursu.', 'aai-sklep' ); ?></p>
			<p>
				<a href="<?php echo esc_url( Aai_Sklep_Panel::adres_kursu() ); ?>" class="button button-primary">
					<?php esc_html_e( 'Utwórz pierwszy kurs', 'aai-sklep' ); ?>
				</a>
			</p>
		</div>
	<?php else : ?>
		<table class="wp-list-table widefat fixed striped aai-lista-kursow">
			<thead>
				<tr>
					<th scope="col"><?php esc_html_e( 'Kurs', 'aai-sklep' ); ?></th>
					<th scope="col" class="aai-kol-waska"><?php esc_html_e( 'Stan', 'aai-sklep' ); ?></th>
					<th scope="col" class="aai-kol-waska"><?php esc_html_e( 'Cena', 'aai-sklep' ); ?></th>
					<th scope="col" class="aai-kol-waska"><?php esc_html_e( 'Sekcje', 'aai-sklep' ); ?></th>
					<th scope="col" class="aai-kol-waska"><?php esc_html_e( 'Program', 'aai-sklep' ); ?></th>
					<th scope="col" class="aai-kol-waska"><?php esc_html_e( 'Treść lekcji', 'aai-sklep' ); ?></th>
				</tr>
			</thead>
			<tbody>
			<?php foreach ( $kursy as $aai_kurs ) : ?>
				<?php
				$aai_id       = (string) $aai_kurs['id'];
				$aai_status   = (string) $aai_kurs['status'];
				$aai_z_trescia = (int) $aai_kurs['lekcji_z_trescia'];
				?>
				<tr>
					<td class="column-primary">
						<strong>
							<a href="<?php echo esc_url( Aai_Sklep_Panel::adres_kursu( $aai_id ) ); ?>">
								<?php echo esc_html( (string) $aai_kurs['title'] ); ?>
							</a>
						</strong>
						<div class="row-actions">
							<span class="edit">
								<a href="<?php echo esc_url( Aai_Sklep_Panel::adres_kursu( $aai_id ) ); ?>">
									<?php esc_html_e( 'Edytuj', 'aai-sklep' ); ?>
								</a> |
							</span>
							<span class="view">
								<a href="<?php echo esc_url( Aai_Sklep_Widok::adres_kursu( (string) $aai_kurs['slug'] ) ); ?>" target="_blank" rel="noopener">
									<?php
									echo 'published' === $aai_status
										? esc_html__( 'Zobacz stronę', 'aai-sklep' )
										: esc_html__( 'Podgląd', 'aai-sklep' );
									?>
								</a> |
							</span>
							<span class="stan">
								<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="aai-w-linii">
									<?php wp_nonce_field( Aai_Sklep_Panel_Akcje::STAN_KURSU ); ?>
									<input type="hidden" name="action" value="<?php echo esc_attr( Aai_Sklep_Panel_Akcje::STAN_KURSU ); ?>" />
									<input type="hidden" name="id" value="<?php echo esc_attr( $aai_id ); ?>" />
									<input type="hidden" name="status" value="<?php echo 'published' === $aai_status ? 'archived' : 'published'; ?>" />
									<button type="submit" class="button-link">
										<?php
										echo 'published' === $aai_status
											? esc_html__( 'Ukryj', 'aai-sklep' )
											: esc_html__( 'Opublikuj', 'aai-sklep' );
										?>
									</button>
								</form> |
							</span>
							<span class="trash">
								<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="aai-w-linii">
									<?php wp_nonce_field( Aai_Sklep_Panel_Akcje::USUN_KURS ); ?>
									<input type="hidden" name="action" value="<?php echo esc_attr( Aai_Sklep_Panel_Akcje::USUN_KURS ); ?>" />
									<input type="hidden" name="id" value="<?php echo esc_attr( $aai_id ); ?>" />
									<?php
									/*
									 * Zgoda na utratę treści zaczyna od ZERA i podnosi ją
									 * dopiero potwierdzenie. Bez skryptu zostaje zero, więc
									 * warstwa zapisu odmawia — bezpieczne domyślnie, nie
									 * bezpieczne dzięki przeglądarce.
									 */
									?>
									<input type="hidden" name="pozwol_skasowac_tresc" value="0" data-aai-zgoda />
									<button type="submit" class="button-link aai-usun"
										data-aai-potwierdz="<?php
										echo esc_attr(
											$aai_z_trescia > 0
												? sprintf(
													/* translators: 1: tytuł kursu, 2: liczba lekcji z treścią. */
													__( 'Usunąć kurs „%1$s" RAZEM z napisaną treścią %2$d lekcji? Stan sprzed usunięcia zostanie w dzienniku audytu.', 'aai-sklep' ),
													(string) $aai_kurs['title'],
													$aai_z_trescia
												)
												: sprintf(
													/* translators: %s: tytuł kursu. */
													__( 'Usunąć kurs „%s"?', 'aai-sklep' ),
													(string) $aai_kurs['title']
												)
										);
										?>">
										<?php esc_html_e( 'Usuń', 'aai-sklep' ); ?>
									</button>
								</form>
							</span>
						</div>
						<div class="aai-slug"><code>/szkolenia/<?php echo esc_html( (string) $aai_kurs['slug'] ); ?>/</code></div>
					</td>
					<td>
						<span class="aai-stan aai-stan--<?php echo esc_attr( $aai_status ); ?>">
							<?php echo esc_html( Aai_Sklep_Kontrakt::STANY[ $aai_status ] ?? $aai_status ); ?>
						</span>
					</td>
					<td><?php echo esc_html( Aai_Sklep_Kontrakt::zlote_do_pola( (int) $aai_kurs['price_grosze'] ) ); ?>&nbsp;zł</td>
					<td><?php echo esc_html( sprintf( '%d/%d', (int) $aai_kurs['sekcji'], count( Aai_Sklep_Sekcje::rodzaje() ) ) ); ?></td>
					<td>
						<?php
						printf(
							/* translators: 1: liczba modułów, 2: liczba lekcji. */
							esc_html__( '%1$d mod. / %2$d lekcji', 'aai-sklep' ),
							(int) $aai_kurs['modulow'],
							(int) $aai_kurs['lekcji']
						);
						?>
					</td>
					<td>
						<span class="aai-postep<?php echo $aai_z_trescia === (int) $aai_kurs['lekcji'] && $aai_z_trescia > 0 ? ' aai-postep--pelny' : ''; ?>">
							<?php echo esc_html( sprintf( '%d/%d', $aai_z_trescia, (int) $aai_kurs['lekcji'] ) ); ?>
						</span>
					</td>
				</tr>
			<?php endforeach; ?>
			</tbody>
		</table>
	<?php endif; ?>
</div>
