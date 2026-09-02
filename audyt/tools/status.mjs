/**
 * STATUS pracy roli — pięć stanów z §6 regulaminu, licznik rund pętli (W3)
 * i HISTORIA PRZEJŚĆ, czyli dziennik wejść, o który pyta KIER-05.
 *
 * Stan roli jest PLIKIEM, nie pamięcią rozmowy: przebieg sektora nie zmieści
 * się w jednej sesji (ponad 150 uruchomień), więc po `/clear` musi dać się
 * odtworzyć, na czym stanęliśmy.
 *
 * SUFIT RUND = 5 (rozstrzygnięcie właściciela 2026-09-01). Agent pętlowy kończy,
 * gdy przeszedł CAŁĄ checklistę **albo** wyczerpał sufit — a przy suficie
 * **musi zapisać, których pozycji nie domknął**. Ciche urwanie po piątej rundzie
 * byłoby luką nie do odróżnienia od kompletnej pracy.
 *
 * PIĘĆ ODMÓW (cztery z pakietu E7.7, pozycja 3 — sześć rozstrzygnięć właściciela
 * 2026-09-02; piąta z pozycji 4), każda z komendą naprawy w komunikacie:
 *
 *   1. fala ∈ {1, 2} — do tej pory `--fala=3` tworzyło `audyt-f3-SEC.json`,
 *      a `--fala=abc` plik `audyt-fNaN-SEC.json`, po cichu; `zgloszenie.mjs`
 *      falę waliduje, więc dwa narzędzia sektora miały dwa rygory;
 *   2. KOLEJNOŚĆ SEKTORÓW (W5, K9′): Pogłębiacz działu X fali N nie wejdzie,
 *      dopóki dział X audytu TEJ SAMEJ fali nie jest ZAKOŃCZONE. Dotyczy
 *      WYŁĄCZNIE czternastu działów — role procesowe re-audytu (KIER, KON, RAP,
 *      PSIARZ, SKUT, STRAZ, WALID) są wolne, bo audytowy KIER kończy dopiero po
 *      całym audycie i blokada na nim zamroziłaby sektor;
 *   3. COFNIĘCIE statusu jest dozwolone i zapisane w historii — ODMOWA tylko
 *      wtedy, gdy dział audytu chce zejść z ZAKOŃCZONE, a Pogłębiacz tej fali
 *      już do niego wszedł. Inaczej re-audyt pracowałby na dziale, który
 *      „jeszcze nie wyszedł", i W5 byłoby złamane po fakcie;
 *   4. DRZEWO PRODUKTU: bez migawki `audyt/migawki/przed.json` żadna zmiana
 *      stanu nie przechodzi (migawka jest warunkiem pierwszej fali, STRUKTURA.md),
 *      a różnica drzewa produktu wobec `glowa_main` PRZYPIĘTEGO w migawce
 *      (nie wobec ruchomego `main` — cudzy commit dependabota nie zatrzyma
 *      sektora) odmawia zapisu i wypisuje zmienione pliki. Do tej pory zakaz
 *      pisania po produkcie sprawdzano DOPIERO na końcu fali (reguła 1,
 *      `--porownaj`): rola, która nadpisała plik w pierwszej godzinie,
 *      pracowała dalej cały dział.
 *
 *   5. IZOLACJA FALI 2 (pakiet E7.7, pozycja 4, 2026-09-02; F2 z krytyki
 *      budowy): rola fali 2 NIE WCHODZI do działu (W TRAKCIE albo pierwsza
 *      runda), dopóki w drzewie widać JAKIKOLWIEK wpis zgłoszenia albo plik
 *      stanu z POLEM `fala: 1`. Fala 2 pracuje w osobnym worktree ze sparse
 *      checkoutem, który chowa `zgloszenia/*-F1-*` i `stan/*-f1-*`
 *      (`fala.mjs --postaw=2`); gdyby sparse checkout „działał" tylko
 *      w lekturze dokumentacji, ta odmowa i tak zatrzyma wejście — pyta o POLE,
 *      nie o nazwę pliku ani o zaufanie do gita. Wpis PRÓBNY fali 1 blokuje TAK
 *      SAMO (rozstrzygnięte przy kodzie: jeden format, zero wyjątków; próbny
 *      wpis fali 1 to wciąż czytelny materiał o fali 1). Wyjątek — KIER i RAP
 *      fali 2 (rozstrzygnięcie 1 właściciela): porównanie fal i raport odbywają
 *      się PO obu falach, w pełnym drzewie.
 *
 * Reguły 1–3 i 5 siedzą w CZYSTEJ funkcji `powodyOdmowyStanu()`, reguła 4
 * w `powodyOdmowyDrzewa()` — obie bez dysku i bez procesu, żeby samokontrola
 * `--test` mogła je wywołać na atrapach (jak `zgloszenie.mjs`/`werdykt.mjs`).
 * Strażnik sektora (reguła 17) sprawdza TE SAME rzeczy na ZAWARTOŚCI plików
 * stanu własnym kodem, celowo niezależnym od tego pliku: plik dopisany ręcznie
 * ominąłby narzędzie, a reguły nie.
 *
 * Użycie:
 *   node audyt/tools/status.mjs --pokaz                 # kod 1 przy wiszących
 *   node audyt/tools/status.mjs --pokaz --historia      # dziennik wejść (KIER-05)
 *   node audyt/tools/status.mjs --rola=SEC --fala=1 --status="W TRAKCIE"
 *   node audyt/tools/status.mjs --rola=SEC --fala=1 --runda
 *   node audyt/tools/status.mjs --rola=SEC --fala=1 --status=ZAKOŃCZONE --niedomkniete=SEC-07,SEC-11
 *   node audyt/tools/status.mjs --rola=PSIARZ --sektor=re-audyt --fala=1 --status="W TRAKCIE"
 *   node audyt/tools/status.mjs --test                  # samokontrola na atrapach
 *
 * `--katalog=<dir>` przestawia korzeń danych (`<dir>/stan`, `<dir>/migawki`)
 * — używa go WYŁĄCZNIE samokontrola, na katalogu tymczasowym.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DZIALY, KOD_POZYCJI, KORZEN, PROG_BAZY, SEKTOR, SEKTORY, STATUSY, SUFIT_RUND, czytajJSON, roleSektora, zapiszJSON,
} from "./wspolne.mjs";

/** Dwie fale — te same, które zna `zgloszenie.mjs`. Trzeciej nie ma w żadnym planie. */
export const FALE = [1, 2];
const NIE_ROZPOCZETO = STATUSY[0];
const ZAKONCZONE = "ZAKOŃCZONE";
export const KOMENDA_MIGAWKI = "node audyt/tools/migawka-wartosci.mjs --zapisz=przed";
export const KOMENDA_WORKTREE = "node audyt/tools/fala.mjs --postaw=2";
/** Role, które w fali 2 pracują także w PEŁNYM drzewie — po obu falach (rozstrzygnięcie 1, 2026-09-02). */
export const WOLNE_OD_IZOLACJI = ["KIER", "RAP"];

/** Klucz stanu w zestawieniu — ten sam, co nazwa pliku bez rozszerzenia. */
export const kluczStanu = (sektor, fala, rola) => `${sektor}-f${fala}-${rola}`;

/**
 * ROLA WESZŁA DO DZIAŁU, gdy jej status nie jest już NIE ROZPOCZĘTO **albo**
 * odbyła choć jedną rundę. Drugi człon jest po to, żeby `--runda` wywołane
 * przed `--status="W TRAKCIE"` nie było furtką obok blokady kolejności.
 */
export const wszedl = (stan) => Boolean(stan) && (stan.status !== NIE_ROZPOCZETO || (stan.runda ?? 0) > 0);

/* ── czyste reguły stanu: fala, kolejność sektorów, cofanie ────────────── */

/**
 * @param stany  Map klucz → stan (wszystkie pliki z `stan/`)
 * @param zmiana { sektor, fala, rola, przed, po } — `przed` to stan sprzed
 *               zmiany (null, gdy pliku nie było), `po` to stan, który ma
 *               zostać zapisany.
 * @returns lista powodów odmowy; pusta = wolno zapisać.
 */
export function powodyOdmowyStanu(stany, zmiana, widoczne = { faleWpisow: [], przykladWpisu: null }) {
  const { sektor, fala, rola, przed, po } = zmiana;
  const powody = [];

  if (!FALE.includes(fala)) {
    powody.push(
      `Fala musi być 1 albo 2, jest "${fala}". Zgłoszenia znają tylko dwie fale (zgloszenie.mjs),\n` +
      `więc stan trzeciej nie należałby do żadnego przebiegu. Naprawa: --fala=1 albo --fala=2.`
    );
    return powody; // bez poprawnej fali nie ma czego porównywać z drugim sektorem
  }

  const dzial = DZIALY.includes(rola);

  // 2. Pogłębiacz działu wchodzi dopiero po ZAKOŃCZONE działu audytu tej samej fali.
  if (sektor === "re-audyt" && dzial && wszedl(po)) {
    const audyt = stany.get(kluczStanu("audyt", fala, rola));
    if (!audyt || audyt.status !== ZAKONCZONE) {
      powody.push(
        `Pogłębiacz ${rola} fali ${fala} nie wchodzi, dopóki dział ${rola} audytu tej fali nie jest ZAKOŃCZONE (W5, K9′).\n` +
        `Stan działu audytu: ${audyt ? audyt.status : "brak pliku stanu — dział nie zaczął"}.\n` +
        `Naprawa: dział audytu kończy pracę, dopiero potem re-audyt wchodzi —\n` +
        `  node audyt/tools/status.mjs --rola=${rola} --fala=${fala} --status=ZAKOŃCZONE`
      );
    }
  }

  // 3. Dział audytu nie schodzi z ZAKOŃCZONE, gdy Pogłębiacz tej fali już wszedł.
  if (sektor === "audyt" && dzial && przed?.status === ZAKONCZONE && po.status !== ZAKONCZONE) {
    const re = stany.get(kluczStanu("re-audyt", fala, rola));
    if (wszedl(re)) {
      powody.push(
        `Dział ${rola} audytu nie może cofnąć ZAKOŃCZONE → ${po.status}: Pogłębiacz ${rola} fali ${fala} już wszedł ` +
        `(stan: ${re.status}, runda ${re.runda ?? 0}). Re-audyt pracowałby na dziale, który „jeszcze nie wyszedł" (W5).\n` +
        `Naprawa: nie ma jej w narzędziu — wynik działu zostaje ZAKOŃCZONE, poprawki idą jako NOWE zgłoszenia,\n` +
        `a sprawę rozstrzyga kierownik (KIER-05).`
      );
    }
  }

  // 5. Izolacja fali 2: WEJŚCIE (nie każda zmiana) przy widocznej fali 1 → odmowa.
  const wejscie = wszedl(po) && !wszedl(przed);
  if (fala === 2 && wejscie && !WOLNE_OD_IZOLACJI.includes(rola)) {
    const faleStanow = [...stany.values()].map((s) => s?.fala);
    const wpisowF1 = (widoczne.faleWpisow ?? []).filter((f) => f === 1).length;
    const stanowF1 = faleStanow.filter((f) => f === 1).length;
    if (wpisowF1 || stanowF1) {
      const przyklad = widoczne.przykladWpisu ?? [...stany.values()].find((s) => s?.fala === 1)?.rola ?? "";
      powody.push(
        `Fala 2 nie wchodzi do działu, dopóki w drzewie widać falę 1: ${wpisowF1} wpisów zgłoszeń i ${stanowF1} plików stanu ` +
        `z polem fala: 1${przyklad ? ` (np. ${przyklad})` : ""}.\n` +
        "Agent fali 2 ma NIE WIDZIEĆ wyników fali 1 (K4″: zgodność fal ma być skutkiem, nie odpisem) — fala 2 pracuje\n" +
        "w osobnym worktree ze sparse checkoutem, który chowa wpisy `-F1-` i stany `-f1-`. Odmowa pyta o POLE, nie o nazwę.\n" +
        `Naprawa (kierownik): ${KOMENDA_WORKTREE}   — i uruchom rolę z katalogu worktree.\n` +
        `Wyjątek: ${WOLNE_OD_IZOLACJI.join(" i ")} fali 2 wchodzą także w pełnym drzewie (porównanie fal i raport po obu falach).`
      );
    }
  }

  return powody;
}

/* ── czysta reguła drzewa produktu (W2) ────────────────────────────────── */

/** Ścieżki, które NIE są produktem: oba sektory i generat definicji agentów. */
const POZA_PRODUKTEM = /^(audyt|re-audyt|\.claude)\//;

/**
 * @param migawka zawartość `migawki/przed.json` albo null
 * @param pomiar  { zmienione: [ścieżki z `git diff <glowa_main>`], brudne: [ścieżki z `git status`] }
 */
export function powodyOdmowyDrzewa(migawka, pomiar) {
  if (!migawka) {
    return [
      "Brak migawki audyt/migawki/przed.json — bez niej nie ma wobec czego mierzyć, czy sektor tylko patrzy (W2, W6).\n" +
      `Naprawa (kierownik, przed pierwszą falą): ${KOMENDA_MIGAWKI}`,
    ];
  }
  const glowa = String(migawka.glowa_main ?? "");
  if (!/^[0-9a-f]{40}$/.test(glowa)) {
    return [
      `Migawka nie niesie przypiętego commita (glowa_main = "${glowa}") — nie ma wobec czego liczyć różnicy drzewa.\n` +
      `Naprawa: ${KOMENDA_MIGAWKI}`,
    ];
  }
  const zmienione = (pomiar?.zmienione ?? []).filter((p) => !POZA_PRODUKTEM.test(p));
  const brudne = (pomiar?.brudne ?? []).filter((p) => !POZA_PRODUKTEM.test(p));
  if (zmienione.length || brudne.length) {
    const lista = [...new Set([...zmienione, ...brudne])];
    return [
      `Drzewo produktu różni się od migawki (commit ${glowa.slice(0, 12)}): ` +
      `${zmienione.length} plików zmienionych wobec commita, ${brudne.length} niezacommitowanych.\n` +
      "Sektor miał tylko patrzeć (W2) — stan roli nie zostanie zapisany, dopóki produkt nie wróci do migawki.\n" +
      lista.slice(0, 10).map((p) => `  - ${p}\n`).join("") +
      (lista.length > 10 ? `  … i ${lista.length - 10} dalszych\n` : "") +
      `Naprawa: git checkout ${glowa.slice(0, 12)} -- <plik> (zmiana w produkcie w trakcie sektora należy do kierownika, nie do roli).`,
    ];
  }
  return [];
}

/* ── historia przejść ──────────────────────────────────────────────────── */

/**
 * Każdy zapis dopisuje wpis `{status, runda, kiedy}` i ustawia `kiedy`
 * ostatniej zmiany. To JEST dziennik wejść z KIER-05 — jeden plik, nie druga
 * kopia prawdy. Strażnik (reguła 17) wymaga, żeby ostatni wpis zgadzał się ze
 * stanem, więc zmiana, która ominęła dziennik, jest widoczna.
 */
export function dopiszHistorie(stan, teraz) {
  stan.kiedy = teraz;
  stan.historia = [...(stan.historia ?? []), { status: stan.status, runda: stan.runda, kiedy: teraz }];
  return stan;
}

/* ── odczyt katalogu stanu ─────────────────────────────────────────────── */

/** Fale wpisów zgłoszeń widocznych w drzewie — po POLU `fala`, nie po nazwie pliku. */
function faleWpisow(katalogZgloszen) {
  if (!existsSync(katalogZgloszen)) return { fale: [], przyklad: null };
  const wpisy = readdirSync(katalogZgloszen).filter((n) => n.endsWith(".json")).sort()
    .map((n) => czytajJSON(join(katalogZgloszen, n))).filter(Boolean);
  return { fale: wpisy.map((w) => w.fala), przyklad: wpisy.find((w) => w.fala === 1)?.id ?? null };
}

function wczytajStany(katalogStanu) {
  const stany = new Map();
  if (!existsSync(katalogStanu)) return stany;
  for (const f of readdirSync(katalogStanu).filter((n) => n.endsWith(".json")).sort()) {
    const w = czytajJSON(join(katalogStanu, f));
    if (w?.sektor && w?.rola) stany.set(kluczStanu(w.sektor, w.fala, w.rola), w);
  }
  return stany;
}

/** Pomiar drzewa produktu wobec przypiętego commita — argumenty listą, bez powłoki. */
function zmierzDrzewo(glowa) {
  const git = (args) => execFileSync("git", args, { cwd: KORZEN, encoding: "utf8", maxBuffer: 1 << 26 }).trim();
  const zmienione = git(["diff", glowa, "--name-only", "--", ".", ":!audyt", ":!re-audyt"]).split("\n").filter(Boolean);
  const brudne = git(["status", "--porcelain", "--", ".", ":!audyt", ":!re-audyt", ":!.claude"])
    .split("\n").filter(Boolean)
    .map((l) => l.slice(3).replace(/^.* -> /, "").replace(/^"|"$/g, ""));
  return { zmienione, brudne };
}

/* ── przebieg CLI ──────────────────────────────────────────────────────── */

function przebieg(arg) {
  const wartosc = (n) => arg.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
  const KATALOG_DANYCH = wartosc("katalog") ?? SEKTOR;
  const KATALOG_STANU = join(KATALOG_DANYCH, "stan");
  const KATALOG_ZGLOSZEN = join(KATALOG_DANYCH, "zgloszenia");
  const PLIK_MIGAWKI = join(KATALOG_DANYCH, "migawki", "przed.json");
  const plikRoli = (sektor, fala, rola) => join(KATALOG_STANU, `${kluczStanu(sektor, fala, rola)}.json`);

  if (arg.includes("--pokaz")) {
    const stany = [...wczytajStany(KATALOG_STANU).values()];
    if (!stany.length) {
      process.stdout.write("Żadna rola nie zaczęła pracy.\n");
      return 0;
    }
    process.stdout.write("STAN RÓL\n\n");
    for (const w of stany) {
      const ostrzezenie = w.runda >= SUFIT_RUND && w.status !== "ZAKOŃCZONE" ? "  ← SUFIT RUND" : "";
      process.stdout.write(
        `  ${w.sektor.padEnd(9)} f${w.fala}  ${w.rola.padEnd(6)} ${w.status.padEnd(15)} runda ${w.runda}/${SUFIT_RUND}` +
        `  ${w.kiedy ?? "(bez czasu)"}${ostrzezenie}\n`
      );
      if (w.niedomkniete?.length) process.stdout.write(`      NIEDOMKNIĘTE: ${w.niedomkniete.join(", ")}\n`);
      if (arg.includes("--historia")) {
        for (const h of w.historia ?? []) process.stdout.write(`      ${h.kiedy}  ${h.status} (runda ${h.runda})\n`);
        if (!w.historia?.length) process.stdout.write("      (brak historii przejść — plik sprzed dziennika wejść)\n");
      }
    }
    /* LICZBA ZGŁOSZEŃ I PRÓG 200 ŻYJĄ TUTAJ, nie w wyjściu `zgloszenie.mjs`
       (pozycja 4 E7.7): ten ekran czyta kierownik, a nie agent fali, któremu
       liczba cudzych wpisów zdradzałaby wynik fali 1. */
    const { fale } = faleWpisow(KATALOG_ZGLOSZEN);
    if (fale.length) {
      process.stdout.write(`\nZGŁOSZEŃ W SEKTORZE: ${fale.length} (fala 1: ${fale.filter((f) => f === 1).length}, fala 2: ${fale.filter((f) => f === 2).length})\n`);
      if (fale.length > PROG_BAZY) process.stdout.write(`UWAGA: przekroczony próg ${PROG_BAZY} zgłoszeń — czas przełączyć nośnik na SQLite (W4).\n`);
    }
    const wiszace = stany.filter((w) => w.runda >= SUFIT_RUND && w.status !== ZAKONCZONE);
    return wiszace.length ? 1 : 0;
  }

  const rola = wartosc("rola");
  const surowaFala = wartosc("fala") ?? "1";
  const fala = /^\d+$/.test(surowaFala) ? Number(surowaFala) : surowaFala;
  const sektor = wartosc("sektor") ?? "audyt";

  if (!SEKTORY.includes(sektor)) {
    process.stdout.write(`Nieznany sektor "${sektor}". Znane: ${SEKTORY.join(" | ")}\n`);
    return 1;
  }

  /* ROLA JEST SPRAWDZANA WOBEC SWOJEGO SEKTORA. Suma obu list przyjęłaby
     `--rola=GOLD --sektor=re-audyt`, czyli stan roli, której w tym sektorze
     nie ma — a `status.mjs --pokaz` jest miejscem, z którego kierownik czyta,
     kto pracuje. Rola-widmo w zestawieniu wygląda jak rola, która nie zaczęła. */
  const znaneRole = roleSektora(sektor);
  if (!rola || !znaneRole.includes(rola)) {
    process.stdout.write(`Rola "${rola}" nie istnieje w sektorze "${sektor}". Znane: ${znaneRole.join(", ")}\n`);
    return 1;
  }

  const odmowaFali = powodyOdmowyStanu(new Map(), { sektor, fala, rola, przed: null, po: { status: NIE_ROZPOCZETO, runda: 0 } });
  if (odmowaFali.length) {
    process.stdout.write(odmowaFali.join("\n") + "\n");
    return 1;
  }

  /* KAŻDA ZMIANA STANU WYMAGA MIGAWKI I NIETKNIĘTEGO PRODUKTU. Sprawdzane
     PRZED czytaniem stanu roli, bo odmowa nie zależy od tego, co rola chce
     zapisać — zależy od tego, czy sektor w ogóle ma prawo pracować. */
  const odmowaDrzewa = (() => {
    const migawka = czytajJSON(PLIK_MIGAWKI);
    if (!migawka) return powodyOdmowyDrzewa(null, null);
    const glowa = String(migawka.glowa_main ?? "");
    if (!/^[0-9a-f]{40}$/.test(glowa)) return powodyOdmowyDrzewa(migawka, null);
    return powodyOdmowyDrzewa(migawka, zmierzDrzewo(glowa));
  })();
  if (odmowaDrzewa.length) {
    process.stdout.write(odmowaDrzewa.join("\n") + "\n");
    return 1;
  }

  const sciezka = plikRoli(sektor, fala, rola);
  const przed = czytajJSON(sciezka);
  const stan = przed
    ? structuredClone(przed)
    : { sektor, fala, rola, status: NIE_ROZPOCZETO, runda: 0, niedomkniete: [] };

  if (arg.includes("--runda")) {
    stan.runda += 1;
    if (stan.runda > SUFIT_RUND) {
      process.stdout.write(
        `SUFIT RUND przekroczony (${SUFIT_RUND}). Rola ${rola} ma teraz ZAKOŃCZYĆ pracę\n` +
        "i zapisać, których pozycji checklisty nie domknęła:\n" +
        `  node audyt/tools/status.mjs --rola=${rola} --fala=${fala} --status=ZAKOŃCZONE --niedomkniete=<lista>\n`
      );
      return 1;
    }
  }

  const nowy = wartosc("status");
  if (nowy) {
    if (!STATUSY.includes(nowy)) {
      process.stdout.write(`Nieznany status "${nowy}". Znane: ${STATUSY.join(" | ")}\n`);
      return 1;
    }
    stan.status = nowy;
  }

  /**
   * NIEDOMKNIĘTE POZYCJE to KODY, nie proza — i narzędzie tego pilnuje.
   *
   * Zmierzone przy próbie E6: rola podała siedem pozycji z komentarzami
   * w nawiasach, a `split(",")` pociął komentarze na osobne wpisy i zapisał
   * DZIEWIĘĆ — w tym dwa, które pozycjami nie są („zgodnie z zakresem próby").
   * Kierownik liczy stąd otwarte pozycje (KIER-01), więc dziennik audytu
   * podawał nieprawdę. `porownaj-cykle.mjs` czyta z pliku stanu WYŁĄCZNIE
   * `status` działu — wcześniejszy zapis, że „bierze tę liczbę do porównania
   * fal", był nieprawdą (sprostowane 2026-09-02).
   *
   * Wzorzec pyta o KSZTAŁT KODU, nie o obecność myślnika: „PIK-01" przechodzi,
   * „PIK-01 (bo nie zdążyłem)" nie. Powód, dlaczego pozycja została niedomknięta,
   * należy do raportu działu — nie do pola, które się liczy.
   *
   * Sam wzorzec mieszka we `wspolne.mjs` — strażnik pyta o TO SAMO przy plikach
   * stanu (reguła 17), a dwie kopie rozjechałyby się po cichu. Nie jest to obawa
   * teoretyczna: kopia stąd odrzucała `KON-A5` i `PSIARZ-02`, czyli prawdziwe
   * kody pozycji dwóch ról pętlowych.
   */
  const niedomkniete = wartosc("niedomkniete");
  if (niedomkniete !== undefined) {
    const czesci = niedomkniete.split(",").map((s) => s.trim()).filter(Boolean);
    const zle = czesci.filter((c) => !KOD_POZYCJI.test(c));
    if (zle.length) {
      process.stdout.write(
        "Lista niedomkniętych przyjmuje WYŁĄCZNIE kody pozycji (np. PIK-02,PIK-07).\n" +
        "Kierownik liczy stąd, ile pozycji zostało otwartych (KIER-01) — komentarz\n" +
        "rozbity przecinkiem zapisałby się jako osobna „pozycja\" i zafałszował dziennik.\n\n" +
        "Nie są kodami pozycji:\n" +
        zle.map((z) => `  - ${z}\n`).join("") +
        "\nPowód, dlaczego pozycja została niedomknięta, opisz w raporcie działu.\n"
      );
      return 1;
    }
    stan.niedomkniete = czesci;
  }

  /**
   * ZAKOŃCZENIE ZNACZY, ŻE ODBYŁA SIĘ CO NAJMNIEJ JEDNA RUNDA.
   *
   * Zmierzone przy próbie E6: rola przeszła całą swoją checklistę w jednym
   * przebiegu, nie wywołała `--runda` ani razu i zamknęła się z licznikiem
   * `0/5`. Kierownik czyta liczbę rund jako miarę pracy, więc „ZAKOŃCZONE,
   * runda 0" znaczy dla niego „nie zrobiła nic" — przy roli, która zrobiła
   * wszystko. Zero rund przy zakończeniu jest sprzeczne samo w sobie.
   */
  if (stan.status === ZAKONCZONE && stan.runda === 0) stan.runda = 1;

  // Zakończenie z niedomkniętymi pozycjami jest DOZWOLONE, ale musi być JAWNE.
  if (stan.status === ZAKONCZONE && stan.runda >= SUFIT_RUND && !stan.niedomkniete.length) {
    process.stdout.write(
      `Rola ${rola} wyczerpała sufit rund, a lista niedomkniętych pozycji jest pusta.\n` +
      "Albo checklista naprawdę została przejdzona do końca — wtedy zejdź z rundami,\n" +
      "albo podaj --niedomkniete=<lista>. Cisza po sufitcie jest luką.\n"
    );
    return 1;
  }

  const { fale, przyklad } = faleWpisow(KATALOG_ZGLOSZEN);
  const odmowa = powodyOdmowyStanu(wczytajStany(KATALOG_STANU), { sektor, fala, rola, przed, po: stan }, { faleWpisow: fale, przykladWpisu: przyklad });
  if (odmowa.length) {
    process.stdout.write(odmowa.join("\n") + "\n");
    return 1;
  }

  dopiszHistorie(stan, new Date().toISOString());
  zapiszJSON(sciezka, stan);
  process.stdout.write(`${sektor} f${fala} ${rola}: ${stan.status}, runda ${stan.runda}/${SUFIT_RUND}  (${stan.kiedy})\n`);
  if (stan.niedomkniete.length) process.stdout.write(`  niedomknięte: ${stan.niedomkniete.join(", ")}\n`);
  return 0;
}

/* ── samokontrola: `--test` na atrapach ────────────────────────────────── */

const T = ["2026-09-02T10:00:00.000Z", "2026-09-02T10:10:00.000Z", "2026-09-02T10:20:00.000Z", "2026-09-02T10:30:00.000Z"];

/** Atrapa stanu z historią wyprowadzoną z końcowego statusu. */
function atrapa(sektor, fala, rola, status, runda = 0, kiedy = T[1]) {
  return { sektor, fala, rola, status, runda, niedomkniete: [], kiedy, historia: [{ status, runda, kiedy }] };
}
const zestaw = (...stany) => new Map(stany.map((s) => [kluczStanu(s.sektor, s.fala, s.rola), s]));

function samokontrola() {
  let zle = 0;
  const sprawdz = (nazwa, warunek, szczegol = "") => {
    if (!warunek) zle++;
    process.stdout.write(`  ${warunek ? "✓" : "✗"} ${nazwa}${!warunek && szczegol ? `\n      ${szczegol}` : ""}\n`);
  };
  const odmawia = (powody, wzorzec) => powody.length > 0 && powody.some((p) => wzorzec.test(p));

  const zm = (sektor, fala, rola, przedStatus, poStatus, poRunda = 0) => ({
    sektor, fala, rola,
    przed: przedStatus === null ? null : { status: przedStatus, runda: przedStatus === ZAKONCZONE ? 1 : 0 },
    po: { status: poStatus, runda: poRunda },
  });
  const audytZakonczyl = atrapa("audyt", 1, "SEC", ZAKONCZONE, 1, T[1]);
  const audytWTrakcie = atrapa("audyt", 1, "SEC", "W TRAKCIE", 1, T[1]);
  const reWszedl = atrapa("re-audyt", 1, "SEC", "W TRAKCIE", 1, T[2]);
  const reNieZaczal = atrapa("re-audyt", 1, "SEC", NIE_ROZPOCZETO, 0, T[2]);

  /* fala */
  sprawdz("FALA      1 i 2 przyjęte", !powodyOdmowyStanu(zestaw(), zm("audyt", 1, "SEC", null, "W TRAKCIE")).length && !powodyOdmowyStanu(zestaw(), zm("audyt", 2, "SEC", null, "W TRAKCIE")).length);
  sprawdz("FALA      3 odrzucona z komendą naprawy", odmawia(powodyOdmowyStanu(zestaw(), zm("audyt", 3, "SEC", null, "W TRAKCIE")), /--fala=1 albo --fala=2/));
  sprawdz("FALA      \"abc\" odrzucone (dotąd audyt-fNaN-SEC.json)", odmawia(powodyOdmowyStanu(zestaw(), zm("audyt", "abc", "SEC", null, "W TRAKCIE")), /musi być 1 albo 2/));

  /* kolejność sektorów */
  sprawdz("KOLEJNOŚĆ Pogłębiacz SEC bez pliku audytu → odmowa z komendą", odmawia(powodyOdmowyStanu(zestaw(), zm("re-audyt", 1, "SEC", null, "W TRAKCIE")), /--status=ZAKOŃCZONE/));
  sprawdz("KOLEJNOŚĆ Pogłębiacz SEC przy audycie W TRAKCIE → odmowa", odmawia(powodyOdmowyStanu(zestaw(audytWTrakcie), zm("re-audyt", 1, "SEC", null, "W TRAKCIE")), /nie jest ZAKOŃCZONE/));
  sprawdz("KOLEJNOŚĆ Pogłębiacz SEC po ZAKOŃCZONE audytu → wolno", !powodyOdmowyStanu(zestaw(audytZakonczyl), zm("re-audyt", 1, "SEC", null, "W TRAKCIE")).length);
  sprawdz("KOLEJNOŚĆ samo utworzenie NIE ROZPOCZĘTO bez audytu → wolno (nie weszła)", !powodyOdmowyStanu(zestaw(), zm("re-audyt", 1, "SEC", null, NIE_ROZPOCZETO)).length);
  sprawdz("KOLEJNOŚĆ --runda przed statusem to też wejście → odmowa", odmawia(powodyOdmowyStanu(zestaw(), zm("re-audyt", 1, "SEC", NIE_ROZPOCZETO, NIE_ROZPOCZETO, 1)), /nie wchodzi/));
  sprawdz("KOLEJNOŚĆ ta sama FALA: audyt f1 ZAKOŃCZONE nie otwiera re-audytu f2", odmawia(powodyOdmowyStanu(zestaw(audytZakonczyl), zm("re-audyt", 2, "SEC", null, "W TRAKCIE")), /fali 2/));
  sprawdz("KOLEJNOŚĆ KONTRPRZYKŁAD: KIER re-audytu bez odpowiednika → wolno", !powodyOdmowyStanu(zestaw(), zm("re-audyt", 1, "KIER", null, "W TRAKCIE")).length);
  sprawdz("KOLEJNOŚĆ KONTRPRZYKŁAD: PSIARZ, SKUT, STRAZ, WALID → wolno", ["PSIARZ", "SKUT", "STRAZ", "WALID"].every((r) => !powodyOdmowyStanu(zestaw(), zm("re-audyt", 1, r, null, "W TRAKCIE")).length));
  sprawdz("KOLEJNOŚĆ KONTRPRZYKŁAD: dział AUDYTU nie pyta o re-audyt", !powodyOdmowyStanu(zestaw(reWszedl), zm("audyt", 1, "BE", null, "W TRAKCIE")).length);

  /* cofanie */
  sprawdz("COFANIE   audyt SEC ZAKOŃCZONE → W TRAKCIE przy Pogłębiaczu w środku → odmowa", odmawia(powodyOdmowyStanu(zestaw(audytZakonczyl, reWszedl), zm("audyt", 1, "SEC", ZAKONCZONE, "W TRAKCIE")), /nie może cofnąć/));
  sprawdz("COFANIE   KONTRPRZYKŁAD: to samo BEZ Pogłębiacza → wolno (zapisane w historii)", !powodyOdmowyStanu(zestaw(audytZakonczyl), zm("audyt", 1, "SEC", ZAKONCZONE, "W TRAKCIE")).length);
  sprawdz("COFANIE   KONTRPRZYKŁAD: Pogłębiacz NIE ROZPOCZĘTO, runda 0 → wolno", !powodyOdmowyStanu(zestaw(audytZakonczyl, reNieZaczal), zm("audyt", 1, "SEC", ZAKONCZONE, "W TRAKCIE")).length);
  sprawdz("COFANIE   KONTRPRZYKŁAD: ZAKOŃCZONE → ZAKOŃCZONE (poprawka niedomkniętych) → wolno", !powodyOdmowyStanu(zestaw(audytZakonczyl, reWszedl), zm("audyt", 1, "SEC", ZAKONCZONE, ZAKONCZONE, 1)).length);
  sprawdz("COFANIE   KONTRPRZYKŁAD: DO WERYFIKACJI → W TRAKCIE nie jest zejściem z ZAKOŃCZONE", !powodyOdmowyStanu(zestaw(reWszedl), zm("audyt", 1, "SEC", "DO WERYFIKACJI", "W TRAKCIE")).length);
  sprawdz("COFANIE   KONTRPRZYKŁAD: rola procesowa audytu (KIER) cofa się swobodnie", !powodyOdmowyStanu(zestaw(atrapa("re-audyt", 1, "KIER", "W TRAKCIE", 1)), zm("audyt", 1, "KIER", ZAKONCZONE, "W TRAKCIE")).length);

  /* izolacja fali 2 (pozycja 4 E7.7) */
  const widacF1 = { faleWpisow: [1, 1], przykladWpisu: "AUD-SEC-F1-001" };
  const widacF2 = { faleWpisow: [2], przykladWpisu: null };
  const stanF1 = atrapa("audyt", 1, "KIER", ZAKONCZONE, 1, T[1]);
  sprawdz("IZOLACJA  SEC fali 2 wchodzi przy wpisie z polem fala: 1 → odmowa z komendą fala.mjs", odmawia(powodyOdmowyStanu(zestaw(), zm("audyt", 2, "SEC", null, "W TRAKCIE"), widacF1), /fala\.mjs --postaw=2/));
  sprawdz("IZOLACJA  komunikat nazywa przykładowy wpis fali 1", odmawia(powodyOdmowyStanu(zestaw(), zm("audyt", 2, "SEC", null, "W TRAKCIE"), widacF1), /AUD-SEC-F1-001/));
  sprawdz("IZOLACJA  --runda przed statusem to też wejście → odmowa", odmawia(powodyOdmowyStanu(zestaw(), zm("audyt", 2, "SEC", NIE_ROZPOCZETO, NIE_ROZPOCZETO, 1), widacF1), /widać falę 1/));
  sprawdz("IZOLACJA  plik STANU fali 1 (bez wpisów) też blokuje", odmawia(powodyOdmowyStanu(zestaw(stanF1), zm("audyt", 2, "SEC", null, "W TRAKCIE"), widacF2), /1 plików stanu/));
  sprawdz("IZOLACJA  Pogłębiacz fali 2 blokowany tak samo (re-audyt)", odmawia(powodyOdmowyStanu(zestaw(atrapa("audyt", 2, "SEC", ZAKONCZONE, 1)), zm("re-audyt", 2, "SEC", null, "W TRAKCIE"), widacF1), /widać falę 1/));
  sprawdz("IZOLACJA  wpis PRÓBNY fali 1 blokuje TAK SAMO (zero wyjątków w formacie)", odmawia(powodyOdmowyStanu(zestaw(), zm("audyt", 2, "SEC", null, "W TRAKCIE"), { faleWpisow: [1], przykladWpisu: "AUD-PIK-F1-001" }), /AUD-PIK-F1-001/));
  sprawdz("IZOLACJA  KONTRPRZYKŁAD: wpisy WYŁĄCZNIE fali 2 w drzewie → wolno", !powodyOdmowyStanu(zestaw(atrapa("audyt", 2, "BE", "W TRAKCIE", 1)), zm("audyt", 2, "SEC", null, "W TRAKCIE"), widacF2).length);
  sprawdz("IZOLACJA  KONTRPRZYKŁAD: fala 1 przy wpisach fali 1 → wolno (to jej własne wpisy)", !powodyOdmowyStanu(zestaw(), zm("audyt", 1, "SEC", null, "W TRAKCIE"), widacF1).length);
  sprawdz("IZOLACJA  KONTRPRZYKŁAD: KIER i RAP fali 2 wchodzą w pełnym drzewie", ["KIER", "RAP"].every((r) => !powodyOdmowyStanu(zestaw(), zm("audyt", 2, r, null, "W TRAKCIE"), widacF1).length));
  sprawdz("IZOLACJA  KONTRPRZYKŁAD: zmiana NIE będąca wejściem (W TRAKCIE → ZAKOŃCZONE) po scaleniu → wolno", !powodyOdmowyStanu(zestaw(), zm("audyt", 2, "SEC", "W TRAKCIE", ZAKONCZONE, 2), widacF1).length);
  sprawdz("IZOLACJA  KONTRPRZYKŁAD: KON fali 2 NIE jest wolny (audytuje audyt swojej fali, nie obu)", odmawia(powodyOdmowyStanu(zestaw(), zm("audyt", 2, "KON", null, "W TRAKCIE"), widacF1), /widać falę 1/));

  /* drzewo produktu */
  const MIGAWKA = { glowa_main: "c6458950c3850994fc2fbd8a383284e0d094afcf" };
  sprawdz("DRZEWO    brak migawki → odmowa z komendą --zapisz=przed", odmawia(powodyOdmowyDrzewa(null, { zmienione: [], brudne: [] }), /--zapisz=przed/));
  sprawdz("DRZEWO    migawka bez glowa_main → odmowa", odmawia(powodyOdmowyDrzewa({ glowa_main: "HEAD" }, { zmienione: [], brudne: [] }), /przypiętego commita/));
  sprawdz("DRZEWO    plik produktu zmieniony wobec commita → odmowa z listą", odmawia(powodyOdmowyDrzewa(MIGAWKA, { zmienione: ["lib/seo.ts"], brudne: [] }), /- lib\/seo\.ts/));
  sprawdz("DRZEWO    plik produktu niezacommitowany → odmowa", odmawia(powodyOdmowyDrzewa(MIGAWKA, { zmienione: [], brudne: ["wordpress/wtyczki/aai-sklep/aai-sklep.php"] }), /1 niezacommitowanych/));
  sprawdz("DRZEWO    KONTRPRZYKŁAD: czyste drzewo → wolno", !powodyOdmowyDrzewa(MIGAWKA, { zmienione: [], brudne: [] }).length);
  sprawdz("DRZEWO    KONTRPRZYKŁAD: plik .claude/ NIE liczy się jako różnica", !powodyOdmowyDrzewa(MIGAWKA, { zmienione: [], brudne: [".claude/agents/aud-sec.md"] }).length);
  sprawdz("DRZEWO    KONTRPRZYKŁAD: pliki sektorów NIE liczą się jako różnica", !powodyOdmowyDrzewa(MIGAWKA, { zmienione: ["audyt/stan/x.json", "re-audyt/ROLE.md"], brudne: [] }).length);

  /* historia */
  const h = dopiszHistorie(dopiszHistorie({ status: "W TRAKCIE", runda: 0 }, T[0]), T[1]);
  sprawdz("HISTORIA  każdy zapis dopisuje wpis, `kiedy` = ostatni", h.historia.length === 2 && h.kiedy === T[1] && h.historia[1].kiedy === T[1]);
  sprawdz("HISTORIA  wszedł: NIE ROZPOCZĘTO z rundą 0 nie, z rundą 1 tak", !wszedl({ status: NIE_ROZPOCZETO, runda: 0 }) && wszedl({ status: NIE_ROZPOCZETO, runda: 1 }) && wszedl({ status: "W TRAKCIE", runda: 0 }));

  /* przebieg CLI na katalogu tymczasowym — dowód, że narzędzie jest PODPIĘTE do tych funkcji */
  const tmp = mkdtempSync(join(tmpdir(), "status-"));
  try {
    const uruchom = (...argumenty) => {
      const r = spawnSync("node", ["audyt/tools/status.mjs", `--katalog=${tmp}`, ...argumenty], { cwd: KORZEN, encoding: "utf8" });
      return { kod: r.status, wyjscie: (r.stdout ?? "") + (r.stderr ?? "") };
    };
    const plik = (sektor, fala, rola) => czytajJSON(join(tmp, "stan", `${kluczStanu(sektor, fala, rola)}.json`));

    const f3 = uruchom("--rola=SEC", "--fala=3", "--status=W TRAKCIE");
    sprawdz("CLI       --fala=3 → kod 1, bez pliku", f3.kod === 1 && !existsSync(join(tmp, "stan")), `kod ${f3.kod}`);

    const bezMigawki = uruchom("--rola=SEC", "--fala=1", "--status=W TRAKCIE");
    sprawdz("CLI       bez migawki → kod 1 z komendą, bez pliku", bezMigawki.kod === 1 && bezMigawki.wyjscie.includes(KOMENDA_MIGAWKI) && !plik("audyt", 1, "SEC"), `kod ${bezMigawki.kod}`);

    // Migawka-atrapa przypina BIEŻĄCY commit: różnica drzewa wobec niego to
    // wyłącznie niezacommitowane pliki produktu — ten sam warunek, którego
    // pilnuje reguła 1 strażnika. Brudne drzewo poza sektorami zapali obie.
    const glowa = execFileSync("git", ["rev-parse", "HEAD"], { cwd: KORZEN, encoding: "utf8" }).trim();
    mkdirSync(join(tmp, "migawki"), { recursive: true });
    zapiszJSON(join(tmp, "migawki", "przed.json"), { glowa_main: glowa });

    const start = uruchom("--rola=SEC", "--fala=1", "--status=W TRAKCIE");
    const s1 = plik("audyt", 1, "SEC");
    sprawdz("CLI       W TRAKCIE zapisane z historią i czasem ISO", start.kod === 0 && s1?.historia?.length === 1 && /^\d{4}-\d{2}-\d{2}T.*Z$/.test(s1.kiedy) && s1.historia[0].status === "W TRAKCIE", `kod ${start.kod}: ${start.wyjscie.trim()}`);

    const koniec = uruchom("--rola=SEC", "--fala=1", "--status=ZAKOŃCZONE");
    const s2 = plik("audyt", 1, "SEC");
    sprawdz("CLI       ZAKOŃCZONE dopisuje drugi wpis, czasy niemalejące", koniec.kod === 0 && s2?.historia?.length === 2 && Date.parse(s2.historia[1].kiedy) >= Date.parse(s2.historia[0].kiedy) && s2.historia[1].status === ZAKONCZONE && s2.kiedy === s2.historia[1].kiedy);

    const reBE = uruchom("--rola=BE", "--sektor=re-audyt", "--fala=1", "--status=W TRAKCIE");
    sprawdz("CLI       Pogłębiacz BE bez audytu BE → kod 1, bez pliku", reBE.kod === 1 && !plik("re-audyt", 1, "BE"), `kod ${reBE.kod}`);

    const reSEC = uruchom("--rola=SEC", "--sektor=re-audyt", "--fala=1", "--status=W TRAKCIE");
    sprawdz("CLI       Pogłębiacz SEC po ZAKOŃCZONE audytu → kod 0", reSEC.kod === 0 && plik("re-audyt", 1, "SEC")?.status === "W TRAKCIE", `kod ${reSEC.kod}: ${reSEC.wyjscie.trim()}`);

    const cofnij = uruchom("--rola=SEC", "--fala=1", "--status=W TRAKCIE");
    sprawdz("CLI       cofnięcie audytu SEC przy Pogłębiaczu → kod 1, plik nietknięty", cofnij.kod === 1 && plik("audyt", 1, "SEC")?.status === ZAKONCZONE && plik("audyt", 1, "SEC")?.historia?.length === 2, `kod ${cofnij.kod}`);

    const psiarz = uruchom("--rola=PSIARZ", "--sektor=re-audyt", "--fala=1", "--status=W TRAKCIE");
    sprawdz("CLI       rola procesowa re-audytu (PSIARZ) bez odpowiednika → kod 0", psiarz.kod === 0, `kod ${psiarz.kod}: ${psiarz.wyjscie.trim()}`);

    const pokaz = uruchom("--pokaz", "--historia");
    sprawdz("CLI       --pokaz --historia drukuje czasy przejść", pokaz.kod === 0 && (pokaz.wyjscie.match(/\d{4}-\d{2}-\d{2}T/g) ?? []).length >= 5, `kod ${pokaz.kod}`);

    /* izolacja fali 2 — wpis z POLEM fala: 1 pod nazwą, której sparse checkout by NIE schował */
    mkdirSync(join(tmp, "zgloszenia"), { recursive: true });
    const wpisF1 = join(tmp, "zgloszenia", "AUD-SEC-F2-001.json"); // nazwa kłamie, pole mówi prawdę
    writeFileSync(wpisF1, JSON.stringify({ id: "AUD-SEC-F2-001", sektor: "audyt", fala: 1, dzial: "SEC" }), "utf8");
    const f2Blok = uruchom("--rola=BE", "--fala=2", "--status=W TRAKCIE");
    sprawdz("CLI       fala 2 przy wpisie z POLEM fala: 1 (nazwa F2!) → kod 1 z komendą fala.mjs, bez pliku", f2Blok.kod === 1 && f2Blok.wyjscie.includes(KOMENDA_WORKTREE) && !plik("audyt", 2, "BE"), `kod ${f2Blok.kod}: ${f2Blok.wyjscie.trim().slice(0, 120)}`);
    const kierF2 = uruchom("--rola=KIER", "--fala=2", "--status=W TRAKCIE");
    sprawdz("CLI       KIER fali 2 w tym samym drzewie → kod 0", kierF2.kod === 0 && plik("audyt", 2, "KIER")?.status === "W TRAKCIE", `kod ${kierF2.kod}: ${kierF2.wyjscie.trim().slice(0, 120)}`);
    rmSync(wpisF1, { force: true });
    // Stany fali 1 z wcześniejszych przypadków wciąż leżą w katalogu — plik stanu fali 1 blokuje tak samo.
    const f2Stan = uruchom("--rola=BE", "--fala=2", "--status=W TRAKCIE");
    sprawdz("CLI       bez wpisów, ale ze stanami fali 1 na dysku → dalej kod 1 (plików stanu z fala: 1 ≥ 1)", f2Stan.kod === 1 && /plików stanu/.test(f2Stan.wyjscie), `kod ${f2Stan.kod}`);
    for (const n of readdirSync(join(tmp, "stan"))) if (/-f1-/.test(n)) rmSync(join(tmp, "stan", n), { force: true });
    const f2Wolno = uruchom("--rola=BE", "--fala=2", "--status=W TRAKCIE");
    sprawdz("CLI       po schowaniu fali 1 (jak w worktree) → kod 0", f2Wolno.kod === 0 && plik("audyt", 2, "BE")?.status === "W TRAKCIE", `kod ${f2Wolno.kod}: ${f2Wolno.wyjscie.trim().slice(0, 120)}`);
    const pokaz2 = uruchom("--pokaz");
    sprawdz("CLI       --pokaz liczy zgłoszenia per fala (licznik przeniesiony z zgloszenie.mjs)", pokaz2.kod === 0 && /ZGŁOSZEŃ W SEKTORZE: 0|Żadna|STAN RÓL/.test(pokaz2.wyjscie), `kod ${pokaz2.kod}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }

  process.stdout.write(`\nSamokontrola stanu ról: ${zle === 0 ? "wszystkie przypadki zaliczone" : `${zle} NIE zaliczonych`}\n`);
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
  const arg = process.argv.slice(2);
  if (arg.includes("--test")) process.exit(samokontrola() ? 0 : 1);
  process.exit(przebieg(arg));
}
