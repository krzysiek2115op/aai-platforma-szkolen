# BRIEF PROJEKTU — jedyne wejście wiedzy dla audytora

**Etap E3.** Ten plik zastępuje `CLAUDE.md` jako wejście wiedzy o projekcie.
Powód jest liczbowy: `CLAUDE.md` waży **237 476 B**, a czyta go **38 agentów
audytu w dwóch falach**. Brief daje tę samą wiedzę za ułamek kosztu i — co waży
więcej dla K4′ — **jest identyczny w obu falach**, więc sam nie wprowadza
rozjazdu.

---

## Jak czytać ten plik

**To są FAKTY, nie werdykty.** Brief mówi, **co jest**, nigdy **czy jest
dobrze**. Zdanie „warstwa zapisu odmawia skasowania lekcji z treścią bez flagi
`pozwol_skasowac_tresc`" opisuje mechanizm i wolno go podważyć. Gdyby brzmiało
„warstwa zapisu **poprawnie** chroni treść", audytor dostałby werdykt zamiast
materiału i nie mógłby znaleźć niczego, czego my nie znaleźliśmy.

**Brief celowo NIE zawiera naszych ocen** — patrz ostatnia sekcja.

Trzy zasady nadrzędne obowiązują niezależnie od tego pliku: **nie ma wymyślania
błędów · audyt nie naprawia · drążysz własne znalezisko sam**.

---

## 1. Czym jest produkt

Sklep z kursami online sprzedawanymi przez stronę **Automatic AI**
(`automaticai.pl` — domena jeszcze niekupiona). Dwa kursy tekstowe: „Jak
poprawnie korzystać z Claude" i „Jak poprawnie używać GitHuba". Klient kupuje
kurs, dostaje konto i czyta materiał za logowaniem.

**Produkt docelowy to trzy wtyczki WordPressa.** Prototyp w Next.js istnieje
i jest **specyfikacją wykonawczą oraz źródłem treści**, nie produktem.

Stan: wszystkie trzy wtyczki skończone i przeszły test ręczny właściciela;
etap WordPressa zamknięty. Sprzedaż jeszcze nie ruszyła — nie ma prawdziwej
bramki płatności, regulaminu ani domeny.

---

## 2. Architektura

```
              WordPress (jedna instalacja)
  ┌──────────────────────────────────────────────────────┐
  │  MOTYW "automatic-ai"  — cudzy, generowany, Tailwind 4│
  │  (klasyczny: header.php/footer.php, BEZ theme.json,   │
  │   nawigacja WPISANA NA SZTYWNO, bez wp_nav_menu())    │
  ├──────────────────────────────────────────────────────┤
  │  NASZE:                    │  CUDZE (gotowe):        │
  │   aai-sklep     28 klas    │   Tutor LMS 4.0.7       │
  │   aai-platnosci 13 klas    │   WooCommerce 11        │
  │   aai-monitor   13 klas    │                         │
  └──────────────────────────────────────────────────────┘
```

**Podział odpowiedzialności jest decyzją, nie przypadkiem:**

| Robimy sami | Bierzemy gotowe |
|---|---|
| katalog, strony sprzedażowe, kreator treści, widok lekcji, audyt zmian, monitoring | konta, koszyk, kasa, płatności, faktury, dostęp do materiału za logowaniem |

`aai-platnosci` **nie jest kasą ani bramką płatności** — jest **szwem** między
naszym kursem a produktem WooCommerce.

**Prototyp Next.js:** 15 371 linii TS/TSX, Postgres `db1_kursy`, działy D1–D7
i bramki B1–B7. Jego przepływ (`BAZA → DZIAŁ → STRONA`, jedna baza = jeden AJAX
+ kanał JSON obok, strona nigdy nie dotyka bazy) jest wzorcem, na który wtyczki
zostały przełożone.

---

## 3. Dane — dziewięć tabel

Wszystkie z prefiksem instalacji (`wp_`) i prefiksem wtyczki. Zbudowane
`dbDelta`; **audyt zmian pisze PHP, nie triggery** — świadome odstępstwo od
prototypu, bo uprawnienie `TRIGGER` bywa na hostingu odebrane.

| Wtyczka | Tabele |
|---|---|
| `aai-sklep` | `courses` · `modules` · `lessons` · `sections` · `changelog` |
| `aai-platnosci` | `powiazania` (kurs ↔ produkt Woo) · `dostawy` (czy klient dostał dostęp i mail) |
| `aai-monitor` | `logowania` (90 dni, **pełne IP**) · `wizyty` (400 dni, **bez IP, bez związku z kontem**) |

**„Własna baza" znaczy własne tabele z własnym prefiksem w bazie WordPressa**,
nie osobną bazę MySQL.

### Źródło prawdy i kopie — główne ryzyko tej architektury

```
 NASZE TABELE  ──kopia jednokierunkowa──▶  wpisy Tutora (courses/topics/lesson)
 (źródło prawdy)                            po KAŻDYM udanym zapisie
        │
        └────cena regularna───────────▶  produkt WooCommerce
                                          (ceny promocyjnej nie dotykamy nigdy)
```

Kopia biegnie **tylko w jedną stronę**, dopasowanie po `_aai_zrodlo_uuid`
(nie po slugu). Rozjazd tych kopii jest nazwany w projekcie jako główne ryzyko;
istnieją komendy kontrolne `wp aai-sklep sprawdz-tutora` i
`wp aai-platnosci sprawdz`, obie kończące kodem 1 przy rozjeździe.

**Postęp klienta w kursie liczy Tutor**, nie my — świadomie, żeby nie powstała
druga kopia tej samej prawdy.

---

## 4. Przepływ żądania

**W prototypie** (WYTYCZNE §8): `BAZA ==AJAX==> DZIAŁ --JSON--> strona`.
Jedna baza = **jeden** punkt zapisu; odczyt idzie osobnym kanałem; strona nigdy
nie dotyka bazy.

**We wtyczkach WordPressa** wystrzałem jest **`admin-post.php`** z nazwanymi
akcjami. Zmierzone: **zero** `register_rest_route`, **zero rejestracji**
`add_action( 'wp_ajax_…` — konwencja jest konsekwentna we wszystkich trzech
wtyczkach. Nazwa akcji jedzie w query stringu (`$_REQUEST`), bo ciała
`application/json` PHP nie wkłada do `$_POST`, a `admin-post.php` rozgałęzia się
po `is_user_logged_in()` na dwa **rozłączne** haki (`admin_post_` dla
zalogowanego, `admin_post_nopriv_` dla gościa) — akcja dostępna obu stronom musi
mieć zarejestrowane **oba**.

**Rejestracji `admin_post_*` jest sześć, nazw akcji pięć:** cztery w kreatorze
(`Aai_Sklep_Panel_Akcje` — zapis kursu, zapis lekcji, stan kursu, usunięcie
kursu) i dwie w monitoringu, gdzie **ta sama** akcja beaconu jest zarejestrowana
na obu hakach naraz.

> **DWIE PUŁAPKI POMIAROWE przy sprawdzaniu tego akapitu — obie wpadły przy
> pisaniu briefu.**
> 1. Gołe `grep -r "wp_ajax_"` daje **2** trafienia, oba w **komentarzach**
>    mówiących, że tej konwencji się nie używa. Pytaj o **rejestrację**
>    (`add_action(\s*.wp_ajax_`), nie o obecność napisu.
> 2. **Nazwy akcji są SKŁADANE**: `add_action( 'admin_post_' . self::ZAPISZ_KURS, … )`.
>    Wzorzec `admin_post_[a-z_]+` znajduje **1 z 6** rejestracji. Szukaj
>    `admin_post_.\s*\.` albo stałych klasy.
>
> To ta sama klasa, która w tym repo **dziewięć razy** zzieleniła strażnika przy
> zepsutym kodzie — i która, jak widać, łapie też tego, kto o niej pisze.

**Do naszych tabel pisze wyłącznie warstwa zapisu** — po jednej na wtyczkę:
`Aai_Sklep_Zapis`, `Aai_Platnosci_Zapis`, `Aai_Monitor_Zapis`.

Reguła obowiązująca w całej warstwie zapisu sklepu: **brak klucza w żądaniu
znaczy „nie ruszaj"** — dla treści lekcji, materiałów, sekcji, programu i stanu
kursu. Zapis kursu odmawia skasowania lekcji z treścią bez jawnej flagi
`pozwol_skasowac_tresc`, a usunięcia kursu z kupującymi bez
`--pozwol-stracic-dostep`.

---

## 5. Siedem szwów między wtyczkami — zmierzone

Każdy z nich to miejsce, w którym jedna wtyczka mówi drugiej coś o świecie.
Pozycje sprawdzone `grep`, nie przepisane.

| Szew | Wystrzał | Nasłuch |
|---|---|---|
| `aai_sklep_kurs_zmieniony` | `aai-sklep/…/zapis.php:921` | `aai-sklep/…/tutor.php:140` |
| `aai_sklep_kurs_usuniety` | `aai-sklep/…/zapis.php:187` | `aai-sklep/…/tutor.php:141` |
| `aai_sklep_cena_kursu` | `aai-sklep/…/widok.php:168` | `aai-platnosci/…/cena.php:37` |
| `aai_sklep_cta_kursu` | `aai-sklep/…/widok.php:260` | `aai-platnosci/…/cta.php:44` |
| `aai_sklep_dostepnosc_kursu` | `aai-sklep/…/seo.php:293` **(wywołanie wieloliniowe)** | `aai-platnosci/…/cta.php:51` |
| `aai_sklep_zamowienia_w_drodze` | `aai-sklep/…/odczyt-panelu.php:98` | `aai-platnosci/…/szew.php:44` |
| `aai_monitor_strona_za_bramka` | `aai-monitor/…/pomiar.php:130` | `aai-sklep/…/lekcja.php:62` |

Sześć biegnie od sklepu na zewnątrz; **siódmy jest jedyny w drugą stronę** —
pyta monitoring, odpowiada widok lekcji sklepu.

**Pułapka pomiarowa:** wystrzał `aai_sklep_dostepnosc_kursu` jest rozbity na
pięć linii, więc `grep` jednoliniowy go **nie widzi**. Zakres liczony wzorcem
jednoliniowym pokazałby sześć szwów zamiast siedmiu.

---

## 6. Decyzje, które zmieniają, co JEST błędem

Bez nich audytor zgłosi jako usterkę rzecz rozstrzygniętą, a przeoczy prawdziwą.

| Decyzja | Konsekwencja dla audytu |
|---|---|
| **E-booków nie ma i nigdy nie będzie** | obietnica pliku do pobrania na stronie = błąd |
| **Nie ma wideo** — produkt jest tekstowy | „lekcje wideo" w treści = błąd; `duration_min` znaczy „czas przerobienia", nie długość filmu |
| **Zwrotu i gwarancji 30 dni NIE obiecujemy** | pojawienie się takiej obietnicy = błąd; brak mechanizmu zwrotu = **nie** błąd |
| **Sprzedaż zamknięta do czasu prawdziwej bramki** | `PreOrder` w danych strukturalnych i CTA na `/kontakt` są stanem zamierzonym |
| **Cena mieszka w `courses.price_grosze`** | cena regularna w Woo jest **kopią**; ręczna zmiana w Woo wraca przy następnym zapisie — to koszt świadomy |
| **Ceny promocyjnej Woo nie dotykamy nigdy** | zapis do `_sale_price` = błąd |
| **Kursy poza zakresem audytu (D4)** | 331 plików `tresc-kursow/` i cytaty źródłowe pomijamy |
| **Cztery lekcje otwarte bez logowania** to zapowiedzi | dostęp gościa do nich = **nie** wyciek |
| **Klient nietechniczny nie otwiera sprzedaży sam** | flaga zmienia się komendą WP-CLI — zapisane, nie przeoczone |
| **Monitoring nie mierzy zalogowanych adminów** | brak admina w statystykach = stan zamierzony |
| **Brute force rejestrujemy, nie blokujemy** | brak blokady po serii porażek = decyzja, nie luka |
| **Reguła „czerwone CI = stop" ma nazwany wyjątek** | 16 wersji weszło przy wyczerpanych minutach Actions, decyzją właściciela, na dowodach lokalnych |

---

## 7. Warstwa dowodowa — co dziś pilnuje projektu

| Rodzaj | Liczba | Co robi |
|---|---|---|
| Strażnicy | **39** | skrypty czytające KOD i pytające o niezmienniki |
| Mutacje w audycie strażników | **340** | psują kod i sprawdzają, czy strażnik szczeka |
| Testy jednostkowe | **83** | prototyp |
| Bramki smoke | **16 skryptów `smoke:*`** | mierzą ŻYWĄ instalację `:8892` i prototyp |
| Goldeny | **9** | zapisany stan, do porównania |

Jedna komenda uruchamia to, co przechodzi CI: **`npm run check`** =
strażnicy → lint → `tsc` → testy → build → smoke.

**To jest materiał dla działu QA, nie gwarancja.** Pytanie QA brzmi „czy one
mierzą to, co obiecują" — i ma po temu powód: regresja jobu „Baza" przeleżała
**piętnaście dni i dwadzieścia wersji**, bo bramka `smoke-csp` weszła do CI
**po** ostatnim zielonym przebiegu i nigdy przez CI nie przeszła. Była zielona
lokalnie, gdzie warunki są inne.

---

## 8. Klasy błędów, które w tym projekcie WRACAŁY

Rejestr `rejestr/znane-bledy.json` ma **30 wpisów**. Nie są to ciekawostki —
każda z tych klas wróciła co najmniej raz.

| Klasa | Ile razy | Na czym polega |
|---|---|---|
| **Wzorzec celujący w NAZWĘ zamiast w rozstrzygnięcie** | **9 nawrotów** | strażnik pyta, czy w pliku jest słowo / nazwa metody / nazwa stałej; przemianowanie albo przeniesienie zapala zieleń przy zepsutym kodzie |
| **Sprawdzenie przechodzące PO PUSTCE** | wielokrotnie | selektor trafia w zero elementów, pętla biegnie po pustej liście, `grep` nie łapie nic — i to wygląda jak sukces |
| **Pomiar maskujący kod wyjścia potokiem** | od D5 | `node skrypt \| tail` gubi status |
| **Bramka sprzątająca CUDZE dane** | kilka razy | test kasuje całą skrzynkę / cudze wiersze zamiast własnych śladów |
| **Brak klucza brany za pustkę** | BLAD-018 | żądanie bez klucza kasowało całe gałęzie kursu i meldowało sukces |
| **Cicha utrata treści** | kilka razy | duplikat `id`, pusty `uuid`, podmiana prefiksu w cudzej treści — dane znikają, wszystko świeci na zielono |
| **Martwy bind mount po `git checkout`** | wielokrotnie | kontener trzyma inode; po przełączeniu gałęzi wtyczka „znika", a objaw wygląda jak błąd kodu |
| **Deklaracja zamiast pomiaru** | stale | dokument twierdzi coś o kodzie, czego nikt nie policzył |

**Wniosek dla audytora:** przy każdym znalezisku sprawdź, czy nie patrzysz na
jedną z tych klas — i czy Twój własny dowód nie należy do dwóch pierwszych.

---

## 9. Mapa obszarów

| Gdzie | Co |
|---|---|
| `wordpress/wtyczki/aai-*/includes/` | 54 klasy PHP, ~24 000 linii — produkt |
| `wordpress/wtyczki/aai-sklep/szablony/` | 37 szablonów — to widzi klient |
| `wordpress/wtyczki/*/assets/` | arkusze i skrypty wtyczek |
| `wordpress/srodowisko/` | `postaw.sh`, `compose.yml`, mu-pluginy (obwód bezpieczeństwa, poczta) |
| `app/`, `components/`, `lib/`, `modules/` | prototyp Next.js |
| `tools/straznicy/` | 39 strażników + audyt mutacyjny |
| `tools/smoke/` | bramki mierzące żywą instalację |
| `docs/` | plan, wytyczne, diagramy, schematy draw.io, instrukcja instalacji |
| `tresc-kursow/` | **poza zakresem (D4)** |
| `audyt/` | ten sektor |

---

## 10. Środowisko

| Co | Gdzie | Jak |
|---|---|---|
| WordPress + Tutor + Woo + nasze wtyczki | `127.0.0.1:8892` | `wordpress/srodowisko/postaw.sh` |
| Skrzynka pocztowa (Mailpit) | `127.0.0.1:8893` | wstaje z `postaw.sh` |
| Postgres prototypu | `db1_kursy` | `npm run db1:up` |
| Prototyp | `:3001` | `npm run dev` |
| Konto klienta testowego | `klient-test` | hasło w `wordpress/srodowisko/.env` |

**Pułapki środowiska, które kosztowały czas i wrócą:**

- **przełączenie gałęzi zabija bind mount wtyczki** (kontener trzyma inode) —
  naprawa zawsze ta sama: `podman-compose down && ./postaw.sh`;
- **kolejność bramek ma znaczenie** — `smoke-seo` i `smoke-podglad` przebudowują
  `.next` na eksport statyczny, więc bramka uruchomiona po nich zastaje inny
  build; uruchamiać `npm run smoke`, nie własną listę;
- **działający `npm run dev` psuje produkcyjny build** (ten sam katalog `.next`);
- **`opcache.revalidate_freq = 2`** — między zmianą pliku PHP a pomiarem trzeba
  odczekać ≥ 3 s, inaczej mierzysz poprzedni stan kodu.

---

## 11. Czego ten brief NIE zawiera — i dlaczego

**Nie zawiera naszych ocen.** `CLAUDE.md` ma kilkanaście miejsc oznaczonych
„sprawdzone i bez zarzutu — nie szukać drugi raz" oraz „przyjęte jak jest, nie
otwierać z własnej inicjatywy". **Rozstrzygnięcie właściciela (2026-09-01): tych
notatek audyt NIE dostaje.**

Powód: powstały z **naszych** przeglądów. Przekazanie ich sprawiłoby, że audyt
odziedziczy nasze martwe pola i **nie będzie mógł znaleźć niczego, czego my nie
znaleźliśmy** — a wtedy dwie fale potwierdziłyby nawzajem naszą własną ślepotę
i nazwalibyśmy to powtarzalnością. Świadomą ceną jest to, że część pracy
zostanie powtórzona.

**Nie zawiera historii projektu.** Kolejność kroków, numery PR-ów, treść
przeglądów i przebieg testów ręcznych są w `CLAUDE.md` i CHANGELOG-u. Audytor
ma sprawdzać **kod, jaki jest**, a nie drogę, którą powstał. Wyjątkiem jest
dział **Początek i koniec (PIK)**, który z definicji porównuje obietnicę
z produktem — i on sięga do `PLAN.md`, `WYTYCZNE.md` i tabel decyzji wprost.

**Nie zawiera listy znanych, nienaprawionych usterek.** Gdyby ją zawierał,
audyt zwróciłby ją nam z powrotem i wyglądałoby to na wynik.
