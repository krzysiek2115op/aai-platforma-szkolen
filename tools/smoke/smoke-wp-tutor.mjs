/**
 * Smoke kopii kursu w Tutor LMS (krok W5) — na ŻYWEJ instalacji.
 *
 * PO CO OSOBNO OD `straznik-tutora`. Bo strażnik pilnuje KODU (czy mechanizm
 * jest podpięty, czy jedzie w jedną stronę, czy meta idzie przez wp_slash),
 * a to jest pytanie o STAN DANYCH: czy zmiana zrobiona w kreatorze naprawdę
 * dojechała do drugiej kopii. Jedno bez drugiego nic nie znaczy — kod może
 * być poprawny, a kopia i tak rozjechana po awarii albo po czyjejś ręcznej
 * poprawce w Course Builderze.
 *
 * DLACZEGO WŁASNY KURS. Test ma prawo zepsuć swoje dane i nie ma prawa
 * zepsuć cudzych (ta sama zasada co w `smoke-wp-dane`). Prawdziwych kursów
 * dotykamy WYŁĄCZNIE odczytem: na wejściu i na wyjściu pytamy, czy kopia
 * dwóch prawdziwych kursów jest zgodna — i to jest osobny dowód, że przebieg
 * niczego po sobie nie zostawił.
 *
 * CO TU JEST TESTEM NEGATYWNYM. Trzy klasy rozjazdu, które kontrola MUSI
 * zobaczyć: ręczna zmiana w Tutorze, sierota po skasowanej lekcji i wpis
 * zrobiony poza kreatorem. Kontrola, która nigdy nie zapaliła się na czerwono,
 * jest deklaracją, nie kontrolą.
 *
 * WYMAGA lokalnego środowiska: `cd wordpress/srodowisko && ./postaw.sh`.
 * Nie wchodzi do `npm run smoke` ani do CI — CI nie ma podmana.
 *
 * Użycie: node tools/smoke/smoke-wp-tutor.mjs
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const STACK = process.env.STACK_NAZWA ?? "aai_wp";
const KONTENER = `${STACK}_cli`;
const SLUG = "smoke-wp-tutor";

/* Identyfikatory na sztywno — przebieg ma być powtarzalny, a niedokończony
   przebieg sprzątalny bez zgadywania. */
const KURS = "aaaa0000-0000-4000-8000-00000000t000";
const MODUL = ["aaaa0000-0000-4000-8000-0000000t0m01", "aaaa0000-0000-4000-8000-0000000t0m02"];
const LEKCJA = [
  "aaaa0000-0000-4000-8000-0000000t0l01",
  "aaaa0000-0000-4000-8000-0000000t0l02",
  "aaaa0000-0000-4000-8000-0000000t0l03",
];

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

/** wp-cli w kontenerze. */
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

/** Kod PHP w WordPressie — tu mieszkają testy negatywne (psucie kopii). */
function eval_php(kod) {
  const wynik = wp("eval", kod);
  if (wynik.kod !== 0) throw new Error(`wp eval padł: ${wynik.stderr || wynik.stdout}`);
  return wynik.stdout.trim();
}

/** Kontrola zgodności obu kopii. */
function kontrola(kurs = "") {
  const argumenty = kurs ? ["aai-sklep", "sprawdz-tutora", kurs, "--format=json"] : ["aai-sklep", "sprawdz-tutora", "--format=json"];
  const wynik = wp(...argumenty);
  const linia = wynik.stdout.trim().split("\n").pop() ?? "";
  return { kod: wynik.kod, dane: linia.startsWith("{") ? JSON.parse(linia) : null };
}

/** Import paczki z naszym kursem. */
function importuj(kurs, { pozwol = false } = {}) {
  const plik = join(tmpdir(), `${SLUG}.json`);
  writeFileSync(plik, JSON.stringify({ wersja_formatu: 2, kursy: [kurs] }));
  execFileSync("podman", ["cp", plik, `${KONTENER}:/tmp/${SLUG}.json`], { stdio: "ignore" });
  const wynik = wp(
    "aai-sklep", "import", `/tmp/${SLUG}.json`, "--format=json", "--aktor=smoke-tutor",
    ...(pozwol ? ["--pozwol-skasowac-tresc"] : [])
  );
  const linia = wynik.stdout.trim().split("\n").pop() ?? "";
  return { ...wynik, dane: linia.startsWith("{") ? JSON.parse(linia) : null };
}

/**
 * Stan kopii naszego kursu w Tutorze: tytuły, pozycje, statusy, skróty treści.
 * Czytamy przez `wp eval`, bo to jedyna droga do meta i rodziców naraz.
 */
function kopiaWTutorze() {
  const surowe = eval_php(`
    $typy = Aai_Sklep_Tutor::typy();
    $znajdz = function ($uuid, $typ) {
      $p = get_posts(["post_type"=>$typ,"post_status"=>"any","numberposts"=>1,"fields"=>"ids","meta_key"=>"_aai_zrodlo_uuid","meta_value"=>$uuid]);
      return $p ? (int) $p[0] : 0;
    };
    $opis = function ($id) {
      if (0 === $id) return null;
      $p = get_post($id);
      return ["tytul"=>$p->post_title,"status"=>$p->post_status,"pozycja"=>(int)$p->menu_order,"rodzic"=>(int)$p->post_parent,"sha"=>substr(hash("sha256",$p->post_content),0,12),"znakow"=>mb_strlen($p->post_content)];
    };
    $kurs = $znajdz("${KURS}", $typy["kurs"]);
    $wynik = ["kurs"=>$opis($kurs), "id_kursu"=>$kurs, "moduly"=>[], "lekcje"=>[]];
    foreach ([${MODUL.map((m) => `"${m}"`).join(", ")}] as $m) { $wynik["moduly"][$m] = $opis($znajdz($m, $typy["modul"])); }
    foreach ([${LEKCJA.map((l) => `"${l}"`).join(", ")}] as $l) { $wynik["lekcje"][$l] = $opis($znajdz($l, $typy["lekcja"])); }
    echo json_encode($wynik);
  `);
  return JSON.parse(surowe);
}

/** Kurs testowy. */
function paczka() {
  const lekcja = (i, position) => ({
    id: LEKCJA[i],
    position,
    title: `Lekcja ${i + 1}`,
    duration_min: 10 + i,
    preview: false,
    // Backslash i cudzysłów w treści: to na nich potknął się import 0.36.0.
    content: `Treść lekcji ${i + 1}. Ścieżka C:\\Users\\test i cudzysłów: "`,
    materials: [],
  });
  return {
    id: KURS,
    slug: SLUG,
    title: "Smoke kopii w Tutorze",
    type: "kurs",
    short_desc: "Kurs testowy — kasowany na końcu przebiegu.",
    price_grosze: 4321,
    cover_url: null,
    status: "draft",
    badge: null,
    level: "podstawowy",
    sekcje: [
      {
        id: "aaaa0000-0000-4000-8000-0000000t0s01",
        kind: "benefits",
        content: { punkty: [{ tytul: "Korzyść", opis: "Opis korzyści" }] },
      },
    ],
    moduly: [
      { id: MODUL[0], position: 0, title: "Moduł pierwszy", summary: "Opis pierwszego", lekcje: [lekcja(0, 0), lekcja(1, 1)] },
      { id: MODUL[1], position: 1, title: "Moduł drugi", summary: null, lekcje: [lekcja(2, 0)] },
    ],
  };
}

const kopiuj = (x) => JSON.parse(JSON.stringify(x));

/** Skrót treści — porównujemy CO DO ZNAKU, nie co do długości. */
const skrot = (t) => createHash("sha256").update(t, "utf8").digest("hex").slice(0, 12);

// ── przebieg ───────────────────────────────────────────────────────────────

console.log("smoke-wp-tutor: kopia kursu w Tutor LMS na żywej instalacji\n");

// 0. Tutor musi być — bez niego ten smoke nie ma czego sprawdzać.
const dostepny = eval_php('echo Aai_Sklep_Tutor::dostepny() ? "tak" : "nie";');
if ("tak" !== dostepny) {
  console.error("smoke-wp-tutor: w tej instalacji nie ma Tutor LMS — nie ma czego sprawdzać.");
  process.exit(1);
}

// 1. STAN WYJŚCIOWY prawdziwych kursów (tylko odczyt).
const przed = kontrola();
sprawdz(przed.kod === 0, `na wejściu kopia prawdziwych kursów jest rozjechana: ${JSON.stringify(przed.dane?.roznice ?? [])}`);
const obiektowPrzed = przed.dane?.sprawdzonych ?? 0;
sprawdz(obiektowPrzed > 0, "kontrola nie znalazła ani jednego obiektu do sprawdzenia — czy w tabelach są kursy?");

try {
  // 2. Kurs wchodzi do naszych tabel → kopia powstaje sama.
  const wynik = importuj(paczka());
  sprawdz(wynik.kod === 0, `import kursu testowego padł: ${wynik.stderr}`);
  rowne(wynik.dane?.tutor?.utworzone, 6, "import: w Tutorze miało powstać 6 wpisów (kurs + 2 moduły + 3 lekcje)");

  let kopia = kopiaWTutorze();
  sprawdz(kopia.kurs !== null, "kursu nie ma w Tutorze po imporcie");
  rowne(kopia.kurs?.tytul, "Smoke kopii w Tutorze", "tytuł kursu w kopii");
  rowne(kopia.kurs?.status, "draft", "szkic u nas ma być szkicem w Tutorze");
  rowne(Object.values(kopia.moduly).filter(Boolean).length, 2, "moduły w kopii");
  rowne(Object.values(kopia.lekcje).filter(Boolean).length, 3, "lekcje w kopii");
  rowne(kopia.moduly[MODUL[0]]?.rodzic, kopia.id_kursu, "moduł ma być dzieckiem kursu");
  rowne(kopia.lekcje[LEKCJA[2]]?.rodzic, eval_php(`
    $p = get_posts(["post_type"=>Aai_Sklep_Tutor::typy()["modul"],"post_status"=>"any","numberposts"=>1,"fields"=>"ids","meta_key"=>"_aai_zrodlo_uuid","meta_value"=>"${MODUL[1]}"]);
    echo (int) $p[0];
  `) * 1, "lekcja trzecia ma wisieć pod DRUGIM modułem");
  rowne(
    kopia.lekcje[LEKCJA[0]]?.sha,
    skrot(paczka().moduly[0].lekcje[0].content),
    "treść lekcji dojechała CO DO ZNAKU (backslash i cudzysłów też — na nich potknął się import 0.36.0)"
  );

  // 3. Idempotencja: ten sam import drugi raz niczego nie rusza.
  const drugi = importuj(paczka());
  rowne(drugi.dane?.tutor, { utworzone: 0, zaktualizowane: 0, bez_zmian: 6, usuniete: 0 }, "powtórny import nie ma prawa ruszyć kopii");

  // 4. Zmiana tytułu i zamiana kolejności modułów → kopia nadąża.
  const zmieniona = kopiuj(paczka());
  zmieniona.moduly[0].position = 1;
  zmieniona.moduly[1].position = 0;
  zmieniona.moduly[0].lekcje[0].title = "Lekcja pierwsza po poprawce";
  const trzeci = importuj(zmieniona);
  sprawdz(trzeci.kod === 0, `import po zmianie padł: ${trzeci.stderr}`);
  kopia = kopiaWTutorze();
  rowne(kopia.lekcje[LEKCJA[0]]?.tytul, "Lekcja pierwsza po poprawce", "poprawiony tytuł lekcji w kopii");
  rowne(kopia.moduly[MODUL[0]]?.pozycja, 1, "zamiana kolejności modułów w kopii (pierwszy)");
  rowne(kopia.moduly[MODUL[1]]?.pozycja, 0, "zamiana kolejności modułów w kopii (drugi)");

  // 5. Zmiana treści lekcji osobną drogą zapisu (tak działa edytor materiału).
  eval_php(`Aai_Sklep_Zapis::zapisz_tresc_lekcji("${LEKCJA[1]}", ["tresc" => "Zupełnie nowa treść lekcji drugiej.", "materialy" => []], "smoke-tutor");`);
  kopia = kopiaWTutorze();
  rowne(
    kopia.lekcje[LEKCJA[1]]?.sha,
    skrot("Zupełnie nowa treść lekcji drugiej."),
    "nowa treść lekcji dojechała do kopii co do znaku"
  );

  // 6. Publikacja → wszystkie wpisy zmieniają status.
  eval_php(`Aai_Sklep_Zapis::ustaw_status("${KURS}", "published", "smoke-tutor");`);
  kopia = kopiaWTutorze();
  rowne(kopia.kurs?.status, "publish", "publikacja kursu w kopii");
  rowne(kopia.moduly[MODUL[0]]?.status, "publish", "publikacja modułu w kopii");
  rowne(kopia.lekcje[LEKCJA[0]]?.status, "publish", "publikacja lekcji w kopii");
  rowne(kontrola(SLUG).kod, 0, "po publikacji kopia ma być zgodna");

  // 6b. Okładka z BIBLIOTEKI MEDIÓW ląduje jako miniatura wpisu.
  //     Okładki obu prawdziwych kursów to dziś pliki SVG jadące z wtyczką,
  //     a WordPress nie wpuszcza SVG do biblioteki — miniatura pojawia się
  //     więc dopiero dla okładki wybranej w kreatorze (tak działa od W4).
  const zalacznik = eval_php(`
    $plik = wp_upload_dir()["path"] . "/smoke-wp-tutor.png";
    file_put_contents($plik, base64_decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="));
    $id = wp_insert_attachment(["post_mime_type"=>"image/png","post_title"=>"smoke-wp-tutor","post_status"=>"inherit"], $plik);
    echo json_encode(["id"=>(int)$id, "url"=>wp_get_attachment_url($id)]);
  `);
  const { id: idZalacznika, url: adresOkladki } = JSON.parse(zalacznik);
  const zOkladka = kopiuj(zmieniona);
  zOkladka.status = "published";
  zOkladka.cover_url = adresOkladki;
  const piaty = importuj(zOkladka);
  sprawdz(piaty.kod === 0, `import z okładką padł: ${piaty.stderr}`);
  rowne(
    eval_php(`
      $p = get_posts(["post_type"=>Aai_Sklep_Tutor::typy()["kurs"],"post_status"=>"any","numberposts"=>1,"fields"=>"ids","meta_key"=>"_aai_zrodlo_uuid","meta_value"=>"${KURS}"]);
      echo (int) get_post_thumbnail_id((int) $p[0]);
    `) * 1,
    idZalacznika,
    "okładka z biblioteki mediów ma stać się miniaturą kursu w Tutorze"
  );
  eval_php(`wp_delete_attachment(${idZalacznika}, true);`);

  // 7. Lekcja znika z programu → znika też z kopii (żadnych sierot).
  const bezLekcji = kopiuj(zOkladka);
  bezLekcji.status = "published";
  bezLekcji.cover_url = null;
  bezLekcji.moduly[1].lekcje = [];
  const czwarty = importuj(bezLekcji, { pozwol: true });
  sprawdz(czwarty.kod === 0, `import bez lekcji padł: ${czwarty.stderr}`);
  rowne(czwarty.dane?.tutor?.usuniete, 1, "skasowana lekcja miała zniknąć z kopii");
  kopia = kopiaWTutorze();
  rowne(kopia.lekcje[LEKCJA[2]], null, "lekcji skasowanej u nas nie ma prawa być w Tutorze");
  rowne(kontrola(SLUG).kod, 0, "po skasowaniu lekcji kopia ma być zgodna");

  // 8. TEST NEGATYWNY: ktoś zmienia tytuł w Course Builderze.
  eval_php(`
    $p = get_posts(["post_type"=>Aai_Sklep_Tutor::typy()["lekcja"],"post_status"=>"any","numberposts"=>1,"fields"=>"ids","meta_key"=>"_aai_zrodlo_uuid","meta_value"=>"${LEKCJA[0]}"]);
    wp_update_post(["ID"=>(int)$p[0], "post_title"=>"RĘCZNA ZMIANA W TUTORZE"]);
  `);
  const poRecznej = kontrola();
  sprawdz(poRecznej.kod === 1, "kontrola NIE zauważyła ręcznej zmiany w Tutorze — to jest dziura, nie drobiazg");
  sprawdz(
    (poRecznej.dane?.roznice ?? []).some((r) => r.rodzaj === "rozjazd" && r.opis.includes("RĘCZNA ZMIANA")),
    "kontrola nie nazwała ręcznej zmiany rozjazdem"
  );
  const naprawa = wp("aai-sklep", "sync", SLUG);
  sprawdz(naprawa.kod === 0, `naprawa synchronizacją padła: ${naprawa.stderr}`);
  rowne(kontrola(SLUG).kod, 0, "synchronizacja miała naprawić ręczną zmianę");

  // 9. TEST NEGATYWNY: sierota po lekcji, której u nas nie ma.
  eval_php(`
    $typy = Aai_Sklep_Tutor::typy();
    $m = get_posts(["post_type"=>$typy["modul"],"post_status"=>"any","numberposts"=>1,"fields"=>"ids","meta_key"=>"_aai_zrodlo_uuid","meta_value"=>"${MODUL[0]}"]);
    $id = wp_insert_post(["post_type"=>$typy["lekcja"],"post_status"=>"publish","post_title"=>"SIEROTA","post_parent"=>(int)$m[0]]);
    update_post_meta($id, "_aai_zrodlo_uuid", "00000000-0000-4000-8000-000000000000");
  `);
  const zSierota = kontrola();
  sprawdz(zSierota.kod === 1, "kontrola NIE zauważyła sieroty po skasowanej lekcji");
  sprawdz(
    (zSierota.dane?.roznice ?? []).some((r) => r.rodzaj === "sierota"),
    "kontrola nie nazwała sieroty po imieniu"
  );
  wp("aai-sklep", "sync", SLUG);
  sprawdz(
    !(kontrola().dane?.roznice ?? []).some((r) => r.rodzaj === "sierota"),
    "synchronizacja miała skasować sierotę"
  );

  // 10. TEST NEGATYWNY: kurs zrobiony ręcznie w Tutorze.
  //     Kontrola ma go POKAZAĆ, ale synchronizacja NIE MA PRAWA go skasować —
  //     to cudza praca, a nie nasza kopia.
  const obcy = eval_php(`
    $id = wp_insert_post(["post_type"=>Aai_Sklep_Tutor::typy()["kurs"],"post_status"=>"draft","post_title"=>"KURS SPOZA KREATORA"]);
    echo (int) $id;
  `);
  const zObcym = kontrola();
  sprawdz(zObcym.kod === 1, "kontrola NIE zauważyła kursu zrobionego poza kreatorem");
  sprawdz((zObcym.dane?.roznice ?? []).some((r) => r.rodzaj === "obcy"), "kontrola nie nazwała obcego wpisu");
  wp("aai-sklep", "sync");
  rowne(
    eval_php(`echo get_post(${obcy}) ? "jest" : "nie ma";`),
    "jest",
    "synchronizacja skasowała CUDZY wpis — nie wolno jej tego robić"
  );
  eval_php(`wp_delete_post(${obcy}, true);`);

  /*
   * 10b. TEN SAM ZAKAZ, ALE W MIEJSCU, DO KTÓREGO SYNCHRONIZACJA SIĘGA.
   *
   * Sprawdzenie wyżej tworzy obcy wpis typu KURS, BEZ `post_parent` —
   * a `usun_nadmiar()` przeszukuje wyłącznie POTOMKÓW naszego kursu. Obiekt
   * bez rodzica jest więc strukturalnie poza jej zasięgiem i asercja
   * „synchronizacja skasowała CUDZY wpis" NIE MOGŁA SIĘ NIE UDAĆ. To był
   * dziewiąty w tym projekcie test przechodzący po pustce — i utrwalał
   * nieprawdę, bo repozytorium obiecuje w dwóch miejscach ochronę, której
   * kod NIE MIAŁ: wpis dodany w Course Builderze ma uuid pusty, a pusty uuid
   * nigdy nie był na liście „zostają", więc leciał `wp_delete_post(force)`.
   *
   * Ten przypadek zachodzi NAPRAWDĘ: właściciel dopisuje bonusową lekcję
   * w Course Builderze, wraca do kreatora, poprawia zdanie w opisie i klika
   * „Zapisz" — a lekcja znika bezpowrotnie razem z postępem klientów.
   * Mierzymy więc obcy MODUŁ pod naszym kursem i obcą LEKCJĘ pod naszym
   * modułem, czyli dokładnie te dwa miejsca, po których pętla chodzi.
   */
  const idKopii = Number(eval_php(`
    $k = get_posts(["post_type"=>Aai_Sklep_Tutor::typy()["kurs"],"post_status"=>array_keys(get_post_stati()),"numberposts"=>1,"fields"=>"ids","meta_key"=>"_aai_zrodlo_uuid","meta_value"=>"${KURS}"]);
    echo $k ? (int) $k[0] : 0;
  `));
  sprawdz(idKopii > 0, "nie znalazłem kopii kursu w Tutorze — sprawdzenie 10b nie miałoby gdzie umieścić cudzych wpisów");

  const naszModul = Number(eval_php(`
    $m = get_posts(["post_type"=>Aai_Sklep_Tutor::typy()["modul"],"post_status"=>array_keys(get_post_stati()),"numberposts"=>1,"fields"=>"ids","post_parent"=>${idKopii}]);
    echo $m ? (int) $m[0] : 0;
  `));
  sprawdz(naszModul > 0, "kopia kursu nie ma ani jednego modułu — nie ma pod czym powiesić cudzej lekcji");

  const obcyModul = Number(eval_php(`
    echo (int) wp_insert_post(["post_type"=>Aai_Sklep_Tutor::typy()["modul"],"post_status"=>"publish","post_title"=>"MODUŁ Z COURSE BUILDERA","post_parent"=>${idKopii}]);
  `));
  const obcaLekcja = Number(eval_php(`
    echo (int) wp_insert_post(["post_type"=>Aai_Sklep_Tutor::typy()["lekcja"],"post_status"=>"publish","post_title"=>"BONUSOWA LEKCJA Z COURSE BUILDERA","post_parent"=>${naszModul}]);
  `));
  sprawdz(obcyModul > 0 && obcaLekcja > 0, "nie udało się utworzyć cudzych wpisów POD kursem — bez nich 10b przechodzi po pustce");

  wp("aai-sklep", "sync");

  rowne(
    eval_php(`echo get_post(${obcaLekcja}) ? "jest" : "nie ma";`),
    "jest",
    "synchronizacja skasowała CUDZĄ LEKCJĘ dopisaną w Course Builderze pod NASZYM modułem — repozytorium obiecuje w dwóch miejscach, że tego nie robi, a klient traci lekcję razem z postępem tych, którzy ją odhaczyli"
  );
  rowne(
    eval_php(`echo get_post(${obcyModul}) ? "jest" : "nie ma";`),
    "jest",
    "synchronizacja skasowała CUDZY MODUŁ dopisany w Course Builderze pod naszym kursem"
  );

  eval_php(`wp_delete_post(${obcaLekcja}, true); wp_delete_post(${obcyModul}, true);`);

  // 11. Usunięcie kursu u nas kasuje całą kopię.
  const usuniecie = wp("aai-sklep", "usun", SLUG, "--pozwol-skasowac-tresc", "--aktor=smoke-tutor");
  sprawdz(usuniecie.kod === 0, `usunięcie kursu padło: ${usuniecie.stderr}`);
  kopia = kopiaWTutorze();
  rowne(kopia.kurs, null, "kurs skasowany u nas ma zniknąć z Tutora");
  rowne(Object.values(kopia.moduly).filter(Boolean).length, 0, "moduły skasowanego kursu mają zniknąć");
  rowne(Object.values(kopia.lekcje).filter(Boolean).length, 0, "lekcje skasowanego kursu mają zniknąć");
} finally {
  // Sprzątanie: kurs testowy znika także wtedy, gdy przebieg padł w połowie.
  wp("aai-sklep", "usun", SLUG, "--pozwol-skasowac-tresc", "--aktor=smoke-tutor");
  /*
   * Sprzątanie po uuid WYPISANYCH WPROST, nie po wspólnym przedrostku.
   * Przedrostek wygląda na sprytniejszy i właśnie dlatego zawiódł przy
   * pierwszym teście negatywnym tego smoke'a: uuid kursu ma inny układ zer
   * niż uuid modułów, więc kurs został w bazie jako sierota, a przebieg
   * zameldował po sobie porządek. Lista jest nudna i nie kłamie.
   */
  const doSprzatniecia = [KURS, ...MODUL, ...LEKCJA, "00000000-0000-4000-8000-000000000000"];
  eval_php(`
    $typy = Aai_Sklep_Tutor::typy();
    $nasze = ${JSON.stringify(doSprzatniecia)};
    foreach (get_posts(["post_type"=>array_values($typy),"post_status"=>"any","numberposts"=>-1]) as $p) {
      $uuid = (string) get_post_meta($p->ID, "_aai_zrodlo_uuid", true);
      if (in_array($uuid, $nasze, true) || "" === $uuid) {
        wp_delete_post($p->ID, true);
      }
    }
  `);
    /*
     * PRODUKT PO KURSIE TESTOWYM — sprzątamy TU, bo wtyczka tego nie robi
     * i nie ma prawa robić: „produktu nie kasujemy nigdy" (niezmiennik 13)
     * chroni historię zamówień i nie rozróżnia kupionych od niekupionych.
     * Skutek: każdy przebieg smoke'a, który tworzy kurs, zostawiałby
     * w sklepie sierotę — po kilku przebiegach bramki mierzyłyby już
     * własne śmieci. Test ma prawo skasować SWOJE dane.
     */
  eval_php(`
    if ( class_exists( "Aai_Platnosci_Tabele" ) ) {
      global $wpdb;
      $t = Aai_Platnosci_Tabele::tabela( "powiazania" );
      foreach ( ${JSON.stringify(doSprzatniecia)} as $uuid ) {
        $pid = (int) $wpdb->get_var( $wpdb->prepare( "SELECT product_id FROM {$t} WHERE course_uuid = %s", $uuid ) );
        if ( $pid > 0 ) { $wpdb->delete( $t, array( "product_id" => $pid ) ); wp_delete_post( $pid, true ); }
      }
    }
  `);
}

// 12. STAN KOŃCOWY: prawdziwe kursy nietknięte.
const po = kontrola();
sprawdz(po.kod === 0, `po przebiegu kopia prawdziwych kursów jest rozjechana: ${JSON.stringify(po.dane?.roznice ?? [])}`);
rowne(po.dane?.sprawdzonych, obiektowPrzed, "przebieg zmienił liczbę obiektów prawdziwych kursów");

if (bledy.length > 0) {
  console.error(`\nsmoke-wp-tutor: ${bledy.length} z ${sprawdzen} sprawdzeń nie przeszło:`);
  for (const b of bledy) console.error(`  ✖ ${b}`);
  process.exit(1);
}

console.log(
  `smoke-wp-tutor: ${sprawdzen} sprawdzeń zaliczonych — kopia powstaje, nadąża za każdą drogą zapisu, ` +
    `kasuje się razem z kursem, a kontrola widzi rozjazd, sierotę i wpis spoza kreatora.`
);
