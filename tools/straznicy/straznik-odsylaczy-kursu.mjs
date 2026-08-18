/**
 * Strażnik odsyłaczy wewnątrz kursu: pilnuje, żeby scenariusz nie odsyłał
 * kursanta do lekcji, której nie ma, ani nie przypisywał tematu do złego
 * modułu.
 *
 * PO CO TO ISTNIEJE. Wszyscy pozostali strażnicy i tabele „Zgodność ze
 * źródłem" pilnują wierności DOKUMENTACJI PRODUCENTA. Żaden nie pilnuje
 * wierności WŁASNEMU KURSOWI — a scenariusze są nią przesycone: każda
 * lekcja otwiera się długiem poprzedniej, odsyła do wcześniejszych
 * („mówiłem o tym w lekcji 2.5"), a lekcje domykające moduł i kurs
 * streszczają, co było w którym module.
 *
 * Klasę usterki wykrył przebieg cytatów przy module 7 Kursu 2
 * (2026-08-18): finał kursu — ostatnie zdania, które kursant zapamięta —
 * przypisał `.gitignore` modułowi trzeciemu (jest w 2.4), gałęzie
 * chronione czwartemu (są w 3.5), a konflikty scalania drugiemu (są
 * w 4.8). Nic tego nie łapało, bo to nie są tezy ze źródła: dokumentacja
 * GitHuba nie ma zdania o tym, w którym module NASZEGO kursu coś leży.
 * Autor pisał z pamięci — i pomylił się trzy razy w jednym akapicie.
 *
 * DWIE KONTROLE:
 *
 *   A. Odsyłacz „lekcja N.M" wskazuje lekcję, która NAPRAWDĘ istnieje
 *      w tym samym kursie. Kontrola czysto mechaniczna, bez wyjątków.
 *
 *   B. Zdanie mówiące o konkretnym module nie wymienia tematu, który
 *      należy do innego modułu. Tematy nie są nigdzie wpisane ręcznie —
 *      strażnik czyta je z pola `lekcja:` w metrykach scenariuszy, więc
 *      mapa tematów aktualizuje się sama razem z kursem.
 *
 * ZAŁOŻENIA KONTROLI B (dobrane tak, żeby nie krzyczała bez powodu):
 *   - zdanie z jawnym odsyłaczem „N.M" pomijamy — tam pracuje kontrola A,
 *     a autor wskazał lekcję wprost, więc nie zgadujemy z nazwy tematu;
 *   - zdanie musi wskazywać DOKŁADNIE JEDEN moduł; przy dwóch („w module
 *     piątym sekret był w sejfie, a w szóstym leży w kodzie") nie da się
 *     mechanicznie orzec, do którego z nich należy temat;
 *   - liczebnik porządkowy bez słowa „moduł" („Czwarty — jedenaście
 *     lekcji — nauczył Cię…") liczy się tylko w akapicie, który moduł już
 *     wprost wymienił. To jest kształt wyliczanki w podsumowaniu kursu,
 *     czyli dokładnie to miejsce, w którym usterka powstała;
 *   - kod inline ZOSTAJE w tekście (`.gitignore` to nazwa tematu, nie
 *     przykład składni), bloki kodu są wycinane.
 *
 * Użycie: node tools/straznicy/straznik-odsylaczy-kursu.mjs
 */
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const KATALOG = "tresc-kursow";

// Liczebniki porządkowe w formach, w jakich występują w scenariuszach
// („moduł drugi", „w module drugim", „modułu drugiego", „Drugi moduł").
const LICZEBNIKI = {
  pierwsz: 1, drugi: 2, drugie: 2, drugim: 2, drugiego: 2, trzeci: 3,
  czwart: 4, piąt: 5, piat: 5, szóst: 6, szost: 6, siódm: 7, siodm: 7,
};

// Słowa, które w tytule lekcji nie niosą tematu.
const NIEISTOTNE = new Set([
  "i", "w", "z", "do", "na", "jak", "bez", "czego", "nie", "twoje", "swoje",
  "ze", "o", "po", "dla", "się", "to", "co", "od", "przez", "jest", "czym",
  "poprawnie", "twój", "twoja", "pierwszy", "pierwsze",
]);

// Słowa zbyt ogólne, żeby cokolwiek przypisywać: padają w każdej lekcji.
const ZBYT_OGOLNE = new Set([
  "github", "githuba", "githubie", "git", "gita", "kod", "kodu", "praca",
  "pracy", "kurs", "claude", "plik", "pliki", "start", "codzienna",
]);

if (!existsSync(KATALOG)) process.exit(0);

/** Wszystkie scenariusze z metryką. */
function scenariusze() {
  const out = [];
  for (const kurs of readdirSync(KATALOG)) {
    const kp = join(KATALOG, kurs);
    if (!statSync(kp).isDirectory()) continue;
    for (const modul of readdirSync(kp)) {
      const mp = join(kp, modul);
      if (!statSync(mp).isDirectory()) continue;
      for (const plik of readdirSync(mp)) {
        if (!plik.startsWith("lekcja-") || !plik.endsWith(".md")) continue;
        const sciezka = join(mp, plik);
        const tekst = readFileSync(sciezka, "utf8");
        const koniec = tekst.indexOf("\n---", 4);
        if (!tekst.startsWith("---") || koniec === -1) continue;
        const metryka = tekst.slice(0, koniec);
        const m = /^modul:\s*(\d+)/m.exec(metryka);
        const l = /^lekcja:\s*(\d+)\s*—\s*(.+)$/m.exec(metryka);
        if (!m || !l) continue;
        out.push({ kurs, sciezka, modul: +m[1], lekcja: +l[1], tytul: l[2].trim(), tekst });
      }
    }
  }
  return out;
}

/**
 * Wzorzec na frazę odporny na polską odmianę: „gałęzie chronione" łapie
 * „gałęziach chronionych".
 *
 * Rdzeń skracamy najwyżej o dwie litery i nigdy poniżej pięciu znaków,
 * a końcówkę ograniczamy do czterech liter — inaczej „środka" (z tytułu
 * „Git od środka") łapie „środowiska". Frazę zamykamy granicami słów,
 * inaczej „flow" (z „GitHub Flow") łapie „workflow".
 */
function wzorzecFrazy(slowa) {
  const czlony = slowa.map((w) => {
    if (w.startsWith(".")) return w.replace(/\./g, "\\.");
    const rdzen = w.length >= 8 ? w.slice(0, -2) : w.length >= 6 ? w.slice(0, -1) : w;
    return rdzen + "\\p{L}{0,4}";
  });
  return new RegExp("(?<!\\p{L})" + czlony.join("\\s+") + "(?!\\p{L})", "iu");
}

const lekcje = scenariusze();
if (lekcje.length === 0) process.exit(0);

// mapa kursu: numer modułu → zbiór numerów lekcji
const mapaKursu = {};
// tematy kursu: fraza z tytułu lekcji → do kogo należy
const tematyKursu = {};
for (const s of lekcje) {
  ((mapaKursu[s.kurs] ??= {})[s.modul] ??= new Set()).add(s.lekcja);
  const rdzen = s.tytul.split(":")[0].split("—")[0].toLowerCase();
  const slowa = rdzen
    .replace(/[^\p{L}\p{N}.\- ]/gu, " ")
    .split(/\s+/)
    .filter((w) => w && !NIEISTOTNE.has(w) && !ZBYT_OGOLNE.has(w) && w.length >= 5);
  if (slowa.length === 0) continue;
  const fraza = slowa.slice(0, 2);
  (tematyKursu[s.kurs] ??= []).push({
    modul: s.modul,
    lekcja: s.lekcja,
    fraza: fraza.join(" "),
    wzorzec: wzorzecFrazy(fraza),
  });
}

const bledy = [];

for (const s of lekcje) {
  // Bloki kodu wypadają (bywa w nich składnia z kropkami i liczbami),
  // kod inline zostaje — tam stoją nazwy tematów w rodzaju `.gitignore`.
  const proza = s.tekst.replace(/```[\s\S]*?```/g, "").replace(/`/g, "");

  // ---- Kontrola A: czy odsyłacz wskazuje istniejącą lekcję ----
  for (const t of proza.matchAll(/lekcj\w*[^.\d]{0,14}?(\d+)\.(\d+)/gi)) {
    const [modul, lekcja] = [+t[1], +t[2]];
    if (!mapaKursu[s.kurs]?.[modul]?.has(lekcja)) {
      bledy.push(`${s.sciezka}: odsyłacz do lekcji ${modul}.${lekcja}, której nie ma w kursie „${s.kurs}".`);
    }
  }

  // ---- Kontrola B: czy temat jest przypisany do właściwego modułu ----
  for (const akapit of proza.split(/\n{2,}/)) {
    let modulAkapitu = null; // przenoszony kontekst wyliczanki
    for (const zdanie of akapit.split(/(?<=[.!?])\s+|\n(?=\s*[-*\d])|\n(?=\s*$)/)) {
      // „w modułach 1–4" wskazuje kilka modułów naraz — nic z tego nie wynika
      const zakres = /modu[łl]\w*\s+\d\s*[–—-]\s*\d/iu.test(zdanie);
      const wprost = new Set();
      for (const m of zdanie.matchAll(/modu[łl]\w*\s+(\d)/giu)) wprost.add(+m[1]);
      if (zakres) { modulAkapitu = null; continue; }
      for (const m of zdanie.matchAll(/modu[łl]\w*\s+(\p{L}+)|(\p{L}+)\s+modu[łl]\w*/giu)) {
        const slowo = (m[1] || m[2] || "").toLowerCase();
        for (const [rdzen, nr] of Object.entries(LICZEBNIKI)) {
          if (slowo.startsWith(rdzen)) wprost.add(nr);
        }
      }
      if (wprost.size === 1) modulAkapitu = [...wprost][0];

      let moduly = wprost;
      if (moduly.size === 0 && modulAkapitu !== null) {
        // Liczebnik na początku zdania w akapicie, który moduł już wymienił
        // — kształt wyliczanki („Czwarty — jedenaście lekcji — nauczył Cię…").
        const otwarcie = /^\W*(\p{L}+)/u.exec(zdanie);
        const slowo = otwarcie?.[1]?.toLowerCase() ?? "";
        for (const [rdzen, nr] of Object.entries(LICZEBNIKI)) {
          if (slowo.startsWith(rdzen)) moduly = new Set([nr]);
        }
      }
      if (moduly.size !== 1) continue;
      if (/\d+\.\d+/.test(zdanie)) continue; // jawny odsyłacz — pracuje kontrola A

      const modul = [...moduly][0];
      for (const temat of tematyKursu[s.kurs] ?? []) {
        if (temat.modul === modul) continue;
        if (!temat.wzorzec.test(zdanie)) continue;
        bledy.push(
          `${s.sciezka}: zdanie mówi o module ${modul}, a temat „${temat.fraza}" należy do lekcji ` +
            `${temat.modul}.${temat.lekcja} — „${zdanie.replace(/\s+/g, " ").trim().slice(0, 120)}…"`,
        );
      }
    }
  }
}

if (bledy.length > 0) {
  console.error("straznik-odsylaczy-kursu:");
  for (const b of bledy) console.error(`  - ${b}`);
  const n = bledy.length;
  const r10 = n % 10;
  const r100 = n % 100;
  const forma =
    n === 1 ? "usterka" : r10 >= 2 && r10 <= 4 && (r100 < 12 || r100 > 14) ? "usterki" : "usterek";
  console.error(`\n  ${n} ${forma} w ${lekcje.length} scenariuszach.`);
  process.exit(1);
}

console.log(`straznik-odsylaczy-kursu: ${lekcje.length} scenariuszy bez błędnych odsyłaczy`);
