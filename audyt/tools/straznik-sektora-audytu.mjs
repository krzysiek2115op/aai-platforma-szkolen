/**
 * STRAŻNIK SEKTORA AUDYT — szesnaście kontroli.
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
 * KONTROLE WARUNKOWE. Reguły 2, 3, 4 i 6 dotyczą katalogu `audyt/role/`, który
 * powstaje dopiero w E5. Dopóki go nie ma, mówią wprost "pominięte" — cisza
 * byłaby nie do odróżnienia od zaliczenia.
 *
 * Użycie: node audyt/tools/straznik-sektora-audytu.mjs
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { DZIALY, KOD_PROBNY, KORZEN, PROCESOWE, ROLE_MD, SEKTOR, wszystkieZgloszenia } from "./wspolne.mjs";
import { powodyOdmowy } from "./zgloszenie.mjs";

const ROLE = join(SEKTOR, "role");

/**
 * KODY ról ustalamy RAZ i z katalogów, nie z plików.
 *
 * PRZEJŚCIE PO PUSTCE. Do tej poprawki reguły dotyczące ról pytały
 * `existsSync(ROLE)`, a katalog `audyt/role/` istniał od E4 jako PUSTY — więc
 * sześć kontroli iterowało po zerze i milczało, a wyjście wyglądało dokładnie
 * tak samo jak przy komplecie ról. Cisza była nie do odróżnienia od
 * zaliczenia; to ta sama klasa, co test negatywny przechodzący po pustce.
 * Pusty katalog znaczy teraz to samo, co brak katalogu: "pominięte".
 */
const KODY_ROL = existsSync(ROLE)
  ? readdirSync(ROLE, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()
  : [];
const BRAK_ROL = KODY_ROL.length === 0;
const bledy = [];
const pominiete = [];
const uwagi = [];

const sh = (k) => execFileSync("bash", ["-c", k], { cwd: KORZEN, encoding: "utf8", maxBuffer: 1 << 26 }).trim();

/* ── 1. gałąź sektora nie zmienia kodu produktu (D7, W2) ───────────────────
   Pytamy o SKUTEK — listę zmienionych plików poza `audyt/` — a nie o to, czy
   ktoś zadeklarował, że nic nie ruszał. */
{
  const zmienione = sh("git diff main --name-only -- . ':!audyt'").split("\n").filter(Boolean);
  // `.claude/` jest WYJĄTKIEM NAZWANYM, nie przeoczonym: to generat definicji
  // agentów (D1), z założenia nieśledzony i odtwarzalny jedną komendą ze źródła
  // w `audyt/role/`. Wyjątek jest wąski — pilnuje go reguła 4, która sprawdza
  // zgodność generatu ze źródłem po sha256 ORAZ brak generatów-sierot.
  // Bez tego wyjątku strażnik zapalałby się na własnym, zamierzonym artefakcie.
  const brudne = sh("git status --porcelain -- . ':!audyt' ':!.claude'").split("\n").filter(Boolean);
  if (zmienione.length) {
    bledy.push(`sektor zmienił ${zmienione.length} plików poza audyt/: ${zmienione.slice(0, 5).join(", ")}`);
  }
  if (brudne.length) {
    bledy.push(`niezacommitowane zmiany poza audyt/: ${brudne.slice(0, 5).join(", ")}`);
  }
}

/* ── 2. każda rola ma krytyka (D3, WYTYCZNE N1) ── */
if (BRAK_ROL) {
  pominiete.push("2. para agent+krytyk — katalog audyt/role/ powstaje w E5");
} else {
  for (const kod of KODY_ROL) {
    if (!existsSync(join(ROLE, kod, "KRYTYK.md"))) bledy.push(`rola ${kod} nie ma KRYTYK.md (D3: krytyk przy KAŻDEJ roli)`);
  }
}

/* ── 3. komplet pięciu elementów (§5 regulaminu) ── */
const PIEC = ["Context", "Ograniczenia", "Moduł", "Prompt", "Narzędzia"];
if (BRAK_ROL) {
  pominiete.push("3. pięć elementów każdej roli — katalog audyt/role/ powstaje w E5");
} else {
  for (const kod of KODY_ROL) {
    const plik = join(ROLE, kod, "AGENT.md");
    if (!existsSync(plik)) { bledy.push(`rola ${kod} nie ma AGENT.md`); continue; }
    const t = readFileSync(plik, "utf8");
    const brak = PIEC.filter((e) => !new RegExp(`^##+\\s*${e}`, "im").test(t));
    if (brak.length) bledy.push(`rola ${kod}: brak elementów §5 — ${brak.join(", ")}`);
  }
}

/* ── 4. generat aktualny wobec źródła (D1) ── */
if (BRAK_ROL) {
  pominiete.push("4. generat .claude/agents — brak źródeł, powstają w E5");
} else {
  try {
    execFileSync("node", ["audyt/tools/generuj-agentow.mjs", "--sprawdz"], { cwd: KORZEN, stdio: "pipe" });
  } catch {
    bledy.push("generat .claude/agents/ jest nieaktualny wobec źródła (uruchom generuj-agentow.mjs)");
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
  pominiete.push("6. trzy zasady nadrzędne w definicjach — audyt/role/ powstaje w E5");
} else {
  for (const kod of KODY_ROL) {
    for (const plik of ["AGENT.md", "KRYTYK.md", "SKILL.md"]) {
      const sciezka = join(ROLE, kod, plik);
      if (!existsSync(sciezka)) continue;
      const t = readFileSync(sciezka, "utf8");
      const brak = ZASADY.filter((z) => !z.wzorzec.test(t)).map((z) => z.nazwa);
      if (brak.length) bledy.push(`${kod}/${plik}: brak zasady nadrzędnej — ${brak.join("; ")}`);
    }
  }
}

/* ── 7. każda rola ma MECHANICZNY zakres i checklistę (K4') ────────────────
   To jest warunek powtarzalności, nie kosmetyka: rola bez listy sprawdzeń
   robi swobodny przegląd, a swobodny przegląd nie da tego samego wyniku
   w drugiej fali. */
{
  const t = readFileSync(ROLE_MD, "utf8");
  const sekcje = t.split("\n## ").filter((s) => /^[A-Z]+ —/.test(s));
  const znalezione = new Set();
  for (const s of sekcje) {
    const kod = s.match(/^([A-Z]+) —/)[1];
    znalezione.add(kod);
    const maZakres = /\*\*Zakres[^*]*\*\*\n```\n[\s\S]*?\n```/.test(s) || PROCESOWE.includes(kod);
    // Checklista = tabela z pozycjami postaci KOD-01 / KON-A1.
    const pozycje = (s.match(new RegExp(`^\\| ${kod}-(?:A)?\\d+ \\|`, "gm")) ?? []).length;
    if (!maZakres) bledy.push(`rola ${kod} w ROLE.md nie ma mechanicznego zakresu (K4')`);
    if (pozycje < 5) bledy.push(`rola ${kod} ma ${pozycje} pozycji checklisty — za mało, by wyczerpać listę (K4')`);
  }
  for (const kod of [...DZIALY, ...PROCESOWE]) {
    if (!znalezione.has(kod)) bledy.push(`ROLE.md nie opisuje roli ${kod}`);
  }
  uwagi.push(`ról w ROLE.md: ${znalezione.size}`);
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
  pominiete.push("10. trzynaście zasad Goldena — audyt/role/ powstaje w E5");
} else {
  for (const kod of KODY_ROL) {
    for (const plik of ["AGENT.md", "KRYTYK.md"]) {
      const sciezka = join(ROLE, kod, plik);
      if (!existsSync(sciezka)) continue;
      const t = readFileSync(sciezka, "utf8");
      const brak = ZASADY_GOLDENA.filter(([, w]) => !w.test(t)).map(([n]) => n);
      if (brak.length) bledy.push(`${kod}/${plik}: brak zasad Goldena — ${brak.join("; ")}`);
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
  pominiete.push("11. golden jako miara — audyt/role/ powstaje w E5");
} else {
  const ZNANE = new Set([...DZIALY, ...PROCESOWE]);
  for (const kod of KODY_ROL) {
    const katalog = join(ROLE, kod, "goldeny");
    if (!existsSync(katalog)) { bledy.push(`rola ${kod} nie ma katalogu goldeny/`); continue; }
    const pliki = readdirSync(katalog).filter((f) => f.endsWith(".md"));
    if (!pliki.length) { bledy.push(`rola ${kod}: katalog goldeny/ jest pusty`); continue; }

    let przechodzacych = 0;
    let odrzucanych = 0;
    for (const nazwa of pliki) {
      const bloki = blokiGoldena(readFileSync(join(katalog, nazwa), "utf8"));
      if (!bloki.length) { bledy.push(`${kod}/goldeny/${nazwa}: brak bloku JSON — golden bez przykładu niczego nie mierzy`); continue; }
      for (const [i, b] of bloki.entries()) {
        const gdzie = `${kod}/goldeny/${nazwa} blok ${i + 1}`;
        if (!b.sprawdzany) { bledy.push(`${gdzie}: brak znacznika SPRAWDZANY — blok poza miarą`); continue; }
        let wpis;
        try { wpis = JSON.parse(b.json); }
        catch (e) { bledy.push(`${gdzie}: niepoprawny JSON — ${e.message}`); continue; }
        // Dział bierzemy z KATALOGU, nie z wpisu: katalog jest prawdą o tym,
        // czyj to golden. Rozjazd między nimi jest osobnym błędem, bo golden
        // uczyłby wtedy przypisywania znaleziska do cudzego działu (K4').
        if (ZNANE.has(kod)) {
          if (wpis.dzial !== kod) bledy.push(`${gdzie}: golden roli ${kod} deklaruje dział "${wpis.dzial}"`);
        } else {
          wpis.dzial = DZIALY[0]; // rola próbna z szablonów — kod działu nie jest przedmiotem tej reguły
        }
        const powody = powodyOdmowy(wpis);
        if (b.sprawdzany === "przechodzi") {
          przechodzacych++;
          if (powody.length) bledy.push(`${gdzie}: miał przejść, a bramka odrzuca — ${powody[0].split("\n")[0]}`);
        } else {
          odrzucanych++;
          if (!powody.length) {
            bledy.push(`${gdzie}: miał zostać odrzucony, a bramka go PRZYJMUJE — zły przykład niczego nie uczy`);
          } else {
            for (const oczekiwany of b.odrzuca) {
              if (!powody.some((p) => p.includes(oczekiwany))) {
                bledy.push(`${gdzie}: odrzucony, ale NIE z powodu "${oczekiwany}" — zapaliło się co innego`);
              }
            }
          }
        }
      }
    }
    if (!przechodzacych) bledy.push(`rola ${kod}: golden nie ma ani jednego przykładu DOBREGO`);
    if (!odrzucanych) bledy.push(`rola ${kod}: golden nie ma ani jednego przykładu ZŁEGO — bez niego nie jest miarą`);
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
{
  const ZNANE = new Set([...DZIALY, ...PROCESOWE]);
  if (BRAK_ROL) {
    pominiete.push(`12. komplet plików ról — zbudowano 0 z ${ZNANE.size}`);
  } else {
    for (const kod of KODY_ROL) {
      // KOD_PROBNY to rola budowana z szablonów przez audyt mutacyjny — wyjątek
      // NAZWANY, jak `.claude/` w regule 1, a nie przeoczony. Wszystkie
      // pozostałe reguły obowiązują ją tak samo jak rolę prawdziwą; wyjęta jest
      // wyłącznie spod pytania "czy ROLE.md ją zna", bo z definicji nie zna.
      if (!ZNANE.has(kod) && kod !== KOD_PROBNY) bledy.push(`katalog audyt/role/${kod} nie odpowiada żadnej roli z ROLE.md`);
      if (!existsSync(join(ROLE, kod, "SKILL.md"))) {
        bledy.push(`rola ${kod} nie ma SKILL.md — GOLD-06 nie miałby czego sprawdzać`);
      }
    }
    const brakujace = [...ZNANE].filter((k) => !KODY_ROL.includes(k));
    const zbudowane = KODY_ROL.filter((k) => k !== KOD_PROBNY).length;
    uwagi.push(`ról zbudowanych: ${zbudowane}/${ZNANE.size}`);
    // KOMPLET JEST TWARDY OD E5. W trakcie budowy ta pozycja była tylko liczona
    // i wypisywana jako "pominięte" — czerwony strażnik w połowie partii nie
    // pilnowałby niczego, tylko zaszumiał bramkę. Od chwili, w której wszystkie
    // 19 ról istnieje, brak którejkolwiek jest BŁĘDEM: `ROLE.md` opisuje rolę,
    // której nikt nie wykonuje, a generat nie ma z czego jej zbudować.
    if (brakujace.length) {
      bledy.push(`brakuje ${brakujace.length} ról z ROLE.md: ${brakujace.join(", ")} — ROLE.md opisuje role bez definicji`);
    }
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
{
  const ZNANE = new Set([...DZIALY, ...PROCESOWE]);
  if (BRAK_ROL) {
    pominiete.push("13. checklisty ról zgodne z ROLE.md — audyt/role/ powstaje w E5");
  } else {
    const tekst = readFileSync(ROLE_MD, "utf8");
    const sekcje = new Map();
    for (const s of tekst.split("\n## ")) {
      const kod = s.match(/^([A-Z]+) —/)?.[1];
      if (kod) sekcje.set(kod, s);
    }
    for (const kod of KODY_ROL) {
      if (!ZNANE.has(kod)) continue; // rola próbna — ROLE.md jej nie zna z definicji
      const plik = join(ROLE, kod, "AGENT.md");
      if (!existsSync(plik)) continue; // brak AGENT.md łapie reguła 3
      const wzor = new RegExp(`^\\| (${kod}-(?:A)?\\d+) \\|`, "gm");
      const wRole = [...(sekcje.get(kod) ?? "").matchAll(wzor)].map((m) => m[1]);
      const wAgencie = [...readFileSync(plik, "utf8").matchAll(wzor)].map((m) => m[1]);
      const brakUAgenta = wRole.filter((p) => !wAgencie.includes(p));
      const nadmiar = wAgencie.filter((p) => !wRole.includes(p));
      if (brakUAgenta.length) {
        bledy.push(`rola ${kod}: AGENT.md NIE MA pozycji ${brakUAgenta.join(", ")} — agent nigdy nie zada tego pytania`);
      }
      if (nadmiar.length) {
        bledy.push(`rola ${kod}: AGENT.md ma pozycje spoza ROLE.md — ${nadmiar.join(", ")}`);
      }
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
  const generaty = existsSync(CEL)
    ? readdirSync(CEL).filter((f) => f.startsWith("aud-") && f.endsWith(".md"))
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

/* ── wynik ── */

if (bledy.length) {
  process.stdout.write("straznik-sektora-audytu:\n");
  for (const b of bledy) process.stdout.write(`  - ${b}\n`);
  process.exit(1);
}

process.stdout.write(`straznik-sektora-audytu: ${uwagi.join(", ")}.\n`);
for (const p of pominiete) process.stdout.write(`  pominięte — ${p}\n`);
process.exit(0);
