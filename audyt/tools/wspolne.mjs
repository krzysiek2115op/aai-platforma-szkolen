/**
 * Wspólne dla OBU SEKTORÓW (AUDYT i RE-AUDYT): ścieżki, odczyt/zapis, HASH MIEJSCA.
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
export const SEKTOR_RE = join(KORZEN, "re-audyt");

/**
 * JEDEN KATALOG ZGŁOSZEŃ DLA OBU SEKTORÓW — i to nie jest wygoda, tylko warunek.
 *
 * `polacz-sektory.mjs` łączy audyt z re-audytem po HASZU MIEJSCA, czytając
 * `wszystkieZgloszenia()`. Osobny katalog dla re-audytu zerwałby to łączenie
 * (W4), czyli sens całego kroku: audyt ustala OBRAZ, re-audyt mierzy ZASIĘG
 * tego samego miejsca. Rozstrzygnięcie właściciela 2026-09-01.
 */
export const ZGLOSZENIA = join(SEKTOR, "zgloszenia");

export const ROLE_MD = join(SEKTOR, "ROLE.md");
export const ROLE_MD_RE = join(SEKTOR_RE, "ROLE.md");

/** Oba sektory. Kolejność jest znacząca: audyt zawsze idzie pierwszy (§17). */
export const SEKTORY = ["audyt", "re-audyt"];

export const katalogSektora = (sektor) => (sektor === "re-audyt" ? SEKTOR_RE : SEKTOR);
export const roleMdSektora = (sektor) => (sektor === "re-audyt" ? ROLE_MD_RE : ROLE_MD);

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
 * RE-AUDYT: 21 ról, z czego SIEDEMNAŚCIE ma kody wspólne z audytem.
 *
 * POGŁĘBIACZ OBSZARU BIERZE KOD SWOJEGO DZIAŁU (rozstrzygnięcie właściciela
 * 2026-09-01). Pogłębiacz obszaru SEC JEST re-audytem działu SEC, więc wspólny
 * kod trzyma `GRANICE.md`, łączenie po haszu i tabelę P2 w jednej linii —
 * własnych czternastu kodów nie dałoby się z niczym połączyć. Sektory
 * rozróżnia pole `sektor` we wpisie i PREFIKS identyfikatora.
 *
 * Cztery kody są nowe, bo tych ról audyt nie ma:
 *   PSIARZ  psuje kod w miejscu znaleziska i patrzy, czy cokolwiek szczeka
 *   SKUT    skutki uboczne — regresja wobec goldenów (§5)
 *   STRAZ   projekt strażnika przeciw nawrotowi znanej klasy (§17)
 *   WALID   walidacja SZCZEGÓŁOWA — weryfikator re-audytu (§16)
 *
 * BEZ `GOLD` I BEZ `WER` — te zostają przy audycie. Rolę weryfikatora pełni
 * w re-audycie `WALID`: §16 mówi wprost „w re-audycie działa także osobny
 * proces walidacji", a `werdykt.mjs` nazywa strony ścieżki (`krytyk`,
 * `weryfikator`), nie konkretne role, więc nośnik werdyktu obsługuje oba
 * sektory bez zmiany.
 */
export const PROCESOWE_RE = ["PSIARZ", "SKUT", "STRAZ", "WALID"];

/** Role procesowe, które re-audyt ma pod tym samym kodem co audyt. */
const PROCESOWE_WSPOLNE = ["KIER", "KON", "RAP"];

/** Komplet kodów ról DANEGO sektora — jedyne źródło dla bramek i narzędzi. */
export function roleSektora(sektor) {
  return sektor === "re-audyt"
    ? [...DZIALY, ...PROCESOWE_WSPOLNE, ...PROCESOWE_RE]
    : [...DZIALY, ...PROCESOWE];
}

/**
 * PREFIKS IDENTYFIKATORA — rozróżnia sektory W NAZWIE PLIKU, nie tylko w polu.
 *
 * To nie jest kwestia nazewnictwa. `nastepneId()` liczy kolejny numer po
 * plikach zaczynających się od `<PREFIKS>-<DZIAŁ>-`, a oba sektory dzielą
 * JEDEN katalog zgłoszeń. Przy wspólnym prefiksie i wspólnych kodach działów
 * zgłoszenie re-audytu w dziale SEC dostałoby nazwę `AUD-SEC-001.json`,
 * którą audyt już zajął — czyli CICHE NADPISANIE cudzego wpisu.
 */
export const PREFIKS_ID = { audyt: "AUD", "re-audyt": "REA" };

/** Przedrostek nazwy agenta w generacie: `aud-sec`, `rea-sec`. */
export const PREFIKS_AGENTA = { audyt: "aud-", "re-audyt": "rea-" };

/**
 * KOD ROLI PRÓBNEJ audytu mutacyjnego. `audyt-straznika-sektora.mjs` buduje
 * przy każdym przebiegu rolę z SZABLONÓW i wymaga, żeby strażnik jej NIE
 * zapalił — inaczej E5 wywróciłoby się na pierwszej roli, a wyglądałoby to na
 * błąd roli, nie szablonu.
 *
 * Nazwa musi być WSPÓLNA dla obu narzędzi. Dwie kopie tego łańcucha rozjechałyby
 * się po cichu: strażnik zapalałby się na katalogu, który audyt uważa za swój.
 * To ta sama zasada, dla której zakresy działów wyprowadzamy z `ROLE.md`,
 * a `straznik-wagi-dokumentacji` czyta manifest ze skryptów pobierających.
 */
export const KOD_PROBNY = "PROBA";

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

/**
 * KOD POZYCJI CHECKLISTY — jedno źródło dla `status.mjs` i strażnika.
 *
 * DWIE USTERKI, KTÓRE TU SIEDZIAŁY, i obie były ciche. Wzorzec brzmiał
 * `/^[A-Z]{2,5}-\d{2}$/`, więc:
 *   - odrzucał `KON-A5` — a Konrad ma pozycje z literą (`KON-A1`…`KON-A6`)
 *     i JEST rolą pętlową, czyli tą, która przy suficie rund musi wypisać
 *     niedomknięte pozycje. Nie dałby rady zapisać ani jednej;
 *   - odrzucał `PSIARZ-02` — sześć liter, a sufit stał na pięciu.
 * Objaw byłby identyczny w obu przypadkach: rola dostaje „to nie jest kod
 * pozycji" przy poprawnym kodzie i albo kłamie w polu, albo milczy — a cisza
 * po suficie jest luką (W3).
 *
 * Sufit długości WYPROWADZAMY z prawdziwych kodów ról, nie z liczby wpisanej
 * ręcznie: nowa rola o dłuższym kodzie nie może po cichu wypaść spod wzorca.
 * Litera po myślniku jest opcjonalna i pokrywa formę `KON-A1`, tę samą, którą
 * rozpoznaje reguła 7 strażnika przy czytaniu `ROLE.md`.
 */
const NAJDLUZSZY_KOD_ROLI = Math.max(...SEKTORY.flatMap((s) => roleSektora(s)).map((k) => k.length));
export const KOD_POZYCJI = new RegExp(`^[A-Z]{2,${NAJDLUZSZY_KOD_ROLI}}-[A-Z]?\\d{1,2}$`);

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
 * Odsiewa wpisy PRÓBNE — te, które powstały przy budowie sektora, a nie
 * podczas przebiegu. Zwraca dwie listy, nie jedną: narzędzie porównujące ma
 * POWIEDZIEĆ, ile pominęło. Ciche odsianie byłoby nie do odróżnienia od
 * kompletu ("no silent caps" — lekcja z tego repozytorium), a wpis próbny
 * siedzi w prawdziwej fali, bo `zgloszenie.mjs` wymusza `fala` ∈ {1,2}.
 */
export function bezProb(lista) {
  const proby = lista.filter((z) => z?.proba);
  return { wpisy: lista.filter((z) => !z?.proba), proby };
}

/** Jedno zdanie o pominiętych próbach — puste, gdy nie było czego pomijać. */
export function notaOProbach(proby) {
  if (!proby.length) return "";
  return `  pominięte wpisy PRÓBNE: ${proby.length} (${proby.map((z) => `${z.id}/${z.proba}`).join(", ")})\n`;
}

/**
 * Zakresy działów WYPROWADZONE Z `ROLE.md` — nie z osobnej listy.
 *
 * Własna kopia zakresów rozjechałaby się po cichu z dokumentem, który
 * właściciel zaakceptował. To ta sama zasada, dla której
 * `straznik-wagi-dokumentacji` importuje manifest ze skryptów pobierających,
 * zamiast trzymać własną listę nazw.
 */
export function zakresyZRoleMd(sektor = "audyt") {
  const tekst = readFileSync(roleMdSektora(sektor), "utf8");
  const zakresy = [];
  for (const sekcja of tekst.split("\n## ")) {
    const kod = sekcja.match(/^([A-Z]+) —/)?.[1];
    const blok = sekcja.match(/\*\*Zakres[^*]*\*\*\n```\n([\s\S]*?)\n```/)?.[1];
    if (kod && blok) zakresy.push({ kod, komenda: blok.replace(/\\\n/g, " ").trim() });
  }
  return zakresy;
}
