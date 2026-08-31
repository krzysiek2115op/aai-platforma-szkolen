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

if (bledy.length > 0) {
  console.error("straznik-tutora:");
  for (const b of bledy) console.error(`  - ${b}`);
  process.exit(1);
}

console.log(
  "straznik-tutora: kopia jest podpięta, jedzie w jedną stronę, każdy zapis ją ogłasza, wpisy Tutora rusza jedno miejsce, meta przez wp_slash, spłaszczenie sekcji ma asercję, awaria kopii nie cofa zapisu, pusty uuid nie dopasowuje cudzego wpisu, ukrycie kursu nie odbiera dostępu kupującemu ani nie rozdaje go obcemu."
);
