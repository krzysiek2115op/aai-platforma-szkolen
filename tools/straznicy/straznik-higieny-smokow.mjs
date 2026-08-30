/**
 * Strażnik higieny bramek: **smoke kasuje wyłącznie to, co sam wysłał.**
 *
 * PO CO. Łapacz poczty (Mailpit) jest zasobem WSPÓLNYM — piszą do niego nasze
 * bramki, a zagląda tam właściciel, kiedy testuje sklep ręcznie. Do 0.53.0
 * obie strony robiły z nim rzecz niebezpieczną, w przeciwnych kierunkach,
 * i żadna kontrola tego nie widziała:
 *
 *   - `smoke-wp-zakup` i `smoke-wp-zwroty` NIE SPRZĄTAŁY po sobie (zmierzone
 *     na czystej skrzynce: 21 i 15 wiadomości na przebieg), więc właściciel
 *     szukał swojego maila wśród kilkudziesięciu cudzych;
 *   - `smoke-wp-maile` i `postaw.sh` sprzątały ODWROTNIE — kasowały CAŁĄ
 *     skrzynkę (zmierzone: 36 → 0). To jest czwarte zgłoszenie z testu
 *     ręcznego P6: właścicielowi zniknął z podglądu mail, który przed chwilą
 *     dostał, i wyglądało to jak usterka dostarczania.
 *
 * Ta sama klasa co `smoke-wp-motyw` z 0.51.0, który zamykał sklep za sobą
 * zamiast przywrócić stan zastany: **„przywróć stan” to co innego niż
 * „wyczyść wszystko”.**
 *
 * CO SPRAWDZA — i dlaczego akurat to:
 *   1. ŻADEN plik bramki nie kasuje skrzynki hurtowo. Pytamy o ZACHOWANIE
 *      wynikające z cudzego API: `DELETE /api/v1/messages` bez listy `IDs`
 *      znaczy u Mailpita „skasuj wszystko”. Reguła nie pyta o nazwę funkcji
 *      ani o obecność słowa — ta pułapka wracała w tym repo sześć razy
 *      (0.29.0 nazwa metody, 0.44.0 nazwa stałej, 0.47.0, c6c9c97, dwa razy
 *      w P4);
 *   2. bramka, która SKŁADA ZAMÓWIENIA albo ZAKŁADA KONTA, wysyła pocztę —
 *      więc musi wziąć migawkę i po sobie posprzątać. Rozpoznajemy ją po
 *      wywołaniach cudzego interfejsu (`wc_create_order`, `payment_complete`,
 *      `woocommerce_created_customer`), a nie po nazwie pliku: nowy smoke
 *      dostanie regułę automatycznie;
 *   3. taka bramka ma rachunek sumienia poczty — porównanie stanu po
 *      przebiegu ze stanem sprzed. Bez niego sprzątanie jest deklaracją;
 *   4. i rachunek sumienia zapisów na kursy, liczonych GLOBALNIE. Kasowanie
 *      zamówienia NIE kasuje zapisu w Tutorze: tak powstał wpis #2153, który
 *      zawyżał licznik zapisanych na prawdziwy Kurs 1 przy zamówieniu #2152,
 *      dawno nieistniejącym. Sprzątanie po WŁASNYM kursie takiego zapisu nie
 *      widzi, bo on siedzi na cudzym;
 *   8. bramka, która SIĘ LOGUJE, zostawia od kroku T2 wpisy w dzienniku
 *      logowań Pluginu 3 — więc musi wziąć migawkę i posprzątać. Rozpoznajemy
 *      ją po zachowaniu (POST na `wp-login.php`, pole loginu w przeglądarce,
 *      `wc_set_customer_auth_cookie`), nie po nazwie pliku;
 *   9. i ma z tego rachunek sumienia. To on ujawnił, że test retencji
 *      w smoke'u monitoringu cofał czas CUDZEMU wierszowi (MIN(id))
 *      i oddawał go retencji do skasowania;
 *  10. a ta asercja jest OSIĄGALNA — nie stoi za `process.exit(1)`.
 *      Przy pierwszym wpięciu modułu była martwa w SZEŚCIU z siedmiu
 *      bramek: mutacja psująca ją przechodziła z kodem 0;
 *   5-7. moduł `tools/smoke/poczta.mjs` sprawdzany URUCHOMIENIOWO, przez
 *      podstawiony `fetch` — bo to jego ZACHOWANIE chroni cudzą pocztę,
 *      a nie kształt jego kodu. Trzy niezmienniki: brak własnych wiadomości
 *      nie wysyła żądania kasującego (inaczej wyczyściłby skrzynkę), kasowane
 *      są wyłącznie identyfikatory spoza migawki, a niepełna migawka
 *      ZATRZYMUJE przebieg zamiast uznać cudze wiadomości za własne.
 *
 * Użycie: node tools/straznicy/straznik-higieny-smokow.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const KORZEN = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const KATALOG_SMOKE = join(KORZEN, "tools", "smoke");
const POSTAW = join(KORZEN, "wordpress", "srodowisko", "postaw.sh");

const bledy = [];

/** Treść pliku bez komentarzy — żeby opis pułapki nie udawał jej popełnienia. */
function kod(sciezka) {
  return readFileSync(sciezka, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*(\/\/|#).*$/gm, " ");
}

/**
 * Czy wynik wywołania `nazwa(...)` jest gdzieś PORÓWNYWANY.
 *
 * Regex tu nie wystarcza: uchwyty przekazywane tym funkcjom same zawierają
 * nawiasy (`ileWpisow((k) => wp("eval", k))`), więc `[^)]*` urywa się na
 * pierwszym domknięciu i reguła zapala się na poprawnym kodzie. Dlatego
 * domykamy nawias licząc głębokość i dopiero PO nim szukamy operatora.
 *
 * Celujemy w ZACHOWANIE — istnienie porównania — a nie w liczbę wywołań:
 * pierwsza wersja liczyła wystąpienia i przepuszczała asercję zamienioną
 * na `true === true`, bo drugie wywołanie zostawało w komunikacie błędu.
 */
function porownujeWynik(tresc, nazwa) {
  const wzorzec = new RegExp(`\\b${nazwa}\\s*\\(`, "g");
  for (const trafienie of tresc.matchAll(wzorzec)) {
    let i = trafienie.index + trafienie[0].length - 1;
    let glebokosc = 0;
    for (; i < tresc.length; i++) {
      if (tresc[i] === "(") glebokosc++;
      else if (tresc[i] === ")") {
        glebokosc--;
        if (glebokosc === 0) break;
      }
    }
    if (/^\s*(?:===|!==|==|!=)/.test(tresc.slice(i + 1))) return true;
  }
  return false;
}

/* ── 1. nikt nie kasuje skrzynki hurtowo ─────────────────────────────── */

/*
 * Kasowanie hurtowe rozpoznajemy po SKUTKU w cudzym API: żądanie DELETE na
 * `/api/v1/messages`, któremu nie towarzyszy lista `IDs`. Sprawdzamy okno
 * wokół wywołania, bo ładunek bywa w następnej linii — i tak samo wygląda to
 * w JavaScripcie (`method: "DELETE"`) jak w powłoce (`curl -X DELETE`).
 */
const pliki = [
  ...readdirSync(KATALOG_SMOKE)
    .filter((f) => f.endsWith(".mjs") || f.endsWith(".ts"))
    .map((f) => join(KATALOG_SMOKE, f)),
  POSTAW,
];

for (const plik of pliki) {
  const tresc = kod(plik);
  for (const trafienie of tresc.matchAll(/api\/v1\/messages/g)) {
    const okno = tresc.slice(Math.max(0, trafienie.index - 260), trafienie.index + 260);
    if (!/DELETE/.test(okno)) continue;
    if (/\bIDs\b/.test(okno)) continue;
    bledy.push(
      `${plik.replace(KORZEN + "/", "")}: kasuje skrzynkę HURTOWO (DELETE /api/v1/messages bez listy IDs). ` +
        "W API Mailpita brak listy znaczy „skasuj wszystko”, więc bramka zabiera pocztę właścicielowi " +
        "(czwarte zgłoszenie z testu P6). Kasuj wyłącznie własne wiadomości — patrz tools/smoke/poczta.mjs."
    );
  }
}

/* ── 2-4. bramka wysyłająca pocztę sprząta i rozlicza się z tego ──────── */

/*
 * „Wysyła pocztę” poznajemy po tym, co bramka ROBI z cudzym kodem: składa
 * zamówienie, domyka płatność albo zakłada konto klienta. Każda z tych
 * czynności uruchamia maile WooCommerce lub naszą warstwę dostarczania.
 * Rozpoznanie po nazwie pliku byłoby ślepe na nowy smoke — a to jego właśnie
 * chcemy złapać, zanim dołoży kolejne 20 wiadomości do wspólnej skrzynki.
 */
const WYSYLA_POCZTE = /wc_create_order|payment_complete|woocommerce_created_customer|tutor_after_enrolled/;

for (const plik of pliki.filter((p) => p.endsWith(".mjs"))) {
  const tresc = kod(plik);
  const nazwa = plik.replace(KORZEN + "/", "");
  if (!WYSYLA_POCZTE.test(tresc)) continue;

  if (!/migawkaPoczty\s*\(/.test(tresc) || !/sprzatnijPoczte\s*\(/.test(tresc)) {
    bledy.push(
      `${nazwa}: składa zamówienia albo zakłada konta, czyli WYSYŁA pocztę, ale nie bierze migawki ` +
        "i nie sprząta po sobie. Zmierzone przed 0.54.0: takie bramki zostawiały 21 i 15 wiadomości na przebieg. " +
        "Użyj migawkaPoczty() na starcie i sprzatnijPoczte() w finally."
    );
  }

  /*
   * Rachunek sumienia poczty: pytamy o ZACHOWANIE, nie o nazwę zmiennej.
   * Pierwsza wersja tej reguły szukała napisu „poczty” w wywołaniu `sprawdz(`
   * — czyli wisiała na nazwie `pocztyPo` i przepuściłaby jej przemianowanie.
   * To siódmy nawrót tej samej pułapki w tym repo (0.29.0, 0.44.0, 0.47.0,
   * c6c9c97, dwa razy w P4), tym razem złapany we własnym kodzie.
   *
   * Zamiast tego: stan skrzynki musi być odczytany DWA RAZY (przed i po),
   * a drugi odczyt musi trafić do asercji — czyli w jego pobliżu stoi
   * wywołanie `sprawdz(`. Nazwa zmiennej jest wtedy bez znaczenia.
   */
  const odczyty = [...tresc.matchAll(/ilePoczty\s*\(/g)];
  const drugiWAsercji =
    odczyty.length >= 2 &&
    /sprawdz\s*\(/.test(tresc.slice(Math.max(0, odczyty[1].index - 400), odczyty[1].index + 400));
  if (!drugiWAsercji) {
    bledy.push(
      `${nazwa}: sprząta pocztę, ale nie ROZLICZA się z tego — stan skrzynki musi być odczytany przed ` +
        "przebiegiem i po nim, a druga wartość trafić do asercji. Bez porównania sprzątanie jest deklaracją: " +
        "tak samo wyglądałby smoke, który kasuje wszystko, i taki, który nie kasuje nic."
    );
  }

  // Zapisy na kursy liczone GLOBALNIE — sierota siedzi na CUDZYM kursie.
  const globalnieLiczoneZapisy = /post_type='tutor_enrolled'"\s*\)/.test(tresc.replace(/\s+/g, " "));
  if (!globalnieLiczoneZapisy) {
    bledy.push(
      `${nazwa}: nie liczy zapisów na kursy GLOBALNIE. Kasowanie zamówienia nie kasuje zapisu w Tutorze, ` +
        "a sprzątanie po własnym kursie nie widzi zapisu, który powstał na cudzym — tak przeżył wpis #2153, " +
        "zawyżając licznik zapisanych na prawdziwy Kurs 1."
    );
  }
}

/* ── 8-9. bramka LOGUJĄCA SIĘ sprząta dziennik i rozlicza się z tego ─── */

/*
 * Od kroku T2 Pluginu 3 WordPress zapisuje KAŻDE logowanie do dziennika
 * `wp_aai_monitor_logowania`. Bramki logują się po wielekroć — i od tej
 * chwili każda zostawia tam wpisy, nie wiedząc o tym.
 *
 * To nie jest bałagan kosmetyczny: jedyną funkcją ALARMOWĄ ekranu
 * monitoringu jest licznik nieudanych prób z 7 dni, a jedynym powodem
 * istnienia dziennika — odpowiedź na pytanie „kto i skąd wchodził na
 * konta". Serie wpisów z własnych testów zamieniają obie te rzeczy w szum
 * wyglądający dokładnie jak próba włamania.
 *
 * „LOGUJE SIĘ" POZNAJEMY PO ZACHOWANIU, nie po nazwie pliku: żądanie POST
 * do `wp-login.php`, wypełnienie pola loginu w przeglądarce albo założenie
 * sesji cudzym kodem (`wc_set_customer_auth_cookie`). Rozpoznanie po
 * nazwie byłoby ślepe na nowy smoke — a to jego właśnie chcemy złapać.
 *
 * ZMIERZONE (przelot czternastu bramek z licznikiem przed/po, 2026-08-30):
 * wpisy zostawiało SIEDEM bramek. Grep mylił się w OBIE strony — wskazywał
 * `platnosci`, który tylko asertuje kod 200 ekranu logowania, a przegapił
 * `produkty` i `zakup`, bo sesja powstaje im w kasie WooCommerce, bez
 * dotykania `wp-login.php`.
 */
const LOGUJE_SIE =
  /wp-login\.php["'`]\s*,\s*\{[\s\S]{0,400}?method:\s*["']POST|#user_login|#username|name=["']?log["']?\]|name=["']?login["']?\]|wc_set_customer_auth_cookie|\bzaloguj\s*\(/;

/*
 * LISTA ZMIERZONYCH — i dlaczego sam wzorzec nie wystarcza.
 *
 * Pierwsza wersja tej reguły stała wyłącznie na wzorcu zachowania i była
 * ŚLEPA na `smoke-wp-zakup` oraz `smoke-wp-produkty` — wykryły to jej
 * własne testy negatywne (zdjęcie sprzątania przechodziło na zielono).
 * Powód: te bramki nie logują się ANI JEDNĄ instrukcją własnego kodu.
 * Sesja powstaje im GŁĘBOKO w cudzym kodzie — WooCommerce woła
 * `wc_set_customer_auth_cookie()` sam, w środku składania zamówienia.
 * Żaden wzorzec czytający NASZ plik tego nie zobaczy.
 *
 * Dlatego obok wzorca stoi lista tego, co ZMIERZONO. Nie jest to
 * kapitulacja: strażnik statyczny nie ma jak odgadnąć skutków cudzego
 * kodu, a udawanie, że ma, dałoby regułę cichą tam, gdzie najbardziej
 * potrzebna. Listę odtwarza się pomiarem — dla każdej bramki licznik
 * wierszy dziennika przed przebiegiem i po nim:
 *
 *   podman exec aai_wp_cli wp eval 'global $wpdb; echo (int) $wpdb->get_var(
 *     "SELECT COUNT(*) FROM " . Aai_Monitor_Tabele::tabela("logowania") );'
 *
 * Stan z 2026-08-30 (czysty przelot czternastu bramek): wpisy tworzy
 * PIĘĆ bramek plus smoke monitoringu — `kreator` 2, `lekcja`, `panel`,
 * `motyw`, `jezyk` po 1, `monitor` 16.
 *
 * DWA OSTRZEŻENIA przy powtarzaniu pomiaru, oba z własnych pomyłek:
 * (1) bramki wymagające `ZRZUTY_RIG` bez niego padają PRZED pierwszym
 * logowaniem i pokazują fałszywe „zostawia 0" — sprawdzaj kod wyjścia,
 * nie sam wynik; (2) NIE rób w tle własnych żądań HTTP do `:8892` —
 * licznik nie wie, czyj jest wiersz, i przypisze je mierzonej bramce.
 * Mierz `AUTO_INCREMENT`, nie liczbę wierszy: sprzątanie kasuje ślad,
 * ale licznika nie cofa.
 *
 * `smoke-wp-produkty` i `smoke-wp-zakup` zostają na liście mimo zera —
 * składają zamówienia i zakładają konta, więc pierwsza zmiana w tamtej
 * ścieżce może zacząć tworzyć sesje. To profilaktyka, nie dowód.
 */
const ZMIERZONE_ZOSTAWIAJA = [
  "smoke-wp-kreator.mjs",
  "smoke-wp-lekcja.mjs",
  "smoke-wp-produkty.mjs",
  "smoke-wp-zakup.mjs",
  "smoke-wp-jezyk.mjs",
  "smoke-wp-panel.mjs",
  "smoke-wp-motyw.mjs",
  "smoke-wp-monitor.mjs",
];

for (const plik of pliki.filter((p) => p.endsWith(".mjs"))) {
  const tresc = kod(plik);
  const nazwa = plik.replace(KORZEN + "/", "");
  // Sam moduł higieny dziennika i smoke monitoringu mają własne, bogatsze
  // sprzątanie — pierwszy jest narzędziem, drugi mierzy sam mechanizm.
  if (nazwa.endsWith("tools/smoke/dziennik.mjs")) continue;
  const zmierzona = ZMIERZONE_ZOSTAWIAJA.some((n) => nazwa.endsWith(n));
  if (!zmierzona && !LOGUJE_SIE.test(tresc)) continue;

  if (!/migawkaDziennika\s*\(/.test(tresc) || !/sprzatnijDziennik\s*\(/.test(tresc)) {
    bledy.push(
      `${nazwa}: loguje się do instalacji, więc od kroku T2 zostawia wpisy w dzienniku logowań, ` +
        "ale nie bierze migawki i nie sprząta po sobie. Bez tego licznik nieudanych prób z 7 dni — jedyna " +
        "funkcja alarmowa ekranu monitoringu — pokazuje serie wyprodukowane przez własne testy. " +
        "Użyj migawkaDziennika() na starcie i sprzatnijDziennik() przed wynikiem (tools/smoke/dziennik.mjs)."
    );
  }

  /*
   * Rachunek sumienia dziennika — pytamy o ZACHOWANIE, nie o nazwę zmiennej
   * (ósmy nawrót tej pułapki w repo). Stan musi być odczytany DWA RAZY,
   * a drugi odczyt trafić do asercji.
   */
  /*
   * Pytamy o PORÓWNANIE, nie o liczbę wystąpień. Pierwsza wersja liczyła
   * wywołania `ileWpisow(` i sprawdzała, czy drugie stoi blisko `sprawdz(`
   * — i była ślepa: mutacja zamieniająca warunek na `true === true`
   * zostawiała drugie wywołanie w KOMUNIKACIE BŁĘDU asercji, więc licznik
   * dalej się zgadzał. Wykrył to test negatywny tej reguły.
   *
   * Teraz warunkiem jest istnienie porównania wyniku odczytu z czymkolwiek
   * — po którejkolwiek stronie operatora. Nazwy zmiennych są bez znaczenia,
   * a asercja z zabetonowanym `true` nie przechodzi.
   */
  /*
   * REGUŁA 10: asercja musi być OSIĄGALNA.
   *
   * `sprawdz()` dopisuje do tablicy błędów, ale po bloku
   * `if (bledy.length > 0) { … process.exit(1) }` nikt jej już nie czyta.
   * Wpięcie wstawione ZA tym blokiem jest więc martwe: bramka drukuje
   * „OK" i kończy kodem 0, choć asercja padła.
   *
   * Nie jest to hipoteza — tak wyszło przy pierwszym wpięciu modułu:
   * w SZEŚCIU z siedmiu bramek rozliczenie stało za blokiem błędów,
   * a mutacja `ileWpisow(php) === -1` przechodziła z kodem 0.
   */
  const ostatniOdczyt = tresc.lastIndexOf("ileWpisow(");
  const ostatnieWyjscie = tresc.lastIndexOf("process.exit(1)");
  if (ostatniOdczyt >= 0 && ostatnieWyjscie >= 0 && ostatniOdczyt > ostatnieWyjscie) {
    bledy.push(
      `${nazwa}: asercja rozliczenia stoi ZA blokiem kończącym przebieg (process.exit(1)) — jest MARTWA (N13). ` +
        "sprawdz() dopisze błąd do tablicy, ale nikt jej już nie przeczyta: bramka wydrukuje „OK” i wyjdzie z kodem 0, " +
        "choć zostawiła ślad w dzienniku. Przenieś sprzątanie i rozliczenie PRZED ten blok."
    );
  }

  const rozlicza = porownujeWynik(tresc, "ileWpisow");
  if (!rozlicza) {
    bledy.push(
      `${nazwa}: sprząta dziennik logowań, ale nie ROZLICZA się z tego — liczba wpisów musi być odczytana ` +
        "przed przebiegiem i po nim, a druga wartość trafić do asercji. Bez porównania sprzątanie jest " +
        "deklaracją: tak samo wyglądałby smoke, który kasuje CUDZE wiersze, i taki, który nie kasuje nic. " +
        "Właśnie tak wyszło na jaw, że test retencji kasował cudzy wpis wybrany przez MIN(id)."
    );
  }
}

/* ── 5-7. moduł poczty sprawdzony URUCHOMIENIOWO ──────────────────────── */

/*
 * Podstawiamy `fetch` i patrzymy, CO moduł robi — nie jak wygląda. Wzorzec na
 * kod tej klasy niezmiennika nie utrzyma: kasowanie skrzynki różni się od
 * kasowania własnych wiadomości JEDNYM polem w ładunku.
 */
{
  const oryginalny = globalThis.fetch;
  const zadania = [];
  /** Atrapa łapacza: `wiadomosci` to lista {ID}, `total` można zafałszować. */
  const atrapa = (wiadomosci, totalNaSile = null) => (adres, opcje = {}) => {
    zadania.push({ adres: String(adres), metoda: opcje.method ?? "GET", cialo: opcje.body ?? null });
    const url = String(adres);
    if (url.includes("/api/v1/messages") && (opcje.method ?? "GET") === "GET") {
      const start = Number(new URL(url).searchParams.get("start") ?? 0);
      return Promise.resolve({
        json: () =>
          Promise.resolve({
            total: totalNaSile ?? wiadomosci.length,
            messages: wiadomosci.slice(start, start + 200),
          }),
      });
    }
    return Promise.resolve({ json: () => Promise.resolve({}) });
  };

  // Import WZGLĘDNY, jak u pozostałych strażników: katalog projektu ma
  // w nazwie spację, a mieszanie ścieżki z adresem URL to klasa BLAD-014.
  const { migawkaPoczty, sprzatnijPoczte } = await import("../smoke/poczta.mjs");
  const kasujace = () => zadania.filter((z) => z.metoda === "DELETE");

  try {
    // 5. Brak własnych wiadomości → ŻADNEGO żądania kasującego.
    globalThis.fetch = atrapa([{ ID: "obca-1" }, { ID: "obca-2" }]);
    zadania.length = 0;
    const migawkaA = await migawkaPoczty();
    const skasowanoA = await sprzatnijPoczte(migawkaA);
    if (skasowanoA !== 0 || kasujace().length > 0) {
      bledy.push(
        "tools/smoke/poczta.mjs: sprzątanie przy BRAKU własnych wiadomości wysyła żądanie kasujące " +
          `(skasowano ${skasowanoA}, żądań DELETE: ${kasujace().length}). Pusta lista IDs znaczy u Mailpita ` +
          "„skasuj wszystko” — czyli bramka, która niczego nie wysłała, wyczyściłaby skrzynkę właściciela."
      );
    }

    // 6. Kasowane są WYŁĄCZNIE identyfikatory spoza migawki.
    globalThis.fetch = atrapa([{ ID: "obca-1" }, { ID: "obca-2" }]);
    const migawkaB = await migawkaPoczty();
    globalThis.fetch = atrapa([{ ID: "nasza-1" }, { ID: "obca-1" }, { ID: "obca-2" }, { ID: "nasza-2" }]);
    zadania.length = 0;
    const skasowanoB = await sprzatnijPoczte(migawkaB);
    const ladunek = kasujace().map((z) => z.cialo).join("");
    if (skasowanoB !== 2 || !ladunek.includes("nasza-1") || !ladunek.includes("nasza-2") || ladunek.includes("obca-")) {
      bledy.push(
        `tools/smoke/poczta.mjs: sprzątanie nie trzyma się migawki (skasowano ${skasowanoB}, ładunek: ${ladunek}). ` +
          "Ma kasować dokładnie wiadomości spoza migawki i nie dotykać ani jednej zastanej."
      );
    }

    // 7. Niepełna migawka ZATRZYMUJE przebieg — cudze wiadomości nie mogą
    //    zostać uznane za własne tylko dlatego, że lista się nie doczytała.
    globalThis.fetch = atrapa([{ ID: "obca-1" }], 99);
    let zatrzymalo = false;
    try {
      await migawkaPoczty();
    } catch {
      zatrzymalo = true;
    }
    if (!zatrzymalo) {
      bledy.push(
        "tools/smoke/poczta.mjs: NIEPEŁNA migawka przechodzi bez zatrzymania. Łapacz zadeklarował więcej " +
          "wiadomości, niż oddał — a każda niedoczytana staje się wtedy „naszą” i zostanie skasowana."
      );
    }
  } finally {
    globalThis.fetch = oryginalny;
  }
}

if (bledy.length > 0) {
  console.error("straznik-higieny-smokow:");
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}

console.log(
  "straznik-higieny-smokow: żadna bramka nie kasuje skrzynki hurtowo, bramki wysyłające pocztę biorą migawkę, " +
    "sprzątają i rozliczają się ze skrzynki oraz z zapisów na kursy, bramki logujące się sprzątają dziennik " +
    "logowań i rozliczają się z niego asercją, która jest osiągalna, a moduł poczty (sprawdzony uruchomieniowo) " +
    "nie kasuje przy pustej liście, trzyma się migawki i zatrzymuje przebieg przy niepełnym odczycie."
);
