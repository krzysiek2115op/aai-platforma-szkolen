import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

/**
 * Smoke SEO — sprawdza ZBUDOWANE artefakty, nie deklaracje w kodzie.
 *
 * Buduje podgląd z `SEO_INDEKSOWANIE=1`, czyli w jedynym stanie, w którym
 * widać pełną powierzchnię SEO (domyślnie wszystko jest pod `noindex`,
 * bo treść stron sprzedażowych jest jeszcze robocza — patrz lib/seo.ts).
 * Spójność stanu WYŁĄCZONEGO sprawdza smoke-podglad.
 *
 * NAJWAŻNIEJSZA ASERCJA: dane strukturalne nie mogą twierdzić niczego,
 * czego nie ma na stronie. Cena, tytuł i program w JSON-LD są tu
 * porównywane Z BAZĄ — rozjazd między tym, co widzi człowiek, a tym, co
 * dostaje Google, jest powodem odrzucenia wyników z rozszerzeniami,
 * a u nas dodatkowo łamie zasadę „zero zmyślania".
 *
 * Wymaga: skonfigurowanej bazy. Nadpisuje out/.
 * Użycie: node --env-file-if-exists=.env tools/smoke/smoke-seo.ts
 */

const BAZOWA = "/seo-smoke";
const HOST = "https://matthewplugins.github.io";
const ADRES = `${HOST}${BAZOWA}`;

const { listaKursow, szczegolyKursu, zamknijDb1 } = await import(
  "../../modules/m1-sklep/index.ts"
);

/** Wszystkie bloki JSON-LD ze strony, sparsowane. */
function daneStrukturalne(html: string): Record<string, unknown>[] {
  const bloki = [...html.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g
  )];
  return bloki.map((b, i) => {
    try {
      return JSON.parse(b[1]) as Record<string, unknown>;
    } catch (blad) {
      assert.fail(`blok JSON-LD nr ${i + 1} nie jest poprawnym JSON-em: ${blad}`);
    }
  });
}

const typy = (html: string) => daneStrukturalne(html).map((d) => d["@type"]);

let kodWyjscia = 0;

try {
  const kursy = await listaKursow();
  assert.ok(kursy.length > 0, "baza nie ma opublikowanych kursów — nie ma czego sprawdzać");
  const pierwszy = await szczegolyKursu(kursy[0].slug);
  assert.ok(pierwszy, "nie udało się wczytać szczegółów pierwszego kursu");
  await zamknijDb1();

  const build = spawnSync("npm", ["run", "build:podglad"], {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, PAGES_BASE_PATH: BAZOWA, SEO_INDEKSOWANIE: "1" },
  });
  if (build.status !== 0) {
    process.stderr.write(build.stdout?.toString() ?? "");
    process.stderr.write(build.stderr?.toString() ?? "");
    assert.fail(`build SEO padł (kod ${build.status})`);
  }

  // --- 1. robots.txt wpuszcza roboty, ale nie do panelu ---------------
  const robots = readFileSync(join("out", "robots.txt"), "utf8");
  assert.ok(/Allow: \//.test(robots), "robots.txt nie wpuszcza robotów mimo włączonego indeksowania");
  assert.ok(robots.includes("/szkolenia/kreator"), "robots.txt nie odcina panelu kreatora");
  assert.ok(robots.includes("/api/"), "robots.txt nie odcina kanału AJAX");
  assert.ok(
    robots.includes(`${ADRES}/sitemap.xml`),
    "robots.txt nie wskazuje sitemapy pod właściwym adresem (z podkatalogiem Pages)"
  );

  // --- 2. sitemapa zna dokładnie te kursy, co baza --------------------
  const sitemap = readFileSync(join("out", "sitemap.xml"), "utf8");
  assert.ok(sitemap.includes(`${ADRES}/szkolenia`), "sitemapa bez katalogu");
  for (const kurs of kursy) {
    assert.ok(
      sitemap.includes(`${ADRES}/szkolenia/${kurs.slug}`),
      `sitemapa nie zna opublikowanego kursu ${kurs.slug}`
    );
  }
  assert.ok(
    !sitemap.includes("lastmod"),
    "sitemapa podaje lastModified — nie mamy prawdziwej daty zmiany treści, więc byłaby zmyślona"
  );

  // --- 3. każda strona: jeden h1, własny kanonik, komplet OG ----------
  const strony: [string, string][] = [
    [join("out", "szkolenia.html"), `${ADRES}/szkolenia`],
    ...kursy.map(
      (k) => [join("out", "szkolenia", `${k.slug}.html`), `${ADRES}/szkolenia/${k.slug}`] as [string, string]
    ),
  ];

  for (const [plik, wlasnyAdres] of strony) {
    const html = readFileSync(plik, "utf8");

    const h1 = (html.match(/<h1[\s>]/g) ?? []).length;
    assert.equal(h1, 1, `${plik}: ${h1} nagłówków h1 (ma być dokładnie jeden)`);

    const kanonik = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    assert.equal(kanonik, wlasnyAdres, `${plik}: kanonik wskazuje gdzie indziej niż sama strona`);

    assert.ok(
      !/<meta name="robots" content="[^"]*noindex/.test(html),
      `${plik}: noindex mimo włączonego indeksowania — metatag rozjechał się z robots.txt`
    );

    for (const wlasciwosc of ["og:title", "og:description", "og:image", "og:url"]) {
      assert.ok(
        html.includes(`property="${wlasciwosc}"`),
        `${plik}: brak ${wlasciwosc}`
      );
    }

    // Obraz OG musi ISTNIEĆ i mieć rozszerzenie — bez niego GitHub Pages
    // poda go jako application/octet-stream i scrapery go odrzucą.
    const obraz = html.match(/property="og:image" content="([^"?]+)/)?.[1];
    assert.ok(obraz?.endsWith(".png"), `${plik}: og:image bez rozszerzenia .png (${obraz})`);
    const naDysku = join("out", obraz!.slice(ADRES.length));
    assert.ok(existsSync(naDysku), `${plik}: og:image wskazuje na nieistniejący plik ${naDysku}`);
  }

  // --- 4. dane strukturalne katalogu ----------------------------------
  const katalog = readFileSync(join("out", "szkolenia.html"), "utf8");
  const typyKatalogu = typy(katalog);
  for (const oczekiwany of ["Organization", "ItemList", "BreadcrumbList"]) {
    assert.ok(typyKatalogu.includes(oczekiwany), `katalog bez danych ${oczekiwany} (są: ${typyKatalogu})`);
  }
  const lista = daneStrukturalne(katalog).find((d) => d["@type"] === "ItemList")!;
  assert.equal(
    (lista.itemListElement as unknown[]).length,
    kursy.length,
    "ItemList katalogu ma inną liczbę kursów niż baza"
  );

  // --- 5. dane strukturalne kursu ZGODNE Z BAZĄ ------------------------
  const stronaKursu = readFileSync(join("out", "szkolenia", `${pierwszy.slug}.html`), "utf8");
  const bloki = daneStrukturalne(stronaKursu);
  const kursLd = bloki.find((d) => d["@type"] === "Course");
  assert.ok(kursLd, `strona kursu bez danych Course (są: ${typy(stronaKursu)})`);
  assert.equal(kursLd.name, pierwszy.title, "Course.name różni się od tytułu w bazie");

  const oferta = kursLd.offers as Record<string, unknown>;
  assert.equal(
    oferta.price,
    (pierwszy.price_grosze / 100).toFixed(2),
    "cena w danych strukturalnych różni się od ceny w bazie"
  );
  assert.equal(oferta.priceCurrency, "PLN", "waluta oferty inna niż PLN");
  assert.equal(
    oferta.availability,
    "https://schema.org/PreOrder",
    "dostępność inna niż PreOrder — zakup jest dziś placeholderem, InStock byłby nieprawdą"
  );

  if (pierwszy.modules.length > 0) {
    assert.equal(
      (kursLd.syllabusSections as unknown[]).length,
      pierwszy.modules.length,
      "program w danych strukturalnych ma inną liczbę modułów niż baza"
    );
  }

  assert.ok(typy(stronaKursu).includes("BreadcrumbList"), "strona kursu bez okruszków");

  console.log(
    `smoke-seo: OK — robots/sitemapa spójne, ${strony.length} stron z kanonikiem i OG, dane strukturalne zgodne z bazą.`
  );
} catch (blad) {
  console.error("smoke-seo: PORAŻKA —", blad instanceof Error ? blad.message : blad);
  kodWyjscia = 1;
} finally {
  await zamknijDb1().catch(() => {});
}
process.exit(kodWyjscia);
