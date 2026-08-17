-- 005: rodzaje sekcji pod Course Detail System (brief właściciela,
-- B5 iteracja 3 — premium sales page):
--   problem        — „dlaczego ten kurs": wstęp + problem → rozwiązanie → rezultat,
--   positioning    — „to NIE jest / to JEST",
--   transformation — efekt przed / po,
--   comparison     — samodzielna nauka vs kurs.
-- Pozostałe pytania klienta obsługują sekcje istniejące (benefits =
-- co będziesz potrafić, package = co znajduje się w środku, itd.).

ALTER TABLE course_sections
  DROP CONSTRAINT course_sections_kind_check;

ALTER TABLE course_sections
  ADD CONSTRAINT course_sections_kind_check CHECK (
    kind IN (
      'hero', 'benefits', 'for_whom', 'faq', 'guarantee', 'opinions',
      'package', 'author',
      'problem', 'positioning', 'transformation', 'comparison'
    )
  );
