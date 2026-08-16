/**
 * Strażnik migracji: numerowane, bez dziur, niezmienne po fakcie.
 *
 * PO CO. Migracje czystym SQL są źródłem prawdy o schemacie. Historia
 * ma sens tylko wtedy, gdy jest liniowa (numeracja bez dziur) i gdy raz
 * scalony plik nigdy się nie zmienia — inaczej dwie kopie bazy „po tych
 * samych migracjach" mają różne schematy. Warstwa druga tej ochrony
 * działa w bazie: runner (modules/mX-.../db/migruj.ts) trzyma sha256
 * w tabeli _migracje i odmawia pracy przy rozjeździe.
 *
 * CO ŁAPIE (dla każdego katalogu modules/*\/db/migrations):
 *   1. plik nie pasuje do wzorca NNN-nazwa.sql,
 *   2. numeracja nie zaczyna się od 001 albo ma dziury/duplikaty,
 *   3. sha256 pliku różni się od zapisu w MANIFEST.json (modyfikacja
 *      po fakcie) albo pliku brakuje w manifeście / manifest ma
 *      wpis-widmo bez pliku.
 *
 * Nowa/zmieniona ŚWIADOMIE migracja (przed scaleniem!):
 *   node tools/straznicy/straznik-migracji.mjs --zapisz
 * przelicza manifest. Zmianę scalonych plików wyłapie code review
 * (diff manifestu) oraz runner na każdej istniejącej bazie.
 *
 * Użycie: node tools/straznicy/straznik-migracji.mjs [--zapisz]
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const bledy = [];
const zapisz = process.argv.includes("--zapisz");

const MODULES = "modules";
const katalogi = existsSync(MODULES)
  ? readdirSync(MODULES)
      .map((m) => join(MODULES, m, "db", "migrations"))
      .filter((k) => existsSync(k))
  : [];

for (const katalog of katalogi) {
  const pliki = readdirSync(katalog)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const numery = [];
  const sumy = {};
  for (const plik of pliki) {
    const m = plik.match(/^(\d{3})-[\w-]+\.sql$/);
    if (!m) {
      bledy.push(`${katalog}/${plik}: nazwa poza wzorcem NNN-nazwa.sql.`);
      continue;
    }
    numery.push(Number(m[1]));
    sumy[plik] = createHash("sha256")
      .update(readFileSync(join(katalog, plik)))
      .digest("hex");
  }

  numery.forEach((n, i) => {
    if (n !== i + 1) {
      bledy.push(
        `${katalog}: numeracja ma dziurę/duplikat przy ${String(n).padStart(3, "0")} (oczekiwano ${String(i + 1).padStart(3, "0")}).`
      );
    }
  });

  const sciezkaManifestu = join(katalog, "MANIFEST.json");
  if (zapisz) {
    writeFileSync(sciezkaManifestu, JSON.stringify(sumy, null, 2) + "\n");
    console.log(`straznik-migracji: zapisano ${sciezkaManifestu}`);
    continue;
  }

  if (!existsSync(sciezkaManifestu)) {
    bledy.push(`${katalog}: brak MANIFEST.json — wygeneruj: node tools/straznicy/straznik-migracji.mjs --zapisz`);
    continue;
  }
  const manifest = JSON.parse(readFileSync(sciezkaManifestu, "utf8"));
  for (const [plik, suma] of Object.entries(sumy)) {
    if (!(plik in manifest)) {
      bledy.push(`${katalog}/${plik}: brak w MANIFEST.json (nowa migracja bez --zapisz).`);
    } else if (manifest[plik] !== suma) {
      bledy.push(
        `${katalog}/${plik}: sha256 różni się od MANIFEST.json — migracja zmieniona po fakcie; cofnij zmianę, nowy schemat = nowy plik.`
      );
    }
  }
  for (const plik of Object.keys(manifest)) {
    if (!(plik in sumy)) {
      bledy.push(`${katalog}: MANIFEST.json ma wpis-widmo „${plik}" bez pliku.`);
    }
  }
}

if (bledy.length > 0) {
  console.error("straznik-migracji:");
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}
