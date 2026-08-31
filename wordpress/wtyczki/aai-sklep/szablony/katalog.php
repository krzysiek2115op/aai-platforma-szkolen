<?php
/**
 * Katalog `/szkolenia` — port `app/szkolenia/widok.tsx`.
 *
 * Digital product experience z briefu B5: hero z mockupem okna kursu
 * z PRAWDZIWYCH danych, pas tematów, sekcja „system pracy" i siatka kart.
 * Liczby w HUD-zie są liczone przez bazę, nie wpisane — pusty katalog chowa
 * je razem z siatką i zostawia uczciwy komunikat.
 *
 * @package Aai_Sklep
 */

defined( 'ABSPATH' ) || exit;

$aai_kursy   = Aai_Sklep_Odczyt::lista_kursow();
$aai_flagowy = empty( $aai_kursy )
	? null
	: Aai_Sklep_Odczyt::szczegoly_kursu( (string) $aai_kursy[0]['slug'] );

$aai_stat = array(
	'kursy'   => count( $aai_kursy ),
	'moduly'  => 0,
	'lekcje'  => 0,
	'godziny' => 0,
);
$aai_minuty = 0;
foreach ( $aai_kursy as $aai_k ) {
	$aai_stat['moduly'] += (int) $aai_k['modules_count'];
	$aai_stat['lekcje'] += (int) $aai_k['lessons_count'];
	$aai_minuty         += (int) $aai_k['total_min'];
}
$aai_stat['godziny'] = (int) round( $aai_minuty / 60 );

/* Z czego składa się każdy produkt — metoda, nie marketing. */
$aai_system = array(
	array( '01', 'Wiedza', 'Lekcje tekstowe krok po kroku, ze zrzutami z prawdziwych ekranów — widzisz dokładnie to, co masz zrobić u siebie.' ),
	array( '02', 'Narzędzia', 'Konfiguracje i ustawienia, które przenosisz do swojej firmy jednym ruchem.' ),
	array( '03', 'Prompty', 'Gotowa biblioteka promptów pod realne zadania — oferty, analizy, dokumenty.' ),
	array( '04', 'Automatyzacje', 'Przepływy, które pracują bez Ciebie — od szkicu do wdrożenia.' ),
	array( '05', 'Workflow', 'Kompletny sposób pracy: co robić, w jakiej kolejności i czego unikać.' ),
	array( '06', 'Materiały', 'Checklisty i ćwiczenie „Zrób to teraz” w każdej lekcji — do użycia od razu, bez pobierania czegokolwiek.' ),
);

$aai_chipy = array(
	'Claude',
	'GitHub',
	'Prompty',
	'Automatyzacje',
	'AI w firmie',
	'Workflow',
	'Praktyka, nie teoria',
	'Dostęp bez limitu',
);

get_header();
?>
<main id="tresc" class="aai-strona">

	<section class="aai-hero aai-spotlight" data-aai-spotlight>
		<div aria-hidden="true" class="aai-siatka-tla aai-maska-y aai-warstwa"></div>
		<div aria-hidden="true" class="aai-hero-poswiata"></div>
		<div aria-hidden="true" class="aai-ziarno aai-warstwa"></div>

		<div class="aai-kontener aai-hero-uklad">
			<div>
				<p class="aai-etykieta">[ Szkolenia · Automatic AI ]</p>
				<h1 class="aai-hero-tytul">Szkolenia, które zamieniają AI w&nbsp;przewagę.</h1>
				<p class="aai-hero-lead">
					Nie sprzedajemy nagrań do obejrzenia. Dostajesz gotowe systemy pracy
					z Claude i GitHubem — prompty, narzędzia i workflow, które wdrażasz
					w swojej firmie od pierwszego dnia.
				</p>
				<div class="aai-hero-akcje">
					<a class="aai-btn aai-btn-glowny aai-btn-duzy" href="#katalog">
						Poznaj szkolenia
						<?php echo Aai_Sklep_Widok::ikona( 'arrow-right', 'aai-ikona-s' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
					</a>
					<a class="aai-btn aai-btn-obrys aai-btn-duzy" href="#srodek">Zobacz, co dostajesz</a>
				</div>

				<?php if ( $aai_stat['kursy'] > 0 ) : ?>
					<dl class="aai-hud">
						<?php
						$aai_hud = array(
							array( $aai_stat['kursy'], Aai_Sklep_Widok::slowo( $aai_stat['kursy'], 'produkt', 'produkty', 'produktów' ) ),
							array( $aai_stat['moduly'], Aai_Sklep_Widok::slowo( $aai_stat['moduly'], 'moduł', 'moduły', 'modułów' ) ),
							array( $aai_stat['lekcje'], Aai_Sklep_Widok::slowo( $aai_stat['lekcje'], 'lekcja', 'lekcje', 'lekcji' ) ),
							array( $aai_stat['godziny'], Aai_Sklep_Widok::slowo( $aai_stat['godziny'], 'godzina', 'godziny', 'godzin' ) . ' materiału' ),
						);
						foreach ( $aai_hud as $aai_pozycja ) :
							if ( $aai_pozycja[0] <= 0 ) {
								continue;
							}
							?>
							<div class="aai-hud-pole">
								<dt class="aai-sr"><?php echo esc_html( $aai_pozycja[1] ); ?></dt>
								<dd>
									<span class="aai-hud-liczba"><?php echo esc_html( (string) $aai_pozycja[0] ); ?></span>
									<span class="aai-mono"><?php echo esc_html( $aai_pozycja[1] ); ?></span>
								</dd>
							</div>
						<?php endforeach; ?>
					</dl>
				<?php endif; ?>
			</div>

			<?php if ( null !== $aai_flagowy ) : ?>
				<div class="aai-hero-wizual" aria-hidden="true">
					<div class="aai-paralaksa-1">
						<?php
						$kurs = $aai_flagowy;
						require __DIR__ . '/czesci/okno-kursu.php';
						?>
					</div>
					<div class="aai-plywak aai-plywak-prompt aai-paralaksa-2">
						<div class="aai-panel aai-plywak-karta">
							<p class="aai-mono aai-akcent aai-plywak-naglowek">
								<?php echo Aai_Sklep_Widok::ikona( 'sparkles', 'aai-ikona-xs' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
								Prompt z biblioteki
							</p>
							<p class="aai-plywak-tekst">„Przeanalizuj ofertę i wskaż 3 miejsca, w których tracimy klienta…”</p>
							<span class="aai-kursor-migacz"></span>
						</div>
					</div>
				</div>
			<?php endif; ?>
		</div>

		<div class="aai-marquee aai-maska-x">
			<div class="aai-marquee-tor">
				<?php for ( $aai_p = 0; $aai_p < 2; $aai_p++ ) : ?>
					<?php foreach ( $aai_chipy as $aai_chip ) : ?>
						<span class="aai-chip">
							<span aria-hidden="true" class="aai-kropka"></span>
							<?php echo esc_html( $aai_chip ); ?>
						</span>
					<?php endforeach; ?>
				<?php endfor; ?>
			</div>
		</div>
	</section>

	<section id="srodek" class="aai-kontener aai-sekcja-system">
		<div class="aai-system-uklad">
			<div class="aai-system-naglowek">
				<?php
				Aai_Sklep_Widok::naglowek_sekcji(
					'01 · Co dostajesz',
					'Nie kupujesz kolejnego kursu.',
					'Każdy produkt składa się z sześciu warstw — od wiedzy po pliki, które wgrywasz do swojej firmy tego samego dnia.',
					'Dostajesz gotowy system pracy.'
				);
				?>
				<?php if ( null !== $aai_flagowy ) : ?>
					<div class="aai-reveal aai-system-okno">
						<?php
						$kurs = $aai_flagowy;
						require __DIR__ . '/czesci/okno-kursu.php';
						?>
					</div>
				<?php endif; ?>
			</div>

			<ol class="aai-system-lista" data-aai-cascade="0.09">
				<?php foreach ( $aai_system as $aai_el ) : ?>
					<li class="aai-panel aai-unos aai-system-pozycja aai-reveal" data-aai-cascade-item>
						<span class="aai-system-numer"><?php echo esc_html( $aai_el[0] ); ?></span>
						<div>
							<h3 class="aai-system-tytul"><?php echo esc_html( $aai_el[1] ); ?></h3>
							<p class="aai-system-opis"><?php echo esc_html( $aai_el[2] ); ?></p>
						</div>
					</li>
				<?php endforeach; ?>
			</ol>
		</div>
	</section>

	<section id="katalog" class="aai-kontener aai-sekcja aai-sekcja-katalog">
		<div class="aai-katalog-naglowek">
			<div>
				<p class="aai-etykieta">[ 02 · Katalog ]</p>
				<h2 class="aai-sekcja-tytul">Wybierz swoją przewagę</h2>
			</div>
			<?php if ( ! empty( $aai_kursy ) ) : ?>
				<p class="aai-mono">
					[ <?php echo esc_html( str_pad( (string) count( $aai_kursy ), 2, '0', STR_PAD_LEFT ) ); ?>
					<?php echo esc_html( Aai_Sklep_Widok::slowo( count( $aai_kursy ), 'produkt', 'produkty', 'produktów' ) ); ?> ]
				</p>
			<?php endif; ?>
		</div>

		<?php if ( empty( $aai_kursy ) ) : ?>
			<div class="aai-panel aai-pusty">
				<p class="aai-etykieta">[ Katalog w przygotowaniu ]</p>
				<p class="aai-pusty-tekst">
					Pierwsze kursy pojawią się tu wkrótce. Masz pytanie już teraz? Napisz do nas.
				</p>
			</div>
		<?php else : ?>
			<ul data-katalog class="aai-katalog-siatka" data-aai-cascade="0.08">
				<?php foreach ( $aai_kursy as $aai_i => $aai_kurs ) : ?>
					<li class="aai-reveal" data-aai-cascade-item>
						<?php
						$kurs  = $aai_kurs;
						$numer = str_pad( (string) ( $aai_i + 1 ), 2, '0', STR_PAD_LEFT );
						require __DIR__ . '/czesci/karta.php';
						?>
					</li>
				<?php endforeach; ?>
			</ul>
		<?php endif; ?>
	</section>

	<section class="aai-cta-pas">
		<div class="aai-kontener aai-cta-uklad">
			<div>
				<h2 class="aai-cta-tytul">Nie wiesz, od czego zacząć?</h2>
				<p class="aai-cta-opis">Napisz — podpowiemy, który system pracy da Ci najszybszy efekt.</p>
			</div>
			<a class="aai-btn aai-btn-glowny aai-btn-duzy" href="<?php echo esc_url( Aai_Sklep_Widok::adres_kontaktu() ); ?>">
				Porozmawiajmy
				<?php echo Aai_Sklep_Widok::ikona( 'arrow-up-right', 'aai-ikona-s' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
			</a>
		</div>
	</section>

</main>
<?php
get_footer();
