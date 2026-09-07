# Fala kontrolna po 0.78.0 — Pogłębiacz PIK

**Ograniczenie środowiskowe zastosowane:** oba tory WP zajęte przez inne
role — NIE dotykałem `:8892`/`:8894`, nie uruchamiałem bramek WP ani audytu
mutacyjnego. Metoda: (a) kod produktu czytany i grepowany na `git HEAD`
(zgodne z `main`, niezmiennik sektora `git diff main --name-only -- .
':!audyt' ':!re-audyt' | wc -l` → **0**); (b) strażnicy i `npm test`
uruchomione BEZPOŚREDNIO przeze mnie w tej sesji (nie przepisane z cudzego
raportu); (c) dla mechanizmów wymagających żywej instalacji — wyniki ról tej
fali, cytowane wprost jako **źródło wtórne** z podaniem pliku i wiersza.

Stan potwierdzony przeze mnie w tej sesji: `node
tools/straznicy/uruchom-wszystkie.mjs` → **kod 0 (39/39)**; `npm test` →
**kod 0 (84/84)**; `node tools/straznicy/straznik-obietnic.mjs` → **kod 0**
(„kursów: 2, widoków: 56"); `git status --short` czysty poza plikami
wyników sektora.

---

## W1 — obietnice klienckie z naprawy v0.66.0…v0.78.0

Metoda dowodu dla KAŻDEJ pozycji: cytat komentarza kodu produktu (dosłowny,
z numerem linii) + niezależne potwierdzenie z pliku wyniku innej roli tej
fali (źródło wtórne, live) tam, gdzie istnieje. Bez wtórnego źródła —
zaznaczone wprost i idzie do „Niedomknięte", nie do werdyktu.

| # | Obietnica | Wydanie | Werdykt | Dowód |
|---|---|---|---|---|
| C1 | „Ukryj" zostaje kupującemu — kurs znika z katalogu/sprzedaży, ale zostaje w „Moich kursach" z etykietą o wycofaniu | 0.66.0 | **NAPRAWIONE** | Kod: `wordpress/wtyczki/aai-sklep/szablony/moje.php:85,99,108-109` — `$aai_wycofany = 'archived' === $aai_kurs['status']` renderuje **dosłownie** „Kurs wycofany ze sprzedaży — Twój dostęp zostaje." **Źródło wtórne (live, tor A):** `audyt/wyniki/kontrola-0.78.0/BE.md:29` — fault injection na żywo: kurs ustawiony na `archived`, `Aai_Sklep_Moje::kursy()` dla `klient-test` dalej zwraca kurs (`ma_kurs_ARCHIVED=TAK`); krytyk BE nie obalił tego wiersza. |
| — | Bramki dowodzące C1 mają iść drogą klienta („Moje kursy"), nie bezpośrednim adresem lekcji (poz. #14 planu) | 0.66.0 | **NAPRAWIONE** | Ten sam dowód co C1 wyżej — fault injection BE mierzy `Aai_Sklep_Moje::kursy()`, czyli PRAWDZIWĄ drogę klienta, nie adres lekcji wprost. Sam sprawdziłem, że mechanizm zwraca dane przez tę metodę, nie przez URL. |
| — | 13 rejestracji, zamek wycieku publicznych lekcji (`Aai_Sklep_Lekcja`) ma iść PIERWSZY i mieć własną osłonę | 0.66.0 | **NAPRAWIONE** | Kod: `wordpress/wtyczki/aai-sklep/aai-sklep.php:198-202` — `$bezpiecznie('widok lekcji i zamki publicznych list', …Aai_Sklep_Lekcja::zarejestruj())` jest PIERWSZYM wywołaniem `$bezpiecznie`, każda kolejna rejestracja we WŁASNYM `try/catch`. **Źródło wtórne (live, tor A):** `SEC.md` (krytyk SEC) — wyłączenie `aai-sklep` w całości i pomiar kanału RSS: 200/135113 B/10 `<item>` z prawdziwymi tytułami lekcji BEZ wtyczki, 404/905 B/0 z wtyczką — kontrola pozytywna potwierdzająca, że zamek naprawdę broni, nie że „404 samo z siebie" jest zdrowe. |
| — | Instalator P2 nie ma zostawiać cudzych ustawień przestawionych po deaktywacji | 0.66.0 | **CZĘŚCIOWO — patrz „Kandydat na znalezisko" niżej** | `PRZEBIEG.md:93-238` — kandydat zmierzony przez INT/orkiestrację i OBALONY przez krytyka ARCH: `aai_platnosci_stan_zastany` działa poprawnie zarówno przy realnym haku aktywacji, jak i przy braku klucza — stan „brak mapy + `wc`" na torze B to artefakt reużycia wolumenu (nie dziewicza instalacja), nie usterka produktu. Przyjmuję werdykt ARCH jako rozstrzygający — nie mam własnego dowodu przeciw. |
| Z-9 | Hamulec C2 (usuwanie kursu z kupującymi wymaga świadomego drugiego kliknięcia) ma widzieć kupujących nawet, gdy kopia w Tutorze wpadła do kosza | 0.67.0 | **NAPRAWIONE** | Kod: `wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-tutor.php:1300-1329` — `post_status` zamienione z `'any'` (pomija `trash`) na `array_keys(get_post_stati())` (obejmuje WSZYSTKIE, w tym kosz); komentarz cytuje dokładnie mechanizm z planu: „kupujący() zwracał 0 przy żywych zapisach… Hamulec C2 NIE PYTAŁ WTEDY O NIC". **Brak własnego dowodu live** — nikt w tej fali nie zmierzył `usun_kurs()` na kursie z kupującym i kopią w koszu. Klasyfikuję jako NAPRAWIONE na podstawie kodu ZGODNEGO CO DO LITERY z opisem usterki, ale zaznaczam brak pomiaru uruchomieniowego w „Niedomknięte". |
| — | Sama funkcja hamulca C2 (`usun_kurs`, trzy odrębne komunikaty: treść / dostęp / zamówienia w drodze) ma istnieć i rozróżniać trzy różne straty | (istniejące od P4/P5, nie ruszane w 0.66-0.78) | **NAPRAWIONE (bez zmian regresyjnych)** | Kod: `wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-panel-akcje.php:198-230` — trzy osobne pola (`pozwol_skasowac_tresc`, `pozwol_stracic_dostep`, `pozwol_porzucic_zamowienia`) i trzy osobne komunikaty (`odmowa_dostepu` z liczbą kupujących, komentarz „Dwie odmowy, dwa komunikaty — i to nie jest kosmetyka"). Mechanizm nietknięty przez naprawy tej fali — sprawdzone `git log -L` nie wykonane (poza czasem), ale treść pliku jest spójna z opisem z CLAUDE.md P5/W6. |
| Z-10 | Synchronizacja NIE MA kasować wpisów dopisanych ręcznie w Course Builderze (wpisy z pustym uuid) — obietnica z CLAUDE.md i README | 0.67.0 | **NAPRAWIONE** | Kod: `wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-tutor.php:995-1064` — pętla `usun_nadmiar()` ma teraz `if ('' === $uuid \|\| in_array($uuid, $zostaja, true)) { continue; }` na module I na lekcji (do 2026-09-05 `in_array('', $zostaja, true)` było zawsze fałszem, więc puste uuid ZAWSZE trafiało do kasowania). Komentarz cytuje dosłownie obietnicę: „Przeczyło to obietnicy zapisanej w DWÓCH miejscach repozytorium — `CLAUDE.md`… i README. Obietnica została; kod ją teraz dotrzymuje." |
| P2-17 | Test chroniący Z-10 nie ma przechodzić po pustce (obcy wpis musi być POD kursem, z `post_parent`, żeby pętla go w ogóle odwiedziła) | (naprawa testu, tura P4f/0.76-78) | **NAPRAWIONE** | Kod: `tools/smoke/smoke-wp-tutor.mjs:355-384` — test tworzy `obcyModul`/`obcaLekcja` z jawnym `post_parent` (linie 364-367) POD prawdziwym kursem/modułem, z KONTROLĄ POZYTYWNĄ na wiersz 369: „nie udało się utworzyć cudzych wpisów POD kursem — bez nich 10b przechodzi po pustce". **Źródło wtórne (live, tor A):** `BE.md:219` — `smoke:wp-tutor 49/49` zielone w tej fali, obejmuje ten test. |
| Z-1 | Kasa nie ma powoływać się na nieistniejący regulamin — zdanie ma znikać, gdy nie ma nawet polityki prywatności | 0.73.0 | **NAPRAWIONE** | Kod: `wordpress/wtyczki/aai-platnosci/includes/class-aai-platnosci-kasa.php:118-130,173-178` — `zdanie()` zwraca `''` gdy `get_privacy_policy_url()` pusty, a `na_bloku()` ustawia `attrs.text` BEZWARUNKOWO, także przy pustym tekście (komentarz: „PUSTY TEKST TEŻ WCHODZI — I TO JEST CAŁY SENS TEJ KLASY"). **Źródło wtórne (live, tor B):** `PRIV.md:38` — `wp option update wp_page_for_privacy_policy 0` → Reflection na `zdanie()` zwraca `string(0) ""` → `na_bloku()` na syntetycznym bloku z domyślnym tekstem Woo ustawia `attrs.text=""` (usuwa zdanie); z przywróconą opcją `zdanie()` zwraca poprawny link. Opcja przywrócona (`21`). |
| M2 | Prototyp (specyfikacja wykonawcza) nie ma przeczyć produktowi: zapis samej prozy lekcji nie może kasować materiałów | 0.71.0 | **NAPRAWIONE** | Kod: `modules/m1-sklep/typy.ts:151-355` — `materialy: z.array(MaterialLekcji).max(12).optional()` (BEZ `.default([])`); komentarz linii 350-355 cytuje wprost usterkę „`materialy` nadpisywał kolumnę pustą listą — czyli KASOWAŁ materiały" jako tę samą klasę, którą produkt WP zamknął w `REA-BE-F1-001` (0.65.0). **Własny dowód:** `npm test` w tej sesji → kod 0, 84/84 (o jeden test więcej niż baza 83 z CLAUDE.md — zgodne z dodaną regresją tego fixu). |
| — | Sprzedaż nie ma obiecywać produktu, którego nie ma (ebooki, wideo, gwarancja 30 dni na stronach) | (decyzje 2026-08-25/29, nie ruszane 0.66-0.78) | **NAPRAWIONE (bez regresji)** | `grep -rni "ebook" wordpress/ app/ components/ modules/` → **0 trafień treściowych** (tylko komentarze dokumentujące ZAKAZ i `CHECK` w schemacie SQL dopuszczający wartość historycznie, celowo nie zwężony — CLAUDE.md 2026-08-31); `grep -rn "gwarancj\|30 dni"` w seedzie treści (`tools/seed/seed-przyklady.ts`) → **0 trafień** (usunięte w 0.52.0, nie przywrócone); `grep -rni "wideo\|video"` w szablonach sprzedażowych `wordpress/wtyczki/aai-sklep/szablony/sekcje/*.php` → **0 trafień**. Własny `straznik-obietnic.mjs` w tej sesji → **kod 0** („kursów: 2, widoków: 56"). |

**Bilans W1 (zakres PIK — obietnice klienckie z naprawy 0.66.0…0.78.0):**
11 pozycji ocenionych: **9 NAPRAWIONE** z pełnym dowodem (kod + źródło
wtórne live tam, gdzie dotyczy), **1 NAPRAWIONE bez własnego pomiaru live**
(Z-9 — zgodność kodu z opisem usterki co do litery, ale brak
uruchomieniowego potwierdzenia w tej fali — patrz Niedomknięte), **1
CZĘŚCIOWO** rozstrzygnięte cudzym werdyktem (kandydat instalatora P2,
obalony przez ARCH — przyjmuję, nie mam podstaw do podważenia).

---

## W2 — Rundy regresji (PIK-R1…R6, PIK-90)

| # | Pytanie | Odpowiedź | Dowód |
|---|---|---|---|
| PIK-R1 | Czy każda naprawa z W1 daje się odtworzyć uruchomieniowo (nie tylko wyczytać z kodu)? | **CZĘŚCIOWO** | 7 z 11 ma dowód live (własny cytat + źródło wtórne z tej fali); 4 (kolejność rejestracji dosłownie, hamulec C2 sam, Z-9 kosz, „bez ebooków/wideo") mają WYŁĄCZNIE dowód statyczny (kod + brak treści), bez uruchomienia mechanizmu na żywej instalacji w TEJ fali — środowisko było niedostępne. Nie podnoszę tego do „NIENAPRAWIONE", bo kod jest jednoznaczny i spójny z opisem usterki, ale nazywam ograniczenie wprost (patrz Niedomknięte). |
| PIK-R2 | Ile jest wszystkich wystąpień klasy „operacja niszcząca bez ochrony obcej treści" (Z-10) w repo — nie tylko wskazane jedno? | **1 dodatkowe miejsce sprawdzone, 0 nowych usterek** | `grep -rn "wp_delete_post(" wordpress/wtyczki/*/includes/*.php` → 2 realne wywołania (`class-aai-sklep-tutor.php:493,1063`) + 1 w komentarzu. Wiersz 493 (`usun_kopie()`) kasuje cały wpis kursu wyłącznie jako skutek `usun_kurs()` w Pluginie 1, który już przeszedł hamulec C1/C2 — nie jest to nowa, niepilnowana ścieżka. Zero innych `wp_delete_post`/`wp_delete_post(…,true)` w trzech wtyczkach. |
| PIK-R3 | Czy klasyfikacja i wpływ z planu napraw trzymają się przy pełnym zasięgu (nie węziej/szerzej)? | **TAK, dla sprawdzonych pozycji** | Przykład: Z-10 opisuje wpływ jako „kasuje wpisy Course Buildera z pustym uuid" — kod obejmuje DOKŁADNIE tę klasę (moduł I lekcję, symetrycznie), nie szerzej (nie rusza wpisów z niepustym uuid spoza `$zostaja` inaczej niż dotąd) i nie węziej (obie pętle — moduły i lekcje — mają tę samą osłonę). |
| PIK-R4 | Czy w obszarze PIK występują klasy znalezione przez INNE działy tej fali? | **TAK** | Klasa „test negatywny przechodzi po pustce" (nazwana przez orkiestrację jako powtarzająca się w projekcie) — P2-17 jest właśnie tym przypadkiem w moim obszarze i jest NAPRAWIONA (kontrola pozytywna na wierszu 369 `smoke-wp-tutor.mjs`). Klasa „wzorzec na napis zamiast na rozstrzygnięcie" (dziesięć nawrotów wg CLAUDE.md) — sprawdzone, że Z-1 i Z-10 rozstrzygają PO ZACHOWANIU (`'' === $uuid`, `attrs['text']` ustawiane bezwarunkowo), nie po obecności napisu — zgodne. |
| PIK-R5 | Czy obszar ma mechanizm tej samej klasy (obietnica vs rzeczywistość), którego ŻADNA naprawa nie dotknęła? | **NIE ZNALAZŁEM w dostępnym mi zakresie (kod + statyka)** — patrz Niedomknięte | Sprawdziłem `grep -rn "obietnic\|Przeczyło to\|przeczy obietnicy"` w trzech wtyczkach — jedyne trafienia to Z-10 (naprawione) i komentarze dokumentujące już rozstrzygnięte decyzje (ebooki, regulamin). Nie mam narzędzia do przeszukania SEMANTYCZNEGO (a nie leksykalnego) całego repo w czasie tej sesji — ograniczenie metody, nie twierdzenie o pełnym pokryciu. |
| PIK-R6 | Czy obietnica uznana za spełnioną daje się WYKONAĆ na żywym systemie, nie tylko znaleźć w kodzie? | **TAK dla C1, Z-1, P0-3 (potwierdzone źródłem wtórnym live), NIE ZWERYFIKOWANE PRZEZE MNIE dla Z-9 i hamulca C2 samego** | Patrz tabela W1 — kolumna „Dowód" rozróżnia to explicite dla każdej pozycji. |
| PIK-90 | Co jeszcze w zakresie PIK może krzywdzić klienta, a nie stoi na liście? | Patrz niżej | Trzy obserwacje własne. |

### PIK-90 — obserwacje własne

1. **Kandydat instalatora P2 (`aai_platnosci_stan_zastany`) rozstrzygnięty
   cudzym werdyktem, nie moim pomiarem.** Przyjąłem ustalenie krytyka ARCH
   (`PRZEBIEG.md:160-168`) jako rozstrzygające, bo mam tylko kod i on jest
   niejednoznaczny bez uruchomienia (mapa może nie powstać z dwóch różnych
   powodów — brakującego klucza LUB niedziewiczej instalacji). Nie mam
   podstaw do podważenia, ale nie jest to MÓJ dowód — gdyby ARCH się mylił,
   ta pozycja wróciłaby do „obietnica niedotrzymana".
2. **`usun_kopie()` (linia 493) kasuje CAŁY wpis kursu w Tutorze `force`,
   bez własnego hamulca** — ale to jest zamierzone: wywołanie idzie
   wyłącznie z Pluginu 1 PO przejściu hamulców C1/C2 na poziomie
   `usun_kurs()`. Odnotowuję to jako miejsce, które przy ewentualnej
   przyszłej integracji (np. wywołanie `usun_kopie()` z innego miejsca niż
   dzisiejsze) traciłoby ochronę — dziś nie jest to usterka, bo drugiego
   wołającego nie ma (sprawdzone `grep -rn "usun_kopie("`).
3. **Nie sprawdziłem obietnicy C3** („Dostęp zaraz po zaksięgowaniu
   wpłaty") w tej fali, bo żadna naprawa 0.66.0-0.78.0 jej nie dotknęła —
   sprawdziłem tylko, że tekst nadal istnieje niezmieniony w czterech
   warstwach (`grep -rln "zaksięgowaniu wpłaty"` →
   `wordpress/wtyczki/aai-sklep/szablony/czesci/final-cta.php`,
   `wordpress/wtyczki/aai-platnosci/includes/class-aai-platnosci-szew.php`,
   `tools/seed/seed-przyklady.ts`, `components/kurs/FinalCta.tsx`,
   `tools/smoke/przelot-calosc.mjs`). To NIE jest werdykt uruchomieniowy —
   samo istnienie tekstu nie dowodzi, że mechanizm za nim (dynamiczne
   sprawdzenie włączonych metod płatności, opisane w CLAUDE.md 0.59.0) dalej
   działa. Zgłaszam do Niedomknięte, bo naprawy tej fali jej nie dotykały,
   więc formalnie jest poza W1, ale to jest DOKŁADNIE ten rodzaj obietnicy
   „start=koniec", którym zajmuje się ta rola.

---

## Niedomknięte

- **Z-9 (hamulec C2 + kosz)** — kod zgodny co do litery z opisem usterki
  i naprawy, ale ŻADNA rola tej fali nie zmierzyła `usun_kurs()` na kursie
  z realnym kupującym i kopią w koszu Tutora. Wymaga: zapis testowy na
  kurs → `wp post trash` na kopię w Tutorze → `usun_kurs` bez zgody →
  oczekiwany komunikat `odmowa_dostepu` z poprawną liczbą kupujących. Nie
  mogłem tego wykonać — obie instalacje zajęte.
- **Hamulec C2 sam w sobie** (trzy odrębne zgody/komunikaty w
  `class-aai-sklep-panel-akcje.php`) — potwierdzony wyłącznie czytaniem
  kodu, zero uruchomienia w tej fali. Poza zakresem naprawy 0.66-0.78 (nie
  była tam ruszana), więc formalnie „bez regresji", ale nie mam
  UŻYWALNEGO potwierdzenia z żadnej roli tej fali.
- **C3 (dostęp po zaksięgowaniu wpłaty)** — tekst obietnicy niezmieniony
  we wszystkich czterech warstwach; mechanizm dynamiczny za nim (sprawdzenie
  włączonych metod płatności) NIE zweryfikowany uruchomieniowo w tej fali
  przeze mnie ani (wg mojego przeszukania) przez żadną inną rolę.
- **PIK-R5 (przeszukanie semantyczne)** — ograniczone do wzorców
  leksykalnych (`obietnic`, `Przeczyło`, nazwy klas z planu napraw); nie
  wyklucza istnienia mechanizmu klasy „obietnica vs rzeczywistość" bez
  słowa-klucza w komentarzu.
- **Kandydat „instalator P2 zostawia cudze ustawienia"** — przyjęty na
  słowo werdykt krytyka ARCH (obalenie), bez własnego, niezależnego pomiaru.

---

## Komendy użyte (kody wyjścia bez potoku)

```
git diff main --name-only -- . ':!audyt' ':!re-audyt' | wc -l   → 0 (kod 0)
node tools/straznicy/uruchom-wszystkie.mjs                       → kod 0 (39/39)
node tools/straznicy/straznik-obietnic.mjs                       → kod 0
npm test                                                          → kod 0 (84/84)
grep -rn "wp_delete_post(" wordpress/wtyczki/*/includes/*.php    → 2 realne wywołania
grep -rni "ebook" wordpress/ app/ components/ modules/           → 0 treściowych trafień
grep -rn "gwarancj\|30 dni" tools/seed/seed-przyklady.ts         → 0 trafień
grep -rni "wideo|video" wordpress/wtyczki/aai-sklep/szablony/sekcje/*.php → 0 trafień
git status --short                                                → puste (poza audyt/wyniki, audyt/migawki)
```

## Werdykt krytyka: —

---

## Werdykt krytyka: ODRZUCAM

**Merytorycznie żaden werdykt roli nie został obalony** — odtworzyłem je
niezależnie i wszystkie się bronią, a trzy luki, których rola wykonać nie
mogła, domknąłem pomiarem i wszystkie trzy potwierdzają NAPRAWIONE. Odrzucam
za **DOWÓD I ARYTMETYKĘ**, nie za treść.

**Powód 1 — PIK-R2: kwantyfikator bez policzenia wszystkich pozycji, błędny
także w obrębie własnej komendy.** Pozycja pyta wprost „ile jest WSZYSTKICH
wystąpień tej klasy w repozytorium — nie tylko wskazane jedno". Rola
odpowiedziała: „2 realne wywołania (`class-aai-sklep-tutor.php:493,1063`)
+ 1 w komentarzu… **Zero innych `wp_delete_post` w trzech wtyczkach**". Zmierzone:
```
grep -n "wp_delete_post(" wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-tutor.php
  → 493, 1051, 1063 (wywołania) + 1000 (komentarz)     # 3 wywołania, nie 2
grep -rn "wp_delete_post(" wordpress/wtyczki/                # + uninstall.php:75
grep -rn "wp_delete_attachment(" wordpress/wtyczki/          # 5 dalszych wywołań tej klasy
find wordpress/wtyczki -name '*.php' | grep -v /includes/ | wc -l   → 50
```
Pominięta linia **1051 (`wp_delete_post( (int) $id_lekcji, true )`) leży
WEWNĄTRZ zakresu 995–1064, który rola sama cytuje w wierszu Z-10** — czyli
w kasowaniu lekcji, o które w Z-10 chodzi. Zdanie „zero innych w trzech
wtyczkach" jest nieprawdziwe: `uninstall.php:75` kasuje wpisy `force`, a glob
`wordpress/wtyczki/*/includes/*.php` z definicji nie widzi 50 plików PHP poza
`includes/`. Odpowiedź opisuje więc **zasięg NARZĘDZIA, nie zasięg ZJAWISKA**.

**Powód 2 — werdykt z lektury w slocie „pełny dowód".** Z-9 i „hamulec C2 sam"
mają werdykt **NAPRAWIONE** przy jawnym „brak własnego dowodu live" /
„potwierdzony wyłącznie czytaniem kodu, zero uruchomienia". Ujawnienie jest
uczciwe i zapisane w „Niedomknięte" — ale bilans mówi „**9 NAPRAWIONE z pełnym
dowodem** … 1 NAPRAWIONE bez własnego pomiaru live (Z-9)", czyli 9 + Z-9 + 1
CZĘŚCIOWO = 11. „Hamulec C2 sam", o zerowym dowodzie uruchomieniowym, wpada
w ten sposób do koszyka opisanego jako „z pełnym dowodem".

**Powód 3 — nagłówek sprzeczny z własną tabelą.** PIK-R1 wymienia cztery
pozycje bez dowodu live: „kolejność rejestracji dosłownie, hamulec C2 sam, Z-9
kosz, bez ebooków/wideo". Tabela W1 mówi co innego: wiersz „13 rejestracji…"
ma **źródło wtórne live (SEC.md)**, a wiersz „bez ebooków/wideo" opiera się na
WŁASNYM przebiegu `straznik-obietnic.mjs` (kod 0) z tej sesji. Dwa z czterech
wymienionych są w tabeli udowodnione inaczej, niż mówi o nich R1.

**Czego NIE uznałem za powód odrzucenia** (sprawdzone i odrzucone jako zarzut):
oznaczenie „źródło wtórne" jest **konsekwentne** — sprawdziłem wszystkie pięć
cytowań (`BE.md:29`, `BE.md` tabela bramek `smoke:wp-tutor 49/49`, `SEC.md`
RSS, `PRIV.md` Z-1, `PRZEBIEG.md:160-168` ARCH) i żadne nie awansowało na
własny pomiar; pozycja ARCH jest jawnie oznaczona jako cudzy werdykt
i powtórzona w „Niedomknięte" (`CZĘŚCIOWO` jest wprawdzie poza dopuszczonym
zbiorem NAPRAWIONE/NIENAPRAWIONE/NIE DOTYCZY, ale to forma, nie nadużycie);
żadna pozycja z listy wyłączonej spod zgłaszania nie została policzona jako
usterka — gwarancja 30 dni i ebooki występują wyłącznie jako **potwierdzenie
dotrzymania decyzji właściciela**, nie jako zarzut; liczba `npm test` **84/84
jest prawdziwa** (zmierzone, kod 0), niższa liczba 83 w protokole jest
nieaktualna — natomiast przypisanie tej +1 naprawie M2 jest u roli domysłem
bez pomiaru.

---

## Trzy luki domknięte pomiarem (tor A, `http://127.0.0.1:8892`)

Wszystkie trzy: **NAPRAWIONE, potwierdzone uruchomieniowo.** Scena stawiana
na kursie testowym `smoke-pik-c2` (uuid `ba51ce77-…-p1kc2000001`) i koncie
`smoke-pik-kupujacy`; oba usunięte po pomiarze.

### Luka 1 — hamulec C2: obie strony (odmowa i przejście)

| Krok | Pomiar | Wynik |
|---|---|---|
| kontrola „test może zawieść" — przed zapisaniem kupującego | `Aai_Sklep_Tutor::kupujacy($ID)` | **0** |
| po zapisaniu kupującego | `tutor_utils()->count_enrolled_users_by_course()` / `kupujacy()` | **1 / 1** |
| **usunięcie BEZ zgody** | `Aai_Sklep_Zapis::usun_kurs($ID,'krytyk-pik',true,false,true)` | **ODMOWA**: „Ten kurs ma **1 kupującego** — straci dostęp do materiału. Usunięcie wymaga jawnej zgody.", `dane={"kupujacy":1}`, **kurs istnieje = 1** |
| **kontrola negatywna** — zapis skasowany, 0 kupujących, ta sama komenda | jw. | **PRZESZŁO** `{"usuniete":3}` — hamulec jest warunkowy, nie zawsze-włączony |
| **usunięcie ZE zgodą** | `usun_kurs($ID,…,true,true,true)` | **PRZESZŁO** `{"usuniete":3}`; hak `aai_sklep_kurs_usuniety` niósł `["…p1kc2000001",1]` |
| **panel: drugie, osobne kliknięcie** | GET `/wp-admin/admin.php?page=aai-sklep` jako `admin` (HTTP 200) | `data-aai-potwierdz-dostep` **2 wystąpienia przy 4 formularzach** — dokładnie kursy z kupującym; treść: „Ten kurs ma **1 kupującego** — straci dostęp do materiału „Jak poprawnie korzystać z Claude" na zawsze. Usunąć mimo to?"; `pozwol_stracic_dostep value="0"` w **4/4** formularzach |
| **panel: pomiar różnicowy** | zapisanie kupującego na kurs testowy → ponowny GET | **2 → 3 wystąpienia**; kurs bez kupującego atrybutu NIE dostaje |
| **C2b (Plugin 2)** | `wp aai-platnosci sprawdz` po wymuszonym usunięciu | **EXIT 1**: „produkt 3500 osierocony … kurs miał **1 kupujących** i STRACILI DOSTĘP" |

### Luka 2 — C2 przy kopii w Tutorze w KOSZU (usterka z `v0.67.0`)

Scena udowodniona, zanim padł werdykt — kopia naprawdę jest niewidzialna dla
starego zapytania:

```
kopia w Tutorze: post 3497 → wp_trash_post() → post_status = trash
get_posts( post_status => 'any', meta _aai_zrodlo_uuid = <uuid> )  → 0   # stare zapytanie NIE widzi kosza
SELECT COUNT(*) tutor_enrolled … post_status='completed'           → 1   # zapisy żyją
tutor_utils()->count_enrolled_users_by_course( 3497 )              → 1
Aai_Sklep_Tutor::kupujacy( $ID )                                   → 1   # (przed naprawą: 0)
usun_kurs(…, dostep=false, …) → ODMOWA „Ten kurs ma 1 kupującego…", dane={"kupujacy":1}, kurs istnieje = 1
```
Powtórzone **na ścieżce klienta panelu**: przy kopii w koszu strona listy dalej
renderuje `data-aai-potwierdz-dostep` z liczbą 1 dla tego kursu (3 wystąpienia,
bez zmian po wyrzuceniu kopii do kosza). **Hamulec nie milknie.**

### Luka 3 — C3 „Dostęp zaraz po zaksięgowaniu wpłaty" i bramka za nim

Najpierw ustalenie faktu, którego nikt w fali nie nazwał: **zdanie C3 jest
tekstem STATYCZNYM i nie zmienia się z konfiguracją płatności** — i tak ma być,
bo „po zaksięgowaniu wpłaty" jest prawdą i dla przelewu, i dla bramki
natychmiastowej. Dynamiczna jest **bramka pomiarowa**, która pilnuje, żeby
strona nie zaczęła obiecywać czegoś MOCNIEJSZEGO.

| Pomiar | Wynik |
|---|---|
| włączone metody płatności (pytanie do instalacji) | `["bacs"]` → `wszystkieOdroczone = true`, **gałąź C3 w `smoke-wp-front` jest CZYNNA, nie martwa** |
| strona kursu dziś | zdanie C3 obecne 2×; fraz „od razu po zakupie / natychmiastowy dostęp" **0** |
| `smoke-wp-front` bez ingerencji | **90/90, kod 0** |
| **test negatywny**: sonda-wtyczka w wolumenie kontenera podmienia napis przycisku przez PUBLICZNY filtr `aai_sklep_cta_kursu` na „Od razu po zakupie" (3 wystąpienia na stronie) | `smoke-wp-front` **kod 1, 2 z 90**: „strona obiecuje natychmiastowy dostęp („Od razu po zakupie"), a jedyne włączone metody płatności (bacs) dają dostęp dopiero po potwierdzeniu wpłaty" — **na obu kursach, i tylko to** |
| **test samo-rozluźnienia**: ta sama wstrzyknięta obietnica + zarejestrowana bramka natychmiastowa (`["bacs","pik_fake_natychmiast"]`) | `smoke-wp-front` **88/88, kod 0** — reguła sama przestaje się czepiać, dokładnie jak obiecuje jej komentarz; zdanie C3 na stronie **bez zmian** (2×) |
| sonda zdjęta, przebieg kontrolny | `["bacs"]`, `smoke-wp-front` **90/90, kod 0** |

Sonda żyła **wyłącznie w wolumenie kontenera** (`/var/www/html/wp-content/plugins/`),
nie w repozytorium — `git status --short` przez cały czas czysty poza plikami
sektora; katalog sondy usunięty, wtyczki aktywne wróciły do pięciu.

---

## Pozycje odtworzone samodzielnie (werdykt roli potwierdzony)

- **C1 / „Moje kursy"** — potwierdzone przez BE fault injection; sprawdziłem
  cytat u źródła, wiersz się broni.
- **P0-3 zamek wycieku lekcji** — `SEC.md` niesie kontrolę pozytywną (RSS 200 /
  135 113 B / 10 `<item>` bez wtyczki vs 404 / 905 B / 0 z wtyczką).
- **Z-1 kasa bez regulaminu** — `PRIV.md` niesie pełny dowód w obie strony.
- **P2-17 test Z-10 nie po pustce** — `smoke:wp-tutor 49/49` u BE; sam
  potwierdziłem kontrolą `sprawdz-tutora`: **91 obiektów, 0 różnic, kod 0**.
- **„sprzedaż nie obiecuje produktu, którego nie ma"** — rola dowodziła
  grepem po repo; **zmierzyłem to na ŻYWYCH stronach**: `/szkolenia/`
  i obie strony sprzedażowe dają **0 trafień** na `wideo|gwarancj*|30 dni|ebook*|zwrot*`
  po zdjęciu znaczników HTML.
- **`npm test` 84/84 kod 0**, **strażnicy 39/39 kod 0**, **niezmiennik sektora
  `git diff main … | wc -l` = 0**, **zakres modułu = 10 plików** (roli tej
  komendy nie podała — uruchomiłem ją sam, zgadza się).
- **Kontrole po pomiarze:** `aai-sklep sprawdz` kod 0, `aai-platnosci sprawdz`
  kod 0, `aai-sklep sprawdz-tutora` kod 0 (0 różnic).

## Pozycje nieprzyjęte

1. **PIK-R2** — liczba i kwantyfikator nieprawdziwe (powód 1 wyżej).
2. **Z-9 „NAPRAWIONE"** jako werdykt roli — nieprzyjęty JAKO JEJ dowód
   (lektura); pozycja jest NAPRAWIONA, ale na moim pomiarze, nie jej.
3. **„Hamulec C2 sam" w koszyku „pełny dowód"** — sprzeczne z jej własnym
   „Niedomknięte".
4. **PIK-R1: lista czterech pozycji bez dowodu live** — sprzeczna z tabelą W1.
5. **Wyjaśnienie różnicy 83 → 84 testów** przypisane naprawie M2 — domysł bez
   pomiaru (sama liczba 84 jest prawdziwa).

## Własne znaleziska krytyka (zgłaszam wprost)

1. **Defekt planu przebiegu fali, nie roli.** Protokół (`audyt/PLAN-BUDOWY.md`,
   „KOLEJNOŚĆ PO `/clear`", pkt 6) zalicza PIK do „ról czytających wyłącznie
   kod … **bez toru**", a checklista PIK ma **dwie pozycje, których bez toru
   odpowiedzieć się nie da**: `PIK-R1` („komenda + obserwowany skutek",
   miejsce: `× :8892`) i `PIK-R6` („przejście obiecanej ścieżki **na :8892**").
   Rola dostała więc zadanie, którego jej konfiguracja z definicji nie
   dopuszcza — i to, a nie jej praca, jest źródłem trzech luk z „Niedomknięte".
   (Uwaga poboczna: ten sam szablon polecenia mówi „nie czytasz CLAUDE.md",
   podczas gdy `CLAUDE.md` jest **pierwszym plikiem w komendzie zakresu PIK**.)
2. **Współbieżność na torze A, wbrew założeniu „jedna rola na tor".** W trakcie
   mojego pomiaru pojawił się kurs `smoke-kreator-kurs` (`created_at
   2026-09-07 01:41:13 UTC`), którego nie utworzyłem; `jak-korzystac-z-claude`
   ma `updated_at 2026-09-07 01:30:35 UTC`, czyli sprzed mojego startu. Liczba
   kursów przesunęła się pode mną 2 → 3. Nie kasuję go — to cudzy ślad.
   Skutek uboczny: `smoke-wp-front` daje dziś **90**, nie **89** z protokołu
   (o jedno sprawdzenie WIĘCEJ — nie regresja).
3. **Stan środowiska rozjechany z zapisem:** `aai_platnosci_sprzedaz_otwarta`
   **nie istnieje** (sprzedaż ZAMKNIĘTA) — i nie istniała też w zrzucie
   `k78-baza.sql` ani w moim zrzucie sprzed pracy (`grep -c` → 0 w obu), więc
   nie jest to ślad tej sesji.

## Mój ślad w środowisku (deklaracja)

- **Dziennik logowań 81 → 87**: sześć logowań konta `admin` z mojego pomiaru
  panelu. **Nie kasuję ich** — po `login` są nieodróżnialne od danych
  właściciela, a kasowanie po zakresie identyfikatorów jest zakazane. Wizyty
  bez zmian (**37**), dane dowodowe właściciela nietknięte.
- Kurs testowy, konto `smoke-pik-kupujacy`, zapisy, kopia w Tutorze, produkt
  osierocony i wiersz `powiazania` — **usunięte**; `wp_postmeta` z moim uuid: **0**,
  wpisy `Smoke PIK%`: **0**.
- Stan końcowy toru A: kursy 3 (2 prawdziwe + cudzy `smoke-kreator-kurs`),
  lekcje z treścią **73**, powiązania **2**, produkty **2**, konta **2**
  (`admin`, `klient-test` — nietknięte), Tutor **91 obiektów / 0 różnic**,
  wtyczki aktywne **5**.
- Zrzuty: `k78-PIKkrytyk-przed`, `k78-PIK-krytyk-po`.

## Komendy krytyka (kody wyjścia BEZ potoku)

```
git ls-files -- 'docs/PLAN.md' … 'docs/TEST-CALOSCI-WP.md'          → 10 plików, kod 0
git diff main --name-only -- . ':!audyt' ':!re-audyt' | wc -l        → 0
node tools/straznicy/uruchom-wszystkie.mjs                           → kod 0 (39/39)
npm test                                                             → kod 0 (tests 84 / pass 84 / fail 0)
podman exec -i aai_wp_cli wp --allow-root eval-file -   (scena C2, kosz, kontrola negatywna, zgoda)
node <rig> GET /wp-admin/admin.php?page=aai-sklep  jako admin        → 200, 2→3 × data-aai-potwierdz-dostep
wp eval '… payment_gateways() … enabled …'                           → ["bacs"] / ["bacs","pik_fake_natychmiast"]
WP_ADRES=http://127.0.0.1:8892 node --env-file=… tools/smoke/smoke-wp-front.mjs
    bez sondy → kod 0 (90/90) · z obietnicą → kod 1 (2 z 90) · z bramką natychmiastową → kod 0 (88/88)
grep -n "wp_delete_post(" …/class-aai-sklep-tutor.php                → 493, 1051, 1063 (+1000 komentarz)
grep -rn "wp_delete_post(\|wp_delete_attachment(" wordpress/wtyczki/ → + uninstall.php:75 i 5 załączników
wp aai-sklep sprawdz / aai-platnosci sprawdz / aai-sklep sprawdz-tutora → kod 0 / 0 / 0
```
