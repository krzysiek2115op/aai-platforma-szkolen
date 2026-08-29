# Błędy z testu ręcznego właściciela (P4, 2026-08-29) — i klasy do przeszukania

**Status: ZAPISANE, NIENAPRAWIONE.** Właściciel testował sam na `:8892` po
kroku P4 i znalazł trzy rzeczy. Naprawa i **szczegółowe polowanie na całe
klasy** odbywa się w NASTĘPNEJ sesji (kontekst tej był pełny).

Rejestr: [rejestr/znane-bledy.json](../../rejestr/znane-bledy.json),
wpisy **BLAD-023, BLAD-024, BLAD-025**.

## 1. Co zgłosił właściciel

| # | Objaw (jego słowami) | Co widać na zrzucie |
|---|---|---|
| **BLAD-023** | „nie da się kupić jednego kursu, zawsze w koszyku są 2" | klik „Dołączam" na kursie Claude → kasa z DWOMA kursami i **648,00 zł**; do tego komunikat „You cannot add another … to your cart" |
| **BLAD-024** | „sekcja po polsku powinna być" | kasa: „Order summary", „Contact information", „Billing address", „Payment options", „Add coupons" |
| **BLAD-025** | „po założeniu konta mail zepsuty" | „[Automatic AI…] **Password Changed**" od `WordPress <wordpress@127.0.0.1>`, goły tekst po angielsku |

## 2. Trop, którego NIE zdążyłem rozstrzygnąć

Na zrzucie kasy, pod pozycją „Jak poprawnie korzystać z Claude", widnieje
**`cudza edycja 1787936224`** — wygląda na metę POZYCJI ZAMÓWIENIA, czyli
napis wyświetlany klientowi pod nazwą produktu.

Sprawdziłem meta samego produktu 675 i 676 — **są czyste** (poza `total_sales`
i `_download_*`). Czyli ślad siedzi gdzie indziej: w metadanych pozycji
koszyka/zamówienia albo w danych sesji. Liczba wygląda na **znacznik czasu**,
a fraza „cudza edycja" pada w tym repo w komentarzu
`class-aai-platnosci-zapis.php` przy haku B13 (przywracanie znaczników po
cudzym zapisie produktu) — **podejrzenie: ślad po którymś smoke'u, który
symuluje cudzą edycję produktu i zostawia po sobie metę widoczną klientowi.**

**To jest pierwsza rzecz do rozstrzygnięcia po `/clear`** — bo jeśli
potwierdzone, znaczy że smoke pisze do danych, które widzi klient.

## 3. Klasy do przeszukania — SZCZEGÓŁOWO, w następnej sesji

Właściciel: „poszukaj podobnej klasy błędów bardzo szczegółowo, dużo ich jest".
Cztery klasy wyprowadzone z trzech objawów:

### Klasa A — obietnica przycisku ≠ to, co dostaje klient
BLAD-023 jest jej przypadkiem. Do przejrzenia **każde** miejsce, gdzie coś
obiecujemy liczbą albo nazwą: cena w hero, na karcie katalogu, w sekcji
oferty, w danych strukturalnych, w mailu, w koszyku, w kasie i w potwierdzeniu
zamówienia. Pytanie kontrolne: **czy klient, który kliknie, dostanie
DOKŁADNIE to, co przeczytał?**

### Klasa B — cudzy język na ścieżce klienta
BLAD-024. Do przejrzenia **każda strona i każdy komunikat, którego nie
piszemy sami**: koszyk, kasa, konto, odzyskiwanie hasła, komunikaty błędów
kasy, strony Tutora za logowaniem, maile WooCommerce. Uwaga przy naprawie:
część naszych smoke'ów asertuje ANGIELSKIE napisy — zmiana języka je wywali
i trzeba to zrobić świadomie, nie po cichu.

### Klasa C — maile spoza naszej warstwy
BLAD-025. Do wypisania **komplet** wiadomości, które mogą wyjść na ścieżce
klienta i właściciela: rdzeń WordPressa (zmiana hasła, reset, nowy
użytkownik), WooCommerce (nowe konto, otrzymane zamówienie, w realizacji,
zrealizowane, anulowane, zwrot, faktura), Tutor. Dla każdej rozstrzygnąć:
**zostaje / gasimy / przejmujemy** — i sprawdzić NADAWCĘ (dziś `wordpress@`
przy części z nich; na produkcji to SPF i spam).

### Klasa D — ślady testów widoczne dla klienta
Trop z sekcji 2. Do przejrzenia: co nasze smoke'i piszą do danych, których
NIE sprzątają — meta produktów i pozycji zamówień, sesje koszyka, konta,
opcje. Reguła z sweepu P2 („smoke, który zostawia produkt, każe następnym
mierzyć własne śmieci") ma tu drugą stronę: **śmieć widoczny klientowi jest
gorszy niż śmieć widoczny bramce.**

## 4. Stan środowiska, w jakim to zostało

- **SPRZEDAŻ OTWARTA** (`wp aai-platnosci sprzedaz zamknij` żeby cofnąć),
  bramka: przelew bankowy.
- W skrzynce `http://127.0.0.1:8893` leży komplet z zakupu na
  `podglad@example.test` (mail 1, mail 2 i wiadomości WooCommerce) oraz
  zakupy właściciela.
- Zamówienia, konta i zapisy z testów **NIE są posprzątane** — celowo,
  bo są materiałem dowodowym dla klas A–D. Sprzątać dopiero po ich zbadaniu.
- Kod P4 jest kompletny i przejrzany (10 commitów, wersja 0.50.0),
  bramki zielone. Te trzy błędy to **wynik testu ręcznego, nie regresja**.
