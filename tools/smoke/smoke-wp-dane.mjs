/**
 * Smoke warstwy danych wtyczki WordPressa — ścieżki, których import
 * dwóch prawdziwych kursów NIE dotyka.
 *
 * PO CO. Import na czystą bazę wykonuje jedną gałąź kodu: same wstawienia.
 * Cała reszta warstwy zapisu — przestawianie kolejności, przenoszenie
 * lekcji między modułami, odmowa skasowania napisanej treści, kasowanie
 * sekcji — zostaje nieprzetestowana, a to właśnie tam mieszkają błędy,
 * które kosztują treść. Ten smoke robi to na WŁASNYM kursie i po sobie
 * sprząta.
 *
 * DLACZEGO WŁASNY KURS, A NIE PRAWDZIWY. Bo test ma prawo zepsuć swoje
 * dane i nie ma prawa zepsuć cudzych. Na wejściu i na wyjściu sprawdzamy,
 * że liczniki tabel wracają do stanu sprzed przebiegu.
 *
 * WYMAGA lokalnego środowiska: `cd wordpress/srodowisko && ./postaw.sh`.
 * Nie wchodzi do `npm run smoke` ani do CI — CI nie ma podmana.
 *
 * Użycie: node tools/smoke/smoke-wp-dane.mjs
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const STACK = process.env.STACK_NAZWA ?? "aai_wp";
const KONTENER = `${STACK}_cli`;
const SLUG = "smoke-wp-dane";

/* Identyfikatory ustalone na sztywno: przebieg ma być powtarzalny,
   a niedokończony przebieg — sprzątalny bez zgadywania. */
const KURS = "aaaa0000-0000-4000-8000-00000000c0de";
const MODUL = ["aaaa0000-0000-4000-8000-0000000m0001", "aaaa0000-0000-4000-8000-0000000m0002"];
const LEKCJA = [
  "aaaa0000-0000-4000-8000-0000000l0101",
  "aaaa0000-0000-4000-8000-0000000l0102",
  "aaaa0000-0000-4000-8000-0000000l0201",
  "aaaa0000-0000-4000-8000-0000000l0202",
];
const SEKCJA = ["aaaa0000-0000-4000-8000-0000000s0001", "aaaa0000-0000-4000-8000-0000000s0002"];

const bledy = [];
let sprawdzen = 0;

function sprawdz(warunek, opis) {
  sprawdzen += 1;
  if (!warunek) bledy.push(opis);
}
function rowne(jest, oczekiwano, opis) {
  sprawdz(
    JSON.stringify(jest) === JSON.stringify(oczekiwano),
    `${opis} — oczekiwano ${JSON.stringify(oczekiwano)}, jest ${JSON.stringify(jest)}`
  );
}

/** Uruchamia wp-cli w kontenerze. Zwraca kod wyjścia i oba strumienie. */
function wp(...argumenty) {
  try {
    const stdout = execFileSync(
      "podman",
      ["exec", KONTENER, "wp", "--path=/var/www/html", ...argumenty],
      { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }
    );
    return { kod: 0, stdout, stderr: "" };
  } catch (blad) {
    return { kod: blad.status ?? 1, stdout: String(blad.stdout ?? ""), stderr: String(blad.stderr ?? "") };
  }
}

/** Wgrywa paczkę i oddaje liczniki. */
function importuj(kurs, { pozwol = false } = {}) {
  const plik = join(tmpdir(), `${SLUG}.json`);
  writeFileSync(plik, JSON.stringify({ wersja_formatu: 2, kursy: [kurs] }));
  execFileSync("podman", ["cp", plik, `${KONTENER}:/tmp/${SLUG}.json`], { stdio: "ignore" });
  const flagi = pozwol ? ["--pozwol-skasowac-tresc"] : [];
  const wynik = wp("aai-sklep", "import", `/tmp/${SLUG}.json`, "--format=json", "--aktor=smoke", ...flagi);
  return {
    ...wynik,
    dane: wynik.kod === 0 && wynik.stdout.trim() ? JSON.parse(wynik.stdout.trim()) : null,
  };
}

/** Stan naszego kursu w tabelach (albo null, gdy go nie ma). */
function stanKursu() {
  const wynik = wp("aai-sklep", "sprawdz", "--format=json");
  if (wynik.kod !== 0) throw new Error(`sprawdz padł: ${wynik.stderr}`);
  const stan = JSON.parse(wynik.stdout.trim());
  return { tabele: stan.tabele, kurs: stan.kursy.find((k) => k.slug === SLUG) ?? null };
}

/** Kurs testowy w wersji podstawowej. */
function paczkaBazowa() {
  const lekcja = (i, position, module_id) => ({
    id: LEKCJA[i],
    position,
    title: `Lekcja ${i + 1}`,
    duration_min: 10 + i,
    preview: i === 0,
    content: `Treść lekcji ${i + 1}. Backslash: \\ i cudzysłów: "`,
    materials: [],
    module_id,
  });
  return {
    id: KURS,
    slug: SLUG,
    title: "Smoke warstwy danych",
    type: "kurs",
    short_desc: "Kurs testowy — kasowany na końcu przebiegu.",
    price_grosze: 1234,
    cover_url: null,
    status: "draft",
    badge: null,
    level: "podstawowy",
    sekcje: [
      { id: SEKCJA[0], kind: "hero", content: { naglowek: "Smoke", lista: [] } },
      { id: SEKCJA[1], kind: "faq", content: { pytania: [{ pytanie: "Czy to test?", odpowiedz: "Tak." }] } },
    ],
    moduly: [
      {
        id: MODUL[0],
        position: 0,
        title: "Moduł pierwszy",
        summary: "Opis pierwszego",
        lekcje: [lekcja(0, 0), lekcja(1, 1)],
      },
      {
        id: MODUL[1],
        position: 1,
        title: "Moduł drugi",
        summary: null,
        lekcje: [lekcja(2, 0), lekcja(3, 1)],
      },
    ],
  };
}

/** Kopia głęboka bez zależności — paczki są czystym JSON-em. */
const kopia = (x) => JSON.parse(JSON.stringify(x));

// ── przebieg ───────────────────────────────────────────────────────────────

console.log(`smoke-wp-dane: kontener ${KONTENER}`);

// Sprzątanie na wejściu: niedokończony poprzedni przebieg nie może psuć tego.
wp("aai-sklep", "usun", SLUG, "--pozwol-skasowac-tresc", "--aktor=smoke");

const naStarcie = stanKursu().tabele;
sprawdz(stanKursu().kurs === null, "kurs testowy nie powinien istnieć na starcie");

// 1. pierwszy import — same wstawienia
{
  const { dane } = importuj(paczkaBazowa());
  rowne(dane?.liczniki, { utworzone: 9, zaktualizowane: 0, bez_zmian: 0, usuniete: 0 }, "import 1");
  rowne(dane?.changelog.po - dane?.changelog.przed, 9, "import 1: dziennik audytu rośnie o 9");
}

// 2. powtórka — nic się nie dzieje, także w dzienniku
{
  const { dane } = importuj(paczkaBazowa());
  rowne(dane?.liczniki, { utworzone: 0, zaktualizowane: 0, bez_zmian: 9, usuniete: 0 }, "import 2 (idempotencja)");
  rowne(dane?.changelog.po - dane?.changelog.przed, 0, "import 2: dziennik NIE rośnie");
}

// 3. zamiana kolejności modułów — stan pośredni łamie UNIQUE (course_id, position)
{
  const p = kopia(paczkaBazowa());
  p.moduly[0].position = 1;
  p.moduly[1].position = 0;
  const { dane, stderr } = importuj(p);
  sprawdz(dane !== null, `zamiana modułów nie powiodła się: ${stderr}`);
  rowne(dane?.liczniki, { utworzone: 0, zaktualizowane: 2, bez_zmian: 7, usuniete: 0 }, "zamiana modułów");

  const { kurs } = stanKursu();
  rowne(
    kurs?.moduly.map((m) => [m.title, m.position]),
    [["Moduł drugi", 0], ["Moduł pierwszy", 1]],
    "kolejność modułów po zamianie"
  );
}

// 4. zamiana kolejności lekcji wewnątrz modułu
{
  const p = kopia(paczkaBazowa());
  p.moduly[0].position = 1;
  p.moduly[1].position = 0;
  p.moduly[0].lekcje[0].position = 1;
  p.moduly[0].lekcje[1].position = 0;
  const { dane } = importuj(p);
  rowne(dane?.liczniki, { utworzone: 0, zaktualizowane: 2, bez_zmian: 7, usuniete: 0 }, "zamiana lekcji");

  const { kurs } = stanKursu();
  const modul = kurs?.moduly.find((m) => m.title === "Moduł pierwszy");
  rowne(
    modul?.lekcje.map((l) => [l.title, l.position]),
    [["Lekcja 2", 0], ["Lekcja 1", 1]],
    "kolejność lekcji po zamianie"
  );
}

// 5. przeniesienie lekcji między modułami — na PIERWSZE miejsce zajętego modułu
//
// Wchodzimy tu ze stanu po kroku 4 (moduły i lekcje pozamieniane), a paczka
// wraca do kolejności bazowej. Przestawia się więc SZEŚĆ wierszy naraz, w tym
// jeden zmieniający rodzica na zajętą pozycję — czyli dokładnie ten stan
// pośredni, którego MySQL nie umie odroczyć.
{
  const p = kopia(paczkaBazowa());
  const przenoszona = p.moduly[0].lekcje.pop(); // Lekcja 2
  przenoszona.position = 0;
  p.moduly[1].lekcje[0].position = 1;
  p.moduly[1].lekcje[1].position = 2;
  p.moduly[1].lekcje.unshift(przenoszona);

  const { dane, stderr } = importuj(p);
  sprawdz(dane !== null, `przeniesienie lekcji nie powiodło się: ${stderr}`);
  rowne(dane?.liczniki, { utworzone: 0, zaktualizowane: 6, bez_zmian: 3, usuniete: 0 }, "przeniesienie lekcji");

  const { kurs } = stanKursu();
  rowne(
    kurs?.moduly.find((m) => m.title === "Moduł pierwszy")?.lekcje.map((l) => l.title),
    ["Lekcja 1"],
    "moduł pierwszy po przeniesieniu"
  );
  rowne(
    kurs?.moduly.find((m) => m.title === "Moduł drugi")?.lekcje.map((l) => [l.title, l.position]),
    [["Lekcja 2", 0], ["Lekcja 3", 1], ["Lekcja 4", 2]],
    "moduł drugi po przeniesieniu"
  );
}

// 6. próba skasowania lekcji Z TREŚCIĄ — bez zgody musi odmówić i NIC nie ruszyć
{
  const przed = stanKursu();
  const p = kopia(paczkaBazowa());
  p.moduly[1].lekcje.pop(); // Lekcja 4 ma treść

  const wynik = importuj(p);
  sprawdz(wynik.kod !== 0, "kasowanie treści bez zgody powinno zakończyć się błędem");
  sprawdz(
    /\b1\b/.test(wynik.stderr) && /tre/i.test(wynik.stderr),
    `komunikat odmowy powinien podać liczbę lekcji z treścią, a brzmi: ${wynik.stderr.trim()}`
  );

  const po = stanKursu();
  rowne(po.tabele, przed.tabele, "odmowa nie może niczego zmienić w tabelach");
}

// 7. to samo z jawną zgodą
{
  const p = kopia(paczkaBazowa());
  p.moduly[1].lekcje.pop();
  const { dane } = importuj(p, { pozwol: true });
  rowne(dane?.liczniki.usuniete, 1, "kasowanie lekcji za zgodą");

  const { kurs } = stanKursu();
  rowne(
    kurs?.moduly.find((m) => m.title === "Moduł drugi")?.lekcje.map((l) => l.title),
    ["Lekcja 3"],
    "moduł drugi po skasowaniu lekcji"
  );
}

// 8. skasowanie sekcji
{
  const p = kopia(paczkaBazowa());
  p.moduly[1].lekcje.pop();
  p.sekcje.pop();
  const { dane } = importuj(p, { pozwol: true });
  rowne(dane?.liczniki.usuniete, 1, "kasowanie sekcji");
  rowne(stanKursu().kurs?.sekcje.map((s) => s.kind), ["hero"], "sekcje po skasowaniu");
}

// 9. usunięcie kursu — bez zgody odmawia, ze zgodą kasuje wszystko
{
  const bezZgody = wp("aai-sklep", "usun", SLUG, "--aktor=smoke");
  sprawdz(bezZgody.kod !== 0, "usunięcie kursu z napisanymi lekcjami powinno wymagać zgody");
  sprawdz(stanKursu().kurs !== null, "odmowa usunięcia nie może skasować kursu");

  const zeZgoda = wp("aai-sklep", "usun", SLUG, "--pozwol-skasowac-tresc", "--aktor=smoke");
  sprawdz(zeZgoda.kod === 0, `usunięcie kursu padło: ${zeZgoda.stderr}`);
  sprawdz(stanKursu().kurs === null, "kurs testowy powinien zniknąć");
}

// 10. cudze dane nietknięte
{
  const { tabele } = stanKursu();
  for (const nazwa of ["courses", "sections", "modules", "lessons"]) {
    rowne(tabele[nazwa], naStarcie[nazwa], `tabela ${nazwa} wraca do stanu sprzed przebiegu`);
  }
  sprawdz(
    tabele.changelog > naStarcie.changelog,
    "dziennik audytu MUSI urosnąć — przebieg zmieniał dane"
  );
}


/*
 * PRODUKT PO KURSIE TESTOWYM — sprzątamy TU, bo wtyczka tego nie robi
 * i nie ma prawa robić: „produktu nie kasujemy nigdy" (niezmiennik 13
 * Pluginu 2) chroni historię zamówień i nie rozróżnia kupionych od
 * niekupionych. Bez tego każdy przebieg zostawiałby w sklepie sierotę,
 * a po kilku przebiegach bramki mierzyłyby własne śmieci. Test ma prawo
 * skasować SWOJE dane.
 */
wp(
  "eval",
  `if ( class_exists( "Aai_Platnosci_Tabele" ) ) {
    global $wpdb; $t = Aai_Platnosci_Tabele::tabela( "powiazania" );
    $pid = (int) $wpdb->get_var( $wpdb->prepare( "SELECT product_id FROM {$t} WHERE course_uuid = %s", "${KURS}" ) );
    if ( $pid > 0 ) { $wpdb->delete( $t, array( "product_id" => $pid ) ); wp_delete_post( $pid, true ); }
  }`
);

// ── werdykt ────────────────────────────────────────────────────────────────

if (bledy.length > 0) {
  console.error(`\nsmoke-wp-dane: ${bledy.length} z ${sprawdzen} sprawdzeń padło:`);
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}
console.log(`smoke-wp-dane: ${sprawdzen} sprawdzeń zaliczonych.`);
