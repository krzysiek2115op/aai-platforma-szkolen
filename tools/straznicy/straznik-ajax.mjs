/**
 * Strażnik AJAX: jedna baza = JEDEN wystrzał (WYTYCZNE §8).
 *
 * PO CO. Z jednej bazy danych idzie tylko jeden kanał AJAX — dyspozytor.
 * Każdy dodatkowy endpoint to drugi punkt awarii, druga walidacja
 * i drugi log; wytyczna zabrania ich wprost. Obok wolno istnieć TYLKO
 * kanałowi JSON (odczyt serwerowy w renderowaniu — to nie jest AJAX).
 *
 * CO ŁAPIE (w plikach route.* pod app/api/ — także w wariancie
 * `route.serwer.ts`, patrz niżej):
 *   1. więcej niż JEDEN plik route importujący z danego modułu
 *      (modules/mX-…) — czyli drugi endpoint AJAX tego samego pluginu,
 *   2. plik route nieprzypisany do żadnego modułu (endpoint-sierota:
 *      API poza działem nie ma prawa istnieć — logika żyje w modułach).
 *
 * WARIANTY TRYBU. Od trybu podglądu statycznego jedyny AJAX nazywa się
 * `route.serwer.ts` — rozszerzenie `serwer.*` wyklucza go z eksportu
 * (next.config.ts). Wzorzec nazwy MUSI to obejmować: gdyby został na
 * samym `route.ts`, strażnik nie znalazłby ani jednego endpointu
 * i przeszedłby PUSTO — czyli wyglądałby dokładnie tak samo jak wtedy,
 * gdy naprawdę nie ma nic do zgłoszenia. Dokładnie ta pułapka zdarzyła
 * się przy wprowadzaniu podglądu i dlatego stoi tu ten akapit.
 *
 * Dopóki nie ma katalogu app/api, strażnik przechodzi.
 *
 * Użycie: node tools/straznicy/straznik-ajax.mjs
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const API = join("app", "api");
const bledy = [];

function trasy(katalog) {
  const wynik = [];
  for (const nazwa of readdirSync(katalog)) {
    const pelna = join(katalog, nazwa);
    if (statSync(pelna).isDirectory()) wynik.push(...trasy(pelna));
    else if (/^route(\.(serwer|statyczny))?\.(ts|tsx|js|jsx|mjs)$/.test(nazwa))
      wynik.push(pelna);
  }
  return wynik;
}

if (existsSync(API)) {
  const endpointyModulu = new Map(); // modul -> [pliki route]

  for (const plik of trasy(API)) {
    const tresc = readFileSync(plik, "utf8");
    const moduly = new Set(
      [...tresc.matchAll(
        /(?:from\s+["']|require\(\s*["'])(?:@\/)?(?:\.\.\/)*modules\/(m\d+-[\w-]+)/g
      )].map((m) => m[1])
    );

    if (moduly.size === 0) {
      bledy.push(
        `${relative(".", plik)}: endpoint bez modułu — API pluginu przechodzi przez dyspozytor działu (modules/mX-…).`
      );
    }
    for (const modul of moduly) {
      const lista = endpointyModulu.get(modul) ?? [];
      lista.push(relative(".", plik));
      endpointyModulu.set(modul, lista);
    }
  }

  for (const [modul, pliki] of endpointyModulu) {
    if (pliki.length > 1) {
      bledy.push(
        `moduł ${modul} ma ${pliki.length} endpointy AJAX (${pliki.join(", ")}) — WYTYCZNE §8: jedna baza = JEDEN wystrzał.`
      );
    }
  }
}

if (bledy.length > 0) {
  console.error("straznik-ajax:");
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}
