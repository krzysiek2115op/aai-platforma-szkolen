/**
 * Strażnik `position: fixed`: klasa opakowująca całą treść strony nie może
 * animować transformu.
 *
 * PO CO. Realny błąd z bramki B5 (rejestr/znane-bledy.json: BLAD-003):
 * `@keyframes page-enter` animowały `transform: translateY(10px)`, a klasa
 * `.page-enter` z app/template.tsx owija CAŁĄ treść każdej podstrony.
 * Element z animowanym transformem staje się układem odniesienia dla
 * `position: fixed` potomków — pasek menu kursu przewijał się razem
 * ze stroną i znikał po zescrollowaniu w dół, a tło strony kursu
 * przestawało trzymać się okna. Objaw był mylący, bo navbar z layoutu
 * (poza template) działał normalnie.
 *
 * CO ŁAPIE: `transform`, `filter`, `perspective`, `backdrop-filter`
 * i `will-change` odwołujące się do tych właściwości wewnątrz klatek
 * animacji używanych przez klasy-opakowania treści (page-enter), oraz
 * te same właściwości ustawione wprost na regule `.page-enter`.
 *
 * Użycie: node tools/straznicy/straznik-fixed.mjs
 */
import { existsSync, readFileSync } from "node:fs";

const CSS = "app/globals.css";
/** klasy, które opakowują całą treść strony (app/template.tsx, layout) */
const OPAKOWANIA = ["page-enter"];
const ZAKAZANE = /(^|[\s;{])(transform|filter|perspective|backdrop-filter)\s*:/;

const bledy = [];

if (existsSync(CSS)) {
  const css = readFileSync(CSS, "utf8");

  for (const klasa of OPAKOWANIA) {
    // blok @keyframes <klasa> { ... }
    const klatki = css.match(
      new RegExp(`@keyframes\\s+${klasa}\\s*\\{[\\s\\S]*?\\n\\}`, "m")
    )?.[0];
    if (klatki && ZAKAZANE.test(klatki)) {
      bledy.push(
        `${CSS}: @keyframes ${klasa} animuje transform/filter/perspective — element opakowujący treść stanie się układem odniesienia dla position: fixed i pasek menu kursu znów zniknie przy scrollu (BLAD-003).`
      );
    }

    // reguły .<klasa> { ... } (także z prefiksem, np. html.js .page-enter)
    const reguly = css.matchAll(
      new RegExp(`[^{}]*\\.${klasa}\\b[^{}]*\\{([^}]*)\\}`, "g")
    );
    for (const [, cialo] of reguly) {
      if (ZAKAZANE.test(cialo) || /will-change\s*:[^;]*(transform|filter)/.test(cialo)) {
        bledy.push(
          `${CSS}: reguła .${klasa} ustawia transform/filter/perspective/will-change — to samo łamie position: fixed potomków (BLAD-003).`
        );
      }
      // BLAD-004: animacja wypełniana (forwards/both) stosuje swoją
      // wartość TAKŻE po zakończeniu, więc kontekst układania od
      // `opacity` zostaje na stałe. Fixed potomek jest w nim zamknięty
      // i przegrywa z późniejszym rodzeństwem (stopka) — bez szans
      // na ratunek z-indexem.
      if (/animation[^;]*\b(forwards|both)\b/.test(cialo)) {
        bledy.push(
          `${CSS}: reguła .${klasa} ma animację z wypełnieniem forwards/both — kontekst układania zostaje po animacji i chowa potomków position: fixed pod stopką (BLAD-004). Użyj wypełnienia "backwards".`
        );
      }
      if (/animation-fill-mode\s*:[^;]*\b(forwards|both)\b/.test(cialo)) {
        bledy.push(
          `${CSS}: reguła .${klasa} ustawia animation-fill-mode: forwards/both — patrz BLAD-004.`
        );
      }
    }
  }
}

if (bledy.length > 0) {
  console.error("straznik-fixed:");
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}
