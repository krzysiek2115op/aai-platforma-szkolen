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
 * DZIESIĘĆ NIEZMIENNIKÓW (każdy z własną mutacją w audyt-straznikow):
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
 *   6. zapis kursu ROZRÓŻNIA BRAK KLUCZA od pustej wartości — dla treści
 *      lekcji, materiałów, sekcji, programu I stanu kursu. Bez tego zapis
 *      samych kolumn kursu kasuje sekcje i program, a zapis ze starszej
 *      karty cofa publikację; jedno i drugie melduje sukces,
 *   7. treść pól sprawdzamy pytaniem „czy wolno to wydrukować", a nie
 *      funkcją od WYCHODZĄCYCH żądań (`wp_http_validate_url`) — BLAD-017:
 *      link do niekupionej jeszcze domeny znikał ze strony sprzedażowej,
 *   8. żaden szablon FRONTU nie dotyka treści lekcji — materiał czyta
 *      wyłącznie panel, za bramą uprawnień,
 *   9. formularz edytora kursu NIE niesie stanu kursu — publikację klika się
 *      na liście, a stan w formularzu cofałby ją przy zapisie ze starszej
 *      karty (cicha utrata decyzji właściciela),
 *  10. każdy rekord panelu (element z własnym `data-aai-id`) jest GRANICĄ
 *      ZAKRESU dla kolektora w `assets/panel.js` — inaczej pola rekordu
 *      przeciekają do rodzica i pole o tej samej nazwie nadpisuje się po
 *      cichu (BLAD-019: tytuł modułu zastąpiony tytułem ostatniej lekcji).
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

  /*
   * To samo pytanie o CAŁE gałęzie kursu. Do przeglądu W4 brak klucza
   * `sekcje`/`moduly` znaczył pustkę, więc zapis samych kolumn kursu kasował
   * sekcje i program — a `status` bez tej reguły cofał publikację przy
   * zapisie z formularza otwartego przed nią. Wszystkie trzy melduły sukces.
   */
  for (const [klucz, skutek] of [
    ["sekcje", "zapis samych kolumn kursu skasuje WSZYSTKIE sekcje sprzedażowe"],
    ["moduly", "zapis samych kolumn kursu skasuje CAŁY program razem z treścią lekcji"],
    ["status", "zapis z formularza otwartego przed publikacją CICHO cofnie publikację — kurs wypadnie z katalogu"],
  ]) {
    const rozroznia = new RegExp(`array_key_exists\\(\\s*'${klucz}'\\s*,\\s*\\$kurs\\s*\\)`).test(zrodlo);
    if (!rozroznia) {
      bledy.push(
        `${PLIK_ZAPISU}: zapis kursu nie rozróżnia BRAKU klucza „${klucz}" od pustej wartości — ${skutek}, a odpowiedź będzie brzmiała „zapisano".`
      );
    }
  }
}

/* ——— 11. usunięcie kursu z kupującymi wymaga OSOBNEJ zgody (C2) ——— */
/*
 * Usunięcie kursu kasuje jego kopię w Tutorze, a razem z nią dostęp
 * każdego, kto go kupił — bezpowrotnie i bez śladu na jego koncie.
 * Do 0.58.0 pytała o to WYŁĄCZNIE zgoda na utratę treści, czyli o coś
 * innego: tam ginie praca właściciela, tu cudzy opłacony dostęp
 * (znalezisko testu całości, decyzja właściciela 2026-08-31 — pytać LICZBĄ).
 *
 * Reguła pyta o ROZSTRZYGNIĘCIA na całej drodze: bramka w warstwie zapisu
 * (bo to ona chroni także wywołanie z komendy), przekazanie zgody przez
 * akcję panelu i WARUNKOWE pytanie na liście. Pytanie zadawane zawsze
 * przestaje cokolwiek znaczyć, więc atrybut ma stać w gałęzi „ktoś to
 * kupił", a nie w szablonie na sztywno.
 */
{
  const zrodloZapisu = existsSync(join(WTYCZKA, PLIK_ZAPISU)) ? kod(czytaj(PLIK_ZAPISU)) : "";
  const PLIK_AKCJI = "includes/class-aai-sklep-panel-akcje.php";
  const PLIK_LISTY = "szablony/panel/lista.php";
  const zrodloAkcji = existsSync(join(WTYCZKA, PLIK_AKCJI)) ? kod(czytaj(PLIK_AKCJI)) : "";
  const zrodloListy = existsSync(join(WTYCZKA, PLIK_LISTY)) ? kod(czytaj(PLIK_LISTY)) : "";

  if ("" !== zrodloZapisu && /function usun_kurs/.test(zrodloZapisu)) {
    const odmawia =
      /\$kupujacy\s*>\s*0\s*&&\s*!\s*\$pozwol_dostep|!\s*\$pozwol_dostep\s*&&\s*\$kupujacy\s*>\s*0/.test(zrodloZapisu) &&
      /throw new Aai_Sklep_Blad_Zapisu[\s\S]{0,900}?'kupujacy'\s*=>/.test(zrodloZapisu);
    if (!odmawia) {
      bledy.push(
        `${PLIK_ZAPISU}: usun_kurs() nie odmawia skasowania kursu, który ktoś KUPIŁ. Zgoda na utratę treści to inna decyzja — kurs bez napisanych lekcji przechodziłby wtedy jednym kliknięciem, a ludzie, którzy za niego zapłacili, straciliby dostęp bez pytania.`
      );
    }
    if (!/Aai_Sklep_Tutor::kupujacy\s*\(/.test(zrodloZapisu)) {
      bledy.push(
        `${PLIK_ZAPISU}: liczba kupujących nie jest pytana u Tutora. Własny licznik zapisów byłby DRUGĄ KOPIĄ tej samej prawdy i skłamałby przy pytaniu „czy na pewno skasować kurs".`
      );
    }
  }

  if ("" !== zrodloAkcji && !/usun_kurs\s*\(\s*\$id\s*,\s*self::aktor\(\)\s*,\s*\$zgoda\s*,\s*\$dostep\s*\)/.test(zrodloAkcji)) {
    bledy.push(
      `${PLIK_AKCJI}: akcja usuwania nie przekazuje zgody na odebranie dostępu do warstwy zapisu. Panel pytałby, a zapis i tak by kasował — albo odwrotnie: właściciel nie miałby jak potwierdzić i „Usuń" przestałoby działać w ogóle.`
    );
  }

  if ("" !== zrodloListy) {
    const warunkowe = /if\s*\(\s*\$aai_kupujacy\s*>\s*0\s*\)[\s\S]{0,600}?data-aai-potwierdz-dostep/.test(zrodloListy);
    if (!warunkowe) {
      bledy.push(
        `${PLIK_LISTY}: lista nie pyta o kupujących albo pyta ZAWSZE. Pytanie ma stać w gałęzi „ktoś ten kurs kupił" — zadawane przy każdym kursie zmienia się w klikane odruchowo okienko i przestaje cokolwiek chronić.`
      );
    }
    if (!/name="pozwol_stracic_dostep"\s+value="0"/.test(zrodloListy)) {
      bledy.push(
        `${PLIK_LISTY}: pole zgody na odebranie dostępu nie zaczyna od ZERA. Bezpieczne ma być domyślnie, a nie dzięki temu, że skrypt się wykonał.`
      );
    }
  }
}

/* ————————————————— 9. formularz edytora nie niesie stanu kursu ————————————————— */

const SZABLON_KURSU = "szablony/panel/kurs.php";
if (existsSync(join(WTYCZKA, SZABLON_KURSU))) {
  const zrodlo = kod(czytaj(SZABLON_KURSU));
  if (/name="status"/.test(zrodlo)) {
    bledy.push(
      `${SZABLON_KURSU}: formularz edytora niesie stan kursu (name="status"). Publikację klika się na LIŚCIE, więc formularz otwarty przed nią miałby w tym polu wartość sprzed publikacji — i zapis poprawki jednego zdania CICHO cofnąłby publikację. Stan zmienia osobna akcja; warstwa zapisu rozumie brak tego klucza jako „zostaw, jak jest".`
    );
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

/* ——— 10. każdy rekord panelu jest granicą zakresu dla kolektora ——— */

/*
 * BLAD-019. Kontrolki panelu nie mają atrybutu `name` (`max_input_vars`
 * ucina POST w milczeniu), więc wysyłkę składa `assets/panel.js`. Zbiera
 * pola „w zakresie", a zakres kończy się na znaczniku z listy
 * `GRANICE_ZAKRESU`. Wiersz lekcji tej granicy nie miał — więc pole `title`
 * KAŻDEJ lekcji przeciekało do modułu i wygrywało ostatnie. Zwykły zapis
 * kursu przemianował wszystkie moduły i zameldował sukces.
 *
 * Regułę wyprowadzamy z SZABLONÓW, nie z drugiej listy nazw: rekordem jest
 * element z własnym `data-aai-id` — tak wygląda moduł, lekcja i sekcja.
 * Nowy rodzaj rekordu bez granicy zapala tego strażnika, zanim ktokolwiek
 * kliknie „Zapisz".
 */
const PLIK_KOLEKTORA = "assets/panel.js";
const ZRODLO_KOLEKTORA = czytaj(PLIK_KOLEKTORA);

const dopasowanieGranic = ZRODLO_KOLEKTORA.match(/GRANICE_ZAKRESU\s*=\s*\[([\s\S]*?)\]/);
if (!dopasowanieGranic) {
  bledy.push(
    `${PLIK_KOLEKTORA}: nie znalazłem listy granic zakresu (GRANICE_ZAKRESU). Bez niej nie da się sprawdzić, czy kolektor nie miesza pól modułu z polami lekcji — a to był BLAD-019.`
  );
} else if (
  !(kod(ZRODLO_KOLEKTORA).match(/function najblizszyKontener\([\s\S]*?\n\t\}/) ?? [""])[0].includes(
    "GRANICE_ZAKRESU"
  )
) {
  bledy.push(
    `${PLIK_KOLEKTORA}: lista granic zakresu istnieje, ale wyznaczanie zakresu z niej nie korzysta — martwa lista pilnuje tyle co nic.`
  );
} else {
  const granice = new Set(
    Array.from(dopasowanieGranic[1].matchAll(/"([^"]+)"/g), (m) => m[1])
  );

  /** HTML szablonu bez wstawek PHP — inaczej `?>` rozrywa znaczniki. */
  const bezPhp = (zrodlo) => zrodlo.replace(/<\?php[\s\S]*?\?>/g, "").replace(/<\?=[\s\S]*?\?>/g, "");

  const KATALOG_PANELU = join("szablony", "panel");
  for (const wpis of readdirSync(join(WTYCZKA, KATALOG_PANELU))) {
    if (!wpis.endsWith(".php")) continue;
    const plik = join(KATALOG_PANELU, wpis);
    const html = bezPhp(czytaj(plik));
    for (const [znacznik] of html.matchAll(/<[a-zA-Z][^>]*>/g)) {
      if (!znacznik.includes("data-aai-id")) continue;
      const znaczniki = Array.from(znacznik.matchAll(/data-aai-[a-z-]+/g), (m) => m[0]);
      if (!znaczniki.some((nazwa) => granice.has(nazwa))) {
        bledy.push(
          `${plik}: element z własnym \`data-aai-id\` (${znaczniki.join(", ")}) nie jest granicą zakresu w ${PLIK_KOLEKTORA}. Jego pola przeciekną do rekordu nadrzędnego i pole o tej samej nazwie nadpisze się po cichu — dokładnie tak zginęły tytuły modułów (BLAD-019).`
        );
      }
    }
  }
}

if (bledy.length > 0) {
  console.error("straznik-kreatora-wp:");
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}

console.log(
  "straznik-kreatora-wp: kontrakt sekcji pokrywa prototyp, każde pole ma etykietę, rodzaje wchodzą do panelu, akcje mają nonce i uprawnienie, treść lekcji ma opis, brak klucza znaczy „nie ruszaj” (treść, materiały, sekcje, program, stan), adresy sprawdzane bez DNS-u, front nie dotyka materiału, formularz nie niesie stanu kursu, każdy rekord panelu jest granicą zakresu kolektora, usunięcie kursu z kupującymi wymaga osobnej zgody."
);
