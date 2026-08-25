# W6 — test ręczny właściciela

Ostatni krok wtyczki `aai-sklep`. **Wtyczka nie jest skończona, dopóki nie
przejdzie tego testu** — taka była decyzja z 2026-08-25 („po KAŻDEJ wtyczce
test ręczny na lokalnym WP z motywem").

Automaty sprawdzają, czy rzeczy **działają**. Ten test odpowiada na inne
pytanie: **czy to, co widzi człowiek, ma sens i wygląda jak nasze.** Tego nie
zmierzy żaden strażnik, bo nie umie mieć wrażenia.

Czas: około 30–40 minut. Nie trzeba robić wszystkiego naraz — ścieżki A–D są
niezależne.

---

## 0. Przygotowanie (5 minut)

```bash
cd "wordpress/srodowisko" && ./postaw.sh        # stawia albo tylko sprawdza
```

Skrypt jest idempotentny i kończy weryfikacją. Adres: **http://127.0.0.1:8892**,
login `admin`, hasło w `wordpress/srodowisko/.env` (klucz `WP_ADMIN_HASLO`).

**Jeśli środowisko stawiasz OD ZERA**, dane wchodzą trzema komendami — nie
jedną:

```bash
npm run wp:import    # kursy z Postgresa do naszych tabel
npm run wp:sync      # kopia w Tutorze (konta i dostęp)
npm run wp:zrzuty    # 148 zrzutów do biblioteki mediów
```

Bez trzeciej lekcje pokażą znacznik „brak pliku" zamiast obrazków.

### Konto KLIENTA — bez niego test nie odpowiada na właściwe pytanie

```bash
npm run wp:klient
```

Zakłada konto `klient-test` (rola `subscriber`, **pasek narzędzi zgaszony**)
i zapisuje je na oba kursy. Hasło ląduje w `wordpress/srodowisko/.env` pod
kluczem `WP_KLIENT_HASLO` — do repozytorium nie wchodzi.

Po co osobne konto: **administrator widzi materiał z definicji.** Oglądając
lekcję na swoim koncie sprawdzasz „czy admin to zobaczy", a pytanie brzmi
„czy klient to zobaczy". Do tego pasek narzędzi WordPressa przesuwa całą
stronę o 32 px i zasłania pigułkę lekcji — czyli widziałbyś układ, którego
klient nigdy nie ogląda.

Po teście: `npm run wp:klient -- --usun`.

> **Wygodnie:** trzymaj dwie przeglądarki albo okno prywatne — w jednym
> `admin`, w drugim `klient-test`. Wtedy zmiana w kreatorze i jej skutek
> u klienta są widoczne obok siebie.

### Stan wyjściowy — to są liczby, które masz zobaczyć

| Kurs | Adres | Cena | Moduły | Lekcje | Sekcje |
|---|---|---|---|---|---|
| Jak poprawnie korzystać z Claude | `/szkolenia/jak-korzystac-z-claude/` | 299 zł | 6 | **41** (wszystkie z treścią) | 12 |
| Jak poprawnie używać GitHuba | `/szkolenia/jak-uzywac-githuba/` | 349 zł | 6 | **32** (wszystkie z treścią) | 12 |

---

## Ścieżka A — gość, który jeszcze nie kupił

Wyloguj się albo otwórz okno prywatne.

- [ ] **Strona główna** `/` — wygląda jak zawsze, nic nie rozjechane.
      W pasku menu jest pozycja **„Szkolenia"** (i w menu mobilnym po zwężeniu
      okna).
- [ ] **Katalog** `/szkolenia/` — hero z mockupem okna kursu, dwie karty kursów
      **równej wysokości**, plakietki, poziom i statystyki (6 modułów,
      41 i 32 lekcje). Karty prowadzą na strony kursów.
- [ ] **Strona sprzedażowa** `/szkolenia/jak-korzystac-z-claude/` — przewiń
      CAŁĄ, od góry do dołu. Sprawdzasz **sens i wygląd**: czy sekcje idą
      w logicznej kolejności, czy nic się nie nachodzi, czy program rozwija
      się płynnie, czy pływająca pigułka u góry prowadzi tam, gdzie mówi.
- [ ] **Obietnice** — czy strona nie obiecuje niczego, czego nie ma?
      (Audyt z 0.33.0 wyprostował wideo, liczby lekcji i pliki do pobrania —
      ale to Ty jesteś ostatnią bramką.)
- [ ] **Drugi kurs** `/szkolenia/jak-uzywac-githuba/` — to samo.
- [ ] **Nieistniejący kurs** `/szkolenia/cokolwiek/` — nasza strona 404,
      ciemna, z przyciskiem powrotu. NIE strona 404 WordPressa.
- [ ] **Stare adresy** — `/courses/jak-korzystac-z-claude/` ma przerzucić Cię
      na `/szkolenia/jak-korzystac-z-claude/`, a `/courses/` na `/szkolenia/`.
      Klient nigdy nie ma zobaczyć wyglądu Tutora.
- [ ] **Materiał jest towarem** — wejdź na adres lekcji, np.
      `/courses/jak-korzystac-z-claude/lessons/testy-i-ewaluacje-jakosci-odpowiedzi/`.
      Ma być **zaproszenie zamiast treści**: ani jednego akapitu prozy.

---

## Ścieżka B — klient po zakupie (najważniejsza)

Zaloguj się jako `klient-test`.

- [ ] **„Moje kursy" są w menu** — zaraz obok „Szkolenia". Pozycja pojawia się
      TYLKO zalogowanemu, który ma choć jeden kurs.
- [ ] **`/szkolenia/moje/`** — lista kupionych kursów: okładka, plakietka,
      pasek postępu, licznik „0 z 41 lekcji · 0%" i przycisk, który prowadzi
      do pierwszej NIEODHACZONEJ lekcji („Zacznij kurs" → „Kontynuuj naukę"
      → „Przeczytaj jeszcze raz").
- [ ] **Panel Tutora nie pokazuje się klientowi** — wpisz `/dashboard/`
      w pasku adresu. Ma przerzucić na „Moje kursy". (Do W6 był tam
      pełnoekranowy interfejs Tutora z oknem powitalnym o cudzym kursie
      fotografii — dlatego to sprawdzamy.)
- [ ] **Wejście na lekcję** — ten sam adres co wyżej. Teraz ma być pełna
      lekcja: hero z pozycją w kursie („Lekcja 39 z 41"), treść w kolumnie
      czytania, zrzuty ekranu z podpisami.
- [ ] **Wygląd to NASZ wygląd** — ten sam, który przyjąłeś przy 0.34.0.
      Ma nie być ani śladu stylu Tutora.
- [ ] **Pigułka u góry** — rozwiń program: widać moduł, listę lekcji
      i pasek postępu (`0 / 41` na start). Rozwiń spis sekcji lekcji —
      kotwice mają skakać do właściwych miejsc.
- [ ] **Bloki prozy** — „Czego się nauczysz", „Zrób to teraz", „Zapamiętaj",
      „Co dalej", „Prompty", „Gdy coś nie działa": każdy ma swoją ikonę
      i pudełko. Sprawdź, czy akcent na „Zrób to teraz" nie razi.
- [ ] **Zrzuty** — otwierają się, mają podpisy, nie skaczą przy wczytywaniu
      (miejsce jest zarezerwowane).
- [ ] **Strzałka „wróć" (sygnet A w pigułce)** — jako KUPUJĄCY ma wracać do
      „Moich kursów", nie na stronę sprzedażową. (Gość na darmowej zapowiedzi
      trafia na stronę sprzedażową i tak ma być.)
- [ ] **Nawigacja** — „poprzednia" i „następna" prowadzą do sąsiednich lekcji;
      na pierwszej i ostatniej lekcji kursu widać „początek/koniec kursu".
- [ ] **Postęp** — odhacz lekcję. Licznik ma się zmienić, a odznaczenie
      przeżyć przeładowanie strony.
- [ ] **Wąskie okno** — zwęź przeglądarkę do szerokości telefonu. Pigułka,
      treść i zrzuty mają zostać czytelne.
- [ ] **Drugi kurs** — wejdź w dowolną lekcję kursu o GitHubie: liczby mają
      się zgadzać z jego programem (32 lekcje), a nie z poprzedniego.

---

## Ścieżka C — właściciel w kreatorze

Zaloguj się jako `admin`, wejdź w **Kokpit → Automatic AI → Kursy**.

- [ ] **Lista** — dwa kursy, stan „opublikowany", liczniki: sekcje `12/12`,
      program, **treść lekcji `41/41`** i `32/32`.
- [ ] **Edytor kursu** — otwórz kurs. Trzy zakładki (Kurs / Sekcje strony /
      Program) i JEDEN przycisk „Zapisz kurs". Przełączanie zakładek nie ma
      gubić niezapisanych zmian.
- [ ] **Zmiana, którą widać** — popraw jedno zdanie w dowolnej sekcji
      sprzedażowej, zapisz, odśwież stronę kursu na froncie. Ma być nowa treść.
- [ ] **Zmiana treści lekcji** — zakładka Program → przycisk **Treść** przy
      lekcji. Dopisz zdanie, zapisz. W drugim oknie (jako `klient-test`)
      odśwież tę lekcję — zdanie ma tam być.
- [ ] **Kopia w Tutorze nadąża** — po tych zapisach uruchom
      `npm run wp:tutor`. Ma nie zgłosić rozjazdu. (Kopia jedzie po KAŻDYM
      zapisie, nie tylko przy publikacji.)
- [ ] **Ochrona treści** — w zakładce Program spróbuj usunąć lekcję, która ma
      materiał, i zapisać. Ma przyjść **odmowa z liczbą lekcji** i osobny
      przycisk „zapisz mimo to". Nie potwierdzaj — wróć.
- [ ] **Okładka z biblioteki mediów** — przycisk otwiera bibliotekę,
      wybrany obraz zapisuje się i pokazuje w katalogu.
- [ ] **Ukryj i opublikuj** — ukryj kurs na liście. Jako gość ma zniknąć
      z katalogu i dawać 404. Opublikuj z powrotem.
- [ ] **Cofnij zmiany testowe** — przywróć poprawione zdania albo wgraj
      dane od nowa: `npm run wp:import && npm run wp:sync`.

---

## Ścieżka D — czy nie zepsuliśmy motywu

- [ ] **Menu konta ma „Moje kursy" jako pierwszą pozycję** — to nią klient
      wraca do kursu, gdy zacznie od `/my-account/`.
- [ ] **`/my-account/` i `/my-account/edit-account/`** — strony konta
      WooCommerce mają wyglądać jak część serwisu: menu konta w ciemnym
      panelu, aktywna pozycja w kolorze volt, pola formularza ciemne,
      przycisk „Save changes" w akcencie marki. (Do W6 renderowały się bez
      stylów — to było pierwsze zgłoszenie z tego testu.)
- [ ] `/` , `/uslugi/`, `/kontakt/` — wyglądają jak przed wtyczką. Sprawdzasz
      to, bo raz już się zdarzyło: arkusz Tutora łamał stronę główną
      (0.38.0), a przyczyna była w warstwach kaskady Tailwinda.
- [ ] **Stopka** na naszych stronach i na stronie motywu — identyczna.
- [ ] **Nagłówek** nie zasłania treści na żadnej z naszych stron.

---

## Co jest POZA zakresem W6 — nie zgłaszaj tego jako błędu

| Rzecz | Dlaczego tak jest |
|---|---|
| Przycisk zakupu prowadzi do `/kontakt` | koszyk, płatności i faktury bierze **WooCommerce w Pluginie 2**; własnej kasy nie piszemy |
| W Tutorze kurs ma cenę `Free` | sprzedaż wchodzi z Pluginem 2 |
| `Offer.availability` = `PreOrder` w danych strukturalnych | na `InStock` zmieniamy razem z płatnościami |
| `/student-registration/` pokazuje „Access Denied" | rejestracja jest w tej instalacji wyłączona; konta zakłada Plugin 2 mailem „Ustaw hasło" |
| Brak maili po zakupie | Plugin 2 |
| Brak HTTPS, domena `automaticai.pl` niekupiona | hosting i domena, poza modułami |
| **Cztery lekcje otwierają się BEZ logowania** | świadoma próbka: w naszych tabelach mają `preview = 1` (pierwsza lekcja modułu 1 i jednego dalszego modułu w każdym kursie). Bramka działa zgodnie z danymi. **Decyzja właściciela 2026-08-25: zostają wszystkie cztery** |
| Zobowiązania handlowe na stronach sprzedażowych (gwarancja 30 dni, dostęp bez limitu, „odpowiadam osobiście") | wymagają Pluginu 2/3 — audyt z 0.33.0 zostawił je świadomie **do Twojej decyzji** |

---

## Gdy znajdziesz błąd

1. Zapisz **co widziałeś** i **czego się spodziewałeś** — zrzut ekranu jest
   najlepszy, bo dwa razy w tym projekcie zrzut właściciela pokazał rzecz,
   której nie zapalał żaden automat (0.39.1 i 0.40.0).
2. Poprawki wchodzą na gałąź **`feat/w6-test-reczny`**, wg
   [CONTRIBUTING.md](../../CONTRIBUTING.md).
3. Błąd z klasą, która może wrócić, dostaje wpis w
   [rejestr/znane-bledy.json](../../rejestr/znane-bledy.json) i **strażnika
   przeciw nawrotom** — bez tego naprawa jest tylko obietnicą.

## Kiedy W6 jest zaliczone

Gdy przejdziesz ścieżki A–D i powiesz, że wygląd i sens są w porządku.
Wtedy **wtyczka `aai-sklep` (Plugin 1 na WordPressie) jest skończona**
i przechodzimy do **Pluginu 2 — płatności** (przed startem trzeba rozstrzygnąć,
**gdzie mieszka cena**: w naszej tabeli czy w produkcie WooCommerce —
[ETAP-WP.md](../ETAP-WP.md), sekcja „Plugin 2").
