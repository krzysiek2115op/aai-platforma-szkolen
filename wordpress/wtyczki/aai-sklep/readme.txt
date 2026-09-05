=== Automatic AI — Sklep z kursami ===
Contributors: automaticai
Requires at least: 6.9
Tested up to: 6.9
Requires PHP: 8.1
Stable tag: 0.8.0
License: MIT
License URI: https://opensource.org/licenses/MIT

Katalog /szkolenia, strony sprzedażowe kursów i kreator treści dla strony Automatic AI.

== Description ==

Pierwsza z trzech wtyczek Automatic AI. Odpowiada za to, co jest wkładem
własnym projektu: katalog kursów, strony sprzedażowe i kreator treści
(program, dwanaście rodzajów sekcji sprzedażowych, treść lekcji, audyt zmian).

Świadomie NIE robi rzeczy, które gotowe wtyczki mają z pudełka:
sprzedaż i faktury bierze WooCommerce, konta i dostęp do materiału Tutor LMS.

== Wymagania ==

* WordPress 6.9+, PHP 8.1+
* motyw Automatic AI (wtyczka dopasowuje się do niego, ale działa też na innych)
* WooCommerce i Tutor LMS — dopiero przy sprzedaży i dostępie do materiału

== Changelog ==

Numeruje WERSJĘ WTYCZKI (stała `AAI_SKLEP_WERSJA` w pliku głównym), a nie
wersję projektu — o tej mówi `CHANGELOG.md` w korzeniu repozytorium.

= 0.6.0 =
* Kopia kursu w Tutorze odświeżana po KAŻDYM udanym zapisie, z kontrolą
  rozjazdu (`wp aai-sklep sprawdz-tutora`).
* Widok kupionej lekcji w NASZYM szablonie, nie w Tutorowym: skład Markdownu
  w PHP, zrzuty z biblioteki mediów, „Moje kursy" i bramka logowania.

= 0.5.0 =
* Kreator treści w kokpicie WordPressa: lista kursów z licznikami, edytor
  kursu (Kurs / Sekcje / Program) z jednym zapisem i osobny edytor treści
  lekcji. Do bazy pisze wyłącznie warstwa zapisu.

= 0.4.0 =
* Front z własnych tabel: katalog `/szkolenia`, strony sprzedażowe
  `/szkolenia/<slug>`, pozycja „Szkolenia" w menu motywu oraz przekierowania
  `/courses/…` na nasz jedyny adres kanoniczny.

= 0.3.0 =
* Warstwa integracji Tutor ↔ motyw Automatic AI: odstęp pod nagłówek,
  paleta i naprawa kolizji klas między warstwami kaskady.

= 0.2.0 =
* Warstwa zapisu (transakcje, dziennik audytu, ochrona napisanej treści)
  i import kursów z prototypu: `wp aai-sklep import|sprawdz|usun`.

= 0.1.0 =
* Szkielet wtyczki i schemat tabel (port bazy `db1_kursy` z prototypu Next.js).
