/**
 * Strażnik PODGLĄDU STATYCZNEGO: to, co publiczne, nigdy nie zabierze
 * ze sobą kreatora ani dyspozytora.
 *
 * PO CO. Podgląd (`npm run build:podglad`) trafia do PUBLICZNEGO repo
 * na GitHub Pages, a prototyp ma w sobie panel właściciela i endpoint
 * mutujący bazę. Rozdziela je jedna linijka konfiguracji —
 * `pageExtensions` w next.config.ts — i to jest dokładnie ten rodzaj
 * ochrony, który psuje się bezszelestnie: po pomyłkowej zmianie nazwy
 * pliku build nadal przechodzi na zielono, tylko `out/` zawiera nagle
 * o jedną stronę za dużo. Sprawdzenie „czy plik istnieje" jest tanie,
 * a jego brak kosztowałby wyciek panelu.
 *
 * CZEGO PILNUJE (pięć niezmienników):
 *   1. trasy kreatora i jedyny AJAX są WYŁĄCZNIE w wariancie `serwer.*`
 *      — żadnego gołego `page.tsx`/`route.ts` (weszłoby do eksportu)
 *      ani `statyczny.*` (byłoby to świadome upublicznienie panelu),
 *   2. wariant `statyczny.*` nie istnieje bez pary `serwer.*` — trasa
 *      obecna tylko w podglądzie to trasa, której prototyp nie zna,
 *      a prototyp jest źródłem prawdy,
 *   3. next.config.ts nie miesza list rozszerzeń (tryb serwerowy nie
 *      widzi `statyczny.*`, tryb podglądu nie widzi `serwer.*`),
 *   4. brama kreatora odcina się w podglądzie PRZED sięgnięciem po
 *      ciastko — inaczej build z tokenem w środowisku wypisałby SZKICE
 *      kursów do publicznych plików,
 *   5. `process.env.PODGLAD_STATYCZNY` czytają tylko dwa pliki
 *      (lib/podglad.ts i next.config.ts) — rozjazd między miejscami
 *      dałby build „trochę statyczny", najgorszy z możliwych.
 *
 * Użycie: node tools/straznicy/straznik-podgladu.mjs
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const bledy = [];

/** Nazwy plików tras, w obu wariantach trybu i bez wariantu. */
const TRASA = /^(page|route|layout|template|default)(\.(serwer|statyczny))?\.(tsx?|jsx?|mjs)$/;

/** Wszystkie pliki tras pod danym katalogiem (rekurencyjnie). */
function trasy(katalog) {
  const wynik = [];
  if (!existsSync(katalog)) return wynik;
  for (const nazwa of readdirSync(katalog)) {
    const pelna = join(katalog, nazwa);
    if (statSync(pelna).isDirectory()) wynik.push(...trasy(pelna));
    else if (TRASA.test(nazwa)) wynik.push(pelna);
  }
  return wynik;
}

// --- 1. kreator i AJAX tylko w wariancie serwerowym -----------------
// Te dwa poddrzewa są z definicji serwerowe: panel stoi na ciastku
// HttpOnly i akcjach serwerowych, dyspozytor zmienia bazę. W eksporcie
// nie mają prawa się pojawić w ŻADNEJ postaci.
for (const katalog of [join("app", "szkolenia", "kreator"), join("app", "api")]) {
  for (const plik of trasy(katalog)) {
    const nazwa = plik.split("/").pop();
    if (!nazwa.includes(".serwer.")) {
      bledy.push(
        `${relative(".", plik)}: trasa tylko-serwerowa musi nazywać się „…​.serwer.<rozszerzenie>" — inaczej trafi do publicznego podglądu (next.config.ts, pageExtensions).`
      );
    }
  }
}

// --- 2. wariant statyczny nie istnieje bez serwerowego --------------
for (const plik of trasy("app")) {
  const nazwa = plik.split("/").pop();
  if (!nazwa.includes(".statyczny.")) continue;
  const para = plik.replace(".statyczny.", ".serwer.");
  if (!existsSync(para)) {
    bledy.push(
      `${relative(".", plik)}: wariant podglądu bez pary ${relative(".", para)} — trasa istniałaby tylko w podglądzie, a prototyp serwerowy jest źródłem prawdy.`
    );
  }
}

// --- 3. konfiguracja nie miesza list rozszerzeń ---------------------
const config = readFileSync("next.config.ts", "utf8");
const listy = [...config.matchAll(/pageExtensions:\s*\[([^\]]*)\]/g)].map((m) => m[1]);
if (listy.length !== 2) {
  bledy.push(
    `next.config.ts: oczekiwano DWÓCH list pageExtensions (tryb serwerowy i podgląd), znaleziono ${listy.length} — bez nich rozdział trybów nie istnieje.`
  );
} else {
  const [podglad, serwer] = config.indexOf("output: \"export\"") < config.indexOf("async headers()")
    ? [listy[0], listy[1]]
    : [listy[1], listy[0]];
  if (podglad.includes("serwer."))
    bledy.push("next.config.ts: lista pageExtensions trybu PODGLĄDU zawiera „serwer.” — kreator i AJAX weszłyby do eksportu.");
  if (!podglad.includes("statyczny."))
    bledy.push("next.config.ts: lista pageExtensions trybu PODGLĄDU nie zawiera „statyczny.” — warianty prerenderowane byłyby niewidoczne.");
  if (serwer.includes("statyczny."))
    bledy.push("next.config.ts: lista pageExtensions trybu SERWEROWEGO zawiera „statyczny.” — dwa pliki walczyłyby o tę samą trasę.");
  if (!serwer.includes("serwer."))
    bledy.push("next.config.ts: lista pageExtensions trybu SERWEROWEGO nie zawiera „serwer.” — zniknąłby kreator i jedyny AJAX.");
}

// --- 4. brama kreatora odcina się w podglądzie ----------------------
// Kolejność ma znaczenie: sprawdzenie trybu MUSI paść przed sięgnięciem
// po ciastko — i technicznie (w eksporcie nie ma żądania), i przede
// wszystkim dlatego, że statyczny podgląd jest zawsze widokiem gościa.
const brama = readFileSync(join("lib", "kreator-dostep.ts"), "utf8");
const czyKreator = brama.match(/export async function czyKreator\([^)]*\)[^{]*\{([\s\S]*?)\n\}/);
if (!czyKreator) {
  bledy.push("lib/kreator-dostep.ts: nie znaleziono funkcji czyKreator — brama kreatora zmieniła kształt, popraw strażnika ŚWIADOMIE.");
} else {
  const cialo = czyKreator[1];
  const trybem = cialo.indexOf("PODGLAD_STATYCZNY");
  const ciastkiem = cialo.indexOf("tokenZCiastka");
  if (trybem === -1) {
    bledy.push("lib/kreator-dostep.ts: czyKreator() nie odcina się w podglądzie — build z tokenem w środowisku wpisałby SZKICE kursów do publicznych plików.");
  } else if (ciastkiem !== -1 && trybem > ciastkiem) {
    bledy.push("lib/kreator-dostep.ts: czyKreator() sięga po ciastko PRZED sprawdzeniem trybu podglądu — w eksporcie nie ma żądania, a szkice nie mają prawa wejść do out/.");
  }
}

// --- 5. jedno źródło prawdy o trybie -------------------------------
// Reguła dotyczy KODU APLIKACJI I BUDOWANIA — tam rozjazd trybu robi
// szkodę. Katalog strażników jest z niej wyłączony w całości, bo żeby
// opisać zakazany wzorzec, trzeba go zacytować: strażnik oskarżyłby
// siebie, a audyt mutacyjny — swoją własną mutację.
const WOLNO = new Set(["lib/podglad.ts", "next.config.ts"]);
const KATALOG_STRAZNIKOW = join("tools", "straznicy");
function pliki(katalog, wynik = []) {
  for (const nazwa of readdirSync(katalog)) {
    if (["node_modules", ".next", "out", ".git", "docs", "tresc-kursow"].includes(nazwa)) continue;
    const pelna = join(katalog, nazwa);
    if (statSync(pelna).isDirectory()) pliki(pelna, wynik);
    else if (/\.(tsx?|jsx?|mjs)$/.test(nazwa)) wynik.push(pelna);
  }
  return wynik;
}
for (const plik of pliki(".")) {
  const wzgledna = relative(".", plik);
  if (WOLNO.has(wzgledna) || wzgledna.startsWith(KATALOG_STRAZNIKOW)) continue;
  if (readFileSync(plik, "utf8").includes("process.env.PODGLAD_STATYCZNY")) {
    bledy.push(
      `${wzgledna}: czyta process.env.PODGLAD_STATYCZNY na własną rękę — tryb ma JEDNO źródło prawdy (stała z lib/podglad.ts), inaczej build bywa „trochę statyczny".`
    );
  }
}

if (bledy.length > 0) {
  console.error("straznik-podgladu:");
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}

console.log("straznik-podgladu: podgląd statyczny nie zabiera kreatora ani dyspozytora.");
