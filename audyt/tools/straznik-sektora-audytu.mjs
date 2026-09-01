/**
 * STRAŻNIK SEKTORÓW AUDYT i RE-AUDYT — dwadzieścia dwie kontrole.
 *
 * DLACZEGO TUTAJ, A NIE W `tools/straznicy/`. Sektor żyje wyłącznie na swojej
 * gałęzi (D7) i nie wolno mu dotknąć niczego poza `audyt/`. Strażnik z `main`
 * nas nie pilnuje i to jest świadomy koszt nazwany w planie jako K8 — więc
 * sektor pilnuje się sam, na swojej gałęzi.
 *
 * WZORCE CELUJĄ W ROZSTRZYGNIĘCIE, NIE W NAZWĘ. W tym repo pułapka "wzorzec
 * pyta o obecność napisu" zzieleniła strażnika przy zepsutym kodzie DZIEWIĘĆ
 * razy (0.29.0 nazwa metody, 0.44.0 nazwa stałej, 0.47.0 napis, dwa razy w P4,
 * raz w przeglądzie T3). Każda reguła niżej pyta o skutek, który da się złamać.
 *
 * KONTROLE WARUNKOWE. Reguły 2, 3, 4 i 6 dotyczą katalogów `<sektor>/role/`,
 * z których audytowy powstaje w E5, a re-audytowy w E7. Dopóki katalogu nie ma,
 * mówią wprost "pominięte" — cisza byłaby nie do odróżnienia od zaliczenia.
 *
 * DWA SEKTORY, JEDEN STRAŻNIK (rozstrzygnięcie właściciela 2026-09-01). Sektory
 * są osobne w PRACY (§17: nigdy na tym samym dziale jednocześnie), nie
 * w toolchainie: wspólny nośnik zgłoszeń jest warunkiem łączenia po haszu (W4),
 * a druga kopia tych samych reguł rozjechałaby się po cichu.
 *
 * Użycie: node audyt/tools/straznik-sektora-audytu.mjs
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  DZIALY, KOD_POZYCJI, KOD_PROBNY, KORZEN, PREFIKS_AGENTA, PREFIKS_ID, SEKTOR, SEKTORY,
  katalogSektora, modelRoli, roleMdSektora, roleSektora, wszystkieZgloszenia,
} from "./wspolne.mjs";
import { powodyOdmowy } from "./zgloszenie.mjs";
import { zakresyZRoleMd } from "./wspolne.mjs";

/**
 * ROLE ustalamy RAZ i z katalogów, nie z plików — dla OBU sektorów naraz.
 *
 * PRZEJŚCIE PO PUSTCE. Do tej poprawki reguły dotyczące ról pytały
 * `existsSync(ROLE)`, a katalog `audyt/role/` istniał od E4 jako PUSTY — więc
 * sześć kontroli iterowało po zerze i milczało, a wyjście wyglądało dokładnie
 * tak samo jak przy komplecie ról. Cisza była nie do odróżnienia od
 * zaliczenia; to ta sama klasa, co test negatywny przechodzący po pustce.
 * Pusty katalog znaczy teraz to samo, co brak katalogu: "pominięte".
 *
 * Każdy wpis niesie SEKTOR, bo komunikat "rola SEC nie ma KRYTYK.md" przy
 * dwóch sektorach o wspólnych kodach działów nie mówi, którą rolę naprawić.
 */
const ROLE_SEKTOROW = SEKTORY.map((sektor) => {
  const katalog = join(katalogSektora(sektor), "role");
  const kody = existsSync(katalog)
    ? readdirSync(katalog, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()
    : [];
  return { sektor, katalog, kody };
});

/** Płaska lista `{ sektor, katalog, kod }` — po niej chodzą reguły ról. */
const ROLE_WSZYSTKIE = ROLE_SEKTOROW.flatMap(({ sektor, katalog, kody }) =>
  kody.map((kod) => ({ sektor, katalog, kod, gdzie: `${sektor}/role/${kod}` }))
);
const BRAK_ROL = ROLE_WSZYSTKIE.length === 0;

const bledy = [];
const pominiete = [];
const uwagi = [];

const sh = (k) => execFileSync("bash", ["-c", k], { cwd: KORZEN, encoding: "utf8", maxBuffer: 1 << 26 }).trim();

/* ── 1. gałąź sektora nie zmienia kodu produktu (D7, W2) ───────────────────
   Pytamy o SKUTEK — listę zmienionych plików poza `audyt/` — a nie o to, czy
   ktoś zadeklarował, że nic nie ruszał. */
{
  // DWA WYKLUCZENIA, JEDNA KOMENDA DLA OBU GAŁĘZI (rozstrzygnięcie właściciela
  // 2026-09-01). Na gałęzi audytu katalogu `re-audyt/` nie ma, więc wynik jest
  // ten sam co przy jednym wykluczeniu; na gałęzi re-audytu bez tego drugiego
  // wykluczenia bramka świeciłaby na czerwono NA WŁASNEJ PRACY — czyli zawsze,
  // a więc nie znaczyłaby nic. Zmierzone uruchomieniowo przed zmianą.
  const zmienione = sh("git diff main --name-only -- . ':!audyt' ':!re-audyt'").split("\n").filter(Boolean);
  // `.claude/` jest WYJĄTKIEM NAZWANYM, nie przeoczonym: to generat definicji
  // agentów (D1), z założenia nieśledzony i odtwarzalny jedną komendą ze źródła
  // w `audyt/role/`. Wyjątek jest wąski — pilnuje go reguła 4, która sprawdza
  // zgodność generatu ze źródłem po sha256 ORAZ brak generatów-sierot.
  // Bez tego wyjątku strażnik zapalałby się na własnym, zamierzonym artefakcie.
  const brudne = sh("git status --porcelain -- . ':!audyt' ':!re-audyt' ':!.claude'").split("\n").filter(Boolean);
  if (zmienione.length) {
    bledy.push(`sektor zmienił ${zmienione.length} plików poza audyt/ i re-audyt/: ${zmienione.slice(0, 5).join(", ")}`);
  }
  if (brudne.length) {
    bledy.push(`niezacommitowane zmiany poza audyt/ i re-audyt/: ${brudne.slice(0, 5).join(", ")}`);
  }
}

/* ── 2. każda rola ma krytyka (D3, WYTYCZNE N1) ── */
if (BRAK_ROL) {
  pominiete.push("2. para agent+krytyk — katalogi <sektor>/role/ powstają w E5 i E7");
} else {
  for (const { katalog, kod, gdzie } of ROLE_WSZYSTKIE) {
    if (!existsSync(join(katalog, kod, "KRYTYK.md"))) bledy.push(`rola ${gdzie} nie ma KRYTYK.md (D3: krytyk przy KAŻDEJ roli)`);
  }
}

/* ── 3. komplet pięciu elementów (§5 regulaminu) ── */
const PIEC = ["Context", "Ograniczenia", "Moduł", "Prompt", "Narzędzia"];
if (BRAK_ROL) {
  pominiete.push("3. pięć elementów każdej roli — katalogi <sektor>/role/ powstają w E5 i E7");
} else {
  for (const { katalog, kod, gdzie } of ROLE_WSZYSTKIE) {
    const plik = join(katalog, kod, "AGENT.md");
    if (!existsSync(plik)) { bledy.push(`rola ${gdzie} nie ma AGENT.md`); continue; }
    const t = readFileSync(plik, "utf8");
    const brak = PIEC.filter((e) => !new RegExp(`^##+\\s*${e}`, "im").test(t));
    if (brak.length) bledy.push(`rola ${gdzie}: brak elementów §5 — ${brak.join(", ")}`);
  }
}

/* ── 4. generat aktualny wobec źródła (D1) ── */
if (BRAK_ROL) {
  pominiete.push("4. generat .claude/agents — brak źródeł, powstają w E5 i E7");
} else {
  try {
    execFileSync("node", ["audyt/tools/generuj-agentow.mjs", "--sprawdz"], { cwd: KORZEN, stdio: "pipe" });
  } catch (e) {
    // POWÓD, NIE SAM FAKT. Bramka mówiąca wyłącznie „nieaktualny" nie odróżnia
    // generatu starszego od źródła od generatu-SIEROTY, a to są dwie różne
    // naprawy: pierwsza to przebieg generatora, druga to skasowana rola albo
    // przełączona gałąź. Wyjście generatora niesie tę różnicę — połykanie go
    // zamieniało diagnostykę w zgadywanie.
    const powody = String(e.stdout ?? "").split("\n").filter((l) => l.trim().startsWith("- "));
    bledy.push(
      "generat .claude/agents/ jest nieaktualny wobec źródła (uruchom generuj-agentow.mjs)" +
      (powody.length ? `:\n      ${powody.slice(0, 3).map((l) => l.trim()).join("\n      ")}` : "")
    );
  }
}

/* ── 5. każde zgłoszenie ma dowód, kod i miejsce (zasada 1) ────────────────
   Pytamy o ZAWARTOŚĆ wpisu, nie o to, czy przeszedł przez narzędzie: wpis
   dopisany ręcznie do katalogu ominąłby `zgloszenie.mjs`, a ta reguła nie. */
{
  const z = wszystkieZgloszenia();
  for (const w of z) {
    const braki = [];
    if (!w?.id) braki.push("id");
    if (!w?.dowod) braki.push("dowod");
    if (!w?.miejsce) braki.push("miejsce");
    if (!w?.hash) braki.push("hash");
    if (braki.length) bledy.push(`zgłoszenie ${w?.id ?? "(bez id)"}: brak ${braki.join(", ")}`);
  }
  uwagi.push(`zgłoszeń w sektorze: ${z.length}`);
}

/* ── 6. trzy zasady nadrzędne DOSŁOWNIE w każdej definicji (W9) ────────────
   Reguła pyta o ZDANIE niosące zakaz, nie o sam nagłówek — definicja
   z tytułem "NIE MA WYMYŚLANIA BŁĘDÓW" i pustą treścią niczego nie zabrania. */
/**
 * ODSTĘPY JAKO `\s+`, NIE SPACJA — Markdown ZAWIJA wiersze.
 *
 * Pierwsza wersja miała w tych wzorcach zwykłe spacje i przelot próbny
 * z szablonów zapalił trzy fałszywe alarmy: zdanie "Brak dowodu = brak
 * zgłoszenia." było w pliku przełamane między "brak" a "zgłoszenia", więc
 * wzorzec go nie widział. Reguła pilnująca obecności zdania **musi** być
 * odporna na zawijanie, inaczej pilnuje formatowania zamiast treści.
 */
const odstepy = (rdzen) => new RegExp(rdzen.replace(/ /g, "\\s+"), "i");

const ZASADY = [
  { nazwa: "nie ma wymyślania błędów", wzorzec: odstepy("brak dowodu\\s*=\\s*brak zg[łl]oszenia") },
  { nazwa: "sektory nie naprawiają", wzorzec: odstepy("znajduj[ąa] i wskazuj[ąa],? nigdy nie poprawiaj[ąa]") },
  { nazwa: "drążyć, nie przekazywać", wzorzec: odstepy("nie przekazuje go innemu dzia[łl]owi") },
];
if (BRAK_ROL) {
  pominiete.push("6. trzy zasady nadrzędne w definicjach — <sektor>/role/ powstaje w E5 i E7");
} else {
  for (const { katalog, kod, gdzie } of ROLE_WSZYSTKIE) {
    for (const plik of ["AGENT.md", "KRYTYK.md", "SKILL.md"]) {
      const sciezka = join(katalog, kod, plik);
      if (!existsSync(sciezka)) continue;
      const t = readFileSync(sciezka, "utf8");
      const brak = ZASADY.filter((z) => !z.wzorzec.test(t)).map((z) => z.nazwa);
      if (brak.length) bledy.push(`${gdzie}/${plik}: brak zasady nadrzędnej — ${brak.join("; ")}`);
    }
  }
}

/**
 * MECHANICZNY ZAKRES OBOWIĄZUJE DZIAŁY. Role procesowe — kierownik, Golden,
 * Konrad, weryfikator, raport, a w re-audycie także Psiarz, Skutki uboczne,
 * Strażnikowy i Walidacja — pracują na WYNIKACH działów, nie na liście plików,
 * więc komenda zakresu nie miałaby czego liczyć.
 *
 * Lista bierze się z `DZIALY` we `wspolne.mjs`, nie z własnej kopii: druga
 * kopia rozjechałaby się po cichu, jak każda w tym repozytorium.
 */
const ZAKRES_OBOWIAZKOWY = new Set(DZIALY);

/* ── 7. każda rola ma MECHANICZNY zakres i checklistę (K4') ────────────────
   To jest warunek powtarzalności, nie kosmetyka: rola bez listy sprawdzeń
   robi swobodny przegląd, a swobodny przegląd nie da tego samego wyniku
   w drugiej fali. */
for (const { sektor, kody } of ROLE_SEKTOROW) {
  const plik = roleMdSektora(sektor);
  if (!existsSync(plik)) {
    // Katalog ról BEZ dokumentu ról to rola bez zatwierdzonego zakresu —
    // dokładnie to, przed czym broni K4'. Sam brak obu jest stanem budowy.
    if (kody.length) bledy.push(`sektor ${sektor} ma ${kody.length} ról na dysku, a nie ma ${sektor}/ROLE.md`);
    else pominiete.push(`7. ROLE.md sektora ${sektor} — katalogu ${sektor}/ jeszcze nie ma`);
    continue;
  }
  const t = readFileSync(plik, "utf8");
  const sekcje = t.split("\n## ").filter((s) => /^[A-Z]+ —/.test(s));
  const znalezione = new Set();
  const procesowe = roleSektora(sektor).filter((k) => !ZAKRES_OBOWIAZKOWY.has(k));
  for (const s of sekcje) {
    const kod = s.match(/^([A-Z]+) —/)[1];
    znalezione.add(kod);
    const maZakres = /\*\*Zakres[^*]*\*\*\n```\n[\s\S]*?\n```/.test(s) || procesowe.includes(kod);
    // Checklista = tabela z pozycjami postaci KOD-01, KON-A1, SEC-R1.
    // Litera po myślniku jest OPCJONALNA i dowolna: Konrad ma `A`, re-audyt `R`.
    const pozycje = (s.match(new RegExp(`^\\| ${kod}-[A-Z]?\\d+ \\|`, "gm")) ?? []).length;
    if (!maZakres) bledy.push(`rola ${kod} w ${sektor}/ROLE.md nie ma mechanicznego zakresu (K4')`);
    if (pozycje < 5) bledy.push(`rola ${kod} (${sektor}) ma ${pozycje} pozycji checklisty — za mało, by wyczerpać listę (K4')`);
  }
  for (const kod of roleSektora(sektor)) {
    if (!znalezione.has(kod)) bledy.push(`${sektor}/ROLE.md nie opisuje roli ${kod}`);
  }
  uwagi.push(`ról w ${sektor}/ROLE.md: ${znalezione.size}`);
}

/* ── 8. mapa pokrycia bez sierot (W6, K2) ── */
try {
  execFileSync("node", ["audyt/tools/mapa.mjs"], { cwd: KORZEN, stdio: "pipe" });
  uwagi.push("mapa pokrycia: bez sierot");
} catch {
  bledy.push("mapa pokrycia zgłasza sieroty, sprzeczności albo pusty zakres — uruchom audyt/tools/mapa.mjs");
}

/* ── 9. narzędzie zgłoszeń przechodzi własną samokontrolę ── */
try {
  execFileSync("node", ["audyt/tools/zgloszenie.mjs", "--test"], { cwd: KORZEN, stdio: "pipe" });
  uwagi.push("zgloszenie.mjs: samokontrola zaliczona");
} catch {
  bledy.push("zgloszenie.mjs --test NIE przechodzi — bramka wpuszczania znalezisk jest zepsuta");
}

/* ── 10. trzynaście zasad Goldena DOSŁOWNIE w AGENT.md i KRYTYK.md ─────────
   `ROLE.md` obiecuje: "13 zasad Goldena wchodzi dosłownie do każdego AGENT.md
   i KRYTYK.md, a straznik-sektora-audytu.mjs sprawdza, że tam są". Do E5 tej
   kontroli NIE BYŁO — obietnica z dokumentu zaakceptowanego przez właściciela
   nie miała bramki, czyli była nie do odróżnienia od bramki, której nie ma
   (lekcja z 0.59.0). Ta reguła ją domyka.

   Wzorce pytają o TREŚĆ zasady, nie o numer na liście: lista "1..13" z pustymi
   pozycjami przechodziłaby kontrolę numerów, a nie niesie żadnego zakazu.
   Odstępy jako `\s+`, bo Markdown zawija wiersze; granice słowa przez klasy
   znaków, nigdy `\b` — `ę` w JS nie jest `\w`. */
const ZASADY_GOLDENA = [
  ["1 wymyślanie błędów", odstepy("nie dopuszczaj do wymy[śs]lania b[łl][ęe]d[óo]w")],
  ["2 własny zakres", odstepy("agent dzia[łl]a[łl] w swoim zakresie")],
  ["3 właściwy skill", odstepy("przypominaj o w[łl]a[śs]ciwym skillu")],
  ["4 podstawa i kod", odstepy("problem mia[łl] podstaw[ęe] i kod potwierdzenia")],
  ["5 status i weryfikacja", odstepy("status audytora i przej[śs]cie do weryfikacji")],
  ["6 naprawa bez szkód", odstepy("nie uszkodzi[ćc] innych obszar[óo]w")],
  ["7 wsparcie strażników", odstepy("wspieraj stra[żz]nik[óo]w")],
  ["8 rozdzielenie sektorów", odstepy("rozdzielenia audytu i re-audytu")],
  ["9 wartości początku i końca", odstepy("por[óo]wnania warto[śs]ci pocz[ąa]tku i ko[ńn]ca")],
  ["10 raport i weryfikacja", odstepy("bez raportu i weryfikacji")],
  ["11 niezależność Konrada", odstepy("konrad dzia[łl]a[łl] niezale[żz]nie")],
  ["12 kolejność cyklu", odstepy("kolejno[śs]ci: audyt #1")],
  ["13 po naprawie koniec", odstepy("po naprawie nie dopuszczaj do uruchamiania")],
];
if (BRAK_ROL) {
  pominiete.push("10. trzynaście zasad Goldena — <sektor>/role/ powstaje w E5 i E7");
} else {
  for (const { katalog, kod, gdzie } of ROLE_WSZYSTKIE) {
    for (const plik of ["AGENT.md", "KRYTYK.md"]) {
      const sciezka = join(katalog, kod, plik);
      if (!existsSync(sciezka)) continue;
      const t = readFileSync(sciezka, "utf8");
      const brak = ZASADY_GOLDENA.filter(([, w]) => !w.test(t)).map(([n]) => n);
      if (brak.length) bledy.push(`${gdzie}/${plik}: brak zasad Goldena — ${brak.join("; ")}`);
    }
  }
}

/* ── 11. golden roli jest MIARĄ, nie prozą ─────────────────────────────────
   Każdy blok JSON w goldenie przechodzi przez `powodyOdmowy()` — TĘ SAMĄ
   funkcję, którą bramka ocenia prawdziwe zgłoszenia. Blok oznaczony
   "przechodzi" musi przejść, "odrzucony" musi zostać odrzucony, i to
   z powodu, który sam deklaruje w znaczniku ODRZUCA.

   Sprawdzenie powodu jest tu z tej samej przyczyny, dla której audyt mutacyjny
   projektu dostał w 0.47.0 pole `oczekiwanySlad`: "zapaliło się" nie znaczy
   "zapaliło się z właściwego powodu", a mutacja łamiąca dwie reguły naraz
   maskuje jedną z nich.

   Skutek uboczny jest zamierzony: golden wskazujący miejsce, które zniknęło
   z kodu, zapala strażnika. Golden nie może zgnić po cichu. */
function blokiGoldena(tekst) {
  const wynik = [];
  const re = /```json\n([\s\S]*?)\n```/g;
  let m;
  let koniecPoprzedniego = 0;
  while ((m = re.exec(tekst)) !== null) {
    const przed = tekst.slice(koniecPoprzedniego, m.index);
    wynik.push({
      sprawdzany: przed.match(/<!--\s*SPRAWDZANY:\s*(przechodzi|odrzucony)\s*-->/i)?.[1]?.toLowerCase() ?? null,
      odrzuca: [...przed.matchAll(/<!--\s*ODRZUCA:\s*(.+?)\s*-->/g)].map((x) => x[1]),
      json: m[1],
    });
    koniecPoprzedniego = re.lastIndex;
  }
  return wynik;
}

if (BRAK_ROL) {
  pominiete.push("11. golden jako miara — <sektor>/role/ powstaje w E5 i E7");
} else {
  for (const { sektor, katalog: katalogRol, kod, gdzie } of ROLE_WSZYSTKIE) {
    const ZNANE = new Set(roleSektora(sektor));
    const katalog = join(katalogRol, kod, "goldeny");
    if (!existsSync(katalog)) { bledy.push(`rola ${gdzie} nie ma katalogu goldeny/`); continue; }
    const pliki = readdirSync(katalog).filter((f) => f.endsWith(".md"));
    if (!pliki.length) { bledy.push(`rola ${gdzie}: katalog goldeny/ jest pusty`); continue; }

    let przechodzacych = 0;
    let odrzucanych = 0;
    for (const nazwa of pliki) {
      const bloki = blokiGoldena(readFileSync(join(katalog, nazwa), "utf8"));
      if (!bloki.length) { bledy.push(`${gdzie}/goldeny/${nazwa}: brak bloku JSON — golden bez przykładu niczego nie mierzy`); continue; }
      for (const [i, b] of bloki.entries()) {
        const gdzieBlok = `${gdzie}/goldeny/${nazwa} blok ${i + 1}`;
        if (!b.sprawdzany) { bledy.push(`${gdzieBlok}: brak znacznika SPRAWDZANY — blok poza miarą`); continue; }
        let wpis;
        try { wpis = JSON.parse(b.json); }
        catch (e) { bledy.push(`${gdzieBlok}: niepoprawny JSON — ${e.message}`); continue; }
        // Dział bierzemy z KATALOGU, nie z wpisu: katalog jest prawdą o tym,
        // czyj to golden. Rozjazd między nimi jest osobnym błędem, bo golden
        // uczyłby wtedy przypisywania znaleziska do cudzego działu (K4').
        if (ZNANE.has(kod)) {
          if (wpis.dzial !== kod) bledy.push(`${gdzieBlok}: golden roli ${kod} deklaruje dział "${wpis.dzial}"`);
        } else {
          wpis.dzial = DZIALY[0]; // rola próbna z szablonów — kod działu nie jest przedmiotem tej reguły
        }
        const powody = powodyOdmowy(wpis);
        if (b.sprawdzany === "przechodzi") {
          przechodzacych++;
          if (powody.length) bledy.push(`${gdzieBlok}: miał przejść, a bramka odrzuca — ${powody[0].split("\n")[0]}`);
        } else {
          odrzucanych++;
          if (!powody.length) {
            bledy.push(`${gdzieBlok}: miał zostać odrzucony, a bramka go PRZYJMUJE — zły przykład niczego nie uczy`);
          } else {
            for (const oczekiwany of b.odrzuca) {
              if (!powody.some((p) => p.includes(oczekiwany))) {
                bledy.push(`${gdzieBlok}: odrzucony, ale NIE z powodu "${oczekiwany}" — zapaliło się co innego`);
              }
            }
          }
        }
      }
    }
    if (!przechodzacych) bledy.push(`rola ${gdzie}: golden nie ma ani jednego przykładu DOBREGO`);
    if (!odrzucanych) bledy.push(`rola ${gdzie}: golden nie ma ani jednego przykładu ZŁEGO — bez niego nie jest miarą`);
  }
}

/* ── 12. komplet plików roli i brak ról-sierot ─────────────────────────────
   Reguły 2, 3 i 11 pilnują KRYTYK.md, AGENT.md i goldenów. Zostaje SKILL.md
   — bez niego rola nie ma procedury, a Golden pyta w GOLD-06, czy dział użył
   swojego skilla. Zostaje też odwrotna strona: katalog roli, której `ROLE.md`
   nie zna, byłby agentem bez definicji zakresu (ta sama klasa co
   generat-sierota z reguły 4).

   Kompletu 19 ról ta reguła NIE wymusza — sektor powstaje partiami i czerwony
   strażnik w połowie budowy niczego by nie pilnował, tylko zaszumiał bramkę.
   Stan budowy jedzie na wyjściu jako liczba i lista brakujących, żeby częściowy
   sektor nie wyglądał jak gotowy. */
/**
 * KOMPLET JEST TWARDY DLA SEKTORA, KTÓRY JUŻ ZBUDOWANO DO KOŃCA — i to jest
 * stan, nie przełącznik nastroju.
 *
 * Przy E5 komplet ról audytu był w trakcie budowy tylko LICZONY i wypisywany
 * jako "pominięte": czerwony strażnik w połowie partii nie pilnowałby niczego,
 * tylko zaszumiał bramkę. Utwardzono go dopiero, gdy wszystkie 19 ról istniało.
 * Sektor RE-AUDYT przeszedł tę samą drogę: komplet był MIĘKKI przez E7.4
 * i **stwardniał razem z dwudziestą pierwszą rolą**. Od tej chwili brak
 * którejkolwiek jest błędem, bo `ROLE.md` opisywałby wtedy rolę bez definicji,
 * a generat nie miałby z czego jej zbudować.
 *
 * CISZY TU NIE MA W ŻADNYM STANIE: liczba zbudowanych ról i imienna lista
 * brakujących jedzie na wyjściu zawsze. Sektor, którego katalog `role/` jeszcze
 * nie istnieje (re-audyt na gałęzi audytu), mówi "pominięte" — bo nie ma czego
 * pilnować, a nie dlatego, że jest gotowy.
 */
const KOMPLET_TWARDY = { audyt: true, "re-audyt": true };

for (const { sektor, katalog, kody } of ROLE_SEKTOROW) {
  const ZNANE = new Set(roleSektora(sektor));
  const bezProby = kody.filter((k) => k !== KOD_PROBNY);

  if (!kody.length) {
    pominiete.push(`12. komplet plików ról sektora ${sektor} — zbudowano 0 z ${ZNANE.size}`);
    continue;
  }

  for (const kod of kody) {
    // KOD_PROBNY to rola budowana z szablonów przez audyt mutacyjny — wyjątek
    // NAZWANY, jak `.claude/` w regule 1, a nie przeoczony. Wszystkie
    // pozostałe reguły obowiązują ją tak samo jak rolę prawdziwą; wyjęta jest
    // wyłącznie spod pytania "czy ROLE.md ją zna", bo z definicji nie zna.
    if (!ZNANE.has(kod) && kod !== KOD_PROBNY) {
      bledy.push(`katalog ${sektor}/role/${kod} nie odpowiada żadnej roli z ${sektor}/ROLE.md`);
    }
    if (!existsSync(join(katalog, kod, "SKILL.md"))) {
      bledy.push(`rola ${sektor}/role/${kod} nie ma SKILL.md — GOLD-06 nie miałby czego sprawdzać`);
    }
  }

  const brakujace = [...ZNANE].filter((k) => !kody.includes(k));
  uwagi.push(`ról zbudowanych (${sektor}): ${bezProby.length}/${ZNANE.size}`);
  if (brakujace.length) {
    const tresc = `sektor ${sektor}: brakuje ${brakujace.length} ról z ROLE.md — ${brakujace.join(", ")}`;
    if (KOMPLET_TWARDY[sektor]) bledy.push(`${tresc} (ROLE.md opisuje role bez definicji)`);
    else pominiete.push(`12. komplet ról sektora ${sektor} — ${tresc}; twardnieje na końcu E7.4`);
  }
}

/* ── 13. checklista roli zgodna z ROLE.md, w OBIE strony ───────────────────
   `ROLE.md` jest dokumentem, który właściciel zaakceptował; AGENT.md miał go
   PRZENIEŚĆ, nie wymyślić od nowa. Bez tej reguły oba pliki rozjeżdżają się po
   cichu — dopisana pozycja nigdy nie zostaje zadana, a pozycja usunięta z
   ROLE.md dalej jest zadawana. Obie strony rozjazdu psują porównanie fal (K4'),
   bo druga fala pracuje na innej liście pytań niż pierwsza.

   Pytamy o POZYCJE, nie o identyczność tekstu: brzmienie pytania wolno
   doprecyzować w jednym miejscu, ale lista sprawdzeń musi być ta sama. */
if (BRAK_ROL) {
  pominiete.push("13. checklisty ról zgodne z ROLE.md — <sektor>/role/ powstaje w E5 i E7");
} else {
  const sekcjeSektora = new Map();
  for (const { sektor } of ROLE_SEKTOROW) {
    const plikRoleMd = roleMdSektora(sektor);
    if (!existsSync(plikRoleMd)) continue; // brak łapie reguła 7
    const mapa = new Map();
    for (const s of readFileSync(plikRoleMd, "utf8").split("\n## ")) {
      const kod = s.match(/^([A-Z]+) —/)?.[1];
      if (kod) mapa.set(kod, s);
    }
    sekcjeSektora.set(sektor, mapa);
  }
  for (const { sektor, katalog, kod, gdzie } of ROLE_WSZYSTKIE) {
    if (!roleSektora(sektor).includes(kod)) continue; // rola próbna — ROLE.md jej nie zna z definicji
    const plik = join(katalog, kod, "AGENT.md");
    if (!existsSync(plik)) continue; // brak AGENT.md łapie reguła 3
    const wzor = new RegExp(`^\\| (${kod}-[A-Z]?\\d+) \\|`, "gm");
    const wRole = [...(sekcjeSektora.get(sektor)?.get(kod) ?? "").matchAll(wzor)].map((m) => m[1]);
    const wAgencie = [...readFileSync(plik, "utf8").matchAll(wzor)].map((m) => m[1]);
    const brakUAgenta = wRole.filter((p) => !wAgencie.includes(p));
    const nadmiar = wAgencie.filter((p) => !wRole.includes(p));
    if (brakUAgenta.length) {
      bledy.push(`rola ${gdzie}: AGENT.md NIE MA pozycji ${brakUAgenta.join(", ")} — agent nigdy nie zada tego pytania`);
    }
    if (nadmiar.length) {
      bledy.push(`rola ${gdzie}: AGENT.md ma pozycje spoza ROLE.md — ${nadmiar.join(", ")}`);
    }
  }
}

/* ── 14. generat nie niesie martwych odsyłaczy ─────────────────────────────
   Treść roli jest KOPIOWANA z `audyt/role/<KOD>/` do `.claude/agents/`, więc
   każda ścieżka względna przestaje tam wskazywać cokolwiek. Złapał to dopiero
   `straznik-linkow` z gałęzi `main` — przy commicie, 28 martwymi odsyłaczami
   w czterech generatach naraz.

   To jest druga twarz kosztu K8: niezmiennik `git diff` nie widzi `.claude/`,
   ale STRAŻNICY SKANUJĄ DYSK. Sektor, który nie pilnuje własnego generatu,
   psuje bramkę wspólną dla całego repozytorium.

   Reguła pomija bloki kodu i kod inline: tam ścieżka jest TREŚCIĄ (agent ma ją
   podać do `Read` od korzenia repo), a nie odsyłaczem do kliknięcia. */
{
  const CEL = join(KORZEN, ".claude", "agents");
  const przedrostki = Object.values(PREFIKS_AGENTA);
  const generaty = existsSync(CEL)
    ? readdirSync(CEL).filter((f) => f.endsWith(".md") && przedrostki.some((pre) => f.startsWith(pre)))
    : [];
  if (!generaty.length) {
    pominiete.push("14. odsyłacze w generacie — .claude/agents/ jest pusty");
  } else {
    for (const nazwa of generaty) {
      const tekst = readFileSync(join(CEL, nazwa), "utf8")
        .replace(/```[\s\S]*?```/g, "")
        .replace(/`[^`\n]*`/g, "");
      for (const m of tekst.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
        const cel = m[1].trim();
        if (/^(https?:|mailto:|#)/.test(cel)) continue;
        if (!existsSync(join(CEL, cel.split("#")[0]))) {
          bledy.push(
            `generat ${nazwa}: odsyłacz "${cel}" nie wskazuje niczego z .claude/agents/ ` +
            "— treść roli jest kopiowana do innego katalogu, więc w definicjach ról " +
            "ścieżki podajemy od korzenia repo, w kodzie inline"
          );
        }
      }
    }
    uwagi.push(`generatów sprawdzonych na odsyłacze: ${generaty.length}`);
  }
}

/* ── 15. narzędzie werdyktów przechodzi własną samokontrolę ────────────────
   Bliźniak reguły 9. Bez niego ścieżka sektora ma nośnik, którego nikt nie
   mierzy: krytyk i weryfikator mogliby zapisywać cokolwiek. */
try {
  execFileSync("node", ["audyt/tools/werdykt.mjs", "--test"], { cwd: KORZEN, stdio: "pipe" });
  uwagi.push("werdykt.mjs: samokontrola zaliczona");
} catch {
  bledy.push("werdykt.mjs --test NIE przechodzi — bramka werdyktów jest zepsuta");
}

/* ── 16. status ZWERYFIKOWANE tylko z kompletem werdyktów; próba nigdy cicha ─
   Pytamy o ZAWARTOŚĆ wpisu, nie o to, czy przeszedł przez `werdykt.mjs` —
   status dopisany ręcznie do pliku ominąłby narzędzie, a ta reguła nie.
   To ta sama konstrukcja co reguła 5.

   Sprawdzenie idzie W OBIE STRONY. Sam warunek "ZWERYFIKOWANE wymaga obu
   werdyktów" przepuściłby wpis z kompletem werdyktów, który UTKNĄŁ na
   DO WERYFIKACJI — a wtedy kierownik szukałby werdyktu, który już jest.

   Znacznik próby MUSI nazywać etap i MUSI zostać wypisany. Wpis próbny
   wypada z porównania fal, więc cichy znacznik byłby drogą na wyciszenie
   prawdziwego znaleziska. */
{
  const { WERDYKTY, komplet } = await import("./werdykt.mjs");
  const ODMOWNE = ["ODRZUCAM", "ODRZUCONE"];
  const proby = [];

  for (const w of wszystkieZgloszenia()) {
    const werdykty = w?.werdykt && typeof w.werdykt === "object" ? w.werdykt : {};

    for (const [kto, wpis] of Object.entries(werdykty)) {
      if (!WERDYKTY[kto]) {
        bledy.push(`zgłoszenie ${w.id}: werdykt wydała nieznana rola "${kto}"`);
      } else if (!WERDYKTY[kto].includes(wpis?.werdykt)) {
        bledy.push(`zgłoszenie ${w.id}: rola "${kto}" ma werdykt "${wpis?.werdykt}" spoza swojego zbioru`);
      }
      if (ODMOWNE.includes(wpis?.werdykt) && !String(wpis?.powod ?? "").trim()) {
        bledy.push(`zgłoszenie ${w.id}: werdykt "${wpis.werdykt}" bez powodu — odrzucenie bez powodu jest ciszą, nie wynikiem`);
      }
    }

    if (w?.status === "ZWERYFIKOWANE" && !komplet(w)) {
      bledy.push(
        `zgłoszenie ${w.id}: status ZWERYFIKOWANE bez kompletu werdyktów — ` +
        "§16 wymaga, żeby agent wykrywający nie był jedynym, kto uznaje problem za prawdziwy"
      );
    }
    if (komplet(w) && w?.status !== "ZWERYFIKOWANE") {
      bledy.push(`zgłoszenie ${w.id}: ma oba werdykty, a status to "${w.status}" — wpis utknął przed ZWERYFIKOWANE`);
    }

    if (w?.proba !== undefined) {
      if (typeof w.proba !== "string" || !w.proba.trim()) {
        bledy.push(`zgłoszenie ${w.id}: znacznik próby musi NAZWAĆ etap budowy, jest "${w.proba}"`);
      } else {
        proby.push(`${w.id}/${w.proba}`);
      }
    }
  }

  if (proby.length) uwagi.push(`wpisy PRÓBNE (poza porównaniem fal): ${proby.join(", ")}`);
}

/* ── 17. stan roli mówi prawdę: kody pozycji i niezerowa runda ─────────────
   Obie usterki wyszły z PRÓBY NA SUCHO E6, nie z lektury.

   `--niedomkniete` dzieli wejście przecinkiem, więc komentarz w nawiasie
   zapisywał się jako osobne „pozycje" — siedem realnych pozycji dało dziewięć
   wpisów, w tym „zgodnie z zakresem próby". Kierownik czyta stąd LICZBĘ
   otwartych pozycji, a `porownaj-cykle.mjs` bierze ją do porównania fal (K4'),
   więc dziennik audytu podawał nieprawdę.

   Rola, która zamknęła się z licznikiem `runda 0`, wygląda w zestawieniu jak
   rola, która nie zrobiła nic — przy roli, która przeszła całą checklistę.

   Reguła pyta o ZAWARTOŚĆ pliku stanu, nie o to, czy przeszedł przez
   `status.mjs`: plik dopisany ręcznie ominąłby narzędzie, a ta reguła nie.
   To ta sama konstrukcja co reguły 5 i 16. */
{
  const KATALOG_STANU = join(SEKTOR, "stan");
  const pliki = existsSync(KATALOG_STANU)
    ? readdirSync(KATALOG_STANU).filter((f) => f.endsWith(".json"))
    : [];

  if (!pliki.length) {
    pominiete.push("17. stan ról — żadna rola nie zaczęła jeszcze pracy");
  } else {
    for (const nazwa of pliki) {
      const w = JSON.parse(readFileSync(join(KATALOG_STANU, nazwa), "utf8"));
      for (const poz of w.niedomkniete ?? []) {
        if (!KOD_POZYCJI.test(poz)) {
          bledy.push(
            `stan ${nazwa}: "${poz}" nie jest kodem pozycji — kierownik liczy stąd ` +
            "otwarte pozycje, a porownaj-cykle.mjs bierze tę liczbę do porównania fal"
          );
        }
      }
      if (w.status === "ZAKOŃCZONE" && !(w.runda >= 1)) {
        bledy.push(`stan ${nazwa}: status ZAKOŃCZONE przy runda=${w.runda} — rola, która skończyła, odbyła co najmniej jedną rundę`);
      }
      /* ROLA MUSI NALEŻEĆ DO SWOJEGO SEKTORA. `status.mjs --pokaz` jest
         miejscem, z którego kierownik czyta, kto pracuje; stan roli, której
         w tym sektorze NIE MA (np. GOLD w re-audycie), wygląda tam jak rola,
         która jeszcze nie zaczęła — czyli kierownik czekałby na wynik, który
         nigdy nie powstanie. */
      if (!SEKTORY.includes(w.sektor)) {
        bledy.push(`stan ${nazwa}: nieznany sektor "${w.sektor}"`);
      } else if (!roleSektora(w.sektor).includes(w.rola)) {
        bledy.push(`stan ${nazwa}: rola "${w.rola}" nie istnieje w sektorze "${w.sektor}" — kierownik czekałby na wynik roli-widma`);
      }
    }
    uwagi.push(`plików stanu sprawdzonych: ${pliki.length}`);
  }
}

/* ── 18. krytyk, który MA zgłaszać, wie CZYM ────────────────────────────────
   Zmierzone przy próbie E6: 19 z 19 `KRYTYK.md` kazało „zgłosić ją jako swoje
   znalezisko", a 0 z 19 mówiło, jak to zrobić — sekcję „Jak zgłaszasz" miał
   wyłącznie `AGENT.md`. Objawiło się natychmiast: krytyk zgłosił dwie
   prawdziwe usterki PROZĄ, więc bez przepisania ich w tej samej rozmowie
   przepadłyby razem z sesją.

   Reguła pyta o PARĘ: skoro plik nakazuje zgłoszenie, musi podać drogę.
   Celuje w ROZSTRZYGNIĘCIE (czy jest wywołanie narzędzia), nie w nagłówek —
   sekcja z tytułem „Jak zgłaszasz" i pustą treścią nie prowadzi donikąd. */
{
  const NAKAZ = /zg[łl]o[śs]\s+(?:j[ąa]|je)\s+jako\s+swoje\s+znalezisko/i;
  const DROGA = /zgloszenie\.mjs\s+--plik=/;
  let sprawdzone = 0;

  for (const { katalog, kod, gdzie } of ROLE_WSZYSTKIE) {
    const plik = join(katalog, kod, "KRYTYK.md");
    if (!existsSync(plik)) continue;
    const tekst = readFileSync(plik, "utf8");
    sprawdzone++;
    if (NAKAZ.test(tekst) && !DROGA.test(tekst)) {
      bledy.push(
        `${gdzie}/KRYTYK.md: każe zgłosić własne znalezisko, ale nie podaje drogi ` +
        "(wywołania zgloszenie.mjs) — znalezisko opisane prozą znika razem z sesją"
      );
    }
  }

  if (!sprawdzone) pominiete.push("18. droga zgłaszania krytyków — brak ról na dysku");
  else uwagi.push(`krytyków z drogą zgłaszania: ${sprawdzone}`);
}

/* ── 20. zakres Pogłębiacza IDENTYCZNY z zakresem jego działu w audycie ────
   Pogłębiacz obszaru SEC pogłębia TEN SAM obszar, który zbadał dział SEC.
   Inny zakres znaczyłby, że re-audyt mierzy co innego, niż audyt zbadał —
   a wtedy łączenie sektorów po haszu (W4) przestaje cokolwiek znaczyć,
   bo porównywalibyśmy wyniki z dwóch różnych obszarów.

   Zakres jest w obu dokumentach WPISANY, nie importowany, bo `ROLE.md` czyta
   człowiek i agent, a nie tylko parser. Kopia w tym repozytorium rozjeżdża się
   po cichu ZAWSZE — więc kopia musi mieć bramkę. Porównanie po normalizacji
   białych znaków: liczy KOMENDA, nie jej łamanie w Markdownie.

   Reguła dotyczy WYŁĄCZNIE działów. `KON` re-audytu ma zakres szerszy
   z założenia (`'audyt' 're-audyt'` — audytuje oba sektory), a role procesowe
   zakresu nie mają w ogóle. */
{
  const plikRe = roleMdSektora("re-audyt");
  if (!existsSync(plikRe)) {
    pominiete.push("20. zakresy Pogłębiaczy — re-audyt/ROLE.md jeszcze nie istnieje");
  } else {
    const wAudycie = new Map(zakresyZRoleMd("audyt").map((z) => [z.kod, z.komenda]));
    const wReAudycie = zakresyZRoleMd("re-audyt").filter((z) => DZIALY.includes(z.kod));
    const plaska = (k) => String(k).replace(/\s+/g, " ").trim();
    let zgodnych = 0;
    for (const { kod, komenda } of wReAudycie) {
      const wzor = wAudycie.get(kod);
      if (!wzor) {
        bledy.push(`re-audyt/ROLE.md: Pogłębiacz ${kod} nie ma odpowiednika w audyt/ROLE.md`);
      } else if (plaska(wzor) !== plaska(komenda)) {
        bledy.push(
          `Pogłębiacz ${kod}: zakres rozjechał się z działem ${kod} audytu — ` +
          "re-audyt mierzyłby inny obszar, niż audyt zbadał, a łączenie po haszu (W4) przestaje znaczyć"
        );
      } else {
        zgodnych++;
      }
    }
    const brak = DZIALY.filter((k) => !wReAudycie.some((z) => z.kod === k));
    if (brak.length && wReAudycie.length) {
      bledy.push(`re-audyt/ROLE.md: brak Pogłębiaczy dla działów ${brak.join(", ")}`);
    }
    if (zgodnych) uwagi.push(`zakresów Pogłębiaczy zgodnych z audytem: ${zgodnych}/${DZIALY.length}`);
  }
}

/* ── 19. identyfikator zgłoszenia zgodny ze swoim SEKTOREM ─────────────────
   Oba sektory dzielą JEDEN katalog zgłoszeń (warunek łączenia po haszu, W4)
   i SIEDEMNAŚCIE kodów działów, bo Pogłębiacz obszaru SEC jest re-audytem
   działu SEC. Rozróżnia je wyłącznie PREFIKS w nazwie wpisu.

   Zmierzone przed E7: `nastepneId()` liczył kolejny numer po plikach
   zaczynających się od `AUD-<DZIAŁ>-`, więc przy wspólnym prefiksie
   zgłoszenie re-audytu w dziale SEC dostałoby nazwę `AUD-SEC-001.json`,
   którą audyt już zajął — CICHE NADPISANIE cudzego wpisu, bez jednego objawu.

   Reguła pyta o ZAWARTOŚĆ katalogu, nie o to, czy wpis przeszedł przez
   `zgloszenie.mjs`: plik dopisany ręcznie ominąłby narzędzie, a ta reguła nie.
   To ta sama konstrukcja co reguły 5, 16 i 17. */
{
  const wpisy = wszystkieZgloszenia();
  for (const w of wpisy) {
    const oczekiwany = PREFIKS_ID[w?.sektor];
    if (!oczekiwany) {
      bledy.push(`zgłoszenie ${w?.id ?? "(bez id)"}: nieznany sektor "${w?.sektor}" — wpis nie należy do żadnego przebiegu`);
      continue;
    }
    if (!String(w?.id ?? "").startsWith(`${oczekiwany}-`)) {
      bledy.push(
        `zgłoszenie ${w.id}: sektor "${w.sektor}" wymaga prefiksu "${oczekiwany}-" — ` +
        "sektory dzielą katalog i kody działów, więc wspólny prefiks nadpisuje cudzy wpis"
      );
    }
    if (!roleSektora(w.sektor).includes(w?.dzial)) {
      bledy.push(`zgłoszenie ${w.id}: dział "${w.dzial}" nie istnieje w sektorze "${w.sektor}"`);
    }
  }
  if (wpisy.length) uwagi.push(`identyfikatorów zgodnych z sektorem: ${wpisy.length}`);
  else pominiete.push("19. prefiksy identyfikatorów — w sektorze nie ma jeszcze zgłoszeń");
}

/* ── 21. model generatu zgodny z ROLE.md (D8) ──────────────────────────────
   Zmierzone przy przygotowaniu próby E7.6: `re-audyt/ROLE.md` przypisuje
   WALID model Opus — dwa razy, w nagłówku roli i w podsumowaniu — a generat
   `rea-walid` miał `model: sonnet`. Generator trzymał WŁASNĄ listę ról
   opusowych, wpisaną ręcznie przy E4, i nikt jej nie rozszerzył o czwartą rolę
   procesową re-audytu. Reguła 4 tego nie widzi: porównuje sha256 ŹRÓDŁA
   (`AGENT.md`), a model w źródle nie stoi. Weryfikator re-audytu pracowałby
   na innym modelu, niż rozstrzygnął właściciel, bez jednego objawu.

   Reguła pyta o SKUTEK — wiersz `model:` w pliku, który czyta harness —
   wobec dokumentu zaakceptowanego przez właściciela, nie o to, czy generator
   ma właściwą listę. */
{
  const CEL = join(KORZEN, ".claude", "agents");
  let sprawdzone = 0;
  for (const { sektor, kod } of ROLE_WSZYSTKIE) {
    if (!roleSektora(sektor).includes(kod)) continue; // rola próbna — ROLE.md jej nie zna z definicji
    for (const rodzaj of ["agent", "krytyk"]) {
      const nazwa = `${PREFIKS_AGENTA[sektor]}${kod.toLowerCase()}${rodzaj === "krytyk" ? "-krytyk" : ""}.md`;
      const plik = join(CEL, nazwa);
      if (!existsSync(plik)) continue; // brak generatu łapie reguła 4
      const wGeneracie = readFileSync(plik, "utf8").match(/^model:\s*(\S+)/m)?.[1];
      const wRoleMd = modelRoli(sektor, kod, rodzaj);
      sprawdzone++;
      if (wGeneracie !== wRoleMd) {
        bledy.push(
          `generat ${nazwa}: model "${wGeneracie}", a ${sektor}/ROLE.md przypisuje roli ${kod} model "${wRoleMd}" (D8) ` +
          "— rola pracowałaby na innym modelu, niż rozstrzygnął właściciel"
        );
      }
    }
  }
  if (sprawdzone) uwagi.push(`modeli generatów zgodnych z ROLE.md: ${sprawdzone}`);
  else pominiete.push("21. modele generatów — brak generatów na dysku");
}

/* ── 22. moduł krytyka wskazuje zgłoszenia SWOJEGO sektora ─────────────────
   Zmierzone przy przygotowaniu próby E7.6: 21 z 21 `KRYTYK.md` re-audytu
   wskazywało w sekcji „Moduł" pliki `audyt/zgloszenia/AUD-<KOD>-*.json`,
   czyli wpisy AUDYTU. Krytyk Pogłębiacza SEC oceniałby pracę działu SEC
   audytu, a wpisy `REA-SEC-*` nie miałyby krytyka — oba sektory dzielą
   katalog i kody działów, więc nic by się nie zapaliło. Usterka przyszła
   z szablonu, w którym prefiks stał na sztywno.

   Reguła pyta o ROZSTRZYGNIĘCIE — ścieżkę `zgloszenia/<PREFIKS>-<KOD>-`
   z prefiksem CUDZEGO sektora przy WŁASNYM kodzie roli — a nie o obecność
   napisu `AUD-` gdziekolwiek: wzmianka o wpisie drugiego sektora (łączenie
   po haszu) jest dozwolona i pilnuje jej kontrprzykład w audycie mutacyjnym. */
{
  let sprawdzone = 0;
  for (const { sektor, katalog, kod, gdzie } of ROLE_WSZYSTKIE) {
    const plik = join(katalog, kod, "KRYTYK.md");
    if (!existsSync(plik)) continue; // brak KRYTYK.md łapie reguła 2
    sprawdzone++;
    const wlasny = PREFIKS_ID[sektor];
    const cudze = new Set();
    for (const m of readFileSync(plik, "utf8").matchAll(new RegExp(`zgloszenia/([A-Z]+)-${kod}-`, "g"))) {
      if (m[1] !== wlasny) cudze.add(m[1]);
    }
    if (cudze.size) {
      bledy.push(
        `${gdzie}/KRYTYK.md: moduł wskazuje zgłoszenia "${[...cudze].join("/")}-${kod}-*", ` +
        `a sektor ${sektor} pisze pod "${wlasny}-${kod}-*" — krytyk oceniałby pracę cudzego sektora`
      );
    }
  }
  if (sprawdzone) uwagi.push(`krytyków wskazujących własny sektor: ${sprawdzone}`);
}

/* ── wynik ── */

if (bledy.length) {
  process.stdout.write("straznik-sektora-audytu:\n");
  for (const b of bledy) process.stdout.write(`  - ${b}\n`);
  process.exit(1);
}

process.stdout.write(`straznik-sektora-audytu: ${uwagi.join(", ")}.\n`);
for (const p of pominiete) process.stdout.write(`  pominięte — ${p}\n`);
process.exit(0);
