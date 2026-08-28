# Sweep przed `/clear` — krok P2 Pluginu 2 (2026-08-28)

Log sweepu na polecenie właściciela: **zweryfikować wszystkie znalezione
i naprawione błędy oraz sprawdzić, czy poprawki nie kolidują z resztą
projektu**. Weryfikacja jest URUCHOMIENIOWA — każda pozycja niżej ma pomiar,
nie deklarację.

Gałąź: `feat/p2-produkt-z-ceny` (wersja 0.47.0). Środowisko: `:8892`.

---

## 1. Znalezisko SAMEGO sweepu (nie było w żadnym z trzech przeglądów)

**Smoke'i Pluginu 1 zostawiały produkty-sieroty — po każdym przebiegu bramek
przybywał śmieć w sklepie.** To realna kolizja P2 z resztą projektu:

- *mechanizm:* `smoke-wp-dane`, `smoke-wp-tutor` i `smoke-wp-kreator` tworzą
  kursy testowe przez warstwę zapisu Pluginu 1, więc **nasz szew zakłada im
  produkty**. Przy kasowaniu kursu produkt schodzi na `draft`, ale zostaje —
  bo „produktu nie kasujemy nigdy" (niezmiennik 13) chroni historię zamówień
  i świadomie nie rozróżnia kupionych od niekupionych;
- *pomiar przed naprawą:* 4 produkty i 4 wiersze `powiazania` zamiast 2
  (sieroty „Kurs próbny smoke'a" i „Smoke kopii w Tutorze");
- *naprawa:* trzy smoke'i sprzątają teraz TAKŻE produkt po swoim kursie —
  test ma prawo skasować własne dane, tak jak kasuje własny kurs. Kod wtyczki
  bez zmian, niezmiennik 13 nienaruszony;
- *dowód po naprawie:* trzy przebiegi z rzędu → **produkty 2, powiazania 2**,
  czyli stan sprzed przebiegu.

Gdyby tego nie złapać: bramki zaczęłyby po kilku przebiegach mierzyć własne
śmieci, a kontrola rozjazdu tonęłaby w szumie („sierota" przy każdym uruchomieniu).

## 2. Weryfikacja napraw z przeglądu (41 znalezisk, trzy obszary)

| Naprawa | Jak zweryfikowana | Wynik |
|---|---|---|
| **A1** (krytyczne) produkt zostawał `publish` bez kompletu warunków | zdjęcie kopii kursu w Tutorze → `sync` → status produktu | `draft`, a po przywróceniu `publish` ✔ |
| **B1/C4** fatal PHP bez Pluginu 1 | `sync <slug>` i `sync --napraw-cene` z wyłączonym `aai-sklep` | 0 fatali ✔ |
| **B2** kontrola meldowała `Success`, nie sprawdziwszy kursów | `sprawdz` bez Pluginu 1 | mówi wprost „kontrola rozjazdu POMINIĘTA", kod 0 ✔ |
| **B4** brak tabel + wyłączone Woo dawało kod 0 | tabela schowana `RENAME` + Woo zdeaktywowane | **kod 1** ✔ (po przywróceniu 0) |
| **B5** `sync` nie gasił stanu błędu (kontrola czerwona po naprawie) | błąd w opcji → `sprawdz` → `sync` → `sprawdz` | 1 → 0 ✔ |
| **C3** jeden globalny slot: zapis kursu A kasował alarm kursu B | dwa błędy, wyczyszczenie jednego | drugi ocalał ✔ |
| **A6** `dostawa_odnotuj` myliła awarię z duplikatem | tabela `dostawy` schowana | rzuca wyjątek zamiast udawać „już dostarczone" ✔ |
| **A14** identyfikator `<= 0` przycinany po cichu | `dostawa_odnotuj(..., 0)` | odrzucone głośno ✔ |
| **C8/L4** deaktywacja bez `Throwable`, produkty zostawały kupowalne | deaktywacja wtyczki | produkty `publish`: **0**; po aktywacji + `sync`: **2** ✔ |
| **C5** kontrola milczała o rozbrojonym szwie | `sprawdz` na instalacji z `monetize_by = tutor` | nazywa stan „SZEW ROZBROJONY" ✔ |
| **B6** mutacja maskowana, brak mutacji `_sale_price` | audyt mutacyjny | 174 mutacje, **0 przeoczonych, 0 martwych** ✔ |
| pozostałe (B3, B7–B14, A2–A5, A7–A13, C1, C6, C7, C9–C13) | `smoke-wp-produkty` (70 sprawdzeń, testy negatywne wszystkich gałęzi kontroli) | 70/70 ✔ |

## 3. Kolizje z resztą projektu — sprawdzone

| Obszar | Dowód | Wynik |
|---|---|---|
| prototyp Next.js (D1–D7) | `npm run check` (strażnicy, lint, tsc, testy, build, 7 smoke'ów) | kod **0** |
| Plugin 1 — dane | `wp:sprawdz` | treść **73/73 co do znaku**, bramka W2 zaliczona |
| Plugin 1 — kopia w Tutorze | `wp:tutor` | 87 obiektów, **0 różnic** |
| Plugin 1 — front i kreator | `smoke:wp-front` 84, `smoke:wp-kreator` 96, `smoke:wp-lekcja` 35 | zielone |
| jedyna zmiana w kodzie Pluginu 1 (`kurs_po_id()`) | wszystkie smoke'i Pluginu 1 + `straznik-kreatora-wp` | bez regresji |
| środowisko | `postaw.sh` (z nowym punktem kontrolnym `aai-platnosci sprawdz`) | kod **0**; test negatywny: zepsuta cena → kod 1 z komunikatem |
| strażnicy | `uruchom-wszystkie` | **35/35** |
| repo | `git status` | czyste, bez plików tymczasowych po mutacjach |

## 4. Stan otwarty — świadomie, do kroku P3a

- **`monetize_by = tutor`** — integracja Tutor↔Woo jest wyłączona, więc szew
  nie ma dziś odbiorcy po drugiej stronie. Kontrola to NAZYWA; przestawienie
  należy do P3a (decyzja zakresu z planu P2).
- **Dowód pułapki B13 jest dziś częściowo symulowany** — handler Tutora na
  `save_post_product` przy `monetize_by = tutor` nie jest zarejestrowany,
  więc smoke mierzy nasze własne przywracanie znaczników. Po przestawieniu
  silnika w P3a ten sam test zacznie mierzyć cudze zachowanie; wtedy warto
  dołożyć asercję wstępną `monetize_by === 'wc'`.
- CTA nadal prowadzi na `/kontakt`, dostępność w danych strukturalnych to
  `PreOrder` — zmiana należy do P3b.

## 5. Wynik sweepu

Zielone wszystko, co mierzalne: **strażnicy 35/35 · audyt mutacyjny 174
(0 przeoczonych, 0 martwych) · `npm run check` 0 · `postaw.sh` 0 · smoke:
produkty 70, kreator 96, front 84, tutor 44, lekcja 35, dane 30, płatności 23
· dane Pluginu 1 nietknięte (73/73 co do znaku, 0 różnic w kopii)**.
Środowisko po przebiegach wraca do stanu wyjściowego: produkty 2,
powiazania 2, dostawy 0, opcja błędu pusta.

Krok P2 jest gotowy do PR-a. **Merge — wyłącznie za zgodą właściciela**;
CI stoi do 1 września (zadania padają w 2 s z zerem kroków, to wyczerpane
minuty Actions, nie kod).
