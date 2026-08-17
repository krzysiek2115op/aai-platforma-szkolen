import { Pool } from "pg";

/**
 * Jedyny klient bazy db1_kursy w całym projekcie.
 *
 * Moduł m1-sklep jest jedyną warstwą z dostępem do SQL (WYTYCZNE §8,
 * przepływ BAZA → DZIAŁ → STRONA) — każdy inny import pg albo użycie
 * DB1_URL poza modules/ zatrzymuje straznik-granic.
 */
let pool: Pool | undefined;

/**
 * Pula połączeń tworzona leniwie — build Next.js nie wymaga bazy.
 * Zmienna środowiskowa czytana przy TWORZENIU puli (nie przy imporcie
 * modułu): testy mogą najpierw przełączyć proces na bazę testową
 * (db/testowa-baza.ts), zanim powstanie pierwsze połączenie.
 */
export function pulaDb1(): Pool {
  const url = process.env.DB1_URL;
  if (!url) {
    throw new Error(
      "Brak DB1_URL w środowisku — skopiuj .env.example do .env (baza: podman compose up -d db1)."
    );
  }
  pool ??= new Pool({ connectionString: url, max: 10 });
  return pool;
}

/** Zamyka pulę (testy, skrypty CLI). */
export async function zamknijDb1(): Promise<void> {
  await pool?.end();
  pool = undefined;
}
