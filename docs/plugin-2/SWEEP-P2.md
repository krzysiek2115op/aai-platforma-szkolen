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

---

# Ponowna walidacja przed PR-em (2026-08-29)

Polecenie właściciela z 2026-08-28: przed PR-em sprawdzić, **(a)** czy
wcześniejsze poprawki nie spowodowały regresji ani kolizji, i **(b)** czy TE
SAME KLASY błędów nie siedzą w INNYCH miejscach projektu. Wynik: **jedna
realna dziura znaleziona i naprawiona** (poza kodem P2), reszta czysta.

## 6. Regresja i kolizje — pełny zestaw kontrolerów

Wszystko uruchomione na gałęzi `feat/p2-produkt-z-ceny`, środowisko `:8892`.

| Kontroler | Wynik |
|---|---|
| `npm run check` (strażnicy, lint, tsc, testy, build, 7 smoke'ów prototypu) | **kod 0**; strażnicy **35/35**, testy **83/83** |
| audyt mutacyjny | **176 mutacji**: 174 złapane, **0 przeoczonych, 0 martwych**, 2 pominięte (strażnicy warunkowi bez materiału) |
| `smoke:wp` · `wp-front` · `wp-tutor` · `wp-lekcja` | 30 · 84 · 44 · 35 |
| `smoke:wp-kreator` · `wp-panel` · `wp-motyw` | 96 · 54 · **65** (7 stron) |
| `smoke:wp-platnosci` · `wp-produkty` | 23 · **70** |
| `npm run wp:sprawdz` | treść **73/73 co do znaku** |
| `npm run wp:tutor` | 87 obiektów, **0 różnic** |
| `wp aai-platnosci sprawdz` | kod 0, szew nazywa stan „ROZBROJONY" (`monetize_by = tutor` — należy do P3a) |
| `postaw.sh` | **kod 0**, z punktem kontrolnym `aai-platnosci sprawdz` |
| stan środowiska po WSZYSTKICH przebiegach | produkty **2**, powiazania **2**, dostawy **0** — czyli stan sprzed walidacji |
| `git status` | czysto, zero plików po mutacjach |

**Regresji nie ma. Kolizji nie ma.** Dane Pluginu 1 nietknięte.

## 7. Sześć klas błędów — szukanie w INNYCH miejscach projektu

Metoda: **pomiar, nie lektura**. Każda klasa sprawdzona wzorcem, a każde
podejrzenie rozstrzygnięte uruchomieniem (mutacja → komunikat → przywrócenie).

| Klasa | Gdzie szukano | Wynik |
|---|---|---|
| 1. wczesny `return` zostawiający zmieniony stan | `aai-sklep`: wszystkie `catch`, miejsca zmieniające status wpisów | **czysto** — `catch` w warstwie zapisu robi `ROLLBACK` + rethrow, w kopii do Tutora zapamiętuje błąd (świadome), w lekcji zatrzymuje stronę z komunikatem; wtyczka nie przestawia statusów wpisów (robi to tylko `aai-platnosci`, przedmiot przeglądu P2) |
| 2. kontrola meldująca sukces bez sprawdzenia | 5 `catch` w CLI `aai-sklep`, konsumenci wyjścia | **czysto** — każdy kończy `WP_CLI::error`; jedyna komenda oddająca błąd w JSON-ie (składanie prozy) ma konsumenta, który pole `blad` sprawdza jawnie (`sprawdz-proze-php.mjs:183`) |
| 3. wzorzec celujący w NAPIS zamiast w ZACHOWANIE | wszystkie 35 strażników | **ZNALEZIONE — patrz §8** (1 dziura, potwierdzona pomiarem). Pozostali czyści: strażnicy wtyczek WP mają bramkę „nie znalazłem materiału", `straznik-granic`/`-fixed`/`-hydratacji` pytają o zachowanie (importy, własności CSS) |
| 4. mutacja maskowana (łamiąca dwie reguły naraz) | wszystkie 176 mutacji | **czysto** — dowód całościowy, nie wyrywkowy: instrumentowana kopia audytu zapisała komunikat strażnika dla KAŻDEJ mutacji, a porównanie wykazało, że wszystkie 161 czerwonych zapala regułę, którą psuły (3 „trafienia" to artefakt porównania słów: „sufit długości" kontra „`z.string()` bez `.max(`" to ta sama reguła). Luka była gdzie indziej — §8 |
| 5. test przechodzący z cudzego powodu | smoke'i WP | **czysto** — asercja „zakres trafił w ≥ 1 element" pokrywa wszystkie **7** stron `smoke-wp-motyw` (dwie siedzą w pętlach); asercje „strona NIE zawiera X" są osłonięte sprawdzeniem kodu 200, więc nie przechodzą po pustce (`pobierz()` oddaje pusty HTML przy innym kodzie) |
| 6. smoke zostawiający po sobie dane | `smoke-wp-dane`, `-tutor`, `-kreator` | **naprawa z d56d9ae działa**, z jednym zastrzeżeniem — §9 |

## 8. ZNALEZISKO: brama kreatora miała pilnowaną tylko połowę decyzji (B)

Naprawione w commicie `c6c9c97`. Klasa 3 + luka klasy 4, **trzeci nawrót
tej klasy w repo** (0.29.0 — nazwa metody, 0.44.0 — nazwa stałej).

- *co było nieprawdą:* `straznik-limitera` pilnował decyzji właściciela (B)
  z 0.36.0 („brama odrzuca token przykładowy **albo krótszy niż 24 znaki**")
  wzorcem `/MIN_DLUGOSC_TOKENU/` — czyli pytaniem o OBECNOŚĆ NAZWY w pliku.
  Sama definicja `const MIN_DLUGOSC_TOKENU = 24;` wystarczała, żeby wzorzec
  trafił;
- *pomiar przed naprawą:* usunięcie sprawdzenia z warunku (`>= MIN_DLUGOSC_TOKENU`
  → `>= 0`) przy zostawionej definicji → **strażnik kod 0**. Brama przyjmowała
  token dowolnej długości, a bramka jakości milczała. To samo w obu plikach
  (`lib/kreator-dostep.ts`, `modules/m1-sklep/dyspozytor.ts`);
- *druga warstwa:* audyt **nie mógł** tego wykryć — nie miał ani jednej mutacji
  na sufit długości, a mutacja „brama formularza przyjmuje token z .env.example"
  wbrew swojemu opisowi **przemianowywała stałą**, czyli też testowała nazwę;
- *naprawa:* wzorzec pyta o porównanie długości ze stałą o **dowolnej** nazwie
  albo z liczbą co najmniej dwucyfrową; komunikat podaje, który człon zawiódł
  („zna token przykładowy / mierzy długość"); dwie nowe mutacje „przestaje
  MIERZYĆ długość" z polem `oczekiwanySlad`, plus kontrprzykład
  „przemianowanie stałej niczego nie osłabia" (strażnik ma wtedy MILCZEĆ);
- *dowód po naprawie:* zdrowy kod → 0; bezpieczny refaktor nazwy → **0**;
  usunięcie sprawdzenia → **1** z komunikatem „mierzy długość: false".
  Audyt `straznik-limitera` 19/19, pełny audyt 176 (0 przeoczonych, 0 martwych).

**Zakres skutku:** wyłącznie prototyp Next.js. Wtyczki WP tokenu nie używają —
ich brama to `manage_options` + nonce (sprawdzone). Kod obu bram był i jest
poprawny; dziura siedziała w PILNOWANIU, nie w ochronie.

## 9. Zostaje otwarte (świadomie, do decyzji właściciela)

| Rzecz | Stan | Dlaczego nie teraz |
|---|---|---|
| `smoke-wp-dane` i `smoke-wp-kreator` sprzątają **liniowo**, bez `try/finally` | przy zwykłym czerwonym teście sprzątanie DZIAŁA (funkcja `sprawdz()` tylko zbiera błędy, nie rzuca) — luka dotyczy tylko awarii samej komendy `wp`, która rzuca wyjątkiem | opakowanie 300-liniowego pliku w `try/finally` to zmiana strukturalna tuż przed PR-em; ryzyko wprowadzenia błędu większe niż zysk. Wzorzec naprawy jest w repo: `smoke-wp-tutor` ma `finally` z komentarzem wprost o ścieżce awarii |
| ostrzeżenie ESLinta: `odpowiedz` przypisane i nieużywane (`smoke-wp-kreator.mjs:88`) | **nie jest regresją P2** — istnieje tak samo na `main` (sprawdzone `git show`) | poza zakresem kroku; jednolinijkowa czystka do zrobienia przy okazji dotykania tego pliku |

## 10. Wynik ponownej walidacji

Zielone wszystko, co mierzalne, po naprawie z §8: **strażnicy 35/35 · audyt
mutacyjny 176 (174 złapane, 0 przeoczonych, 0 martwych, 2 pominięte) ·
`npm run check` kod 0 · testy 83/83 · `postaw.sh` kod 0 · smoke'i WP:
dane 30 · front 84 · tutor 44 · lekcja 35 · kreator 96 · panel 54 · motyw 65 ·
płatności 23 · produkty 70 · dane Pluginu 1 nietknięte (73/73 co do znaku,
0 różnic w kopii do Tutora)**. Środowisko po przebiegach: produkty 2,
powiazania 2, dostawy 0.

**Krok P2 jest gotowy do PR-a.** Merge — wyłącznie za zgodą właściciela.
