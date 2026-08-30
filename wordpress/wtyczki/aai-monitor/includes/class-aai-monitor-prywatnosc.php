<?php
/**
 * Wpis o dzienniku logowań dla polityki prywatności.
 *
 * DLACZEGO SUGESTIA, A NIE DOPISANIE DO STRONY. Prawdziwa polityka
 * Automatic AI mieszka w treści MOTYWU, generowanego ze źródła Next.js
 * strony głównej — repozytorium, do którego mamy dostęp WYŁĄCZNIE
 * DO ODCZYTU. Wtyczka, która dopisywałaby się do cudzej strony prawnej,
 * robiłaby dwie złe rzeczy naraz: zmieniała cudzy dokument i gubiła tę
 * zmianę przy najbliższej regeneracji motywu.
 *
 * WordPress ma na to własny mechanizm: `wp_add_privacy_policy_content()`
 * pokazuje tekst w Narzędzia → Prywatność, skąd administrator sam
 * decyduje, czy i jak go użyć. Obok, w `docs/plugin-3/`, leży ten sam
 * tekst gotowy do wklejenia w źródle strony głównej.
 *
 * ZMIERZONE W RDZENIU (wp-includes/plugin.php:2429), bo pomyłka jest tu
 * CICHA: funkcja odmawia pracy poza `wp-admin` oraz przed hakiem
 * `admin_init` — w obu przypadkach woła `_doing_it_wrong()` i wychodzi
 * bez dodania czegokolwiek. Wywołanie z `plugins_loaded`, gdzie
 * rejestruje się reszta tej wtyczki, nie dodałoby więc NIC, a jedynym
 * objawem byłby wpis w logu przy włączonym WP_DEBUG.
 *
 * @package Aai_Monitor
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Sugerowana treść dla polityki prywatności.
 */
final class Aai_Monitor_Prywatnosc {

	/**
	 * Podpina się pod `admin_init` — wcześniej rdzeń odmawia (patrz wyżej).
	 */
	public static function zarejestruj(): void {
		add_action( 'admin_init', array( self::class, 'dodaj' ) );
	}

	/**
	 * Melduje tekst do kreatora polityki.
	 *
	 * `try/catch ( Throwable )` z tego samego powodu co w handlerach
	 * logowania (N4), choć hak jest inny: `admin_init` biegnie przy
	 * KAŻDYM żądaniu do kokpitu, także cudzym — przy edycji produktu
	 * w WooCommerce czy przy zapisie kursu w kreatorze. Wyjątek stąd
	 * wywaliłby ekran, z którym nasz moduł nie ma nic wspólnego.
	 *
	 * Regułę zapalił strażnik, gdy ta klasa powstała: pilnuje ZACHOWANIA
	 * (każda metoda podpięta pod hak spoza naszego kokpitu), a nie listy
	 * znanych haków — więc złapał hak, o którym pisząc ją nie myślałem.
	 */
	public static function dodaj(): void {
		try {
			if ( ! function_exists( 'wp_add_privacy_policy_content' ) ) {
				return;
			}
			wp_add_privacy_policy_content(
				__( 'Automatic AI — Monitoring', 'aai-monitor' ),
				wp_kses_post( wpautop( self::tresc() ) )
			);
		} catch ( Throwable $e ) {
			// Brak wpisu w kreatorze polityki jest kłopotem; wywalony
			// ekran kokpitu byłby awarią. Kanał błędów zna resztę.
			Aai_Monitor_Komunikaty::zapisz( 'nie udało się zgłosić wpisu do polityki prywatności: ' . $e->getMessage() );
		}
	}

	/**
	 * Treść wpisu.
	 *
	 * MÓWI PRAWDĘ O MECHANIZMIE, nie o zamiarze. Retencja jest z definicji
	 * LENIWA — biegnie przy zapisie i przy otwarciu ekranu w kokpicie —
	 * więc obietnica „usuwamy po 90 dniach" byłaby nieprawdziwa na cichej
	 * instalacji, gdzie przez 90 dni nikt się nie loguje. Stąd
	 * sformułowanie „do 90 dni od ostatniej aktywności", którego wymaga
	 * schemat (sekcja 4).
	 *
	 * Wpis mówi TYLKO o dzienniku logowań, bo tylko on dziś cokolwiek
	 * zbiera. Pomiar ruchu wchodzi w kroku T3 i wtedy dopisze własne
	 * zdanie — polityka ma odbijać stan faktyczny, nie plany.
	 */
	public static function tresc(): string {
		return implode(
			"\n\n",
			array(
				__( 'Ta witryna prowadzi dziennik logowań do kont. Przy każdym udanym i nieudanym logowaniu zapisujemy: datę i godzinę, konto (a przy nieudanej próbie — login wpisany w formularzu), sposób zalogowania, adres IP oraz nazwę przeglądarki. Nie zapisujemy haseł ani ich fragmentów.', 'aai-monitor' ),
				__( 'Robimy to wyłącznie w celu bezpieczeństwa kont — żeby zobaczyć, czy ktoś próbuje włamać się na konto klienta lub administratora (art. 6 ust. 1 lit. f RODO — prawnie uzasadniony interes administratora). Danych z dziennika nie używamy do profilowania, marketingu ani analityki i nie przekazujemy ich nikomu.', 'aai-monitor' ),
				__( 'Wpisy w dzienniku usuwamy automatycznie do 90 dni od ostatniej aktywności na koncie. Sformułowanie „do 90 dni” jest tu dosłowne: sprzątanie uruchamia się przy kolejnym logowaniu i przy otwarciu panelu administratora, więc na witrynie, na którą przez dłuższy czas nikt się nie loguje, usunięcie następuje przy najbliższym z tych zdarzeń.', 'aai-monitor' ),
				__( 'Masz prawo dostępu do tych danych, ich sprostowania, usunięcia i sprzeciwu wobec przetwarzania — wystarczy wiadomość na adres kontaktowy podany w polityce.', 'aai-monitor' ),
			)
		);
	}
}
