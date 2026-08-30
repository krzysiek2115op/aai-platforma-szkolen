/**
 * Higiena poczty warsztatu — wspólny moduł smoke'ów WP.
 *
 * PO CO. Łapacz poczty (Mailpit, `wordpress/srodowisko/`) jest zasobem
 * WSPÓLNYM: piszą do niego nasze bramki, ale zagląda tam też właściciel,
 * kiedy testuje sklep ręcznie. Do 0.53.0 obie strony robiły z nim rzecz
 * niebezpieczną, i to w przeciwnych kierunkach:
 *
 *   - `smoke-wp-zakup` i `smoke-wp-zwroty` NIE SPRZĄTAŁY po sobie —
 *     zmierzone na czystej skrzynce: 21 i 15 wiadomości na przebieg.
 *     Po kilku bramkach właściciel szukał swojego maila wśród kilkudziesięciu
 *     cudzych;
 *   - `smoke-wp-maile` sprzątał ODWROTNIE: kasował CAŁĄ skrzynkę, trzynaście
 *     razy w trakcie przebiegu (potrzebuje pustej, żeby policzyć „wyszedł
 *     dokładnie jeden mail”). Zmierzone: 36 wiadomości → 0. To jest czwarte
 *     zgłoszenie z testu ręcznego P6 — właścicielowi zniknął z podglądu mail,
 *     który przed chwilą dostał, i wyglądało to jak usterka dostarczania;
 *   - `postaw.sh` kasował skrzynkę dwa razy przy weryfikacji poczty, a jest
 *     ROZKAZEM kroku zerowego każdego testu ręcznego.
 *
 * ZASADA, która z tego wynika i której pilnuje `straznik-higieny-smokow`:
 * **bramka kasuje wyłącznie to, co sama wysłała.** „Przywróć stan” to co
 * innego niż „wyczyść wszystko” — ta sama lekcja, co przy `smoke-wp-motyw`,
 * który w 0.51.0 zamykał sklep za sobą zamiast przywrócić zastany stan.
 *
 * JAK. Na starcie bierzemy migawkę identyfikatorów wiadomości ZASTANYCH
 * (cudzych). Wszystko, czego w migawce nie ma, jest nasze — i tylko to wolno
 * skasować oraz tylko o to wolno pytać przy asercjach „wyszedł dokładnie
 * jeden”. Migawka jest stała przez cały przebieg, bo obcych nie ruszamy.
 *
 * MIGAWKA MUSI BYĆ PEŁNA. Mailpit stronicuje listę (`limit`, `start`),
 * a jego domyślny limit to 50. Migawka ucięta w połowie zamieniłaby cudze
 * wiadomości w „nasze” i skasowała je — czyli dokładnie to, czemu ten moduł
 * ma zapobiegać. Dlatego czytamy do skutku i porównujemy z `total`;
 * rozbieżność zatrzymuje smoke, zamiast po cichu kasować cudze.
 */

const POCZTA = process.env.MAILPIT_ADRES ?? "http://127.0.0.1:8893";
const STRONA = 200;

/** Adres łapacza — żeby smoke nie budował go drugi raz u siebie. */
export const adresPoczty = POCZTA;

/** Czy łapacz w ogóle odpowiada. Smoke bez niego mierzy pustkę, nie ciszę. */
export async function pocztaOdpowiada() {
  try {
    return Boolean(await (await fetch(`${POCZTA}/api/v1/info`)).json());
  } catch {
    return false;
  }
}

/**
 * Wszystkie nagłówki ze skrzynki, ze stronicowaniem do skutku.
 *
 * Rzuca, gdy po dwóch podejściach zebrana liczba wciąż nie zgadza się
 * z `total`: lepiej zatrzymać bramkę niż zbudować niepełną migawkę
 * i skasować komuś pocztę.
 */
async function wszystkie() {
  /*
   * Dwa podejścia, bo między stronami może DOJECHAĆ nowa wiadomość i wtedy
   * `total` rośnie w trakcie czytania — rozbieżność byłaby wtedy prawdziwa,
   * ale niegroźna i przypadkowa. Trwałej rozbieżności (łapacz deklaruje
   * więcej, niż oddaje) drugie podejście nie naprawi, więc dalej zatrzymuje
   * przebieg: cudzej wiadomości nie wolno uznać za własną tylko dlatego, że
   * lista się nie doczytała.
   */
  let ostatni = null;
  for (const podejscie of [1, 2]) {
    const zebrane = [];
    let deklarowane = 0;
    for (let start = 0; ; start += STRONA) {
      const odp = await (await fetch(`${POCZTA}/api/v1/messages?limit=${STRONA}&start=${start}`)).json();
      deklarowane = Number(odp.total ?? 0);
      const strona = odp.messages ?? [];
      zebrane.push(...strona);
      if (strona.length < STRONA || zebrane.length >= deklarowane) break;
    }
    if (zebrane.length === deklarowane) return zebrane;
    ostatni = { zebrane: zebrane.length, deklarowane, podejscie };
  }
  throw new Error(
    `łapacz poczty oddał ${ostatni.zebrane} wiadomości przy deklarowanych ${ostatni.deklarowane} ` +
      "(dwa podejścia) — migawka byłaby niepełna, a niepełna migawka kasuje CUDZE wiadomości"
  );
}

/**
 * Migawka poczty ZASTANEJ. Wszystko spoza niej jest nasze.
 *
 * Zwraca obiekt, a nie goły zbiór, żeby wywołania czytały się w miejscu
 * użycia („co jest obce”) i żeby dało się dołożyć pole bez przerabiania
 * każdego smoke'a.
 */
export async function migawkaPoczty() {
  const obce = new Set((await wszystkie()).map((m) => m.ID));
  return { obce, ile: obce.size };
}

/** Pełne wiadomości (z treścią) wysłane PO migawce — czyli nasze. */
export async function wlasneWiadomosci(migawka) {
  const nasze = (await wszystkie()).filter((m) => !migawka.obce.has(m.ID));
  const pelne = [];
  for (const m of nasze) {
    pelne.push(await (await fetch(`${POCZTA}/api/v1/message/${m.ID}`)).json());
  }
  return pelne;
}

/**
 * Kasuje WYŁĄCZNIE wiadomości spoza migawki.
 *
 * Pusta lista `IDs` w API Mailpita znaczy „skasuj wszystko”, więc przy braku
 * własnych wiadomości nie wywołujemy go w ogóle — inaczej sprzątanie po
 * przebiegu, który niczego nie wysłał, czyściłoby skrzynkę właściciela.
 * Zwraca liczbę skasowanych.
 */
export async function sprzatnijPoczte(migawka) {
  const nasze = (await wszystkie()).filter((m) => !migawka.obce.has(m.ID)).map((m) => m.ID);
  if (nasze.length === 0) return 0;
  await fetch(`${POCZTA}/api/v1/messages`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ IDs: nasze }),
  });
  return nasze.length;
}

/** Ile wiadomości jest w skrzynce — do rachunku sumienia „poczta wróciła”. */
export async function ilePoczty() {
  return Number((await (await fetch(`${POCZTA}/api/v1/messages?limit=1`)).json()).total ?? 0);
}
