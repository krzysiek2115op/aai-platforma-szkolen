/**
 * Strażnik bramy AJAX: ograniczanie tempa i stały czas porównania tokenu.
 *
 * PO CO. Do 0.26.0 zgadywanie tokenu kosztowało coś WYŁĄCZNIE
 * w formularzu logowania (700 ms kary), a jedyny kanał wystawiony na
 * świat — `/api/szkolenia` — nie miał ani kary, ani limitu, ani nawet
 * porównania w stałym czasie. Objaw był żaden: wszystkie testy zielone,
 * strona działa. Ochrona, której brak nie objawia się błędem, wymaga
 * strażnika — inaczej wraca przy pierwszym przepisaniu pliku.
 *
 * Jedenaście niezmienników, każdy z własną mutacją w audyt-straznikow:
 *   1. `lib/limiter.ts` istnieje,
 *   2. limiter nie importuje `next/*` (ma być testowalny bez serwera),
 *   3. limiter ma test jednostkowy (`lib/limiter.test.ts`),
 *   4. w limiterze stoi ostrzeżenie, że `x-forwarded-for` jest do
 *      podrobienia (to zdanie idzie do specyfikacji wtyczki WP),
 *   5. jedyny AJAX liczy tempo wystrzału po adresie,
 *   6. limit tempa jest sprawdzany PRZED parsowaniem ciała żądania,
 *   7. AJAX ma OSOBNY licznik chybionych uwierzytelnień,
 *   8. AJAX odmawia kodem 429 z nagłówkiem `Retry-After`,
 *   9. AJAX nakłada karę czasową za chybione uwierzytelnienie,
 *  10. formularz logowania też liczy próby po adresie,
 *  11. dyspozytor porównuje token w stałym czasie i pozostaje
 *      samowystarczalny (bez importu z `lib/` i z `next/*`),
 *  12. sprzątanie limitera mierzy każdy klucz JEGO WŁASNYM oknem
 *      (inaczej ruch wystrzałowy kasuje blokady uwierzytelnień przed
 *      terminem, który limiter sam podał w `Retry-After`),
 *  13. OBA kanały odrzucają skonfigurowany token, który jest wartością
 *      z `.env.example` albo jest za krótki — hasło do panelu nie może
 *      pochodzić z publicznego pliku.
 *
 * Użycie: node tools/straznicy/straznik-limitera.mjs
 */
import { readFileSync, existsSync } from "node:fs";

const bledy = [];
const czytaj = (p) => (existsSync(p) ? readFileSync(p, "utf8") : null);

/**
 * Sam KOD, bez komentarzy. Repo tłumaczy w opisach, dlaczego coś jest
 * tak, a nie inaczej — w tym cytuje odrzucone rozwiązania (np. dawne
 * porównanie `===`). Strażnik oskarżający komentarz jest strażnikiem,
 * którego się wyłącza; ta sama lekcja co przy straznik-csp i -seo.
 * Obecność OSTRZEŻEŃ sprawdzamy odwrotnie — na pełnej treści.
 */
const kod = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/* 1–4: czysty moduł limitera */
const LIMITER = "lib/limiter.ts";
const limiter = czytaj(LIMITER);

if (!limiter) {
  bledy.push(
    `brak ${LIMITER} — bez wspólnego limitera każdy kanał liczyłby po ` +
      "swojemu, a jeden z nich (jak przed 0.27.0) nie liczyłby wcale"
  );
} else {
  if (/from\s+["']next\//.test(kod(limiter))) {
    bledy.push(
      `${LIMITER}: import z next/* — limiter ma być czysty, żeby granice ` +
        "okna dało się sprawdzić testem jednostkowym z wstrzykniętym czasem, " +
        "a nie zgadywać z żywego serwera"
    );
  }
  if (!existsSync("lib/limiter.test.ts")) {
    bledy.push(
      "brak lib/limiter.test.ts — limiter bez testu jednostkowego to reguła, " +
        "której nikt nie sprawdza; okno przesuwne myli się cicho"
    );
  }
  if (!/x-forwarded-for/.test(limiter) || !/podrobi/i.test(limiter)) {
    bledy.push(
      `${LIMITER}: zniknęło ostrzeżenie, że \`x-forwarded-for\` jest do ` +
        "podrobienia bez zaufanego proxy. Limit po adresie podnosi KOSZT " +
        "ataku i nie jest granicą bezpieczeństwa — bez tego zdania " +
        "specyfikacja wtyczki WP odziedziczy fałszywe poczucie ochrony"
    );
  }
}

/* 12: sprzątanie po WŁASNYM oknie klucza */
if (limiter) {
  const kodLimitera = kod(limiter);
  // Wzorzec celuje w ZACHOWANIE: wpis w mapie musi nieść długość swojego
  // okna i sprzątanie musi się nią posługiwać. Wiązanie z nazwą funkcji
  // („posprzataj") przestałoby cokolwiek znaczyć po pierwszym refaktorze —
  // ta lekcja kosztowała regresję kontroli przy PR 3 kroku 2.
  const pamietaOkno = /oknoMs\s*[,:}]/.test(kodLimitera);
  // Porównanie „czy klucz wygasł" musi brać okno Z WPISU. Sam wzorzec
  // `teraz - <coś>.oknoMs` nie wystarczał: trafiał też w `limit.oknoMs`
  // z liczenia bieżącego okna w `odnotuj` i przepuszczał mutację —
  // złapał to audyt mutacyjny, nie oko.
  const mierzyWlasnym = /(<=|<|>=|>)\s*teraz\s*-\s*(?!limit\b)\w+\.oknoMs/.test(
    kodLimitera
  );
  // …i nie wolno mierzyć twardą liczbą: tak wyglądała usterka sprzed 0.37.0,
  // gdzie wszystkie klucze mierzono oknem bieżącego żądania.
  const twardaLiczba = /(<=|<|>=|>)\s*teraz\s*-\s*\d/.test(kodLimitera);
  if (!pamietaOkno || !mierzyWlasnym || twardaLiczba) {
    bledy.push(
      `${LIMITER}: sprzątanie nie mierzy klucza JEGO WŁASNYM oknem. ` +
        "Do 0.36.0 brało okno bieżącego żądania (60 s dla wystrzału) " +
        "i tym kasowało blokady uwierzytelnień z oknem dziesięciokrotnie " +
        "dłuższym — ochrona znikała dziewięć minut przed terminem, który " +
        "limiter sam podał klientowi w `Retry-After`"
    );
  }
}

/* 13: brama nie przyjmuje tokenu z przykładu ani za krótkiego */
for (const [plik, tresc] of [
  ["lib/kreator-dostep.ts", czytaj("lib/kreator-dostep.ts")],
  ["modules/m1-sklep/dyspozytor.ts", czytaj("modules/m1-sklep/dyspozytor.ts")],
]) {
  if (!tresc) continue;
  const kodBramy = kod(tresc);
  const znaPrzyklad = /ustaw-wlasny-token/.test(kodBramy);
  const maMinimum = /MIN_DLUGOSC_TOKENU/.test(kodBramy);
  if (!znaPrzyklad || !maMinimum) {
    bledy.push(
      `${plik}: brama przyjmuje DOWOLNY skonfigurowany token. Po ` +
        "`cp .env.example .env` hasłem do zapisu, publikacji i usuwania " +
        "kursów zostaje wtedy łańcuch leżący w repozytorium — a cisza " +
        "wygląda dokładnie jak działający panel"
    );
  }
}

/* 5–9: jedyny AJAX */
const TRASA = "app/api/szkolenia/route.serwer.ts";
const trasa = czytaj(TRASA);

if (!trasa) {
  bledy.push(`brak ${TRASA} — jedyny wystrzał AJAX musi istnieć`);
} else {
  const kodTrasy = kod(trasa);
  if (!/limiter\.odnotuj\(\s*`wystrzal:/.test(kodTrasy)) {
    bledy.push(
      `${TRASA}: brak licznika tempa wystrzału — jedyny kanał wystawiony ` +
        "na świat przyjmowałby żądania bez żadnego ograniczenia"
    );
  }
  const pozycjaLimitu = kodTrasy.indexOf("limiter.odnotuj");
  // Pierwsze DOTKNIĘCIE ciała żądania, jakąkolwiek drogą. Wzorzec
  // `request.json()` sam w sobie by nie wystarczył: od 0.28.0 trasa
  // czyta ciało strumieniem z sufitem, więc sprawdzenie wiązane
  // z jedną nazwą metody przestałoby cokolwiek znaczyć — i przestało,
  // co złapał dopiero audyt mutacyjny przy PR 3.
  const pozycjaParsowania = Math.min(
    ...["await cialoZSufitem(", "request.json()", "request.text()", "JSON.parse("]
      .map((wzorzec) => kodTrasy.indexOf(wzorzec))
      .filter((i) => i >= 0)
      .concat(Infinity)
  );
  if (pozycjaLimitu >= 0 && pozycjaLimitu > pozycjaParsowania) {
    bledy.push(
      `${TRASA}: limit tempa sprawdzany PO parsowaniu ciała żądania — ` +
        "zalew dużych JSON-ów kosztowałby nas pracę, zanim limiter zdąży " +
        "cokolwiek odmówić"
    );
  }
  if (!/`uwierzytelnienie:/.test(kodTrasy)) {
    bledy.push(
      `${TRASA}: brak OSOBNEGO licznika chybionych uwierzytelnień — sam ` +
        "limit tempa przepuszcza spokojne zgadywanie tokenu w nieskończoność"
    );
  }
  if (!/status:\s*429/.test(kodTrasy) || !/Retry-After/.test(kodTrasy)) {
    bledy.push(
      `${TRASA}: odmowa tempa musi być kodem 429 z nagłówkiem \`Retry-After\` ` +
        "(RFC 6585) — inaczej klient nie wie, że ma zwolnić, i ponawia w kółko"
    );
  }
  if (!/setTimeout\([^)]*KARA_MS/.test(kodTrasy)) {
    bledy.push(
      `${TRASA}: chybione uwierzytelnienie bez kary czasowej — formularz ` +
        "logowania płaci 700 ms, a ta droga byłaby znowu darmowa"
    );
  }
}

/* 10: formularz logowania */
const AKCJE = "app/szkolenia/kreator/akcje.ts";
const akcje = czytaj(AKCJE);
if (!akcje) {
  bledy.push(`brak ${AKCJE} — brama kreatora musi istnieć`);
} else if (
  !/from\s+["']@\/lib\/limiter["']/.test(kod(akcje)) ||
  !/limiter\.odnotuj\(/.test(kod(akcje))
) {
  bledy.push(
    `${AKCJE}: logowanie bez limitu prób — kara czasowa spowalnia ` +
      "zgadywanie, ale go nie kończy; oba kanały mają liczyć tak samo"
  );
}

/* 11: dyspozytor — stały czas i samowystarczalność modułu */
const DYSPOZYTOR = "modules/m1-sklep/dyspozytor.ts";
const dyspozytor = czytaj(DYSPOZYTOR);
if (!dyspozytor) {
  bledy.push(`brak ${DYSPOZYTOR}`);
} else {
  const kodDyspozytora = kod(dyspozytor);
  if (!/timingSafeEqual\(/.test(kodDyspozytora)) {
    bledy.push(
      `${DYSPOZYTOR}: token porównywany bez \`timingSafeEqual\` — czas ` +
        "odpowiedzi zdradza, ile pierwszych znaków zgadło się poprawnie, " +
        "a to zamienia zgadywanie tokenu w zgadywanie znak po znaku"
    );
  }
  if (/token\s*===\s*wzorzec|wzorzec\s*===\s*token/.test(kodDyspozytora)) {
    bledy.push(
      `${DYSPOZYTOR}: porównanie tokenu operatorem \`===\` — kończy się na ` +
        "pierwszym różnym bajcie, więc mierzalny czas odpowiedzi jest wyciekiem"
    );
  }
  if (/from\s+["'](@\/lib\/|next\/|\.\.\/\.\.\/lib\/)/.test(kodDyspozytora)) {
    bledy.push(
      `${DYSPOZYTOR}: import z lib/ albo z next/* — moduł ma być ` +
        "samowystarczalny jak wtyczka (WYTYCZNE §8): dziś woła go Next, " +
        "jutro PHP WordPressa. Porównanie tokenu jest tu kopią świadomie"
    );
  }
}

if (bledy.length > 0) {
  for (const b of bledy) console.error(`straznik-limitera: ${b}`);
  process.exit(1);
}

console.log(
  "straznik-limitera: oba kanały liczą próby po adresie, odmowa 429 " +
    "z Retry-After, token porównywany w stałym czasie."
);
