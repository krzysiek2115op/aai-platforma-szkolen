<?php
/**
 * WYSTRZAŁ Pluginu 3 — jedyny publiczny punkt wejścia monitoringu.
 *
 * Kanałem jest `admin-post.php`, tak jak wszystkimi akcjami Pluginu 1
 * (6 wywołań `admin_post_*`); w repo nie ma ani jednej trasy REST i ani
 * jednego `wp_ajax_*`, więc wyjątek od konwencji musiałby się bronić,
 * a nie ma czym.
 *
 * DWIE PUŁAPKI TEGO KANAŁU, obie ciche — dlatego stoją tu w kodzie,
 * a nie w cudzej głowie:
 *   1. `admin-post.php` rozgałęzia się po `is_user_logged_in()` na DWA
 *      ROZŁĄCZNE haki (F17). Rejestrujemy OBIE nazwy: wizyty liczymy
 *      wszystkim oprócz zalogowanych adminów (D3), a strony lekcji są
 *      za logowaniem — sama rejestracja `nopriv` gubiłaby cały ruch
 *      w kupionym materiale. Beacon dostawałby `wp_die( '', 400 )`,
 *      którego nikt nie czyta.
 *   2. Nazwa akcji jedzie w QUERY STRINGU (F18), bo `$action` bierze się
 *      z `$_REQUEST`, a ciała `application/json` PHP nie wkłada do
 *      `$_POST`. Akcja schowana w ciele daje HTTP 200 i CISZĘ.
 *
 * ODPOWIADAMY 204 NA WSZYSTKO — i na przyjęcie, i na odrzut. Beacon nie
 * ma czytelnika, a różnicowanie odpowiedzi dałoby napastnikowi darmową
 * sondę („to się zapisało, a to nie"). Ceną jest brak objawu przy
 * rozjeździe klient–serwer, dlatego bramka T3 dowodzi PEŁNEJ ścieżki
 * (prawdziwa przeglądarka → wiersz w tabeli), a nie samego endpointu,
 * i asertuje WIERSZ, nigdy kodu odpowiedzi.
 *
 * SITO. Endpoint jest publiczny, więc każdy bajt wejścia jest wrogi
 * (lekcja z PR 3 kroku 2 prototypu). Kolejność jest celowa: najpierw
 * rzeczy darmowe (uprawnienie, typ ciała, pochodzenie), potem limiter,
 * i DOPIERO POTEM czytanie ciała — bo czytanie jest jedyną częścią,
 * która kosztuje pamięć.
 *
 * @package Aai_Monitor
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Odbiór beaconów z timera wizyt.
 */
final class Aai_Monitor_Wizyty {

	/**
	 * Nazwa akcji `admin-post.php`.
	 */
	public const AKCJA = 'aai_monitor_wizyta';

	/**
	 * Sufit ciała żądania w bajtach.
	 *
	 * Z POMIARU (docs/plugin-3/KROK-T3.md §2.1), nie z oszacowania:
	 * realny najdłuższy beacon tej instalacji waży **168 B**, a maksimum
	 * kontraktu (ścieżka pełne 191 znaków) **270 B**. Sufit ma pomieścić
	 * maksimum, nie średnią — stąd 1024 B, czyli 3,8× maksimum.
	 *
	 * Nie liczymy na limit przeglądarki: dokumentacja `sendBeacon` mówi
	 * o 64 KiB, ale w pomiarze beacon 70 kB przeszedł i doszedł w całości
	 * (F23). Sufit jest nasz albo nie ma go wcale.
	 */
	public const SUFIT_CIALA_B = 1024;

	/**
	 * Ile beaconów na minutę przyjmujemy z jednego adresu.
	 *
	 * LIMITER JEST MIĘKKI I TO JEST ŚWIADOME (F13): bez zewnętrznego
	 * cache'u transient siedzi w `wp_options` i działa przez
	 * czytaj-modyfikuj-zapisz, bez atomowego `INCR`. Chroni przed
	 * PRZYPADKIEM — pętlą w cudzym skrypcie, zwariowaną kartą — nie przed
	 * napastnikiem: zmierzone,
	 * że przeglądarka wypuszcza 26 363 beacony na sekundę i wszystkie
	 * dochodzą (F23). Twardą tamą jest tania treść wiersza (bez danych
	 * osobowych) i retencja.
	 *
	 * WARTOŚĆ Z POMIARU, nie z oszacowania (KROK-T3.md §2.5): sterowana
	 * przeglądarka nawigująca bez czytania wyciska z jednego adresu
	 * **294 odsłony na minutę** (15 nawigacji w 3,1 s). Człowiek czytający
	 * lekcje robi ich kilka–kilkanaście, ale jeden adres potrafi być bramą
	 * całego biura, więc sufit nie może stać przy ludzkim tempie.
	 * Stawiamy go **tuż nad zmierzoną granicą maszyny**: wszystko powyżej
	 * nie jest już przeglądaniem, a wszystko poniżej mieści prawdziwych
	 * ludzi za wspólnym adresem — łącznie z naszymi bramkami jakości,
	 * które w warsztacie idą z JEDNEGO adresu (brama kontenera, F14).
	 *
	 * NAZWA MÓWIŁA NIEPRAWDĘ DO NAPRAWY A1 (przegląd T3). Licznik trzymał
	 * samą liczbę, a `set_transient` odnawia TTL przy KAŻDYM zapisie, więc
	 * okno nie kończyło się nigdy, dopóki przerwy były krótsze niż minuta
	 * — realna reguła brzmiała „300 żądań od ostatniej pełnej minuty
	 * CISZY". Zmierzone: dwa beacony w odstępie 5 s przesunęły koniec okna
	 * o 5 s, a licznik szedł 1 → 2. Za wspólnym adresem (biuro, szkoła,
	 * proxy) jeden zapętlony klient gasił wtedy pomiar CAŁEJ witryny
	 * i nic tego nie zgłaszało. Dziś okno jest KOTWICZONE do pełnej
	 * minuty zegara i naprawdę się kończy.
	 */
	private const LIMIT_NA_MINUTE = 300;

	/**
	 * Okno limitu w sekundach.
	 */
	private const OKNO_LIMITU_S = 60;

	/**
	 * Rejestracja — wołane z pliku głównego.
	 */
	public static function zarejestruj(): void {
		// OBIE nazwy, bo to dwa rozłączne haki (F17). Kolejność bez
		// znaczenia, ale brak którejkolwiek gasi połowę ruchu.
		add_action( 'admin_post_nopriv_' . self::AKCJA, array( self::class, 'odbierz' ) );
		add_action( 'admin_post_' . self::AKCJA, array( self::class, 'odbierz' ) );

		Aai_Monitor_Ekran::zglos_czujke( 'ruch', 'ruch na stronach (anonimowo)' );
	}

	/**
	 * Adres wystrzału — z nazwą akcji w QUERY STRINGU (F18).
	 *
	 * Jedno miejsce, bo adres składany drugi raz w skrypcie byłby drugą
	 * okazją do zgubienia `?action=`, a objawem byłoby HTTP 200 i cisza.
	 */
	public static function adres(): string {
		return admin_url( 'admin-post.php?action=' . self::AKCJA );
	}

	/**
	 * Obsługa beaconu.
	 *
	 * `catch ( Throwable )` obejmuje CAŁOŚĆ: to jest publiczny endpoint,
	 * więc wyjątek oznaczałby HTTP 500 z komunikatem PHP dla każdego,
	 * kto go wywoła. Monitoring nie ma prawa niczego ujawnić ani
	 * wywrócić — nawet siebie.
	 */
	public static function odbierz(): void {
		try {
			self::obsluz();
		} catch ( Throwable $e ) {
			Aai_Monitor_Komunikaty::zapisz( 'beacon wizyty nie został zapisany: ' . $e->getMessage() );
		}
		self::koniec();
	}

	/* ————————————————————————— sito ————————————————————————— */

	/**
	 * Właściwa obsługa: każdy `return` to odrzut, nierozróżnialny na
	 * zewnątrz od przyjęcia.
	 */
	private static function obsluz(): void {
		// 1. Administratora NIE liczymy (D3). Skrypt i tak nie jest mu
		// podawany, ale beacon może przyjść z karty otwartej przed
		// zalogowaniem — wtedy odsłona byłaby przypisana komuś, kogo
		// z definicji nie mierzymy.
		if ( current_user_can( Aai_Monitor_Ekran::UPRAWNIENIE ) ) {
			return;
		}

		// 2. Typ ciała. To JEDYNA rzecz, która zatrzymuje beacon z obcej
		// witryny (F20): ładunek `application/json` wymaga preflightu,
		// na który WordPress odpowiada 403 i kończy — ale ten sam ładunek
		// wysłany cross-origin jako `text/plain` DOCHODZI jak swój.
		// Bez tego sprawdzenia sito na `Origin` jest dekoracją.
		if ( ! self::typ_ciala_pasuje() ) {
			return;
		}

		// 3. Pochodzenie. `Origin` jest wysyłany także przy żądaniu
		// same-origin — zmierzone (F19), wbrew dokumentacji MDN.
		// Nagłówek jest do podrobienia poza przeglądarką, więc to tama
		// na przypadek, nie na napastnika.
		if ( ! self::pochodzenie_pasuje() ) {
			return;
		}

		// 4. Limiter PRZED czytaniem ciała — czytanie jest jedyną
		// częścią, która kosztuje pamięć. Sprawdzenie tylko CZYTA;
		// licznik rośnie na końcu i wyłącznie o beacony PRZYJĘTE (A1).
		// Inaczej strumień śmieci wypełniałby limit i gasił pomiar
		// prawdziwym ludziom zza tego samego adresu — czyli dokładnie
		// to, przed czym limiter miał chronić.
		if ( ! self::limit_wolny() ) {
			return;
		}

		// 5. Ciało: strumieniem, z sufitem. `post_max_size` w tym
		// kontenerze to 8 MB, więc `file_get_contents( 'php://input' )`
		// wciągnąłby do pamięci wszystko, co ktoś wyśle, ZANIM
		// zdążylibyśmy cokolwiek sprawdzić.
		$cialo = self::cialo_ze_strumienia();
		if ( null === $cialo ) {
			return;
		}

		$dane = json_decode( $cialo, true, 4 );
		if ( ! is_array( $dane ) ) {
			return;
		}

		// 6. Ścieżka i jej podpis. Ścieżka NIE jest sprawdzana pytaniem
		// „czy taka trasa istnieje" — `url_to_postid()` odpowiada NIE dla
		// katalogu, obu stron sprzedażowych i wszystkich 73 lekcji (F24).
		// Dowodem jest podpis: tę stronę wyrenderował WordPress.
		$sciezka = isset( $dane['sciezka'] ) && is_string( $dane['sciezka'] ) ? $dane['sciezka'] : '';
		$podpis  = isset( $dane['podpis'] ) && is_string( $dane['podpis'] ) ? $dane['podpis'] : '';

		// Flaga bramki logowania (A6) jest CZĘŚCIĄ PODPISYWANEGO
		// MATERIAŁU, nie osobnym polem zaufania: podniesienie jej albo
		// zdjęcie unieważnia podpis. Bierzemy ją więc PRZED weryfikacją.
		$bramka = ! empty( $dane['bramka'] );

		if ( ! self::sciezka_ma_ksztalt( $sciezka ) || ! Aai_Monitor_Podpis::pasuje( $sciezka, $podpis, $bramka ) ) {
			return;
		}

		// 7. Identyfikator sesji: dokładnie 32 znaki hex, bo taki
		// generuje skrypt.
		$sesja = isset( $dane['sesja'] ) && is_string( $dane['sesja'] ) ? $dane['sesja'] : '';
		if ( 1 !== preg_match( '/^[0-9a-f]{32}$/', $sesja ) ) {
			return;
		}

		// 7b. Identyfikator ODSŁONY — ten sam we wszystkich beaconach
		// jednej odsłony, nowy po powrocie z bfcache. Ten sam kształt co
		// sesja, bo robi go ta sama funkcja w skrypcie. Bez niego wiersz
		// i tak powstanie, ale doczytany czas nie miałby czego uzupełnić.
		$odslona = isset( $dane['odslona'] ) && is_string( $dane['odslona'] ) ? $dane['odslona'] : '';
		if ( 1 !== preg_match( '/^[0-9a-f]{32}$/', $odslona ) ) {
			return;
		}

		// 8. Dwie liczby, nie jedna. `trwanie_ms` to czas AKTYWNY (zegar
		// stoi przy ukrytej karcie), a `wiek_ms` to czas od wejścia na
		// stronę do wysłania beaconu — i to z niego serwer liczy moment
		// wejścia. Gdyby moment wejścia brał się z czasu aktywnego,
		// karta otwarta o 9:00, czytana dwie minuty i zamknięta o 17:00
		// zapisałaby wejście o 16:58 (P16).
		$trwanie = self::liczba( $dane, 'trwanie_ms' );
		$wiek    = self::liczba( $dane, 'wiek_ms' );

		$zapisane = Aai_Monitor_Zapis::dodaj_wizyte(
			array(
				'odslona'    => $odslona,
				'sesja'      => $sesja,
				'sciezka'    => $sciezka,
				'bramka'     => $bramka,
				'trwanie_ms' => $trwanie,
				'wiek_ms'    => $wiek,
			)
		);

		if ( $zapisane ) {
			self::zlicz_beacon();
		}
	}

	/**
	 * Czy `Content-Type` to `application/json`.
	 *
	 * Dopuszczamy parametry (`; charset=UTF-8`), bo przeglądarka dokłada
	 * je sama; nie dopuszczamy niczego innego.
	 */
	private static function typ_ciala_pasuje(): bool {
		$typ = isset( $_SERVER['CONTENT_TYPE'] ) ? (string) wp_unslash( $_SERVER['CONTENT_TYPE'] ) : '';
		$typ = strtolower( trim( explode( ';', $typ )[0] ) );
		return 'application/json' === $typ;
	}

	/**
	 * Czy żądanie przyszło z naszej witryny.
	 *
	 * `Origin` jest wymagany, `Referer` jest zapasem — nie odwrotnie.
	 * Zmierzone: przeglądarka wysyła `Origin` także same-origin (F19),
	 * więc jego brak jest sygnałem, a nie normą.
	 */
	private static function pochodzenie_pasuje(): bool {
		$nasze = self::zrodlo( home_url() );

		// ZAWODZIMY NA ZAMKNIĘTO (A8 z przeglądu T3). `zrodlo()` oddaje
		// pusty łańcuch dla wszystkiego, czego nie umie rozebrać — także
		// dla `Origin: null`, którym przedstawia się piaskownicowana ramka.
		// Gdyby więc `home_url()` kiedykolwiek zostało bez hosta, obie
		// strony porównania byłyby puste i OBCE żądanie przeszłoby jako
		// swoje. Nie wiedząc, jaka jest nasza witryna, nie wpuszczamy nikogo.
		if ( '' === $nasze ) {
			return false;
		}

		$origin = get_http_origin();
		if ( is_string( $origin ) && '' !== $origin ) {
			$zrodlo = self::zrodlo( $origin );
			return '' !== $zrodlo && $zrodlo === $nasze;
		}

		$referer = isset( $_SERVER['HTTP_REFERER'] ) ? (string) wp_unslash( $_SERVER['HTTP_REFERER'] ) : '';
		if ( '' !== $referer ) {
			$zrodlo = self::zrodlo( $referer );
			return '' !== $zrodlo && $zrodlo === $nasze;
		}

		return false;
	}

	/**
	 * Schemat + host + port adresu — bez ścieżki i bez końcowego ukośnika.
	 *
	 * @param string $adres Dowolny adres.
	 */
	private static function zrodlo( string $adres ): string {
		$czesci = wp_parse_url( $adres );
		if ( ! is_array( $czesci ) || ! isset( $czesci['host'] ) ) {
			return '';
		}
		$port = isset( $czesci['port'] ) ? ':' . $czesci['port'] : '';
		return strtolower( ( $czesci['scheme'] ?? 'http' ) . '://' . $czesci['host'] . $port );
	}

	/**
	 * Czy adres nadawcy zmieścił się w limicie.
	 *
	 * Pełne IP NIE trafia do żadnej tabeli — żyje wyłącznie w kluczu
	 * transientu, i to jako skrót. Tabela `wizyty` jest anonimowa (D3)
	 * i ma taka zostać także w tym miejscu.
	 */
	private static function limit_wolny(): bool {
		$klucz = self::klucz_limitu();
		if ( '' === $klucz ) {
			// Bez adresu nie ma czego liczyć; przepuszczamy, bo brak
			// adresu zdarza się w konfiguracjach, nie w atakach.
			return true;
		}
		return self::stan_limitu( $klucz )['ile'] < self::LIMIT_NA_MINUTE;
	}

	/**
	 * Dolicza JEDEN przyjęty beacon do bieżącej minuty.
	 *
	 * Osobno od sprawdzenia, i to jest cała naprawa A1: licznik rośnie
	 * dopiero po zapisanym wierszu, więc śmieci nie wypełniają limitu
	 * prawdziwym ludziom zza tego samego adresu.
	 */
	private static function zlicz_beacon(): void {
		$klucz = self::klucz_limitu();
		if ( '' === $klucz ) {
			return;
		}
		$stan = self::stan_limitu( $klucz );
		// TTL z zapasem jednego okna: przeterminowanie transientu NIE
		// jest tu mechanizmem okna (był nim do naprawy A1 i dlatego okno
		// nie kończyło się nigdy) — okno rozstrzyga zapisany numer minuty.
		set_transient( $klucz, $stan['okno'] . ':' . ( $stan['ile'] + 1 ), self::OKNO_LIMITU_S * 2 );
	}

	/**
	 * Klucz limitu dla adresu nadawcy albo pusty łańcuch.
	 *
	 * Pełne IP NIE trafia do żadnej tabeli — żyje wyłącznie w kluczu
	 * transientu, i to jako skrót. Tabela `wizyty` jest anonimowa (D3)
	 * i ma taka zostać także w tym miejscu.
	 */
	private static function klucz_limitu(): string {
		$ip = Aai_Monitor_Zadanie::ip();
		if ( '' === $ip ) {
			return '';
		}
		return 'aai_monitor_limit_' . substr( Aai_Monitor_Podpis::podpisz( $ip ), 0, 16 );
	}

	/**
	 * Bieżące okno i licznik w nim.
	 *
	 * Okno jest KOTWICZONE do pełnej minuty zegara, a nie do czasu
	 * pierwszego żądania: dzięki temu kończy się samo, niezależnie od
	 * tego, ile razy odnowiliśmy TTL po drodze. Zapis spoza bieżącego
	 * okna czyta się jak zero — nie musimy go kasować.
	 *
	 * @param string $klucz Klucz transientu.
	 * @return array{okno:int, ile:int}
	 */
	private static function stan_limitu( string $klucz ): array {
		$teraz = time();
		$okno  = $teraz - ( $teraz % self::OKNO_LIMITU_S );

		$zapis = get_transient( $klucz );
		if ( is_string( $zapis ) && 1 === preg_match( '/^(\d+):(\d+)$/', $zapis, $czesci ) && (int) $czesci[1] === $okno ) {
			return array(
				'okno' => $okno,
				'ile'  => (int) $czesci[2],
			);
		}
		return array(
			'okno' => $okno,
			'ile'  => 0,
		);
	}

	/**
	 * Ciało żądania albo `null`, gdy przekracza sufit.
	 *
	 * `content-length` sprawdzamy, ale NIEUFNIE: to deklaracja klienta,
	 * a rozstrzyga to, ile bajtów naprawdę przyszło strumieniem.
	 */
	private static function cialo_ze_strumienia(): ?string {
		$deklarowana = isset( $_SERVER['CONTENT_LENGTH'] ) ? (int) $_SERVER['CONTENT_LENGTH'] : 0;
		if ( $deklarowana > self::SUFIT_CIALA_B ) {
			return null;
		}

		$uchwyt = fopen( 'php://input', 'r' );
		if ( false === $uchwyt ) {
			return null;
		}
		// O bajt więcej niż sufit: gdy tyle się doczyta, wiemy, że ciało
		// jest za duże, i nie musimy wczytywać reszty.
		$cialo = (string) fread( $uchwyt, self::SUFIT_CIALA_B + 1 );
		fclose( $uchwyt );

		return strlen( $cialo ) > self::SUFIT_CIALA_B ? null : $cialo;
	}

	/**
	 * Czy ścieżka ma dopuszczalny kształt (podpis rozstrzyga resztę).
	 *
	 * @param string $sciezka Ścieżka z beaconu.
	 */
	private static function sciezka_ma_ksztalt( string $sciezka ): bool {
		if ( '' === $sciezka || '/' !== $sciezka[0] ) {
			return false;
		}
		if ( mb_strlen( $sciezka ) > Aai_Monitor_Podpis::MAX_SCIEZKI ) {
			return false;
		}
		return 0 === preg_match( '/[\x00-\x1F\x7F]/u', $sciezka );
	}

	/**
	 * Liczba nieujemna z ładunku (brak, śmieć i wartość ujemna → 0).
	 *
	 * ŁAŃCUCH Z LICZBĄ TEŻ JEST LICZBĄ (A10 z przeglądu T3). Zmierzone:
	 * ładunek `"trwanie_ms":"5000"` dawał wiersz z czasem **0** i wejściem
	 * „przed chwilą” — czyli pełną liczbę odsłon przy wyzerowanym czasie
	 * i przesuniętych godzinach. Nasz skrypt wysyła liczby, więc dziś to
	 * nie boli; ale jedna zmiana po stronie klienta (albo cudza biblioteka,
	 * która serializuje liczby jako tekst) zamieniłaby CAŁY pomiar czasu
	 * w zera, nie zapalając niczego — bo wiersze dalej by powstawały.
	 *
	 * `is_numeric` NIE otwiera furtki: przepuszcza wyłącznie zapis liczby,
	 * a wynik i tak przechodzi przez sufity warstwy zapisu.
	 *
	 * @param array<string,mixed> $dane  Zdekodowany ładunek.
	 * @param string              $klucz Nazwa pola.
	 */
	private static function liczba( array $dane, string $klucz ): int {
		$wartosc = $dane[ $klucz ] ?? 0;
		if ( is_string( $wartosc ) && is_numeric( $wartosc ) ) {
			$wartosc = (float) $wartosc;
		}
		if ( ! is_int( $wartosc ) && ! ( is_float( $wartosc ) && is_finite( $wartosc ) ) ) {
			return 0;
		}
		return max( 0, (int) $wartosc );
	}

	/**
	 * Koniec obsługi: 204 i cisza, niezależnie od tego, co się stało.
	 */
	private static function koniec(): void {
		status_header( 204 );
		exit;
	}
}
