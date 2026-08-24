/**
 * Pretest: upewnia się, że kontener bazy pod testy STOI, zanim
 * node --test ruszy.
 *
 * PO CO. `npm test` bez działającej bazy nie jest czerwony, tylko CICHO
 * POMIJA testy integracyjne — łatwo wziąć taki przebieg za dowód. Do tej
 * pory trzeba było pamiętać o `npm run db1:up` (README + pamięć),
 * a po restarcie maszyny kontener nie wstaje sam. Ten skrypt zamyka
 * lukę: `npm test` = jedna komenda, która działa.
 *
 * GRANICA (WYTYCZNE §8 pilnowana przez straznik-granic): z BAZĄ rozmawia
 * wyłącznie dział w modules/. Ten skrypt bazy NIE dotyka — rozmawia
 * z PODMANEM o kontenerze, a adres portu bierze z docker-compose.yml
 * (źródło prawdy o kontenerze), nie z konfiguracji aplikacji.
 *
 * CO ROBI:
 *   1. Brak `.env` → wychodzi po cichu: środowisko nieskonfigurowane,
 *      testy same powiedzą, że część integracyjna jest pomijana
 *      (świadome zachowanie z D2 — nie zmieniamy go).
 *   2. Czyta port usługi db1 z docker-compose.yml.
 *   3. Port odpowiada → nic do roboty (lokalny kontener ALBO usługa
 *      postgres w CI — obie kończą się tu).
 *   4. Port milczy i jest `podman` → `podman compose up -d db1`
 *      i czekanie, aż Postgres przyjmie połączenie TCP (do ~30 s).
 *      Braku podmana NIE maskuje — mówi wprost, co uruchomić.
 */
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { connect } from "node:net";

if (!existsSync(".env")) process.exit(0); // patrz nagłówek, punkt 1

function portDb1ZCompose() {
  if (!existsSync("docker-compose.yml")) return null;
  const tekst = readFileSync("docker-compose.yml", "utf8");
  // szukamy pierwszego mapowania portów po nagłówku usługi db1
  const odDb1 = tekst.slice(tekst.indexOf("db1:"));
  const m = /-\s*["']?(\d+):\d+["']?/.exec(odDb1);
  return m ? Number(m[1]) : null;
}

function portOdpowiada(port, timeoutMs = 700) {
  return new Promise((resolve) => {
    const gniazdo = connect({ host: "127.0.0.1", port, timeout: timeoutMs });
    gniazdo.once("connect", () => { gniazdo.destroy(); resolve(true); });
    gniazdo.once("timeout", () => { gniazdo.destroy(); resolve(false); });
    gniazdo.once("error", () => resolve(false));
  });
}

const port = portDb1ZCompose();
if (!port) process.exit(0); // brak compose = nie nasze środowisko, nie zgadujemy

if (await portOdpowiada(port)) process.exit(0);

const jestPodman = spawnSync("podman", ["--version"], { stdio: "ignore" }).status === 0;
if (!jestPodman) {
  console.error(
    `db1-gotowa: baza na porcie ${port} nie odpowiada, a podmana nie ma — uruchom bazę ręcznie i powtórz npm test.`,
  );
  process.exit(1);
}

console.log("db1-gotowa: baza nie odpowiada — podnoszę kontener (podman compose up -d db1)…");
const start = spawnSync("podman", ["compose", "up", "-d", "db1"], { stdio: "inherit" });
if (start.status !== 0) process.exit(start.status ?? 1);

for (let i = 0; i < 30; i++) {
  if (await portOdpowiada(port)) {
    console.log("db1-gotowa: baza przyjmuje połączenia.");
    process.exit(0);
  }
  await new Promise((r) => setTimeout(r, 1000));
}
console.error("db1-gotowa: kontener wstał, ale Postgres nie przyjął połączenia w 30 s.");
process.exit(1);
