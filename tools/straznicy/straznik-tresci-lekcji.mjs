/**
 * Strażnik treści lekcji: materiał kursu nie ma prawa wyjść zza bramki.
 *
 * PO CO. Lekcje to TOWAR — kupujący płaci za dostęp do nich po
 * zalogowaniu. Katalog `/szkolenia` i strona sprzedażowa `/szkolenia/[slug]`
 * są publiczne i czytają ten sam wspólny odczyt (`dolozTresc`), a kontrakt
 * `LekcjaKursu` niesie SAMĄ FLAGĘ `ma_tresc`. Wystarczy, że ktoś dołoży
 * `content` do zapytania „bo edytorowi się przyda", żeby tekst 91 lekcji
 * pojechał do publicznego HTML-a przy każdym renderze katalogu — i żeby
 * przy okazji przepadł wynik wydajności z 0.25.0.
 *
 * DLACZEGO STRAŻNIK, A NIE TEST. Test „strona widzi flagę, nigdy tekstu"
 * (modules/m1-sklep/tresc-lekcji.test.ts) dowodzi, że KONTRAKT obcina
 * treść — Zod strippuje nieznane pola. NIE dowodzi, że baza jej nie
 * pobiera: po dołożeniu `content` do `jsonb_build_object` test dalej
 * byłby zielony, a zapytanie ciągnęłoby materiał całego kursu.
 * Uczciwa granica tamtej ochrony była zapisana w
 * docs/plugin-1/KROK-3-KURSY.md jako kandydat na strażnika — to on.
 *
 * CO SPRAWDZA:
 *   1. wspólny odczyt (`dolozTresc`) nie wybiera z lekcji ani `content`,
 *      ani `materials` jako pola wyniku (flaga `ma_tresc` wolno —
 *      to `boolean`, nie tekst),
 *   2. kontrakt `LekcjaKursu` (kształt widziany przez STRONĘ) nie ma pola
 *      `tresc` ani `materialy`,
 *   3. pełną treść oddaje dokładnie JEDNA funkcja odczytu — `trescLekcji`.
 *
 * Użycie: node tools/straznicy/straznik-tresci-lekcji.mjs
 */
import { existsSync, readFileSync } from "node:fs";

const ODCZYT = "modules/m1-sklep/odczyt.ts";
const bledy = [];

if (existsSync(ODCZYT)) {
  const zrodlo = readFileSync(ODCZYT, "utf8");

  // --- 1. wspólny odczyt strony: lekcje bez tekstu ---
  const poczatek = zrodlo.indexOf("async function dolozTresc");
  if (poczatek === -1) {
    bledy.push(
      `${ODCZYT}: nie znaleziono wspólnego odczytu strony (dolozTresc) — strażnik straciłby cel, więc nie przechodzi po cichu.`
    );
  } else {
    const koniec = zrodlo.indexOf("\n}", poczatek);
    const cialo = zrodlo.slice(poczatek, koniec === -1 ? undefined : koniec);
    const lekcje = cialo.slice(cialo.indexOf("jsonb_agg("));

    for (const pole of ["'content'", "'materials'"]) {
      if (lekcje.includes(pole)) {
        bledy.push(
          `${ODCZYT}: wspólny odczyt strony wybiera ${pole} z lekcji — materiał zza logowania pojechałby do publicznego HTML-a katalogu i strony sprzedażowej. Pełny tekst oddaje wyłącznie trescLekcji().`
        );
      }
    }
    if (/l\.materials/.test(lekcje)) {
      bledy.push(
        `${ODCZYT}: wspólny odczyt strony sięga po l.materials — materiały lekcji też są towarem zza bramki.`
      );
    }
  }

  // --- 3. jedno wyjście na pełną treść ---
  const wybieraTresc = [...zrodlo.matchAll(/export async function (\w+)/g)]
    .map((m) => m[1])
    .filter((nazwa) => {
      const start = zrodlo.indexOf(`export async function ${nazwa}`);
      const kolejna = zrodlo.indexOf("\nexport async function", start + 1);
      const cialo = zrodlo.slice(start, kolejna === -1 ? undefined : kolejna);
      return /COALESCE\(l?\.?content|SELECT[^;]*\bcontent\b[^;]*FROM course_lessons/s.test(
        cialo
      );
    });
  if (wybieraTresc.length > 1 || (wybieraTresc[0] && wybieraTresc[0] !== "trescLekcji")) {
    bledy.push(
      `${ODCZYT}: pełną treść lekcji oddaje ${wybieraTresc.join(", ")}, a ma ją oddawać wyłącznie trescLekcji() — jedno wyjście łatwiej upilnować niż trzy.`
    );
  }
}

// --- 2. kontrakt widziany przez stronę ---
if (existsSync("modules/m1-sklep/typy.ts")) {
  const { LekcjaKursu } = await import("../../modules/m1-sklep/typy.ts");
  for (const pole of ["tresc", "materialy", "content", "materials"]) {
    if (pole in LekcjaKursu.def.shape) {
      bledy.push(
        `modules/m1-sklep/typy.ts: LekcjaKursu (kształt widziany przez STRONĘ) ma pole "${pole}" — kontrakt przestałby obcinać materiał kursu.`
      );
    }
  }
}

if (bledy.length > 0) {
  console.error("straznik-tresci-lekcji:");
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}
