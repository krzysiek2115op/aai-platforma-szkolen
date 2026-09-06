=== Automatic AI — Monitoring ===
Contributors: automaticai
Requires at least: 6.9
Tested up to: 6.9
Requires PHP: 8.1
Stable tag: 0.7.0
License: MIT
License URI: https://opensource.org/licenses/MIT

Dziennik logowań i pomiar ruchu z ekranem w kokpicie. Rejestruje, niczego nie blokuje.

== Description ==

Trzecia z trzech wtyczek Automatic AI. Odpowiada na dwa pytania, na które
WordPress, WooCommerce ani Tutor nie odpowiadają: kto wchodził na konta
i co ludzie naprawdę czytają.

* **Dziennik logowań** — udane i nieudane próby: kiedy, z jakiego adresu IP,
  na które konto. Pełne IP, kasowane automatycznie po 90 dniach.
* **Pomiar ruchu** — które strony są otwierane i jak długo są czytane,
  anonimowo: bez adresu IP i bez ŻADNEJ kolumny łączącej wizytę z kontem.
  Zalogowanych administratorów nie mierzymy w ogóle.
* **Ekran w kokpicie** — cztery kafelki (każdy z własnym okresem), dziennik
  logowań z filtrem „tylko nieudane" oraz ruch w oknach dziś / 7 / 30 dni.

Wtyczka TYLKO PATRZY. Serii nieudanych logowań nie blokuje — pokazuje je
i decyzję zostawia człowiekowi (decyzja właściciela z 2026-08-30).

Wpis o dzienniku logowań dokłada się do polityki prywatności witryny
natywnym mechanizmem WordPressa (Narzędzia → Prywatność).

== Wymagania ==

* WordPress 6.9+, PHP 8.1+
* nie wymaga ani WooCommerce, ani Tutor LMS, ani wtyczki `aai-sklep`

== Komendy WP-CLI ==

* `wp aai-monitor sprawdz` — kontrola (kod wyjścia 1 = brak tabeli, awaria
  czujki albo niedziałająca retencja); nigdy niczego nie zapisuje
* `wp aai-monitor wyczysc-blad` — kasuje kanał błędów po naprawie

== Changelog ==

Numeruje WERSJĘ WTYCZKI (stała `AAI_MONITOR_WERSJA` w pliku głównym), a nie
wersję projektu — o tej mówi `CHANGELOG.md` w korzeniu repozytorium.

= 0.7.0 =
* Wgranie STARSZEJ wtyczki na nowszy schemat nie uruchamia starego `dbDelta`
  — przy zwężeniu typu kolumny uciąłby dane po cichu.

= 0.6.0 =
* Podbicie wersji razem z porządkami w dokumentacji projektu (nagłówek
  wtyczki nie był ruszany od jej powstania).

= 0.5.0 =
* Sól podpisu ścieżek mieszka we własnej tabeli `ustawienia`, nie w
  `wp_options` — wtyczka nie pisze już do żadnej tabeli rdzenia. Istniejąca
  sól jest przejmowana bez zmiany wartości, więc podpisy stron już
  wysłanych do przeglądarek zostają ważne. Slug ekranu jest stałą wtyczki,
  a nie klasy ekranu (koniec cyklu zależności między trzema klasami).

= 0.4.0 =
* Pomiar czasu czytania przestaje urywać się przy pierwszym przełączeniu
  karty, a kafelki ekranu podpisują własny okres, zamiast dzielić jeden
  podpis na cztery liczby liczone różnie.

= 0.3.0 =
* Pomiar ruchu: podpisany beacon wysyłany przy zniknięciu karty, jeden
  wiersz na odsłonę, sesja anonimowa, limit żądań i sufity wartości.
  Ekran pokazuje odsłony, sesje, czas łączny i średni oraz czytane strony.

= 0.2.0 =
* Dziennik logowań: trzy haki rdzenia (także logowanie z kasy WooCommerce),
  maskowanie tego, co wpisano w polu loginu przy nieistniejącym koncie,
  i wpis do polityki prywatności.

= 0.1.0 =
* Fundament: dwie tabele danych (`logowania` 90 dni, `wizyty` 400 dni), jedyna
  warstwa zapisu z retencją, ekran w kokpicie i kanał błędów.
  Odinstalowanie nie kasuje danych.
