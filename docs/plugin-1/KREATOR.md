# Kreator kursów — instrukcja obsługi

Panel treści Pluginu 1. Wszystko, co widać na `/szkolenia` i na stronach
kursów, pochodzi stąd — strona nie ma ani jednego tekstu wpisanego
na sztywno w kodzie.

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
