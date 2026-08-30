/**
 * Smoke kreatora w kokpicie (krok W4) — bramki, runda zapis→odczyt, ochrona
 * napisanej treści.
 *
 * DLACZEGO PRZEZ PRAWDZIWE LOGOWANIE, A NIE PRZEZ WP-CLI. Bo pytanie brzmi
 * „czy panel działa dla człowieka", a człowiek przychodzi z ciastkiem sesji
 * i nonce'em z formularza. Zapis wywołany z wiersza poleceń ominąłby obie
 * bramki, których ten krok dotyczy — i test przechodziłby przy panelu
 * otwartym dla całego świata.
 *
 * PRZYKŁADOWĄ TREŚĆ GENERUJEMY Z OPISU PÓL (`wp aai-sklep opis --format=json`),
 * a nie z listy wpisanej tutaj. Mechanizm wprost z Działu 6 prototypu: pole
 * dopisane do kontraktu samo wchodzi do rundy „zapisz → odczytaj" i nikt nie
 * musi pamiętać o dopisaniu go do testu. Lista w teście zestarzałaby się przy
 * pierwszym nowym polu, a objaw byłby żaden.
 *
 * CO SPRAWDZAMY NA PRAWDZIWYCH KURSACH, A CO NA TESTOWYM. Na prawdziwych
 * WYŁĄCZNIE zapis bez zmian (dowód, że panel nie rusza prozy 73 lekcji) —
 * i to po sprawdzeniu, że jest idempotentny. Wszystko, co coś kasuje, dzieje
 * się na kursie testowym, który smoke sam zakłada i sam sprząta.
 *
 * WYMAGA lokalnego środowiska: `cd wordpress/srodowisko && ./postaw.sh`.
 * Nie wchodzi do CI — tam nie ma podmana.
 *
 * Użycie: node tools/smoke/smoke-wp-kreator.mjs
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { migawkaDziennika, sprzatnijDziennik, ileWpisow } from "./dziennik.mjs";

const ADRES = process.env.WP_ADRES ?? "http://127.0.0.1:8892";
const STACK = process.env.STACK_NAZWA ?? "aai_wp";
const KONTENER = `${STACK}_cli`;
const SLUG_TESTOWY = "smoke-kreator-kurs";
const LOGIN_BEZ_PRAW = "smoke-kreator-gosc";

const bledy = [];
let sprawdzen = 0;
const sprawdz = (warunek, opis) => {
  sprawdzen += 1;
  if (!warunek) bledy.push(opis);
};

/** Komenda WordPressa w kontenerze. */
function wp(...argumenty) {
  return execFileSync("podman", ["exec", KONTENER, "wp", "--path=/var/www/html", ...argumenty], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

const sql = (zapytanie) => wp("db", "query", zapytanie, "--skip-column-names").trim();

/* ————————————————————————— sesja ————————————————————————— */

/** Osobna sesja = osobny słoik ciastek. Inaczej „gość" byłby administratorem. */
function sesja() {
  const ciastka = new Map();

  const zapamietaj = (odpowiedz) => {
    for (const [nazwa, wartosc] of odpowiedz.headers) {
      if (nazwa.toLowerCase() !== "set-cookie") continue;
      for (const kawalek of wartosc.split(/,(?=[^;]+?=)/)) {
        const [para] = kawalek.split(";");
        const rowna = para.indexOf("=");
        ciastka.set(para.slice(0, rowna).trim(), para.slice(rowna + 1).trim());
      }
    }
  };

  const pobierz = async (sciezka, opcje = {}) => {
    const odpowiedz = await fetch(ADRES + sciezka, {
      ...opcje,
      redirect: "manual",
      headers: {
        ...(opcje.headers ?? {}),
        cookie: [...ciastka].map(([k, v]) => `${k}=${v}`).join("; "),
      },
    });
    zapamietaj(odpowiedz);
    return odpowiedz;
  };

  return {
    pobierz,
    async zaloguj(login, haslo) {
      await pobierz("/wp-login.php");
      const odpowiedz = await pobierz("/wp-login.php", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          log: login,
          pwd: haslo,
          "wp-submit": "Zaloguj",
          redirect_to: `${ADRES}/wp-admin/`,
          testcookie: "1",
        }).toString(),
      });
      return [...ciastka.keys()].some((k) => k.startsWith("wordpress_logged_in"));
    },
    async wyslij(dane) {
      return pobierz("/wp-admin/admin-post.php", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(dane).toString(),
      });
    },
  };
}

const HASLO = Object.fromEntries(
  readFileSync("wordpress/srodowisko/.env", "utf8")
    .split("\n")
    .filter(Boolean)
    .map((linia) => linia.split("=").map((s) => s.trim()))
).WP_ADMIN_HASLO;

/* ————————————————————————— pomocnicze ————————————————————————— */

const odKodu = (s) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

/** Wartość pola ukrytego z formularza. */
const pole = (html, nazwa) => {
  const dopasowanie =
    html.match(new RegExp(`name="${nazwa}"[^>]*value="([^"]*)"`)) ||
    html.match(new RegExp(`value="([^"]*)"[^>]*name="${nazwa}"`));
  return dopasowanie ? odKodu(dopasowanie[1]) : "";
};

/**
 * Nonce z KONKRETNEGO formularza.
 *
 * Lista kursów ma po kilka formularzy na wiersz (publikuj, ukryj, usuń),
 * każdy z własnym nonce'em. Branie pierwszego z brzegu działało dla akcji
 * stanu i wywalało usuwanie na 403 — objaw wyglądał jak brak uprawnień,
 * a był pomyłką testu.
 */
const nonceAkcji = (html, akcja) => {
  for (const kawalek of html.split("<form")) {
    if (kawalek.includes(`value="${akcja}"`)) {
      const dopasowanie = kawalek.match(/name="_wpnonce"[^>]*value="([^"]*)"/);
      if (dopasowanie) return odKodu(dopasowanie[1]);
    }
  }
  return "";
};

/** Kod komunikatu z przekierowania po zapisie. */
const komunikat = (odpowiedz) => {
  const dokad = odpowiedz.headers.get("location") ?? "";
  const dopasowanie = dokad.match(/aai_komunikat=([a-z_]+)/);
  return dopasowanie ? dopasowanie[1] : `(${odpowiedz.status} → ${dokad})`;
};

/** HTML bez `<script>` — do pytań „czy człowiek to widzi". */
const widoczne = (html) => html.replace(/<script[\s\S]*?<\/script>/gi, "");

/**
 * Przykładowa treść jednego pola — Z OPISU, nie z listy.
 *
 * Adres celowo wskazuje `automaticai.pl`: domena docelowa jest jeszcze
 * niekupiona, więc ten sam przypadek, na którym poległ BLAD-017. Przechodzi
 * tylko wtedy, gdy kontrakt pyta „czy wolno to wydrukować", a nie „czy da się
 * pod to wysłać żądanie".
 */
function przykladowa(nazwa, opis, ziarno) {
  switch (opis.typ) {
    case "adres":
      return `https://automaticai.pl/proba-${ziarno}`;
    case "adres_lub_sciezka":
      return `/dodatki/proba-${ziarno}.pdf`;
    case "wybor":
      return Object.keys(opis.opcje ?? {})[0] ?? "";
    case "lista_tekstow":
      return [`${nazwa} — pozycja 1 (${ziarno})`, `${nazwa} — pozycja 2 (${ziarno})`];
    case "lista_obiektow":
      return [0, 1].map((nr) => przykladowaTresc(opis.pola, `${ziarno}-${nr}`));
    case "obiekt":
      return przykladowaTresc(opis.pola, ziarno);
    default:
      return `${nazwa}: próbka treści (${ziarno})`;
  }
}

/** Przykładowa treść kompletu pól. */
function przykladowaTresc(pola, ziarno) {
  const tresc = {};
  for (const [nazwa, opis] of Object.entries(pola)) {
    tresc[nazwa] = przykladowa(nazwa, opis, ziarno);
  }
  return tresc;
}

/* ————————————————————————— start ————————————————————————— */

console.log(`smoke-wp-kreator: ${ADRES}`);

/*
 * HIGIENA DZIENNIKA LOGOWAŃ (N13). Ta bramka loguje się do instalacji,
 * więc od kroku T2 KAŻDY jej przebieg zostawia wpisy w dzienniku
 * Pluginu 3 — zmierzone. Bez sprzątania licznik nieudanych prób
 * z 7 dni, czyli jedyna funkcja alarmowa ekranu monitoringu, pokazywałby
 * serie wyprodukowane przez nasze własne testy.
 */
const _dziennikPrzed = ileWpisow((k) => wp("eval", k));
const _dziennikMigawka = migawkaDziennika((k) => wp("eval", k));

const OPIS = JSON.parse(wp("aai-sklep", "opis", "--format=json").trim());
sprawdz(
  Object.keys(OPIS.sekcje).length >= 12,
  `opis pól zna tylko ${Object.keys(OPIS.sekcje).length} rodzajów sekcji — oczekiwano co najmniej 12`
);

const admin = sesja();
sprawdz(await admin.zaloguj("admin", HASLO), "nie udało się zalogować jako admin");

/*
 * SPRZĄTANIE PO POPRZEDNIM PRZEBIEGU. Padnięty smoke zostawia kurs próbny
 * w bazie, a wtedy następny przebieg wywala się na zajętym slugu i pokazuje
 * błąd, który z badaną rzeczą nie ma nic wspólnego. Lekcja z pomiarów PSI
 * (0.25.0), gdzie dokładnie tak zostawały kursy `smoke-podglad-*`.
 */
if (sql(`SELECT COUNT(*) FROM wp_aai_sklep_courses WHERE slug = '${SLUG_TESTOWY}'`) !== "0") {
  wp("aai-sklep", "usun", SLUG_TESTOWY, "--pozwol-skasowac-tresc", "--aktor=smoke-sprzatanie");
}

/* ————————————————— 1. BRAMKI: gość i konto bez uprawnień ————————————————— */

const gosc = sesja();
for (const strona of ["aai-sklep", "aai-sklep-kurs", "aai-sklep-lekcja"]) {
  const odpowiedz = await gosc.pobierz(`/wp-admin/admin.php?page=${strona}`);
  sprawdz(
    odpowiedz.status === 302 || odpowiedz.status === 403,
    `gość wchodzi na ${strona} i dostaje ${odpowiedz.status} — oczekiwano przekierowania na logowanie albo 403`
  );
}

// Konto bez uprawnień: rola „subscriber" to najbliższy odpowiednik przyszłego
// klienta kursu — ma konto w tym samym WordPressie, w którym stoi sklep.
// Konto mogło zostać po przerwanym przebiegu — kasujemy bez robienia
// z tego błędu i bez straszenia ostrzeżeniem, gdy nie było czego kasować.
if (wp("user", "list", "--field=user_login").split("\n").includes(LOGIN_BEZ_PRAW)) {
  wp("user", "delete", LOGIN_BEZ_PRAW, "--yes");
}
const HASLO_GOSCIA = "Smoke-" + sql("SELECT UUID()").slice(0, 12);
wp("user", "create", LOGIN_BEZ_PRAW, `${LOGIN_BEZ_PRAW}@example.test`, "--role=subscriber", `--user_pass=${HASLO_GOSCIA}`);

const kursant = sesja();
sprawdz(await kursant.zaloguj(LOGIN_BEZ_PRAW, HASLO_GOSCIA), "nie udało się zalogować konta bez uprawnień");
for (const strona of ["aai-sklep", "aai-sklep-kurs"]) {
  const odpowiedz = await kursant.pobierz(`/wp-admin/admin.php?page=${strona}`);
  sprawdz(
    odpowiedz.status === 403,
    `konto bez uprawnień wchodzi na ${strona} i dostaje ${odpowiedz.status} — oczekiwano 403`
  );
}

/* ————————————————— 2. NOWY KURS ————————————————— */

const formularzNowego = await (await admin.pobierz("/wp-admin/admin.php?page=aai-sklep-kurs")).text();
const nonceKursu = pole(formularzNowego, "_wpnonce");
sprawdz(nonceKursu !== "", "formularz nowego kursu nie ma nonce'a");

// Nonce sam nie wystarczy, a jego brak nie może przechodzić.
for (const [nazwa, zly] of [
  ["bez nonce'a", ""],
  ["ze złym nonce'em", "0000000000"],
]) {
  const odpowiedz = await admin.wyslij({
    action: "aai_sklep_zapisz_kurs",
    _wpnonce: zly,
    id: "",
    title: "Próba bez bramki",
    slug: "proba-bez-bramki",
    type: "kurs",
    status: "draft",
    cena_zl: "1",
  });
  sprawdz(
    odpowiedz.status === 403,
    `zapis ${nazwa} oddał ${odpowiedz.status} — oczekiwano 403`
  );
}
sprawdz(
  sql("SELECT COUNT(*) FROM wp_aai_sklep_courses WHERE slug = 'proba-bez-bramki'") === "0",
  "zapis bez poprawnego nonce'a mimo wszystko utworzył kurs"
);

const sekcjeProbne = Object.entries(OPIS.sekcje).map(([rodzaj, dane]) => ({
  id: "",
  kind: rodzaj,
  content: przykladowaTresc(dane.pola, rodzaj),
}));

const programProbny = [
  {
    id: "",
    position: 0,
    title: "Moduł próbny",
    summary: "Opis modułu próbnego.",
    lekcje: [
      { id: "", position: 0, title: "Lekcja pierwsza", duration_min: 15, preview: true },
      { id: "", position: 1, title: "Lekcja druga", duration_min: null, preview: false },
    ],
  },
];

const utworzenie = await admin.wyslij({
  action: "aai_sklep_zapisz_kurs",
  _wpnonce: nonceKursu,
  id: "",
  zakladka: "kurs",
  title: "Kurs próbny smoke'a",
  slug: SLUG_TESTOWY,
  type: "kurs",
  status: "draft",
  short_desc: "Kurs zakładany przez smoke i przez niego sprzątany.",
  cena_zl: "199,90",
  level: "podstawowy",
  badge: "Próba",
  cover_url: "/okladki/proba.svg",
  pozwol_skasowac_tresc: "0",
  sekcje: JSON.stringify(sekcjeProbne),
  moduly: JSON.stringify(programProbny),
});
sprawdz(komunikat(utworzenie) === "zapisano", `utworzenie kursu: ${komunikat(utworzenie)}`);

const idKursu = sql(`SELECT id FROM wp_aai_sklep_courses WHERE slug = '${SLUG_TESTOWY}'`);
sprawdz(idKursu !== "", "kursu próbnego nie ma w bazie po zapisie");

// Cena: właściciel pisze złotówki, baza trzyma grosze (BLAD-005 prototypu —
// „199,90" nie ma prawa zapisać się jako 0 ani jako 19989).
sprawdz(
  sql(`SELECT price_grosze FROM wp_aai_sklep_courses WHERE id = '${idKursu}'`) === "19990",
  `cena „199,90 zł" zapisana jako ${sql(`SELECT price_grosze FROM wp_aai_sklep_courses WHERE id = '${idKursu}'`)} groszy zamiast 19990`
);

/* ————————————————— 3. RUNDA ZAPIS → ODCZYT dla wszystkich rodzajów ————————————————— */

const stan = JSON.parse(wp("aai-sklep", "sprawdz", "--format=json").trim());
const kursZBazy = stan.kursy.find((k) => k.slug === SLUG_TESTOWY);
sprawdz(kursZBazy !== undefined, "kursu próbnego nie ma w raporcie bazy");

if (kursZBazy) {
  sprawdz(
    kursZBazy.sekcje.length === sekcjeProbne.length,
    `zapisano ${kursZBazy.sekcje.length} sekcji z ${sekcjeProbne.length}`
  );

  for (const wyslana of sekcjeProbne) {
    const zBazy = kursZBazy.sekcje.find((s) => s.kind === wyslana.kind);
    if (!zBazy) {
      sprawdz(false, `sekcja „${wyslana.kind}" nie doszła do bazy`);
      continue;
    }
    // Porównanie POLE PO POLU: różnica na jednym polu ma wskazywać to pole,
    // a nie mówić „sekcje się różnią".
    //
    // STRUKTURALNIE, nie po napisie: od BLAD-020 warstwa zapisu porządkuje
    // klucze map, żeby „czy się zmieniło" nie zależało od tego, kto akurat
    // pisze. Porównanie łańcuchów widziałoby tu inną kolejność kluczy jako
    // inną treść — czyli pytałoby o zapis, a nie o wartość.
    for (const [nazwa, wartosc] of Object.entries(wyslana.content)) {
      sprawdz(
        isDeepStrictEqual(zBazy.content[nazwa], wartosc),
        `sekcja „${wyslana.kind}", pole „${nazwa}": zapisano ${JSON.stringify(zBazy.content[nazwa])}, wysłano ${JSON.stringify(wartosc)}`
      );
    }
  }

  sprawdz(kursZBazy.moduly.length === 1, `zapisano ${kursZBazy.moduly.length} modułów zamiast 1`);
  sprawdz(
    (kursZBazy.moduly[0]?.lekcje ?? []).length === 2,
    `zapisano ${(kursZBazy.moduly[0]?.lekcje ?? []).length} lekcji zamiast 2`
  );
}

/* ————————————————— 4. TREŚĆ LEKCJI ————————————————— */

const idLekcji = sql(
  `SELECT l.id FROM wp_aai_sklep_lessons l JOIN wp_aai_sklep_modules m ON m.id = l.module_id
    WHERE m.course_id = '${idKursu}' ORDER BY l.position LIMIT 1`
);
sprawdz(idLekcji !== "", "nie znalazłem lekcji kursu próbnego");

const ekranLekcji = await (await admin.pobierz(`/wp-admin/admin.php?page=aai-sklep-lekcja&id=${idLekcji}`)).text();
const nonceLekcji = pole(ekranLekcji, "_wpnonce");
sprawdz(nonceLekcji !== "", "edytor lekcji nie ma nonce'a");

/*
 * TREŚĆ Z PUŁAPKAMI. Backslash sprawdza `wp_unslash` (WordPress dokłada
 * ukośniki do `$_POST`, więc bez niego `C:\\Users` zapisałoby się jako
 * `C:\\\\Users` — cicha zmiana treści kursu o Gicie). Znak spoza BMP sprawdza
 * kolację `utf8mb4`. Puste linie sprawdzają, że treść NIE idzie przez
 * `sanitize_text_field`, które skleiłoby Markdown w jedną linię.
 */
const TRESC_PROBNA = [
  "## Lekcja próbna",
  "",
  'Ścieżka Windows: `C:\\Users\\krzysiek\\projekt` — backslash ma przeżyć zapis.',
  "",
  'Cudzysłowy: "podwójne" i \'pojedyncze\', ampersand & znacznik <b>.',
  "",
  "Sekwencja z kursu o Gicie: `\\n` w cudzysłowie, `git log --pretty=\"%h %s\"`.",
  "",
  "Emoji spoza BMP: 🚀 — kolacja utf8mb4 albo nic.",
].join("\n");

const materialyProbne = [
  { rodzaj: "pdf", tytul: "Ściągawka próbna", url: "/dodatki/sciagawka.pdf", opis: "Dodatek do lekcji." },
  { rodzaj: "link", tytul: "Dokumentacja", url: "https://automaticai.pl/dokumentacja", opis: "" },
];

const zapisLekcji = await admin.wyslij({
  action: "aai_sklep_zapisz_lekcje",
  _wpnonce: nonceLekcji,
  id: idLekcji,
  tresc: TRESC_PROBNA,
  materialy: JSON.stringify(materialyProbne),
});
sprawdz(komunikat(zapisLekcji) === "zapisano_lekcje", `zapis treści lekcji: ${komunikat(zapisLekcji)}`);

const zBazy = JSON.parse(
  wp(
    "eval",
    `global $wpdb; $w = $wpdb->get_row($wpdb->prepare("SELECT content, materials FROM wp_aai_sklep_lessons WHERE id = %s", "${idLekcji}"), ARRAY_A); echo wp_json_encode($w);`
  ).trim()
);
sprawdz(
  zBazy.content === TRESC_PROBNA,
  `treść lekcji wróciła zmieniona (${zBazy.content.length} znaków wobec ${TRESC_PROBNA.length}); pierwsza różnica: ${
    [...TRESC_PROBNA].findIndex((z, i) => z !== zBazy.content[i])
  }`
);
sprawdz(
  isDeepStrictEqual(
    JSON.parse(zBazy.materials),
    materialyProbne.map((m) => (m.opis === "" ? { rodzaj: m.rodzaj, tytul: m.tytul, url: m.url } : m))
  ),
  `materiały wróciły inne: ${zBazy.materials}`
);

// Zapis treści nie ma prawa ruszyć programu ani sekcji.
sprawdz(
  sql(`SELECT COUNT(*) FROM wp_aai_sklep_sections WHERE course_id = '${idKursu}'`) === String(sekcjeProbne.length),
  "zapis treści lekcji zmienił liczbę sekcji kursu"
);
sprawdz(
  sql(
    `SELECT COUNT(*) FROM wp_aai_sklep_lessons l JOIN wp_aai_sklep_modules m ON m.id = l.module_id WHERE m.course_id = '${idKursu}'`
  ) === "2",
  "zapis treści lekcji zmienił liczbę lekcji"
);

/* ————————————————— 5. ZAPIS PROGRAMU NIE RUSZA PROZY ————————————————— */

const formularzKursu = await (await admin.pobierz(`/wp-admin/admin.php?page=aai-sklep-kurs&id=${idKursu}`)).text();
const program = JSON.parse(pole(formularzKursu, "moduly"));
sprawdz(
  program.every((m) => m.lekcje.every((l) => !("content" in l) && !("materials" in l))),
  "panel wysyła treść lekcji razem z programem — zapis programu mógłby ją nadpisać"
);

program[0].lekcje[0].title = "Lekcja pierwsza (poprawiony tytuł)";
const zapisProgramu = await admin.wyslij({
  action: "aai_sklep_zapisz_kurs",
  _wpnonce: pole(formularzKursu, "_wpnonce"),
  id: idKursu,
  zakladka: "program",
  title: "Kurs próbny smoke'a",
  slug: SLUG_TESTOWY,
  type: "kurs",
  status: "draft",
  cena_zl: "199,90",
  pozwol_skasowac_tresc: "0",
  sekcje: pole(formularzKursu, "sekcje"),
  moduly: JSON.stringify(program),
});
sprawdz(komunikat(zapisProgramu) === "zapisano", `zapis programu: ${komunikat(zapisProgramu)}`);
sprawdz(
  sql(`SELECT content FROM wp_aai_sklep_lessons WHERE id = '${idLekcji}'`).length > 0 &&
    JSON.parse(
      wp("eval", `global $wpdb; echo wp_json_encode($wpdb->get_var($wpdb->prepare("SELECT content FROM wp_aai_sklep_lessons WHERE id = %s", "${idLekcji}")));`).trim()
    ) === TRESC_PROBNA,
  "zapis programu ZMIENIŁ napisaną treść lekcji"
);
sprawdz(
  sql(`SELECT title FROM wp_aai_sklep_lessons WHERE id = '${idLekcji}'`) === "Lekcja pierwsza (poprawiony tytuł)",
  "zapis programu nie zmienił tytułu lekcji"
);

/* ————————————————— 6. ODMOWA SKASOWANIA NAPISANEJ TREŚCI ————————————————— */

const bezLekcji = JSON.parse(JSON.stringify(program));
bezLekcji[0].lekcje = bezLekcji[0].lekcje.filter((l) => l.id !== idLekcji);

const wysylkaKasujaca = {
  action: "aai_sklep_zapisz_kurs",
  _wpnonce: pole(formularzKursu, "_wpnonce"),
  id: idKursu,
  zakladka: "program",
  title: "Kurs próbny smoke'a",
  slug: SLUG_TESTOWY,
  type: "kurs",
  status: "draft",
  cena_zl: "199,90",
  sekcje: pole(formularzKursu, "sekcje"),
  moduly: JSON.stringify(bezLekcji),
};

const odmowa = await admin.wyslij({ ...wysylkaKasujaca, pozwol_skasowac_tresc: "0" });
sprawdz(komunikat(odmowa) === "odmowa_tresci", `zapis kasujący treść bez zgody: ${komunikat(odmowa)}`);
sprawdz(
  sql(`SELECT COUNT(*) FROM wp_aai_sklep_lessons WHERE id = '${idLekcji}'`) === "1",
  "odmowa nie zadziałała — lekcja z treścią zniknęła mimo braku zgody"
);
sprawdz(
  (odmowa.headers.get("location") ?? "").includes("aai_ile=1"),
  "odmowa nie podała LICZBY lekcji z treścią — właściciel nie wie, o co dokładnie jest pytany"
);

const zeZgoda = await admin.wyslij({ ...wysylkaKasujaca, pozwol_skasowac_tresc: "1" });
sprawdz(komunikat(zeZgoda) === "zapisano", `zapis kasujący treść ZE zgodą: ${komunikat(zeZgoda)}`);
sprawdz(
  sql(`SELECT COUNT(*) FROM wp_aai_sklep_lessons WHERE id = '${idLekcji}'`) === "0",
  "jawna zgoda nie skasowała lekcji"
);

/* ————————————————— 7. STAN KURSU I WYCIEK TREŚCI ————————————————— */

const listaKursow = await (await admin.pobierz("/wp-admin/admin.php?page=aai-sklep")).text();
const publikacja = await admin.wyslij({
  action: "aai_sklep_stan_kursu",
  _wpnonce: nonceAkcji(listaKursow, "aai_sklep_stan_kursu"),
  id: idKursu,
  status: "published",
});
sprawdz(komunikat(publikacja) === "opublikowano", `publikacja kursu: ${komunikat(publikacja)}`);
sprawdz(
  sql(`SELECT status FROM wp_aai_sklep_courses WHERE id = '${idKursu}'`) === "published",
  "publikacja nie zmieniła stanu w bazie"
);

/*
 * ZAPIS ZE STARSZEJ KARTY NIE COFA PUBLIKACJI.
 *
 * Znalezisko z przeglądu W4: formularz edytora niósł stan kursu, więc
 * wystarczyło mieć go otwartego przed publikacją, żeby poprawka jednego
 * zdania CICHO wyrzuciła kurs z katalogu — z komunikatem „zapisano".
 * Formularz `poEdycji` jest tu celowo pobrany PO publikacji, ale sprawdzamy
 * przede wszystkim, że pola stanu w nim NIE MA.
 */
const poEdycji = await (await admin.pobierz(`/wp-admin/admin.php?page=aai-sklep-kurs&id=${idKursu}`)).text();
sprawdz(
  !/name="status"/.test(poEdycji),
  "formularz edytora niesie stan kursu — zapis ze starszej karty cofnie publikację"
);
const zapisBezStanu = await admin.wyslij({
  action: "aai_sklep_zapisz_kurs",
  _wpnonce: pole(poEdycji, "_wpnonce"),
  id: idKursu,
  zakladka: "kurs",
  title: "Kurs próbny smoke'a (po publikacji)",
  slug: SLUG_TESTOWY,
  type: "kurs",
  cena_zl: "199,90",
  pozwol_skasowac_tresc: "0",
  sekcje: pole(poEdycji, "sekcje"),
  moduly: pole(poEdycji, "moduly"),
});
sprawdz(
  ["zapisano", "bez_zmian"].includes(komunikat(zapisBezStanu)),
  `zapis bez pola stanu: ${komunikat(zapisBezStanu)}`
);
sprawdz(
  sql(`SELECT status FROM wp_aai_sklep_courses WHERE id = '${idKursu}'`) === "published",
  "zapis kursu COFNĄŁ publikację — kurs wypadł z katalogu bez słowa"
);

// Materiał kursu jest towarem: na publicznych stronach ma go NIE BYĆ.
// Sprawdzamy w HTML-u BEZ <script> — dane strukturalne potrafiłyby
// „usprawiedliwić" treść, której człowiek na stronie nie widzi.
const drugaLekcja = sql(
  `SELECT l.id FROM wp_aai_sklep_lessons l JOIN wp_aai_sklep_modules m ON m.id = l.module_id
    WHERE m.course_id = '${idKursu}' LIMIT 1`
);
if (drugaLekcja !== "") {
  const ekran = await (await admin.pobierz(`/wp-admin/admin.php?page=aai-sklep-lekcja&id=${drugaLekcja}`)).text();
  await admin.wyslij({
    action: "aai_sklep_zapisz_lekcje",
    _wpnonce: pole(ekran, "_wpnonce"),
    id: drugaLekcja,
    tresc: "ZNACZNIK-WYCIEKU-TRESCI-LEKCJI",
    materialy: "[]",
  });
}
for (const sciezka of ["/szkolenia/", `/szkolenia/${SLUG_TESTOWY}/`]) {
  const odpowiedz = await gosc.pobierz(sciezka);
  const html = odpowiedz.status === 200 ? widoczne(await odpowiedz.text()) : "";
  sprawdz(
    !html.includes("ZNACZNIK-WYCIEKU-TRESCI-LEKCJI"),
    `treść lekcji wycieka na publiczną stronę ${sciezka}`
  );
}

/* ————————————————— 8. ZŁE WEJŚCIE ————————————————— */

// Adres zajęty przez PRAWDZIWY kurs — komunikat ma wskazywać pole `slug`,
// a nie mówić „zapis się nie powiódł".
const prawdziwySlug = stan.kursy.find((k) => k.slug !== SLUG_TESTOWY)?.slug ?? "jak-korzystac-z-claude";

const zleWejscia = [
  ["slug z wielkimi literami", { slug: "Zly Slug" }],
  ["cena, która nie jest liczbą", { cena_zl: "dużo" }],
  ["pusty tytuł", { title: "" }],
  ["nieznany poziom", { level: "mistrzowski" }],
  ["adres zajęty przez inny kurs", { slug: prawdziwySlug }],
  // Adres NASZEJ podstrony: `/szkolenia/moje/` to lista kupionych kursów,
  // a jej reguła przepisywania jest sprawdzana przed regułą slugu. Kurs
  // o takim slugu wszedłby do katalogu i miał kartę, ale jego strona
  // sprzedażowa nie istniałaby — klient klikałby kartę i lądował na cudzej
  // liście, bez żadnego objawu (200, dane poprawne).
  ["adres zajęty przez stronę sklepu", { slug: "moje" }],
];
/*
 * WYSYŁKA MUSI BYĆ POZA TYM JEDNYM BŁĘDEM POPRAWNA — inaczej test jest ślepy.
 * Do W6 ten blok nie niósł `sekcje` ani `moduly` i wszystkie przypadki
 * przechodziły z TEGO powodu, a nie z powodu błędu, który nazywają.
 * Sprawdzone uruchomieniowo: po wyłączeniu odmowy dla zajętego slugu blok
 * dalej był zielony. Dlatego dokładamy prawidłowe pola i dopiero wtedy
 * pojedyncza usterka ma szansę zdecydować o wyniku.
 */
for (const [nazwa, nadpisanie] of zleWejscia) {
  const odpowiedz = await admin.wyslij({
    action: "aai_sklep_zapisz_kurs",
    _wpnonce: pole(formularzKursu, "_wpnonce"),
    id: idKursu,
    zakladka: "kurs",
    title: "Kurs próbny smoke'a",
    slug: SLUG_TESTOWY,
    type: "kurs",
    status: "published",
    cena_zl: "199,90",
    sekcje: pole(formularzKursu, "sekcje"),
    moduly: pole(formularzKursu, "moduly"),
    pozwol_skasowac_tresc: "0",
    ...nadpisanie,
  });
  sprawdz(komunikat(odpowiedz) === "bledy", `${nazwa}: kontrakt przepuścił (${komunikat(odpowiedz)})`);
}

// Adres z niebezpiecznym schematem nie ma prawa dojechać do szablonu,
// ale adres do NIEKUPIONEJ jeszcze domeny musi przejść (BLAD-017).
const zAdresami = [
  ["javascript: w linku autora", "javascript:alert(1)", "bledy"],
  ["login i hasło w adresie", "https://ktos:tajne@zly.host/", "bledy"],
  ["niekupiona domena docelowa", "https://automaticai.pl/portfolio", "zapisano"],
];
for (const [nazwa, adres, oczekiwany] of zAdresami) {
  const sekcje = JSON.parse(pole(formularzKursu, "sekcje")).map((s) =>
    s.kind === "author" ? { ...s, content: { ...s.content, link: { url: adres, etykieta: "Dowody" } } } : s
  );
  const odpowiedz = await admin.wyslij({
    action: "aai_sklep_zapisz_kurs",
    _wpnonce: pole(formularzKursu, "_wpnonce"),
    id: idKursu,
    zakladka: "sekcje",
    title: "Kurs próbny smoke'a",
    slug: SLUG_TESTOWY,
    type: "kurs",
    status: "published",
    cena_zl: "199,90",
    pozwol_skasowac_tresc: "1",
    sekcje: JSON.stringify(sekcje),
    moduly: pole(formularzKursu, "moduly"),
  });
  sprawdz(
    komunikat(odpowiedz) === oczekiwany,
    `${nazwa}: oczekiwano „${oczekiwany}", dostałem „${komunikat(odpowiedz)}"`
  );
}

/* ————————————————— 9. PRAWDZIWE KURSY: ZAPIS BEZ ZMIAN ————————————————— */

const prawdziwe = stan.kursy.filter((k) => k.slug !== SLUG_TESTOWY);
for (const kurs of prawdziwe) {
  const przed = {
    tresc: sql(
      `SELECT SHA2(GROUP_CONCAT(l.content ORDER BY l.id SEPARATOR '|'),256) FROM wp_aai_sklep_lessons l
         JOIN wp_aai_sklep_modules m ON m.id = l.module_id WHERE m.course_id = '${kurs.id}'`
    ),
    lekcji: sql(
      `SELECT COUNT(*) FROM wp_aai_sklep_lessons l JOIN wp_aai_sklep_modules m ON m.id = l.module_id
        WHERE m.course_id = '${kurs.id}'`
    ),
    pozycje: sql(
      `SELECT SHA2(GROUP_CONCAT(CONCAT(l.id,':',l.position) ORDER BY l.id SEPARATOR '|'),256) FROM wp_aai_sklep_lessons l
         JOIN wp_aai_sklep_modules m ON m.id = l.module_id WHERE m.course_id = '${kurs.id}'`
    ),
  };

  const html = await (await admin.pobierz(`/wp-admin/admin.php?page=aai-sklep-kurs&id=${kurs.id}`)).text();
  const wyslane = {
    action: "aai_sklep_zapisz_kurs",
    _wpnonce: pole(html, "_wpnonce"),
    id: kurs.id,
    zakladka: "kurs",
    title: kurs.title,
    slug: kurs.slug,
    type: kurs.type,
    status: kurs.status,
    short_desc: kurs.short_desc ?? "",
    cena_zl: String(kurs.price_grosze / 100).replace(".", ","),
    level: kurs.level ?? "",
    badge: kurs.badge ?? "",
    cover_url: kurs.cover_url ?? "",
    pozwol_skasowac_tresc: "0",
    sekcje: pole(html, "sekcje"),
    moduly: pole(html, "moduly"),
  };

  // Liczba pól POST kontra `max_input_vars`: dowód, że wysyłka NIE MOŻE
  // zostać ucięta w milczeniu, choćby kurs miał 41 lekcji.
  const limit = Number(wp("eval", "echo (int) ini_get('max_input_vars');").trim() || 1000);
  sprawdz(
    Object.keys(wyslane).length * 4 < limit,
    `wysyłka kursu „${kurs.slug}" ma ${Object.keys(wyslane).length} pól przy max_input_vars=${limit} — za blisko sufitu, przy którym PHP ucina POST bez słowa`
  );

  const odpowiedz = await admin.wyslij(wyslane);
  sprawdz(
    ["zapisano", "bez_zmian"].includes(komunikat(odpowiedz)),
    `zapis kursu „${kurs.slug}" bez zmian: ${komunikat(odpowiedz)}`
  );

  for (const [co, wartosc] of Object.entries(przed)) {
    const teraz = sql(
      co === "tresc"
        ? `SELECT SHA2(GROUP_CONCAT(l.content ORDER BY l.id SEPARATOR '|'),256) FROM wp_aai_sklep_lessons l
             JOIN wp_aai_sklep_modules m ON m.id = l.module_id WHERE m.course_id = '${kurs.id}'`
        : co === "lekcji"
          ? `SELECT COUNT(*) FROM wp_aai_sklep_lessons l JOIN wp_aai_sklep_modules m ON m.id = l.module_id
              WHERE m.course_id = '${kurs.id}'`
          : `SELECT SHA2(GROUP_CONCAT(CONCAT(l.id,':',l.position) ORDER BY l.id SEPARATOR '|'),256) FROM wp_aai_sklep_lessons l
               JOIN wp_aai_sklep_modules m ON m.id = l.module_id WHERE m.course_id = '${kurs.id}'`
    );
    sprawdz(teraz === wartosc, `zapis kursu „${kurs.slug}" zmienił ${co} (${wartosc} → ${teraz})`);
  }
}

/* ————————————————— 10. SPRZĄTANIE ————————————————— */

const usuniecie = await admin.wyslij({
  action: "aai_sklep_usun_kurs",
  _wpnonce: nonceAkcji(listaKursow, "aai_sklep_usun_kurs"),
  id: idKursu,
  pozwol_skasowac_tresc: "1",
});
sprawdz(komunikat(usuniecie) === "usunieto", `usunięcie kursu próbnego: ${komunikat(usuniecie)}`);
sprawdz(
  sql(`SELECT COUNT(*) FROM wp_aai_sklep_courses WHERE slug = '${SLUG_TESTOWY}'`) === "0",
  "kurs próbny został w bazie — smoke po sobie nie posprzątał"
);
sprawdz(
  sql(`SELECT COUNT(*) FROM wp_aai_sklep_lessons l JOIN wp_aai_sklep_modules m ON m.id = l.module_id WHERE m.course_id = '${idKursu}'`) === "0",
  "po usunięciu kursu próbnego zostały jego lekcje"
);

wp("user", "delete", LOGIN_BEZ_PRAW, "--yes");

/* ————————————————————————— wynik ————————————————————————— */

/*
 * PRODUKT PO KURSIE TESTOWYM — sprzątamy TU, bo wtyczka tego nie robi
 * i nie ma prawa robić: „produktu nie kasujemy nigdy" (niezmiennik 13
 * Pluginu 2) chroni historię zamówień i nie rozróżnia kupionych od
 * niekupionych. Bez tego każdy przebieg zostawiałby w sklepie sierotę
 * — po kilku przebiegach bramki mierzyłyby własne śmieci. Test ma prawo
 * skasować SWOJE dane; to ta sama zasada, dla której kasuje kurs wyżej.
 */
wp(
  "eval",
  `if ( class_exists( "Aai_Platnosci_Tabele" ) ) {
    global $wpdb; $t = Aai_Platnosci_Tabele::tabela( "powiazania" );
    foreach ( $wpdb->get_results( "SELECT course_uuid, product_id FROM {$t}", ARRAY_A ) as $w ) {
      if ( null === Aai_Sklep_Odczyt::kurs_po_id( (string) $w["course_uuid"] ) ) {
        $wpdb->delete( $t, array( "product_id" => (int) $w["product_id"] ) );
        wp_delete_post( (int) $w["product_id"], true );
      }
    }
  }`
);

if (bledy.length > 0) {
  console.error(`smoke-wp-kreator: ${bledy.length} z ${sprawdzen} sprawdzeń NIE przeszło:`);
  for (const blad of bledy) console.error(`  - ${blad}`);
  process.exit(1);
}

/* Sprzątanie po sobie: wyłącznie wiersze powstałe PO starcie tej bramki. */
sprzatnijDziennik((k) => wp("eval", k), _dziennikMigawka);
sprawdz(
  ileWpisow((k) => wp("eval", k)) === _dziennikPrzed,
  `bramka zostawiła ślad w dzienniku logowań: przed ${_dziennikPrzed}, po ${ileWpisow((k) => wp("eval", k))} wpisów (N13)`
);

console.log(`smoke-wp-kreator: ${sprawdzen} sprawdzeń zaliczonych.`);
