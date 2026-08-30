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
		// `wp_unslash` przed czyszczeniem: WordPress dokłada backslashe do
		// wszystkiego w superglobalach, więc bez tego apostrof w nazwie
		// bota zapisałby się jako `\'` (rodzina pułapki z W2 i N6 z P4).
		return sanitize_text_field( wp_unslash( $agent ) );
	}
}
