=== Automatic AI — Sklep z kursami ===
Contributors: automaticai
Requires at least: 6.5
Tested up to: 6.9
Requires PHP: 8.1
Stable tag: 0.3.0
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

* WordPress 6.5+, PHP 8.1+
* motyw Automatic AI (wtyczka dopasowuje się do niego, ale działa też na innych)
* WooCommerce i Tutor LMS — dopiero przy sprzedaży i dostępie do materiału

== Changelog ==

= 0.3.0 =
* Warstwa integracji Tutor ↔ motyw Automatic AI: odstęp pod nagłówek,
  paleta i naprawa kolizji klas między warstwami kaskady.

= 0.2.0 =
* Warstwa zapisu (transakcje, dziennik audytu, ochrona napisanej treści)
  i import kursów z prototypu: `wp aai-sklep import|sprawdz|usun`.

= 0.1.0 =
* Szkielet wtyczki i schemat tabel (port bazy `db1_kursy` z prototypu Next.js).
