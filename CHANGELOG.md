# Dziennik zmian

Format wg [Keep a Changelog](https://keepachangelog.com/pl/1.1.0/),
wersjonowanie [SemVer](https://semver.org/lang/pl/). Najnowszy wpis na górze.
Pierwszy nagłówek wersji w tym pliku jest **źródłem prawdy o wersji projektu**
— pilnuje tego `tools/straznicy/straznik-wersji.mjs`.

## [0.45.0] — 2026-08-25

**Krok W6 dostaje narzędzia i scenariusz, zamiast zaczynać się od pytania
„co właściwie mam kliknąć".** Wtyczka `aai-sklep` nie jest skończona, dopóki
nie przejdzie testu ręcznego — a ten test odpowiada na pytanie, którego żaden
strażnik nie umie zadać: czy to, co widzi człowiek, ma sens i wygląda jak nasze.

### Dodane

- **`npm run wp:klient`** (`tools/wp-klient-testowy.mjs`) — zakłada konto
  KLIENTA (`klient-test`, rola `subscriber`) i zapisuje je na wszystkie
  opublikowane kursy. Idempotentne; `--usun` kasuje konto razem z zapisami.
  **Po co osobne konto:** administrator widzi materiał z definicji, więc
  oglądanie lekcji na własnym koncie odpowiada na pytanie „czy admin to
  zobaczy", a nie „czy klient to zobaczy". Do tego pasek narzędzi WordPressa
  przesuwa stronę o 32 px i zasłania pigułkę lekcji — dlatego konto ma go
  **zgaszonego** (`show_admin_bar_front`), tak jak zwykły klient.
  Hasło jedzie do `wordpress/srodowisko/.env` (poza gitem), nigdy do
  dokumentacji.
- **[docs/plugin-1/W6-TEST-RECZNY.md](docs/plugin-1/W6-TEST-RECZNY.md)** —
  scenariusz testu na cztery ścieżki (gość → klient po zakupie → właściciel
  w kreatorze → czy nie zepsuliśmy motywu), z liczbami wyjściowymi z bazy
  i **tabelą rzeczy POZA zakresem**, żeby nie zgłaszać jako błąd tego, co
  należy do Pluginu 2.

### Naprawione (zgłoszenia właściciela z testu ręcznego W6)

- **Klient nie miał JAK trafić do kupionego kursu.** Logowanie WordPressa
  wyrzuca na `/my-account/`, a jedyną listą kupionych kursów był panel Tutora
  — pełnoekranowa aplikacja z własnym paskiem bocznym, własnym nagłówkiem
  i oknem powitalnym Tutora (ze zrzutem cudzego kursu fotografii i napisem
  „Hi, Sophia!"). Powstała **nasza strona `/szkolenia/moje/`**: lista kupionych
  kursów z paskiem postępu i przyciskiem „Kontynuuj naukę", prowadzącym do
  pierwszej NIEODHACZONEJ lekcji. Panel Tutora (`/dashboard/`
  i `/dashboard/courses/`) przekierowuje tam **302**. Pozycja **„Moje kursy"**
  wchodzi do obu nawigacji motywu, ale **tylko zalogowanemu klientowi, który
  ma choć jeden kurs** — gościowi nie pokazujemy drzwi, za którymi nic dla
  niego nie ma. Strona ma `noindex`: jej treść zależy od konta, a robot jest
  gościem.
- **Strony konta WooCommerce renderowały się bez stylów.** `/my-account/*`
  dostawało arkusze Woo, ale nie nasz arkusz integracji — obsługiwał wyłącznie
  strony Tutora — i nikt nie rezerwował miejsca pod nagłówek `fixed`. Menu
  konta lądowało w lewym górnym rogu POD nagłówkiem, ciemny tekst na ciemnym
  tle. To ta sama klasa błędu co 0.38.0/0.40.0 (reguły spoza warstw kaskady
  biją motyw). Powstał `Aai_Sklep_Styl_Woo` + `assets/woo-motyw.css`, bliźniak
  warstwy Tutora, pytający `Aai_Sklep_Zasoby::strona_woo()` — więc obejmie też
  koszyk i kasę, gdy przyjdą z Pluginem 2.
- **Strzałka „wróć" w lekcji odsyłała kupującego na CENNIK.** Właściciel cofnął
  się z lekcji i wylądował na stronie sprzedażowej kursu, który już ma —
  a jedynym wyjściem z tamtej strony jest przycisk „Dołącz". Odnośnik ma teraz
  dwie postacie: kto jest **zapisany na kurs**, wraca do „Moich kursów"; kto nie
  jest (gość na darmowej zapowiedzi, ktoś z wyszukiwarki) — na stronę
  sprzedażową, bo dla niego to jest właściwy następny krok. Pytamy Tutora
  o ZAPIS, nie o `dostep` z widoku: `dostep` jest prawdziwy także dla
  zapowiedzi i dla administratora, więc gość dostałby odnośnik do pustej listy.
- **Menu konta WooCommerce nie prowadziło do kursów.** Właściciel szukał ich
  klikając „Dashboard", a menu mówiło o zamówieniach, pobraniach i adresach.
  **„Moje kursy" są tam teraz PIERWSZĄ pozycją** — dla naszego produktu kurs
  jest ważniejszy niż faktura. Adres podmienia filtr `woocommerce_get_endpoint_url`,
  bo nasza strona nie jest endpointem konta i bez tego pozycja prowadziłaby
  do `/my-account/aai-moje-kursy/`, czyli do 404.
- **`smoke-wp-motyw` mierzy teraz SIEDEM stron** (było pięć): doszły
  `/my-account/` i `/szkolenia/moje/`, a `/dashboard/` ustąpił miejsca
  `/dashboard/retrieve-password/`, bo panel jest już nasz. **64 sprawdzenia.**
  `smoke-wp-front` pilnuje obu przekierowań panelu i tego, że gość nie widzi
  na „Moich kursach" ani jednego kafelka — **83 sprawdzenia** — a **65.**
  sprawdzenie smoke'a motywu pilnuje pierwszej pozycji menu konta.
  `smoke-wp-lekcja` sprawdza **obie postacie strzałki „wróć"** (34): stan
  kupującego robi POMIAREM — zapisuje administratora na kurs, pyta stronę
  i zapis cofa.

### Świadomie BEZ zmian

**Cztery lekcje są darmowe dla każdego** — w naszych tabelach mają `preview = 1`:
pierwsza lekcja modułu 1 i jednego dalszego modułu w każdym kursie. Bramka
dostępu działa **zgodnie z tymi danymi**, więc to nie jest wyciek, tylko
próbka. Właściciel obejrzał liczby (18,5 tys. znaków na lekcję) i **zdecydował
2026-08-25: zostają wszystkie cztery.** Zapisane tutaj, żeby następne
zgłoszenie „lekcja otwiera się bez logowania" nie ruszyło śledztwa od nowa.

### Zapamiętane przy okazji

**`tutor_utils()->is_enrolled()` w tym samym żądaniu, w którym powstał zapis,
oddaje `false`** — Tutor trzyma zapisy w pamięci żądania. Sprawdzenie zaraz po
zapisie meldowałoby porażkę przy udanym zapisie, więc narzędzie weryfikuje
dostęp w **osobnym żądaniu**. Test negatywny (wyłączony zapis + skasowane
zapisy) wywala je z kodem wyjścia **1**, zmierzonym BEZ potoku.

## [0.44.0] — 2026-08-25

**Klient czyta lekcję w naszym wyglądzie, nie w cudzym.** Druga część kroku W5:
materiał kursu wyświetla NASZ szablon — ten sam wygląd, który właściciel przyjął
przy 0.34.0 — a nie strona Tutora.

### Dodane

- **`Aai_Sklep_Proza`** — renderer Markdownu w PHP, bez ani jednej zależności.
  Zakres ZMIERZONY na 73 plikach prozy: nagłówki, listy (także zagnieżdżone
  i numerowane), bloki kodu, tabele, cytaty, obrazy, odsyłacze, emfaza, linia
  pozioma. Rozpoznaje sekcje po nagłówkach, które w prozie JUŻ SĄ („Czego się
  nauczysz", „Zrób to teraz", „Zapamiętaj", „Co dalej") i pakuje je we własne
  pudełka z ikoną. **Ucieka wszystko** — materiał wchodzi kreatorem, czyli
  polem tekstowym. Konstrukcja, której nie zna, **zatrzymuje lekcję** zamiast
  pokazać klientowi `## Czego się nauczysz` jako zdanie.
- **`tools/sprawdz-proze-php.mjs`** (`npm run wp:proza`) — dowód różnicowy: te
  same 73 lekcje przez PHP i przez `marked` z narzędzia, którym powstał przyjęty
  podgląd; tekst musi zgadzać się **co do słowa**, struktura co do znacznika.
- **`Aai_Sklep_Zrzuty`** + `npm run wp:zrzuty` — 148 zrzutów w bibliotece
  mediów, idempotentnie (po `sha256`), kluczowane parą **lekcja + nazwa**, bo
  same nazwy powtarzają się między kursami i wewnątrz kursu. Treść w bazie
  zostaje nietknięta: ścieżka z prozy zamienia się w adres załącznika dopiero
  przy renderowaniu.
- **`Aai_Sklep_Lekcja`** + szablony `lekcja.php`, `czesci/pasek-lekcji.php`,
  `czesci/lekcja-odhacz.php`, `czesci/lekcja-bramka.php`, arkusz `lekcja.css`
  i skrypt `lekcja.js` — widok lekcji: pływająca pigułka z programem i spisem
  sekcji, hero z pozycją w kursie, treść w kolumnie czytania, zrzuty w figurach
  z zarezerwowanym miejscem, most „Co dalej", nawigacja poprzednia/następna.
- **`straznik-lekcji-wp`** (34. strażnik, 10 mutacji) i **`smoke-wp-lekcja`**
  (`npm run smoke:wp-lekcja`, 32 sprawdzenia z przelotem przez wszystkie
  73 lekcje).
- **`smoke-wp-motyw` mierzy PIĄTĄ stronę — widok lekcji** (47 sprawdzeń zamiast
  32). Widok lekcji jest jedyną mierzoną stroną **zza logowania** i jedyną, która
  mieszka pod adresem Tutora, więc na kolizję klas z 0.38.0 narażona jest
  najmocniej. Mierzymy ją **na końcu**: od chwili zalogowania każda kolejna
  odsłona niosłaby pasek narzędzi WordPressa, a cztery wcześniejsze strony mają
  wyglądać dokładnie tak, jak ogląda je gość. Adres lekcji **bierzemy z
  instalacji** (ta z największą liczbą zrzutów — jasne interfejsy najmocniej
  obciążają pytanie o jasne powierzchnie i kontrast), a nie z wpisanego sluga,
  który po pierwszej korekcie tytułu wskazywałby stronę 404 — też naszą i też
  ciemną, więc pomiar przechodziłby dalej.

### Zmienione

- **Postęp bierzemy z ukończeń Tutora**, nie z pamięci przeglądarki. Podgląd
  podpisywał postęp „nie na koncie", bo konta nie znał; tutaj klient jest
  zalogowany, więc podpis przestał być prawdą.
- **O dostęp pyta Tutor** (`has_enrolled_content_access`). Bez dostępu treść
  **nie jest w ogóle czytana** — materiał, którego nie wczytano, nie ma jak
  wyciec przez pomyłkę w szablonie.
- Strona lekcji **nie ładuje CSS-u ani JS-u Tutora** (`Aai_Sklep_Zasoby` wie,
  że to nasza strona), a **nagłówek motywu ustępuje pigułce** — tak samo jak
  na stronie kursu, bo obie belki są `fixed` u góry.

### Naprawione (znalezione dowodem różnicowym, w renderze prozy)

**Pomiar `/student-registration/` był ŚLEPY.** Zakres stron Tutora pytał
o `.tutor-wrap`, a ta strona renderuje ekran „Access Denied" w
`.tutor-disabled-wrapper` — więc cztery jej sprawdzenia (jasne plamy, kontrast,
nachodzenie, nieznane zapisy koloru) od 0.41.0 przechodziły **po pustce**,
meldując zero usterek bez oglądania ani jednego elementu. Zakres celuje teraz
w markup Tutora (`[class*='tutor-']:not(body)`), a przed nawrotem chroni nowa
asercja **„zakres trafił w co najmniej jeden element"**, dołożona na każdej
mierzonej stronie. To ona tę ślepotę wykryła — nie człowiek.

**Pomiar łapał pigułkę w losowej klatce animacji wjazdu** (`aai-pasek-wjazd`,
0,5 s): dwa przebiegi tej samej strony dawały dolną krawędź belki 61 px i 59 px,
a to właśnie ta liczba rozstrzyga, czy napis „wjeżdża pod belkę". Mierzymy teraz
po ustaniu ruchu — z filtrem na animacje nieskończone, bo samo `getAnimations()`
nigdy się nie kończy przy dryfujących blobach tła.

**Log smoke'a mówił nieprawdę**: drukował „0 jasnych plam" nawet wtedy, gdy lista
usterek pod spodem wypisywała sześć. Podaje teraz zmierzone liczby.

Pięć prawdziwych różnic wobec wzorca: emfaza bez reguły ograniczników GFM
(`** \ + Enter**` robiło się pogrubieniem), kursywa zagnieżdżona, kursywa
przez koniec wiersza, ogrodzenie kodu zamykane „na trzy" mimo czterech
apostrofów (lekcja o Markdownie pokazuje blok W BLOKU) oraz akapity w listach
zwartych. Zostały **dwie różnice świadome** — obie są usterkami `marked`
(próbuje emfazy przed kodem w linii), obie nazwane w kodzie dowodu.

### Dowody

Strażnicy **34/34**, audyt mutacyjny **155** (0 przeoczonych, 0 martwych),
`smoke-wp-lekcja` **32** (73 lekcje bez zatrzymania renderera, najdłuższa
odsłona **194 ms**), `smoke-wp-motyw` **47** (pięć stron), `smoke-wp-front` 78,
`smoke-wp-kreator` 95, `smoke-wp-dane` 30, dowód różnicowy **73/73**,
`wp:sprawdz` 73/73 co do znaku, `npm run check` zielone (testy 83/83).
Testy negatywne: renderer z wyłączoną kursywą wywala dowód na 57 lekcjach,
bramka przepuszczająca każdego wywala smoke na czterech sprawdzeniach, a przy
piątej stronie — jasne tło treści zapala plamy i kontrast **tylko na lekcji**,
pomiar bez zdjęcia paska narzędzi zapala samokontrolę układu, wyższa pigułka
chowa pod sobą cztery napisy hero.

Dowód, że zdjęcie paska narzędzi nie fałszuje pomiaru: przy realnie wyłączonym
pasku w profilu (`show_admin_bar_front=false`) strona lekcji ma **co do piksela**
ten sam układ, co przy dwóch regułach zdejmujących pasek — pigułka 0–68 px,
`<main>` 0–6990, hero 144–539, dokument 7642 px.

## [0.43.0] — 2026-08-25

**Kopia kursu w Tutor LMS przestaje starzeć się w milczeniu.** Pierwsza część
kroku W5: wtyczka kopiuje kurs do wpisów Tutora **po każdym zapisie**, a osobna
kontrola odpowiada na pytanie, czy obie kopie naprawdę są zgodne.

Do tego wydania kopia trafiała do Tutora RAZ, ręcznym `wordpress/import-kursy.php`.
Każda poprawka w kreatorze rozjeżdżała obie strony po cichu: właściciel widział
nową wersję w panelu, a klient po zalogowaniu czytał starą. Nic się przy tym nie
zapalało — a to jest w tym projekcie najdroższa klasa błędu (BLAD-015,
znalezisko #1 przeglądu B7).

### Dodane

- **`Aai_Sklep_Tutor`** — jedyne miejsce, które pisze do wpisów Tutora. Kopiuje
  kurs, moduły i lekcje (dopasowanie po `_aai_zrodlo_uuid`, nie po slugu),
  spłaszcza cztery sekcje do pól, które Tutor drukuje sam, a wszystkie dwanaście
  wkłada ze strukturą do `_aai_sekcje`. Kasuje w kopii to, czego nie ma już
  u nas — łącznie z całym kursem po jego usunięciu.
- **Wyzwalacz w warstwie zapisu**: `zapisz_kurs`, `zapisz_tresc_lekcji`,
  `ustaw_status` i `usun_kurs` ogłaszają zmianę akcją `aai_sklep_kurs_zmieniony`
  / `aai_sklep_kurs_usuniety`. Akcja, a nie wywołanie wprost — inaczej jedyne
  miejsce piszące do naszych tabel byłoby związane z cudzą wtyczką i jej brak
  byłby awarią zapisu.
- **`wp aai-sklep sync`** (`npm run wp:sync`) — pierwsze wypełnienie i naprawa
  po awarii — oraz **`wp aai-sklep sprawdz-tutora`** (`npm run wp:tutor`):
  porównuje obie kopie pole po polu i **kończy się kodem wyjścia 1**, gdy się
  rozjechały. Nazywa po imieniu trzy klasy rozjazdu: różnicę pola, sierotę po
  skasowanym obiekcie i wpis zrobiony poza kreatorem.
- **`straznik-tutora`** (33. strażnik, 12 mutacji w audycie) — pilnuje KODU:
  czy synchronizacja jest podpięta, czy jedzie w jedną stronę, czy każda droga
  zapisu ją ogłasza, czy wpisy Tutora rusza jedno miejsce, czy meta idzie przez
  `wp_slash`, czy spłaszczanie sekcji ma asercję i czy awaria kopii nie cofa
  zapisu właściciela.
- **`smoke-wp-tutor`** (`npm run smoke:wp-tutor`, 44 sprawdzenia) — pilnuje
  DANYCH na żywej instalacji, na własnym kursie: powstanie kopii, idempotencja
  (drugi import nie rusza ani jednego wpisu), zmiana tytułu i kolejności modułów,
  treść lekcji zgodna **co do znaku** (razem z backslashami, na których potknął
  się import w 0.36.0), publikacja, lekcja skasowana bez sieroty, okładka
  z biblioteki mediów jako miniatura i usunięcie całego kursu. Trzy z tych
  sprawdzeń to testy NEGATYWNE: ręczna zmiana w Course Builderze, sierota i wpis
  spoza kreatora — każdą kontrola musi zobaczyć.
- **Ostrzeżenie w kokpicie**, gdy kopia nie nadążyła. Cena decyzji „awaria kopii
  nie cofa zapisu" jest taka, że nieudana kopia byłaby niewidoczna; teraz błąd
  zostaje zapamiętany i widać go na każdym ekranie kreatora.
- **Filtr w audycie mutacyjnym**: `node tools/straznicy/audyt-straznikow.mjs
  straznik-tutora` puszcza same mutacje jednego strażnika. Pełny przebieg trwa
  kilka minut, a przy PISANIU strażnika potrzebna jest pętla zwrotna w sekundach.

### Zmienione

- **`wordpress/import-kursy.php` wycofany.** Jego mapy (status, poziom, cztery
  sekcje Tutora) przeniosły się do klasy wtyczki — tak, jak zapowiadał jego
  własny nagłówek. Skrypt umiał tylko przepisać eksport, więc kopia starzała się
  przy pierwszej poprawce z kreatora.
- **`wp aai-sklep import` raportuje też kopię w Tutorze** (i robi ją RAZ na kurs,
  na końcu, zamiast po każdym zapisie w pętli).
- Opis kursu jedzie do zajawki wpisu (`post_excerpt`), a treść wpisu zostaje
  **pusta świadomie**: stroną sprzedażową jest nasza `/szkolenia/<slug>`, na którą
  `/courses/<slug>/` i tak oddaje 301.

### Świadomie zostawione puste

- **Cena kursu w Tutorze zostaje `Free`.** Sprzedaż bierze WooCommerce (Plugin 2),
  a decyzja „gdzie mieszka cena" jeszcze nie zapadła. Wartość jedzie do kopii jako
  `_aai_cena_grosze`, żeby dana nie przepadła — ale kurs w Tutorze jest darmowy
  i to jest prawda, bo kupić się go tam nie da.
- **Miniatura wpisu tylko dla okładki z biblioteki mediów.** Okładki obu kursów
  to dziś pliki SVG jadące z wtyczką, a WordPress nie wpuszcza SVG do biblioteki
  — i nie zamierzamy tej blokady otwierać dla strony, którą klient ogląda pod
  naszym adresem. Okładka wybrana w kreatorze (od W4) staje się miniaturą od razu;
  pilnuje tego smoke.

### Dowody

Strażnicy **33/33**, audyt mutacyjny **145** (12 nowych, 0 przeoczonych,
0 martwych), `npm run check` zielone (testy **83/83**, build, smoke'i prototypu),
`smoke-wp-tutor` **44**, `smoke-wp-kreator` 95, `smoke-wp-front` 78,
`smoke-wp-motyw` 32, `smoke-wp-dane` 30, `wp:sprawdz` **73/73 zgodne co do
znaku**, `wp:tutor` **0 różnic na 87 obiektach**.

Test negatywny samego smoke'a: po odpięciu synchronizacji od warstwy zapisu
przebieg pada na ośmiu sprawdzeniach — czyli nie jest ślepy.

## [0.42.0] — 2026-08-25

**Właściciel może wreszcie zmienić treść w WordPressie.** Krok W4 etapu
WordPress: kreator z Działu 6 przeniesiony do kokpitu — kurs, program,
dwanaście rodzajów sekcji sprzedażowych i treść lekcji. Do tego wydania
jedyną drogą do treści był import z Postgresa komendą wiersza poleceń.

Wygląd panelu: **natywny kokpit WordPressa z akcentem volt** (decyzja
właściciela 2026-08-25). Okładkę wybiera się **z biblioteki mediów** — prototyp
odrzucił wgrywanie 2026-08-17 tylko dlatego, że nie miał gdzie trzymać plików.

### Dodane

- **Kreator w kokpicie** (`Aai_Sklep_Panel`) — menu „Automatic AI": lista
  kursów z licznikami postępu (sekcje, moduły, lekcje i **treść lekcji N/M**),
  edytor kursu z trzema zakładkami i JEDNYM zapisem, osobny edytor treści
  lekcji. Uprawnienie `manage_options` — to samo, którym W3 wpuszcza na
  szkice; token z prototypu **nie** jedzie do WordPressa, bo byłby drugim,
  słabszym systemem uprawnień obok istniejącego.
- **Kontrakt zapisu** (`Aai_Sklep_Kontrakt`) — to, czego W2 świadomie nie
  zrobił („kontrakt pól przychodzi z kreatorem w kroku W4"). Port `KursWejscie`,
  `TrescLekcji` i `MaterialLekcji` z `modules/m1-sklep/typy.ts` co do liczby,
  razem z blokadami z przeglądu B7: powtórzony `id` modułu albo lekcji,
  powtórzony rodzaj sekcji, powtórzona pozycja w jednym rodzicu. Błąd wraca ze
  **ścieżką do pola** (`moduly[2].lekcje[7].title`), a nie jako „zapis się nie
  powiódł".
- **Silnik opisu pól** (`Aai_Sklep_Pola`) — jedno miejsce, które wie, co znaczy
  „pole typu akapit". Odpowiada na cztery pytania naraz: czy treść z bazy da się
  wyświetlić, czy treść z formularza wolno zapisać, jak narysować kontrolkę
  i czego w sekcji brakuje. Port `components/kreator/tresc-sekcji.ts`.
- **Etykiety pól przeniesione DO KONTRAKTU** (`Aai_Sklep_Sekcje::SCHEMATY`).
  W prototypie mieszkały osobno (`opis-sekcji.ts`) i mogły rozjechać się
  z kontraktem — pilnował tego `straznik-kreatora`. Tutaj panel rysuje się
  z TEJ SAMEJ tablicy, którą sprawdzana jest treść, więc rozjazd jest
  **niemożliwy, a nie pilnowany** (to samo rozwiązanie, co `KOLEJNOSC`).
- **`Aai_Sklep_Sekcje::kolejnosc_w_panelu()`** — kolejność zakładek sekcji
  wyprowadzona z `KOLEJNOSC`, domknięta pętlą po wszystkich rodzajach. Rodzaj
  dopisany do kontraktu nie ma jak wypaść z panelu.
- **Warstwa odczytu panelu** (`Aai_Sklep_Odczyt_Panelu`) — osobno od odczytu
  dla strony, bo odpowiada na inne pytania: wszystkie stany kursu, sekcje
  **surowe** (bez pobłażliwego odsiewu — edytor ma pozwolić NAPRAWIĆ zły
  rekord, a nie ukryć go) i treść lekcji. Kolumnę `lessons.content` czyta
  wyłącznie ta klasa, za bramą uprawnień.
- **Trzy nowe drogi w warstwie zapisu**: `zapisz_tresc_lekcji()` (osobna akcja
  na materiał — ładunek i ryzyko, jak w prototypie), `ustaw_status()`
  (publikacja bez przepisywania kursu) oraz **rozróżnienie braku klucza
  `content`/`materials` od pustej wartości** — patrz „Naprawione".
- **`straznik-kreatora-wp`** (32. strażnik, 11 mutacji) i **`smoke-wp-kreator`**
  (`npm run smoke:wp-kreator`, 92 sprawdzenia) — szczegóły niżej.
- **`wp aai-sklep opis --format=json`** — komenda diagnostyczna z opisem pól.
  Dzięki niej smoke generuje przykładową treść Z KONTRAKTU, a nie z listy
  wpisanej w teście: pole dopisane do kontraktu samo wchodzi do rundy
  „zapisz → odczytaj". Mechanizm wprost z Działu 6.

### Naprawione

- **BLAD-017 — link autora ZNIKAŁ ze strony sprzedażowej.** Sekcja `author`
  obu kursów ma w bazie odnośnik `https://automaticai.pl`, a na żywej stronie
  napisu „Zobacz moje projekty" **nie było** (grep po HTML-u bez `<script>`:
  0 trafień). Kontrola pola typu `adres` używała `wp_http_validate_url()` —
  funkcji od SSRF, która rozwiązuje nazwę w DNS-ie i odrzuca hosty, których nie
  umie rozwiązać. `automaticai.pl` to domena docelowa, **jeszcze niekupiona**,
  więc każdy odnośnik do niej był po cichu odsiewany. Wyszło dopiero przy W4:
  ścisły kontrakt kreatora odrzucił poprawny adres komunikatem „podaj pełny
  adres http/https". Teraz pytamy o to, o co naprawdę chodzi — czy adres wolno
  **wydrukować**: biała lista schematów, odrzucenie loginu i hasła w adresie,
  zero DNS-u.
- **Zapis programu nie kasuje napisanej treści.** Do 0.41.0 warstwa zapisu
  budowała lekcję docelową jako `(string) ( $l['content'] ?? '' )`, więc BRAK
  klucza znaczył pustkę. Kreator wysyła sam spis treści (tytuły, kolejność,
  czasy) — pierwsze naciśnięcie „Zapisz kurs" wyczyściłoby prozę 73 lekcji
  i zameldowało sukces. Teraz brak klucza znaczy „nie ruszaj"; klucz podany,
  choćby pusty, dalej znaczy dokładnie to, co przyszło (import wysyła te
  kolumny zawsze, więc jego zachowanie jest bez zmian). Sprawdzone testem
  negatywnym: po zdjęciu tego rozróżnienia smoke zapala się na obu kursach.
- **Zajęty adres (slug) wskazuje POLE, nie awarię.** Bez tego baza odrzucała
  zapis kluczem `UNIQUE`, a panel mówił „zapis się nie powiódł" — czyli
  o czymś zupełnie innym niż to, co trzeba poprawić.
- **Brak klucza `sekcje`/`moduly` KASOWAŁ sekcje i program** (znalezione
  w przeglądzie kroku, potwierdzone uruchomieniowo: „po utworzeniu: sekcji=1
  moduly=1" → „po zapisie bez kluczy: sekcji=0 moduly=0"). Kontrakt i sam plik
  warstwy zapisu obiecywały co innego — „brak klucza znaczy nie ruszaj" — więc
  była to nieprawda w dokumentacji **o zachowaniu kasującym dane**. Panel
  zawsze wysyła oba klucze, więc z zewnątrz nie było tego widać; usterka
  czekała na pierwszego nowego klienta tej warstwy, czyli na synchronizację
  do Tutora w W5.
- **Zapis kursu ze starszej karty CICHO cofał publikację.** Formularz edytora
  niósł stan kursu w polu ukrytym, a publikację klika się na LIŚCIE — więc
  wystarczyło mieć edytor otwarty przed publikacją, żeby poprawka jednego
  zdania wyrzuciła kurs z katalogu z komunikatem „zapisano". Potwierdzone
  uruchomieniowo. Formularz nie niesie już stanu, a warstwa zapisu rozumie
  brak tego klucza jako „zostaw, jak jest".

### Zmienione

- **`Aai_Sklep_Trasy::widzi_szkice()`** pyta o `Aai_Sklep_Panel::UPRAWNIENIE`
  zamiast o wpisany na sztywno `manage_options` — jedno źródło odpowiedzi na
  pytanie „czy ta osoba zarządza sklepem".
- **Typ produktu `ebook` NIE wchodzi do panelu.** Prototyp ma go w enumie;
  właściciel zamknął ten temat 2026-08-25 słowem „na zawsze". Panel, który
  dawałby ebooka do wyboru, byłby zaproszeniem do złamania tej decyzji jednym
  kliknięciem. Oba kursy w bazie mają `kurs` — sprawdzone, nic nie staje się
  przez to nieedytowalne.
- **Pierwszy zapis kursu przez panel porządkuje kolejność kluczy w JSON-ie
  sekcji** (treść bez zmian co do znaku). Kolejne zapisy nie ruszają niczego —
  sprawdzone: drugi zapis oddaje „bez zmian" i zero wpisów w dzienniku audytu.

### Do zapamiętania

- **`add_submenu_page()` + `remove_submenu_page()` NIE robi ukrytej strony.**
  Wygląda na czystszą drogę i jest pułapką: `remove_submenu_page` wycina wpis
  z `$submenu`, a `get_admin_page_parent()` szuka rodzica właśnie tam — bez
  niego `admin.php` nie znajduje haka strony i oddaje **403 „Sorry, you are not
  allowed to access this page"**. Wygląda to jak błąd uprawnień, a jest błędem
  rejestracji. Ukrytą stronę robi `null` jako rodzic.
- **Sekcje i program jadą w POST jako JEDEN JSON**, a nie jako setki pól.
  `max_input_vars` (domyślnie 1000) ucina POST **w milczeniu**, a kurs z 41
  lekcjami wystawiłby setki pól — cicha utrata treści. Wysyłka całego kursu ma
  dziś **17 pól**. Pola ukryte z JSON-em startują wypełnione stanem z bazy, więc
  gdyby skrypt panelu nie wystartował, zapis jest pusty w skutkach zamiast
  czyścić kurs.
- **Treść lekcji NIE idzie przez `sanitize_text_field`** (skleiłoby Markdown
  w jedną linię), ale MUSI iść przez `wp_unslash` — WordPress dokłada do
  `$_POST` ukośniki, więc bez tego `C:\Users` z kursu o Gicie zapisałoby się
  jako `C:\\Users`. Sprawdzone testem negatywnym.
- **Test negatywny na warstwie zapisu KASUJE prawdziwe dane.** Mutacja „brak
  klucza `content` znaczy pustkę" wyczyściła prozę wszystkich 73 lekcji, bo
  smoke zapisuje też prawdziwe kursy (dowód, że panel ich nie rusza). Droga
  powrotna: `npm run wp:import` → `npm run wp:sprawdz` (73/73 co do znaku).
  Przed takim testem robić zrzut tabel.

### Stan dowodów

Strażnicy **32/32**, audyt mutacyjny **133** (0 przeoczonych, 0 martwych),
`smoke-wp-kreator` **95**, `smoke-wp-front` **78**, `smoke-wp-motyw` **32**,
`smoke-wp-dane` **30**, `wp:sprawdz` **73/73 co do znaku**, prototyp bez
regresji (`npm run check`).

Po napisaniu kroku wykonany został jego **przegląd** — pięć obszarów
(bezpieczeństwo wysyłek, bezpieczeństwo danych, zgodność z kontraktem
prototypu, zachowanie panelu, ucieczka znaków), każde znalezisko potwierdzone
uruchomieniowo na żywej instalacji, zanim powstała naprawa. Dwa znaleziska
realne (wyżej), trzy sprawdzenia bez zarzutu: zamiana pozycji modułów
przechodzi przez dwufazowe przestawianie MySQL-a, treść z `<script>`
i `onerror` jest uciekana i w panelu, i na stronie sprzedażowej, a odmowa
skasowania napisanej treści liczy także lekcje z usuwanych modułów.

## [0.41.0] — 2026-08-25

**Klient ogląda `/szkolenia` w naszym wyglądzie, a nie w Tutorowym.** Krok W3
etapu WordPress: katalog i strony sprzedażowe renderowane Z NASZYCH TABEL,
pozycja „Szkolenia" w menu motywu i jeden adres kanoniczny zamiast dwóch.

Przed tym wydaniem `/szkolenia` oddawało **404**, a `/szkolenia/<slug>` **301
na `/courses/<slug>/`** — czyli WordPress sam zgadywał slug i odsyłał na stronę
Tutora, której klient oglądać nie ma (potwierdzenie właściciela 2026-08-25).

### Dodane

- **Trasy `/szkolenia` i `/szkolenia/<slug>`** (`Aai_Sklep_Trasy`) — reguły
  przepisywania `top` + `template_include`. Reguła `top` odbiera WordPressowi
  zgadywanie adresu, które robiło tamto przekierowanie. Nieistniejący albo
  nieopublikowany kurs oddaje **prawdziwe 404** (kod, nie samą stronę) i naszą
  stronę „nie znaleziono" — motyw nie ma `404.php`, więc bez niej klient
  dostawał pusty `<main>`. Szkice widzi wyłącznie `manage_options`.
- **Warstwa odczytu** (`Aai_Sklep_Odczyt`) — port kanału JSON z prototypu.
  Liczniki (moduły, lekcje, minuty) liczy BAZA, nie szablon: dwa szablony
  liczące osobno prędzej czy później policzą co innego, a to była usterka
  z przeglądu B7 („41 41 lekcji" w miniaturze OG).
- **Kontrakt treści sekcji** (`Aai_Sklep_Sekcje`) — port `SCHEMATY_SEKCJI`
  z `modules/m1-sklep/typy.ts` razem z limitami co do liczby. Sekcja o złym
  kształcie **znika**, zamiast wysadzać stronę (odpowiednik `safeParse`).
  Tu też mieszka **jedno źródło prawdy o kolejności sekcji** — patrz niżej.
- **Katalog i strona sprzedażowa** — 12 rodzajów sekcji + hero, program,
  platforma, oferta i domknięcie; markup i zachowanie pól przepisane
  z `components/kurs/*` (wygląd przyjęty przy B5, wersja 0.12.1). Akordeony
  na natywnym `<details>` — program otwiera się także bez JavaScriptu, a
  wyszukiwarka widzi wszystkie tytuły lekcji.
- **`assets/sklep.css` i `assets/sklep.js`** — własny arkusz (tokeny motywu
  przez `var(--color-volt, #bfff38)`: wartość jego, awaria nasza) i ~200 linii
  skryptu bez zależności. Treść jest widoczna, gdy skryptu nie ma: chowamy ją
  dopiero pod `html.js`, a obserwator ma trzysekundowy strażnik ostatniej
  szansy.
- **Pozycja „Szkolenia" w nawigacji motywu** (`Aai_Sklep_Menu`) — `ob_start`
  na `get_header`. Wstrzyknięcie **klonuje ostatnią pozycję menu** i podmienia
  w niej adres, napis, numer porządkowy i opóźnienie kaskady; kotwiczy na
  `aria-label="Nawigacja główna"` / `"Nawigacja mobilna"`, czyli na TREŚCI.
  Motyw jest generowany — klasy Tailwinda zmienią się przy pierwszej
  regeneracji, a klon zawsze pasuje do tego, co motyw ma dzisiaj.
- **Tytuł, opis, kanonik, OpenGraph i JSON-LD** (`Aai_Sklep_Seo`) — motyw
  zdejmuje `rel_canonical` i ustawia tytuł tylko dla wpisów, a nasze strony
  wpisami nie są. `Offer.availability` zostaje **`PreOrder`**: zakup jest
  placeholderem do czasu Pluginu 2.
- **Przekierowania z Tutora** (decyzja właściciela 2026-08-25):
  `/courses/<slug>/` → **301** na `/szkolenia/<slug>/`, `/courses/` → `/szkolenia/`.
  Slug bierzemy z NASZYCH tabel po `_aai_zrodlo_uuid`, nie z `post_name`.
  Adresy lekcji zostają Tutora — nasze szablony wchodzą tam w W5.
- **`straznik-frontu-wp`** (31. strażnik, 9 mutacji) i **`smoke-wp-front`**
  (`npm run smoke:wp-front`, 78 sprawdzeń) — szczegóły niżej.

### Naprawione — znalezione POMIAREM, nie z pamięci

- **Okładki kursów oddawały 404.** `cover_url` wskazuje `/okladki/*.svg`,
  czyli adres z `public/` prototypu Next.js; na WordPressie nie ma tam nic
  i katalog rysował ikonę zepsutego obrazka z tekstem alternatywnym. Okładki
  jadą teraz Z WTYCZKĄ (`assets/okladki/`), a `Aai_Sklep_Widok::okladka()`
  szuka po kolei: pełny adres → plik w instalacji → plik przy wtyczce →
  `null`, czyli **zaprojektowany zastępnik zamiast zepsutego obrazka**.
- **Adresy bez ukośnika robiły z każdego kliknięcia przekierowanie.**
  Instalacja ma strukturę `/%postname%/`, więc `redirect_canonical` odsyłał
  `/szkolenia` → `/szkolenia/`. Teraz adresy składa `user_trailingslashit()`.
- **Pigułka kursu nachodziła na nagłówek motywu.** Obie belki są
  `position: fixed` u góry. Strona kursu chowa więc nawigację motywu i stawia
  w jej miejsce własną — tak samo jak prototyp (`NavbarPrzelacznik`), i taki
  wygląd właściciel przyjął przy B5.
- **`Aai_Sklep_Zasoby` nie rozpoznawał rejestracji, koszyka i kasy Tutora** —
  pytał tylko o panel kursanta. Te strony zostawały bez naszego arkusza, czyli
  z białym formularzem na ciemnym motywie.
- **Tutor 4.0.7 wprowadził DRUGĄ rodzinę tokenów** (`--tutor-surface-*`,
  `--tutor-text-*`, `--tutor-icon-*`, `--tutor-border-*`, `--tutor-button-*`,
  `--tutor-actions-*` — 305 zmiennych) i to ona steruje dziś logowaniem,
  rejestracją i panelem. Mapowanie z 0.40.0 tam nie sięgało: formularz miał
  białe pola i granatowy przycisk. `assets/tutor-motyw.css` mapuje teraz obie
  rodziny; przywrócony też font motywu (Tutor ustawia `Inter` na `body`, przez
  co ten sam napis w stopce zajmował dwie linie zamiast jednej — 45,5 px
  zamiast 22,75 px).

### Naprawione w samym POMIARZE — dwie dziury, które fałszowały wynik

- **`smoke-wp-motyw` czytał `color(srgb 0.749 1 0.219 / 0.1)` jak `rgb()`**,
  czyli składowe 0–1 traktował jak 0–255. Tak przeglądarka oddaje `color-mix()`,
  na którym stoi i motyw (Tailwind 4), i nasz arkusz — więc jasny akcent
  wychodził prawie czarny i kontrast 15:1 raportowany był jako **1,11:1**.
  Zapisu, którego pomiar nie umie rozebrać, nie zgadujemy: ląduje na liście
  `nieznane` i wywala smoke.
- **Tekst malowany gradientem** (`background-clip: text`, `color: transparent`)
  dostawał 1:1, bo wzór na kontrast dwóch płaskich kolorów nie ma jak go
  policzyć. Nie pomijamy go w milczeniu — bierzemy **najsłabszy przystanek
  gradientu**, czyli najgorszy przypadek, jaki ten napis może pokazać.

### Zmienione

- **`smoke-wp-motyw` mierzy teraz cztery strony zamiast dwóch**: nasze
  `/szkolenia/` i `/szkolenia/<slug>/` oraz — zamiast przekierowanych już
  `/courses/*` — panel kursanta i rejestrację, czyli strony Tutora, które
  NAPRAWDĘ zobaczy człowiek. Zakres pomiaru jest parametrem, a „belka u góry"
  to teraz nagłówek motywu **albo** nasza pigułka: pytanie „czy treść wjeżdża
  pod belkę" ma na stronie kursu inną belkę. 32 sprawdzenia.
- Porównanie stopki toleruje różnicę wysokości do 4 px (zaokrąglenia układu
  i moment wczytania fontu); tło, sposób układania i margines wewnętrzny
  porównujemy dalej co do znaku.
- **Kolejność sekcji strony sprzedażowej ma jedno źródło** —
  `Aai_Sklep_Sekcje::KOLEJNOSC`. Wcześniej szablon i warstwa SEO miały własne
  listy i **dało się je rozjechać**: test negatywny pokazał sekcję FAQ usuniętą
  ze strony, która nadal wystawiała `FAQPage` z pytaniami, których klient nie
  widzi. Teraz ten rozjazd jest niemożliwy, a nie pilnowany.
- Opis katalogu w danych `<meta>` nie mówi już o „ebookach" — właściciel
  zamknął ten temat na zawsze 2026-08-25 („E-BOOKI: NIGDY").

### Dowody

Strażnicy **31/31**, audyt mutacyjny **118 mutacji: 116 złapanych,
0 przeoczonych, 0 martwych**, `smoke-wp-front` **78 sprawdzeń**,
`smoke-wp-motyw` **32 sprawdzenia**, `smoke-wp-dane` **30**, `wp:sprawdz`
**73/73 treści zgodnych co do znaku** (dane nietknięte), prototyp bez regresji.

**Pięć testów negatywnych `smoke-wp-front`** (reguła po 0.24.0: każdy nowy test
sprawdzić testem negatywnym): zerwana kotwica menu, zdjęte przekierowanie
z `/courses/`, sekcja FAQ poza kolejnością, program bez lekcji, cena wycięta
z oferty. Dwa z nich zmusiły do wzmocnienia samego smoke'u — treść sprawdzamy
teraz w HTML-u **bez `<script>`** (inaczej dane strukturalne usprawiedliwiały
sekcję, której na stronie nie ma), a cenę **w sekcji oferty**, nie gdziekolwiek
na stronie.

**Audyt mutacyjny złapał dwie dziury w moim własnym strażniku**: blok
`prefers-reduced-motion` czytany „do końca pliku" usprawiedliwiał regułę
dopisaną po nim, a pierwsza wersja reguły o `position: fixed` znajdowała
`<main>` w komentarzu i oskarżała poprawny szablon. Obie naprawione,
kontrprzykład na tę drugą jest w audycie.

### Pułapka środowiska do zapamiętania

**`opcache.revalidate_freq = 2`** w kontenerze WordPressa: PHP sprawdza czas
modyfikacji pliku najwyżej raz na dwie sekundy. Testy negatywne puszczone
jeden po drugim mierzyły więc POPRZEDNI stan kodu — wynik wyglądał jak
„strażnik przepuścił mutację", a naprawdę serwer oddawał starą wersję. Między
zmianą pliku a pomiarem trzeba odczekać ≥ 3 s. To ta sama klasa co działający
`npm run dev` psujący produkcyjny build (0.34.0).

## [0.40.0] — 2026-08-25

**Strony Tutora wyglądają jak strona Automatic AI, a nie jak cudzy serwis.**
Zgłoszone zrzutem właściciela („nadal to samo z renderem, szukaj głębiej") —
poprzednia poprawka zdjęła z ekranu JSON, ale nie tknęła tego, co naprawdę
łamało wygląd.

### Znalezione — przyczyna leżała w KASKADZIE, nie w kolejności arkuszy

**Motyw to Tailwind 4 i trzyma CAŁY swój CSS w warstwach kaskady**
(`@layer properties, theme, base, components, utilities`). Arkusze Tutora są
POZA warstwami, a reguła bez warstwy **bije każdą regułę w warstwie —
niezależnie od specyficzności i od kolejności ładowania**. Na stronie, gdzie
CSS Tutora jest obecny, każda jego reguła wygrywa z każdą klasą motywu, choć
motyw ładuje się ostatni.

To jest prawdziwy powód kolizji `.text-label` z 0.38.0. Tamta naprawa
(zdjęcie CSS-u Tutora ze stron motywu) działa tylko tam, gdzie wolno go
zdjąć — **na własnych stronach Tutora kolizja żyła dalej** i malowała na
jasno nagłówek oraz stopkę motywu. Nic przy tym nie padało.

Do tego motyw ma nagłówek `position: fixed` (72 px) i **nie rezerwuje pod
niego miejsca**: jego własne strony robią to same (`pt-28`, `md:pt-36`),
a szablon Tutora daje `tutor-mt-16`, czyli 16 px. Stąd tytuł kursu pod
nawigacją.

### Dodane

- **`assets/tutor-motyw.css` + `Aai_Sklep_Styl_Tutora`** — warstwa
  integracji wchodząca WYŁĄCZNIE na strony Tutora (klasa `body`
  `aai-tutor-na-motywie`): odstęp pod nagłówek, 16 zmiennych `--tutor-*`
  przemapowanych na tokeny motywu, powierzchnie wpisane u Tutora hexem na
  sztywno, pola formularzy i akcent volt zamiast niebieskiego.
  Kolizję klas naprawia **`revert-layer`** — reguła bez warstwy cofa
  właściwość do wartości z warstwy motywu, więc nie zgadujemy jego wartości
  (są różne dla różnych elementów), tylko oddajemy mu głos.
  **To NIE jest łatka na jedną stronę:** `/dashboard/` i archiwum
  `/courses/` mają ten sam problem, a te strony zostają Tutora wg podziału
  z ETAP-WP.md.
- **`smoke-wp-motyw` (`npm run smoke:wp-motyw`)** — mierzy ŻYWĄ stronę
  w prawdziwej przeglądarce: nachodzenie na nagłówek, kontrast KAŻDEGO
  napisu (próg 4.5:1), jasne plamy w markupie Tutora (z pominięciem akcentu,
  liczone po złożeniu koloru z tłem — półprzezroczysty volt nie jest jasną
  plamą) oraz **stopkę motywu porównaną 1:1 ze stroną motywu**, co łapie
  kolizje klas, o których dziś nie wiemy. 14 sprawdzeń.
- Ósmy fakt o motywie w [ETAP-WP.md](docs/ETAP-WP.md) — warstwy kaskady
  i brak rezerwacji miejsca pod nagłówek. **Dotyczy też naszych stron
  w W3**: szablon spoza motywu musi dodać odstęp sam.

### Zmienione

- Komentarz `Aai_Sklep_Zasoby` mówił, że dequeue „zamyka całą klasę
  problemu". Zamyka ją tam, gdzie wolno zdjąć cudzy arkusz — teraz jest to
  napisane wprost, razem z drugą stroną medalu.
- Wtyczka w wersji 0.3.0.

### Dowody

Pomiar w przeglądarce (puppeteer-core + systemowy Firefox, rig
w scratchpadzie — nigdy w `package.json`): tytuł kursu **83 px pod
nagłówkiem** zamiast pod nim, kontrast tytułu **18,27:1**, **zero** napisów
poniżej 4,5:1 na obu stronach Tutora, **zero** jasnych plam poza akcentem,
stopka motywu **identyczna co do piksela** z tą samą stopką na stronie
motywu. Testy negatywne: mutacja zdejmująca odstęp → 3 elementy pod
nagłówkiem; mutacja zdejmująca `revert-layer` → 9 z 40 elementów stopki
rozjechanych; mutacja przywracająca białą kartę → jasna plama 87 079 px²
i dwa napisy poniżej progu.

## [0.39.1] — 2026-08-25

### Naprawione

- **Strona kursu w Tutorze wyświetlała człowiekowi surowy JSON** („What Will
  You Learn?", „Material Includes" — zgłoszone zrzutem właściciela). Tutor
  drukuje swoje cztery pola WPROST, dzieląc wartość po znakach nowej linii,
  a import wkładał tam nasze struktury zakodowane JSON-em. Nic się przy tym
  nie zapalało: dana wchodziła poprawnie, tylko nie nadawała się do czytania.
  `wordpress/import-kursy.php` spłaszcza teraz te cztery sekcje do linii
  (`Tytuł — opis`), a **wszystkie dwanaście** jedzie obok do `_aai_sekcje`
  ze strukturą, więc kopia w WordPressie jest kompletna niezależnie od tego,
  kto które pole czyta.
- Spłaszczenie ma **asercję**: sekcja, której kształt przestał pasować,
  zatrzymuje import zamiast wydrukować JSON na stronie kursu. Sprawdzone
  testem negatywnym (mutacja opróżniająca `punkty` → `Error: sekcja benefits
  nie dała się spłaszczyć…`, zero zapisów).
- `nie_dla` z sekcji „dla kogo" świadomie NIE wchodzi do
  `_tutor_course_target_audience`: pole Tutora znaczy „dla kogo JEST ten
  kurs", więc lista „to NIE jest dla Ciebie, jeśli…" zmieniłaby wymowę na
  przeciwną.

**To dotyczy wyłącznie KOPII dla Tutora.** Nasze tabele są nietknięte
(`npm run wp:sprawdz` → 73/73 co do znaku), a klient docelowo nie ogląda
szablonów Tutora: katalog i strony sprzedażowe robi W3, widok lekcji — W5.

## [0.39.0] — 2026-08-25

**Oba kursy są w tabelach wtyczki WordPressa — 73 lekcje zgodne co do znaku,
idempotencja potwierdzona dwa razy z rzędu.** Krok W2 z planu wtyczki
(W1 fundament → **W2 dane** → W3 front → W4 kreator → W5 Tutor → W6 test
ręczny właściciela).

### Dodane

- **Warstwa zapisu wtyczki** (`class-aai-sklep-zapis.php`) — jedyne miejsce,
  które pisze do naszych tabel. Port `modules/m1-sklep/dyspozytor.ts` z tymi
  samymi decyzjami: transakcja na kurs, upsert po uuid (identyfikatory
  z Postgresa jadą 1:1, więc klucz idempotencji jest kluczem głównym),
  kasowanie od dołu, **odmowa skasowania lekcji z napisaną treścią** bez
  jawnej zgody (decyzja D przeglądu B7) i **dziennik audytu tylko przy
  realnej zmianie** (decyzja E). Wiersz bez zmian nie dostaje nawet
  `UPDATE`-a — dlatego liczba wierszy dziennika jest ostrym testem
  idempotencji, a nie ozdobą.
- **Import i komendy WP-CLI**: `wp aai-sklep import <plik>`,
  `wp aai-sklep sprawdz [--format=json]`, `wp aai-sklep usun <slug|id>`
  (`class-aai-sklep-import.php`, `class-aai-sklep-raport.php`,
  `class-aai-sklep-cli.php`). Wtyczka w wersji 0.2.0.
- **`npm run wp:import`** — jedna komenda dla człowieka i dla skryptu:
  eksport z Postgresa → kopia do kontenera → import. Rozjazd tych dwóch
  dróg kosztował nas już wydanie (0.24.0, BLAD-012). Obok
  `npm run wp:eksport`, `npm run wp:sprawdz` i `npm run smoke:wp`.
- **`tools/sprawdz-import-wp.mjs`** — dowód porównujący **dwie bazy**, nie
  import z własnym meldunkiem: treść każdej lekcji przez `sha256`, liczby
  znaków w trzech niezależnych rachunkach (punkty kodowe w JS, `mb_strlen`
  w PHP, `CHAR_LENGTH` w SQL), struktury sekcji i materiałów porównywane
  głęboko (`[]` i `{}` to nie to samo).
- **`tools/smoke/smoke-wp-dane.mjs`** — 30 sprawdzeń na własnym kursie
  testowym: przestawianie kolejności modułów i lekcji, przeniesienie lekcji
  między modułami na zajętą pozycję, odmowa i zgoda przy kasowaniu treści,
  kasowanie sekcji i kursu, powrót liczników tabel do stanu sprzed
  przebiegu. Poza `npm run smoke` i poza CI — wymaga podmana.
- **Ósmy niezmiennik `straznik-wtyczki-wp`**: do naszych tabel pisze
  wyłącznie warstwa zapisu. To ten strażnik, który od 0.38.0 był zapowiadany
  w komentarzu schematu jako zamiennik utraconej gwarancji triggerów —
  w Postgresie dziennik pisała baza, tutaj pisze go PHP, więc gwarancję musi
  dać architektura. Audyt mutacyjny: 107 → **109 mutacji**.

### Zmienione

- **`tools/eksport-wp.mjs` oddaje wierny zrzut naszych tabel (format 2)**
  i przestaje wiedzieć cokolwiek o Tutorze: nazwa każdego pola jest nazwą
  kolumny, tej samej w Postgresie i w MySQL. Słowniki Tutora (statusy,
  poziomy, cztery sekcje, które Tutor ma u siebie) przeniosły się do
  `wordpress/import-kursy.php` — do kodu, który ich używa, i tam, gdzie
  W5 i tak będzie ich potrzebował w PHP. Ścieżka do Tutora została na tym
  formacie **ponownie udowodniona**, już na środowisku odtwarzalnym
  (`:8892`): 87 utworzonych → 0/0/87 → 0/0/87.
- **`straznik-wtyczki-wp`, niezmiennik 6 celuje w ZACHOWANIE, nie w nazwę.**
  Poprzednia wersja flagowała każdą zmienną w łańcuchu SQL, więc oskarżała
  też `"SELECT * FROM `$t_kursy`"` — a nazwy tabeli nie da się podać przez
  `prepare()` (to identyfikator, nie wartość). Teraz wolno wkleić wyłącznie
  zmienną wziętą z klasy tabel; każda inna to wartość i musi iść przez
  `prepare()`. Ta sama lekcja co przy `straznik-limitera` w 0.28.0.
- `eksport-wp/` wchodzi do `.gitignore` — to artefakt odtwarzalny jedną
  komendą, a nieśledzony katalog brudził drzewo wymagane przez
  `deploy:podglad`.

### Naprawione

- **`postaw.sh` pyta KONTENER, czy widzi wtyczkę.** Bind mount trzyma inode
  katalogu, więc gdy katalog zostanie na dysku odtworzony po starcie
  kontenera, w kontenerze zostaje pustka: pliki są, `podman inspect` pokazuje
  właściwą ścieżkę, a WordPress przestaje znać wtyczkę. Objaw wyglądał na
  błąd wtyczki, nie montażu; skrypt mówi teraz wprost, co naprawić.

### Zapamiętane (pełnia: [MIGRACJA-DO-WP.md](docs/plugin-1/MIGRACJA-DO-WP.md))

- **Pułapka `wp_slash` NIE dotyczy `$wpdb`.** `update_post_meta()` puszcza
  wartość przez `wp_unslash()` i zjada backslashe; `$wpdb->insert()`/`update()`
  tego nie robią. Warstwa zapisu przeszła idempotencję bez poprawek, a 38
  backslashy w 9 lekcjach dojechało bez zmiany.
- **Sprawdzenie, które mówi „zero", bywa ślepe po OBU stronach.** Pierwsze
  liczenie backslashy dało „0 i 0 — zgodne", bo oba wyrażenia szukały DWÓCH
  backslashy zamiast jednego. Zgodność zer nie jest dowodem.
- **MySQL nie umie odroczyć `UNIQUE`** (Postgres miał `DEFERRABLE`), więc
  zamiana kolejności dwóch modułów łamie ograniczenie w stanie pośrednim.
  Warstwa zapisu przestawia pozycje dwufazowo — najpierw poniżej zera, potem
  docelowo. Mutacja usuwająca ten krok wywala smoke natychmiast.

## [0.38.0] — 2026-08-25

**Etap WordPress wystartował: środowisko odtwarzalne jedną komendą, szkielet
wtyczki `aai-sklep` z tabelami w bazie WP i higiena zasobów, która przestaje
łamać stronę Automatic AI.** Krok W1 z planu wtyczki (W1 fundament → W2 dane →
W3 front → W4 kreator → W5 Tutor → W6 test ręczny właściciela).

### Dodane

- **Decyzje właściciela otwierające etap** (PR #64, sekcja „Decyzje właściciela
  (2026-08-25)" w [ETAP-WP.md](docs/ETAP-WP.md)): trzy wtyczki do motywu
  Automatic AI; hybryda z Tutor LMS + WooCommerce zostaje; własne tabele
  z prefiksem w bazie WP (nie osobne bazy); kod w tym repo; kolejność 1→2→3
  z testem ręcznym po każdej wtyczce; źródło prawdy o kursie w naszych
  tabelach (do Tutora kopia); nasze szablony lekcji; menu przez podmianę
  nagłówka ze strażnikiem; **e-booków nie będzie nigdy**; mail po zakupie
  z linkiem „Ustaw hasło", nie z hasłem.
- **Środowisko `wordpress/srodowisko/`** (compose + `postaw.sh`): WP + MariaDB
  + motyw Automatic AI + treść strony 1:1 + WooCommerce + Tutor LMS + nasze
  wtyczki montowane wprost z repo, na `127.0.0.1:8892`. Skrypt jest
  idempotentny i kończy WERYFIKACJĄ ARTEFAKTU (nawigacje motywu, aktywność
  wtyczki, istnienie tabel, higiena zasobów w obie strony). Motyw mieszka
  poza repo (`~/.cache/automatic-ai-warsztat`), bo strażnicy skanują dysk,
  nie git — pobrany do drzewa repo wywołał fałszywy alarm `straznik-seo`.
- **Wtyczka `aai-sklep` 0.1.0**: szkielet z autoloaderem bez Composera,
  pięć tabel `wp_aai_sklep_*` przez `dbDelta` (port `db1_kursy` z decyzjami
  przeglądu B7 wykonanymi w schemacie: `UNIQUE (course_id, kind)` bez
  `position`, treść lekcji jako `mediumtext` — `text` uciąłby dłuższą lekcję
  w milczeniu), `uninstall.php` domyślnie NIE kasujący danych. Audyt zmian
  pisze PHP, nie triggery — świadome odstępstwo od Działu 2 (uprawnienie
  TRIGGER bywa na hostingu odebrane), nazwane wprost i pilnowane strażnikiem.
- **`straznik-wtyczki-wp`** (30. strażnik) + 4 mutacje w audycie: blokada
  bezpośredniego wywołania plików PHP, jedno źródło nazw tabel, zapytania
  przez `prepare()`, komplet nagłówków, uninstall bez kasowania treści.

### Naprawione

- **Strona Automatic AI łamana przez CSS Tutora** (zrzuty właściciela):
  `tutor-front.min.css` definiuje globalne `.text-label` z jasnym tłem,
  a motyw używa tej samej nazwy na 30+ elementach — plakietki i marquee
  stopki jechały. Skan 249 klas motywu przeciw arkuszom wtyczek: jedna
  kolizja groźna, cztery nieszkodliwe; konwersja motywu ZDROWA (to samo
  było na starym :8091). Naprawa: `Aai_Sklep_Zasoby` — zasoby Tutora/Woo
  nie wchodzą na strony, które ich nie używają; gwarancją filtry
  `*_loader_src` (samo zdejmowanie z kolejki przepuszczało `wc-blocks-style`
  i `sourcebuster-js` — zmierzone). Dowody: 15/15 stron motywu czystych,
  koszyk trzyma 34 zasoby Woo, dashboard 4 zasoby Tutora, overflow 0 px,
  zrzuty przeglądarką. `postaw.sh` pilnuje odtąd OBU stron medalu.

## [0.37.0] — 2026-08-25

**Sześć decyzji właściciela po przeglądzie B7 — wykonane co do jednej.**
Przegląd z 0.36.0 zostawił sześć pozycji, których agent nie ruszał z własnej
inicjatywy, bo każda zmieniała zachowanie produktu albo kształt tabel przy
porcie na WordPressa. Właściciel rozstrzygnął komplet 2026-08-25. Decyzje
i uzasadnienia odrzuconych wariantów:
[docs/plugin-1/PRZEGLAD-B7.md](docs/plugin-1/PRZEGLAD-B7.md).

### Zmienione — schemat bazy

- **Jedna sekcja danego rodzaju na kurs** (migracja 008). `UNIQUE (course_id,
  kind, position)` dopuszczał dwie sekcje tego samego rodzaju, a strona czyta
  je przez `find(s => s.kind === kind)` — czyli o drugiej nigdy by się nie
  dowiedziała, a kreator skasowałby ją przy następnym zapisie bez słowa.
  W bazie wszystkie 24 sekcje miały `position = 0` (pomiar), więc kolumna była
  martwa od początku i jej jedynym skutkiem była ta pułapka. Zostaje
  `UNIQUE (course_id, kind)`, `position` znika ze schematu, z kontraktów,
  z panelu i z eksportu do WP. **Rozstrzygnięte świadomie PRZED pisaniem
  schematu MySQL**, żeby port nie odziedziczył konstrukcji, której sam
  prototyp nie używał. Powtórzony rodzaj odrzuca teraz kontrakt ze wskazaniem
  drugiej sekcji — do bazy nie dociera nawet konflikt unikalności, więc pomyłka
  w sekcjach nie wraca jako komunikat o „duplikacie sluga".
- **Audyt zapisuje tylko realne zmiany** (migracja 007). `course_changelog`
  miał 3068 wierszy / 4152 kB przy 908 kB rzeczywistej treści, bo zapis programu
  dotyka `UPDATE`-em KAŻDEJ lekcji — także nietkniętej — a trigger odkłada dwie
  kopie jej treści. `UPDATE`, po którym wiersz jest identyczny (z pominięciem
  `updated_at`, które i tak ustawia trigger), nie tworzy wpisu. Niezmienność
  dziennika, komplet triggerów i pełny stan przed/po zostają bez zmian.
  Odrzucony wariant „audyt bez kolumny `content`" chudłby mocniej, ale dziennik
  przestałby być śladem po UTRACIE treści — a to on był jedynym śladem przy
  najpoważniejszym znalezisku przeglądu.

### Dodane — trzy ochrony, których brak nie objawiał się błędem

- **Zapis kursu nie skasuje napisanej treści bez jawnej zgody.** Pełna podmiana
  programu jest cechą, ale jedynym, co chroniło 908 kB prozy, była pamięć panelu
  o odsyłaniu `id`: jedno żądanie `{"akcja":"zapisz","kurs":{"id":…,"modules":[]}}`
  czyściło kurs razem z materiałem i wracało z `ok: true`. Dyspozytor pyta teraz
  bazę, ile lekcji Z TREŚCIĄ wypadłoby z kursu, i bez `pozwol_skasowac_tresc`
  odmawia — zanim cokolwiek skasuje. Odpowiedź niesie liczbę, więc panel pyta raz
  i wprost, a świadome usunięcie lekcji z programu dalej jest możliwe. Usuwanie
  całego kursu bramki nie ma: tam intencja jest wyrażona wprost.
- **Brama nie przyjmuje tokenu z `.env.example`.** Dosłowna wartość z przykładu
  przechodziła, więc po `cp .env.example .env` hasłem do zapisu, publikacji
  i usuwania kursów zostawał łańcuch leżący w repozytorium. Odmowa dotyczy
  KONFIGURACJI, nie podanego tokenu: dopóki `KREATOR_TOKEN` jest pusty,
  przykładowy albo krótszy niż 24 znaki, nie wchodzi nikt — inaczej cisza
  wyglądałaby jak działający panel. Reguła w obu kanałach; tokeny w smoke'ach
  i CI wydłużone.
- **Prefetch przeglądarki dostaje CSP.** Matcher przepisany 1:1 z przewodnika
  Next pomijał żądania z nagłówkiem `purpose: prefetch` — a ten wysyła
  PRZEGLĄDARKA przy `<link rel="prefetch">` i regułach spekulacyjnych i dostaje
  wtedy pełny dokument HTML. Zmierzone na żywym serwerze przed naprawą:
  `/szkolenia` z tym nagłówkiem oddawało dokument z polityką `frame-ancestors
  'none'`, bez `script-src` i bez nonce'a. Pomijamy teraz wyłącznie prefetch
  ROUTERA (`next-router-prefetch`, który `next/link` wysyła razem z tamtym), więc
  zalecenie Nexta zostaje spełnione, a dokument dostaje pełną politykę.

### Naprawione

- **Limiter nie zdejmuje własnej blokady.** Sprzątanie dostawało okno BIEŻĄCEGO
  żądania i mierzyło nim wszystkie klucze, więc ruch wystrzałowy (okno 60 s)
  kasował blokady uwierzytelnień (okno 10 min) dziewięć minut przed terminem,
  który limiter sam podał w `Retry-After`. Druga połowa tej samej usterki:
  eksmisja przy przepełnieniu szła po kolejności WSTAWIENIA, więc świeżo nałożona
  blokada wypadała przed martwym kluczem sprzed godziny. Teraz każdy klucz jest
  mierzony własnym oknem, wypadają najdawniej aktywne, a klucz trzymający czynną
  blokadę — dopiero po wszystkich pozostałych.
- **`pre-commit`: obecność `.env.example` nie wyłącza już blokady `.env`.**
  Warunek pytał o skład commita zamiast o plik, więc dopisanie przykładu do tego
  samego commita otwierało drogę prawdziwemu `.env`. Doszły wzorce na NASZE
  sekrety (`KREATOR_TOKEN=`, hasło w `postgres://`), świadomie pomijające `docs/`
  i `.env.example` — hak, który krzyczy na cytat z manuala, kończy jako
  `--no-verify`. Sprawdzone sześcioma scenariuszami w osobnym repozytorium.

### Dokumentacja

- **[docs/PLAN.md](docs/PLAN.md) §2.4: sześć pozycji definicji ukończenia
  Pluginu 1 odhaczonych** (były zrobione, nigdy nie zaznaczone), z doprecyzowaniem
  przy audycie — „operacja" znaczy zmianę danych.
- **[KROK-3-KURSY.md](docs/plugin-1/KROK-3-KURSY.md): etapy 3 i 4 domknięte**
  (proza kompletna od 0.32.0, B7 zaliczona 2026-08-25).
- **Sufit 2 MB na ciało żądania zamknięty POMIAREM** — otwarta pozycja z kroku 2.
  Najdłuższa lekcja waży 21 790 znaków / 22 951 bajtów UTF-8 (mediana 11 848),
  a treść jedzie osobną akcją, więc 1307 kB całej prozy nigdy nie leci naraz.
  Sufit stoi ~90× nad największym realnym żądaniem — bez zmian.
- **Wymagania przeniesione do wtyczki** spisane w
  [MIGRACJA-DO-WP.md](docs/plugin-1/MIGRACJA-DO-WP.md): nośnik limitera, brak
  `position` przy sekcjach, pięć pozycji UX panelu (w tym **przenoszenie lekcji
  między modułami**, którego builder Tutora wymaga, a nasz dyspozytor nie umie).

### Domknięcie modułu

**Plugin 1 scalony na `main`** (PR #62), **gałąź domyślna wróciła na `main`**,
tag `v0.37.0` + release. `main` stał celowo 326 commitów w tyle, na 0.3.4 —
wg [PLAN.md §5](docs/PLAN.md) moduł wchodzi na gałąź główną dopiero po
ukończeniu i akceptacji całości. Trzy konflikty merge'a (README, WYTYCZNE,
`straznik-licencji`) rozwiązane wersją gałęzi modułu; drzewo scalenia
sprawdzone jako identyczne z `plugin-1-sklep-kursow`. Zmergowany też
**PR #59** (Dependabot: `lucide-react` 1.31 → 1.33, `@types/pg` 8.21 → 8.23.1)
— po pełnym `npm run check` lokalnie, bo CI stoi.

### Stan dowodów (CI stoi do 1 września — odtworzone lokalnie)

Strażnicy **29/29** (doszły 3 niezmienniki: własne okno klucza, siła tokenu
w obu kanałach, bramka nad kasowaniem treści), audyt mutacyjny **103 mutacje —
101 złapanych, 0 przeoczonych, 0 martwych** (2 pominięte warunkowo), testy
**83/83** (+6 regresji, każda sprawdzona mutacją), smoke'i **7/7**.
Audyt złapał po drodze DZIURĘ w moim własnym niezmienniku (wzorzec trafiał
w `limit.oknoMs` z innego miejsca pliku) i dwie MARTWE mutacje, które umarły
od zmiany liczby w README i od przepisania bramy tokenu.

## [0.36.0] — 2026-08-25

**Przegląd agent + krytyk przed bramką B7 i udowodniona droga danych do
WordPressa.** Właściciel zaliczył B7 (2026-08-25), ale polecił wykonać przegląd
mimo to — DIAGRAM.md wymaga go przy tej jednej bramce, a nigdy się nie odbył.
Decyzją tej samej rozmowy skrypt migracji Postgres → MySQL powstaje jeszcze
w Pluginie 1, po wcześniejszym poznaniu docelowego schematu.

### Naprawione — pięć znalezisk przeglądu, każde potwierdzone niezależnie

- **CICHA UTRATA TREŚCI: ten sam `id` modułu dwa razy w jednym zapisie.**
  Drugi przebieg pętli dyspozytora kasował lekcje zachowane przez pierwszy,
  transakcja się commitowała, a odpowiedź brzmiała `ok: true`. Sprawdzone
  uruchomieniowo na bazie testowej — lekcja z treścią znikała bez śladu.
  Kontrakt `KursWejscie` odrzuca teraz powtórzone identyfikatory modułów
  i lekcji; dwa testy regresji. To zabezpieczenie jest **potrzebne także we
  wtyczce WP**, bo builder Tutora wysyła całą strukturę kursu przy każdym zapisie.
- **Katalog obiecywał produkt, którego nie ma** — „Lekcje wideo krok po kroku"
  i „pliki źródłowe do pobrania" przy kursie TEKSTOWYM, w którym 0 z 73 lekcji
  ma jakikolwiek materiał. Ta sama klasa co BLAD-015, ale `straznik-obietnic`
  czytał wyłącznie seed, więc tekst zaszyty w kodzie widoku był poza jego
  zasięgiem. Strażnik obejmuje teraz 56 widoków z `app/` i `components/`.
- **Miniatura OpenGraph pokazywała „41 41 lekcji"** — `lekcje()` zwraca liczbę
  razem ze słowem, a szablon dokładał ją drugi raz. Obrazek idzie w świat przy
  każdym udostępnieniu linku; `smoke-seo` czyta JSON-LD, nie treść PNG.
- **Pula połączeń bez nasłuchiwacza `error`** — restart bazy albo reaper
  połączeń hostingu ubijał CAŁY proces Nexta, nie jedno żądanie.
- **Hak `pre-push` chronił `main`**, a praca od 0.18.0 idzie na gałąź domyślną
  `plugin-1-sklep-kursow`; bezpośredni push na nią przechodził bez słowa,
  omijając Weryfikację-PR bez śladu.

### Dodane — migracja danych do WordPressa (krok 4.2 planu)

- **`tools/eksport-wp.mjs`** — czyta bazę wyłącznie przez publiczne API modułu
  (więc kontrakty Zod walidują to, co wyjeżdża) i wykłada JSON.
- **`wordpress/import-kursy.php`** — idempotentny import przez WP-CLI, kluczem
  jest `_aai_zrodlo_uuid`, nie slug: slug kursu wolno zmienić w kreatorze,
  a moduły i lekcje slugów nie mają w ogóle.
- **[docs/plugin-1/MIGRACJA-DO-WP.md](docs/plugin-1/MIGRACJA-DO-WP.md)** —
  mapowanie pole po polu, wyprowadzone z ŻYWEJ instalacji (WP 7.0.1 + Tutor LMS
  4.0.6 + WooCommerce 11.0.1), z kluczami meta odczytanymi z KODU wtyczki.

**Dowód na czystej instalacji:** import 1 → 87 utworzonych (2 kursy, 12 modułów,
73 lekcje); importy 2 i 3 → 0/0/**87 bez zmian**; treść **73 z 73 zgodne CO DO
ZNAKU**. Struktura kurs → moduł → lekcja mapuje się 1:1; Tutor pokrywa cztery
z naszych dwunastu rodzajów sekcji, pozostałe osiem zostaje w naszej wtyczce —
to mierzalne uzasadnienie podziału odpowiedzialności z ETAP-WP.md.

### Dwie pułapki warte zapamiętania

- **WordPress zjada backslashe w meta** (`update_post_meta` puszcza wartość przez
  `wp_unslash`). Bez `wp_slash` ginie każdy `\` — czyli ścieżki `C:\Users`
  i sekwencje `\n` w kursie o Gicie. **Wykryte wyłącznie testem idempotencji:**
  pierwszy import wyglądał na w pełni udany.
- **`LENGTH()` w MySQL liczy bajty, a `.length` w JS jednostki UTF-16.** Pierwsze
  porównanie sum pokazało 977 625 wobec 929 838 i wyglądało jak utrata danych; po
  `CHAR_LENGTH()` została różnica 7 znaków — siedem emoji spoza BMP. **Sumy
  porównuj ostrożnie, treść porównuj znak w znak.**

### Zostawione do decyzji właściciela

Sześć pozycji z przeglądu, żadna nie ruszona z własnej inicjatywy — wszystkie
z uzasadnieniem w **[docs/plugin-1/PRZEGLAD-B7.md](docs/plugin-1/PRZEGLAD-B7.md)**:
sprzątanie limitera zdejmujące aktywną blokadę uwierzytelnień, brak kontroli siły
`KREATOR_TOKEN`, `UNIQUE` sekcji niepasujący do sposobu ich czytania (**do
rozstrzygnięcia PRZED schematem MySQL**), brak drugiej warstwy przy pełnej
podmianie programu, retencja dziennika audytu (4152 kB przy 908 kB treści)
i siedem drobiazgów UX kreatora.

### Co przegląd potwierdził jako zdrowe

Parametryzacja SQL pełna, granica modułu trzyma, kolejność „dostęp przed
kształtem" działa, treść lekcji nie ma jak wyciec, nonce CSP naprawdę
jednorazowy, licznika chybionych prób nie da się wyzerować śmieciowym żądaniem,
kontrakty zgodne ze schematem SQL, panel pokrywa kontrakt w 100%.

## [0.35.0] — 2026-08-24

**Higiena repozytorium — pełny audyt od A do Z.** Polecenie właściciela:
sprawdzić, czy repo odpowiada rzeczywistemu stanowi projektu, z repo strony
głównej (`automatic-ai`) jako przykładem dobrych praktyk, ale bez kopiowania
bezrefleksyjnego. Baseline przed pracą: strażnicy 28/28, testy 75/75, audyt
mutacyjny 90/90, `npm audit` 0 podatności, skan wzorców sekretów po historii
czysty. Nie znalazłem ani jednej pozycji CRITICAL — problemem nie był
bałagan, tylko **starzenie się liczb w dokumentacji** i odłożone sprzątanie
gałęzi.

### Naprawione — dokumenty, które kłamały o stanie

- **README podawało trzy nieprawdy naraz**: „62 testy" przy stanie 75,
  audyt mutacyjny „na 71 sposobów" przy stanie 90 i kotwicę
  `#szybki-start-po-sklonowaniu`, której nagłówek dawno nie ma. Ta ostatnia
  przeżyła, bo `straznik-readme` sprawdzał kotwice **wyłącznie w spisie
  treści** — link w prozie był poza jego zasięgiem.
- **`tresc-kursow/POSTEP.md`** wskazywał „← NASTĘPNY KROK: domknięcie
  działu [D7]" i „golden treści — jeszcze nierobiony", choć PR #22, tag
  `v0.21.0` i `goldeny/d7-tresc.json` istnieją od 2026-08-18. Plik jest
  wskazywany z CLAUDE.md jako licznik stanu, więc mylił każdą nową sesję.
- **`docs/plugin-1/PR-D6.md` i `PR-D7.md`** instruowały „po powrocie
  GitHuba uruchom `gh pr create`" — oba PR-y (#18, #22) zmergowane.
  Kroniki zostały nietknięte, doszły adnotacje historyczne.
- **Opis repozytorium na GitHubie** był sprzed rebrandingu (v0.17.0):
  „dla matthewplugins.pl — sklep z kursami/ebookami".
- **`CONTRIBUTING.md` przeczył praktyce**: wymagał prefiksów
  `feat:`/`fix:`, a repo od 0.22.0 pisze tematy opisujące SKUTEK. Dokument
  opisuje teraz stan faktyczny; prefiksy zostają dozwolone dla drobnicy.
- 5 ostrzeżeń ESLint (nieużywane importy i parametry w `tools/`).

### Dodane — kontrole i konfiguracja

- **`straznik-podgladu-kursow`** (29. strażnik) — sprawdza WYGENEROWANY
  widok treści kursu, czyli to, co klient dostaje po zakupie: martwe
  odsyłacze, `width`/`height` na każdym z 148 obrazów, podwójną ucieczkę
  w podpisach, klikalność spis → lekcja → spis, komplet stron i zrzutów
  wobec `tresc-kursow/`. Powstał, bo kontrole tej klasy z redesignu 0.34.0
  żyły w katalogu roboczym sesji i przepadły — trzy usterki, które wtedy
  znalazły (strona wejściowa bez fontu, 7 niewidocznych zrzutów, 29 podpisów
  z `&quot;`), dawały HTML poprawny SKŁADNIOWO, więc żadna istniejąca
  bramka ich nie widziała. Wymaga wygenerowanego podglądu; bez niego mówi
  wprost, że pominął, zamiast kłamać zielenią.
- **`npm run check`** — jedna bramka: strażnicy → lint → tsc → testy →
  build → siedem smoke'ów, w kolejności z CI. Plus `npm run smoke` osobno.
  Praktyka z repo strony głównej; u nas ta sekwencja istniała dotąd tylko
  w CI i w prozie README.
- **`.gitattributes`** — końce linii przestają zależeć od `core.autocrlf`
  każdego klonu; skrypty i haki zawsze LF (CRLF w shebangu = „bad
  interpreter"), 148 zrzutów `.webp` i fonty `.woff2` jawnie binarne.
  Renormalizacja sprawdzona przed commitem: zero zmian w drzewie.
- **`.editorconfig`**, **`.nvmrc`** i **`engines: node >=24`** — wymaganie
  z README mówią teraz także narzędzia.
- **`.github/PULL_REQUEST_TEMPLATE.md`** i **`.github/dependabot.yml`** —
  szablon PR z checklistą wskazującą realną bramkę; Dependabot z sufitami
  otwartych PR-ów i grupowaniem drobnicy, bo jego PR-y odpalają CI, którego
  limit minut organizacji stoi do 1 września. Blokady majorów mają warunek
  wyjścia zamiast ciszy.
- **Pole `wymaga` w audycie mutacyjnym** — mutacja strażnika WARUNKOWEGO
  jest pomijana przy braku materiału, zamiast raportować fałszywe
  „PRZEPUŚCIŁ mutację".

### Wycofane własne wnioski (audyt falsyfikowany jak kod)

- „Sześć plików w `modules/`/`lib/` nikt nie importuje" — pierwszy skan
  pomijał testy i narzędzia; wszystkie sześć jest używanych. Martwego kodu
  w repo nie ma.
- „`tools/podglad-kursow/styl.css` może być martwy po redesignie" — czyta
  go generator przez `style.mjs`. Żywy.
- „33 podpisy zrzutów mają podwójną ucieczkę" — pierwsza wersja nowego
  strażnika brała zwykłą encję `&quot;` za usterkę. Sprawdzenie źródła
  pokazało konwencję całego repo (1960 par `„…"` wobec zera `„…”`).
  Kontrola zawężona do `&amp;X;`, komentarz w kodzie ostrzega przed nawrotem.
- Pierwsza wersja wzorca „na NN sposobów" w `straznik-readme` była MARTWA
  (fraza łamie się w blockquote) — złapana testem negatywnym przed commitem.

### Drugi audyt złapał dwie usterki w pracy tego kroku

Powtórny przebieg po wszystkich zmianach (zasada: nie zakładaj, że skoro
zmieniłeś, to naprawiłeś) wykrył dwie rzeczy w kontrolach dopisanych wyżej:

- **Mutacja przypięta do konkretnej liczby umarła**, gdy README zmieniło
  93 → 95 sposobów. To ta sama klasa, co regresja z 0.28.0: wzorzec ma
  celować w ZACHOWANIE, nie w wartość. Obie mutacje liczbowe biorą teraz
  liczbę z tekstu i podbijają ją same.
- **Wzorzec `test\w*` w `straznik-readme` NIGDY nie pasował do formy
  „testów"** — `\w` w JavaScripcie nie obejmuje polskich znaków, więc
  kontrola milczała na prawdziwej treści README i tylko wyglądała na
  działającą. Maskowała to stara mutacja, która wpisywała formę „testy"
  (bez „ó"). Po zmianie mutacji na formę z ogonkiem audyt od razu
  zaraportował „strażnik PRZEPUŚCIŁ". Wzorce czytają teraz `\p{L}` z flagą
  `u`; sprawdzone testem negatywnym w obie strony.

Wniosek do zapamiętania: **mutacja, która maskuje ślepotę strażnika, jest
groźniejsza niż jej brak** — zielony audyt utwierdzał w tym, że kontrola
działa.

### Świadomie NIE zrobione

- **`"type": "module"` w package.json** — uciszyłoby ostrzeżenia
  `MODULE_TYPELESS` przy każdym uruchomieniu testów, ale zmienia sposób
  ładowania każdego pliku w projekcie. To nie jest zmiana do commita
  o higienie.
- **`version` w package.json** — wersja żyje w top CHANGELOG pod
  `straznik-wersji`; trzecie miejsce to trzecia okazja do rozjazdu.
- **CODE_OF_CONDUCT, CODEOWNERS, szablony zgłoszeń** z repo strony głównej —
  repozytorium jest prywatne i jednoosobowe, w historii ma 0 issues,
  a CODEOWNERS bez ochrony gałęzi (niedostępnej w planie Free) niczego nie
  wymusza. Zasady współpracy z tamtego kodeksu już obowiązują u nas przez
  `docs/WYTYCZNE.md`.
- **SECURITY.md** — `docs/security-checklist.md` robi to samo lepiej
  (pięć stanów, dowód przy każdym wierszu). Wróci przy publicznym repo.

### Sprzątnięte

- **Gałęzie po zmergowanych PR-ach** (decyzja właściciela 2026-08-24,
  wcześniej niż zakładał krok 4 planu): każda z nich była headem jednego
  z 57 zmergowanych PR-ów, sprawdzone `gh pr list` co do sztuki.
  Gałęzie `bak/*` zostają — to migawki procedury napraw (WYTYCZNE §1).

## [0.34.0] — 2026-08-24

**Redesign widoku treści kursu — to, co klient dostaje PO zakupie.**
Polecenie właściciela: doprowadzić widok kursu do poziomu strony sprzedażowej
`/szkolenia/[slug]`, bez dotykania treści lekcji. Decyzje właściciela podjęte
na starcie: wygląd żyje w **generatorze HTML** (nie w trasie Nexta — produkt
idzie na Tutor LMS, gdzie portuje się CSS i szablony, a nie komponenty
Reacta), nawigacja to **pływająca pigułka jak na stronie sprzedażowej**
(bez stałego panelu bocznego), a postęp to **pozycja w kursie plus pamięć
tej przeglądarki**.

### Dlaczego to nie było tylko upiększanie

Strona sprzedażowa pokazuje w sekcji „Tak wygląda kurs od środka" mockup
`OknoKursu` z modułami, statusami lekcji i paskami postępu, a pod nim
obiecuje: „zawsze wiesz, gdzie jesteś", „widzisz swój postęp lekcja po
lekcji", „to samo zobaczysz po zalogowaniu". Widok kursu nie miał **żadnej**
z tych trzech rzeczy — czyli obietnica ze strony sprzedażowej była
niedotrzymana, ta sama klasa usterki co BLAD-015 z audytu w 0.33.0.

### Dodane

- **Moduł `tools/podglad-kursow/`** — wygląd wyjęty z generatora do osobnych
  plików: `style.mjs` (tokeny 1:1 z `app/globals.css`), `szablony.mjs`,
  `tresc.mjs`, `skrypt.mjs`, `ikony.mjs`, `wymiary.mjs`. Generator odpowiada
  już tylko za przebieg.
- **Pływająca pigułka menu** wzorowana na `components/kurs/PasekKursu.tsx`:
  sygnet marki, rozwijany **program całego kursu** z zaznaczoną bieżącą
  lekcją, spis sekcji bieżącej lekcji, przycisk „Następna" i nitka postępu
  czytania. Oba menu stoją na `<details>`, więc działają bez JavaScriptu —
  to jedyna nawigacja po 73 lekcjach i nie ma prawa zależeć od skryptu.
- **Sekcje prozy dostały tożsamość.** Szkielet powtarza się w 73 lekcjach na
  73 („Czego się nauczysz", „Zrób to teraz (X minut)", „Zapamiętaj",
  „Co dalej") i w części z nich („Prompty z tej lekcji" 67, „Gdy coś nie
  działa" 46). Do tej wersji wszystkie renderowały się jako identyczny `<h2>`;
  teraz każda ma własne pudełko: cele z ptaszkami, ćwiczenie z odznaką czasu
  i numerowanymi krokami, biblioteka promptów z przyciskiem „Kopiuj",
  stonowany panel diagnostyczny, podsumowanie i most do następnej lekcji.
  **Rozpoznanie działa wyłącznie po nagłówkach, które w prozie już są** —
  ani jedno słowo treści nie zostało zmienione.
- **Żywe tło** strony kursu: siatka blueprint, dryfujące bloby, poświata za
  kursorem (jedna pętla rAF, tylko `transform`) i ziarno — wszystko
  przeniesione z `TloKursu`/`HeroKursu`, całość wygaszana przez
  `prefers-reduced-motion`.
- **Postęp czytania**: „lekcja 7 z 41" liczona z programu (prawdziwa zawsze),
  przycisk „Oznacz jako przeczytaną", ptaszki w spisie programu i pasek
  ukończenia kursu — stan w `localStorage`, **z podpisem wprost, że to pamięć
  tej przeglądarki, a nie konto**.
- **Strona kursu** przebudowana na akordeony modułów ze znacznikami lekcji
  (wzór: `OknoKursu`), kafelki liczbowe i pasek ukończenia; strona wejściowa
  na równe karty kursów.

### Naprawione

- **Strona wejściowa podglądu nigdy nie ładowała Geista.** `@font-face`
  miał wpisane na sztywno `../zasoby/`, co z `index.html` w korzeniu celowało
  poza katalog wyjściowy — przeglądarka podstawiała font systemowy. Arkusz
  jest teraz osobnym plikiem, więc ścieżki fontów liczą się względem niego.
- **Siedem zrzutów nie wyświetlało się w ogóle** (moduł 4 Kursu 2). Dwa
  obrazy zapisane w markdownie w sąsiednich wierszach marked skleja w jeden
  akapit, a dopasowanie obsługiwało tylko obraz sam w akapicie — takie pary
  zostawały surowym `<img src="zrzuty/…">` ze ścieżką ze źródła, której
  w wyjściu nie ma. Błąd istniał od powstania narzędzia.
- **29 podpisów zrzutów pokazywało dosłowne `&quot;`** zamiast cudzysłowu —
  tekst uciekany dwa razy (raz przez marked, raz przez generator).
- **Nagłówki sekcji pokazywały surowe odwrócone apostrofy** zamiast składać
  kod czcionką maszynową (21 nagłówków, np. „Plik \`SKILL.md\` — dwie
  części"); tytuł idzie teraz przez markdown w trybie liniowym.

### Wydajność

- Arkusz (43,7 kB) i skrypt (7,8 kB) wyciągnięte do `zasoby/` i wspólne dla
  76 stron — wcześniej szły wklejone do każdej z osobna. Strona lekcji: **77 kB
  → 30 kB**, a arkusz i skrypt pobierają się raz.
- **Wymiary każdego z 148 zrzutów czytane z nagłówka pliku WebP** i wpisywane
  w `width`/`height` — przeglądarka rezerwuje miejsce przed pobraniem obrazu
  (CLS; projekt trzyma tę metrykę na zerze od 0.25.0). Kontrola: 0 obrazów
  bez wymiarów.
- Zero nowych zależności: ikony to wklejony SVG (`lucide-react` to komponenty
  Reacta, w statycznym HTML-u nie istnieją), animacje wyłącznie na
  `transform`/`opacity`, nasłuchy scrolla pasywne z odczytem geometrii w rAF.
- Żaden element nie ma stanu ukrytego zależnego od JavaScriptu — wejście kart
  robi animacja CSS. Sprawdzone przebiegiem z **usuniętym** `widok.js`: treść,
  nawigacja i karty działają.

### Self-check przed wdrożeniem

Redesign przeszedł osobny przebieg kontrolny (polecenie właściciela: sprawdzić
własną pracę tak, jakby robił to drugi programista). Znalezione i naprawione:

- **Martwy kod na wszystkich 76 stronach.** Inline `<script>` w `<head>`
  dokładał klasę `js`, na której po zmianach nie wisiała już ani jedna reguła.
  Razem z nim wyleciał obserwator wejść elementów w widok: wejście miały
  **dwie karty na stronie wejściowej, obie nad zgięciem**, więc
  `IntersectionObserver` odpalał je natychmiast po wczytaniu i nie robił nic,
  czego nie robi animacja CSS — a wymagał stanu ukrytego i bramki na wypadek
  niewczytania skryptu. Zastąpione animacją w arkuszu: **skrypt 8460 → 7768 B**
  i zero ryzyka, że treść zostanie niewidoczna.
- **Arkusz przeniesiony z literału JavaScriptu do prawdziwego `styl.css`.**
  Pojedynczy odwrócony apostrof w komentarzu CSS zamykał literał i przerywał
  generator w losowym miejscu pliku — zdarzyło się to **cztery razy pod rząd**,
  a ostrzeżenie w nagłówku nie pomogło. Usunięta przyczyna, nie objaw; przy
  okazji arkusz przenosi się do szablonów Tutora przez skopiowanie pliku.
- **Ikona kopiowania była zdefiniowana dwa razy** (w `ikony.mjs` i przepisana
  ręcznie w skrypcie). Jedno źródło prawdy.
- **Cztery deklaracje `hover-lift` w trzech miejscach** ściągnięte do jednej
  klasy `.unos` — odpowiednika tej ze strony sprzedażowej.
- **Tekst niosący treść był za mały:** odznaka czasu ćwiczenia 9,6 px, nazwa
  modułu w rozwijanym programie 8,8 px, nagłówek kolumny tabeli 9,6 px.
  Podniesione; mikroetykiety ozdobne zostają w skali z `app/globals.css`.
- **Pozycja lekcji w rozwijanym programie miała 34 px wysokości** — pod palcem
  za mało. Na ekranach dotykowych rośnie do 44 px.
- **Brakowało łącza pomijającego nawigację** i obsługi **wymuszonych kolorów
  systemu** — obie rzeczy strona sprzedażowa ma, widok kursu nie miał.
- **Akordeon modułu otwierał się skokiem**, a `details.panel` na stronie
  sprzedażowej płynnie. Wyrównane (`::details-content`, progressive
  enhancement).
- **`textContent` sklejał sąsiadujące bloki** („01Czym właściwie jest
  ClaudeClaude to platforma…", „Zrób to teraz10 minut"). Wizualnie bez różnicy,
  ale czytniki ekranu i wyszukiwarka w przeglądarce dostawały zlepki.
- **Kod łamany w wąskiej kolumnie** dostawał obciętą ramkę na obu połówkach
  (`box-decoration-break: clone`), a kolor tekstu kodu powtarzał się dwa razy
  jako literał — teraz token.

**Czego kontrola NIE potwierdziła** (cztery fałszywe alarmy z moich własnych
testów, wszystkie sprawdzone do końca, zanim uznałem je za nieistotne): smoke'i
`d4`/`d5` padały, bo działający `next dev` pisze do tego samego `.next`, co
produkcyjny build — po czystym buildzie **7/7 zielonych**; „menu się nie
otwiera" brało się z dwóch kliknięć pod rząd w teście; „11 nieklikalnych
pozycji" to pozycje z ZAMKNIĘTEGO drugiego menu; „kontrast 1,05:1 na H1" to
nagłówek z gradientem (`color: transparent`), realnie ok. 8,4:1.

**Treść lekcji: 73 z 73 zgodne co do słowa** ze źródłem w `tresc-kursow/`
(porównanie automatyczne, po normalizacji składni markdowna). Jedyne różnice są
świadome i widoczne: numer sekcji `1.` renderuje się jako `01` w osobnym
polu, a czas ćwiczenia z nawiasu — jako odznaka.

**Stan dowodów po self-checku:** strażnicy 28/28, testy 75/75, audyt mutacyjny
90/90, **smoke'i aplikacji 7/7**, eslint czysty. Kontrola 76 stron: 0 martwych
odsyłaczy, 0 brakujących zasobów, 0 obrazów bez wymiarów, 0 błędów konsoli.
**CLS = 0 w 12 na 12 zmierzonych widoków** (3 szerokości × 4 strony, po
przewinięciu całej strony, żeby doładowały się obrazy). Wszystkie 41 pozycji
lekcji klikalne — sprawdzone trafieniem w punkt, nie samym istnieniem
odsyłacza. Stany kursu (pusty / rozpoczęty / ukończony / uszkodzona pamięć
przeglądarki) zachowują się poprawnie.

### Dowody

Strażnicy **28/28**, testy **75/75**, audyt mutacyjny **90/90**.
Kontrola całego wyjścia (76 stron): 0 martwych odsyłaczy, 0 brakujących
zasobów, 0 obrazów bez wymiarów, 0 błędów konsoli, brak przewijania poziomego
przy 390 / 820 / 1440 px — kontrola sprawdzona **testem negatywnym**
(podłożona nieistniejąca strona zapala 404). Widok zweryfikowany także bez
JavaScriptu i przez `file://`.

## [0.33.0] — 2026-08-24

**Audyt obu kursów i naprawa jego znalezisk.** Audyt (zakres ustalony przez
właściciela: tropy z `tresc-kursow/AUDYT-KONCOWY.md` + prawda o produkcie +
domknięcie miejsc na zrzuty) potwierdził, że treść jest zdrowa — 73 mosty
między lekcjami trzymają się co do zdania, powtórzeń nie ma, stan repozytorium
czytelnika jest spójny, podsumowania obu kursów przypisują tematy modułom
poprawnie — a rozjazd siedział **poza prozą**: w tekstach sprzedażowych,
w seedzie i w trzech narzędziach.

### Naprawione

- **Strony sprzedażowe obu kursów obiecywały inny produkt (BLAD-015).**
  Sekcje pochodziły z roboczych seedów sprzed Działu 7 i nigdy nie nadążyły
  za dwiema zmianami programu. Publiczny podgląd obiecywał „7 modułów wideo
  (31 lekcji)” przy 6 modułach i 41 lekcjach, „6 modułów wideo (26 lekcji)”
  przy 32 lekcjach Kursu 2, „moduł ratunkowy: restore, revert, reset” (te trzy
  komendy **nie padają w Kursie 2 ani razu**), „kilka godzin wideo”
  i „nagrywamy poprawki” (kurs jest TEKSTOWY — decyzja 2026-08-19), „Projekty
  i artefakty” w Kursie 1 (kurs ich nie uczy), „szablony do pobrania w plikach”
  (nie ma takich plików) oraz FAQ Kursu 2 z **odwrotną** kolejnością nauki
  („najpierw Git lokalnie” — kurs zaczyna w przeglądarce). Wszystko przepisane
  na stan faktyczny: liczby z bazy, obietnice zastąpione tym, co kurs realnie
  dowozi (ćwiczenie w każdej lekcji, prompty w 35 lekcjach, 10 lekcji z sekcją
  „Pytania do wykonawcy”, 88 zrzutów z prawdziwego GitHuba, tabela zgodności
  ze źródłem pod każdą lekcją). Sekcje wgrane do bazy dyspozytorem **bez
  klucza `modules`**, więc program i treść 73 lekcji zostały nietknięte.
- **Program Kursu 1 w seedzie był sprzed Działu 7** — to z niego wzięły się
  obietnice o „czatach, projektach i artefaktach”. Odtworzony z bazy, tak jak
  program Kursu 2 (seed ma być lustrem bazy, inaczej odtworzenie z niego
  rozjeżdża prozę z lekcjami).
- **Seed wykonywał się przy samym imporcie**, a zaczyna od kasowania kursów —
  czyli import pliku skasowałby treść 73 lekcji. Dołożona bramka
  main-module i eksport danych (`KURSY_SEED`).
- **Trzy narzędzia brały adres URL za ścieżkę systemową (BLAD-014).**
  W katalogu ze spacją w nazwie `import.meta.url` koduje ją jako `%20`, więc:
  `tools/zrzuty/manifest.mjs` — jedyne źródło prawdy o stanie przelotu zrzutów
  — **milczał i kończył się kodem 0**; `tools/zrzuty/test-asercji.mjs` padał
  na komplecie 15 testów; `tools/zrzuty/kolejka.mjs` podawał spawnowi ścieżkę
  z `%20`. Wszystkie trzy na `fileURLToPath`.
- **Bramka prywatności zrzutów przepuszczała dane rozbite na dwa elementy
  (BLAD-016).** Podmiana danych właściciela chodzi po węzłach tekstowych, więc
  adres w dwóch `<span>`-ach dostawał ją tylko w połowie, a na ekranie zostawał
  czytelny fragment. Test negatywny na to istniał od 2026-08-23, ale **był
  martwy**, bo cały plik testów padał na BLAD-014. Bramka dostaje teraz listę
  zastępników i odrzuca zrzut, gdy zastępnik przykleił się do innych znaków
  słowa. Testy asercji: 15/15, kod wyjścia sprawdzony bez potoku.
- **Obietnica z lekcji 3.1 Kursu 2 była niedowieziona:** zapowiadała, że moduł
  o bezpieczeństwie nauczy włączać *sześć* rzeczy, a moduł 6 dowozi pięć —
  prywatnego zgłaszania podatności nie ma w nim ani razu. Zapowiedź zawężona
  do stanu faktycznego (bez dopisywania treści, której kurs nie ma).
- Drobne: cudzysłów zamykający `”` w dwóch plikach i jedno `«…»` poza
  cytatem zagnieżdżonym → jednolite `„…"` w całej prozie; angielski zastępnik
  `BRANCH-NAME` w bloku kodu lekcji 4.8 → `NAZWA-GAŁĘZI` (kurs ma 93 polskie
  zastępniki i objaśnia je wprost).

### Zmienione

- **Powtarzana formuła zastrzeżenia źródłowego zdjęta z 20 lekcji Kursu 2.**
  Była jedynym powtórzeniem między lekcjami w całym materiale (i jedynym
  trafieniem w pomiarze podobieństwa), stała w 20 z 32 lekcji Kursu 2 i w 0
  z 41 lekcji Kursu 1. Gwarancję, którą niosła, daje tabela „Zgodność ze
  źródłem” pod KAŻDĄ z 73 lekcji — z dokładnością do miejsca w dokumentacji.
  Podobieństwo najbliższej pary spadło z 2,75% do 2,03%.
- **Dwanaście otwartych znaczników `<!-- ZRZUT: … -->` usuniętych** z prozy
  Kursu 1 (przelot zamknięty decyzją właściciela 2026-08-23). Sprawdzone
  miejsce po miejscu: żadne zdanie nie odsyłało do brakującego obrazu.
  Manifest liczy teraz 148 miejsc i 148 zrobionych.
- Mutacja `straznik-prozy` o niedomkniętym znaczniku zrzutu **wstawia** teraz
  znacznik, zamiast psuć istniejący — po usunięciu ostatnich dwunastu umarła
  po raz drugi (pierwszy raz 2026-08-23). Audyt mutacyjny złapał to od razu.

- **README kłamał w pięciu miejscach o własnym projekcie.** Zrzut katalogu
  w nagłówku linkował do `http://localhost:3001/szkolenia`, więc czytelnik na
  GitHubie trafiał we własny, nieuruchomiony serwer (publiczny adres podglądu
  istniał w repo od 0.23.0, tyle że w tabeli niżej). Sam zrzut był z 18 sierpnia
  i reklamował „13 MODUŁÓW · 57 LEKCJI · 11 GODZIN" przy realnych 12 · 73 · 20 —
  odtworzony z produkcyjnego `next start`, z asercją na liczby przed zapisem
  pliku. Do tego: „treść kursów jeszcze ROBOCZA" przy podglądzie na żywo,
  uzasadnienie `noindex` oparte na roboczej treści, „62 testy" przy 75 realnych
  i opis `npm run db1:seed`, który nie ostrzegał, że komenda NAJPIERW KASUJE
  kursy — czyli razem z prozą 73 lekcji.
- **Podgląd publiczny przebudowany** (zgoda właściciela 2026-08-24): żywy adres
  serwuje 0.33.0, kontrola po deployu daje **0 trafień** na wzorce nieprawd na
  obu stronach sprzedażowych, a katalog pokazuje 2 · 12 · 73 · 20.

### Dodane

- `straznik-obietnic` — sprzedaż nie ma prawa obiecywać czegoś spoza produktu:
  porównuje liczbę modułów, lekcji, minut i zrzutów deklarowaną w sekcjach
  z programem kursu i z prozą, zakazuje twierdzeń o wideo i sprawdza obietnice
  podzbioru („prompty w N lekcjach”). 3 mutacje, 5 testów negatywnych.
- `straznik-sciezek` — łapie klasę BLAD-014 (sklejka `file://` z `argv[1]`
  i `.pathname` z URL-a pliku) w całym repo. 2 mutacje, test negatywny.
- Wpisy **BLAD-014**, **BLAD-015** i **BLAD-016** w rejestrze znanych błędów.

### Dowody (CI stoi do 1 września — limit minut Actions)

Strażnicy **28/28**, audyt mutacyjny **90/90 złapanych, 0 przeoczonych,
0 martwych**, testy **75/75**, smoke'i D4/D5/D6/lekcje/SEO/CSP **6/6**
(kody wyjścia bez potoku), testy asercji zrzutów **15/15**, pliki prozy
zgodne z bazą **73/73**. Sweep regresyjny przed/po: zmieniły się dokładnie
34 lekcje, **73 mosty identyczne** po odjęciu dwóch świadomych zmian,
167 cytatów źródłowych bez zmian, 148 obrazów bez zmian, 0 martwych
odwołań, tabele zgodności bez zmian (1440 + 1011 wierszy).

## [0.32.0] — 2026-08-23

Krok 3 domknięty w warstwie treści: **oba kursy mają komplet prozy
w narzędziu i przelot zrzutów zamknięty**. Kurs 1: 41/41 lekcji, 566 221
znaków dla klienta; Kurs 2: 32/32 lekcje po cięciu mocnym, 367 412 znaków
— wszystko wgrane kreatorem (wgrywarka HTTP) i zweryfikowane dwustronnie
per lekcja (pliki ↔ SQL, zgodność co do znaku; różnica 7 znaków w sumach
to znaki spoza BMP — Postgres liczy znaki, JS jednostki UTF-16). Zrzuty:
**148 z 160 miejsc**, wszystkie pod bramkami rigu; 12 miejsc otwartych
DECYZJĄ właściciela (niżej).

### Dodane

- **proza modułów 2–6 Kursu 2** (26 lekcji ponad kalibracyjny moduł 1;
  dorobek obu czatów scalony na jedną gałąź `feat/tresc-k2-modul-2-3`)
  wraz z briefami modułów i mostami między lekcjami;
- **148 zrzutów ekranu w prozie obu kursów** (`tresc-kursow/**/zrzuty/*.webp`,
  ~40–90 kB każdy): Kurs 2 komplet 88/88, Kurs 1 60/72 — GitHub za
  logowaniem, panele Claude Code ze scenariuszy PTY, dokumentacja,
  rozmowy prowadzone na koncie właściciela (za jego zgodą, prompty
  DOSŁOWNIE z sekcji „Prompty z tej lekcji");
- **rig zrzutów w repo** (`tools/zrzuty/`): specyfikacje JSON z obowiązkową
  maszynową asercją treści (`wymagaTekstu` — fragmenty Z PODPISU, nigdy
  z tego, co wyszło; narzędzie ODMAWIA zapisu obrazu bez nich), bramka
  prywatności (`sprawdzPrywatnosc` + strukturalna kontrola tytułów rozmów
  na claude.ai), bramka `wymagaOdpowiedzi` (w kadrze MUSI leżeć odpowiedź
  modelu), akcje prowadzenia rozmowy (`wpiszWiersze` przez Shift+Enter,
  `czekajNaKoniec` po stabilności tekstu, `wgrajPlik`), rig TUI
  (scenariusze PTY + znaczniki + render xterm) i `wepnij.mjs` wpinający
  obrazy PO PODPISIE, nie po numerze wiersza;
- strażnicy: `straznik-asercji` (specyfikacja bez asercji = czerwone CI)
  i `straznik-odsylaczy-kursu`; razem 26, audyt mutacyjny 85/85;
- rejestr znalezisk przelotu (`tresc-kursow/ZNALEZISKA-PRZELOTU-ZRZUTOW.md`,
  35 pozycji): podpisy wyprzedzające ekran poprawiane W PROZIE, nigdy
  w asercji.

### Zmienione

- pięć podpisów zrzutów w Kursie 1 przestało obiecywać „dwa okna obok
  siebie" — claude.ai nie ma widoku dzielonego, a składanie ekranów
  z fragmentów łamie zasadę „zero zmyślania"; te same porównania
  pokazuje jedna rozmowa z dwoma promptami (znalezisko 31);
- lekcja 4.3 Kursu 1: scenariusz blokady `.env` prosi wprost o narzędzie
  Edit, bo przy zwykłej prośbie Claude zmienia plik komendą powłoki
  i hook `Edit|Write` nie ma czego blokować — dokładnie zawężenie, które
  ta lekcja podaje (znalezisko 33).

### Decyzje właściciela (2026-08-23)

- **przelot zrzutów ZAMKNIĘTY na 148/160 — do robienia zrzutów nie
  wracamy.** Dziewięć miejsc odrzucone z powodu kosztów (klucz API
  i doładowanie Konsoli: 5 × `api`, 2 × Konsola, strumieniowanie 5.5;
  aplikacja Claude na repozytorium demonstracyjnym dla `@claude` 4.6),
  trzy zablokował Cloudflare (2.4, 5.6, 5.8 — wyzwanie dla sterowanej
  przeglądarki nie mija; ręczne okno przechodzi). Te 12 miejsc
  rozstrzygamy przy domykaniu kursu poprawką podpisu i prozy albo
  usunięciem znacznika;
- **rozmowy demonstracyjne z konta claude.ai skasować, gdy wróci dostęp**
  — po potwierdzeniu listy z właścicielem;
- rozmowy na koncie właściciela prowadził agent (zgoda z początku fazy);
  klucz API NIE powstał, konto bez ruchu — widać to na zrzutach Konsoli.

## [0.31.0] — 2026-08-22

Krok 3, etap 3 w części Kursu 1: **komplet prozy w narzędziu — 41 z 41
lekcji, 565 394 znaki dla klienta, sześć modułów, wszystko w bazie drogą
kreatora i w repozytorium na jednej gałęzi.** Kurs 2 (0 z 50) czeka na
cięcie programu — decyzje niżej.

### Dodane

- proza modułu 3 „Claude Code: start i codzienna praca" (8 lekcji,
  148 086 znaków; PR #51) i modułu 5 „Claude przez API" (8 lekcji,
  93 079 znaków, ton „mapa dla decydenta"; PR #52) dociągnięte na trunk
  treści — dotąd żyły w worktree'ach swoich czatów, moduł 5 bez ani
  jednej kopii poza dyskiem;
- tabela postępu prozy w POSTEP.md pokazuje stan po scaleniu
  (41/91 lekcji projektu, Kurs 1 KOMPLETNY) zamiast stanu sprzed
  konsolidacji.

### Decyzje właściciela (2026-08-21/22)

- **17 lekcji bez bramki cytatów zostaje** (3.1–3.6, 5.1–5.3, 5.5–5.7,
  6.1–6.5): usterki tej klasy dotykają wyłącznie treści lekcji — nie
  systemu i nie strony sprzedażowej (strona nigdy nie renderuje treści
  lekcji; pilnuje `straznik-tresci-lekcji`);
- **program Kursu 2: cięcie MOCNE (~33–38 lekcji), ostateczna głębokość
  po pomiarze** — kalibracyjny moduł 1 K2 zmierzy realny koszt lekcji
  (źródła K2 są ~10× cieńsze na lekcję niż w K1, więc koszty K1 mogą
  być zawyżonym prognostykiem);
- **wejście autora**: wyciąg źródeł (−38%) + podział sekcji w briefie;
  BEZ cięcia do samych fragmentów (ochrona przed zgubionymi
  zawężeniami);
- **eksperyment grupowania w kalibracji**: jeden autor pisze dwie
  lekcje dzielące to samo źródło (czyta je raz);
- **bramka cytatów K2: wyrywkowa** — 2 najgęstsze lekcje na moduł.

### Dowody

Strażnicy 25/25 i testy 75/75 na każdym scalanym punkcie; weryfikacja
kompletu DWUSTRONNA: 41 plików prozy na gałęzi (6+5+8+8+8+6) i 41
lekcji z treścią w bazie zapytaniem SQL, nie logiem narzędzia. CI stoi
do 1 września (limit minut Actions) — merge na dowodach lokalnych, po
powrocie CI do potwierdzenia gitleaks.

## [0.30.0] — 2026-08-19

Krok 3 planu domknięcia Pluginu 1, **etap 2: kreator przejmuje treść
lekcji**. Warstwa danych weszła wcześniej (migracja 006, kontrakty,
akcja dyspozytora); to wydanie dokłada PANEL - czyli miejsce, w którym
właściciel naprawdę napisze materiał obu kursów.

Materiał kursu jest towarem: kupujący płaci za dostęp po zalogowaniu.
Dlatego pełny tekst czyta WYŁĄCZNIE nowa trasa kreatora, a katalog
i strona sprzedażowa dostają z bazy samą flagę „lekcja ma treść".

### Dodane

- **`/szkolenia/kreator/lekcja/[id]`** - pisanie treści JEDNEJ lekcji
  (Markdown + materiały dodatkowe), za bramą tokenu, z `noindex`.
  Osobna trasa, nie czwarta zakładka kursu: lekcja mieści 120 000
  znaków, więc formularz kursu woziłby przy każdym wejściu materiał
  wszystkich 41 lekcji.
- **Wejście z zakładki Program** - przycisk „Treść" przy lekcji (stan
  z bazy: napisana albo pusta) i licznik „Z treścią" nad listą modułów.
- **Licznik „Treść lekcji X/Y" na liście kursów** - postęp największej
  roboty kroku 3 widać bez wchodzenia w kurs; liczy baza (indeks
  częściowy z migracji 006), nie panel.
- **`components/kreator/opis-lekcji.ts`** - opis pól lekcji na wzór
  `opis-sekcji.ts`, wraz z limitami z kontraktu.
- **`straznik-tresci-lekcji`** - materiał zza logowania nie ma prawa
  wyjść wspólnym odczytem strony. Domyka lukę zapisaną przy warstwie
  danych: test „strona widzi flagę, nigdy tekstu" dowodził, że KONTRAKT
  obcina treść, ale nie że zapytanie jej nie pobiera.
- **`tools/smoke/smoke-lekcje.ts`** (+ krok w CI) - dowód po HTTP:
  brama, wystrzał treści z samego ciastka, 404 na śmieciach, BRAK
  materiału w katalogu i na stronie sprzedażowej OPUBLIKOWANEGO kursu
  oraz to, że zapis programu nie kasuje napisanej treści.
- Golden `goldeny/d6-lekcja.json` (opis pól lekcji) i runda
  „panel → baza → panel" dla treści lekcji w testach D6.

### Naprawione

- **Panel nie odsyłał identyfikatorów modułów i lekcji.** Warstwa
  danych umiała je utrzymać od 0.26.0, ale formularz kursu wysyłał
  program bez `id` - a dyspozytor kasuje wiersze spoza wejścia. Pierwszy
  zapis kursu skasowałby treść wszystkich lekcji i wstawił program od
  nowa. Teraz `id` jedzie w obie strony.
- **Formularz nie przyjmował stanu po zapisie.** Nowa lekcja dostaje
  `id` dopiero w bazie; bez przyjęcia odświeżonych danych z serwera
  drugi zapis powtarzałby błąd wyżej, a przycisk „Treść" nie pojawiał
  się aż do przeładowania strony.
- **Mutacja `straznik-wagi-dokumentacji` była ślepa w worktree** -
  `git add` odmawia dodania pliku „przez dowiązanie", więc audyt
  raportował dziurę w strażniku, której nie ma. Mutacja celuje teraz
  w ścieżkę bez dowiązania i sprząta po sobie katalog.

### Zmienione

- Kontrolki sterowane opisem pól wyprowadzone z `EdytorSekcji` do
  `components/kreator/PolaOpisane.tsx`, a typy opisu do `opis-pol.ts` -
  jeden renderer dla sekcji i lekcji. Inaczej `straznik-kreatora`
  pilnowałby zgodności z kontraktem tylko w jednym z dwóch edytorów.
- `straznik-kreatora` obejmuje treść lekcji i sprawdza dodatkowo listy
  zamknięte: opcje w panelu muszą być tym samym zbiorem co enum
  kontraktu (panel nie ma prawa podpowiadać wartości, której baza nie
  przyjmie, ani chować tej, którą przyjmuje).
- `trescLekcji()` oddaje też kontekst (kurs, moduł, numer w programie) -
  edytor lekcji to osobna trasa i bez tego nie miałby jak nazwać tego,
  co właściciel pisze, ani dokąd wrócić.

### Dowody

Testy 62/62, strażnicy 24/24, audyt mutacji 71/71 (0 przeoczonych,
0 martwych), smoke D4/D5/D6/lekcje/podgląd zielone na produkcyjnym
`next start`. Każdy nowy test sprawdzony testem negatywnym: 5 mutacji
logiki panelu i rundy przez bazę, 2 mutacje smoke'a (zdjęta brama =
czerwony, formularz bez `id` lekcji = czerwony). CI stoi do 1 września
(wyczerpane minuty Actions) - dowody są lokalne, jak przy 0.21.0
i 0.25.0.

Numer wydania to 0.30.0: krok 2 domknął się w międzyczasie trzema
wydaniami (0.27.0 brama AJAX-a, 0.28.0 limity wejścia, 0.29.0 zamknięcie
kroku), a protokół pracy równoległej mówi wprost — kto merguje pierwszy,
ten bierze numer; drugi scala bazę u siebie i przenumerowuje. Ta gałąź
scaliła bazę DWA razy i za każdym razem przeszła komplet dowodów.

Skutek scalenia z limitami wejścia (0.28.0) widać w `typy.ts`: kształt
`MaterialLekcji` i kontrakt odczytu `LekcjaZTrescia` stoją teraz
w części ODCZYTOWEJ pliku, zgodnie z konwencją `straznik-limitow`
(region limitów zaczyna się przy stałych i obejmuje wyłącznie wejście).
`TrescLekcji` — czyli to, co panel WYSYŁA — zostaje pod limitami, gdzie
strażnik ją widzi. Materiał lekcji przychodzi z sieci, a wypadł poza ten
region, więc sufity jego pól pilnuje odtąd `straznik-tresci-lekcji`
(czwarty niezmiennik + mutacja).
## [0.29.0] — 2026-08-19

**Krok 2 planu domknięcia Pluginu 1 ZAMKNIĘTY.** To wydanie nie zmienia
kodu — domyka krok: checklista bezpieczeństwa nie ma już ani jednej
pozycji możliwej do zrobienia w prototypie i pozostawionej otwartej.

Cztery wydania kroku: **0.26.0** pełne CSP z nonce'em, **0.27.0** brama
jedynego AJAX-a (limit tempa, kara czasowa, stały czas porównania
tokenu), **0.28.0** twarde limity wejścia, **0.29.0** domknięcie.

Bilans wejściowy z przeglądu: 14 otwartych pozycji (nie 18 — tamta
liczba liczyła linie z legendą, nie wiersze tabel), z czego dwie
okazały się zrobione w 0.24.0/0.25.0, pięć trafiło do prototypu,
pięć do specyfikacji wtyczki WP, trzy poza repo (decyzje właściciela:
2FA, branch protection, domena). Wszystkie pięć prototypowych zostało
zrobionych.

### Dodane

- **BLAD-013** w rejestrze: strażnik wiązany z NAZWĄ API zamiast
  z zachowaniem. `straznik-limitera` sprawdzał „limit tempa przed
  czytaniem ciała", opierając się na `request.json()`; gdy trasa
  przeszła na czytanie strumieniem, warunek zamilkł i strażnik
  zzieleniał na mutacji, którą wcześniej łapał. Wykrył to dopiero
  audyt mutacyjny — bez okresowego uruchamiania audytu ta klasa błędu
  jest NIEWYKRYWALNA, bo nie ma żadnego objawu.

### Zmienione

- Checklista bezpieczeństwa: stan 🚧 („w robocie w kroku 2") nie
  opisuje już żadnej pozycji; sekcja specyfikacji WP mówi o tych
  wzorcach w czasie przeszłym — istnieją w kodzie, nie w planach.
- `KROK-2-ZABEZPIECZENIA.md` i `CLAUDE.md` odnotowują domknięcie kroku
  wraz z tym, co świadomie ZOSTAJE otwarte: pozycje należące do
  wtyczki WP (RODO, konta klientów, honeypot, SPF/DKIM/DMARC, HTTPS
  i HSTS) oraz trzy decyzje właściciela poza repo.

### Stan dowodów na koniec kroku

Strażnicy **23/23**, audyt mutacyjny **64 złapane / 0 przeoczonych /
0 martwych**, testy **49/49**, smoke D4/D5/D6/CSP/SEO/podgląd zielone,
lint bez błędów. Wszystko odtwarzane lokalnie — CI organizacji stoi do
1 września (wyczerpany limit minut Actions).

## [0.28.0] — 2026-08-19

Krok 2 planu domknięcia Pluginu 1, **część 3: twarde limity wejścia**.
Kontrakty ograniczały pola kursu (slug 120, title 200, short_desc 500)
i to wyglądało na komplet. Nie było: treść sekcji była gołym
`z.string()`, tablice `sections`/`modules`/`lessons` nie miały sufitu
liczności, `price_grosze` mieściło wszystko aż do granicy kolumny
`integer`, a trasa wczytywała **całe ciało żądania do pamięci**, zanim
cokolwiek je zmierzyła.

Wszystkie liczby w tym wydaniu wzięły się z pomiaru bazy, nie z
przeczucia: najdłuższy tekst w treści sekcji ma **191 znaków**,
najliczniejsza lista **10 pozycji**, kurs ma najwyżej 12 sekcji,
7 modułów i 11 lekcji w module, a pełny zapis kursu waży **17 kB**.
Limity stoją rząd wielkości wyżej — mają odcinać nadużycie, nie pracę.

### Dodane

- Sufity długości i liczności w KAŻDYM polu wejścia: aliasy
  `krotki()` / `akapit()` / `lista()` w `modules/m1-sklep/typy.ts`
  plus nazwane stałe (`LIMIT_KROTKI`, `LIMIT_AKAPIT`, `LIMIT_LISTY`,
  `LIMIT_SEKCJI`, `LIMIT_MODULOW`, `LIMIT_LEKCJI`, `LIMIT_POZYCJI`,
  `LIMIT_CZASU_MIN`, `LIMIT_TOKENU`, `SUFIT_CENY`).
- **Sufit ciała żądania: 2 MB, mierzony STRUMIENIEM** przed
  parsowaniem JSON-a; przekroczenie to 413. `content-length`
  sprawdzamy najpierw, ale mu nie ufamy — może kłamać, a przy
  transferze porcjowanym w ogóle go nie ma.
- `straznik-limitow` — 10 niezmienników, 12 mutacji w audycie (w tym
  kontrprzykład: `z.string()` w kanale ODCZYTU sufitu nie potrzebuje,
  bo tamte dane przychodzą z naszej bazy).
- Pięć testów limitów w `dyspozytor.test.ts` i dwa dowody 413 w smoke
  D6 (ciało z zadeklarowanym rozmiarem oraz ciało bez `content-length`).

### Zmienione zachowanie

- **Treść sekcji jest OCZYSZCZANA schematem przed zapisem.** Do tej
  wersji `content` szedł do JSONB w całości, a schemat rodzaju tylko go
  sprawdzał — więc klucz spoza kontraktu wchodził do bazy bez żadnego
  limitu i bez szans pojawienia się na stronie. Same `.max()` byłyby
  przy tym dekoracją: limity omijało jedno nieznane pole.
- **Konflikt unikalności nie oddaje już komunikatu Postgresa.**
  Surowy tekst niesie nazwy ograniczeń, tabel i kolumn — czyli rysunek
  schematu bazy. Klient dostaje zdanie napisane przez nas, szczegół
  idzie do logu serwera, gdzie jest potrzebny przy diagnozie.
- Cena ponad sufit jest odrzucana walidacją, a nie błędem kolumny
  `integer` (2 147 483 647).

### Naprawione

- **Audyt mutacyjny złapał regresję kontroli z poprzedniego wydania:**
  `straznik-limitera` wiązał sprawdzenie „limit tempa PRZED czytaniem
  ciała" z nazwą `request.json()`. Ta trasa czyta teraz ciało
  strumieniem, więc warunek przestał cokolwiek znaczyć — strażnik
  pozostawał zielony przy mutacji, którą wcześniej łapał. Wzorzec
  patrzy teraz na pierwsze DOTKNIĘCIE ciała, jakąkolwiek drogą.
- `straznik-limitow` porównywał pozycję nazwy `cialoZSufitem`, trafiając
  w jej definicję na górze pliku zamiast w wywołanie — ta sama klasa
  błędu, złapana tym samym audytem, w tym samym przebiegu.

## [0.27.0] — 2026-08-19

Krok 2 planu domknięcia Pluginu 1, **część 2: brama jedynego AJAX-a**.
Do tej wersji zgadywanie tokenu kosztowało cokolwiek WYŁĄCZNIE
w formularzu logowania (700 ms kary od D6). Kanał sieciowy
`/api/szkolenia` — ten JEDYNY wystawiony na świat — nie miał ani kary,
ani limitu, ani nawet porównania tokenu w stałym czasie.

**Checklista mówiła w tym miejscu „✅" i nie kłamała — mówiła prawdę
o formularzu.** Wiersz nie zauważał, że obok stoją drugie drzwi, które
robią to samo bez żadnej z tych trzech ochron. Całe wydanie sprowadza
się do wyrównania obu wejść do tego samego zamka.

### Dodane

- `lib/limiter.ts` — okno przesuwne po adresie i akcji. Moduł CZYSTY
  (bez importów z `next/*`), więc granice okna sprawdza test jednostkowy
  z wstrzykniętym czasem, zamiast zgadywania ze zrzutów żywego serwera
  — ten sam układ, co `lib/csp.ts`. Dwa progi, bo bronią przed dwiema
  różnymi rzeczami: 60 wystrzałów na minutę z adresu (zalew) i 5
  CHYBIONYCH uwierzytelnień na 10 minut (zgadywanie).
- `lib/limiter.test.ts` — osiem dowodów: liczba przepuszczonych prób,
  granica okna co do milisekundy, prawdziwość `Retry-After`, brak
  przesuwania okna przez odrzucone próby, rozdział kluczy, zerowanie,
  sufit pamięci i czytanie adresu z nagłówków.
- `straznik-limitera` — 11 niezmienników, 14 mutacji w audycie (w tym
  kontrprzykład: `token === wzorzec` zacytowane w KOMENTARZU ma być
  przemilczane, bo strażnik oskarżający opisy jest strażnikiem,
  którego się wyłącza).
- Smoke D6 dowodzi bramy tempa **po HTTP**: seria chybionych tokenów
  kończy się odpowiedzią 429 z `Retry-After`, a poprawny token z tego
  samego adresu przechodzi mimo wyczerpanego licznika chybionych prób.
- Audyt strażników umie teraz mutację „skasuj plik" (`usunPlik`) — bez
  tego niezmiennika „test limitera musi istnieć" nie dałoby się
  sprawdzić inaczej niż deklaracją.

### Zmienione zachowanie

- Jedyny AJAX odmawia kodem **429 z nagłówkiem `Retry-After`** (RFC
  6585), treść generyczna — klient wie, że ma zwolnić, ale nie wie,
  w który licznik trafił.
- **Kara czasowa 700 ms działa też poza formularzem.** Stała
  przeprowadziła się do `lib/limiter.ts`, żeby oba kanały liczyły tak
  samo, a nie „tak samo z pamięci".
- Udane uwierzytelnienie **zeruje** licznik chybionych prób z tego
  adresu — właściciel, który raz wkleił zły token, nie pracuje dalej
  z licznikiem na skraju wyczerpania.

### Decyzje zapisane w kodzie, nie w głowie

- **Licznik chybionych prób pyta o WYNIK dyspozytora, zamiast oceniać
  token sam.** Dzięki temu żądanie z poprawnym tokenem nie ma jak w niego
  wpaść, choćby ktoś przed sekundą zgadywał z tego samego adresu (a
  zgadującego to nie ratuje — on z definicji poprawnego tokenu nie ma).
  Trasa dalej niczego nie autoryzuje: dowiaduje się z odpowiedzi.
- **Odrzucone próby nie wchodzą do okna.** Inaczej dobijanie się do
  zamkniętych drzwi przesuwałoby termin zwolnienia w nieskończoność,
  a `Retry-After` byłby zmyśloną liczbą. Limiter ogranicza TEMPO,
  nie karze.
- **Po wyczerpaniu limitu odpowiadamy natychmiast, bez kary czasowej** —
  700 ms trzymanego połączenia przy zalewie jest kosztem naszym, nie
  atakującego.
- **`x-forwarded-for` jest do podrobienia**, dopóki nie stoi przed nami
  proxy, które ten nagłówek nadpisuje. Zdanie stoi w kodzie i w
  specyfikacji wtyczki WP: limit po adresie podnosi KOSZT ataku i nie
  jest granicą bezpieczeństwa. Granicą jest porównanie tokenu w stałym
  czasie, docelowo uwierzytelnianie z Pluginu 3.
- **`timingSafeEqual` w dyspozytorze to KOPIA sześciu linii, nie import
  z `lib/`** — moduł ma zostać samowystarczalny jak wtyczka (WYTYCZNE
  §8), a `lib/kreator-dostep.ts` ciągnie `next/headers`.
- **Stan limitera siedzi w pamięci procesu** — świadomie, na czas
  prototypu. Do specyfikacji WP idzie REGUŁA (okno przesuwne po adresie
  i akcji), nie ta implementacja; tam nośnikiem będzie baza albo obiekt
  cache WordPressa.

### Naprawione

- **`modules/m1-sklep/dyspozytor.ts` porównywał token operatorem `===`.**
  Porównanie kończy się na pierwszym różnym bajcie, więc mierzalny czas
  odpowiedzi zdradzał, ile pierwszych znaków zgadło się poprawnie — a to
  zamienia zgadywanie tokenu w zgadywanie znak po znaku. Formularz
  liczył w stałym czasie od D6; wystawiony na świat kanał sieciowy nie.

## [0.26.0] — 2026-08-19

Krok 2 planu domknięcia Pluginu 1, **część 1: pełna polityka
bezpieczeństwa treści (CSP)**. Do tej wersji wysyłaliśmy sam
`frame-ancestors 'none'`, a resztę checklista odkładała do etapu
WordPressa z uzasadnieniem „w prototypie byłaby teatrem".

**Ta ocena była nieprawdziwa i to jest główna zmiana tego wydania.**
Jedynym realnym kosztem nonce'ów jest wymuszenie renderowania na
żądanie — a wszystkie nasze trasy z treścią są `force-dynamic` od D4/D5.
Płaciliśmy więc ten koszt od dawna, nie biorąc nic w zamian.

### Dodane

- `proxy.serwer.ts` — polityka nagłówkiem HTTP, nonce inny w każdym
  żądaniu. Nazwa z `serwer.*` nie jest kosmetyką: Proxy jest na liście
  „Unsupported Features" eksportu statycznego, więc plik `proxy.ts`
  wywróciłby `build:podglad`. Ten sam trik `pageExtensions`, którym
  rozdzielamy trasy kreatora i AJAX-a.
- `lib/csp.ts` — jedno źródło polityki dla obu trybów budowania
  (bez importów z `next/*`, bo czyta go też zwykły skrypt Node'a).
- `lib/csp-nonce.ts` — nonce dla znaczników, którym Next go nie nadaje.
- `tools/csp-podglad.mjs` — polityka dla podglądu w `<meta http-equiv>`
  z hashami skryptów, liczonymi z GOTOWYCH plików `out/`.
- `straznik-csp` (9 niezmienników, 10 mutacji) i `tools/smoke/smoke-csp.ts`
  (nagłówek na żywym serwerze + hashe w plikach podglądu).

### Zmienione zachowanie

- **Strona 404 i korzeń są renderowane na żądanie**, nie z prerenderu.
  To nie efekt uboczny, tylko warunek poprawności: pomiar pokazał
  24 skrypty na `/_not-found` i **zero nonce'ów** — pod `strict-dynamic`
  (który unieważnia `'self'`) nie wykonałby się żaden. Odczyt nagłówków
  w układzie korzenia przestawia te trasy na renderowanie na żądanie.
- `next.config.ts` zostaje z nagłówkami niezależnymi od żądania;
  wpis `frame-ancestors 'none'` jest tam teraz WARSTWĄ dla ścieżek poza
  zasięgiem proxy (pliki statyczne, prefetch), a nie polityką dokumentów.

### Decyzje zapisane w kodzie, nie w głowie

- **`style-src` stoi na `unsafe-inline` — świadomie.** React hoistuje
  arkusz `@font-face` i przy tym ZDEJMUJE mu `nonce`, a strona renderuje
  19 atrybutów `style="…"`, których nonce nie obejmuje z definicji.
  Obecność nonce'a w `style-src` kasuje `unsafe-inline`, więc wybór był
  binarny. Zmierzone: wariant „ostry" daje **21 naruszeń** na samym
  katalogu i gasi kroje pisma, czyli cofa pracę nad CLS z 0.25.0.
  Realną ochroną jest `script-src` i to jego pilnuje strażnik.
- `img-src` dopuszcza `https:`, bo kreator przyjmuje okładkę jako
  dowolny adres (decyzja właściciela z D6); `http:` zostaje zablokowany.
- Podgląd nie dostaje `strict-dynamic` (w eksporcie znaczniki
  `<script src>` stoją wprost w HTML-u) ani `frame-ancestors`
  (w `<meta>` ignorowane) — obie różnice są udokumentowanym kosztem
  hostingu bez nagłówków, nie przeoczeniem.

### Naprawione

- **BLAD-012**: `smoke-podglad` budował podgląd przez `npx next build`
  zamiast komendy `npm run build:podglad`, więc oglądał katalog `out/`
  BEZ kroków po buildzie — czyli inny artefakt niż ten, który wydaje
  deploy. Nawrót klasy błędu, która w 0.24.0 wypuściła podgląd
  z czterema martwymi miniaturami OG.
- `straznik-seo` oskarżał o „własny blok `application/ld+json`" pliki,
  które wspominają o nim w KOMENTARZU. Teraz pomija komentarze — jak
  `straznik-linkow` pomija bloki kodu. Reguła przypięta kontrprzykładem
  w audycie mutacyjnym.

### Dowody (CI stoi do 1 września — odtworzone lokalnie)

- strażnicy **21/21**, audyt mutacyjny: wszystkie mutacje ZŁAPANE,
  kontrprzykłady przemilczane;
- `smoke-csp` zielony, oba testy negatywne czerwone tam, gdzie trzeba
  (błędny nonce → „1 z 42 skryptów bez nonce'a"; pominięty hash →
  „skrypt bez swojego hasha w polityce");
- pomiar w prawdziwej przeglądarce (Firefox, `securitypolicyviolation`):
  **0 naruszeń i 0 błędów konsoli** na `/szkolenia`, stronie kursu, 404
  i kreatorze, w obu trybach budowania; hydratacja przechodzi, 4 reguły
  `@font-face` na miejscu, dane strukturalne nienaruszone.

## [0.25.0] — 2026-08-19

Krok 1 planu domknięcia Pluginu 1, **część 3 z 3: wydajność i pomiary**.
Liczby w tabeli README pochodzą z PageSpeed Insights (Lighthouse na
serwerach Google), mediana z 5 przebiegów, i są przypięte goldenem —
`straznik-progow` nie przepuści liczby bez pokrycia w zapisanym
przebiegu. Wynik: **desktop 100/100/100/100 na obu stronach (po 5
przebiegów z rzędu), mobile 96–97 wydajności** przy komplecie 100
w dostępności, dobrych praktykach i SEO. Mobilne 96–97 to artefakt
symulacji Lantern (dolicza łańcuch webfontu do tekstowego LCP;
obserwowane LCP na serwerach Google to ~450 ms) — **przyjęte decyzją
właściciela (2026-08-19), łagodzącą warunek „100 w każdej kolumnie"**.

### Naprawione (każda usterka znaleziona i potwierdzona pomiarem)

- **Podmiana fontu przesuwała stronę i opóźniała LCP** (desktop CLS
  0,137–0,166, mobile LCP przy dojeździe fontu). `next/font/local` nie
  emituje `<link rel="preload">` w tym projekcie w ogóle, więc font
  jechał łańcuchem HTML → CSS → font; statystyki hero łamały się
  fontem zastępczym na dwie linie i wskakiwały w jedną Geistem
  (widoczne na klatkach filmu z pomiaru PSI). Teraz: fonty
  z `public/fonts` własnym `@font-face` + jawny preload w layoucie
  (React hoistuje do `<head>`; `crossorigin` obowiązkowy, bo pobrania
  fontów są CORS-owe). **CLS = 0 na wszystkich czterech pomiarach.**
  To NIE jest nawrót BLAD-001 (tam winne były klasy CSS pakietu
  `geist` różne między serwerem a klientem; tu klas nie ma, a pakiet
  dalej blokuje `straznik-fontow`).
- **Korekta metryk zastępnika była martwa na Linuksie**: twarze
  fallbacku od next/font stały wyłącznie na `local(Arial)`, którego
  na Linuksie (w tym na serwerach pomiarowych Google) nie ma — tekst
  zastępczy renderował się o 8–11% węższy (zmierzone), więc dojazd
  Geista poszerzał bloki i Chrome rejestrował nowego kandydata LCP
  w chwili podmiany. `local()` dostał też **Liberation Sans**
  (metryczny bliźniak Ariala): geometria zastępnika = geometria
  Geista na każdej platformie.
- **Impuls wordmarku stopki udawał największą treść strony**: animacja
  chodziła od załadowania (stopka 4 ekrany niżej), a jej pierwszy
  przelot przez maskę tekstową Chrome rejestrował jako kandydata LCP
  o rozmiarze 183 600 px² — stąd LCP obu stron przybite do ~2,2 s na
  elemencie, którego nikt nie widział. Teraz `IntersectionObserver`
  FooterScene (ta sama bramka, która od 0.24.0 trzyma prewarm pyłu)
  ustawia `data-na-ekranie`, a CSS wstrzymuje animację
  (`animation-play-state: paused`) i zdejmuje malowanie grupy
  maskowanej (`visibility: hidden`), dopóki stopka nie wejdzie
  w widok. Bez JS bramki nie ma — dekoracja działa jak dotąd; przy
  porażce hydratacji wyłącznik 4 s przywraca całość. Zmierzone
  w przeglądarce: paused/hidden na górze, running/visible przy
  stopce, z powrotem paused po odjeździe.
- **Weryfikacja deploya była ślepa na zmiany w chunkach** (trzeci
  przedstawiciel klasy „weryfikacja ślepa na artefakt", drugi w samym
  skrypcie weryfikacji): nazwy chunków w tej wersji Next NIE pochodzą
  z treści, więc zmiana samego CSS dawała HTML bajt w bajt identyczny
  z poprzednim deploymentem — porównanie jednego pliku przechodziło
  przeciw STAREMU buildowi, a edge cache Pages (`max-age=600`) oddawał
  starą treść i **pomiar PSI zmierzył poprzednią wersję strony**.
  Wykryte, bo mobilne LCP nie drgnęło co do milisekundy po naprawie,
  która musiała je ruszyć. `sprawdz-zywy.mjs` porównuje teraz stronę
  wejściową ORAZ KAŻDY chunk (zapytania znaczone parametrem omijają
  krawędzie CDN — dowodzą stanu originu); protokół pomiaru nakazuje
  odczekać ≥10 minut po deployu.

### Dodane

- **`tools/pomiar-psi.mjs`** — pomiar na serwerach Google (klucz
  w `.env` jako `PAGESPEED_KLUCZ`), mediana z 5 przebiegów, zapis do
  `goldeny/pomiary-lighthouse.json` z datą i warunkami; kolumna SEO
  osobno z builda `SEO_INDEKSOWANIE=1` (nasz `noindex` zaniża ją o 31%
  kategorii), golden notuje to jawnie. Zmierzone: **SEO 100/100 na
  wszystkich czterech stronach × trybach, zero niezaliczonych audytów.**
- **`tools/pomiar-lighthouse.mjs`** — wariant lokalny do szybkiej pętli
  przy optymalizacji (lokalny Lighthouse mierzy także maszynę: ta sama
  strona dawała TBT 96–257 ms zależnie od obciążenia laptopa — do
  tabeli wchodzi wyłącznie PSI).
- **`straznik-progow`** — liczba w tabeli README musi zgadzać się co do
  jednostki z zapisanym przebiegiem; wiersz z myślnikami znaczy
  „niezmierzone" i niczego nie twierdzi; golden bez wiersza w tabeli
  = błąd (wynik istnieje, dokumentacja go ukrywa). Sprawdzony testami
  negatywnymi w obie strony.
- **Smoke'i pilnują fontów jako artefaktu** (lekcja miniatur OG
  z 0.24.0): `smoke-podglad` sprawdza w każdym publicznym HTML-u dwa
  RÓŻNE preloady fontów z `crossorigin`, z basePath i z plikiem
  istniejącym pod dokładnie tym adresem ze znacznika; `smoke-d4` to
  samo w trybie serwerowym. Oba potwierdzone testem negatywnym
  (preload→prefetch wywala oba).
- **Sekcja „Pomiar wydajności i SEO — protokół" w README przepisana**
  o lekcje sesji: PSI zamiast lokalnego Lighthouse'a, spokojna maszyna
  przy pętli lokalnej, deploy weryfikujący chunki, odczekanie ≥10 min
  po deployu, mediana z 5, tabela tylko z goldenu.

### Zmienione

- **Animacja `page-enter` tylko przy nawigacji klienckiej** (naprawa
  NO_FCP z 8986ec8, decyzja właściciela: fade przy pierwszym wejściu
  zostaje usunięty): `.page-enter` opakowuje całą treść od
  `opacity: 0`, a strona kursu nie ma poza nim żadnej treści — Chrome
  wstrzymuje animacje CSS w niewidocznym dokumencie i PSI zgłaszał
  NO_FCP („strona nie namalowała treści") na serwerach Google. Po
  naprawie strona kursu: 4/4 udane przebiegi desktop, wydajność 100.
  Obalony przy okazji komentarz w kodzie: `template.tsx` NIE remontuje
  się przy nawigacji w tej wersji Next, więc fade przejścia i tak nie
  działał — rozpoznanie nawigacji po `data-hydrated` (flaga modułowa
  nie przeżywa podziału na chunki).
- **Stopka liczy pył dopiero w widoku** (`prewarm()` FooterScene za
  bramką IntersectionObservera; dowód licznikiem jasnych pikseli:
  stary kod 237→261, nowy 0→252 po przewinięciu) i **impuls wordmarku
  chodzi tylko w widoku** (wyżej).
- **`app/icon.svg`** — bez niej przeglądarka pytała o `/favicon.ico`
  w korzeniu domeny (poza basePath) i dostawała 404; jedyny ubytek
  „dobrych praktyk": 96 → **100**.
- **Opisowe `alt` okładek** (tytuł Z BAZY — kursy z kreatora dostaną
  je same) i **tytuł katalogu 24 → 54 znaki** (obie usterki zgłosił
  audyt zewnętrzny; tytuł żyje w `app/szkolenia/widok.tsx`, layout ma
  tylko wartość domyślną).
- **Fonty przeniesione `assets/fonts` → `public/fonts`** (muszą być
  serwowane): nota SIL OFL jedzie z plikami, `straznik-licencji`
  i mutacja w audycie strażników patrzą na nową ścieżkę, odnośniki
  w dokumentacji zaktualizowane.

### Decyzje właściciela (2026-08-19)

- Fade przy pierwszym wejściu: **usunięty świadomie** (przy nawigacji
  i tak nie działał; naprawa NO_FCP go wymagała).
- Fonty: **self-hosting + preload** (wygląd bez zmian) zamiast
  `font-display: optional` (ryzyko pierwszej wizyty bez Geista).
- Mobile 96–97: **przyjęte jako artefakt symulacji** — warunek „100
  w każdej kolumnie" złagodzony; obserwowane LCP ~450 ms, wszystkie
  realne usterki naprawione pomiarem.

## [0.24.0] — 2026-08-19

Krok 1 planu domknięcia Pluginu 1, **część 2 z 3: SEO na stronie**.
Przed tym wpisem podstrona nie miała ANI JEDNEGO tagu OpenGraph, ani
jednego adresu kanonicznego, żadnego `robots.txt`, sitemapy ani danych
strukturalnych — sprawdzone w zbudowanym HTML-u, nie założone. Pomiary
Lighthouse'em są częścią 3; tu powstaje to, co będzie mierzone.

### Dodane
- **`lib/seo.ts`** — jedno miejsce rozstrzygające, GDZIE ta wersja stoi
  i CZY wolno ją indeksować. Kanonik, OpenGraph, `robots.txt`, sitemapa
  i JSON-LD muszą mówić o tym samym adresie; rozjazd między nimi to
  błąd bez objawu.
- **Adresy kanoniczne i OpenGraph** na katalogu i stronach kursów,
  `metadataBase` w układzie strony.
- **`app/robots.ts` i `app/sitemap.ts`** — generowane, nie pisane ręcznie,
  żeby nie mogły rozjechać się z metatagiem `robots`. Sitemapa czyta te
  same kursy co katalog. **Bez `lastModified`**: kuszące `new Date()`
  mówiłoby „treść się zmieniła" po każdym buildzie, także gdy zmienił
  się sam CSS — a to zmyślanie, tyle że w metadanych.
- **Miniatury Open Graph** (`next/og`): jedna wspólna dla korzenia
  i katalogu, **własna dla każdego kursu** — z tytułem, poziomem, liczbą
  lekcji, czasem materiału i ceną, wszystko z bazy. Bez nich każdy
  wklejony link wyglądał identycznie.
- **JSON-LD** — największy nieodrobiony zysk SEO dla sklepu z kursami:
  `Organization`, `BreadcrumbList`, `ItemList` (katalog), `Course`
  z `syllabusSections` i `hasCourseInstance`, `Offer` oraz `FAQPage`.
  Budowane z TEGO SAMEGO obiektu, który renderuje stronę.
- **`straznik-seo`** (19. strażnik, 6 niezmienników) + **6 mutacji**.
- **`tools/smoke/smoke-seo.ts`** w CI — sprawdza ZBUDOWANE pliki:
  kanonik = własny adres, dokładnie jeden `h1`, komplet OG, obraz OG
  istnieje na dysku, a **cena, tytuł i liczba modułów w danych
  strukturalnych zgadzają się z bazą**.
- **`tools/og-rozszerzenie.mjs`** — patrz „Naprawione".
- **Protokół pomiaru w README** wraz z pustą tabelą wyników. Myślniki
  znaczą „niezmierzone", nie „zero"; liczby wejdą z zapisanego przebiegu
  Lighthouse'a w części 3.

### Naprawione
- **Miniatury OG szłyby w świat jako `application/octet-stream`.**
  Konwencja `opengraph-image.tsx` przy `output: "export"` produkuje plik
  BEZ rozszerzenia, a hosting statyczny dobiera typ po rozszerzeniu —
  scrapery Facebooka, LinkedIna i X-a wymagają `image/*`, więc link
  poszedłby bez miniatury przy w pełni poprawnie wyglądającej stronie.
  Lekcja przejęta z repo strony głównej (tam zweryfikowana na żywym
  adresie); `tools/og-rozszerzenie.mjs` dokłada `.png` i przestawia
  odwołania w HTML-u ORAZ w ładunkach RSC.
- **Katalog `/szkolenia` nie dostawał miniatury w ogóle** — konwencja
  plikowa Next NIE dziedziczy się w dół, więc obraz z `app/` obsłużył
  korzeń, ale nie trasę potomną. Wykryte przy oglądaniu zbudowanego
  HTML-u. Rysunek wydzielony do komponentu, dwie cienkie trasy nad nim.
- **Liczebnik na miniaturze kursu odmieniany ręcznie** („41 lekcji")
  — poprawne dla 41, błędne dla 22. Przeszło przez `straznik-odmiany`,
  bo nie było ternarem. Teraz przez `lib/odmiana.ts`.

### Zmienione
- `robots: { index: false }` przestało być wpisane na sztywno w układzie
  strony — decyduje przełącznik `INDEKSOWANIE` z `lib/seo.ts`, wspólny
  dla metatagu, `robots.txt` i sitemapy. **Domyślnie nadal NIE
  indeksujemy.** `SEO_INDEKSOWANIE=1` służy dziś do jednego: zmierzenia
  kolumny SEO w Lighthousie, którą `noindex` punktowo zaniża.
- `app/robots.ts` i `app/sitemap.ts` mają `dynamic = "force-static"` —
  `output: "export"` wymaga tego jawnie. Ta sama wartość pasuje do trybu
  serwerowego, a przy wyłączonym indeksowaniu sitemapa NIE dotyka bazy,
  więc `npm run build` nadal przechodzi bez Postgresa (sprawdzone
  buildem z martwym adresem bazy).

### Świadome decyzje
- **`Offer.availability` = `PreOrder`, nie `InStock`.** Zakup jest dziś
  placeholderem prowadzącym do kontaktu — płatności przychodzą
  z Pluginem 2. `InStock` byłoby deklaracją, że da się kupić od ręki.
  Smoke pilnuje tej wartości; zmieniamy ją w tym samym kroku, w którym
  ruszy koszyk.
- **Miniatury OG bez firmowego kroju.** Satori nie czyta woff2, a my
  mamy subsety Geista właśnie w tym formacie. Krój systemowy jest
  kompromisem na obrazku podglądu, nie w identyfikacji.

## [0.23.0] — 2026-08-19

Krok 1 planu domknięcia Pluginu 1, część pierwsza: **tryb podglądu
statycznego**. Cel właściciela to SEO i wydajność mierzone narzędziami
Google na ŻYWYM adresie, a `/szkolenia` nie dawało się tam wystawić —
wszystkie trasy czytały bazę przy żądaniu, kreator stoi na ciastku,
a repo jest prywatne (Pages z prywatnego repo = plan płatny). Ten wpis
zdejmuje tę przeszkodę. Samego SEO i pomiarów tu jeszcze NIE MA — to
osobne kroki, żeby dowód każdego z nich dało się ocenić z osobna.

Decyzje właściciela na starcie kroku 1: publikujemy do nowego
**publicznego** repo `MatthewPlugins/szkolenia-podglad`; podgląd chodzi
z `noindex` (z zastrzeżeniem, że tabela pomiarów w README ma to
odnotować — patrz „Znane ograniczenia"); mierzymy na treści ROBOCZEJ,
a pomiary powtórzymy po złożeniu finalnych kursów w kreatorze.

### Dodane
- **Dwa tryby budowania z jednego kodu** (`next.config.ts`): serwerowy
  (bez zmian — Plugin 1 tak działa naprawdę) oraz podgląd statyczny
  `npm run build:podglad` → `out/`, z katalogiem i stronami kursów
  wyrenderowanymi **z bazy w czasie builda**. Rozdziela je
  `pageExtensions`: trasy tylko-serwerowe nazywają się `*.serwer.*`,
  warianty prerenderowane `*.statyczny.*`, a każdy tryb widzi wyłącznie
  swoje. Kreator i jedyny AJAX w eksporcie **nie istnieją** — nie ma
  trasy, nie ma pliku, nie ma czego wyciec.
- **`lib/podglad.ts`** — jedno źródło prawdy o trybie plus `zasob()`:
  Next poprawia `basePath` w `next/link` i imporcie statycznym, ale NIE
  w zwykłym `src`, a okładki kursów przychodzą ścieżką Z BAZY.
- **`tools/deploy-podglad.sh`** (`npm run deploy:podglad`) — publikacja
  wyłącznie zbudowanego `out/` do publicznego repo, ręcznie (limit minut
  Actions organizacji jest wyczerpany do 1 września). Skrypt ODMAWIA
  pracy z brudnego drzewa i przy leżącej bazie.
- **`tools/sprawdz-zywy.mjs`** — „wysłałem pliki" to nie to samo co
  „strona działa": czeka, aż żywy adres zacznie serwować DOKŁADNIE ten
  build, porównując treść **bajt w bajt** (Pages serwuje pliki statyczne
  bez obróbki — zmierzone: 99 232 B po obu stronach). Pierwsza wersja
  szukała identyfikatora buildu wzorcem `/_next/static/<coś>/` i była
  **dziurawa**: wzorzec pasował do słowa `chunks`, takiego samego
  w każdym buildzie Next, więc weryfikacja potwierdzała jedynie, że pod
  adresem stoi jakakolwiek strona Next. Złapane przy pierwszej realnej
  publikacji, po tym, jak skrypt wypisał „✔ ten build (chunks)".
- **`straznik-podgladu`** (18. strażnik) + **4 mutacje** w audycie —
  pięć niezmienników, w tym ten najważniejszy: brama kreatora musi
  odciąć się w podglądzie PRZED sięgnięciem po ciastko.
- **`tools/smoke/smoke-podglad.ts`** w CI — buduje własny eksport
  **celowo z `KREATOR_TOKEN` w środowisku** (czyli w warunkach, w których
  zepsuta brama wpisałaby nieopublikowane kursy do publicznych plików)
  i sprawdza, że szkic nie wyciekł, kreatora i AJAX-a nie ma, a `basePath`
  dochodzi też do zasobów z bazy. Test negatywny potwierdził, że smoke
  umie zapalić się na czerwono.

### Naprawione
- **`straznik-ajax` przechodziłby PUSTO** po zmianie nazwy endpointu na
  `route.serwer.ts` — jego wzorzec nazwy szukał wyłącznie `route.ts`,
  więc nie znalazłby ani jednego endpointu i wyglądałby dokładnie tak
  samo jak wtedy, gdy naprawdę nie ma nic do zgłoszenia. Wzorzec
  rozszerzony, sprawdzony testem negatywnym (drugi endpoint → czerwony).
- **Korzeń `/` w eksporcie oddawał stronę błędu Reacta.** `redirect()`
  wymaga serwera, ale w eksporcie **nie psuje builda** — cicho produkuje
  `out/index.html` z `__next_error__`. Wariant podglądu przekierowuje
  nagłówkiem `refresh` i daje zwykły odnośnik pod spodem; smoke sprawdza
  korzeń wprost.
- Linki w CHANGELOG-u do przeniesionych plików (`app/szkolenia/page.tsx`
  → `widok.tsx`, `route.ts` → `route.serwer.ts`) — treść wpisów bez
  zmian, poprawione wyłącznie cele odnośników.

### Zmienione
- Konfiguracja segmentu tras rozeszła się na cienkie łuski
  (`page.serwer.tsx` / `page.statyczny.tsx`) nad wspólnym `widok.tsx`.
  Powód jest twardy: kompilator Next parsuje `dynamic`,
  `dynamicParams` i `generateStaticParams` **statycznie** i odrzuca
  nawet zwykły warunek („can't recognize the exported `dynamic` field…
  It needs to be a static string"). Pierwsze podejście — jeden plik
  z warunkiem — nie skompilowało się; drugie, z `connection()` zamiast
  `dynamic`, skompilowało się, ale dodanie `generateStaticParams`
  przestawiło stronę kursu z `ƒ` na `●` (SSG) i `cookies()` z bramy
  kreatora zaczęło wywracać render błędem `DYNAMIC_SERVER_USAGE`.
  Dopiero rozdział na warianty przywrócił **identyczną** tablicę tras
  trybu serwerowego; potwierdzają to smoke'i D4/D5/D6.

### Opublikowane
- Podgląd żyje pod
  [matthewplugins.github.io/szkolenia-podglad/szkolenia](https://matthewplugins.github.io/szkolenia-podglad/szkolenia)
  (publiczne repo `MatthewPlugins/szkolenia-podglad`, gałąź `gh-pages`).
  Sprawdzone na żywym adresie: strony publiczne 200, kreator 404,
  `/api/szkolenia` 404, nieznany slug 404, okładki 200, tytuły kursów
  zgodne z bazą.

### Znane ograniczenia
- **`noindex` obniża wynik SEO w Lighthousie** (audyt „Page is blocked
  from indexing" jest punktowany). Pomiar rozejdzie się więc na dwa:
  wydajność/dostępność/dobre praktyki i Core Web Vitals na żywym
  adresie z `noindex`, a SEO na buildzie bez niego. Tabela w README
  dostanie kolumnę „warunki pomiaru" — inaczej byłaby prawdziwa
  liczbowo i myląca w treści.
- Podgląd **nie ma nagłówków bezpieczeństwa** — `output: "export"` nie
  wspiera `headers()`, a Pages i tak by ich nie wysłał. Prototyp
  serwerowy ma je bez zmian (dowodzi smoke D4). To znany koszt
  podglądu, nie regres.
- `robots: noindex` siedzi jeszcze na sztywno w `app/layout.tsx` —
  przełącznikiem stanie się w części SEO, razem z `robots.ts`,
  `sitemap.ts`, kanonicznymi adresami i JSON-LD.

## [0.22.0] — 2026-08-19

Dopracowanie repo po domknięciu treści D7 (decyzja właściciela:
najpierw porządek w repo i przekazanie wiedzy, potem kursy w narzędziu).
Wzorce przeniesione z przeglądu repo strony głównej `automatic-ai`
(v3.1.0) — jako IDEE dopasowane do naszej architektury (serwer + baza),
nie kopie: pełna mapa przeglądu i ranking lekcji w opisie PR.

### Naprawione
- **Monogram „MP" w paskach kursu i kreatora** (zgłosił właściciel) —
  ostatnia pozostałość po rebrandingu MatthewPlugins → Automatic AI
  (PR #20 podmienił navbar, stopkę i metadane, ale nie przycisk powrotu
  w dwóch pływających paskach). Teraz oba renderują sygnet
  `AutomaticMark`. Sprawdzone na żywej stronie: zero „MP" w HTML.
- **README kłamało w trzech miejscach**: tabela strażników wymieniała
  13 z 16, moduł 1 miał „następny krok: treść obu kursów" (kompletna
  od 0.21.0), a CI rzekomo „testy dojdą od Działu 2" (jest ich 36).
  Naprawione — a przeciw nawrotom patrz `straznik-readme` niżej.

### Dodane
- **Nagłówki bezpieczeństwa z serwera** (`next.config.ts`): nosniff,
  `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'` (kreator
  chodzi na ciastku — to obrona przed clickjackingiem), Referrer-Policy,
  Permissions-Policy. Strona główna musi wstrzykiwać CSP w HTML po
  buildzie (GitHub Pages nie daje nagłówków); my mamy serwer, więc
  przenieśliśmy IDEĘ, nie implementację. **Smoke D4 sprawdza nagłówki
  na produkcyjnym `next start`** — konfiguracja bez dowodu to deklaracja.
- **`docs/security-checklist.md`** — lista kontrolna bezpieczeństwa
  i SEO z pięciostanową legendą (✅ z dowodem / 🟡 / 🔧 poza repo /
  ⛔ nie dotyczy Z POWODEM / ⏳ etap WP). Struktura ze strony głównej,
  wypełnienie ODWROTNE: u nich backend „fizycznie nie istnieje",
  u nas istnieje i wymaga pokrycia. Sekcja 8 = gotowa specyfikacja
  bezpieczeństwa wtyczki WP (zbiera wszystkie ⏳).
- **`npm test` jedną komendą**: pretest `tools/db1-gotowa.mjs` sam
  podnosi kontener bazy, gdy port milczy; port czyta z
  docker-compose.yml i rozmawia wyłącznie z podmanem — pierwszą wersję,
  która czytała konfigurację aplikacji, słusznie zatrzymał
  `straznik-granic` (WYTYCZNE §8 obronione przed własnym narzędziem).
- **CI oszczędza minuty organizacji** (po sierpniowym wyczerpaniu
  limitu 2000 min — 1753 zużyła strona główna): `cancel-in-progress`,
  job „Zakres zmian" (zwykły `git diff`, bez akcji zewnętrznych) pomija
  build i smoke'i przy commitach czysto treściowych, `timeout-minutes`
  na każdym jobie. Strażnicy i skan sekretów chodzą ZAWSZE.
- **README po liftingu**: spis treści, sekcja „Skrypty" (komendy
  opisane pytaniem, na które odpowiadają), sekcja „SEO
  i bezpieczeństwo" (haczyk tylko tam, gdzie stoi strażnik/test/smoke),
  „Szybki start (nowa maszyna, od zera)" z weryfikacją zdrowia
  maszyny, ramki TIP/NOTE niosące historie realnych błędów
  (maskowanie kodów wyjścia potokiem, limit minut Actions).

### Zapisane decyzje właściciela (2026-08-19)
- porządek gałęzi dopiero PO ukończeniu Pluginu 1;
- właściciel NIE nagrywa wideo — kursy powstaną w narzędziu (kreator
  przejmie lekcje i nagrania; sposób produkcji materiału do osobnej
  propozycji z opcjami); B7 = ocena GOTOWYCH kursów.

## [0.21.0] — 2026-08-18

> [!WARNING]
> **Odstępstwo od reguły „czerwony check = STOP" (WYTYCZNE §1), decyzja
> właściciela 2026-08-18.** Ta wersja została zmergowana i otagowana przy
> CZERWONYM CI, bo CI **nie ruszył**: organizacja `MatthewPlugins` jest na
> planie Free (2000 minut Actions/miesiąc na repozytoria prywatne) i w
> sierpniu zużyła **2072 minuty** — z czego 1753 spaliło repo strony
> głównej `automatic-ai`, a nasze 253. Po przekroczeniu limitu każde
> zadanie pada 2 sekundy po starcie, z zerem kroków i bez logów. Limit
> odnawia się **1 września 2026**.
>
> W zamian pracę CI odtworzono LOKALNIE, kod wyjścia sprawdzany bez potoku
> (`node skrypt | tail` maskuje kod wyjścia — lekcja z Działu 5):
> strażnicy **16/16**, testy **36/36**, `npm run lint` czysto,
> `npm run build` przechodzi, smoke **D4/D5/D6** zielone. Dowód wisi
> w komentarzu przy PR #22. Jedyne, czego nie odtworzono lokalnie, to
> **skan sekretów (gitleaks)** — do potwierdzenia, gdy CI wróci.

### Dodane
- **TREŚĆ DZIAŁU 7 KOMPLETNA — 91 z 91 scenariuszy nagrań** (Kurs 1
  „Jak poprawnie korzystać z Claude": 6 modułów / 41 lekcji; Kurs 2
  „Jak poprawnie używać GitHuba": 7 modułów / 50 lekcji). W tej wersji
  domykają dział **trzy ostatnie moduły Kursu 2**:
  - **Moduł 5 „Automatyzacja: GitHub Actions" — 7 scenariuszy**
    (czym są Actions, pierwszy workflow, continuous integration,
    anatomia workflow, zmienne i konteksty, sekrety, continuous
    deployment). Cytaty: `cytowane/github--modul-5.md`.
  - **Moduł 6 „Bezpieczeństwo konta i kodu" — 6 scenariuszy**
    (2FA, klucze SSH, katalog funkcji bezpieczeństwa, włączanie ich
    w repozytorium, Dependabot, secret scanning). Cytaty:
    `cytowane/github--modul-6.md`.
  - **Moduł 7 „Ponad podstawy" — 5 scenariuszy** (GitHub CLI, GitHub
    Pages, Codespaces, wyszukiwanie, Discussions). Cytaty:
    `cytowane/github--modul-7.md`.
- **Golden treści obu kursów** (`goldeny/d7-tresc.json`
  + `straznik-goldenu-tresci`) — ochrona przed **cichą** utratą tekstu.
  Dla każdej lekcji suma kontrolna i cztery miary (bajty, wiersze,
  sceny, wiersze tabeli zgodności); strażnik pokazuje różnicę per pole
  („sceny: 9 → 7 (−2)"). Regeneracja wymaga podania powodu, więc golden
  jest zarazem dziennikiem zmian treści. Stan zapisany: **91 lekcji,
  506 scen, 1917 wierszy zgodności, 1307 kB**.
- **`straznik-odsylaczy-kursu`** — pilnuje wierności **własnemu
  kursowi**, a nie dokumentacji producenta: (A) odsyłacz „lekcja N.M"
  wskazuje lekcję, która istnieje w tym kursie; (B) zdanie mówiące
  o module nie wymienia tematu należącego do innego modułu. Mapa
  tematów powstaje z pól `lekcja:` w metrykach, więc aktualizuje się
  razem z kursem.
- **`tools/wyciag-zrodla.mjs`** — odchudza plik dokumentacji do prozy,
  tabel i jednego przykładu kodu na sekcję (wycina blobki SVG, odsyłacze
  do zrzutów, powtórzone warianty `<div class="ghd-tool …">`, ten sam
  przykład w ośmiu językach). Na źródłach modułu 4 Kursu 2: −38%.
  Każde cięcie zostawia ślad w stopce pliku.
- **`straznik-scenariuszy`** — mechaniczna kontrola każdego scenariusza:
  kompletna metryka zgodna ze ścieżką pliku, istnienie plików z `zrodla:`
  i niepustego pliku z `cytowane:`, obecność pięciu wymaganych sekcji,
  minimum 8 wierszy tabeli „Zgodność ze źródłem", przynajmniej jeden
  znacznik `[NARRACJA]`.

### Zmienione
- **Tryb produkcji treści: RÓWNOLEGŁY** (decyzja właściciela
  2026-08-18) — moduły 4, 5, 6 i 7 Kursu 2 powstały brefem agenta
  głównego + falami subagentów piszących po jednej lekcji.
  **Ani razu nie zaszedł warunek powrotu do trybu ręcznego**; oceny
  wszystkich czterech modułów wg czterech sygnałów jakości i koszty:
  `tresc-kursow/POSTEP.md`. Briefy modułów zostają w repo jako dowód
  produkcji i punkt odniesienia przy ocenie.
- **Plik cytatów powstaje osobnym przebiegiem subagenta PO całym module
  i jest traktowany jako DRUGA BRAMKA JAKOŚCI**, nie jako porządki —
  autor cytatów szuka zdania w oryginale, więc widzi, czego tam nie ma.
  Moduł 6: 4 wyłapane usterki, moduł 7: 10 (w tym 286 zweryfikowanych
  wierszy tabel zgodności co do numeru akapitu).
- **Cienkie źródła z programu (poniżej ~4 kB) uzupełniane plikami, które
  same wskazują jako dalszą lekturę** — w module 7 dotyczyło to czterech
  lekcji z pięciu (`about-codespaces.md` ma 785 B i jest samym spisem
  odsyłaczy): 23 pliki źródłowe zamiast 7 z programu. Dopisane ścieżki
  lądują w `zrodla:` i w tabeli zgodności.

### Naprawione
- **Nowa klasa usterki: wierność własnemu kursowi.** Finał Kursu 2
  (lekcja 7.5) streszcza siedem modułów i przypisał trzy tematy do
  złych: `.gitignore` modułowi 3 (jest w 2.4), gałęzie chronione
  modułowi 4 (są w 3.5), konflikty scalania modułowi 2 (są w 4.8).
  Nie łapał tego żaden strażnik ani tabela zgodności, bo to nie jest
  teza ze źródła. Naprawione, a przeciw nawrotom stoi
  `straznik-odsylaczy-kursu` (testy negatywne: łapie wszystkie trzy
  pomyłki, w tym wariant eliptyczny „Czwarty — jedenaście lekcji…",
  oraz odsyłacz do nieistniejącej lekcji). Audyt całego korpusu przed
  napisaniem strażnika: 0 martwych odsyłaczy w 91 scenariuszach.
- **Dziewięć usterek treści modułu 7** z przebiegu cytatów: dwie tezy
  bez pokrycia w źródle, dwa zgubione zawężenia (restart z karty
  przeglądarki tylko przy pracy w przeglądarce; rozszerzenia
  z Marketplace tylko w desktopowym VS Code albo kliencie webowym),
  trzy nieprecyzyjne wskazania w tabelach zgodności, dwa uogólnienia
  szersze niż źródło.
- **BLAD-008: artefakt narzędzia zapisu w 31 plikach treści** —
  wyczyszczone, strażnik przeciw nawrotom w `straznik-scenariuszy`
  (pomija bloki kodu, bo tam te znaczniki bywają treścią promptu).
- **`straznik-linkow` pomija bloki kodu i kod inline** — scenariusze
  uczące składni Markdowna zawierają przykłady `[tekst](sciezka)`, które
  nie są klikalnymi odsyłaczami. Sprawdzone testem negatywnym: prawdziwy
  martwy odsyłacz w prozie nadal wywala strażnika.

## [0.20.0] — 2026-08-18

### Dodane
- **Kurs 2 / Moduł 4 „Współpraca: issues i pull requesty" — 11 scenariuszy**
  (GitHub flow w zespole, issues i ich zakładanie, czym jest i jak się
  tworzy pull requesta, prośba o przegląd i praca z uwagami, robienie
  przeglądu, konflikty scalania, merge/squash/rebase, forki, wiązanie
  PR-a z issue). Cytaty źródłowe:
  `docs/dokumentacja-techniczna/d7/cytowane/github--modul-4.md`.
  **Stan treści D7: 73 z 91 scenariuszy (80%).**
- **Pierwszy moduł napisany trybem RÓWNOLEGŁYM** (decyzja właściciela
  2026-08-18). Przebieg: brief całego modułu z granicami tematów
  i callbackami → trzy fale subagentów (4 + 4 + 3), każdy pisze jedną
  lekcję → przelot spójności agenta głównego. Pierwsza fala została
  obejrzana PRZED puszczeniem kolejnych — wada systemowa nie miałaby
  jak powielić się na jedenaście lekcji. Brief zostaje w repo
  (`tresc-kursow/jak-uzywac-githuba/modul-4/BRIEF-modulu.md`), bo to on
  jest powodem, dla którego równoległe lekcje składają się w kurs.
  Ocena wg czterech sygnałów jakości i decyzja o kontynuowaniu trybu:
  `tresc-kursow/POSTEP.md`, sekcja „Jak wypadł moduł 4".

### Naprawione
- **BLAD-008: artefakt narzędzia zapisu w 31 plikach treści.** Pliki
  kończyły się dwiema liniami-śmieciami `</content>` i `</invoke>` —
  większość scenariuszy Kursu 2 (moduły 1–3), moduł 6 Kursu 1 i pięć
  plików cytatów źródłowych. Zgłosili to niezależnie dwaj subagenci
  piszący lekcje 4.7 i 4.9, którzy podglądali format w sąsiednich
  plikach — czyli artefakt zaczynał się już PROPAGOWAĆ do nowej treści.
  Wyczyszczone wszystkie 31; jedno wystąpienie `</content>` w lekcji 6.5
  Kursu 1 zostaje świadomie, bo jest w bloku kodu jako część szablonu
  promptu. Strażnik przeciw nawrotom: `straznik-scenariuszy` łapie te
  znaczniki w prozie scenariusza i w pliku cytatów, pomijając bloki kodu
  (sprawdzone testem negatywnym w obie strony).

## [0.19.0] — 2026-08-18

### Dodane
- **`tools/wyciag-zrodla.mjs`** — odchudzacz źródeł dokumentacji.
  Zostawia prozę, tabele i JEDEN przykład kodu na sekcję; wycina blobki
  `<svg>` ikon (jedna ikona to ~1,5 tys. znaków ścieżek wektorowych
  wklejonych w środek zdania), odsyłacze do zrzutów ekranu, powtórzone
  warianty tej samej instrukcji (`<div class="ghd-tool webui|cli|mac|…">`)
  i ścieżki wewnętrznych odsyłaczy (tytuł zostaje w cudzysłowie).
  Na źródłach modułu 4 Kursu 2: 104 kB → 64 kB (**−38%**; najbardziej
  zaśmiecone pliki −62%). Po co: od tego modułu lekcje pisze kilku
  subagentów RÓWNOLEGLE, więc każdy bajt śmiecia mnoży się przez liczbę
  agentów. Narzędzie niczego nie streszcza ani nie przepisuje — każde
  cięcie zostawia ślad w tekście albo w stopce pliku, bo cichy skrót
  byłby gorszy od braku narzędzia: agent nie wiedziałby, że czyta wersję
  niepełną.
- **`straznik-scenariuszy`** — mechaniczna kontrola KAŻDEGO scenariusza
  lekcji: kompletna metryka zgodna ze ścieżką pliku, istniejący
  i niepusty plik z `cytowane:`, istniejące pliki z `zrodla:`, komplet
  pięciu sekcji, przynajmniej jedna narracja do kamery oraz tabela
  „Zgodność ze źródłem" z minimum 8 wierszami. To warunek bezpieczeństwa
  dla pracy równoległej: w trybie ręcznym jeden agent widział wszystkie
  lekcje po kolei, w równoległym nie widzi ich nikt — więc część „na oko"
  zamieniamy na czerwone CI. Sprawdzony testami negatywnymi na każdej
  gałęzi (brak tabeli, tabela za krótka, martwy plik cytatów, rozjazd
  numeru modułu, brak `zrodla:`, scenariusz bez `[NARRACJA]`). Kontrola
  istnienia plików z `zrodla:` włącza się tylko wtedy, gdy dokumentacja
  jest rozpakowana lokalnie — w CI jej nie ma z założenia (55 MB poza
  gitem), a strażnik mówi wprost, że tę część pominął.

### Naprawione
- **13 scenariuszy wskazywało plik z cytatami, którego nie ma.** Moduły 1
  i 3 Kursu 1 pokazywały na `cytowane/claude-platform--pricing.md`,
  `cytowane/claude-code--pamiec.md` i podobne, podczas gdy cytaty zostały
  po drodze scalone do plików per moduł. Usterka niewidoczna gołym okiem
  i dokładnie tego rodzaju, po który powstał `straznik-scenariuszy`: bez
  niej po roku nie dałoby się sprawdzić, skąd wzięła się teza, bez
  pobierania 55 MB źródeł. Wskazania poprawione, a brakujące cytaty do
  lekcji 1.6 (słowniczek) dopisane jako `cytowane/claude-platform--glossary.md`.
- **Trzy tabele „Zgodność ze źródłem" były płytsze niż materiał lekcji**
  (K1/M1/L1, K1/M2/L1, K1/M5/L1 — 5–7 wierszy przy kilkunastu tezach
  w narracji). Uzupełnione o tezy, które w lekcjach padają, a w tabeli
  ich nie było: pola odpowiedzi API (`content` jako lista bloków,
  `stop_reason`, `usage`), rozbicie rodziny modeli i dwóch dróg budowania
  na osobne wiersze, trzy warunki wstępne prompt engineeringu.

## [0.18.0] — 2026-08-18

### Dodane
- **Źródła Działu 7 pobrane: 2219 stron oryginalnej dokumentacji**
  (WYTYCZNE §7 i N2) — Anthropic `claude-platform` 566/566
  i `claude-code` 187/187 (komplety), GitHub 1466 artykułów.
- **`tools/pobierz-dokumentacje-d7.mjs`** — idempotentny skrypt
  odtwarzający komplet źródeł jedną komendą. Tempo celowo wolne
  (2 wątki, przerwy, honorowanie `Retry-After`): pierwsze podejście
  szło 6 wątkami i `docs.github.com` odrzuciło HTTP 429 połowę
  z 2800 żądań, zostawiając dokumentację dziurawą — a to gorsze niż
  jej brak, bo nie widać, czego brakuje. Zakres GitHuba zapisany
  w kodzie (`SEKCJE_GITHUBA`), więc rozszerzenie kursu to dopisanie
  sekcji i ponowne uruchomienie.
- **`straznik-wagi-dokumentacji`** — pilnuje, żeby masa dokumentacji
  producentów nie weszła do gita, także przez `git add -f`.
  Zweryfikowany testami negatywnymi (obie gałęzie: pliki masowe
  i przekroczony budżet wagi).

### Zmienione
- **Gałąź domyślna repozytorium: `main` → `plugin-1-sklep-kursow`**
  (decyzja właściciela). GitHub renderuje stronę repozytorium z gałęzi
  domyślnej, a `main` stoi na wersji 0.3.4 — 34 commity w tyle, sprzed
  rebrandingu i bez podglądu katalogu. Odwiedzający widział projekt
  sprzed miesiąca pracy. Reguła PLAN.md §5 zostaje nienaruszona: na
  `main` nadal nic nie wchodzi przed ukończeniem Pluginu 1, a `main`
  jest od teraz CELOWO nieaktualny i nie jest źródłem prawdy o stanie
  projektu. Po domknięciu modułu: merge na `main` i powrót domyślnej.
- **Dokumentacja Działu 7 zostaje LOKALNIE, poza repozytorium**
  (decyzja właściciela). To 55 MB i ~2200 plików, a git przechowuje
  każdą wersję na stałe — raz wpuszczone ciążyłyby każdemu klonowaniu
  już zawsze, a odkręcenie wymagałoby przepisania historii. Do repo
  wchodzi to, co czyni źródła weryfikowalnymi: `ZRODLA.md` (z zakresem
  i uzasadnieniem cięć), skrypt odtwarzający i strażnik. Sens wytycznej
  zachowany: agent pracuje na oryginale, nie na pamięci modelu.
  WYTYCZNE N2 dostały doprecyzowanie „dokumentacja wielkiej skali"
  (próg 8 MB) — wytyczna powstała przy działach o kilkunastu plikach.
- **Zakres dokumentacji GitHuba przycięty: 3192 → 1466 stron.**
  Odpadły sekcje spoza kursu: `copilot` (551 — konkurencyjne narzędzie
  AI, o pracy z AI uczy kurs 1), `rest`/`graphql`/`apps` (428 — API dla
  autorów integracji), how-tos i reference GitHub Advanced Security
  (~390 — funkcje na licencji, których kursant nie ma) oraz rozliczenia,
  regulaminy i programy (~440). Uzasadnienie każdego cięcia w `ZRODLA.md`.
- `straznik-linkow` pomija `docs/dokumentacja-techniczna/` — to
  dosłowna dokumentacja producentów, a jej linki są absolutne względem
  serwisu źródłowego (`/en/webhooks/…`), więc jako ścieżki w repo nigdy
  nie istnieją. „Naprawienie" ich znaczyłoby zmienić oryginał, czego
  WYTYCZNE N2 zabraniają. Zweryfikowany testem negatywnym: martwy link
  w NASZEJ dokumentacji nadal zatrzymuje commit.

### Naprawione
- **BLAD-007: podgląd strony głównej wynosił link do prywatnego
  localhosta.** Klon repo strony głównej miał lokalną, NIEcommitowaną
  zmianę `data/navigation.ts` (wpis „Szkolenia" → `localhost:3001`),
  zapisaną wcześniej w CLAUDE.md jako bezpieczną, „bo nic nie
  pushujemy". Tymczasem `scripts/deploy.sh` buduje z KATALOGU
  ROBOCZEGO, nie z commitów — zmiana trafiła do statycznego eksportu
  i została wypchnięta na publiczne GitHub Pages, gdzie stała na
  wszystkich 215 stronach (navbar jest na każdej). Zgłosił właściciel.
  Naprawa: zmiana schowana do stasha (nie skasowana), publikacja
  ponowiona z czystego drzewa, zweryfikowana na żywym adresie
  (0 wystąpień na stronie głównej i podstronach). W CLAUDE.md sposób
  podglądu zastąpiony ZAKAZEM zostawiania jakichkolwiek zmian
  w klonie — podgląd podstrony żyje wyłącznie w tym repo.

## [0.17.1] — 2026-08-18

### Zmienione
- **Zapis decyzji zespołu: produkcja na WordPressie** (hosting
  + domena zamiast VPS/Node.js). PLAN.md dostał sekcję „DECYZJA
  ZESPOŁU 2026-08-18": kod Next.js D1–D6 to prototyp-specyfikacja,
  po Dziale 7 sklep zostanie przepisany na wtyczkę WP (PHP + MySQL)
  z migracją danych z PostgreSQL skryptem; zasady WYTYCZNYCH
  obowiązują w wersji WP bez zmian. Kolejność zatwierdzona przez
  właściciela: najpierw D7 (treść w prototypie), potem etap WP.
  README: wiersze Produkcja/Stack opisują prototyp i cel osobno.
  Przed startem etapu WP do repo trafi celowany komplet oryginalnej
  dokumentacji WordPressa i MySQL (WYTYCZNE N2).

## [0.17.0] — 2026-08-18

### Zmienione
- **Rebranding: MatthewPlugins.pl → Automatic AI** — w ślad za stroną
  główną (repo `MatthewPlugins/matthewplugins.pl` przemianowane na
  `MatthewPlugins/automatic-ai`, PR #84 tamtego repo; organizacja
  GitHuba zostaje `MatthewPlugins`). W podstronie: nowe logo w navbarze
  (sygnet `components/brand/AutomaticMark.tsx` skopiowany 1:1 ze strony
  głównej + napis „Automatic AI"), wordmark stopki `AUTOMATIC AI`
  na szynie zasilającej, copyright, metadane (`layout.tsx`,
  `/szkolenia`), pasek adresu w mockupie `OknoKursu`, adresy CTA
  i stopki na domenę docelową `automaticai.pl` (jak `data/site.ts`
  strony głównej — domena przed startem, sociale to placeholdery),
  placeholdery kreatora, seedy autora oraz cała dokumentacja
  (README, PLAN, CONTRIBUTING, BRIEF, CLAUDE.md).

### Dodane
- **Podgląd w README**: zrzut katalogu `/szkolenia`
  (`docs/zrzuty/podglad-szkolenia.png`) podlinkowany do
  `http://localhost:3001/szkolenia` + skrót komend startu.

## [0.16.2] — 2026-08-17

### Naprawione
- **„Sekcji strony nie mogę nigdzie dodać"** (zgłosił właściciel przy
  ocenie kreatora). Panel działał poprawnie — kurs miał już komplet
  12 rodzajów, więc przycisk „Dodaj" nie miał się gdzie pojawić — ale
  nigdzie tego nie mówił. Zakładka sekcji ma teraz nagłówek
  tłumaczący zasadę (lista niżej to komplet rodzajów, jakie potrafi
  pokazać strona; każdy występuje raz) i licznik stanu: „na stronie:
  11/12 · do dodania: 1" albo „masz komplet 12/12 — nie ma już czego
  dodać". Rodzaj zdjęty ze strony jest wprost oznaczony („nie ma jej
  na stronie") obok przycisku „Dodaj".
- Pomiar w przeglądarce potwierdził pełny cykl: komplet → kosz →
  „Dodaj" wraca i licznik schodzi na 11/12 → dodanie wraca na 12/12.

## [0.16.1] — 2026-08-17

Naprawy z przeglądu kodu całego Działu 6 (przed bramką B6). Zgodnie
z zasadą właściciela: **każdy błąd dostaje strażnika albo test**, żeby
nie miał jak wrócić.

### Naprawione
- **BLAD-005 — pole ceny kasowało wpis w trakcie pisania.** Kontrolka
  była sterowana wartością przeliczoną z groszy, więc stan pośredni
  („199,") wracał jako pusty string, `Number("")` dawało 0 i pole samo
  czyściło wpis: ceny z groszami były nie do wpisania, a kurs mógł
  zostać zapisany za 0 zł. Przeliczanie wydzielone do
  `components/kreator/cena.ts` (`naGrosze` oddaje `null` dla stanu
  w połowie pisania — zapisanej ceny wtedy nie ruszamy), przecinek
  równoważny kropce. **Test**: runda grosze → tekst → grosze.
- **BLAD-006 — dyspozytor przyjmował treść sekcji niezgodną z jej
  rodzajem.** Kształt `content` sprawdzała dopiero strona (safeParse),
  więc zapis „przechodził", a sekcja po cichu znikała ze strony bez
  słowa wyjaśnienia. Teraz `SekcjaWejscie` waliduje treść schematem
  swojego rodzaju i zwraca **ścieżkę do konkretnego pola**; kreator
  tłumaczy pozycję w tablicy na rodzaj sekcji i przeskakuje na
  właściwą zakładkę. **Test**: odrzucenie hero bez obietnicy ze
  ścieżką `kurs.sections.0.content.obietnica`.
- **Slug: nie dało się wpisać myślnika** — pełna normalizacja przy
  każdym znaku ucinała końcowy myślnik, więc „moj-kurs" stawało się
  „mojkurs". Przy pisaniu działa łagodniejsza normalizacja, porządki
  robią się przy opuszczeniu pola i przy zapisie.
- **Sekcja świeciła „gotowa", a zapis padał** — zaczęte pole
  opcjonalne (np. link autora z etykietą, bez adresu) nie było liczone
  jako brak. Teraz jest: puste w całości pozostaje opcjonalne, zaczęte
  musi być dokończone.
- **Zły kształt treści w bazie wysadzał edytor** (500 na
  `.map` nie-tablicy), czyli rekordu nie dało się naprawić z panelu.
  Wczytywanie traktuje JSONB z ograniczonym zaufaniem.
- **Ręczna odmiana liczebników** w nagłówku kreatora („3 w bazie") →
  `lib/odmiana.ts`. Nowy **`straznik-odmiany`** wyłapuje ternary
  odmieniające polskie słowa na piechotę (dwie formy nigdy nie
  wystarczą — polski ma trzy).

### Zmienione
- `npm test` obejmuje teraz także `components/**` i `lib/**` — błędy
  z warstwy panelu (pola formularza) nie były widoczne ani dla testów
  modułu, ani dla smoke'ów.
- Fixtury sekcji w testach D3 poprawione do zgodnych z kontraktem;
  golden `goldeny/d3-odczyt.json` odtworzony świadomie (diff obejmuje
  wyłącznie te dwie sekcje). Sprawdzone, że zaostrzenie nie koliduje
  z seedem właściciela — seed przechodzi na bazie `db1_kursy_test`.

## [0.16.0] — 2026-08-17

Dział 6, krok 3 z 3: podgląd przed publikacją i instrukcja obsługi.
Kreator kompletny — gotowy pod bramkę B6.

### Dodane
- **Podgląd szkicu** — właściciel z ważnym ciastkiem bramy ogląda
  stronę kursu przed publikacją (`/szkolenia/[slug]` przepuszcza wtedy
  szkice), z ostrzeżeniem w rogu: „Szkic — podgląd tylko dla Ciebie".
  Dla gościa ten sam adres to dalej **404**: kanał JSON filtruje po
  statusie, więc nie ma tam treści do wycieku. Smoke D6 pilnuje obu
  stron tej granicy naraz.
- Wejście do podglądu z dwóch miejsc: przycisk „Podgląd" przy każdym
  kursie na liście kreatora (wcześniej tylko przy opublikowanych)
  i „Podgląd strony kursu" w pasku zapisu edytora.
- **[docs/plugin-1/KREATOR.md](docs/plugin-1/KREATOR.md)** — instrukcja
  obsługi panelu dla właściciela: wejście, stany kursu, kolejność
  pracy, czego kreator NIE zrobi (stała kolejność sekcji, okładka jako
  adres pliku, cena w złotówkach) i tabela „gdy coś nie działa"
  z rozwiązaniem błędu „Nieprawidłowy token" po zmianie `.env`.

## [0.15.0] — 2026-08-17

Dział 6, krok 2 z 3: pełna treść kursu z panelu — 12 rodzajów sekcji
sprzedażowych i program (moduły + lekcje).

### Dodane
- **Edytor sekcji sprzedażowych** — wszystkie 12 rodzajów obsługiwane
  JEDNYM komponentem sterowanym opisem pól, nie dwunastoma
  formularzami: `components/kreator/opis-sekcji.ts` mówi, jaka
  kontrolka i etykieta, a kształt treści dalej pilnują schematy Zod.
  Karty w kolejności, w jakiej sekcje pojawiają się na stronie kursu;
  każda ma stan „gotowa" / „brakuje: …" liczony z pól obowiązkowych,
  więc widać braki bez zapisywania. Sekcja bez treści nie trafia na
  stronę.
- **`SCHEMATY_SEKCJI`** w `modules/m1-sklep/typy.ts` — mapa rodzaj →
  schemat treści; jedna prawda dla strony sprzedażowej i kreatora.
  Rodzaj bez wpisu nie skompiluje się.
- **Edytor programu** — moduły i lekcje z kolejnością na strzałki
  (pozycje liczone przy zapisie, więc numeracja nie ma jak się
  rozjechać), czasem lekcji i flagą zapowiedzi; nagłówek liczy moduły,
  lekcje i łączny czas polską odmianą (`lib/odmiana.ts`).
- **Zakładki w edytorze kursu**: Dane podstawowe / Sekcje strony
  (licznik X/12) / Program (moduły/lekcje). Zapis obejmuje całość —
  tablice `sections` i `modules` to pełna podmiana treści (kontrakt
  dyspozytora z D3).
- **`straznik-kreatora`** — pilnuje, że właściciel ma dostęp do
  KAŻDEGO pola, które strona potrafi wyrenderować: rodzaj sekcji bez
  edytora, pole w kontrakcie bez pola w panelu (i odwrotnie) oraz
  rozjazd wymagalności, także w polach zagnieżdżonych (listy obiektów,
  obiekt `link` autora). Zweryfikowany trzema testami negatywnymi.
- **Goldeny D6**: `goldeny/d6-kreator.json` (pełny opis formularza)
  i `goldeny/d6-runda.json` (kurs z KOMPLETEM pól po przejściu przez
  bazę). Testy `kreator-tresc.test.ts` (6) generują przykładową treść
  **z opisu pól**, więc nowe pole automatycznie wchodzi do rundy
  zapis → odczyt — nie da się dołożyć pola, które po cichu ginie.
  Dowód rundy: treść każdej z 12 sekcji wraca z bazy identyczna.
- Logika treści wydzielona do `components/kreator/tresc-sekcji.ts`
  (pusta treść, treść z bazy → formularz, czyszczenie przed zapisem,
  braki) — puste pole opcjonalne nie idzie do bazy, puste obowiązkowe
  idzie i wraca czytelnym błędem przy tym polu.

## [0.14.0] — 2026-08-17

Dział 6 (kreator kursów), krok 1 z 3: brama dostępu, lista kursów
i dane podstawowe. Treść sekcji sprzedażowych i program (moduły +
lekcje) dochodzą w kroku 2.

### Dodane
- **Kreator `/szkolenia/kreator`** — panel treści właściciela w języku
  wizualnym strony (własny pływający pasek `PasekKreatora`, Reveal/
  Cascade, `unos` na kartach): lista WSZYSTKICH kursów z licznikami
  treści liczonymi w bazie (sekcje / moduły / lekcje — zero na
  pomarańczowo, więc od razu widać, czego brakuje), publikacja,
  ukrycie, usuwanie z potwierdzeniem i podgląd strony kursu.
- **Edytor danych podstawowych `/szkolenia/kreator/[id]`** — slug
  (podpowiadany z tytułu, ale tylko dla NOWEGO kursu, żeby edycja nie
  zmieniła adresu opublikowanej strony), tytuł, typ, opis na kartę,
  cena wpisywana w złotówkach (baza trzyma grosze), okładka,
  **badge** i **poziom**. Błędy walidacji z dyspozytora wracają
  przypięte do konkretnych pól.
- **Brama na token** (`lib/kreator-dostep.ts` + akcje serwerowe
  `app/szkolenia/kreator/akcje.ts`): token trafia do ciastka
  **HttpOnly**, więc nie istnieje w JavaScripcie strony; porównanie
  w stałym czasie (`timingSafeEqual`) + kara czasowa za zły token.
  Flaga `Secure` zależy od protokołu żądania, nie od `NODE_ENV` —
  produkcyjny build oglądany na localhoście po http też się loguje.
- **Wejście do kreatora ze stron sklepu** (decyzja właściciela):
  dyskretna pigułka w rogu `/szkolenia` i strony kursu, renderowana
  WYŁĄCZNIE przy ważnym ciastku bramy — gość nie ma jej nawet
  w źródle strony. Na stronie kursu prowadzi wprost do edycji tego
  kursu. To wygoda, nie zabezpieczenie: dostępu pilnuje token.
- **Kanał JSON kreatora**: `szczegolyKursuPoId()` (edycja po id — slug
  bywa właśnie zmieniany) i `listaKursowKreatora()` rozszerzona
  o badge, poziom, datę zmiany i liczniki treści (kontrakt
  `KartaKreatora`).
- **Smoke `tools/smoke/smoke-d6.ts`** (CI, job „baza"): na produkcyjnym
  `next start` dowodzi, że bez ciastka kreator NIE pokazuje szkiców
  i AJAX odpowiada 403, a z ciastkiem przechodzi pełny cykl
  szkic → publikacja → katalog → usunięcie.
- **Testy `modules/m1-sklep/kreator.test.ts`** (6): szkic widoczny dla
  kreatora, liczniki z bazy, edycja po id, zmiana sluga bez gubienia
  kursu, ślad każdej operacji w `course_changelog`.
- Dokumentacja techniczna działu:
  [docs/dokumentacja-techniczna/d6](docs/dokumentacja-techniczna/d6/ZRODLA.md)
  — Server Actions, formularze i `cookies()` skopiowane z pakietu
  `next@16.3.1` (dokładnie ta wersja, na której chodzi aplikacja).

### Naprawione
- **BLAD-004 — pigułka kreatora chowała się pod stopką** (zgłosił
  właściciel). Klasa `.page-enter` opakowująca całą treść strony miała
  animację `opacity` z wypełnieniem `both`; wypełniana animacja stosuje
  swoją wartość także PO zakończeniu, więc kontekst układania zostawał
  na stałe i zamykał w sobie każdy element `position: fixed` z treści —
  stopka (późniejsze rodzeństwo) malowała się na wierzchu, a `z-index`
  nie miał jak pomóc. Wypełnienie zmienione na `backwards`: ten sam
  fade 0,3 s, kontekst znika po animacji. `straznik-fixed` rozszerzony
  o wypełnienia `forwards`/`both` (zweryfikowany testem negatywnym),
  wpis w [rejestrze błędów](rejestr/znane-bledy.json), migawka:
  gałąź `bak/2026-08-17-pigulka-admina-pod-stopka`. Dowód: pomiar
  w przeglądarce (`elementFromPoint` w środku pigułki po zescrollowaniu
  na dół oddaje link kreatora; przed naprawą oddawał DIV stopki).

### Zmienione
- **Dyspozytor sprawdza token PRZED walidacją kształtu** — żądanie bez
  tokenu dostaje `brak-dostepu` (403) zamiast mapy pól kontraktu
  w odpowiedzi `walidacja` (400). Obcy nie dostaje podpowiedzi, jak
  zbudować poprawne żądanie.
- **Jedyny AJAX bierze token z ciastka**, gdy nie ma go w treści
  żądania — endpoint pozostaje jeden (WYTYCZNE §8), a autoryzacja dalej
  należy wyłącznie do dyspozytora.
- `NavbarPrzelacznik` wyłącza globalny navbar na CAŁYM poddrzewie
  kreatora — inaczej lista kursów (pasuje do wzorca `[slug]`) byłaby
  bez navbara, a edycja kursu miałaby dwa paski naraz.

## [0.13.0] — 2026-08-17

### Zmienione
- **Licencja projektu: GPL-2.0 → MIT** (decyzja właściciela). Powód:
  zgodność z repozytorium strony głównej `matthewplugins.pl`, które jest
  na MIT — kod tej podstrony docelowo tam trafia, a przy copyleftcie
  wymagałoby to relicencjonowania. Nic nie wymuszało GPL: projekt nie
  jest pluginem WordPressa (czysty Next.js), a wszystkie zależności
  produkcyjne są permisywne (next/react/pg/zod — MIT, lucide-react —
  ISC). Zmiana objęła `LICENSE`, `package.json`, `package-lock.json`,
  README i wytyczną [WYTYCZNE §3](docs/WYTYCZNE.md) (z zapisanym
  uzasadnieniem decyzji).

### Dodane
- **Licencja fontów obok plików fontów**:
  [public/fonts/LICENSE-Geist-OFL.txt](public/fonts/LICENSE-Geist-OFL.txt)
  — Geist jest na SIL OFL 1.1 i licencja projektu (wcześniej GPL, teraz
  MIT) NIGDY go nie obejmowała; przy redystrybucji plików `.woff2` tekst
  OFL musi jechać razem z nimi. Tekst pobrany z oficjalnego repozytorium
  `vercel/geist-font`.
- `straznik-licencji` przepisany: pilnuje MIT w LICENSE, README
  i `package.json` (metadane pakietu potrafiły zostać po staremu),
  wyłapuje pozostałości „GPL-2.0" w README oraz brak tekstu OFL przy
  plikach fontów. Zweryfikowany testami negatywnymi.

## [0.12.1] — 2026-08-17

**Bramka B5 zaliczona przez właściciela (2026-08-17)** — Dział 5
(katalog + strona sprzedażowa kursu) domknięty; następny krok:
Dział 6 (kreator kursów).

### Naprawione
- **Pasek menu kursu znikał po zescrollowaniu w dół** (zgłosił właściciel
  przy B5; rejestr: **BLAD-003**). Przyczyna nie była w samym pasku:
  `@keyframes page-enter` animowały `transform`, a klasa `.page-enter`
  z [app/template.tsx](app/template.tsx) opakowuje CAŁĄ treść podstrony —
  element z animowanym transformem staje się układem odniesienia dla
  `position: fixed` potomków, więc pasek i tło strony kursu były
  przypięte do treści zamiast do okna. Navbar z layoutu działał
  poprawnie (stoi poza `template`), co maskowało źródło.
  Naprawa: przejście między podstronami animuje wyłącznie `opacity`.
  Pomiar w headless Firefoxie: przed naprawą pasek po scrollu miał
  `top: -9353px`, po naprawie `top: 0` przy `scrollY: 9353`.
- Przy okazji wraca do poprawnej pracy poświata tła strony kursu
  (`TloKursu`) — również `position: fixed`.

### Dodane
- `tools/straznicy/straznik-fixed.mjs` — blokuje powrót
  `transform`/`filter`/`perspective` do klatek i reguł klasy
  opakowującej treść (strażników jest teraz 10); zweryfikowany testem
  negatywnym (po przywróceniu starego CSS zgłasza błąd i zwraca 1).
- Wpis **BLAD-003** w [rejestr/znane-bledy.json](rejestr/znane-bledy.json);
  migawka sprzed naprawy: gałąź `bak/2026-08-17-pasek-fixed-transform`
  (procedura WYTYCZNE §1).

## [0.12.0] — 2026-08-17

Trzy poprawki wg feedbacku właściciela do B5 (nagłówek pozycjonowania,
sekcja Prowadzący, sekcja Dołącz).

### Zmienione
- **Nagłówek sekcji „Pozycjonowanie" bez wyszarzenia**: pierwsza linia
  szła w `text-steel` i czytała się jak przezroczysty efekt — teraz obie
  linie pełnym kolorem (druga akcentem volt).
- **Sekcja „Prowadzący" rozbudowana** ([SekcjaAutor](components/kurs/SekcjaAutor.tsx)):
  dwukolumnowy układ — wizytówka z bio i **cytatem „dlaczego zrobiłem
  ten kurs"**, obok **czym zajmuje się na co dzień** (chipy) i atuty
  jako osobne karty z kaskadą; link do portfolio. Kontrakt `TrescAutor`
  + opcjonalne `cytat`, `czym_sie_zajmuje`, `link {url, etykieta}`.
- **Sekcja „Dołącz" mocno wyeksponowana** ([SekcjaCena](components/kurs/SekcjaCena.tsx)):
  wychodzi z rytmu strony — własne tło (grid + dwa dryfujące gradienty),
  ramka volt, nagłówek „Co dokładnie dostajesz za X zł?" z realnymi
  liczbami z bazy; lewa kolumna to **pełne punkty pakietu z opisami**,
  prawa to sticky karta oferty: badge „Pełny dostęp", cena 5–6xl, lista
  **„w cenie"**, zdanie domykające, CTA pełnej szerokości i link
  powrotny do programu; pod spodem kotwica cenowa i gwarancja obok
  siebie. Kontrakt `TrescPakiet` + opcjonalne `w_cenie`, `domkniecie`.
- **Treść obu kursów rozbudowana** (robocza, bez zmyślonych warunków):
  pakiety z konkretnymi opisami (6 pozycji na kurs), mocniejsze kotwice
  cenowe, po 6 punktów „w cenie" (dostęp od razu, materiały od
  pierwszego dnia, aktualizacje bez dopłat, dostęp bez limitu, kontakt,
  gwarancja) oraz rozbudowane wizytówki prowadzącego.

## [0.11.0] — 2026-08-17

Poprawki Course Detail System wg feedbacku właściciela do B5
(5 punktów: czcionka/typografia, FAQ, pasek menu kursu, dłuższy
program, animacje premium).

### Dodane
- **Pasek menu KURSU** ([PasekKursu](components/kurs/PasekKursu.tsx)
  przeprojektowany): na stronie kursu globalny navbar ZNIKA
  ([NavbarPrzelacznik](components/NavbarPrzelacznik.tsx)), zamiast
  niego pływająca pigułka widoczna OD WEJŚCIA — znacznik „MP"
  (powrót do katalogu), zakładki sekcji z podświetleniem aktywnej
  (IntersectionObserver) i CTA „Dołącz"; bez JS pasek stoi (to jedyna
  nawigacja strony kursu), animowany wjazd.
- **Żywe tło strony kursu** ([TloKursu](components/kurs/TloKursu.tsx)):
  poświata podążająca za kursorem (jedna pętla rAF, transform-only)
  + dwa dryfujące bloby (keyframes CSS) pod całą treścią.
- **Animacje premium** (globals.css): hover-lift kart `.unos`
  (uniesienie + glow), płynne otwieranie akordeonów
  (`interpolate-size` — progressive enhancement), micro-interaction
  CTA (uniesienie przy hover, dociśnięcie przy kliknięciu), dryf
  gradientów `.dryf-a/.dryf-b`, wjazd paska `.pasek-wjazd`; wejścia
  Reveal/Cascade (fade + slide-up ze staggerem) we WSZYSTKICH
  sekcjach strony kursu; całość wyłączana przez
  `prefers-reduced-motion`.
- **Polska odmiana liczebników** ([lib/odmiana.ts](lib/odmiana.ts)):
  „2 moduły · 4 lekcje · 48 min materiału" zamiast „2 modułów ·
  4 lekcji · 0.8 h materiału" — katalog (karty + HUD), hero kursu
  i sekcja programu.

### Zmienione
- **FAQ rozbudowane do 10 pytań-obiekcji na kurs** (wzorzec stron
  kursowych: dostęp od kiedy/na jak długo, ile czasu zajmie, „czy
  dam radę", różnica vs darmowe materiały, bezpieczeństwo danych,
  aktualizacje, gwarancja) — treść ROBOCZA, spójna z resztą oferty.
- **Program znacznie dłuższy** (treść ROBOCZA pod szczegółowe
  omówienie tematów): kurs Claude 7 modułów / 31 lekcji (~6,5 h),
  kurs GitHub 6 modułów / 26 lekcji (~5 h); pakiety i korzyści
  zaktualizowane do nowych liczb.
- Golden `d5-program.html` odtworzony (Cascade + odmiana w programie);
  `d4-katalog.html` bez zmian.

## [0.10.0] — 2026-08-17

Course Detail System wg wiążącego briefu właściciela
([docs/plugin-1/BRIEF-STRONA-KURSU.md](docs/plugin-1/BRIEF-STRONA-KURSU.md),
B5 iteracja 3): strona kursu = premium product page + sales page + mini
sklep, złożona z reusable komponentów.

### Dodane
- **Reusable Course Detail System — [components/kurs/*](components/kurs/)**
  (16 komponentów): `Wspolne` (Etykieta, CtaZakupu, szkielet sekcji),
  `HeroKursu` (badge z realnymi liczbami z bazy, obietnica, „dla kogo",
  cena, 2 CTA, OknoKursu), `PasekKursu` (sticky nawigacja po scrollu:
  kotwice + aktywna sekcja z IntersectionObservera + CTA; progressive
  enhancement — bez JS strona kompletna), `SekcjaProblem` (wstęp-empatia
  + PROBLEM → ROZWIĄZANIE → REZULTAT), `SekcjaKorzysci`, `SekcjaPakiet`
  (+ kotwica cenowa), `SekcjaProgram` (akordeon z czasem modułów),
  `SekcjaPlatforma` („tak wygląda produkt po zakupie" — OknoKursu
  z prawdziwych danych), `SekcjaPozycjonowanie` (to NIE jest / to JEST),
  `SekcjaDlaKogo`, `SekcjaTransformacja` (przed / po), `SekcjaOpinie`,
  `SekcjaAutor`, `SekcjaCena` („ZA X ZŁ OTRZYMUJESZ ✓…" + gwarancja
  przy cenie + link powrotny do programu), `SekcjaPorownanie`
  (samodzielna nauka vs kurs, nieagresywnie), `SekcjaFaq` (+ kontakt
  pod FAQ), `FinalCta`. Kolejność sekcji = psychologia scrolla briefu;
  sekcje bez treści w bazie znikają, numeracja liczy się dynamicznie.
- Kontrakty: `SzczegolyKursu` + `badge`/`level` (hero pokazuje poziom),
  `TrescHero` + opcjonalne `dla_kogo`.
- Utility `scrollbar-none` (pas kotwic sticky nav na mobile).
- Smoke D5 sprawdza dodatkowo: sekcję `problem` (kind z migracji 005
  przechodzi całą drogę baza → strona), sticky nawigację i sekcję #cena.

### Zmienione
- **[app/szkolenia/[slug]/page.tsx](app/szkolenia/[slug]/page.tsx)** —
  przebudowana na CIENKĄ kompozycję komponentów `components/kurs/*`
  (cały markup sekcji wyniesiony do komponentów).
- **Katalog: karty RÓWNE** (decyzja właściciela — bez karty wyróżnionej):
  jedna `Karta` w siatce `md:grid-cols-2`, pełny opis bez ucinania,
  CTA „Sprawdź ofertę" na każdej karcie.
- Seedy: dłuższe opisy kart „dlaczego my, a nie inni"; oba kursy mają
  komplet sekcji CDS (problem/positioning/transformation/comparison,
  kurs GitHub dodatkowo for_whom/package/author/opinions/guarantee/faq)
  — treść ROBOCZA, bez zmyślonych danych (opinie = jawny placeholder).
- Goldeny odtworzone po zmianie markupu: `d3-odczyt.json` (badge/level
  w szczegółach), `d4-katalog.html` (karta równa), `d5-program.html`
  (program w szkielecie sekcji CDS).

## [0.9.0] — 2026-08-17

Redesign premium podstrony szkoleń wg briefu właściciela (B5, iteracja 2):
„digital product experience", nie podstrona informacyjna.

### Zmienione
- **Katalog [/szkolenia](app/szkolenia/widok.tsx) przeprojektowany od zera**:
  - hero z dwukolumnowym układem: mocny headline („Szkolenia, które
    zamieniają AI w przewagę."), dwa CTA (Poznaj szkolenia / Zobacz,
    co dostajesz) i HUD z PRAWDZIWYMI liczbami z bazy (produkty,
    moduły, lekcje, godziny);
  - **wizual produktu zamiast pustki**: mockup okna kursu zbudowany
    z realnych danych ([OknoKursu](components/szkolenia/OknoKursu.tsx)
    — sidebar modułów, lekcje, paski postępu) + floating cards
    (prompt z biblioteki, gwarancja 30 dni);
  - **interaktywność** ([HeroMotion](components/szkolenia/HeroMotion.tsx)):
    światło spotlight za kursorem, parallax 3 warstw, floaty — jedna
    pętla rAF, transform-only, `prefers-reduced-motion` wyłącza całość,
    bez JS treść kompletna;
  - pas tematów marquee (wzorzec strony głównej);
  - sekcja **„Nie kupujesz kolejnego kursu. Dostajesz gotowy system
    pracy."** — sticky statement + mockup i 6 warstw systemu
    (01 Wiedza → 06 Materiały) wjeżdżających kaskadą;
  - **katalog premium**: karta wyróżniona (najnowszy produkt na całą
    szerokość) + siatka; karty z okładką (hover-zoom), numerem /01,
    badge z bazy, typem, metadanymi z bazy (moduły · lekcje · godziny ·
    poziom), ceną i CTA.
- **Strona kursu**: nowe sekcje **„Pakiet"** (co dokładnie dostajesz +
  kotwica cenowa) i **„Prowadzący"**; „Dla kogo" dostała uczciwą kolumnę
  „a NIE jest, jeśli…"; numeracja sekcji liczona dynamicznie.

### Dodane
- Migracje: `003-rodzaje-sekcji` (kinds `package`, `author`),
  `004-karta-katalogu` (kolumny `badge`, `level`); dyspozytor i kreator
  zapisują nowe pola; kanał JSON `listaKursow` zwraca statystyki liczone
  w bazie (moduły/lekcje/czas).
- Okładki SVG w języku Volt ([public/okladki/](public/okladki/)) —
  robocze, do podmiany kreatorem w D6.
- Kontrakty Zod: `KartaKatalogu`, `TrescPakiet`, `TrescAutor`,
  `nie_dla` w `TrescDlaKogo`.
- Goldeny odtworzone świadomie: schemat d2 (nowe kolumny), karta
  katalogu d4 (nowa karta), program d5 (dynamiczna numeracja).

## [0.8.1] — 2026-08-17

Naprawy z pierwszej oceny B5 (procedura WYTYCZNE §1: migawka
`bak/2026-08-17-hydratacja-fontow` → branch fix → rejestr → strażnik).

### Naprawione
- **BLAD-001 — błąd hydratacji na każdej stronie**: pakiet `geist`
  generował różne klasy CSS fontów na serwerze i kliencie. Fonty idą
  teraz z lokalnych subsetów woff2 przez `next/font/local`
  ([lib/fonts.ts](lib/fonts.ts) + [public/fonts/](public/fonts/)) —
  wzorzec 1:1 ze strony głównej; pakiet `geist` usunięty. Nawrotów
  pilnuje nowy **straznik-fontow** (zakaz importu `geist` i zależności
  w package.json).
- **BLAD-002 — testy kasowały dane dev**: `npm test` robił
  `DROP SCHEMA` na wspólnej bazie `db1_kursy` — po testach katalog
  świecił pustką, a strony kursów dawały 404. Testy przełączają się
  teraz na osobną bazę `db1_kursy_test`
  ([modules/m1-sklep/db/testowa-baza.ts](modules/m1-sklep/db/testowa-baza.ts))
  z bezpiecznikiem: operacje niszczące wyłącznie na bazie `*_test`.
- Oba błędy w [rejestr/znane-bledy.json](rejestr/znane-bledy.json)
  (klasa/dowód/skutek/naprawa/strażnik).

## [0.8.0] — 2026-08-17

Dział 5 Pluginu 1 — strona sprzedażowa `/szkolenia/[slug]`
(bramka B5: golden HTML + smoke; czeka na ocenę właściciela; po
akceptacji 🏷 release).

### Dodane
- **Strona sprzedażowa** ([app/szkolenia/[slug]/page.tsx](app/szkolenia/[slug]/page.tsx))
  w pełni z bazy (kanał JSON `szczegolyKursu`): hero z obietnicą
  (sekcja `hero`) + cena i CTA od pierwszego ekranu → korzyści →
  **program z akordeonem modułów i lekcji** (czas trwania, badge
  „podgląd"; `<details>` — zero JS) → dla kogo → opinie → cena+CTA →
  gwarancja → FAQ → domykające CTA. Sekcje o złym/nieobecnym `content`
  są pomijane (safeParse), nie wysadzają strony; nieistniejący slug → 404.
  CTA zakupu = placeholder do Pluginu 2 (prowadzi do kontaktu);
  napis w 1. osobie („Dołączam…") wg analizy wzoru.
- **Kontrakty treści sekcji** (Zod, [modules/m1-sklep/typy.ts](modules/m1-sklep/typy.ts)):
  TrescHero/Korzysci/DlaKogo/Opinie/Gwarancja/Faq — kreator (D6)
  dostanie gotowe schematy.
- **Analiza wzoru sprzedażowego**
  [docs/plugin-1/WZOR-STRONA-SPRZEDAZOWA.md](docs/plugin-1/WZOR-STRONA-SPRZEDAZOWA.md)
  (claudedlafirm.pl — inspiracja, nie kopia): checklista wzorców
  perswazji dla treści kursów w D7.
- **Smoke test D5** ([tools/smoke/smoke-d5.ts](tools/smoke/smoke-d5.ts)):
  pełny kurs seedem → produkcyjny serwer → hero/korzyści/program/cena/
  FAQ obecne, 404 dla śmieci, **golden sekcji programu**
  [goldeny/d5-program.html](goldeny/d5-program.html); podpięty w CI.
- **Seed przykładów** ([tools/seed/seed-przyklady.ts](tools/seed/seed-przyklady.ts),
  `npm run db1:seed`): dwa docelowe kursy właściciela (decyzja
  2026-08-17) z treścią ROBOCZĄ do oceny wyglądu — „Jak poprawnie
  korzystać z Claude" (pełne sekcje) i „Jak poprawnie używać GitHuba";
  opinie to jawne placeholdery (bez zmyślonych recenzji). Finalna
  treść powstanie kreatorem w D7 (+ dokumentacja Claude i GitHuba).

### Zmienione
- `zamknijDb1` w publicznym API modułu (skrypty smoke/seed nie sięgają
  już do wnętrza modułu — wymusił straznik-granic).
- Golden katalogu (smoke D4) zawężony do karty kursu smoke — cała
  siatka pękała, gdy lokalna baza miała seedy przykładów.

## [0.7.0] — 2026-08-17

Dział 4 Pluginu 1 — katalog `/szkolenia` renderowany Z BAZY
(bramka B4: golden HTML + smoke test na produkcyjnym serwerze;
czeka na ocenę właściciela na localhost:3001).

### Zmienione
- [/szkolenia](app/szkolenia/widok.tsx): siatka kart czyta kursy z bazy
  kanałem JSON działu (`listaKursow()`, tylko opublikowane) — koniec
  placeholderów; karta: okładka (lub siatka „blueprint"), badge typu,
  cena z `Intl` (PLN), opis, CTA „Sprawdź ofertę" → `/szkolenia/[slug]`;
  pusty stan „Katalog w przygotowaniu"; strona dynamiczna
  (`force-dynamic` — bez zapiekania listy w buildzie).

### Dodane
- [app/not-found.tsx](app/not-found.tsx) — 404 w języku Volt
  (nieistniejące kursy wracają do katalogu).
- **Smoke test D4** ([tools/smoke/smoke-d4.ts](tools/smoke/smoke-d4.ts)):
  seed przez dyspozytor → produkcyjny `next start` → katalog zawiera
  kurs, cenę i link → **golden markupu siatki**
  [goldeny/d4-katalog.html](goldeny/d4-katalog.html) → sprzątanie.
  Podpięty w CI (job „baza": build + smoke).
- Dokumentacja techniczna D4 (WYTYCZNE N2) w
  [docs/dokumentacja-techniczna/d4/](docs/dokumentacja-techniczna/d4/):
  pobieranie danych, cache/rewalidacja, tryby renderowania, not-found,
  next/image + ZRODLA.md.

## [0.6.0] — 2026-08-17

Dział 3 Pluginu 1 — dyspozytor (bramka B3: testy zielone, goldeny JSON,
straznik-ajax potwierdza jeden kanał, audyt CRUD w changelogu).

### Dodane
- **Kanał JSON** (odczyt serwerowy — [modules/m1-sklep/odczyt.ts](modules/m1-sklep/odczyt.ts)):
  `listaKursow` (katalog, tylko opublikowane), `szczegolyKursu`
  (pełny kurs z sekcjami/modułami/lekcjami), `listaKursowKreatora`;
  wyjście walidowane Zod-em.
- **Dyspozytor — JEDEN AJAX** ([modules/m1-sklep/dyspozytor.ts](modules/m1-sklep/dyspozytor.ts)):
  akcje `zapisz` (insert/edycja + pełna podmiana sekcji i modułów),
  `usun`, `publikuj` — każda w osobnej transakcji z aktorem audytu
  (`app.actor`); usuwanie jawnie od dołu, żeby każdy wpis changelogu
  znał kurs; walidacja Zod na wejściu (czytelne błędy: `walidacja`,
  `brak-dostepu`, `nie-znaleziono`, `duplikat`); dostęp tymczasowo
  tokenem `KREATOR_TOKEN` (pełny auth da Plugin 3).
- **Endpoint HTTP** [app/api/szkolenia/route.serwer.ts](app/api/szkolenia/route.serwer.ts) —
  jedyny AJAX pluginu (POST), cienka warstwa nad dyspozytorem, bez SQL.
- **Kontrakty Zod** ([modules/m1-sklep/typy.ts](modules/m1-sklep/typy.ts)):
  karty/szczegóły kursu, akcje jako `discriminatedUnion`, typy TS
  wyprowadzane ze schematów.
- **straznik-ajax** — w app/api może istnieć tylko jeden endpoint na
  moduł i żaden endpoint-sierota (WYTYCZNE §8).
- **Testy B3** ([modules/m1-sklep/dyspozytor.test.ts](modules/m1-sklep/dyspozytor.test.ts),
  razem 15/15): walidacja, token, zapis z audytem wszystkich tabel,
  duplikat sluga, publikacja, edycja z podmianą modułów, usuwanie +
  **golden odpowiedzi JSON** [goldeny/d3-odczyt.json](goldeny/d3-odczyt.json);
  testy biegną sekwencyjnie (`--test-concurrency=1`, wspólna baza).
- Dokumentacja techniczna D3 (WYTYCZNE N2) w
  [docs/dokumentacja-techniczna/d3/](docs/dokumentacja-techniczna/d3/):
  Next.js Route Handlers (reference + guide), Zod 4 (podstawy, API,
  błędy) + ZRODLA.md.
- `.env.example`: `KREATOR_TOKEN` (sekret lokalnie w `.env`).

## [0.5.0] — 2026-08-17

Dział 2 Pluginu 1 — baza `db1_kursy` (bramka B2: testy dowodzą, że
migracje wstają od zera i triggery logują każdą operację; golden schematu).

### Dodane
- **Baza db1_kursy w kontenerze** ([docker-compose.yml](docker-compose.yml),
  postgres:17-alpine; lokalnym silnikiem jest podman — `npm run db1:up`);
  [.env.example](.env.example) z `DB1_URL` (sekrety tylko w ignorowanym `.env`).
- **Migracje czystym SQL** ([modules/m1-sklep/db/migrations/](modules/m1-sklep/db/migrations/)):
  `001-tabele.sql` — courses, course_sections, course_modules,
  course_lessons, course_changelog (wg ERD z DIAGRAMU) + indeksy;
  `002-triggery-audytu.sql` — wspólna funkcja `m1_audyt()` na WSZYSTKICH
  czterech tabelach treści (create/update/delete → stan przed/po w JSONB,
  aktor z `app.actor`), auto-`updated_at`, changelog niezmienny
  (UPDATE/DELETE/TRUNCATE odrzucane triggerem).
- **Runner migracji** ([modules/m1-sklep/db/migruj.ts](modules/m1-sklep/db/migruj.ts)):
  transakcje per migracja, sha256 w tabeli `_migracje` — zmieniona po
  fakcie migracja zatrzymuje przebieg. Klient puli pg tylko w module
  ([modules/m1-sklep/db/klient.ts](modules/m1-sklep/db/klient.ts)).
- **Testy B2** ([modules/m1-sklep/db/migracje.test.ts](modules/m1-sklep/db/migracje.test.ts),
  `npm test`, node --test): od zera, idempotencja, audyt wszystkich tabel
  (lekcje dostają course_id z lookupu), niezmienność changelogu oraz
  **golden schematu** [goldeny/d2-schemat.json](goldeny/d2-schemat.json)
  (odtworzenie po świadomej zmianie: `GOLDEN_ZAPISZ=1 npm test`).
- **straznik-migracji** — numeracja NNN bez dziur, MANIFEST.json z sha256:
  migracja zmieniona po fakcie nie przejdzie pre-commita ani CI.
- CI: job „Baza db1_kursy" z usługą postgres — `npm test` na każdym PR.
- Dokumentacja techniczna D2 (WYTYCZNE N2) w
  [docs/dokumentacja-techniczna/d2/](docs/dokumentacja-techniczna/d2/):
  CREATE TRIGGER, plpgsql (NEW/OLD/TG_OP), JSONB, CREATE FUNCTION,
  node-postgres (Pool, zapytania parametryzowane), obraz Dockera postgres
  + ZRODLA.md (PostgreSQL 18, pg 8.23).

## [0.4.0] — 2026-08-17

Dział 1 Pluginu 1 — fundament aplikacji (do bramki B1: ocena właściciela
na localhost:3001).

### Dodane
- Szkielet aplikacji **Next.js 16.3.1 + React 19 + TypeScript (strict) +
  Tailwind 4** z serwerem, dev/start na porcie **3001**; wersje i konfiguracja
  zgodne ze stroną główną (tsconfig, ESLint flat config, postcss).
- Design system „Volt" przejęty ze strony głównej ([app/globals.css](app/globals.css)):
  tokeny `@theme` (void/panel/fg/steel/volt/line, fonty Geist, skala typo),
  utilities `container-site`/`bg-grid`/`panel`/maski, efekty CTA.
- Strona [/szkolenia](app/szkolenia/widok.tsx): hero wg wzorca PageHero,
  siatka kart-placeholderów (prawdziwe kursy z bazy od Działu 4), pasek CTA;
  korzeń `/` przekierowuje na `/szkolenia`. Nagłówek wg strony głównej;
  **stopka przejęta 1:1** (uwaga właściciela przy B1): HUD statusu,
  statement, SVG wordmark na szynie zasilającej z impulsem, scena canvas
  „pył danych" (FooterScene), animacje wejść Reveal z wyłącznikiem
  bezpieczeństwa `html.js` i przejścia stron (template.tsx).
- Stub publicznego API modułu ([modules/m1-sklep/index.ts](modules/m1-sklep/index.ts))
  — jedyna przyszła warstwa z dostępem do bazy.
- **straznik-granic** — klient SQL i connection stringi tylko w `modules/`,
  zakaz importów między modułami i importów z bebechów modułu spoza niego
  (BAZA → DZIAŁ → STRONA, WYTYCZNE §8).
- **straznik-ci** — gdy istnieje package.json, CI musi uruchamiać
  npm ci → lint → tsc → build (test dojdzie od Działu 2).
- CI: job „Kod aplikacji" (lint → tsc → build) w [ci.yml](.github/workflows/ci.yml).
- Dokumentacja techniczna D1 (WYTYCZNE N2) pobrana z sieci do
  [docs/dokumentacja-techniczna/d1/](docs/dokumentacja-techniczna/d1/):
  Next.js 16.3.1 (instalacja, layouty, struktura, CSS, fonty) + Tailwind 4.3
  (instalacja w Next.js, `@theme`) + ZRODLA.md (URL, data, wersja).

## [0.3.4] — 2026-08-17

### Dodane
- [CLAUDE.md](CLAUDE.md) — strażnik ciągłości kontekstu: auto-ładowany
  w każdej sesji, wskazuje dokumenty źródłowe, twarde zasady i NASTĘPNY
  KROK; aktualizowany przy każdym kroku zmieniającym stan projektu.
  Uzupełnia goldena przed-clear (pamięć Claude): przed każdym /clear
  sweep rozmowy — decyzje na nośnik trwały, zero strat.

## [0.3.3] — 2026-08-16

### Zmienione
- WYTYCZNE §8 doprecyzowane przez właściciela: AJAX nie musi być jedynym
  kanałem do bazy — obok idzie **kanał JSON** (odczyt serwerowy przy
  renderowaniu: szybciej + SEO). AJAX zostaje JEDEN i obsługuje akcje
  po załadowaniu strony (kreator). Diagram przepływu zaktualizowany.

## [0.3.2] — 2026-08-16

### Dodane
- **WYTYCZNE §8 „Wystrzał"** (nowa wytyczna właściciela): z jednej bazy
  danych idzie tylko JEDEN kanał AJAX — jeden plugin = jeden AJAX;
  dział-dyspozytor jako jedyny rozmawia z bazą i rozdziela JSON stronom.
  Pilnować będzie `straznik-ajax`.

### Zmienione
- Diagram przepływu Pluginu 1: trzy tory zastąpione JEDNYM wystrzałem
  BAZA —AJAX→ DZIAŁ-DYSPOZYTOR —JSON→ 3 strony; Dział 3 to teraz
  dyspozytor (akcje: lista/szczegoly/zapisz/usun/publikuj).

## [0.3.1] — 2026-08-16

### Zmienione
- Diagram przepływu danych Pluginu 1 przerysowany po uwadze właściciela:
  **każdy dział ma własny tor** BAZA —AJAX→ DZIAŁ —JSON→ STRONA i nie
  dotyka torów innych działów; nie istnieje wspólny kanał z bazy do
  wszystkich działów.

## [0.3.0] — 2026-08-16

Diagram Pluginu 1 do oceny właściciela.

### Dodane
- [docs/plugin-1/DIAGRAM.md](docs/plugin-1/DIAGRAM.md) — podział Pluginu 1
  na 7 działów z bramkami jakości B1–B7 po każdym dziale, diagram przepływu
  danych wg zasady **BAZA → DZIAŁ → STRONA** (konwencja
  z mp-offer-automation-suite), schemat ERD bazy `db1_kursy` z changelogiem
  pisanym triggerami, plan dokumentacji technicznej per dział (WYTYCZNE N2)
  i plan nowych strażników (granic, migracji, CI).
- Ustalenie: agenci AI tylko jako bramki jakości (przegląd agent+krytyk
  w B7), codzienna kontrola należy do skryptów — strażników, testów, goldenów.
- Localhost do oceny wyglądu: strona główna z klonu na porcie 3000,
  Plugin 1 będzie na 3001.

## [0.2.0] — 2026-08-16

Wytyczne właściciela + licencja. Nadal bez kodu aplikacji.

### Dodane
- [docs/WYTYCZNE.md](docs/WYTYCZNE.md) — wiążące wytyczne projektu:
  procedura naprawy wstecznej `.bak`, pilnowanie statusów GitHuba,
  goldeny (dla agentów i regresji napraw), weryfikacja co krok,
  pobierana dokumentacja techniczna; zasady nadrzędne: każdy agent
  ma krytyka, każdy dział dostaje oryginalną dokumentację z sieci.
- Licencja **GPL-2.0** ([LICENSE](LICENSE)) + deklaracja w README.
- [rejestr/znane-bledy.json](rejestr/znane-bledy.json) — rejestr realnych
  błędów projektu (schemat klasa/dowód/skutek/test z projektu egzaminacyjnego).
- `straznik-licencji` — LICENSE = GPL v2 i deklaracja w README, na stałe.
- `.gitignore`: pliki `*.bak` nie wchodzą do repo (migawką jest gałąź `bak/…`).

## [0.1.0] — 2026-08-16

Fundament repozytorium — jeszcze bez kodu aplikacji.

### Dodane
- Plan całego projektu ([docs/PLAN.md](docs/PLAN.md)): 3 moduły („pluginy"),
  3 bazy PostgreSQL, decyzje architektoniczne, workflow branchy.
- Workflow Weryfikacja-PR: branch → commit → CI → merge → release
  ([CONTRIBUTING.md](CONTRIBUTING.md)).
- CI (GitHub Actions): strażnicy + skan sekretów gitleaks (binarka przypięta
  po SHA-256).
- Strażnicy (`tools/straznicy/`) z automatycznym podpięciem — runner sam
  znajduje pliki `straznik-*.mjs`:
  - `straznik-wersji` — README deklaruje wersję zgodną z CHANGELOG,
  - `straznik-linkow` — względne linki w Markdown prowadzą do istniejących plików.
- Haki gita (`.githooks/`): pre-commit (blokada sekretów i `.env` + strażnicy),
  pre-push (blokada bezpośredniego pusha na `main`).
- Branch `plugin-1-sklep-kursow` pod przyszłe prace nad modułem 1.
