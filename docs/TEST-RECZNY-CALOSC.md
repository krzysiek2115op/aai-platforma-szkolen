# Test ręczny CAŁOŚCI — trzy wtyczki naraz

**Ostatni krok etapu WordPress.** Wzorcem są
[W6-TEST-RECZNY.md](plugin-1/W6-TEST-RECZNY.md),
[TEST-RECZNY-P6.md](plugin-2/TEST-RECZNY-P6.md) i
[TEST-RECZNY-T4.md](plugin-3/TEST-RECZNY-T4.md) — ale ten test pyta o co
innego niż tamte trzy.

Każda wtyczka przeszła własny test i własny przegląd **osobno**. Ten test
pyta o **szwy**: o miejsca, w których jedna wtyczka podaje coś drugiej,
a żadna z nich nie jest za to sama odpowiedzialna. Bramka umie sprawdzić,
że każda z osobna działa. Nie umie sprawdzić, że **razem opowiadają
klientowi jedną, spójną historię**.

Dlatego to jest **JEDNA ścieżka**, przechodzona po kolei, a nie cztery
osobne. Idziesz nią raz, od strony gościa do panelu właściciela — i po
drodze mijasz wszystkie trzy wtyczki.

> **Pytanie tego testu:** czy to, co widzi klient, zgadza się z tym, co
> ustawiłeś w kreatorze, z tym, za co zapłacił, i z tym, co pokazuje
> monitoring?

---

## KROK ZEROWY — rozkaz, nie rubryka

```
cd "wordpress/srodowisko" && ./postaw.sh
```

**Uruchom to, nawet jeśli „przecież działało".** Lekcja Z1 z 0.51.0
i powtórka przy T1: przełączenie gałęzi albo `git clean` odtwarza katalog
na dysku, a kontener trzyma stary **inode** — wtyczka wtedy po prostu
znika, strona oddaje 200, reszta działa, i wygląda to na błąd kodu, a jest
błędem montowania. To samo dotyczy łapacza poczty: bez niego zamówienie
przejdzie, a mail nigdy nie dojdzie (dokładnie to zgłosiłeś jako Z1).

`postaw.sh` kończy kodem 0 i sam sprawdza, czy kontener widzi wszystkie
pięć wtyczek i mu-plugin poczty. **Jeśli zgłosi cokolwiek — napisz mi to,
zanim zaczniesz test.**

---

## Stan wyjściowy — zmierzony przed oddaniem Ci tego dokumentu

| Co | Ile |
|---|---|
| Kursy | **2**, oba opublikowane: Claude **299,00 zł**, GitHub **349,00 zł** |
| Lekcje z treścią | **73** (proza zgodna z prototypem co do znaku) |
| Darmowe zapowiedzi | **4** — po dwie na kurs |
| Produkty WooCommerce | 2, powiązania 2 |
| **Sprzedaż** | **OTWARTA** (otworzyłem ją na potrzeby tego testu) |
| Zamówienia | **0** |
| Konta | `admin`, `klient-test` |
| Monitoring | **12 logowań, 16 odsłon, 6 sesji** — to Twoje dane z testu T4 |
| Skrzynka `:8893` | **1 wiadomość** — powiadomienie z postawienia środowiska, nie Twoja |

**Monitoringu NIE czyściłem.** W T4 tabele były puste, żeby każda liczba
miała znanego autora; tu jest odwrotnie — chcę zobaczyć, czy **Twój nowy
ruch dołoży się do starego**, a nie czy powstaje na czystym.

**Adresy:** sklep `http://127.0.0.1:8892/szkolenia/` · kokpit
`http://127.0.0.1:8892/wp-admin` · poczta `http://127.0.0.1:8893`

**Kopia bazy sprzed testu:** `~/.cache/aai-kopie/przed-testem-calosci-recznym.sql`
(6,9 MB). Jest, bo jeden krok tej ścieżki dotyka przycisku „Usuń".

---

# ŚCIEŻKA — jedna, po kolei

Numeracja jest wiążąca: kroki 6–8 zakładają, że zrobiłeś 1–5.

## 1. Gość ogląda ofertę

**Wyloguj się** (albo otwórz okno prywatne — to ważne, patrz niżej).

1. Wejdź na `/szkolenia/`. Czy widzisz oba kursy, z cenami i z liczbami
   modułów i lekcji?
2. Wejdź w **Jak poprawnie korzystać z Claude**. Przeczytaj stronę do
   końca — to jest Twoja strona sprzedażowa, ta sama, którą przyjąłeś przy
   B5.
3. **Zwróć uwagę na zdanie o dostępie.** Ma brzmieć „Dostęp zaraz po
   zaksięgowaniu wpłaty" (w domknięciu strony i na liście „w cenie"),
   a FAQ ma tłumaczyć to zdaniem, nie hasłem. Do wczoraj strona obiecywała
   „od razu po zakupie", co przy przelewie było nieprawdą. **To brzmienie
   jest moją propozycją — jeśli chcesz inne, powiedz.**

> **SZEW:** cena i przycisk pochodzą z WooCommerce (Plugin 2), a cała
> reszta strony z naszych tabel (Plugin 1). Jeśli cena w nagłówku i cena
> przy przycisku się różnią — to jest błąd.

## 2. Gość próbuje czytać

4. W programie kursu znajdź lekcję z etykietą **„przeczytaj za darmo"**
   (są dwie na kurs). Kliknij. Masz przeczytać **całą** lekcję, bez
   logowania.
5. Wróć i kliknij **dowolną inną** lekcję. Masz zobaczyć **bramkę** —
   zaproszenie do zakupu, a nie treść i nie pusty ekran.

> **SZEW:** o dostępie decyduje Tutor (zapis na kurs), ale wygląd strony
> jest nasz. Gdybyś zobaczył choć akapit płatnej lekcji — to wyciek.

## 3. Zakup — jako NOWY klient

**Nie używaj konta `klient-test`** — ono ma już oba kursy. Chodzi o drogę,
którą przejdzie prawdziwy pierwszy klient.

6. Kliknij przycisk zakupu („Dołączam za 299 zł"). Masz trafić **prosto do
   kasy**, z kursem w koszyku — bez postoju na koszyku.
7. W kasie podaj adres e-mail, którego wcześniej nie było, np.
   `pierwszy.klient@example.test`. Wybierz **Przelew bankowy**. Złóż
   zamówienie.
8. Czy strona podziękowania jest po polsku i w naszym wyglądzie?

## 4. Poczta i dostęp

9. Otwórz `http://127.0.0.1:8893`. Ma tam być mail **„Ustaw hasło"** — bez
   hasła w treści, z jednym przyciskiem.
10. **Jeszcze nie klikaj.** Wróć do kokpitu → **WooCommerce → Zamówienia**.
    Twoje zamówienie stoi jako **wstrzymane** — to jest prawda o przelewie:
    pieniądze nie doszły. Zmień status na **zrealizowane** (to jest ten
    moment, w którym u siebie zobaczyłbyś przelew na koncie).
11. Wróć do skrzynki. Ma dojść drugi mail: **„Twój kurs jest gotowy"**.

> **SZEW — najważniejszy w całym teście:** zamówienie w WooCommerce →
> zapis na kurs w Tutorze → mail od nas. Trzy różne systemy, jedna
> obietnica. Jeśli klient dostaje mail, ale nie ma kursu (albo odwrotnie),
> to jest ten błąd, dla którego ten test istnieje.

## 5. Klient czyta to, za co zapłacił

12. Kliknij link z maila, ustaw hasło. **Czy po ustawieniu hasła trafiasz
    do sklepu, czy na surowy ekran WordPressa?** (Ma być sklep.)
13. Wejdź w **Moje kursy**. Ma tam być jeden kurs, z paskiem postępu
    i przyciskiem do pierwszej lekcji.
14. Przeczytaj lekcję — tę samą, która w kroku 5 pokazywała bramkę.
    Ma być cała, ze zrzutami ekranu.
15. Sprawdź **Moje konto** w menu — czy prowadzi do konta, a nie donikąd.

**Zostaw tę kartę zalogowaną** — wrócisz do niej w kroku 7.

## 6. Właściciel zmienia coś w kreatorze

W drugiej karcie (albo po zalogowaniu jako `admin`): kokpit → **Automatic
AI**.

16. Wejdź w kurs, którego klient **nie kupił** (GitHub). Zmień **cenę**
    na inną, zapisz.
17. Sprawdź na `/szkolenia/`, czy nowa cena jest w katalogu **i** na
    stronie kursu. Wejdź do kasy z tym kursem — czy kasa liczy **tę samą**
    kwotę?

> **SZEW:** cena mieszka w naszej tabeli, a do WooCommerce jedzie kopią po
> każdym zapisie. Rozjazd „katalog nowa cena, kasa stara" to dokładnie ten
> błąd, którego szukamy. Cenę potem przywróć (349,00 zł) albo zostaw —
> powiedz mi, co wybrałeś.

18. Zmień **jedno zdanie** w treści dowolnej lekcji kursu, który klient
    kupił, i zapisz. Wróć na kartę klienta i odśwież tę lekcję — czy
    zmiana tam jest?

## 7. „Ukryj" — czy klient traci kurs (to jest naprawa C1)

19. Na liście kursów kliknij **Ukryj** przy kursie, który klient **kupił**.
20. Jako **gość** (okno prywatne) wejdź na adres tego kursu — masz dostać
    **404**. Kurs zniknął ze sklepu.
21. Sprawdź też darmową zapowiedź tego kursu — dla gościa ma być
    **zamknięta**. Kurs nie jest już w sprzedaży, więc nie ma czego
    zapowiadać.
22. **Wróć na kartę klienta i odśwież lekcję.** Klient ma czytać **dalej**.
    To jest cała istota tej naprawy: do wczoraj dostawał tu 404.
23. Kliknij **Opublikuj**, żeby przywrócić stan. Sprawdź, czy zapowiedź
    znowu jest otwarta dla gościa.

## 8. „Usuń" — czy ostrzega liczbą (to jest naprawa C2)

24. Na liście kursów kliknij **Usuń** przy kursie, który klient kupił.
25. Pierwsze pytanie dotyczy **treści** („RAZEM z napisaną treścią N
    lekcji?"). Potwierdź je.
26. **Drugie pytanie ma podać liczbę kupujących** („Ten kurs ma N
    kupujących — stracą dostęp…").
    **⚠️ TU KLIKNIJ ANULUJ.** Nie kasuj kursu.
27. Sprawdź, że kurs dalej jest na liście i że klient dalej go czyta.

> Jeśli przez pomyłkę potwierdzisz oba pytania — nic nie jest stracone,
> ale napisz mi to od razu. Mam kopię bazy sprzed testu.

## 9. Monitoring — czy widać to, co przed chwilą zrobiłeś

28. Kokpit → **Automatic AI → Monitoring**.
29. W dzienniku logowań mają być **Twoje dzisiejsze logowania** — także to
    automatyczne, z kasy (klient nie wpisywał hasła, a jednak został
    zalogowany).
30. W ruchu mają dojść **dzisiejsze odsłony**, doliczone do tych 16
    z T4 — a wśród najczęściej czytanych stron te, po których przed chwilą
    chodziłeś.

> **SZEW:** monitoring nie wie nic o sklepie ani o płatnościach. Ma
> zobaczyć Twój ruch dlatego, że mierzy stronę, a nie dlatego, że ktoś mu
> o niej powiedział. **Twój ruch jako zalogowanego admina NIE jest liczony**
> (decyzja D3) — dlatego kroki 1–5 miały być w oknie prywatnym.

## 10. Czy nie zepsuliśmy strony

31. Wejdź na `http://127.0.0.1:8892/` — stronę główną Automatic AI.
    Wygląda tak, jak ma wyglądać? Menu ma pozycję **Szkolenia**?
32. Kliknij coś, czego nie ma (`/nie-istnieje/`) — ma być nasza strona
    „nie znaleziono", a nie pusty ekran.

---

## Czego NIE zgłaszać — to jest poza zakresem

| Co zobaczysz | Dlaczego tak ma być |
|---|---|
| Jedyna metoda płatności to **przelew** | Prawdziwa bramka (Tpay/PayU/P24/BLIK) to pozycja „przed pierwszym klientem", nie moduł |
| Adres `127.0.0.1:8892`, brak HTTPS | Środowisko robocze; domena i certyfikat to wdrożenie |
| Maile trafiają do Mailpita, nie na pocztę | Łapacz poczty istnieje po to, żeby test niczego nie wysłał w świat |
| **Cztery lekcje otwarte bez logowania** | Twoja decyzja z W6 (2026-08-25): po dwie zapowiedzi na kurs, celowo |
| Kurs w Tutorze wygląda „nie nasz” | Klient tam nie trafia — `/courses/…` oddaje 301 na naszą stronę; Tutor jest tylko silnikiem kont i dostępu |
| Brak regulaminu, brak zgody na natychmiastowe dostarczenie | Czeka na Twoją decyzję i (dla zgody) na prawnika — pozycja „przed pierwszym klientem" |
| Polityka prywatności wypiera się ciastek, choć one są | Rozjazd **starszy** od naszych wtyczek; zgłoszony, świadomie nietknięty (treść prawna należy do Ciebie) |
| Panel monitoringu nie ma wykresów | Twoja decyzja z 2026-08-31: ekran zostaje taki, jaki jest |

---

## Co wiem przed testem i czego nie naprawiałem

- **`smoke-wp-motyw` bywa niestabilny w pełnym przelocie bramek** — pada
  2 z 91 i przechodzi osobno 91/91. Znam to od T1, przyczyny nie
  ustaliłem, nie dotyczy niczego, co zobaczysz.
- **Sześć pozycji „plauzybilnych"** z przeglądu architektury zostaje
  otwartych świadomie (m.in. brak memoizacji na stronie kursu). Żadna nie
  jest dziś czynna — dotyczą wydajności albo cudzego kodu, nie
  poprawności.
- **Zamówienia i konta z Twoich wcześniejszych testów nie wróciły** po
  odtworzeniu środowiska od zera. Ich identyfikatory już nie istnieją,
  a wstawianie ich na siłę dałoby dane, które kłamią.

---

## Co sprawdziłem przelotem kontrolnym, zanim to dostałeś

Żeby nie zmarnować Twojej rundy na usterce środowiska (lekcja Z1),
przeszedłem tę ścieżkę sam: `node --env-file=.env tools/smoke/przelot-calosc.mjs`
— **37 z 37 sprawdzeń zaliczonych**. Sonda sprząta po sobie (przywraca
stan kursu i dziennik logowań) i po jej przebiegu środowisko jest w stanie
opisanym w tabeli wyżej — sprawdzone po fakcie, nie założone.

Co ona potwierdziła, żebyś nie tracił na to czasu:

- sprzedaż otwarta, konta dwa, zapowiedzi cztery, łapacz poczty odpowiada;
- katalog pokazuje oba kursy, obie strony sprzedażowe oddają 200 i niosą
  **nowe** zdanie o dostępie (a starego nie ma na żadnej z nich);
- gość czyta darmową zapowiedź w całości, a na płatnej lekcji dostaje
  bramkę bez ani zdania prozy;
- produkt kursu wchodzi do koszyka, a kasa z kursem odpowiada 200;
- kupujący czyta płatną lekcję i ma „Moje kursy";
- **ukrycie kursu**: gość dostaje 404, zapowiedź się zamyka, a kupujący
  czyta dalej — i po przywróceniu wszystko wraca;
- **usunięcie kursu z kupującymi**: warstwa zapisu odmawia i podaje liczbę;
- ekran monitoringu odpowiada i mówi, co zbiera; strona główna 200;
  nieistniejący adres oddaje 404 z naszą stroną, nie pustką.

**Czego przelot NIE sprawdził — i po to jest Twoja runda:** prawdziwej
kasy klikanej w przeglądarce (kroki 6–8), obu maili z łapacza (9, 11),
ustawiania hasła z linku (12) i tego, czy **napisy** znaczą to, co przez
nie rozumiesz.

---

## Gdy znajdziesz błąd

Napisz **co zrobiłeś, co zobaczyłeś i czego się spodziewałeś** — w tej
kolejności. Nie musisz zgadywać przyczyny; od tego jestem ja. Jeśli
zobaczysz coś dziwnego, ale nie masz pewności, czy to błąd — zgłoś.
Trzy z czterech najcięższych znalezisk tego projektu wyszły z Twoich
zgłoszeń „coś tu jest nie tak", a nie z bramek.

---

## Kiedy test jest zaliczony

Gdy przejdziesz wszystkie dziesięć kroków i powiesz, że **historia się
zgadza**: to, co obiecuje strona, to, co dostaje klient, to, co ustawiłeś
w kreatorze, i to, co pokazuje monitoring, mówią to samo.

Po zaliczeniu: poprawki z testu → CHANGELOG + README → **PR jedną
gałęzią** → tag → release. **To domyka etap WordPress.**
