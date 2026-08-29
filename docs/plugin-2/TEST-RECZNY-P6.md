# P6 — test ręczny właściciela (wtyczka `aai-platnosci`, wersja 0.52.0)

Ostatni krok Pluginu 2. **Wtyczka nie jest skończona, dopóki nie przejdzie
tego testu** — tak samo jak `aai-sklep` nie była skończona przed W6.

Automaty odpowiadają na pytanie „czy to **działa**". Ten test odpowiada na
inne: **czy człowiek, który tu wchodzi z pieniędzmi, rozumie, co się dzieje,
i dostaje to, za co zapłacił.** Tego nie zmierzy żaden strażnik, bo nie umie
mieć wrażenia — a dwa razy w tym projekcie właściciel znalazł klikaniem to,
czego nie widziały wszystkie bramki razem (W6: sześć rzeczy; test 0.51.0:
pięć błędów przy 35 strażnikach, 201 mutacjach i jedenastu smoke'ach).

Wzorzec: [W6-TEST-RECZNY.md](../plugin-1/W6-TEST-RECZNY.md).
Poprzedni przebieg: [TEST-RECZNY-0.51.0.md](TEST-RECZNY-0.51.0.md).
Co wchodziło krokami: [KROK-P3A.md](KROK-P3A.md) · [KROK-P3B.md](KROK-P3B.md)
· [KROK-P4.md](KROK-P4.md) · [KROK-P5.md](KROK-P5.md).

Czas: około 40–50 minut. Ścieżki A–E są niezależne — nie trzeba naraz.

---

## KROK ZEROWY — rozkaz, nie rubryka

```bash
cd wordpress/srodowisko && ./postaw.sh
```

**Zacznij od tego zawsze**, nawet jeśli „przecież działało". Między jednym
a drugim testem ktoś mógł przełączyć gałąź, a wtedy bind mounty umierają po
cichu: pliki leżą na dysku, `git status` jest czysty, kontener widzi pustkę.
Tak przepadła cała poczta przy teście 0.51.0 (zgłoszenie Z1) — złożyłeś
zamówienie i nic nie przyszło, bo kontener nie widział mu-pluginu poczty.

`postaw.sh` jest idempotentny, pyta KONTENER o mount poczty i **cytuje
wiersze `Error:` z kontroli** zamiast zgadywać powód. Jeśli coś jest nie tak,
powie co i poda komendę naprawy.

---

## Stan wyjściowy — to są liczby zmierzone przed oddaniem Ci tego dokumentu

| rzecz | stan |
|---|---|
| adres | **http://127.0.0.1:8892** |
| skrzynka (cała poczta warsztatu) | **http://127.0.0.1:8893** — **pusta** |
| sprzedaż | **OTWARTA** |
| metoda płatności | **Przelew bankowy** (`bacs`) — jedyna włączona, testowa |
| język | polski |
| kontrola `wp aai-platnosci sprawdz` | **kod 0** |
| kopia w Tutorze | 87 obiektów, **0 różnic** |
| proza kursów | **73/73 co do znaku** |
| zamówienia | **2** — Twoje własne zakupy #1625 i #2010 (materiał dowodowy, nie kasować) |

| Kurs | Adres | Cena | Moduły | Lekcje | Otwarte bez logowania | Sekcje |
|---|---|---|---|---|---|---|
| Jak poprawnie korzystać z Claude | `/szkolenia/jak-korzystac-z-claude/` | **299 zł** | 6 | **41** | **2** | 11 |
| Jak poprawnie używać GitHuba | `/szkolenia/jak-uzywac-githuba/` | **349 zł** | 6 | **32** | **2** | 11 |

### Konto klienta — bez niego test odpowiada na złe pytanie

```bash
npm run wp:klient
```

Konto `klient-test` (rola `subscriber`, **pasek narzędzi zgaszony**), zapisane
na **oba** kursy. Hasło ląduje w `wordpress/srodowisko/.env` pod kluczem
`WP_KLIENT_HASLO` — poza gitem. Po teście: `npm run wp:klient -- --usun`.

Po co osobne konto: **administrator widzi materiał z definicji**, a pasek
narzędzi przesuwa stronę o 32 px i zasłania pigułkę lekcji. Na swoim koncie
sprawdziłbyś „czy admin to zobaczy", a pytanie brzmi „czy klient to zobaczy".

> **Wygodnie:** dwie przeglądarki albo okno prywatne — w jednym `admin`,
> w drugim klient. Wtedy zmianę i jej skutek widzisz obok siebie.

---

## Ścieżka A — gość, który jeszcze nie kupił

Okno prywatne albo wylogowanie.

- [ ] **Katalog** `/szkolenia/` — dwie karty **równej wysokości**, ceny
      **299 zł** i **349 zł**, statystyki (6 modułów, 41 i 32 lekcje).
- [ ] **Hero katalogu** — po P5 zniknął stamtąd pływak „30 dni gwarancji"
      i zostały **dwa pływaki zamiast trzech**. Bramka wyglądu (90/90) nie
      zgłasza nachodzeń ani plam, ale **kompozycja to Twoja ocena** —
      powiedz, czy tak ma zostać.
- [ ] **Strona kursu** `/szkolenia/jak-korzystac-z-claude/` — przewiń CAŁĄ.
      Sprawdzasz sens i wygląd: kolejność sekcji, nic się nie nachodzi,
      program rozwija się płynnie, pigułka u góry prowadzi tam, gdzie mówi.
- [ ] **Przycisk zakupu** — ma brzmieć **„Dołączam za 299,00 zł"**, nie
      „Porozmawiajmy" i nie prowadzić do `/kontakt`. Klik ma zabrać Cię
      **prosto do kasy**, z pominięciem koszyka.
- [ ] **Strona nie obiecuje zwrotu** — po P5 nigdzie nie ma „30 dni",
      „gwarancji zwrotu" ani „zwrócę pieniądze". Obietnica siedziała
      w czterech miejscach na kurs; jeśli gdzieś przetrwała, to jest błąd.
- [ ] **FAQ: „Mogę zajrzeć do kursu przed zakupem?"** — odpowiedź mówi
      o **dwóch lekcjach otwartych bez logowania**. To zdanie ma pokrycie
      w danych, ale sprawdź, czy brzmi uczciwie.
- [ ] **„przeczytaj za darmo"** — w programie kursu dwie lekcje mają ten
      odnośnik. Kliknij OBA: mają się otworzyć **bez logowania, z pełną
      treścią**. Do P5 była tam sama etykieta „podgląd" bez żadnej drogi —
      strona obiecywała coś, do czego nie dało się wejść.
- [ ] **Lekcja zamknięta** — wejdź w dowolną inną lekcję z programu.
      Ma być **zaproszenie zamiast treści**, ani jednego akapitu prozy.
- [ ] **Drugi kurs** `/szkolenia/jak-uzywac-githuba/` — to samo, cena 349 zł.

---

## Ścieżka B — zakup (najważniejsza)

Nadal jako gość. **Użyj adresu e-mail, którego jeszcze tu nie było** —
konto ma powstać przy zakupie.

- [ ] **Kasa** — kliknij „Dołączam za 299,00 zł". Lądujesz w `/kasa/`
      z jednym kursem.
- [ ] **Okładka produktu** — przy nazwie kursu ma być **okładka kursu**,
      nie szara ikonka. (Do P5 stał tam zastępnik WooCommerce.)
- [ ] **Zdanie o zgodach** — pod formularzem ma być **„Kontynuując
      zamówienie, wyrażasz zgodę na naszą Politykę prywatności."**
      z klikalnym odnośnikiem. **Nie ma prawa być „Warunków i zasad"** —
      regulaminu nie ma, więc kasa nie może się na niego powoływać.
- [ ] **Wszystko po polsku** — ani jednego angielskiego napisu.
- [ ] **Drugi kurs do koszyka** — zanim złożysz zamówienie, wróć na
      `/szkolenia/`, otwórz kurs o GitHubie i kliknij jego przycisk.
      **Oczekiwane: w kasie jeden kurs za 349,00 zł** i spokojne zdanie
      „Kursy kupuje się pojedynczo — w koszyku został…", **nie** dwa kursy
      za 648 zł. Kliknij ten sam kurs drugi raz: **„Ten kurs już czeka
      w Twoim koszyku"** jako informacja, nie czerwony błąd.
- [ ] **Złóż zamówienie** przelewem bankowym.
- [ ] **Strona podziękowania** — dane do przelewu, numer zamówienia,
      czytelna informacja, co się stanie dalej.
- [ ] **Skrzynka `:8893`** — mają czekać: nasz **„Ustaw hasło i wejdź na
      swoje konto"** i potwierdzenia WooCommerce po polsku.
      **Sprawdź nadawcę każdej wiadomości** — wszystkie od
      `Automatic AI … <admin@example.test>`, **żadna** od
      `WordPress <wordpress@127.0.0.1>`.
- [ ] **Mail „Ustaw hasło"** — kliknij link. Ekran ustawiania hasła ma być
      **po polsku**. Hasła nie ma w treści maila i nie ma go tam być.
- [ ] **Kurs jeszcze NIE jest Twój** — przelew czeka na potwierdzenie.
      Wejdź na stronę kursu: przycisk ma mówić **„Zamówienie w toku"**,
      a nie „Dołączam za…" i nie „Przejdź do kursu". To jest cała różnica
      między „zamówiłem" a „zapłaciłem".
- [ ] **Potwierdź wpłatę** — jako `admin`: WooCommerce → Zamówienia →
      Twoje zamówienie → status **Zrealizowane** (albo „W trakcie
      realizacji" — ma się domknąć samo).
- [ ] **Mail „Twój kurs jest gotowy"** — ma przyjść po potwierdzeniu wpłaty.
- [ ] **Lista zamówień na koncie** — `/my-account/orders/` pokazuje
      **Twoje** zamówienie, a nie stertę cudzych.

---

## Ścieżka C — klient, który już ma kurs

Zaloguj się jako `klient-test` (albo kontem z zakupu ze ścieżki B).

- [ ] **„Moje kursy" są w menu** — obok „Szkolenia", **tylko** dla
      zalogowanego, który ma choć jeden kurs.
- [ ] **`/szkolenia/moje/`** — kafelki z okładką, paskiem postępu,
      licznikiem („0 z 41 lekcji · 0%") i przyciskiem do pierwszej
      nieodhaczonej lekcji.
- [ ] **Przycisk na stronie sprzedażowej się zmienił** — wejdź na
      `/szkolenia/jak-korzystac-z-claude/` będąc zalogowanym: ma być
      **„Przejdź do kursu"**, nie oferta zakupu czegoś, co już masz.
- [ ] **Lekcja** — otwórz. Ma być NASZ wygląd (ten przyjęty przy 0.34.0),
      hero z pozycją w kursie, treść w kolumnie czytania, zrzuty z podpisami.
      Ani śladu stylu Tutora.
- [ ] **Strzałka „wróć"** w pigułce — jako kupujący wracasz do
      **„Moich kursów"**, nie na cennik.
- [ ] **Postęp** — odhacz lekcję. Licznik ma się zmienić i przeżyć
      przeładowanie.
- [ ] **Panel Tutora nie pokazuje się klientowi** — wpisz `/dashboard/`.
      Ma przerzucić na „Moje kursy".

---

## Ścieżka D — zwrot (sedno P5)

**Rób to na zamówieniu ze ścieżki B**, nie na #1625 ani #2010 — te dwa są
materiałem dowodowym z poprzednich testów.

- [ ] **Zwrot** — WooCommerce → Zamówienia → Twoje zamówienie → status
      **Zwrócone**.
- [ ] **Dostęp znika** — jako ten klient: kurs **nie ma go już** na
      „Moich kursach", lekcja jest **zamknięta**, a przycisk na stronie
      sprzedażowej wraca do **„Dołączam za 299,00 zł"**.
- [ ] **Klient wie, co się stało** — w skrzynce ma być wiadomość
      WooCommerce o zwrocie.

To jedyna rzecz z P5, której nie widać bez kliknięcia. Zmierzone: dostęp
odbiera **sam Tutor**, bez ani jednej linijki naszego kodu — my tylko
pilnujemy smoke'em, żeby aktualizacja Tutora nie zabrała tego po cichu.

---

## Ścieżka E — czy nie zepsuliśmy wyglądu

- [ ] **`/koszyk/` i `/kasa/`** — wyglądają jak część serwisu: ciemne pola,
      akcent volt na przyciskach, nagłówek nie zasłania treści.
- [ ] **`/my-account/`, „Zapomniałem hasła", edycja danych** — to samo,
      i **„Moje kursy" jako pierwsza pozycja** w menu konta.
- [ ] **`/`, `/uslugi/`, `/kontakt/`** — wyglądają jak przed wtyczkami.
      Sprawdzasz to, bo raz już arkusz Tutora złamał stronę główną (0.38.0).
- [ ] **Stopka** na naszych stronach i na stronie motywu — identyczna.
- [ ] **Wąskie okno** — zwęź przeglądarkę do szerokości telefonu:
      katalog, strona kursu, kasa i lekcja mają zostać czytelne.

---

## Czego NIE zgłaszać — to jest poza zakresem P6

| Rzecz | Dlaczego tak jest |
|---|---|
| przelew bankowy zamiast BLIK/karty | bramka testowa; prawdziwa (Tpay/PayU/P24) wchodzi **przed pierwszym klientem**, osobnym krokiem |
| brak faktury i VAT-u | ten sam krok co bramka |
| **brak regulaminu** | Twoja decyzja z 2026-08-29: zdanie o „Warunkach i zasadach" **zdjęliśmy** właśnie dlatego, że dokumentu nie ma. Regulamin piszesz Ty |
| **brak zgody „dostarczcie od razu, rezygnuję z 14 dni"** | **czeka na Twoją decyzję** — wymaga regulaminu i najlepiej opinii prawnika (KROK-P5.md §10) |
| **brak gwarancji 30 dni** | Twoja decyzja z 2026-08-29: gwarancji nie realizujemy, więc strona jej nie obiecuje |
| mail Woo „zamówienie jest w drodze" przy kursie | treść WooCommerce; decyzja: maile Woo zostają, po polsku |
| zakładka „Pobrania" na koncie jest pusta | standardowa zakładka Woo; kurs nie jest plikiem |
| wygląd stron `/courses/…` Tutora | klient tam nie trafia — `/courses/*` przekierowuje na nasze |
| **cztery lekcje otwierają się bez logowania** | świadoma próbka, po dwie na kurs (`preview = 1`). **Twoja decyzja 2026-08-25: zostają** |
| „dostęp bez limitu", „aktualizacje bez dopłat", „odpowiadam osobiście" | zobowiązania handlowe — audyt 0.33.0 zostawił je **do Twojej decyzji** |
| adres `127.0.0.1`, brak HTTPS, „środowisko robocze" w nazwie | to warsztat, nie produkcja |
| konta `jan.testowy` i `thore.wretyu`, zamówienia #1625 i #2010 | materiał dowodowy z testu 0.51.0 |

---

## Co wiem przed testem i czego nie naprawiałem

Żeby nie zgłaszać tego jako znaleziska i żeby nie zginęło:

1. **Osierocony zapis w Tutorze** (wpis #2153, `post_author = 0`, na kursie
   o Claude, po zamówieniu #2152, którego już nie ma). Ślad po smoke'u
   zakupu, zostawiony na **prawdziwych** danych — ta sama klasa co
   „produkty-sieroty" ze sweepu P2. Nigdzie się nie pokazuje (Tutor filtruje
   `post_author > 0`) i nie blokuje testu. **Wracam do tego w naprawach po
   P6.**
2. **`npm run wp:klient` był zepsuty od P2** i naprawiłem to przed oddaniem
   Ci tego dokumentu: odkąd kursy są płatne, `do_enroll()` nadaje zapisowi
   `pending` („czeka na opłatę"), a dostęp daje wyłącznie `completed` — więc
   konto testowe udawało nie klienta, tylko kogoś, kto zaczął zakup.
   Narzędzie samo to zgłaszało („brak dostępu do kursów: 764"), ale nikt go
   nie uruchamiał od W6. Po naprawie trzy przebiegi z rzędu dają dwa zapisy
   `completed`, zero maili, zero wpisów w dzienniku dostaw.
3. **Smoke'i nie szanują skrzynki.** Dwie strony tej samej klasy:
   `smoke-wp-zakup`, `smoke-wp-zwroty` i `smoke-wp-jezyk` **zostawiają**
   swoją pocztę (jeden komplet przebiegów = ~36 wiadomości do
   `klient-test@…` i admina), a `smoke-wp-maile` odwrotnie — **czyści CAŁĄ
   skrzynkę**, także cudze wiadomości: przy przebiegu w trakcie tej sesji
   zabrał też Twoje maile z zakupu #2590 (dziennik dostaw i zamówienie
   zostały — przepadł tylko podgląd wiadomości). **Do naprawy po P6** —
   ta sama klasa co „produkty-sieroty" ze sweepu P2: bramka sprząta na
   oślep albo wcale, zamiast dokładnie po sobie.

   Praktycznie na czas testu: skrzynka jest wyczyszczona do zera, więc
   wszystko, co w niej zobaczysz, jest Twoje — a gdyby coś Ci w niej
   zginęło albo przybyło bez Twojego działania, to znaczy, że ktoś
   uruchomił smoke'i w trakcie.

## Co sprawdziłem przelotem kontrolnym, zanim to dostałeś

Przeszedłem ścieżkę zakupu sterowaną przeglądarką na **prawdziwym kursie**
i posprzątałem po sobie do zera. **23 z 23 kroków**: katalog → przycisk
z ceną → prosto do kasy → okładka kursu z tekstem alternatywnym → zdanie
o polityce prywatności bez „Warunków i zasad" → zamówienie → konto → mail
„Ustaw hasło" (nadawca `Automatic AI`, nie `WordPress`) → wpis w dzienniku
dostaw → potwierdzenie wpłaty → domknięcie zamówienia → dostęp → mail „Twój
kurs jest gotowy" → **zwrot odbiera dostęp** → kontrola kod 0.

**To nie zastępuje Twojego testu** — sprawdziłem, że mechanizmy dojeżdżają,
żebyś nie stracił rundy na zepsute środowisko (jak przy Z1). Czy to, co
klient **czyta i widzi**, ma sens — na to odpowiadasz tylko Ty.

---

## Gdy znajdziesz błąd

**Zrzut ekranu + jedno zdanie, czego się spodziewałeś.** Tak powstały
BLAD-019…028 i dzięki temu dało się je odtworzyć co do kroku. Drobiazgi też
zgłaszaj: „cudza edycja 1787936224" wyglądała na drobiazg, a była śladem po
tym, że całe pole widoczne klientowi nie miało właściciela.

Poprawki wchodzą na gałąź **`feat/p6-test-reczny`**, wg
[CONTRIBUTING.md](../../CONTRIBUTING.md). Błąd z klasą, która może wrócić,
dostaje wpis w [rejestr/znane-bledy.json](../../rejestr/znane-bledy.json)
**i strażnika przeciw nawrotom** — bez tego naprawa jest tylko obietnicą.

## Przebieg — zgłoszenia i naprawy

### Sesja 2026-08-29/30 (w toku)

Ścieżki A–B przejdzone przez właściciela do zamówienia #2590 włącznie
(konto `robert.parowk`); „na razie wszystko idzie dobrze". Na jego
polecenie odegrałem bramkę płatności tak, jak zrobi to prawdziwa
(`payment_complete()` z identyfikatorem transakcji, nie ręczna zmiana
statusu): zamówienie domknęło się samo, dostęp przyznany, „Twój kurs jest
gotowy" w skrzynce, kontrola kod 0.

**Trzy zgłoszenia właściciela — każde potwierdzone uruchomieniowo, każda
naprawa z testem negatywnym (wersja 0.53.0, szczegóły w CHANGELOG):**

| # | Zgłoszenie | Co się okazało | Decyzja właściciela i naprawa |
|---|---|---|---|
| 1 | „mogę wejść do kursu bez hasła, a jeden z dwóch maili jest niepotrzebny" | Nie wyciek: kasa loguje kupującego na 14 dni (`wc_set_customer_auth_cookie`), a lekcja z „Zacznij kurs" to darmowa zapowiedź (`preview = 1`). Ale przy płatności natychmiastowej oba maile przychodziły w tej samej sekundzie, a mail 1 kazał „wejść na konto", na którym klient siedział | **Jeden mail przy płatności natychmiastowej**: mail 1 pomijany z wpisem w dzienniku, WYŁĄCZNIE po potwierdzonym „wyslano" maila 2 (K1: poczta leży → mail 1 wychodzi). Przelew bez zmian — dwa maile w odstępie dni |
| 2 | „nie mogę z Moich kursów wrócić do konta" | Zmierzone: zero odnośników do `/my-account/` na całej stronie — drzwi z W6 były jednokierunkowe | **Pozycja „Moje konto" w menu** obok „Moich kursów", tylko dla zalogowanego, w obu nawigacjach, z `aria-current` na stronach konta |
| 3 | „co to za mail »Hasło zostało zmienione«?" | `wp_password_change_notification()` rdzenia — powiadomienie DO ADMINA (nie do klienta) o każdej zmianie hasła; przy sprzedaży jeden mail na każdego klienta | **Wyciszone** (zdjęty callback, nie podmieniona funkcja). Mail do klienta z linkiem resetu — inny mechanizm — nietknięty |

Dowody napraw: `smoke-wp-maile` 60 (trzy nowe sceny), `smoke-wp-front` 84,
`smoke-wp-lekcja` 38, dwie reguły strażnika + 4 mutacje (audyt 227).

**Do ponownego obejrzenia po naprawach:** menu po zalogowaniu (pozycja
„Moje konto"), skrzynka przy kolejnym zakupie. Ścieżki C–E i zwrot (D) —
jeszcze przed Tobą.

## Kiedy P6 jest zaliczone

Gdy przejdziesz ścieżki A–E i powiesz, że sens i wygląd są w porządku.
Wtedy **wtyczka `aai-platnosci` (Plugin 2) jest skończona** i zostaje
**Plugin 3 — panel i monitoring** (jego zakres doprecyzowujemy pytaniami
przed startem, decyzja 2026-08-21).
