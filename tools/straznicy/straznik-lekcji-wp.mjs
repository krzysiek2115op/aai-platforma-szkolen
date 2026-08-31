/**
 * Strażnik widoku lekcji — ochrony, których brak NIE objawia się błędem.
 *
 * PO CO. Ta strona jest TOWAREM: klient płaci za dostęp do niej, a jej treść
 * to 1,3 MB prozy, której nikt nie przeczyta w całości przy każdym wydaniu.
 * Trzy rzeczy mogą się tu zepsuć po cichu:
 *   — materiał wycieknie komuś, kto go nie kupił (bramka zniknie albo
 *     przestanie pytać Tutora),
 *   — renderer przestanie rozumieć kawałek Markdownu i pokaże klientowi
 *     `## Czego się nauczysz` jako zdanie,
 *   — arkusz lekcji przemaluje CUDZĄ stronę (nasze reguły stoją POZA
 *     warstwami kaskady motywu, więc bez zakotwiczenia sięgają wszędzie).
 * Żadna z nich nie zapala się sama.
 *
 * OSIEM NIEZMIENNIKÓW (każdy z własną mutacją w audyt-straznikow):
 *   1. widok lekcji jest PODPIĘTY w pliku głównym wtyczki,
 *   2. o dostęp pytamy TUTORA, nie zgadujemy własną regułą,
 *   3. bez dostępu treść nie jest w ogóle CZYTANA (nie tylko nieukazana),
 *   4. renderer ma asercję na nieprzetworzony Markdown…
 *   5. …i pomija w niej bloki kodu (kurs o GitHubie UCZY Markdownu),
 *   6. renderer ucieka wszystko, co przyszło z treści,
 *   7. zrzuty mają `width` i `height` (CLS w tym projekcie stoi na zerze),
 *   8. arkusz lekcji ma WYŁĄCZNIE selektory zakotwiczone w klasie strony.
 *
 * Użycie: node tools/straznicy/straznik-lekcji-wp.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const WTYCZKA = "wordpress/wtyczki/aai-sklep";
const PLIK_WIDOKU = "includes/class-aai-sklep-lekcja.php";
const PLIK_PROZY = "includes/class-aai-sklep-proza.php";
const PLIK_ZASOBOW = "includes/class-aai-sklep-zasoby.php";
const PLIK_GLOWNY = "aai-sklep.php";
const ARKUSZ = "assets/lekcja.css";

const bledy = [];

/** Kod bez komentarzy — reguły celują w ZACHOWANIE, nie w opis. */
const kod = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const czytaj = (wzgledny) => readFileSync(join(WTYCZKA, wzgledny), "utf8");

if (!existsSync(join(WTYCZKA, PLIK_WIDOKU))) {
  console.log("straznik-lekcji-wp: pominięte — wtyczka nie ma jeszcze widoku lekcji.");
  process.exit(0);
}

const widok = kod(czytaj(PLIK_WIDOKU));
const proza = kod(czytaj(PLIK_PROZY));

/* ————————————————— 1. widok jest podpięty ————————————————— */

if (!/Aai_Sklep_Lekcja::zarejestruj\s*\(/.test(kod(czytaj(PLIK_GLOWNY)))) {
  bledy.push(
    `${PLIK_GLOWNY}: widok lekcji nie jest rejestrowany. Klient dostanie wtedy stronę Tutora — czyli inny wygląd, cudzy interfejs i materiał w oprawie, której właściciel nie zatwierdzał.`
  );
}

/* ————————————————— 2. o dostęp pyta Tutor ————————————————— */

if (!/has_enrolled_content_access\s*\(/.test(widok)) {
  bledy.push(
    `${PLIK_WIDOKU}: dostęp do lekcji nie jest sprawdzany u Tutora (has_enrolled_content_access). Własna reguła „kupił, więc wpuść" byłaby DRUGIM systemem uprawnień obok istniejącego — pierwsza rozbieżność kończy się albo wyciekiem materiału, albo zamkniętymi drzwiami przed płacącym klientem.`
  );
}

/* ————————————————— 3. bez dostępu treść nie jest czytana ————————————————— */

const gdzieBramka = widok.search(/if\s*\(\s*!\s*\$dostep\s*\)/);
const gdzieSklad = widok.indexOf("Aai_Sklep_Proza::zloz");
if (gdzieBramka === -1 || gdzieSklad === -1 || gdzieBramka > gdzieSklad) {
  bledy.push(
    `${PLIK_WIDOKU}: treść lekcji jest składana BEZ wcześniejszego sprawdzenia dostępu (albo bramki nie ma wcale). Materiał, którego nie wczytano, nie ma jak wyciec przez pomyłkę w szablonie — kolejność ma tu znaczenie, nie sam fakt istnienia bramki.`
  );
}

/* ————————————————— 4. i 5. asercja renderera ————————————————— */

/*
 * Pytamy o TRZY rzeczy naraz, bo każda z osobna daje się spełnić pustą
 * deklaracją: czy lista wzorców w ogóle istnieje i coś zawiera, czy skład
 * ją sprawdza i czy sprawdzenie kończy się WYJĄTKIEM. Wzorzec pytający
 * o samą NAZWĘ stałej przepuścił mutację, która skasowała jej definicję,
 * zostawiając wywołanie — dokładnie ta klasa dziury, którą audyt złapał
 * w straznik-limitera przy 0.29.0.
 */
const listaWzorcow = proza.match(/private const SLADY_SUROWEGO = array\(([\s\S]*?)\);/);
const wolaAsercje = /self::sprawdz_slady\(/.test(proza);
const asercjaRzuca = /function sprawdz_slady[\s\S]*?throw new Aai_Sklep_Blad_Zapisu/.test(proza);

if (!listaWzorcow || !/=>/.test(listaWzorcow[1]) || !wolaAsercje || !asercjaRzuca) {
  bledy.push(
    `${PLIK_PROZY}: renderer nie ma DZIAŁAJĄCEJ asercji na nieprzetworzony Markdown (lista wzorców: ${listaWzorcow ? "jest" : "BRAK"}, skład ją woła: ${wolaAsercje}, asercja rzuca wyjątkiem: ${asercjaRzuca}). Konstrukcja, której renderer nie zna, ma ZATRZYMAĆ lekcję, a nie pokazać klientowi „## Czego się nauczysz" jako zdanie.`
  );
}

const asercja = proza.slice(proza.indexOf("function sprawdz_slady"));
if (!/<pre><code>|<code>/.test(asercja)) {
  bledy.push(
    `${PLIK_PROZY}: asercja surowego Markdownu nie pomija bloków kodu. Kurs o GitHubie UCZY Markdownu — w jego blokach kodu stoją prawdziwe „[tekst](adres)" i wiersze tabel, więc bez tego wyjątku lekcja zatrzymywałaby się na własnym przykładzie (ta sama poprawka, którą przeszedł straznik-linkow).`
  );
}

/* ————————————————— 6. ucieczka treści ————————————————— */

if (!/\$tekst = self::uciekaj\( \$tekst \);/.test(proza)) {
  bledy.push(
    `${PLIK_PROZY}: skład w linii nie ucieka tekstu przed dokładaniem znaczników. Materiał wchodzi kreatorem, czyli polem tekstowym — pierwszy wklejony „<script>" byłby wykonalny u każdego czytelnika.`
  );
}

/* ————————————————— 7. zrzuty z wymiarami ————————————————— */

const figura = proza.slice(proza.indexOf("function figura"), proza.indexOf("function figura") + 1800);
if (!/width="/.test(figura) || !/height="/.test(figura)) {
  bledy.push(
    `${PLIK_PROZY}: zrzuty ekranu wychodzą bez width/height. 148 obrazów bez zarezerwowanego miejsca przepycha tekst przy każdym doładowaniu — CLS jest w tym projekcie trzymany na zerze (pomiary 0.25.0).`
  );
}

/* ————————————————— 8. arkusz lekcji jest zakotwiczony ————————————————— */

if (existsSync(join(WTYCZKA, ARKUSZ))) {
  const css = czytaj(ARKUSZ).replace(/\/\*[\s\S]*?\*\//g, "");
  let i = 0;
  const niezakotwiczone = [];
  while (i < css.length) {
    const otwarcie = css.indexOf("{", i);
    if (otwarcie === -1) break;
    const selektor = css.slice(i, otwarcie).trim();
    let glebokosc = 1;
    let j = otwarcie + 1;
    while (j < css.length && glebokosc > 0) {
      if (css[j] === "{") glebokosc += 1;
      else if (css[j] === "}") glebokosc -= 1;
      j += 1;
    }
    if (selektor && !selektor.startsWith("@") && !selektor.includes(".aai-sklep-lekcja")) {
      niezakotwiczone.push(selektor.slice(0, 60));
    }
    i = j;
  }
  if (niezakotwiczone.length > 0) {
    bledy.push(
      `${ARKUSZ}: ${niezakotwiczone.length} reguł bez zakotwiczenia w .aai-sklep-lekcja (np. „${niezakotwiczone[0]}"). Nasze reguły stoją POZA warstwami kaskady motywu, a reguła spoza warstwy bije każdą regułę w warstwie — bez kotwicy arkusz lekcji potrafi przemalować stronę główną. Ta sama lekcja co kolizja .text-label z 0.38.0.`
    );
  }
}

/* ————————————————— 9. strona lekcji bez CSS-u Tutora ————————————————— */

if (existsSync(join(WTYCZKA, PLIK_ZASOBOW))) {
  if (!/Aai_Sklep_Lekcja::czy_nasza\s*\(/.test(kod(czytaj(PLIK_ZASOBOW)))) {
    bledy.push(
      `${PLIK_ZASOBOW}: strona lekcji nie jest wyłączona spod „to strona Tutora". Jego arkusz zrobiłby na niej to samo, co zrobił stronie głównej przed 0.38.0 (kolizja .text-label) — tyle że w widoku, za który klient zapłacił.`
    );
  }
}

/* ————— 10. publiczne LISTY lekcji są zasłonięte (wyciek z 2026-08-31) ————— */
/*
 * DLACZEGO TA REGUŁA ISTNIEJE. Bramka dostępu pilnuje POJEDYNCZEJ lekcji
 * (`is_singular`), a materiał wyciekał LISTĄ: `/?post_type=lesson` oddawało
 * gościowi 73 lekcje prozy, to samo szło kanałem RSS. Znalezione testem
 * całości, po tym jak wszystkie 14 bramek i 37 strażników świeciło zielono.
 *
 * Reguła pyta o ROZSTRZYGNIĘCIA, nie o nazwy metod (dziewięć nawrotów tej
 * pułapki w projekcie): czy typ traci archiwum i wyszukiwarkę, czy zapytanie
 * o listę dostaje PUSTY wynik (sama flaga 404 nie wystarcza — motyw bez
 * `404.php` drukuje wtedy znalezione wpisy) i czy odpowiedź niesie kod 404.
 */
const zaslona = [
  [/register_post_type_args/, "typ lekcji nie jest filtrowany przy rejestracji"],
  [/'has_archive'\s*\]\s*=\s*false|'has_archive'\s*=>\s*false/, "archiwum typu nie jest wyłączane"],
  [/'exclude_from_search'\s*\]\s*=\s*true|'exclude_from_search'\s*=>\s*true/, "typ nie jest wykluczany z wyszukiwarki"],
  [/add_action\(\s*'pre_get_posts'/, "zapytania o listę nie są przechwytywane"],
  [/->set\(\s*'post__in'\s*,\s*array\(\s*0\s*\)/, "zapytanie o listę nie dostaje pustego wyniku (sama flaga 404 przepuszcza prozę)"],
  [/->set_404\(\)/, "zapytanie o listę nie jest oznaczane jako 404"],
  [/status_header\(\s*404\s*\)/, "zasłonięta lista nie oddaje kodu 404"],
];
for (const [wzorzec, czego] of zaslona) {
  if (!wzorzec.test(widok)) {
    bledy.push(
      `${PLIK_WIDOKU}: ${czego}. Publiczna lista lekcji wypisuje wtedy prozę płatnego kursu — wyciek całego produktu, bez jednego objawu po stronie właściciela (zmierzone 2026-08-31: 73 lekcje, osiem stron, także kanałem RSS).`
    );
  }
}

/* ————— 11. zapowiedź gaśnie razem z kursem (decyzja właściciela 2026-08-31) ————— */
/*
 * Darmowa lekcja jest narzędziem SPRZEDAŻY. Kurs zdjęty ze sprzedaży nie
 * ma strony sprzedażowej (kanał odczytu serwuje wyłącznie `published`),
 * więc żywa zapowiedź byłaby po nim jedyną publiczną stroną — a od C1
 * materiał ukrytego kursu zostaje w Tutorze `publish`, żeby czytał go
 * kupujący. Bez tego warunku ukrycie kursu zostawiałoby jego darmowe
 * lekcje otwarte dla każdego, na zawsze.
 *
 * Reguła pyta o ROZSTRZYGNIĘCIE w bramce (zapowiedź ORAZ stan kursu),
 * nie o obecność słowa „published" w pliku — ta pułapka wracała
 * w projekcie dziewięć razy.
 */
{
  const bramka = widok.slice(widok.indexOf("function czy_wolno"));
  const koniec = bramka.indexOf("\n\t}");
  const cialo = koniec > 0 ? bramka.slice(0, koniec) : bramka;
  if (!cialo.startsWith("function czy_wolno")) {
    bledy.push(`${PLIK_WIDOKU}: nie ma bramki czy_wolno() — strażnik przestał wiedzieć, czego pilnuje.`);
  } else if (!/\$zapowiedz\s*&&\s*'published'\s*===\s*\$stan_kursu|'published'\s*===\s*\$stan_kursu\s*&&\s*\$zapowiedz/.test(cialo)) {
    bledy.push(
      `${PLIK_WIDOKU}: czy_wolno() wpuszcza na zapowiedź bez pytania o STAN kursu. Kurs zdjęty ze sprzedaży nie ma już strony sprzedażowej, a jego materiał zostaje w Tutorze publiczny (C1) — darmowa lekcja byłaby wtedy jedyną żywą stroną ukrytego kursu, otwartą dla każdego.`
    );
  }
}

if (bledy.length > 0) {
  console.error("straznik-lekcji-wp:");
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}

console.log(
  "straznik-lekcji-wp: widok podpięty, dostępu pilnuje Tutor, bez dostępu treść nie jest czytana, renderer ma asercję (z wyjątkiem bloków kodu) i ucieka treść, zrzuty mają wymiary, arkusz zakotwiczony, CSS Tutora nie wchodzi, publiczne listy lekcji zasłonięte, zapowiedź gaśnie razem z kursem."
);
