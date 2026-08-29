<?php
/**
 * Poczta środowiska roboczego — WYŁĄCZNIE warsztat, nigdy produkcja.
 *
 * Plik NIE NALEŻY DO ŻADNEJ WTYCZKI. Montuje go `compose.yml` do
 * `wp-content/mu-plugins/` instancji na `127.0.0.1:8892` i tylko tam działa.
 *
 * PO CO. Zmierzone przy E0 kroku P4: `wp_mail()` w tym środowisku **pada**
 * po obu stronach — kontener `wordpress` nie ma w ogóle `/usr/sbin/sendmail`
 * („Could not instantiate mail function"), a kontener `cli` ma sendmaila
 * busyboksa bez serwera („can't connect to remote host"). Cały łańcuch
 * dostarczenia Pluginu 2 (konto → link do hasła → dostęp do kursu) byłby
 * więc nie do sprawdzenia: ani smoke nie miałby czego przeczytać, ani
 * właściciel czego zobaczyć w teście ręcznym.
 *
 * CO ROBI. Przestawia PHPMailer WordPressa na SMTP Mailpita (kontener
 * `mailpit`, port 1025). Mailpit niczego nie wysyła dalej — łapie
 * wiadomość i pokazuje ją na `http://127.0.0.1:8893` oraz przez API
 * (`/api/v1/messages`), z którego czytają nasze smoke'i.
 *
 * DLACZEGO `phpmailer_init`, A NIE `pre_wp_mail`. `pre_wp_mail` przerywa
 * wysyłkę i podstawia własną odpowiedź — mierzylibyśmy wtedy własną
 * atrapę zamiast tego, co NAPRAWDĘ wychodzi z WordPressa (nagłówki,
 * typ treści, wersja tekstowa, kodowanie). Tu wiadomość przechodzi całą
 * drogę przez PHPMailer i dopiero na końcu ląduje w łapaczu.
 *
 * @package Aai_Warsztat
 */

defined( 'ABSPATH' ) || exit;

add_action(
	'phpmailer_init',
	static function ( $mailer ): void {
		$mailer->isSMTP();
		$mailer->Host        = 'mailpit';
		$mailer->Port        = 1025;
		$mailer->SMTPAuth    = false;
		// Mailpit nie ma certyfikatu, a PHPMailer sam próbuje STARTTLS,
		// gdy serwer je ogłosi — bez tego wysyłka pada na weryfikacji.
		$mailer->SMTPAutoTLS = false;
		$mailer->SMTPSecure  = '';
		$mailer->Timeout     = 5;
	}
);
