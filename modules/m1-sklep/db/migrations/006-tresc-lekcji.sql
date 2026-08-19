-- 006: treść lekcji i materiały dodatkowe.
--
-- Decyzja właściciela z 2026-08-19 (docs/plugin-1/PRODUKCJA-MATERIALU-KROK-3.md):
-- kurs jest TEKSTOWY — lekcje na platformie za logowaniem plus PDF jako
-- dodatek. Dlatego NIE MA tu ani jednej kolumny pod wideo: żadnego
-- identyfikatora z hostingu, długości filmu ani napisów. Gdyby wideo
-- kiedyś wróciło, dojdzie osobną migracją do tych samych wierszy.
--
-- `content` trzyma markdown, bo tym są scenariusze z Działu 7 i tym
-- będzie import do WordPressa — konwersja po drodze byłaby stratą.
--
-- `materials` to lista dodatków ([{rodzaj, tytul, url, opis}]).
-- Kształt pilnuje Zod (TrescLekcji w modules/m1-sklep/typy.ts); baza
-- pilnuje tylko tego, czego Zod pilnować nie może po stronie SQL:
-- że to TABLICA, a nie obiekt czy liczba wrzucona ręcznie z psql.

ALTER TABLE course_lessons
  ADD COLUMN content   text,
  ADD COLUMN materials jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE course_lessons
  ADD CONSTRAINT course_lessons_materials_tablica
  CHECK (jsonb_typeof(materials) = 'array');

-- Lekcje z treścią liczy lista kreatora (postęp pisania kursu).
-- Indeks częściowy, bo pytanie brzmi zawsze „które MAJĄ treść".
CREATE INDEX idx_lessons_z_trescia
  ON course_lessons (module_id)
  WHERE content IS NOT NULL AND content <> '';
