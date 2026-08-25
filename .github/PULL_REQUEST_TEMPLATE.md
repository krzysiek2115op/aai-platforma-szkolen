<!--
Szablon jest podpowiedzią, nie formularzem do wypełnienia na siłę.
Przy jednolinijkowej poprawce skasuj wszystko poza opisem — nikt nie
potrzebuje ceremonii wokół literówki.
-->

## Co i po co

<!-- Co się zmienia i jaki problem to rozwiązuje. „Po co" jest ważniejsze
     niż „co" — diff pokazuje co, ale nie powie, czemu tak. -->

## Jak to sprawdziłem

<!-- Konkret zamiast „działa": jaka komenda, jaki wynik. Kody wyjścia BEZ
     potoku — `node skrypt | tail` maskuje kod wyjścia (lekcja z Działu 5).
     Jeśli czegoś NIE dało się sprawdzić, napisz wprost co i dlaczego. -->

- [ ] `npm run check` przechodzi (strażnicy → lint → tsc → testy → build → smoke'i)
- [ ] `node tools/straznicy/audyt-straznikow.mjs`, jeśli PR dodaje lub zmienia strażnika
- [ ] sprawdzone w przeglądarce, jeśli zmiana dotyka wyglądu

<!-- CI stoi do 1 września 2026 (wyczerpany limit minut Actions organizacji).
     Do tego czasu dowody odtwarzamy lokalnie i wklejamy TUTAJ — tak samo
     jak przy wersjach 0.21.0-0.34.0. Po powrocie CI: potwierdzić gitleaks,
     bo jako jedyny nie ma lokalnego odpowiednika. -->

## Uwagi

<!-- Świadome kompromisy, rzeczy zostawione na później, wycofane własne
     wnioski. Lepiej napisać to tutaj niż tłumaczyć za pół roku. -->

---

<!--
Zmiany dotykające tych obszarów wymagają dodatkowej uwagi:

- `tresc-kursow/`   — treść, za którą klient płaci; golden treści musi się
                      zgadzać, a strony sprzedażowe nie mogą obiecywać nic
                      spoza programu (straznik-obietnic)
- `modules/`        — kontrakty i dyspozytor: jedna baza = jeden AJAX
- `tools/straznicy/`— nowy strażnik = nowa mutacja w audycie
- `.github/`        — CI; minuty Actions są wspólne dla całej organizacji
- `app/`, `components/` — oba tryby budowania (serwerowy i podgląd statyczny)
-->
