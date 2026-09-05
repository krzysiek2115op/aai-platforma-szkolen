<?php
/**
 * Co ten człowiek ma z tym kursem — jedno źródło tej decyzji.
 *
 * DLACZEGO OSOBNA KLASA, A NIE METODA PRZYCISKU (AUD-ARCH-F1-003).
 * Do 0.65.0 decyzja mieszkała w `Aai_Platnosci_Cta`, a pytali o nią trzej:
 * przycisk na stronie kursu, blokada drugiego zakupu w `Ustawienia` i szew,
 * licząc zamówienia w drodze. Powstawał przez to CYKL: `Cta` pytał
 * `Ustawienia` o to, czy sprzedaż jest otwarta, a `Ustawienia` pytały `Cta`
 * o stan posiadania. Cykl nie dawał usterki w działaniu — dawał coś gorszego
 * na dłuższą metę: nie da się wyłączyć ani przetestować jednej z tych klas
 * bez drugiej, a każda zmiana w przycisku dotyka ścieżki pieniędzy.
 *
 * Ta klasa jest LIŚCIEM: nie zna ani jednej klasy tej wtyczki. Pyta wyłącznie
 * Tutora i WordPressa, więc wolno ją wołać z każdej warstwy.
 *
 * ZAKRES SIĘ NIE ZMIENIŁ — to przeniesienie co do znaku, razem z komentarzami,
 * które tłumaczą, dlaczego pytamy o STATUS zapisu, a nie o samo jego
 * istnienie. Tamten powód jest zmierzoną usterką produkcyjną (przegląd P3b),
 * nie ostrożnością.
 *
 * @package Aai_Platnosci
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Stan posiadania kursu przez konkretnego człowieka.
 */
final class Aai_Platnosci_Posiadanie {

	/**
	 * Statusy zapisu, przy których zamówienie NAPRAWDĘ jeszcze trwa.
	 *
	 * Tutor nadpisuje status zapisu statusem ZAMÓWIENIA
	 * (`WooCommerce::enrolled_courses_status_change()` → `course_enrol_status_change()`),
	 * więc lista jest listą statusów WooCommerce, a nie trzech stałych Tutora.
	 * `pending` jest też stanem, który nadaje `do_enroll()` kursowi płatnemu
	 * ZANIM zamówienie zostanie opłacone.
	 *
	 * PUBLICZNA, bo „w drodze" ma w tej wtyczce jedną definicję: pyta o nią
	 * także szew, licząc zamówienia zagrożone usunięciem kursu. Dwie osobne
	 * listy tych samych trzech nazw rozjechałyby się przy pierwszej zmianie.
	 */
	public const ZAMOWIENIE_TRWA = array( 'pending', 'on-hold', 'processing' );

	/**
	 * Stany posiadania kursu przez konkretnego człowieka.
	 */
	public const MA_KURS = 'ma';
	public const W_TOKU  = 'w_toku';

	/**
	 * Co ten człowiek ma z tym kursem: nic, dostęp, albo trwające zamówienie.
	 *
	 * JEDNO ŹRÓDŁO TEJ DECYZJI (krok P4). Pyta o nią przycisk na stronie
	 * ORAZ blokada koszyka — a dwie kopie tego samego warunku to zawsze
	 * możliwy rozjazd: przycisk mówiłby „Przejdź do kursu", a koszyk
	 * przyjmowałby zakup tego samego kursu drugi raz.
	 *
	 * @param int $kurs_tutora Id wpisu kursu w Tutorze.
	 * @param int $user_id     Id człowieka.
	 * @return string '' | self::MA_KURS | self::W_TOKU
	 */
	public static function stan_posiadania( int $kurs_tutora, int $user_id ): string {
		if ( $kurs_tutora <= 0 || $user_id <= 0 || ! function_exists( 'tutor_utils' ) ) {
			return '';
		}
		// Trzeci argument `true` = wyłącznie zapis UKOŃCZONY, czyli realny
		// dostęp do materiału.
		if ( tutor_utils()->is_enrolled( $kurs_tutora, $user_id, true ) ) {
			return self::MA_KURS;
		}

		/*
		 * ZAPIS ISTNIEJE, ALE NIE DAJE DOSTĘPU — i tu trzeba zapytać O JEGO
		 * STATUS, a nie poprzestać na samym istnieniu.
		 *
		 * DLACZEGO: Tutor tworzy zapis JUŻ przy składaniu zamówienia i nigdy
		 * go nie kasuje — anulowanie albo zwrot tylko przestawia mu status na
		 * `cancelled` / `refunded`. Wersja pytająca wyłącznie „czy zapis
		 * istnieje" pokazywała więc „Zamówienie w toku” KLIENTOWI, KTÓREGO
		 * ZAMÓWIENIE ANULOWANO — na zawsze, bez możliwości kupienia jeszcze
		 * raz. Zmierzone na `:8892` przy przeglądzie P3b: zamówienie
		 * przestawione na `cancelled` zostawiało zapis `cancelled`, a przycisk
		 * zakupu znikał bezpowrotnie.
		 *
		 * `is_enrolled()` nie oddaje statusu w swoim SELECT-cie, ale oddaje
		 * `ID` wpisu — status czytamy więc WordPressem, zamiast pisać własne
		 * zapytanie do cudzej tabeli.
		 */
		$zapis = tutor_utils()->is_enrolled( $kurs_tutora, $user_id, false );
		if ( is_object( $zapis ) && isset( $zapis->ID ) ) {
			$status = (string) get_post_status( (int) $zapis->ID );
			if ( in_array( $status, self::ZAMOWIENIE_TRWA, true ) ) {
				return self::W_TOKU;
			}
		}
		return '';
	}
}
