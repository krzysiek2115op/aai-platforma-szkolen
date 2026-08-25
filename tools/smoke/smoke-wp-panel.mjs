/**
 * Smoke KOLEKTORA PANELU — warstwa, której nie dotykał żaden automat.
 *
 * PO CO OSOBNO OD `smoke-wp-kreator`. Tamten wysyła gotowy JSON POST-em
 * i sprawdza stronę PHP: kontrakt, uprawnienia, warstwę zapisu. Nigdy nie
 * uruchamia przeglądarki, więc cały `assets/panel.js` — a to on SKŁADA
 * wysyłkę — był poza zasięgiem pomiaru. Kontrolki panelu nie mają atrybutu
 * `name` (`max_input_vars` ucina POST w milczeniu przy 41 lekcjach), więc
 * między tym, co właściciel widzi na ekranie, a tym, co dostaje PHP, stoi
 * kod JavaScriptu. Ta luka kosztowała BLAD-019: zbieranie pól modułu nie
 * uznawało wiersza lekcji za granicę zakresu, więc pole `title` każdej
 * lekcji nadpisywało tytuł modułu i wygrywała OSTATNIA. Zwykły zapis
 * kursu — bez tykania programu — przemianował wszystkie moduły i zameldował
 * sukces. Znalazł to dopiero test ręczny właściciela.
 *
 * CO MIERZY (na prawdziwych kursach, w prawdziwej przeglądarce):
 *
 *  1. KOLEKTOR NIE MIESZA PÓL — JSON, który panel wkłada do pól ukrytych
 *     tuż przed wysyłką, musi zgadzać się z tym, co stoi w kontrolkach:
 *     tytuł modułu z pola modułu, tytuły lekcji z pól lekcji, co do sztuki.
 *  2. ZAPIS BEZ ZMIAN NIE ZMIENIA NICZEGO — klikamy „Zapisz kurs" nie
 *     dotknąwszy ani jednego pola. Stan kursu (kolumny, moduły, lekcje wraz
 *     z treścią, sekcje) ma być identyczny co do skrótu, dziennik zmian ma
 *     nie urosnąć, a panel ma odpowiedzieć `bez_zmian`, nie `zapisano`.
 *     To jest sprawdzenie, które by BLAD-019 złapało.
 *
 * Sprawdzenie „zakres trafił w ≥1 element" stoi przy każdym pomiarze: kurs
 * bez modułów przepuściłby wszystko po pustce (lekcja z piątej strony
 * `smoke-wp-motyw`).
 *
 * WYMAGA lokalnego środowiska (`wordpress/srodowisko/postaw.sh`) i riga
 * z puppeteer-core — poza CI, tam nie ma ani podmana, ani przeglądarki.
 *
 * Rig (zależność NIE wchodzi do package.json):
 *   mkdir -p /tmp/rig && cd /tmp/rig && npm init -y && npm i puppeteer-core
 *   export ZRZUTY_RIG=/tmp/rig
 *   node tools/smoke/smoke-wp-panel.mjs
 */
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const RIG = process.env.ZRZUTY_RIG;
if (!RIG) {
  console.error(
    "smoke-wp-panel: ustaw ZRZUTY_RIG na katalog z zainstalowanym `puppeteer-core`.\n" +
      "  mkdir -p /tmp/rig && cd /tmp/rig && npm init -y && npm i puppeteer-core"
  );
  process.exit(1);
}
const wymagaj = createRequire(`${RIG}/`);
const puppeteer = wymagaj("puppeteer-core");

const ADRES = process.env.WP_ADRES ?? "http://127.0.0.1:8892";
const PRZEGLADARKA = process.env.FIREFOX ?? "/usr/bin/firefox";
const STACK = process.env.STACK_NAZWA ?? "aai_wp";
const KONTENER = `${STACK}_cli`;
const LOGIN = process.env.WP_LOGIN ?? "admin";

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

/* ————————————————————————— stan kursu ————————————————————————— */

/**
 * Skrót CAŁEGO stanu kursu.
 *
 * Treść lekcji i sekcji wchodzi przez `SHA2` po stronie MySQL-a — proza
 * obu kursów to blisko megabajt, a nas interesuje wyłącznie „czy to samo".
 */
function stanKursu(id) {
  const kawalki = [
    sql(
      `SELECT slug,title,short_desc,price_grosze,cover_url,status,badge,level
       FROM wp_aai_sklep_courses WHERE id='${id}'`
    ),
    sql(
      `SELECT id,position,title,summary FROM wp_aai_sklep_modules
       WHERE course_id='${id}' ORDER BY position,id`
    ),
    sql(
      `SELECT l.id,l.module_id,l.position,l.title,l.duration_min,l.preview,
              SHA2(COALESCE(l.content,''),256)
       FROM wp_aai_sklep_lessons l JOIN wp_aai_sklep_modules m ON l.module_id=m.id
       WHERE m.course_id='${id}' ORDER BY m.position,l.position,l.id`
    ),
    sql(
      `SELECT id,kind,SHA2(COALESCE(content,''),256) FROM wp_aai_sklep_sections
       WHERE course_id='${id}' ORDER BY kind`
    ),
  ];
  return createHash("sha256").update(kawalki.join("\n---\n")).digest("hex");
}

const wpisowDziennika = (id) =>
  Number(sql(`SELECT COUNT(*) FROM wp_aai_sklep_changelog WHERE course_id='${id}'`));

/* ————————————————————————— pomiar w przeglądarce ————————————————————————— */

/**
 * Kod wykonywany na stronie edytora.
 *
 * Wysyłkę wyzwalamy ZDARZENIEM `submit` z anulowaną akcją domyślną:
 * obsługa panelu (ta, która składa JSON) i tak się wykona, a strona nie
 * odejdzie, więc da się odczytać, co naprawdę poszłoby na serwer. Kliknięcie
 * przycisku odczytałoby to samo w wyścigu z nawigacją.
 */
function pomiarKolektora() {
  const formularz = document.querySelector("form.aai-formularz, form#aai-kurs, .wrap form");
  if (!formularz) {
    return { blad: "nie znalazłem formularza edytora" };
  }
  formularz.addEventListener("submit", (zdarzenie) => zdarzenie.preventDefault(), true);
  formularz.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

  const poleJson = formularz.querySelector('[data-aai-json="moduly"]');
  if (!poleJson) {
    return { blad: "formularz nie ma pola ukrytego z programem" };
  }

  const wSzablonie = (element) => element.closest("template") !== null;
  const wartosc = (element) => {
    const kontrolka = element && element.querySelector("[data-aai-wartosc]");
    return kontrolka ? kontrolka.value : null;
  };

  const zDom = Array.prototype.slice
    .call(formularz.querySelectorAll("[data-aai-modul]"))
    .filter((modul) => !wSzablonie(modul))
    .map((modul) => ({
      title: wartosc(modul.querySelector('.inside > [data-aai-pole="title"]')),
      summary: wartosc(modul.querySelector('.inside > [data-aai-pole="summary"]')),
      lekcje: Array.prototype.slice
        .call(modul.querySelectorAll("[data-aai-lekcja]"))
        .filter((lekcja) => !wSzablonie(lekcja))
        .map((lekcja) => wartosc(lekcja.querySelector('[data-aai-pole="title"]'))),
    }));

  return { zDom, zJson: JSON.parse(poleJson.value || "[]") };
}

/* ————————————————————————— sesja ————————————————————————— */

/** Logowanie PRZEZ FORMULARZ — ciastko WordPressa jest podpisane. */
async function zaloguj(przegladarka) {
  const haslo = Object.fromEntries(
    readFileSync("wordpress/srodowisko/.env", "utf8")
      .split("\n")
      .filter(Boolean)
      .map((linia) => linia.split("=").map((kawalek) => kawalek.trim()))
  ).WP_ADMIN_HASLO;

  const karta = await przegladarka.newPage();
  await karta.goto(`${ADRES}/wp-login.php`, { waitUntil: "load", timeout: 60000 });
  await karta.type("#user_login", LOGIN);
  await karta.type("#user_pass", haslo);
  await Promise.all([
    karta.waitForNavigation({ waitUntil: "load", timeout: 60000 }),
    karta.click("#wp-submit"),
  ]);
  const udane = karta.url().includes("/wp-admin");
  await karta.close();
  return udane;
}

/* ————————————————————————— przebieg ————————————————————————— */

console.log(`smoke-wp-panel: ${ADRES}`);

const kursy = sql("SELECT id,slug FROM wp_aai_sklep_courses ORDER BY slug")
  .split("\n")
  .filter(Boolean)
  .map((linia) => {
    const [id, slug] = linia.split("\t");
    return { id, slug };
  });

sprawdz(kursy.length > 0, "w tabelach nie ma ani jednego kursu — pomiar byłby ślepy (npm run wp:import)");
if (kursy.length === 0) {
  console.error("smoke-wp-panel: brak danych.");
  process.exit(1);
}

const przegladarka = await puppeteer.launch({
  browser: "firefox",
  executablePath: PRZEGLADARKA,
  protocol: "webDriverBiDi",
  headless: true,
});

sprawdz(await zaloguj(przegladarka), "nie udało się zalogować — panelu nie da się zmierzyć bez dostępu");

for (const kurs of kursy) {
  const adresEdytora = `${ADRES}/wp-admin/admin.php?page=aai-sklep-kurs&id=${kurs.id}`;
  const karta = await przegladarka.newPage();
  await karta.goto(adresEdytora, { waitUntil: "load", timeout: 60000 });

  /* ——— 1. kolektor nie miesza pól ——— */
  const pomiar = await karta.evaluate(pomiarKolektora);
  sprawdz(!pomiar.blad, `${kurs.slug}: ${pomiar.blad ?? ""}`);

  if (!pomiar.blad) {
    const { zDom, zJson } = pomiar;
    sprawdz(zDom.length > 0, `${kurs.slug}: edytor nie pokazał ani jednego modułu — pomiar po pustce`);
    sprawdz(
      zJson.length === zDom.length,
      `${kurs.slug}: kolektor odesłał ${zJson.length} modułów, a na ekranie jest ${zDom.length}`
    );
    sprawdz(
      zDom.every((modul) => modul.lekcje.length > 0),
      `${kurs.slug}: któryś moduł nie pokazał ani jednej lekcji — pomiar tytułów byłby ślepy`
    );

    zDom.forEach((modul, i) => {
      const zebrany = zJson[i] ?? {};
      sprawdz(
        zebrany.title === modul.title,
        `${kurs.slug}, moduł ${i + 1}: kolektor wysyła tytuł „${zebrany.title}", a w polu modułu stoi ` +
          `„${modul.title}"` +
          (zebrany.title === modul.lekcje[modul.lekcje.length - 1]
            ? " — to tytuł OSTATNIEJ LEKCJI, czyli nawrót BLAD-019"
            : "")
      );
      sprawdz(
        zebrany.summary === modul.summary,
        `${kurs.slug}, moduł ${i + 1}: kolektor wysyła inny opis modułu niż pole na ekranie`
      );
      sprawdz(
        JSON.stringify((zebrany.lekcje ?? []).map((lekcja) => lekcja.title)) ===
          JSON.stringify(modul.lekcje),
        `${kurs.slug}, moduł ${i + 1}: tytuły lekcji w wysyłce nie zgadzają się z polami na ekranie`
      );
    });
  }

  /* ——— 2. zapis bez zmian nie zmienia niczego ——— */
  const przed = stanKursu(kurs.id);
  const dziennikPrzed = wpisowDziennika(kurs.id);

  await karta.goto(adresEdytora, { waitUntil: "load", timeout: 60000 });
  await Promise.all([
    karta.waitForNavigation({ waitUntil: "load", timeout: 60000 }),
    karta.click("form button[type=submit].aai-glowny"),
  ]);

  const komunikat = new URL(karta.url()).searchParams.get("aai_komunikat");
  sprawdz(
    komunikat !== null,
    `${kurs.slug}: po kliknięciu „Zapisz kurs" panel nie odpowiedział komunikatem — zapis się nie wykonał, więc sprawdzenie byłoby po pustce`
  );
  sprawdz(
    komunikat === "bez_zmian",
    `${kurs.slug}: zapis, przy którym niczego nie dotknięto, zameldował „${komunikat}" zamiast „bez_zmian" — coś w wysyłce różni się od stanu bazy`
  );
  sprawdz(
    stanKursu(kurs.id) === przed,
    `${kurs.slug}: zapis bez zmian ZMIENIŁ stan kursu (kolumny, moduły, lekcje albo sekcje)`
  );
  sprawdz(
    wpisowDziennika(kurs.id) === dziennikPrzed,
    `${kurs.slug}: zapis bez zmian dopisał się do dziennika zmian — dziennik ma zapisywać wyłącznie realne zmiany`
  );

  await karta.close();
}

await przegladarka.close();

if (bledy.length > 0) {
  console.error(`\nsmoke-wp-panel: ${bledy.length} z ${sprawdzen} sprawdzeń padło:`);
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}
console.log(`smoke-wp-panel: ${sprawdzen} sprawdzeń zaliczonych.`);
