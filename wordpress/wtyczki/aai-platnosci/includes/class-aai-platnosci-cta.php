<?php
/**
 * Przycisk zakupu w czterech stanach.
 *
 * Sklep kursów (Plugin 1) nie wie nic o płatnościach — pyta więc filtrem
 * `aai_sklep_cta_kursu`, a odpowiada ta klasa. Bez tej wtyczki przycisk
 * prowadzi do kontaktu, dokładnie jak przez cały krok W1–W6.
 *
 * CZTERY STANY (trzy z planu kroku i jeden, który wyszedł z pomiaru E5):
 *
 *  1. SPRZEDAŻ ZAMKNIĘTA → kontakt. Tak jest do kroku P4: silnik stoi na
 *     WooCommerce, ale zakup blokuje filtr koszyka, bo dostarczania (konta
 *     i maila) jeszcze nie ma. Przycisk prowadzący do kasy obiecywałby
 *     zakup, którego nie da się dokończyć.
 *  2. KLIENT MA JUŻ TEN KURS → „Moje kursy". Pytamy Tutora o ZAPIS, a nie
 *     o dostęp: `dostep` jest prawdziwy także dla lekcji-zapowiedzi i dla
 *     administratora, więc pokazywałby „Przejdź do kursu" komuś, kto nic
 *     nie kupił (ta sama pułapka co przy strzałce „wróć" w kroku W6).
 *  3. ZAMÓWIENIE CZEKA NA WPŁATĘ → „Moje kursy" z innym napisem. Stan
 *     REALNY, nie hipotetyczny: przy przelewie zamówienie stoi na `on-hold`,
 *     a zapis Tutora ma wtedy status `on-hold` i dostępu nie daje
 *     (zmierzone, KROK-P3B.md §3). Bez tego stanu klient, który właśnie
 *     zamówił kurs przelewem, widziałby zachętę „Dołączam za 299 zł"
 *     i mógł zamówić drugi raz.
 *  4. ZAKUP → prosto do kasy z produktem w koszyku (decyzja właściciela
 *     2026-08-26: „przycisk prosto do kasy", bez etapu koszyka).
 *
 * @package Aai_Platnosci
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Stany przycisku zakupu.
 */
final class Aai_Platnosci_Cta {

	/**
	 * Podpina filtr Pluginu 1.
	 */
	public static function zarejestruj(): void {
		add_filter( 'aai_sklep_cta_kursu', array( self::class, 'stan' ), 10, 2 );
		/*
		 * TEN SAM warunek, dwa wyrazy: przycisk dla człowieka i dostępność
		 * oferty dla wyszukiwarki. Oba pytają `produkt_do_kupienia()`, więc
		 * strona mówiąca „kup teraz" nie może jednocześnie deklarować
		 * `PreOrder` — ani odwrotnie (K2 z krytyki P0).
		 */
		add_filter( 'aai_sklep_dostepnosc_kursu', array( self::class, 'dostepnosc' ), 10, 2 );
	}

	/**
	 * Dostępność oferty w danych strukturalnych.
	 *
	 * NIE PYTA O OGLĄDAJĄCEGO, bo dane strukturalne czyta robot — a on jest
	 * gościem. Stan „mam już ten kurs" dotyczy jednego człowieka i nie ma
	 * prawa zmieniać opisu oferty dla wszystkich.
	 *
	 * @param mixed               $domyslna Wartość Pluginu 1 (`PreOrder`).
	 * @param array<string,mixed> $kurs     Kurs z warstwy odczytu.
	 * @return string
	 */
	public static function dostepnosc( $domyslna, $kurs = array() ): string {
		$domyslna = is_string( $domyslna ) && '' !== $domyslna
			? $domyslna
			: 'https://schema.org/PreOrder';
		try {
			if ( ! is_array( $kurs ) ) {
				return $domyslna;
			}
			$uuid = (string) ( $kurs['id'] ?? '' );
			if ( '' === $uuid || null === self::produkt_do_kupienia( $uuid ) ) {
				return $domyslna;
			}
			return 'https://schema.org/InStock';
		} catch ( Throwable $e ) {
			Aai_Platnosci_Komunikaty::zapisz( 'przy ustalaniu dostępności oferty: ' . $e->getMessage() );
			return $domyslna;
		}
	}

	/**
	 * Id produktu, który da się KUPIĆ TERAZ — albo `null`.
	 *
	 * Jedno miejsce, w którym mieszka odpowiedź na pytanie „czy zakup jest
	 * dziś możliwy": sprzedaż otwarta, produkt istnieje i jest opublikowany.
	 * `draft` znaczy, że szew zdjął kurs ze sprzedaży (kurs szkic, cena 0,
	 * kurs usunięty) — wtedy przycisk do kasy prowadziłby donikąd.
	 *
	 * @param string $uuid Uuid kursu.
	 * @return int|null
	 */
	private static function produkt_do_kupienia( string $uuid ): ?int {
		if ( ! Aai_Platnosci_Ustawienia::sprzedaz_otwarta() ) {
			return null;
		}
		if ( ! function_exists( 'wc_get_product' ) || ! function_exists( 'wc_get_checkout_url' ) ) {
			return null;
		}
		$produkt_id = Aai_Platnosci_Zapis::produkt_kursu( $uuid );
		if ( null === $produkt_id ) {
			return null;
		}
		$produkt = wc_get_product( $produkt_id );
		if ( ! $produkt instanceof WC_Product || 'publish' !== $produkt->get_status() ) {
			return null;
		}
		return (int) $produkt_id;
	}

	/**
	 * Adres i napis przycisku dla tego kursu i tego oglądającego.
	 *
	 * @param array{adres:string,napis:string} $domyslne Stan bez płatności (kontakt).
	 * @param array<string,mixed>              $kurs     Kurs z warstwy odczytu Pluginu 1.
	 * @return array{adres:string,napis:string}
	 */
	public static function stan( $domyslne, $kurs = array() ): array {
		if ( ! is_array( $domyslne ) ) {
			$domyslne = array( 'adres' => '', 'napis' => '' );
		}
		try {
			if ( ! is_array( $kurs ) ) {
				return $domyslne;
			}
			$uuid = (string) ( $kurs['id'] ?? '' );
			if ( '' === $uuid ) {
				return $domyslne;
			}

			// Stan 2 i 3 dotyczą KONKRETNEGO oglądającego, więc mają sens
			// tylko dla zalogowanego — i tylko wtedy, gdy kurs ma kopię
			// w Tutorze, bo to jego zapisów pytamy.
			$kurs_tutora = Aai_Platnosci_Zapis::kurs_tutora( $uuid );
			$user_id     = get_current_user_id();
			if ( null !== $kurs_tutora && $user_id > 0 && function_exists( 'tutor_utils' ) ) {
				$stan_klienta = self::stan_klienta( $kurs_tutora, $user_id );
				if ( null !== $stan_klienta ) {
					return $stan_klienta;
				}
			}

			/*
			 * Stan 1 (sprzedaż zamknięta) i stan 4 (zakup) rozstrzyga jedno
			 * pytanie: czy da się to dziś kupić. Brak produktu też tu wpada —
			 * znaczy, że szew jeszcze nie zdążył (albo nie mógł) go założyć,
			 * a przycisk do kasy prowadziłby donikąd.
			 */
			$produkt_id = self::produkt_do_kupienia( $uuid );
			if ( null === $produkt_id ) {
				return $domyslne;
			}

			/*
			 * `?add-to-cart=` NA ADRESIE KASY — to natywny sposób WooCommerce
			 * na „kup teraz": produkt wpada do koszyka przy wczytaniu strony,
			 * a klient od razu widzi formularz płatności. Osobna trasa
			 * „dodaj i przekieruj" byłaby własną kasą, a tej nie piszemy.
			 */
			return array(
				'adres' => add_query_arg( 'add-to-cart', (int) $produkt_id, wc_get_checkout_url() ),
				'napis' => (string) $domyslne['napis'],
			);
		} catch ( Throwable $e ) {
			// Niezmiennik 17: przycisk nie może wywrócić strony sprzedażowej.
			// Stan domyślny (kontakt) jest zawsze bezpieczny — prowadzi do
			// człowieka, a nie do kasy, której stanu nie umieliśmy ustalić.
			Aai_Platnosci_Komunikaty::zapisz( 'przy ustalaniu stanu przycisku: ' . $e->getMessage() );
			return $domyslne;
		}
	}

	/**
	 * Stan wynikający z tego, co ten klient już ma — albo `null`, gdy nie ma nic.
	 *
	 * @param int $kurs_tutora Id wpisu kursu w Tutorze.
	 * @param int $user_id     Id oglądającego.
	 * @return array{adres:string,napis:string}|null
	 */
	private static function stan_klienta( int $kurs_tutora, int $user_id ): ?array {
		// Trzeci argument `true` = wyłącznie zapis UKOŃCZONY, czyli realny
		// dostęp do materiału.
		if ( tutor_utils()->is_enrolled( $kurs_tutora, $user_id, true ) ) {
			return array(
				'adres' => Aai_Sklep_Moje::adres(),
				'napis' => 'Przejdź do kursu',
			);
		}
		// Trzeci argument `false` = zapis w DOWOLNYM statusie. Istnieje, choć
		// dostępu nie ma — czyli zamówienie zostało złożone i czeka
		// (`pending`, `on-hold`, `processing`).
		if ( tutor_utils()->is_enrolled( $kurs_tutora, $user_id, false ) ) {
			return array(
				'adres' => Aai_Sklep_Moje::adres(),
				'napis' => 'Zamówienie w toku',
			);
		}
		return null;
	}
}
