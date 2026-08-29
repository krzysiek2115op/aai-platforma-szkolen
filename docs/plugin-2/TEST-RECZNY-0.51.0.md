# Test ręczny właściciela — wersja 0.51.0 (P4 + naprawy N1–N6)

**Decyzja właściciela 2026-08-29: najpierw ten test, dopiero potem P5.**
Powód jest w danych: przy poprzednim teście właściciel znalazł **klikaniem
pięć błędów**, których nie złapało 35 strażników, 201 mutacji i jedenaście
smoke'ów — wszystkie bramki mierzyły mechanizmy, żadna nie pytała, co klient
czyta na ekranie.

Wzorzec scenariusza: [W6-TEST-RECZNY.md](../plugin-1/W6-TEST-RECZNY.md).
Śledztwo i naprawy: [BLEDY-Z-TESTU-P4.md](BLEDY-Z-TESTU-P4.md).

## Zanim zaczniesz

| rzecz | stan |
|---|---|
| adres | **http://127.0.0.1:8892** |
| skrzynka (cała poczta) | **http://127.0.0.1:8893** |
| sprzedaż | **OTWARTA** |
| język | polski |
| bramka | przelew bankowy (`bacs`) — testowa |
| konto klienta | `klient-test`, hasło w `wordpress/srodowisko/.env` (`WP_KLIENT_HASLO`) |
| zamówienia | **1** — Twój własny zakup #1625 (materiał dowodowy, nie kasować) |

Gdyby środowisko nie odpowiadało: `cd wordpress/srodowisko && ./postaw.sh`.
Po `git checkout` wcześniej: `podman-compose down && ./postaw.sh` (bind mount
trzyma inode).

## Co konkretnie zostało naprawione — to sprawdź

### 1. Koszyk i przycisk (BLAD-023)

1. Wejdź na `/szkolenia/`, otwórz kurs o Claude, kliknij **„Dołączam za 299,00 zł"**.
2. **Bez wychodzenia z kasy** wróć na `/szkolenia/`, otwórz kurs o GitHubie
   i kliknij **„Dołączam za 349,00 zł"**.
3. **Oczekiwane:** w kasie **jeden kurs za 349,00 zł** (wcześniej były dwa
   i 648,00 zł) plus zdanie „Kursy kupuje się pojedynczo — w koszyku został…".
4. Kliknij ten sam kurs **drugi raz**. Oczekiwane: **„Ten kurs już czeka
   w Twoim koszyku"** jako spokojna informacja, nie czerwony błąd.
5. Sprawdź, czy pod nazwą kursu w podsumowaniu jest **opis kursu**
   (wcześniej stała tam „cudza edycja 1787936224").

### 2. Język (BLAD-024)

Przejdź kasę, koszyk, `/my-account/`, „Zapomniałem hasła", ekran po zalogowaniu,
listę zamówień i edycję danych. **Ma nie być ani jednego angielskiego napisu.**

Najważniejszy punkt: **kliknij „Ustaw hasło" w mailu** — ekran, na który
trafisz, był po angielsku („Enter a new password below"), teraz ma być polski.

### 3. Poczta (BLAD-025)

Kup kurs jako nowy klient (kasa sama założy konto), potem obejrzyj skrzynkę
`:8893`. **Sprawdź nadawcę każdej wiadomości** — wszystkie mają być od
`Automatic AI <admin@example.test>`, żadna od `WordPress <wordpress@127.0.0.1>`.

Powinny przyjść: nasz „Ustaw hasło i wejdź na swoje konto", potwierdzenia
WooCommerce po polsku, a po opłaceniu nasz „Twój kurs jest gotowy”.

### 4. Konto po zakupie

Ustaw hasło z maila, wejdź na **„Moje kursy"**, otwórz lekcję. Sprawdź, czy
lista zamówień na koncie pokazuje **Twoje** zamówienie, a nie stertę cudzych
(było ich tam 146 — „199,00 zł za 0 pozycji").

## Czego NIE zgłaszać — to jest poza zakresem

| rzecz | dlaczego |
|---|---|
| przelew bankowy zamiast BLIK/karty | bramka testowa; prawdziwa (Tpay/PayU/P24) wchodzi przed pierwszym klientem |
| **„Warunki i zasady" w kasie prowadzą donikąd** | Twoja decyzja z 2026-08-29: **zdejmujemy to zdanie** — jeszcze niezrobione |
| **szara ikonka zamiast okładki kursu w kasie** | Twoja decyzja: **PNG renderowane przy synchronizacji** — jeszcze niezrobione |
| brak zwrotów, „30 dni gwarancji" bez procedury | Twoja decyzja: obietnica **zostaje**, realizuje ją **P5** |
| zakładka „Pobrania" na koncie jest pusta | standardowa zakładka WooCommerce; kurs nie jest plikiem do pobrania |
| mail Woo „zamówienie jest w drodze" przy kursie | treść WooCommerce; decyzja: maile Woo zostają, po polsku |
| wygląd stron `/courses/…` Tutora | klient tam nie trafia — `/courses/*` przekierowuje na nasze strony |
| adres `127.0.0.1`, brak HTTPS, nazwa „środowisko robocze” | to warsztat, nie produkcja |

## Jak zgłaszać

Najlepiej **zrzut ekranu + jedno zdanie, czego się spodziewałeś**. Tak
powstały BLAD-023…026 i dzięki temu dało się je odtworzyć co do kroku.
Jeśli coś wygląda na drobiazg — zgłoś mimo to: „cudza edycja 1787936224"
wyglądała na drobiazg, a była śladem po tym, że całe pole widoczne klientowi
nie miało właściciela.
