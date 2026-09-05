/**
 * Smoke SEO wtyczek (krok „SEO od nowa") — mapa strony, `robots`, kanoniki.
 *
 * PO CO OSOBNO. Bo to jedyna bramka, która musi zmierzyć witrynę TAK, JAK
 * ZOBACZY JĄ WYSZUKIWARKA — czyli przy WŁĄCZONEJ widoczności. Rdzeń
 * WordPressa bramkuje całą sitemapę opcją `blog_public`, a nasze środowisko
 * ma ją wyłączoną (i słusznie: to instalacja robocza). Pomiar przy
 * `blog_public = 0` odpowiadałby więc na inne pytanie niż zadane — i przez
 * to przepuściłby komplet usterek, które ten krok naprawia.
 *
 * DLATEGO BRAMKA SAMA STAWIA SCENĘ i przywraca ZASTANĄ wartość, a nie
 * „domyślną". Lekcja z `smoke-wp-motyw`, który otwierał sprzedaż na czas
 * pomiaru i w `finally` robił `delete_option()` — czyli zamykał sklep za
 * sobą. „Przywróć stan" to co innego niż „skasuj ustawienie".
 *
 * ZASADA: porównujemy Z BAZĄ. Lista kursów w mapie ma się zgadzać z tym, co
 * wydaje `wp aai-sklep sprawdz --json`, a nie z adresami wpisanymi w test.
 *
 * WYMAGA lokalnego środowiska: `cd wordpress/srodowisko && ./postaw.sh`.
 * Nie wchodzi do CI — tam nie ma podmana.
 *
 * Użycie: node tools/smoke/smoke-wp-seo.mjs
 */
import { execFileSync } from "node:child_process";

const ADRES = process.env.WP_ADRES ?? "http://127.0.0.1:8892";
const STACK = process.env.STACK_NAZWA ?? "aai_wp";
const KONTENER = `${STACK}_cli`;

const bledy = [];
let sprawdzen = 0;
const sprawdz = (warunek, opis) => {
  sprawdzen += 1;
  if (!warunek) bledy.push(opis);
};

function wp(...argumenty) {
  return execFileSync(
    "podman",
    ["exec", KONTENER, "wp", "--path=/var/www/html", ...argumenty],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
  );
}

/** Adresy `<loc>` z dokumentu XML — bez zakładania, że są w osobnych liniach. */
const adresy = (xml) =>
  [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());

const meta = (html, nazwa) => {
  const dopasowanie = html.match(
    new RegExp(`<meta name="${nazwa}"[^>]*content="([^"]*)"`, "i")
  );
  return dopasowanie ? dopasowanie[1] : null;
};

const kanonik = (html) => {
  const m = html.match(/<link rel="canonical" href="([^"]*)"/i);
  return m ? m[1] : null;
};

/* ————————————————————————— scena ————————————————————————— */

const widocznosc_zastana = wp("option", "get", "blog_public").trim();

async function main() {
  const kontrola = JSON.parse(wp("aai-sklep", "sprawdz", "--json"));
  const opublikowane = kontrola.kursy.filter((k) => k.status === "published");
  sprawdz(
    opublikowane.length > 0,
    "baza nie ma ani jednego opublikowanego kursu — bramka mierzyłaby pustkę"
  );

  wp("option", "update", "blog_public", "1");

  /* ——————————————— 1. indeks mapy ——————————————— */

  const odpIndeks = await fetch(`${ADRES}/wp-sitemap.xml`);
  const indeks = await odpIndeks.text();
  sprawdz(odpIndeks.status === 200, "indeks mapy nie oddaje 200");
  sprawdz(
    (odpIndeks.headers.get("content-type") ?? "").includes("xml"),
    "indeks mapy nie jest podawany jako XML"
  );

  const mapy = adresy(indeks);
  sprawdz(mapy.length > 0, "indeks mapy jest pusty — dalsze pomiary byłyby ślepe");
  sprawdz(
    mapy.some((m) => m.includes("wp-sitemap-szkolenia-")),
    "naszej mapy nie ma w indeksie — katalog i strony kursów nie trafiłyby do wyszukiwarki"
  );

  /*
   * Czego w indeksie BYĆ NIE MOŻE. Każda z tych map wystawiała adresy,
   * które istnieją z NASZEGO powodu i którym sami odmawiamy indeksu:
   * kopia kursów w Tutorze (301), lekcje (bramka + noindex), produkty Woo
   * (301), archiwa kategorii produktów (puste) i mapa autorów (drukowała
   * login administratora).
   */
  for (const zakazana of ["courses", "lesson", "product", "product_cat", "users"]) {
    sprawdz(
      !mapy.some((m) => m.includes(`wp-sitemap-posts-${zakazana}-`)) &&
        !mapy.some((m) => m.includes(`wp-sitemap-taxonomies-${zakazana}-`)) &&
        !mapy.some((m) => m.includes(`wp-sitemap-${zakazana}-`)),
      `mapa „${zakazana}" wróciła do indeksu`
    );
  }

  /* ——————————————— 2. nasza mapa wobec bazy ——————————————— */

  const nasza = mapy.find((m) => m.includes("wp-sitemap-szkolenia-"));
  const naszeAdresy = nasza ? adresy(await (await fetch(nasza)).text()) : [];

  sprawdz(
    naszeAdresy.some((a) => new URL(a).pathname === "/szkolenia/"),
    "w naszej mapie nie ma katalogu"
  );

  for (const kurs of opublikowane) {
    sprawdz(
      naszeAdresy.some((a) => new URL(a).pathname === `/szkolenia/${kurs.slug}/`),
      `w naszej mapie brakuje opublikowanego kursu „${kurs.slug}"`
    );
  }

  sprawdz(
    naszeAdresy.length === opublikowane.length + 1,
    `nasza mapa ma ${naszeAdresy.length} adresów, a powinna mieć ${opublikowane.length + 1} (katalog + kursy opublikowane)`
  );

  /*
   * MAPA NIE WYSTAWIA UKRYTEGO KURSU — z przedmiotem pomiaru.
   *
   * Pętla niżej filtruje kursy nieopublikowane, a instalacja ma oba
   * opublikowane — więc od powstania bramki nie wykonała się ANI RAZU.
   * Dlatego stan robimy sami: ukrywamy jeden prawdziwy kurs, pytamy mapę
   * jeszcze raz i przywracamy publikację.
   */
  {
    const probka = opublikowane[0];
    sprawdz(
      undefined !== probka,
      "instalacja nie ma opublikowanego kursu — pomiar mapy wobec ukrytego kursu nie miałby czego ukryć"
    );
    if (probka) {
      let adresyPoUkryciu = [];
      try {
        wp("eval", `Aai_Sklep_Zapis::ustaw_status('${probka.id}','archived','smoke-wp-seo');`);
        adresyPoUkryciu = nasza ? adresy(await (await fetch(nasza)).text()) : [];
      } finally {
        wp("eval", `Aai_Sklep_Zapis::ustaw_status('${probka.id}','published','smoke-wp-seo');`);
      }
      sprawdz(
        !adresyPoUkryciu.some((a) => new URL(a).pathname === `/szkolenia/${probka.slug}/`),
        `nasza mapa wystawia UKRYTY kurs „${probka.slug}" — wyszukiwarka zaprasza na stronę, której klient nie kupi`
      );
      const adresyPoPrzywroceniu = nasza ? adresy(await (await fetch(nasza)).text()) : [];
      sprawdz(
        adresyPoPrzywroceniu.some((a) => new URL(a).pathname === `/szkolenia/${probka.slug}/`),
        `bramka nie przywróciła publikacji kursu „${probka.slug}" — zniknąłby z mapy po jej przebiegu`
      );
    }
  }

  const ukryte = kontrola.kursy.filter((k) => k.status !== "published");
  for (const kurs of ukryte) {
    sprawdz(
      !naszeAdresy.some((a) => a.includes(`/szkolenia/${kurs.slug}/`)),
      `nasza mapa wystawia NIEOPUBLIKOWANY kurs „${kurs.slug}"`
    );
  }

  /* ——————————————— 3. mapa nie kłamie ——————————————— */

  /*
   * NAJMOCNIEJSZE SPRAWDZENIE tej bramki: każdy adres, który mapa zgłasza
   * wyszukiwarce, ma odpowiadać 200 BEZ przekierowania. To ono złapałoby
   * stan sprzed tego kroku, gdy mapa wystawiała `/courses/<slug>/`
   * i `/product/<slug>/` — czyli adresy oddające 301 na nasze strony.
   */
  const wszystkie = [];
  for (const mapa of mapy) {
    wszystkie.push(...adresy(await (await fetch(mapa)).text()));
  }
  sprawdz(wszystkie.length > 0, "cała mapa nie zgłasza ani jednego adresu");

  for (const adres of wszystkie) {
    const odp = await fetch(adres, { redirect: "manual" });
    sprawdz(
      odp.status === 200,
      `mapa zgłasza adres, który nie oddaje 200: ${adres} (${odp.status})`
    );
  }

  /*
   * Login administratora nie ma prawa paść w mapie. Rdzeń buduje adres
   * autora z `user_nicename`, a ten równa się loginowi — mapa autorów
   * publikowała go więc wprost, mimo że `/author/<login>/` oddaje 404
   * od 0.59.0.
   */
  const login = wp("user", "get", "1", "--field=user_login").trim();
  sprawdz(login.length > 0, "nie udało się odczytać loginu administratora");
  const calaMapa = [indeks, ...(await Promise.all(mapy.map(async (m) => (await fetch(m)).text())))].join("\n");
  sprawdz(
    !calaMapa.includes(`/author/${login}`),
    "mapa strony publikuje login administratora"
  );
  sprawdz(
    !calaMapa.includes("/lessons/"),
    "mapa strony wystawia adresy lekcji — to materiał za bramką"
  );

  /* ——————————————— 4. zdjęta mapa oddaje PRAWDZIWE 404 ——————————————— */

  /*
   * Rdzeń przy nieznanym dostawcy robi gołe `return` (zmierzone w
   * `class-wp-sitemaps.php`), więc adres oddawał stronę błędu ze statusem
   * **200** — miękkie 404, które wyszukiwarka indeksuje jako treść.
   */
  for (const zdjeta of ["users", "nieistniejacy"]) {
    const odp = await fetch(`${ADRES}/wp-sitemap-${zdjeta}-1.xml`, { redirect: "manual" });
    sprawdz(
      odp.status === 404,
      `zdjęta mapa „${zdjeta}" oddaje ${odp.status} zamiast 404 (miękkie 404)`
    );
  }

  /* ——————————————— 5. robots i kanoniki na stronach ——————————————— */

  const html = async (sciezka) => (await fetch(`${ADRES}${sciezka}`)).text();

  const katalog = await html("/szkolenia/");
  sprawdz(meta(katalog, "robots") === null, "katalog dostał `robots` — nie powinien być wyłączony z indeksu");
  sprawdz(
    kanonik(katalog) === `${ADRES}/szkolenia/`,
    "kanonik katalogu nie wskazuje na katalog"
  );

  const slug = opublikowane[0].slug;
  const strona = await html(`/szkolenia/${slug}/`);
  sprawdz(meta(strona, "robots") === null, "strona sprzedażowa dostała `robots`");
  sprawdz(
    kanonik(strona) === `${ADRES}/szkolenia/${slug}/`,
    "kanonik strony kursu nie wskazuje na nią samą"
  );

  /*
   * Ścieżka zakupu i strony prywatne — `noindex` MUSI być NASZ, czyli
   * utrzymywać się przy włączonej widoczności. Przed tym krokiem `/koszyk/`
   * i `/my-account/` nie miały ŻADNEGO znacznika `robots` (zmierzone).
   */
  for (const sciezka of ["/koszyk/", "/my-account/", "/szkolenia/moje/"]) {
    const tresc = await html(sciezka);
    sprawdz(
      (meta(tresc, "robots") ?? "").includes("noindex"),
      `${sciezka} nie ma \`noindex\` przy włączonej widoczności`
    );
  }

  /* Lekcja płatna: bramka + `noindex`, też przy włączonej widoczności. */
  const lekcja = wp(
    "db",
    "query",
    "SELECT CONCAT(c.slug,'|',l.title) FROM wp_aai_sklep_lessons l " +
      "JOIN wp_aai_sklep_modules m ON m.id = l.module_id " +
      "JOIN wp_aai_sklep_courses c ON c.id = m.course_id " +
      "WHERE l.preview = 0 AND l.content <> '' LIMIT 1"
  )
    .trim()
    .split("\n")
    .pop()
    .trim();
  sprawdz(lekcja.includes("|"), "nie znalazłem płatnej lekcji do pomiaru");

  const adresLekcji = wp(
    "eval",
    "$p = get_posts( array( 'post_type' => 'lesson', 'numberposts' => 1, 'fields' => 'ids' ) );" +
      "echo $p ? get_permalink( $p[0] ) : '';"
  ).trim();
  if (adresLekcji.startsWith("http")) {
    const trescLekcji = await (await fetch(adresLekcji)).text();
    sprawdz(
      (meta(trescLekcji, "robots") ?? "").includes("noindex"),
      "lekcja nie ma `noindex` przy włączonej widoczności"
    );
  }

  /* ——————————————— 6. robots.txt wskazuje mapę ——————————————— */

  const robots = await (await fetch(`${ADRES}/robots.txt`)).text();
  sprawdz(
    robots.includes("wp-sitemap.xml"),
    "robots.txt nie wskazuje mapy strony"
  );
}

/* ————————————————————————— przebieg ————————————————————————— */

let kod = 0;
try {
  await main();
} catch (blad) {
  bledy.push(`przebieg przerwany: ${blad.message}`);
} finally {
  // Przywracamy ZASTANĄ wartość, nie „domyślną".
  wp("option", "update", "blog_public", widocznosc_zastana);
  const po = wp("option", "get", "blog_public").trim();
  sprawdz(
    po === widocznosc_zastana,
    `nie przywróciłem widoczności: zastałem „${widocznosc_zastana}", zostawiam „${po}"`
  );
}

if (bledy.length > 0) {
  console.error(`smoke-wp-seo: ${bledy.length} z ${sprawdzen} sprawdzeń padło:`);
  for (const blad of bledy) console.error(`  ✗ ${blad}`);
  kod = 1;
} else {
  console.log(`smoke-wp-seo: ${sprawdzen} sprawdzeń w porządku.`);
}
process.exit(kod);
