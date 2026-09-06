/**
 * Strażnik wersji: README musi mówić prawdę o wersji projektu.
 *
 * Źródłem prawdy jest najnowszy wpis w CHANGELOG.md (pierwszy nagłówek
 * `## [X.Y.Z]`). Strażnik pilnuje, żeby:
 *
 *   1. CHANGELOG.md istniał i miał poprawny wpis wersji,
 *   2. README.md deklarował DOKŁADNIE tę samą wersję,
 *   3. wpis w CHANGELOG miał datę (format ## [X.Y.Z] — RRRR-MM-DD).
 *
 * PO CO. Właściciel wymaga, żeby README było „zawsze świeże i zgodne
 * z prawdą". Rozjazd wersji to najłatwiejszy do wykrycia symptom
 * nieaktualnego README — i najczęstszy, bo o podbiciu wersji w dwóch
 * miejscach naraz łatwo zapomnieć przy wydaniu.
 *
 * Użycie: node tools/straznicy/straznik-wersji.mjs
 */
import { existsSync, readFileSync } from "node:fs";

const bledy = [];

let changelog = "";
try {
  changelog = readFileSync("CHANGELOG.md", "utf8");
} catch {
  bledy.push("Brak CHANGELOG.md w korzeniu repo.");
}

let wersja = null;
if (changelog) {
  const m = changelog.match(/^## \[(\d+\.\d+\.\d+)\] — (\d{4}-\d{2}-\d{2})/m);
  if (!m) {
    bledy.push(
      "CHANGELOG.md: brak wpisu w formacie `## [X.Y.Z] — RRRR-MM-DD`."
    );
  } else {
    wersja = m[1];
  }
}

if (wersja) {
  const readme = readFileSync("README.md", "utf8");
  if (!readme.includes(`**${wersja}**`)) {
    bledy.push(
      `README.md nie deklaruje bieżącej wersji **${wersja}** z CHANGELOG.md — zaktualizuj tabelę „Stan projektu".`
    );
  }
}

/* ————————————————————————————————————————————————————————————————————————
 * WERSJE WTYCZEK I MINIMALNY WORDPRESS — jedna prawda w kilkunastu miejscach.
 *
 * Dwa osobne rozjazdy, oba zmierzone 2026-09-05:
 *
 * 1. `Version:` w nagłówku wtyczki a `Stable tag:` w jej `readme.txt` nie
 *    pilnował NIKT. Nazwa paczki dla klienta bierze się z nagłówka, więc dwa
 *    różne wydania potrafiły wyjść jako TEN SAM plik `aai-sklep-0.6.0.zip` —
 *    klient nie ma jak odróżnić, co dostał.
 *
 * 2. `Requires at least: 6.5` stało w DWUNASTU miejscach i było NIEPRAWDĄ.
 *    Nasze wtyczki może i ruszyłyby na 6.5, ale WYMAGAJĄ WooCommerce i Tutora,
 *    a Woo 11.0.1 wymaga WordPressa 6.9. Obietnica „6.5+" była niewykonalna
 *    u obcego klienta — i to ta sama liczba, przez którą `postaw.sh` przerywał
 *    instalację (najnowsze Woo żąda WP 7.0 przy obrazie 6.9.4).
 *
 * Reguła NIE zna „słusznej" wartości — pyta o ZGODNOŚĆ wszystkich miejsc.
 * Dzięki temu podniesienie progu jest jedną świadomą decyzją, a nie serią
 * poprawek, z której zawsze wypada ta w schemacie albo w instrukcji.
 * Ma samokontrolę zakresu: mniej znalezisk, niż jest wtyczek, to błąd.
 */
{
  const WTYCZKI = ["aai-sklep", "aai-platnosci", "aai-monitor"];
  const progi = [];
  let wtyczekZnalezionych = 0;

  for (const nazwa of WTYCZKI) {
    const glowny = `wordpress/wtyczki/${nazwa}/${nazwa}.php`;
    const readme = `wordpress/wtyczki/${nazwa}/readme.txt`;
    if (!existsSync(glowny) || !existsSync(readme)) {
      bledy.push(`${nazwa}: brak pliku głównego albo readme.txt — nie mam czego porównać.`);
      continue;
    }
    wtyczekZnalezionych += 1;
    const g = readFileSync(glowny, "utf8");
    const r = readFileSync(readme, "utf8");

    const wersjaWtyczki = g.match(/^ \* Version:\s*(\S+)/m)?.[1] ?? null;
    const stableTag = r.match(/^Stable tag:\s*(\S+)/m)?.[1] ?? null;
    if (!wersjaWtyczki || !stableTag) {
      bledy.push(`${nazwa}: nie znalazłem „Version:" (${wersjaWtyczki}) albo „Stable tag:" (${stableTag}) — bez nich ta reguła przechodzi po pustce.`);
    } else if (wersjaWtyczki !== stableTag) {
      bledy.push(
        `${nazwa}: nagłówek wtyczki mówi Version ${wersjaWtyczki}, a readme.txt Stable tag ${stableTag}. Nazwa paczki dla klienta bierze się z nagłówka, więc dwa różne wydania wyjdą jako TEN SAM plik ZIP i nikt ich nie odróżni.`
      );
    }

    for (const [plik, tresc] of [[glowny, g], [readme, r]]) {
      for (const m of tresc.matchAll(/Requires at least:\s*(\d+\.\d+)/g)) progi.push([plik, m[1]]);
      for (const m of tresc.matchAll(/WordPress (\d+\.\d+)\+/g)) progi.push([plik, m[1]]);
    }
  }

  for (const plik of ["docs/INSTRUKCJA-INSTALACJI.md", "docs/plugin-1/schematy.drawio", "docs/schematy/plugin-1-techniczny.svg"]) {
    if (!existsSync(plik)) continue;
    const t = readFileSync(plik, "utf8");
    for (const m of t.matchAll(/WordPress w wersji (\d+\.\d+) lub nowszej/g)) progi.push([plik, m[1]]);
    for (const m of t.matchAll(/WP (\d+\.\d+)\+/g)) progi.push([plik, m[1]]);
  }

  if (wtyczekZnalezionych !== WTYCZKI.length) {
    bledy.push(`znalazłem ${wtyczekZnalezionych} z ${WTYCZKI.length} wtyczek — reguła zgodności wersji nie objęła wszystkich.`);
  }
  if (progi.length < 10) {
    bledy.push(
      `deklaracji minimalnego WordPressa znalazłem ${progi.length}, a jest ich kilkanaście. Samokontrola zakresu: reguła, która nie trafia w mierzone miejsca, przechodzi PO PUSTCE — najczęstszy sposób, w jaki bramka tego repozytorium przestawała cokolwiek znaczyć.`
    );
  }
  const rozne = [...new Set(progi.map(([, w]) => w))];
  if (rozne.length > 1) {
    const gdzie = progi.map(([p, w]) => `${p} → ${w}`).join("; ");
    bledy.push(
      `minimalna wersja WordPressa deklarowana jest niejednakowo (${rozne.join(", ")}): ${gdzie}. Nasze wtyczki WYMAGAJĄ WooCommerce i Tutora, więc próg jest tak wysoki jak ich — obietnica niższa jest niewykonalna u klienta.`
    );
  }
}

if (bledy.length > 0) {
  console.error("straznik-wersji:");
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}
