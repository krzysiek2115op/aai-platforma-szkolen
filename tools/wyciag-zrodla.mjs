/**
 * Wyciąg ze źródła: odchudza plik dokumentacji producenta do tego, z czego
 * naprawdę pisze się scenariusz lekcji — prozy, tabel i JEDNEGO przykładu
 * kodu na sekcję.
 *
 * PO CO TO ISTNIEJE. Od modułu 4 Kursu 2 lekcje pisze kilku subagentów
 * równolegle (decyzja właściciela 2026-08-18, `tresc-kursow/POSTEP.md`).
 * Każdy z nich dostaje plik źródłowy do kontekstu, więc każdy bajt śmiecia
 * mnoży się przez liczbę agentów. A dokumentacja GitHuba i Anthropic jest
 * gęsto zaśmiecona rzeczami, które w scenariuszu nie niosą ŻADNEJ tezy:
 *
 *   - blobki `<svg …>` ikon Octicon — jedna ikona to ~1,5 tys. znaków
 *     ścieżek wektorowych wklejonych w środek zdania,
 *   - odsyłacze do zrzutów ekranu (`![…](/assets/images/…)`) — obrazka
 *     i tak nie widzimy, a właściciel nagrywa własny ekran,
 *   - bloki `<div class="ghd-tool …">` — TA SAMA procedura powtórzona dla
 *     webui, cli, desktop, codespaces, mac, windows, linux…,
 *   - `<CodeGroup>` w dokumentacji Anthropic — ten sam przykład w cURL,
 *     Pythonie, TypeScripcie, Javie i paru innych językach,
 *   - ścieżki wewnętrznych odsyłaczy (`/en/…`) — bywają dłuższe od zdania,
 *     które je zawiera, a agent i tak ich nie otwiera; TYTUŁ odsyłacza,
 *     czyli jedyna niosąca treść część, zostaje w cudzysłowie.
 *
 * ZASADA: narzędzie NICZEGO nie streszcza i nie przepisuje — tylko wycina
 * powtórzenia i szum. Proza, tabele i nagłówki zostają w całości, znak
 * w znak, bo to na nich stoi tabela „Zgodność ze źródłem". Każde cięcie
 * zostawia ślad: w miejscu wycięcia albo w podsumowaniu na końcu pliku.
 * Cichy skrót byłby gorszy od braku narzędzia — agent nie wiedziałby, że
 * czyta wersję niepełną.
 *
 * UŻYCIE
 *   node tools/wyciag-zrodla.mjs <plik.md> [plik.md …]      → na stdout
 *   node tools/wyciag-zrodla.mjs --do <katalog> <plik.md …> → zapis do plików
 *   node tools/wyciag-zrodla.mjs --narzedzie cli <plik.md>  → wybór wariantu
 *                                                             bloków ghd-tool
 * Statystyki (ile ubyło) idą na stderr, żeby nie brudziły wyjścia.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { basename, join } from "node:path";

// Kolejność preferencji wariantów `ghd-tool`. Kurs uczy pracy przez
// przeglądarkę, więc domyślnie zostaje `webui`; gdy go w pliku nie ma,
// bierzemy pierwszy wariant, jaki wystąpił.
const DOMYSLNE_NARZEDZIE = "webui";

function parsujArgumenty(argv) {
  const opcje = { katalog: null, narzedzie: DOMYSLNE_NARZEDZIE, pliki: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--do") opcje.katalog = argv[++i];
    else if (argv[i] === "--narzedzie") opcje.narzedzie = argv[++i];
    else opcje.pliki.push(argv[i]);
  }
  return opcje;
}

/**
 * Wycina blobki SVG. Ikony bywają wklejone w środek zdania („kliknij
 * **<svg …>Pull requests**"), więc usuwamy sam element, a tekst wokół
 * zostawiamy nietknięty.
 */
function bezIkon(tekst, licznik) {
  return (
    tekst
      .replace(/<svg\b[\s\S]*?<\/svg>/g, () => {
        licznik.ikony++;
        return "";
      })
      // Gdy ikona BYŁA całą treścią wyróżnienia („kliknij **<svg …>**"),
      // zostaje puste `****` — bez podmiany zdanie traci przedmiot.
      .replace(/\*\*\s*\*\*/g, "**[ikona]**")
  );
}

/** Usuwa odsyłacze do zrzutów ekranu (także te w środku akapitu). */
function bezZrzutow(tekst, licznik) {
  const zrzut = /!\[[^\]]*\]\((?:\/assets\/|[^)]*\.(?:png|jpg|jpeg|gif|webp|svg))[^)]*\)/gi;
  const bezObrazkow = tekst.replace(zrzut, () => {
    licznik.zrzuty++;
    return "";
  });
  // Wiersz, w którym poza zrzutem nie było nic, zostaje pustą linią —
  // sprząta ją `bezPustychLinii` na końcu.
  return bezObrazkow;
}

/**
 * Zamienia wewnętrzne odsyłacze dokumentacji na sam tytuł w cudzysłowie:
 * `[Creating a branch](/en/…/creating-and-deleting-branches…)` → `„Creating
 * a branch"`. Adresy zewnętrzne (https://) zostają — bywają cytowane.
 * Cięcie robimy poza blokami kodu, żeby nie ruszyć przykładów.
 */
function bezSciezekOdsylaczy(tekst, licznik) {
  return podzielNaBloki(tekst)
    .map((czesc) =>
      czesc.kod
        ? czesc.wiersze.join("\n")
        : czesc.wiersze
            .join("\n")
            .replace(/\[([^\]]+)\]\((\/[^)\s]*)\)/g, (_, tytul) => {
              licznik.odsylacze++;
              return `„${tytul}"`;
            }),
    )
    .join("\n");
}

/** Usuwa komentarze HTML (w dokumentacji GitHuba to notatki redakcyjne). */
function bezKomentarzy(tekst) {
  return tekst.replace(/<!--[\s\S]*?-->/g, "");
}

/**
 * Zostawia JEDEN wariant bloków `<div class="ghd-tool …">`, resztę wycina.
 * Skanuje z uwzględnieniem zagnieżdżeń `<div>` — bloki bywają w sobie.
 */
function jedenWariantNarzedzia(tekst, preferowany, licznik) {
  const otwarcie = /<div class="ghd-tool ([^"]+)">/g;
  const bloki = [];
  let m;
  while ((m = otwarcie.exec(tekst)) !== null) {
    const start = m.index;
    // Znajdź domykający </div> na tym samym poziomie zagnieżdżenia.
    let glebokosc = 1;
    let i = otwarcie.lastIndex;
    while (glebokosc > 0 && i < tekst.length) {
      const nastepneOtwarcie = tekst.indexOf("<div", i);
      const nastepneZamkniecie = tekst.indexOf("</div>", i);
      if (nastepneZamkniecie === -1) break;
      if (nastepneOtwarcie !== -1 && nastepneOtwarcie < nastepneZamkniecie) {
        glebokosc++;
        i = nastepneOtwarcie + 4;
      } else {
        glebokosc--;
        i = nastepneZamkniecie + 6;
      }
    }
    if (glebokosc !== 0) continue; // blok bez domknięcia — nie ruszamy
    bloki.push({ start, koniec: i, warianty: m[1].trim().split(/\s+/) });
    otwarcie.lastIndex = m.index + 1; // pozwól znaleźć bloki zagnieżdżone
  }
  if (bloki.length === 0) return tekst;

  // Bierzemy tylko bloki najwyższego poziomu (nie zawarte w innym bloku).
  const najwyzsze = bloki.filter(
    (b) => !bloki.some((inny) => inny !== b && inny.start < b.start && b.koniec <= inny.koniec),
  );
  const dostepne = [...new Set(najwyzsze.flatMap((b) => b.warianty))];
  const wybrany = dostepne.includes(preferowany) ? preferowany : najwyzsze[0].warianty[0];

  const doWyciecia = najwyzsze.filter((b) => !b.warianty.includes(wybrany));
  licznik.wariantyNarzedzi = doWyciecia.length;
  licznik.wariantWybrany = wybrany;
  licznik.wariantyDostepne = dostepne;

  let wynik = "";
  let kursor = 0;
  for (const b of doWyciecia.sort((a, b2) => a.start - b2.start)) {
    wynik += tekst.slice(kursor, b.start);
    wynik += `\n> [wyciąg] pominięto wariant „${b.warianty.join(" ")}" tej samej instrukcji\n`;
    kursor = b.koniec;
  }
  wynik += tekst.slice(kursor);
  // Znaczniki div wybranego wariantu też są zbędne.
  return wynik.replace(/<div class="ghd-tool [^"]+">\n?/g, "").replace(/^<\/div>\n?/gm, "");
}

/** Dzieli tekst na wiersze prozy i bloki kodu (```), żeby ich nie mylić. */
function podzielNaBloki(tekst) {
  const wiersze = tekst.split("\n");
  const czesci = [];
  let wKodzie = false;
  let bufor = [];
  let ogrodzenie = "";
  for (const w of wiersze) {
    const start = w.match(/^\s*(`{3,}|~{3,})(.*)$/);
    if (!wKodzie && start) {
      if (bufor.length) czesci.push({ kod: false, wiersze: bufor });
      bufor = [w];
      wKodzie = true;
      ogrodzenie = start[1];
    } else if (wKodzie && new RegExp(`^\\s*${ogrodzenie[0]}{${ogrodzenie.length},}\\s*$`).test(w)) {
      bufor.push(w);
      czesci.push({ kod: true, wiersze: bufor });
      bufor = [];
      wKodzie = false;
    } else {
      bufor.push(w);
    }
  }
  if (bufor.length) czesci.push({ kod: wKodzie, wiersze: bufor });
  return czesci;
}

/**
 * Zostawia JEDEN przykład kodu na sekcję (nagłówek `#`/`##`/`###`).
 * To dokładnie ta reguła, po którą sięga `<CodeGroup>` Anthropic: pierwszy
 * przykład niesie tezę, kolejne to ten sam przykład w innym języku.
 */
function jedenPrzykladNaSekcje(tekst, licznik) {
  const czesci = podzielNaBloki(tekst);
  const wynik = [];
  let kodWSekcji = 0;
  let pominieteWSekcji = 0;

  const domknijSekcje = () => {
    if (pominieteWSekcji > 0) {
      wynik.push(`> [wyciąg] pominięto ${pominieteWSekcji} dalszych przykładów kodu w tej sekcji`);
      licznik.przykladyKodu += pominieteWSekcji;
    }
    pominieteWSekcji = 0;
    kodWSekcji = 0;
  };

  for (const czesc of czesci) {
    if (czesc.kod) {
      if (kodWSekcji === 0) {
        wynik.push(...czesc.wiersze);
        kodWSekcji++;
      } else {
        pominieteWSekcji++;
      }
      continue;
    }
    for (const w of czesc.wiersze) {
      if (/^#{1,4} /.test(w)) domknijSekcje();
      wynik.push(w);
    }
  }
  domknijSekcje();
  return wynik.join("\n");
}

/** Usuwa znaczniki `<CodeGroup>` — po odchudzeniu grupa ma jeden przykład. */
function bezZnacznikowGrup(tekst) {
  return tekst.replace(/^\s*<\/?CodeGroup>\s*$/gm, "");
}

/** Zwija ciągi pustych linii do jednej. */
function bezPustychLinii(tekst) {
  return tekst.replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

function odchudz(zrodlo, sciezka, preferowaneNarzedzie) {
  const licznik = {
    ikony: 0,
    zrzuty: 0,
    przykladyKodu: 0,
    odsylacze: 0,
    wariantyNarzedzi: 0,
    wariantWybrany: null,
    wariantyDostepne: [],
  };

  let t = zrodlo;
  t = bezKomentarzy(t);
  t = jedenWariantNarzedzia(t, preferowaneNarzedzie, licznik);
  t = bezIkon(t, licznik);
  t = bezZrzutow(t, licznik);
  t = bezZnacznikowGrup(t);
  t = bezSciezekOdsylaczy(t, licznik);
  t = jedenPrzykladNaSekcje(t, licznik);
  t = bezPustychLinii(t);

  const naglowek =
    `<!-- WYCIĄG: ${sciezka} (tools/wyciag-zrodla.mjs) — proza i tabele nietknięte;\n` +
    "     cytując w scenariuszu, sprawdzaj brzmienie w ORYGINALE. -->\n";

  const cieta = [];
  if (licznik.ikony) cieta.push(`ikony SVG: ${licznik.ikony}`);
  if (licznik.zrzuty) cieta.push(`odsyłacze do zrzutów: ${licznik.zrzuty}`);
  if (licznik.wariantyNarzedzi)
    cieta.push(
      `warianty ghd-tool: ${licznik.wariantyNarzedzi} (zostawiono „${licznik.wariantWybrany}"` +
        ` z ${licznik.wariantyDostepne.join(", ")})`,
    );
  if (licznik.przykladyKodu) cieta.push(`powtórzone przykłady kodu: ${licznik.przykladyKodu}`);
  if (licznik.odsylacze) cieta.push(`ścieżki wewnętrznych odsyłaczy: ${licznik.odsylacze}`);

  const stopka = cieta.length
    ? `\n<!-- WYCIĘTO — ${cieta.join("; ")} -->\n`
    : "\n<!-- WYCIĘTO — nic; plik był już czysty -->\n";

  return { tekst: naglowek + t + stopka, licznik };
}

const opcje = parsujArgumenty(process.argv.slice(2));

if (opcje.pliki.length === 0) {
  console.error("wyciag-zrodla: podaj co najmniej jeden plik .md");
  console.error("  node tools/wyciag-zrodla.mjs [--do <katalog>] [--narzedzie webui|cli|…] <plik.md …>");
  process.exit(2);
}

if (opcje.katalog && !existsSync(opcje.katalog)) mkdirSync(opcje.katalog, { recursive: true });

let bajtowPrzed = 0;
let bajtowPo = 0;

for (const sciezka of opcje.pliki) {
  if (!existsSync(sciezka)) {
    console.error(`wyciag-zrodla: brak pliku ${sciezka}`);
    console.error("  Dokumentacja D7 leży poza gitem — odtwórz ją: node tools/pobierz-dokumentacje-d7.mjs");
    process.exit(2);
  }
  const zrodlo = readFileSync(sciezka, "utf8");
  const { tekst } = odchudz(zrodlo, sciezka, opcje.narzedzie);

  bajtowPrzed += Buffer.byteLength(zrodlo);
  bajtowPo += Buffer.byteLength(tekst);

  if (opcje.katalog) {
    const cel = join(opcje.katalog, basename(sciezka));
    writeFileSync(cel, tekst);
    const ubylo = 100 - (Buffer.byteLength(tekst) / Buffer.byteLength(zrodlo)) * 100;
    console.error(`${cel}  −${ubylo.toFixed(0)}%`);
  } else {
    process.stdout.write(tekst);
  }
}

const razem = 100 - (bajtowPo / bajtowPrzed) * 100;
console.error(
  `wyciag-zrodla: ${opcje.pliki.length} plik(ów), ` +
    `${(bajtowPrzed / 1024).toFixed(1)} kB → ${(bajtowPo / 1024).toFixed(1)} kB (−${razem.toFixed(0)}%)`,
);
