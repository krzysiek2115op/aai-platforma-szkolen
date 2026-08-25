-- 003: nowe rodzaje sekcji strony sprzedażowej (ocena właściciela przy
-- bramce B5: „zbyt mało informacji przed kupnem kursu").
--   package — co dokładnie dostajesz w pakiecie (format, dostęp,
--             materiały, aktualizacje + kotwica cenowa),
--   author  — kto prowadzi i dlaczego warto mu ufać.
-- Migracje 001–002 są niezmienne — dlatego zmiana constraintu idzie
-- nowym plikiem.

ALTER TABLE course_sections
  DROP CONSTRAINT course_sections_kind_check;

ALTER TABLE course_sections
  ADD CONSTRAINT course_sections_kind_check CHECK (
    kind IN (
      'hero', 'benefits', 'for_whom', 'faq', 'guarantee', 'opinions',
      'package', 'author'
    )
  );
