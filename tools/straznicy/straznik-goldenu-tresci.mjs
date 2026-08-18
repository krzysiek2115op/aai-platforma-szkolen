/**
 * Golden treści kursów: ochrona przed CICHĄ utratą tekstu.
 *
 * PO CO TO ISTNIEJE. Scenariusze to 91 plików i ~1,3 MB tekstu pisanego
 * przez wiele przebiegów subagentów. Najgroźniejsza awaria nie jest
 * głośna (plik znika, testy czerwone), tylko cicha: narzędzie zapisu
 * nadpisuje lekcję krótszą wersją, ktoś gubi połowę tabeli zgodności
 * przy porządkach, scalenie zjada kilka scen. Nikt tego nie widzi, bo
 * plik NADAL istnieje i NADAL przechodzi strażnika scenariuszy.
 *
 * Golden zapisuje dla każdej lekcji sumę kontrolną i cztery miary
 * (bajty, wiersze, sceny, wiersze tabeli zgodności). Strażnik przelicza
 * je i porównuje. Każda różnica jest czerwona — o to chodzi: zmiana
 * treści ma być WIDOCZNA w diffie i świadomie zatwierdzona.
 *
 * Wymagane pole `powod` przy każdej regeneracji zmusza do nazwania
 * zmiany, więc golden jest zarazem dziennikiem: dlaczego treść urosła
 * albo zmalała.
 *
 * Użycie:
 *   node tools/straznicy/straznik-goldenu-tresci.mjs
 *   node tools/straznicy/straznik-goldenu-tresci.mjs --zapisz "powód zmiany"
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

const KATALOG = "tresc-kursow";
const GOLDEN = join("goldeny", "d7-tresc.json");

if (!existsSync(KATALOG)) process.exit(0);

/** Miary jednej lekcji — dobrane tak, żeby ubytek tekstu był widoczny od razu. */
function zmierz(sciezka) {
  const tekst = readFileSync(sciezka, "utf8");
  const tabela = tekst.slice(tekst.indexOf("## Zgodność ze źródłem"));
  return {
    sha256: createHash("sha256").update(tekst).digest("hex").slice(0, 16),
    bajty: Buffer.byteLength(tekst),
    wiersze: tekst.split("\n").length,
    sceny: (tekst.match(/^### Scena /gm) ?? []).length,
    wierszeZgodnosci: (tabela.match(/^\| /gm) ?? []).length,
  };
}

function zbierz() {
  const out = {};
  for (const kurs of readdirSync(KATALOG).sort()) {
    const kp = join(KATALOG, kurs);
    if (!statSync(kp).isDirectory()) continue;
    for (const modul of readdirSync(kp).sort()) {
      const mp = join(kp, modul);
      if (!statSync(mp).isDirectory()) continue;
      for (const plik of readdirSync(mp).sort()) {
        if (!plik.startsWith("lekcja-") || !plik.endsWith(".md")) continue;
        const sciezka = join(kp, modul, plik).split("\\").join("/");
        out[sciezka] = zmierz(join(mp, plik));
      }
    }
  }
  return out;
}

const teraz = zbierz();
const podsumowanie = Object.values(teraz).reduce(
  (a, m) => ({
    lekcje: a.lekcje + 1,
    bajty: a.bajty + m.bajty,
    sceny: a.sceny + m.sceny,
    wierszeZgodnosci: a.wierszeZgodnosci + m.wierszeZgodnosci,
  }),
  { lekcje: 0, bajty: 0, sceny: 0, wierszeZgodnosci: 0 },
);

const zapisz = process.argv.includes("--zapisz");
if (zapisz) {
  const powod = process.argv[process.argv.indexOf("--zapisz") + 1];
  if (!powod || powod.startsWith("--")) {
    console.error("straznik-goldenu-tresci: --zapisz wymaga powodu, np. --zapisz \"moduł 7 Kursu 2\".");
    process.exit(1);
  }
  const stary = existsSync(GOLDEN) ? JSON.parse(readFileSync(GOLDEN, "utf8")) : null;
  writeFileSync(
    GOLDEN,
    JSON.stringify(
      {
        opis: "Golden treści kursów D7 — miary każdego scenariusza. Regeneracja: node tools/straznicy/straznik-goldenu-tresci.mjs --zapisz \"powód\"",
        powod,
        poprzednioLekcji: stary?.podsumowanie?.lekcje ?? null,
        podsumowanie,
        lekcje: teraz,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`straznik-goldenu-tresci: zapisano golden — ${podsumowanie.lekcje} lekcji, ${podsumowanie.sceny} scen, ${(podsumowanie.bajty / 1024).toFixed(0)} kB.`);
  process.exit(0);
}

if (!existsSync(GOLDEN)) {
  console.error(`straznik-goldenu-tresci: brak ${GOLDEN} — utwórz go: node tools/straznicy/straznik-goldenu-tresci.mjs --zapisz "pierwszy zapis".`);
  process.exit(1);
}

const golden = JSON.parse(readFileSync(GOLDEN, "utf8"));
const bledy = [];

for (const [sciezka, oczek] of Object.entries(golden.lekcje)) {
  const jest = teraz[sciezka];
  if (!jest) {
    bledy.push(`${sciezka}: lekcja ZNIKNĘŁA (golden zna ją: ${oczek.bajty} B, ${oczek.sceny} scen).`);
    continue;
  }
  if (jest.sha256 === oczek.sha256) continue;
  const roznice = [];
  for (const [pole, etykieta] of [
    ["bajty", "bajtów"],
    ["wiersze", "wierszy"],
    ["sceny", "scen"],
    ["wierszeZgodnosci", "wierszy tabeli zgodności"],
  ]) {
    if (jest[pole] !== oczek[pole]) {
      const delta = jest[pole] - oczek[pole];
      roznice.push(`${etykieta}: ${oczek[pole]} → ${jest[pole]} (${delta > 0 ? "+" : ""}${delta})`);
    }
  }
  bledy.push(
    `${sciezka}: treść zmieniona — ${roznice.length ? roznice.join(", ") : "te same miary, inna treść"}.`,
  );
}

for (const sciezka of Object.keys(teraz)) {
  if (!golden.lekcje[sciezka]) bledy.push(`${sciezka}: NOWA lekcja spoza goldenu.`);
}

if (bledy.length > 0) {
  console.error("straznik-goldenu-tresci:");
  for (const b of bledy) console.error(`  - ${b}`);
  console.error(
    `\n  Jeśli zmiana jest ZAMIERZONA, przejrzyj diff treści i zapisz golden:\n` +
      `  node tools/straznicy/straznik-goldenu-tresci.mjs --zapisz "co i po co zmieniono"`,
  );
  process.exit(1);
}

console.log(
  `straznik-goldenu-tresci: ${podsumowanie.lekcje} lekcji zgodnych z goldenem ` +
    `(${podsumowanie.sceny} scen, ${podsumowanie.wierszeZgodnosci} wierszy zgodności, ${(podsumowanie.bajty / 1024).toFixed(0)} kB).`,
);
