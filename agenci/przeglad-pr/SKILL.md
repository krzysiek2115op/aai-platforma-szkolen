# Umiejętność: jak przeglądać zmiany etapu WP, żeby znaleziska były prawdziwe

1. **Najpierw kontekst, potem kod.** Przeczytaj: zaakceptowany schemat
   modułu (`docs/plugin-2/DIAGRAM.md`), rejestr znalezisk poprzednich
   przeglądów (`docs/plugin-2/KRYTYKA-P0.md`, `docs/plugin-1/PRZEGLAD-B7.md`)
   i sekcje „SPRAWDZONE I CZYSTE" — żeby nie zgłaszać rzeczy już
   rozstrzygniętych ani nie szukać drugi raz tam, gdzie już szukano.
2. **Czytaj CAŁE pliki zmiany**, nie diff — usterka klasy BLAD-018 („brak
   klucza kasuje dane") była widoczna tylko przy czytaniu warstwy zapisu
   w całości, bo panel zawsze wysyłał oba klucze i diff wyglądał zdrowo.
3. **Cudzy kod czytaj z dysku instalacji** (`wp-content/plugins/tutor`,
   `woocommerce`), wersje zapisuj w znalezisku — internals się zmieniają,
   a znalezisko bez wersji nie da się później zweryfikować (L17).
4. **Każde znalezisko kończ pytaniem „co je będzie pilnować za darmo"** —
   strażnik (statycznie), smoke (uruchomieniowo) albo mutacja w audycie.
   Proponowany wzorzec celuje w zachowanie, nie w nazwę.
5. **Liczby tylko z pomiaru.** „Trzy minimalne zmiany" w schemacie P0 było
   nieprawdą (K3: realnie ≥5) — bo nikt nie policzył miejsc wywołania.
   `grep -c` kosztuje sekundę, fałszywa liczba w dokumencie kosztuje krok.
6. **Wynik oddawaj jako listę do pliku rejestru** (format jak
   KRYTYKA-P0.md): waga, dowód, rozwiązanie — tak, żeby następna sesja
   mogła wprowadzić całość JEDNYM przepisaniem, bez ciebie.

Golden pary wejście → wyjście: [goldeny/](goldeny/).
