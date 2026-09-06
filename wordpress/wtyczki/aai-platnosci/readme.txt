=== Automatic AI — Płatności ===
Contributors: automaticai
Requires at least: 6.9
Tested up to: 6.9
Requires PHP: 8.1
Stable tag: 0.6.0
License: MIT
License URI: https://opensource.org/licenses/MIT

Szew między sklepem kursów a WooCommerce i Tutor LMS: produkt z naszej ceny, dostęp i maile po opłacie.

== Description ==

Druga z trzech wtyczek Automatic AI. Jest SZWEM, nie sklepem: własnej kasy,
koszyka ani bramki płatności NIE zawiera i zawierać nie będzie — to ma
WooCommerce z pudełka.

Co robi naprawdę:

* z kursu w tabelach `aai-sklep` robi produkt WooCommerce i pilnuje, żeby
  cena regularna produktu szła z NASZEJ tabeli (jednokierunkowo);
* wiąże produkt z kopią kursu w Tutorze, żeby opłacone zamówienie dawało
  dostęp do materiału, a zwrot go odbierał;
* dostarcza to, o czym nie wie ani WooCommerce, ani Tutor: konto przy
  zakupie oraz dwa maile („Ustaw hasło" i „Twój kurs jest gotowy"), razem
  z dziennikiem, czy klient je DOSTAŁ.

Własne tabele: `powiazania` (kurs ↔ produkt) i `dostawy` (co klient dostał).
Klientów, zamówień i płatności nie duplikujemy — mieszkają w WooCommerce.

== Wymagania ==

* WordPress 6.9+, PHP 8.1+
* wtyczka `aai-sklep` (źródło prawdy o kursie i o cenie katalogowej)
* WooCommerce (koszyk, kasa, faktury) i Tutor LMS (konta, dostęp do materiału)

Bez którejkolwiek z tych zależności wtyczka nie robi nic po cichu: mówi
o tym w kokpicie, a `wp aai-platnosci sprawdz` kończy się kodem różnym od
zera, gdy sklep sprzedaje bez kompletu zależności.

== Komendy WP-CLI ==

* `wp aai-platnosci sync [<slug>]` — zbiorcza naprawa szwu kurs → produkt
* `wp aai-platnosci sprawdz` — kontrola rozjazdu (kod wyjścia 1 = rozjazd)
* `wp aai-platnosci dostawy [--ponow=<id>]` — dziennik dostarczenia
* `wp aai-platnosci sprzedaz otworz|zamknij` — otwarcie i zamknięcie sprzedaży

== Changelog ==

Numeruje WERSJĘ WTYCZKI (stała `AAI_PLATNOSCI_WERSJA` w pliku głównym), a nie
wersję projektu — o tej mówi `CHANGELOG.md` w korzeniu repozytorium. Wersja
wtyczki została nadana przy kroku P1 i przy kolejnych krokach (P2–P6) NIE była
podnoszona, więc historię zmian po fundamencie czyta się z `CHANGELOG.md`
(wersje projektu 0.47.0–0.53.0), a nie stąd.

= 0.6.0 =
* Nagłówek `Requires Plugins: aai-sklep` — WordPress sam odmawia aktywacji
  bez Pluginu 1, zamiast pozwolić przestawić cudze ustawienia i nie założyć
  ani jednego produktu.
* Wgranie STARSZEJ wtyczki na nowszy schemat nie uruchamia starego `dbDelta`.

= 0.5.0 =
* Kontrola przestaje meldować zerem sklep, który sprzedaje bez danych,
  a odinstalowanie nie zostawia flagi otwartej sprzedaży.

= 0.4.0 =
* Powrót Pluginu 1 odzyskuje sprzedaż; uwaga o jego braku gaśnie razem
  z jego powrotem.

= 0.3.0 =
* Podbicie wersji razem z porządkami w dokumentacji projektu (nagłówek
  wtyczki nie był ruszany od jej powstania).

= 0.2.0 =
* Skasowane zamówienie sprząta po sobie księgowość Tutora i notatki
  WooCommerce — wyłącznie przez API obu wtyczek, tylko dla zamówień
  złożonych w całości z kursów i tylko, gdy instruktor nie miał wypłat.
  Kontrola `sprawdz` liczy osierocone wiersze (kod 1), a `sieroty --usun`
  kasuje je po jawnej liście identyfikatorów. Decyzja „co ten klient ma
  z tym kursem" mieszka w klasie-liściu — koniec cyklu zależności między
  przyciskiem zakupu a blokadą koszyka.

= 0.1.0 =
* Fundament: dwie tabele (`powiazania`, `dostawy`), jedyna warstwa zapisu,
  komunikat zamiast białego ekranu przy braku WooCommerce lub Tutora,
  odinstalowanie nie kasujące danych.
