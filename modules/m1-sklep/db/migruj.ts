import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { PoolClient } from "pg";
import { pulaDb1, zamknijDb1 } from "./klient.ts";

/**
 * Runner migracji bazy db1_kursy — czysty SQL, bez ORM (decyzja z PLAN).
 *
 * Zasady (pilnowane też przez straznik-migracji):
 *  - pliki migrations/NNN-nazwa.sql, numeracja od 001 bez dziur,
 *  - migracja raz scalona jest NIEZMIENNA — runner trzyma sha256
 *    w tabeli _migracje i odmawia pracy, gdy plik się zmienił,
 *  - każda migracja wchodzi w transakcji; awaria = pełny rollback.
 *
 * Użycie: npm run db1:migruj  (baza: podman compose up -d db1)
 */

const KATALOG = join(dirname(fileURLToPath(import.meta.url)), "migrations");

export type Migracja = { nazwa: string; sql: string; sha256: string };

export function wczytajMigracje(): Migracja[] {
  return readdirSync(KATALOG)
    .filter((f) => /^\d{3}-[\w-]+\.sql$/.test(f))
    .sort()
    .map((nazwa) => {
      const sql = readFileSync(join(KATALOG, nazwa), "utf8");
      return {
        nazwa,
        sql,
        sha256: createHash("sha256").update(sql).digest("hex"),
      };
    });
}

export async function migruj(klient: PoolClient): Promise<string[]> {
  await klient.query(`
    CREATE TABLE IF NOT EXISTS _migracje (
      nazwa      text PRIMARY KEY,
      sha256     text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const zastosowane = new Map<string, string>(
    (await klient.query("SELECT nazwa, sha256 FROM _migracje")).rows.map(
      (r: { nazwa: string; sha256: string }) => [r.nazwa, r.sha256]
    )
  );

  const wykonane: string[] = [];
  for (const m of wczytajMigracje()) {
    const znany = zastosowane.get(m.nazwa);
    if (znany) {
      if (znany !== m.sha256) {
        throw new Error(
          `Migracja ${m.nazwa} zmieniona po zastosowaniu (sha256 nie zgadza się z _migracje) — cofnij zmianę; nowy schemat = nowy plik.`
        );
      }
      continue;
    }
    await klient.query("BEGIN");
    try {
      await klient.query(m.sql);
      await klient.query(
        "INSERT INTO _migracje (nazwa, sha256) VALUES ($1, $2)",
        [m.nazwa, m.sha256]
      );
      await klient.query("COMMIT");
      wykonane.push(m.nazwa);
    } catch (blad) {
      await klient.query("ROLLBACK");
      throw new Error(`Migracja ${m.nazwa} nie przeszła: ${String(blad)}`);
    }
  }
  return wykonane;
}

// Uruchomienie z CLI (import w testach nie odpala migracji).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const klient = await pulaDb1().connect();
  try {
    const wykonane = await migruj(klient);
    console.log(
      wykonane.length > 0
        ? `Zastosowano: ${wykonane.join(", ")}`
        : "Baza aktualna — nic do zastosowania."
    );
  } finally {
    klient.release();
    await zamknijDb1();
  }
}
