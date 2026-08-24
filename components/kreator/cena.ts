/**
 * Przeliczanie ceny: właściciel pisze złotówki, baza trzyma grosze.
 *
 * Osobny plik, bo to logika, na której da się stracić pieniądze —
 * a logikę schowaną w komponencie testuje się tylko klikaniem.
 * Pierwsza wersja pola ceny liczyła `Number("")` w trakcie pisania
 * „199,90" i po cichu zapisywała 0 zł (BLAD-005).
 */

/** Grosze → tekst dla pola („19990" → „199,90", „29900" → „299"). */
export function zGroszy(grosze: number): string {
  return (grosze / 100).toFixed(2).replace(/\.00$/, "").replace(".", ",");
}

/**
 * Tekst z pola → grosze. `null` znaczy „to nie jest jeszcze liczba,
 * NIE ruszaj zapisanej ceny" — tak wygląda stan w połowie pisania
 * („199,”, „”, „,”). Przecinek i kropka są równoważne.
 */
export function naGrosze(tekst: string): number | null {
  const oczyszczony = tekst.trim().replace(",", ".");
  if (oczyszczony === "" || oczyszczony === ".") return null;
  if (!/^\d*\.?\d*$/.test(oczyszczony)) return null;
  const zlote = Number(oczyszczony);
  if (!Number.isFinite(zlote) || zlote < 0) return null;
  // grosze jako int — bez 19989.999999 z arytmetyki zmiennoprzecinkowej
  return Math.round(zlote * 100);
}
