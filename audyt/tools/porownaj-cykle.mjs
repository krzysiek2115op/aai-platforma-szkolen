/**
 * PORÓWNANIE FAL — §15 regulaminu w odczycie K4″ (rozstrzygnięcie właściciela
 * 2026-09-02, zastępuje K4′).
 *
 * K4″ dosłownie: „Raporty z dwóch fal mają być dla nas na zapoznanie się.
 * Nieważne, czy to będą zgodne wyniki, czy nie — to my dalej nad nimi pracujemy,
 * a narzędzie tak może to nazywać: nadzbiorem czy sprzecznością."
 *
 * To narzędzie więc NAZYWA, nie ocenia. Wynik ma trzy wartości:
 *   ZGODNE     — te same miejsca i te same stany pochodne werdyktów;
 *   NADZBIÓR   — jedna fala ma wszystko, co druga, i coś ponadto; narzędzie
 *                mówi KTÓRA i o ile (pytanie (b) właściciela: tak, nazwać);
 *   SPRZECZNE  — obie fale mają miejsca, których druga nie ma, ALBO to samo
 *                miejsce ma w obu falach inny stan pochodny.
 * Rozjazd fal NIE jest z definicji defektem audytu i NIE zatrzymuje procesu:
 * kod wyjścia 0 zawsze, gdy obie fale istnieją (pytanie (a): 0 — do lektury).
 *
 * STAN POCHODNY WERDYKTÓW liczony jest W LOCIE i nigdzie nie zapisywany —
 * nie rusza §6 ani `STATUSY`. Bez niego wpis POTWIERDZONY w fali 1
 * i ODRZUCONY w fali 2 wychodziłby „zgodny", bo hash jest ten sam.
 *   POTWIERDZONE = krytyk PRZEPUSZCZAM + weryfikator ISTNIEJE
 *   ODRZUCONE    = oba werdykty odmowne
 *   SPORNE       = jeden tak, drugi nie
 *   BEZ WERDYKTU = brak kompletu
 * Porównanie idzie po PARZE (hash miejsca, stan pochodny).
 *
 * Porównanie idzie po HASHU MIEJSCA, nie po opisie — dwa opisy tego samego
 * miejsca brzmią inaczej za każdym razem, a hash jest ten sam (H1: bez numeru
 * linii, więc przesunięty kod nie rozjeżdża fal).
 *
 * WPISY Z POZYCJI OTWARTEJ `<KOD>-90` (K4″: agent szuka dalej poza checklistą)
 * porównywane są TAK SAMO jak pozostałe (pytanie (c) właściciela) — w raporcie
 * są tylko oznaczone, że pochodzą z pozycji otwartej.
 *
 * ŚLEPOTA FALI 2 — jedyny powód kodu 1 przy dwóch falach. Agenci drugiej fali
 * nie mogą widzieć wyników pierwszej, inaczej przepiszą cudzą listę i „ten sam
 * wynik" wyjdzie ZAWSZE — także gdyby audyt był zepsuty. To narzędzie jest
 * trzecią warstwą tej ochrony (obok zakazu w prompcie i czystego kontekstu
 * subagenta): stwierdzenie IDENTYCZNE co do słowa przy tym samym miejscu to
 * podejrzenie kopiowania i kod 1. Zgodność wtedy niczego nie dowodzi.
 *
 * PODEJRZENIE KOLEJNOŚCI (pakiet E7.7, pozycja 4, 2026-09-02; F2 punkt 4
 * z krytyki budowy) — czwarta warstwa ślepoty fali 2, obok zakazu w definicji,
 * narzędzia nieznającego licznika i worktree bez wpisów fali 1. Gdy dział ma
 * w obu falach IDENTYCZNY zbiór miejsc zgłoszony w TEJ SAMEJ kolejności (po
 * numerach ID, co najmniej dwa miejsca), narzędzie to NAZYWA: agent
 * przepisujący cudzą listę odtwarza jej kolejność, agent mierzący od nowa
 * raczej nie. To SYGNAŁ, nie dowód — obie fale idące checklistą w tej samej
 * kolejności pozycji też mogą trafić tak samo — więc KOD WYJŚCIA ZOSTAJE 0
 * (rozstrzygnięcie 5 właściciela); w wyniku i w JSON stoi lista działów.
 *
 * `--dzial=<KOD>` porównuje JEDEN dział (C1 z krytyki budowy: urwany przebieg
 * ma rozliczać działy domknięte). Dowodem, że fala w dziale SIĘ ODBYŁA, jest
 * plik stanu roli ze statusem ZAKOŃCZONE — dział bez wpisów i bez takiego stanu
 * to fala, której nie było, a nie fala, która nic nie znalazła. Bez `--dzial=`
 * narzędzie porównuje cały sektor i drukuje tabelę per dział.
 *
 * RAPORT DLA WŁAŚCICIELA: `audyt/wyniki/porownanie-<sektor>[-<DZIAL>].json`
 * i lista na wyjściu — każdy wpis z obu fal, stan pochodny, gdzie się różnią.
 *
 * Użycie:
 *   node audyt/tools/porownaj-cykle.mjs [--sektor=audyt] [--dzial=SEC]
 *   node audyt/tools/porownaj-cykle.mjs --test
 * Kod 0 = obie fale porównane (także przy rozjeździe), 1 = brak którejś fali
 * albo podejrzenie kopiowania.
 * `--katalog=<dir>` przestawia korzeń danych (`<dir>/zgloszenia`, `<dir>/stan`,
 * `<dir>/wyniki`) — używa go WYŁĄCZNIE samokontrola, na atrapach dwóch fal.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { KORZEN, SEKTOR, bezProb, czytajJSON, hashMiejsca, notaOProbach, zapiszJSON, znormalizuj } from "./wspolne.mjs";

export const WYNIKI = ["ZGODNE", "NADZBIÓR", "SPRZECZNE"];
export const STANY = ["POTWIERDZONE", "ODRZUCONE", "SPORNE", "BEZ WERDYKTU"];

/** Stan pochodny werdyktów — liczony w locie, nigdy nie zapisywany. */
export function stanPochodny(wpis) {
  const w = wpis?.werdykt && typeof wpis.werdykt === "object" ? wpis.werdykt : {};
  const krytyk = w.krytyk?.werdykt;
  const weryfikator = w.weryfikator?.werdykt;
  if (!krytyk || !weryfikator) return "BEZ WERDYKTU";
  const krytykTak = krytyk === "PRZEPUSZCZAM";
  const weryfikatorTak = weryfikator === "ISTNIEJE";
  if (krytykTak && weryfikatorTak) return "POTWIERDZONE";
  if (!krytykTak && !weryfikatorTak) return "ODRZUCONE";
  return "SPORNE";
}

/** Pozycja otwarta `<KOD>-90` — agent szukał poza checklistą (K4″). */
export const zPozycjiOtwartej = (wpis) => /-90$/.test(String(wpis?.pozycja ?? ""));

const skrot = (z) => z && {
  id: z.id, dzial: z.dzial, pozycja: z.pozycja, stan: stanPochodny(z), otwarta: zPozycjiOtwartej(z),
};

/**
 * Porównuje dwie listy wpisów. Funkcja CZYSTA — nie czyta dysku, nie pisze,
 * nie kończy procesu — żeby samokontrola i audyt mutacyjny mogły ją wołać na
 * atrapach dwóch fal. Zwraca wynik NAZWANY, nigdy oceniony.
 */
export function porownajFale(f1, f2) {
  const poHashu = (lista) => {
    const mapa = new Map();
    let powtorzone = 0;
    for (const z of lista) {
      if (mapa.has(z.hash)) powtorzone++; // to samo miejsce dwa razy w jednej fali — liczymy, nie scalamy
      else mapa.set(z.hash, z);
    }
    return { mapa, powtorzone };
  };
  const { mapa: h1, powtorzone: powtorzoneW1 } = poHashu(f1);
  const { mapa: h2, powtorzone: powtorzoneW2 } = poHashu(f2);

  const tylkoW1 = [...h1.keys()].filter((h) => !h2.has(h));
  const tylkoW2 = [...h2.keys()].filter((h) => !h1.has(h));
  const wspolne = [...h1.keys()].filter((h) => h2.has(h));

  /* KOLEJNOŚĆ ZGŁASZANIA per dział — hashe w porządku numerów ID, każdy raz. */
  const numerId = (z) => Number(String(z.id ?? "").match(/(\d+)$/)?.[1] ?? 0);
  const kolejnoscHashy = (lista, dzial) => {
    const widziane = new Set();
    const wynik = [];
    for (const z of lista.filter((x) => x.dzial === dzial).sort((a, b) => numerId(a) - numerId(b))) {
      if (!widziane.has(z.hash)) { widziane.add(z.hash); wynik.push(z.hash); }
    }
    return wynik;
  };
  const podejrzenieKolejnosci = [...new Set([...f1, ...f2].map((z) => z.dzial))].sort().filter((d) => {
    const k1 = kolejnoscHashy(f1, d);
    const k2 = kolejnoscHashy(f2, d);
    return k1.length >= 2 && k1.length === k2.length && k1.every((h, i) => h === k2[i]);
  });

  const innyStan = wspolne.filter((h) => stanPochodny(h1.get(h)) !== stanPochodny(h2.get(h)));
  const innyDzial = wspolne.filter((h) => h1.get(h).dzial !== h2.get(h).dzial);
  const podejrzane = wspolne.filter((h) => znormalizuj(h1.get(h).stwierdzenie) === znormalizuj(h2.get(h).stwierdzenie));

  let wynik;
  if (!tylkoW1.length && !tylkoW2.length && !innyStan.length) wynik = "ZGODNE";
  else if (innyStan.length || (tylkoW1.length && tylkoW2.length)) wynik = "SPRZECZNE";
  else wynik = "NADZBIÓR";
  const wieksza = wynik === "NADZBIÓR" ? (tylkoW2.length ? 2 : 1) : null;
  const roznica = wynik === "NADZBIÓR" ? tylkoW1.length + tylkoW2.length : null;

  const wpisy = [...new Set([...h1.keys(), ...h2.keys()])].map((hash) => {
    const a = h1.get(hash) ?? null;
    const b = h2.get(hash) ?? null;
    let gdzieRoznia = null;
    if (!a) gdzieRoznia = "tylko fala 2";
    else if (!b) gdzieRoznia = "tylko fala 1";
    else if (stanPochodny(a) !== stanPochodny(b)) gdzieRoznia = `stan: ${stanPochodny(a)} → ${stanPochodny(b)}`;
    else if (a.dzial !== b.dzial) gdzieRoznia = `dział: ${a.dzial} → ${b.dzial}`;
    return { hash, plik: (a ?? b).miejsce?.plik ?? "", f1: skrot(a), f2: skrot(b), roznia_sie: gdzieRoznia };
  });

  return {
    wynik, wieksza, roznica,
    fala1: f1.length, fala2: f2.length,
    wspolne: wspolne.length, tylko_w_fali_1: tylkoW1.length, tylko_w_fali_2: tylkoW2.length,
    inny_stan: innyStan.length, inny_dzial: innyDzial.length, podejrzane: podejrzane.length,
    podejrzenie_kolejnosci: podejrzenieKolejnosci,
    powtorzone_miejsca: { fala1: powtorzoneW1, fala2: powtorzoneW2 },
    otwarte: [...f1, ...f2].filter(zPozycjiOtwartej).length,
    wpisy,
  };
}

/**
 * KOD WYJŚCIA — jedno miejsce, jedna reguła (K4″). Rozjazd fal, także SPRZECZNE,
 * NIE daje kodu 1: to wynik do lektury, nie STOP. Kod 1 mają wyłącznie brak
 * którejś fali (nie ma czego porównać) i podejrzenie kopiowania (ślepota
 * fali 2 — wtedy zgodność niczego nie dowodzi).
 *
 * `obieFale` przychodzi Z ZEWNĄTRZ, nie z liczby wpisów: fala, która się odbyła
 * i nic nie znalazła, ma zero wpisów tak samo jak fala, której nie było. Różnicę
 * zna tylko stan roli (ZAKOŃCZONE) — sprawdza go przebieg CLI, zanim tu trafi.
 */
export function kodWyjscia({ podejrzane }, obieFale) {
  if (!obieFale) return 1;
  if (podejrzane > 0) return 1;
  return 0;
}

/* ── odczyt danych sektora ── */

function wpisyZKatalogu(katalog) {
  if (!existsSync(katalog)) return [];
  return readdirSync(katalog).filter((f) => f.endsWith(".json")).sort().map((f) => czytajJSON(join(katalog, f)));
}

/** Czy rola ZAKOŃCZYŁA daną falę — plik stanu jest jedynym dowodem, że fala w dziale się odbyła. */
function dzialZakonczyl(katalogStanu, sektor, fala, dzial) {
  const stan = czytajJSON(join(katalogStanu, `${sektor}-f${fala}-${dzial}.json`));
  return stan?.status === "ZAKOŃCZONE";
}

/** Czy fala w sektorze w ogóle się odbyła: ma wpisy ALBO choć jedną rolę ze stanem ZAKOŃCZONE. */
function falaOdbylaSie(katalogStanu, sektor, fala, wpisy) {
  if (wpisy.length) return true;
  if (!existsSync(katalogStanu)) return false;
  return readdirSync(katalogStanu)
    .filter((f) => f.startsWith(`${sektor}-f${fala}-`) && f.endsWith(".json"))
    .some((f) => czytajJSON(join(katalogStanu, f))?.status === "ZAKOŃCZONE");
}

/* ── wydruk ── */

function drukujWynik(w, naglowek, proby) {
  const linie = [
    `PORÓWNANIE FAL — ${naglowek}\n`,
    `  fala 1:              ${w.fala1} zgłoszeń`,
    `  fala 2:              ${w.fala2} zgłoszeń`,
    `  wspólne miejsca:     ${w.wspolne}`,
    `  tylko w fali 1:      ${w.tylko_w_fali_1}`,
    `  tylko w fali 2:      ${w.tylko_w_fali_2}`,
    `  inny stan werdyktów: ${w.inny_stan}`,
    `  inny dział:          ${w.inny_dzial}`,
    `  identyczny opis:     ${w.podejrzane}`,
    `  z pozycji otwartej:  ${w.otwarte}`,
  ];
  if (w.powtorzone_miejsca.fala1 || w.powtorzone_miejsca.fala2) {
    linie.push(`  to samo miejsce dwa razy w jednej fali: fala 1 = ${w.powtorzone_miejsca.fala1}, fala 2 = ${w.powtorzone_miejsca.fala2} (liczone raz)`);
  }
  process.stdout.write(linie.join("\n") + "\n" + notaOProbach(proby) + "\n");

  for (const wpis of w.wpisy) {
    const lewa = wpis.f1 ? `${wpis.f1.id} [${wpis.f1.stan}]${wpis.f1.otwarta ? " (otwarta)" : ""}` : "—";
    const prawa = wpis.f2 ? `${wpis.f2.id} [${wpis.f2.stan}]${wpis.f2.otwarta ? " (otwarta)" : ""}` : "—";
    const znak = wpis.roznia_sie ? "≠" : "=";
    process.stdout.write(`  ${znak}  ${lewa.padEnd(34)} ${prawa.padEnd(34)} ${wpis.plik}${wpis.roznia_sie ? `   ← ${wpis.roznia_sie}` : ""}\n`);
  }

  const opis = {
    "ZGODNE": "WYNIK: ZGODNE — te same miejsca, te same stany werdyktów.",
    "NADZBIÓR": `WYNIK: NADZBIÓR — fala ${w.wieksza} ma wszystko, co fala ${w.wieksza === 1 ? 2 : 1}, i ${w.roznica} ${w.roznica === 1 ? "miejsce" : "miejsc"} ponadto.`,
    "SPRZECZNE": "WYNIK: SPRZECZNE — obie fale mają miejsca nieznane drugiej albo to samo miejsce ma inny stan werdyktów.",
  }[w.wynik];
  process.stdout.write(`\n${opis}\n`);
  if (w.wynik !== "ZGODNE") {
    process.stdout.write(
      "Rozjazd fal jest wynikiem do lektury właściciela (K4″), nie defektem audytu\n" +
      "i nie zatrzymuje procesu. Oba raporty idą do niego z obu stron.\n"
    );
  }
  if (w.inny_dzial) {
    process.stdout.write(`GRANICA: ${w.inny_dzial} wspólnych miejsc trafiło w obu falach do innego działu — wiersz do tabeli granic (KIER-04).\n`);
  }
  if (w.podejrzenie_kolejnosci?.length) {
    process.stdout.write(
      `PODEJRZENIE KOLEJNOŚCI (kod 0 — sygnał do lektury, nie dowód): ${w.podejrzenie_kolejnosci.join(", ")} — ` +
      "identyczny zbiór miejsc zgłoszony w obu falach w TEJ SAMEJ kolejności.\n" +
      "Agent przepisujący cudzą listę odtwarza jej kolejność; agent mierzący od nowa raczej nie.\n"
    );
  }
}

/* ── przebieg CLI ── */

function przebieg(argumenty) {
  const wartosc = (n) => argumenty.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
  const sektor = wartosc("sektor") ?? "audyt";
  const dzial = wartosc("dzial") ?? null;
  const baza = wartosc("katalog") ? resolve(wartosc("katalog")) : SEKTOR;
  const katalogZgloszen = join(baza, "zgloszenia");
  const katalogStanu = join(baza, "stan");

  // Wpisy PRÓBNE (etapy budowy) siedzą w prawdziwej fali, bo `fala` może być
  // tylko 1 albo 2 — porównywane z prawdziwym przebiegiem wyglądałyby jak rozjazd.
  const { wpisy: wszystkie, proby } = bezProb(wpisyZKatalogu(katalogZgloszen).filter((z) => z.sektor === sektor));
  const wDziale = dzial ? wszystkie.filter((z) => z.dzial === dzial) : wszystkie;
  const f1 = wDziale.filter((z) => z.fala === 1);
  const f2 = wDziale.filter((z) => z.fala === 2);

  if (dzial) {
    // Dział bez wpisów w fali to albo fala, która nic nie znalazła (stan
    // ZAKOŃCZONE istnieje), albo fala, której nie było — a tego nie wolno
    // pomylić z zerem znalezisk.
    const brakFali = [1, 2].filter((n) => !(n === 1 ? f1 : f2).length && !dzialZakonczyl(katalogStanu, sektor, n, dzial));
    if (brakFali.length) {
      process.stdout.write(
        `Sektor "${sektor}", dział ${dzial}: brak fali ${brakFali.join(" i ")} — dział nie ma w niej ani wpisu, ani stanu ZAKOŃCZONE.\n` +
        "Porównanie działu wymaga obu fal zakończonych.\n"
      );
      return 1;
    }
  } else {
    // Cały sektor: fala odbyła się, gdy ma wpisy ALBO choć jedną rolę ZAKOŃCZONĄ.
    const brakFali = [1, 2].filter((n) => !falaOdbylaSie(katalogStanu, sektor, n, n === 1 ? f1 : f2));
    if (brakFali.length) {
      process.stdout.write(`Sektor "${sektor}": fala 1 = ${f1.length} zgłoszeń, fala 2 = ${f2.length}; brak fali ${brakFali.join(" i ")} ` +
        "(ani wpisu, ani roli ze stanem ZAKOŃCZONE).\n" + notaOProbach(proby) + "Porównanie wymaga obu fal.\n");
      return 1;
    }
  }

  const wynik = porownajFale(f1, f2);
  drukujWynik(wynik, dzial ? `sektor "${sektor}", dział ${dzial}` : `sektor "${sektor}"`, proby);

  // Tabela per dział — żeby urwany przebieg dało się rozliczyć działami (C1).
  let perDzial = null;
  if (!dzial) {
    const dzialy = [...new Set(wszystkie.map((z) => z.dzial))].sort();
    perDzial = dzialy.map((d) => {
      const w = porownajFale(f1.filter((z) => z.dzial === d), f2.filter((z) => z.dzial === d));
      const zakonczone = [1, 2].filter((n) => dzialZakonczyl(katalogStanu, sektor, n, d));
      return { dzial: d, wynik: w.wynik, wieksza: w.wieksza, roznica: w.roznica, fala1: w.fala1, fala2: w.fala2, zakonczone_fale: zakonczone };
    });
    process.stdout.write("\nPER DZIAŁ:\n");
    for (const p of perDzial) {
      const dopisek = p.wynik === "NADZBIÓR" ? ` (fala ${p.wieksza} +${p.roznica})` : "";
      const stan = p.zakonczone_fale.length === 2 ? "" : `   fale ZAKOŃCZONE: ${p.zakonczone_fale.join(", ") || "żadna"}`;
      process.stdout.write(`  ${p.dzial.padEnd(7)} ${p.wynik.padEnd(10)}${dopisek.padEnd(16)} f1=${p.fala1} f2=${p.fala2}${stan}\n`);
    }
  }

  if (wynik.podejrzane) {
    process.stdout.write(
      `\nPODEJRZENIE KOPIOWANIA: ${wynik.podejrzane} zgłoszeń ma stwierdzenie IDENTYCZNE co do słowa.\n` +
      "Dwie niezależne fale opisują to samo miejsce innymi słowami. Identyczność\n" +
      "znaczy, że fala 2 najprawdopodobniej widziała wyniki fali 1 — a wtedy\n" +
      "zgodność nie dowodzi niczego.\n"
    );
  }

  zapiszJSON(join(baza, "wyniki", `porownanie-${sektor}${dzial ? `-${dzial}` : ""}.json`), {
    sektor, dzial, kiedy: new Date().toISOString(),
    ...wynik,
    per_dzial: perDzial,
    pominiete_proby: proby.map((z) => `${z.id}/${z.proba}`),
  });

  // Obie fale są obecne — sprawdzone wyżej stanem ról, nie liczbą wpisów.
  return kodWyjscia(wynik, true);
}

/* ── samokontrola ── */

const MIEJSCE_A = { rodzaj: "mechanizm", plik: "audyt/tools/wspolne.mjs", zakres: "atrapa A", mechanizm: "miejsce atrapy A samokontroli" };
const MIEJSCE_B = { rodzaj: "mechanizm", plik: "audyt/tools/wspolne.mjs", zakres: "atrapa B", mechanizm: "miejsce atrapy B samokontroli" };
const MIEJSCE_C = { rodzaj: "mechanizm", plik: "audyt/tools/zgloszenie.mjs", zakres: "atrapa C", mechanizm: "miejsce atrapy C samokontroli" };
const TAK = { krytyk: { werdykt: "PRZEPUSZCZAM" }, weryfikator: { werdykt: "ISTNIEJE" } };
const NIE = { krytyk: { werdykt: "ODRZUCAM", powod: "atrapa" }, weryfikator: { werdykt: "ODRZUCONE", powod: "atrapa" } };

/** Atrapa wpisu jednej fali — poprawna poza tym, co samokontrola celowo zmienia. */
function atrapa(fala, miejsce, nr, zmiany = {}) {
  return {
    id: `AUD-SEC-F${fala}-${String(nr).padStart(3, "0")}`, sektor: "audyt", fala, dzial: "SEC", pozycja: "SEC-03",
    stwierdzenie: `Atrapa fali ${fala} numer ${nr}: opis tego samego miejsca własnymi słowami.`,
    miejsce, dowod: "Atrapa samokontroli — nie opuszcza katalogu tymczasowego.",
    klasyfikacja: "atrapa", wplyw: "brak", status: "DO WERYFIKACJI", runda: 1,
    hash: hashMiejsca(miejsce), werdykt: null, ...zmiany,
  };
}

function samokontrola() {
  let zle = 0;
  const sprawdz = (nazwa, ok, szczegol = "") => {
    if (!ok) zle++;
    process.stdout.write(`  ${ok ? "✓" : "✗"} ${nazwa}${!ok && szczegol ? `\n      ${szczegol}` : ""}\n`);
  };

  /* stan pochodny */
  sprawdz("STAN      brak werdyktów → BEZ WERDYKTU", stanPochodny(atrapa(1, MIEJSCE_A, 1)) === "BEZ WERDYKTU");
  sprawdz("STAN      sam krytyk → BEZ WERDYKTU", stanPochodny({ werdykt: { krytyk: TAK.krytyk } }) === "BEZ WERDYKTU");
  sprawdz("STAN      oba tak → POTWIERDZONE", stanPochodny({ werdykt: TAK }) === "POTWIERDZONE");
  sprawdz("STAN      oba nie → ODRZUCONE", stanPochodny({ werdykt: NIE }) === "ODRZUCONE");
  sprawdz("STAN      krytyk tak, weryfikator nie → SPORNE", stanPochodny({ werdykt: { krytyk: TAK.krytyk, weryfikator: NIE.weryfikator } }) === "SPORNE");
  sprawdz("STAN      krytyk nie, weryfikator tak → SPORNE", stanPochodny({ werdykt: { krytyk: NIE.krytyk, weryfikator: TAK.weryfikator } }) === "SPORNE");

  /* trzy wyniki */
  const a1 = atrapa(1, MIEJSCE_A, 1, { werdykt: TAK });
  const b1 = atrapa(1, MIEJSCE_B, 2, { werdykt: TAK });
  const a2 = atrapa(2, MIEJSCE_A, 3, { werdykt: TAK });
  const b2 = atrapa(2, MIEJSCE_B, 4, { werdykt: TAK });
  const c2 = atrapa(2, MIEJSCE_C, 5, { werdykt: TAK });
  const c1 = atrapa(1, MIEJSCE_C, 6, { werdykt: TAK });

  const zgodne = porownajFale([a1, b1], [a2, b2]);
  sprawdz("WYNIK     te same miejsca i stany → ZGODNE", zgodne.wynik === "ZGODNE", zgodne.wynik);
  const nad2 = porownajFale([a1, b1], [a2, b2, c2]);
  sprawdz("WYNIK     fala 2 ma więcej → NADZBIÓR, fala 2, +1", nad2.wynik === "NADZBIÓR" && nad2.wieksza === 2 && nad2.roznica === 1, `${nad2.wynik} ${nad2.wieksza} ${nad2.roznica}`);
  const nad1 = porownajFale([a1, b1, c1], [a2, b2]);
  sprawdz("WYNIK     fala 1 ma więcej → NADZBIÓR, fala 1, +1", nad1.wynik === "NADZBIÓR" && nad1.wieksza === 1 && nad1.roznica === 1, `${nad1.wynik} ${nad1.wieksza} ${nad1.roznica}`);
  const sprz = porownajFale([a1, b1], [a2, c2]);
  sprawdz("WYNIK     każda fala ma coś, czego druga nie ma → SPRZECZNE", sprz.wynik === "SPRZECZNE", sprz.wynik);
  const stanInny = porownajFale([a1, b1], [atrapa(2, MIEJSCE_A, 3, { werdykt: NIE }), b2]);
  sprawdz("WYNIK     te same miejsca, inny stan werdyktów → SPRZECZNE", stanInny.wynik === "SPRZECZNE" && stanInny.inny_stan === 1, `${stanInny.wynik} inny_stan=${stanInny.inny_stan}`);
  sprawdz("WYNIK     różnica stanu jest NAZWANA we wpisie", stanInny.wpisy.some((w) => w.roznia_sie === "stan: POTWIERDZONE → ODRZUCONE"));
  const bezWerdyktow = porownajFale([atrapa(1, MIEJSCE_A, 1)], [atrapa(2, MIEJSCE_A, 3)]);
  sprawdz("WYNIK     oba BEZ WERDYKTU → ZGODNE (stan pochodny równy)", bezWerdyktow.wynik === "ZGODNE");

  /* pozycja otwarta -90: porównywana tak samo, tylko oznaczona */
  const otw = porownajFale([atrapa(1, MIEJSCE_A, 1, { pozycja: "SEC-90", werdykt: TAK })], [atrapa(2, MIEJSCE_A, 3, { pozycja: "SEC-90", werdykt: TAK })]);
  sprawdz("OTWARTA   wpisy z SEC-90 w obu falach → ZGODNE, policzone jako otwarte", otw.wynik === "ZGODNE" && otw.otwarte === 2 && otw.wpisy[0].f1.otwarta === true);
  const otwJedna = porownajFale([a1], [a2, atrapa(2, MIEJSCE_B, 4, { pozycja: "SEC-90", werdykt: TAK })]);
  sprawdz("OTWARTA   wpis z SEC-90 tylko w fali 2 → NADZBIÓR fali 2 (nie osobna kategoria)", otwJedna.wynik === "NADZBIÓR" && otwJedna.wieksza === 2);

  /* granica i ślepota */
  const granica = porownajFale([a1], [atrapa(2, MIEJSCE_A, 3, { dzial: "BE", pozycja: "BE-01", werdykt: TAK })]);
  sprawdz("GRANICA   to samo miejsce w innym dziale → ZGODNE, inny_dzial=1", granica.wynik === "ZGODNE" && granica.inny_dzial === 1);
  const kopia = porownajFale([a1], [atrapa(2, MIEJSCE_A, 3, { werdykt: TAK, stwierdzenie: a1.stwierdzenie })]);
  sprawdz("KOPIA     identyczne stwierdzenie → podejrzane=1", kopia.podejrzane === 1);
  const powt = porownajFale([a1, atrapa(1, MIEJSCE_A, 7, { werdykt: TAK })], [a2]);
  sprawdz("POWTÓRKA  to samo miejsce dwa razy w fali 1 → liczone raz, ZGODNE", powt.wynik === "ZGODNE" && powt.powtorzone_miejsca.fala1 === 1);

  /* kolejność zgłaszania (czwarta warstwa ślepoty fali 2) */
  const taSama = porownajFale([a1, b1], [a2, b2]);
  sprawdz("KOLEJNOŚĆ ten sam zbiór w tej samej kolejności (A, B / A, B) → nazwany dział SEC", taSama.podejrzenie_kolejnosci.length === 1 && taSama.podejrzenie_kolejnosci[0] === "SEC", JSON.stringify(taSama.podejrzenie_kolejnosci));
  const odwrotna = porownajFale([a1, b1], [atrapa(2, MIEJSCE_B, 3, { werdykt: TAK }), atrapa(2, MIEJSCE_A, 4, { werdykt: TAK })]);
  sprawdz("KOLEJNOŚĆ KONTRPRZYKŁAD: ten sam zbiór w INNEJ kolejności (A, B / B, A) → bez podejrzenia, wynik ZGODNE", odwrotna.podejrzenie_kolejnosci.length === 0 && odwrotna.wynik === "ZGODNE", JSON.stringify(odwrotna.podejrzenie_kolejnosci));
  const jedno = porownajFale([a1], [a2]);
  sprawdz("KOLEJNOŚĆ KONTRPRZYKŁAD: jedno wspólne miejsce → bez podejrzenia (kolejność jednego elementu nic nie mówi)", jedno.podejrzenie_kolejnosci.length === 0);
  const nadzbior = porownajFale([a1, b1], [a2, b2, c2]);
  sprawdz("KOLEJNOŚĆ KONTRPRZYKŁAD: inny zbiór (NADZBIÓR) → bez podejrzenia", nadzbior.podejrzenie_kolejnosci.length === 0);
  sprawdz("KOLEJNOŚĆ kod wyjścia przy podejrzeniu kolejności to 0 (rozstrzygnięcie 5)", kodWyjscia(taSama, true) === 0);

  /* kod wyjścia — K4″ */
  sprawdz("KOD       SPRZECZNE bez kopiowania → 0 (do lektury, nie STOP)", kodWyjscia(sprz, true) === 0);
  sprawdz("KOD       NADZBIÓR → 0", kodWyjscia(nad2, true) === 0);
  sprawdz("KOD       ZGODNE → 0", kodWyjscia(zgodne, true) === 0);
  sprawdz("KOD       podejrzenie kopiowania → 1", kodWyjscia(kopia, true) === 1);
  sprawdz("KOD       fala, której nie było → 1 (także przy zerze podejrzeń)", kodWyjscia(zgodne, false) === 1);
  sprawdz("KOD       fala ZAKOŃCZONA bez wpisów → 0 (zero wpisów to nie brak fali)", kodWyjscia(porownajFale([a1], []), true) === 0);

  /* przebieg CLI na katalogu tymczasowym — dowód, że narzędzie jest PODPIĘTE do tych funkcji */
  const tmp = mkdtempSync(join(tmpdir(), "porownaj-cykle-"));
  try {
    const uruchom = (pliki, argumenty = []) => {
      rmSync(join(tmp, "zgloszenia"), { recursive: true, force: true });
      rmSync(join(tmp, "stan"), { recursive: true, force: true });
      mkdirSync(join(tmp, "zgloszenia"), { recursive: true });
      mkdirSync(join(tmp, "stan"), { recursive: true });
      for (const [nazwa, tresc] of Object.entries(pliki)) {
        writeFileSync(join(tmp, nazwa), JSON.stringify(tresc, null, 2), "utf8");
      }
      const r = spawnSync("node", ["audyt/tools/porownaj-cykle.mjs", `--katalog=${tmp}`, ...argumenty], { cwd: KORZEN, encoding: "utf8" });
      return { kod: r.status, wyjscie: (r.stdout ?? "") + (r.stderr ?? "") };
    };

    const rozjazd = uruchom({ "zgloszenia/AUD-SEC-F1-001.json": a1, "zgloszenia/AUD-SEC-F1-002.json": b1, "zgloszenia/AUD-SEC-F2-003.json": a2, "zgloszenia/AUD-SEC-F2-005.json": c2 });
    sprawdz("CLI       rozjazd fal → kod 0 i słowo SPRZECZNE na wyjściu", rozjazd.kod === 0 && /WYNIK: SPRZECZNE/.test(rozjazd.wyjscie), `kod ${rozjazd.kod}`);
    sprawdz("CLI       raport JSON zapisany w <katalog>/wyniki", existsSync(join(tmp, "wyniki", "porownanie-audyt.json")));

    const kolejnosc = uruchom({ "zgloszenia/AUD-SEC-F1-001.json": a1, "zgloszenia/AUD-SEC-F1-002.json": b1, "zgloszenia/AUD-SEC-F2-001.json": a2, "zgloszenia/AUD-SEC-F2-002.json": b2 });
    sprawdz("CLI       ta sama kolejność w obu falach → kod 0 i PODEJRZENIE KOLEJNOŚCI: SEC na wyjściu", kolejnosc.kod === 0 && /PODEJRZENIE KOLEJNOŚCI[^\n]*SEC/.test(kolejnosc.wyjscie), `kod ${kolejnosc.kod}`);
    sprawdz("CLI       podejrzenie kolejności zapisane w JSON raportu", czytajJSON(join(tmp, "wyniki", "porownanie-audyt.json"))?.podejrzenie_kolejnosci?.[0] === "SEC");

    const skopiowane = uruchom({ "zgloszenia/AUD-SEC-F1-001.json": a1, "zgloszenia/AUD-SEC-F2-003.json": atrapa(2, MIEJSCE_A, 3, { werdykt: TAK, stwierdzenie: a1.stwierdzenie }) });
    sprawdz("CLI       kopia co do słowa → kod 1 i PODEJRZENIE KOPIOWANIA", skopiowane.kod === 1 && /PODEJRZENIE KOPIOWANIA/.test(skopiowane.wyjscie), `kod ${skopiowane.kod}`);

    const bezFali = uruchom({ "zgloszenia/AUD-SEC-F1-001.json": a1 });
    sprawdz("CLI       jedna fala → kod 1", bezFali.kod === 1, `kod ${bezFali.kod}`);

    const dzialBezFali = uruchom({ "zgloszenia/AUD-SEC-F1-001.json": a1 }, ["--dzial=SEC"]);
    sprawdz("CLI       --dzial: fala 2 bez wpisów i bez stanu ZAKOŃCZONE → kod 1", dzialBezFali.kod === 1 && /brak fali 2/.test(dzialBezFali.wyjscie), `kod ${dzialBezFali.kod}`);

    const dzialPusty = uruchom(
      { "zgloszenia/AUD-SEC-F1-001.json": a1, "stan/audyt-f2-SEC.json": { sektor: "audyt", fala: 2, rola: "SEC", status: "ZAKOŃCZONE", runda: 1, niedomkniete: [] } },
      ["--dzial=SEC"]
    );
    sprawdz("CLI       --dzial: fala 2 ZAKOŃCZONA bez wpisów → kod 0, NADZBIÓR fali 1", dzialPusty.kod === 0 && /NADZBIÓR — fala 1/.test(dzialPusty.wyjscie), `kod ${dzialPusty.kod}`);

    const dzialFiltr = uruchom(
      { "zgloszenia/AUD-SEC-F1-001.json": a1, "zgloszenia/AUD-SEC-F2-003.json": a2, "zgloszenia/AUD-BE-F1-001.json": atrapa(1, MIEJSCE_C, 6, { id: "AUD-BE-F1-001", dzial: "BE", pozycja: "BE-01", werdykt: TAK }) },
      ["--dzial=SEC"]
    );
    sprawdz("CLI       --dzial=SEC pomija wpisy działu BE → ZGODNE", dzialFiltr.kod === 0 && /WYNIK: ZGODNE/.test(dzialFiltr.wyjscie) && existsSync(join(tmp, "wyniki", "porownanie-audyt-SEC.json")), `kod ${dzialFiltr.kod}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }

  process.stdout.write(`\nSamokontrola porównania fal: ${zle === 0 ? "wszystkie przypadki zaliczone" : `${zle} NIE zaliczonych`}\n`);
  return zle === 0;
}

/* ── wejście ── */

/**
 * BRAMKA GŁÓWNEGO MODUŁU we wzorcu odpornym na SPACJĘ w nazwie katalogu
 * (BLAD-014): `resolve(process.argv[1])` wobec `fileURLToPath`, nigdy sklejanie
 * `file://`. Bez bramki sam import wykonywałby CLI.
 */
const GLOWNY_MODUL =
  Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (GLOWNY_MODUL) {
  const argumenty = process.argv.slice(2);
  if (argumenty.includes("--test")) process.exit(samokontrola() ? 0 : 1);
  process.exit(przebieg(argumenty));
}
