import { Pool } from "pg";

/**
 * Jedyny klient bazy db1_kursy w całym projekcie.
 *
 * Moduł m1-sklep jest jedyną warstwą z dostępem do SQL (WYTYCZNE §8,
 * przepływ BAZA → DZIAŁ → STRONA) — każdy inny import pg albo użycie
 * DB1_URL poza modules/ zatrzymuje straznik-granic.
 */
const DB1_URL = process.env.DB1_URL;

let pool: Pool | undefined;

/** Pula połączeń tworzona leniwie — build Next.js nie wymaga bazy. */
export function pulaDb1(): Pool {
  if (!DB1_URL) {
    throw new Error(
      "Brak DB1_URL w środowisku — skopiuj .env.example do .env (baza: podman compose up -d db1)."
    );
  }
  pool ??= new Pool({ connectionString: DB1_URL, max: 10 });
  return pool;
}

/** Zamyka pulę (testy, skrypty CLI). */
export async function zamknijDb1(): Promise<void> {
  await pool?.end();
  pool = undefined;
}
