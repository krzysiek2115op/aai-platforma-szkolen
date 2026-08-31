<?php
/**
 * Automatic AI — obwód bezpieczeństwa (mu-plugin).
 *
 * WARSTWA B audytu bezpieczeństwa (2026-08-31). Globalne guardy WordPressa,
 * które NIE należą do żadnej z trzech wtyczek produktowych: obowiązują całą
 * witrynę niezależnie od tego, czy sklep/płatności/monitoring są aktywne.
 * Dlatego mu-plugin (must-use) — ładuje się zawsze, przed wtyczkami, i nie
 * da się go wyłączyć z kokpitu.
 *
 * PODZIAŁ ODPOWIEDZIALNOŚCI (decyzja właściciela 2026-08-31):
 *   - nasze 3 wtyczki  → bezpieczeństwo WŁASNEJ logiki i danych,
 *   - TEN mu-plugin     → globalne guardy WordPressa,
 *   - hosting/serwer    → HSTS, blokada readme.html, XML-RPC na warstwie
 *                         serwera (druga warstwa), reszta infrastruktury.
 *
 * CO ROBI (wszystko zmierzone przed napisaniem — patrz audyt):
 *   1. Wyłącza XML-RPC W CAŁOŚCI. Projekt go nie używa, a `system.multicall`
 *      pozwalał wcisnąć 20 prób logowania w jedno żądanie (zmierzone:
 *      20 prób → 1 wiersz w dzienniku Pluginu 3), czyli omijał jedyny
 *      mechanizm wykrywania brute-force, jaki projekt ma. `pingback.ping`
 *      to dodatkowo SSRF/wzmacniacz DDoS. Serwer ma to blokować jako druga
 *      warstwa (decyzja właściciela).
 *   2. Zdejmuje z `<head>` sygnaturę wersji WordPressa i odnośniki, które
 *      istnieją tylko po to, by dało się tę witrynę zmapować (RSD, WLW,
 *      shortlink, generator). Wersja WP + lista dostępnych metod to darmowy
 *      wywiad dla atakującego.
 *   3. Dokłada trzy nagłówki bezpieczeństwa NA FRONCIE (poza wp-admin):
 *      `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`.
 *      Pomiar potwierdził, że front nie ma ani jednej `<iframe>`, ani
 *      jednego inline `on*`, ani jednego hosta zewnętrznego ładującego
 *      zasób — więc te trzy nagłówki niczego nie łamią.
 *   4. Dokłada CSP **EGZEKWUJĄCE** (front, poza wp-admin) — PO etapie
 *      obserwacji, nie zamiast niego. Report-Only wysłał docelową politykę,
 *      a rig (prawdziwa przeglądarka) zmierzył, co by zablokowała: kasa ma
 *      23 inline `<script>` bez nonce'a, a motyw (generowany, read-only)
 *      echouje własny surowy `<script>` w `header.php`. Rozwiązanie: nonce na
 *      inline skrypty WordPressa/WooCommerce, hash na guard motywu i na
 *      statyczny `wc_no_js`, keyword na speculationrules. Zmierzone: ZERO
 *      naruszeń na wszystkich typach stron, gość i zalogowany klient, ze
 *      Store API kasy włącznie. Kolektor (`report-uri`) zostaje włączony pod
 *      egzekwowaniem jako siatka na zmiany w cudzych statycznych skryptach.
 *
 * CZEGO TU NIE MA — i dlaczego:
 *   - HSTS: należy do serwera (nagłówek ma sens tylko po HTTPS, a domeny
 *     jeszcze nie ma). Pozycja „przed pierwszym klientem".
 *   - `strict-dynamic`: świadomie NIE — statyczne `<script src>` rdzenia/Woo
 *     byłyby wtedy ignorowane przez `'self'`; zamiast tego `'self'`
 *     przepuszcza własne skrypty, a nonce/hash inline.
 *
 * UWAGA WDROŻENIOWA (hosting): nonce jest LOSOWY na żądanie, więc pełny
 * cache HTML strony podałby stary nonce do nowego nagłówka i wywalił
 * skrypty. Tu cache'u stron nie ma; na produkcji cache HTML musi omijać
 * strony z CSP albo liczyć nonce cache-aware (klasa A11 wydajności).
 *   - `unsafe-inline` w `script-src`: świadomie NIE — bo zniweczyłoby cały
 *     sens CSP. Inline skrypty obejmiemy nonce'em (core/Woo, przez filtr
 *     `wp_inline_script_attributes`) i hashem (surowy skrypt motywu).
 *
 * @package Aai_Obwod
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Guardy obwodowe. Sama statyka — mu-plugin nie ma cyklu życia wtyczki.
 */
final class Aai_Obwod {

	/**
	 * Nagłówek CSP — EGZEKWUJĄCY.
	 *
	 * Wszedł po etapie obserwacji, nie zamiast niego. Report-Only wysłał
	 * docelową politykę, a rig (prawdziwa przeglądarka) zmierzył, co by
	 * zablokowała: po objęciu inline skryptów WordPressa/WooCommerce nonce'em,
	 * guardu motywu hashem i statycznego `wc_no_js` hashem — **zero naruszeń
	 * na wszystkich typach stron**: katalog, kurs, lekcja (gość i zalogowany
	 * klient), koszyk, kasa ze Store API w pełni załadowanym, „Moje kursy",
	 * strona konta. Dopiero wtedy zmieniło się jedno słowo w nazwie nagłówka.
	 *
	 * Kolektor (`report-uri`) ZOSTAJE także pod egzekwowaniem: gdyby
	 * aktualizacja WooCommerce albo regeneracja motywu zmieniła któryś
	 * statyczny skrypt, naruszenie trafi do agregatu, zamiast zniknąć
	 * bez śladu.
	 */
	private const CSP_NAGLOWEK = 'Content-Security-Policy';

	/**
	 * Hash surowego, wykonywalnego `<script>` motywu z `header.php`
	 * (guard hydracji). Motyw jest GENEROWANY i READ-ONLY, a ten skrypt
	 * idzie do HTML z pominięciem `wp_add_inline_script()`, więc WordPress
	 * nie może dołożyć mu nonce'a — jedyną drogą jest hash.
	 *
	 * KRUCHOŚĆ JEST ŚWIADOMA: regeneracja motywu zmieni ten skrypt i hash
	 * przestanie pasować, a wtedy pod EGZEKWUJĄCYM CSP hydracja padłaby po
	 * cichu. Dlatego hash pilnuje osobny strażnik (`straznik-obwodu`), który
	 * czerwieni się, gdy skrypt motywu przestanie pasować do tej stałej.
	 * Pod EGZEKWUJĄCYM CSP rozjazd hasha WYWALIŁBY hydrację po cichu, dlatego
	 * strażnik ma się zapalić, a kolektor złapać naruszenie z żywego ruchu.
	 */
	private const HASH_SKRYPTU_MOTYWU = 'sha256-wWMpFPmbife9zJIGhhzVCMWkvaZZCMbyNw/QOf4tNWs=';

	/**
	 * Hash statycznego skryptu WooCommerce `wc_no_js` (zamiana klasy
	 * `woocommerce-no-js` → `woocommerce-js`, sygnał dla CSS, że JS działa).
	 *
	 * WooCommerce echouje go SUROWO (`<script type='text/javascript'>`),
	 * z pominięciem `wp_get_inline_script_tag`, więc nonce go nie obejmuje —
	 * a że treść jest STAŁA i identyczna na każdej stronie (zmierzone),
	 * obejmuje ją hash. Był to JEDYNY skrypt łamiący politykę z nonce'em
	 * (rig: 1 naruszenie na stronę, wszystkie ono).
	 *
	 * ZALEŻNOŚĆ OD WERSJI WOO: aktualizacja WooCommerce mogłaby zmienić ten
	 * skrypt i hash przestałby pasować. Skutek jest ŁAGODNY (klasa
	 * `woocommerce-no-js` zostaje — kosmetyka), a kolektor CSP (`report-uri`
	 * działa też pod egzekwowaniem) zgłosiłby to od razu. Pilnuje tego
	 * także `straznik-obwodu`, gdy Woo jest na dysku.
	 */
	private const HASH_WC_NO_JS = 'sha256-eHL/Izx7K/qWL0kdBXXnHwsLSHvGOJn/THLHydUZdog=';

	/**
	 * Podpina wszystkie guardy. Wołane raz, przy wczytaniu pliku.
	 */
	/**
	 * Akcja `admin-post.php` zbierająca raporty naruszeń CSP.
	 *
	 * Kanałem jest `admin-post.php` — ten sam, którym idzie beacon
	 * monitoringu i akcje kreatora; w tym repo nie ma tras REST ani
	 * `wp_ajax_*`, więc kolektor trzyma się konwencji.
	 */
	private const RAPORT_AKCJA = 'aai_obwod_csp';

	/**
	 * Jednorazowy nonce CSP tego żądania.
	 *
	 * TA SAMA WARTOŚĆ jedzie do nagłówka `script-src 'nonce-…'` i do
	 * atrybutu każdego inline `<script>`, który WordPress/WooCommerce
	 * emitują przez swój interfejs (`wp_get_inline_script_tag`). Dzięki
	 * temu 23 inline skrypty kasy (i wszystkie inne) są zaufane BEZ
	 * `'unsafe-inline'`, którego dodanie zniweczyłoby CSP. Surowy skrypt
	 * motywu, który interfejsu NIE przechodzi, obejmuje hash.
	 *
	 * @var string|null
	 */
	private static $nonce = null;

	/** Opcja z agregatem naruszeń (nie autoload — czyta ją tylko ekran/strażnik). */
	private const RAPORT_OPCJA = 'aai_obwod_csp_raport';

	/** Sufit ciała raportu w bajtach — raport CSP mieści się z zapasem. */
	private const RAPORT_SUFIT_B = 8192;

	/** Ile RÓŻNYCH rodzajów naruszeń trzymamy (dyrektywa+zasób). */
	private const RAPORT_MAX_RODZAJOW = 200;

	public static function zarejestruj(): void {
		self::wylacz_xmlrpc();
		self::odchudz_head();
		self::zaslon_liste_uzytkownikow();
		self::zaslon_autorow();
		self::wylacz_hasla_aplikacji();
		self::podpisz_skrypty();
		add_action( 'send_headers', array( self::class, 'naglowki' ) );
		// Kolektor CSP — obie gałęzie `admin-post.php` (raport przychodzi
		// z przeglądarki gościa I zalogowanego; to dwa rozłączne haki).
		add_action( 'admin_post_nopriv_' . self::RAPORT_AKCJA, array( self::class, 'zbierz_raport' ) );
		add_action( 'admin_post_' . self::RAPORT_AKCJA, array( self::class, 'zbierz_raport' ) );
	}

	/* ————————————————————————— hardening ————————————————————————— */

	/**
	 * Druga droga enumeracji kont — archiwum autora — zamknięta gościowi.
	 *
	 * S-2 miało dziurę: `/wp-json/wp/v2/users` odcięliśmy, ale `?author=1`
	 * dalej robił **301 na `/author/admin/`** (zmierzone) — ten sam login
	 * administratora, inną drogą. Zamykamy zapytanie o autora, ZANIM rdzeń
	 * zdąży je przekierować.
	 *
	 * Tylko dla NIEZALOGOWANYCH i tylko na froncie: w kokpicie i dla
	 * zalogowanych archiwa autora działają jak dotąd. Ta witryna to sklep —
	 * stron autora nie publikuje (motyw ich nie linkuje), więc gość nie
	 * traci nic prawdziwego.
	 */
	private static function zaslon_autorow(): void {
		add_action(
			'parse_request',
			static function ( $wp ) {
				if ( is_user_logged_in() || ! is_object( $wp ) ) {
					return $wp;
				}
				$pyta_o_autora = isset( $wp->query_vars['author'] ) || isset( $wp->query_vars['author_name'] )
					|| ( isset( $_GET['author'] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
				if ( $pyta_o_autora ) {
					// 404 zamiast 301 — istniejące i zmyślone konto nie do
					// odróżnienia (zero sondy, jak przy REST).
					unset( $wp->query_vars['author'], $wp->query_vars['author_name'] );
					$wp->query_vars['error'] = '404';
				}
				return $wp;
			}
		);
	}

	/**
	 * Hasła aplikacji WordPressa — wyłączone, bo nikt tu ich nie używa.
	 *
	 * To osobny kanał uwierzytelniania REST (Basic Auth po HTTPS), który
	 * OMIJA `wp_authenticate()` — czyli także `wp_login_failed`, na którym
	 * stoi dziennik logowań Pluginu 3 (F12). Nieużywana furtka, która nie
	 * zostawia śladu w dzienniku, to czysty koszt. Projekt nie ma aplikacji
	 * mobilnej ani integracji na app-password; gdy dojdzie, zdejmuje się
	 * jeden filtr.
	 *
	 * Na tej instalacji kanał i tak jest zamknięty (brak HTTPS), ale
	 * na produkcji domyślnie bywa OTWARTY — filtr czyni decyzję jawną
	 * i przenośną.
	 */
	private static function wylacz_hasla_aplikacji(): void {
		add_filter( 'wp_is_application_passwords_available', '__return_false' );
	}

	/* ————————————————————————— enumeracja kont ————————————————————————— */

	/**
	 * Publiczna lista użytkowników REST — WYŁĄCZNIE dla zalogowanych.
	 *
	 * S-2 z audytu. `/wp-json/wp/v2/users` oddawał gościowi login
	 * administratora (`slug: "admin"`) — zmierzone. Login to połowa
	 * loginowania; w parze z brute-force przez XML-RPC (zabitym wyżej)
	 * dawał komplet. Nikt niezalogowany nie ma tu czego szukać: Store API
	 * WooCommerce mieszka pod `/wc/store`, a nasze wtyczki nie pytają
	 * rdzenia o listę kont.
	 *
	 * ZDEJMUJEMY TRASĘ, a nie pola: `rest_prepare_user` schowałby dane, ale
	 * samo istnienie odpowiedzi 200 vs 404 dalej potwierdzałoby konto po id.
	 * Usunięta trasa oddaje `rest_no_route` (404) tak samo dla istniejącego,
	 * jak dla zmyślonego — zero sondy.
	 *
	 * Zalogowany z realnym uprawnieniem (`list_users`) dostaje pełną trasę
	 * jak dotąd — kokpit i edytor bloków działają bez zmian.
	 */
	private static function zaslon_liste_uzytkownikow(): void {
		add_filter(
			'rest_endpoints',
			static function ( $trasy ) {
				if ( is_user_logged_in() ) {
					return $trasy;
				}
				if ( is_array( $trasy ) ) {
					unset( $trasy['/wp/v2/users'] );
					unset( $trasy['/wp/v2/users/(?P<id>[\d]+)'] );
				}
				return $trasy;
			}
		);
	}

	/* ————————————————————————— XML-RPC ————————————————————————— */

	/**
	 * Wyłącza XML-RPC w całości: sam interfejs, pingbacki i nagłówek
	 * `X-Pingback`, którym WordPress sam się ogłasza.
	 */
	private static function wylacz_xmlrpc(): void {
		add_filter( 'xmlrpc_enabled', '__return_false' );

		// Pełna lista metod pusta — nawet gdyby coś ominęło `xmlrpc_enabled`,
		// nie ma czego wywołać (multicall/pingback znikają razem z listą).
		add_filter( 'xmlrpc_methods', '__return_empty_array' );

		// Nagłówek `X-Pingback` na froncie: przestajemy się ogłaszać.
		add_filter(
			'wp_headers',
			static function ( $naglowki ) {
				if ( is_array( $naglowki ) ) {
					unset( $naglowki['X-Pingback'] );
				}
				return $naglowki;
			}
		);

		// Metoda pingback z listy dostępnych API — druga warstwa na to samo.
		add_filter(
			'xmlrpc_methods',
			static function ( $metody ) {
				if ( is_array( $metody ) ) {
					unset( $metody['pingback.ping'], $metody['pingback.extensions.getPingbacks'] );
				}
				return $metody;
			}
		);
	}

	/* ————————————————————————— <head> ————————————————————————— */

	/**
	 * Zdejmuje z `<head>` to, co służy wyłącznie do mapowania witryny:
	 * wersję WordPressa, odnośnik RSD (XML-RPC), manifest Windows Live
	 * Writer i shortlink. Nic z tego nie jest potrzebne tej witrynie.
	 */
	private static function odchudz_head(): void {
		remove_action( 'wp_head', 'wp_generator' );
		remove_action( 'wp_head', 'rsd_link' );
		remove_action( 'wp_head', 'wlwmanifest_link' );
		remove_action( 'wp_head', 'wp_shortlink_wp_head' );

		// Sygnatura wersji doklejana do adresów zasobów (`?ver=6.9.4`) też
		// zdradza wersję — zdejmujemy ją z CSS i JS. Nie rusza to naszych
		// wtyczek (używają własnej stałej wersji jako `?ver`), a tamte
		// numery nie są sekretem rdzenia.
		$bez_wersji_rdzenia = static function ( $src ) {
			if ( is_string( $src ) && str_contains( $src, 'ver=' . get_bloginfo( 'version' ) ) ) {
				$src = remove_query_arg( 'ver', $src );
			}
			return $src;
		};
		add_filter( 'style_loader_src', $bez_wersji_rdzenia, 9 );
		add_filter( 'script_loader_src', $bez_wersji_rdzenia, 9 );
	}

	/* ————————————————————————— nagłówki ————————————————————————— */

	/**
	 * Nagłówki bezpieczeństwa — WYŁĄCZNIE na froncie.
	 *
	 * `is_admin()` odcina wp-admin (decyzja właściciela: nagłówki globalnie
	 * na froncie, bez kokpitu — tam `X-Frame-Options` czy CSP mogłyby
	 * połamać podglądy i edytor bloków). `send_headers` biegnie na każdym
	 * żądaniu frontu, także REST i wp-login — i dobrze: login też ma być
	 * chroniony przed osadzeniem w ramce (clickjacking).
	 */
	public static function naglowki(): void {
		if ( is_admin() ) {
			return;
		}

		// Zawartość jest tym, czym się przedstawia — koniec ze zgadywaniem
		// typu (MIME sniffing) na plikach wgranych do biblioteki mediów.
		header( 'X-Content-Type-Options: nosniff' );

		// Referrer tylko do własnego origin przy przejściu na obcy adres —
		// nie wyciekają pełne ścieżki (np. lekcji) do stron trzecich.
		header( 'Referrer-Policy: strict-origin-when-cross-origin' );

		// Anti-clickjacking. `SAMEORIGIN` zamiast `DENY`, bo podglądy
		// wewnątrz wp-admin bywają w ramce z tego samego origin.
		header( 'X-Frame-Options: SAMEORIGIN' );

		// Wyłącza sprzętowe API, których ta witryna nie używa. Sklep
		// z kursami nie potrzebuje kamery, mikrofonu, geolokalizacji ani
		// płatności przeglądarkowych — a każde włączone to powierzchnia
		// dla cudzego skryptu, który jakoś wszedłby na stronę. Lista jest
		// zachowawcza: nie dotyka niczego, co robi WooCommerce czy Tutor.
		header( 'Permissions-Policy: geolocation=(), camera=(), microphone=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()' );

		// CSP — TRYB OBSERWACJI. Patrz `csp_regula()`.
		header( self::CSP_NAGLOWEK . ': ' . self::csp_regula() );
	}

	/* ————————————————————————— nonce skryptów ————————————————————————— */

	/**
	 * Nonce CSP tego żądania — jeden na całą odpowiedź.
	 *
	 * `random_bytes` (kryptograficzny), 128 bitów w base64. Liczony leniwie
	 * i zapamiętany: nagłówek pyta o niego raz, a każdy inline `<script>`
	 * musi dostać DOKŁADNIE tę samą wartość.
	 */
	public static function csp_nonce(): string {
		if ( null === self::$nonce ) {
			try {
				self::$nonce = base64_encode( random_bytes( 16 ) );
			} catch ( Throwable $e ) {
				self::$nonce = base64_encode( (string) wp_generate_password( 22, false ) );
			}
		}
		return self::$nonce;
	}

	/**
	 * Dokłada nonce do KAŻDEGO `<script>`, który WordPress/WooCommerce
	 * emitują przez swój interfejs — inline (`_before`/`_after`/`_extra`,
	 * emoji) i zewnętrzny (`src`).
	 *
	 * TYLKO NA FRONCIE: CSP wysyłamy poza wp-admin, więc i nonce jest tam
	 * potrzebny. Filtry biegną przy DRUKU tagu, długo po `send_headers`,
	 * ale `csp_nonce()` oddaje tę samą, zapamiętaną wartość.
	 *
	 * Surowych `<script>` motywu (guard hydracji) te filtry NIE dotykają —
	 * motyw echouje je z pominięciem interfejsu, dlatego guard obejmuje
	 * hash, a nasze JSON-LD (`Aai_Sklep_Seo`) — patrz `podpisz_seo()`.
	 */
	private static function podpisz_skrypty(): void {
		$dodaj = static function ( $atrybuty ) {
			if ( is_array( $atrybuty ) && ! is_admin() ) {
				$atrybuty['nonce'] = self::csp_nonce();
			}
			return $atrybuty;
		};
		add_filter( 'wp_inline_script_attributes', $dodaj );
		add_filter( 'wp_script_attributes', $dodaj );
	}

	/**
	 * Docelowa polityka CSP, na razie RAPORTOWANA, nie egzekwowana.
	 *
	 * Każdy człon oparty na pomiarze realnych stron (audyt 2026-08-31):
	 *   - `script-src 'self'` — wszystkie enqueued `<script src>` są
	 *     same-origin (zero hostów zewnętrznych). BEZ `strict-dynamic`,
	 *     bo statyczne `<script src>` rdzenia/Woo są wtedy ignorowane
	 *     i polityka wywaliłaby cały front. Inline skrypty rdzenia/Woo
	 *     obejmiemy NONCE'em (przez `wp_inline_script_attributes`) na etapie
	 *     egzekwowania; surowy skrypt motywu — HASHEM (poniżej);
	 *     `'inline-speculation-rules'` przepuszcza prefetch motywu.
	 *   - `style-src 'unsafe-inline'` — KONIECZNE i zmierzone: front ma
	 *     15–23 atrybuty `style=` na stronę, a atrybutów nie da się
	 *     onnonceować. To ta sama granica, którą projekt zna z prototypu.
	 *   - `img-src 'self' data:` — obrazy własne; `data:` pod ikony/miniatury.
	 *   - `connect-src 'self'` — Store API i beacon idą do własnego origin.
	 *   - `frame-src 'none'` — front nie osadza ani jednej ramki (zmierzone).
	 *     Wejdzie przy prawdziwej bramce płatności (Tpay/PayU) — świadomie.
	 *   - `object-src 'none'`, `base-uri 'self'`, `form-action 'self'` —
	 *     zamki bez kosztu (nic tego nie używa inaczej).
	 *
	 * NA ETAPIE REPORT-ONLY inline skrypty NIE mają jeszcze nonce'a, więc
	 * przeglądarka zaraportuje je wszystkie — i o to chodzi: raport jest
	 * KOMPLETNĄ listą tego, co trzeba objąć nonce'em/hashem przed
	 * egzekwowaniem. Nic się przy tym nie psuje, bo Report-Only nie blokuje.
	 */
	private static function csp_regula(): string {
		$czlony = array(
			"default-src 'self'",
			"script-src 'self' 'nonce-" . self::csp_nonce() . "' '" . self::HASH_SKRYPTU_MOTYWU . "' '" . self::HASH_WC_NO_JS . "' 'inline-speculation-rules'",
			"style-src 'self' 'unsafe-inline'",
			"img-src 'self' data:",
			"font-src 'self'",
			"connect-src 'self'",
			"frame-src 'none'",
			"frame-ancestors 'self'",
			"object-src 'none'",
			"base-uri 'self'",
			"form-action 'self'",
			// KOLEKTOR: przeglądarka odsyła tu każde naruszenie. `report-uri`
			// jest przestarzałe, ale wspierane szeroko i najprostsze;
			// `report-to` dołożymy, gdy witryna dostanie HTTPS (wymaga
			// osobnego nagłówka `Reporting-Endpoints`). To jedyny powód,
			// dla którego CSP jest teraz Report-Only i coś raportuje.
			'report-uri ' . admin_url( 'admin-post.php?action=' . self::RAPORT_AKCJA ),
		);
		return implode( '; ', $czlony );
	}

	/* ————————————————————————— kolektor CSP ————————————————————————— */

	/**
	 * Przyjmuje raport naruszenia CSP z przeglądarki i AGREGUJE go.
	 *
	 * ETAP OBSERWACJI. Póki polityka jest Report-Only, przeglądarka niczego
	 * nie blokuje, tylko melduje tutaj, co ZABLOKOWAŁABY po włączeniu
	 * egzekwowania. Zbieramy to, żeby zobaczyć KOMPLET rzeczy do objęcia
	 * nonce'em/hashem, zanim przełączymy nagłówek na egzekwujący.
	 *
	 * BEZPIECZEŃSTWO ENDPOINTU (ten sam rygor co beacon monitoringu):
	 *   - ciało czytane STRUMIENIEM z sufitem — publiczny endpoint nie ma
	 *     prawa wciągnąć do pamięci dowolnego ładunku;
	 *   - rate-limit po adresie (miękki, transient) — kolektor to nie miejsce
	 *     na wzmacniacz;
	 *   - przechowujemy AGREGAT (dyrektywa+zasób → licznik), nie surowe
	 *     raporty, z twardym sufitem liczby rodzajów — zero puchnięcia bazy
	 *     i zero danych osobowych;
	 *   - odpowiadamy 204 i cisza, cokolwiek się stało — brak sondy.
	 */
	public static function zbierz_raport(): void {
		try {
			self::przyjmij_raport();
		} catch ( Throwable $e ) {
			// Kolektor nie ma prawa niczego ujawnić ani wywrócić — nawet
			// siebie. Ślad zostaje w logu serwera, nie w odpowiedzi.
			error_log( 'aai-obwod: raport CSP nie zapisany: ' . $e->getMessage() ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
		}
		status_header( 204 );
		exit;
	}

	/**
	 * Właściwa obsługa raportu — każdy `return` to cichy odrzut.
	 */
	private static function przyjmij_raport(): void {
		// Rate-limit: najwyżej 60 raportów na minutę z adresu. Klucz jako
		// skrót — pełne IP nie trafia nigdzie (kolektor jest anonimowy).
		$adres = isset( $_SERVER['REMOTE_ADDR'] ) ? (string) $_SERVER['REMOTE_ADDR'] : '';
		if ( '' !== $adres ) {
			$klucz = 'aai_obwod_csp_' . substr( md5( $adres ), 0, 16 );
			$ile   = (int) get_transient( $klucz );
			if ( $ile >= 60 ) {
				return;
			}
			set_transient( $klucz, $ile + 1, MINUTE_IN_SECONDS );
		}

		// Ciało strumieniem, z sufitem.
		$dl = isset( $_SERVER['CONTENT_LENGTH'] ) ? (int) $_SERVER['CONTENT_LENGTH'] : 0;
		if ( $dl > self::RAPORT_SUFIT_B ) {
			return;
		}
		$uchwyt = fopen( 'php://input', 'r' );
		if ( false === $uchwyt ) {
			return;
		}
		$cialo = (string) fread( $uchwyt, self::RAPORT_SUFIT_B + 1 );
		fclose( $uchwyt );
		if ( strlen( $cialo ) > self::RAPORT_SUFIT_B ) {
			return;
		}

		$dane = json_decode( $cialo, true, 6 );
		// Format `report-uri`: { "csp-report": { ... } }.
		$raport = is_array( $dane ) && isset( $dane['csp-report'] ) && is_array( $dane['csp-report'] )
			? $dane['csp-report']
			: ( is_array( $dane ) ? $dane : null );
		if ( null === $raport ) {
			return;
		}

		$dyrektywa = (string) ( $raport['violated-directive'] ?? $raport['effective-directive'] ?? '' );
		$zasob     = (string) ( $raport['blocked-uri'] ?? '' );
		if ( '' === $dyrektywa ) {
			return;
		}

		// Klucz agregatu: dyrektywa + zasób (bez query, żeby nie mnożyć
		// wierszy sygnaturami). „inline"/„eval" zostają jak są.
		$zasob_krotki = '' === $zasob ? 'inline' : self::skroc_zasob( $zasob );
		self::dopisz_do_agregatu( $dyrektywa . ' | ' . $zasob_krotki );
	}

	/**
	 * Skraca `blocked-uri` do schematu+hosta+ścieżki, bez query i fragmentu.
	 *
	 * @param string $zasob Adres z raportu.
	 */
	private static function skroc_zasob( string $zasob ): string {
		$zasob = substr( $zasob, 0, 200 );
		$czesci = wp_parse_url( $zasob );
		if ( ! is_array( $czesci ) || ! isset( $czesci['host'] ) ) {
			// „inline", „eval", „data" i podobne słowa kluczowe — zostają.
			return $zasob;
		}
		return ( $czesci['scheme'] ?? 'https' ) . '://' . $czesci['host'] . ( $czesci['path'] ?? '' );
	}

	/**
	 * Dopisuje jedno naruszenie do agregatu w opcji, z sufitem rodzajów.
	 *
	 * @param string $klucz Dyrektywa + zasób.
	 */
	private static function dopisz_do_agregatu( string $klucz ): void {
		$agregat = get_option( self::RAPORT_OPCJA );
		if ( ! is_array( $agregat ) ) {
			$agregat = array();
		}
		if ( isset( $agregat[ $klucz ] ) ) {
			$agregat[ $klucz ]['ile']      = (int) $agregat[ $klucz ]['ile'] + 1;
			$agregat[ $klucz ]['ostatnie'] = time();
		} elseif ( count( $agregat ) < self::RAPORT_MAX_RODZAJOW ) {
			$agregat[ $klucz ] = array(
				'ile'      => 1,
				'pierwsze' => time(),
				'ostatnie' => time(),
			);
		} else {
			// Sufit rodzajów osiągnięty — nie rośniemy w nieskończoność.
			// Nowy, nieznany rodzaj przepada, znane dalej się liczą.
			return;
		}
		update_option( self::RAPORT_OPCJA, $agregat, false );
	}

	/**
	 * Agregat naruszeń — dla przyszłego ekranu/strażnika (czysty odczyt).
	 *
	 * @return array<string,array<string,int>>
	 */
	public static function raport_csp(): array {
		$agregat = get_option( self::RAPORT_OPCJA );
		return is_array( $agregat ) ? $agregat : array();
	}
}

Aai_Obwod::zarejestruj();
