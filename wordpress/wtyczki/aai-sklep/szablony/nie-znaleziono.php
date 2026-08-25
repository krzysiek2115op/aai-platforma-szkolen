<?php
/**
 * 404 w obrębie `/szkolenia` — w naszym wyglądzie, z prawdziwym kodem odpowiedzi.
 *
 * PO CO WŁASNA STRONA. Motyw Automatic AI nie ma `404.php`, więc WordPress
 * spada na `index.php` i pokazuje pusty `<main>` — klient widzi stronę, która
 * wygląda na zepsutą, a nie na „takiego kursu nie ma". Kod 404 ustawia trasa
 * (`Aai_Sklep_Trasy::ustal_odpowiedz`), żeby wyszukiwarka nie trzymała
 * w indeksie adresu, pod którym nic nie ma.
 *
 * @package Aai_Sklep
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>
<main id="tresc" class="aai-strona">
	<section class="aai-kontener aai-nie-znaleziono">
		<p class="aai-etykieta">[ 404 · Nie znaleziono ]</p>
		<h1 class="aai-hero-tytul">Tego szkolenia tu nie ma.</h1>
		<p class="aai-hero-lead">
			Adres jest nieaktualny albo kurs nie został jeszcze opublikowany.
			Cały katalog jest o jedno kliknięcie stąd.
		</p>
		<div class="aai-hero-akcje">
			<a class="aai-btn aai-btn-glowny aai-btn-duzy" href="<?php echo esc_url( Aai_Sklep_Widok::adres_kursu() ); ?>">
				Wróć do katalogu
				<?php echo Aai_Sklep_Widok::ikona( 'arrow-right', 'aai-ikona-s' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
			</a>
			<a class="aai-btn aai-btn-obrys aai-btn-duzy" href="<?php echo esc_url( home_url( '/kontakt' ) ); ?>">Napisz do nas</a>
		</div>
	</section>
</main>
<?php
get_footer();
