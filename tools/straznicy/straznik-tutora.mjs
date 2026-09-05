/**
 * Strażnik kopii kursu w Tutor LMS — reguły, których złamanie NIE objawia
 * się błędem.
 *
 * PO CO. Architektura etapu WordPress trzyma kurs w dwóch miejscach: nasze
 * tabele `wp_aai_sklep_*` są źródłem prawdy, a wpisy Tutora kopią dla LMS-a,
 * który daje konta i dostęp za logowaniem. Taki układ ma jedną chorobę
 * i wszyscy ją znamy z nazwiska: kopie rozjeżdżają się PO CICHU. Nic się nie
 * zapala, strona działa, tylko klient po zalogowaniu czyta inny tekst, niż
 * właściciel widzi w kreatorze. To jest ta sama klasa, co BLAD-015
 * (obietnica strony bez pokrycia w produkcie) i znalezisko #1 przeglądu B7.
 *
 * Kontrolę STANU danych robi `wp aai-sklep sprawdz-tutora` i `smoke-wp-tutor`
 * na żywej instalacji. Tutaj pilnujemy KODU — tego, żeby mechanizm, który ma
 * nie dopuścić do rozjazdu, nie został po cichu rozłączony.
 *
 * SIEDEM NIEZMIENNIKÓW (każdy z własną mutacją w audyt-straznikow):
 *   1. synchronizacja jest PODPIĘTA w pliku głównym wtyczki — kontrola warta
 *      jest tyle, ile jej podpięcie (lekcja z uruchom-wszystkie.mjs),
 *   2. kierunek jest JEDNOKIERUNKOWY: klasa kopii nie pisze do naszych tabel
 *      ani nie woła warstwy zapisu,
 *   3. każda publiczna droga zapisu ogłasza zmianę kursu — inaczej zmiana
 *      nie ma jak dojechać do kopii,
 *   4. wpisy Tutora tworzy i kasuje WYŁĄCZNIE klasa kopii,
 *   5. każde `update_post_meta` w niej idzie przez `wp_slash` (bez tego
 *      WordPress zjada backslashe — 38 sztuk w 9 lekcjach kursu o Gicie),
 *   6. spłaszczenie sekcji do pól Tutora ma ASERCJĘ — nieznany kształt
 *      zatrzymuje kopię, zamiast wydrukować JSON na stronie dla człowieka,
 *   7. awaria kopii NIE cofa zapisu właściciela: słuchacze łapią wyjątek
 *      i zapamiętują błąd, zamiast wywalać zapis.
 *
 * Użycie: node tools/straznicy/straznik-tutora.mjs
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const WTYCZKA = "wordpress/wtyczki/aai-sklep";
const PLIK_KOPII = "includes/class-aai-sklep-tutor.php";
const PLIK_ZAPISU = "includes/class-aai-sklep-zapis.php";
const PLIK_GLOWNY = "aai-sklep.php";

const bledy = [];

/** Kod bez komentarzy — reguły celują w ZACHOWANIE, nie w opis. */
const kod = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const czytaj = (wzgledny) => readFileSync(join(WTYCZKA, wzgledny), "utf8");

if (!existsSync(join(WTYCZKA, PLIK_KOPII))) {
  console.log(
    "straznik-tutora: pominięte — wtyczka nie ma jeszcze klasy kopii do Tutora."
  );
  process.exit(0);
}

const kopia = kod(czytaj(PLIK_KOPII));

/* ————————————————— 1. synchronizacja jest podpięta ————————————————— */

const glowny = kod(czytaj(PLIK_GLOWNY));
if (!/Aai_Sklep_Tutor::zarejestruj\s*\(/.test(glowny)) {
  bledy.push(
    `${PLIK_GLOWNY}: klasa kopii do Tutora nie jest rejestrowana. Kod, który nikogo nie słucha, wygląda dokładnie tak samo jak działający — a kopia cicho przestaje nadążać za kreatorem.`
  );
}

/* ————————————————— 2. kierunek jest jednokierunkowy ————————————————— */

if (/Aai_Sklep_Zapis\s*::/.test(kopia)) {
  bledy.push(
    `${PLIK_KOPII}: klasa kopii woła warstwę zapisu. Kopia ma jechać TYLKO w jedną stronę (nasze tabele → Tutor); droga powrotna znaczy, że zmiana zrobiona w Course Builderze wróci do źródła prawdy i nikt nie będzie wiedział, która wersja jest właściwa.`
  );
}

for (const [wzorzec, opis] of [
  [/\$wpdb->(insert|update|delete|replace)\s*\(/, "pisze do bazy metodą $wpdb"],
  [/\b(INSERT\s+INTO|UPDATE\s+`|DELETE\s+FROM)/i, "wykonuje zapisujące zapytanie SQL"],
]) {
  if (wzorzec.test(kopia)) {
    bledy.push(
      `${PLIK_KOPII}: klasa kopii ${opis}. Do NASZYCH tabel pisze wyłącznie warstwa zapisu — tylko ona zna transakcje, dziennik audytu i ochronę napisanej treści.`
    );
  }
}

/* ————————————————— 3. każdy zapis ogłasza zmianę ————————————————— */

if (existsSync(join(WTYCZKA, PLIK_ZAPISU))) {
  const zapis = kod(czytaj(PLIK_ZAPISU));

  /*
   * Ciało metody bierzemy od jej nagłówka do nagłówka następnej metody
   * publicznej — nie po nazwie wywołania. Wzorzec zaczepiony o nazwę
   * (`self::powiadom(`) umarłby po przemianowaniu pomocnika, a strażnik
   * zzieleniałby na zmianie, której miał pilnować (lekcja z 0.29.0).
   */
  const metody = [...zapis.matchAll(/public static function (\w+)\s*\([\s\S]*?\n\t\}/g)];
  const ogloszenia = new Map(
    metody.map((m) => [m[1], /do_action\s*\(\s*'aai_sklep_kurs_|self::powiadom\s*\(/.test(m[0])])
  );

  for (const [metoda, skutek] of [
    ["zapisz_kurs", "zmiana kursu z kreatora nie dojedzie do kopii"],
    ["usun_kurs", "skasowany kurs zostanie w Tutorze jako sierota, do której LMS dalej daje dostęp"],
    ["zapisz_tresc_lekcji", "poprawiona proza zostanie w kopii w starej wersji — klient przeczyta co innego niż właściciel napisał"],
    ["ustaw_status", "publikacja albo cofnięcie publikacji nie zmieni stanu wpisów w Tutorze"],
  ]) {
    if (!ogloszenia.has(metoda)) {
      bledy.push(
        `${PLIK_ZAPISU}: nie ma publicznej metody ${metoda}() — strażnik przestał wiedzieć, czego pilnuje. Popraw listę dróg zapisu.`
      );
      continue;
    }
    if (!ogloszenia.get(metoda)) {
      bledy.push(
        `${PLIK_ZAPISU}: ${metoda}() nie ogłasza zmiany kursu (brak akcji aai_sklep_kurs_*). Skutek: ${skutek}.`
      );
    }
  }
}

/* ————————————————— 4. wpisy Tutora rusza tylko klasa kopii ————————————————— */

function plikiPhp(katalog = "") {
  const wynik = [];
  const pelny = join(WTYCZKA, katalog);
  for (const wpis of readdirSync(pelny)) {
    const wzgledny = join(katalog, wpis);
    if (statSync(join(WTYCZKA, wzgledny)).isDirectory()) wynik.push(...plikiPhp(wzgledny));
    else if (wpis.endsWith(".php")) wynik.push(wzgledny);
  }
  return wynik;
}

const PISZE_WPISY = /\b(wp_insert_post|wp_update_post|wp_delete_post|set_post_thumbnail)\s*\(/;

for (const plik of plikiPhp()) {
  if (plik === PLIK_KOPII) continue;
  if (PISZE_WPISY.test(kod(czytaj(plik)))) {
    bledy.push(
      `${plik}: tworzy albo kasuje wpisy WordPressa poza klasą kopii. Wszystko, co dotyka wpisów Tutora, musi iść przez jedno miejsce — inaczej kopia zaczyna mieć dwóch autorów i przestaje dać się porównać ze źródłem.`
    );
  }
}

/* ————————————————— 5. meta zawsze przez wp_slash ————————————————— */

for (const [, argumenty] of kopia.matchAll(/update_post_meta\s*\(([^;]*?)\)\s*;/g)) {
  if (!/wp_slash\s*\(/.test(argumenty)) {
    bledy.push(
      `${PLIK_KOPII}: update_post_meta bez wp_slash — „${argumenty.trim().slice(0, 60)}…”. WordPress puszcza wartość meta przez wp_unslash, więc bez tego znika KAŻDY backslash: ścieżki C:\\Users i sekwencje \\n z kursu o Gicie. Objaw jest cichy — dopiero powtórny zapis melduje „zaktualizowano" bez końca.`
    );
  }
}

/* ————————————————— 6. spłaszczenie sekcji ma asercję ————————————————— */

if (!/\{"|\[\{/.test(kopia) || !/throw new Aai_Sklep_Blad_Zapisu/.test(kopia)) {
  bledy.push(
    `${PLIK_KOPII}: brak asercji przy spłaszczaniu sekcji do pól Tutora. Tutor drukuje swoje cztery pola WPROST, więc struktura wrzucona tam bez spłaszczenia pokazuje się człowiekowi jako JSON — dokładnie to zgłosił właściciel zrzutem przed 0.39.1. Kształt sekcji ma ZATRZYMAĆ kopię, a nie wyjechać na stronę.`
  );
}

/* ————————————————— 7. awaria kopii nie cofa zapisu ————————————————— */

for (const sluchacz of ["na_zmianie", "na_usunieciu"]) {
  const cialo = kopia.match(new RegExp(`function ${sluchacz}\\s*\\([\\s\\S]*?\\n\\t\\}`));
  if (!cialo) {
    bledy.push(`${PLIK_KOPII}: nie ma słuchacza ${sluchacz}() — strażnik przestał wiedzieć, czego pilnuje.`);
    continue;
  }
  if (!/catch\s*\(\s*Throwable/.test(cialo[0])) {
    bledy.push(
      `${PLIK_KOPII}: ${sluchacz}() nie łapie wyjątku. Kopia jest SKUTKIEM zapisu, nie jego warunkiem — awaria Tutora albo jego wyłączenie nie ma prawa wywalić właścicielowi zapisu własnej treści.`
    );
  }
}

/* PUSTY UUID NIE MA PRAWA NICZEGO DOPASOWAĆ.

   Sweep P5. Wyszukanie wpisu po `meta_value => ''` dopasowuje PIERWSZY
   LEPSZY wpis danego typu — więc wiersz o pustym identyfikatorze
   „znajdował" CUDZY moduł w Tutorze, przejmował go (tytuł, rodzic, uuid),
   a sprzątanie nadmiaru kasowało potem jego lekcje. Zmierzone: 18 lekcji
   Kursu 2 zniknęło z kopii, bez jednego objawu — kontrola widziała to
   dopiero po fakcie, a smoke meldował sukces, bo liczył własne ślady.

   Reguła pyta o ZACHOWANIE (wyjście z funkcji przy pustej wartości), nie
   o nazwę stałej ani o obecność słowa — ta pułapka wracała w tym repo
   sześć razy. */
{
  const plik = join(WTYCZKA, PLIK_KOPII);
  const tresc = readFileSync(plik, "utf8");
  const i = tresc.indexOf("function znajdz_po_uuid");
  if (i < 0) {
    bledy.push(`${plik}: nie ma wyszukiwania wpisu po uuid — nie mam czego pilnować, sprawdź, czy kopia dopasowuje wpisy inaczej.`);
  } else {
    const naglowek = tresc.slice(i, tresc.indexOf("get_posts", i));
    if (!/(''|""|0)\s*===\s*(trim\s*\(\s*)?\$uuid|\$uuid\s*===\s*('' |''|"")|empty\s*\(\s*\$uuid\s*\)|''\s*===\s*trim/.test(naglowek) || !/return\s+0\s*;/.test(naglowek)) {
      bledy.push(
        `${plik}: znajdz_po_uuid() nie odrzuca PUSTEGO identyfikatora przed zapytaniem. Zapytanie po pustym meta dopasowuje pierwszy lepszy wpis, więc kopia przejmuje CUDZY moduł i kasuje jego lekcje jako nadmiar (sweep P5: tak zniknęło 18 lekcji Kursu 2).`
      );
    }

    /*
     * KOSZ TEŻ JEST STANEM. `post_status => 'any'` znaczy w WordPressie
     * „każdy status POZA `trash` i `auto-draft`", więc kopia kursu wrzucona
     * do kosza stawała się dla nas niewidzialna. Skutki były dwa i oba ciche:
     * `kupujacy()` zwracał 0 przy ŻYWYCH zapisach — zmierzone: 4 zapisy
     * `completed` w bazie, a hamulec C2 („ten kurs ma N kupujących")
     * nie pytał o nic i właściciel kasował kurs, za który zapłacono —
     * a synchronizacja zakładała DRUGĄ kopię obok tej w koszu.
     *
     * Reguła pyta o samo wyszukiwanie po uuid, nie o inne zapytania w pliku:
     * `usun_nadmiar()` ma prawo NIE widzieć kosza (nie widzieć = nie kasować).
     */
    const poczatekZapytania = tresc.indexOf("get_posts", i);
    const zapytanie = tresc.slice(poczatekZapytania, tresc.indexOf(")", tresc.indexOf("meta_value", poczatekZapytania)));
    // SAMOKONTROLA ZAKRESU: pusty wycinek znaczy, że reguła nie czyta
    // zapytania — i milczy zamiast pilnować. Pierwsza wersja szukała
    // `meta_value` od POCZĄTKU METODY, więc trafiała przed `get_posts`
    // i wycinek wychodził PUSTY; test negatywny przeszedł na zielono.
    if (!/'post_status'\s*=>/.test(zapytanie)) {
      bledy.push(
        `${plik}: nie umiem odczytać zapytania znajdz_po_uuid() — reguła o koszu nie ma czego sprawdzić i przeszłaby PO PUSTCE.`
      );
    } else if (/'post_status'\s*=>\s*'any'/.test(zapytanie)) {
      bledy.push(
        `${plik}: znajdz_po_uuid() szuka po 'any', a to w WordPressie NIE OBEJMUJE kosza. Kopia kursu w koszu przestaje istnieć dla kupujacy() — zmierzone: 0 przy czterech żywych zapisach, więc hamulec C2 milczy i kurs opłacony przez ludzi kasuje się bez pytania. Do tego synchronizacja zakłada wtedy drugą kopię obok tej w koszu.`
      );
    }
  }
}

/* PRZERWANA SYNCHRONIZACJA MA SIĘ SAMA WYLECZYĆ — I TO JEST CAŁA JEJ OBRONA.

   REA-BD-F1-001: `synchronizuj_kurs()` pisze kurs, potem moduły, potem lekcje
   jako osobne zapisy — bez transakcji, bo `wp_insert_post()` transakcji nie
   obsługuje. Przerwanie w środku pętli zostawia kopię niekompletną. Wolno tak
   tylko pod jednym warunkiem: powtórzenie synchronizacji DOPISUJE brakujące
   dzieci, zamiast tworzyć drugi komplet. Ten warunek jest dziś spełniony,
   bo zapis szuka wpisu po uuid PRZED wstawieniem nowego.

   ZMIERZONE 2026-09-05 na `:8892`: skasowanie 5 lekcji i 1 modułu z kopii
   dało kontroli kod 1; powtórzony `wp aai-sklep sync` → „6 utworzonych,
   0 usuniętych", stan wrócił do 73 lekcji i 12 modułów, kontrola kod 0,
   ZERO duplikatów.

   Bez tej reguły nic nie pilnowało tamtej własności: zapis bezwarunkowy
   mnożyłby komplet przy KAŻDEJ synchronizacji, a rozstrzygnięcie „to samo
   znalezisko jest tu łagodne" straciłoby podstawę. Reguła pyta o STRUKTURĘ
   decyzji (istniejący wpis → gałąź aktualizacji, brak → gałąź wstawienia),
   nie o nazwę metody wyszukującej — ta pułapka wracała w tym repo
   dziewięć razy. */
{
  const plik = join(WTYCZKA, PLIK_KOPII);
  const tresc = readFileSync(plik, "utf8");
  const wstawienia = [...tresc.matchAll(/wp_insert_post\s*\(/g)];

  if (wstawienia.length === 0) {
    bledy.push(
      `${plik}: nie ma ani jednego wstawienia wpisu — reguła idempotencji kopii przeszłaby po pustce. Sprawdź, czy kopia powstaje inaczej.`
    );
  }

  for (const m of wstawienia) {
    const start = tresc.lastIndexOf("function ", m.index);
    const blok = tresc.slice(start < 0 ? 0 : start, m.index);

    // 1. wynik wyszukania istniejącego wpisu po uuid trafia do zmiennej,
    // 2. na niej zapada rozstrzygnięcie „już jest",
    // 3. wstawienie leży w gałęzi przeciwnej.
    const przypisanie = blok.match(/\$(\w+)\s*=\s*[^;]*\(\s*\$uuid\b[^;]*\)\s*;/);
    const zmienna = przypisanie ? przypisanie[1] : null;
    const rozstrzygniecie = zmienna
      ? new RegExp(`if\\s*\\(\\s*\\$${zmienna}\\s*>\\s*0\\s*\\)`).test(blok)
      : false;
    const galazPrzeciwna = /\}\s*else\s*\{/.test(blok);

    if (!zmienna || !rozstrzygniecie || !galazPrzeciwna) {
      bledy.push(
        `${plik}: wpis Tutora powstaje BEZ WARUNKU „czy taki już jest" (wyszukanie po uuid → gałąź aktualizacji, brak → gałąź wstawienia). Synchronizacja nie ma transakcji, więc jedyną obroną przed przerwaniem jest to, że powtórzenie dopisuje brakujące dzieci — bez tego warunku każdy przebieg tworzyłby DRUGI komplet modułów i lekcji (REA-BD-F1-001).`
      );
    }
  }
}

/* UKRYCIE KURSU NIE MA PRAWA ODEBRAĆ DOSTĘPU KUPUJĄCEMU — ANI ROZDAĆ GO OBCEMU.

   Znalezisko 2 testu całości (2026-08-31) i decyzja właściciela: „Ukryj"
   zabiera kurs ze SKLEPU, a kto go kupił — czyta dalej. Do 0.58.0 cała
   kopia szła jednym statusem, więc ukrycie przepisywało 73 lekcje na
   `private` i kupujący dostawał 404, przy obu kontrolach zielonych.

   Obie połowy są zmierzone w kodzie Tutora, nie wyprowadzone:
   - MATERIAŁ na `private` = koniec dostępu, bo `private` odcina każdego
     bez `read_private_posts`, zanim nasza bramka zdąży spytać o zapis;
   - KURS na `publish` = darmowy zapis dla KAŻDEGO zalogowanego, bo
     `Course::enroll_now()` (publiczny handler POST) zapisuje na każdy kurs
     niebędący `purchasable`, a kurs zdjęty ze sprzedaży ma
     `_tutor_course_price_type = free`. Ten handler zatrzymuje wyłącznie
     status `private` — `draft` też by przepuścił (sprawdzone w jego kodzie).
     Zmierzone testem negatywnym: przy `publish` obcy zapisał się na ukryty
     kurs i dostał cały materiał.

   Reguła pyta o WARTOŚCI W MAPACH, nie o obecność nazw — mapa z nazwą
   i złą wartością jest groźniejsza niż jej brak. */
{
  const mapa = (nazwa) => {
    const i = kopia.indexOf(`const ${nazwa} = array(`);
    if (i < 0) return null;
    const cialo = kopia.slice(i, kopia.indexOf(");", i));
    return Object.fromEntries(
      [...cialo.matchAll(/'(\w+)'\s*=>\s*'(\w+)'/g)].map((m) => [m[1], m[2]])
    );
  };
  const kursu = mapa("STATUS_KURSU_NA_WP");
  const materialu = mapa("STATUS_MATERIALU_NA_WP");

  if (null === kursu || null === materialu) {
    bledy.push(
      `${PLIK_KOPII}: nie ma rozdzielonych map statusu (STATUS_KURSU_NA_WP i STATUS_MATERIALU_NA_WP). Jedna mapa na całą kopię znaczy, że ukrycie kursu przepisuje też jego lekcje — a wtedy kupujący traci dostęp do materiału, za który zapłacił.`
    );
  } else {
    if ("private" !== kursu.archived) {
      bledy.push(
        `${PLIK_KOPII}: ukryty kurs dostaje w Tutorze status „${kursu.archived}" zamiast „private". Tutor odmawia darmowego zapisu WYŁĄCZNIE przy „private" — przy każdym innym statusie dowolny zalogowany bierze ukryty kurs za darmo (zmierzone: obcy zapisał się i dostał cały materiał).`
      );
    }
    for (const [stan, oczekiwany, skutek] of [
      ["published", "publish", "opublikowany kurs nie byłby czytelny dla nikogo"],
      ["draft", "draft", "materiał kursu, którego nigdy nie było w sprzedaży, stałby się dostępny"],
      ["archived", "publish", "kupujący straciłby dostęp do materiału, za który zapłacił — dokładnie ten błąd naprawiał krok testu całości"],
    ]) {
      if (materialu[stan] !== oczekiwany) {
        bledy.push(
          `${PLIK_KOPII}: materiał kursu w stanie „${stan}" dostaje status „${materialu[stan]}" zamiast „${oczekiwany}". Skutek: ${skutek}.`
        );
      }
    }
  }
}

/*
 * SYNCHRONIZACJA NIE KASUJE CUDZEJ PRACY — I TO MA BYĆ W KODZIE, NIE TYLKO
 * W OBIETNICY.
 *
 * `usun_nadmiar()` kasowała każdy wpis, którego uuid nie było na liście
 * „zostają". Wpis dodany ręcznie w Course Builderze Tutora ma uuid PUSTY,
 * a pusty nigdy na tej liście nie jest — więc leciało
 * `wp_delete_post( $id, true )`: force, z pominięciem kosza, bez cofnięcia.
 * Zaprzeczało to obietnicy zapisanej w DWÓCH miejscach repozytorium
 * (CLAUDE.md i README), a bramka, która miała tego dowodzić, tworzyła obcy
 * wpis BEZ `post_parent` — strukturalnie poza zasięgiem pętli — więc
 * przechodziła PO PUSTCE.
 *
 * Reguła pyta o rozstrzygnięcie: pusty uuid ma kończyć obieg pętli, zanim
 * dojdzie do kasowania.
 */
{
  const plikKopii = join(WTYCZKA, PLIK_KOPII);
  const tresc = readFileSync(plikKopii, "utf8");
  const i = tresc.indexOf("function usun_nadmiar");
  if (i < 0) {
    bledy.push(
      `${plikKopii}: nie ma usun_nadmiar() — samokontrola zakresu: reguła o cudzych wpisach nie ma czego pilnować.`
    );
  } else {
    const cialo = tresc.slice(i, tresc.indexOf("\n\t}", i));
    const kasowania = (cialo.match(/wp_delete_post\s*\(/g) ?? []).length;
    const oslony = (cialo.match(/''\s*===\s*\$uuid\s*\|\||\|\|\s*''\s*===\s*\$uuid/g) ?? []).length;
    if (kasowania === 0) {
      bledy.push(`${plikKopii}: usun_nadmiar() nic nie kasuje — samokontrola zakresu, reguła mierzyłaby pustkę.`);
    } else if (oslony < kasowania) {
      bledy.push(
        `${plikKopii}: usun_nadmiar() kasuje ${kasowania} rodzajów wpisów, a tylko ${oslony} sprawdza pusty uuid. Wpis dodany ręcznie w Course Builderze ma uuid PUSTY — leci wtedy wp_delete_post(force), bez kosza i bez cofnięcia, razem z postępem klientów, którzy tę lekcję odhaczyli. CLAUDE.md i README obiecują, że tego NIE robimy.`
      );
    }
  }
}

/* ALARM O ROZJEŹDZIE KOPII MUSI UMIEĆ ZGASNĄĆ (MAR-A-08).

   Do 0.74.0 stan błędu synchronizacji żył w JEDNYM `update_option()`
   i był zatrzaskiem oraz kłamcą naraz — Plugin 2 opisał tę wadę u siebie
   słowo w słowo i naprawił, a Plugin 1 miał ją dalej, w JEDYNYM alarmie
   o cichym rozjeździe kopii dla klientów:

     - awaria kursu B nadpisywała zapamiętaną awarię kursu A;
     - udana kopia flagi NIE kasowała, więc notatka w kokpicie obiecywała
       „zapisanie kursu jeszcze raz robi to samo", robiła to naprawdę
       i wisiała dalej (BLAD-018);
     - `sprawdz-tutora` wliczało flagę do zgody, więc po dowolnej
       historycznej awarii kontrola świeciła kodem 1 NA ZAWSZE.

   Reguła pyta o dwie rzeczy, obie o rozstrzygnięciu: czy stan jest MAPĄ
   (zapis dopisuje do odczytanej mapy, a nie nadpisuje slot) i czy udana
   synchronizacja gasi wpis TEGO kursu. */
{
  const plik = join(WTYCZKA, PLIK_KOPII);
  const c = kod(readFileSync(plik, "utf8"));

  const iZapamietaj = c.indexOf("function zapamietaj_blad(");
  if (iZapamietaj < 0) {
    bledy.push(`${plik}: nie ma zapamietaj_blad() — samokontrola zakresu: reguła o cyklu życia alarmu nie ma czego pilnować (MAR-A-08).`);
  } else {
    const cialo = c.slice(iZapamietaj, c.indexOf("\n\t}", iZapamietaj));
    // Mapa: zapis czyta stan i dopisuje pod kluczem kursu.
    if (!/\$\w+\s*=\s*self::bledy\(\)/.test(cialo) || !/\$\w+\[\s*\$id\s*\]\s*=/.test(cialo)) {
      bledy.push(
        `${plik}: zapamietaj_blad() nie dopisuje do MAPY per kurs (brak odczytu self::bledy() albo przypisania pod $id). Jeden slot to zatrzask i kłamca naraz: awaria kursu B kasuje alarm kursu A, a alarm nie ma jak zgasnąć po naprawie (MAR-A-08).`
      );
    }
  }

  const iNaZmianie = c.indexOf("function na_zmianie(");
  if (iNaZmianie < 0) {
    bledy.push(`${plik}: nie ma na_zmianie() — samokontrola zakresu reguły o gaszeniu alarmu (MAR-A-08).`);
  } else {
    const cialo = c.slice(iNaZmianie, c.indexOf("\n\t}", iNaZmianie));
    // Gaszenie MUSI być w gałęzi sukcesu (przed catch), i to dla TEGO kursu.
    const doCatch = cialo.split("catch")[0];
    if (!/zapomnij_blad\(\s*\$id\s*\)/.test(doCatch)) {
      bledy.push(
        `${plik}: udana kopia nie gasi alarmu tego kursu (brak zapomnij_blad( $id ) w gałęzi sukcesu na_zmianie()). Notatka w kokpicie obiecuje wtedy naprawę, wykonuje ją i wisi dalej, a kontrola świeci kodem 1 przy danych zgodnych co do znaku (MAR-A-08, BLAD-018).`
      );
    }
  }
}

/* DROGI MASOWE OGŁASZAJĄ ZMIANĘ WTYCZKOM SIOSTRZANYM (MAR-A-10, MAR-A-17).

   `wp aai-sklep sync` i import wołały `synchronizuj_kurs()` WPROST,
   z pominięciem akcji `aai_sklep_kurs_zmieniony`. Skutki były różne i oba
   ciche: import na świeżej instalacji zostawiał WSZYSTKIE produkty jako
   `draft` (katalog działa, nic nie da się kupić — zmierzone), a `sync`
   odtwarzający skasowany wpis kursu nie odtwarzał pary met powiązania,
   czyli tego końca, który rozdaje kurs ZA DARMO.

   Reguła pyta o zachowanie, nie o nazwę pliku: żadna droga poza samą
   klasą kopii nie wywołuje `synchronizuj_kurs()` bez ogłoszenia. */
{
  const OGLASZA = "synchronizuj_i_oglos";
  const kopiaPlik = join(WTYCZKA, PLIK_KOPII);
  const kopiaKod = kod(readFileSync(kopiaPlik, "utf8"));

  // Samokontrola zakresu: metoda ogłaszająca musi istnieć i naprawdę emitować.
  const iOglos = kopiaKod.indexOf(`function ${OGLASZA}(`);
  if (iOglos < 0) {
    bledy.push(`${kopiaPlik}: nie ma ${OGLASZA}() — drogi masowe nie mają czym ogłosić zmiany siostrom (MAR-A-10/A-17).`);
  } else {
    const cialo = kopiaKod.slice(iOglos, kopiaKod.indexOf("\n\t}", iOglos));
    if (!/do_action\(\s*'aai_sklep_kurs_zmieniony'/.test(cialo)) {
      bledy.push(`${kopiaPlik}: ${OGLASZA}() nie emituje aai_sklep_kurs_zmieniony — nazwa obiecuje ogłoszenie, którego nie ma (MAR-A-10/A-17).`);
    }
    // Własna kopia MUSI być na czas ogłoszenia wstrzymana, a stan PRZYWRÓCONY,
    // nie wyzerowany: import wstrzymuje na całą pętlę.
    if (!/\$\w+\s*=\s*self::\$wstrzymana[\s\S]{0,200}?self::\$wstrzymana\s*=\s*true[\s\S]{0,400}?finally[\s\S]{0,200}?self::\$wstrzymana\s*=\s*\$\w+/.test(cialo)) {
      bledy.push(
        `${kopiaPlik}: ${OGLASZA}() nie wstrzymuje własnej kopii na czas ogłoszenia z przywróceniem poprzedniego stanu. Bez wstrzymania na_zmianie() przechodzi całą pracę drugi raz; bez przywrócenia (a nie wyzerowania) import odsłania kopię w środku swojej pętli (MAR-A-10/A-17).`
      );
    }
  }

  // Żadne miejsce POZA klasą kopii nie woła synchronizuj_kurs() wprost.
  const pliki = [];
  const zbierz = (k) => {
    for (const w of readdirSync(k)) {
      const s = join(k, w);
      if (statSync(s).isDirectory()) zbierz(s);
      else if (w.endsWith(".php")) pliki.push(s);
    }
  };
  zbierz(WTYCZKA);
  let wolan = 0;
  for (const p of pliki) {
    if (p.endsWith(PLIK_KOPII)) continue;
    const t = kod(readFileSync(p, "utf8"));
    for (const m of t.matchAll(/Aai_Sklep_Tutor::synchronizuj_kurs\s*\(/g)) {
      wolan += 1;
      const nr = t.slice(0, m.index).split("\n").length;
      bledy.push(
        `${p}:${nr}: woła synchronizuj_kurs() z pominięciem ogłoszenia. Plugin 2 nie dostaje wtedy sygnału: po imporcie produkty zostają szkicami (nic nie da się kupić), a po odtworzeniu skasowanego wpisu kurs zostaje bez pary met powiązania, czyli rozdawany za darmo. Wołaj ${OGLASZA}() (MAR-A-10/A-17).`
      );
    }
  }
  // Samokontrola: obie drogi masowe muszą tej metody używać.
  const uzycia = pliki.filter((p) => !p.endsWith(PLIK_KOPII)).filter((p) => new RegExp(OGLASZA).test(readFileSync(p, "utf8"))).length;
  if (0 === wolan && uzycia < 2) {
    bledy.push(
      `${WTYCZKA}: tylko ${uzycia} plik(i) poza klasą kopii wołają ${OGLASZA}() przy oczekiwanych co najmniej 2 (sync i import) — reguła o ogłaszaniu przechodziłaby po pustce (samokontrola zakresu, MAR-A-10/A-17).`
    );
  }
}

/* POWRÓT WTYCZKI OGŁASZA KURSY SIOSTROM (MAR-A-14).

   Deaktywacja Pluginu 2 przestawia produkty na `draft`, a jego aktywacja
   próbuje to cofnąć — i wychodzi na braku Pluginu 1, gdy ten był wtedy
   wyłączony. Bez pętli w haku aktywacji powrót Pluginu 1 nie synchronizował
   NICZEGO: sklep miał działający katalog, w którym nic nie dało się kupić,
   do ręcznego `wp aai-platnosci sync` (zmierzone). */
{
  const g = kod(czytaj(PLIK_GLOWNY));
  const i = g.indexOf("register_activation_hook");
  if (i < 0) {
    bledy.push(`${join(WTYCZKA, PLIK_GLOWNY)}: nie ma haka aktywacji — samokontrola zakresu reguły o ogłaszaniu kursów po powrocie wtyczki (MAR-A-14).`);
  } else {
    const blok = g.slice(i, i + 2500);
    if (!/do_action\(\s*'aai_sklep_kurs_zmieniony'/.test(blok)) {
      bledy.push(
        `${join(WTYCZKA, PLIK_GLOWNY)}: aktywacja nie ogłasza kursów (brak do_action aai_sklep_kurs_zmieniony w haku aktywacji). Powrót tej wtyczki po wyłączeniu zostawia wtedy produkty Pluginu 2 jako szkice na zawsze — katalog działa, kupić nie da się nic, i nic tego nie zgłasza (MAR-A-14).`
      );
    }
    if (!/catch\s*\(\s*\\?Throwable\s/.test(blok)) {
      bledy.push(
        `${join(WTYCZKA, PLIK_GLOWNY)}: hak aktywacji nie ma osłony catch ( Throwable ). Wyjątek przy aktywacji wtyczki to dla właściciela biały ekran w kokpicie (MAR-A-14).`
      );
    }
  }
}

if (bledy.length > 0) {
  console.error("straznik-tutora:");
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}

console.log(
  "straznik-tutora: kopia jest podpięta, jedzie w jedną stronę, każdy zapis ją ogłasza, wpisy Tutora rusza jedno miejsce, meta przez wp_slash, spłaszczenie sekcji ma asercję, awaria kopii nie cofa zapisu, pusty uuid nie dopasowuje cudzego wpisu, przerwana synchronizacja leczy się powtórzeniem zamiast mnożyć komplet, ukrycie kursu nie odbiera dostępu kupującemu ani nie rozdaje go obcemu, cudze wpisy z Course Buildera zostają, alarm o rozjeździe jest mapą per kurs i gaśnie po naprawie, drogi masowe ogłaszają zmianę siostrom, a powrót wtyczki ogłasza kursy."
);
