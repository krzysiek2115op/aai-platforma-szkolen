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

/*
 * Ta sama strona obsługuje DWA przypadki, bo od 2026-08-31 jest jedyną
 * stroną 404 witryny (motyw nie ma `404.php`, a jego `index.php` na pustej
 * pętli drukuje pusty `<main>` — zmierzone: 24 znaki treści). Adres pod
 * `/szkolenia` to najczęściej nieaktualny link do kursu; każdy inny —
 * zwykłe „nie ma takiej strony", i nie wolno mu mówić o szkoleniach.
 */
/*
 * O TRASIE ROZSTRZYGA KLASA TRAS, NIE SZABLON (MAR-A-25).
 *
 * Do 0.76.0 ten szablon czytał surowy `REQUEST_URI` i miał prefiks
 * `'szkolenia'` wpisany literałem — jedyny z 37 szablonów czytający
 * `$_SERVER` i jedyny z literałem trasy. Wtyczka trzyma ścieżki
 * w `Aai_Sklep_Moje::SCIEZKA` i `Aai_Sklep_Trasy::PODSTRONY`; po zmianie
 * adresu sklepu ten jeden plik mówiłby dalej o starym.
 */
$aai_o_kursie = Aai_Sklep_Trasy::zadanie_w_sklepie();

get_header();
?>
<main id="tresc" class="aai-strona">
	<section class="aai-kontener aai-nie-znaleziono">
		<p class="aai-etykieta">[ 404 · Nie znaleziono ]</p>
		<h1 class="aai-hero-tytul"><?php echo $aai_o_kursie ? 'Tego szkolenia tu nie ma.' : 'Tej strony tu nie ma.'; ?></h1>
		<p class="aai-hero-lead">
			<?php
			echo $aai_o_kursie
				? 'Adres jest nieaktualny albo kurs nie został jeszcze opublikowany. Cały katalog jest o jedno kliknięcie stąd.'
				: 'Adres jest nieaktualny albo strona zmieniła miejsce. Katalog szkoleń jest o jedno kliknięcie stąd.';
			?>
		</p>
		<div class="aai-hero-akcje">
			<a class="aai-btn aai-btn-glowny aai-btn-duzy" href="<?php echo esc_url( Aai_Sklep_Widok::adres_kursu() ); ?>">
				Wróć do katalogu
				<?php echo Aai_Sklep_Widok::ikona( 'arrow-right', 'aai-ikona-s' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
			</a>
			<a class="aai-btn aai-btn-obrys aai-btn-duzy" href="<?php echo esc_url( Aai_Sklep_Widok::adres_kontaktu() ); ?>">Napisz do nas</a>
		</div>
	</section>
</main>
<?php
get_footer();
