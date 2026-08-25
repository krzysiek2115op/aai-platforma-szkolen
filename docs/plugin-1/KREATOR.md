# Kreator kursów — instrukcja obsługi

Panel treści Pluginu 1. Wszystko, co widać na `/szkolenia` i na stronach
kursów, pochodzi stąd — strona nie ma ani jednego tekstu wpisanego
na sztywno w kodzie.

> [!IMPORTANT]
> **Kreatory są dwa i to jest stan docelowy na czas etapu WordPressa.**
> Poniżej opisany jest kreator PROTOTYPU (Next.js, `:3001`) — on zostaje
> jako specyfikacja wykonawcza i jako narzędzie do treści w Postgresie.
> **Kreator, którym pracuje się na produkcji, mieszka w kokpicie
> WordPressa** — patrz [sekcja na końcu](#kreator-w-kokpicie-wordpressa-krok-w4).
> Oba zapisują do INNYCH baz: prototyp do Postgresa, wtyczka do tabel
> `wp_aai_sklep_*`. Drogę z jednej do drugiej robi `npm run wp:import`
> (jednokierunkowo, idempotentnie).

## Wejście

- adres: `http://localhost:3001/szkolenia/kreator`
- albo pigułka **„Kreator kursów ADMIN"** w prawym dolnym rogu
  `/szkolenia` (widoczna dopiero po zalogowaniu; gość nie ma jej nawet
  w źródle strony)
- token: `KREATOR_TOKEN` z pliku `.env`, ważny 8 godzin

Token nie jest zapisany w JavaScripcie strony — siedzi w ciastku
HttpOnly. Po zmianie tokenu w `.env` trzeba **zrestartować serwer**
(`npm run dev`), bo zmienne środowiskowe czyta się przy starcie.

Pełne logowanie (użytkownicy, hasła, role) da Plugin 3 — token to
rozwiązanie na czas budowy.

## Stany kursu

| Stan | Kto widzi | Jak to zmienić |
|---|---|---|
| **Szkic** | tylko Ty (podgląd) | nowy kurs zaczyna tutaj |
| **Opublikowany** | wszyscy, jest w katalogu | przycisk „Opublikuj" |
| **Ukryty** | tylko Ty | przycisk „Ukryj" |

Adres kursu w stanie szkic/ukryty oddaje gościowi **404** — nie ma
mowy o przypadkowym wycieku niedokończonej treści.

## Praca nad kursem

1. **Nowy kurs** → dane podstawowe. Adres (slug) podpowiada się
   z tytułu, ale tylko dla nowego kursu — przy edycji zostaje ten sam,
   żeby nie zmienić adresu opublikowanej strony pod nogami.
2. **Sekcje strony** — dwanaście rodzajów, w kolejności, w jakiej
   zobaczy je kupujący. Każda ma stan:
   - zielone **„gotowa"** — komplet pól obowiązkowych,
   - pomarańczowe **„brakuje: …"** — czego jeszcze potrzeba.
   Sekcja, której nie dodasz, po prostu nie pojawia się na stronie.
   Pole opcjonalne zostawione puste też nie trafia do bazy — strona
   nie rysuje pustych akapitów.
3. **Program** — moduły i lekcje. To spis treści realnego materiału:
   z niego strona liczy statystyki katalogu (moduły, lekcje, czas).
   Kolejność ustawiasz strzałkami; numeracja liczy się sama.
4. **Zapisz kurs** — zapis obejmuje wszystkie trzy zakładki naraz.
5. **Treść lekcji** — osobny ekran, opisany niżej.
6. **Podgląd strony kursu** — zobacz efekt przed publikacją.
7. **Opublikuj**, gdy strona wygląda tak, jak ma wyglądać.

## Pisanie lekcji (materiał kursu)

Program to spis treści; **treść lekcji to sam kurs** — to, co kupujący
czyta po zalogowaniu. Pisze się ją osobno, lekcja po lekcji.

1. Wejdź w kurs → zakładka **Program**.
2. Przy lekcji kliknij **Treść**. Przycisk pojawia się dopiero, gdy
   lekcja **jest zapisana** — do pisania potrzebny jest jej
   identyfikator z bazy. Świeżo dodana lekcja ma w tym miejscu napis
   „zapisz kurs".
3. Pisz w **Markdownie** — dokładnie tym samym, w którym leżą
   scenariusze w `tresc-kursow/`. Nic nie trzeba konwertować.
4. **Materiały dodatkowe** (PDF, ściągawka, odsyłacz) to adres pliku
   w `public/` albo pełny link — jak okładka kursu. Maksymalnie 12 na
   lekcję.
5. **Zapisz lekcję**. Zapis dotyczy WYŁĄCZNIE tej lekcji: program
   kursu i strona sprzedażowa zostają nietknięte.

Postęp widać w dwóch miejscach bez wchodzenia w lekcje: na liście
kursów (**Treść lekcji 12/41**) i w zakładce Program (**Z treścią**).

### Czego ten ekran NIE robi

- **Nie renderuje Markdowna.** Przycisk „Podgląd" pokazuje tekst
  z zachowanymi łamaniami i mówi o tym wprost. Prawdziwy skład przyjdzie
  z platformą kursu; udawanie go tutaj kłamałoby o wyglądzie gotowej
  lekcji.
- **Nie przyjmuje wideo.** Kurs jest tekstowy (decyzja właściciela
  z 2026-08-19) — nie ma pól na hosting, długość filmu ani napisy.
- **Nie zapisuje sam.** Wyjście ze strony z niezapisaną lekcją
  przeglądarka zatrzyma pytaniem — ale zapisuje się przyciskiem.

### Gdzie ta treść trafia, a gdzie NIE

Materiał lekcji jest towarem: kupujący płaci za dostęp do niego.
Dlatego katalog `/szkolenia` i strona sprzedażowa `/szkolenia/[slug]`
dostają z bazy **samą informację, że lekcja ma treść** — nigdy tekstu.
Pełny materiał czyta wyłącznie ten ekran, za bramą tokenu. Pilnują tego
`straznik-tresci-lekcji` (kontrakt i zapytanie) oraz `tools/smoke/smoke-lekcje.ts`
(sprawdza po HTTP, że treści nie ma w publicznych stronach).

## Czego kreator NIE zrobi za Ciebie

- **Kolejność sekcji na stronie jest stała** — wynika z układu strony
  sprzedażowej (psychologia scrolla z briefu D5), a nie z kreatora.
- **Okładka to adres pliku** (np. `/okladki/claude.png` z katalogu
  `public/`), nie wgrywanie pliku — decyzja właściciela z 2026-08-17.
  Upload wróci przy Pluginie 2/3, razem z prawdziwym miejscem na pliki.
- **Cena jest w złotówkach**, ale baza trzyma grosze — bez błędów
  zaokrągleń na kwotach.

## Co się dzieje pod spodem

- Panel **czyta** bazę przy renderowaniu strony (kanał JSON działu),
  a **zmienia** ją wyłącznie jednym wystrzałem AJAX
  (`app/api/szkolenia`) — WYTYCZNE §8: jedna baza = jeden AJAX.
- Każda operacja (zapis, publikacja, usunięcie) zostawia ślad
  w `course_changelog` — razem ze stanem sprzed zmiany. To znaczy, że
  usunięty kurs da się odtworzyć z dziennika.
- Zestaw pól w panelu jest pilnowany przez `straznik-kreatora`: pole,
  które strona potrafi wyrenderować, MUSI mieć swoje miejsce
  w kreatorze — inaczej CI staje.

## Gdy coś nie działa

| Objaw | Przyczyna | Co zrobić |
|---|---|---|
| „Nieprawidłowy token" mimo dobrego tokenu | serwer wystartował na starym `.env` | zrestartuj `npm run dev` |
| „Ten adres (slug) jest już zajęty" | inny kurs ma ten sam adres | zmień slug |
| „Sesja kreatora wygasła" | minęło 8 godzin | zaloguj się ponownie |
| Sekcja nie pojawia się na stronie | brak pola obowiązkowego | wejdź w sekcję, uzupełnij „brakuje: …" |
| Przy lekcji nie ma przycisku „Treść" | lekcja jeszcze nie jest w bazie | zapisz kurs i wróć do zakładki Program |
| „Formularz ma błędy" przy zapisie lekcji | zaczęty materiał bez tytułu lub adresu | uzupełnij materiał albo usuń go koszem |


---

# Kreator w kokpicie WordPressa (krok W4)

To jest kreator DOCELOWY. Robi to samo, co panel prototypu, w tym samym
porządku i tymi samymi słowami — różnice biorą się z tego, że WordPress ma
konta, media i własne bramki, więc nie udajemy, że ich nie ma.

## Wejście

- **Kokpit → Automatic AI → Kursy** (`/wp-admin/admin.php?page=aai-sklep`)
- albo z frontu: **pasek administracyjny → „Edytuj kurs"** na stronie kursu
  (gość nie ma tej pozycji nawet w źródle — dla niego pasek się nie renderuje)
- uprawnienie: **`manage_options`** (to samo, którym widzi się szkice)

**Nie ma tokenu.** `KREATOR_TOKEN` był rozwiązaniem na czas budowy prototypu,
bo tamten nie miał kont. Tutaj kontami zajmuje się WordPress, a każdą wysyłkę
pilnują dwie bramki naraz: **nonce** („ta osoba naprawdę o to poprosiła")
i **uprawnienie** („ta osoba może"). Jedno bez drugiego nie wystarcza.

## Trzy ekrany

| Ekran | Co robi |
|---|---|
| **Kursy** | lista wszystkich kursów ze stanem, ceną i licznikami: sekcje `12/12`, program, **treść lekcji `41/41`**. Stąd publikujesz, ukrywasz i usuwasz |
| **Edytor kursu** | trzy zakładki — **Kurs / Sekcje strony / Program** — i JEDEN przycisk „Zapisz kurs". Przełączanie zakładek nie przeładowuje strony, więc niezapisane zmiany przeżywają zmianę widoku |
| **Treść lekcji** | osobny ekran, wchodzi się w niego przyciskiem **Treść** przy lekcji w zakładce Program |

## Czym różni się od prototypu

- **Okładka z biblioteki mediów.** Przycisk „Wybierz z biblioteki mediów"
  otwiera zwykłą bibliotekę WordPressa; do bazy trafia adres wybranego pliku,
  czyli dokładnie to samo, co dawniej wklejało się ręcznie. Decyzja właściciela
  z 2026-08-25 — prototyp odrzucił wgrywanie tylko dlatego, że nie miał gdzie
  trzymać plików.
- **Stan kursu zmienia się na LIŚCIE**, nie w formularzu. Publikacja nie jest
  edycją treści: klika się ją, nie mając otwartego kursu, a zapis niosący
  komplet sekcji po to, żeby zmienić jedno słowo, to proszenie się o utratę
  tego, czego akurat nie wczytano.
- **Po zapisie strona się przeładowuje** (przekierowanie). Bez tego odświeżenie
  przeglądarki powtarzałoby zapis — a zapis kursu jest PEŁNĄ PODMIANĄ programu.
- **Odrzucony formularz wraca taki, jaki był**, razem z tym, czego baza nie
  przyjęła. Błędy są wypisane u góry ze ścieżką do pola, a zakładka z błędem
  dostaje czerwony znacznik z ich liczbą.
- **Nie ma typu „ebook".** Właściciel zamknął ten temat 2026-08-25 słowem
  „na zawsze": produktem jest wyłącznie kurs tekstowy za logowaniem.

## Co się dzieje po zapisie — kopia w Tutorze

**Zapis w kreatorze dojeżdża do Tutor LMS sam.** Po KAŻDYM udanym zapisie —
nie tylko przy publikacji — wtyczka odświeża kopię kursu we wpisach Tutora:
kurs, moduły i lekcje. Nie trzeba niczego klikać ani uruchamiać.

Dlaczego to w ogóle istnieje: **źródłem prawdy o kursie są NASZE tabele**,
a Tutor daje konta, zapisy na kurs i dostęp za logowaniem. Klient czyta lekcję
w naszym szablonie i wprost z naszych tabel, ale to Tutor odpowiada na pytanie
„czy ta osoba kupiła" i to on nadaje lekcjom adresy. Obie kopie muszą więc być
zgodne — a przed 0.43.0 nie były: poprawka w kreatorze rozjeżdżała je po cichu,
właściciel widział nową wersję w panelu, a klient po zalogowaniu czytał starą.

Co z tego wynika przy pracy:

- **Poprawka treści lekcji jest widoczna od razu** — materiał klient czyta
  z naszych tabel, nie z kopii.
- **Nowa lekcja, nowy tytuł i zmiana kolejności też jadą od razu**: po zapisie
  kopia ma nowy układ, więc lekcja dostaje adres i wchodzi do nawigacji.
- **Kopia jedzie w JEDNĄ stronę.** Zmiana zrobiona w Course Builderze Tutora
  nie wraca do nas i zniknie przy najbliższym zapisie z kreatora. Kursów nie
  edytuje się w Tutorze — od tego jest ten kreator.
- **Awaria kopii NIE cofa Twojego zapisu.** Gdyby Tutor był wyłączony albo
  zwrócił błąd, zmiana i tak zostaje zapisana — wyłączona cudza wtyczka nie ma
  prawa blokować edycji własnej treści. Ceną jest to, że nieudana kopia byłaby
  niewidoczna, więc kokpit pokazuje wtedy ostrzeżenie **„Kopia kursu w Tutor LMS
  nie nadążyła za ostatnim zapisem"** i trzyma je, dopóki kolejna kopia się nie
  uda.
- **Naprawa: `wp aai-sklep sync`** (albo `npm run wp:sync`) — zapisanie kursu
  jeszcze raz robi dokładnie to samo.
- **Rozjazd sprawdzisz w każdej chwili: `wp aai-sklep sprawdz-tutora`**
  (`npm run wp:tutor`). Porównuje obie kopie pole po polu i kończy się **kodem
  wyjścia 1**, gdy się rozjechały; nazywa po imieniu trzy klasy rozjazdu —
  różnicę pola, sierotę po skasowanym obiekcie i wpis zrobiony poza kreatorem.
- **Cena w kopii Tutora zostaje `Free`.** Sprzedaż wchodzi z Pluginem 2
  (WooCommerce), nie tutaj.

## Czego ten kreator NIE zrobi za Ciebie

Wszystko z sekcji prototypu obowiązuje bez zmian — kolejność sekcji wynika
z układu strony sprzedażowej, cena jest w złotówkach (baza trzyma grosze),
a materiał lekcji nie pojawia się na stronie sprzedażowej ani w katalogu.
Do tego:

- **Zapis programu nie tyka napisanej treści.** Panel wysyła sam spis treści
  (tytuły, kolejność, czasy), a warstwa zapisu rozpoznaje brak tych kolumn
  jako „nie ruszaj". Jeśli mimo to zapis miałby skasować lekcje **z treścią**,
  dostajesz odmowę z LICZBĄ tych lekcji i osobny przycisk „Zapisz mimo to
  i skasuj tę treść".
- **Usunięcie kursu z treścią wymaga potwierdzenia.** Bez niego warstwa zapisu
  odmawia — także wtedy, gdy w przeglądarce nie działa JavaScript.

## Gdy coś nie działa

| Objaw | Przyczyna | Co zrobić |
|---|---|---|
| „Ten adres (slug) jest już zajęty przez inny kurs" | dwa kursy pod tym samym adresem | zmień slug |
| „Ten zapis skasowałby napisaną treść N lekcji" | z programu wypadła lekcja, która ma materiał | dodaj ją z powrotem albo potwierdź przyciskiem obok „Zapisz kurs" |
| Przy lekcji nie ma przycisku „Treść" | lekcja jeszcze nie jest w bazie | zapisz kurs i wróć do zakładki Program |
| Sekcja jest w panelu, ale nie widać jej na stronie | brak pola obowiązkowego (plakietka „brakuje: …") | uzupełnij wskazane pola |
| Strona zapisu oddaje 403 | wygasł nonce (formularz otwarty od wielu godzin) | odśwież stronę edytora i zapisz jeszcze raz |

## Dowody

`npm run smoke:wp-kreator` — 95 sprawdzeń na żywej instalacji: bramki
dostępu, runda „zapisz → odczytaj" dla wszystkich 12 rodzajów sekcji
(z treścią generowaną z opisu pól, więc nowe pole samo wchodzi do próby),
zapis programu nietykający prozy 73 lekcji, odmowa skasowania treści bez
zgody i brak wycieku materiału na publiczne strony.
Kod pilnuje `straznik-kreatora-wp` (32. strażnik, 11 mutacji w audycie).
