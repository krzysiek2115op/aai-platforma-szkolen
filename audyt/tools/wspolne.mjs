/**
 * Wspólne dla narzędzi sektora AUDYT: ścieżki, odczyt/zapis, HASH MIEJSCA.
 *
 * Moduł jest CZYSTY — nie czyta argumentów, nie pisze na ekran, nie kończy
 * procesu. Dzięki temu da się go testować z podstawionym wejściem, tak jak
 * `lib/limiter.ts` w prototypie.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const KORZEN = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const SEKTOR = join(KORZEN, "audyt");
export const ZGLOSZENIA = join(SEKTOR, "zgloszenia");
export const ROLE_MD = join(SEKTOR, "ROLE.md");

/** Próg przejścia plik -> SQLite (rozstrzygnięcie właściciela 2026-09-01). */
export const PROG_BAZY = 200;
/** Sufit rund agenta pętlowego W3 (rozstrzygnięcie właściciela 2026-09-01). */
export const SUFIT_RUND = 5;

export const STATUSY = [
  "NIE ROZPOCZĘTO",
  "W TRAKCIE",
  "DO WERYFIKACJI",
  "ZWERYFIKOWANE",
  "ZAKOŃCZONE",
];

/** Czternaście działów i pięć ról procesowych — kody z ROLE.md. */
export const DZIALY = [
  "SEC", "FE", "BE", "BD", "QA", "PERF", "ARCH",
  "INT", "PRIV", "REPO", "WDR", "PROTO", "PIK", "USP",
];
export const PROCESOWE = ["KIER", "GOLD", "KON", "WER", "RAP"];

/**
 * Zwroty, po których zgłoszenie jest ODRZUCANE. Paragraf 11 regulaminu:
 * NIE "wydaje mi się, że jest błąd", TAK konkretne stwierdzenie z dowodem.
 * Lista celuje w NIEPEWNOŚĆ, nie w jedno słowo — stąd warianty zapisu.
 *
 * GRANICE SŁOWA PRZEZ `\p{L}`, NIE `\b` — i to nie jest ozdoba składniowa.
 * Pierwsza wersja miała `/\bwydaje mi si[ęe]\b/i` i NIE ŁAPAŁA zdania
 * "Wydaje mi się, że handler nie sprawdza nonce": `\b` wymaga granicy między
 * znakiem `\w` a nie-`\w`, a `ę` w JS **nie jest** `\w`, więc między `ę` a
 * przecinkiem żadnej granicy nie ma. Wzorzec przepuszczał dokładnie to, czego
 * miał zabraniać. Ta sama pułapka zzieleniła strażnika w wersji 0.35.0
 * (wzorzec `test\w*` nigdy nie pasował do formy "testów").
 * Złapała ją samokontrola `--test`, nie lektura.
 */
const GRANICA_PRZED = "(?<![\\p{L}])";
const GRANICA_PO = "(?![\\p{L}])";
const niepewne = (rdzen) => new RegExp(GRANICA_PRZED + rdzen + GRANICA_PO, "iu");

export const NIEPEWNOSC = [
  niepewne("wydaje mi si[ęe]"),
  niepewne("chyba"),
  niepewne("prawdopodobnie"),
  niepewne("by[ćc] mo[żz]e"),
  niepewne("podejrzewam"),
  niepewne("mo[żz]liwe,? [żz]e"),
  niepewne("nie jestem pewien"),
  niepewne("wygl[ąa]da na to"),
  niepewne("sprawd[źz] sobie"),
  niepewne("warto by"),
];

/** Normalizacja treści miejsca: liczy się KOD, nie wcięcie. */
export const znormalizuj = (s) => String(s).replace(/\s+/g, " ").trim();

/**
 * HASH MIEJSCA — maszynowy klucz łączenia fal i sektorów (K4', W4).
 *
 * Bierze także TREŚĆ miejsca, nie sam adres: dzięki temu daje się odtworzyć
 * z kodu i nie da się go podać "na oko". Dla braków (K10') — gdzie nie ma
 * pojedynczej linii — kluczem jest zakres i nazwa mechanizmu.
 */
export function hashMiejsca(m) {
  const czesci =
    m.rodzaj === "linia"
      ? ["linia", m.plik, String(m.linia), znormalizuj(m.tresc ?? "")]
      : ["mechanizm", m.plik, znormalizuj(m.zakres ?? ""), znormalizuj(m.mechanizm ?? "")];
  return createHash("sha256").update(czesci.join(" ")).digest("hex");
}

export function czytajJSON(sciezka, domyslne = null) {
  if (!existsSync(sciezka)) return domyslne;
  return JSON.parse(readFileSync(sciezka, "utf8"));
}

export function zapiszJSON(sciezka, dane) {
  mkdirSync(dirname(sciezka), { recursive: true });
  writeFileSync(sciezka, JSON.stringify(dane, null, 2) + "\n", "utf8");
}

export function wszystkieZgloszenia() {
  if (!existsSync(ZGLOSZENIA)) return [];
  return readdirSync(ZGLOSZENIA)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => czytajJSON(join(ZGLOSZENIA, f)));
}

/**
 * Zakresy działów WYPROWADZONE Z `ROLE.md` — nie z osobnej listy.
 *
 * Własna kopia zakresów rozjechałaby się po cichu z dokumentem, który
 * właściciel zaakceptował. To ta sama zasada, dla której
 * `straznik-wagi-dokumentacji` importuje manifest ze skryptów pobierających,
 * zamiast trzymać własną listę nazw.
 */
export function zakresyZRoleMd() {
  const tekst = readFileSync(ROLE_MD, "utf8");
  const zakresy = [];
  for (const sekcja of tekst.split("\n## ")) {
    const kod = sekcja.match(/^([A-Z]+) —/)?.[1];
    const blok = sekcja.match(/\*\*Zakres[^*]*\*\*\n```\n([\s\S]*?)\n```/)?.[1];
    if (kod && blok) zakresy.push({ kod, komenda: blok.replace(/\\\n/g, " ").trim() });
  }
  return zakresy;
}
