#!/usr/bin/env node
/**
 * Pakuje trzy wtyczki do archiwów ZIP — takich, jakie klient wgrywa
 * w „Wtyczki → Dodaj wtyczkę → Wyślij wtyczkę na serwer”.
 *
 * PO CO TO POWSTAŁO. Instrukcja instalacji dla osoby nietechnicznej mówi
 * „wgraj plik ZIP”, a do 0.64.0 w repo NIE BYŁO CZEGO WGRAĆ: ani
 * `package.json`, ani `tools/` nie miały niczego, co produkuje archiwum.
 * Instrukcja obiecywałaby plik, którego nikt nie umie zrobić.
 *
 * DLACZEGO WŁASNY ZAPIS ZIP, A NIE BIBLIOTEKA. W tym środowisku nie ma
 * polecenia `zip`, a projekt konsekwentnie nie dokłada zależności do
 * narzędzi (ta sama decyzja co przy `Aai_Sklep_Proza`, która składa
 * Markdown w PHP bez ani jednej biblioteki). Format ZIP z kompresją
 * deflate ma w Node komplet potrzebnych części: `zlib.deflateRawSync`
 * i własne CRC-32.
 *
 * ARCHIWUM MUSI MIEĆ JEDEN KATALOG NA SZCZYCIE (`aai-sklep/…`) — tak
 * WordPress rozpoznaje wtyczkę. ZIP spakowany „od środka” wgra się bez
 * błędu i NIE ZADZIAŁA, a objaw jest mylący: wtyczka po prostu nie
 * pojawia się na liście.
 *
 * WERYFIKACJA JEST ARTEFAKTOWA, NIE PROCESOWA (lekcja z 0.24.0): po
 * spakowaniu rozpakowujemy archiwum do katalogu tymczasowego i porównujemy
 * KAŻDY plik bajt w bajt ze źródłem. Kod wyjścia `zip` nic by nie dowodził.
 *
 * Użycie:  npm run pakuj          → paczki/aai-*-<wersja>.zip
 *          node tools/pakuj-wtyczki.mjs --wyjscie /inny/katalog
 */

import { deflateRawSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const KORZEN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ZRODLO = path.join(KORZEN, "wordpress/wtyczki");

/** Trzy wtyczki, w KOLEJNOŚCI INSTALACJI — ta sama, co w instrukcji. */
export const WTYCZKI = ["aai-sklep", "aai-platnosci", "aai-monitor"];

/**
 * Czego do paczki NIE wkładamy.
 *
 * Wtyczki nie mają kroku budowania (autoloader bez Composera), więc
 * pakujemy je praktycznie w całości. Lista jest krótka i celowo taka
 * zostaje: im więcej wyjątków, tym większa szansa, że paczka różni się
 * od tego, co przetestowaliśmy na `:8892`.
 */
const POMIJANE = new Set([".DS_Store", "Thumbs.db", ".gitkeep"]);

/* ───────────────────────── ZIP ───────────────────────── */

/** Tablica CRC-32 (wielomian 0xEDB88320) — liczona raz. */
const TABLICA_CRC = (() => {
  const t = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(bufor) {
  let c = 0 ^ -1;
  for (let i = 0; i < bufor.length; i++) {
    c = (c >>> 8) ^ TABLICA_CRC[(c ^ bufor[i]) & 0xff];
  }
  return (c ^ -1) >>> 0;
}

/** Czas w formacie DOS, którego wymaga nagłówek ZIP. */
function czasDos(data) {
  const rok = Math.max(1980, data.getFullYear());
  return {
    czas:
      (data.getHours() << 11) |
      (data.getMinutes() << 5) |
      (Math.floor(data.getSeconds() / 2) & 0x1f),
    data: ((rok - 1980) << 9) | ((data.getMonth() + 1) << 5) | data.getDate(),
  };
}

/**
 * Składa archiwum ZIP z listy wpisów.
 *
 * @param {{nazwa:string, dane:Buffer, mtime:Date, katalog?:boolean}[]} wpisy
 */
function zbudujZip(wpisy) {
  const kawalki = [];
  const centralne = [];
  let przesuniecie = 0;

  for (const wpis of wpisy) {
    const nazwa = Buffer.from(wpis.nazwa, "utf8");
    const { czas, data } = czasDos(wpis.mtime);

    // Katalog: zero bajtów, metoda „bez kompresji”.
    const surowe = wpis.katalog ? Buffer.alloc(0) : wpis.dane;
    const spakowane = wpis.katalog ? Buffer.alloc(0) : deflateRawSync(surowe, { level: 9 });
    const metoda = wpis.katalog ? 0 : 8;
    const suma = wpis.katalog ? 0 : crc32(surowe);

    const naglowek = Buffer.alloc(30);
    naglowek.writeUInt32LE(0x04034b50, 0); // podpis
    naglowek.writeUInt16LE(20, 4); // wymagana wersja
    naglowek.writeUInt16LE(0x0800, 6); // flaga: nazwy w UTF-8
    naglowek.writeUInt16LE(metoda, 8);
    naglowek.writeUInt16LE(czas, 10);
    naglowek.writeUInt16LE(data, 12);
    naglowek.writeUInt32LE(suma, 14);
    naglowek.writeUInt32LE(spakowane.length, 18);
    naglowek.writeUInt32LE(surowe.length, 22);
    naglowek.writeUInt16LE(nazwa.length, 26);
    naglowek.writeUInt16LE(0, 28); // bez pola dodatkowego

    kawalki.push(naglowek, nazwa, spakowane);

    const wpisCentralny = Buffer.alloc(46);
    wpisCentralny.writeUInt32LE(0x02014b50, 0);
    wpisCentralny.writeUInt16LE(20, 4); // wersja pakującego
    wpisCentralny.writeUInt16LE(20, 6); // wersja wymagana
    wpisCentralny.writeUInt16LE(0x0800, 8);
    wpisCentralny.writeUInt16LE(metoda, 10);
    wpisCentralny.writeUInt16LE(czas, 12);
    wpisCentralny.writeUInt16LE(data, 14);
    wpisCentralny.writeUInt32LE(suma, 16);
    wpisCentralny.writeUInt32LE(spakowane.length, 20);
    wpisCentralny.writeUInt32LE(surowe.length, 24);
    wpisCentralny.writeUInt16LE(nazwa.length, 28);
    wpisCentralny.writeUInt16LE(0, 30); // pole dodatkowe
    wpisCentralny.writeUInt16LE(0, 32); // komentarz
    wpisCentralny.writeUInt16LE(0, 34); // numer dysku
    wpisCentralny.writeUInt16LE(0, 36); // atrybuty wewnętrzne
    // Atrybuty zewnętrzne: uprawnienia uniksowe w górnych 16 bitach.
    wpisCentralny.writeUInt32LE(wpis.katalog ? 0x41ed0010 : 0x81a40000, 38);
    wpisCentralny.writeUInt32LE(przesuniecie, 42);

    centralne.push(wpisCentralny, nazwa);
    przesuniecie += naglowek.length + nazwa.length + spakowane.length;
  }

  const katalogCentralny = Buffer.concat(centralne);
  const koniec = Buffer.alloc(22);
  koniec.writeUInt32LE(0x06054b50, 0);
  koniec.writeUInt16LE(0, 4);
  koniec.writeUInt16LE(0, 6);
  koniec.writeUInt16LE(wpisy.length, 8);
  koniec.writeUInt16LE(wpisy.length, 10);
  koniec.writeUInt32LE(katalogCentralny.length, 12);
  koniec.writeUInt32LE(przesuniecie, 16);
  koniec.writeUInt16LE(0, 20);

  return Buffer.concat([...kawalki, katalogCentralny, koniec]);
}

/* ───────────────────────── zbieranie plików ───────────────────────── */

/** Wszystkie pliki wtyczki, ze ścieżkami względem katalogu wtyczki. */
function zbierz(katalog, prefiks = "") {
  const wynik = [];
  for (const nazwa of readdirSync(katalog).sort()) {
    if (POMIJANE.has(nazwa)) continue;
    const pelna = path.join(katalog, nazwa);
    const wzgledna = prefiks ? `${prefiks}/${nazwa}` : nazwa;
    const stan = statSync(pelna);
    if (stan.isDirectory()) {
      wynik.push({ nazwa: `${wzgledna}/`, katalog: true, mtime: stan.mtime });
      wynik.push(...zbierz(pelna, wzgledna));
    } else {
      wynik.push({ nazwa: wzgledna, dane: readFileSync(pelna), mtime: stan.mtime });
    }
  }
  return wynik;
}

/** Wersja z nagłówka wtyczki — ta, którą klient zobaczy w kokpicie. */
export function wersjaWtyczki(wtyczka) {
  const glowny = path.join(ZRODLO, wtyczka, `${wtyczka}.php`);
  if (!existsSync(glowny)) return null;
  const m = readFileSync(glowny, "utf8").match(/^\s*\*\s*Version:\s*(.+)$/m);
  return m ? m[1].trim() : null;
}

/* ───────────────────────── weryfikacja artefaktu ───────────────────────── */

/**
 * Rozpakowuje archiwum i porównuje KAŻDY plik ze źródłem.
 *
 * Sam fakt, że zapis się udał, nie dowodzi niczego — plik ZIP o zepsutym
 * katalogu centralnym też się zapisze. Pytamy więc o zawartość, i to
 * cudzym narzędziem (`unzip`), a nie własnym kodem, który mógłby
 * powtórzyć ten sam błąd w drugą stronę.
 */
function sprawdzPaczke(paczka, wtyczka, pliki) {
  const tymczasowy = mkdtempSync(path.join(tmpdir(), "aai-paczka-"));
  try {
    execFileSync("unzip", ["-qq", "-o", paczka, "-d", tymczasowy], { stdio: "pipe" });

    const korzen = path.join(tymczasowy, wtyczka);
    if (!existsSync(korzen)) {
      throw new Error(
        `archiwum nie ma katalogu „${wtyczka}/” na szczycie — WordPress nie rozpozna takiej wtyczki`
      );
    }

    let porownanych = 0;
    for (const plik of pliki) {
      if (plik.katalog) continue;
      const wzgledna = plik.nazwa.slice(wtyczka.length + 1);
      const rozpakowany = path.join(korzen, wzgledna);
      if (!existsSync(rozpakowany)) {
        throw new Error(`w archiwum brakuje pliku ${wzgledna}`);
      }
      if (!readFileSync(rozpakowany).equals(plik.dane)) {
        throw new Error(`plik ${wzgledna} różni się od źródła`);
      }
      porownanych++;
    }

    if (0 === porownanych) {
      // Samokontrola zakresu: pusta pętla „przechodzi” i wyglądałaby
      // jak dowód. Tę klasę ślepoty projekt zna z BLAD-022.
      throw new Error("nie porównano ANI JEDNEGO pliku — weryfikacja byłaby pozorna");
    }
    return porownanych;
  } finally {
    rmSync(tymczasowy, { recursive: true, force: true });
  }
}

/* ───────────────────────── główny przebieg ───────────────────────── */

function main() {
  const argi = process.argv.slice(2);
  const iWyjscie = argi.indexOf("--wyjscie");
  const wyjscie =
    iWyjscie >= 0 && argi[iWyjscie + 1]
      ? path.resolve(argi[iWyjscie + 1])
      : path.join(KORZEN, "paczki");

  mkdirSync(wyjscie, { recursive: true });

  const zrobione = [];
  for (const wtyczka of WTYCZKI) {
    const katalog = path.join(ZRODLO, wtyczka);
    if (!existsSync(katalog)) {
      console.error(`Brak wtyczki: ${katalog}`);
      process.exit(1);
    }

    const wersja = wersjaWtyczki(wtyczka);
    if (null === wersja) {
      console.error(`${wtyczka}: nie znaleziono nagłówka „Version:” w pliku głównym.`);
      process.exit(1);
    }

    // Ścieżki W ARCHIWUM zaczynają się od nazwy wtyczki — patrz nagłówek pliku.
    const pliki = zbierz(katalog).map((p) => ({ ...p, nazwa: `${wtyczka}/${p.nazwa}` }));
    pliki.unshift({ nazwa: `${wtyczka}/`, katalog: true, mtime: statSync(katalog).mtime });

    const paczka = path.join(wyjscie, `${wtyczka}-${wersja}.zip`);
    writeFileSync(paczka, zbudujZip(pliki));

    const porownanych = sprawdzPaczke(paczka, wtyczka, pliki);
    const rozmiar = (statSync(paczka).size / 1024).toFixed(0);
    console.log(`  ${path.basename(paczka)}  —  ${porownanych} plików, ${rozmiar} kB, sprawdzone co do bajtu`);
    zrobione.push(path.basename(paczka));
  }

  writeFileSync(
    path.join(wyjscie, "KOLEJNOSC-INSTALACJI.txt"),
    "Automatic AI — kolejność wgrywania wtyczek\n" +
      "==========================================\n\n" +
      zrobione.map((n, i) => `${i + 1}. ${n}`).join("\n") +
      "\n\nWgrywaj po kolei, od 1 do 3, i włączaj każdą zaraz po wgraniu.\n" +
      "Pełna instrukcja krok po kroku: docs/INSTRUKCJA-INSTALACJI.md\n"
  );

  console.log(`\nGotowe: ${wyjscie}`);
}

/*
  * BLAD-014: porównanie `import.meta.url` ze sklejonym adresem pliku NIGDY
 * wychodzi w katalogu ze spacją, więc narzędzie kończyłoby się kodem 0
 * nie zrobiwszy nic. Pilnuje tego `straznik-sciezek`.
 */
if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "")) {
  main();
}
