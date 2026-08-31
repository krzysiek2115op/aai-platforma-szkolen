import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { PoolClient } from "pg";
import { pulaDb1, zamknijDb1 } from "./klient.ts";
import { migruj } from "./migruj.ts";
import {
  przelaczNaBazeTestowa,
  upewnijSieZeBazaTestowa,
} from "./testowa-baza.ts";

/**
 * Dowód bramki B2: migracje wstają OD ZERA, triggery logują KAŻDĄ
 * operację (create/update/delete, stan przed i po), changelog jest
 * niezmienny, a schemat zgadza się z goldenem (WYTYCZNE §5).
 *
 * Wymaga DB1_URL (lokalnie: .env + `podman compose up -d db1`;
 * w CI: kontener usługi postgres). Bez DB1_URL testy są POMIJANE
 * z komunikatem — ale CI zawsze ustawia DB1_URL, więc tam dowód
 * jest obowiązkowy.
 *
 * Golden schematu: goldeny/d2-schemat.json — odtworzenie po świadomej
 * zmianie schematu (nowa migracja): GOLDEN_ZAPISZ=1 npm test.
 */

const JEST_BAZA = Boolean(process.env.DB1_URL);
const GOLDEN = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../goldeny/d2-schemat.json"
);

let klient: PoolClient;

before(async () => {
  if (!JEST_BAZA) return;
  // osobna baza testowa — dane dev (seedy właściciela) są nietykalne
  upewnijSieZeBazaTestowa(await przelaczNaBazeTestowa());
  klient = await pulaDb1().connect();
  // od zera: czyścimy schemat public i stawiamy wszystko na nowo
  await klient.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await migruj(klient);
});

after(async () => {
  klient?.release();
  await zamknijDb1();
});

test("migracje wstają od zera — wszystkie tabele istnieją", { skip: !JEST_BAZA }, async () => {
  const { rows } = await klient.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' ORDER BY table_name`
  );
  const tabele = rows.map((r: { table_name: string }) => r.table_name);
  assert.deepEqual(tabele, [
    "_migracje",
    "course_changelog",
    "course_lessons",
    "course_modules",
    "course_sections",
    "courses",
  ]);
});

test("ponowny przebieg migracji nic nie zmienia (idempotencja)", { skip: !JEST_BAZA }, async () => {
  assert.deepEqual(await migruj(klient), []);
});

test("audyt: create/update/delete kursu ląduje w changelogu ze stanem przed i po", { skip: !JEST_BAZA }, async () => {
  await klient.query("SET app.actor = 'test-b2'");
  const {
    rows: [kurs],
  } = await klient.query(
    `INSERT INTO courses (slug, title, type, price_grosze)
     VALUES ('kurs-testowy', 'Kurs testowy', 'kurs', 19900) RETURNING id`
  );
  await klient.query("UPDATE courses SET title = 'Kurs testowy v2' WHERE id = $1", [kurs.id]);
  await klient.query("DELETE FROM courses WHERE id = $1", [kurs.id]);

  const { rows: wpisy } = await klient.query(
    `SELECT action, tabela, actor, stan_przed, stan_po
     FROM course_changelog WHERE course_id = $1 ORDER BY id`,
    [kurs.id]
  );
  assert.equal(wpisy.length, 3);

  const [create, update, del] = wpisy;
  assert.equal(create.action, "create");
  assert.equal(create.stan_przed, null);
  assert.equal(create.stan_po.title, "Kurs testowy");
  assert.equal(update.action, "update");
  assert.equal(update.stan_przed.title, "Kurs testowy");
  assert.equal(update.stan_po.title, "Kurs testowy v2");
  assert.equal(del.action, "delete");
  assert.equal(del.stan_po, null);
  for (const w of wpisy) {
    assert.equal(w.tabela, "courses");
    assert.equal(w.actor, "test-b2");
  }
});

test("audyt obejmuje sekcje, moduły i lekcje (lekcja dostaje course_id z lookupu)", { skip: !JEST_BAZA }, async () => {
  const {
    rows: [kurs],
  } = await klient.query(
    `INSERT INTO courses (slug, title, type, price_grosze)
     VALUES ('kurs-struktura', 'Kurs ze strukturą', 'kurs', 9900) RETURNING id`
  );
  await klient.query(
    `INSERT INTO course_sections (course_id, kind, content)
     VALUES ($1, 'hero', '{"naglowek":"x"}')`,
    [kurs.id]
  );
  const {
    rows: [modul],
  } = await klient.query(
    `INSERT INTO course_modules (course_id, position, title)
     VALUES ($1, 0, 'Moduł 1') RETURNING id`,
    [kurs.id]
  );
  await klient.query(
    `INSERT INTO course_lessons (module_id, position, title, duration_min)
     VALUES ($1, 0, 'Lekcja 1', 12)`,
    [modul.id]
  );

  const { rows } = await klient.query(
    `SELECT tabela, count(*)::int AS n FROM course_changelog
     WHERE course_id = $1 AND action = 'create' GROUP BY tabela ORDER BY tabela`,
    [kurs.id]
  );
  assert.deepEqual(rows, [
    { tabela: "course_lessons", n: 1 },
    { tabela: "course_modules", n: 1 },
    { tabela: "course_sections", n: 1 },
    { tabela: "courses", n: 1 },
  ]);
});

test("updated_at aktualizuje się samo przy UPDATE", { skip: !JEST_BAZA }, async () => {
  const {
    rows: [kurs],
  } = await klient.query(
    `INSERT INTO courses (slug, title, type, price_grosze)
     VALUES ('kurs-czas', 'Kurs czasowy', 'kurs', 100)
     RETURNING id, updated_at`
  );
  await klient.query("SELECT pg_sleep(0.01)");
  const {
    rows: [po],
  } = await klient.query(
    `UPDATE courses SET title = 'Zmieniony' WHERE id = $1 RETURNING updated_at`,
    [kurs.id]
  );
  assert.ok(new Date(po.updated_at) > new Date(kurs.updated_at));
});

test("changelog jest niezmienny — UPDATE i DELETE odrzucone", { skip: !JEST_BAZA }, async () => {
  await assert.rejects(
    klient.query("UPDATE course_changelog SET actor = 'falszerz'"),
    /niezmienny/
  );
  await assert.rejects(klient.query("DELETE FROM course_changelog"), /niezmienny/);
});

test("golden schematu: kolumny i triggery zgodne z goldeny/d2-schemat.json", { skip: !JEST_BAZA }, async () => {
  const { rows: kolumny } = await klient.query(
    `SELECT table_name, column_name, data_type, is_nullable, column_default IS NOT NULL AS ma_default
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name != '_migracje'
     ORDER BY table_name, ordinal_position`
  );
  const { rows: triggery } = await klient.query(
    `SELECT event_object_table AS tabela, trigger_name, event_manipulation, action_timing
     FROM information_schema.triggers
     ORDER BY event_object_table, trigger_name, event_manipulation`
  );
  const stan = { kolumny, triggery };

  if (process.env.GOLDEN_ZAPISZ) {
    writeFileSync(GOLDEN, JSON.stringify(stan, null, 2) + "\n");
    return;
  }
  let golden: unknown;
  try {
    golden = JSON.parse(readFileSync(GOLDEN, "utf8"));
  } catch {
    assert.fail(
      "Brak goldenu goldeny/d2-schemat.json — wygeneruj: GOLDEN_ZAPISZ=1 npm test"
    );
  }
  assert.deepEqual(stan, golden);
});
