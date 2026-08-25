<?php
/**
 * Widok lekcji — strona, którą klient czyta po zakupie.
 *
 * CIENKA KOMPOZYCJA: wszystko, co wymaga myślenia (dostęp, program, skład
 * prozy, zrzuty), policzył `Aai_Sklep_Lekcja::dane()`. Tutaj układamy gotowe
 * kawałki — dzięki temu w mocy zostaje reguła z W4: szablon frontu nie sięga
 * po `content` lekcji.
 *
 * UKŁAD: tło i pigułka są `position: fixed` i MUSZĄ stać poza `<main>` —
 * uzasadnienie w `czesci/tlo.php` (motyw wpisuje `.page-enter` z `transform`,
 * a przodek z `transform` łamie `position: fixed` potomków; BLAD-003/004).
 *
 * @package Aai_Sklep
 */

defined( 'ABSPATH' ) || exit;

$dane = Aai_Sklep_Lekcja::dane();
if ( null === $dane ) {
	require __DIR__ . '/nie-znaleziono.php';
	return;
}

get_header();

require __DIR__ . '/czesci/tlo.php';
require __DIR__ . '/czesci/pasek-lekcji.php';
?>
<main id="tresc" class="aai-lekcja">

	<header class="aai-lekcja-hero">
		<p class="aai-etykieta">
			Moduł <?php echo (int) $dane['modul']['pozycja'] + 1; ?> · <?php echo esc_html( $dane['modul']['tytul'] ); ?>
		</p>
		<h1><?php echo esc_html( $dane['lekcja']['title'] ); ?></h1>
		<div class="aai-meta-listwa">
			<span>Lekcja <?php echo (int) $dane['numer']; ?> z <?php echo (int) $dane['wszystkich']; ?></span>
			<?php if ( $dane['lekcja']['duration_min'] > 0 ) : ?>
				<span><?php echo esc_html( Aai_Sklep_Widok::czas_materialu( (int) $dane['lekcja']['duration_min'] ) ); ?></span>
			<?php endif; ?>
			<?php if ( $dane['dostep'] && $dane['ukonczona'] ) : ?>
				<span>przerobiona</span>
			<?php endif; ?>
		</div>

		<?php if ( $dane['dostep'] && '' !== $dane['lead'] ) : ?>
			<?php
			/*
			 * Wstęp lekcji mieszka W HERO, nie pod nim: to jest ten sam akapit
			 * prowadzący, co w podglądzie kursów, i ma trzymać miarę kolumny
			 * tekstu. Poza hero rozciągnąłby się na całą szerokość strony
			 * i czytałby się inaczej niż reszta lekcji.
			 */
			?>
			<div class="aai-lead"><?php echo wp_kses( $dane['lead'], Aai_Sklep_Widok::dozwolone_znaczniki() ); ?></div>
		<?php endif; ?>
	</header>

	<?php if ( ! $dane['dostep'] ) : ?>
		<?php require __DIR__ . '/czesci/lekcja-bramka.php'; ?>
	<?php elseif ( null !== $dane['blad'] ) : ?>
		<?php
		/*
		 * Renderer zatrzymał się na konstrukcji, której nie zna. Mówimy
		 * o tym wprost, zamiast pokazywać połowę lekcji albo pustą stronę —
		 * i zostawiamy powód w kodzie źródłowym dla właściciela.
		 */
		?>
		<div class="aai-tresc">
			<div class="aai-uwaga">
				<p><strong>Ta lekcja chwilowo się nie wyświetla.</strong> Treść jest bezpieczna —
				zatrzymał się jej skład. Napisz do nas, a poprawimy to od ręki.</p>
			</div>
			<!-- <?php echo esc_html( $dane['blad'] ); ?> -->
		</div>
	<?php else : ?>
		<div class="aai-tresc">
			<?php
			/*
			 * `wp_kses` na gotowym HTML-u renderera, nie na prozie: proza
			 * przechodzi przez nasz skład, który UCIEKA wszystko, co przyszło
			 * z treści (żadnego surowego HTML-u z bazy). To jest drugi zamek
			 * na tych samych drzwiach — tani i nic nie psuje. Lista znaczników
			 * jest własna, bo domyślna nie zna `<svg>`, a ikona w nagłówku
			 * bloku niesie znaczenie (rodzaj sekcji), nie ozdobę.
			 */
			echo wp_kses( $dane['tresc_html'], Aai_Sklep_Widok::dozwolone_znaczniki() );
			?>
		</div>

		<?php require __DIR__ . '/czesci/lekcja-odhacz.php'; ?>
	<?php endif; ?>

	<nav class="aai-nawigacja" aria-label="Sąsiednie lekcje">
		<?php
		$aai_poprzednia = $dane['poprzednia'];
		$aai_nastepna   = $dane['nastepna'];
		?>
		<?php if ( null !== $aai_poprzednia ) : ?>
			<a class="aai-nawigacja-karta aai-unos" href="<?php echo esc_url( $aai_poprzednia['adres'] ); ?>">
				<span class="aai-nawigacja-kierunek">
					<?php echo Aai_Sklep_Widok::ikona( 'arrow-left', 'aai-ikona-xs' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
					<span>poprzednia lekcja</span>
				</span>
				<span class="aai-nawigacja-tytul"><?php echo esc_html( $aai_poprzednia['tytul'] ); ?></span>
			</a>
		<?php else : ?>
			<div class="aai-nawigacja-karta aai-nawigacja-pusto">
				<span class="aai-nawigacja-kierunek">początek kursu</span>
				<span class="aai-nawigacja-tytul">—</span>
			</div>
		<?php endif; ?>

		<?php if ( null !== $aai_nastepna ) : ?>
			<a class="aai-nawigacja-karta aai-nawigacja-karta-dalej aai-unos" href="<?php echo esc_url( $aai_nastepna['adres'] ); ?>">
				<span class="aai-nawigacja-kierunek">
					<span>następna lekcja</span>
					<?php echo Aai_Sklep_Widok::ikona( 'arrow-right', 'aai-ikona-xs' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
				</span>
				<span class="aai-nawigacja-tytul"><?php echo esc_html( $aai_nastepna['tytul'] ); ?></span>
			</a>
		<?php else : ?>
			<div class="aai-nawigacja-karta aai-nawigacja-karta-dalej aai-nawigacja-pusto">
				<span class="aai-nawigacja-kierunek">koniec kursu</span>
				<span class="aai-nawigacja-tytul">—</span>
			</div>
		<?php endif; ?>
	</nav>

</main>
<?php
get_footer();
