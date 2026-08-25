-- 001: tabele treści bazy db1_kursy (ERD: docs/plugin-1/DIAGRAM.md §3).
-- Migracje są niezmienne po scaleniu (pilnuje straznik-migracji) —
-- każda zmiana schematu to NOWY plik z kolejnym numerem.

CREATE TABLE courses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text NOT NULL UNIQUE,
  title        text NOT NULL,
  type         text NOT NULL CHECK (type IN ('ebook', 'kurs')),
  short_desc   text,
  price_grosze integer NOT NULL CHECK (price_grosze >= 0),
  cover_url    text,
  status       text NOT NULL DEFAULT 'draft'
               CHECK (status IN ('draft', 'published', 'archived')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE course_sections (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
  kind      text NOT NULL CHECK (
    kind IN ('hero', 'benefits', 'for_whom', 'faq', 'guarantee', 'opinions')
  ),
  position  integer NOT NULL CHECK (position >= 0),
  content   jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (course_id, kind, position)
);

CREATE TABLE course_modules (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
  position  integer NOT NULL CHECK (position >= 0),
  title     text NOT NULL,
  summary   text,
  UNIQUE (course_id, position) DEFERRABLE INITIALLY IMMEDIATE
);

CREATE TABLE course_lessons (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id    uuid NOT NULL REFERENCES course_modules (id) ON DELETE CASCADE,
  position     integer NOT NULL CHECK (position >= 0),
  title        text NOT NULL,
  duration_min integer CHECK (duration_min > 0),
  preview      boolean NOT NULL DEFAULT false,
  UNIQUE (module_id, position) DEFERRABLE INITIALLY IMMEDIATE
);

-- Dziennik audytu: pisany WYŁĄCZNIE triggerami (migracja 002) —
-- kod aplikacji nie umie go ominąć ani sfałszować.
CREATE TABLE course_changelog (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  course_id  uuid,
  tabela     text NOT NULL,
  action     text NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  stan_przed jsonb,
  stan_po    jsonb,
  actor      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_changelog_course ON course_changelog (course_id, created_at);
CREATE INDEX idx_courses_status ON courses (status);
CREATE INDEX idx_sections_course ON course_sections (course_id);
CREATE INDEX idx_modules_course ON course_modules (course_id);
CREATE INDEX idx_lessons_module ON course_lessons (module_id);
