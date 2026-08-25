import { Client } from "pg";

/**
 * Przełącza BIEŻĄCY proces na osobną bazę testową (`<nazwa>_test`).
 *
 * PO CO. Testy stawiają schemat od zera (DROP SCHEMA public CASCADE) —
 * na wspólnej bazie dev skasowały właścicielowi zasiane kursy i katalog
 * świecił pustką (rejestr/znane-bledy.json: BLAD-002). Testy dostają
 * więc własną bazę, a dane dev są nietykalne.
 *
 * Tworzy bazę testową, jeśli nie istnieje, i podmienia process.env.DB1_URL
 * — wywołać PRZED pierwszym użyciem pulaDb1() (pula czyta env leniwie).
 * Zwraca nazwę bazy testowej.
 */
export async function przelaczNaBazeTestowa(): Promise<string> {
  const url = process.env.DB1_URL;
  if (!url) throw new Error("Brak DB1_URL — testów nie ma na czym uruchomić.");

  const parsowany = new URL(url);
  const bazaDev = parsowany.pathname.replace(/^\//, "");
  const bazaTestowa = bazaDev.endsWith("_test") ? bazaDev : `${bazaDev}_test`;

  if (bazaDev !== bazaTestowa) {
    const admin = new Client({ connectionString: url });
    await admin.connect();
    const identyfikator = `"${bazaTestowa.replaceAll('"', '""')}"`;
    try {
      await admin.query(`CREATE DATABASE ${identyfikator}`);
    } catch (blad) {
      // 42P04 = baza już istnieje — to stan oczekiwany
      if ((blad as { code?: string }).code !== "42P04") throw blad;
    } finally {
      await admin.end();
    }
    parsowany.pathname = `/${bazaTestowa}`;
    process.env.DB1_URL = parsowany.toString();
  }
  return bazaTestowa;
}

/**
 * Bezpiecznik przed powtórką BLAD-002: niszczące operacje testów wolno
 * wykonywać wyłącznie na bazie `*_test`.
 */
export function upewnijSieZeBazaTestowa(nazwaBazy: string): void {
  if (!nazwaBazy.endsWith("_test")) {
    throw new Error(
      `Odmowa: operacja niszcząca na bazie „${nazwaBazy}" — testom wolno tylko na *_test.`
    );
  }
}
