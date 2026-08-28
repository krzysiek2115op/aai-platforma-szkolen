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
const KLASA_TUTORA = "wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-tutor.php";
const KLASA_LEKCJI = "wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-lekcja.php";
const KLASA_PROZY = "wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-proza.php";
const ARKUSZ_LEKCJI = "wordpress/wtyczki/aai-sklep/assets/lekcja.css";

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
 *  oczekujCzerwonego — false dla kontrprzykładów (domyślnie true),
 *  oczekiwanySlad — (string) fragment komunikatu, który MUSI paść
 *             w wyjściu strażnika. Bez tego audyt patrzy wyłącznie na kod
 *             wyjścia, więc mutacja łamiąca DWIE reguły naraz zostaje
 *             czerwona nawet po skasowaniu tej, którą miała testować —
 *             i maskuje ślepotę strażnika (klasa z 0.35.0: mutacja, która
 *             nic nie sprawdza, jest groźniejsza niż jej brak). Wykryte
 *             przy przeglądzie P2 na mutacji ceny zapisanej metą.
 *  wymaga   — () => boolean; false = mutacja POMINIĘTA (nie martwa,
 *             nie przeoczona). Dla strażników warunkowych, którzy przy
 *             braku materiału świadomie milczą — jak straznik-scenariuszy
 *             bez dokumentacji D7 albo straznik-podgladu-kursow bez
 *             wygenerowanego podglądu. Bez tego pola audyt na maszynie
 *             bez materiału raportowałby fałszywe „PRZEPUŚCIŁ mutację".
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
  {
    straznik: "straznik-readme",
    opis: "martwa kotwica w prozie README, POZA spisem treści (klasa z 2026-08-24)",
    plik: "README.md",
    zmien: (s) =>
      s.includes("(#szybki-start-nowa-maszyna-od-zera)")
        ? s.replace("(#szybki-start-nowa-maszyna-od-zera)", "(#szybki-start-po-sklonowaniu)")
        : null,
  },
  {
    straznik: "straznik-readme",
    opis: "liczba testów w README rozjechana ze zliczeniem test()/it() na dysku",
    plik: "README.md",
    // Wzorzec MUSI znosić odmianę („77 testów", ale „83 testy") i polskie
    // znaki — mutacja przypięta do jednej formy umiera po zmianie liczby
    // i maskuje wtedy ślepotę strażnika (lekcja z audytu 0.35.0).
    zmien: (s) => {
      const m = s.match(/\((\d+) (test\p{L}*) na osobnej bazie/u);
      return m
        ? s.replace(m[0], `(${Number(m[1]) + 13} ${m[2]} na osobnej bazie`)
        : null;
    },
  },
  {
    straznik: "straznik-readme",
    opis: "liczba sposobów audytu mutacyjnego w README rozjechana z liczbą wpisów MUTACJE",
    plik: "README.md",
    zmien: (s) => {
      const m = s.match(/na[\s>]+(\d+) sposob/);
      return m ? s.replace(m[0], m[0].replace(m[1], String(Number(m[1]) + 7))) : null;
    },
  },
  // --- straznik-podgladu-kursow ---
  // Kontrole 1-4 działają na WYGENEROWANYM artefakcie poza repo, więc nie da
  // się ich zmutować edycją pliku w repo — udowodnione ręcznie pięcioma
  // mutacjami na kopii podglądu (2026-08-24): skasowany font → martwy
  // odsyłacz, obraz bez width/height, &amp;quot; w podpisie, lekcja bez
  // odsyłacza ze spisu, skasowana strona lekcji. Wszystkie exit 1, czysty
  // artefakt exit 0 (kody sprawdzone BEZ potoku). Tutaj mutujemy to, co
  // strażnik czyta z REPO: komplet stron i zrzutów wobec źródła.
  {
    straznik: "straznik-podgladu-kursow",
    opis: "lekcja prozy, która nie ma swojej strony w podglądzie",
    wymaga: () => existsSync("/tmp/podglad-kursow/index.html"),
    nowyPlik: {
      sciezka: "tresc-kursow/jak-uzywac-githuba/modul-1/proza-9-widmo.md",
      tresc: "---\nlekcja: widmo\n---\n\nLekcja, której podgląd nie zna.\n",
    },
  },
  {
    straznik: "straznik-podgladu-kursow",
    opis: "zrzut w źródle, którego nie ma w zasobach podglądu (cicha utrata pliku)",
    wymaga: () => existsSync("/tmp/podglad-kursow/index.html"),
    nowyPlik: {
      sciezka: "tresc-kursow/jak-uzywac-githuba/modul-1/zrzuty/z99-widmo.webp",
      tresc: "RIFF____WEBPVP8 (atrapa — liczy się istnienie pliku, nie jego treść)",
    },
  },
  {
    straznik: "straznik-obietnic",
    opis: "widok katalogu obiecuje lekcje WIDEO przy kursie tekstowym (klasa z przeglądu B7)",
    plik: "app/szkolenia/widok.tsx",
    zmien: (s) =>
      s.includes("Lekcje tekstowe krok po kroku")
        ? s.replace("Lekcje tekstowe krok po kroku", "Lekcje wideo krok po kroku")
        : null,
  },
  {
    straznik: "straznik-obietnic",
    opis: "widok katalogu obiecuje pliki źródłowe do pobrania, których nie ma ani jednego",
    plik: "app/szkolenia/widok.tsx",
    zmien: (s) =>
      s.includes("bez pobierania czegokolwiek")
        ? s.replace("bez pobierania czegokolwiek", "pliki źródłowe do pobrania")
        : null,
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
  // --- straznik-asercji ---
  {
    straznik: "straznik-asercji",
    opis: "specyfikacja zrzutu bez asercji treści (zrzut przestaje być dowodem)",
    plik: "tools/zrzuty/spec/k1/m3-z13-context-all.json",
    zmien: (s) => (s.includes('"wymagaTekstu"') ? s.replace(/,\s*"wymagaTekstu":\s*\[[^\]]*\]/, "") : null),
  },
  {
    straznik: "straznik-asercji",
    opis: "asercja pusta — deklaracja jest, treści nie ma",
    plik: "tools/zrzuty/spec/k1/m3-z13-context-all.json",
    zmien: (s) => (s.includes('"wymagaTekstu"') ? s.replace(/"wymagaTekstu":\s*\[[^\]]*\]/, '"wymagaTekstu": []') : null),
  },
  {
    straznik: "straznik-asercji",
    opis: "porównanie przepuszcza fragment, którego na ekranie nie ma",
    plik: "tools/zrzuty/asercje.mjs",
    zmien: (s) => (s.includes("return wymagane.filter") ? s.replace("return wymagane.filter", "return [].filter") : null),
  },
  {
    straznik: "straznik-asercji",
    opis: "bramka deklaracji wyjęta z narzędzia terminalowego",
    plik: "tools/zrzuty/tui.mjs",
    zmien: (s) =>
      s.includes("wymagajDeklaracji(spec, 'tui')")
        ? s.replace("wymagajDeklaracji(spec, 'tui')", "(spec.wymagaTekstu ?? [])")
        : null,
  },
  {
    straznik: "straznik-asercji",
    opis: "asercja przeniesiona ZA zapis obrazu (plik zostaje mimo niezgodności)",
    plik: "tools/zrzuty/zrob-zrzut.mjs",
    zmien: (s) =>
      s.includes("sprawdzAsercje(tekstEkranu, WYMAGANE, 'zrzut');")
        ? s.replace("sprawdzAsercje(tekstEkranu, WYMAGANE, 'zrzut');", "")
             .replace("  const m = await sharp(spec.wyjscie).metadata();",
                      "  sprawdzAsercje(tekstEkranu, WYMAGANE, 'zrzut');\n  const m = await sharp(spec.wyjscie).metadata();")
        : null,
  },
  {
    straznik: "straznik-asercji",
    opis: "kontrola prywatności przepuszcza dane właściciela na gotowym ekranie",
    plik: "tools/zrzuty/asercje.mjs",
    zmien: (s) =>
      s.includes("const znalezione = daneWlasciciela().filter((d) => ekran.includes(d));")
        ? s.replace("const znalezione = daneWlasciciela().filter((d) => ekran.includes(d));", "const znalezione = [];")
        : null,
  },
  {
    straznik: "straznik-asercji",
    opis: "KONTRPRZYKŁAD: pole opisowe dodane do specyfikacji to nie usterka",
    plik: "tools/zrzuty/spec/k1/m3-z13-context-all.json",
    zmien: (s) => s.replace('{\n  "_podpis"', '{\n  "_uwaga": "kadr dobrany po wierszach",\n  "_podpis"'),
    oczekujCzerwonego: false,
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
    // Mutacja WSTAWIA znacznik, zamiast psuć istniejący. Poprzednie dwie wersje
    // wskazywały najpierw konkretny podpis, potem „pierwszy znacznik w pliku” —
    // i obie umarły, gdy znaczniki znikały: raz po wpięciu zrzutu (2026-08-23),
    // raz po zamknięciu przelotu (audyt 2026-08-24 usunął ostatnie dwanaście).
    // Wstawianie nie zależy od stanu treści, więc nie ma jak zzielenieć na pusto.
    plik: "tresc-kursow/jak-korzystac-z-claude/modul-6/proza-2-batch-api.md",
    zmien: (s) => {
      const koniec = s.indexOf("\n---\n", 4);
      return koniec < 0
        ? null
        : s.slice(0, koniec + 5) + "\n<!-- ZRZUT: podpis bez domknięcia\n" + s.slice(koniec + 5);
    },
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
      s.includes("  if (!wzorzecMocny(wzorzec)) return false;")
        ? s.replace(
            "  if (!wzorzecMocny(wzorzec)) return false;",
            "  if (!wzorzecMocny(wzorzec)) return false;\n  if (token === wzorzec) return true;"
          )
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
  // --- straznik-sciezek (BLAD-014) ---
  {
    straznik: "straznik-sciezek",
    opis: "manifest zrzutów wraca do sklejki `file://` + argv[1]",
    plik: "tools/zrzuty/manifest.mjs",
    zmien: (s) =>
      s.includes("resolve(process.argv[1]) === fileURLToPath(import.meta.url)")
        ? s.replace(
            "process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)",
            "import.meta.url === `file://${process.argv[1]}`",
          )
        : null,
  },
  {
    straznik: "straznik-sciezek",
    opis: "kolejka zrzutów wraca do `.pathname` z URL-a pliku",
    plik: "tools/zrzuty/kolejka.mjs",
    zmien: (s) =>
      s.includes("fileURLToPath(new URL(spec.raw")
        ? s.replace(
            "fileURLToPath(new URL(spec.raw ? 'tui.mjs' : 'zrob-zrzut.mjs', import.meta.url))",
            "new URL(spec.raw ? 'tui.mjs' : 'zrob-zrzut.mjs', import.meta.url).pathname",
          )
        : null,
  },
  // --- straznik-obietnic (audyt 2026-08-24) ---
  {
    straznik: "straznik-obietnic",
    opis: "pakiet sprzedażowy znów obiecuje inną liczbę lekcji niż program",
    plik: "tools/seed/seed-przyklady.ts",
    zmien: (s) =>
      s.includes('tytul: "6 modułów tekstowych (41 lekcji)"')
        ? s.replace('tytul: "6 modułów tekstowych (41 lekcji)"', 'tytul: "6 modułów tekstowych (31 lekcji)"')
        : null,
  },
  {
    straznik: "straznik-obietnic",
    opis: "sprzedaż znów obiecuje wideo w kursie tekstowym",
    plik: "tools/seed/seed-przyklady.ts",
    zmien: (s) =>
      s.includes('tytul: "6 modułów tekstowych (32 lekcje)"')
        ? s.replace('tytul: "6 modułów tekstowych (32 lekcje)"', 'tytul: "6 modułów wideo (32 lekcje)"')
        : null,
  },
  {
    straznik: "straznik-obietnic",
    opis: "obietnica podzbioru (prompty w N lekcjach) zawyżona",
    plik: "tools/seed/seed-przyklady.ts",
    zmien: (s) =>
      s.includes("Gotowe prompty w 35 lekcjach")
        ? s.replace("Gotowe prompty w 35 lekcjach", "Gotowe prompty w 41 lekcjach")
        : null,
  },

  // --- decyzje właściciela po przeglądzie B7 (0.37.0) ---
  // Każda z tych ochron ma tę samą własność co CSP i limiter: zdjęta,
  // nie objawia się błędem. Strona działa, panel zapisuje, testy o niej
  // nie wiedzą — dlatego każda ma tu własną próbę.
  {
    straznik: "straznik-limitera",
    opis: "sprzątanie limitera znów mierzy każdy klucz oknem CUDZEGO żądania",
    plik: "lib/limiter.ts",
    zmien: (s) =>
      s.includes("teraz - wpis.oknoMs")
        ? s.replace("teraz - wpis.oknoMs", "teraz - 60_000")
        : null,
  },
  {
    straznik: "straznik-limitera",
    opis: "brama formularza przyjmuje token z .env.example",
    plik: "lib/kreator-dostep.ts",
    zmien: (s) =>
      s.includes("MIN_DLUGOSC_TOKENU")
        ? s.replace(/MIN_DLUGOSC_TOKENU/g, "MIN_DLUGOSC_NIEUZYWANA")
        : null,
  },
  {
    straznik: "straznik-limitera",
    opis: "dyspozytor przyjmuje token z .env.example",
    plik: "modules/m1-sklep/dyspozytor.ts",
    zmien: (s) =>
      s.includes("ustaw-wlasny-token")
        ? s.replace("ustaw-wlasny-token", "dowolna-inna-wartosc")
        : null,
  },
  {
    straznik: "straznik-csp",
    opis: "matcher znów wyłącza politykę dla żądań z `purpose: prefetch` (dokument bez CSP)",
    plik: "proxy.serwer.ts",
    zmien: (s) =>
      s.includes('missing: [{ type: "header", key: "next-router-prefetch" }],')
        ? s.replace(
            'missing: [{ type: "header", key: "next-router-prefetch" }],',
            'missing: [\n        { type: "header", key: "next-router-prefetch" },\n        { type: "header", key: "purpose", value: "prefetch" },\n      ],'
          )
        : null,
  },
  {
    straznik: "straznik-tresci-lekcji",
    opis: "zapis kursu znów kasuje napisaną treść bez jawnej zgody",
    plik: "modules/m1-sklep/dyspozytor.ts",
    zmien: (s) =>
      s.includes("pozwol_skasowac_tresc")
        ? s.replace(/pozwol_skasowac_tresc/g, "pozwol_cokolwiek")
        : null,
  },
  // --- straznik-wtyczki-wp (etap WordPress) ---
  // Wtyczka działa nawet wtedy, gdy brakuje jej ochron: objaw wychodzi
  // dopiero u klienta. Stąd mutacja na każdy niezmiennik, jak przy CSP.
  {
    straznik: "straznik-wtyczki-wp",
    opis: "plik wtyczki bez blokady bezpośredniego wywołania (wykonuje się poza WordPressem)",
    plik: "wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-tabele.php",
    wymaga: () => existsSync("wordpress/wtyczki/aai-sklep/aai-sklep.php"),
    zmien: (s) =>
      s.includes("defined( 'ABSPATH' ) || exit;")
        ? s.replace("defined( 'ABSPATH' ) || exit;", "")
        : null,
  },
  {
    straznik: "straznik-wtyczki-wp",
    opis: "treść lekcji jako `text` (65 kB) — MySQL utnie dłuższą lekcję w milczeniu",
    plik: "wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-tabele.php",
    wymaga: () => existsSync("wordpress/wtyczki/aai-sklep/aai-sklep.php"),
    zmien: (s) =>
      s.includes("content mediumtext NULL")
        ? s.replace("content mediumtext NULL", "content text NULL")
        : null,
  },
  {
    straznik: "straznik-wtyczki-wp",
    opis: "odinstalowanie kasuje treść kursów bez jawnej zgody właściciela",
    plik: "wordpress/wtyczki/aai-sklep/uninstall.php",
    wymaga: () => existsSync("wordpress/wtyczki/aai-sklep/uninstall.php"),
    zmien: (s) =>
      s.includes("if ( ! get_option( 'aai_sklep_kasuj_dane_przy_usuwaniu' ) ) {")
        ? s.replace(
            "if ( ! get_option( 'aai_sklep_kasuj_dane_przy_usuwaniu' ) ) {",
            "if ( false ) {"
          )
        : null,
  },
  {
    straznik: "straznik-wtyczki-wp",
    opis: "wtyczka traci nagłówek Text Domain (tłumaczenia przestają się ładować)",
    plik: "wordpress/wtyczki/aai-sklep/aai-sklep.php",
    wymaga: () => existsSync("wordpress/wtyczki/aai-sklep/aai-sklep.php"),
    zmien: (s) =>
      s.includes(" * Text Domain:")
        ? s.replace(" * Text Domain:", " * Textdomain-literowka:")
        : null,
  },
  {
    straznik: "straznik-wtyczki-wp",
    opis: "zapis do naszych tabel omija warstwę zapisu (bez transakcji, bez audytu, bez pytania o treść)",
    plik: "wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-cli.php",
    wymaga: () =>
      existsSync("wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-zapis.php"),
    zmien: (s) =>
      s.includes("$liczniki = Aai_Sklep_Zapis::usun_kurs( $id, $aktor, $pozwol );")
        ? s.replace(
            "$liczniki = Aai_Sklep_Zapis::usun_kurs( $id, $aktor, $pozwol );",
            "global $wpdb;\n\t\t\t$wpdb->delete( Aai_Sklep_Tabele::tabela( 'courses' ), array( 'id' => $id ) );\n\t\t\t$liczniki = array( 'usuniete' => 1 );"
          )
        : null,
  },
  {
    straznik: "straznik-wtyczki-wp",
    opis: "wartość wklejona wprost do SQL-a zamiast przez prepare (nazwa tabeli wolno, wartość nie)",
    plik: "wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-raport.php",
    wymaga: () =>
      existsSync("wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-raport.php"),
    zmien: (s) =>
      s.includes('$wpdb->prepare( "SELECT id FROM `$t_kursy` WHERE slug = %s", $slug )')
        ? s.replace(
            '$wpdb->prepare( "SELECT id FROM `$t_kursy` WHERE slug = %s", $slug )',
            '"SELECT id FROM `$t_kursy` WHERE slug = \'$slug\'"'
          )
        : null,
  },
  // --- straznik-platnosci-wp (Plugin 2 — szew do WooCommerce i Tutora) ---
  // Każdy niezmiennik schematu łamie się PO CICHU: sklep dalej działa,
  // tylko klient płaci i nie dostaje albo dostaje za darmo. Stąd mutacja
  // na każdy z siedmiu + kontrprzykład na wyjątek dla $wpdb->delete.
  {
    straznik: "straznik-platnosci-wp",
    opis: "własny AJAX w kokpicie (decyzja właściciela 2026-08-28: zero wp_ajax_*)",
    plik: null,
    wymaga: () => existsSync("wordpress/wtyczki/aai-platnosci/aai-platnosci.php"),
    nowyPlik: {
      sciezka: "wordpress/wtyczki/aai-platnosci/includes/class-aai-platnosci-zle.php",
      tresc: "<?php\ndefined( 'ABSPATH' ) || exit;\nadd_action( 'wp_ajax_aai_platnosci_napraw', 'aai_platnosci_napraw' );\n",
    },
  },
  {
    straznik: "straznik-platnosci-wp",
    opis: "własna trasa (add_rewrite_rule) zamiast wejścia przez PODSTRONY Pluginu 1 (BLAD-021)",
    plik: "wordpress/wtyczki/aai-platnosci/includes/class-aai-platnosci-zaleznosci.php",
    wymaga: () => existsSync("wordpress/wtyczki/aai-platnosci/includes/class-aai-platnosci-zaleznosci.php"),
    zmien: (s) =>
      s.includes("add_action( 'admin_notices', array( self::class, 'komunikat' ) );")
        ? s.replace(
            "add_action( 'admin_notices', array( self::class, 'komunikat' ) );",
            "add_action( 'admin_notices', array( self::class, 'komunikat' ) );\n\t\tadd_rewrite_rule( '^koszyk/?$', 'index.php?aai=koszyk', 'top' );"
          )
        : null,
  },
  {
    straznik: "straznik-platnosci-wp",
    opis: "droga powrotna do danych Pluginu 1 (wywołanie Aai_Sklep_Zapis — koniec jednokierunkowości)",
    plik: null,
    wymaga: () => existsSync("wordpress/wtyczki/aai-platnosci/aai-platnosci.php"),
    nowyPlik: {
      sciezka: "wordpress/wtyczki/aai-platnosci/includes/class-aai-platnosci-zle.php",
      tresc: "<?php\ndefined( 'ABSPATH' ) || exit;\nAai_Sklep_Zapis::zapisz_kurs( $kurs, 'aai-platnosci' );\n",
    },
  },
  {
    straznik: "straznik-platnosci-wp",
    opis: "kasowanie produktu WooCommerce (niszczy historię zamówień — niezmiennik 13)",
    plik: null,
    wymaga: () => existsSync("wordpress/wtyczki/aai-platnosci/aai-platnosci.php"),
    nowyPlik: {
      sciezka: "wordpress/wtyczki/aai-platnosci/includes/class-aai-platnosci-zle.php",
      tresc: "<?php\ndefined( 'ABSPATH' ) || exit;\nwp_delete_post( $product_id, true );\n",
    },
  },
  {
    straznik: "straznik-platnosci-wp",
    opis: "cena zapisana metą (_regular_price bez save() — kasa liczy starą cenę, B5)",
    // Mutacja siedzi W WARSTWIE ZAPISU, nie w osobnym pliku: w osobnym
    // łamała OD RAZU dwie reguły (cena metą + zapis poza warstwą zapisu),
    // więc zostawała czerwona nawet po skasowaniu tej, którą testuje.
    plik: "wordpress/wtyczki/aai-platnosci/includes/class-aai-platnosci-zapis.php",
    wymaga: () => existsSync("wordpress/wtyczki/aai-platnosci/includes/class-aai-platnosci-zapis.php"),
    oczekiwanySlad: "ZAPISUJE cenę metą",
    zmien: (s) =>
      s.includes("\t\t\t\t$produkt->set_regular_price( $cena );")
        ? s.replace(
            "\t\t\t\t$produkt->set_regular_price( $cena );",
            "\t\t\t\tupdate_post_meta( (int) $product_id, '_regular_price', $cena );"
          )
        : null,
  },
  {
    straznik: "straznik-platnosci-wp",
    opis: "zapis ceny PROMOCYJNEJ (niezmiennik 3 — nie dotykamy jej nigdy)",
    plik: "wordpress/wtyczki/aai-platnosci/includes/class-aai-platnosci-zapis.php",
    wymaga: () => existsSync("wordpress/wtyczki/aai-platnosci/includes/class-aai-platnosci-zapis.php"),
    oczekiwanySlad: "ZAPISUJE cenę promocyjną",
    zmien: (s) =>
      s.includes("\t\t\t\t$produkt->set_regular_price( $cena );")
        ? s.replace(
            "\t\t\t\t$produkt->set_regular_price( $cena );",
            "\t\t\t\t$produkt->set_sale_price( $cena );\n\t\t\t\t$produkt->set_regular_price( $cena );"
          )
        : null,
  },
  {
    straznik: "straznik-platnosci-wp",
    opis: "słuchacz haka aai_sklep_* bez catch(Throwable) — wyjątek wyleci przez zapisz_kurs()",
    plik: null,
    wymaga: () => existsSync("wordpress/wtyczki/aai-platnosci/aai-platnosci.php"),
    nowyPlik: {
      sciezka: "wordpress/wtyczki/aai-platnosci/includes/class-aai-platnosci-zle.php",
      tresc: "<?php\ndefined( 'ABSPATH' ) || exit;\nfinal class Aai_Platnosci_Zle {\n\tpublic static function zarejestruj(): void {\n\t\tadd_action( 'aai_sklep_kurs_zmieniony', array( self::class, 'na_zmianie' ) );\n\t}\n\tpublic static function na_zmianie( string $id ): void {\n\t\techo $id;\n\t}\n}\n",
    },
  },
  {
    straznik: "straznik-platnosci-wp",
    opis: "zapis produktu poza warstwą zapisu (wp_update_post w klasie kontroli)",
    plik: null,
    wymaga: () => existsSync("wordpress/wtyczki/aai-platnosci/aai-platnosci.php"),
    nowyPlik: {
      sciezka: "wordpress/wtyczki/aai-platnosci/includes/class-aai-platnosci-zle.php",
      tresc: "<?php\ndefined( 'ABSPATH' ) || exit;\nwp_update_post( array( 'ID' => $product_id, 'post_status' => 'draft' ) );\n",
    },
  },
  {
    straznik: "straznik-platnosci-wp",
    opis: "ODWRÓCONA kolejność powiązania (B2) — product_id przed price_type ROZDAJE KURS ZA DARMO",
    plik: "wordpress/wtyczki/aai-platnosci/includes/class-aai-platnosci-zapis.php",
    wymaga: () => existsSync("wordpress/wtyczki/aai-platnosci/includes/class-aai-platnosci-zapis.php"),
    // Wzorzec bez twardego wcięcia — inaczej umiera przy każdej zmianie
    // zagnieżdżenia metody (tak zmartwiał po naprawie A1 przy przeglądzie P2).
    zmien: (s) => {
      const para =
        /([ \t]*)update_post_meta\( \$tutor_id, '_tutor_course_price_type', 'paid' \);\n([ \t]*)update_post_meta\( \$tutor_id, '_tutor_course_product_id', \(int\) \$product_id \);/;
      return para.test(s)
        ? s.replace(
            para,
            (_, w1, w2) =>
              `${w2}update_post_meta( $tutor_id, '_tutor_course_product_id', (int) $product_id );\n` +
              `${w1}update_post_meta( $tutor_id, '_tutor_course_price_type', 'paid' );`,
          )
        : null;
    },
  },
  {
    straznik: "straznik-platnosci-wp",
    opis: "ODWRÓCONA kolejność zdejmowania (B2) — price_type znika przed product_id",
    plik: "wordpress/wtyczki/aai-platnosci/includes/class-aai-platnosci-zapis.php",
    wymaga: () => existsSync("wordpress/wtyczki/aai-platnosci/includes/class-aai-platnosci-zapis.php"),
    zmien: (s) => {
      // Prawdziwe odwrócenie: delete product_id ląduje PO całym bloku
      // ustawiającym price_type. Pierwsza wersja tej mutacji wstawiała go
      // do WNĘTRZA `if`, więc kolejność zostawała poprawna i mutacja nic
      // nie testowała — audyt to pokazał (wadliwa mutacja jest groźniejsza
      // niż jej brak; ta sama lekcja co w 0.35.0).
      const blok =
        "\t\t\tdelete_post_meta( $tutor_id, '_tutor_course_product_id' );\n" +
        "\t\t\tif ( null !== $cel_price_type ) {\n" +
        "\t\t\t\tupdate_post_meta( $tutor_id, '_tutor_course_price_type', $cel_price_type );\n" +
        "\t\t\t}";
      const odwrocony =
        "\t\t\tif ( null !== $cel_price_type ) {\n" +
        "\t\t\t\tupdate_post_meta( $tutor_id, '_tutor_course_price_type', $cel_price_type );\n" +
        "\t\t\t}\n" +
        "\t\t\tdelete_post_meta( $tutor_id, '_tutor_course_product_id' );";
      return s.includes(blok) ? s.replace(blok, odwrocony) : null;
    },
  },
  {
    straznik: "straznik-platnosci-wp",
    opis: "produkt rodzi się od razu jako publish (B3 — kupowalny bez powiązania)",
    plik: "wordpress/wtyczki/aai-platnosci/includes/class-aai-platnosci-zapis.php",
    wymaga: () => existsSync("wordpress/wtyczki/aai-platnosci/includes/class-aai-platnosci-zapis.php"),
    zmien: (s) =>
      s.includes("$produkt->set_status( 'draft' );\n\t\t\t$produkt->set_virtual( true );")
        ? s.replace(
            "$produkt->set_status( 'draft' );\n\t\t\t$produkt->set_virtual( true );",
            "$produkt->set_status( 'publish' );\n\t\t\t$produkt->set_virtual( true );"
          )
        : null,
  },
  {
    straznik: "straznik-platnosci-wp",
    opis: "produkt widoczny w katalogu Woo (druga ścieżka zakupu w cudzym wyglądzie)",
    plik: "wordpress/wtyczki/aai-platnosci/includes/class-aai-platnosci-zapis.php",
    wymaga: () => existsSync("wordpress/wtyczki/aai-platnosci/includes/class-aai-platnosci-zapis.php"),
    zmien: (s) =>
      s.includes("$produkt->set_catalog_visibility( 'hidden' );\n\t\t\t$produkt->set_regular_price( $cena );")
        ? s.replace(
            "$produkt->set_catalog_visibility( 'hidden' );\n\t\t\t$produkt->set_regular_price( $cena );",
            "$produkt->set_regular_price( $cena );"
          )
        : null,
  },
  {
    straznik: "straznik-platnosci-wp",
    opis: "KONTRPRZYKŁAD: $wpdb->delete na WŁASNEJ tabeli w warstwie zapisu to nie kasowanie produktu",
    plik: "wordpress/wtyczki/aai-platnosci/includes/class-aai-platnosci-zapis.php",
    wymaga: () => existsSync("wordpress/wtyczki/aai-platnosci/includes/class-aai-platnosci-zapis.php"),
    oczekujCzerwonego: false,
    zmien: (s) =>
      s.includes("\t\t\tarray( 'course_uuid' => $course_uuid ),\n\t\t\tarray( '%s' )\n\t\t);")
        ? s.replace(
            "\t\t\tarray( 'course_uuid' => $course_uuid ),\n\t\t\tarray( '%s' )\n\t\t);",
            "\t\t\tarray( 'course_uuid' => $course_uuid ),\n\t\t\tarray( '%s' )\n\t\t);\n\t\t$wpdb->delete( Aai_Platnosci_Tabele::tabela( 'dostawy' ), array( 'identyfikator' => 0 ), array( '%d' ) );"
          )
        : null,
  },
  {
    straznik: "straznik-tresci-lekcji",
    opis: "zgoda na skasowanie treści wypada z KONTRAKTU (zostaje umową panelu z dyspozytorem)",
    plik: "modules/m1-sklep/typy.ts",
    zmien: (s) =>
      s.includes("pozwol_skasowac_tresc: z.boolean().default(false),")
        ? s.replace("pozwol_skasowac_tresc: z.boolean().default(false),", "")
        : null,
  },

  // --- straznik-frontu-wp (krok W3: front wtyczki) ---
  // Front działa nawet wtedy, gdy pozycja „Szkolenia" zniknęła z menu, sekcja
  // przestała się renderować albo pigułka straciła ekran jako układ
  // odniesienia. Objaw widzi dopiero klient — stąd mutacja na każdy
  // niezmiennik, tak samo jak przy CSP i przy wtyczce.
  {
    straznik: "straznik-frontu-wp",
    opis: "widok prywatny „Moje kursy” przestaje zakazywać cache'owania (lista jednego klienta może trafić do drugiego)",
    plik: "wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-trasy.php",
    // Celujemy w NASZE wywołanie (gałąź widoku „moje"), bo w tym pliku jest
    // jeszcze jedno — w gałęzi 404 — i stoi WYŻEJ. Mutacja „pierwsze z brzegu"
    // podmieniała tamto i mierzyła nie to, co trzeba.
    zmien: (s) =>
      s.includes("nocache_headers();\n\t\t\treturn AAI_SKLEP_KATALOG . 'szablony/moje.php';")
        ? s.replace(
            "nocache_headers();\n\t\t\treturn AAI_SKLEP_KATALOG . 'szablony/moje.php';",
            "return AAI_SKLEP_KATALOG . 'szablony/moje.php';"
          )
        : null,
  },
  {
    straznik: "straznik-frontu-wp",
    opis: "rodzaj sekcji z kontraktu traci szablon (kreator pozwoli wpisać, strona przemilczy)",
    plik: null,
    usunPlik: "wordpress/wtyczki/aai-sklep/szablony/sekcje/faq.php",
    wymaga: () => existsSync("wordpress/wtyczki/aai-sklep/szablony/sekcje/faq.php"),
  },
  {
    straznik: "straznik-frontu-wp",
    opis: "nowe pole w kontrakcie sekcji, którego żaden szablon nie renderuje",
    plik: "modules/m1-sklep/typy.ts",
    wymaga: () => existsSync("wordpress/wtyczki/aai-sklep/szablony/sekcje/guarantee.php"),
    zmien: (s) =>
      s.includes("export const TrescGwarancja = z.object({")
        ? s.replace(
            "export const TrescGwarancja = z.object({",
            "export const TrescGwarancja = z.object({\n  pole_bez_renderu: krotki().optional(),"
          )
        : null,
  },
  {
    straznik: "straznik-frontu-wp",
    opis: "sekcja wypada z listy renderowanych (szablon jest, nikt go nie woła)",
    plik: "wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-sekcje.php",
    wymaga: () =>
      existsSync("wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-sekcje.php"),
    zmien: (s) =>
      s.includes("array( 'faq', 'FAQ' ),") ? s.replace("array( 'faq', 'FAQ' ),", "") : null,
  },
  {
    straznik: "straznik-frontu-wp",
    opis: "wstrzyknięcie pozycji menu kotwiczy na klasie Tailwinda zamiast na treści",
    plik: "wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-menu.php",
    wymaga: () =>
      existsSync("wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-menu.php"),
    zmien: (s) =>
      s.includes("'aria-label=\"' . $etykieta . '\"'")
        ? s.replace(
            "'aria-label=\"' . $etykieta . '\"'",
            "'class=\"relative hidden items-center gap-7 lg:flex\"'"
          )
        : null,
  },
  {
    straznik: "straznik-frontu-wp",
    opis: "arkusz przestaje rezerwować miejsce pod nagłówek fixed motywu (72 px)",
    plik: "wordpress/wtyczki/aai-sklep/assets/sklep.css",
    wymaga: () => existsSync("wordpress/wtyczki/aai-sklep/assets/sklep.css"),
    zmien: (s) =>
      s.includes("--aai-odstep-naglowka: 7rem;")
        ? s.replace("--aai-odstep-naglowka: 7rem;", "--aai-odstep-naglowka: 2rem;")
        : null,
  },
  {
    straznik: "straznik-frontu-wp",
    opis: "pływająca pigułka (position: fixed) ląduje wewnątrz <main> — BLAD-003",
    plik: "wordpress/wtyczki/aai-sklep/szablony/kurs.php",
    wymaga: () => existsSync("wordpress/wtyczki/aai-sklep/szablony/kurs.php"),
    zmien: (s) =>
      s.includes("require __DIR__ . '/czesci/pasek.php';") &&
      s.includes('<main id="tresc" class="aai-strona" data-kurs>')
        ? s
            .replace("require __DIR__ . '/czesci/pasek.php';", "")
            .replace(
              '<main id="tresc" class="aai-strona" data-kurs>',
              '<main id="tresc" class="aai-strona" data-kurs>\n<?php require __DIR__ . \'/czesci/pasek.php\'; ?>'
            )
        : null,
  },
  {
    straznik: "straznik-frontu-wp",
    opis: "przekierowanie z /courses/* staje się tymczasowe (302 zostawia stary adres w indeksie)",
    plik: "wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-trasy.php",
    wymaga: () =>
      existsSync("wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-trasy.php"),
    zmien: (s) => (s.includes(", 301 );") ? s.replaceAll(", 301 );", ", 302 );") : null),
  },
  {
    straznik: "straznik-frontu-wp",
    opis: "klasa z animacją bez wygaszenia w prefers-reduced-motion",
    plik: "wordpress/wtyczki/aai-sklep/assets/sklep.css",
    wymaga: () => existsSync("wordpress/wtyczki/aai-sklep/assets/sklep.css"),
    zmien: (s) => s + "\n.aai-ruch-bez-wygaszenia { animation: aai-dryf-a 9s linear infinite; }\n",
  },
  {
    straznik: "straznik-frontu-wp",
    opis:
      "KONTRPRZYKŁAD: <main> w komentarzu szablonu (tam, gdzie napisane, że fixed ma stać POZA nim) to proza, nie kod",
    plik: "wordpress/wtyczki/aai-sklep/szablony/kurs.php",
    wymaga: () => existsSync("wordpress/wtyczki/aai-sklep/szablony/kurs.php"),
    zmien: (s) =>
      s.includes("defined( 'ABSPATH' ) || exit;")
        ? s.replace(
            "defined( 'ABSPATH' ) || exit;",
            "/* Uwaga: tło i pasek stoją POZA <main>, patrz czesci/tlo.php i czesci/pasek.php. */\ndefined( 'ABSPATH' ) || exit;"
          )
        : null,
    oczekujCzerwonego: false,
  },

  // --- straznik-kreatora-wp (krok W4: kreator w kokpicie) ---
  // Kreator działa nawet wtedy, gdy pole wypadło z kontraktu, akcja straciła
  // nonce albo zapis programu zaczął czyścić prozę. Pierwsze dwa objawy widzi
  // dopiero właściciel (i to nie od razu), trzeciego nie widzi nikt — dlatego
  // każdy niezmiennik ma tu własną mutację.
  {
    straznik: "straznik-kreatora-wp",
    opis: "pole z kontraktu prototypu znika z kontraktu wtyczki (kreator nie ma go czym wypełnić)",
    plik: "wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-sekcje.php",
    wymaga: () => existsSync("wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-sekcje.php"),
    zmien: (s) =>
      s.includes("'dla_kogo'    => array(")
        ? s.replace(
            /\t\t\t\t'dla_kogo'    => array\([\s\S]*?\n\t\t\t\t\),\n/,
            ""
          )
        : null,
  },
  {
    straznik: "straznik-kreatora-wp",
    opis: "pole kontraktu bez etykiety (w panelu wygląda jak klucz bazy danych)",
    plik: "wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-sekcje.php",
    wymaga: () => existsSync("wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-sekcje.php"),
    zmien: (s) =>
      s.includes("'etykieta' => 'Nagłówek',")
        ? s.replace("'etykieta' => 'Nagłówek',", "")
        : null,
  },
  {
    straznik: "straznik-kreatora-wp",
    opis: "kolejność sekcji w panelu przestaje domykać listę rodzajów (nowy rodzaj wypada z kreatora)",
    plik: "wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-sekcje.php",
    wymaga: () => existsSync("wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-sekcje.php"),
    zmien: (s) =>
      s.includes("foreach ( self::rodzaje() as $rodzaj ) {")
        ? s.replace(
            /\t\tforeach \( self::rodzaje\(\) as \$rodzaj \) \{[\s\S]*?\n\t\t\}\n/,
            ""
          )
        : null,
  },
  {
    straznik: "straznik-kreatora-wp",
    opis: "akcja zapisu kursu traci sprawdzenie nonce'a (cudza strona zapisze za plecami właściciela)",
    plik: "wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-panel-akcje.php",
    wymaga: () => existsSync("wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-panel-akcje.php"),
    zmien: (s) =>
      s.includes("check_admin_referer( self::ZAPISZ_KURS );")
        ? s.replace("check_admin_referer( self::ZAPISZ_KURS );", "")
        : null,
  },
  {
    straznik: "straznik-kreatora-wp",
    opis: "akcja zapisu lekcji traci sprawdzenie uprawnienia (puszcza każdego zalogowanego)",
    plik: "wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-panel-akcje.php",
    wymaga: () => existsSync("wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-panel-akcje.php"),
    zmien: (s) => {
      const gdzie = s.indexOf("check_admin_referer( self::ZAPISZ_LEKCJE );");
      if (gdzie === -1) return null;
      const po = s.indexOf("self::brama();", gdzie);
      if (po === -1) return null;
      return s.slice(0, po) + s.slice(po + "self::brama();".length);
    },
  },
  {
    straznik: "straznik-kreatora-wp",
    opis: "akcja kreatora zarejestrowana dla NIEZALOGOWANYCH",
    plik: "wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-panel-akcje.php",
    wymaga: () => existsSync("wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-panel-akcje.php"),
    zmien: (s) =>
      s.includes("add_action( 'admin_post_' . self::ZAPISZ_KURS")
        ? s.replace(
            "add_action( 'admin_post_' . self::ZAPISZ_KURS",
            "add_action( 'admin_post_nopriv_' . self::ZAPISZ_KURS, array( self::class, 'zapisz_kurs' ) );\n\t\tadd_action( 'admin_post_' . self::ZAPISZ_KURS"
          )
        : null,
  },
  {
    straznik: "straznik-frontu-wp",
    opis: "kontrakt przestaje odrzucać slug zajęty przez naszą podstronę (BLAD-021: kurs w katalogu, którego strona sprzedażowa nie istnieje)",
    plik: "wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-kontrakt.php",
    wymaga: () => existsSync("wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-kontrakt.php"),
    zmien: (s) =>
      s.includes("Aai_Sklep_Trasy::zarezerwowane_slugi(), true ) ) {")
        ? s.replace("in_array( $slug, Aai_Sklep_Trasy::zarezerwowane_slugi(), true )", "false")
        : null,
  },
  {
    straznik: "straznik-frontu-wp",
    opis: "reguły przepisywania przestają brać podstrony z jednej stałej (nowa podstrona dostanie adres, ale slug nie zostanie zakazany)",
    plik: "wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-trasy.php",
    wymaga: () => existsSync("wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-trasy.php"),
    zmien: (s) =>
      s.includes("foreach ( self::PODSTRONY as $sciezka => $widok ) {")
        ? s.replace(
            /\t\tforeach \( self::PODSTRONY as \$sciezka => \$widok \) \{[\s\S]*?\n\t\t\}\n/,
            "\t\tadd_rewrite_rule( '^szkolenia/moje/?$', 'index.php?aai_widok=moje', 'top' );\n"
          )
        : null,
  },
  {
    straznik: "straznik-wtyczki-wp",
    opis: "warstwa zapisu koduje JSON bez porządkowania kluczy (BLAD-020: zapis bez zmian melduje „zapisano” i puchnie dziennik)",
    plik: "wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-zapis.php",
    wymaga: () => existsSync("wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-zapis.php"),
    zmien: (s) =>
      s.includes("self::uporzadkuj( $wartosc ),")
        ? s.replace("self::uporzadkuj( $wartosc ),", "$wartosc,")
        : null,
  },
  {
    straznik: "straznik-kreatora-wp",
    opis: "wiersz lekcji przestaje być granicą zakresu kolektora (BLAD-019: zapis kursu nadaje modułom tytuł ostatniej lekcji)",
    plik: "wordpress/wtyczki/aai-sklep/assets/panel.js",
    wymaga: () => existsSync("wordpress/wtyczki/aai-sklep/assets/panel.js"),
    zmien: (s) =>
      s.includes('"data-aai-lekcja",')
        ? s.replace('\t\t"data-aai-lekcja",\n', "")
        : null,
  },
  {
    straznik: "straznik-kreatora-wp",
    opis: "kolektor przestaje korzystać z listy granic (lista zostaje, ale niczego nie pilnuje)",
    plik: "wordpress/wtyczki/aai-sklep/assets/panel.js",
    wymaga: () => existsSync("wordpress/wtyczki/aai-sklep/assets/panel.js"),
    zmien: (s) =>
      s.includes("GRANICE_ZAKRESU.some(function (znacznik) {")
        ? s.replace(
            /GRANICE_ZAKRESU\.some\(function \(znacznik\) \{[\s\S]*?\}\)/,
            'element.hasAttribute("data-aai-pole")'
          )
        : null,
  },
  {
    straznik: "straznik-kreatora-wp",
    opis: "pole treści lekcji znika z opisu (materiał kursu bez miejsca w panelu)",
    plik: "wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-kontrakt.php",
    wymaga: () => existsSync("wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-kontrakt.php"),
    zmien: (s) =>
      s.includes("'materialy' => array(")
        ? s.replace("'materialy' => array(", "'zalaczniki' => array(")
        : null,
  },
  {
    straznik: "straznik-kreatora-wp",
    opis: "zapis programu przestaje rozróżniać brak klucza `content` od pustki (czyści prozę i melduje sukces)",
    plik: "wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-zapis.php",
    wymaga: () => existsSync("wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-zapis.php"),
    zmien: (s) =>
      s.includes("if ( array_key_exists( 'content', $l ) || $nowa ) {")
        ? s.replace("if ( array_key_exists( 'content', $l ) || $nowa ) {", "if ( true ) {")
        : null,
  },
  {
    straznik: "straznik-kreatora-wp",
    opis: "adres w polu treści sprawdzany funkcją od WYCHODZĄCYCH żądań (BLAD-017: link znika ze strony)",
    plik: "wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-pola.php",
    wymaga: () => existsSync("wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-pola.php"),
    zmien: (s) =>
      s.includes("$czesci = wp_parse_url( $adres );")
        ? s.replace("$czesci = wp_parse_url( $adres );", "return (bool) wp_http_validate_url( $adres );\n\t\t$czesci = wp_parse_url( $adres );")
        : null,
  },
  {
    straznik: "straznik-kreatora-wp",
    opis: "szablon frontu sięga po treść lekcji (materiał kursu wycieka poza bramę)",
    plik: "wordpress/wtyczki/aai-sklep/szablony/czesci/program.php",
    wymaga: () => existsSync("wordpress/wtyczki/aai-sklep/szablony/czesci/program.php"),
    zmien: (s) =>
      s.includes("defined( 'ABSPATH' ) || exit;")
        ? s.replace(
            "defined( 'ABSPATH' ) || exit;",
            "defined( 'ABSPATH' ) || exit;\n$wyciek = $aai_lekcja['content'] ?? '';"
          )
        : null,
  },
  {
    straznik: "straznik-kreatora-wp",
    opis: "zapis samych kolumn kursu zaczyna kasować SEKCJE (brak klucza brany za pustkę)",
    plik: "wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-zapis.php",
    wymaga: () => existsSync("wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-zapis.php"),
    zmien: (s) =>
      s.includes("$zmieniamy_sekcje = array_key_exists( 'sekcje', $kurs )")
        ? s.replace(
            "$zmieniamy_sekcje = array_key_exists( 'sekcje', $kurs ) && null !== $kurs['sekcje'];",
            "$zmieniamy_sekcje = true;"
          )
        : null,
  },
  {
    straznik: "straznik-kreatora-wp",
    opis: "zapis samych kolumn kursu zaczyna kasować PROGRAM razem z treścią lekcji",
    plik: "wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-zapis.php",
    wymaga: () => existsSync("wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-zapis.php"),
    zmien: (s) =>
      s.includes("$zmieniamy_program = array_key_exists( 'moduly', $kurs )")
        ? s.replace(
            "$zmieniamy_program = array_key_exists( 'moduly', $kurs ) && null !== $kurs['moduly'];",
            "$zmieniamy_program = true;"
          )
        : null,
  },
  {
    straznik: "straznik-kreatora-wp",
    opis: "zapis kursu znów nadpisuje STAN (zapis ze starszej karty cofa publikację)",
    plik: "wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-zapis.php",
    wymaga: () => existsSync("wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-zapis.php"),
    zmien: (s) =>
      s.includes("if ( array_key_exists( 'status', $kurs ) ) {")
        ? s.replace(
            "if ( array_key_exists( 'status', $kurs ) ) {",
            "if ( true ) {"
          )
        : null,
  },
  {
    straznik: "straznik-kreatora-wp",
    opis: "formularz edytora znów niesie stan kursu (pole ukryte name=\"status\")",
    plik: "wordpress/wtyczki/aai-sklep/szablony/panel/kurs.php",
    wymaga: () => existsSync("wordpress/wtyczki/aai-sklep/szablony/panel/kurs.php"),
    zmien: (s) =>
      s.includes('<input type="hidden" name="type"')
        ? s.replace(
            '<input type="hidden" name="type"',
            '<input type="hidden" name="status" value="draft" />\n\t\t<input type="hidden" name="type"'
          )
        : null,
  },
  {
    straznik: "straznik-kreatora-wp",
    opis:
      "KONTRPRZYKŁAD: wzmianka o wp_http_validate_url w KOMENTARZU (wyjaśnienie BLAD-017) to proza, nie kod",
    plik: "wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-pola.php",
    wymaga: () => existsSync("wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-pola.php"),
    zmien: (s) =>
      s.includes("declare( strict_types = 1 );")
        ? s.replace(
            "declare( strict_types = 1 );",
            "/* Uwaga: NIE używamy wp_http_validate_url() — patrz BLAD-017. */\ndeclare( strict_types = 1 );"
          )
        : null,
    oczekujCzerwonego: false,
  },

  // --- straznik-tutora (krok W5: kopia kursu w Tutor LMS) ---
  // Kopia rozjeżdża się PO CICHU: strona działa, kreator zapisuje, a klient
  // po zalogowaniu czyta inną wersję. Każdy niezmiennik ma tu własną mutację,
  // bo żaden z nich nie objawia się błędem.
  {
    straznik: "straznik-tutora",
    opis: "kopia do Tutora przestaje być rejestrowana (kod żyje, ale nikogo nie słucha)",
    plik: "wordpress/wtyczki/aai-sklep/aai-sklep.php",
    wymaga: () => existsSync(KLASA_TUTORA),
    zmien: (s) =>
      s.includes("Aai_Sklep_Tutor::zarejestruj();")
        ? s.replace("Aai_Sklep_Tutor::zarejestruj();", "")
        : null,
  },
  {
    straznik: "straznik-tutora",
    opis: "klasa kopii woła warstwę zapisu (kierunek przestaje być jednokierunkowy)",
    plik: KLASA_TUTORA,
    wymaga: () => existsSync(KLASA_TUTORA),
    zmien: (s) =>
      s.includes("private static bool $wstrzymana = false;")
        ? s.replace(
            "private static bool $wstrzymana = false;",
            "private static bool $wstrzymana = false;\n\n\tprivate static function wroc_do_zrodla( array $kurs ): void {\n\t\tAai_Sklep_Zapis::zapisz_kurs( $kurs, 'tutor' );\n\t}"
          )
        : null,
  },
  {
    straznik: "straznik-tutora",
    opis: "klasa kopii pisze wprost do naszych tabel",
    plik: KLASA_TUTORA,
    wymaga: () => existsSync(KLASA_TUTORA),
    zmien: (s) =>
      s.includes("private static bool $wstrzymana = false;")
        ? s.replace(
            "private static bool $wstrzymana = false;",
            "private static bool $wstrzymana = false;\n\n\tprivate static function skrot( string $id ): void {\n\t\tglobal $wpdb;\n\t\t$wpdb->update( 'x', array( 'a' => 1 ), array( 'id' => $id ) );\n\t}"
          )
        : null,
  },
  {
    straznik: "straznik-tutora",
    opis: "zapis treści lekcji przestaje ogłaszać zmianę (poprawiona proza nie dojedzie do kopii)",
    plik: "wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-zapis.php",
    wymaga: () => existsSync(KLASA_TUTORA),
    zmien: (s) =>
      s.includes("self::powiadom( $id_kursu, $liczniki );")
        ? s.replace("self::powiadom( $id_kursu, $liczniki );", "")
        : null,
  },
  {
    straznik: "straznik-tutora",
    opis: "zapis kursu przestaje ogłaszać zmianę (poprawka tytułu i programu nie dojedzie do kopii)",
    plik: "wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-zapis.php",
    wymaga: () => existsSync(KLASA_TUTORA),
    zmien: (s) =>
      s.includes("self::powiadom( (string) $kurs['id'], $liczniki );")
        ? s.replace("self::powiadom( (string) $kurs['id'], $liczniki );", "")
        : null,
  },
  {
    straznik: "straznik-tutora",
    opis: "publikacja przestaje ogłaszać zmianę (kurs opublikowany u nas zostaje szkicem w Tutorze)",
    plik: "wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-zapis.php",
    wymaga: () => existsSync(KLASA_TUTORA),
    zmien: (s) =>
      s.includes("self::powiadom( $id, $liczniki );")
        ? s.replace("self::powiadom( $id, $liczniki );", "")
        : null,
  },
  {
    straznik: "straznik-tutora",
    opis: "usunięcie kursu przestaje ogłaszać usunięcie (w Tutorze zostaje sierota z dostępem)",
    plik: "wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-zapis.php",
    wymaga: () => existsSync(KLASA_TUTORA),
    zmien: (s) =>
      s.includes("do_action( 'aai_sklep_kurs_usuniety', $id );")
        ? s.replace("do_action( 'aai_sklep_kurs_usuniety', $id );", "")
        : null,
  },
  {
    straznik: "straznik-tutora",
    opis: "wpisy Tutora tworzone poza klasą kopii (kopia dostaje drugiego autora)",
    plik: "wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-panel-akcje.php",
    wymaga: () => existsSync(KLASA_TUTORA),
    zmien: (s) =>
      s.includes("private static function brama(): void {")
        ? s.replace(
            "private static function brama(): void {",
            "private static function na_skroty(): void {\n\t\twp_insert_post( array( 'post_type' => 'lesson' ) );\n\t}\n\n\tprivate static function brama(): void {"
          )
        : null,
  },
  {
    straznik: "straznik-tutora",
    opis: "zapis meta bez wp_slash (WordPress zjada backslashe — C:\\Users z kursu o Gicie)",
    plik: KLASA_TUTORA,
    wymaga: () => existsSync(KLASA_TUTORA),
    zmien: (s) =>
      s.includes("update_post_meta( (int) $id, $klucz, wp_slash( $wartosc ) );")
        ? s.replace(
            "update_post_meta( (int) $id, $klucz, wp_slash( $wartosc ) );",
            "update_post_meta( (int) $id, $klucz, $wartosc );"
          )
        : null,
  },
  {
    straznik: "straznik-tutora",
    opis: "spłaszczenie sekcji traci asercję (JSON wyjeżdża na stronę kursu dla człowieka)",
    plik: KLASA_TUTORA,
    wymaga: () => existsSync(KLASA_TUTORA),
    zmien: (s) => {
      const gdzie = s.indexOf("if ( '' === $wynik || false !== strpos( $wynik, '{\"' )");
      if (gdzie === -1) return null;
      const koniec = s.indexOf("\t\t}\n", gdzie);
      return s.slice(0, gdzie) + s.slice(koniec + 4);
    },
  },
  {
    straznik: "straznik-tutora",
    opis: "słuchacz zmiany przestaje łapać wyjątek (awaria Tutora wywala właścicielowi zapis treści)",
    plik: KLASA_TUTORA,
    wymaga: () => existsSync(KLASA_TUTORA),
    zmien: (s) =>
      s.includes("\t\t} catch ( Throwable $blad ) {\n\t\t\tself::zapamietaj_blad( $id, $blad->getMessage() );\n\t\t}")
        ? s.replace(
            "\t\ttry {\n\t\t\tself::synchronizuj_kurs( $id );\n\t\t} catch ( Throwable $blad ) {\n\t\t\tself::zapamietaj_blad( $id, $blad->getMessage() );\n\t\t}",
            "\t\tself::synchronizuj_kurs( $id );"
          )
        : null,
  },
  // --- straznik-lekcji-wp (krok W5: nasz widok lekcji) ---
  // Strona lekcji jest TOWAREM. Wyciek materiału, nieprzetworzony Markdown
  // i arkusz sięgający poza własną stronę — żadna z tych rzeczy nie zapala
  // się sama, więc każda ma tu mutację.
  {
    straznik: "straznik-lekcji-wp",
    opis: "widok lekcji przestaje być rejestrowany (klient dostaje stronę Tutora)",
    plik: "wordpress/wtyczki/aai-sklep/aai-sklep.php",
    wymaga: () => existsSync(KLASA_LEKCJI),
    zmien: (s) =>
      s.includes("Aai_Sklep_Lekcja::zarejestruj();")
        ? s.replace("Aai_Sklep_Lekcja::zarejestruj();", "")
        : null,
  },
  {
    straznik: "straznik-lekcji-wp",
    opis: "dostęp do lekcji przestaje być pytany u Tutora (własna reguła obok istniejącej)",
    plik: KLASA_LEKCJI,
    wymaga: () => existsSync(KLASA_LEKCJI),
    zmien: (s) =>
      s.includes("has_enrolled_content_access")
        ? s.replace(/tutor_utils\(\)->has_enrolled_content_access\([^;]*;/, "true;")
        : null,
  },
  {
    straznik: "straznik-lekcji-wp",
    opis: "treść składana PRZED sprawdzeniem dostępu (materiał wczytany dla każdego)",
    plik: KLASA_LEKCJI,
    wymaga: () => existsSync(KLASA_LEKCJI),
    zmien: (s) => {
      const gdzie = s.indexOf("\t\tif ( ! $dostep ) {");
      if (gdzie === -1) return null;
      const koniec = s.indexOf("\t\t}\n", gdzie);
      return s.slice(0, gdzie) + s.slice(koniec + 4);
    },
  },
  {
    straznik: "straznik-lekcji-wp",
    opis: "renderer traci asercję na nieprzetworzony Markdown",
    plik: KLASA_PROZY,
    wymaga: () => existsSync(KLASA_PROZY),
    zmien: (s) =>
      s.includes("SLADY_SUROWEGO")
        ? s.replace(/private const SLADY_SUROWEGO[\s\S]*?\);\n/, "")
        : null,
  },
  {
    straznik: "straznik-lekcji-wp",
    opis: "asercja przestaje pomijać bloki kodu (lekcja o Markdownie staje na własnym przykładzie)",
    plik: KLASA_PROZY,
    wymaga: () => existsSync(KLASA_PROZY),
    zmien: (s) =>
      s.includes("<pre><code>[\\s\\S]*?</code></pre>")
        ? s
            .replace("~<pre><code>[\\s\\S]*?</code></pre>~u", "~NIC_TAKIEGO~u")
            .replace("~<code>[^<]*</code>~u", "~ANI_TAKIEGO~u")
        : null,
  },
  {
    straznik: "straznik-lekcji-wp",
    opis: "skład w linii przestaje uciekać treść (wklejony <script> byłby wykonalny)",
    plik: KLASA_PROZY,
    wymaga: () => existsSync(KLASA_PROZY),
    zmien: (s) =>
      s.includes("$tekst = self::uciekaj( $tekst );")
        ? s.replace("$tekst = self::uciekaj( $tekst );", "")
        : null,
  },
  {
    straznik: "straznik-lekcji-wp",
    opis: "zrzuty wychodzą bez width/height (148 obrazów przepycha tekst przy doładowaniu)",
    plik: KLASA_PROZY,
    wymaga: () => existsSync(KLASA_PROZY),
    zmien: (s) =>
      s.includes("$rozmiar = ' width=\"'")
        ? s.replace(/\$rozmiar = ' width="'[\s\S]*?;\n/, "$rozmiar = '';\n")
        : null,
  },
  {
    straznik: "straznik-lekcji-wp",
    opis: "reguła arkusza lekcji bez zakotwiczenia (arkusz sięga na cudze strony)",
    plik: ARKUSZ_LEKCJI,
    wymaga: () => existsSync(ARKUSZ_LEKCJI),
    zmien: (s) => s + "\n.aai-tresc p { color: red; }\n",
  },
  {
    straznik: "straznik-lekcji-wp",
    opis: "strona lekcji przestaje być wyłączona spod reguły „to strona Tutora” (wraca kolizja klas)",
    plik: "wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-zasoby.php",
    wymaga: () => existsSync(KLASA_LEKCJI),
    zmien: (s) => {
      const gdzie = s.indexOf("\t\tif ( class_exists( 'Aai_Sklep_Lekcja' ) && Aai_Sklep_Lekcja::czy_nasza() ) {");
      if (gdzie === -1) return null;
      const koniec = s.indexOf("\t\t}\n", gdzie);
      return s.slice(0, gdzie) + s.slice(koniec + 4);
    },
  },
  {
    straznik: "straznik-lekcji-wp",
    opis:
      "KONTRPRZYKŁAD: `@media` bez zakotwiczenia to reguła grupująca, nie selektor",
    plik: ARKUSZ_LEKCJI,
    wymaga: () => existsSync(ARKUSZ_LEKCJI),
    zmien: (s) => s + "\n@media print {\n\t.aai-sklep-lekcja .aai-pasek { display: none; }\n}\n",
    oczekujCzerwonego: false,
  },

  {
    straznik: "straznik-tutora",
    opis:
      "KONTRPRZYKŁAD: nazwa wp_insert_post w KOMENTARZU innej klasy to proza, nie zapis wpisu",
    plik: "wordpress/wtyczki/aai-sklep/includes/class-aai-sklep-odczyt.php",
    wymaga: () => existsSync(KLASA_TUTORA),
    zmien: (s) =>
      s.includes("declare( strict_types = 1 );")
        ? s.replace(
            "declare( strict_types = 1 );",
            "/* Uwaga: ta klasa NIE woła wp_insert_post() — wpisy Tutora rusza wyłącznie klasa kopii. */\ndeclare( strict_types = 1 );"
          )
        : null,
    oczekujCzerwonego: false,
  },
];


const sha = (t) => createHash("sha256").update(t).digest("hex");
const zlapane = [], przeoczone = [], martwe = [], pominiete = [];

/*
 * Opcjonalny filtr po nazwie strażnika: `node audyt-straznikow.mjs straznik-tutora`.
 * Pełny przebieg trwa kilka minut, więc przy PISANIU strażnika chce się puścić
 * same jego mutacje. Domyślnie (bez argumentu) lecą wszystkie — bramka przed
 * wydaniem to zawsze pełny przebieg.
 */
const filtr = process.argv[2] ?? "";
const doWykonania = "" === filtr ? MUTACJE : MUTACJE.filter((m) => m.straznik === filtr);

if (0 === doWykonania.length) {
  console.error(`audyt-straznikow: filtr „${filtr}" nie pasuje do żadnej mutacji.`);
  process.exit(1);
}

for (const m of doWykonania) {
  if (m.wymaga && !m.wymaga()) {
    pominiete.push(`${m.straznik}: ${m.opis} — brak materiału do próby`);
    continue;
  }
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
    const wyjscie = `${wynik.stdout ?? ""}${wynik.stderr ?? ""}`;
    let czerwony = wynik.status !== 0;
    if (czerwony && m.oczekiwanySlad && !wyjscie.includes(m.oczekiwanySlad)) {
      // Strażnik zapalił się z INNEGO powodu niż ten, który mutacja
      // testuje — dla tej mutacji to znaczy „przeoczone", nie „złapane".
      przeoczone.push(
        `${m.straznik}: ${m.opis} — strażnik zapalił się z innego powodu (brak śladu „${m.oczekiwanySlad}")`,
      );
      continue;
    }
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

console.log(
  `\naudyt-straznikow: ${zlapane.length} złapanych, ${przeoczone.length} przeoczonych, ${martwe.length} martwych` +
    (pominiete.length ? `, ${pominiete.length} pominiętych (brak materiału)` : "") +
    ` (mutacji: ${doWykonania.length}${doWykonania.length === MUTACJE.length ? "" : ` z ${MUTACJE.length}`})`,
);
for (const p of pominiete) console.log(`  · ${p}`);
for (const z of zlapane) console.log(`  ✓ ${z}`);
if (martwe.length) { console.error("\nMARTWE MUTACJE (nic nie testują, a wyglądają na zielone):"); for (const x of martwe) console.error(`  ⚠ ${x}`); }
if (przeoczone.length) { console.error("\nDZIURY:"); for (const x of przeoczone) console.error(`  ✘ ${x}`); }
process.exitCode = przeoczone.length || martwe.length ? 1 : 0;
