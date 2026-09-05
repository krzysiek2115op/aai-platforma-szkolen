/**
 * STRAŻNIK SEKTORÓW AUDYT i RE-AUDYT — trzydzieści jeden kontroli (numery
 * 1–31; reguła 27 ma dwie części: 27 — zdanie zakazu czytania innej fali
 * w każdej definicji, 27b — definicja nie niesie wycofanego zdania K4′; obie
 * weszły 2026-09-02 z pozycjami 4b + 6 pakietu E7.7, a reguła 7 dostała wtedy
 * wymóg pozycji otwartej `<KOD>-90` dla działów; reguły 30 i 31 weszły
 * 2026-09-03 z pozycją 7: jedna rola na środowisku `:8892` naraz i środowisko
 * MIERZONE w migawce).
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
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DZIALY, KOD_POZYCJI, KOD_PROBNY, KORZEN, NA_SRODOWISKU, PREFIKS_AGENTA, PREFIKS_ID, SEKTOR, SEKTORY,
  hashMiejsca, katalogSektora, roleMdSektora, roleSektora, wszystkieZgloszenia, znacznikModelu,
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

/**
 * TABLICA REGUŁ — jedyne źródło listy kontroli dla audytu mutacyjnego
 * (pakiet E7.7, pozycja 5, rozstrzygnięcie właściciela 4: tablica + samokontrola,
 * nie parsowanie źródła strażnika przez audyt — to byłby wzorzec na napis w nowym
 * przebraniu). Każdy komunikat błędu niesie prefiks `R<nr>:` (pomocnik `blad()`),
 * więc audyt wie, KTÓRA reguła się zapaliła, a nie tylko, że jakaś.
 *
 * `warunkowa` = reguła mówi „pominięte", gdy na gałęzi nie ma materiału.
 *
 * SAMOKONTROLA PRZY STARCIE: każdy numer z tablicy ma nagłówek sekcji
 * `/* ── N.` w tym pliku i odwrotnie, a `warunkowa` zgadza się z obecnością
 * `pominiete.push` w sekcji. Lista nie może rozjechać się z kodem po cichu —
 * inaczej audyt liczyłby macierz wobec reguł, których nie ma. Reguła 27 ma dwie
 * etykiety (`R27`, `R27b`) w jednej sekcji.
 */
export const REGULY = [
  { nr: "1", tytul: "gałąź sektora nie zmienia kodu produktu (D7, W2)", warunkowa: false },
  { nr: "2", tytul: "każda rola ma krytyka (D3)", warunkowa: true },
  { nr: "3", tytul: "komplet pięciu elementów §5 w AGENT.md", warunkowa: true },
  { nr: "4", tytul: "generat aktualny wobec źródła (D1)", warunkowa: true },
  { nr: "5", tytul: "każde zgłoszenie ma dowód, kod i miejsce", warunkowa: false },
  { nr: "6", tytul: "trzy zasady nadrzędne DOSŁOWNIE w każdej definicji (W9)", warunkowa: true },
  { nr: "7", tytul: "mechaniczny zakres, checklista ≥ 5 pozycji, pozycja otwarta -90 (K4″)", warunkowa: true },
  { nr: "8", tytul: "mapa pokrycia bez sierot (W6, K2)", warunkowa: false },
  { nr: "9", tytul: "zgloszenie.mjs --test przechodzi", warunkowa: false },
  { nr: "10", tytul: "trzynaście zasad Goldena DOSŁOWNIE w AGENT.md i KRYTYK.md", warunkowa: true },
  { nr: "11", tytul: "golden roli jest MIARĄ, nie prozą", warunkowa: true },
  { nr: "12", tytul: "komplet plików roli i brak ról-sierot", warunkowa: true },
  { nr: "13", tytul: "checklista roli zgodna z ROLE.md w OBIE strony", warunkowa: true },
  { nr: "14", tytul: "generat nie niesie martwych odsyłaczy", warunkowa: true },
  { nr: "15", tytul: "werdykt.mjs --test przechodzi", warunkowa: false },
  { nr: "16", tytul: "ZWERYFIKOWANE tylko z kompletem werdyktów; próba nazwana", warunkowa: false },
  { nr: "17", tytul: "stan roli mówi prawdę: kody, runda, fala, historia, kolejność sektorów", warunkowa: true },
  { nr: "18", tytul: "krytyk, który MA zgłaszać, wie CZYM", warunkowa: true },
  { nr: "19", tytul: "identyfikator zgłoszenia zgodny z sektorem i falą (19′)", warunkowa: true },
  { nr: "20", tytul: "zakres Pogłębiacza IDENTYCZNY z zakresem działu audytu", warunkowa: true },
  { nr: "21", tytul: "model generatu zgodny z ROLE.md (D8)", warunkowa: true },
  { nr: "22", tytul: "moduł krytyka wskazuje zgłoszenia SWOJEGO sektora", warunkowa: false },
  { nr: "23", tytul: "hash wpisu zgodny z PRZELICZONYM z miejsca (H1)", warunkowa: true },
  { nr: "24", tytul: "SZABLON goldena też jest miarą", warunkowa: false },
  { nr: "25", tytul: "porownaj-cykle.mjs --test przechodzi (K4″)", warunkowa: false },
  { nr: "26", tytul: "status.mjs --test przechodzi", warunkowa: false },
  { nr: "27", tytul: "zdanie zakazu czytania innej fali w KAŻDEJ definicji", warunkowa: false },
  { nr: "27b", tytul: "definicja nie niesie wycofanego zdania K4′", warunkowa: false },
  { nr: "28", tytul: "stan/ i migawki/ NIE są ignorowane przez gita", warunkowa: false },
  { nr: "29", tytul: "fala.mjs --test przechodzi", warunkowa: false },
  { nr: "30", tytul: "jedna rola na środowisku :8892 naraz — okna W TRAKCIE ról NA_SRODOWISKU re-audytu tej samej fali rozłączne (C3)", warunkowa: true },
  { nr: "31", tytul: "środowisko :8892 jest MIERZONE: migawka niesie pole srodowisko, srodowisko.mjs --test przechodzi", warunkowa: true },
];

{
  const zrodlo = readFileSync(fileURLToPath(import.meta.url), "utf8");
  const sekcje = new Map();
  for (const m of zrodlo.matchAll(/^\/\* ── (\d+)\.[\s\S]*?(?=^\/\* ── \d+\.|^\/\* ── wynik)/gm)) {
    sekcje.set(m[1], m[0]);
  }
  const usterki = [];
  const wTablicy = new Set(REGULY.map((r) => r.nr.replace(/[a-z]$/, "")));
  for (const r of REGULY) {
    const baza = r.nr.replace(/[a-z]$/, "");
    const sekcja = sekcje.get(baza);
    if (!sekcja) { usterki.push(`reguła ${r.nr} z tablicy REGULY nie ma sekcji "/* ── ${baza}." w kodzie`); continue; }
    if (!/^[a-z]$/.test(r.nr.slice(-1)) && sekcja.includes("pominiete.push(") !== r.warunkowa) {
      usterki.push(`reguła ${r.nr}: tablica mówi warunkowa=${r.warunkowa}, a sekcja ${sekcja.includes("pominiete.push(") ? "MA" : "NIE MA"} pominiete.push`);
    }
  }
  for (const nr of sekcje.keys()) {
    if (!wTablicy.has(nr)) usterki.push(`sekcja "/* ── ${nr}." istnieje w kodzie, a tablica REGULY jej nie zna`);
  }
  const znane = new Set(REGULY.map((r) => r.nr));
  if (znane.size !== REGULY.length) usterki.push("tablica REGULY ma powtórzony numer");
  if (usterki.length) {
    process.stdout.write("straznik-sektora-audytu: SAMOKONTROLA tablicy REGULY nie przechodzi:\n");
    for (const u of usterki) process.stdout.write(`  - ${u}\n`);
    process.exit(1);
  }
}

if (process.argv.includes("--reguly")) {
  process.stdout.write(JSON.stringify(REGULY, null, 2) + "\n");
  process.exit(0);
}

/** Jedyne wejście do listy błędów: komunikat dostaje prefiks `R<nr>:`. */
const ZNANE_NUMERY = new Set(REGULY.map((r) => r.nr));
function blad(nr, tekst) {
  if (!ZNANE_NUMERY.has(String(nr))) throw new Error(`blad(): numer reguły "${nr}" nie istnieje w tablicy REGULY`);
  bledy.push(`R${nr}: ${tekst}`);
}

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
    blad(1, `sektor zmienił ${zmienione.length} plików poza audyt/ i re-audyt/: ${zmienione.slice(0, 5).join(", ")}`);
  }
  if (brudne.length) {
    blad(1, `niezacommitowane zmiany poza audyt/ i re-audyt/: ${brudne.slice(0, 5).join(", ")}`);
  }
}

/* ── 2. każda rola ma krytyka (D3, WYTYCZNE N1) ── */
if (BRAK_ROL) {
  pominiete.push("2. para agent+krytyk — katalogi <sektor>/role/ powstają w E5 i E7");
} else {
  for (const { katalog, kod, gdzie } of ROLE_WSZYSTKIE) {
    if (!existsSync(join(katalog, kod, "KRYTYK.md"))) blad(2, `rola ${gdzie} nie ma KRYTYK.md (D3: krytyk przy KAŻDEJ roli)`);
  }
}

/* ── 3. komplet pięciu elementów (§5 regulaminu) ── */
const PIEC = ["Context", "Ograniczenia", "Moduł", "Prompt", "Narzędzia"];
if (BRAK_ROL) {
  pominiete.push("3. pięć elementów każdej roli — katalogi <sektor>/role/ powstają w E5 i E7");
} else {
  for (const { katalog, kod, gdzie } of ROLE_WSZYSTKIE) {
    const plik = join(katalog, kod, "AGENT.md");
    if (!existsSync(plik)) { blad(3, `rola ${gdzie} nie ma AGENT.md`); continue; }
    const t = readFileSync(plik, "utf8");
    const brak = PIEC.filter((e) => !new RegExp(`^##+\\s*${e}`, "im").test(t));
    if (brak.length) blad(3, `rola ${gdzie}: brak elementów §5 — ${brak.join(", ")}`);
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
    blad(4, 
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
    if (braki.length) blad(5, `zgłoszenie ${w?.id ?? "(bez id)"}: brak ${braki.join(", ")}`);
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
      if (brak.length) blad(6, `${gdzie}/${plik}: brak zasady nadrzędnej — ${brak.join("; ")}`);
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

/* ── 7. każda rola ma MECHANICZNY zakres i checklistę; dział — pozycję otwartą ─
   Checklista jest MINIMUM (K4″, REGULAMIN §15): bez listy nie da się zmierzyć,
   czy rola niczego nie pominęła. Nie jest sufitem — dlatego każdy DZIAŁ (14
   audytu + 14 Pogłębiaczy; rozstrzygnięcie właściciela 2026-09-02, pytanie 1)
   ma pozycję otwartą `<KOD>-90`, pod którą ląduje znalezisko spoza listy.
   Bez niej „szukaj dalej w swoim zakresie" nie ma gdzie wylądować, a
   `porownaj-cykle` nie ma czego oznaczyć jako otwarte. Role procesowe jej
   nie mają — ich przedmiot jest zamknięty (wyniki innych ról). */
for (const { sektor, kody } of ROLE_SEKTOROW) {
  const plik = roleMdSektora(sektor);
  if (!existsSync(plik)) {
    // Katalog ról BEZ dokumentu ról to rola bez zatwierdzonego zakresu —
    // dokładnie to, przed czym broni K4'. Sam brak obu jest stanem budowy.
    if (kody.length) blad(7, `sektor ${sektor} ma ${kody.length} ról na dysku, a nie ma ${sektor}/ROLE.md`);
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
    if (!maZakres) blad(7, `rola ${kod} w ${sektor}/ROLE.md nie ma mechanicznego zakresu (checklista = minimum, K4″)`);
    if (pozycje < 5) blad(7, `rola ${kod} (${sektor}) ma ${pozycje} pozycji checklisty — za mało, by wyczerpać listę (K4″: lista jest minimum)`);
    // Pytamy o WIERSZ TABELI z kodem `<KOD>-90`, nie o wzmiankę w prozie — wzmianka
    // „zgłaszasz pod SEC-90" przy braku wiersza to pozycja, której nikt nie zada.
    if (ZAKRES_OBOWIAZKOWY.has(kod) && !new RegExp(`^\\| ${kod}-90 \\|`, "m").test(s)) {
      blad(7, `rola ${kod} (${sektor}) nie ma pozycji otwartej ${kod}-90 — „szukaj dalej w zakresie" (K4″) nie ma gdzie wylądować`);
    }
  }
  for (const kod of roleSektora(sektor)) {
    if (!znalezione.has(kod)) blad(7, `${sektor}/ROLE.md nie opisuje roli ${kod}`);
  }
  uwagi.push(`ról w ${sektor}/ROLE.md: ${znalezione.size}`);
}

/* ── 8. mapa pokrycia bez sierot (W6, K2) ── */
try {
  execFileSync("node", ["audyt/tools/mapa.mjs"], { cwd: KORZEN, stdio: "pipe" });
  uwagi.push("mapa pokrycia: bez sierot");
} catch {
  blad(8, "mapa pokrycia zgłasza sieroty, sprzeczności albo pusty zakres — uruchom audyt/tools/mapa.mjs");
}

/* ── 9. narzędzie zgłoszeń przechodzi własną samokontrolę ── */
try {
  execFileSync("node", ["audyt/tools/zgloszenie.mjs", "--test"], { cwd: KORZEN, stdio: "pipe" });
  uwagi.push("zgloszenie.mjs: samokontrola zaliczona");
} catch {
  blad(9, "zgloszenie.mjs --test NIE przechodzi — bramka wpuszczania znalezisk jest zepsuta");
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
      if (brak.length) blad(10, `${gdzie}/${plik}: brak zasad Goldena — ${brak.join("; ")}`);
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
    if (!existsSync(katalog)) { blad(11, `rola ${gdzie} nie ma katalogu goldeny/`); continue; }
    const pliki = readdirSync(katalog).filter((f) => f.endsWith(".md"));
    if (!pliki.length) { blad(11, `rola ${gdzie}: katalog goldeny/ jest pusty`); continue; }

    let przechodzacych = 0;
    let odrzucanych = 0;
    for (const nazwa of pliki) {
      const bloki = blokiGoldena(readFileSync(join(katalog, nazwa), "utf8"));
      if (!bloki.length) { blad(11, `${gdzie}/goldeny/${nazwa}: brak bloku JSON — golden bez przykładu niczego nie mierzy`); continue; }
      for (const [i, b] of bloki.entries()) {
        const gdzieBlok = `${gdzie}/goldeny/${nazwa} blok ${i + 1}`;
        if (!b.sprawdzany) { blad(11, `${gdzieBlok}: brak znacznika SPRAWDZANY — blok poza miarą`); continue; }
        let wpis;
        try { wpis = JSON.parse(b.json); }
        catch (e) { blad(11, `${gdzieBlok}: niepoprawny JSON — ${e.message}`); continue; }
        // Dział bierzemy z KATALOGU, nie z wpisu: katalog jest prawdą o tym,
        // czyj to golden. Rozjazd między nimi jest osobnym błędem, bo golden
        // uczyłby wtedy przypisywania znaleziska do cudzego działu (K4').
        if (ZNANE.has(kod)) {
          if (wpis.dzial !== kod) blad(11, `${gdzieBlok}: golden roli ${kod} deklaruje dział "${wpis.dzial}"`);
        } else {
          wpis.dzial = DZIALY[0]; // rola próbna z szablonów — kod działu nie jest przedmiotem tej reguły
        }
        const powody = powodyOdmowy(wpis);
        if (b.sprawdzany === "przechodzi") {
          przechodzacych++;
          if (powody.length) blad(11, `${gdzieBlok}: miał przejść, a bramka odrzuca — ${powody[0].split("\n")[0]}`);
        } else {
          odrzucanych++;
          if (!powody.length) {
            blad(11, `${gdzieBlok}: miał zostać odrzucony, a bramka go PRZYJMUJE — zły przykład niczego nie uczy`);
          } else {
            for (const oczekiwany of b.odrzuca) {
              if (!powody.some((p) => p.includes(oczekiwany))) {
                blad(11, `${gdzieBlok}: odrzucony, ale NIE z powodu "${oczekiwany}" — zapaliło się co innego`);
              }
            }
          }
        }
      }
    }
    if (!przechodzacych) blad(11, `rola ${gdzie}: golden nie ma ani jednego przykładu DOBREGO`);
    if (!odrzucanych) blad(11, `rola ${gdzie}: golden nie ma ani jednego przykładu ZŁEGO — bez niego nie jest miarą`);
  }
}

/* ── 24. SZABLON goldena też jest miarą (2026-09-02) ───────────────────────
   Reguła 11 sprawdza goldeny RÓL. Szablonu `<sektor>/szablony/golden.md` nie
   sprawdzała ŻADNA reguła — a to z niego powstaje golden każdej nowej roli.

   Zmierzone tego samego dnia: dopisanie sekcji K4″ do §15 regulaminu przesunęło
   linię, którą szablon wskazuje jako przykład DOBRY, o 31 pozycji. Strażnik był
   przy tym ZIELONY; rozjazd wyszedł dopiero z audytu mutacyjnego, gdy mutacja
   zbudowała rolę próbną z tego szablonu — czyli przez przypadek, nie przez
   bramkę. Szablon, z którego kopiuje się miarę, musi spełniać tę samą miarę. */
{
  for (const sektor of SEKTORY) {
    const plik = join(katalogSektora(sektor), "szablony", "golden.md");
    if (!existsSync(plik)) continue; // sektor bez szablonów łapie reguła 3
    const bloki = blokiGoldena(readFileSync(plik, "utf8"));
    if (!bloki.length) { blad(24, `${sektor}/szablony/golden.md: brak bloku JSON — szablon miary bez przykładu`); continue; }
    for (const [i, b] of bloki.entries()) {
      const gdzie = `${sektor}/szablony/golden.md blok ${i + 1}`;
      if (!b.sprawdzany) { blad(24, `${gdzie}: brak znacznika SPRAWDZANY`); continue; }
      let wpis;
      try { wpis = JSON.parse(b.json.replaceAll("<KOD>", DZIALY[0])); }
      catch (e) { blad(24, `${gdzie}: niepoprawny JSON — ${e.message}`); continue; }
      const powody = powodyOdmowy(wpis);
      if (b.sprawdzany === "przechodzi" && powody.length) {
        blad(24, `${gdzie}: miał przejść, a bramka odrzuca — ${powody[0].split("\n")[0]}`);
      }
      if (b.sprawdzany === "odrzucony" && !powody.length) {
        blad(24, `${gdzie}: miał zostać odrzucony, a bramka go PRZYJMUJE`);
      }
    }
    uwagi.push(`${sektor}/szablony/golden.md: bloków sprawdzonych ${bloki.length}`);
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
      blad(12, `katalog ${sektor}/role/${kod} nie odpowiada żadnej roli z ${sektor}/ROLE.md`);
    }
    if (!existsSync(join(katalog, kod, "SKILL.md"))) {
      blad(12, `rola ${sektor}/role/${kod} nie ma SKILL.md — GOLD-06 nie miałby czego sprawdzać`);
    }
  }

  const brakujace = [...ZNANE].filter((k) => !kody.includes(k));
  uwagi.push(`ról zbudowanych (${sektor}): ${bezProby.length}/${ZNANE.size}`);
  if (brakujace.length) {
    const tresc = `sektor ${sektor}: brakuje ${brakujace.length} ról z ROLE.md — ${brakujace.join(", ")}`;
    if (KOMPLET_TWARDY[sektor]) blad(12, `${tresc} (ROLE.md opisuje role bez definicji)`);
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
      blad(13, `rola ${gdzie}: AGENT.md NIE MA pozycji ${brakUAgenta.join(", ")} — agent nigdy nie zada tego pytania`);
    }
    if (nadmiar.length) {
      blad(13, `rola ${gdzie}: AGENT.md ma pozycje spoza ROLE.md — ${nadmiar.join(", ")}`);
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
          blad(14, 
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
  blad(15, "werdykt.mjs --test NIE przechodzi — bramka werdyktów jest zepsuta");
}

/* ── 25. narzędzie porównania fal przechodzi własną samokontrolę (K4″) ─────
   Trzeci bliźniak reguł 9 i 15. `porownaj-cykle.mjs` biegnie dopiero po obu
   falach, więc strażnik nie ma go na czym uruchomić naprawdę — samokontrola
   woła je na ATRAPACH dwóch fal (czyste funkcje i przebieg CLI na katalogu
   tymczasowym). Bez niej regresja do K4′ (rozjazd = kod 1 = STOP), ślepota
   na werdykty (POTWIERDZONE w fali 1 i ODRZUCONE w fali 2 wychodzą „zgodne")
   albo martwy `--dzial=` nie miałyby żadnego objawu aż do końca dwóch fal —
   czyli do chwili, gdy narzędzie jest potrzebne pierwszy raz. */
try {
  execFileSync("node", ["audyt/tools/porownaj-cykle.mjs", "--test"], { cwd: KORZEN, stdio: "pipe" });
  uwagi.push("porownaj-cykle.mjs: samokontrola zaliczona");
} catch {
  blad(25, "porownaj-cykle.mjs --test NIE przechodzi — porównanie fal jest zepsute (K4″)");
}

/* ── 26. narzędzie stanu ról przechodzi własną samokontrolę (pozycja 3 E7.7) ─
   Czwarty bliźniak reguł 9, 15 i 25. `status.mjs` dostał cztery odmowy
   (fala, kolejność sektorów, cofanie przy Pogłębiaczu, drzewo produktu wobec
   migawki) i dziennik wejść; reguła 17 pilnuje ich SKUTKU w plikach stanu,
   ale plik stanu powstaje dopiero, gdy rola pracuje — regresja narzędzia
   między przebiegami nie miałaby żadnego objawu aż do pierwszej fali. */
try {
  execFileSync("node", ["audyt/tools/status.mjs", "--test"], { cwd: KORZEN, stdio: "pipe" });
  uwagi.push("status.mjs: samokontrola zaliczona");
} catch {
  blad(26, "status.mjs --test NIE przechodzi — kolejność sektorów (W5) i dziennik wejść (KIER-05) są bez bramki");
}

/* ── 28. stan/ i migawki/ NIE są ignorowane przez gita (pozycja 4 E7.7) ───
   Rozstrzygnięcie właściciela 2026-09-02 (pytanie 4): `audyt/stan/`
   i `audyt/migawki/` WCHODZĄ do gita. Bez tego izolacja fali 2 worktree'em
   nie ma jak oddać stanu do głównego drzewa (`fala.mjs --scal=2` scala
   commity, nie pliki nieśledzone), `porownaj-cykle --dzial=` nie widzi
   ZAKOŃCZONE fali 2, a dziennik wejść (historia przejść) nie jest dowodem.

   Pytamy `git check-ignore --no-index` o ścieżkę-atrapę w każdym z trzech
   katalogów nośnika: `--no-index`, bo tracked plik NIE jest raportowany jako
   ignorowany nawet przy pasującym wzorcu — pomiar na prawdziwym pliku
   przechodziłby po pustce, dopóki ktoś nie dodałby NOWEGO. Kod 0 = ignorowany. */
{
  const atrapy = ["audyt/stan/proba-reguly-28.json", "audyt/migawki/proba-reguly-28.json", "audyt/zgloszenia/proba-reguly-28.json"];
  for (const sciezka of atrapy) {
    const r = spawnSync("git", ["check-ignore", "-q", "--no-index", sciezka], { cwd: KORZEN });
    if (r.status === 0) {
      blad(28, 
        `${sciezka.split("/").slice(0, 2).join("/")}/ jest IGNOROWANY przez gita — stan fali 2 z worktree nie wróciłby do drzewa sektora, ` +
        "a dziennik wejść przestałby być dowodem (rozstrzygnięcie właściciela 2026-09-02: stan/ i migawki/ do gita)"
      );
    }
  }
  uwagi.push("nośnik (zgloszenia/, stan/, migawki/) śledzony przez gita");
}

/* ── 29. narzędzie worktree fali 2 przechodzi własną samokontrolę ──────────
   Piąty bliźniak reguł 9, 15, 25 i 26. `fala.mjs` biegnie dopiero między
   falami, więc strażnik nie ma go na czym uruchomić naprawdę — samokontrola
   stawia i scala worktree na TYMCZASOWYM repozytorium z kopią prawdziwych
   narzędzi i mierzy izolację PARĄ: `status.mjs` w pełnym drzewie odmawia
   fali 2 (widać falę 1), w worktree wpuszcza. Bez tej reguły worktree bez
   wykluczeń („działa" w lekturze dokumentacji) nie miałby objawu aż do
   chwili, gdy agent fali 2 otworzyłby wpis fali 1. */
try {
  execFileSync("node", ["audyt/tools/fala.mjs", "--test"], { cwd: KORZEN, stdio: "pipe" });
  uwagi.push("fala.mjs: samokontrola zaliczona");
} catch {
  blad(29, "fala.mjs --test NIE przechodzi — worktree fali 2 nie chowa fali 1 albo nie scala jej stanu (trzecia warstwa ślepoty fali 2)");
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
        blad(16, `zgłoszenie ${w.id}: werdykt wydała nieznana rola "${kto}"`);
      } else if (!WERDYKTY[kto].includes(wpis?.werdykt)) {
        blad(16, `zgłoszenie ${w.id}: rola "${kto}" ma werdykt "${wpis?.werdykt}" spoza swojego zbioru`);
      }
      if (ODMOWNE.includes(wpis?.werdykt) && !String(wpis?.powod ?? "").trim()) {
        blad(16, `zgłoszenie ${w.id}: werdykt "${wpis.werdykt}" bez powodu — odrzucenie bez powodu jest ciszą, nie wynikiem`);
      }
    }

    if (w?.status === "ZWERYFIKOWANE" && !komplet(w)) {
      blad(16, 
        `zgłoszenie ${w.id}: status ZWERYFIKOWANE bez kompletu werdyktów — ` +
        "§16 wymaga, żeby agent wykrywający nie był jedynym, kto uznaje problem za prawdziwy"
      );
    }
    if (komplet(w) && w?.status !== "ZWERYFIKOWANE") {
      blad(16, `zgłoszenie ${w.id}: ma oba werdykty, a status to "${w.status}" — wpis utknął przed ZWERYFIKOWANE`);
    }

    if (w?.proba !== undefined) {
      if (typeof w.proba !== "string" || !w.proba.trim()) {
        blad(16, `zgłoszenie ${w.id}: znacznik próby musi NAZWAĆ etap budowy, jest "${w.proba}"`);
      } else {
        proby.push(`${w.id}/${w.proba}`);
      }
    }
  }

  if (proby.length) uwagi.push(`wpisy PRÓBNE (poza porównaniem fal): ${proby.join(", ")}`);
}

/* ── 17. stan roli mówi prawdę: kody pozycji, runda, fala, HISTORIA, KOLEJNOŚĆ ─
   Pierwsze dwie usterki wyszły z PRÓBY NA SUCHO E6, nie z lektury.

   `--niedomkniete` dzieli wejście przecinkiem, więc komentarz w nawiasie
   zapisywał się jako osobne „pozycje" — siedem realnych pozycji dało dziewięć
   wpisów, w tym „zgodnie z zakresem próby". Kierownik czyta stąd LICZBĘ
   otwartych pozycji (KIER-01); `porownaj-cykle.mjs` czyta z pliku stanu
   WYŁĄCZNIE `status` działu — wcześniejszy zapis, że „bierze tę liczbę do
   porównania fal", był nieprawdą (sprostowane 2026-09-02).

   Rola, która zamknęła się z licznikiem `runda 0`, wygląda w zestawieniu jak
   rola, która nie zrobiła nic — przy roli, która przeszła całą checklistę.

   OD POZYCJI 3 PAKIETU E7.7 (2026-09-02) reguła pilnuje też tego, czego
   `status.mjs` do tej pory nie zapisywał wcale: fala ∈ {1, 2}; HISTORIA przejść
   (dziennik wejść z KIER-05) niepusta, czasy ISO w porządku niemalejącym,
   ostatni wpis zgodny ze stanem; oraz KOLEJNOŚĆ SEKTORÓW dla czternastu działów
   — Pogłębiacz, który wszedł, wymaga działu audytu tej samej fali ze statusem
   ZAKOŃCZONE i z chwilą zakończenia WCZEŚNIEJSZĄ niż jego wejście (W5, K9′).
   Ten drugi warunek łapie dział cofnięty PO wejściu re-audytu, choć
   `status.mjs` takiego cofnięcia odmawia — plik dopisany ręcznie ominąłby
   narzędzie, a ta reguła nie. Role procesowe re-audytu są wolne od blokady
   (rozstrzygnięcie właściciela 2026-09-02), pilnuje tego kontrprzykład.

   Stan PRÓBNY (`proba: "E7.6"`) wypada wyłącznie spod kolejności sektorów —
   tak jak wpis próbny wypada z porównania fal — i NIGDY nie jest cichy: idzie
   na wyjście po nazwie. Próba E7.6 przejechała Pogłębiacza SEC bez działu SEC
   audytu, czyli dokładnie to, czego ta reguła odtąd zabrania.

   WPIS HISTORII z polem `proba` (D15, 2026-09-05) też wypada z porównania —
   ale tylko ten wpis, nie cały stan. Wejście prawdziwej fali na plik z próby
   zostawia wpisy próbne w historii (`zdejmijProbe` w `status.mjs`), więc bez
   tego rozróżnienia chwilą wejścia Pogłębiacza SEC był wpis z 2026-09-01
   (próba E7.6), wcześniejszy niż zakończenie działu SEC audytu z 2026-09-03 —
   fałszywy alarm, który zatrzymał falę kontrolną. Wpis próbny jest OZNACZONY
   polem, nie rozpoznawany po dacie z adnotacji: wpis BEZ pola i z tą samą datą
   MUSI dalej zapalać regułę (pilnuje tego mutacja z kontrprzykładem).

   Reguła pyta o ZAWARTOŚĆ pliku stanu, nie o to, czy przeszedł przez
   `status.mjs`, i ma WŁASNY kod zamiast importu z narzędzia (jak reguła 21):
   pomiar tą samą funkcją, która produkuje stan, nie mierzy niczego. */
{
  const KATALOG_STANU = join(SEKTOR, "stan");
  const pliki = existsSync(KATALOG_STANU)
    ? readdirSync(KATALOG_STANU).filter((f) => f.endsWith(".json"))
    : [];

  if (!pliki.length) {
    pominiete.push("17. stan ról — żadna rola nie zaczęła jeszcze pracy");
  } else {
    const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    const czas = (k) => Date.parse(k);
    const NIE_ROZPOCZETO = "NIE ROZPOCZĘTO";
    /** Wejście: status inny niż NIE ROZPOCZĘTO **albo** choć jedna runda (`--runda` przed statusem to też wejście). */
    const wszedl = (w) => Boolean(w) && (w.status !== NIE_ROZPOCZETO || (w.runda ?? 0) > 0);
    /** Wpis historii z polem `proba` pochodzi z próby na sucho — nie jest wejściem fali (D15, 2026-09-05). */
    const zProby = (wpis) => typeof wpis?.proba === "string" && wpis.proba.trim() !== "";
    const chwilaWejscia = (w) => (w.historia ?? []).find((wpis) => !zProby(wpis) && wszedl(wpis))?.kiedy ?? null;
    /** Chwila zakończenia = początek OSTATNIEJ nieprzerwanej serii ZAKOŃCZONE w historii. */
    const chwilaZakonczenia = (w) => {
      const h = w.historia ?? [];
      let i = h.length;
      while (i > 0 && h[i - 1]?.status === "ZAKOŃCZONE") i--;
      return i < h.length ? h[i].kiedy : null;
    };

    const stany = pliki.map((nazwa) => ({ nazwa, w: JSON.parse(readFileSync(join(KATALOG_STANU, nazwa), "utf8")) }));
    // Odpowiednik szukany po ZAWARTOŚCI (sektor, fala, rola), nie po nazwie pliku.
    const poKluczu = new Map(stany.map(({ w }) => [`${w.sektor}-f${w.fala}-${w.rola}`, w]));
    const probne = [];

    for (const { nazwa, w } of stany) {
      for (const poz of w.niedomkniete ?? []) {
        if (!KOD_POZYCJI.test(poz)) {
          blad(17, 
            `stan ${nazwa}: "${poz}" nie jest kodem pozycji — kierownik liczy stąd ` +
            "otwarte pozycje (KIER-01), a komentarz rozbity przecinkiem fałszuje tę liczbę"
          );
        }
      }
      if (w.status === "ZAKOŃCZONE" && !(w.runda >= 1)) {
        blad(17, `stan ${nazwa}: status ZAKOŃCZONE przy runda=${w.runda} — rola, która skończyła, odbyła co najmniej jedną rundę`);
      }
      /* ROLA MUSI NALEŻEĆ DO SWOJEGO SEKTORA. `status.mjs --pokaz` jest
         miejscem, z którego kierownik czyta, kto pracuje; stan roli, której
         w tym sektorze NIE MA (np. GOLD w re-audycie), wygląda tam jak rola,
         która jeszcze nie zaczęła — czyli kierownik czekałby na wynik, który
         nigdy nie powstanie. */
      if (!SEKTORY.includes(w.sektor)) {
        blad(17, `stan ${nazwa}: nieznany sektor "${w.sektor}"`);
      } else if (!roleSektora(w.sektor).includes(w.rola)) {
        blad(17, `stan ${nazwa}: rola "${w.rola}" nie istnieje w sektorze "${w.sektor}" — kierownik czekałby na wynik roli-widma`);
      }

      if (![1, 2].includes(w.fala)) {
        blad(17, `stan ${nazwa}: fala "${w.fala}" poza {1, 2} — zgłoszenia znają tylko dwie fale, taki stan nie należy do żadnego przebiegu`);
      }

      /* HISTORIA PRZEJŚĆ — dziennik wejść KIER-05. */
      const h = Array.isArray(w.historia) ? w.historia : [];
      if (!h.length) {
        blad(17, `stan ${nazwa}: brak historii przejść — KIER-05 czyta stąd dziennik wejść, bez niego kolejność sektorów (W5) jest nie do sprawdzenia`);
      } else {
        let poprzedni = -Infinity;
        let zepsuta = false;
        for (const [i, wpis] of h.entries()) {
          if (!ISO.test(String(wpis?.kiedy)) || Number.isNaN(czas(wpis.kiedy))) {
            blad(17, `stan ${nazwa}: wpis ${i + 1} historii ma czas "${wpis?.kiedy}", który nie jest znacznikiem ISO — kolejności wejść nie da się porównać`);
            zepsuta = true;
            break;
          }
          if (czas(wpis.kiedy) < poprzedni) {
            blad(17, `stan ${nazwa}: historia cofa się w czasie przy wpisie ${i + 1} — dziennik wejść nie jest wtedy dziennikiem`);
            zepsuta = true;
            break;
          }
          poprzedni = czas(wpis.kiedy);
        }
        const ostatni = h[h.length - 1];
        if (!zepsuta && (ostatni.status !== w.status || ostatni.runda !== w.runda || ostatni.kiedy !== w.kiedy)) {
          blad(17, 
            `stan ${nazwa}: ostatni wpis historii (${ostatni.status}, runda ${ostatni.runda}, ${ostatni.kiedy}) ` +
            `nie zgadza się ze stanem (${w.status}, runda ${w.runda}, ${w.kiedy}) — któraś zmiana ominęła dziennik`
          );
        }
      }

      if (w.proba !== undefined) {
        if (typeof w.proba !== "string" || !w.proba.trim()) blad(17, `stan ${nazwa}: znacznik próby musi NAZWAĆ etap budowy, jest "${w.proba}"`);
        else probne.push(`${nazwa}/${w.proba}`);
      }

      /* KOLEJNOŚĆ SEKTORÓW — wyłącznie czternaście działów, ta sama fala. */
      if (w.sektor === "re-audyt" && DZIALY.includes(w.rola) && wszedl(w) && !w.proba) {
        const audyt = poKluczu.get(`audyt-f${w.fala}-${w.rola}`);
        if (!audyt || audyt.status !== "ZAKOŃCZONE") {
          blad(17, 
            `stan ${nazwa}: Pogłębiacz ${w.rola} fali ${w.fala} wszedł (${w.status}, runda ${w.runda}), a dział ${w.rola} audytu tej fali ` +
            `${audyt ? `ma status ${audyt.status}` : "nie ma pliku stanu"} — re-audyt wszedł do działu przed wyjściem audytu (W5, K9′)`
          );
        } else {
          const zakonczyl = chwilaZakonczenia(audyt);
          const wejscie = chwilaWejscia(w);
          if (zakonczyl && wejscie && !(czas(zakonczyl) < czas(wejscie))) {
            blad(17, 
              `stan ${nazwa}: Pogłębiacz ${w.rola} wszedł ${wejscie}, a dział ${w.rola} audytu zakończył ${zakonczyl} — ` +
              "audyt zakończył się PO wejściu re-audytu (W5); dział cofnięty po fakcie i domknięty ponownie?"
            );
          }
        }
      }
    }
    uwagi.push(`plików stanu sprawdzonych: ${pliki.length}`);
    if (probne.length) uwagi.push(`stany PRÓBNE (poza kolejnością sektorów): ${probne.join(", ")}`);
    const wpisyProbne = stany.flatMap(({ nazwa, w }) => (w.historia ?? []).filter(zProby).map((x) => `${nazwa}/${x.proba}@${x.kiedy}`));
    if (wpisyProbne.length) uwagi.push(`wpisy historii z PRÓBY (poza chwilą wejścia): ${wpisyProbne.join(", ")}`);
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
      blad(18, 
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
        blad(20, `re-audyt/ROLE.md: Pogłębiacz ${kod} nie ma odpowiednika w audyt/ROLE.md`);
      } else if (plaska(wzor) !== plaska(komenda)) {
        blad(20, 
          `Pogłębiacz ${kod}: zakres rozjechał się z działem ${kod} audytu — ` +
          "re-audyt mierzyłby inny obszar, niż audyt zbadał, a łączenie po haszu (W4) przestaje znaczyć"
        );
      } else {
        zgodnych++;
      }
    }
    const brak = DZIALY.filter((k) => !wReAudycie.some((z) => z.kod === k));
    if (brak.length && wReAudycie.length) {
      blad(20, `re-audyt/ROLE.md: brak Pogłębiaczy dla działów ${brak.join(", ")}`);
    }
    if (zgodnych) uwagi.push(`zakresów Pogłębiaczy zgodnych z audytem: ${zgodnych}/${DZIALY.length}`);
  }
}

/* ── 19. identyfikator zgłoszenia zgodny ze swoim SEKTOREM i swoją FALĄ ────
   Oba sektory dzielą JEDEN katalog zgłoszeń (warunek łączenia po haszu, W4)
   i SIEDEMNAŚCIE kodów działów, bo Pogłębiacz obszaru SEC jest re-audytem
   działu SEC. Rozróżnia je wyłącznie PREFIKS w nazwie wpisu.

   Zmierzone przed E7: `nastepneId()` liczył kolejny numer po plikach
   zaczynających się od `AUD-<DZIAŁ>-`, więc przy wspólnym prefiksie
   zgłoszenie re-audytu w dziale SEC dostałoby nazwę `AUD-SEC-001.json`,
   którą audyt już zajął — CICHE NADPISANIE cudzego wpisu, bez jednego objawu.

   Reguła pyta o ZAWARTOŚĆ katalogu, nie o to, czy wpis przeszedł przez
   `zgloszenie.mjs`: plik dopisany ręcznie ominąłby narzędzie, a ta reguła nie.
   To ta sama konstrukcja co reguły 5, 16 i 17.

   19′ (pakiet E7.7, pozycja 4, 2026-09-02): FALA W NAZWIE = POLE `fala`.
   Identyfikator niesie falę (`AUD-SEC-F2-001`), bo numer ciągły w dziale
   zdradzał fali 2 liczbę znalezisk fali 1 (F3). Od tej chwili DWIE warstwy
   ślepoty fali 2 czytają falę z DWÓCH różnych miejsc: sparse checkout worktree
   chowa wpisy po NAZWIE (`*-F1-*`), a `status.mjs` odmawia wejścia po POLU.
   Wpis, w którym nazwa mówi F1, a pole 2 (albo odwrotnie), robi jedną z tych
   warstw ślepą bez objawu — więc rozjazd jest błędem, nie stylem. */
{
  const wpisy = wszystkieZgloszenia();
  for (const w of wpisy) {
    const oczekiwany = PREFIKS_ID[w?.sektor];
    if (!oczekiwany) {
      blad(19, `zgłoszenie ${w?.id ?? "(bez id)"}: nieznany sektor "${w?.sektor}" — wpis nie należy do żadnego przebiegu`);
      continue;
    }
    if (!String(w?.id ?? "").startsWith(`${oczekiwany}-`)) {
      blad(19, 
        `zgłoszenie ${w.id}: sektor "${w.sektor}" wymaga prefiksu "${oczekiwany}-" — ` +
        "sektory dzielą katalog i kody działów, więc wspólny prefiks nadpisuje cudzy wpis"
      );
    }
    if (!roleSektora(w.sektor).includes(w?.dzial)) {
      blad(19, `zgłoszenie ${w.id}: dział "${w.dzial}" nie istnieje w sektorze "${w.sektor}"`);
    }
    const falaWNazwie = String(w?.id ?? "").match(/^[A-Z]+-[A-Z]+-F(\d)-\d+$/)?.[1];
    if (!falaWNazwie) {
      blad(19, 
        `zgłoszenie ${w.id}: identyfikator bez fali w nazwie — format to <PREFIKS>-<DZIAŁ>-F<N>-<numer>; ` +
        "sparse checkout fali 2 chowa wpisy po nazwie, więc wpis bez F<N> byłby widoczny obu falom"
      );
    } else if (Number(falaWNazwie) !== w?.fala) {
      blad(19, 
        `zgłoszenie ${w.id}: fala w nazwie (F${falaWNazwie}) ≠ pole fala (${w?.fala}) — ` +
        "sparse checkout chowa wpisy po NAZWIE, a status.mjs odmawia wejścia po POLU; rozjazd czyni jedną z tych warstw ślepą"
      );
    }
  }
  if (wpisy.length) uwagi.push(`identyfikatorów zgodnych z sektorem i falą: ${wpisy.length}`);
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
   ma właściwą listę.

   ODCZYT JEST WŁASNY, NIE PRZEZ `modelRoli()` (2026-09-02, trzeci model).
   Do tej pory reguła pytała tę samą funkcję, która produkuje generat — więc
   regresja tabeli modeli w `wspolne.mjs` (np. Fable odwzorowane na Sonneta)
   po regeneracji dawała generat ZGODNY z pomiarem i zieloną bramkę, choć
   kierownik pracowałby na innym modelu, niż rozstrzygnął właściciel. Kopia
   tabeli poniżej jest celowa: rozjazd między nią a `MODELE_ROL` zapala
   regułę, zamiast go ukrywać. Wartość frontmatteru musi być aliasem, który
   harness zna — literówka w aliasie oznaczałaby agenta, którego harness
   odrzuci albo podstawi mu model domyślny. */
{
  const CEL = join(KORZEN, ".claude", "agents");
  /** Nagłówek roli → alias harnessu. Kopia CELOWO niezależna od wspolne.mjs. */
  const MODELE_WG_WLASCICIELA = { Opus: "opus", Sonnet: "sonnet", "Fable 5.1": "fable" };
  /** Aliasy, które harness przyjmuje we frontmatterze `model:` (2.1.257). */
  const ALIASY_HARNESSU = new Set(["opus", "sonnet", "haiku", "fable"]);
  const modelZDokumentu = (sektor, kod, rodzaj) => {
    if (rodzaj === "krytyk") return "opus"; // D3 — krytycy zawsze Opus, niezależnie od roli
    const plik = roleMdSektora(sektor);
    if (!existsSync(plik)) return null;
    const sekcja = readFileSync(plik, "utf8").split("\n## ").find((s) => s.startsWith(`${kod} —`));
    if (!sekcja) return null;
    const znacznik = znacznikModelu(sekcja.split("\n")[0]);
    if (!znacznik && !DZIALY.includes(kod)) {
      throw new Error(`${sektor}/ROLE.md: rola procesowa ${kod} bez znacznika modelu w nagłówku — dotąd spadłaby po cichu na Sonneta`);
    }
    if (!znacznik) return "sonnet"; // DZIAŁ bez znacznika — D8; rola procesowa musi zadeklarować model
    if (!(znacznik in MODELE_WG_WLASCICIELA)) {
      throw new Error(`${sektor}/ROLE.md: nieznany model "${znacznik}" w nagłówku roli ${kod} — dotąd spadłby po cichu na Sonneta`);
    }
    return MODELE_WG_WLASCICIELA[znacznik];
  };
  let sprawdzone = 0;
  for (const { sektor, kod } of ROLE_WSZYSTKIE) {
    if (!roleSektora(sektor).includes(kod)) continue; // rola próbna — ROLE.md jej nie zna z definicji
    for (const rodzaj of ["agent", "krytyk"]) {
      const nazwa = `${PREFIKS_AGENTA[sektor]}${kod.toLowerCase()}${rodzaj === "krytyk" ? "-krytyk" : ""}.md`;
      const plik = join(CEL, nazwa);
      if (!existsSync(plik)) continue; // brak generatu łapie reguła 4
      const wGeneracie = readFileSync(plik, "utf8").match(/^model:\s*(\S+)/m)?.[1];
      let wRoleMd;
      try { wRoleMd = modelZDokumentu(sektor, kod, rodzaj); }
      catch (e) { blad(21, e.message); continue; }
      if (wRoleMd === null) continue; // brak ROLE.md albo sekcji łapią reguły 2 i 7
      sprawdzone++;
      if (!ALIASY_HARNESSU.has(wGeneracie)) {
        blad(21, `generat ${nazwa}: wartość "model: ${wGeneracie}" jest nieznana harnessowi (znane: ${[...ALIASY_HARNESSU].join(", ")})`);
      }
      if (wGeneracie !== wRoleMd) {
        blad(21, 
          `generat ${nazwa}: model "${wGeneracie}", a ${sektor}/ROLE.md przypisuje roli ${kod} model "${wRoleMd}" (D8) ` +
          "— rola pracowałaby na innym modelu, niż rozstrzygnął właściciel"
        );
      }
    }
  }
  if (sprawdzone) uwagi.push(`modeli generatów zgodnych z ROLE.md: ${sprawdzone}`);
  else pominiete.push("21. modele generatów — brak generatów na dysku");
}

/* ── 23. hash wpisu zgodny z PRZELICZONYM z miejsca (H1) ───────────────────
   Reguła 5 pyta, czy hash JEST. Nie pyta, czy jest prawdziwy — a hash to klucz,
   po którym łączą się fale (K4') i sektory (W4), więc wpis z hashem policzonym
   inną formułą nie połączy się ze swoim odpowiednikiem i wyjdzie jako rozjazd.

   Ta reguła jest jednocześnie bramką na REGRESJĘ H1 (2026-09-02): gdyby
   `hashMiejsca()` wróciło do liczenia z NUMEREM LINII, hashe zapisane we
   wpisach przestałyby się zgadzać z przeliczonymi i strażnik to powie —
   zamiast czekać, aż porównanie fal ogłosi defekt audytu przy zgodnym wyniku. */
{
  let sprawdzone = 0;
  for (const w of wszystkieZgloszenia()) {
    if (!w?.hash || !w?.miejsce) continue; // brak łapie reguła 5
    sprawdzone++;
    const przeliczony = hashMiejsca(w.miejsce);
    if (w.hash !== przeliczony) {
      blad(23, 
        `zgłoszenie ${w.id ?? "(bez id)"}: hash "${w.hash.slice(0, 12)}…" nie zgadza się z przeliczonym ` +
        `z miejsca "${przeliczony.slice(0, 12)}…" (H1) — wpis nie połączy się ze swoim odpowiednikiem`
      );
    }
  }
  if (sprawdzone) uwagi.push(`hashów zgodnych z miejscem: ${sprawdzone}`);
  else pominiete.push("23. hashe zgłoszeń — brak wpisów w sektorze");
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
      blad(22, 
        `${gdzie}/KRYTYK.md: moduł wskazuje zgłoszenia "${[...cudze].join("/")}-${kod}-*", ` +
        `a sektor ${sektor} pisze pod "${wlasny}-${kod}-*" — krytyk oceniałby pracę cudzego sektora`
      );
    }
  }
  if (sprawdzone) uwagi.push(`krytyków wskazujących własny sektor: ${sprawdzone}`);
}

/* ── 27. zdanie zakazu czytania innej fali w KAŻDEJ definicji (pozycja 4b E7.7) ─
   Pierwsza z czterech warstw ślepoty fali 2 (STRUKTURA.md, „Ślepota fali 2 ma
   CZTERY warstwy"). Do 2026-09-02 zdanie stało w 3 z 80 definicji — agent
   z `Read`/`Grep`/`Bash` nie miał w definicji ani słowa, że wpisów innej fali
   nie czyta. Warstwy 2–4 (narzędzie, dysk, porównanie) działają bez niej, ale
   są siatką; definicja jest tym, co agent NAPRAWDĘ czyta.

   Pytamy o ROZSTRZYGNIĘCIE — zdanie „nie czytasz wpisów, stanu ani wyników
   innej fali" — nie o nagłówek sekcji „Fala, w której pracujesz": nagłówek
   z pustą treścią niczego nie zabrania. Odstępy jako `\s+` (lekcja reguły 6):
   inne łamanie wiersza nie zapala (kontrprzykład w audycie). SZABLONY
   sprawdzane WPROST, nie tylko przez rolę próbną — nowa rola pisana
   z szablonu bez zdania dziedziczyłaby dziurę bez objawu. `SKILL.md` zdania
   nie musi mieć (rozstrzygnięcie właściciela, pytanie 3: harness czyta
   AGENT/KRYTYK; zakaz w dwóch plikach na rolę, nie w trzech).

   27b — DEFINICJA NIE NIESIE WYCOFANEGO K4′. Zdanie „swobodny przegląd nie da
   tego samego wyniku" znaczy dziś ODWROTNOŚĆ K4″ (REGULAMIN §15: lista jest
   MINIMUM, nie sufitem) i stało w 27 plikach. To pytanie o obecność napisu —
   ale napis JEST rozstrzygnięciem, które właściciel zastąpił; kontrprzykład:
   słowo „swobodny" w innym zdaniu nie zapala. Reguła, nie jednorazowe
   przejście skryptu (pytanie 4): szablony żyją dalej, a rola pisana z pamięci
   E5 wniosłaby K4′ z powrotem bez objawu. Tu SKILL.md też jest sprawdzany —
   zakazu nie musi mieć, ale wycofanego zdania nieść nie może. */
const ZAKAZ_INNEJ_FALI = odstepy("nie czytasz wpis[óo]w, stanu ani wynik[óo]w innej fali");
const WYCOFANE_K4 = odstepy("swobodny przegl[ąa]d nie da tego samego wyniku");
{
  const szablony = ["AGENT.md", "KRYTYK.md", "SKILL.md"].map((p) => ({
    gdzie: `audyt/szablony/${p}`, sciezka: join(SEKTOR, "szablony", p), zakaz: p !== "SKILL.md",
  }));
  const definicje = ROLE_WSZYSTKIE.flatMap(({ katalog, kod, gdzie }) =>
    ["AGENT.md", "KRYTYK.md", "SKILL.md"].map((p) => ({
      gdzie: `${gdzie}/${p}`, sciezka: join(katalog, kod, p), zakaz: p !== "SKILL.md",
    }))
  );
  let zZakazem = 0;
  for (const { gdzie, sciezka, zakaz } of [...szablony, ...definicje]) {
    if (!existsSync(sciezka)) continue; // braki plików łapią reguły 2, 3 i 12
    const t = readFileSync(sciezka, "utf8");
    if (zakaz) {
      if (ZAKAZ_INNEJ_FALI.test(t)) zZakazem++;
      else blad(27, `${gdzie}: brak zdania zakazu czytania innej fali (reguła 27 — agent fali 2 ma Read/Bash i nie ma w definicji ani słowa, że wpisów fali 1 nie czyta)`);
    }
    if (WYCOFANE_K4.test(t)) {
      blad("27b", `${gdzie}: niesie wycofane zdanie K4′ „swobodny przegląd nie da tego samego wyniku" (27b — K4″: checklista jest MINIMUM, nie sufitem)`);
    }
  }
  if (zZakazem) uwagi.push(`definicji ze zdaniem zakazu innej fali: ${zZakazem}`);
}

/* ── 30. jedna rola na środowisku naraz — okna W TRAKCIE rozłączne (pozycja 7 E7.7, C3) ─
   Pogłębiacz mierzy na `:8892` liczby (zapytania na odsłonę, wiersze, liczniki
   przed/po), a druga rola pracująca w tym samym czasie te liczby zanieczyszcza
   bez jednego objawu — dokładnie C3 z krytyki budowy. `status.mjs` odmawia
   (odmowa 6), ale plik stanu dopisany ręcznie ominąłby narzędzie; ta reguła
   pyta o HISTORIĘ: dwa stany ról `NA_SRODOWISKU` re-audytu TEJ SAMEJ fali
   z NAKŁADAJĄCYMI SIĘ oknami W TRAKCIE = błąd. Okno otwiera wpis historii ze
   statusem W TRAKCIE, zamyka pierwszy następny wpis z innym statusem; okno bez
   zamknięcia trwa do teraz. Konstrukcja jak w regule 17: stan PRÓBNY wypada
   spod reguły i jest wypisany po nazwie.

   WŁASNA KOPIA listy `NA_SRODOWISKU` (jak reguła 21 trzyma własną tabelę
   modeli): pomiar tą samą tablicą, która steruje `status.mjs`, nie mierzy
   niczego. Rozjazd kopii z `wspolne.mjs` jest błędem tej reguły. */
{
  const NA_SRODOWISKU_KOPIA = [
    "SEC", "FE", "BE", "BD", "QA", "PERF", "ARCH", "INT", "PRIV", "REPO", "WDR", "PROTO", "PIK", "USP",
    "PSIARZ", "WALID",
  ];
  const zWspolnych = [...NA_SRODOWISKU].sort().join(",");
  const kopia = [...NA_SRODOWISKU_KOPIA].sort().join(",");
  if (zWspolnych !== kopia) {
    blad(30, `lista NA_SRODOWISKU w wspolne.mjs (${zWspolnych}) różni się od kopii strażnika (${kopia}) — odmowa 6 status.mjs i ta reguła pilnowałyby różnych zbiorów ról`);
  }
  const KATALOG_STANU = join(SEKTOR, "stan");
  const pliki = existsSync(KATALOG_STANU) ? readdirSync(KATALOG_STANU).filter((f) => f.endsWith(".json")) : [];
  const stany = pliki.map((nazwa) => ({ nazwa, w: JSON.parse(readFileSync(join(KATALOG_STANU, nazwa), "utf8")) }))
    .filter(({ w }) => w?.sektor === "re-audyt" && NA_SRODOWISKU_KOPIA.includes(w.rola));
  if (!stany.length) {
    pominiete.push("30. okna W TRAKCIE na środowisku — żadna rola NA_SRODOWISKU re-audytu nie ma jeszcze pliku stanu");
  } else {
    const probne = stany.filter(({ w }) => w.proba).map(({ nazwa, w }) => `${nazwa}/${w.proba}`);
    /** Okna [od, do) W TRAKCIE z historii; `do` = Infinity, gdy okno nie zostało zamknięte. */
    const okna = (w) => {
      const wynik = [];
      let od = null;
      for (const h of w.historia ?? []) {
        const t = Date.parse(h?.kiedy);
        if (Number.isNaN(t)) continue; // czasy nie-ISO łapie reguła 17
        if (h.status === "W TRAKCIE" && od === null) od = t;
        else if (h.status !== "W TRAKCIE" && od !== null) { wynik.push([od, t]); od = null; }
      }
      if (od !== null) wynik.push([od, Infinity]);
      return wynik;
    };
    const zOknami = stany.filter(({ w }) => !w.proba).map((s) => ({ ...s, okna: okna(s.w) }));
    let sprawdzone = 0;
    for (let i = 0; i < zOknami.length; i++) {
      for (let j = i + 1; j < zOknami.length; j++) {
        const a = zOknami[i];
        const b = zOknami[j];
        if (a.w.fala !== b.w.fala) continue;
        sprawdzone++;
        for (const [a0, a1] of a.okna) {
          for (const [b0, b1] of b.okna) {
            if (a0 < b1 && b0 < a1) {
              const iso = (t) => (t === Infinity ? "teraz" : new Date(t).toISOString());
              blad(30,
                `stany ${a.nazwa} i ${b.nazwa}: ${a.w.rola} W TRAKCIE ${iso(a0)}–${iso(a1)} i ${b.w.rola} W TRAKCIE ${iso(b0)}–${iso(b1)} ` +
                `NAKŁADAJĄ SIĘ w fali ${a.w.fala} — dwie role na środowisku :8892 naraz zanieczyszczają sobie liczby (C3; jedna rola naraz, potem zrzut i przywrócenie)`
              );
            }
          }
        }
      }
    }
    uwagi.push(`par stanów ról NA_SRODOWISKU sprawdzonych na nakładanie okien: ${sprawdzone}`);
    if (probne.length) uwagi.push(`stany PRÓBNE (poza regułą 30): ${probne.join(", ")}`);
  }
}

/* ── 31. środowisko :8892 jest MIERZONE (pozycja 7 E7.7) ──────────────────
   Dwie połowy jednej rzeczy: bez pola `srodowisko` w migawce rozjazd danych
   środowiska (wiersz dopisany, zamówienie-widmo, sierota w Tutorze) jest dla
   W6 niewidzialny — migawka bez tego pola jest sprzed pozycji 7 i nie mierzy
   W6 na środowisku. Pole niesie LICZNIKI (skrót 64 hex, nasze tabele, media)
   albo DOSŁOWNE „niedostępne" — nigdy pominięcie, nigdy cokolwiek innego.
   Druga połowa: `srodowisko.mjs --test` (zrzut → zmiana → przywrócenie →
   liczniki równe, asercja liczników odrzuca podrobiony zrzut, `--sprawdz` pyta
   o zrzut bazowy, `finally` sprząta po padnięciu) — szósty bliźniak reguł
   9/15/25/26/29; bez kontenera narzędzie mówi „pominięte" i tak samo mówi ta
   reguła. */
{
  const KATALOG_MIGAWEK = join(SEKTOR, "migawki");
  const PRAWIDLOWE = (s) =>
    s === "niedostępne"
    || (s !== null && typeof s === "object" && /^[0-9a-f]{64}$/.test(String(s.skrot_tabel)) && typeof s.nasze === "object" && typeof s.media === "object");
  let migawek = 0;
  for (const nazwa of ["przed.json", "po.json"]) {
    const sciezka = join(KATALOG_MIGAWEK, nazwa);
    if (!existsSync(sciezka)) continue;
    migawek++;
    const m = JSON.parse(readFileSync(sciezka, "utf8"));
    if (m.srodowisko === undefined) {
      blad(31, `migawka audyt/migawki/${nazwa} NIE MA pola srodowisko — to migawka sprzed pozycji 7, która nie mierzy W6 na środowisku :8892 (zapisz ją ponownie: migawka-wartosci.mjs --zapisz=${nazwa.replace(".json", "")})`);
    } else if (!PRAWIDLOWE(m.srodowisko)) {
      blad(31, `migawka audyt/migawki/${nazwa}: pole srodowisko nie jest ani licznikami (skrot_tabel, nasze, media), ani dosłownym „niedostępne" — jest: ${JSON.stringify(m.srodowisko).slice(0, 60)}`);
    }
  }
  if (!migawek) pominiete.push("31. migawki — brak audyt/migawki/przed.json (powstaje przed pierwszą falą)");
  else uwagi.push(`migawek z polem srodowisko sprawdzonych: ${migawek}`);

  const r = spawnSync("node", ["audyt/tools/srodowisko.mjs", "--test"], { cwd: KORZEN, encoding: "utf8" });
  const wyjscie = (r.stdout ?? "") + (r.stderr ?? "");
  if (r.status !== 0) blad(31, "srodowisko.mjs --test NIE przechodzi — zrzut, przywrócenie i liczniki środowiska :8892 są bez bramki");
  else if (/pominięte/.test(wyjscie)) pominiete.push("31. srodowisko.mjs --test — kontener bazy nie stoi, samokontrola pominięta");
  else uwagi.push("srodowisko.mjs: samokontrola zaliczona");
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
