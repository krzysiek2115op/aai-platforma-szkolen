/**
 * Pobiera oryginalną dokumentację techniczną dla Działu 7 (WYTYCZNE §7 i N2).
 *
 * PO CO TO ISTNIEJE. Treść obu kursów ma powstawać WYŁĄCZNIE z oryginalnej
 * dokumentacji wydawców, nie z pamięci modelu. Same pliki dokumentacji są
 * jednak zbyt ciężkie dla repozytorium (55 MB, ~2200 plików — a git trzyma
 * każdą wersję na zawsze), więc decyzją właściciela z 2026-08-18 leżą
 * wyłącznie lokalnie, a w repo jedzie TEN skrypt. Dzięki temu wytyczna jest
 * spełniona co do sensu: każdy może odtworzyć dokładnie ten sam zestaw
 * źródeł jedną komendą i sprawdzić, czy lekcja mówi to, co dokumentacja.
 *
 * JAK DZIAŁA. Idempotentnie — pliki już pobrane pomija, więc przerwane
 * pobieranie wznawia się bez strat i bez ponownego obciążania serwerów.
 *
 * TEMPO JEST CELOWO WOLNE. Pierwsze podejście szło 6 wątkami bez przerw
 * i docs.github.com odrzuciło połowę żądań (HTTP 429) — zostawiając
 * dziurawą dokumentację, co jest gorsze niż brak dokumentacji, bo nie
 * widać, czego brakuje. Tutaj: 2 wątki, przerwa między żądaniami,
 * ponawianie z narastającym odczekaniem i honorowaniem `Retry-After`.
 *
 * ZAKRES GITHUBA JEST PRZYCIĘTY. Pełne docs.github.com to 3193 artykuły,
 * z czego większość dotyczy spraw spoza kursu (Copilot, REST/GraphQL API,
 * GitHub Advanced Security, rozliczenia, regulaminy). Kurs „Jak poprawnie
 * używać GitHuba" czerpie z sekcji wymienionych w SEKCJE_GITHUBA — patrz
 * docs/dokumentacja-techniczna/d7/ZRODLA.md, gdzie stoi, co odpadło i dlaczego.
 *
 * Użycie: node tools/pobierz-dokumentacje-d7.mjs
 */
import { mkdir, writeFile, access } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const KORZEN = join(dirname(fileURLToPath(import.meta.url)), "..");
const CEL = join(KORZEN, "docs", "dokumentacja-techniczna", "d7");

/**
 * MANIFEST — jedyne źródło prawdy o tym, co ten skrypt kładzie na dysku.
 *
 * Czyta go `straznik-wagi-dokumentacji`, żeby wiedzieć, które katalogi mają
 * zostać poza gitem. Dzięki temu strażnik nie trzyma własnej kopii listy,
 * która milczkiem rozjechałaby się ze skryptem po dopisaniu nowego źródła.
 * Skrypt jest z tego powodu bezpieczny do zaimportowania: pobieranie rusza
 * dopiero po sprawdzeniu, czy plik uruchomiono wprost (na dole).
 */
export const KATALOG_DZIALU = "docs/dokumentacja-techniczna/d7";
export const KATALOGI_MASOWE = ["claude-platform", "claude-code", "github"];
const [CLAUDE_PLATFORM, CLAUDE_CODE, GITHUB] = KATALOGI_MASOWE;

/*
 * Sekcje docs.github.com w zakresie kursu 2. Wzorce są dopasowywane do
 * ścieżki artykułu; `(/|$)` chroni przed przypadkowym złapaniem sekcji
 * o dłuższej nazwie (np. `/en/pages` nie ma łapać `/en/pages-legacy`).
 */
const SEKCJE_GITHUBA = [
  /^\/en\/get-started(\/|$)/,
  /^\/en\/repositories(\/|$)/,
  /^\/en\/pull-requests(\/|$)/,
  /^\/en\/issues(\/|$)/,
  /^\/en\/authentication(\/|$)/,
  /^\/en\/organizations(\/|$)/,
  /^\/en\/account-and-profile(\/|$)/,
  /^\/en\/github-cli(\/|$)/,
  /^\/en\/desktop(\/|$)/,
  /^\/en\/communities(\/|$)/,
  /^\/en\/search-github(\/|$)/,
  /^\/en\/discussions(\/|$)/,
  /^\/en\/pages(\/|$)/,
  /^\/en\/packages(\/|$)/,
  /^\/en\/actions(\/|$)/,
  /^\/en\/codespaces(\/|$)/,
  /^\/en\/webhooks(\/|$)/,
  // z bezpieczeństwa tylko część praktyczna dla zwykłego użytkownika —
  // reszta (how-tos/reference GHAS) wymaga licencji Advanced Security
  /^\/en\/code-security(\/getting-started|\/concepts|\/tutorials|$)/,
  /^\/en\/code-security\/how-tos(\/secure-your-secrets|\/secure-your-supply-chain|\/manage-security-alerts|$)/,
];

const spij = (ms) => new Promise((r) => setTimeout(r, ms));
const istnieje = (p) => access(p).then(() => true, () => false);

async function pobierz(url, proby = 6) {
  for (let i = 0; i < proby; i++) {
    try {
      const r = await fetch(url, { redirect: "follow" });
      if (r.status === 429 || r.status >= 500) {
        const retry = Number(r.headers.get("retry-after")) || 0;
        await spij(retry ? retry * 1000 : 4000 * (i + 1));
        continue;
      }
      if (!r.ok) return null; // 404 itp. — strona zniknęła z indeksu
      const t = await r.text();
      return t.trim() ? t : null;
    } catch {
      await spij(4000 * (i + 1));
    }
  }
  return null;
}

/** Uruchamia zadania parami, z przerwą — patrz nota o tempie na górze pliku. */
async function pula(zadania, etykieta) {
  let i = 0, ok = 0, pominiete = 0, brak = 0;
  const robotnik = async () => {
    while (i < zadania.length) {
      const wynik = await zadania[i++]();
      if (wynik === "ok") ok++;
      else if (wynik === "jest") pominiete++;
      else brak++;
      const zrobione = ok + pominiete + brak;
      if (zrobione % 100 === 0) {
        console.log(`  ${etykieta}: ${zrobione}/${zadania.length}`);
      }
      // przerwa należy się serwerowi, nie dyskowi — plik już pobrany
      // nie kosztował żądania, więc wznowienie nie czeka na nic
      if (wynik !== "jest") await spij(400);
    }
  };
  await Promise.all([robotnik(), robotnik()]);
  console.log(`${etykieta}: pobrano ${ok}, było już ${pominiete}, nie udało się ${brak}`);
  return brak;
}

async function zapisz(plik, tresc) {
  await mkdir(dirname(plik), { recursive: true });
  await writeFile(plik, tresc);
}

/** Wydawcy publikują indeks llms.txt z listą stron w markdownie. */
async function zIndeksuLlms(indeksUrl, prefiks, podkatalog) {
  const indeks = await pobierz(indeksUrl);
  if (!indeks) throw new Error(`nie udało się pobrać indeksu ${indeksUrl}`);
  const wzorzec = new RegExp(prefiks.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[^\\s)]+\\.md", "g");
  const adresy = [...new Set(indeks.match(wzorzec) ?? [])];
  console.log(`${podkatalog}: ${adresy.length} stron w indeksie`);
  return adresy.map((u) => async () => {
    const plik = join(CEL, podkatalog, u.replace(prefiks, ""));
    if (await istnieje(plik)) return "jest";
    const t = await pobierz(u);
    if (!t) return "brak";
    await zapisz(plik, t);
    return "ok";
  });
}

/*
 * Pobieranie rusza WYŁĄCZNIE przy uruchomieniu wprost. Import (robi to
 * straznik-wagi-dokumentacji, żeby odczytać manifest) nie może ściągać
 * 55 MB z sieci ani kończyć procesu kodem błędu.
 */
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let bledy = 0;

  bledy += await pula(
    await zIndeksuLlms("https://docs.claude.com/llms.txt", "https://platform.claude.com/docs/en/", CLAUDE_PLATFORM),
    CLAUDE_PLATFORM,
  );

  bledy += await pula(
    await zIndeksuLlms("https://code.claude.com/docs/llms.txt", "https://code.claude.com/docs/en/", CLAUDE_CODE),
    CLAUDE_CODE,
  );

  // GitHub: lista artykułów z Page List API, potem treść markdownem z Article API
  const lista = await pobierz("https://docs.github.com/api/pagelist/en/free-pro-team@latest");
  if (!lista) throw new Error("nie udało się pobrać listy artykułów GitHuba");
  const wszystkie = lista.split("\n").map((s) => s.trim()).filter((s) => s.startsWith("/en/"));
  const wZakresie = wszystkie.filter((p) => SEKCJE_GITHUBA.some((re) => re.test(p)));
  console.log(`github: ${wZakresie.length} artykułów w zakresie kursu (z ${wszystkie.length} wszystkich)`);

  bledy += await pula(
    wZakresie.map((p) => async () => {
      const plik = join(CEL, GITHUB, p.replace(/^\/en\//, "") + ".md");
      if (await istnieje(plik)) return "jest";
      const t = await pobierz("https://docs.github.com/api/article/body?pathname=" + encodeURIComponent(p));
      if (!t) return "brak";
      await zapisz(plik, t);
      return "ok";
    }),
    GITHUB,
  );

  if (bledy > 0) {
    console.error(`\nNIEKOMPLETNE: ${bledy} stron się nie pobrało. Uruchom ponownie —`);
    console.error("skrypt pomija to, co już jest, więc dobierze tylko braki.");
    process.exit(1);
  }
  console.log("\nGotowe — komplet dokumentacji dla Działu 7.");
}
