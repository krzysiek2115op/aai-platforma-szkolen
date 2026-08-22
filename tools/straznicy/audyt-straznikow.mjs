/**
 * Audyt strażników: dowód, że każdy strażnik UMIE zapalić się na czerwono.
 *
 * PO CO. Zielona bramka nic nie znaczy, dopóki nie sprawdzisz, że
 * potrafi być czerwona — strażnik z wzorcem, który przestał pasować,
 * wygląda IDENTYCZNIE jak strażnik, który nie ma nic do zgłoszenia.
 * Wzorzec ze strony głównej automatic-ai (tam audyt złapał 5 dziurawych
 * strażników jednego dnia, w tym kontrolę CSP sprawdzającą hashe, ale
 * nie samą politykę). U nas testy negatywne robiło się dotąd RĘCZNIE
 * przy tworzeniu strażnika (odsylacze-kursu, goldenu-tresci, readme) —
 * ten plik utrwala je jako powtarzalne narzędzie.
 *
 * MECHANIZM. Każda mutacja psuje kopię stanu (plik przywracany
 * w finally, kontrola sha256 po przywróceniu), uruchamia JEDNEGO
 * strażnika i oczekuje kodu wyjścia != 0. Trzy wyniki, nie dwa:
 *   - ZŁAPANE      — strażnik zapalił się na czerwono, jak powinien,
 *   - PRZEOCZONE   — dziura w strażniku (audyt kończy się błędem),
 *   - MARTWA       — mutacja nie zaszła (wzorzec przestał pasować do
 *                    pliku) — TEŻ kończy audyt błędem, bo martwa
 *                    mutacja niczego nie testuje, a wygląda na zieloną.
 * KONTRPRZYKŁADY (oczekiwane: false) pilnują, żeby strażnik NIE
 * oskarżał niewinnych — obie nasze udokumentowane reguły tego typu
 * (linki w blokach kodu, znaczniki zapisu w treści promptu) są tu.
 *
 * REGUŁA: dopisujesz strażnika → dopisujesz tu mutację. Strażnik bez
 * mutacji jest deklaracją, nie kontrolą.
 *
 * Użycie (ręcznie, nie w potoku CI — audyt chwilowo psuje pliki):
 *   node tools/straznicy/audyt-straznikow.mjs
 */
import {
  readFileSync,
  writeFileSync,
  existsSync,
  unlinkSync,
  mkdirSync,
  rmdirSync,
} from "node:fs";
import { dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const L51 = "tresc-kursow/jak-uzywac-githuba/modul-5/lekcja-1-zrozum-github-actions.md";
const L75 = "tresc-kursow/jak-uzywac-githuba/modul-7/lekcja-5-discussions.md";

/**
 * pola mutacji:
 *  straznik — plik strażnika (bez ścieżki i rozszerzenia),
 *  opis     — co psujemy,
 *  plik     — który plik mutujemy (null = mutacja tworzy nowy plik),
 *  zmien    — (tekst) => tekst | null; null = wzorzec nie pasuje → MARTWA,
 *  nowyPlik — { sciezka, tresc } zamiast mutacji istniejącego,
 *  usunPlik — ścieżka pliku KASOWANEGO na czas próby (przywracany
 *             w finally jak każda inna mutacja) — do niezmienników
 *             typu „ten plik musi istnieć",
 *  oczekujCzerwonego — false dla kontrprzykładów (domyślnie true).
 */
const MUTACJE = [
  // --- straznik-scenariuszy ---
  {
    straznik: "straznik-scenariuszy",
    opis: "scenariusz bez ani jednego znacznika [NARRACJA]",
    plik: L51,
    zmien: (s) => (s.includes("[NARRACJA]") ? s.replaceAll("[NARRACJA]", "[NARR_]") : null),
  },
  {
    straznik: "straznik-scenariuszy",
    opis: "śmieć po narzędziu zapisu (BLAD-008) na końcu prozy scenariusza",
    plik: L51,
    zmien: (s) => s + "\n</content>\n",
  },
  {
    straznik: "straznik-scenariuszy",
    opis: "KONTRPRZYKŁAD: `</invoke>` wewnątrz bloku kodu to treść promptu, nie śmieć",
    plik: L51,
    zmien: (s) => s + "\n```text\nprzykładowy prompt kończy się znacznikiem </invoke>\n```\n",
    oczekujCzerwonego: false,
  },
  // --- straznik-odsylaczy-kursu ---
  {
    straznik: "straznik-odsylaczy-kursu",
    opis: "odsyłacz do lekcji 3.12, której nie ma w kursie",
    plik: L75,
    zmien: (s) => s + "\nO tym mówiliśmy w lekcji 3.12.\n",
  },
  {
    straznik: "straznik-odsylaczy-kursu",
    opis: "temat przypisany do złego modułu (oryginalna pomyłka finału kursu)",
    plik: L75,
    zmien: (s) => {
      const cel = "wstyd kogoś zaprosić: README, licencja, Markdown, gałęzie chronione, releasy";
      return s.includes(cel)
        ? s.replace(cel, "wstyd kogoś zaprosić: README, licencja, `.gitignore`, Markdown, releasy")
        : null;
    },
  },
  // --- straznik-goldenu-tresci ---
  {
    straznik: "straznik-goldenu-tresci",
    opis: "cicha utrata treści: lekcja obcięta o końcowe 30 wierszy",
    plik: L51,
    zmien: (s) => s.split("\n").slice(0, -30).join("\n") + "\n",
  },
  // --- straznik-readme ---
  {
    straznik: "straznik-readme",
    opis: "wiersz strażnika usunięty z tabeli README",
    plik: "README.md",
    zmien: (s) =>
      s.includes("straznik-hydratacji")
        ? s.split("\n").filter((l) => !l.includes("straznik-hydratacji")).join("\n")
        : null,
  },
  {
    straznik: "straznik-readme",
    opis: "martwy wiersz w tabeli — strażnik, którego nie ma na dysku",
    plik: "README.md",
    zmien: (s) => s.replace("| `straznik-readme` |", "| `straznik-widmo` | — | — |\n| `straznik-readme` |"),
  },
  {
    straznik: "straznik-readme",
    opis: "README podaje liczbę scenariuszy niezgodną z dyskiem",
    plik: "README.md",
    zmien: (s) => (s.includes("91 scenariusz") ? s.replace(/91(\s+scenariusz)/, "90$1") : null),
  },
  // --- straznik-wersji ---
  {
    straznik: "straznik-wersji",
    opis: "README deklaruje inną wersję niż top CHANGELOG",
    plik: "README.md",
    zmien: (s) => {
      const m = /\*\*(\d+\.\d+\.\d+)\*\*/.exec(s);
      return m ? s.replace(`**${m[1]}**`, "**9.9.9**") : null;
    },
  },
  // --- straznik-podgladu ---
  // Reguła 0.22.0: nowy strażnik = nowa mutacja. Tu mutacje są cztery,
  // bo strażnik pilnuje czterech niezależnych sposobów, na jakie panel
  // właściciela mógłby trafić do publicznego podglądu.
  {
    straznik: "straznik-podgladu",
    opis: "trasa kreatora jako zwykłe page.tsx (weszłaby do eksportu)",
    nowyPlik: {
      sciezka: "app/szkolenia/kreator/page.tsx",
      tresc: "export default function Mutacja() {\n  return null;\n}\n",
    },
  },
  {
    straznik: "straznik-podgladu",
    opis: "brama kreatora przestaje odcinać się w trybie podglądu",
    plik: "lib/kreator-dostep.ts",
    zmien: (s) =>
      s.includes("if (PODGLAD_STATYCZNY) return false;")
        ? s.replace("  if (PODGLAD_STATYCZNY) return false;\n", "")
        : null,
  },
  {
    straznik: "straznik-podgladu",
    opis: "lista pageExtensions podglądu wpuszcza warianty serwerowe",
    plik: "next.config.ts",
    zmien: (s) =>
      s.includes('pageExtensions: ["statyczny.tsx"')
        ? s.replace('pageExtensions: ["statyczny.tsx"', 'pageExtensions: ["serwer.tsx", "statyczny.tsx"')
        : null,
  },
  {
    straznik: "straznik-podgladu",
    opis: "drugie miejsce czytające process.env.PODGLAD_STATYCZNY (rozjazd trybu)",
    nowyPlik: {
      sciezka: "lib/audyt-mutacja-tymczasowa.ts",
      tresc: "export const tryb = process.env.PODGLAD_STATYCZNY === \"1\";\n",
    },
  },
  // --- straznik-seo ---
  // Reguła 0.22.0: nowy strażnik = nowa mutacja. SEO psuje się bez
  // objawu, więc każdy z sześciu niezmienników ma tu swój test.
  {
    straznik: "straznik-seo",
    opis: "widok publiczny traci kanoniczny adres",
    plik: "app/szkolenia/widok.tsx",
    zmien: (s) =>
      s.includes("alternates: { canonical")
        ? s.replace(/  alternates: \{ canonical[^\n]*\n/, "")
        : null,
  },
  {
    straznik: "straznik-seo",
    opis: "własny blok application/ld+json z pominięciem ucieczki znaków",
    nowyPlik: {
      sciezka: "components/audyt-mutacja-tymczasowa.tsx",
      tresc:
        'export default function Zle() {\n' +
        '  return <script type="application/ld+json">{"{}"}</script>;\n' +
        '}\n',
    },
  },
  {
    straznik: "straznik-seo",
    opis: "drugie miejsce czytające SEO_INDEKSOWANIE (rozjazd robots ↔ metatag)",
    nowyPlik: {
      sciezka: "lib/audyt-mutacja-tymczasowa.ts",
      tresc: 'export const indeks = process.env.SEO_INDEKSOWANIE === "1";\n',
    },
  },
  {
    straznik: "straznik-seo",
    opis: "robots.txt przestaje pytać o przełącznik indeksowania",
    plik: "app/robots.ts",
    zmien: (s) =>
      s.includes("INDEKSOWANIE") ? s.replaceAll("INDEKSOWANIE", "PRAWDA_ZAWSZE") : null,
  },
  {
    straznik: "straznik-seo",
    opis: "obraz OG bez deklaracji contentType",
    plik: "app/opengraph-image.tsx",
    zmien: (s) =>
      s.includes("export const contentType")
        ? s.replace(/export const contentType[^\n]*\n/, "")
        : null,
  },
  {
    straznik: "straznik-seo",
    opis: "układ strony bez metadataBase",
    plik: "app/layout.tsx",
    zmien: (s) =>
      s.includes("metadataBase") ? s.replace(/  metadataBase[^\n]*\n/, "") : null,
  },
  // --- straznik-granic ---
  {
    straznik: "straznik-granic",
    opis: "connection string bazy w pliku strony (poza modules/)",
    nowyPlik: {
      sciezka: "app/audyt-mutacja-tymczasowa.ts",
      tresc: 'export const zle = process.env.DB1_URL;\n',
    },
  },
  {
    straznik: "straznik-granic",
    opis: "klient SQL importowany w app/",
    nowyPlik: {
      sciezka: "app/audyt-mutacja-tymczasowa.ts",
      tresc: 'import pg from "pg";\nexport default pg;\n',
    },
  },
  // --- straznik-linkow ---
  {
    straznik: "straznik-linkow",
    opis: "martwy link względny w prozie Markdowna",
    plik: "docs/security-checklist.md",
    zmien: (s) => s + "\nPatrz też [widmo](nie-ma-takiego-pliku.md).\n",
  },
  {
    straznik: "straznik-linkow",
    opis: "KONTRPRZYKŁAD: [tekst](sciezka) w bloku kodu to lekcja składni, nie link",
    plik: "docs/security-checklist.md",
    zmien: (s) => s + "\n```markdown\n[przykład składni](nie-ma-takiego-pliku.md)\n```\n",
    oczekujCzerwonego: false,
  },
  // --- straznik-ci ---
  {
    straznik: "straznik-ci",
    opis: "workflow CI bez kroku lint",
    plik: ".github/workflows/ci.yml",
    zmien: (s) => (s.includes("npm run lint") ? s.replaceAll("npm run lint", "echo lint-wyciety") : null),
  },
  // --- straznik-licencji ---
  {
    straznik: "straznik-licencji",
    opis: "nota OFL fontów usunięta",
    plik: "public/fonts/LICENSE-Geist-OFL.txt",
    zmien: () => "", // pusty plik = brak licencji przy .woff2
  },
  // --- straznik-wagi-dokumentacji ---
  // Strażnik ma teraz cztery kontrole i każda dostaje własną mutację.
  // Ścieżki celowo z katalogu `wordpress/`, nie `d7/`: w worktree kroku 3
  // katalogi źródeł D7 są dowiązaniami, a git odmawia dodania pliku „przez
  // dowiązanie" — mutacja wyglądałaby wtedy na dziurę w strażniku, którą
  // nie jest. Korpusu WordPressa żaden worktree nie dowiązuje.
  {
    straznik: "straznik-wagi-dokumentacji",
    opis: "plik masowej dokumentacji producenta dodany do indeksu gita",
    nowyPlik: {
      sciezka: "docs/dokumentacja-techniczna/wordpress/mysql/audyt-mutacja.md",
      tresc: "# mutacja audytu\n",
      dodajDoGita: true,
    },
  },
  {
    straznik: "straznik-wagi-dokumentacji",
    opis: "skrypt pobierający przestaje eksportować manifest katalogów masowych",
    plik: "tools/pobierz-dokumentacje-wp.mjs",
    zmien: (s) =>
      s.includes("export const KATALOGI_MASOWE")
        ? s.replace("export const KATALOGI_MASOWE", "const KATALOGI_MASOWE")
        : null,
  },
  {
    straznik: "straznik-wagi-dokumentacji",
    opis: "reguła .gitignore dla korpusu WordPressa skasowana",
    plik: ".gitignore",
    zmien: (s) =>
      s.includes("docs/dokumentacja-techniczna/wordpress/*\n")
        ? s.replace("docs/dokumentacja-techniczna/wordpress/*\n", "")
        : null,
  },

  {
    straznik: "straznik-seo",
    opis: "KONTRPRZYKŁAD: wzmianka o application/ld+json w KOMENTARZU to opis, nie blok danych",
    nowyPlik: {
      sciezka: "lib/audyt-kontrprzyklad-tymczasowy.ts",
      tresc:
        "// Ten plik tylko WSPOMINA o application/ld+json w komentarzu —\n" +
        "// żadnych danych strukturalnych nie wstawia.\n" +
        "export const nic = null;\n",
    },
    oczekujCzerwonego: false,
  },

  // --- straznik-csp ---
  {
    straznik: "straznik-csp",
    opis: "eksport proxy nazwany zamiast domyślnego (Next 16 go nie widzi)",
    plik: "proxy.serwer.ts",
    zmien: (s) =>
      s.includes("export default function proxy")
        ? s.replace("export default function proxy", "export function proxy")
        : null,
  },
  {
    straznik: "straznik-csp",
    opis: "script-src traci 'strict-dynamic' (zostaje samo 'self')",
    plik: "proxy.serwer.ts",
    zmien: (s) =>
      s.includes("'strict-dynamic'")
        ? s.replace(" 'strict-dynamic'", "")
        : null,
  },
  {
    straznik: "straznik-csp",
    opis: "'unsafe-inline' dopisane do script-src (kasuje działanie nonce'a)",
    plik: "proxy.serwer.ts",
    zmien: (s) =>
      s.includes("skrypty: `'self'")
        ? s.replace("skrypty: `'self'", "skrypty: `'self' 'unsafe-inline'")
        : null,
  },
  {
    straznik: "straznik-csp",
    opis: "'unsafe-eval' w script-src poza gałęzią deweloperską",
    plik: "proxy.serwer.ts",
    zmien: (s) =>
      s.includes("${dev ? \" 'unsafe-eval'\" : \"\"}")
        ? s.replace("${dev ? \" 'unsafe-eval'\" : \"\"}", " 'unsafe-eval'")
        : null,
  },
  {
    straznik: "straznik-csp",
    opis: "wspólna polityka traci dyrektywę object-src 'none'",
    plik: "lib/csp.ts",
    zmien: (s) =>
      s.includes('"object-src \'none\'",')
        ? s.replace('    "object-src \'none\'",\n', "")
        : null,
  },
  {
    straznik: "straznik-csp",
    opis: "podgląd przestaje dostawać politykę (krok wypada z build:podglad)",
    plik: "package.json",
    zmien: (s) =>
      s.includes(" && node tools/csp-podglad.mjs out")
        ? s.replace(" && node tools/csp-podglad.mjs out", "")
        : null,
  },
  {
    straznik: "straznik-csp",
    opis: "wstrzyknięcie polityki PRZED nadaniem rozszerzeń OG (martwe hashe)",
    plik: "package.json",
    zmien: (s) =>
      s.includes("node tools/og-rozszerzenie.mjs out && node tools/csp-podglad.mjs out")
        ? s.replace(
            "node tools/og-rozszerzenie.mjs out && node tools/csp-podglad.mjs out",
            "node tools/csp-podglad.mjs out && node tools/og-rozszerzenie.mjs out"
          )
        : null,
  },
  {
    straznik: "straznik-csp",
    opis: "wyłącznik animacji traci nonce (polityka wycięłaby go bez śladu)",
    plik: "app/layout.tsx",
    zmien: (s) =>
      s.includes("<script\n          nonce={nonce}")
        ? s.replace("<script\n          nonce={nonce}", "<script")
        : null,
  },
  {
    straznik: "straznik-csp",
    opis: "druga, konkurencyjna polityka w nagłówkach statycznych",
    plik: "next.config.ts",
    zmien: (s) =>
      s.includes('value: "frame-ancestors \'none\'"')
        ? s.replace(
            'value: "frame-ancestors \'none\'"',
            'value: "frame-ancestors \'none\'; script-src \'unsafe-inline\'"'
          )
        : null,
  },
  {
    straznik: "straznik-csp",
    opis: "plik proxy.ts w korzeniu (wywraca build podglądu)",
    nowyPlik: {
      sciezka: "proxy.ts",
      tresc: "export default function proxy() {}\n",
    },
  },
  // --- straznik-kreatora ---
  {
    straznik: "straznik-kreatora",
    opis: "pole sekcji z kontraktu zapomniane w panelu (klasa błędu z B5: dla_kogo)",
    plik: "components/kreator/opis-sekcji.ts",
    zmien: (s) =>
      s.includes('pole: "dla_kogo",')
        ? s.replace(/\s*\{\s*pole: "dla_kogo",[\s\S]*?\},/, "")
        : null,
  },
  {
    straznik: "straznik-kreatora",
    opis: "pole treści lekcji zniknięte z panelu (nie ma czym pisać kursu)",
    plik: "components/kreator/opis-lekcji.ts",
    zmien: (s) =>
      s.includes('pole: "tresc",')
        ? s.replace('pole: "tresc",', 'pole: "tresc_lekcji",')
        : null,
  },
  {
    straznik: "straznik-kreatora",
    opis: "lista zamknięta w panelu uboższa niż enum kontraktu (materiał bez „link”)",
    plik: "components/kreator/opis-lekcji.ts",
    zmien: (s) =>
      s.includes('{ wartosc: "link", tekst: "Odsyłacz" },')
        ? s.replace('{ wartosc: "link", tekst: "Odsyłacz" },', "")
        : null,
  },
  {
    straznik: "straznik-kreatora",
    opis: "rozjazd wymagalności: materiały opcjonalne w kontrakcie, obowiązkowe w panelu",
    plik: "components/kreator/opis-lekcji.ts",
    zmien: (s) =>
      s.includes('etykieta: "Materiały dodatkowe",')
        ? s.replace(
            'etykieta: "Materiały dodatkowe",',
            'etykieta: "Materiały dodatkowe",\n      wymagane: true,'
          )
        : null,
  },
  // --- straznik-prozy ---
  {
    straznik: "straznik-prozy",
    opis: "scenariusz nagrania wklejony jako proza dla klienta",
    plik: "tresc-kursow/jak-korzystac-z-claude/modul-1/proza-1-czym-jest-claude.md",
    zmien: (s) =>
      s.includes("## Czego się nauczysz")
        ? s.replace("## Czego się nauczysz", "**[NARRACJA]** „Cześć!”\n\n## Czego się nauczysz")
        : null,
  },
  {
    straznik: "straznik-prozy",
    opis: "lekcja bez dowodu pokrycia źródłem (usunięta tabela zgodności)",
    plik: "tresc-kursow/jak-korzystac-z-claude/modul-1/proza-1-czym-jest-claude.md",
    zmien: (s) =>
      s.includes("## Zgodność ze źródłem")
        ? s.slice(0, s.indexOf("## Zgodność ze źródłem"))
        : null,
  },
  {
    straznik: "straznik-prozy",
    opis: "proza podpięta pod cudzą lekcję (frontmatter rozjeżdża się ze ścieżką)",
    plik: "tresc-kursow/jak-korzystac-z-claude/modul-1/proza-1-czym-jest-claude.md",
    zmien: (s) =>
      s.includes("lekcja: 1 — Czym jest Claude i co potrafi")
        ? s.replace("lekcja: 1 — Czym jest Claude i co potrafi", "lekcja: 3 — Czym jest Claude i co potrafi")
        : null,
  },
  {
    straznik: "straznik-prozy",
    // Kontrola po TYTULE, nie po numerze: po cięciu Kursu 2 numer prozy
    // (pozycja w nowym programie) rozjeżdża się z numerem scenariusza,
    // więc dopasowanie po nazwie pliku dowodziłoby istnienia cudzej lekcji.
    opis: "proza opisuje lekcję, której nie zna żaden scenariusz modułu",
    plik: "tresc-kursow/jak-korzystac-z-claude/modul-1/proza-1-czym-jest-claude.md",
    zmien: (s) =>
      s.includes("lekcja: 1 — Czym jest Claude i co potrafi")
        ? s.replace(
            "lekcja: 1 — Czym jest Claude i co potrafi",
            "lekcja: 1 — Temat, ktorego program nie zna"
          )
        : null,
  },
  {
    straznik: "straznik-prozy",
    opis: "niedomknięty znacznik zrzutu — przelot końcowy by go przeoczył",
    plik: "tresc-kursow/jak-korzystac-z-claude/modul-1/proza-1-czym-jest-claude.md",
    zmien: (s) =>
      s.includes(" -->")
        ? s.replace("<!-- ZRZUT: pusta rozmowa na claude.ai — pole promptu i przełącznik modelu -->",
                    "<!-- ZRZUT: pusta rozmowa na claude.ai — pole promptu i przełącznik modelu")
        : null,
  },
  // --- straznik-tresci-lekcji ---
  {
    straznik: "straznik-tresci-lekcji",
    opis: "materiał zza logowania dołożony do wspólnego odczytu strony (wyciek 91 lekcji)",
    plik: "modules/m1-sklep/odczyt.ts",
    zmien: (s) =>
      s.includes("'ma_tresc', (l.content IS NOT NULL AND l.content <> '')")
        ? s.replace(
            "'ma_tresc', (l.content IS NOT NULL AND l.content <> '')",
            "'ma_tresc', (l.content IS NOT NULL AND l.content <> ''),\n                    'content', l.content"
          )
        : null,
  },
  {
    straznik: "straznik-tresci-lekcji",
    opis: "materiał lekcji traci sufit długości (pole wejścia poza regionem straznik-limitow)",
    plik: "modules/m1-sklep/typy.ts",
    zmien: (s) =>
      s.includes("tytul: z.string().min(1).max(160),")
        ? s.replace("tytul: z.string().min(1).max(160),", "tytul: z.string().min(1),")
        : null,
  },
  {
    straznik: "straznik-tresci-lekcji",
    opis: "kontrakt strony przestaje obcinać treść (LekcjaKursu z polem tresc)",
    plik: "modules/m1-sklep/typy.ts",
    zmien: (s) =>
      s.includes("export const LekcjaKursu = z.object({\n  id: z.uuid(),")
        ? s.replace(
            "export const LekcjaKursu = z.object({\n  id: z.uuid(),",
            "export const LekcjaKursu = z.object({\n  id: z.uuid(),\n  tresc: z.string(),"
          )
        : null,
  },
  // --- straznik-limitera ---
  // Reguła: nowy strażnik = nowe mutacje. Ograniczanie tempa psuje się
  // BEZ OBJAWU (strona działa tak samo, tylko zgadywanie znów jest tanie),
  // więc każdy niezmiennik ma tu swoją próbę.
  {
    straznik: "straznik-limitera",
    opis: "limiter znika (pusty plik) — oba kanały zostają bez licznika",
    plik: "lib/limiter.ts",
    zmien: () => "",
  },
  {
    straznik: "straznik-limitera",
    opis: "limiter wciąga next/* — przestaje dać się przetestować jednostkowo",
    plik: "lib/limiter.ts",
    zmien: (s) => 'import { NextResponse } from "next/server";\n' + s,
  },
  {
    straznik: "straznik-limitera",
    opis: "test jednostkowy limitera skasowany",
    usunPlik: "lib/limiter.test.ts",
  },
  {
    straznik: "straznik-limitera",
    opis: "ostrzeżenie o podrabianiu x-forwarded-for wycięte z kodu",
    plik: "lib/limiter.ts",
    zmien: (s) => (/podrobi/i.test(s) ? s.replace(/podrobi/gi, "sprawdzi") : null),
  },
  {
    straznik: "straznik-limitera",
    opis: "jedyny AJAX przestaje liczyć tempo wystrzału",
    plik: "app/api/szkolenia/route.serwer.ts",
    zmien: (s) => {
      const blok =
        "  const tempo = limiter.odnotuj(`wystrzal:${adres}`, LIMIT_WYSTRZALU);\n" +
        "  if (!tempo.dozwolone) return odmowaTempa(tempo.ponowZaS);\n";
      return s.includes(blok) ? s.replace(blok, "") : null;
    },
  },
  {
    straznik: "straznik-limitera",
    opis: "limit tempa sprawdzany PO parsowaniu ciała żądania",
    plik: "app/api/szkolenia/route.serwer.ts",
    zmien: (s) => {
      const blok =
        "  const tempo = limiter.odnotuj(`wystrzal:${adres}`, LIMIT_WYSTRZALU);\n" +
        "  if (!tempo.dozwolone) return odmowaTempa(tempo.ponowZaS);\n";
      const kotwica = "  if (dane && typeof dane === \"object\"";
      return s.includes(blok) && s.includes(kotwica)
        ? s.replace(blok, "").replace(kotwica, blok + "\n" + kotwica)
        : null;
    },
  },
  {
    straznik: "straznik-limitera",
    opis: "osobny licznik chybionych uwierzytelnień zlany z ogólnym",
    plik: "app/api/szkolenia/route.serwer.ts",
    zmien: (s) =>
      s.includes("`uwierzytelnienie:${adres}`")
        ? s.replaceAll("`uwierzytelnienie:${adres}`", "`wystrzal:${adres}`")
        : null,
  },
  {
    straznik: "straznik-limitera",
    opis: "odmowa 429 bez nagłówka Retry-After",
    plik: "app/api/szkolenia/route.serwer.ts",
    zmien: (s) =>
      s.includes('{ status: 429, headers: { "Retry-After": String(ponowZaS) } }')
        ? s.replace('{ status: 429, headers: { "Retry-After": String(ponowZaS) } }', "{ status: 429 }")
        : null,
  },
  {
    straznik: "straznik-limitera",
    opis: "kara czasowa wycięta z AJAX-a, choć import stałej został (dziura pozorna)",
    plik: "app/api/szkolenia/route.serwer.ts",
    zmien: (s) =>
      s.includes("    await new Promise((r) => setTimeout(r, KARA_MS));\n")
        ? s.replace("    await new Promise((r) => setTimeout(r, KARA_MS));\n", "")
        : null,
  },
  {
    straznik: "straznik-limitera",
    opis: "formularz logowania przestaje liczyć próby po adresie",
    plik: "app/szkolenia/kreator/akcje.ts",
    zmien: (s) =>
      s.includes("const proba = limiter.odnotuj(klucz, LIMIT_UWIERZYTELNIEN);")
        ? s.replace(
            "const proba = limiter.odnotuj(klucz, LIMIT_UWIERZYTELNIEN);",
            "const proba = { dozwolone: true, ponowZaS: 0 };"
          )
        : null,
  },
  {
    straznik: "straznik-limitera",
    opis: "dyspozytor wraca do porównania w zmiennym czasie",
    plik: "modules/m1-sklep/dyspozytor.ts",
    zmien: (s) =>
      s.includes("return timingSafeEqual(podany, oczekiwany);")
        ? s.replace("return timingSafeEqual(podany, oczekiwany);", "return podany.equals(oczekiwany);")
        : null,
  },
  {
    straznik: "straznik-limitera",
    opis: "skrót `token === wzorzec` dopisany przed porównaniem w stałym czasie",
    plik: "modules/m1-sklep/dyspozytor.ts",
    zmien: (s) =>
      s.includes("  if (!wzorzec) return false;")
        ? s.replace("  if (!wzorzec) return false;", "  if (!wzorzec) return false;\n  if (token === wzorzec) return true;")
        : null,
  },
  {
    straznik: "straznik-limitera",
    opis: "moduł traci samowystarczalność — import z lib/ w dyspozytorze",
    plik: "modules/m1-sklep/dyspozytor.ts",
    zmien: (s) => 'import { KARA_MS } from "@/lib/limiter";\n' + s,
  },
  {
    straznik: "straznik-limitera",
    opis: "KONTRPRZYKŁAD: `token === wzorzec` zacytowane w KOMENTARZU to opis historii, nie kod",
    plik: "modules/m1-sklep/dyspozytor.ts",
    zmien: (s) => "// Kiedyś stało tu `token === wzorzec` — patrz komentarz niżej.\n" + s,
    oczekujCzerwonego: false,
  },

  // --- straznik-limitow ---
  // Limity psują się w ciszy: kontrakt bez `.max(` wygląda identycznie
  // jak kontrakt z limitem, dopóki ktoś nie wyśle pola na megabajt.
  {
    straznik: "straznik-limitow",
    opis: "alias tekstu akapitowego traci sufit długości",
    plik: "modules/m1-sklep/typy.ts",
    zmien: (s) =>
      s.includes("const akapit = () => z.string().max(LIMIT_AKAPIT);")
        ? s.replace("const akapit = () => z.string().max(LIMIT_AKAPIT);", "const akapit = () => z.string();")
        : null,
  },
  {
    straznik: "straznik-limitow",
    opis: "listy w sekcjach tracą sufit liczności",
    plik: "modules/m1-sklep/typy.ts",
    zmien: (s) =>
      s.includes("  z.array(element).max(LIMIT_LISTY);")
        ? s.replace("  z.array(element).max(LIMIT_LISTY);", "  z.array(element);")
        : null,
  },
  {
    straznik: "straznik-limitow",
    opis: "adres w danych autora bez sufitu (z.url() to też pole tekstowe)",
    plik: "modules/m1-sklep/typy.ts",
    zmien: (s) =>
      s.includes("url: z.url().max(LIMIT_ADRESU)")
        ? s.replace("url: z.url().max(LIMIT_ADRESU)", "url: z.url()")
        : null,
  },
  {
    straznik: "straznik-limitow",
    opis: "cena bez sufitu (kolumna integer wywali się surowym błędem bazy)",
    plik: "modules/m1-sklep/typy.ts",
    zmien: (s) =>
      s.includes("price_grosze: z.int().nonnegative().max(SUFIT_CENY),")
        ? s.replace("price_grosze: z.int().nonnegative().max(SUFIT_CENY),", "price_grosze: z.int().nonnegative(),")
        : null,
  },
  {
    straznik: "straznik-limitow",
    opis: "token z sieci bez sufitu długości",
    plik: "modules/m1-sklep/typy.ts",
    zmien: (s) =>
      s.includes("token: z.string().max(LIMIT_TOKENU)")
        ? s.replaceAll("token: z.string().max(LIMIT_TOKENU)", "token: z.string()")
        : null,
  },
  {
    straznik: "straznik-limitow",
    opis: "treść sekcji zapisywana bez oczyszczania schematem (limity do obejścia jednym kluczem)",
    plik: "modules/m1-sklep/typy.ts",
    zmien: (s) =>
      s.includes("content: SCHEMATY_SEKCJI[sekcja.kind].parse(sekcja.content) as Record<")
        ? s.replace(
            "content: SCHEMATY_SEKCJI[sekcja.kind].parse(sekcja.content) as Record<",
            "content: sekcja.content as Record<"
          )
        : null,
  },
  {
    straznik: "straznik-limitow",
    opis: "ciało ponad sufit udaje błąd składni JSON-a zamiast 413",
    plik: "app/api/szkolenia/route.serwer.ts",
    zmien: (s) =>
      s.includes("{ status: 413 }") ? s.replace("{ status: 413 }", "{ status: 400 }") : null,
  },
  {
    straznik: "straznik-limitow",
    opis: "powrót do request.json() — całe ciało w pamięci przed pomiarem",
    plik: "app/api/szkolenia/route.serwer.ts",
    zmien: (s) =>
      s.includes("dane = JSON.parse(surowe);")
        ? s.replace("dane = JSON.parse(surowe);", "dane = await request.json();")
        : null,
  },
  {
    straznik: "straznik-limitow",
    opis: "sufit ciała sprawdzany PO sparsowaniu JSON-a",
    plik: "app/api/szkolenia/route.serwer.ts",
    zmien: (s) => {
      const sufit =
        "  const surowe = await cialoZSufitem(request, MAKS_CIALO_B);\n" +
        "  if (surowe === null) {\n" +
        "    return NextResponse.json(\n" +
        "      { ok: false, blad: \"za-duze-zadanie\" },\n" +
        "      { status: 413 }\n" +
        "    );\n" +
        "  }\n\n";
      if (!s.includes(sufit) || !s.includes("dane = JSON.parse(surowe);")) return null;
      return s
        .replace(sufit, "")
        .replace("dane = JSON.parse(surowe);", "dane = JSON.parse(await request.text());")
        .replace("  if (dane && typeof dane", sufit + "  if (dane && typeof dane");
    },
  },
  {
    straznik: "straznik-limitow",
    opis: "surowy komunikat Postgresa wraca do odpowiedzi dyspozytora",
    plik: "modules/m1-sklep/dyspozytor.ts",
    zmien: (s) =>
      s.includes('szczegoly: "Taki kurs już istnieje — slug musi być unikalny.",')
        ? s.replace(
            'szczegoly: "Taki kurs już istnieje — slug musi być unikalny.",',
            "szczegoly: String((blad as Error).message),"
          )
        : null,
  },
  {
    straznik: "straznik-limitow",
    opis: "testy limitów skasowane",
    usunPlik: "modules/m1-sklep/dyspozytor.test.ts",
  },
  {
    straznik: "straznik-limitow",
    opis: "KONTRPRZYKŁAD: z.string() w kanale ODCZYTU nie potrzebuje sufitu (dane z naszej bazy)",
    plik: "modules/m1-sklep/typy.ts",
    zmien: (s) =>
      s.includes("export const LekcjaKursu = z.object({")
        ? s.replace(
            "export const LekcjaKursu = z.object({",
            "export const LekcjaKursu = z.object({\n  notatka_audytu: z.string().optional(),"
          )
        : null,
    oczekujCzerwonego: false,
  },
];


const sha = (t) => createHash("sha256").update(t).digest("hex");
const zlapane = [], przeoczone = [], martwe = [];

for (const m of MUTACJE) {
  const oczekuj = m.oczekujCzerwonego !== false;
  let przygotowane = false;
  let oryginal = null;

  try {
    if (m.nowyPlik) {
      // katalog mutacji bywa nieistniejący (mutacja tworzy ścieżkę, nie
      // tylko plik) — sprzątamy go w finally, o ile zostanie pusty
      mkdirSync(dirname(m.nowyPlik.sciezka), { recursive: true });
      writeFileSync(m.nowyPlik.sciezka, m.nowyPlik.tresc);
      if (m.nowyPlik.dodajDoGita) spawnSync("git", ["add", "-f", m.nowyPlik.sciezka]);
      przygotowane = true;
    } else if (m.usunPlik) {
      if (!existsSync(m.usunPlik)) { martwe.push(`${m.straznik}: ${m.opis} — BRAK PLIKU ${m.usunPlik}`); continue; }
      oryginal = readFileSync(m.usunPlik, "utf8");
      unlinkSync(m.usunPlik);
      przygotowane = true;
    } else {
      if (!existsSync(m.plik)) { martwe.push(`${m.straznik}: ${m.opis} — BRAK PLIKU ${m.plik}`); continue; }
      oryginal = readFileSync(m.plik, "utf8");
      const zmutowany = m.zmien(oryginal);
      if (zmutowany === null || zmutowany === oryginal) {
        martwe.push(`${m.straznik}: ${m.opis} — wzorzec już nie pasuje do ${m.plik}`);
        continue;
      }
      writeFileSync(m.plik, zmutowany);
      przygotowane = true;
    }

    const wynik = spawnSync("node", [`tools/straznicy/${m.straznik}.mjs`], { encoding: "utf8" });
    const czerwony = wynik.status !== 0;
    if (czerwony === oczekuj) {
      zlapane.push(`${m.straznik}: ${m.opis}${oczekuj ? "" : " (słusznie przemilczane)"}`);
    } else {
      przeoczone.push(
        `${m.straznik}: ${m.opis} — ${oczekuj ? "strażnik PRZEPUŚCIŁ mutację" : "strażnik OSKARŻYŁ niewinnego"}`,
      );
    }
  } finally {
    if (przygotowane && m.nowyPlik) {
      if (m.nowyPlik.dodajDoGita) spawnSync("git", ["rm", "--cached", "-q", "-f", m.nowyPlik.sciezka]);
      unlinkSync(m.nowyPlik.sciezka);
      try {
        rmdirSync(dirname(m.nowyPlik.sciezka));
      } catch {
        // katalog istniał przed mutacją albo nie jest pusty — zostaje
      }
    } else if (przygotowane && oryginal !== null) {
      const cel = m.plik ?? m.usunPlik;
      writeFileSync(cel, oryginal);
      if (sha(readFileSync(cel, "utf8")) !== sha(oryginal)) {
        console.error(`KRYTYCZNE: nie odtworzono ${cel} — sprawdź git status!`);
        process.exit(2);
      }
    }
  }
}

console.log(`\naudyt-straznikow: ${zlapane.length} złapanych, ${przeoczone.length} przeoczonych, ${martwe.length} martwych (mutacji: ${MUTACJE.length})`);
for (const z of zlapane) console.log(`  ✓ ${z}`);
if (martwe.length) { console.error("\nMARTWE MUTACJE (nic nie testują, a wyglądają na zielone):"); for (const x of martwe) console.error(`  ⚠ ${x}`); }
if (przeoczone.length) { console.error("\nDZIURY:"); for (const x of przeoczone) console.error(`  ✘ ${x}`); }
process.exitCode = przeoczone.length || martwe.length ? 1 : 0;
