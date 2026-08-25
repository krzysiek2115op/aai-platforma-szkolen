/**
 * Rig zrzutów potrzebuje `puppeteer-core` i `sharp`. Te paczki NIE wchodzą do
 * package.json projektu — lekcja z D5: narzędzia przeglądarkowe instalujemy
 * w scratchpadzie sesji, nigdy w zależnościach produktu.
 *
 * Instalacja (raz na sesję):
 *   mkdir -p "$ZRZUTY_RIG" && cd "$ZRZUTY_RIG" && npm init -y && npm i puppeteer-core sharp
 * gdzie ZRZUTY_RIG wskazuje katalog w scratchpadzie sesji.
 */
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const KATALOG = process.env.ZRZUTY_RIG;
if (!KATALOG || !existsSync(join(KATALOG, "node_modules"))) {
  console.error(
    "rig zrzutów: ustaw ZRZUTY_RIG na katalog z zainstalowanymi puppeteer-core i sharp.\n" +
      "  mkdir -p \"$ZRZUTY_RIG\" && cd \"$ZRZUTY_RIG\" && npm init -y && npm i puppeteer-core sharp"
  );
  process.exit(2);
}
// Rozwiązujemy przez `exports` paczki, a nie po ścieżce w środku — układ
// katalogów puppeteer-core zmieniał się między wersjami i twarda ścieżka
// pada przy pierwszej aktualizacji.
const wymagaj = createRequire(join(KATALOG, "node_modules", "index.js"));
export const sharp = wymagaj("sharp");
export const puppeteer = (await import(pathToFileURL(wymagaj.resolve("puppeteer-core")).href)).default;
