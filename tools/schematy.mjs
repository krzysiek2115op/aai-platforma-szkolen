#!/usr/bin/env node
/**
 * Eksport schematów draw.io do SVG + manifest skrótów.
 *
 * PO CO SVG, SKORO ŹRÓDŁEM JEST `.drawio`. Bo GitHub nie renderuje
 * `.drawio` — bez eksportu schemat leżałby w repo jako plik XML, którego
 * nikt nie zobaczy bez pobrania i otwarcia w programie. SVG jest wyłącznie
 * PODGLĄDEM; edytuje się `.drawio`.
 *
 * PO CO MANIFEST ZE SKRÓTAMI. Bo podgląd starzeje się cicho: ktoś poprawia
 * `.drawio`, zapomina wyeksportować i README pokazuje nieaktualny obrazek.
 * Dat plików nie da się do tego użyć — git ich nie przechowuje, więc po
 * świeżym klonie wszystkie mają ten sam czas. Manifest zapisuje sha256
 * KAŻDEGO źródła w chwili eksportu, a `straznik-schematow` porównuje go
 * ze stanem na dysku.
 *
 * NARZĘDZIE: draw.io Desktop (AppImage). Ścieżkę podaje `AAI_DRAWIO`;
 * bez niej próbujemy `drawio` z PATH i rozpakowanego AppImage'a
 * w `~/.cache/aai-narzedzia`. Braku narzędzia NIE traktujemy jako awarii
 * projektu — to skrypt do ręcznego użycia, nie część `npm run check`.
 *
 * UWAGA: strony w draw.io numerowane są OD 1 (od wersji 27.0.2; wcześniej
 * od zera). Zła numeracja kończy się komunikatem „Invalid page index”,
 * nie cichym eksportem złej strony.
 */

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const KORZEN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Co eksportujemy: plik źródłowy → strony → nazwy plików podglądu.
 *
 * JEDNO ŹRÓDŁO dla eksportu, manifestu i strażnika. Nowy schemat dopisany
 * tylko w jednym z tych miejsc byłby albo bez podglądu, albo bez kontroli.
 */
export const SCHEMATY = [
  {
    zrodlo: "docs/plugin-1/schematy.drawio",
    strony: [
      { nr: 1, plik: "docs/schematy/plugin-1-prosty.svg" },
      { nr: 2, plik: "docs/schematy/plugin-1-techniczny.svg" },
    ],
  },
  {
    zrodlo: "docs/plugin-2/schematy.drawio",
    strony: [
      { nr: 1, plik: "docs/schematy/plugin-2-prosty.svg" },
      { nr: 2, plik: "docs/schematy/plugin-2-techniczny.svg" },
    ],
  },
  {
    zrodlo: "docs/plugin-3/schematy.drawio",
    strony: [
      { nr: 1, plik: "docs/schematy/plugin-3-prosty.svg" },
      { nr: 2, plik: "docs/schematy/plugin-3-techniczny.svg" },
    ],
  },
  {
    zrodlo: "docs/SYSTEM.drawio",
    strony: [{ nr: 1, plik: "docs/schematy/system.svg" }],
  },
];

export const MANIFEST = "docs/schematy/ZRODLA.json";

/** sha256 pliku źródłowego. */
export function skrot(sciezka) {
  return createHash("sha256").update(readFileSync(sciezka)).digest("hex");
}

/** Ścieżka do draw.io albo `null`. */
function znajdzDrawio() {
  if (process.env.AAI_DRAWIO) return process.env.AAI_DRAWIO;
  const kandydaci = [
    path.join(homedir(), ".cache/aai-narzedzia/squashfs-root/AppRun"),
    "/usr/bin/drawio",
    "/usr/local/bin/drawio",
  ];
  return kandydaci.find((k) => existsSync(k)) ?? null;
}

function main() {
  const drawio = znajdzDrawio();
  if (null === drawio) {
    console.error(
      "Nie znaleziono draw.io. Podaj ścieżkę w AAI_DRAWIO albo pobierz AppImage:\n" +
        "  https://github.com/jgraph/drawio-desktop/releases\n" +
        "  ./drawio.AppImage --appimage-extract   (gdy brak FUSE)"
    );
    process.exit(1);
  }

  mkdirSync(path.join(KORZEN, "docs/schematy"), { recursive: true });
  const manifest = {};

  for (const schemat of SCHEMATY) {
    const zrodlo = path.join(KORZEN, schemat.zrodlo);
    if (!existsSync(zrodlo)) {
      console.error(`Brak źródła: ${schemat.zrodlo}`);
      process.exit(1);
    }

    for (const strona of schemat.strony) {
      const wyjscie = path.join(KORZEN, strona.plik);
      /*
       * `--embed-svg-fonts false` — z osadzonymi fontami strona techniczna
       * Pluginu 1 waży 1,3 MB zamiast 62 kB (zmierzone). Podgląd w repo ma
       * być podglądem, nie paczką z krojami pisma.
       */
      execFileSync(
        drawio,
        [
          "--no-sandbox",
          "--disable-gpu",
          "-x",
          "-f",
          "svg",
          "--embed-svg-fonts",
          "false",
          "-b",
          "12",
          "-p",
          String(strona.nr),
          "-o",
          wyjscie,
          zrodlo,
        ],
        { stdio: "ignore", timeout: 300000 }
      );

      /*
       * WERYFIKACJA ARTEFAKTU, NIE PROCESU. draw.io kończy KODEM 0 nawet
       * dla zepsutego XML-a i produkuje wtedy plik z połową treści
       * (zmierzone testem negatywnym przy pisaniu tego narzędzia). Kod
       * wyjścia nie jest więc dowodem na nic — pytamy o plik.
       */
      if (!existsSync(wyjscie) || readFileSync(wyjscie, "utf8").length < 1000) {
        console.error(`Eksport ${strona.plik} nie dał sensownego pliku.`);
        process.exit(1);
      }
      console.log(`  ${strona.plik}`);
    }

    manifest[schemat.zrodlo] = skrot(zrodlo);
  }

  writeFileSync(
    path.join(KORZEN, MANIFEST),
    JSON.stringify(manifest, null, 2) + "\n"
  );
  console.log(`  ${MANIFEST}`);
}

/*
 * BLAD-014: porównanie `import.meta.url` ze sklejonym adresem pliku NIGDY
 * nie wychodzi w katalogu ze spacją (URL koduje ją jako %20), więc narzędzie
 * kończyłoby się kodem 0 nie zrobiwszy NIC. Stąd `fileURLToPath` po obu
 * stronach; pilnuje tego `straznik-sciezek`.
 *
 * Zakazanej sklejki nie cytujemy tu dosłownie — strażnik czyta plik razem
 * z komentarzami i słusznie zapaliłby się na własnym opisie.
 */
if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "")) {
  main();
}
