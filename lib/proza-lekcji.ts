/*
 * Kontrakt bierzemy z PUBLICZNEGO API modułu, ścieżką względną — nie
 * aliasem `@/`. To import WARTOŚCI (schemat Zod, nie sam typ), więc musi
 * go rozumieć goły `node` w teście jednostkowym, a alias żyje tylko
 * w Nekscie. Skrót do `typy.ts` byłby wygodniejszy (nie ciągnie klienta
 * bazy), ale straznik-granic słusznie go odrzuca: spoza modułu wolno
 * wchodzić wyłącznie przez `index.ts`.
 */
import { TrescLekcji, type MaterialLekcji } from "../modules/m1-sklep/index.ts";

/**
 * Proza lekcji: czytanie plików treści i dopasowanie ich do programu
 * kursu w bazie. Warstwa CZYSTA — bez wejścia-wyjścia, bez sieci, bez
 * bazy — dokładnie z tego samego powodu, co `lib/limiter.ts` z kroku 2:
 * to, co da się sprawdzić testem jednostkowym, nie powinno wymagać
 * postawionego serwera i pełnej bazy.
 *
 * DLACZEGO ODDZIELNE PLIKI, A NIE SAM PANEL (decyzja właściciela
 * 2026-08-19, KROK-3-KURSY.md pkt 3): źródłem prawdy o treści kursu są
 * pliki w repo, baza dostaje kopię. Proza wchodzi wtedy PR-em (da się
 * ją recenzować), chroni ją golden, a z tych samych plików powstaje
 * PDF-dodatek. Wgrywa ją `tools/wgraj-tresc-lekcji.ts` — TĄ SAMĄ DROGĄ
 * CO KREATOR, czyli przez jedyny AJAX i dyspozytora (pkt 4).
 *
 * DLACZEGO NAZWA `proza-…`, A NIE `lekcja-…`. Trzej strażnicy treści
 * (`straznik-scenariuszy`, `straznik-goldenu-tresci`,
 * `straznik-odsylaczy-kursu`) zbierają pliki wzorcem `lekcja-*.md`
 * i żądają od nich frontmatteru scenariusza, scen i tabeli zgodności.
 * Proza nazwana `lekcja-…` wpadłaby w te wzorce i wywaliła CI — albo,
 * gorzej, kazała rozluźnić działających strażników. Inny przedrostek
 * kosztuje jedno słowo w nazwie i nie dotyka niczego, co już broni repo.
 */

/** Rozpoznanie pliku prozy po nazwie — jedno miejsce na ten wzorzec. */
export const WZORZEC_PROZY = /^proza-(\d+)-.*\.md$/;

/**
 * Dowód pokrycia tez źródłem — sekcja OBOWIĄZKOWA, ucinana przed wysyłką.
 *
 * Zasada „każda teza ma pokrycie w źródle" (tresc-kursow/POSTEP.md,
 * „Zasady pracy") rządziła 91 scenariuszami i musi rządzić prozą, bo to
 * proza trafia do klienta. Tabela jest jednak dowodem dla NAS, nie
 * materiałem kursu, więc żyje w tym samym pliku (obok tez, które
 * uzasadnia — inaczej nikt jej nie aktualizuje), ale kończy się na
 * granicy: wszystko od tego nagłówka w dół NIE jedzie do bazy.
 *
 * Brak sekcji zatrzymuje wgrywanie. Nie jest to formalizm: lekcja bez
 * tabeli to lekcja, której nikt nie sprawdził przeciw dokumentacji,
 * a kurs sprzedajemy na obietnicy zgodności ze źródłami.
 */
export const NAGLOWEK_ZGODNOSCI = "## Zgodność ze źródłem";

/** Tyle samo co u scenariuszy (`straznik-scenariuszy`) — próg, nie cel. */
export const MIN_WIERSZY_ZGODNOSCI = 8;

/** Co niesie jeden plik prozy po odczytaniu i sprawdzeniu. */
export type ProzaPliku = {
  /** slug kursu, np. „jak-korzystac-z-claude" */
  kurs: string;
  /** numer modułu Z PROGRAMU — liczony od 1, jak w nazwie katalogu */
  modul: number;
  /** numer lekcji w module — liczony od 1, jak w nazwie pliku */
  lekcja: number;
  tytulModulu: string;
  tytulLekcji: string;
  /** treść dla klienta: markdown bez frontmatteru i bez tabeli zgodności */
  tresc: string;
  materialy: MaterialLekcji[];
};

export class BladProzy extends Error {}

/**
 * Frontmatter czytany ręcznie, bez biblioteki YAML.
 *
 * Nie z oszczędności, tylko dlatego, że scenariusze D7 mają dokładnie
 * ten sam, płaski format `klucz: wartość` (+ listy `- `), a nowa
 * zależność w produkcyjnym `package.json` jest kosztem stałym. Wartości
 * wielowierszowe (lista źródeł, JSON materiałów) sklejamy po wcięciu.
 */
function czytajFrontmatter(surowy: string): {
  pola: Map<string, string>;
  reszta: string;
} {
  if (!surowy.startsWith("---\n")) {
    throw new BladProzy("brak frontmatteru — plik musi zaczynać się od „---”");
  }
  const koniec = surowy.indexOf("\n---\n", 3);
  if (koniec === -1) {
    throw new BladProzy("frontmatter nie ma zamknięcia „---”");
  }

  const pola = new Map<string, string>();
  let biezacy: string | null = null;
  for (const linia of surowy.slice(4, koniec).split("\n")) {
    if (linia.trim() === "") continue;
    const naglowek = linia.match(/^([a-z_]+):\s?(.*)$/);
    if (naglowek && !linia.startsWith(" ")) {
      biezacy = naglowek[1];
      pola.set(biezacy, naglowek[2]);
    } else if (biezacy) {
      pola.set(biezacy, `${pola.get(biezacy) ?? ""}\n${linia.trim()}`);
    } else {
      throw new BladProzy(`nie rozumiem linii frontmatteru: „${linia}”`);
    }
  }
  return { pola, reszta: surowy.slice(koniec + 5) };
}

/** „1 — Fundamenty: poznaj Claude” → numer 1 i tytuł. */
function numerITytul(wartosc: string, pole: string): [number, string] {
  const dopasowanie = wartosc.match(/^(\d+)\s+[—-]\s+(.+)$/);
  if (!dopasowanie) {
    throw new BladProzy(
      `pole „${pole}” ma mieć postać „numer — tytuł”, a ma „${wartosc}”`
    );
  }
  return [Number(dopasowanie[1]), dopasowanie[2].trim()];
}

/**
 * Czyta plik prozy i sprawdza go do końca — łącznie z limitami
 * kontraktu, bo `TrescLekcji` jest tu jedynym źródłem prawdy o sufitach
 * (120 000 znaków, 12 materiałów). Dublowanie tych liczb w narzędziu
 * skończyłoby się skryptem, który przepuszcza to, co odrzuci serwer.
 *
 * `sciezka` służy wyłącznie do sprawdzenia, czy frontmatter zgadza się
 * z miejscem pliku w drzewie — pomyłka o jedną lekcję przy 91 plikach
 * jest tania do popełnienia i droga do zauważenia.
 */
export function czytajProze(surowy: string, sciezka: string): ProzaPliku {
  const { pola, reszta } = czytajFrontmatter(surowy);

  for (const wymagane of ["kurs", "modul", "lekcja"]) {
    if (!pola.get(wymagane)?.trim()) {
      throw new BladProzy(`brak pola „${wymagane}” we frontmatterze`);
    }
  }

  const kurs = pola.get("kurs")!.trim();
  const [modul, tytulModulu] = numerITytul(pola.get("modul")!.trim(), "modul");
  const [lekcja, tytulLekcji] = numerITytul(
    pola.get("lekcja")!.trim(),
    "lekcja"
  );

  const zeSciezki = zeSciezkiPliku(sciezka);
  if (zeSciezki) {
    const rozne: string[] = [];
    if (zeSciezki.kurs !== kurs) rozne.push(`kurs (${zeSciezki.kurs})`);
    if (zeSciezki.modul !== modul) rozne.push(`modul (${zeSciezki.modul})`);
    if (zeSciezki.lekcja !== lekcja) rozne.push(`lekcja (${zeSciezki.lekcja})`);
    if (rozne.length > 0) {
      throw new BladProzy(
        `frontmatter kłóci się ze ścieżką pliku — ścieżka mówi: ${rozne.join(", ")}`
      );
    }
  }

  let materialySurowe: unknown = [];
  const zapisMaterialow = pola.get("materialy")?.trim();
  if (zapisMaterialow) {
    try {
      materialySurowe = JSON.parse(zapisMaterialow);
    } catch {
      throw new BladProzy(
        "pole „materialy” ma być tablicą JSON (rodzaj, tytul, url, opis)"
      );
    }
  }

  const granica = reszta.indexOf(NAGLOWEK_ZGODNOSCI);
  if (granica === -1) {
    throw new BladProzy(
      `brak sekcji „${NAGLOWEK_ZGODNOSCI}" — lekcja bez dowodu pokrycia źródłem nie jedzie do bazy`
    );
  }
  const wiersze = reszta
    .slice(granica)
    .split("\n")
    .filter((l) => l.trimStart().startsWith("|") && !/^\s*\|[\s|:-]+\|\s*$/.test(l));
  // nagłówek tabeli to też wiersz — liczymy same tezy
  if (wiersze.length - 1 < MIN_WIERSZY_ZGODNOSCI) {
    throw new BladProzy(
      `tabela zgodności ma ${Math.max(wiersze.length - 1, 0)} tez, a próg to ${MIN_WIERSZY_ZGODNOSCI}`
    );
  }

  const tresc = reszta.slice(0, granica).trim();
  if (tresc === "") throw new BladProzy("plik nie ma treści pod frontmatterem");

  const sprawdzone = TrescLekcji.safeParse({
    tresc,
    materialy: materialySurowe,
  });
  if (!sprawdzone.success) {
    const pierwszy = sprawdzone.error.issues[0];
    throw new BladProzy(
      `treść nie mieści się w kontrakcie: ${pierwszy.path.join(".") || "tresc"} — ${pierwszy.message}`
    );
  }

  return {
    kurs,
    modul,
    lekcja,
    tytulModulu,
    tytulLekcji,
    tresc: sprawdzone.data.tresc,
    // Kontrakt oddaje `materialy` opcjonalnie (brak klucza = „nie ruszaj”
    // przy ZAPISIE), ale czytelnik prozy chce zawsze listy — pusta jest tu
    // poprawną odpowiedzią, bo plik prozy materiałów nie niesie.
    materialy: sprawdzone.data.materialy ?? [],
  };
}

/** `…/tresc-kursow/<kurs>/modul-3/proza-4-cos.md` → {kurs, 3, 4}. */
export function zeSciezkiPliku(
  sciezka: string
): { kurs: string; modul: number; lekcja: number } | null {
  const czesci = sciezka.split("/").filter(Boolean);
  const plik = czesci.at(-1) ?? "";
  const katalogModulu = czesci.at(-2) ?? "";
  const katalogKursu = czesci.at(-3) ?? "";

  const zPliku = plik.match(WZORZEC_PROZY);
  const zModulu = katalogModulu.match(/^modul-(\d+)$/);
  if (!zPliku || !zModulu || !katalogKursu) return null;

  return {
    kurs: katalogKursu,
    modul: Number(zModulu[1]),
    lekcja: Number(zPliku[1]),
  };
}

/** Program kursu tak, jak widzi go kanał JSON (`szczegolyKursuPoId`). */
export type ProgramKursu = {
  modules: {
    position: number;
    title: string;
    lessons: { id: string; position: number; title: string }[];
  }[];
};

/**
 * Znajduje lekcję w programie, do której należy plik prozy.
 *
 * DWIE RZECZY NARAZ, i obie są konieczne. Po pierwsze przeliczenie
 * numeracji: katalogi i nazwy plików liczą od 1 (`modul-1`,
 * `proza-1-…`), a `position` w bazie liczy od 0 — pomyłka tutaj
 * wpisałaby całemu kursowi treść przesuniętą o jedną lekcję.
 * Po drugie kontrola tytułu: zgodność samych numerów nie dowodzi, że
 * plik trafia tam, gdzie autor myślał, bo program da się przestawić
 * kreatorem. Rozjazd tytułów zatrzymuje wgrywanie, zamiast po cichu
 * nadpisać cudzą lekcję.
 */
export function dopasujDoProgramu(
  proza: ProzaPliku,
  program: ProgramKursu
): { id: string } {
  const modul = program.modules.find((m) => m.position === proza.modul - 1);
  if (!modul) {
    throw new BladProzy(
      `program kursu nie ma modułu ${proza.modul} (ma ${program.modules.length})`
    );
  }
  const lekcja = modul.lessons.find((l) => l.position === proza.lekcja - 1);
  if (!lekcja) {
    throw new BladProzy(
      `moduł ${proza.modul} nie ma lekcji ${proza.lekcja} (ma ${modul.lessons.length})`
    );
  }
  if (lekcja.title.trim() !== proza.tytulLekcji) {
    throw new BladProzy(
      `tytuł się rozjeżdża: program ma „${lekcja.title}”, plik „${proza.tytulLekcji}” — ` +
        `popraw plik albo program, ale NIE wgrywaj po numerze`
    );
  }
  return { id: lekcja.id };
}

/**
 * Czy tę lekcję trzeba w ogóle wysyłać.
 *
 * Bez tego każde uruchomienie narzędzia to 91 żądań zapisu — a brama
 * z kroku 2 przepuszcza 60 POST-ów na minutę, więc wgrywanie bez
 * powodu wchodziłoby we własny limit i śmieciło w audycie zmian
 * (każdy zapis zostawia wpis w `m1_audyt`). Porównujemy z tym, co
 * naprawdę leży w bazie, nie z żadnym plikiem stanu obok.
 */
export function czyWymagaWgrania(
  proza: ProzaPliku,
  wBazie: { tresc: string; materialy: MaterialLekcji[] } | null
): boolean {
  if (!wBazie) return true;
  if (wBazie.tresc !== proza.tresc) return true;
  return JSON.stringify(wBazie.materialy) !== JSON.stringify(proza.materialy);
}
