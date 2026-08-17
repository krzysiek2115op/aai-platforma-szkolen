/**
 * Polska odmiana liczebników — „2 moduły", nie „2 modułów" (feedback
 * właściciela do B5: liczby z bazy muszą czytać się naturalnie).
 */
/** Samo odmienione słowo (gdy liczba renderuje się osobno, np. HUD). */
export function slowo(
  n: number,
  jeden: string,
  kilka: string,
  wiele: string
): string {
  if (n === 1) return jeden;
  const r10 = n % 10;
  const r100 = n % 100;
  if (r10 >= 2 && r10 <= 4 && (r100 < 12 || r100 > 14)) return kilka;
  return wiele;
}

export function odmien(
  n: number,
  jeden: string,
  kilka: string,
  wiele: string
): string {
  return `${n} ${slowo(n, jeden, kilka, wiele)}`;
}

export const moduly = (n: number) => odmien(n, "moduł", "moduły", "modułów");
export const lekcje = (n: number) => odmien(n, "lekcja", "lekcje", "lekcji");

/** Czas materiału po polsku: „45 min", „3 h", „7 h 30 min" — bez „0.8 h". */
export function czasMaterialu(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const reszta = min % 60;
  return reszta === 0 ? `${h} h` : `${h} h ${reszta} min`;
}
