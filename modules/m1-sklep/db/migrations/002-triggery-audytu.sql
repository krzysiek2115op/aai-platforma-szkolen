-- 002: triggery audytu — wymaganie właściciela: „zapis kursów do bazy
-- nawet przy dodawaniu, usuwaniu i modyfikowaniu". Każda operacja
-- INSERT/UPDATE/DELETE na czterech tabelach treści zostawia wpis
-- w course_changelog ze stanem przed i po (kopia do odtworzenia,
-- współgra z procedurą .bak z WYTYCZNE §1).

-- Aktor operacji: aplikacja może ustawić `SET app.actor = '...'`;
-- bez tego wpis dostaje nazwę roli bazy (nic nie ginie).
CREATE FUNCTION m1_aktor() RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(NULLIF(current_setting('app.actor', true), ''), current_user)
$$;

-- Wspólna funkcja audytu. course_id wyliczany per tabela:
--   courses          → id wiersza,
--   course_sections  → course_id wiersza,
--   course_modules   → course_id wiersza,
--   course_lessons   → lookup przez course_modules (przy kaskadowym
--                      usuwaniu moduł może już nie istnieć → NULL,
--                      wpis audytu i tak powstaje).
CREATE FUNCTION m1_audyt() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  wiersz    record;
  kurs_id   uuid;
  akcja     text;
  przed     jsonb;
  po        jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    akcja := 'create';  wiersz := NEW;  przed := NULL;          po := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    akcja := 'update';  wiersz := NEW;  przed := to_jsonb(OLD); po := to_jsonb(NEW);
  ELSE
    akcja := 'delete';  wiersz := OLD;  przed := to_jsonb(OLD); po := NULL;
  END IF;

  IF TG_TABLE_NAME = 'courses' THEN
    kurs_id := wiersz.id;
  ELSIF TG_TABLE_NAME = 'course_lessons' THEN
    SELECT m.course_id INTO kurs_id
    FROM course_modules m WHERE m.id = wiersz.module_id;
  ELSE
    kurs_id := wiersz.course_id;
  END IF;

  INSERT INTO course_changelog (course_id, tabela, action, stan_przed, stan_po, actor)
  VALUES (kurs_id, TG_TABLE_NAME, akcja, przed, po, m1_aktor());

  RETURN NULL; -- trigger AFTER — wynik ignorowany
END;
$$;

CREATE TRIGGER trg_audyt_courses
  AFTER INSERT OR UPDATE OR DELETE ON courses
  FOR EACH ROW EXECUTE FUNCTION m1_audyt();

CREATE TRIGGER trg_audyt_course_sections
  AFTER INSERT OR UPDATE OR DELETE ON course_sections
  FOR EACH ROW EXECUTE FUNCTION m1_audyt();

CREATE TRIGGER trg_audyt_course_modules
  AFTER INSERT OR UPDATE OR DELETE ON course_modules
  FOR EACH ROW EXECUTE FUNCTION m1_audyt();

CREATE TRIGGER trg_audyt_course_lessons
  AFTER INSERT OR UPDATE OR DELETE ON course_lessons
  FOR EACH ROW EXECUTE FUNCTION m1_audyt();

-- updated_at na courses aktualizuje się samo.
CREATE FUNCTION m1_updated_at() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_updated_at_courses
  BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION m1_updated_at();

-- Changelog jest tylko do dopisywania: UPDATE/DELETE/TRUNCATE zatrzymane.
CREATE FUNCTION m1_changelog_niezmienny() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'course_changelog jest niezmienny (audyt) — % zabronione', TG_OP;
END;
$$;

CREATE TRIGGER trg_changelog_niezmienny
  BEFORE UPDATE OR DELETE ON course_changelog
  FOR EACH ROW EXECUTE FUNCTION m1_changelog_niezmienny();

CREATE TRIGGER trg_changelog_bez_truncate
  BEFORE TRUNCATE ON course_changelog
  FOR EACH STATEMENT EXECUTE FUNCTION m1_changelog_niezmienny();
