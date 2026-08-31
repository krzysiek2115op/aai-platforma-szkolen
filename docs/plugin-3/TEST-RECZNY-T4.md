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

---

# PRZEBIEG TESTU (2026-08-31)

## Ścieżka A — ZALICZONA

Ekran sprawdzony przeciw bazie wiersz po wierszu: 9 logowań (5 udanych
+ 4 nieudane), kafelek nieudanych 4, maskowanie działa, `user_id` NULL przy
porażkach, źródło `formularz` przy sukcesach.

**Maskowanie jest mocniejsze, niż obiecuje scenariusz:** ciąg z pola loginu
nie trafia do bazy w ogóle — `bezpieczny_login()` maskuje PRZY ZAPISIE.
Gdyby ktoś wpisał tam hasło, nie ma go ani w tabeli, ani w kopii zapasowej.

**Rozstrzygnięte pomiarem, nie założeniem:** maska pokazała `nie…(11 znaków)`
przy oczekiwanych 13. Sprawdzone dwoma prawdziwymi próbami logowania —
`nieistniejacy` → `(13 znaków)`, `nieistnieje` → `(11 znaków)`. Licznik jest
poprawny; właściciel wpisał ciąg 11-znakowy. Wiersze pomiarowe skasowane.

## Ścieżka B — ZALICZONA, dwie liczby wyjaśnione pomiarem

Właściciel zgłosił, że czasy są niższe od zegarka: `/szkolenia/` 18 s przy
~30 s czytania, strona kursu 37 s przy ~60 s. Sam wskazał prawdopodobną
przyczynę — przełączał pulpity, więc okno bywało niewidoczne.

**Zmierzone rigiem (puppeteer-core + systemowy Firefox), nie przyjęte na
słowo:**

| Scenariusz | Zegar ścienny | Zapisane w bazie |
|---|---|---|
| 30 s bez przerwy, `/szkolenia/` | 30 302 ms | **30 130 ms** |
| 15 s + 10 s ukryte + 15 s, strona kursu | 40 220 ms (30 s aktywnego) | **30 016 ms** |

Zegar jest dokładny co do dziesiątych sekundy, a przerwa jest wycięta i obie
części czytania są w środku — **naprawa B1 z przeglądu T3 trzyma**. Zmiana
pulpitu chowa okno tak samo jak przełączenie karty, więc 18 s i 37 s to
prawdziwy czas widoczności. Nie usterka.

**Cztery sesje przy jednym oknie prywatnym — też nie usterka.** Zmierzone:
cztery strony przeklikane w JEDNEJ karcie (katalog → kurs → lekcja płatna →
lekcja darmowa) trzymają jeden identyfikator sesji. Właściciel otworzył część
adresów z linków, czyli w nowych kartach — a nowa karta to z definicji nowa
sesja („drzewo kart", nie „osoba"), tak jak podpisano na ekranie.

Reszta bez zastrzeżeń: 5 odsłon = 5 otwartych stron; płatna lekcja NIE weszła
na listę czytanych stron, tylko do osobnej sekcji „Zatrzymane na bramce
logowania"; darmowa zapowiedź trafiła na listę czytanych.

**LUKA W DOWODACH ZNALEZIONA PRZY TEJ ŚCIEŻCE (do naprawy w T4):** żadna
bramka nie sprawdza CIĄGŁOŚCI sesji. `smoke-wp-monitor` pyta, czy
identyfikator ma 32 znaki — nie pyta, czy dwie strony odwiedzone w tej samej
karcie mają TEN SAM. Gdyby ciągłość się zepsuła, „Sesje" pokazywałyby liczbę
odsłon, wszystkie testy byłyby zielone, a wyszłoby to dopiero na ekranie
właściciela. Dlatego trzeba to było dziś zmierzyć ręcznie.

## Ścieżka C — jedno znalezisko, potwierdzone przez właściciela

**Okna czasu działają** — sprawdzone podstawionym wierszem sprzed 10 dni:
ekran oddał `dziś 5 · 7 dni 5 · 30 dni 6`, czyli stary wiersz widać wyłącznie
w oknie 30-dniowym. Wiersz skasowany. (Dane z samego testu leżą w jednym
dniu, więc na nich tego sprawdzić się NIE DAŁO.)

**ZNALEZISKO: zdanie pod kafelkami przeczy kafelkowi, który opisuje.** Podpis
mówi „Kafelki liczą wszystko od początku pomiaru", a drugi kafelek nazywa się
„NIEUDANE PRÓBY (7 DNI)". Właściciel potwierdził: „tak, jest to mylące".

## Decyzje właściciela z 2026-08-31 (ścieżka C, pytanie 4)

| # | Decyzja | Skutek |
|---|---|---|
| **T4-D1** | Kafelki: **każdy z własnym okresem pod liczbą**, wspólne zdanie znika | wchodzi do gałęzi poprawek T4 |
| **T4-D2** | Punkt odniesienia do poprzedniego okresu **TAK, samą liczbą** (bez wykresu) — „dziś 5, poprzednie 24 h: 12" | osobny krok po T4 |
| **T4-D3** | Ekran ma służyć **wszystkim czterem celom naraz**: czy ludzi przybywa · czego szukają przed zakupem · czy ktoś dobija się do kont · eksport do własnych obliczeń | osobny krok po T4 |
| **T4-D4** | **Nowe sekcje to OSOBNY KROK po zaliczeniu T4**, z własnym planem, pytaniami i zgodą | najpierw domykamy T4 i PR |

**Zakres gałęzi poprawek T4:** T4-D1 (kafelki) + brakująca asercja ciągłości
sesji + cokolwiek wyjdzie ze ścieżki D. Nic więcej — reszta ma własny krok.

**Zakres kroku następnego (roboczo T5), wprost z T4-D2/D3** — wszystko
liczone z danych, KTÓRE JUŻ ZBIERAMY, bez ani jednej nowej kolumny:

1. punkt odniesienia do poprzedniego okresu (T4-D2);
2. lejek katalog → strona kursu → bramka; kolumna `bramka` to dane, których
   nie ma nikt inny — Woo zna zamówienia, Tutor zapisy, tylko my wiemy, **kto
   chciał i się odbił**;
3. strony wejściowe (pierwsza ścieżka w sesji);
4. sesje jednostronicowe (odróżniają „pięcioro uciekło" od „jedno czytało");
5. kafelek „ostatnia aktywność" — zabezpieczenie, nie ciekawostka: przy
   pustej tabeli ekran mówi wprost, że nic nie zbiera, ale przy danych
   STARYCH wygląda to jak spokojny ruch;
6. serie nieudanych logowań z jednego adresu — domyka D6 („rejestrujemy, nie
   blokujemy" ma sens tylko wtedy, gdy rejestr POKAZUJE serię);
7. eksport CSV.

**Poza zakresem i tak zostaje:** wykresy i porównania rok do roku (poza T3),
cokolwiek o sprzedaży (D4 — od tego są raporty Woo), łączenie ruchu z kontem
(D3 — ruch jest anonimowy i ma taki zostać).

## Higiena pomiarów tej sesji

Każdy mój pomiar zostawiał ślad w tabelach właściciela, więc każdy był robiony
od migawki `MAX(id)` i sprzątany po sobie. Stan po ścieżce C wrócił dokładnie
do jego danych: **9 logowań / 4 nieudane / 5 odsłon / 4 sesje**.

## Ścieżka D — ZALICZONA

Właściciel: „wszystko się zgadza". Zakup prowadzi **prosto do kasy** (widać to
też w tabeli ruchu: sesja `5f3384` idzie ze strony kursu na `/kasa/`), materiał
za logowaniem otwiera się w naszym wyglądzie, wygląd frontu bez zastrzeżeń,
a kreator na zapis bez zmian odpowiada **„Nic się nie zmieniło — zapis niczego
nie ruszył."** — czyli BLAD-020 trzyma.

Przy okazji ścieżki D wyszła rzecz, która **NIE jest usterką**: `klient-test`
zalogowany na adresie `wp-admin/admin.php?page=aai-monitor` dostaje „Brak
uprawnień dostępu do wybranej strony". Ekran monitoringu wymaga
`manage_options`, więc odmowa jest poprawna — a sam ten komunikat dowodzi, że
sesja działa (gość zobaczyłby formularz logowania). Trzy udane logowania
`klient-test` w dzienniku to potwierdzają. **Obserwacja na przyszłość, nie
zgłoszenie:** klient dostaje wtedy goły ekran błędu WordPressa bez drogi
powrotnej do sklepu — ta sama klasa co zgłoszenie z P6 („nie miałem JAK
trafić do kupionego kursu"). Wchodzi się na to wyłącznie wpisując adres panelu
ręcznie; żaden nasz odnośnik tam nie prowadzi.

---

# T4 ZALICZONE (właściciel, 2026-08-31)

Cztery ścieżki przeszły. Wtyczka **`aai-monitor` jest skończona**, a razem
z nią **wszystkie trzy wtyczki etapu WordPress**.

**Test zrobił dokładnie to, do czego jest** — wyciągnął rzecz niewidzialną dla
14 bramek WP (mylące kafelki), a przy dwóch zgłoszeniach okazało się, że kod
ma rację, i zamknęliśmy je POMIAREM zamiast naprawą. Trzecia rzecz — brak
asercji ciągłości sesji — wyszła stąd, że musiałem ręcznie zmierzyć coś, czego
nie umiała zmierzyć żadna bramka.

## Co weszło do wersji 0.58.0

| Rzecz | Skąd | Dowód |
|---|---|---|
| Każdy kafelek z własnym okresem | zgłoszenie właściciela (T4-D1) | 2 nowe sprawdzenia + 2 testy negatywne |
| Asercja ciągłości sesji | moja luka w dowodach | test negatywny: 1 z 171 pada |
| README bez sprzeczności o krokach T1–T3 | przy okazji | `straznik-readme` kod 0 |

Szczegóły: CHANGELOG 0.58.0.

## Pułapka, w którą wpadłem przy tej naprawie

Pierwsza wersja reguły o kafelkach liczyła **znaczniki**
`class="aai-monitor-okres"`, a nie ich treść — więc mutacja ustawiająca okres
na pusty łańcuch **przeszła na zielono**: znacznik był, podpisu nie było.
To siódmy nawrót pułapki „wzorzec pyta o obecność, nie o rozstrzygnięcie"
(0.29.0, 0.44.0, 0.47.0, c6c9c97, dwa razy w P4) — i tym razem wpadła w nią
reguła pisana przez ten sam przegląd, który tę pułapkę opisuje. Złapał ją
test negatywny, nie lektura kodu.
