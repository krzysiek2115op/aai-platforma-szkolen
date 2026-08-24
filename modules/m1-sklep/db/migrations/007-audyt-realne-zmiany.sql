-- 007: audyt zapisuje UPDATE tylko wtedy, gdy naprawdę coś się zmieniło.
--
-- Decyzja właściciela z 2026-08-25 (znalezisko E przeglądu B7). Stan
-- przed zmianą: 3068 wierszy / 4152 kB dziennika przy 908 kB rzeczywistej
-- treści kursów. Źródło puchnięcia nie było tajemnicze: zapis programu
-- robi `UPDATE` na KAŻDEJ lekcji z `id` — także takiej, której nikt nie
-- tknął — a trigger zapisuje `to_jsonb(OLD)` i `to_jsonb(NEW)`, czyli
-- DWIE kopie treści lekcji. Jeden zapis spisu treści potrafił więc
-- odłożyć w dzienniku kilkakrotność samego kursu.
--
-- CZEGO TA ZMIANA NIE ROBI. Nie rusza gwarancji z Działu 2: dziennik
-- dalej jest niezmienny (UPDATE/DELETE/TRUNCATE zatrzymane), dalej piszą
-- go wyłącznie triggery i dalej trzyma pełny stan przed i po. Zmienia się
-- jedno: `UPDATE`, po którym wiersz jest identyczny, nie jest zdarzeniem
-- i nie zostawia wpisu. Dzięki temu dziennik zostaje śladem po UTRACIE
-- treści (to on był jedynym śladem przy znalezisku #1 tego samego
-- przeglądu) — odwrotnie niż wariant „audyt bez kolumny content",
-- który był rozważany i został ODRZUCONY.
--
-- `updated_at` jest pomijane w porównaniu świadomie: na `courses` ustawia
-- je trigger BEFORE UPDATE, więc bez tego wyjątku każdy zapis kursu
-- wyglądałby na zmianę, nawet gdy żadne pole treści nie drgnęło.
--
-- Migracje 001–006 są niezmienne (straznik-migracji) — dlatego nowa
-- wersja funkcji idzie nowym plikiem.

CREATE OR REPLACE FUNCTION m1_audyt() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  wiersz    record;
  kurs_id   uuid;
  akcja     text;
  przed     jsonb;
  po        jsonb;
BEGIN
  IF TG_OP = 'UPDATE'
     AND to_jsonb(OLD) - 'updated_at' = to_jsonb(NEW) - 'updated_at' THEN
    RETURN NULL;
  END IF;

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
