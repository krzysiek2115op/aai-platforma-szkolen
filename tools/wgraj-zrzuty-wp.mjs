/**
 * Zrzuty ekranu z lekcji → biblioteka mediów WordPressa.
 *
 * PO CO OSOBNE NARZĘDZIE. Proza odwołuje się do obrazów ścieżką WZGLĘDNĄ
 * (`zrzuty/z01-….webp`), bo tak leżą w repozytorium. Żeby renderer wtyczki
 * umiał zamienić tę ścieżkę na adres, ktoś musi przenieść 148 plików i
 * powiedzieć, do której LEKCJI każdy należy. Tę wiedzę ma tylko to
 * narzędzie: widzi jednocześnie pliki prozy i program kursu w bazie WP.
 *
 * DLACZEGO KLUCZEM JEST LEKCJA, A NIE NAZWA PLIKU. Bo nazwy się powtarzają:
 * `z01-terminal-po-git-status.webp` jest w obu kursach, a w kursie o GitHubie
 * jedna nazwa wraca nawet w dwóch modułach. Policzone, nie założone.
 *
 * DOPASOWANIE PLIKU DO LEKCJI robi `dopasujDoProgramu` z `lib/proza-lekcji.ts`
 * — ta sama funkcja, którą wgrywa się prozę. Sprawdza numer I TYTUŁ, więc
 * przestawiony program zatrzymuje wgrywanie zamiast po cichu przypisać
 * zrzuty do cudzej lekcji.
 *
 * WYMAGA lokalnego środowiska: `cd wordpress/srodowisko && ./postaw.sh`.
 *
 * Użycie: node tools/wgraj-zrzuty-wp.mjs [--usun-nadmiar]
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { czytajProze, dopasujDoProgramu, WZORZEC_PROZY } from "../lib/proza-lekcji.ts";

const STACK = process.env.STACK_NAZWA ?? "aai_wp";
const KONTENER = `${STACK}_cli`;
const TRESC = "tresc-kursow";

function wp(...argumenty) {
  return execFileSync("podman", ["exec", KONTENER, "wp", "--path=/var/www/html", ...argumenty], {
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    stdio: ["ignore", "pipe", "inherit"],
  });
}

/* ---------- program kursów z bazy WP ---------- */

const stan = JSON.parse(wp("aai-sklep", "sprawdz", "--format=json").trim().split("\n").pop());
const programy = new Map(
  stan.kursy.map((k) => [
    k.slug,
    { modules: k.moduly.map((m) => ({ position: m.position, lessons: m.lekcje.map((l) => ({ position: l.position, title: l.title, id: l.id })) })) },
  ])
);

/**
 * Proza bez bloków i wstawek kodu.
 *
 * Lekcja o Markdownie POKAZUJE składnię obrazu (`![opis](sciezka/obraz.png)`)
 * — to przykład do przeczytania, nie zrzut do wgrania. Renderer traktuje ją
 * tak samo (kod wyjmuje przed obrazami), więc i tutaj musi obowiązywać ta
 * sama reguła. Bez niej narzędzie staje na pliku, którego nikt nigdy nie miał
 * stworzyć.
 */
function bezKodu(md) {
  return md.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
}

/* ---------- zrzuty z repo, lekcja po lekcji ---------- */

const katalog = join(tmpdir(), "aai-zrzuty");
rmSync(katalog, { recursive: true, force: true });
mkdirSync(katalog, { recursive: true });

const zrzuty = [];
const brakujace = [];
let plikow = 0;

for (const kurs of readdirSync(TRESC, { withFileTypes: true }).filter((w) => w.isDirectory())) {
  const program = programy.get(kurs.name);
  if (!program) {
    console.log(`  pomijam ${kurs.name} — nie ma takiego kursu w bazie WP`);
    continue;
  }
  const katKursu = join(TRESC, kurs.name);
  for (const modul of readdirSync(katKursu, { withFileTypes: true }).filter((w) => w.isDirectory() && /^modul-\d+$/.test(w.name))) {
    const katModulu = join(katKursu, modul.name);
    for (const plik of readdirSync(katModulu).filter((n) => WZORZEC_PROZY.test(n))) {
      const sciezka = join(katModulu, plik);
      const proza = czytajProze(readFileSync(sciezka, "utf8"), sciezka);
      const { id } = dopasujDoProgramu(proza, program);

      for (const [, nazwa] of bezKodu(proza.tresc).matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) {
        if (/^https?:/.test(nazwa)) continue;
        const zrodlo = join(katModulu, nazwa);
        if (!existsSync(zrodlo)) {
          brakujace.push(`${sciezka}: nie ma pliku ${nazwa}`);
          continue;
        }
        // Nazwa w katalogu przejściowym musi być unikalna GLOBALNIE —
        // stąd identyfikator lekcji w przedrostku.
        const plaska = `${id}__${nazwa.replace(/[\\/]/g, "_")}`;
        copyFileSync(zrodlo, join(katalog, plaska));
        zrzuty.push({ lekcja: id, nazwa, plik: plaska });
        plikow += 1;
      }
    }
  }
}

if (brakujace.length > 0) {
  console.error("wgraj-zrzuty-wp: proza wskazuje pliki, których nie ma:");
  for (const b of brakujace) console.error(`  ✖ ${b}`);
  process.exit(1);
}

writeFileSync(join(katalog, "manifest.json"), JSON.stringify({ zrzuty }, null, 1));
console.log(`  zebrane: ${plikow} zrzutów z ${zrzuty.length ? new Set(zrzuty.map((z) => z.lekcja)).size : 0} lekcji`);

/* ---------- do kontenera i do biblioteki ---------- */

execFileSync("podman", ["exec", KONTENER, "rm", "-rf", "/tmp/aai-zrzuty"], { stdio: "ignore" });
execFileSync("podman", ["cp", katalog, `${KONTENER}:/tmp/aai-zrzuty`], { stdio: "inherit" });

const flagi = process.argv.includes("--usun-nadmiar") ? ["--usun-nadmiar"] : [];
process.stdout.write(wp("aai-sklep", "zrzuty", "/tmp/aai-zrzuty/manifest.json", ...flagi));

rmSync(katalog, { recursive: true, force: true });
