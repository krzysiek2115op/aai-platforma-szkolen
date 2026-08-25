-- 008: jedna sekcja danego RODZAJU na kurs; kolumna `position` znika.
--
-- Decyzja właściciela z 2026-08-25 (znalezisko C przeglądu B7), podjęta
-- ŚWIADOMIE PRZED pisaniem schematu MySQL dla wtyczki WordPressa — żeby
-- port nie odziedziczył konstrukcji, której sam prototyp nie używa.
--
-- Co było nie tak. Klucz `UNIQUE (course_id, kind, position)` DOPUSZCZAŁ
-- dwie sekcje tego samego rodzaju na różnych pozycjach, ale strona
-- sprzedażowa czyta sekcje przez `sections.find(s => s.kind === kind)`,
-- czyli bierze PIERWSZĄ i o drugiej nigdy się nie dowie. Kreator przy
-- następnym zapisie skasowałby tę drugą bez słowa. W bazie wszystkie
-- 24 sekcje miały `position = 0` (pomiar 2026-08-25) — kolumna była
-- martwa od początku, a jej jedynym skutkiem była ta pułapka.
--
-- Odrzucony wariant: zostawić `position` i nauczyć stronę renderować
-- wiele sekcji jednego rodzaju. Odrzucony, bo żadna z 12 sekcji strony
-- sprzedażowej nie ma sensu w dwóch egzemplarzach (dwa razy „gwarancja",
-- dwa razy „autor"), a kolejność sekcji na stronie jest kompozycją
-- widoku, nie danymi.
--
-- Powtórzony rodzaj w JEDNYM zapisie odrzuca teraz kontrakt
-- (`KursWejscie` w typy.ts), więc do bazy nie dociera nawet konflikt
-- unikalności — a odpowiedź kreatora wskazuje konkretne pole zamiast
-- mówić o „duplikacie sluga".

ALTER TABLE course_sections
  DROP CONSTRAINT course_sections_course_id_kind_position_key;

ALTER TABLE course_sections
  ADD CONSTRAINT course_sections_kurs_rodzaj_key UNIQUE (course_id, kind);

ALTER TABLE course_sections
  DROP COLUMN position;
