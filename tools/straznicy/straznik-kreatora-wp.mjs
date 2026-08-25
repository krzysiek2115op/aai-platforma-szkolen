/**
 * Strażnik kreatora we wtyczce (krok W4) — reguły, których złamanie NIE
 * objawia się błędem.
 *
 * PO CO OSOBNO OD `straznik-frontu-wp`. Tamten pyta „czy klient to zobaczy",
 * ten pyta „czy właściciel ma to czym wypełnić i czy zapis jest pilnowany".
 * To dwie różne strony tej samej granicy: strona renderuje treść, panel ją
 * wpisuje, a między nimi stoi kontrakt. Rozjazd po którejkolwiek stronie
 * kończy się tak samo — treść, której nie ma, choć wszystko wygląda dobrze.
 *
 * SIEDEM NIEZMIENNIKÓW (każdy z własną mutacją w audyt-straznikow):
 *   1. każde pole sekcji z kontraktu prototypu (`modules/m1-sklep/typy.ts`)
 *      istnieje w `Aai_Sklep_Sekcje::SCHEMATY` — pola, którego kontrakt
 *      wtyczki nie zna, panel nie pokaże, a odczyt po cichu je odsieje,
 *   2. każde pole w SCHEMATY ma ETYKIETĘ — pola bez nazwy po polsku nie da
 *      się sensownie wypełnić, a panel rysuje się właśnie z tej tablicy,
 *   3. każdy rodzaj sekcji jest w `kolejnosc_w_panelu()` — rodzaj, którego
 *      nie ma na tej liście, wypada z panelu bez śladu,
 *   4. każda akcja `admin_post_*` ma `check_admin_referer` I `current_user_can` —
 *      nonce mówi „ta osoba naprawdę o to poprosiła", uprawnienie „ta osoba
 *      może"; jedno bez drugiego to otwarte drzwi,
 *   5. kontrakt treści lekcji zna wszystkie pola `TrescLekcji`
 *      i `MaterialLekcji` z prototypu — materiał kursu jest towarem, więc
 *      pole bez miejsca w panelu to dziura w produkcie,
 *   6. zapis kursu ROZRÓŻNIA brak klucza `content`/`materials` od pustej
 *      wartości — bez tego jeden zapis programu z panelu czyści prozę
 *      wszystkich lekcji i melduje sukces,
 *   7. treść pól sprawdzamy pytaniem „czy wolno to wydrukować", a nie
 *      funkcją od WYCHODZĄCYCH żądań (`wp_http_validate_url`) — BLAD-017:
 *      link do niekupionej jeszcze domeny znikał ze strony sprzedażowej,
 *   8. żaden szablon FRONTU nie dotyka treści lekcji — materiał czyta
 *      wyłącznie panel, za bramą uprawnień.
 *
 * Użycie: node tools/straznicy/straznik-kreatora-wp.mjs
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const WTYCZKA = "wordpress/wtyczki/aai-sklep";
const KONTRAKT = "modules/m1-sklep/typy.ts";
const bledy = [];

if (!existsSync(WTYCZKA)) {
  console.log("straznik-kreatora-wp: pominięte — nie ma jeszcze wtyczki aai-sklep.");
  process.exit(0);
}

const czytaj = (sciezka) => readFileSync(join(WTYCZKA, sciezka), "utf8");

/** Kod bez komentarzy — reguły mają celować w ZACHOWANIE, nie w opis. */
const kod = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const PLIK_SEKCJI = "includes/class-aai-sklep-sekcje.php";
const PLIK_KONTRAKTU = "includes/class-aai-sklep-kontrakt.php";
const PLIK_AKCJI = "includes/class-aai-sklep-panel-akcje.php";
const PLIK_ZAPISU = "includes/class-aai-sklep-zapis.php";
const PLIK_POL = "includes/class-aai-sklep-pola.php";

/* ————————————————— pola kontraktu wtyczki ————————————————— */

/**
 * Rodzaje i pola z `Aai_Sklep_Sekcje::SCHEMATY`.
 *
 * Czytamy PLIK, a nie uruchamiamy PHP: strażnicy chodzą w CI, gdzie nie ma
 * ani PHP, ani podmana. Wzorzec celuje w kształt tablicy, więc zmiana jej
 * kształtu wymaga poprawienia strażnika — i o to chodzi.
 */
function polaWtyczki(zrodlo) {
  const rodzaje = {};
  const mapa = zrodlo.match(/private const SCHEMATY = array\(([\s\S]*?)\n\t\);/);
  if (!mapa) return null;

  // Każdy rodzaj otwiera się jako `'nazwa' => array(` na jednym wcięciu.
  const kawalki = mapa[1].split(/\n\t\t'(\w+)'\s*=> array\(/);
  for (let i = 1; i < kawalki.length; i += 2) {
    const rodzaj = kawalki[i];
    const tresc = kawalki[i + 1] ?? "";

    /*
     * Pole to `'nazwa' => array( 'typ' => …` — NA DOWOLNEJ GŁĘBOKOŚCI.
     * Pola zagnieżdżone (element listy obiektów, obiekt `link`) liczą się
     * tak samo: kupujący nie widzi różnicy między polem sekcji a polem
     * elementu, więc strażnik też jej nie robi. Pierwsza wersja tej reguły
     * czytała tylko najwyższy poziom i oskarżała pięć zdrowych sekcji.
     */
    const granice = [...tresc.matchAll(/'([a-z_]+)'\s*=> array\(\s*'typ'/g)];
    const pola = {};
    granice.forEach((dopasowanie, nr) => {
      const od = dopasowanie.index;
      const doNastepnego = nr + 1 < granice.length ? granice[nr + 1].index : tresc.length;
      pola[dopasowanie[1]] = {
        etykieta: /'etykieta'\s*=>/.test(tresc.slice(od, doNastepnego)),
      };
    });
    rodzaje[rodzaj] = pola;
  }
  return rodzaje;
}

/* ————————————————— pola kontraktu prototypu ————————————————— */

/** Rodzaje sekcji i ich pola prosto z `typy.ts` (jak w straznik-frontu-wp). */
function rodzajeZKontraktu() {
  if (!existsSync(KONTRAKT)) return null;
  const zrodlo = readFileSync(KONTRAKT, "utf8");
  const mapa = zrodlo.match(/export const SCHEMATY_SEKCJI = \{([\s\S]*?)\n\}/);
  if (!mapa) return null;

  const rodzaje = {};
  for (const [, rodzaj, nazwaSchematu] of mapa[1].matchAll(/^\s*(\w+):\s*(\w+),/gm)) {
    const schemat = zrodlo.match(
      new RegExp(`export const ${nazwaSchematu} = z\\.object\\(\\{([\\s\\S]*?)\\n\\}\\);`)
    );
    if (!schemat) continue;
    rodzaje[rodzaj] = [
      ...new Set(
        [...schemat[1].matchAll(/(?:^|\{|,)\s*(\w+):\s*(?:krotki|akapit|lista|z\.)/gm)].map((t) => t[1])
      ),
    ];
  }
  return rodzaje;
}

/** Pola `TrescLekcji` i `MaterialLekcji` z kontraktu prototypu. */
function polaLekcjiZKontraktu() {
  if (!existsSync(KONTRAKT)) return null;
  const zrodlo = readFileSync(KONTRAKT, "utf8");
  const pola = new Set();
  for (const nazwa of ["TrescLekcji", "MaterialLekcji"]) {
    const schemat = zrodlo.match(
      new RegExp(`export const ${nazwa} = z\\.object\\(\\{([\\s\\S]*?)\\n\\}\\);`)
    );
    if (!schemat) return null;
    for (const [, pole] of schemat[1].matchAll(/^\s*(\w+):\s*z\./gm)) pola.add(pole);
  }
  return [...pola];
}

/* ————————————————— 1–3. sekcje: kontrakt, etykiety, kolejność ————————————————— */

const ZRODLO_SEKCJI = czytaj(PLIK_SEKCJI);
const WTYCZKOWE = polaWtyczki(ZRODLO_SEKCJI);
const PROTOTYPOWE = rodzajeZKontraktu();

if (WTYCZKOWE === null || Object.keys(WTYCZKOWE).length === 0) {
  bledy.push(
    `${PLIK_SEKCJI}: nie udało się odczytać SCHEMATY — strażnik nie ma z czym porównać kontraktu. Zmiana kształtu tej tablicy wymaga poprawienia strażnika, a nie wyłączenia go.`
  );
} else {
  /* 1. każde pole kontraktu prototypu jest w kontrakcie wtyczki */
  if (PROTOTYPOWE !== null) {
    for (const [rodzaj, pola] of Object.entries(PROTOTYPOWE)) {
      const uNas = WTYCZKOWE[rodzaj];
      if (!uNas) {
        bledy.push(
          `${PLIK_SEKCJI}: rodzaj sekcji „${rodzaj}" jest w kontrakcie prototypu, a wtyczka go nie zna — kreator nie da go wypełnić, a odczyt odsieje taką treść bez słowa.`
        );
        continue;
      }
      const brakujace = pola.filter((pole) => !(pole in uNas));
      if (brakujace.length > 0) {
        bledy.push(
          `${PLIK_SEKCJI}: sekcja „${rodzaj}" nie zna pól z kontraktu prototypu (${brakujace.join(", ")}). Strona potrafi je wyrenderować, kreator nie ma ich czym wypełnić, a zapis po cichu je odsieje.`
        );
      }
    }
  }

  /* 2. każde pole ma etykietę */
  for (const [rodzaj, pola] of Object.entries(WTYCZKOWE)) {
    const bezEtykiety = Object.entries(pola)
      .filter(([, opis]) => !opis.etykieta)
      .map(([nazwa]) => nazwa);
    if (bezEtykiety.length > 0) {
      bledy.push(
        `${PLIK_SEKCJI}: sekcja „${rodzaj}" ma pola bez etykiety (${bezEtykiety.join(", ")}). Panel rysuje się z tej samej tablicy — pole bez nazwy po polsku wygląda w kreatorze jak klucz bazy danych.`
      );
    }
  }

  /* 3. każdy rodzaj wchodzi do kolejności panelu */
  const kolejnosc = ZRODLO_SEKCJI.match(/public static function kolejnosc_w_panelu\(\): array \{([\s\S]*?)\n\t\}/);
  if (!kolejnosc) {
    bledy.push(
      `${PLIK_SEKCJI}: brak metody kolejnosc_w_panelu() — panel nie miałby jak ustawić sekcji w kolejności, w której zobaczy je kupujący.`
    );
  } else if (!/foreach\s*\(\s*self::rodzaje\(\)[\s\S]{0,300}?\$kolejnosc\[\]\s*=/.test(kolejnosc[1])) {
    /*
     * Reguła celuje w MECHANIZM, nie w samo wystąpienie `self::rodzaje()`.
     * Pierwsza wersja pytała tylko, czy nazwa metody gdziekolwiek pada —
     * a pada też w `array_intersect()` na końcu, które potrafi wyłącznie
     * USUWAĆ. Mutacja kasująca pętlę domykającą przechodziła więc na zielono
     * (audyt złapał to od razu). Tu pytamy o to, co naprawdę chroni: czy
     * lista jest DOMYKANA przez dopisanie każdego rodzaju, którego jeszcze
     * na niej nie ma.
     */
    bledy.push(
      `${PLIK_SEKCJI}: kolejnosc_w_panelu() nie domyka listy pętlą po self::rodzaje() dopisującą brakujące rodzaje. Rodzaj sekcji spoza KOLEJNOSCI wypadłby wtedy z panelu bez śladu — właściciel nie miałby gdzie wpisać jego treści.`
    );
  }
}

/* ————————————————— 4. bramki akcji ————————————————— */

if (!existsSync(join(WTYCZKA, PLIK_AKCJI))) {
  bledy.push(`${WTYCZKA}/${PLIK_AKCJI}: brak klasy akcji kreatora.`);
} else {
  const zrodlo = kod(czytaj(PLIK_AKCJI));

  // Metody podpięte pod `admin_post_*` — pytamy o REJESTRACJĘ, nie o nazwy.
  const podpiete = [
    ...zrodlo.matchAll(/add_action\(\s*'admin_post_'\s*\.\s*self::(\w+)\s*,\s*array\(\s*self::class,\s*'(\w+)'\s*\)/g),
  ].map((m) => m[2]);

  if (podpiete.length === 0) {
    bledy.push(
      `${PLIK_AKCJI}: żadna metoda nie jest podpięta pod admin_post_ — albo kreator nie ma jak zapisać, albo strażnik przestał widzieć rejestrację.`
    );
  }

  for (const metoda of podpiete) {
    const ciało = zrodlo.match(new RegExp(`function ${metoda}\\(\\)[^{]*\\{([\\s\\S]*?)\\n\\t\\}`));
    if (!ciało) {
      bledy.push(`${PLIK_AKCJI}: nie widzę ciała metody ${metoda}() podpiętej pod admin_post_.`);
      continue;
    }
    if (!/check_admin_referer\(/.test(ciało[1])) {
      bledy.push(
        `${PLIK_AKCJI}: akcja ${metoda}() nie sprawdza nonce'a (check_admin_referer). Cudza strona otwarta w sąsiedniej karcie mogłaby wtedy zapisać kurs za plecami zalogowanego właściciela.`
      );
    }
    if (!/current_user_can\(|self::brama\(\)/.test(ciało[1])) {
      bledy.push(
        `${PLIK_AKCJI}: akcja ${metoda}() nie sprawdza uprawnienia. Sam nonce puściłby każdego zalogowanego — także klienta kursu.`
      );
    }
  }

  // `admin_post_nopriv_` NIE ma prawa się tu pojawić: gość nie zapisuje kursów.
  if (/admin_post_nopriv_/.test(zrodlo)) {
    bledy.push(
      `${PLIK_AKCJI}: akcja zarejestrowana dla NIEZALOGOWANYCH (admin_post_nopriv_). Kreator nie ma żadnej akcji, którą wolno wykonać bez konta.`
    );
  }
}

/* ————————————————— 5. treść lekcji ————————————————— */

if (!existsSync(join(WTYCZKA, PLIK_KONTRAKTU))) {
  bledy.push(`${WTYCZKA}/${PLIK_KONTRAKTU}: brak kontraktu zapisu.`);
} else {
  const zrodlo = czytaj(PLIK_KONTRAKTU);
  const zKontraktu = polaLekcjiZKontraktu();
  const opis = zrodlo.match(/public static function pola_lekcji\(\): array \{([\s\S]*?)\n\t\}/);

  if (!opis) {
    bledy.push(
      `${PLIK_KONTRAKTU}: brak opisu pól treści lekcji (pola_lekcji). Panel nie miałby czym narysować edytora materiału.`
    );
  } else if (zKontraktu !== null) {
    // W panelu pola nazywają się po polsku (`materialy`), w kontrakcie
    // prototypu tak samo — porównujemy wprost.
    const nasze = [...opis[1].matchAll(/'([a-z_]+)'\s*=> array\(/g)].map((m) => m[1]);
    const brakujace = zKontraktu.filter((pole) => !nasze.includes(pole));
    if (brakujace.length > 0) {
      bledy.push(
        `${PLIK_KONTRAKTU}: opis treści lekcji nie zna pól z kontraktu prototypu (${brakujace.join(", ")}). Materiał kursu jest towarem — pole, którego właściciel nie ma czym wypełnić, to dziura w produkcie.`
      );
    }
  }
}

/* ————————————————— 6. zapis programu nie kasuje treści ————————————————— */

if (existsSync(join(WTYCZKA, PLIK_ZAPISU))) {
  const zrodlo = kod(czytaj(PLIK_ZAPISU));
  for (const kolumna of ["content", "materials"]) {
    const rozroznia = new RegExp(`array_key_exists\\(\\s*'${kolumna}'\\s*,\\s*\\$l\\s*\\)`).test(zrodlo);
    if (!rozroznia) {
      bledy.push(
        `${PLIK_ZAPISU}: budowanie lekcji docelowej nie rozróżnia BRAKU klucza „${kolumna}" od pustej wartości. Kreator wysyła sam spis treści (tytuły, kolejność, czasy) — jeśli brak klucza znaczy pustkę, pierwsze „Zapisz kurs" wyczyści prozę wszystkich lekcji i zamelduje sukces.`
      );
    }
  }
}

/* ————————————————— 7. adres pola treści ≠ adres żądania ————————————————— */

if (existsSync(join(WTYCZKA, PLIK_POL))) {
  const zrodlo = kod(czytaj(PLIK_POL));
  if (/wp_http_validate_url\(/.test(zrodlo)) {
    bledy.push(
      `${PLIK_POL}: pola treści sprawdzane przez wp_http_validate_url(). Ta funkcja broni przed SSRF: rozwiązuje nazwę w DNS-ie i odrzuca adresy, których nie umie rozwiązać. Nasze pytanie brzmi „czy wolno ten odnośnik WYDRUKOWAĆ" — BLAD-017: link do niekupionej jeszcze domeny znikał ze strony sprzedażowej i nic się przy tym nie zapalało.`
    );
  }
}

/* ————————————————— 8. front nie dotyka treści lekcji ————————————————— */

function szablonyFrontu(katalog = "szablony") {
  const pelny = join(WTYCZKA, katalog);
  if (!existsSync(pelny)) return [];
  const wynik = [];
  for (const wpis of readdirSync(pelny)) {
    const wzgledny = join(katalog, wpis);
    if (wzgledny.startsWith(join("szablony", "panel"))) continue;
    if (statSync(join(WTYCZKA, wzgledny)).isDirectory()) wynik.push(...szablonyFrontu(wzgledny));
    else if (wpis.endsWith(".php")) wynik.push(wzgledny);
  }
  return wynik;
}

for (const plik of szablonyFrontu()) {
  const zrodlo = kod(czytaj(plik));
  if (/\[\s*'(content|tresc)'\s*\]/.test(zrodlo)) {
    bledy.push(
      `${plik}: szablon frontu sięga po treść lekcji. Materiał kursu jest towarem — kupujący płaci za dostęp do niego, więc czyta go wyłącznie panel, za bramą uprawnień. Katalog i strona sprzedażowa dostają samą informację, że lekcja ma treść.`
    );
  }
}

if (bledy.length > 0) {
  console.error("straznik-kreatora-wp:");
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}

console.log(
  "straznik-kreatora-wp: kontrakt sekcji pokrywa prototyp, każde pole ma etykietę, rodzaje wchodzą do panelu, akcje mają nonce i uprawnienie, treść lekcji ma opis, zapis programu nie kasuje prozy, adresy sprawdzane bez DNS-u, front nie dotyka materiału."
);
