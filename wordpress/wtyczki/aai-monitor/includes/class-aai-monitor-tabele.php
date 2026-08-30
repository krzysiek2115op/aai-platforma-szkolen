<?php
/**
 * Schemat tabel wtyczki — BAZA Pluginu 3.
 *
 * DWIE tabele i ani jednej więcej. Każda odpowiada na inne pytanie i ma
 * inny okres życia, więc nie mają między sobą żadnej relacji:
 *
 *  - `logowania` — kto i skąd wchodził na konto. Niesie DANE OSOBOWE
 *    (pełne IP, podany login) i żyje 90 dni (decyzja właściciela D2:
 *    skrócone albo zahaszowane IP jest bezużyteczne przy próbie
 *    włamania, a to jedyny powód, dla którego ta kolumna istnieje).
 *  - `wizyty` — co oglądano i jak długo. ANONIMOWE: bez IP, bez loginu,
 *    bez user-agenta, bez czegokolwiek łączącego z kontem (D3).
 *
 * ZŁĄCZENIE TYCH TABEL DAŁOBY PROFILOWANIE, którego ten moduł
 * z założenia nie robi — dlatego nie ma klucza obcego ani wspólnej
 * kolumny, po której dałoby się je posklejać.
 *
 * @package Aai_Monitor
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Tworzenie i utrzymanie tabel.
 */
final class Aai_Monitor_Tabele {

	/**
	 * Opcja z wersją schematu — po niej poznajemy, że trzeba dociągnąć zmiany.
	 */
	private const OPCJA_WERSJI = 'aai_monitor_wersja_schematu';

	/**
	 * Okno życia wierszy dziennika logowań, w dniach (D2).
	 */
	public const OKNO_LOGOWANIA_DNI = 90;

	/**
	 * Okno życia wierszy ruchu, w dniach.
	 *
	 * To NIE jest wymóg RODO (wizyty są anonimowe), tylko higiena
	 * rozmiaru. Okno przekracza największe okno ekranu (30 dni), bo ma
	 * starczyć na zapowiedziane porównanie rok-do-roku (sekcja 11
	 * schematu); gdyby ten ekran nie powstał, schodzi do ~120 dni.
	 */
	public const OKNO_WIZYTY_DNI = 400;

	/**
	 * Pełna nazwa tabeli z prefiksem instalacji i prefiksem wtyczki.
	 *
	 * @param string $nazwa Nazwa bez prefiksów, np. `logowania`.
	 */
	public static function tabela( string $nazwa ): string {
		global $wpdb;
		return $wpdb->prefix . AAI_MONITOR_PREFIKS . $nazwa;
	}

	/**
	 * Wszystkie nasze tabele — jedno miejsce, z którego korzystają
	 * `uninstall.php`, kontrola i smoke.
	 *
	 * @return string[]
	 */
	public static function wszystkie(): array {
		return array_map(
			array( self::class, 'tabela' ),
			array( 'logowania', 'wizyty' )
		);
	}

	/**
	 * Tworzy schemat. Wołane przy aktywacji; `dbDelta` jest idempotentne,
	 * więc druga aktywacja niczego nie psuje.
	 */
	public static function utworz(): void {
		global $wpdb;

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		// Kolacja instalacji — bez niej `JOIN` z tabelami WordPressa
		// wywala się na „Illegal mix of collations" (ta sama uwaga co
		// przy tabelach obu poprzednich wtyczek).
		$kolacja = $wpdb->get_charset_collate();

		$l = self::tabela( 'logowania' );
		$w = self::tabela( 'wizyty' );

		/*
		 * INDEKSY: tu stoi WYŁĄCZNIE ten, który obsługuje retencję —
		 * zakres po kolumnie czasu. Indeksów pod ekran NIE deklarujemy
		 * z góry: ustala je `EXPLAIN` na realnych zapytaniach w kroku T3
		 * (sekcja 7 schematu). Indeks dołożony „na oko" kosztuje przy
		 * każdym zapisie, a beacon to najczęstszy zapis w tym module.
		 *
		 * `zrodlo`, `login`, `ip` i `agent` mają DEFAULT '', nie NULL:
		 * przy porażce logowania nie znamy źródła ani konta, a pusty
		 * łańcuch czyta się jednoznacznie („nie było"), podczas gdy NULL
		 * w porównaniach zachowuje się inaczej niż wartość i wywracał
		 * już w tym projekcie niejedno zapytanie.
		 *
		 * `user_id` zostaje NULL-owalne, bo przy porażce naprawdę NIE MA
		 * konta — 0 udawałoby użytkownika o identyfikatorze zero.
		 */
		dbDelta(
			"CREATE TABLE {$l} (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				czas datetime NOT NULL,
				zdarzenie varchar(16) NOT NULL,
				zrodlo varchar(16) NOT NULL DEFAULT '',
				user_id bigint(20) unsigned NULL,
				login varchar(60) NOT NULL DEFAULT '',
				ip varchar(45) NOT NULL DEFAULT '',
				agent varchar(191) NOT NULL DEFAULT '',
				PRIMARY KEY  (id),
				KEY czas (czas)
			) {$kolacja};"
		);

		/*
		 * `sesja` to 32 znaki hex z `sessionStorage` przeglądarki — format
		 * ustalony w schemacie, bo sito na wejściu go egzekwuje.
		 * `crypto.randomUUID()` daje 36 znaków z myślnikami i odrzucałby
		 * własne beacony.
		 *
		 * `wejscie` liczy SERWER jako `now() − trwanie_ms`: beacon
		 * przychodzi przy WYJŚCIU ze strony, więc samo `now()` byłoby
		 * momentem wyjścia i wizyta zaczęta o 23:50 lądowałaby w następnej
		 * dobie. Klientowi nie ufamy w żadnym znaczniku czasu.
		 */
		dbDelta(
			"CREATE TABLE {$w} (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				sesja char(32) NOT NULL,
				sciezka varchar(191) NOT NULL,
				wejscie datetime NOT NULL,
				trwanie_ms int(10) unsigned NOT NULL DEFAULT 0,
				PRIMARY KEY  (id),
				KEY wejscie (wejscie)
			) {$kolacja};"
		);

		update_option( self::OPCJA_WERSJI, AAI_MONITOR_WERSJA, false );
	}

	/**
	 * Dociąga zmiany schematu po aktualizacji wtyczki — bez wołania
	 * `dbDelta` przy każdym żądaniu.
	 */
	public static function dociagnij_schemat(): void {
		if ( get_option( self::OPCJA_WERSJI ) !== AAI_MONITOR_WERSJA ) {
			self::utworz();
		}
	}

	/**
	 * Czy obie tabele istnieją w bazie — pytanie kontroli, nie założenie.
	 */
	public static function istnieja(): bool {
		return array() === self::brakujace();
	}

	/**
	 * Które z naszych tabel nie istnieją (pusta lista = komplet).
	 *
	 * Kontrola ma powiedzieć KTÓREJ brakuje, a nie samo „coś nie gra":
	 * przy dwóch tabelach różnica między jedną a drugą to różnica między
	 * „nie ma dziennika logowań" a „nie ma ruchu".
	 *
	 * @return string[]
	 */
	public static function brakujace(): array {
		global $wpdb;
		$brak = array();
		foreach ( self::wszystkie() as $tabela ) {
			// Nazwa tabeli jest identyfikatorem z kodu (prefiks instalacji
			// + stała wtyczki) — do `prepare` idzie jako WARTOŚĆ dla LIKE.
			// `esc_like`, bo nazwy tabel są pełne podkreśleń, a `_` to
			// wildcard LIKE — bez tego zapytanie mogłoby trafić w cudzą
			// tabelę o podobnej nazwie i kontrola skłamałaby o schemacie.
			$jest = $wpdb->get_var(
				$wpdb->prepare( 'SHOW TABLES LIKE %s', $wpdb->esc_like( $tabela ) )
			);
			if ( $jest !== $tabela ) {
				$brak[] = $tabela;
			}
		}
		return $brak;
	}
}
