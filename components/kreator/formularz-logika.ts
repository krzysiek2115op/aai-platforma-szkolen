/**
 * Czysta logika formularza kursu — slug i tłumaczenie błędów.
 *
 * Osobno od komponentu, bo to reguły, na których da się przewrócić
 * pracę właściciela (patrz testy obok), a funkcji zamkniętej w pliku
 * .tsx nie da się nawet zaimportować do testu bez budowania JSX-a.
 */

const ZNAKI: Record<string, string> = {
  ą: "a", ć: "c", ę: "e", ł: "l", ń: "n", ó: "o", ś: "s", ź: "z", ż: "z",
};

/** Tytuł → slug: właściciel nie musi go wymyślać ręcznie. */
export function slugZTytulu(tytul: string): string {
  return tytul
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (z) => ZNAKI[z] ?? z)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

/**
 * Slug w trakcie RĘCZNEGO pisania: bez ucinania końcowego myślnika.
 * Pełna normalizacja przy każdym znaku nie pozwalała wpisać myślnika
 * w ogóle — „moj-" natychmiast wracało jako „moj", więc z „moj-kurs"
 * robiło się „mojkurs". Końcówkę przycinamy przy opuszczeniu pola.
 */
export function slugWTrakcie(tekst: string): string {
  return tekst
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (z) => ZNAKI[z] ?? z)
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, 120);
}

/**
 * Ścieżki błędów z dyspozytora mówią o POZYCJI sekcji w wysłanej
 * tablicy („sections.0.content.obietnica"), a panel myśli rodzajami
 * („sections.hero.obietnica"). Tłumaczymy je tam, gdzie znamy
 * kolejność wysyłki — inaczej komunikat „popraw zaznaczone pola"
 * nie zaznaczał niczego.
 */
export function przemapujBledySekcji(
  bledy: Record<string, string>,
  kolejnosc: string[]
): Record<string, string> {
  const wynik: Record<string, string> = {};
  for (const [klucz, wiadomosc] of Object.entries(bledy)) {
    const dopasowanie = klucz.match(/^sections\.(\d+)\.content\.(.+)$/);
    const rodzaj = dopasowanie ? kolejnosc[Number(dopasowanie[1])] : undefined;
    wynik[rodzaj ? `sections.${rodzaj}.${dopasowanie![2]}` : klucz] = wiadomosc;
  }
  return wynik;
}
