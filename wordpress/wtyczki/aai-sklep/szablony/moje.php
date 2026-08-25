<?php
/**
 * „Moje kursy" — lista kupionych kursów z postępem.
 *
 * Widok powstał w W6, po zgłoszeniu właściciela: klient logował się i nie miał
 * jak trafić do kursu, bo jedyną listą był panel Tutora w cudzym wyglądzie.
 * Trzy stany, wszystkie uczciwe: gość dostaje zaproszenie do logowania,
 * zalogowany bez zakupów — drogę do katalogu, kupujący — swoje kursy.
 *
 * UKŁAD: tło jest `position: fixed` i MUSI stać poza `<main>` (motyw wpisuje
 * `.page-enter` z `transform`, a przodek z `transform` łamie `fixed` potomków;
 * BLAD-003/004).
 *
 * @package Aai_Sklep
 */

defined( 'ABSPATH' ) || exit;

$aai_zalogowany = is_user_logged_in();
$aai_kursy      = $aai_zalogowany ? Aai_Sklep_Moje::kursy() : array();

get_header();

require __DIR__ . '/czesci/tlo.php';
?>
<main id="tresc" class="aai-strona">

	<section class="aai-kontener aai-moje-hero">
		<p class="aai-etykieta">[ Twoje szkolenia ]</p>
		<h1 class="aai-hero-tytul">
			<?php if ( $aai_zalogowany && ! empty( $aai_kursy ) ) : ?>
				Wracaj tam, gdzie skończyłeś.
			<?php else : ?>
				Twoje kursy.
			<?php endif; ?>
		</h1>

		<?php if ( ! $aai_zalogowany ) : ?>
			<p class="aai-hero-lead">
				Materiał kursu jest za logowaniem. Zaloguj się kontem, na które
				kupiłeś szkolenie — zobaczysz tu wszystkie swoje kursy i miejsce,
				w którym przerwałeś.
			</p>
			<div class="aai-hero-akcje">
				<a class="aai-btn aai-btn-glowny aai-btn-duzy"
					href="<?php echo esc_url( wp_login_url( Aai_Sklep_Moje::adres() ) ); ?>">Zaloguj się</a>
				<a class="aai-btn aai-btn-obrys aai-btn-duzy"
					href="<?php echo esc_url( Aai_Sklep_Widok::adres_kursu() ); ?>">Zobacz szkolenia</a>
			</div>

		<?php elseif ( empty( $aai_kursy ) ) : ?>
			<p class="aai-hero-lead">
				Na tym koncie nie ma jeszcze żadnego kursu. Gdy kupisz szkolenie,
				pojawi się tutaj razem z postępem — lekcja po lekcji.
			</p>
			<div class="aai-hero-akcje">
				<a class="aai-btn aai-btn-glowny aai-btn-duzy"
					href="<?php echo esc_url( Aai_Sklep_Widok::adres_kursu() ); ?>">Zobacz szkolenia</a>
			</div>

		<?php else : ?>
			<p class="aai-hero-lead">
				<?php
				printf(
					'Masz %d %s. Kliknij, żeby wrócić do miejsca, w którym przerwałeś.',
					count( $aai_kursy ),
					esc_html( Aai_Sklep_Widok::slowo( count( $aai_kursy ), 'kurs', 'kursy', 'kursów' ) )
				);
				?>
			</p>
		<?php endif; ?>
	</section>

	<?php if ( ! empty( $aai_kursy ) ) : ?>
		<section class="aai-kontener aai-sekcja">
			<ul class="aai-moje-siatka" data-aai-cascade="0.08">
				<?php foreach ( $aai_kursy as $aai_kurs ) : ?>
					<?php
					$aai_okladka = Aai_Sklep_Widok::okladka( $aai_kurs['cover_url'] );
					$aai_dalej   = $aai_kurs['dalej'];
					?>
					<li class="aai-panel aai-unos aai-moje-karta aai-reveal" data-aai-cascade-item>
						<div class="aai-moje-glowa">
							<?php if ( null !== $aai_okladka ) : ?>
								<img class="aai-moje-okladka" src="<?php echo esc_url( $aai_okladka ); ?>"
									alt="Okładka kursu <?php echo esc_attr( $aai_kurs['title'] ); ?>"
									width="96" height="96" loading="lazy" decoding="async">
							<?php endif; ?>
							<div>
								<?php if ( null !== $aai_kurs['badge'] ) : ?>
									<p class="aai-etykieta"><?php echo esc_html( $aai_kurs['badge'] ); ?></p>
								<?php endif; ?>
								<h2 class="aai-moje-tytul">
									<a href="<?php echo esc_url( Aai_Sklep_Widok::adres_kursu( $aai_kurs['slug'] ) ); ?>">
										<?php echo esc_html( $aai_kurs['title'] ); ?>
									</a>
								</h2>
							</div>
						</div>

						<div class="aai-moje-postep">
							<div class="aai-moje-tor">
								<span class="aai-moje-wypelnienie"
									style="width: <?php echo (int) $aai_kurs['procent']; ?>%"></span>
							</div>
							<p class="aai-moje-licznik">
								<?php
								printf(
									'%d z %d %s · %d%%',
									(int) $aai_kurs['ukonczonych'],
									(int) $aai_kurs['wszystkich'],
									esc_html( Aai_Sklep_Widok::slowo( (int) $aai_kurs['wszystkich'], 'lekcji', 'lekcji', 'lekcji' ) ),
									(int) $aai_kurs['procent']
								);
								?>
							</p>
						</div>

						<?php if ( null !== $aai_dalej ) : ?>
							<a class="aai-btn aai-btn-glowny aai-moje-akcja"
								href="<?php echo esc_url( $aai_dalej['adres'] ); ?>">
								<?php
								if ( $aai_kurs['skonczony'] ) {
									echo 'Przeczytaj jeszcze raz';
								} elseif ( 0 === (int) $aai_kurs['ukonczonych'] ) {
									echo 'Zacznij kurs';
								} else {
									echo 'Kontynuuj naukę';
								}
								?>
							</a>
							<p class="aai-moje-dalej">
								<?php echo esc_html( $aai_dalej['tytul'] ); ?>
							</p>
						<?php endif; ?>
					</li>
				<?php endforeach; ?>
			</ul>
		</section>
	<?php endif; ?>

</main>
<?php
get_footer();
