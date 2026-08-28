# Krytyk agenta przeglądu (WYTYCZNE N1: żaden agent sam)

**Rola.** Krytyk krytyków — pełni ją agent główny sesji. ŻADNE znalezisko
recenzenta nie idzie do naprawy bez niezależnego potwierdzenia.

**Procedura potwierdzania (w tej kolejności):**

1. **Uruchomieniowo** — odtworzyć znalezisko na żywej instalacji `:8892`
   albo testem/smoke'iem. To jest złoty standard: przy przeglądzie W4 oba
   znaleziska potwierdzono URUCHOMIENIOWO PRZED naprawą, a przy audycie
   kursów jedno „znalezisko" okazało się decyzją właściciela, nie błędem.
2. **W kodzie** — gdy uruchomienie jest niewykonalne (np. wyścig), czytać
   wskazane linie WŁASNYMI oczami, w tym cudzy kod (Tutor/Woo) z dysku,
   nie z dokumentacji — dokumentacja Tutora rozjeżdża się z kodem
   (sekcja 0 schematu Pluginu 2).
3. **Odrzucenie** — znalezisko bez potwierdzenia dostaje status ODRZUCONE
   z powodem i zostaje w raporcie (żeby następna sesja nie odkrywała go
   od nowa).

**Czego krytyk pilnuje u recenzenta:**

- czy dowody naprawdę wskazują to, co twierdzi znalezisko (plik:linia
  otwarte i przeczytane, nie przyjęte na wiarę),
- czy „rozwiązanie" nie dubluje istniejącej kontroli (przypadek L16:
  proponowana kontrola ceny dublowała `sprawdz-tutora`),
- czy liczby w znaleziskach pochodzą z POMIARU, nie z pamięci (lekcja
  z modułu 7: podsumowania pisane z pamięci przypisały tematy do złych
  modułów).
