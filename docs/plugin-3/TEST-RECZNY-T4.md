# T4 — test ręczny właściciela (wtyczka `aai-monitor`)

**Ostatni krok Pluginu 3.** Wzorcem tego dokumentu jest
[TEST-RECZNY-P6.md](../plugin-2/TEST-RECZNY-P6.md) — ten sam układ,
ta sama zasada: masz zobaczyć to, czego nie zobaczy żaden skrypt.

Monitoring jest inny niż dwie poprzednie wtyczki i to zmienia sens testu.
Klient nie widzi z niego **niczego** — nie ma tu ekranu do kliknięcia,
przycisku do naciśnięcia ani maila do odebrania. Jedynym odbiorcą jesteś
**Ty**, a produktem są **liczby**. Test ręczny odpowiada więc na jedno
pytanie, którego bramka zadać nie umie:

> **Czy te liczby mówią prawdę o tym, co naprawdę zrobiłeś — i czy da się
> je zrozumieć bez tłumacza?**

Bramka umie sprawdzić, że wiersz powstał. Nie umie sprawdzić, że napis nad
nim znaczy to, co Ty przez niego rozumiesz.

---

## KROK ZEROWY — rozkaz, nie rubryka

```
cd "wordpress/srodowisko" && ./postaw.sh
```

**Uruchom to, nawet jeśli „przecież działało".** Lekcja Z1 z 0.51.0
i powtórka przy T1: przełączenie gałęzi albo `git clean` odtwarza katalog
na dysku, kontener trzyma stary **inode**, i wtyczka po prostu ZNIKA —
strona oddaje 200, dwie pozostałe wtyczki działają, a monitoring „nie
istnieje". Objaw wygląda na błąd kodu, a jest błędem montowania.

`postaw.sh` kończy się kodem 0 i sam sprawdza, czy kontener widzi
wszystkie pięć wtyczek. Jeśli zgłosi cokolwiek — napisz mi to, zanim
zaczniesz test.

---

## Stan wyjściowy — liczby zmierzone przed oddaniem Ci tego dokumentu

| Co | Ile |
|---|---|
| Odsłony w tabeli ruchu | **0** |
| Wpisy w dzienniku logowań | **0** |
| Kursy | 2 (Claude, GitHub) |
| Sprzedaż | **otwarta** |
| Konta | `admin`, `klient-test`, `robert.parowk`, `jan.testowy`, `thore.wretyu` |

**Obie tabele monitoringu są PUSTE i to jest celowe.** Wszystko, co
zobaczysz na ekranie po tym teście, zrobisz Ty sam — więc każda liczba ma
znanego autora. Gdyby na starcie coś tam było, nie dałoby się odróżnić
Twojego ruchu od śladów po bramkach.

**Ekran monitoringu:** `http://127.0.0.1:8892/wp-admin` → menu **Automatic
AI** → **Monitoring**.

---

## Ścieżka A — dziennik logowań (kto i skąd wchodził)

1. Wyloguj się i zaloguj ponownie jako `admin`.
2. Wyloguj się i spróbuj zalogować **ze złym hasłem** — dwa, trzy razy.
3. Spróbuj zalogować się na konto, **którego nie ma** (np. `nieistniejacy`).
4. Zaloguj się jako `klient-test` (hasło w `wordpress/srodowisko/.env`,
   klucz `WP_KLIENT_HASLO`).
5. Wejdź na ekran monitoringu jako `admin`.

**Na co patrzysz:**

- Czy kafelek **„Nieudane próby (7 dni)"** się zapalił i pokazuje tyle,
  ile ich naprawdę było?
- Czy przy nieudanej próbie na **nieistniejące konto** login jest
  **zamaskowany** (np. `nie…(12 znaków)`), a przy istniejącym — pokazany
  wprost? Tak ma być: w pole loginu ludzie wpisują czasem hasło,
  a `sanitize_user` go NIE usuwa.
- Czy widzisz **swój adres IP** i przeglądarkę?
- Czy kolumna „źródło" odróżnia logowanie z formularza od sesji założonej
  gdzie indziej?

---

## Ścieżka B — pomiar ruchu (najważniejsza)

**Ta ścieżka wymaga DRUGIEJ PRZEGLĄDARKI albo okna prywatnego** — jako
zalogowany administrator NIE JESTEŚ mierzony (decyzja D3) i to jest
poprawne zachowanie, nie usterka.

W oknie prywatnym, **nie logując się**:

1. Wejdź na `http://127.0.0.1:8892/szkolenia/` i **poczytaj przez chwilę** —
   powiedzmy pół minuty. Popatrz na zegarek.
2. Wejdź na stronę jednego z kursów, poczytaj **wyraźnie dłużej**.
3. Przełącz się na inną kartę na kilkanaście sekund i **wróć**. Poczytaj
   jeszcze chwilę. *(To jest dokładnie ten przypadek, który przed
   przeglądem gubił czas — sprawdź, czy dziś się zgadza.)*
4. Wejdź na lekcję, do której **nie masz dostępu** (płatną) — zobaczysz
   zaproszenie do logowania.
5. Otwórz jedną z **darmowych** lekcji-zapowiedzi i przeczytaj kawałek.
6. Zamknij kartę.

Wróć do okna administratora, odśwież ekran monitoringu.

**Na co patrzysz:**

- Czy **liczba odsłon** zgadza się z tym, ile stron naprawdę otworzyłeś?
- Czy **średni czas** jest w okolicach tego, co pokazywał zegarek? Nie musi
  co do sekundy — ma nie być dziesięć razy mniejszy.
- Czy strona, na której siedziałeś **z przerwą na inną kartę**, ma czas
  obejmujący OBIE części czytania?
- Czy lista **„Najczęściej czytane strony"** zawiera to, co czytałeś —
  i **czy NIE MA na niej płatnej lekcji**, na którą tylko zajrzałeś?
- Czy jest osobne zdanie o odsłonach **zatrzymanych na bramce logowania**
  i osobna lista pod nim?
- Czy **„Sesje"** to jedna sesja, a nie tyle, ile stron otworzyłeś?

---

## Ścieżka C — czy liczby dają się zrozumieć

To jest ścieżka, w której nie klikasz — **czytasz**.

- Kafelki na górze mówią **„Odsłony łącznie"** i **„Sesje łącznie"**,
  a sekcja niżej pokazuje wybrane okno czasu. Czy po tej zmianie da się je
  pomylić? Czy podpis pod kafelkami wystarcza?
- Przełącz okno: **dziś / 7 dni / 30 dni**. Czy zaznaczone okno zgadza się
  z liczbami pod spodem?
- Przeczytaj zdanie na dole sekcji Ruch — to, które mówi, czym jest „sesja"
  i dlaczego odsłony są **dolną granicą**, nie dokładnym pomiarem. Czy jest
  zrozumiałe? Czy czegoś w nim brakuje?
- Czy jest coś, czego **oczekiwałeś na tym ekranie, a go nie ma**?

---

## Ścieżka D — czy nie zepsuliśmy niczego innego

Monitoring dokłada skrypt do **każdej strony frontu** i wisi na hakach
logowania — czyli dotyka miejsc, których sam nie obsługuje.

1. Przejdź ścieżkę zakupu do kasy (nie musisz płacić) — czy działa jak przy
   P6?
2. Otwórz „Moje kursy" i wejdź w lekcję jako `klient-test`.
3. Wejdź do kreatora (**Automatic AI → Kursy**), otwórz kurs, zapisz go bez
   zmian.
4. Popatrz na stronę główną, katalog i stronę kursu — czy wygląd jest ten,
   który przyjąłeś?

---

## Czego NIE zgłaszać — to jest poza zakresem T4

| Co zobaczysz | Dlaczego tak jest |
|---|---|
| Administrator nie pojawia się w ruchu | decyzja D3 — nie mierzymy siebie |
| Adres IP to `127.0.0.1` albo brama kontenera | warsztat, nie hosting; kontrola sama o tym ostrzega |
| Ekran nie pokazuje sprzedaży ani zamówień | decyzja D4 — od tego są raporty WooCommerce |
| Nie ma blokady po serii nieudanych logowań | decyzja D6 — **rejestrujemy, nie blokujemy**; decyzja o blokowaniu zapadnie, gdy dane pokażą, że problem istnieje |
| Nie ma porównania „rok do roku" ani wykresów | poza zakresem T3 |
| Odsłona zamknięta przez ubicie przeglądarki nie liczy się | świadome — beacon leci przy wyjściu ze strony, więc liczby są dolną granicą |
| Polityka prywatności witryny rozjeżdża się ze stanem faktycznym | pozycja „przed pierwszym klientem", wymaga prawnika — zgłoszone, nie ruszane |

---

## Co wiem przed testem i czego nie naprawiałem

- **A11 — dodatkowy przebieg PHP na odsłonę.** Na hostingu z cache'em
  pełnych stron każda odsłona anonimowa to jedno żądanie PHP, którego dziś
  nie ma (~45–50 ms). Twoja decyzja: pozycja wdrożeniowa, kodu nie ruszamy,
  dopóki nie znamy hostingu.
- **Podpis ścieżki jest jawny w HTML i wielokrotnego użytku.** Kto go raz
  weźmie, może wysłać ten sam beacon wiele razy — tłumi to limiter
  i (od tego przeglądu) sufit liczby wierszy. Świadoma granica.
- **Sesja znaczy „drzewo kart", nie „osobę".** `sessionStorage` kopiuje się
  do karty otwartej z linku, a dwa urządzenia to zawsze dwie sesje.

---

## Co sprawdziłem przelotem kontrolnym, zanim to dostałeś

- `postaw.sh` kod 0, pięć wtyczek aktywnych;
- `wp aai-monitor sprawdz` kod 0, czujki: logowania **i** ruch;
- obie tabele monitoringu **puste**;
- czternaście bramek WP zielonych, w tym monitoring **170 sprawdzeń**
  przelotem prawdziwej przeglądarki;
- dane Pluginów 1 i 2 nietknięte: proza 73/73 co do znaku, kopia w Tutorze
  0 różnic.

---

## Gdy znajdziesz błąd

Napisz **co zrobiłeś, co zobaczyłeś i czego się spodziewałeś** — w tej
kolejności. Zrzut ekranu bywa wart więcej niż opis (przy 0.39.1 i 0.40.0
to zrzut pokazał rzecz, której żadna bramka nie widziała).

Nie próbuj diagnozować — od tego jestem ja. Przy monitoringu szczególnie:
„liczba wygląda dziwnie" to pełnoprawne zgłoszenie, bo cały ten krok jest
o tym, żeby liczby nie kłamały.

---

## Kiedy T4 jest zaliczone

Gdy przejdziesz cztery ścieżki i powiesz, że **liczby zgadzają się z tym,
co zrobiłeś, a napisy nad nimi znaczą to, co przez nie rozumiesz**.

Wtedy **Plugin 3 jest skończony**, a razem z nim wszystkie trzy wtyczki —
i zostaje ostatnia rzecz z planu etapu WP: **test całości**, czyli czy trzy
wtyczki współpracują i czy projekt trzyma się kupy architektonicznie.
