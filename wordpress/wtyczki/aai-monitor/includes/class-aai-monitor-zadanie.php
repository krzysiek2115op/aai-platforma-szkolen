<?php
/**
 * Co wiemy o BIEŻĄCYM żądaniu: adres i przeglądarka.
 *
 * PO CO OSOBNA KLASA NA DWIE FUNKCJE. Schemat (P6) żąda JEDNEGO miejsca,
 * w którym powstaje adres IP — bo dokładnie w tym miejscu przyjdzie
 * kiedyś zmiana. W warsztacie `REMOTE_ADDR` to brama kontenera (F14:
 * wszystkie trzy realne zakupy właściciela zapisały `10.89.4.4`), a na
 * hostingu za proxy realny adres siedzi zwykle w cudzym nagłówku.
 * Rozsypanie odczytu po handlerach zamieniłoby tę jedną przyszłą zmianę
 * w polowanie.
 *
 * DLACZEGO NIE CZYTAMY `X-Forwarded-For`. Ten nagłówek ustawia klient
 * i każdy może w nim napisać, co chce — a dziennik logowań ma być
 * materiałem dowodowym po incydencie. Adres podrobiony przez napastnika
 * jest gorszy niż adres bramy: pierwszy KŁAMIE, drugi tylko milczy.
 * Zaufanie do nagłówka wymaga wiedzy, ilu proxy stoi z przodu i które
 * z nich jest nasze — a hostingu jeszcze nie ma. Pozycja wdrożeniowa
 * „ustal, co u hostingu jest realnym IP" stoi w schemacie sekcja 11.
 *
 * @package Aai_Monitor
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Odczyt danych o żądaniu.
 */
final class Aai_Monitor_Zadanie {

	/**
	 * Adres, z którego przyszło żądanie.
	 *
	 * Pusty łańcuch, gdy adresu nie ma (WP-CLI, cron) albo gdy to, co
	 * przyszło, nie jest adresem IP — wolimy pustą kolumnę od śmiecia
	 * udającego dowód.
	 */
	public static function ip(): string {
		$adres = isset( $_SERVER['REMOTE_ADDR'] ) ? (string) $_SERVER['REMOTE_ADDR'] : '';
		if ( '' === $adres ) {
			return '';
		}
		// Walidacja, a nie samo przycięcie: kolumna ma 45 znaków pod
		// najdłuższy IPv6, więc bez sprawdzenia zmieściłby się w niej
		// dowolny łańcuch i wyglądał na ekranie jak adres.
		$czysty = filter_var( wp_unslash( $adres ), FILTER_VALIDATE_IP );
		return false === $czysty ? '' : (string) $czysty;
	}

	/**
	 * Przeglądarka — surowy user-agent, przycinany dopiero w warstwie zapisu.
	 *
	 * Nie parsujemy go na „Firefox 140 / Linux": przy próbie włamania
	 * liczy się dokładny łańcuch, bo to on odróżnia narzędzie od
	 * przeglądarki. Skracanie do 191 znaków jest decyzją warstwy zapisu
	 * (szerokość kolumny), nie tego miejsca.
	 */
	public static function agent(): string {
		$agent = isset( $_SERVER['HTTP_USER_AGENT'] ) ? (string) $_SERVER['HTTP_USER_AGENT'] : '';
		if ( '' === $agent ) {
			return '';
		}
		/*
		 * `wp_unslash` jest konieczne: WordPress slashuje CAŁĄ superglobalę
		 * `$_SERVER` (`wp_magic_quotes()`), więc bez tego apostrof w nazwie
		 * bota zapisałby się jako `\'` (rodzina pułapki z W2 i N6 z P4).
		 *
		 * `sanitize_text_field()` NIE — i to jest poprawka po przeglądzie.
		 * Zmierzone, co robi z user-agentem:
		 *   `Mozilla/5.0 <script>alert(1)</script>`  →  `Mozilla/5.0`
		 *   `Mozilla/5.0 (X11) Bot%20scan/1.0`       →  `Mozilla/5.0 (X11) Botscan/1.0`
		 * Pierwsze `<` UCINA RESZTĘ ŁAŃCUCHA, a sekwencje `%XX` znikają —
		 * czyli najciekawszy przypadek (narzędzie wstrzykujące ładunek
		 * w UA) zapisywał się jako niewinne „Mozilla/5.0", wprost wbrew
		 * temu, co obiecuje komentarz wyżej.
		 *
		 * Czyszczenie niczego tu nie broniło: wartość idzie do bazy przez
		 * `$wpdb->insert()` (przygotowaną), a na ekran przez `esc_html()`.
		 * Zostaje więc usunięcie znaków sterujących — jedyne, co naprawdę
		 * mogłoby zepsuć odczyt — i nic ponadto.
		 */
		$czysty = preg_replace( '/[\x00-\x1F\x7F]/u', '', wp_unslash( $agent ) );
		return is_string( $czysty ) ? $czysty : '';
	}
}
