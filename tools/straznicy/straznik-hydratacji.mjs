/**
 * Strażnik hydratacji: skrypt mutujący <html> przed hydratacją wymaga
 * tłumika suppressHydrationWarning.
 *
 * PO CO. Realny błąd z bramki B5 (rejestr/znane-bledy.json: BLAD-001):
 * inline skrypt wyłącznika animacji dokłada klasę `js` do <html> ZANIM
 * React zhydratuje drzewo — atrybut po stronie klienta różni się wtedy
 * od HTML z serwera i konsola świeci błędem hydratacji na każdej
 * stronie. Strona główna używa tego samego skryptu i dlatego jej <html>
 * ma suppressHydrationWarning; przy portowaniu łatwo go zgubić — raz
 * już się to stało.
 *
 * CO ŁAPIE: app/layout.tsx, który zawiera mutację documentElement
 * (classList.add w inline skrypcie), ale nie zawiera
 * suppressHydrationWarning.
 *
 * Użycie: node tools/straznicy/straznik-hydratacji.mjs
 */
import { existsSync, readFileSync } from "node:fs";

const LAYOUT = "app/layout.tsx";
const bledy = [];

if (existsSync(LAYOUT)) {
  const tresc = readFileSync(LAYOUT, "utf8");
  const mutujeHtml = /documentElement|classList\.add\(/.test(tresc);
  if (mutujeHtml && !tresc.includes("suppressHydrationWarning")) {
    bledy.push(
      `${LAYOUT}: inline skrypt mutuje <html> przed hydratacją, a <html> nie ma suppressHydrationWarning — wróci błąd hydratacji (BLAD-001).`
    );
  }
}

if (bledy.length > 0) {
  console.error("straznik-hydratacji:");
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}
