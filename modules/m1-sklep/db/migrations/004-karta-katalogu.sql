-- 004: pola karty katalogu premium (redesign na polecenie właściciela,
-- bramka B5 iteracja 2): badge (np. NOWOŚĆ / PRAKTYCZNY — uczciwe,
-- żadnych zmyślonych „BESTSELLERÓW" przed pierwszą sprzedażą) oraz
-- poziom trudności. Oba pola opcjonalne — ustawia je kreator (D6).

ALTER TABLE courses
  ADD COLUMN badge text,
  ADD COLUMN level text CHECK (
    level IN ('podstawowy', 'sredniozaawansowany', 'zaawansowany')
  );
