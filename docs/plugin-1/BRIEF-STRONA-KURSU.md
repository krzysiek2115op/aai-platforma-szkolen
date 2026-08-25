# Brief właściciela: Course Detail System (2026-08-17, B5 iteracja 3)

Pełne polecenie właściciela dot. przebudowy prezentacji kursów.
WIĄŻĄCE dla dalszej pracy nad stroną kursu. Strony główna i /szkolenia
są OK — nie przebudowywać bez potrzeby (poza pkt. 1–2 niżej).

## Drobne poprawki katalogu (przed CDS)

1. Karty katalogu RÓWNEJ wielkości (Claude tak samo jak GitHub) —
   bez karty wyróżnionej.
2. Dłuższe, bardziej zachęcające opisy na kartach — „dlaczego my,
   a nie inni".

## Cel główny: PREMIUM PRODUCT PAGE + SALES PAGE + MINI SKLEP

Kliknięcie kursu = pełnoprawna, długa strona sprzedażowa produktu
premium („to jest przemyślany produkt, wiem co kupuję i dlaczego tyle
kosztuje"), odpowiadająca na KAŻDE pytanie przed zakupem (czym jest,
dla kogo, co osiągnę, co w środku, program, czas nauki, co poza
lekcjami, jak wygląda platforma, jakie problemy rozwiązuje, efekty,
dlaczego ten i dlaczego teraz, czy dam radę, co mówią inni, co dokładnie
za pieniądze, jak wygląda zakup i co po nim).

Inspiracja GŁĘBOKOŚCI sprzedaży (NIE kopia): claudedlafirm.pl/#poznaj —
analiza w [WZOR-STRONA-SPRZEDAZOWA.md](WZOR-STRONA-SPRZEDAZOWA.md).

## Struktura strony kursu (reusable Course Detail System)

Komponenty wspólne, dane per kurs z ISTNIEJĄCEJ bazy (course_sections
+ modules/lessons; nie hardcodować, nie tworzyć drugiej bazy):

1. **Premium Hero** — badge [KURS · X MODUŁÓW · Y LEKCJI], mocny
   headline, krótki opis wartości, dla kogo, cena, CTA + drugie CTA
   „Zobacz program", wizualizacja produktu (OknoKursu). Mało tekstu.
2. **Sticky course navigation** — subtelne mini-menu po scrollu:
   Poznaj kurs / Program / Co otrzymujesz / Dla kogo / Opinie / FAQ /
   Cena + CTA „Dołącz do kursu"; desktop i mobile.
3. **„Dlaczego ten kurs?"** — sprzedajemy zmianę: wstęp-empatia +
   PROBLEM → ROZWIĄZANIE → REZULTAT. Konkret, zero lania wody.
   (sekcja `problem`)
4. **„Co będziesz potrafić po kursie?"** — konkretne rezultaty jako
   premium cards (sekcja `benefits`).
5. **„Co znajduje się w środku?"** — produkt jak fizyczny: PROGRAM /
   MATERIAŁY / PRAKTYKA / DOSTĘP / BONUS (sekcja `package`);
   odpowiada „za co płacę".
6. **Program** — jeden z głównych elementów: moduły rozwijalne
   z numerem, nazwą, OPISEM, liczbą lekcji i czasem; lekcje w środku.
   Dane z bazy.
7. **Podgląd platformy** — „tak wygląda produkt po zakupie"
   (OknoKursu/mockupy; ŻADNYCH fałszywych screenshotów).
8. **„To NIE jest / to JEST"** — pozycjonowanie (sekcja `positioning`).
9. **Dla kogo jest / NIE jest** (sekcja `for_whom` + `nie_dla`).
10. **Efekt PRZED / PO** — transformacja (sekcja `transformation`).
11. **Opinie** — bez zmyślania; komponent gotowy do uzupełnienia
    (sekcja `opinions`).
12. **„Co dostajesz za cenę?"** — oferta premium: ZA X ZŁ OTRZYMUJESZ
    ✓… + cena + CTA „Dołączam do kursu →".
13. **Porównanie** — samodzielna nauka vs kurs, premium, nieagresywnie
    (sekcja `comparison`).
14. **FAQ** — rozbudowane, prawdziwe informacje (sekcja `faq`).
15. **Final CTA** — mocne domknięcie historii; pod CTA tylko PRAWDZIWE
    informacje.
16. **Mobile-first** — sticky CTA rozważone, brak poziomego scrolla,
    karty nie-absurdalne, spacing premium, wydajne animacje.

## Zasady twarde

- DNA Automatic AI (dark premium, volt, grid, cienkie linie, glow,
  minimalizm) — poziom wyżej: PREMIUM/TECH/EDITORIAL/MINIMAL/CONFIDENT.
  NIE: tandetne gradienty, przypadkowe animacje, neonoza, generyczny
  „AI SaaS landing", przesadny glassmorphism, klon Claude.
- Animacje subtelne (reveal, fade/translate, hover, glow, sticky,
  akordeony); PERFORMANCE > animacje; prefers-reduced-motion.
- Treść: FEATURE → BENEFIT → OUTCOME; każda sekcja ma cel; strona
  długa bo odpowiada na pytania, nie bo jest napompowana.
- Psychologia scrolla: zainteresowanie → problem → obietnica → wartość
  → konkret → program → rezultat → dowód → oferta → redukcja obaw →
  CTA. Cena PO zbudowaniu wartości.
- NIE wymyślać: opinii, bonusów, gwarancji, warunków, checkoutu.
  CTA podpiąć w istniejącą logikę (obecnie placeholder → kontakt,
  do czasu Pluginu 2).
- SEO (H1/H2/H3, title, meta description, semantyka, alty) i a11y
  (kontrast, focus, klawiatura, aria, hierarchia nagłówków, akordeony,
  reduced motion).
- NIE przepisywać aplikacji, NIE zmieniać strony /szkolenia poza
  pkt. 1–2, nie psuć niczego istniejącego.

## Kryterium sukcesu

Po kliknięciu kursu reakcja „WOW, prawdziwy produkt premium"; po 3–5 min
scrolla użytkownik wie wszystko przed zakupem.

## Po implementacji pokazać podsumowanie

Co zmienione, jakie komponenty, jakie pliki, jak działa reusable system,
czy checkout (CTA) działa, czy strona główna i /szkolenia nienaruszone.
