/**
 * Strażnik linków: względne linki w plikach Markdown muszą prowadzić
 * do istniejących plików.
 *
 * PO CO. README i dokumentacja mają być „zawsze zgodne z prawdą" — link
 * do pliku, którego nie ma (bo został przeniesiony albo jeszcze nie
 * powstał), to dokumentacja, która kłamie. Martwy link wygląda w podglądzie
 * identycznie jak żywy; wykrywa go dopiero kliknięcie albo ten strażnik.
 *
 * Sprawdza wyłącznie linki względne (`[x](docs/PLAN.md)`); adresów
 * http(s) i kotwic `#sekcja` nie dotyka — ich weryfikacja wymaga sieci
 * i nie jest zadaniem na pre-commit.
 *
 * POMIJA KOD. Bloki ```…``` i kod inline `…` nie są sprawdzane: tam
 * zapis `[tekst](sciezka)` jest PRZYKŁADEM składni Markdowna, a nie
 * linkiem — nie da się go kliknąć, więc nie może zgnić. Bez tego wyjątku
 * scenariusze kursu GitHuba (D7), które UCZĄ pisania linków, nie dałyby
 * się zacommitować.
 *
 * CZEGO NIE SPRAWDZA I DLACZEGO: `docs/dokumentacja-techniczna/` to
 * dokumentacja producentów pobrana z sieci (WYTYCZNE N2) i leży tam
 * DOSŁOWNIE, w postaci, w jakiej ją wydano. Jej linki są absolutne
 * względem serwisu źródłowego (`/en/webhooks/...` u GitHuba), więc jako
 * ścieżki w naszym repo nigdy nie istnieją. Strażnik ma pilnować NASZEJ
 * dokumentacji; „naprawienie" cudzych linków znaczyłoby zmienić oryginał,
 * czego wytyczna zabrania — dlatego ten katalog jest poza zakresem.
 *
 * Użycie: node tools/straznicy/straznik-linkow.mjs
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";

const POMIJANE = new Set(["node_modules", ".git", ".next", "out", "vendor"]);
// Katalog z dosłowną dokumentacją producentów — patrz komentarz wyżej.
const DOKUMENTACJA_OBCA = join("docs", "dokumentacja-techniczna");

function plikiMd(katalog) {
  const wynik = [];
  for (const nazwa of readdirSync(katalog)) {
    if (POMIJANE.has(nazwa)) continue;
    const sciezka = join(katalog, nazwa);
    const s = statSync(sciezka);
    if (s.isDirectory()) wynik.push(...plikiMd(sciezka));
    else if (nazwa.endsWith(".md")) wynik.push(sciezka);
  }
  return wynik;
}

/**
 * Wycina kod, żeby przykłady składni nie były brane za linki. Bloki
 * ogrodzone znikają w całości (wraz z ogrodzeniem o dowolnej długości,
 * bo blok z ```` w środku otacza się dłuższym płotkiem), potem znika kod
 * inline. Zamiast usuwać znaki, wstawiamy spacje — numeracja i tak nie
 * jest tu potrzebna, ale sklejenie sąsiednich zdań mogłoby stworzyć
 * link, którego w pliku nie ma.
 */
function bezKodu(tresc) {
  return tresc
    // `(?![\s\S])` to koniec PLIKU: przy fladze `m` samo `$` znaczyłoby
    // koniec linii i blok urywałby się na pierwszej z nich.
    .replace(/^([ \t]*)(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:\n[ \t]*\2[^\n]*(?=\n|$)|(?![\s\S]))/gm, (b) =>
      b.replace(/[^\n]/g, " "),
    )
    .replace(/(`+)(?!`)[\s\S]*?\1(?!`)/g, (b) => b.replace(/[^\n]/g, " "));
}

const bledy = [];

for (const plik of plikiMd(".")) {
  if (plik.replace(/^\.[/\\]/, "").startsWith(DOKUMENTACJA_OBCA)) continue;
  const tresc = bezKodu(readFileSync(plik, "utf8"));
  // [tekst](cel) — bez obrazków z adresami zewnętrznymi i bez mailto
  for (const m of tresc.matchAll(/\[[^\]]*\]\(([^)#\s]+)(#[^)\s]*)?\)/g)) {
    const cel = m[1];
    if (/^(https?:|mailto:|tel:)/.test(cel)) continue;
    const bezwzgledna = join(dirname(plik), cel);
    if (!existsSync(bezwzgledna)) {
      bledy.push(`${plik}: martwy link → ${cel}`);
    }
  }
}

if (bledy.length > 0) {
  console.error("straznik-linkow:");
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}
