/** Łączy klasy CSS, pomijając wartości fałszywe. (przejęte ze strony głównej) */
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}
