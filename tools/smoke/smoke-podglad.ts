import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { createReadStream, existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import assert from "node:assert/strict";

/**
 * Smoke PODGLĄDU STATYCZNEGO — dowód, że `out/` nadaje się do wrzucenia
 * do PUBLICZNEGO repo na GitHub Pages.
 *
 * Ten smoke buduje SAM (w przeciwieństwie do smoke'ów D4–D6, które
 * korzystają z gotowego builda), bo sprawdza właśnie to, co dzieje się
 * W TRAKCIE builda: co wchodzi do plików, a co nie.
 *
 * NAJWAŻNIEJSZA ASERCJA jest ta o szkicu. Build celowo dostaje
 * KREATOR_TOKEN w środowisku — czyli sytuację, w której właściciel
 * publikuje podgląd ze swojej maszyny, mając token w `.env`. Gdyby
 * brama kreatora sprawdzała ciastko zamiast trybu, „zalogowałaby"
 * właściciela na czas builda i nieopublikowany kurs wylądowałby
 * w publicznych plikach. Tego nie widać w żadnym teście jednostkowym —
 * widać dopiero w `out/`.
 *
 * Pozostałe asercje: brak kreatora i AJAX-a, obecność opublikowanych
 * kursów Z BAZY, poprawny korzeń (`redirect()` w eksporcie NIE psuje
 * builda, tylko cicho produkuje stronę błędu), działający `basePath`
 * przy zasobach z bazy oraz to, że pliki naprawdę dają się serwować.
 *
 * Wymaga: skonfigurowanej bazy (jak testy modułów).
 * Użycie: node --env-file-if-exists=.env tools/smoke/smoke-podglad.ts
 */

process.env.KREATOR_TOKEN ??= "smoke-podglad-token-testowy-nie-sekret";
const TOKEN = process.env.KREATOR_TOKEN;
const BAZOWA = "/podglad-smoke";
const PORT = 3005;

const { obsluzAkcje, zamknijDb1 } = await import("../../modules/m1-sklep/index.ts");

const OPUBLIKOWANY = {
  slug: "smoke-podglad-widoczny",
  title: "Kurs widoczny w podglądzie",
  type: "kurs" as const,
  short_desc: "Opublikowany — MA się znaleźć w statycznym podglądzie.",
  price_grosze: 19900,
};
const SZKIC = {
  slug: "smoke-podglad-szkic",
  title: "Szkic ktorego nikt nie ma prawa zobaczyc",
  type: "kurs" as const,
  short_desc: "Nieopublikowany — NIE MA prawa znaleźć się w publicznych plikach.",
  price_grosze: 29900,
};

/** Wszystkie ścieżki plików pod katalogiem (do przeszukania całego out/). */
function wszystkiePliki(katalog: string, wynik: string[] = []): string[] {
  for (const nazwa of readdirSync(katalog)) {
    const pelna = join(katalog, nazwa);
    if (statSync(pelna).isDirectory()) wszystkiePliki(pelna, wynik);
    else wynik.push(pelna);
  }
  return wynik;
}

const TYPY: Record<string, string> = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".svg": "image/svg+xml", ".txt": "text/plain", ".json": "application/json",
  ".woff2": "font/woff2",
};

let idOpublikowany: string | undefined;
let idSzkic: string | undefined;
let kodWyjscia = 0;
let serwer: ReturnType<typeof createServer> | undefined;

try {
  // --- seed: jeden kurs opublikowany, jeden zostawiony jako szkic ---
  const a = await obsluzAkcje({ akcja: "zapisz", token: TOKEN, kurs: OPUBLIKOWANY });
  assert.equal(a.ok, true, `seed opublikowanego nie przeszedł: ${JSON.stringify(a)}`);
  idOpublikowany = (a as { id: string }).id;
  const pub = await obsluzAkcje({ akcja: "publikuj", token: TOKEN, id: idOpublikowany });
  assert.equal(pub.ok, true, `publikacja nie przeszła: ${JSON.stringify(pub)}`);

  const b = await obsluzAkcje({ akcja: "zapisz", token: TOKEN, kurs: SZKIC });
  assert.equal(b.ok, true, `seed szkicu nie przeszedł: ${JSON.stringify(b)}`);
  idSzkic = (b as { id: string }).id;
  // szkicu NIE publikujemy — to jest cały sens tego smoke'a

  await zamknijDb1();

  // --- build podglądu, celowo Z TOKENEM w środowisku ---
  // TĄ SAMĄ komendą, którą woła człowiek i deploy. Wcześniej stało tu
  // `npx next build`, czyli sam build bez kroków po nim — dokładnie ta
  // pomyłka wypuściła w 0.24.0 podgląd z czterema martwymi miniaturami
  // OG (skrypt nadający rozszerzenie .png wisi na komendzie, nie na
  // buildzie). Odkąd po buildzie wstrzykiwana jest jeszcze polityka CSP,
  // ten smoke sprawdzałby katalog `out/`, którego nikt nigdy nie wyda.
  const build = spawnSync("npm", ["run", "build:podglad"], {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, PODGLAD_STATYCZNY: "1", PAGES_BASE_PATH: BAZOWA },
  });
  if (build.status !== 0) {
    process.stderr.write(build.stdout?.toString() ?? "");
    process.stderr.write(build.stderr?.toString() ?? "");
    assert.fail(`build podglądu padł (kod ${build.status})`);
  }

  assert.ok(existsSync("out"), "build podglądu nie wyprodukował katalogu out/");
  const pliki = wszystkiePliki("out");
  const tresc = new Map(pliki.map((p) => [p, readFileSync(p, "utf8").toString()] as const));

  // --- 1. SZKIC nie wyciekł: ani jako strona, ani jako wzmianka ---
  assert.ok(
    !existsSync(join("out", "szkolenia", `${SZKIC.slug}.html`)),
    "SZKIC dostał własną stronę w publicznym podglądzie"
  );
  for (const [plik, zawartosc] of tresc) {
    assert.ok(
      !zawartosc.includes(SZKIC.title) && !zawartosc.includes(SZKIC.slug),
      `SZKIC wyciekł do publicznego pliku ${plik} — brama kreatora nie odcięła się w trybie podglądu`
    );
  }

  // --- 2. kreator i AJAX nie istnieją ---
  for (const plik of pliki) {
    assert.ok(!plik.includes("kreator"), `kreator w publicznym podglądzie: ${plik}`);
    assert.ok(!/\bout\/api\b/.test(plik), `endpoint AJAX w publicznym podglądzie: ${plik}`);
  }
  for (const [plik, zawartosc] of tresc) {
    if (!plik.endsWith(".html")) continue;
    assert.ok(
      !zawartosc.includes("/szkolenia/kreator"),
      `odnośnik do kreatora w publicznym HTML-u: ${plik}`
    );
  }

  // --- 3. opublikowany kurs JEST, z bazy ---
  const katalog = readFileSync(join("out", "szkolenia.html"), "utf8");
  assert.ok(katalog.includes(OPUBLIKOWANY.title), "brak opublikowanego kursu w katalogu podglądu");
  assert.ok(
    existsSync(join("out", "szkolenia", `${OPUBLIKOWANY.slug}.html`)),
    "brak strony opublikowanego kursu w podglądzie"
  );

  // --- 4. korzeń nie jest stroną błędu (redirect() w eksporcie) ---
  const korzen = readFileSync(join("out", "index.html"), "utf8");
  assert.ok(
    !korzen.includes("__next_error__"),
    "korzeń podglądu to strona błędu — `redirect()` nie działa w eksporcie i NIE psuje builda"
  );
  assert.ok(
    korzen.includes(`${BAZOWA}/szkolenia`),
    "korzeń podglądu nie prowadzi do katalogu"
  );
  assert.ok(existsSync(join("out", "404.html")), "brak 404.html — Pages nie miałoby czym odpowiedzieć");

  // --- 5. basePath dotarł też do zasobów Z BAZY (okładki) ---
  const okladki = [...katalog.matchAll(/src="([^"]*okladki[^"]*)"/g)].map((m) => m[1]);
  assert.ok(okladki.length > 0, "katalog nie renderuje żadnej okładki — nie ma czego sprawdzić");
  for (const adres of okladki) {
    assert.ok(
      adres.startsWith(`${BAZOWA}/`),
      `okładka bez basePath: ${adres} — Next nie poprawia zwykłego src, robi to lib/podglad.ts`
    );
  }

  // --- 6. pliki naprawdę dają się serwować spod basePath ---
  serwer = createServer((req, res) => {
    const adres = decodeURIComponent((req.url ?? "/").split("?")[0]);
    const bez = adres.startsWith(BAZOWA) ? adres.slice(BAZOWA.length) : adres;
    for (const kandydat of [join("out", bez), join("out", `${bez}.html`), join("out", bez, "index.html")]) {
      if (existsSync(kandydat) && statSync(kandydat).isFile()) {
        res.writeHead(200, { "content-type": TYPY[extname(kandydat)] ?? "application/octet-stream" });
        createReadStream(kandydat).pipe(res);
        return;
      }
    }
    res.writeHead(404).end("nie ma");
  });
  await new Promise<void>((gotowe) => serwer!.listen(PORT, gotowe));

  const strona = await fetch(`http://localhost:${PORT}${BAZOWA}/szkolenia`);
  assert.equal(strona.status, 200, "katalog nie serwuje się z plików");
  assert.ok((await strona.text()).includes(OPUBLIKOWANY.title), "serwowany katalog bez kursu z bazy");

  const okladka = await fetch(`http://localhost:${PORT}${okladki[0]}`);
  assert.equal(okladka.status, 200, `okładka ${okladki[0]} nie istnieje pod swoim adresem`);

  const panel = await fetch(`http://localhost:${PORT}${BAZOWA}/szkolenia/kreator`);
  assert.equal(panel.status, 404, "kreator odpowiada w publicznym podglądzie");

  // --- 7. stan „nie indeksuj" jest spójny w TRZECH miejscach ---------
  // Metatag, robots.txt i sitemapa muszą mówić to samo. Rozjazd między
  // nimi nie daje żadnego objawu na stronie, a wystarczy, żeby robocza
  // treść trafiła do wyników wyszukiwania. Pełną powierzchnię SEO
  // (stan WŁĄCZONY) sprawdza osobno smoke-seo.
  assert.ok(
    /<meta name="robots" content="[^"]*noindex/.test(katalog),
    "katalog podglądu bez metatagu noindex — treść jest jeszcze robocza"
  );
  const robots = readFileSync(join("out", "robots.txt"), "utf8");
  assert.ok(/Disallow: \//.test(robots), "robots.txt podglądu nie blokuje robotów");
  assert.ok(
    !robots.includes("Sitemap:"),
    "robots.txt podglądu wskazuje sitemapę, na którą roboty nie mają wstępu — sygnał sprzeczny"
  );
  const sitemap = readFileSync(join("out", "sitemap.xml"), "utf8");
  assert.ok(!sitemap.includes("<loc>"), "sitemapa podglądu nie jest pusta mimo noindex");

  // --- 8. fonty jadą z preloadem i pliki NAPRAWDĘ istnieją -----------
  // Bez preloadu font jechał łańcuchem HTML → CSS → font i jego podmiana
  // przesuwała układ (PSI: CLS 0,14 na desktopie) oraz opóźniała LCP na
  // mobile. Lekcja od miniatur OG (0.24.0) obowiązuje i tu: sprawdzamy
  // ARTEFAKT, nie proces — znacznik w zbudowanym HTML-u ORAZ plik pod
  // dokładnie tym adresem, który znacznik podaje.
  for (const [plik, zawartosc] of tresc) {
    if (!plik.endsWith(".html") || plik.endsWith("404.html")) continue;
    const preloady = [...zawartosc.matchAll(/<link[^>]*rel="preload"[^>]*as="font"[^>]*>/g)].map(
      (m) => m[0]
    );
    // Duplikaty tego samego adresu są nieszkodliwe (przeglądarka scala
    // po URL-u; strona błędu renderuje shell + treść, stąd bywają 4
    // znaczniki) — niezmiennik to DWA RÓŻNE pliki: sans + mono.
    const rozne = new Set(preloady.map((z) => z.match(/href="([^"]+)"/)?.[1]));
    assert.equal(
      rozne.size,
      2,
      `${plik}: oczekuję preloadu DWÓCH RÓŻNYCH fontów (sans + mono), są: ${[...rozne].join(", ") || "żadne"}`
    );
    for (const znacznik of preloady) {
      assert.ok(
        znacznik.includes('crossorigin="anonymous"') || znacznik.includes('crossOrigin="anonymous"'),
        `${plik}: preload fontu bez crossorigin — przeglądarka pobrałaby plik dwa razy`
      );
      const href = znacznik.match(/href="([^"]+)"/)?.[1];
      assert.ok(href, `${plik}: preload fontu bez href`);
      assert.ok(
        href!.startsWith(`${BAZOWA}/`),
        `${plik}: preload fontu bez basePath: ${href}`
      );
      const naDysku = join("out", href!.slice(BAZOWA.length));
      assert.ok(
        existsSync(naDysku),
        `${plik}: preload wskazuje ${href}, a pliku ${naDysku} nie ma — martwy preload nie przyspiesza niczego`
      );
    }
    assert.ok(
      zawartosc.includes("@font-face"),
      `${plik}: brak @font-face w HTML-u — preload bez deklaracji fontu nic nie daje`
    );
  }

  console.log(
    `smoke-podglad: OK — ${pliki.length} plików, szkic nie wyciekł, kreator i AJAX nieobecni, basePath i stan noindex spójne, fonty z preloadem i plikami.`
  );
} catch (blad) {
  console.error("smoke-podglad: PORAŻKA —", blad instanceof Error ? blad.message : blad);
  kodWyjscia = 1;
} finally {
  serwer?.close();
  for (const id of [idOpublikowany, idSzkic]) {
    if (id) await obsluzAkcje({ akcja: "usun", token: TOKEN, id }).catch(() => {});
  }
  await zamknijDb1().catch(() => {});
}
process.exit(kodWyjscia);
