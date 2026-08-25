<?php
/**
 * Import kursów z prototypu (PostgreSQL) do tabel wtyczki.
 *
 * DROGA DANYCH. `tools/eksport-wp.mjs` w prototypie oddaje wierny zrzut
 * tabel (format 2: nazwa pola = nazwa kolumny), a ten plik kładzie go
 * wiersz na wiersz przez `Aai_Sklep_Zapis`. Nic po drodze się nie mapuje,
 * więc nie ma gdzie zgubić pola.
 *
 * DLACZEGO JSON, A NIE ZRZUT SQL. Zrzut wiąże się z prefiksem tabel,
 * kolejnością identyfikatorów i wersją silnika; przy pierwszej
 * rozbieżności wysypuje się w środku i zostawia bazę w połowie. JSON jest
 * formatem pośrednim, a wykłada go kod, który zna nasze reguły: transakcje,
 * audyt i ochronę napisanej treści.
 *
 * IDEMPOTENCJA. Klucz to `id` (uuid) — ten sam po obu stronach migracji,
 * bo kolumna w MySQL jest `char(36)`, a nie autonumerem. Powtórny import
 * niczego nie duplikuje i niczego nie nadpisuje bez zmiany: wiersz
 * identyczny nie dostaje nawet `UPDATE`-a, więc dziennik audytu nie rośnie.
 * To czyni z dziennika ŚWIADKA idempotencji, nie tylko jej opis.
 *
 * @package Aai_Sklep
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

/**
 * Wykładanie paczki z eksportu do tabel.
 */
final class Aai_Sklep_Import {

	/**
	 * Wersja formatu, którą ten kod rozumie.
	 *
	 * Nieznaną odrzucamy, zamiast zgadywać: format 1 miał kształt pod
	 * Tutora (inne nazwy pól, statusy przemapowane), więc wczytany „na
	 * ślepo" wpisałby do naszych tabel dane w cudzym słowniku.
	 */
	public const WERSJA_FORMATU = 2;

	/**
	 * Kolumny, bez których kurs nie ma sensu — brak któregoś znaczy, że
	 * to nie jest nasz eksport, i lepiej stanąć niż wpisać śmieci.
	 */
	private const WYMAGANE_POLA_KURSU = array( 'id', 'slug', 'title', 'type', 'price_grosze', 'status' );

	/**
	 * Import z pliku.
	 *
	 * @param string $sciezka Ścieżka do pliku JSON z eksportu.
	 * @param string $aktor   Kto importuje (idzie do dziennika audytu).
	 * @param bool   $pozwol  Zgoda na skasowanie lekcji z napisaną treścią.
	 *
	 * @return array{liczniki:array<string,int>,kursy:array<int,array<string,mixed>>,tutor:array<string,int>}
	 *
	 * @throws Aai_Sklep_Blad_Zapisu Gdy pliku nie da się wczytać albo ma obcy format.
	 */
	public static function z_pliku( string $sciezka, string $aktor, bool $pozwol = false ): array {
		if ( ! is_readable( $sciezka ) ) {
			throw new Aai_Sklep_Blad_Zapisu( sprintf( 'nie mogę odczytać pliku: %s', $sciezka ) );
		}
		$surowe = file_get_contents( $sciezka ); // phpcs:ignore WordPress.WP.AlternativeFunctions
		if ( false === $surowe ) {
			throw new Aai_Sklep_Blad_Zapisu( sprintf( 'nie mogę odczytać pliku: %s', $sciezka ) );
		}
		$paczka = json_decode( $surowe, true );
		if ( ! is_array( $paczka ) ) {
			throw new Aai_Sklep_Blad_Zapisu( sprintf( 'plik %s nie jest poprawnym JSON-em', $sciezka ) );
		}
		return self::z_paczki( $paczka, $aktor, $pozwol );
	}

	/**
	 * Import z gotowej struktury.
	 *
	 * @param array<string,mixed> $paczka Zawartość pliku eksportu.
	 * @param string              $aktor  Kto importuje.
	 * @param bool                $pozwol Zgoda na skasowanie lekcji z treścią.
	 *
	 * @return array{liczniki:array<string,int>,kursy:array<int,array<string,mixed>>,tutor:array<string,int>}
	 *
	 * @throws Aai_Sklep_Blad_Zapisu Gdy paczka ma obcy format albo brakuje jej pól.
	 */
	public static function z_paczki( array $paczka, string $aktor, bool $pozwol = false ): array {
		$wersja = isset( $paczka['wersja_formatu'] ) ? (int) $paczka['wersja_formatu'] : 0;
		if ( self::WERSJA_FORMATU !== $wersja ) {
			throw new Aai_Sklep_Blad_Zapisu(
				sprintf(
					'nieznana wersja formatu: %d (ten kod zna %d). Wygeneruj eksport na nowo: node --env-file=.env tools/eksport-wp.mjs',
					$wersja,
					self::WERSJA_FORMATU
				)
			);
		}
		if ( ! isset( $paczka['kursy'] ) || ! is_array( $paczka['kursy'] ) ) {
			throw new Aai_Sklep_Blad_Zapisu( 'paczka nie ma klucza `kursy`' );
		}

		$razem = array(
			'utworzone'      => 0,
			'zaktualizowane' => 0,
			'bez_zmian'      => 0,
			'usuniete'       => 0,
		);
		$kursy = array();

		/*
		 * KOPIA DO TUTORA IDZIE RAZ NA KURS, NA KOŃCU.
		 *
		 * Zapis każdego kursu ogłasza zmianę, a import zapisuje kurs po
		 * kursie — bez tej blokady kopia jechałaby po każdym z nich w środku
		 * pętli i przy powtórnym imporcie liczyłaby tę samą pracę dwa razy.
		 * `finally` jest tu warunkiem poprawności, nie ostrożnością: bez
		 * niego wyjątek w połowie importu zostawiłby synchronizację
		 * wstrzymaną do końca życia procesu.
		 */
		Aai_Sklep_Tutor::wstrzymaj();

		try {
			foreach ( $paczka['kursy'] as $kurs ) {
				if ( ! is_array( $kurs ) ) {
					throw new Aai_Sklep_Blad_Zapisu( 'pozycja w `kursy` nie jest obiektem' );
				}
				foreach ( self::WYMAGANE_POLA_KURSU as $pole ) {
					if ( ! array_key_exists( $pole, $kurs ) ) {
						throw new Aai_Sklep_Blad_Zapisu(
							sprintf( 'kurs bez wymaganego pola `%s` — to nie jest eksport formatu %d', $pole, self::WERSJA_FORMATU )
						);
					}
				}

				/*
				 * Import nie idzie przez kontrakt panelu (dane są NASZE,
				 * z eksportu prototypu), ale ta jedna zasada musi go
				 * obowiązywać tak samo: slug zajęty przez naszą podstronę
				 * dałby kurs widoczny w katalogu, którego strona
				 * sprzedażowa nie istnieje.
				 */
				if ( in_array( (string) $kurs['slug'], Aai_Sklep_Trasy::zarezerwowane_slugi(), true ) ) {
					throw new Aai_Sklep_Blad_Zapisu(
						sprintf(
							'kurs „%s" ma slug zajęty przez stronę sklepu — jego strona sprzedażowa byłaby nieosiągalna',
							(string) $kurs['slug']
						)
					);
				}

				$liczniki = Aai_Sklep_Zapis::zapisz_kurs( $kurs, $aktor, $pozwol );
				foreach ( $liczniki as $klucz => $ile ) {
					$razem[ $klucz ] += $ile;
				}
				$kursy[] = array(
					'slug'     => (string) $kurs['slug'],
					'liczniki' => $liczniki,
				);
			}
		} finally {
			Aai_Sklep_Tutor::wznow();
		}

		$tutor = array(
			'utworzone'      => 0,
			'zaktualizowane' => 0,
			'bez_zmian'      => 0,
			'usuniete'       => 0,
		);
		if ( Aai_Sklep_Tutor::dostepny() ) {
			foreach ( $paczka['kursy'] as $kurs ) {
				foreach ( Aai_Sklep_Tutor::synchronizuj_kurs( (string) $kurs['id'] ) as $klucz => $ile ) {
					$tutor[ $klucz ] += $ile;
				}
			}
		}

		return array(
			'liczniki' => $razem,
			'kursy'    => $kursy,
			'tutor'    => $tutor,
		);
	}
}
