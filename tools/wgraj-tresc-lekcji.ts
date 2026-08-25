import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  listaKursowKreatora,
  szczegolyKursuPoId,
  trescLekcji,
  zamknijDb1,
} from "../modules/m1-sklep/index.ts";
import {
  BladProzy,
  WZORZEC_PROZY,
  czyWymagaWgrania,
  czytajProze,
  dopasujDoProgramu,
  type ProzaPliku,
} from "../lib/proza-lekcji.ts";

/**
 * Wgrywa prozę lekcji z plików repo do bazy — TĄ SAMĄ DROGĄ CO KREATOR.
 *
 * DLACZEGO PRZEZ HTTP, A NIE WPROST DYSPOZYTOREM (decyzja właściciela
 * 2026-08-19, KROK-3-KURSY.md pkt 4). Treść ma wchodzić kreatorem — to
 * był sens Działu 6 — ale klikanie 91 lekcji ręcznie jest pracą samą
 * w sobie i skazuje każdą korektę w pliku na powtórne przeklikanie.
 * Skrypt strzela więc do JEDYNEGO AJAX-a `/api/szkolenia` akcją
 * `zapisz-tresc-lekcji`, czyli przechodzi przez dokładnie ten sam
 * kontrakt Zod, ten sam limiter, ten sam sufit ciała i tego samego
 * dyspozytora co panel. To NIE jest seed: bazy nie dotyka wprost,
 * więc zasada „jedna baza = jeden AJAX" zostaje nienaruszona.
 *
 * Odczyt (program kursu, dzisiejsza treść lekcji) idzie kanałem JSON
 * modułu — drugim legalnym kanałem z DIAGRAM-u, tym samym, z którego
 * korzysta serwerowy render panelu.
 *
 * Użycie:
 *   npm run db1:tresc -- --sprawdz            # nic nie wysyła, tylko sprawdza
 *   npm run db1:tresc                          # wgrywa to, co się zmieniło
 *   npm run db1:tresc -- --kurs jak-uzywac-githuba --modul 4
 *
 * Wymaga: postawionej bazy, KREATOR_TOKEN w .env i URUCHOMIONEGO
 * serwera (`npm run dev`) — bo idzie po HTTP jak przeglądarka.
 */

const KATALOG = "tresc-kursow";
const TOKEN = process.env.KREATOR_TOKEN ?? "";

/**
 * Tempo. Brama z kroku 2 przepuszcza 60 POST-ów na minutę z adresu
 * (LIMIT_WYSTRZALU), a wgranie kompletu to 91 żądań. Trzymamy się
 * wyraźnie pod progiem zamiast dobijać do niego i liczyć na 429:
 * własne narzędzie nie ma prawa wyglądać jak zalew, a odpowiedź 429
 * i tak obsługujemy, gdyby ktoś pracował w panelu w tym samym czasie.
 */
const ODSTEP_MS = 1100;

type Zadanie = { sciezka: string; proza: ProzaPliku };

function argument(nazwa: string): string | undefined {
  const i = process.argv.indexOf(`--${nazwa}`);
  return i === -1 ? undefined : process.argv[i + 1];
}
const SUCHY_BIEG = process.argv.includes("--sprawdz");
const FILTR_KURSU = argument("kurs");
const FILTR_MODULU = argument("modul");
const ADRES = argument("adres") ?? "http://localhost:3001";

/** Wszystkie pliki prozy w drzewie treści, w kolejności programu. */
function znajdzProze(): string[] {
  if (!existsSync(KATALOG)) return [];
  const znalezione: string[] = [];
  for (const wpisKursu of readdirSync(KATALOG, { withFileTypes: true }).sort()) {
    // w drzewie treści leży też POSTEP.md — katalogi, nie pliki
    if (!wpisKursu.isDirectory()) continue;
    const kurs = wpisKursu.name;
    if (FILTR_KURSU && kurs !== FILTR_KURSU) continue;
    const kp = join(KATALOG, kurs);
    for (const modul of readdirSync(kp).sort()) {
      const numer = modul.match(/^modul-(\d+)$/)?.[1];
      if (!numer) continue;
      if (FILTR_MODULU && numer !== FILTR_MODULU) continue;
      const mp = join(kp, modul);
      for (const plik of readdirSync(mp).sort()) {
        if (WZORZEC_PROZY.test(plik)) znalezione.push(join(mp, plik));
      }
    }
  }
  return znalezione;
}

/** Jedno żądanie do jedynego AJAX-a, z obsługą odmowy tempa. */
async function wyslij(id: string, proza: ProzaPliku): Promise<void> {
  for (let proba = 1; ; proba++) {
    const odp = await fetch(`${ADRES}/api/szkolenia`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        akcja: "zapisz-tresc-lekcji",
        token: TOKEN,
        id,
        tresc: { tresc: proza.tresc, materialy: proza.materialy },
      }),
    });

    if (odp.status === 429 && proba <= 3) {
      const czekaj = Number(odp.headers.get("Retry-After") ?? 5);
      console.log(`   brama prosi o przerwę ${czekaj} s — czekam`);
      await new Promise((r) => setTimeout(r, (czekaj + 1) * 1000));
      continue;
    }

    const wynik = (await odp.json()) as { ok: boolean; blad?: string };
    if (!odp.ok || !wynik.ok) {
      throw new Error(
        `serwer odmówił (HTTP ${odp.status}): ${wynik.blad ?? "brak powodu"}`
      );
    }
    return;
  }
}

async function main(): Promise<number> {
  if (!TOKEN) {
    console.error("Brak KREATOR_TOKEN — bez tokenu dyspozytor odda 403.");
    return 1;
  }

  const pliki = znajdzProze();
  if (pliki.length === 0) {
    console.log("Nie znalazłem ani jednego pliku prozy (proza-*.md).");
    return 0;
  }

  // 1. Czytamy i sprawdzamy WSZYSTKO, zanim cokolwiek wyślemy. Wgrywanie
  //    do pierwszego błędu zostawiałoby kurs w połowie napisany.
  const zadania: Zadanie[] = [];
  const bledy: string[] = [];
  for (const sciezka of pliki) {
    try {
      zadania.push({
        sciezka,
        proza: czytajProze(readFileSync(sciezka, "utf8"), sciezka),
      });
    } catch (b) {
      bledy.push(`${sciezka}: ${b instanceof BladProzy ? b.message : String(b)}`);
    }
  }

  // 2. Program kursu z kanału JSON — stamtąd biorą się identyfikatory lekcji.
  const karty = await listaKursowKreatora();
  const programy = new Map<string, Awaited<ReturnType<typeof szczegolyKursuPoId>>>();
  for (const slug of new Set(zadania.map((z) => z.proza.kurs))) {
    const karta = karty.find((k) => k.slug === slug);
    if (!karta) {
      bledy.push(`kurs „${slug}” nie istnieje w bazie — najpierw program`);
      continue;
    }
    programy.set(slug, await szczegolyKursuPoId(karta.id));
  }

  // 3. Dopasowanie + porównanie z tym, co już leży w bazie.
  const doWyslania: { zadanie: Zadanie; id: string }[] = [];
  let bezZmian = 0;
  for (const zadanie of zadania) {
    const program = programy.get(zadanie.proza.kurs);
    if (!program) continue;
    try {
      const { id } = dopasujDoProgramu(zadanie.proza, program);
      const wBazie = await trescLekcji(id);
      if (czyWymagaWgrania(zadanie.proza, wBazie)) {
        doWyslania.push({ zadanie, id });
      } else {
        bezZmian++;
      }
    } catch (b) {
      bledy.push(
        `${zadanie.sciezka}: ${b instanceof BladProzy ? b.message : String(b)}`
      );
    }
  }

  if (bledy.length > 0) {
    console.error(`\nZatrzymuję się — ${bledy.length} plików nie przeszło:`);
    for (const b of bledy) console.error(`  ✖ ${b}`);
    console.error("\nNie wysłałem NICZEGO. Popraw i uruchom ponownie.");
    return 1;
  }

  console.log(
    `Plików prozy: ${zadania.length}. Bez zmian: ${bezZmian}. Do wgrania: ${doWyslania.length}.`
  );
  if (SUCHY_BIEG) {
    for (const { zadanie } of doWyslania) console.log(`  → ${zadanie.sciezka}`);
    console.log("\n--sprawdz: nic nie wysłałem.");
    return 0;
  }

  for (const [i, { zadanie, id }] of doWyslania.entries()) {
    const p = zadanie.proza;
    process.stdout.write(
      `  [${i + 1}/${doWyslania.length}] ${p.kurs} ${p.modul}.${p.lekcja} — ${p.tytulLekcji} … `
    );
    try {
      await wyslij(id, p);
      console.log(`ok (${p.tresc.length} znaków)`);
    } catch (b) {
      console.log("BŁĄD");
      console.error(`     ${b instanceof Error ? b.message : String(b)}`);
      if (String(b).includes("ECONNREFUSED")) {
        console.error("     Serwer nie odpowiada — uruchom „npm run dev”.");
      }
      return 1;
    }
    if (i < doWyslania.length - 1) {
      await new Promise((r) => setTimeout(r, ODSTEP_MS));
    }
  }

  console.log(`\nWgrane: ${doWyslania.length}. Bez zmian: ${bezZmian}.`);
  return 0;
}

const kod = await main();
await zamknijDb1();
process.exit(kod);
